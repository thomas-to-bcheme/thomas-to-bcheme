/**
 * Types for the /implementation section (Polyglot Systems Engineering curriculum).
 *
 * Plain data shapes only, so client and server code can import them freely.
 */

export type ModuleId =
  | 'foundations'
  | 'paradigms'
  | 'algorithms'
  | 'concurrency'
  | 'from-scratch'
  | 'ffi-vs-network'
  | 'architecture';

export type LanguageId =
  | 'sql'
  | 'python'
  | 'typescript'
  | 'spark'
  | 'rust'
  | 'cpp'
  | 'go'
  | 'swift'
  | 'kotlin';

/** Route metadata for one module page. Safe to import from site.ts. */
export interface ModulePageMeta {
  id: ModuleId;
  href: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  lede: string;
  summary: string;
}

export interface CodeSnippet {
  /** Display label, e.g. "Rust". */
  language: string;
  caption: string;
  code: string;
}

export interface ModuleSection {
  id: string;
  navLabel: string;
  title: string;
  /** Paragraphs, in reading order. */
  body: string[];
  snippets?: CodeSnippet[];
}

/** One module's teaching content, plus the trade-off review that closes it. */
export interface ModuleContent {
  sections: ModuleSection[];
  checkpoint: string[];
}

export interface LanguageProfile {
  id: LanguageId;
  name: string;
  /** One line on where the language sits in the curriculum. */
  role: string;
}

export interface EcosystemLink {
  label: string;
  href: string;
}

export interface EcosystemLibraryGroup {
  role: string;
  libraries: string[];
}

/** One row of the Module 7 ecosystem reference matrix. */
export interface LanguageEcosystem {
  languageId: LanguageId;
  nativeDocs: EcosystemLink[];
  standardApi: string[];
  libraryGroups: EcosystemLibraryGroup[];
  /** Why and when an architect reaches for this stack. */
  architectNote: string;
}

export interface AdrChoice {
  id: string;
  question: string;
  languageIds: LanguageId[];
  reach: string;
  because: string;
  avoidWhen: string;
}
