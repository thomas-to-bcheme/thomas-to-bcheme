import type { AiMlModel } from '../../types';

export const LOGISTIC_REGRESSION: AiMlModel = {
  slug: 'logistic-regression',
  name: 'Logistic Regression',
  aliases: ['Logit model', 'Maximum entropy classifier'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'model',

  paradigms: ['supervised'],
  // 'anomaly-detection' because the supervised-labels case is a real
  // deployment — see applications.featured['anomaly-detection'].
  taskTypes: ['classification', 'ranking', 'anomaly-detection'],

  intuition:
    'Take the linear model, then squash its unbounded output through a sigmoid so it lands in [0, 1] and can be read as a probability. Each coefficient answers: how much does one unit of this feature move the log-odds? The decision boundary is still a hyperplane — the sigmoid changes what the output means, not what shapes the model can separate.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = -\\frac{1}{n}\\sum_{i=1}^{n}\\Bigl[ y_i \\log \\sigma(\\mathbf{x}_i^{\\top}\\theta) + (1-y_i)\\log\\bigl(1 - \\sigma(\\mathbf{x}_i^{\\top}\\theta)\\bigr) \\Bigr]',
      symbols: [
        { symbol: '\\sigma(z)', meaning: 'the logistic function, 1/(1+e^{-z})' },
        { symbol: 'y_i \\in \\{0,1\\}', meaning: 'the observed class label' },
        { symbol: '\\theta', meaning: 'coefficients, interpretable as log-odds per unit of feature' },
      ],
    },
    reading:
      'Negative log-likelihood under a Bernoulli model: penalize confident wrong predictions heavily and confident right ones barely. The asymmetry is deliberate and matters — squared error would let a prediction of 0.99 on a negative case off far too lightly, and it is why log loss, not accuracy, is the training objective.',
  },

  optimization: {
    method: 'Convex minimization by IRLS, L-BFGS, or gradient descent — no closed form exists',
    updateRule: {
      formula:
        '\\theta \\leftarrow \\theta - \\eta \\cdot \\frac{1}{n} X^{\\top}\\bigl(\\sigma(X\\theta) - \\mathbf{y}\\bigr)',
      symbols: [
        { symbol: '\\sigma(X\\theta) - \\mathbf{y}', meaning: 'the residual — identical in form to linear regression\'s' },
        { symbol: '\\eta', meaning: 'learning rate, for first-order methods' },
      ],
    },
    rationale:
      'The gradient has exactly the same shape as linear regression\'s: features weighted by residuals. That is not a coincidence — both are generalized linear models, and the link function is the only thing that changes. There is no closed form because the sigmoid is nonlinear in theta, but the objective is strictly convex under any positive regularization, so the optimum is unique and every reasonable solver reaches it. L-BFGS is the standard default; IRLS converges in fewer iterations but costs a Hessian solve each one.',
    hyperparameters: [
      { name: 'C (inverse regularization)', role: 'Smaller means stronger shrinkage; required for separable data', typicalRange: '0.01 to 100, tuned on a log grid' },
      { name: 'penalty', role: 'L2 for stability, L1 for sparsity, elastic-net for both', typicalRange: 'l2 by default' },
      { name: 'class_weight', role: 'Reweights the loss under imbalance instead of resampling', typicalRange: 'None or balanced' },
      { name: 'solver', role: 'lbfgs for dense, saga for L1 or very large n', typicalRange: 'lbfgs, saga, newton-cholesky' },
    ],
    convergence:
      'Strictly convex with regularization, so convergence is to the unique global optimum and is reliable. The one genuine failure is perfect separation: when a hyperplane splits the classes exactly, the likelihood is maximized by driving coefficients to infinity, and an unregularized fit will either not converge or return absurd values with astronomical standard errors. Any regularization removes it. Unscaled features slow convergence badly but do not change the optimum.',
    complexity:
      'O(nd) per gradient step; IRLS adds O(d³) per iteration for the Hessian solve. Fits on millions of rows in seconds, which is why it remains the default baseline.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Forecast a binary event rather than a level — will demand exceed capacity next week, will this machine fail in the next 30 days. Lag features, rolling statistics, and calendar terms become the covariates, and the target is the event indicator at horizon h.',
        where: [
          'Threshold-exceedance forecasting where the decision is binary anyway',
          'Churn and failure prediction over a fixed forward window',
        ],
        why: 'Reasonable when the deliverable genuinely is a probability of an event rather than a value, and the calibrated output plugs straight into an expected-cost decision. Not a competitor to ARIMA — it discards the autocorrelation structure entirely and only sees whatever the lag features encode.',
        featurization: [
          'Lags at the seasonal period, plus rolling means and standard deviations',
          'Define the label window carefully — an overlapping window leaks the target across rows',
        ],
        evaluation:
          'Rolling-origin backtesting scored with log loss and calibration, never accuracy. Split by time, always.',
        pitfalls: [
          'Overlapping label windows create correlated rows and wildly optimistic validation scores',
          'Rolling features computed before the split leak the future backwards',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Only usable when labelled anomalies exist, which is the minority case. Fit with heavy class weighting and threshold the predicted probability against an alert budget.',
        where: [
          'Fraud scoring where confirmed labels arrive via chargebacks',
          'Quality control with a historical defect log',
        ],
        why: 'Appropriate when anomalies are labelled and resemble each other. It fails at the thing anomaly detection usually needs — catching a novel failure mode — because a discriminative model can only recognize patterns it was shown. When labels are absent or anomalies are genuinely new, an unsupervised detector is the right tool.',
        featurization: [
          'Class weighting rather than resampling, which preserves calibration',
          'Strictly time-based splits; random splits leak future patterns backwards',
        ],
        evaluation:
          'PR-AUC and recall at a fixed false-positive budget. ROC-AUC flatters every model at extreme imbalance.',
        pitfalls: [
          'Cannot detect an anomaly type absent from training, by construction',
          'Resampling to balance the classes destroys probability calibration',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'Supplies the calibrated probability that an expected-value decision rule multiplies against costs. The optimization is downstream: choose the action maximizing expected value, where the probability comes from here.',
        where: [
          'Approve/decline thresholds set from expected loss rather than a fixed cutoff',
          'Propensity models feeding a causal estimator or a targeting allocation',
        ],
        why: 'The value is calibration, not accuracy. A decision rule multiplying probability by cost needs the probability to mean what it says — an uncalibrated model that ranks perfectly will still pick the wrong threshold, and logistic regression is calibrated by construction when fit on the log-loss it optimizes.',
        featurization: [
          'Avoid resampling and post-hoc thresholding tricks that break calibration',
          'Scale features so regularization penalizes them comparably',
        ],
        evaluation:
          'Calibration curves and Brier score alongside the decision metric; expected value at the chosen operating point.',
        pitfalls: [
          'Optimizing a threshold on the same data used to fit produces an over-optimistic operating point',
          'Regularization shrinks probabilities toward the base rate, which mildly decalibrates at high C',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'Fit on tabular application or transaction features with monotonic constraints where regulation requires them, and produce both a score and the reason codes explaining it.',
        where: [
          'Credit scoring, where adverse-action reasons are legally mandated',
          'Insurance underwriting under regulatory review',
        ],
        why: 'The default in regulated credit specifically because it is explainable and auditable. Gradient boosting scores better and cannot tell an applicant why they were declined in a form that survives a regulator — so here explainability is a hard constraint, not a preference, and this is the model that satisfies it.',
        featurization: [
          'Weight-of-evidence binning, which linearizes the relationship and yields interpretable bins',
          'Monotonic constraints so more income can never reduce the approval odds',
        ],
        evaluation: 'KS statistic and Gini alongside PR-AUC, with stability testing across time periods and demographic slices.',
        pitfalls: [
          'Proxy variables reintroduce protected attributes indirectly and must be tested for',
          'Label latency means recent applications are not yet fully outcome-labelled',
        ],
      },
      'natural-language': {
        fit: 'viable',
        how: 'TF-IDF or bag-of-words features into a linear classifier — the pre-transformer baseline that remains stubbornly competitive on narrow tasks.',
        where: [
          'Small-corpus document and intent classification',
          'The baseline any fine-tuned transformer must beat to justify its cost',
        ],
        why: 'On a few thousand labelled documents in a narrow domain, this trains in seconds, is fully interpretable at the token level, and often lands within a point or two of a fine-tuned encoder. It loses decisively once word order, negation, or long-range context matter.',
        featurization: [
          'TF-IDF with n-grams to recover a little local word order',
          'Sublinear term frequency scaling, which usually helps on longer documents',
        ],
        evaluation: 'Macro-F1 on a held-out split, reported against the transformer alternative so the cost comparison is explicit.',
        pitfalls: [
          'Bag-of-words cannot represent negation — "not good" and "good" share a token',
          'Vocabulary drift silently degrades the model as new terms appear',
        ],
      },
    },
  },

  deployment: {
    trainingCost: 'Seconds to minutes even on millions of rows. Cheap enough that hyperparameter search is unconstrained.',
    inferenceProfile:
      'One dot product and one exponential — sub-microsecond, and small enough to run inside a database query or on an edge device.',
    retrainingCadence:
      'Weekly to monthly typically; more often in adversarial settings like fraud where the population actively shifts.',
    driftAndMonitoring: [
      'Track calibration, not just discrimination — a model can keep its AUC while its probabilities drift meaningfully',
      'Watch coefficient stability across refits; a sign flip is a louder signal than a small metric drop',
      'Monitor the score distribution, since a shifting base rate silently invalidates a fixed threshold',
    ],
    productionGotchas: [
      'The scaler and encoder are part of the model — persist them together or predictions change silently',
      'Unseen categorical levels produce a column mismatch at inference; pin the encoder rather than re-deriving it',
      'A threshold tuned on one base rate is wrong at another, so it must be revisited whenever the population shifts',
    ],
  },

  assumptions: [
    'The log-odds are linear in the features, which is what feature engineering exists to arrange',
    'Observations are independent — violated by overlapping label windows and by repeated measures',
    'Features are not near-perfectly collinear',
    'Classes are not perfectly separable, or regularization is present to handle it',
  ],

  pros: [
    {
      point: 'Outputs calibrated probabilities by construction',
      context:
        'Decisive when a downstream rule multiplies probability by cost. Many stronger classifiers rank better while being badly calibrated, which makes their thresholds meaningless.',
    },
    {
      point: 'Coefficients are directly interpretable as log-odds',
      context:
        'What makes it legally viable in credit and insurance, where an adverse decision must come with a reason. Worthless when only the ranking is acted on.',
    },
    {
      point: 'Convex objective with a unique optimum',
      context:
        'No seeds, no restarts, reproducible fits — which matters far more in audited pipelines than a point of AUC.',
    },
    {
      point: 'Extremely cheap to fit and to serve',
      context:
        'Lets you retrain continuously and deploy anywhere. Irrelevant when accuracy dominates and compute is abundant.',
    },
  ],

  cons: [
    {
      point: 'Linear decision boundary only',
      context:
        'A hard ceiling wherever interactions dominate, which is where gradient boosting wins outright on tabular data. Not a limitation at all if the log-odds really are close to linear.',
    },
    {
      point: 'Requires manual feature engineering for interactions',
      context:
        'Every interaction must be constructed by hand, which is real work that trees do automatically — and the main practical reason teams migrate away from it.',
    },
    {
      point: 'Perfect separation breaks an unregularized fit',
      context:
        'Coefficients run to infinity and standard errors become meaningless. Trivially fixed by regularization, but surprising the first time it happens.',
    },
    {
      point: 'Sensitive to feature scaling under regularization',
      context:
        'The penalty is scale-dependent, so unscaled features are penalized unevenly. Harmless when unregularized, silently distorting when not.',
    },
  ],

  relatedSlugs: ['linear-regression', 'ridge-lasso', 'generalized-linear-models', 'support-vector-machine', 'naive-bayes', 'propensity-iptw'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Logistic regression by gradient descent - the objective, transcribed.

The gradient has the same shape as linear regression's: features weighted by
residuals. Only the link function differs, which is what makes both of these
generalized linear models.
"""

import math


def sigmoid(z):
    # Split by sign to avoid exp() overflowing on large negative z.
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    exp_z = math.exp(z)
    return exp_z / (1.0 + exp_z)


def fit(X, y, lr=0.1, epochs=1_000):
    n = len(X)
    d = len(X[0])
    theta = [0.0] * d
    bias = 0.0

    for _ in range(epochs):
        grad = [0.0] * d
        grad_bias = 0.0

        for i in range(n):
            z = bias
            for j in range(d):
                z += theta[j] * X[i][j]

            residual = sigmoid(z) - y[i]        # exactly the linear-model form
            for j in range(d):
                grad[j] += residual * X[i][j]
            grad_bias += residual

        for j in range(d):
            theta[j] -= lr * grad[j] / n
        bias -= lr * grad_bias / n

    return theta, bias


def log_loss(X, y, theta, bias):
    """Negative log-likelihood. Clipped, because log(0) is -inf and one
    confident mistake would otherwise make the whole loss infinite."""
    total = 0.0
    for x, target in zip(X, y):
        z = bias + sum(t * v for t, v in zip(theta, x))
        p = min(max(sigmoid(z), 1e-15), 1.0 - 1e-15)
        total -= target * math.log(p) + (1 - target) * math.log(1.0 - p)
    return total / len(y)`,
        profile: 'O(n·d) per epoch in pure Python — roughly 100x slower than the vectorized form.',
      },
      'make-it-right': {
        code: `"""Logistic regression - typed, validated, calibration-aware."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class ClassifierReport:
    """A score is not enough — a threshold decision needs calibration too."""

    model: Pipeline
    log_loss: float
    brier_score: float
    base_rate: float

    @property
    def is_calibrated(self) -> bool:
        """Brier below the base-rate variance means it beats predicting the
        base rate for everyone — a low bar, and one models do fail."""
        return self.brier_score < self.base_rate * (1.0 - self.base_rate)


def fit_classifier(
    X: Matrix,
    y: Vector,
    C: float = 1.0,
    balanced: bool = False,
) -> ClassifierReport:
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if not np.isin(y, (0, 1)).all():
        raise ValueError("y must be binary 0/1")
    if len(np.unique(y)) < 2:
        raise ValueError("y contains only one class - nothing to separate")

    # Scaling is inside the pipeline, not applied beforehand: the L2 penalty is
    # scale-dependent, and a scaler fitted separately will silently drift from
    # the model it was fitted with.
    model = Pipeline(
        [
            ("scale", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    C=C,
                    max_iter=1_000,
                    class_weight="balanced" if balanced else None,
                ),
            ),
        ]
    )
    model.fit(X, y)

    probabilities = model.predict_proba(X)[:, 1]
    clipped = np.clip(probabilities, 1e-15, 1 - 1e-15)

    return ClassifierReport(
        model=model,
        log_loss=float(-np.mean(y * np.log(clipped) + (1 - y) * np.log(1 - clipped))),
        brier_score=float(np.mean((probabilities - y) ** 2)),
        base_rate=float(y.mean()),
    )


def threshold_for_expected_cost(
    probabilities: Vector, cost_false_positive: float, cost_false_negative: float
) -> float:
    """The expected-cost-minimizing cutoff, which is a ratio of costs and has
    nothing to do with 0.5. Defaulting to 0.5 silently assumes the two errors
    are equally expensive, which they almost never are."""
    if cost_false_positive <= 0 or cost_false_negative <= 0:
        raise ValueError("costs must be positive")
    return cost_false_positive / (cost_false_positive + cost_false_negative)`,
        rationale:
          'Scaling moves inside a pipeline so it cannot drift from the model it was fitted with, the report carries calibration metrics rather than only discrimination, and the decision threshold is derived from costs instead of defaulting to 0.5 — which silently assumes false positives and false negatives cost the same.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'scikit-learn',
        profile: 'One L-BFGS fit; converges in tens of iterations on scaled features.',
      },
      'make-it-fast': {
        code: `"""Logistic regression - stable log-loss, single-pass gradient, warm starts."""

import numpy as np
from numpy.typing import NDArray
from scipy.special import expit, log_expit

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def log_loss_stable(X: Matrix, y: Vector, theta: Vector) -> float:
    """Log loss computed from logits directly, never from probabilities.

    The naive route (sigmoid, then clip, then log) loses precision exactly
    where it matters - on confident predictions, whose contribution underflows
    to the clip bound and stops being distinguishable. log_expit is the
    numerically stable log-sigmoid, so no clipping is needed at all.
    """
    logits = X @ theta
    # log(sigma(z)) for positives, log(1 - sigma(z)) = log(sigma(-z)) for negatives.
    return float(-np.mean(y * log_expit(logits) + (1 - y) * log_expit(-logits)))


def gradient(X: Matrix, y: Vector, theta: Vector, out: Vector) -> Vector:
    """Gradient written into a caller-owned buffer.

    Called once per optimizer iteration, so a fresh (d,) allocation per call
    is an allocation per iteration.
    """
    residual = expit(X @ theta)
    residual -= y                       # in place; no second array
    np.dot(X.T, residual, out=out)
    out /= X.shape[0]
    return out


def fit_newton(X: Matrix, y: Vector, l2: float = 1.0, iterations: int = 25) -> Vector:
    """IRLS / Newton steps.

    Second-order converges in tens of iterations rather than thousands, and at
    modest d the O(d^3) solve per step is far cheaper than the extra passes
    over the data that first-order methods need.
    """
    X = np.ascontiguousarray(X, dtype=np.float64)
    n, d = X.shape
    theta = np.zeros(d, dtype=np.float64)
    grad_buffer = np.empty(d, dtype=np.float64)

    for _ in range(iterations):
        p = expit(X @ theta)
        # w = p(1-p), the IRLS weights. Computed in place to avoid two temporaries.
        w = p * (1.0 - p)
        np.maximum(w, 1e-10, out=w)     # guard the Hessian against singularity

        gradient(X, y, theta, grad_buffer)
        grad_buffer += l2 * theta / n

        # Hessian = X^T W X + l2 I. einsum fuses the scaling and the product,
        # so the n x d weighted copy of X is never materialized.
        hessian = np.einsum("ij,i,ik->jk", X, w, X) / n
        hessian[np.diag_indices(d)] += l2 / n

        # solve(), not inv(): forming the inverse squares the condition number
        # and costs more.
        theta -= np.linalg.solve(hessian, grad_buffer)

    return theta`,
        rationale:
          'Log loss is computed from logits with a stable log-sigmoid rather than sigmoid-then-clip, which preserves precision exactly on the confident predictions the clip was destroying. The gradient writes into a reusable buffer, and the optimizer becomes second-order — tens of iterations instead of thousands — with the Hessian built by einsum so the weighted copy of the design matrix never exists.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'einsum fuses the IRLS weighting into the Gram product, so the n x d weighted copy of X that the readable form would build is never materialized.',
            tradeoff: 'einsum does not always dispatch to a BLAS GEMM; at large d an explicit (X * w[:, None]).T @ X can be faster despite the temporary.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The gradient buffer and in-place residual subtraction remove two (n,) and one (d,) allocation from every optimizer iteration.',
            tradeoff: 'The out= parameter makes the function non-reentrant — two threads sharing a buffer would corrupt each other silently.',
          },
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'np.linalg.solve factorizes the Hessian rather than inverting it, which halves the condition-number sensitivity and costs less.',
            tradeoff: 'A fresh factorization every Newton step; caching one across steps would be faster but wrong, since the Hessian changes.',
          },
        ],
        libraryName: 'NumPy / SciPy',
        profile: 'O(nd² + d³) per Newton step, ~25 steps. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Logistic regression by gradient descent - the objective, transcribed.
#include <cmath>
#include <cstddef>
#include <vector>

namespace {

// Split by sign so exp() cannot overflow on large negative z.
double Sigmoid(double z) {
  if (z >= 0.0) return 1.0 / (1.0 + std::exp(-z));
  const double exp_z = std::exp(z);
  return exp_z / (1.0 + exp_z);
}

}  // namespace

std::vector<double> Fit(const std::vector<std::vector<double>>& X,
                        const std::vector<int>& y,
                        double lr, int epochs) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> theta(d, 0.0);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::vector<double> grad(d, 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      double z = 0.0;
      for (std::size_t j = 0; j < d; ++j) z += theta[j] * X[i][j];

      // Same shape as linear regression's residual - only the link differs.
      const double residual = Sigmoid(z) - static_cast<double>(y[i]);
      for (std::size_t j = 0; j < d; ++j) grad[j] += residual * X[i][j];
    }

    for (std::size_t j = 0; j < d; ++j) {
      theta[j] -= lr * grad[j] / static_cast<double>(n);
    }
  }

  return theta;
}`,
        profile: 'O(n·d) per epoch. vector<vector<double>> scatters rows across the heap, missing cache on every row.',
      },
      'make-it-right': {
        code: `// Logistic regression - flat storage, RAII, threshold from costs.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

// Free function in an anonymous namespace: both the model and the free-standing
// Fit below need it, and neither should reach into the other's internals.
[[nodiscard]] double Sigmoid(double z) noexcept {
  if (z >= 0.0) return 1.0 / (1.0 + std::exp(-z));
  const double exp_z = std::exp(z);
  return exp_z / (1.0 + exp_z);
}

}  // namespace

class LogisticModel {
 public:
  explicit LogisticModel(std::vector<double> coefficients, double intercept)
      : coefficients_(std::move(coefficients)), intercept_(intercept) {}

  [[nodiscard]] double PredictProbability(std::span<const double> row) const {
    if (row.size() != coefficients_.size()) {
      throw std::invalid_argument("row width does not match the model");
    }
    double z = intercept_;
    for (std::size_t j = 0; j < coefficients_.size(); ++j) z += coefficients_[j] * row[j];
    return Sigmoid(z);
  }

  // The expected-cost-minimizing cutoff is a ratio of costs. Defaulting to 0.5
  // silently asserts the two error types are equally expensive.
  [[nodiscard]] static double ThresholdForCosts(double cost_fp, double cost_fn) {
    if (cost_fp <= 0.0 || cost_fn <= 0.0) {
      throw std::invalid_argument("costs must be positive");
    }
    return cost_fp / (cost_fp + cost_fn);
  }

  [[nodiscard]] std::span<const double> coefficients() const noexcept {
    return coefficients_;
  }

 private:
  std::vector<double> coefficients_;   // owned; rule of zero handles the rest
  double intercept_;
};

// X is row-major and flat: element (i, j) lives at x_flat[i * d + j].
LogisticModel Fit(std::span<const double> x_flat, std::span<const int> y,
                  std::size_t d, double lr, double l2, int epochs) {
  if (d == 0 || y.empty()) throw std::invalid_argument("empty problem");
  if (x_flat.size() != y.size() * d) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const std::size_t n = y.size();
  std::vector<double> theta(d, 0.0);
  std::vector<double> grad(d);          // hoisted out of the epoch loop
  double intercept = 0.0;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::fill(grad.begin(), grad.end(), 0.0);
    double grad_intercept = 0.0;

    for (std::size_t i = 0; i < n; ++i) {
      const double* row = x_flat.data() + i * d;
      double z = intercept;
      for (std::size_t j = 0; j < d; ++j) z += theta[j] * row[j];

      const double residual = Sigmoid(z) - static_cast<double>(y[i]);
      for (std::size_t j = 0; j < d; ++j) grad[j] += residual * row[j];
      grad_intercept += residual;
    }

    const double scale = lr / static_cast<double>(n);
    for (std::size_t j = 0; j < d; ++j) {
      // L2 shrinks the coefficients but never the intercept - penalizing it
      // would bias the model away from the observed base rate.
      theta[j] -= scale * (grad[j] + l2 * theta[j]);
    }
    intercept -= scale * grad_intercept;
  }

  return LogisticModel(std::move(theta), intercept);
}

double Sigmoid(double z) {
  if (z >= 0.0) return 1.0 / (1.0 + std::exp(-z));
  const double exp_z = std::exp(z);
  return exp_z / (1.0 + exp_z);
}`,
        rationale:
          'The nested vectors become one flat row-major buffer so a row is contiguous, the gradient buffer is hoisted out of the epoch loop, and two correctness details are made explicit: L2 never penalizes the intercept, and the decision threshold is derived from costs rather than defaulting to 0.5.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n·d) per epoch, one allocation total, contiguous row access.',
      },
      'make-it-fast': {
        code: `// Logistic regression - Eigen, IRLS, fused Hessian.
#include <Eigen/Dense>
#include <stdexcept>

namespace {

// Elementwise stable sigmoid over an array expression.
template <typename Derived>
auto Sigmoid(const Eigen::ArrayBase<Derived>& z) {
  return 1.0 / (1.0 + (-z).exp());
}

}  // namespace

// Newton / IRLS. Second-order converges in tens of iterations rather than
// thousands, and at modest d the O(d^3) solve is far cheaper than the extra
// full passes over the data that first-order methods need.
Eigen::VectorXd FitNewton(const Eigen::MatrixXd& X, const Eigen::VectorXd& y,
                          double l2, int iterations) {
  if (X.rows() != y.size()) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const Eigen::Index n = X.rows();
  const Eigen::Index d = X.cols();
  Eigen::VectorXd theta = Eigen::VectorXd::Zero(d);

  for (int iter = 0; iter < iterations; ++iter) {
    const Eigen::ArrayXd p = Sigmoid((X * theta).array());

    // IRLS weights, floored so the Hessian cannot go singular when the model
    // becomes confident and p(1-p) collapses toward zero.
    const Eigen::ArrayXd w = (p * (1.0 - p)).max(1e-10);

    const Eigen::VectorXd gradient =
        (X.transpose() * (p - y.array()).matrix()) / static_cast<double>(n) + l2 * theta / n;

    // X^T W X without materializing the weighted copy of X: asDiagonal() is a
    // lazy view, so Eigen folds the scaling into the product's traversal.
    Eigen::MatrixXd hessian =
        (X.transpose() * w.matrix().asDiagonal() * X) / static_cast<double>(n);
    hessian.diagonal().array() += l2 / static_cast<double>(n);

    // ldlt(), not inverse(): a Cholesky-style factorization of a symmetric
    // positive-definite Hessian, roughly half the cost of a general solve and
    // far better conditioned than forming the inverse.
    theta -= hessian.ldlt().solve(gradient);
  }

  return theta;
}`,
        rationale:
          'First-order descent is replaced by IRLS, which converges in tens of iterations rather than thousands. The Hessian is built through a lazy diagonal view so the weighted copy of the design matrix is never materialized, and it is solved by LDLT rather than inverted — exploiting the fact that it is symmetric positive definite.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The Gram product X^T W X dispatches to a blocked kernel that keeps operands in cache, which is where nearly all the time goes at large n.',
            tradeoff: 'The Hessian is O(d^2) memory and O(d^3) to factor, so past a few thousand features this stops being viable and first-order returns.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'asDiagonal() is a lazy view, so the weighting folds into the product traversal instead of building an n x d scaled copy of X every iteration.',
            tradeoff: 'Assigning such an expression to auto rather than a concrete type yields a dangling reference — the standard Eigen trap.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen relies on the compiler to vectorize its kernels; without optimization enabled it is no faster than the hand-written loop.',
            tradeoff: '-march=native produces a binary that may not run on older CPUs in a heterogeneous fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(nd² + d³) per Newton step, ~25 steps. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Logistic regression by gradient descent - the objective, transcribed.

fn sigmoid(z: f64) -> f64 {
    // Split by sign so exp() cannot overflow on large negative z.
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        let exp_z = z.exp();
        exp_z / (1.0 + exp_z)
    }
}

pub fn fit(x: &[Vec<f64>], y: &[i32], lr: f64, epochs: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut theta = vec![0.0; d];

    for _ in 0..epochs {
        let mut grad = vec![0.0; d];

        for i in 0..n {
            let mut z = 0.0;
            for j in 0..d {
                z += theta[j] * x[i][j];
            }

            // Same shape as linear regression's residual - only the link differs.
            let residual = sigmoid(z) - y[i] as f64;
            for j in 0..d {
                grad[j] += residual * x[i][j];
            }
        }

        for j in 0..d {
            theta[j] -= lr * grad[j] / n as f64;
        }
    }

    theta
}

pub fn log_loss(x: &[Vec<f64>], y: &[i32], theta: &[f64]) -> f64 {
    let mut total = 0.0;
    for (row, &target) in x.iter().zip(y) {
        let z: f64 = row.iter().zip(theta).map(|(v, t)| v * t).sum();
        // Clamped, because log(0) is -inf and one confident mistake would
        // otherwise make the entire loss infinite.
        let p = sigmoid(z).clamp(1e-15, 1.0 - 1e-15);
        total -= target as f64 * p.ln() + (1.0 - target as f64) * (1.0 - p).ln();
    }
    total / y.len() as f64
}`,
        profile: 'O(n·d) per epoch. Vec<Vec<f64>> scatters rows; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Logistic regression - typed errors, flat design matrix, stable log loss.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    SingleClass,
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::SingleClass => write!(f, "y contains only one class - nothing to separate"),
        }
    }
}

impl std::error::Error for FitError {}

#[derive(Debug, Clone)]
pub struct LogisticModel {
    coefficients: Vec<f64>,
    intercept: f64,
}

impl LogisticModel {
    #[must_use]
    pub fn coefficients(&self) -> &[f64] {
        &self.coefficients
    }

    pub fn predict_probability(&self, row: &[f64]) -> Result<f64, FitError> {
        if row.len() != self.coefficients.len() {
            return Err(FitError::ShapeMismatch {
                expected: self.coefficients.len(),
                found: row.len(),
            });
        }
        let z: f64 =
            self.intercept + self.coefficients.iter().zip(row).map(|(c, v)| c * v).sum::<f64>();
        Ok(sigmoid(z))
    }

    /// The expected-cost-minimizing cutoff is a ratio of costs. Defaulting to
    /// 0.5 silently asserts both error types cost the same.
    #[must_use]
    pub fn threshold_for_costs(cost_fp: f64, cost_fn: f64) -> f64 {
        cost_fp / (cost_fp + cost_fn)
    }
}

/// \`x\` is row-major and flat: element (i, j) lives at \`x[i * d + j]\`.
pub fn fit(
    x: &[f64],
    y: &[i32],
    d: usize,
    lr: f64,
    l2: f64,
    epochs: usize,
) -> Result<LogisticModel, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x.len() != y.len() * d {
        return Err(FitError::ShapeMismatch { expected: y.len() * d, found: x.len() });
    }
    if y.iter().all(|&v| v == y[0]) {
        return Err(FitError::SingleClass);
    }

    let n = y.len();
    let mut theta = vec![0.0_f64; d];
    let mut grad = vec![0.0_f64; d];        // hoisted out of the epoch loop
    let mut intercept = 0.0_f64;

    for _ in 0..epochs {
        grad.fill(0.0);
        let mut grad_intercept = 0.0;

        for (row, &target) in x.chunks_exact(d).zip(y) {
            let z = intercept + row.iter().zip(&theta).map(|(v, t)| v * t).sum::<f64>();
            let residual = sigmoid(z) - f64::from(target);
            for (g, v) in grad.iter_mut().zip(row) {
                *g += residual * v;
            }
            grad_intercept += residual;
        }

        let scale = lr / n as f64;
        for (t, g) in theta.iter_mut().zip(&grad) {
            // L2 shrinks coefficients but never the intercept - penalizing it
            // would bias the model away from the observed base rate.
            *t -= scale * (g + l2 * *t);
        }
        intercept -= scale * grad_intercept;
    }

    Ok(LogisticModel { coefficients: theta, intercept })
}

#[inline]
fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        let exp_z = z.exp();
        exp_z / (1.0 + exp_z)
    }
}`,
        rationale:
          'The nested Vec becomes one flat contiguous buffer walked with chunks_exact, failures become a typed Result checked before any work — including the single-class case that would otherwise fit a degenerate model — and the gradient buffer is hoisted out of the epoch loop.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n·d) per epoch, one allocation total, bounds checks elided in the inner loop.',
      },
      'make-it-fast': {
        code: `//! Logistic regression - parallel gradient, stable log-sum-exp loss.

use rayon::prelude::*;

/// Log loss computed from logits, never from probabilities.
///
/// The naive route (sigmoid, clamp, ln) destroys precision exactly on the
/// confident predictions that matter: they underflow to the clamp bound and
/// stop being distinguishable from each other. The log-sigmoid identity
/// \`ln(sigma(z)) = -ln(1 + e^-z)\` is stable for every z with no clamping.
#[must_use]
pub fn log_loss_stable(x: &[f64], y: &[i32], theta: &[f64], d: usize) -> f64 {
    let total: f64 = x
        .par_chunks_exact(d)
        .zip(y.par_iter())
        .map(|(row, &target)| {
            let z: f64 = row.iter().zip(theta).map(|(v, t)| v * t).sum();
            // ln(1 + e^x) evaluated stably in both tails.
            let softplus = |v: f64| if v > 0.0 { v + (-v).exp().ln_1p() } else { v.exp().ln_1p() };
            if target == 1 { softplus(-z) } else { softplus(z) }
        })
        .sum();

    total / y.len() as f64
}

/// Parallel batch gradient. \`x\` is row-major and flat.
///
/// The gradient is a sum over independent rows, so each worker accumulates a
/// private d-length buffer over its own chunk and the results are summed once.
/// No shared mutable state means no locking in the hot loop.
pub fn gradient_parallel(x: &[f64], y: &[i32], theta: &[f64], d: usize) -> Vec<f64> {
    x.par_chunks_exact(d)
        .zip(y.par_iter())
        .fold(
            || vec![0.0_f64; d],
            |mut acc, (row, &target)| {
                let z: f64 = row.iter().zip(theta).map(|(v, t)| v * t).sum();
                let residual = sigmoid(z) - f64::from(target);
                for (g, v) in acc.iter_mut().zip(row) {
                    *g += residual * v;
                }
                acc
            },
        )
        .reduce(
            || vec![0.0_f64; d],
            |mut a, b| {
                for (x, y) in a.iter_mut().zip(b) {
                    *x += y;
                }
                a
            },
        )
}

#[inline]
fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        let exp_z = z.exp();
        exp_z / (1.0 + exp_z)
    }
}`,
        rationale:
          'Log loss moves to a softplus formulation on the logits, which is stable in both tails and removes the clamping that was destroying precision on confident predictions. The gradient sum — independent across rows — becomes a rayon fold-reduce where each worker holds one private accumulator for its whole chunk rather than allocating per row.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Both the loss and the gradient are sums over independent rows, so they partition across cores with no shared state and no synchronization in the inner loop.',
            tradeoff: 'Work-stealing overhead dominates below roughly a few thousand rows, where the sequential version wins.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'par_chunks_exact zipped with the row slice lets the compiler prove both lengths, removing per-element bounds checks from the innermost dot product.',
            tradeoff: 'chunks_exact silently drops a trailing partial chunk, so the shape invariant must be validated before this is called.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each fold accumulator is allocated once at its exact final length, so no worker reallocates mid-chunk.',
            tradeoff: 'One allocation per worker per call remains; eliminating it entirely would need a reusable thread-local arena.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n·d) per epoch across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
