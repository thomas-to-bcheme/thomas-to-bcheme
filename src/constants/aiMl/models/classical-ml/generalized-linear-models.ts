import type { AiMlModel } from '../../types';

/**
 * Generalized Linear Models — the generalization that contains OLS and logistic
 * regression as special cases.
 *
 * Placed last in the linear-models group because it is the rung that makes the
 * earlier entries retrospectively legible: linear regression is a GLM with an
 * identity link and constant variance, logistic regression is one with a logit
 * link and Bernoulli variance. The code progression is built around IRLS, which
 * is the point worth carrying away — every iteration is a weighted least-squares
 * fit, so a GLM needs no solver you do not already have.
 */
export const GENERALIZED_LINEAR_MODELS: AiMlModel = {
  slug: 'generalized-linear-models',
  name: 'Generalized Linear Models',
  aliases: ['GLM', 'Poisson regression', 'Gamma regression', 'Tweedie regression', 'IRLS'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'model',

  paradigms: ['supervised'],
  // 'density-estimation' because a GLM fits the CONDITIONAL distribution of y
  // given x, not merely its mean — that is the whole difference from OLS with a
  // transformed target. 'anomaly-detection' via deviance residuals, see
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'classification', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Density estimation here is conditional, not marginal: the model returns a full predictive distribution for y at a given x (Poisson, Gamma, binomial), which is what makes tail questions answerable. It does not model the distribution of x.',

  intuition:
    'Linear regression assumes what you are predicting is a real number with constant-variance noise. Counts are not: they cannot go negative, and a count with a mean of 100 is genuinely noisier than one with a mean of 2. A GLM keeps the linear predictor — a weighted sum of features — and changes two things around it. A link function maps that sum onto the range the response actually lives in, and a variance function states how the noise grows with the mean. Choose identity link and constant variance and you have recovered OLS; choose logit and mu(1-mu) and you have logistic regression; choose log and mu and you have Poisson regression. It is one algorithm with the distributional assumption written down instead of assumed away.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\ell(\\beta) = \\sum_{i=1}^{n} \\frac{y_i \\theta_i - b(\\theta_i)}{\\phi} + c(y_i, \\phi), \\qquad g(\\mu_i) = \\mathbf{x}_i^{\\top}\\beta, \\quad \\mu_i = b^{\\prime}(\\theta_i)',
      symbols: [
        { symbol: '\\theta_i', meaning: 'natural parameter of the exponential family for example i' },
        { symbol: 'b(\\theta)', meaning: 'the log-partition function — differentiate once for the mean, twice for the variance' },
        { symbol: '\\phi', meaning: 'dispersion parameter; fixed at 1 for Poisson and binomial, estimated for Gaussian and Gamma' },
        { symbol: 'g', meaning: 'the link function, mapping the mean onto the whole real line where the linear predictor lives' },
        { symbol: '\\mu_i', meaning: 'the conditional mean of y given x — what the model actually predicts' },
      ],
    },
    reading:
      'Maximize the probability the model assigns to the data that was actually observed, under a distribution chosen to match the response. The entire exponential family is described by one function, b: its first derivative is the mean, its second is the variance. That is why choosing a family is not only a choice of shape — it fixes the mean-variance relationship too, and that relationship is the assumption that does the work.',
  },

  optimization: {
    method: 'Iteratively reweighted least squares (Fisher scoring)',
    updateRule: {
      formula:
        '\\beta^{(t+1)} = (X^{\\top} W X)^{-1} X^{\\top} W z, \\qquad z_i = \\eta_i + (y_i - \\mu_i)\\, g^{\\prime}(\\mu_i), \\quad w_i = \\frac{1}{V(\\mu_i)\\, g^{\\prime}(\\mu_i)^2}',
      symbols: [
        { symbol: 'z_i', meaning: 'the working response — a locally linearized target that ordinary least squares can fit' },
        { symbol: 'w_i', meaning: 'the IRLS weight: observations the family says are noisier at their fitted mean count for less' },
        { symbol: '\\eta_i', meaning: 'the linear predictor x-transpose-beta, before the inverse link is applied' },
        { symbol: 'V(\\mu)', meaning: 'the variance function fixed by the family — mu for Poisson, mu(1-mu) for binomial, mu^2 for Gamma' },
      ],
    },
    rationale:
      'Under a canonical link the log-likelihood is concave, so Newton’s method is safe — and the Hessian equals the Fisher information, which makes Newton and Fisher scoring the same update. That update then collapses into a weighted least-squares solve. This is the whole trick and it is worth stating plainly: every iteration of a GLM fit is an OLS fit on a working response with weights, so no new solver is needed, only the one you already have, in a loop. Gradient descent also works and is what you use when the data does not fit in memory, but it gives up quadratic convergence for nothing when it does.',
    hyperparameters: [
      { name: 'family and link', role: 'The modelling decision, not a tunable. Family fixes the mean-variance relationship; link fixes the scale on which effects are additive' },
      { name: 'offset', role: 'A fixed known term in the linear predictor — log exposure, log time at risk — which is what turns a count model into a rate model' },
      { name: 'dispersion (phi)', role: 'Fixed at 1 for Poisson and binomial, estimated for Gaussian, Gamma, quasi-families. Getting it wrong corrupts every standard error', typicalRange: 'estimated as Pearson chi-square over residual degrees of freedom' },
      { name: 'max iterations / tolerance', role: 'IRLS stopping rule, usually on the relative change in deviance', typicalRange: '25 iterations, tol 1e-8; a fit that needs more is a fit worth investigating' },
      { name: 'ridge penalty (optional)', role: 'Added to the weighted normal equations to keep IRLS finite under separation or collinearity' },
    ],
    convergence:
      'Typically four to eight iterations to machine precision, quadratic near the optimum, and with a canonical link the problem is concave so there is a unique maximum. Two failure modes deserve names. Complete separation in a binomial GLM: when some feature perfectly splits the classes the maximum likelihood estimate is infinite, and IRLS marches obligingly toward it — coefficients and standard errors both explode while the in-sample fit looks perfect. Second, a non-canonical link (probit, and especially log-binomial) loses the concavity guarantee, and log-binomial regression regularly fails to converge because the fitted probability wants to exceed one. Step-halving is the standard remedy for both, and a fit that needed many halvings should be reported rather than quietly accepted.',
    complexity:
      'O(nd^2 + d^3) per iteration and a handful of iterations, so the cost of a GLM is a few OLS fits. Memory is O(nd), or O(d^2) if X-transpose-W-X is accumulated in a streaming pass over the data, which is how GLMs are fit on data larger than memory.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Count and rate series are the natural case: a Poisson or negative-binomial GLM with a log link, lag features, Fourier seasonality, and — critically — an offset for exposure, so what is modelled is a rate rather than a raw count. The log link makes multiplicative seasonality additive on the linear predictor, which is why a GLM often fits a seasonal count series cleanly where OLS on the identical features fits it badly.',
        where: [
          'Call-centre and support-ticket arrival forecasting, where the response is a count and capacity planning needs the tail',
          'Insurance claim frequency by period, with exposure varying across periods',
          'Low-volume retail unit sales, where a Gaussian model cheerfully forecasts negative demand',
          'Incident and failure counts in reliability monitoring',
        ],
        why: 'Because it forecasts a distribution rather than a point. A capacity plan needs the probability of exceeding a threshold, and a Poisson GLM answers that directly, where a squared-error model gives a mean plus a standard error premised on symmetric noise the data does not have. It is the wrong choice when the autocorrelation structure itself carries the signal: a GLM assumes observations are independent given the features, so anything the lags do not capture is unmodelled.',
        featurization: [
          'Log exposure as an offset, so periods of unequal length or unequal population are comparable',
          'Lagged counts and rolling rates, entered on the log scale to match the link',
          'Fourier terms for seasonality rather than one dummy per period',
          'An explicit overdispersion check — variance materially above the mean means negative binomial or quasi-Poisson, not Poisson',
        ],
        evaluation:
          'Rolling-origin backtesting scored with a proper scoring rule for counts — Poisson deviance or CRPS — rather than RMSE, which rewards the mean and ignores whether the shape is right. PIT histograms to check the calibration of the whole predictive distribution, since that distribution is the reason to use this model at all.',
        pitfalls: [
          'Fitting Poisson to overdispersed data: the point forecasts survive, the intervals become fiction, and everything downstream that consumes them inherits false confidence',
          'Omitting the exposure offset, so a longer month reads as a demand increase',
          'Residual autocorrelation, which leaves the means usable and the standard errors wrong',
          'Zero-inflation treated as overdispersion — structurally different, and a negative binomial will not fix it',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit the GLM to normal behaviour and score deviance or Pearson residuals. What makes this better than OLS residuals is the variance function: it normalizes each residual by how much variation the family says to expect at that fitted mean, so five events where one was expected scores as extreme while a hundred and five where a hundred was expected does not.',
        where: [
          'Count-based telemetry monitoring — errors per minute, retries per host, rejects per batch',
          'Claim-rate and billing-rate outlier detection in insurance and healthcare, where base rates vary hugely by provider',
          'Surveillance where the expected rate varies across segments by orders of magnitude',
        ],
        why: 'A fixed standard-deviation threshold on raw counts fails precisely where the mean varies across segments, because one global sigma is wrong nearly everywhere. A GLM makes the expected variance a function of the fitted mean, so a single cutoff in standardized-deviance units becomes comparable across segments — which is what makes one alerting rule serve a heterogeneous fleet. It remains a parametric model of normality: for anomalies that are structural rather than magnitude-based, a tree-based or reconstruction-based detector is the honest answer.',
        featurization: [
          'Offset for exposure, so rates rather than counts are being compared',
          'Segment and calendar features, so the baseline is conditional rather than global',
          'Fit on a confirmed-clean window and persist the fitted coefficients as the definition of normal',
        ],
        evaluation:
          'Precision@k against confirmed incidents, thresholding on standardized deviance residuals. Before trusting a fixed cutoff, check that the residual distribution on clean data is actually close to standard — if it is not, the family is wrong and the threshold is arbitrary.',
        pitfalls: [
          'Overdispersion makes every segment look anomalous, the detector fires constantly, and it gets muted — which is worse than not having it',
          'Zero-inflation misread as an anomaly signal when it is a property of the data-generating process',
          'A contaminated training window raises the fitted baseline until the anomaly is inside normal',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Two connections, both genuine. The fit itself is a smooth concave maximization solved by Newton’s method, and IRLS is the textbook case where the Newton step has a closed form — it is the cleanest bridge from least squares to general convex optimization. Downstream, GLM outputs are routinely the objective coefficients another optimizer consumes: an expected-cost or expected-demand surface handed to a pricing or allocation program.',
        where: [
          'Insurance rate-making, where a frequency-times-severity GLM produces the cost surface a constrained pricing optimizer works from',
          'Capacity planning driven by predicted arrival rates rather than predicted counts',
          'Price and bid elasticity surfaces fed into a revenue optimizer',
        ],
        why: 'What makes it the estimator of choice upstream of an optimizer is the shape of its output, not its accuracy: a log-link GLM produces coefficients that are multiplicative relativities, which is exactly the structure rating and pricing systems already encode. A more accurate black-box predictor that cannot be expressed as a rating table often cannot be deployed there at all — the constraint is the interface, and this model matches it.',
        featurization: [
          'Encode decision-relevant variables as main effects whose relativities a planner can read directly',
          'Keep the offset, so the optimizer consumes rates rather than counts',
          'Credibility-weight or group sparse levels before they become coefficients an optimizer can exploit',
        ],
        evaluation:
          'For the fit: compare the IRLS solution against a general-purpose convex solver on the same likelihood — agreement to tolerance is the correctness check. For the deployment: evaluate the decision rather than the fit, since realized cost under the optimizer’s plan is the only number that settles it.',
        pitfalls: [
          'Optimizing against a fitted surface outside the range where it was estimated — a log link extrapolates exponentially, so a modest extrapolation becomes a large error',
          'Sparse levels producing extreme relativities that the optimizer will find and exploit before any human notices',
          'Treating an unconverged IRLS fit as a solution because the coefficients look plausible',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'The actuarial standard: model claim frequency with a Poisson GLM and claim severity with a Gamma GLM, both on a log link, and multiply — or fit a Tweedie GLM to pure premium directly. The coefficients become multiplicative relativities in a rating table, which is not a summary of the deployed artefact but literally is the deployed artefact.',
        where: [
          'Personal-lines insurance pricing and reserving',
          'Probability-of-default modelling as a binomial GLM inside credit risk',
          'Healthcare cost modelling with Gamma or Tweedie responses',
          'Fraud rate modelling where exposure varies enormously across merchants',
        ],
        why: 'The deliverable is a rating table a regulator will review, and a log-link GLM produces one directly. The multiplicative structure also matches how risk behaves — a young driver and a high-value vehicle compound rather than add — and the family choice matches the response, since claim amounts are non-negative and right-skewed, which Gamma models and a Gaussian does not. Boosting usually wins on raw accuracy and still loses this decision.',
        featurization: [
          'Log exposure as an offset on the frequency model',
          'Cap or separately price large losses, which otherwise dominate a Gamma severity fit',
          'Credibility-weighted or grouped encodings for sparse levels, so a rare category cannot produce an extreme relativity',
          'Explicit interaction terms — a GLM will not discover them, and in rating they are often where the money is',
        ],
        evaluation:
          'Out-of-time deviance and lift charts by decile, plus actual-versus-expected by every rating factor individually. That last check is the one that catches a mis-specified interaction, which any aggregate metric will happily average away.',
        pitfalls: [
          'Fitting frequency and severity on different exposure bases and multiplying them anyway',
          'Overdispersed frequency giving false confidence in the intervals a pricing committee reads',
          'Extrapolating a relativity to a level that barely appeared in training data',
        ],
      },
      'causal-inference': {
        fit: 'viable',
        how: 'The outcome model in most adjustment-based designs is a GLM, and the link is chosen to match the estimand: a logit link yields odds ratios, a log link risk ratios, an identity link risk differences. That is not a cosmetic choice — it determines which quantity is being held constant across subgroups, and therefore what "no interaction" even means.',
        where: [
          'Propensity score models, where a binomial GLM is the default first stage',
          'Risk-ratio estimation in epidemiology via log-binomial regression, or Poisson with robust standard errors',
          'Regression adjustment of a randomized experiment with a binary or count outcome',
        ],
        why: 'It is the model where the estimand and the link are the same decision, which forces the reporting to be explicit. Where it goes wrong is non-collapsibility: a conditional odds ratio from a logistic GLM is not the marginal odds ratio, so adding a covariate shifts the coefficient even when that covariate is not a confounder — a subtlety that has generated a large and confused literature.',
        featurization: [
          'Include the covariates the identification argument requires, not the ones that improve fit',
          'Interaction terms where effect heterogeneity is the actual question',
          'Never adjust for post-treatment variables, regardless of how much they improve the model',
        ],
        evaluation:
          'Covariate balance diagnostics rather than fit statistics for a propensity model; placebo outcomes and negative controls for the outcome model; robust or cluster-robust standard errors wherever the variance assumption is doing real work.',
        pitfalls: [
          'Reading a conditional odds ratio as a marginal effect',
          'Poisson regression on a binary outcome without robust standard errors — the point estimate is fine and the interval is not',
          'Separation in the propensity model producing fitted probabilities at zero or one, and therefore unbounded inverse-probability weights',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A handful of IRLS iterations over the data — seconds for a million rows and a few hundred columns on one core. The expensive part of a GLM project is never the fit; it is the family and link decision and the actual-versus-expected review that follows it.',
    inferenceProfile:
      'A dot product and one scalar function call for the inverse link. Sub-microsecond, and expressible as a rating table or a SQL expression — which in pricing and underwriting is frequently the real deployment target rather than a served model.',
    retrainingCadence:
      'Quarterly to annually in regulated pricing, where changing a coefficient is a filed change with a review cycle attached; nightly or weekly in operational forecasting. Cheap either way, so the cadence is a governance decision rather than a compute one.',
    driftAndMonitoring: [
      'Actual-versus-expected by every factor, refreshed on new data — aggregate deviance can be perfectly stable while two factors drift in opposite directions',
      'Dispersion: if the observed variance-to-mean ratio moves away from what the family assumes, the intervals are wrong before the means are',
      'Coefficient and relativity stability across refits; on a rating factor a sign flip is a governance event, not a metric wobble',
      'Share of predictions pressed against the boundary of the link range — probabilities at zero or one, means at zero — which is the early signature of separation',
    ],
    productionGotchas: [
      'The offset must be carried into inference; dropping it silently converts a rate model into a count model and the error scales with exposure',
      'Unseen categorical levels have no relativity, so the fallback must be an explicit documented base level rather than a crash or an implicit zero',
      'A log link exponentiates, so an extrapolated linear predictor produces an enormous mean rather than a merely wrong one — clamp the linear predictor, not the output',
      'A log-link GLM gives E[y|x] directly, unlike log-transformed OLS which needs a smearing correction; teams that learned the correction on the latter routinely apply it to the former and introduce a bias that was not there',
    ],
  },

  assumptions: [
    'The response follows the chosen exponential-family distribution — which fixes the mean-variance relationship, and that is the assumption that actually binds',
    'The link is correct: g(mu) is linear in the parameters, so effects are additive on the link scale and multiplicative on the response scale for a log link',
    'Observations are independent given the features — violated by clustered and serially correlated data, which needs GEE, mixed effects, or robust standard errors',
    'The dispersion is what the family claims. For Poisson and binomial that is a testable claim fixed at 1, and it is routinely false',
    'Features are not near-collinear, and no feature perfectly separates a binary response',
  ],

  pros: [
    {
      point: 'One framework covers regression, classification, counts, rates, and skewed positive responses',
      context:
        'The practical value is that moving from a Gaussian to a Poisson response is a two-line change and all the inference machinery follows automatically. Worth little if you only ever fit one family — then it is just that model with extra vocabulary attached.',
    },
    {
      point: 'Coefficients land on a scale practitioners already use',
      context:
        'A log link gives multiplicative relativities, a logit link gives odds ratios. Decisive in insurance pricing and epidemiology, where the coefficient is the deliverable. Irrelevant when only the ranking is consumed.',
    },
    {
      point: 'Models the full conditional distribution, not just the mean',
      context:
        'This is what lets you answer "what is the probability demand exceeds capacity" instead of "what is expected demand". It is only as good as the family assumption — a wrong variance function gives confidently wrong intervals, which is worse than no intervals.',
    },
    {
      point: 'Converges in a handful of iterations with convexity guarantees under a canonical link',
      context:
        'No learning rate, no seed, reproducible fits — which matters far more in an audited pipeline than a point of AUC, and is a large part of why GLMs remain the deployed model in regulated domains.',
    },
  ],

  cons: [
    {
      point: 'The family and link are assumptions you must make, and a wrong variance function corrupts every interval',
      context:
        'Overdispersion is the common case: point estimates survive, intervals shrink to fiction, and no standard accuracy metric detects it. If nobody checked the dispersion, the intervals should not be quoted.',
    },
    {
      point: 'Still linear in the parameters — no interactions or curvature unless you write them in',
      context:
        'The same ceiling as OLS, and the reason GAMs and boosting exist. A GLM is the right choice when the linear structure is what makes it deployable, not when it is what makes it accurate.',
    },
    {
      point: 'Separation in a binomial GLM has no finite maximum likelihood solution',
      context:
        'A perfectly predictive feature sends the estimate to infinity while the in-sample fit looks flawless. Firth-penalized likelihood is the fix, and this arises far more often than expected in small or heavily imbalanced samples.',
    },
    {
      point: 'Assumes independence, which time-series and clustered data violate by default',
      context:
        'The means usually survive and the standard errors do not — the dangerous combination, because the model looks right and the confidence intervals are quietly too narrow.',
    },
  ],

  relatedSlugs: ['linear-regression', 'logistic-regression', 'ridge-lasso'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Poisson GLM by iteratively reweighted least squares - the math, transcribed.

Every IRLS step is a weighted least-squares fit to the working response
z = eta + (y - mu) * g'(mu), with weights w = 1 / (V(mu) * g'(mu)^2). For a log
link on Poisson data, g'(mu) = 1/mu and V(mu) = mu, so the weight is simply mu
and the working response is eta + (y - mu) / mu.
"""

import math


def solve(matrix_a, vector_b):
    """Gaussian elimination with partial pivoting - the d x d system per step."""
    d = len(vector_b)
    augmented = [list(row) + [vector_b[i]] for i, row in enumerate(matrix_a)]

    for column in range(d):
        pivot = column
        for row in range(column + 1, d):
            if abs(augmented[row][column]) > abs(augmented[pivot][column]):
                pivot = row
        if abs(augmented[pivot][column]) < 1e-12:
            raise ValueError("singular system: features are collinear")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]

        for row in range(column + 1, d):
            factor = augmented[row][column] / augmented[column][column]
            for k in range(column, d + 1):
                augmented[row][k] -= factor * augmented[column][k]

    solution = [0.0] * d
    for row in reversed(range(d)):
        acc = augmented[row][d]
        for k in range(row + 1, d):
            acc -= augmented[row][k] * solution[k]
        solution[row] = acc / augmented[row][row]
    return solution


def fit(X, y, steps=25):
    n = len(X)
    d = len(X[0])
    beta = [0.0] * d

    for _ in range(steps):
        # Accumulate X^T W X and X^T W z one observation at a time.
        hessian = [[0.0] * d for _ in range(d)]
        rhs = [0.0] * d

        for i in range(n):
            eta = 0.0
            for j in range(d):
                eta += X[i][j] * beta[j]

            mu = math.exp(eta)                 # inverse link
            weight = mu                        # 1 / (V(mu) * g'(mu)^2) = mu
            working = eta + (y[i] - mu) / mu   # z_i

            for j in range(d):
                rhs[j] += weight * X[i][j] * working
                for k in range(d):
                    hessian[j][k] += weight * X[i][j] * X[i][k]

        beta = solve(hessian, rhs)

    return beta`,
        profile: 'O(steps * n * d^2) to accumulate plus an O(d^3) elimination per step, all in interpreter loops.',
      },
      'make-it-right': {
        code: `"""Generalized linear models by IRLS - typed, family-parameterized, validated."""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

_MU_FLOOR = 1e-10


@dataclass(frozen=True)
class Family:
    """An exponential-family member, defined by exactly what IRLS needs of it.

    Everything separating Poisson from binomial from Gamma regression lives in
    these three functions. The fitting loop below never changes.
    """

    name: str
    inverse_link: Callable[[Vector], Vector]
    link_derivative: Callable[[Vector], Vector]    # g'(mu)
    variance: Callable[[Vector], Vector]           # V(mu)


POISSON_LOG = Family(
    name="poisson(log)",
    inverse_link=np.exp,
    link_derivative=lambda mu: 1.0 / mu,
    variance=lambda mu: mu,
)

BINOMIAL_LOGIT = Family(
    name="binomial(logit)",
    inverse_link=lambda eta: 1.0 / (1.0 + np.exp(-eta)),
    link_derivative=lambda mu: 1.0 / (mu * (1.0 - mu)),
    variance=lambda mu: mu * (1.0 - mu),
)


@dataclass(frozen=True)
class GlmModel:
    coefficients: Vector
    family: Family
    iterations: int
    converged: bool

    def predict(self, X: Matrix) -> Vector:
        """Returns the conditional mean, not the linear predictor."""
        if X.ndim != 2 or X.shape[1] != self.coefficients.size:
            raise ValueError(
                f"expected (n, {self.coefficients.size}) design matrix, got {X.shape}"
            )
        return self.family.inverse_link(X @ self.coefficients)


def fit(
    X: Matrix,
    y: Vector,
    family: Family = POISSON_LOG,
    offset: Vector | None = None,
    max_iter: int = 25,
    tol: float = 1e-8,
) -> GlmModel:
    """Fit by Fisher scoring. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if offset is not None and offset.shape != y.shape:
        raise ValueError(f"offset must match y, got {offset.shape} vs {y.shape}")

    # None, not np.zeros(...): a mutable default argument would be shared
    # across every call to this function.
    baseline = np.zeros_like(y) if offset is None else offset

    beta = np.zeros(X.shape[1], dtype=np.float64)
    converged = False
    iteration = 0

    for iteration in range(1, max_iter + 1):
        eta = X @ beta + baseline
        mu = np.clip(family.inverse_link(eta), _MU_FLOOR, None)
        g_prime = family.link_derivative(mu)

        weights = 1.0 / (family.variance(mu) * g_prime * g_prime)
        working = eta - baseline + (y - mu) * g_prime

        weighted = X * weights[:, None]
        beta_next = np.linalg.solve(X.T @ weighted, weighted.T @ working)

        if np.max(np.abs(beta_next - beta)) < tol:
            beta = beta_next
            converged = True
            break
        beta = beta_next

    return GlmModel(
        coefficients=beta,
        family=family,
        iterations=iteration,
        converged=converged,
    )`,
        rationale:
          'The family stops being hard-coded Poisson arithmetic scattered through the loop and becomes a frozen dataclass of three functions, so switching to binomial or Gamma changes an argument rather than the algorithm — which is the actual claim GLMs make, now expressed in the types. The hand-rolled elimination is replaced by a single solve on the vectorized weighted normal equations, the offset is threaded through properly (defaulting to None rather than a shared mutable array), and the returned model records whether IRLS actually converged instead of leaving the caller to assume it did.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'No mutable default arguments',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*d^2 + d^3) per iteration, executed in BLAS/LAPACK rather than the interpreter.',
      },
      'make-it-fast': {
        code: `"""GLM by IRLS - QR on the whitened design, reused buffers, no normal equations."""

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

_MU_FLOOR = 1e-10


def fit_fast(
    X: Matrix,
    y: Vector,
    inverse_link: Callable[[Vector], Vector],
    link_derivative: Callable[[Vector], Vector],
    variance: Callable[[Vector], Vector],
    max_iter: int = 25,
    tol: float = 1e-8,
) -> Vector:
    """Same fixed point, different linear algebra.

    Forming X^T W X squares the condition number of the design and throws away
    roughly half the available precision. Solving the equivalent least-squares
    problem min ||sqrt(W) (X beta - z)|| by QR does not. This is not a
    micro-optimization: on a Poisson fit the weights ARE the fitted means, so a
    response spanning several orders of magnitude puts several orders of
    magnitude into W - which is exactly the case where the normal equations
    lose the fit and the factorization keeps it.
    """
    design = np.ascontiguousarray(X, dtype=np.float64)
    target = np.ascontiguousarray(y, dtype=np.float64)
    n, d = design.shape
    beta = np.zeros(d, dtype=np.float64)

    # Buffers allocated once and overwritten in place on every iteration.
    eta = np.empty(n, dtype=np.float64)
    whitened = np.empty_like(design)
    working = np.empty(n, dtype=np.float64)

    for _ in range(max_iter):
        np.matmul(design, beta, out=eta)
        mu = np.clip(inverse_link(eta), _MU_FLOOR, None)
        g_prime = link_derivative(mu)

        # sqrt of the IRLS weight, kept in root form so W is never materialized.
        root_w = 1.0 / np.sqrt(variance(mu) * g_prime * g_prime)

        np.subtract(y, mu, out=working)
        np.multiply(working, g_prime, out=working)
        np.add(working, eta, out=working)              # z = eta + (y - mu) g'(mu)

        np.multiply(design, root_w[:, None], out=whitened)
        beta_next, *_ = np.linalg.lstsq(whitened, root_w * working, rcond=None)

        if np.max(np.abs(beta_next - beta)) < tol:
            return beta_next
        beta = beta_next

    return beta`,
        rationale:
          'The solve changes from the weighted normal equations to a QR factorization of the whitened design. The answer is the same in exact arithmetic and materially different in floating point, because forming X-transpose-W-X squares the condition number — and in a GLM the weights are functions of the fitted means, so an ill-conditioned W is the normal situation rather than an edge case. The rest is allocation discipline: the per-iteration temporaries are hoisted into buffers rewritten in place, so a twenty-five-iteration fit allocates once instead of a hundred times.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'lstsq factorizes sqrt(W) X directly instead of forming X^T W X, which squares the condition number — the difference shows up precisely when the IRLS weights span orders of magnitude, which on a log link they routinely do.',
            tradeoff: 'QR costs roughly twice the flops of the normal equations and needs the full n x d whitened matrix resident, so on very tall well-conditioned data the normal equations are the faster correct answer.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'eta, the whitened design, and the working response are written into reused buffers, so a 25-iteration fit performs one round of allocation rather than one per iteration per temporary.',
            tradeoff: 'The function is no longer reentrant over its buffers and the in-place chain is order-dependent — a reordered line silently corrupts the working response rather than failing.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'ascontiguousarray with an explicit float64 lets LAPACK operate on the arrays directly, and the row-wise scaling by root_w walks memory sequentially.',
            tradeoff: 'Copies the input when the caller passed Fortran-ordered or float32 data, which doubles peak memory for the duration of the fit.',
          },
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*d^2) per iteration for the QR, four to eight iterations typical. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Poisson GLM by iteratively reweighted least squares - the math, transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <utility>
#include <vector>

// Gaussian elimination with partial pivoting on the d x d weighted system.
std::vector<double> Solve(std::vector<std::vector<double>> a,
                          std::vector<double> b) {
  const std::size_t d = b.size();

  for (std::size_t column = 0; column < d; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < d; ++row) {
      if (std::abs(a[row][column]) > std::abs(a[pivot][column])) pivot = row;
    }
    std::swap(a[column], a[pivot]);
    std::swap(b[column], b[pivot]);

    for (std::size_t row = column + 1; row < d; ++row) {
      const double factor = a[row][column] / a[column][column];
      for (std::size_t k = column; k < d; ++k) {
        a[row][k] -= factor * a[column][k];
      }
      b[row] -= factor * b[column];
    }
  }

  std::vector<double> solution(d, 0.0);
  for (std::size_t step = 0; step < d; ++step) {
    const std::size_t row = d - 1 - step;
    double acc = b[row];
    for (std::size_t k = row + 1; k < d; ++k) {
      acc -= a[row][k] * solution[k];
    }
    solution[row] = acc / a[row][row];
  }
  return solution;
}

std::vector<double> Fit(const std::vector<std::vector<double>>& X,
                        const std::vector<double>& y,
                        int steps) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> beta(d, 0.0);

  for (int step = 0; step < steps; ++step) {
    std::vector<std::vector<double>> hessian(d, std::vector<double>(d, 0.0));
    std::vector<double> rhs(d, 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      double eta = 0.0;
      for (std::size_t j = 0; j < d; ++j) {
        eta += X[i][j] * beta[j];
      }

      const double mu = std::exp(eta);              // inverse link
      const double weight = mu;                     // 1 / (V(mu) * g'(mu)^2)
      const double working = eta + (y[i] - mu) / mu;  // z_i

      for (std::size_t j = 0; j < d; ++j) {
        rhs[j] += weight * X[i][j] * working;
        for (std::size_t k = 0; k < d; ++k) {
          hessian[j][k] += weight * X[i][j] * X[i][k];
        }
      }
    }

    beta = Solve(hessian, rhs);
  }

  return beta;
}`,
        profile: 'O(steps * n * d^2) accumulation plus O(d^3) elimination, on a nested vector that scatters every row across the heap.',
      },
      'make-it-right': {
        code: `// GLM by IRLS - RAII, const-correct, family injected, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <span>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

// Everything that distinguishes one GLM from another, and nothing else.
struct Family {
  std::string name;
  std::function<double(double)> inverse_link;
  std::function<double(double)> link_derivative;   // g'(mu)
  std::function<double(double)> variance;          // V(mu)
};

[[nodiscard]] inline Family PoissonLog() {
  return Family{"poisson(log)",
                [](double eta) { return std::exp(eta); },
                [](double mu) { return 1.0 / mu; },
                [](double mu) { return mu; }};
}

class GlmModel {
 public:
  GlmModel(std::vector<double> coefficients, Family family, int iterations,
           bool converged)
      : coefficients_(std::move(coefficients)),
        family_(std::move(family)),
        iterations_(iterations),
        converged_(converged) {}

  [[nodiscard]] double Predict(std::span<const double> row) const {
    if (row.size() != coefficients_.size()) {
      throw std::invalid_argument("row width does not match model width");
    }
    double eta = 0.0;
    for (std::size_t j = 0; j < coefficients_.size(); ++j) {
      eta += coefficients_[j] * row[j];
    }
    return family_.inverse_link(eta);
  }

  [[nodiscard]] bool converged() const noexcept { return converged_; }
  [[nodiscard]] int iterations() const noexcept { return iterations_; }

 private:
  std::vector<double> coefficients_;   // owned; rule of zero handles the rest
  Family family_;
  int iterations_;
  bool converged_;
};

namespace {

constexpr double kMuFloor = 1e-10;

// Cholesky solve of a symmetric positive-definite system, in place.
// X^T W X is SPD by construction with positive weights, so there is no reason
// to pay for general elimination with pivoting here.
void SolveSpd(std::vector<double>& a, std::vector<double>& b, std::size_t d) {
  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t k = 0; k < j; ++k) a[j * d + j] -= a[j * d + k] * a[j * d + k];
    if (a[j * d + j] <= 0.0) throw std::runtime_error("weighted design is singular");
    a[j * d + j] = std::sqrt(a[j * d + j]);

    for (std::size_t i = j + 1; i < d; ++i) {
      for (std::size_t k = 0; k < j; ++k) a[i * d + j] -= a[i * d + k] * a[j * d + k];
      a[i * d + j] /= a[j * d + j];
    }
  }

  for (std::size_t i = 0; i < d; ++i) {
    for (std::size_t k = 0; k < i; ++k) b[i] -= a[i * d + k] * b[k];
    b[i] /= a[i * d + i];
  }
  for (std::size_t step = 0; step < d; ++step) {
    const std::size_t i = d - 1 - step;
    for (std::size_t k = i + 1; k < d; ++k) b[i] -= a[k * d + i] * b[k];
    b[i] /= a[i * d + i];
  }
}

}  // namespace

// x_flat is row-major: element (i, j) lives at x_flat[i * d + j].
GlmModel Fit(std::span<const double> x_flat,
             std::span<const double> y,
             const Family& family,
             std::size_t d,
             int max_iter,
             double tol) {
  if (d == 0 || y.empty()) throw std::invalid_argument("empty problem");
  if (x_flat.size() != y.size() * d) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const std::size_t n = y.size();
  std::vector<double> beta(d, 0.0);
  std::vector<double> gram(d * d);      // hoisted out of the iteration loop
  std::vector<double> rhs(d);
  bool converged = false;
  int iteration = 0;

  for (iteration = 1; iteration <= max_iter; ++iteration) {
    std::fill(gram.begin(), gram.end(), 0.0);
    std::fill(rhs.begin(), rhs.end(), 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      const double* row = x_flat.data() + i * d;
      double eta = 0.0;
      for (std::size_t j = 0; j < d; ++j) eta += row[j] * beta[j];

      const double mu = std::max(family.inverse_link(eta), kMuFloor);
      const double slope = family.link_derivative(mu);
      const double weight = 1.0 / (family.variance(mu) * slope * slope);
      const double working = eta + (y[i] - mu) * slope;

      for (std::size_t j = 0; j < d; ++j) {
        rhs[j] += weight * row[j] * working;
        for (std::size_t k = 0; k <= j; ++k) {   // lower triangle only
          gram[j * d + k] += weight * row[j] * row[k];
        }
      }
    }

    std::vector<double> next = rhs;
    SolveSpd(gram, next, d);

    double largest_step = 0.0;
    for (std::size_t j = 0; j < d; ++j) {
      largest_step = std::max(largest_step, std::abs(next[j] - beta[j]));
    }
    beta = std::move(next);
    if (largest_step < tol) {
      converged = true;
      break;
    }
  }

  return GlmModel(std::move(beta), family, iteration, converged);
}`,
        rationale:
          'Three structural changes. The family becomes an injected value rather than exp() hard-coded into the loop, so one Fit serves Poisson, binomial and Gamma. The nested vectors become flat row-major buffers hoisted out of the iteration loop, removing an O(d^2) allocation per IRLS step and making every inner walk contiguous. And general Gaussian elimination is replaced by a Cholesky factorization with only the lower triangle accumulated — X-transpose-W-X is symmetric positive definite by construction with positive weights, so pivoting was paying for a generality this problem does not have.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d^2/2 + d^3/3) per iteration, constant allocations across the whole fit.',
      },
      'make-it-fast': {
        code: `// GLM by IRLS - Eigen, QR on the whitened design, no normal equations.
#include <Eigen/Dense>
#include <stdexcept>

struct FamilyOps {
  // Vectorized over the whole sample: each takes and returns a column.
  Eigen::VectorXd (*inverse_link)(const Eigen::VectorXd&);
  Eigen::VectorXd (*link_derivative)(const Eigen::VectorXd&);
  Eigen::VectorXd (*variance)(const Eigen::VectorXd&);
};

// Solves the GLM likelihood by Fisher scoring, one QR factorization per step.
//
// The whitened design sqrt(W) X is factorized directly rather than forming
// X^T W X. In a GLM the weights are functions of the fitted means, so on a log
// link they routinely span several orders of magnitude - squaring that
// condition number is how an otherwise fine fit turns into noise.
Eigen::VectorXd FitFast(const Eigen::MatrixXd& X,
                        const Eigen::VectorXd& y,
                        const FamilyOps& family,
                        int max_iter,
                        double tol) {
  if (X.rows() != y.size()) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  constexpr double kMuFloor = 1e-10;
  Eigen::VectorXd beta = Eigen::VectorXd::Zero(X.cols());
  Eigen::MatrixXd whitened(X.rows(), X.cols());

  for (int iteration = 0; iteration < max_iter; ++iteration) {
    const Eigen::VectorXd eta = X * beta;
    const Eigen::VectorXd mu = family.inverse_link(eta).cwiseMax(kMuFloor);
    const Eigen::VectorXd slope = family.link_derivative(mu);

    // root_w = 1 / sqrt(V(mu) * g'(mu)^2); W itself is never materialized.
    const Eigen::VectorXd root_w =
        (family.variance(mu).array() * slope.array().square())
            .rsqrt()
            .matrix();

    const Eigen::VectorXd working =
        eta.array() + (y - mu).array() * slope.array();

    whitened.noalias() = root_w.asDiagonal() * X;
    const Eigen::VectorXd next =
        whitened.householderQr().solve(root_w.cwiseProduct(working));

    if ((next - beta).cwiseAbs().maxCoeff() < tol) return next;
    beta = next;
  }

  return beta;
}`,
        rationale:
          'The per-observation accumulation loop disappears entirely: weights, working response and whitened design are whole-vector Eigen expressions that compile to blocked vectorized kernels. More importantly the solve changes shape — a QR factorization of sqrt(W) X replaces the Cholesky factorization of X-transpose-W-X, trading roughly a factor of two in flops for not squaring the condition number, which in a GLM is the difference that decides whether an extreme-weight fit is usable.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The weight, working-response and whitened-design expressions fuse into single passes, and noalias() on the assignment tells Eigen it may write straight into the destination instead of through a temporary.',
            tradeoff: 'noalias() is an assertion the compiler cannot check — if the destination ever aliases an operand the result is silently wrong, which is a worse failure than being slow.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The QR factorization and the diagonal-times-matrix product are dispatched to blocked kernels that keep panels in cache, which is where essentially all of the speedup over the hand-written accumulation lives.',
            tradeoff: 'Only pays above a size threshold; for a handful of columns the dispatch overhead makes the explicit triangular accumulation faster.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen depends on the compiler to vectorize its kernels, so an unoptimized build of this is no faster than the hand-written loops it replaced.',
            tradeoff: '-march=native emits instructions that may not exist on an older machine in the same fleet, turning a performance choice into a portability bug.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*d^2) per iteration for the QR, four to eight iterations typical. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Poisson GLM by iteratively reweighted least squares - the math, transcribed.

/// Gaussian elimination with partial pivoting on the d x d weighted system.
fn solve(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Vec<f64> {
    let d = b.len();

    for column in 0..d {
        let mut pivot = column;
        for row in (column + 1)..d {
            if a[row][column].abs() > a[pivot][column].abs() {
                pivot = row;
            }
        }
        a.swap(column, pivot);
        b.swap(column, pivot);

        for row in (column + 1)..d {
            let factor = a[row][column] / a[column][column];
            for k in column..d {
                a[row][k] -= factor * a[column][k];
            }
            b[row] -= factor * b[column];
        }
    }

    let mut solution = vec![0.0; d];
    for step in 0..d {
        let row = d - 1 - step;
        let mut acc = b[row];
        for k in (row + 1)..d {
            acc -= a[row][k] * solution[k];
        }
        solution[row] = acc / a[row][row];
    }
    solution
}

pub fn fit(x: &[Vec<f64>], y: &[f64], steps: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut beta = vec![0.0; d];

    for _ in 0..steps {
        let mut hessian = vec![vec![0.0; d]; d];
        let mut rhs = vec![0.0; d];

        for i in 0..n {
            let mut eta = 0.0;
            for j in 0..d {
                eta += x[i][j] * beta[j];
            }

            let mu = eta.exp();                     // inverse link
            let weight = mu;                        // 1 / (V(mu) * g'(mu)^2)
            let working = eta + (y[i] - mu) / mu;   // z_i

            for j in 0..d {
                rhs[j] += weight * x[i][j] * working;
                for k in 0..d {
                    hessian[j][k] += weight * x[i][j] * x[i][k];
                }
            }
        }

        beta = solve(hessian, rhs);
    }

    beta
}`,
        profile: 'O(steps * n * d^2) accumulation plus O(d^3) elimination, every index bounds-checked, rows scattered across the heap.',
      },
      'make-it-right': {
        code: `//! GLM by IRLS - a Family trait, typed errors, borrowed slices.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Singular,
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Singular => write!(f, "weighted design is singular or separated"),
        }
    }
}

impl std::error::Error for FitError {}

/// Exactly what IRLS needs from a distribution, and nothing more. Implementing
/// this is the entire cost of adding a new family.
pub trait Family {
    fn inverse_link(&self, eta: f64) -> f64;
    /// g'(mu)
    fn link_derivative(&self, mu: f64) -> f64;
    /// V(mu)
    fn variance(&self, mu: f64) -> f64;
}

pub struct PoissonLog;

impl Family for PoissonLog {
    fn inverse_link(&self, eta: f64) -> f64 {
        eta.exp()
    }
    fn link_derivative(&self, mu: f64) -> f64 {
        1.0 / mu
    }
    fn variance(&self, mu: f64) -> f64 {
        mu
    }
}

const MU_FLOOR: f64 = 1e-10;

/// Cholesky solve of the symmetric positive-definite weighted system, in place.
fn solve_spd(a: &mut [f64], b: &mut [f64], d: usize) -> Result<(), FitError> {
    for j in 0..d {
        let mut diagonal = a[j * d + j];
        for k in 0..j {
            diagonal -= a[j * d + k] * a[j * d + k];
        }
        if diagonal <= 0.0 {
            return Err(FitError::Singular);
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

    for i in 0..d {
        let mut value = b[i];
        for k in 0..i {
            value -= a[i * d + k] * b[k];
        }
        b[i] = value / a[i * d + i];
    }
    for step in 0..d {
        let i = d - 1 - step;
        let mut value = b[i];
        for k in (i + 1)..d {
            value -= a[k * d + i] * b[k];
        }
        b[i] = value / a[i * d + i];
    }
    Ok(())
}

pub struct GlmFit {
    pub coefficients: Vec<f64>,
    pub iterations: usize,
    pub converged: bool,
}

/// x_flat is row-major: element (i, j) lives at x_flat[i * d + j].
pub fn fit<F: Family>(
    x_flat: &[f64],
    y: &[f64],
    family: &F,
    d: usize,
    max_iter: usize,
    tol: f64,
) -> Result<GlmFit, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x_flat.len() != y.len() * d {
        return Err(FitError::ShapeMismatch {
            expected: y.len() * d,
            found: x_flat.len(),
        });
    }

    let mut beta = vec![0.0_f64; d];
    let mut gram = vec![0.0_f64; d * d];      // hoisted out of the iteration loop
    let mut rhs = vec![0.0_f64; d];
    let mut iterations = 0;

    for iteration in 1..=max_iter {
        iterations = iteration;
        gram.fill(0.0);
        rhs.fill(0.0);

        for (row, &target) in x_flat.chunks_exact(d).zip(y) {
            let eta: f64 = row.iter().zip(&beta).map(|(v, b)| v * b).sum();
            let mu = family.inverse_link(eta).max(MU_FLOOR);
            let slope = family.link_derivative(mu);
            let weight = 1.0 / (family.variance(mu) * slope * slope);
            let working = eta + (target - mu) * slope;

            for (j, &value) in row.iter().enumerate() {
                rhs[j] += weight * value * working;
                for (k, &other) in row.iter().take(j + 1).enumerate() {
                    gram[j * d + k] += weight * value * other;   // lower triangle
                }
            }
        }

        let mut next = rhs.clone();
        solve_spd(&mut gram, &mut next, d)?;

        let largest_step = next
            .iter()
            .zip(&beta)
            .map(|(a, b)| (a - b).abs())
            .fold(0.0_f64, f64::max);
        beta = next;

        if largest_step < tol {
            return Ok(GlmFit { coefficients: beta, iterations, converged: true });
        }
    }

    Ok(GlmFit { coefficients: beta, iterations, converged: false })
}`,
        rationale:
          'The family becomes a trait rather than exp() written into the loop, so adding Gamma or binomial is an impl block and the solver is untouched — and because it is a generic bound rather than a boxed closure, the calls still inline. Errors become a typed Result the caller has to handle, including the singular/separated case that the previous version would have divided straight through. The nested Vec becomes one flat row-major buffer walked with chunks_exact, and general elimination becomes a Cholesky factorization over the lower triangle only, which is what the symmetry of X-transpose-W-X was already offering for free.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d^2/2 + d^3/3) per iteration, allocations hoisted out of the iteration loop.',
      },
      'make-it-fast': {
        code: `//! GLM by IRLS - parallel weighted accumulation, BLAS-backed solve.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis};
use ndarray_linalg::LeastSquaresSvd;
use rayon::prelude::*;

const MU_FLOOR: f64 = 1e-10;

/// One IRLS step's worth of per-observation quantities.
struct WorkingStep {
    root_weight: Array1<f64>,
    working: Array1<f64>,
}

/// Builds the whitened least-squares problem for the current beta.
///
/// The per-observation map is embarrassingly parallel - every row's weight and
/// working response depend only on that row - so it fans out across cores. The
/// solve that follows does not, and is left to a BLAS-backed factorization.
fn working_step(
    eta: ArrayView1<f64>,
    y: ArrayView1<f64>,
    inverse_link: impl Fn(f64) -> f64 + Sync,
    link_derivative: impl Fn(f64) -> f64 + Sync,
    variance: impl Fn(f64) -> f64 + Sync,
) -> WorkingStep {
    let n = eta.len();
    let mut root_weight = Vec::with_capacity(n);
    let mut working = Vec::with_capacity(n);

    let pairs: Vec<(f64, f64)> = (0..n)
        .into_par_iter()
        .map(|i| {
            let mu = inverse_link(eta[i]).max(MU_FLOOR);
            let slope = link_derivative(mu);
            let root_w = 1.0 / (variance(mu) * slope * slope).sqrt();
            (root_w, eta[i] + (y[i] - mu) * slope)
        })
        .collect();

    for (root_w, z) in pairs {
        root_weight.push(root_w);
        working.push(z);
    }

    WorkingStep {
        root_weight: Array1::from(root_weight),
        working: Array1::from(working),
    }
}

/// Fisher scoring with a QR/SVD solve on the whitened design.
pub fn fit_fast(
    x: ArrayView2<f64>,
    y: ArrayView1<f64>,
    inverse_link: impl Fn(f64) -> f64 + Sync + Copy,
    link_derivative: impl Fn(f64) -> f64 + Sync + Copy,
    variance: impl Fn(f64) -> f64 + Sync + Copy,
    max_iter: usize,
    tol: f64,
) -> Array1<f64> {
    let mut beta = Array1::<f64>::zeros(x.ncols());
    let mut whitened = Array2::<f64>::zeros(x.raw_dim());

    for _ in 0..max_iter {
        let eta = x.dot(&beta);
        let step = working_step(eta.view(), y, inverse_link, link_derivative, variance);

        // whitened = diag(root_w) X, written into a buffer allocated once.
        for (mut target, (source, root_w)) in whitened
            .axis_iter_mut(Axis(0))
            .zip(x.axis_iter(Axis(0)).zip(step.root_weight.iter()))
        {
            target.assign(&(&source * *root_w));
        }

        let rhs = &step.working * &step.root_weight;
        let next = whitened
            .least_squares(&rhs)
            .expect("whitened design is rank-deficient")
            .solution;

        let largest_step = (&next - &beta).iter().fold(0.0_f64, |acc, v| acc.max(v.abs()));
        beta = next;
        if largest_step < tol {
            break;
        }
    }

    beta
}`,
        rationale:
          'Two changes with different justifications. The per-observation weight and working-response computation is a pure map over rows, so it moves to rayon and scales with cores; the solve deliberately does not, because a factorization is not a map and hand-parallelizing it would lose to a BLAS-backed one. The solve itself switches from the hand-written Cholesky on X-transpose-W-X to a least-squares factorization of the whitened design, which is the same numerical argument made in the other two languages: never square a condition number that the IRLS weights have already stretched.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each observation\'s weight and working response depend only on that observation, so the whole per-row map partitions across cores with no shared mutable state.',
            tradeoff: 'Work-stealing overhead dominates below a few thousand rows, and the parallel map materializes an intermediate Vec of pairs that the sequential version would not need.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'x.dot(&beta) and the least-squares factorization dispatch to LAPACK rather than to hand-written loops, which is where the per-iteration cost actually lives.',
            tradeoff: 'Binds the build to a system BLAS/LAPACK, which is a real deployment cost — a static, dependency-free binary is no longer possible.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The weight and working-response buffers are allocated at their exact final length before the map, so no reallocation happens while filling them.',
            tradeoff: 'Requires knowing n up front, which rules out streaming the design matrix from disk without a first counting pass.',
          },
        ],
        libraryName: 'ndarray + ndarray-linalg + rayon',
        profile: 'O(n*d/cores) for the weighted map, O(n*d^2) for the solve, four to eight iterations typical. Illustrative, not a measured benchmark.',
      },
    },
  },
};
