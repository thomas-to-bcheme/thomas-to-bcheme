import type { QuestionCategoryId, SystemDesignQuestion } from './types';
import { SWE_COMPASS_LIFECYCLE_STAGES } from '../sweCompassLifecycle';
import { DESIGN_QUESTIONS } from './design';
import { DATA_QUESTIONS } from './data';
import { MODEL_QUESTIONS } from './model';
import { BACKEND_QUESTIONS } from './backend';
import { FRONTEND_QUESTIONS } from './frontend';
import { OPS_QUESTIONS } from './ops';

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

export interface QuestionCategory {
  id: QuestionCategoryId;
  label: string;
  guidingQuestions: string[];
}

// Universal, generic conceptual questions per category — the breadth pass a
// reader works through before the specific decision-cascade cards below (the
// depth pass). Design stays deliberately non-functional, grounding every
// later decision in the core characteristics (see coreCharacteristics.ts);
// Data through Ops then work through what each layer adds functionally on
// top of that baseline. Checked against every question-bank entry's exact
// `question` text to avoid verbatim duplication.
const CATEGORY_GUIDING_QUESTIONS: Record<QuestionCategoryId, string[]> = {
  design: [
    'Before any implementation detail — what shape is this system, and who owns each piece of it?',
    'Which of the core characteristics above matters most for this system — and which is it explicitly willing to sacrifice?',
    "What's the blast radius if one piece of this fails — does the design contain that, or let it cascade?",
  ],
  data: [
    'What guarantees does this data actually need — and what do you trade away to get them?',
    'Does every reader need to agree on the same value at the same moment, or can different parts of the system tolerate seeing a slightly different, slightly older answer?',
    'Is the shape of this data fixed and known ahead of time, or does it vary enough that forcing one rigid schema on it would fight the data itself?',
    "Once a single database can't hold or serve all of it, does it get reorganized for a different purpose — reporting, search, historical analysis — or spread wider: sharded, cached, queued, or streamed?",
  ],
  model: [
    'What does putting a model into production add on top of a standard system design — and what stays exactly the same?',
    "How do you know this model is good enough to ship — and how do you know it's still good after the world it was trained on has moved on?",
    "Does a prediction need to be computed the instant it's asked for, or can it be precomputed ahead of time and just looked up?",
  ],
  backend: [
    'How do components talk to each other, and to the client, on what timing?',
    'Once something changes on the backend, does everyone who cares find out immediately, or only when they next ask?',
    'When one component fails mid-call, does the caller wait and retry, fail loudly right away, or never find out at all?',
  ],
  frontend: [
    'Where does rendering and interactive state actually need to live?',
    "Is this the same for every visitor, or does it depend on who's asking?",
    'Does the data this needs get fetched once, on the server, before anything renders — or does the client fetch (and possibly refetch) it after the page has already loaded?',
  ],
  ops: [
    'Where does this run, on what shape of infrastructure, and how does it scale?',
    "Once this is built, how does it actually get deployed into a live, running production environment — and what has to be verified before that's allowed to happen?",
    "Once this is live, what's actually being logged, monitored, and alerted on — and who's watching it?",
    "What's the specific, measurable threshold that separates 'healthy' from 'broken' — a technical metric like latency or error rate, or a business KPI — and do you actually know which one matters here?",
  ],
};

export const SYSTEM_DESIGN_CATEGORIES: QuestionCategory[] = SWE_COMPASS_LIFECYCLE_STAGES.map((stage) => ({
  id: stage.id,
  label: stage.label,
  guidingQuestions: CATEGORY_GUIDING_QUESTIONS[stage.id],
}));
