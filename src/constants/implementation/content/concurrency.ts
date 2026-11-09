import type { ModuleContent } from '../types';

/**
 * Intro prose and the closing checkpoint for Module 4. The teaching content
 * itself lives in ../concepts/asyncConcurrency.ts and ../concepts/parallelism.ts
 * and is rendered by the ConceptExplorer on the module page.
 */
export const CONCURRENCY_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'models',
      navLabel: 'Execution models',
      title: 'Concurrency versus parallelism',
      body: [
        'Concurrency is structuring a program as independent tasks that can make progress in overlapping time; parallelism is running tasks at the same instant on several CPU cores. A program can be concurrent on one core. I/O-bound work spends most of its time waiting on disk or network, so concurrency helps; CPU-bound work needs parallelism.',
        'The operating system schedules threads onto cores, each with its own stack (often megabytes) and a context-switch cost. Event loops, green threads, and coroutines are scheduled by a language runtime in user space: they are much smaller and cheaper, which is why Go can run hundreds of thousands of goroutines and Kotlin coroutines and Rust futures suspend without blocking a thread.',
      ],
    },
    {
      id: 'explorer',
      navLabel: 'Concept explorer',
      title: 'Concurrency explorer',
      body: [
        'The first group covers waiting: event loops, futures, fan-out, and cancellation. The second covers doing: threads, coroutines, channels, locks, atomics, races, and pools. Pick a concept, then switch between the nine languages. SQL and Spark show the engine-level analogue (locks and MVCC, partitions and tasks).',
        'Snippets illustrate the ideas and are not executed by this site, so test them before relying on timing or ordering. Several need a library (Tokio, Rayon, kotlinx.coroutines, Boost.Asio).',
      ],
    },
  ],
  checkpoint: [
    'I/O-bound work wants concurrency (event loops, coroutines); CPU-bound work wants parallelism (threads, processes). Never run CPU-heavy or blocking code on an event-loop thread.',
    'Start independent waits together, choose a failure policy, and give every external wait a deadline and a cancellation path.',
    'Coroutines and goroutines are cheap because the runtime schedules them; OS threads are heavier but run in true parallel. Python needs processes for CPU parallelism while the GIL remains.',
    'Prefer message passing or ownership transfer to shared locks; when you share, keep critical sections short, lock in a fixed order, and use atomics only for a single value.',
    'Rust turns data races into compile errors through Send and Sync, and Swift 6 does the same with Sendable and actors; Go, C++, and Kotlin rely on discipline and tools (the race detector, sanitizers).',
  ],
};
