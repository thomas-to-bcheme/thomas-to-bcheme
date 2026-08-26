import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

// The ML-specific adaptation of interviewFramework.ts's 4-step framework —
// same FrameworkStep shape, same shared FrameworkStepList component. Where
// the general framework's steps are generic across any system, these 6
// steps are the extra layer of decisions a model in production adds on top,
// synthesized from a standard ML system design interview walkthrough (see
// Sources — ML System Design group).
export const ML_FRAMEWORK_STEPS: FrameworkStep[] = [
  {
    id: 'ml-requirements-problem-framing',
    marker: '1',
    label: 'Requirements & Problem Framing',
    durationLabel: '~5 min',
    description:
      'Translate a business problem into an ML task before proposing any architecture — what is actually being predicted, and for whom.',
    detail: [
      "Clarify the business problem and its downstream use — the same product-scope clarifying questions as general system design, plus: what does the model's output actually get used for?",
      'Identify the ML task type this reduces to — classification, regression, ranking, clustering — since that choice shapes every later step',
      'Confirm scale and latency constraints the same way the general framework does — but also ask whether inference runs in the cloud or on-device, since on-device inference trades server latency for memory and battery constraints instead',
    ],
  },
  {
    id: 'ml-metrics-evaluation',
    marker: '2',
    label: 'Metrics & Evaluation Criteria',
    durationLabel: '~2-3 min',
    description:
      'Decide upfront how success will be measured, before any design gets proposed — there is no way to know a design worked without this.',
    detail: [
      'Define both an offline metric (held-out data, gates the ship decision) and an online metric (live user behavior, proves it actually helped) — see the Offline vs. Online Metrics question',
      'Debate the trade-offs between candidate metrics out loud: sensitivity to class imbalance, and the likely gap between the offline number and the online result',
      "Metrics can be added or removed later in the design if a better one surfaces — this isn't a one-shot decision",
    ],
  },
  {
    id: 'ml-high-level-architecture',
    marker: '3',
    label: 'High-Level Architecture',
    durationLabel: '~10 min',
    description: 'Sketch a modular design — one logical block per ML component — rather than one monolithic model doing everything.',
    detail: [
      'A cascade or tiered approach (cheap candidate generation/filtering, followed by a more expensive ranking stage) is the standard shape for retrieval-and-ranking problems — see the Quora and Uber Michelangelo case studies in Sources',
      "Each block in the diagram represents one ML component with a clear responsibility — the same discipline as naming each component's job in the general framework's High-Level Design step",
    ],
  },
  {
    id: 'ml-offline-model-building',
    marker: '4',
    label: 'Offline Model Building & Evaluation',
    durationLabel: 'Remaining time, split with Deep Dive',
    description:
      'Work through data generation, feature engineering, and model training/evaluation — starting from the simplest baseline, not the most sophisticated model.',
    detail: [
      "Think through multiple ways to generate data and labels: implicit signals (a logged purchase), explicit signals (a user 'saves' an item), human-labeled data, or some combination",
      'Engineer features that leverage the product\'s unique properties, and consider feature crosses (combining features) where a single feature alone underspecifies the signal',
      "Start with a non-ML heuristic or the simplest viable model before reaching for something more complex — debate complexity, data requirements, accuracy, and latency for each option, the same 'name at least two options' discipline as the general framework",
    ],
  },
  {
    id: 'ml-deep-dive',
    marker: '5',
    label: 'Deep Dive',
    durationLabel: 'Remaining time, split with Offline Model Building',
    description:
      "Go deep on the 1-2 components you're most confident about — the data, modeling, and evaluation choices, and their known shortcomings — the same way the general framework's Deep Dive step works.",
    detail: [
      'Surface real modeling risks unprompted: class imbalance, noisy labels, calibration — proactively, the same Staff Signals instinct as general system design',
      'If time allows, propose concrete ways to improve the chosen component further',
    ],
  },
  {
    id: 'ml-monitoring-retraining',
    marker: '6',
    label: 'Monitoring, Logging & Alerts',
    durationLabel: 'Optional, if time allows',
    description:
      'A model that shipped correctly can still go wrong silently in production — monitoring and a retraining plan are part of the design, not an afterthought.',
    detail: [
      'Identify concrete failure modes to watch for: miscalibrated predictions, online-metric degradation — see the Drift vs. Staleness question for how to tell a changed world from a stale model',
      "Propose a mitigation plan for each failure mode, plus a fallback — a way to fail safe (an 'andon cord') if the model starts actively hurting the product",
    ],
  },
];

export const ML_VS_GENERAL_SIMILARITIES: string[] = [
  'Still fundamentally a client-server architecture in most deployments — a client requests, a server (or serving endpoint) responds',
  "The same scalability constraints apply: latency budgets and memory limits bound what a design can do, regardless of whether it's serving a model or a database query",
  'The same requirements-first discipline applies — clarify before designing, quantify non-functional targets, confirm scope out loud',
  'The same trade-off-driven reasoning applies — propose at least two options for a real fork and name why one was picked',
];

export const ML_VS_GENERAL_DIFFERENCES: string[] = [
  'The focus shifts toward the modeling task itself — metrics and evaluation criteria, and where the training data actually comes from',
  'Data pipelines become a first-class design concern: batch vs. streaming ingestion, and transforming raw data into features the model can actually learn from',
  'Training and serving infrastructure adds a new axis entirely — CPU vs. GPU, training time, and on-device vs. cloud inference latency',
  'Not every ML system is client-server — on-device inference is a growing deployment mode with no server round-trip at all',
  'Offline and online data can genuinely disagree — a model can look great against held-out data and still underperform once it\'s shaping what real users see',
];
