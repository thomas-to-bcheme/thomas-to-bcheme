import type { AiMlModel } from '../../types';

/**
 * Exponential Smoothing (Holt-Winters) — the method that keeps beating more
 * general ones.
 *
 * Follows ARIMA in the classical-time-series group as the specialization that
 * gives up generality for structure: instead of learning an arbitrary
 * dependence on lags and errors, it commits to a decomposition into level,
 * trend and season, and updates each with one number. The M-competitions
 * repeatedly found that this trade favours the simpler model on real business
 * data, which is the most useful thing in this entry.
 */
export const EXPONENTIAL_SMOOTHING: AiMlModel = {
  slug: 'exponential-smoothing',
  name: 'Exponential Smoothing (Holt-Winters)',
  aliases: ['SES', 'Holt-Winters', 'ETS', 'EWMA', 'Damped trend'],
  category: 'classical-ml',
  group: 'classical-time-series',
  kind: 'model',

  paradigms: ['supervised'],
  // 'anomaly-detection' because the EWMA control chart IS exponential
  // smoothing applied to monitoring — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'sequence-modeling', 'anomaly-detection'],
  paradigmNote:
    'Like ARIMA, the target is the series’ own next value. What separates the two is not the supervision but the parameterization: ARIMA learns which lags matter, this asserts a level-trend-season structure up front and learns only how fast each component forgets.',

  intuition:
    'Forecast with a weighted average of the past where recent observations count for more, and the weights fall away geometrically. One parameter controls how fast the memory fades: near one and the model chases every wiggle, near zero and it barely moves. That is simple exponential smoothing, which handles a level. Add a second component that tracks how fast the level is changing and you have a trend. Add a third that tracks the repeating pattern and you have Holt-Winters. Each component is updated by the same rule — blend what you just observed with what you already believed — so the entire model is three numbers of state and three parameters, and it never looks at more than the last observation.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{\\alpha, \\beta, \\gamma} \\sum_{t=1}^{n} \\left( y_t - \\hat{y}_{t \\mid t-1} \\right)^2',
      symbols: [
        { symbol: '\\hat{y}_{t \\mid t-1}', meaning: 'the one-step-ahead forecast made before seeing y_t — the model is scored on what it did not know' },
        { symbol: '\\alpha', meaning: 'level smoothing: how much of the new observation replaces the current level' },
        { symbol: '\\beta', meaning: 'trend smoothing: how quickly the estimated slope is allowed to change' },
        { symbol: '\\gamma', meaning: 'seasonal smoothing: how quickly the seasonal pattern is allowed to change' },
      ],
    },
    reading:
      'Choose the smoothing parameters that would have produced the smallest one-step forecast errors over the history. Two things are worth noting. Written this way it looks like a heuristic, and for decades it was treated as one — the ETS state-space formulation later showed that each variant corresponds to a proper statistical model with an actual likelihood, which is what gave the method prediction intervals and automatic model selection rather than a rule of thumb. And every parameter is bounded to [0, 1] with a direct interpretation: it is the fraction of the new observation absorbed into that component, so a fitted alpha of 0.9 tells you the series is close to a random walk without any further analysis.',
  },

  optimization: {
    method: 'Bounded numerical optimization of the smoothing parameters and initial state, with model selection by AIC over the ETS family',
    updateRule: {
      formula:
        '\\ell_t = \\alpha(y_t - s_{t-m}) + (1-\\alpha)(\\ell_{t-1} + b_{t-1}), \\quad b_t = \\beta(\\ell_t - \\ell_{t-1}) + (1-\\beta)b_{t-1}, \\quad s_t = \\gamma(y_t - \\ell_t) + (1-\\gamma)s_{t-m}',
      symbols: [
        { symbol: '\\ell_t', meaning: 'the level: where the series is now, with the seasonal effect removed' },
        { symbol: 'b_t', meaning: 'the trend: how fast the level is moving, estimated from how much the level just changed' },
        { symbol: 's_t', meaning: 'the seasonal component for this position in the cycle, updated once per period' },
        { symbol: 'm', meaning: 'the seasonal period; the seasonal state is m numbers, and the rest of the model is two' },
      ],
    },
    rationale:
      'Every line has the same shape — a convex blend of what was just observed and what was already believed — which is what makes the whole model O(1) in state and one pass in time. There is no matrix, no lag window, and nothing that grows with the length of the history. Fitting means choosing three bounded parameters plus the initial state, which is a small box-constrained optimization solved by L-BFGS-B or Nelder-Mead in milliseconds. Two decisions matter more than the optimizer. Damping the trend — multiplying the slope by a factor below one at each horizon step — is the single most valuable variant, because an undamped linear trend extrapolated far enough is always wrong and damping is what stops it. And the initial state genuinely matters on short series, which is why modern implementations estimate it jointly with the parameters rather than seeding it from the first few observations.',
    hyperparameters: [
      { name: 'alpha', role: 'Level smoothing, and the parameter that matters most. Near 1 the model is a random walk; near 0 it is a global mean', typicalRange: '0.05 to 0.4 on stable series, fitted rather than chosen' },
      { name: 'beta', role: 'Trend smoothing. Often fits near zero, which is the model saying the slope is stable — and is a useful diagnostic in itself' },
      { name: 'gamma', role: 'Seasonal smoothing. Usually small, because a seasonal pattern that changes quickly is generally a sign of a modelling problem elsewhere' },
      { name: 'phi (damping)', role: 'Trend damping factor. The most valuable single addition to the method, and it should be the default rather than an option', typicalRange: '0.80 to 0.98; below 0.8 the trend dies almost immediately' },
      { name: 'seasonality type', role: 'Additive or multiplicative. Multiplicative when the seasonal swing grows with the level, which on sales data it usually does' },
      { name: 'error type (ETS)', role: 'Additive or multiplicative errors. Does not change the point forecast and does change the prediction intervals, which is the whole reason ETS exists' },
    ],
    convergence:
      'The optimization is small and well behaved — three bounded parameters — but the surface is not always informative. A common outcome is a fitted alpha at the boundary: alpha = 1 means the model has decided the best forecast is the last observation, which is a random walk and is sometimes correct and sometimes a sign that the series has a structural break the model is chasing. Beta fitting to zero is the analogous message about the trend. The named failure mode is the undamped trend: Holt’s linear method extrapolates a straight line forever, so a series with a temporary upswing produces a forecast that keeps climbing, and at long horizons the error is unbounded. Damping is the fix, and the M-competition evidence for making it the default rather than an option is about as strong as forecasting evidence gets.',
    complexity:
      'One pass over the series per parameter evaluation — O(n) time, O(m) memory for the seasonal state and O(1) for everything else. A fit is tens of evaluations over three parameters, so milliseconds. That cost profile is the point: with constant state per series, a million series is a million cheap independent recursions rather than a million optimizations over a design matrix, which is why this and not ARIMA sits underneath large-scale demand planning.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Choose the ETS variant — which components exist, and whether errors and seasonality are additive or multiplicative — then fit the smoothing parameters and initial state by minimizing one-step error, and forecast by projecting the components forward. The seasonal component repeats, the level stays put, and the damped trend decays toward zero, which is what makes the long-horizon forecast approach a sensible constant instead of a straight line.',
        where: [
          'Large-scale demand and inventory forecasting, where the number of series makes per-series cost the binding constraint',
          'Any series with clear level, trend and seasonal structure and no useful exogenous drivers',
          'The benchmark in forecasting competitions, where it repeatedly finishes at or near the top',
          'Short series, where there is not enough history to identify ARIMA orders but enough to estimate three parameters',
        ],
        why: 'It commits to a structure instead of learning one, and on real business data that constraint helps rather than hurts — there is rarely enough signal to identify an arbitrary lag structure, and pretending otherwise fits noise. It is also fast enough to run everywhere and simple enough that a planner can read the fitted alpha and understand what the model believes. The M-competition results are the honest summary: it is competitive with or better than fitted ARIMA on business data, and the field has largely accepted that generality is not accuracy. What it cannot do is use exogenous information, which is the clear case for SARIMAX or a regression instead.',
        featurization: [
          'Use multiplicative seasonality when the seasonal swing grows with the level, which on sales data is the common case',
          'Damp the trend by default; an undamped linear extrapolation is wrong at long horizons and the damping parameter is nearly free',
          'Estimate the initial state jointly with the parameters rather than seeding from the first cycle, which matters on short series',
          'Aggregate or switch to a Croston-type method for intermittent demand, where most periods are zero and the Gaussian error assumption fails outright',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive. Inspect the fitted parameters as a diagnostic: alpha pinned at 1 means the model has become a random walk, and beta at 0 means it found no trend — both are informative before any accuracy number is read.',
        pitfalls: [
          'An undamped trend extrapolating a temporary upswing indefinitely, which is the classic failure of Holt’s method',
          'Multiplicative seasonality on a series that touches zero, where the model divides by a near-zero level',
          'Fitting parameters on the whole series before splitting, which leaks and is easy to do because the fit feels like preprocessing',
          'Multiple seasonalities — daily and weekly together — which the classical form cannot represent at all',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'The EWMA control chart is exponential smoothing used for monitoring, and it predates the forecasting application. Smooth the series, compare each new observation against the smoothed value, and signal when the deviation exceeds control limits derived from the smoothed variance. Because the smoothed statistic has far lower variance than the raw series, the chart detects small sustained shifts that a threshold on individual observations misses entirely.',
        where: [
          'Statistical process control, where the EWMA chart is standard for detecting small persistent shifts in a process mean',
          'Infrastructure and business metric monitoring against a trend-and-season-aware baseline',
          'Change-point screening, where a run of same-signed deviations indicates a level shift rather than an outlier',
        ],
        why: 'It is the right detector for a small sustained shift, which is precisely what a per-observation threshold cannot see: averaging is what makes a shift of half a standard deviation visible, and the geometric weighting is what keeps the average responsive. It is also O(1) state, so it runs on a stream at any volume. Against it: the smoothing that gives sensitivity to sustained shifts costs sensitivity to single large spikes, so it is the complement to a threshold rather than a replacement, and the control limits assume a stable variance that many real metrics do not have.',
        featurization: [
          'Fit the smoothing parameters on a confirmed-clean period, since a contaminated fit sets both the baseline and the control limits',
          'Model seasonality explicitly rather than smoothing across it, or every Monday reads as an anomaly',
          'Choose alpha for the shift size you care about — smaller alpha detects smaller sustained shifts more slowly, and that trade is the design of the chart',
        ],
        evaluation:
          'Average run length to detection for a given shift size, which is the process-control metric and is more informative here than precision@k, alongside the false-alarm rate on clean data at the chosen limits.',
        pitfalls: [
          'A single large spike absorbed into the smoothed level, shifting the baseline and masking what follows',
          'Control limits computed from a period whose variance differs from the current one, which mis-sets the whole chart',
          'Treating a run of same-signed deviations as many independent anomalies when it is one level shift',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'It is the forecasting engine inside large-scale inventory and capacity optimization, and the reason is cost rather than accuracy. Replenishment decisions need a demand distribution per SKU per location, which is millions of forecasts refreshed nightly; a model with constant state and a one-pass fit makes that affordable, and a model requiring a per-series optimization over a design matrix does not.',
        where: [
          'Replenishment and safety-stock systems across large retail and distribution catalogues',
          'Capacity and staffing planning where the forecast has to be refreshed frequently across many resources',
          'Any planning system whose binding constraint is the number of series rather than the difficulty of any one of them',
        ],
        why: 'The interesting content here is that the model was chosen for its cost profile and turned out to be competitive on accuracy as well — which is the opposite of how these decisions usually go, and worth internalizing. Its state is three numbers plus the seasonal cycle, its fit is one pass, and it parallelizes perfectly across series because the series are independent. What it does not supply on its own is the distribution the optimizer needs; the ETS state-space formulation is what provides intervals, and using the point forecast with an assumed variance is the shortcut that quietly breaks the service-level guarantee.',
        featurization: [
          'Forecast over the lead-time window rather than one period, since the relevant distribution is demand until the next replenishment arrives',
          'Use the ETS interval rather than a point forecast plus an assumed variance, or the achieved service level will not match the target',
          'Handle intermittent demand separately; a Gaussian interval on a mostly-zero series is meaningless and over-stocks systematically',
        ],
        evaluation:
          'Realized service level and holding cost under the plan, not forecast error. A change that improves MASE and worsens achieved service level has optimized the wrong quantity, which happens whenever the interval degrades while the mean improves.',
        pitfalls: [
          'Scaling the one-step forecast variance by the horizon, which is wrong for any model with trend or seasonality',
          'Ignoring lead time so the distribution covers the wrong window',
          'Treating a forecast refresh as free when the true cost is the downstream replanning it triggers',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'The default forecaster in operational planning at scale. One model per SKU, per location, per resource, refitted on a schedule and consumed by whatever orders, schedules or provisions. Its constant state also makes it natural on a stream: the recursion updates in place as each observation arrives, with no window to maintain.',
        where: [
          'Demand planning across retail and distribution catalogues in the millions of series',
          'Workforce and capacity scheduling against forecast arrival rates',
          'EWMA-based process control on manufacturing lines',
          'Streaming metric smoothing where a moving average would need a window buffer and this does not',
        ],
        why: 'Operational forecasting is dominated by the number of series rather than the difficulty of any single one, and this is the method whose cost profile matches that — constant state, one-pass fit, perfectly parallel across series, and interpretable enough that a planner can override it with a reason. The M-competition evidence that it is also competitive on accuracy is what settles the argument. Its limits show up wherever the structure it commits to is wrong: multiple seasonalities, promotions and holidays, or any case where an exogenous driver is the real explanation.',
        featurization: [
          'Multiplicative seasonality for sales-like series whose swing scales with volume',
          'Damped trend as the default across a catalogue, since undamped extrapolation on thousands of series will produce a few spectacular failures',
          'Route intermittent and slow-moving items to a Croston-type method rather than forcing them through the same model',
          'Handle promotions outside the model — as an override or an adjustment — because the classical form has nowhere to put a regressor',
        ],
        evaluation:
          'Rolling-origin MASE at the aggregation level decisions are made at, plus interval coverage at the operating service level. Track the share of series where the fitted alpha sits at a boundary, which is a fleet-level diagnostic that individual accuracy numbers will not surface.',
        pitfalls: [
          'Promotions learned as seasonality because there is no way to declare them as interventions',
          'Stockouts treated as low demand, teaching the model to forecast the constraint rather than the demand',
          'One model per series becoming unmonitorable at catalogue scale, so failures are found by the business rather than by the system',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Milliseconds per series: one pass per parameter evaluation, tens of evaluations over three bounded parameters. Millions of series is an embarrassingly parallel batch job, which is the property that put this method underneath large-scale planning rather than any accuracy argument.',
    inferenceProfile:
      'Forecasting is projecting three components forward — O(h) arithmetic with no history required, because the state IS the summary of the history. The model is a handful of numbers per series, which makes storing millions of them trivial.',
    retrainingCadence:
      'The state updates online with every observation at no cost, so the level, trend and seasonal components stay current continuously. Only the smoothing parameters need periodic refitting, and they move slowly — which is why production systems refresh state nightly and parameters monthly or less.',
    driftAndMonitoring: [
      'Track the distribution of fitted alpha across the fleet — a shift toward 1 means series are becoming less predictable and the model is degrading toward a random walk',
      'Watch the share of series where a parameter sits at a boundary, which is a fleet-level signal individual accuracy numbers never surface',
      'Monitor interval coverage rather than point error, since the intervals degrade first when the error assumption stops holding',
      'Alert on forecasts that diverge over the horizon, which on an undamped trend is the failure that produces the spectacular outliers in a large catalogue',
    ],
    productionGotchas: [
      'The state is the model: level, trend and the full seasonal cycle must be persisted and restored exactly, and reinitializing from recent history silently produces a different forecaster',
      'Multiplicative seasonality breaks on a series that reaches zero, and a catalogue always contains some — the variant must be chosen per series, not globally',
      'An undamped trend extrapolates without bound, so across thousands of series a few will produce forecasts that are obviously absurd and need clamping',
      'Missing periods break the seasonal indexing: the recursion assumes regular sampling, so a gap must be imputed rather than skipped or the whole cycle shifts',
      'Fitted parameters at a boundary are informative rather than broken, and pipelines that reject them as invalid discard the model’s clearest diagnostic',
    ],
  },

  assumptions: [
    'The series decomposes into level, trend and a single seasonal cycle — a structural commitment made up front rather than learned, and the source of both the method’s strength and its limits',
    'Recent observations are more informative than distant ones, with importance decaying geometrically',
    'The seasonal period is known and fixed, and there is only one of them',
    'Sampling is regular with no gaps, since the seasonal state is indexed by position rather than timestamp',
    'Errors are additive with roughly constant variance, if the ETS prediction intervals are to be believed',
  ],

  pros: [
    {
      point: 'Constant state and a one-pass fit',
      context:
        'Three numbers plus the seasonal cycle, updated in place, with no history required at forecast time. This is why it sits underneath planning systems with millions of series, and it is a cost argument rather than an accuracy one.',
    },
    {
      point: 'Repeatedly competitive with far more general models',
      context:
        'The M-competitions found it at or above fitted ARIMA on real business data. Committing to a structure helps when there is not enough signal to identify an arbitrary one, which on business series is most of the time.',
    },
    {
      point: 'Parameters are interpretable on sight',
      context:
        'Each is the fraction of a new observation absorbed into a component, so a fitted alpha of 0.9 says the series is near a random walk without any further analysis. Genuinely rare, and useful for triage across a large fleet.',
    },
    {
      point: 'The ETS formulation supplies proper prediction intervals',
      context:
        'What turned a heuristic into a statistical model with a likelihood, AIC-based variant selection, and calibrated intervals. Without it the method is a smoothing rule; with it the quantile-shaped decisions downstream are defensible.',
    },
  ],

  cons: [
    {
      point: 'No exogenous regressors',
      context:
        'Price, promotion, weather and holidays have nowhere to go, so their effects are either absorbed into the seasonal component or missed. This is the clearest case for SARIMAX or a regression instead, and it is a structural limit rather than a gap in the implementation.',
    },
    {
      point: 'Exactly one seasonality',
      context:
        'A series with daily and weekly cycles cannot be expressed. TBATS and structural time-series models exist for this, and both give up the simplicity that motivated the method in the first place.',
    },
    {
      point: 'The undamped trend extrapolates without bound',
      context:
        'Holt’s linear method turns a temporary upswing into a forecast that climbs forever. Damping fixes it and should be the default; leaving it off across a large catalogue guarantees a handful of spectacular failures.',
    },
    {
      point: 'Fails on intermittent demand',
      context:
        'A mostly-zero series breaks the Gaussian error assumption and the intervals with it, which systematically over-stocks. Croston-type methods exist precisely for this, and the routing decision has to be made per series.',
    },
  ],

  relatedSlugs: ['arima', 'kalman-filter', 'linear-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Holt-Winters additive - the three update equations, transcribed.

Every line has the same shape: blend what was just observed with what was
already believed. That is why the whole model is three numbers of state plus
the seasonal cycle, and why it never looks further back than one observation.
"""


def forecast_one_step(level, trend, seasonal, period_index):
    """The forecast made BEFORE seeing y_t - which is what is scored."""
    return level + trend + seasonal[period_index]


def fit(series, m, alpha, beta, gamma):
    """m is the seasonal period. Returns the state and the sum of squared
    one-step errors, which is the objective the parameters are chosen on."""
    # Initialization: level from the first cycle, trend from the difference
    # between the first two cycles, seasonality from the deviations. Crude,
    # and on a short series it visibly matters - which is why real
    # implementations estimate the initial state jointly with the parameters.
    level = sum(series[:m]) / m
    trend = (sum(series[m : 2 * m]) - sum(series[:m])) / (m * m)
    seasonal = [series[i] - level for i in range(m)]

    total = 0.0

    for t in range(m, len(series)):
        index = (t - m) % m
        prediction = forecast_one_step(level, trend, seasonal, index)
        error = series[t] - prediction
        total += error * error

        previous_level = level
        # level: blend the deseasonalized observation with where the level
        # was heading.
        level = alpha * (series[t] - seasonal[index]) + (1.0 - alpha) * (level + trend)
        # trend: blend how much the level just moved with the previous slope.
        trend = beta * (level - previous_level) + (1.0 - beta) * trend
        # season: blend this period's deviation with the stored one.
        seasonal[index] = gamma * (series[t] - level) + (1.0 - gamma) * seasonal[index]

    return level, trend, seasonal, total


def select_parameters(series, m, step=0.1):
    """Grid search over the unit cube. Every parameter is a FRACTION, so the
    search space is bounded by construction - which is what makes a grid
    viable here and not for most models."""
    best = (None, None, None, float("inf"))
    value = step

    while value < 1.0:
        beta_value = step
        while beta_value < 1.0:
            gamma_value = step
            while gamma_value < 1.0:
                _, _, _, total = fit(series, m, value, beta_value, gamma_value)
                if total < best[3]:
                    best = (value, beta_value, gamma_value, total)
                gamma_value += step
            beta_value += step
        value += step

    return best[0], best[1], best[2]


def forecast(level, trend, seasonal, m, horizon):
    """Project forward. The seasonal component repeats and the trend is
    extended linearly - which is exactly the behaviour damping exists to
    limit, since an undamped slope is extrapolated forever."""
    out = []
    for h in range(1, horizon + 1):
        out.append(level + h * trend + seasonal[(h - 1) % m])
    return out`,
        profile: 'O(n) per parameter evaluation, and a three-dimensional grid at step 0.1 means about 700 passes over the series.',
      },
      'make-it-right': {
        code: `"""Holt-Winters - typed, damped, additive or multiplicative, bounded fit."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from scipy.optimize import minimize

Vector = NDArray[np.float64]
Seasonality = Literal["additive", "multiplicative"]


@dataclass(frozen=True)
class SmoothingState:
    """The state IS the model: level, trend, and one value per seasonal slot.

    Constant in the length of the history, which is the property that makes
    this method viable across millions of series.
    """

    level: float
    trend: float
    seasonal: Vector
    period: int


@dataclass(frozen=True)
class HoltWinters:
    state: SmoothingState
    alpha: float
    beta: float
    gamma: float
    phi: float                     # trend damping
    seasonality: Seasonality
    sse: float

    def forecast(self, horizon: int) -> Vector:
        """Damped trend: the slope contributes phi + phi^2 + ... + phi^h, which
        converges rather than growing linearly. An undamped Holt forecast
        extrapolates a straight line forever, and at long horizons that is
        always wrong."""
        steps = np.arange(1, horizon + 1)
        damping = np.cumsum(self.phi ** steps)
        base = self.state.level + damping * self.state.trend
        season = self.state.seasonal[(steps - 1) % self.state.period]
        return base + season if self.seasonality == "additive" else base * season


def _run(
    series: Vector,
    period: int,
    alpha: float,
    beta: float,
    gamma: float,
    phi: float,
    seasonality: Seasonality,
) -> tuple[SmoothingState, float]:
    """One pass. Sequential in t by construction - each update reads the state
    the previous step produced."""
    level = float(series[:period].mean())
    trend = float((series[period : 2 * period].sum() - series[:period].sum()) / period**2)
    seasonal = (
        series[:period] - level if seasonality == "additive" else series[:period] / level
    ).astype(np.float64)

    sse = 0.0
    for t in range(period, series.size):
        index = (t - period) % period

        if seasonality == "additive":
            prediction = level + phi * trend + seasonal[index]
        else:
            prediction = (level + phi * trend) * seasonal[index]

        error = series[t] - prediction
        sse += error * error

        previous = level
        if seasonality == "additive":
            level = alpha * (series[t] - seasonal[index]) + (1 - alpha) * (level + phi * trend)
            seasonal[index] = gamma * (series[t] - level) + (1 - gamma) * seasonal[index]
        else:
            level = alpha * (series[t] / seasonal[index]) + (1 - alpha) * (level + phi * trend)
            seasonal[index] = gamma * (series[t] / level) + (1 - gamma) * seasonal[index]

        trend = beta * (level - previous) + (1 - beta) * phi * trend

    return SmoothingState(level, trend, seasonal, period), sse


def fit(
    series: Vector,
    period: int,
    seasonality: Seasonality = "additive",
    damped: bool = True,
) -> HoltWinters:
    """Fit by bounded optimization. Raises ValueError on malformed input."""
    if series.ndim != 1:
        raise ValueError(f"series must be 1-D, got shape {series.shape}")
    if series.size < 2 * period:
        raise ValueError(f"need at least two full cycles, got {series.size} for period {period}")
    if not np.isfinite(series).all():
        raise ValueError("series contains NaN or inf; the recursion cannot skip a period")
    if seasonality == "multiplicative" and (series <= 0).any():
        raise ValueError(
            "multiplicative seasonality requires strictly positive values; this series "
            "reaches zero, which would divide the level by a near-zero seasonal factor"
        )

    def objective(packed: Vector) -> float:
        alpha, beta, gamma, phi = packed
        return _run(series, period, alpha, beta, gamma, phi, seasonality)[1]

    bounds = [(1e-4, 0.9999)] * 3 + [(0.80, 0.9999) if damped else (1.0, 1.0)]
    result = minimize(objective, np.array([0.3, 0.1, 0.1, 0.98]),
                      method="L-BFGS-B", bounds=bounds)

    alpha, beta, gamma, phi = result.x
    state, sse = _run(series, period, alpha, beta, gamma, phi, seasonality)

    return HoltWinters(
        state=state, alpha=float(alpha), beta=float(beta), gamma=float(gamma),
        phi=float(phi), seasonality=seasonality, sse=float(sse),
    )`,
        rationale:
          'Two modelling additions and one optimizer change. Trend damping enters as a real parameter, because an undamped Holt forecast extrapolates a straight line forever and across a catalogue that guarantees occasional absurd forecasts — the damped sum converges instead. Multiplicative seasonality is supported for series whose swing scales with the level, which on sales data is the common case, and the positivity precondition it requires becomes an explicit error rather than a division by a near-zero factor. The grid search is replaced by bounded L-BFGS-B, which turns roughly seven hundred passes over the series into a few dozen.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(n) per evaluation with tens of evaluations under L-BFGS-B instead of hundreds under a grid.',
      },
      'make-it-fast': {
        code: `"""Holt-Winters - vectorized ACROSS series, not across time."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def fit_batch(
    panel: Matrix,
    period: int,
    alpha: Vector,
    beta: Vector,
    gamma: Vector,
    phi: Vector,
) -> tuple[Matrix, Vector]:
    """Run the recursion for MANY series at once.

    The recursion is irreducibly sequential in time - each update reads the
    state the previous step produced, and no rewrite changes that. But series
    are completely INDEPENDENT of one another, so the loop over series can
    disappear entirely while the loop over time remains.

    That inversion is the whole optimization, and it is the shape production
    demand-planning systems actually use: one Python-level iteration per
    TIMESTEP for the entire catalogue, rather than one per series per step.

    panel is (n_series, n_timesteps), and every parameter is a per-series
    vector so a whole catalogue can be fitted with different smoothing
    constants in one pass.
    """
    if panel.ndim != 2:
        raise ValueError(f"panel must be (series, time), got shape {panel.shape}")
    if panel.shape[1] < 2 * period:
        raise ValueError("every series needs at least two full cycles")

    # One C-contiguous float64 block; every timestep slices a column out of it.
    data = np.ascontiguousarray(panel, dtype=np.float64)
    n_series, n_steps = data.shape

    # State for the whole catalogue, allocated once.
    level = data[:, :period].mean(axis=1)
    trend = (
        data[:, period : 2 * period].sum(axis=1) - data[:, :period].sum(axis=1)
    ) / period**2
    seasonal = data[:, :period] - level[:, None]        # (n_series, period)

    sse = np.zeros(n_series, dtype=np.float64)
    previous = np.empty(n_series, dtype=np.float64)     # reused every step
    prediction = np.empty(n_series, dtype=np.float64)
    error = np.empty(n_series, dtype=np.float64)

    for t in range(period, n_steps):
        index = (t - period) % period
        column = data[:, t]
        season = seasonal[:, index]

        # prediction = level + phi * trend + season, built in place so no
        # temporary of length n_series is created per step.
        np.multiply(phi, trend, out=prediction)
        prediction += level
        prediction += season

        np.subtract(column, prediction, out=error)
        sse += error * error

        np.copyto(previous, level)

        # level <- alpha * (y - s) + (1 - alpha) * (level + phi * trend)
        np.subtract(column, season, out=prediction)
        prediction *= alpha
        level *= 1.0 - alpha
        level += prediction
        level += (1.0 - alpha) * phi * trend

        # season <- gamma * (y - level) + (1 - gamma) * season
        np.subtract(column, level, out=prediction)
        prediction *= gamma
        seasonal[:, index] *= 1.0 - gamma
        seasonal[:, index] += prediction

        # trend <- beta * (level - previous) + (1 - beta) * phi * trend
        np.subtract(level, previous, out=prediction)
        prediction *= beta
        trend *= (1.0 - beta) * phi
        trend += prediction

    return seasonal, sse`,
        rationale:
          'The recursion is sequential in time and no rewrite changes that — each update reads the state the previous step produced. What is available instead is the other axis: series are completely independent, so the loop over series disappears and only the loop over time remains. One interpreter iteration per timestep for an entire catalogue, rather than one per series per timestep, is the inversion that makes this the shape production demand-planning systems actually use. Every per-step temporary is written through preallocated buffers, because at a million series each intermediate is an eight-megabyte allocation repeated once per timestep.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The loop over series is removed entirely by treating the catalogue as a matrix, so the interpreter runs once per timestep rather than once per series per timestep.',
            tradeoff: 'Every series must share the same length, seasonal period and model variant — a real constraint, since a catalogue always contains series that need multiplicative seasonality or a different period, and those have to be batched separately.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The per-step prediction, error and previous-level buffers are allocated once and rewritten, avoiding several n_series-length allocations on every timestep.',
            tradeoff: 'The update chain now reuses one buffer for four different quantities in sequence, which is fast and materially harder to read — reordering any line corrupts the state silently rather than raising.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'A C-contiguous float64 panel means each timestep reads a column with a fixed stride and the state vectors stay cache-resident across the whole pass.',
            tradeoff: 'Series-major layout makes the per-timestep column access strided rather than sequential; the transposed layout would fix that and break the seasonal slice, so one of the two always pays.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(n_series * n_steps) with one interpreter iteration per timestep for the whole catalogue. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Holt-Winters additive - the three update equations, transcribed.
#include <cstddef>
#include <limits>
#include <vector>

// Every line has the same shape: blend what was just observed with what was
// already believed. That is why the model is three numbers of state plus the
// seasonal cycle, and never looks further back than one observation.
double Fit(const std::vector<double>& series, std::size_t m, double alpha, double beta,
           double gamma, double& level_out, double& trend_out,
           std::vector<double>& seasonal_out) {
  // Crude initialization from the first two cycles. On a short series this
  // visibly matters, which is why real implementations estimate the initial
  // state jointly with the parameters.
  double level = 0.0;
  for (std::size_t i = 0; i < m; ++i) level += series[i];
  level /= static_cast<double>(m);

  double first = 0.0;
  double second = 0.0;
  for (std::size_t i = 0; i < m; ++i) {
    first += series[i];
    second += series[m + i];
  }
  double trend = (second - first) / static_cast<double>(m * m);

  std::vector<double> seasonal(m, 0.0);
  for (std::size_t i = 0; i < m; ++i) seasonal[i] = series[i] - level;

  double total = 0.0;

  for (std::size_t t = m; t < series.size(); ++t) {
    const std::size_t index = (t - m) % m;

    // The forecast made BEFORE seeing y_t - which is what is scored.
    const double prediction = level + trend + seasonal[index];
    const double error = series[t] - prediction;
    total += error * error;

    const double previous = level;
    // level: blend the deseasonalized observation with where it was heading.
    level = alpha * (series[t] - seasonal[index]) + (1.0 - alpha) * (level + trend);
    // trend: blend how much the level just moved with the previous slope.
    trend = beta * (level - previous) + (1.0 - beta) * trend;
    // season: blend this period's deviation with the stored one.
    seasonal[index] = gamma * (series[t] - level) + (1.0 - gamma) * seasonal[index];
  }

  level_out = level;
  trend_out = trend;
  seasonal_out = seasonal;
  return total;
}

// Grid search over the unit cube. Every parameter is a FRACTION, so the space
// is bounded by construction - which is what makes a grid viable here and not
// for most models.
void SelectParameters(const std::vector<double>& series, std::size_t m, double step,
                      double& alpha_out, double& beta_out, double& gamma_out) {
  double best = std::numeric_limits<double>::infinity();

  for (double alpha = step; alpha < 1.0; alpha += step) {
    for (double beta = step; beta < 1.0; beta += step) {
      for (double gamma = step; gamma < 1.0; gamma += step) {
        double level = 0.0;
        double trend = 0.0;
        std::vector<double> seasonal;
        const double total = Fit(series, m, alpha, beta, gamma, level, trend, seasonal);
        if (total < best) {
          best = total;
          alpha_out = alpha;
          beta_out = beta;
          gamma_out = gamma;
        }
      }
    }
  }
}`,
        profile: 'O(n) per evaluation, and a three-dimensional grid at step 0.1 means about 700 passes with a fresh seasonal vector allocated on each.',
      },
      'make-it-right': {
        code: `// Holt-Winters - damped, multiplicative option, reused state, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

enum class Seasonality { kAdditive, kMultiplicative };

struct SmoothingParameters {
  double alpha = 0.3;
  double beta = 0.1;
  double gamma = 0.1;
  double phi = 0.98;      // trend damping
};

// The state IS the model: level, trend, and one value per seasonal slot.
// Constant in the length of the history, which is the property that makes the
// method viable across millions of series.
class HoltWinters {
 public:
  HoltWinters(std::size_t period, Seasonality seasonality)
      : period_(period), seasonality_(seasonality), seasonal_(period, 0.0) {
    if (period_ < 2) throw std::invalid_argument("seasonal period must be at least 2");
  }

  // One pass. Sequential in t by construction: each update reads the state
  // the previous step produced.
  double Run(std::span<const double> series, const SmoothingParameters& parameters) {
    if (series.size() < 2 * period_) {
      throw std::invalid_argument("need at least two full cycles");
    }
    for (const double value : series) {
      if (!std::isfinite(value)) {
        throw std::invalid_argument("series contains NaN or inf; the recursion cannot skip a period");
      }
      if (seasonality_ == Seasonality::kMultiplicative && value <= 0.0) {
        throw std::invalid_argument(
            "multiplicative seasonality requires strictly positive values; a zero would "
            "divide the level by a near-zero seasonal factor");
      }
    }

    double level = 0.0;
    for (std::size_t i = 0; i < period_; ++i) level += series[i];
    level /= static_cast<double>(period_);

    double first = 0.0;
    double second = 0.0;
    for (std::size_t i = 0; i < period_; ++i) {
      first += series[i];
      second += series[period_ + i];
    }
    double trend = (second - first) / static_cast<double>(period_ * period_);

    for (std::size_t i = 0; i < period_; ++i) {
      seasonal_[i] = seasonality_ == Seasonality::kAdditive ? series[i] - level
                                                            : series[i] / level;
    }

    double sse = 0.0;

    for (std::size_t t = period_; t < series.size(); ++t) {
      const std::size_t index = (t - period_) % period_;
      const double damped = parameters.phi * trend;

      const double prediction = seasonality_ == Seasonality::kAdditive
                                    ? level + damped + seasonal_[index]
                                    : (level + damped) * seasonal_[index];
      const double error = series[t] - prediction;
      sse += error * error;

      const double previous = level;
      if (seasonality_ == Seasonality::kAdditive) {
        level = parameters.alpha * (series[t] - seasonal_[index]) +
                (1.0 - parameters.alpha) * (level + damped);
        seasonal_[index] = parameters.gamma * (series[t] - level) +
                           (1.0 - parameters.gamma) * seasonal_[index];
      } else {
        level = parameters.alpha * (series[t] / seasonal_[index]) +
                (1.0 - parameters.alpha) * (level + damped);
        seasonal_[index] = parameters.gamma * (series[t] / level) +
                           (1.0 - parameters.gamma) * seasonal_[index];
      }

      trend = parameters.beta * (level - previous) +
              (1.0 - parameters.beta) * parameters.phi * trend;
    }

    level_ = level;
    trend_ = trend;
    return sse;
  }

  // Damped trend: the slope contributes phi + phi^2 + ... + phi^h, which
  // CONVERGES rather than growing linearly. An undamped Holt forecast
  // extrapolates a straight line forever, and across a large catalogue that
  // guarantees occasional absurd forecasts.
  [[nodiscard]] std::vector<double> Forecast(int horizon, double phi) const {
    std::vector<double> out;
    out.reserve(static_cast<std::size_t>(horizon));

    double damping = 0.0;
    double power = 1.0;
    for (int h = 1; h <= horizon; ++h) {
      power *= phi;
      damping += power;

      const double base = level_ + damping * trend_;
      const double season = seasonal_[(static_cast<std::size_t>(h) - 1) % period_];
      out.push_back(seasonality_ == Seasonality::kAdditive ? base + season : base * season);
    }
    return out;
  }

 private:
  std::size_t period_;
  Seasonality seasonality_;
  std::vector<double> seasonal_;   // owned; reused across every evaluation
  double level_ = 0.0;
  double trend_ = 0.0;
};`,
        rationale:
          'Trend damping becomes a real parameter, which matters more than any implementation detail here: an undamped forecast extrapolates a straight line forever, and the damped slope sum converges instead. Multiplicative seasonality is supported for series whose swing scales with the level, with the positivity precondition it needs checked before any work rather than surfacing as a division by a near-zero factor. The seasonal buffer is owned by the object and reused across every parameter evaluation instead of being allocated per call, which matters because an optimizer will call this hundreds of times.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n) per evaluation with one seasonal buffer for the lifetime of the object.',
      },
      'make-it-fast': {
        code: `// Holt-Winters - one series per thread, aliasing hints in the recursion.
#include <cstddef>
#include <span>
#include <vector>

// The recursion is irreducibly sequential in time: each update reads the state
// the previous step produced. What IS parallel is the other axis - series are
// completely independent of one another.
//
// That is the shape of the speedup here, and it matches how the method is
// actually deployed: a catalogue of millions of series, each cheap, fitted as
// an embarrassingly parallel batch.
struct SmoothingParameters {
  double alpha;
  double beta;
  double gamma;
  double phi;
};

// __restrict tells the compiler the series, the seasonal buffer and the output
// cannot alias, which lets it keep level, trend and the accumulator in
// registers across the whole loop instead of reloading after every write.
double RunOne(const double* __restrict series, std::size_t length, std::size_t period,
              double* __restrict seasonal, const SmoothingParameters& parameters,
              double& level_out, double& trend_out) {
  double level = 0.0;
  for (std::size_t i = 0; i < period; ++i) level += series[i];
  level /= static_cast<double>(period);

  double first = 0.0;
  double second = 0.0;
  for (std::size_t i = 0; i < period; ++i) {
    first += series[i];
    second += series[period + i];
  }
  double trend = (second - first) / static_cast<double>(period * period);

  for (std::size_t i = 0; i < period; ++i) seasonal[i] = series[i] - level;

  const double alpha = parameters.alpha;
  const double beta = parameters.beta;
  const double gamma = parameters.gamma;
  const double phi = parameters.phi;
  double sse = 0.0;

  for (std::size_t t = period; t < length; ++t) {
    const std::size_t index = (t - period) % period;
    const double damped = phi * trend;

    const double error = series[t] - (level + damped + seasonal[index]);
    sse += error * error;

    const double previous = level;
    level = alpha * (series[t] - seasonal[index]) + (1.0 - alpha) * (level + damped);
    seasonal[index] = gamma * (series[t] - level) + (1.0 - gamma) * seasonal[index];
    trend = beta * (level - previous) + (1.0 - beta) * damped;
  }

  level_out = level;
  trend_out = trend;
  return sse;
}

// A whole catalogue. panel is row-major (n_series, n_steps), so each series is
// one contiguous run - which is the layout the sequential recursion wants.
std::vector<double> FitBatch(std::span<const double> panel, std::size_t n_series,
                             std::size_t n_steps, std::size_t period,
                             const std::vector<SmoothingParameters>& parameters,
                             std::vector<double>& levels, std::vector<double>& trends,
                             std::vector<double>& seasonals) {
  std::vector<double> sse(n_series, 0.0);
  levels.assign(n_series, 0.0);
  trends.assign(n_series, 0.0);
  seasonals.assign(n_series * period, 0.0);

  // Each iteration touches only its own series and its own output slots, so
  // there is nothing to guard and no reduction to merge.
#pragma omp parallel for schedule(static)
  for (std::size_t s = 0; s < n_series; ++s) {
    sse[s] = RunOne(panel.data() + s * n_steps, n_steps, period,
                    seasonals.data() + s * period, parameters[s],
                    levels[s], trends[s]);
  }

  return sse;
}`,
        rationale:
          'The parallelism is placed on the only axis that has any: series are independent, while the recursion within a series is irreducibly sequential because each update reads the state the previous step produced. That matches how the method is actually deployed — a catalogue of millions of cheap independent fits — so this is an embarrassingly parallel batch with no reduction to merge. Within a single series, aliasing hints let the compiler keep the level, trend and error accumulator in registers across the loop rather than reloading after every write to the seasonal buffer, and row-major storage makes each series one contiguous run.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each series reads its own contiguous row and writes its own output slots, so the batch partitions across cores with no synchronization and no shared state at all.',
            tradeoff: 'Series vary in length and cost in real catalogues, so a static schedule leaves workers idle at the end — and there is no parallelism available within a series to fall back on.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the seasonal buffer may alias the series and reloads the level and trend after every write in the inner loop.',
            tradeoff: '__restrict is an unchecked promise, so an overlapping buffer produces silently wrong results — and the recursion has a loop-carried dependency that will not vectorize regardless, so the gain is register reuse rather than SIMD.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A series is one contiguous run, which is what the sequential time recursion wants — the whole pass over a series stays in cache with a single stream.',
            tradeoff: 'The transposed layout would suit a cross-series vectorized formulation instead, so this choice commits to per-series parallelism and rules out the batched alternative without a transpose.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(n_series * n_steps / cores), with each series a sequential single-stream pass. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Holt-Winters additive - the three update equations, transcribed.

/// Every line has the same shape: blend what was just observed with what was
/// already believed. That is why the model is three numbers of state plus the
/// seasonal cycle, and never looks further back than one observation.
pub fn fit(
    series: &[f64],
    m: usize,
    alpha: f64,
    beta: f64,
    gamma: f64,
) -> (f64, f64, Vec<f64>, f64) {
    // Crude initialization from the first two cycles. On a short series this
    // visibly matters, which is why real implementations estimate the initial
    // state jointly with the parameters.
    let mut level = series[..m].iter().sum::<f64>() / m as f64;
    let first: f64 = series[..m].iter().sum();
    let second: f64 = series[m..2 * m].iter().sum();
    let mut trend = (second - first) / (m * m) as f64;

    let mut seasonal: Vec<f64> = series[..m].iter().map(|value| value - level).collect();
    let mut total = 0.0;

    for t in m..series.len() {
        let index = (t - m) % m;

        // The forecast made BEFORE seeing y_t - which is what is scored.
        let prediction = level + trend + seasonal[index];
        let error = series[t] - prediction;
        total += error * error;

        let previous = level;
        // level: blend the deseasonalized observation with where it was heading.
        level = alpha * (series[t] - seasonal[index]) + (1.0 - alpha) * (level + trend);
        // trend: blend how much the level just moved with the previous slope.
        trend = beta * (level - previous) + (1.0 - beta) * trend;
        // season: blend this period's deviation with the stored one.
        seasonal[index] = gamma * (series[t] - level) + (1.0 - gamma) * seasonal[index];
    }

    (level, trend, seasonal, total)
}

/// Grid search over the unit cube. Every parameter is a FRACTION, so the space
/// is bounded by construction - which is what makes a grid viable here and not
/// for most models.
pub fn select_parameters(series: &[f64], m: usize, step: f64) -> (f64, f64, f64) {
    let mut best = (0.0, 0.0, 0.0, f64::INFINITY);

    let steps = (1.0 / step) as usize;
    for a in 1..steps {
        for b in 1..steps {
            for g in 1..steps {
                let alpha = a as f64 * step;
                let beta = b as f64 * step;
                let gamma = g as f64 * step;
                let (_, _, _, total) = fit(series, m, alpha, beta, gamma);
                if total < best.3 {
                    best = (alpha, beta, gamma, total);
                }
            }
        }
    }

    (best.0, best.1, best.2)
}`,
        profile: 'O(n) per evaluation, roughly 700 passes for a step-0.1 grid, with a fresh seasonal Vec allocated on every one.',
      },
      'make-it-right': {
        code: `//! Holt-Winters - typed errors, damping, seasonality variants, reused state.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum SmoothingError {
    TooShort { length: usize, needed: usize },
    NonFinite { index: usize },
    NonPositive { index: usize },
    Period { value: usize },
    Parameter { name: &'static str, value: f64 },
}

impl fmt::Display for SmoothingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooShort { length, needed } => {
                write!(f, "series of length {length} needs at least {needed} for two full cycles")
            }
            Self::NonFinite { index } => write!(
                f,
                "non-finite value at index {index}; the recursion cannot skip a period"
            ),
            Self::NonPositive { index } => write!(
                f,
                "value at {index} is not positive; multiplicative seasonality would divide \
                 the level by a near-zero factor"
            ),
            Self::Period { value } => write!(f, "seasonal period must be at least 2, got {value}"),
            Self::Parameter { name, value } => {
                write!(f, "{name} must lie in (0, 1), got {value}")
            }
        }
    }
}

impl std::error::Error for SmoothingError {}

/// A smoothing constant. A newtype because alpha, beta, gamma and phi are four
/// bare f64 in one signature and every one of them is a fraction in (0, 1) -
/// which is exactly the shape that gets transposed without any error.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Fraction(f64);

impl Fraction {
    pub fn new(value: f64, name: &'static str) -> Result<Self, SmoothingError> {
        if !value.is_finite() || value <= 0.0 || value >= 1.0 {
            return Err(SmoothingError::Parameter { name, value });
        }
        Ok(Self(value))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Seasonality {
    Additive,
    Multiplicative,
}

#[derive(Debug, Clone, Copy)]
pub struct Parameters {
    pub alpha: Fraction,
    pub beta: Fraction,
    pub gamma: Fraction,
    /// Trend damping. The most valuable single addition to the method: an
    /// undamped slope is extrapolated forever, and the damped sum converges.
    pub phi: Fraction,
}

/// The state IS the model - constant in the length of the history, which is
/// what makes this viable across millions of series.
pub struct HoltWinters {
    period: usize,
    seasonality: Seasonality,
    /// Reused across every parameter evaluation; an optimizer calls the
    /// recursion hundreds of times and the previous stage allocated per call.
    seasonal: Vec<f64>,
    level: f64,
    trend: f64,
}

impl HoltWinters {
    pub fn new(period: usize, seasonality: Seasonality) -> Result<Self, SmoothingError> {
        if period < 2 {
            return Err(SmoothingError::Period { value: period });
        }
        Ok(Self { period, seasonality, seasonal: vec![0.0; period], level: 0.0, trend: 0.0 })
    }

    /// One pass. Sequential in t by construction: each update reads the state
    /// the previous step produced.
    pub fn run(&mut self, series: &[f64], parameters: Parameters) -> Result<f64, SmoothingError> {
        let needed = 2 * self.period;
        if series.len() < needed {
            return Err(SmoothingError::TooShort { length: series.len(), needed });
        }
        for (index, value) in series.iter().enumerate() {
            if !value.is_finite() {
                return Err(SmoothingError::NonFinite { index });
            }
            if self.seasonality == Seasonality::Multiplicative && *value <= 0.0 {
                return Err(SmoothingError::NonPositive { index });
            }
        }

        let m = self.period;
        self.level = series[..m].iter().sum::<f64>() / m as f64;
        let first: f64 = series[..m].iter().sum();
        let second: f64 = series[m..2 * m].iter().sum();
        self.trend = (second - first) / (m * m) as f64;

        for (slot, value) in self.seasonal.iter_mut().zip(&series[..m]) {
            *slot = match self.seasonality {
                Seasonality::Additive => value - self.level,
                Seasonality::Multiplicative => value / self.level,
            };
        }

        let (alpha, beta, gamma, phi) =
            (parameters.alpha.0, parameters.beta.0, parameters.gamma.0, parameters.phi.0);
        let mut sse = 0.0;

        for (offset, &observed) in series[m..].iter().enumerate() {
            let index = offset % m;
            let damped = phi * self.trend;
            let season = self.seasonal[index];

            let prediction = match self.seasonality {
                Seasonality::Additive => self.level + damped + season,
                Seasonality::Multiplicative => (self.level + damped) * season,
            };
            let error = observed - prediction;
            sse += error * error;

            let previous = self.level;
            match self.seasonality {
                Seasonality::Additive => {
                    self.level = alpha * (observed - season) + (1.0 - alpha) * (self.level + damped);
                    self.seasonal[index] = gamma * (observed - self.level) + (1.0 - gamma) * season;
                }
                Seasonality::Multiplicative => {
                    self.level = alpha * (observed / season) + (1.0 - alpha) * (self.level + damped);
                    self.seasonal[index] = gamma * (observed / self.level) + (1.0 - gamma) * season;
                }
            }
            self.trend = beta * (self.level - previous) + (1.0 - beta) * damped;
        }

        Ok(sse)
    }

    /// Damped trend: the slope contributes phi + phi^2 + ... + phi^h, which
    /// CONVERGES rather than growing linearly.
    #[must_use]
    pub fn forecast(&self, horizon: usize, phi: Fraction) -> Vec<f64> {
        let mut out = Vec::with_capacity(horizon);
        let mut damping = 0.0;
        let mut power = 1.0;

        for h in 1..=horizon {
            power *= phi.0;
            damping += power;

            let base = self.level + damping * self.trend;
            let season = self.seasonal[(h - 1) % self.period];
            out.push(match self.seasonality {
                Seasonality::Additive => base + season,
                Seasonality::Multiplicative => base * season,
            });
        }

        out
    }
}
`,
        rationale:
          'Trend damping enters as a real parameter, which matters more than any implementation change: an undamped forecast extrapolates a straight line forever and the damped sum converges instead. Multiplicative seasonality is supported for series whose swing scales with the level, with its positivity precondition checked before any work rather than surfacing as a division by a near-zero factor. The seasonal buffer moves into the struct and is reused, since an optimizer calls the recursion hundreds of times. And the four smoothing constants get a validated newtype, because they are four bare f64 in one signature that are all fractions in the same range — the shape that gets transposed with no error anywhere.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n) per evaluation with one seasonal buffer for the object’s lifetime and bounds checks elided in the pass.',
      },
      'make-it-fast': {
        code: `//! Holt-Winters - a catalogue fitted as an embarrassingly parallel batch.

use rayon::prelude::*;

#[derive(Debug, Clone, Copy)]
pub struct Parameters {
    pub alpha: f64,
    pub beta: f64,
    pub gamma: f64,
    pub phi: f64,
}

#[derive(Debug, Clone)]
pub struct SeriesFit {
    pub level: f64,
    pub trend: f64,
    pub seasonal: Vec<f64>,
    pub sse: f64,
}

/// The recursion is irreducibly sequential in time - each update reads the
/// state the previous step produced, and no rewrite changes that. What IS
/// parallel is the other axis: series are completely independent.
///
/// That is the honest shape of the speedup here, and it matches how the method
/// is actually deployed - a catalogue of millions of cheap series fitted as an
/// embarrassingly parallel batch, which is precisely the cost profile that put
/// exponential smoothing rather than ARIMA underneath large-scale planning.
#[inline]
fn run_one(series: &[f64], period: usize, parameters: Parameters) -> SeriesFit {
    let mut level = series[..period].iter().sum::<f64>() / period as f64;
    let first: f64 = series[..period].iter().sum();
    let second: f64 = series[period..2 * period].iter().sum();
    let mut trend = (second - first) / (period * period) as f64;

    // Allocated once at its exact final length, never grown.
    let mut seasonal: Vec<f64> = Vec::with_capacity(period);
    seasonal.extend(series[..period].iter().map(|value| value - level));

    let Parameters { alpha, beta, gamma, phi } = parameters;
    let mut sse = 0.0;

    for (offset, &observed) in series[period..].iter().enumerate() {
        let index = offset % period;
        let damped = phi * trend;
        let season = seasonal[index];

        let error = observed - (level + damped + season);
        sse += error * error;

        let previous = level;
        level = alpha * (observed - season) + (1.0 - alpha) * (level + damped);
        seasonal[index] = gamma * (observed - level) + (1.0 - gamma) * season;
        trend = beta * (level - previous) + (1.0 - beta) * damped;
    }

    SeriesFit { level, trend, seasonal, sse }
}

/// A whole catalogue. \`panel\` is row-major (n_series, n_steps), so each series
/// is one contiguous run - the layout a sequential recursion wants.
#[must_use]
pub fn fit_batch(
    panel: &[f64],
    n_steps: usize,
    period: usize,
    parameters: &[Parameters],
) -> Vec<SeriesFit> {
    panel
        .par_chunks_exact(n_steps)
        .zip(parameters.par_iter())
        .map(|(series, &params)| run_one(series, period, params))
        .collect()
}

/// Parameter selection for one series. The grid is bounded by construction -
/// every parameter is a fraction - so candidates can also be evaluated in
/// parallel when a single series is being tuned rather than a catalogue.
#[must_use]
pub fn select_parameters(series: &[f64], period: usize, steps: usize) -> Parameters {
    let mut grid = Vec::with_capacity(steps * steps * steps);
    for a in 1..steps {
        for b in 1..steps {
            for g in 1..steps {
                grid.push(Parameters {
                    alpha: a as f64 / steps as f64,
                    beta: b as f64 / steps as f64,
                    gamma: g as f64 / steps as f64,
                    phi: 0.98,
                });
            }
        }
    }

    grid.into_par_iter()
        .map(|params| (params, run_one(series, period, params).sse))
        .min_by(|(_, a), (_, b)| a.total_cmp(b))
        .map_or(
            Parameters { alpha: 0.3, beta: 0.1, gamma: 0.1, phi: 0.98 },
            |(params, _)| params,
        )
}
`,
        rationale:
          'The parallelism goes on the only axis that has any. Within a series the recursion is irreducibly sequential — each update reads the state the previous step produced — but series are completely independent, so a catalogue is a parallel map over contiguous rows with no shared state and no reduction. That matches how the method is actually deployed, and it is the cost profile that put exponential smoothing rather than ARIMA underneath large-scale planning. The same structure covers the other case: when one series is being tuned rather than a catalogue, the bounded parameter grid is itself a parallel map.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Series during a batch fit and candidates during a grid search are both fully independent, so each is a parallel map with no locking and no atomics anywhere.',
            tradeoff: 'There is no parallelism available inside a single series, so a batch of one long series gets nothing — and real catalogues have uneven series lengths, which leaves workers idle at the end of a partition.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'par_chunks_exact hands each worker one contiguous series, which is exactly what a sequential single-stream recursion wants — the whole pass stays in cache.',
            tradeoff: 'Commits to series-major layout, which rules out the cross-series vectorized formulation without a transpose, and requires every series in a batch to share a length.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The seasonal buffer is sized to the period before being filled and the candidate grid to its exact count, so neither is grown and copied.',
            tradeoff: 'The seasonal buffer is still allocated once per series rather than reused across a batch; eliminating that would need a thread-local arena for a buffer that is only m elements long.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n_series * n_steps / cores), each series a sequential single-stream pass. Illustrative, not a measured benchmark.',
      },
    },
  },
};
