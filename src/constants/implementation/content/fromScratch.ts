import type { ModuleContent } from '../types';

/**
 * Intro prose and the closing checkpoint for Module 5. The teaching content
 * itself lives in ../concepts/fromScratch.ts and is rendered by the
 * ConceptExplorer on the module page.
 */
export const FROM_SCRATCH_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'overview',
      navLabel: 'Why build it',
      title: 'Frameworks are just code',
      body: [
        'Most frameworks are small ideas wrapped in ergonomics: a router is a lookup table plus wrapping functions, a state store is a value plus listeners, a worker pool is a queue plus N loops. Writing them with only a language’s native features shows what the library is actually doing and which language features carry the weight (interfaces, closures, generics, channels, ownership).',
        'Each task below is implemented in all nine languages with no third-party dependencies, except where the standard library has no such facility (HTTP in C++ and Swift, async in C++), in which case the note says so and the core logic is shown on its own. SQL and Spark show the nearest idiom the engine offers.',
      ],
    },
    {
      id: 'explorer',
      navLabel: 'Concept explorer',
      title: 'Build-from-scratch explorer',
      body: [
        'Pick a task, then switch between the nine languages to compare how each expresses the same design. Snippets illustrate the ideas and are not executed by this site, so compile and test them before reuse. The earlier Go router, TypeScript store, and Rust worker pool examples are the Go, TypeScript, and Rust tabs of their tasks.',
      ],
    },
  ],
  checkpoint: [
    'Go’s http.Handler interface is the whole contract for a router; middleware is just a function that takes a handler and returns a handler.',
    'A store is a value, a set of listeners, and an immutable update rule. Notify outside any lock, iterate over a copy of the listeners, and return an unsubscribe.',
    'A worker pool is a queue, N workers looping on it, and a shutdown signal. Run jobs outside the lock and make sure one failing job cannot kill a worker.',
    'O(1) LRU needs a hash map plus a linked list. Rust’s ownership makes the pointer-based list the hard part, while Python and Java bundle the pair.',
    'Compute rate-limiter refills from elapsed monotonic time instead of a timer, protect the token count and timestamp together, and inject the clock so tests stay fast.',
  ],
};
