/**
 * The /ai-ml hub's navigational logic tree.
 *
 * A reader should be able to arrive at a model by REASONING about their problem
 * rather than by recognising a model name, so every node is a question about the
 * data or the deliverable -- never "do you want a transformer?".
 *
 * Stored FLAT with parentId links rather than as a nested literal, for two
 * reasons: it keeps the data inside CLAUDE.md 7.3's three-level nesting limit,
 * and it makes the invariants trivially checkable -- one root, no cycles,
 * strictly ascending levels, every target resolving against the registry.
 * Ascending levels is also what encodes the general -> niche ordering.
 */

import type { AiMlCategoryId, AppliedDomainId } from './types';

export type DecisionTargetKind = 'category' | 'group' | 'domain' | 'model';

export interface DecisionTarget {
  kind: DecisionTargetKind;
  /**
   * A category id, a domain id, a model slug, or `${categoryId}/${groupId}`
   * for a group. Resolved and verified by scripts/verifyAiMl.ts.
   */
  id: AiMlCategoryId | AppliedDomainId | string;
  label: string;
}

export interface DecisionTreeNode {
  id: string;
  /** 0 is the single most general question. Levels ascend strictly. */
  level: number;
  parentId: string | null;
  /** The answer that got you here from the parent. Null only at the root. */
  edgeLabel: string | null;
  question: string;
  /** Why this question belongs at this rung of abstraction. */
  rationale: string;
  /** Terminal nodes only. */
  target?: DecisionTarget;
}

export const DECISION_TREE: DecisionTreeNode[] = [
  {
    id: 'root',
    level: 0,
    parentId: null,
    edgeLabel: null,
    question: 'What are you trying to produce?',
    rationale:
      'The most general question there is, and the only one that reliably narrows the field before you know anything else. The shape of the output — a number, a label, a sequence, new data, or a decision — determines the loss, and the loss determines the family.',
  },

  // --- level 1: the five output shapes ---
  {
    id: 'number-or-score',
    level: 1,
    parentId: 'root',
    edgeLabel: 'A number or a score',
    question: 'Do you have labelled examples of the number you want?',
    rationale:
      'Supervision is the next binding constraint. With labels this is regression; without them you are describing the data instead, which is a different family entirely.',
  },
  {
    id: 'category-or-group',
    level: 1,
    parentId: 'root',
    edgeLabel: 'A category or a group',
    question: 'How rare is the class you care about?',
    rationale:
      'Balanced classification and rare-event detection look identical on paper and behave nothing alike. Below roughly 1% positives, accuracy stops meaning anything and the problem becomes "model normal, measure deviation".',
  },
  {
    id: 'sequence-over-time',
    level: 1,
    parentId: 'root',
    edgeLabel: 'A sequence over time',
    question: 'One series, or many related series?',
    rationale:
      'This single question separates classical forecasting from deep forecasting more reliably than anything else. Cross-series structure is the only thing that pays for a deep model; without it you are fitting a large model to a small problem.',
  },
  {
    id: 'new-data',
    level: 1,
    parentId: 'root',
    edgeLabel: 'New data or content',
    question: 'Do you need an exact likelihood, or just good samples?',
    rationale:
      'The central trade-off of generative modelling. Exact density, fast sampling, and stable training cannot all be had at once, and which one you give up defines the architecture.',
  },
  {
    id: 'a-decision',
    level: 1,
    parentId: 'root',
    edgeLabel: 'A decision under feedback',
    question: 'Does your action change what you observe next?',
    rationale:
      'The dividing line between prediction and control. If actions change the state, you have a sequential decision problem and no supervised loss can express the objective. If they do not, you have a much simpler bandit.',
  },

  // --- level 2 under "number or score" ---
  {
    id: 'labelled-regression',
    level: 2,
    parentId: 'number-or-score',
    edgeLabel: 'Yes — I have labels',
    question: 'Do you need to explain the prediction to someone?',
    rationale:
      'Interpretability is a hard requirement in regulated and high-stakes settings, and it narrows the field before accuracy does. It is a constraint, not a preference.',
  },
  {
    id: 'unlabelled-structure',
    level: 2,
    parentId: 'number-or-score',
    edgeLabel: 'No labels',
    question: 'Are you looking for axes, or for groups?',
    rationale:
      'Without a target the only options are describing variation (a low-rank basis) or partitioning (clusters). Both are unsupervised, but they answer different questions.',
    target: {
      kind: 'group',
      id: 'classical-ml/structure',
      label: 'Structure & Clustering',
    },
  },

  // --- level 2 under "category or group" ---
  {
    id: 'balanced-classification',
    level: 2,
    parentId: 'category-or-group',
    edgeLabel: 'Balanced — both classes are common',
    question: 'Is your data tabular, or perceptual?',
    rationale:
      'Tabular data still belongs to gradient boosting; images, audio, and text belong to learned representations. This is the most reliable modality split in applied ML.',
    target: {
      kind: 'group',
      id: 'classical-ml/trees-and-ensembles',
      label: 'Trees & Ensembles',
    },
  },
  {
    id: 'rare-event',
    level: 2,
    parentId: 'category-or-group',
    edgeLabel: 'Rare — under ~1%',
    question: 'Do you have labelled anomalies, or only normal data?',
    rationale:
      'Almost always only normal data, and the interesting anomalies are ones never seen before — which is why this is a modelling-normality problem rather than a classification one.',
    target: {
      kind: 'domain',
      id: 'anomaly-detection',
      label: 'Anomaly Detection',
    },
  },

  // --- level 2 under "sequence over time" ---
  {
    id: 'single-series',
    level: 2,
    parentId: 'sequence-over-time',
    edgeLabel: 'One short series',
    question: 'Does it have clear trend and seasonality?',
    rationale:
      'On a few hundred points the structure is low-dimensional and a stated model beats a learned one. Start at the seasonal-naive baseline and make anything fancier earn its place.',
    target: {
      kind: 'group',
      id: 'classical-ml/classical-time-series',
      label: 'Classical Time Series',
    },
  },
  {
    id: 'many-series',
    level: 2,
    parentId: 'sequence-over-time',
    edgeLabel: 'Many, long, or coupled series',
    question: 'Are the series linked by a known structure?',
    rationale:
      'If the relationships are known — a road network, a grid, a supply chain — a graph prior encodes them directly. If they are merely numerous, a global sequence model shares statistical strength without needing the topology.',
    target: {
      kind: 'domain',
      id: 'time-series-forecasting',
      label: 'Time-Series Forecasting',
    },
  },

  // --- level 2 under "new data" ---
  {
    id: 'exact-likelihood',
    level: 2,
    parentId: 'new-data',
    edgeLabel: 'I need exact likelihood',
    question: 'Is the data sequential, or continuous?',
    rationale:
      'The chain rule gives exact likelihood for free on sequences; on continuous data you need an invertible map. That is the whole reason both autoregressive models and normalizing flows exist.',
    target: {
      kind: 'group',
      id: 'generative-ai/latent-variable',
      label: 'Latent-Variable Models',
    },
  },
  {
    id: 'sample-quality',
    level: 2,
    parentId: 'new-data',
    edgeLabel: 'Samples matter more than density',
    question: 'Can you afford many steps at sampling time?',
    rationale:
      'Diffusion buys quality and training stability by spending many forward passes per sample. If inference latency binds, a one-shot generator is the trade you make.',
    target: { kind: 'group', id: 'generative-ai/diffusion', label: 'Diffusion' },
  },

  // --- level 2 under "a decision" ---
  {
    id: 'stateful-control',
    level: 2,
    parentId: 'a-decision',
    edgeLabel: 'Yes — there is state and delayed reward',
    question: 'Are your actions discrete, or continuous?',
    rationale:
      'Value-based methods take a max over actions, which is only tractable when actions are discrete. Continuous action spaces force an actor-critic formulation — this is the fork inside RL.',
    target: {
      kind: 'category',
      id: 'reinforcement-learning',
      label: 'Reinforcement Learning',
    },
  },
  {
    id: 'constrained-allocation',
    level: 2,
    parentId: 'a-decision',
    edgeLabel: 'There are hard constraints to satisfy',
    question: 'Must every answer be feasible, not just good?',
    rationale:
      'Once feasibility is non-negotiable — a schedule that must fit, a budget that must balance — a learned model that cannot guarantee constraint satisfaction belongs inside the solver rather than replacing it. That reframing is what separates optimization from prediction.',
    target: { kind: 'domain', id: 'optimization', label: 'Optimization' },
  },
  {
    id: 'stateless-decision',
    level: 2,
    parentId: 'a-decision',
    edgeLabel: 'No — each choice is independent',
    question: 'Do you have context features for each decision?',
    rationale:
      'A stateless repeated choice is a bandit, not an MDP, and reaching for full RL here adds instability for nothing. This is the most common correct answer in production, and the most commonly over-engineered.',
    target: {
      kind: 'model',
      id: 'multi-armed-bandits',
      label: 'Multi-Armed Bandits',
    },
  },

  // --- level 3: the terminal specializations ---
  {
    id: 'coupled-series',
    level: 3,
    parentId: 'many-series',
    edgeLabel: 'Yes — the topology is known',
    question: 'Encode the relationships directly.',
    rationale:
      'When you already know which series influence which — a road network, a power grid, a supply chain — a graph prior states that structure instead of making the model rediscover it from data.',
    target: {
      kind: 'group',
      id: 'deep-learning/graph',
      label: 'Graph architectures',
    },
  },
  {
    id: 'numerous-series',
    level: 3,
    parentId: 'many-series',
    edgeLabel: 'No — just a great many of them',
    question: 'Train one global sequence model across all of them.',
    rationale:
      'Thousands of related series share statistical strength even without a known topology. This is the case where a deep model genuinely beats per-series classical fits, and the only one where it reliably does.',
    target: {
      kind: 'group',
      id: 'deep-learning/sequence',
      label: 'Sequence architectures',
    },
  },
  {
    id: 'discrete-actions',
    level: 3,
    parentId: 'stateful-control',
    edgeLabel: 'Discrete — a finite menu',
    question: 'Learn the value of each action.',
    rationale:
      'Taking a max over actions is only tractable when there are finitely many, which is exactly the assumption value-based methods rest on.',
    target: {
      kind: 'group',
      id: 'reinforcement-learning/value-based',
      label: 'Value-based methods',
    },
  },
  {
    id: 'continuous-actions',
    level: 3,
    parentId: 'stateful-control',
    edgeLabel: 'Continuous — a real-valued setting',
    question: 'Parameterize the policy directly.',
    rationale:
      'Greedy maximization over a continuous action space is not tractable, which forces an actor-critic formulation — the fork that defines this half of the category.',
    target: {
      kind: 'group',
      id: 'reinforcement-learning/continuous-control',
      label: 'Continuous control',
    },
  },
  {
    id: 'interpretable-linear',
    level: 3,
    parentId: 'labelled-regression',
    edgeLabel: 'Yes — it must be explainable',
    question: 'Start with the linear family.',
    rationale:
      'A regularized linear model gives coefficients you can defend, calibrated intervals, and a baseline that a more complex model has to beat before it earns its operational cost.',
    target: {
      kind: 'group',
      id: 'classical-ml/linear-models',
      label: 'Linear Models',
    },
  },
  {
    id: 'accuracy-first',
    level: 3,
    parentId: 'labelled-regression',
    edgeLabel: 'No — accuracy is what matters',
    question: 'Go to gradient boosting.',
    rationale:
      'On tabular data, boosted trees remain the strongest default. Reach past them only when the data stops being tabular.',
    target: {
      kind: 'model',
      id: 'gradient-boosting',
      label: 'Gradient Boosting',
    },
  },
];
