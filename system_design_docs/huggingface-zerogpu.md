# Hugging Face ZeroGPU: Architecture, Limits, and Optimization Playbook

ZeroGPU is Hugging Face's shared, dynamically allocated GPU infrastructure for Spaces. It lets a Gradio app request a physical GPU only for the seconds it needs one, then hands that GPU back to a shared pool. This document breaks down how the system actually works under the hood, where the hard limits are, and what a builder can do to stay inside them.

Sources for every specific number or mechanism are cited inline and collected at the end. Where Hugging Face has not published an exact formula (notably queue math), that is called out explicitly rather than guessed at.

## Part 1: How ZeroGPU Works

### 1. Hardware Specifications

ZeroGPU currently backs Spaces with the **NVIDIA RTX Pro 6000 Blackwell**, split into two purchasable sizes:

| GPU size | Backing hardware | VRAM | Quota cost |
|---|---|---|---|
| `large` (default) | Half an RTX Pro 6000 Blackwell | 48GB | 1x |
| `xlarge` | Full RTX Pro 6000 Blackwell | 96GB | 2x |

The important caveat: ZeroGPU has already migrated backing hardware more than once (earlier generations of the docs and blog posts reference A100 and H200 cards). The card behind `large`/`xlarge` can change again without notice, so treat the 48GB/96GB numbers as current rather than permanent, and re-check the [official docs](https://huggingface.co/docs/hub/en/spaces-zerogpu) before sizing a model against them.

**How the dynamic allocation actually works:** a ZeroGPU Space runs as a normal Python process with no physical GPU attached most of the time. Outside an `@spaces.GPU`-decorated function, PyTorch's CUDA calls are intercepted by a CUDA emulation layer, which is why model code can call `.to('cuda')` at module import time (object placement, memory layout, tensor allocation) without a real device present. When a decorated function is actually invoked, ZeroGPU's scheduler attaches a real GPU, or a slice of one for `large`, to that specific process for the declared `duration` window. The process's emulated CUDA context is handed off to the real device, the function body executes with real CUDA, and the moment the function returns (or the duration elapses), the GPU is detached and returned to the shared pool for the next queued job.

This is also why Hugging Face explicitly discourages lazy-loading models inside the decorated function: the emulation-to-real handoff is optimized for tensors placed on `cuda` at startup. Moving weights to the device lazily inside the hot path bypasses that optimization and adds avoidable per-call overhead.

### 2. Refresh Periods & Accounting

The daily quota is **not** a calendar-day or fixed-UTC reset. It is a fixed 24-hour TTL that starts counting from your **first GPU call of the day**: if you first use GPU compute at 14:00, your quota refills at 14:00 the next day, regardless of how you spend it in between. This is a true fixed-window, not a sliding window recalculated on every call.

Tier quotas as currently documented:

| Account type | Daily GPU quota | Queue priority |
|---|---|---|
| Unauthenticated | 2 minutes | Low |
| Free account | 5 minutes | Medium |
| PRO account | 40 minutes (extensible) | Highest |
| Team org member | 40 minutes (extensible) | Highest |
| Enterprise org member | 60 minutes (extensible) | Highest |

Quota is charged against whoever is **calling** the Space (the visitor's own account), not the Space owner, except for anonymous visitors who share the small unauthenticated bucket.

Accounting mechanics worth knowing:

- **Admission is reserve-then-settle.** Before your function runs, ZeroGPU compares your *declared* `duration` against your *remaining* quota, not your actual usage. If declared duration exceeds what you have left, the call is rejected immediately with an error like `You have exceeded your GPU quota (59s left vs. 60s requested)`, even if the function would have finished in 3 seconds.
- **Settlement uses real usage.** Once the call completes, the seconds actually consumed are what get deducted from your balance, tracked at whole-second granularity (error messages report integer/fractional seconds, not minute buckets).
- **`xlarge` doubles the accounted cost** for identical wall-clock time: a 45-second `xlarge` call consumes 90 seconds of quota.
- **PRO/Team/Enterprise can overflow into credits** at $1 per 10 minutes of GPU time once the included daily quota is exhausted, billed automatically against the account's prepaid balance.

### 3. Execution Constraints: Lifecycle of a Request

1. A Gradio event handler calls a function wrapped in `@spaces.GPU`.
2. The `spaces` runtime performs the **admission check**: declared `duration` vs. remaining quota. Fail here means an immediate exception, no queueing, no GPU time charged.
3. If admission passes, the job enters the **scheduler queue**, ranked by account priority tier first, then by factors that favor smaller, well-declared jobs (see Queue Dynamics below).
4. When a slot opens, the hypervisor attaches a physical GPU (or MPS-partitioned slice for `large`) to the calling process. The emulated CUDA context becomes a real one and the decorated function body executes.
5. **Hard wall-clock cap = the declared `duration`** (60 seconds if unspecified). If the function runs longer than declared, the process is forcibly killed and the caller receives a `GPU task aborted` error. Declaring a duration that is too short for the real workload is a direct cause of this failure.
6. On return, success or exception, the GPU slice is detached and returned to the shared pool immediately, and actual elapsed seconds are deducted from quota.
7. **Host RAM is separate from VRAM and not elastic.** The Space's container has a fixed memory allocation tied to its hardware tier. Loading oversized model weights or auxiliary pipelines at module level can OOM the container itself, which crashes/restarts the whole Space rather than raising a catchable per-request Python exception. This is frequently the first and most confusing failure mode for builders who assume VRAM is the only ceiling.

### 4. Queue Dynamics

Hugging Face has not published an exact mathematical formula for how Unauthenticated, Free, PRO, and Enterprise requests interleave under load, and this document will not invent one. What is documented and observable:

- **Priority is bucketed by account tier first**: Unauthenticated = Low, Free = Medium, PRO/Team/Enterprise = Highest.
- **Remaining quota affects priority within a tier**: the docs state remaining quota "directly impacts priority," meaning a PRO account that has burned through most of its 40 minutes queues worse than one with quota to spare.
- **Declared duration affects priority**: shorter declared durations get better queue placement. Over-declaring `duration` "just to be safe" does not just risk wasting quota on settlement, it actively pushes you back in line.
- Beyond that, treat it as a fair-share queue within each priority class rather than a precise weighted formula you can optimize against mathematically. The two levers you actually control are tier (pay for PRO/Team/Enterprise) and declared duration (keep it tight and accurate).

## Part 2: Optimization Playbook

### 1. Code-Level Optimizations

**Use `duration` deliberately, not as a fixed guess.** The default is 60 seconds. Profile the realistic worst case for each decorated function and declare that, not a round number. For variable-cost work (e.g., diffusion steps), pass a callable instead of a constant so the declared duration scales with the actual request:

```python
import spaces

def get_duration(prompt: str, steps: int) -> float:
    step_cost_s = 3.75
    return steps * step_cost_s

@spaces.GPU(duration=get_duration)
def generate(prompt: str, steps: int):
    return pipe(prompt, num_inference_steps=steps).images
```

This keeps admission checks accurate (fewer spurious "quota exceeded" rejections on cheap calls), keeps settlement close to real usage, and keeps you higher in the queue than a Space that blanket-declares `duration=120` for every call.

**Use PyTorch Ahead-of-Time (AoT) compilation instead of `torch.compile`.** ZeroGPU spins up a fresh process per call (or per short-lived worker), so `torch.compile`'s JIT compilation gets thrown away before it can be reused, and reloading from its filesystem cache can itself take tens of seconds to minutes. AoT compiles once, serializes the artifact, and reloads it instantly in any process:

```python
import torch
import spaces

# 1. Capture example inputs without executing the call
with spaces.aoti_capture(pipe.transformer) as call:
    pipe("example prompt")

# 2. Export the traced graph
exported = torch.export.export(
    pipe.transformer, args=call.args, kwargs=call.kwargs,
)

# 3. Compile ahead of time (run once, behind a generous duration)
@spaces.GPU(duration=1500)
def compile_transformer():
    return spaces.aoti_compile(exported)

compiled_transformer = compile_transformer()

# 4. Patch the pipeline to use the compiled graph
spaces.aoti_apply(compiled_transformer, pipe.transformer)
```

Measured gains run 1.3x-1.8x depending on the model, with FLUX.1-dev plus FlashAttention-3 kernels reaching 1.75x. Stack on `torchao` FP8 quantization for roughly another 1.2x on hardware with compute capability >= 9.0:

```python
from torchao.quantization import quantize_, Float8DynamicActivationFloat8WeightConfig
quantize_(pipe.transformer, Float8DynamicActivationFloat8WeightConfig())
```

For workloads with variable input shapes (e.g., multiple image resolutions), pass `dynamic_shapes` to `torch.export.export` rather than compiling a new graph per shape.

### 2. Application Architecture

**Cache in front of the GPU call, never inside it.** A cache hit should short-circuit before the request ever reaches the `@spaces.GPU` admission check, so it costs zero quota and zero queue time:

```python
import hashlib
from cachetools import TTLCache

_cache = TTLCache(maxsize=256, ttl=3600)

def _cache_key(prompt: str, steps: int, seed: int) -> str:
    return hashlib.sha256(f"{prompt}|{steps}|{seed}".encode()).hexdigest()

def generate(prompt: str, steps: int = 30, seed: int = 0):
    key = _cache_key(prompt, steps, seed)
    if key in _cache:
        return _cache[key]
    result = _generate_gpu(prompt, steps, seed)
    _cache[key] = result
    return result
```

A module-level `TTLCache` is sufficient for a single-process Space. If the Space scales to multiple replicas, back it with a shared store instead (a small Redis instance, or a Hugging Face Hub dataset repo used as a key-value dump) so a cache hit on one replica benefits requests landing on another.

**Batch at the model call, not just at the queue.** Gradio's `default_concurrency_limit` controls how many workers run an event listener in parallel, but running N separate GPU-attached calls still pays the reservation and (for `large`/`xlarge`) hand-off overhead N times. Where the underlying model supports batched inference, collect concurrent requests and issue one attached call:

```python
demo = gr.Interface(
    fn=generate_batch,
    inputs=gr.Text(),
    outputs=gr.Gallery(),
    batch=True,
    max_batch_size=8,
)
demo.queue(default_concurrency_limit=4)

@spaces.GPU(duration=get_batch_duration)
def generate_batch(prompts: list[str]):
    return pipe(prompts).images
```

Keep CPU-bound work (tokenization, prompt validation, image resizing) outside the decorated function entirely. Every second spent inside `@spaces.GPU` is billed against quota whether or not it actually needed a GPU.

### 3. Error Handling & UX

The critical detail for error handling: `spaces` raises its quota and abort errors (as a `gradio.exceptions.Error`) at the moment the decorated function is **called**, either before your function body ever runs (quota exceeded) or by killing the process mid-execution (task aborted past `duration`). That means you cannot catch these from inside the decorated function itself. Wrap the call site instead, in a thin undecorated handler:

```python
import gradio as gr
import spaces

@spaces.GPU(duration=30)
def _generate_gpu(prompt: str):
    return pipe(prompt).images

def generate(prompt: str):
    try:
        return _generate_gpu(prompt)
    except gr.Error as err:
        message = str(err).lower()
        if "quota" in message:
            raise gr.Error(
                "Daily free GPU quota is used up for your account. "
                "Try again later, or subscribe to PRO for 8x the quota."
            )
        if "aborted" in message:
            raise gr.Error(
                "The GPU worker was interrupted mid-request. Please retry."
            )
        raise
```

There is currently no dedicated exception subclass distinguishing "quota exceeded" from "task aborted," so message inspection is the practical way to branch. Since the message text is an implementation detail, treat this as best-effort UX polish, not something to depend on for control flow correctness, and fall through to re-raising on anything unrecognized so real bugs are not silently swallowed.

Gradio's queue does not expose a distinct public "queue timeout" exception either. If the goal is to bound total wait time from the user's perspective, wrap the call with your own timeout and degrade explicitly:

```python
import asyncio

async def generate_with_timeout(prompt: str, timeout_s: float = 45):
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_generate_gpu, prompt), timeout=timeout_s
        )
    except asyncio.TimeoutError:
        raise gr.Error("The queue is unusually busy right now. Please retry in a minute.")
```

### 4. The Escape Hatch: When to Move to Dedicated Inference Endpoints

ZeroGPU's quota is per visiting user, not per Space owner, so "my traffic grew" does not by itself burn your own quota. The real signals that it is time to move to a [Dedicated Inference Endpoint](https://huggingface.co/docs/inference-endpoints/faq) are:

- **Queue wait time, not quota, is the bottleneck.** ZeroGPU's physical fleet is shared across every Space using it, not just yours. If your own p95 queue wait is high enough that users bounce before their turn, more quota does not fix it. A dedicated endpoint gives you a private GPU with no queue.
- **You need predictable latency or an SLA.** Demos tolerate queueing; production surfaces (an API another service depends on, a synchronous user-facing feature) usually cannot.
- **Compute or memory exceeds the 96GB `xlarge` ceiling**, or you need multi-GPU/model-parallel serving that ZeroGPU's per-request slice model does not support.
- **You need persistent warm state across requests** (KV-cache reuse, session-sticky serving, long-lived in-memory indices). ZeroGPU's GPU attachment is ephemeral per call by design; a dedicated endpoint's process stays warm.
- **You are not on the Gradio SDK.** ZeroGPU is Gradio-only; anything else needs a different hosting path regardless of traffic.
- **Compliance requires VPC isolation or dedicated hardware**, which shared ZeroGPU infrastructure cannot offer.
- **The economics have crossed over.** Overage beyond the included quota costs $1 per 10 minutes, a $6/hour equivalent rate. Dedicated Inference Endpoints start around $0.50-$1/hour for entry-level GPUs, with scale-to-zero for idle periods. If you are routinely paying for more than roughly 30-60 minutes/day of overage credits, a dedicated endpoint is already cheaper on a per-compute-hour basis, before even counting the latency benefit of no queue.

None of these thresholds are officially published cutoffs. They are the practical judgment calls an architect should apply, since Hugging Face's own guidance is intentionally that ZeroGPU is for indie/demo-scale usage and PRO-subscription-level traffic, not a substitute for dedicated serving once a Space becomes a real product surface.

## Sources

- [Spaces ZeroGPU: Dynamic GPU Allocation for Spaces (official docs)](https://huggingface.co/docs/hub/en/spaces-zerogpu)
- [huggingface/hub-docs: spaces-zerogpu.md source](https://github.com/huggingface/hub-docs/blob/main/docs/hub/spaces-zerogpu.md)
- [Make your ZeroGPU Spaces go brrr with ahead-of-time compilation (HF blog)](https://huggingface.co/blog/zerogpu-aoti)
- [huggingface/skills: how-quota-works.md](https://github.com/huggingface/skills/blob/main/skills/huggingface-zerogpu/references/how-quota-works.md)
- [Inference Endpoints (dedicated) FAQ](https://huggingface.co/docs/inference-endpoints/faq)
- [Gradio Queuing guide](https://gradio.app/guides/queuing)
- [zero-gpu-explorers community discussions (error messages, real-world behavior)](https://huggingface.co/spaces/zero-gpu-explorers/README/discussions)

*Backing hardware, quota amounts, and per-call duration ceilings are the numbers most likely to change over time. Verify against the official docs link above before hard-coding any of these figures into production assumptions.*
