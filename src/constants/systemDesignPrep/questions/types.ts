/**
 * Shared shape for every entry in the System Design question bank
 * (design.ts, data.ts, model.ts, backend.ts, frontend.ts, ops.ts),
 * aggregated by questions/index.ts.
 *
 * `axes` tags each question with which real SWE Compass axis/axes it
 * touches (see src/components/features/SweCompassDiagram.tsx) — this is an
 * organizing lens applied on top of the question/cascade structure below,
 * not a redefinition of the Compass itself.
 */
import type { SweCompassAxis } from '@/components/features/SweCompassDiagram';
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
  axes: SweCompassAxis[];
  question: string;
  clarifyingSubQuestions: string[];
  approachOptions: ApproachOption[];
  implementationNotes: ImplementationNote[];
  /** ids of other SystemDesignQuestion entries this decision ripples into. */
  ripplesInto: string[];
  /** Whether this question was transcribed/adapted from the source
   *  Excalidraw boards, or is original synthesis filling a confirmed gap. */
  sourceNote: 'board' | 'synthesized';
}
