import type { AiMlModel } from '../../types';

/**
 * Ridge, Lasso & Elastic Net — the same linear model with a price on
 * coefficient size.
 *
 * Sits immediately after linear-regression in the backlog because it is the
 * answer to the failure mode that entry names and leaves open: collinearity
 * destabilizing coefficients without hurting the fit. The code progression is
 * built around coordinate descent rather than gradient descent, because the L1
 * kink is the whole point and a gradient method cannot see it.
 */
export const RIDGE_LASSO: AiMlModel = {
  slug: 'ridge-lasso',
  name: 'Ridge, Lasso & Elastic Net',
  aliases: ['L2 regularization', 'L1 regularization', 'Tikhonov regularization', 'Penalized regression'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'model',

  paradigms: ['supervised'],
  // 'classification' because the same three penalties define L1/L2-penalized
  // logistic regression, which is the deployed form in credit and fraud
  // scoring; 'anomaly-detection' via residual scoring on correlated signals —
  // see applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'classification', 'anomaly-detection'],
  paradigmNote:
    'The penalty is a property of the objective, not of the response type: attach it to squared error and you get Ridge/Lasso regression, attach it to log loss and you get penalized logistic regression. The entry covers the penalty, so it inherits both task types.',

  intuition:
    'Ordinary least squares will happily hand two nearly identical features enormous coefficients of opposite sign, because only their sum is pinned down by the data. Put a price on coefficient size and that stops. An L2 price (Ridge) is smooth, so it shrinks correlated features toward each other and keeps all of them; an L1 price (Lasso) has a corner at zero, so it pushes most coefficients exactly to zero and hands back a subset. Elastic net charges both. In every case you are buying a large reduction in variance with a small amount of bias — deliberately fitting the training data worse in order to predict new data better.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\beta) = \\frac{1}{2n} \\lVert y - X\\beta \\rVert_2^2 + \\lambda \\left( \\alpha \\lVert \\beta \\rVert_1 + \\frac{1 - \\alpha}{2} \\lVert \\beta \\rVert_2^2 \\right)',
      symbols: [
        { symbol: '\\lambda', meaning: 'penalty strength — how expensive a unit of coefficient is' },
        { symbol: '\\alpha', meaning: 'mixing parameter: 1 is pure Lasso, 0 is pure Ridge, in between is elastic net' },
        { symbol: '\\lVert \\beta \\rVert_1', meaning: 'sum of absolute coefficients — the penalty with a corner at zero' },
        { symbol: '\\lVert \\beta \\rVert_2^2', meaning: 'sum of squared coefficients — smooth everywhere, so it never reaches zero' },
        { symbol: 'n', meaning: 'number of training examples; the scaling keeps lambda comparable across dataset sizes' },
      ],
    },
    reading:
      'Squared error, plus a fee for every unit of coefficient you spend. Lambda sets the price; alpha decides whether the fee is charged on absolute size or on squared size. The two penalties look almost identical written down and behave completely differently, and the difference is entirely the kink: an absolute value is not differentiable at zero, and that non-differentiability is what produces exact zeros rather than merely small numbers.',
  },

  optimization: {
    method: 'Cyclic coordinate descent with soft-thresholding; Ridge alone also has a closed form',
    updateRule: {
      formula:
        '\\beta_j \\leftarrow \\frac{S\\!\\left( \\frac{1}{n} \\sum_{i=1}^{n} x_{ij} r_i^{(-j)}, \\; \\lambda\\alpha \\right)}{\\frac{1}{n}\\lVert x_j \\rVert_2^2 + \\lambda(1 - \\alpha)}, \\qquad S(z, \\gamma) = \\text{sign}(z) \\max(\\lvert z \\rvert - \\gamma, 0)',
      symbols: [
        { symbol: 'r_i^{(-j)}', meaning: 'partial residual: the residual with feature j’s own contribution added back in' },
        { symbol: 'S(z, \\gamma)', meaning: 'the soft-threshold — move z toward zero by gamma, and stop at zero' },
        { symbol: 'x_j', meaning: 'column j of the design matrix' },
        { symbol: '\\lambda(1 - \\alpha)', meaning: 'the L2 share, which appears in the denominator: Ridge shrinks by dividing, Lasso by subtracting' },
      ],
    },
    rationale:
      'The L1 term is convex but not differentiable at zero, and zero is exactly where the interesting behaviour lives — so a gradient method has nothing to work with. Coordinate descent sidesteps it: hold every other coefficient fixed and the remaining one-dimensional problem has an exact solution in closed form, kink included. That is the soft-threshold above, and reading it tells you the whole story — the numerator subtracts and clips at zero (selection), the denominator divides (shrinkage). Ridge alone is smooth and has the closed form (X-transpose-X + n·lambda·I)^-1 X-transpose-y, which is the normal equations with lambda added to the diagonal: the numerical fix for a near-singular matrix and the statistical fix for unstable coefficients are literally the same operation.',
    hyperparameters: [
      { name: 'lambda', role: 'Penalty strength. The one hyperparameter that matters, and it must be cross-validated, not guessed', typicalRange: 'a geometric path of ~100 points from lambda_max (the smallest value that zeroes everything) down to 1e-3 x lambda_max' },
      { name: 'alpha (l1_ratio)', role: 'L1 share of the penalty: selection versus shrinkage', typicalRange: '0 (Ridge), 1 (Lasso), 0.5 to 0.9 for elastic net on correlated features' },
      { name: 'standardization', role: 'Not optional. The penalty is charged in feature units, so unscaled features get arbitrary amounts of shrinkage' },
      { name: 'max sweeps / tolerance', role: 'Coordinate-descent stopping rule; convergence is fast, so these rarely bind', typicalRange: '100 sweeps, tol 1e-7 on the largest coefficient change' },
    ],
    convergence:
      'The objective is convex, so coordinate descent reaches the global optimum, and because each coordinate step is exact rather than approximate it converges quickly and monotonically. The failure modes are about identification, not convergence. With a group of correlated features, Lasso keeps one essentially arbitrarily and zeroes the rest: predictions barely move, but the selected support changes from one bootstrap resample to the next — which makes it a good predictor and a bad answer to "which variables matter". Elastic net blunts this and does not remove it. The second failure is silent: the penalty is not scale-invariant, so if features are not standardized the model is quietly encoding your choice of units as a modelling decision.',
    complexity:
      'Coordinate descent with residual updates: O(nd) per sweep. With a precomputed Gram matrix: O(d^2) per sweep independent of n, which is the right trade when n >> d and the wrong one when d >> n. Ridge closed form: O(nd^2 + d^3). A full 100-point regularization path with warm starts typically costs only a few times a single fit.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'The same lag-and-calendar design matrix OLS would use, but built deliberately wide — every lag out to the seasonal period, every rolling statistic, every exogenous driver — and then the penalty decides which survive. This inverts the usual workflow: instead of choosing lags by squinting at an ACF plot, you offer all of them and read back the support.',
        where: [
          'Demand forecasting with many correlated drivers (price, promotion, weather, competitor activity)',
          'Load and energy forecasting, where calendar and weather features are numerous and heavily overlapping',
          'Automatic lag selection on high-frequency series where hand-picking lags does not scale across thousands of series',
          'The regularized baseline in a forecasting bake-off, chosen because its coefficients stay stable across refits',
        ],
        why: 'Lag features are collinear almost by construction — lag 1 and lag 2 of a smooth series are nearly the same column — and that is precisely where OLS coefficients blow up. Ridge stabilizes them; Lasso additionally returns a short, defensible list of drivers. It is the wrong choice when the dynamics themselves are the story: ARIMA and state-space models encode autocorrelation structurally, whereas this only ever sees the lags you thought to include.',
        featurization: [
          'Standardize before penalizing, using statistics computed only on the training window',
          'Fourier terms for seasonality rather than one dummy per period, so the penalty is spent on a handful of harmonics',
          'Difference or detrend first, or a large share of the penalty budget goes on fighting the trend',
          'Group the dummies of one categorical so the penalty keeps or drops the category as a unit',
        ],
        evaluation:
          'Rolling-origin cross-validation to pick lambda — never shuffled k-fold, which lets the model see the future. Score MASE against seasonal-naive, and separately check that the selected support is stable across folds: a support that changes completely between folds means the selection is noise, even when the accuracy looks fine.',
        pitfalls: [
          'Choosing lambda by in-sample fit, which always prefers lambda = 0 and defeats the entire method',
          'Computing standardization statistics over the whole series before splitting — the most common leak in this design',
          'Reading the Lasso support as the set of causal drivers; it is a prediction subset chosen under correlation',
          'Large lambda collapses the model toward the intercept, which looks deceptively well-behaved on stable series',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit on a clean window and score residuals, as with OLS — but the penalty is what makes it workable when the monitored signals are many and redundant, which in telemetry they always are. The sharper variant regresses each signal on all the others and treats the Lasso support as a learned dependency graph, then alarms when a residual breaks a relationship that graph asserts.',
        where: [
          'Multivariate process monitoring in manufacturing, where dozens of sensors measure overlapping physics',
          'Infrastructure telemetry where signals are redundant by design (replicas, mirrored feeds)',
          'Reconciliation across correlated financial series, where a total should be a fixed combination of parts',
        ],
        why: 'OLS residuals on collinear sensors are unstable: the fit can shuffle weight between two near-duplicate sensors between refits, and the residual moves with it, generating alerts that are artefacts of the estimator rather than events in the world. Ridge pins the residual down. It remains the wrong tool when normal behaviour is nonlinear or multi-modal — forcing a linear notion of normal onto that produces a detector that fires constantly and gets muted.',
        featurization: [
          'Standardize on a confirmed-clean window and persist those statistics with the model',
          'Robust scaling, since the fit is sensitive to exactly the outliers being hunted',
          'Exclude the target sensor from its own predictor set, or the model learns the identity map',
        ],
        evaluation:
          'Precision@k against confirmed incidents, with the alarm threshold set from residual quantiles over a known-clean period and lambda cross-validated on clean data only.',
        pitfalls: [
          'A contaminated training window teaches the model to treat the anomalies as normal',
          'Large lambda shrinks predictions toward the mean, inflating every residual uniformly and invalidating a threshold calibrated at a smaller lambda',
          'Lasso dropping a sensor entirely makes anomalies confined to that sensor invisible — sparsity and coverage are in direct tension here',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'The Lasso is itself a constrained convex program — minimize squared error subject to an L1 ball of radius t — and the objective above is its Lagrangian form. What earns it a place under this heading is that the constraint is non-smooth, so ordinary gradient machinery fails and you have to reach for proximal or coordinate methods. Downstream, the sparse model it returns is also what makes a fitted surrogate cheap enough to embed inside a larger optimizer.',
        where: [
          'Compressed sensing and sparse signal recovery, where the sparse solution is the answer rather than a convenience',
          'Sparse surrogate models embedded in the objective of an MPC or LP',
          'Feature-budget selection when the cost of scoring a feature at serving time is a hard constraint',
        ],
        why: 'This is the smallest problem where the geometry of the constraint set changes the answer. The L1 ball has corners on the axes; a convex objective touching a cornered set generically touches it at a corner, which is precisely why Lasso produces exact zeros and Ridge — whose ball is round — never does. Every later argument about non-smooth optimization is a variation on that picture.',
        featurization: [
          'Standardize so the constraint set is isotropic; an unscaled feature is effectively given a larger budget',
          'Use per-coefficient penalty weights when features genuinely differ in acquisition cost, rather than a single lambda',
        ],
        evaluation:
          'Check the KKT conditions at the returned solution: every zeroed coefficient must have a correlation with the residual inside the threshold. That is an exact, cheap correctness test — unlike "the objective stopped moving", which a coordinate method can satisfy while still far from optimal on a coordinate it has not revisited.',
        pitfalls: [
          'Declaring convergence from a stalled objective without checking the KKT conditions on the inactive set',
          'Proximal gradient with a step size above 1/L, which diverges quietly rather than failing loudly',
          'Optimizing against a fitted sparse surrogate outside the range where it was estimated',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'Attach the same penalties to logistic log loss instead of squared error. L2-penalized logistic regression is the default credit and fraud scorecard, and L1 is how a candidate pool of several thousand engineered features is cut down to the twenty a model risk committee will actually review.',
        where: [
          'Credit scorecards and probability-of-default models',
          'Card-present and card-not-present transaction fraud scoring under heavy class imbalance',
          'Insurance underwriting and anti-money-laundering triage models',
        ],
        why: 'Regulated scoring wants a low-dimensional, inspectable model whose coefficients can be defended one at a time and which stays stable across quarterly refits. The penalty delivers both directly. Gradient boosting usually wins on AUC and routinely loses the deployment argument, because there is no comparable review story — which is a governance fact, not a modelling one, and it decides the choice anyway.',
        featurization: [
          'Weight-of-evidence or monotone binned encodings, so each coefficient has a sign a reviewer can sanity-check',
          'Standardize before penalizing; leave the intercept unpenalized',
          'Group the dummies of one categorical under a single penalty so the variable is kept or dropped as a unit',
        ],
        evaluation:
          'Cross-validated AUC and KS for ranking, plus a calibration check, with lambda selected on out-of-time folds rather than random ones — the deployment gap in this domain is temporal, and random folds systematically over-state performance.',
        pitfalls: [
          'Penalizing the intercept, which biases the base rate and quietly mis-calibrates every score',
          'Class imbalance interacting with the penalty so the model shrinks toward predicting the majority class',
          'Treating the selected support as a stable feature list when correlated features swap places between refits',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'Lasso is a natural way to choose which of many candidate confounders to adjust for — and the naive version of that is exactly the error that motivated modern causal ML. Regularizing the treatment coefficient shrinks the estimate toward zero, and selecting confounders from the outcome equation alone omits variables that matter mainly through treatment assignment. The correct form is post-double-selection, or the orthogonalized residual-on-residual construction that double machine learning uses.',
        where: [
          'High-dimensional confounder selection in observational studies with more covariates than units',
          'The nuisance-function fits inside double machine learning and related orthogonal estimators',
          'Post-double-selection inference on panel data with many fixed effects',
        ],
        why: 'It is the honest answer to "I have 500 covariates and 2,000 units" — but only inside a design that keeps the penalty away from the parameter you care about. Used naively it yields intervals with essentially no coverage, which is strictly worse than a wide interval, because a confidently wrong estimate is acted upon.',
        featurization: [
          'Never penalize the treatment indicator; it enters the model unshrunk by construction',
          'Standardize covariates but not the treatment, so the penalty does not depend on treatment coding',
          'Take the union of the variables selected in the treatment and outcome equations (double selection)',
        ],
        evaluation:
          'Interval coverage under simulation with a known effect, not predictive fit — a Lasso that predicts the outcome better may have selected away the confounders that mattered. Follow with sensitivity analysis for the variables the selection dropped.',
        pitfalls: [
          'Reporting a shrunk treatment coefficient as an effect estimate',
          'Post-selection inference that ignores that the model itself was chosen from the data',
          'Assuming sparsity when the true confounding is dense — the guarantees are conditional on a sparsity that nothing verifies',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Effectively free at a single lambda, and a full 100-point path with warm starts typically costs only a few times one fit — which is why cross-validating lambda is cheap enough that there is no excuse for hand-picking it.',
    inferenceProfile:
      'A dot product, and after Lasso a shorter one: the selected support is often a tenth of the candidate features. That matters less for the multiplications than for the feature fetches it removes from the serving path.',
    retrainingCadence:
      'Cheap enough to refit continuously. The real constraint is not compute but that the selected support changes between refits, so anything downstream that keyed on "the model uses these twenty features" breaks quietly.',
    driftAndMonitoring: [
      'Track the selected support across refits — churn in the support is the earliest signal that features are correlated and the selection is noise',
      'Watch the cross-validated lambda itself; a lambda drifting upward means the signal-to-noise in the features is deteriorating',
      'Monitor the standardization statistics separately from the model, since the penalty is scale-dependent and a scaler drift silently changes how much each feature is shrunk',
      'Compare coefficient magnitudes against the previous refit; under a fixed lambda a large jump means the conditioning of the design changed',
    ],
    productionGotchas: [
      'The standardization is part of the model, not preprocessing — persist the exact means and scales, and never refit them at inference',
      'Do not penalize the intercept; established libraries handle this, hand-rolled implementations routinely do not',
      'Lasso coefficients are biased toward zero by construction, so they are shrunk estimates and not marginal effects; reporting them as effects is a category error',
      'A feature Lasso dropped still has to exist in the serving pipeline if lambda is ever re-tuned — deleting it upstream makes the next refit silently different',
    ],
  },

  assumptions: [
    'Everything ordinary least squares assumes about linearity and residual structure still holds — the penalty changes the estimator, not the model',
    'Features are standardized, because the penalty is charged in feature units and is not scale-invariant',
    'For Lasso to recover the correct support, the true model must actually be sparse and the irrelevant features must not be too correlated with the relevant ones (the irrepresentable condition)',
    'The induced bias is acceptable — this is a prediction estimator by construction, and its coefficients are shrunk on purpose',
  ],

  pros: [
    {
      point: 'Trades a controlled amount of bias for a large reduction in variance',
      context:
        'Decisive when d approaches or exceeds n, or when features are collinear — the regime where OLS has no unique solution at all. Close to pointless when n >> d and features are near-orthogonal, where OLS is already the best unbiased estimator and the penalty only adds bias.',
    },
    {
      point: 'Lasso performs feature selection inside the fit rather than as a separate step',
      context:
        'One convex problem instead of a greedy stepwise search, and the result is reproducible. But the support is unstable under correlated features, which makes it an excellent prediction tool and a poor answer to "which variables matter".',
    },
    {
      point: 'Ridge has a closed form and stays defined even when X-transpose-X is singular',
      context:
        'Adding lambda to the diagonal is simultaneously the numerical fix for an ill-conditioned matrix and the statistical fix for unstable coefficients. That the two are the same operation is the most useful thing in the method.',
    },
    {
      point: 'The whole regularization path is cheap, so lambda can be cross-validated honestly',
      context:
        'Warm starts make a hundred fits cost a few times one. Since there is no reason to guess lambda, a guessed lambda is a reliable sign that the rest of the pipeline was not validated either.',
    },
  ],

  cons: [
    {
      point: 'Coefficients are biased and cannot be read as effect estimates',
      context:
        'Fatal in causal or regulatory work where the coefficient is the deliverable. It is exactly why double machine learning orthogonalizes rather than simply regularizing — the penalty that helps prediction is the same penalty that destroys the estimate.',
    },
    {
      point: 'Lasso chooses essentially arbitrarily among correlated features',
      context:
        'Two near-duplicate columns: one is kept, one is zeroed, and which is which can change with the seed of your cross-validation split. Elastic net blunts this by keeping correlated groups together, but does not make the selection identifiable.',
    },
    {
      point: 'Requires standardization, which becomes state that ships with the model',
      context:
        'Not a modelling flaw, but the flaw that actually bites in production: predictions drift because a scaler was refit somewhere upstream, and nothing in the model surfaces it.',
    },
    {
      point: 'Still a linear model',
      context:
        'Regularization buys stability, never expressiveness. If the ceiling is that interactions dominate, no amount of penalty tuning moves it — that is what trees and boosting are for.',
    },
  ],

  relatedSlugs: ['linear-regression', 'logistic-regression', 'generalized-linear-models', 'gaussian-process'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Elastic-net coordinate descent - the objective, transcribed.

Each sweep visits one coefficient at a time and solves the resulting
one-dimensional problem exactly. The partial residual is the residual with
feature j's own contribution added back in, which is what turns the univariate
solution into a soft-threshold rather than a full re-fit.
"""


def soft_threshold(z, gamma):
    # S(z, gamma) = sign(z) * max(|z| - gamma, 0)
    if z > gamma:
        return z - gamma
    if z < -gamma:
        return z + gamma
    return 0.0


def fit(X, y, lam=0.1, alpha=1.0, sweeps=100):
    """alpha=1 is Lasso, alpha=0 is Ridge, in between is elastic net."""
    n = len(X)
    d = len(X[0])
    beta = [0.0] * d

    # norms[j] = (1/n) * sum_i x_ij^2 - the curvature of the 1-D subproblem
    norms = [0.0] * d
    for j in range(d):
        total = 0.0
        for i in range(n):
            total += X[i][j] * X[i][j]
        norms[j] = total / n

    for _ in range(sweeps):
        for j in range(d):
            # rho_j = (1/n) sum_i x_ij * (y_i - sum_{k != j} x_ik beta_k)
            rho = 0.0
            for i in range(n):
                partial = 0.0
                for k in range(d):
                    if k != j:
                        partial += X[i][k] * beta[k]
                rho += X[i][j] * (y[i] - partial)
            rho /= n

            # numerator subtracts and clips (selection); denominator divides
            # (shrinkage). Both halves of the update are visible here.
            beta[j] = soft_threshold(rho, lam * alpha) / (norms[j] + lam * (1.0 - alpha))

    return beta`,
        profile: 'O(sweeps * d^2 * n) — the partial residual is recomputed from scratch for every coordinate, which is the obvious thing and the wrong thing.',
      },
      'make-it-right': {
        code: `"""Elastic net by coordinate descent - typed, validated, residual-tracked."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class ElasticNetModel:
    """A fitted penalized linear model, in the caller's original feature units."""

    coefficients: Vector
    intercept: float
    lam: float
    alpha: float

    @property
    def support(self) -> Vector:
        """Indices of the features the penalty actually kept."""
        return np.flatnonzero(self.coefficients)

    def predict(self, X: Matrix) -> Vector:
        if X.ndim != 2 or X.shape[1] != self.coefficients.size:
            raise ValueError(
                f"expected (n, {self.coefficients.size}) design matrix, got {X.shape}"
            )
        return X @ self.coefficients + self.intercept


def _soft_threshold(z: float, gamma: float) -> float:
    return float(np.sign(z) * max(abs(z) - gamma, 0.0))


def fit(
    X: Matrix,
    y: Vector,
    lam: float = 0.1,
    alpha: float = 1.0,
    sweeps: int = 100,
    tol: float = 1e-7,
) -> ElasticNetModel:
    """Fit by cyclic coordinate descent. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if not 0.0 <= alpha <= 1.0:
        raise ValueError(f"alpha must lie in [0, 1], got {alpha}")
    if lam < 0.0:
        raise ValueError(f"lam must be non-negative, got {lam}")

    # Standardization is part of the model, not a preprocessing nicety the
    # caller may skip: the penalty is charged in feature units.
    centre = X.mean(axis=0)
    scale = X.std(axis=0)
    scale[scale == 0.0] = 1.0
    Xs = (X - centre) / scale
    y_mean = float(y.mean())

    n, d = Xs.shape
    beta = np.zeros(d, dtype=np.float64)
    residual = y - y_mean                 # y - X beta, kept current in place
    norms = np.einsum("ij,ij->j", Xs, Xs) / n

    for _ in range(sweeps):
        largest_step = 0.0
        for j in range(d):
            column = Xs[:, j]
            # Add feature j back in, solve, then push the change through the
            # residual - O(n) per coordinate instead of O(n*d).
            rho = float(column @ residual) / n + norms[j] * beta[j]
            updated = _soft_threshold(rho, lam * alpha) / (norms[j] + lam * (1.0 - alpha))
            step = updated - beta[j]
            if step == 0.0:
                continue
            residual -= step * column
            beta[j] = updated
            largest_step = max(largest_step, abs(step))

        if largest_step < tol:
            break

    coefficients = beta / scale           # back into the caller's units
    return ElasticNetModel(
        coefficients=coefficients,
        intercept=y_mean - float(centre @ coefficients),
        lam=lam,
        alpha=alpha,
    )`,
        rationale:
          'Two changes, one algorithmic and one structural. The inner recomputation of the partial residual is replaced by an incrementally maintained residual vector, which drops a whole factor of d from every sweep — the largest single win in the progression, and it is a change of algorithm rather than of language. Structurally, standardization moves inside the fit (the penalty is meaningless without it), input is validated before any work happens, and the fitted model becomes an immutable dataclass that knows its own support instead of a bare coefficient array.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*d) per sweep, with the per-coordinate work executed in BLAS rather than the interpreter.',
      },
      'make-it-fast': {
        code: `"""Elastic net over a full lambda path - covariance updates, warm starts."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def fit_path(
    X: Matrix,
    y: Vector,
    alpha: float = 1.0,
    n_lambdas: int = 100,
    eps: float = 1e-3,
    sweeps: int = 100,
    tol: float = 1e-7,
) -> tuple[Vector, Matrix]:
    """Fit the entire regularization path in one call.

    Two structural changes carry the speedup. Covariance updates: the only
    quantities coordinate descent needs are X^T X and X^T y, so both are formed
    once as single BLAS calls and every later sweep reads from the d x d Gram
    matrix without touching the data again - the cost stops depending on n.
    Warm starts: neighbouring solutions along the path are close, so each lambda
    begins from the previous solution and converges in a handful of sweeps.
    """
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError(f"shape mismatch: X={X.shape}, y={y.shape}")

    design = np.ascontiguousarray(X, dtype=np.float64)
    scale = design.std(axis=0)
    scale[scale == 0.0] = 1.0
    design = (design - design.mean(axis=0)) / scale
    centred_y = np.ascontiguousarray(y, dtype=np.float64) - y.mean()

    n, d = design.shape
    gram = (design.T @ design) / n        # one GEMM, reused by every lambda
    correlation = (design.T @ centred_y) / n

    # Path from lambda_max - the smallest penalty that zeroes every coefficient
    # - geometrically down to eps * lambda_max.
    lam_max = float(np.abs(correlation).max()) / max(alpha, 1e-3)
    lambdas = np.geomspace(lam_max, lam_max * eps, n_lambdas)

    beta = np.zeros(d, dtype=np.float64)
    coefficients = np.empty((n_lambdas, d), dtype=np.float64)   # allocated once

    for path_index, lam in enumerate(lambdas):
        l1, l2 = lam * alpha, lam * (1.0 - alpha)

        for _ in range(sweeps):
            largest_step = 0.0
            for j in range(d):
                # Partial correlation straight from the Gram row.
                rho = correlation[j] - gram[j] @ beta + gram[j, j] * beta[j]
                updated = np.sign(rho) * max(abs(rho) - l1, 0.0) / (gram[j, j] + l2)
                step = updated - beta[j]
                if step == 0.0:
                    continue
                beta[j] = updated
                largest_step = max(largest_step, abs(step))

            if largest_step < tol:
                break

        coefficients[path_index] = beta   # warm start carries into the next lambda

    return lambdas, coefficients / scale`,
        rationale:
          'The data is touched twice in total, to form the Gram matrix and the correlation vector, and after that the solver never sees it again — every sweep at every lambda is O(d^2) on cached quantities rather than O(nd) over the samples. That is only a win when n is much larger than d, which is the judgement call the docstring states outright. On top of it, the whole lambda path is solved in one call with warm starts, so cross-validating the penalty costs a few times a single fit instead of a hundred times.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'X^T X and X^T y become two GEMM calls, and each coordinate update then reads a cached Gram row instead of walking n samples.',
            tradeoff: 'Forming the Gram costs O(n*d^2) once and keeps a d x d matrix resident. When d >> n — the exact regime Lasso is usually reached for — this is the wrong trade and the residual-update version wins.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Solving the whole path in one call with warm starts means each subsequent lambda converges in a few sweeps, so 100 fits cost a small multiple of one.',
            tradeoff: 'The caller pays for the entire path even when a single lambda is wanted, and warm starting couples the solutions — a numerical problem at one lambda propagates down the rest of the path.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'ascontiguousarray with an explicit float64 means the GEMM operates on the array directly rather than on an internal copy, and the Gram rows read sequentially in the inner loop.',
            tradeoff: 'Materializes a copy of the input when the caller passed a Fortran-ordered or float32 array, which for very wide X is measurable memory pressure.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n*d^2) once for the Gram, then O(d^2) per sweep independent of n. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Elastic-net coordinate descent - the objective, transcribed.
#include <cstddef>
#include <vector>

// S(z, gamma) = sign(z) * max(|z| - gamma, 0)
double SoftThreshold(double z, double gamma) {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0.0;
}

// alpha = 1 is Lasso, alpha = 0 is Ridge, in between is elastic net.
std::vector<double> Fit(const std::vector<std::vector<double>>& X,
                        const std::vector<double>& y,
                        double lam,
                        double alpha,
                        int sweeps) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> beta(d, 0.0);
  std::vector<double> norms(d, 0.0);

  for (std::size_t j = 0; j < d; ++j) {
    double total = 0.0;
    for (std::size_t i = 0; i < n; ++i) {
      total += X[i][j] * X[i][j];
    }
    norms[j] = total / static_cast<double>(n);
  }

  for (int sweep = 0; sweep < sweeps; ++sweep) {
    for (std::size_t j = 0; j < d; ++j) {
      // rho_j = (1/n) sum_i x_ij * (y_i - sum_{k != j} x_ik beta_k)
      double rho = 0.0;
      for (std::size_t i = 0; i < n; ++i) {
        double partial = 0.0;
        for (std::size_t k = 0; k < d; ++k) {
          if (k != j) partial += X[i][k] * beta[k];
        }
        rho += X[i][j] * (y[i] - partial);
      }
      rho /= static_cast<double>(n);

      beta[j] = SoftThreshold(rho, lam * alpha) / (norms[j] + lam * (1.0 - alpha));
    }
  }

  return beta;
}`,
        profile: 'O(sweeps * d^2 * n), and vector<vector<double>> scatters rows across the heap so the column walk misses cache on every access.',
      },
      'make-it-right': {
        code: `// Elastic net by coordinate descent - RAII, const-correct, residual-tracked.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

[[nodiscard]] double SoftThreshold(double z, double gamma) noexcept {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0.0;
}

}  // namespace

class ElasticNetModel {
 public:
  ElasticNetModel(std::vector<double> coefficients, double intercept)
      : coefficients_(std::move(coefficients)), intercept_(intercept) {}

  [[nodiscard]] double Predict(std::span<const double> row) const {
    if (row.size() != coefficients_.size()) {
      throw std::invalid_argument("row width does not match model width");
    }
    double acc = intercept_;
    for (std::size_t j = 0; j < coefficients_.size(); ++j) {
      acc += coefficients_[j] * row[j];
    }
    return acc;
  }

  // How many features the penalty kept - the number a reviewer asks for first.
  [[nodiscard]] std::size_t SupportSize() const noexcept {
    return static_cast<std::size_t>(
        std::count_if(coefficients_.begin(), coefficients_.end(),
                      [](double c) { return c != 0.0; }));
  }

  [[nodiscard]] std::span<const double> coefficients() const noexcept {
    return coefficients_;
  }

 private:
  std::vector<double> coefficients_;   // owned; rule of zero handles the rest
  double intercept_;
};

// x_col is COLUMN-major and flat: feature j occupies x_col[j * n, (j + 1) * n).
// Coordinate descent sweeps one feature at a time, so this is the layout that
// makes the inner loop a contiguous walk instead of a strided one.
//
// Assumes y and every column of X are already centred and scaled, so the
// intercept is zero; standardization belongs to the caller's pipeline here.
ElasticNetModel Fit(std::span<const double> x_col,
                    std::span<const double> y,
                    double lam,
                    double alpha,
                    int sweeps,
                    double tol) {
  if (y.empty()) throw std::invalid_argument("empty problem");
  if (alpha < 0.0 || alpha > 1.0) throw std::invalid_argument("alpha must lie in [0, 1]");
  if (lam < 0.0) throw std::invalid_argument("lam must be non-negative");
  if (x_col.size() % y.size() != 0) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const std::size_t n = y.size();
  const std::size_t d = x_col.size() / n;
  std::vector<double> beta(d, 0.0);
  std::vector<double> norms(d, 0.0);
  std::vector<double> residual(y.begin(), y.end());   // y - X beta, kept current

  for (std::size_t j = 0; j < d; ++j) {
    const double* column = x_col.data() + j * n;
    double total = 0.0;
    for (std::size_t i = 0; i < n; ++i) total += column[i] * column[i];
    norms[j] = total / static_cast<double>(n);
  }

  for (int sweep = 0; sweep < sweeps; ++sweep) {
    double largest_step = 0.0;

    for (std::size_t j = 0; j < d; ++j) {
      const double* column = x_col.data() + j * n;
      double rho = 0.0;
      for (std::size_t i = 0; i < n; ++i) rho += column[i] * residual[i];
      rho = rho / static_cast<double>(n) + norms[j] * beta[j];

      const double updated =
          SoftThreshold(rho, lam * alpha) / (norms[j] + lam * (1.0 - alpha));
      const double step = updated - beta[j];
      if (step == 0.0) continue;

      for (std::size_t i = 0; i < n; ++i) residual[i] -= step * column[i];
      beta[j] = updated;
      largest_step = std::max(largest_step, std::abs(step));
    }

    if (largest_step < tol) break;
  }

  return ElasticNetModel(std::move(beta), 0.0);
}`,
        rationale:
          'The nested vector becomes one flat COLUMN-major buffer, which is the layout this algorithm actually wants: coordinate descent walks a feature at a time, so features must be the contiguous axis — the opposite of the row-major choice that suits a gradient-descent fit. The recomputed partial residual becomes a maintained residual vector, removing a factor of d per sweep. Inputs are validated before any allocation, and the fitted coefficients are handed to an owning class rather than returned as a bare vector the caller must interpret.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d) per sweep, three allocations total, and every inner loop is a contiguous walk.',
      },
      'make-it-fast': {
        code: `// Elastic net over a lambda path - Eigen, one Gram matrix, warm starts.
#include <Eigen/Dense>
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace {

[[nodiscard]] double SoftThreshold(double z, double gamma) noexcept {
  const double shrunk = std::abs(z) - gamma;
  return shrunk <= 0.0 ? 0.0 : std::copysign(shrunk, z);
}

}  // namespace

// Returns one column of coefficients per lambda, in path order.
//
// The data is touched exactly twice: once for G = X^T X / n and once for
// c = X^T y / n. Afterwards every sweep at every lambda reads only the d x d
// Gram matrix, so the per-sweep cost stops depending on n entirely. That is the
// right trade when n >> d and the wrong one when d >> n - which is the regime
// Lasso is most often reached for, so it is a decision, not a default.
Eigen::MatrixXd FitPath(const Eigen::MatrixXd& X,
                        const Eigen::VectorXd& y,
                        const Eigen::VectorXd& lambdas,
                        double alpha,
                        int sweeps,
                        double tol) {
  if (X.rows() != y.size()) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const double n = static_cast<double>(X.rows());
  const Eigen::MatrixXd gram = (X.transpose() * X) / n;
  const Eigen::VectorXd correlation = (X.transpose() * y) / n;

  Eigen::VectorXd beta = Eigen::VectorXd::Zero(X.cols());
  Eigen::MatrixXd path(X.cols(), lambdas.size());

  for (Eigen::Index k = 0; k < lambdas.size(); ++k) {
    const double l1 = lambdas[k] * alpha;
    const double l2 = lambdas[k] * (1.0 - alpha);

    for (int sweep = 0; sweep < sweeps; ++sweep) {
      double largest_step = 0.0;

      for (Eigen::Index j = 0; j < beta.size(); ++j) {
        // Partial correlation from one Gram row - no pass over the samples.
        const double rho =
            correlation[j] - gram.row(j).dot(beta) + gram(j, j) * beta[j];
        const double updated = SoftThreshold(rho, l1) / (gram(j, j) + l2);
        const double step = updated - beta[j];
        if (step == 0.0) continue;
        beta[j] = updated;
        largest_step = std::max(largest_step, std::abs(step));
      }

      if (largest_step < tol) break;
    }

    path.col(k) = beta;   // warm start: the next lambda begins here
  }

  return path;
}`,
        rationale:
          'The hand-written accumulation loops are replaced by Eigen expressions that compile to blocked, vectorized kernels, and the algorithm switches from residual updates to covariance updates: two products over the data up front, then a solver that never reads the data again. The whole lambda path is produced in one call, each penalty warm-started from the previous solution, which is what makes cross-validating lambda affordable rather than a hundred independent fits.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'X^T X is a single large GEMM that Eigen dispatches to a blocked kernel keeping operands in cache — the one place in this algorithm where a tuned kernel is worth reaching for.',
            tradeoff: 'O(n*d^2) up front, amortized only if the path has many lambdas. A single-lambda fit on wide data never recovers the cost.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'gram.row(j).dot(beta) evaluates in place, and the transpose in X.transpose() * X is a view rather than a materialized matrix — with explicit intermediates this would allocate a full copy of the design.',
            tradeoff: 'Expression templates make compiler errors famously verbose, and an expression captured in auto can dangle after its operands go out of scope.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The coordinate sweep is a dot product over a Gram row; Eigen leaves the vectorization of that to the compiler, so without optimization flags it is no faster than the hand-written version.',
            tradeoff: '-march=native produces a binary that may fault on an older CPU elsewhere in the fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*d^2) once for the Gram, then O(d^2) per sweep for every lambda on the path. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Elastic-net coordinate descent - the objective, transcribed.

// S(z, gamma) = sign(z) * max(|z| - gamma, 0)
fn soft_threshold(z: f64, gamma: f64) -> f64 {
    if z > gamma {
        z - gamma
    } else if z < -gamma {
        z + gamma
    } else {
        0.0
    }
}

/// l1_ratio = 1.0 is Lasso, 0.0 is Ridge, in between is elastic net.
pub fn fit(x: &[Vec<f64>], y: &[f64], lam: f64, l1_ratio: f64, sweeps: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut beta = vec![0.0; d];
    let mut norms = vec![0.0; d];

    for j in 0..d {
        let mut total = 0.0;
        for i in 0..n {
            total += x[i][j] * x[i][j];
        }
        norms[j] = total / n as f64;
    }

    for _ in 0..sweeps {
        for j in 0..d {
            // rho_j = (1/n) sum_i x_ij * (y_i - sum_{k != j} x_ik beta_k)
            let mut rho = 0.0;
            for i in 0..n {
                let mut partial = 0.0;
                for k in 0..d {
                    if k != j {
                        partial += x[i][k] * beta[k];
                    }
                }
                rho += x[i][j] * (y[i] - partial);
            }
            rho /= n as f64;

            beta[j] = soft_threshold(rho, lam * l1_ratio) / (norms[j] + lam * (1.0 - l1_ratio));
        }
    }

    beta
}`,
        profile: 'O(sweeps * d^2 * n), every index bounds-checked, and Vec<Vec<f64>> scatters rows across the heap.',
      },
      'make-it-right': {
        code: `//! Elastic net by coordinate descent - typed errors, newtypes, borrowed slices.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Penalty { value: f64 },
    Ratio { value: f64 },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Penalty { value } => write!(f, "penalty must be finite and non-negative, got {value}"),
            Self::Ratio { value } => write!(f, "l1 ratio must lie in [0, 1], got {value}"),
        }
    }
}

impl std::error::Error for FitError {}

/// Penalty strength. A newtype because lam and l1_ratio are both bare f64 and
/// transposing them at a call site is silent - the fit simply comes back wrong.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lambda(f64);

/// L1 share of the penalty: 1.0 is Lasso, 0.0 is Ridge.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct L1Ratio(f64);

impl Lambda {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value < 0.0 {
            return Err(FitError::Penalty { value });
        }
        Ok(Self(value))
    }
}

impl L1Ratio {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !(0.0..=1.0).contains(&value) {
            return Err(FitError::Ratio { value });
        }
        Ok(Self(value))
    }
}

#[inline]
fn soft_threshold(z: f64, gamma: f64) -> f64 {
    let shrunk = z.abs() - gamma;
    if shrunk <= 0.0 {
        0.0
    } else {
        shrunk.copysign(z)
    }
}

#[derive(Debug, Clone)]
pub struct ElasticNetModel {
    coefficients: Vec<f64>,
}

impl ElasticNetModel {
    #[must_use]
    pub fn coefficients(&self) -> &[f64] {
        &self.coefficients
    }

    /// The features the penalty kept.
    #[must_use]
    pub fn support(&self) -> Vec<usize> {
        self.coefficients
            .iter()
            .enumerate()
            .filter(|(_, &c)| c != 0.0)
            .map(|(index, _)| index)
            .collect()
    }
}

/// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
/// Assumes centred, scaled inputs, so there is no intercept to solve for.
pub fn fit(
    x_col: &[f64],
    y: &[f64],
    d: usize,
    lam: Lambda,
    l1_ratio: L1Ratio,
    sweeps: usize,
    tol: f64,
) -> Result<ElasticNetModel, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x_col.len() != y.len() * d {
        return Err(FitError::ShapeMismatch {
            expected: y.len() * d,
            found: x_col.len(),
        });
    }

    let n = y.len();
    let (l1, l2) = (lam.0 * l1_ratio.0, lam.0 * (1.0 - l1_ratio.0));
    let mut beta = vec![0.0_f64; d];
    let mut residual: Vec<f64> = y.to_vec();          // y - X beta, kept current

    let norms: Vec<f64> = x_col
        .chunks_exact(n)
        .map(|column| column.iter().map(|v| v * v).sum::<f64>() / n as f64)
        .collect();

    for _ in 0..sweeps {
        let mut largest_step = 0.0_f64;

        for (j, column) in x_col.chunks_exact(n).enumerate() {
            let dot: f64 = column.iter().zip(&residual).map(|(v, r)| v * r).sum();
            let rho = dot / n as f64 + norms[j] * beta[j];

            let updated = soft_threshold(rho, l1) / (norms[j] + l2);
            let step = updated - beta[j];
            if step == 0.0 {
                continue;
            }

            for (r, v) in residual.iter_mut().zip(column) {
                *r -= step * v;
            }
            beta[j] = updated;
            largest_step = largest_step.max(step.abs());
        }

        if largest_step < tol {
            break;
        }
    }

    Ok(ElasticNetModel { coefficients: beta })
}`,
        rationale:
          'Errors become a typed Result the caller must handle, and the two f64 knobs become newtypes validated at construction — the failure this prevents is not a crash but a silently transposed lam and l1_ratio, which produces a plausible-looking wrong fit. The nested Vec becomes one flat column-major buffer walked with chunks_exact, so a feature is contiguous and the compiler can prove the lengths line up, eliminating bounds checks from the hot loop. The recomputed partial residual becomes a maintained one, removing a factor of d per sweep.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d) per sweep, two allocations total, bounds checks elided in the inner loops.',
      },
      'make-it-fast': {
        code: `//! Elastic net over a lambda path - parallel Gram, warm-started sweeps.

use rayon::prelude::*;

#[inline]
fn soft_threshold(z: f64, gamma: f64) -> f64 {
    let shrunk = z.abs() - gamma;
    if shrunk <= 0.0 {
        0.0
    } else {
        shrunk.copysign(z)
    }
}

/// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
/// Returns one coefficient vector per lambda, in path order.
///
/// The sweep itself is inherently sequential - coordinate j + 1 depends on the
/// update just made to coordinate j - so the parallelism goes where it actually
/// exists: forming the Gram matrix, which is d * d independent dot products.
pub fn fit_path(
    x_col: &[f64],
    y: &[f64],
    d: usize,
    lambdas: &[f64],
    l1_ratio: f64,
    sweeps: usize,
    tol: f64,
) -> Vec<Vec<f64>> {
    let n = y.len();

    // G = X^T X / n, row by row, each row an independent chunk of work.
    let gram: Vec<f64> = (0..d)
        .into_par_iter()
        .flat_map_iter(|j| {
            let column_j = &x_col[j * n..(j + 1) * n];
            (0..d).map(move |k| {
                let column_k = &x_col[k * n..(k + 1) * n];
                column_j.iter().zip(column_k).map(|(a, b)| a * b).sum::<f64>() / n as f64
            })
        })
        .collect();

    let correlation: Vec<f64> = x_col
        .par_chunks_exact(n)
        .map(|column| column.iter().zip(y).map(|(v, t)| v * t).sum::<f64>() / n as f64)
        .collect();

    let mut beta = vec![0.0_f64; d];
    let mut path = Vec::with_capacity(lambdas.len());

    for &lam in lambdas {
        let (l1, l2) = (lam * l1_ratio, lam * (1.0 - l1_ratio));

        for _ in 0..sweeps {
            let mut largest_step = 0.0_f64;

            for j in 0..d {
                let row = &gram[j * d..(j + 1) * d];
                let projection: f64 = row.iter().zip(&beta).map(|(g, b)| g * b).sum();
                let rho = correlation[j] - projection + row[j] * beta[j];

                let updated = soft_threshold(rho, l1) / (row[j] + l2);
                let step = updated - beta[j];
                if step == 0.0 {
                    continue;
                }
                beta[j] = updated;
                largest_step = largest_step.max(step.abs());
            }

            if largest_step < tol {
                break;
            }
        }

        // Snapshot this lambda; beta itself carries on as the warm start.
        path.push(beta.clone());
    }

    path
}`,
        rationale:
          'The residual updates become covariance updates: the Gram matrix and correlation vector are built once, in parallel, and every sweep afterwards reads only cached d-length rows, so the per-sweep cost no longer depends on n. The parallelism is deliberately placed at the Gram build rather than inside the sweep, because a coordinate-descent sweep is sequential by construction — parallelizing it would race on the very dependency that makes each step exact. The path is then solved in one pass with warm starts.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Every Gram entry is an independent dot product over two columns, so the build fans out across cores with no shared mutable state and no synchronization.',
            tradeoff: 'Work-stealing overhead dominates for small d, and the Gram build is O(n*d^2) regardless — parallelism makes an expensive precomputation faster, it does not make it the right choice when d >> n.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Column-major storage makes each feature a contiguous slice, so both the Gram dot products and the per-coordinate Gram-row read are sequential walks the prefetcher can follow.',
            tradeoff: 'The caller must transpose row-major data before calling, which is an O(n*d) copy and a shape contract that nothing in the signature enforces.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The path is allocated at its exact final length up front, so pushing one solution per lambda never triggers a grow-and-copy of the accumulated results.',
            tradeoff: 'Holds the entire path in memory — lambdas.len() * d floats — even when the caller only intends to keep the cross-validated best.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*d^2 / cores) for the Gram, then O(d^2) per sweep per lambda. Illustrative, not a measured benchmark.',
      },
    },
  },
};
