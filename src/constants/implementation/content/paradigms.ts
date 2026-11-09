import type { ModuleContent } from '../types';

/**
 * Intro prose and the closing checkpoint for Module 2. The teaching content
 * itself lives in ../concepts/paradigms.ts and is rendered by the
 * ConceptExplorer on the module page.
 */
export const PARADIGMS_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'overview',
      navLabel: 'Overview',
      title: 'Classes, protocols, and everything between',
      body: [
        'Classical object orientation bundles data and methods into classes and reuses code through inheritance. Polymorphism then needs a run-time lookup: in C++ a hidden pointer to a vtable (a table of function pointers) is followed on every virtual call. The Foundations module shows that mechanism and the composition-versus-inheritance trade-off in all nine languages; this module builds on it.',
        'Rust traits, Swift protocols, Go interfaces, and Kotlin delegation reach the same goals differently: they describe behaviour as a set of required methods, let unrelated types opt in, and often resolve the call at compile time so it can be inlined. The concepts below compare how each language declares an abstraction, reuses behaviour, models alternatives, and manages an object from construction to cleanup.',
      ],
    },
    {
      id: 'explorer',
      navLabel: 'Concept explorer',
      title: 'Paradigm explorer',
      body: [
        'Pick a concept on the left, then switch between the nine languages. SQL and Spark show their closest declarative idiom, with a note where the concept does not exist as such. Snippets illustrate the ideas and are not executed by this site, so check an exact API against the official documentation before relying on it.',
      ],
    },
  ],
  checkpoint: [
    'Inheritance reuses code but couples a subclass to its ancestors; prefer it for genuine is-a relationships you control, and prefer composition, delegation, or extension elsewhere.',
    'Static dispatch (Rust and Swift generics, C++ templates) is free at run time but grows the binary; dynamic dispatch (vtables, interfaces, dyn) is flexible but costs an indirect call and blocks inlining.',
    'Go and TypeScript match abstractions by shape; Rust, Swift, C++, and Kotlin ask the type to declare them. Rust and Swift can add a trait or protocol to a type after the fact.',
    'Sum types (enums, sealed types) make impossible states unrepresentable and turn missing cases into compile errors; Go and Spark need a convention and a default branch.',
    'Pass collaborators in through the constructor, and pass a function when the strategy is only one function. A framework is optional.',
  ],
};
