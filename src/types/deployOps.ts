/**
 * Types for the homepage DeployOps section.
 *
 * Icon-free by design (same convention as src/types/credentials.ts): the
 * consuming component resolves icon keys to lucide components, so the data
 * under src/constants/deployOps/ stays importable from non-React code
 * (e.g. RAG context) without pulling in UI dependencies.
 */

export type DeployOpsIconName =
  | 'GitCommitHorizontal'
  | 'Hammer'
  | 'FlaskConical'
  | 'Rocket'
  | 'Activity'
  | 'Undo2'
  | 'Database'
  | 'FlaskRound'
  | 'Cpu'
  | 'SlidersHorizontal'
  | 'Package'
  | 'MessageSquareText';

/** The software-delivery layer a topic belongs to. */
export type OpsLayer = 'swe' | 'ml' | 'llm';

export interface LifecycleStage {
  id: string;
  label: string;
  iconName: DeployOpsIconName;
  /** What this stage consumes and produces. */
  artifact: string;
  /** The check that must pass before moving on. */
  gate: string;
}

export interface DeterminismPillar {
  id: string;
  title: string;
  summary: string;
}

/** Parameterized snippet: placeholders are written as ${NAME} and listed in `variables`. */
export interface DeploySnippet {
  title: string;
  language: 'yaml';
  code: string;
}

export interface DeployStrategy {
  id: string;
  name: string;
  /** One-line characterization shown on the strategy tab. */
  tagline: string;
  useWhen: string;
  rollback: string;
  resourceCost: string;
  risk: string;
  /** Honest caveat displayed with the strategy (side effects, downtime, etc.). */
  caveat: string;
  /** Names every ${PLACEHOLDER} used across the snippets. */
  variables: readonly string[];
  snippets: readonly DeploySnippet[];
}

/** One AI/ML/LLMOps topic: the SWE principle it extends and where determinism breaks. */
export interface DeterminismCard {
  id: string;
  title: string;
  layer: OpsLayer;
  iconName: DeployOpsIconName;
  swePrinciple: string;
  extension: string;
  tools: readonly string[];
  /** Trade-offs worth stating explicitly (memory, communication, latency, cost). */
  tradeoffs: readonly string[];
  breaksWhere: string;
}

export interface DeterminismTopicGroup {
  id: string;
  label: string;
  cards: readonly DeterminismCard[];
}

export interface ParadigmRow {
  dimension: string;
  devops: string;
  mlops: string;
  llmops: string;
}

export interface DeterminismSpectrumStep {
  id: string;
  label: string;
  example: string;
  guarantee: string;
}

/** Where a book's takeaways were derived from. None is read from book text. */
export type BookBasis = 'toc' | 'publisher-description' | 'author-repo';
export type BookStatus = 'published' | 'early-release';
export type BookPublisher = "O'Reilly" | 'Manning';

export interface Book {
  id: string;
  title: string;
  authors: string;
  publisher: BookPublisher;
  status: BookStatus;
  layer: OpsLayer;
  url: string;
  basis: BookBasis;
  /** low/medium: how firmly the takeaways are grounded. */
  confidence: 'low-medium' | 'medium';
  takeaways: readonly [string, string, string];
  /** Present only when the identifier is a real ISBN. */
  isbn?: string;
  note?: string;
}

export interface BridgeBook {
  id: string;
  title: string;
  authors: string;
  year: number;
  isbn: string;
  reason: string;
}

export interface RepoProofItem {
  id: string;
  claim: string;
  evidencePath: string;
}
