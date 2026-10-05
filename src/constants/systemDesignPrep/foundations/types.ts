import type { SweCompassLifecycleStage } from '../sweCompassLifecycle';

/** Anchor ids of the 3 Foundations sub-sections — typed so every cross-link
 *  between them (e.g. a DE undercurrent pointing back at the architecture
 *  sub-section) fails `tsc` if an id is renamed. */
export type FoundationsSubsectionId =
  | 'foundations-software-engineering'
  | 'foundations-software-architecture'
  | 'foundations-data-engineering';

/** A cross-link to another section already on this page — used instead of
 *  re-explaining a concept that section already owns. */
export interface FoundationsCrossLink {
  label: string;
  href: string;
}

export interface SoftwareEngineeringFundamental {
  id: string;
  label: string;
  summary: string;
  /** Interview-oriented elaboration — this page's synthesis, not a quote. */
  detail: string;
  /** Chapter(s) of Schutta & Vega's book this fundamental is drawn from —
   *  empty when it comes from the book's stated themes rather than one chapter. */
  chapters: number[];
  /** SWE Compass stages (= question-bank category ids) where it applies. */
  appliesTo: SweCompassLifecycleStage[];
  crossLink?: FoundationsCrossLink;
}

export interface ArchitectureLaw {
  id: string;
  statement: string;
  implication: string;
}

export interface ArchitectureConcept {
  id: string;
  label: string;
  summary: string;
  detail: string;
  chapters: number[];
  crossLink?: FoundationsCrossLink;
}

export interface ArchitectureStyle {
  id: string;
  label: string;
  chapter: number;
  /** Partitioning shape: by technical layer, or by business domain. */
  partitioning: 'technical' | 'domain';
  reachForItWhen: string;
  watchOutFor: string;
}

/** Visual tone used by the rebuilt lifecycle figure — mapped to literal
 *  Tailwind classes in the diagram component, never interpolated. */
export type LifecycleTone = 'rose' | 'emerald' | 'violet' | 'sky' | 'zinc' | 'amber' | 'purple' | 'blue' | 'yellow' | 'teal' | 'pink' | 'orange';

export type DataEngineeringStageId = 'generation' | 'storage' | 'ingestion' | 'transformation' | 'serving';

export interface DataEngineeringStage {
  id: DataEngineeringStageId;
  label: string;
  /** One-liner — also the stage summary the Development Lifecycles card renders. */
  summary: string;
  detail: string;
  keyQuestions: string[];
  chapter: number;
  /** Where the stage sits in the figure: the upstream source, the pipeline
   *  row, or the foundation layer every pipeline stage reads/writes. */
  layer: 'source' | 'pipeline' | 'foundation';
  tone: LifecycleTone;
}

export type DataEngineeringUndercurrentId =
  | 'security'
  | 'data-management'
  | 'dataops'
  | 'data-architecture'
  | 'orchestration'
  | 'software-engineering';

export interface DataEngineeringUndercurrent {
  id: DataEngineeringUndercurrentId;
  label: string;
  summary: string;
  keyPractices: string[];
  tone: LifecycleTone;
  /** The Foundations sub-section that covers the same ground from the
   *  software side — rendered as a "See also" link. */
  relatedSubsectionId?: FoundationsSubsectionId;
}

export interface DataEngineeringOutput {
  id: string;
  label: string;
  summary: string;
}
