import type { AiMlModel } from '../../types';

/**
 * Gaussian Mixture Models (EM) — soft clustering, and the section's reference
 * example of a latent-variable fit.
 *
 * Follows naive-bayes in the probabilistic group because it is the same
 * generative move made without labels: model the distribution the data came
 * from, except now the class is unobserved and has to be inferred alongside the
 * parameters. That is what EM is for, and the code progression is built around
 * the two things that decide whether a GMM implementation is usable — computing
 * responsibilities in log space, and factorizing the covariance instead of
 * inverting it.
 */
export const GAUSSIAN_MIXTURE: AiMlModel = {
  slug: 'gaussian-mixture',
  name: 'Gaussian Mixture Models (EM)',
  aliases: ['GMM', 'Mixture of Gaussians', 'Expectation-Maximization', 'Soft clustering'],
  category: 'classical-ml',
  group: 'probabilistic',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'density-estimation' is the primary output — the clustering is a by-product
  // of having fitted a density — and 'anomaly-detection' follows from scoring
  // that density; see applications.featured['anomaly-detection'].
  taskTypes: ['clustering', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Usually introduced as a clustering method, but the object being fitted is a density over the whole space. The cluster assignment is a by-product — the posterior over components — which is why the same fitted model answers "which group is this in" and "how likely is this at all".',

  intuition:
    'One Gaussian describes a single blob; real data is usually several, so describe it as a weighted sum of Gaussians and let the fit decide how much of each. The obstacle is that you never observe which component produced a point — that assignment is the latent variable — so you alternate. Given the current components, compute how responsible each is for each point. Given those responsibilities, refit each component to the points it owns, weighted by ownership. The defining feature is that ownership is fractional: a point between two clusters belongs 60/40 rather than being forced into one. k-means is this same loop with the responsibilities rounded to 0 and 1 and every covariance forced spherical and equal, which is exactly why k-means cannot represent an elongated or overlapping cluster and this can.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\log p(X \\mid \\theta) = \\sum_{i=1}^{n} \\log \\sum_{k=1}^{K} \\pi_k \\, \\mathcal{N}(\\mathbf{x}_i \\mid \\boldsymbol{\\mu}_k, \\Sigma_k)',
      symbols: [
        { symbol: '\\pi_k', meaning: 'mixing weight — the prior probability a point came from component k, summing to one' },
        { symbol: '\\boldsymbol{\\mu}_k, \\Sigma_k', meaning: 'mean and covariance of component k; the covariance is what lets a cluster be elongated or tilted' },
        { symbol: 'K', meaning: 'number of components, which is a choice rather than a fitted quantity' },
        { symbol: '\\sum_k \\text{ inside the } \\log', meaning: 'the marginalization over the unobserved component assignment — and the reason there is no closed form' },
      ],
    },
    reading:
      'How probable is the observed data under this mixture, summed over every possibility for the component that generated each point. The sum sitting inside the logarithm is what makes this hard: with the sum outside, each component would separate and the fit would be a closed-form Gaussian estimate per group. Inside, nothing factorizes. The whole purpose of the E-step is to get the sum back out — it replaces the log of a sum with an expected complete-data log-likelihood, which does factorize, at the cost of being only a lower bound on the thing you actually wanted.',
  },

  optimization: {
    method: 'Expectation-Maximization — alternating closed-form updates that ascend a lower bound on the log-likelihood',
    updateRule: {
      formula:
        '\\gamma_{ik} = \\frac{\\pi_k \\mathcal{N}(\\mathbf{x}_i \\mid \\boldsymbol{\\mu}_k, \\Sigma_k)}{\\sum_{l=1}^{K} \\pi_l \\mathcal{N}(\\mathbf{x}_i \\mid \\boldsymbol{\\mu}_l, \\Sigma_l)}, \\qquad \\boldsymbol{\\mu}_k \\leftarrow \\frac{\\sum_i \\gamma_{ik} \\mathbf{x}_i}{\\sum_i \\gamma_{ik}}, \\quad \\pi_k \\leftarrow \\frac{1}{n}\\sum_i \\gamma_{ik}',
      symbols: [
        { symbol: '\\gamma_{ik}', meaning: 'responsibility: the posterior probability that point i came from component k — the E-step, and the whole latent variable' },
        { symbol: '\\sum_i \\gamma_{ik}', meaning: 'the effective number of points owned by component k, which replaces a hard count everywhere a count would appear' },
        { symbol: '\\leftarrow', meaning: 'the M-step: ordinary weighted maximum-likelihood estimates, with responsibilities as the weights' },
        { symbol: '\\Sigma_k', meaning: 'updated the same way — a responsibility-weighted scatter matrix about the new mean' },
      ],
    },
    rationale:
      'Each EM iteration maximizes a lower bound on the log-likelihood that touches it exactly at the current parameters, which is what makes the guarantee unusually clean: the likelihood cannot decrease, there is no step size, and there is nothing to diverge. Both steps are closed form — the M-step is just weighted Gaussian maximum likelihood, which is why the algorithm is short. What is not guaranteed is the global optimum. The surface is non-convex, it has K-factorial equivalent modes from relabelling components, and — the part that matters in practice — the likelihood is unbounded above: shrink one component onto a single point and its density diverges. So a higher likelihood can be a degenerate solution rather than a better fit, which is why every serious implementation carries a covariance floor.',
    hyperparameters: [
      { name: 'K (n_components)', role: 'The number of components. Not learnable by likelihood — more components always fit better — so it is chosen by BIC, or by what the components are supposed to mean', typicalRange: '2 to 20 by BIC; beyond that a mixture is rarely the right model' },
      { name: 'covariance_type', role: 'full, tied, diagonal, or spherical. This is the real capacity dial: full costs K·d(d+1)/2 parameters and diagonal costs K·d', typicalRange: 'diagonal above ~50 dimensions, full below' },
      { name: 'reg_covar', role: 'Floor added to the covariance diagonal. Not a nicety — it is what stops a component collapsing onto one point and reporting infinite likelihood', typicalRange: '1e-6 relative to the feature scale' },
      { name: 'n_init / init_params', role: 'Restarts and initialization. k-means initialization plus several restarts is standard, because a single random start regularly converges somewhere bad' },
      { name: 'tol / max_iter', role: 'Stop on the relative change in log-likelihood; overlapping components converge slowly and can need hundreds of iterations', typicalRange: 'tol 1e-3 on average log-likelihood, 100 to 500 iterations' },
    ],
    convergence:
      'Monotone by construction — the log-likelihood increases every iteration and converges to a stationary point. That stationary point is where the trouble is. Random initialization regularly lands in a poor local optimum, so restarts are standard practice rather than diligence. Component collapse is the named failure: with a full covariance and no floor, a component that captures a single point drives its determinant to zero, its density to infinity, and the reported likelihood to positive infinity — a "perfect" fit that is entirely an artefact. Label switching means component 2 in one run is component 5 in the next, so anything downstream keyed to component index breaks silently across refits. And heavily overlapping components converge very slowly, because the responsibilities barely move between iterations.',
    complexity:
      'Per iteration: O(n·K·d^2) for full covariances, or O(n·K·d) for diagonal, plus O(K·d^3) for the Cholesky factorizations. Memory is O(n·K) for the responsibility matrix, which is the array that actually constrains batch size, plus O(K·d^2) for the covariances. Typically tens to low hundreds of iterations, so a GMM is comfortably cheaper than the kernel methods next door — its limit is dimension, not sample count.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Not as a forecaster on its own — it has no representation of order at all — but as the distributional component inside a temporal model. The two standard placements are as the emission density of a hidden Markov or state-space model, where the mixture describes what is observed in each regime, and as an unsupervised regime labeller over engineered features, whose component assignment becomes a covariate for a separate forecaster.',
        where: [
          'Emission distributions in HMMs for regime-switching series — the standard formulation in speech and in financial regime models',
          'Volatility- or condition-regime identification, feeding a regime indicator into a downstream forecaster',
          'Mixture-density outputs where a forecast needs to be multi-modal, since a single Gaussian cannot represent "either a spike or nothing"',
        ],
        why: 'It earns its place wherever the predictive distribution is genuinely multi-modal, which a squared-error forecaster cannot express: the mean of two plausible futures is often a value that will never occur. What it cannot supply is the temporal structure — fit a GMM to a series directly and it treats the observations as exchangeable, discarding the ordering that made it a time series. It is a component of a temporal model, never the model.',
        featurization: [
          'Fit on engineered features (returns, rolling volatility, spectral summaries) rather than raw levels, which drift and make the components non-stationary',
          'Standardize before fitting, since the covariance floor and the initialization are both scale-dependent',
          'Pin the component ordering after fitting — by mean, say — or label switching makes the regime indicator meaningless across refits',
        ],
        evaluation:
          'Out-of-sample log-likelihood on a temporal split, not on shuffled folds. Where the mixture feeds a forecaster, evaluate the forecaster: a regime split that improves BIC and does nothing for downstream error was a description, not a signal.',
        pitfalls: [
          'Treating exchangeable-data component assignments as regimes, when nothing in the model prevents the regime from flipping every observation',
          'Non-stationarity moving the components underneath a model that assumes they are fixed',
          'Selecting K by likelihood on the training window, which always prefers more components',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Fit the mixture to normal data and score new points by their log-likelihood under it: an anomaly is a point the fitted density considers improbable. Because the model is a density rather than a boundary, the score is continuous and comparable across the space, and the per-component responsibilities also say which mode of normality the point failed to belong to.',
        where: [
          'Multivariate process and equipment monitoring with several distinct normal operating regimes',
          'Fraud and account-behaviour models where legitimate behaviour is genuinely multi-modal',
          'Screening inputs to a deployed model for falling outside the training distribution',
          'Background modelling in vision, where a per-pixel mixture separates background from foreground',
        ],
        why: 'It is the natural choice when normal behaviour is several distinct things rather than one: a single-Gaussian or distance-to-centroid detector will place the boundary in the empty space between two legitimate modes and alarm on everything there. Being generative also makes the threshold interpretable, since it is a density level rather than an arbitrary score. The limits are dimensional and structural — density estimation degrades quickly above a few tens of features, and a full-covariance mixture needs enough points per component to estimate d-squared parameters, so on wide data an isolation forest or a reconstruction-based detector is the better answer.',
        featurization: [
          'Fit on a confirmed-clean window; contamination pulls a component out to cover the anomalies and they become normal',
          'Reduce dimension first — PCA, or a learned embedding — because covariance estimation is what fails as d grows, well before the feature count looks alarming',
          'Set the covariance floor relative to the feature scale after standardization, not as an absolute constant',
          'Choose K by BIC on clean data, then check that no component owns a negligible share, which usually means it has latched onto a handful of points',
        ],
        evaluation:
          'Precision@k and PR-AUC against confirmed incidents, with the threshold read from the log-likelihood quantiles of a clean period. Hold out entire anomaly episodes. Report the effective size of each component too — a fit where one component owns 1% of the mass is usually one collapse away from a useless density.',
        pitfalls: [
          'Component collapse producing an enormous likelihood at one point and a badly-shaped density everywhere else',
          'Choosing K to maximize likelihood, which drives K toward n and turns the model into a memoriser',
          'Assuming components correspond to meaningful regimes; a mixture approximates a density, and a curved single mode is routinely fitted by three Gaussians that mean nothing individually',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'EM is the canonical latent-variable optimization scheme, and the mixture is the example it is always taught on. The transferable content is the construction: build a lower bound on an intractable objective that touches it at the current parameters, maximize the bound instead, repeat. That is the majorize-minimize pattern, it is where the variational objective in a VAE comes from, and it explains both the monotonicity guarantee and its limits.',
        where: [
          'The reference example for EM, coordinate ascent on a bound, and why monotone improvement does not imply a global optimum',
          'Soft clustering feeding a downstream allocation problem, where a fractional assignment is more useful to an optimizer than a hard one',
          'Model selection by BIC as a worked example of penalizing likelihood by parameter count',
        ],
        why: 'It is the smallest complete example of optimizing something you cannot write down. Ordinary gradient methods are available here and are rarely used, because the closed-form alternating updates are both faster and free of step-size tuning — a case where exploiting the structure of the problem beats a general solver outright. The counterweight is worth stating: the same structure that gives monotone ascent gives no protection against local optima, and the objective itself is unbounded, so "the optimizer improved the objective" is not evidence the fit got better.',
        featurization: [
          'Standardize so the covariance floor and convergence tolerance mean the same thing in every dimension',
          'Initialize from k-means, which is the cheap approximation of the same objective and lands EM in a far better basin than random starts',
        ],
        evaluation:
          'Verify monotonicity of the log-likelihood across iterations — a decrease is a bug, and a specific one, almost always a missing responsibility normalization or a covariance update taken about the wrong mean. Compare the best of several restarts rather than trusting one run.',
        pitfalls: [
          'Reading monotone improvement as convergence to the global optimum',
          'Chasing an unbounded objective into a degenerate solution because the covariance floor was omitted',
          'Stopping on a fixed iteration count when overlapping components need hundreds of iterations to separate',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'The famous deployed use is background subtraction: fit an independent small mixture to the colour history of each pixel, and classify a new observation as background if it falls under a well-supported component and foreground otherwise. The mixture is what lets a pixel have several legitimate appearances — a swaying branch, a flickering display — without those being flagged as motion.',
        where: [
          'Per-pixel background modelling in fixed-camera surveillance and traffic monitoring, still deployed in embedded systems',
          'Fisher-vector encodings, where a GMM over local descriptors provides the soft vocabulary that a classifier consumes',
          'Skin and colour segmentation with a small mixture in a chosen colour space',
        ],
        why: 'It works here because the per-pixel problem is genuinely low-dimensional — three colour channels — which is precisely the regime where density estimation is reliable, and because the multi-modality is real rather than assumed. It also updates online cheaply, which matters for a model running per pixel per frame. On whole images it is superseded outright: learned features handle the appearance variation that a mixture over raw pixels cannot.',
        featurization: [
          'Work in a colour space where the channels are closer to independent, so a diagonal covariance is defensible and cheap',
          'Keep K small per pixel — three to five — since each pixel has few observations and more components simply memorize them',
          'Use an online update with a learning rate rather than a batch refit, which is what makes the per-pixel cost affordable at frame rate',
        ],
        evaluation:
          'Foreground F-measure against annotated frames, evaluated separately on the hard cases the model exists for — gradual illumination change, repetitive motion, and objects that stop and become background.',
        pitfalls: [
          'A foreground object that stops moving is gradually absorbed into the background model, which is inherent to the online update rather than a bug',
          'Sudden global illumination change invalidating every pixel model at once',
          'Per-pixel independence ignoring spatial structure entirely, so the output needs morphological cleanup to be usable',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Unsupervised segmentation of accounts or transactions into behavioural modes, then either scoring the density directly for novelty or handing the responsibilities to a supervised model as features. The soft assignment matters here: an account that is 50/50 between two behaviour profiles is itself informative, and a hard cluster label discards that.',
        where: [
          'Customer and merchant behavioural segmentation ahead of a supervised fraud model',
          'Novelty detection on account activity where labelled fraud is scarce and delayed',
          'Population-shift monitoring — refit periodically and watch whether the mixing weights move',
        ],
        why: 'Fraud labels arrive late and incomplete, so an unsupervised model of normal behaviour has a genuine role, and legitimate behaviour is multi-modal in a way a single profile cannot capture. The reasons for caution are the usual ones plus a domain-specific one: fraudulent behaviour is often not low-density but rather a legitimate-looking mode of its own, and a mixture fitted on contaminated data will happily give it a component and call it normal.',
        featurization: [
          'Aggregate to account-level behavioural features over a window rather than modelling raw transactions, which are too heavy-tailed for a Gaussian',
          'Transform skewed monetary features toward symmetry before fitting; a Gaussian mixture over untransformed amounts spends every component on the tail',
          'Standardize and reduce dimension, since covariance estimation is what fails first',
        ],
        evaluation:
          'Where labels exist, PR-AUC of the density score at a fixed alert budget on an out-of-time split. Where they do not, evaluate stability: refit on adjacent windows and check that components and mixing weights are recognizably the same, because an unstable segmentation cannot support an operational process.',
        pitfalls: [
          'Contamination giving fraud its own component, after which it is scored as perfectly normal',
          'Label switching breaking any downstream rule that references a component by index',
          'Heavy tails forcing extra components that model outliers rather than structure — a t-distribution mixture is the honest fix',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Cheap and bounded: tens to low hundreds of iterations, each O(n·K·d^2). A mixture over a million points in twenty dimensions fits in seconds to minutes on one core. What costs is the restarts — several initializations are standard, and they multiply the wall time directly.',
    inferenceProfile:
      'K Mahalanobis distances and a log-sum-exp, so O(K·d^2) per point with full covariances, or O(K·d) with diagonal. Microseconds, and the model is small — a handful of means and covariances — which makes it easy to embed and easy to update online.',
    retrainingCadence:
      'Periodic, driven by how fast the population shifts rather than by cost. There is a genuine online variant that updates the sufficient statistics incrementally, which is what makes the per-pixel and streaming uses possible; the batch fit is the one that needs scheduling.',
    driftAndMonitoring: [
      'Track average out-of-sample log-likelihood over time — a steady fall means the density no longer describes the population, and it moves before any downstream metric does',
      'Watch the mixing weights across refits; a component quietly losing all its mass is a structural change worth investigating rather than absorbing',
      'Monitor the smallest covariance eigenvalue per component, which is the early warning of a collapse the floor is about to clamp',
      'Alert if the component count selected by BIC changes on refit, since anything keyed to component identity is about to be wrong',
    ],
    productionGotchas: [
      'Component indices are not stable across refits — label switching is inherent, so downstream systems must key on a canonicalized ordering rather than the raw index',
      'The covariance floor must be persisted with the model and applied identically at scoring time; a model fitted with a floor and scored without one can return infinite densities',
      'Score in log space end to end: densities in high dimensions underflow to exactly zero, and a probability of zero for every component makes the responsibility a division of zero by zero',
      'The feature scaler is part of the model, because both the floor and the fitted covariances are expressed in scaled units',
      'A likelihood threshold calibrated at one K does not transfer to another; changing K silently changes the scale of the score',
    ],
  },

  assumptions: [
    'The data is generated by a finite mixture of Gaussians — an approximation, and a good one for smooth multi-modal densities, a poor one for heavy tails or bounded supports',
    'The number of components is known or selectable; the likelihood cannot choose it, since more components always fit better',
    'Enough points per component to estimate its covariance — a full covariance needs d(d+1)/2 parameters, which is the constraint that fails first as dimension grows',
    'Points are exchangeable: the model has no notion of order, sequence, or spatial adjacency',
    'Components are non-degenerate, which is enforced by a covariance floor rather than guaranteed by the data',
  ],

  pros: [
    {
      point: 'Soft assignment carries information that hard clustering discards',
      context:
        'A point that is 60/40 between two components is described as such, which matters when the assignment feeds a decision. Irrelevant when all anyone consumes is a single cluster label, where k-means is cheaper and simpler.',
    },
    {
      point: 'Clusters may be elongated, tilted, and of different sizes',
      context:
        'The covariance is a fitted parameter, which is exactly what k-means lacks — its spherical equal-variance assumption is why it splits a long cluster in half. The cost is d-squared parameters per component, so the advantage inverts in high dimensions.',
    },
    {
      point: 'The output is a full density, not just an assignment',
      context:
        'One fitted model answers clustering, density estimation, novelty scoring, and sampling. That breadth is why it appears under three different domains here; it is worth nothing if only the labels are used.',
    },
    {
      point: 'EM gives monotone improvement with no step size to tune',
      context:
        'No learning rate, no divergence, and a convergence check that is meaningful. A genuine practical advantage over gradient fitting of the same objective — as long as monotone improvement is not mistaken for a global optimum.',
    },
  ],

  cons: [
    {
      point: 'The likelihood is unbounded, so the objective can be driven to infinity',
      context:
        'A component collapsing onto a single point reports infinite density and a perfect fit. Unlike most failure modes here this one rewards itself, which is why the covariance floor is mandatory rather than defensive.',
    },
    {
      point: 'Non-convex, with results that depend on initialization',
      context:
        'Different seeds give materially different fits, so restarts are part of the method rather than a precaution. It also means reproducibility requires pinning the seed and the initialization scheme, not just the data.',
    },
    {
      point: 'Covariance estimation degrades quickly with dimension',
      context:
        'Full covariances need d(d+1)/2 parameters per component, so beyond a few tens of features the choice is between diagonal covariances — losing the main advantage over k-means — and not using the model.',
    },
    {
      point: 'K must be chosen, and likelihood cannot choose it',
      context:
        'More components always fit better, so selection needs BIC or an external criterion. On real data BIC frequently keeps rising with K, at which point the honest conclusion is that the density is not a small mixture and the model is a description rather than a discovery.',
    },
  ],

  relatedSlugs: ['naive-bayes', 'k-means', 'gaussian-process'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Gaussian mixture by EM - the E and M steps, transcribed.

Diagonal covariances, so each component is an axis-aligned ellipse and the
density is a product of one-dimensional Gaussians. That keeps the arithmetic
visible: no matrix inverse, no determinant, just d scalar terms per component.
"""

import math


def gaussian_density(x, mean, variance):
    """N(x | mean, diag(variance)) as an explicit product over dimensions."""
    density = 1.0
    for j in range(len(x)):
        difference = x[j] - mean[j]
        density *= math.exp(-0.5 * difference * difference / variance[j]) / math.sqrt(
            2.0 * math.pi * variance[j]
        )
    return density


def fit(X, k, iterations=100, floor=1e-6):
    n = len(X)
    d = len(X[0])

    # Initialize: means on the first k points, unit variances, uniform weights.
    weights = [1.0 / k for _ in range(k)]
    means = [list(X[i]) for i in range(k)]
    variances = [[1.0] * d for _ in range(k)]

    for _ in range(iterations):
        # ---- E-step: responsibilities gamma[i][c] -------------------------
        gamma = [[0.0] * k for _ in range(n)]
        for i in range(n):
            total = 0.0
            for c in range(k):
                gamma[i][c] = weights[c] * gaussian_density(X[i], means[c], variances[c])
                total += gamma[i][c]

            # If every component gives this point density zero the posterior is
            # 0/0. In double precision that happens routinely above ~40
            # dimensions, which is what the log-space rewrite later fixes.
            if total == 0.0:
                for c in range(k):
                    gamma[i][c] = 1.0 / k
            else:
                for c in range(k):
                    gamma[i][c] /= total

        # ---- M-step: weighted maximum likelihood --------------------------
        for c in range(k):
            effective_n = 0.0
            for i in range(n):
                effective_n += gamma[i][c]

            weights[c] = effective_n / n

            for j in range(d):
                weighted_sum = 0.0
                for i in range(n):
                    weighted_sum += gamma[i][c] * X[i][j]
                means[c][j] = weighted_sum / effective_n

            for j in range(d):
                weighted_scatter = 0.0
                for i in range(n):
                    difference = X[i][j] - means[c][j]
                    weighted_scatter += gamma[i][c] * difference * difference
                # The floor stops a component collapsing onto one point, where
                # the variance goes to zero and the likelihood to infinity.
                variances[c][j] = max(weighted_scatter / effective_n, floor)

    return weights, means, variances`,
        profile: 'O(iterations * n * k * d) in interpreter loops, and numerically fragile: densities are multiplied in linear space.',
      },
      'make-it-right': {
        code: `"""Gaussian mixture by EM - full covariances, Cholesky, log space."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import solve_triangular

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


@dataclass(frozen=True)
class GaussianMixture:
    """A fitted mixture. Full covariances, so components may be tilted."""

    weights: Vector          # (K,)
    means: Matrix            # (K, d)
    covariances: Tensor      # (K, d, d)
    log_likelihood: float
    converged: bool

    def score_samples(self, X: Matrix) -> Vector:
        """log p(x) per point - the anomaly score, and it stays in log space."""
        return _log_sum_exp(_log_component_densities(X, self), axis=1)

    def predict_proba(self, X: Matrix) -> Matrix:
        log_joint = _log_component_densities(X, self)
        return np.exp(log_joint - _log_sum_exp(log_joint, axis=1)[:, None])


def _log_sum_exp(values: Matrix, axis: int) -> Vector:
    """Factor the max out before exponentiating; the naive version underflows."""
    shift = values.max(axis=axis, keepdims=True)
    return np.squeeze(shift, axis=axis) + np.log(
        np.exp(values - shift).sum(axis=axis)
    )


def _log_component_densities(X: Matrix, model: "GaussianMixture") -> Matrix:
    """(n, K) matrix of log(pi_k) + log N(x | mu_k, Sigma_k)."""
    n_components, dimension = model.means.shape
    out = np.empty((X.shape[0], n_components), dtype=np.float64)

    for component in range(n_components):
        # Cholesky, never an explicit inverse: solving with the triangular
        # factor is both cheaper and far better conditioned, and the
        # log-determinant falls out of its diagonal for free.
        factor = np.linalg.cholesky(model.covariances[component])
        centred = X - model.means[component]
        solved = solve_triangular(factor, centred.T, lower=True)
        mahalanobis = np.einsum("ji,ji->i", solved, solved)
        log_det = 2.0 * np.log(np.diag(factor)).sum()

        out[:, component] = (
            np.log(model.weights[component])
            - 0.5 * (mahalanobis + log_det + dimension * np.log(2.0 * np.pi))
        )

    return out


def fit(
    X: Matrix,
    n_components: int,
    max_iter: int = 200,
    tol: float = 1e-4,
    reg_covar: float = 1e-6,
    seed: int = 0,
) -> GaussianMixture:
    """Fit by EM. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not 1 <= n_components <= X.shape[0]:
        raise ValueError(f"n_components must lie in [1, {X.shape[0]}]")
    if reg_covar <= 0.0:
        raise ValueError("reg_covar must be positive; without it a component can collapse")

    n, dimension = X.shape
    rng = np.random.default_rng(seed)

    weights = np.full(n_components, 1.0 / n_components)
    means = X[rng.choice(n, size=n_components, replace=False)].copy()
    covariances = np.tile(np.cov(X.T) + reg_covar * np.eye(dimension), (n_components, 1, 1))

    previous = -np.inf
    converged = False
    model = GaussianMixture(weights, means, covariances, previous, False)

    for _ in range(max_iter):
        # ---- E-step ------------------------------------------------------
        log_joint = _log_component_densities(X, model)
        log_evidence = _log_sum_exp(log_joint, axis=1)
        responsibilities = np.exp(log_joint - log_evidence[:, None])

        # ---- M-step ------------------------------------------------------
        effective_n = responsibilities.sum(axis=0) + np.finfo(np.float64).eps
        weights = effective_n / n
        means = (responsibilities.T @ X) / effective_n[:, None]

        covariances = np.empty((n_components, dimension, dimension))
        for component in range(n_components):
            centred = X - means[component]
            scatter = (responsibilities[:, component, None] * centred).T @ centred
            covariances[component] = scatter / effective_n[component] + reg_covar * np.eye(
                dimension
            )

        current = float(log_evidence.mean())
        model = GaussianMixture(weights, means, covariances, current, False)

        if abs(current - previous) < tol:
            converged = True
            break
        previous = current

    return GaussianMixture(weights, means, covariances, previous, converged)`,
        rationale:
          'Two changes, and only one of them is about style. The model changes: diagonal variances become full covariance matrices, so a component can be tilted rather than axis-aligned — which is the capability that distinguishes a GMM from k-means, bought at d(d+1)/2 parameters per component. The implementation changes to match: densities are computed in log space with a log-sum-exp that factors out the maximum, because multiplying densities in linear space underflows to exactly zero in double precision above roughly forty dimensions and turns the responsibility into 0/0. And the covariance is used through a Cholesky factor rather than an explicit inverse — the Mahalanobis distance becomes a triangular solve and the log-determinant falls out of the factor’s diagonal, which is cheaper and far better conditioned.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n*K*d^2) per iteration plus O(K*d^3) for the factorizations, executed in LAPACK rather than the interpreter.',
      },
      'make-it-fast': {
        code: `"""Gaussian mixture by EM - cached precisions, batched E-step, in place."""

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import solve_triangular

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


def _cholesky_precisions(covariances: Tensor, reg: float) -> tuple[Tensor, Vector]:
    """Factor every covariance ONCE per iteration, not once per use.

    Stores the inverse Cholesky factor, so the Mahalanobis distance becomes a
    matrix product rather than a triangular solve per batch - the solve is
    done K times per iteration instead of K times per batch.
    """
    n_components, dimension, _ = covariances.shape
    inverse_factors = np.empty_like(covariances)
    log_dets = np.empty(n_components, dtype=np.float64)
    identity = np.eye(dimension)

    for component in range(n_components):
        factor = np.linalg.cholesky(covariances[component] + reg * identity)
        inverse_factors[component] = solve_triangular(factor, identity, lower=True)
        log_dets[component] = -2.0 * np.log(np.diag(factor)).sum()

    return inverse_factors, log_dets


def fit_fast(
    X: Matrix,
    n_components: int,
    max_iter: int = 200,
    tol: float = 1e-4,
    reg_covar: float = 1e-6,
    batch: int = 65_536,
) -> tuple[Vector, Matrix, Tensor]:
    """EM with the two accelerations that matter at scale.

    The responsibility matrix is (n, K) and is the array that actually bounds
    batch size, so the E-step is chunked and the M-step sufficient statistics
    are accumulated across chunks rather than materialized whole.
    """
    design = np.ascontiguousarray(X, dtype=np.float64)
    n, dimension = design.shape

    weights = np.full(n_components, 1.0 / n_components)
    means = np.ascontiguousarray(design[:n_components].copy())
    covariances = np.tile(np.cov(design.T), (n_components, 1, 1))

    log_2pi = dimension * np.log(2.0 * np.pi)
    previous = -np.inf

    # Sufficient statistics, allocated once and reused every iteration.
    stat_n = np.empty(n_components, dtype=np.float64)
    stat_sum = np.empty((n_components, dimension), dtype=np.float64)
    stat_scatter = np.empty((n_components, dimension, dimension), dtype=np.float64)

    for _ in range(max_iter):
        inverse_factors, log_dets = _cholesky_precisions(covariances, reg_covar)
        log_weights = np.log(weights)

        stat_n.fill(0.0)
        stat_sum.fill(0.0)
        stat_scatter.fill(0.0)
        total_log_evidence = 0.0

        for start in range(0, n, batch):
            block = design[start : min(start + batch, n)]
            log_joint = np.empty((block.shape[0], n_components), dtype=np.float64)

            for component in range(n_components):
                # (x - mu) L^-T, one GEMM; the squared row norms are the
                # Mahalanobis distances, fused by einsum without an intermediate.
                whitened = (block - means[component]) @ inverse_factors[component].T
                log_joint[:, component] = log_weights[component] + 0.5 * (
                    log_dets[component] - log_2pi
                ) - 0.5 * np.einsum("ij,ij->i", whitened, whitened)

            shift = log_joint.max(axis=1, keepdims=True)
            np.subtract(log_joint, shift, out=log_joint)
            np.exp(log_joint, out=log_joint)                 # now unnormalized
            normalizer = log_joint.sum(axis=1, keepdims=True)
            total_log_evidence += float((np.log(normalizer) + shift).sum())
            np.divide(log_joint, normalizer, out=log_joint)  # responsibilities

            # Accumulate sufficient statistics; the (n, K) matrix never exists.
            stat_n += log_joint.sum(axis=0)
            stat_sum += log_joint.T @ block
            for component in range(n_components):
                weighted = log_joint[:, component, None] * block
                stat_scatter[component] += weighted.T @ block

        weights = stat_n / n
        means = stat_sum / stat_n[:, None]
        for component in range(n_components):
            outer = np.outer(means[component], means[component])
            covariances[component] = stat_scatter[component] / stat_n[component] - outer

        current = total_log_evidence / n
        if abs(current - previous) < tol:
            break
        previous = current

    return weights, means, covariances`,
        rationale:
          'Three structural changes. The Cholesky factorization moves out of the per-use path and is computed once per component per iteration, with the inverse factor cached so the Mahalanobis distance becomes a GEMM rather than a triangular solve repeated for every batch. The E-step is chunked and the M-step is rewritten to accumulate sufficient statistics across chunks, so the (n, K) responsibility matrix — the array that actually bounds how much data a GMM can see at once — is never materialized whole. And the log-sum-exp normalization runs in place through the same buffer, which removes three full-size temporaries per chunk from the innermost loop.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Whitening by the cached inverse Cholesky factor is a GEMM, and the squared row norms that follow are an einsum reduction that never materializes an intermediate.',
            tradeoff: 'Caching the inverse factor is a step back from the numerically cleanest form — a triangular solve is better conditioned than multiplying by a precomputed inverse — so this trades a little accuracy for a lot of throughput, and is wrong on a near-singular covariance.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Chunking the E-step bounds the responsibility block at (batch, K) instead of (n, K), which is what makes the fit possible on data far larger than that matrix.',
            tradeoff: 'The M-step must be restated in terms of accumulated sufficient statistics, which is a less obvious form and introduces a real numerical hazard — the scatter-minus-outer-product identity loses precision when the mean is large relative to the spread.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Sufficient statistics are allocated once for the whole fit and the log-sum-exp normalization writes back through its own buffer, removing several full-size temporaries per chunk per iteration.',
            tradeoff: 'The same buffer holds log-joint, then unnormalized weights, then responsibilities — three meanings in three lines, which is fast and genuinely harder to read, and reordering those lines corrupts the E-step silently.',
          },
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n*K*d^2) per iteration in BLAS, memory bounded by the chunk. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Gaussian mixture by EM - the E and M steps, transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

// Diagonal covariances: each component is an axis-aligned ellipse, so the
// density is a product of one-dimensional Gaussians and there is no matrix
// inverse or determinant to compute.
double GaussianDensity(const std::vector<double>& x,
                       const std::vector<double>& mean,
                       const std::vector<double>& variance) {
  double density = 1.0;
  for (std::size_t j = 0; j < x.size(); ++j) {
    const double difference = x[j] - mean[j];
    density *= std::exp(-0.5 * difference * difference / variance[j]) /
               std::sqrt(2.0 * M_PI * variance[j]);
  }
  return density;
}

void Fit(const std::vector<std::vector<double>>& X,
         std::size_t k,
         int iterations,
         double floor,
         std::vector<double>& weights,
         std::vector<std::vector<double>>& means,
         std::vector<std::vector<double>>& variances) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();

  weights.assign(k, 1.0 / static_cast<double>(k));
  means.assign(k, std::vector<double>(d, 0.0));
  variances.assign(k, std::vector<double>(d, 1.0));
  for (std::size_t c = 0; c < k; ++c) means[c] = X[c];

  for (int iteration = 0; iteration < iterations; ++iteration) {
    // ---- E-step: responsibilities ----------------------------------------
    std::vector<std::vector<double>> gamma(n, std::vector<double>(k, 0.0));

    for (std::size_t i = 0; i < n; ++i) {
      double total = 0.0;
      for (std::size_t c = 0; c < k; ++c) {
        gamma[i][c] = weights[c] * GaussianDensity(X[i], means[c], variances[c]);
        total += gamma[i][c];
      }

      // Every component giving density zero makes the posterior 0/0, which in
      // double precision happens routinely once d passes roughly forty.
      if (total == 0.0) {
        for (std::size_t c = 0; c < k; ++c) gamma[i][c] = 1.0 / static_cast<double>(k);
      } else {
        for (std::size_t c = 0; c < k; ++c) gamma[i][c] /= total;
      }
    }

    // ---- M-step: weighted maximum likelihood -----------------------------
    for (std::size_t c = 0; c < k; ++c) {
      double effective_n = 0.0;
      for (std::size_t i = 0; i < n; ++i) effective_n += gamma[i][c];
      weights[c] = effective_n / static_cast<double>(n);

      for (std::size_t j = 0; j < d; ++j) {
        double weighted_sum = 0.0;
        for (std::size_t i = 0; i < n; ++i) weighted_sum += gamma[i][c] * X[i][j];
        means[c][j] = weighted_sum / effective_n;
      }

      for (std::size_t j = 0; j < d; ++j) {
        double scatter = 0.0;
        for (std::size_t i = 0; i < n; ++i) {
          const double difference = X[i][j] - means[c][j];
          scatter += gamma[i][c] * difference * difference;
        }
        // The floor is what stops a component collapsing onto one point.
        variances[c][j] = std::max(scatter / effective_n, floor);
      }
    }
  }
}`,
        profile: 'O(iterations * n * k * d), with an (n, k) responsibility matrix reallocated every iteration and densities multiplied in linear space.',
      },
      'make-it-right': {
        code: `// Gaussian mixture by EM - full covariance, Cholesky, log space, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numbers>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

// Lower-triangular Cholesky of an SPD matrix, in place. Preferred to an
// explicit inverse: the triangular solve is better conditioned, and the
// log-determinant falls straight out of the diagonal.
void CholeskyInPlace(std::vector<double>& a, std::size_t d) {
  for (std::size_t j = 0; j < d; ++j) {
    double diagonal = a[j * d + j];
    for (std::size_t k = 0; k < j; ++k) diagonal -= a[j * d + k] * a[j * d + k];
    if (diagonal <= 0.0) {
      throw std::runtime_error("component covariance is not positive definite");
    }
    a[j * d + j] = std::sqrt(diagonal);

    for (std::size_t i = j + 1; i < d; ++i) {
      double value = a[i * d + j];
      for (std::size_t k = 0; k < j; ++k) value -= a[i * d + k] * a[j * d + k];
      a[i * d + j] = value / a[j * d + j];
    }
  }
}

// Solves L z = (x - mu) and returns ||z||^2, the squared Mahalanobis distance.
[[nodiscard]] double SquaredMahalanobis(std::span<const double> factor,
                                        std::span<const double> centred,
                                        std::size_t d,
                                        std::vector<double>& scratch) {
  double total = 0.0;
  for (std::size_t i = 0; i < d; ++i) {
    double value = centred[i];
    for (std::size_t k = 0; k < i; ++k) value -= factor[i * d + k] * scratch[k];
    scratch[i] = value / factor[i * d + i];
    total += scratch[i] * scratch[i];
  }
  return total;
}

}  // namespace

class GaussianMixtureModel {
 public:
  GaussianMixtureModel(std::vector<double> weights, std::vector<double> means,
                       std::vector<double> covariances, std::size_t dimension)
      : weights_(std::move(weights)),
        means_(std::move(means)),
        covariances_(std::move(covariances)),
        dimension_(dimension) {
    if (dimension_ == 0 || weights_.empty()) throw std::invalid_argument("empty model");
    if (means_.size() != weights_.size() * dimension_) {
      throw std::invalid_argument("means do not match the component count");
    }
  }

  [[nodiscard]] std::size_t ComponentCount() const noexcept { return weights_.size(); }
  [[nodiscard]] std::span<const double> weights() const noexcept { return weights_; }

 private:
  std::vector<double> weights_;        // (K,)
  std::vector<double> means_;          // row-major (K, d)
  std::vector<double> covariances_;    // row-major (K, d, d)
  std::size_t dimension_;
};

// x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
GaussianMixtureModel Fit(std::span<const double> x_flat, std::size_t d, std::size_t k,
                         int max_iter, double tol, double reg_covar) {
  if (d == 0 || k == 0) throw std::invalid_argument("empty problem");
  if (x_flat.size() % d != 0) throw std::invalid_argument("X is not a multiple of d");
  if (reg_covar <= 0.0) {
    throw std::invalid_argument("reg_covar must be positive; without it a component collapses");
  }

  const std::size_t n = x_flat.size() / d;
  if (k > n) throw std::invalid_argument("more components than points");

  std::vector<double> weights(k, 1.0 / static_cast<double>(k));
  std::vector<double> means(x_flat.begin(), x_flat.begin() + static_cast<long>(k * d));
  std::vector<double> covariances(k * d * d, 0.0);
  for (std::size_t c = 0; c < k; ++c) {
    for (std::size_t j = 0; j < d; ++j) covariances[c * d * d + j * d + j] = 1.0;
  }

  // All scratch hoisted out of the iteration loop.
  std::vector<double> factors(k * d * d);
  std::vector<double> log_dets(k);
  std::vector<double> log_joint(k);
  std::vector<double> centred(d);
  std::vector<double> solve_scratch(d);
  std::vector<double> stat_n(k), stat_sum(k * d), stat_scatter(k * d * d);

  const double log_2pi = static_cast<double>(d) * std::log(2.0 * std::numbers::pi);
  double previous = -std::numeric_limits<double>::infinity();

  for (int iteration = 0; iteration < max_iter; ++iteration) {
    for (std::size_t c = 0; c < k; ++c) {
      std::copy(covariances.begin() + static_cast<long>(c * d * d),
                covariances.begin() + static_cast<long>((c + 1) * d * d),
                factors.begin() + static_cast<long>(c * d * d));
      for (std::size_t j = 0; j < d; ++j) factors[c * d * d + j * d + j] += reg_covar;

      std::span<double> factor(factors.data() + c * d * d, d * d);
      std::vector<double> owned(factor.begin(), factor.end());
      CholeskyInPlace(owned, d);
      std::copy(owned.begin(), owned.end(), factor.begin());

      double log_det = 0.0;
      for (std::size_t j = 0; j < d; ++j) log_det += std::log(factor[j * d + j]);
      log_dets[c] = 2.0 * log_det;
    }

    std::fill(stat_n.begin(), stat_n.end(), 0.0);
    std::fill(stat_sum.begin(), stat_sum.end(), 0.0);
    std::fill(stat_scatter.begin(), stat_scatter.end(), 0.0);
    double total_log_evidence = 0.0;

    for (std::size_t i = 0; i < n; ++i) {
      const double* point = x_flat.data() + i * d;

      double largest = -std::numeric_limits<double>::infinity();
      for (std::size_t c = 0; c < k; ++c) {
        for (std::size_t j = 0; j < d; ++j) centred[j] = point[j] - means[c * d + j];
        const std::span<const double> factor(factors.data() + c * d * d, d * d);
        const double squared = SquaredMahalanobis(factor, centred, d, solve_scratch);

        // Log space throughout: a density in high dimensions underflows to
        // exactly zero, and then every responsibility is 0/0.
        log_joint[c] = std::log(weights[c]) - 0.5 * (squared + log_dets[c] + log_2pi);
        largest = std::max(largest, log_joint[c]);
      }

      double normalizer = 0.0;
      for (std::size_t c = 0; c < k; ++c) {
        log_joint[c] = std::exp(log_joint[c] - largest);
        normalizer += log_joint[c];
      }
      total_log_evidence += largest + std::log(normalizer);

      for (std::size_t c = 0; c < k; ++c) {
        const double gamma = log_joint[c] / normalizer;
        stat_n[c] += gamma;
        for (std::size_t j = 0; j < d; ++j) {
          stat_sum[c * d + j] += gamma * point[j];
          for (std::size_t l = 0; l <= j; ++l) {
            stat_scatter[c * d * d + j * d + l] += gamma * point[j] * point[l];
          }
        }
      }
    }

    for (std::size_t c = 0; c < k; ++c) {
      weights[c] = stat_n[c] / static_cast<double>(n);
      for (std::size_t j = 0; j < d; ++j) means[c * d + j] = stat_sum[c * d + j] / stat_n[c];
      for (std::size_t j = 0; j < d; ++j) {
        for (std::size_t l = 0; l <= j; ++l) {
          const double value = stat_scatter[c * d * d + j * d + l] / stat_n[c] -
                               means[c * d + j] * means[c * d + l];
          covariances[c * d * d + j * d + l] = value;
          covariances[c * d * d + l * d + j] = value;
        }
      }
    }

    const double current = total_log_evidence / static_cast<double>(n);
    if (std::abs(current - previous) < tol) break;
    previous = current;
  }

  return GaussianMixtureModel(std::move(weights), std::move(means),
                              std::move(covariances), d);
}`,
        rationale:
          'The model gains full covariances, so components may be tilted rather than axis-aligned — and with them the numerical machinery that makes full covariances usable. The covariance is factorized once per component per iteration with a Cholesky and used through a triangular solve, never inverted; the log-determinant is read off the factor’s diagonal rather than computed separately. Densities move into log space with the maximum factored out, which is what stops the responsibilities becoming 0/0 in high dimensions. Structurally, the nested vectors become flat row-major buffers, the (n, K) responsibility matrix disappears in favour of per-point sufficient statistics accumulated in one pass, and every scratch buffer is hoisted out of the iteration loop.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*K*d^2) per iteration plus O(K*d^3) for the factorizations, with all scratch allocated once.',
      },
      'make-it-fast': {
        code: `// Gaussian mixture by EM - Eigen LLT, blocked E-step, OpenMP over points.
#include <Eigen/Cholesky>
#include <Eigen/Dense>
#include <stdexcept>
#include <vector>

// Row-major: a point is one contiguous run, which suits both the whitening
// GEMM and the per-point reduction below.
using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

struct MixtureState {
  Eigen::VectorXd weights;                    // (K,)
  RowMajorMatrix means;                       // (K, d)
  std::vector<Eigen::MatrixXd> covariances;   // K matrices of (d, d)
};

// One EM iteration. Returns the mean log-likelihood before the update.
double EmStep(const RowMajorMatrix& X, MixtureState& state, double reg_covar) {
  const Eigen::Index n = X.rows();
  const Eigen::Index d = X.cols();
  const auto k = static_cast<Eigen::Index>(state.weights.size());

  // Factor each covariance ONCE per iteration and cache the inverse factor,
  // so whitening the whole batch becomes a GEMM instead of n triangular solves.
  std::vector<RowMajorMatrix> inverse_factors(static_cast<std::size_t>(k));
  Eigen::VectorXd log_dets(k);
  const Eigen::MatrixXd identity = Eigen::MatrixXd::Identity(d, d);

  for (Eigen::Index c = 0; c < k; ++c) {
    const Eigen::LLT<Eigen::MatrixXd> llt(
        state.covariances[static_cast<std::size_t>(c)] + reg_covar * identity);
    if (llt.info() != Eigen::Success) {
      throw std::runtime_error("component covariance is not positive definite");
    }
    inverse_factors[static_cast<std::size_t>(c)] =
        llt.matrixL().solve(identity);
    log_dets[c] = -2.0 * llt.matrixL().nestedExpression().diagonal().array().log().sum();
  }

  const double log_2pi = static_cast<double>(d) * std::log(2.0 * M_PI);
  RowMajorMatrix log_joint(n, k);

  for (Eigen::Index c = 0; c < k; ++c) {
    // (X - mu) L^-T in one product; squared row norms are the distances.
    const RowMajorMatrix whitened =
        (X.rowwise() - state.means.row(c)) *
        inverse_factors[static_cast<std::size_t>(c)].transpose();
    log_joint.col(c) = Eigen::VectorXd::Constant(
                           n, std::log(state.weights[c]) + 0.5 * (log_dets[c] - log_2pi)) -
                       0.5 * whitened.rowwise().squaredNorm();
  }

  // Log-sum-exp and responsibilities, one independent row at a time.
  Eigen::VectorXd evidence(n);
#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    const double largest = log_joint.row(i).maxCoeff();
    auto row = log_joint.row(i);
    row = (row.array() - largest).exp();
    const double normalizer = row.sum();
    evidence[i] = largest + std::log(normalizer);
    row /= normalizer;
  }

  // M-step: the sufficient statistics are two matrix products.
  const Eigen::VectorXd effective_n = log_joint.colwise().sum().transpose();
  state.weights = effective_n / static_cast<double>(n);
  state.means = (log_joint.transpose() * X).array().colwise() /
                effective_n.array();

  for (Eigen::Index c = 0; c < k; ++c) {
    const RowMajorMatrix centred = X.rowwise() - state.means.row(c);
    state.covariances[static_cast<std::size_t>(c)] =
        (centred.transpose() * log_joint.col(c).asDiagonal() * centred) / effective_n[c];
  }

  return evidence.mean();
}`,
        rationale:
          'The per-point triangular solve becomes a per-component GEMM: each covariance is factorized once per iteration with Eigen’s LLT and its inverse factor cached, so whitening the entire batch against a component is one matrix product instead of n separate solves. The M-step follows the same move — the weighted sums become products against the responsibility matrix rather than accumulation loops. The log-sum-exp stays a loop, but over independent rows, so it parallelizes with no shared state. What is given up is stated plainly: caching an inverse factor is numerically weaker than solving each time, and it is the wrong trade on a near-singular covariance.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Whitening and both M-step sufficient statistics become GEMMs that Eigen dispatches to blocked kernels, replacing n triangular solves and two accumulation loops per component.',
            tradeoff: 'Materializes the full (n, K) responsibility matrix and an (n, d) whitened block per component, so peak memory grows with the batch — the chunking the previous stage relied on has to be reintroduced by the caller.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The rowwise mean subtraction, the squared-norm reduction and the diagonal-weighted scatter all evaluate as fused expressions rather than through intermediate matrices.',
            tradeoff: 'The scatter expression reads as one line and hides an O(n·d^2) product; an expression bound to auto instead of assigned can also dangle once its operands go out of scope.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each point’s log-sum-exp and normalization depend only on its own row of the joint matrix, so the reduction partitions across cores with no synchronization.',
            tradeoff: 'The loop mutates rows of a shared matrix in place, which is safe only because the partition is by row — a change to the schedule or to what the body touches would introduce a race the compiler will not catch.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n*K*d^2) per iteration in BLAS plus O(K*d^3) factorization. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Gaussian mixture by EM - the E and M steps, transcribed.

use std::f64::consts::PI;

/// N(x | mean, diag(variance)) as an explicit product over dimensions.
fn gaussian_density(x: &[f64], mean: &[f64], variance: &[f64]) -> f64 {
    let mut density = 1.0;
    for j in 0..x.len() {
        let difference = x[j] - mean[j];
        density *= (-0.5 * difference * difference / variance[j]).exp()
            / (2.0 * PI * variance[j]).sqrt();
    }
    density
}

pub fn fit(
    x: &[Vec<f64>],
    k: usize,
    iterations: usize,
    floor: f64,
) -> (Vec<f64>, Vec<Vec<f64>>, Vec<Vec<f64>>) {
    let n = x.len();
    let d = x[0].len();

    let mut weights = vec![1.0 / k as f64; k];
    let mut means: Vec<Vec<f64>> = (0..k).map(|c| x[c].clone()).collect();
    let mut variances = vec![vec![1.0; d]; k];

    for _ in 0..iterations {
        // ---- E-step: responsibilities ------------------------------------
        let mut gamma = vec![vec![0.0; k]; n];

        for i in 0..n {
            let mut total = 0.0;
            for c in 0..k {
                gamma[i][c] = weights[c] * gaussian_density(&x[i], &means[c], &variances[c]);
                total += gamma[i][c];
            }

            // Every component giving density zero makes the posterior 0/0,
            // which in f64 happens routinely once d passes roughly forty.
            if total == 0.0 {
                for c in 0..k {
                    gamma[i][c] = 1.0 / k as f64;
                }
            } else {
                for c in 0..k {
                    gamma[i][c] /= total;
                }
            }
        }

        // ---- M-step: weighted maximum likelihood -------------------------
        for c in 0..k {
            let mut effective_n = 0.0;
            for i in 0..n {
                effective_n += gamma[i][c];
            }
            weights[c] = effective_n / n as f64;

            for j in 0..d {
                let mut weighted_sum = 0.0;
                for i in 0..n {
                    weighted_sum += gamma[i][c] * x[i][j];
                }
                means[c][j] = weighted_sum / effective_n;
            }

            for j in 0..d {
                let mut scatter = 0.0;
                for i in 0..n {
                    let difference = x[i][j] - means[c][j];
                    scatter += gamma[i][c] * difference * difference;
                }
                // The floor stops a component collapsing onto a single point.
                variances[c][j] = (scatter / effective_n).max(floor);
            }
        }
    }

    (weights, means, variances)
}`,
        profile: 'O(iterations * n * k * d), every index bounds-checked, an (n, k) matrix reallocated per iteration, densities multiplied in linear space.',
      },
      'make-it-right': {
        code: `//! Gaussian mixture by EM - full covariance, Cholesky, log space, Result.

use std::f64::consts::PI;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    TooManyComponents { k: usize, n: usize },
    NotPositiveDefinite { component: usize },
    Regularization { value: f64 },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::TooManyComponents { k, n } => {
                write!(f, "{k} components requested for {n} points")
            }
            Self::NotPositiveDefinite { component } => {
                write!(f, "covariance of component {component} is not positive definite")
            }
            Self::Regularization { value } => write!(
                f,
                "reg_covar must be positive, got {value}; without it a component collapses"
            ),
        }
    }
}

impl std::error::Error for FitError {}

/// Covariance floor. A newtype because zero is not merely a poor value here:
/// it permits a component to collapse onto one point and report infinite
/// likelihood, which the optimizer will then happily pursue.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RegCovar(f64);

impl RegCovar {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(FitError::Regularization { value });
        }
        Ok(Self(value))
    }
}

/// Lower-triangular Cholesky in place. Preferred to an explicit inverse: the
/// triangular solve is better conditioned and the log-determinant is free.
fn cholesky(a: &mut [f64], d: usize, component: usize) -> Result<(), FitError> {
    for j in 0..d {
        let mut diagonal = a[j * d + j];
        for k in 0..j {
            diagonal -= a[j * d + k] * a[j * d + k];
        }
        if diagonal <= 0.0 {
            return Err(FitError::NotPositiveDefinite { component });
        }
        a[j * d + j] = diagonal.sqrt();

        for i in (j + 1)..d {
            let mut value = a[i * d + j];
            for k in 0..j {
                value -= a[i * d + k] * a[j * d + k];
            }
            a[i * d + j] = value / a[j * d + j];
        }
    }
    Ok(())
}

/// Solves L z = (x - mu) and returns ||z||^2 - the squared Mahalanobis distance.
#[inline]
fn squared_mahalanobis(factor: &[f64], centred: &[f64], d: usize, scratch: &mut [f64]) -> f64 {
    let mut total = 0.0;
    for i in 0..d {
        let mut value = centred[i];
        for k in 0..i {
            value -= factor[i * d + k] * scratch[k];
        }
        scratch[i] = value / factor[i * d + i];
        total += scratch[i] * scratch[i];
    }
    total
}

pub struct MixtureFit {
    pub weights: Vec<f64>,
    pub means: Vec<f64>,          // row-major (K, d)
    pub covariances: Vec<f64>,    // row-major (K, d, d)
    pub log_likelihood: f64,
    pub converged: bool,
}

/// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
pub fn fit(
    x_flat: &[f64],
    d: usize,
    k: usize,
    max_iter: usize,
    tol: f64,
    reg_covar: RegCovar,
) -> Result<MixtureFit, FitError> {
    if d == 0 || x_flat.is_empty() {
        return Err(FitError::Empty);
    }
    if x_flat.len() % d != 0 {
        return Err(FitError::ShapeMismatch {
            expected: (x_flat.len() / d + 1) * d,
            found: x_flat.len(),
        });
    }

    let n = x_flat.len() / d;
    if k == 0 || k > n {
        return Err(FitError::TooManyComponents { k, n });
    }

    let mut weights = vec![1.0 / k as f64; k];
    let mut means: Vec<f64> = x_flat[..k * d].to_vec();
    let mut covariances = vec![0.0_f64; k * d * d];
    for c in 0..k {
        for j in 0..d {
            covariances[c * d * d + j * d + j] = 1.0;
        }
    }

    // Scratch hoisted out of the iteration loop.
    let mut factors = vec![0.0_f64; k * d * d];
    let mut log_dets = vec![0.0_f64; k];
    let mut log_joint = vec![0.0_f64; k];
    let mut centred = vec![0.0_f64; d];
    let mut solve_scratch = vec![0.0_f64; d];
    let mut stat_n = vec![0.0_f64; k];
    let mut stat_sum = vec![0.0_f64; k * d];
    let mut stat_scatter = vec![0.0_f64; k * d * d];

    let log_2pi = d as f64 * (2.0 * PI).ln();
    let mut previous = f64::NEG_INFINITY;
    let mut converged = false;

    for _ in 0..max_iter {
        for c in 0..k {
            let source = &covariances[c * d * d..(c + 1) * d * d];
            let target = &mut factors[c * d * d..(c + 1) * d * d];
            target.copy_from_slice(source);
            for j in 0..d {
                target[j * d + j] += reg_covar.0;
            }
            cholesky(target, d, c)?;
            log_dets[c] = 2.0 * (0..d).map(|j| target[j * d + j].ln()).sum::<f64>();
        }

        stat_n.fill(0.0);
        stat_sum.fill(0.0);
        stat_scatter.fill(0.0);
        let mut total_log_evidence = 0.0_f64;

        for point in x_flat.chunks_exact(d) {
            let mut largest = f64::NEG_INFINITY;
            for c in 0..k {
                for (slot, (value, mean)) in centred
                    .iter_mut()
                    .zip(point.iter().zip(&means[c * d..(c + 1) * d]))
                {
                    *slot = value - mean;
                }
                let squared = squared_mahalanobis(
                    &factors[c * d * d..(c + 1) * d * d],
                    &centred,
                    d,
                    &mut solve_scratch,
                );
                // Log space: a density in high dimensions underflows to zero.
                log_joint[c] = weights[c].ln() - 0.5 * (squared + log_dets[c] + log_2pi);
                largest = largest.max(log_joint[c]);
            }

            let mut normalizer = 0.0;
            for value in &mut log_joint {
                *value = (*value - largest).exp();
                normalizer += *value;
            }
            total_log_evidence += largest + normalizer.ln();

            for c in 0..k {
                let gamma = log_joint[c] / normalizer;
                stat_n[c] += gamma;
                for j in 0..d {
                    stat_sum[c * d + j] += gamma * point[j];
                    for l in 0..=j {
                        stat_scatter[c * d * d + j * d + l] += gamma * point[j] * point[l];
                    }
                }
            }
        }

        for c in 0..k {
            weights[c] = stat_n[c] / n as f64;
            for j in 0..d {
                means[c * d + j] = stat_sum[c * d + j] / stat_n[c];
            }
            for j in 0..d {
                for l in 0..=j {
                    let value = stat_scatter[c * d * d + j * d + l] / stat_n[c]
                        - means[c * d + j] * means[c * d + l];
                    covariances[c * d * d + j * d + l] = value;
                    covariances[c * d * d + l * d + j] = value;
                }
            }
        }

        let current = total_log_evidence / n as f64;
        if (current - previous).abs() < tol {
            converged = true;
            previous = current;
            break;
        }
        previous = current;
    }

    Ok(MixtureFit {
        weights,
        means,
        covariances,
        log_likelihood: previous,
        converged,
    })
}
`,
        rationale:
          'The model gains full covariances and, with them, the numerics required to use them: a Cholesky factorization per component instead of an inverse, a triangular solve for the Mahalanobis distance, and a log-determinant read off the factor diagonal. Densities move to log space with the maximum factored out, which is what stops the responsibility becoming 0/0 in high dimensions — the previous stage papered over that with a uniform fallback. Errors become a typed Result covering the non-positive-definite case the naive version divided straight through, reg_covar gets a validated newtype because zero permits the collapse the optimizer will then chase, and the nested Vecs become flat row-major buffers walked with chunks_exact so bounds checks leave the inner loops.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*K*d^2) per iteration plus O(K*d^3) factorization, with all scratch allocated once and no (n, K) matrix.',
      },
      'make-it-fast': {
        code: `//! Gaussian mixture by EM - parallel E-step with per-thread statistics.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

const LOG_2PI: f64 = 1.837_877_066_409_345_6;

/// Per-thread sufficient statistics. The E-step is a sum over points, so the
/// statistics are the accumulator of a fold-then-reduce - each worker keeps a
/// private copy and they merge by addition, with nothing shared or locked.
#[derive(Clone)]
struct Statistics {
    n: Array1<f64>,
    sum: Array2<f64>,
    scatter: Vec<Array2<f64>>,
    log_evidence: f64,
}

impl Statistics {
    fn zeros(k: usize, d: usize) -> Self {
        Self {
            n: Array1::zeros(k),
            sum: Array2::zeros((k, d)),
            scatter: (0..k).map(|_| Array2::zeros((d, d))).collect(),
            log_evidence: 0.0,
        }
    }

    fn merge(mut self, other: Self) -> Self {
        self.n += &other.n;
        self.sum += &other.sum;
        for (a, b) in self.scatter.iter_mut().zip(other.scatter) {
            *a += &b;
        }
        self.log_evidence += other.log_evidence;
        self
    }
}

/// One EM iteration over a row-major design matrix.
///
/// \`inverse_factors[c]\` is the inverse Cholesky factor of component c's
/// covariance, computed once per iteration by the caller: whitening a point is
/// then a single matrix-vector product rather than a triangular solve.
#[must_use]
pub fn em_step(
    x: ArrayView2<f64>,
    weights: &Array1<f64>,
    means: &Array2<f64>,
    inverse_factors: &[Array2<f64>],
    log_dets: &Array1<f64>,
) -> (Array1<f64>, Array2<f64>, Vec<Array2<f64>>, f64) {
    let n = x.nrows();
    let d = x.ncols();
    let k = weights.len();

    let statistics = x
        .axis_iter(Axis(0))
        .into_par_iter()
        .fold(
            || Statistics::zeros(k, d),
            |mut acc, point| {
                let mut log_joint = Vec::with_capacity(k);
                let mut largest = f64::NEG_INFINITY;

                for c in 0..k {
                    let centred = &point - &means.row(c);
                    let whitened = inverse_factors[c].dot(&centred);
                    let squared = whitened.dot(&whitened);
                    let value =
                        weights[c].ln() + 0.5 * (log_dets[c] - d as f64 * LOG_2PI)
                            - 0.5 * squared;
                    largest = largest.max(value);
                    log_joint.push(value);
                }

                let mut normalizer = 0.0;
                for value in &mut log_joint {
                    *value = (*value - largest).exp();
                    normalizer += *value;
                }
                acc.log_evidence += largest + normalizer.ln();

                for c in 0..k {
                    let gamma = log_joint[c] / normalizer;
                    acc.n[c] += gamma;
                    for j in 0..d {
                        acc.sum[[c, j]] += gamma * point[j];
                        for l in 0..=j {
                            acc.scatter[c][[j, l]] += gamma * point[j] * point[l];
                        }
                    }
                }

                acc
            },
        )
        .reduce(|| Statistics::zeros(k, d), Statistics::merge);

    let new_weights = &statistics.n / n as f64;
    let mut new_means = Array2::<f64>::zeros((k, d));
    for c in 0..k {
        new_means
            .row_mut(c)
            .assign(&(&statistics.sum.row(c) / statistics.n[c]));
    }

    let mut new_covariances = Vec::with_capacity(k);
    for c in 0..k {
        let mut covariance = &statistics.scatter[c] / statistics.n[c];
        for j in 0..d {
            for l in 0..=j {
                let value = covariance[[j, l]] - new_means[[c, j]] * new_means[[c, l]];
                covariance[[j, l]] = value;
                covariance[[l, j]] = value;
            }
        }
        new_covariances.push(covariance);
    }

    (
        new_weights,
        new_means,
        new_covariances,
        statistics.log_evidence / n as f64,
    )
}
`,
        rationale:
          'The E-step is a sum over independent points, which makes it a fold-then-reduce: each worker accumulates a private set of sufficient statistics over its own chunk and the statistics merge by addition at the end, so there is no shared mutable state and no synchronization in the hot loop. The Cholesky factorization also moves out of the per-point path entirely — the caller factors each covariance once per iteration and passes the inverse factors in, so whitening becomes a matrix-vector product. The (n, K) responsibility matrix never exists, which is what makes the memory cost independent of the sample count.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The E-step is an associative sum over points, so fold-then-reduce gives every worker a private accumulator and merges once — no locking, no atomics, and it scales with cores.',
            tradeoff: 'Each worker holds K d-by-d scatter matrices, so memory grows with core count times d squared; on wide data that becomes the binding constraint rather than the arithmetic.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Whitening a point against a cached inverse Cholesky factor is a matrix-vector product dispatched to BLAS instead of a hand-written triangular solve per point per component.',
            tradeoff: 'Binds the build to a system BLAS, and the cached inverse factor is numerically weaker than solving each time — the wrong trade when a covariance is close to singular.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The per-point log-joint buffer and the per-iteration covariance list are allocated at their exact final length, so neither grows and copies inside the loop.',
            tradeoff: 'The log-joint buffer is still allocated once per point rather than reused across the chunk; removing that entirely would need a thread-local arena and a good deal more machinery.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'O(n*K*d^2 / cores) per iteration, memory independent of n. Illustrative, not a measured benchmark.',
      },
    },
  },
};
