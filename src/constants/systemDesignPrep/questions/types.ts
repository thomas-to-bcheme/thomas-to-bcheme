/**
 * Shared shape for every entry in the System Design question bank
 * (design.ts, data.ts, model.ts, backend.ts, frontend.ts, ops.ts),
 * aggregated by questions/index.ts.
 */
import type { SweCompassLifecycleStage } from '../sweCompassLifecycle';

export interface ApproachOption {
  label: string;
  whenToUse: string;
  tradeoffs: string;
}

export interface ImplementationNote {
  consideration: string;
  dependsOn: string;
}

export type { SweCompassLifecycleStage as QuestionCategoryId } from '../sweCompassLifecycle';

type QuestionCategoryId = SweCompassLifecycleStage;

export interface SystemDesignQuestion {
  id: string;
  category: QuestionCategoryId;
  question: string;
  clarifyingSubQuestions: string[];
  approachOptions: ApproachOption[];
  implementationNotes: ImplementationNote[];
  /** ids of other SystemDesignQuestion entries this decision ripples into. */
  ripplesInto: string[];
  /** Whether this question was transcribed/adapted from the source
   *  Excalidraw boards, or is original synthesis filling a confirmed gap. */
  sourceNote: 'board' | 'synthesized';
  /** Optional — renders a small divider + micro-label before this card,
   *  marking the start of a labeled subsection within a category's flat
   *  question list (e.g. "Big Data" within Data). Generic and reusable:
   *  any category's question can opt in, not specific to one category. */
  subsectionLabel?: string;
  /** Optional 1-sentence description shown under subsectionLabel. Only
   *  meaningful when subsectionLabel is also set. */
  subsectionDescription?: string;
}
