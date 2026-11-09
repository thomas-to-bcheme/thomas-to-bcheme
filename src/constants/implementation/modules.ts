/**
 * The seven curriculum modules and the /implementation route each one owns.
 * Plain data with no content import, so src/constants/site.ts can derive the
 * Implementation nav group from it without pulling in lesson text.
 */

import type { ModuleId, ModulePageMeta } from './types';

export const IMPLEMENTATION_BASE_PATH = '/implementation';

const moduleHref = (id: ModuleId) => `${IMPLEMENTATION_BASE_PATH}/${id}`;

export const IMPLEMENTATION_MODULES: ModulePageMeta[] = [
  {
    id: 'foundations',
    href: moduleHref('foundations'),
    navLabel: 'Language Foundations',
    eyebrow: 'Module 1 · Foundations',
    title: 'Nine languages,',
    titleAccent: 'one mental model',
    lede: 'Memory management, primitives, mutability, type systems, control flow, error models, and testing, contrasted across SQL, Python, TypeScript, Spark, Rust, C++, Go, Swift, and Kotlin.',
    summary: 'Memory models, types, mutability, errors, and testing across all nine languages.',
  },
  {
    id: 'paradigms',
    href: moduleHref('paradigms'),
    navLabel: 'Paradigms & OOP',
    eyebrow: 'Module 2 · Paradigms',
    title: 'Inheritance, or',
    titleAccent: 'composition',
    lede: 'Classical object orientation (classes, inheritance, vtables) in C++, Kotlin, and Python, against the trait, protocol, and implicit-interface designs of Rust, Swift, and Go.',
    summary: 'Classes and vtables versus traits, protocols, and implicit interfaces.',
  },
  {
    id: 'algorithms',
    href: moduleHref('algorithms'),
    navLabel: 'Data Structures & Algorithms',
    eyebrow: 'Module 3 · DS&A',
    title: 'Complexity you can',
    titleAccent: 'measure on hardware',
    lede: 'Arrays, linear structures, searching and sorting, trees, graphs, and dynamic programming, implemented in Rust, C++, Go, and Python with time and space analysis.',
    summary: 'Core data structures and algorithms with Big-O analysis in four languages.',
  },
  {
    id: 'concurrency',
    href: moduleHref('concurrency'),
    navLabel: 'Concurrency & Performance',
    eyebrow: 'Module 4 · Concurrency',
    title: 'Waiting is cheap,',
    titleAccent: 'sharing is not',
    lede: 'Event loops and futures, OS threads versus green threads and coroutines, and the thread-safety tools each language gives you: Rust Send and Sync, mutexes, and atomics.',
    summary: 'Async I/O, threads, coroutines, and thread safety across languages.',
  },
  {
    id: 'from-scratch',
    href: moduleHref('from-scratch'),
    navLabel: 'Building From Scratch',
    eyebrow: 'Module 5 · From scratch',
    title: 'Frameworks are',
    titleAccent: 'just code',
    lede: 'Build an HTTP router in Go, a reactive state container in TypeScript, and a thread-safe worker pool in Rust, using only each language’s native features.',
    summary: 'A Go router, a TypeScript store, and a Rust worker pool with zero dependencies.',
  },
  {
    id: 'ffi-vs-network',
    href: moduleHref('ffi-vs-network'),
    navLabel: 'FFI vs Network APIs',
    eyebrow: 'Module 6 · Interop',
    title: 'Nanoseconds or',
    titleAccent: 'milliseconds',
    lede: 'Call a Rust cdylib from Node.js in-process, or put it behind a FastAPI service and a React frontend, then compare latency, serialization, memory safety, and failure domains.',
    summary: 'In-process FFI versus a decoupled network API, with a trade-off comparison.',
  },
  {
    id: 'architecture',
    href: moduleHref('architecture'),
    navLabel: 'Architecture & Ecosystem',
    eyebrow: 'Module 7 · Architecture',
    title: 'Choosing the language',
    titleAccent: 'is an architecture decision',
    lede: 'An ADR framework for matching languages to workloads, plus a reference matrix mapping each language to its official documentation, standard library APIs, and production ecosystem.',
    summary: 'ADR framework and the ecosystem reference matrix for all nine languages.',
  },
];

/** Takes a raw route segment, so the [module] page can look it up before narrowing. */
export function getModuleById(id: string): ModulePageMeta | null {
  return IMPLEMENTATION_MODULES.find((entry) => entry.id === id) ?? null;
}
