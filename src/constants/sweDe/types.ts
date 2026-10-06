/**
 * Types and display-order constants for the /swe-de section.
 *
 * Client components import from this file only — never from the registry
 * barrel — so the book registry and topic content stay server-side
 * (enforced by scripts/verifySweDe.ts).
 */

import type {
  DataEngineeringStageId,
  DataEngineeringUndercurrentId,
  LifecycleTone,
} from '../systemDesignPrep/foundations/types';

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

export type ThinkingLevel = 'hardware' | 'application' | 'distributed' | 'pipelines';

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

/** Fields every fundamentals figure shares. `id` doubles as the DOM anchor, so it must not collide with a topic id. */
interface FigureBase {
  id: string;
  /** Accessible name of the whole figure — the text equivalent for screen readers. */
  label: string;
  caption: string;
  /** EXTERNAL_REFERENCES ids (official docs, specs, papers). */
  sourceIds?: string[];
  bookIds?: BookId[];
}

export interface FlowStep {
  id: string;
  label: string;
  /** One line under the label — what happens at this step. */
  detail?: string;
  tone: LifecycleTone;
}

/** One row of steps joined by arrows. Several lanes compare alternatives side by side (e.g. ETL vs ELT). */
export interface FlowLane {
  id: string;
  title: string;
  /** True when the steps are parallel items or alternatives, not a sequence — drawn without arrows. */
  isUnordered?: boolean;
  steps: FlowStep[];
}

export interface FlowFigureSpec extends FigureBase {
  kind: 'flow';
  lanes: FlowLane[];
}

/** One rung of a ladder. The bar length is proportional to `log10Value`, so values spanning many orders of magnitude stay readable. */
export interface LadderRung {
  id: string;
  label: string;
  /** What this tier is or why it costs what it does. */
  detail: string;
  /** log10 of the value in the figure's single unit (e.g. nanoseconds), used only to size the bar. */
  log10Value: number;
  /** Human-readable value shown beside the bar, e.g. "~100 ns". */
  valueLabel: string;
  tone: LifecycleTone;
}

export interface LadderFigureSpec extends FigureBase {
  kind: 'ladder';
  /** Names the scale, e.g. "Access latency (log scale)". */
  axisLabel: string;
  /** Ordered from first to last as they should read, top to bottom. */
  rungs: LadderRung[];
}

export interface StripCell {
  id: string;
  label: string;
  /** True for cells the operation touches; the rest are drawn dimmed. */
  isHighlighted?: boolean;
}

/** A row of adjacent cells, e.g. bytes on disk or pages in an index. */
export interface StripLane {
  id: string;
  title: string;
  note?: string;
  cells: StripCell[];
}

export interface StripsFigureSpec extends FigureBase {
  kind: 'strips';
  /** Says what highlighted cells mean, e.g. "Highlighted cells are read by the query". */
  legend: string;
  lanes: StripLane[];
}

export interface RooflinePoint {
  id: string;
  label: string;
  /** Arithmetic intensity: operations per byte moved. Placed on a log axis. */
  intensity: number;
}

/** Attainable performance = min(peak, bandwidth x intensity). All numbers are illustrative, never a benchmark. */
export interface RooflineFigureSpec extends FigureBase {
  kind: 'roofline';
  peakComputeLabel: string;
  bandwidthLabel: string;
  peakGflops: number;
  bandwidthGBs: number;
  points: RooflinePoint[];
}

export interface TriangleCorner {
  id: string;
  label: string;
  detail: string;
}

export interface TriangleMarker {
  id: string;
  label: string;
  /** Barycentric weights toward each corner, in corner order; must sum to 1. A higher weight sits nearer that corner. */
  weights: [number, number, number];
}

export interface TriangleFigureSpec extends FigureBase {
  kind: 'triangle';
  corners: [TriangleCorner, TriangleCorner, TriangleCorner];
  markers: TriangleMarker[];
}

export interface EventTimePoint {
  id: string;
  /** When the event happened, in minutes on the event-time axis. */
  eventTime: number;
  /** When the system processed it, in minutes on the processing-time axis. */
  processingTime: number;
}

/** Event time vs processing time: the gap is delay, and a watermark decides when a window is declared complete. */
export interface EventTimeFigureSpec extends FigureBase {
  kind: 'event-time';
  /** Window covers event times in (0, windowEnd]. */
  windowEnd: number;
  /** Processing time at which the watermark passes `windowEnd` and the window closes. */
  watermarkPassesAt: number;
  /** Both axes run 0..axisMax, in minutes. */
  axisMax: number;
  events: EventTimePoint[];
}

/** Discriminated on `kind`; each visual family adds one member here and one renderer in TopicFigure. */
export type FigureSpec =
  | FlowFigureSpec
  | LadderFigureSpec
  | StripsFigureSpec
  | RooflineFigureSpec
  | TriangleFigureSpec
  | EventTimeFigureSpec;

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
  /** Optional diagram of the mechanism; the comparison table stays as its text equivalent. */
  visual?: FigureSpec;
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

/** Day-to-day SWE/DE responsibility vs. a dedicated role elsewhere that a candidate should still understand. */
export type LifecycleOwnership = 'core' | 'partner';

interface LifecycleStakeholderBase {
  owner: LifecycleOwnership;
  /** Who is on the other side of the conversation. */
  stakeholders: string[];
  /** What to tell or ask them — the cross-functional contract at this point. */
  communicate: string[];
  /** Software engineering principles that apply here, downstream of the data. */
  swePrinciples: string[];
}

/** Keyed by the lifecycle's own ids so a rename fails `tsc` instead of silently orphaning an entry. */
export type LifecycleStakeholderEntry = LifecycleStakeholderBase &
  (
    | { kind: 'stage'; id: DataEngineeringStageId }
    | { kind: 'undercurrent'; id: DataEngineeringUndercurrentId }
    | { kind: 'output'; id: string }
  );

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
  pipelines: 'Pipelines',
  platform: 'Platform',
  craft: 'Software craft',
};

export const OREILLY_LIBRARY_BASE_URL = 'https://www.oreilly.com/library/view';
