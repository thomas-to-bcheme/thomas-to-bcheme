import type { AiMlModel } from '../../types';

/**
 * Recurrent Neural Network — the architecture that adds memory, and then
 * cannot hold onto it.
 *
 * Opens the sequence group because it is the smallest complete statement of
 * the idea every later entry refines: carry a hidden state forward and update
 * it with each input. It also contains, in full, the failure that motivates
 * the LSTM and the GRU — the gradient through a long chain of multiplications
 * either vanishes or explodes, and there is no setting of the weights that
 * avoids it.
 */
export const RNN: AiMlModel = {
  slug: 'rnn',
  name: 'Recurrent Neural Network',
  aliases: ['Vanilla RNN', 'Elman network', 'BPTT', 'Simple recurrent network'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'model',

  paradigms: ['supervised', 'self-supervised'],
  // 'anomaly-detection' via one-step prediction error over a sequence, which
  // is the standard sequence detector — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['sequence-modeling', 'regression', 'classification', 'anomaly-detection'],
  architecture: 'recurrent',
  paradigmNote:
    'Supervised when the targets come from outside — a label per sequence, a value per step. Self-supervised when the target is the sequence’s own next element, which is the same objective a language model uses and is where the architecture came from.',

  intuition:
    'A feedforward network sees a fixed-size input and has no way to represent "what came before". Give it a hidden state that is fed back in alongside the next input and it does: the state is a running summary of everything seen so far, updated once per step. Weights are shared across steps, so the same update rule applies at position three and position three hundred — which is what lets one model handle sequences of any length. The trouble is in the gradient. To learn from step three hundred what happened at step three, the error has to be multiplied back through three hundred copies of the same matrix, and repeated multiplication by a matrix either shrinks toward zero or grows without bound. Almost nothing in between.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\sum_{t=1}^{T} \\mathcal{L}_t(\\hat{y}_t, y_t), \\qquad \\mathbf{h}_t = \\sigma\\!\\left(W_{hh}\\mathbf{h}_{t-1} + W_{xh}\\mathbf{x}_t + \\mathbf{b}\\right)',
      symbols: [
        { symbol: '\\mathbf{h}_t', meaning: 'the hidden state — a running summary of the sequence so far, and the only memory the model has' },
        { symbol: 'W_{hh}', meaning: 'the recurrent matrix, applied once per timestep; the same matrix, which is what makes the gradient a repeated product' },
        { symbol: 'W_{xh}', meaning: 'the input projection, also shared across every step — which is why one model handles any sequence length' },
        { symbol: '\\sum_t', meaning: 'loss accumulated over the sequence; for a per-sequence label only the final step contributes' },
      ],
    },
    reading:
      'Sum the loss over the sequence, where the prediction at each step depends on a state carrying everything before it. The weight sharing across steps is the architectural commitment and it does two things at once. It makes the parameter count independent of sequence length, which is why an RNN can read a sentence of any size. And it makes the backward pass a repeated product of the same Jacobian, which is the entire reason the architecture fails on long sequences — the property that gives it its generality is the property that breaks it.',
  },

  optimization: {
    method: 'Backpropagation through time — the network unrolled into a deep feedforward graph with tied weights — usually truncated, with gradient clipping',
    updateRule: {
      formula:
        '\\frac{\\partial \\mathcal{L}_T}{\\partial \\mathbf{h}_k} = \\frac{\\partial \\mathcal{L}_T}{\\partial \\mathbf{h}_T}\\prod_{t=k+1}^{T} \\frac{\\partial \\mathbf{h}_t}{\\partial \\mathbf{h}_{t-1}}, \\qquad \\frac{\\partial \\mathbf{h}_t}{\\partial \\mathbf{h}_{t-1}} = W_{hh}^{\\top}\\,\\mathrm{diag}\\!\\left(\\sigma^{\\prime}(\\mathbf{z}_t)\\right)',
      symbols: [
        { symbol: '\\prod_{t}', meaning: 'the repeated product — the whole problem in one symbol, since a product of T matrices is exponential in T' },
        { symbol: 'W_{hh}^{\\top}', meaning: 'the same matrix at every factor, so its spectral radius is raised to the power of the distance' },
        { symbol: '\\mathrm{diag}(\\sigma^{\\prime})', meaning: 'the activation derivative, at most 0.25 for a sigmoid — which guarantees shrinkage regardless of the weights' },
        { symbol: 'T - k', meaning: 'how far back the signal must travel; the gradient decays or grows exponentially in this distance' },
      ],
    },
    rationale:
      'Backpropagation through time is ordinary backpropagation applied to the unrolled graph, with the twist that the same weights appear at every layer so their gradients are summed across all of them. The product in the update rule is where everything difficult lives. If the recurrent matrix has spectral radius below one, the product decays geometrically and a signal from a hundred steps back arrives as numerical zero — the model literally cannot learn the dependency, and no amount of training changes that. Above one and the product explodes, producing NaN losses. Gradient clipping handles the explosion cheaply and does nothing for the vanishing case, which is asymmetric and worth knowing: exploding gradients are an inconvenience, vanishing gradients are a capability limit. Truncating the unroll to a fixed window bounds the memory and the compute, and it also bounds what the model can learn to a horizon you chose in advance.',
    hyperparameters: [
      { name: 'hidden size', role: 'The capacity of the memory. Everything the model knows about the past is compressed into this vector, so it bounds how much context can be retained', typicalRange: '128 to 1024' },
      { name: 'truncation length', role: 'How many steps the unroll spans. Sets both the memory cost and the longest dependency the model can learn — a limit chosen rather than discovered', typicalRange: '32 to 256 steps' },
      { name: 'gradient clipping', role: 'Norm threshold on the global gradient. Not optional: without it a single exploding batch produces NaN weights and the run is over', typicalRange: 'global norm 1.0 to 5.0' },
      { name: 'activation', role: 'tanh by default. ReLU makes explosion far more likely in a recurrent setting, which is the opposite of its effect in a feedforward one' },
      { name: 'recurrent initialization', role: 'Orthogonal or identity-scaled, which puts the initial spectral radius near one and delays the onset of both failures' },
      { name: 'teacher forcing', role: 'Feeding the true previous token during training rather than the model’s own prediction. Speeds convergence and creates exposure bias at inference' },
    ],
    convergence:
      'Trains by SGD like any network, and the failures are specific to the recurrence. Vanishing gradients: the product of Jacobians decays geometrically, so dependencies more than a few dozen steps apart are unlearnable — this is a capability ceiling, not a tuning problem, and it is precisely what the gating in an LSTM exists to bypass. Exploding gradients: the same product in the other direction, which shows as a loss that trains normally and then jumps to NaN in one batch; clipping fixes it and is cheap enough that it should always be on. Exposure bias follows from teacher forcing — the model is trained on true prefixes and evaluated on its own generated ones, so errors compound at inference in a way training never showed it. And the sequential dependency means no parallelism across time, which is not a convergence problem but is the reason the architecture lost to attention.',
    complexity:
      'O(T · (h^2 + h·d)) per sequence for the forward pass, and roughly twice that backward — linear in sequence length, which compares well against attention’s quadratic. Memory is O(T · h) for the stored states, which is what truncation bounds. The decisive cost is not in the asymptotics: the recurrence is sequential in T, so timesteps cannot be computed in parallel, and on hardware built for parallel throughput that is worth more than the asymptotic advantage.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Feed observations in order and read a prediction from the hidden state, either one step at a time or by decoding a whole horizon. Exogenous drivers concatenate onto the input at each step, and a single network trained across many series learns shared dynamics — which is where the recurrent approach actually earns its place, since a per-series RNN has far too many parameters for the data.',
        where: [
          'Global forecasting models trained across thousands of related series',
          'Irregular or variable-length histories, which a fixed-window model cannot accept without padding decisions',
          'Multivariate series where the interaction between channels evolves over time',
          'The recurrent baseline that establishes whether sequence modelling helps at all before an LSTM or attention model is tried',
        ],
        why: 'It handles variable-length input natively and learns the temporal structure rather than having it supplied as lag features, which is a genuine advantage over a dense network on the same data. In practice the plain RNN is almost always replaced by an LSTM or GRU before deployment, for exactly the reason this entry documents — seasonal dependencies span more steps than the gradient survives. And on a single ordinary business series, exponential smoothing generally beats all of them, because a few hundred observations cannot identify a recurrent model of any kind.',
        featurization: [
          'Scale inputs and targets per series before training; a network across series is otherwise dominated by whichever has the largest values',
          'Difference or detrend, since the network learns a fitted shape and extrapolates it unpredictably rather than continuing a trend',
          'Encode seasonality explicitly as a calendar feature at each step — a plain RNN will not learn an annual cycle through the gradient',
          'Truncate the unroll to a window that covers the dependencies you actually need, and accept that anything longer is unlearnable',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing specifically. Compare against an LSTM on the same setup — if the gap is large, the vanishing gradient is the explanation rather than capacity.',
        pitfalls: [
          'Expecting a plain RNN to learn a seasonal dependency, which is exactly the range where the gradient has already vanished',
          'Shuffled validation splits, which leak the future and invalidate every number',
          'Scaling statistics computed over the whole series before splitting, which is the most common leak in neural forecasting',
          'Comparing only against a weak baseline, which is how most recurrent forecasting results were made to look good',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train to predict the next observation on normal data, then score by prediction error: a point the model did not expect is a candidate. Because the model conditions on the whole prefix rather than a fixed window, it can flag a value that is unremarkable in isolation and wrong given what preceded it — which is the class of anomaly a threshold cannot see.',
        where: [
          'Multivariate telemetry monitoring, where the anomaly is a broken relationship between channels over time',
          'Sequence anomaly detection in logs and event streams, where the surprising thing is the order rather than any single event',
          'Industrial process monitoring with long, structured operating cycles',
        ],
        why: 'It learns what normal dynamics look like rather than what normal values look like, which is the right frame when the process has structure a static model cannot express. Against it: the vanishing gradient limits how much context genuinely informs the prediction, so a plain RNN detector is effectively conditioning on the recent past regardless of how much history it was fed — and an LSTM or a temporal convolution does the same job with a longer effective memory. It also needs clean training data, and the reconstruction-error threshold is uncalibrated in the way every neural detector’s is.',
        featurization: [
          'Train on a confirmed-clean window; contamination teaches the model that the anomaly is a normal continuation',
          'Score standardized residuals per channel, since raw prediction error is dominated by whichever channel has the largest scale',
          'Distinguish point anomalies from sustained regime shifts by looking at runs of errors rather than individual values',
        ],
        evaluation:
          'Precision@k against confirmed incidents with the threshold from clean-period error quantiles, holding out entire anomaly episodes rather than points from inside one. PR-AUC rather than ROC-AUC at the usual imbalance.',
        pitfalls: [
          'Contaminated training data, after which the model predicts the anomaly and the error is small',
          'Assuming long context is being used when the vanishing gradient means it is not — the model is conditioning on far less than it was given',
          'A single global error threshold across channels of different scales and volatilities',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The vanishing and exploding gradient problem is the clearest concrete instance in this section of an optimization pathology caused by the model rather than by the optimizer. The gradient is a product of T Jacobians of the same matrix, so its magnitude is governed by that matrix’s spectral radius raised to the power of the distance — geometric decay below one, geometric growth above. No learning rate schedule fixes it, because the signal that would drive the update has already become numerically zero.',
        where: [
          'The reference example of why deep computation graphs are hard to optimize, and the direct motivation for gating, residual connections and normalization',
          'Gradient clipping as the standard remedy for the exploding half, and a demonstration that the two failures are not symmetric',
          'Orthogonal and identity initialization as an attempt to place the spectral radius near one deliberately',
        ],
        why: 'It is worth studying because the diagnosis is exact and the remedies follow from it rather than from experiment: the problem is a repeated product, so either bound the product (clipping), or give the gradient a path that avoids the multiplication entirely (the LSTM’s additive cell state, or a residual connection). That second idea — build a route through the graph where the gradient is not repeatedly multiplied — is one of the most transferable in deep learning, and it is easiest to see here where the failure is unambiguous.',
        featurization: [
          'Initialize the recurrent matrix orthogonally, which places the initial spectral radius at exactly one and delays both failures',
          'Clip the global gradient norm rather than per-parameter, since clipping tensors separately changes the gradient direction and clipping the global norm does not',
        ],
        evaluation:
          'Log the gradient norm per step: a norm decaying geometrically with unroll depth is the vanishing case made visible, and occasional enormous spikes are the exploding one. Both are diagnosable directly rather than inferred from the loss.',
        pitfalls: [
          'Treating a plateau as a learning-rate problem when the gradient reaching the early steps is numerically zero',
          'Clipping per parameter tensor, which silently changes the update direction',
          'Using ReLU in the recurrence, where its unbounded derivative makes explosion far more likely than in a feedforward stack',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'adapted',
        how: 'Read tokens in order, carry a hidden state, and predict the next token or a label for the sequence. This was the standard formulation for language modelling, tagging and classification, and it is where the encoder-decoder structure that underpins translation was first built — the encoder compresses a source sentence into a state, the decoder generates from it.',
        where: [
          'Character and word-level language modelling, historically the demonstration task for the architecture',
          'Sequence labelling and text classification before transformers',
          'The encoder-decoder formulation that machine translation was built on, and that attention was introduced to fix',
          'Small-vocabulary streaming tasks where a fixed-size state and O(1) per-token inference genuinely matter',
        ],
        why: 'Language is exactly the setting where the architecture’s limitation is most visible: agreement and reference routinely span more tokens than the gradient survives, so the plain RNN could not learn them. The history is instructive — LSTMs pushed the usable range out, attention removed the bottleneck of compressing a whole sentence into one vector, and then transformers removed the recurrence entirely for parallelism. What survives is the inference-time property: a recurrent model processes a token in O(1) with fixed state, where attention is O(sequence) per token, which is why recurrent and state-space formulations keep reappearing for long-context and streaming work.',
        featurization: [
          'Bucket sequences by length before batching, or padding dominates the compute on a batch with mixed lengths',
          'Use teacher forcing during training and accept exposure bias, or schedule a gradual switch to the model’s own predictions',
          'Reverse the source sequence in encoder-decoder setups — a genuine trick from the era, and a direct symptom of the memory limitation',
        ],
        evaluation:
          'Perplexity for language modelling, task metrics for labelling. Measure performance against dependency distance specifically: accuracy that falls off sharply with distance is the vanishing gradient rather than a data problem.',
        pitfalls: [
          'Expecting long-range agreement to be learned, which is exactly what the architecture cannot do',
          'Padding without masking, so the loss and the state are contaminated by pad tokens',
          'Exposure bias at generation time, where errors compound in a regime training never showed the model',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Linear in sequence length and sequential in it, which is the operative fact: timesteps cannot be computed in parallel, so a GPU is badly underused relative to an attention model of the same size. Truncated backpropagation bounds the memory and the per-step cost, and it also bounds what can be learned.',
    inferenceProfile:
      'O(1) per token with a fixed-size state — genuinely constant, unlike attention which is linear in the context so far. That is why recurrent and state-space formulations keep returning for streaming and long-context work, and it is the architecture’s most durable advantage.',
    retrainingCadence:
      'Periodic and full, warm-started from the previous weights. The state is not persisted between deployments — it is a summary of the current sequence, and a stale state is worse than no state.',
    driftAndMonitoring: [
      'Track the gradient norm during training as a first-class metric: geometric decay with unroll depth is the vanishing case and spikes are the exploding one, both diagnosable before the loss moves',
      'Monitor performance against dependency distance rather than in aggregate, since long-range accuracy degrades first and is invisible in an average',
      'Watch the hidden-state norm at inference; a state growing without bound over a long sequence indicates the dynamics have gone unstable',
      'For generation, compare teacher-forced and free-running metrics — a large gap is exposure bias rather than a modelling failure',
    ],
    productionGotchas: [
      'Hidden state must be reset between independent sequences; carrying it over leaks one sequence into the next and produces subtly wrong output with nothing raised',
      'Padding must be masked in both the loss and the state update, or pad tokens are learned as content',
      'Gradient clipping is not optional — one exploding batch produces NaN weights and the entire run is lost',
      'Variable-length batching requires either bucketing or packed sequences; naive padding to the longest member wastes most of the compute on a mixed batch',
      'The sequential recurrence means throughput does not improve with a bigger GPU the way a feedforward model’s does, which surprises teams sizing hardware from parameter count',
    ],
  },

  assumptions: [
    'The sequence has temporal structure worth carrying forward — with independent steps the recurrence adds cost and nothing else',
    'Relevant dependencies are short enough to survive the gradient, which for a plain RNN means a few dozen steps at most',
    'A fixed-size hidden state can summarize everything from the past that matters, which is a hard bottleneck for long or information-dense sequences',
    'Steps are evenly spaced, or the irregularity is supplied as an explicit input feature',
    'Sequences are independent of each other, since the state must be reset between them',
  ],

  pros: [
    {
      point: 'Handles variable-length sequences with a fixed parameter count',
      context:
        'Weight sharing across steps means one model reads a sentence of any length. The property that makes it general, and the same property that makes its gradient a repeated product.',
    },
    {
      point: 'O(1) inference per token with constant state',
      context:
        'Genuinely constant, where attention is linear in the context so far. This is the architecture’s most durable advantage and the reason recurrent and state-space formulations keep returning for streaming and long-context work.',
    },
    {
      point: 'Linear in sequence length rather than quadratic',
      context:
        'Compares well against attention on paper for long sequences. In practice the sequential dependency usually costs more than the asymptotic advantage saves, which is a good lesson about asymptotics.',
    },
    {
      point: 'Learns temporal structure rather than being given it',
      context:
        'No lag features to design, and the model can represent dependencies a fixed window would miss. Worth much less when the useful lags are few and known, where a dense network on lag features is simpler and trains faster.',
    },
  ],

  cons: [
    {
      point: 'Vanishing gradients make long dependencies unlearnable',
      context:
        'A capability ceiling rather than a tuning problem: the signal from far back arrives as numerical zero. This is the entire motivation for the LSTM and the GRU, and it means the plain RNN is essentially never the right production choice.',
    },
    {
      point: 'Exploding gradients require clipping as standard equipment',
      context:
        'One bad batch produces NaN weights and ends the run. Cheap to fix and easy to forget, and the asymmetry is worth noting — this failure is an inconvenience where the vanishing one is a limit.',
    },
    {
      point: 'Sequential in time, so no parallelism across the sequence',
      context:
        'The reason attention displaced it despite worse asymptotics: modern hardware rewards parallel throughput far more than it rewards linear complexity. A structural mismatch with the machines, not with the problem.',
    },
    {
      point: 'A fixed-size state is a hard information bottleneck',
      context:
        'Everything from the past must be compressed into one vector, which is what made encoder-decoder translation fail on long sentences and what attention was introduced to fix.',
    },
  ],

  relatedSlugs: ['lstm', 'gru', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A vanilla RNN - forward through time and BPTT, transcribed.

The forward pass carries a state; the backward pass walks the same chain in
reverse, multiplying by the recurrent Jacobian once per step. That repeated
multiplication is the entire vanishing-gradient problem, and it is visible in
the loop below.
"""

import math
import random


def tanh(z):
    return math.tanh(z)


def fit(sequences, targets, hidden, lr=0.01, epochs=100, seed=0):
    """One hidden layer, tanh activation, scalar output per sequence."""
    rng = random.Random(seed)
    d = len(sequences[0][0])

    W_xh = [[rng.gauss(0.0, 0.1) for _ in range(hidden)] for _ in range(d)]
    W_hh = [[rng.gauss(0.0, 0.1) for _ in range(hidden)] for _ in range(hidden)]
    W_hy = [rng.gauss(0.0, 0.1) for _ in range(hidden)]
    b_h = [0.0] * hidden
    b_y = 0.0

    for _ in range(epochs):
        for sequence, target in zip(sequences, targets):
            T = len(sequence)

            # ---- forward, carrying the state --------------------------
            # Every state is kept: the backward pass needs all of them,
            # which is why memory grows with sequence length and why
            # truncation exists.
            states = [[0.0] * hidden]
            for t in range(T):
                current = [0.0] * hidden
                for h in range(hidden):
                    total = b_h[h]
                    for j in range(d):
                        total += sequence[t][j] * W_xh[j][h]
                    for k in range(hidden):
                        total += states[t][k] * W_hh[k][h]
                    current[h] = tanh(total)
                states.append(current)

            prediction = b_y
            for h in range(hidden):
                prediction += states[T][h] * W_hy[h]

            # ---- backward through time --------------------------------
            error = 2.0 * (prediction - target)

            grad_W_hy = [error * states[T][h] for h in range(hidden)]
            grad_b_y = error

            grad_W_xh = [[0.0] * hidden for _ in range(d)]
            grad_W_hh = [[0.0] * hidden for _ in range(hidden)]
            grad_b_h = [0.0] * hidden

            # delta at the final state, then walked backwards.
            delta = [error * W_hy[h] for h in range(hidden)]

            for t in reversed(range(T)):
                # Multiply by the activation derivative: 1 - tanh^2, which is
                # at most 1 and usually much less. That factor alone shrinks
                # the signal at every step.
                gated = [delta[h] * (1.0 - states[t + 1][h] ** 2) for h in range(hidden)]

                for h in range(hidden):
                    grad_b_h[h] += gated[h]
                    for j in range(d):
                        grad_W_xh[j][h] += gated[h] * sequence[t][j]
                    for k in range(hidden):
                        grad_W_hh[k][h] += gated[h] * states[t][k]

                # THE PRODUCT. delta is multiplied by W_hh once per step, so
                # after T steps it has been multiplied by the same matrix T
                # times - geometric decay if its spectral radius is below one,
                # geometric growth if above. No learning rate fixes either.
                delta = [
                    sum(gated[h] * W_hh[k][h] for h in range(hidden))
                    for k in range(hidden)
                ]

            # ---- update ------------------------------------------------
            for h in range(hidden):
                W_hy[h] -= lr * grad_W_hy[h]
                b_h[h] -= lr * grad_b_h[h]
                for j in range(d):
                    W_xh[j][h] -= lr * grad_W_xh[j][h]
                for k in range(hidden):
                    W_hh[k][h] -= lr * grad_W_hh[k][h]
            b_y -= lr * grad_b_y

    return W_xh, W_hh, W_hy, b_h, b_y`,
        profile: 'O(T * hidden^2) forward and backward per sequence in interpreter loops, one sequence at a time, with no clipping and no truncation.',
      },
      'make-it-right': {
        code: `"""An RNN - typed, batched, orthogonally initialized, clipped, truncated."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


@dataclass
class RecurrentLayer:
    """Weights shared across every timestep - which is what makes the
    parameter count independent of sequence length, and the gradient a
    repeated product of the same matrix."""

    W_xh: Matrix
    W_hh: Matrix
    bias: Vector

    @classmethod
    def initialized(cls, input_size: int, hidden: int, rng: np.random.Generator) -> "RecurrentLayer":
        """Orthogonal initialization for the RECURRENT matrix specifically.

        An orthogonal matrix has every singular value equal to one, so the
        repeated product neither shrinks nor grows at initialization. That
        does not solve the vanishing gradient - training moves the weights
        away from orthogonality - but it delays the onset of both failures
        long enough for learning to start, which random init frequently does
        not.
        """
        random_matrix = rng.normal(0.0, 1.0, size=(hidden, hidden))
        orthogonal, _ = np.linalg.qr(random_matrix)

        return cls(
            W_xh=rng.normal(0.0, np.sqrt(2.0 / input_size), size=(input_size, hidden)),
            W_hh=orthogonal,
            bias=np.zeros(hidden, dtype=np.float64),
        )

    def forward(self, sequence: Tensor) -> tuple[Tensor, Vector]:
        """sequence is (batch, time, features). Returns every state, because
        the backward pass needs all of them - which is what makes memory grow
        with sequence length and why truncation exists."""
        if sequence.ndim != 3:
            raise ValueError(f"expected (batch, time, features), got {sequence.shape}")
        if sequence.shape[2] != self.W_xh.shape[0]:
            raise ValueError(
                f"expected {self.W_xh.shape[0]} features, got {sequence.shape[2]}"
            )

        batch, steps, _ = sequence.shape
        hidden = self.bias.size
        states = np.zeros((batch, steps + 1, hidden), dtype=np.float64)

        # The time loop cannot be vectorized - step t reads the state step
        # t-1 produced. What CAN be batched is the batch dimension, so each
        # step is one matrix product over the whole batch rather than a loop
        # over sequences.
        for t in range(steps):
            pre_activation = (
                sequence[:, t] @ self.W_xh + states[:, t] @ self.W_hh + self.bias
            )
            states[:, t + 1] = np.tanh(pre_activation)

        return states, states[:, -1]


def clip_global_norm(gradients: list[Matrix], max_norm: float) -> float:
    """Clip by the GLOBAL norm across every parameter, not per tensor.

    Exploding gradients are the tractable half of the problem, and this is the
    standard remedy. Clipping tensors independently would rescale them by
    different factors and change the gradient DIRECTION; clipping the global
    norm rescales everything by one factor and preserves it.
    """
    total = np.sqrt(sum(float(np.sum(g * g)) for g in gradients))
    if total > max_norm:
        scale = max_norm / total
        for gradient in gradients:
            gradient *= scale
    return total


def truncated_bptt(
    layer: RecurrentLayer,
    sequence: Tensor,
    targets: Tensor,
    window: int = 64,
) -> list[tuple[Tensor, Vector]]:
    """Split the sequence into windows, carrying the state and cutting the
    gradient at each boundary.

    Bounds memory and compute - and also bounds what the model can learn to
    the window length, which is a limit chosen in advance rather than
    discovered. That trade is the whole point of the technique.
    """
    if window < 1:
        raise ValueError(f"window must be at least 1, got {window}")

    chunks: list[tuple[Tensor, Vector]] = []
    steps = sequence.shape[1]

    for start in range(0, steps, window):
        stop = min(start + window, steps)
        states, final = layer.forward(sequence[:, start:stop])
        # The carried state is DETACHED: it flows forward as a value and the
        # gradient does not flow back through it. That cut is the truncation.
        chunks.append((states, final.copy()))

    return chunks`,
        rationale:
          'Three changes, and only the batching is about vectorization. The recurrent matrix gets orthogonal initialization, which sets every singular value to one so the repeated product neither shrinks nor grows at the start — it does not solve the vanishing gradient, since training moves the weights away from orthogonality, but it delays both failures long enough for learning to begin where random initialization frequently does not. Gradient clipping is added on the global norm rather than per tensor, because clipping tensors independently rescales them by different factors and changes the update direction. And truncated backpropagation makes the memory bound explicit, along with the fact that it also bounds what the model can learn. The time loop stays sequential because step t reads the state step t−1 produced; what is batched is the batch dimension.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(T * (h^2 + h*d)) per sequence with each timestep a batched matrix product rather than a loop over sequences.',
      },
      'make-it-fast': {
        code: `"""An RNN - fused input projection, preallocated states, packed batches."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


class FusedRnn:
    """The time loop is irreducibly sequential; everything around it is not.

    Step t reads the state step t-1 produced, so no rewrite parallelizes over
    time - that limitation is the architecture, and it is why attention
    displaced it. What CAN be lifted out of the loop is the input projection:
    x_t @ W_xh does not depend on any state, so all T of them are ONE matrix
    product computed before the loop starts, leaving only the recurrent term
    inside it.

    That halves the work in the hot loop and is the main reason a production
    RNN kernel looks nothing like the textbook formulation.
    """

    def __init__(self, input_size: int, hidden: int, batch: int, max_steps: int,
                 seed: int = 0) -> None:
        rng = np.random.default_rng(seed)

        # Contiguous float32: the recurrent product is memory-bound, and
        # halving the traffic on the state and weight arrays is worth more
        # than the extra mantissa bits on a bounded tanh output.
        self._W_xh = np.ascontiguousarray(
            rng.normal(0.0, np.sqrt(2.0 / input_size), size=(input_size, hidden)),
            dtype=np.float32,
        )
        orthogonal, _ = np.linalg.qr(rng.normal(0.0, 1.0, size=(hidden, hidden)))
        self._W_hh = np.ascontiguousarray(orthogonal, dtype=np.float32)
        self._bias = np.zeros(hidden, dtype=np.float32)

        # Every buffer allocated once for the whole run: states, the
        # projected inputs, and the per-step scratch.
        self._states = np.zeros((batch, max_steps + 1, hidden), dtype=np.float32)
        self._projected = np.zeros((batch, max_steps, hidden), dtype=np.float32)
        self._scratch = np.zeros((batch, hidden), dtype=np.float32)
        self._hidden = hidden

    def forward(self, sequence: Tensor, lengths: NDArray) -> Tensor:
        """sequence is (batch, time, features); lengths gives the true length
        of each member so padding contributes nothing."""
        batch, steps, _ = sequence.shape
        states = self._states[:batch, : steps + 1]
        states.fill(0.0)

        # ALL input projections in one GEMM, before the loop. This term does
        # not depend on the state, so computing it per step inside the loop -
        # as the textbook formulation does - repeats a matrix product T times
        # for no reason.
        projected = self._projected[:batch, :steps]
        np.matmul(sequence.reshape(-1, sequence.shape[2]), self._W_xh,
                  out=projected.reshape(-1, self._hidden))
        projected += self._bias

        for t in range(steps):
            # Only the recurrent term remains inside the loop.
            np.matmul(states[:, t], self._W_hh, out=self._scratch[:batch])
            self._scratch[:batch] += projected[:, t]
            np.tanh(self._scratch[:batch], out=states[:, t + 1])

            # Masking: a sequence that has ended keeps its final state rather
            # than continuing to consume padding. Done in place, because a
            # boolean-indexed copy here would allocate once per timestep.
            finished = lengths <= t
            if finished.any():
                states[finished, t + 1] = states[finished, t]

        return states[:, 1 : steps + 1]

    def final_states(self, lengths: NDArray) -> Matrix:
        """Gather each sequence's state at ITS OWN final step, not the last
        padded one - the classic off-by-one in variable-length batching."""
        rows = np.arange(lengths.size)
        return self._states[rows, lengths]`,
        rationale:
          'The time loop cannot be parallelized — step t reads the state step t−1 produced — and that limitation is the architecture rather than the implementation, which is why attention displaced it. What can be lifted out is the input projection: it does not depend on any state, so all T of them become one matrix product computed before the loop instead of a separate product inside it, which halves the work in the hot loop. Everything else is allocation discipline: states, projections and scratch allocated once, masking applied in place so a boolean-indexed copy is not made per timestep, and float32 because the recurrent product is memory-bound and a bounded tanh output does not need 52 bits.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'All T input projections collapse into a single GEMM before the loop, and the bias is folded into the same buffer, so the per-step work is only the recurrent product and the activation.',
            tradeoff: 'Requires the whole sequence resident before the first step, which rules out a genuinely streaming forward pass — the very use case where an RNN’s O(1) per-token inference is the reason to choose it.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The state tensor, the projection buffer and the per-step scratch are allocated once for the run rather than per call, which across thousands of steps is the dominant allocation.',
            tradeoff: 'Fixes a maximum batch size and sequence length at construction, and the buffers are shared mutable state, so the object cannot be used concurrently or reentered.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Contiguous float32 halves the memory traffic on the state and weight arrays, and lets each GEMM read them directly rather than through an internal conversion.',
            tradeoff: 'float32 accumulates error over a long unroll, and the recurrent product is exactly where that compounds — which is a genuine reason some implementations keep the state in higher precision than the weights.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(T * h^2) in the loop after the input projection is lifted out, versus O(T * (h^2 + h*d)). Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A vanilla RNN - forward through time and BPTT, transcribed.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

// The forward pass carries a state; the backward pass walks the same chain in
// reverse, multiplying by the recurrent Jacobian once per step. That repeated
// multiplication is the entire vanishing-gradient problem.
void Fit(const std::vector<std::vector<std::vector<double>>>& sequences,
         const std::vector<double>& targets, std::size_t hidden, double lr, int epochs,
         unsigned seed, std::vector<std::vector<double>>& W_xh,
         std::vector<std::vector<double>>& W_hh, std::vector<double>& W_hy,
         std::vector<double>& b_h, double& b_y) {
  const std::size_t d = sequences[0][0].size();
  std::mt19937 generator(seed);
  std::normal_distribution<double> init(0.0, 0.1);

  W_xh.assign(d, std::vector<double>(hidden, 0.0));
  for (auto& row : W_xh) for (double& value : row) value = init(generator);
  W_hh.assign(hidden, std::vector<double>(hidden, 0.0));
  for (auto& row : W_hh) for (double& value : row) value = init(generator);
  W_hy.assign(hidden, 0.0);
  for (double& value : W_hy) value = init(generator);
  b_h.assign(hidden, 0.0);
  b_y = 0.0;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    for (std::size_t s = 0; s < sequences.size(); ++s) {
      const auto& sequence = sequences[s];
      const std::size_t T = sequence.size();

      // ---- forward, carrying the state -----------------------------------
      // Every state is kept: the backward pass needs all of them, which is
      // why memory grows with sequence length and why truncation exists.
      std::vector<std::vector<double>> states(T + 1, std::vector<double>(hidden, 0.0));
      for (std::size_t t = 0; t < T; ++t) {
        for (std::size_t h = 0; h < hidden; ++h) {
          double total = b_h[h];
          for (std::size_t j = 0; j < d; ++j) total += sequence[t][j] * W_xh[j][h];
          for (std::size_t k = 0; k < hidden; ++k) total += states[t][k] * W_hh[k][h];
          states[t + 1][h] = std::tanh(total);
        }
      }

      double prediction = b_y;
      for (std::size_t h = 0; h < hidden; ++h) prediction += states[T][h] * W_hy[h];

      // ---- backward through time -----------------------------------------
      const double error = 2.0 * (prediction - targets[s]);

      std::vector<std::vector<double>> grad_W_xh(d, std::vector<double>(hidden, 0.0));
      std::vector<std::vector<double>> grad_W_hh(hidden, std::vector<double>(hidden, 0.0));
      std::vector<double> grad_b_h(hidden, 0.0);
      std::vector<double> delta(hidden, 0.0);
      for (std::size_t h = 0; h < hidden; ++h) delta[h] = error * W_hy[h];

      for (std::size_t step = 0; step < T; ++step) {
        const std::size_t t = T - 1 - step;

        // Multiply by the activation derivative: 1 - tanh^2, at most 1 and
        // usually much less. That factor alone shrinks the signal each step.
        std::vector<double> gated(hidden, 0.0);
        for (std::size_t h = 0; h < hidden; ++h) {
          gated[h] = delta[h] * (1.0 - states[t + 1][h] * states[t + 1][h]);
        }

        for (std::size_t h = 0; h < hidden; ++h) {
          grad_b_h[h] += gated[h];
          for (std::size_t j = 0; j < d; ++j) grad_W_xh[j][h] += gated[h] * sequence[t][j];
          for (std::size_t k = 0; k < hidden; ++k) grad_W_hh[k][h] += gated[h] * states[t][k];
        }

        // THE PRODUCT. delta is multiplied by W_hh once per step, so after T
        // steps it has been multiplied by the same matrix T times - geometric
        // decay if its spectral radius is below one, geometric growth if
        // above. No learning rate fixes either.
        std::vector<double> next(hidden, 0.0);
        for (std::size_t k = 0; k < hidden; ++k) {
          double total = 0.0;
          for (std::size_t h = 0; h < hidden; ++h) total += gated[h] * W_hh[k][h];
          next[k] = total;
        }
        delta = next;
      }

      // ---- update ---------------------------------------------------------
      for (std::size_t h = 0; h < hidden; ++h) {
        W_hy[h] -= lr * error * states[T][h];
        b_h[h] -= lr * grad_b_h[h];
        for (std::size_t j = 0; j < d; ++j) W_xh[j][h] -= lr * grad_W_xh[j][h];
        for (std::size_t k = 0; k < hidden; ++k) W_hh[k][h] -= lr * grad_W_hh[k][h];
      }
      b_y -= lr * error;
    }
  }
}`,
        profile: 'O(T * hidden^2) per sequence, one sequence at a time, with fresh state and gradient vectors allocated per sequence and no clipping.',
      },
      'make-it-right': {
        code: `// An RNN - flat state buffers, orthogonal init, global clipping, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// Weights shared across every timestep - which is what makes the parameter
// count independent of sequence length, and the gradient a repeated product
// of the same matrix.
class RecurrentLayer {
 public:
  RecurrentLayer(std::size_t input_size, std::size_t hidden, std::size_t batch,
                 std::size_t max_steps, unsigned seed)
      : input_size_(input_size),
        hidden_(hidden),
        w_xh_(input_size * hidden),
        w_hh_(hidden * hidden),
        bias_(hidden, 0.0),
        states_(batch * (max_steps + 1) * hidden, 0.0),
        scratch_(batch * hidden, 0.0) {
    if (input_size_ == 0 || hidden_ == 0) throw std::invalid_argument("zero-width layer");

    std::mt19937 generator(seed);
    std::normal_distribution<double> normal(0.0, 1.0);

    const double input_scale = std::sqrt(2.0 / static_cast<double>(input_size_));
    for (double& value : w_xh_) value = normal(generator) * input_scale;

    // Orthogonal initialization for the RECURRENT matrix specifically, via
    // Gram-Schmidt. Every singular value is one, so the repeated product
    // neither shrinks nor grows at initialization. That does not solve the
    // vanishing gradient - training moves the weights away from
    // orthogonality - but it delays both failures long enough for learning to
    // start, which random init frequently does not.
    for (double& value : w_hh_) value = normal(generator);
    Orthonormalize(w_hh_, hidden_);
  }

  // sequence is (batch, time, features), row-major. Returns nothing: states
  // are written into the owned buffer, because the backward pass needs all of
  // them and reallocating per call is the dominant cost otherwise.
  void Forward(std::span<const double> sequence, std::size_t batch, std::size_t steps,
               std::span<const std::size_t> lengths) {
    if (sequence.size() != batch * steps * input_size_) {
      throw std::invalid_argument("sequence shape does not match the layer");
    }

    std::fill(states_.begin(), states_.end(), 0.0);
    const std::size_t stride = (steps + 1) * hidden_;

    // The time loop cannot be vectorized - step t reads the state step t-1
    // produced. What CAN be batched is the batch dimension.
    for (std::size_t t = 0; t < steps; ++t) {
      for (std::size_t b = 0; b < batch; ++b) {
        // A sequence that has ended keeps its final state rather than
        // consuming padding, which would otherwise be learned as content.
        if (lengths[b] <= t) {
          std::copy_n(states_.data() + b * stride + t * hidden_, hidden_,
                      states_.data() + b * stride + (t + 1) * hidden_);
          continue;
        }

        const double* input = sequence.data() + (b * steps + t) * input_size_;
        const double* previous = states_.data() + b * stride + t * hidden_;
        double* current = states_.data() + b * stride + (t + 1) * hidden_;

        for (std::size_t h = 0; h < hidden_; ++h) current[h] = bias_[h];
        for (std::size_t j = 0; j < input_size_; ++j) {
          const double value = input[j];
          const double* row = w_xh_.data() + j * hidden_;
          for (std::size_t h = 0; h < hidden_; ++h) current[h] += value * row[h];
        }
        for (std::size_t k = 0; k < hidden_; ++k) {
          const double value = previous[k];
          const double* row = w_hh_.data() + k * hidden_;
          for (std::size_t h = 0; h < hidden_; ++h) current[h] += value * row[h];
        }
        for (std::size_t h = 0; h < hidden_; ++h) current[h] = std::tanh(current[h]);
      }
    }
  }

  // Clip by the GLOBAL norm across every parameter, not per tensor.
  //
  // Exploding gradients are the tractable half of the problem and this is the
  // standard remedy. Clipping tensors independently would rescale them by
  // different factors and change the gradient DIRECTION; clipping the global
  // norm rescales everything by one factor and preserves it.
  static double ClipGlobalNorm(std::span<std::span<double>> gradients, double max_norm) {
    double total = 0.0;
    for (const std::span<double> tensor : gradients) {
      for (const double value : tensor) total += value * value;
    }
    total = std::sqrt(total);

    if (total > max_norm) {
      const double scale = max_norm / total;
      for (std::span<double> tensor : gradients) {
        for (double& value : tensor) value *= scale;
      }
    }
    return total;
  }

 private:
  static void Orthonormalize(std::vector<double>& matrix, std::size_t n) {
    for (std::size_t j = 0; j < n; ++j) {
      for (std::size_t k = 0; k < j; ++k) {
        double dot = 0.0;
        for (std::size_t i = 0; i < n; ++i) dot += matrix[i * n + j] * matrix[i * n + k];
        for (std::size_t i = 0; i < n; ++i) matrix[i * n + j] -= dot * matrix[i * n + k];
      }
      double norm = 0.0;
      for (std::size_t i = 0; i < n; ++i) norm += matrix[i * n + j] * matrix[i * n + j];
      norm = std::sqrt(norm);
      if (norm < 1e-12) throw std::runtime_error("degenerate recurrent initialization");
      for (std::size_t i = 0; i < n; ++i) matrix[i * n + j] /= norm;
    }
  }

  std::size_t input_size_;
  std::size_t hidden_;
  std::vector<double> w_xh_;    // row-major (input, hidden), owned
  std::vector<double> w_hh_;    // row-major (hidden, hidden), owned
  std::vector<double> bias_;
  std::vector<double> states_;  // (batch, steps + 1, hidden), reused
  std::vector<double> scratch_;
};`,
        rationale:
          'Three changes, and the flat storage is the least important. The recurrent matrix is orthonormalized at initialization, which puts every singular value at one so the repeated product neither shrinks nor grows at the start — not a solution, since training moves the weights away from orthogonality, but enough delay for learning to begin where random initialization often prevents it. Global-norm gradient clipping is added, deliberately global rather than per tensor, because clipping tensors independently rescales them by different factors and changes the update direction. And padded steps now carry the previous state forward rather than consuming padding, which the naive version would otherwise learn as content.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(T * (h^2 + h*d)) per sequence over contiguous buffers, with state storage allocated once for the object.',
      },
      'make-it-fast': {
        code: `// An RNN - input projection lifted out of the time loop, batched GEMM.
#include <Eigen/Dense>
#include <stdexcept>
#include <vector>

// Row-major: a batch element is one contiguous run, which suits the GEMM
// panels and the per-step state update.
using RowMajorMatrix =
    Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// The time loop is irreducibly sequential: step t reads the state step t-1
// produced. No rewrite parallelizes over time - that limitation IS the
// architecture, and it is why attention displaced it despite worse
// asymptotics.
//
// What CAN be lifted out is the input projection. x_t * W_xh does not depend
// on any state, so all T of them are ONE large GEMM computed before the loop
// starts, leaving only the recurrent product inside it. That roughly halves
// the hot-loop work and is why a production RNN kernel looks nothing like the
// textbook formulation.
class FusedRnn {
 public:
  FusedRnn(int input_size, int hidden, int batch, int max_steps)
      : hidden_(hidden),
        w_xh_(RowMajorMatrix::Random(input_size, hidden)),
        w_hh_(RowMajorMatrix::Random(hidden, hidden)),
        bias_(Eigen::RowVectorXf::Zero(hidden)),
        projected_(batch * max_steps, hidden),
        state_(batch, hidden),
        scratch_(batch, hidden) {
    if (input_size < 1 || hidden < 1) throw std::invalid_argument("zero-width layer");
  }

  // sequence is (batch * steps, input_size) row-major - already flattened, so
  // the projection is a single product rather than one per timestep.
  const RowMajorMatrix& Forward(const RowMajorMatrix& sequence, int batch, int steps) {
    // ALL input projections in one GEMM, before the loop. The textbook
    // formulation repeats this product T times for no reason.
    projected_.topRows(batch * steps).noalias() = sequence * w_xh_;
    projected_.topRows(batch * steps).rowwise() += bias_;

    state_.topRows(batch).setZero();

    for (int t = 0; t < steps; ++t) {
      // Only the recurrent term remains inside the loop.
      scratch_.topRows(batch).noalias() = state_.topRows(batch) * w_hh_;

      // The projected block for this timestep, gathered as a strided view
      // rather than copied - Eigen's Map keeps it a view into the buffer.
      for (int b = 0; b < batch; ++b) {
        scratch_.row(b) += projected_.row(b * steps + t);
      }

      // tanh as a fused array expression: no intermediate materialized.
      state_.topRows(batch) = scratch_.topRows(batch).array().tanh();
    }

    return state_;
  }

 private:
  int hidden_;
  RowMajorMatrix w_xh_;
  RowMajorMatrix w_hh_;
  Eigen::RowVectorXf bias_;
  RowMajorMatrix projected_;   // allocated once for the whole run
  RowMajorMatrix state_;
  RowMajorMatrix scratch_;
};`,
        rationale:
          'The time loop cannot be parallelized, because step t reads the state step t−1 produced — that limitation is the architecture rather than the implementation, and it is why attention displaced it despite worse asymptotics. What can be lifted out is the input projection: it depends on no state, so all T of them become one large GEMM before the loop and only the recurrent product remains inside it, roughly halving the hot-loop work. Around that, every buffer is allocated once at construction, the activation is a fused array expression, and precision drops to float because the recurrent product is memory-bound and a bounded tanh output does not need double.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The lifted input projection is one large GEMM over the whole flattened sequence, and the per-step recurrent product is a batched GEMM — the entire arithmetic of the layer.',
            tradeoff: 'The per-step product is small — batch by hidden — so it sits near the size threshold where dispatch overhead competes with the work, which is why RNN kernels on GPUs fuse across timesteps rather than calling BLAS per step.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'noalias() writes each product straight into its destination and the tanh is a fused array expression, so neither the projection nor the activation allocates an intermediate per step.',
            tradeoff: 'noalias() is an unchecked assertion, and the recurrent update genuinely does read and write state buffers in the same expression chain — getting one wrong here is a silently corrupted state rather than a crash.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A batch element is one contiguous run, which suits both the GEMM panels and the per-step row updates that gather the projected block.',
            tradeoff: 'Eigen defaults to column-major, so the layout must be carried through every type — and the projected buffer is indexed by (batch, step), which makes the per-step gather strided in exactly the dimension the loop walks.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(T * h^2) in the loop after the projection is lifted out, versus O(T * (h^2 + h*d)). Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A vanilla RNN - forward through time and BPTT, transcribed.

/// A tiny linear congruential generator, so the sample has no dependencies.
pub struct Lcg(u64);

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn small(&mut self) -> f64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 11) as f64 / (1_u64 << 53) as f64 * 0.2 - 0.1
    }
}

/// The forward pass carries a state; the backward pass walks the same chain in
/// reverse, multiplying by the recurrent Jacobian once per step. That repeated
/// multiplication is the entire vanishing-gradient problem.
pub fn fit(
    sequences: &[Vec<Vec<f64>>],
    targets: &[f64],
    hidden: usize,
    lr: f64,
    epochs: usize,
    seed: u64,
) -> (Vec<Vec<f64>>, Vec<Vec<f64>>, Vec<f64>, Vec<f64>, f64) {
    let d = sequences[0][0].len();
    let mut rng = Lcg::new(seed);

    let mut w_xh: Vec<Vec<f64>> = (0..d).map(|_| (0..hidden).map(|_| rng.small()).collect()).collect();
    let mut w_hh: Vec<Vec<f64>> =
        (0..hidden).map(|_| (0..hidden).map(|_| rng.small()).collect()).collect();
    let mut w_hy: Vec<f64> = (0..hidden).map(|_| rng.small()).collect();
    let mut b_h = vec![0.0; hidden];
    let mut b_y = 0.0;

    for _ in 0..epochs {
        for (sequence, &target) in sequences.iter().zip(targets) {
            let t_len = sequence.len();

            // ---- forward, carrying the state -------------------------
            // Every state is kept: the backward pass needs all of them,
            // which is why memory grows with sequence length and why
            // truncation exists.
            let mut states = vec![vec![0.0; hidden]; t_len + 1];
            for t in 0..t_len {
                for h in 0..hidden {
                    let mut total = b_h[h];
                    for j in 0..d {
                        total += sequence[t][j] * w_xh[j][h];
                    }
                    for k in 0..hidden {
                        total += states[t][k] * w_hh[k][h];
                    }
                    states[t + 1][h] = total.tanh();
                }
            }

            let mut prediction = b_y;
            for h in 0..hidden {
                prediction += states[t_len][h] * w_hy[h];
            }

            // ---- backward through time --------------------------------
            let error = 2.0 * (prediction - target);

            let mut grad_w_xh = vec![vec![0.0; hidden]; d];
            let mut grad_w_hh = vec![vec![0.0; hidden]; hidden];
            let mut grad_b_h = vec![0.0; hidden];
            let mut delta: Vec<f64> = (0..hidden).map(|h| error * w_hy[h]).collect();

            for step in 0..t_len {
                let t = t_len - 1 - step;

                // Multiply by the activation derivative: 1 - tanh^2, at most
                // 1 and usually much less. That factor alone shrinks the
                // signal at every step.
                let gated: Vec<f64> = (0..hidden)
                    .map(|h| delta[h] * (1.0 - states[t + 1][h] * states[t + 1][h]))
                    .collect();

                for h in 0..hidden {
                    grad_b_h[h] += gated[h];
                    for j in 0..d {
                        grad_w_xh[j][h] += gated[h] * sequence[t][j];
                    }
                    for k in 0..hidden {
                        grad_w_hh[k][h] += gated[h] * states[t][k];
                    }
                }

                // THE PRODUCT. delta is multiplied by w_hh once per step, so
                // after T steps it has been multiplied by the same matrix T
                // times - geometric decay if its spectral radius is below
                // one, geometric growth if above. No learning rate fixes
                // either.
                delta = (0..hidden)
                    .map(|k| (0..hidden).map(|h| gated[h] * w_hh[k][h]).sum())
                    .collect();
            }

            // ---- update -----------------------------------------------
            for h in 0..hidden {
                w_hy[h] -= lr * error * states[t_len][h];
                b_h[h] -= lr * grad_b_h[h];
                for j in 0..d {
                    w_xh[j][h] -= lr * grad_w_xh[j][h];
                }
                for k in 0..hidden {
                    w_hh[k][h] -= lr * grad_w_hh[k][h];
                }
            }
            b_y -= lr * error;
        }
    }

    (w_xh, w_hh, w_hy, b_h, b_y)
}`,
        profile: 'O(T * hidden^2) per sequence with every index bounds-checked, fresh state and gradient Vecs per sequence, and no clipping.',
      },
      'make-it-right': {
        code: `//! An RNN - typed errors, orthogonal init, global clipping, masked padding.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum RnnError {
    ZeroWidth,
    ShapeMismatch { expected: usize, found: usize },
    LengthExceedsSequence { length: usize, steps: usize },
    DegenerateInit,
}

impl fmt::Display for RnnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroWidth => write!(f, "layer has zero input or hidden width"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::LengthExceedsSequence { length, steps } => {
                write!(f, "declared length {length} exceeds the {steps} available steps")
            }
            Self::DegenerateInit => {
                write!(f, "recurrent initialization is degenerate; columns are collinear")
            }
        }
    }
}

impl std::error::Error for RnnError {}

/// Gradient-clipping threshold. A newtype because the clip norm and the
/// learning rate are both bare f64 in every training signature and live on
/// completely different scales - a transposition trains to NaN immediately.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClipNorm(f64);

impl ClipNorm {
    pub fn new(value: f64) -> Option<Self> {
        (value.is_finite() && value > 0.0).then_some(Self(value))
    }
}

/// Weights shared across every timestep - which is what makes the parameter
/// count independent of sequence length, and the gradient a repeated product
/// of the same matrix.
pub struct RecurrentLayer {
    w_xh: Vec<f64>,     // row-major (input, hidden)
    w_hh: Vec<f64>,     // row-major (hidden, hidden)
    bias: Vec<f64>,
    /// States for the whole batch, allocated once: the backward pass needs
    /// all of them, and reallocating per call is otherwise the dominant cost.
    states: Vec<f64>,
    input_size: usize,
    hidden: usize,
}

impl RecurrentLayer {
    pub fn new(
        input_size: usize,
        hidden: usize,
        batch: usize,
        max_steps: usize,
        seed: u64,
    ) -> Result<Self, RnnError> {
        if input_size == 0 || hidden == 0 {
            return Err(RnnError::ZeroWidth);
        }

        let mut rng = Lcg::new(seed);
        let input_scale = (2.0 / input_size as f64).sqrt();

        let mut w_xh = Vec::with_capacity(input_size * hidden);
        w_xh.extend((0..input_size * hidden).map(|_| rng.normal() * input_scale));

        // Orthogonal initialization for the RECURRENT matrix specifically.
        //
        // Every singular value is one, so the repeated product neither
        // shrinks nor grows at initialization. That does not SOLVE the
        // vanishing gradient - training moves the weights away from
        // orthogonality - but it delays both failures long enough for
        // learning to start, which random init frequently does not.
        let mut w_hh: Vec<f64> = (0..hidden * hidden).map(|_| rng.normal()).collect();
        orthonormalize(&mut w_hh, hidden)?;

        Ok(Self {
            w_xh,
            w_hh,
            bias: vec![0.0; hidden],
            states: vec![0.0; batch * (max_steps + 1) * hidden],
            input_size,
            hidden,
        })
    }

    /// sequence is (batch, time, features), row-major. \`lengths\` gives each
    /// member's true length so padding contributes nothing.
    pub fn forward(
        &mut self,
        sequence: &[f64],
        batch: usize,
        steps: usize,
        lengths: &[usize],
    ) -> Result<(), RnnError> {
        if sequence.len() != batch * steps * self.input_size {
            return Err(RnnError::ShapeMismatch {
                expected: batch * steps * self.input_size,
                found: sequence.len(),
            });
        }
        if let Some(&length) = lengths.iter().find(|&&l| l > steps) {
            return Err(RnnError::LengthExceedsSequence { length, steps });
        }

        self.states.iter_mut().for_each(|value| *value = 0.0);
        let stride = (steps + 1) * self.hidden;

        // The time loop cannot be vectorized - step t reads the state step
        // t-1 produced. What CAN be batched is the batch dimension.
        for t in 0..steps {
            for b in 0..batch {
                let base = b * stride;

                // A sequence that has ended keeps its final state rather than
                // consuming padding, which would be learned as content.
                if lengths[b] <= t {
                    let (previous, current) =
                        self.states.split_at_mut(base + (t + 1) * self.hidden);
                    current[..self.hidden].copy_from_slice(
                        &previous[base + t * self.hidden..base + (t + 1) * self.hidden],
                    );
                    continue;
                }

                let input = &sequence[(b * steps + t) * self.input_size
                    ..(b * steps + t + 1) * self.input_size];

                let mut next = self.bias.clone();
                for (j, &value) in input.iter().enumerate() {
                    let row = &self.w_xh[j * self.hidden..(j + 1) * self.hidden];
                    for (slot, weight) in next.iter_mut().zip(row) {
                        *slot += value * weight;
                    }
                }
                for k in 0..self.hidden {
                    let value = self.states[base + t * self.hidden + k];
                    let row = &self.w_hh[k * self.hidden..(k + 1) * self.hidden];
                    for (slot, weight) in next.iter_mut().zip(row) {
                        *slot += value * weight;
                    }
                }

                let target =
                    &mut self.states[base + (t + 1) * self.hidden..base + (t + 2) * self.hidden];
                for (slot, value) in target.iter_mut().zip(&next) {
                    *slot = value.tanh();
                }
            }
        }

        Ok(())
    }
}

/// Clip by the GLOBAL norm across every parameter, not per tensor.
///
/// Exploding gradients are the tractable half of the problem and this is the
/// standard remedy. Clipping tensors independently would rescale them by
/// different factors and change the gradient DIRECTION; clipping the global
/// norm rescales everything by one factor and preserves it.
pub fn clip_global_norm(gradients: &mut [&mut [f64]], max_norm: ClipNorm) -> f64 {
    let total: f64 = gradients
        .iter()
        .flat_map(|tensor| tensor.iter())
        .map(|value| value * value)
        .sum::<f64>()
        .sqrt();

    if total > max_norm.0 {
        let scale = max_norm.0 / total;
        for tensor in gradients.iter_mut() {
            tensor.iter_mut().for_each(|value| *value *= scale);
        }
    }

    total
}

fn orthonormalize(matrix: &mut [f64], n: usize) -> Result<(), RnnError> {
    for j in 0..n {
        for k in 0..j {
            let dot: f64 = (0..n).map(|i| matrix[i * n + j] * matrix[i * n + k]).sum();
            for i in 0..n {
                matrix[i * n + j] -= dot * matrix[i * n + k];
            }
        }
        let norm: f64 = (0..n).map(|i| matrix[i * n + j] * matrix[i * n + j]).sum::<f64>().sqrt();
        if norm < 1e-12 {
            return Err(RnnError::DegenerateInit);
        }
        for i in 0..n {
            matrix[i * n + j] /= norm;
        }
    }
    Ok(())
}

pub struct Lcg(u64);

impl Lcg {
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.0
    }
    fn normal(&mut self) -> f64 {
        let u1 = ((self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64).max(1e-12);
        let u2 = (self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64;
        (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }
}
`,
        rationale:
          'Three changes beyond the flat storage. The recurrent matrix is orthonormalized at initialization, putting every singular value at one so the repeated product neither shrinks nor grows at the start — a delay rather than a fix, since training moves the weights away from orthogonality, but enough for learning to begin where random init often prevents it. Global-norm clipping is added, deliberately global because clipping tensors independently rescales them differently and changes the update direction, and the clip norm gets a newtype since it and the learning rate are both bare f64 on completely different scales. And padded steps carry the previous state forward rather than consuming padding, which the naive version would learn as content.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(T * (h^2 + h*d)) per sequence over flat contiguous buffers, with state storage allocated once.',
      },
      'make-it-fast': {
        code: `//! An RNN - input projection lifted out, sequences batched across cores.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// The time loop is irreducibly sequential: step t reads the state step t-1
/// produced. No rewrite parallelizes over time - that limitation IS the
/// architecture, and it is why attention displaced it despite worse
/// asymptotics.
///
/// Two things are available instead. The input projection does not depend on
/// any state, so all T of them are ONE matrix product computed before the
/// loop, leaving only the recurrent term inside it - which roughly halves the
/// hot-loop work. And independent SEQUENCES can be processed in parallel even
/// though timesteps within one cannot.
pub struct FusedRnn {
    w_xh: Array2<f32>,
    w_hh: Array2<f32>,
    bias: Array2<f32>,
    hidden: usize,
}

impl FusedRnn {
    #[must_use]
    pub fn new(w_xh: Array2<f32>, w_hh: Array2<f32>, bias: Array2<f32>) -> Self {
        let hidden = w_hh.nrows();
        Self { w_xh, w_hh, bias, hidden }
    }

    /// One sequence: (steps, features) in, (steps, hidden) out.
    ///
    /// The projection for every timestep is computed up front as a single
    /// BLAS product; the loop then does one matrix-vector product per step.
    #[must_use]
    pub fn forward_one(&self, sequence: ArrayView2<f32>, length: usize) -> Array2<f32> {
        let steps = sequence.nrows();

        // ALL input projections in one GEMM, before the loop. The textbook
        // formulation repeats this product T times for no reason.
        let mut projected = sequence.dot(&self.w_xh);
        projected += &self.bias;

        let mut states = Array2::<f32>::zeros((steps + 1, self.hidden));

        for t in 0..steps {
            if t >= length {
                // A finished sequence keeps its final state rather than
                // consuming padding, which would be learned as content.
                let previous = states.row(t).to_owned();
                states.row_mut(t + 1).assign(&previous);
                continue;
            }

            // Only the recurrent term remains inside the loop.
            let recurrent = states.row(t).dot(&self.w_hh);
            let mut next = projected.row(t).to_owned();
            next += &recurrent;
            next.mapv_inplace(f32::tanh);
            states.row_mut(t + 1).assign(&next);
        }

        states.slice(s![1.., ..]).to_owned()
    }

    /// A batch of independent sequences. Timesteps within one are sequential;
    /// sequences are not, so the batch is a parallel map.
    #[must_use]
    pub fn forward_batch(
        &self,
        sequences: &[Array2<f32>],
        lengths: &[usize],
    ) -> Vec<Array2<f32>> {
        let mut out = Vec::with_capacity(sequences.len());
        sequences
            .par_iter()
            .zip(lengths.par_iter())
            .map(|(sequence, &length)| self.forward_one(sequence.view(), length))
            .collect_into_vec(&mut out);
        out
    }

    /// Global gradient-norm clipping across every parameter tensor.
    ///
    /// Exploding gradients are the tractable half of the problem. Clipping
    /// tensors independently would rescale them by different factors and
    /// change the gradient DIRECTION; the global norm preserves it.
    pub fn clip_global_norm(gradients: &mut [Array2<f32>], max_norm: f32) -> f32 {
        let total: f32 = gradients
            .par_iter()
            .map(|g| g.iter().map(|v| v * v).sum::<f32>())
            .sum::<f32>()
            .sqrt();

        if total > max_norm {
            let scale = max_norm / total;
            gradients
                .par_iter_mut()
                .for_each(|g| g.mapv_inplace(|value| value * scale));
        }

        total
    }
}
`,
        rationale:
          'Two things are available and the doc comment says which is not: the time loop cannot be parallelized, because step t reads the state step t−1 produced, and that limitation is the architecture rather than the implementation. What can be done is lifting the input projection out — it depends on no state, so all T of them become one BLAS product before the loop, roughly halving the hot-loop work — and processing independent sequences in parallel, since timesteps within one are sequential while sequences are not. Gradient clipping is global across tensors for the usual reason, and the norm reduction itself is a parallel map.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The lifted projection is one GEMM over the whole sequence and each step’s recurrent term is a matrix-vector product, both dispatched to BLAS rather than hand-written loops.',
            tradeoff: 'Binds the build to a system BLAS, and the per-step product is small enough that dispatch overhead competes with the work — which is why GPU RNN kernels fuse across timesteps instead of calling BLAS per step.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Sequences are fully independent of one another, so a batch is a parallel map — and the gradient-norm reduction across tensors is an associative sum.',
            tradeoff: 'There is no parallelism inside a sequence, so a batch of one long sequence gets nothing; and sequences vary in length, so a naive partition leaves workers idle at the end.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The output vector is sized to the batch before collect_into_vec fills it, so the results are never grown and moved.',
            tradeoff: 'Each sequence still allocates its own state and projection arrays; eliminating those would need a per-worker arena, which is more machinery than a per-sequence allocation costs.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'O(T * h^2) per sequence after the projection is lifted, with sequences across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
