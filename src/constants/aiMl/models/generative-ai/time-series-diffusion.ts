import type { AiMlModel } from '../../types';

/**
 * Time-series diffusion & foundation models — the entry where forecasting
 * meets pretraining, and where the claims need the most careful handling.
 *
 * Covers two related developments: conditional diffusion applied to series,
 * where forecasting and imputation become one operation; and pretrained
 * forecasters that produce a forecast for a series they have never seen.
 * Both are genuinely new capabilities, and both are surrounded by evaluation
 * problems that the marketing does not mention.
 */
export const TIME_SERIES_DIFFUSION: AiMlModel = {
  slug: 'time-series-diffusion',
  name: 'Time-Series Diffusion & Foundation Models',
  aliases: ['TimeGrad', 'CSDI', 'TSDiff', 'Chronos', 'TimesFM', 'Moirai', 'Lag-Llama', 'Zero-shot forecasting'],
  category: 'generative-ai',
  group: 'diffusion',
  kind: 'model',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['generation', 'regression', 'sequence-modeling', 'anomaly-detection'],
  paradigmNote:
    'Self-supervised is the interesting half: a foundation forecaster is pretrained on a corpus of unrelated series by predicting masked or future segments, with no task labels anywhere, and is then applied zero-shot to a series it has never seen. Supervised appears because fine-tuning on a target panel is the common and usually better deployment, and because the diffusion variants are trained on explicit history-to-horizon pairs.',

  intuition:
    'Two ideas arriving at the same time. The first: a forecast and an imputation are the same operation — some values are known and some are not, and a conditional generative model fills in the unknown ones. Mask the future and you get forecasting; mask the middle and you get imputation; the model does not distinguish. The second: a model pretrained on millions of unrelated series learns what series look like in general, so it can forecast one it has never seen without being fitted to it. That is a genuinely new capability for forecasting, and it is also the one that most needs careful evaluation, because the corpus is enormous and the benchmarks are public.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\mathbb{E}_{t,\\mathbf{x},\\boldsymbol{\\epsilon}}\\Bigl[\\bigl\\lVert \\mathbf{m}\\odot\\bigl(\\boldsymbol{\\epsilon} - \\boldsymbol{\\epsilon}_\\theta(\\mathbf{x}_t, t, \\mathbf{x}_{\\text{obs}}, \\mathbf{m})\\bigr)\\bigr\\rVert^2\\Bigr]',
      symbols: [
        { symbol: '\\mathbf{m}', meaning: 'the target mask: which positions are being predicted. Forecasting and imputation differ only in this' },
        { symbol: '\\mathbf{x}_{\\text{obs}}', meaning: 'the observed values, supplied as conditioning at every denoising step rather than only at the start' },
        { symbol: '\\boldsymbol{\\epsilon}_\\theta', meaning: 'the denoiser, conditioned on both what is observed and which positions are being asked for' },
        { symbol: 't', meaning: 'the diffusion timestep — unrelated to the series time index, and confusing them is a real source of bugs' },
      ],
    },
    reading:
      'Read the mask as the whole idea. The loss is applied only where the mask says a value is being predicted, and the observed values enter as conditioning rather than as targets — so the identical objective trains a forecaster when the mask covers the future and an imputer when it covers gaps. Training randomizes the mask, which means one model handles both and handles arbitrary missingness patterns without a separate design. The notational hazard is worth naming because it causes real bugs: t here is the diffusion step, not the position in the series, and the two index completely different axes.',
  },

  optimization: {
    method: 'Adam on the masked noise-prediction loss, with randomized masks during training and the observed values re-imposed at every sampling step',
    updateRule: {
      formula:
        '\\mathbf{x}_{t-1} \\leftarrow \\mathbf{m}\\odot \\mathrm{denoise}(\\mathbf{x}_t, t) + (1-\\mathbf{m})\\odot q\\bigl(\\mathbf{x}_{t-1}\\mid \\mathbf{x}_{\\text{obs}}\\bigr)',
      symbols: [
        { symbol: '(1-\\mathbf{m})\\odot q(\\cdot)', meaning: 'the observed positions re-noised to the current level and re-imposed — the step everyone forgets' },
        { symbol: '\\mathbf{m}\\odot\\mathrm{denoise}', meaning: 'only the masked positions take the model’s prediction' },
        { symbol: '\\mathrm{scale}(\\mathbf{x})', meaning: 'per-window normalization, which for a foundation model is what makes one model span every series scale' },
      ],
    },
    rationale:
      'The sampling detail that matters is re-imposing the observed values at every step rather than only at initialization. If the known positions are fixed once and then left alone, the denoiser drifts away from them as it works — it is filling a canvas and has no reason to respect a region it was not asked about — so the reconstruction ends up inconsistent with the data you actually had. Re-noising the observed values to the current noise level and substituting them back at every step keeps the trajectory anchored, and it is the single most commonly omitted step in implementations. For the foundation-model half, the operationally important detail is per-window scaling: a pretraining corpus spans many orders of magnitude, and normalizing each window before the model sees it is what allows a single set of weights to serve a series measured in units and one measured in millions. That scaler is part of the inference path, not preprocessing.',
    hyperparameters: [
      { name: 'mask strategy', role: 'What the training masks look like. It determines which tasks the model can do; a forecast-only mask gives a model that imputes badly', typicalRange: 'random / block / forecast' },
      { name: 'sampling steps', role: 'The quality-versus-latency dial, multiplied by trajectories per series and series in the panel — which is where the cost problem lives', typicalRange: '10 to 100' },
      { name: 'trajectories per series', role: 'How many samples define the predictive distribution. Too few and tail quantiles are noise', typicalRange: '50 to 500' },
      { name: 'context length', role: 'History the model conditions on. Foundation models fix this at pretraining and it cannot be exceeded', typicalRange: '96 to 2048 steps' },
      { name: 'scaling strategy', role: 'Per-window normalization. What lets one model span every magnitude, and part of the inference path rather than preprocessing', typicalRange: 'mean / standard / robust' },
      { name: 'fine-tune versus zero-shot', role: 'A compute-allocation decision rather than a modelling one; fine-tuning almost always wins if any target data exists', typicalRange: 'zero-shot / LoRA / full' },
    ],
    convergence:
      'Training inherits diffusion’s good behaviour — one regression loss against a known target, stable, no equilibrium. The difficulties are in evaluation rather than optimization, and they are serious enough to be the main thing worth knowing. Foundation forecasters are pretrained on corpora assembled from public sources, and the standard forecasting benchmarks are public, so contamination is a live possibility that is genuinely hard to rule out — a zero-shot result on a public benchmark may not be zero-shot at all. Separately, the headline comparisons frequently omit properly tuned classical baselines, and seasonal-naive, exponential smoothing and a well-configured gradient booster remain competitive on a large fraction of real panels. Neither point means the models are not useful; both mean that a claimed improvement needs to be re-verified on your own data before it is believed.',
    complexity:
      'Training is O(1) network evaluations per example. Inference is the problem: steps times trajectories times series. A hundred trajectories at fifty steps across ten thousand series is fifty million network evaluations for one forecast cycle, which is a different operational regime from every classical forecaster and is the constraint that decides feasibility.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'For the diffusion half: condition on the observed history and mask the horizon, then sample trajectories that form the predictive distribution. For the foundation half: pass the history to a pretrained model and read the forecast, with no fitting at all — or fine-tune on the target panel if any of it exists, which almost always helps.',
        where: [
          'Cold-start forecasting for a series with too little history to fit anything, where zero-shot is the only option',
          'Imputation and forecasting from one model, since the mask is the only difference between them',
          'Panels with many short series, where pretrained structure substitutes for the data each series lacks',
          'Rapid baselining — a foundation model gives a non-trivial forecast in minutes, which is genuinely useful as a starting point',
        ],
        why: 'Zero-shot forecasting is a real new capability and the cold-start case is where it is unambiguously valuable: a series with thirty observations cannot support a fitted model, and a pretrained one produces something reasonable immediately. Unifying forecasting and imputation is the diffusion half’s genuine contribution, because ragged real-world panels need both and maintaining two models is a real cost. But the claims need care. Contamination between pretraining corpora and public benchmarks is difficult to exclude, published comparisons frequently omit tuned classical baselines, and inference cost is orders of magnitude above an ARIMA fit. The honest position is that these are excellent for cold start and rapid baselining, competitive after fine-tuning, and not automatically better than a well-tuned conventional model on a panel you have data for.',
        featurization: [
          'Scale per window, since that is what lets one model span magnitudes — and persist the scaler, because it is part of inference rather than preprocessing',
          'Randomize masks during training so one model handles forecasting and arbitrary missingness rather than only the pattern it saw',
          'Re-impose observed values at every sampling step, not only at initialization; omitting this is the most common implementation error',
          'Fine-tune if any target data exists at all — the gain over zero-shot is usually large and the cost is small',
          'Respect the pretrained context length, which cannot be exceeded and silently truncates if you try',
        ],
        evaluation:
          'Rolling-origin backtesting against seasonal-naive, exponential smoothing and a tuned gradient booster — all three, because the published comparisons frequently omit them and they win more often than the headline results suggest. For any zero-shot claim, verify on data that provably postdates the pretraining corpus, since contamination on public benchmarks cannot otherwise be excluded. Report step count and trajectory count with every number.',
        pitfalls: [
          'Accepting a published zero-shot benchmark result without checking for corpus contamination',
          'Skipping the classical baselines, which are competitive far more often than the literature implies',
          'Not re-imposing observed values at every sampling step, so the reconstruction drifts from the known data',
          'Inference cost making a large panel infeasible within the forecasting cycle',
          'Exceeding the pretrained context length, which truncates silently',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Mask a window and ask the model to reconstruct it from its surroundings, then compare. Because the model is conditioned on both sides rather than only the past, this is a stronger reconstruction than a forecaster’s — and the sampled distribution gives a calibrated notion of how surprising the observed value is rather than just a residual.',
        where: [
          'Retrospective anomaly detection where future context is available and should be used',
          'Detecting anomalies in the middle of a record rather than at its end',
          'Multivariate detection where one channel can be reconstructed from the others',
          'Settings needing a predictive distribution rather than a point residual for the score',
        ],
        why: 'Two-sided conditioning is a genuine advantage over a forecaster-based detector, since a value that is unremarkable given the past and implausible given what followed is exactly the case a one-sided model misses. The sampled distribution also gives a principled score rather than a thresholded residual. Against it: this is retrospective by construction, so it cannot detect in real time; sampling cost makes scoring expensive per window; and if the pretraining corpus contained similar anomalies the model will reconstruct them faithfully, which is a failure mode specific to pretrained models and does not exist for a model fitted only on your normal data.',
        featurization: [
          'Mask a window wider than the anomaly you expect, or the model reconstructs the anomaly from its own edges',
          'Score by position in the sampled distribution rather than by distance to the mean, which is the advantage of having a distribution at all',
          'Use a deterministic sampler so the same window gives the same score between runs',
          'Be explicit that this is retrospective; it is not a streaming detector and cannot be made into one',
        ],
        evaluation:
          'Precision and recall on labelled incidents with a detection window, against a forecast-residual detector on the same data — that comparison isolates what two-sided conditioning contributes. Report scoring latency per window, which is what decides deployability.',
        pitfalls: [
          'Treating it as a streaming detector when it structurally requires future context',
          'Masks too narrow, so the anomaly is reconstructed from its own surroundings',
          'A pretrained model reconstructing anomalies it saw during pretraining',
          'Sampling cost making per-window scoring impractical at panel scale',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'The interesting optimization question here is not the training but the allocation. Inference cost is steps times trajectories times series, and all three are dials; the quality obtained per unit of compute differs sharply between spending it on more sampling steps, more trajectories, or fine-tuning the model instead. Fine-tuning in particular is a compute-allocation decision rather than a modelling one, and a small amount of it usually beats a large amount of extra sampling.',
        where: [
          'Allocating a fixed inference budget across steps, trajectories and series',
          'Fine-tuning versus zero-shot as a compute trade, where a little adaptation usually beats more sampling',
          'Parameter-efficient adaptation, getting most of the fine-tuning benefit for a fraction of the cost',
          'Deciding sampling depth per series by value rather than uniformly, since not every series justifies the same budget',
        ],
        why: 'Worth studying because the levers are unusually explicit and the right answer is usually counterintuitive: given a fixed budget, most people spend it on sampling steps, and most of the time a modest fine-tune plus fewer steps wins. The per-series allocation question is also real and rarely asked — a panel has a long tail of low-value series that do not justify a hundred trajectories, and spending uniformly across them is straightforwardly wasteful. What this is not is a solver: the forecast feeds a downstream decision, and treating the sampling budget as the only optimization available misses that the decision itself has structure.',
        featurization: [
          'Measure quality against inference cost across steps, trajectories and fine-tuning separately, since they trade very differently',
          'Prefer parameter-efficient fine-tuning, which captures most of the benefit at a small fraction of the cost',
          'Allocate trajectories by decision value rather than uniformly across the panel',
          'Cache and reuse forecasts where the decision cadence is slower than the data cadence',
        ],
        evaluation:
          'Plot forecast quality against total inference cost for each allocation, which is the actual result — a single accuracy number at an unstated budget says nothing about whether the budget was well spent. Compare against the cost of simply fitting a classical model per series, which is frequently a fraction of the sampling cost.',
        pitfalls: [
          'Spending the whole budget on sampling steps when a small fine-tune would have bought more',
          'Uniform allocation across a panel with a long tail of low-value series',
          'Ignoring that a per-series classical fit may cost less than one sampled forecast',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Sampled trajectories feed an operational plan as a scenario set, exactly as with any probabilistic forecaster — with the difference that a pretrained model produces them for a newly instrumented asset with no history, which is precisely when a plan is hardest to make.',
        where: [
          'Planning for new assets, sites or products with no operating history',
          'Rapid scenario generation when a new situation arises faster than a model can be fitted',
          'Panels with many short-lived entities where per-entity fitting is impractical',
        ],
        why: 'The cold-start argument carries directly into operations and is the strongest case: a new site has no history, a plan is still needed, and a pretrained forecaster gives something defensible immediately. Against it, the constraints are the familiar ones sharpened by an operational context — inference cost inside a short planning cycle, a pretrained model with no knowledge of your specific operational dynamics, and no error bound anywhere. Treat it as a starting point that is replaced as real data accumulates, rather than as a permanent component.',
        featurization: [
          'Match the horizon to the decision lead time; sampled steps beyond it are pure cost',
          'Fine-tune as soon as any operating history exists, since the gain is immediate',
          'Budget inference explicitly against the planning cycle, which is the constraint that usually binds',
        ],
        evaluation:
          'Regret against the hindsight-optimal plan, and a scheduled re-comparison against a conventional model fitted on the accumulating data — the point at which the conventional model wins is the point to switch.',
        pitfalls: [
          'Keeping the pretrained model after enough data exists to fit a better conventional one',
          'Sampling cost breaking a short planning cycle',
          'No error bound in a setting where one is expected',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Forecasting risk aggregates — claim volumes, transaction counts, exposure — where the sampled distribution’s tail drives a reserve or capacity decision, and where a pretrained model covers segments too small to fit individually.',
        where: [
          'Tail forecasting for reserving, where the upper quantile is the decision-relevant quantity',
          'Long-tail segment forecasting where per-segment fitting is impractical',
          'Rapid scenario generation for stress testing',
        ],
        why: 'Covering a long tail of small segments without fitting each one is a real operational saving, and the sampled distribution gives the tail directly rather than through an assumed error model. The caveats are heavier here than elsewhere. A pretrained model has no knowledge of your specific risk dynamics and cannot be assumed to have learned them from unrelated series; far-tail quantiles need many trajectories to estimate stably, which multiplies an already high cost; and regulated contexts generally require model explainability and validation evidence that a large pretrained forecaster cannot easily provide. This belongs as a complement rather than as a system of record.',
        featurization: [
          'Draw substantially more trajectories than the default when a far-tail quantile drives the decision',
          'Forecast at the aggregation level the decision is made at, since entity-level noise swamps the signal',
          'Validate tail coverage explicitly on held-out periods, which is the only part of the distribution the decision uses',
          'Document provenance and validation carefully, since a pretrained model in a regulated context attracts scrutiny',
        ],
        evaluation:
          'Quantile loss at the decision-relevant levels plus empirical exceedance against nominal, backtested strictly by time. A reserving model validated on a random split is meaningless, and a pretrained one additionally needs evidence that the evaluation period postdates the pretraining corpus.',
        pitfalls: [
          'Assuming pretraining on unrelated series transfers to your specific risk dynamics',
          'Far-tail quantiles estimated from too few trajectories, so the reserve moves with the seed',
          'Regulatory validation requirements that a large pretrained model cannot readily satisfy',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Pretraining is a large-scale undertaking that essentially nobody repeats — the practical decision is which pretrained model to start from. Fine-tuning is hours, and parameter-efficient fine-tuning is less, which makes adaptation the affordable half by a wide margin.',
    inferenceProfile:
      'The binding constraint, and the number that decides feasibility: steps times trajectories times series. A hundred trajectories at fifty steps across ten thousand series is fifty million network evaluations per cycle. Every deployment design for this family starts from that arithmetic rather than arriving at it.',
    retrainingCadence:
      'The base model is replaced rather than retrained. Fine-tuned adapters are refreshed as the target data accumulates, which is cheap and should be frequent early in a deployment.',
    driftAndMonitoring: [
      'Compare against a classical baseline continuously in production, not only at selection time — the pretrained advantage can erode as target data accumulates and the classical model improves',
      'Track the fraction of series whose context exceeds the pretrained window, which truncates silently',
      'Report step and trajectory counts with every quality measurement, since both change the result as much as the model does',
      'Monitor per-window scaler statistics, since a series drifting outside the range the model was pretrained on degrades without any error',
    ],
    productionGotchas: [
      'Inference cost is steps times trajectories times series and it is easy to under-plan by an order of magnitude. This arithmetic belongs at the start of the design, not at the end',
      'Observed values must be re-imposed at every sampling step. Fixing them only at initialization lets the denoiser drift away from data you actually had, and it is the single most common implementation error',
      'The pretrained context length is a hard limit. A longer history is silently truncated, and the truncation is not reported anywhere',
      'Per-window scaling is part of the inference path, not preprocessing. A scaler computed differently at serving time changes every forecast',
      'Zero-shot benchmark results may be contaminated. Before trusting one, verify on data that provably postdates the pretraining corpus',
      'The diffusion timestep and the series time index are different axes. Confusing them is a real and surprisingly common source of bugs',
    ],
  },

  assumptions: [
    'Series in the pretraining corpus are similar enough to the target that the learned structure transfers — the load-bearing assumption for anything zero-shot',
    'Per-window scaling makes series of wildly different magnitude comparable to a single model',
    'The forecast horizon and context fit inside the pretrained window, since neither can be exceeded',
    'Inference compute is available at panel scale, which is the constraint that most often makes this infeasible',
    'The evaluation data genuinely postdates the pretraining corpus, which is difficult to establish and frequently assumed',
  ],

  pros: [
    {
      point: 'Zero-shot forecasting for a series with no history',
      context:
        'A genuinely new capability, and the cold-start case is where it is unambiguously valuable: thirty observations cannot support a fitted model, and a pretrained one gives something reasonable immediately.',
    },
    {
      point: 'Forecasting and imputation are the same operation',
      context:
        'Only the mask differs, so one model covers both — and ragged real panels need both. Maintaining two models is a real cost this removes.',
    },
    {
      point: 'Full predictive distributions, jointly consistent',
      context:
        'Sampled trajectories preserve correlation across horizons and channels, which is what any decision aggregating over time actually needs and what marginal quantiles cannot give.',
    },
    {
      point: 'Immediate non-trivial baseline',
      context:
        'Minutes to a defensible forecast with no fitting, which is genuinely useful for establishing what is achievable before investing in a bespoke model.',
    },
  ],

  cons: [
    {
      point: 'Inference cost is the binding constraint',
      context:
        'Steps times trajectories times series puts this in a different operational regime from every classical forecaster. The arithmetic decides feasibility and is routinely under-planned by an order of magnitude.',
    },
    {
      point: 'Benchmark contamination is hard to exclude',
      context:
        'Pretraining corpora are assembled from public sources and forecasting benchmarks are public. A zero-shot result on a public benchmark may not be zero-shot, and establishing otherwise is genuinely difficult.',
    },
    {
      point: 'Classical baselines are competitive more often than claimed',
      context:
        'Seasonal-naive, exponential smoothing and a tuned booster win on a large fraction of real panels, and published comparisons frequently omit them. Re-verify on your own data before believing a headline.',
    },
    {
      point: 'Fixed context and horizon',
      context:
        'Pretrained windows cannot be exceeded, and a longer history is silently truncated with nothing logged. A real constraint that surfaces only as unexplained accuracy loss.',
    },
    {
      point: 'No mechanism for domain covariates',
      context:
        'A pretrained model knows nothing about your promotions or your holiday calendar, and most have no covariate path at all. Where covariates drive the signal, a purpose-built model wins clearly.',
    },
  ],

  relatedSlugs: ['ddpm', 'score-based-flow-matching', 'deepar', 'temporal-fusion-transformer', 'decoder-only-lm'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Masked conditional diffusion for time series, transcribed literally.

The central idea is the MASK. A forecast and an imputation are the same
operation - some values are known and some are not:

    mask = 0  ->  observed, conditioning
    mask = 1  ->  unknown, predicted

Mask the tail and it is forecasting. Mask the middle and it is imputation. The
model does not distinguish, and randomizing the mask during training is what
makes one model handle both.

NOTATIONAL HAZARD, and a real source of bugs: \`t\` below is the DIFFUSION
timestep, not the position in the series. They index completely different axes
and are both conventionally called t.

Plain loops, no libraries.
"""

import math
import random

SEED = 37


def build_schedule(steps):
    """Cosine schedule, as in the DDPM entry. Fixed, not learned."""
    def f(index):
        angle = ((index / steps) + 0.008) / 1.008 * math.pi / 2.0
        return math.cos(angle) ** 2

    bars = [f(index) / f(0) for index in range(steps + 1)]
    alpha_bars = bars[1:]

    return {
        'alpha_bars': alpha_bars,
        'sqrt_alpha_bars': [math.sqrt(a) for a in alpha_bars],
        'sqrt_one_minus': [math.sqrt(1.0 - a) for a in alpha_bars],
    }


def scale_window(window, mask):
    """Per-window normalization, computed from the OBSERVED values only.

    This is what lets one model span series measured in units and series
    measured in millions. Two details matter. It uses only the observed
    positions, because including the masked ones would leak the answer. And
    it is part of the INFERENCE path rather than preprocessing - a scaler
    computed differently at serving time changes every forecast.
    """
    observed = [value for value, m in zip(window, mask) if m == 0]
    if not observed:
        return list(window), 0.0, 1.0

    mean = sum(observed) / len(observed)
    variance = sum((value - mean) ** 2 for value in observed) / len(observed)
    scale = math.sqrt(variance) or 1.0

    return [(value - mean) / scale for value in window], mean, scale


def random_mask(length, rng, strategy='mixed'):
    """Randomize the mask during training.

    A model trained only on tail masks forecasts and imputes badly; a model
    trained on mixed masks does both. The mask strategy determines which tasks
    the model can perform, which makes it a modelling decision rather than a
    data-loading detail.
    """
    if strategy == 'forecast' or (strategy == 'mixed' and rng.random() < 0.5):
        cut = rng.randrange(length // 2, length)
        return [0] * cut + [1] * (length - cut)

    # Block missingness: a contiguous gap somewhere in the middle.
    start = rng.randrange(0, length - length // 4)
    width = rng.randrange(1, length // 4 + 1)
    return [1 if start <= index < start + width else 0 for index in range(length)]


def denoiser(x_t, t, observed, mask, params):
    """Conditioned on the noisy target, the timestep, AND the observed values.

    The observed values and the mask are both inputs at every step. Supplying
    them only at initialization is the classic mistake - see reverse_step.
    """
    features = list(x_t) + list(observed) + [float(m) for m in mask] + [t / 100.0]

    hidden = []
    for row, bias in zip(params['w1'], params['b1']):
        total = bias + sum(w * v for w, v in zip(row, features))
        hidden.append(math.tanh(total))

    return [
        bias + sum(w * h for w, h in zip(row, hidden))
        for row, bias in zip(params['w2'], params['b2'])
    ]


def training_loss(window, params, schedule, rng):
    """Masked noise prediction. The loss applies ONLY where the mask is one.

    Everything outside the mask is conditioning, not a target - which is
    exactly what makes forecasting and imputation the same objective.
    """
    mask = random_mask(len(window), rng)
    scaled, _, _ = scale_window(window, mask)

    t = rng.randrange(len(schedule['alpha_bars']))
    signal = schedule['sqrt_alpha_bars'][t]
    noise_scale = schedule['sqrt_one_minus'][t]

    epsilon = [rng.gauss(0.0, 1.0) for _ in scaled]
    x_t = [signal * value + noise_scale * e for value, e in zip(scaled, epsilon)]

    # Observed positions are passed through unnoised as conditioning.
    observed = [0.0 if m else value for value, m in zip(scaled, mask)]
    predicted = denoiser(x_t, t, observed, mask, params)

    counted = sum(mask)
    if counted == 0:
        raise ValueError('a mask with nothing to predict trains on nothing')

    total = 0.0
    for e, p, m in zip(epsilon, predicted, mask):
        if m:
            total += (e - p) ** 2
    return total / counted


def reverse_step(x_t, t, observed, mask, params, schedule, rng, alphas):
    """One denoising step, with the observed values RE-IMPOSED.

    This is the step everyone forgets, and its absence is the single most
    common implementation error in this family.

    If the known positions are fixed once at initialization and then left
    alone, the denoiser drifts away from them as it works - it is filling a
    canvas and has no reason to respect a region it was not asked about. So
    the reconstruction ends up inconsistent with data you actually had.

    Re-noising the observed values to the CURRENT noise level and substituting
    them back at every step keeps the trajectory anchored to the real data.
    """
    predicted = denoiser(x_t, t, observed, mask, params)

    alpha = alphas[t]
    alpha_bar = schedule['alpha_bars'][t]
    coefficient = (1.0 - alpha) / math.sqrt(1.0 - alpha_bar)

    denoised = [
        (value - coefficient * p) / math.sqrt(alpha)
        for value, p in zip(x_t, predicted)
    ]

    if t == 0:
        return [d if m else o for d, o, m in zip(denoised, observed, mask)]

    # Re-noise the observed values to the PREVIOUS level and substitute back.
    previous = schedule['alpha_bars'][t - 1]
    signal = math.sqrt(previous)
    noise_scale = math.sqrt(1.0 - previous)

    return [
        d if m else signal * o + noise_scale * rng.gauss(0.0, 1.0)
        for d, o, m in zip(denoised, observed, mask)
    ]


def sample_trajectories(window, mask, params, schedule, alphas, count, rng):
    """Draw several completions. Their spread IS the predictive distribution.

    Cost note, because it decides feasibility: this is steps times count times
    however many series are in the panel. A hundred trajectories at fifty
    steps across ten thousand series is fifty million network evaluations for
    one forecast cycle - a different operational regime entirely from fitting
    a classical model per series.
    """
    scaled, mean, scale = scale_window(window, mask)
    observed = [0.0 if m else value for value, m in zip(scaled, mask)]

    trajectories = []
    for _ in range(count):
        x = [rng.gauss(0.0, 1.0) for _ in scaled]
        for t in range(len(schedule['alpha_bars']) - 1, -1, -1):
            x = reverse_step(x, t, observed, mask, params, schedule, rng, alphas)
        # Undo the per-window scaling. The scaler is part of inference.
        trajectories.append([value * scale + mean for value in x])

    return trajectories


def quantile_from_trajectories(trajectories, position, level):
    """Any quantile is a percentile of the sampled completions."""
    values = sorted(path[position] for path in trajectories)
    index = min(int(level * len(values)), len(values) - 1)
    return values[index]


def seasonal_naive_baseline(history, horizon, period):
    """The baseline that wins more often than the literature suggests.

    Worth having in the same file as the model: published comparisons for
    pretrained forecasters frequently omit properly tuned classical baselines,
    and this one is three lines.
    """
    return [history[-period + (index % period)] for index in range(horizon)]
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is steps times trajectories times series. Illustrative, not a measured benchmark: that product is the number that decides feasibility, and it is routinely under-planned by an order of magnitude.',
      },

      'make-it-right': {
        code: `"""The same model, with the mask as a type and the scaler carried with it.

Two things change. The mask becomes an explicit object that knows what task it
represents and validates that it asks for something, because it is the whole
modelling decision rather than a data-loading detail. And the per-window
scaler becomes part of the returned forecast, because it is part of the
INFERENCE path — a scaler computed differently at serving time changes every
forecast, with nothing to indicate it.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple, Sequence


class TaskKind(Enum):
    """What the mask asks for. Determined by its shape, not by configuration.

    Forecasting and imputation are the same operation with different masks, so
    naming the task is a property of the mask rather than a separate setting.
    """

    FORECAST = 'forecast'
    IMPUTATION = 'imputation'
    MIXED = 'mixed'


class EmptyMask(ValueError):
    """Raised when a mask asks for nothing.

    Its own type because the consequence is specific: the loss has no terms,
    so the batch contributes nothing and the training loop reports a perfectly
    healthy zero.
    """


class ContextOverflow(ValueError):
    """Raised when the history exceeds the pretrained context window.

    Its own type because the alternative is silent truncation: a pretrained
    model simply drops the excess and reports nothing, and the symptom is
    unexplained accuracy loss on exactly the series with the most history.
    """


class MissingScaler(ValueError):
    """Raised when a forecast is produced without its fitted scaler.

    Per-window scaling is part of the inference path, not preprocessing.
    Recomputing it differently at serving time changes every forecast.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


@dataclass(frozen=True)
class WindowScaler:
    """Per-window normalization, fitted on the OBSERVED values only.

    Two details matter and both are easy to get wrong. It must use only the
    observed positions, because including the masked ones leaks the answer
    into the scaling. And it travels with the forecast, because undoing it is
    part of producing the output rather than a separate step.
    """

    mean: float
    scale: float

    @staticmethod
    def fit(window: Sequence[float], mask: Sequence[int]) -> WindowScaler:
        observed = [value for value, m in zip(window, mask) if m == 0]
        if not observed:
            raise EmptyMask('cannot scale a window with no observed values')

        mean = math.fsum(observed) / len(observed)
        variance = math.fsum((value - mean) ** 2 for value in observed) / len(observed)
        # A constant window gives zero variance; scaling by one leaves it
        # unchanged rather than dividing by zero.
        return WindowScaler(mean=mean, scale=math.sqrt(variance) or 1.0)

    def apply(self, window: Sequence[float]) -> list[float]:
        return [(value - self.mean) / self.scale for value in window]

    def invert(self, window: Sequence[float]) -> list[float]:
        return [value * self.scale + self.mean for value in window]


class TargetMask:
    """Which positions are predicted. The whole modelling decision.

    A model trained only on tail masks forecasts and imputes badly; one
    trained on mixed masks does both. Making the mask a type with a task
    property means that choice is visible rather than buried in a data loader.
    """

    def __init__(self, values: Sequence[int]) -> None:
        if not any(values):
            raise EmptyMask(
                'the mask asks for nothing; the loss will have no terms and the '
                'batch will report a healthy zero'
            )
        if all(values):
            raise EmptyMask('the mask leaves nothing observed; there is no conditioning')
        self._values = list(values)

    def __len__(self) -> int:
        return len(self._values)

    def __iter__(self):
        return iter(self._values)

    @property
    def predicted_count(self) -> int:
        return sum(self._values)

    @property
    def task(self) -> TaskKind:
        """Derived from the shape rather than declared.

        A mask that is zeros then ones is a forecast; anything else with an
        interior gap is imputation. Deriving it means a mislabelled mask is
        impossible rather than merely unlikely.
        """
        first_one = next(index for index, value in enumerate(self._values) if value)
        if all(self._values[first_one:]):
            return TaskKind.FORECAST
        return TaskKind.IMPUTATION

    @staticmethod
    def forecast(length: int, horizon: int) -> TargetMask:
        if horizon >= length:
            raise EmptyMask('a horizon covering the whole window leaves no context')
        return TargetMask([0] * (length - horizon) + [1] * horizon)

    @staticmethod
    def random(length: int, rng: random.Random) -> TargetMask:
        """Randomized during training, so one model handles both tasks."""
        if rng.random() < 0.5:
            return TargetMask.forecast(length, rng.randrange(1, length // 2))
        start = rng.randrange(0, length - length // 4)
        width = rng.randrange(1, length // 4 + 1)
        return TargetMask(
            [1 if start <= index < start + width else 0 for index in range(length)]
        )


@dataclass(frozen=True)
class ContextWindow:
    """The pretrained window, which is a hard limit rather than a default."""

    length: int

    def assert_fits(self, history: Sequence[float]) -> None:
        """Guard clause for the failure that is otherwise silent.

        A pretrained model given a longer history simply truncates and reports
        nothing, so the symptom is unexplained accuracy loss on exactly the
        series with the most data.
        """
        if len(history) > self.length:
            raise ContextOverflow(
                f'{len(history)} observations exceed the {self.length}-step pretrained '
                'context; the excess would be silently truncated'
            )


class Forecast(NamedTuple):
    """Trajectories, the scaler, and the settings that produced them.

    The scaler travels with the forecast because undoing it is part of
    producing the output. The step and trajectory counts travel because
    quality and cost are on a dial — a forecast reported without them is not
    comparable to any other.
    """

    trajectories: list[list[float]]
    scaler: WindowScaler
    steps: int
    trajectory_count: int

    def quantile(self, position: int, level: float) -> float:
        values = sorted(path[position] for path in self.trajectories)
        return values[min(int(level * len(values)), len(values) - 1)]

    def aggregate_quantile(self, level: float) -> float:
        """Sum WITHIN each trajectory, then take the quantile.

        The joint-distribution advantage: summing per-step quantiles instead
        destroys the correlation between steps and is wrong in the unsafe
        direction for any aggregating decision.
        """
        totals = sorted(math.fsum(path) for path in self.trajectories)
        return totals[min(int(level * len(totals)), len(totals) - 1)]

    def tail_is_estimable(self, level: float, minimum_order_statistics: int = 5) -> bool:
        """Whether there are enough trajectories for this quantile to mean
        anything. A 1st percentile from fifty trajectories is one order
        statistic and is pure noise."""
        tail = min(level, 1.0 - level)
        return tail * self.trajectory_count >= minimum_order_statistics


def masked_loss(
    epsilon: Sequence[float], predicted: Sequence[float], mask: TargetMask
) -> float:
    """The loss applies ONLY where the mask is one.

    Everything outside it is conditioning rather than a target, which is
    exactly what makes forecasting and imputation the same objective.
    """
    if len(epsilon) != len(predicted) or len(epsilon) != len(mask):
        raise ShapeMismatch('noise, prediction and mask widths disagree')

    total = math.fsum(
        (e - p) ** 2 for e, p, m in zip(epsilon, predicted, mask) if m
    )
    return total / mask.predicted_count


def reimpose_observed(
    denoised: Sequence[float],
    observed: Sequence[float],
    mask: TargetMask,
    alpha_bar_previous: float,
    rng: random.Random,
) -> list[float]:
    """Re-noise the observed values and substitute them back. EVERY step.

    The single most commonly omitted step in this family. If the known
    positions are fixed once at initialization and then left alone, the
    denoiser drifts away from them as it works — it is filling a canvas and
    has no reason to respect a region it was not asked about, so the
    reconstruction ends up inconsistent with data you actually had.
    """
    signal = math.sqrt(alpha_bar_previous)
    noise_scale = math.sqrt(1.0 - alpha_bar_previous)

    return [
        d if m else signal * o + noise_scale * rng.gauss(0.0, 1.0)
        for d, o, m in zip(denoised, observed, mask)
    ]


def inference_evaluations(steps: int, trajectories: int, series: int) -> int:
    """The arithmetic that decides feasibility, computed rather than assumed.

    Steps times trajectories times series. A hundred trajectories at fifty
    steps across ten thousand series is fifty million network evaluations for
    one forecast cycle — a different operational regime entirely from fitting
    a classical model per series, and routinely under-planned by an order of
    magnitude.
    """
    return steps * trajectories * series
`,
        rationale:
          'Two changes. The mask becomes a type that validates it asks for something and leaves something observed, and that derives its task from its shape rather than being told — because forecasting and imputation are the same operation with different masks, so a mislabelled mask becomes impossible rather than merely unlikely, and a mask with nothing to predict produces a loss with no terms that reports a perfectly healthy zero. The second is that the per-window scaler becomes a frozen object that travels with the forecast, because it is part of the inference path rather than preprocessing: it is fitted on observed positions only, since including the masked ones would leak the answer into the scaling, and undoing it is part of producing the output. Around those, the pretrained context becomes a type whose check names the failure it prevents — silent truncation, whose symptom is unexplained accuracy loss on exactly the series with the most history — the forecast carries its step and trajectory counts since quality and cost are on a dial, and the tail-estimability check exists because a far-tail quantile from fifty trajectories is one order statistic and is noise. The re-imposition step is extracted into its own named function precisely because it is the one everybody omits.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: deriving the task from the mask shape costs one scan and removes an entire class of configuration error.',
      },

      'make-it-fast': {
        code: `"""Batched over series AND trajectories, which is the only lever that helps.

The structural situation is worth stating precisely, because it differs from
every other diffusion entry. Sampling cost here is STEPS x TRAJECTORIES x
SERIES, and only one of those three is sequential. Steps must happen in order;
trajectories and series are entirely independent and fold into one batch axis.

So the optimization is: collapse trajectories and series into a single leading
dimension, advance the whole thing through each sequential step together, and
accept that the step count is the only part that cannot be parallelized away.

Three changes:
  1. (series x trajectories) becomes one batch axis.
  2. The mask and the observed values are precomputed once, not per step.
  3. Re-imposition is a fused select rather than a branch per element.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def fit_window_scaler(
    windows: NDArray[np.float32], mask: NDArray[np.bool_]
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Per-window mean and scale from the OBSERVED positions only.

    Using the masked positions would leak the answer into the scaling, so the
    reduction is weighted by the complement of the mask rather than taken over
    the whole window — one pass, no boolean indexing, no compacted copy.
    """
    observed = ~mask
    counts = observed.sum(axis=1, keepdims=True).astype(FLOAT)
    counts = np.maximum(counts, 1.0)

    mean = (windows * observed).sum(axis=1, keepdims=True, dtype=FLOAT) / counts
    centred = (windows - mean) * observed
    variance = np.einsum('ij,ij->i', centred, centred, optimize=True)[:, None] / counts
    # A constant window gives zero variance; one leaves it unchanged rather
    # than dividing by zero.
    scale = np.maximum(np.sqrt(variance), 1e-6)
    return mean, scale


def expand_for_trajectories(
    windows: NDArray[np.float32], mask: NDArray[np.bool_], trajectories: int
) -> tuple[NDArray[np.float32], NDArray[np.bool_]]:
    """Fold (series, trajectories) into ONE batch axis.

    This is the whole optimization. Trajectories and series are both entirely
    independent, so they belong in the same dimension; only the diffusion
    steps are sequential, and nothing rearranges that.

    repeat rather than tile, so each series' trajectories are contiguous —
    which keeps the per-series quantile reduction at the end a contiguous
    read rather than a strided one.
    """
    return (
        np.repeat(windows, trajectories, axis=0),
        np.repeat(mask, trajectories, axis=0),
    )


class BatchedSampler:
    """Every trajectory of every series advances through each step together."""

    def __init__(self, alpha_bars: NDArray[np.float32]) -> None:
        self._alpha_bars = np.ascontiguousarray(alpha_bars, dtype=FLOAT)
        alphas = np.empty_like(self._alpha_bars)
        alphas[0] = self._alpha_bars[0]
        alphas[1:] = self._alpha_bars[1:] / self._alpha_bars[:-1]

        # Every coefficient precomputed: these are constants of the schedule
        # and recomputing them inside the step loop is pure waste.
        self._sqrt_alpha_bars = np.sqrt(self._alpha_bars)
        self._sqrt_one_minus = np.sqrt(1.0 - self._alpha_bars)
        self._reverse_coefficient = (1.0 - alphas) / self._sqrt_one_minus
        self._root_alphas = np.sqrt(alphas)

    @property
    def steps(self) -> int:
        return len(self._alpha_bars)

    def reverse_step(
        self,
        x_t: NDArray[np.float32],
        predicted: NDArray[np.float32],
        observed: NDArray[np.float32],
        mask: NDArray[np.bool_],
        t: int,
        rng: np.random.Generator,
    ) -> NDArray[np.float32]:
        """One denoising step with the observed values RE-IMPOSED.

        The step everyone forgets, and its absence is the most common
        implementation error in this family: if the known positions are fixed
        once at initialization the denoiser drifts away from them, because it
        is filling a canvas and has no reason to respect a region it was not
        asked about.

        Written as a fused select rather than a branch per element — the mask
        is a boolean array, so the choice is a where over the whole batch.
        """
        # In place over the prediction buffer: the denoised state replaces it.
        out = predicted
        out *= -self._reverse_coefficient[t]
        out += x_t
        out /= self._root_alphas[t]

        if t == 0:
            return np.where(mask, out, observed)

        # Re-noise the observed values to the PREVIOUS level, then select.
        previous = self._alpha_bars[t - 1]
        noise = rng.standard_normal(observed.shape, dtype=FLOAT)
        noise *= FLOAT(np.sqrt(1.0 - previous))
        noise += FLOAT(np.sqrt(previous)) * observed

        return np.where(mask, out, noise)


def masked_loss(
    epsilon: NDArray[np.float32],
    predicted: NDArray[np.float32],
    mask: NDArray[np.bool_],
) -> np.float32:
    """The loss applies ONLY where the mask is one.

    The mask becomes a multiplicative weight rather than a boolean index,
    which avoids allocating a compacted copy of every predicted position —
    and the count comes from the same array.
    """
    counted = mask.sum(dtype=np.int64)
    if counted == 0:
        raise ValueError('the mask asks for nothing; the loss has no terms')

    residual = predicted
    residual -= epsilon
    residual *= mask
    return np.einsum('ij,ij->', residual, residual, optimize=True) / counted


def trajectory_quantiles(
    trajectories: NDArray[np.float32],
    series: int,
    levels: NDArray[np.float32],
) -> NDArray[np.float32]:
    """(series, levels, horizon) from a flat (series * trajectories, horizon).

    The reshape is free because expand_for_trajectories used repeat rather
    than tile, so each series' trajectories are already contiguous.
    """
    reshaped = trajectories.reshape(series, -1, trajectories.shape[1])
    return np.quantile(reshaped, levels, axis=1).transpose(1, 0, 2)


def aggregate_quantiles(
    trajectories: NDArray[np.float32],
    series: int,
    levels: NDArray[np.float32],
) -> NDArray[np.float32]:
    """Sum WITHIN each trajectory, then take the quantile over trajectories.

    The joint-distribution advantage: summing per-step quantiles instead
    destroys the correlation between steps and is wrong in the unsafe
    direction for any decision that aggregates over the horizon.
    """
    reshaped = trajectories.reshape(series, -1, trajectories.shape[1])
    totals = reshaped.sum(axis=2, dtype=FLOAT)
    return np.quantile(totals, levels, axis=1).T


def seasonal_naive(
    histories: NDArray[np.float32], horizon: int, period: int
) -> NDArray[np.float32]:
    """The baseline that wins more often than the literature suggests.

    One strided gather for a whole panel. Worth having in the same file as the
    model: published comparisons for pretrained forecasters frequently omit
    properly tuned classical baselines, and this costs nothing to run.
    """
    positions = -period + (np.arange(horizon) % period)
    return histories[:, positions]


def inference_evaluations(steps: int, trajectories: int, series: int) -> int:
    """The arithmetic that decides feasibility, computed rather than assumed.

    Only ONE of these three factors is sequential. Trajectories and series
    both fold into the batch, so the wall clock is set by steps and the
    hardware — but the total work is the product, and it is routinely
    under-planned by an order of magnitude.
    """
    return steps * trajectories * series
`,
        rationale:
          'The structural situation here differs from every other diffusion entry and is worth stating precisely: sampling cost is steps times trajectories times series, and only one of those three is sequential. Steps must happen in order; trajectories and series are entirely independent and therefore belong in the same batch axis. So the optimization is to collapse them into one leading dimension and advance the whole thing through each step together, accepting that the step count is the only part that cannot be parallelized away. The expansion uses repeat rather than tile deliberately, so each series’ trajectories are contiguous and the final per-series quantile reduction is a free reshape rather than a strided gather. The scaler is fitted with the mask as a multiplicative weight rather than by boolean indexing, which avoids allocating a compacted copy and — more importantly — keeps the masked positions out of the statistics, since including them would leak the answer into the scaling. Re-imposition becomes a fused select over the whole batch rather than a branch per element, and every schedule coefficient including the reverse-step term is precomputed since they are constants.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Trajectories and series fold into one batch axis, so a whole panel with a hundred trajectories each advances through a step in a constant number of interpreter operations.',
            tradeoff: 'Peak memory is series times trajectories times window width simultaneously, so a large panel at a high trajectory count cannot be held at once and must be chunked by series — which reintroduces a loop over chunks.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The scaler variance, the masked loss and the aggregate sums all contract with einsum in one pass rather than squaring into temporaries, and the seasonal-naive baseline is a single strided gather for the whole panel.',
            tradeoff: 'The masked loss multiplies by the mask rather than indexing, so it does the arithmetic for every position and discards most of it — on a mask that predicts a tenth of the window that is nine tenths wasted work, traded against avoiding a compacted copy.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The reverse step writes through the prediction buffer, the loss residual writes through the prediction, and the re-noising builds into the noise buffer — so a sampling step allocates only the noise it draws.',
            tradeoff: 'The prediction is destroyed by the reverse step, so inspecting what the model predicted at a given noise level — the natural diagnostic when completions look wrong — needs an unfused pass.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Repeat rather than tile keeps each series’ trajectories contiguous, which makes the final quantile reshape free rather than a strided gather across the whole batch.',
            tradeoff: 'That layout is the wrong one for a per-trajectory diagnostic across series — comparing trajectory five of every series reads with a stride equal to the trajectory count, which is exactly the access pattern a sampling-variance investigation wants.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Trajectories and series collapse into one batched pass per step, leaving the step count as the only sequential factor. Illustrative, not a measured benchmark: the total work is unchanged — it is the product of all three factors — and only the wall clock improves, which is why the feasibility arithmetic still has to be done.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Masked conditional diffusion for time series, transcribed literally.
//
// The central idea is the MASK. A forecast and an imputation are the same
// operation - some values are known and some are not:
//
//     mask = 0  ->  observed, conditioning
//     mask = 1  ->  unknown, predicted
//
// Mask the tail and it is forecasting. Mask the middle and it is imputation.
// The model does not distinguish, and randomizing the mask during training is
// what makes one model handle both.
//
// NOTATIONAL HAZARD, and a real source of bugs: \`t\` below is the DIFFUSION
// timestep, not the position in the series. They index completely different
// axes and are both conventionally called t.
//
// Vector-of-vector, plain loops.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <stdexcept>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

constexpr double kPi = 3.14159265358979323846;

struct Schedule {
  Vector alpha_bars;
  Vector alphas;
  Vector sqrt_alpha_bars;
  Vector sqrt_one_minus;
};

// Cosine schedule, as in the DDPM entry. Fixed, not learned.
Schedule BuildSchedule(std::size_t steps) {
  const auto f = [steps](std::size_t index) {
    const double angle =
        ((static_cast<double>(index) / static_cast<double>(steps)) + 0.008) / 1.008 *
        kPi / 2.0;
    return std::cos(angle) * std::cos(angle);
  };

  Schedule schedule;
  schedule.alpha_bars.resize(steps);
  schedule.alphas.resize(steps);
  schedule.sqrt_alpha_bars.resize(steps);
  schedule.sqrt_one_minus.resize(steps);

  const double base = f(0);
  double previous = 1.0;
  for (std::size_t index = 0; index < steps; ++index) {
    const double bar = f(index + 1) / base;
    schedule.alpha_bars[index] = bar;
    schedule.alphas[index] = bar / previous;
    schedule.sqrt_alpha_bars[index] = std::sqrt(bar);
    schedule.sqrt_one_minus[index] = std::sqrt(1.0 - bar);
    previous = bar;
  }
  return schedule;
}

// Per-window normalization, computed from the OBSERVED values only.
//
// This is what lets one model span series measured in units and series
// measured in millions. Two details matter. It uses only the observed
// positions, because including the masked ones would leak the answer. And it
// is part of the INFERENCE path rather than preprocessing - a scaler computed
// differently at serving time changes every forecast.
Vector ScaleWindow(const Vector& window, const std::vector<int>& mask, double* mean,
                   double* scale) {
  double total = 0.0;
  std::size_t counted = 0;
  for (std::size_t i = 0; i < window.size(); ++i) {
    if (mask[i] == 0) {
      total += window[i];
      ++counted;
    }
  }
  if (counted == 0) {
    throw std::invalid_argument("cannot scale a window with no observed values");
  }
  *mean = total / static_cast<double>(counted);

  double variance = 0.0;
  for (std::size_t i = 0; i < window.size(); ++i) {
    if (mask[i] == 0) {
      const double centred = window[i] - *mean;
      variance += centred * centred;
    }
  }
  variance /= static_cast<double>(counted);
  // A constant window gives zero variance; one leaves it unchanged rather
  // than dividing by zero.
  *scale = std::max(std::sqrt(variance), 1e-6);

  Vector scaled(window.size(), 0.0);
  for (std::size_t i = 0; i < window.size(); ++i) {
    scaled[i] = (window[i] - *mean) / *scale;
  }
  return scaled;
}

// Randomize the mask during training.
//
// A model trained only on tail masks forecasts and imputes badly; a model
// trained on mixed masks does both. The mask strategy determines which tasks
// the model can perform, which makes it a modelling decision rather than a
// data-loading detail.
std::vector<int> RandomMask(std::size_t length, std::mt19937& rng) {
  std::uniform_real_distribution<double> coin(0.0, 1.0);
  std::vector<int> mask(length, 0);

  if (coin(rng) < 0.5) {
    std::uniform_int_distribution<std::size_t> cut(length / 2, length - 1);
    const std::size_t start = cut(rng);
    for (std::size_t i = start; i < length; ++i) {
      mask[i] = 1;
    }
    return mask;
  }

  std::uniform_int_distribution<std::size_t> start_of(0, length - length / 4 - 1);
  std::uniform_int_distribution<std::size_t> width_of(1, length / 4);
  const std::size_t start = start_of(rng);
  const std::size_t width = width_of(rng);
  for (std::size_t i = start; i < std::min(start + width, length); ++i) {
    mask[i] = 1;
  }
  return mask;
}

struct DenoiserParams {
  Matrix w1;
  Vector b1;
  Matrix w2;
  Vector b2;
};

// Conditioned on the noisy target, the timestep, AND the observed values.
//
// The observed values and the mask are both inputs at every step. Supplying
// them only at initialization is the classic mistake - see ReverseStep.
Vector Denoise(const Vector& x_t, std::size_t t, const Vector& observed,
               const std::vector<int>& mask, const DenoiserParams& params) {
  Vector features;
  features.reserve(x_t.size() * 3 + 1);
  features.insert(features.end(), x_t.begin(), x_t.end());
  features.insert(features.end(), observed.begin(), observed.end());
  for (const int m : mask) {
    features.push_back(static_cast<double>(m));
  }
  features.push_back(static_cast<double>(t) / 100.0);

  Vector hidden(params.w1.size(), 0.0);
  for (std::size_t i = 0; i < params.w1.size(); ++i) {
    double total = params.b1[i];
    for (std::size_t j = 0; j < features.size(); ++j) {
      total += params.w1[i][j] * features[j];
    }
    hidden[i] = std::tanh(total);
  }

  Vector output(params.w2.size(), 0.0);
  for (std::size_t i = 0; i < params.w2.size(); ++i) {
    double total = params.b2[i];
    for (std::size_t j = 0; j < hidden.size(); ++j) {
      total += params.w2[i][j] * hidden[j];
    }
    output[i] = total;
  }
  return output;
}

// Masked noise prediction. The loss applies ONLY where the mask is one.
//
// Everything outside the mask is conditioning, not a target - which is exactly
// what makes forecasting and imputation the same objective.
double MaskedLoss(const Vector& epsilon, const Vector& predicted,
                  const std::vector<int>& mask) {
  double total = 0.0;
  std::size_t counted = 0;
  for (std::size_t i = 0; i < epsilon.size(); ++i) {
    if (mask[i] == 0) {
      continue;
    }
    const double residual = epsilon[i] - predicted[i];
    total += residual * residual;
    ++counted;
  }
  if (counted == 0) {
    throw std::invalid_argument("a mask with nothing to predict trains on nothing");
  }
  return total / static_cast<double>(counted);
}

// One denoising step, with the observed values RE-IMPOSED.
//
// This is the step everyone forgets, and its absence is the single most common
// implementation error in this family.
//
// If the known positions are fixed once at initialization and then left alone,
// the denoiser drifts away from them as it works - it is filling a canvas and
// has no reason to respect a region it was not asked about. So the
// reconstruction ends up inconsistent with data you actually had.
//
// Re-noising the observed values to the CURRENT noise level and substituting
// them back at every step keeps the trajectory anchored to the real data.
Vector ReverseStep(const Vector& x_t, std::size_t t, const Vector& observed,
                   const std::vector<int>& mask, const DenoiserParams& params,
                   const Schedule& schedule, std::mt19937& rng) {
  const Vector predicted = Denoise(x_t, t, observed, mask, params);

  const double coefficient =
      (1.0 - schedule.alphas[t]) / schedule.sqrt_one_minus[t];
  const double root_alpha = std::sqrt(schedule.alphas[t]);

  Vector denoised(x_t.size(), 0.0);
  for (std::size_t i = 0; i < x_t.size(); ++i) {
    denoised[i] = (x_t[i] - coefficient * predicted[i]) / root_alpha;
  }

  if (t == 0) {
    for (std::size_t i = 0; i < denoised.size(); ++i) {
      if (mask[i] == 0) {
        denoised[i] = observed[i];
      }
    }
    return denoised;
  }

  // Re-noise the observed values to the PREVIOUS level and substitute back.
  const double previous = schedule.alpha_bars[t - 1];
  std::normal_distribution<double> normal(0.0, 1.0);
  for (std::size_t i = 0; i < denoised.size(); ++i) {
    if (mask[i] == 0) {
      denoised[i] = std::sqrt(previous) * observed[i] +
                    std::sqrt(1.0 - previous) * normal(rng);
    }
  }
  return denoised;
}

// The baseline that wins more often than the literature suggests.
//
// Worth having in the same file as the model: published comparisons for
// pretrained forecasters frequently omit properly tuned classical baselines,
// and this one is three lines.
Vector SeasonalNaive(const Vector& history, std::size_t horizon, std::size_t period) {
  Vector forecast(horizon, 0.0);
  for (std::size_t index = 0; index < horizon; ++index) {
    forecast[index] = history[history.size() - period + (index % period)];
  }
  return forecast;
}

// The arithmetic that decides feasibility, computed rather than assumed.
//
// Steps times trajectories times series. A hundred trajectories at fifty steps
// across ten thousand series is fifty million network evaluations for one
// forecast cycle - a different operational regime entirely from fitting a
// classical model per series.
std::size_t InferenceEvaluations(std::size_t steps, std::size_t trajectories,
                                 std::size_t series) {
  return steps * trajectories * series;
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is steps times trajectories times series. Illustrative, not a measured benchmark: that product is the number that decides feasibility, and it is routinely under-planned by an order of magnitude.',
      },

      'make-it-right': {
        code: `// The same model, with the mask as a type and the scaler carried with it.
//
// Two things change. The mask becomes an explicit object that knows what task
// it represents and validates that it asks for something, because it is the
// whole modelling decision rather than a data-loading detail. And the
// per-window scaler becomes part of the returned forecast, because it is part
// of the INFERENCE path - a scaler computed differently at serving time
// changes every forecast, with nothing to indicate it.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace tsdiff {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the consequence is specific: the loss has no terms, so
// the batch contributes nothing and the training loop reports a perfectly
// healthy zero.
class EmptyMask : public std::invalid_argument {
 public:
  explicit EmptyMask(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the alternative is silent truncation: a pretrained
// model simply drops the excess and reports nothing, and the symptom is
// unexplained accuracy loss on exactly the series with the most history.
class ContextOverflow : public std::length_error {
 public:
  explicit ContextOverflow(const std::string& what) : std::length_error(what) {}
};

// Forecasting and imputation are the same operation with different masks, so
// naming the task is a property of the mask rather than a separate setting.
enum class TaskKind { kForecast, kImputation };

// Per-window normalization, fitted on the OBSERVED values only.
//
// Two details matter and both are easy to get wrong. It must use only the
// observed positions, because including the masked ones leaks the answer into
// the scaling. And it travels with the forecast, because undoing it is part of
// producing the output rather than a separate step.
class WindowScaler {
 public:
  static WindowScaler Fit(std::span<const double> window,
                          std::span<const unsigned char> mask) {
    double total = 0.0;
    std::size_t counted = 0;
    for (std::size_t i = 0; i < window.size(); ++i) {
      if (mask[i] == 0) {
        total += window[i];
        ++counted;
      }
    }
    if (counted == 0) {
      throw EmptyMask("cannot scale a window with no observed values");
    }

    const double mean = total / static_cast<double>(counted);
    double variance = 0.0;
    for (std::size_t i = 0; i < window.size(); ++i) {
      if (mask[i] == 0) {
        const double centred = window[i] - mean;
        variance += centred * centred;
      }
    }
    variance /= static_cast<double>(counted);

    // A constant window gives zero variance; one leaves it unchanged rather
    // than dividing by zero.
    return WindowScaler(mean, std::max(std::sqrt(variance), 1e-6));
  }

  void Apply(std::span<const double> window, std::span<double> out) const {
    for (std::size_t i = 0; i < window.size(); ++i) {
      out[i] = (window[i] - mean_) / scale_;
    }
  }

  void Invert(std::span<const double> window, std::span<double> out) const {
    for (std::size_t i = 0; i < window.size(); ++i) {
      out[i] = window[i] * scale_ + mean_;
    }
  }

 private:
  WindowScaler(double mean, double scale) : mean_(mean), scale_(scale) {}
  double mean_;
  double scale_;
};

// Which positions are predicted. The whole modelling decision.
//
// A model trained only on tail masks forecasts and imputes badly; one trained
// on mixed masks does both. Making the mask a type with a task property means
// that choice is visible rather than buried in a data loader.
class TargetMask {
 public:
  explicit TargetMask(std::vector<unsigned char> values) : values_(std::move(values)) {
    predicted_ = static_cast<std::size_t>(
        std::count(values_.begin(), values_.end(), static_cast<unsigned char>(1)));
    if (predicted_ == 0) {
      throw EmptyMask(
          "the mask asks for nothing; the loss will have no terms and the batch "
          "will report a healthy zero");
    }
    if (predicted_ == values_.size()) {
      throw EmptyMask("the mask leaves nothing observed; there is no conditioning");
    }
  }

  static TargetMask Forecast(std::size_t length, std::size_t horizon) {
    if (horizon >= length) {
      throw EmptyMask("a horizon covering the whole window leaves no context");
    }
    std::vector<unsigned char> values(length, 0);
    std::fill(values.end() - static_cast<long>(horizon), values.end(),
              static_cast<unsigned char>(1));
    return TargetMask(std::move(values));
  }

  // Derived from the shape rather than declared.
  //
  // A mask that is zeros then ones is a forecast; anything else with an
  // interior gap is imputation. Deriving it means a mislabelled mask is
  // impossible rather than merely unlikely.
  [[nodiscard]] TaskKind task() const {
    const auto first = std::find(values_.begin(), values_.end(),
                                 static_cast<unsigned char>(1));
    return std::all_of(first, values_.end(),
                       [](unsigned char value) { return value == 1; })
               ? TaskKind::kForecast
               : TaskKind::kImputation;
  }

  [[nodiscard]] std::size_t predicted_count() const noexcept { return predicted_; }
  [[nodiscard]] std::span<const unsigned char> values() const noexcept { return values_; }
  [[nodiscard]] std::size_t size() const noexcept { return values_.size(); }

 private:
  std::vector<unsigned char> values_;
  std::size_t predicted_{};
};

// The pretrained window, which is a hard limit rather than a default.
struct ContextWindow {
  std::size_t length{};

  // Guard clause for the failure that is otherwise silent.
  //
  // A pretrained model given a longer history simply truncates and reports
  // nothing, so the symptom is unexplained accuracy loss on exactly the series
  // with the most data.
  void AssertFits(std::size_t history) const {
    if (history > length) {
      throw ContextOverflow(
          "history exceeds the pretrained context; the excess would be silently "
          "truncated");
    }
  }
};

// Trajectories, the scaler, and the settings that produced them.
//
// The scaler travels with the forecast because undoing it is part of producing
// the output. The step and trajectory counts travel because quality and cost
// are on a dial - a forecast reported without them is not comparable.
class Forecast {
 public:
  Forecast(std::vector<std::vector<double>> trajectories, WindowScaler scaler,
           std::size_t steps)
      : trajectories_(std::move(trajectories)), scaler_(scaler), steps_(steps) {}

  [[nodiscard]] double Quantile(std::size_t position, double level) const {
    std::vector<double> values(trajectories_.size());
    for (std::size_t p = 0; p < trajectories_.size(); ++p) {
      values[p] = trajectories_[p][position];
    }
    return Select(values, level);
  }

  // Sum WITHIN each trajectory, then take the quantile.
  //
  // The joint-distribution advantage: summing per-step quantiles instead
  // destroys the correlation between steps and is wrong in the unsafe
  // direction for any aggregating decision.
  [[nodiscard]] double AggregateQuantile(double level) const {
    std::vector<double> totals(trajectories_.size());
    for (std::size_t p = 0; p < trajectories_.size(); ++p) {
      totals[p] = std::accumulate(trajectories_[p].begin(), trajectories_[p].end(), 0.0);
    }
    return Select(totals, level);
  }

  // Whether there are enough trajectories for this quantile to mean anything.
  // A 1st percentile from fifty trajectories is one order statistic and is
  // pure noise.
  [[nodiscard]] bool TailIsEstimable(double level, std::size_t minimum = 5) const {
    const double tail = std::min(level, 1.0 - level);
    return tail * static_cast<double>(trajectories_.size()) >= static_cast<double>(minimum);
  }

 private:
  [[nodiscard]] static double Select(std::vector<double>& values, double level) {
    const std::size_t index = std::min(
        static_cast<std::size_t>(level * static_cast<double>(values.size())),
        values.size() - 1);
    // nth_element, not a sort: a quantile is a selection and ordering the rest
    // is work whose result is discarded.
    std::nth_element(values.begin(), values.begin() + static_cast<long>(index),
                     values.end());
    return values[index];
  }

  std::vector<std::vector<double>> trajectories_;
  WindowScaler scaler_;
  std::size_t steps_;
};

// The loss applies ONLY where the mask is one.
[[nodiscard]] inline double MaskedLoss(std::span<const double> epsilon,
                                       std::span<const double> predicted,
                                       const TargetMask& mask) {
  if (epsilon.size() != predicted.size() || epsilon.size() != mask.size()) {
    throw ShapeMismatch("noise, prediction and mask widths disagree");
  }

  double total = 0.0;
  const std::span<const unsigned char> values = mask.values();
  for (std::size_t i = 0; i < epsilon.size(); ++i) {
    if (values[i] == 0) {
      continue;
    }
    const double residual = epsilon[i] - predicted[i];
    total += residual * residual;
  }
  return total / static_cast<double>(mask.predicted_count());
}

// Re-noise the observed values and substitute them back. EVERY step.
//
// The single most commonly omitted step in this family. If the known positions
// are fixed once at initialization and then left alone, the denoiser drifts
// away from them as it works - it is filling a canvas and has no reason to
// respect a region it was not asked about.
inline void ReimposeObserved(std::span<double> denoised, std::span<const double> observed,
                             const TargetMask& mask, double alpha_bar_previous,
                             std::mt19937& rng) {
  const double signal = std::sqrt(alpha_bar_previous);
  const double noise_scale = std::sqrt(1.0 - alpha_bar_previous);
  std::normal_distribution<double> normal(0.0, 1.0);

  const std::span<const unsigned char> values = mask.values();
  for (std::size_t i = 0; i < denoised.size(); ++i) {
    if (values[i] == 0) {
      denoised[i] = signal * observed[i] + noise_scale * normal(rng);
    }
  }
}

// The arithmetic that decides feasibility, computed rather than assumed.
[[nodiscard]] inline std::size_t InferenceEvaluations(std::size_t steps,
                                                      std::size_t trajectories,
                                                      std::size_t series) {
  return steps * trajectories * series;
}

}  // namespace tsdiff
`,
        rationale:
          'Two changes. The mask becomes a type that validates it asks for something and leaves something observed, and that derives its task from its shape rather than being told — because forecasting and imputation are the same operation with different masks, so a mislabelled mask becomes impossible rather than merely unlikely, and a mask with nothing to predict produces a loss with no terms that reports a perfectly healthy zero. The second is that the per-window scaler becomes an object that travels with the forecast, because it is part of the inference path rather than preprocessing: it is fitted on observed positions only, since including the masked ones would leak the answer into the scaling, and undoing it is part of producing the output. Around those, the pretrained context becomes a type whose check names the failure it prevents — silent truncation, whose symptom is unexplained accuracy loss on exactly the series with the most history — quantiles use nth_element since a quantile is a selection, the forecast carries its step count because quality and cost are on a dial, and the tail-estimability check exists because a far-tail quantile from fifty trajectories is one order statistic. The re-imposition step is extracted into its own named function precisely because it is the one everybody omits.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics with quantile selection dropping from O(S log S) to O(S). Illustrative, not a measured benchmark: deriving the task from the mask shape costs one scan and removes an entire class of configuration error.',
      },

      'make-it-fast': {
        code: `// Batched over series AND trajectories, which is the only lever that helps.
//
// The structural situation is worth stating precisely, because it differs from
// every other diffusion entry. Sampling cost here is STEPS x TRAJECTORIES x
// SERIES, and only one of those three is sequential. Steps must happen in
// order; trajectories and series are entirely independent and fold into one
// batch axis.
//
// So the optimization is: collapse trajectories and series into a single
// leading dimension, advance the whole thing through each sequential step
// together, and accept that the step count is the only part that cannot be
// parallelized away.
//
// Three changes:
//   1. (series x trajectories) becomes one batch axis.
//   2. The mask and the observed values are precomputed once, not per step.
//   3. Re-imposition is a fused select rather than a branch per element.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <vector>

#include <omp.h>

namespace tsdiff {

// Per-window mean and scale from the OBSERVED positions only.
//
// Using the masked positions would leak the answer into the scaling, so the
// reduction is weighted by the complement of the mask rather than taken over
// the whole window - one pass, no compaction, no separate buffer.
inline void FitWindowScalers(const float* __restrict windows,
                             const unsigned char* __restrict mask, int rows, int width,
                             float* __restrict mean, float* __restrict scale) {
#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    const float* row = windows + static_cast<std::size_t>(r) * width;
    const unsigned char* row_mask = mask + static_cast<std::size_t>(r) * width;

    float total = 0.0F;
    int counted = 0;
    for (int d = 0; d < width; ++d) {
      const float weight = row_mask[d] == 0 ? 1.0F : 0.0F;
      total += weight * row[d];
      counted += row_mask[d] == 0 ? 1 : 0;
    }
    const float row_mean = counted > 0 ? total / static_cast<float>(counted) : 0.0F;

    float variance = 0.0F;
    for (int d = 0; d < width; ++d) {
      const float weight = row_mask[d] == 0 ? 1.0F : 0.0F;
      const float centred = weight * (row[d] - row_mean);
      variance += centred * centred;
    }

    mean[r] = row_mean;
    // A constant window gives zero variance; one leaves it unchanged rather
    // than dividing by zero.
    scale[r] = std::max(
        std::sqrt(variance / static_cast<float>(std::max(counted, 1))), 1e-6F);
  }
}

// Fold (series, trajectories) into ONE batch axis.
//
// This is the whole optimization. Trajectories and series are both entirely
// independent, so they belong in the same dimension; only the diffusion steps
// are sequential, and nothing rearranges that.
//
// Each series' trajectories are kept CONTIGUOUS, which makes the per-series
// quantile reduction at the end a contiguous read rather than a strided one.
inline void ExpandForTrajectories(const float* __restrict windows,
                                  const unsigned char* __restrict mask, int series,
                                  int width, int trajectories,
                                  float* __restrict expanded_windows,
                                  unsigned char* __restrict expanded_mask) {
#pragma omp parallel for collapse(2) schedule(static)
  for (int s = 0; s < series; ++s) {
    for (int k = 0; k < trajectories; ++k) {
      const std::size_t target = (static_cast<std::size_t>(s) * trajectories + k) * width;
      const std::size_t source = static_cast<std::size_t>(s) * width;
      std::copy(windows + source, windows + source + width, expanded_windows + target);
      std::copy(mask + source, mask + source + width, expanded_mask + target);
    }
  }
}

// Every trajectory of every series advances through each step together.
class BatchedSampler {
 public:
  explicit BatchedSampler(std::span<const float> alpha_bars)
      : alpha_bars_(alpha_bars.begin(), alpha_bars.end()),
        reverse_coefficient_(alpha_bars.size()), root_alphas_(alpha_bars.size()) {
    // Every coefficient precomputed: these are constants of the schedule and
    // recomputing them inside the step loop is pure waste.
    float previous = 1.0F;
    for (std::size_t t = 0; t < alpha_bars_.size(); ++t) {
      const float alpha = alpha_bars_[t] / previous;
      reverse_coefficient_[t] = (1.0F - alpha) / std::sqrt(1.0F - alpha_bars_[t]);
      root_alphas_[t] = std::sqrt(alpha);
      previous = alpha_bars_[t];
    }
  }

  // One denoising step with the observed values RE-IMPOSED.
  //
  // The step everyone forgets, and its absence is the most common
  // implementation error in this family: if the known positions are fixed once
  // at initialization the denoiser drifts away from them, because it is
  // filling a canvas and has no reason to respect a region it was not asked
  // about.
  //
  // Written as a fused select rather than a branch, so the loop stays
  // vectorizable - the mask becomes a multiply rather than a jump.
  void ReverseStep(const float* __restrict x_t, float* __restrict predicted,
                   const float* __restrict observed,
                   const unsigned char* __restrict mask, std::size_t t, int rows,
                   int width, uint64_t seed) const {
    const float coefficient = reverse_coefficient_[t];
    const float inverse_root = 1.0F / root_alphas_[t];
    const float signal = t == 0 ? 1.0F : std::sqrt(alpha_bars_[t - 1]);
    const float noise_scale = t == 0 ? 0.0F : std::sqrt(1.0F - alpha_bars_[t - 1]);

#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      uint64_t state = seed + static_cast<uint64_t>(r) * 0x9E3779B97F4A7C15ULL;
      const std::size_t offset = static_cast<std::size_t>(r) * width;

      for (int d = 0; d < width; ++d) {
        const float denoised =
            (x_t[offset + d] - coefficient * predicted[offset + d]) * inverse_root;

        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        const float draw = static_cast<float>(state >> 40) * (2.0F / 16777216.0F) - 1.0F;
        const float reimposed = signal * observed[offset + d] + noise_scale * draw;

        // Select, not branch: the mask multiplies so the loop vectorizes.
        const float keep = mask[offset + d] != 0 ? 1.0F : 0.0F;
        predicted[offset + d] = keep * denoised + (1.0F - keep) * reimposed;
      }
    }
  }

 private:
  std::vector<float> alpha_bars_;
  std::vector<float> reverse_coefficient_;
  std::vector<float> root_alphas_;
};

// The loss applies ONLY where the mask is one.
//
// The mask becomes a multiplicative weight rather than a branch, which keeps
// the reduction vectorizable - and the count comes from the same pass.
[[nodiscard]] inline double MaskedLoss(const float* __restrict epsilon,
                                       const float* __restrict predicted,
                                       const unsigned char* __restrict mask,
                                       std::size_t count) {
  double total = 0.0;
  double counted = 0.0;

#pragma omp parallel for reduction(+ : total, counted) schedule(static)
  for (std::size_t i = 0; i < count; ++i) {
    const float weight = mask[i] != 0 ? 1.0F : 0.0F;
    const float residual = weight * (epsilon[i] - predicted[i]);
    total += static_cast<double>(residual) * static_cast<double>(residual);
    counted += static_cast<double>(weight);
  }
  return counted == 0.0 ? 0.0 : total / counted;
}

// Per-series quantiles from the flat (series * trajectories) layout.
//
// The slicing is free because ExpandForTrajectories kept each series'
// trajectories contiguous.
inline void TrajectoryQuantiles(const float* __restrict trajectories, int series,
                                int count, int horizon, float level,
                                float* __restrict out) {
#pragma omp parallel for schedule(static)
  for (int s = 0; s < series; ++s) {
    std::vector<float> values(static_cast<std::size_t>(count));
    for (int h = 0; h < horizon; ++h) {
      for (int k = 0; k < count; ++k) {
        values[static_cast<std::size_t>(k)] =
            trajectories[(static_cast<std::size_t>(s) * count + k) * horizon + h];
      }
      const std::size_t index = std::min(
          static_cast<std::size_t>(level * static_cast<float>(count)),
          values.size() - 1);
      // nth_element, not a sort: a quantile is a selection.
      std::nth_element(values.begin(), values.begin() + static_cast<long>(index),
                       values.end());
      out[static_cast<std::size_t>(s) * horizon + h] = values[index];
    }
  }
}

// The baseline that wins more often than the literature suggests.
//
// One strided gather for a whole panel. Worth having in the same file as the
// model: published comparisons for pretrained forecasters frequently omit
// properly tuned classical baselines, and this costs nothing to run.
inline void SeasonalNaive(const float* __restrict histories, int series, int length,
                          int horizon, int period, float* __restrict out) {
#pragma omp parallel for schedule(static)
  for (int s = 0; s < series; ++s) {
    const float* history = histories + static_cast<std::size_t>(s) * length;
    float* forecast = out + static_cast<std::size_t>(s) * horizon;
    for (int h = 0; h < horizon; ++h) {
      forecast[h] = history[length - period + (h % period)];
    }
  }
}

}  // namespace tsdiff
`,
        rationale:
          'The structural situation here differs from every other diffusion entry and is worth stating precisely: sampling cost is steps times trajectories times series, and only one of those three is sequential. Steps must happen in order; trajectories and series are entirely independent and therefore belong in the same batch axis. So the optimization is to collapse them into one leading dimension and advance the whole thing through each step together, accepting that the step count is the only part that cannot be parallelized away. The expansion keeps each series’ trajectories contiguous deliberately, so the final per-series quantile reduction is a contiguous read rather than a strided one. The scaler fit uses the mask as a multiplicative weight rather than a branch, which keeps both reductions vectorizable and — more importantly — keeps the masked positions out of the statistics, since including them would leak the answer into the scaling. Re-imposition becomes a fused select computed in the same traversal as the denoising, with the mask multiplying rather than jumping, so the loop stays vectorizable; every schedule coefficient including the reverse-step term is precomputed at construction.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The scaler fit, the expansion, the fused reverse step, the loss reduction and the per-series quantiles are all row- or series-independent, with per-row generator state derived from the row index.',
            tradeoff: 'Only the batch axis parallelizes — the diffusion steps are sequential, so wall clock is set by step count and the machine, and a single-series interactive request gets almost nothing from the threading.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Denoising, noise generation and re-imposition happen in one traversal per row, so neither the denoised state nor the re-noised observation is ever a separate buffer.',
            tradeoff: 'The prediction buffer is overwritten by the fused step, so inspecting what the model predicted at a given noise level — the natural diagnostic when completions look wrong — needs an unfused pass.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The mask is applied as a multiply rather than a branch throughout, so the scaler fit, the fused step and the loss reduction are all straight-line contiguous loops the compiler vectorizes.',
            tradeoff: 'The multiply-by-mask form does the arithmetic for every position and discards most of it, so on a mask predicting a tenth of the window nine tenths of the work is wasted — traded against the branch misprediction a conditional would cost.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Keeping each series’ trajectories contiguous makes the per-series quantile gather a contiguous read, and the flat layout keeps every fused pass stride-one.',
            tradeoff: 'That layout is the wrong one for a per-trajectory diagnostic across series — comparing trajectory five of every series reads with a stride equal to the trajectory count, which is exactly what a sampling-variance investigation wants.',
          },
        ],
        libraryName: 'OpenMP',
        profile:
          'Trajectories and series collapse into one batched pass per step, leaving the step count as the only sequential factor. Illustrative, not a measured benchmark: the total work is unchanged — it is the product of all three factors — and only the wall clock improves, which is why the feasibility arithmetic still has to be done.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// Masked conditional diffusion for time series, transcribed literally.
//
// The central idea is the MASK. A forecast and an imputation are the same
// operation - some values are known and some are not:
//
//     mask = 0  ->  observed, conditioning
//     mask = 1  ->  unknown, predicted
//
// Mask the tail and it is forecasting. Mask the middle and it is imputation.
// The model does not distinguish, and randomizing the mask during training is
// what makes one model handle both.
//
// NOTATIONAL HAZARD, and a real source of bugs: t below is the DIFFUSION
// timestep, not the position in the series. They index completely different
// axes and are both conventionally called t.
//
// Vec-of-Vec, index loops, no libraries.

use std::f64::consts::PI;

struct Schedule {
    alpha_bars: Vec<f64>,
    alphas: Vec<f64>,
    sqrt_alpha_bars: Vec<f64>,
    sqrt_one_minus: Vec<f64>,
}

/// Cosine schedule, as in the DDPM entry. Fixed, not learned.
fn build_schedule(steps: usize) -> Schedule {
    let f = |index: usize| {
        let angle = ((index as f64 / steps as f64) + 0.008) / 1.008 * PI / 2.0;
        angle.cos().powi(2)
    };

    let base = f(0);
    let mut alpha_bars = Vec::with_capacity(steps);
    let mut alphas = Vec::with_capacity(steps);
    let mut previous = 1.0;

    for index in 0..steps {
        let bar = f(index + 1) / base;
        alpha_bars.push(bar);
        alphas.push(bar / previous);
        previous = bar;
    }

    let sqrt_alpha_bars = alpha_bars.iter().map(|b| b.sqrt()).collect();
    let sqrt_one_minus = alpha_bars.iter().map(|b| (1.0 - b).sqrt()).collect();

    Schedule { alpha_bars, alphas, sqrt_alpha_bars, sqrt_one_minus }
}

/// Per-window normalization, computed from the OBSERVED values only.
///
/// This is what lets one model span series measured in units and series
/// measured in millions. Two details matter. It uses only the observed
/// positions, because including the masked ones would leak the answer. And it
/// is part of the INFERENCE path rather than preprocessing - a scaler computed
/// differently at serving time changes every forecast.
fn scale_window(window: &[f64], mask: &[u8]) -> (Vec<f64>, f64, f64) {
    let observed: Vec<f64> = window
        .iter()
        .zip(mask)
        .filter(|(_, &m)| m == 0)
        .map(|(&value, _)| value)
        .collect();

    if observed.is_empty() {
        return (window.to_vec(), 0.0, 1.0);
    }

    let mean = observed.iter().sum::<f64>() / observed.len() as f64;
    let variance = observed
        .iter()
        .map(|value| (value - mean) * (value - mean))
        .sum::<f64>()
        / observed.len() as f64;
    // A constant window gives zero variance; one leaves it unchanged rather
    // than dividing by zero.
    let scale = variance.sqrt().max(1e-6);

    let scaled = window.iter().map(|value| (value - mean) / scale).collect();
    (scaled, mean, scale)
}

/// Randomize the mask during training.
///
/// A model trained only on tail masks forecasts and imputes badly; a model
/// trained on mixed masks does both. The mask strategy determines which tasks
/// the model can perform, which makes it a modelling decision rather than a
/// data-loading detail.
fn random_mask(length: usize, draws: &[f64]) -> Vec<u8> {
    let mut mask = vec![0u8; length];

    if draws[0] < 0.5 {
        let cut = length / 2 + ((draws[1] * (length / 2) as f64) as usize).min(length / 2 - 1);
        for slot in mask.iter_mut().skip(cut) {
            *slot = 1;
        }
        return mask;
    }

    let start = (draws[1] * (length - length / 4) as f64) as usize;
    let width = 1 + (draws[2] * (length / 4) as f64) as usize;
    for slot in mask.iter_mut().skip(start).take(width) {
        *slot = 1;
    }
    mask
}

struct DenoiserParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

/// Conditioned on the noisy target, the timestep, AND the observed values.
///
/// The observed values and the mask are both inputs at every step. Supplying
/// them only at initialization is the classic mistake - see reverse_step.
fn denoise(
    x_t: &[f64],
    t: usize,
    observed: &[f64],
    mask: &[u8],
    params: &DenoiserParams,
) -> Vec<f64> {
    let mut features = Vec::with_capacity(x_t.len() * 3 + 1);
    features.extend_from_slice(x_t);
    features.extend_from_slice(observed);
    features.extend(mask.iter().map(|&m| f64::from(m)));
    features.push(t as f64 / 100.0);

    let hidden: Vec<f64> = params
        .w1
        .iter()
        .zip(&params.b1)
        .map(|(row, bias)| {
            (bias + row.iter().zip(&features).map(|(w, v)| w * v).sum::<f64>()).tanh()
        })
        .collect();

    params
        .w2
        .iter()
        .zip(&params.b2)
        .map(|(row, bias)| bias + row.iter().zip(&hidden).map(|(w, h)| w * h).sum::<f64>())
        .collect()
}

/// Masked noise prediction. The loss applies ONLY where the mask is one.
///
/// Everything outside the mask is conditioning, not a target - which is
/// exactly what makes forecasting and imputation the same objective.
fn masked_loss(epsilon: &[f64], predicted: &[f64], mask: &[u8]) -> f64 {
    let counted = mask.iter().filter(|&&m| m != 0).count();
    assert!(counted > 0, "a mask with nothing to predict trains on nothing");

    epsilon
        .iter()
        .zip(predicted)
        .zip(mask)
        .filter(|(_, &m)| m != 0)
        .map(|((e, p), _)| (e - p) * (e - p))
        .sum::<f64>()
        / counted as f64
}

/// One denoising step, with the observed values RE-IMPOSED.
///
/// This is the step everyone forgets, and its absence is the single most
/// common implementation error in this family.
///
/// If the known positions are fixed once at initialization and then left
/// alone, the denoiser drifts away from them as it works - it is filling a
/// canvas and has no reason to respect a region it was not asked about. So
/// the reconstruction ends up inconsistent with data you actually had.
///
/// Re-noising the observed values to the CURRENT noise level and substituting
/// them back at every step keeps the trajectory anchored to the real data.
fn reverse_step(
    x_t: &[f64],
    t: usize,
    observed: &[f64],
    mask: &[u8],
    params: &DenoiserParams,
    schedule: &Schedule,
    normals: &[f64],
) -> Vec<f64> {
    let predicted = denoise(x_t, t, observed, mask, params);

    let coefficient = (1.0 - schedule.alphas[t]) / schedule.sqrt_one_minus[t];
    let root_alpha = schedule.alphas[t].sqrt();

    let mut next: Vec<f64> = x_t
        .iter()
        .zip(&predicted)
        .map(|(value, p)| (value - coefficient * p) / root_alpha)
        .collect();

    if t == 0 {
        for ((slot, &o), &m) in next.iter_mut().zip(observed).zip(mask) {
            if m == 0 {
                *slot = o;
            }
        }
        return next;
    }

    // Re-noise the observed values to the PREVIOUS level and substitute back.
    let previous = schedule.alpha_bars[t - 1];
    let signal = previous.sqrt();
    let noise_scale = (1.0 - previous).sqrt();

    for (((slot, &o), &m), &z) in next.iter_mut().zip(observed).zip(mask).zip(normals) {
        if m == 0 {
            *slot = signal * o + noise_scale * z;
        }
    }
    next
}

/// The baseline that wins more often than the literature suggests.
///
/// Worth having in the same file as the model: published comparisons for
/// pretrained forecasters frequently omit properly tuned classical baselines,
/// and this one is three lines.
fn seasonal_naive(history: &[f64], horizon: usize, period: usize) -> Vec<f64> {
    (0..horizon)
        .map(|index| history[history.len() - period + (index % period)])
        .collect()
}

/// The arithmetic that decides feasibility, computed rather than assumed.
///
/// Steps times trajectories times series. A hundred trajectories at fifty
/// steps across ten thousand series is fifty million network evaluations for
/// one forecast cycle - a different operational regime entirely from fitting a
/// classical model per series.
fn inference_evaluations(steps: usize, trajectories: usize, series: usize) -> usize {
    steps * trajectories * series
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is steps times trajectories times series. Illustrative, not a measured benchmark: that product is the number that decides feasibility, and it is routinely under-planned by an order of magnitude.',
      },

      'make-it-right': {
        code: `//! The same model, with the mask as a type and the scaler carried with it.
//!
//! Two things change. The mask becomes an explicit type that knows what task
//! it represents and validates that it asks for something, because it is the
//! whole modelling decision rather than a data-loading detail. And the
//! per-window scaler becomes part of the returned forecast, because it is part
//! of the INFERENCE path - a scaler computed differently at serving time
//! changes every forecast, with nothing to indicate it.

use std::fmt;

/// Width of a window, in observations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct WindowLength(pub usize);

/// Number of sampled completions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TrajectoryCount(pub usize);

/// A position in the diffusion process, NOT in the series.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct DiffusionStep(pub usize);

/// What the mask asks for. Determined by its shape, not by configuration.
///
/// Forecasting and imputation are the same operation with different masks, so
/// naming the task is a property of the mask rather than a separate setting.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskKind {
    Forecast,
    Imputation,
}

#[derive(Debug, PartialEq)]
pub enum TimeSeriesDiffusionError {
    /// A mask that asks for nothing.
    ///
    /// Its own variant because the consequence is specific: the loss has no
    /// terms, so the batch contributes nothing and the training loop reports a
    /// perfectly healthy zero.
    EmptyMask,
    /// A mask that leaves nothing observed, so there is no conditioning.
    NoConditioning,
    /// History exceeding the pretrained context window.
    ///
    /// Its own variant because the alternative is silent truncation: a
    /// pretrained model drops the excess and reports nothing, so the symptom
    /// is unexplained accuracy loss on exactly the series with the most data.
    ContextOverflow { have: usize, limit: usize },
    /// Too few trajectories for the requested quantile to mean anything.
    TailNotEstimable { level: f64, trajectories: usize },
    /// A buffer length that does not match the shape it should carry.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for TimeSeriesDiffusionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyMask => write!(
                f,
                "the mask asks for nothing; the loss will have no terms and the batch \
                 will report a healthy zero"
            ),
            Self::NoConditioning => {
                write!(f, "the mask leaves nothing observed; there is no conditioning")
            }
            Self::ContextOverflow { have, limit } => write!(
                f,
                "{have} observations exceed the {limit}-step pretrained context; the \
                 excess would be silently truncated"
            ),
            Self::TailNotEstimable { level, trajectories } => write!(
                f,
                "the {level} quantile from {trajectories} trajectories is a handful of \
                 order statistics and is noise"
            ),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for TimeSeriesDiffusionError {}

/// Per-window normalization, fitted on the OBSERVED values only.
///
/// Two details matter and both are easy to get wrong. It must use only the
/// observed positions, because including the masked ones leaks the answer into
/// the scaling. And it travels with the forecast, because undoing it is part
/// of producing the output rather than a separate step.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WindowScaler {
    mean: f64,
    scale: f64,
}

impl WindowScaler {
    pub fn fit(window: &[f64], mask: &TargetMask) -> Result<Self, TimeSeriesDiffusionError> {
        let observed: Vec<f64> = window
            .iter()
            .zip(mask.values())
            .filter(|(_, &m)| m == 0)
            .map(|(&value, _)| value)
            .collect();

        if observed.is_empty() {
            return Err(TimeSeriesDiffusionError::NoConditioning);
        }

        let mean = observed.iter().sum::<f64>() / observed.len() as f64;
        let variance = observed
            .iter()
            .map(|value| (value - mean) * (value - mean))
            .sum::<f64>()
            / observed.len() as f64;

        // A constant window gives zero variance; one leaves it unchanged
        // rather than dividing by zero.
        Ok(Self { mean, scale: variance.sqrt().max(1e-6) })
    }

    pub fn apply(&self, window: &[f64]) -> Vec<f64> {
        window.iter().map(|value| (value - self.mean) / self.scale).collect()
    }

    pub fn invert(&self, window: &[f64]) -> Vec<f64> {
        window.iter().map(|value| value * self.scale + self.mean).collect()
    }
}

/// Which positions are predicted. The whole modelling decision.
///
/// A model trained only on tail masks forecasts and imputes badly; one trained
/// on mixed masks does both. Making the mask a type with a task property means
/// that choice is visible rather than buried in a data loader.
pub struct TargetMask {
    values: Vec<u8>,
    predicted: usize,
}

impl TargetMask {
    pub fn new(values: Vec<u8>) -> Result<Self, TimeSeriesDiffusionError> {
        let predicted = values.iter().filter(|&&m| m != 0).count();
        if predicted == 0 {
            return Err(TimeSeriesDiffusionError::EmptyMask);
        }
        if predicted == values.len() {
            return Err(TimeSeriesDiffusionError::NoConditioning);
        }
        Ok(Self { values, predicted })
    }

    pub fn forecast(
        length: WindowLength,
        horizon: usize,
    ) -> Result<Self, TimeSeriesDiffusionError> {
        if horizon >= length.0 {
            return Err(TimeSeriesDiffusionError::NoConditioning);
        }
        let mut values = vec![0u8; length.0];
        values[length.0 - horizon..].fill(1);
        Self::new(values)
    }

    pub fn values(&self) -> &[u8] {
        &self.values
    }

    pub fn predicted_count(&self) -> usize {
        self.predicted
    }

    /// Derived from the shape rather than declared.
    ///
    /// A mask that is zeros then ones is a forecast; anything else with an
    /// interior gap is imputation. Deriving it means a mislabelled mask is
    /// impossible rather than merely unlikely.
    pub fn task(&self) -> TaskKind {
        let first = self.values.iter().position(|&m| m != 0).unwrap_or(0);
        if self.values[first..].iter().all(|&m| m != 0) {
            TaskKind::Forecast
        } else {
            TaskKind::Imputation
        }
    }
}

/// The pretrained window, which is a hard limit rather than a default.
#[derive(Debug, Clone, Copy)]
pub struct ContextWindow {
    pub length: WindowLength,
}

impl ContextWindow {
    /// Guard clause for the failure that is otherwise silent.
    ///
    /// A pretrained model given a longer history simply truncates and reports
    /// nothing, so the symptom is unexplained accuracy loss on exactly the
    /// series with the most data.
    pub fn assert_fits(&self, history: usize) -> Result<(), TimeSeriesDiffusionError> {
        if history > self.length.0 {
            return Err(TimeSeriesDiffusionError::ContextOverflow {
                have: history,
                limit: self.length.0,
            });
        }
        Ok(())
    }
}

/// Trajectories, the scaler, and the settings that produced them.
///
/// The scaler travels with the forecast because undoing it is part of
/// producing the output. The step and trajectory counts travel because quality
/// and cost are on a dial - a forecast reported without them is not comparable
/// to any other.
pub struct Forecast {
    trajectories: Vec<Vec<f64>>,
    pub scaler: WindowScaler,
    pub steps: DiffusionStep,
}

impl Forecast {
    pub fn new(
        trajectories: Vec<Vec<f64>>,
        scaler: WindowScaler,
        steps: DiffusionStep,
    ) -> Self {
        Self { trajectories, scaler, steps }
    }

    pub fn count(&self) -> TrajectoryCount {
        TrajectoryCount(self.trajectories.len())
    }

    pub fn quantile(&self, position: usize, level: f64) -> f64 {
        let mut values: Vec<f64> =
            self.trajectories.iter().map(|path| path[position]).collect();
        Self::select(&mut values, level)
    }

    /// Sum WITHIN each trajectory, then take the quantile.
    ///
    /// The joint-distribution advantage: summing per-step quantiles instead
    /// destroys the correlation between steps and is wrong in the unsafe
    /// direction for any aggregating decision.
    pub fn aggregate_quantile(&self, level: f64) -> f64 {
        let mut totals: Vec<f64> =
            self.trajectories.iter().map(|path| path.iter().sum()).collect();
        Self::select(&mut totals, level)
    }

    /// Whether there are enough trajectories for this quantile to mean
    /// anything. A 1st percentile from fifty trajectories is one order
    /// statistic and is pure noise.
    pub fn assert_tail_estimable(
        &self,
        level: f64,
        minimum: usize,
    ) -> Result<(), TimeSeriesDiffusionError> {
        let tail = level.min(1.0 - level);
        if tail * self.trajectories.len() as f64 >= minimum as f64 {
            Ok(())
        } else {
            Err(TimeSeriesDiffusionError::TailNotEstimable {
                level,
                trajectories: self.trajectories.len(),
            })
        }
    }

    fn select(values: &mut [f64], level: f64) -> f64 {
        let index = ((level * values.len() as f64) as usize).min(values.len() - 1);
        // select_nth_unstable, not a sort: a quantile is a selection and
        // ordering the rest is work whose result is discarded.
        values.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
        values[index]
    }
}

/// The loss applies ONLY where the mask is one.
pub fn masked_loss(
    epsilon: &[f64],
    predicted: &[f64],
    mask: &TargetMask,
) -> Result<f64, TimeSeriesDiffusionError> {
    if epsilon.len() != predicted.len() || epsilon.len() != mask.values().len() {
        return Err(TimeSeriesDiffusionError::ShapeMismatch {
            expected: epsilon.len(),
            found: predicted.len(),
        });
    }

    Ok(epsilon
        .iter()
        .zip(predicted)
        .zip(mask.values())
        .filter(|(_, &m)| m != 0)
        .map(|((e, p), _)| (e - p) * (e - p))
        .sum::<f64>()
        / mask.predicted_count() as f64)
}

/// Re-noise the observed values and substitute them back. EVERY step.
///
/// The single most commonly omitted step in this family. If the known
/// positions are fixed once at initialization and then left alone, the
/// denoiser drifts away from them as it works - it is filling a canvas and has
/// no reason to respect a region it was not asked about.
pub fn reimpose_observed(
    denoised: &mut [f64],
    observed: &[f64],
    mask: &TargetMask,
    alpha_bar_previous: f64,
    normals: &[f64],
) {
    let signal = alpha_bar_previous.sqrt();
    let noise_scale = (1.0 - alpha_bar_previous).sqrt();

    for (((slot, &o), &m), &z) in denoised
        .iter_mut()
        .zip(observed)
        .zip(mask.values())
        .zip(normals)
    {
        if m == 0 {
            *slot = signal * o + noise_scale * z;
        }
    }
}

/// The arithmetic that decides feasibility, computed rather than assumed.
pub fn inference_evaluations(
    steps: DiffusionStep,
    trajectories: TrajectoryCount,
    series: usize,
) -> usize {
    steps.0 * trajectories.0 * series
}
`,
        rationale:
          'Two changes. The mask becomes a type that validates it asks for something and leaves something observed, and that derives its task from its shape rather than being told — because forecasting and imputation are the same operation with different masks, so a mislabelled mask becomes impossible rather than merely unlikely, and a mask with nothing to predict produces a loss with no terms that reports a perfectly healthy zero. The second is that the per-window scaler becomes a type that travels with the forecast, because it is part of the inference path rather than preprocessing: it is fitted on observed positions only, since including the masked ones would leak the answer into the scaling, and undoing it is part of producing the output. Around those, the pretrained context becomes a type whose check names the failure it prevents — silent truncation, whose symptom is unexplained accuracy loss on exactly the series with the most history — quantiles use select_nth_unstable since a quantile is a selection, the forecast carries its step count because quality and cost are on a dial, and the tail-estimability check returns an error because a far-tail quantile from fifty trajectories is one order statistic. Newtypes separate window length, trajectory count and diffusion step, three quantities that are all usize and the last of which is routinely confused with the series index.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics with quantile selection dropping from O(S log S) to O(S). Illustrative, not a measured benchmark: deriving the task from the mask shape costs one scan and removes an entire class of configuration error.',
      },

      'make-it-fast': {
        code: `//! Batched over series AND trajectories, which is the only lever that helps.
//!
//! The structural situation is worth stating precisely, because it differs
//! from every other diffusion entry. Sampling cost here is STEPS x
//! TRAJECTORIES x SERIES, and only one of those three is sequential. Steps
//! must happen in order; trajectories and series are entirely independent and
//! fold into one batch axis.
//!
//! So the optimization is: collapse trajectories and series into a single
//! leading dimension, advance the whole thing through each sequential step
//! together, and accept that the step count is the only part that cannot be
//! parallelized away.
//!
//! Three changes:
//!   1. (series x trajectories) becomes one batch axis.
//!   2. The mask and the observed values are precomputed once, not per step.
//!   3. Re-imposition is a fused select rather than a branch per element.

use ndarray::{s, Array1, Array2, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Per-window mean and scale from the OBSERVED positions only.
///
/// Using the masked positions would leak the answer into the scaling, so the
/// reduction is weighted by the complement of the mask rather than taken over
/// the whole window - one pass, no compaction, no separate buffer.
pub fn fit_window_scalers(
    windows: ArrayView2<'_, f32>,
    mask: ArrayView2<'_, f32>,
) -> (Array1<f32>, Array1<f32>) {
    let rows = windows.shape()[0];
    let mut mean = Array1::<f32>::zeros(rows);
    let mut scale = Array1::<f32>::zeros(rows);

    Zip::from(&mut mean)
        .and(&mut scale)
        .and(windows.axis_iter(Axis(0)))
        .and(mask.axis_iter(Axis(0)))
        .par_for_each(|m, s, window, row_mask| {
            // The mask is stored as float so it multiplies rather than
            // branches - the observed indicator is one minus it.
            let mut total = 0.0f32;
            let mut counted = 0.0f32;
            for (&value, &masked) in window.iter().zip(row_mask.iter()) {
                let observed = 1.0 - masked;
                total += observed * value;
                counted += observed;
            }
            let row_mean = if counted > 0.0 { total / counted } else { 0.0 };

            let mut variance = 0.0f32;
            for (&value, &masked) in window.iter().zip(row_mask.iter()) {
                let centred = (1.0 - masked) * (value - row_mean);
                variance += centred * centred;
            }

            *m = row_mean;
            // A constant window gives zero variance; one leaves it unchanged
            // rather than dividing by zero.
            *s = (variance / counted.max(1.0)).sqrt().max(1e-6);
        });

    (mean, scale)
}

/// Fold (series, trajectories) into ONE batch axis.
///
/// This is the whole optimization. Trajectories and series are both entirely
/// independent, so they belong in the same dimension; only the diffusion steps
/// are sequential, and nothing rearranges that.
///
/// Each series' trajectories are kept CONTIGUOUS, which makes the per-series
/// quantile reduction at the end a contiguous read rather than a strided one.
pub fn expand_for_trajectories(
    windows: ArrayView2<'_, f32>,
    trajectories: usize,
) -> Array2<f32> {
    let series = windows.shape()[0];
    let width = windows.shape()[1];
    // Capacity known exactly: one allocation for the whole expanded batch.
    let mut expanded = Array2::<f32>::zeros((series * trajectories, width));

    expanded
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(row, mut target)| {
            target.assign(&windows.row(row / trajectories));
        });

    expanded
}

/// Every trajectory of every series advances through each step together.
pub struct BatchedSampler {
    alpha_bars: Array1<f32>,
    reverse_coefficient: Array1<f32>,
    root_alphas: Array1<f32>,
}

impl BatchedSampler {
    pub fn new(alpha_bars: Array1<f32>) -> Self {
        let steps = alpha_bars.len();
        // Every coefficient precomputed: these are constants of the schedule
        // and recomputing them inside the step loop is pure waste.
        let mut reverse_coefficient = Vec::with_capacity(steps);
        let mut root_alphas = Vec::with_capacity(steps);

        let mut previous = 1.0f32;
        for &bar in alpha_bars.iter() {
            let alpha = bar / previous;
            reverse_coefficient.push((1.0 - alpha) / (1.0 - bar).sqrt());
            root_alphas.push(alpha.sqrt());
            previous = bar;
        }

        Self {
            alpha_bars,
            reverse_coefficient: reverse_coefficient.into(),
            root_alphas: root_alphas.into(),
        }
    }

    pub fn steps(&self) -> usize {
        self.alpha_bars.len()
    }

    /// One denoising step with the observed values RE-IMPOSED.
    ///
    /// The step everyone forgets, and its absence is the most common
    /// implementation error in this family: if the known positions are fixed
    /// once at initialization the denoiser drifts away from them, because it
    /// is filling a canvas and has no reason to respect a region it was not
    /// asked about.
    ///
    /// Written as a fused select rather than a branch - the mask multiplies,
    /// so the loop stays vectorizable.
    pub fn reverse_step(
        &self,
        x_t: ArrayView2<'_, f32>,
        predicted: &mut Array2<f32>,
        observed: ArrayView2<'_, f32>,
        mask: ArrayView2<'_, f32>,
        t: usize,
        normals: ArrayView2<'_, f32>,
    ) {
        let coefficient = self.reverse_coefficient[t];
        let inverse_root = 1.0 / self.root_alphas[t];
        let signal = if t == 0 { 1.0 } else { self.alpha_bars[t - 1].sqrt() };
        let noise_scale = if t == 0 { 0.0 } else { (1.0 - self.alpha_bars[t - 1]).sqrt() };

        Zip::from(predicted)
            .and(x_t)
            .and(observed)
            .and(mask)
            .and(normals)
            .par_for_each(|target, &current, &known, &masked, &noise| {
                let denoised = (current - coefficient * *target) * inverse_root;
                let reimposed = signal * known + noise_scale * noise;
                // Select, not branch: the mask multiplies so this vectorizes.
                *target = masked * denoised + (1.0 - masked) * reimposed;
            });
    }
}

/// The loss applies ONLY where the mask is one.
///
/// The mask becomes a multiplicative weight rather than a filter, which keeps
/// the reduction vectorizable - and the count comes from the same pass.
pub fn masked_loss(
    epsilon: ArrayView2<'_, f32>,
    predicted: ArrayView2<'_, f32>,
    mask: ArrayView2<'_, f32>,
) -> f64 {
    let (total, counted) = Zip::from(epsilon)
        .and(predicted)
        .and(mask)
        .into_par_iter()
        .map(|(&e, &p, &m)| {
            let residual = m * (e - p);
            (f64::from(residual) * f64::from(residual), f64::from(m))
        })
        .reduce(|| (0.0, 0.0), |a, b| (a.0 + b.0, a.1 + b.1));

    if counted == 0.0 {
        0.0
    } else {
        total / counted
    }
}

/// Per-series quantiles from the flat (series * trajectories) layout.
///
/// The slicing is free because expand_for_trajectories kept each series'
/// trajectories contiguous.
pub fn trajectory_quantiles(
    trajectories: ArrayView2<'_, f32>,
    series: usize,
    count: usize,
    level: f32,
) -> Array2<f32> {
    let horizon = trajectories.shape()[1];
    let mut out = Array2::<f32>::zeros((series, horizon));

    out.axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(s, mut row)| {
            let block = trajectories.slice(s![s * count..(s + 1) * count, ..]);
            for h in 0..horizon {
                let mut values: Vec<f32> = block.column(h).to_vec();
                let index = ((level * count as f32) as usize).min(count - 1);
                // select_nth_unstable, not a sort: a quantile is a selection.
                values.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
                row[h] = values[index];
            }
        });

    out
}

/// The baseline that wins more often than the literature suggests.
///
/// One strided gather for a whole panel. Worth having in the same file as the
/// model: published comparisons for pretrained forecasters frequently omit
/// properly tuned classical baselines, and this costs nothing to run.
pub fn seasonal_naive(
    histories: ArrayView2<'_, f32>,
    horizon: usize,
    period: usize,
) -> Array2<f32> {
    let series = histories.shape()[0];
    let length = histories.shape()[1];
    let mut out = Array2::<f32>::zeros((series, horizon));

    Zip::from(out.axis_iter_mut(Axis(0)))
        .and(histories.axis_iter(Axis(0)))
        .par_for_each(|mut forecast, history| {
            for (h, slot) in forecast.iter_mut().enumerate() {
                *slot = history[length - period + (h % period)];
            }
        });

    out
}

/// The arithmetic that decides feasibility, computed rather than assumed.
///
/// Only ONE of these three factors is sequential. Trajectories and series both
/// fold into the batch, so the wall clock is set by steps and the hardware -
/// but the total work is the product, and it is routinely under-planned by an
/// order of magnitude.
pub fn inference_evaluations(steps: usize, trajectories: usize, series: usize) -> usize {
    steps * trajectories * series
}
`,
        rationale:
          'The structural situation here differs from every other diffusion entry and is worth stating precisely: sampling cost is steps times trajectories times series, and only one of those three is sequential. Steps must happen in order; trajectories and series are entirely independent and therefore belong in the same batch axis. So the optimization is to collapse them into one leading dimension and advance the whole thing through each step together, accepting that the step count is the only part that cannot be parallelized away. The expansion keeps each series’ trajectories contiguous deliberately, so the final per-series quantile reduction is a contiguous slice rather than a strided gather. The mask is stored as float rather than bool throughout, so every use is a multiply rather than a branch — which keeps the scaler fit, the fused reverse step and the loss reduction all vectorizable, and which also keeps the masked positions out of the scaling statistics, since including them would leak the answer. Re-imposition is fused into the same traversal as the denoising as a select, and every schedule coefficient including the reverse-step term is precomputed with known capacity at construction.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The scaler fit, the expansion, the fused reverse step, the loss reduction and the per-series quantiles are all row- or series-independent with no shared writes.',
            tradeoff: 'Only the batch axis parallelizes — the diffusion steps are sequential, so wall clock is set by step count and the machine, and a single-series interactive request gets almost nothing from the threading.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Keeping each series’ trajectories contiguous makes the per-series quantile block a slice rather than a strided gather, and the flat layout keeps every fused pass stride-one.',
            tradeoff: 'That layout is the wrong one for a per-trajectory diagnostic across series — comparing trajectory five of every series reads with a stride equal to the trajectory count, which is exactly what a sampling-variance investigation wants.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The reverse step writes through the prediction buffer rather than allocating a new state, and the expansion assigns from a view rather than copying through an intermediate.',
            tradeoff: 'The prediction is destroyed by the fused step, so inspecting what the model predicted at a given noise level — the natural diagnostic when completions look wrong — needs an unfused pass.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Both schedule coefficient tables have exactly known lengths and are built in a single pass over the cumulative products, so construction allocates once per table.',
            tradeoff: 'The per-series quantile still allocates a column vector per horizon position inside the parallel loop, which on a long horizon is a meaningful share of the reduction cost that a preallocated scratch per thread would avoid.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Trajectories and series collapse into one batched pass per step, leaving the step count as the only sequential factor. Illustrative, not a measured benchmark: the total work is unchanged — it is the product of all three factors — and only the wall clock improves, which is why the feasibility arithmetic still has to be done.',
      },
    },
  },
};
