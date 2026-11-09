import type { ConceptPart, ConceptPartMeta } from './types';

/** The module section whose body is the concept explorer (see content/*.ts). */
export const EXPLORER_SECTION_ID = 'explorer';

export const CONCEPT_PARTS: Record<ConceptPart, ConceptPartMeta> = {
  basics: {
    id: 'basics',
    label: '1 · Basics',
    description: 'Variables, types, constants, operators, booleans, strings, casting, and bits.',
  },
  'control-flow': {
    id: 'control-flow',
    label: '2 · Control flow',
    description: 'Loops, branching, pattern matching, short-circuiting, and recursion.',
  },
  'functions-scope': {
    id: 'functions-scope',
    label: '3 · Functions & scope',
    description: 'Functions, closures, scope, and how arguments are passed.',
  },
  'strings-oop': {
    id: 'strings-oop',
    label: '4 · Strings & OOP',
    description: 'String handling, classes, dispatch, and composition versus inheritance.',
  },
  'memory-model': {
    id: 'memory-model',
    label: '5 · Memory model',
    description: 'Stack and heap, pointers and aliasing, and who frees memory.',
  },
  'foundations-core': {
    id: 'foundations-core',
    label: '6 · Foundations core',
    description: 'Mutability, type systems, error models, and testing.',
  },
  algorithms: {
    id: 'algorithms',
    label: 'Data structures & algorithms',
    description: 'Core structures and algorithms with complexity.',
  },
  paradigms: {
    id: 'paradigms',
    label: 'Paradigms',
    description: 'Generics, abstractions, delegation, data modelling, and object lifecycle.',
  },
  async: {
    id: 'async',
    label: 'Async I/O',
    description: 'Event loops, futures, and concurrent waiting.',
  },
  parallelism: {
    id: 'parallelism',
    label: 'Threads & parallelism',
    description: 'Threads, coroutines, channels, locks, atomics, and pools.',
  },
  scratch: {
    id: 'scratch',
    label: 'Built from scratch',
    description: 'Small frameworks written with native language features only.',
  },
  interop: {
    id: 'interop',
    label: 'FFI & network APIs',
    description: 'Crossing a language boundary in-process or over the network.',
  },
};
