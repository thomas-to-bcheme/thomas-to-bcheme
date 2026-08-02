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

        GPU inference backend for the **thomas-to-bcheme portfolio**. API-only — this
        UI exists to test the `/infer` endpoint directly; see this Space's README
        (Files tab) for the full API contract (`gradio_client` and raw HTTP examples).
        """
    )
    gr.Button(
        "← Back to portfolio",
        link="https://thomas-to-bcheme-github-io.vercel.app/",
    )

    input_number = gr.Number(label="Input value", value=1.0)
    output_text = gr.Textbox(label="Result")
    run_button = gr.Button("Run inference")

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
