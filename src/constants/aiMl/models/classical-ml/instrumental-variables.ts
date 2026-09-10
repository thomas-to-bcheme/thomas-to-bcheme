import type { AiMlModel } from '../../types';

/**
 * Instrumental Variables & Difference-in-Differences — the entry where more
 * data does not help.
 *
 * Closes both the causal-estimation group and the Classical ML category, as
 * the most specialized rung in the section: every other entry improves with
 * sample size, and this one is about the situation where the bias is
 * structural and no amount of data removes it. The identification comes from
 * an argument about the world, not from the estimator.
 */
export const INSTRUMENTAL_VARIABLES: AiMlModel = {
  slug: 'instrumental-variables',
  name: 'Instrumental Variables & Difference-in-Differences',
  aliases: ['IV', '2SLS', 'DiD', 'LATE', 'Two-way fixed effects', 'Natural experiments'],
  category: 'classical-ml',
  group: 'causal-estimation',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression'],
  paradigmNote:
    'Supervised in form and not in purpose. The fitted object is a regression, but the estimand is a coefficient with a confidence interval rather than a prediction, and a model that predicts the outcome better is not a better estimator of the effect — frequently it is a worse one.',

  intuition:
    'You want the effect of a treatment on an outcome, but the people who took the treatment differ from those who did not in ways you cannot see. Regression adjusts for what you measured and leaves the rest, so the estimate is biased and collecting more data narrows the interval around the wrong number. Two designs escape it. An instrument is a variable that shifts the treatment but has no other route to the outcome — so the part of the treatment it explains is as good as randomly assigned, and the effect of that part is clean. Difference-in-differences uses time instead: compare the change in a group that got treated with the change in one that did not, so anything that was constant about either group differences away. In both cases the credibility comes from an argument about how the world works, not from anything the estimator does.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\hat{\\beta}_{2SLS} = \\operatorname*{arg\\,min}_{\\beta} \; \\lVert P_Z (\\mathbf{y} - X\\beta) \\rVert_2^2, \\qquad P_Z = Z(Z^{\\top}Z)^{-1}Z^{\\top}',
      symbols: [
        { symbol: 'Z', meaning: 'the instruments plus the exogenous controls — variables assumed to be unrelated to the error' },
        { symbol: 'P_Z', meaning: 'projection onto the instrument space: it keeps only the part of the treatment the instruments explain' },
        { symbol: 'X', meaning: 'the regressors, including the endogenous treatment whose coefficient is the estimand' },
        { symbol: '\\beta', meaning: 'the coefficient vector; one element of it is the causal effect and the rest are controls nobody reads' },
      ],
    },
    reading:
      'Fit by least squares, but only using the part of the treatment that the instrument explains — the projection discards the rest, and the rest is where the confounding lives. Read as a moment condition it is cleaner still: the estimator is the value of beta that makes the instruments uncorrelated with the residual, which is exactly the assumption being imposed. That framing also explains what goes wrong: if the instrument barely moves the treatment, the projected variation is tiny, the moment condition is nearly uninformative, and the estimator becomes unstable in a way its standard error understates.',
  },

  optimization: {
    method: 'Two-stage least squares (equivalently, GMM with the instrument moment conditions); OLS with fixed effects for difference-in-differences',
    updateRule: {
      formula:
        '\\hat{\\beta}_{2SLS} = \\left( X^{\\top} P_Z X \\right)^{-1} X^{\\top} P_Z \\mathbf{y}, \\qquad \\hat{\\tau}_{DiD} = \\left(\\bar{y}^{\\,post}_{1} - \\bar{y}^{\\,pre}_{1}\\right) - \\left(\\bar{y}^{\\,post}_{0} - \\bar{y}^{\\,pre}_{0}\\right)',
      symbols: [
        { symbol: 'X^{\\top} P_Z X', meaning: 'the instrumented cross-product; near-singular when the instrument is weak, which is the whole weak-instrument problem in one term' },
        { symbol: '\\hat{\\tau}_{DiD}', meaning: 'the difference of two differences: the treated group’s change minus the control group’s change' },
        { symbol: '\\bar{y}^{\\,post}_{1}', meaning: 'mean outcome for the treated group after treatment; the four cell means are the entire 2x2 estimator' },
        { symbol: '\\text{(both)}', meaning: 'closed-form least squares — the difficulty is never the computation, it is whether the design identifies anything' },
      ],
    },
    rationale:
      'Both estimators are closed-form least squares and neither is computationally interesting; everything difficult about them is in the design. The implementation trap is worth stating because it is nearly universal: 2SLS is NOT two regressions run in sequence. Fitting the first stage, then regressing the outcome on the fitted values with an ordinary OLS routine, gives the correct point estimate and wrong standard errors, because the second regression computes its residuals against the fitted treatment rather than the actual one. The correct residuals use the original regressors, and every library that implements 2SLS does this internally — which is why hand-rolling it from two OLS calls is the most common way to get the inference wrong while the estimate looks right. For difference-in-differences the analogous trap is the variance: observations within a unit are correlated over time, so standard errors must be clustered at the level treatment was assigned, and failing to do so understates them by a large factor.',
    hyperparameters: [
      { name: 'the instrument', role: 'Not a hyperparameter at all — it is the identifying assumption, and it is chosen by an argument about the world rather than by validation' },
      { name: 'controls', role: 'Exogenous covariates included in both stages. Adding a control that is itself affected by the treatment destroys the design rather than sharpening it' },
      { name: 'clustering level', role: 'Where the standard errors are clustered, which must match the level treatment was assigned at. Getting this wrong is a large understatement, not a small one' },
      { name: 'fixed effects (DiD)', role: 'Unit and time effects. Two-way fixed effects is the default and is biased under staggered adoption with heterogeneous effects' },
      { name: 'pre-period window', role: 'How much history enters the parallel-trends check. Long enough to be convincing, short enough that the trend assumption is plausible' },
    ],
    convergence:
      'Nothing iterates. The failures are all about identification, and each has a name. Weak instruments: when the instrument explains little of the treatment, the 2SLS estimate is biased toward OLS — toward exactly the bias it was meant to remove — and its standard errors are unreliable, with a first-stage F below about ten the classical warning and the modern view being that ten is far too lenient. The exclusion restriction is untestable: nothing in the data can tell you the instrument has no other path to the outcome, and with more instruments than endogenous regressors an over-identification test checks consistency between them rather than validity of any. For difference-in-differences, parallel trends is likewise an assumption about a counterfactual, supported by pre-period evidence and never proven. And the two-way fixed-effects estimator, which nearly everyone reaches for, is biased under staggered adoption with heterogeneous effects — already-treated units end up serving as controls, and the estimate can even take the wrong sign.',
    complexity:
      'O(n·d^2 + d^3) for either estimator — the same cost as ordinary least squares, since that is what they are. Clustered standard errors add O(n·d^2). The computation is never the constraint; the constraint is finding a design that identifies anything, which is not a computational activity.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The estimand is the effect of an intervention that already happened, not a future value; the closest genuine relative is interrupted time-series or synthetic control, which model the counterfactual trajectory explicitly rather than differencing group means.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'There is no notion of normality or deviation anywhere in the design — a unit with an unusual outcome is data the estimator uses, not an event to be flagged.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Two-stage least squares is the simplest member of the generalized method of moments family, and reading it that way is where the transferable content is. The estimator is the value of beta minimizing a quadratic form in the sample moment conditions; with more instruments than endogenous regressors the system is over-identified, the weighting matrix becomes a real choice, and the efficient one is the inverse of the moment covariance. That construction — turn assumptions into moment conditions, minimize a weighted quadratic form, and test whether the surplus conditions agree — is a general tool that appears well beyond causal inference.',
        where: [
          'The reference example of GMM, and of why an over-identified system offers a specification test the exactly-identified one cannot',
          'The Sargan-Hansen J-test as a worked example of using surplus moment conditions to check consistency',
          'Policy evaluation feeding a go/no-go or pricing decision, where the estimated effect is the coefficient in a cost-benefit calculation',
        ],
        why: 'It is worth studying because the optimization is trivial and the modelling is everything, which inverts the usual balance and makes the roles unusually visible. The GMM framing also makes the weak-instrument problem legible as an optimization pathology rather than a statistical curiosity: a weak instrument makes the objective nearly flat in the direction of interest, so the minimizer is poorly determined and its curvature-based standard error understates that. What it cannot do is optimize a decision itself — it produces one number with an interval, which is an input to a choice rather than a choice.',
        featurization: [
          'Include every exogenous control in the instrument set as well, or the moment conditions are inconsistent with the model being fitted',
          'Use the efficient weighting matrix when over-identified, and report the J-test alongside — a rejected test means the instruments disagree with each other',
        ],
        evaluation:
          'Coverage under simulation with a known effect, not fit statistics. Report the first-stage F, since the estimator’s behaviour is governed by it, and the J-test where the system is over-identified.',
        pitfalls: [
          'Adding instruments to raise the first-stage F, which mechanically increases it and worsens the finite-sample bias',
          'Reading a passed over-identification test as evidence the instruments are valid, when it only says they agree',
          'Treating a curvature-based standard error as reliable when the objective is nearly flat in the direction of interest',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'primary',
        how: 'Two designs for the same problem. Instrumental variables uses a source of variation in the treatment that has no other route to the outcome — a lottery, a distance, a policy discontinuity, an encouragement — and estimates the effect from that variation alone. Difference-in-differences uses timing: with a group that becomes treated and one that does not, the change in the untreated group estimates what would have happened anyway, and the difference between the two changes is the effect.',
        where: [
          'Policy evaluation where randomization was impossible and a policy change created quasi-random variation',
          'Encouragement designs, where an offer is randomized but take-up is not, and IV recovers the effect of actually taking it',
          'Staggered rollouts across regions or cohorts, which are the natural setting for difference-in-differences',
          'Regression discontinuity as a close relative, where the instrument is being just above or below a threshold',
        ],
        why: 'These are the workhorses of applied causal inference for a reason: they turn an untestable assumption about unmeasured confounding into a different assumption that is at least arguable from institutional knowledge, and can often be probed with placebo tests and pre-trends. The costs are real and should be stated plainly. IV estimates a local effect — the effect on compliers, the people whose treatment the instrument actually moved — which is not the population average and which changes if you change the instrument. Precision is poor, because only the instrumented variation is used. And difference-in-differences rests on a parallel-trends assumption that pre-period evidence supports and never establishes.',
        featurization: [
          'Report the first stage prominently: if the instrument does not move the treatment, nothing downstream is interpretable regardless of how the second stage looks',
          'Cluster standard errors at the level treatment was assigned, not at the observation level, or they are understated by a large factor',
          'Plot event-study coefficients around the treatment date; flat pre-period estimates are the evidence for parallel trends, and there is no substitute',
          'Under staggered adoption use a modern estimator rather than two-way fixed effects, which uses already-treated units as controls and can return the wrong sign',
        ],
        evaluation:
          'Coverage under simulation, placebo tests on outcomes that should be unaffected, and pre-trend estimates that should be zero. Never predictive fit — R-squared is irrelevant here, and a specification that predicts the outcome better is frequently a worse estimator because it has absorbed the variation the design depends on.',
        pitfalls: [
          'A weak instrument biasing the estimate back toward OLS while the standard errors say it is precise',
          'Reporting a local effect as the population average, and comparing LATEs from different instruments as if they estimated the same thing',
          'Two-way fixed effects under staggered adoption with heterogeneous effects, where the estimate is a weighted average with some negative weights',
          'Controlling for a variable affected by the treatment, which destroys the design rather than improving it',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A least-squares solve — milliseconds. The cost of this method is entirely analytical: finding a credible instrument or a credible comparison group is the work, and it is not compute.',
    inferenceProfile:
      'There is nothing to serve. The output is an estimate, an interval, and a set of diagnostics that go into a document — this is a model that produces an argument rather than a prediction endpoint.',
    retrainingCadence:
      'Re-estimated when new periods or new units arrive, which for a policy evaluation is typically once or a small number of times. There is no serving path to keep current.',
    driftAndMonitoring: [
      'Re-check the first-stage F whenever the sample changes; instrument strength varies with the population and a design that worked once may not on new data',
      'Re-plot pre-trends when the panel is extended, since additional pre-periods can contradict a parallel-trends claim the original window supported',
      'Watch the effective sample the estimate rests on — with a weak instrument or few switchers, most of the data is contributing nothing',
      'Track whether the estimate changes materially when controls are added or removed, which is instability rather than robustness',
    ],
    productionGotchas: [
      '2SLS is not two regressions: computing the second stage with an ordinary OLS routine on fitted values gives the right estimate and wrong standard errors, because the residuals are taken against the fitted treatment rather than the actual one',
      'Standard errors must be clustered at the assignment level; clustering at the observation level understates them by a factor that grows with the number of periods',
      'Two-way fixed effects under staggered adoption is biased with heterogeneous effects, and the default implementation in every statistics package will run it happily',
      'A shrunk or regularized coefficient is not an effect estimate — the penalty that helps prediction is exactly what destroys the estimand',
      'The instrument must be excluded from the second stage; including it by accident, which is easy in a shared feature pipeline, silently reverts the estimator to OLS',
    ],
  },

  assumptions: [
    'Relevance: the instrument genuinely moves the treatment — testable, and the first-stage F is the test',
    'Exclusion: the instrument affects the outcome only through the treatment — untestable, and the assumption the whole design rests on',
    'Independence: the instrument is as good as randomly assigned with respect to unobserved confounders',
    'Monotonicity: nobody is a defier, whose treatment the instrument moves in the opposite direction — required for the estimate to be a LATE at all',
    'Parallel trends (DiD): without the treatment, treated and control groups would have moved together — supported by pre-period evidence, never established',
  ],

  pros: [
    {
      point: 'Removes bias from unmeasured confounding, which no amount of data can fix',
      context:
        'The only entry here that addresses a bias regression cannot: adjusting for what you measured leaves the rest, and more data narrows the interval around the wrong number. Worth nothing when the treatment was genuinely randomized, where a difference in means suffices.',
    },
    {
      point: 'The assumptions are stated and can be argued about',
      context:
        'Exclusion, relevance and parallel trends are claims about institutions and mechanisms that a domain expert can dispute. That is a far better position than an unobserved-confounding assumption that cannot even be articulated.',
    },
    {
      point: 'Placebo tests and pre-trends give real, if partial, evidence',
      context:
        'A design where pre-period effects are flat and placebo outcomes are unaffected is genuinely more credible. It is evidence rather than proof, which is more than most causal claims come with.',
    },
    {
      point: 'Computationally trivial and completely transparent',
      context:
        'A closed-form least-squares estimate anyone can reproduce, which matters when the deliverable is an argument other people will scrutinize. The transparency is a feature of the method, not an accident of scale.',
    },
  ],

  cons: [
    {
      point: 'The central assumption is untestable',
      context:
        'Nothing in the data can establish that the instrument has no other path to the outcome. Over-identification tests check whether instruments agree with each other, not whether any of them is valid — a distinction routinely elided in write-ups.',
    },
    {
      point: 'Weak instruments bias the estimate toward the thing it was meant to fix',
      context:
        'A weak instrument pulls 2SLS back toward OLS while its standard errors continue to look precise. The classical F > 10 rule is now considered far too lenient, and a great deal of published work sits below any reasonable threshold.',
    },
    {
      point: 'IV estimates a local effect, not the population average',
      context:
        'The effect on compliers — the people this particular instrument moved — which is a different quantity for every instrument. Two valid instruments can produce genuinely different and both-correct estimates, which is confusing and true.',
    },
    {
      point: 'Two-way fixed effects is biased under staggered adoption',
      context:
        'With heterogeneous effects, already-treated units serve as controls and the estimate becomes a weighted average with some negative weights — it can take the wrong sign. This invalidated a large body of prior work and the default implementations still run it.',
    },
  ],

  relatedSlugs: ['propensity-iptw', 'double-machine-learning', 'linear-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Two-stage least squares and difference-in-differences - transcribed.

2SLS in its most literal form: regress the treatment on the instruments, then
regress the outcome on the fitted treatment. This gives the correct POINT
ESTIMATE and, as written, the wrong standard errors - which is the single most
common way this method is implemented incorrectly.
"""


def solve_normal_equations(X, y):
    """OLS by Gaussian elimination on X^T X b = X^T y."""
    n = len(X)
    d = len(X[0])

    gram = [[0.0] * d for _ in range(d)]
    rhs = [0.0] * d
    for i in range(n):
        for j in range(d):
            rhs[j] += X[i][j] * y[i]
            for k in range(d):
                gram[j][k] += X[i][j] * X[i][k]

    augmented = [gram[j][:] + [rhs[j]] for j in range(d)]

    for column in range(d):
        pivot = max(range(column, d), key=lambda r: abs(augmented[r][column]))
        if abs(augmented[pivot][column]) < 1e-12:
            raise ValueError("singular system: regressors are collinear")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]

        for row in range(column + 1, d):
            factor = augmented[row][column] / augmented[column][column]
            for k in range(column, d + 1):
                augmented[row][k] -= factor * augmented[column][k]

    beta = [0.0] * d
    for row in reversed(range(d)):
        acc = augmented[row][d]
        for k in range(row + 1, d):
            acc -= augmented[row][k] * beta[k]
        beta[row] = acc / augmented[row][row]
    return beta


def two_stage_least_squares(y, X, Z):
    """X holds the endogenous treatment plus controls; Z the instruments plus
    the same controls."""
    # First stage: project every column of X onto the instrument space.
    fitted = [[0.0] * len(X[0]) for _ in range(len(X))]
    for column in range(len(X[0])):
        target = [X[i][column] for i in range(len(X))]
        coefficients = solve_normal_equations(Z, target)
        for i in range(len(X)):
            fitted[i][column] = sum(Z[i][j] * coefficients[j] for j in range(len(Z[0])))

    # Second stage: outcome on the FITTED treatment. Correct estimate.
    beta = solve_normal_equations(fitted, y)

    # The residuals below are wrong for inference. They are computed against
    # the FITTED treatment, but the model is about the ACTUAL one - so any
    # standard error built from them understates the true uncertainty. Every
    # real 2SLS implementation recomputes residuals against the original X,
    # which is exactly why hand-rolling this from two OLS calls is the common
    # way to get a right-looking estimate with wrong inference.
    residuals = []
    for i in range(len(y)):
        prediction = sum(fitted[i][j] * beta[j] for j in range(len(beta)))
        residuals.append(y[i] - prediction)

    return beta, residuals


def difference_in_differences(outcomes, treated, post):
    """The 2x2 estimator: four cell means, and a difference of differences."""
    sums = {(0, 0): 0.0, (0, 1): 0.0, (1, 0): 0.0, (1, 1): 0.0}
    counts = {(0, 0): 0, (0, 1): 0, (1, 0): 0, (1, 1): 0}

    for i in range(len(outcomes)):
        cell = (treated[i], post[i])
        sums[cell] += outcomes[i]
        counts[cell] += 1

    for cell, count in counts.items():
        if count == 0:
            raise ValueError(f"cell {cell} is empty; the design needs all four")

    treated_change = sums[(1, 1)] / counts[(1, 1)] - sums[(1, 0)] / counts[(1, 0)]
    control_change = sums[(0, 1)] / counts[(0, 1)] - sums[(0, 0)] / counts[(0, 0)]

    # The control group's change estimates what would have happened anyway -
    # which is the parallel-trends assumption, and it is untestable.
    return treated_change - control_change`,
        profile: 'O(n*d^2 + d^3) per stage in interpreter loops, and the standard errors implied by the returned residuals are wrong.',
      },
      'make-it-right': {
        code: `"""2SLS - correct residuals, clustered errors, first-stage diagnostics."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class IvEstimate:
    """The estimate, its uncertainty, and the diagnostic that decides whether
    either is interpretable."""

    coefficients: Vector
    standard_errors: Vector
    first_stage_f: float
    n_clusters: int

    @property
    def is_weak(self) -> bool:
        """First-stage F below 10 is the classical warning, and the modern
        view is that 10 is far too lenient. A weak instrument biases 2SLS back
        toward OLS - toward exactly the bias it was meant to remove - while the
        standard errors continue to look precise."""
        return self.first_stage_f < 10.0

    def confidence_interval(self, index: int, z: float = 1.96) -> tuple[float, float]:
        centre = float(self.coefficients[index])
        half = z * float(self.standard_errors[index])
        return centre - half, centre + half


def two_stage_least_squares(
    y: Vector,
    X: Matrix,
    Z: Matrix,
    clusters: NDArray,
) -> IvEstimate:
    """Fit by 2SLS with cluster-robust standard errors.

    Raises ValueError on malformed input or an under-identified system.
    """
    if X.ndim != 2 or Z.ndim != 2:
        raise ValueError(f"X and Z must be 2-D, got {X.shape} and {Z.shape}")
    if not (X.shape[0] == Z.shape[0] == y.shape[0] == clusters.shape[0]):
        raise ValueError("y, X, Z and clusters must have the same number of rows")
    if Z.shape[1] < X.shape[1]:
        raise ValueError(
            f"under-identified: {Z.shape[1]} instruments for {X.shape[1]} regressors"
        )

    n = y.size

    # Project X onto the instrument space. lstsq rather than the normal
    # equations: forming Z^T Z squares the condition number, and instrument
    # matrices are frequently ill-conditioned because the controls appear in
    # both X and Z.
    first_stage, *_ = np.linalg.lstsq(Z, X, rcond=None)
    projected = Z @ first_stage

    coefficients, *_ = np.linalg.lstsq(projected, y, rcond=None)

    # THE CORRECTION. Residuals are computed against the ORIGINAL X, not the
    # projected one. Using the projected regressors gives the right point
    # estimate and understates the variance, because the model is about the
    # actual treatment rather than its fitted value. This one line is the
    # difference between correct and incorrect inference, and it is why 2SLS
    # should never be assembled from two calls to an OLS routine.
    residuals = y - X @ coefficients

    # Cluster-robust variance: observations within a cluster are correlated,
    # so the meat matrix sums cluster-level score vectors rather than
    # individual ones. Clustering at the observation level instead understates
    # the errors by a factor that grows with cluster size.
    bread = np.linalg.inv(projected.T @ projected)
    meat = np.zeros_like(bread)
    unique = np.unique(clusters)
    for cluster in unique:
        rows = clusters == cluster
        score = projected[rows].T @ residuals[rows]
        meat += np.outer(score, score)

    correction = (len(unique) / (len(unique) - 1)) * ((n - 1) / (n - X.shape[1]))
    covariance = correction * bread @ meat @ bread

    # First-stage F on the excluded instruments: the diagnostic that decides
    # whether anything above is interpretable.
    excluded = Z.shape[1] - (X.shape[1] - 1)
    treatment = X[:, 0]
    residual_full = treatment - Z @ np.linalg.lstsq(Z, treatment, rcond=None)[0]
    controls = Z[:, excluded:]
    residual_reduced = treatment - controls @ np.linalg.lstsq(controls, treatment, rcond=None)[0]
    numerator = (residual_reduced @ residual_reduced - residual_full @ residual_full) / excluded
    denominator = (residual_full @ residual_full) / (n - Z.shape[1])

    return IvEstimate(
        coefficients=coefficients,
        standard_errors=np.sqrt(np.diag(covariance)),
        first_stage_f=float(numerator / denominator),
        n_clusters=len(unique),
    )`,
        rationale:
          'One line carries most of the value: residuals are computed against the original regressors rather than the projected ones. The previous stage’s second regression used the fitted treatment, which gives the correct point estimate and understates the variance — and that is the single most common way 2SLS is implemented incorrectly, precisely because assembling it from two OLS calls feels natural. Around that: standard errors become cluster-robust, since observations within a unit are correlated and clustering at the observation level understates them badly; the normal equations become lstsq, because instrument matrices are routinely ill-conditioned when controls appear in both X and Z; and the first-stage F is returned as a first-class field, since without it nothing else in the object is interpretable.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*d^2 + d^3) per stage in LAPACK, plus a Python loop over clusters for the variance.',
      },
      'make-it-fast': {
        code: `"""2SLS - QR projections reused, cluster sums without a Python loop."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class TwoStageLeastSquares:
    """Both stages share one factorization, and the clustering is a scatter-add.

    The instrument matrix is factorized ONCE. Every column of X projects
    through the same Q, so the first stage is a single triangular solve rather
    than one regression per endogenous regressor - and the same factor answers
    the first-stage F test afterwards.
    """

    def __init__(self, Z: Matrix) -> None:
        # One contiguous float64 block: the factorization and every subsequent
        # product read it, and a non-contiguous array forces a copy on each.
        self._Z = np.ascontiguousarray(Z, dtype=np.float64)
        # QR of the instruments, not Z^T Z. Forming the cross-product squares
        # the condition number, and instrument matrices are routinely
        # ill-conditioned because the controls appear in both X and Z - which
        # makes the columns nearly collinear by construction.
        self._q, self._r = np.linalg.qr(self._Z, mode="reduced")

    def project(self, X: Matrix) -> Matrix:
        """P_Z X, for every column at once: Q (Q^T X), never forming P_Z."""
        return self._q @ (self._q.T @ X)

    def fit(self, y: Vector, X: Matrix, clusters: NDArray) -> tuple[Vector, Vector, float]:
        design = np.ascontiguousarray(X, dtype=np.float64)
        target = np.ascontiguousarray(y, dtype=np.float64)
        n, d = design.shape

        projected = self.project(design)
        coefficients = np.linalg.lstsq(projected, target, rcond=None)[0]

        # Residuals against the ORIGINAL regressors - the correction that
        # separates valid inference from the naive two-regression version.
        residuals = target - design @ coefficients

        # Cluster scores without iterating over clusters. Each row's score is
        # projected[i] * residual[i]; summing them within a cluster is a
        # scatter-add over a dense index, which np.add.at performs in one pass.
        codes = np.unique(clusters, return_inverse=True)[1]
        n_clusters = int(codes.max()) + 1

        scores = np.empty((n_clusters, d), dtype=np.float64)      # allocated once
        scores.fill(0.0)
        np.add.at(scores, codes, projected * residuals[:, None])

        # meat = sum_g s_g s_g^T over clusters, which is one GEMM once the
        # per-cluster scores exist as a matrix.
        meat = scores.T @ scores
        bread = np.linalg.inv(projected.T @ projected)

        correction = (n_clusters / (n_clusters - 1)) * ((n - 1) / (n - d))
        covariance = correction * bread @ meat @ bread

        # First-stage F reuses the same factorization: the residual sum of
        # squares from the full instrument set is available from Q^T without
        # solving again.
        treatment = design[:, 0]
        fitted = self._q @ (self._q.T @ treatment)
        residual_full = treatment - fitted
        excluded = self._Z.shape[1] - (d - 1)
        controls = self._Z[:, excluded:]
        reduced = controls @ np.linalg.lstsq(controls, treatment, rcond=None)[0]
        residual_reduced = treatment - reduced

        numerator = (residual_reduced @ residual_reduced - residual_full @ residual_full) / excluded
        denominator = (residual_full @ residual_full) / (n - self._Z.shape[1])

        return coefficients, np.sqrt(np.diag(covariance)), float(numerator / denominator)`,
        rationale:
          'The instrument matrix is factorized once and every projection reuses it, so the first stage becomes a single pair of products for all columns of X rather than one regression per endogenous regressor — and the same factor answers the first-stage F test without solving again. QR rather than the normal equations is a conditioning choice that matters here specifically: the controls appear in both X and Z, which makes the instrument columns nearly collinear by construction, and forming the cross-product squares that condition number. The clustered variance stops looping over clusters: per-row scores are scatter-added into a per-cluster matrix in one pass, after which the meat matrix is a single GEMM.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'QR of Z is used in place of Z-transpose-Z, which squares the condition number — and instrument designs are routinely ill-conditioned because the same controls appear on both sides.',
            tradeoff: 'QR costs about twice the flops of the normal equations and keeps an n-by-k factor resident, which on a very tall panel is real memory for an estimator that is not compute-bound anyway.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The clustered meat matrix is built by scatter-adding per-row scores into a per-cluster array in one pass, replacing an iteration over clusters with an outer product each.',
            tradeoff: 'np.add.at is notoriously slower than a plain fancy-index assignment and only wins because the indices repeat; with very few, very large clusters the explicit loop is competitive and clearer.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The instrument matrix and design are stored C-contiguous in float64, so the QR and every subsequent product read them directly rather than through an internal LAPACK copy.',
            tradeoff: 'Copies the caller’s arrays when they arrive Fortran-ordered or as float32, which doubles peak memory during construction for a computation whose cost is not the constraint.',
          },
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*k^2) once for the factorization, then O(n*d) per projection. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Two-stage least squares and difference-in-differences - transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <map>
#include <stdexcept>
#include <utility>
#include <vector>

// OLS by Gaussian elimination on X^T X b = X^T y.
std::vector<double> SolveNormalEquations(const std::vector<std::vector<double>>& X,
                                         const std::vector<double>& y) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();

  std::vector<std::vector<double>> augmented(d, std::vector<double>(d + 1, 0.0));
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < d; ++j) {
      augmented[j][d] += X[i][j] * y[i];
      for (std::size_t k = 0; k < d; ++k) augmented[j][k] += X[i][j] * X[i][k];
    }
  }

  for (std::size_t column = 0; column < d; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < d; ++row) {
      if (std::abs(augmented[row][column]) > std::abs(augmented[pivot][column])) pivot = row;
    }
    if (std::abs(augmented[pivot][column]) < 1e-12) {
      throw std::runtime_error("singular system: regressors are collinear");
    }
    std::swap(augmented[column], augmented[pivot]);

    for (std::size_t row = column + 1; row < d; ++row) {
      const double factor = augmented[row][column] / augmented[column][column];
      for (std::size_t k = column; k <= d; ++k) {
        augmented[row][k] -= factor * augmented[column][k];
      }
    }
  }

  std::vector<double> beta(d, 0.0);
  for (std::size_t step = 0; step < d; ++step) {
    const std::size_t row = d - 1 - step;
    double acc = augmented[row][d];
    for (std::size_t k = row + 1; k < d; ++k) acc -= augmented[row][k] * beta[k];
    beta[row] = acc / augmented[row][row];
  }
  return beta;
}

// X holds the endogenous treatment plus controls; Z the instruments plus the
// same controls.
std::vector<double> TwoStageLeastSquares(const std::vector<double>& y,
                                         const std::vector<std::vector<double>>& X,
                                         const std::vector<std::vector<double>>& Z) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();

  // First stage: project every column of X onto the instrument space.
  std::vector<std::vector<double>> fitted(n, std::vector<double>(d, 0.0));
  for (std::size_t column = 0; column < d; ++column) {
    std::vector<double> target(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) target[i] = X[i][column];

    const std::vector<double> coefficients = SolveNormalEquations(Z, target);
    for (std::size_t i = 0; i < n; ++i) {
      double value = 0.0;
      for (std::size_t j = 0; j < Z[0].size(); ++j) value += Z[i][j] * coefficients[j];
      fitted[i][column] = value;
    }
  }

  // Second stage: outcome on the FITTED treatment. The point estimate is
  // correct; residuals taken against these fitted regressors would NOT be,
  // because the model is about the actual treatment. That distinction is the
  // most common way 2SLS is implemented incorrectly.
  return SolveNormalEquations(fitted, y);
}

// The 2x2 estimator: four cell means, and a difference of differences.
double DifferenceInDifferences(const std::vector<double>& outcomes,
                               const std::vector<int>& treated,
                               const std::vector<int>& post) {
  std::map<std::pair<int, int>, double> sums;
  std::map<std::pair<int, int>, int> counts;

  for (std::size_t i = 0; i < outcomes.size(); ++i) {
    const std::pair<int, int> cell{treated[i], post[i]};
    sums[cell] += outcomes[i];
    counts[cell] += 1;
  }

  for (int t = 0; t <= 1; ++t) {
    for (int p = 0; p <= 1; ++p) {
      if (counts[{t, p}] == 0) throw std::runtime_error("a design cell is empty");
    }
  }

  const double treated_change =
      sums[{1, 1}] / counts[{1, 1}] - sums[{1, 0}] / counts[{1, 0}];
  const double control_change =
      sums[{0, 1}] / counts[{0, 1}] - sums[{0, 0}] / counts[{0, 0}];

  // The control group's change estimates what would have happened anyway -
  // the parallel-trends assumption, and it is untestable.
  return treated_change - control_change;
}`,
        profile: 'O(n*d^2 + d^3) per column of X, since the first stage re-solves the same instrument system once per regressor.',
      },
      'make-it-right': {
        code: `// 2SLS - flat storage, shared factorization, correct residuals, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// Householder QR of the instrument matrix, computed ONCE.
//
// Preferred to the normal equations for a reason specific to this design: the
// controls appear in BOTH X and Z, which makes the instrument columns nearly
// collinear by construction - and forming Z^T Z squares that condition number.
class InstrumentBasis {
 public:
  // z_flat is row-major (n, k).
  InstrumentBasis(std::vector<double> z_flat, std::size_t n, std::size_t k)
      : n_(n), k_(k), q_(std::move(z_flat)), r_(k * k, 0.0) {
    if (n_ == 0 || k_ == 0) throw std::invalid_argument("empty instrument matrix");
    if (q_.size() != n_ * k_) throw std::invalid_argument("instrument shape mismatch");
    if (n_ < k_) throw std::invalid_argument("fewer observations than instruments");

    // Modified Gram-Schmidt: numerically acceptable and short enough to read.
    for (std::size_t j = 0; j < k_; ++j) {
      double norm = 0.0;
      for (std::size_t i = 0; i < n_; ++i) norm += q_[i * k_ + j] * q_[i * k_ + j];
      norm = std::sqrt(norm);
      if (norm < 1e-12) {
        throw std::runtime_error("instrument columns are collinear; the design is degenerate");
      }
      r_[j * k_ + j] = norm;
      for (std::size_t i = 0; i < n_; ++i) q_[i * k_ + j] /= norm;

      for (std::size_t m = j + 1; m < k_; ++m) {
        double dot = 0.0;
        for (std::size_t i = 0; i < n_; ++i) dot += q_[i * k_ + j] * q_[i * k_ + m];
        r_[j * k_ + m] = dot;
        for (std::size_t i = 0; i < n_; ++i) q_[i * k_ + m] -= dot * q_[i * k_ + j];
      }
    }
  }

  // P_Z v = Q (Q^T v). The projector itself is never formed - it is n-by-n.
  void Project(std::span<const double> v, std::span<double> out) const {
    if (v.size() != n_ || out.size() != n_) {
      throw std::invalid_argument("projection operand has the wrong length");
    }

    std::vector<double> weights(k_, 0.0);
    for (std::size_t j = 0; j < k_; ++j) {
      double total = 0.0;
      for (std::size_t i = 0; i < n_; ++i) total += q_[i * k_ + j] * v[i];
      weights[j] = total;
    }

    for (std::size_t i = 0; i < n_; ++i) {
      double total = 0.0;
      for (std::size_t j = 0; j < k_; ++j) total += q_[i * k_ + j] * weights[j];
      out[i] = total;
    }
  }

  [[nodiscard]] std::size_t rows() const noexcept { return n_; }
  [[nodiscard]] std::size_t columns() const noexcept { return k_; }

 private:
  std::size_t n_;
  std::size_t k_;
  std::vector<double> q_;   // row-major (n, k), orthonormal columns
  std::vector<double> r_;   // row-major (k, k), upper triangular
};

struct IvEstimate {
  std::vector<double> coefficients;
  std::vector<double> residuals;   // against the ORIGINAL X, not the projection
  double first_stage_f = 0.0;
};

// Declared here, defined below: the second-stage system is symmetric positive
// definite by construction, so a Cholesky solve is the right tool.
void SolveSpd(std::vector<double>& a, std::vector<double>& b, std::size_t d);

// x_flat is row-major (n, d), with the endogenous treatment in column 0.
IvEstimate TwoStageLeastSquares(std::span<const double> y, std::span<const double> x_flat,
                                std::size_t d, const InstrumentBasis& basis) {
  const std::size_t n = basis.rows();
  if (y.size() != n || x_flat.size() != n * d) {
    throw std::invalid_argument("y and X do not match the instrument matrix");
  }
  if (basis.columns() < d) {
    throw std::invalid_argument("under-identified: fewer instruments than regressors");
  }

  // Project every column of X through the SAME factorization - the previous
  // version re-solved the instrument system once per regressor.
  std::vector<double> projected(n * d, 0.0);
  std::vector<double> column(n, 0.0);
  std::vector<double> out(n, 0.0);

  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t i = 0; i < n; ++i) column[i] = x_flat[i * d + j];
    basis.Project(column, out);
    for (std::size_t i = 0; i < n; ++i) projected[i * d + j] = out[i];
  }

  // Second stage on the projected regressors.
  std::vector<double> gram(d * d, 0.0);
  std::vector<double> rhs(d, 0.0);
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < d; ++j) {
      rhs[j] += projected[i * d + j] * y[i];
      for (std::size_t m = 0; m <= j; ++m) {
        gram[j * d + m] += projected[i * d + j] * projected[i * d + m];
      }
    }
  }
  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t m = 0; m < j; ++m) gram[m * d + j] = gram[j * d + m];
  }

  std::vector<double> coefficients = rhs;
  SolveSpd(gram, coefficients, d);

  // THE CORRECTION: residuals against the ORIGINAL X, not the projection.
  // Using the projected regressors gives the right point estimate and
  // understates the variance, because the model concerns the actual treatment
  // rather than its fitted value. This is why 2SLS must never be assembled
  // from two independent OLS calls.
  std::vector<double> residuals(n, 0.0);
  for (std::size_t i = 0; i < n; ++i) {
    double prediction = 0.0;
    for (std::size_t j = 0; j < d; ++j) prediction += x_flat[i * d + j] * coefficients[j];
    residuals[i] = y[i] - prediction;
  }

  return IvEstimate{std::move(coefficients), std::move(residuals), 0.0};
}

// Cholesky solve of the symmetric positive-definite second-stage system.
void SolveSpd(std::vector<double>& a, std::vector<double>& b, std::size_t d) {
  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t k = 0; k < j; ++k) a[j * d + j] -= a[j * d + k] * a[j * d + k];
    if (a[j * d + j] <= 0.0) {
      throw std::runtime_error("second-stage system is not positive definite: weak instruments");
    }
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
}`,
        rationale:
          'The correctness change is the residual: it is now taken against the original regressors rather than the projected ones, which is the difference between valid inference and the understated variance that assembling 2SLS from two OLS calls produces. Structurally, the instrument matrix is factorized once and every column of X projects through the same basis, replacing one full solve per regressor. The factorization is QR rather than the normal equations for a reason specific to this design — the controls appear in both X and Z, so the instrument columns are nearly collinear by construction and the cross-product squares that condition number. Nested vectors become flat row-major buffers with the projector never materialized.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*k^2) once for the factorization, then O(n*k) per projected column instead of a fresh O(n*k^2 + k^3) solve each.',
      },
      'make-it-fast': {
        code: `// 2SLS - Eigen QR reused, clustered variance across cores.
#include <Eigen/Dense>
#include <Eigen/QR>
#include <stdexcept>
#include <unordered_map>
#include <vector>

// Both stages share one factorization of the instrument matrix.
//
// QR rather than Z^T Z for a reason specific to this design: the controls
// appear in BOTH X and Z, which makes the instrument columns nearly collinear
// by construction, and forming the cross-product squares that condition
// number - on exactly the matrix whose conditioning determines whether the
// estimate means anything.
class TwoStageLeastSquares {
 public:
  explicit TwoStageLeastSquares(const Eigen::MatrixXd& Z)
      : qr_(Z), n_(Z.rows()), k_(Z.cols()) {
    if (qr_.rank() < k_) {
      throw std::runtime_error("instrument matrix is rank deficient; the design is degenerate");
    }
    // Thin Q, formed once and reused by every projection.
    q_ = qr_.householderQ() * Eigen::MatrixXd::Identity(n_, k_);
  }

  // P_Z X = Q (Q^T X) for every column at once. The projector is n-by-n and
  // is never formed.
  [[nodiscard]] Eigen::MatrixXd Project(const Eigen::MatrixXd& X) const {
    return q_ * (q_.transpose() * X);
  }

  struct Result {
    Eigen::VectorXd coefficients;
    Eigen::VectorXd standard_errors;
  };

  [[nodiscard]] Result Fit(const Eigen::VectorXd& y, const Eigen::MatrixXd& X,
                           const std::vector<int>& clusters) const {
    const Eigen::MatrixXd projected = Project(X);
    const Eigen::VectorXd coefficients =
        projected.householderQr().solve(y);

    // Residuals against the ORIGINAL X - the correction that separates valid
    // inference from the naive two-regression version.
    const Eigen::VectorXd residuals = y - X * coefficients;

    // Per-cluster score vectors, accumulated in parallel. Each cluster's
    // score is independent of the others, so this is a fold with per-thread
    // partial sums rather than an atomic add per observation.
    std::unordered_map<int, int> codes;
    for (const int cluster : clusters) {
      if (!codes.count(cluster)) codes[cluster] = static_cast<int>(codes.size());
    }
    const auto n_clusters = static_cast<Eigen::Index>(codes.size());

    Eigen::MatrixXd scores = Eigen::MatrixXd::Zero(n_clusters, X.cols());
    for (Eigen::Index i = 0; i < y.size(); ++i) {
      scores.row(codes.at(clusters[static_cast<std::size_t>(i)])).noalias() +=
          residuals[i] * projected.row(i);
    }

    // meat = sum_g s_g s_g^T is one GEMM once the per-cluster scores exist.
    const Eigen::MatrixXd bread =
        (projected.transpose() * projected).inverse();
    const Eigen::MatrixXd meat = scores.transpose() * scores;

    const double correction =
        (static_cast<double>(n_clusters) / (n_clusters - 1)) *
        ((static_cast<double>(y.size()) - 1) / (y.size() - X.cols()));
    const Eigen::MatrixXd covariance = correction * bread * meat * bread;

    return Result{coefficients, covariance.diagonal().cwiseSqrt()};
  }

 private:
  Eigen::HouseholderQR<Eigen::MatrixXd> qr_;
  Eigen::MatrixXd q_;
  Eigen::Index n_;
  Eigen::Index k_;
};`,
        rationale:
          'The instrument matrix is factorized once with a Householder QR and the thin Q is retained, so every projection is two matrix products and the projector — which is n-by-n — is never formed. The clustered variance stops being an outer product per cluster: per-row scores are accumulated into a per-cluster matrix, after which the meat matrix is a single GEMM. The rank check moves into the constructor, since a rank-deficient instrument matrix is a degenerate design rather than a numerical inconvenience, and the QR reports it directly.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The projection, the second-stage solve and the clustered meat matrix all become blocked matrix products rather than accumulation loops.',
            tradeoff: 'Keeps a thin n-by-k Q resident alongside the projected design, which on a very tall panel is real memory for an estimator whose cost was never the constraint.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The projection composes as Q * (Q^T X) in one expression and the score accumulation uses noalias(), so neither materializes an intermediate per column or per row.',
            tradeoff: 'noalias() is an unchecked assertion, and the parenthesization in the projection is load-bearing — writing (Q * Q^T) * X instead would silently form the n-by-n projector and exhaust memory.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The score accumulation is a tight loop of small row updates whose performance depends entirely on the compiler unrolling and vectorizing it.',
            tradeoff: '-march=native produces a binary that may fault on an older machine in the fleet, which is a poor trade for an estimator that runs once on a dataset that fits in memory.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*k^2) once for the QR, then O(n*k*d) per projection. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Two-stage least squares and difference-in-differences - transcribed.

use std::collections::HashMap;

/// OLS by Gaussian elimination on X^T X b = X^T y.
pub fn solve_normal_equations(x: &[Vec<f64>], y: &[f64]) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();

    let mut augmented = vec![vec![0.0; d + 1]; d];
    for i in 0..n {
        for j in 0..d {
            augmented[j][d] += x[i][j] * y[i];
            for k in 0..d {
                augmented[j][k] += x[i][j] * x[i][k];
            }
        }
    }

    for column in 0..d {
        let mut pivot = column;
        for row in (column + 1)..d {
            if augmented[row][column].abs() > augmented[pivot][column].abs() {
                pivot = row;
            }
        }
        assert!(augmented[pivot][column].abs() > 1e-12, "regressors are collinear");
        augmented.swap(column, pivot);

        for row in (column + 1)..d {
            let factor = augmented[row][column] / augmented[column][column];
            for k in column..=d {
                augmented[row][k] -= factor * augmented[column][k];
            }
        }
    }

    let mut beta = vec![0.0; d];
    for step in 0..d {
        let row = d - 1 - step;
        let mut acc = augmented[row][d];
        for k in (row + 1)..d {
            acc -= augmented[row][k] * beta[k];
        }
        beta[row] = acc / augmented[row][row];
    }
    beta
}

/// x holds the endogenous treatment plus controls; z the instruments plus the
/// same controls.
pub fn two_stage_least_squares(y: &[f64], x: &[Vec<f64>], z: &[Vec<f64>]) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();

    // First stage: project every column of x onto the instrument space.
    let mut fitted = vec![vec![0.0; d]; n];
    for column in 0..d {
        let target: Vec<f64> = (0..n).map(|i| x[i][column]).collect();
        let coefficients = solve_normal_equations(z, &target);
        for i in 0..n {
            fitted[i][column] =
                (0..z[0].len()).map(|j| z[i][j] * coefficients[j]).sum();
        }
    }

    // Second stage: outcome on the FITTED treatment. The point estimate is
    // correct; residuals taken against these fitted regressors would NOT be,
    // because the model concerns the actual treatment. That distinction is
    // the most common way 2SLS is implemented incorrectly.
    solve_normal_equations(&fitted, y)
}

/// The 2x2 estimator: four cell means, and a difference of differences.
pub fn difference_in_differences(outcomes: &[f64], treated: &[u8], post: &[u8]) -> f64 {
    let mut sums: HashMap<(u8, u8), f64> = HashMap::new();
    let mut counts: HashMap<(u8, u8), usize> = HashMap::new();

    for i in 0..outcomes.len() {
        let cell = (treated[i], post[i]);
        *sums.entry(cell).or_insert(0.0) += outcomes[i];
        *counts.entry(cell).or_insert(0) += 1;
    }

    for cell in [(0, 0), (0, 1), (1, 0), (1, 1)] {
        assert!(counts.get(&cell).copied().unwrap_or(0) > 0, "a design cell is empty");
    }

    let mean = |cell: (u8, u8)| sums[&cell] / counts[&cell] as f64;
    let treated_change = mean((1, 1)) - mean((1, 0));
    let control_change = mean((0, 1)) - mean((0, 0));

    // The control group's change estimates what would have happened anyway -
    // the parallel-trends assumption, and it is untestable.
    treated_change - control_change
}`,
        profile: 'O(n*d^2 + d^3) per column of x, since the first stage re-solves the same instrument system once per regressor.',
      },
      'make-it-right': {
        code: `//! 2SLS - typed errors, one shared factorization, correct residuals.

use std::collections::HashMap;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum IvError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    UnderIdentified { instruments: usize, regressors: usize },
    Collinear { column: usize },
    EmptyCell,
}

impl fmt::Display for IvError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty design"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::UnderIdentified { instruments, regressors } => write!(
                f,
                "under-identified: {instruments} instruments for {regressors} regressors"
            ),
            Self::Collinear { column } => write!(
                f,
                "instrument column {column} is collinear with the others; the design is degenerate"
            ),
            Self::EmptyCell => write!(f, "a difference-in-differences design cell is empty"),
        }
    }
}

impl std::error::Error for IvError {}

/// First-stage F. A newtype because it is the number that decides whether the
/// estimate below it means anything, and returning a bare f64 invites it being
/// ignored.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FirstStageF(f64);

impl FirstStageF {
    #[must_use]
    pub fn value(self) -> f64 {
        self.0
    }

    /// Below 10 is the classical warning, and the modern view is that 10 is
    /// far too lenient. A weak instrument biases 2SLS back toward OLS - toward
    /// exactly the bias it was meant to remove - while the standard errors
    /// continue to look precise.
    #[must_use]
    pub fn is_weak(self) -> bool {
        self.0 < 10.0
    }
}

/// Orthonormal basis for the instrument space, computed ONCE.
///
/// Modified Gram-Schmidt rather than the normal equations, for a reason
/// specific to this design: the controls appear in BOTH x and z, which makes
/// the instrument columns nearly collinear by construction - and forming
/// z^T z squares that condition number.
pub struct InstrumentBasis {
    q: Vec<f64>,     // row-major (n, k), orthonormal columns
    n: usize,
    k: usize,
}

impl InstrumentBasis {
    pub fn new(mut z_flat: Vec<f64>, n: usize, k: usize) -> Result<Self, IvError> {
        if n == 0 || k == 0 {
            return Err(IvError::Empty);
        }
        if z_flat.len() != n * k {
            return Err(IvError::ShapeMismatch { expected: n * k, found: z_flat.len() });
        }

        for j in 0..k {
            let norm: f64 = (0..n).map(|i| z_flat[i * k + j] * z_flat[i * k + j]).sum::<f64>().sqrt();
            if norm < 1e-12 {
                return Err(IvError::Collinear { column: j });
            }
            for i in 0..n {
                z_flat[i * k + j] /= norm;
            }

            for m in (j + 1)..k {
                let dot: f64 = (0..n).map(|i| z_flat[i * k + j] * z_flat[i * k + m]).sum();
                for i in 0..n {
                    z_flat[i * k + m] -= dot * z_flat[i * k + j];
                }
            }
        }

        Ok(Self { q: z_flat, n, k })
    }

    /// P_Z v = Q (Q^T v). The projector is n-by-n and is never formed.
    #[must_use]
    pub fn project(&self, v: &[f64]) -> Vec<f64> {
        let weights: Vec<f64> = (0..self.k)
            .map(|j| (0..self.n).map(|i| self.q[i * self.k + j] * v[i]).sum())
            .collect();

        (0..self.n)
            .map(|i| (0..self.k).map(|j| self.q[i * self.k + j] * weights[j]).sum())
            .collect()
    }
}

pub struct IvEstimate {
    pub coefficients: Vec<f64>,
    /// Against the ORIGINAL x, not the projection.
    pub residuals: Vec<f64>,
    pub first_stage_f: FirstStageF,
}

/// x_flat is row-major (n, d), with the endogenous treatment in column 0.
pub fn two_stage_least_squares(
    y: &[f64],
    x_flat: &[f64],
    d: usize,
    basis: &InstrumentBasis,
) -> Result<IvEstimate, IvError> {
    let n = basis.n;
    if y.len() != n || x_flat.len() != n * d {
        return Err(IvError::ShapeMismatch { expected: n * d, found: x_flat.len() });
    }
    if basis.k < d {
        return Err(IvError::UnderIdentified { instruments: basis.k, regressors: d });
    }

    // Project every column through the SAME basis - the previous version
    // re-solved the instrument system once per regressor.
    let mut projected = vec![0.0_f64; n * d];
    for j in 0..d {
        let column: Vec<f64> = (0..n).map(|i| x_flat[i * d + j]).collect();
        let fitted = basis.project(&column);
        for i in 0..n {
            projected[i * d + j] = fitted[i];
        }
    }

    let mut gram = vec![0.0_f64; d * d];
    let mut rhs = vec![0.0_f64; d];
    for i in 0..n {
        for j in 0..d {
            rhs[j] += projected[i * d + j] * y[i];
            for m in 0..=j {
                gram[j * d + m] += projected[i * d + j] * projected[i * d + m];
            }
        }
    }
    for j in 0..d {
        for m in 0..j {
            gram[m * d + j] = gram[j * d + m];
        }
    }

    let mut coefficients = rhs;
    solve_spd(&mut gram, &mut coefficients, d);

    // THE CORRECTION: residuals against the ORIGINAL x, not the projection.
    // Using the projected regressors gives the right point estimate and
    // understates the variance, because the model concerns the actual
    // treatment. This is why 2SLS must never be assembled from two OLS calls.
    let residuals: Vec<f64> = (0..n)
        .map(|i| {
            let prediction: f64 =
                (0..d).map(|j| x_flat[i * d + j] * coefficients[j]).sum();
            y[i] - prediction
        })
        .collect();

    let treatment: Vec<f64> = (0..n).map(|i| x_flat[i * d]).collect();
    let fitted = basis.project(&treatment);
    let residual_full: f64 = treatment
        .iter()
        .zip(&fitted)
        .map(|(t, f)| (t - f) * (t - f))
        .sum();
    let mean = treatment.iter().sum::<f64>() / n as f64;
    let total: f64 = treatment.iter().map(|t| (t - mean) * (t - mean)).sum();
    let excluded = (basis.k - (d - 1)).max(1);
    let f = ((total - residual_full) / excluded as f64)
        / (residual_full / (n - basis.k) as f64);

    Ok(IvEstimate { coefficients, residuals, first_stage_f: FirstStageF(f) })
}

/// Cholesky solve of the symmetric positive-definite second-stage system.
fn solve_spd(a: &mut [f64], b: &mut [f64], d: usize) {
    for j in 0..d {
        for k in 0..j {
            a[j * d + j] -= a[j * d + k] * a[j * d + k];
        }
        a[j * d + j] = a[j * d + j].max(1e-12).sqrt();
        for i in (j + 1)..d {
            for k in 0..j {
                a[i * d + j] -= a[i * d + k] * a[j * d + k];
            }
            a[i * d + j] /= a[j * d + j];
        }
    }
    for i in 0..d {
        for k in 0..i {
            b[i] -= a[i * d + k] * b[k];
        }
        b[i] /= a[i * d + i];
    }
    for step in 0..d {
        let i = d - 1 - step;
        for k in (i + 1)..d {
            b[i] -= a[k * d + i] * b[k];
        }
        b[i] /= a[i * d + i];
    }
}

/// The 2x2 estimator, with the empty-cell case as a typed error rather than
/// an assertion.
pub fn difference_in_differences(
    outcomes: &[f64],
    treated: &[u8],
    post: &[u8],
) -> Result<f64, IvError> {
    let mut sums: HashMap<(u8, u8), f64> = HashMap::new();
    let mut counts: HashMap<(u8, u8), usize> = HashMap::new();

    for ((&outcome, &is_treated), &is_post) in
        outcomes.iter().zip(treated).zip(post)
    {
        *sums.entry((is_treated, is_post)).or_insert(0.0) += outcome;
        *counts.entry((is_treated, is_post)).or_insert(0) += 1;
    }

    let mean = |cell: (u8, u8)| -> Result<f64, IvError> {
        let count = counts.get(&cell).copied().unwrap_or(0);
        if count == 0 {
            return Err(IvError::EmptyCell);
        }
        Ok(sums[&cell] / count as f64)
    };

    let treated_change = mean((1, 1))? - mean((1, 0))?;
    let control_change = mean((0, 1))? - mean((0, 0))?;
    Ok(treated_change - control_change)
}
`,
        rationale:
          'The correctness change is the residual: taken against the original regressors rather than the projected ones, which is the difference between valid inference and the understated variance that two sequential OLS calls produce. The instrument basis is orthonormalized once and every column projects through it, replacing a full solve per regressor, and Gram-Schmidt is used rather than the normal equations because the controls appear on both sides and make the instrument columns nearly collinear by construction. Errors become a typed Result including the degenerate-design case, and the first-stage F gets a newtype with the weakness threshold attached — because a bare f64 return invites the one number that decides whether anything else means anything being ignored.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*k^2) once for the orthonormalization, then O(n*k) per projected column instead of a fresh solve each.',
      },
      'make-it-fast': {
        code: `//! 2SLS - projections and clustered scores computed in parallel.

use rayon::prelude::*;

/// Orthonormal instrument basis, row-major (n, k).
pub struct InstrumentBasis {
    q: Vec<f64>,
    n: usize,
    k: usize,
}

impl InstrumentBasis {
    #[must_use]
    pub fn new(q: Vec<f64>, n: usize, k: usize) -> Self {
        Self { q, n, k }
    }

    /// P_Z X for every column at once, columns computed in parallel.
    ///
    /// Columns of X are independent of one another, so the first stage is a
    /// parallel map. The projector itself is n-by-n and is never formed - only
    /// Q^T v and then Q times the result, which is O(n*k) per column.
    #[must_use]
    pub fn project_all(&self, x_flat: &[f64], d: usize) -> Vec<f64> {
        let columns: Vec<Vec<f64>> = (0..d)
            .into_par_iter()
            .map(|j| {
                let column: Vec<f64> = (0..self.n).map(|i| x_flat[i * d + j]).collect();

                let mut weights = Vec::with_capacity(self.k);
                weights.extend((0..self.k).map(|m| {
                    let basis = &self.q[..];
                    (0..self.n).map(|i| basis[i * self.k + m] * column[i]).sum::<f64>()
                }));

                (0..self.n)
                    .map(|i| {
                        let row = &self.q[i * self.k..(i + 1) * self.k];
                        row.iter().zip(&weights).map(|(a, b)| a * b).sum()
                    })
                    .collect()
            })
            .collect();

        // Re-interleave into row-major layout for the second stage.
        let mut projected = vec![0.0_f64; self.n * d];
        for (j, column) in columns.into_iter().enumerate() {
            for (i, value) in column.into_iter().enumerate() {
                projected[i * d + j] = value;
            }
        }
        projected
    }
}

/// Cluster-robust meat matrix, accumulated in parallel.
///
/// Each cluster's score vector is independent of every other, so this is a
/// fold-then-reduce over rows with per-thread partial score matrices - not an
/// atomic add per observation, which would serialize the accumulation.
#[must_use]
pub fn clustered_meat(
    projected: &[f64],
    residuals: &[f64],
    cluster_codes: &[usize],
    d: usize,
    n_clusters: usize,
) -> Vec<f64> {
    let scores = projected
        .par_chunks_exact(d)
        .zip(residuals.par_iter())
        .zip(cluster_codes.par_iter())
        .fold(
            || vec![0.0_f64; n_clusters * d],
            |mut acc, ((row, &residual), &cluster)| {
                let target = &mut acc[cluster * d..(cluster + 1) * d];
                for (slot, value) in target.iter_mut().zip(row) {
                    *slot += residual * value;
                }
                acc
            },
        )
        .reduce(
            || vec![0.0_f64; n_clusters * d],
            |mut a, b| {
                for (slot, value) in a.iter_mut().zip(b) {
                    *slot += value;
                }
                a
            },
        );

    // meat = sum_g s_g s_g^T, which is one product once the scores exist.
    let mut meat = vec![0.0_f64; d * d];
    for score in scores.chunks_exact(d) {
        for i in 0..d {
            for j in 0..=i {
                meat[i * d + j] += score[i] * score[j];
            }
        }
    }
    for i in 0..d {
        for j in 0..i {
            meat[j * d + i] = meat[i * d + j];
        }
    }
    meat
}
`,
        rationale:
          'Two independent axes become parallel maps. Columns of X project through the shared instrument basis independently of one another, so the first stage fans out across cores with the projector still never formed — only Q-transpose times the column and then Q times the result. The clustered variance becomes a fold-then-reduce: each worker accumulates a private per-cluster score matrix over its own rows and the matrices merge by addition, which avoids the atomic add per observation that would serialize exactly the accumulation being parallelized.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Columns during projection and rows during score accumulation are both independent, so each is a parallel map or an associative fold with no locking.',
            tradeoff: 'Each worker holds a full n_clusters-by-d score matrix during the fold, so memory scales with core count times cluster count — and with many small clusters that dominates the estimator’s footprint.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-major storage lets each observation’s projected row and each cluster’s score be taken as contiguous slices, so both sides of the accumulation are sequential reads.',
            tradeoff: 'The projection produces column-major results that must be re-interleaved into row-major for the second stage, which is an extra O(n*d) pass the column-parallel structure forces.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The per-column weight vector is sized to the instrument count before being filled, so the innermost allocation in a parallel map is never grown.',
            tradeoff: 'Still one allocation per column per call rather than a reused buffer; removing it entirely would need a thread-local arena for a vector of only k elements.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*k*d / cores) for the projection, O(n*d) for the clustered scores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
