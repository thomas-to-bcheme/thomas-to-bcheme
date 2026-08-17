import type { SystemDesignQuestion } from './types';

export const MODEL_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'batch-vs-streaming',
    category: 'model',
    axes: ['end-to-end'],
    question: 'Should this data be processed in scheduled batches, or continuously as it arrives?',
    clarifyingSubQuestions: [
      'How fresh does the processed output need to be for downstream consumers?',
      'Does the processing logic need to see the full dataset at once (batch), or can it operate on one event at a time (streaming)?',
      'What’s the volume and arrival pattern of the data — steady trickle, or large periodic dumps?',
    ],
    approachOptions: [
      {
        label: 'Batch processing',
        whenToUse: 'Nightly feature computation, model retraining, large historical aggregations.',
        tradeoffs: 'Simpler to reason about and debug, but output is only as fresh as the last batch run.',
      },
      {
        label: 'Streaming processing',
        whenToUse: 'Real-time fraud scoring, live recommendation updates, anomaly detection.',
        tradeoffs: 'Low-latency output, but adds real operational complexity (stream processors, exactly-once semantics, backpressure handling).',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Batch and streaming often coexist for the same pipeline',
        dependsOn:
          'A common pattern is a streaming path for immediate approximate results plus a nightly batch job that recomputes exact features — the "lambda architecture" trade-off between freshness and correctness.',
      },
    ],
    ripplesInto: ['online-vs-batch-prediction', 'oltp-vs-olap'],
    sourceNote: 'board',
  },
  {
    id: 'online-vs-batch-prediction',
    category: 'model',
    axes: ['end-to-end'],
    question: 'Does inference happen per-request in real time, or precomputed on a schedule?',
    clarifyingSubQuestions: [
      'Does the prediction depend on features only known at request time (current session context), or can it be precomputed ahead of need?',
      'What latency budget does the serving path have — milliseconds, or is a lookup against precomputed results fine?',
      'What’s the request volume — precomputing for every possible input may be cheaper than serving each on demand, or vastly more wasteful, depending on the input space size.',
    ],
    approachOptions: [
      {
        label: 'Online (real-time) prediction',
        whenToUse: 'Fraud detection at checkout, live ranking, anything needing request-time context the model hasn’t seen before.',
        tradeoffs: 'Always fresh and context-aware, but must meet a tight latency SLA on every request and needs a always-on serving infrastructure.',
      },
      {
        label: 'Batch (offline) prediction',
        whenToUse: 'Daily churn scores, weekly recommendation refreshes — anywhere precomputing for all known entities is feasible.',
        tradeoffs: 'Cheap and simple to serve (just a lookup), but predictions are stale between batch runs and can’t react to request-time context.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'The input space size drives which is actually cheaper',
        dependsOn:
          'Precomputing predictions for every user nightly only makes sense if the user base is bounded and mostly stable — an unbounded or highly dynamic input space (arbitrary search queries) usually forces online prediction regardless of latency preferences.',
      },
    ],
    ripplesInto: ['batch-vs-streaming', 'latency-vs-throughput'],
    sourceNote: 'board',
  },
  {
    id: 'drift-vs-staleness',
    category: 'model',
    axes: ['time'],
    question: 'Is the input distribution shifting, the input-to-label relationship shifting, or is the model simply out of date?',
    clarifyingSubQuestions: [
      'Have the statistical properties of incoming inputs changed since training (data drift), even if the underlying relationship to the label hasn’t?',
      'Has the actual relationship between inputs and the correct label changed (concept drift) — e.g. user preferences genuinely shifted?',
      'Is performance degrading simply because the model hasn’t been retrained on recent data at all (staleness), independent of any distribution shift?',
    ],
    approachOptions: [
      {
        label: 'Monitor for data drift',
        whenToUse: 'Detect when incoming feature distributions diverge from training-time distributions.',
        tradeoffs: 'Catches upstream data pipeline changes and population shifts early, but a drift alert alone doesn’t tell you if it’s actually hurting predictions.',
      },
      {
        label: 'Monitor for concept drift',
        whenToUse: 'Detect when the model’s predictions are becoming less accurate against ground truth, even if input distributions look stable.',
        tradeoffs: 'Directly measures what matters (accuracy), but requires timely ground-truth labels, which aren’t always available quickly.',
      },
      {
        label: 'Scheduled retraining against staleness',
        whenToUse: 'A baseline safeguard regardless of whether drift is detected — the world moves even without a dramatic shift.',
        tradeoffs: 'Simple and predictable, but retraining on a fixed schedule can be wasteful if nothing has actually changed, or too infrequent if it has.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'These three failure modes need different monitoring signals, not one dashboard',
        dependsOn:
          'Data drift is measured by comparing feature distributions; concept drift needs ground-truth labels to compare against predictions; staleness is just a clock — conflating them leads to alerting on the wrong thing.',
      },
    ],
    ripplesInto: ['ml-deployment-risk-ladder', 'deploy-health-and-oncall'],
    sourceNote: 'board',
  },
  {
    id: 'ml-deployment-risk-ladder',
    category: 'model',
    axes: ['time'],
    question: 'How much production traffic should see this new model before it fully replaces the old one?',
    clarifyingSubQuestions: [
      'Can the new model’s predictions be evaluated against real traffic without actually affecting what users see (shadow mode)?',
      'What’s an acceptable blast radius if the new model performs worse than expected — a small percentage of users, or none until fully validated?',
      'What’s the rollback plan if a regression is caught after the new model is already serving live traffic?',
    ],
    approachOptions: [
      {
        label: 'Shadow deployment',
        whenToUse: 'First step for any new model — run it alongside the current model on real traffic, log its predictions, but never serve them.',
        tradeoffs: 'Zero user-facing risk, but doesn’t validate real-world behavioral impact (e.g. how users react to different recommendations).',
      },
      {
        label: 'Canary rollout',
        whenToUse: 'After shadow validation looks good — serve the new model to a small percentage of real traffic.',
        tradeoffs: 'Bounds the blast radius of a bad model, but needs strong monitoring and a fast rollback path to be safe.',
      },
      {
        label: 'A/B test',
        whenToUse: 'Once safety is established and the question shifts to "is this actually better," measured against a real business metric.',
        tradeoffs: 'Gives a statistically grounded answer on impact, but takes longer to reach significance and needs careful experiment design to avoid contamination.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This mirrors general software deployment risk ladders',
        dependsOn:
          'Shadow → canary → A/B is the ML-specific analog of blue-green → canary → rolling → feature-flags in general software deployment — worth naming that parallel explicitly, it signals the same risk-management instinct applies across both domains.',
      },
    ],
    ripplesInto: ['drift-vs-staleness', 'deploy-health-and-oncall'],
    sourceNote: 'board',
  },
];
