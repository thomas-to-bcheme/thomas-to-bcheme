#include <torch/extension.h>
#include <cuda.h>
#include <cuda_runtime.h>

// Swish/SiLU activation: f(x) = x * sigmoid(x)
//
// Deliberately a simple element-wise kernel rather than e.g. matmul: no
// cuBLAS/cuDNN linkage, one CUDA thread per element, and trivially
// checkable against torch.nn.functional.silu as a correctness baseline.
__global__ void swish_kernel(const float* __restrict__ input,
                              float* __restrict__ output,
                              int64_t num_elements) {
    int64_t idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= num_elements) return; // grid size is rounded up to a block
                                      // multiple, so the last block may have
                                      // out-of-range threads.

    float x = input[idx];
    float sigmoid_x = 1.0f / (1.0f + expf(-x));
    output[idx] = x * sigmoid_x;
}

// Host-side launcher: extracts raw device pointers from PyTorch tensors and
// configures the CUDA launch grid. Runs on the CPU but dispatches work onto
// the GPU asynchronously.
torch::Tensor swish_forward(torch::Tensor input) {
    // Fail fast: catch misuse (CPU tensor, wrong dtype, non-contiguous view)
    // before touching a raw pointer, which would otherwise segfault instead
    // of raising a catchable Python exception.
    TORCH_CHECK(input.is_cuda(), "swish_forward: input must be a CUDA tensor");
    TORCH_CHECK(input.scalar_type() == torch::kFloat32,
                "swish_forward: input must be float32");
    TORCH_CHECK(input.is_contiguous(), "swish_forward: input must be contiguous");

    auto output = torch::empty_like(input);
    int64_t num_elements = input.numel();

    // 256 threads/block: a multiple of the warp size (32), small enough to
    // keep occupancy high across whatever SM count ZeroGPU hands us.
    const int threads_per_block = 256;
    const int blocks = (num_elements + threads_per_block - 1) / threads_per_block;

    swish_kernel<<<blocks, threads_per_block>>>(
        input.data_ptr<float>(),
        output.data_ptr<float>(),
        num_elements
    );

    return output;
}
