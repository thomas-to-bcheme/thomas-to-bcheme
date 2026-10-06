import type { BookId, ReadingStage } from './types';

/** If you read only three: breadth on building with models, the shared Observe stage, then the lifecycle for LLMs. */
export const START_HERE_PATH: BookId[] = ['ai-engineering', 'observability-engineering', 'llmops'];

/**
 * The staged reading path. Each stage builds on the previous one and ends on
 * something you can now explain. `kind` decides which page shows the stage:
 * 'foundations' appears on the overview and both specializations, 'devops' and
 * 'ai-llm-mlops' on their own page, and 'consolidation' on the overview.
 */
export const READING_STAGES: ReadingStage[] = [
  {
    id: 'observe-foundation',
    stepNumber: 0,
    label: 'Foundations: observability',
    kind: 'foundations',
    bookIds: ['observability-engineering'],
    outcome:
      'Why monitoring known failures is not enough, and how wide, queryable telemetry lets you debug a system you did not plan for.',
  },
  {
    id: 'devops-why',
    stepNumber: 1,
    label: 'DevOps: why the loop looks like this',
    kind: 'devops',
    bookIds: ['phoenix-project', 'accelerate', 'devops-handbook'],
    outcome:
      'Why flow, feedback and learning matter, which delivery practices move outcomes, and how a pipeline turns version control into a safe release.',
  },
  {
    id: 'devops-run',
    stepNumber: 2,
    label: 'DevOps: running it',
    kind: 'devops',
    bookIds: ['site-reliability-engineering', 'kubernetes-up-and-running'],
    outcome:
      'How SLOs and error budgets gate change, and how a reconcile loop keeps declared and actual state aligned.',
  },
  {
    id: 'ml-bridge',
    stepNumber: 3,
    label: 'MLOps bridge: the lifecycle before LLMs',
    kind: 'ai-llm-mlops',
    bookIds: ['reliable-machine-learning', 'designing-machine-learning-systems', 'practical-mlops'],
    outcome:
      'How data, training, deployment and drift monitoring extend the software lifecycle, and where reliability engineering meets ML.',
  },
  {
    id: 'ai-build',
    stepNumber: 4,
    label: 'Building AI applications',
    kind: 'ai-llm-mlops',
    bookIds: ['ai-engineering', 'llmops', 'llms-in-production'],
    outcome:
      'How to choose between prompting, RAG and finetuning, and what it takes to run an LLM application in production.',
  },
  {
    id: 'ai-evals',
    stepNumber: 5,
    label: 'Evals: the CI gate for probabilistic systems',
    kind: 'ai-llm-mlops',
    bookIds: ['evals-for-ai-engineers'],
    outcome:
      'How to turn failures seen in real traces into metrics, and how to check that an LLM-as-judge deserves trust.',
  },
  {
    id: 'ai-serving',
    stepNumber: 6,
    label: 'Serving and optimization',
    kind: 'ai-llm-mlops',
    bookIds: ['hands-on-llm-serving'],
    outcome:
      'Why serving cost and latency come from prefill and decode, and which optimizations buy throughput at what cost.',
  },
  {
    id: 'ai-agents',
    stepNumber: 7,
    label: 'Agents: the harness around the model',
    kind: 'ai-llm-mlops',
    bookIds: ['harness-engineering'],
    outcome:
      'Why the runtime around an agent, not the model alone, determines reliability, and how boundaries and telemetry fit in.',
  },
  {
    id: 'consolidate',
    stepNumber: 8,
    label: 'Consolidate',
    kind: 'consolidation',
    bookIds: ['ai-engineering-interviews'],
    outcome:
      'Explain the trade-offs across the whole stack aloud, from pretrained models and RAG to evaluation and theory.',
  },
];

/** Stages shown on a specialization page: its own plus the shared foundations. */
export function getStagesForLevel(level: 'devops' | 'ai-llm-mlops'): ReadingStage[] {
  return READING_STAGES.filter((stage) => stage.kind === level || stage.kind === 'foundations');
}
