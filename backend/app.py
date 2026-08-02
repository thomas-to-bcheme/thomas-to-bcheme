# Import order matters: `spaces` patches torch.cuda.* at import time, so it
# must be imported before `torch` for ZeroGPU's CUDA visibility shim to take
# effect in production.
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
    --zgpu-bg: #0a0c10;
    --zgpu-panel: #12151b;
    --zgpu-ink: #d7dbe0;
    --zgpu-muted: #6b7280;
    --zgpu-cold: #4fa8d8;
    --zgpu-hot: #ff7a45;
    --zgpu-line: #23272e;
}
.gradio-container { background: var(--zgpu-bg) !important; }
#zgpu-doc { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
.zgpu-page {
    max-width: 44rem;
    margin: 2.5rem auto;
    padding: 0 1.5rem 3rem;
    color: var(--zgpu-ink);
    font-family: ui-sans-serif, "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
}
.zgpu-mono, .zgpu-title, .zgpu-eyebrow, .zgpu-register, .zgpu-page code, .zgpu-page pre, .zgpu-links {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;
}
.zgpu-title { font-size: 1.05rem; color: var(--zgpu-ink); margin: 0 0 1.5rem; }
.zgpu-eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--zgpu-muted);
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
}
.zgpu-register dt { color: var(--zgpu-muted); letter-spacing: 0.04em; }
.zgpu-register dd { margin: 0; color: var(--zgpu-ink); min-width: 0; word-break: break-word; }
.zgpu-register dd.zgpu-hot { color: var(--zgpu-hot); }
.zgpu-rule {
    height: 2px;
    margin: 1.6rem 0;
    background: linear-gradient(90deg, var(--zgpu-cold), var(--zgpu-hot));
    border: none;
    opacity: 0.65;
}
.zgpu-page p { margin: 0 0 0.9rem; color: var(--zgpu-ink); }
.zgpu-page code {
    background: var(--zgpu-panel);
    border: 1px solid var(--zgpu-line);
    border-radius: 3px;
    padding: 0.1em 0.35em;
    font-size: 0.85em;
    color: var(--zgpu-ink);
}
.zgpu-page pre {
    background: var(--zgpu-panel);
    border: 1px solid var(--zgpu-line);
    border-radius: 4px;
    padding: 0.9rem 1rem;
    font-size: 0.8rem;
    overflow-x: auto;
    line-height: 1.55;
    color: var(--zgpu-ink);
}
.zgpu-page pre code { border: none; padding: 0; background: none; }
.zgpu-links { font-size: 0.85rem; color: var(--zgpu-muted); }
.zgpu-links a {
    color: var(--zgpu-ink);
    text-decoration: none;
    border-bottom: 1px solid var(--zgpu-line);
    transition: border-color 0.15s ease, color 0.15s ease;
}
.zgpu-links a:hover, .zgpu-links a:focus-visible { color: var(--zgpu-hot); border-bottom-color: var(--zgpu-hot); }
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
    A personal GPU backend for the portfolio site linked below, and a sandbox
    for learning what PyTorch does for you automatically. The deploy pipeline
    is real, and so is the benchmark: <code>benchmark()</code> compiles a
    hand-written CUDA Swish/SiLU kernel on first call (cached per container)
    and times it against PyTorch's built-in <code>F.silu</code>, on whichever
    GPU ZeroGPU schedules the call onto. What's still missing is a reporting
    layer &mdash; this page doesn't track or display results across calls yet.
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

  <p class="zgpu-eyebrow">why headless</p>
  <p>
    There's nothing to click here on purpose. Every input and output on this
    page is rendered but hidden &mdash; Gradio needs live components to expose
    an API endpoint, but this Space is meant to be called, not browsed. Reach
    it the same way the portfolio's own frontend does:
  </p>
  <pre><code>Client("thomas-to-bcheme/portfolio-zerogpu").predict(10_000_000, api_name="/benchmark")</code></pre>
  <pre><code>POST /gradio_api/call/benchmark   (call/poll shape &mdash; see README.md)</code></pre>

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
