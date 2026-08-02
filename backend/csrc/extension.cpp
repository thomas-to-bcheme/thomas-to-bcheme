#include <torch/extension.h>

// Forward declaration: the actual CUDA launch logic lives in kernel.cu
// (compiled separately by nvcc). This file (compiled by the host compiler)
// only needs the signature to build the Python bridge.
torch::Tensor swish_forward(torch::Tensor input);

// TORCH_EXTENSION_NAME is injected by torch.utils.cpp_extension.load()'s
// name= argument at compile time — it becomes the module name imported in
// Python (see cuda_ext.py), so it must stay in sync with that argument.
PYBIND11_MODULE(TORCH_EXTENSION_NAME, module) {
    module.def(
        "swish_forward",
        &swish_forward,
        "Swish/SiLU activation (CUDA)"
    );
}
