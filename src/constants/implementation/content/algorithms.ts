import type { ModuleContent } from '../types';

/**
 * Intro prose and the closing checkpoint for Module 3. The data structures and
 * algorithms themselves live in ../concepts and are rendered by the
 * ConceptExplorer on the module page.
 */
export const ALGORITHMS_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'complexity',
      navLabel: 'Complexity',
      title: 'Reading Big-O',
      body: [
        'Big-O describes how the work (time) or memory (space) a routine needs grows with input size n. O(1) is constant, O(log n) halves the problem each step, O(n) touches each item once, O(n log n) is the cost of efficient sorting, and O(n^2) compares every pair. It hides constants, so two O(n) routines can differ widely when one walks contiguous memory and the other chases pointers.',
      ],
    },
    {
      id: 'explorer',
      navLabel: 'Structure explorer',
      title: 'Data structure and algorithm explorer',
      body: [
        'Pick a structure or algorithm, then switch between the nine languages. Each snippet solves the same small problem so the differences are about the language: ownership in Rust linked lists, slices that share storage in Go, copy-on-write in Swift, no built-in heap in JavaScript. SQL and Spark show the declarative equivalent, such as a B-tree index for binary search or a hash aggregate for a hash map.',
        'Snippets illustrate the ideas and are not executed by this site. Treat them as study material and test them before reuse.',
      ],
    },
  ],
  checkpoint: [
    'Contiguous arrays beat pointer-based structures at the same Big-O because of CPU caches.',
    'Pick the structure for the operation you repeat most: heap for min/max, hash map for lookup, trie for prefixes, adjacency list for sparse graphs.',
    'BFS for unweighted shortest paths, Dijkstra for non-negative weights; memoisation turns exponential recursion into polynomial time.',
    'In Spark and SQL, express the problem as joins, aggregations, and window functions rather than pointer-chasing loops.',
  ],
};
