import type { AiMlModel } from '../../types';

/**
 * Quantile Regression — linear regression with the squared loss swapped for the
 * asymmetric absolute ("pinball") loss, so the fit targets a chosen conditional
 * quantile instead of the conditional mean.
 *
 * Why this entry has a distinct code progression: the loss is not differentiable
 * at zero, so the three stages are not "loop, vectorize, closed form" as in
 * linear regression. There is no closed form. The honest progression is a literal
 * subgradient loop, a typed and validated version of it, and a version that fits
 * a whole grid of quantiles in one batched matrix product (and then repairs the
 * quantile crossing that independent fits produce).
 */
export const QUANTILE_REGRESSION: AiMlModel = {
  slug: 'quantile-regression',
  name: 'Quantile Regression',
  aliases: ['Quantile Regression', 'Pinball loss regression', 'Koenker-Bassett'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'model',

  paradigms: ['supervised'],
  // 'anomaly-detection' because the model is genuinely used that way: an
  // observation outside the fitted tau=0.01 / 0.99 band is flagged. See
  // applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'anomaly-detection'],

  intuition:
    'Ordinary least squares answers "what is the typical outcome here?" Quantile regression answers "what outcome should I expect to be exceeded only 10% of the time here?" It fits the same straight line, but penalizes a miss on one side more than a miss on the other: for the 90th percentile, undershooting costs nine times as much as overshooting, so the line is pushed up until exactly 90% of the points sit beneath it. Fit several tau values and you get a band, not a line, and the band can fan out where the data is noisier, which a single mean line cannot say.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J_\\tau(\\theta) = \\frac{1}{n} \\sum_{i=1}^{n} \\rho_\\tau\\!\\left(y_i - \\mathbf{x}_i^{\\top}\\theta\\right), \\qquad \\rho_\\tau(u) = u\\left(\\tau - \\mathbf{1}\\{u < 0\\}\\right)',
      symbols: [
        { symbol: '\\tau', meaning: 'the target quantile level, strictly between 0 and 1 (0.5 is the median)' },
        { symbol: '\\rho_\\tau(u)', meaning: 'the check (pinball) loss: tau times the residual if it is positive, (1 - tau) times its magnitude if it is negative' },
        { symbol: 'u_i = y_i - \\mathbf{x}_i^{\\top}\\theta', meaning: 'the residual: observed minus predicted' },
        { symbol: '\\mathbf{1}\\{u < 0\\}', meaning: 'indicator that the model overshot the observation' },
        { symbol: '\\theta', meaning: 'the coefficient vector for this particular quantile' },
      ],
    },
    reading:
      'Charge tau per unit of undershoot and (1 - tau) per unit of overshoot, then average. Why is the minimiser the tau-quantile? Differentiate the expected loss with respect to a constant prediction q: the derivative is (1 - tau) times the probability of overshooting, minus tau times the probability of undershooting, which simplifies to F(q) - tau, where F is the CDF of y. It is zero exactly when F(q) = tau, i.e. when a fraction tau of the mass lies below q. At tau = 0.5 both sides cost the same, the loss is half the absolute error, and the minimiser is the median. That is the contrast with OLS: squared error has a gradient that grows with the miss, so one wild point pulls the fit toward itself and the minimiser is the mean; absolute error has a gradient of fixed magnitude, so a point ten times further away pulls no harder, which is exactly why the median shrugs off outliers and the mean does not. The distance that is being minimized is the Manhattan (L1) distance between the vector of targets and the vector of predictions, summed coordinate by coordinate with no squaring; quantile regression is that same L1 geometry with the two sides of each coordinate priced asymmetrically (tau and 1 - tau), and swapping in Euclidean (L2) distance gives back OLS and the mean. No similarity between feature vectors is involved: the metric lives entirely in the residual space.',
  },

  optimization: {
    method: 'Linear programming (simplex or interior point), or subgradient descent at scale',
    updateRule: {
      formula:
        '\\min_{\\theta,\\,u^{+},\\,u^{-} \\ge 0} \\; \\tau\\,\\mathbf{1}^{\\top}u^{+} + (1-\\tau)\\,\\mathbf{1}^{\\top}u^{-} \\;\\;\\text{s.t.}\\;\\; X\\theta + u^{+} - u^{-} = y \\qquad\\text{or}\\qquad \\theta \\leftarrow \\theta - \\eta_t \\cdot \\frac{1}{n}\\sum_{i=1}^{n} \\mathbf{x}_i\\left(\\mathbf{1}\\{y_i < \\mathbf{x}_i^{\\top}\\theta\\} - \\tau\\right)',
      symbols: [
        { symbol: 'u^{+}, u^{-}', meaning: 'the positive and negative parts of each residual, so that u = u+ - u-; the slack variables that turn the kink into linear constraints' },
        { symbol: 'X\\theta + u^{+} - u^{-} = y', meaning: 'the equality constraint: prediction plus the two slacks reproduces the target exactly' },
        { symbol: '\\tau,\\ 1-\\tau', meaning: 'the per-unit prices on the two slacks; the asymmetry of the loss lives entirely here' },
        { symbol: '\\eta_t', meaning: 'diminishing step size for the subgradient form, e.g. proportional to 1 over the square root of t' },
        { symbol: '\\mathbf{1}\\{y_i < \\mathbf{x}_i^{\\top}\\theta\\} - \\tau', meaning: 'the per-example subgradient weight: 1 - tau when the model overshoots, -tau when it undershoots; bounded, unlike the OLS residual' },
      ],
    },
    rationale:
      'The objective is convex but has a kink at u = 0 for every example, so there is no gradient to set to zero and no closed form. The kink is also the reason it is a linear program: split each residual into non-negative positive and negative parts, and the loss becomes a linear function of those parts subject to a linear equality. That is the exact LP above, with 2n + d variables and n constraints, and Koenker and Bassett (1978) estimate it that way. A simplex solver walks the vertices of the feasible polytope and is exact on small and medium problems; an interior-point (Frisch-Newton) solver is the practical choice from tens of thousands of rows upward; both are what statistical packages call under the hood. Subgradient descent on the bounded weights above is the choice when n is too large for an LP solver or the model is a neural network trained with pinball loss, where the LP formulation is not available. Smoothing the kink (a Huber-style rounding near zero) is an alternative that gives a true gradient, at the price of a small bias in the estimated quantile.',
    hyperparameters: [
      { name: 'tau (quantile level)', role: 'Which conditional quantile to estimate; one model is fit per level. Extreme levels need many samples because only n(1 - tau) points inform the tail', typicalRange: '0.01 to 0.99; 0.1 / 0.5 / 0.9 is the common trio' },
      { name: 'solver', role: 'Simplex for small exact fits, interior point for large ones, subgradient for streaming or very large n' },
      { name: 'step-size schedule (subgradient only)', role: 'A constant step oscillates around the kink forever; the step must shrink for convergence', typicalRange: 'initial 1e-2 to 1e-1, decayed as 1/sqrt(t)' },
      { name: 'l1 penalty lambda (optional)', role: 'Adding lambda times the L1 norm of theta keeps the problem a linear program and gives sparse quantile models in high dimensions', typicalRange: '1e-4 to 1e-1, chosen on pinball loss' },
    ],
    convergence:
      'The LP solvers are exact to tolerance: finite termination for simplex, a few tens of iterations for interior point, and the minimiser is global because the problem is convex (it is not always unique, since a flat region of the objective can contain many optimal lines, especially with few distinct x values). Subgradient descent converges at only O(1/sqrt(T)) for a non-smooth convex objective, and a fixed step size never converges at all: it hops across the kink indefinitely. The failure mode specific to this model is quantile crossing: each tau is fit independently, so the 0.9 line can dip below the 0.8 line away from the data centre, producing a predictive distribution that is not monotone and therefore not a distribution at all. Fixes are to sort the predicted quantiles per row (monotone rearrangement), constrain the fits jointly, or fit with a shared structure.',
    complexity:
      'Interior point: each iteration forms and solves a d x d system, O(n d^2), with a few tens of iterations. Simplex: worst-case exponential, usually fine in practice for modest n. Subgradient: O(n d) per epoch, O(d) memory beyond the data. Fitting q quantile levels multiplies everything by q, but the fits are independent and parallelize trivially.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Turn the series into a supervised table (lags, rolling statistics, calendar terms, exogenous drivers) and fit one quantile model per level tau and per forecast horizon h. The stack of predictions at a given time forms a prediction interval, for example the 0.1 and 0.9 fits bound an 80% interval, and the full grid is a probabilistic forecast. No distributional assumption such as Gaussian errors is needed, and the interval width is allowed to depend on the features, so it can widen on high-volatility days.',
        where: [
          'Electricity load and renewable generation forecasting, where grid operators schedule reserves against the upper quantile, not the mean (the Global Energy Forecasting Competition scored entries by pinball loss)',
          'Retail and supply-chain demand forecasting, where the stocking decision is a quantile of demand',
          'Capacity planning for services: forecast the 95th-percentile load, not the average load',
        ],
        why: 'Because the decision downstream is almost never about the mean. A planner asks "how much do I need to be 90% sure I am covered", which is a quantile, and the pinball loss is the proper scoring rule for exactly that question: a forecaster minimizes it only by reporting the true quantile. Compared with a Gaussian-error interval around a mean forecast, quantile regression handles skewed and heteroscedastic noise without a parametric story. It is the wrong tool when you need a coherent joint distribution over many future steps (it gives marginals per horizon, not the dependence between them), which is where DeepAR or the Temporal Fusion Transformer, trained with the same loss, take over.',
        featurization: [
          'Lags at the seasonal period and rolling statistics, exactly as for point forecasting, with every window computed strictly before the forecast origin',
          'Calendar and holiday features, since the spread of the series often changes with them even when the centre does not',
          'A volatility proxy (recent rolling standard deviation) as an explicit feature so the band width can respond to it',
          'Scale features before a subgradient fit; LP solvers are insensitive to scaling but the step size is not',
        ],
        evaluation:
          'Rolling-origin backtesting scored with pinball loss per quantile, averaged over a grid of levels (twice that average approximates the CRPS), plus empirical coverage: the fraction of actuals falling below each predicted quantile should match tau, and an 80% interval should contain about 80% of outcomes. Report interval width alongside coverage, since a wide enough band is always calibrated.',
        pitfalls: [
          'Quantile crossing: independently fit levels produce non-monotone quantiles; sort per row or fit jointly before reporting an interval',
          'Autocorrelated errors make coverage on a time series worse than the i.i.d. theory promises, so check coverage on held-out later data, not the training window',
          'Extreme levels (0.01, 0.99) are estimated from very few points and are optimistic out of sample; widen or apply conformal calibration on a held-out window',
          'Shuffled k-fold leaks the future; use rolling-origin splits',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Fit the lower and upper conditional quantiles (for example tau = 0.01 and tau = 0.99) on a window of normal behaviour, then flag any observation that falls outside the band. The band is conditional: the threshold is a function of the features, so what counts as unusual differs between a quiet night and a peak hour. The anomaly score is how far outside the band the point landed, in the units of the target.',
        where: [
          'Server latency and error-rate monitoring, where the alert threshold should track time-of-day and traffic level',
          'Sensor and telemetry monitoring where the normal range of one signal depends on others',
          'Transaction-amount screening, where the plausible range depends on account type and history',
        ],
        why: 'It replaces the usual global "three standard deviations" rule with a threshold that adapts to the covariates and makes no Gaussian assumption, so it behaves sensibly on skewed and heavy-tailed data. It is also robust: because the loss gradient is bounded, contaminated training data pulls the fit far less than it pulls a least-squares line, which matters when you cannot guarantee a perfectly clean window. It is less suitable when anomalies are about the joint pattern across many features rather than the value of one target given the others, where isolation forests or reconstruction-based methods fit better.',
        featurization: [
          'Include the covariates that explain normal variation (hour of week, load, season), or the band will be flagging predictable swings',
          'Choose tau from the alert budget: a 0.01 / 0.99 band flags about 2% of normal points by construction, so the rate of false alarms is set in advance',
          'Fit the quantiles on a recent, mostly clean window and refit regularly as the baseline drifts',
        ],
        evaluation:
          'Precision@k and recall against confirmed incidents, with the band level set from the tolerable false-alarm rate. Check coverage on a known-clean holdout: about 98% should fall inside a 0.01 / 0.99 band, and a large gap means the band is mis-calibrated, not that the data is clean.',
        pitfalls: [
          'The band is calibrated for the marginal rate of exceedance, so a burst of related anomalies is not "rare" under it',
          'Extreme tau levels are noisy; with few training points the 0.99 line is unreliable and either misses real anomalies or fires on noise',
          'Quantile crossing in the tails can produce an inverted band with a negative width',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'Many decisions are a quantile of an uncertain quantity. In the newsvendor problem, with underage cost cu per unit of unmet demand and overage cost co per unit of excess stock, the cost-optimal order quantity is the critical-ratio quantile of demand, tau = cu / (cu + co). Fit quantile regression at exactly that tau on demand features and the prediction is the order quantity. In fact the newsvendor cost is (cu + co) times the pinball loss, so training with that loss directly minimizes the expected business cost, with no intermediate demand-distribution model. The training problem is itself a linear program, so the same machinery serves as the estimator and the optimizer.',
        where: [
          'Inventory and replenishment: order quantity at the cost-weighted critical ratio per product and store',
          'Staffing and capacity buffers, where understaffing and overstaffing have different per-unit costs',
          'Setting service-level commitments and safety stock from a target quantile of lead-time demand',
        ],
        why: 'It targets the decision rather than a proxy for it. Fitting a mean forecast and then adding a hand-tuned safety buffer encodes the cost asymmetry nowhere; the quantile fit encodes it in tau and learns a feature-dependent buffer, wider where demand is more variable. It is the wrong choice when decisions interact across items through a shared constraint (a joint budget, a shared warehouse): then each item is no longer an independent quantile and a constrained optimizer takes over, with the quantile forecasts as inputs.',
        featurization: [
          'Compute tau from the real unit economics, cu / (cu + co), rather than picking a round service level',
          'Use the demand drivers (price, promotion, day of week, weather) as features so the order quantity moves with them',
          'Keep cu and co out of the feature set; they define the target level, they are not predictors',
        ],
        evaluation:
          'Average realized cost, computed as cu times the unmet demand plus co times the excess, on a held-out period, compared against a mean-forecast-plus-buffer baseline. The pinball loss at the chosen tau is proportional to that cost, so it is the right validation metric as well as the training loss.',
        pitfalls: [
          'Treating lost sales as observed demand: sales censored by stockouts understate true demand and bias the quantile downward',
          'A mis-specified cost ratio silently moves the optimum; the model faithfully optimizes whatever tau it is given',
          'Per-item fits ignore cross-item demand correlation and shared constraints',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Value-at-Risk is by definition a quantile of the loss distribution, so a 99% one-day VaR is the tau = 0.99 conditional quantile of losses given market state. Fit that quantile directly on risk factors (the CAViaR approach) instead of assuming returns are Gaussian with an estimated volatility.',
        where: [
          'Market-risk VaR estimation conditional on volatility and market-state features',
          'Credit-loss and claims-severity tail modelling in insurance pricing',
        ],
        why: 'Risk questions are about the tail, and the tail is exactly where a Gaussian-error mean model is least trustworthy. A direct tail quantile fit makes no distributional claim. The cost is data: only about n(1 - tau) points inform a 99% fit, so tail estimates are noisy, and quantiles alone say nothing about how bad the loss is once the threshold is crossed (expected shortfall needs more).',
        featurization: [
          'Lagged absolute returns and realized volatility as covariates for the tail level',
          'Market-state indicators such as spread or implied-volatility changes',
        ],
        evaluation:
          'Backtest the exceedance rate against the nominal 1 - tau with a coverage test (Kupiec / Christoffersen), plus the pinball loss at the chosen level.',
        pitfalls: [
          'Exceedances cluster in a crisis, so an average hit rate that looks correct can hide failure exactly when it matters',
          'Too few tail observations make a 0.99 estimate unstable',
        ],
      },
      'causal-inference': {
        fit: 'viable',
        how: 'Put a treatment indicator in the model; at each tau its coefficient is the estimated effect of treatment on that quantile of the outcome, a quantile treatment effect. Fit across a grid of tau to see whether the treatment moves the lower tail, the median, or the upper tail differently.',
        where: [
          'Evaluating whether a programme shifts the whole outcome distribution or just the top end (wages, test scores, delivery times)',
          'Heterogeneous-effect checks on a randomized experiment, as a descriptive complement to a mean effect',
        ],
        why: 'A mean treatment effect can hide that a treatment helps the worst-off and does nothing for the median, or the reverse. It does not by itself give causal identification: the coefficient is causal only under the same design assumptions as a mean regression, and it describes effects on quantiles of the outcome, not on the quantile of each individual unit.',
        featurization: [
          'Include the confounders the design requires, as in mean regression',
          'Fit a grid of quantile levels rather than a single one, and plot the coefficient against tau',
        ],
        evaluation:
          'Bootstrap or rank-score confidence intervals on the treatment coefficient at each tau; placebo outcomes as in any causal design.',
        pitfalls: [
          'Reading a change at a quantile as a change for the same individuals; rank order can differ between control and treated outcomes',
          'Crossing quantile curves make the per-tau coefficients hard to interpret together',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Cheap but not free. An interior-point LP fit at one tau on roughly a million rows and fifty features is typically seconds to a minute on one core, and you need one fit per quantile level and per horizon. Subgradient or neural versions scale linearly in rows. Illustrative orders of magnitude, not a benchmark.',
    inferenceProfile:
      'One dot product per quantile level, so a nine-level grid is nine dot products: microseconds, trivially vectorized, and small enough for a database query or an edge device. The sorting step that repairs crossing is a few comparisons per row.',
    retrainingCadence:
      'Driven by how fast the spread drifts, not just the centre. The tail quantiles move first when variability changes, so refit on a schedule and on a coverage alarm.',
    driftAndMonitoring: [
      'Track empirical coverage per quantile: the fraction of actuals below the tau-line should stay near tau; sustained drift away from it is the main alarm',
      'Monitor interval width over time; a band that narrows while errors do not is overconfident',
      'Count quantile-crossing events before repair; a rising rate means the per-tau fits have diverged',
    ],
    productionGotchas: [
      'Each tau is a separate model, so the set of coefficients is versioned together; swapping one level without the others reintroduces crossing',
      'Always sort or otherwise repair the quantile vector before exposing it, or downstream code can compute a negative interval width',
      'Feature scaling used in a subgradient fit must be persisted with the model and reused at inference',
      'The model extrapolates linearly outside the training range, so guard the input range if a band that widens without bound would be a problem',
    ],
  },

  assumptions: [
    'The conditional quantile at each tau is linear in the (possibly transformed) features; no assumption is made about the shape of the error distribution',
    'Observations are independent, or weakly dependent enough that coverage holds; this fails by default on time series',
    'Enough data lies in the tail being estimated: roughly n(1 - tau) points inform the upper level, so extreme levels need large samples',
    'Features are not near-perfectly collinear, as for any linear model',
  ],

  pros: [
    {
      point: 'Models the whole conditional distribution, not just its centre',
      context:
        'Decisive when the decision depends on a tail (stocking, capacity, risk) or when the spread varies with the features. Wasted effort if all that anyone needs is a point forecast of the typical value.',
    },
    {
      point: 'Robust to outliers in the response (the median fit is least absolute deviations)',
      context:
        'Matters in anomaly-adjacent and noisy-data work where the outliers are real. It protects against outliers in y; it does not protect against high-leverage outliers in x.',
    },
    {
      point: 'No distributional assumption on the errors',
      context:
        'Valuable for skewed, heavy-tailed, or heteroscedastic targets where Gaussian intervals are miscalibrated. You pay in data: the tail is estimated empirically, so extreme levels are noisy.',
    },
    {
      point: 'The pinball loss is a proper scoring rule and a business-cost surrogate',
      context:
        'With tau set to cu / (cu + co), minimizing it is minimizing the newsvendor cost, so the training objective and the decision objective coincide. That alignment disappears once the cost structure is more complex than two linear per-unit prices.',
    },
    {
      point: 'Exactly an LP, so the global optimum is findable with standard solvers',
      context:
        'Reproducible and with no learning rate to tune at moderate scale. Past tens of millions of rows you fall back to subgradient or a neural model and lose the exactness.',
    },
  ],

  cons: [
    {
      point: 'Quantile crossing: independently fit levels need not be ordered',
      context:
        'A genuine failure mode that produces invalid intervals, mostly away from the data centre and at extreme levels. Fixed by per-row sorting or joint fitting, but you have to remember to do it.',
    },
    {
      point: 'Non-differentiable, so no closed form and no plain gradient descent',
      context:
        'Costs you the one-line solve that linear regression enjoys. Irrelevant if an LP solver is available; a real nuisance when you want to embed the loss in a gradient-based pipeline, where smoothing or subgradients with decaying steps are needed.',
    },
    {
      point: 'Extreme quantiles are statistically hard',
      context:
        'Only n(1 - tau) points carry information about the 0.99 line, so its estimate is high-variance and optimistic out of sample. A serious problem for tail-risk and rare-anomaly use, mitigated by more data, a parametric tail, or conformal calibration.',
    },
    {
      point: 'One model per quantile level, and marginals only',
      context:
        'Cost multiplies with the grid size and the horizons, and the outputs are marginal quantiles per target with no joint dependence across time steps. If you need a coherent joint forecast distribution, a generative or autoregressive probabilistic model is the better tool.',
    },
  ],

  relatedSlugs: [
    'linear-regression',
    'ridge-lasso',
    'gradient-boosting',
    'deepar',
    'temporal-fusion-transformer',
    'linear-programming',
    'stepwise-regression',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Quantile regression by subgradient descent - the objective, transcribed.

The loss is rho_tau(u) = u * (tau - 1{u < 0}) with u = y - prediction. It has a
kink at u = 0, so there is no gradient; the subgradient with respect to the
prediction is (1{y < pred} - tau) for each example. Every line below maps to one
symbol of J_tau(theta). The L1 geometry shows up in the bounded weight: an
example ten times further away pulls no harder than one just past the line.
"""

import math


def fit(X, y, tau, lr=0.1, epochs=2_000):
    n = len(X)
    d = len(X[0])
    theta = [0.0] * d
    bias = 0.0

    for epoch in range(epochs):
        grad = [0.0] * d
        grad_bias = 0.0

        for i in range(n):
            # prediction: x_i . theta + b
            pred = bias
            for j in range(d):
                pred += theta[j] * X[i][j]

            # subgradient weight: (1 - tau) if overshoot, -tau if undershoot
            if y[i] < pred:
                weight = 1.0 - tau
            else:
                weight = -tau

            for j in range(d):
                grad[j] += weight * X[i][j]
            grad_bias += weight

        # a constant step would hop across the kink forever, so it must shrink
        step = lr / math.sqrt(epoch + 1) / n
        for j in range(d):
            theta[j] -= step * grad[j]
        bias -= step * grad_bias

    return theta, bias


def pinball_loss(y, preds, tau):
    total = 0.0
    for i in range(len(y)):
        u = y[i] - preds[i]
        if u >= 0:
            total += tau * u
        else:
            total += (tau - 1.0) * u
    return total / len(y)`,
        profile: 'O(n*d) per epoch in pure Python, and O(1/sqrt(T)) convergence because the objective is non-smooth. Far slower than the same arithmetic in NumPy.',
      },
      'make-it-right': {
        code: `"""Quantile regression by subgradient descent - typed, validated, vectorized."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class QuantileModel:
    """A fitted model for one quantile level. Frozen so it cannot drift after fitting."""

    tau: float
    weights: Vector
    bias: float

    def predict(self, X: Matrix) -> Vector:
        if X.ndim != 2 or X.shape[1] != self.weights.size:
            raise ValueError(
                f"expected (n, {self.weights.size}) design matrix, got {X.shape}"
            )
        return X @ self.weights + self.bias


def pinball_loss(y: Vector, pred: Vector, tau: float) -> float:
    """Mean check loss. Equal to half the mean absolute error when tau is 0.5."""
    if y.shape != pred.shape:
        raise ValueError(f"shape mismatch: y={y.shape}, pred={pred.shape}")
    residual = y - pred
    return float(np.mean(np.maximum(tau * residual, (tau - 1.0) * residual)))


def fit(
    X: Matrix,
    y: Vector,
    tau: float,
    lr: float = 0.1,
    epochs: int = 2_000,
) -> QuantileModel:
    """Fit one conditional quantile. Raises ValueError on malformed input."""
    if not 0.0 < tau < 1.0:
        raise ValueError(f"tau must lie strictly between 0 and 1, got {tau}")
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if X.shape[0] == 0:
        raise ValueError("cannot fit on an empty dataset")

    n, d = X.shape
    weights = np.zeros(d, dtype=np.float64)
    bias = 0.0

    for epoch in range(epochs):
        overshoot = y < X @ weights + bias            # the 1{y < pred} indicator
        weight = overshoot - tau                      # (1 - tau) or -tau per example
        step = lr / np.sqrt(epoch + 1) / n            # decaying: the kink needs it

        weights -= step * (X.T @ weight)
        bias -= step * float(weight.sum())

    return QuantileModel(tau=tau, weights=weights, bias=bias)`,
        rationale:
          'The three nested loops collapse into one matrix-vector product and one matrix-transpose product, and the if/else on the sign of the residual becomes a boolean array minus tau. The function now rejects a tau outside (0, 1), which would silently flip the asymmetry or make the loss degenerate, instead of producing a plausible-looking wrong line. A frozen dataclass carries tau with the coefficients, since a coefficient vector without its quantile level is meaningless.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*d) per epoch, executed in BLAS rather than the interpreter. Still O(1/sqrt(T)) convergence.',
      },
      'make-it-fast': {
        code: `"""Quantile regression - a whole grid of levels in one batched matrix product."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def fit_grid(
    X: Matrix,
    y: Vector,
    taus: Vector,
    lr: float = 0.1,
    epochs: int = 2_000,
) -> tuple[Matrix, Vector]:
    """Fit every quantile level in taus simultaneously.

    Column k of the parameter matrix is the model for taus[k]. Each epoch is
    one (n, d) x (d, q) product for the predictions and one (d, n) x (n, q)
    product for the gradients, instead of q separate Python-level fits. All
    buffers are allocated once and reused, so the loop allocates nothing.
    """
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError(f"shape mismatch: X={X.shape}, y={y.shape}")
    if np.any(taus <= 0.0) or np.any(taus >= 1.0):
        raise ValueError("every tau must lie strictly between 0 and 1")

    n, d = X.shape
    q = taus.size
    y_col = np.ascontiguousarray(y.reshape(n, 1))
    X_t = np.ascontiguousarray(X.T)

    W = np.zeros((d, q))
    b = np.zeros(q)
    pred = np.empty((n, q))
    mask = np.empty((n, q), dtype=bool)
    weight = np.empty((n, q))
    grad = np.empty((d, q))

    for epoch in range(epochs):
        np.matmul(X, W, out=pred)                  # all q predictions at once
        pred += b
        np.less(y_col, pred, out=mask)             # 1{y < pred}
        np.subtract(mask, taus, out=weight)        # (1 - tau) or -tau, per column
        np.matmul(X_t, weight, out=grad)           # all q gradients at once

        step = lr / np.sqrt(epoch + 1) / n
        W -= step * grad
        b -= step * weight.sum(axis=0)

    return W, b


def predict_grid(X: Matrix, W: Matrix, b: Vector) -> Matrix:
    """Predict every level, then repair quantile crossing by sorting each row.

    Independent per-tau fits can cross; sorting along the quantile axis is the
    monotone rearrangement, and it never increases the pinball loss.
    """
    return np.sort(X @ W + b, axis=1)`,
        rationale:
          'The per-level Python loop disappears: q models are fit at once as the columns of one parameter matrix, so each epoch is two BLAS calls rather than 2q. Buffers are allocated before the loop and written into with out= arguments, so the hot loop makes no allocations. The prediction step also gains a sort along the quantile axis, which is the standard repair for quantile crossing that independent fits produce.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Predictions for every quantile level are one matrix product (n x d by d x q), and so are the gradients, so BLAS does all the arithmetic across the whole grid.',
            tradeoff: 'Every level takes the same number of epochs and the same step schedule; a level that converges early cannot stop, and a poorly scaled level cannot get its own step size.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'pred, mask, weight and grad are created once and filled with out= arguments, so no n x q array is allocated per epoch, which was the dominant allocator traffic.',
            tradeoff: 'Memory for the work buffers is held for the entire fit, and the code is less readable than the expression form, with mutation order that has to be kept straight.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One Python loop iteration now serves all q levels, so the interpreter cost per epoch is paid once rather than q times.',
            tradeoff: 'The columns are still independent fits, so this gives speed, not statistical efficiency: it does not stop the levels from crossing, which is why predict_grid sorts.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n*d*q) per epoch, in two BLAS calls with no allocation. Illustrative, not a measured benchmark; an LP solver would reach the exact optimum per level instead.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Quantile regression by subgradient descent - the objective, transcribed.
//
// rho_tau(u) = u * (tau - 1{u < 0}), u = y - prediction. The kink at u = 0 means
// there is no gradient, only the subgradient weight (1{y < pred} - tau), which
// is bounded: an outlier pulls no harder than a point just past the line.
#include <cmath>
#include <cstddef>
#include <vector>

std::vector<double> fit(const std::vector<std::vector<double>>& X,
                        const std::vector<double>& y,
                        double tau,
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

      // overshoot costs (1 - tau) per unit, undershoot costs tau per unit
      double weight;
      if (y[i] < pred) {
        weight = 1.0 - tau;
      } else {
        weight = -tau;
      }

      for (std::size_t j = 0; j < d; ++j) {
        grad[j] += weight * X[i][j];
      }
    }

    // the step must shrink or the iterate hops across the kink forever
    const double step = lr / std::sqrt(static_cast<double>(epoch + 1)) /
                        static_cast<double>(n);
    for (std::size_t j = 0; j < d; ++j) {
      theta[j] -= step * grad[j];
    }
  }

  return theta;
}`,
        profile: 'O(n*d) per epoch. vector<vector<double>> scatters rows across the heap, so it misses cache on every row. No intercept column: add a constant feature.',
      },
      'make-it-right': {
        code: `// Quantile regression by subgradient descent - RAII, const-correct, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

class QuantileModel {
 public:
  QuantileModel(double tau, std::vector<double> weights)
      : tau_(tau), weights_(std::move(weights)) {}

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

  [[nodiscard]] double tau() const noexcept { return tau_; }
  [[nodiscard]] std::span<const double> weights() const noexcept {
    return weights_;
  }

 private:
  double tau_;                     // a weight vector means nothing without its tau
  std::vector<double> weights_;
};

// Mean pinball loss. Half the mean absolute error when tau is 0.5.
[[nodiscard]] double PinballLoss(std::span<const double> y,
                                 std::span<const double> pred,
                                 double tau) {
  if (y.size() != pred.size() || y.empty()) {
    throw std::invalid_argument("y and pred must be non-empty and equal length");
  }
  double total = 0.0;
  for (std::size_t i = 0; i < y.size(); ++i) {
    const double u = y[i] - pred[i];
    total += std::max(tau * u, (tau - 1.0) * u);
  }
  return total / static_cast<double>(y.size());
}

// X is row-major and flat: element (i, j) lives at x_flat[i * d + j].
QuantileModel Fit(std::span<const double> x_flat,
                  std::span<const double> y,
                  std::size_t d,
                  double tau,
                  double lr,
                  int epochs) {
  if (!(tau > 0.0 && tau < 1.0)) {
    throw std::invalid_argument("tau must lie strictly between 0 and 1");
  }
  if (d == 0 || y.empty()) {
    throw std::invalid_argument("empty problem");
  }
  if (x_flat.size() != y.size() * d) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const std::size_t n = y.size();
  std::vector<double> theta(d, 0.0);
  std::vector<double> grad(d);                 // hoisted out of the loop

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::fill(grad.begin(), grad.end(), 0.0);

    for (std::size_t i = 0; i < n; ++i) {
      const double* row = x_flat.data() + i * d;
      double pred = 0.0;
      for (std::size_t j = 0; j < d; ++j) {
        pred += theta[j] * row[j];
      }
      const double weight = (y[i] < pred) ? (1.0 - tau) : -tau;
      for (std::size_t j = 0; j < d; ++j) {
        grad[j] += weight * row[j];
      }
    }

    const double step =
        lr / std::sqrt(static_cast<double>(epoch + 1)) / static_cast<double>(n);
    for (std::size_t j = 0; j < d; ++j) {
      theta[j] -= step * grad[j];
    }
  }

  return QuantileModel(tau, std::move(theta));
}`,
        rationale:
          'The nested vector becomes one flat row-major buffer so a row is contiguous, and every precondition is checked before any allocation. The new check that tau lies strictly inside (0, 1) matters here in a way it does not for least squares: outside that range the loss is no longer asymmetric in the intended direction, or degenerates, and the fit would converge to a wrong answer with no error. Tau now travels with the weights inside the class, and the gradient buffer is hoisted out of the epoch loop.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d) per epoch, one allocation total, contiguous access.',
      },
      'make-it-fast': {
        code: `// Quantile regression by subgradient descent - Eigen, no per-epoch temporaries.
#include <Eigen/Dense>

#include <cmath>
#include <stdexcept>

// Fits one quantile level. The subgradient weight is a branch-free select over
// the whole residual array: (1 - tau) where the model overshoots, -tau elsewhere.
Eigen::VectorXd FitSubgradient(const Eigen::MatrixXd& X,
                               const Eigen::VectorXd& y,
                               double tau,
                               double lr,
                               int epochs) {
  if (!(tau > 0.0 && tau < 1.0)) {
    throw std::invalid_argument("tau must lie strictly between 0 and 1");
  }
  if (X.rows() != y.size() || X.rows() == 0) {
    throw std::invalid_argument("X and y describe different or empty row counts");
  }

  const Eigen::Index n = X.rows();
  Eigen::VectorXd theta = Eigen::VectorXd::Zero(X.cols());
  Eigen::VectorXd pred(n);       // reused every epoch, no allocation in the loop
  Eigen::VectorXd weight(n);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    pred.noalias() = X * theta;                        // one GEMV, no temporary
    weight = (y.array() < pred.array()).select(1.0 - tau, -tau).matrix();

    const double step =
        lr / std::sqrt(static_cast<double>(epoch + 1)) / static_cast<double>(n);
    theta.noalias() -= step * (X.transpose() * weight);  // one fused GEMV
  }
  return theta;
}`,
        rationale:
          'The explicit sample loops are replaced by two matrix-vector products and a single vectorized select that computes the subgradient weight for every example at once, with no per-element branch in the hot path. The prediction and weight vectors are allocated before the loop and reused, so an epoch performs no allocation, and the gradient update is one expression the compiler can evaluate without materializing X-transpose-times-weight as a temporary.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The comparison and select form a lazy expression evaluated in a single pass over the residuals, and the theta update fuses the scale, the product and the subtraction with no intermediate vector.',
            tradeoff: 'Expression templates give very long compiler errors, and an expression stored in auto can dangle; the .matrix() conversion and noalias() calls must be placed carefully.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'X * theta and X-transpose * weight dominate the cost, and Eigen can route them to a blocked, vectorized kernel instead of the scalar loop.',
            tradeoff: 'Both products are matrix-vector, which are memory-bandwidth bound, so the BLAS speedup is smaller than for matrix-matrix work, and tiny problems pay dispatch overhead.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen leans on the compiler to vectorize the select and the GEMV kernels; without optimization flags it is no faster than the hand-written loops.',
            tradeoff: '-march=native produces a binary that may not run on an older CPU in the fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*d) per epoch, no allocation inside the loop. Illustrative, not a measured benchmark; an LP interior-point solver reaches the exact optimum in tens of iterations.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Quantile regression by subgradient descent - the objective, transcribed.
//!
//! rho_tau(u) = u * (tau - 1{u < 0}), u = y - prediction. The kink at zero means
//! only a subgradient exists: (1{y < pred} - tau), bounded in magnitude.

pub fn fit(x: &[Vec<f64>], y: &[f64], tau: f64, lr: f64, epochs: usize) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut theta = vec![0.0; d];

    for epoch in 0..epochs {
        let mut grad = vec![0.0; d];

        for i in 0..n {
            // prediction: x_i . theta
            let mut pred = 0.0;
            for j in 0..d {
                pred += theta[j] * x[i][j];
            }

            // overshoot costs (1 - tau) per unit, undershoot costs tau per unit
            let weight = if y[i] < pred { 1.0 - tau } else { -tau };

            for j in 0..d {
                grad[j] += weight * x[i][j];
            }
        }

        // the step must shrink or the iterate hops across the kink forever
        let step = lr / ((epoch + 1) as f64).sqrt() / n as f64;
        for j in 0..d {
            theta[j] -= step * grad[j];
        }
    }

    theta
}`,
        profile: 'O(n*d) per epoch. Every index is bounds-checked, and Vec<Vec<f64>> scatters rows across the heap.',
      },
      'make-it-right': {
        code: `//! Quantile regression by subgradient descent - validated newtype, Result errors.

use std::fmt;

/// A quantile level, validated once at construction to lie strictly in (0, 1).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Tau(f64);

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    InvalidTau(f64),
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::InvalidTau(tau) => write!(f, "tau must be in (0, 1), got {tau}"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for FitError {}

impl Tau {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if value > 0.0 && value < 1.0 {
            Ok(Self(value))
        } else {
            Err(FitError::InvalidTau(value))
        }
    }

    #[must_use]
    pub fn get(self) -> f64 {
        self.0
    }
}

#[derive(Debug, Clone)]
pub struct QuantileModel {
    tau: Tau,
    weights: Vec<f64>,
}

impl QuantileModel {
    #[must_use]
    pub fn tau(&self) -> Tau {
        self.tau
    }

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

/// Mean pinball loss over paired targets and predictions.
pub fn pinball_loss(y: &[f64], pred: &[f64], tau: Tau) -> Result<f64, FitError> {
    if y.is_empty() {
        return Err(FitError::Empty);
    }
    if y.len() != pred.len() {
        return Err(FitError::ShapeMismatch { expected: y.len(), found: pred.len() });
    }
    let t = tau.get();
    let total: f64 = y
        .iter()
        .zip(pred)
        .map(|(target, p)| {
            let u = target - p;
            (t * u).max((t - 1.0) * u)
        })
        .sum();
    Ok(total / y.len() as f64)
}

/// x is row-major and flat: element (i, j) lives at x[i * d + j].
pub fn fit(
    x: &[f64],
    y: &[f64],
    d: usize,
    tau: Tau,
    lr: f64,
    epochs: usize,
) -> Result<QuantileModel, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x.len() != y.len() * d {
        return Err(FitError::ShapeMismatch { expected: y.len() * d, found: x.len() });
    }

    let n = y.len();
    let t = tau.get();
    let mut theta = vec![0.0_f64; d];
    let mut grad = vec![0.0_f64; d];      // hoisted out of the epoch loop

    for epoch in 0..epochs {
        grad.fill(0.0);

        for (row, &target) in x.chunks_exact(d).zip(y) {
            let pred: f64 = row.iter().zip(&theta).map(|(v, w)| v * w).sum();
            let weight = if target < pred { 1.0 - t } else { -t };
            for (g, v) in grad.iter_mut().zip(row) {
                *g += weight * v;
            }
        }

        let step = lr / ((epoch + 1) as f64).sqrt() / n as f64;
        for (w, g) in theta.iter_mut().zip(&grad) {
            *w -= step * g;
        }
    }

    Ok(QuantileModel { tau, weights: theta })
}`,
        rationale:
          'Tau becomes a newtype validated once at the boundary, so the "tau must lie in (0, 1)" invariant is a property of the type rather than a check repeated (or forgotten) in every function that receives a bare f64. Errors become a typed Result, the nested Vec becomes one flat buffer, and the index loops become iterator chains, with chunks_exact and zip letting the compiler prove the lengths match and drop the bounds checks in the hot loop.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d) per epoch, one allocation total, bounds checks elided in the inner loop.',
      },
      'make-it-fast': {
        code: `//! Quantile regression by subgradient descent - data-parallel over rows.

use rayon::prelude::*;

/// Per-example subgradient weight: (1 - tau) on overshoot, -tau otherwise.
#[inline]
fn subgradient_weight(target: f64, pred: f64, tau: f64) -> f64 {
    if target < pred { 1.0 - tau } else { -tau }
}

/// Parallel subgradient descent. x is row-major and flat; tau is already
/// validated by the caller (see the Tau newtype in the previous stage).
///
/// The gradient is a sum over independent rows, so it is a fold-then-reduce:
/// each worker keeps one private accumulator of length d + 1 (the last slot is
/// the intercept gradient) across its whole chunk, and the per-thread results
/// are summed once at the end. No shared mutable state, no locks in the hot loop.
pub fn fit_parallel(
    x: &[f64],
    y: &[f64],
    d: usize,
    tau: f64,
    lr: f64,
    epochs: usize,
) -> (Vec<f64>, f64) {
    let n = y.len();
    let mut theta = vec![0.0_f64; d];
    let mut bias = 0.0_f64;

    for epoch in 0..epochs {
        let grad = x
            .par_chunks_exact(d)
            .zip(y.par_iter())
            .fold(
                || vec![0.0_f64; d + 1],
                |mut acc, (row, &target)| {
                    let pred: f64 =
                        row.iter().zip(&theta).map(|(v, w)| v * w).sum::<f64>() + bias;
                    let weight = subgradient_weight(target, pred, tau);
                    for (g, v) in acc.iter_mut().zip(row) {
                        *g += weight * v;
                    }
                    acc[d] += weight;
                    acc
                },
            )
            .reduce(
                || vec![0.0_f64; d + 1],
                |mut a, b| {
                    for (left, right) in a.iter_mut().zip(b) {
                        *left += right;
                    }
                    a
                },
            );

        let step = lr / ((epoch + 1) as f64).sqrt() / n as f64;
        for (w, g) in theta.iter_mut().zip(&grad[..d]) {
            *w -= step * g;
        }
        bias -= step * grad[d];
    }

    (theta, bias)
}`,
        rationale:
          'The sum of per-row subgradients is embarrassingly parallel, so the sequential loop becomes a rayon fold-reduce with one private accumulator per worker and a single merge at the end. The intercept gradient rides along in the last slot of the same accumulator instead of needing a second pass. The weight rule is pulled into a small inlined function so the branch sits in one place the compiler can see through.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The subgradient is a sum of independent per-row terms, so it splits across cores with no synchronization inside the loop and one merge per epoch.',
            tradeoff: 'Work-stealing overhead dominates for small n; below a few thousand rows the sequential version wins. The per-epoch barrier also limits scaling, since the step must wait for the full gradient.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'par_chunks_exact(d) zipped with the target slice lets the compiler prove both lengths, removing per-element bounds checks from the innermost loop.',
            tradeoff: 'chunks_exact silently drops a trailing partial chunk, so the x.len() == n * d invariant has to be checked by the caller before this is called.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'subgradient_weight runs once per row per epoch; inlining it removes the call and lets the comparison be compiled as a conditional select.',
            tradeoff: 'Inlining everywhere inflates code size, and for a function this small the compiler often does it anyway, so it should be confirmed with a profile.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*d) per epoch spread across cores. Illustrative, not a measured benchmark. Subgradient convergence stays O(1/sqrt(T)) whatever the parallelism.',
      },
    },
  },
};
