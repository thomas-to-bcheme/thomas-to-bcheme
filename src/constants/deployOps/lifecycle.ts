import type {
  DerivationStep,
  DeterminismSpectrumStep,
  LifecyclePrinciple,
  LifecycleStage,
  ParadigmRow,
} from './types';

/**
 * The delivery lifecycle from first principles. Software is a claim ("this
 * change does what we want, for real users"), and a claim is worth something
 * only if it can be checked cheaply, repeated, and undone. Each stage exists
 * because the stage before it leaves one specific uncertainty open.
 *
 * Both specialization pages (DevOps, AI/LLM/MLOps) reuse these stage ids, so a
 * reader can follow one stage from the overview into either specialization.
 */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'define',
    stepNumber: 1,
    label: 'Define',
    problem: 'Without a target you cannot tell a good change from a bad one.',
    invariant: 'Shared intent and a testable definition of "done".',
    derivation: 'Before anything is built, someone has to say what success looks like in a way a check could confirm.',
  },
  {
    id: 'version',
    stepNumber: 2,
    label: 'Version',
    problem: 'Many people change the same system over time, and some changes turn out wrong.',
    invariant: 'Traceability: every state of the system can be named, compared and restored.',
    derivation: 'The moment a second person edits the same file, you need history, merging and the ability to revert.',
  },
  {
    id: 'build',
    stepNumber: 3,
    label: 'Build',
    problem: '"It works on my machine." Source plus its dependencies has to become one runnable thing.',
    invariant: 'Reproducibility: the same inputs produce the same artifact.',
    derivation: 'The moment a second machine runs the code, the environment becomes part of what you ship.',
  },
  {
    id: 'verify',
    stepNumber: 4,
    label: 'Verify',
    problem: 'A change can break things nobody thought to look at.',
    invariant: 'Feedback speed: wrong changes are caught in minutes, not weeks.',
    derivation: 'Once changes are frequent, checking by hand is skipped under pressure, so a machine must run the checks.',
  },
  {
    id: 'release',
    stepNumber: 5,
    label: 'Release',
    problem: 'Which exact artifact is "the one"? A name that can point at different things is not an identity.',
    invariant: 'Immutability and provenance: a released artifact never silently changes, and you know where it came from.',
    derivation: 'Once more than one verified build exists, you need an addressable, unchangeable record of which one is approved.',
  },
  {
    id: 'deploy',
    stepNumber: 6,
    label: 'Deploy',
    problem: 'Moving an artifact to where users are can cause an outage.',
    invariant: 'Blast-radius control: expose change gradually and be able to undo it quickly.',
    derivation: 'Once real users depend on the system, being wrong is expensive, so being wrong has to be small and reversible.',
  },
  {
    id: 'operate',
    stepNumber: 7,
    label: 'Operate',
    problem: 'Real load, scale and failure only happen in production, and machines fail on their own schedule.',
    invariant: 'Declared state: what is running matches what was intended, and drift is detected.',
    derivation: 'Running at scale means something is always failing, so the system must repair itself toward a written-down target.',
  },
  {
    id: 'observe',
    stepNumber: 8,
    label: 'Observe',
    problem: 'A running system is a black box you cannot fully verify before release.',
    invariant: 'Debuggability: you can ask new questions of production without shipping new code.',
    derivation: 'You cannot predict every failure, so you record rich context and keep it queryable.',
  },
  {
    id: 'learn',
    stepNumber: 9,
    label: 'Learn',
    problem: 'Observations that change nothing are wasted. The same failure will happen again.',
    invariant: 'The loop closes: each incident or surprise becomes a new check, default or definition of done.',
    derivation: 'Feeding what you observed back into the first stage is what makes it a loop instead of a line.',
  },
];

export const LIFECYCLE_PRINCIPLES: LifecyclePrinciple[] = [
  {
    id: 'declarative-versioned-state',
    title: 'Make state declarative and versioned',
    summary: 'What you want is written down and history-tracked, not remembered. Anything that exists only in someone\'s head or a console click cannot be reviewed, repeated or restored.',
  },
  {
    id: 'shrink-the-loop',
    title: 'Shrink the loop',
    summary: 'The shorter the time from change to feedback, the cheaper each mistake is. Most tooling in this lifecycle exists to shorten some part of that loop.',
  },
  {
    id: 'limit-the-blast-radius',
    title: 'Limit the blast radius',
    summary: 'Assume any change can be wrong, and make being wrong small and reversible: staged rollout, instant rollback, isolation between components.',
  },
];

/** "Derive it yourself": the lifecycle grows out of each new kind of scale. */
export const LIFECYCLE_DERIVATION: DerivationStep[] = [
  {
    id: 'one-person',
    trigger: 'One person, one file, one machine.',
    consequence: 'Nothing is needed. The author is the history, the build, the test and the operator.',
  },
  {
    id: 'second-person',
    trigger: 'A second person edits the same code.',
    consequence: 'Edits collide and mistakes need undoing: you need Version.',
  },
  {
    id: 'second-machine',
    trigger: 'The code has to run somewhere other than where it was written.',
    consequence: 'The environment becomes part of the product: you need Build, and a reproducible one.',
  },
  {
    id: 'growing-change-rate',
    trigger: 'Changes arrive faster than anyone can check by hand.',
    consequence: 'Checking must be automated, and each result must trace to an exact artifact: Verify, then Release.',
  },
  {
    id: 'real-users',
    trigger: 'People depend on the system staying up.',
    consequence: 'Change must be gradual and reversible, and failure must be visible: Deploy, Operate, Observe.',
  },
  {
    id: 'repeat-failures',
    trigger: 'The same surprise happens twice.',
    consequence: 'What was learned has to flow back into the definition and the checks: Learn, which closes the loop.',
  },
];

/** Ordered from strongest to weakest guarantee: this is where each layer lives. */
export const DETERMINISM_SPECTRUM: DeterminismSpectrumStep[] = [
  {
    id: 'bit-exact',
    label: 'Bit-exact',
    example: 'Builds and deploys',
    guarantee: 'Same inputs, same artifact (the same digest). You can assert equality.',
  },
  {
    id: 'seeded',
    label: 'Seeded-reproducible',
    example: 'Model training',
    guarantee:
      'Fix the random seed, the data snapshot and the hardware layout and a rerun lands close to the original result, within a tolerance. Exact equality is usually lost because parallel floating-point arithmetic can add the same numbers in a different order.',
  },
  {
    id: 'statistical',
    label: 'Statistically stable',
    example: 'LLM outputs and evals',
    guarantee:
      'Outputs vary from run to run, so you assert on pass rates over many runs with a confidence interval, never on exact strings.',
  },
];

/** How the same loop differs across the three disciplines. */
export const PARADIGM_ROWS: ParadigmRow[] = [
  {
    dimension: 'What ships',
    devops: 'Code and binaries; stateless services.',
    mlops: 'Code, data and a trained model artifact.',
    llmops: 'Prompts, a retrieval index, a pinned model or provider, and the code around them.',
  },
  {
    dimension: 'What is versioned',
    devops: 'Source, lockfiles, image digests.',
    mlops: 'Datasets, features, experiments, registry versions.',
    llmops: 'Prompt hashes, embedding model and index version, dated model snapshots.',
  },
  {
    dimension: 'How it is tested',
    devops: 'Unit, integration and end-to-end tests; assert equality.',
    mlops: 'Data validation and offline metrics on held-out data.',
    llmops: 'Golden-set evals and a calibrated LLM-as-judge; assert pass rates.',
  },
  {
    dimension: 'How it degrades',
    devops: 'Crashes and regressions, visible in health probes.',
    mlops: 'Silently: data and concept drift, training/serving skew.',
    llmops: 'Silently: provider model updates, retrieval decay, prompt and model mismatch.',
  },
  {
    dimension: 'Release strategy',
    devops: 'Rolling, blue-green and canary, gated on error rate and latency.',
    mlops: 'Shadow and champion/challenger, gated on model quality.',
    llmops: 'Eval-gated rollout, shadow traffic, index alias swap.',
  },
  {
    dimension: 'Cost driver',
    devops: 'Replicas and idle capacity.',
    mlops: 'Training compute and feature serving.',
    llmops: 'Tokens, GPU-seconds, context length and cache hit rate.',
  },
];
