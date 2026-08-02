"""Portfolio ZeroGPU backend — Swish/SiLU CUDA kernel benchmark.

This file's shape is a direct response to Hugging Face ZeroGPU's free-tier
limits, not a generic Gradio app that happens to run on ZeroGPU. The four
sections below are, in order: what ZeroGPU actually constrains, how this
codebase is designed against those constraints today, how that ties back to
the project's zero-cost architecture, and where the numbers come from.

## 1. ZeroGPU constraints

Hardware & allocation model
    Spaces are backed by an NVIDIA RTX Pro 6000 Blackwell, split into `large`
    (default; half a card, 48GB VRAM, 1x quota cost) or `xlarge` (full card,
    96GB VRAM, 2x quota cost). Outside an `@spaces.GPU`-decorated call, CUDA
    calls are intercepted by an emulation layer (no physical GPU attached) —
    this is why model/tensor placement code can safely call `.to("cuda")` at
    import time. A real device is attached only for the duration of a
    decorated call, then detached back to the shared pool. Backing hardware
    has already changed generations more than once (A100 -> H200 -> current);
    treat these numbers as current, not permanent.

Quota & refresh accounting
    The daily quota is a fixed 24h TTL starting from the *caller's* first GPU
    call of the day, not a calendar/UTC reset. Tiers: unauthenticated 2min
    (low queue priority), free account 5min (medium), PRO/Team 40min
    (highest), Enterprise 60min (highest); PRO+ tiers can overflow into paid
    credits at $1/10min once exhausted. Quota is charged to whoever is
    *calling* the Space, not the Space owner. Admission is reserve-then-settle:
    the declared `duration` is checked against remaining quota *before* the
    call runs (a too-large declaration is rejected immediately, no GPU time
    spent), then actual elapsed seconds are what get deducted on completion.
    `xlarge` doubles the accounted cost for identical wall-clock time.

Execution lifecycle & hard caps
    Admission check -> queue -> GPU attach -> function body executes -> GPU
    detach + settlement. The hard wall-clock cap is the declared `duration`
    (60s if unspecified, as in this file today) — exceeding it kills the
    process outright (`GPU task aborted`), it does not just warn. Host RAM is
    separate from VRAM, fixed per container, and not elastic: an OOM there
    crashes/restarts the whole Space rather than raising a catchable
    per-request exception.

Queue dynamics
    Priority is bucketed by account tier first, then affected by remaining
    quota (a tier member who's burned more quota queues worse within their
    tier), then by declared `duration` (tighter/shorter declarations queue
    better; over-declaring "to be safe" both wastes quota on settlement and
    pushes you back in line). No exact formula is published — this is an
    observed fair-share model, not precise math to optimize against.

## 2. How we approach these constraints

The philosophy: design against the hard ceilings — quota seconds, host RAM,
the per-call duration cap — before optimizing for capability. ZeroGPU is
shared free-tier infrastructure, not a dedicated GPU; that's why the
constraints above are written down before any discussion of what this file
can do with them.

Current strategies, and the constraint each one targets:
  - `MIN_BENCHMARK_NUMEL`/`MAX_BENCHMARK_NUMEL` bound the worst-case tensor
    size so a call can't run long or large enough to blow the default 60s
    duration cap or spike host RAM.
  - Every GPU-touching operation — including compiling the CUDA extension
    itself, via `load_swish_extension()` — runs inside the single
    `@spaces.GPU`-decorated `benchmark()`, since that's the only place quota
    is charged and the only place a real device exists. Nothing GPU-related
    runs speculatively outside it.
  - `cuda_ext.py`'s fixed on-disk `build_directory` avoids paying nvcc
    compile cost more than once per container's lifetime — first call pays
    it, later calls reuse the cached build.
  - The API is headless (see `PAGE_HTML` below): no interactive UI
    polling/re-renders that could burn quota on incidental invocations.

Planned workflow — Colab for debugging, ahead-of-time compiling for
inference: develop and debug the CUDA/C++ kernel on free-tier Google Colab
(T4), where there's no ZeroGPU quota pressure, no shared queue, and full
nvcc/cuda-gdb access for the lower-level compiling and correctness/perf
iteration that's expensive to do under a metered, queued, per-call-killed
environment. Once a kernel is validated there, compile it ahead-of-time
rather than relying on ZeroGPU's per-call JIT path (today's
`load_swish_extension()` behavior), so the metered ZeroGPU window is spent on
inference time, not compilation — targeting the two resources the quota
actually meters (declared/settled *time* and container *memory*), not raw
throughput. This is a plan, not yet implemented: `benchmark()` still
JIT-compiles via `cuda_ext.py` today. It's the reason `PAGE_HTML` already
lists "google colab (t4) — planned" alongside the live ZeroGPU hardware, and
it's the expected workflow for future kernel work on this Space.

## 3. Zero-cost architecture

This project runs entirely on free-tier services (see root CLAUDE.md). ZeroGPU's
limits above aren't an obstacle worked around despite that goal — they're the
direct consequence of it: free GPU access is inherently shared, quota-metered,
and queued. The Colab-for-debug -> AOT-for-inference plan in section 2 is how
this project keeps doing real GPU/CUDA work without leaving the $0 architecture.

## 4. References

  - system_design_docs/huggingface-zerogpu.md (this project's own study; primary
    source for every number and mechanism above)
  - https://huggingface.co/docs/hub/en/spaces-zerogpu (official ZeroGPU docs)
  - https://huggingface.co/blog/zerogpu-aoti (ahead-of-time compilation on ZeroGPU)
  - https://github.com/huggingface/skills/blob/main/skills/huggingface-zerogpu/references/how-quota-works.md
    (quota accounting mechanics)

---

Import order matters: `spaces` patches torch.cuda.* at import time, so it
must be imported before `torch` for ZeroGPU's CUDA visibility shim to take
effect in production.
"""
import spaces
import torch
import torch.nn.functional as F
import gradio as gr
import time

from cuda_ext import load_swish_extension

DEVICE = torch.accelerator.current_accelerator() if torch.accelerator.is_available() else "cpu"

# 100M float32 elements is ~400MB per tensor, ~1.2GB across the input/
# reference/custom tensors in flight at once — safe even on a modest shared
# ZeroGPU allocation.
MIN_BENCHMARK_NUMEL = 1
MAX_BENCHMARK_NUMEL = 100_000_000


@spaces.GPU
def benchmark(numel: float) -> str:
    """Benchmarks a hand-written CUDA Swish/SiLU kernel against PyTorch's
    built-in F.silu on whichever GPU ZeroGPU schedules this call onto.

    The extension is compiled (or loaded from its on-disk build cache) here,
    since this is the only place a physical GPU is attached and its
    architecture can be detected — see cuda_ext.py."""
    numel = int(numel)
    if not (MIN_BENCHMARK_NUMEL <= numel <= MAX_BENCHMARK_NUMEL):
        raise ValueError(
            f"numel must be between {MIN_BENCHMARK_NUMEL} and "
            f"{MAX_BENCHMARK_NUMEL}, got {numel}"
        )

    ext, arch_tag = load_swish_extension()
    input_tensor = torch.randn(numel, device=DEVICE, dtype=torch.float32)

    torch.cuda.synchronize()
    start = time.perf_counter()
    reference_output = F.silu(input_tensor)
    torch.cuda.synchronize()  # CUDA kernels launch async; without this the
                               # CPU timer would stop before the GPU finishes
    reference_ms = (time.perf_counter() - start) * 1000

    torch.cuda.synchronize()
    start = time.perf_counter()
    custom_output = ext.swish_forward(input_tensor)
    torch.cuda.synchronize()
    custom_ms = (time.perf_counter() - start) * 1000

    # A fast kernel that computes the wrong answer is a bug, not a win.
    max_abs_diff = (custom_output - reference_output).abs().max().item()
    speedup = reference_ms / custom_ms if custom_ms > 0 else float("inf")

    return (
        f"device={DEVICE} arch={arch_tag} numel={numel} "
        f"pytorch_ms={reference_ms:.4f} cuda_kernel_ms={custom_ms:.4f} "
        f"speedup={speedup:.2f}x max_abs_diff={max_abs_diff:.3e}"
    )


# Scoped page styling for the gr.HTML block below. Kept as raw CSS (rather
# than Gradio's theme system) since this page is meant to read as a fixed
# diagnostic readout regardless of the visitor's light/dark Gradio theme —
# see html-gallery's gr.HTML + custom CSS/JS pattern. `#zgpu-doc` strips
# Gradio's default component chrome (background/border/padding) so the page
# below owns its own framing instead of sitting inside a "card."
PAGE_CSS = """
:root {
    --zgpu-bg: #ffffff;
    --zgpu-panel: #f6f7f8;
    --zgpu-ink: #14161a;
    --zgpu-muted: #596273;
    --zgpu-cold: #1d5c9c;
    --zgpu-hot: #92400e;
    --zgpu-line: #e2e4e8;
}
.gradio-container { background: var(--zgpu-bg) !important; }
#zgpu-doc { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
/* Gradio's own theme sets its own text color on plain p/h1/dl elements —
   light gray/white in dark mode, near-black in light mode — that can win
   the cascade depending on which theme __theme= resolves to at runtime.
   This page is a fixed light, black-on-white readout regardless of viewer
   theme (like a printed datasheet, not a themed app surface), so every
   text color below is forced with !important rather than relying on
   inheritance Gradio's theme can reassert. Previously this page was dark
   and fought Gradio's light-mode text color leaking through; now it's
   inverted, but the same cascade risk applies in both directions. */
.zgpu-page {
    max-width: 44rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem 3rem;
    color: var(--zgpu-ink) !important;
    font-family: ui-sans-serif, "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.65;
}
.zgpu-mono, .zgpu-title, .zgpu-eyebrow, .zgpu-register, .zgpu-page code, .zgpu-page pre, .zgpu-links {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;
}
.zgpu-title { font-size: 1.15rem; letter-spacing: -0.01em; color: var(--zgpu-ink) !important; margin: 0 0 1.75rem; }
.zgpu-eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--zgpu-muted) !important;
    margin: 2.25rem 0 0.6rem;
}
.zgpu-eyebrow:first-of-type { margin-top: 0; }
.zgpu-register {
    border: 1px solid var(--zgpu-line);
    background: var(--zgpu-panel);
    border-radius: 4px;
    padding: 1.1rem 1.3rem;
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 1.5rem;
    row-gap: 0.55rem;
    font-size: 0.85rem;
    counter-reset: zgpu-reg;
}
/* Register-file numbering (r0, r1, r2...) generated purely from a CSS
   counter, not hardcoded per row — it tracks however many dt/dd pairs are
   in the markup automatically. A small nod to how GPU/CPU general-purpose
   registers are actually named, on a block that's already called
   ".zgpu-register". */
.zgpu-register dt {
    counter-increment: zgpu-reg;
    position: relative;
    padding-left: 1.75rem;
    color: var(--zgpu-muted) !important;
    letter-spacing: 0.04em;
}
.zgpu-register dt::before {
    content: "r" counter(zgpu-reg);
    position: absolute;
    left: 0;
    top: 0;
    color: var(--zgpu-cold) !important;
    opacity: 0.8;
}
.zgpu-register dd { margin: 0; color: var(--zgpu-ink) !important; min-width: 0; word-break: break-word; }
.zgpu-register dd.zgpu-hot { color: var(--zgpu-hot) !important; }
/* A mostly-neutral hairline with a short colored tab at the left edge,
   like a title-block accent on an engineering drawing — quieter than a
   full-width gradient bar, which read as more "dashboard" than "report". */
.zgpu-rule {
    height: 1px !important;
    margin: 1.75rem 0;
    background: linear-gradient(90deg, var(--zgpu-cold) 0, var(--zgpu-cold) 2.5rem, var(--zgpu-line) 2.5rem, var(--zgpu-line) 100%) !important;
    border: none !important;
    opacity: 0.9;
}
.zgpu-page p { margin: 0 0 1rem; color: var(--zgpu-ink) !important; }
.zgpu-page code {
    background: var(--zgpu-panel);
    border: 1px solid var(--zgpu-line);
    border-radius: 3px;
    padding: 0.1em 0.35em;
    font-size: 0.85em;
    color: var(--zgpu-ink) !important;
}
.zgpu-page pre {
    background: var(--zgpu-panel);
    border: 1px solid var(--zgpu-line);
    border-radius: 4px;
    padding: 0.9rem 1rem;
    font-size: 0.8rem;
    overflow-x: auto;
    line-height: 1.55;
    color: var(--zgpu-ink) !important;
}
.zgpu-page pre code { border: none; padding: 0; background: none; }
.zgpu-links { font-size: 0.85rem; color: var(--zgpu-muted) !important; }
.zgpu-page a {
    color: var(--zgpu-ink) !important;
    text-decoration: none;
    border-bottom: 1px solid var(--zgpu-line);
    transition: border-color 0.15s ease, color 0.15s ease;
}
.zgpu-page a:hover, .zgpu-page a:focus-visible { color: var(--zgpu-hot) !important; border-bottom-color: var(--zgpu-hot); }
@media (max-width: 480px) {
    .zgpu-page { margin: 1.5rem auto; padding: 0 1.1rem 2.5rem; font-size: 15px; }
    .zgpu-register { grid-template-columns: 1fr; row-gap: 0.35rem; }
    .zgpu-register dt { margin-top: 0.4rem; }
}
"""

# `device` is read from live module state (DEVICE, above) rather than
# hardcoded, so this reads as a real diagnostic readout — it actually says
# "cpu" in local dev and "cuda" on the deployed Space.
PAGE_HTML = f"""
<div class="zgpu-page">
  <h1 class="zgpu-title">Portfolio ZeroGPU Backend</h1>

  <dl class="zgpu-register">
    <dt>status</dt><dd class="zgpu-hot">benchmark endpoint live &mdash; no reported results yet</dd>
    <dt>mode</dt><dd>headless api (no interactive controls)</dd>
    <dt>device</dt><dd class="zgpu-mono">{DEVICE}</dd>
    <dt>hardware</dt><dd>hf zerogpu (blackwell) &mdash; live &middot; google colab (t4) &mdash; planned</dd>
    <dt>comparison</dt><dd>pytorch f.silu vs. hand-rolled cuda / c++ kernel</dd>
    <dt>kernel</dt><dd>swish / silu (elementwise)</dd>
  </dl>

  <hr class="zgpu-rule" />

  <p class="zgpu-eyebrow">what this is</p>
  <p>
    A personal GPU backend for the portfolio site linked below, and a running
    writeup of what free-tier GPU infrastructure actually lets you do. The
    deploy pipeline is real, and so is the benchmark: <code>benchmark()</code>
    compiles a hand-written CUDA Swish/SiLU kernel on first call (cached per
    container) and times it against PyTorch's built-in <code>F.silu</code>,
    on whichever GPU ZeroGPU schedules the call onto. The sections below are
    that writeup &mdash; constraints, the strategies used against them, how
    this backend fits the rest of the portfolio, and how to read what it
    reports.
  </p>

  <p class="zgpu-eyebrow">what's being measured</p>
  <p>
    Latency and correctness of that hand-written CUDA/C++ kernel against
    PyTorch's built-in equivalent, on tensors sized by the call's
    <code>numel</code> argument. Every call is timed cold &mdash; ZeroGPU
    forks a fresh process per request, so there's no warm cache to lean on,
    and the kernel is JIT-compiled (or reloaded from its on-disk build cache)
    inside that same call. The learning goal is the same comparison across
    meaningfully different free GPUs &mdash; HF's shared ZeroGPU (Blackwell)
    today, Google Colab's T4 planned next &mdash; to see how much of a
    hand-tuned kernel's speedup survives a generation and an architecture
    jump.
  </p>

  <p class="zgpu-eyebrow">zerogpu constraints</p>
  <p>
    Every call here runs inside Hugging Face's shared, quota-metered GPU
    pool &mdash; currently a slice of an NVIDIA RTX Pro 6000 Blackwell, not
    dedicated hardware. The daily quota is a fixed 24h window from your
    first GPU call &mdash; 2/5/40/60 minutes across the unauthenticated /
    free / PRO+Team / Enterprise tiers &mdash; charged to whoever calls the
    Space, not its owner. Admission checks the declared duration against
    remaining quota before a call runs; the default 60s cap kills the
    process outright if exceeded, and host RAM is a fixed ceiling separate
    from VRAM. Queue priority stacks on top of all this: account tier
    first, then remaining quota, then how tight the declared duration is
    &mdash; over-declaring &ldquo;to be safe&rdquo; both wastes quota on
    settlement and queues worse. None of this is dedicated infrastructure
    &mdash; it's free, shared, and bounded on purpose.
  </p>

  <p class="zgpu-eyebrow">design approach</p>
  <p>
    This backend is built against those ceilings first, not around them:
    <code>numel</code> is bounds-checked so a call can't blow the duration
    cap or spike host RAM, every GPU-touching step &mdash; including
    compiling the kernel &mdash; runs inside the single metered
    <code>@spaces.GPU</code> call, and the compiled kernel is cached on disk
    per container so only the first call pays nvcc's cost. Next step:
    prototype and debug the CUDA kernel on free-tier Google Colab (T4)
    &mdash; no quota pressure, no queue &mdash; then compile it
    ahead-of-time before it ever touches ZeroGPU, so the metered window is
    spent on inference, not compilation. Sources for this and the section
    above are listed under &ldquo;references&rdquo; below.
  </p>

  <p class="zgpu-eyebrow">portfolio integration</p>
  <p>
    This Space is one piece of a zero-cost architecture, not a standalone
    demo. It deploys independently from the rest of the portfolio via
    GitHub Actions, triggered on pushes that touch <code>backend/**</code>,
    and uploads straight to the Space &mdash; never a git push, so it can't
    collide with this Space's own history. The portfolio's Next.js frontend
    calls it server-side with a read-scoped HF token, so requests are
    attributed to an authenticated account's quota instead of the small
    anonymous bucket described above. Hardware tier is the one thing still
    set by hand, once, in the Space's settings &mdash; everything else in
    this pipeline is automated.
  </p>

  <p class="zgpu-eyebrow">reading the results</p>
  <p>
    Each call reports four numbers that function as this benchmark's KPIs:
    <code>pytorch_ms</code> and <code>cuda_kernel_ms</code> are the two
    timings being compared, <code>speedup</code> is the headline ratio
    between them, and <code>max_abs_diff</code> is the correctness gate
    &mdash; a fast kernel that computes the wrong answer is a bug, not a
    win, so a result only counts if that number stays near zero. Read them
    per call: this page doesn't aggregate results across requests yet, so
    treat each response as its own data point, not a running average.
  </p>

  <p class="zgpu-eyebrow">why headless</p>
  <p>
    There's nothing to click here on purpose. Every input and output on this
    page is rendered but hidden &mdash; Gradio needs live components to expose
    an API endpoint, but this Space is meant to be called, not browsed. Reach
    it the same way the portfolio's own frontend does:
  </p>
  <pre><code>Client("thomas-to-bcheme/portfolio-zerogpu").predict(10_000_000, api_name="/benchmark")</code></pre>
  <pre><code>POST /gradio_api/call/benchmark   (call/poll shape &mdash; see README.md)</code></pre>

  <p class="zgpu-eyebrow">references</p>
  <p class="zgpu-links">
    <a href="https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/system_design_docs/huggingface-zerogpu.md">this project's zerogpu study</a> &middot;
    <a href="https://huggingface.co/docs/hub/en/spaces-zerogpu">official zerogpu docs</a> &middot;
    <a href="https://huggingface.co/blog/zerogpu-aoti">aot compilation on zerogpu</a> &middot;
    <a href="https://github.com/huggingface/skills/blob/main/skills/huggingface-zerogpu/references/how-quota-works.md">quota accounting mechanics</a>
  </p>

  <p class="zgpu-eyebrow">elsewhere</p>
  <p class="zgpu-links">
    <a href="https://thomas-to-bcheme-github-io.vercel.app/">portfolio</a> &middot;
    <a href="https://github.com/thomas-to-bcheme">github</a> &middot;
    <a href="https://www.linkedin.com/in/thomas-to-bcheme/">linkedin</a> &middot;
    <a href="https://www.youtube.com/@thomas-to-bcheme">youtube</a>
  </p>
</div>
"""

with gr.Blocks(title="Portfolio ZeroGPU Backend") as demo:
    gr.HTML(PAGE_HTML, elem_id="zgpu-doc")

    # Hidden components: not rendered on the page (this Space is a headless API,
    # not an interactive demo — see the HTML above), but still wired to an
    # event with api_name="benchmark" so gradio_client/HTTP callers can reach them.
    input_number = gr.Number(label="Element count", value=10_000_000, visible=False)
    output_text = gr.Textbox(label="Result", visible=False)
    run_button = gr.Button("Run benchmark", visible=False)

    run_button.click(
        fn=benchmark,
        inputs=input_number,
        outputs=output_text,
        api_name="benchmark",
    )

# Required for ZeroGPU: the GPU scheduler hooks into Gradio's queueing
# mechanism, so @spaces.GPU calls aren't reliably routed through GPU
# allocation on a real Space without an active queue.
demo.queue()

if __name__ == "__main__":
    # css moved from the Blocks() constructor to launch() in Gradio 6.
    demo.launch(css=PAGE_CSS)
