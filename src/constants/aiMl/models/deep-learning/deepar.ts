import type { AiMlModel } from '../../types';

/**
 * DeepAR — the forecaster that is honestly a likelihood model.
 *
 * Included because it makes the distinction between a point forecast and a
 * probabilistic one architectural rather than cosmetic: the network emits
 * distribution PARAMETERS, the loss is a log-likelihood, and the forecast is
 * a set of sampled trajectories rather than a curve.
 */
export const DEEPAR: AiMlModel = {
  slug: 'deepar',
  name: 'DeepAR',
  aliases: ['DeepAR', 'Autoregressive RNN forecaster', 'Probabilistic global forecaster'],
  category: 'deep-learning',
  group: 'forecasting-native',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'sequence-modeling', 'density-estimation', 'anomaly-detection'],
  architecture: 'lstm-gru',
  paradigmNote:
    'Supervised in the ordinary sense, but the target is a distribution rather than a value: the network outputs likelihood parameters and is trained by maximum likelihood, which is why density-estimation belongs in its task types alongside regression. That framing is the whole point of the model and is what separates it from every point forecaster in this category.',

  intuition:
    'Instead of predicting tomorrow’s demand, predict the parameters of a distribution over tomorrow’s demand — a mean and a shape — and train by maximizing the likelihood of what actually happened. To forecast further than one step, sample a value from that distribution, feed it back as the next input, and continue; do that a few hundred times and you have a cloud of possible futures. Any quantile you need is then just a percentile of those trajectories, and crucially the uncertainty compounds correctly across the horizon because each step’s sample genuinely conditions the next.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\mathcal{L}(\\theta) = -\\sum_{i=1}^{n}\\sum_{t=t_0}^{T} \\log \\ell\\bigl(y_{i,t} \\mid \\boldsymbol{\\eta}(\\mathbf{h}_{i,t})\\bigr), \\qquad \\mathbf{h}_{i,t} = f_\\theta\\bigl(\\mathbf{h}_{i,t-1},\\, y_{i,t-1},\\, \\mathbf{x}_{i,t}\\bigr)',
      symbols: [
        { symbol: '\\ell', meaning: 'the chosen likelihood — Gaussian for real values, negative binomial for counts; a modelling decision, not a default' },
        { symbol: '\\boldsymbol{\\eta}', meaning: 'the distribution parameters the network emits, one set per timestep' },
        { symbol: '\\mathbf{h}_{i,t}', meaning: 'the recurrent state; the entire memory of the series so far' },
        { symbol: 'y_{i,t-1}', meaning: 'the previous observation fed back as input — teacher-forced in training, sampled at inference' },
        { symbol: '\\mathbf{x}_{i,t}', meaning: 'covariates, which must be known for the whole horizon since the decoder consumes them' },
      ],
    },
    reading:
      'A plain negative log-likelihood, and the substance is entirely in which likelihood you chose. Gaussian gives you a mean and a standard deviation and permits negative values, which for demand data is wrong in a way that quietly ruins the lower quantiles. Negative binomial handles counts with overdispersion, which is what retail demand actually looks like. The second thing to notice is the feedback term: the model conditions on the previous observation, which is what makes it autoregressive and is also the source of its characteristic failure — during training that input is the true value, and at inference it is the model’s own sample.',
  },

  optimization: {
    method: 'Adam on the negative log-likelihood with teacher forcing, then ancestral sampling at inference',
    updateRule: {
      formula:
        '\\mu_t = \\nu_i\\cdot\\mathbf{w}_\\mu^\\top\\mathbf{h}_t, \\quad \\sigma_t = \\nu_i\\cdot\\log\\bigl(1+e^{\\mathbf{w}_\\sigma^\\top\\mathbf{h}_t}\\bigr), \\qquad \\nu_i = 1 + \\frac{1}{t_0}\\sum_{t=1}^{t_0} y_{i,t}',
      symbols: [
        { symbol: '\\nu_i', meaning: 'the per-series scale factor: the mean of its own history. The single most important detail in the model' },
        { symbol: '\\mu_t, \\sigma_t', meaning: 'emitted distribution parameters, both multiplied by the scale so the network works in normalized space' },
        { symbol: '\\log(1+e^{x})', meaning: 'softplus, guaranteeing a positive scale parameter — a hard constraint the architecture must enforce' },
        { symbol: '\\mathbf{w}_\\mu, \\mathbf{w}_\\sigma', meaning: 'the projection heads; everything else is shared across every series in the panel' },
      ],
    },
    rationale:
      'The scale handling is the detail that makes a global model work at all, and it is easy to underrate. Real panels span many orders of magnitude — a warehouse item selling three units a week alongside one selling thirty thousand — and if the network has to represent that range directly, the large series dominate the gradient and the small ones are noise. Dividing the input by the series mean and multiplying the emitted parameters back by it means the network only ever sees normalized values, and the same trick is used to weight sampling so that high-volume series are not over-represented in the batches. Beyond that the training is ordinary: teacher forcing, so the recurrence is unrolled against true observations and the whole sequence is one parallel graph. Inference is where the cost appears, since each of a few hundred sample paths must be rolled forward step by step.',
    hyperparameters: [
      { name: 'likelihood family', role: 'Gaussian, negative binomial or Student-t. A modelling decision that determines whether the lower quantiles are even coherent', typicalRange: 'Gaussian / negative binomial' },
      { name: 'hidden size', role: 'Recurrent state width; the dominant capacity and cost lever', typicalRange: '30 to 120' },
      { name: 'layers', role: 'Stacked recurrence; rarely worth more than two or three', typicalRange: '1 to 3' },
      { name: 'context length', role: 'History used to warm the state before the forecast window begins', typicalRange: '1 to 3 seasonal cycles' },
      { name: 'sample paths', role: 'Trajectories drawn at inference. Too few and the tail quantiles are pure noise', typicalRange: '100 to 1000' },
      { name: 'scaling strategy', role: 'Mean-scaling by default; the choice that makes a global model across mixed magnitudes viable at all', typicalRange: 'mean / none' },
      { name: 'gradient clip norm', role: 'The recurrence still explodes without it, likelihood loss notwithstanding', typicalRange: '1.0 to 10.0' },
    ],
    convergence:
      'Trains stably with teacher forcing and clipping, but carries three characteristic failures that are all about the likelihood rather than the optimizer. The first is exposure bias, which is structural: training always conditions on true observations while inference conditions on the model’s own samples, so an early mistake puts the recurrence in a state it never saw during training and the error compounds across the horizon. The second is a misspecified likelihood, where a Gaussian head on count data produces negative lower quantiles and an intermittent-demand series gets a confidently wrong interval — the loss will look fine throughout. The third is a variance collapse in which the softplus scale head drifts toward zero because a narrow distribution scores well on easy steps, giving over-confident intervals that only calibration testing reveals. None of these shows up in the training curve.',
    complexity:
      'O(T · H²) for training, sequential in time and parallel across the batch. Inference is O(S · H · H²) for S sample paths rolled forward step by step, which is the dominant operational cost and roughly two orders of magnitude more expensive than a point forecaster emitting the horizon in one pass.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Train one global recurrent model across the whole panel, conditioning each step on the previous observation and on covariates, and emit likelihood parameters rather than values. At inference, roll the recurrence forward drawing a sample at each step and feeding it back, repeat a few hundred times, and read any quantile off the resulting trajectory cloud.',
        where: [
          'Retail and supply-chain demand forecasting across large catalogues, which is what it was built for',
          'Intermittent and count-valued demand, where a negative binomial head is the correct model and a Gaussian one is not',
          'Cold-start forecasting for new items, where static categorical embeddings let a new SKU borrow its category’s learned dynamics',
          'Any setting needing the joint distribution over the horizon rather than marginal quantiles — cumulative demand over a lead time, for instance',
        ],
        why: 'Two genuine advantages over quantile regression. It models counts properly, which matters enormously in retail where a Gaussian interval on a slow-moving item is not merely imprecise but incoherent. And because trajectories are sampled autoregressively, the horizon quantiles are jointly consistent — the distribution of total demand over a two-week lead time is directly available, which a model emitting independent marginal quantiles per horizon cannot give you. Against it: sampling makes inference two orders of magnitude more expensive; the likelihood choice is a real modelling commitment that is wrong by default on count data; and exposure bias means long horizons degrade in a way the training loss never reveals. On a single series it loses to exponential smoothing as usual.',
        featurization: [
          'Scale each series by its own mean and let the network work in normalized space — this is what makes one model span six orders of magnitude',
          'Choose the likelihood to match the data: negative binomial for counts, Gaussian only for genuinely continuous quantities',
          'Weight the sampling of training windows by series scale, or high-volume series dominate the batches',
          'Encode item and category identity as static embeddings, which is the mechanism behind the cold-start behaviour',
          'Ensure covariates are available for the whole horizon, since the decoder consumes them at every sampled step',
        ],
        evaluation:
          'Weighted quantile loss across levels, plus coverage of the nominal intervals on held-out data, with rolling-origin backtesting. Calibration is the metric that matters here and it is separate from accuracy: an over-confident model can have excellent median error and cause systematic stockouts. Report the number of sample paths alongside any quantile, since a tail quantile from a hundred paths is mostly noise.',
        pitfalls: [
          'A Gaussian likelihood on count data, giving negative lower quantiles that are silently meaningless',
          'Too few sample paths, making tail quantiles unstable between runs of the same model',
          'Exposure bias degrading long horizons with no signal in the training loss',
          'Forgetting that scaling is part of the model, so refitting it at inference changes every forecast',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'The model gives a full predictive distribution at every step, so the anomaly score is the exact quantity you want: the likelihood of the observation under it, or equivalently its position in the predicted CDF. That is more principled than a residual threshold, because it accounts for the fact that a large deviation on a volatile series is unremarkable while a small one on a stable series is not.',
        where: [
          'Demand and inventory monitoring, distinguishing a genuine spike from ordinary volatility on a noisy item',
          'Count-valued metric monitoring where a Gaussian assumption would produce nonsense thresholds',
          'Multi-step anomaly detection using the joint trajectory distribution rather than a per-step threshold',
          'Monitoring across a large panel with heterogeneous scales, where a shared threshold is meaningless and a likelihood is comparable',
        ],
        why: 'A likelihood is a better anomaly score than a residual for a specific and defensible reason: it is already normalized by predicted uncertainty, so scores are comparable across series of different volatility without any per-series calibration. On count data the negative binomial tail is also genuinely right, where a Gaussian threshold over-alarms on low-volume items. The honest caveats are that the model optimizes forecast likelihood and nothing about anomalies, so a well-modelled recurring anomaly is simply absorbed into the distribution; that a misspecified likelihood makes every score wrong in a way nothing surfaces; and that sampling cost makes this a batch detector rather than a streaming one.',
        featurization: [
          'Score by predictive log-likelihood or CDF position rather than by raw residual, which is the whole advantage here',
          'Verify the likelihood family against the data before trusting any score — a wrong family makes every score wrong uniformly',
          'Use enough sample paths that the tail of the predictive distribution is estimated rather than guessed',
          'Exclude known event periods from training, or the model learns them as part of normal and stops flagging them',
        ],
        evaluation:
          'Precision and recall on labelled incidents with a detection window, plus a calibration check on known-normal data — if the nominal 1st percentile fires far more often than one percent of the time, the detector’s false-positive rate is untethered from its threshold and precision-recall alone will not show it.',
        pitfalls: [
          'A misspecified likelihood making every score wrong with nothing to indicate it',
          'Variance collapse producing over-confident intervals and therefore over-alarming',
          'Sampling cost making per-step streaming detection impractical',
          'Recurring anomalies being absorbed into the learned distribution and ceasing to be anomalies at all',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'Sampled trajectories are exactly what a stochastic program consumes. Rather than plugging point forecasts or marginal quantiles into a deterministic optimizer, the sample paths become scenarios in a scenario-based stochastic optimization — inventory over a lead time, capacity over a shift pattern — and because the paths are jointly sampled they preserve the temporal correlation that independent marginal quantiles destroy.',
        where: [
          'Scenario-based stochastic programming for inventory and replenishment, with sampled paths as the scenario set',
          'Lead-time demand aggregation, where the distribution of a SUM over the horizon is needed and marginals cannot give it',
          'Service-level and safety-stock setting directly from the predictive distribution rather than from an assumed error model',
          'Chance-constrained planning, where the constraint is on a probability the sample paths estimate directly',
        ],
        why: 'The joint-versus-marginal distinction is the point and it is routinely missed. Total demand over a ten-day lead time is not the sum of ten marginal medians, and its distribution depends on the correlation between days — which sampled trajectories capture and independent quantile forecasts cannot. For any decision aggregating over time, that difference is large and usually in the unsafe direction. The limits are computational and statistical: a few hundred paths estimate the body of the distribution well and the far tail poorly, and the optimization on top has to be scenario-based, which is a substantially heavier apparatus than a closed-form fractile.',
        featurization: [
          'Draw enough paths that the quantile the decision actually uses is estimated stably, and check that by re-running with a different seed',
          'Aggregate over the horizon within each path before taking quantiles, never the reverse — that ordering is the entire joint-distribution advantage',
          'Match the likelihood family to the decision variable, since an incoherent lower tail produces an infeasible plan',
          'Persist the sample paths rather than just their quantiles if a downstream optimizer needs scenarios',
        ],
        evaluation:
          'Realized decision cost against the hindsight optimum, and separately the coverage of the aggregated quantity rather than of the per-step marginals — aggregated coverage is what the decision depends on and it can be badly wrong while the per-step numbers look fine.',
        pitfalls: [
          'Summing marginal quantiles across the horizon, which is wrong whenever steps are correlated and is the standard error',
          'Too few paths for the tail the decision uses, giving a plan that changes between runs',
          'Treating sampled scenarios as exhaustive when the far tail is barely sampled at all',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'The sampled trajectory cloud feeds an operational plan directly as a scenario set: replenishment, staffing and dispatch decisions are made against the paths rather than against a point, and service levels come out as probabilities the paths estimate.',
        where: [
          'Replenishment and inventory planning against a sampled lead-time demand distribution',
          'Workforce scheduling where the cost of under- and over-staffing differ and the decision spans several periods',
          'Capacity reservation under a chance constraint estimated from sample paths',
        ],
        why: 'The pairing is natural because operational decisions aggregate over time and the model produces jointly consistent trajectories, which is exactly what that aggregation needs. The operational objections are real: inference cost is orders of magnitude above a point forecaster, which matters when the panel is large and the planning cycle is short, and the plan changes the system so the model is trained on operations the deployment then alters. Neither is fatal, but both should be sized before committing.',
        featurization: [
          'Match the sampled horizon to the decision lead time exactly, since paths are rolled step by step and extra horizon is extra cost',
          'Feed planned actions as covariates where known, or the model attributes their effect to something else',
          'Budget inference explicitly — hundreds of paths across a large panel is the dominant serving cost and it is easy to under-plan',
        ],
        evaluation:
          'Regret against the hindsight-optimal plan plus realized service level against target. Forecast likelihood is a diagnostic here, not the objective.',
        pitfalls: [
          'Sampling cost breaking the planning cycle on a large panel',
          'The plan shifting the distribution the model was trained on, which backtesting cannot reveal',
          'Exposure bias degrading exactly the long horizons that planning depends on',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Applied to risk aggregates rather than to individual events: forecasting claim counts, transaction volumes or loss frequencies where the tail of the predictive distribution drives a reserve or capacity decision, and where count data makes the negative binomial head the correct choice.',
        where: [
          'Claim and loss frequency forecasting for reserving, where counts and overdispersion are the norm',
          'Transaction volume forecasting for fraud-review capacity, where the upper tail sizes the team',
          'Operational loss-event forecasting, where the quantity is a count and the decision is a buffer',
        ],
        why: 'Count-valued risk aggregates are exactly where a negative binomial likelihood earns its place, and the sampled joint distribution over a reserving period is the right object for a reserve decision. But this is aggregate forecasting and not entity-level risk scoring: the model has no notion of an individual claim or transaction and must never be pointed at one. It also estimates far tails poorly from a few hundred paths, which is awkward precisely where risk work lives.',
        featurization: [
          'Use a count likelihood; a Gaussian one on claim counts produces negative reserves at the lower quantiles',
          'Forecast at the level the reserve decision is made at, since entity-level noise swamps the signal',
          'Draw substantially more paths than the default when a far tail quantile drives the decision',
        ],
        evaluation:
          'Quantile loss at the decision-relevant levels plus empirical exceedance against nominal, backtested strictly by time. A reserving model validated on a random split is meaningless.',
        pitfalls: [
          'Mistaking aggregate forecasting for entity-level risk scoring, which this cannot do',
          'Estimating a far tail from too few sample paths, giving a reserve that moves with the seed',
          'A regime change invalidating the learned dynamics with no warning in the likelihood',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on a single GPU for a large panel. The recurrence is sequential in time so it parallelizes across series but not across steps, and teacher forcing means the whole training sequence is one graph — training is comfortably cheaper than inference here, which is unusual.',
    inferenceProfile:
      'The expensive half, and by a wide margin. Each sample path is rolled forward one step at a time with a draw at every step, so a few hundred paths over a fourteen-step horizon is thousands of sequential recurrent steps per series. Two orders of magnitude above a point forecaster, and the single most under-planned line item when this model is adopted.',
    retrainingCadence:
      'Monthly to quarterly, and immediately when the catalogue changes materially, since static embeddings are indexed by item and category identity.',
    driftAndMonitoring: [
      'Track interval coverage against nominal per quantile; drifting coverage precedes accuracy degradation and is the earliest signal available',
      'Watch the emitted scale parameter for a downward drift, which is variance collapse and shows as over-confidence rather than as error',
      'Monitor error by horizon separately — exposure bias degrades the far horizons first and the aggregate hides it entirely',
      'Alert on series whose scale factor has shifted materially since training, since the normalization they were fitted under no longer holds',
    ],
    productionGotchas: [
      'Per-series scale factors are part of the model artifact. Recomputing them at inference from a different window silently changes every forecast',
      'Sampling is stochastic, so the same input gives different quantiles on different runs. The seed must be pinned for reproducibility and the path count logged with every forecast',
      'The likelihood family is baked in. Switching from Gaussian to negative binomial is a retrain, not a configuration change',
      'Covariates must be available for the full horizon at every sampled step; a missing one does not fail, it produces a confident forecast built on defaults',
      'A new item with no static embedding needs an explicit cold-start path — usually its category embedding — rather than a zero vector',
    ],
  },

  assumptions: [
    'The chosen likelihood family genuinely describes the data — the load-bearing assumption, and the one most often wrong on count data',
    'Series are comparable after scaling by their own mean, which is what allows a single global model across many orders of magnitude',
    'Enough related series exist to fit a shared model; on a single series this is the wrong tool by a wide margin',
    'Covariates are known across the whole forecast horizon, since the decoder consumes them at every sampled step',
    'The autoregressive feedback is stable enough that a sampled trajectory stays in a plausible region of state space for the whole horizon',
  ],

  pros: [
    {
      point: 'Probabilistic by construction, not by bolt-on',
      context:
        'The network emits distribution parameters and is trained by likelihood, so the uncertainty is modelled rather than assumed. Decisive wherever the decision needs a tail, and it is a genuinely different thing from fitting an error distribution around a point forecast.',
    },
    {
      point: 'Jointly consistent trajectories across the horizon',
      context:
        'Sampled paths preserve temporal correlation, so the distribution of a SUM over a lead time is directly available. Independent marginal quantiles cannot give this, and for any aggregating decision the difference is large and usually unsafe.',
    },
    {
      point: 'Count likelihoods handle intermittent demand properly',
      context:
        'A negative binomial head is the correct model for slow-moving retail items, where a Gaussian interval is not merely imprecise but incoherent — it puts mass on negative demand. This is where most of the practical advantage over quantile regression lies.',
    },
    {
      point: 'Mean-scaling makes one global model span the whole catalogue',
      context:
        'Normalizing by each series’ own mean lets a model cover six orders of magnitude without the large series dominating the gradient. An unglamorous detail that is the actual reason the approach works at scale.',
    },
    {
      point: 'Static embeddings give a usable cold start',
      context:
        'A new item inherits its category’s learned dynamics rather than having no forecast at all. Rare among forecasters and operationally valuable in a growing catalogue.',
    },
  ],

  cons: [
    {
      point: 'Inference is two orders of magnitude more expensive',
      context:
        'Hundreds of sample paths rolled step by step, against one forward pass for a point forecaster. The most consistently under-planned cost when this model is adopted, and it can dominate a serving budget entirely.',
    },
    {
      point: 'The likelihood family is a real modelling commitment',
      context:
        'Gaussian on count data gives negative lower quantiles and nothing in the training loss objects. Choosing it is a decision requiring knowledge of the data, and changing it later is a retrain.',
    },
    {
      point: 'Exposure bias degrades long horizons',
      context:
        'Training conditions on true values and inference on the model’s own samples, so an early error compounds. Structural to autoregressive decoding, invisible in the training loss, and it bites hardest at exactly the horizons planning depends on.',
    },
    {
      point: 'Forecasts are not reproducible without a pinned seed',
      context:
        'Sampling means the same input gives different quantiles each run. Manageable, but it surprises people and it makes debugging a specific bad forecast considerably harder.',
    },
    {
      point: 'Variance collapse is silent',
      context:
        'The scale head can drift toward zero because narrow distributions score well on easy steps, producing over-confident intervals. Only calibration monitoring catches it — accuracy metrics look fine throughout.',
    },
  ],

  relatedSlugs: ['n-beats', 'temporal-fusion-transformer', 'lstm', 'gaussian-process', 'arima'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DeepAR, transcribed the way the paper reads.

The model emits DISTRIBUTION PARAMETERS, not values:

    h_t    = LSTM(h_{t-1}, y_{t-1} / nu, x_t)      recurrent state
    mu_t   = nu * (w_mu . h_t)                      location
    sigma_t= nu * softplus(w_sigma . h_t)           scale, forced positive
    loss   = -log N(y_t | mu_t, sigma_t)            maximum likelihood

nu is the series' own mean. Dividing the input by it and multiplying the
outputs back is the unglamorous detail that lets one model span six orders of
magnitude - without it the large series dominate the gradient entirely.

Plain loops, one LSTM cell written out, Gaussian likelihood.
"""

import math
import random

SEED = 7


def sigmoid(value):
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def softplus(value):
    """log(1 + e^x), which is positive everywhere.

    The scale parameter of a distribution MUST be positive, and that is a
    hard constraint the architecture has to enforce rather than hope for.
    """
    if value > 30.0:
        return value  # e^x overflows and log1p(e^x) is x to full precision
    return math.log1p(math.exp(value))


def matvec(weight, vector, bias):
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def lstm_cell(inputs, hidden, cell, params):
    """One LSTM step. Four gates over the concatenated input and state."""
    joined = list(inputs) + list(hidden)

    forget = [sigmoid(v) for v in matvec(params['wf'], joined, params['bf'])]
    write = [sigmoid(v) for v in matvec(params['wi'], joined, params['bi'])]
    candidate = [math.tanh(v) for v in matvec(params['wc'], joined, params['bc'])]
    expose = [sigmoid(v) for v in matvec(params['wo'], joined, params['bo'])]

    new_cell = [f * c + i * g for f, c, i, g in zip(forget, cell, write, candidate)]
    new_hidden = [o * math.tanh(c) for o, c in zip(expose, new_cell)]
    return new_hidden, new_cell


def series_scale(history):
    """nu = 1 + mean(history). The plus one keeps an all-zero series usable."""
    return 1.0 + sum(history) / len(history)


def gaussian_log_likelihood(value, mu, sigma):
    """log N(value | mu, sigma). This IS the loss, negated."""
    z = (value - mu) / sigma
    return -0.5 * z * z - math.log(sigma) - 0.5 * math.log(2.0 * math.pi)


def negative_binomial_log_likelihood(count, mu, alpha):
    """The likelihood that is actually right for demand data.

    Gaussian on counts puts probability mass on negative demand, which makes
    every lower quantile meaningless. Nothing in the training loss objects to
    this - it simply produces a confidently incoherent interval.
    """
    shape = 1.0 / alpha
    return (
        math.lgamma(count + shape)
        - math.lgamma(shape)
        - math.lgamma(count + 1.0)
        + shape * math.log(shape / (shape + mu))
        + count * math.log(mu / (shape + mu))
    )


def train_sequence(history, covariates, params, scale):
    """Teacher forcing: the recurrence is unrolled against TRUE observations.

    That is what makes training one parallel graph - and it is also the
    source of exposure bias, because inference conditions on the model's own
    samples instead and the recurrence has never seen that state.
    """
    hidden = [0.0] * params['hidden_size']
    cell = [0.0] * params['hidden_size']
    total_log_likelihood = 0.0

    for t in range(1, len(history)):
        previous = history[t - 1] / scale
        inputs = [previous] + list(covariates[t])
        hidden, cell = lstm_cell(inputs, hidden, cell, params)

        mu = scale * sum(w * h for w, h in zip(params['w_mu'], hidden))
        sigma = scale * softplus(sum(w * h for w, h in zip(params['w_sigma'], hidden)))
        total_log_likelihood += gaussian_log_likelihood(history[t], mu, sigma)

    return -total_log_likelihood, hidden, cell


def sample_path(hidden, cell, last_value, future_covariates, params, scale, rng):
    """One trajectory: draw, feed back, repeat.

    This is the whole reason DeepAR gives a JOINT distribution over the
    horizon rather than independent per-step quantiles. Each step's sample
    genuinely conditions the next, so uncertainty compounds correctly.
    """
    path = []
    previous = last_value

    for t in range(len(future_covariates)):
        inputs = [previous / scale] + list(future_covariates[t])
        hidden, cell = lstm_cell(inputs, hidden, cell, params)

        mu = scale * sum(w * h for w, h in zip(params['w_mu'], hidden))
        sigma = scale * softplus(sum(w * h for w, h in zip(params['w_sigma'], hidden)))

        drawn = rng.gauss(mu, sigma)
        path.append(drawn)
        previous = drawn  # the sample becomes the next input

    return path


def forecast(history, covariates, future_covariates, params, num_paths=200):
    """Warm the state on history, then draw many trajectories."""
    rng = random.Random(SEED)
    scale = series_scale(history)

    _, hidden, cell = train_sequence(history, covariates, params, scale)

    return [
        sample_path(hidden, cell, history[-1], future_covariates, params, scale, rng)
        for _ in range(num_paths)
    ]


def quantile_from_paths(paths, horizon, level):
    """Any quantile is just a percentile of the sampled trajectories."""
    values = sorted(path[horizon] for path in paths)
    index = min(int(level * len(values)), len(values) - 1)
    return values[index]


def lead_time_quantile(paths, level):
    """The joint advantage, made concrete.

    Total demand over a lead time is NOT the sum of per-step medians. Summing
    WITHIN each path first and taking the quantile afterwards preserves the
    correlation between steps; the other order destroys it, and the error is
    usually in the unsafe direction.
    """
    totals = sorted(sum(path) for path in paths)
    index = min(int(level * len(totals)), len(totals) - 1)
    return totals[index]
`,
        profile:
          'O(T * H^2) for training and O(S * H_steps * H^2) for S sample paths at inference. Illustrative, not a measured benchmark: with 200 paths over a 14-step horizon that is 2,800 sequential cell evaluations per series, which is why inference rather than training is the operational cost here.',
      },

      'make-it-right': {
        code: `"""The same model, with the likelihood as a type and the scale as a contract.

Two things change. The likelihood family becomes a protocol with its own
parameter constraints and sampler, because choosing it is a modelling
decision rather than a flag - and a Gaussian head on count data produces
negative quantiles that nothing in the training loss objects to. And the
per-series scale becomes an object carried with the model, because
recomputing it at inference silently changes every forecast.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import NamedTuple, Protocol, Sequence


class ShapeMismatch(ValueError):
    """Raised on a shape violation instead of broadcasting past it."""


class LikelihoodMisspecified(ValueError):
    """Raised when the data cannot have come from the chosen family.

    Its own type because the failure is silent otherwise: a Gaussian head on
    count data trains happily and emits negative lower quantiles, and no
    metric in the training loop will mention it.
    """


class UnscaledSeries(ValueError):
    """Raised when a forecast is attempted without the fitted scale.

    The scale is part of the model artifact. Recomputing it at inference from
    a different window changes every forecast, with nothing logged.
    """


def softplus(value: float) -> float:
    """log(1 + e^x), positive everywhere, with the overflow branch.

    Above about 30 the exponential overflows while log1p(exp(x)) equals x to
    full double precision, so the branch is correctness rather than speed.
    """
    if value > 30.0:
        return value
    return math.log1p(math.exp(value))


class Likelihood(Protocol):
    """A distribution family the network emits parameters for.

    Made a protocol rather than an enum because each family owns three
    genuinely different things: how many parameters it needs, how to
    constrain them, and how to sample from it.
    """

    @property
    def parameter_count(self) -> int: ...

    def constrain(self, raw: Sequence[float], scale: float) -> tuple[float, ...]: ...

    def log_probability(self, value: float, parameters: tuple[float, ...]) -> float: ...

    def sample(self, parameters: tuple[float, ...], rng: random.Random) -> float: ...

    def validate_data(self, values: Sequence[float]) -> None: ...


@dataclass(frozen=True)
class Gaussian:
    """Correct for genuinely continuous quantities, and only those."""

    @property
    def parameter_count(self) -> int:
        return 2

    def constrain(self, raw: Sequence[float], scale: float) -> tuple[float, ...]:
        # Both parameters are multiplied back by the series scale, so the
        # network only ever works in normalized space.
        return scale * raw[0], scale * softplus(raw[1])

    def log_probability(self, value: float, parameters: tuple[float, ...]) -> float:
        mu, sigma = parameters
        z = (value - mu) / sigma
        return -0.5 * z * z - math.log(sigma) - 0.5 * math.log(2.0 * math.pi)

    def sample(self, parameters: tuple[float, ...], rng: random.Random) -> float:
        mu, sigma = parameters
        return rng.gauss(mu, sigma)

    def validate_data(self, values: Sequence[float]) -> None:
        """Guard clause for the failure with no other symptom."""
        if all(float(value).is_integer() and value >= 0.0 for value in values):
            raise LikelihoodMisspecified(
                'every observation is a non-negative integer; a Gaussian head will '
                'emit negative lower quantiles. Use NegativeBinomial.'
            )


@dataclass(frozen=True)
class NegativeBinomial:
    """The right choice for count and intermittent demand data."""

    @property
    def parameter_count(self) -> int:
        return 2

    def constrain(self, raw: Sequence[float], scale: float) -> tuple[float, ...]:
        # Mean scales with the series; dispersion does NOT, since it is a
        # shape parameter and scaling it would change the distribution family
        # rather than its location.
        return scale * softplus(raw[0]), softplus(raw[1])

    def log_probability(self, value: float, parameters: tuple[float, ...]) -> float:
        mu, alpha = parameters
        shape = 1.0 / alpha
        return (
            math.lgamma(value + shape)
            - math.lgamma(shape)
            - math.lgamma(value + 1.0)
            + shape * math.log(shape / (shape + mu))
            + value * math.log(mu / (shape + mu))
        )

    def sample(self, parameters: tuple[float, ...], rng: random.Random) -> float:
        # Gamma-Poisson mixture: the standard construction, and the reason
        # the family handles overdispersion that Poisson cannot.
        mu, alpha = parameters
        shape = 1.0 / alpha
        rate = rng.gammavariate(shape, mu / shape)
        return float(_poisson(rate, rng))

    def validate_data(self, values: Sequence[float]) -> None:
        if any(value < 0.0 for value in values):
            raise LikelihoodMisspecified('a count likelihood cannot model negative values')


def _poisson(rate: float, rng: random.Random) -> int:
    """Knuth's method. Fine for the small rates demand data produces."""
    threshold = math.exp(-rate)
    count, product = 0, 1.0
    while product > threshold:
        product *= rng.random()
        count += 1
        if count > 10_000:  # bounded: a huge rate would otherwise spin forever
            break
    return count - 1


@dataclass(frozen=True)
class SeriesScale:
    """The per-series normalizer, carried WITH the model.

    Frozen and explicit because recomputing it at inference from a different
    window silently changes every forecast, and that is one of the most
    common production errors with this model.
    """

    value: float

    @staticmethod
    def from_history(history: Sequence[float]) -> SeriesScale:
        if not history:
            raise ShapeMismatch('cannot scale an empty series')
        # The plus one keeps an all-zero series usable rather than dividing
        # by zero, which real catalogues contain in quantity.
        return SeriesScale(1.0 + math.fsum(history) / len(history))


class ForecastPaths(NamedTuple):
    """Trajectories, not quantiles.

    The paths come back rather than summary statistics because the joint
    structure is the whole point: a quantile of a SUM over the horizon cannot
    be recovered from per-step quantiles.
    """

    paths: list[list[float]]
    scale: SeriesScale
    seed: int

    def marginal_quantile(self, horizon: int, level: float) -> float:
        values = sorted(path[horizon] for path in self.paths)
        return values[min(int(level * len(values)), len(values) - 1)]

    def aggregate_quantile(self, level: float) -> float:
        """Sum WITHIN each path, then take the quantile.

        This ordering is the joint-distribution advantage. Reversing it -
        summing per-step quantiles - destroys the correlation between steps
        and is wrong in the unsafe direction.
        """
        totals = sorted(math.fsum(path) for path in self.paths)
        return totals[min(int(level * len(totals)), len(totals) - 1)]


def forecast(
    history: Sequence[float],
    future_covariates: Sequence[Sequence[float]],
    step: object,
    likelihood: Likelihood,
    scale: SeriesScale | None = None,
    num_paths: int = 200,
    seed: int = 7,
) -> ForecastPaths:
    """Warm the state on history, then draw trajectories.

    \`scale\` must be the one fitted with the model. Passing None is refused
    rather than silently recomputed, because a recomputed scale is a
    different model.
    """
    if scale is None:
        raise UnscaledSeries(
            'the fitted per-series scale must be supplied; recomputing it here '
            'would silently change every forecast'
        )
    if num_paths < 50:
        raise ShapeMismatch(
            f'{num_paths} paths cannot estimate a tail quantile; use at least 50'
        )

    likelihood.validate_data(history)
    rng = random.Random(seed)
    paths: list[list[float]] = []

    for _ in range(num_paths):
        state = getattr(step, 'warm')(history, scale.value)
        previous = history[-1]
        path: list[float] = []
        for covariate_row in future_covariates:
            state, raw = getattr(step, 'advance')(state, previous / scale.value, covariate_row)
            parameters = likelihood.constrain(raw, scale.value)
            drawn = likelihood.sample(parameters, rng)
            path.append(drawn)
            previous = drawn  # the sample becomes the next input
        paths.append(path)

    return ForecastPaths(paths=paths, scale=scale, seed=seed)


def empirical_coverage(
    paths_per_series: Sequence[ForecastPaths],
    actuals: Sequence[Sequence[float]],
    level: float,
) -> float:
    """What fraction of actuals fall below the nominal quantile.

    Calibration is a separate question from accuracy and it is the one that
    matters operationally: an over-confident model can have excellent median
    error and still cause systematic stockouts.
    """
    hits = 0
    total = 0
    for forecast_paths, actual in zip(paths_per_series, actuals):
        for horizon, observed in enumerate(actual):
            if observed <= forecast_paths.marginal_quantile(horizon, level):
                hits += 1
            total += 1
    if total == 0:
        raise ShapeMismatch('no observations to measure coverage against')
    return hits / total
`,
        rationale:
          'Two things change and both are about failures that are otherwise silent. The likelihood family becomes a protocol rather than a flag, because each family genuinely owns three different things — its parameter count, how those parameters must be constrained, and how to sample from it — and because choosing it is a modelling commitment rather than a configuration detail. It also gains a data validator: a Gaussian head on count data trains happily and emits negative lower quantiles, so the family refuses data that is plainly integer and non-negative rather than letting the incoherence reach production. Note the asymmetry in the negative binomial constraint, which is easy to get wrong: the mean scales with the series and the dispersion does not, because scaling a shape parameter changes the family rather than its location. The per-series scale becomes a frozen object carried with the model and is refused rather than recomputed, since a scale computed from a different window at inference is a different model. Forecasts return trajectories rather than quantiles, with the sum-within-path ordering made explicit, because that ordering is the entire joint-distribution advantage.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Same asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: the likelihood dispatch adds an indirect call per step, which against a hidden-state matrix product is immeasurable.',
      },

      'make-it-fast': {
        code: `"""Sampling is the cost, so sampling is what batches.

The structural observation: training is teacher-forced and therefore one
parallel graph, but inference rolls S paths forward step by step and that is
two orders of magnitude more work. So the paths become a BATCH DIMENSION -
all S trajectories take step t together, and the Python loop is over the
horizon (tens) rather than over the paths (hundreds).

Three changes:
  1. The four LSTM gates share ONE weight with 4H columns, so the joined
     input is read once rather than four times.
  2. Sample paths batch. (paths, hidden) advances as one GEMM per step.
  3. Series batch on top of that, so the whole panel and every path advance
     in a single (series * paths, hidden) product per step.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def softplus_(values: NDArray[np.float32]) -> NDArray[np.float32]:
    """In-place, with the overflow branch as a select rather than a loop.

    Above about 30 the exponential overflows while log1p(exp(x)) equals x to
    full precision, so the large branch is correctness and not speed.
    """
    large = values > 30.0
    safe = np.where(large, 0.0, values)
    np.exp(safe, out=safe)
    np.log1p(safe, out=safe)
    return np.where(large, values, safe)


class BatchedLstm:
    """One cell, evaluated for an arbitrary leading batch.

    The four gates share a single weight of 4H columns. Four separate
    products would read the joined input four times; one reads it once, and
    the split afterwards is a view rather than a copy.
    """

    def __init__(self, input_size: int, hidden_size: int) -> None:
        self._hidden = hidden_size
        self._weight = np.zeros((input_size + hidden_size, 4 * hidden_size), dtype=FLOAT)
        self._bias = np.zeros(4 * hidden_size, dtype=FLOAT)

    def step(
        self,
        inputs: NDArray[np.float32],
        hidden: NDArray[np.float32],
        cell: NDArray[np.float32],
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """inputs (batch, input_size), hidden/cell (batch, hidden_size)."""
        joined = np.concatenate((inputs, hidden), axis=1)
        gates = joined @ self._weight
        gates += self._bias

        h = self._hidden
        forget, write, candidate, expose = (
            gates[:, :h], gates[:, h:2 * h], gates[:, 2 * h:3 * h], gates[:, 3 * h:],
        )

        # Three sigmoids and a tanh, all in place over the gates buffer, so
        # the activated gates never exist as separate arrays.
        for block in (forget, write, expose):
            np.negative(block, out=block)
            np.exp(block, out=block)
            block += 1.0
            np.reciprocal(block, out=block)
        np.tanh(candidate, out=candidate)

        cell *= forget
        cell += write * candidate
        new_hidden = np.tanh(cell) * expose
        return new_hidden, cell


def sample_paths(
    lstm: BatchedLstm,
    warm_hidden: NDArray[np.float32],
    warm_cell: NDArray[np.float32],
    last_values: NDArray[np.float32],
    future_covariates: NDArray[np.float32],
    mu_weight: NDArray[np.float32],
    sigma_weight: NDArray[np.float32],
    scale: NDArray[np.float32],
    num_paths: int,
    rng: np.random.Generator,
) -> NDArray[np.float32]:
    """Returns (series, paths, horizon).

    Every path of every series advances together. The Python loop is over the
    HORIZON - tens of iterations - rather than over hundreds of paths times
    thousands of series, which is the whole structural change.
    """
    num_series, hidden_size = warm_hidden.shape
    horizon, covariate_width = future_covariates.shape[1], future_covariates.shape[2]
    rows = num_series * num_paths

    # Tile the warmed state across paths. Every path of a series starts from
    # the same state and diverges only through its own draws.
    hidden = np.repeat(warm_hidden, num_paths, axis=0).astype(FLOAT)
    cell = np.repeat(warm_cell, num_paths, axis=0).astype(FLOAT)
    previous = np.repeat(last_values, num_paths).astype(FLOAT)
    row_scale = np.repeat(scale, num_paths).astype(FLOAT)

    out = np.empty((rows, horizon), dtype=FLOAT)
    inputs = np.empty((rows, 1 + covariate_width), dtype=FLOAT)

    for step in range(horizon):
        # Pre-allocated input buffer: the concatenation of the fed-back value
        # and the covariates is written in place every step.
        np.divide(previous, row_scale, out=inputs[:, 0])
        inputs[:, 1:] = np.repeat(future_covariates[:, step, :], num_paths, axis=0)

        hidden, cell = lstm.step(inputs, hidden, cell)

        mu = (hidden @ mu_weight) * row_scale
        sigma = softplus_(hidden @ sigma_weight) * row_scale

        # One vectorized draw for every path of every series at once. This is
        # the operation the whole restructuring exists to batch.
        drawn = rng.normal(mu, sigma).astype(FLOAT)
        out[:, step] = drawn
        previous = drawn  # the sample becomes the next input

    return out.reshape(num_series, num_paths, horizon)


def marginal_quantiles(
    paths: NDArray[np.float32], levels: NDArray[np.float32]
) -> NDArray[np.float32]:
    """(series, levels, horizon) from (series, paths, horizon).

    One partition-based quantile over the path axis, not a sort: the quantile
    needs a selection, and ordering the rest is discarded work.
    """
    return np.quantile(paths, levels, axis=1, method='linear').transpose(1, 0, 2)


def aggregate_quantiles(
    paths: NDArray[np.float32], levels: NDArray[np.float32]
) -> NDArray[np.float32]:
    """Sum WITHIN each path, then take the quantile over paths.

    This ordering is the joint-distribution advantage, and reversing it -
    summing per-step quantiles - destroys the correlation between steps. The
    difference is large for any aggregating decision and usually unsafe.
    """
    totals = paths.sum(axis=2, dtype=FLOAT)
    return np.quantile(totals, levels, axis=1).T


def empirical_coverage(
    paths: NDArray[np.float32],
    actuals: NDArray[np.float32],
    level: float,
) -> float:
    """Fraction of actuals below the nominal quantile, in one pass.

    Calibration is separate from accuracy and it is the operational one: an
    over-confident model can have excellent median error and still cause
    systematic stockouts.
    """
    threshold = np.quantile(paths, level, axis=1)
    return float((actuals <= threshold).mean())


def path_count_for_tail(level: float, relative_error: float = 0.1) -> int:
    """How many paths a tail quantile actually needs.

    The standard error of an empirical quantile scales as
    sqrt(p(1-p)/n) / density, so a far tail needs far more paths than the
    body. Worth computing rather than defaulting to 100 and hoping - a 1st
    percentile from 100 paths is one order statistic and is pure noise.
    """
    tail = min(level, 1.0 - level)
    return int(np.ceil(tail * (1.0 - tail) / (relative_error * tail) ** 2))
`,
        rationale:
          'The restructuring follows the profile rather than intuition: training is teacher-forced and already one parallel graph, while inference rolls hundreds of paths forward step by step and is two orders of magnitude more work — so the paths become a batch dimension. Every trajectory of every series takes step t together, which turns the outer Python loop from hundreds of paths times thousands of series into tens of horizon steps. The four LSTM gates share a single weight of four times the hidden width, so the joined input is read once instead of four times for identical arithmetic, and the three sigmoids and the tanh run in place over that buffer so the activated gates never exist separately. The fed-back value and the covariates are written into a pre-allocated input buffer each step rather than concatenated afresh. Quantiles use a partition-based selection rather than a sort, since ordering the discarded paths is wasted work, and the aggregate quantile sums within each path before selecting — the ordering that is the entire joint-distribution advantage. The path-count helper exists because a 1st percentile from a hundred paths is a single order statistic and is pure noise, which is worth computing rather than assuming.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Sample paths and series both become rows of one array, so the only remaining interpreter loop is over the horizon rather than over paths times series.',
            tradeoff: 'All paths for all series are live simultaneously, so peak memory is series times paths times hidden width — on a large panel with a thousand paths that is the binding constraint and forces chunking by series.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The four gates come from one product and their activations run in place over that buffer, and the cell update writes through itself rather than allocating.',
            tradeoff: 'The raw gate pre-activations are destroyed, so diagnosing a saturated forget gate — the classic reason a recurrent forecaster stops using its history — needs an unfused pass.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The input buffer, the output trajectory array and the cell state are all written into existing memory, so a thousand-step sampling loop never enters the allocator.',
            tradeoff: 'The cell array is mutated by the step function, so a caller that keeps a reference to the warmed state finds it modified — a real hazard when the same warm state seeds several independent sampling runs.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 throughout keeps the per-step product on the BLAS fast path and halves the bandwidth of a state tensor that is re-read every horizon step.',
            tradeoff: 'float32 sampling accumulates drift along a trajectory because each step conditions on the previous draw, so the error compounds down the path rather than cancelling — visible as slightly over-dispersed tails at long horizons.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Sampling becomes O(horizon) array steps instead of O(paths * series * horizon) interpreter steps. Illustrative, not a measured benchmark: with the paths batched the remaining cost is the per-step GEMM, which is small and sequential — so the wall clock is set by horizon length rather than by path count, which is the opposite of the naive version.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DeepAR, transcribed the way the paper reads.
//
// The model emits DISTRIBUTION PARAMETERS, not values:
//   h_t     = LSTM(h_{t-1}, y_{t-1} / nu, x_t)   recurrent state
//   mu_t    = nu * (w_mu . h_t)                   location
//   sigma_t = nu * softplus(w_sigma . h_t)        scale, forced positive
//   loss    = -log N(y_t | mu_t, sigma_t)         maximum likelihood
//
// nu is the series' own mean. Dividing the input by it and multiplying the
// outputs back is the unglamorous detail that lets one model span six orders
// of magnitude - without it the large series dominate the gradient entirely.
//
// Vector-of-vector, one LSTM cell written out, Gaussian likelihood.

#include <cmath>
#include <cstddef>
#include <random>
#include <stdexcept>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

double Sigmoid(double value) {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

// log(1 + e^x), positive everywhere.
//
// The scale parameter of a distribution MUST be positive, and that is a hard
// constraint the architecture has to enforce rather than hope for. Above
// about 30 the exponential overflows while log1p(exp(x)) equals x to full
// precision, so the branch is correctness rather than speed.
double Softplus(double value) {
  if (value > 30.0) {
    return value;
  }
  return std::log1p(std::exp(value));
}

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

struct LstmParams {
  Matrix wf, wi, wc, wo;
  Vector bf, bi, bc, bo;
  Vector w_mu, w_sigma;
  std::size_t hidden_size{};
};

struct LstmState {
  Vector hidden;
  Vector cell;
};

// One LSTM step. Four gates over the concatenated input and state.
LstmState LstmCell(const Vector& inputs, const LstmState& state,
                   const LstmParams& params) {
  Vector joined;
  joined.reserve(inputs.size() + state.hidden.size());
  joined.insert(joined.end(), inputs.begin(), inputs.end());
  joined.insert(joined.end(), state.hidden.begin(), state.hidden.end());

  const Vector forget_raw = MatVec(params.wf, joined, params.bf);
  const Vector write_raw = MatVec(params.wi, joined, params.bi);
  const Vector candidate_raw = MatVec(params.wc, joined, params.bc);
  const Vector expose_raw = MatVec(params.wo, joined, params.bo);

  LstmState next;
  next.cell.resize(state.cell.size());
  next.hidden.resize(state.hidden.size());
  for (std::size_t i = 0; i < state.cell.size(); ++i) {
    next.cell[i] = Sigmoid(forget_raw[i]) * state.cell[i] +
                   Sigmoid(write_raw[i]) * std::tanh(candidate_raw[i]);
    next.hidden[i] = Sigmoid(expose_raw[i]) * std::tanh(next.cell[i]);
  }
  return next;
}

// nu = 1 + mean(history). The plus one keeps an all-zero series usable,
// which real catalogues contain in quantity.
double SeriesScale(const Vector& history) {
  double total = 0.0;
  for (std::size_t i = 0; i < history.size(); ++i) {
    total += history[i];
  }
  return 1.0 + total / static_cast<double>(history.size());
}

// log N(value | mu, sigma). This IS the loss, negated.
double GaussianLogLikelihood(double value, double mu, double sigma) {
  const double z = (value - mu) / sigma;
  return -0.5 * z * z - std::log(sigma) - 0.5 * std::log(2.0 * M_PI);
}

// The likelihood that is actually right for demand data.
//
// Gaussian on counts puts probability mass on negative demand, which makes
// every lower quantile meaningless. Nothing in the training loss objects to
// this - it simply produces a confidently incoherent interval.
double NegativeBinomialLogLikelihood(double count, double mu, double alpha) {
  const double shape = 1.0 / alpha;
  return std::lgamma(count + shape) - std::lgamma(shape) - std::lgamma(count + 1.0) +
         shape * std::log(shape / (shape + mu)) + count * std::log(mu / (shape + mu));
}

// Teacher forcing: the recurrence is unrolled against TRUE observations.
//
// That is what makes training one parallel graph - and it is also the source
// of exposure bias, because inference conditions on the model's own samples
// instead and the recurrence has never seen that state.
double TrainSequence(const Vector& history, const Matrix& covariates,
                     const LstmParams& params, double scale, LstmState* final_state) {
  LstmState state{Vector(params.hidden_size, 0.0), Vector(params.hidden_size, 0.0)};
  double total_log_likelihood = 0.0;

  for (std::size_t t = 1; t < history.size(); ++t) {
    Vector inputs;
    inputs.push_back(history[t - 1] / scale);
    inputs.insert(inputs.end(), covariates[t].begin(), covariates[t].end());
    state = LstmCell(inputs, state, params);

    double mu = 0.0;
    double sigma_raw = 0.0;
    for (std::size_t i = 0; i < state.hidden.size(); ++i) {
      mu += params.w_mu[i] * state.hidden[i];
      sigma_raw += params.w_sigma[i] * state.hidden[i];
    }
    total_log_likelihood +=
        GaussianLogLikelihood(history[t], scale * mu, scale * Softplus(sigma_raw));
  }

  *final_state = state;
  return -total_log_likelihood;
}

// One trajectory: draw, feed back, repeat.
//
// This is the whole reason DeepAR gives a JOINT distribution over the horizon
// rather than independent per-step quantiles. Each step's sample genuinely
// conditions the next, so uncertainty compounds correctly.
Vector SamplePath(LstmState state, double last_value, const Matrix& future_covariates,
                  const LstmParams& params, double scale, std::mt19937& rng) {
  Vector path;
  path.reserve(future_covariates.size());
  double previous = last_value;

  for (std::size_t t = 0; t < future_covariates.size(); ++t) {
    Vector inputs;
    inputs.push_back(previous / scale);
    inputs.insert(inputs.end(), future_covariates[t].begin(), future_covariates[t].end());
    state = LstmCell(inputs, state, params);

    double mu = 0.0;
    double sigma_raw = 0.0;
    for (std::size_t i = 0; i < state.hidden.size(); ++i) {
      mu += params.w_mu[i] * state.hidden[i];
      sigma_raw += params.w_sigma[i] * state.hidden[i];
    }

    std::normal_distribution<double> draw(scale * mu, scale * Softplus(sigma_raw));
    const double drawn = draw(rng);
    path.push_back(drawn);
    previous = drawn;  // the sample becomes the next input
  }
  return path;
}

// Any quantile is just a percentile of the sampled trajectories.
double MarginalQuantile(const std::vector<Vector>& paths, std::size_t horizon,
                        double level) {
  Vector values;
  values.reserve(paths.size());
  for (std::size_t p = 0; p < paths.size(); ++p) {
    values.push_back(paths[p][horizon]);
  }
  std::sort(values.begin(), values.end());
  const std::size_t index = static_cast<std::size_t>(level * static_cast<double>(values.size()));
  return values[std::min(index, values.size() - 1)];
}

// The joint advantage, made concrete.
//
// Total demand over a lead time is NOT the sum of per-step medians. Summing
// WITHIN each path first and taking the quantile afterwards preserves the
// correlation between steps; the other order destroys it, and the error is
// usually in the unsafe direction.
double LeadTimeQuantile(const std::vector<Vector>& paths, double level) {
  Vector totals;
  totals.reserve(paths.size());
  for (std::size_t p = 0; p < paths.size(); ++p) {
    double sum = 0.0;
    for (std::size_t h = 0; h < paths[p].size(); ++h) {
      sum += paths[p][h];
    }
    totals.push_back(sum);
  }
  std::sort(totals.begin(), totals.end());
  const std::size_t index = static_cast<std::size_t>(level * static_cast<double>(totals.size()));
  return totals[std::min(index, totals.size() - 1)];
}
`,
        profile:
          'O(T * H^2) for training and O(S * steps * H^2) for S sample paths at inference. Illustrative, not a measured benchmark: with 200 paths over a 14-step horizon that is 2,800 sequential cell evaluations per series, each allocating a joined vector and four gate vectors — which is why inference rather than training dominates here.',
      },

      'make-it-right': {
        code: `// The same model, with the likelihood as an interface and the scale as a
// carried contract.
//
// Two things change. The likelihood family becomes a polymorphic type with
// its own parameter constraints, sampler and data validator, because
// choosing it is a modelling decision rather than a flag - and a Gaussian
// head on count data emits negative quantiles that nothing in the training
// loss objects to. And the per-series scale becomes an object carried with
// the model, because recomputing it at inference silently changes every
// forecast.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <memory>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace deepar {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the failure is silent otherwise: a Gaussian head on
// count data trains happily and emits negative lower quantiles, and nothing
// in the training loop mentions it.
class LikelihoodMisspecified : public std::invalid_argument {
 public:
  explicit LikelihoodMisspecified(const std::string& what)
      : std::invalid_argument(what) {}
};

// The scale is part of the model artifact. Recomputing it at inference from a
// different window changes every forecast, with nothing logged.
class UnscaledSeries : public std::logic_error {
 public:
  explicit UnscaledSeries(const std::string& what) : std::logic_error(what) {}
};

// Positive everywhere, with the overflow branch for correctness: above about
// 30 the exponential overflows while log1p(exp(x)) equals x to full precision.
[[nodiscard]] inline double Softplus(double value) noexcept {
  return value > 30.0 ? value : std::log1p(std::exp(value));
}

// A distribution family the network emits parameters for.
//
// Polymorphic rather than an enum because each family owns three genuinely
// different things: how many parameters it needs, how to constrain them, and
// how to sample from it.
class Likelihood {
 public:
  virtual ~Likelihood() = default;

  [[nodiscard]] virtual std::size_t ParameterCount() const noexcept = 0;
  [[nodiscard]] virtual std::vector<double> Constrain(std::span<const double> raw,
                                                      double scale) const = 0;
  [[nodiscard]] virtual double LogProbability(double value,
                                              std::span<const double> parameters) const = 0;
  [[nodiscard]] virtual double Sample(std::span<const double> parameters,
                                      std::mt19937& rng) const = 0;
  virtual void ValidateData(std::span<const double> values) const = 0;
};

// Correct for genuinely continuous quantities, and only those.
class Gaussian final : public Likelihood {
 public:
  [[nodiscard]] std::size_t ParameterCount() const noexcept override { return 2; }

  [[nodiscard]] std::vector<double> Constrain(std::span<const double> raw,
                                              double scale) const override {
    // Both parameters are multiplied back by the series scale, so the
    // network only ever works in normalized space.
    return {scale * raw[0], scale * Softplus(raw[1])};
  }

  [[nodiscard]] double LogProbability(double value,
                                      std::span<const double> parameters) const override {
    const double z = (value - parameters[0]) / parameters[1];
    return -0.5 * z * z - std::log(parameters[1]) - 0.5 * std::log(2.0 * M_PI);
  }

  [[nodiscard]] double Sample(std::span<const double> parameters,
                              std::mt19937& rng) const override {
    std::normal_distribution<double> draw(parameters[0], parameters[1]);
    return draw(rng);
  }

  // Guard clause for the failure with no other symptom.
  void ValidateData(std::span<const double> values) const override {
    const bool all_counts = std::all_of(values.begin(), values.end(), [](double value) {
      return value >= 0.0 && value == std::floor(value);
    });
    if (all_counts) {
      throw LikelihoodMisspecified(
          "every observation is a non-negative integer; a Gaussian head will emit "
          "negative lower quantiles. Use NegativeBinomial.");
    }
  }
};

// The right choice for count and intermittent demand data.
class NegativeBinomial final : public Likelihood {
 public:
  [[nodiscard]] std::size_t ParameterCount() const noexcept override { return 2; }

  [[nodiscard]] std::vector<double> Constrain(std::span<const double> raw,
                                              double scale) const override {
    // Note the asymmetry: the mean scales with the series and the dispersion
    // does NOT, because scaling a shape parameter changes the family rather
    // than its location. Getting this wrong is a common and subtle error.
    return {scale * Softplus(raw[0]), Softplus(raw[1])};
  }

  [[nodiscard]] double LogProbability(double value,
                                      std::span<const double> parameters) const override {
    const double mu = parameters[0];
    const double shape = 1.0 / parameters[1];
    return std::lgamma(value + shape) - std::lgamma(shape) - std::lgamma(value + 1.0) +
           shape * std::log(shape / (shape + mu)) + value * std::log(mu / (shape + mu));
  }

  [[nodiscard]] double Sample(std::span<const double> parameters,
                              std::mt19937& rng) const override {
    // Gamma-Poisson mixture: the standard construction, and the reason this
    // family handles the overdispersion that Poisson cannot.
    const double shape = 1.0 / parameters[1];
    std::gamma_distribution<double> gamma(shape, parameters[0] / shape);
    std::poisson_distribution<int> poisson(gamma(rng));
    return static_cast<double>(poisson(rng));
  }

  void ValidateData(std::span<const double> values) const override {
    if (std::any_of(values.begin(), values.end(), [](double v) { return v < 0.0; })) {
      throw LikelihoodMisspecified("a count likelihood cannot model negative values");
    }
  }
};

// The per-series normalizer, carried WITH the model.
//
// A distinct type because recomputing it at inference from a different window
// silently changes every forecast, and that is among the most common
// production errors with this model.
class SeriesScale {
 public:
  static SeriesScale FromHistory(std::span<const double> history) {
    if (history.empty()) {
      throw ShapeMismatch("cannot scale an empty series");
    }
    // The plus one keeps an all-zero series usable rather than dividing by
    // zero, which real catalogues contain in quantity.
    const double mean = std::accumulate(history.begin(), history.end(), 0.0) /
                        static_cast<double>(history.size());
    return SeriesScale(1.0 + mean);
  }

  [[nodiscard]] double value() const noexcept { return value_; }

 private:
  explicit SeriesScale(double value) : value_(value) {}
  double value_;
};

// Flat gate weights: the four gates share ONE matrix of 4H rows, so the
// joined input is read once rather than four times.
class LstmCell {
 public:
  LstmCell(std::size_t input_size, std::size_t hidden_size)
      : input_size_(input_size), hidden_size_(hidden_size),
        weight_(4 * hidden_size * (input_size + hidden_size), 0.0),
        bias_(4 * hidden_size, 0.0),
        joined_(input_size + hidden_size, 0.0),
        gates_(4 * hidden_size, 0.0) {}

  void Step(std::span<const double> inputs, std::span<double> hidden,
            std::span<double> cell) {
    if (inputs.size() != input_size_) {
      throw ShapeMismatch("input width does not match the cell");
    }

    std::copy(inputs.begin(), inputs.end(), joined_.begin());
    std::copy(hidden.begin(), hidden.end(), joined_.begin() + static_cast<long>(input_size_));

    const std::size_t width = joined_.size();
    std::copy(bias_.begin(), bias_.end(), gates_.begin());
    for (std::size_t j = 0; j < width; ++j) {
      const double value = joined_[j];
      const double* row = weight_.data() + j * gates_.size();
      for (std::size_t i = 0; i < gates_.size(); ++i) {
        gates_[i] += value * row[i];
      }
    }

    const std::size_t h = hidden_size_;
    for (std::size_t i = 0; i < h; ++i) {
      const double forget = Logistic(gates_[i]);
      const double write = Logistic(gates_[h + i]);
      const double candidate = std::tanh(gates_[2 * h + i]);
      const double expose = Logistic(gates_[3 * h + i]);
      cell[i] = forget * cell[i] + write * candidate;
      hidden[i] = expose * std::tanh(cell[i]);
    }
  }

  [[nodiscard]] std::size_t hidden_size() const noexcept { return hidden_size_; }

 private:
  [[nodiscard]] static double Logistic(double value) noexcept {
    if (value >= 0.0) {
      return 1.0 / (1.0 + std::exp(-value));
    }
    const double positive = std::exp(value);
    return positive / (1.0 + positive);
  }

  std::size_t input_size_;
  std::size_t hidden_size_;
  std::vector<double> weight_;  // rule of zero: owning members only
  std::vector<double> bias_;
  std::vector<double> joined_;
  std::vector<double> gates_;
};

// Trajectories, not quantiles.
//
// The paths come back rather than summary statistics because the joint
// structure is the whole point: a quantile of a SUM over the horizon cannot
// be recovered from per-step quantiles.
class ForecastPaths {
 public:
  ForecastPaths(std::vector<double> flat, std::size_t num_paths, std::size_t horizon,
                unsigned seed)
      : flat_(std::move(flat)), num_paths_(num_paths), horizon_(horizon), seed_(seed) {}

  [[nodiscard]] double MarginalQuantile(std::size_t horizon, double level) const {
    std::vector<double> values(num_paths_);
    for (std::size_t p = 0; p < num_paths_; ++p) {
      values[p] = flat_[p * horizon_ + horizon];
    }
    return Select(values, level);
  }

  // Sum WITHIN each path, then take the quantile.
  //
  // This ordering is the joint-distribution advantage. Reversing it -
  // summing per-step quantiles - destroys the correlation between steps and
  // is wrong in the unsafe direction.
  [[nodiscard]] double AggregateQuantile(double level) const {
    std::vector<double> totals(num_paths_);
    for (std::size_t p = 0; p < num_paths_; ++p) {
      const double* path = flat_.data() + p * horizon_;
      totals[p] = std::accumulate(path, path + horizon_, 0.0);
    }
    return Select(totals, level);
  }

  [[nodiscard]] unsigned seed() const noexcept { return seed_; }

 private:
  [[nodiscard]] static double Select(std::vector<double>& values, double level) {
    const std::size_t index = std::min(
        static_cast<std::size_t>(level * static_cast<double>(values.size())),
        values.size() - 1);
    // nth_element, not a full sort: a quantile is a selection and ordering
    // the rest is discarded work.
    std::nth_element(values.begin(), values.begin() + static_cast<long>(index), values.end());
    return values[index];
  }

  std::vector<double> flat_;
  std::size_t num_paths_;
  std::size_t horizon_;
  unsigned seed_;
};

// Guard clause: a scale must be supplied rather than recomputed.
inline void RequireScale(const SeriesScale* scale) {
  if (scale == nullptr) {
    throw UnscaledSeries(
        "the fitted per-series scale must be supplied; recomputing it here would "
        "silently change every forecast");
  }
}

}  // namespace deepar
`,
        rationale:
          'Two things change and both concern failures that are otherwise silent. The likelihood family becomes a polymorphic type rather than a branch, because each family genuinely owns three different things — its parameter count, how those parameters must be constrained, and how to sample from it — and because choosing it is a modelling commitment. It also gains a data validator: a Gaussian head on count data trains happily and emits negative lower quantiles, so the family refuses data that is plainly integer and non-negative rather than letting the incoherence reach production. The asymmetry in the negative binomial constraint is called out explicitly because it is easy to get wrong: the mean scales with the series and the dispersion does not, since scaling a shape parameter changes the family rather than its location. The per-series scale becomes its own type and is required rather than recomputed, because a scale derived from a different window at inference is a different model. Storage flattens — the four gates share one weight matrix so the joined input is read once, and the cell owns its scratch so a sampling loop allocates nothing — and quantiles use nth_element rather than a sort, since a quantile is a selection and ordering the discarded paths is wasted work.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same asymptotics with no per-step allocation and a single gate product instead of four. Illustrative, not a measured benchmark: nth_element also turns each quantile from O(S log S) into O(S), which matters when quantiles are read per horizon per series across a panel.',
      },

      'make-it-fast': {
        code: `// Sampling is the cost, so sampling is what batches.
//
// The structural observation: training is teacher-forced and therefore one
// parallel graph, but inference rolls S paths forward step by step and that
// is two orders of magnitude more work. So the paths become a BATCH
// DIMENSION - every trajectory of every series takes step t together, and
// the only sequential loop left is over the horizon.
//
// Three changes:
//   1. The four gates share ONE weight of 4H columns, so the joined input is
//      read once and the whole gate product is a single GEMM.
//   2. Paths and series fold into one row axis, so a step is one
//      (series * paths, hidden) product rather than a nested loop.
//   3. Per-thread generators, because a shared distribution object is a
//      contention point that would otherwise dominate the sampling loop.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace deepar {

// Three-shift xorshift plus a Box-Muller pair. One generator per thread, so
// the state stays in L1 and never shares a cache line - a shared std::mt19937
// with a distribution object would serialize the entire sampling loop.
class FastRng {
 public:
  explicit FastRng(uint64_t seed) noexcept : state_(seed | 1ULL) {}

  [[gnu::always_inline]] float Uniform() noexcept {
    state_ ^= state_ << 13;
    state_ ^= state_ >> 7;
    state_ ^= state_ << 17;
    return static_cast<float>(state_ >> 40) * (1.0F / 16777216.0F);
  }

  // Box-Muller returns two normals per pair of uniforms; caching the spare
  // halves the transcendental cost of the sampling loop.
  [[gnu::always_inline]] float Normal() noexcept {
    if (has_spare_) {
      has_spare_ = false;
      return spare_;
    }
    const float u1 = std::max(Uniform(), 1e-7F);
    const float u2 = Uniform();
    const float radius = std::sqrt(-2.0F * std::log(u1));
    const float angle = 6.2831853F * u2;
    spare_ = radius * std::sin(angle);
    has_spare_ = true;
    return radius * std::cos(angle);
  }

 private:
  uint64_t state_;
  float spare_{0.0F};
  bool has_spare_{false};
};

[[gnu::always_inline]] inline float Softplus(float value) noexcept {
  // Above about 30 the exponential overflows while log1p(exp(x)) equals x to
  // full precision, so the branch is correctness rather than speed.
  return value > 30.0F ? value : std::log1p(std::exp(value));
}

// Every path of every series advances together.
class BatchedSampler {
 public:
  BatchedSampler(int rows, int input_size, int hidden_size)
      : rows_(rows), input_size_(input_size), hidden_size_(hidden_size),
        joined_(static_cast<std::size_t>(rows) * (input_size + hidden_size)),
        gates_(static_cast<std::size_t>(rows) * 4 * hidden_size),
        head_(static_cast<std::size_t>(rows) * 2) {}

  // hidden and cell are (rows x hidden_size) and are updated IN PLACE.
  // gate_weight is ((input + hidden) x 4H): all four gates side by side, so
  // the joined input is read once rather than four times.
  void Step(const float* __restrict inputs, const float* __restrict gate_weight,
            const float* __restrict gate_bias, const float* __restrict head_weight,
            float* __restrict hidden, float* __restrict cell,
            const float* __restrict row_scale, float* __restrict drawn,
            uint64_t seed, int step) {
    const int joined_width = input_size_ + hidden_size_;

    // Pack inputs and state into one contiguous operand so the gate product
    // is a single dense GEMM rather than two strided ones.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows_; ++r) {
      float* target = joined_.data() + static_cast<std::size_t>(r) * joined_width;
      std::copy(inputs + static_cast<std::size_t>(r) * input_size_,
                inputs + static_cast<std::size_t>(r + 1) * input_size_, target);
      std::copy(hidden + static_cast<std::size_t>(r) * hidden_size_,
                hidden + static_cast<std::size_t>(r + 1) * hidden_size_,
                target + input_size_);
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows_, 4 * hidden_size_,
                joined_width, 1.0F, joined_.data(), joined_width, gate_weight,
                4 * hidden_size_, 0.0F, gates_.data(), 4 * hidden_size_);

    // One GEMM for both head projections: mu and the raw sigma are adjacent
    // columns, so the hidden state is read once for both.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows_, 2, hidden_size_,
                1.0F, hidden, hidden_size_, head_weight, 2, 0.0F, head_.data(), 2);

#pragma omp parallel
    {
      // One generator per thread, seeded from the thread id and the step, so
      // the stream is reproducible for a fixed thread count.
      FastRng rng(seed + static_cast<uint64_t>(omp_get_thread_num()) * 0x9E3779B97F4A7C15ULL +
                  static_cast<uint64_t>(step) * 0x2545F4914F6CDD1DULL);

#pragma omp for schedule(static)
      for (int r = 0; r < rows_; ++r) {
        float* gate_row = gates_.data() + static_cast<std::size_t>(r) * 4 * hidden_size_;
        float* hidden_row = hidden + static_cast<std::size_t>(r) * hidden_size_;
        float* cell_row = cell + static_cast<std::size_t>(r) * hidden_size_;

        // Gate activation and both state updates fused into one pass over
        // the row: none of the activated gates is ever a separate buffer.
        const int h = hidden_size_;
        for (int i = 0; i < h; ++i) {
          const float forget = 1.0F / (1.0F + std::exp(-(gate_row[i] + gate_bias[i])));
          const float write =
              1.0F / (1.0F + std::exp(-(gate_row[h + i] + gate_bias[h + i])));
          const float candidate = std::tanh(gate_row[2 * h + i] + gate_bias[2 * h + i]);
          const float expose =
              1.0F / (1.0F + std::exp(-(gate_row[3 * h + i] + gate_bias[3 * h + i])));
          cell_row[i] = forget * cell_row[i] + write * candidate;
          hidden_row[i] = expose * std::tanh(cell_row[i]);
        }

        const float scale = row_scale[r];
        const float mu = scale * head_[static_cast<std::size_t>(r) * 2];
        const float sigma = scale * Softplus(head_[static_cast<std::size_t>(r) * 2 + 1]);
        drawn[r] = mu + sigma * rng.Normal();
      }
    }
  }

 private:
  int rows_;
  int input_size_;
  int hidden_size_;
  std::vector<float> joined_;
  std::vector<float> gates_;
  std::vector<float> head_;
};

// Sum WITHIN each path, then select the quantile over paths.
//
// This ordering is the joint-distribution advantage; summing per-step
// quantiles destroys the correlation between steps and is wrong in the
// unsafe direction for any aggregating decision.
[[nodiscard]] inline float AggregateQuantile(std::span<const float> paths,
                                             int num_paths, int horizon, float level) {
  std::vector<float> totals(static_cast<std::size_t>(num_paths));

#pragma omp parallel for schedule(static)
  for (int p = 0; p < num_paths; ++p) {
    const float* path = paths.data() + static_cast<std::size_t>(p) * horizon;
    float sum = 0.0F;
    for (int h = 0; h < horizon; ++h) {
      sum += path[h];
    }
    totals[static_cast<std::size_t>(p)] = sum;
  }

  const std::size_t index = std::min(
      static_cast<std::size_t>(level * static_cast<float>(num_paths)),
      totals.size() - 1);
  // nth_element, not a sort: a quantile is a selection, and ordering the
  // discarded paths is work whose result is thrown away.
  std::nth_element(totals.begin(), totals.begin() + static_cast<long>(index), totals.end());
  return totals[index];
}

// How many paths a tail quantile actually needs.
//
// The standard error of an empirical quantile scales as sqrt(p(1-p)/n) over
// the density, so a far tail needs far more paths than the body. Worth
// computing rather than defaulting to 100 and hoping - a 1st percentile from
// 100 paths is a single order statistic and is pure noise.
[[nodiscard]] inline int PathCountForTail(double level, double relative_error = 0.1) {
  const double tail = std::min(level, 1.0 - level);
  return static_cast<int>(std::ceil(tail * (1.0 - tail) /
                                    std::pow(relative_error * tail, 2.0)));
}

}  // namespace deepar
`,
        rationale:
          'The restructuring follows the profile rather than intuition: training is teacher-forced and already one parallel graph, while inference rolls hundreds of paths forward step by step and is two orders of magnitude more work — so paths and series fold into one row axis and every trajectory advances together, leaving the horizon as the only sequential loop. The four gates share a single weight so the joined input is read once and the gate computation is one dense GEMM, and mu and the raw sigma become adjacent columns of one head weight so the hidden state is read once for both. Gate activation and both state updates fuse into a single pass over each row, so none of the activated gates is ever a separate buffer. The generator is the other substantive change: a shared standard generator with a distribution object would serialize the sampling loop entirely, so each thread gets a private xorshift with a cached Box-Muller spare, which halves the transcendental cost. Quantiles use nth_element rather than a sort because a quantile is a selection, and the path-count helper exists because a far-tail quantile from a hundred paths is a single order statistic and is pure noise.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The fused gate projection and the merged head projection are dense products over every path of every series at once, which is the only arithmetic of any size in the sampling loop.',
            tradeoff: 'The pack of inputs and hidden state into one contiguous operand is a real copy of the whole batch every step, and on a small hidden size that copy can cost more than the GEMM it enables.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Rows are entirely independent within a step — each owns its own state, its own draw and its own generator — so there is no reduction and no shared mutable state.',
            tradeoff: 'The reproducibility contract now depends on thread count: the same seed with a different number of threads produces different trajectories, so a forecast cannot be reproduced without recording both.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias, all four gate activations, both state updates and the draw happen in one traversal of each row, so the activated gates and the distribution parameters are never materialized.',
            tradeoff: 'The raw gate pre-activations are gone by the time the step returns, which makes diagnosing a saturated forget gate — the classic reason a recurrent forecaster stops using its history — require an unfused pass.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The fused gate pass is contiguous, of known trip count and restrict-qualified, so the compiler vectorizes the exponentials and the state updates without an intrinsic in sight.',
            tradeoff: 'It depends on the hidden size being visible at compile time, so a runtime-variable width silently drops the loop to scalar with no diagnostic — and the vectorized exponential differs in low-order bits across targets, which changes the sampled trajectories.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Sampling becomes O(horizon) batched steps instead of O(paths * series * horizon) scalar cell evaluations. Illustrative, not a measured benchmark: with paths batched the wall clock is set by horizon length rather than path count, which inverts the naive cost model entirely.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// DeepAR, transcribed the way the paper reads.
//
// The model emits DISTRIBUTION PARAMETERS, not values:
//   h_t     = LSTM(h_{t-1}, y_{t-1} / nu, x_t)   recurrent state
//   mu_t    = nu * (w_mu . h_t)                   location
//   sigma_t = nu * softplus(w_sigma . h_t)        scale, forced positive
//   loss    = -log N(y_t | mu_t, sigma_t)         maximum likelihood
//
// nu is the series' own mean. Dividing the input by it and multiplying the
// outputs back is the unglamorous detail that lets one model span six orders
// of magnitude - without it the large series dominate the gradient entirely.
//
// Vec-of-Vec, index loops, one LSTM cell written out, Gaussian likelihood.

use std::f64::consts::PI;

/// A deliberately small generator, so the sampling story stays visible.
struct Lcg {
    state: u64,
    spare: Option<f64>,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1, spare: None }
    }

    fn uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 11) as f64) / ((1u64 << 53) as f64)
    }

    /// Box-Muller, caching the spare normal it produces for free.
    fn normal(&mut self, mu: f64, sigma: f64) -> f64 {
        if let Some(value) = self.spare.take() {
            return mu + sigma * value;
        }
        let u1 = self.uniform().max(1e-12);
        let u2 = self.uniform();
        let radius = (-2.0 * u1.ln()).sqrt();
        let angle = 2.0 * PI * u2;
        self.spare = Some(radius * angle.sin());
        mu + sigma * radius * angle.cos()
    }
}

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// log(1 + e^x), positive everywhere.
///
/// The scale parameter of a distribution MUST be positive, and that is a hard
/// constraint the architecture has to enforce rather than hope for. Above
/// about 30 the exponential overflows while ln_1p(exp(x)) equals x to full
/// precision, so the branch is correctness and not speed.
fn softplus(value: f64) -> f64 {
    if value > 30.0 {
        value
    } else {
        value.exp().ln_1p()
    }
}

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

struct LstmParams {
    wf: Vec<Vec<f64>>,
    wi: Vec<Vec<f64>>,
    wc: Vec<Vec<f64>>,
    wo: Vec<Vec<f64>>,
    bf: Vec<f64>,
    bi: Vec<f64>,
    bc: Vec<f64>,
    bo: Vec<f64>,
    w_mu: Vec<f64>,
    w_sigma: Vec<f64>,
    hidden_size: usize,
}

struct LstmState {
    hidden: Vec<f64>,
    cell: Vec<f64>,
}

/// One LSTM step. Four gates over the concatenated input and state.
fn lstm_cell(inputs: &[f64], state: &LstmState, params: &LstmParams) -> LstmState {
    let mut joined = inputs.to_vec();
    joined.extend_from_slice(&state.hidden);

    let forget = matvec(&params.wf, &joined, &params.bf);
    let write = matvec(&params.wi, &joined, &params.bi);
    let candidate = matvec(&params.wc, &joined, &params.bc);
    let expose = matvec(&params.wo, &joined, &params.bo);

    let mut next_cell = vec![0.0_f64; state.cell.len()];
    let mut next_hidden = vec![0.0_f64; state.hidden.len()];
    for i in 0..state.cell.len() {
        next_cell[i] =
            sigmoid(forget[i]) * state.cell[i] + sigmoid(write[i]) * candidate[i].tanh();
        next_hidden[i] = sigmoid(expose[i]) * next_cell[i].tanh();
    }

    LstmState { hidden: next_hidden, cell: next_cell }
}

/// nu = 1 + mean(history). The plus one keeps an all-zero series usable,
/// which real catalogues contain in quantity.
fn series_scale(history: &[f64]) -> f64 {
    1.0 + history.iter().sum::<f64>() / history.len() as f64
}

/// log N(value | mu, sigma). This IS the loss, negated.
fn gaussian_log_likelihood(value: f64, mu: f64, sigma: f64) -> f64 {
    let z = (value - mu) / sigma;
    -0.5 * z * z - sigma.ln() - 0.5 * (2.0 * PI).ln()
}

/// The likelihood that is actually right for demand data.
///
/// Gaussian on counts puts probability mass on negative demand, which makes
/// every lower quantile meaningless. Nothing in the training loss objects to
/// this - it simply produces a confidently incoherent interval.
fn negative_binomial_log_likelihood(count: f64, mu: f64, alpha: f64) -> f64 {
    let shape = 1.0 / alpha;
    ln_gamma(count + shape) - ln_gamma(shape) - ln_gamma(count + 1.0)
        + shape * (shape / (shape + mu)).ln()
        + count * (mu / (shape + mu)).ln()
}

/// Lanczos approximation, adequate for a reference implementation.
fn ln_gamma(x: f64) -> f64 {
    const COEFFICIENTS: [f64; 6] = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5,
    ];
    let mut y = x;
    let tmp = x + 5.5 - (x + 0.5) * (x + 5.5).ln();
    let mut series = 1.000000000190015;
    for coefficient in COEFFICIENTS {
        y += 1.0;
        series += coefficient / y;
    }
    -tmp + (2.5066282746310005 * series / x).ln()
}

/// Teacher forcing: the recurrence is unrolled against TRUE observations.
///
/// That is what makes training one parallel graph - and it is also the source
/// of exposure bias, because inference conditions on the model's own samples
/// instead and the recurrence has never seen that state.
fn train_sequence(
    history: &[f64],
    covariates: &[Vec<f64>],
    params: &LstmParams,
    scale: f64,
) -> (f64, LstmState) {
    let mut state = LstmState {
        hidden: vec![0.0; params.hidden_size],
        cell: vec![0.0; params.hidden_size],
    };
    let mut total = 0.0;

    for t in 1..history.len() {
        let mut inputs = vec![history[t - 1] / scale];
        inputs.extend_from_slice(&covariates[t]);
        state = lstm_cell(&inputs, &state, params);

        let mut mu = 0.0;
        let mut sigma_raw = 0.0;
        for i in 0..state.hidden.len() {
            mu += params.w_mu[i] * state.hidden[i];
            sigma_raw += params.w_sigma[i] * state.hidden[i];
        }
        total += gaussian_log_likelihood(history[t], scale * mu, scale * softplus(sigma_raw));
    }

    (-total, state)
}

/// One trajectory: draw, feed back, repeat.
///
/// This is the whole reason DeepAR gives a JOINT distribution over the horizon
/// rather than independent per-step quantiles. Each step's sample genuinely
/// conditions the next, so uncertainty compounds correctly.
fn sample_path(
    mut state: LstmState,
    last_value: f64,
    future_covariates: &[Vec<f64>],
    params: &LstmParams,
    scale: f64,
    rng: &mut Lcg,
) -> Vec<f64> {
    let mut path = Vec::with_capacity(future_covariates.len());
    let mut previous = last_value;

    for row in future_covariates {
        let mut inputs = vec![previous / scale];
        inputs.extend_from_slice(row);
        state = lstm_cell(&inputs, &state, params);

        let mut mu = 0.0;
        let mut sigma_raw = 0.0;
        for i in 0..state.hidden.len() {
            mu += params.w_mu[i] * state.hidden[i];
            sigma_raw += params.w_sigma[i] * state.hidden[i];
        }

        let drawn = rng.normal(scale * mu, scale * softplus(sigma_raw));
        path.push(drawn);
        previous = drawn; // the sample becomes the next input
    }
    path
}

/// The joint advantage, made concrete.
///
/// Total demand over a lead time is NOT the sum of per-step medians. Summing
/// WITHIN each path first and taking the quantile afterwards preserves the
/// correlation between steps; the other order destroys it, and the error is
/// usually in the unsafe direction.
fn lead_time_quantile(paths: &[Vec<f64>], level: f64) -> f64 {
    let mut totals: Vec<f64> = paths.iter().map(|path| path.iter().sum()).collect();
    totals.sort_by(|a, b| a.total_cmp(b));
    let index = ((level * totals.len() as f64) as usize).min(totals.len() - 1);
    totals[index]
}
`,
        profile:
          'O(T * H^2) for training and O(S * steps * H^2) for S sample paths at inference. Illustrative, not a measured benchmark: with 200 paths over a 14-step horizon that is 2,800 sequential cell evaluations per series, each allocating a joined Vec and four gate Vecs — which is why inference rather than training dominates here.',
      },

      'make-it-right': {
        code: `//! The same model, with the likelihood as a trait and the scale as a carried
//! contract.
//!
//! Two things change. The likelihood family becomes a trait with its own
//! parameter constraints, sampler and data validator, because choosing it is
//! a modelling decision rather than a flag - and a Gaussian head on count
//! data emits negative quantiles that nothing in the training loss objects
//! to. And the per-series scale becomes a type carried with the model,
//! because recomputing it at inference silently changes every forecast.

use std::fmt;

/// Width of the recurrent state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct HiddenSize(pub usize);

/// Number of sampled trajectories.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct PathCount(pub usize);

/// Forecast horizon in steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Horizon(pub usize);

#[derive(Debug, PartialEq)]
pub enum DeepArError {
    /// The data cannot have come from the chosen family.
    ///
    /// Its own variant because the failure is silent otherwise: a Gaussian
    /// head on count data trains happily and emits negative lower quantiles,
    /// and nothing in the training loop will mention it.
    LikelihoodMisspecified { reason: &'static str },
    /// A forecast was attempted without the fitted scale.
    ///
    /// The scale is part of the model artifact; recomputing it at inference
    /// from a different window changes every forecast with nothing logged.
    UnscaledSeries,
    /// Too few paths to estimate the requested quantile.
    TooFewPaths { have: usize, need: usize },
    /// An empty series, which cannot be scaled.
    EmptySeries,
    /// A buffer length that does not match the shape it should carry.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for DeepArError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::LikelihoodMisspecified { reason } => {
                write!(f, "likelihood misspecified: {reason}")
            }
            Self::UnscaledSeries => write!(
                f,
                "the fitted per-series scale must be supplied; recomputing it would \
                 silently change every forecast"
            ),
            Self::TooFewPaths { have, need } => {
                write!(f, "{have} paths cannot estimate that quantile; {need} are needed")
            }
            Self::EmptySeries => write!(f, "cannot scale an empty series"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for DeepArError {}

/// log(1 + e^x), positive everywhere, with the overflow branch.
///
/// Above about 30 the exponential overflows while ln_1p(exp(x)) equals x to
/// full precision, so the branch is correctness and not speed.
pub fn softplus(value: f64) -> f64 {
    if value > 30.0 {
        value
    } else {
        value.exp().ln_1p()
    }
}

/// A distribution family the network emits parameters for.
///
/// A trait rather than an enum because each family owns three genuinely
/// different things: how many parameters it needs, how to constrain them, and
/// how to sample from it.
pub trait Likelihood {
    fn parameter_count(&self) -> usize;

    /// Raw network outputs to valid distribution parameters.
    fn constrain(&self, raw: &[f64], scale: f64) -> Vec<f64>;

    fn log_probability(&self, value: f64, parameters: &[f64]) -> f64;

    fn sample(&self, parameters: &[f64], uniform: &mut dyn FnMut() -> f64) -> f64;

    /// Guard clause for the failure with no other symptom.
    fn validate_data(&self, values: &[f64]) -> Result<(), DeepArError>;
}

/// Correct for genuinely continuous quantities, and only those.
pub struct Gaussian;

impl Likelihood for Gaussian {
    fn parameter_count(&self) -> usize {
        2
    }

    fn constrain(&self, raw: &[f64], scale: f64) -> Vec<f64> {
        // Both parameters are multiplied back by the series scale, so the
        // network only ever works in normalized space.
        vec![scale * raw[0], scale * softplus(raw[1])]
    }

    fn log_probability(&self, value: f64, parameters: &[f64]) -> f64 {
        let z = (value - parameters[0]) / parameters[1];
        -0.5 * z * z - parameters[1].ln() - 0.5 * (2.0 * std::f64::consts::PI).ln()
    }

    fn sample(&self, parameters: &[f64], uniform: &mut dyn FnMut() -> f64) -> f64 {
        let u1 = uniform().max(1e-12);
        let u2 = uniform();
        let radius = (-2.0 * u1.ln()).sqrt();
        parameters[0] + parameters[1] * radius * (2.0 * std::f64::consts::PI * u2).cos()
    }

    fn validate_data(&self, values: &[f64]) -> Result<(), DeepArError> {
        if values.iter().all(|v| *v >= 0.0 && v.fract() == 0.0) {
            return Err(DeepArError::LikelihoodMisspecified {
                reason: "every observation is a non-negative integer; a Gaussian head \
                         emits negative lower quantiles. Use NegativeBinomial.",
            });
        }
        Ok(())
    }
}

/// The right choice for count and intermittent demand data.
pub struct NegativeBinomial;

impl Likelihood for NegativeBinomial {
    fn parameter_count(&self) -> usize {
        2
    }

    fn constrain(&self, raw: &[f64], scale: f64) -> Vec<f64> {
        // Note the asymmetry: the mean scales with the series and the
        // dispersion does NOT, because scaling a shape parameter changes the
        // family rather than its location. A common and subtle error.
        vec![scale * softplus(raw[0]), softplus(raw[1])]
    }

    fn log_probability(&self, value: f64, parameters: &[f64]) -> f64 {
        let (mu, alpha) = (parameters[0], parameters[1]);
        let shape = 1.0 / alpha;
        ln_gamma(value + shape) - ln_gamma(shape) - ln_gamma(value + 1.0)
            + shape * (shape / (shape + mu)).ln()
            + value * (mu / (shape + mu)).ln()
    }

    fn sample(&self, parameters: &[f64], uniform: &mut dyn FnMut() -> f64) -> f64 {
        // Gamma-Poisson mixture: the standard construction, and the reason
        // this family handles the overdispersion Poisson cannot.
        let rate = gamma_sample(1.0 / parameters[1], parameters[0] * parameters[1], uniform);
        poisson_sample(rate, uniform)
    }

    fn validate_data(&self, values: &[f64]) -> Result<(), DeepArError> {
        if values.iter().any(|v| *v < 0.0) {
            return Err(DeepArError::LikelihoodMisspecified {
                reason: "a count likelihood cannot model negative values",
            });
        }
        Ok(())
    }
}

fn ln_gamma(x: f64) -> f64 {
    const COEFFICIENTS: [f64; 6] = [
        76.180_091_729_471_46,
        -86.505_320_329_416_77,
        24.014_098_240_830_91,
        -1.231_739_572_450_155,
        0.001_208_650_973_866_179,
        -0.000_005_395_239_384_953,
    ];
    let mut y = x;
    let tmp = x + 5.5 - (x + 0.5) * (x + 5.5).ln();
    let mut series = 1.000_000_000_190_015;
    for coefficient in COEFFICIENTS {
        y += 1.0;
        series += coefficient / y;
    }
    -tmp + (2.506_628_274_631_000_5 * series / x).ln()
}

fn gamma_sample(shape: f64, scale: f64, uniform: &mut dyn FnMut() -> f64) -> f64 {
    // Bounded iteration: rejection sampling must never spin forever, however
    // unlikely the failing branch is.
    let mut attempts = 0;
    loop {
        attempts += 1;
        if attempts > 1000 {
            return shape * scale; // fall back to the mean rather than hang
        }
        let u = uniform().max(1e-12);
        if u.powf(1.0 / shape) < 1.0 {
            return -scale * shape * u.ln();
        }
    }
}

fn poisson_sample(rate: f64, uniform: &mut dyn FnMut() -> f64) -> f64 {
    let threshold = (-rate).exp();
    let mut count = 0.0;
    let mut product = 1.0;
    // Bounded: a large rate would otherwise spin for a very long time.
    while product > threshold && count < 10_000.0 {
        product *= uniform();
        count += 1.0;
    }
    (count - 1.0).max(0.0)
}

/// The per-series normalizer, carried WITH the model.
///
/// A distinct type because recomputing it at inference from a different
/// window silently changes every forecast, which is among the most common
/// production errors with this model.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SeriesScale(f64);

impl SeriesScale {
    pub fn from_history(history: &[f64]) -> Result<Self, DeepArError> {
        if history.is_empty() {
            return Err(DeepArError::EmptySeries);
        }
        // The plus one keeps an all-zero series usable rather than dividing
        // by zero, which real catalogues contain in quantity.
        Ok(Self(1.0 + history.iter().sum::<f64>() / history.len() as f64))
    }

    pub fn value(self) -> f64 {
        self.0
    }
}

/// Trajectories, not quantiles.
///
/// The paths come back rather than summary statistics because the joint
/// structure is the whole point: a quantile of a SUM over the horizon cannot
/// be recovered from per-step quantiles.
pub struct ForecastPaths {
    flat: Vec<f64>,
    paths: PathCount,
    horizon: Horizon,
    pub seed: u64,
}

impl ForecastPaths {
    pub fn new(flat: Vec<f64>, paths: PathCount, horizon: Horizon, seed: u64) -> Self {
        Self { flat, paths, horizon, seed }
    }

    pub fn marginal_quantile(&self, step: usize, level: f64) -> f64 {
        let mut values: Vec<f64> = (0..self.paths.0)
            .map(|p| self.flat[p * self.horizon.0 + step])
            .collect();
        Self::select(&mut values, level)
    }

    /// Sum WITHIN each path, then take the quantile.
    ///
    /// This ordering is the joint-distribution advantage. Reversing it -
    /// summing per-step quantiles - destroys the correlation between steps
    /// and is wrong in the unsafe direction.
    pub fn aggregate_quantile(&self, level: f64) -> f64 {
        let mut totals: Vec<f64> = self
            .flat
            .chunks_exact(self.horizon.0)
            .map(|path| path.iter().sum())
            .collect();
        Self::select(&mut totals, level)
    }

    fn select(values: &mut [f64], level: f64) -> f64 {
        let index = ((level * values.len() as f64) as usize).min(values.len() - 1);
        // select_nth_unstable, not a sort: a quantile is a selection, and
        // ordering the discarded paths is work thrown away.
        values.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
        values[index]
    }
}

/// How many paths a tail quantile actually needs.
///
/// The standard error of an empirical quantile scales as sqrt(p(1-p)/n) over
/// the density, so a far tail needs far more paths than the body. Worth
/// computing rather than defaulting to 100 and hoping - a 1st percentile from
/// 100 paths is a single order statistic and is pure noise.
pub fn paths_for_tail(level: f64, relative_error: f64) -> PathCount {
    let tail = level.min(1.0 - level);
    PathCount((tail * (1.0 - tail) / (relative_error * tail).powi(2)).ceil() as usize)
}
`,
        rationale:
          'Two things change and both concern failures that are otherwise silent. The likelihood family becomes a trait rather than a branch, because each family genuinely owns three different things — its parameter count, how those parameters must be constrained, and how to sample from it — and because choosing it is a modelling commitment rather than a configuration detail. It also gains a data validator: a Gaussian head on count data trains happily and emits negative lower quantiles, so the family refuses plainly integer non-negative data rather than letting the incoherence reach production. The asymmetry in the negative binomial constraint is called out because it is easy to get wrong: the mean scales with the series and the dispersion does not, since scaling a shape parameter changes the family rather than its location. Both rejection samplers carry explicit iteration bounds, because a sampler that can spin forever in a forecasting loop is a production outage rather than a slow path. The per-series scale becomes a newtype that must be supplied rather than recomputed, since a scale from a different window is a different model, and quantiles use select_nth_unstable rather than a sort because a quantile is a selection.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same asymptotics, with quantile selection dropping from O(S log S) to O(S). Illustrative, not a measured benchmark: the trait object adds an indirect call per step, which against a hidden-state matrix product is immeasurable.',
      },

      'make-it-fast': {
        code: `//! Sampling is the cost, so sampling is what batches.
//!
//! The structural observation: training is teacher-forced and therefore one
//! parallel graph, but inference rolls S paths forward step by step and that
//! is two orders of magnitude more work. So the paths become a BATCH
//! DIMENSION - every trajectory of every series takes step t together, and
//! the only sequential loop left is over the horizon.
//!
//! Three changes:
//!   1. The four gates share ONE weight of 4H columns, so the joined input is
//!      read once and the gate computation is a single matrix product.
//!   2. Paths and series fold into one row axis, so a step is one
//!      (series * paths, hidden) product rather than a nested loop.
//!   3. Per-row generators seeded from the row index, because a shared
//!      generator would serialize the sampling loop entirely - and seeding
//!      by row rather than by thread keeps the result reproducible.

use ndarray::{s, Array1, Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Three-shift xorshift with a cached Box-Muller spare. One per row, so the
/// state never crosses a thread boundary and the stream is reproducible
/// regardless of how rayon schedules the work.
pub struct FastRng {
    state: u64,
    spare: f32,
    has_spare: bool,
}

impl FastRng {
    #[inline]
    pub fn new(seed: u64) -> Self {
        Self { state: seed | 1, spare: 0.0, has_spare: false }
    }

    #[inline]
    fn uniform(&mut self) -> f32 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        (self.state >> 40) as f32 * (1.0 / 16_777_216.0)
    }

    /// Box-Muller produces two normals per pair of uniforms; caching the
    /// spare halves the transcendental cost of the sampling loop.
    #[inline]
    pub fn normal(&mut self) -> f32 {
        if self.has_spare {
            self.has_spare = false;
            return self.spare;
        }
        let u1 = self.uniform().max(1e-7);
        let u2 = self.uniform();
        let radius = (-2.0 * u1.ln()).sqrt();
        let angle = 6.283_185_3 * u2;
        self.spare = radius * angle.sin();
        self.has_spare = true;
        radius * angle.cos()
    }
}

#[inline]
fn softplus(value: f32) -> f32 {
    // Above about 30 the exponential overflows while ln_1p(exp(x)) equals x
    // to full precision, so the branch is correctness rather than speed.
    if value > 30.0 {
        value
    } else {
        value.exp().ln_1p()
    }
}

/// Every path of every series advances together.
pub struct BatchedSampler {
    rows: usize,
    input_size: usize,
    hidden_size: usize,
    /// Scratch sized once at construction and sliced per step, so the
    /// sampling loop never touches the allocator.
    joined: Array2<f32>,
    gates: Array2<f32>,
    head: Array2<f32>,
}

impl BatchedSampler {
    pub fn new(rows: usize, input_size: usize, hidden_size: usize) -> Self {
        Self {
            rows,
            input_size,
            hidden_size,
            joined: Array2::zeros((rows, input_size + hidden_size)),
            gates: Array2::zeros((rows, 4 * hidden_size)),
            head: Array2::zeros((rows, 2)),
        }
    }

    /// \`hidden\` and \`cell\` are (rows, hidden_size) and are updated IN PLACE.
    /// \`gate_weight\` is ((input + hidden), 4H): all four gates side by side,
    /// so the joined input is read once rather than four times.
    #[allow(clippy::too_many_arguments)]
    pub fn step(
        &mut self,
        inputs: ArrayView2<'_, f32>,
        gate_weight: ArrayView2<'_, f32>,
        gate_bias: &[f32],
        head_weight: ArrayView2<'_, f32>,
        hidden: &mut Array2<f32>,
        cell: &mut Array2<f32>,
        row_scale: &[f32],
        generators: &mut [FastRng],
        drawn: &mut Array1<f32>,
    ) {
        // Pack inputs and state into one contiguous operand so the gate
        // product is a single dense GEMM rather than two strided ones.
        self.joined
            .slice_mut(s![.., ..self.input_size])
            .assign(&inputs);
        self.joined
            .slice_mut(s![.., self.input_size..])
            .assign(hidden);

        self.gates.assign(&self.joined.dot(&gate_weight));
        // One product for both head projections: mu and the raw sigma are
        // adjacent columns, so the hidden state is read once for both.
        self.head.assign(&hidden.dot(&head_weight));

        let h = self.hidden_size;
        // Rows are entirely independent within a step: own state, own draw,
        // own generator. No reduction and no shared mutable state anywhere.
        Zip::from(self.gates.axis_iter(Axis(0)))
            .and(hidden.axis_iter_mut(Axis(0)))
            .and(cell.axis_iter_mut(Axis(0)))
            .and(self.head.axis_iter(Axis(0)))
            .and(drawn)
            .and(row_scale)
            .and(generators)
            .par_for_each(|gate_row, mut hidden_row, mut cell_row, head_row, out, &scale, rng| {
                // Gate activation and both state updates fused into one pass:
                // none of the activated gates is ever a separate buffer.
                for i in 0..h {
                    let forget = 1.0 / (1.0 + (-(gate_row[i] + gate_bias[i])).exp());
                    let write = 1.0 / (1.0 + (-(gate_row[h + i] + gate_bias[h + i])).exp());
                    let candidate = (gate_row[2 * h + i] + gate_bias[2 * h + i]).tanh();
                    let expose =
                        1.0 / (1.0 + (-(gate_row[3 * h + i] + gate_bias[3 * h + i])).exp());
                    cell_row[i] = forget * cell_row[i] + write * candidate;
                    hidden_row[i] = expose * cell_row[i].tanh();
                }

                let mu = scale * head_row[0];
                let sigma = scale * softplus(head_row[1]);
                *out = mu + sigma * rng.normal();
            });
    }

    pub fn rows(&self) -> usize {
        self.rows
    }
}

/// Sum WITHIN each path, then select the quantile over paths.
///
/// This ordering is the joint-distribution advantage; summing per-step
/// quantiles destroys the correlation between steps and is wrong in the
/// unsafe direction for any aggregating decision.
pub fn aggregate_quantile(paths: &[f32], horizon: usize, level: f32) -> f32 {
    let mut totals: Vec<f32> = paths
        .par_chunks_exact(horizon)
        .map(|path| path.iter().sum())
        .collect();

    let index = ((level * totals.len() as f32) as usize).min(totals.len() - 1);
    // select_nth_unstable, not a sort: a quantile is a selection, and
    // ordering the discarded paths is work whose result is thrown away.
    totals.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
    totals[index]
}

/// Per-row generators seeded from the row index.
///
/// Seeding by row rather than by thread is what keeps the forecast
/// reproducible: rayon may schedule rows across threads differently between
/// runs, and a thread-seeded generator would change the trajectories.
pub fn seed_generators(rows: usize, seed: u64) -> Vec<FastRng> {
    (0..rows)
        .map(|row| FastRng::new(seed ^ (row as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15)))
        .collect()
}

/// How many paths a tail quantile actually needs.
///
/// The standard error of an empirical quantile scales as sqrt(p(1-p)/n) over
/// the density, so a far tail needs far more paths than the body. A 1st
/// percentile from 100 paths is one order statistic and is pure noise.
pub fn paths_for_tail(level: f64, relative_error: f64) -> usize {
    let tail = level.min(1.0 - level);
    (tail * (1.0 - tail) / (relative_error * tail).powi(2)).ceil() as usize
}
`,
        rationale:
          'The restructuring follows the profile rather than intuition: training is teacher-forced and already one parallel graph, while inference rolls hundreds of paths forward step by step and is two orders of magnitude more work — so paths and series fold into one row axis and every trajectory advances together, leaving the horizon as the only sequential loop. The four gates share a single weight so the joined input is read once and the gate computation is one dense product, and mu and the raw sigma become adjacent columns of one head weight so the hidden state is read once for both. Gate activation and both state updates fuse into a single pass over each row. The generator choice carries a design decision worth noting: generators are seeded per row rather than per thread, because rayon may distribute rows differently between runs and a thread-seeded stream would make the same forecast irreproducible — seeding by row costs a little memory and buys a reproducibility guarantee that survives scheduling. Quantiles use select_nth_unstable rather than a sort, and the path-count helper exists because a far-tail quantile from a hundred paths is a single order statistic and is pure noise.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The fused gate projection and the merged head projection are dense products over every path of every series at once, which is the only arithmetic of any size in the sampling loop.',
            tradeoff: 'Binds the build to a system BLAS, and packing the inputs and hidden state into one contiguous operand is a real copy of the whole batch every step — on a small hidden size that copy can cost more than the product it enables.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Rows are entirely independent within a step, each owning its own state, draw and generator, so the fused pass is a parallel zip with no reduction and no shared mutable state.',
            tradeoff: 'The parallel pass is memory-bound rather than compute-bound, so it competes for bandwidth with the BLAS call before it, and threading both at once can slow the step rather than speed it.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The generator methods and the softplus are a handful of operations each and are called once per row per step, so a call boundary there would cost more than the work.',
            tradeoff: 'Inlining the generator into the fused gate pass inflates a loop body that is already large, and past a point that costs more in instruction-cache pressure than the avoided calls recover.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Scratch is allocated once at construction and sliced per step, so the joined operand, the gates and the head projection are all standard-layout and no step reallocates.',
            tradeoff: 'The scratch is sized for the full path-times-series row count and held for the sampler’s lifetime, so an instance kept alive between small forecasts holds that footprint permanently.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Sampling becomes O(horizon) batched steps instead of O(paths * series * horizon) scalar cell evaluations. Illustrative, not a measured benchmark: with paths batched the wall clock is set by horizon length rather than path count, which inverts the naive cost model entirely.',
      },
    },
  },
};
