"""Lazy compile-and-cache wrapper for the custom Swish/SiLU CUDA extension.

ZeroGPU constraints this navigates (see backend/README.md for the full
writeup):
  - The build phase (Space init / `pip install -r requirements.txt`) is a
    CPU-only image with no `nvcc` — a setup.py/CUDAExtension build-time
    compile is not possible here.
  - The runtime container *does* have `nvcc` mounted, but only usable from
    inside an `@spaces.GPU`-decorated call, since that's the only place a
    physical GPU is attached (`torch.cuda.get_device_capability()` and
    friends raise/lie everywhere else).
  - `@spaces.GPU` forks a fresh process from the long-lived parent for every
    call. Any Python-level global set *inside* the decorated function is
    invisible to the next call, because the next call forks again from the
    parent, which never ran that code. In-memory caching of the compiled
    module across calls does not work — only the on-disk build directory
    (written by `torch.utils.cpp_extension.load()` itself) persists, because
    the container filesystem is shared and outlives any single call.
"""

import os
import tempfile
from pathlib import Path

import torch
from torch.utils.cpp_extension import load

_CSRC_DIR = Path(__file__).parent / "csrc"
_EXTENSION_NAME = "zerogpu_swish_ext"

# Fixed, deterministic path (no PID/timestamp/random suffix) so repeated
# calls within the same running container resolve to the same directory and
# hit load()'s own incremental-build skip. Lives under the system temp dir,
# outside backend/, so a build artifact can never be accidentally swept into
# deploy-backend.yml's upload_folder(folder_path="backend") commit. This
# cache is scoped to one container's lifetime — a Space restart/redeploy is
# a fresh container and a fresh (expected) cache miss on the next call.
_BUILD_DIR = Path(tempfile.gettempdir()) / "zerogpu_cuda_ext_build" / _EXTENSION_NAME


def load_swish_extension() -> tuple[object, str]:
    """Compile (or reuse a cached compile of) the Swish/SiLU CUDA extension.

    Must be called only from inside an @spaces.GPU-decorated function — both
    nvcc's presence and torch.cuda.get_device_capability() require the real
    GPU attachment that only exists there. Returns (module, arch_tag) so
    callers can report the detected arch alongside benchmark results.
    """
    if not torch.cuda.is_available():
        raise RuntimeError(
            "load_swish_extension() requires a live CUDA device; call it "
            "only from inside an @spaces.GPU-decorated function. Locally "
            "(no GPU attached), this failure is expected — see "
            "backend/README.md."
        )

    _BUILD_DIR.mkdir(parents=True, exist_ok=True)
    major, minor = torch.cuda.get_device_capability()
    sources = [str(_CSRC_DIR / "kernel.cu"), str(_CSRC_DIR / "extension.cpp")]

    arch_tag = f"{major}.{minor}+PTX"
    os.environ["TORCH_CUDA_ARCH_LIST"] = arch_tag
    try:
        module = load(
            name=_EXTENSION_NAME,
            sources=sources,
            build_directory=str(_BUILD_DIR),
            verbose=True,
        )
        return module, arch_tag
    except (OSError, RuntimeError) as exc:
        fallback_tag = f"{major}.0+PTX"
        if fallback_tag == arch_tag:
            raise RuntimeError(
                f"CUDA extension compile failed for arch={arch_tag} "
                f"(build_dir={_BUILD_DIR}). Verify nvcc is on PATH inside "
                f"the ZeroGPU runtime container. Original error: {exc}"
            ) from exc

        os.environ["TORCH_CUDA_ARCH_LIST"] = fallback_tag
        try:
            module = load(
                name=_EXTENSION_NAME,
                sources=sources,
                build_directory=str(_BUILD_DIR),
                verbose=True,
            )
            return module, fallback_tag
        except (OSError, RuntimeError) as fallback_exc:
            raise RuntimeError(
                f"CUDA extension compile failed for both arch={arch_tag} "
                f"and fallback arch={fallback_tag} (build_dir={_BUILD_DIR}). "
                f"Check the Space's runtime logs for the underlying nvcc "
                f"error. Original: {exc}; fallback attempt: {fallback_exc}"
            ) from fallback_exc
