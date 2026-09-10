import type { AiMlModel } from '../../types';

export const PROPENSITY_IPTW: AiMlModel = {
  slug: 'propensity-iptw',
  name: 'Propensity Scores & IPTW',
  aliases: ['Inverse probability of treatment weighting', 'Propensity score matching'],
  category: 'classical-ml',
  group: 'causal-estimation',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression'],
  paradigmNote:
    'Supervised in mechanism only. The fitted model predicts treatment assignment, which is a means to an end — the estimand is an effect, and a propensity model with suspiciously good accuracy is a warning sign, not a success.',

  intuition:
    'In an observational study the treated and untreated groups differ before treatment ever happens, so comparing their outcomes measures the difference between the groups as much as the effect of the treatment. Fit a model that predicts who got treated, then reweight everyone by the inverse of that probability. People who were unlikely to be treated but were count for more, and vice versa — the reweighted population looks as if treatment had been assigned at random.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        'e(\\mathbf{x}) = P(T = 1 \\mid \\mathbf{X} = \\mathbf{x}), \\qquad \\hat{\\tau}_{\\text{IPTW}} = \\frac{1}{n}\\sum_{i=1}^{n}\\left[ \\frac{T_i Y_i}{e(\\mathbf{x}_i)} - \\frac{(1-T_i) Y_i}{1 - e(\\mathbf{x}_i)} \\right]',
      symbols: [
        { symbol: 'e(\\mathbf{x})', meaning: 'the propensity score — probability of treatment given covariates' },
        { symbol: 'T_i', meaning: 'treatment indicator, 1 if treated' },
        { symbol: 'Y_i', meaning: 'observed outcome — only one potential outcome is ever seen' },
        { symbol: '\\hat{\\tau}', meaning: 'the estimated average treatment effect' },
      ],
    },
    reading:
      'Fit the propensity model by ordinary maximum likelihood, then form the effect as a weighted difference of means. The weights are what does the work: dividing by the probability of the treatment you actually received upweights the people who look like the other group, which is how the two arms are made comparable.',
  },

  optimization: {
    method: 'Maximum likelihood for the propensity model, then a weighted mean difference — no joint optimization',
    updateRule: {
      formula:
        'w_i = \\frac{T_i}{e(\\mathbf{x}_i)} + \\frac{1 - T_i}{1 - e(\\mathbf{x}_i)}, \\qquad \\hat{\\tau} = \\frac{\\sum_i w_i T_i Y_i}{\\sum_i w_i T_i} - \\frac{\\sum_i w_i (1-T_i) Y_i}{\\sum_i w_i (1-T_i)}',
      symbols: [
        { symbol: 'w_i', meaning: 'the inverse-probability weight for unit i' },
        { symbol: '1/e(\\mathbf{x}_i)', meaning: 'blows up as the propensity approaches 0 — the central practical problem' },
      ],
    },
    rationale:
      'This is a two-stage procedure, not one optimization, and the stages have different goals. Stage one is a plain classifier fit by maximum likelihood. Stage two is arithmetic. The crucial and counter-intuitive point is that the propensity model should be well *calibrated*, not accurate: a model that predicts treatment perfectly means some units had propensity near 0 or 1, their weights explode, and the estimator\'s variance goes with them. Near-perfect separation is a sign that positivity has failed, not that the model is good.',
    hyperparameters: [
      { name: 'weight truncation / trimming', role: 'Caps extreme weights, trading a little bias for a lot of variance', typicalRange: 'trim at the 1st/99th percentile, or cap at 10' },
      { name: 'stabilization', role: 'Multiplies weights by the marginal treatment probability, shrinking their variance', typicalRange: 'on by default' },
      { name: 'propensity model class', role: 'Logistic regression by default; a flexible model risks extreme scores', typicalRange: 'logistic, or shallow GBM' },
      { name: 'common-support window', role: 'Discards units with no counterpart in the other arm', typicalRange: 'drop e outside [0.05, 0.95]' },
    ],
    convergence:
      'The propensity fit is convex under logistic regression and converges reliably. The estimator itself has no convergence to speak of — it is a weighted mean. What it does have is a variance that can be enormous: a single unit with propensity 0.001 receives a weight of 1000 and can single-handedly determine the estimate. The failure is not that the number fails to appear; it is that a plausible-looking number appears with an interval so wide it is uninformative, or worse, an interval computed as if the weights were fixed rather than estimated, which understates it badly.',
    complexity:
      'O(nd) per iteration for the logistic fit, then O(n) for the weighted means. Negligible cost — the expensive part of causal work is the study design, not the arithmetic.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The estimand is a contrast between potential outcomes at a point in time, not a future value. Applying IPTW to a series would answer "what would this period have looked like under the other treatment", which is a counterfactual question, not a forecast — and the weighting machinery assumes exchangeable units, which consecutive observations of one series emphatically are not.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'There is no notion of an outlier here, only of a unit with an extreme propensity — and such a unit is a threat to the estimator rather than a finding to report. Trimming discards it precisely so it does not dominate; an anomaly detector would surface it as the answer.',
      },
      optimization: {
        fit: 'viable',
        how: 'Supplies the effect estimate a targeting policy optimizes over: once you know the treatment effect varies by segment, allocating a fixed budget to the highest-effect segments is a constrained optimization whose objective this estimator produces.',
        where: [
          'Marketing budget allocation across segments with heterogeneous response',
          'Deciding which patients to enrol in a costly intervention under a capacity constraint',
        ],
        why: 'The link between causal estimation and optimization is direct and frequently missed: you cannot optimize an intervention you have only measured correlationally. A predictive churn model tells you who will leave; only an effect estimate tells you whom a retention offer would actually save, and that is the quantity the allocation problem needs.',
        featurization: [
          'Estimate effects per segment, not just the population average — the allocation needs the variation',
          'Carry the standard error through; a large effect with a huge interval should not win the budget',
        ],
        evaluation:
          'Qini and uplift curves against a randomized holdout, comparing the policy against uniform allocation rather than against no allocation.',
        pitfalls: [
          'Optimizing against a point estimate ignores that the ranking between segments may not be statistically distinguishable',
          'Effects estimated under one policy regime do not transfer once the policy changes them',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'primary',
        how: 'The canonical workhorse. Fit the treatment model on pre-treatment covariates only, check the weighted covariate balance, trim to common support, then form the weighted contrast with a robust or bootstrapped variance.',
        where: [
          'Observational health studies where randomization is unethical or impossible',
          'Post-hoc evaluation of a feature rollout that was not A/B tested',
          'Policy evaluation on administrative data where the treatment was self-selected',
        ],
        why: 'It is the default because it separates the design from the outcome cleanly: you can fit the propensity model, check balance, and finalize the whole specification without ever looking at the outcome — which removes the temptation to tune until the answer is the one you wanted. That property is procedural rather than statistical, and it is why practitioners trust it.',
        featurization: [
          'Pre-treatment covariates ONLY — a post-treatment variable is a collider and induces bias',
          'Include anything affecting both treatment and outcome, even if it does not improve fit',
          'Check standardized mean differences after weighting; below 0.1 is the usual bar',
        ],
        evaluation:
          'Weighted covariate balance first, before any effect is read. Then sensitivity analysis for unmeasured confounding, and negative-control outcomes that should show no effect.',
        pitfalls: [
          'Conditioning on a post-treatment variable or a collider creates bias rather than removing it',
          'Positivity violations show up as extreme weights, and trimming them silently changes the population you are estimating for',
          'Naive standard errors ignore that the weights were estimated, and are too narrow',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Estimates what an intervention actually did rather than what correlates with it — the effect of a manual review, a step-up authentication, or a hold, on the outcome.',
        where: [
          'Measuring whether a fraud-review queue reduced losses or just delayed transactions',
          'Evaluating a rule change that was rolled out without a control group',
        ],
        why: 'Necessary here because interventions are rarely randomized in fraud — you review the suspicious ones, which is the definition of confounded assignment. Without reweighting, reviewed transactions look worse than unreviewed ones and the review appears harmful.',
        featurization: [
          'The risk score at decision time is the dominant confounder and must be included',
          'Time-varying treatment needs marginal structural models rather than a single weight',
        ],
        evaluation: 'Balance on the pre-decision risk distribution, plus a negative-control period where no intervention occurred.',
        pitfalls: [
          'The score that drove the decision is often not logged at decision time, only recomputed later',
          'Adversarial adaptation means the effect measured last quarter may not hold this one',
        ],
      },
    },
  },

  deployment: {
    trainingCost: 'Seconds. The propensity model is a logistic regression on a modest covariate set.',
    inferenceProfile:
      'Rarely "deployed" in the serving sense — this runs as an offline analysis producing an estimate and an interval, not a per-request prediction.',
    retrainingCadence:
      'Re-estimated per analysis. Effects are not stable across policy regimes, so a stored estimate has a shelf life measured in policy changes, not months.',
    driftAndMonitoring: [
      'Track the weight distribution across runs — a lengthening tail means positivity is degrading',
      'Re-check covariate balance every time; a new data source can silently break it',
      'Watch for the treated share shifting, which changes what the estimand even refers to',
    ],
    productionGotchas: [
      'Analysts routinely report naive standard errors that ignore the estimated weights, understating uncertainty',
      'Trimming changes the estimand from the population effect to the effect on the trimmed subpopulation — say which one you are reporting',
      'A propensity model with high AUC is bad news, not good; it means the arms barely overlap',
    ],
  },

  assumptions: [
    'Conditional ignorability — all confounders affecting both treatment and outcome are measured and included',
    'Positivity — every unit had a non-zero chance of either treatment, so the weights are finite',
    'Consistency / SUTVA — one unit\'s treatment does not affect another\'s outcome, and the treatment is well defined',
    'The propensity model is correctly specified, or at least well calibrated where it matters',
  ],

  pros: [
    {
      point: 'Design and outcome analysis are cleanly separated',
      context:
        'You can finalize the entire specification while blind to the outcome, which removes a whole class of p-hacking. This procedural guarantee is why practitioners trust it more than outcome-regression alternatives of equal statistical merit.',
    },
    {
      point: 'Covariate balance is directly checkable',
      context:
        'Unlike a black-box adjustment, you can look at the weighted covariate distributions and see whether the method worked before trusting the effect. Diagnostic transparency matters more than accuracy in regulated and clinical settings.',
    },
    {
      point: 'One weighted dataset serves many outcomes',
      context:
        'Fit weights once, then estimate effects on any number of outcomes — efficient when a single intervention has multiple endpoints. Irrelevant for a one-outcome study.',
    },
    {
      point: 'Trivially cheap to compute',
      context:
        'The bottleneck in causal work is never the arithmetic. Being fast means iteration is free and sensitivity analyses are not rationed.',
    },
  ],

  cons: [
    {
      point: 'Extreme weights inflate variance without warning',
      context:
        'A single unit with propensity 0.001 can dominate the estimate. The point estimate still looks reasonable, which is exactly why this is dangerous — always inspect the weight distribution.',
    },
    {
      point: 'Conditional ignorability is untestable',
      context:
        'The central assumption cannot be checked from the data, only argued from domain knowledge. This is the honest ceiling on every observational method, and it is why a randomized experiment still wins whenever it is possible.',
    },
    {
      point: 'Sensitive to propensity model misspecification',
      context:
        'A single-model method has one point of failure. This is precisely what doubly-robust methods and Double ML were built to fix, so reach for them when the specification is uncertain.',
    },
    {
      point: 'Estimates an average, hiding heterogeneity',
      context:
        'A zero average effect is consistent with a large positive effect in one segment and a large negative one in another. When the decision is who to target rather than whether to act, you need a meta-learner instead.',
    },
  ],

  relatedSlugs: ['meta-learners', 'double-machine-learning', 'logistic-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Propensity scores and IPTW - the two stages, written out.

Stage 1: a logistic regression predicting WHO GOT TREATED.
Stage 2: a difference of means, weighted by the inverse of that probability.
"""

import math


def fit_propensity(X, treatment, lr=0.05, epochs=2_000):
    """Plain logistic regression by gradient ascent on the log-likelihood."""
    n = len(X)
    d = len(X[0])
    beta = [0.0] * d

    for _ in range(epochs):
        grad = [0.0] * d
        for i in range(n):
            z = sum(beta[j] * X[i][j] for j in range(d))
            p = 1.0 / (1.0 + math.exp(-z))
            residual = treatment[i] - p          # ascent, so t - p not p - t
            for j in range(d):
                grad[j] += residual * X[i][j]
        for j in range(d):
            beta[j] += lr * grad[j] / n

    return beta


def propensity(x, beta):
    z = sum(b * v for b, v in zip(beta, x))
    return 1.0 / (1.0 + math.exp(-z))


def iptw_effect(X, treatment, outcome, beta, clip=0.01):
    """Weighted difference of means.

    Clipping is not optional tidying: a propensity of 0.001 produces a weight
    of 1000, and that single unit would otherwise decide the answer.
    """
    treated_num = treated_den = control_num = control_den = 0.0

    for x, t, y in zip(X, treatment, outcome):
        e = min(max(propensity(x, beta), clip), 1.0 - clip)
        if t == 1:
            w = 1.0 / e
            treated_num += w * y
            treated_den += w
        else:
            w = 1.0 / (1.0 - e)
            control_num += w * y
            control_den += w

    return treated_num / treated_den - control_num / control_den`,
        profile: 'O(n·d) per epoch in pure Python. Correct, and it silently hides the weight distribution.',
      },
      'make-it-right': {
        code: `"""IPTW - typed, with the diagnostics that decide whether to trust the estimate."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from sklearn.linear_model import LogisticRegression

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class CausalEstimate:
    """An effect is never a bare number - it travels with its diagnostics."""

    ate: float
    std_error: float
    max_weight: float
    effective_sample_size: float
    trimmed_fraction: float

    @property
    def is_trustworthy(self) -> bool:
        """Cheap guard against the two failures that matter in practice."""
        return self.max_weight < 20.0 and self.trimmed_fraction < 0.10


def estimate_ate(
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    trim: tuple[float, float] = (0.05, 0.95),
) -> CausalEstimate:
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not (X.shape[0] == treatment.shape[0] == outcome.shape[0]):
        raise ValueError("X, treatment and outcome must describe the same units")
    if not np.isin(treatment, (0, 1)).all():
        raise ValueError("treatment must be binary 0/1")

    model = LogisticRegression(max_iter=1_000)
    model.fit(X, treatment)
    scores = model.predict_proba(X)[:, 1]

    # Common support: a unit with no counterpart in the other arm cannot be
    # compared to anything, and keeping it just manufactures variance.
    low, high = trim
    keep = (scores > low) & (scores < high)
    trimmed_fraction = 1.0 - float(keep.mean())

    scores, t, y = scores[keep], treatment[keep], outcome[keep]

    # Stabilized weights: scaling by the marginal treatment probability keeps
    # the weights centred near 1, which materially reduces their variance.
    marginal = t.mean()
    weights = np.where(t == 1, marginal / scores, (1 - marginal) / (1 - scores))

    treated_mean = np.average(y[t == 1], weights=weights[t == 1])
    control_mean = np.average(y[t == 0], weights=weights[t == 0])
    ate = float(treated_mean - control_mean)

    # Kish effective sample size - how much data the weighting actually left.
    ess = float(weights.sum() ** 2 / np.square(weights).sum())
    std_error = float(np.sqrt(np.var(y) / ess))

    return CausalEstimate(
        ate=ate,
        std_error=std_error,
        max_weight=float(weights.max()),
        effective_sample_size=ess,
        trimmed_fraction=trimmed_fraction,
    )


def standardized_mean_differences(X: Matrix, treatment: Vector, weights: Vector) -> Vector:
    """Balance check. Read this BEFORE the effect - if the covariates are not
    balanced, the effect is measuring the imbalance."""
    t = treatment == 1
    diffs = np.average(X[t], axis=0, weights=weights[t]) - np.average(
        X[~t], axis=0, weights=weights[~t]
    )
    pooled_sd = np.sqrt((X[t].var(axis=0) + X[~t].var(axis=0)) / 2.0)
    return diffs / np.where(pooled_sd == 0, 1.0, pooled_sd)`,
        rationale:
          'The estimate stops being a bare float and becomes a value object carrying the diagnostics that decide whether to believe it — max weight, effective sample size, trimmed fraction. Stabilized weights and explicit common-support trimming replace naive clipping, and a balance check is provided because the effect is meaningless until the covariates balance.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'scikit-learn / NumPy',
        profile: 'One vectorized logistic fit plus O(n) weighted reductions.',
      },
      'make-it-fast': {
        code: `"""IPTW - cross-fitted propensities and a bootstrap that reuses one draw matrix."""

import numpy as np
from numpy.typing import NDArray
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def crossfit_propensity(X: Matrix, treatment: Vector, folds: int = 5) -> Vector:
    """Out-of-fold propensity scores.

    A propensity fitted on the same rows it scores is overfitted toward the
    observed assignment, which biases the weights toward 1 and understates the
    correction. Cross-fitting removes that at the cost of one extra pass.
    """
    scores = np.empty(X.shape[0], dtype=np.float64)
    splitter = StratifiedKFold(n_splits=folds, shuffle=True, random_state=0)

    for train_idx, test_idx in splitter.split(X, treatment):
        model = LogisticRegression(max_iter=1_000)
        model.fit(X[train_idx], treatment[train_idx])
        scores[test_idx] = model.predict_proba(X[test_idx])[:, 1]

    return scores


def bootstrap_ate(
    scores: Vector,
    treatment: Vector,
    outcome: Vector,
    draws: int = 1_000,
    rng: np.random.Generator | None = None,
) -> tuple[float, float]:
    """Bootstrap CI over a resample index matrix rather than a Python loop.

    Drawing all \`draws\` resamples at once turns 1000 sequential O(n) passes
    into a handful of vectorized reductions over one (draws, n) matrix.
    """
    generator = rng if rng is not None else np.random.default_rng(0)
    n = outcome.shape[0]

    marginal = treatment.mean()
    weights = np.where(treatment == 1, marginal / scores, (1 - marginal) / (1 - scores))

    # One (draws, n) index matrix; every resample is a row.
    idx = generator.integers(0, n, size=(draws, n))
    w = weights[idx]
    t = treatment[idx]
    y = outcome[idx]

    # Masked weighted means, computed for all draws in two reductions.
    wt = w * t
    wc = w * (1.0 - t)
    treated = (wt * y).sum(axis=1) / np.maximum(wt.sum(axis=1), 1e-12)
    control = (wc * y).sum(axis=1) / np.maximum(wc.sum(axis=1), 1e-12)

    effects = treated - control
    return float(effects.mean()), float(effects.std(ddof=1))`,
        rationale:
          'Two changes, both about correctness under speed. Propensities are cross-fitted, because a model scoring the rows it trained on produces weights biased toward no correction at all. And the bootstrap — which is the only honest way to get an interval that accounts for the weights being estimated — vectorizes over one resample-index matrix instead of looping.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The bootstrap becomes reductions over a single (draws, n) matrix rather than `draws` sequential passes, which is the difference between seconds and minutes at 1000 draws.',
            tradeoff: 'Peak memory is O(draws · n); at a million rows and a thousand draws this will not fit, and the loop has to come back in chunks.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The masked weighted means become two array reductions covering every bootstrap draw at once.',
            tradeoff: 'The masked form computes both arms over the full width including zeroed entries, so it does roughly twice the arithmetic of a compacted loop — still far faster because it is vectorized.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One generator call produces every resample index, avoiding 1000 separate RNG invocations.',
            tradeoff: 'All draws share one RNG state, so reproducing a single draw in isolation for debugging is no longer straightforward.',
          },
        ],
        libraryName: 'NumPy / scikit-learn',
        profile: 'One cross-fitted logistic pass plus vectorized bootstrap. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Propensity scores and IPTW - the two stages, written out.
#include <cmath>
#include <cstddef>
#include <vector>

namespace {

double Sigmoid(double z) { return 1.0 / (1.0 + std::exp(-z)); }

}  // namespace

// Stage 1: logistic regression predicting who got treated.
std::vector<double> FitPropensity(const std::vector<std::vector<double>>& X,
                                  const std::vector<int>& treatment,
                                  double lr, int epochs) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> beta(d, 0.0);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::vector<double> grad(d, 0.0);
    for (std::size_t i = 0; i < n; ++i) {
      double z = 0.0;
      for (std::size_t j = 0; j < d; ++j) z += beta[j] * X[i][j];
      const double residual = treatment[i] - Sigmoid(z);   // ascent
      for (std::size_t j = 0; j < d; ++j) grad[j] += residual * X[i][j];
    }
    for (std::size_t j = 0; j < d; ++j) beta[j] += lr * grad[j] / static_cast<double>(n);
  }
  return beta;
}

// Stage 2: a weighted difference of means. Clipping keeps one near-zero
// propensity from producing a weight of 1000 and deciding the answer alone.
double IptwEffect(const std::vector<std::vector<double>>& X,
                  const std::vector<int>& treatment,
                  const std::vector<double>& outcome,
                  const std::vector<double>& beta,
                  double clip) {
  double t_num = 0.0, t_den = 0.0, c_num = 0.0, c_den = 0.0;

  for (std::size_t i = 0; i < X.size(); ++i) {
    double z = 0.0;
    for (std::size_t j = 0; j < beta.size(); ++j) z += beta[j] * X[i][j];
    double e = Sigmoid(z);
    if (e < clip) e = clip;
    if (e > 1.0 - clip) e = 1.0 - clip;

    if (treatment[i] == 1) {
      const double w = 1.0 / e;
      t_num += w * outcome[i];
      t_den += w;
    } else {
      const double w = 1.0 / (1.0 - e);
      c_num += w * outcome[i];
      c_den += w;
    }
  }

  return t_num / t_den - c_num / c_den;
}`,
        profile: 'O(n·d) per epoch. Recomputes every propensity a second time in stage 2.',
      },
      'make-it-right': {
        code: `// IPTW - flat storage, diagnostics returned with the estimate, validated up front.
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

struct CausalEstimate {
  double ate;
  double max_weight;
  double effective_sample_size;
  double trimmed_fraction;

  // The two failures that actually invalidate an IPTW estimate in practice.
  [[nodiscard]] bool IsTrustworthy() const noexcept {
    return max_weight < 20.0 && trimmed_fraction < 0.10;
  }
};

class IptwEstimator {
 public:
  // X is row-major and flat: element (i, j) lives at x[i * d + j].
  IptwEstimator(std::size_t covariate_count, double trim_low, double trim_high)
      : covariate_count_(covariate_count), trim_low_(trim_low), trim_high_(trim_high) {
    if (covariate_count_ == 0) {
      throw std::invalid_argument("need at least one covariate");
    }
    if (!(trim_low_ > 0.0 && trim_high_ < 1.0 && trim_low_ < trim_high_)) {
      throw std::invalid_argument("trim bounds must satisfy 0 < low < high < 1");
    }
  }

  // Propensity scores are computed ONCE by the caller and passed in - the
  // naive version recomputes every score in stage two, which is both wasted
  // work and a chance for the two stages to silently disagree.
  [[nodiscard]] CausalEstimate Estimate(std::span<const double> scores,
                                        std::span<const int> treatment,
                                        std::span<const double> outcome) const {
    if (scores.size() != treatment.size() || scores.size() != outcome.size()) {
      throw std::invalid_argument("scores, treatment and outcome must be the same length");
    }
    if (scores.empty()) {
      throw std::invalid_argument("cannot estimate an effect from zero units");
    }

    const double marginal = MarginalTreatmentRate(treatment);

    double t_num = 0.0, t_den = 0.0, c_num = 0.0, c_den = 0.0;
    double weight_sum = 0.0, weight_sq_sum = 0.0, max_weight = 0.0;
    std::size_t kept = 0;

    for (std::size_t i = 0; i < scores.size(); ++i) {
      const double e = scores[i];
      if (e <= trim_low_ || e >= trim_high_) continue;   // outside common support
      ++kept;

      // Stabilized weights: scaling by the marginal rate keeps them near 1.
      const double w = treatment[i] == 1 ? marginal / e : (1.0 - marginal) / (1.0 - e);
      weight_sum += w;
      weight_sq_sum += w * w;
      if (w > max_weight) max_weight = w;

      if (treatment[i] == 1) {
        t_num += w * outcome[i];
        t_den += w;
      } else {
        c_num += w * outcome[i];
        c_den += w;
      }
    }

    if (t_den == 0.0 || c_den == 0.0) {
      throw std::invalid_argument("one arm is empty after trimming to common support");
    }

    const double total = static_cast<double>(scores.size());
    return CausalEstimate{
        t_num / t_den - c_num / c_den,
        max_weight,
        weight_sum * weight_sum / weight_sq_sum,     // Kish effective sample size
        1.0 - static_cast<double>(kept) / total,
    };
  }

 private:
  static double MarginalTreatmentRate(std::span<const int> treatment) noexcept {
    const double treated = std::accumulate(treatment.begin(), treatment.end(), 0.0);
    return treated / static_cast<double>(treatment.size());
  }

  std::size_t covariate_count_;
  double trim_low_;
  double trim_high_;
};`,
        rationale:
          'Propensity scores are computed once and passed in as a span rather than recomputed inside the estimator, which removes both the duplicated work and the possibility of the two stages disagreeing. The bare double becomes a struct carrying the diagnostics that determine whether the estimate means anything, and the degenerate case of an empty arm after trimming now throws instead of dividing by zero.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'One pass over the units; no allocation beyond the caller-owned inputs.',
      },
      'make-it-fast': {
        code: `// IPTW - Eigen, fully vectorized, single fused pass over the cohort.
#include <Eigen/Dense>
#include <stdexcept>

struct CausalEstimate {
  double ate;
  double max_weight;
  double effective_sample_size;
};

// Scores, treatment and outcome as aligned arrays. Every step below is a
// whole-array expression, so the cohort is traversed a handful of times
// instead of once per unit with a branch in the middle.
CausalEstimate EstimateAte(const Eigen::ArrayXd& scores,
                           const Eigen::ArrayXd& treatment,
                           const Eigen::ArrayXd& outcome,
                           double trim_low, double trim_high) {
  if (scores.size() != treatment.size() || scores.size() != outcome.size()) {
    throw std::invalid_argument("inputs must be the same length");
  }

  // Branchless common-support mask: a 0/1 array multiplied through, rather
  // than a conditional inside the loop that would defeat vectorization.
  const Eigen::ArrayXd in_support =
      ((scores > trim_low) && (scores < trim_high)).cast<double>();

  const double marginal = (treatment * in_support).sum() / in_support.sum();

  // Stabilized weights for both arms in one expression - select() keeps this
  // as a single fused traversal rather than two masked passes.
  const Eigen::ArrayXd weights =
      in_support * (treatment == 1.0)
                       .select(marginal / scores,
                               (1.0 - marginal) / (1.0 - scores));

  const Eigen::ArrayXd treated_w = weights * treatment;
  const Eigen::ArrayXd control_w = weights * (1.0 - treatment);

  const double treated_den = treated_w.sum();
  const double control_den = control_w.sum();
  if (treated_den == 0.0 || control_den == 0.0) {
    throw std::invalid_argument("one arm is empty after trimming");
  }

  const double ate = (treated_w * outcome).sum() / treated_den -
                     (control_w * outcome).sum() / control_den;

  const double weight_sum = weights.sum();
  return CausalEstimate{ate, weights.maxCoeff(),
                        weight_sum * weight_sum / weights.square().sum()};
}`,
        rationale:
          'The per-unit loop with a branch in the middle becomes whole-array expressions. The branch is the important part: a conditional inside the hot loop defeats vectorization entirely, so common support becomes a 0/1 mask multiplied through and the arm split becomes a select(), leaving the compiler a straight-line traversal it can actually vectorize.',
        optimizations: [
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Replacing the per-unit branch with a multiplied 0/1 mask and a select() gives the compiler straight-line array code, which it can vectorize; a data-dependent branch inside the loop cannot be.',
            tradeoff: 'Every unit is now processed even when trimmed out, so at heavy trimming this does more arithmetic than the branching version — and still wins, because the arithmetic is vectorized.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The weight construction composes mask, select, and scaling into one traversal instead of materializing three intermediate arrays.',
            tradeoff: 'Holding such an expression in auto rather than a concrete ArrayXd produces a dangling reference — the standard Eigen hazard.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The weighted sums and the effective-sample-size reduction each collapse into single fused reductions with no intermediate storage.',
            tradeoff: 'Per-unit weights can no longer be inspected without unfusing the expression, which makes diagnosing a suspicious estimate harder.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'A handful of fused array traversals over the cohort. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Propensity scores and IPTW - the two stages, written out.

fn sigmoid(z: f64) -> f64 {
    1.0 / (1.0 + (-z).exp())
}

/// Stage 1: logistic regression predicting who got treated.
pub fn fit_propensity(x: &[Vec<f64>], treatment: &[i32], lr: f64, epochs: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut beta = vec![0.0; d];

    for _ in 0..epochs {
        let mut grad = vec![0.0; d];
        for i in 0..n {
            let mut z = 0.0;
            for j in 0..d {
                z += beta[j] * x[i][j];
            }
            let residual = treatment[i] as f64 - sigmoid(z);   // ascent
            for j in 0..d {
                grad[j] += residual * x[i][j];
            }
        }
        for j in 0..d {
            beta[j] += lr * grad[j] / n as f64;
        }
    }
    beta
}

/// Stage 2: a weighted difference of means, with clipping so one near-zero
/// propensity cannot produce a weight of 1000 and decide the answer alone.
pub fn iptw_effect(
    x: &[Vec<f64>],
    treatment: &[i32],
    outcome: &[f64],
    beta: &[f64],
    clip: f64,
) -> f64 {
    let (mut t_num, mut t_den, mut c_num, mut c_den) = (0.0, 0.0, 0.0, 0.0);

    for i in 0..x.len() {
        let mut z = 0.0;
        for j in 0..beta.len() {
            z += beta[j] * x[i][j];
        }
        let e = sigmoid(z).clamp(clip, 1.0 - clip);

        if treatment[i] == 1 {
            let w = 1.0 / e;
            t_num += w * outcome[i];
            t_den += w;
        } else {
            let w = 1.0 / (1.0 - e);
            c_num += w * outcome[i];
            c_den += w;
        }
    }

    t_num / t_den - c_num / c_den
}`,
        profile: 'O(n·d) per epoch. Recomputes every propensity in stage 2, and bounds-checks every index.',
      },
      'make-it-right': {
        code: `//! IPTW - typed errors, diagnostics bundled with the estimate, scores passed in.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum CausalError {
    Empty,
    LengthMismatch,
    NonBinaryTreatment,
    ArmEmptyAfterTrimming,
}

impl fmt::Display for CausalError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot estimate an effect from zero units"),
            Self::LengthMismatch => write!(f, "inputs describe different numbers of units"),
            Self::NonBinaryTreatment => write!(f, "treatment must be binary 0/1"),
            Self::ArmEmptyAfterTrimming => {
                write!(f, "one arm is empty after trimming to common support")
            }
        }
    }
}

impl std::error::Error for CausalError {}

/// An effect is never a bare number — it travels with the diagnostics that
/// determine whether it means anything.
#[derive(Debug, Clone, Copy)]
pub struct CausalEstimate {
    pub ate: f64,
    pub max_weight: f64,
    pub effective_sample_size: f64,
    pub trimmed_fraction: f64,
}

impl CausalEstimate {
    /// The two failures that actually invalidate an IPTW estimate.
    #[must_use]
    pub fn is_trustworthy(&self) -> bool {
        self.max_weight < 20.0 && self.trimmed_fraction < 0.10
    }
}

/// Scores are computed once by the caller and borrowed here, rather than
/// recomputed — the naive version does the work twice and lets the two stages
/// drift apart.
pub fn estimate_ate(
    scores: &[f64],
    treatment: &[i32],
    outcome: &[f64],
    trim: (f64, f64),
) -> Result<CausalEstimate, CausalError> {
    if scores.is_empty() {
        return Err(CausalError::Empty);
    }
    if scores.len() != treatment.len() || scores.len() != outcome.len() {
        return Err(CausalError::LengthMismatch);
    }
    if treatment.iter().any(|&t| t != 0 && t != 1) {
        return Err(CausalError::NonBinaryTreatment);
    }

    let (low, high) = trim;
    let total = scores.len() as f64;
    let marginal = f64::from(treatment.iter().sum::<i32>()) / total;

    let mut acc = Accumulator::default();
    let mut kept = 0usize;

    for ((&e, &t), &y) in scores.iter().zip(treatment).zip(outcome) {
        if e <= low || e >= high {
            continue;
        }
        kept += 1;

        // Stabilized weights: scaling by the marginal rate keeps them near 1.
        let w = if t == 1 { marginal / e } else { (1.0 - marginal) / (1.0 - e) };
        acc.observe(w, t, y);
    }

    acc.finish(kept, total)
}

#[derive(Default)]
struct Accumulator {
    t_num: f64,
    t_den: f64,
    c_num: f64,
    c_den: f64,
    w_sum: f64,
    w_sq_sum: f64,
    max_weight: f64,
}

impl Accumulator {
    fn observe(&mut self, w: f64, t: i32, y: f64) {
        self.w_sum += w;
        self.w_sq_sum += w * w;
        self.max_weight = self.max_weight.max(w);
        if t == 1 {
            self.t_num += w * y;
            self.t_den += w;
        } else {
            self.c_num += w * y;
            self.c_den += w;
        }
    }

    fn finish(self, kept: usize, total: f64) -> Result<CausalEstimate, CausalError> {
        if self.t_den == 0.0 || self.c_den == 0.0 {
            return Err(CausalError::ArmEmptyAfterTrimming);
        }
        Ok(CausalEstimate {
            ate: self.t_num / self.t_den - self.c_num / self.c_den,
            max_weight: self.max_weight,
            // Kish effective sample size: how much data the weighting left.
            effective_sample_size: self.w_sum * self.w_sum / self.w_sq_sum,
            trimmed_fraction: 1.0 - kept as f64 / total,
        })
    }
}`,
        rationale:
          'Failure modes become a typed Result instead of a NaN escaping into a report, the accumulator is extracted so the estimator body stays readable, and the estimate carries its diagnostics. Scores are borrowed rather than recomputed, which removes the duplicated stage-two work and the chance of the two stages disagreeing.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One pass over the cohort; zero allocation.',
      },
      'make-it-fast': {
        code: `//! IPTW - parallel bootstrap over resamples, weights computed once.

use rayon::prelude::*;

/// Bootstrap confidence interval for the ATE.
///
/// The bootstrap is the only honest interval here, because the naive analytic
/// standard error treats the weights as fixed when they were estimated. Each
/// resample is fully independent, which makes this the rare case of genuinely
/// embarrassing parallelism.
pub fn bootstrap_ate(
    weights: &[f64],
    treatment: &[i32],
    outcome: &[f64],
    draws: usize,
    seed: u64,
) -> (f64, f64) {
    let n = outcome.len();

    let effects: Vec<f64> = (0..draws)
        .into_par_iter()
        .map(|draw| {
            // A counter-based RNG seeded per draw: no shared state, no locking,
            // and the run is reproducible regardless of how rayon schedules it.
            let mut state = seed.wrapping_add(draw as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15);
            let mut next = || {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                (state % n as u64) as usize
            };

            let (mut t_num, mut t_den, mut c_num, mut c_den) = (0.0, 0.0, 0.0, 0.0);
            for _ in 0..n {
                let i = next();
                // Weights are precomputed and borrowed, so the inner loop is
                // three loads and a multiply-add - no sigmoid, no allocation.
                let w = weights[i];
                if treatment[i] == 1 {
                    t_num += w * outcome[i];
                    t_den += w;
                } else {
                    c_num += w * outcome[i];
                    c_den += w;
                }
            }
            t_num / t_den - c_num / c_den
        })
        .collect();

    let mean = effects.iter().sum::<f64>() / draws as f64;
    let variance =
        effects.iter().map(|e| (e - mean).powi(2)).sum::<f64>() / (draws as f64 - 1.0);

    (mean, variance.sqrt())
}
`,
        rationale:
          'The bootstrap replaces the analytic standard error, which is wrong here because it treats estimated weights as fixed. Resamples are mutually independent so they parallelize cleanly, and each worker carries its own counter-based RNG seeded from the draw index — no shared state, no lock, and reproducible whatever order rayon happens to schedule in.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Bootstrap resamples share nothing, so they partition across cores with no synchronization at all — the cleanest parallel speedup available in this whole estimator.',
            tradeoff: 'A shared RNG would serialize the workers, so each seeds its own; that makes the sequence differ from a single-threaded run even at the same seed.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'Weights are computed once and borrowed by every draw, so the inner loop is loads and a multiply-add rather than recomputing a sigmoid per unit per draw.',
            tradeoff: 'Weights must be materialized up front, so memory is O(n) even when a streaming formulation would not need it.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Indexing three parallel slices keeps the resample loop on contiguous memory instead of chasing a struct-of-units layout.',
            tradeoff: 'Three parallel slices must be kept in lockstep by the caller — a struct per unit would make that impossible to get wrong.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Bootstrap draws spread across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
