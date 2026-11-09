/**
 * Types for the concept explorers on /implementation/foundations and
 * /implementation/algorithms.
 *
 * Plain data shapes only (no content imports), so the client explorer can
 * import types without pulling any snippet text into its bundle.
 */

import type { LanguageId } from '../types';

export type ConceptPart =
  | 'basics'
  | 'control-flow'
  | 'functions-scope'
  | 'strings-oop'
  | 'memory-model'
  | 'foundations-core'
  | 'algorithms'
  | 'paradigms'
  | 'async'
  | 'parallelism'
  | 'scratch'
  | 'interop';

export interface ConceptPartMeta {
  id: ConceptPart;
  label: string;
  description: string;
}

export interface LanguageSnippet {
  code: string;
  /** One line on what to notice, or why this language only has an analogue. */
  note?: string;
}

export interface Concept {
  id: string;
  part: ConceptPart;
  navLabel: string;
  title: string;
  summary: string;
  /** Time and space complexity, for the data-structure and algorithm concepts. */
  complexity?: string;
  /** Record over LanguageId: a missing language is a compile error. */
  snippets: Record<LanguageId, LanguageSnippet>;
  takeaway: string;
}

export interface ConceptTrait {
  id: string;
  title: string;
  summary: string;
  snippet: LanguageSnippet;
}

export interface LanguageTraits {
  languageId: LanguageId;
  traits: ConceptTrait[];
}
