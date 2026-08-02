# Import order matters: `spaces` patches torch.cuda.* at import time, so it
# must be imported before `torch` for ZeroGPU's CUDA visibility shim to take
# effect in production.
import spaces
import torch
import gradio as gr

DEVICE = torch.accelerator.current_accelerator() if torch.accelerator.is_available() else "cpu"

# Placeholder model, loaded once at module level (never inside the
# @spaces.GPU-decorated function below). On a real ZeroGPU Space, the worker
# process is a fork of this main process, so a module-level load is inherited
# by every call for free instead of being re-loaded (or re-downloaded) each
# time. Swap this out for a real `from_pretrained(...)` / `torch.load(...)`
# call when a real model is ready.
_placeholder_model = torch.nn.Linear(4, 1).to(DEVICE)
_placeholder_model.eval()


@spaces.GPU
def infer(value: float) -> str:
    """Placeholder inference: runs a trivial tensor op through the
    placeholder model on DEVICE. Returns the resolved device alongside the
    output so callers can visually confirm whether a given call landed on
    cuda (production) or cpu (local dev without a GPU)."""
    with torch.no_grad():
        input_tensor = torch.full((1, 4), float(value), device=DEVICE)
        output = _placeholder_model(input_tensor)
    return f"device={DEVICE} output={output.item():.6f}"


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

        This is currently a **placeholder**: `infer()` runs a trivial tensor op
        through a randomly-initialized `torch.nn.Linear` layer on `DEVICE`, so the
        deploy pipeline and API contract can be verified end-to-end before a real
        model and benchmark harness are wired in.

        **Headless API only** — this page is documentation, not a demo UI. There
        are no input fields to click through here; call the `infer` endpoint
        directly instead:

        - `gradio_client`: `Client("thomas-to-bcheme/portfolio-zerogpu").predict(3.5, api_name="/infer")`
        - Raw HTTP: `POST /gradio_api/call/infer` (call/poll shape)

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
    # event with api_name="infer" so gradio_client/HTTP callers can reach them.
    input_number = gr.Number(label="Input value", value=1.0, visible=False)
    output_text = gr.Textbox(label="Result", visible=False)
    run_button = gr.Button("Run inference", visible=False)

    run_button.click(
        fn=infer,
        inputs=input_number,
        outputs=output_text,
        api_name="infer",
    )

# Required for ZeroGPU: the GPU scheduler hooks into Gradio's queueing
# mechanism, so @spaces.GPU calls aren't reliably routed through GPU
# allocation on a real Space without an active queue.
demo.queue()

if __name__ == "__main__":
    demo.launch()
