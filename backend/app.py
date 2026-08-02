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


with gr.Blocks(title="Portfolio ZeroGPU Backend") as demo:
    gr.Markdown(
        """
        # Portfolio ZeroGPU Backend

        GPU inference backend for the **thomas-to-bcheme portfolio** — a personal
        practice space for:

        - **Deploying models end-to-end** on a real Hugging Face ZeroGPU Space
          (CI-driven deploy via the Hub API, `@spaces.GPU`-scheduled cold starts).
        - **Benchmarking PyTorch performance on ZeroGPU** — profiling ops against
          the shared NVIDIA hardware ZeroGPU allocates on demand, versus local CPU.
        - **Learning CUDA and C/C++ GPU programming** — ZeroGPU's free, on-demand
          NVIDIA GPU access doubles as a sandbox for digging under PyTorch's
          abstractions into CUDA kernels.

        `benchmark()` compiles a hand-written CUDA Swish/SiLU kernel (`csrc/kernel.cu`)
        on first call and times it against PyTorch's built-in `F.silu`, on whichever
        GPU ZeroGPU schedules this call onto — the deploy pipeline, API contract, and
        the actual kernel/benchmark harness are all wired in end-to-end.

        **Headless API only** — this page is documentation, not a demo UI. There
        are no input fields to click through here; call the `benchmark` endpoint
        directly instead:

        - `gradio_client`: `Client("thomas-to-bcheme/portfolio-zerogpu").predict(10_000_000, api_name="/benchmark")`
        - Raw HTTP: `POST /gradio_api/call/benchmark` (call/poll shape)

        See this Space's `README.md` (Files tab) for the full contract — curl
        examples, the `gradio_client` convention on the leading slash, and the
        secrets table.

        The portfolio landing page can be found on my [vercel page](https://thomas-to-bcheme-github-io.vercel.app/)
        [Github](https://github.com/thomas-to-bcheme)
        [Linkedin](https://www.linkedin.com/in/thomas-to-bcheme/)
        [YouTube](https://www.youtube.com/@thomas-to-bcheme)
        """
    )

    # Hidden components: not rendered on the page (this Space is a headless API,
    # not an interactive demo — see the Markdown above), but still wired to an
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
    demo.launch()
