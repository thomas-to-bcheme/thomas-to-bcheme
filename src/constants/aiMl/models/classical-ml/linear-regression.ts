import type { AiMlModel } from '../../types';

/**
 * Linear Regression — the reference entry for this section.
 *
 * Chosen as the Phase 1 vertical slice because its code progression is
 * unambiguous in all three languages: an explicit sample loop, then the same
 * thing written the way each language wants it, then a closed-form solve with a
 * real trade-off to state (QR is O(nd^2) and materializes a design matrix, but
 * is numerically far better behaved than the normal equations it replaces).
 */
export const LINEAR_REGRESSION: AiMlModel = {
  slug: 'linear-regression',
  name: 'Linear Regression',
  aliases: ['Ordinary Least Squares', 'OLS'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'model',

  paradigms: ['supervised'],
  // 'anomaly-detection' because the model is genuinely used that way via
  // residual scoring — see applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'anomaly-detection'],

  intuition:
    'Draw the straight line (or hyperplane) that comes closest to every point at once, where "closest" means the sum of squared vertical distances is as small as it can be. Every coefficient answers one question: if this feature goes up by one unit and nothing else moves, how much does the prediction change?',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{n} \\sum_{i=1}^{n} \\left( \\mathbf{x}_i^{\\top}\\theta - y_i \\right)^2',
      symbols: [
        { symbol: 'n', meaning: 'number of training examples' },
        { symbol: '\\mathbf{x}_i', meaning: 'feature vector for example i (with a leading 1 for the intercept)' },
        { symbol: 'y_i', meaning: 'observed target for example i' },
        { symbol: '\\theta', meaning: 'the coefficient vector being fit' },
      ],
    },
    reading:
      'Average the squared gap between what the model predicts and what actually happened. Squaring makes errors in both directions count, and makes large errors count disproportionately — which is a modelling choice, not a neutral one: it is what makes least squares sensitive to outliers.',
  },

  optimization: {
    method: 'Closed-form least squares (QR factorization), or batch gradient descent',
    updateRule: {
      formula:
        '\\hat{\\theta} = (X^{\\top}X)^{-1}X^{\\top}y \\qquad\\text{or}\\qquad \\theta \\leftarrow \\theta - \\eta \\cdot \\frac{2}{n} X^{\\top}(X\\theta - y)',
      symbols: [
        { symbol: 'X', meaning: 'the n x d design matrix' },
        { symbol: '\\eta', meaning: 'learning rate, for the iterative form' },
        { symbol: 'X^{\\top}(X\\theta - y)', meaning: 'the gradient: features weighted by their residuals' },
      ],
    },
    rationale:
      'J is convex and quadratic in theta, so setting the gradient to zero has a unique closed-form solution — there are no local minima to worry about. In practice you never form the inverse: solving via QR factorization is the same answer with roughly half the condition-number sensitivity. Gradient descent is the right choice only when n is too large for the design matrix to fit in memory, or when the model is being fit online.',
    hyperparameters: [
      { name: 'learning rate (iterative only)', role: 'Step size; too large diverges, too small crawls', typicalRange: '1e-4 to 1e-1, after feature scaling' },
      { name: 'epochs (iterative only)', role: 'Number of full passes over the data', typicalRange: '100 to 10,000' },
      { name: 'fit_intercept', role: 'Whether to add a constant column; omit only if features are already centred' },
    ],
    convergence:
      'The closed form is exact — one shot, no tuning. Gradient descent converges at a rate governed by the condition number of X-transpose-X, so unscaled features are the usual cause of slow or oscillating convergence. The failure mode worth naming is collinearity: when two features are nearly duplicated, X-transpose-X is near-singular, the coefficients become enormous and unstable with opposite signs, and the fit still looks fine on training data. That is the problem Ridge exists to solve.',
    complexity:
      'Closed form: O(nd^2 + d^3) time, O(nd) memory. Gradient descent: O(nd) per epoch, O(d) memory beyond the data.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Turn the series into a supervised table: the target is the value at t+h, and the features are lagged values, rolling statistics, calendar dummies, and any exogenous drivers. The model then treats forecasting as ordinary regression — which is exactly why the lag design matters more than the estimator does.',
        where: [
          'Trend estimation and detrending as a preprocessing step before ARIMA',
          'Short-horizon demand forecasts where drivers (price, promotion, weather) dominate autocorrelation',
          'The interpretable baseline in a forecasting bake-off, where coefficients on each driver are themselves the deliverable',
        ],
        why: 'Not because it is the most accurate forecaster — it usually is not — but because it is the one whose coefficients you can hand to a planner and defend. When the question is "how much of the lift came from the promotion", a linear model answers it and a gradient-boosted one does not.',
        featurization: [
          'Lags at the seasonal period, not just t-1',
          'Rolling mean and standard deviation over trailing windows',
          'Fourier terms for smooth seasonality instead of one dummy per period',
          'Difference the series when the trend is stochastic rather than deterministic',
        ],
        evaluation:
          'Rolling-origin backtesting with an expanding window, scored with MASE against a seasonal-naive baseline. Never shuffled k-fold — it lets the model see the future.',
        pitfalls: [
          'Look-ahead leakage: rolling statistics computed over the full series before splitting',
          'Extrapolating a fitted linear trend far past the training range, where it becomes fiction',
          'Residual autocorrelation invalidates the standard errors even when the point forecasts are fine',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit the model to normal behaviour, then score residuals: a point whose actual value sits many robust standard deviations from its prediction is flagged. The model supplies the expectation; the anomaly score is how badly reality missed it.',
        where: [
          'Sensor and telemetry monitoring where one signal is a near-linear function of others',
          'Financial reconciliation, where a total should be a fixed linear combination of its parts',
        ],
        why: 'Only appropriate when normal behaviour genuinely is linear in the features. It is fast, explainable, and gives a residual you can attribute to a specific input — but it will not model a curved or multi-modal notion of normal, and forcing it to will produce a detector that fires constantly.',
        featurization: [
          'Robust scaling, since the fit itself is sensitive to the outliers you are hunting',
          'Fit on a confirmed-clean window, or the anomalies contaminate the definition of normal',
        ],
        evaluation:
          'Precision@k against confirmed incidents, with the threshold set from the residual quantiles of a known-clean period.',
        pitfalls: [
          'Training on contaminated data teaches the model to accept the anomalies',
          'A single large outlier drags the fitted line toward itself and masks its own detection',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Least squares is itself an unconstrained convex optimization problem, and its closed form is what a solver would converge to. In applied pipelines it more often plays the upstream role: producing the cost or demand estimate that a downstream optimizer takes as a fixed input.',
        where: [
          'Cost-curve fitting that feeds a linear program',
          'Response-surface estimation for capacity planning',
        ],
        why: 'Worth studying here because it is the smallest complete example of the pattern the whole category runs on — write the objective, take the gradient, set it to zero, and check whether the solution is stable. Ridge, Lasso, and the SVM are all this same argument with a constraint added.',
        featurization: [
          'Scale features before any iterative solve; conditioning is the whole story',
          'Encode the decision variables so the coefficients carry the units a planner expects',
        ],
        evaluation:
          'Compare the closed-form solution against an iterative solver on the same data; agreement to numerical tolerance is the correctness check.',
        pitfalls: [
          'Near-collinear features make the solution unstable without making the fit look bad',
          'Optimizing a fitted surrogate past the range where the fit was estimated',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'primary',
        how: 'With a treatment indicator and a credible identification strategy, the coefficient on that indicator is the estimated treatment effect, and its standard error is the uncertainty in it. Prediction is not the goal — the coefficient is.',
        where: [
          'Difference-in-differences estimation on panel data',
          'Regression adjustment for covariates in a randomized experiment',
          'Regression discontinuity around a policy threshold',
        ],
        why: 'The default in causal work precisely because the estimand is a coefficient with an interval. A more accurate predictor is not a better estimator here — accuracy and identification are different objectives, and this is the clearest case where optimizing the wrong one misleads.',
        featurization: [
          'Include confounders the design requires, not the features that improve fit',
          'Interaction terms where the effect is expected to vary by subgroup',
        ],
        evaluation:
          'Placebo tests and negative-control outcomes, plus sensitivity analysis for unmeasured confounding. Not R-squared.',
        pitfalls: [
          'Controlling for a collider or a post-treatment variable induces bias rather than removing it',
          'Reading a coefficient as causal when the design does not support it — the arithmetic is identical either way',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Effectively free. A closed-form fit on a million rows and fifty features finishes in well under a second on one core.',
    inferenceProfile:
      'A single dot product — sub-microsecond, trivially vectorized, and small enough to run anywhere including inside a SQL query or an edge device.',
    retrainingCadence:
      'Cheap enough to refit on every batch. The usual cadence is driven by how fast the relationship drifts, not by compute.',
    driftAndMonitoring: [
      'Track coefficient stability across refits — a sign flip is a louder signal than a small accuracy drop',
      'Monitor residual mean by segment; sustained one-sided error means the linear form no longer holds',
      'Watch the condition number of the design matrix, since new collinearity destabilizes coefficients silently',
    ],
    productionGotchas: [
      'Feature scaling must be persisted with the model; refitting a scaler at inference silently changes predictions',
      'Unseen categorical levels produce a column mismatch — pin the encoder, do not re-derive it',
      'The model extrapolates without complaint, so guard the input range explicitly if that matters',
    ],
  },

  assumptions: [
    'The relationship between features and target is linear in the parameters (features themselves may be transformed)',
    'Residuals are independent — violated by default on time series, which is why autocorrelation must be checked',
    'Residual variance is roughly constant across the range of predictions (homoscedasticity)',
    'Features are not near-perfectly collinear',
  ],

  pros: [
    {
      point: 'Coefficients are directly interpretable as marginal effects',
      context:
        'Decisive in regulated, causal, or stakeholder-facing work, where the explanation IS the deliverable. Nearly worthless when the only thing anyone acts on is the prediction itself.',
    },
    {
      point: 'Convex objective with an exact closed-form solution',
      context:
        'Means no tuning, no seeds, and reproducible fits — which matters far more in audited pipelines than the last point of accuracy.',
    },
    {
      point: 'Extremely cheap to train and to serve',
      context:
        'Lets you refit continuously and run inference in places a larger model cannot go. Irrelevant when accuracy dominates and you have GPUs to spare.',
    },
    {
      point: 'Well-understood statistical theory for uncertainty',
      context:
        'Standard errors and prediction intervals come for free under the assumptions — but only under them, which is exactly why the assumptions above are worth checking.',
    },
  ],

  cons: [
    {
      point: 'Cannot represent interactions or curvature unless you build them in',
      context:
        'A real ceiling on tabular problems where interactions dominate, which is where gradient boosting wins outright. Not a limitation at all if the relationship genuinely is close to linear.',
    },
    {
      point: 'Squared error makes it sensitive to outliers',
      context:
        'A serious problem in anomaly-adjacent work, where the outliers are the subject. Addressed by Huber loss or robust regression rather than by accepting it.',
    },
    {
      point: 'Collinearity destabilizes coefficients without hurting the fit',
      context:
        'Dangerous specifically because the training metrics look fine. If interpretation matters, this is the failure to check for first — and the reason Ridge exists.',
    },
    {
      point: 'Extrapolates confidently outside the training range',
      context:
        'Fine for interpolation-heavy scoring; genuinely hazardous for long-horizon forecasting, where a fitted trend keeps rising forever.',
    },
  ],

  relatedSlugs: ['ridge-lasso', 'logistic-regression', 'generalized-linear-models'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Least squares by batch gradient descent - the objective, transcribed.

Every loop below maps to one symbol in J(theta): the inner loop is the dot
product x_i . theta, err is the residual, and grad accumulates X^T (X theta - y).
"""


def fit(X, y, lr=0.01, epochs=1_000):
    n = len(X)
    d = len(X[0])
    theta = [0.0] * d
    bias = 0.0

    for _ in range(epochs):
        grad = [0.0] * d
        grad_bias = 0.0

        for i in range(n):
            # prediction: x_i . theta + b
            pred = bias
            for j in range(d):
                pred += theta[j] * X[i][j]

            err = pred - y[i]              # residual for example i
            for j in range(d):
                grad[j] += err * X[i][j]   # accumulate X^T r
            grad_bias += err

        # theta <- theta - lr * (2/n) * gradient
        scale = lr * 2.0 / n
        for j in range(d):
            theta[j] -= scale * grad[j]
        bias -= scale * grad_bias

    return theta, bias`,
        profile: 'O(n*d) per epoch in pure Python — roughly 100x slower than NumPy for the same arithmetic.',
      },
      'make-it-right': {
        code: `"""Least squares by gradient descent - typed, validated, vectorized."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class LinearModel:
    """A fitted model. Frozen so a fitted object cannot be mutated in place."""

    weights: Vector
    bias: float

    def predict(self, X: Matrix) -> Vector:
        if X.ndim != 2 or X.shape[1] != self.weights.size:
            raise ValueError(
                f"expected (n, {self.weights.size}) design matrix, got {X.shape}"
            )
        return X @ self.weights + self.bias


def fit(X: Matrix, y: Vector, lr: float = 0.01, epochs: int = 1_000) -> LinearModel:
    """Fit by batch gradient descent. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if X.shape[0] == 0:
        raise ValueError("cannot fit on an empty dataset")

    n, d = X.shape
    weights = np.zeros(d, dtype=np.float64)
    bias = 0.0
    scale = lr * 2.0 / n

    for _ in range(epochs):
        residual = X @ weights + bias - y      # the whole inner loop, vectorized
        weights -= scale * (X.T @ residual)
        bias -= scale * float(residual.sum())

    return LinearModel(weights=weights, bias=bias)`,
        rationale:
          'The three nested Python loops collapse into two matrix products, and the function now fails fast on malformed input instead of raising an opaque IndexError deep inside a loop. The frozen dataclass makes a fitted model an immutable value rather than a loose tuple whose element order you have to remember.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*d) per epoch, executed in BLAS rather than the interpreter.',
      },
      'make-it-fast': {
        code: `"""Least squares in closed form - one QR solve, no iteration."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def fit_exact(X: Matrix, y: Vector) -> tuple[Vector, float]:
    """Solve min ||X theta - y||^2 exactly.

    np.linalg.lstsq factorizes the design matrix (QR/SVD) rather than forming
    and inverting X^T X. Same solution, roughly half the condition-number
    sensitivity - the difference shows up precisely when features are
    near-collinear, which is when you most need the answer to be trustworthy.
    """
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError(f"shape mismatch: X={X.shape}, y={y.shape}")

    # Prepend the intercept column so it is solved for jointly, not separately.
    design = np.column_stack([np.ones(X.shape[0], dtype=X.dtype), X])
    coefficients, *_ = np.linalg.lstsq(design, y, rcond=None)

    return coefficients[1:], float(coefficients[0])`,
        rationale:
          'The iterative solve disappears entirely. The objective is convex and quadratic, so the minimum has a closed form — thousands of gradient steps were approximating an answer that one factorization computes exactly, with no learning rate to tune and no convergence to check.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'lstsq uses QR/SVD on X directly instead of forming X^T X, which squares the condition number and loses roughly half the available precision.',
            tradeoff: 'QR costs about twice the flops of the normal equations, and is worth it every time except in a tight inner loop on well-conditioned data.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The entire epoch loop is gone; the work becomes a single LAPACK call that is blocked and multithreaded internally.',
            tradeoff: 'Requires the full design matrix in memory — O(n*d) — so beyond that point the iterative version is the only option.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'column_stack produces one contiguous float64 array, so LAPACK operates on it without an internal copy.',
            tradeoff: 'Materializes a second array of the input size; for very wide X the copy is measurable.',
          },
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*d^2 + d^3) once, no iteration. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Least squares by batch gradient descent - the objective, transcribed.
#include <cstddef>
#include <vector>

std::vector<double> fit(const std::vector<std::vector<double>>& X,
                        const std::vector<double>& y,
                        double lr,
                        int epochs) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> theta(d, 0.0);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::vector<double> grad(d, 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      // prediction: x_i . theta
      double pred = 0.0;
      for (std::size_t j = 0; j < d; ++j) {
        pred += theta[j] * X[i][j];
      }

      const double err = pred - y[i];          // residual
      for (std::size_t j = 0; j < d; ++j) {
        grad[j] += err * X[i][j];              // accumulate X^T r
      }
    }

    const double scale = lr * 2.0 / static_cast<double>(n);
    for (std::size_t j = 0; j < d; ++j) {
      theta[j] -= scale * grad[j];
    }
  }

  return theta;
}`,
        profile: 'O(n*d) per epoch. vector<vector<double>> scatters rows across the heap, so it misses cache on every row.',
      },
      'make-it-right': {
        code: `// Least squares by gradient descent - RAII, const-correct, fails fast.
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

class LinearModel {
 public:
  explicit LinearModel(std::vector<double> weights)
      : weights_(std::move(weights)) {}

  [[nodiscard]] double Predict(std::span<const double> row) const {
    if (row.size() != weights_.size()) {
      throw std::invalid_argument("row width does not match model width");
    }
    double acc = 0.0;
    for (std::size_t j = 0; j < weights_.size(); ++j) {
      acc += weights_[j] * row[j];
    }
    return acc;
  }

  [[nodiscard]] std::span<const double> weights() const noexcept {
    return weights_;
  }

 private:
  std::vector<double> weights_;   // owned; rule of zero handles the rest
};

// X is row-major and flat: element (i, j) lives at x_flat[i * d + j].
LinearModel Fit(std::span<const double> x_flat,
                std::span<const double> y,
                std::size_t d,
                double lr,
                int epochs) {
  if (d == 0 || y.empty()) {
    throw std::invalid_argument("empty problem");
  }
  if (x_flat.size() != y.size() * d) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const std::size_t n = y.size();
  std::vector<double> theta(d, 0.0);
  std::vector<double> grad(d);                 // hoisted out of the loop
  const double scale = lr * 2.0 / static_cast<double>(n);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::fill(grad.begin(), grad.end(), 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      const double* row = x_flat.data() + i * d;
      double pred = 0.0;
      for (std::size_t j = 0; j < d; ++j) {
        pred += theta[j] * row[j];
      }
      const double err = pred - y[i];
      for (std::size_t j = 0; j < d; ++j) {
        grad[j] += err * row[j];
      }
    }

    for (std::size_t j = 0; j < d; ++j) {
      theta[j] -= scale * grad[j];
    }
  }

  return LinearModel(std::move(theta));
}`,
        rationale:
          'Three changes, each structural rather than cosmetic. The nested vector becomes one flat row-major buffer, so a row is contiguous and the hardware prefetcher can actually work. Inputs are validated before any allocation, so a shape error surfaces at the call site rather than as undefined behaviour. And the gradient buffer is hoisted out of the epoch loop, removing one heap allocation per epoch.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d) per epoch, one allocation total, contiguous access.',
      },
      'make-it-fast': {
        code: `// Least squares in closed form - Eigen, QR, no iteration.
#include <Eigen/Dense>
#include <stdexcept>

// Solves min ||X theta - y||^2 exactly via Householder QR.
//
// Deliberately NOT (X^T X)^-1 X^T y: forming the normal equations squares the
// condition number of X, so a design matrix that QR handles comfortably can
// lose most of its significant digits through the explicit inverse.
Eigen::VectorXd FitExact(const Eigen::MatrixXd& X, const Eigen::VectorXd& y) {
  if (X.rows() != y.size()) {
    throw std::invalid_argument("X and y describe different row counts");
  }
  if (X.rows() < X.cols()) {
    throw std::invalid_argument("underdetermined system: fewer rows than columns");
  }

  return X.householderQr().solve(y);
}

// The iterative form, for when X does not fit in memory. The expression
// X.transpose() * (X * theta - y) is a single fused evaluation - Eigen's
// expression templates mean no intermediate vector is ever materialized.
Eigen::VectorXd FitIterative(const Eigen::MatrixXd& X,
                             const Eigen::VectorXd& y,
                             double lr,
                             int epochs) {
  Eigen::VectorXd theta = Eigen::VectorXd::Zero(X.cols());
  const double scale = lr * 2.0 / static_cast<double>(X.rows());

  for (int epoch = 0; epoch < epochs; ++epoch) {
    theta -= scale * (X.transpose() * (X * theta - y));
  }
  return theta;
}`,
        rationale:
          'The hand-written loops are replaced by Eigen expressions that compile down to blocked, vectorized kernels — and in the iterative variant, the whole gradient expression is fused into one pass with no temporary vectors. The closed form removes the iteration entirely.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'X.transpose() * (X * theta - y) evaluates in a single pass; written with explicit intermediates it would allocate and traverse two extra vectors per epoch.',
            tradeoff: 'Expression templates make compiler errors famously verbose, and an expression accidentally stored in auto can dangle.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Eigen dispatches large products to a blocked kernel that keeps operands in cache, which is where nearly all the speedup comes from.',
            tradeoff: 'Only pays off above a size threshold; for very small d the dispatch overhead makes it slower than the naive loop.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen relies on the compiler to vectorize its kernels; without optimization flags enabled it is no faster than the hand-written version.',
            tradeoff: '-march=native produces a binary that may not run on an older CPU in the fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*d^2 + d^3) once for the QR solve. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Least squares by batch gradient descent - the objective, transcribed.

pub fn fit(x: &[Vec<f64>], y: &[f64], lr: f64, epochs: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut theta = vec![0.0; d];

    for _ in 0..epochs {
        let mut grad = vec![0.0; d];

        for i in 0..n {
            // prediction: x_i . theta
            let mut pred = 0.0;
            for j in 0..d {
                pred += theta[j] * x[i][j];
            }

            let err = pred - y[i];              // residual
            for j in 0..d {
                grad[j] += err * x[i][j];       // accumulate X^T r
            }
        }

        let scale = lr * 2.0 / n as f64;
        for j in 0..d {
            theta[j] -= scale * grad[j];
        }
    }

    theta
}`,
        profile: 'O(n*d) per epoch. Every index is bounds-checked, and Vec<Vec<f64>> scatters rows across the heap.',
      },
      'make-it-right': {
        code: `//! Least squares by gradient descent - Result-based errors, borrowed slices.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for FitError {}

#[derive(Debug, Clone)]
pub struct LinearModel {
    weights: Vec<f64>,
}

impl LinearModel {
    #[must_use]
    pub fn weights(&self) -> &[f64] {
        &self.weights
    }

    pub fn predict(&self, row: &[f64]) -> Result<f64, FitError> {
        if row.len() != self.weights.len() {
            return Err(FitError::ShapeMismatch {
                expected: self.weights.len(),
                found: row.len(),
            });
        }
        Ok(self.weights.iter().zip(row).map(|(w, v)| w * v).sum())
    }
}

/// \`x\` is row-major and flat: element (i, j) lives at \`x[i * d + j]\`.
pub fn fit(
    x: &[f64],
    y: &[f64],
    d: usize,
    lr: f64,
    epochs: usize,
) -> Result<LinearModel, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x.len() != y.len() * d {
        return Err(FitError::ShapeMismatch {
            expected: y.len() * d,
            found: x.len(),
        });
    }

    let n = y.len();
    let mut theta = vec![0.0_f64; d];
    let mut grad = vec![0.0_f64; d];      // hoisted out of the epoch loop
    let scale = lr * 2.0 / n as f64;

    for _ in 0..epochs {
        grad.fill(0.0);

        for (row, &target) in x.chunks_exact(d).zip(y) {
            let pred: f64 = row.iter().zip(&theta).map(|(v, t)| v * t).sum();
            let err = pred - target;
            for (g, v) in grad.iter_mut().zip(row) {
                *g += err * v;
            }
        }

        for (t, g) in theta.iter_mut().zip(&grad) {
            *t -= scale * g;
        }
    }

    Ok(LinearModel { weights: theta })
}`,
        rationale:
          'Errors become a typed Result the caller must handle rather than a panic, the nested Vec becomes one flat contiguous buffer, and every index loop becomes an iterator chain. The iterator rewrite is not only stylistic: chunks_exact and zip let the compiler prove the lengths line up, so the bounds checks in the hot loop are eliminated.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d) per epoch, one allocation total, bounds checks elided in the inner loop.',
      },
      'make-it-fast': {
        code: `//! Least squares by gradient descent - data-parallel over rows.

use rayon::prelude::*;

/// Parallel batch gradient descent. \`x\` is row-major and flat.
///
/// The gradient is a sum over independent rows, which makes it a textbook
/// fold-then-reduce: each worker accumulates a private \`d\`-length gradient over
/// its own chunk of rows, and the per-thread results are summed once at the end.
/// No shared mutable state, so no locking and no atomics in the hot loop.
pub fn fit_parallel(x: &[f64], y: &[f64], d: usize, lr: f64, epochs: usize) -> Vec<f64> {
    let n = y.len();
    let mut theta = vec![0.0_f64; d];
    let scale = lr * 2.0 / n as f64;

    for _ in 0..epochs {
        let grad = x
            .par_chunks_exact(d)
            .zip(y.par_iter())
            .fold(
                || vec![0.0_f64; d],
                |mut acc, (row, &target)| {
                    let pred: f64 = row.iter().zip(&theta).map(|(v, t)| v * t).sum();
                    let err = pred - target;
                    for (g, v) in acc.iter_mut().zip(row) {
                        *g += err * v;
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
            );

        for (t, g) in theta.iter_mut().zip(&grad) {
            *t -= scale * g;
        }
    }

    theta
}`,
        rationale:
          'The gradient sum is embarrassingly parallel across rows, so the sequential fold becomes a rayon fold-reduce. The structure is deliberately allocation-light: fold gives each worker one private accumulator for its whole chunk rather than one vector per row, which is the difference between this scaling with cores and being dominated by allocator contention.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The gradient is a sum of independent per-row contributions, so it partitions across cores with no shared mutable state and no synchronization in the inner loop.',
            tradeoff: 'Work-stealing overhead dominates for small n — below roughly a few thousand rows the sequential version wins.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'par_chunks_exact(d) zipped with the row slice lets the compiler prove both lengths, removing per-element bounds checks from the innermost loop.',
            tradeoff: 'chunks_exact silently drops a trailing partial chunk, so the shape invariant must be validated before this is called.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each fold accumulator is allocated once at its exact final length, so no worker reallocates mid-chunk.',
            tradeoff: 'One allocation per worker per epoch remains; a fully allocation-free version would need a reusable thread-local arena.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*d) per epoch spread across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
