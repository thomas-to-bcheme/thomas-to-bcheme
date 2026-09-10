import type { AiMlModel } from '../../types';

/**
 * Temporal Convolutional Network — sequence modelling without a recurrence.
 *
 * Sits after the gated recurrent entries as the alternative answer to the same
 * problem: reach far back in a sequence without a gradient that dies. Instead
 * of carrying a state, it stacks dilated causal convolutions so the receptive
 * field grows exponentially with depth — which makes the whole sequence
 * computable in parallel, and makes the memory horizon a fixed number chosen
 * at design time rather than something learned.
 */
export const TCN: AiMlModel = {
  slug: 'tcn',
  name: 'Temporal Convolutional Network',
  aliases: ['TCN', 'Dilated causal convolution', 'WaveNet-style', 'Causal CNN'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'model',

  paradigms: ['supervised', 'self-supervised'],
  // 'anomaly-detection' via one-step prediction error over a sequence — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['sequence-modeling', 'regression', 'classification', 'anomaly-detection'],
  architecture: 'convolutional',
  paradigmNote:
    'The same two framings as any sequence model — supervised against external targets, self-supervised against the sequence’s own next element. What differs from the recurrent entries is not the training but the computation: every position is computed independently, so the whole sequence is processed at once.',

  intuition:
    'A convolution over time looks at a fixed window, which is too short to be useful and too expensive to widen by brute force. Two modifications fix that. Causal: pad only on the left, so a position never sees the future — without which the model cheats and the validation numbers are fiction. Dilated: skip a growing number of positions between taps at each layer, so a stack of layers with dilations 1, 2, 4, 8 reaches back sixteen steps with four layers rather than sixteen. The receptive field doubles per layer, so it grows exponentially in depth while the parameter count grows linearly. And because nothing is carried forward, every output position is computed from its own window independently — the entire sequence in one parallel pass.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\hat{y}_t = f\\!\\left(\\mathbf{x}_{t-R+1}, \\dots, \\mathbf{x}_t\\right), \\qquad R = 1 + \\sum_{l=1}^{L} (k - 1)\\, d_l, \\quad d_l = 2^{\\,l-1}',
      symbols: [
        { symbol: 'R', meaning: 'the receptive field — how far back the model can see, and a fixed number computed from the architecture rather than learned' },
        { symbol: 'k', meaning: 'kernel size, usually 2 or 3; the receptive field is linear in it and exponential in depth' },
        { symbol: 'd_l', meaning: 'dilation at layer l, doubling each layer, which is what makes R exponential in L' },
        { symbol: 'L', meaning: 'number of layers; adding one doubles the horizon rather than extending it by a constant' },
      ],
    },
    reading:
      'The prediction at every position is a function of a fixed window ending at that position — nothing more. That formulation says two things at once. It is causal, so no output depends on a future input, which is what makes the training targets honest. And the window is finite and known: unlike a recurrent model, whose memory horizon is whatever the gradient happens to sustain, this one has a receptive field you can compute from the kernel size and the depth before training anything. Dependencies inside it are learnable and dependencies outside it are invisible, which is a much sharper contract than a recurrent model offers in either direction.',
  },

  optimization: {
    method: 'Ordinary SGD on a feedforward graph — no unrolling through time, so no backpropagation through time and no vanishing recurrent gradient',
    updateRule: {
      formula:
        '\\mathbf{h}^{(l)}_t = \\mathbf{h}^{(l-1)}_t + \\sum_{i=0}^{k-1} W^{(l)}_i \\, \\mathbf{h}^{(l-1)}_{t - i\\,d_l}',
      symbols: [
        { symbol: '\\mathbf{h}^{(l-1)}_t +', meaning: 'the residual connection — an additive path the gradient travels without being multiplied, the same idea gating uses' },
        { symbol: 't - i\\,d_l', meaning: 'taps spaced by the dilation, so a layer reaches back k·d_l positions using only k weights' },
        { symbol: 'W^{(l)}_i', meaning: 'shared across every position in the sequence, so the parameter count is independent of length' },
        { symbol: '\\sum_{i}', meaning: 'a fixed-size sum with no dependence on any other output position — which is exactly why the whole sequence computes in parallel' },
      ],
    },
    rationale:
      'Because there is no recurrence, this is an ordinary feedforward network and trains like one: no unrolling, no truncation, no backpropagation through time, and none of the geometric decay that comes from a repeated product of the same Jacobian. Depth is still deep, so the residual connection matters for the same reason it does anywhere — it gives the gradient an additive route through the stack. Three design points carry the weight. The dilation schedule sets the receptive field, and it should be computed against the longest dependency in the problem rather than chosen by convention. Causal padding must pad only the left; padding both sides leaks the future and produces validation numbers that are simply wrong. And weight normalization plus dropout on the residual branch is the standard stabilization, because the effective depth after stacking dilated blocks is substantial.',
    hyperparameters: [
      { name: 'depth and dilation schedule', role: 'Together these set the receptive field, which should be computed against the longest dependency the problem actually has rather than picked by convention', typicalRange: 'dilations doubling from 1 to 256 or 512, giving a horizon of a few hundred to a few thousand steps' },
      { name: 'kernel size', role: 'Usually 2 or 3. The receptive field is linear in it and exponential in depth, so adding a layer is far cheaper than widening the kernel' },
      { name: 'channels', role: 'Width per layer, and the capacity dial. Cost is quadratic in it, so this is where the compute budget goes' },
      { name: 'residual and normalization', role: 'Weight normalization on the convolutions and dropout on the residual branch. Standard because the stack is genuinely deep' },
      { name: 'padding', role: 'Left-only, always. Symmetric padding leaks the future, and the resulting validation numbers look excellent and mean nothing' },
    ],
    convergence:
      'Trains as a feedforward network, which is the point — none of the recurrent pathologies apply, and gradient clipping is optional rather than mandatory. The failure modes are different in kind. The receptive field is a hard limit: a dependency one step beyond it is not merely hard to learn, it is structurally invisible, and no amount of training or data reaches it. Causal leakage is the failure that actually happens in practice, and it is silent — a padding mistake or an off-by-one in the shift produces a model that validates beautifully and fails in production, which is worth checking explicitly rather than assuming. And memory during training grows with sequence length times channels because activations at every position are retained, which makes long sequences a memory problem where for a recurrent model they were a time problem.',
    complexity:
      'Training and inference over a whole sequence: O(T · L · k · c^2), fully parallel across positions — which on hardware built for parallel throughput is worth far more than the asymptotics suggest. Memory is O(T · L · c) for the stored activations, and that is the binding constraint rather than time. Autoregressive generation is the weak case: producing tokens one at a time recomputes overlapping windows unless activations are cached, and even cached it is O(R) per step against a recurrent model’s O(1).',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Stack dilated causal convolution blocks over the series with the receptive field sized to cover the longest dependency that matters — a full seasonal cycle, typically. Exogenous drivers enter as additional input channels at every position. The whole sequence trains in one parallel pass, and multi-horizon output is a wider final layer rather than a recursive decode.',
        where: [
          'High-frequency series where the relevant history is long and a recurrent model’s effective memory falls short',
          'Global models across many series, where the parallel training pass is what makes the dataset size tractable',
          'Multi-horizon forecasting produced directly rather than by recursion, which avoids compounding errors',
          'Problems with many exogenous channels, since additional inputs cost only width rather than a longer recurrence',
        ],
        why: 'It reaches back further than a gated recurrent model reliably can, and it trains in parallel over the sequence, which on modern hardware is decisive — a TCN and a GRU of similar quality will differ by an order of magnitude in training wall-clock. The receptive field being explicit is also a genuine engineering advantage: you can state before training how far back the model sees. The costs are the mirror image. That horizon is a hard ceiling rather than a soft one, memory scales with sequence length, and autoregressive generation is slower than a recurrent model’s constant-time step.',
        featurization: [
          'Compute the receptive field explicitly and check it covers the seasonal period — this is arithmetic, not a hyperparameter search',
          'Scale inputs and targets per series, as for any network trained across series',
          'Difference or detrend, since the model learns a fitted shape and extrapolates it unpredictably',
          'Verify causality directly: shift the target by one and confirm performance collapses, which catches the padding bug that otherwise validates beautifully',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing. Compare against a GRU on the same setup — and if the TCN is far better, check the receptive fields, because the difference is usually horizon rather than architecture.',
        pitfalls: [
          'Symmetric padding leaking the future, which produces excellent validation numbers and a model that fails in production',
          'A receptive field shorter than the seasonal period, which makes the seasonality structurally invisible rather than merely hard',
          'Scaling statistics computed over the whole series before splitting, the standard leak in neural forecasting',
          'Memory: long sequences retain activations at every position and every layer, which is where a TCN runs out rather than in time',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train to predict the next observation on clean data and score by prediction error, as with any sequence model. The difference is the horizon: the receptive field is explicit, so the span of context informing each prediction is known rather than inferred — which makes it possible to say what the detector can and cannot notice.',
        where: [
          'High-frequency telemetry where the anomaly is a break in long-range structure and the volume rules out a recurrent model',
          'Multivariate sensor monitoring, where additional channels cost width rather than a longer recurrence',
          'Batch scoring of historical sequences, where the parallel pass is worth far more than constant-time streaming would be',
        ],
        why: 'It scores a long history in one parallel pass, which matters when the volume is high and the scoring is batch. And the explicit receptive field is a real advantage over a recurrent detector, whose effective memory is whatever the gradient sustained and is therefore unknown. Against it: streaming detection is the weak case, since each new point costs O(R) rather than O(1) unless activations are cached carefully — so a recurrent or state-space detector is the better fit when scoring must happen per arrival.',
        featurization: [
          'Size the receptive field to cover the longest normal pattern; anything beyond it cannot inform the score at all',
          'Fit on a confirmed-clean window, since contamination teaches the model that the anomaly is a valid continuation',
          'Standardize residuals per channel, as raw error is dominated by whichever channel has the largest scale',
          'Cache layer activations for streaming rather than recomputing the window, which is the difference between viable and not',
        ],
        evaluation:
          'Precision@k against confirmed incidents with the threshold from clean-period error quantiles, holding out whole anomaly episodes. PR-AUC rather than ROC-AUC at the usual imbalance.',
        pitfalls: [
          'A receptive field shorter than the pattern being violated, so the anomaly is invisible by construction',
          'Causal leakage during training, which produces a detector that cannot reproduce its validation performance on live data',
          'Streaming without activation caching, which recomputes the whole window per arrival and does not meet latency',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The interesting content is a design calculation rather than a solver. The receptive field is a closed-form function of kernel size, depth and dilation schedule, so sizing the architecture to a required horizon is arithmetic done before training — and the exponential growth means the trade is unusually favourable: doubling the horizon costs one layer rather than doubling the parameters. That is a rare case where an architectural choice has an exact cost model.',
        where: [
          'Receptive-field sizing as a closed-form design calculation rather than a hyperparameter search',
          'The parallel-versus-sequential trade, where a worse asymptotic profile wins because the hardware rewards parallelism',
          'Residual connections as the same additive-gradient-path idea gating uses, applied to depth rather than to time',
        ],
        why: 'It is a good demonstration that the asymptotics are not the whole cost model. A TCN does more total arithmetic than a recurrent model of comparable quality and trains an order of magnitude faster, because every position computes independently and the hardware is built for exactly that. Reasoning about which axis a computation parallelizes over — rather than counting operations — is the transferable skill, and this is one of the clearest places to see it pay.',
        featurization: [
          'Compute the receptive field from the schedule and check it against the longest dependency before training anything',
          'Prefer depth over kernel width for reach, since the field is exponential in one and linear in the other',
        ],
        evaluation:
          'Verify the receptive field empirically — perturb an input far back and confirm the output changes exactly when the arithmetic says it should. That is an exact test of the architecture, and it catches dilation-schedule mistakes that no accuracy metric would.',
        pitfalls: [
          'Choosing a dilation schedule by convention rather than computing the horizon it produces',
          'Comparing architectures on operation counts rather than wall-clock, which reverses the conclusion here',
          'Assuming a deeper stack always reaches further, when a repeated dilation schedule leaves gaps in coverage',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'adapted',
        how: 'Dilated causal convolutions over tokens or raw audio samples, predicting the next element. This is the WaveNet formulation, and it was the first architecture to generate convincing raw audio — where the sample rate makes the required receptive field enormous and a recurrent model has no chance of reaching it.',
        where: [
          'Raw-audio generation and vocoding, where the receptive field must span thousands of samples',
          'Character-level language modelling, as the pre-transformer parallel alternative to a recurrent model',
          'Sequence labelling where the whole input is available and parallel training is the binding constraint',
        ],
        why: 'On audio it solved a problem recurrence could not: at 16 kHz a meaningful context is tens of thousands of samples, which no gated recurrent model reaches, and an exponentially growing receptive field does. On text it was a credible parallel alternative to recurrence and was then superseded by attention, which has an unbounded receptive field rather than a fixed one and parallelizes just as well. What remains distinctive is the cost profile: linear rather than quadratic in sequence length, which is why convolutional and state-space sequence models keep reappearing for very long contexts.',
        featurization: [
          'For audio, use a mu-law or similar companding of the amplitude, which turns a regression into a manageable categorical prediction',
          'Size the receptive field against the phenomenon — phoneme, word, or musical phrase — rather than against a default schedule',
          'Cache activations for generation; naive autoregressive sampling recomputes the entire window per output and is orders of magnitude slower',
        ],
        evaluation:
          'Perplexity or negative log-likelihood per element, plus generation quality where that is the deliverable. Report the receptive field alongside, since it bounds what the model could possibly have captured.',
        pitfalls: [
          'Naive autoregressive generation without activation caching, which is the single largest performance mistake with this architecture',
          'A receptive field far shorter than the structure being modelled, which caps quality regardless of capacity',
          'Causal leakage from symmetric padding, which is silent and invalidates every reported number',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Fully parallel across sequence positions, which is the operative fact: a TCN trains far faster in wall-clock than a recurrent model of comparable quality despite doing more total arithmetic. Memory rather than time is the ceiling, since activations at every position and every layer are retained for the backward pass.',
    inferenceProfile:
      'Whole-sequence scoring is one parallel pass and is fast. Autoregressive generation is the weak case: O(R) per step even with cached activations, against a recurrent model’s O(1), so a TCN is a better batch scorer and a worse token-by-token generator.',
    retrainingCadence:
      'Periodic and full, warm-started. There is no state to carry between deployments, which removes an entire class of operational error that recurrent models have — nothing to reset, nothing to leak between sequences.',
    driftAndMonitoring: [
      'Track performance against dependency distance, and specifically at distances near the receptive-field boundary, where degradation appears first as the data changes',
      'Verify causality after any change to padding, shifting or the dilation schedule — leakage is silent and only a deliberate test finds it',
      'Monitor activation memory against sequence length, since that is the resource this architecture exhausts rather than time',
      'Watch for inputs whose relevant history exceeds the receptive field, which is a modelling gap rather than a drift',
    ],
    productionGotchas: [
      'Padding must be left-only. Symmetric padding leaks the future, produces excellent validation numbers, and fails in production — the most damaging and most common error with this architecture',
      'The receptive field is arithmetic, not a hyperparameter: compute it, and confirm it covers the dependency you need before training',
      'Autoregressive generation needs cached activations, or each output recomputes the entire window and generation is orders of magnitude slower than it should be',
      'Sequence length at inference must not exceed what the padding scheme assumed, or the leading positions see zero-padding as real content',
      'Memory scales with sequence length times depth times channels, so a longer input can exhaust memory rather than merely take longer — which surprises teams used to recurrent scaling',
    ],
  },

  assumptions: [
    'The relevant history fits inside the receptive field — a hard limit, since anything beyond it is structurally invisible rather than merely difficult',
    'The sequence is regularly sampled, since dilation counts positions rather than elapsed time',
    'Outputs depend only on the past, which the causal padding enforces and a padding mistake silently breaks',
    'Translation invariance over time is appropriate: the same filter applies at every position, so a process whose dynamics change with position needs positional input',
    'Memory for the full activation stack is available, which is what bounds sequence length here rather than time',
  ],

  pros: [
    {
      point: 'Fully parallel across sequence positions',
      context:
        'Every output depends only on its own window, so training processes the whole sequence at once. This is why a TCN trains far faster in wall-clock than a recurrent model despite doing more arithmetic, and it is the main reason to choose one.',
    },
    {
      point: 'The receptive field is exponential in depth and known in advance',
      context:
        'Doubling the horizon costs one layer, and the horizon is a closed-form calculation rather than a property that emerges from training. Being able to state what the model can see before training it is unusual and genuinely useful.',
    },
    {
      point: 'Trains as a feedforward network',
      context:
        'No unrolling, no truncation, no backpropagation through time, and none of the recurrent gradient pathologies. Clipping becomes optional rather than mandatory, which removes a class of failure entirely.',
    },
    {
      point: 'No state to manage between sequences',
      context:
        'Nothing to reset and nothing to leak from one sequence into the next, which removes one of the most common operational errors with recurrent models. Worth more in production than it sounds.',
    },
  ],

  cons: [
    {
      point: 'The receptive field is a hard ceiling',
      context:
        'A dependency one step beyond it is structurally invisible, not merely hard to learn. Attention has no such limit, which is the clearest single argument for it and the reason this architecture is a specialization rather than a replacement.',
    },
    {
      point: 'Memory scales with sequence length times depth',
      context:
        'Activations at every position and every layer are retained for the backward pass, so long sequences exhaust memory rather than time. The opposite failure from a recurrent model, and it surprises teams who expect recurrent scaling.',
    },
    {
      point: 'Autoregressive generation is slow',
      context:
        'O(R) per step even with cached activations, against a recurrent model’s O(1). A TCN is a good batch scorer and a poor token-by-token generator, which is a real deployment consideration rather than a benchmark artefact.',
    },
    {
      point: 'Causal leakage is silent and easy',
      context:
        'One padding mistake produces a model that validates beautifully and fails completely, with nothing raised anywhere. Verifying causality deliberately is a requirement rather than a precaution.',
    },
  ],

  relatedSlugs: ['cnn', 'lstm', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A dilated causal convolution stack - transcribed.

Two modifications turn an ordinary convolution into a sequence model. Causal:
only look left. Dilated: skip a growing gap between taps, so the receptive
field doubles per layer while the parameter count grows linearly.
"""


def receptive_field(layers, kernel):
    """R = 1 + sum over layers of (k - 1) * dilation, dilations doubling.

    This is arithmetic, not a hyperparameter. Compute it and check it covers
    the longest dependency in the problem BEFORE training anything - a
    dependency one step beyond it is structurally invisible, not merely hard.
    """
    total = 1
    for layer in range(layers):
        total += (kernel - 1) * (2 ** layer)
    return total


def causal_conv1d(sequence, weights, bias, dilation):
    """One dilated causal convolution over a single-channel sequence.

    sequence[t] contributes only to outputs at positions >= t. The loop below
    reads BACKWARDS from t, never forwards, which is what makes it causal -
    and the reason a symmetric padding scheme silently breaks the model.
    """
    kernel = len(weights)
    out = [0.0] * len(sequence)

    for t in range(len(sequence)):
        total = bias
        for i in range(kernel):
            source = t - i * dilation
            # Positions before the start are treated as zero: this is the
            # LEFT padding, and it must never be applied on the right.
            if source >= 0:
                total += weights[i] * sequence[source]
        out[t] = total

    return out


def relu(values):
    return [value if value > 0.0 else 0.0 for value in values]


def residual_block(sequence, weights_a, bias_a, weights_b, bias_b, dilation):
    """Two dilated convolutions plus a skip connection.

    The residual is the same idea gating uses in a recurrent model: an
    ADDITIVE path the gradient travels without being multiplied. Here it is
    applied to depth rather than to time, and it is what makes a deep stack
    trainable.
    """
    hidden = relu(causal_conv1d(sequence, weights_a, bias_a, dilation))
    output = causal_conv1d(hidden, weights_b, bias_b, dilation)
    return [output[t] + sequence[t] for t in range(len(sequence))]


def forward(sequence, blocks):
    """blocks is a list of (weights_a, bias_a, weights_b, bias_b) tuples.

    Dilation doubles per block, so a stack of L blocks reaches back
    exponentially far using only L * 2 * k weights.
    """
    current = list(sequence)
    for layer, (w_a, b_a, w_b, b_b) in enumerate(blocks):
        current = residual_block(current, w_a, b_a, w_b, b_b, 2 ** layer)
    return current`,
        profile: 'O(T * L * k) per sequence in interpreter loops, single-channel, with a fresh output list allocated per convolution.',
      },
      'make-it-right': {
        code: `"""A TCN - typed, multi-channel, causal padding verified, as one matmul."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


@dataclass(frozen=True)
class DilatedBlock:
    """One residual block: two dilated causal convolutions and a skip."""

    weights_a: Tensor    # (kernel, in_channels, out_channels)
    bias_a: Vector
    weights_b: Tensor
    bias_b: Vector
    dilation: int

    @property
    def kernel(self) -> int:
        return self.weights_a.shape[0]


def receptive_field(blocks: list[DilatedBlock]) -> int:
    """R = 1 + sum over layers of (k - 1) * dilation, counting BOTH
    convolutions in each residual block.

    Arithmetic, not a hyperparameter. A dependency one step beyond R is
    structurally invisible rather than merely hard to learn, so this should be
    computed and checked against the problem before training anything.
    """
    return 1 + sum(2 * (block.kernel - 1) * block.dilation for block in blocks)


def causal_conv1d(sequence: Tensor, weights: Tensor, bias: Vector, dilation: int) -> Tensor:
    """Dilated causal convolution over (batch, time, channels).

    Implemented as an explicit gather plus one matrix product rather than a
    loop over positions: the k taps are gathered into a (batch, time, k *
    in_channels) block, which is then one GEMM against the flattened kernel.
    That is how every framework implements a convolution, and it is why a
    convolution is fast at all.
    """
    if sequence.ndim != 3:
        raise ValueError(f"expected (batch, time, channels), got {sequence.shape}")

    batch, steps, in_channels = sequence.shape
    kernel = weights.shape[0]

    # LEFT padding only. Padding both sides leaks the future and produces a
    # model that validates beautifully and fails in production - the most
    # damaging and most common error with this architecture.
    padding = (kernel - 1) * dilation
    padded = np.pad(sequence, ((0, 0), (padding, 0), (0, 0)))

    # Gather the k dilated taps for every output position.
    gathered = np.empty((batch, steps, kernel * in_channels), dtype=np.float64)
    for i in range(kernel):
        start = padding - i * dilation
        gathered[:, :, i * in_channels : (i + 1) * in_channels] = padded[
            :, start : start + steps
        ]

    flat_weights = weights.reshape(kernel * in_channels, -1)
    return gathered @ flat_weights + bias


def forward(sequence: Tensor, blocks: list[DilatedBlock]) -> Tensor:
    """Run the stack. Every position is computed independently, so the whole
    sequence is processed in one pass - the property that distinguishes this
    from a recurrent model."""
    current = sequence

    for block in blocks:
        hidden = np.maximum(
            causal_conv1d(current, block.weights_a, block.bias_a, block.dilation), 0.0
        )
        output = causal_conv1d(hidden, block.weights_b, block.bias_b, block.dilation)

        # The residual: an ADDITIVE path the gradient travels without being
        # multiplied - the same idea gating uses, applied to depth rather
        # than time, and what makes a deep stack trainable.
        if output.shape[2] != current.shape[2]:
            raise ValueError(
                f"residual shape mismatch: block outputs {output.shape[2]} channels "
                f"but input has {current.shape[2]}; a 1x1 projection is needed"
            )
        current = output + current

    return current


def assert_causal(blocks: list[DilatedBlock], steps: int, channels: int) -> None:
    """Verify causality directly rather than assuming it.

    Perturb the LAST input position and confirm no earlier output changed. A
    padding or shift mistake is silent - it produces excellent validation
    numbers - so this check belongs in the test suite rather than in a
    reviewer's head.
    """
    baseline = np.zeros((1, steps, channels), dtype=np.float64)
    perturbed = baseline.copy()
    perturbed[0, -1] = 1.0

    before = forward(baseline, blocks)
    after = forward(perturbed, blocks)

    if not np.allclose(before[0, :-1], after[0, :-1]):
        raise AssertionError("causality violated: a past output changed with a future input")`,
        rationale:
          'The convolution stops being a loop over positions and becomes what every framework actually does: gather the k dilated taps into one block and multiply by the flattened kernel, so a convolution is a GEMM. The padding becomes explicitly left-only with the reason stated, since symmetric padding leaks the future and produces a model that validates beautifully and fails in production. And causality gets an executable check rather than a comment — perturb the last input and confirm no earlier output moved — because that failure is silent and the only way to catch it is to test for it deliberately. The receptive field is computed from the blocks rather than assumed.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(T * L * k * c^2) as GEMMs, fully parallel across positions, with one gathered block per convolution.',
      },
      'make-it-fast': {
        code: `"""A TCN - preallocated gather buffers, cached activations for streaming."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


class StreamingTcn:
    """Two changes, for the two regimes this architecture is used in.

    Batch: the gather buffer for each layer is allocated once and rewritten,
    rather than allocating a (batch, time, k * channels) block per convolution
    per forward pass. On a deep stack over a long sequence that is the
    dominant allocation, and activation memory is what a TCN exhausts rather
    than time.

    Streaming: naive autoregressive generation recomputes the entire receptive
    field for every output, which is the single largest performance mistake
    with this architecture. Keeping a small ring buffer per layer - just the
    k dilated taps that layer needs - makes each new step O(L * k * c^2)
    instead of O(R * L * k * c^2).
    """

    def __init__(self, blocks: list[tuple[Tensor, Vector, Tensor, Vector, int]],
                 batch: int, max_steps: int) -> None:
        self._blocks = blocks
        # One contiguous float32 buffer per layer, sized once. float32 halves
        # the traffic on the activation stack, which is the binding resource.
        self._gathered: list[Matrix] = []
        self._rings: list[Matrix] = []

        for weights_a, _, _, _, dilation in blocks:
            kernel, in_channels, _ = weights_a.shape
            self._gathered.append(
                np.zeros((batch, max_steps, kernel * in_channels), dtype=np.float32)
            )
            # Ring buffer holding only the taps this layer reads: k positions
            # spaced by the dilation, not the whole receptive field.
            self._rings.append(
                np.zeros((batch, (kernel - 1) * dilation + 1, in_channels), dtype=np.float32)
            )

    def _conv(self, sequence: Tensor, weights: Tensor, bias: Vector, dilation: int,
              buffer: Matrix) -> Tensor:
        batch, steps, in_channels = sequence.shape
        kernel = weights.shape[0]
        padding = (kernel - 1) * dilation

        padded = np.zeros((batch, steps + padding, in_channels), dtype=np.float32)
        padded[:, padding:] = sequence      # LEFT padding only

        gathered = buffer[:batch, :steps]
        for i in range(kernel):
            start = padding - i * dilation
            # Written into the preallocated buffer rather than a new array.
            np.copyto(
                gathered[:, :, i * in_channels : (i + 1) * in_channels],
                padded[:, start : start + steps],
            )

        return gathered @ weights.reshape(kernel * in_channels, -1) + bias

    def forward(self, sequence: Tensor) -> Tensor:
        """Whole-sequence pass. Every position computes independently, which
        is what makes this fully parallel and a recurrent model not."""
        current = np.ascontiguousarray(sequence, dtype=np.float32)

        for index, (weights_a, bias_a, weights_b, bias_b, dilation) in enumerate(self._blocks):
            hidden = self._conv(current, weights_a, bias_a, dilation, self._gathered[index])
            np.maximum(hidden, 0.0, out=hidden)
            output = self._conv(hidden, weights_b, bias_b, dilation, self._gathered[index])
            current = output + current      # residual

        return current

    def step(self, x: Matrix) -> Matrix:
        """One new timestep, using cached taps.

        This is the difference between viable and unusable autoregressive
        generation: each layer keeps only the k positions it actually reads,
        so a new output costs one pass through the stack rather than a
        recomputation of the whole receptive field.
        """
        current = x

        for index, (weights_a, bias_a, weights_b, bias_b, dilation) in enumerate(self._blocks):
            ring = self._rings[index]
            # Shift in the new value; the ring holds exactly the span this
            # layer's dilated taps reach across, and nothing more.
            ring[:, :-1] = ring[:, 1:]
            ring[:, -1] = current

            kernel = weights_a.shape[0]
            taps = np.concatenate(
                [ring[:, -1 - i * dilation] for i in range(kernel)], axis=1
            )

            hidden = np.maximum(taps @ weights_a.reshape(-1, weights_a.shape[2]) + bias_a, 0.0)
            output = hidden @ weights_b.reshape(-1, weights_b.shape[2]) + bias_b
            current = output + current

        return current`,
        rationale:
          'Two changes for the two regimes this architecture is used in. For batch scoring, the gather buffer per layer is allocated once and rewritten rather than materializing a (batch, time, k·channels) block per convolution per pass — on a deep stack over a long sequence that is the dominant allocation, and activation memory is precisely what a TCN exhausts. For streaming, the naive autoregressive path recomputes the entire receptive field for every output, which is the single largest performance mistake with this architecture; a per-layer ring buffer holding only the taps that layer reads makes each step one pass through the stack instead. Precision drops to float32 because the activation stack is the binding resource.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Each layer’s gather buffer and streaming ring are allocated once and rewritten, removing a large per-convolution allocation from every forward pass.',
            tradeoff: 'Fixes batch size and maximum sequence length at construction, and the buffers are shared mutable state — the object is not reentrant and cannot serve two streams at once.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Each convolution becomes a gather plus one GEMM against the flattened kernel, which is how a convolution is made fast and what makes the whole sequence computable in one call.',
            tradeoff: 'The gather materializes k copies of the input, so the intermediate is k times the activation size — the memory cost that buys the parallelism, and the reason long sequences run out of memory rather than time.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Contiguous float32 halves the traffic on the activation stack — the resource this architecture actually exhausts — and lets each GEMM read the gathered block without an internal copy.',
            tradeoff: 'float32 accumulates error through a deep stack, and the residual additions compound it; some implementations keep the residual path in higher precision for exactly this reason.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(T * L * k * c^2) batch, O(L * k * c^2) per streaming step versus O(R * L * k * c^2) naive. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A dilated causal convolution stack - transcribed.
#include <cstddef>
#include <vector>

// R = 1 + sum over layers of (k - 1) * dilation, dilations doubling.
//
// This is arithmetic, not a hyperparameter. Compute it and check it covers
// the longest dependency BEFORE training - a dependency one step beyond it is
// structurally invisible, not merely hard to learn.
std::size_t ReceptiveField(std::size_t layers, std::size_t kernel) {
  std::size_t total = 1;
  for (std::size_t layer = 0; layer < layers; ++layer) {
    total += (kernel - 1) * (std::size_t{1} << layer);
  }
  return total;
}

// One dilated causal convolution over a single-channel sequence.
//
// sequence[t] contributes only to outputs at positions >= t. The loop reads
// BACKWARDS from t, never forwards, which is what makes it causal - and the
// reason a symmetric padding scheme silently breaks the model.
std::vector<double> CausalConv1d(const std::vector<double>& sequence,
                                 const std::vector<double>& weights, double bias,
                                 std::size_t dilation) {
  const std::size_t kernel = weights.size();
  std::vector<double> out(sequence.size(), 0.0);

  for (std::size_t t = 0; t < sequence.size(); ++t) {
    double total = bias;
    for (std::size_t i = 0; i < kernel; ++i) {
      const std::size_t offset = i * dilation;
      // Positions before the start are treated as zero: this is the LEFT
      // padding, and it must never be applied on the right.
      if (t >= offset) total += weights[i] * sequence[t - offset];
    }
    out[t] = total;
  }

  return out;
}

std::vector<double> Relu(const std::vector<double>& values) {
  std::vector<double> out(values.size(), 0.0);
  for (std::size_t i = 0; i < values.size(); ++i) out[i] = values[i] > 0.0 ? values[i] : 0.0;
  return out;
}

// Two dilated convolutions plus a skip connection.
//
// The residual is the same idea gating uses in a recurrent model: an ADDITIVE
// path the gradient travels without being multiplied. Here it is applied to
// depth rather than to time, and it is what makes a deep stack trainable.
std::vector<double> ResidualBlock(const std::vector<double>& sequence,
                                  const std::vector<double>& weights_a, double bias_a,
                                  const std::vector<double>& weights_b, double bias_b,
                                  std::size_t dilation) {
  const std::vector<double> hidden =
      Relu(CausalConv1d(sequence, weights_a, bias_a, dilation));
  const std::vector<double> output = CausalConv1d(hidden, weights_b, bias_b, dilation);

  std::vector<double> out(sequence.size(), 0.0);
  for (std::size_t t = 0; t < sequence.size(); ++t) out[t] = output[t] + sequence[t];
  return out;
}`,
        profile: 'O(T * L * k) per sequence, single-channel, with a fresh output vector allocated for every convolution and activation.',
      },
      'make-it-right': {
        code: `// A TCN - multi-channel, flat storage, gather-plus-GEMM, causality checked.
#include <algorithm>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <vector>

// One residual block: two dilated causal convolutions and a skip.
//
// Weights are flat: (kernel, in_channels, out_channels) row-major, so the
// gather-plus-product below reads them as one contiguous matrix.
struct DilatedBlock {
  std::vector<double> weights_a;
  std::vector<double> bias_a;
  std::vector<double> weights_b;
  std::vector<double> bias_b;
  std::size_t kernel = 0;
  std::size_t channels = 0;
  std::size_t dilation = 1;
};

// R = 1 + sum over layers of (k - 1) * dilation, counting BOTH convolutions
// in each residual block.
//
// Arithmetic, not a hyperparameter: a dependency one step beyond R is
// structurally invisible rather than merely hard to learn.
[[nodiscard]] std::size_t ReceptiveField(std::span<const DilatedBlock> blocks) {
  std::size_t total = 1;
  for (const DilatedBlock& block : blocks) {
    total += 2 * (block.kernel - 1) * block.dilation;
  }
  return total;
}

class TemporalConvNet {
 public:
  TemporalConvNet(std::vector<DilatedBlock> blocks, std::size_t max_steps)
      : blocks_(std::move(blocks)) {
    if (blocks_.empty()) throw std::invalid_argument("empty network");

    std::size_t widest = 0;
    for (const DilatedBlock& block : blocks_) {
      if (block.kernel == 0 || block.channels == 0) {
        throw std::invalid_argument("block has zero kernel or channel width");
      }
      widest = std::max(widest, block.kernel * block.channels);
    }

    // Gather buffer sized once for the widest layer and reused by all of
    // them, rather than allocated per convolution per forward pass.
    gathered_.assign(max_steps * widest, 0.0);
    scratch_.assign(max_steps * blocks_.front().channels, 0.0);
  }

  // One dilated causal convolution, as a gather plus one matrix product.
  //
  // That is how every framework implements a convolution and why one is fast
  // at all: the k dilated taps for every output position are gathered into a
  // (steps, k * channels) block, which is then one GEMM against the flattened
  // kernel.
  void CausalConv(std::span<const double> sequence, std::size_t steps,
                  const DilatedBlock& block, std::span<const double> weights,
                  std::span<const double> bias, std::span<double> out) {
    const std::size_t c = block.channels;
    const std::size_t k = block.kernel;
    const std::size_t padding = (k - 1) * block.dilation;

    for (std::size_t t = 0; t < steps; ++t) {
      for (std::size_t i = 0; i < k; ++i) {
        const std::size_t offset = i * block.dilation;
        double* target = gathered_.data() + t * k * c + i * c;

        // LEFT padding only. Padding both sides leaks the future and
        // produces a model that validates beautifully and fails in
        // production - the most damaging error with this architecture.
        if (t < offset) {
          std::fill_n(target, c, 0.0);
        } else {
          std::copy_n(sequence.data() + (t - offset) * c, c, target);
        }
      }
    }

    for (std::size_t t = 0; t < steps; ++t) {
      for (std::size_t o = 0; o < c; ++o) out[t * c + o] = bias[o];
      const double* row = gathered_.data() + t * k * c;
      for (std::size_t j = 0; j < k * c; ++j) {
        const double value = row[j];
        const double* kernel_row = weights.data() + j * c;
        for (std::size_t o = 0; o < c; ++o) out[t * c + o] += value * kernel_row[o];
      }
    }
  }

  // Verify causality directly rather than assuming it.
  //
  // Perturb the LAST input position and confirm no earlier output changed. A
  // padding or shift mistake is silent - it produces excellent validation
  // numbers - so this belongs in the test suite rather than in a reviewer's
  // head.
  [[nodiscard]] bool IsCausal(std::size_t steps) {
    const std::size_t c = blocks_.front().channels;
    std::vector<double> baseline(steps * c, 0.0);
    std::vector<double> perturbed = baseline;
    perturbed[(steps - 1) * c] = 1.0;

    const std::vector<double> before = Forward(baseline, steps);
    const std::vector<double> after = Forward(perturbed, steps);

    for (std::size_t i = 0; i < (steps - 1) * c; ++i) {
      if (std::abs(before[i] - after[i]) > 1e-12) return false;
    }
    return true;
  }

  [[nodiscard]] std::vector<double> Forward(std::span<const double> sequence,
                                            std::size_t steps) {
    std::vector<double> current(sequence.begin(), sequence.end());
    std::vector<double> hidden(current.size(), 0.0);
    std::vector<double> output(current.size(), 0.0);

    for (const DilatedBlock& block : blocks_) {
      CausalConv(current, steps, block, block.weights_a, block.bias_a, hidden);
      for (double& value : hidden) value = value > 0.0 ? value : 0.0;

      CausalConv(hidden, steps, block, block.weights_b, block.bias_b, output);

      // The residual: an ADDITIVE path the gradient travels without being
      // multiplied - the same idea gating uses, applied to depth.
      for (std::size_t i = 0; i < current.size(); ++i) current[i] = output[i] + current[i];
    }

    return current;
  }

 private:
  std::vector<DilatedBlock> blocks_;
  std::vector<double> gathered_;   // reused by every convolution
  std::vector<double> scratch_;
};`,
        rationale:
          'The convolution becomes a gather plus one matrix product, which is how every framework implements one and why a convolution is fast at all — the k dilated taps for each position are collected into a contiguous block that multiplies against the flattened kernel. The model becomes multi-channel, which is what a real TCN is, and all storage flattens to row-major buffers with the gather buffer hoisted into the object rather than allocated per convolution. And causality gets an executable check rather than a comment, because a padding or shift mistake is silent and produces excellent validation numbers — the only way to catch it is to test for it deliberately.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(T * L * k * c^2) with one gather buffer reused by every layer, contiguous throughout.',
      },
      'make-it-fast': {
        code: `// A TCN - gather-plus-GEMM in Eigen, layers streamed, positions parallel.
#include <Eigen/Dense>
#include <stdexcept>
#include <vector>

// Row-major: a timestep is one contiguous run of channels, which is what both
// the gather and the GEMM want.
using RowMajorMatrix =
    Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// Every output position is computed from its own window and depends on no
// other output. That is the property that distinguishes this from a recurrent
// model, and it means the whole sequence is one parallel pass - the gather
// loop below parallelizes across positions with nothing shared.
class TemporalConvNet {
 public:
  struct Block {
    RowMajorMatrix weights_a;   // (kernel * channels, channels)
    Eigen::RowVectorXf bias_a;
    RowMajorMatrix weights_b;
    Eigen::RowVectorXf bias_b;
    int kernel;
    int dilation;
  };

  TemporalConvNet(std::vector<Block> blocks, int max_steps, int channels)
      : blocks_(std::move(blocks)), channels_(channels) {
    if (blocks_.empty()) throw std::invalid_argument("empty network");

    int widest = 0;
    for (const Block& block : blocks_) widest = std::max(widest, block.kernel * channels);

    // Allocated once for the widest layer and reused by all of them.
    // Activation memory is what a TCN exhausts rather than time, so making
    // the largest buffer explicit and shared is the point.
    gathered_ = RowMajorMatrix::Zero(max_steps, widest);
    hidden_ = RowMajorMatrix::Zero(max_steps, channels);
    output_ = RowMajorMatrix::Zero(max_steps, channels);
  }

  const RowMajorMatrix& Forward(const RowMajorMatrix& sequence) {
    current_ = sequence;
    const int steps = static_cast<int>(sequence.rows());

    for (const Block& block : blocks_) {
      Convolve(current_, steps, block, block.weights_a, block.bias_a, hidden_);
      hidden_.topRows(steps) = hidden_.topRows(steps).cwiseMax(0.0F);

      Convolve(hidden_, steps, block, block.weights_b, block.bias_b, output_);

      // The residual: an additive path the gradient travels without being
      // multiplied - the same idea gating uses, applied to depth.
      current_.topRows(steps) += output_.topRows(steps);
    }

    return current_;
  }

 private:
  void Convolve(const RowMajorMatrix& sequence, int steps, const Block& block,
                const RowMajorMatrix& weights, const Eigen::RowVectorXf& bias,
                RowMajorMatrix& out) {
    const int k = block.kernel;
    const int c = channels_;

    // Positions are independent, so the gather parallelizes with nothing
    // shared and no reduction to merge.
#pragma omp parallel for schedule(static)
    for (int t = 0; t < steps; ++t) {
      for (int i = 0; i < k; ++i) {
        const int source = t - i * block.dilation;
        // LEFT padding only. Symmetric padding leaks the future and produces
        // a model that validates beautifully and fails in production.
        if (source < 0) {
          gathered_.row(t).segment(i * c, c).setZero();
        } else {
          gathered_.row(t).segment(i * c, c) = sequence.row(source);
        }
      }
    }

    // The gathered block times the flattened kernel: one GEMM for the whole
    // sequence, which is why a convolution is fast at all.
    out.topRows(steps).noalias() = gathered_.topRows(steps).leftCols(k * c) * weights;
    out.topRows(steps).rowwise() += bias;
  }

  std::vector<Block> blocks_;
  int channels_;
  RowMajorMatrix gathered_;   // allocated once, shared by every layer
  RowMajorMatrix hidden_;
  RowMajorMatrix output_;
  RowMajorMatrix current_;
};`,
        rationale:
          'The convolution is expressed as a gather followed by one GEMM for the entire sequence, which is how a convolution is made fast — and because every output position depends only on its own window, the gather itself parallelizes across positions with nothing shared and no reduction. That independence is the property distinguishing this architecture from a recurrent one, and it is what the parallel region makes concrete. The gather buffer is allocated once for the widest layer and shared by all of them, since activation memory rather than time is what a TCN exhausts, and precision drops to float for the same reason.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Output positions are fully independent — the defining property of the architecture — so the gather partitions across cores with no synchronization and nothing to merge.',
            tradeoff: 'The gather is memory-bound and the GEMM that follows is already threaded inside BLAS, so nesting the two risks oversubscription unless thread counts are set deliberately.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Each convolution becomes one GEMM of the gathered block against the flattened kernel, covering the whole sequence in a single blocked call.',
            tradeoff: 'The gather materializes k copies of the activations, so the intermediate is k times the layer size — the memory cost that buys the parallelism, and the reason long sequences exhaust memory rather than time.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A timestep is one contiguous run of channels, so both the gather’s row copies and the GEMM’s panels read sequentially.',
            tradeoff: 'Eigen defaults to column-major, so the layout must be carried through every type — and a single mixed-layout product silently costs a transpose in the hottest loop of the model.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(T * L * k * c^2) with positions across cores and each convolution one GEMM. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A dilated causal convolution stack - transcribed.

/// R = 1 + sum over layers of (k - 1) * dilation, dilations doubling.
///
/// This is arithmetic, not a hyperparameter. Compute it and check it covers
/// the longest dependency BEFORE training - a dependency one step beyond it
/// is structurally invisible, not merely hard to learn.
#[must_use]
pub fn receptive_field(layers: usize, kernel: usize) -> usize {
    (0..layers).map(|layer| (kernel - 1) * (1 << layer)).sum::<usize>() + 1
}

/// One dilated causal convolution over a single-channel sequence.
///
/// sequence[t] contributes only to outputs at positions >= t. The loop reads
/// BACKWARDS from t, never forwards, which is what makes it causal - and the
/// reason a symmetric padding scheme silently breaks the model.
#[must_use]
pub fn causal_conv1d(sequence: &[f64], weights: &[f64], bias: f64, dilation: usize) -> Vec<f64> {
    let kernel = weights.len();
    let mut out = vec![0.0; sequence.len()];

    for t in 0..sequence.len() {
        let mut total = bias;
        for i in 0..kernel {
            let offset = i * dilation;
            // Positions before the start are treated as zero: this is the
            // LEFT padding, and it must never be applied on the right.
            if t >= offset {
                total += weights[i] * sequence[t - offset];
            }
        }
        out[t] = total;
    }

    out
}

fn relu(values: &[f64]) -> Vec<f64> {
    values.iter().map(|&value| value.max(0.0)).collect()
}

/// Two dilated convolutions plus a skip connection.
///
/// The residual is the same idea gating uses in a recurrent model: an
/// ADDITIVE path the gradient travels without being multiplied. Here it is
/// applied to depth rather than to time, and it is what makes a deep stack
/// trainable.
#[must_use]
pub fn residual_block(
    sequence: &[f64],
    weights_a: &[f64],
    bias_a: f64,
    weights_b: &[f64],
    bias_b: f64,
    dilation: usize,
) -> Vec<f64> {
    let hidden = relu(&causal_conv1d(sequence, weights_a, bias_a, dilation));
    let output = causal_conv1d(&hidden, weights_b, bias_b, dilation);

    output.iter().zip(sequence).map(|(o, s)| o + s).collect()
}

/// Dilation doubles per block, so a stack of L blocks reaches back
/// exponentially far using only L * 2 * k weights.
#[must_use]
pub fn forward(sequence: &[f64], blocks: &[(Vec<f64>, f64, Vec<f64>, f64)]) -> Vec<f64> {
    let mut current = sequence.to_vec();
    for (layer, (w_a, b_a, w_b, b_b)) in blocks.iter().enumerate() {
        current = residual_block(&current, w_a, *b_a, w_b, *b_b, 1 << layer);
    }
    current
}`,
        profile: 'O(T * L * k) per sequence, single-channel, with a fresh Vec allocated for every convolution and activation.',
      },
      'make-it-right': {
        code: `//! A TCN - typed errors, multi-channel, gather-plus-product, causality test.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum TcnError {
    Empty,
    ZeroWidth,
    ShapeMismatch { expected: usize, found: usize },
    ResidualMismatch { produced: usize, expected: usize },
    CausalityViolated,
}

impl fmt::Display for TcnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty network"),
            Self::ZeroWidth => write!(f, "block has zero kernel or channel width"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::ResidualMismatch { produced, expected } => write!(
                f,
                "residual shape mismatch: block produced {produced} channels but input has \
                 {expected}; a 1x1 projection is needed"
            ),
            Self::CausalityViolated => write!(
                f,
                "causality violated: a past output changed when a future input did"
            ),
        }
    }
}

impl std::error::Error for TcnError {}

/// The receptive field. A newtype because it is the number that decides what
/// the model can possibly learn, and returning a bare usize invites it being
/// computed and then ignored.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReceptiveField(pub usize);

impl ReceptiveField {
    /// R = 1 + sum over layers of (k - 1) * dilation, counting BOTH
    /// convolutions in each residual block.
    ///
    /// Arithmetic, not a hyperparameter: a dependency one step beyond R is
    /// structurally invisible rather than merely hard to learn.
    #[must_use]
    pub fn of(blocks: &[DilatedBlock]) -> Self {
        Self(1 + blocks.iter().map(|b| 2 * (b.kernel - 1) * b.dilation).sum::<usize>())
    }

    #[must_use]
    pub fn covers(self, dependency: usize) -> bool {
        self.0 >= dependency
    }
}

/// One residual block. Weights are flat: (kernel, channels, channels)
/// row-major, so the gather-plus-product below reads them as one matrix.
pub struct DilatedBlock {
    pub weights_a: Vec<f64>,
    pub bias_a: Vec<f64>,
    pub weights_b: Vec<f64>,
    pub bias_b: Vec<f64>,
    pub kernel: usize,
    pub channels: usize,
    pub dilation: usize,
}

pub struct TemporalConvNet {
    blocks: Vec<DilatedBlock>,
    /// Gather buffer sized once for the widest layer and reused by all of
    /// them, rather than allocated per convolution per forward pass.
    gathered: Vec<f64>,
    channels: usize,
}

impl TemporalConvNet {
    pub fn new(blocks: Vec<DilatedBlock>, max_steps: usize) -> Result<Self, TcnError> {
        if blocks.is_empty() {
            return Err(TcnError::Empty);
        }
        if blocks.iter().any(|b| b.kernel == 0 || b.channels == 0) {
            return Err(TcnError::ZeroWidth);
        }

        let widest = blocks.iter().map(|b| b.kernel * b.channels).max().unwrap_or(0);
        let channels = blocks[0].channels;

        Ok(Self { blocks, gathered: vec![0.0; max_steps * widest], channels })
    }

    /// One dilated causal convolution, as a gather plus one matrix product.
    ///
    /// That is how every framework implements a convolution and why one is
    /// fast at all: the k dilated taps for every output position are gathered
    /// into a (steps, k * channels) block, then multiplied by the flattened
    /// kernel.
    fn convolve(
        &mut self,
        sequence: &[f64],
        steps: usize,
        kernel: usize,
        channels: usize,
        dilation: usize,
        weights: &[f64],
        bias: &[f64],
        out: &mut [f64],
    ) {
        for t in 0..steps {
            for i in 0..kernel {
                let offset = i * dilation;
                let target = &mut self.gathered[t * kernel * channels + i * channels
                    ..t * kernel * channels + (i + 1) * channels];

                // LEFT padding only. Padding both sides leaks the future and
                // produces a model that validates beautifully and fails in
                // production - the most damaging error with this architecture.
                if t < offset {
                    target.fill(0.0);
                } else {
                    target.copy_from_slice(
                        &sequence[(t - offset) * channels..(t - offset + 1) * channels],
                    );
                }
            }
        }

        for t in 0..steps {
            let row = &self.gathered[t * kernel * channels..(t + 1) * kernel * channels];
            let target = &mut out[t * channels..(t + 1) * channels];
            target.copy_from_slice(bias);

            for (j, &value) in row.iter().enumerate() {
                let kernel_row = &weights[j * channels..(j + 1) * channels];
                for (slot, weight) in target.iter_mut().zip(kernel_row) {
                    *slot += value * weight;
                }
            }
        }
    }

    pub fn forward(&mut self, sequence: &[f64], steps: usize) -> Result<Vec<f64>, TcnError> {
        if sequence.len() != steps * self.channels {
            return Err(TcnError::ShapeMismatch {
                expected: steps * self.channels,
                found: sequence.len(),
            });
        }

        let mut current = sequence.to_vec();
        let mut hidden = vec![0.0; current.len()];
        let mut output = vec![0.0; current.len()];

        for index in 0..self.blocks.len() {
            let (kernel, channels, dilation) = {
                let block = &self.blocks[index];
                (block.kernel, block.channels, block.dilation)
            };
            let weights_a = self.blocks[index].weights_a.clone();
            let bias_a = self.blocks[index].bias_a.clone();
            let weights_b = self.blocks[index].weights_b.clone();
            let bias_b = self.blocks[index].bias_b.clone();

            self.convolve(&current, steps, kernel, channels, dilation, &weights_a, &bias_a,
                          &mut hidden);
            hidden.iter_mut().for_each(|value| *value = value.max(0.0));

            self.convolve(&hidden, steps, kernel, channels, dilation, &weights_b, &bias_b,
                          &mut output);

            // The residual: an ADDITIVE path the gradient travels without
            // being multiplied - the same idea gating uses, applied to depth.
            for (slot, value) in current.iter_mut().zip(&output) {
                *slot += value;
            }
        }

        Ok(current)
    }

    /// Verify causality directly rather than assuming it.
    ///
    /// Perturb the LAST input position and confirm no earlier output changed.
    /// A padding or shift mistake is silent - it produces excellent
    /// validation numbers - so this belongs in the test suite rather than in
    /// a reviewer's head.
    pub fn assert_causal(&mut self, steps: usize) -> Result<(), TcnError> {
        let baseline = vec![0.0; steps * self.channels];
        let mut perturbed = baseline.clone();
        perturbed[(steps - 1) * self.channels] = 1.0;

        let before = self.forward(&baseline, steps)?;
        let after = self.forward(&perturbed, steps)?;

        let boundary = (steps - 1) * self.channels;
        if before[..boundary]
            .iter()
            .zip(&after[..boundary])
            .any(|(a, b)| (a - b).abs() > 1e-12)
        {
            return Err(TcnError::CausalityViolated);
        }

        Ok(())
    }
}
`,
        rationale:
          'The convolution becomes a gather plus one matrix product — how every framework implements one, and why a convolution is fast at all. The model becomes multi-channel with flat row-major storage and a gather buffer owned by the network rather than allocated per convolution. Errors become a typed Result, and the receptive field gets a newtype with a covers() predicate because it is the number that decides what the model can possibly learn and a bare usize invites computing it and ignoring it. Causality gets an executable assertion rather than a comment, since a padding mistake is silent and produces excellent validation numbers.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(T * L * k * c^2) with one gather buffer reused by every layer, contiguous throughout.',
      },
      'make-it-fast': {
        code: `//! A TCN - positions in parallel, and a streaming cache for generation.

use rayon::prelude::*;

/// Every output position is computed from its own window and depends on no
/// other output. That independence is the property distinguishing this from a
/// recurrent model, and it means the gather parallelizes across positions
/// with nothing shared and no reduction to merge.
pub struct TemporalConvNet {
    blocks: Vec<Block>,
    channels: usize,
}

pub struct Block {
    /// Flattened (kernel * channels, channels), row-major.
    pub weights_a: Vec<f32>,
    pub bias_a: Vec<f32>,
    pub weights_b: Vec<f32>,
    pub bias_b: Vec<f32>,
    pub kernel: usize,
    pub dilation: usize,
    /// Ring buffer holding ONLY the span this layer's dilated taps reach
    /// across - not the whole receptive field.
    pub ring: Vec<f32>,
}

impl TemporalConvNet {
    /// Whole-sequence pass: the gather is a parallel map over positions.
    #[must_use]
    pub fn forward(&self, sequence: &[f32], steps: usize) -> Vec<f32> {
        let mut current = sequence.to_vec();

        for block in &self.blocks {
            let hidden = self.convolve(&current, steps, block, &block.weights_a, &block.bias_a);
            let activated: Vec<f32> = hidden.into_iter().map(|v| v.max(0.0)).collect();
            let output = self.convolve(&activated, steps, block, &block.weights_b, &block.bias_b);

            // The residual: an additive path the gradient travels without
            // being multiplied - the same idea gating uses, applied to depth.
            current
                .iter_mut()
                .zip(&output)
                .for_each(|(slot, value)| *slot += value);
        }

        current
    }

    fn convolve(
        &self,
        sequence: &[f32],
        steps: usize,
        block: &Block,
        weights: &[f32],
        bias: &[f32],
    ) -> Vec<f32> {
        let c = self.channels;
        let k = block.kernel;

        let mut out = Vec::with_capacity(steps * c);
        out.resize(steps * c, 0.0);

        // Positions are independent, so this is a parallel map over output
        // rows with no shared mutable state anywhere.
        out.par_chunks_exact_mut(c).enumerate().for_each(|(t, target)| {
            target.copy_from_slice(bias);

            for i in 0..k {
                let offset = i * block.dilation;
                // LEFT padding only. Symmetric padding leaks the future and
                // produces a model that validates beautifully and fails.
                if t < offset {
                    continue;
                }

                let source = &sequence[(t - offset) * c..(t - offset + 1) * c];
                for (j, &value) in source.iter().enumerate() {
                    let row = &weights[(i * c + j) * c..(i * c + j + 1) * c];
                    for (slot, weight) in target.iter_mut().zip(row) {
                        *slot += value * weight;
                    }
                }
            }
        });

        out
    }

    /// One new timestep, using cached taps.
    ///
    /// Naive autoregressive generation recomputes the entire receptive field
    /// for every output, which is the single largest performance mistake with
    /// this architecture. Each layer keeping only the k positions it actually
    /// reads makes a new output O(L * k * c^2) instead of O(R * L * k * c^2).
    pub fn step(&mut self, x: &[f32]) -> Vec<f32> {
        let c = self.channels;
        let mut current = x.to_vec();

        for block in &mut self.blocks {
            // Shift the ring: it spans exactly what this layer's taps reach.
            block.ring.rotate_left(c);
            let tail = block.ring.len() - c;
            block.ring[tail..].copy_from_slice(&current);

            let mut hidden = block.bias_a.clone();
            for i in 0..block.kernel {
                let position = block.ring.len() - c - i * block.dilation * c;
                let source = &block.ring[position..position + c];
                for (j, &value) in source.iter().enumerate() {
                    let row = &block.weights_a[(i * c + j) * c..(i * c + j + 1) * c];
                    for (slot, weight) in hidden.iter_mut().zip(row) {
                        *slot += value * weight;
                    }
                }
            }
            hidden.iter_mut().for_each(|value| *value = value.max(0.0));

            let mut output = block.bias_b.clone();
            for (j, &value) in hidden.iter().enumerate() {
                let row = &block.weights_b[j * c..(j + 1) * c];
                for (slot, weight) in output.iter_mut().zip(row) {
                    *slot += value * weight;
                }
            }

            current
                .iter_mut()
                .zip(&output)
                .for_each(|(slot, value)| *slot += value);
        }

        current
    }
}
`,
        rationale:
          'Two changes for the two regimes. For batch scoring, the gather becomes a parallel map over output positions — which is available precisely because every position depends only on its own window, the property that distinguishes this architecture from a recurrent one. For streaming, the naive autoregressive path recomputes the entire receptive field per output, which is the single largest performance mistake with a TCN; a per-layer ring buffer holding only the span that layer’s taps reach makes each new step one pass through the stack. Precision is f32 throughout, since the activation stack is the resource this architecture exhausts.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Output positions are fully independent, so the convolution is a parallel map over output rows with no locking and no reduction — the defining property of the architecture made concrete.',
            tradeoff: 'The per-position work is small for a narrow layer, so fork-join overhead can exceed it; and the parallel gather reads the input from many threads at once, which is bandwidth-bound rather than compute-bound.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-major storage makes each timestep one contiguous run of channels, so par_chunks_exact_mut hands each worker a slice and every tap read is sequential.',
            tradeoff: 'The tap reads jump by the dilation, so the input side is strided even though the output side is contiguous — at large dilations that stride exceeds a cache line and the gather becomes a scattered read.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each convolution’s output is sized before being filled, so the parallel map never grows its destination while workers are writing into it.',
            tradeoff: 'Still one allocation per convolution per layer rather than a reused buffer; a preallocated arena would remove them but conflicts with returning owned results from a parallel map.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(T * L * k * c^2) with positions across cores; O(L * k * c^2) per streaming step versus O(R * L * k * c^2) naive. Illustrative, not a measured benchmark.',
      },
    },
  },
};
