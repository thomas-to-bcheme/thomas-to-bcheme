import { GitBranch, Database, Brain, Infinity as InfinityIcon, type LucideIcon } from 'lucide-react';

// Background on the 4 named engineering lifecycles this page's Design→Ops
// stage ordering, Model-stage framing, and Ops-stage framing are all read
// against — each already cited in externalReferences.ts's "lifecycles"
// group, but only as one-line citation blurbs until now. This file promotes
// that content into real stage-by-stage depth, then abstracts the pattern
// all 4 share (LIFECYCLE_SYNTHESIS_STEPS below) as the page's closing,
// domain-agnostic mental model.
export type LifecycleId = 'sdlc' | 'data-engineering' | 'ml-mlops' | 'devops';

export interface LifecycleStage {
  label: string;
  summary: string;
}

export interface DevelopmentLifecycle {
  id: LifecycleId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  summary: string;
  stages: LifecycleStage[];
  /** Continuous concerns that don't fit the sequential stage list — e.g. the
   *  Data Engineering Lifecycle's "undercurrents." Omitted where none apply. */
  crossCuttingConcerns?: string[];
  /** id of the matching citation in externalReferences.ts — looked up at
   *  render time rather than duplicating title/url here, per DATA INTEGRITY. */
  sourceReferenceId: string;
}

export const DEVELOPMENT_LIFECYCLES: DevelopmentLifecycle[] = [
  {
    id: 'sdlc',
    label: 'Software Development Lifecycle (SDLC)',
    shortLabel: 'SDLC',
    icon: GitBranch,
    summary:
      "The lifecycle any shipped software moves through, independent of what's inside it — this page's own Design→Ops stage ordering is the same shape, read as system-design decisions instead of process steps.",
    stages: [
      { label: 'Plan', summary: 'Scope the problem and gather requirements before any design work starts.' },
      { label: 'Design', summary: 'Turn requirements into an architecture — the components and interfaces Build will implement.' },
      { label: 'Build', summary: 'Write the code that implements the design.' },
      { label: 'Test', summary: 'Verify the build against the requirements, functional and non-functional both.' },
      { label: 'Deploy', summary: 'Release the tested build into production.' },
      { label: 'Maintain', summary: 'Operate, patch, and evolve the shipped system — feeding back into the next Plan.' },
    ],
    sourceReferenceId: 'aws-sdlc-overview',
  },
  {
    id: 'data-engineering',
    label: 'Data Engineering Lifecycle',
    shortLabel: 'Data Eng',
    icon: Database,
    summary:
      "The lifecycle raw data moves through before it's trustworthy enough for a model or a dashboard to consume — the ML/MLOps Lifecycle below assumes this one is already built and automated.",
    stages: [
      { label: 'Generation', summary: 'Data is produced at the source — application events, third-party APIs, user input.' },
      { label: 'Storage', summary: 'Landed somewhere durable and queryable, at whatever tier matches its access pattern.' },
      { label: 'Ingestion', summary: 'Moved from source into the pipeline, in batch or as a stream.' },
      { label: 'Transformation', summary: 'Cleaned, joined, and reshaped into the form downstream consumers actually need.' },
      { label: 'Serving', summary: 'Made available to whatever consumes it next — a dashboard, an application, or a model.' },
    ],
    crossCuttingConcerns: ['Security', 'Orchestration', 'DataOps'],
    sourceReferenceId: 'data-eng-lifecycle-fundamentals',
  },
  {
    id: 'ml-mlops',
    label: 'ML / MLOps Lifecycle',
    shortLabel: 'ML/MLOps',
    icon: Brain,
    summary:
      "The Model stage's own loop, nested inside a standard CI/CD pipeline rather than running parallel to it — it assumes the Data Engineering Lifecycle's pipelines already exist.",
    stages: [
      { label: 'Data', summary: 'Pull in the training data the Data Engineering Lifecycle already produced and served.' },
      { label: 'Train', summary: 'Fit the model against that data.' },
      { label: 'Evaluate', summary: 'Score the trained model against held-out data and the metric that actually matters for the product.' },
      { label: 'Deploy', summary: 'Ship the model behind the deployment risk ladder — shadow, canary, then full rollout.' },
      { label: 'Monitor', summary: "Watch for drift and staleness once it's live, closing the loop back to Data when the world has moved on." },
    ],
    sourceReferenceId: 'gcp-mlops-lifecycle',
  },
  {
    id: 'devops',
    label: 'DevOps Lifecycle',
    shortLabel: 'DevOps',
    icon: InfinityIcon,
    summary:
      "The operational loop wrapped around everything above — an \"infinite loop\" because Monitor feeds directly back into the next Plan, not because it ever stops.",
    stages: [
      { label: 'Plan', summary: "Define the work — the same idea as SDLC's Plan, scoped to a single change." },
      { label: 'Code', summary: 'Write and review the change.' },
      { label: 'Build', summary: 'Compile and package it into a deployable artifact.' },
      { label: 'Test', summary: 'Run automated tests against the artifact before it goes anywhere near production.' },
      { label: 'Release', summary: 'Mark the artifact ready — decoupled from Deploy so a release can be gated independently.' },
      { label: 'Deploy', summary: 'Push the artifact into production, via whichever deployment strategy fits the risk.' },
      { label: 'Operate', summary: 'Keep it running — the day-to-day of production ownership.' },
      { label: 'Monitor', summary: 'Watch it for the signal that starts the next Plan.' },
    ],
    sourceReferenceId: 'devops-lifecycle-overview',
  },
];

export interface LifecycleSynthesisMapping {
  lifecycleId: LifecycleId;
  /** Free text, not always a single stage label — some lifecycles fold a
   *  step into a cross-cutting concern, or don't name it as a discrete stage
   *  at all. Honest gaps stay visible rather than being forced into a false
   *  1:1 mapping. */
  stageLabel: string;
}

export interface LifecycleSynthesisStep {
  id: string;
  label: string;
  summary: string;
  /** One entry per DEVELOPMENT_LIFECYCLES id, same order. */
  mappings: LifecycleSynthesisMapping[];
}

// The closing abstraction: 6 lifecycle-agnostic steps every lifecycle above
// repeats some version of. This is the "guiding mental model" — what to
// reach for, independent of which of the 4 domains a given problem sits in.
export const LIFECYCLE_SYNTHESIS_STEPS: LifecycleSynthesisStep[] = [
  {
    id: 'define-scope',
    label: 'Define / scope',
    summary: "Understand what's being built and why, before committing to how.",
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: 'Plan' },
      { lifecycleId: 'data-engineering', stageLabel: 'Generation & Storage' },
      { lifecycleId: 'ml-mlops', stageLabel: 'Data' },
      { lifecycleId: 'devops', stageLabel: 'Plan' },
    ],
  },
  {
    id: 'build-transform',
    label: 'Build / transform',
    summary: 'Turn the plan into the actual artifact — code, a transformed dataset, or a trained model.',
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: 'Design + Build' },
      { lifecycleId: 'data-engineering', stageLabel: 'Ingestion + Transformation' },
      { lifecycleId: 'ml-mlops', stageLabel: 'Train' },
      { lifecycleId: 'devops', stageLabel: 'Code + Build' },
    ],
  },
  {
    id: 'validate',
    label: 'Validate',
    summary: "Check the artifact against the requirement before it ships — non-negotiable even where it isn't named as its own stage.",
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: 'Test' },
      { lifecycleId: 'data-engineering', stageLabel: '— folded into the DataOps undercurrent, not a discrete stage' },
      { lifecycleId: 'ml-mlops', stageLabel: 'Evaluate' },
      { lifecycleId: 'devops', stageLabel: 'Test' },
    ],
  },
  {
    id: 'ship-release',
    label: 'Ship / release',
    summary: 'Make the artifact available to whatever consumes it next.',
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: 'Deploy' },
      { lifecycleId: 'data-engineering', stageLabel: 'Serving' },
      { lifecycleId: 'ml-mlops', stageLabel: 'Deploy' },
      { lifecycleId: 'devops', stageLabel: 'Release + Deploy' },
    ],
  },
  {
    id: 'operate-observe',
    label: 'Operate / observe',
    summary: "Keep it running, and watch it — the step that turns \"shipped\" into \"in production.\"",
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: 'Maintain' },
      { lifecycleId: 'data-engineering', stageLabel: 'Security / Orchestration / DataOps undercurrents, continuously' },
      { lifecycleId: 'ml-mlops', stageLabel: 'Monitor' },
      { lifecycleId: 'devops', stageLabel: 'Operate + Monitor' },
    ],
  },
  {
    id: 'learn-iterate',
    label: 'Learn / iterate',
    summary: 'Feed what was learned back into the next Define/scope — none of these lifecycles are actually linear.',
    mappings: [
      { lifecycleId: 'sdlc', stageLabel: '— implicit: Maintain loops back to Plan' },
      { lifecycleId: 'data-engineering', stageLabel: '— not named as a discrete stage in the source material' },
      { lifecycleId: 'ml-mlops', stageLabel: '— implicit: Monitor loops back to Data on drift' },
      { lifecycleId: 'devops', stageLabel: '— implicit: the "infinite loop" itself' },
    ],
  },
];
