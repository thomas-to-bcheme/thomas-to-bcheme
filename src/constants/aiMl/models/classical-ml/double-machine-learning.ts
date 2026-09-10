import type { AiMlModel } from '../../types';

export const DOUBLE_MACHINE_LEARNING: AiMlModel = {
  slug: 'double-machine-learning',
  name: 'Double Machine Learning',
  aliases: ['DML', 'Debiased ML', 'Orthogonal learning'],
  category: 'classical-ml',
  group: 'causal-estimation',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression'],

  intuition:
    'Regress the outcome on the covariates, regress the treatment on the covariates, and then regress one set of residuals on the other. What is left after removing everything the covariates explain is the part of the treatment that was effectively random, and its relationship to the leftover outcome is the effect. Using flexible learners for both nuisance models would normally bias the result; the residual-on-residual form plus cross-fitting is what cancels that bias out.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\tilde{Y} = Y - \\hat{g}(\\mathbf{X}), \\quad \\tilde{T} = T - \\hat{m}(\\mathbf{X}), \\qquad \\hat{\\theta} = \\frac{\\mathbb{E}[\\tilde{T}\\tilde{Y}]}{\\mathbb{E}[\\tilde{T}^2]}',
      symbols: [
        { symbol: '\\hat{g}(\\mathbf{X})', meaning: 'outcome nuisance model — E[Y | X]' },
        { symbol: '\\hat{m}(\\mathbf{X})', meaning: 'treatment nuisance model — E[T | X], the propensity' },
        { symbol: '\\tilde{Y}, \\tilde{T}', meaning: 'residuals: what the covariates could NOT explain' },
        { symbol: '\\hat{\\theta}', meaning: 'the estimated treatment effect' },
      ],
    },
    reading:
      'The final step is an ordinary least-squares slope of one residual on the other. The two nuisance models are fit by whatever loss they like — boosting, random forest, a neural net — because the estimator is constructed so that small errors in them do not propagate into the effect at first order. That property, Neyman orthogonality, is the entire reason this works with machine learning inside it.',
  },

  optimization: {
    method: 'Cross-fitted nuisance estimation, then a residual-on-residual moment condition',
    updateRule: {
      formula:
        '\\hat{\\theta} = \\left(\\sum_{k=1}^{K}\\sum_{i \\in I_k} \\tilde{T}_i^{(-k)2}\\right)^{-1} \\sum_{k=1}^{K}\\sum_{i \\in I_k} \\tilde{T}_i^{(-k)}\\tilde{Y}_i^{(-k)}',
      symbols: [
        { symbol: 'I_k', meaning: 'the units in fold k' },
        { symbol: '(-k)', meaning: 'residual computed from a model fit WITHOUT fold k — the cross-fitting' },
        { symbol: 'K', meaning: 'number of folds, typically 2 to 5' },
      ],
    },
    rationale:
      'Two ingredients, and both are load-bearing. Orthogonality means the moment condition\'s derivative with respect to the nuisance functions is zero at the truth, so a nuisance error of order n^-1/4 still leaves the effect estimate root-n consistent — which is what licenses using a regularized learner at all. Cross-fitting handles the other half: a nuisance model that has seen a unit will fit its noise, and that overfitting correlates the two residuals and biases the slope. Fitting on other folds and predicting out of fold removes it.',
    hyperparameters: [
      { name: 'nuisance learners', role: 'One for outcome, one for treatment; they need not match', typicalRange: 'GBM, random forest, lasso' },
      { name: 'cross-fitting folds', role: 'More folds means less bias and more compute', typicalRange: '2 to 5' },
      { name: 'repetitions', role: 'Re-run with different fold splits and median the estimates', typicalRange: '1 to 20' },
      { name: 'final-stage form', role: 'Constant effect (partially linear) or a covariate-dependent one', typicalRange: 'OLS, or a linear projection onto effect-modifiers' },
    ],
    convergence:
      'The nuisance fits converge as their learners do; the final stage is a closed-form slope. The theoretical guarantee is asymptotic and the practical failure is finite-sample: when the denominator E[T-tilde squared] is small — meaning the covariates already explain nearly all the treatment variation — the estimate becomes wildly unstable, which is the weak-overlap problem showing up as a near-zero denominator instead of an exploded weight. Estimates that swing across fold splits are the diagnostic, which is why repetition and median aggregation is standard.',
    complexity:
      'Two nuisance fits per fold, so 2K model fits, plus O(n) for the final slope. A 5-fold DML with gradient boosting is 10 boosted fits — the most expensive causal estimator here, and still cheap relative to collecting the data.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'Cross-fitting assumes units are exchangeable so that a model fit on other folds is valid for this one. Consecutive observations of a series are not exchangeable, and random folds leak the future into the past. The time-series analogue exists — sequential or blocked cross-fitting — but it is a different estimator with different guarantees, not this one applied to ordered data.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The residuals here are a device for removing confounding, not a signal about individual units. A large residual means the covariates failed to explain that unit, which is ordinary model error, and reading it as an anomaly score would flag exactly the units the estimator is designed to be robust to.',
      },
      optimization: {
        fit: 'viable',
        how: 'Produces the effect coefficient a downstream decision rule optimizes against, with a valid confidence interval attached — which matters when the allocation decision must account for estimate uncertainty rather than treating a point estimate as fact.',
        where: [
          'Pricing elasticity estimation feeding a revenue optimizer',
          'Measuring the return on a spend channel before reallocating budget across channels',
        ],
        why: 'The distinguishing feature is a valid interval despite machine learning in the nuisance stage. A boosted model can give you an elasticity, but not one you can put a standard error on; DML gives both, and an optimizer that ignores estimate uncertainty will confidently over-allocate to the noisiest channel.',
        featurization: [
          'Include confounders the design requires rather than the features that improve nuisance fit',
          'Continuous treatments work directly — no discretization, which is a genuine advantage here',
        ],
        evaluation:
          'Stability of the estimate across repeated fold splits, plus the width of the interval relative to the decision threshold.',
        pitfalls: [
          'A small residual-treatment variance makes the estimate unstable while the point value still looks plausible',
          'Optimizing against the point estimate discards the interval that was the whole reason to use this method',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'primary',
        how: 'Fit both nuisance models with cross-fitting, residualize, regress residual on residual, and report the coefficient with its robust standard error. Repeat over several fold splits and take the median.',
        where: [
          'Observational effect estimation with high-dimensional or nonlinear confounding',
          'Continuous-dose treatments, where propensity weighting is awkward and DML is natural',
          'Settings where a linear specification is indefensible but a valid interval is still required',
        ],
        why: 'The method of choice when you need flexible confounding adjustment AND valid inference. Plugging a boosted model into an outcome regression gives you neither an unbiased effect nor a usable standard error; DML is the construction that recovers both, and it is why the technique moved from econometrics into general practice.',
        featurization: [
          'Pre-treatment covariates only, as always — a post-treatment control is still a collider here',
          'Nuisance learners should be flexible; unlike IPTW, accuracy in the propensity model is genuinely wanted',
        ],
        evaluation:
          'Estimate stability across fold splits, the residual-treatment variance as an overlap diagnostic, and sensitivity analysis for unmeasured confounding.',
        pitfalls: [
          'Skipping cross-fitting reintroduces exactly the overfitting bias the method exists to remove',
          'Weak overlap appears as a near-zero denominator rather than as an extreme weight, so it is easy to miss',
          'The orthogonality guarantee is asymptotic and can be optimistic at small n',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Estimates the incremental effect of a recommendation slot or position, separating the causal lift of showing an item from the selection bias in which items get shown.',
        where: [
          'Position-bias correction, estimating the effect of rank on click independent of relevance',
          'Measuring the true incremental value of a recommendation surface against organic discovery',
        ],
        why: 'Ranking data is confounded by construction — the model chose what to show, so exposure and relevance are entangled. DML handles the high-dimensional confounding that a simple propensity adjustment cannot, and the residualization is a natural fit for continuous position.',
        featurization: [
          'The ranker score at serve time is the dominant confounder and must be logged',
          'Exploration traffic sharpens overlap dramatically; without it the denominator is tiny',
        ],
        evaluation: 'Comparison against a randomized-exposure holdout, plus estimate stability across fold splits.',
        pitfalls: [
          'Without exploration traffic there is almost no residual variation in exposure to work with',
          'The feedback loop means the estimate is only valid for the ranking policy that produced the logs',
        ],
      },
    },
  },

  deployment: {
    trainingCost: 'Minutes to an hour. 2K nuisance fits — a 5-fold run with boosting is 10 fits, repeated across splits.',
    inferenceProfile:
      'An offline analysis, not a serving path. The output is a coefficient and an interval, produced per study rather than per request.',
    retrainingCadence:
      'Re-estimated per analysis and after any policy change. An elasticity measured under one pricing regime does not survive a change to that regime.',
    driftAndMonitoring: [
      'Track the residual-treatment variance across runs — a shrinking denominator means overlap is degrading',
      'Compare estimates across fold splits every run; instability is the signal that the asymptotics have not kicked in',
      'Watch nuisance model performance separately, since a collapsed treatment model quietly destroys the residuals',
    ],
    productionGotchas: [
      'Cross-fitting is easy to omit when refactoring, and its absence is invisible in the output',
      'Reported standard errors assume the moment condition is correctly specified; misspecification shows up as unstable estimates rather than as a warning',
      'Continuous treatments must be on a meaningful scale — the coefficient carries the units, and rescaling silently changes the reported effect',
    ],
  },

  assumptions: [
    'Conditional ignorability — the measured covariates block every confounding path',
    'Overlap, expressed here as non-degenerate residual variation in the treatment after conditioning',
    'Nuisance learners converge fast enough (roughly n^-1/4) for the orthogonality argument to hold',
    'Units are exchangeable, which is what makes random cross-fitting valid',
  ],

  pros: [
    {
      point: 'Valid confidence intervals despite ML in the nuisance stage',
      context:
        'The whole reason the method exists. A boosted outcome regression gives an effect with no usable standard error; this gives both, and inference is usually the deliverable in causal work.',
    },
    {
      point: 'Robust to moderate misspecification in either nuisance model',
      context:
        'Orthogonality means first-order nuisance errors cancel, so a single bad model does not sink the estimate the way it does in plain IPTW. That robustness is what makes it the safer default.',
    },
    {
      point: 'Handles continuous treatments natively',
      context:
        'No discretization and no weighting scheme needed for dose-response questions — a real advantage where propensity methods get awkward.',
    },
    {
      point: 'Scales to high-dimensional confounders',
      context:
        'Hundreds of covariates are fine, because the nuisance models are allowed to be regularized. Overkill when there are five well-understood confounders and a linear model suffices.',
    },
  ],

  cons: [
    {
      point: 'Substantially more compute than the alternatives',
      context:
        '2K nuisance fits, often repeated across splits. Irrelevant on a cohort of thousands; a real constraint when the nuisance learner is expensive and the cohort is millions.',
    },
    {
      point: 'The guarantee is asymptotic',
      context:
        'At small n the interval can be optimistic and estimates swing across fold splits. Repetition with median aggregation is a mitigation, not a fix.',
    },
    {
      point: 'Weak overlap hides in the denominator',
      context:
        'IPTW announces poor overlap with an exploding weight you cannot miss. Here it appears as a small residual variance, which produces an unstable estimate that still looks like a number.',
    },
    {
      point: 'Estimates an average, not per-unit effects',
      context:
        'The partially linear form gives one coefficient. When the decision is whom to target rather than whether to act, a meta-learner is the right tool instead.',
    },
  ],

  relatedSlugs: ['propensity-iptw', 'meta-learners', 'linear-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Double ML - residualize both sides, then regress one on the other.

Three steps, and the third is an ordinary least-squares slope. What makes it
causal is that both inputs have already had the covariates removed.
"""


def double_ml(fit, X, treatment, outcome, folds=2):
    n = len(X)
    fold_size = n // folds

    y_residual = [0.0] * n
    t_residual = [0.0] * n

    for k in range(folds):
        # Cross-fitting: hold out fold k, fit on the rest, predict on k.
        # Without this the nuisance models fit each unit's own noise, which
        # correlates the two residuals and biases the slope.
        start = k * fold_size
        end = n if k == folds - 1 else start + fold_size
        test_idx = list(range(start, end))
        train_idx = [i for i in range(n) if i not in set(test_idx)]

        train_X = [X[i] for i in train_idx]

        g = fit(train_X, [outcome[i] for i in train_idx])       # E[Y | X]
        m = fit(train_X, [float(treatment[i]) for i in train_idx])  # E[T | X]

        for i in test_idx:
            y_residual[i] = outcome[i] - g(X[i])
            t_residual[i] = treatment[i] - m(X[i])

    # Step 3: slope of y-residual on t-residual. This IS the effect.
    numerator = sum(t * y for t, y in zip(t_residual, y_residual))
    denominator = sum(t * t for t in t_residual)

    if denominator == 0.0:
        raise ValueError("no residual variation in treatment - overlap has failed")

    return numerator / denominator`,
        profile: 'O(folds x nuisance fit). The train-index construction is O(n^2) through the set difference.',
      },
      'make-it-right': {
        code: `"""Double ML - typed, with the overlap diagnostic that decides trust."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from sklearn.base import RegressorMixin, clone
from sklearn.model_selection import KFold

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class DmlEstimate:
    theta: float
    std_error: float
    residual_treatment_variance: float
    n_folds: int

    @property
    def confidence_interval(self) -> tuple[float, float]:
        margin = 1.96 * self.std_error
        return self.theta - margin, self.theta + margin

    @property
    def has_adequate_overlap(self) -> bool:
        """Weak overlap shows up HERE, as a vanishing denominator - not as an
        extreme weight the way it does in IPTW. Easy to miss, so name it."""
        return self.residual_treatment_variance > 1e-3


def double_ml(
    outcome_learner: RegressorMixin,
    treatment_learner: RegressorMixin,
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    folds: int = 5,
    random_state: int = 0,
) -> DmlEstimate:
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not (X.shape[0] == treatment.shape[0] == outcome.shape[0]):
        raise ValueError("X, treatment and outcome must describe the same units")
    if folds < 2:
        raise ValueError(f"cross-fitting needs at least 2 folds, got {folds}")

    n = X.shape[0]
    y_residual = np.empty(n, dtype=np.float64)
    t_residual = np.empty(n, dtype=np.float64)

    splitter = KFold(n_splits=folds, shuffle=True, random_state=random_state)
    for train_idx, test_idx in splitter.split(X):
        # clone() per fold: a refitted estimator can carry warm-start state,
        # which silently leaks the held-out fold back into the nuisance model.
        g = clone(outcome_learner).fit(X[train_idx], outcome[train_idx])
        m = clone(treatment_learner).fit(X[train_idx], treatment[train_idx])

        y_residual[test_idx] = outcome[test_idx] - g.predict(X[test_idx])
        t_residual[test_idx] = treatment[test_idx] - m.predict(X[test_idx])

    denominator = float(np.dot(t_residual, t_residual))
    if denominator <= 0.0:
        raise ValueError("no residual variation in treatment - overlap has failed")

    theta = float(np.dot(t_residual, y_residual)) / denominator

    # Robust (sandwich) standard error for the moment condition.
    moment = t_residual * (y_residual - theta * t_residual)
    std_error = float(np.sqrt(np.sum(moment**2)) / denominator)

    return DmlEstimate(
        theta=theta,
        std_error=std_error,
        residual_treatment_variance=denominator / n,
        n_folds=folds,
    )`,
        rationale:
          'The O(n^2) index construction is replaced by KFold, nuisance estimators are cloned per fold so warm-start state cannot leak the held-out data back in, and the bare float becomes an estimate carrying a robust sandwich standard error plus the residual-treatment variance — the diagnostic that reveals weak overlap, which in this estimator hides in the denominator rather than announcing itself.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'scikit-learn',
        profile: '2 x folds nuisance fits plus O(n) reductions.',
      },
      'make-it-fast': {
        code: `"""Double ML - repeated splits in parallel, residuals reduced without copies."""

import numpy as np
from joblib import Parallel, delayed
from numpy.typing import NDArray
from sklearn.base import clone
from sklearn.model_selection import KFold

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def _one_split(
    outcome_learner, treatment_learner, X: Matrix, t: Vector, y: Vector, folds: int, seed: int
) -> tuple[float, float]:
    """One complete cross-fitted estimate. Returns (theta, denominator)."""
    n = X.shape[0]
    # Pre-allocated once per split; the fold loop writes into slices of these
    # rather than concatenating per-fold arrays at the end.
    y_res = np.empty(n, dtype=np.float64)
    t_res = np.empty(n, dtype=np.float64)

    for train_idx, test_idx in KFold(n_splits=folds, shuffle=True, random_state=seed).split(X):
        g = clone(outcome_learner).fit(X[train_idx], y[train_idx])
        m = clone(treatment_learner).fit(X[train_idx], t[train_idx])
        # Subtract in place - no intermediate prediction array survives.
        np.subtract(y[test_idx], g.predict(X[test_idx]), out=y_res[test_idx])
        np.subtract(t[test_idx], m.predict(X[test_idx]), out=t_res[test_idx])

    denominator = float(t_res @ t_res)
    return float(t_res @ y_res) / denominator, denominator


def double_ml_repeated(
    outcome_learner,
    treatment_learner,
    X: Matrix,
    treatment: Vector,
    outcome: Vector,
    folds: int = 5,
    repetitions: int = 10,
    n_jobs: int = -1,
) -> tuple[float, float]:
    """Median over repeated fold splits, splits fitted concurrently.

    Repetition is not optional polish: a single split's estimate can swing
    materially at finite n, and the median across splits is what makes the
    number reportable. The splits are independent, so they parallelize freely.
    """
    X = np.ascontiguousarray(X, dtype=np.float64)

    results = Parallel(n_jobs=n_jobs, prefer="processes")(
        delayed(_one_split)(
            outcome_learner, treatment_learner, X, treatment, outcome, folds, seed
        )
        for seed in range(repetitions)
    )

    thetas = np.fromiter((theta for theta, _ in results), dtype=np.float64)
    # Median, not mean: a split with weak overlap produces an outlier estimate,
    # and the mean would let it dominate exactly when it should not.
    return float(np.median(thetas)), float(np.std(thetas, ddof=1))`,
        rationale:
          'Repeated fold splits become the default rather than an afterthought, because a single split can swing materially at finite n — and they are independent, so they run concurrently. Residuals are written into pre-allocated buffers with in-place subtraction, and aggregation uses the median so a weak-overlap split produces an outlier rather than dragging the answer.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Repeated splits are fully independent, so dispatching them together to worker processes converts the dominant cost — 2 x folds x repetitions nuisance fits — into wall-clock divided by cores.',
            tradeoff: 'Process parallelism pickles the design matrix to every worker; at large n the copies exhaust memory before the cores are saturated.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'np.subtract with out= writes residuals directly into pre-sized buffers, so no per-fold prediction array survives the loop.',
            tradeoff: 'Writing into a fancy-indexed slice is subtle — out= on a non-contiguous view silently allocates anyway, so the win depends on the index being a simple slice.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'ascontiguousarray once up front means every fold\'s fancy indexing gathers from contiguous memory rather than a strided or mixed-dtype view.',
            tradeoff: 'Forces a full copy of the design matrix when the caller passed a view or a non-float64 array.',
          },
        ],
        libraryName: 'scikit-learn / joblib',
        profile: '2 x folds x repetitions nuisance fits, concurrent. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Double ML - residualize both sides, then regress one on the other.
#include <cstddef>
#include <functional>
#include <stdexcept>
#include <vector>

using Predictor = std::function<double(const std::vector<double>&)>;
using Fitter = std::function<Predictor(const std::vector<std::vector<double>>&,
                                       const std::vector<double>&)>;

double DoubleMl(const Fitter& fit,
                const std::vector<std::vector<double>>& X,
                const std::vector<double>& treatment,
                const std::vector<double>& outcome,
                std::size_t folds) {
  const std::size_t n = X.size();
  const std::size_t fold_size = n / folds;

  std::vector<double> y_residual(n, 0.0);
  std::vector<double> t_residual(n, 0.0);

  for (std::size_t k = 0; k < folds; ++k) {
    const std::size_t start = k * fold_size;
    const std::size_t end = (k == folds - 1) ? n : start + fold_size;

    // Cross-fitting: fit on everything EXCEPT this fold. Without it the
    // nuisance models fit each unit's own noise and bias the final slope.
    std::vector<std::vector<double>> train_x;
    std::vector<double> train_y, train_t;
    for (std::size_t i = 0; i < n; ++i) {
      if (i >= start && i < end) continue;
      train_x.push_back(X[i]);
      train_y.push_back(outcome[i]);
      train_t.push_back(treatment[i]);
    }

    const Predictor g = fit(train_x, train_y);
    const Predictor m = fit(train_x, train_t);

    for (std::size_t i = start; i < end; ++i) {
      y_residual[i] = outcome[i] - g(X[i]);
      t_residual[i] = treatment[i] - m(X[i]);
    }
  }

  double numerator = 0.0, denominator = 0.0;
  for (std::size_t i = 0; i < n; ++i) {
    numerator += t_residual[i] * y_residual[i];
    denominator += t_residual[i] * t_residual[i];
  }

  if (denominator == 0.0) {
    throw std::invalid_argument("no residual variation in treatment - overlap has failed");
  }
  return numerator / denominator;
}`,
        profile: 'Copies the training design matrix once per fold — folds x O(n·d) of pure copying before any fitting.',
      },
      'make-it-right': {
        code: `// Double ML - index-based folds, flat storage, diagnostics with the estimate.
#include <cstddef>
#include <functional>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

struct DmlEstimate {
  double theta;
  double std_error;
  double residual_treatment_variance;

  // Weak overlap surfaces HERE as a vanishing denominator, not as an extreme
  // weight the way it does in IPTW - so it has to be named explicitly.
  [[nodiscard]] bool HasAdequateOverlap() const noexcept {
    return residual_treatment_variance > 1e-3;
  }
};

// Fits from a flat row-major matrix restricted to given row indices, so a
// fold is a list of indices rather than a copied sub-matrix.
using FlatPredictor = std::function<double(std::span<const double>)>;
using FlatFitter = std::function<FlatPredictor(std::span<const double>,
                                               std::span<const std::size_t>,
                                               std::span<const double>,
                                               std::size_t)>;

class DoubleMlEstimator {
 public:
  DoubleMlEstimator(FlatFitter fitter, std::size_t width, std::size_t folds)
      : fitter_(std::move(fitter)), width_(width), folds_(folds) {
    if (width_ == 0) throw std::invalid_argument("need at least one covariate");
    if (folds_ < 2) throw std::invalid_argument("cross-fitting needs at least 2 folds");
  }

  [[nodiscard]] DmlEstimate Estimate(std::span<const double> x_flat,
                                     std::span<const double> treatment,
                                     std::span<const double> outcome) const {
    const std::size_t n = treatment.size();
    if (x_flat.size() != n * width_ || outcome.size() != n) {
      throw std::invalid_argument("inputs describe different cohorts");
    }

    std::vector<double> y_res(n), t_res(n);
    std::vector<std::size_t> train_idx, test_idx;
    train_idx.reserve(n);
    test_idx.reserve(n);

    const std::size_t fold_size = n / folds_;
    for (std::size_t k = 0; k < folds_; ++k) {
      const std::size_t start = k * fold_size;
      const std::size_t end = (k == folds_ - 1) ? n : start + fold_size;

      // Buffers are reused across folds rather than reallocated.
      train_idx.clear();
      test_idx.clear();
      for (std::size_t i = 0; i < n; ++i) {
        (i >= start && i < end ? test_idx : train_idx).push_back(i);
      }

      const FlatPredictor g = fitter_(x_flat, train_idx, outcome, width_);
      const FlatPredictor m = fitter_(x_flat, train_idx, treatment, width_);

      for (const std::size_t i : test_idx) {
        const std::span<const double> row(x_flat.data() + i * width_, width_);
        y_res[i] = outcome[i] - g(row);
        t_res[i] = treatment[i] - m(row);
      }
    }

    const double denominator = std::inner_product(t_res.begin(), t_res.end(), t_res.begin(), 0.0);
    if (denominator <= 0.0) {
      throw std::invalid_argument("no residual variation in treatment - overlap has failed");
    }
    const double theta =
        std::inner_product(t_res.begin(), t_res.end(), y_res.begin(), 0.0) / denominator;

    // Robust sandwich standard error for the moment condition.
    double moment_sq = 0.0;
    for (std::size_t i = 0; i < n; ++i) {
      const double m_i = t_res[i] * (y_res[i] - theta * t_res[i]);
      moment_sq += m_i * m_i;
    }

    return DmlEstimate{theta, std::sqrt(moment_sq) / denominator,
                       denominator / static_cast<double>(n)};
  }

 private:
  FlatFitter fitter_;
  std::size_t width_;
  std::size_t folds_;
};`,
        rationale:
          'Folds become index vectors instead of copied design matrices, which removes folds x O(n·d) of pure copying before any model is fit. The index buffers are cleared and reused rather than reallocated per fold, and the estimate now carries a robust sandwich standard error plus the overlap diagnostic.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'Two nuisance fits per fold; index vectors instead of matrix copies.',
      },
      'make-it-fast': {
        code: `// Double ML - Eigen, batched residualization, fused final moment.
#include <Eigen/Dense>
#include <functional>
#include <stdexcept>

using BatchPredictor = std::function<Eigen::VectorXd(const Eigen::MatrixXd&)>;
using BatchFitter =
    std::function<BatchPredictor(const Eigen::MatrixXd&, const Eigen::VectorXd&)>;

struct DmlEstimate {
  double theta;
  double std_error;
};

DmlEstimate DoubleMlFast(const BatchFitter& fit, const Eigen::MatrixXd& X,
                         const Eigen::VectorXd& treatment,
                         const Eigen::VectorXd& outcome, Eigen::Index folds) {
  const Eigen::Index n = X.rows();
  if (treatment.size() != n || outcome.size() != n || folds < 2) {
    throw std::invalid_argument("bad cohort shape or fold count");
  }

  Eigen::VectorXd y_res(n), t_res(n);
  const Eigen::Index fold_size = n / folds;

  for (Eigen::Index k = 0; k < folds; ++k) {
    const Eigen::Index start = k * fold_size;
    const Eigen::Index len = (k == folds - 1) ? n - start : fold_size;

    // Contiguous fold blocks: the training rows are two blocks, not a gather.
    // topRows/bottomRows are views, so no copy happens until the fitter needs
    // one, and the test block is a single contiguous span.
    Eigen::MatrixXd train_x(n - len, X.cols());
    train_x << X.topRows(start), X.bottomRows(n - start - len);

    Eigen::VectorXd train_y(n - len), train_t(n - len);
    train_y << outcome.head(start), outcome.tail(n - start - len);
    train_t << treatment.head(start), treatment.tail(n - start - len);

    const BatchPredictor g = fit(train_x, train_y);
    const BatchPredictor m = fit(train_x, train_t);

    // The whole fold scored in ONE call per nuisance model, then residualized
    // as a single vector expression.
    const Eigen::MatrixXd test_x = X.middleRows(start, len);
    y_res.segment(start, len) = outcome.segment(start, len) - g(test_x);
    t_res.segment(start, len) = treatment.segment(start, len) - m(test_x);
  }

  const double denominator = t_res.squaredNorm();
  if (denominator <= 0.0) {
    throw std::invalid_argument("no residual variation in treatment - overlap has failed");
  }
  const double theta = t_res.dot(y_res) / denominator;

  // Sandwich standard error as one fused array expression - the moment vector
  // is never materialized.
  const double moment_sq =
      (t_res.array() * (y_res.array() - theta * t_res.array())).square().sum();

  return DmlEstimate{theta, std::sqrt(moment_sq) / denominator};
}`,
        rationale:
          'Folds are taken as contiguous blocks so the training set is two views rather than a scattered gather, each fold is scored in one batched call per nuisance model instead of row by row, and the sandwich standard error becomes a single fused array expression that never materializes the moment vector.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Batched scoring makes each fold one GEMM per nuisance model rather than len separate matrix-vector products.',
            tradeoff: 'Requires the fitter to expose a batched predict; a scalar interface gains nothing here.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Contiguous fold blocks mean the training set is two spans and the test set one, so every pass streams sequentially instead of following a scattered index.',
            tradeoff: 'Contiguous folds require the data to be pre-shuffled; taking them in storage order on sorted data would make every fold unrepresentative.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The sandwich standard error composes into one traversal rather than materializing the per-unit moment vector.',
            tradeoff: 'Per-unit moments can no longer be inspected without unfusing, which makes diagnosing an implausible standard error harder.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'Two batched fits per fold; fused final moment. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Double ML - residualize both sides, then regress one on the other.

pub type Predictor<'a> = Box<dyn Fn(&[f64]) -> f64 + 'a>;

pub fn double_ml<'a, F>(
    fit: F,
    x: &[Vec<f64>],
    treatment: &[f64],
    outcome: &[f64],
    folds: usize,
) -> f64
where
    F: Fn(&[Vec<f64>], &[f64]) -> Predictor<'a>,
{
    let n = x.len();
    let fold_size = n / folds;

    let mut y_residual = vec![0.0; n];
    let mut t_residual = vec![0.0; n];

    for k in 0..folds {
        let start = k * fold_size;
        let end = if k == folds - 1 { n } else { start + fold_size };

        // Cross-fitting: fit on everything EXCEPT this fold, or the nuisance
        // models fit each unit's own noise and bias the final slope.
        let mut train_x = Vec::new();
        let mut train_y = Vec::new();
        let mut train_t = Vec::new();
        for i in 0..n {
            if i >= start && i < end {
                continue;
            }
            train_x.push(x[i].clone());
            train_y.push(outcome[i]);
            train_t.push(treatment[i]);
        }

        let g = fit(&train_x, &train_y);
        let m = fit(&train_x, &train_t);

        for i in start..end {
            y_residual[i] = outcome[i] - g(&x[i]);
            t_residual[i] = treatment[i] - m(&x[i]);
        }
    }

    let numerator: f64 = t_residual.iter().zip(&y_residual).map(|(t, y)| t * y).sum();
    let denominator: f64 = t_residual.iter().map(|t| t * t).sum();

    numerator / denominator
}`,
        profile: 'Clones the training design matrix once per fold — folds x O(n·d) of copying before fitting.',
      },
      'make-it-right': {
        code: `//! Double ML - index folds, typed errors, diagnostics with the estimate.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum DmlError {
    ShapeMismatch,
    TooFewFolds,
    NoOverlap,
}

impl fmt::Display for DmlError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ShapeMismatch => write!(f, "inputs describe different cohorts"),
            Self::TooFewFolds => write!(f, "cross-fitting needs at least 2 folds"),
            Self::NoOverlap => {
                write!(f, "no residual variation in treatment - overlap has failed")
            }
        }
    }
}

impl std::error::Error for DmlError {}

#[derive(Debug, Clone, Copy)]
pub struct DmlEstimate {
    pub theta: f64,
    pub std_error: f64,
    pub residual_treatment_variance: f64,
}

impl DmlEstimate {
    #[must_use]
    pub fn confidence_interval(&self) -> (f64, f64) {
        (self.theta - 1.96 * self.std_error, self.theta + 1.96 * self.std_error)
    }

    /// Weak overlap hides in the denominator here, unlike IPTW where it
    /// announces itself as an extreme weight.
    #[must_use]
    pub fn has_adequate_overlap(&self) -> bool {
        self.residual_treatment_variance > 1e-3
    }
}

/// Fits from a flat row-major matrix restricted to the given row indices, so a
/// fold is a list of indices rather than a cloned sub-matrix.
pub trait FoldFitter {
    fn fit(&self, x: &[f64], rows: &[usize], y: &[f64], width: usize) -> Box<dyn Fn(&[f64]) -> f64>;
}

pub fn double_ml(
    fitter: &dyn FoldFitter,
    x: &[f64],
    treatment: &[f64],
    outcome: &[f64],
    width: usize,
    folds: usize,
) -> Result<DmlEstimate, DmlError> {
    let n = treatment.len();
    if width == 0 || x.len() != n * width || outcome.len() != n {
        return Err(DmlError::ShapeMismatch);
    }
    if folds < 2 {
        return Err(DmlError::TooFewFolds);
    }

    let mut y_res = vec![0.0; n];
    let mut t_res = vec![0.0; n];
    let fold_size = n / folds;

    for k in 0..folds {
        let start = k * fold_size;
        let end = if k == folds - 1 { n } else { start + fold_size };

        let train: Vec<usize> = (0..n).filter(|&i| i < start || i >= end).collect();
        let g = fitter.fit(x, &train, outcome, width);
        let m = fitter.fit(x, &train, treatment, width);

        for i in start..end {
            let row = &x[i * width..(i + 1) * width];
            y_res[i] = outcome[i] - g(row);
            t_res[i] = treatment[i] - m(row);
        }
    }

    let denominator: f64 = t_res.iter().map(|t| t * t).sum();
    if denominator <= 0.0 {
        return Err(DmlError::NoOverlap);
    }

    let theta: f64 = t_res.iter().zip(&y_res).map(|(t, y)| t * y).sum::<f64>() / denominator;

    // Robust sandwich standard error for the moment condition.
    let moment_sq: f64 = t_res
        .iter()
        .zip(&y_res)
        .map(|(t, y)| {
            let m = t * (y - theta * t);
            m * m
        })
        .sum();

    Ok(DmlEstimate {
        theta,
        std_error: moment_sq.sqrt() / denominator,
        residual_treatment_variance: denominator / n as f64,
    })
}`,
        rationale:
          'Folds become index vectors rather than cloned sub-matrices, removing a full design-matrix copy per fold. Failures become a typed Result — including the overlap failure that would otherwise divide by zero — and the estimate carries a sandwich standard error and the overlap diagnostic instead of being a bare float.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Two nuisance fits per fold; index vectors instead of matrix clones.',
      },
      'make-it-fast': {
        code: `//! Double ML - repeated splits in parallel, single-pass moment reduction.

use rayon::prelude::*;

/// Median estimate over repeated fold splits, splits evaluated concurrently.
///
/// Repetition is load-bearing rather than decorative: a single split's estimate
/// can swing materially at finite n. Splits share nothing, so they parallelize
/// with no correctness argument.
pub fn double_ml_repeated<F>(estimate_split: F, repetitions: usize) -> (f64, f64)
where
    F: Fn(u64) -> f64 + Sync + Send,
{
    let mut thetas: Vec<f64> = (0..repetitions as u64)
        .into_par_iter()
        .map(&estimate_split)
        .collect();

    // Median, not mean: a split with weak overlap produces an outlier, and the
    // mean lets it dominate exactly when it should not.
    thetas.sort_unstable_by(f64::total_cmp);
    let median = if thetas.len() % 2 == 0 {
        (thetas[thetas.len() / 2 - 1] + thetas[thetas.len() / 2]) / 2.0
    } else {
        thetas[thetas.len() / 2]
    };

    let mean = thetas.iter().sum::<f64>() / thetas.len() as f64;
    let variance =
        thetas.iter().map(|t| (t - mean).powi(2)).sum::<f64>() / (thetas.len() as f64 - 1.0);

    (median, variance.sqrt())
}

/// theta and its sandwich standard error from residuals, in ONE pass.
///
/// The readable form walks the residuals three times - once for the
/// denominator, once for the numerator, once for the moment. Folding all three
/// accumulators together means the vectors are streamed once.
pub fn moment_estimate(t_res: &[f64], y_res: &[f64]) -> Option<(f64, f64)> {
    let (num, den) = t_res
        .iter()
        .zip(y_res)
        .fold((0.0_f64, 0.0_f64), |(num, den), (t, y)| {
            (num + t * y, den + t * t)
        });

    if den <= 0.0 {
        return None;
    }
    let theta = num / den;

    let moment_sq: f64 = t_res
        .iter()
        .zip(y_res)
        .map(|(t, y)| {
            let m = t * (y - theta * t);
            m * m
        })
        .sum();

    Some((theta, moment_sq.sqrt() / den))
}`,
        rationale:
          'Repeated splits run concurrently and are aggregated by median, so a weak-overlap split shows up as an outlier rather than dragging the answer. The moment computation folds the numerator and denominator into one accumulator pass instead of walking the residual vectors separately for each.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Repeated fold splits are fully independent, so the dominant cost — the nuisance fits — divides across cores with no synchronization.',
            tradeoff: 'The split closure must be Sync + Send, which rules out fitters holding interior-mutable or cached state.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Folding numerator and denominator together streams both residual vectors once, and the zip lets the compiler prove the lengths match and drop the bounds checks.',
            tradeoff: 'theta depends on the first pass, so the moment sum still needs a second traversal — this halves the passes rather than eliminating them.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Residuals stay as borrowed slices throughout, so every reduction streams contiguous memory with no intermediate collection.',
            tradeoff: 'Both residual vectors must be fully materialized first, so a streaming formulation that never stores them is ruled out.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Splits across cores; residuals streamed in two passes. Illustrative, not a measured benchmark.',
      },
    },
  },
};
