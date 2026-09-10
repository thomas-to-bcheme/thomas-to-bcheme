import type { AiMlModel } from '../../types';

/**
 * Kalman Filter & State-Space Models — the framework the rest of the group
 * turns out to be a special case of.
 *
 * Closes the classical-time-series group as its most general rung: ARIMA and
 * exponential smoothing both have state-space representations, and the filter
 * is what computes their exact likelihood. It also separates two things the
 * earlier entries conflate — what the system IS doing, and what you managed to
 * measure — which is why it extends to sensor fusion and tracking where a
 * forecaster does not.
 */
export const KALMAN_FILTER: AiMlModel = {
  slug: 'kalman-filter',
  name: 'Kalman Filter & State-Space Models',
  aliases: ['Linear-Gaussian state space', 'LQE', 'EKF / UKF (variants)', 'RTS smoother', 'Structural time series'],
  category: 'classical-ml',
  group: 'classical-time-series',
  kind: 'model',

  paradigms: ['supervised', 'unsupervised'],
  // 'anomaly-detection' via the normalized innovation squared, which is the
  // standard fault detector in tracking and navigation — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'sequence-modeling', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Two uses with one algorithm, and they classify differently. Forecasting observations is supervised in the same sense ARIMA is; estimating a latent state that is never measured — a position from noisy sensors — is unsupervised latent-variable inference. The filter does both because the state and the observation are separate objects in the model, which is precisely what the earlier entries in this group do not have.',

  intuition:
    'Separate what the system is doing from what you managed to measure. The state is the thing you care about — a position, a level, a trend — and it evolves by its own rules. The observation is a noisy, possibly incomplete look at it. Then run two steps forever. Predict: push the state forward and let the uncertainty grow, because time passing makes you less sure. Update: take the measurement and move the estimate toward it, by an amount that depends on which you trust more. That trade-off is the whole filter, and the Kalman gain is literally its arithmetic — when your prediction is uncertain and the sensor is good, the gain is near one and you believe the sensor; when the reverse, you barely move.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\ell(\\theta) = -\\frac{1}{2}\\sum_{t=1}^{T} \\left[ \\log \\lvert S_t \\rvert + \\mathbf{v}_t^{\\top} S_t^{-1} \\mathbf{v}_t + n_y \\log 2\\pi \\right], \\qquad \\mathbf{v}_t = \\mathbf{y}_t - H\\hat{\\mathbf{x}}_{t \\mid t-1}',
      symbols: [
        { symbol: '\\mathbf{v}_t', meaning: 'the innovation — what the measurement said minus what the filter expected, and the only genuinely new information at time t' },
        { symbol: 'S_t', meaning: 'innovation covariance: how surprised the filter was entitled to be, given its own uncertainty and the sensor noise' },
        { symbol: '\\theta', meaning: 'the system matrices and noise covariances, fitted by maximizing this quantity when they are not known' },
        { symbol: 'H', meaning: 'the observation matrix, mapping the state onto what is actually measured — often losing information on the way' },
      ],
    },
    reading:
      'The prediction-error decomposition: the likelihood of a whole series is the product of one-step predictive densities, and the filter produces exactly those as it runs. That is what makes this a model rather than merely an algorithm — the same recursion that estimates the state also returns the number an optimizer needs to fit the unknown parameters, at no extra cost. It is also the reason ARIMA implementations run a Kalman filter internally: casting an ARIMA into state-space form and running this gives the exact likelihood, where conditional sum of squares only approximates it.',
  },

  optimization: {
    method: 'Closed-form recursive Bayesian updates; maximum likelihood via the prediction-error decomposition for unknown parameters',
    updateRule: {
      formula:
        'K_t = P_{t \\mid t-1} H^{\\top} S_t^{-1}, \\quad \\hat{\\mathbf{x}}_{t \\mid t} = \\hat{\\mathbf{x}}_{t \\mid t-1} + K_t \\mathbf{v}_t, \\quad P_{t \\mid t} = (I - K_t H) P_{t \\mid t-1}',
      symbols: [
        { symbol: 'K_t', meaning: 'the Kalman gain — prediction uncertainty divided by total uncertainty, which is the trust ratio written as arithmetic' },
        { symbol: 'P_{t \\mid t-1}', meaning: 'covariance of the state estimate before the measurement; it grows during the predict step' },
        { symbol: 'P_{t \\mid t}', meaning: 'covariance after the measurement, which can only shrink — information never destroys information' },
        { symbol: 'I - K_t H', meaning: 'how much uncertainty the measurement removed; with a perfect sensor this is zero and the state is known' },
      ],
    },
    rationale:
      'For a linear system with Gaussian noise, the posterior over the state stays Gaussian forever, so the entire inference reduces to propagating a mean and a covariance. No sampling, no iteration, no approximation — the update is exact and it is the minimum-mean-squared-error estimator, which is a genuinely strong optimality claim and the reason the filter has survived since 1960. Two practical points dominate everything else. The process and measurement noise covariances are rarely known and are effectively the only tuning available, and getting their ratio wrong is what causes almost every filter failure in the field. And the covariance update above is numerically fragile: rounding can drive P non-positive-definite, at which point the filter reports impossible confidence and diverges, which is why the Joseph form and square-root implementations exist rather than being refinements.',
    hyperparameters: [
      { name: 'Q (process noise)', role: 'How much the state is allowed to move on its own. Too small and the filter becomes over-confident, ignores measurements, and diverges; too large and it chases noise', typicalRange: 'the dominant tuning decision, usually set from physics or by maximizing the likelihood' },
      { name: 'R (measurement noise)', role: 'Sensor variance. Often the one quantity actually known, from a datasheet or a calibration run' },
      { name: 'initial state and P0', role: 'Where to start and how unsure. A large P0 makes the filter converge quickly from an unknown start; too small and it refuses to move toward the truth' },
      { name: 'F, H (system matrices)', role: 'The dynamics and observation model. These encode the physics or the structure and are a modelling decision, not a tunable' },
      { name: 'variant', role: 'Linear, extended (EKF), unscented (UKF), or particle filter — chosen by how nonlinear the system is, and the EKF can diverge where the UKF does not' },
    ],
    convergence:
      'For a time-invariant system the covariance recursion converges to a fixed point of the Riccati equation, so the gain becomes constant and the filter reaches a steady state — which is a genuinely useful fact, since the constant gain can be precomputed and the covariance propagation dropped entirely. The failure modes are specific and well known. Divergence: with Q too small the filter becomes progressively more certain than it should be, the gain falls toward zero, and it stops listening to measurements while its reported covariance says everything is fine — the most dangerous failure here, because it looks confident. Numerical loss of positive definiteness produces the same behaviour from a different cause. And observability matters: if the observation matrix cannot see part of the state, that part is never corrected and drifts freely, which no amount of tuning fixes.',
    complexity:
      'O(n_x^3) per step in the worst case for the covariance propagation, though for a small state — which is the usual case, four to twelve dimensions — this is a handful of tiny matrix operations and effectively free. Memory is O(n_x^2), constant in the length of the series, which is what makes it a streaming algorithm. With a time-invariant system the steady-state gain removes the covariance work entirely and each step becomes a couple of matrix-vector products.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Structural time series: write the series as unobserved components — local level, local trend, seasonal, cycle, regression effects — put each into the state vector, and let the filter estimate them jointly while the unknown variances are fitted by maximum likelihood. Forecasting is then just running the predict step forward with no measurements to correct it, and the covariance growth gives the intervals directly.',
        where: [
          'Structural and Bayesian structural time-series models, where the decomposition into components is itself the deliverable',
          'Series with missing observations, which the filter handles natively by skipping the update step and letting uncertainty grow',
          'Multivariate forecasting with shared latent factors, which a univariate method cannot express',
          'Computing the exact likelihood for ARIMA and ETS, both of which have state-space representations',
        ],
        why: 'It is the most flexible framework in this group: time-varying parameters, irregular sampling, missing data, multiple observation sources and interventions all fit inside it without special cases, and the components come out separately rather than needing to be inferred from coefficients. That generality is also the cost — you must specify the state, the dynamics and the noise structure, and there are far more ways to specify them badly than for exponential smoothing. When the structure is genuinely unknown and the series is ordinary, a simpler method will usually match it with far less that can go wrong.',
        featurization: [
          'Choose the components deliberately — local level versus local linear trend is a real modelling decision, and the second over-fits short series',
          'Handle missing observations by skipping the update rather than imputing, which is one of the framework’s genuine advantages',
          'Fit the variances by maximum likelihood rather than guessing them, since their ratio is what determines how smooth the fitted components are',
          'Put interventions and regressors into the state when their effect can change over time, and into the observation equation when it cannot',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE, plus the filter’s own consistency checks — the innovations should be white, and their observed covariance should match the S_t the filter predicted. A model that forecasts adequately while failing those diagnostics is mis-specified in a way accuracy metrics will not reveal.',
        pitfalls: [
          'Over-specifying the state: every extra component is more variance to estimate, and an unidentifiable one absorbs whatever is left over',
          'Q set to zero for a component that genuinely moves, which freezes it and pushes the error into the others',
          'Trusting long-horizon intervals when the state includes a trend, since the variance grows cubically with the horizon there',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Score the normalized innovation squared: the innovation weighted by the covariance the filter itself predicted for it. That statistic is chi-squared distributed under a correctly-specified filter, so the threshold comes from a distribution rather than from a tuned multiple of a residual standard deviation — a genuinely rare property among detectors.',
        where: [
          'Fault detection in navigation and tracking, where a failing sensor shows up as innovations too large for their predicted covariance',
          'Gating in multi-object tracking: a measurement whose innovation is outside the gate is not associated with that track at all',
          'Process and equipment monitoring with a physical model of the dynamics available',
          'Detecting level shifts and structural breaks, which appear as a run of same-signed innovations rather than one large one',
        ],
        why: 'The threshold is principled, which is unusual: the filter predicts how surprised it is entitled to be, so an alarm is a statement that the data is inconsistent with the model at a stated confidence rather than a tuned cutoff. It also separates two things most detectors conflate — an outlier, which is one large innovation, and a model failure, which is a sustained run of them. Against it: everything rests on the model being right, so a mis-specified filter produces innovations whose covariance is wrong and a threshold that means nothing, and diagnosing that requires the consistency tests rather than the detector’s own output.',
        featurization: [
          'Tune Q and R on confirmed-clean data first — the detector is only as calibrated as the covariance the filter predicts',
          'Run the consistency test before trusting any threshold: if the normalized innovations are not chi-squared on clean data, the filter is mis-specified',
          'Gate measurements before they are used, or a single wild reading is absorbed into the state and corrupts every subsequent innovation',
          'Distinguish spikes from level shifts by looking at runs of innovations rather than individual values',
        ],
        evaluation:
          'Precision@k against confirmed faults, plus the normalized-innovation consistency check on clean data — the two together are the standard practice in navigation, and the second is what tells you whether the first number means anything.',
        pitfalls: [
          'A wild measurement absorbed into the state, after which the filter is wrong and the following innovations are misleading',
          'Filter divergence producing tiny innovations and a confident, wrong state — the failure that looks like success',
          'Thresholds carried over from another deployment, since the covariance scale is specific to the fitted Q and R',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Two connections, both substantive. The filter is recursive least squares: it is the exact solution to a weighted least-squares problem solved incrementally, and the gain is what a batch solve would produce if you re-ran it after every measurement. And in control, the separation principle says the optimal controller for a linear-quadratic-Gaussian problem is exactly the optimal estimator followed by the optimal controller, designed independently — a rare decomposition result that makes an otherwise coupled problem tractable.',
        where: [
          'Linear-quadratic-Gaussian control, where the filter is half of a provably optimal controller',
          'Recursive least squares for online parameter estimation, which is the filter with the state interpreted as coefficients',
          'The algebraic Riccati equation as a fixed point, whose solution is the steady-state gain and which is the same object that appears in optimal control',
        ],
        why: 'It is the clearest case in this section of an estimator with a genuine optimality proof rather than an empirical justification: minimum mean squared error among all estimators under the linear-Gaussian assumptions, and best linear estimator without the Gaussian part. The separation principle is worth the study on its own, because problems that decompose that cleanly are rare and recognizing one is what makes it solvable. What it does not do is optimize anything itself — it estimates, and the controller is a separate object.',
        featurization: [
          'For recursive least squares, the state is the coefficient vector and Q controls how fast the coefficients are allowed to drift',
          'Scale the state components so the covariance is not dominated by whichever has the largest units',
        ],
        evaluation:
          'Compare the recursive estimate against a batch least-squares solve on the same data — with Q at zero they must agree to numerical tolerance, and that is an exact correctness test for the implementation.',
        pitfalls: [
          'Applying the separation principle where the linear-quadratic-Gaussian assumptions do not hold, where it simply is not true',
          'Forgetting that estimator optimality is conditional on Q and R being right, which in practice they never quite are',
          'Numerical drift in the covariance turning an optimal estimator into a divergent one',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'The standard estimator in navigation, guidance and control. Fuse an inertial measurement unit with GPS, wheel odometry with a laser scan, or a process model with a sparse sensor — the state carries what the system is doing, each sensor enters through its own observation equation with its own noise, and the filter combines them optimally without any of them needing to observe the whole state.',
        where: [
          'Inertial navigation with GPS aiding, which is the canonical deployment and the one it was built for',
          'Robot localization and sensor fusion across sensors with different rates and different noise characteristics',
          'Process control, where the filter estimates unmeasured internal states for the controller to act on',
          'Battery state-of-charge and other estimation problems where the quantity of interest is simply not directly measurable',
        ],
        why: 'It handles the defining feature of the domain: several partial, noisy, asynchronous views of a system whose true state is not measurable. Each sensor contributes through its own observation equation, missing readings are handled by skipping an update, and the state estimate carries a covariance the controller can act on. It is also cheap enough to run in a control loop on embedded hardware. The limits are the model’s: strong nonlinearity needs an EKF that can diverge or a UKF that costs more, and multi-modal uncertainty — genuinely not knowing which of two places you are — cannot be represented by a single Gaussian at all, which is what particle filters exist for.',
        featurization: [
          'Derive Q from the physics where possible rather than tuning it blindly; it is the parameter that determines whether the filter trusts its model',
          'Time-stamp and order measurements carefully — out-of-sequence updates corrupt the state, and asynchronous sensors make this the common bug',
          'Gate measurements before use, so a single wild reading cannot be absorbed into the state',
          'Check observability of the chosen state: a component the sensors cannot see will drift no matter how well the filter is tuned',
        ],
        evaluation:
          'Normalized estimation error squared against ground truth where it exists, and the innovation consistency test where it does not. In tracking, evaluate the full pipeline — track fragmentation and identity switches — rather than per-step position error alone.',
        pitfalls: [
          'Divergence from an over-small Q, where the filter reports high confidence in a state that has drifted away from reality',
          'EKF linearization error accumulating on a strongly nonlinear system until the estimate is unrecoverable',
          'A single Gaussian forced onto genuinely multi-modal uncertainty, which produces an estimate sitting between two hypotheses and matching neither',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'One filter per tracked object. A detector supplies noisy bounding boxes frame by frame; the filter carries position and velocity as state, predicts where each object should appear next, and the prediction is what associates a new detection with an existing track. That is the core of SORT and its descendants, and the reason a tracker keeps identities through brief occlusions — the state persists when the detection does not.',
        where: [
          'Multi-object tracking, where a constant-velocity filter per track is still the standard motion model',
          'Gating and data association, using the innovation covariance to decide which detections could plausibly belong to which track',
          'Bridging missed detections and short occlusions, where the predict step continues with no measurement to correct it',
          'Smoothing jittery detections into stable trajectories for downstream consumption',
        ],
        why: 'It supplies the motion prior a per-frame detector has no way to express, at a cost small enough to run hundreds of tracks in real time. The uncertainty is what makes association principled rather than a distance threshold. Its limits are the model again: constant velocity is wrong through a turn, and a long occlusion lets the covariance grow until the gate admits anything. Learned motion models and appearance embeddings are what modern trackers add on top — they do not replace the filter, they supplement it.',
        featurization: [
          'Model position and velocity in a coordinate system where constant velocity is roughly true; image-space pixels are not that system under perspective',
          'Scale R from the detector’s own confidence where it reports one, so a marginal detection moves the state less',
          'Cap how long a track survives without a measurement, or the growing covariance turns the gate into an accept-everything rule',
        ],
        evaluation:
          'Tracking metrics — MOTA, IDF1, identity switches — rather than per-frame localization error. The filter’s contribution shows up as identity preservation through occlusion, which per-frame accuracy does not measure.',
        pitfalls: [
          'Constant velocity through a sharp turn, where the model is simply wrong and the innovations blow up',
          'Covariance growth during a long occlusion widening the gate until an unrelated detection is accepted',
          'One shared Q across objects with very different dynamics, which mis-tunes the filter for most of them',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Nothing to train when the matrices are known — the filter simply runs. Where the noise covariances are fitted, it is a small maximum-likelihood problem over a handful of parameters, with each evaluation one pass of the filter. Seconds.',
    inferenceProfile:
      'A few small matrix operations per step with state dimension typically under a dozen, so microseconds and constant memory regardless of series length. This is a streaming algorithm by construction, which is why it runs inside control loops on embedded hardware.',
    retrainingCadence:
      'The state updates continuously by design and needs no refit. The noise covariances drift with the sensors and the process, and are typically re-estimated on a much slower schedule — quarterly, or after a hardware change.',
    driftAndMonitoring: [
      'Run the normalized innovation squared consistency test continuously: it should follow its chi-squared distribution, and departure means the model is wrong before any estimate looks wrong',
      'Watch for innovations that are consistently too small, which is the signature of an over-confident filter beginning to diverge rather than of a good fit',
      'Track the smallest eigenvalue of the covariance; approaching zero means numerical loss of positive definiteness is imminent',
      'Monitor measurement rejection rates at the gate, since a rising rate means either a failing sensor or an R that no longer matches it',
    ],
    productionGotchas: [
      'The standard covariance update is numerically fragile — use the Joseph form or a square-root filter, because a P that loses positive definiteness produces a confidently wrong state with no error raised',
      'Out-of-sequence measurements corrupt the state, and with asynchronous sensors this is the most common real bug; timestamps must be respected, not arrival order',
      'A too-small Q causes divergence that looks like confidence: the filter reports a shrinking covariance while the estimate drifts away from reality',
      'Symmetrize the covariance after every update, since accumulated round-off makes it asymmetric and then indefinite',
      'An unobservable state component drifts freely and nothing in the filter reports it — observability has to be checked when the model is designed, not diagnosed afterwards',
    ],
  },

  assumptions: [
    'The dynamics and observation are linear, or close enough that a linearization holds — where they are not, the EKF approximates and can diverge',
    'Process and measurement noise are Gaussian, zero-mean, and independent of each other and across time',
    'The noise covariances Q and R are known, which they essentially never are — they are the tuning, and the filter’s optimality is conditional on them',
    'The state is observable through the measurements, or parts of it drift with no correction and no warning',
    'Uncertainty is unimodal: a single Gaussian cannot represent genuinely not knowing which of two places you are',
  ],

  pros: [
    {
      point: 'Optimal in a precise sense, not merely a good heuristic',
      context:
        'Minimum mean squared error among all estimators under the linear-Gaussian assumptions, and the best linear estimator without the Gaussian part. Rare in this section — most entries justify themselves empirically — and it is why the method has lasted since 1960.',
    },
    {
      point: 'Constant memory and constant cost per step',
      context:
        'The state summarizes the entire history, so nothing grows with series length. That is what makes it a streaming algorithm and what puts it inside control loops on embedded hardware.',
    },
    {
      point: 'Fuses partial, asynchronous, missing observations naturally',
      context:
        'Each sensor gets its own observation equation, a missing reading means skipping the update, and no sensor needs to see the whole state. Handled by the structure of the model rather than by special cases, which is the framework’s real advantage.',
    },
    {
      point: 'Carries calibrated uncertainty and its own diagnostics',
      context:
        'The covariance is a first-class output, and the innovation consistency test says whether the model is right. Most methods here have no comparable self-check.',
    },
  ],

  cons: [
    {
      point: 'Q and R must be supplied, and getting them wrong is the usual failure',
      context:
        'They are rarely known, they are effectively the only tuning, and their ratio determines everything. Almost every field failure of a Kalman filter traces back to this rather than to the algorithm.',
    },
    {
      point: 'Divergence looks like confidence',
      context:
        'With Q too small the filter becomes progressively more certain while drifting away from reality, and its reported covariance says everything is fine. The most dangerous failure mode here precisely because nothing errors.',
    },
    {
      point: 'Linear and Gaussian, or approximate',
      context:
        'The EKF linearizes and can diverge on strong nonlinearity; the UKF costs more; genuinely multi-modal uncertainty needs a particle filter. Each step away from the assumptions gives up the optimality that motivated the choice.',
    },
    {
      point: 'The model must be specified, and there are many ways to do it badly',
      context:
        'State, dynamics, observation and noise structure are all decisions. That generality is the framework’s strength and the reason a simpler method with fewer choices frequently wins on an ordinary series.',
    },
  ],

  relatedSlugs: ['arima', 'exponential-smoothing', 'gaussian-mixture'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Kalman filter - predict and update, transcribed.

Two steps forever. Predict pushes the state forward and lets the uncertainty
grow; update pulls it toward the measurement by an amount set by which one is
trusted more. Matrix operations are written out by hand so the arithmetic is
visible rather than delegated.
"""


def matmul(A, B):
    rows, inner, cols = len(A), len(B), len(B[0])
    out = [[0.0] * cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            total = 0.0
            for k in range(inner):
                total += A[i][k] * B[k][j]
            out[i][j] = total
    return out


def transpose(A):
    return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]


def add(A, B):
    return [[A[i][j] + B[i][j] for j in range(len(A[0]))] for i in range(len(A))]


def invert(A):
    """Gauss-Jordan on the innovation covariance.

    In a real filter this matrix is the size of the MEASUREMENT, not the state,
    so it is usually 1x1 or 2x2 - which is why inverting it directly is
    acceptable here and inverting the state covariance would not be.
    """
    n = len(A)
    augmented = [row[:] + [1.0 if i == j else 0.0 for j in range(n)]
                 for i, row in enumerate(A)]

    for column in range(n):
        pivot = max(range(column, n), key=lambda r: abs(augmented[r][column]))
        if abs(augmented[pivot][column]) < 1e-12:
            raise ValueError("innovation covariance is singular")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]

        divisor = augmented[column][column]
        for k in range(2 * n):
            augmented[column][k] /= divisor

        for row in range(n):
            if row == column:
                continue
            factor = augmented[row][column]
            for k in range(2 * n):
                augmented[row][k] -= factor * augmented[column][k]

    return [row[n:] for row in augmented]


def predict(x, P, F, Q):
    """x <- F x, P <- F P F^T + Q. Uncertainty GROWS: time passing makes the
    estimate worse, which is what Q encodes."""
    x_next = matmul(F, x)
    P_next = add(matmul(matmul(F, P), transpose(F)), Q)
    return x_next, P_next


def update(x, P, y, H, R):
    """The gain is prediction uncertainty over TOTAL uncertainty - the trust
    ratio, written as arithmetic."""
    n = len(x)

    # innovation: what was measured minus what was expected
    predicted = matmul(H, x)
    v = [[y[i][0] - predicted[i][0]] for i in range(len(y))]

    # S = H P H^T + R: how surprised the filter was entitled to be
    S = add(matmul(matmul(H, P), transpose(H)), R)
    K = matmul(matmul(P, transpose(H)), invert(S))

    x_next = add(x, matmul(K, v))

    # P <- (I - K H) P. Simple, and numerically the fragile form: rounding
    # can drive P non-symmetric and then indefinite, at which point the
    # filter reports impossible confidence.
    identity = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    factor = [[identity[i][j] - matmul(K, H)[i][j] for j in range(n)] for i in range(n)]
    P_next = matmul(factor, P)

    return x_next, P_next


def run(observations, x0, P0, F, H, Q, R):
    x, P = x0, P0
    states = []
    for y in observations:
        x, P = predict(x, P, F, Q)
        x, P = update(x, P, y, H, R)
        states.append(x)
    return states`,
        profile: 'O(n_x^3) per step in hand-written triple loops, and matmul(K, H) is recomputed inside the covariance update for every element.',
      },
      'make-it-right': {
        code: `"""Kalman filter - typed, Joseph form, log-likelihood accumulated."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import cho_factor, cho_solve

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class LinearGaussianModel:
    """The model: dynamics, observation, and the two noise covariances.

    Q and R are the only real tuning here, and their RATIO is what decides
    whether the filter trusts its own prediction or the measurement. Almost
    every field failure of a Kalman filter traces back to this rather than to
    the algorithm.
    """

    F: Matrix       # (n_x, n_x) state transition
    H: Matrix       # (n_y, n_x) observation
    Q: Matrix       # (n_x, n_x) process noise
    R: Matrix       # (n_y, n_y) measurement noise

    def __post_init__(self) -> None:
        if self.F.shape[0] != self.F.shape[1]:
            raise ValueError(f"F must be square, got {self.F.shape}")
        if self.H.shape[1] != self.F.shape[0]:
            raise ValueError(f"H has {self.H.shape[1]} columns but the state is {self.F.shape[0]}")
        if not np.allclose(self.Q, self.Q.T) or not np.allclose(self.R, self.R.T):
            raise ValueError("noise covariances must be symmetric")


@dataclass
class FilterState:
    mean: Vector
    covariance: Matrix
    log_likelihood: float = 0.0


def predict(state: FilterState, model: LinearGaussianModel) -> FilterState:
    """Uncertainty GROWS: time passing makes the estimate worse."""
    mean = model.F @ state.mean
    covariance = model.F @ state.covariance @ model.F.T + model.Q
    return FilterState(mean, _symmetrize(covariance), state.log_likelihood)


def update(state: FilterState, observation: Vector, model: LinearGaussianModel) -> FilterState:
    """Joseph form update, and the log-likelihood contribution for free."""
    innovation = observation - model.H @ state.mean
    S = model.H @ state.covariance @ model.H.T + model.R

    # Cholesky rather than an explicit inverse: S is symmetric positive
    # definite by construction, and its log-determinant - needed for the
    # likelihood - falls out of the factor at no extra cost.
    factor = cho_factor(S, lower=True)
    gain = cho_solve(factor, model.H @ state.covariance).T

    mean = state.mean + gain @ innovation

    # JOSEPH FORM: (I - KH) P (I - KH)^T + K R K^T.
    #
    # Algebraically identical to (I - KH) P, and numerically far better: it is
    # a sum of two symmetric positive-semidefinite terms, so it stays positive
    # definite under round-off. The simple form does not, and a covariance
    # that loses positive definiteness makes the filter report impossible
    # confidence and diverge - with nothing raised.
    identity = np.eye(state.mean.size)
    closed = identity - gain @ model.H
    covariance = closed @ state.covariance @ closed.T + gain @ model.R @ gain.T

    # Prediction-error decomposition: the filter produces the one-step
    # predictive density as it runs, so the likelihood costs nothing extra.
    lower = factor[0]
    log_det = 2.0 * np.log(np.diag(lower)).sum()
    quadratic = float(innovation @ cho_solve(factor, innovation))
    contribution = -0.5 * (log_det + quadratic + innovation.size * np.log(2.0 * np.pi))

    return FilterState(mean, _symmetrize(covariance), state.log_likelihood + contribution)


def _symmetrize(covariance: Matrix) -> Matrix:
    """Round-off makes P asymmetric, and asymmetric becomes indefinite."""
    return 0.5 * (covariance + covariance.T)


def run(
    observations: Matrix,
    initial: FilterState,
    model: LinearGaussianModel,
) -> tuple[list[FilterState], float]:
    """Filter a whole series. A missing observation is a skipped update - the
    state simply propagates and the uncertainty grows, which is one of the
    framework's genuine advantages over a lag-based model."""
    if observations.ndim != 2 or observations.shape[1] != model.H.shape[0]:
        raise ValueError(f"expected (T, {model.H.shape[0]}) observations, got {observations.shape}")

    state = initial
    history: list[FilterState] = []

    for observation in observations:
        state = predict(state, model)
        if np.isfinite(observation).all():
            state = update(state, observation, model)
        history.append(state)

    return history, state.log_likelihood`,
        rationale:
          'The covariance update changes to the Joseph form, and that is a correctness change rather than a stylistic one: it is algebraically identical to the simple form and numerically far better, because it is a sum of two positive-semidefinite terms and therefore stays positive definite under round-off. A covariance that loses positive definiteness makes the filter report impossible confidence and diverge with nothing raised, which is the failure this entry names as the most dangerous. The explicit inverse becomes a Cholesky solve, whose log-determinant supplies the likelihood contribution at no extra cost, and the covariance is symmetrized after every step since accumulated asymmetry is how indefiniteness begins.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n_x^3) per step in LAPACK, with the likelihood accumulated as a by-product of the solve.',
      },
      'make-it-fast': {
        code: `"""Kalman filter - steady-state gain, and vectorized across many tracks."""

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import solve_discrete_are

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


def steady_state_gain(F: Matrix, H: Matrix, Q: Matrix, R: Matrix) -> Matrix:
    """For a TIME-INVARIANT system the covariance recursion converges.

    P is a fixed point of the discrete algebraic Riccati equation, so after a
    transient the gain stops changing. Solving for that fixed point once
    removes the entire covariance propagation from the loop - the O(n_x^3)
    work per step disappears and each step becomes two matrix-vector products.

    The cost is that the transient is gone too: the filter no longer converges
    from an uncertain start, it simply begins at steady state. That is right
    for a long-running tracker and wrong for a filter that must recover from
    a bad initialization.
    """
    P = solve_discrete_are(F.T, H.T, Q, R)
    S = H @ P @ H.T + R
    return P @ H.T @ np.linalg.inv(S)


class BatchTracker:
    """Many independent filters, one interpreter iteration per timestep.

    A tracker runs hundreds of tracks with identical dynamics. Each is
    sequential in time, but they are completely INDEPENDENT of one another -
    so the loop over tracks disappears and only the loop over time remains,
    exactly as for a panel of time series.
    """

    def __init__(self, F: Matrix, H: Matrix, gain: Matrix, n_tracks: int) -> None:
        # One contiguous float64 block per operand: every step multiplies
        # against these, and a non-contiguous array forces a copy each time.
        self._F = np.ascontiguousarray(F, dtype=np.float64)
        self._H = np.ascontiguousarray(H, dtype=np.float64)
        self._K = np.ascontiguousarray(gain, dtype=np.float64)

        n_x = F.shape[0]
        # State for every track, allocated once and updated in place.
        self._state = np.zeros((n_tracks, n_x), dtype=np.float64)
        self._predicted = np.empty_like(self._state)
        self._innovation = np.empty((n_tracks, H.shape[0]), dtype=np.float64)

    def step(self, measurements: Matrix, valid: NDArray) -> Matrix:
        """One timestep for every track at once.

        measurements is (n_tracks, n_y); valid marks which tracks actually
        received one. A track with no measurement simply keeps its prediction,
        which is how occlusion is handled.
        """
        # Predict: state @ F.T is the batched form of F @ x for every track.
        np.matmul(self._state, self._F.T, out=self._predicted)

        # Innovation for every track, built in place.
        np.matmul(self._predicted, self._H.T, out=self._innovation)
        np.subtract(measurements, self._innovation, out=self._innovation)

        # Update only the tracks that were measured; the rest carry the
        # prediction forward untouched.
        np.copyto(self._state, self._predicted)
        if valid.any():
            self._state[valid] += self._innovation[valid] @ self._K.T

        return self._state

    def gate(self, measurements: Matrix, threshold: float, inverse_S: Matrix) -> NDArray:
        """Normalized innovation squared, for every track at once.

        Chi-squared distributed under a correct model, so the threshold comes
        from a distribution rather than a tuned multiple - which is what makes
        this gate principled and a distance cutoff not.
        """
        np.matmul(self._state, self._H.T, out=self._innovation)
        np.subtract(measurements, self._innovation, out=self._innovation)
        # v^T S^-1 v for every track, fused so the intermediate never exists.
        nis = np.einsum("ij,jk,ik->i", self._innovation, inverse_S, self._innovation)
        return nis < threshold`,
        rationale:
          'Two changes, and the first is algorithmic. For a time-invariant system the covariance recursion converges to a fixed point of the Riccati equation, so the gain stops changing — solving for it once removes the entire O(n_x^3) covariance propagation from the loop, and each step becomes two matrix-vector products. The trade is stated: the transient goes with it, so the filter begins at steady state rather than converging from an uncertain start. The second change is the same loop inversion the exponential-smoothing entry makes: a tracker runs hundreds of independent filters with identical dynamics, so the loop over tracks disappears and only the loop over time remains.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Hundreds of independent tracks are advanced as one batched matrix product per timestep, so the interpreter runs once per step rather than once per track per step.',
            tradeoff: 'Every track must share the same dynamics, observation model and gain — which rules out per-track tuning, and a tracker with genuinely different object classes has to batch them separately.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The state, prediction and innovation buffers are allocated once and rewritten every step, rather than allocating three arrays per timestep for the whole track set.',
            tradeoff: 'The buffers are shared mutable state on the object, so it is not reentrant, and the in-place chain reuses the innovation buffer for two different quantities in sequence.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The normalized innovation squared for every track is a single einsum, so the intermediate S-inverse-times-innovation product never exists as an array.',
            tradeoff: 'The einsum expresses a quadratic form in a way that is materially harder to read than two matrix products, and einsum will not always pick the optimal contraction order without being told.',
          },
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n_tracks * n_x^2) per timestep with no covariance work, versus O(n_tracks * n_x^3). Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Kalman filter - predict and update, transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <utility>
#include <vector>

using Matrix = std::vector<std::vector<double>>;

Matrix MatMul(const Matrix& a, const Matrix& b) {
  const std::size_t rows = a.size();
  const std::size_t inner = b.size();
  const std::size_t cols = b[0].size();
  Matrix out(rows, std::vector<double>(cols, 0.0));

  for (std::size_t i = 0; i < rows; ++i) {
    for (std::size_t j = 0; j < cols; ++j) {
      double total = 0.0;
      for (std::size_t k = 0; k < inner; ++k) total += a[i][k] * b[k][j];
      out[i][j] = total;
    }
  }
  return out;
}

Matrix Transpose(const Matrix& a) {
  Matrix out(a[0].size(), std::vector<double>(a.size(), 0.0));
  for (std::size_t i = 0; i < a.size(); ++i) {
    for (std::size_t j = 0; j < a[0].size(); ++j) out[j][i] = a[i][j];
  }
  return out;
}

Matrix Add(const Matrix& a, const Matrix& b) {
  Matrix out = a;
  for (std::size_t i = 0; i < a.size(); ++i) {
    for (std::size_t j = 0; j < a[0].size(); ++j) out[i][j] += b[i][j];
  }
  return out;
}

// Gauss-Jordan on the innovation covariance.
//
// In a real filter this matrix is the size of the MEASUREMENT, not the state,
// so it is usually 1x1 or 2x2 - which is why inverting it directly is
// acceptable and inverting the state covariance would not be.
Matrix Invert(Matrix a) {
  const std::size_t n = a.size();
  Matrix inverse(n, std::vector<double>(n, 0.0));
  for (std::size_t i = 0; i < n; ++i) inverse[i][i] = 1.0;

  for (std::size_t column = 0; column < n; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < n; ++row) {
      if (std::abs(a[row][column]) > std::abs(a[pivot][column])) pivot = row;
    }
    if (std::abs(a[pivot][column]) < 1e-12) {
      throw std::runtime_error("innovation covariance is singular");
    }
    std::swap(a[column], a[pivot]);
    std::swap(inverse[column], inverse[pivot]);

    const double divisor = a[column][column];
    for (std::size_t k = 0; k < n; ++k) {
      a[column][k] /= divisor;
      inverse[column][k] /= divisor;
    }

    for (std::size_t row = 0; row < n; ++row) {
      if (row == column) continue;
      const double factor = a[row][column];
      for (std::size_t k = 0; k < n; ++k) {
        a[row][k] -= factor * a[column][k];
        inverse[row][k] -= factor * inverse[column][k];
      }
    }
  }

  return inverse;
}

// x <- F x, P <- F P F^T + Q. Uncertainty GROWS: time passing makes the
// estimate worse, which is exactly what Q encodes.
void Predict(Matrix& x, Matrix& P, const Matrix& F, const Matrix& Q) {
  x = MatMul(F, x);
  P = Add(MatMul(MatMul(F, P), Transpose(F)), Q);
}

// The gain is prediction uncertainty over TOTAL uncertainty - the trust
// ratio, written as arithmetic.
void Update(Matrix& x, Matrix& P, const Matrix& y, const Matrix& H, const Matrix& R) {
  const Matrix predicted = MatMul(H, x);
  Matrix v(y.size(), std::vector<double>(1, 0.0));
  for (std::size_t i = 0; i < y.size(); ++i) v[i][0] = y[i][0] - predicted[i][0];

  // S = H P H^T + R: how surprised the filter was entitled to be.
  const Matrix S = Add(MatMul(MatMul(H, P), Transpose(H)), R);
  const Matrix K = MatMul(MatMul(P, Transpose(H)), Invert(S));

  x = Add(x, MatMul(K, v));

  // P <- (I - K H) P. Simple, and numerically the fragile form: rounding can
  // drive P asymmetric and then indefinite, at which point the filter reports
  // impossible confidence.
  const std::size_t n = x.size();
  const Matrix KH = MatMul(K, H);
  Matrix factor(n, std::vector<double>(n, 0.0));
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < n; ++j) factor[i][j] = (i == j ? 1.0 : 0.0) - KH[i][j];
  }
  P = MatMul(factor, P);
}`,
        profile: 'O(n_x^3) per step in hand-written triple loops, with a fresh matrix allocated for every intermediate product.',
      },
      'make-it-right': {
        code: `// Kalman filter - fixed-size matrices, Joseph form, likelihood, RAII.
#include <array>
#include <cmath>
#include <cstddef>
#include <numbers>
#include <stdexcept>

// Fixed-size at compile time. A filter state is four to twelve dimensions, so
// the sizes are known - which lets every matrix live on the stack, removes
// every allocation from the loop, and lets the compiler unroll the products
// completely.
template <std::size_t NX, std::size_t NY>
class KalmanFilter {
 public:
  using StateVector = std::array<double, NX>;
  using StateMatrix = std::array<std::array<double, NX>, NX>;
  using ObsMatrix = std::array<std::array<double, NX>, NY>;
  using NoiseMatrix = std::array<std::array<double, NY>, NY>;

  KalmanFilter(StateMatrix f, ObsMatrix h, StateMatrix q, NoiseMatrix r)
      : f_(f), h_(h), q_(q), r_(r) {
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < i; ++j) {
        if (std::abs(q_[i][j] - q_[j][i]) > 1e-12) {
          throw std::invalid_argument("process noise covariance must be symmetric");
        }
      }
    }
    for (std::size_t i = 0; i < NY; ++i) {
      for (std::size_t j = 0; j < i; ++j) {
        if (std::abs(r_[i][j] - r_[j][i]) > 1e-12) {
          throw std::invalid_argument("measurement noise covariance must be symmetric");
        }
      }
    }
  }

  void Predict() {
    StateVector next{};
    for (std::size_t i = 0; i < NX; ++i) {
      double total = 0.0;
      for (std::size_t j = 0; j < NX; ++j) total += f_[i][j] * x_[j];
      next[i] = total;
    }
    x_ = next;

    // P <- F P F^T + Q. Uncertainty GROWS.
    StateMatrix fp{};
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NX; ++j) {
        double total = 0.0;
        for (std::size_t k = 0; k < NX; ++k) total += f_[i][k] * p_[k][j];
        fp[i][j] = total;
      }
    }
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NX; ++j) {
        double total = q_[i][j];
        for (std::size_t k = 0; k < NX; ++k) total += fp[i][k] * f_[j][k];
        p_[i][j] = total;
      }
    }
    Symmetrize();
  }

  // Returns the log-likelihood contribution: the prediction-error
  // decomposition means the filter produces the one-step predictive density
  // as it runs, so the likelihood costs nothing extra.
  double Update(const std::array<double, NY>& y) {
    std::array<double, NY> innovation{};
    for (std::size_t i = 0; i < NY; ++i) {
      double predicted = 0.0;
      for (std::size_t j = 0; j < NX; ++j) predicted += h_[i][j] * x_[j];
      innovation[i] = y[i] - predicted;
    }

    // S = H P H^T + R, and PH^T reused for the gain.
    std::array<std::array<double, NY>, NX> pht{};
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NY; ++j) {
        double total = 0.0;
        for (std::size_t k = 0; k < NX; ++k) total += p_[i][k] * h_[j][k];
        pht[i][j] = total;
      }
    }

    NoiseMatrix s = r_;
    for (std::size_t i = 0; i < NY; ++i) {
      for (std::size_t j = 0; j < NY; ++j) {
        for (std::size_t k = 0; k < NX; ++k) s[i][j] += h_[i][k] * pht[k][j];
      }
    }

    NoiseMatrix chol = Cholesky(s);
    std::array<std::array<double, NY>, NX> gain{};
    for (std::size_t i = 0; i < NX; ++i) {
      std::array<double, NY> row{};
      for (std::size_t j = 0; j < NY; ++j) row[j] = pht[i][j];
      SolveCholesky(chol, row);
      gain[i] = row;
    }

    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NY; ++j) x_[i] += gain[i][j] * innovation[j];
    }

    JosephUpdate(gain);
    Symmetrize();

    double log_det = 0.0;
    for (std::size_t i = 0; i < NY; ++i) log_det += 2.0 * std::log(chol[i][i]);
    std::array<double, NY> weighted = innovation;
    SolveCholesky(chol, weighted);
    double quadratic = 0.0;
    for (std::size_t i = 0; i < NY; ++i) quadratic += innovation[i] * weighted[i];

    return -0.5 * (log_det + quadratic +
                   static_cast<double>(NY) * std::log(2.0 * std::numbers::pi));
  }

 private:
  // JOSEPH FORM: (I - KH) P (I - KH)^T + K R K^T.
  //
  // Algebraically identical to (I - KH) P and numerically far better: a sum
  // of two positive-semidefinite terms, so it stays positive definite under
  // round-off. The simple form does not, and a covariance that loses positive
  // definiteness makes the filter report impossible confidence and diverge -
  // with nothing raised anywhere.
  void JosephUpdate(const std::array<std::array<double, NY>, NX>& gain) {
    StateMatrix closed{};
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NX; ++j) {
        double total = (i == j) ? 1.0 : 0.0;
        for (std::size_t k = 0; k < NY; ++k) total -= gain[i][k] * h_[k][j];
        closed[i][j] = total;
      }
    }

    StateMatrix updated{};
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < NX; ++j) {
        double total = 0.0;
        for (std::size_t a = 0; a < NX; ++a) {
          for (std::size_t b = 0; b < NX; ++b) {
            total += closed[i][a] * p_[a][b] * closed[j][b];
          }
        }
        for (std::size_t a = 0; a < NY; ++a) {
          for (std::size_t b = 0; b < NY; ++b) {
            total += gain[i][a] * r_[a][b] * gain[j][b];
          }
        }
        updated[i][j] = total;
      }
    }
    p_ = updated;
  }

  // Round-off makes P asymmetric, and asymmetric becomes indefinite.
  void Symmetrize() {
    for (std::size_t i = 0; i < NX; ++i) {
      for (std::size_t j = 0; j < i; ++j) {
        const double average = 0.5 * (p_[i][j] + p_[j][i]);
        p_[i][j] = average;
        p_[j][i] = average;
      }
    }
  }

  [[nodiscard]] static NoiseMatrix Cholesky(NoiseMatrix a) {
    for (std::size_t j = 0; j < NY; ++j) {
      for (std::size_t k = 0; k < j; ++k) a[j][j] -= a[j][k] * a[j][k];
      if (a[j][j] <= 0.0) throw std::runtime_error("innovation covariance is not positive definite");
      a[j][j] = std::sqrt(a[j][j]);
      for (std::size_t i = j + 1; i < NY; ++i) {
        for (std::size_t k = 0; k < j; ++k) a[i][j] -= a[i][k] * a[j][k];
        a[i][j] /= a[j][j];
      }
    }
    return a;
  }

  static void SolveCholesky(const NoiseMatrix& chol, std::array<double, NY>& b) {
    for (std::size_t i = 0; i < NY; ++i) {
      for (std::size_t k = 0; k < i; ++k) b[i] -= chol[i][k] * b[k];
      b[i] /= chol[i][i];
    }
    for (std::size_t step = 0; step < NY; ++step) {
      const std::size_t i = NY - 1 - step;
      for (std::size_t k = i + 1; k < NY; ++k) b[i] -= chol[k][i] * b[k];
      b[i] /= chol[i][i];
    }
  }

  StateMatrix f_;
  ObsMatrix h_;
  StateMatrix q_;
  NoiseMatrix r_;
  StateVector x_{};
  StateMatrix p_{};
};`,
        rationale:
          'The covariance update becomes the Joseph form, which is a correctness change: algebraically identical to the simple form and numerically far better, because it is a sum of two positive-semidefinite terms and therefore stays positive definite under round-off — while the simple form does not, and an indefinite covariance makes the filter report impossible confidence and diverge silently. The explicit inverse becomes a Cholesky factorization that also supplies the likelihood’s log-determinant. Structurally, the dimensions move into the type: a filter state is four to twelve dimensions and known at compile time, so every matrix lives on the stack, the loop allocates nothing, and the compiler can unroll the products completely.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n_x^3) per step with everything on the stack and no allocation anywhere in the loop.',
      },
      'make-it-fast': {
        code: `// Kalman filter - steady-state gain, many tracks in parallel.
#include <Eigen/Dense>
#include <stdexcept>
#include <vector>

// For a TIME-INVARIANT system the covariance recursion converges.
//
// P is a fixed point of the discrete algebraic Riccati equation, so after a
// transient the gain stops changing. Solving for it once removes the entire
// covariance propagation from the loop - the O(n_x^3) work per step is gone
// and each step becomes two matrix-vector products.
//
// The transient goes with it: the filter no longer converges from an
// uncertain start, it begins at steady state. Right for a long-running
// tracker, wrong for one that must recover from a bad initialization.
Eigen::MatrixXd SteadyStateGain(const Eigen::MatrixXd& F, const Eigen::MatrixXd& H,
                                const Eigen::MatrixXd& Q, const Eigen::MatrixXd& R,
                                int iterations = 500, double tol = 1e-12) {
  Eigen::MatrixXd P = Q;

  for (int step = 0; step < iterations; ++step) {
    const Eigen::MatrixXd predicted = F * P * F.transpose() + Q;
    const Eigen::MatrixXd S = H * predicted * H.transpose() + R;
    const Eigen::MatrixXd gain = predicted * H.transpose() * S.inverse();
    const Eigen::MatrixXd next =
        predicted - gain * H * predicted;

    if ((next - P).cwiseAbs().maxCoeff() < tol) return gain;
    P = next;
  }

  throw std::runtime_error("Riccati recursion did not converge; the system may be unobservable");
}

// Many independent filters with identical dynamics - the shape of a tracker.
//
// Each filter is sequential in time, but the tracks are completely
// INDEPENDENT of one another, so the batch parallelizes across tracks. Storage
// is row-major with one track per row, which is the layout the per-track
// update wants.
using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

class BatchTracker {
 public:
  BatchTracker(Eigen::MatrixXd F, Eigen::MatrixXd H, Eigen::MatrixXd gain, int n_tracks)
      : f_(std::move(F)), h_(std::move(H)), gain_(std::move(gain)),
        state_(RowMajorMatrix::Zero(n_tracks, f_.rows())) {}

  // One timestep for every track. A track with no measurement keeps its
  // prediction, which is how occlusion is handled.
  void Step(const RowMajorMatrix& measurements, const std::vector<bool>& valid) {
    // Batched predict: state * F^T is F * x for every track at once, fused so
    // no intermediate state matrix is materialized.
    state_ = (state_ * f_.transpose()).eval();

    const RowMajorMatrix innovation =
        measurements - (state_ * h_.transpose());

#pragma omp parallel for schedule(static)
    for (Eigen::Index track = 0; track < state_.rows(); ++track) {
      if (!valid[static_cast<std::size_t>(track)]) continue;
      state_.row(track).noalias() += innovation.row(track) * gain_.transpose();
    }
  }

  [[nodiscard]] const RowMajorMatrix& state() const noexcept { return state_; }

 private:
  Eigen::MatrixXd f_;
  Eigen::MatrixXd h_;
  Eigen::MatrixXd gain_;
  RowMajorMatrix state_;
};`,
        rationale:
          'The algorithmic change dominates: for a time-invariant system the covariance recursion converges to a Riccati fixed point, so the gain becomes constant and the entire O(n_x^3) covariance propagation drops out of the loop — each step becomes two matrix-vector products. The trade is stated rather than hidden, since the transient goes with it and the filter no longer converges from an uncertain start. On top of that, the batch across tracks becomes the parallel axis, because a tracker runs hundreds of independent filters with identical dynamics while each individual filter stays sequential in time.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Tracks are fully independent within a timestep, each writing only its own row, so the update partitions across cores with no synchronization.',
            tradeoff: 'The per-track work is a handful of multiply-adds on a state of a dozen dimensions, so fork-join overhead can exceed it — this pays at hundreds of tracks and loses at ten.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The batched predict and the innovation are fused expressions evaluated in one pass, and noalias() on the per-track update writes straight into the state row.',
            tradeoff: 'noalias() is an unchecked assertion and the eval() on the predict is required precisely because the destination aliases an operand — forgetting one of those is a silent correctness bug rather than a slow one.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'One track per row means a track’s state is contiguous, which is what both the batched product and the per-track row update read.',
            tradeoff: 'Eigen defaults to column-major, so the choice must be carried explicitly through every type that touches the state — and a mixed-layout product silently costs a transpose.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n_tracks * n_x^2) per timestep with no covariance work. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Kalman filter - predict and update, transcribed.

pub type Matrix = Vec<Vec<f64>>;

pub fn matmul(a: &[Vec<f64>], b: &[Vec<f64>]) -> Matrix {
    let rows = a.len();
    let inner = b.len();
    let cols = b[0].len();
    let mut out = vec![vec![0.0; cols]; rows];

    for i in 0..rows {
        for j in 0..cols {
            let mut total = 0.0;
            for k in 0..inner {
                total += a[i][k] * b[k][j];
            }
            out[i][j] = total;
        }
    }
    out
}

pub fn transpose(a: &[Vec<f64>]) -> Matrix {
    let mut out = vec![vec![0.0; a.len()]; a[0].len()];
    for i in 0..a.len() {
        for j in 0..a[0].len() {
            out[j][i] = a[i][j];
        }
    }
    out
}

pub fn add(a: &[Vec<f64>], b: &[Vec<f64>]) -> Matrix {
    let mut out = a.to_vec();
    for i in 0..a.len() {
        for j in 0..a[0].len() {
            out[i][j] += b[i][j];
        }
    }
    out
}

/// Gauss-Jordan on the innovation covariance.
///
/// In a real filter this matrix is the size of the MEASUREMENT, not the state,
/// so it is usually 1x1 or 2x2 - which is why inverting it directly is
/// acceptable and inverting the state covariance would not be.
pub fn invert(mut a: Matrix) -> Matrix {
    let n = a.len();
    let mut inverse = vec![vec![0.0; n]; n];
    for i in 0..n {
        inverse[i][i] = 1.0;
    }

    for column in 0..n {
        let mut pivot = column;
        for row in (column + 1)..n {
            if a[row][column].abs() > a[pivot][column].abs() {
                pivot = row;
            }
        }
        assert!(a[pivot][column].abs() > 1e-12, "innovation covariance is singular");
        a.swap(column, pivot);
        inverse.swap(column, pivot);

        let divisor = a[column][column];
        for k in 0..n {
            a[column][k] /= divisor;
            inverse[column][k] /= divisor;
        }

        for row in 0..n {
            if row == column {
                continue;
            }
            let factor = a[row][column];
            for k in 0..n {
                a[row][k] -= factor * a[column][k];
                inverse[row][k] -= factor * inverse[column][k];
            }
        }
    }

    inverse
}

/// x <- F x, P <- F P F^T + Q. Uncertainty GROWS: time passing makes the
/// estimate worse, which is exactly what Q encodes.
pub fn predict(x: &Matrix, p: &Matrix, f: &Matrix, q: &Matrix) -> (Matrix, Matrix) {
    let x_next = matmul(f, x);
    let p_next = add(&matmul(&matmul(f, p), &transpose(f)), q);
    (x_next, p_next)
}

/// The gain is prediction uncertainty over TOTAL uncertainty - the trust
/// ratio, written as arithmetic.
pub fn update(
    x: &Matrix,
    p: &Matrix,
    y: &Matrix,
    h: &Matrix,
    r: &Matrix,
) -> (Matrix, Matrix) {
    let predicted = matmul(h, x);
    let v: Matrix = (0..y.len()).map(|i| vec![y[i][0] - predicted[i][0]]).collect();

    // S = H P H^T + R: how surprised the filter was entitled to be.
    let s = add(&matmul(&matmul(h, p), &transpose(h)), r);
    let k = matmul(&matmul(p, &transpose(h)), &invert(s));

    let x_next = add(x, &matmul(&k, &v));

    // P <- (I - K H) P. Simple, and numerically the fragile form: rounding can
    // drive P asymmetric and then indefinite, at which point the filter
    // reports impossible confidence.
    let n = x.len();
    let kh = matmul(&k, h);
    let factor: Matrix = (0..n)
        .map(|i| (0..n).map(|j| if i == j { 1.0 } else { 0.0 } - kh[i][j]).collect())
        .collect();
    let p_next = matmul(&factor, p);

    (x_next, p_next)
}`,
        profile: 'O(n_x^3) per step with every index bounds-checked and a fresh Vec-of-Vec allocated for each intermediate product.',
      },
      'make-it-right': {
        code: `//! Kalman filter - const-generic dimensions, Joseph form, typed errors.

use std::f64::consts::PI;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FilterError {
    NotSymmetric { name: &'static str },
    NotPositiveDefinite,
    NonFinite { index: usize },
}

impl fmt::Display for FilterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotSymmetric { name } => write!(f, "{name} must be symmetric"),
            Self::NotPositiveDefinite => write!(
                f,
                "innovation covariance is not positive definite - the filter has diverged \
                 or the noise model is inconsistent"
            ),
            Self::NonFinite { index } => write!(f, "non-finite measurement at index {index}"),
        }
    }
}

impl std::error::Error for FilterError {}

/// Dimensions as const generics: a filter state is four to twelve dimensions
/// and known at compile time, so every matrix is a fixed-size array on the
/// stack - no allocation anywhere in the loop, and a shape mismatch is a
/// compile error rather than a runtime one.
pub struct KalmanFilter<const NX: usize, const NY: usize> {
    f: [[f64; NX]; NX],
    h: [[f64; NX]; NY],
    q: [[f64; NX]; NX],
    r: [[f64; NY]; NY],
    x: [f64; NX],
    p: [[f64; NX]; NX],
}

impl<const NX: usize, const NY: usize> KalmanFilter<NX, NY> {
    pub fn new(
        f: [[f64; NX]; NX],
        h: [[f64; NX]; NY],
        q: [[f64; NX]; NX],
        r: [[f64; NY]; NY],
        x: [f64; NX],
        p: [[f64; NX]; NX],
    ) -> Result<Self, FilterError> {
        for i in 0..NX {
            for j in 0..i {
                if (q[i][j] - q[j][i]).abs() > 1e-12 {
                    return Err(FilterError::NotSymmetric { name: "Q" });
                }
            }
        }
        for i in 0..NY {
            for j in 0..i {
                if (r[i][j] - r[j][i]).abs() > 1e-12 {
                    return Err(FilterError::NotSymmetric { name: "R" });
                }
            }
        }
        Ok(Self { f, h, q, r, x, p })
    }

    /// x <- F x, P <- F P F^T + Q. Uncertainty GROWS.
    pub fn predict(&mut self) {
        let mut next = [0.0_f64; NX];
        for i in 0..NX {
            next[i] = (0..NX).map(|j| self.f[i][j] * self.x[j]).sum();
        }
        self.x = next;

        let mut fp = [[0.0_f64; NX]; NX];
        for i in 0..NX {
            for j in 0..NX {
                fp[i][j] = (0..NX).map(|k| self.f[i][k] * self.p[k][j]).sum();
            }
        }
        for i in 0..NX {
            for j in 0..NX {
                self.p[i][j] =
                    self.q[i][j] + (0..NX).map(|k| fp[i][k] * self.f[j][k]).sum::<f64>();
            }
        }
        self.symmetrize();
    }

    /// Returns the log-likelihood contribution. The prediction-error
    /// decomposition means the filter produces the one-step predictive density
    /// as it runs, so the likelihood costs nothing extra.
    pub fn update(&mut self, y: &[f64; NY]) -> Result<f64, FilterError> {
        if let Some(index) = y.iter().position(|value| !value.is_finite()) {
            return Err(FilterError::NonFinite { index });
        }

        let mut innovation = [0.0_f64; NY];
        for i in 0..NY {
            let predicted: f64 = (0..NX).map(|j| self.h[i][j] * self.x[j]).sum();
            innovation[i] = y[i] - predicted;
        }

        // P H^T, reused for both S and the gain.
        let mut pht = [[0.0_f64; NY]; NX];
        for i in 0..NX {
            for j in 0..NY {
                pht[i][j] = (0..NX).map(|k| self.p[i][k] * self.h[j][k]).sum();
            }
        }

        let mut s = self.r;
        for i in 0..NY {
            for j in 0..NY {
                s[i][j] += (0..NX).map(|k| self.h[i][k] * pht[k][j]).sum::<f64>();
            }
        }

        let chol = Self::cholesky(s)?;
        let mut gain = [[0.0_f64; NY]; NX];
        for i in 0..NX {
            let mut row = pht[i];
            Self::solve_cholesky(&chol, &mut row);
            gain[i] = row;
        }

        for i in 0..NX {
            self.x[i] += (0..NY).map(|j| gain[i][j] * innovation[j]).sum::<f64>();
        }

        self.joseph_update(&gain);
        self.symmetrize();

        let log_det: f64 = (0..NY).map(|i| 2.0 * chol[i][i].ln()).sum();
        let mut weighted = innovation;
        Self::solve_cholesky(&chol, &mut weighted);
        let quadratic: f64 = innovation.iter().zip(&weighted).map(|(a, b)| a * b).sum();

        Ok(-0.5 * (log_det + quadratic + NY as f64 * (2.0 * PI).ln()))
    }

    /// JOSEPH FORM: (I - KH) P (I - KH)^T + K R K^T.
    ///
    /// Algebraically identical to (I - KH) P and numerically far better: a sum
    /// of two positive-semidefinite terms, so it stays positive definite under
    /// round-off. The simple form does not, and a covariance that loses
    /// positive definiteness makes the filter report impossible confidence and
    /// diverge - with nothing raised anywhere.
    fn joseph_update(&mut self, gain: &[[f64; NY]; NX]) {
        let mut closed = [[0.0_f64; NX]; NX];
        for i in 0..NX {
            for j in 0..NX {
                let identity = if i == j { 1.0 } else { 0.0 };
                closed[i][j] =
                    identity - (0..NY).map(|k| gain[i][k] * self.h[k][j]).sum::<f64>();
            }
        }

        let mut updated = [[0.0_f64; NX]; NX];
        for i in 0..NX {
            for j in 0..NX {
                let mut total = 0.0;
                for a in 0..NX {
                    for b in 0..NX {
                        total += closed[i][a] * self.p[a][b] * closed[j][b];
                    }
                }
                for a in 0..NY {
                    for b in 0..NY {
                        total += gain[i][a] * self.r[a][b] * gain[j][b];
                    }
                }
                updated[i][j] = total;
            }
        }
        self.p = updated;
    }

    /// Round-off makes P asymmetric, and asymmetric becomes indefinite.
    fn symmetrize(&mut self) {
        for i in 0..NX {
            for j in 0..i {
                let average = 0.5 * (self.p[i][j] + self.p[j][i]);
                self.p[i][j] = average;
                self.p[j][i] = average;
            }
        }
    }

    fn cholesky(mut a: [[f64; NY]; NY]) -> Result<[[f64; NY]; NY], FilterError> {
        for j in 0..NY {
            for k in 0..j {
                a[j][j] -= a[j][k] * a[j][k];
            }
            if a[j][j] <= 0.0 {
                return Err(FilterError::NotPositiveDefinite);
            }
            a[j][j] = a[j][j].sqrt();

            for i in (j + 1)..NY {
                for k in 0..j {
                    a[i][j] -= a[i][k] * a[j][k];
                }
                a[i][j] /= a[j][j];
            }
        }
        Ok(a)
    }

    fn solve_cholesky(chol: &[[f64; NY]; NY], b: &mut [f64; NY]) {
        for i in 0..NY {
            for k in 0..i {
                b[i] -= chol[i][k] * b[k];
            }
            b[i] /= chol[i][i];
        }
        for step in 0..NY {
            let i = NY - 1 - step;
            for k in (i + 1)..NY {
                b[i] -= chol[k][i] * b[k];
            }
            b[i] /= chol[i][i];
        }
    }
}
`,
        rationale:
          'The covariance update becomes the Joseph form, which is a correctness change rather than a stylistic one: it is a sum of two positive-semidefinite terms and stays positive definite under round-off, where the simple form does not — and an indefinite covariance makes the filter report impossible confidence and diverge with nothing raised. The explicit inverse becomes a Cholesky factorization whose log-determinant also supplies the likelihood. Dimensions move into the type as const generics, so every matrix is a stack array, a shape mismatch is a compile error, and the loop allocates nothing. Errors become a typed Result covering the non-positive-definite case, which is the filter telling you it has diverged.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n_x^3) per step entirely on the stack, with no allocation and no bounds checks on fixed-size arrays.',
      },
      'make-it-fast': {
        code: `//! Kalman filter - steady-state gain, tracks advanced in parallel.

use rayon::prelude::*;

/// For a TIME-INVARIANT system the covariance recursion converges.
///
/// P is a fixed point of the discrete algebraic Riccati equation, so after a
/// transient the gain stops changing. Iterating to that fixed point once
/// removes the entire covariance propagation from the loop - the O(n_x^3)
/// work per step disappears and each step becomes two matrix-vector products.
///
/// The transient goes with it: the filter no longer converges from an
/// uncertain start, it begins at steady state. Right for a long-running
/// tracker, wrong for one that must recover from a bad initialization.
#[must_use]
pub fn steady_state_gain<const NX: usize, const NY: usize>(
    f: &[[f64; NX]; NX],
    h: &[[f64; NX]; NY],
    q: &[[f64; NX]; NX],
    r: &[[f64; NY]; NY],
    iterations: usize,
    tol: f64,
) -> Option<[[f64; NY]; NX]> {
    let mut p = *q;

    for _ in 0..iterations {
        // P <- F P F^T + Q
        let mut fp = [[0.0_f64; NX]; NX];
        for i in 0..NX {
            for j in 0..NX {
                fp[i][j] = (0..NX).map(|k| f[i][k] * p[k][j]).sum();
            }
        }
        let mut predicted = [[0.0_f64; NX]; NX];
        for i in 0..NX {
            for j in 0..NX {
                predicted[i][j] = q[i][j] + (0..NX).map(|k| fp[i][k] * f[j][k]).sum::<f64>();
            }
        }

        // S = H P H^T + R, then K = P H^T S^-1 by a small Cholesky solve.
        let mut pht = [[0.0_f64; NY]; NX];
        for i in 0..NX {
            for j in 0..NY {
                pht[i][j] = (0..NX).map(|k| predicted[i][k] * h[j][k]).sum();
            }
        }
        let mut s = *r;
        for i in 0..NY {
            for j in 0..NY {
                s[i][j] += (0..NX).map(|k| h[i][k] * pht[k][j]).sum::<f64>();
            }
        }

        let chol = cholesky::<NY>(s)?;
        let mut gain = [[0.0_f64; NY]; NX];
        for i in 0..NX {
            let mut row = pht[i];
            solve_cholesky::<NY>(&chol, &mut row);
            gain[i] = row;
        }

        // P <- P - K H P
        let mut next = predicted;
        for i in 0..NX {
            for j in 0..NX {
                let correction: f64 = (0..NY)
                    .map(|a| gain[i][a] * (0..NX).map(|k| h[a][k] * predicted[k][j]).sum::<f64>())
                    .sum();
                next[i][j] -= correction;
            }
        }

        let shift = (0..NX)
            .flat_map(|i| (0..NX).map(move |j| (i, j)))
            .map(|(i, j)| (next[i][j] - p[i][j]).abs())
            .fold(0.0_f64, f64::max);

        p = next;
        if shift < tol {
            return Some(gain);
        }
    }

    None      // did not converge: the system may be unobservable
}

/// Many independent filters with identical dynamics - the shape of a tracker.
///
/// Each filter is sequential in time, but the tracks are completely
/// INDEPENDENT of one another, so a timestep across the whole track set is a
/// parallel map. \`states\` is row-major with one track per row, which is the
/// layout the per-track update wants.
pub fn step_batch<const NX: usize, const NY: usize>(
    states: &mut [[f64; NX]],
    measurements: &[[f64; NY]],
    valid: &[bool],
    f: &[[f64; NX]; NX],
    h: &[[f64; NX]; NY],
    gain: &[[f64; NY]; NX],
) {
    states
        .par_iter_mut()
        .zip(measurements.par_iter())
        .zip(valid.par_iter())
        .for_each(|((state, measurement), &is_valid)| {
            // Predict.
            let mut predicted = [0.0_f64; NX];
            for i in 0..NX {
                predicted[i] = (0..NX).map(|j| f[i][j] * state[j]).sum();
            }

            if !is_valid {
                // No measurement: keep the prediction. This is how an
                // occlusion is handled, and it costs nothing.
                *state = predicted;
                return;
            }

            // Innovation, then the constant-gain correction.
            let mut innovation = [0.0_f64; NY];
            for i in 0..NY {
                let expected: f64 = (0..NX).map(|j| h[i][j] * predicted[j]).sum();
                innovation[i] = measurement[i] - expected;
            }

            for i in 0..NX {
                predicted[i] += (0..NY).map(|j| gain[i][j] * innovation[j]).sum::<f64>();
            }
            *state = predicted;
        });
}

fn cholesky<const N: usize>(mut a: [[f64; N]; N]) -> Option<[[f64; N]; N]> {
    for j in 0..N {
        for k in 0..j {
            a[j][j] -= a[j][k] * a[j][k];
        }
        if a[j][j] <= 0.0 {
            return None;
        }
        a[j][j] = a[j][j].sqrt();
        for i in (j + 1)..N {
            for k in 0..j {
                a[i][j] -= a[i][k] * a[j][k];
            }
            a[i][j] /= a[j][j];
        }
    }
    Some(a)
}

fn solve_cholesky<const N: usize>(chol: &[[f64; N]; N], b: &mut [f64; N]) {
    for i in 0..N {
        for k in 0..i {
            b[i] -= chol[i][k] * b[k];
        }
        b[i] /= chol[i][i];
    }
    for step in 0..N {
        let i = N - 1 - step;
        for k in (i + 1)..N {
            b[i] -= chol[k][i] * b[k];
        }
        b[i] /= chol[i][i];
    }
}
`,
        rationale:
          'The algorithmic change dominates: for a time-invariant system the covariance recursion converges to a Riccati fixed point, so the gain becomes constant and the whole O(n_x^3) covariance propagation drops out of the per-step loop, leaving two matrix-vector products. The trade is named rather than hidden — the transient goes with it, so the filter starts at steady state instead of converging from an uncertain one. The parallelism then goes on the only axis that has any: a tracker runs hundreds of independent filters with identical dynamics, and each is sequential in time while the set is a parallel map.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Tracks are fully independent within a timestep and each writes only its own state, so the batch is a parallel map with no locking and no atomics.',
            tradeoff: 'There is no parallelism inside a single filter, and the per-track work is a dozen multiply-adds — so this pays at hundreds of tracks and loses to fork-join overhead at ten.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'One fixed-size array per track means each state is contiguous and the whole per-track update touches a single cache line or two.',
            tradeoff: 'Commits every track to the same state dimension at compile time, so a tracker with genuinely different motion models needs separate batches rather than one heterogeneous set.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The Cholesky solve and the per-track update are small and called in a tight loop, so inlining lets the fixed-size arrays stay in registers rather than round-tripping through the stack.',
            tradeoff: 'Inlining fixed-size matrix code into every call site grows the instruction footprint quickly, and with a larger state the unrolled loops stop fitting in the instruction cache.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n_tracks * n_x^2 / cores) per timestep with no covariance work. Illustrative, not a measured benchmark.',
      },
    },
  },
};
