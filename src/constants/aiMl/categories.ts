/**
 * The four AI/ML categories and their topical groups.
 *
 * Array position is canonical -- no `order` field to drift -- and the canonical
 * order runs MOST GENERAL -> MOST NICHE, both for the categories themselves and
 * for the groups inside each one. Classical ML comes first because it assumes
 * the least; reinforcement learning comes last because it assumes the most (an
 * environment you can act on, and a reward signal that comes back).
 *
 * `premise` is the load-bearing field: it states what assumption the category
 * buys you and what it costs, which is what makes "classical vs deep vs
 * generative vs RL" a question with an answer rather than a matter of taste.
 */

import { Sigma, Brain, Sparkles, Joystick } from 'lucide-react';

import type { AiMlCategory } from './types';

export const AI_ML_CATEGORIES: AiMlCategory[] = [
  {
    id: 'classical-ml',
    label: 'Classical ML',
    eyebrow: 'AI/ML · Foundations',
    description:
      'Models that learn an explicit, low-dimensional decision rule from tabular or short sequential data — where the structure is stated up front rather than discovered.',
    icon: Sigma,
    premise:
      'You supply the structure — the features, the functional form, the assumed noise — and the model fits a small number of parameters inside it. That buys you sample efficiency, calibrated uncertainty, interpretability, and training that finishes in seconds. It costs you everything the features do not capture: if the real signal is an interaction you did not encode, the model cannot find it.',
    groups: [
      {
        id: 'linear-models',
        label: 'Linear Models',
        summary:
          'A weighted sum of features, fit by minimizing squared error or log loss.',
        abstraction:
          'The most general supervised form there is — everything below specializes it. Regularization, link functions, and kernels are all modifications of this one equation.',
      },
      {
        id: 'instance-and-kernel',
        label: 'Instance & Kernel',
        summary:
          'Decisions made by comparing a query to stored examples, directly or through a kernel.',
        abstraction:
          'Drops the linear form but keeps the geometry: specializes "fit a global rule" into "compare locally", trading training cost for inference cost.',
      },
      {
        id: 'probabilistic',
        label: 'Probabilistic',
        summary:
          'Models of the joint or conditional distribution, fit by likelihood.',
        abstraction:
          'Specializes from "predict a value" to "model the distribution the value came from" — which is what makes these usable for density estimation and outlier scoring, not just prediction.',
      },
      {
        id: 'trees-and-ensembles',
        label: 'Trees & Ensembles',
        summary:
          'Recursive axis-aligned splits, and the bagging or boosting that makes them competitive.',
        abstraction:
          'Abandons a global functional form entirely for piecewise-constant partitions, then specializes further into variance reduction (bagging) and bias reduction (boosting).',
      },
      {
        id: 'structure',
        label: 'Structure & Clustering',
        summary:
          'Unsupervised methods that find axes, groups, or a low-rank basis without labels.',
        abstraction:
          'Narrows from "predict a target" to "describe the data" — the specialization that applies when no label exists, and the foundation for reconstruction-based anomaly detection.',
      },
      {
        id: 'classical-time-series',
        label: 'Classical Time Series',
        summary:
          'Models built around autocorrelation, trend, seasonality, and latent state.',
        abstraction:
          'The most specialized group here: assumes the observations are ordered and dependent, which is exactly the assumption every other group above discards.',
      },
    ],
  },
  {
    id: 'deep-learning',
    label: 'Deep Learning',
    eyebrow: 'AI/ML · Learned Representations',
    description:
      'Composed differentiable layers that learn the features themselves, specialized by the structural prior each architecture encodes.',
    icon: Brain,
    premise:
      'Instead of supplying features, you supply an architecture whose structure matches the structure of the data — locality for images, recurrence or causal masking for sequences, adjacency for graphs — and let gradient descent learn the representation. That buys you the ability to model interactions nobody could hand-engineer. It costs data, compute, calibration, and interpretability, and it wins only when there is enough data for the learned representation to beat a stated one.',
    groups: [
      {
        id: 'foundations',
        label: 'Foundations',
        summary:
          'The dense layer and backpropagation — the substrate every other architecture is built from.',
        abstraction:
          'The most general neural form: no structural prior at all, every input connected to every unit. Everything below is this with a constraint added.',
      },
      {
        id: 'spatial',
        label: 'Spatial',
        summary:
          'Weight sharing and locality — the convolutional prior.',
        abstraction:
          'Specializes the dense layer by asserting that nearby inputs are related and that the same feature detector applies everywhere.',
      },
      {
        id: 'sequence',
        label: 'Sequence',
        summary:
          'Recurrence and causal convolution — architectures that carry state across time.',
        abstraction:
          'Specializes by asserting order matters and the past may not see the future; gating (LSTM/GRU) then specializes further to fix the vanishing-gradient failure of plain recurrence.',
      },
      {
        id: 'graph',
        label: 'Graph',
        summary:
          'Message passing over an explicit adjacency structure.',
        abstraction:
          'Generalizes convolution from a fixed grid to an arbitrary graph — the right prior when the relationships between entities are known rather than inferred.',
      },
      {
        id: 'attention',
        label: 'Attention',
        summary:
          'Learned, content-based routing between all positions.',
        abstraction:
          'Replaces a fixed structural prior with a learned one — which is why it generalizes across modalities, and why it needs far more data than the architectures whose prior is built in.',
      },
      {
        id: 'forecasting-native',
        label: 'Forecasting-Native',
        summary:
          'Architectures designed for the forecasting task rather than adapted to it.',
        abstraction:
          'The most specialized group: basis expansion, probabilistic heads, and multi-horizon decoding, all assuming the deliverable is a forecast.',
      },
      {
        id: 'representation',
        label: 'Representation',
        summary:
          'Networks trained to compress and reconstruct rather than to predict a label.',
        abstraction:
          'Specializes the objective rather than the architecture — reconstruction error becomes the signal, which is what makes this the deep anomaly-detection workhorse.',
      },
    ],
  },
  {
    id: 'generative-ai',
    label: 'Generative AI',
    eyebrow: 'AI/ML · Distributions',
    description:
      'Models of the data distribution itself — able to sample new data, score how likely an observation is, or both.',
    icon: Sparkles,
    premise:
      'Rather than learning a mapping from input to label, you learn the distribution the data came from. That buys you sampling, density scoring, and a use for unlabeled data at scale. It costs you a hard evaluation problem — likelihood, sample quality, and usefulness disagree with each other — and it means the tractable trade-off you pick (exact likelihood, fast sampling, or stable training) is the defining design decision.',
    groups: [
      {
        id: 'latent-variable',
        label: 'Latent-Variable',
        summary:
          'An explicit latent code with a tractable bound on the likelihood.',
        abstraction:
          'The most general generative framing: assume the data has a low-dimensional cause, then learn both directions of the mapping.',
      },
      {
        id: 'adversarial',
        label: 'Adversarial',
        summary:
          'A generator trained against a learned discriminator.',
        abstraction:
          'Specializes by discarding likelihood entirely — trades a tractable objective for sample quality, and inherits an unstable optimization problem in exchange.',
      },
      {
        id: 'diffusion',
        label: 'Diffusion',
        summary:
          'Iterative denoising of a fixed corruption process.',
        abstraction:
          'Specializes further: replaces a single-shot generator with a many-step reversal, buying stability and quality at the cost of sampling latency.',
      },
      {
        id: 'autoregressive',
        label: 'Autoregressive & Masked',
        summary:
          'Factorize the joint into a product of conditionals over tokens.',
        abstraction:
          'Specializes to sequential data, where the chain rule gives exact likelihood for free — the reason this family dominates language.',
      },
      {
        id: 'representation-retrieval',
        label: 'Representation & Retrieval',
        summary:
          'Embeddings trained by contrast, and the retrieval systems built on them.',
        abstraction:
          'The applied end of the category: uses generative pretraining as a means rather than an end, for search, ranking, and grounding.',
      },
      {
        id: 'adaptation-alignment',
        label: 'Adaptation & Alignment',
        summary:
          'Making a pretrained model useful and steerable without retraining it.',
        abstraction:
          'The most specialized group — assumes a capable base model already exists, and optimizes only the delta.',
      },
    ],
  },
  {
    id: 'reinforcement-learning',
    label: 'Reinforcement Learning',
    eyebrow: 'AI/ML · Sequential Decisions',
    description:
      'Learning a policy from interaction, where actions change the state and feedback arrives delayed and sparse.',
    icon: Joystick,
    premise:
      'You give up i.i.d. data entirely: your own actions determine what you observe next, and the signal is a scalar reward that may arrive many steps after the decision that earned it. That buys you the ability to optimize a long-horizon objective directly, which no supervised loss can express. It costs sample efficiency, stability, and safety — and it is the wrong tool whenever the real task is prediction rather than control.',
    groups: [
      {
        id: 'foundations',
        label: 'Foundations',
        summary:
          'The MDP formalism, Bellman equations, and the exact solutions when the model is known.',
        abstraction:
          'The most general statement of the problem — every algorithm below is an approximation to these equations under a different relaxation of "you know the dynamics".',
      },
      {
        id: 'value-based',
        label: 'Value-Based',
        summary:
          'Estimate the value of state-action pairs, then act greedily.',
        abstraction:
          'Specializes by learning the value function only and deriving the policy from it — clean for discrete actions, awkward the moment actions are continuous.',
      },
      {
        id: 'policy-gradient',
        label: 'Policy-Gradient',
        summary:
          'Parameterize the policy directly and ascend its expected return.',
        abstraction:
          'Specializes in the opposite direction: optimize the policy without a value function, then reintroduce one as a baseline to control variance.',
      },
      {
        id: 'continuous-control',
        label: 'Continuous Control',
        summary:
          'Actor-critic methods built for real-valued action spaces.',
        abstraction:
          'Specializes both branches above for continuous actions, where greedy maximization over the action space is no longer tractable.',
      },
      {
        id: 'online-decision',
        label: 'Online Decision',
        summary:
          'Exploration under uncertainty when there is no state to carry forward.',
        abstraction:
          'The most specialized group — a stateless MDP. Simpler than everything above, and correspondingly the one that actually ships most often.',
      },
    ],
  },
];
