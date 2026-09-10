import type { AiMlModel } from '../../types';

/**
 * Gaussian Process Regression — a distribution over functions, and the entry
 * where uncertainty is the product rather than a by-product.
 *
 * Closes the probabilistic group because it is the most specialized rung: naive
 * Bayes models a distribution over features, a mixture models one over points,
 * and this models one over entire functions. It also pays the highest price in
 * the section — O(n^3) — which makes it the clearest case where a model's cost
 * profile, not its accuracy, decides where it can be used.
 */
export const GAUSSIAN_PROCESS: AiMlModel = {
  slug: 'gaussian-process',
  name: 'Gaussian Process Regression',
  aliases: ['GP', 'Kriging', 'Kernel ridge with error bars', 'Bayesian nonparametric regression'],
  category: 'classical-ml',
  group: 'probabilistic',
  kind: 'model',

  paradigms: ['supervised'],
  // 'density-estimation' because the output is a full predictive distribution
  // at every input, not a point estimate; 'anomaly-detection' follows from
  // scoring residuals against that distribution — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'The density is conditional and Gaussian: at every input the model returns a mean and a variance, so questions about tails and exceedance probabilities are answerable directly. It says nothing about the distribution of the inputs themselves.',

  intuition:
    'Instead of fitting one function, put a probability distribution over all the functions that could have produced the data, and let the observations narrow it. The kernel is what makes this concrete: it states how correlated the function values at two inputs should be, which is the same as stating how smooth, how wiggly, and how periodic you believe the function is. Conditioning that prior on the data gives a posterior that is again Gaussian, so the answer is closed-form — a mean and a variance at every input. The variance is the part that earns its keep: it is small where data is dense, and it widens automatically wherever you leave the data behind, which no point-estimate regressor will tell you.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\log p(\\mathbf{y} \\mid X, \\theta) = -\\frac{1}{2}\\mathbf{y}^{\\top} K_y^{-1} \\mathbf{y} - \\frac{1}{2}\\log \\lvert K_y \\rvert - \\frac{n}{2}\\log 2\\pi, \\qquad K_y = K + \\sigma_n^2 I',
      symbols: [
        { symbol: 'K', meaning: 'the n-by-n kernel matrix, K_ij = k(x_i, x_j) — the prior covariance between function values' },
        { symbol: '\\sigma_n^2', meaning: 'observation noise, added to the diagonal; also the numerical regularizer that keeps K_y invertible' },
        { symbol: '\\theta', meaning: 'kernel hyperparameters — lengthscale, amplitude, period, noise — fitted by maximizing this quantity' },
        { symbol: '-\\frac{1}{2}\\log \\lvert K_y \\rvert', meaning: 'the complexity penalty: a kernel flexible enough to explain anything has a large determinant, and pays for it here' },
      ],
    },
    reading:
      'How probable is the observed data under this prior over functions, with the latent function integrated out entirely rather than estimated. The two terms are a fit-versus-complexity trade made explicit: the first rewards explaining the data, the second penalizes a prior loose enough to explain any data. That balance is the reason a GP can select its own hyperparameters without a validation set — the marginal likelihood already contains an Occam term. It is not a free lunch, though: the surface is non-convex, and with many hyperparameters it can and does overfit itself.',
  },

  optimization: {
    method: 'Closed-form posterior via Cholesky factorization; gradient ascent on the log marginal likelihood for the kernel hyperparameters',
    updateRule: {
      formula:
        '\\mu_* = \\mathbf{k}_*^{\\top} K_y^{-1}\\mathbf{y}, \\qquad \\sigma_*^2 = k_{**} - \\mathbf{k}_*^{\\top} K_y^{-1} \\mathbf{k}_*',
      symbols: [
        { symbol: '\\mathbf{k}_*', meaning: 'covariance between the query point and every training point — how much each observation is allowed to say about it' },
        { symbol: 'k_{**}', meaning: 'prior variance at the query point, before any data is taken into account' },
        { symbol: '\\mu_*', meaning: 'posterior mean: a weighted average of the training targets, with kernel-derived weights' },
        { symbol: '\\sigma_*^2', meaning: 'posterior variance — the prior variance minus whatever the data explained, so it can only shrink' },
      ],
    },
    rationale:
      'There is nothing iterative in the prediction: conditioning a joint Gaussian gives another Gaussian, so both the mean and the variance are exact algebra. The whole implementation question is how the inverse is handled, and the answer is that it never is. Factorize K_y once with a Cholesky and every subsequent quantity follows from triangular solves — the posterior mean, the posterior variance, and the log-determinant, which is just twice the sum of the log diagonal. Forming the inverse explicitly is both slower and numerically worse, and on a near-singular kernel matrix it is the difference between a usable model and noise. The iteration that does exist is over hyperparameters: gradient ascent on the marginal likelihood, which is non-convex and needs restarts.',
    hyperparameters: [
      { name: 'kernel family', role: 'The modelling assumption, and the only one that matters. RBF asserts an infinitely differentiable function; Matérn 3/2 or 5/2 asserts something rougher and is usually the more honest default for real data' },
      { name: 'lengthscale', role: 'How far the function has to move before values decorrelate — short means wiggly, long means smooth. Learned from the marginal likelihood, per dimension if you want automatic relevance determination', typicalRange: 'log-scale search around the median pairwise distance' },
      { name: 'signal variance', role: 'Amplitude of the function; sets the prior spread and therefore how far the posterior can move from the mean' },
      { name: 'noise variance (sigma_n^2)', role: 'Observation noise. Doing double duty as the numerical jitter that keeps the kernel matrix positive definite', typicalRange: '1e-6 to the target variance; never exactly zero' },
      { name: 'mean function', role: 'Usually zero, which matters more than it sounds: predictions revert to it away from data, so a zero-mean GP forecasts zero once extrapolating' },
    ],
    convergence:
      'The posterior is exact — no convergence question at all, given hyperparameters. Everything that can go wrong is numerical or is about the hyperparameters. Numerically, the kernel matrix becomes ill-conditioned as soon as two training inputs are close together, because their rows are nearly identical; the Cholesky then fails outright, and the standard remedy is jitter on the diagonal, which is a small deliberate lie about the noise level. On hyperparameters, the marginal likelihood is non-convex with real local optima that correspond to genuinely different interpretations — one explaining the data as a smooth trend with high noise, another as a wiggly function with low noise — and the optimizer picks whichever basin it started in. Restarts are not optional.',
    complexity:
      'Training: O(n^3) for the Cholesky, O(n^2) memory for the kernel matrix. That is the defining fact — worse than the SVM next door — and it puts exact GP regression out of reach somewhere around 10,000 points. Prediction, with the factorization cached: O(n) per query for the mean and O(n^2) for the variance, which is why the variance is the expensive half. Sparse and inducing-point approximations reduce training to O(n·m^2) for m inducing points and are what any GP at scale is actually doing.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Treat time as the input and compose the kernel to match the structure: a long-lengthscale Matérn for trend, a periodic kernel for seasonality, a product of periodic and slowly-varying for seasonality that changes shape, plus a white-noise term. The composition IS the model specification — it is written down rather than searched for — and the posterior then supplies a mean forecast with genuinely calibrated intervals.',
        where: [
          'Small-sample forecasting where a calibrated interval matters more than the point estimate — clinical, environmental, and sensor-calibration series',
          'Irregularly sampled and gappy series, which a GP handles natively because it never assumed a fixed sampling grid',
          'Interpolation and smoothing between observations, where the posterior mean is the optimal smoother under the assumed kernel',
          'Series where the kernel structure is a deliverable in itself: showing that a periodic component with a learned period explains the data is an argument, not just a fit',
        ],
        why: 'Its advantage over every other forecaster here is the interval — not a bootstrap approximation but the actual posterior, and one that widens correctly as the horizon extends. It also handles irregular sampling without interpolation and encodes structure explicitly. The two reasons not to use it are hard ones: O(n^3) rules out long series outright, and the zero-mean prior means the forecast reverts to the mean beyond the data, so a GP with an RBF kernel will not extrapolate a trend — it will flatten. Encoding the trend in the kernel or the mean function is mandatory, not optional.',
        featurization: [
          'Compose the kernel deliberately: trend times periodic plus noise, rather than an RBF and hope',
          'Prefer Matérn over RBF unless the process really is infinitely smooth — the RBF prior is far stronger than most people intend it to be',
          'Standardize the target, since the signal variance and noise are both learned on its scale',
          'Use an explicit mean function or a linear kernel component when the series trends, or the forecast reverts to zero',
        ],
        evaluation:
          'Rolling-origin backtesting scored on a proper scoring rule that rewards the whole distribution — CRPS or the negative log predictive density — not RMSE, which ignores the model’s main output. Check interval coverage explicitly: an 80% interval should contain about 80% of the held-out points, and a GP whose coverage is wrong has a mis-specified kernel rather than a tuning problem.',
        pitfalls: [
          'Extrapolating with a stationary kernel and a zero mean, which flattens toward zero and reports growing uncertainty around a forecast nobody believes',
          'Optimizing hyperparameters on the whole series before splitting — the marginal likelihood is a fit statistic, and it leaks',
          'Hitting the O(n^3) wall silently by resampling to a finer grid',
          'A local optimum that explains all structure as noise, producing a flat mean with wide bands that looks like humility and is actually a failed fit',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit on clean data, then score a new observation by its standardized residual against the predictive distribution: how many predictive standard deviations away it is. The difference from residual scoring on any other regressor is that the denominator varies with the input — a deviation in a well-sampled region is significant, and the same deviation where the model has little data is not.',
        where: [
          'Sensor calibration and drift monitoring, where the expected value is a smooth function of operating conditions',
          'Monitoring a metric against a smooth, seasonally-structured baseline with irregular observation times',
          'Screening for inputs outside the training distribution — the predictive variance alone is a usable novelty score, with no residual required',
        ],
        why: 'The input-dependent variance is the entire argument: a fixed threshold on raw residuals over-alarms in sparse regions and under-alarms in dense ones, and the GP gives the right denominator for free. It is also the honest option when data is scarce, since it degrades to wide intervals rather than to confident nonsense. Against it: O(n^3) makes the reference window small, so a GP detector monitors a well-understood low-dimensional process rather than a high-volume stream, where an isolation forest is the correct tool.',
        featurization: [
          'Fit on a confirmed-clean window, and keep it small enough that a refit stays affordable — the cubic cost is the real design constraint here',
          'Include the operating-condition covariates that legitimately move the baseline, or their effect is scored as anomaly',
          'Learn the noise level rather than fixing it; the threshold is expressed in units of predictive standard deviation, so an underestimated noise term makes everything an anomaly',
        ],
        evaluation:
          'Precision@k against confirmed incidents, plus a calibration check on clean data: the standardized residuals should look standard normal, and if they do not, the kernel is wrong and any threshold on them is arbitrary.',
        pitfalls: [
          'Contamination absorbed into the noise term, which widens the intervals until nothing is anomalous — a quieter failure than the boundary being dragged',
          'Reading the predictive variance as a confidence in the model rather than in the function value; it is conditional on the kernel being right, and says nothing about the kernel being wrong',
          'A reference window that grows over time until the refit stops fitting in the maintenance budget',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'This is the surrogate in Bayesian optimization. When each evaluation of an objective is expensive — a training run, a physical experiment, a simulation — fit a GP to the evaluations you have, then use its posterior to choose where to evaluate next: an acquisition function such as expected improvement trades exploiting the region with the best predicted mean against exploring the region with the largest variance. The optimizer is then over the cheap acquisition surface, not the expensive objective.',
        where: [
          'Hyperparameter optimization, where a single evaluation is a full training run',
          'Experimental design and A/B allocation with a limited budget of expensive trials',
          'Materials, chemical, and process parameter search — the domain where this originated, under the name kriging',
          'Simulation-based design where each run costs hours and the search space is continuous and low-dimensional',
        ],
        why: 'It is the default surrogate for one reason: the acquisition function needs calibrated uncertainty, and a GP supplies it in closed form. A point-estimate model cannot say where it is ignorant, and without that there is no principled way to explore. The conditions are equally specific — the objective must be expensive relative to the surrogate, the dimension low (roughly under 20, since the lengthscale becomes unidentifiable above that), and the budget small enough that O(n^3) stays trivial. When evaluations are cheap, random search or an evolutionary method beats this outright, because the surrogate overhead buys nothing.',
        featurization: [
          'Scale every search dimension to a common range, since a shared lengthscale otherwise encodes the arbitrary units of the search space',
          'Search log-scale parameters in log space — a learning rate is not smooth in linear coordinates',
          'Use Matérn 5/2 rather than RBF; the standard recommendation in this domain precisely because real objective surfaces are not infinitely smooth',
          'Model integer and categorical dimensions explicitly rather than rounding a continuous relaxation, which makes the surrogate wrong in a way it cannot detect',
        ],
        evaluation:
          'Best-value-found against evaluation count, averaged over repeated runs with different seeds — a single run of a stochastic search says nothing. Compare against random search on the same budget, which is a stronger baseline than most reports admit and wins outright in high dimension.',
        pitfalls: [
          'Over-exploiting: an acquisition function that collapses onto the incumbent optimum and stops exploring, which is what a badly-fitted noise term causes',
          'Duplicate or near-duplicate evaluations making the kernel matrix singular, so the surrogate fails numerically at exactly the point it has become confident',
          'Applying it above roughly twenty dimensions, where the surrogate learns nothing and the whole apparatus becomes an expensive random search',
          'Ignoring evaluation noise: a deterministic-noise assumption on a stochastic objective produces a surrogate that chases its own measurement error',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Two roles. As a learned dynamics model inside model-predictive control, where the posterior variance lets the controller be cautious in states it has not visited — the basis of the data-efficient model-based methods. And as a response-surface model in process operations, mapping controllable settings to an outcome so that the setting can be chosen with a stated confidence rather than a point prediction.',
        where: [
          'Data-efficient model-based control, where a GP dynamics model needs far fewer trials than a neural one',
          'Process and yield optimization in manufacturing, where each trial run is expensive and uncertainty must be reported',
          'Robotics and physical systems with low state dimension and costly real-world interaction',
        ],
        why: 'Sample efficiency and honest uncertainty are exactly the properties this domain needs: physical trials cost money, and a controller that does not know what it does not know will confidently drive a system somewhere it has never been. The GP supplies both. The limits are as usual structural — state dimension must be small, the cubic cost bounds how much interaction history can be retained, and the smoothness assumption fails at contacts and discontinuities, which is precisely where physical systems are hardest.',
        featurization: [
          'Model the state delta rather than the next state, so the prior mean of zero corresponds to "nothing changes" instead of "the system returns to the origin"',
          'Scale each state and action dimension, since a shared lengthscale over mixed units is meaningless',
          'Keep a bounded, subsampled history or move to a sparse GP; an unbounded interaction buffer meets the cubic wall quickly',
        ],
        evaluation:
          'Multi-step rollout error rather than one-step prediction error, since compounding is what actually breaks a learned dynamics model. Check that the predictive variance grows along the rollout — a model whose uncertainty stays flat over a long horizon is mis-specified.',
        pitfalls: [
          'Smoothness assumptions failing at contact events and saturation limits, exactly where the controller needs accuracy most',
          'Compounding error over a horizon while the reported uncertainty stays optimistic because each step was conditioned on a point estimate',
          'The training buffer growing until the refit no longer fits inside the control loop',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'O(n^3) time and O(n^2) memory, which at n = 10,000 is an 800 MB kernel matrix and a factorization measured in minutes. Hyperparameter fitting repeats that factorization at every gradient step, so the practical cost is a multiple of it. This is the number that decides whether a GP is a candidate.',
    inferenceProfile:
      'With the Cholesky factor and the weight vector cached at fit time, the posterior mean is O(n) per query — a dot product against the training set — and the variance is O(n^2), which makes uncertainty the expensive half. The model also carries the entire training set, as the kernel methods next door do.',
    retrainingCadence:
      'Infrequent, and forced to be: a refit is cubic and there is no exact incremental update, though a rank-one Cholesky update handles single-point additions cheaply and is what online GP implementations use. Where data arrives continuously, a sparse GP with fixed inducing points is the version that can keep up.',
    driftAndMonitoring: [
      'Track empirical coverage of the predictive intervals — an 80% interval that covers 60% of new points means the kernel is wrong, and it surfaces before the mean error moves',
      'Monitor the condition number of the kernel matrix across refits; a rising one means training inputs are clustering and the factorization is about to need more jitter',
      'Watch the fitted noise variance over time, since a rising estimate is usually the model absorbing structure it can no longer explain',
      'Alert on queries whose predictive variance approaches the prior variance — those are inputs the model has no information about, and its mean there is the prior, not a prediction',
    ],
    productionGotchas: [
      'Jitter must be persisted with the model and applied identically at scoring time; a model factorized with jitter and scored without it is a different model',
      'The posterior mean reverts to the prior mean away from the data, so a zero-mean GP silently predicts zero in unfamiliar regions — the variance is the only thing that says so',
      'Never form the inverse: an explicit K^-1 is slower and loses roughly half the available precision relative to solving with the Cholesky factor',
      'Cache the factorization and the weight vector at fit time; re-solving per query turns an O(n) prediction into an O(n^3) one and is a common accidental regression',
      'The whole training set ships inside the model, which makes deletion requests and data licensing model problems, the same way they are for kNN and SVM',
    ],
  },

  assumptions: [
    'Function values at nearby inputs are correlated in the way the kernel says — the kernel is the model, and choosing RBF asserts infinite differentiability whether or not that was intended',
    'Observation noise is Gaussian and, in the standard formulation, the same everywhere; heteroscedastic noise needs an explicit extension',
    'The prior mean is correct where there is no data, since that is exactly what the posterior returns there',
    'The process is stationary unless the kernel says otherwise — a stationary kernel cannot represent a function that is smooth in one region and rough in another',
    'The sample is small enough for an n-by-n factorization, which is a constraint on the model rather than on the hardware',
  ],

  pros: [
    {
      point: 'Calibrated uncertainty at every input, in closed form',
      context:
        'This is the reason to choose it, and it is what makes Bayesian optimization and cautious control possible at all. Worth nothing if only the point prediction is consumed, where cheaper models match it.',
    },
    {
      point: 'Works well with very little data',
      context:
        'A dozen points and a well-chosen kernel produce a usable model with honest error bars. Decisive when each observation is expensive; irrelevant when data is abundant, which is also when the cubic cost forbids it.',
    },
    {
      point: 'Assumptions are stated in the kernel rather than buried',
      context:
        'Smoothness, periodicity, and additive structure are written down and can be argued about — and the marginal likelihood scores them. That is a genuine scientific advantage over a model whose inductive bias is implicit in its architecture.',
    },
    {
      point: 'Hyperparameters can be fitted without a validation set',
      context:
        'The marginal likelihood contains its own complexity penalty, so there is no fold-splitting step. The caveat is real: it is non-convex, and with many kernel hyperparameters it will overfit itself.',
    },
  ],

  cons: [
    {
      point: 'O(n^3) time and O(n^2) memory',
      context:
        'A hard ceiling near 10,000 points, and the reason nearly every GP in production is a sparse approximation. It is the first thing to check and it settles most arguments before accuracy is discussed.',
    },
    {
      point: 'Does not extrapolate — the posterior reverts to the prior mean',
      context:
        'With a stationary kernel and a zero mean, the forecast decays to zero beyond the data. Correct behaviour for a model that knows it is ignorant, and a trap for anyone who wanted a trend extended.',
    },
    {
      point: 'Everything depends on the kernel, and the default is usually wrong',
      context:
        'The RBF kernel asserts an infinitely differentiable function, which almost no real process is; a Matérn is the more defensible default. Choosing the kernel is modelling work, not configuration, and there is no way to avoid doing it.',
    },
    {
      point: 'Standard formulation assumes Gaussian, homoscedastic noise',
      context:
        'Non-Gaussian likelihoods — counts, classification, censored data — lose the closed form and need approximate inference, at which point most of the simplicity that motivated the model is gone.',
    },
  ],

  relatedSlugs: ['gaussian-mixture', 'support-vector-machine', 'ridge-lasso'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Gaussian process regression - the posterior equations, transcribed.

  mu_*     = k_*^T (K + sigma_n^2 I)^-1 y
  sigma_*^2 = k_** - k_*^T (K + sigma_n^2 I)^-1 k_*

The inverse is never formed. K_y is symmetric positive definite, so a Cholesky
factorization plus two triangular solves gives the same answer at half the
cost and far better conditioning - and the log-determinant, needed for the
marginal likelihood, is just twice the sum of the log diagonal.
"""

import math


def rbf(a, b, lengthscale, amplitude):
    """k(a, b) = amplitude * exp(-||a - b||^2 / (2 * lengthscale^2))"""
    squared = 0.0
    for j in range(len(a)):
        difference = a[j] - b[j]
        squared += difference * difference
    return amplitude * math.exp(-0.5 * squared / (lengthscale * lengthscale))


def cholesky(matrix):
    """Lower-triangular L with L L^T = matrix. Fails loudly if not SPD."""
    n = len(matrix)
    lower = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1):
            total = matrix[i][j]
            for k in range(j):
                total -= lower[i][k] * lower[j][k]

            if i == j:
                if total <= 0.0:
                    raise ValueError("kernel matrix is not positive definite; add jitter")
                lower[i][j] = math.sqrt(total)
            else:
                lower[i][j] = total / lower[j][j]

    return lower


def forward_substitution(lower, b):
    """Solve L z = b."""
    n = len(b)
    z = [0.0] * n
    for i in range(n):
        total = b[i]
        for k in range(i):
            total -= lower[i][k] * z[k]
        z[i] = total / lower[i][i]
    return z


def back_substitution(lower, z):
    """Solve L^T w = z."""
    n = len(z)
    w = [0.0] * n
    for step in range(n):
        i = n - 1 - step
        total = z[i]
        for k in range(i + 1, n):
            total -= lower[k][i] * w[k]
        w[i] = total / lower[i][i]
    return w


def fit_predict(X_train, y_train, X_test, lengthscale=1.0, amplitude=1.0, noise=1e-4):
    n = len(X_train)

    # K_y = K + sigma_n^2 I. The noise term is also what keeps this invertible
    # when two training inputs are close together.
    k_y = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            k_y[i][j] = rbf(X_train[i], X_train[j], lengthscale, amplitude)
        k_y[i][i] += noise

    lower = cholesky(k_y)
    # alpha = K_y^-1 y, computed once and reused for every query point.
    alpha = back_substitution(lower, forward_substitution(lower, y_train))

    means = []
    variances = []

    for query in X_test:
        k_star = [rbf(query, X_train[i], lengthscale, amplitude) for i in range(n)]

        mean = 0.0
        for i in range(n):
            mean += k_star[i] * alpha[i]

        # v = L^-1 k_*, so k_*^T K_y^-1 k_* = ||v||^2 - one solve, no inverse.
        v = forward_substitution(lower, k_star)
        explained = 0.0
        for i in range(n):
            explained += v[i] * v[i]

        means.append(mean)
        variances.append(amplitude - explained)

    return means, variances`,
        profile: 'O(n^3) for the factorization and O(n^2) per query for the variance, in interpreter loops over lists of lists.',
      },
      'make-it-right': {
        code: `"""Gaussian process regression - typed, factorization cached, kernel injected."""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import cho_factor, cho_solve, solve_triangular

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Kernel = Callable[[Matrix, Matrix], Matrix]


def matern52(lengthscale: float, amplitude: float = 1.0) -> Kernel:
    """Matern 5/2 - twice differentiable, and the honest default.

    The RBF kernel asserts an infinitely differentiable function, which almost
    no real process is. Matern 5/2 assumes far less and is the standard choice
    in Bayesian optimization for exactly that reason.
    """

    def kernel(a: Matrix, b: Matrix) -> Matrix:
        squared = (
            np.einsum("ij,ij->i", a, a)[:, None]
            - 2.0 * (a @ b.T)
            + np.einsum("ij,ij->i", b, b)[None, :]
        )
        distance = np.sqrt(np.maximum(squared, 0.0)) / lengthscale
        scaled = np.sqrt(5.0) * distance
        return amplitude * (1.0 + scaled + 5.0 / 3.0 * distance**2) * np.exp(-scaled)

    return kernel


@dataclass(frozen=True)
class GaussianProcess:
    """A fitted GP. The Cholesky factor and the weights are the model.

    Both are computed once at fit time: re-solving per query would turn an O(n)
    prediction into an O(n^3) one, which is the most common accidental
    regression in a GP implementation.
    """

    X_train: Matrix
    factor: tuple[Matrix, bool]     # cho_factor output
    weights: Vector                 # alpha = K_y^-1 y
    kernel: Kernel
    prior_variance: float
    log_marginal_likelihood: float

    def predict(self, X: Matrix, return_std: bool = False) -> tuple[Vector, Vector | None]:
        if X.ndim != 2 or X.shape[1] != self.X_train.shape[1]:
            raise ValueError(
                f"expected (m, {self.X_train.shape[1]}) inputs, got {X.shape}"
            )

        cross = self.kernel(X, self.X_train)          # (m, n)
        mean = cross @ self.weights

        if not return_std:
            return mean, None

        # v = L^-1 k_*, so the explained variance is the squared row norm.
        lower, _ = self.factor
        solved = solve_triangular(lower, cross.T, lower=True)
        explained = np.einsum("ij,ij->j", solved, solved)
        variance = np.maximum(self.prior_variance - explained, 0.0)
        return mean, np.sqrt(variance)


def fit(
    X: Matrix,
    y: Vector,
    kernel: Kernel | None = None,
    noise: float = 1e-4,
    jitter: float = 1e-10,
) -> GaussianProcess:
    """Condition the prior on the data. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if noise <= 0.0:
        raise ValueError("noise must be positive; it is also the numerical regularizer")

    # None rather than a default kernel instance: a mutable default would be
    # shared across every call to this function.
    active_kernel = matern52(lengthscale=1.0) if kernel is None else kernel

    n = X.shape[0]
    k_y = active_kernel(X, X) + (noise + jitter) * np.eye(n)

    try:
        factor = cho_factor(k_y, lower=True)
    except np.linalg.LinAlgError as error:
        raise ValueError(
            "kernel matrix is not positive definite - duplicate or near-duplicate "
            "training inputs; increase jitter"
        ) from error

    weights = cho_solve(factor, y)

    # log|K_y| = 2 * sum(log diag(L)) - free, given the factor already computed.
    lower, _ = factor
    log_det = 2.0 * np.log(np.diag(lower)).sum()
    log_marginal = -0.5 * float(y @ weights) - 0.5 * log_det - 0.5 * n * np.log(2.0 * np.pi)

    return GaussianProcess(
        X_train=X,
        factor=factor,
        weights=weights,
        kernel=active_kernel,
        prior_variance=float(active_kernel(X[:1], X[:1])[0, 0]),
        log_marginal_likelihood=log_marginal,
    )`,
        rationale:
          'The structural change is that fitting and predicting become separate: the Cholesky factor and the weight vector are computed once and stored on the model, so a prediction is a dot product rather than a re-factorization — the difference between O(n) and O(n^3) per query, and the most common accidental regression in a GP implementation. The kernel becomes an injected callable rather than a hard-coded RBF, and the default moves to Matern 5/2, because RBF asserts infinite differentiability that almost no real process has. The hand-rolled triangular solves become LAPACK calls, the log marginal likelihood is computed from the factor that already exists, and the non-positive-definite case — which the previous stage raised as a bare arithmetic failure — becomes a specific error naming its actual cause.',
        conventions: [
          'Explicit type hints on every public signature',
          'No mutable default arguments',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n^3) once at fit; O(n) per query for the mean and O(n^2) for the variance, in LAPACK.',
      },
      'make-it-fast': {
        code: `"""Gaussian process regression - blocked prediction, fused variance, in place."""

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import cho_factor, cho_solve, solve_triangular

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class BlockedGaussianProcess:
    """Exact GP prediction over large query batches.

    The variance is the expensive half - O(n^2) per query - and the naive
    implementation computes it one query at a time, re-entering LAPACK for each.
    Here the whole block is solved at once: L^-1 K_*^T is a single triangular
    solve over an (n, m) right-hand side, and the explained variance is the
    squared column norms of the result.

    Nothing here makes exact GP regression sub-cubic. Past roughly ten thousand
    training points the answer is an inducing-point approximation, not a better
    kernel evaluation.
    """

    def __init__(self, X: Matrix, y: Vector, lengthscale: float, amplitude: float,
                 noise: float) -> None:
        self._X = np.ascontiguousarray(X, dtype=np.float64)
        self._lengthscale = lengthscale
        self._amplitude = amplitude
        # Squared norms of the training inputs, precomputed once: every kernel
        # evaluation for every future query reuses them.
        self._train_norms = np.einsum("ij,ij->i", self._X, self._X)

        k_y = self._kernel(self._X, self._train_norms)
        k_y[np.diag_indices_from(k_y)] += noise
        self._factor = cho_factor(k_y, lower=True)
        self._weights = cho_solve(self._factor, np.ascontiguousarray(y, dtype=np.float64))

    def _kernel(self, B: Matrix, b_norms: Vector) -> Matrix:
        """RBF against the training set, via the squared-norm expansion.

        ||a - b||^2 = ||a||^2 - 2 a . b + ||b||^2, so the only term touching
        both operands is a GEMM.
        """
        squared = self._X @ B.T
        squared *= -2.0                                   # in place
        squared += self._train_norms[:, None]
        squared += b_norms[None, :]
        np.maximum(squared, 0.0, out=squared)             # cancellation guard
        squared *= -0.5 / (self._lengthscale * self._lengthscale)
        np.exp(squared, out=squared)
        squared *= self._amplitude
        return squared                                    # (n, m)

    def predict(self, X: Matrix, batch: int = 4096) -> tuple[Vector, Vector]:
        queries = np.ascontiguousarray(X, dtype=np.float64)
        m = queries.shape[0]

        mean = np.empty(m, dtype=np.float64)              # allocated once
        std = np.empty(m, dtype=np.float64)
        lower, _ = self._factor

        # Batching bounds the (n, batch) cross-covariance block, which is what
        # actually limits how many queries can be scored in one call.
        for start in range(0, m, batch):
            stop = min(start + batch, m)
            block = queries[start:stop]
            block_norms = np.einsum("ij,ij->i", block, block)

            cross = self._kernel(block, block_norms)      # (n, b)
            mean[start:stop] = cross.T @ self._weights

            # One triangular solve for the whole block, not one per query.
            solved = solve_triangular(lower, cross, lower=True, overwrite_b=True)
            explained = np.einsum("ij,ij->j", solved, solved)
            np.subtract(self._amplitude, explained, out=explained)
            np.maximum(explained, 0.0, out=explained)
            np.sqrt(explained, out=std[start:stop])

        return mean, std`,
        rationale:
          'The kernel evaluation stops being a broadcast subtraction and becomes a matrix product, by expanding the squared distance so the only term involving both operands is a GEMM — with the training-set squared norms precomputed once and reused by every future query. The predictive variance, which is the expensive half, stops being a per-query triangular solve and becomes one solve over the whole query block, so LAPACK is entered once per batch rather than once per point. Batching bounds the (n, m) cross-covariance block, and the kernel arithmetic runs entirely through in-place operations because that block is the largest array in the computation. What is deliberately not claimed: none of this changes the cubic fit cost.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The cross-covariance becomes one GEMM through the squared-norm expansion, and the explained variance becomes an einsum reduction over the solved block with no intermediate.',
            tradeoff: 'The expansion is less numerically stable than a direct subtraction — cancellation between large squared norms yields small negative distances, which is why the clip before the exponential is load-bearing rather than defensive.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One triangular solve serves a whole block of queries instead of one per query, and the (n, batch) cross-covariance bounds peak memory independently of how many points are scored.',
            tradeoff: 'The batch size is an untunable-by-default parameter: too small and the LAPACK call is dominated by dispatch, too large and the cross-covariance block no longer fits in cache.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Mean and standard-deviation outputs are allocated once for the batch, and the kernel is built through in-place multiply, add, and exp rather than six full-size temporaries.',
            tradeoff: 'The in-place chain reuses one buffer for the squared distance, then the scaled distance, then the kernel — fast, materially harder to read, and silently wrong if the lines are reordered.',
          },
        ],
        libraryName: 'NumPy + SciPy / LAPACK',
        profile: 'O(n^3) once at fit, then O(n*m) for the means and O(n^2*m) for the variances in BLAS. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Gaussian process regression - the posterior equations, transcribed.
#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <vector>

// k(a, b) = amplitude * exp(-||a - b||^2 / (2 * lengthscale^2))
double Rbf(const std::vector<double>& a, const std::vector<double>& b,
           double lengthscale, double amplitude) {
  double squared = 0.0;
  for (std::size_t j = 0; j < a.size(); ++j) {
    const double difference = a[j] - b[j];
    squared += difference * difference;
  }
  return amplitude * std::exp(-0.5 * squared / (lengthscale * lengthscale));
}

// Lower-triangular L with L L^T = matrix. The inverse is never formed: K_y is
// symmetric positive definite, so a factorization plus triangular solves is
// both cheaper and much better conditioned.
std::vector<std::vector<double>> Cholesky(
    const std::vector<std::vector<double>>& matrix) {
  const std::size_t n = matrix.size();
  std::vector<std::vector<double>> lower(n, std::vector<double>(n, 0.0));

  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j <= i; ++j) {
      double total = matrix[i][j];
      for (std::size_t k = 0; k < j; ++k) {
        total -= lower[i][k] * lower[j][k];
      }

      if (i == j) {
        if (total <= 0.0) {
          throw std::runtime_error("kernel matrix is not positive definite; add jitter");
        }
        lower[i][j] = std::sqrt(total);
      } else {
        lower[i][j] = total / lower[j][j];
      }
    }
  }

  return lower;
}

// Solve L z = b.
std::vector<double> ForwardSubstitution(
    const std::vector<std::vector<double>>& lower, const std::vector<double>& b) {
  const std::size_t n = b.size();
  std::vector<double> z(n, 0.0);
  for (std::size_t i = 0; i < n; ++i) {
    double total = b[i];
    for (std::size_t k = 0; k < i; ++k) total -= lower[i][k] * z[k];
    z[i] = total / lower[i][i];
  }
  return z;
}

// Solve L^T w = z.
std::vector<double> BackSubstitution(
    const std::vector<std::vector<double>>& lower, const std::vector<double>& z) {
  const std::size_t n = z.size();
  std::vector<double> w(n, 0.0);
  for (std::size_t step = 0; step < n; ++step) {
    const std::size_t i = n - 1 - step;
    double total = z[i];
    for (std::size_t k = i + 1; k < n; ++k) total -= lower[k][i] * w[k];
    w[i] = total / lower[i][i];
  }
  return w;
}

void FitPredict(const std::vector<std::vector<double>>& X_train,
                const std::vector<double>& y_train,
                const std::vector<std::vector<double>>& X_test,
                double lengthscale, double amplitude, double noise,
                std::vector<double>& means, std::vector<double>& variances) {
  const std::size_t n = X_train.size();

  // K_y = K + sigma_n^2 I. The noise is also what keeps this invertible when
  // two training inputs sit close together.
  std::vector<std::vector<double>> k_y(n, std::vector<double>(n, 0.0));
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < n; ++j) {
      k_y[i][j] = Rbf(X_train[i], X_train[j], lengthscale, amplitude);
    }
    k_y[i][i] += noise;
  }

  const auto lower = Cholesky(k_y);
  // alpha = K_y^-1 y, computed once and reused by every query.
  const auto alpha = BackSubstitution(lower, ForwardSubstitution(lower, y_train));

  means.clear();
  variances.clear();

  for (const auto& query : X_test) {
    std::vector<double> k_star(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) {
      k_star[i] = Rbf(query, X_train[i], lengthscale, amplitude);
    }

    double mean = 0.0;
    for (std::size_t i = 0; i < n; ++i) mean += k_star[i] * alpha[i];

    // v = L^-1 k_*, so k_*^T K_y^-1 k_* is ||v||^2.
    const auto v = ForwardSubstitution(lower, k_star);
    double explained = 0.0;
    for (std::size_t i = 0; i < n; ++i) explained += v[i] * v[i];

    means.push_back(mean);
    variances.push_back(amplitude - explained);
  }
}`,
        profile: 'O(n^3) to factorize and O(n^2) per query for the variance, over a nested vector that scatters every row across the heap.',
      },
      'make-it-right': {
        code: `// Gaussian process regression - flat storage, cached factor, RAII, fails fast.
#include <cmath>
#include <cstddef>
#include <functional>
#include <numbers>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// The kernel is the modelling assumption, so it enters as a value.
using Kernel = std::function<double(std::span<const double>, std::span<const double>)>;

[[nodiscard]] inline Kernel Matern52(double lengthscale, double amplitude) {
  // Twice differentiable. The RBF kernel asserts an infinitely differentiable
  // function, which almost no real process is.
  return [lengthscale, amplitude](std::span<const double> a, std::span<const double> b) {
    double squared = 0.0;
    for (std::size_t j = 0; j < a.size(); ++j) {
      const double difference = a[j] - b[j];
      squared += difference * difference;
    }
    const double distance = std::sqrt(squared) / lengthscale;
    const double scaled = std::sqrt(5.0) * distance;
    return amplitude * (1.0 + scaled + 5.0 / 3.0 * distance * distance) * std::exp(-scaled);
  };
}

// Owns the training set, the Cholesky factor, and the weight vector. All three
// are computed once in the constructor: re-solving per query would turn an
// O(n) prediction into an O(n^3) one.
class GaussianProcess {
 public:
  // x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
  GaussianProcess(std::vector<double> x_flat, std::span<const double> y,
                  std::size_t dimension, Kernel kernel, double noise)
      : x_(std::move(x_flat)),
        dimension_(dimension),
        kernel_(std::move(kernel)),
        n_(y.size()),
        factor_(y.size() * y.size(), 0.0),
        weights_(y.begin(), y.end()) {
    if (dimension_ == 0 || n_ == 0) throw std::invalid_argument("empty problem");
    if (x_.size() != n_ * dimension_) {
      throw std::invalid_argument("X and y describe different row counts");
    }
    if (noise <= 0.0) {
      throw std::invalid_argument("noise must be positive; it is also the regularizer");
    }

    for (std::size_t i = 0; i < n_; ++i) {
      for (std::size_t j = 0; j <= i; ++j) {
        factor_[i * n_ + j] = kernel_(Row(i), Row(j));
      }
      factor_[i * n_ + i] += noise;
    }

    CholeskyInPlace();
    ForwardSubstitute(weights_);
    BackSubstitute(weights_);          // weights_ = K_y^-1 y

    prior_variance_ = kernel_(Row(0), Row(0));
  }

  // Posterior mean and variance at one query point.
  [[nodiscard]] std::pair<double, double> Predict(std::span<const double> query) const {
    if (query.size() != dimension_) {
      throw std::invalid_argument("query width does not match the model");
    }

    std::vector<double> k_star(n_);
    double mean = 0.0;
    for (std::size_t i = 0; i < n_; ++i) {
      k_star[i] = kernel_(query, Row(i));
      mean += k_star[i] * weights_[i];
    }

    // v = L^-1 k_*, so the explained variance is ||v||^2.
    ForwardSubstitute(k_star);
    double explained = 0.0;
    for (const double value : k_star) explained += value * value;

    return {mean, std::max(prior_variance_ - explained, 0.0)};
  }

  // log|K_y| = 2 * sum(log diag(L)) - free, given the factor already exists.
  [[nodiscard]] double LogMarginalLikelihood(std::span<const double> y) const {
    double quadratic = 0.0;
    for (std::size_t i = 0; i < n_; ++i) quadratic += y[i] * weights_[i];

    double log_det = 0.0;
    for (std::size_t i = 0; i < n_; ++i) log_det += std::log(factor_[i * n_ + i]);

    return -0.5 * quadratic - log_det -
           0.5 * static_cast<double>(n_) * std::log(2.0 * std::numbers::pi);
  }

 private:
  [[nodiscard]] std::span<const double> Row(std::size_t index) const {
    return {x_.data() + index * dimension_, dimension_};
  }

  void CholeskyInPlace() {
    for (std::size_t j = 0; j < n_; ++j) {
      double diagonal = factor_[j * n_ + j];
      for (std::size_t k = 0; k < j; ++k) {
        diagonal -= factor_[j * n_ + k] * factor_[j * n_ + k];
      }
      if (diagonal <= 0.0) {
        throw std::runtime_error(
            "kernel matrix is not positive definite - duplicate training inputs; add jitter");
      }
      factor_[j * n_ + j] = std::sqrt(diagonal);

      for (std::size_t i = j + 1; i < n_; ++i) {
        double value = factor_[i * n_ + j];
        for (std::size_t k = 0; k < j; ++k) {
          value -= factor_[i * n_ + k] * factor_[j * n_ + k];
        }
        factor_[i * n_ + j] = value / factor_[j * n_ + j];
      }
    }
  }

  void ForwardSubstitute(std::vector<double>& b) const {
    for (std::size_t i = 0; i < n_; ++i) {
      for (std::size_t k = 0; k < i; ++k) b[i] -= factor_[i * n_ + k] * b[k];
      b[i] /= factor_[i * n_ + i];
    }
  }

  void BackSubstitute(std::vector<double>& z) const {
    for (std::size_t step = 0; step < n_; ++step) {
      const std::size_t i = n_ - 1 - step;
      for (std::size_t k = i + 1; k < n_; ++k) z[i] -= factor_[k * n_ + i] * z[k];
      z[i] /= factor_[i * n_ + i];
    }
  }

  std::vector<double> x_;          // row-major training inputs, owned
  std::size_t dimension_;
  Kernel kernel_;
  std::size_t n_;
  std::vector<double> factor_;     // lower-triangular Cholesky, row-major
  std::vector<double> weights_;    // K_y^-1 y
  double prior_variance_ = 0.0;
};`,
        rationale:
          'Fitting and predicting separate: the factorization and the weight vector are computed once in the constructor and owned by the object, so a prediction is a dot product and a single triangular solve rather than a re-factorization — the difference between O(n) and O(n^3) per query. The nested vectors become flat row-major buffers, and the Cholesky runs in place over the same buffer that held the kernel matrix, which halves the peak memory of the largest array in the model. The kernel is injected as a value rather than hard-coded, defaulting to Matern rather than RBF, and every precondition — dimensions, positive noise, positive definiteness — is checked where it can still be attributed to a cause.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n^3) once in the constructor; O(n^2) per query for the variance, over one contiguous factor.',
      },
      'make-it-fast': {
        code: `// Gaussian process regression - Eigen LLT, blocked kernel, blocked solve.
#include <Eigen/Cholesky>
#include <Eigen/Dense>
#include <stdexcept>

// Row-major: a point is one contiguous run, which suits the GEMM below.
using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

class BlockedGaussianProcess {
 public:
  BlockedGaussianProcess(RowMajorMatrix X, const Eigen::VectorXd& y,
                         double lengthscale, double amplitude, double noise)
      : x_(std::move(X)),
        lengthscale_(lengthscale),
        amplitude_(amplitude),
        train_norms_(x_.rowwise().squaredNorm()) {
    if (x_.rows() != y.size()) {
      throw std::invalid_argument("X and y describe different row counts");
    }

    Eigen::MatrixXd k_y = RbfBlock(x_, train_norms_);
    k_y.diagonal().array() += noise;

    llt_ = Eigen::LLT<Eigen::MatrixXd>(k_y);
    if (llt_.info() != Eigen::Success) {
      throw std::runtime_error(
          "kernel matrix is not positive definite - duplicate inputs; add jitter");
    }
    weights_ = llt_.solve(y);          // K_y^-1 y, computed once
  }

  // Posterior mean and standard deviation for a whole block of queries.
  //
  // The variance is the expensive half, and the naive form pays a triangular
  // solve per query. Here L^-1 K_* is one solve over an (n, m) right-hand
  // side, and the explained variance is the squared column norms.
  [[nodiscard]] std::pair<Eigen::VectorXd, Eigen::VectorXd> Predict(
      const RowMajorMatrix& queries) const {
    const Eigen::VectorXd query_norms = queries.rowwise().squaredNorm();
    const Eigen::MatrixXd cross = RbfBlock(queries, query_norms);   // (n, m)

    const Eigen::VectorXd mean = cross.transpose() * weights_;

    Eigen::MatrixXd solved = llt_.matrixL().solve(cross);
    const Eigen::VectorXd explained = solved.colwise().squaredNorm();
    const Eigen::VectorXd variance =
        (Eigen::VectorXd::Constant(queries.rows(), amplitude_) - explained)
            .cwiseMax(0.0);

    return {mean, variance.cwiseSqrt()};
  }

 private:
  // ||a - b||^2 = ||a||^2 - 2 a . b + ||b||^2: the only term touching both
  // operands is a GEMM, and the training norms are precomputed once.
  [[nodiscard]] Eigen::MatrixXd RbfBlock(const RowMajorMatrix& B,
                                         const Eigen::VectorXd& b_norms) const {
    Eigen::MatrixXd squared = (-2.0 * (x_ * B.transpose())).colwise() + train_norms_;
    squared.rowwise() += b_norms.transpose();
    return amplitude_ *
           (squared.cwiseMax(0.0).array() * (-0.5 / (lengthscale_ * lengthscale_)))
               .exp();
  }

  RowMajorMatrix x_;
  double lengthscale_;
  double amplitude_;
  Eigen::VectorXd train_norms_;
  Eigen::LLT<Eigen::MatrixXd> llt_;
  Eigen::VectorXd weights_;
};`,
        rationale:
          'The hand-written Cholesky becomes Eigen’s blocked LLT, which is the same algorithm executed against a tuned kernel rather than a triple loop, and the kernel matrix is built through the squared-norm expansion so its dominant term is a GEMM with the training norms precomputed once. The predictive variance moves from one triangular solve per query to a single solve over the whole query block, which is where most of the wall-clock in a GP prediction path actually goes. The cubic fit cost is unchanged and deliberately so — no rearrangement of the exact computation avoids it.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Both the kernel matrix and the blocked triangular solve dispatch to blocked LAPACK-style kernels, replacing an O(n^3) triple loop and m separate solves.',
            tradeoff: 'Materializes the full n-by-n kernel matrix and an (n, m) cross-covariance block, so memory grows with both training and query size — at n = 10,000 the kernel alone is 800 MB.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The squared-distance expansion, the exponential, and the squared column norms fuse into single passes rather than allocating an intermediate matrix at each step.',
            tradeoff: 'One line now hides an O(n·m) allocation and an O(n^2·m) solve, so the cost is no longer visible where it is paid — and an expression bound to auto can dangle after its operands go out of scope.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen leaves vectorization of its kernels to the compiler, so an unoptimized build of this is no faster than the hand-written triple loop it replaced.',
            tradeoff: '-march=native emits instructions that may not exist on other machines in the fleet, turning a performance choice into a portability failure.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n^3) once at construction, then O(n*m) for means and O(n^2*m) for variances in BLAS. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Gaussian process regression - the posterior equations, transcribed.

/// k(a, b) = amplitude * exp(-||a - b||^2 / (2 * lengthscale^2))
fn rbf(a: &[f64], b: &[f64], lengthscale: f64, amplitude: f64) -> f64 {
    let mut squared = 0.0;
    for j in 0..a.len() {
        let difference = a[j] - b[j];
        squared += difference * difference;
    }
    amplitude * (-0.5 * squared / (lengthscale * lengthscale)).exp()
}

/// Lower-triangular L with L L^T = matrix. The inverse is never formed: K_y is
/// symmetric positive definite, so a factorization plus triangular solves is
/// cheaper and much better conditioned.
fn cholesky(matrix: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = matrix.len();
    let mut lower = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in 0..=i {
            let mut total = matrix[i][j];
            for k in 0..j {
                total -= lower[i][k] * lower[j][k];
            }

            if i == j {
                assert!(total > 0.0, "kernel matrix is not positive definite; add jitter");
                lower[i][j] = total.sqrt();
            } else {
                lower[i][j] = total / lower[j][j];
            }
        }
    }

    lower
}

/// Solve L z = b.
fn forward_substitution(lower: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let n = b.len();
    let mut z = vec![0.0; n];
    for i in 0..n {
        let mut total = b[i];
        for k in 0..i {
            total -= lower[i][k] * z[k];
        }
        z[i] = total / lower[i][i];
    }
    z
}

/// Solve L^T w = z.
fn back_substitution(lower: &[Vec<f64>], z: &[f64]) -> Vec<f64> {
    let n = z.len();
    let mut w = vec![0.0; n];
    for step in 0..n {
        let i = n - 1 - step;
        let mut total = z[i];
        for k in (i + 1)..n {
            total -= lower[k][i] * w[k];
        }
        w[i] = total / lower[i][i];
    }
    w
}

pub fn fit_predict(
    x_train: &[Vec<f64>],
    y_train: &[f64],
    x_test: &[Vec<f64>],
    lengthscale: f64,
    amplitude: f64,
    noise: f64,
) -> (Vec<f64>, Vec<f64>) {
    let n = x_train.len();

    // K_y = K + sigma_n^2 I. The noise also keeps this invertible when two
    // training inputs sit close together.
    let mut k_y = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            k_y[i][j] = rbf(&x_train[i], &x_train[j], lengthscale, amplitude);
        }
        k_y[i][i] += noise;
    }

    let lower = cholesky(&k_y);
    // alpha = K_y^-1 y, computed once and reused by every query.
    let alpha = back_substitution(&lower, &forward_substitution(&lower, y_train));

    let mut means = Vec::new();
    let mut variances = Vec::new();

    for query in x_test {
        let mut k_star = vec![0.0; n];
        for i in 0..n {
            k_star[i] = rbf(query, &x_train[i], lengthscale, amplitude);
        }

        let mut mean = 0.0;
        for i in 0..n {
            mean += k_star[i] * alpha[i];
        }

        // v = L^-1 k_*, so k_*^T K_y^-1 k_* is ||v||^2.
        let v = forward_substitution(&lower, &k_star);
        let mut explained = 0.0;
        for i in 0..n {
            explained += v[i] * v[i];
        }

        means.push(mean);
        variances.push(amplitude - explained);
    }

    (means, variances)
}`,
        profile: 'O(n^3) to factorize and O(n^2) per query, every index bounds-checked, rows scattered across the heap.',
      },
      'make-it-right': {
        code: `//! Gaussian process regression - typed errors, newtypes, cached factor.

use std::f64::consts::PI;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum GpError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    NotPositiveDefinite { index: usize },
    Hyperparameter { name: &'static str, value: f64 },
}

impl fmt::Display for GpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty training set or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::NotPositiveDefinite { index } => write!(
                f,
                "kernel matrix not positive definite at row {index} - duplicate inputs; add jitter"
            ),
            Self::Hyperparameter { name, value } => {
                write!(f, "{name} must be positive and finite, got {value}")
            }
        }
    }
}

impl std::error::Error for GpError {}

/// Kernel lengthscale. A newtype because lengthscale, amplitude and noise are
/// three bare f64 in a row and transposing any two is silent.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lengthscale(f64);

/// Observation noise, which is also the numerical regularizer.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Noise(f64);

impl Lengthscale {
    pub fn new(value: f64) -> Result<Self, GpError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(GpError::Hyperparameter { name: "lengthscale", value });
        }
        Ok(Self(value))
    }
}

impl Noise {
    pub fn new(value: f64) -> Result<Self, GpError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(GpError::Hyperparameter { name: "noise", value });
        }
        Ok(Self(value))
    }
}

/// The modelling assumption, as a trait. Implementing it is the whole cost of
/// adding a kernel.
pub trait Kernel {
    fn evaluate(&self, a: &[f64], b: &[f64]) -> f64;
    /// k(x, x) - the prior variance, which is constant for a stationary kernel.
    fn prior_variance(&self) -> f64;
}

/// Twice differentiable. RBF asserts an infinitely differentiable function,
/// which almost no real process is.
pub struct Matern52 {
    pub lengthscale: Lengthscale,
    pub amplitude: f64,
}

impl Kernel for Matern52 {
    #[inline]
    fn evaluate(&self, a: &[f64], b: &[f64]) -> f64 {
        let squared: f64 = a
            .iter()
            .zip(b)
            .map(|(x, y)| {
                let difference = x - y;
                difference * difference
            })
            .sum();
        let distance = squared.sqrt() / self.lengthscale.0;
        let scaled = 5.0_f64.sqrt() * distance;
        self.amplitude * (1.0 + scaled + 5.0 / 3.0 * distance * distance) * (-scaled).exp()
    }

    fn prior_variance(&self) -> f64 {
        self.amplitude
    }
}

/// A fitted GP. The factor and the weights are computed once at construction:
/// re-solving per query would turn an O(n) prediction into an O(n^3) one.
pub struct GaussianProcess<K: Kernel> {
    x: Vec<f64>,          // row-major (n, d)
    dimension: usize,
    n: usize,
    kernel: K,
    factor: Vec<f64>,     // lower-triangular Cholesky, row-major
    weights: Vec<f64>,    // K_y^-1 y
}

impl<K: Kernel> GaussianProcess<K> {
    /// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
    pub fn fit(
        x_flat: Vec<f64>,
        y: &[f64],
        dimension: usize,
        kernel: K,
        noise: Noise,
    ) -> Result<Self, GpError> {
        if dimension == 0 || y.is_empty() {
            return Err(GpError::Empty);
        }
        if x_flat.len() != y.len() * dimension {
            return Err(GpError::ShapeMismatch {
                expected: y.len() * dimension,
                found: x_flat.len(),
            });
        }

        let n = y.len();
        let mut factor = vec![0.0_f64; n * n];

        for i in 0..n {
            let row_i = &x_flat[i * dimension..(i + 1) * dimension];
            for j in 0..=i {
                let row_j = &x_flat[j * dimension..(j + 1) * dimension];
                factor[i * n + j] = kernel.evaluate(row_i, row_j);
            }
            factor[i * n + i] += noise.0;
        }

        // Cholesky in place over the same buffer that held the kernel matrix.
        for j in 0..n {
            let mut diagonal = factor[j * n + j];
            for k in 0..j {
                diagonal -= factor[j * n + k] * factor[j * n + k];
            }
            if diagonal <= 0.0 {
                return Err(GpError::NotPositiveDefinite { index: j });
            }
            factor[j * n + j] = diagonal.sqrt();

            for i in (j + 1)..n {
                let mut value = factor[i * n + j];
                for k in 0..j {
                    value -= factor[i * n + k] * factor[j * n + k];
                }
                factor[i * n + j] = value / factor[j * n + j];
            }
        }

        let mut weights = y.to_vec();
        Self::forward_substitute(&factor, n, &mut weights);
        Self::back_substitute(&factor, n, &mut weights);

        Ok(Self { x: x_flat, dimension, n, kernel, factor, weights })
    }

    /// Posterior mean and variance at one query point.
    pub fn predict(&self, query: &[f64]) -> Result<(f64, f64), GpError> {
        if query.len() != self.dimension {
            return Err(GpError::ShapeMismatch {
                expected: self.dimension,
                found: query.len(),
            });
        }

        let mut k_star: Vec<f64> = self
            .x
            .chunks_exact(self.dimension)
            .map(|point| self.kernel.evaluate(query, point))
            .collect();

        let mean: f64 = k_star.iter().zip(&self.weights).map(|(k, w)| k * w).sum();

        // v = L^-1 k_*, so the explained variance is ||v||^2.
        Self::forward_substitute(&self.factor, self.n, &mut k_star);
        let explained: f64 = k_star.iter().map(|v| v * v).sum();

        Ok((mean, (self.kernel.prior_variance() - explained).max(0.0)))
    }

    /// log|K_y| = 2 * sum(log diag(L)) - free, given the factor already exists.
    #[must_use]
    pub fn log_marginal_likelihood(&self, y: &[f64]) -> f64 {
        let quadratic: f64 = y.iter().zip(&self.weights).map(|(a, b)| a * b).sum();
        let log_det: f64 = (0..self.n).map(|i| self.factor[i * self.n + i].ln()).sum();
        -0.5 * quadratic - log_det - 0.5 * self.n as f64 * (2.0 * PI).ln()
    }

    fn forward_substitute(factor: &[f64], n: usize, b: &mut [f64]) {
        for i in 0..n {
            let mut value = b[i];
            for k in 0..i {
                value -= factor[i * n + k] * b[k];
            }
            b[i] = value / factor[i * n + i];
        }
    }

    fn back_substitute(factor: &[f64], n: usize, z: &mut [f64]) {
        for step in 0..n {
            let i = n - 1 - step;
            let mut value = z[i];
            for k in (i + 1)..n {
                value -= factor[k * n + i] * z[k];
            }
            z[i] = value / factor[i * n + i];
        }
    }
}
`,
        rationale:
          'Fitting and predicting separate, with the Cholesky factor and the weight vector computed once at construction and owned by the model — the difference between an O(n) and an O(n^3) prediction. The assertion that the matrix is positive definite becomes a typed Result naming the row where it failed and its actual cause, which is duplicate training inputs rather than a bug. The three bare f64 hyperparameters get validated newtypes, because lengthscale, amplitude and noise sit adjacent in every signature and transposing any two produces a plausible, wrong model. The kernel becomes a generic trait bound so calls still inline, the nested Vecs become one flat row-major buffer, and the factorization runs in place over the buffer that held the kernel matrix.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n^3) once at construction; O(n^2) per query for the variance, over one contiguous factor.',
      },
      'make-it-fast': {
        code: `//! Gaussian process regression - BLAS-backed factorization, parallel kernel.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis};
use ndarray_linalg::{cholesky::*, triangular::*};
use rayon::prelude::*;

/// Exact GP with the kernel matrix built in parallel and the linear algebra
/// handed to LAPACK.
///
/// Nothing here makes exact GP regression sub-cubic. Past roughly ten thousand
/// training points the answer is an inducing-point approximation, not a faster
/// Cholesky - this makes the affordable range affordable, not larger.
pub struct BlockedGaussianProcess {
    x: Array2<f64>,
    train_norms: Array1<f64>,
    lengthscale: f64,
    amplitude: f64,
    factor: Array2<f64>,      // lower Cholesky of K_y
    weights: Array1<f64>,     // K_y^-1 y
}

impl BlockedGaussianProcess {
    /// ||a - b||^2 = ||a||^2 - 2 a . b + ||b||^2, so the only term touching
    /// both operands is a matrix product. Rows are independent, so the
    /// exponentiation fans out across cores.
    fn rbf_block(
        &self,
        b: ArrayView2<f64>,
        b_norms: ArrayView1<f64>,
    ) -> Array2<f64> {
        let cross = self.x.dot(&b.t());
        let mut out = Array2::<f64>::zeros(cross.raw_dim());

        out.axis_iter_mut(Axis(0))
            .into_par_iter()
            .enumerate()
            .for_each(|(i, mut row)| {
                for j in 0..row.len() {
                    let squared =
                        (self.train_norms[i] - 2.0 * cross[[i, j]] + b_norms[j]).max(0.0);
                    row[j] = self.amplitude
                        * (-0.5 * squared / (self.lengthscale * self.lengthscale)).exp();
                }
            });

        out
    }

    #[must_use]
    pub fn fit(
        x: Array2<f64>,
        y: ArrayView1<f64>,
        lengthscale: f64,
        amplitude: f64,
        noise: f64,
    ) -> Self {
        let train_norms: Array1<f64> =
            x.axis_iter(Axis(0)).map(|row| row.dot(&row)).collect();

        let mut model = Self {
            x,
            train_norms,
            lengthscale,
            amplitude,
            factor: Array2::zeros((0, 0)),
            weights: Array1::zeros(0),
        };

        let train_view = model.x.clone();
        let mut k_y = model.rbf_block(train_view.view(), model.train_norms.view());
        for i in 0..k_y.nrows() {
            k_y[[i, i]] += noise;
        }

        let factor = k_y
            .cholesky(UPLO::Lower)
            .expect("kernel matrix not positive definite - duplicate inputs; add jitter");

        // Two triangular solves, both in LAPACK: alpha = L^-T (L^-1 y).
        let z = factor
            .solve_triangular(UPLO::Lower, Diag::NonUnit, &y.to_owned())
            .expect("triangular solve failed");
        let weights = factor
            .t()
            .to_owned()
            .solve_triangular(UPLO::Upper, Diag::NonUnit, &z)
            .expect("triangular solve failed");

        model.factor = factor;
        model.weights = weights;
        model
    }

    /// Posterior means and standard deviations for a whole query block.
    ///
    /// The variance is the expensive half; solving L^-1 K_* once over the
    /// entire block replaces one triangular solve per query.
    #[must_use]
    pub fn predict(&self, queries: ArrayView2<f64>) -> (Array1<f64>, Array1<f64>) {
        let query_norms: Array1<f64> =
            queries.axis_iter(Axis(0)).map(|row| row.dot(&row)).collect();
        let cross = self.rbf_block(queries, query_norms.view());   // (n, m)

        let mean = cross.t().dot(&self.weights);

        let solved = self
            .factor
            .solve_triangular(UPLO::Lower, Diag::NonUnit, &cross)
            .expect("triangular solve failed");

        let mut std = Vec::with_capacity(queries.nrows());
        std.extend(solved.axis_iter(Axis(1)).map(|column| {
            (self.amplitude - column.dot(&column)).max(0.0).sqrt()
        }));

        (mean, Array1::from(std))
    }
}
`,
        rationale:
          'Three changes. The kernel matrix is built through the squared-norm expansion so its dominant term is a BLAS matrix product, with the exponentiation fanned across rows by rayon since rows are independent. The hand-written Cholesky and substitutions become LAPACK calls, which is the same algorithm executed by a blocked kernel rather than a triple loop. And the predictive variance moves from one triangular solve per query to a single solve over the whole query block, which is where most of the prediction wall-clock actually goes. The cubic fit cost is unchanged, and the doc comment says so rather than implying otherwise.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The Cholesky, both substitutions, and the cross-covariance product all dispatch to LAPACK and BLAS instead of hand-written loops — the entire O(n^3) portion of the fit.',
            tradeoff: 'Binds the build to a system BLAS/LAPACK, so a dependency-free static binary is no longer possible, and the n-by-n kernel matrix must be fully resident.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Each row of the kernel block depends only on its own training point, so the exponentiation partitions across cores with no shared mutable state.',
            tradeoff: 'The parallel section is only the elementwise exponential; the factorization that dominates the cost is left to BLAS, so speedup from rayon here is bounded and can be eaten by thread oversubscription against a threaded BLAS.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The standard-deviation output is allocated at its exact final length before the column reduction, so it is never grown and copied.',
            tradeoff: 'Requires the query count up front, which rules out streaming predictions from an iterator of unknown length without a first counting pass.',
          },
        ],
        libraryName: 'ndarray + ndarray-linalg + rayon',
        profile: 'O(n^3) once at fit in LAPACK, then O(n*m) means and O(n^2*m) variances. Illustrative, not a measured benchmark.',
      },
    },
  },
};
