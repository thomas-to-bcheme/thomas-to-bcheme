/**
 * The applied domains, and the four-way "which category, and why" verdict.
 *
 * This is where "why classical ML vs deep learning vs generative vs RL" gets
 * answered -- once per domain, from the structure of the problem, rather than
 * 58 times inside individual model files. Every domain must render a verdict for
 * all four categories, so a `rarely` has to be argued rather than omitted.
 *
 * Array order runs general -> niche within each tier: the three featured domains
 * first (the ones this section is built to demonstrate), then the six breadth
 * domains that give a reader the shape of the wider field.
 *
 * `representativeSlugs` are checked against the registry by scripts/verifyAiMl.ts
 * -- a WARN while content is still landing, a hard failure once a category is
 * marked complete.
 */

import type { AppliedDomain } from './types';

export const APPLIED_DOMAINS: AppliedDomain[] = [
  // -------------------------------------------------------------------------
  // Featured -- the three this section is built to demonstrate
  // -------------------------------------------------------------------------
  {
    id: 'time-series-forecasting',
    label: 'Time-Series Forecasting',
    eyebrow: 'Applied ML · Featured',
    featured: true,
    problemShape:
      'Observations are ordered and dependent, which breaks the i.i.d. assumption every other supervised setting rests on. The signal usually decomposes into trend, seasonality, and autocorrelated noise, and the label is simply the series\' own future value — so "more data" often means a longer history of the same process, not more independent examples. The binding constraint is that you must never let information from the future leak backwards, which rules out ordinary shuffled cross-validation outright.',
    categoryFit: {
      'classical-ml': {
        verdict: 'default',
        why: 'For a short univariate series, the structure is genuinely low-dimensional — a level, a trend, a seasonal cycle — and a model that states that structure fits it in seconds with calibrated intervals. Seasonal-naive and ETS/ARIMA are the baselines a fancier model has to beat, and on a few hundred points they usually are not beaten. Gradient boosting on lag features is the strong tabular alternative when exogenous drivers matter more than the autocorrelation does.',
        representativeSlugs: ['arima', 'exponential-smoothing', 'gradient-boosting'],
      },
      'deep-learning': {
        verdict: 'situational',
        why: 'Deep models earn their cost when there are many related series, long histories, and cross-series structure worth sharing — retail SKUs, sensor fleets, traffic networks. One global model learns patterns no per-series fit can see. On a single short series they overfit and lose to a two-parameter baseline, so the honest trigger is series count and horizon length, not model fashion.',
        representativeSlugs: ['lstm', 'temporal-fusion-transformer', 'n-beats'],
      },
      'generative-ai': {
        verdict: 'situational',
        why: 'Worth reaching for only when the deliverable is a predictive distribution rather than a point — inventory and capacity decisions need the tail, not the mean. Diffusion and autoregressive foundation models also give usable zero-shot forecasts, which is genuinely valuable for cold-start series with no history to fit.',
        representativeSlugs: ['time-series-diffusion', 'decoder-only-lm'],
      },
      'reinforcement-learning': {
        verdict: 'rarely',
        why: 'RL optimizes a policy, not a forecast — the objective is expected return under actions, and forecasting has no actions. It becomes relevant one step downstream, when the forecast feeds a decision: model-based RL and MPC forecast the system and then optimize a control sequence against that forecast. Using RL to produce the forecast itself is solving the wrong problem.',
        representativeSlugs: ['model-based-rl'],
      },
    },
    industryBaseline:
      'Seasonal naive — last week\'s same weekday. Report it alongside every model you propose; a surprising share of production forecasters do not beat it.',
    evaluationNorms: [
      'Rolling-origin (expanding-window) backtesting — never shuffled k-fold',
      'MASE or sMAPE for scale-free comparison across series; RMSE only within one series',
      'Pinball loss / weighted quantile loss whenever intervals are the deliverable',
      'Evaluate at the horizon the business actually acts on, not at h=1',
    ],
    deploymentNorms: [
      'Batch scoring on a schedule, not request-time inference',
      'Retrain on a fixed cadence; refit is cheap for classical models, so do it often',
      'Monitor forecast bias by segment — drift shows as sustained one-sided error',
      'Keep the naive baseline running in production as a live regression test',
    ],
  },
  {
    id: 'anomaly-detection',
    label: 'Anomaly Detection',
    eyebrow: 'Applied ML · Featured',
    featured: true,
    problemShape:
      'The positive class is rare (often well under 1%), frequently unlabeled, and the interesting anomalies are the ones you have never seen — so the problem is usually "model normal and measure deviation", not "classify". Accuracy is meaningless at this base rate, and the real constraint is almost always the alert budget: how many false positives per day a human team will tolerate before they stop reading the alerts.',
    categoryFit: {
      'classical-ml': {
        verdict: 'default',
        why: 'Most production detectors are classical, and correctly so: Isolation Forest and one-class SVM need no labels, train in seconds, and give a score you can threshold against an alert budget. Reconstruction error from PCA and likelihood under a Gaussian mixture cover the linear and density-based cases. They are also explainable, which matters because someone has to act on the alert.',
        representativeSlugs: ['isolation-forest', 'gaussian-mixture', 'pca'],
      },
      'deep-learning': {
        verdict: 'strong',
        why: 'The autoencoder family is the workhorse when normal behaviour is high-dimensional or temporal: train to reconstruct normal data, then treat reconstruction error as the score. An LSTM autoencoder captures "normal for this time of day", which no static method can. The cost is that a sufficiently expressive network learns to reconstruct anomalies too, so capacity has to be deliberately constrained.',
        representativeSlugs: ['autoencoder', 'lstm'],
      },
      'generative-ai': {
        verdict: 'situational',
        why: 'The principled version of the same idea: a model with exact likelihood scores how improbable an observation is under the learned distribution, which is what an anomaly score is trying to approximate. Normalizing flows give this exactly; VAEs give a bound. Worth the training cost only when the density genuinely is complex and the alert budget justifies it.',
        representativeSlugs: ['normalizing-flows', 'vae'],
      },
      'reinforcement-learning': {
        verdict: 'rarely',
        why: 'Detection is a scoring problem with no action and no state transition, so the RL machinery has nothing to optimize. The one real exception is upstream: bandits allocate a limited investigation budget across candidate alerts, which is a decision problem rather than a detection one.',
        representativeSlugs: ['multi-armed-bandits'],
      },
    },
    industryBaseline:
      'A robust z-score or IQR rule on the single most informative signal. It is trivially explainable, and beating it by enough to justify a model is the actual bar.',
    evaluationNorms: [
      'Precision@k and alert-budget curves — the operating point is the product decision',
      'PR-AUC over ROC-AUC; ROC flatters any model at extreme class imbalance',
      'Time-to-detection for streaming, not just whether it was caught eventually',
      'Hold out entire anomaly episodes, never individual points from within one',
    ],
    deploymentNorms: [
      'Threshold to a human-sustainable alert rate first, then optimize the model under it',
      'Recalibrate thresholds on a schedule — normal drifts even when the model does not',
      'Ship the contributing feature alongside the score; an unexplained alert gets ignored',
      'Retrain on confirmed-normal data only, or the model learns to accept the anomalies',
    ],
  },
  {
    id: 'optimization',
    label: 'Optimization',
    eyebrow: 'Applied ML · Featured',
    featured: true,
    problemShape:
      'The deliverable is a decision, not a prediction: choose the assignment, schedule, price, or allocation that maximizes an objective subject to hard constraints. Feasibility usually matters more than accuracy — a slightly worse feasible plan beats an excellent infeasible one — and the objective is frequently non-differentiable or only observable by trying it.',
    categoryFit: {
      'classical-ml': {
        verdict: 'strong',
        why: 'Two distinct roles. First, classical ML supplies the inputs an optimizer consumes — the demand forecast, the risk score, the cost estimate — and the quality of the decision is usually bounded by those inputs, not by the solver. Second, the convex, regularized objectives here (Lasso as constrained least squares, SVM as a margin QP) are optimization problems in their own right, and are where the vocabulary of duality and constrained minimization is actually learned.',
        representativeSlugs: ['ridge-lasso', 'support-vector-machine'],
      },
      'deep-learning': {
        verdict: 'situational',
        why: 'Useful as a differentiable surrogate when the true objective is expensive to evaluate, and as a learned heuristic that proposes good starting points for a classical solver. But a neural network cannot guarantee constraint satisfaction, so in any setting where feasibility is non-negotiable it belongs inside the loop rather than replacing it.',
        representativeSlugs: ['mlp'],
      },
      'generative-ai': {
        verdict: 'rarely',
        why: 'Generative models sample from a learned distribution; they do not respect hard constraints and offer no optimality argument. The genuine exception is a system-level one — sparse mixture-of-experts routing is a real constrained load-balancing problem — and LLMs are increasingly used to *formulate* an optimization problem, which is a different job from solving it.',
        representativeSlugs: ['mixture-of-experts'],
      },
      'reinforcement-learning': {
        verdict: 'default',
        why: 'This is the category built for it. Sequential decisions under uncertainty with delayed consequences are precisely the MDP formulation, and policy-gradient and actor-critic methods optimize expected return directly rather than through a proxy loss. For stateless repeated choices — pricing, allocation, which variant to serve — bandits are the simpler and usually correct answer.',
        representativeSlugs: ['ppo-trpo', 'multi-armed-bandits', 'model-based-rl'],
      },
    },
    industryBaseline:
      'A greedy heuristic or a linear program. Both are fast, explainable, and give a provable feasible solution — and an ML approach that cannot beat them is not worth its operational cost.',
    evaluationNorms: [
      'Optimality gap against a solver bound where one exists',
      'Constraint-violation rate — a hard gate, reported separately from the objective',
      'Regret against the best fixed action, for online and bandit settings',
      'Offline policy evaluation before any live deployment',
    ],
    deploymentNorms: [
      'Always ship a feasible fallback for when the learned policy fails or times out',
      'Shadow-run against the incumbent heuristic before switching traffic',
      'Bound exploration explicitly — unconstrained exploration is a production incident',
      'Log the decision alongside its inputs; counterfactual analysis needs both',
    ],
  },

  // -------------------------------------------------------------------------
  // Breadth -- the wider field, for shape and contrast
  // -------------------------------------------------------------------------
  {
    id: 'recommendation-ranking',
    label: 'Recommendation & Ranking',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'Feedback is implicit and missing-not-at-random: you observe what was shown and clicked, never what would have been clicked had it been shown. The output is an ordering rather than a value, so the loss is pairwise or listwise, and the system is a feedback loop — today\'s model shapes tomorrow\'s training data.',
    categoryFit: {
      'classical-ml': {
        verdict: 'default',
        why: 'Gradient-boosted trees remain the ranking workhorse: they handle heterogeneous tabular features, train fast enough to retrain daily, and dominate learning-to-rank benchmarks. Matrix factorization is still the honest baseline for collaborative filtering.',
        representativeSlugs: ['gradient-boosting'],
      },
      'deep-learning': {
        verdict: 'strong',
        why: 'Learned embeddings handle the very high-cardinality categorical features (user, item) that trees struggle with, and two-tower architectures make retrieval over millions of candidates tractable. Standard practice is a hybrid: deep retrieval, then a boosted ranker.',
        representativeSlugs: ['mlp'],
      },
      'generative-ai': {
        verdict: 'strong',
        why: 'Contrastive embeddings are the modern retrieval substrate, and give genuine semantic cold-start for items with no interaction history — the failure case collaborative filtering cannot solve by construction.',
        representativeSlugs: ['contrastive-embeddings'],
      },
      'reinforcement-learning': {
        verdict: 'situational',
        why: 'The correct framing for the feedback loop — ranking is a sequential decision problem, and bandits address the exploration deficit directly. Full RL is rarely worth the complexity outside very large platforms; contextual bandits usually capture most of the value.',
        representativeSlugs: ['multi-armed-bandits'],
      },
    },
    industryBaseline: 'Most-popular-by-segment, and item-to-item collaborative filtering.',
    evaluationNorms: [
      'NDCG@k and MAP for offline ranking quality',
      'Counterfactual/off-policy estimators to correct presentation bias',
      'Online A/B on the business metric — offline gains routinely fail to transfer',
    ],
    deploymentNorms: [
      'Two-stage retrieval then ranking, to keep latency inside budget',
      'Reserve explicit exploration traffic or the feedback loop closes',
      'Monitor catalogue coverage, not only accuracy',
    ],
  },
  {
    id: 'natural-language',
    label: 'Natural Language',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'Discrete tokens, long-range dependency, and enormous quantities of unlabeled text. The defining property is that self-supervised pretraining transfers: a model trained to predict the next token learns representations that carry to nearly every downstream task, which inverted the field\'s economics.',
    categoryFit: {
      'classical-ml': {
        verdict: 'situational',
        why: 'TF-IDF with a linear model is still the right answer for small, narrow, well-labelled classification tasks — it trains in seconds, is fully interpretable, and is frequently within a point or two of a fine-tuned transformer at a fraction of the cost.',
        representativeSlugs: ['logistic-regression', 'naive-bayes'],
      },
      'deep-learning': {
        verdict: 'strong',
        why: 'The transformer is the architecture the field converged on, because attention learns which tokens matter rather than assuming it from position. Encoder models remain the efficient choice for classification and extraction.',
        representativeSlugs: ['transformer'],
      },
      'generative-ai': {
        verdict: 'default',
        why: 'Autoregressive language models are the field\'s centre of gravity: the chain rule makes exact likelihood tractable, and scale turns that single objective into general capability. RAG is how they get grounded in facts they were not trained on.',
        representativeSlugs: ['decoder-only-lm', 'rag'],
      },
      'reinforcement-learning': {
        verdict: 'situational',
        why: 'Not for the language modelling itself, but for alignment: RLHF and DPO optimize against human preference, which is exactly the objective a next-token loss cannot express.',
        representativeSlugs: ['rlhf-dpo'],
      },
    },
    industryBaseline: 'TF-IDF plus logistic regression — still the bar for narrow classification.',
    evaluationNorms: [
      'Held-out task metrics (F1, exact match) over perplexity for applied work',
      'Human or LLM-judge evaluation for open-ended generation, with a rubric',
      'Explicit contamination checks against the pretraining corpus',
    ],
    deploymentNorms: [
      'KV caching and quantization to bring inference cost into range',
      'Ground with retrieval before reaching for fine-tuning',
      'Monitor refusal and hallucination rates as first-class production metrics',
    ],
  },
  {
    id: 'computer-vision',
    label: 'Computer Vision',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'Pixels carry strong spatial structure: nearby pixels are correlated, and an object is the same object wherever it appears. Those two facts — locality and translation invariance — are the priors that make the problem tractable at all, and they are what convolution encodes directly.',
    categoryFit: {
      'classical-ml': {
        verdict: 'rarely',
        why: 'Hand-engineered descriptors plus an SVM was the state of the art until 2012 and is now genuinely superseded — learned features beat designed ones decisively once data and compute allowed. Classical methods survive for tiny datasets and for classical geometry, not for recognition.',
        representativeSlugs: ['support-vector-machine'],
      },
      'deep-learning': {
        verdict: 'default',
        why: 'The convolutional prior matches the structure of images exactly, which is why CNNs need far less data than an unconstrained network to reach the same accuracy. Transfer from a pretrained backbone is standard practice and usually removes the data problem entirely.',
        representativeSlugs: ['cnn'],
      },
      'generative-ai': {
        verdict: 'strong',
        why: 'Diffusion models dominate image synthesis and editing, and contrastive image-text pretraining gives zero-shot classification without task labels — a capability supervised training cannot offer at all.',
        representativeSlugs: ['ddpm', 'contrastive-embeddings'],
      },
      'reinforcement-learning': {
        verdict: 'rarely',
        why: 'Vision is perception, not control — there is no action changing the next image. RL appears only when vision is the observation space for an agent, in robotics and simulated control.',
        representativeSlugs: ['sac'],
      },
    },
    industryBaseline: 'A frozen pretrained backbone with a linear probe on top.',
    evaluationNorms: [
      'mAP for detection, IoU for segmentation, top-k for classification',
      'Slice metrics by lighting, pose, and demographic — aggregate accuracy hides failures',
      'Robustness under corruption and distribution shift',
    ],
    deploymentNorms: [
      'Quantize and distil for edge inference',
      'Version the preprocessing with the model — a resize change silently breaks accuracy',
      'Monitor input distribution; camera changes are the usual cause of drift',
    ],
  },
  {
    id: 'causal-inference',
    label: 'Causal Inference & Uplift',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'The target is a counterfactual that is never observed: what would have happened under the other treatment. Predictive accuracy is not the goal and can actively mislead — a model that perfectly predicts who churns says nothing about who an intervention would save. Identification comes from design (randomization, instruments, discontinuities), not from model capacity.',
    categoryFit: {
      'classical-ml': {
        verdict: 'default',
        why: 'The field is built on linear and tree-based estimators, because the estimand is a treatment effect with a confidence interval, and interpretability plus calibrated uncertainty are the requirements. Uplift trees and causal forests are the direct specializations.',
        representativeSlugs: ['linear-regression', 'random-forest'],
      },
      'deep-learning': {
        verdict: 'situational',
        why: 'Useful for flexible nuisance-function estimation inside a doubly-robust estimator, and for high-dimensional confounders like text or images. The identification argument still comes from the design; the network only estimates a component of it.',
        representativeSlugs: ['mlp'],
      },
      'generative-ai': {
        verdict: 'rarely',
        why: 'Generating plausible data is not the same as recovering a causal effect, and a model that has learned observational correlations will confidently reproduce confounding. Simulation for sensitivity analysis is the narrow legitimate use.',
        representativeSlugs: ['vae'],
      },
      'reinforcement-learning': {
        verdict: 'situational',
        why: 'Deeply related — off-policy evaluation is causal inference under another name, and both are asking what would have happened under a different action. Bandits are the natural framing when the treatment assignment is yours to choose.',
        representativeSlugs: ['multi-armed-bandits'],
      },
    },
    industryBaseline: 'A randomized experiment with a difference-in-means. Nothing beats a clean A/B test.',
    evaluationNorms: [
      'Qini and uplift curves, not classification accuracy',
      'Sensitivity analysis for unmeasured confounding',
      'Placebo and negative-control outcomes to test the identification',
    ],
    deploymentNorms: [
      'Hold out a permanent untreated control to keep measuring the effect',
      'Re-estimate after any policy change — effects are not stable across regimes',
      'Report intervals, never point estimates, to decision-makers',
    ],
  },
  {
    id: 'risk-and-fraud',
    label: 'Risk & Fraud',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'Tabular, extremely imbalanced, adversarial, and regulated all at once. The adversary adapts to your model, labels arrive late (a chargeback lands months after the transaction), and in credit decisions you may be legally required to explain any adverse outcome — which rules out anything you cannot interpret.',
    categoryFit: {
      'classical-ml': {
        verdict: 'default',
        why: 'Gradient boosting on tabular features is the industry standard for detection, and logistic regression with monotonic constraints remains standard for regulated credit scoring precisely because it is explainable and auditable. Regulation is a modelling constraint here, not a footnote.',
        representativeSlugs: ['gradient-boosting', 'logistic-regression'],
      },
      'deep-learning': {
        verdict: 'situational',
        why: 'Earns its place where the structure is relational or sequential rather than tabular — graph networks over payment networks find rings that per-transaction features cannot, and sequence models capture behavioural drift within an account.',
        representativeSlugs: ['graph-neural-network', 'lstm'],
      },
      'generative-ai': {
        verdict: 'situational',
        why: 'Two real uses: synthesizing minority-class examples for a severely imbalanced training set, and density models that score novelty for fraud patterns never previously seen. Synthetic data must be validated carefully or it teaches the model an artefact.',
        representativeSlugs: ['vae', 'normalizing-flows'],
      },
      'reinforcement-learning': {
        verdict: 'rarely',
        why: 'The adversarial dynamic is genuinely sequential, but online exploration against real fraud means deliberately approving fraudulent transactions to learn from them — an unacceptable cost. Bandits appear only in low-stakes decisions like review routing.',
        representativeSlugs: ['multi-armed-bandits'],
      },
    },
    industryBaseline: 'Expert-authored rules. They are strong, explainable, and the incumbent a model must beat.',
    evaluationNorms: [
      'PR-AUC and recall at a fixed false-positive budget',
      'Value-weighted metrics — dollars prevented, not transactions flagged',
      'Strictly time-based splits; random splits leak future fraud patterns backwards',
    ],
    deploymentNorms: [
      'Champion/challenger with rules retained as a safety net',
      'Retrain frequently — adversaries adapt, so drift is by design',
      'Reason codes on every adverse decision, for regulatory and appeal purposes',
      'Account for label latency: recent data is not yet fully labelled',
    ],
  },
  {
    id: 'control-and-operations',
    label: 'Control & Operations',
    eyebrow: 'Applied ML · Breadth',
    featured: false,
    problemShape:
      'Physical or logistical systems with state, dynamics, hard constraints, and real consequences for failure. Actions change the state, safety is non-negotiable, and the objective spans a horizon rather than a single step — which is exactly where prediction stops being sufficient.',
    categoryFit: {
      'classical-ml': {
        verdict: 'strong',
        why: 'Supplies the demand and state estimates that the operational plan is built on, and classical state-space filtering is still how noisy sensor readings become a usable state estimate. Most "AI for operations" value is a good forecast feeding a conventional solver.',
        representativeSlugs: ['kalman-filter', 'arima'],
      },
      'deep-learning': {
        verdict: 'situational',
        why: 'Learned dynamics models where the physics is unknown or too expensive to simulate, and graph networks where the network topology itself is the structure — grids, road networks, supply chains.',
        representativeSlugs: ['spatio-temporal-gnn'],
      },
      'generative-ai': {
        verdict: 'rarely',
        why: 'No constraint guarantees and no optimality argument, which is disqualifying where safety binds. Scenario generation for stress-testing a plan is the legitimate narrow use.',
        representativeSlugs: ['time-series-diffusion'],
      },
      'reinforcement-learning': {
        verdict: 'default',
        why: 'The canonical application: state, actions, dynamics, and a long-horizon reward are the MDP definition. Model-based RL and MPC are the practical form, because a learned world model gives the sample efficiency that pure model-free RL lacks — and lets you check a plan before executing it.',
        representativeSlugs: ['model-based-rl', 'sac', 'ppo-trpo'],
      },
    },
    industryBaseline: 'A classical PID controller or a mixed-integer program over a point forecast.',
    evaluationNorms: [
      'Simulation before deployment, with an explicit sim-to-real gap estimate',
      'Constraint violations counted as hard failures, never averaged into a score',
      'Regret against the incumbent controller on matched conditions',
    ],
    deploymentNorms: [
      'A safety layer that can override the policy, always',
      'Shadow mode first — recommend before acting',
      'Bound actions to a validated operating envelope',
      'Monitor for distribution shift in the state space, not only in the reward',
    ],
  },
];
