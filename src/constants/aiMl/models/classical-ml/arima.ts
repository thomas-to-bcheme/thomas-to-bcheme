import type { AiMlModel } from '../../types';

/**
 * ARIMA / SARIMAX — the entry where the observations stop being exchangeable.
 *
 * Opens the classical-time-series group, whose whole premise is the assumption
 * every earlier group discards: the data is ordered, and each observation
 * depends on the ones before it. ARIMA models that dependence directly rather
 * than reconstructing it from lag features, which is the difference between it
 * and a regression on lags — and the reason its forecast intervals mean
 * something.
 */
export const ARIMA: AiMlModel = {
  slug: 'arima',
  name: 'ARIMA / SARIMAX',
  aliases: ['Box-Jenkins', 'SARIMA', 'SARIMAX', 'ARMA', 'auto.arima'],
  category: 'classical-ml',
  group: 'classical-time-series',
  kind: 'model',

  paradigms: ['supervised'],
  // 'anomaly-detection' because scoring residuals against the model's own
  // predictive interval is the classical detector — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'sequence-modeling', 'anomaly-detection'],
  paradigmNote:
    'The target is the series’ own next value, which some would call self-supervised. It is listed as supervised because the fit is an ordinary conditional likelihood over observed targets; what makes it a time-series model is not the supervision but the assumption that the errors are serially dependent.',

  intuition:
    'Three ideas stacked, and the acronym is in the wrong order for how they are applied. First integrate: difference the series until it is stationary, because everything that follows assumes the statistical behaviour does not drift. Then autoregress: predict the differenced value from its own recent values. Then add moving average: also predict it from the recent forecast ERRORS, which is how the model absorbs shocks that persist for a few periods without permanently changing the level. The AR part remembers where the series was; the MA part remembers where the model was wrong. That second memory is what distinguishes ARIMA from a regression on lag features, and it is why its intervals are calibrated rather than optimistic.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\ell(\\phi, \\theta, \\sigma^2) = -\\frac{n}{2}\\log(2\\pi\\sigma^2) - \\frac{1}{2\\sigma^2}\\sum_{t=1}^{n} \\varepsilon_t^2, \\qquad \\varepsilon_t = w_t - \\sum_{i=1}^{p}\\phi_i w_{t-i} - \\sum_{j=1}^{q}\\theta_j \\varepsilon_{t-j}',
      symbols: [
        { symbol: 'w_t', meaning: 'the differenced series — the original after d differences, which is what the model is actually fitted to' },
        { symbol: '\\phi_i', meaning: 'autoregressive coefficients: how much of the last p values carries forward' },
        { symbol: '\\theta_j', meaning: 'moving-average coefficients: how much of the last q ERRORS carries forward' },
        { symbol: '\\varepsilon_t', meaning: 'the innovation at t — not observed, computed recursively, which is what makes the likelihood non-linear in theta' },
      ],
    },
    reading:
      'Under Gaussian innovations, maximizing the likelihood is minimizing the sum of squared one-step-ahead forecast errors. The recursion beneath it is where the difficulty lives: epsilon_t depends on epsilon_{t-1}, which depends on epsilon_{t-2}, so the errors are not observed quantities but consequences of the parameters. That makes the objective non-linear in theta and rules out a closed form, which is why ARIMA needs a numerical optimizer while a plain autoregression does not. It also means the first few residuals depend on assumed starting values, and the difference between the conditional and exact likelihood is precisely how those are handled.',
  },

  optimization: {
    method: 'Maximum likelihood via the Kalman filter (exact) or conditional sum of squares (approximate), with order selection by AIC',
    updateRule: {
      formula:
        '\\phi(B)\\,(1 - B)^d\\, y_t = \\theta(B)\\,\\varepsilon_t, \\qquad \\phi(B) = 1 - \\phi_1 B - \\cdots - \\phi_p B^p, \\quad \\theta(B) = 1 + \\theta_1 B + \\cdots + \\theta_q B^q',
      symbols: [
        { symbol: 'B', meaning: 'the backshift operator: B y_t = y_{t-1}, which turns the recursion into polynomial algebra' },
        { symbol: '(1 - B)^d', meaning: 'differencing d times — the I in ARIMA, applied before anything else' },
        { symbol: '\\phi(B), \\theta(B)', meaning: 'the AR and MA polynomials; their roots must lie outside the unit circle for stationarity and invertibility' },
        { symbol: '\\varepsilon_t', meaning: 'white noise — and the diagnostic that decides whether the model is adequate is whether the residuals look like it' },
      ],
    },
    rationale:
      'The likelihood has no closed form because the innovations are recursive in the parameters, so estimation is numerical — usually L-BFGS over a handful of coefficients, which is cheap because there are rarely more than half a dozen. Two implementation choices carry real consequences. The exact likelihood is computed by casting the model into state-space form and running a Kalman filter, which handles the unknown pre-sample values properly; conditional sum of squares just assumes them zero, which is faster and biased on short series. And the parameters are constrained: the AR and MA polynomial roots must sit outside the unit circle, or the model is non-stationary or non-invertible and the fitted coefficients are meaningless even though the optimizer was perfectly happy. Order selection is a separate search, and AIC over a grid — what auto.arima does — has almost entirely replaced reading ACF and PACF plots by hand.',
    hyperparameters: [
      { name: '(p, d, q)', role: 'AR order, differencing order, MA order. The modelling decision, now usually chosen by an AIC search rather than by inspection', typicalRange: 'p, q in 0-5; d in 0-2, and d above 2 almost always means something else is wrong' },
      { name: '(P, D, Q, m)', role: 'Seasonal orders at period m. The seasonal difference D is usually the single most consequential setting on a seasonal series' },
      { name: 'trend / drift', role: 'Whether to include a constant. With d = 1 a constant becomes a linear drift in the forecast, which is a large modelling commitment disguised as a flag' },
      { name: 'exogenous regressors (the X)', role: 'External drivers entering linearly. This is what makes SARIMAX a regression with ARIMA errors, and it is how holidays and promotions are handled properly' },
      { name: 'estimation method', role: 'Exact MLE via Kalman filter, or conditional sum of squares. CSS is faster and noticeably biased on short series' },
    ],
    convergence:
      'The optimizer converges reliably over a handful of parameters, but the surface has real pathologies. Near-cancelling AR and MA roots make the likelihood almost flat — an ARMA(2,2) whose polynomials nearly share a factor is effectively over-parameterized, the optimizer wanders, and the fitted coefficients are unstable while the forecast is fine. Over-differencing is the other named failure: differencing a stationary series does not break the forecast but inflates the variance and induces spurious MA structure, so the model becomes more complicated for no gain. And the diagnostic that actually matters is not convergence at all but whether the residuals are white noise — a Ljung-Box test on the residual autocorrelations, which is what tells you the model has extracted the structure rather than merely fitted it.',
    complexity:
      'Estimation: O(n) per likelihood evaluation for CSS, or O(n·r^2) for the Kalman filter where r is the state dimension, times however many evaluations the optimizer needs — typically tens to low hundreds. An AIC grid over orders multiplies that by the grid size, which is what makes auto.arima the expensive part. Memory O(n). Forecasting is O(h) recursion. The binding constraint is not any of these but that the model is fitted per series, so a million series is a million fits.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'This is the domain’s reference model. Difference until stationary, choose orders by AIC over a grid, estimate by maximum likelihood, then check the residuals are white noise before believing anything. The forecast is generated by iterating the recursion forward, with the intervals following analytically from the accumulated innovation variance — which is why they widen with horizon in a way a bootstrapped interval only approximates.',
        where: [
          'Univariate forecasting where the autocorrelation structure carries most of the signal and the history is long enough to estimate it',
          'Macroeconomic and financial series, where the Box-Jenkins framework originated and remains the standard vocabulary',
          'SARIMAX with exogenous drivers, which is how price, promotion and holiday effects are handled without breaking the error structure',
          'The benchmark any newer forecaster is expected to beat, and frequently does not',
        ],
        why: 'It models serial dependence explicitly rather than approximating it with lag features, which is what makes the prediction intervals calibrated rather than optimistic. That distinction matters more than point accuracy in most operational settings, because the decision downstream is usually about a quantile. The reasons against it are equally concrete: it needs a reasonably long, reasonably stable history; it handles one seasonality and not several; and it is fitted one series at a time, so a catalogue of a million SKUs is a million optimizations. The M-competition results are worth internalizing here — simple exponential smoothing frequently beats a well-fitted ARIMA on real business data, and the field has largely accepted that.',
        featurization: [
          'Determine d by a unit-root test rather than by eye, and stop as soon as the series is stationary — over-differencing costs variance for nothing',
          'Seasonal differencing before regular differencing on a strongly seasonal series; the order of operations changes the result',
          'Stabilize the variance first with a log or Box-Cox transform when the amplitude grows with the level, which the additive model cannot represent',
          'Put holidays, promotions and known interventions in as exogenous regressors rather than letting them contaminate the error structure',
        ],
        evaluation:
          'Rolling-origin backtesting scored with MASE against a seasonal-naive baseline, plus interval coverage — an 80% interval should contain about 80% of held-out points, and if it does not the error assumptions are wrong rather than the orders. Run Ljung-Box on the residuals: leftover autocorrelation means structure the model has not captured, which no accuracy metric will surface.',
        pitfalls: [
          'Selecting orders on the full series before splitting, which is a leak that looks like skill',
          'Over-differencing, which inflates variance and induces spurious MA terms while nothing looks obviously wrong',
          'Trusting intervals when the residuals are heteroscedastic or fat-tailed, which on financial data they always are',
          'Long horizons: with d = 0 the forecast reverts to the mean and with d = 1 it extends a straight line, and neither is a statement about the world beyond a few periods',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Fit on a clean period, then score each new observation by its standardized one-step-ahead forecast error. The model supplies the expectation and, unlike a plain regression on lags, an innovation variance that is estimated as part of the fit — so the threshold can be expressed in units the model itself defines rather than in an arbitrary multiple of a residual standard deviation.',
        where: [
          'Monitoring business and infrastructure metrics that have genuine trend and seasonality, where a static threshold alarms every Monday morning',
          'Intervention detection: a permanent level shift shows up as a run of same-signed innovations rather than as one large one',
          'Data-quality checks on reported series, where a missed or duplicated period breaks the autocorrelation structure',
        ],
        why: 'It is the right detector when normal behaviour is itself time-varying, because it removes trend and seasonality before scoring rather than trying to threshold around them. The distinction between an outlier and a level shift also falls out of the residual pattern, which most detectors cannot express. Against it: one model per series does not scale to a large fleet, refits are needed as the process drifts, and the Gaussian innovation assumption is what the threshold rests on — on a heavy-tailed series it fires far more than the nominal rate.',
        featurization: [
          'Fit on a confirmed-clean window; a large outlier in the training period contaminates the coefficient estimates as well as the variance',
          'Difference and deseasonalize through the model rather than beforehand, so the innovation variance reflects what the model actually does not know',
          'Score standardized innovations, not raw residuals, so the threshold is comparable across series',
        ],
        evaluation:
          'Precision@k against confirmed incidents, plus a calibration check on clean data — the standardized innovations should look standard normal, and if they do not, the model is mis-specified and any threshold on them is arbitrary.',
        pitfalls: [
          'A single large outlier absorbed into the fit, inflating the innovation variance until nothing is anomalous afterwards',
          'Level shifts scored as one anomaly and then treated as normal, when the informative signal is the run of residuals that follows',
          'Refit cadence: the model that defines normal drifts with the process, and nobody schedules a review of a forecaster',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Upstream rather than as a solver. Inventory, staffing and capacity decisions are constrained optimizations whose objective coefficients are demand forecasts, and the quantity those optimizers actually consume is a quantile rather than a mean — safety stock is set from the forecast distribution at a service level, not from the point forecast. ARIMA supplies that distribution analytically, which is why it sits underneath so many planning systems.',
        where: [
          'Safety-stock and reorder-point calculation, where the service level maps directly onto a forecast quantile',
          'Staffing and capacity planning, where the cost of under-provisioning differs sharply from over-provisioning',
          'Any newsvendor-shaped decision, whose optimal order quantity is a quantile of the demand distribution',
        ],
        why: 'The reason to care about the interval rather than the point is that the downstream cost is asymmetric: running out and holding excess are not equally expensive, so the optimal decision is a quantile whose position depends on that ratio. A forecaster that reports only a mean forces the planner to invent an uncertainty estimate, and they usually invent a bad one. What ARIMA cannot do is optimize anything itself — it is an input, and a decision built on it inherits every one of its assumptions, including that the innovations are Gaussian.',
        featurization: [
          'Forecast at the aggregation level the decision is made at; forecasting daily and summing to weekly understates the variance the planner needs',
          'Propagate the multi-step forecast variance rather than scaling the one-step variance by the horizon, which is wrong for any non-trivial model',
          'Include lead time in the horizon — the relevant distribution is demand over the replenishment window, not over one period',
        ],
        evaluation:
          'Evaluate the decision, not the forecast: realized service level and holding cost under the plan. A forecast that improves MASE and worsens the achieved service level has optimized the wrong quantity, and this happens.',
        pitfalls: [
          'Feeding a point forecast into a quantile-shaped decision and adding an arbitrary safety factor',
          'Assuming Gaussian innovations when computing a high quantile, where the tail assumption dominates the answer',
          'Optimizing against a forecast whose intervals were never validated for coverage',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'The forecasting layer inside operational planning. Demand, arrival rates, load and throughput are forecast per series with seasonal orders capturing the weekly and annual cycles, exogenous regressors capturing known events, and the resulting distribution feeding whatever schedules, orders or provisions capacity. It is also the standard model for the disturbance process in classical process control.',
        where: [
          'Demand planning and replenishment across retail and distribution',
          'Call-centre and service-desk arrival forecasting for staffing',
          'Utility load forecasting, where the daily and annual seasonalities are strong and stable',
          'Modelling the disturbance in a control loop, where minimum-variance control is derived directly from an ARIMA disturbance model',
        ],
        why: 'Operational series are exactly what the method assumes: regularly sampled, strongly autocorrelated, seasonal, and long enough to estimate a handful of parameters. The intervals are the deliverable more often than the means, because the decisions are quantile-shaped. The limits show up at scale and at complexity — one fit per series makes a large catalogue expensive, and a series with multiple overlapping seasonalities, irregular holidays or frequent promotions needs either a large exogenous block or a different model entirely.',
        featurization: [
          'Seasonal orders at the dominant period, with additional cycles handled by Fourier regressors rather than by a second seasonal term the model does not support',
          'Holiday and promotion indicators as exogenous regressors, including leads and lags around the event',
          'Aggregate very sparse or intermittent series, where the Gaussian innovation assumption fails outright and Croston-type methods are the right tool',
          'Log or Box-Cox transform when seasonal amplitude grows with the level',
        ],
        evaluation:
          'Rolling-origin MASE against seasonal-naive, plus interval coverage at the service level the operation actually runs at. Report accuracy at the aggregation level decisions are made at, since errors cancel on aggregation and a good SKU-level number can hide a bad category-level one.',
        pitfalls: [
          'One model per series becoming an operational burden nobody owns once the catalogue grows',
          'Promotions and stockouts treated as demand rather than as interventions, so the model learns the intervention as seasonality',
          'Multiple seasonalities forced into a single seasonal order, which fits neither',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A single fit is trivial — tens to hundreds of likelihood evaluations over a handful of parameters, milliseconds to seconds. The cost is multiplicative in two places: the AIC grid over orders, and the fact that every series needs its own model. A million series is a million optimizations, which is an orchestration problem rather than a compute one.',
    inferenceProfile:
      'Forecasting is a short recursion — O(h) for horizon h — and the model is a handful of coefficients. Trivial to serve; the awkward part is that generating a forecast requires the recent history and the fitted state, so the serving path needs the series, not just the parameters.',
    retrainingCadence:
      'Periodic and per series, typically weekly or monthly. There is no incremental update that preserves the exact likelihood, though the state can be carried forward and the coefficients held fixed between refits — which is what most production systems do, refitting orders far less often than coefficients.',
    driftAndMonitoring: [
      'Run Ljung-Box on recent residuals — returning autocorrelation is the earliest signal that the fitted orders no longer describe the process',
      'Track interval coverage rather than point error, since a model can keep its MASE while its intervals become badly wrong',
      'Watch the innovation variance across refits; a rising estimate usually means unmodelled structure rather than a genuinely noisier process',
      'Alert when the AIC-selected orders change on refit, because that is a change of model, not of parameters, and anything downstream assuming a fixed form is now wrong',
    ],
    productionGotchas: [
      'Differencing is part of the model: forecasts come back on the differenced scale and must be integrated, and getting the initial values wrong shifts every forecast by a constant nobody notices',
      'Missing periods break the recursion — the model assumes regular sampling, so a gap must be imputed or the series re-indexed, and silently dropping the row is wrong',
      'Exogenous regressors must be known for the whole forecast horizon; a SARIMAX with a driver you cannot forecast is a model you cannot use',
      'Fitted coefficients near the stationarity boundary produce forecasts that explode over long horizons, and the optimizer will happily return them',
      'A log transform means forecasts and intervals come back on the log scale; exponentiating the mean gives the median, not the mean, and the correction is routinely forgotten',
    ],
  },

  assumptions: [
    'The differenced series is stationary — the mean, variance and autocorrelation do not change over time, which is what differencing is for and what a structural break destroys',
    'Innovations are white noise: independent, mean zero, constant variance. The intervals rest entirely on this and it is the assumption most often violated',
    'Innovations are Gaussian, if the intervals or any quantile are to be believed',
    'The series is regularly sampled with no gaps, since the model is defined on an index rather than on a timestamp',
    'The relationship is linear in the lags; a series whose dynamics change with its level needs a transform or a different model',
  ],

  pros: [
    {
      point: 'Prediction intervals that follow from the model rather than from a bootstrap',
      context:
        'The innovation variance is estimated as part of the fit and propagates analytically with horizon, which is what makes quantile-shaped downstream decisions defensible. Worth little if only the point forecast is ever used.',
    },
    {
      point: 'Models serial dependence explicitly, including the error process',
      context:
        'The MA terms let a shock persist and decay, which a regression on lag features cannot represent without a great many lags. Decisive on series where shocks matter; irrelevant where the drivers are exogenous and the errors are near-independent.',
    },
    {
      point: 'A mature, well-understood diagnostic framework',
      context:
        'Unit-root tests, residual autocorrelation, information criteria — a complete toolkit for deciding whether the model is adequate, which most newer forecasters simply do not have. That matters in settings where a forecast has to be defended.',
    },
    {
      point: 'Exogenous regressors integrate cleanly',
      context:
        'SARIMAX is a regression with ARIMA errors, so drivers can be added without breaking the error structure or the intervals. This is the correct way to handle promotions and holidays, and it is why the X exists.',
    },
  ],

  cons: [
    {
      point: 'One model per series, fitted independently',
      context:
        'A catalogue of a million series is a million optimizations with no sharing of information between them. This is the practical reason global models — one model over all series — took over at scale, and no amount of tuning changes it.',
    },
    {
      point: 'Handles exactly one seasonality',
      context:
        'A series with daily, weekly and annual cycles cannot be expressed with a single seasonal order. Fourier regressors help and are a workaround, not a fix, and this is where structural and state-space models are simply better suited.',
    },
    {
      point: 'Requires stationarity, and differencing is a blunt instrument',
      context:
        'A structural break is not removed by differencing, and over-differencing inflates variance while looking fine. Judging d correctly is genuine expertise that the automated search only partly replaces.',
    },
    {
      point: 'Frequently beaten by much simpler methods',
      context:
        'The M-competitions repeatedly found exponential smoothing and the theta method competitive with or better than fitted ARIMA on real business data. The framework is more general; generality is not accuracy, and this is the clearest case of that in the section.',
    },
  ],

  relatedSlugs: ['exponential-smoothing', 'kalman-filter', 'linear-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""ARIMA by conditional sum of squares - the recursion, transcribed.

The likelihood reduces to the sum of squared one-step errors, and those errors
are produced by a recursion in the parameters rather than observed. That is the
whole difficulty: epsilon_t depends on epsilon_{t-1}, so there is no closed
form and the fit has to be numerical.
"""


def difference(series, d):
    """Apply (1 - B)^d. The I in ARIMA, and it happens before anything else."""
    result = list(series)
    for _ in range(d):
        result = [result[t] - result[t - 1] for t in range(1, len(result))]
    return result


def residuals(w, phi, theta):
    """epsilon_t = w_t - sum phi_i w_{t-i} - sum theta_j epsilon_{t-j}

    'Conditional' means the pre-sample values are assumed zero. That is the
    approximation this stage makes; the exact likelihood estimates them via a
    Kalman filter instead, which matters on short series.
    """
    p = len(phi)
    q = len(theta)
    errors = [0.0] * len(w)

    for t in range(len(w)):
        prediction = 0.0
        for i in range(p):
            if t - i - 1 >= 0:
                prediction += phi[i] * w[t - i - 1]
        for j in range(q):
            if t - j - 1 >= 0:
                prediction += theta[j] * errors[t - j - 1]
        errors[t] = w[t] - prediction

    return errors


def sum_of_squares(w, phi, theta):
    return sum(error * error for error in residuals(w, phi, theta))


def fit(series, p, d, q, lr=1e-4, iterations=2000, epsilon=1e-5):
    """Fit by gradient descent with numerical gradients.

    A real implementation uses L-BFGS with analytic derivatives; finite
    differences are used here because they show that the objective is just a
    function of the coefficients, with no structure the optimizer exploits.
    """
    w = difference(series, d)
    phi = [0.0] * p
    theta = [0.0] * q

    for _ in range(iterations):
        base = sum_of_squares(w, phi, theta)

        for i in range(p):
            phi[i] += epsilon
            gradient = (sum_of_squares(w, phi, theta) - base) / epsilon
            phi[i] -= epsilon
            phi[i] -= lr * gradient

        for j in range(q):
            theta[j] += epsilon
            gradient = (sum_of_squares(w, phi, theta) - base) / epsilon
            theta[j] -= epsilon
            theta[j] -= lr * gradient

    return phi, theta


def forecast(series, phi, theta, d, horizon):
    """Iterate the recursion forward, then undo the differencing."""
    w = difference(series, d)
    errors = residuals(w, phi, theta)

    history = list(w)
    future_errors = list(errors)

    for _ in range(horizon):
        prediction = 0.0
        for i in range(len(phi)):
            prediction += phi[i] * history[len(history) - i - 1]
        for j in range(len(theta)):
            prediction += theta[j] * future_errors[len(future_errors) - j - 1]
        history.append(prediction)
        # Future errors are zero in expectation - which is exactly why the
        # forecast reverts to the mean once the MA memory runs out.
        future_errors.append(0.0)

    # Undo the differencing by cumulative summation from the last observed
    # levels. Getting these starting values wrong shifts every forecast by a
    # constant that nobody notices.
    forecasts = history[len(w):]
    for _ in range(d):
        anchor = series[-1]
        forecasts = [anchor := anchor + step for step in forecasts]

    return forecasts`,
        profile: 'O(n * (p + q)) per objective evaluation, and finite-difference gradients cost p + q + 1 evaluations per step — thousands of passes over the series.',
      },
      'make-it-right': {
        code: `"""ARIMA - typed, constrained, fitted by L-BFGS on the exact CSS objective."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize

Vector = NDArray[np.float64]


@dataclass(frozen=True)
class ArimaOrder:
    p: int
    d: int
    q: int

    def __post_init__(self) -> None:
        if min(self.p, self.d, self.q) < 0:
            raise ValueError(f"orders must be non-negative, got {self}")
        if self.d > 2:
            raise ValueError(
                f"d={self.d}: differencing more than twice almost always means a "
                "transform is needed rather than another difference"
            )


@dataclass(frozen=True)
class ArimaModel:
    order: ArimaOrder
    phi: Vector
    theta: Vector
    sigma2: float
    anchors: Vector          # last d levels, needed to undo the differencing
    aic: float

    @property
    def is_stationary(self) -> bool:
        """AR polynomial roots must lie OUTSIDE the unit circle.

        A fitted model that fails this is not merely inaccurate - its
        forecasts diverge with horizon, and the optimizer will happily return
        one because the objective does not know about the constraint.
        """
        return _roots_outside_unit_circle(self.phi)

    @property
    def is_invertible(self) -> bool:
        """Same condition on the MA polynomial. A non-invertible model has an
        equivalent invertible representation, so the coefficients are not
        identified even though the fit is."""
        return _roots_outside_unit_circle(-self.theta)


def _roots_outside_unit_circle(coefficients: Vector) -> bool:
    if coefficients.size == 0:
        return True
    # 1 - c1 B - c2 B^2 ... ; numpy wants highest power first.
    polynomial = np.concatenate([[1.0], -coefficients])[::-1]
    return bool(np.all(np.abs(np.roots(polynomial)) > 1.0))


def _difference(series: Vector, d: int) -> Vector:
    return series if d == 0 else _difference(np.diff(series), d - 1)


def _residuals(w: Vector, phi: Vector, theta: Vector) -> Vector:
    """One pass of the recursion. Sequential in t by construction: the MA term
    reads an error the same loop is producing, so this cannot be vectorized
    over time no matter how it is written."""
    p, q = phi.size, theta.size
    errors = np.zeros(w.size, dtype=np.float64)

    for t in range(w.size):
        prediction = 0.0
        if p:
            back = min(p, t)
            prediction += float(phi[:back] @ w[t - 1 : t - back - 1 : -1]) if back else 0.0
        if q:
            back = min(q, t)
            prediction += float(theta[:back] @ errors[t - 1 : t - back - 1 : -1]) if back else 0.0
        errors[t] = w[t] - prediction

    return errors


def fit(series: Vector, order: ArimaOrder) -> ArimaModel:
    """Fit by conditional maximum likelihood. Raises ValueError on bad input."""
    if series.ndim != 1:
        raise ValueError(f"series must be 1-D, got shape {series.shape}")
    if series.size <= order.d + order.p + order.q + 1:
        raise ValueError(f"series of length {series.size} is too short for {order}")
    if not np.isfinite(series).all():
        raise ValueError("series contains NaN or inf; the recursion has no notion of missing")

    w = _difference(series, order.d)

    def objective(packed: Vector) -> float:
        phi, theta = packed[: order.p], packed[order.p :]
        return float(np.sum(_residuals(w, phi, theta) ** 2))

    start = np.zeros(order.p + order.q, dtype=np.float64)
    result = minimize(objective, start, method="L-BFGS-B",
                      bounds=[(-0.99, 0.99)] * start.size)

    phi, theta = result.x[: order.p], result.x[order.p :]
    errors = _residuals(w, phi, theta)
    sigma2 = float(np.mean(errors**2))

    # AIC over the DIFFERENCED series length: comparing models with different
    # d on different sample sizes is a common and invalid comparison.
    n_params = order.p + order.q + 1
    aic = w.size * np.log(sigma2) + 2 * n_params

    return ArimaModel(
        order=order,
        phi=phi,
        theta=theta,
        sigma2=sigma2,
        anchors=series[-max(order.d, 1) :],
        aic=float(aic),
    )`,
        rationale:
          'Finite-difference gradient descent is replaced by L-BFGS with box constraints, which converges in tens of evaluations rather than thousands and is what an actual implementation uses. More importantly, the model now checks what the objective cannot: the stationarity and invertibility conditions on the polynomial roots. A fitted model violating them is not merely inaccurate — its forecasts diverge with horizon — and the optimizer returns one happily because those constraints are not in the objective. The order becomes a validated value object, input is checked for the NaN case the recursion has no way to represent, and the AIC is computed on the differenced length so that models with different d are not compared on different sample sizes.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n * (p + q)) per evaluation, tens of evaluations under L-BFGS instead of thousands under finite differences.',
      },
      'make-it-fast': {
        code: `"""ARIMA - fused AR term, reused buffers, order grid in one pass."""

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class ConditionalArima:
    """The AR contribution is a convolution; only the MA part is sequential.

    The recursion cannot be vectorized over time - the MA term reads an error
    the loop is still producing. But the AR term reads only OBSERVED values,
    so the whole AR contribution for every t is one matrix-vector product
    against a lag matrix built once. That leaves a scalar accumulation for the
    MA part, which is genuinely irreducible.

    The other saving is larger and less obvious: L-BFGS calls the objective
    tens of times per fit and hundreds across an order grid, so the residual
    buffer and the lag matrix are built ONCE per series rather than per call.
    """

    def __init__(self, series: Vector, max_lag: int) -> None:
        # One contiguous float64 block; every objective evaluation walks it.
        self._series = np.ascontiguousarray(series, dtype=np.float64)
        self._max_lag = max_lag
        self._cache: dict[int, tuple[Vector, Matrix]] = {}
        self._errors: Vector | None = None

    def _prepared(self, d: int) -> tuple[Vector, Matrix]:
        """Differenced series and its lag matrix, memoized per d.

        An order grid evaluates many (p, q) at the same d, so differencing and
        building the lag matrix once per d rather than once per candidate is
        most of the grid's cost removed.
        """
        if d not in self._cache:
            w = self._series
            for _ in range(d):
                w = np.diff(w)
            w = np.ascontiguousarray(w)

            lags = np.zeros((w.size, self._max_lag), dtype=np.float64)
            for lag in range(1, self._max_lag + 1):
                lags[lag:, lag - 1] = w[:-lag]
            self._cache[d] = (w, lags)

        return self._cache[d]

    def _sum_of_squares(self, w: Vector, lags: Matrix, phi: Vector, theta: Vector) -> float:
        # The entire AR contribution, for every t at once: one GEMV.
        ar_term = lags[:, : phi.size] @ phi if phi.size else np.zeros(w.size)

        if self._errors is None or self._errors.size != w.size:
            self._errors = np.empty(w.size, dtype=np.float64)   # allocated once
        errors = self._errors

        q = theta.size
        if q == 0:
            np.subtract(w, ar_term, out=errors)
            return float(errors @ errors)

        # Only the MA recursion remains sequential, and it is O(q) per step
        # rather than O(p + q).
        for t in range(w.size):
            ma_term = 0.0
            for j in range(min(q, t)):
                ma_term += theta[j] * errors[t - j - 1]
            errors[t] = w[t] - ar_term[t] - ma_term

        return float(errors @ errors)

    def fit_order(self, p: int, d: int, q: int) -> tuple[Vector, float]:
        w, lags = self._prepared(d)

        def objective(packed: Vector) -> float:
            return self._sum_of_squares(w, lags, packed[:p], packed[p:])

        result = minimize(
            objective,
            np.zeros(p + q),
            method="L-BFGS-B",
            bounds=[(-0.99, 0.99)] * (p + q),
        )

        sigma2 = result.fun / w.size
        aic = w.size * np.log(sigma2) + 2 * (p + q + 1)
        return result.x, float(aic)

    def select(self, max_p: int, max_d: int, max_q: int) -> tuple[tuple[int, int, int], Vector]:
        """AIC grid search. The shared per-d preparation is what makes this
        affordable - without it, the grid re-differences the series and
        rebuilds the lag matrix for every candidate."""
        best_order = (0, 0, 0)
        best_params = np.zeros(0)
        best_aic = np.inf

        for d in range(max_d + 1):
            for p in range(max_p + 1):
                for q in range(max_q + 1):
                    if p == 0 and q == 0:
                        continue
                    params, aic = self.fit_order(p, d, q)
                    if aic < best_aic:
                        best_aic, best_order, best_params = aic, (p, d, q), params

        return best_order, best_params`,
        rationale:
          'The recursion is genuinely sequential in the MA term — the loop reads an error it is still producing — so no rewrite vectorizes it over time, and pretending otherwise would be the wrong claim. What can be lifted out is the AR contribution, which reads only observed values and is therefore one matrix-vector product against a lag matrix built once. The larger saving is structural rather than arithmetic: L-BFGS calls the objective tens of times per fit and hundreds across an order grid, so differencing, the lag matrix, and the residual buffer are all built once per series and reused across every call — which is most of the grid search’s cost removed.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The AR contribution for every timestep is a single GEMV against a precomputed lag matrix, leaving only the irreducible MA accumulation in the interpreter.',
            tradeoff: 'The lag matrix is n-by-max_lag, so it costs memory proportional to the longest AR order considered even when the selected model uses far fewer lags.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'An order grid evaluates many (p, q) pairs at the same d, so differencing and lag construction are memoized per d rather than repeated per candidate.',
            tradeoff: 'The cache holds one differenced copy and lag matrix per d for the object’s lifetime, which is fine for a grid over one series and wasteful if the object outlives the search.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The residual buffer is allocated once and rewritten on every objective evaluation, rather than allocating an n-length array on each of the hundreds of calls the optimizer makes.',
            tradeoff: 'The buffer is shared mutable state on the object, so the class is not reentrant — two concurrent fits through one instance would corrupt each other silently.',
          },
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n * q) per evaluation after the AR term is lifted out, with per-d preparation shared across the grid. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// ARIMA by conditional sum of squares - the recursion, transcribed.
#include <cmath>
#include <cstddef>
#include <vector>

// Apply (1 - B)^d. The I in ARIMA, and it happens before anything else.
std::vector<double> Difference(const std::vector<double>& series, int d) {
  std::vector<double> result = series;
  for (int step = 0; step < d; ++step) {
    std::vector<double> next;
    for (std::size_t t = 1; t < result.size(); ++t) {
      next.push_back(result[t] - result[t - 1]);
    }
    result = next;
  }
  return result;
}

// epsilon_t = w_t - sum phi_i w_{t-i} - sum theta_j epsilon_{t-j}
//
// 'Conditional' means the pre-sample values are assumed zero. That is the
// approximation here; the exact likelihood estimates them with a Kalman
// filter instead, which matters on short series.
std::vector<double> Residuals(const std::vector<double>& w,
                              const std::vector<double>& phi,
                              const std::vector<double>& theta) {
  std::vector<double> errors(w.size(), 0.0);

  for (std::size_t t = 0; t < w.size(); ++t) {
    double prediction = 0.0;
    for (std::size_t i = 0; i < phi.size(); ++i) {
      if (t >= i + 1) prediction += phi[i] * w[t - i - 1];
    }
    for (std::size_t j = 0; j < theta.size(); ++j) {
      if (t >= j + 1) prediction += theta[j] * errors[t - j - 1];
    }
    errors[t] = w[t] - prediction;
  }

  return errors;
}

double SumOfSquares(const std::vector<double>& w, const std::vector<double>& phi,
                    const std::vector<double>& theta) {
  double total = 0.0;
  for (const double error : Residuals(w, phi, theta)) total += error * error;
  return total;
}

// Gradient descent with numerical gradients. A real implementation uses
// L-BFGS with analytic derivatives; finite differences make it obvious that
// the objective is simply a function of the coefficients.
void Fit(const std::vector<double>& series, int p, int d, int q, double lr,
         int iterations, double epsilon, std::vector<double>& phi,
         std::vector<double>& theta) {
  const std::vector<double> w = Difference(series, d);
  phi.assign(static_cast<std::size_t>(p), 0.0);
  theta.assign(static_cast<std::size_t>(q), 0.0);

  for (int step = 0; step < iterations; ++step) {
    const double base = SumOfSquares(w, phi, theta);

    for (std::size_t i = 0; i < phi.size(); ++i) {
      phi[i] += epsilon;
      const double gradient = (SumOfSquares(w, phi, theta) - base) / epsilon;
      phi[i] -= epsilon;
      phi[i] -= lr * gradient;
    }

    for (std::size_t j = 0; j < theta.size(); ++j) {
      theta[j] += epsilon;
      const double gradient = (SumOfSquares(w, phi, theta) - base) / epsilon;
      theta[j] -= epsilon;
      theta[j] -= lr * gradient;
    }
  }
}`,
        profile: 'O(n * (p + q)) per evaluation, with p + q + 1 evaluations per gradient step and a fresh residual vector allocated on every one.',
      },
      'make-it-right': {
        code: `// ARIMA - flat buffers, root checks, reused residuals, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <complex>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

struct ArimaOrder {
  std::size_t p = 0;
  std::size_t d = 0;
  std::size_t q = 0;
};

namespace {

// Roots of 1 - c1 B - ... - cn B^n must lie OUTSIDE the unit circle.
//
// Checked by the eigenvalues of the companion matrix, whose reciprocals are
// the roots: a fitted model that fails this does not merely predict badly, it
// diverges with horizon - and the optimizer returns one happily, because the
// constraint is not in the objective.
[[nodiscard]] bool RootsOutsideUnitCircle(std::span<const double> coefficients) {
  const std::size_t n = coefficients.size();
  if (n == 0) return true;

  // Companion matrix power iteration on the largest eigenvalue magnitude is
  // enough: stationarity fails as soon as ANY root is inside.
  std::vector<double> state(n, 1.0 / std::sqrt(static_cast<double>(n)));
  double magnitude = 0.0;

  for (int iteration = 0; iteration < 500; ++iteration) {
    std::vector<double> next(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) next[0] += coefficients[i] * state[i];
    for (std::size_t i = 1; i < n; ++i) next[i] = state[i - 1];

    double norm = 0.0;
    for (const double value : next) norm += value * value;
    norm = std::sqrt(norm);
    if (norm == 0.0) return true;

    for (double& value : next) value /= norm;
    magnitude = norm;
    state = std::move(next);
  }

  return magnitude < 1.0;      // companion eigenvalue inside => root outside
}

}  // namespace

class ConditionalArima {
 public:
  ConditionalArima(std::vector<double> series, ArimaOrder order)
      : order_(order), differenced_(std::move(series)) {
    if (differenced_.empty()) throw std::invalid_argument("empty series");
    if (order_.d > 2) {
      throw std::invalid_argument(
          "d > 2: differencing more than twice almost always means a transform is needed");
    }
    if (differenced_.size() <= order_.d + order_.p + order_.q + 1) {
      throw std::invalid_argument("series is too short for the requested order");
    }
    for (const double value : differenced_) {
      if (!std::isfinite(value)) {
        throw std::invalid_argument("series contains NaN or inf; the recursion cannot skip a gap");
      }
    }

    // Difference in place: one buffer rather than one per differencing pass.
    for (std::size_t step = 0; step < order_.d; ++step) {
      for (std::size_t t = differenced_.size() - 1; t > 0; --t) {
        differenced_[t] -= differenced_[t - 1];
      }
      differenced_.erase(differenced_.begin());
    }

    errors_.assign(differenced_.size(), 0.0);
  }

  // One pass of the recursion, writing into the reused buffer. Sequential in
  // t by construction: the MA term reads an error this loop is producing.
  [[nodiscard]] double SumOfSquares(std::span<const double> phi,
                                    std::span<const double> theta) const {
    double total = 0.0;

    for (std::size_t t = 0; t < differenced_.size(); ++t) {
      double prediction = 0.0;
      const std::size_t ar_back = std::min(phi.size(), t);
      for (std::size_t i = 0; i < ar_back; ++i) prediction += phi[i] * differenced_[t - i - 1];

      const std::size_t ma_back = std::min(theta.size(), t);
      for (std::size_t j = 0; j < ma_back; ++j) prediction += theta[j] * errors_[t - j - 1];

      errors_[t] = differenced_[t] - prediction;
      total += errors_[t] * errors_[t];
    }

    return total;
  }

  [[nodiscard]] bool IsStationary(std::span<const double> phi) const {
    return RootsOutsideUnitCircle(phi);
  }

  // AIC on the DIFFERENCED length: comparing models with different d on
  // different sample sizes is a common and invalid comparison.
  [[nodiscard]] double Aic(double sum_of_squares) const {
    const auto n = static_cast<double>(differenced_.size());
    const auto k = static_cast<double>(order_.p + order_.q + 1);
    return n * std::log(sum_of_squares / n) + 2.0 * k;
  }

  [[nodiscard]] std::span<const double> differenced() const noexcept { return differenced_; }

 private:
  ArimaOrder order_;
  std::vector<double> differenced_;      // owned; differenced in place
  mutable std::vector<double> errors_;   // reused across every evaluation
};`,
        rationale:
          'Three changes. The residual buffer is hoisted into the object and reused, which matters here more than usual because an optimizer calls the objective hundreds of times and the previous stage allocated an n-length vector on every one. Differencing happens in place over a single buffer rather than building a fresh vector per pass. And the model now checks the constraint the objective cannot see: the AR and MA polynomial roots must lie outside the unit circle, verified through the companion matrix, because a fit that violates it produces forecasts that diverge with horizon while the optimizer reports success. Input validation covers the NaN case, which the recursion has no way to represent — a gap is not something it can skip.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n * (p + q)) per evaluation, one residual buffer for the lifetime of the fit, differencing done in place.',
      },
      'make-it-fast': {
        code: `// ARIMA - AR term as one GEMV, MA recursion left sequential.
#include <Eigen/Dense>
#include <cstddef>
#include <stdexcept>
#include <vector>

// The recursion cannot be vectorized over time: the MA term reads an error
// the loop is still producing. That part is genuinely irreducible.
//
// The AR term is different - it reads only OBSERVED values, so the entire AR
// contribution for every t is one matrix-vector product against a lag matrix
// built once per series. What remains is an O(q) scalar accumulation, and on
// a typical model q is 1 or 2.
class FusedArima {
 public:
  FusedArima(const Eigen::VectorXd& differenced, Eigen::Index max_lag)
      : w_(differenced), errors_(differenced.size()), ar_term_(differenced.size()) {
    if (max_lag < 1) throw std::invalid_argument("max_lag must be at least 1");

    // Lag matrix, built once and shared by every candidate order in a grid
    // search - which is where most of a selection run's cost otherwise goes.
    lags_ = Eigen::MatrixXd::Zero(w_.size(), max_lag);
    for (Eigen::Index lag = 1; lag <= max_lag; ++lag) {
      lags_.col(lag - 1).tail(w_.size() - lag) = w_.head(w_.size() - lag);
    }
  }

  [[nodiscard]] double SumOfSquares(const Eigen::VectorXd& phi,
                                    const Eigen::VectorXd& theta) const {
    // One GEMV for the whole AR contribution. noalias() writes straight into
    // the reused buffer rather than through a temporary.
    if (phi.size() > 0) {
      ar_term_.noalias() = lags_.leftCols(phi.size()) * phi;
    } else {
      ar_term_.setZero();
    }

    if (theta.size() == 0) {
      errors_ = w_ - ar_term_;
      return errors_.squaredNorm();
    }

    const auto q = theta.size();
    double total = 0.0;

    for (Eigen::Index t = 0; t < w_.size(); ++t) {
      double ma_term = 0.0;
      const Eigen::Index back = std::min(q, t);
      for (Eigen::Index j = 0; j < back; ++j) ma_term += theta[j] * errors_[t - j - 1];

      errors_[t] = w_[t] - ar_term_[t] - ma_term;
      total += errors_[t] * errors_[t];
    }

    return total;
  }

 private:
  Eigen::VectorXd w_;
  Eigen::MatrixXd lags_;                 // built once, shared across the grid
  mutable Eigen::VectorXd errors_;       // reused across every evaluation
  mutable Eigen::VectorXd ar_term_;
};`,
        rationale:
          'The AR contribution is lifted out of the recursion entirely: it reads only observed values, so it becomes one matrix-vector product against a lag matrix built once and shared across every candidate order in a selection grid. What is left is an O(q) accumulation per step, and on a typical model q is one or two — so the inner loop shrinks from O(p + q) to O(q). The claim deliberately stops there: the MA recursion has a loop-carried dependency and no rearrangement removes it, so this is a constant-factor improvement to a sequential algorithm rather than a parallelization of one.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The AR GEMV writes directly into a reused buffer through noalias(), and the MA-free case is a single fused subtraction with no intermediate vector.',
            tradeoff: 'noalias() is an unchecked assertion — if the destination ever aliased an operand the result is silently wrong, which is worse than being slow.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The remaining MA accumulation is a tight scalar loop over one or two terms, whose cost depends entirely on the compiler unrolling it and keeping the accumulator in a register.',
            tradeoff: '-march=native emits instructions that may not exist on an older machine in the same fleet, converting a performance choice into a portability failure.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The AR product and the squared-norm reduction are contiguous loops the compiler vectorizes without help, which is the right first move before reaching for intrinsics.',
            tradeoff: 'The MA recursion carries a loop-carried dependency and will not vectorize at any optimization level, so measuring is the only way to know whether the vectorized half moved the total at all.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n * q) per evaluation after the AR term is lifted out, with the lag matrix shared across a grid. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! ARIMA by conditional sum of squares - the recursion, transcribed.

/// Apply (1 - B)^d. The I in ARIMA, and it happens before anything else.
pub fn difference(series: &[f64], d: usize) -> Vec<f64> {
    let mut result = series.to_vec();
    for _ in 0..d {
        result = (1..result.len()).map(|t| result[t] - result[t - 1]).collect();
    }
    result
}

/// epsilon_t = w_t - sum phi_i w_{t-i} - sum theta_j epsilon_{t-j}
///
/// "Conditional" means the pre-sample values are assumed zero. That is the
/// approximation here; the exact likelihood estimates them with a Kalman
/// filter instead, which matters on short series.
pub fn residuals(w: &[f64], phi: &[f64], theta: &[f64]) -> Vec<f64> {
    let mut errors = vec![0.0; w.len()];

    for t in 0..w.len() {
        let mut prediction = 0.0;
        for i in 0..phi.len() {
            if t >= i + 1 {
                prediction += phi[i] * w[t - i - 1];
            }
        }
        for j in 0..theta.len() {
            if t >= j + 1 {
                prediction += theta[j] * errors[t - j - 1];
            }
        }
        errors[t] = w[t] - prediction;
    }

    errors
}

pub fn sum_of_squares(w: &[f64], phi: &[f64], theta: &[f64]) -> f64 {
    residuals(w, phi, theta).iter().map(|e| e * e).sum()
}

/// Gradient descent with numerical gradients. A real implementation uses
/// L-BFGS with analytic derivatives; finite differences make it obvious that
/// the objective is simply a function of the coefficients.
pub fn fit(
    series: &[f64],
    p: usize,
    d: usize,
    q: usize,
    lr: f64,
    iterations: usize,
    epsilon: f64,
) -> (Vec<f64>, Vec<f64>) {
    let w = difference(series, d);
    let mut phi = vec![0.0; p];
    let mut theta = vec![0.0; q];

    for _ in 0..iterations {
        let base = sum_of_squares(&w, &phi, &theta);

        for i in 0..p {
            phi[i] += epsilon;
            let gradient = (sum_of_squares(&w, &phi, &theta) - base) / epsilon;
            phi[i] -= epsilon;
            phi[i] -= lr * gradient;
        }

        for j in 0..q {
            theta[j] += epsilon;
            let gradient = (sum_of_squares(&w, &phi, &theta) - base) / epsilon;
            theta[j] -= epsilon;
            theta[j] -= lr * gradient;
        }
    }

    (phi, theta)
}`,
        profile: 'O(n * (p + q)) per evaluation, p + q + 1 evaluations per step, and a fresh residual Vec allocated on every one.',
      },
      'make-it-right': {
        code: `//! ARIMA - typed errors, validated order, reused buffers, root checks.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum ArimaError {
    Empty,
    TooShort { length: usize, needed: usize },
    NonFinite { index: usize },
    OverDifferenced { d: usize },
}

impl fmt::Display for ArimaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty series"),
            Self::TooShort { length, needed } => {
                write!(f, "series of length {length} needs at least {needed} observations")
            }
            Self::NonFinite { index } => write!(
                f,
                "non-finite value at index {index}; the recursion has no notion of a gap"
            ),
            Self::OverDifferenced { d } => write!(
                f,
                "d={d}: differencing more than twice almost always means a transform is needed"
            ),
        }
    }
}

impl std::error::Error for ArimaError {}

/// The (p, d, q) order. A newtype triple because three bare usize in one
/// signature is exactly the shape that gets transposed silently.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Order {
    pub p: usize,
    pub d: usize,
    pub q: usize,
}

impl Order {
    pub fn new(p: usize, d: usize, q: usize) -> Result<Self, ArimaError> {
        if d > 2 {
            return Err(ArimaError::OverDifferenced { d });
        }
        Ok(Self { p, d, q })
    }

    #[must_use]
    pub fn parameter_count(&self) -> usize {
        self.p + self.q + 1
    }
}

pub struct ConditionalArima {
    differenced: Vec<f64>,
    /// Reused across every objective evaluation - an optimizer calls this
    /// hundreds of times, and allocating an n-length Vec on each was the
    /// dominant cost of the previous stage.
    errors: Vec<f64>,
    order: Order,
}

impl ConditionalArima {
    pub fn new(series: &[f64], order: Order) -> Result<Self, ArimaError> {
        if series.is_empty() {
            return Err(ArimaError::Empty);
        }
        if let Some(index) = series.iter().position(|value| !value.is_finite()) {
            return Err(ArimaError::NonFinite { index });
        }
        let needed = order.d + order.p + order.q + 2;
        if series.len() < needed {
            return Err(ArimaError::TooShort { length: series.len(), needed });
        }

        // Difference in place over one buffer rather than allocating per pass.
        let mut differenced = series.to_vec();
        for _ in 0..order.d {
            for t in (1..differenced.len()).rev() {
                differenced[t] -= differenced[t - 1];
            }
            differenced.remove(0);
        }

        let errors = vec![0.0; differenced.len()];
        Ok(Self { differenced, errors, order })
    }

    /// One pass of the recursion. Sequential in t by construction: the MA
    /// term reads an error this loop is producing.
    pub fn sum_of_squares(&mut self, phi: &[f64], theta: &[f64]) -> f64 {
        let mut total = 0.0;

        for t in 0..self.differenced.len() {
            let ar_back = phi.len().min(t);
            let ar_term: f64 = phi[..ar_back]
                .iter()
                .enumerate()
                .map(|(i, coefficient)| coefficient * self.differenced[t - i - 1])
                .sum();

            let ma_back = theta.len().min(t);
            let ma_term: f64 = theta[..ma_back]
                .iter()
                .enumerate()
                .map(|(j, coefficient)| coefficient * self.errors[t - j - 1])
                .sum();

            self.errors[t] = self.differenced[t] - ar_term - ma_term;
            total += self.errors[t] * self.errors[t];
        }

        total
    }

    /// AR and MA polynomial roots must lie OUTSIDE the unit circle. A fitted
    /// model that fails this does not merely predict badly - its forecasts
    /// diverge with horizon, and the optimizer returns one happily because
    /// the constraint is not in the objective.
    #[must_use]
    pub fn roots_outside_unit_circle(coefficients: &[f64]) -> bool {
        if coefficients.is_empty() {
            return true;
        }

        // Power iteration on the companion matrix: stationarity fails as soon
        // as any companion eigenvalue reaches the unit circle.
        let n = coefficients.len();
        let mut state = vec![1.0 / (n as f64).sqrt(); n];
        let mut magnitude = 0.0;

        for _ in 0..500 {
            let mut next = vec![0.0_f64; n];
            next[0] = coefficients.iter().zip(&state).map(|(c, s)| c * s).sum();
            for i in 1..n {
                next[i] = state[i - 1];
            }

            let norm: f64 = next.iter().map(|v| v * v).sum::<f64>().sqrt();
            if norm == 0.0 {
                return true;
            }
            next.iter_mut().for_each(|value| *value /= norm);
            magnitude = norm;
            state = next;
        }

        magnitude < 1.0
    }

    /// AIC on the DIFFERENCED length: comparing models with different d on
    /// different sample sizes is a common and invalid comparison.
    #[must_use]
    pub fn aic(&self, sum_of_squares: f64) -> f64 {
        let n = self.differenced.len() as f64;
        n * (sum_of_squares / n).ln() + 2.0 * self.order.parameter_count() as f64
    }
}
`,
        rationale:
          'The residual buffer moves into the struct and is reused, which matters more here than usual: an optimizer evaluates the objective hundreds of times, and the previous stage allocated an n-length Vec on every call. Differencing happens in place over one buffer. Errors become a typed Result covering the case the recursion genuinely cannot handle — a non-finite value, since the model is defined on a regular index and has no way to skip a gap. The order becomes a validated triple, because three bare usize in one signature is exactly the shape that gets transposed. And the stationarity condition the objective cannot see is checked explicitly, since a model violating it diverges with horizon while the fit reports success.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n * (p + q)) per evaluation with one buffer for the lifetime of the fit and bounds checks elided in the inner sums.',
      },
      'make-it-fast': {
        code: `//! ARIMA - order grid searched in parallel; the fit itself stays sequential.

use rayon::prelude::*;

/// The parallelism here is at the MODEL SELECTION level, not inside the fit.
///
/// A single ARIMA fit is irreducibly sequential: the residual recursion reads
/// an error it is still producing, and no rewrite removes that dependency.
/// What IS parallel is the grid — every (p, d, q) candidate is an independent
/// optimization over its own copy of the data, so the search fans out across
/// cores even though each fit does not.
///
/// This is the honest shape of the speedup, and it is the common case: an
/// auto-ARIMA run evaluates dozens of candidates, and the grid is where the
/// wall-clock actually goes.
pub struct GridSearch<'a> {
    series: &'a [f64],
    max_p: usize,
    max_d: usize,
    max_q: usize,
}

#[derive(Debug, Clone)]
pub struct Candidate {
    pub p: usize,
    pub d: usize,
    pub q: usize,
    pub coefficients: Vec<f64>,
    pub aic: f64,
}

impl<'a> GridSearch<'a> {
    #[must_use]
    pub fn new(series: &'a [f64], max_p: usize, max_d: usize, max_q: usize) -> Self {
        Self { series, max_p, max_d, max_q }
    }

    /// Differenced series for one d. Computed per candidate rather than
    /// shared, because sharing it across threads would need either a lock or
    /// a precomputed table - and at max_d = 2 the table is the better trade,
    /// which the caller can supply if the series is long.
    fn difference(&self, d: usize) -> Vec<f64> {
        let mut result = Vec::with_capacity(self.series.len());
        result.extend_from_slice(self.series);
        for _ in 0..d {
            for t in (1..result.len()).rev() {
                result[t] -= result[t - 1];
            }
            result.remove(0);
        }
        result
    }

    /// One candidate: coordinate descent over the coefficients, with the
    /// residual buffer allocated once for the whole optimization.
    fn fit_one(&self, p: usize, d: usize, q: usize, steps: usize) -> Candidate {
        let w = self.difference(d);
        let mut coefficients = vec![0.0_f64; p + q];
        let mut errors = vec![0.0_f64; w.len()];      // allocated once

        let mut objective = |coefficients: &[f64], errors: &mut [f64]| -> f64 {
            let (phi, theta) = coefficients.split_at(p);
            let mut total = 0.0;

            for t in 0..w.len() {
                let ar_back = phi.len().min(t);
                let ar_term: f64 = phi[..ar_back]
                    .iter()
                    .enumerate()
                    .map(|(i, c)| c * w[t - i - 1])
                    .sum();

                let ma_back = theta.len().min(t);
                let ma_term: f64 = theta[..ma_back]
                    .iter()
                    .enumerate()
                    .map(|(j, c)| c * errors[t - j - 1])
                    .sum();

                errors[t] = w[t] - ar_term - ma_term;
                total += errors[t] * errors[t];
            }
            total
        };

        let mut best = objective(&coefficients, &mut errors);
        let mut step = 0.1_f64;

        for _ in 0..steps {
            let mut improved = false;
            for index in 0..coefficients.len() {
                for direction in [step, -step] {
                    let original = coefficients[index];
                    coefficients[index] = (original + direction).clamp(-0.99, 0.99);
                    let value = objective(&coefficients, &mut errors);
                    if value < best {
                        best = value;
                        improved = true;
                    } else {
                        coefficients[index] = original;
                    }
                }
            }
            if !improved {
                step *= 0.5;
            }
        }

        let n = w.len() as f64;
        let aic = n * (best / n).ln() + 2.0 * (p + q + 1) as f64;
        Candidate { p, d, q, coefficients, aic }
    }

    /// Every candidate is independent, so the grid is a parallel map.
    #[must_use]
    pub fn select(&self, steps: usize) -> Option<Candidate> {
        let mut orders = Vec::with_capacity((self.max_p + 1) * (self.max_d + 1) * (self.max_q + 1));
        for d in 0..=self.max_d {
            for p in 0..=self.max_p {
                for q in 0..=self.max_q {
                    if p == 0 && q == 0 {
                        continue;
                    }
                    orders.push((p, d, q));
                }
            }
        }

        orders
            .into_par_iter()
            .map(|(p, d, q)| self.fit_one(p, d, q, steps))
            .filter(|candidate| candidate.aic.is_finite())
            .min_by(|a, b| a.aic.total_cmp(&b.aic))
    }
}
`,
        rationale:
          'The parallelism is placed where it genuinely exists, and the doc comment says so rather than overclaiming: a single ARIMA fit is irreducibly sequential, because the residual recursion reads an error it is still producing and no rewrite removes that dependency. What is parallel is model selection — every candidate order is an independent optimization — and since an auto-ARIMA run evaluates dozens of candidates, that is where the wall-clock actually goes. Within each fit, the residual buffer is allocated once for the whole optimization instead of per objective evaluation, which is the remaining sequential win.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each (p, d, q) candidate fits independently over its own data, so the AIC grid is a parallel map with no shared mutable state — which is the level at which this algorithm can be parallelized at all.',
            tradeoff: 'Each worker holds its own differenced copy of the series and residual buffer, so memory scales with core count; and candidates vary greatly in cost, so a naive partition leaves workers idle near the end.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The candidate list and each fit’s differenced series are sized before filling, so neither the grid nor the per-candidate copy is grown and moved.',
            tradeoff: 'The differenced series is over-allocated by d elements because differencing shrinks it, which is negligible here and would matter if d were large.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'split_at divides the coefficient vector into AR and MA slices without copying, and both inner sums walk contiguous runs the prefetcher can follow.',
            tradeoff: 'The recursion still indexes backwards into the error buffer, which is a strided read the compiler cannot turn into a sequential one — the contiguity helps the coefficient side only.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n * (p + q)) per evaluation, with the order grid spread across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
