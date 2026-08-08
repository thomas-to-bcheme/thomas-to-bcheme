/**
 * gpu-cuda glossary terms.
 *
 * Ledger populated in Phase 1 (slug/term/category/voiceTemplate only).
 * `definition` fields are filled in Phase 2 by an isolated content subagent
 * — see plan §7. Source lineage (Directive #3 — authoritative, not a
 * summary-of-a-summary): scratchpad/glossary-sources/{GPU-TPU,
 * cuda-distributed-computing,cuda-flash-attention}.txt, extracted via
 * scripts/extractBoardText.ts from:
 *   public/excalidraw/GPU-TPU.excalidraw                    @ de728202f26d0176cf416b1fd2e47ce7da9d5c57
 *   public/excalidraw/cuda-distributed-computing.excalidraw @ 9578e0417a3eaf937a58b3fa9dffed6375b14e59
 *   public/excalidraw/cuda-flash-attention.excalidraw       @ 5fc35841185265fdc40ad15da22b97bbc1e98b44
 * plus https://modal.com/gpu-glossary (structural reference).
 */

import type { GlossaryTerm } from './types';

export const GLOSSARY_TERMS_GPU_CUDA: GlossaryTerm[] = [
  { slug: 'streaming-multiprocessor', term: 'Streaming Multiprocessor (SM)', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'cuda-core', term: 'CUDA Core', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'tensor-core', term: 'Tensor Core', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'warp', term: 'Warp', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'thread-block', term: 'Thread Block', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'grid-cuda', term: 'Grid', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'kernel-cuda', term: 'Kernel', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'host-vs-device', term: 'Host vs. Device', category: 'gpu-cuda', voiceTemplate: 'structure', definition: '' },
  { slug: 'register-file', term: 'Register File', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'shared-memory', term: 'Shared Memory', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'global-memory', term: 'Global Memory (HBM)', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'memory-hierarchy-gpu', term: 'GPU Memory Hierarchy', category: 'gpu-cuda', voiceTemplate: 'structure', definition: '' },
  { slug: 'occupancy', term: 'Occupancy', category: 'gpu-cuda', voiceTemplate: 'constraint', definition: '' },
  { slug: 'warp-divergence', term: 'Warp Divergence', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'memory-coalescing', term: 'Memory Coalescing', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'bank-conflict', term: 'Bank Conflict', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'tensor-memory-accelerator', term: 'Tensor Memory Accelerator (TMA)', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'nvlink', term: 'NVLink', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'pcie', term: 'PCIe', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'nccl', term: 'NCCL', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['all-reduce', 'nvlink'] },
  { slug: 'all-reduce', term: 'AllReduce', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['nccl'] },
  { slug: 'ring-vs-tree-collectives', term: 'Ring vs. Tree Collectives', category: 'gpu-cuda', voiceTemplate: 'structure', definition: '' },
  { slug: 'data-parallelism', term: 'Data Parallelism', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'tensor-parallelism', term: 'Tensor Parallelism', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'pipeline-parallelism', term: 'Pipeline Parallelism', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'mixed-precision', term: 'Mixed Precision (bf16/fp16/fp8)', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'flash-attention', term: 'Flash Attention', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['self-attention', 'shared-memory'] },
  { slug: 'kv-cache', term: 'KV Cache', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'paged-attention', term: 'Paged Attention', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['kv-cache'] },
  { slug: 'quantization', term: 'Quantization', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'mixture-of-experts', term: 'Mixture of Experts (MoE)', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'gemm-vs-gemv', term: 'GEMM vs. GEMV', category: 'gpu-cuda', voiceTemplate: 'structure', definition: '' },
  { slug: 'compute-bound-vs-memory-bound', term: 'Compute-Bound vs. Memory-Bound', category: 'gpu-cuda', voiceTemplate: 'structure', definition: '' },
  { slug: 'jit-compilation-cuda', term: 'JIT Compilation', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'ptx', term: 'PTX', category: 'gpu-cuda', voiceTemplate: 'mechanism', definition: '' },
];
