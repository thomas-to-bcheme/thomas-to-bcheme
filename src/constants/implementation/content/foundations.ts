import type { ModuleContent } from '../types';

/**
 * Intro prose and the closing checkpoint for Module 1. The teaching content
 * itself lives in the concept data (../concepts) and is rendered by the
 * ConceptExplorer and TraitsExplorer components on the module page.
 */
export const FOUNDATIONS_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'explorer',
      navLabel: 'Concept explorer',
      title: 'Concept explorer',
      body: [
        'Pick a concept on the left, then switch between the nine languages to compare how each one expresses it. The concepts run from variables and operators, through control flow, functions, and object orientation, to the memory model, mutability, type systems, error handling, and testing.',
        'SQL and Spark show their closest declarative idiom, with a note where the concept does not exist as such. The snippets illustrate ideas and are not executed by this site, so check them against the official documentation before relying on an exact API.',
      ],
    },
    {
      id: 'traits',
      navLabel: 'Unique traits',
      title: 'What makes each language different',
      body: [
        'Every language has a few ideas that define it: Rust ownership and borrowing, C++ RAII and move semantics, Go goroutines and channels, Swift ARC and optionals, Kotlin null safety and structured coroutines, Python duck typing and generators, TypeScript structural typing, SQL set-based thinking and NULL logic, and Spark lazy evaluation and shuffles. Choose a language to see its traits.',
      ],
    },
  ],
  checkpoint: [
    'Memory: manual or RAII (C++), ownership (Rust), ARC (Swift), tracing GC (Go, Kotlin, TypeScript, Python), engine-managed (SQL, Spark). Less runtime work costs more programmer or compiler effort.',
    'Mutability by default differs: Rust, Kotlin, and Swift push you toward immutable bindings; Spark makes datasets immutable.',
    'Errors in the type (Rust Result, Go error) are visible but verbose; exceptions are concise but easy to miss.',
    'Conversions, short-circuiting, and argument passing are where languages that look alike behave differently. Test the edge cases (overflow, null, aliasing) rather than assuming.',
  ],
};
