import type { AiMlModel } from '../../types';

export const META_LEARNERS: AiMlModel = {
  slug: 'meta-learners',
  name: 'S / T / X Meta-Learners',
  aliases: ['Uplift modeling', 'CATE estimators', 'Heterogeneous treatment effects'],
  category: 'classical-ml',
  group: 'causal-estimation',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'ranking'],
  paradigmNote:
    'Supervised base learners wrapped in a causal estimator. The wrapper is what matters — the same gradient boosting that predicts an outcome becomes an effect estimator only because of how its predictions are differenced.',

  intuition:
    'IPTW gives you one average effect for everybody, which is useless when the decision is *whom to treat*. Meta-learners recover the effect as a function of covariates by taking any off-the-shelf regressor and differencing its predictions under treatment and control. The S-learner trains one model with treatment as a feature; the T-learner trains two separate models; the X-learner trains two, imputes each unit\'s missing potential outcome, and then models the imputed effects directly.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\tau(\\mathbf{x}) = \\mathbb{E}\\bigl[Y(1) - Y(0) \\mid \\mathbf{X} = \\mathbf{x}\\bigr], \\qquad \\hat{\\tau}_T(\\mathbf{x}) = \\hat{\\mu}_1(\\mathbf{x}) - \\hat{\\mu}_0(\\mathbf{x})',
      symbols: [
        { symbol: '\\tau(\\mathbf{x})', meaning: 'the conditional average treatment effect — the estimand' },
        { symbol: 'Y(1), Y(0)', meaning: 'potential outcomes; exactly one is ever observed per unit' },
        { symbol: '\\hat{\\mu}_1, \\hat{\\mu}_0', meaning: 'outcome models fit on the treated and control arms' },
      ],
    },
    reading:
      'The target is a difference of two things you can never both observe for the same unit — that is the fundamental problem of causal inference. The base learners are fit by their ordinary loss, and the causal step is purely the differencing. Nothing in the training objective knows about causality, which is exactly why the identification assumptions have to be argued separately.',
  },

  optimization: {
    method: 'Whatever the base learner uses, plus cross-fitting; the causal step is a difference of predictions',
    updateRule: {
      formula:
        '\\hat{\\tau}_X(\\mathbf{x}) = g(\\mathbf{x})\\,\\hat{\\tau}_0(\\mathbf{x}) + \\bigl(1-g(\\mathbf{x})\\bigr)\\,\\hat{\\tau}_1(\\mathbf{x})',
      symbols: [
        { symbol: '\\hat{\\tau}_1, \\hat{\\tau}_0', meaning: 'effect models fit on imputed effects within each arm' },
        { symbol: 'g(\\mathbf{x})', meaning: 'a weight, usually the propensity score, blending the two' },
      ],
    },
    rationale:
      'There is no new optimizer here — that is the point of the "meta" prefix. Which learner to choose is the real decision, and it is driven by arm sizes. The S-learner puts treatment in as one feature among many, so a regularized model can shrink its coefficient toward zero and report no effect regardless of the truth. The T-learner avoids that by construction but wastes data, since neither model sees the other arm. The X-learner exists for the common case of a small treated arm: it borrows strength across arms by imputing effects, then weights the two estimates by propensity so the better-estimated one dominates.',
    hyperparameters: [
      { name: 'base learner', role: 'Any regressor; boosting for tabular, linear when the effect must be explainable', typicalRange: 'GBM, random forest, or ridge' },
      { name: 'cross-fitting folds', role: 'Prevents the effect model from overfitting its own imputations', typicalRange: '2 to 10' },
      { name: 'learner variant', role: 'S when arms are balanced and the effect is large; X when the treated arm is small', typicalRange: 'S, T, or X' },
      { name: 'base-learner regularization', role: 'Tuned for effect stability, not outcome accuracy — these disagree', typicalRange: 'stronger than an outcome model would use' },
    ],
    convergence:
      'Inherits the base learner\'s behaviour, so it converges as reliably as boosting does. The failure mode is subtler and specific to causal work: the estimated effect surface can be almost entirely an artifact of the base learners\' regularization. An S-learner with strong shrinkage will report a near-zero effect everywhere and look perfectly well-converged doing it. Because the true effect is never observed, no training metric will tell you — which is why validation has to be against a randomized holdout rather than against loss.',
    complexity:
      'One base-learner fit for S, two for T, four for X, multiplied by the number of cross-fitting folds. Still cheap relative to the study design, but X-learner with 10 folds is 40 model fits.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The estimand is a contrast between potential outcomes for a unit, not a future value for a series. There is a real adjacent problem — the effect of an intervention on a time series — but that is interrupted time-series or synthetic control, which model the counterfactual trajectory explicitly rather than differencing two cross-sectional regressions.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'No notion of normality or deviation is involved. A unit with an extreme estimated effect is a targeting opportunity, not an anomaly, and treating it as one would invert the intended action.',
      },
      optimization: {
        fit: 'primary',
        how: 'This is the estimator that makes constrained targeting solvable. Rank units by estimated effect, then allocate a fixed budget top-down — or, when effects and costs both vary, feed the effect surface into a knapsack or LP as the objective coefficients.',
        where: [
          'Retention offers allocated across a customer base under a fixed budget',
          'Deciding which patients to enrol in a costly intervention with limited capacity',
          'Marketing spend allocation where the incremental response varies sharply by segment',
        ],
        why: 'The distinction that matters operationally: a predictive model ranks who will churn, and a causal one ranks who a treatment would *save*. Those rankings can be nearly disjoint — the customers most likely to leave are often the ones no offer will retain. Optimizing against the predictive ranking spends the budget on lost causes, and this is the single most valuable thing this entry teaches.',
        featurization: [
          'Include only pre-treatment covariates; anything measured after assignment is a collider',
          'Ensure the covariates driving effect variation are present, not just those driving the outcome',
          'Carry cost per unit alongside effect so the allocation optimizes effect per dollar',
        ],
        evaluation:
          'Qini and uplift curves on a randomized holdout, comparing the policy against uniform allocation. Never outcome accuracy — a model can predict outcomes perfectly and rank effects backwards.',
        pitfalls: [
          'Ranking by predicted outcome instead of predicted effect, which is the default mistake and quietly wastes the budget',
          'Effect estimates from one policy regime do not survive the policy change they justified',
          'Segment rankings often are not statistically distinguishable, so the top slice may be noise',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'primary',
        how: 'Fit base learners with cross-fitting, difference the predictions, and validate the resulting effect surface against a randomized holdout wherever one exists.',
        where: [
          'Personalized medicine, estimating which patients benefit from a therapy',
          'Uplift modeling in marketing, the field\'s most mature commercial application',
          'Policy targeting where a universal rollout is unaffordable',
        ],
        why: 'The right tool once the question moves from "did it work" to "for whom did it work". IPTW answers the first and is silent on the second — and an average effect of zero is entirely consistent with a large benefit in one segment and a large harm in another, which is a conclusion no average will ever surface.',
        featurization: [
          'Pre-treatment covariates only, with effect-modifiers explicitly included',
          'Cross-fit so the effect model never sees imputations built from its own training rows',
        ],
        evaluation:
          'Qini coefficient and calibration of predicted against realized uplift by decile, on randomized data. Sensitivity analysis for unmeasured confounding still applies.',
        pitfalls: [
          'S-learner regularization shrinking the treatment coefficient to zero and reporting no effect',
          'Reading effect heterogeneity that is really base-learner variance — check it replicates across folds',
          'Confusing a well-fit outcome model for a well-fit effect model',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Estimate which accounts a friction intervention actually protects, rather than which accounts are risky — the two populations overlap far less than teams expect.',
        where: [
          'Targeting step-up authentication where it prevents loss rather than where risk is highest',
          'Deciding which transactions manual review actually changes the outcome for',
        ],
        why: 'Friction has a real cost in abandoned legitimate transactions, so applying it to everyone risky is a net loss when most of those would not have converted to fraud anyway. Effect targeting is what makes the trade-off tractable.',
        featurization: [
          'The risk score at decision time is both a confounder and an effect modifier — include it as both',
          'Model the cost of friction per segment alongside the effect',
        ],
        evaluation: 'Uplift curves on a randomized-friction holdout, scored in dollars prevented net of abandoned volume.',
        pitfalls: [
          'Randomized holdouts are expensive here because the control arm means knowingly letting fraud through',
          'Adversarial adaptation invalidates the effect surface faster than in other domains',
        ],
      },
    },
  },

  deployment: {
    trainingCost: 'Minutes. One to four base-learner fits per cross-fitting fold; a 10-fold X-learner is 40 fits of a boosted model.',
    inferenceProfile:
      'Two model evaluations and a subtraction per unit — genuinely servable in real time, unlike most causal machinery.',
    retrainingCadence:
      'Whenever the treatment policy changes, which is more often than a calendar cadence. An effect surface estimated under one targeting rule does not describe the world after that rule is deployed.',
    driftAndMonitoring: [
      'Keep a permanent randomized holdout — it is the only way to keep measuring uplift once the policy is live',
      'Monitor realized versus predicted uplift by decile; calibration decays before ranking does',
      'Track the treated share by segment, since the policy itself shifts it and thereby shifts the estimand',
    ],
    productionGotchas: [
      'Teams routinely deploy the outcome ranking by mistake — it looks identical in the serving path and spends the budget on the wrong people',
      'Without a randomized holdout the model cannot be evaluated after launch at all, and reserving one is a product decision that has to be made before launch',
      'The effect surface is only valid over the covariate region the training data covered',
    ],
  },

  assumptions: [
    'Conditional ignorability — the confounders driving both treatment and outcome are all measured',
    'Positivity within every covariate region where an effect is claimed, not just on average',
    'Effect heterogeneity is actually driven by the covariates supplied to the base learners',
    'The base learners are flexible enough to model the outcome surface without imposing the effect shape',
  ],

  pros: [
    {
      point: 'Turns a causal question into a supervised one you already have tooling for',
      context:
        'You can reuse the same boosting stack, the same feature pipeline, and the same serving path. That practicality is why uplift modeling is deployed commercially far more often than more statistically elegant alternatives.',
    },
    {
      point: 'Estimates effects per unit, which is what a targeting decision needs',
      context:
        'The whole reason to reach past IPTW. Irrelevant if the decision is a single go/no-go on a universal rollout.',
    },
    {
      point: 'The X-learner handles severely imbalanced arms',
      context:
        'Decisive in the common real case of a small treated group and a large control pool, where a T-learner would fit the treated model on far too little data.',
    },
    {
      point: 'Cheap enough to serve in real time',
      context:
        'Two model calls and a subtraction, so effect-based targeting can happen at request time rather than in a nightly batch.',
    },
  ],

  cons: [
    {
      point: 'The effect surface can be an artifact of base-learner regularization',
      context:
        'The S-learner variant of this is notorious: shrink the treatment coefficient and the model reports no effect anywhere, convincingly. No training metric catches it, because the true effect is never observed.',
    },
    {
      point: 'Cannot be validated without randomized data',
      context:
        'Unlike a predictive model, there is no held-out ground truth — the counterfactual was never observed. A randomized holdout is the only real evaluation, and reserving one costs money.',
    },
    {
      point: 'Inherits every assumption of the observational design',
      context:
        'Flexible base learners create an illusion of rigour that has nothing to do with identification. Unmeasured confounding biases a gradient-boosted meta-learner exactly as much as a linear one.',
    },
    {
      point: 'Heterogeneity estimates are noisy',
      context:
        'Effects are differences, so their variance is roughly the sum of two model variances. Segment rankings routinely fail to replicate across folds — always check before acting on them.',
    },
  ],

  relatedSlugs: ['propensity-iptw', 'double-machine-learning', 'gradient-boosting'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""S-, T- and X-learners - the three differencing strategies, written out.

All three call the same base regressor. What differs is only HOW the
predictions are differenced, which is the entire idea behind "meta"-learner.
"""


def s_learner(fit, X, treatment, outcome):
    """One model, treatment as an extra feature.

    Cheapest, and the most fragile: treatment is one column among many, so a
    regularized base learner can shrink its influence toward zero and report
    no effect no matter what the truth is.
    """
    augmented = [row + [t] for row, t in zip(X, treatment)]
    model = fit(augmented, outcome)

    effects = []
    for row in X:
        under_treatment = model(row + [1])
        under_control = model(row + [0])
        effects.append(under_treatment - under_control)
    return effects


def t_learner(fit, X, treatment, outcome):
    """Two models, one per arm. Treatment cannot be regularized away, but
    neither model ever sees the other arm's data."""
    treated_X = [row for row, t in zip(X, treatment) if t == 1]
    treated_y = [y for y, t in zip(outcome, treatment) if t == 1]
    control_X = [row for row, t in zip(X, treatment) if t == 0]
    control_y = [y for y, t in zip(outcome, treatment) if t == 0]

    mu1 = fit(treated_X, treated_y)
    mu0 = fit(control_X, control_y)

    return [mu1(row) - mu0(row) for row in X]


def x_learner(fit, X, treatment, outcome, propensity):
    """Two arms, imputed effects, then blended by propensity.

    Built for a small treated arm: each unit's MISSING potential outcome is
    imputed from the other arm's model, so both arms contribute to both
    effect estimates instead of each being stranded in its own subset.
    """
    treated_X = [row for row, t in zip(X, treatment) if t == 1]
    treated_y = [y for y, t in zip(outcome, treatment) if t == 1]
    control_X = [row for row, t in zip(X, treatment) if t == 0]
    control_y = [y for y, t in zip(outcome, treatment) if t == 0]

    mu1 = fit(treated_X, treated_y)
    mu0 = fit(control_X, control_y)

    # Imputed individual effects, one per arm.
    d1 = [y - mu0(row) for row, y in zip(treated_X, treated_y)]
    d0 = [mu1(row) - y for row, y in zip(control_X, control_y)]

    tau1 = fit(treated_X, d1)
    tau0 = fit(control_X, d0)

    effects = []
    for row in X:
        g = propensity(row)
        # Weight toward whichever arm estimated its side more reliably.
        effects.append(g * tau0(row) + (1.0 - g) * tau1(row))
    return effects`,
        profile: 'One base fit for S, two for T, four for X. No cross-fitting, so X overfits its own imputations.',
      },
      'make-it-right': {
        code: `"""Meta-learners - typed, cross-fitted, with the variant chosen explicitly."""

from dataclasses import dataclass
from typing import Literal, Protocol

import numpy as np
from numpy.typing import NDArray
from sklearn.base import RegressorMixin, clone
from sklearn.model_selection import StratifiedKFold

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

LearnerKind = Literal["S", "T", "X"]


class Regressor(Protocol):
    def fit(self, X: Matrix, y: Vector) -> "Regressor": ...
    def predict(self, X: Matrix) -> Vector: ...


@dataclass(frozen=True)
class UpliftEstimate:
    """Effects plus what is needed to decide whether to believe them."""

    effects: Vector
    kind: LearnerKind
    fold_std: Vector          # cross-fold disagreement, per unit

    @property
    def is_stable(self) -> bool:
        """Heterogeneity that does not replicate across folds is base-learner
        variance wearing a causal costume."""
        spread = float(np.mean(self.fold_std))
        signal = float(np.std(self.effects))
        return signal > 2.0 * spread


def estimate_cate(
    base: RegressorMixin,
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    kind: LearnerKind = "T",
    folds: int = 5,
) -> UpliftEstimate:
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not np.isin(treatment, (0, 1)).all():
        raise ValueError("treatment must be binary 0/1")
    if treatment.sum() == 0 or treatment.sum() == len(treatment):
        raise ValueError("both arms must be non-empty")

    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=0)
    per_fold = np.empty((folds, X.shape[0]), dtype=np.float64)

    for fold, (train_idx, _) in enumerate(splitter.split(X, treatment)):
        per_fold[fold] = _fit_and_predict(
            base, X[train_idx], treatment[train_idx], outcome[train_idx], X, kind
        )

    return UpliftEstimate(
        effects=per_fold.mean(axis=0),
        kind=kind,
        fold_std=per_fold.std(axis=0),
    )


def _fit_and_predict(
    base: RegressorMixin,
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    score_X: Matrix,
    kind: LearnerKind,
) -> Vector:
    """clone() per arm, always: reusing a fitted estimator silently carries
    state from one arm into the other."""
    if kind == "S":
        augmented = np.column_stack([X, treatment])
        model = clone(base).fit(augmented, outcome)
        ones = np.column_stack([score_X, np.ones(len(score_X))])
        zeros = np.column_stack([score_X, np.zeros(len(score_X))])
        return model.predict(ones) - model.predict(zeros)

    treated, control = treatment == 1, treatment == 0
    mu1 = clone(base).fit(X[treated], outcome[treated])
    mu0 = clone(base).fit(X[control], outcome[control])

    if kind == "T":
        return mu1.predict(score_X) - mu0.predict(score_X)

    # X-learner: impute the missing potential outcome within each arm.
    d1 = outcome[treated] - mu0.predict(X[treated])
    d0 = mu1.predict(X[control]) - outcome[control]
    tau1 = clone(base).fit(X[treated], d1)
    tau0 = clone(base).fit(X[control], d0)

    g = float(treated.mean())
    return g * tau0.predict(score_X) + (1.0 - g) * tau1.predict(score_X)`,
        rationale:
          'Cross-fitting is added, which is what stops the X-learner\'s effect models from overfitting imputations built from their own training rows. The three variants collapse behind one validated entry point, base estimators are cloned per arm so no state leaks between them, and per-unit fold disagreement is returned — because heterogeneity that does not replicate across folds is base-learner variance, not a causal finding.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'scikit-learn',
        profile: 'folds x (1, 2 or 4) base fits. A 10-fold X-learner is 40 fits.',
      },
      'make-it-fast': {
        code: `"""Meta-learners - one augmented design matrix, folds fitted in parallel."""

import numpy as np
from joblib import Parallel, delayed
from numpy.typing import NDArray
from sklearn.base import clone
from sklearn.model_selection import StratifiedKFold

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def _prepare_counterfactual_designs(X: Matrix) -> tuple[Matrix, Matrix]:
    """Build the treated/control design matrices ONCE.

    The naive S-learner rebuilds both on every fold. Allocating them once and
    writing only the treatment column per call keeps the (n, d+1) copy out of
    the inner loop entirely.
    """
    n, d = X.shape
    ones = np.empty((n, d + 1), dtype=np.float64, order="C")
    zeros = np.empty((n, d + 1), dtype=np.float64, order="C")
    ones[:, :d] = X
    zeros[:, :d] = X
    ones[:, d] = 1.0
    zeros[:, d] = 0.0
    return ones, zeros


def estimate_cate_parallel(
    base,
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    folds: int = 5,
    n_jobs: int = -1,
) -> Vector:
    """Cross-fitted T-learner with folds fitted concurrently.

    Folds are completely independent - no shared state, no ordering - so this
    is the rare estimator where parallelism is free of correctness questions.
    """
    X = np.ascontiguousarray(X, dtype=np.float64)
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=0)

    def fit_fold(train_idx: NDArray[np.intp]) -> Vector:
        t = treatment[train_idx] == 1
        # Fancy indexing copies; doing it once per arm per fold beats
        # re-slicing inside the estimator's own internal loops.
        mu1 = clone(base).fit(X[train_idx][t], outcome[train_idx][t])
        mu0 = clone(base).fit(X[train_idx][~t], outcome[train_idx][~t])
        return mu1.predict(X) - mu0.predict(X)

    fold_effects = Parallel(n_jobs=n_jobs, prefer="processes")(
        delayed(fit_fold)(train_idx) for train_idx, _ in splitter.split(X, treatment)
    )

    return np.mean(np.asarray(fold_effects), axis=0)


def qini_curve(effects: Vector, treatment: Vector, outcome: Vector) -> Vector:
    """Cumulative incremental gain when units are ranked by predicted effect.

    argsort once, then two cumulative sums - the textbook definition would
    recompute a group mean at every cutoff, which is quadratic.
    """
    order = np.argsort(-effects)
    t, y = treatment[order], outcome[order]

    treated_response = np.cumsum(t * y)
    control_response = np.cumsum((1 - t) * y)
    treated_count = np.maximum(np.cumsum(t), 1)
    control_count = np.maximum(np.cumsum(1 - t), 1)

    return treated_response - control_response * (treated_count / control_count)`,
        rationale:
          'Three changes. The counterfactual design matrices are allocated once instead of rebuilt per fold. Folds are fitted in parallel processes, which is safe here because they share nothing. And the Qini curve — the metric this model is actually judged on — becomes two cumulative sums after a single argsort, replacing a textbook definition that recomputes a group mean at every cutoff and is quadratic.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The (n, d+1) counterfactual designs are built once and only the treatment column is rewritten, removing two full copies per fold.',
            tradeoff: 'Holds two extra (n, d+1) matrices for the whole call, so peak memory is roughly triple the design matrix.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The Qini curve becomes two cumulative sums over a sorted array instead of an O(n^2) loop recomputing group means at each cutoff.',
            tradeoff: 'The cumulative form is much harder to read than the definition it replaces, and an off-by-one in the ranking is silent.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Folds are dispatched to worker processes together; they are fully independent, so there is no synchronization cost at all.',
            tradeoff: 'Process-based parallelism pickles the design matrix to every worker, which dominates for small n and can exhaust memory for large n.',
          },
        ],
        libraryName: 'scikit-learn / joblib',
        profile: 'folds x 2 base fits, concurrent; Qini in O(n log n). Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// T-learner - two arm models, differenced. Written out.
#include <cstddef>
#include <functional>
#include <vector>

// A base learner is any callable that fits rows to targets and returns a
// predictor. The meta-learner never inspects it - that is the whole point.
using Predictor = std::function<double(const std::vector<double>&)>;
using Fitter = std::function<Predictor(const std::vector<std::vector<double>>&,
                                       const std::vector<double>&)>;

std::vector<double> TLearner(const Fitter& fit,
                             const std::vector<std::vector<double>>& X,
                             const std::vector<int>& treatment,
                             const std::vector<double>& outcome) {
  std::vector<std::vector<double>> treated_x, control_x;
  std::vector<double> treated_y, control_y;

  for (std::size_t i = 0; i < X.size(); ++i) {
    if (treatment[i] == 1) {
      treated_x.push_back(X[i]);
      treated_y.push_back(outcome[i]);
    } else {
      control_x.push_back(X[i]);
      control_y.push_back(outcome[i]);
    }
  }

  const Predictor mu1 = fit(treated_x, treated_y);
  const Predictor mu0 = fit(control_x, control_y);

  // The causal step is this subtraction and nothing else.
  std::vector<double> effects;
  effects.reserve(X.size());
  for (const auto& row : X) {
    effects.push_back(mu1(row) - mu0(row));
  }
  return effects;
}`,
        profile: 'Two base fits. Copies every row twice while partitioning the arms.',
      },
      'make-it-right': {
        code: `// T-learner - index-based partitioning, no row copies, validated up front.
#include <cstddef>
#include <functional>
#include <span>
#include <stdexcept>
#include <vector>

// X is row-major and flat: element (i, j) lives at x[i * d + j].
using FlatPredictor = std::function<double(std::span<const double>)>;
using FlatFitter = std::function<FlatPredictor(std::span<const double>,
                                               std::span<const std::size_t>,
                                               std::span<const double>,
                                               std::size_t)>;

class TLearner {
 public:
  TLearner(FlatFitter fitter, std::size_t covariate_count)
      : fitter_(std::move(fitter)), covariate_count_(covariate_count) {
    if (covariate_count_ == 0) {
      throw std::invalid_argument("need at least one covariate");
    }
  }

  [[nodiscard]] std::vector<double> Estimate(std::span<const double> x_flat,
                                             std::span<const int> treatment,
                                             std::span<const double> outcome) const {
    const std::size_t n = treatment.size();
    if (x_flat.size() != n * covariate_count_ || outcome.size() != n) {
      throw std::invalid_argument("X, treatment and outcome describe different cohorts");
    }

    // Partition by INDEX rather than by copying rows. At a wide covariate set
    // the naive version copies the whole design matrix twice before it fits
    // anything.
    std::vector<std::size_t> treated_idx, control_idx;
    treated_idx.reserve(n);
    control_idx.reserve(n);
    for (std::size_t i = 0; i < n; ++i) {
      (treatment[i] == 1 ? treated_idx : control_idx).push_back(i);
    }
    if (treated_idx.empty() || control_idx.empty()) {
      throw std::invalid_argument("both arms must be non-empty");
    }

    const FlatPredictor mu1 = fitter_(x_flat, treated_idx, outcome, covariate_count_);
    const FlatPredictor mu0 = fitter_(x_flat, control_idx, outcome, covariate_count_);

    std::vector<double> effects(n);
    for (std::size_t i = 0; i < n; ++i) {
      const std::span<const double> row(x_flat.data() + i * covariate_count_,
                                        covariate_count_);
      effects[i] = mu1(row) - mu0(row);
    }
    return effects;
  }

 private:
  FlatFitter fitter_;
  std::size_t covariate_count_;
};`,
        rationale:
          'The arms are partitioned by index rather than by copying rows, which matters because the naive version duplicates the entire design matrix before fitting anything. The flat row-major layout means a row is contiguous, shape validation happens once, and an empty arm is rejected rather than silently producing a degenerate model.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'Two base fits; two index vectors instead of two design-matrix copies.',
      },
      'make-it-fast': {
        code: `// T-learner - Eigen, both arm predictions batched, effects in one expression.
#include <Eigen/Dense>
#include <stdexcept>

// A batched predictor scores a whole design matrix at once. Scoring row by
// row is what makes the naive version slow: it is n matrix-vector products
// where one matrix-matrix product would do.
using BatchPredictor = std::function<Eigen::VectorXd(const Eigen::MatrixXd&)>;
using BatchFitter =
    std::function<BatchPredictor(const Eigen::MatrixXd&, const Eigen::VectorXd&)>;

Eigen::VectorXd TLearnerEffects(const BatchFitter& fit, const Eigen::MatrixXd& X,
                                const Eigen::ArrayXd& treatment,
                                const Eigen::VectorXd& outcome) {
  if (X.rows() != treatment.size() || X.rows() != outcome.size()) {
    throw std::invalid_argument("inputs describe different cohorts");
  }

  const Eigen::Index n = X.rows();
  Eigen::Index treated_count = 0;
  for (Eigen::Index i = 0; i < n; ++i) treated_count += (treatment(i) == 1.0);
  if (treated_count == 0 || treated_count == n) {
    throw std::invalid_argument("both arms must be non-empty");
  }

  // Gather each arm into a contiguous block once. A strided view would leave
  // the BLAS kernel chasing non-contiguous rows on every fit.
  Eigen::MatrixXd treated_x(treated_count, X.cols());
  Eigen::MatrixXd control_x(n - treated_count, X.cols());
  Eigen::VectorXd treated_y(treated_count), control_y(n - treated_count);

  Eigen::Index t = 0, c = 0;
  for (Eigen::Index i = 0; i < n; ++i) {
    if (treatment(i) == 1.0) {
      treated_x.row(t) = X.row(i);
      treated_y(t++) = outcome(i);
    } else {
      control_x.row(c) = X.row(i);
      control_y(c++) = outcome(i);
    }
  }

  const BatchPredictor mu1 = fit(treated_x, treated_y);
  const BatchPredictor mu0 = fit(control_x, control_y);

  // Both arms scored over the FULL cohort in one call each, then differenced
  // as a single vector expression.
  return mu1(X) - mu0(X);
}`,
        rationale:
          'Scoring moves from per-row to per-matrix, turning n matrix-vector products into one matrix-matrix product per arm. Each arm is gathered into a contiguous block once rather than accessed through a strided view, so the BLAS kernel underneath is not chasing scattered rows on every fit.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Batched scoring turns n matrix-vector products into one GEMM per arm, moving the work from memory-bound to compute-bound.',
            tradeoff: 'Requires the base learner to expose a batched predict; a row-at-a-time interface cannot benefit at all.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Gathering each arm into a contiguous block once means every subsequent pass streams sequentially instead of following a stride.',
            tradeoff: 'The gather is a full copy of the design matrix, so peak memory roughly doubles during the split.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The final difference evaluates as one expression with no intermediate vector materialized.',
            tradeoff: 'Storing that expression in auto rather than a VectorXd dangles once the operands go out of scope.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'Two batched fits and one fused difference. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! T-learner - two arm models, differenced. Written out.

/// A base learner is any closure that fits rows to targets and returns a
/// predictor. The meta-learner never looks inside it.
pub type Predictor<'a> = Box<dyn Fn(&[f64]) -> f64 + 'a>;

pub fn t_learner<'a, F>(
    fit: F,
    x: &[Vec<f64>],
    treatment: &[i32],
    outcome: &[f64],
) -> Vec<f64>
where
    F: Fn(&[Vec<f64>], &[f64]) -> Predictor<'a>,
{
    let mut treated_x = Vec::new();
    let mut treated_y = Vec::new();
    let mut control_x = Vec::new();
    let mut control_y = Vec::new();

    for i in 0..x.len() {
        if treatment[i] == 1 {
            treated_x.push(x[i].clone());
            treated_y.push(outcome[i]);
        } else {
            control_x.push(x[i].clone());
            control_y.push(outcome[i]);
        }
    }

    let mu1 = fit(&treated_x, &treated_y);
    let mu0 = fit(&control_x, &control_y);

    // The causal step is this subtraction and nothing more.
    let mut effects = Vec::new();
    for row in x {
        effects.push(mu1(row) - mu0(row));
    }
    effects
}`,
        profile: 'Two base fits. Clones every row while partitioning — a full copy of the design matrix.',
      },
      'make-it-right': {
        code: `//! T-learner - index partitioning, typed errors, borrowed flat design matrix.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum LearnerError {
    ShapeMismatch,
    EmptyArm,
    NonBinaryTreatment,
}

impl fmt::Display for LearnerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ShapeMismatch => write!(f, "inputs describe different cohorts"),
            Self::EmptyArm => write!(f, "both treatment arms must be non-empty"),
            Self::NonBinaryTreatment => write!(f, "treatment must be binary 0/1"),
        }
    }
}

impl std::error::Error for LearnerError {}

/// Fits from a flat row-major matrix restricted to the given row indices —
/// so an arm is a list of indices, never a copied sub-matrix.
pub trait ArmFitter {
    fn fit(&self, x: &[f64], rows: &[usize], y: &[f64], width: usize) -> Box<dyn Fn(&[f64]) -> f64>;
}

pub fn t_learner_effects(
    fitter: &dyn ArmFitter,
    x: &[f64],
    treatment: &[i32],
    outcome: &[f64],
    width: usize,
) -> Result<Vec<f64>, LearnerError> {
    let n = treatment.len();
    if width == 0 || x.len() != n * width || outcome.len() != n {
        return Err(LearnerError::ShapeMismatch);
    }
    if treatment.iter().any(|&t| t != 0 && t != 1) {
        return Err(LearnerError::NonBinaryTreatment);
    }

    // Partition by index. The naive version clones the whole design matrix
    // twice before it fits anything.
    let (treated, control): (Vec<usize>, Vec<usize>) =
        (0..n).partition(|&i| treatment[i] == 1);

    if treated.is_empty() || control.is_empty() {
        return Err(LearnerError::EmptyArm);
    }

    let mu1 = fitter.fit(x, &treated, outcome, width);
    let mu0 = fitter.fit(x, &control, outcome, width);

    Ok(x.chunks_exact(width).map(|row| mu1(row) - mu0(row)).collect())
}`,
        rationale:
          'The arms become index vectors rather than cloned sub-matrices, removing a full duplicate of the design matrix. The base learner is expressed as a trait taking a flat matrix plus row indices, failures become a typed Result checked before any fitting, and the effect pass is an iterator over chunks_exact so the rows stay borrowed.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Two base fits; two index vectors instead of two design-matrix clones.',
      },
      'make-it-fast': {
        code: `//! T-learner - folds fitted in parallel, effects reduced without collecting.

use rayon::prelude::*;

/// Cross-fitted T-learner with folds evaluated concurrently.
///
/// Folds are entirely independent — no shared mutable state, no ordering
/// requirement — so this parallelizes with no correctness argument needed,
/// which is unusual for an estimator.
pub fn crossfit_effects<F>(
    fit_fold: F,
    n_units: usize,
    folds: usize,
) -> Vec<f64>
where
    F: Fn(usize) -> Vec<f64> + Sync + Send,
{
    // fold-then-reduce rather than collect-then-average: each worker keeps one
    // running accumulator for its whole share, so peak memory is O(workers x n)
    // instead of O(folds x n).
    let summed = (0..folds)
        .into_par_iter()
        .fold(
            || vec![0.0_f64; n_units],
            |mut acc, fold| {
                for (slot, value) in acc.iter_mut().zip(fit_fold(fold)) {
                    *slot += value;
                }
                acc
            },
        )
        .reduce(
            || vec![0.0_f64; n_units],
            |mut a, b| {
                for (x, y) in a.iter_mut().zip(b) {
                    *x += y;
                }
                a
            },
        );

    let scale = 1.0 / folds as f64;
    summed.into_iter().map(|v| v * scale).collect()
}

/// Cumulative incremental gain when units are ranked by predicted effect.
///
/// One sort, then a single running pass. The textbook definition recomputes a
/// group mean at every cutoff, which is quadratic in the cohort size.
pub fn qini_curve(effects: &[f64], treatment: &[i32], outcome: &[f64]) -> Vec<f64> {
    let mut order: Vec<usize> = (0..effects.len()).collect();
    order.sort_unstable_by(|&a, &b| effects[b].total_cmp(&effects[a]));

    let (mut t_resp, mut c_resp, mut t_n, mut c_n) = (0.0, 0.0, 0.0, 0.0);
    order
        .into_iter()
        .map(|i| {
            if treatment[i] == 1 {
                t_resp += outcome[i];
                t_n += 1.0;
            } else {
                c_resp += outcome[i];
                c_n += 1.0;
            }
            t_resp - c_resp * (t_n / c_n.max(1.0))
        })
        .collect()
}`,
        rationale:
          'Folds run concurrently and are combined with fold-then-reduce rather than collect-then-average, so each worker holds one accumulator for its whole share instead of every fold\'s full effect vector living at once. The Qini curve becomes one sort plus a single running pass, replacing a definition that is quadratic in the cohort size.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Cross-fitting folds share nothing and have no ordering requirement, so they partition across cores with no synchronization.',
            tradeoff: 'The base learner must be Sync + Send, which rules out fitters holding interior-mutable state.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'fold gives each worker a single pre-sized accumulator, so peak memory is O(workers x n) rather than O(folds x n).',
            tradeoff: 'Per-fold effect vectors are no longer retained, so fold-to-fold disagreement — the stability diagnostic — cannot be computed without a second pass.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The zipped accumulate and the single-pass Qini keep the compiler able to prove index validity, dropping bounds checks from both hot loops.',
            tradeoff: 'total_cmp on the sort is correct for NaN but slower than a raw partial_cmp unwrap — a deliberate correctness-for-speed trade.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Folds across cores; Qini in O(n log n). Illustrative, not a measured benchmark.',
      },
    },
  },
};
