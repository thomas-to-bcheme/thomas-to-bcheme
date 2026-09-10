/**
 * Per-language industry standards, stated ONCE.
 *
 * "Idiomatic" and "optimized" mean different things in Python, C++, and Rust,
 * and if each of ~58 model files decides for itself what they mean, the section
 * becomes 58 independent opinions rather than one standard. So the definition
 * lives here, is rendered on the /ai-ml hub, and is enforced by
 * scripts/verifyAiMl.ts:
 *
 *  - a 'make-it-right' sample's `conventions` must all appear in `conventions`
 *  - a 'make-it-fast' sample's `optimizations[].technique` must each name an
 *    entry in `optimizationLevers`
 *  - naming an `antiPatterns` entry is a WARN
 *
 * That is what makes "optimized" a checkable claim instead of a label. The
 * closed vocabulary is the point; extend these arrays deliberately rather than
 * writing free text at the call site.
 */

import type { CodeLanguageId } from './types';

export interface LanguageStandard {
  label: string;
  /** The named, citable standard. */
  styleGuide: string;
  /** What actually enforces it. */
  tooling: string[];
  /** What a 'make-it-right' stage must demonstrate. */
  conventions: string[];
  /** The closed vocabulary a 'make-it-fast' stage must draw from. */
  optimizationLevers: string[];
  ecosystem: { numeric: string; ml: string };
  /** What an optimized stage must NOT do. */
  antiPatterns: string[];
}

export const LANGUAGE_STANDARDS: Record<CodeLanguageId, LanguageStandard> = {
  python: {
    label: 'Python',
    styleGuide: 'PEP 8 · PEP 484 type hints · PEP 257 docstrings',
    tooling: ['ruff', 'mypy --strict', 'pytest'],
    conventions: [
      'Explicit type hints on every public signature',
      'No mutable default arguments',
      'Dataclasses or NamedTuples over ad-hoc dicts',
      'Context managers for resource cleanup',
      'Raise specific exceptions, never bare except',
      'Guard clauses over nested conditionals',
    ],
    optimizationLevers: [
      'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
      'Eliminate Python-level loops over samples',
      'Pre-allocate output arrays and use in-place operations',
      'Ensure contiguous memory layout and a single dtype',
      'Replace a closed-form solve with a numerically stabler factorization',
      'Batch work to amortize interpreter overhead',
      'Reach for a compiled kernel (numba/JAX) only once profiled',
    ],
    ecosystem: { numeric: 'NumPy / SciPy', ml: 'scikit-learn, PyTorch' },
    antiPatterns: [
      'Premature numba/Cython before profiling',
      'Lists-of-lists standing in for matrices',
      'Broadcasting tricks that obscure the shape contract',
    ],
  },
  cpp: {
    label: 'C/C++',
    styleGuide: 'C++ Core Guidelines · ISO C++20',
    tooling: ['clang-tidy', 'g++ -Wall -Wextra -Wpedantic', 'ASan / UBSan'],
    conventions: [
      'RAII for every owned resource',
      'const-correctness on parameters and members',
      'No raw new/delete; std::vector and smart pointers instead',
      'std::span for non-owning views',
      'Rule of zero — let the compiler generate special members',
      'Fail fast on invalid input before any allocation',
    ],
    optimizationLevers: [
      'Compile with -O3 -march=native',
      'Row-major, cache-friendly memory layout',
      'Loop fusion to eliminate intermediate buffers',
      'Restrict/aliasing hints so the compiler can vectorize',
      'Rely on compiler autovectorization before hand-written SIMD',
      'OpenMP for data-parallel loops',
      'Eigen expression templates to avoid temporaries',
      'Delegate the inner kernel to a tuned BLAS',
    ],
    ecosystem: { numeric: 'Eigen, BLAS/LAPACK', ml: 'libtorch' },
    antiPatterns: [
      'Hand-written SIMD intrinsics before measuring',
      'Raw owning pointers',
      'Premature multithreading of a memory-bound loop',
    ],
  },
  rust: {
    label: 'Rust',
    styleGuide: 'Rust API Guidelines · Rust Style Guide',
    tooling: ['cargo clippy -- -W clippy::pedantic', 'cargo fmt', 'criterion'],
    conventions: [
      'Result<T, E> over panics for recoverable errors',
      'Iterator chains over manual index loops',
      'Borrow rather than clone; take &[T] not Vec<T>',
      'Newtypes for units and dimensions',
      'Forbid unsafe unless a benchmark justifies it',
      'Validate inputs at the constructor boundary',
    ],
    optimizationLevers: [
      'Iterator chains for bounds-check elision',
      'rayon for data parallelism',
      'ndarray with the BLAS feature enabled',
      'Vec::with_capacity to avoid reallocation',
      'Eliminate needless clone() in the hot path',
      '#[inline] on small hot functions',
      'Operate on slices to keep data contiguous',
    ],
    ecosystem: { numeric: 'ndarray', ml: 'linfa, candle / burn' },
    antiPatterns: [
      'unsafe for speed without a benchmark',
      'clone() to sidestep the borrow checker',
      'Collecting an iterator only to immediately re-iterate it',
    ],
  },
};
