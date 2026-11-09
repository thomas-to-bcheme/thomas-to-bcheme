import type { ModuleContent } from '../types';

/**
 * Intro prose, the FFI-versus-network comparison, and the closing checkpoint
 * for Module 6. The teaching content itself lives in ../concepts/interop.ts and
 * is rendered by the ConceptExplorer on the module page.
 */
export const FFI_VS_NETWORK_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'overview',
      navLabel: 'Two boundaries',
      title: 'In-process FFI or a network API',
      body: [
        'A foreign function interface (FFI) lets one language call another inside the same process through the C ABI, the lowest common calling convention. A compute-heavy core written in Rust or C++ is built as a dynamic library, and the host language calls it directly. A TypedArray, a Python array, or a Go slice is a contiguous buffer, so its address and length can be passed to native code, which reads it with no copy (zero-copy).',
        'The decoupled alternative puts a network boundary between tiers: a React frontend sends JSON over HTTP to a Python FastAPI service, which delegates compute to the same native core. Each tier is deployed, scaled, and restarted on its own, at the cost of serialization and latency.',
      ],
    },
    {
      id: 'explorer',
      navLabel: 'Concept explorer',
      title: 'Interop explorer',
      body: [
        'The first concept crosses the C ABI in-process from each language; the next three cover the network side (serving an endpoint, calling one, and what serialization costs); the last compares how each boundary fails. Pick a concept, then switch between the nine languages. SQL and Spark show the nearest idiom (database extensions and gateways, native libraries in UDFs).',
        'Snippets illustrate the ideas and are not executed by this site. They need a built native library, or packages such as koffi, FastAPI, Axum, Ktor, and Vapor, so treat them as study material and check each library’s documentation for current versions.',
      ],
    },
    {
      id: 'comparison',
      navLabel: 'Comparison',
      title: 'FFI versus network API',
      body: [
        'Latency: an FFI call costs on the order of tens to hundreds of nanoseconds; a network call costs at least a local round trip (often a millisecond or more) plus queuing and serialization. Serialization: FFI can share a buffer; HTTP JSON turns every number into text and back. Memory safety: across FFI, a bad pointer in Rust or C corrupts the whole process; across a network, the callee cannot touch the caller’s memory. Failure domains: FFI shares one process, so a crash or panic takes everything down; a service fails independently and can be restarted, scaled, and deployed on its own.',
        'Rule of thumb: choose FFI for a tight, frequently called computation owned by one team and shipped together; choose a network API when teams, release cycles, languages, or scaling needs differ, or when you need isolation from native-code crashes.',
      ],
    },
  ],
  checkpoint: [
    'FFI wins on latency and zero-copy data sharing, and loses on isolation: one process, one failure domain.',
    'Network APIs add milliseconds and serialization, and gain independent scaling, deployment, and fault isolation.',
    'Every FFI boundary is unsafe: document pointer and length contracts, keep the surface to flat C types, and never let a panic or exception cross it.',
    'Every network boundary is untrusted: validate input, set timeouts, check status codes, retry only transient failures with back-off, and measure serialization before choosing JSON.',
  ],
};
