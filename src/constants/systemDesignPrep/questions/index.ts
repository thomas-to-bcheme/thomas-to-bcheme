import type { QuestionCategoryId, SystemDesignQuestion } from './types';
import { SWE_COMPASS_LIFECYCLE_STAGES } from '../sweCompassLifecycle';
import { DESIGN_QUESTIONS } from './design';
import { DATA_QUESTIONS } from './data';
import { MODEL_QUESTIONS } from './model';
import { BACKEND_QUESTIONS } from './backend';
import { FRONTEND_QUESTIONS } from './frontend';
import { OPS_QUESTIONS } from './ops';
import { COMPONENTS_OF_SYSTEM_DESIGN_QUESTIONS } from './components';

export type { SystemDesignQuestion, QuestionCategoryId, ApproachOption, ImplementationNote } from './types';

// Aggregates all 6 lifecycle-stage files, in the fixed reading order the
// page renders them in (matches the SWE Compass's end-to-end axis
// direction: design -> data -> model -> backend -> frontend -> ops) — the
// single source of truth SystemDesignQuestionsSection reads from.
export const SYSTEM_DESIGN_QUESTIONS: SystemDesignQuestion[] = [
  ...DESIGN_QUESTIONS,
  ...DATA_QUESTIONS,
  ...MODEL_QUESTIONS,
  ...BACKEND_QUESTIONS,
  ...FRONTEND_QUESTIONS,
  ...OPS_QUESTIONS,
];

// Separate from SYSTEM_DESIGN_QUESTIONS (which drives the category-filtered
// rendering in SystemDesignQuestionsSection) — this wider pool exists only
// so SystemDesignQuestionCard's ripplesInto lookup can resolve links to/from
// the Components of System Design section without double-rendering those
// cards inside the category-filtered question bank.
export const RIPPLE_LOOKUP_QUESTIONS: SystemDesignQuestion[] = [
  ...SYSTEM_DESIGN_QUESTIONS,
  ...COMPONENTS_OF_SYSTEM_DESIGN_QUESTIONS,
];

export interface QuestionCategory {
  id: QuestionCategoryId;
  label: string;
  description: string;
}

const CATEGORY_DESCRIPTIONS: Record<QuestionCategoryId, string> = {
  design: 'Before any implementation detail — what shape is this system, and who owns each piece of it?',
  data: 'What guarantees does this data actually need — and what do you trade away to get them?',
  model: 'The extra layer of decisions a model in production adds on top of standard system design.',
  backend: 'How do components talk to each other, and to the client, on what timing?',
  frontend: 'Where does rendering and interactive state actually need to live?',
  ops: 'Where does this run, on what shape of infrastructure, and how does it scale?',
};

export const SYSTEM_DESIGN_CATEGORIES: QuestionCategory[] = SWE_COMPASS_LIFECYCLE_STAGES.map((stage) => ({
  id: stage.id,
  label: stage.label,
  description: CATEGORY_DESCRIPTIONS[stage.id],
}));
