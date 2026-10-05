/**
 * Types and display-order constants for the /swe-de section.
 *
 * Client components import from this file only — never from the registry
 * barrel — so the book registry and topic content stay server-side
 * (enforced by scripts/verifySweDe.ts).
 */

export type BookId =
  | 'fundamentals-of-data-engineering'
  | 'fundamentals-of-software-engineering'
  | 'fundamentals-of-software-architecture'
  | 'dive-into-systems'
  | 'understanding-software-dynamics'
  | 'systems-performance'
  | 'ai-systems-performance-engineering'
  | 'designing-data-intensive-applications'
  | 'database-internals'
  | 'data-mesh'
  | 'data-management-at-scale'
  | 'learning-sql'
  | 'postgresql-query-optimization'
  | 'high-performance-mysql'
  | 'data-warehouse-toolkit'
  | 'seven-databases'
  | 'data-pipelines-pocket-reference'
  | 'learning-spark'
  | 'spark-definitive-guide'
  | 'high-performance-spark'
  | 'nlp-with-spark-nlp'
  | 'streaming-systems'
  | 'kafka-definitive-guide'
  | 'building-event-driven-microservices'
  | 'think-distributed-systems'
  | 'designing-distributed-systems'
  | 'building-resilient-distributed-systems'
  | 'building-distributed-applications-that-work'
  | 'distributed-ai-systems'
  | 'kubernetes-up-and-running'
  | 'kubernetes-patterns'
  | 'data-pipelines-with-airflow'
  | 'data-engineering-for-multimodal-ai'
  | 'redefining-data-engineering-with-ai'
  | 'software-engineering-at-google'
  | 'pragmatic-programmer'
  | 'release-it'
  | 'working-effectively-with-legacy-code';

export type BookTrack =
  | 'frame'
  | 'hardware'
  | 'architecture'
  | 'storage-sql'
  | 'pipelines'
  | 'streaming'
  | 'distributed'
  | 'orchestration'
  | 'ai-era'
  | 'software-craft';

export type ThinkingLevel = 'hardware' | 'application' | 'distributed';

export interface OreillyBook {
  id: BookId;
  title: string;
  /** e.g. "2nd ed." — omitted for first editions. */
  edition?: string;
  /** null while the book is in Early Release with no final date. */
  year: number | null;
  authors: string[];
  publisher: string;
  track: BookTrack;
  /** O'Reilly Learning URL segments: /library/view/{slug}/{oreillyId}/ */
  slug: string;
  oreillyId: string;
  /** null when O'Reilly lists the title under a non-ISBN id. */
  isbn13: string | null;
  /** Why this book is on the path — one sentence, in terms of what it unlocks. */
  whyRead: string;
  /**
   * True when the ISBN is verified but no live O'Reilly page could be
   * confirmed yet (e.g. a Manning early-access title) — rendered without a link.
   */
  isListingPending?: boolean;
}

export type ReadingStageKind = 'frame' | ThinkingLevel | 'platform' | 'craft';

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

export type AssessmentVerdict = 'keeps' | 'gap';

export interface PathAssessmentItem {
  id: string;
  verdict: AssessmentVerdict;
  title: string;
  detail: string;
  /** Books that close the gap (or that the strength rests on). */
  bookIds: BookId[];
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

/** One first-principles topic, argued in North Star order. */
export interface FirstPrinciplesTopic {
  id: string;
  /** Short label for the jump-pill nav. */
  navLabel: string;
  level: ThinkingLevel;
  title: string;
  /** One line shown while the topic is collapsed. */
  summary: string;
  what: string;
  why: string;
  how: string[];
  comparison?: ComparisonTable;
  sourceBookIds: BookId[];
}

export interface LevelPageMeta {
  id: ThinkingLevel;
  href: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  lede: string;
  /** Card copy on the overview. */
  summary: string;
}

export const BOOK_TRACK_ORDER: BookTrack[] = [
  'frame',
  'hardware',
  'architecture',
  'storage-sql',
  'pipelines',
  'streaming',
  'distributed',
  'orchestration',
  'ai-era',
  'software-craft',
];

export const BOOK_TRACK_LABELS: Record<BookTrack, string> = {
  frame: 'Frame',
  hardware: 'Hardware',
  architecture: 'Architecture',
  'storage-sql': 'Storage + SQL',
  pipelines: 'Pipelines',
  streaming: 'Streaming + Events',
  distributed: 'Distributed Systems',
  orchestration: 'Orchestration',
  'ai-era': 'AI-Era Data Engineering',
  'software-craft': 'Software Craft',
};

export const READING_STAGE_KIND_LABELS: Record<ReadingStageKind, string> = {
  frame: 'Frame',
  hardware: 'Hardware',
  application: 'Application',
  distributed: 'Distributed',
  platform: 'Platform',
  craft: 'Software craft',
};

export const OREILLY_LIBRARY_BASE_URL = 'https://www.oreilly.com/library/view';
