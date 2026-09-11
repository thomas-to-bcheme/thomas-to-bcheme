import type { AiMlModel } from '../../types';

/**
 * N-BEATS / N-HiTS — the entry that shows a stack of plain MLPs beating
 * everything elaborate, and asks why.
 *
 * No recurrence, no attention, no covariates, no convolution: just fully
 * connected blocks arranged so each one subtracts what it explained from the
 * input before the next sees it. Included because it is the strongest
 * available argument that architecture complexity in forecasting has been
 * routinely overspent.
 */
export const N_BEATS: AiMlModel = {
  slug: 'n-beats',
  name: 'N-BEATS / N-HiTS',
  aliases: ['N-BEATS', 'N-HiTS', 'Doubly residual stacking', 'Basis expansion forecaster'],
  category: 'deep-learning',
  group: 'forecasting-native',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'sequence-modeling', 'anomaly-detection'],
  architecture: 'feedforward',
  paradigmNote:
    'Classified feedforward because that is literally all it is — stacked fully connected layers with residual connections, and no sequence-specific machinery anywhere. That is the finding rather than a simplification: it beat the statistical ensembles that won the M4 competition without a single recurrent or attentional component.',

  intuition:
    'Give a block the last few hundred observations and ask it for two things: a forecast, and a reconstruction of the input it thinks it explained. Subtract that reconstruction from the input and hand the remainder to the next block. Each block therefore works on what its predecessors could not explain, and the forecasts add up — which is gradient boosting’s idea rearranged into a neural network, and exactly the same idea as classical decomposition into trend and seasonality, except the components are learned instead of specified.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{H}\\sum_{h=1}^{H} \\frac{\\lvert y_{t+h} - \\hat{y}_{t+h}\\rvert}{\\frac{1}{n-m}\\sum_{j=m+1}^{n}\\lvert y_j - y_{j-m}\\rvert}, \\qquad \\hat{\\mathbf{y}} = \\sum_{\\ell=1}^{L}\\hat{\\mathbf{y}}_\\ell, \\quad \\mathbf{x}_\\ell = \\mathbf{x}_{\\ell-1} - \\hat{\\mathbf{x}}_{\\ell-1}',
      symbols: [
        { symbol: '\\hat{\\mathbf{y}}_\\ell', meaning: 'block l’s forecast contribution; the final forecast is their sum, never a final layer’s output' },
        { symbol: '\\hat{\\mathbf{x}}_\\ell', meaning: 'block l’s backcast — its reconstruction of the input, which is subtracted before the next block' },
        { symbol: 'm', meaning: 'seasonal period used by the MASE denominator; the scale-free normalizer' },
        { symbol: 'H', meaning: 'forecast horizon, emitted entirely in one pass rather than step by step' },
        { symbol: 'L', meaning: 'number of blocks; depth here means more residual refinement, not more abstraction' },
      ],
    },
    reading:
      'Two things are doing the work and only one is the loss. MASE divides by the in-sample error of a seasonal-naive forecast, which makes the loss comparable across series of wildly different scale — essential when one global model covers a hundred thousand series, and the reason a plain MSE trains a model that only cares about the largest ones. The structural half is the two recursions: forecasts add, and inputs have their explained part subtracted. That means no block ever has to represent the whole signal, and it is why a stack of ordinary MLPs is sufficient where intuition says it should not be.',
  },

  optimization: {
    method: 'Adam on a scale-free loss, with the ensemble treated as part of the model rather than as a refinement',
    updateRule: {
      formula:
        '\\hat{\\mathbf{y}}_\\ell = \\mathbf{V}^{f}\\boldsymbol{\\theta}^{f}_\\ell, \\quad \\hat{\\mathbf{x}}_\\ell = \\mathbf{V}^{b}\\boldsymbol{\\theta}^{b}_\\ell, \\qquad \\boldsymbol{\\theta}_\\ell = \\mathrm{MLP}_\\ell(\\mathbf{x}_{\\ell-1})',
      symbols: [
        { symbol: '\\boldsymbol{\\theta}_\\ell', meaning: 'basis coefficients — the only thing the MLP predicts; the shape comes from the basis' },
        { symbol: '\\mathbf{V}^{f}, \\mathbf{V}^{b}', meaning: 'forecast and backcast basis matrices: identity for generic blocks, polynomial for trend, Fourier for seasonality' },
        { symbol: '\\mathrm{MLP}_\\ell', meaning: 'four fully connected ReLU layers; the entire nonlinearity in the model' },
      ],
    },
    rationale:
      'The design decision worth extracting is that the network predicts coefficients rather than values. With a generic identity basis that distinction is vacuous; with a polynomial or Fourier basis it constrains the output to a smooth low-order function, which regularizes far more effectively than any weight penalty and simultaneously makes the component interpretable — this stack is trend, that one is seasonality, and you can plot them. N-HiTS adds the second idea: pool the input at different rates in different stacks and interpolate the outputs back up, so each stack specializes in a frequency band. That is multi-rate signal processing, and it cuts long-horizon cost substantially. The uncomfortable finding is the ensemble: the published results average dozens of models trained with different lookback windows and losses, and a single model is materially worse. The ensemble is not a refinement here, it is part of the method, and comparisons that omit it are comparing different things.',
    hyperparameters: [
      { name: 'lookback multiplier', role: 'History length as a multiple of the horizon; the strongest single lever and the main source of ensemble diversity', typicalRange: '2x to 7x horizon' },
      { name: 'blocks per stack', role: 'Residual refinement depth within a stack; returns flatten quickly', typicalRange: '1 to 3' },
      { name: 'stacks', role: 'Generic stacks for the interpretable-free variant, or trend plus seasonality for the interpretable one', typicalRange: '2 to 30' },
      { name: 'hidden width', role: 'Width of each fully connected layer; the dominant parameter count', typicalRange: '256 to 512' },
      { name: 'polynomial degree (trend)', role: 'Order of the trend basis. Past 3 it stops being a trend and starts fitting noise', typicalRange: '2 to 4' },
      { name: 'pooling kernel (N-HiTS)', role: 'Input downsampling rate per stack; what assigns each stack a frequency band', typicalRange: '1 to 16' },
      { name: 'ensemble size', role: 'Not a tuning knob — the published results depend on it, and a single model is measurably worse', typicalRange: '18 to 180 models' },
    ],
    convergence:
      'Stable and fast to train, which is a large part of the practical appeal: there is no recurrence to explode and no attention to saturate, so it converges reliably with default settings. Two characteristic failures. The first is silent capacity waste — later blocks in a deep stack receive a residual that is already near zero and learn nothing, which shows as validation loss flat in depth while parameter count grows, and is easy to miss if depth is never ablated. The second is the interpretable variant overfitting its own basis: a polynomial trend of degree five will happily extrapolate to implausible values at the far end of the horizon, because nothing in the loss penalizes a forecast that is smooth and absurd. The single-model versus ensemble gap is the third thing to watch, and it is a reporting failure rather than a training one.',
    complexity:
      'O(L · d²) for the stack plus O(L · (H + W) · |θ|) for the basis projections, with W the lookback and H the horizon. No sequential dependency anywhere, so it parallelizes completely across time, batch and — because blocks are independent given their inputs — considerably within a forward pass. Multiply everything by the ensemble size, which is where the real cost sits.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Feed a fixed-length window of past values and emit the whole horizon at once. Nothing else enters — no covariates, no calendar, no static features, just the series. Train one global model across every series in the panel with a scale-free loss, then ensemble over lookback lengths and losses.',
        where: [
          'Large univariate panels where the series share structure but carry no useful covariates',
          'Competition and benchmark forecasting, where it set the reference results on M4 and has been hard to displace',
          'Baseline forecasting before committing to anything with covariates, since it establishes what pure history is worth',
          'Long-horizon forecasting via N-HiTS, where multi-rate pooling is what keeps the cost tractable',
        ],
        why: 'It is the right default when you have many series and no covariates worth having: it beats the statistical ensembles that won M4, trains in minutes, and has no sequence machinery to misconfigure. The pointed part of the finding is what it implies about everything else — if a transformer with attention and covariates cannot beat a stack of MLPs on your panel, the extra machinery is not earning its cost. Against it: it cannot use covariates at all, which is disqualifying wherever promotions or weather drive the signal; it emits a point forecast with no uncertainty; and the published accuracy assumes an ensemble, so a single model is a materially weaker thing than the papers describe.',
        featurization: [
          'Use a scale-free loss (MASE or sMAPE) rather than MSE, or the largest series dominate the gradient and everything else is ignored',
          'Set the lookback as a multiple of the horizon rather than an absolute length, which is what makes one global model work across periodicities',
          'Vary the lookback across ensemble members deliberately — that diversity is where most of the ensemble gain comes from',
          'Handle missing values before the window is built; the architecture has no mask and no way to express a gap',
          'Predict every horizon directly, which the architecture does natively and which avoids compounding errors',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing, per horizon. Report single-model and ensemble numbers separately and always — conflating them is the most common way results in this literature become non-reproducible, and the gap is not small.',
        pitfalls: [
          'Quoting ensemble accuracy while deploying a single model, which is a real and frequently unnoticed regression',
          'Training with MSE on a mixed-scale panel, so the model optimizes the handful of largest series',
          'Deep stacks whose later blocks receive a near-zero residual and contribute nothing but parameters',
          'The interpretable trend basis extrapolating smoothly to implausible values at long horizons',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train on normal history and score each observation by its forecast residual, normalized per series. It works in the ordinary way a forecaster does — but with a specific and important weakness worth stating up front rather than discovering in production.',
        where: [
          'Univariate metric monitoring where no covariates exist and the baseline is purely historical',
          'Cheap large-scale monitoring across many series, where the training cost per series is what matters',
          'Establishing a residual baseline before investing in a covariate-aware detector',
        ],
        why: 'Honestly, this is the weakest featured fit in this entry, and the reason is structural rather than incidental: the model consumes no covariates, so it cannot know that today is a public holiday. A promotion or a bank holiday produces an enormous residual that is not an anomaly at all, and there is no way to tell the model otherwise. Against a quantile forecaster that consumes a calendar, this will generate far more false positives on exactly the days operators care about. It is also a point forecaster with no native uncertainty, so the threshold has to be manufactured from residual quantiles rather than predicted. Use it when there genuinely are no covariates and cost dominates; reach for something covariate-aware otherwise.',
        featurization: [
          'Normalize residuals per series before thresholding, since the model is trained scale-free but the residuals are not',
          'Maintain an explicit calendar exclusion list, because the model cannot be told about holidays through its inputs at all',
          'Calibrate thresholds from residual quantiles on a held-out normal period, as there is no predicted interval to use',
          'Score over a short window rather than a single step, since one-step residuals are dominated by noise',
        ],
        evaluation:
          'Precision and recall on labelled incidents with a detection window, and crucially a separate false-positive count on known event days — that number is the honest measure of this approach’s central weakness and it should be reported rather than averaged away.',
        pitfalls: [
          'Holidays and promotions firing as anomalies, which is inherent here rather than fixable by tuning',
          'A training period containing the incidents to be detected, which teaches the model they are normal',
          'Assuming a residual threshold transfers across series when the residual scale does not',
          'Treating this as equivalent to a covariate-aware detector in a comparison, which it is not',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Two ideas with lives well outside forecasting. Basis expansion means the network predicts coefficients of a chosen function family rather than raw outputs, which constrains the solution to a low-dimensional smooth subspace — the same move as fitting splines instead of points, and a far stronger regularizer than any weight penalty. Doubly residual stacking is sequential refinement: each block fits the residual of its predecessors, which is exactly gradient boosting restated, and N-HiTS then adds multi-rate decomposition where different stacks operate at different sampling rates and their outputs are interpolated back and summed.',
        where: [
          'Basis expansion as constrained function approximation — polynomial and Fourier bases as a structural prior on the output',
          'Residual stacking as boosting expressed inside a differentiable network trained end to end',
          'Multi-rate decomposition and interpolation, which is signal processing imported wholesale into a neural architecture',
          'Ensembling over hyperparameters as the method rather than as a finishing step',
        ],
        why: 'Worth studying because basis expansion is a genuinely transferable idea: constraining outputs to a well-chosen family gets you regularization and interpretability at once, and it is available in far more settings than people use it in. The residual-stacking equivalence to boosting is also clarifying — it says the architecture is a boosting schedule, which explains both why depth helps at first and why it stops helping. The ensemble finding is the uncomfortable one and deserves to be stated as an optimization result: the variance across hyperparameter settings is large enough that averaging over them is part of the method, which is a statement about the loss surface rather than about the architecture.',
        featurization: [
          'Choose the basis to match known structure — polynomial for trend, Fourier for seasonality — and treat it as a prior, because that is what it is',
          'Keep the polynomial degree low; past three it stops being a trend constraint and becomes a way to extrapolate absurdly',
          'Vary lookback and loss across ensemble members rather than just the seed, since that is where the diversity actually comes from',
          'Ablate depth explicitly, because later blocks receiving a near-zero residual cost parameters and contribute nothing',
        ],
        evaluation:
          'Compare a generic basis against the interpretable one on the same data: the accuracy gap tells you what the structural prior costs, and the interpretability gain tells you what it buys. Report single-model variance across seeds and lookbacks, which is the measurement that justifies the ensemble.',
        pitfalls: [
          'Treating the ensemble as optional when the published results depend on it',
          'A high-degree polynomial basis extrapolating smoothly and implausibly past the data',
          'Adding depth without checking that the residual reaching later blocks is still informative',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Used as a cheap, reliable demand or load forecast feeding an operational plan, in settings where the relevant covariates either do not exist or are not available in time. Its speed is the operational argument: forecasting an entire panel takes minutes, so it fits inside a planning cycle without special infrastructure.',
        where: [
          'High-volume operational forecasting where per-series cost dominates and covariates are unavailable',
          'Baseline capacity planning against pure demand history',
          'Backup or challenger forecasts running alongside a covariate-aware primary model',
        ],
        why: 'The appeal is operational rather than statistical: it is fast, has nothing to misconfigure, and fails in obvious ways. The limits are the same ones as everywhere else in this entry and they bite harder here — planners know about next week’s promotion and the model cannot be told, and the plan needs a distribution while the model emits a point. In an operation with a real promotion calendar this is the wrong primary model, however good its benchmark numbers are.',
        featurization: [
          'Match the forecast horizon to the decision lead time, since there is no mechanism to weight horizons differently',
          'Manufacture intervals from historical residual quantiles, and label them clearly as such rather than as predicted uncertainty',
          'Exclude known event periods from training or accept that the model will average them into the baseline',
        ],
        evaluation:
          'Regret against the hindsight-optimal plan alongside MASE. The comparison that matters is against a covariate-aware forecaster on the days covariates exist, because that is where the gap appears and where the decision cost is concentrated.',
        pitfalls: [
          'No mechanism to consume planned actions, so the plan cannot inform the forecast that informs the plan',
          'Point forecasts pushed into an optimizer that needs a distribution',
          'Ensemble inference cost multiplying the serving budget in a way single-model benchmarks never show',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to an hour on a single GPU for a large panel — among the cheapest deep forecasters, because there is no recurrence and nothing sequential. The honest number multiplies by the ensemble size, which is where a benchmark-faithful deployment gets expensive.',
    inferenceProfile:
      'One forward pass per series producing the whole horizon: microseconds, and trivially batched. Multiply by ensemble members, which turns a negligible cost into a merely small one but is the line item people forget when they size a deployment from single-model numbers.',
    retrainingCadence:
      'Monthly or quarterly. Because it consumes only history, there is no covariate schema to drift and retraining is a pure data refresh — genuinely simpler to operate than covariate-aware alternatives.',
    driftAndMonitoring: [
      'Track MASE per series against seasonal-naive continuously; a series where the model stops beating naive should fall back to naive',
      'Watch residual scale per series, since the thresholds any downstream detector uses are derived from it',
      'Monitor the spread across ensemble members as a free uncertainty proxy — widening disagreement is an early signal',
      'Check that later blocks still receive informative residuals after a retrain, since a shifted data distribution can leave them idle',
    ],
    productionGotchas: [
      'The lookback window is fixed at training time. A series with less history than the window cannot be forecast at all and needs an explicit fallback',
      'No masking exists, so missing values must be handled before the window is built — a zero-fill reads as a genuine observation of zero',
      'Ensemble members must be versioned together; swapping one changes the ensemble in a way no individual metric reveals',
      'The scale-free loss normalizes training, not output — residuals come back on the original scale and any threshold must too',
      'There is no path for covariates. Adding a promotion feature later is an architecture change, not a feature-pipeline change',
    ],
  },

  assumptions: [
    'The series carries enough signal in its own history alone, since nothing else can enter the model',
    'Every series has at least a full lookback window of history; shorter series are not forecastable by this architecture',
    'Series are comparable after scale-free normalization, which is what lets one global model serve the whole panel',
    'The sampling interval is fixed and regular, with gaps handled upstream because no mask exists',
    'A point forecast is sufficient, or intervals can be manufactured from historical residuals after the fact',
  ],

  pros: [
    {
      point: 'Beats elaborate architectures with plain MLPs',
      context:
        'The finding that makes this entry worth studying: no recurrence, no attention, and it set the reference results on M4. It is the right first thing to try, and the right yardstick for whether a fancier model is earning its complexity.',
    },
    {
      point: 'Fully parallel — no sequential dependency anywhere',
      context:
        'Trains and serves dramatically faster than recurrent alternatives, and the whole horizon comes out in one pass. This is what makes a large ensemble affordable at all.',
    },
    {
      point: 'The interpretable variant genuinely decomposes',
      context:
        'Trend and seasonality stacks can be plotted separately, which is a real stakeholder benefit and rare in a deep model. It costs a little accuracy against the generic basis, and that trade is usually worth making explicit.',
    },
    {
      point: 'Almost nothing to misconfigure',
      context:
        'No gates, no attention, no covariate schema, no warmup. Compared with a transformer forecaster the operational surface is tiny, and that reliability is worth more in practice than a couple of percent of accuracy.',
    },
  ],

  cons: [
    {
      point: 'Cannot consume covariates at all',
      context:
        'No promotions, no weather, no calendar, no static features. Disqualifying in retail and energy where those drive the signal, and not a gap that can be patched — it is an architecture change.',
    },
    {
      point: 'Point forecasts with no native uncertainty',
      context:
        'Inventory, capacity and risk decisions need a tail. Intervals have to be manufactured from historical residuals afterwards, which is strictly worse than training quantiles directly.',
    },
    {
      point: 'The published accuracy assumes an ensemble',
      context:
        'A single model is materially worse, and the gap is routinely omitted from comparisons. Anyone deploying one model while quoting ensemble numbers has a regression they have not measured.',
    },
    {
      point: 'Fixed lookback window excludes short series',
      context:
        'A series without a full window cannot be forecast, which in a growing catalogue is exactly the newest and most interesting items. Requires a separate cold-start path.',
    },
    {
      point: 'Depth silently stops paying',
      context:
        'Later blocks receive a near-zero residual and learn nothing while still costing parameters and inference time. Invisible unless depth is ablated deliberately, which it usually is not.',
    },
  ],

  relatedSlugs: ['deepar', 'temporal-fusion-transformer', 'mlp', 'exponential-smoothing', 'gradient-boosting'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""N-BEATS, transcribed the way the paper reads.

One block does four things:

    theta       = MLP(input)              four ReLU layers, nothing else
    backcast    = V_b @ theta_b           what this block claims to explain
    forecast    = V_f @ theta_f           what it predicts
    next_input  = input - backcast        the residual the next block sees

Forecasts ADD and inputs have their explained part SUBTRACTED. That pair of
recursions is the whole architecture, and it is gradient boosting rearranged
into a neural network.

Plain loops, no libraries.
"""

import math


def relu(value):
    return value if value > 0.0 else 0.0


def matvec(weight, vector, bias):
    """weight is out_dim rows of in_dim."""
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def mlp(vector, layers):
    """Four fully connected ReLU layers. The entire nonlinearity in N-BEATS."""
    hidden = vector
    for weight, bias in layers:
        hidden = [relu(value) for value in matvec(weight, hidden, bias)]
    return hidden


def generic_basis(length):
    """Identity: theta IS the output, one coefficient per position.

    Maximum flexibility, zero structure, and no interpretability at all.
    """
    return [[1.0 if i == j else 0.0 for j in range(length)] for i in range(length)]


def trend_basis(length, degree):
    """Polynomial in normalized time: V[t][p] = (t / length)^p.

    This is the point of basis expansion. The MLP predicts a handful of
    polynomial coefficients rather than every output value, so the output is
    forced to be a smooth low-order curve. That constrains the solution far
    more effectively than any weight penalty, and it is why this stack can be
    labelled "trend" and plotted.
    """
    return [
        [(index / length) ** power for power in range(degree + 1)]
        for index in range(length)
    ]


def seasonality_basis(length, harmonics):
    """Fourier: alternating cosine and sine at increasing frequencies.

    Same idea as the trend basis with a periodic family instead. The MLP
    predicts amplitudes; the basis guarantees the output is periodic.
    """
    rows = []
    for index in range(length):
        row = []
        for harmonic in range(1, harmonics + 1):
            angle = 2.0 * math.pi * harmonic * index / length
            row.append(math.cos(angle))
            row.append(math.sin(angle))
        rows.append(row)
    return rows


def project(basis, theta):
    """basis is length rows of coefficient_count."""
    return [
        sum(b * t for b, t in zip(row, theta))
        for row in basis
    ]


def block_forward(window, layers, theta_backcast_weight, theta_forecast_weight,
                  backcast_basis, forecast_basis):
    """One block: shared trunk, two heads, two basis projections."""
    hidden = mlp(window, layers)

    # The two heads predict COEFFICIENTS, not values. With a generic basis
    # that distinction is vacuous; with trend or seasonality it is everything.
    theta_backcast = matvec(theta_backcast_weight, hidden,
                            [0.0] * len(theta_backcast_weight))
    theta_forecast = matvec(theta_forecast_weight, hidden,
                            [0.0] * len(theta_forecast_weight))

    backcast = project(backcast_basis, theta_backcast)
    forecast = project(forecast_basis, theta_forecast)
    return backcast, forecast


def nbeats_forward(window, blocks):
    """Doubly residual stacking: forecasts add, inputs shrink."""
    residual = list(window)
    horizon = len(blocks[0]['forecast_basis'])
    total_forecast = [0.0] * horizon

    for block in blocks:
        backcast, forecast = block_forward(
            residual,
            block['layers'],
            block['theta_backcast_weight'],
            block['theta_forecast_weight'],
            block['backcast_basis'],
            block['forecast_basis'],
        )
        # Subtract what this block explained. A later block that receives a
        # near-zero residual has nothing left to learn - which is exactly
        # how depth stops paying, and it is invisible unless you look.
        residual = [r - b for r, b in zip(residual, backcast)]
        total_forecast = [t + f for t, f in zip(total_forecast, forecast)]

    return total_forecast, residual


def mase(forecast, actual, history, seasonal_period):
    """Mean absolute scaled error.

    The denominator is the in-sample error of a seasonal-naive forecast, so
    the loss is comparable across series of wildly different scale. With a
    plain MSE a global model trained across a panel optimizes only the
    largest series and ignores everything else.
    """
    denominator = 0.0
    counted = 0
    for index in range(seasonal_period, len(history)):
        denominator += abs(history[index] - history[index - seasonal_period])
        counted += 1
    if counted == 0 or denominator == 0.0:
        raise ValueError("history is too short to scale the loss")
    denominator /= counted

    numerator = sum(abs(f - a) for f, a in zip(forecast, actual)) / len(forecast)
    return numerator / denominator


def ensemble_forecast(window, model_list):
    """Not a refinement. The published results average dozens of models
    trained with different lookback windows and losses, and a single model is
    materially worse - so the ensemble is part of the method."""
    horizon = None
    accumulated = None
    for blocks in model_list:
        forecast, _ = nbeats_forward(window, blocks)
        if accumulated is None:
            horizon = len(forecast)
            accumulated = [0.0] * horizon
        for h in range(horizon):
            accumulated[h] += forecast[h]
    return [value / len(model_list) for value in accumulated]
`,
        profile:
          'O(L * d^2) for the stack plus O(L * (W + H) * |theta|) for the basis projections, times the ensemble size. Illustrative, not a measured benchmark: every matvec allocates, and the basis matrices are rebuilt per call even though they are fixed constants — both of which the next stages fix.',
      },

      'make-it-right': {
        code: `"""The same architecture, with the basis as a type and the windows checked.

Two changes matter. The basis matrices are fixed constants determined by the
horizon and the basis choice, so they are built once at construction rather
than per forward pass. And the preconditions that silently produce nonsense -
a series shorter than the lookback, a polynomial degree high enough to
extrapolate absurdly, an ensemble quoted but not built - become explicit.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple, Sequence


class BasisKind(Enum):
    """What family the block's output is constrained to lie in."""

    GENERIC = 'generic'
    TREND = 'trend'
    SEASONALITY = 'seasonality'


class InsufficientHistory(ValueError):
    """Raised when a series is shorter than the fixed lookback window.

    Its own type because the correct response is specific: fall back to a
    naive forecast for that series. The architecture cannot forecast it at
    all, and there is no partial-window path.
    """


class ShapeMismatch(ValueError):
    """Raised on a shape violation instead of broadcasting past it."""


class ImplausibleBasis(ValueError):
    """Raised for a basis that will extrapolate absurdly.

    A degree-6 polynomial fits history beautifully and reaches implausible
    values at the far end of the horizon, and nothing in the loss penalizes
    that. Refusing it is cheaper than discovering it in production.
    """


@dataclass(frozen=True)
class BasisSpec:
    """Frozen, because a basis is a structural prior, not a tunable."""

    kind: BasisKind
    degree: int = 2        # polynomial degree for TREND
    harmonics: int = 4     # harmonic count for SEASONALITY

    def __post_init__(self) -> None:
        if self.kind is BasisKind.TREND and not 1 <= self.degree <= 4:
            raise ImplausibleBasis(
                f'polynomial degree {self.degree} extrapolates unusably; keep it at 4 or below'
            )
        if self.kind is BasisKind.SEASONALITY and self.harmonics < 1:
            raise ShapeMismatch('at least one harmonic is required')

    def coefficient_count(self, length: int) -> int:
        """How many numbers the MLP head must emit for this basis."""
        if self.kind is BasisKind.GENERIC:
            return length
        if self.kind is BasisKind.TREND:
            return self.degree + 1
        return 2 * self.harmonics

    def build(self, length: int) -> list[list[float]]:
        """The basis matrix: length rows of coefficient_count.

        Built once and reused. It depends only on the length and the spec,
        so rebuilding it per forward pass is pure waste.
        """
        if length <= 0:
            raise ShapeMismatch('basis length must be positive')

        if self.kind is BasisKind.GENERIC:
            return [
                [1.0 if i == j else 0.0 for j in range(length)]
                for i in range(length)
            ]

        if self.kind is BasisKind.TREND:
            # Normalized time, so the coefficients mean the same thing
            # whatever the horizon is.
            return [
                [(index / length) ** power for power in range(self.degree + 1)]
                for index in range(length)
            ]

        rows: list[list[float]] = []
        for index in range(length):
            row: list[float] = []
            for harmonic in range(1, self.harmonics + 1):
                angle = 2.0 * math.pi * harmonic * index / length
                row.extend((math.cos(angle), math.sin(angle)))
            rows.append(row)
        return rows


@dataclass(frozen=True)
class StackConfig:
    """The shape contract, stated once and derived from rather than repeated."""

    lookback: int
    horizon: int
    hidden_width: int = 512
    layers: int = 4
    blocks: int = 3

    def __post_init__(self) -> None:
        if self.horizon < 1:
            raise ShapeMismatch('horizon must be at least one step')
        if self.lookback < self.horizon:
            raise ShapeMismatch('a lookback shorter than the horizon cannot work')

    @property
    def lookback_multiplier(self) -> float:
        """The strongest single lever, and the main source of ensemble
        diversity — so it is worth naming rather than leaving implicit."""
        return self.lookback / self.horizon


class BlockOutput(NamedTuple):
    """Both halves. The backcast is not a by-product — it is what makes the
    residual recursion work, and discarding it breaks the architecture."""

    backcast: list[float]
    forecast: list[float]


class Block:
    """One N-BEATS block: shared MLP trunk, two coefficient heads, two bases."""

    def __init__(
        self,
        config: StackConfig,
        backcast_spec: BasisSpec,
        forecast_spec: BasisSpec,
    ) -> None:
        self._config = config
        # Built once at construction: these are constants of the geometry.
        self._backcast_basis = backcast_spec.build(config.lookback)
        self._forecast_basis = forecast_spec.build(config.horizon)
        self._backcast_coefficients = backcast_spec.coefficient_count(config.lookback)
        self._forecast_coefficients = forecast_spec.coefficient_count(config.horizon)

        self._layers: list[tuple[list[list[float]], list[float]]] = []
        width = config.lookback
        for _ in range(config.layers):
            self._layers.append((
                [[0.0] * width for _ in range(config.hidden_width)],
                [0.0] * config.hidden_width,
            ))
            width = config.hidden_width

        self._backcast_head = [[0.0] * width for _ in range(self._backcast_coefficients)]
        self._forecast_head = [[0.0] * width for _ in range(self._forecast_coefficients)]

    def forward(self, window: Sequence[float]) -> BlockOutput:
        if len(window) != self._config.lookback:
            raise ShapeMismatch(
                f'expected a {self._config.lookback}-step window, got {len(window)}'
            )

        hidden: Sequence[float] = window
        for weight, bias in self._layers:
            hidden = [
                max(0.0, b + sum(w * v for w, v in zip(row, hidden)))
                for row, b in zip(weight, bias)
            ]

        # The heads predict COEFFICIENTS, not values. With a generic basis
        # that is vacuous; with trend or seasonality it is the whole point.
        theta_backcast = [sum(w * v for w, v in zip(row, hidden)) for row in self._backcast_head]
        theta_forecast = [sum(w * v for w, v in zip(row, hidden)) for row in self._forecast_head]

        return BlockOutput(
            backcast=[
                math.fsum(b * t for b, t in zip(row, theta_backcast))
                for row in self._backcast_basis
            ],
            forecast=[
                math.fsum(b * t for b, t in zip(row, theta_forecast))
                for row in self._forecast_basis
            ],
        )


class ResidualTrace(NamedTuple):
    """Forecast plus the residual norm after each block.

    The norms are returned deliberately: a block whose incoming residual is
    already near zero contributes parameters and inference time and learns
    nothing, and that is invisible unless it is measured.
    """

    forecast: list[float]
    residual_norms: list[float]


def forward(window: Sequence[float], blocks: Sequence[Block], horizon: int) -> ResidualTrace:
    """Doubly residual stacking: forecasts add, inputs shrink."""
    if not blocks:
        raise ShapeMismatch('a stack needs at least one block')

    residual = list(window)
    total = [0.0] * horizon
    norms: list[float] = []

    for block in blocks:
        output = block.forward(residual)
        residual = [r - b for r, b in zip(residual, output.backcast)]
        total = [t + f for t, f in zip(total, output.forecast)]
        norms.append(math.sqrt(math.fsum(value * value for value in residual)))

    return ResidualTrace(forecast=total, residual_norms=norms)


def mase(
    forecast: Sequence[float],
    actual: Sequence[float],
    history: Sequence[float],
    seasonal_period: int,
) -> float:
    """Mean absolute scaled error.

    Guard clauses first: a flat series gives a zero denominator, and a short
    one gives no denominator at all. Both are real and both would otherwise
    produce an infinity that poisons the batch average silently.
    """
    if len(forecast) != len(actual):
        raise ShapeMismatch('forecast and actual lengths disagree')
    if len(history) <= seasonal_period:
        raise InsufficientHistory('history is shorter than one seasonal period')

    differences = [
        abs(history[i] - history[i - seasonal_period])
        for i in range(seasonal_period, len(history))
    ]
    denominator = math.fsum(differences) / len(differences)
    if denominator == 0.0:
        raise ShapeMismatch('a constant history cannot scale the loss')

    numerator = math.fsum(abs(f - a) for f, a in zip(forecast, actual)) / len(forecast)
    return numerator / denominator


def window_or_fail(series: Sequence[float], config: StackConfig) -> list[float]:
    """The fixed lookback is structural. A series shorter than it is not
    forecastable by this architecture at all, and needs a naive fallback."""
    if len(series) < config.lookback:
        raise InsufficientHistory(
            f'{len(series)} observations is short of the {config.lookback}-step window'
        )
    return list(series[-config.lookback:])
`,
        rationale:
          'Two changes carry the weight. The basis matrices depend only on the length and the spec, so they are built once at construction rather than rebuilt on every forward pass — and making the basis a frozen spec rather than a function argument reflects what it actually is, a structural prior rather than a tunable. The other change is refusing the failures that otherwise produce plausible nonsense: a polynomial degree above four fits history beautifully and extrapolates to implausible values at the far end of the horizon with nothing in the loss to penalize it, so the constructor refuses it; a series shorter than the fixed lookback is not forecastable by this architecture at all, so it raises a specific exception whose correct handling — fall back to naive for that series — is named in the docstring; a constant or too-short history gives MASE a zero or missing denominator, which would otherwise produce an infinity that silently poisons a batch average. The forward pass also returns the residual norm after each block, because a block receiving a near-zero residual costs parameters and inference time while learning nothing, and that is invisible unless it is measured.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Same asymptotics, with the basis construction hoisted out of the hot path entirely. Illustrative, not a measured benchmark: on a generic basis that is an O(W^2) matrix no longer rebuilt per call, which on a 500-step lookback is the single largest waste in the literal version.',
      },

      'make-it-fast': {
        code: `"""Batched, and the whole stack is GEMMs. There is nothing sequential here.

The structural observation: N-BEATS has no recurrence and no attention, so
every layer is a dense matrix product and the only ordering constraint is
between blocks. That makes it the easiest forecaster in this reference to
make fast, and it is why an ensemble of thirty models is affordable at all.

Three changes:
  1. The MLP trunk, both coefficient heads and both basis projections become
     GEMMs over the whole batch. The bases are CONSTANT matrices, so they are
     built once and multiplied, never regenerated.
  2. The two heads share one GEMM: their outputs are concatenated columns of
     a single weight, so the trunk activations are read once rather than twice.
  3. The ensemble batches across models rather than looping. Members share a
     shape, so a (members, batch, lookback) tensor flows through as one
     batched contraction - which is what makes the ensemble cheap enough to
     be the method rather than a luxury.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def build_trend_basis(length: int, degree: int) -> NDArray[np.float32]:
    """(length, degree + 1) of normalized-time powers. A constant."""
    time = (np.arange(length, dtype=FLOAT) / FLOAT(length))[:, None]
    powers = np.arange(degree + 1, dtype=FLOAT)[None, :]
    return np.power(time, powers, dtype=FLOAT)


def build_seasonality_basis(length: int, harmonics: int) -> NDArray[np.float32]:
    """(length, 2 * harmonics) of interleaved cosines and sines. A constant."""
    time = np.arange(length, dtype=FLOAT)[:, None]
    frequency = np.arange(1, harmonics + 1, dtype=FLOAT)[None, :]
    angle = FLOAT(2.0 * np.pi) * frequency * time / FLOAT(length)

    basis = np.empty((length, 2 * harmonics), dtype=FLOAT)
    # Interleaved by strided assignment rather than by concatenate-and-
    # reorder, so no intermediate is materialized.
    basis[:, 0::2] = np.cos(angle)
    basis[:, 1::2] = np.sin(angle)
    return basis


class BatchedBlock:
    """One block, evaluated for a whole batch at once.

    The bases are stored as contiguous constants. A basis projection is then
    a GEMM against a fixed matrix — which is the cheapest possible way to
    impose the structural prior, and a good reason to prefer this form over
    generating the output values directly.
    """

    def __init__(
        self,
        trunk_weights: list[NDArray[np.float32]],
        trunk_biases: list[NDArray[np.float32]],
        head_weight: NDArray[np.float32],
        backcast_basis: NDArray[np.float32],
        forecast_basis: NDArray[np.float32],
    ) -> None:
        self._trunk_weights = [np.ascontiguousarray(w, dtype=FLOAT) for w in trunk_weights]
        self._trunk_biases = [np.ascontiguousarray(b, dtype=FLOAT) for b in trunk_biases]
        # ONE head weight whose columns are backcast coefficients followed by
        # forecast coefficients: the trunk output is read once, not twice.
        self._head_weight = np.ascontiguousarray(head_weight, dtype=FLOAT)
        self._backcast_basis = np.ascontiguousarray(backcast_basis, dtype=FLOAT)
        self._forecast_basis = np.ascontiguousarray(forecast_basis, dtype=FLOAT)
        self._split = backcast_basis.shape[1]

    def __call__(
        self, window: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """window is (batch, lookback). Returns (backcast, forecast)."""
        hidden = window
        for weight, bias in zip(self._trunk_weights, self._trunk_biases):
            hidden = hidden @ weight
            hidden += bias
            # In-place ReLU: the trunk is the widest tensor in the block and
            # a temporary per layer is the largest avoidable allocation.
            np.maximum(hidden, 0.0, out=hidden)

        theta = hidden @ self._head_weight
        backcast = theta[:, :self._split] @ self._backcast_basis.T
        forecast = theta[:, self._split:] @ self._forecast_basis.T
        return backcast, forecast


def stack_forward(
    window: NDArray[np.float32],
    blocks: list[BatchedBlock],
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Doubly residual stacking. Both recursions run in place.

    Returns the summed forecast and the per-block residual norms, which are
    the diagnostic for depth that has stopped paying.
    """
    if not blocks:
        raise ValueError('a stack needs at least one block')

    residual = window.copy()
    total: NDArray[np.float32] | None = None
    norms = np.empty((len(blocks), window.shape[0]), dtype=FLOAT)

    for index, block in enumerate(blocks):
        backcast, forecast = block(residual)
        # Both recursions in place: the residual shrinks and the forecast
        # accumulates without either allocating per block.
        residual -= backcast
        if total is None:
            total = forecast
        else:
            total += forecast
        norms[index] = np.linalg.norm(residual, axis=1)

    return total, norms


def ensemble_forward(
    windows: NDArray[np.float32],
    stacked_trunk: NDArray[np.float32],
    stacked_bias: NDArray[np.float32],
) -> NDArray[np.float32]:
    """One layer of every ensemble member at once.

    windows is (members, batch, lookback), stacked_trunk is
    (members, lookback, hidden). matmul broadcasts over the leading axis, so
    all members advance in a single batched GEMM rather than a Python loop -
    which is what turns a thirty-model ensemble from a luxury into the
    default configuration.
    """
    hidden = np.matmul(windows, stacked_trunk)
    hidden += stacked_bias[:, None, :]
    np.maximum(hidden, 0.0, out=hidden)
    return hidden


def mase(
    forecasts: NDArray[np.float32],
    actuals: NDArray[np.float32],
    histories: NDArray[np.float32],
    seasonal_period: int,
) -> NDArray[np.float32]:
    """Per-series MASE, vectorized over the batch.

    The seasonal-naive denominator is a single strided difference over the
    history axis — no loop, and no per-series Python at all.
    """
    if histories.shape[1] <= seasonal_period:
        raise ValueError('history is shorter than one seasonal period')

    seasonal_error = np.abs(histories[:, seasonal_period:] - histories[:, :-seasonal_period])
    denominator = seasonal_error.mean(axis=1, dtype=np.float32)
    # A constant series gives a zero denominator, which would produce an
    # infinity that silently poisons the batch average.
    if np.any(denominator == 0.0):
        raise ValueError('a constant history cannot scale the loss')

    numerator = np.abs(forecasts - actuals).mean(axis=1, dtype=np.float32)
    return numerator / denominator


def ensemble_spread(member_forecasts: NDArray[np.float32]) -> NDArray[np.float32]:
    """Disagreement across members, as a free uncertainty proxy.

    The model emits no interval, but a thirty-member ensemble already
    contains one. It is not calibrated and should not be presented as a
    predictive distribution — but it is a genuinely useful drift signal.
    """
    return member_forecasts.std(axis=0, dtype=np.float32)
`,
        rationale:
          'The structural point is that N-BEATS has nothing sequential in it, so every layer is a dense product and the only ordering constraint is between blocks — which makes it the easiest forecaster here to accelerate and explains why a thirty-model ensemble is affordable at all. The basis matrices are constants of the geometry, so they are built once and each projection becomes a GEMM against a fixed matrix, which is the cheapest possible way to impose the structural prior. The two coefficient heads are merged into a single weight whose columns are backcast coefficients followed by forecast coefficients, so the trunk activations are read once rather than twice, and the ReLU runs in place because the trunk is the widest tensor in the block. Both residual recursions run in place, so neither the shrinking input nor the accumulating forecast allocates per block. The ensemble is the largest change: members share a shape, so stacking them into a leading axis lets matmul broadcast and advance every member in one batched product instead of a Python loop over models. The per-block residual norms and the ensemble spread are computed and returned rather than discarded, since one diagnoses depth that has stopped paying and the other is the only uncertainty signal this architecture offers.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The trunk, the merged head and both basis projections are all GEMMs over the whole batch, and the ensemble becomes a batched matmul broadcasting over the member axis.',
            tradeoff: 'The generic basis is an identity matrix, so projecting through it is a full GEMM that computes nothing — a real waste that only a special case would avoid, at the cost of branching in the hot path.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The ReLU, both residual recursions and the forecast accumulation all write into buffers that already exist, so a deep stack does not allocate once per block.',
            tradeoff: 'The residual buffer is destroyed as it is consumed, so inspecting what a specific block actually subtracted — the natural question when a stack stops improving — requires an unfused pass.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Series, horizons and ensemble members all become array axes, so a full ensemble forecast for a whole panel costs a constant number of interpreter operations.',
            tradeoff: 'Every ensemble member must share a shape to stack, which forbids exactly the lookback diversity the ensemble depends on for its gain — so members are grouped by lookback and the batching is only within a group.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 weights and bases forced to standard layout at construction keep every product on the BLAS fast path rather than silently copying a strided operand.',
            tradeoff: 'float32 accumulation across a deep residual stack drifts, and because each block subtracts from the same buffer the error compounds along the stack rather than cancelling.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'The whole stack becomes a handful of GEMMs per block for the entire batch, and an ensemble advances in one batched product per layer. Illustrative, not a measured benchmark: with no sequential dependency this saturates BLAS readily, which is why an ensemble that would be prohibitive for a recurrent model is routine here.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// N-BEATS, transcribed the way the paper reads.
//
// One block does four things:
//   theta      = MLP(input)         four ReLU layers, nothing else
//   backcast   = V_b * theta_b      what this block claims to explain
//   forecast   = V_f * theta_f      what it predicts
//   next_input = input - backcast   the residual the next block sees
//
// Forecasts ADD and inputs have their explained part SUBTRACTED. That pair of
// recursions is the whole architecture, and it is gradient boosting
// rearranged into a neural network.
//
// Vector-of-vector, and the basis matrices rebuilt per call even though they
// are fixed constants. Both are fixed later.

#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

double Relu(double value) { return value > 0.0 ? value : 0.0; }

// weight is out_dim rows of in_dim.
Vector MatVec(const Matrix& weight, const Vector& vector, const Vector& bias) {
  Vector output(weight.size(), 0.0);
  for (std::size_t i = 0; i < weight.size(); ++i) {
    double accumulated = bias.empty() ? 0.0 : bias[i];
    for (std::size_t j = 0; j < vector.size(); ++j) {
      accumulated += weight[i][j] * vector[j];
    }
    output[i] = accumulated;
  }
  return output;
}

// Four fully connected ReLU layers. The entire nonlinearity in N-BEATS.
Vector Mlp(const Vector& input, const std::vector<Matrix>& weights,
           const std::vector<Vector>& biases) {
  Vector hidden = input;
  for (std::size_t layer = 0; layer < weights.size(); ++layer) {
    hidden = MatVec(weights[layer], hidden, biases[layer]);
    for (std::size_t i = 0; i < hidden.size(); ++i) {
      hidden[i] = Relu(hidden[i]);
    }
  }
  return hidden;
}

// Identity: theta IS the output, one coefficient per position. Maximum
// flexibility, zero structure, no interpretability at all.
Matrix GenericBasis(std::size_t length) {
  Matrix basis(length, Vector(length, 0.0));
  for (std::size_t i = 0; i < length; ++i) {
    basis[i][i] = 1.0;
  }
  return basis;
}

// Polynomial in normalized time: V[t][p] = (t / length)^p.
//
// This is the point of basis expansion. The MLP predicts a handful of
// polynomial coefficients rather than every output value, so the output is
// forced to be a smooth low-order curve. That constrains the solution far
// more than any weight penalty, and it is why this stack can be labelled
// "trend" and plotted.
Matrix TrendBasis(std::size_t length, std::size_t degree) {
  Matrix basis(length, Vector(degree + 1, 0.0));
  for (std::size_t t = 0; t < length; ++t) {
    const double normalized = static_cast<double>(t) / static_cast<double>(length);
    for (std::size_t p = 0; p <= degree; ++p) {
      basis[t][p] = std::pow(normalized, static_cast<double>(p));
    }
  }
  return basis;
}

// Fourier: alternating cosine and sine at increasing frequencies. Same idea
// with a periodic family - the MLP predicts amplitudes and the basis
// guarantees the output is periodic.
Matrix SeasonalityBasis(std::size_t length, std::size_t harmonics) {
  Matrix basis(length, Vector(2 * harmonics, 0.0));
  for (std::size_t t = 0; t < length; ++t) {
    for (std::size_t h = 1; h <= harmonics; ++h) {
      const double angle = 2.0 * M_PI * static_cast<double>(h) *
                           static_cast<double>(t) / static_cast<double>(length);
      basis[t][2 * (h - 1)] = std::cos(angle);
      basis[t][2 * (h - 1) + 1] = std::sin(angle);
    }
  }
  return basis;
}

Vector Project(const Matrix& basis, const Vector& theta) {
  Vector output(basis.size(), 0.0);
  for (std::size_t i = 0; i < basis.size(); ++i) {
    double accumulated = 0.0;
    for (std::size_t j = 0; j < theta.size(); ++j) {
      accumulated += basis[i][j] * theta[j];
    }
    output[i] = accumulated;
  }
  return output;
}

struct BlockParams {
  std::vector<Matrix> trunk_weights;
  std::vector<Vector> trunk_biases;
  Matrix backcast_head;
  Matrix forecast_head;
  Matrix backcast_basis;
  Matrix forecast_basis;
};

struct BlockOutput {
  Vector backcast;
  Vector forecast;
};

BlockOutput BlockForward(const Vector& window, const BlockParams& params) {
  const Vector hidden = Mlp(window, params.trunk_weights, params.trunk_biases);

  // The heads predict COEFFICIENTS, not values. With a generic basis that
  // distinction is vacuous; with trend or seasonality it is everything.
  const Vector theta_backcast = MatVec(params.backcast_head, hidden, Vector{});
  const Vector theta_forecast = MatVec(params.forecast_head, hidden, Vector{});

  return BlockOutput{Project(params.backcast_basis, theta_backcast),
                     Project(params.forecast_basis, theta_forecast)};
}

// Doubly residual stacking: forecasts add, inputs shrink.
Vector NbeatsForward(const Vector& window, const std::vector<BlockParams>& blocks) {
  Vector residual = window;
  Vector total(blocks[0].forecast_basis.size(), 0.0);

  for (std::size_t b = 0; b < blocks.size(); ++b) {
    const BlockOutput output = BlockForward(residual, blocks[b]);
    // Subtract what this block explained. A later block receiving a
    // near-zero residual has nothing left to learn - which is exactly how
    // depth stops paying, and it is invisible unless you look.
    for (std::size_t i = 0; i < residual.size(); ++i) {
      residual[i] -= output.backcast[i];
    }
    for (std::size_t h = 0; h < total.size(); ++h) {
      total[h] += output.forecast[h];
    }
  }
  return total;
}

// Mean absolute scaled error.
//
// The denominator is the in-sample error of a seasonal-naive forecast, so the
// loss is comparable across series of wildly different scale. With a plain
// MSE a global model trained across a panel optimizes only the largest series
// and ignores everything else.
double Mase(const Vector& forecast, const Vector& actual, const Vector& history,
            std::size_t seasonal_period) {
  if (history.size() <= seasonal_period) {
    throw std::invalid_argument("history is shorter than one seasonal period");
  }

  double denominator = 0.0;
  std::size_t counted = 0;
  for (std::size_t i = seasonal_period; i < history.size(); ++i) {
    denominator += std::abs(history[i] - history[i - seasonal_period]);
    ++counted;
  }
  denominator /= static_cast<double>(counted);
  if (denominator == 0.0) {
    throw std::invalid_argument("a constant history cannot scale the loss");
  }

  double numerator = 0.0;
  for (std::size_t h = 0; h < forecast.size(); ++h) {
    numerator += std::abs(forecast[h] - actual[h]);
  }
  numerator /= static_cast<double>(forecast.size());

  return numerator / denominator;
}
`,
        profile:
          'O(L * d^2) for the stack plus O(L * (W + H) * |theta|) for the basis projections, times the ensemble size. Illustrative, not a measured benchmark: every MatVec allocates a fresh vector and the basis matrices are rebuilt per call even though they are fixed — on a 500-step lookback with a generic basis that alone is a quarter-million element allocation per block.',
      },

      'make-it-right': {
        code: `// The same architecture, with the basis as a type and the windows checked.
//
// Two changes carry the weight. The basis matrices depend only on the length
// and the spec, so they are built once at construction rather than per
// forward pass. And the preconditions that otherwise produce plausible
// nonsense - a series shorter than the fixed lookback, a polynomial degree
// that extrapolates absurdly, a constant history that gives MASE a zero
// denominator - become explicit and typed.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace nbeats {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the correct response is specific: fall back to a naive
// forecast for that series. This architecture has no partial-window path.
class InsufficientHistory : public std::invalid_argument {
 public:
  explicit InsufficientHistory(const std::string& what)
      : std::invalid_argument(what) {}
};

// A degree-6 polynomial fits history beautifully and reaches implausible
// values at the far end of the horizon, and nothing in the loss penalizes
// that. Refusing it is cheaper than discovering it in production.
class ImplausibleBasis : public std::invalid_argument {
 public:
  explicit ImplausibleBasis(const std::string& what)
      : std::invalid_argument(what) {}
};

enum class BasisKind { kGeneric, kTrend, kSeasonality };

// A basis is a structural prior, not a tunable, so the spec is immutable and
// validated once.
class BasisSpec {
 public:
  static BasisSpec Generic() { return BasisSpec(BasisKind::kGeneric, 0, 0); }

  static BasisSpec Trend(std::size_t degree) {
    if (degree < 1 || degree > 4) {
      throw ImplausibleBasis("polynomial degree above 4 extrapolates unusably");
    }
    return BasisSpec(BasisKind::kTrend, degree, 0);
  }

  static BasisSpec Seasonality(std::size_t harmonics) {
    if (harmonics < 1) {
      throw ShapeMismatch("at least one harmonic is required");
    }
    return BasisSpec(BasisKind::kSeasonality, 0, harmonics);
  }

  // How many numbers the MLP head must emit for this basis.
  [[nodiscard]] std::size_t CoefficientCount(std::size_t length) const noexcept {
    switch (kind_) {
      case BasisKind::kGeneric:
        return length;
      case BasisKind::kTrend:
        return degree_ + 1;
      case BasisKind::kSeasonality:
        return 2 * harmonics_;
    }
    return length;
  }

  // The basis matrix, flat row-major (length x coefficient_count).
  // Depends only on length and spec, so it is built once and reused.
  [[nodiscard]] std::vector<double> Build(std::size_t length) const {
    if (length == 0) {
      throw ShapeMismatch("basis length must be positive");
    }
    const std::size_t columns = CoefficientCount(length);
    std::vector<double> basis(length * columns, 0.0);

    for (std::size_t t = 0; t < length; ++t) {
      double* row = basis.data() + t * columns;
      switch (kind_) {
        case BasisKind::kGeneric:
          row[t] = 1.0;
          break;
        case BasisKind::kTrend: {
          // Normalized time, so coefficients mean the same thing whatever
          // the horizon is.
          const double normalized =
              static_cast<double>(t) / static_cast<double>(length);
          double power = 1.0;
          for (std::size_t p = 0; p <= degree_; ++p) {
            row[p] = power;
            power *= normalized;
          }
          break;
        }
        case BasisKind::kSeasonality:
          for (std::size_t h = 1; h <= harmonics_; ++h) {
            const double angle = 2.0 * M_PI * static_cast<double>(h) *
                                 static_cast<double>(t) / static_cast<double>(length);
            row[2 * (h - 1)] = std::cos(angle);
            row[2 * (h - 1) + 1] = std::sin(angle);
          }
          break;
      }
    }
    return basis;
  }

 private:
  BasisSpec(BasisKind kind, std::size_t degree, std::size_t harmonics)
      : kind_(kind), degree_(degree), harmonics_(harmonics) {}

  BasisKind kind_;
  std::size_t degree_;
  std::size_t harmonics_;
};

// The shape contract, stated once and derived from rather than repeated.
struct StackConfig {
  std::size_t lookback{};
  std::size_t horizon{};
  std::size_t hidden_width{512};
  std::size_t layers{4};

  void Validate() const {
    if (horizon == 0) {
      throw ShapeMismatch("horizon must be at least one step");
    }
    if (lookback < horizon) {
      throw ShapeMismatch("a lookback shorter than the horizon cannot work");
    }
  }

  // The strongest single lever and the main source of ensemble diversity,
  // so it is worth naming rather than leaving implicit.
  [[nodiscard]] double lookback_multiplier() const noexcept {
    return static_cast<double>(lookback) / static_cast<double>(horizon);
  }
};

// Owns its weights, bases and scratch: a repeated forward pass allocates
// nothing, and the bases are never rebuilt.
class Block {
 public:
  Block(const StackConfig& config, const BasisSpec& backcast_spec,
        const BasisSpec& forecast_spec)
      : config_(config),
        backcast_coefficients_(backcast_spec.CoefficientCount(config.lookback)),
        forecast_coefficients_(forecast_spec.CoefficientCount(config.horizon)),
        backcast_basis_(backcast_spec.Build(config.lookback)),
        forecast_basis_(forecast_spec.Build(config.horizon)),
        hidden_(config.hidden_width, 0.0),
        scratch_(config.hidden_width, 0.0),
        theta_(backcast_coefficients_ + forecast_coefficients_, 0.0) {
    config_.Validate();

    std::size_t width = config.lookback;
    for (std::size_t layer = 0; layer < config.layers; ++layer) {
      trunk_.emplace_back(width * config.hidden_width, 0.0);
      trunk_bias_.emplace_back(config.hidden_width, 0.0);
      width = config.hidden_width;
    }
    // ONE head whose columns are backcast coefficients followed by forecast
    // coefficients, so the trunk output is read once rather than twice.
    head_.assign(width * theta_.size(), 0.0);
  }

  void Forward(std::span<const double> window, std::span<double> backcast,
               std::span<double> forecast) {
    if (window.size() != config_.lookback) {
      throw ShapeMismatch("window length does not match the configured lookback");
    }

    std::span<const double> input = window;
    std::size_t in_width = config_.lookback;
    for (std::size_t layer = 0; layer < trunk_.size(); ++layer) {
      Dense(trunk_[layer], trunk_bias_[layer], input, in_width, scratch_);
      for (double& value : scratch_) {
        value = value > 0.0 ? value : 0.0;
      }
      hidden_.swap(scratch_);
      input = hidden_;
      in_width = config_.hidden_width;
    }

    Dense(head_, {}, hidden_, config_.hidden_width, theta_);
    Project(backcast_basis_, std::span<const double>(theta_.data(), backcast_coefficients_),
            backcast);
    Project(forecast_basis_,
            std::span<const double>(theta_.data() + backcast_coefficients_,
                                    forecast_coefficients_),
            forecast);
  }

 private:
  static void Dense(const std::vector<double>& weight, std::span<const double> bias,
                    std::span<const double> input, std::size_t in_width,
                    std::vector<double>& out) {
    const std::size_t out_width = weight.size() / in_width;
    if (bias.empty()) {
      std::fill(out.begin(), out.begin() + static_cast<long>(out_width), 0.0);
    } else {
      std::copy(bias.begin(), bias.end(), out.begin());
    }
    for (std::size_t j = 0; j < in_width; ++j) {
      const double value = input[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = weight.data() + j * out_width;
      for (std::size_t i = 0; i < out_width; ++i) {
        out[i] += value * row[i];
      }
    }
  }

  static void Project(const std::vector<double>& basis, std::span<const double> theta,
                      std::span<double> out) {
    const std::size_t columns = theta.size();
    for (std::size_t i = 0; i < out.size(); ++i) {
      const double* row = basis.data() + i * columns;
      double accumulated = 0.0;
      for (std::size_t j = 0; j < columns; ++j) {
        accumulated += row[j] * theta[j];
      }
      out[i] = accumulated;
    }
  }

  StackConfig config_;
  std::size_t backcast_coefficients_;
  std::size_t forecast_coefficients_;
  std::vector<double> backcast_basis_;
  std::vector<double> forecast_basis_;
  std::vector<std::vector<double>> trunk_;
  std::vector<std::vector<double>> trunk_bias_;
  std::vector<double> head_;
  std::vector<double> hidden_;
  std::vector<double> scratch_;
  std::vector<double> theta_;
};

// Forecast plus the residual norm after each block. The norms come back
// deliberately: a block whose incoming residual is already near zero costs
// parameters and inference time and learns nothing, and that is invisible
// unless it is measured.
struct ResidualTrace {
  std::vector<double> forecast;
  std::vector<double> residual_norms;
};

[[nodiscard]] inline ResidualTrace Forward(std::span<const double> window,
                                           std::vector<Block>& blocks,
                                           std::size_t lookback, std::size_t horizon) {
  if (blocks.empty()) {
    throw ShapeMismatch("a stack needs at least one block");
  }

  std::vector<double> residual(window.begin(), window.end());
  std::vector<double> total(horizon, 0.0);
  std::vector<double> backcast(lookback, 0.0);
  std::vector<double> forecast(horizon, 0.0);
  ResidualTrace trace;
  trace.residual_norms.reserve(blocks.size());

  for (Block& block : blocks) {
    block.Forward(residual, backcast, forecast);
    for (std::size_t i = 0; i < residual.size(); ++i) {
      residual[i] -= backcast[i];
    }
    for (std::size_t h = 0; h < horizon; ++h) {
      total[h] += forecast[h];
    }
    trace.residual_norms.push_back(std::sqrt(std::inner_product(
        residual.begin(), residual.end(), residual.begin(), 0.0)));
  }

  trace.forecast = std::move(total);
  return trace;
}

// The fixed lookback is structural: a series shorter than it is not
// forecastable by this architecture at all.
[[nodiscard]] inline std::span<const double> WindowOrFail(
    std::span<const double> series, const StackConfig& config) {
  if (series.size() < config.lookback) {
    throw InsufficientHistory("series is shorter than the configured lookback");
  }
  return series.subspan(series.size() - config.lookback, config.lookback);
}

}  // namespace nbeats
`,
        rationale:
          'Two changes carry the weight. The basis matrices depend only on the length and the spec, so they are built once in the constructor and stored flat rather than rebuilt on every forward pass — on a 500-step lookback with a generic basis that alone was a quarter-million element allocation per block per call. Making the spec an immutable validated type rather than a set of loose arguments reflects what a basis actually is: a structural prior, not a tunable. The other change is refusing the failures that produce plausible nonsense. A polynomial degree above four fits history beautifully and extrapolates absurdly at the far end of the horizon with nothing in the loss to penalize it, so the factory refuses it; a series shorter than the fixed lookback is not forecastable at all, and the exception says so with a type whose correct handling is naming a naive fallback. Both coefficient heads merge into one weight so the trunk output is read once, all storage flattens so a row is a contiguous span, and the forward pass returns per-block residual norms because depth that has stopped paying is otherwise invisible.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same asymptotics with the basis construction hoisted entirely out of the hot path, and no per-call allocation anywhere. Illustrative, not a measured benchmark: flat storage also makes each dense pass a stride-one walk rather than a pointer chase.',
      },

      'make-it-fast': {
        code: `// Batched, and the whole stack is BLAS. Nothing here is sequential.
//
// The structural observation: N-BEATS has no recurrence and no attention, so
// every layer is a dense matrix product and the only ordering constraint is
// between blocks. That makes it the easiest forecaster in this reference to
// accelerate, and it is why an ensemble of thirty models is affordable at all.
//
// Three changes:
//   1. The trunk, the merged head and both basis projections become GEMMs
//      over the whole batch. The bases are CONSTANTS, built once.
//   2. The two heads share one GEMM: their coefficients are adjacent columns
//      of a single weight, so the trunk output is read once, not twice.
//   3. Ensemble members that share a shape are evaluated as one GEMM with the
//      member axis folded into the batch - which is what turns a thirty-model
//      ensemble from a luxury into the default configuration.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace nbeats {

// One arena for the whole batch. Activations are large and identically
// shaped every call, so allocating once and slicing is the difference
// between a forward pass that touches the allocator and one that does not.
class FastStack {
 public:
  FastStack(int max_rows, int lookback, int horizon, int hidden, int layers,
            int backcast_coefficients, int forecast_coefficients)
      : lookback_(lookback),
        horizon_(horizon),
        hidden_(hidden),
        layers_(layers),
        backcast_coefficients_(backcast_coefficients),
        forecast_coefficients_(forecast_coefficients),
        activation_(static_cast<std::size_t>(max_rows) * hidden),
        scratch_(static_cast<std::size_t>(max_rows) * hidden),
        theta_(static_cast<std::size_t>(max_rows) *
               (backcast_coefficients + forecast_coefficients)),
        backcast_(static_cast<std::size_t>(max_rows) * lookback),
        forecast_(static_cast<std::size_t>(max_rows) * horizon) {}

  // residual is (rows x lookback) and is UPDATED IN PLACE; total is
  // (rows x horizon) and is accumulated into.
  void BlockForward(float* __restrict residual, int rows,
                    const float* __restrict trunk, const float* __restrict trunk_bias,
                    const float* __restrict head,
                    const float* __restrict backcast_basis,
                    const float* __restrict forecast_basis,
                    float* __restrict total) {
    const float* input = residual;
    int in_width = lookback_;
    // Two buffers, ping-ponged: a deep trunk needs no more than the current
    // and previous activation alive at once.
    float* output = activation_.data();
    float* spare = scratch_.data();

    for (int layer = 0; layer < layers_; ++layer) {
      const float* weight = trunk + LayerOffset(layer);
      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, hidden_, in_width,
                  1.0F, input, in_width, weight, hidden_, 0.0F, output, hidden_);

      // Fused bias and ReLU in one pass: the pre-activation is never a
      // separate buffer, and the trunk is the widest tensor in the block.
      const float* bias = trunk_bias + static_cast<std::size_t>(layer) * hidden_;
#pragma omp parallel for schedule(static)
      for (int r = 0; r < rows; ++r) {
        float* row = output + static_cast<std::size_t>(r) * hidden_;
        for (int h = 0; h < hidden_; ++h) {
          const float value = row[h] + bias[h];
          row[h] = value > 0.0F ? value : 0.0F;
        }
      }

      input = output;
      in_width = hidden_;
      std::swap(output, spare);
    }

    // ONE GEMM for both coefficient heads: the trunk output is read once.
    const int theta_width = backcast_coefficients_ + forecast_coefficients_;
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, theta_width, hidden_,
                1.0F, input, hidden_, head, theta_width, 0.0F, theta_.data(), theta_width);

    // Basis projections: GEMMs against fixed constant matrices, which is the
    // cheapest possible way to impose the structural prior.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows, lookback_,
                backcast_coefficients_, 1.0F, theta_.data(), theta_width,
                backcast_basis, backcast_coefficients_, 0.0F, backcast_.data(), lookback_);

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows, horizon_,
                forecast_coefficients_, 1.0F,
                theta_.data() + backcast_coefficients_, theta_width,
                forecast_basis, forecast_coefficients_, 0.0F, forecast_.data(), horizon_);

    // Both residual recursions fused into one pass: the input shrinks and
    // the forecast accumulates without either allocating per block.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* residual_row = residual + static_cast<std::size_t>(r) * lookback_;
      const float* backcast_row = backcast_.data() + static_cast<std::size_t>(r) * lookback_;
      for (int i = 0; i < lookback_; ++i) {
        residual_row[i] -= backcast_row[i];
      }
      float* total_row = total + static_cast<std::size_t>(r) * horizon_;
      const float* forecast_row = forecast_.data() + static_cast<std::size_t>(r) * horizon_;
      for (int h = 0; h < horizon_; ++h) {
        total_row[h] += forecast_row[h];
      }
    }
  }

  // Residual norm per row after a block. The diagnostic for depth that has
  // stopped paying, which is invisible unless it is measured.
  void ResidualNorms(const float* __restrict residual, int rows,
                     float* __restrict norms) const {
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* row = residual + static_cast<std::size_t>(r) * lookback_;
      float total = 0.0F;
      for (int i = 0; i < lookback_; ++i) {
        total += row[i] * row[i];
      }
      norms[r] = std::sqrt(total);
    }
  }

 private:
  [[nodiscard]] std::size_t LayerOffset(int layer) const noexcept {
    // Layer 0 maps lookback to hidden; the rest map hidden to hidden.
    return layer == 0 ? 0
                      : static_cast<std::size_t>(lookback_) * hidden_ +
                            static_cast<std::size_t>(layer - 1) * hidden_ * hidden_;
  }

  int lookback_;
  int horizon_;
  int hidden_;
  int layers_;
  int backcast_coefficients_;
  int forecast_coefficients_;
  std::vector<float> activation_;
  std::vector<float> scratch_;
  std::vector<float> theta_;
  std::vector<float> backcast_;
  std::vector<float> forecast_;
};

// Constant basis matrices, built once at startup in float32 row-major.
inline std::vector<float> BuildTrendBasis(int length, int degree) {
  std::vector<float> basis(static_cast<std::size_t>(length) * (degree + 1), 0.0F);
  for (int t = 0; t < length; ++t) {
    float* row = basis.data() + static_cast<std::size_t>(t) * (degree + 1);
    const float normalized = static_cast<float>(t) / static_cast<float>(length);
    float power = 1.0F;
    for (int p = 0; p <= degree; ++p) {
      row[p] = power;
      power *= normalized;
    }
  }
  return basis;
}

// Per-series MASE for a whole batch, as one parallel pass.
inline void BatchMase(std::span<const float> forecasts, std::span<const float> actuals,
                      std::span<const float> histories, int horizon, int history_length,
                      int seasonal_period, std::span<float> out) {
  const int rows = static_cast<int>(out.size());

#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    const float* history = histories.data() + static_cast<std::size_t>(r) * history_length;
    float denominator = 0.0F;
    for (int i = seasonal_period; i < history_length; ++i) {
      denominator += std::abs(history[i] - history[i - seasonal_period]);
    }
    denominator /= static_cast<float>(history_length - seasonal_period);

    const float* forecast = forecasts.data() + static_cast<std::size_t>(r) * horizon;
    const float* actual = actuals.data() + static_cast<std::size_t>(r) * horizon;
    float numerator = 0.0F;
    for (int h = 0; h < horizon; ++h) {
      numerator += std::abs(forecast[h] - actual[h]);
    }
    numerator /= static_cast<float>(horizon);

    // A constant series gives a zero denominator, which would be an
    // infinity that silently poisons the batch average.
    out[r] = denominator == 0.0F ? 0.0F : numerator / denominator;
  }
}

}  // namespace nbeats
`,
        rationale:
          'The structural point is that N-BEATS has nothing sequential in it, so every layer is a dense product and the only ordering constraint is between blocks — which makes it the easiest forecaster here to accelerate, and explains why a thirty-model ensemble is affordable at all. The trunk, the merged coefficient head and both basis projections all become GEMMs over the whole batch, and the bases are built once as float32 constants because they depend only on the geometry. Merging the two heads into one weight with adjacent coefficient columns means the trunk output is read once rather than twice for identical arithmetic. Bias and ReLU fuse into a single pass so the pre-activation is never a separate buffer, and the two residual recursions fuse into one pass so neither the shrinking input nor the accumulating forecast allocates per block. All scratch is allocated once at construction and the forward pass never enters the allocator. The per-block residual norm is computed rather than skipped, because depth that has stopped paying is otherwise invisible and it costs one reduction over a buffer already in cache.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Every layer of the trunk, the merged head and both basis projections are dense products over the whole batch, with the bases as fixed contiguous operands.',
            tradeoff: 'The generic basis is an identity matrix, so projecting through it is a full GEMM computing nothing — genuine waste that only a special case would avoid, at the cost of a branch in the hot path.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias and ReLU happen in one traversal, and the residual subtraction and forecast accumulation happen in another, so neither the pre-activation nor the per-block backcast is a separate live buffer.',
            tradeoff: 'The residual is destroyed as it is consumed, so inspecting what a specific block actually subtracted — the natural question when a deep stack stops improving — needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The fused bias-ReLU pass, the residual recursions, the norm reduction and the per-series MASE are all row-independent with no shared writes.',
            tradeoff: 'These passes are memory-bound rather than compute-bound, so threading them competes for bandwidth with the BLAS calls around them and can slow the whole block if both are threaded at once.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The fused pointwise passes are contiguous and branch-light, and only vectorize when the compiler may emit the host machine width.',
            tradeoff: 'The binary stops being portable across machine generations, so a mixed fleet needs per-target builds or runtime dispatch — and the ReLU select compiles differently enough across targets to shift low-order bits.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'The whole stack becomes a handful of GEMMs per block for the entire batch, with no sequential dependency anywhere. Illustrative, not a measured benchmark: this saturates BLAS readily, which is precisely why an ensemble that would be prohibitive for a recurrent forecaster is routine here.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// N-BEATS, transcribed the way the paper reads.
//
// One block does four things:
//   theta      = MLP(input)         four ReLU layers, nothing else
//   backcast   = V_b * theta_b      what this block claims to explain
//   forecast   = V_f * theta_f      what it predicts
//   next_input = input - backcast   the residual the next block sees
//
// Forecasts ADD and inputs have their explained part SUBTRACTED. That pair of
// recursions is the whole architecture, and it is gradient boosting
// rearranged into a neural network.
//
// Vec-of-Vec, index loops, and the basis matrices rebuilt per call even
// though they are fixed constants. All three are fixed later.

use std::f64::consts::PI;

fn relu(value: f64) -> f64 {
    if value > 0.0 {
        value
    } else {
        0.0
    }
}

/// weight is out_dim rows of in_dim.
fn matvec(weight: &[Vec<f64>], vector: &[f64], bias: &[f64]) -> Vec<f64> {
    let mut output = vec![0.0_f64; weight.len()];
    for i in 0..weight.len() {
        let mut accumulated = if bias.is_empty() { 0.0 } else { bias[i] };
        for j in 0..vector.len() {
            accumulated += weight[i][j] * vector[j];
        }
        output[i] = accumulated;
    }
    output
}

/// Four fully connected ReLU layers. The entire nonlinearity in N-BEATS.
fn mlp(input: &[f64], weights: &[Vec<Vec<f64>>], biases: &[Vec<f64>]) -> Vec<f64> {
    let mut hidden = input.to_vec();
    for layer in 0..weights.len() {
        hidden = matvec(&weights[layer], &hidden, &biases[layer]);
        for value in hidden.iter_mut() {
            *value = relu(*value);
        }
    }
    hidden
}

/// Identity: theta IS the output, one coefficient per position. Maximum
/// flexibility, zero structure, no interpretability at all.
fn generic_basis(length: usize) -> Vec<Vec<f64>> {
    let mut basis = vec![vec![0.0_f64; length]; length];
    for i in 0..length {
        basis[i][i] = 1.0;
    }
    basis
}

/// Polynomial in normalized time: V[t][p] = (t / length)^p.
///
/// This is the point of basis expansion. The MLP predicts a handful of
/// polynomial coefficients rather than every output value, so the output is
/// forced to be a smooth low-order curve. That constrains the solution far
/// more than any weight penalty, and it is why this stack can be labelled
/// "trend" and plotted.
fn trend_basis(length: usize, degree: usize) -> Vec<Vec<f64>> {
    let mut basis = vec![vec![0.0_f64; degree + 1]; length];
    for t in 0..length {
        let normalized = t as f64 / length as f64;
        for p in 0..=degree {
            basis[t][p] = normalized.powi(p as i32);
        }
    }
    basis
}

/// Fourier: alternating cosine and sine at increasing frequencies. Same idea
/// with a periodic family - the MLP predicts amplitudes and the basis
/// guarantees the output is periodic.
fn seasonality_basis(length: usize, harmonics: usize) -> Vec<Vec<f64>> {
    let mut basis = vec![vec![0.0_f64; 2 * harmonics]; length];
    for t in 0..length {
        for h in 1..=harmonics {
            let angle = 2.0 * PI * h as f64 * t as f64 / length as f64;
            basis[t][2 * (h - 1)] = angle.cos();
            basis[t][2 * (h - 1) + 1] = angle.sin();
        }
    }
    basis
}

fn project(basis: &[Vec<f64>], theta: &[f64]) -> Vec<f64> {
    let mut output = vec![0.0_f64; basis.len()];
    for i in 0..basis.len() {
        let mut accumulated = 0.0;
        for j in 0..theta.len() {
            accumulated += basis[i][j] * theta[j];
        }
        output[i] = accumulated;
    }
    output
}

struct BlockParams {
    trunk_weights: Vec<Vec<Vec<f64>>>,
    trunk_biases: Vec<Vec<f64>>,
    backcast_head: Vec<Vec<f64>>,
    forecast_head: Vec<Vec<f64>>,
    backcast_basis: Vec<Vec<f64>>,
    forecast_basis: Vec<Vec<f64>>,
}

fn block_forward(window: &[f64], params: &BlockParams) -> (Vec<f64>, Vec<f64>) {
    let hidden = mlp(window, &params.trunk_weights, &params.trunk_biases);

    // The heads predict COEFFICIENTS, not values. With a generic basis that
    // distinction is vacuous; with trend or seasonality it is everything.
    let theta_backcast = matvec(&params.backcast_head, &hidden, &[]);
    let theta_forecast = matvec(&params.forecast_head, &hidden, &[]);

    (
        project(&params.backcast_basis, &theta_backcast),
        project(&params.forecast_basis, &theta_forecast),
    )
}

/// Doubly residual stacking: forecasts add, inputs shrink.
fn nbeats_forward(window: &[f64], blocks: &[BlockParams]) -> Vec<f64> {
    let mut residual = window.to_vec();
    let mut total = vec![0.0_f64; blocks[0].forecast_basis.len()];

    for block in blocks {
        let (backcast, forecast) = block_forward(&residual, block);
        // Subtract what this block explained. A later block receiving a
        // near-zero residual has nothing left to learn - which is exactly
        // how depth stops paying, and it is invisible unless you look.
        for i in 0..residual.len() {
            residual[i] -= backcast[i];
        }
        for h in 0..total.len() {
            total[h] += forecast[h];
        }
    }
    total
}

/// Mean absolute scaled error.
///
/// The denominator is the in-sample error of a seasonal-naive forecast, so
/// the loss is comparable across series of wildly different scale. With a
/// plain MSE a global model trained across a panel optimizes only the
/// largest series and ignores everything else.
fn mase(forecast: &[f64], actual: &[f64], history: &[f64], seasonal_period: usize) -> f64 {
    assert!(
        history.len() > seasonal_period,
        "history is shorter than one seasonal period"
    );

    let mut denominator = 0.0;
    for i in seasonal_period..history.len() {
        denominator += (history[i] - history[i - seasonal_period]).abs();
    }
    denominator /= (history.len() - seasonal_period) as f64;
    assert!(denominator != 0.0, "a constant history cannot scale the loss");

    let mut numerator = 0.0;
    for h in 0..forecast.len() {
        numerator += (forecast[h] - actual[h]).abs();
    }
    numerator /= forecast.len() as f64;

    numerator / denominator
}
`,
        profile:
          'O(L * d^2) for the stack plus O(L * (W + H) * |theta|) for the basis projections, times the ensemble size. Illustrative, not a measured benchmark: every matvec allocates a fresh Vec and the basis matrices are rebuilt per call even though they are fixed — on a 500-step lookback with a generic basis that is a quarter-million element allocation per block.',
      },

      'make-it-right': {
        code: `//! The same architecture, with the basis as a type and the windows checked.
//!
//! Two changes carry the weight. The basis matrices depend only on the length
//! and the spec, so they are built once at construction rather than per
//! forward pass. And the preconditions that otherwise produce plausible
//! nonsense - a series shorter than the fixed lookback, a polynomial degree
//! that extrapolates absurdly, a constant history that gives MASE a zero
//! denominator - become typed errors a caller can act on.

use std::f64::consts::PI;
use std::fmt;

/// Length of the input window, in steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Lookback(pub usize);

/// Forecast horizon, in steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Horizon(pub usize);

/// Width of a fully connected layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Width(pub usize);

#[derive(Debug, PartialEq)]
pub enum NbeatsError {
    /// A series shorter than the fixed lookback.
    ///
    /// Its own variant because the correct response is specific: fall back to
    /// a naive forecast for that series. This architecture has no
    /// partial-window path at all.
    InsufficientHistory { have: usize, need: usize },
    /// A basis that will extrapolate absurdly.
    ///
    /// A degree-6 polynomial fits history beautifully and reaches implausible
    /// values at the far end of the horizon, and nothing in the loss
    /// penalizes that. Refusing it is cheaper than finding out in production.
    ImplausibleBasis { degree: usize },
    /// A lookback shorter than the horizon, which cannot work.
    LookbackTooShort { lookback: usize, horizon: usize },
    /// A constant history, which gives MASE a zero denominator.
    ConstantHistory,
    /// A buffer length that does not match the shape it should carry.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for NbeatsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InsufficientHistory { have, need } => {
                write!(f, "{have} observations is short of the {need}-step window")
            }
            Self::ImplausibleBasis { degree } => {
                write!(f, "polynomial degree {degree} extrapolates unusably; keep it at 4 or below")
            }
            Self::LookbackTooShort { lookback, horizon } => {
                write!(f, "a {lookback}-step lookback cannot serve a {horizon}-step horizon")
            }
            Self::ConstantHistory => write!(f, "a constant history cannot scale the loss"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for NbeatsError {}

/// What family a block's output is constrained to lie in.
///
/// A basis is a structural prior, not a tunable, so the spec is immutable and
/// validated once at construction.
#[derive(Debug, Clone, Copy)]
pub enum BasisSpec {
    Generic,
    Trend { degree: usize },
    Seasonality { harmonics: usize },
}

impl BasisSpec {
    pub fn trend(degree: usize) -> Result<Self, NbeatsError> {
        if !(1..=4).contains(&degree) {
            return Err(NbeatsError::ImplausibleBasis { degree });
        }
        Ok(Self::Trend { degree })
    }

    /// How many numbers the MLP head must emit for this basis.
    pub fn coefficient_count(&self, length: usize) -> usize {
        match self {
            Self::Generic => length,
            Self::Trend { degree } => degree + 1,
            Self::Seasonality { harmonics } => 2 * harmonics,
        }
    }

    /// The basis matrix, flat row-major (length x coefficient_count).
    ///
    /// Depends only on the length and the spec, so it is built once and
    /// reused rather than regenerated on every forward pass.
    pub fn build(&self, length: usize) -> Vec<f64> {
        let columns = self.coefficient_count(length);
        let mut basis = vec![0.0; length * columns];

        for t in 0..length {
            let row = &mut basis[t * columns..(t + 1) * columns];
            match self {
                Self::Generic => row[t] = 1.0,
                Self::Trend { degree } => {
                    // Normalized time, so coefficients mean the same thing
                    // whatever the horizon is.
                    let normalized = t as f64 / length as f64;
                    let mut power = 1.0;
                    for slot in row.iter_mut().take(degree + 1) {
                        *slot = power;
                        power *= normalized;
                    }
                }
                Self::Seasonality { harmonics } => {
                    for h in 1..=*harmonics {
                        let angle = 2.0 * PI * h as f64 * t as f64 / length as f64;
                        row[2 * (h - 1)] = angle.cos();
                        row[2 * (h - 1) + 1] = angle.sin();
                    }
                }
            }
        }
        basis
    }
}

/// The shape contract, stated once and derived from rather than repeated.
#[derive(Debug, Clone, Copy)]
pub struct StackConfig {
    pub lookback: Lookback,
    pub horizon: Horizon,
    pub hidden: Width,
    pub layers: usize,
}

impl StackConfig {
    pub fn new(
        lookback: Lookback,
        horizon: Horizon,
        hidden: Width,
        layers: usize,
    ) -> Result<Self, NbeatsError> {
        if lookback.0 < horizon.0 {
            return Err(NbeatsError::LookbackTooShort {
                lookback: lookback.0,
                horizon: horizon.0,
            });
        }
        Ok(Self { lookback, horizon, hidden, layers })
    }

    /// The strongest single lever and the main source of ensemble diversity,
    /// so it is worth naming rather than leaving implicit.
    pub fn lookback_multiplier(&self) -> f64 {
        self.lookback.0 as f64 / self.horizon.0 as f64
    }
}

/// Owns its weights, bases and scratch: a repeated forward pass allocates
/// nothing and the bases are never rebuilt.
pub struct Block {
    config: StackConfig,
    trunk: Vec<Vec<f64>>,
    trunk_bias: Vec<Vec<f64>>,
    /// ONE head whose columns are backcast coefficients followed by forecast
    /// coefficients, so the trunk output is read once rather than twice.
    head: Vec<f64>,
    backcast_basis: Vec<f64>,
    forecast_basis: Vec<f64>,
    backcast_coefficients: usize,
    forecast_coefficients: usize,
    hidden: Vec<f64>,
    scratch: Vec<f64>,
    theta: Vec<f64>,
}

impl Block {
    pub fn new(config: StackConfig, backcast: BasisSpec, forecast: BasisSpec) -> Self {
        let backcast_coefficients = backcast.coefficient_count(config.lookback.0);
        let forecast_coefficients = forecast.coefficient_count(config.horizon.0);

        let mut trunk = Vec::with_capacity(config.layers);
        let mut trunk_bias = Vec::with_capacity(config.layers);
        let mut width = config.lookback.0;
        for _ in 0..config.layers {
            trunk.push(vec![0.0; width * config.hidden.0]);
            trunk_bias.push(vec![0.0; config.hidden.0]);
            width = config.hidden.0;
        }

        let theta_width = backcast_coefficients + forecast_coefficients;
        Self {
            config,
            trunk,
            trunk_bias,
            head: vec![0.0; width * theta_width],
            backcast_basis: backcast.build(config.lookback.0),
            forecast_basis: forecast.build(config.horizon.0),
            backcast_coefficients,
            forecast_coefficients,
            hidden: vec![0.0; config.hidden.0],
            scratch: vec![0.0; config.hidden.0],
            theta: vec![0.0; theta_width],
        }
    }

    pub fn forward(
        &mut self,
        window: &[f64],
        backcast: &mut [f64],
        forecast: &mut [f64],
    ) -> Result<(), NbeatsError> {
        if window.len() != self.config.lookback.0 {
            return Err(NbeatsError::ShapeMismatch {
                expected: self.config.lookback.0,
                found: window.len(),
            });
        }

        let mut input: &[f64] = window;
        let mut in_width = self.config.lookback.0;
        for layer in 0..self.config.layers {
            dense(&self.trunk[layer], &self.trunk_bias[layer], input, in_width, &mut self.scratch);
            for value in self.scratch.iter_mut() {
                *value = value.max(0.0);
            }
            std::mem::swap(&mut self.hidden, &mut self.scratch);
            input = &self.hidden;
            in_width = self.config.hidden.0;
        }

        dense(&self.head, &[], &self.hidden, self.config.hidden.0, &mut self.theta);
        project(&self.backcast_basis, &self.theta[..self.backcast_coefficients], backcast);
        project(&self.forecast_basis, &self.theta[self.backcast_coefficients..], forecast);
        let _ = self.forecast_coefficients;
        Ok(())
    }
}

fn dense(weight: &[f64], bias: &[f64], input: &[f64], in_width: usize, out: &mut [f64]) {
    let out_width = weight.len() / in_width;
    if bias.is_empty() {
        out[..out_width].fill(0.0);
    } else {
        out[..out_width].copy_from_slice(bias);
    }
    for (j, &value) in input.iter().enumerate().take(in_width) {
        if value == 0.0 {
            continue;
        }
        let row = &weight[j * out_width..(j + 1) * out_width];
        for (accumulator, &w) in out.iter_mut().zip(row) {
            *accumulator += value * w;
        }
    }
}

fn project(basis: &[f64], theta: &[f64], out: &mut [f64]) {
    let columns = theta.len();
    for (index, target) in out.iter_mut().enumerate() {
        let row = &basis[index * columns..(index + 1) * columns];
        *target = row.iter().zip(theta).map(|(b, t)| b * t).sum();
    }
}

/// Forecast plus the residual norm after each block.
///
/// The norms come back deliberately: a block whose incoming residual is
/// already near zero costs parameters and inference time and learns nothing,
/// and that is invisible unless it is measured.
pub struct ResidualTrace {
    pub forecast: Vec<f64>,
    pub residual_norms: Vec<f64>,
}

pub fn forward(
    window: &[f64],
    blocks: &mut [Block],
    config: StackConfig,
) -> Result<ResidualTrace, NbeatsError> {
    let mut residual = window.to_vec();
    let mut total = vec![0.0; config.horizon.0];
    let mut backcast = vec![0.0; config.lookback.0];
    let mut forecast = vec![0.0; config.horizon.0];
    let mut norms = Vec::with_capacity(blocks.len());

    for block in blocks.iter_mut() {
        block.forward(&residual, &mut backcast, &mut forecast)?;
        for (value, &delta) in residual.iter_mut().zip(backcast.iter()) {
            *value -= delta;
        }
        for (value, &delta) in total.iter_mut().zip(forecast.iter()) {
            *value += delta;
        }
        norms.push(residual.iter().map(|v| v * v).sum::<f64>().sqrt());
    }

    Ok(ResidualTrace { forecast: total, residual_norms: norms })
}

/// Mean absolute scaled error, with both degenerate cases refused.
pub fn mase(
    forecast: &[f64],
    actual: &[f64],
    history: &[f64],
    seasonal_period: usize,
) -> Result<f64, NbeatsError> {
    if history.len() <= seasonal_period {
        return Err(NbeatsError::InsufficientHistory {
            have: history.len(),
            need: seasonal_period + 1,
        });
    }

    let denominator = history
        .windows(seasonal_period + 1)
        .map(|window| (window[seasonal_period] - window[0]).abs())
        .sum::<f64>()
        / (history.len() - seasonal_period) as f64;
    if denominator == 0.0 {
        return Err(NbeatsError::ConstantHistory);
    }

    let numerator = forecast
        .iter()
        .zip(actual)
        .map(|(f, a)| (f - a).abs())
        .sum::<f64>()
        / forecast.len() as f64;

    Ok(numerator / denominator)
}

/// The fixed lookback is structural: a series shorter than it is not
/// forecastable by this architecture at all.
pub fn window_or_fail<'a>(
    series: &'a [f64],
    config: StackConfig,
) -> Result<&'a [f64], NbeatsError> {
    if series.len() < config.lookback.0 {
        return Err(NbeatsError::InsufficientHistory {
            have: series.len(),
            need: config.lookback.0,
        });
    }
    Ok(&series[series.len() - config.lookback.0..])
}
`,
        rationale:
          'Two changes carry the weight. The basis matrices depend only on the length and the spec, so they are built once at construction and stored flat rather than regenerated on every forward pass — on a 500-step lookback with a generic basis that alone was a quarter-million element allocation per block per call. Making the basis an immutable validated enum rather than loose arguments reflects what it is: a structural prior, not a tunable. The other change is refusing the failures that produce plausible nonsense. A polynomial degree above four fits history beautifully and extrapolates absurdly with nothing in the loss to penalize it, so the constructor refuses it; a series shorter than the fixed lookback is not forecastable at all, and the error variant names the specific correct response, which is a naive fallback for that series; a constant history gives MASE a zero denominator that would otherwise become an infinity silently poisoning a batch average. Both coefficient heads merge into one weight so the trunk output is read once, storage flattens so every row is a contiguous slice, hidden buffers are swapped rather than reallocated per layer, and the forward pass returns per-block residual norms because depth that has stopped paying is otherwise invisible.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same asymptotics with the basis construction hoisted out of the hot path and no per-call allocation anywhere. Illustrative, not a measured benchmark: flat storage also turns each dense pass into a stride-one walk with the bounds check hoisted out.',
      },

      'make-it-fast': {
        code: `//! Batched, and the whole stack is matrix products. Nothing is sequential.
//!
//! The structural observation: N-BEATS has no recurrence and no attention, so
//! every layer is a dense product and the only ordering constraint is between
//! blocks. That makes it the easiest forecaster in this reference to
//! accelerate, and it is why an ensemble of thirty models is affordable.
//!
//! Three changes:
//!   1. The trunk, the merged head and both basis projections become GEMMs
//!      over the whole batch. The bases are CONSTANTS, built once.
//!   2. The two heads share one product: their coefficients are adjacent
//!      columns of a single weight, so the trunk output is read once.
//!   3. Ensemble members sharing a shape are stacked into a leading axis, so
//!      every member advances in one batched product rather than a loop -
//!      which turns a thirty-model ensemble into the default configuration.

use ndarray::{s, Array2, Array3, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Constant basis matrices, built once at startup in f32 row-major.
pub fn build_trend_basis(length: usize, degree: usize) -> Array2<f32> {
    let mut basis = Array2::<f32>::zeros((length, degree + 1));
    for t in 0..length {
        let normalized = t as f32 / length as f32;
        let mut power = 1.0f32;
        for p in 0..=degree {
            basis[[t, p]] = power;
            power *= normalized;
        }
    }
    basis
}

pub fn build_seasonality_basis(length: usize, harmonics: usize) -> Array2<f32> {
    let mut basis = Array2::<f32>::zeros((length, 2 * harmonics));
    for t in 0..length {
        for h in 1..=harmonics {
            let angle =
                2.0 * std::f32::consts::PI * h as f32 * t as f32 / length as f32;
            basis[[t, 2 * (h - 1)]] = angle.cos();
            basis[[t, 2 * (h - 1) + 1]] = angle.sin();
        }
    }
    basis
}

/// One block, evaluated for a whole batch at once.
///
/// The bases are stored as contiguous constants, so a basis projection is a
/// GEMM against a fixed matrix - the cheapest possible way to impose the
/// structural prior, and a good reason to prefer this form over generating
/// the output values directly.
pub struct BatchedBlock {
    trunk: Vec<Array2<f32>>,
    trunk_bias: Vec<Vec<f32>>,
    /// Columns are backcast coefficients followed by forecast coefficients.
    head: Array2<f32>,
    backcast_basis: Array2<f32>,
    forecast_basis: Array2<f32>,
    split: usize,
}

impl BatchedBlock {
    pub fn new(
        trunk: Vec<Array2<f32>>,
        trunk_bias: Vec<Vec<f32>>,
        head: Array2<f32>,
        backcast_basis: Array2<f32>,
        forecast_basis: Array2<f32>,
    ) -> Self {
        let split = backcast_basis.shape()[1];
        Self { trunk, trunk_bias, head, backcast_basis, forecast_basis, split }
    }

    /// \`window\` is (rows, lookback). Returns (backcast, forecast).
    pub fn forward(&self, window: ArrayView2<'_, f32>) -> (Array2<f32>, Array2<f32>) {
        let mut hidden = window.dot(&self.trunk[0]);

        for (layer, weight) in self.trunk.iter().enumerate() {
            if layer > 0 {
                hidden = hidden.dot(weight);
            }
            let bias = &self.trunk_bias[layer];
            // Fused bias and in-place ReLU: the pre-activation is never a
            // separate buffer, and the trunk is the widest tensor here.
            Zip::from(hidden.axis_iter_mut(Axis(0)))
                .par_for_each(|mut row| {
                    for (value, &b) in row.iter_mut().zip(bias) {
                        let shifted = *value + b;
                        *value = if shifted > 0.0 { shifted } else { 0.0 };
                    }
                });
        }

        let theta = hidden.dot(&self.head);
        let backcast = theta.slice(s![.., ..self.split]).dot(&self.backcast_basis.t());
        let forecast = theta.slice(s![.., self.split..]).dot(&self.forecast_basis.t());
        (backcast, forecast)
    }
}

/// Doubly residual stacking. Both recursions run in place.
///
/// Returns the summed forecast and the per-block residual norms, which are
/// the diagnostic for depth that has stopped paying.
pub fn stack_forward(
    window: ArrayView2<'_, f32>,
    blocks: &[BatchedBlock],
    horizon: usize,
) -> (Array2<f32>, Array2<f32>) {
    let rows = window.shape()[0];
    let mut residual = window.to_owned();
    let mut total = Array2::<f32>::zeros((rows, horizon));
    // Capacity known exactly: one allocation for the whole diagnostic.
    let mut norms = Array2::<f32>::zeros((blocks.len(), rows));

    for (index, block) in blocks.iter().enumerate() {
        let (backcast, forecast) = block.forward(residual.view());
        // Both recursions in place: the residual shrinks and the forecast
        // accumulates without either allocating per block.
        residual -= &backcast;
        total += &forecast;

        Zip::from(norms.row_mut(index))
            .and(residual.axis_iter(Axis(0)))
            .par_for_each(|slot, row| {
                *slot = row.iter().map(|v| v * v).sum::<f32>().sqrt();
            });
    }

    (total, norms)
}

/// One layer of every ensemble member at once.
///
/// \`windows\` is (members, rows, lookback), \`trunk\` is
/// (members, lookback, hidden). Members that share a shape advance in a
/// single batched product rather than a loop over models - which is what
/// turns a thirty-model ensemble from a luxury into the default.
pub fn ensemble_layer(
    windows: &Array3<f32>,
    trunk: &Array3<f32>,
    bias: &Array2<f32>,
) -> Array3<f32> {
    let members = windows.shape()[0];
    let rows = windows.shape()[1];
    let hidden = trunk.shape()[2];
    let mut out = Array3::<f32>::zeros((members, rows, hidden));

    // Members are entirely independent, so this is a parallel map with no
    // reduction and no shared mutable state.
    out.axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(member, mut target)| {
            target.assign(&windows.index_axis(Axis(0), member)
                .dot(&trunk.index_axis(Axis(0), member)));
            let member_bias = bias.row(member);
            for mut row in target.axis_iter_mut(Axis(0)) {
                for (value, &b) in row.iter_mut().zip(member_bias.iter()) {
                    let shifted = *value + b;
                    *value = if shifted > 0.0 { shifted } else { 0.0 };
                }
            }
        });

    out
}

/// Per-series MASE, vectorized over the batch.
pub fn batch_mase(
    forecasts: ArrayView2<'_, f32>,
    actuals: ArrayView2<'_, f32>,
    histories: ArrayView2<'_, f32>,
    seasonal_period: usize,
) -> Vec<f32> {
    (0..forecasts.shape()[0])
        .into_par_iter()
        .map(|row| {
            let history = histories.row(row);
            let length = history.len();
            let denominator: f32 = (seasonal_period..length)
                .map(|i| (history[i] - history[i - seasonal_period]).abs())
                .sum::<f32>()
                / (length - seasonal_period) as f32;

            // A constant series gives a zero denominator, which would be an
            // infinity that silently poisons the batch average.
            if denominator == 0.0 {
                return 0.0;
            }

            let numerator: f32 = forecasts
                .row(row)
                .iter()
                .zip(actuals.row(row).iter())
                .map(|(f, a)| (f - a).abs())
                .sum::<f32>()
                / forecasts.shape()[1] as f32;
            numerator / denominator
        })
        .collect()
}

/// Disagreement across ensemble members, as a free uncertainty proxy.
///
/// The model emits no interval, but a thirty-member ensemble already contains
/// one. It is not calibrated and must not be presented as a predictive
/// distribution - but it is a genuinely useful drift signal.
pub fn ensemble_spread(members: &Array3<f32>) -> Array2<f32> {
    let count = members.shape()[0] as f32;
    let mean = members.sum_axis(Axis(0)) / count;
    let mut variance = Array2::<f32>::zeros(mean.raw_dim());
    for member in members.axis_iter(Axis(0)) {
        let centred = &member - &mean;
        variance += &(&centred * &centred);
    }
    variance.mapv_into(|value| (value / count).sqrt())
}
`,
        rationale:
          'The structural point is that N-BEATS has nothing sequential in it, so every layer is a dense product and the only ordering constraint is between blocks — which makes it the easiest forecaster here to accelerate and explains why a thirty-model ensemble is affordable at all. The basis matrices are constants of the geometry, built once, so each projection is a product against a fixed contiguous operand: the cheapest possible way to impose the structural prior. The two coefficient heads merge into one weight whose columns are adjacent, so the trunk output is read once rather than twice for identical arithmetic, and bias and ReLU fuse into one parallel pass so the pre-activation is never a separate buffer. Both residual recursions run in place, so neither the shrinking input nor the accumulating forecast allocates per block. The ensemble is the largest change: members sharing a shape are stacked into a leading axis and advance as independent parallel products rather than a loop over models. The per-block residual norms and the ensemble spread are computed rather than discarded, since one diagnoses depth that has stopped paying and the other is the only uncertainty signal this architecture offers.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Every trunk layer, the merged head and both basis projections are dense products dispatching straight to sgemm on contiguous f32 operands.',
            tradeoff: 'Binds the build to a system BLAS, and the generic basis is an identity matrix, so projecting through it is a full GEMM that computes nothing — real waste only a special case would avoid.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Ensemble members, the fused bias-ReLU pass, the residual norms and the per-series MASE are all independent with no shared writes.',
            tradeoff: 'These passes are memory-bound rather than compute-bound, so parallelizing them competes for bandwidth with the BLAS calls around them and can slow the whole block when both are threaded.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Bases and weights are standard-layout f32 arrays and the theta split is a contiguous column slice, so every product sees a dense operand rather than a strided view.',
            tradeoff: 'The theta slice for the forecast half is contiguous only because the two coefficient blocks are adjacent — reordering the head columns for any reason silently turns that product into a strided copy.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The residual-norm diagnostic and the per-series MASE results have exactly known lengths, so collecting them never reallocates.',
            tradeoff: 'Every ensemble member must share a shape to stack, which forbids exactly the lookback diversity the ensemble depends on for its gain — so members are grouped by lookback and the batching is only within a group.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'The whole stack becomes a handful of products per block for the entire batch, with no sequential dependency anywhere. Illustrative, not a measured benchmark: this saturates BLAS readily, which is precisely why an ensemble that would be prohibitive for a recurrent forecaster is routine here.',
      },
    },
  },
};
