/**
 * Types and display-order constants for the /deployops section.
 *
 * Client components import from this file only -- never from the registry
 * barrel -- so book and topic content stays server-side (enforced by
 * scripts/verifyDeployOps.ts). Mirrors src/constants/sweDe/types.ts.
 */

/** The nine stages of the delivery lifecycle, shared by every specialization. */
export type StageId =
  | 'define'
  | 'version'
  | 'build'
  | 'verify'
  | 'release'
  | 'deploy'
  | 'operate'
  | 'observe'
  | 'learn';

/** The two specialization pages beneath the overview. */
export type LevelId = 'devops' | 'ai-llm-mlops';

export type BookId =
  | 'ai-engineering'
  | 'llmops'
  | 'evals-for-ai-engineers'
  | 'observability-engineering'
  | 'llms-in-production'
  | 'hands-on-llm-serving'
  | 'ai-engineering-interviews'
  | 'harness-engineering'
  | 'designing-machine-learning-systems'
  | 'reliable-machine-learning'
  | 'practical-mlops'
  | 'accelerate'
  | 'site-reliability-engineering'
  | 'phoenix-project'
  | 'devops-handbook'
  | 'kubernetes-up-and-running';

export type BookTrack =
  | 'devops-practice'
  | 'observability'
  | 'ml-bridge'
  | 'ai-engineering'
  | 'evals'
  | 'serving'
  | 'agents'
  | 'interview';

export const BOOK_TRACK_ORDER: readonly BookTrack[] = [
  'devops-practice',
  'observability',
  'ml-bridge',
  'ai-engineering',
  'evals',
  'serving',
  'agents',
  'interview',
];

export const BOOK_TRACK_LABELS: Record<BookTrack, string> = {
  'devops-practice': 'DevOps practice and culture',
  observability: 'Observability',
  'ml-bridge': 'MLOps bridge',
  'ai-engineering': 'Building AI applications',
  evals: 'Evals',
  serving: 'Serving and optimization',
  agents: 'Agents',
  interview: 'Consolidation',
};

export type BookPublisher = "O'Reilly" | 'Manning' | 'IT Revolution';
export type BookStatus = 'published' | 'early-release';
/** Where a book's takeaways were derived from. None is read from book text. */
export type BookBasis = 'toc' | 'publisher-description' | 'author-repo' | 'established-reputation';
export type BookConfidence = 'low-medium' | 'medium' | 'high';

export interface DeployOpsBook {
  id: BookId;
  title: string;
  /** e.g. "2nd ed." -- omitted for first editions. */
  edition?: string;
  /** null while the book has no final publication date. */
  year: number | null;
  authors: string[];
  publisher: BookPublisher;
  status: BookStatus;
  track: BookTrack;
  /** Publisher page; null when no publisher URL has been confirmed (rendered as plain text). */
  url: string | null;
  /** null when the listing uses a non-ISBN product id. */
  isbn13: string | null;
  /** Why this book is on the path -- one sentence, in terms of what it unlocks. */
  whyRead: string;
  /** Lifecycle stages the book most directly serves. */
  stageIds: StageId[];
  takeaways: string[];
  basis: BookBasis;
  confidence: BookConfidence;
  /** False for books outside the original eight-book list. */
  isCoreList: boolean;
  note?: string;
}

export type ReadingStageKind = 'foundations' | LevelId | 'consolidation';

export interface ReadingStage {
  id: string;
  stepNumber: number;
  label: string;
  kind: ReadingStageKind;
  /** Read in this order. */
  bookIds: BookId[];
  /** What you can explain once the stage is done. */
  outcome: string;
}

export interface LevelPageMeta {
  id: LevelId;
  href: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  lede: string;
  summary: string;
}

export interface LifecycleStage {
  id: StageId;
  stepNumber: number;
  label: string;
  /** The uncertainty the previous stage leaves open, which this stage closes. */
  problem: string;
  /** The property this stage exists to protect. */
  invariant: string;
  /** How the stage emerges when you grow from one person to many users. */
  derivation: string;
}

export interface LifecyclePrinciple {
  id: string;
  title: string;
  summary: string;
}

export interface DerivationStep {
  id: string;
  trigger: string;
  consequence: string;
}

export interface DeterminismSpectrumStep {
  id: string;
  label: string;
  example: string;
  guarantee: string;
}

export interface ParadigmRow {
  dimension: string;
  devops: string;
  mlops: string;
  llmops: string;
}

export interface ComparisonRow {
  id: string;
  label: string;
  /** One cell per entry in ComparisonTable.columns. */
  cells: string[];
}

export interface ComparisonTable {
  caption: string;
  /** Header for the row-label column. */
  rowHeader: string;
  columns: string[];
  rows: ComparisonRow[];
}

/** One first-principles topic, argued in what / why / how order. */
export interface FirstPrinciplesTopic {
  id: string;
  /** Short label for the jump-pill nav. */
  navLabel: string;
  level: LevelId;
  title: string;
  /** One line shown under the title. */
  summary: string;
  what: string;
  why: string;
  how: string[];
  /** Lifecycle stages this topic belongs to; links the specialization back to the overview. */
  stageIds: StageId[];
  /** Representative technologies, shown as tags. */
  tools?: string[];
  /** Where determinism, reproducibility or the guarantee stops holding. */
  breaksWhere?: string;
  comparison?: ComparisonTable;
  sourceBookIds: BookId[];
}

/** A named group of topics rendered as tabs or sections on a level page. */
export interface TermDefinition {
  id: string;
  term: string;
  definition: string;
  level: LevelId | 'shared';
}

export interface DeploySnippet {
  title: string;
  language: 'yaml';
  code: string;
}

export interface DeployStrategy {
  id: string;
  name: string;
  tagline: string;
  /** Why the strategy exists: the mechanism and the risk it controls. */
  how: string;
  useWhen: string;
  rollback: string;
  resourceCost: string;
  risk: string;
  caveat: string;
  /** Names every ${PLACEHOLDER} used across the snippets. */
  variables: readonly string[];
  snippets: readonly DeploySnippet[];
}
