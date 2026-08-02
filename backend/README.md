---
title: Portfolio ZeroGPU Backend
emoji: ⚡
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: "6.17.3"
app_file: app.py
pinned: false
license: mit
---

# Portfolio ZeroGPU Backend

GPU inference backend for the [thomas-to-bcheme portfolio](https://thomas-to-bcheme-github-io.vercel.app/)
site, deployed as a Hugging Face ZeroGPU Space. Headless API only — the Gradio page exists
to document the `/benchmark` endpoint, not to be clicked through as a demo; its input/output
components are rendered `visible=False` and reachable only via `gradio_client` or raw HTTP.

Beyond exercising the deploy pipeline, this is a personal practice space for: deploying
models end-to-end on real ZeroGPU infrastructure, benchmarking PyTorch performance on the
NVIDIA hardware ZeroGPU allocates on demand, and using that free GPU access as a sandbox
for learning CUDA and C/C++ GPU programming underneath PyTorch's abstractions.

`benchmark()` compiles a hand-written CUDA Swish/SiLU kernel (`csrc/kernel.cu`) at
runtime on first call — via `torch.utils.cpp_extension.load()` inside the
`@spaces.GPU`-decorated function, since that's the only place a physical GPU (and
therefore its architecture) is attached — and times it against PyTorch's built-in
`F.silu` on `DEVICE` (`"cuda"` on the real Space, `"cpu"` in local dev, where the
benchmark fails fast instead of running). See "Custom CUDA/C++ extension" below for
the full design.

## Local development

`./run.sh` activates `.venv`, frees port 7860 (killing whatever currently holds it), and
starts the app — a single command for repeat local restarts.

## Deployment

This folder deploys independently from the rest of the monorepo via
`.github/workflows/deploy-backend.yml`, triggered on pushes to `main` that touch
`backend/**`. It uploads this folder's contents to the Space via
`huggingface_hub.HfApi().upload_folder(...)` — never a git push — so it can never
clobber this Space's own separate git history.

## API contract

The benchmark function is wired to an explicit endpoint name, `api_name="benchmark"`,
rather than Gradio's default `/predict`, so the contract stays stable independent of UI
layout changes.

### gradio_client (Python)

```python
from gradio_client import Client

client = Client("thomas-to-bcheme/portfolio-zerogpu", hf_token="hf_...")  # HF_TOKEN_READ
result = client.predict(10_000_000, api_name="/benchmark")
print(result)  # "device=cuda arch=9.0+PTX numel=10000000 pytorch_ms=... cuda_kernel_ms=... speedup=...x max_abs_diff=..."
```

Note the leading slash on `api_name` here — this is a real `gradio_client` convention:
the endpoint is registered as `api_name="benchmark"` (no slash) in `app.py`, but
`gradio_client` calls address it as `"/benchmark"` (with slash).

### Raw HTTP (curl)

Gradio's REST API (confirmed against the installed `gradio==6.17.3`) is a two-step
call/poll shape under a `/gradio_api/` prefix — a single POST does **not** return the
result directly:

```bash
# 1. Submit the call, get back an event_id
curl -s -X POST https://thomas-to-bcheme-portfolio-zerogpu.hf.space/gradio_api/call/benchmark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HF_TOKEN_READ" \
  -d '{"data": [10000000]}'
# => {"event_id": "..."}

# 2. Poll for the result via SSE
curl -N https://thomas-to-bcheme-portfolio-zerogpu.hf.space/gradio_api/call/benchmark/<event_id> \
  -H "Authorization: Bearer $HF_TOKEN_READ"
# => event: complete
#    data: ["device=cuda arch=9.0+PTX numel=10000000 pytorch_ms=... cuda_kernel_ms=... speedup=...x max_abs_diff=..."]
```

## Secrets

| Secret | Lives in | Consumed by | Purpose |
|---|---|---|---|
| `HF_TOKEN_WRITE` | GitHub Actions repo secret | `.github/workflows/deploy-backend.yml` | Write-scoped token so CI can create/update this Space |
| `HF_TOKEN_READ` | Next.js server env (root `.env.local` / Vercel project env) | Frontend server-side code calling this Space | Attributes API calls to the owner's own HF account/quota instead of anonymous traffic |

Neither variable is read by `app.py` itself — both are consumed outside this folder (CI
for `HF_TOKEN_WRITE`, the frontend for `HF_TOKEN_READ`).

## Hardware

ZeroGPU hardware must be selected manually, once, via this Space's **Settings → Hardware**
after the first successful deploy — this is not set via YAML front matter or automated by
CI. The exact GPU model ZeroGPU allocates at runtime varies (NVIDIA RTX PRO 6000 Blackwell,
compute capability 12.2, and NVIDIA H200, compute capability 9.0, have both been observed).
`benchmark()` never hardcodes an assumed architecture — see below.

## Custom CUDA/C++ extension

`csrc/kernel.cu` + `csrc/extension.cpp` implement a hand-written CUDA Swish/SiLU kernel
(`f(x) = x * sigmoid(x)`), benchmarked against PyTorch's built-in `F.silu` by `benchmark()`
in `app.py`. This is deployed and live — not a template. The kernel is deliberately a
simple *element-wise* op rather than e.g. matmul: no cuBLAS/cuDNN linkage, one CUDA thread
per element, and trivially checkable for correctness against `F.silu` (see `max_abs_diff`
in the response).

### ZeroGPU constraints this navigates

1. **The build phase is CPU-only.** Space initialization (`pip install -r requirements.txt`)
   runs on a CPU-only image with no `nvcc` — a `setup.py`/`CUDAExtension` build triggered
   at install time is not possible here. This rules out compiling the extension ahead of
   time as part of the Space's build step.
2. **The runtime container does have `nvcc`.** Since ZeroGPU mounts a CUDA devel image at
   runtime specifically to support compiling inside `@spaces.GPU`-decorated calls, JIT
   compilation via `torch.utils.cpp_extension.load()` — called from inside `benchmark()` —
   is the approach that actually works, not `setup.py`.
3. **Runtime execution is isolated to `@spaces.GPU`.** A physical GPU is attached to the
   process only inside functions decorated with `@spaces.GPU`. Outside those functions
   (module level, Gradio callbacks), PyTorch runs in a CPU/CUDA-emulation mode — so this is
   also the only place `torch.cuda.get_device_capability()` can be queried, which is why the
   target architecture is detected here rather than assumed ahead of time.
4. **Every call forks a fresh process from the long-lived parent.** Nothing set as a Python
   global *inside* `benchmark()` persists to the next call, since the next call forks fresh
   from the parent, which never ran that code. The only thing that actually persists across
   calls is what's written to disk: `cuda_ext.py` uses a fixed `build_directory`, so
   `torch.utils.cpp_extension.load()`'s own hash-based caching skips recompilation after the
   first cold call within a given container's lifetime. A Space restart/redeploy is a fresh
   container and a fresh (expected) cache miss on the next call.

### Design (`backend/cuda_ext.py`)

`load_swish_extension()` is called from inside `benchmark()` (never at module level, per
constraint 3 above):

- Detects `major, minor = torch.cuda.get_device_capability()` and sets
  `TORCH_CUDA_ARCH_LIST = f"{major}.{minor}+PTX"` fresh on every call (must be re-set every
  fork, per constraint 4 — nothing here is assumed to persist).
- Calls `torch.utils.cpp_extension.load(name=..., sources=[...], build_directory=<fixed
  path under the system temp dir, outside backend/>)`. The fixed path means repeat calls
  hit the on-disk build cache instead of recompiling.
- If the exact detected arch fails to compile (e.g. a PyTorch/CUDA-toolkit version without
  full support for a very new architecture), retries once with a `f"{major}.0+PTX"`
  fallback — still runtime-derived, never a hardcoded guess. If that also fails, raises a
  `RuntimeError` with both attempted arch strings and the original compiler errors.

### `app.py` benchmark contract

`benchmark(numel: float) -> str` creates a random `numel`-element float32 tensor, times
`F.silu` and the custom kernel separately (each bracketed with `torch.cuda.synchronize()`
for accurate async-kernel timing), and returns one string with both timings, the speedup
ratio, and `max_abs_diff` between the two outputs as a correctness check — see "API
contract" above for the exact response shape and example calls.
