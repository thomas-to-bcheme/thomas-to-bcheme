import type { LanguageId, LanguageProfile } from './types';

export const IMPLEMENTATION_LANGUAGES: LanguageProfile[] = [
  { id: 'sql', name: 'SQL', role: 'Declarative set-based queries; the engine decides how to execute.' },
  { id: 'python', name: 'Python', role: 'Rapid orchestration, data work, and API services.' },
  { id: 'typescript', name: 'TypeScript', role: 'Typed JavaScript for interfaces and Node.js services.' },
  { id: 'spark', name: 'Spark', role: 'Distributed dataframes for petabyte-scale pipelines.' },
  { id: 'rust', name: 'Rust', role: 'Memory safety without a garbage collector.' },
  { id: 'cpp', name: 'C++', role: 'Zero-overhead abstractions and manual control of memory.' },
  { id: 'go', name: 'Go', role: 'Simple, concurrent network services.' },
  { id: 'swift', name: 'Swift', role: 'Protocol-oriented design with ARC memory management.' },
  { id: 'kotlin', name: 'Kotlin', role: 'Concise JVM language with structured coroutines.' },
];

export function getLanguageName(id: LanguageId): string {
  return IMPLEMENTATION_LANGUAGES.find((language) => language.id === id)?.name ?? id;
}
