import type { AiMlModel } from '../../types';

/**
 * Temporal Fusion Transformer — the forecasting architecture built around the
 * shape of the data rather than around attention.
 *
 * Its distinctive contribution is not the attention block but the typed input
 * split: static covariates, known-future covariates and observed-past
 * covariates each enter at the point where they are actually available. That,
 * plus a quantile head, is why it survived where most "transformer for time
 * series" papers did not.
 */
export const TEMPORAL_FUSION_TRANSFORMER: AiMlModel = {
  slug: 'temporal-fusion-transformer',
  name: 'Temporal Fusion Transformer',
  aliases: ['TFT', 'Interpretable multi-horizon forecasting', 'Variable selection network'],
  category: 'deep-learning',
  group: 'attention',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'sequence-modeling', 'anomaly-detection'],
  architecture: 'hybrid',
  paradigmNote:
    'Genuinely a hybrid rather than a transformer with extra parts: an LSTM does the local sequence processing, attention does the long-range selection, and gated residual units decide how much of either survives. Placed in the attention group because the interpretable attention layer is what it is known for, but calling it a transformer overstates how much of the work attention does.',

  intuition:
    'Most forecasting inputs are not the same kind of thing. Store size never changes; a public holiday next Tuesday is known now; yesterday’s footfall was observed and tomorrow’s will not be. A plain sequence model that concatenates all of these into one vector per timestep either leaks future information or throws away covariates it legitimately has. TFT keeps the three kinds separate by construction, learns which variables matter at each step, and emits quantiles rather than a point — which is what a forecast is actually for, since the decision downstream is almost always asymmetric in cost.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{|\\Omega|}\\sum_{(i,t,h)}\\sum_{q \\in Q} \\max\\Bigl(q\\bigl(y - \\hat{y}^{(q)}\\bigr),\\ (q-1)\\bigl(y - \\hat{y}^{(q)}\\bigr)\\Bigr)',
      symbols: [
        { symbol: 'q', meaning: 'a quantile level, typically {0.1, 0.5, 0.9}; the head emits one output per level' },
        { symbol: '\\hat{y}^{(q)}', meaning: 'the predicted q-quantile — a separate output, not a transform of a mean' },
        { symbol: 'h', meaning: 'forecast horizon; every horizon in the window is predicted at once, not recursively' },
        { symbol: '\\Omega', meaning: 'observed (series, time, horizon) triples — masked, since real panels are ragged' },
        { symbol: 'Q', meaning: 'the quantile set. Their monotonicity is not enforced and crossing does occur' },
      ],
    },
    reading:
      'The pinball loss, summed over quantile levels. Read one term at a time: for q equal to 0.9, under-predicting is penalized nine times as heavily as over-predicting, so the minimizer sits at the 90th percentile of the conditional distribution. That asymmetry is the whole mechanism, and it is why the model produces a distribution without ever assuming one — no Gaussian, no likelihood, just a loss whose minimizer is the quantile you asked for. The consequence people forget is that the levels are trained independently, so nothing forces the 90th percentile to exceed the 50th, and quantile crossing genuinely happens in the tails.',
  },

  optimization: {
    method: 'Adam on the quantile loss, with gated residual units and variable selection trained jointly end to end',
    updateRule: {
      formula:
        '\\mathrm{GRN}(\\mathbf{a}) = \\mathrm{LayerNorm}\\bigl(\\mathbf{a} + \\mathrm{GLU}(\\boldsymbol{\\eta})\\bigr), \\quad \\mathrm{GLU}(\\boldsymbol{\\eta}) = \\sigma(\\mathbf{W}_4\\boldsymbol{\\eta}) \\odot (\\mathbf{W}_5\\boldsymbol{\\eta}), \\quad \\mathbf{v} = \\mathrm{softmax}\\bigl(\\mathrm{GRN}_v(\\boldsymbol{\\Xi})\\bigr)',
      symbols: [
        { symbol: '\\mathrm{GLU}', meaning: 'gated linear unit — the gate can drive a whole sublayer to zero, which is how unused capacity is skipped' },
        { symbol: '\\mathbf{v}', meaning: 'variable-selection weights: a softmax over input variables, per timestep, and the model’s headline interpretability claim' },
        { symbol: '\\boldsymbol{\\Xi}', meaning: 'the flattened per-variable embeddings the selection network scores' },
        { symbol: '\\mathbf{a}', meaning: 'the residual input; a GRN can always fall back to passing it through unchanged' },
      ],
    },
    rationale:
      'The gating is the architectural idea worth taking away. Every nonlinear component is wrapped so that a gate can zero it out, which means the model can degrade to a linear pass-through wherever the extra capacity does not help — and on small forecasting datasets, which is most of them, that is frequently the right answer. It is an architecture that can choose to be smaller, and it is why TFT does not fall apart on a few thousand series the way a plain transformer does. Variable selection is a softmax over inputs computed per timestep, so the weights are both a regularizer and the model’s interpretability story; they should be read as importance to this model rather than as causal attribution, a distinction the paper is careful about and downstream users routinely are not. Training is otherwise ordinary Adam, and the whole thing is stable in a way this category rarely is.',
    hyperparameters: [
      { name: 'hidden size', role: 'Width shared by every GRN and the LSTM; the dominant capacity and cost lever', typicalRange: '16 to 160' },
      { name: 'attention heads', role: 'Interpretable heads share value weights so the attention averages into one readable map', typicalRange: '1 to 4' },
      { name: 'dropout', role: 'Higher than usual for a deep model, because the datasets are small', typicalRange: '0.1 to 0.3' },
      { name: 'encoder length', role: 'History window fed to the LSTM; attention can reach anywhere inside it', typicalRange: '2 to 10 seasonal cycles' },
      { name: 'prediction length', role: 'Horizons emitted at once; all are produced directly rather than recursively', typicalRange: '1 to 60 steps' },
      { name: 'quantile levels', role: 'Which quantiles to emit. More levels cost almost nothing and are rarely regretted', typicalRange: '{0.1, 0.5, 0.9} to deciles' },
      { name: 'gradient clip norm', role: 'The LSTM component still explodes without it, transformer parts notwithstanding', typicalRange: '0.1 to 1.0' },
    ],
    convergence:
      'Unusually well-behaved for something this elaborate, largely because the gating lets unhelpful components switch themselves off rather than fighting the data. The characteristic failures are not optimization failures. Quantile crossing appears in the tails because the levels are trained independently and nothing couples them — the 90th percentile can come out below the 50th, and it must be repaired by sorting or by a monotone parameterization. Variable-selection weights are unstable across seeds when inputs are correlated, so an importance ranking that changes run to run is the normal case rather than a bug, and treating it as a finding is a real risk. And the model quietly overfits a small panel: the validation loss looks fine while the selection weights concentrate on one spurious covariate.',
    complexity:
      'O(L · d²) for the recurrent encoder plus O((L+H)² · d) for attention over the combined window, with L the encoder length and H the horizon. The LSTM is sequential in L and is usually the wall-clock bottleneck, since the windows are short enough that the quadratic attention term rarely dominates.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Declare every input by type — static (never changes per series), known-future (calendar, promotions, prices you set), observed-past (everything measured) — and the architecture routes each to where it is legitimately available. A shared LSTM encodes the history, attention selects across it, and a quantile head emits every horizon at once. Static covariates are used to condition the encoder rather than being repeated at every timestep, which is both cheaper and more effective.',
        where: [
          'Retail demand forecasting across thousands of SKUs with promotions and holidays known in advance',
          'Energy load and price forecasting, where weather forecasts are genuine known-future inputs',
          'Traffic and occupancy forecasting with calendar effects that dominate the signal',
          'Any panel where uncertainty matters as much as the point forecast — inventory, staffing, capacity',
        ],
        why: 'It wins where the typed input split is real: if you genuinely have known-future covariates, a model that consumes them correctly beats one that cannot, and most sequence models cannot without leaking. Native quantiles are the second reason and arguably the bigger one, because inventory and capacity decisions need a tail rather than a mean, and bolting quantiles onto a point model afterwards is worse than training them. Against it: on a single series or a few dozen it loses to exponential smoothing or ARIMA and costs orders of magnitude more; against gradient boosting on well-constructed lag features it frequently wins by only a few percent, which is a poor trade against the operational complexity unless the quantiles or the interpretability are genuinely used.',
        featurization: [
          'Classify every covariate as static, known-future or observed-past before anything else — this is the modelling decision, and getting it wrong either leaks or discards information',
          'Scale per series and persist the scalers with the model; they are part of the artifact, not preprocessing',
          'Encode calendar structure explicitly as known-future inputs rather than leaving the model to rediscover the weekly cycle',
          'Keep the encoder window at several seasonal cycles so attention has something to select from',
          'Predict every horizon directly, never recursively, which avoids compounding the model’s own errors',
        ],
        evaluation:
          'Rolling-origin backtesting with quantile loss reported per level and per horizon, plus MASE at the median against seasonal-naive and exponential smoothing. Calibration matters separately from accuracy: check empirical coverage of the 10th and 90th percentiles, because a well-scored model with 70 percent coverage on a nominal 80 percent interval will systematically under-stock.',
        pitfalls: [
          'Mislabelling an observed-past covariate as known-future, which is a complete and silent invalidation of the backtest',
          'Reporting only median accuracy while the intervals are badly calibrated, which is the failure that actually costs money',
          'Quantile crossing in the tails going unnoticed and unrepaired',
          'Skipping the gradient-boosting baseline, which on many panels is within a few percent for a fraction of the complexity',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train the forecaster on normal operation and use the predicted interval as the detector: an observation outside the 1st-to-99th-percentile band is flagged, and the degree of exceedance is the score. Because the intervals are conditional on calendar and known-future covariates, the band widens on a holiday or a promotion by itself, which is exactly what a fixed threshold cannot do.',
        where: [
          'Demand and revenue monitoring, where the question is whether today is unusual given everything known in advance',
          'Energy and utility consumption monitoring with weather-conditioned expectations',
          'Business KPI monitoring where the baseline has strong calendar structure and a static threshold alarms every Monday',
          'Capacity and SLA monitoring, where the actionable signal is breaching a predicted upper bound',
        ],
        why: 'The conditional interval is a genuinely better detector than a fixed band because the model already knows the day is a holiday, and that removes the largest single source of false positives in calendar-driven metrics. It is also free, in the sense that the forecaster was going to be built anyway. The honest framing is that this is a by-product: the model optimizes forecast accuracy and nothing about anomalies, so a subtle anomaly well inside a wide interval is invisible, and the interval width itself becomes the sensitivity knob whether you intended that or not. On point outliers with no temporal structure an isolation forest is both better and vastly cheaper.',
        featurization: [
          'Emit wider quantiles than you forecast with — 1st and 99th percentiles for detection, not the 10th and 90th used for planning',
          'Calibrate coverage on a held-out normal period, since nominal and empirical coverage differ more than expected',
          'Score by exceedance relative to interval width, so a breach on a naturally volatile series is not ranked above one on a stable series',
          'Persist known-future covariates for the scoring window; without the holiday flag the interval is wrong exactly when it matters',
        ],
        evaluation:
          'Precision and recall against labelled incidents with a detection window rather than exact-timestep matching. Report empirical interval coverage separately from detection quality — an uncalibrated interval produces a detector whose false-positive rate has nothing to do with the nominal level, and that is invisible in a precision-recall curve alone.',
        pitfalls: [
          'A training period that contains the incidents you want to detect, teaching the model they are normal',
          'Using planning quantiles for detection, which alarms roughly twenty percent of the time by construction',
          'Missing known-future covariates at scoring time, so the interval is narrow on exactly the days it should be wide',
          'Treating interval width as a modelling artifact rather than as the sensitivity setting it actually is',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'Quantile forecasts feed asymmetric-cost decisions directly, and the connection is exact rather than analogical. The newsvendor result says the optimal order quantity is the demand quantile at the critical fractile — underage cost over the sum of underage and overage cost — so a model that emits quantiles hands the optimizer precisely what it needs, with no distributional assumption in between. That is the cleanest bridge in this reference between a forecast and a decision.',
        where: [
          'Inventory ordering at the newsvendor critical fractile, where the quantile IS the decision',
          'Staffing and capacity planning, where understaffing and overstaffing have different and known costs',
          'Energy reserve procurement, sized against an upper quantile of load rather than against a mean',
          'Safety-stock setting, where the service level is a quantile by definition',
        ],
        why: 'Worth studying because it makes explicit something usually left implicit: the forecast metric and the decision metric are different, and a model with worse MAE can produce better decisions if its tail is better calibrated. The newsvendor fractile turns a vague "we need uncertainty" into an exact quantile to request, which is unusually actionable. The limits are real though — the closed form covers a single period and a single product, and any of multi-period dynamics, capacity constraints or substitution between products puts you into a stochastic program that a quantile alone does not solve.',
        featurization: [
          'Emit the specific quantile the critical fractile calls for, rather than a standard set that happens not to include it',
          'Check empirical coverage before trusting the fractile; an uncalibrated quantile produces a confidently wrong order quantity',
          'Model the cost asymmetry explicitly rather than assuming it is symmetric, which is the default and is almost never true',
          'Treat crossing quantiles as a correctness bug here, since a non-monotone quantile function makes the fractile meaningless',
        ],
        evaluation:
          'Score the decision rather than the forecast: realized cost against the hindsight-optimal order. Report it alongside quantile loss, because the two rank models differently and the decision cost is the one that matters.',
        pitfalls: [
          'Using a point forecast plus a safety factor, which implicitly assumes a symmetric distribution that the data rarely has',
          'Applying the single-period newsvendor formula to a multi-period problem with carryover, where it is simply wrong',
          'Trusting a quantile whose empirical coverage was never measured',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'The quantile forecast becomes the uncertain input to an operational plan: predicted load with intervals feeds unit commitment, predicted demand with intervals feeds fulfilment and dispatch. Known-future covariates are what make this work in practice, since an operational planner already knows next week’s promotions and the model should too.',
        where: [
          'Workforce scheduling against a forecast demand distribution rather than a point',
          'Grid unit commitment and reserve sizing at an upper load quantile',
          'Fulfilment and logistics planning where lead times force a decision before demand is observed',
        ],
        why: 'The typed-input structure matches how operations actually work — the plan is made with knowledge of what is scheduled — and quantiles are what a robust or chance-constrained plan consumes. The recurring difficulty is the feedback loop: the plan changes the system, so the model is trained on operations that the deployment then alters, and backtesting cannot reveal it. Retrain cadence has to be tied to how fast the policy changes, not to the calendar.',
        featurization: [
          'Feed the planned action as a known-future covariate where it is genuinely known, or the model attributes its effect elsewhere',
          'Match the forecast horizon to the decision lead time; a longer horizon is wasted effort and a shorter one is unusable',
          'Keep the quantile set aligned with the service levels the operation is actually committed to',
        ],
        evaluation:
          'Regret against the hindsight-optimal plan, plus realized service level against target. Forecast accuracy is a diagnostic here, not the objective.',
        pitfalls: [
          'The plan shifting the distribution the model was trained on, which no amount of backtesting exposes',
          'Optimizing median accuracy when the plan consumes a tail quantile',
          'Reading variable-selection weights as causal and changing operational policy on that basis',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Used for forecasting risk aggregates rather than for scoring individual events: expected claim volume, transaction throughput, chargeback rates — quantities with strong calendar structure where the upper quantile drives a capacity or reserve decision.',
        where: [
          'Claims and loss volume forecasting for reserving and staffing',
          'Transaction volume forecasting for fraud-review capacity planning',
          'Portfolio-level exposure forecasting where the tail is the decision-relevant quantity',
        ],
        why: 'The tail is the point in risk work, and a model that emits quantiles natively is a better fit than a point model with an assumed error distribution bolted on. But this is aggregate forecasting, not per-entity risk scoring: the model has no notion of an individual transaction and should never be pointed at one. For that, a supervised classifier on entity features is the right tool and this is not a substitute.',
        featurization: [
          'Forecast at the aggregation level the decision is made at, not finer, since the noise at entity level swamps the signal',
          'Include known-future operational covariates — campaigns, releases, policy changes — which drive most of the visible variance',
          'Validate tail coverage specifically, because that is the only part of the distribution the decision uses',
        ],
        evaluation:
          'Quantile loss at the decision-relevant levels plus empirical exceedance frequency against nominal. Backtest strictly by time; a reserving model validated on a random split is meaningless.',
        pitfalls: [
          'Mistaking aggregate forecasting for entity-level risk scoring, which this model cannot do',
          'Regime changes from a policy or product launch invalidating the learned dynamics with no warning',
          'Tail quantiles fitted on a period containing no tail events, which are then confidently too narrow',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on a single GPU for a panel of a few thousand series — small by deep-learning standards. The sequential LSTM is the bottleneck rather than attention, since encoder windows are short enough that the quadratic term rarely binds.',
    inferenceProfile:
      'One forward pass per series per cycle, producing every horizon and every quantile at once: milliseconds per series, and trivially batched across a panel. Forecasting is a batch workload by nature, so latency is almost never the constraint here.',
    retrainingCadence:
      'Monthly to quarterly for stable demand, and immediately after any change to the covariate set or the promotion calendar — a new covariate is a structural change, not a data update.',
    driftAndMonitoring: [
      'Track empirical coverage of each quantile against its nominal level; drifting coverage is the first symptom and it appears before accuracy moves',
      'Watch per-series bias rather than the panel aggregate, since a handful of badly drifting series vanish in the mean',
      'Log variable-selection weights over time — a large shift means the learned structure changed, which is worth investigating even when accuracy has not moved',
      'Alert on missing known-future covariates at scoring time, which silently narrows intervals exactly when they should widen',
    ],
    productionGotchas: [
      'The static, known-future and observed-past split is a contract between the feature pipeline and the model. Move a column between categories and the model is invalid, usually without any error',
      'Known-future covariates must be available for the full horizon at scoring time. Missing them does not fail — it produces a confident forecast built on defaults',
      'Quantiles can cross. Nothing in the loss prevents it, and any downstream consumer must sort or otherwise enforce monotonicity',
      'Per-series scalers are part of the model artifact and must be versioned with the weights; refitting at inference silently changes every forecast',
      'A series unseen at training time has no learned static embedding, so cold-start needs an explicit path rather than a zero vector',
    ],
  },

  assumptions: [
    'Covariates can be honestly classified as static, known-future or observed-past — the central assumption, and the one that invalidates everything when it is wrong',
    'Known-future covariates really will be available across the whole horizon at scoring time, not just historically',
    'Enough related series exist to fit a high-capacity model; on a single series this is the wrong tool by a wide margin',
    'The relationship between covariates and target is stable enough over the horizon that patterns learned on history persist',
    'The quantiles of interest are estimable from the data, which fails for extreme tails on short histories',
  ],

  pros: [
    {
      point: 'Consumes known-future covariates correctly',
      context:
        'A promotion calendar or a weather forecast enters where it is legitimately available, which most sequence models cannot arrange without leaking. Decisive in retail and energy; worth nothing when no future covariates exist.',
    },
    {
      point: 'Native quantiles rather than a point forecast',
      context:
        'The decision downstream is almost always asymmetric in cost, and the quantile is what it needs. Training the quantiles directly beats assuming an error distribution around a mean, and it connects exactly to the newsvendor fractile.',
    },
    {
      point: 'Gating lets the model choose to be smaller',
      context:
        'Every nonlinear component can be gated to zero, so it degrades gracefully toward linear on small data. This is why it works on a few thousand series where a plain transformer collapses, and it is the most transferable idea in the architecture.',
    },
    {
      point: 'Variable-selection weights are genuinely readable',
      context:
        'Not causal, and unstable under correlated inputs, but a real diagnostic that stakeholders can inspect — which is rare and often decisive in getting a forecasting model deployed at all.',
    },
    {
      point: 'One model across the whole panel',
      context:
        'Static embeddings let a short-history series borrow structure from long-history ones, which is where most of the practical accuracy gain comes from. The same argument as for any global forecasting model.',
    },
  ],

  cons: [
    {
      point: 'Substantially more machinery than the baseline it must beat',
      context:
        'Against gradient boosting on good lag features it frequently wins by a few percent for an order of magnitude more complexity. Justified when the quantiles or the future covariates are genuinely used, and hard to justify otherwise.',
    },
    {
      point: 'Quantiles are trained independently and can cross',
      context:
        'Nothing in the loss couples the levels, so the 90th percentile can fall below the 50th in the tails. Every downstream consumer has to repair it, and it is a correctness bug wherever the quantile function itself is used.',
    },
    {
      point: 'The input-type split is a rigid contract',
      context:
        'A covariate moved between categories invalidates the model with no error raised. This is the most common production failure with TFT and it is entirely a pipeline-discipline problem.',
    },
    {
      point: 'Interpretability is easy to over-read',
      context:
        'Selection weights are importance to this model, not causal effect, and they shift between seeds when inputs are correlated. Presenting them as findings to a business audience is a real and frequently realized risk.',
    },
    {
      point: 'Wrong tool on few series',
      context:
        'On one series with a few hundred observations, exponential smoothing wins and costs nothing. The honest trigger is a wide panel with real covariates, not the sophistication of the problem.',
    },
  ],

  relatedSlugs: ['transformer', 'lstm', 'deepar', 'n-beats', 'gradient-boosting'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""The three distinctive pieces of TFT, transcribed literally.

  1. Gated Residual Network - the component that can switch itself off
  2. Variable Selection Network - a softmax over INPUTS, per timestep
  3. Quantile (pinball) loss - what makes the output a distribution

Attention and the LSTM are standard and covered elsewhere in this reference;
what is specific to TFT is these three, so these three are what is written
out. Plain loops, no libraries.
"""

import math


def sigmoid(value):
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def elu(value):
    """ELU rather than ReLU, deliberately: a GRN that has gated itself off
    should pass small negative values through smoothly rather than clipping
    them, so the residual path stays informative."""
    return value if value > 0.0 else math.exp(value) - 1.0


def matvec(weight, vector, bias):
    """weight is out_dim rows of in_dim."""
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def layer_norm(vector, gain, shift, epsilon=1e-6):
    mean = sum(vector) / len(vector)
    variance = sum((value - mean) ** 2 for value in vector) / len(vector)
    denominator = math.sqrt(variance + epsilon)
    return [
        (value - mean) / denominator * gain[i] + shift[i]
        for i, value in enumerate(vector)
    ]


def gated_linear_unit(vector, weight_value, bias_value, weight_gate, bias_gate):
    """GLU: one branch is the value, the other is a gate in [0, 1].

    The gate CAN go to zero, and that is the point - it lets the network
    delete a whole sublayer rather than having to learn the identity through
    it. On the small datasets forecasting actually has, switching capacity
    off is frequently the right answer.
    """
    values = matvec(weight_value, vector, bias_value)
    gates = matvec(weight_gate, vector, bias_gate)
    return [value * sigmoid(gate) for value, gate in zip(values, gates)]


def gated_residual_network(primary, context, params):
    """GRN(a, c) = LayerNorm(a + GLU(eta)), eta = ELU(W1 a + W2 c).

    \`context\` is optional static conditioning - a static covariate enters
    here rather than being repeated at every timestep, which is both cheaper
    and, more importantly, keeps it recognizably static.
    """
    hidden = matvec(params['w1'], primary, params['b1'])
    if context is not None:
        # No bias on the context projection: the primary branch already has
        # one and two would be redundant.
        contribution = matvec(params['w2'], context, [0.0] * len(hidden))
        hidden = [a + b for a, b in zip(hidden, contribution)]
    hidden = [elu(value) for value in hidden]

    gated = gated_linear_unit(
        hidden, params['w_value'], params['b_value'],
        params['w_gate'], params['b_gate'],
    )

    # The residual is what makes "switch yourself off" meaningful: with the
    # gate at zero, the whole component becomes LayerNorm(a).
    residual = [a + g for a, g in zip(primary, gated)]
    return layer_norm(residual, params['ln_gain'], params['ln_shift'])


def softmax(scores):
    peak = max(scores)
    exponentials = [math.exp(score - peak) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def variable_selection(variable_embeddings, static_context, params):
    """A softmax over VARIABLES, computed fresh at every timestep.

    variable_embeddings: one vector per input variable, all the same width.
    Returns the weighted combination and the weights themselves - the weights
    are the model's interpretability story and have to come back out.
    """
    flattened = [value for embedding in variable_embeddings for value in embedding]

    # Selection is conditioned on the static context, so a large store and a
    # small store can weight promotions differently.
    scores = gated_residual_network(flattened, static_context, params['selection'])
    weights = softmax(scores[:len(variable_embeddings)])

    # Each variable also passes through its OWN GRN before being combined,
    # so selection and transformation are separate jobs.
    transformed = [
        gated_residual_network(embedding, None, params['per_variable'][index])
        for index, embedding in enumerate(variable_embeddings)
    ]

    width = len(transformed[0])
    combined = [0.0] * width
    for weight, vector in zip(weights, transformed):
        for d in range(width):
            combined[d] += weight * vector[d]

    return combined, weights


def quantile_loss(predictions, target, quantiles):
    """Pinball loss, summed over quantile levels.

    For q = 0.9, under-predicting costs 9x what over-predicting costs, so the
    minimizer sits at the 90th percentile. That asymmetry is the entire
    mechanism - no distribution is ever assumed.
    """
    total = 0.0
    for prediction, q in zip(predictions, quantiles):
        error = target - prediction
        total += max(q * error, (q - 1.0) * error)
    return total


def masked_quantile_loss(predictions, targets, observed, quantiles):
    """Real panels are ragged. An unmasked loss trains on the padding."""
    total = 0.0
    counted = 0
    for series in range(len(predictions)):
        for horizon in range(len(predictions[series])):
            if not observed[series][horizon]:
                continue
            total += quantile_loss(
                predictions[series][horizon], targets[series][horizon], quantiles
            )
            counted += 1
    if counted == 0:
        raise ValueError("every target in the batch is masked out")
    return total / counted


def repair_crossing(prediction_row):
    """Quantile levels are trained INDEPENDENTLY, so nothing stops the 90th
    percentile coming out below the 50th. Sorting is the crude repair and it
    is what most production systems actually do."""
    return sorted(prediction_row)
`,
        profile:
          'Each GRN is O(d^2) and variable selection runs one per input variable per timestep, so a block is O(V * L * d^2). Illustrative, not a measured benchmark: with a dozen variables and a 90-step window this is already millions of interpreter iterations before the LSTM or attention is reached.',
      },

      'make-it-right': {
        code: `"""The same three components, with the input-type contract made a type.

The substantive change is not the arithmetic. It is that the static /
known-future / observed-past split - which is TFT's central idea and its most
common production failure - stops being a convention the pipeline is trusted
to honour and becomes a structure that checks itself.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple, Sequence


class InputKind(Enum):
    """The classification the whole architecture is built on.

    Getting this wrong is the model's signature failure: label an observed
    covariate as known-future and the backtest is invalidated completely,
    silently, and in the optimistic direction.
    """

    STATIC = 'static'
    KNOWN_FUTURE = 'known-future'
    OBSERVED_PAST = 'observed-past'


class LeakageError(ValueError):
    """Raised when a covariate is used beyond the point it is available.

    Its own type because the consequence is specific and severe: a model that
    has leaked does not fail, it reports excellent validation accuracy.
    """


class ShapeMismatch(ValueError):
    """Raised on a shape violation instead of broadcasting past it."""


@dataclass(frozen=True)
class InputSpec:
    """One covariate and where it may legitimately be read."""

    name: str
    kind: InputKind
    cardinality: int | None = None  # None means continuous

    @property
    def is_categorical(self) -> bool:
        return self.cardinality is not None


@dataclass(frozen=True)
class InputSchema:
    """The contract between the feature pipeline and the model.

    Frozen and validated, so a covariate cannot drift between categories
    between training and serving without the mismatch being visible.
    """

    specs: tuple[InputSpec, ...]

    def __post_init__(self) -> None:
        names = [spec.name for spec in self.specs]
        if len(names) != len(set(names)):
            raise ShapeMismatch('duplicate covariate names in the schema')
        if not self.by_kind(InputKind.OBSERVED_PAST):
            raise ShapeMismatch('a forecaster needs at least one observed history')

    def by_kind(self, kind: InputKind) -> tuple[InputSpec, ...]:
        return tuple(spec for spec in self.specs if spec.kind is kind)

    def encoder_variables(self) -> tuple[InputSpec, ...]:
        """History sees everything: the past is fully observed."""
        return tuple(
            spec for spec in self.specs if spec.kind is not InputKind.STATIC
        )

    def decoder_variables(self) -> tuple[InputSpec, ...]:
        """The future sees ONLY known-future covariates. This method is the
        whole leakage guarantee, expressed once rather than per call site."""
        return self.by_kind(InputKind.KNOWN_FUTURE)

    def fingerprint(self) -> tuple[tuple[str, str], ...]:
        """Comparable across training and serving, so a silently reclassified
        covariate is caught at load time rather than never."""
        return tuple((spec.name, spec.kind.value) for spec in self.specs)


def assert_schema_matches(trained: InputSchema, serving: InputSchema) -> None:
    """Guard clause for the failure that has no other symptom."""
    if trained.fingerprint() != serving.fingerprint():
        raise LeakageError(
            'serving schema differs from the trained schema; a covariate has '
            'changed kind and the model is no longer valid'
        )


@dataclass(frozen=True)
class QuantileSet:
    """Quantile levels, validated and kept sorted.

    Sorted because the crossing repair depends on it, and validated because a
    level outside (0, 1) produces a loss that is silently unbounded.
    """

    levels: tuple[float, ...] = (0.1, 0.5, 0.9)

    def __post_init__(self) -> None:
        if not self.levels:
            raise ShapeMismatch('at least one quantile level is required')
        if any(not 0.0 < level < 1.0 for level in self.levels):
            raise ShapeMismatch('quantile levels must lie strictly inside (0, 1)')
        if list(self.levels) != sorted(self.levels):
            raise ShapeMismatch('quantile levels must be given in ascending order')

    @property
    def median_index(self) -> int:
        """Where the point forecast lives, if one is needed at all."""
        return min(
            range(len(self.levels)),
            key=lambda i: abs(self.levels[i] - 0.5),
        )


class SelectionResult(NamedTuple):
    """The combined vector AND the weights.

    The weights are the interpretability story and must come back out rather
    than being discarded inside the layer - but they are importance to this
    model, not causal effect, and the name says combined first for a reason.
    """

    combined: list[float]
    weights: list[float]


@dataclass
class GrnParams:
    """One gated residual network's parameters."""

    w1: list[list[float]]
    b1: list[float]
    w_value: list[list[float]]
    b_value: list[float]
    w_gate: list[list[float]]
    b_gate: list[float]
    ln_gain: list[float]
    ln_shift: list[float]
    w_context: list[list[float]] | None = field(default=None)


def sigmoid(value: float) -> float:
    """Branch on sign so exp cannot overflow on a large negative input."""
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def elu(value: float) -> float:
    """ELU, not ReLU: a gated-off GRN should pass small negatives through
    smoothly rather than clipping them, keeping the residual path useful."""
    return value if value > 0.0 else math.expm1(value)


def matvec(weight: Sequence[Sequence[float]], vector: Sequence[float],
           bias: Sequence[float] | None = None) -> list[float]:
    if weight and len(weight[0]) != len(vector):
        raise ShapeMismatch(f'weight expects {len(weight[0])} inputs, got {len(vector)}')
    return [
        (bias[i] if bias is not None else 0.0) + math.fsum(
            w * v for w, v in zip(row, vector)
        )
        for i, row in enumerate(weight)
    ]


def layer_norm(vector: Sequence[float], gain: Sequence[float],
               shift: Sequence[float], epsilon: float = 1e-6) -> list[float]:
    mean = math.fsum(vector) / len(vector)
    variance = math.fsum((value - mean) ** 2 for value in vector) / len(vector)
    denominator = math.sqrt(variance + epsilon)
    return [
        (value - mean) / denominator * g + s
        for value, g, s in zip(vector, gain, shift)
    ]


def gated_residual_network(
    primary: Sequence[float],
    params: GrnParams,
    context: Sequence[float] | None = None,
) -> list[float]:
    """GRN(a, c) = LayerNorm(a + GLU(ELU(W1 a + W2 c))).

    With the gate at zero the whole component collapses to LayerNorm(a),
    which is what lets the network choose to be smaller. On the dataset sizes
    forecasting actually has, that is frequently the right choice.
    """
    if context is not None and params.w_context is None:
        raise ShapeMismatch('context supplied but this GRN has no context projection')

    hidden = matvec(params.w1, primary, params.b1)
    if context is not None and params.w_context is not None:
        # No bias here: the primary branch already carries one.
        for i, value in enumerate(matvec(params.w_context, context)):
            hidden[i] += value
    hidden = [elu(value) for value in hidden]

    values = matvec(params.w_value, hidden, params.b_value)
    gates = matvec(params.w_gate, hidden, params.b_gate)
    gated = [value * sigmoid(gate) for value, gate in zip(values, gates)]

    residual = [a + g for a, g in zip(primary, gated)]
    return layer_norm(residual, params.ln_gain, params.ln_shift)


def stable_softmax(scores: Sequence[float]) -> list[float]:
    peak = max(scores)
    exponentials = [math.exp(score - peak) for score in scores]
    total = math.fsum(exponentials)
    return [value / total for value in exponentials]


def variable_selection(
    embeddings: Sequence[Sequence[float]],
    selection_params: GrnParams,
    per_variable_params: Sequence[GrnParams],
    static_context: Sequence[float] | None = None,
) -> SelectionResult:
    """Softmax over VARIABLES, computed fresh at every timestep."""
    if len(embeddings) != len(per_variable_params):
        raise ShapeMismatch('one per-variable GRN is required for each variable')

    flattened = [value for embedding in embeddings for value in embedding]
    scores = gated_residual_network(flattened, selection_params, static_context)
    weights = stable_softmax(scores[:len(embeddings)])

    # Selection and transformation are separate jobs: each variable passes
    # through its own GRN before the weighted combination.
    transformed = [
        gated_residual_network(embedding, params)
        for embedding, params in zip(embeddings, per_variable_params)
    ]

    width = len(transformed[0])
    combined = [0.0] * width
    for weight, vector in zip(weights, transformed):
        for d in range(width):
            combined[d] += weight * vector[d]

    return SelectionResult(combined=combined, weights=weights)


def quantile_loss(
    predictions: Sequence[float],
    target: float,
    quantiles: QuantileSet,
) -> float:
    """Pinball loss summed over levels.

    For q = 0.9 under-prediction costs nine times over-prediction, so the
    minimizer is the 90th percentile. No distribution is assumed anywhere.
    """
    if len(predictions) != len(quantiles.levels):
        raise ShapeMismatch(
            f'{len(predictions)} predictions for {len(quantiles.levels)} levels'
        )
    total = 0.0
    for prediction, level in zip(predictions, quantiles.levels):
        error = target - prediction
        total += max(level * error, (level - 1.0) * error)
    return total


def repair_crossing(predictions: Sequence[float]) -> list[float]:
    """Levels are trained independently, so nothing prevents the 90th
    percentile falling below the 50th. Sorting is the crude repair and it is
    what most production systems do - but it should be COUNTED, because
    frequent crossing means the tail quantiles are not trustworthy."""
    return sorted(predictions)


def crossing_rate(batch: Sequence[Sequence[float]]) -> float:
    """Monitor rather than silently repair: this belongs on a dashboard."""
    if not batch:
        return 0.0
    crossed = sum(1 for row in batch if list(row) != sorted(row))
    return crossed / len(batch)
`,
        rationale:
          'The arithmetic barely changes; the contract does. TFT’s central idea is the static / known-future / observed-past classification, and its signature production failure is a covariate silently changing category between training and serving — which does not raise an error, it reports excellent validation accuracy. So the classification becomes an enum, the schema becomes a frozen validated structure that derives which variables the encoder and decoder may each see, and the leakage guarantee is expressed once in decoder_variables rather than being re-derived at every call site. A schema fingerprint makes the mismatch detectable at load time, with its own exception type because the consequence is specific and severe. The quantile set is validated and kept sorted, since a level outside the unit interval makes the loss silently unbounded and the crossing repair depends on the ordering. Crossing itself gets a rate function rather than only a repair, because repairing quietly hides that the tail quantiles have stopped being trustworthy. ELU rather than ReLU is documented as deliberate, and the sigmoid branches on sign so a large negative gate cannot overflow.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly rather than in speed. Illustrative, not a measured benchmark: fsum and the validation add a small constant and buy a contract that holds across the training-to-serving boundary.',
      },

      'make-it-fast': {
        code: `"""Batched over series, horizons and variables. Every GRN becomes a GEMM.

Three changes:

  1. A GRN is two matrix products and pointwise arithmetic. Batched across
     (series x timestep) it is one GEMM, and the value and gate branches
     share ONE weight with 2 * d columns so the pair costs one product.
  2. The per-variable GRNs, which the loop version runs V times, become a
     single batched matmul over a (V, d_in, d_out) weight stack - einsum,
     not a loop, because V is typically a dozen and the loop overhead
     dominates the arithmetic at that size.
  3. Quantile loss vectorizes exactly: the pinball max is a where over a
     sign, so every level and horizon is scored in one pass.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def elu_(values: NDArray[np.float32]) -> NDArray[np.float32]:
    """In-place ELU. expm1 rather than exp minus one: for small negative
    inputs the naive form loses every significant digit."""
    negative = values < 0.0
    values[negative] = np.expm1(values[negative])
    return values


def gated_residual_network(
    primary: NDArray[np.float32],
    w1: NDArray[np.float32],
    b1: NDArray[np.float32],
    w_gated: NDArray[np.float32],
    b_gated: NDArray[np.float32],
    gain: NDArray[np.float32],
    shift: NDArray[np.float32],
    context: NDArray[np.float32] | None = None,
    w_context: NDArray[np.float32] | None = None,
) -> NDArray[np.float32]:
    """primary is (..., d). Everything leading batches.

    w_gated is (d_hidden, 2 * d): value and gate side by side, so the GLU
    costs one GEMM rather than two over the same input.
    """
    hidden = primary @ w1
    hidden += b1
    if context is not None and w_context is not None:
        # Static context broadcasts over the time axis rather than being
        # tiled - the whole reason static covariates are kept separate.
        hidden += context @ w_context

    elu_(hidden)

    projected = hidden @ w_gated
    projected += b_gated
    width = projected.shape[-1] // 2
    value = projected[..., :width]
    gate = projected[..., width:]

    # Fused sigmoid-and-multiply, in place over the gate buffer, so the
    # gated result reuses memory the projection already owns.
    np.negative(gate, out=gate)
    np.exp(gate, out=gate)
    gate += 1.0
    np.divide(value, gate, out=value)
    value += primary

    # Layer norm with the two-pass variance: the one-pass E[x^2] - E[x]^2
    # form cancels catastrophically in float32 once the mean is large
    # relative to the spread, which is where residual streams end up.
    mean = value.mean(axis=-1, keepdims=True, dtype=np.float32)
    value -= mean
    variance = np.mean(value * value, axis=-1, keepdims=True, dtype=np.float32)
    value /= np.sqrt(variance + FLOAT(1e-6))
    value *= gain
    value += shift
    return value


def variable_selection(
    embeddings: NDArray[np.float32],
    selection_weights: tuple[NDArray[np.float32], ...],
    per_variable_w1: NDArray[np.float32],
    per_variable_b1: NDArray[np.float32],
    per_variable_gated: NDArray[np.float32],
    per_variable_gain: NDArray[np.float32],
    per_variable_shift: NDArray[np.float32],
    static_context: NDArray[np.float32] | None = None,
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """embeddings is (batch, time, num_variables, d).

    Returns the combined vector and the selection weights, which have to come
    back out - they are the interpretability story, and they are importance
    to this model rather than causal effect.
    """
    batch, steps, num_variables, width = embeddings.shape

    # Selection scores from the flattened per-variable embeddings.
    flattened = embeddings.reshape(batch, steps, num_variables * width)
    scores = gated_residual_network(
        flattened, *selection_weights, context=static_context,
    )[..., :num_variables]

    scores -= scores.max(axis=-1, keepdims=True)
    np.exp(scores, out=scores)
    scores /= scores.sum(axis=-1, keepdims=True)

    # Every per-variable GRN at once: a (V, d, d_hidden) weight stack
    # contracted against a (B, T, V, d) input. The loop version runs V small
    # GEMMs; this runs one batched contraction, and with V around a dozen
    # the loop overhead was the dominant cost.
    hidden = np.einsum('btvd,vdh->btvh', embeddings, per_variable_w1, optimize=True)
    hidden += per_variable_b1
    elu_(hidden)

    projected = np.einsum('btvh,vhg->btvg', hidden, per_variable_gated, optimize=True)
    half = projected.shape[-1] // 2
    value, gate = projected[..., :half], projected[..., half:]
    np.negative(gate, out=gate)
    np.exp(gate, out=gate)
    gate += 1.0
    np.divide(value, gate, out=value)
    value += embeddings

    mean = value.mean(axis=-1, keepdims=True, dtype=np.float32)
    value -= mean
    variance = np.mean(value * value, axis=-1, keepdims=True, dtype=np.float32)
    value /= np.sqrt(variance + FLOAT(1e-6))
    value *= per_variable_gain
    value += per_variable_shift

    # The weighted combination is a contraction over the variable axis, not
    # a loop with an accumulator.
    combined = np.einsum('btv,btvd->btd', scores, value, optimize=True)
    return combined, scores


def quantile_loss(
    predictions: NDArray[np.float32],
    targets: NDArray[np.float32],
    levels: NDArray[np.float32],
    observed: NDArray[np.bool_],
) -> np.float64:
    """predictions (batch, horizon, num_quantiles), targets (batch, horizon).

    The pinball max reduces to a single where on the sign of the error, so
    every level and every horizon is scored in one pass with no branching.
    """
    counted = observed.sum(dtype=np.int64)
    if counted == 0:
        raise ValueError('every target in the batch is masked out')

    error = targets[..., None] - predictions
    # max(q*e, (q-1)*e) is q*e when e >= 0 and (q-1)*e otherwise. Written as
    # a select rather than two products and a maximum, which halves the
    # arithmetic and materializes one fewer full-size temporary.
    loss = np.where(error >= 0.0, levels * error, (levels - 1.0) * error)
    loss = loss.sum(axis=-1)
    loss *= observed
    return loss.sum(dtype=np.float64) / counted


def repair_crossing(predictions: NDArray[np.float32]) -> NDArray[np.float32]:
    """Sort along the quantile axis. Levels are trained independently, so
    nothing prevents the 90th percentile falling below the 50th."""
    return np.sort(predictions, axis=-1)


def crossing_rate(predictions: NDArray[np.float32]) -> float:
    """Monitor rather than silently repair: frequent crossing means the tail
    quantiles have stopped being trustworthy, and sorting hides that."""
    ordered = np.diff(predictions, axis=-1) >= 0.0
    return float(1.0 - ordered.all(axis=-1).mean())
`,
        rationale:
          'Everything distinctive about TFT reduces to matrix products once the batch, time and variable axes are treated as array dimensions. A gated residual network becomes two GEMMs and pointwise arithmetic, with the value and gate branches sharing one weight of twice the output width so the gated unit costs one product rather than two over the same input — and the sigmoid-and-multiply then runs in place over that buffer so the gated result allocates nothing. The per-variable networks, which the loop version runs once per variable, become a single einsum against a stacked weight tensor: with a dozen variables the per-call overhead was dominating genuinely small matrices, so batching them is a larger win than the arithmetic suggests. Static context broadcasts over the time axis rather than being tiled, which is the concrete payoff of keeping static covariates separate in the first place. The quantile loss vectorizes exactly, and the pinball maximum is written as a select on the sign of the error rather than two products and a maximum, which halves the arithmetic and removes a full-size temporary. ELU uses expm1 because the naive exp-minus-one form loses every significant digit on small negative inputs.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Every GRN becomes a GEMM over the flattened batch-and-time axis, and the per-variable stack becomes one einsum instead of a dozen small products.',
            tradeoff: 'einsum over a four-axis operand picks a contraction order that is not always the best one, and on small variable counts the optimize pass can cost more than the contraction it plans.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The value and gate come from one projection, the sigmoid-and-multiply runs in place over it, and the layer-norm centring reuses the same buffer through to the output.',
            tradeoff: 'The pre-gate activations are destroyed, so diagnosing a GRN that has gated itself entirely off — the failure mode this architecture is most prone to — needs an unfused pass to inspect.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Series, timesteps, variables and quantile levels all become array axes, so a batch flows through selection and loss with a constant number of interpreter operations.',
            tradeoff: 'All variables are padded to a common embedding width and all series to a common window, so a panel with heterogeneous covariate sets wastes work on the padding.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The gate, the layer-norm centring and the loss reduction all write into buffers that already exist, so the hot path does not enter the allocator.',
            tradeoff: 'The functions mutate arrays they were handed, so a caller that reuses an input after the call gets a silently modified one — a real hazard when the same embedding tensor feeds both encoder and decoder selection.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Each GRN becomes one GEMM for the whole batch; the per-variable stack becomes one contraction rather than V small ones. Illustrative, not a measured benchmark: with the GRNs vectorized the profile shifts to the sequential LSTM, which is where a real TFT implementation spends most of its wall clock.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// The three distinctive pieces of TFT, transcribed literally.
//
//   1. Gated Residual Network - the component that can switch itself off
//   2. Variable Selection Network - a softmax over INPUTS, per timestep
//   3. Quantile (pinball) loss - what makes the output a distribution
//
// Attention and the LSTM are standard and covered elsewhere in this
// reference; what is specific to TFT is these three, so these three are what
// is written out. Vector-of-vector, plain loops.

#include <algorithm>
#include <cmath>
#include <cstddef>
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

// ELU rather than ReLU, deliberately: a GRN that has gated itself off should
// pass small negative values through smoothly rather than clipping them, so
// the residual path stays informative.
double Elu(double value) {
  return value > 0.0 ? value : std::exp(value) - 1.0;
}

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

Vector LayerNorm(const Vector& vector, const Vector& gain, const Vector& shift) {
  constexpr double kEpsilon = 1e-6;
  double mean = 0.0;
  for (std::size_t i = 0; i < vector.size(); ++i) {
    mean += vector[i];
  }
  mean /= static_cast<double>(vector.size());

  double variance = 0.0;
  for (std::size_t i = 0; i < vector.size(); ++i) {
    const double centred = vector[i] - mean;
    variance += centred * centred;
  }
  variance /= static_cast<double>(vector.size());

  const double denominator = std::sqrt(variance + kEpsilon);
  Vector output(vector.size(), 0.0);
  for (std::size_t i = 0; i < vector.size(); ++i) {
    output[i] = (vector[i] - mean) / denominator * gain[i] + shift[i];
  }
  return output;
}

struct GrnParams {
  Matrix w1;
  Vector b1;
  Matrix w_context;  // empty when this GRN takes no static conditioning
  Matrix w_value;
  Vector b_value;
  Matrix w_gate;
  Vector b_gate;
  Vector ln_gain;
  Vector ln_shift;
};

// GRN(a, c) = LayerNorm(a + GLU(ELU(W1 a + W2 c)))
//
// With the gate at zero the whole component collapses to LayerNorm(a), which
// is what lets the network choose to be smaller. On the dataset sizes
// forecasting actually has, that is frequently the right choice.
Vector GatedResidualNetwork(const Vector& primary, const GrnParams& params,
                            const Vector* context) {
  Vector hidden = MatVec(params.w1, primary, params.b1);

  if (context != nullptr && !params.w_context.empty()) {
    // No bias on the context projection: the primary branch already has one
    // and a second would be redundant.
    const Vector contribution = MatVec(params.w_context, *context, Vector{});
    for (std::size_t i = 0; i < hidden.size(); ++i) {
      hidden[i] += contribution[i];
    }
  }
  for (std::size_t i = 0; i < hidden.size(); ++i) {
    hidden[i] = Elu(hidden[i]);
  }

  const Vector values = MatVec(params.w_value, hidden, params.b_value);
  const Vector gates = MatVec(params.w_gate, hidden, params.b_gate);

  Vector residual(primary.size(), 0.0);
  for (std::size_t i = 0; i < primary.size(); ++i) {
    residual[i] = primary[i] + values[i] * Sigmoid(gates[i]);
  }
  return LayerNorm(residual, params.ln_gain, params.ln_shift);
}

Vector Softmax(const Vector& scores) {
  const double peak = *std::max_element(scores.begin(), scores.end());
  Vector output(scores.size(), 0.0);
  double total = 0.0;
  for (std::size_t i = 0; i < scores.size(); ++i) {
    output[i] = std::exp(scores[i] - peak);
    total += output[i];
  }
  for (std::size_t i = 0; i < output.size(); ++i) {
    output[i] /= total;
  }
  return output;
}

struct SelectionResult {
  Vector combined;
  Vector weights;  // the interpretability story; must come back out
};

// A softmax over VARIABLES, computed fresh at every timestep.
SelectionResult VariableSelection(const Matrix& embeddings,
                                  const GrnParams& selection,
                                  const std::vector<GrnParams>& per_variable,
                                  const Vector* static_context) {
  Vector flattened;
  for (std::size_t v = 0; v < embeddings.size(); ++v) {
    flattened.insert(flattened.end(), embeddings[v].begin(), embeddings[v].end());
  }

  // Selection is conditioned on the static context, so a large store and a
  // small store can weight promotions differently.
  const Vector scores = GatedResidualNetwork(flattened, selection, static_context);
  const Vector weights =
      Softmax(Vector(scores.begin(), scores.begin() + static_cast<long>(embeddings.size())));

  // Selection and transformation are separate jobs: each variable passes
  // through its own GRN before the weighted combination.
  const std::size_t width = embeddings[0].size();
  Vector combined(width, 0.0);
  for (std::size_t v = 0; v < embeddings.size(); ++v) {
    const Vector transformed =
        GatedResidualNetwork(embeddings[v], per_variable[v], nullptr);
    for (std::size_t d = 0; d < width; ++d) {
      combined[d] += weights[v] * transformed[d];
    }
  }

  return SelectionResult{combined, weights};
}

// Pinball loss, summed over quantile levels.
//
// For q = 0.9 under-predicting costs nine times what over-predicting costs,
// so the minimizer sits at the 90th percentile. That asymmetry is the entire
// mechanism - no distribution is ever assumed.
double QuantileLoss(const Vector& predictions, double target,
                    const Vector& quantiles) {
  double total = 0.0;
  for (std::size_t q = 0; q < quantiles.size(); ++q) {
    const double error = target - predictions[q];
    total += std::max(quantiles[q] * error, (quantiles[q] - 1.0) * error);
  }
  return total;
}

// Real panels are ragged. An unmasked loss trains on the padding.
double MaskedQuantileLoss(const std::vector<Matrix>& predictions,
                          const Matrix& targets,
                          const std::vector<std::vector<bool>>& observed,
                          const Vector& quantiles) {
  double total = 0.0;
  std::size_t counted = 0;
  for (std::size_t s = 0; s < predictions.size(); ++s) {
    for (std::size_t h = 0; h < predictions[s].size(); ++h) {
      if (!observed[s][h]) {
        continue;
      }
      total += QuantileLoss(predictions[s][h], targets[s][h], quantiles);
      ++counted;
    }
  }
  if (counted == 0) {
    throw std::invalid_argument("every target in the batch is masked out");
  }
  return total / static_cast<double>(counted);
}

// Quantile levels are trained INDEPENDENTLY, so nothing stops the 90th
// percentile coming out below the 50th. Sorting is the crude repair, and it
// is what most production systems actually do.
Vector RepairCrossing(Vector predictions) {
  std::sort(predictions.begin(), predictions.end());
  return predictions;
}
`,
        profile:
          'Each GRN is O(d^2) and variable selection runs one per input variable per timestep, so a block is O(V * L * d^2). Illustrative, not a measured benchmark: every MatVec allocates a fresh vector, so a single timestep with a dozen variables makes dozens of heap requests before any arithmetic happens.',
      },

      'make-it-right': {
        code: `// The same three components, with the input-type contract made a type.
//
// The substantive change is not arithmetic. TFT's central idea is the static
// / known-future / observed-past split, and its signature production failure
// is a covariate silently changing category between training and serving -
// which does not error, it reports excellent validation accuracy. So the
// classification becomes an enum, the schema becomes a validated object that
// derives what the encoder and decoder may each see, and the leakage
// guarantee is expressed once rather than at every call site.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <optional>
#include <span>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace tft {

// Its own type because the consequence is specific and severe: a model that
// has leaked does not fail, it reports excellent validation accuracy.
class LeakageError : public std::logic_error {
 public:
  explicit LeakageError(const std::string& what) : std::logic_error(what) {}
};

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// The classification the whole architecture is built on.
enum class InputKind { kStatic, kKnownFuture, kObservedPast };

struct InputSpec {
  std::string name;
  InputKind kind{InputKind::kObservedPast};
  std::optional<std::size_t> cardinality{};  // empty means continuous

  [[nodiscard]] bool is_categorical() const noexcept {
    return cardinality.has_value();
  }
};

// The contract between the feature pipeline and the model, validated once.
class InputSchema {
 public:
  explicit InputSchema(std::vector<InputSpec> specs) : specs_(std::move(specs)) {
    std::vector<std::string_view> names;
    names.reserve(specs_.size());
    for (const InputSpec& spec : specs_) {
      names.push_back(spec.name);
    }
    std::sort(names.begin(), names.end());
    if (std::adjacent_find(names.begin(), names.end()) != names.end()) {
      throw ShapeMismatch("duplicate covariate names in the schema");
    }
    if (ByKind(InputKind::kObservedPast).empty()) {
      throw ShapeMismatch("a forecaster needs at least one observed history");
    }
  }

  [[nodiscard]] std::vector<InputSpec> ByKind(InputKind kind) const {
    std::vector<InputSpec> selected;
    std::copy_if(specs_.begin(), specs_.end(), std::back_inserter(selected),
                 [kind](const InputSpec& spec) { return spec.kind == kind; });
    return selected;
  }

  // History sees everything: the past is fully observed.
  [[nodiscard]] std::vector<InputSpec> EncoderVariables() const {
    std::vector<InputSpec> selected;
    std::copy_if(specs_.begin(), specs_.end(), std::back_inserter(selected),
                 [](const InputSpec& spec) { return spec.kind != InputKind::kStatic; });
    return selected;
  }

  // The future sees ONLY known-future covariates. This one method is the
  // entire leakage guarantee, stated once instead of per call site.
  [[nodiscard]] std::vector<InputSpec> DecoderVariables() const {
    return ByKind(InputKind::kKnownFuture);
  }

  // Comparable across training and serving, so a silently reclassified
  // covariate is caught at load time rather than never.
  [[nodiscard]] std::vector<std::pair<std::string, InputKind>> Fingerprint() const {
    std::vector<std::pair<std::string, InputKind>> out;
    out.reserve(specs_.size());
    for (const InputSpec& spec : specs_) {
      out.emplace_back(spec.name, spec.kind);
    }
    std::sort(out.begin(), out.end());
    return out;
  }

 private:
  std::vector<InputSpec> specs_;
};

// Guard clause for the failure that has no other symptom.
inline void AssertSchemaMatches(const InputSchema& trained, const InputSchema& serving) {
  if (trained.Fingerprint() != serving.Fingerprint()) {
    throw LeakageError(
        "serving schema differs from the trained schema; a covariate has changed "
        "kind and the model is no longer valid");
  }
}

// Quantile levels, validated and kept sorted: the crossing repair depends on
// the ordering, and a level outside (0, 1) makes the loss silently unbounded.
class QuantileSet {
 public:
  explicit QuantileSet(std::vector<double> levels) : levels_(std::move(levels)) {
    if (levels_.empty()) {
      throw ShapeMismatch("at least one quantile level is required");
    }
    if (std::any_of(levels_.begin(), levels_.end(),
                    [](double level) { return level <= 0.0 || level >= 1.0; })) {
      throw ShapeMismatch("quantile levels must lie strictly inside (0, 1)");
    }
    if (!std::is_sorted(levels_.begin(), levels_.end())) {
      throw ShapeMismatch("quantile levels must be given in ascending order");
    }
  }

  [[nodiscard]] std::span<const double> levels() const noexcept { return levels_; }
  [[nodiscard]] std::size_t size() const noexcept { return levels_.size(); }

 private:
  std::vector<double> levels_;
};

[[nodiscard]] inline double Sigmoid(double value) noexcept {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

// ELU via expm1: the naive exp(x) - 1 loses every significant digit for
// small negative inputs, which is exactly the regime a gated-off GRN is in.
[[nodiscard]] inline double Elu(double value) noexcept {
  return value > 0.0 ? value : std::expm1(value);
}

// Row-major weights with an explicit stride: a row is a contiguous span, so
// the inner product is a linear walk rather than a pointer chase.
class DenseLayer {
 public:
  DenseLayer(std::size_t in_dim, std::size_t out_dim)
      : in_dim_(in_dim), out_dim_(out_dim), weight_(in_dim * out_dim, 0.0),
        bias_(out_dim, 0.0) {}

  void Apply(std::span<const double> input, std::span<double> out) const {
    if (input.size() != in_dim_) {
      throw ShapeMismatch("input width does not match the layer");
    }
    if (out.size() != out_dim_) {
      throw ShapeMismatch("output width does not match the layer");
    }
    std::copy(bias_.begin(), bias_.end(), out.begin());
    for (std::size_t j = 0; j < in_dim_; ++j) {
      const double value = input[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = weight_.data() + j * out_dim_;
      for (std::size_t i = 0; i < out_dim_; ++i) {
        out[i] += value * row[i];
      }
    }
  }

  [[nodiscard]] std::size_t in_dim() const noexcept { return in_dim_; }
  [[nodiscard]] std::size_t out_dim() const noexcept { return out_dim_; }
  [[nodiscard]] std::span<double> weight() noexcept { return weight_; }
  [[nodiscard]] std::span<double> bias() noexcept { return bias_; }

 private:
  std::size_t in_dim_;
  std::size_t out_dim_;
  std::vector<double> weight_;  // rule of zero: owning members only
  std::vector<double> bias_;
};

// Owns its scratch, so a repeated forward pass allocates nothing.
class GatedResidualNetwork {
 public:
  GatedResidualNetwork(std::size_t width, std::size_t hidden,
                       bool takes_context)
      : primary_(width, hidden),
        // Value and gate in ONE layer of 2 * width columns: the pair costs
        // one pass over the hidden state rather than two.
        gated_(hidden, 2 * width),
        context_(takes_context ? std::optional<DenseLayer>(std::in_place, width, hidden)
                               : std::nullopt),
        gain_(width, 1.0), shift_(width, 0.0),
        hidden_(hidden, 0.0), context_scratch_(hidden, 0.0), projected_(2 * width, 0.0) {}

  // With the gate at zero the whole component collapses to LayerNorm(a),
  // which is what lets the network choose to be smaller.
  void Apply(std::span<const double> primary, std::span<double> out,
             std::span<const double> context = {}) {
    if (!context.empty() && !context_.has_value()) {
      throw ShapeMismatch("context supplied but this GRN has no context projection");
    }

    primary_.Apply(primary, hidden_);
    if (!context.empty() && context_.has_value()) {
      context_->Apply(context, context_scratch_);
      for (std::size_t i = 0; i < hidden_.size(); ++i) {
        hidden_[i] += context_scratch_[i];
      }
    }
    for (double& value : hidden_) {
      value = Elu(value);
    }

    gated_.Apply(hidden_, projected_);
    const std::size_t width = primary.size();
    for (std::size_t i = 0; i < width; ++i) {
      out[i] = primary[i] + projected_[i] * Sigmoid(projected_[width + i]);
    }
    LayerNormInPlace(out);
  }

 private:
  void LayerNormInPlace(std::span<double> values) const {
    constexpr double kEpsilon = 1e-6;
    const double mean =
        std::accumulate(values.begin(), values.end(), 0.0) /
        static_cast<double>(values.size());

    // Two-pass variance deliberately: the one-pass E[x^2] - E[x]^2 form
    // cancels catastrophically once the mean is large relative to the spread.
    double variance = 0.0;
    for (const double value : values) {
      const double centred = value - mean;
      variance += centred * centred;
    }
    variance /= static_cast<double>(values.size());

    const double denominator = std::sqrt(variance + kEpsilon);
    for (std::size_t i = 0; i < values.size(); ++i) {
      values[i] = (values[i] - mean) / denominator * gain_[i] + shift_[i];
    }
  }

  DenseLayer primary_;
  DenseLayer gated_;
  std::optional<DenseLayer> context_;
  std::vector<double> gain_;
  std::vector<double> shift_;
  std::vector<double> hidden_;
  std::vector<double> context_scratch_;
  std::vector<double> projected_;
};

// Pinball loss, summed over levels.
[[nodiscard]] inline double QuantileLoss(std::span<const double> predictions,
                                         double target, const QuantileSet& quantiles) {
  if (predictions.size() != quantiles.size()) {
    throw ShapeMismatch("prediction count does not match the quantile levels");
  }
  double total = 0.0;
  const std::span<const double> levels = quantiles.levels();
  for (std::size_t q = 0; q < levels.size(); ++q) {
    const double error = target - predictions[q];
    total += std::max(levels[q] * error, (levels[q] - 1.0) * error);
  }
  return total;
}

// Monitor rather than silently repair: frequent crossing means the tail
// quantiles have stopped being trustworthy, and sorting hides that.
[[nodiscard]] inline double CrossingRate(
    const std::vector<std::vector<double>>& batch) {
  if (batch.empty()) {
    return 0.0;
  }
  const std::size_t crossed = static_cast<std::size_t>(
      std::count_if(batch.begin(), batch.end(), [](const std::vector<double>& row) {
        return !std::is_sorted(row.begin(), row.end());
      }));
  return static_cast<double>(crossed) / static_cast<double>(batch.size());
}

}  // namespace tft
`,
        rationale:
          'The arithmetic barely changes; the contract does. TFT’s central idea is the static / known-future / observed-past classification, and its signature production failure is a covariate silently changing category between training and serving — which does not raise an error, it reports excellent validation accuracy. So the classification becomes an enum, the schema becomes a validated class that derives which variables the encoder and decoder may each legitimately see, and the leakage guarantee lives in one method instead of being re-derived at every call site; a schema fingerprint makes the mismatch catchable at load time, with its own exception type because the consequence is specific. Storage flattens: weights become row-major buffers with an explicit stride so a row is a contiguous span, and the gated residual network owns its scratch so a repeated forward pass never allocates. Value and gate share one dense layer of twice the width, which halves the passes over the hidden state. The quantile set is validated and kept sorted, since the crossing repair depends on the ordering, and crossing gets a rate function rather than only a repair, because repairing quietly hides that the tail quantiles have stopped being trustworthy.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics with a much better constant: flat weights and owned scratch remove every per-call allocation, and the fused value-gate layer halves the passes over the hidden state. Illustrative, not a measured benchmark.',
      },

      'make-it-fast': {
        code: `// Batched over series, horizons and variables. Every GRN becomes a GEMM.
//
// Three changes:
//   1. A GRN is two matrix products and pointwise arithmetic. Batched across
//      (series x timestep) it is one GEMM, and value and gate share ONE
//      weight of 2 * d columns so the pair costs a single product.
//   2. The per-variable GRNs, which the loop version runs V times over tiny
//      matrices, become one batched GEMM over a variable-major weight stack.
//      At a dozen variables the per-call overhead dominated the arithmetic.
//   3. The pinball loss is a select on the sign of the error, not two
//      products and a maximum - half the arithmetic and one fewer temporary.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace tft {

// One arena for a whole batch. The activations are large and identically
// shaped every call, so allocating once and slicing is the difference
// between a forward pass that touches the allocator and one that does not.
class BatchedGrn {
 public:
  BatchedGrn(int max_rows, int width, int hidden)
      : width_(width), hidden_(hidden),
        hidden_buffer_(static_cast<std::size_t>(max_rows) * hidden),
        projected_(static_cast<std::size_t>(max_rows) * 2 * width) {}

  // input is (rows x width) row-major, where rows is series times timesteps.
  // w_gated is (hidden x 2 * width): value and gate side by side.
  void Apply(const float* __restrict input, int rows,
             const float* __restrict w1, const float* __restrict b1,
             const float* __restrict w_gated, const float* __restrict b_gated,
             const float* __restrict gain, const float* __restrict shift,
             const float* __restrict context, const float* __restrict w_context,
             int context_width, float* __restrict out) {
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, hidden_, width_,
                1.0F, input, width_, w1, hidden_, 0.0F, hidden_buffer_.data(), hidden_);

    if (context != nullptr && w_context != nullptr) {
      // Static context is ONE row broadcast over every timestep, so this is
      // a rank-one update rather than a tiled operand - the concrete payoff
      // of keeping static covariates separate in the first place.
      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, hidden_,
                  context_width, 1.0F, context, context_width, w_context, hidden_,
                  1.0F, hidden_buffer_.data(), hidden_);
    }

    // Fused bias and ELU in one pass. expm1 rather than exp minus one: the
    // naive form loses every significant digit on small negative inputs,
    // which is exactly the regime a gated-off GRN sits in.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = hidden_buffer_.data() + static_cast<std::size_t>(r) * hidden_;
      for (int h = 0; h < hidden_; ++h) {
        const float value = row[h] + b1[h];
        row[h] = value > 0.0F ? value : std::expm1(value);
      }
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, 2 * width_, hidden_,
                1.0F, hidden_buffer_.data(), hidden_, w_gated, 2 * width_, 0.0F,
                projected_.data(), 2 * width_);

    // Bias, gate, residual add and layer norm all fused into one pass over
    // the row: the gated result, the residual and the normalized output
    // never exist as separate buffers.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* projected =
          projected_.data() + static_cast<std::size_t>(r) * 2 * width_;
      const float* source = input + static_cast<std::size_t>(r) * width_;
      float* target = out + static_cast<std::size_t>(r) * width_;

      float mean = 0.0F;
      for (int d = 0; d < width_; ++d) {
        const float value = projected[d] + b_gated[d];
        const float gate = projected[width_ + d] + b_gated[width_ + d];
        target[d] = source[d] + value / (1.0F + std::exp(-gate));
        mean += target[d];
      }
      mean /= static_cast<float>(width_);

      // Two-pass variance on purpose: the one-pass form cancels
      // catastrophically in float32 once the mean is large relative to the
      // spread, which is where residual streams end up.
      float variance = 0.0F;
      for (int d = 0; d < width_; ++d) {
        const float centred = target[d] - mean;
        variance += centred * centred;
      }
      const float inverse = 1.0F / std::sqrt(variance / static_cast<float>(width_) + 1e-6F);
      for (int d = 0; d < width_; ++d) {
        target[d] = (target[d] - mean) * inverse * gain[d] + shift[d];
      }
    }
  }

 private:
  int width_;
  int hidden_;
  std::vector<float> hidden_buffer_;
  std::vector<float> projected_;
};

// Every per-variable GRN at once.
//
// The loop version runs V separate small GEMMs; a variable-major layout lets
// each variable's whole batch be one contiguous operand, so the same work is
// V large GEMMs with no per-call overhead - and at a dozen variables that
// overhead was the dominant cost, not the arithmetic.
inline void PerVariableProjection(const float* __restrict embeddings, int rows,
                                  int num_variables, int width, int hidden,
                                  const float* __restrict weight_stack,
                                  float* __restrict out) {
#pragma omp parallel for schedule(static)
  for (int v = 0; v < num_variables; ++v) {
    const float* input =
        embeddings + static_cast<std::size_t>(v) * rows * width;
    const float* weight =
        weight_stack + static_cast<std::size_t>(v) * width * hidden;
    float* target = out + static_cast<std::size_t>(v) * rows * hidden;
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, hidden, width,
                1.0F, input, width, weight, hidden, 0.0F, target, hidden);
  }
}

// Softmax over the VARIABLE axis, then the weighted combination as one pass.
inline void CombineVariables(const float* __restrict scores,
                             const float* __restrict transformed, int rows,
                             int num_variables, int width,
                             float* __restrict weights_out,
                             float* __restrict combined) {
#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    float* weights = weights_out + static_cast<std::size_t>(r) * num_variables;
    const float* row = scores + static_cast<std::size_t>(r) * num_variables;

    float peak = -std::numeric_limits<float>::infinity();
    for (int v = 0; v < num_variables; ++v) {
      peak = std::max(peak, row[v]);
    }
    float total = 0.0F;
    for (int v = 0; v < num_variables; ++v) {
      weights[v] = std::exp(row[v] - peak);
      total += weights[v];
    }

    float* target = combined + static_cast<std::size_t>(r) * width;
    std::fill(target, target + width, 0.0F);
    const float inverse = 1.0F / total;
    for (int v = 0; v < num_variables; ++v) {
      weights[v] *= inverse;
      const float weight = weights[v];
      const float* source =
          transformed + (static_cast<std::size_t>(v) * rows + r) * width;
      // Contiguous, restrict-qualified, known trip count: everything the
      // autovectorizer needs, with no intrinsic in sight.
      for (int d = 0; d < width; ++d) {
        target[d] += weight * source[d];
      }
    }
  }
}

// Pinball loss as one reduction.
//
// max(q*e, (q-1)*e) is q*e when e >= 0 and (q-1)*e otherwise, so it is a
// select on the sign rather than two products and a maximum.
[[nodiscard]] inline double MaskedQuantileLoss(std::span<const float> predictions,
                                               std::span<const float> targets,
                                               std::span<const float> observed,
                                               std::span<const float> levels) {
  const std::size_t num_levels = levels.size();
  double total = 0.0;
  double counted = 0.0;

#pragma omp parallel for reduction(+ : total, counted) schedule(static)
  for (std::size_t i = 0; i < targets.size(); ++i) {
    const float weight = observed[i];
    if (weight == 0.0F) {
      continue;
    }
    const float* row = predictions.data() + i * num_levels;
    float sum = 0.0F;
    for (std::size_t q = 0; q < num_levels; ++q) {
      const float error = targets[i] - row[q];
      sum += error >= 0.0F ? levels[q] * error : (levels[q] - 1.0F) * error;
    }
    total += static_cast<double>(weight) * static_cast<double>(sum);
    counted += static_cast<double>(weight);
  }
  return counted == 0.0 ? 0.0 : total / counted;
}

}  // namespace tft
`,
        rationale:
          'Everything distinctive about TFT reduces to matrix products once series and timesteps are folded into one row axis. A gated residual network becomes two GEMMs plus pointwise arithmetic, with value and gate sharing one weight of twice the output width so the gated unit costs a single product; the bias, gate, residual add and layer normalization then fuse into one pass over each row, so the gated result, the residual and the normalized output never exist as separate buffers. Static context enters through a GEMM with beta equal to one — a broadcast over timesteps rather than a tiled operand, which is the concrete payoff of keeping static covariates separate at all. The per-variable networks go variable-major so each variable’s whole batch is one contiguous operand and the dozen tiny GEMMs become a dozen large ones, which matters because at that size the per-call overhead was dominating the arithmetic. The pinball maximum becomes a select on the sign of the error rather than two products and a maximum. ELU uses expm1 because the naive form loses every significant digit precisely where a gated-off GRN sits, and layer norm keeps the two-pass variance for the same class of reason.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Both GRN projections and every per-variable projection are dense products, and the static-context term accumulates with beta equal to one so the broadcast needs no separate pass.',
            tradeoff: 'The variable-major layout the per-variable stack needs is a transpose of the natural (row, variable, channel) order, so it costs a full reshuffle of the embedding tensor before and after.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias, gating, the residual add and both layer-norm passes happen in a single traversal of each row, so the intermediate gated and residual vectors are never written to memory.',
            tradeoff: 'The pre-gate activations are gone by the time the call returns, which makes diagnosing a GRN that has gated itself entirely off — the failure this architecture is most prone to — require an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The ELU pass, the fused gating-and-norm pass, the per-variable GEMMs and the loss reduction are all row- or variable-independent with no shared writes.',
            tradeoff: 'The per-variable loop parallelizes over a dozen variables at most, and nesting it around a threaded BLAS oversubscribes the machine rather than using it — one of the two has to be told to run single-threaded.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The weighted combination, the gating pass and the loss inner loop are contiguous, restrict-qualified and of known trip count, which is all the vectorizer requires.',
            tradeoff: 'It depends on the width being visible at compile time, so a runtime-variable hidden size silently drops these loops to scalar with no diagnostic anywhere.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Each GRN becomes two GEMMs for the whole batch; the per-variable stack becomes V large products instead of V * rows tiny ones. Illustrative, not a measured benchmark: with the GRNs vectorized the profile shifts to the sequential LSTM, which is where a real TFT implementation spends most of its wall clock.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// The three distinctive pieces of TFT, transcribed literally.
//
//   1. Gated Residual Network - the component that can switch itself off
//   2. Variable Selection Network - a softmax over INPUTS, per timestep
//   3. Quantile (pinball) loss - what makes the output a distribution
//
// Attention and the LSTM are standard and covered elsewhere in this
// reference; what is specific to TFT is these three, so these three are what
// is written out. Vec-of-Vec, index loops, panics on bad shapes.

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// ELU rather than ReLU, deliberately: a GRN that has gated itself off should
/// pass small negative values through smoothly rather than clipping them, so
/// the residual path stays informative.
fn elu(value: f64) -> f64 {
    if value > 0.0 {
        value
    } else {
        value.exp() - 1.0
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

fn layer_norm(vector: &[f64], gain: &[f64], shift: &[f64]) -> Vec<f64> {
    const EPSILON: f64 = 1e-6;
    let width = vector.len() as f64;

    let mut mean = 0.0;
    for &value in vector {
        mean += value;
    }
    mean /= width;

    let mut variance = 0.0;
    for &value in vector {
        variance += (value - mean) * (value - mean);
    }
    variance /= width;

    let denominator = (variance + EPSILON).sqrt();
    let mut output = vec![0.0_f64; vector.len()];
    for i in 0..vector.len() {
        output[i] = (vector[i] - mean) / denominator * gain[i] + shift[i];
    }
    output
}

struct GrnParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w_context: Vec<Vec<f64>>, // empty when this GRN takes no static conditioning
    w_value: Vec<Vec<f64>>,
    b_value: Vec<f64>,
    w_gate: Vec<Vec<f64>>,
    b_gate: Vec<f64>,
    ln_gain: Vec<f64>,
    ln_shift: Vec<f64>,
}

/// GRN(a, c) = LayerNorm(a + GLU(ELU(W1 a + W2 c)))
///
/// With the gate at zero the whole component collapses to LayerNorm(a), which
/// is what lets the network choose to be smaller. On the dataset sizes
/// forecasting actually has, that is frequently the right choice.
fn gated_residual_network(
    primary: &[f64],
    params: &GrnParams,
    context: Option<&[f64]>,
) -> Vec<f64> {
    let mut hidden = matvec(&params.w1, primary, &params.b1);

    if let Some(context_vector) = context {
        if !params.w_context.is_empty() {
            // No bias on the context projection: the primary branch already
            // has one and a second would be redundant.
            let contribution = matvec(&params.w_context, context_vector, &[]);
            for i in 0..hidden.len() {
                hidden[i] += contribution[i];
            }
        }
    }
    for value in hidden.iter_mut() {
        *value = elu(*value);
    }

    let values = matvec(&params.w_value, &hidden, &params.b_value);
    let gates = matvec(&params.w_gate, &hidden, &params.b_gate);

    let mut residual = vec![0.0_f64; primary.len()];
    for i in 0..primary.len() {
        residual[i] = primary[i] + values[i] * sigmoid(gates[i]);
    }
    layer_norm(&residual, &params.ln_gain, &params.ln_shift)
}

fn softmax(scores: &[f64]) -> Vec<f64> {
    let mut peak = f64::NEG_INFINITY;
    for &score in scores {
        if score > peak {
            peak = score;
        }
    }
    let mut output: Vec<f64> = scores.iter().map(|&s| (s - peak).exp()).collect();
    let total: f64 = output.iter().sum();
    for value in output.iter_mut() {
        *value /= total;
    }
    output
}

struct SelectionResult {
    combined: Vec<f64>,
    /// The interpretability story; it must come back out rather than being
    /// discarded inside the layer.
    weights: Vec<f64>,
}

/// A softmax over VARIABLES, computed fresh at every timestep.
fn variable_selection(
    embeddings: &[Vec<f64>],
    selection: &GrnParams,
    per_variable: &[GrnParams],
    static_context: Option<&[f64]>,
) -> SelectionResult {
    let mut flattened = Vec::new();
    for embedding in embeddings {
        flattened.extend_from_slice(embedding);
    }

    // Selection is conditioned on the static context, so a large store and a
    // small store can weight promotions differently.
    let scores = gated_residual_network(&flattened, selection, static_context);
    let weights = softmax(&scores[..embeddings.len()]);

    // Selection and transformation are separate jobs: each variable passes
    // through its own GRN before the weighted combination.
    let width = embeddings[0].len();
    let mut combined = vec![0.0_f64; width];
    for v in 0..embeddings.len() {
        let transformed = gated_residual_network(&embeddings[v], &per_variable[v], None);
        for d in 0..width {
            combined[d] += weights[v] * transformed[d];
        }
    }

    SelectionResult { combined, weights }
}

/// Pinball loss, summed over quantile levels.
///
/// For q = 0.9 under-predicting costs nine times what over-predicting costs,
/// so the minimizer sits at the 90th percentile. That asymmetry is the entire
/// mechanism - no distribution is ever assumed.
fn quantile_loss(predictions: &[f64], target: f64, quantiles: &[f64]) -> f64 {
    let mut total = 0.0;
    for q in 0..quantiles.len() {
        let error = target - predictions[q];
        total += (quantiles[q] * error).max((quantiles[q] - 1.0) * error);
    }
    total
}

/// Real panels are ragged. An unmasked loss trains on the padding.
fn masked_quantile_loss(
    predictions: &[Vec<Vec<f64>>],
    targets: &[Vec<f64>],
    observed: &[Vec<bool>],
    quantiles: &[f64],
) -> f64 {
    let mut total = 0.0;
    let mut counted = 0_usize;
    for s in 0..predictions.len() {
        for h in 0..predictions[s].len() {
            if !observed[s][h] {
                continue;
            }
            total += quantile_loss(&predictions[s][h], targets[s][h], quantiles);
            counted += 1;
        }
    }
    if counted == 0 {
        return 0.0;
    }
    total / counted as f64
}

/// Quantile levels are trained INDEPENDENTLY, so nothing stops the 90th
/// percentile coming out below the 50th. Sorting is the crude repair and it
/// is what most production systems actually do.
fn repair_crossing(mut predictions: Vec<f64>) -> Vec<f64> {
    predictions.sort_by(|a, b| a.total_cmp(b));
    predictions
}
`,
        profile:
          'Each GRN is O(d^2) and variable selection runs one per input variable per timestep, so a block is O(V * L * d^2). Illustrative, not a measured benchmark: every matvec allocates a fresh Vec, so one timestep with a dozen variables makes dozens of heap requests before any arithmetic happens.',
      },

      'make-it-right': {
        code: `//! The same three components, with the input-type contract made a type.
//!
//! The substantive change is not arithmetic. TFT's central idea is the static
//! / known-future / observed-past split, and its signature production failure
//! is a covariate silently changing category between training and serving -
//! which does not error, it reports excellent validation accuracy. So the
//! classification becomes an enum, the schema becomes a validated type that
//! derives what the encoder and decoder may each see, and the leakage
//! guarantee is expressed once rather than at every call site.

use std::collections::BTreeSet;
use std::fmt;

/// Width of the hidden state. Distinct from VariableCount so they cannot swap.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Width(pub usize);

/// Number of input variables entering a selection network.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct VariableCount(pub usize);

/// Forecast horizon in steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Horizon(pub usize);

/// The classification the whole architecture is built on.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum InputKind {
    /// Never changes for a series: store size, product category.
    Static,
    /// Known now for the whole horizon: calendar, planned promotions.
    KnownFuture,
    /// Measured, and only available up to the present.
    ObservedPast,
}

#[derive(Debug, PartialEq)]
pub enum TftError {
    /// A covariate is used beyond the point it is available.
    ///
    /// Its own variant because the consequence is specific and severe: a
    /// model that has leaked does not fail, it reports excellent validation
    /// accuracy and then disappoints in production.
    Leakage { covariate: String, kind: InputKind },
    /// The serving schema does not match the schema the model was trained on.
    SchemaDrift,
    /// Two covariates share a name.
    DuplicateCovariate(String),
    /// No observed history: there is nothing to forecast from.
    NoObservedHistory,
    /// A quantile level outside the open unit interval.
    InvalidQuantile(f64),
    /// Quantile levels supplied out of order, which breaks the repair.
    UnsortedQuantiles,
    /// A buffer length does not match the shape it is meant to carry.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for TftError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Leakage { covariate, kind } => {
                write!(f, "covariate {covariate} is {kind:?} and cannot be read in the future")
            }
            Self::SchemaDrift => write!(
                f,
                "serving schema differs from the trained schema; a covariate changed kind"
            ),
            Self::DuplicateCovariate(name) => write!(f, "duplicate covariate {name}"),
            Self::NoObservedHistory => write!(f, "a forecaster needs an observed history"),
            Self::InvalidQuantile(level) => {
                write!(f, "quantile level {level} must lie strictly inside (0, 1)")
            }
            Self::UnsortedQuantiles => write!(f, "quantile levels must be ascending"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for TftError {}

#[derive(Debug, Clone)]
pub struct InputSpec {
    pub name: String,
    pub kind: InputKind,
    /// None means continuous.
    pub cardinality: Option<usize>,
}

/// The contract between the feature pipeline and the model.
pub struct InputSchema {
    specs: Vec<InputSpec>,
}

impl InputSchema {
    /// Validation at the boundary: a schema that exists is one whose
    /// invariants hold, so nothing downstream re-checks them.
    pub fn new(specs: Vec<InputSpec>) -> Result<Self, TftError> {
        let mut seen = BTreeSet::new();
        for spec in &specs {
            if !seen.insert(spec.name.clone()) {
                return Err(TftError::DuplicateCovariate(spec.name.clone()));
            }
        }
        if !specs.iter().any(|spec| spec.kind == InputKind::ObservedPast) {
            return Err(TftError::NoObservedHistory);
        }
        Ok(Self { specs })
    }

    /// History sees everything: the past is fully observed.
    pub fn encoder_variables(&self) -> Vec<&InputSpec> {
        self.specs
            .iter()
            .filter(|spec| spec.kind != InputKind::Static)
            .collect()
    }

    /// The future sees ONLY known-future covariates. This one method is the
    /// entire leakage guarantee, stated once instead of per call site.
    pub fn decoder_variables(&self) -> Vec<&InputSpec> {
        self.specs
            .iter()
            .filter(|spec| spec.kind == InputKind::KnownFuture)
            .collect()
    }

    /// Comparable across training and serving, so a silently reclassified
    /// covariate is caught at load time rather than never.
    pub fn fingerprint(&self) -> BTreeSet<(String, InputKind)> {
        self.specs
            .iter()
            .map(|spec| (spec.name.clone(), spec.kind))
            .collect()
    }

    /// Guard clause for the failure that has no other symptom.
    pub fn assert_matches(&self, serving: &InputSchema) -> Result<(), TftError> {
        if self.fingerprint() == serving.fingerprint() {
            Ok(())
        } else {
            Err(TftError::SchemaDrift)
        }
    }
}

/// Quantile levels, validated and kept sorted: the crossing repair depends on
/// the ordering, and a level outside (0, 1) makes the loss silently unbounded.
pub struct QuantileSet {
    levels: Vec<f64>,
}

impl QuantileSet {
    pub fn new(levels: Vec<f64>) -> Result<Self, TftError> {
        if let Some(&bad) = levels.iter().find(|&&level| level <= 0.0 || level >= 1.0) {
            return Err(TftError::InvalidQuantile(bad));
        }
        if levels.windows(2).any(|pair| pair[0] > pair[1]) {
            return Err(TftError::UnsortedQuantiles);
        }
        Ok(Self { levels })
    }

    pub fn levels(&self) -> &[f64] {
        &self.levels
    }

    /// Pinball loss summed over levels.
    pub fn loss(&self, predictions: &[f64], target: f64) -> Result<f64, TftError> {
        if predictions.len() != self.levels.len() {
            return Err(TftError::ShapeMismatch {
                expected: self.levels.len(),
                found: predictions.len(),
            });
        }
        Ok(predictions
            .iter()
            .zip(&self.levels)
            .map(|(prediction, &level)| {
                let error = target - prediction;
                (level * error).max((level - 1.0) * error)
            })
            .sum())
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

/// ELU via exp_m1: the naive exp(x) - 1 loses every significant digit for
/// small negative inputs, which is exactly the regime a gated-off GRN is in.
fn elu(value: f64) -> f64 {
    if value > 0.0 {
        value
    } else {
        value.exp_m1()
    }
}

/// Row-major weights with an explicit stride, so a row is a contiguous slice
/// and the inner product is a linear walk rather than a pointer chase.
pub struct DenseLayer {
    weight: Vec<f64>,
    bias: Vec<f64>,
    in_dim: Width,
    out_dim: Width,
}

impl DenseLayer {
    pub fn zeros(in_dim: Width, out_dim: Width) -> Self {
        Self {
            weight: vec![0.0; in_dim.0 * out_dim.0],
            bias: vec![0.0; out_dim.0],
            in_dim,
            out_dim,
        }
    }

    pub fn apply(&self, input: &[f64], out: &mut [f64]) -> Result<(), TftError> {
        if input.len() != self.in_dim.0 {
            return Err(TftError::ShapeMismatch { expected: self.in_dim.0, found: input.len() });
        }
        out.copy_from_slice(&self.bias);
        for (j, &value) in input.iter().enumerate() {
            if value == 0.0 {
                continue;
            }
            let row = &self.weight[j * self.out_dim.0..(j + 1) * self.out_dim.0];
            for (accumulator, &w) in out.iter_mut().zip(row) {
                *accumulator += value * w;
            }
        }
        Ok(())
    }
}

/// Owns its scratch, so a repeated forward pass allocates nothing.
pub struct GatedResidualNetwork {
    primary: DenseLayer,
    /// Value and gate in ONE layer of 2 * width columns: the pair costs one
    /// pass over the hidden state rather than two.
    gated: DenseLayer,
    context: Option<DenseLayer>,
    gain: Vec<f64>,
    shift: Vec<f64>,
    hidden: Vec<f64>,
    context_scratch: Vec<f64>,
    projected: Vec<f64>,
    width: Width,
}

impl GatedResidualNetwork {
    pub fn new(width: Width, hidden: Width, context: Option<Width>) -> Self {
        Self {
            primary: DenseLayer::zeros(width, hidden),
            gated: DenseLayer::zeros(hidden, Width(2 * width.0)),
            context: context.map(|c| DenseLayer::zeros(c, hidden)),
            gain: vec![1.0; width.0],
            shift: vec![0.0; width.0],
            hidden: vec![0.0; hidden.0],
            context_scratch: vec![0.0; hidden.0],
            projected: vec![0.0; 2 * width.0],
            width,
        }
    }

    /// With the gate at zero the whole component collapses to LayerNorm(a),
    /// which is what lets the network choose to be smaller.
    pub fn apply(
        &mut self,
        primary: &[f64],
        context: Option<&[f64]>,
        out: &mut [f64],
    ) -> Result<(), TftError> {
        self.primary.apply(primary, &mut self.hidden)?;

        if let (Some(vector), Some(layer)) = (context, self.context.as_ref()) {
            layer.apply(vector, &mut self.context_scratch)?;
            for (value, &delta) in self.hidden.iter_mut().zip(&self.context_scratch) {
                *value += delta;
            }
        }
        for value in self.hidden.iter_mut() {
            *value = elu(*value);
        }

        self.gated.apply(&self.hidden, &mut self.projected)?;
        let width = self.width.0;
        let (values, gates) = self.projected.split_at(width);
        for ((target, &a), (&value, &gate)) in
            out.iter_mut().zip(primary).zip(values.iter().zip(gates))
        {
            *target = a + value * sigmoid(gate);
        }

        self.layer_norm(out);
        Ok(())
    }

    fn layer_norm(&self, values: &mut [f64]) {
        const EPSILON: f64 = 1e-6;
        let width = values.len() as f64;
        let mean = values.iter().sum::<f64>() / width;

        // Two-pass variance deliberately: the one-pass E[x^2] - E[x]^2 form
        // cancels catastrophically once the mean is large relative to the
        // spread, which is where deep residual streams end up.
        let variance = values.iter().map(|v| (v - mean) * (v - mean)).sum::<f64>() / width;
        let inverse = 1.0 / (variance + EPSILON).sqrt();

        for ((value, &g), &s) in values.iter_mut().zip(&self.gain).zip(&self.shift) {
            *value = (*value - mean) * inverse * g + s;
        }
    }
}

/// Monitor rather than silently repair: frequent crossing means the tail
/// quantiles have stopped being trustworthy, and sorting hides that.
pub fn crossing_rate(batch: &[Vec<f64>]) -> f64 {
    if batch.is_empty() {
        return 0.0;
    }
    let crossed = batch
        .iter()
        .filter(|row| row.windows(2).any(|pair| pair[0] > pair[1]))
        .count();
    crossed as f64 / batch.len() as f64
}
`,
        rationale:
          'The arithmetic barely changes; the contract does. TFT’s central idea is the static / known-future / observed-past classification, and its signature production failure is a covariate silently changing category between training and serving — which does not error, it reports excellent validation accuracy. So the classification becomes an enum, the schema becomes a validated type that derives which variables the encoder and decoder may each legitimately see, and the leakage guarantee lives in one method rather than being re-derived at every call site; a fingerprint comparison makes the drift catchable at load time, with its own error variant because the consequence is specific. Storage flattens: weights become row-major buffers with an explicit stride so a row is a contiguous slice, and the gated residual network owns its scratch so a repeated forward pass never allocates. Value and gate share one layer of twice the width, halving the passes over the hidden state, and split_at hands out the two halves without a copy. The quantile set validates its levels and keeps them sorted since the repair depends on the ordering, and crossing gets a rate function rather than only a repair, because repairing quietly hides that the tail quantiles have stopped being trustworthy.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics with a much better constant: flat weights and owned scratch remove every per-call allocation, and the fused value-gate layer halves the passes over the hidden state. Illustrative, not a measured benchmark.',
      },

      'make-it-fast': {
        code: `//! Batched over series, horizons and variables. Every GRN becomes a GEMM.
//!
//! Three changes:
//!   1. A GRN is two matrix products and pointwise arithmetic. Batched across
//!      (series x timestep) it is one product, and value and gate share ONE
//!      weight of 2 * d columns so the pair costs a single GEMM.
//!   2. The per-variable GRNs, which the loop version runs V times over tiny
//!      matrices, become V large products over a variable-major layout, in
//!      parallel. At a dozen variables the per-call overhead dominated.
//!   3. The pinball loss is a select on the sign of the error, not two
//!      products and a maximum - half the arithmetic, one fewer temporary.

use ndarray::{s, Array2, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Scratch sized once at construction and sliced per call, so the forward
/// pass never touches the allocator.
pub struct BatchedGrn {
    width: usize,
    hidden: usize,
    hidden_buffer: Array2<f32>,
    projected: Array2<f32>,
}

impl BatchedGrn {
    pub fn new(max_rows: usize, width: usize, hidden: usize) -> Self {
        Self {
            width,
            hidden,
            hidden_buffer: Array2::zeros((max_rows, hidden)),
            projected: Array2::zeros((max_rows, 2 * width)),
        }
    }

    /// \`input\` is (rows, width) where rows is series times timesteps.
    /// \`w_gated\` is (hidden, 2 * width): value and gate side by side.
    pub fn apply(
        &mut self,
        input: ArrayView2<'_, f32>,
        w1: ArrayView2<'_, f32>,
        b1: ArrayView1<'_, f32>,
        w_gated: ArrayView2<'_, f32>,
        b_gated: ArrayView1<'_, f32>,
        gain: ArrayView1<'_, f32>,
        shift: ArrayView1<'_, f32>,
        context: Option<(ArrayView2<'_, f32>, ArrayView2<'_, f32>)>,
    ) -> Array2<f32> {
        let rows = input.shape()[0];
        let mut hidden = self.hidden_buffer.slice_mut(s![..rows, ..]);
        hidden.assign(&input.dot(&w1));

        if let Some((context_values, w_context)) = context {
            // Static context is ONE row broadcast over every timestep rather
            // than a tiled operand - the concrete payoff of keeping static
            // covariates separate in the first place.
            hidden += &context_values.dot(&w_context);
        }

        // Fused bias and ELU in one parallel pass. exp_m1 rather than
        // exp minus one: the naive form loses every significant digit on
        // small negative inputs, which is where a gated-off GRN sits.
        Zip::from(&mut hidden)
            .and_broadcast(&b1)
            .par_for_each(|value, &bias| {
                let shifted = *value + bias;
                *value = if shifted > 0.0 { shifted } else { shifted.exp_m1() };
            });

        let mut projected = self.projected.slice_mut(s![..rows, ..]);
        projected.assign(&hidden.dot(&w_gated));

        let width = self.width;
        let mut out = Array2::<f32>::zeros((rows, width));

        // Bias, gate, residual add and layer norm fused into one pass per
        // row: the gated result, the residual and the normalized output
        // never exist as separate buffers.
        out.axis_iter_mut(Axis(0))
            .into_par_iter()
            .enumerate()
            .for_each(|(row, mut target)| {
                let source = input.row(row);
                let projected_row = projected.row(row);

                let mut mean = 0.0f32;
                for d in 0..width {
                    let value = projected_row[d] + b_gated[d];
                    let gate = projected_row[width + d] + b_gated[width + d];
                    target[d] = source[d] + value / (1.0 + (-gate).exp());
                    mean += target[d];
                }
                mean /= width as f32;

                // Two-pass variance on purpose: the one-pass form cancels
                // catastrophically in f32 once the mean is large relative to
                // the spread, which is where residual streams end up.
                let mut variance = 0.0f32;
                for d in 0..width {
                    let centred = target[d] - mean;
                    variance += centred * centred;
                }
                let inverse = 1.0 / (variance / width as f32 + 1e-6).sqrt();
                for d in 0..width {
                    target[d] = (target[d] - mean) * inverse * gain[d] + shift[d];
                }
            });

        let _ = self.hidden;
        out
    }
}

/// Every per-variable projection at once.
///
/// The loop version runs V separate tiny products; a variable-major layout
/// makes each variable's whole batch one contiguous operand, so the same
/// work becomes V large products with no per-call overhead - and at a dozen
/// variables that overhead was the dominant cost, not the arithmetic.
pub fn per_variable_projection(
    embeddings: &[ArrayView2<'_, f32>],
    weights: &[ArrayView2<'_, f32>],
) -> Vec<Array2<f32>> {
    embeddings
        .par_iter()
        .zip(weights.par_iter())
        .map(|(input, weight)| input.dot(weight))
        .collect()
}

/// Softmax over the VARIABLE axis, then the weighted combination in one pass.
pub fn combine_variables(
    scores: ArrayView2<'_, f32>,
    transformed: &[Array2<f32>],
    width: usize,
) -> (Array2<f32>, Array2<f32>) {
    let rows = scores.shape()[0];
    let num_variables = scores.shape()[1];

    let mut weights = Array2::<f32>::zeros((rows, num_variables));
    let mut combined = Array2::<f32>::zeros((rows, width));

    Zip::from(weights.axis_iter_mut(Axis(0)))
        .and(combined.axis_iter_mut(Axis(0)))
        .and(scores.axis_iter(Axis(0)))
        .par_for_each(|mut weight_row, mut target, score_row| {
            let peak = score_row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let mut total = 0.0f32;
            for (slot, &score) in weight_row.iter_mut().zip(score_row.iter()) {
                *slot = (score - peak).exp();
                total += *slot;
            }
            let inverse = 1.0 / total;
            for slot in weight_row.iter_mut() {
                *slot *= inverse;
            }
            let _ = &mut target;
        });

    for (variable, matrix) in transformed.iter().enumerate() {
        let column = weights.column(variable).to_owned();
        Zip::from(combined.axis_iter_mut(Axis(0)))
            .and(matrix.axis_iter(Axis(0)))
            .and(&column)
            .par_for_each(|mut target, source, &weight| {
                // Zipped contiguous slices: no per-element bounds check
                // survives into the generated code.
                for (value, &delta) in target.iter_mut().zip(source.iter()) {
                    *value += weight * delta;
                }
            });
    }

    (combined, weights)
}

/// Pinball loss as one parallel reduction.
///
/// max(q*e, (q-1)*e) is q*e when e >= 0 and (q-1)*e otherwise, so it is a
/// select on the sign rather than two products and a maximum.
pub fn masked_quantile_loss(
    predictions: &[f32],
    targets: &[f32],
    observed: &[f32],
    levels: &[f32],
) -> f64 {
    let num_levels = levels.len();
    let (total, counted) = targets
        .par_iter()
        .zip(observed.par_iter())
        .enumerate()
        .map(|(index, (&target, &weight))| {
            if weight == 0.0 {
                return (0.0f64, 0.0f64);
            }
            let row = &predictions[index * num_levels..(index + 1) * num_levels];
            let sum: f32 = row
                .iter()
                .zip(levels)
                .map(|(&prediction, &level)| {
                    let error = target - prediction;
                    if error >= 0.0 { level * error } else { (level - 1.0) * error }
                })
                .sum();
            (f64::from(weight) * f64::from(sum), f64::from(weight))
        })
        .reduce(|| (0.0, 0.0), |a, b| (a.0 + b.0, a.1 + b.1));

    if counted == 0.0 {
        0.0
    } else {
        total / counted
    }
}
`,
        rationale:
          'Everything distinctive about TFT reduces to matrix products once series and timesteps are folded into one row axis. A gated residual network becomes two products plus pointwise arithmetic, with value and gate sharing one weight of twice the output width so the gated unit costs a single GEMM; the bias, gate, residual add and both layer-norm passes then fuse into one traversal of each row, so the gated result, the residual and the normalized output never exist as separate arrays. Static context enters as a broadcast over timesteps rather than a tiled operand, which is the concrete payoff of keeping static covariates separate at all. The per-variable networks become a rayon map over variable-major views, so a dozen tiny products become a dozen large ones running concurrently — which matters because at that size the per-call overhead was dominating the arithmetic rather than the other way round. The pinball maximum becomes a select on the sign of the error, halving the arithmetic and removing a full-size temporary. ELU uses exp_m1 because the naive form loses every significant digit precisely where a gated-off GRN sits, and layer norm keeps the two-pass variance for the same class of reason.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Both GRN projections and every per-variable projection are dense products that dispatch straight to sgemm on contiguous f32 operands.',
            tradeoff: 'Binds the build to a system BLAS, and the variable-major layout the per-variable stack needs is a transpose of the natural row-variable-channel order, so it costs a full reshuffle before and after.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The fused ELU pass, the fused gating-and-norm pass, the per-variable products and the loss reduction are all row- or variable-independent with no shared writes.',
            tradeoff: 'The per-variable map parallelizes over a dozen items at most, and nesting it around a threaded BLAS oversubscribes the machine rather than using it — one of the two has to be single-threaded.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The weighted combination and the loss inner loop become zips over contiguous slices, so the per-element bounds checks the indexed version pays disappear.',
            tradeoff: 'The nested Zip in the combination is markedly harder to read than the indexed loop it replaces, and it hides that the score, weight and embedding widths must agree — a mismatch truncates to the shortest rather than failing.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Scratch is allocated once at the worst-case size and sliced per call, so every product sees a standard-layout operand and no intermediate is reallocated between batches.',
            tradeoff: 'The scratch is sized for the largest batch the model will ever see and held for the object’s lifetime, so a long-lived instance that mostly processes small batches keeps that footprint permanently.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Each GRN becomes two products for the whole batch; the per-variable stack becomes V large products instead of V times rows tiny ones. Illustrative, not a measured benchmark: with the GRNs vectorized the profile shifts to the sequential LSTM, which is where a real TFT implementation spends most of its wall clock.',
      },
    },
  },
};
