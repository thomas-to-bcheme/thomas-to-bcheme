import type { AiMlModel } from '../../types';

/**
 * Gated Recurrent Unit — the LSTM's simplification, and the clearest statement
 * of what gating actually buys.
 *
 * Sits after lstm in the sequence group as the specialization that asks
 * whether all three gates were necessary. Two turn out to be enough, and the
 * separate cell state turns out to be optional — which makes the GRU the
 * cleanest place to see the one idea both share: an additive path through
 * time that the gradient can travel without being multiplied.
 */
export const GRU: AiMlModel = {
  slug: 'gru',
  name: 'Gated Recurrent Unit',
  aliases: ['GRU', 'Cho gate', 'Gated RNN', 'Minimal gated unit (variant)'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'model',

  paradigms: ['supervised', 'self-supervised'],
  // 'anomaly-detection' via one-step prediction error over a sequence — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['sequence-modeling', 'regression', 'classification', 'anomaly-detection'],
  architecture: 'lstm-gru',
  paradigmNote:
    'The same two framings as any recurrent model: supervised when the targets come from outside, self-supervised when the target is the sequence’s own next element. The gating changes what can be learned, not how it is trained.',

  intuition:
    'A plain RNN overwrites its state at every step, which is why a signal from far back is gone by the time it would be useful. The fix is to let the network decide, per step and per dimension, how much to overwrite and how much to keep. That is the update gate: a number between zero and one that interpolates between the old state and a freshly computed candidate. Set it near zero and the state passes through untouched — and crucially, the gradient passes through with it, because carrying a value forward is addition rather than multiplication. The reset gate does the complementary job: it decides how much of the old state the candidate is even allowed to look at, which lets the unit forget deliberately rather than by decay.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\sum_{t=1}^{T} \\mathcal{L}_t(\\hat{y}_t, y_t), \\qquad \\mathbf{h}_t = (1 - \\mathbf{z}_t) \\odot \\mathbf{h}_{t-1} + \\mathbf{z}_t \\odot \\tilde{\\mathbf{h}}_t',
      symbols: [
        { symbol: '\\mathbf{z}_t', meaning: 'the update gate — how much of the state to replace, decided per dimension at every step' },
        { symbol: '\\tilde{\\mathbf{h}}_t', meaning: 'the candidate state: what the unit would compute if it overwrote everything' },
        { symbol: '(1 - \\mathbf{z}_t) \\odot \\mathbf{h}_{t-1}', meaning: 'the carried path — an addition, not a multiplication by a weight matrix, which is the whole point' },
        { symbol: '\\odot', meaning: 'elementwise, so different dimensions of the state can be held or replaced independently' },
      ],
    },
    reading:
      'The new state is a convex blend of the old one and a candidate, mixed per dimension by a learned gate. Read the carried term carefully, because it is the entire contribution of gating: when the gate is near zero the state is copied forward, and the derivative of a copy is one. The gradient therefore has a route back through time that does not involve repeated multiplication by a recurrent weight matrix — which is exactly the product that decays geometrically in a plain RNN. Gating does not make the vanishing gradient smaller; it provides a path that avoids the multiplication entirely, and that distinction is worth holding onto because the same trick reappears as the residual connection.',
  },

  optimization: {
    method: 'Backpropagation through time with gradient clipping, as for any recurrent model — the architecture rather than the optimizer is what changes',
    updateRule: {
      formula:
        '\\mathbf{z}_t = \\sigma\\!\\left(W_z\\mathbf{x}_t + U_z\\mathbf{h}_{t-1}\\right), \\quad \\mathbf{r}_t = \\sigma\\!\\left(W_r\\mathbf{x}_t + U_r\\mathbf{h}_{t-1}\\right), \\quad \\tilde{\\mathbf{h}}_t = \\tanh\\!\\left(W\\mathbf{x}_t + U\\!\\left(\\mathbf{r}_t \\odot \\mathbf{h}_{t-1}\\right)\\right)',
      symbols: [
        { symbol: '\\mathbf{r}_t', meaning: 'the reset gate — how much of the previous state the candidate may see, which is deliberate forgetting rather than decay' },
        { symbol: '\\sigma', meaning: 'sigmoid, so both gates are in (0, 1) and act as soft switches rather than as scalings' },
        { symbol: '\\mathbf{r}_t \\odot \\mathbf{h}_{t-1}', meaning: 'the reset applied before the candidate is computed, which is what distinguishes the GRU from a bare interpolation' },
        { symbol: '\\text{two gates}', meaning: 'against the LSTM’s three, with no separate cell state — the simplification the architecture is named for' },
      ],
    },
    rationale:
      'Training is ordinary backpropagation through time; nothing about the optimizer changes. What changes is the graph the gradient travels through. In a plain RNN every step multiplies the backward signal by the recurrent Jacobian, so the total is a product of T matrices and decays or explodes geometrically. Here the carried term contributes a factor of (1 − z), which the network can drive toward one — and a path of ones is a path the gradient survives. The practical consequences are worth stating. Gradient clipping is still required, because the gated paths can still explode. The gates are initialized so that they start near "carry", usually by biasing the update gate, which gives the model a long memory before it has learned anything. And the GRU has roughly three quarters of the LSTM’s parameters for the same hidden size, which on small datasets is a real advantage rather than a footnote.',
    hyperparameters: [
      { name: 'hidden size', role: 'Capacity of the memory, and with two gate matrices per unit the parameter count grows as three times the square of it', typicalRange: '128 to 1024' },
      { name: 'layers', role: 'Stacked GRUs deepen the representation at each step. Beyond two or three the returns fall off sharply and the training cost does not' },
      { name: 'gate bias initialization', role: 'Biasing the update gate toward carrying gives long memory from the first step, which is the recurrent analogue of a good initialization elsewhere' },
      { name: 'gradient clipping', role: 'Still required. Gating removes the vanishing half of the problem and not the exploding half', typicalRange: 'global norm 1.0 to 5.0' },
      { name: 'dropout placement', role: 'Between layers and on the input, not on the recurrent connection — dropping the recurrent path destroys the memory the gating exists to preserve' },
      { name: 'bidirectionality', role: 'Two passes, forward and backward, concatenated. Doubles cost and is only available when the whole sequence is known in advance' },
    ],
    convergence:
      'Trains reliably where a plain RNN does not, and the failure modes shift rather than disappear. Exploding gradients remain and clipping remains mandatory. The saturation failure is the specific one to watch: a gate driven hard toward zero or one has a near-zero sigmoid derivative, so it stops receiving gradient and freezes — a unit stuck permanently open or closed contributes nothing further, which resembles a dead ReLU and is diagnosed the same way, by looking at the distribution of gate activations rather than at the loss. Long-range performance is much improved and is not unlimited: dependencies of a few hundred steps are learnable where a plain RNN manages a few dozen, and beyond that attention is a different answer rather than a better-tuned one. And the sequential dependency is untouched — gating fixes the gradient, not the parallelism.',
    complexity:
      'O(T · (3h^2 + 3h·d)) per sequence: three matrix products per step against a plain RNN’s one, so roughly three times the cost for the same hidden size — and about three quarters of an LSTM’s, which has four. Memory is O(T · h) for the stored states. The binding constraint is unchanged from the RNN and is not asymptotic: the recurrence is sequential in T, so timesteps cannot be computed in parallel and the hardware is underused relative to an attention model of the same size.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Read the series in order, carry a gated state, and decode a horizon from it — either one step at a time or as a vector of all horizons at once. Exogenous drivers concatenate onto the input at each step. As with any recurrent forecaster the model is trained globally across many series, because a per-series recurrent model has far more parameters than a single history can identify.',
        where: [
          'Global forecasting across thousands of related series, where cross-series learning pays for the model’s capacity',
          'Series with genuine long-range structure — annual seasonality at daily resolution — that a plain RNN cannot reach',
          'Variable-length and irregular histories, which a fixed-window model cannot accept without padding decisions',
          'A cheaper substitute for an LSTM when data is limited, since it has roughly three quarters of the parameters',
        ],
        why: 'The gating is what makes seasonal dependencies learnable at all, and that is the whole reason to prefer it over the plain recurrent form. Against an LSTM the honest position is that the two perform comparably on most sequence tasks, and the GRU is smaller and faster — which makes it the better default when data is limited and the worse choice only where the extra capacity demonstrably helps. Against exponential smoothing on a single ordinary business series it still loses, because a few hundred observations cannot identify any recurrent model, and that comparison is the one most often skipped.',
        featurization: [
          'Scale per series before training globally, or the network is dominated by whichever series has the largest values',
          'Difference or detrend: the model learns a fitted shape and extrapolates it unpredictably rather than continuing a trend',
          'Supply calendar features explicitly rather than expecting an annual cycle to be learned through hundreds of steps of gradient',
          'Bias the update gate toward carrying at initialization, which gives long memory before any training has happened',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing specifically. Compare against a plain RNN on the same setup — a large gap confirms the dependencies genuinely are long, which is information about the problem rather than the model.',
        pitfalls: [
          'Shuffled validation splits, which leak the future and invalidate every number reported',
          'Scaling statistics computed over the full series before splitting, the most common leak in neural forecasting',
          'Assuming the GRU needs an LSTM’s tuning — the gate structure differs and hyperparameters do not transfer directly',
          'Extrapolation: the network has no notion of trend and its behaviour outside the training range is arbitrary',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train to predict the next observation on clean data, then score by prediction error. The gating matters here specifically: the model can condition on structure hundreds of steps back, so it can flag a value that is unremarkable in isolation and wrong given a pattern that started much earlier — which a plain RNN cannot represent and a fixed window cannot see.',
        where: [
          'Multivariate telemetry where the anomaly is a broken long-range relationship between channels',
          'Log and event-sequence anomaly detection, where the surprising thing is the order over a long span',
          'Industrial processes with long structured cycles, where an in-cycle deviation is only visible against the whole cycle',
        ],
        why: 'It learns the dynamics of normal rather than the values of normal, and the gating extends how far back "normal" is allowed to reach. What it shares with every neural detector is the uncalibrated score — prediction error has no distributional meaning, so the threshold is a quantile of clean data rather than a probability. And it needs genuinely clean training data, because a contaminated fit learns the anomaly as a valid continuation and then scores it as expected.',
        featurization: [
          'Fit on a confirmed-clean window; contamination teaches the model that the anomaly is normal',
          'Standardize residuals per channel, since raw error is dominated by whichever channel has the largest scale',
          'Look at runs of errors rather than individual values to separate a point anomaly from a regime shift',
          'Keep sequences long enough that the gating has something to carry — a short window discards the advantage over a dense model',
        ],
        evaluation:
          'Precision@k against confirmed incidents with the threshold from clean-period error quantiles, holding out entire anomaly episodes. PR-AUC rather than ROC-AUC at the usual imbalance.',
        pitfalls: [
          'Contaminated training data, after which the model predicts the anomaly and the error is small',
          'Gate saturation leaving units frozen, so the effective memory is far shorter than the architecture allows',
          'A single global error threshold across channels of different scales and volatilities',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The GRU is the cleanest illustration of a general fix for a general problem. The failure is that a gradient travelling back through a deep or long computation graph is a product of Jacobians and decays geometrically. The fix is not to make the factors larger — it is to add a path through the graph on which the gradient is not multiplied at all. Here that path is the carried term, whose local derivative is one when the gate says carry.',
        where: [
          'The reference example of an additive gradient path, which is the same mechanism as a residual connection in a deep feedforward stack',
          'Gate bias initialization as a deliberate placement of the initial dynamics, analogous to orthogonal initialization in a plain RNN',
          'Diagnosing saturation by monitoring gate activation distributions rather than the loss, which is where the actual failure is visible',
        ],
        why: 'The transferable idea is the shape of the fix rather than the architecture: when a gradient dies in a product, add a route that avoids the product. That single observation explains gating, residual connections, highway networks and the skip connections in essentially every deep architecture since — and it is easiest to see here, where the product and the alternative path sit in the same two-term equation. The counterweight is that gating fixes only the vanishing half; the exploding half is untouched and clipping remains mandatory.',
        featurization: [
          'Bias the update gate toward carrying at initialization so the additive path is open before training begins',
          'Clip the global gradient norm rather than per tensor, since clipping tensors separately changes the update direction',
        ],
        evaluation:
          'Track gradient norm against unroll depth — with gating it should stay roughly flat where a plain RNN’s decays geometrically, and that comparison is a direct measurement of what the architecture bought.',
        pitfalls: [
          'Expecting gating to remove the need for clipping, when it addresses only the vanishing half of the problem',
          'Gate saturation freezing units, which quietly closes the additive path the architecture was chosen for',
          'Reading a training plateau as a learning-rate problem when the gates have saturated',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'adapted',
        how: 'Read tokens in order with a gated state, for language modelling, tagging, classification, or as the encoder and decoder of a sequence-to-sequence model. The gating is what made agreement and reference across a sentence learnable, which is precisely what the plain recurrent form could not do.',
        where: [
          'Sequence labelling and classification where the sequences are short and the deployment must stay small',
          'Streaming and on-device text processing, where O(1) per-token inference with fixed state is the binding constraint',
          'The encoder or decoder in pre-transformer sequence-to-sequence systems',
          'A strong small-data baseline, where a transformer has too many parameters for the corpus',
        ],
        why: 'It solved the specific problem that stopped plain RNNs on language — dependencies spanning more tokens than the gradient survived — and did so with fewer parameters than an LSTM. It has been superseded for accuracy, thoroughly, by attention. What survives is the inference profile: constant state and O(1) per token, against attention’s linear cost in the context so far, which is why gated recurrent and state-space formulations keep returning for long-context and streaming work.',
        featurization: [
          'Bucket sequences by length before batching, or padding dominates the compute on a mixed batch',
          'Mask padding in both the loss and the state update, or pad tokens are learned as content',
          'Use bidirectional layers where the whole sequence is available, since a label at position t benefits from what follows it',
        ],
        evaluation:
          'Perplexity for language modelling and task metrics for labelling, measured against dependency distance rather than only in aggregate — the improvement over a plain RNN is entirely in the long-distance bucket and an average hides it.',
        pitfalls: [
          'Expecting transformer-level accuracy, which the architecture does not reach on any sizeable corpus',
          'Padding without masking, which contaminates both the loss and the carried state',
          'Exposure bias at generation, where errors compound in a regime teacher-forced training never showed the model',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Roughly three times a plain RNN per step and about three quarters of an LSTM, all linear in sequence length and all sequential in it. The sequential dependency is what dominates: a GPU is badly underused relative to an attention model of comparable size, and no amount of batching fixes it.',
    inferenceProfile:
      'O(1) per token with a fixed-size state — three small matrix products and two sigmoids. Constant memory regardless of how much context has been seen, which is the property attention does not have and the reason gated recurrence persists in streaming settings.',
    retrainingCadence:
      'Periodic and full, warm-started from the previous weights. The hidden state is not persisted between deployments; it summarizes the current sequence, and a stale state is worse than none.',
    driftAndMonitoring: [
      'Monitor the distribution of gate activations: a mass piled at zero or one is saturation, and saturated units have stopped learning and stopped carrying',
      'Track performance against dependency distance rather than in aggregate, since the long-range bucket is where the architecture earns its cost and where degradation shows first',
      'Watch the hidden-state norm over long sequences; unbounded growth indicates the dynamics have gone unstable',
      'Compare teacher-forced and free-running metrics for generation — a widening gap is exposure bias rather than a modelling failure',
    ],
    productionGotchas: [
      'Hidden state must be reset between independent sequences; carrying it over leaks one into the next and produces subtly wrong output with nothing raised',
      'Gate and weight layouts differ between frameworks — the order in which the update, reset and candidate matrices are packed is a convention, and porting weights without matching it produces a model that runs and is wrong',
      'Padding must be masked in the state update as well as the loss, or the carried state absorbs pad tokens',
      'Gradient clipping is still required despite the gating, which addresses only the vanishing half of the problem',
      'Dropout must not be applied to the recurrent connection, since dropping the carried path destroys exactly the memory the gating exists to preserve',
    ],
  },

  assumptions: [
    'The sequence has temporal structure worth carrying — with independent steps the gating adds cost and nothing else',
    'Relevant dependencies span at most a few hundred steps; beyond that attention is a different answer rather than a better-tuned one',
    'A fixed-size hidden state can summarize what matters from the past, which is a hard bottleneck for information-dense sequences',
    'Steps are evenly spaced, or the irregularity is supplied as an explicit input feature',
    'Sequences are independent of one another, since the state must be reset between them',
  ],

  pros: [
    {
      point: 'Gating gives the gradient an additive path through time',
      context:
        'Which makes dependencies of hundreds of steps learnable where a plain RNN manages dozens. The mechanism — add a route that avoids the product — is the same one residual connections use, and this is the clearest place to see it.',
    },
    {
      point: 'Fewer parameters than an LSTM at comparable accuracy',
      context:
        'Two gates rather than three and no separate cell state, so about three quarters the parameters. A real advantage when data is limited, which is most of the time outside the largest datasets.',
    },
    {
      point: 'O(1) inference per token with constant state',
      context:
        'Where attention is linear in the context so far. This is the durable advantage of gated recurrence and the reason it persists in streaming and long-context settings after being superseded on accuracy.',
    },
    {
      point: 'Trains reliably where a plain RNN does not',
      context:
        'The vanishing gradient is genuinely addressed rather than mitigated, which turns an architecture that fails silently into one that works. Clipping is still required, so the improvement is real and partial.',
    },
  ],

  cons: [
    {
      point: 'Still sequential in time',
      context:
        'Gating fixes the gradient and not the parallelism, which is the reason attention displaced it. Modern hardware rewards parallel throughput far more than linear complexity, and that mismatch is structural.',
    },
    {
      point: 'Long-range memory is improved, not unlimited',
      context:
        'A few hundred steps rather than a few dozen. Beyond that the fixed-size state is a hard information bottleneck, and attention is a different mechanism rather than a longer-memory version of this one.',
    },
    {
      point: 'Gates can saturate and freeze',
      context:
        'A gate pushed hard to zero or one receives almost no gradient and stops changing, closing the additive path the architecture depends on. Diagnosed by watching gate activations, which nobody does by default.',
    },
    {
      point: 'Superseded on accuracy across most sequence tasks',
      context:
        'Transformers win on anything with enough data. The GRU keeps the small-data and streaming regimes, which is a narrower niche than its historical prominence suggests.',
    },
  ],

  relatedSlugs: ['lstm', 'rnn', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A GRU cell - the two gates and the blend, transcribed.

Every line maps to one term of the update rule. The last line is the one that
matters: the new state is a blend of the old one and a candidate, so when the
update gate says "carry", the state passes through by ADDITION rather than by
multiplication - and so does the gradient.
"""

import math
import random


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z)) if z >= 0 else math.exp(z) / (1.0 + math.exp(z))


def gru_step(x, h_prev, W_z, U_z, W_r, U_r, W_h, U_h, hidden, d):
    """One timestep. Three matrix products where a plain RNN has one."""
    z = [0.0] * hidden
    r = [0.0] * hidden
    candidate = [0.0] * hidden

    # update gate: how much of the state to REPLACE
    for j in range(hidden):
        total = 0.0
        for i in range(d):
            total += x[i] * W_z[i][j]
        for k in range(hidden):
            total += h_prev[k] * U_z[k][j]
        z[j] = sigmoid(total)

    # reset gate: how much of the old state the candidate may SEE
    for j in range(hidden):
        total = 0.0
        for i in range(d):
            total += x[i] * W_r[i][j]
        for k in range(hidden):
            total += h_prev[k] * U_r[k][j]
        r[j] = sigmoid(total)

    # candidate: what the unit would compute if it overwrote everything.
    # The reset is applied BEFORE the recurrent product, which is what
    # distinguishes a GRU from a bare interpolation.
    for j in range(hidden):
        total = 0.0
        for i in range(d):
            total += x[i] * W_h[i][j]
        for k in range(hidden):
            total += (r[k] * h_prev[k]) * U_h[k][j]
        candidate[j] = math.tanh(total)

    # THE BLEND. With z near zero the state is copied forward, and the
    # derivative of a copy is one - so the gradient has a route back through
    # time that never touches the recurrent weight matrix. That is the entire
    # contribution of gating, and it is this one line.
    h = [0.0] * hidden
    for j in range(hidden):
        h[j] = (1.0 - z[j]) * h_prev[j] + z[j] * candidate[j]

    return h, z, r, candidate


def forward(sequence, W_z, U_z, W_r, U_r, W_h, U_h, hidden):
    d = len(sequence[0])
    h = [0.0] * hidden
    states = [list(h)]

    for x in sequence:
        h, _, _, _ = gru_step(x, h, W_z, U_z, W_r, U_r, W_h, U_h, hidden, d)
        states.append(list(h))

    return states


def initialize(d, hidden, seed=0):
    rng = random.Random(seed)
    make = lambda rows: [[rng.gauss(0.0, 0.1) for _ in range(hidden)] for _ in range(rows)]
    return make(d), make(hidden), make(d), make(hidden), make(d), make(hidden)`,
        profile: 'O(T * (3h^2 + 3h*d)) per sequence in interpreter loops — three matrix products per step where a plain RNN has one.',
      },
      'make-it-right': {
        code: `"""A GRU - typed, batched, gates fused into one product, carry-biased."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


@dataclass
class GruCell:
    """The three input matrices are stored as ONE, and likewise the recurrent.

    z, r and the candidate all read the same x_t, so their three separate
    products against x are one product against a stacked matrix followed by a
    slice. That is not merely faster - it is how every framework stores GRU
    weights, which is why porting weights between frameworks requires knowing
    the packing order and produces a model that runs and is wrong when it does
    not match.
    """

    W: Matrix          # (input, 3 * hidden) - z, r, candidate stacked
    U: Matrix          # (hidden, 3 * hidden)
    bias: Vector       # (3 * hidden,)
    hidden: int

    @classmethod
    def initialized(cls, input_size: int, hidden: int, rng: np.random.Generator) -> "GruCell":
        scale = np.sqrt(1.0 / hidden)
        bias = np.zeros(3 * hidden, dtype=np.float64)

        # Bias the UPDATE gate toward carrying. With z starting near zero the
        # state passes through untouched, so the model has a long memory
        # before it has learned anything - the recurrent analogue of a good
        # initialization, and it materially changes what is learnable early.
        bias[:hidden] = -1.0

        return cls(
            W=rng.uniform(-scale, scale, size=(input_size, 3 * hidden)),
            U=rng.uniform(-scale, scale, size=(hidden, 3 * hidden)),
            bias=bias,
            hidden=hidden,
        )

    def step(self, x: Matrix, h_prev: Matrix) -> Matrix:
        """One timestep for a whole batch."""
        if x.shape[0] != h_prev.shape[0]:
            raise ValueError(f"batch mismatch: x has {x.shape[0]}, state has {h_prev.shape[0]}")

        h = self.hidden
        # Two products instead of six: the gates share their operands.
        from_input = x @ self.W + self.bias
        from_state = h_prev @ self.U

        # z and r read the full previous state, so their recurrent parts can
        # be taken from the same product.
        z = _sigmoid(from_input[:, :h] + from_state[:, :h])
        r = _sigmoid(from_input[:, h : 2 * h] + from_state[:, h : 2 * h])

        # The candidate's recurrent term is gated by r BEFORE the product,
        # which is why this slice cannot be reused from from_state and must
        # be recomputed. That asymmetry is the one place the fusion does not
        # apply, and it is a genuine detail of the architecture.
        candidate = np.tanh(from_input[:, 2 * h :] + (r * h_prev) @ self.U[:, 2 * h :])

        # THE BLEND: a copy when z is near zero, and the derivative of a copy
        # is one - which is the additive gradient path gating exists to
        # provide.
        return (1.0 - z) * h_prev + z * candidate


def _sigmoid(z: Matrix) -> Matrix:
    """Branch on sign to avoid overflow: exp of a large positive argument
    overflows, and the naive form silently produces inf then NaN."""
    positive = z >= 0
    out = np.empty_like(z)
    out[positive] = 1.0 / (1.0 + np.exp(-z[positive]))
    exponential = np.exp(z[~positive])
    out[~positive] = exponential / (1.0 + exponential)
    return out


def forward(cell: GruCell, sequence: Tensor, lengths: NDArray) -> Tensor:
    """sequence is (batch, time, features); lengths gives each member's true
    length so padding contributes nothing to the carried state."""
    if sequence.ndim != 3:
        raise ValueError(f"expected (batch, time, features), got {sequence.shape}")

    batch, steps, _ = sequence.shape
    states = np.zeros((batch, steps + 1, cell.hidden), dtype=np.float64)

    # The time loop cannot be vectorized - step t reads the state step t-1
    # produced. What is batched is the batch dimension.
    for t in range(steps):
        updated = cell.step(sequence[:, t], states[:, t])

        # A finished sequence keeps its state rather than consuming padding,
        # which would otherwise be carried forward as content.
        active = (lengths > t)[:, None]
        states[:, t + 1] = np.where(active, updated, states[:, t])

    return states[:, 1:]`,
        rationale:
          'The three gate computations are fused into one stacked matrix product per side, which is not merely faster — it is how every framework stores GRU weights, and knowing the packing order is what makes porting weights between frameworks work rather than producing a model that runs and is silently wrong. The candidate’s recurrent term is the one place the fusion does not apply, because the reset gate is applied before that product, and the code says so. Beyond that: the update-gate bias is initialized toward carrying, which opens the additive path before training begins; the sigmoid branches on sign to avoid the overflow the naive form produces; and padding is masked in the state update, not just the loss.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(T * 3h^2) per sequence with two fused products per step instead of six separate ones.',
      },
      'make-it-fast': {
        code: `"""A GRU - input projections lifted out, preallocated state, fused gates."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


class FusedGru:
    """The time loop is sequential; the input side is not.

    x_t @ W does not depend on any state, so all T of those projections are
    ONE matrix product computed before the loop starts. What remains inside
    the loop is the recurrent side, which genuinely cannot be hoisted because
    it reads the state the previous step produced.

    For a GRU that lift removes half the per-step work rather than a third,
    because the input side covers all three gates at once.
    """

    def __init__(self, input_size: int, hidden: int, batch: int, max_steps: int,
                 seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        scale = np.sqrt(1.0 / hidden)

        # Contiguous float32: the recurrent product is memory-bound, and the
        # gates are bounded sigmoids that do not need 52 bits of mantissa.
        self._W = np.ascontiguousarray(
            rng.uniform(-scale, scale, size=(input_size, 3 * hidden)), dtype=np.float32
        )
        self._U = np.ascontiguousarray(
            rng.uniform(-scale, scale, size=(hidden, 3 * hidden)), dtype=np.float32
        )
        self._bias = np.zeros(3 * hidden, dtype=np.float32)
        self._bias[:hidden] = -1.0      # update gate biased toward carrying

        self._hidden = hidden
        # Every buffer allocated once for the whole run.
        self._projected = np.zeros((batch, max_steps, 3 * hidden), dtype=np.float32)
        self._states = np.zeros((batch, max_steps + 1, hidden), dtype=np.float32)
        self._recurrent = np.zeros((batch, 3 * hidden), dtype=np.float32)
        self._gate = np.zeros((batch, hidden), dtype=np.float32)

    def forward(self, sequence: Tensor, lengths: NDArray) -> Tensor:
        batch, steps, _ = sequence.shape
        h = self._hidden

        states = self._states[:batch, : steps + 1]
        states.fill(0.0)

        # ALL input projections for ALL three gates, in one GEMM before the
        # loop. The textbook formulation repeats this product T times.
        projected = self._projected[:batch, :steps]
        np.matmul(sequence.reshape(-1, sequence.shape[2]), self._W,
                  out=projected.reshape(-1, 3 * h))
        projected += self._bias

        for t in range(steps):
            previous = states[:, t]
            recurrent = self._recurrent[:batch]

            # The z and r recurrent terms come from one product against the
            # full previous state.
            np.matmul(previous, self._U, out=recurrent)

            z = self._gate[:batch]
            np.add(projected[:, t, :h], recurrent[:, :h], out=z)
            _sigmoid_inplace(z)

            reset = recurrent[:, h : 2 * h]
            np.add(projected[:, t, h : 2 * h], reset, out=reset)
            _sigmoid_inplace(reset)

            # The candidate's recurrent term is gated by r BEFORE the product,
            # so this slice alone must be recomputed - the one place the
            # fusion does not reach.
            gated_state = reset * previous
            candidate = recurrent[:, 2 * h :]
            np.matmul(gated_state, self._U[:, 2 * h :], out=candidate)
            candidate += projected[:, t, 2 * h :]
            np.tanh(candidate, out=candidate)

            # h = (1 - z) * h_prev + z * candidate, built in place: three
            # full-size temporaries per step would otherwise be allocated.
            np.subtract(candidate, previous, out=candidate)
            np.multiply(candidate, z, out=candidate)
            np.add(previous, candidate, out=states[:, t + 1])

            finished = lengths <= t
            if finished.any():
                states[finished, t + 1] = states[finished, t]

        return states[:, 1 : steps + 1]


def _sigmoid_inplace(z: Matrix) -> None:
    """1 / (1 + exp(-z)) written through the same buffer, with the sign branch
    that stops exp from overflowing on a large positive argument."""
    np.negative(z, out=z)
    np.clip(z, -60.0, 60.0, out=z)
    np.exp(z, out=z)
    z += 1.0
    np.reciprocal(z, out=z)`,
        rationale:
          'The time loop cannot be parallelized — step t reads the state step t−1 produced — so the available work is everything outside it. The input projection covers all three gates at once and depends on no state, so all T of them become a single GEMM before the loop, which for a GRU removes half the per-step work rather than a third. What remains is genuinely recurrent, and the candidate’s term is called out as the one slice the fusion cannot reach because the reset is applied before its product. Everything else is allocation discipline: buffers allocated once, the blend and both sigmoids written through in place, and float32 because the recurrent product is memory-bound and a bounded gate does not need double.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'All three gates’ input projections collapse into one GEMM before the loop, and the final blend is built through a single buffer rather than three full-size temporaries per step.',
            tradeoff: 'Requires the whole sequence resident before the first step, which rules out the streaming forward pass that is the main reason to prefer a recurrent model in the first place.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'States, projections, the recurrent block and the gate scratch are allocated once for the run, removing several full-size allocations per timestep across thousands of steps.',
            tradeoff: 'Fixes batch size and sequence length at construction, and the buffers are shared mutable state — the object is not reentrant and the in-place chain is order-dependent.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Contiguous float32 halves the traffic on the state and weight arrays and lets each GEMM read them without an internal conversion.',
            tradeoff: 'float32 accumulates error over a long unroll, and the recurrent product is exactly where it compounds — some implementations keep the state in higher precision than the weights for this reason.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(T * 3h^2) in the loop after the input side is lifted out. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A GRU cell - the two gates and the blend, transcribed.
#include <cmath>
#include <cstddef>
#include <vector>

double Sigmoid(double z) {
  return z >= 0.0 ? 1.0 / (1.0 + std::exp(-z)) : std::exp(z) / (1.0 + std::exp(z));
}

// One timestep. Three matrix products where a plain RNN has one.
std::vector<double> GruStep(const std::vector<double>& x,
                            const std::vector<double>& h_prev,
                            const std::vector<std::vector<double>>& W_z,
                            const std::vector<std::vector<double>>& U_z,
                            const std::vector<std::vector<double>>& W_r,
                            const std::vector<std::vector<double>>& U_r,
                            const std::vector<std::vector<double>>& W_h,
                            const std::vector<std::vector<double>>& U_h) {
  const std::size_t hidden = h_prev.size();
  const std::size_t d = x.size();

  std::vector<double> z(hidden, 0.0);
  std::vector<double> r(hidden, 0.0);
  std::vector<double> candidate(hidden, 0.0);

  // update gate: how much of the state to REPLACE
  for (std::size_t j = 0; j < hidden; ++j) {
    double total = 0.0;
    for (std::size_t i = 0; i < d; ++i) total += x[i] * W_z[i][j];
    for (std::size_t k = 0; k < hidden; ++k) total += h_prev[k] * U_z[k][j];
    z[j] = Sigmoid(total);
  }

  // reset gate: how much of the old state the candidate may SEE
  for (std::size_t j = 0; j < hidden; ++j) {
    double total = 0.0;
    for (std::size_t i = 0; i < d; ++i) total += x[i] * W_r[i][j];
    for (std::size_t k = 0; k < hidden; ++k) total += h_prev[k] * U_r[k][j];
    r[j] = Sigmoid(total);
  }

  // candidate: what the unit would compute if it overwrote everything. The
  // reset is applied BEFORE the recurrent product, which is what
  // distinguishes a GRU from a bare interpolation.
  for (std::size_t j = 0; j < hidden; ++j) {
    double total = 0.0;
    for (std::size_t i = 0; i < d; ++i) total += x[i] * W_h[i][j];
    for (std::size_t k = 0; k < hidden; ++k) total += (r[k] * h_prev[k]) * U_h[k][j];
    candidate[j] = std::tanh(total);
  }

  // THE BLEND. With z near zero the state is copied forward, and the
  // derivative of a copy is one - so the gradient has a route back through
  // time that never touches the recurrent weight matrix. That is the entire
  // contribution of gating, and it is this one loop.
  std::vector<double> h(hidden, 0.0);
  for (std::size_t j = 0; j < hidden; ++j) {
    h[j] = (1.0 - z[j]) * h_prev[j] + z[j] * candidate[j];
  }

  return h;
}`,
        profile: 'O(T * (3h^2 + 3h*d)) per sequence, with three separate gate vectors allocated per timestep and six independent matrix walks.',
      },
      'make-it-right': {
        code: `// A GRU - fused gate matrices, flat storage, carry bias, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

// The three input matrices are stored as ONE, and likewise the recurrent.
//
// z, r and the candidate all read the same x_t, so their three separate
// products are one product against a stacked matrix followed by a slice. That
// is not merely faster - it is how every framework stores GRU weights, which
// is why porting weights between frameworks requires knowing the packing
// order and yields a model that runs and is silently wrong when it does not
// match.
class GruCell {
 public:
  GruCell(std::size_t input_size, std::size_t hidden, unsigned seed)
      : input_size_(input_size),
        hidden_(hidden),
        w_(input_size * 3 * hidden),
        u_(hidden * 3 * hidden),
        bias_(3 * hidden, 0.0),
        scratch_(3 * hidden, 0.0),
        gated_(hidden, 0.0) {
    if (input_size_ == 0 || hidden_ == 0) throw std::invalid_argument("zero-width cell");

    std::mt19937 generator(seed);
    const double scale = 1.0 / std::sqrt(static_cast<double>(hidden_));
    std::uniform_real_distribution<double> init(-scale, scale);

    for (double& value : w_) value = init(generator);
    for (double& value : u_) value = init(generator);

    // Bias the UPDATE gate toward carrying. With z starting near zero the
    // state passes through untouched, so the model has a long memory before
    // it has learned anything - the recurrent analogue of a good
    // initialization, and it changes what is learnable early.
    std::fill(bias_.begin(), bias_.begin() + static_cast<long>(hidden_), -1.0);
  }

  // One timestep, writing into the caller's state buffer.
  void Step(std::span<const double> x, std::span<const double> h_prev,
            std::span<double> h_next) {
    if (x.size() != input_size_ || h_prev.size() != hidden_) {
      throw std::invalid_argument("step operand widths do not match the cell");
    }

    // One product against the stacked input matrix, covering all three gates.
    std::copy(bias_.begin(), bias_.end(), scratch_.begin());
    for (std::size_t i = 0; i < input_size_; ++i) {
      const double value = x[i];
      const double* row = w_.data() + i * 3 * hidden_;
      for (std::size_t j = 0; j < 3 * hidden_; ++j) scratch_[j] += value * row[j];
    }

    // z and r read the full previous state, so their recurrent terms come
    // from one product.
    for (std::size_t k = 0; k < hidden_; ++k) {
      const double value = h_prev[k];
      const double* row = u_.data() + k * 3 * hidden_;
      for (std::size_t j = 0; j < 2 * hidden_; ++j) scratch_[j] += value * row[j];
    }

    for (std::size_t j = 0; j < 2 * hidden_; ++j) scratch_[j] = Sigmoid(scratch_[j]);

    // The candidate's recurrent term is gated by r BEFORE the product, which
    // is the one place the fusion does not reach.
    for (std::size_t k = 0; k < hidden_; ++k) gated_[k] = scratch_[hidden_ + k] * h_prev[k];
    for (std::size_t k = 0; k < hidden_; ++k) {
      const double value = gated_[k];
      const double* row = u_.data() + k * 3 * hidden_ + 2 * hidden_;
      for (std::size_t j = 0; j < hidden_; ++j) scratch_[2 * hidden_ + j] += value * row[j];
    }

    // THE BLEND: a copy when z is near zero, and the derivative of a copy is
    // one - the additive gradient path gating exists to provide.
    for (std::size_t j = 0; j < hidden_; ++j) {
      const double candidate = std::tanh(scratch_[2 * hidden_ + j]);
      const double z = scratch_[j];
      h_next[j] = (1.0 - z) * h_prev[j] + z * candidate;
    }
  }

 private:
  // Branch on sign: exp of a large positive argument overflows, and the naive
  // form silently produces inf and then NaN.
  [[nodiscard]] static double Sigmoid(double z) noexcept {
    if (z >= 0.0) return 1.0 / (1.0 + std::exp(-z));
    const double exponential = std::exp(z);
    return exponential / (1.0 + exponential);
  }

  std::size_t input_size_;
  std::size_t hidden_;
  std::vector<double> w_;         // row-major (input, 3 * hidden), owned
  std::vector<double> u_;         // row-major (hidden, 3 * hidden), owned
  std::vector<double> bias_;
  std::vector<double> scratch_;   // reused every step
  std::vector<double> gated_;
};`,
        rationale:
          'The three gate matrices are packed into one stacked buffer per side, which is not just faster but is how every framework stores GRU weights — so knowing the packing order is what makes weight porting work rather than producing a model that runs and is silently wrong. The candidate’s recurrent term is called out as the one slice the fusion cannot reach, since the reset is applied before that product. Scratch buffers are hoisted into the object rather than allocated per step, the update-gate bias is initialized toward carrying so the additive path is open before training, and the sigmoid branches on sign so a large positive argument cannot overflow to inf and then NaN.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(T * 3h^2) per sequence with two fused products per step and no per-step allocation.',
      },
      'make-it-fast': {
        code: `// A GRU - input projections lifted out of the time loop, Eigen GEMM.
#include <Eigen/Dense>
#include <stdexcept>

using RowMajorMatrix =
    Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// The time loop is irreducibly sequential: step t reads the state step t-1
// produced. That limitation IS the architecture - gating fixes the gradient,
// not the parallelism, which is why attention displaced it.
//
// What CAN be lifted is the input side. x_t * W covers all three gates and
// depends on no state, so all T of those projections are ONE large GEMM
// before the loop. For a GRU that removes roughly HALF the per-step work
// rather than a third, because the input side serves every gate at once.
class FusedGru {
 public:
  FusedGru(int input_size, int hidden, int batch, int max_steps)
      : hidden_(hidden),
        w_(RowMajorMatrix::Random(input_size, 3 * hidden) *
           (1.0F / std::sqrt(static_cast<float>(hidden)))),
        u_(RowMajorMatrix::Random(hidden, 3 * hidden) *
           (1.0F / std::sqrt(static_cast<float>(hidden)))),
        bias_(Eigen::RowVectorXf::Zero(3 * hidden)),
        projected_(batch * max_steps, 3 * hidden),
        state_(batch, hidden),
        recurrent_(batch, 3 * hidden),
        gated_(batch, hidden) {
    if (input_size < 1 || hidden < 1) throw std::invalid_argument("zero-width cell");
    // Update gate biased toward carrying: long memory before any training.
    bias_.head(hidden).setConstant(-1.0F);
  }

  // sequence is (batch * steps, input_size), already flattened so the
  // projection is one product rather than one per timestep.
  const RowMajorMatrix& Forward(const RowMajorMatrix& sequence, int batch, int steps) {
    const int h = hidden_;

    // ALL input projections for ALL three gates, in one GEMM before the loop.
    projected_.topRows(batch * steps).noalias() = sequence * w_;
    projected_.topRows(batch * steps).rowwise() += bias_;

    state_.topRows(batch).setZero();

    for (int t = 0; t < steps; ++t) {
      auto previous = state_.topRows(batch);

      // z and r recurrent terms from one product against the full state.
      recurrent_.topRows(batch).noalias() = previous * u_;

      // Gates: fused array expressions, no intermediate materialized.
      auto z = recurrent_.block(0, 0, batch, h);
      auto r = recurrent_.block(0, h, batch, h);
      for (int b = 0; b < batch; ++b) {
        z.row(b) += projected_.row(b * steps + t).segment(0, h);
        r.row(b) += projected_.row(b * steps + t).segment(h, h);
      }
      z = (1.0F / (1.0F + (-z.array()).exp())).matrix();
      r = (1.0F / (1.0F + (-r.array()).exp())).matrix();

      // The candidate's recurrent term is gated by r BEFORE the product -
      // the one place the fusion does not reach, so it needs its own GEMM.
      gated_.topRows(batch) = r.array() * previous.array();
      auto candidate = recurrent_.block(0, 2 * h, batch, h);
      candidate.noalias() = gated_.topRows(batch) * u_.rightCols(h);
      for (int b = 0; b < batch; ++b) {
        candidate.row(b) += projected_.row(b * steps + t).segment(2 * h, h);
      }
      candidate = candidate.array().tanh().matrix();

      // THE BLEND, as one fused expression.
      state_.topRows(batch) =
          ((1.0F - z.array()) * previous.array() + z.array() * candidate.array()).matrix();
    }

    return state_;
  }

 private:
  int hidden_;
  RowMajorMatrix w_;
  RowMajorMatrix u_;
  Eigen::RowVectorXf bias_;
  RowMajorMatrix projected_;   // allocated once for the whole run
  RowMajorMatrix state_;
  RowMajorMatrix recurrent_;
  RowMajorMatrix gated_;
};`,
        rationale:
          'The time loop cannot be parallelized, and the comment says why: gating fixes the gradient, not the parallelism, which is precisely why attention displaced the architecture. What can be lifted is the input side, and for a GRU that is worth more than for a plain RNN — the input projection covers all three gates at once, so hoisting it removes roughly half the per-step work rather than a third. What remains inside is the recurrent product plus one extra GEMM for the candidate, because the reset gate is applied before that product and the fusion cannot reach it. Everything is preallocated, the gates and the blend are fused array expressions, and precision is float since the recurrent product is memory-bound and the gates are bounded.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The lifted projection is one large GEMM over the flattened sequence, and both per-step recurrent products are batched GEMMs — the entire arithmetic of the cell.',
            tradeoff: 'The per-step products are batch-by-hidden and sit near the size threshold where dispatch overhead competes with the work, which is why GPU GRU kernels fuse across timesteps rather than calling BLAS per step.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'Both sigmoids, the tanh and the final blend evaluate as fused array expressions, and noalias() writes each product straight into its destination.',
            tradeoff: 'noalias() is an unchecked assertion and the blend genuinely reads and writes the state in the same statement — an aliasing mistake here is a silently corrupted state rather than a crash.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A batch element is one contiguous run, which suits the GEMM panels and the per-step row updates that gather from the projected buffer.',
            tradeoff: 'The projected buffer is indexed by (batch, step), so the per-step gather strides in exactly the dimension the loop walks — the alternative layout would fix that and break the projection GEMM.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(T * 3h^2) in the loop after the input side is lifted out. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A GRU cell - the two gates and the blend, transcribed.

fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        z.exp() / (1.0 + z.exp())
    }
}

/// One timestep. Three matrix products where a plain RNN has one.
#[allow(clippy::too_many_arguments)]
pub fn gru_step(
    x: &[f64],
    h_prev: &[f64],
    w_z: &[Vec<f64>],
    u_z: &[Vec<f64>],
    w_r: &[Vec<f64>],
    u_r: &[Vec<f64>],
    w_h: &[Vec<f64>],
    u_h: &[Vec<f64>],
) -> Vec<f64> {
    let hidden = h_prev.len();
    let d = x.len();

    // update gate: how much of the state to REPLACE
    let mut z = vec![0.0; hidden];
    for j in 0..hidden {
        let mut total = 0.0;
        for i in 0..d {
            total += x[i] * w_z[i][j];
        }
        for k in 0..hidden {
            total += h_prev[k] * u_z[k][j];
        }
        z[j] = sigmoid(total);
    }

    // reset gate: how much of the old state the candidate may SEE
    let mut r = vec![0.0; hidden];
    for j in 0..hidden {
        let mut total = 0.0;
        for i in 0..d {
            total += x[i] * w_r[i][j];
        }
        for k in 0..hidden {
            total += h_prev[k] * u_r[k][j];
        }
        r[j] = sigmoid(total);
    }

    // candidate: what the unit would compute if it overwrote everything. The
    // reset is applied BEFORE the recurrent product, which is what
    // distinguishes a GRU from a bare interpolation.
    let mut candidate = vec![0.0; hidden];
    for j in 0..hidden {
        let mut total = 0.0;
        for i in 0..d {
            total += x[i] * w_h[i][j];
        }
        for k in 0..hidden {
            total += (r[k] * h_prev[k]) * u_h[k][j];
        }
        candidate[j] = total.tanh();
    }

    // THE BLEND. With z near zero the state is copied forward, and the
    // derivative of a copy is one - so the gradient has a route back through
    // time that never touches the recurrent weight matrix. That is the entire
    // contribution of gating, and it is this one loop.
    (0..hidden)
        .map(|j| (1.0 - z[j]) * h_prev[j] + z[j] * candidate[j])
        .collect()
}`,
        profile: 'O(T * (3h^2 + 3h*d)) per sequence with three gate Vecs allocated per timestep, six matrix walks, and every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! A GRU - typed errors, fused gate matrices, carry bias, reused scratch.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum GruError {
    ZeroWidth,
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for GruError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroWidth => write!(f, "cell has zero input or hidden width"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for GruError {}

/// Which slice of the packed weight matrix a gate occupies.
///
/// A newtype-style enum rather than bare offsets, because the packing ORDER
/// is a convention: every framework stores the three GRU gate matrices
/// stacked, and porting weights without matching the order produces a model
/// that runs and is silently wrong.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Gate {
    Update,
    Reset,
    Candidate,
}

impl Gate {
    #[inline]
    #[must_use]
    pub fn range(self, hidden: usize) -> std::ops::Range<usize> {
        match self {
            Self::Update => 0..hidden,
            Self::Reset => hidden..2 * hidden,
            Self::Candidate => 2 * hidden..3 * hidden,
        }
    }
}

/// The three input matrices are stored as ONE, and likewise the recurrent:
/// z, r and the candidate all read the same x_t, so their separate products
/// become one product against a stacked matrix followed by a slice.
pub struct GruCell {
    w: Vec<f64>,        // row-major (input, 3 * hidden)
    u: Vec<f64>,        // row-major (hidden, 3 * hidden)
    bias: Vec<f64>,
    scratch: Vec<f64>,  // reused every step
    gated: Vec<f64>,
    input_size: usize,
    hidden: usize,
}

impl GruCell {
    pub fn new(input_size: usize, hidden: usize, seed: u64) -> Result<Self, GruError> {
        if input_size == 0 || hidden == 0 {
            return Err(GruError::ZeroWidth);
        }

        let mut rng = Lcg::new(seed);
        let scale = 1.0 / (hidden as f64).sqrt();

        let mut w = Vec::with_capacity(input_size * 3 * hidden);
        w.extend((0..input_size * 3 * hidden).map(|_| rng.uniform() * 2.0 * scale - scale));
        let mut u = Vec::with_capacity(hidden * 3 * hidden);
        u.extend((0..hidden * 3 * hidden).map(|_| rng.uniform() * 2.0 * scale - scale));

        // Bias the UPDATE gate toward carrying. With z starting near zero the
        // state passes through untouched, so the model has a long memory
        // before it has learned anything - the recurrent analogue of a good
        // initialization, and it changes what is learnable early.
        let mut bias = vec![0.0; 3 * hidden];
        bias[Gate::Update.range(hidden)].fill(-1.0);

        Ok(Self {
            w,
            u,
            bias,
            scratch: vec![0.0; 3 * hidden],
            gated: vec![0.0; hidden],
            input_size,
            hidden,
        })
    }

    /// One timestep, writing into the caller's state buffer.
    pub fn step(&mut self, x: &[f64], h_prev: &[f64], h_next: &mut [f64]) -> Result<(), GruError> {
        if x.len() != self.input_size {
            return Err(GruError::ShapeMismatch { expected: self.input_size, found: x.len() });
        }
        if h_prev.len() != self.hidden || h_next.len() != self.hidden {
            return Err(GruError::ShapeMismatch { expected: self.hidden, found: h_prev.len() });
        }

        let h = self.hidden;

        // One product against the stacked input matrix, covering all gates.
        self.scratch.copy_from_slice(&self.bias);
        for (i, &value) in x.iter().enumerate() {
            let row = &self.w[i * 3 * h..(i + 1) * 3 * h];
            for (slot, weight) in self.scratch.iter_mut().zip(row) {
                *slot += value * weight;
            }
        }

        // z and r read the full previous state, so one product serves both.
        for (k, &value) in h_prev.iter().enumerate() {
            let row = &self.u[k * 3 * h..k * 3 * h + 2 * h];
            for (slot, weight) in self.scratch[..2 * h].iter_mut().zip(row) {
                *slot += value * weight;
            }
        }
        for slot in &mut self.scratch[..2 * h] {
            *slot = sigmoid(*slot);
        }

        // The candidate's recurrent term is gated by r BEFORE the product -
        // the one place the fusion does not reach.
        for (slot, (&reset, &previous)) in self
            .gated
            .iter_mut()
            .zip(self.scratch[Gate::Reset.range(h)].iter().zip(h_prev))
        {
            *slot = reset * previous;
        }
        for (k, &value) in self.gated.iter().enumerate() {
            let row = &self.u[k * 3 * h + 2 * h..(k + 1) * 3 * h];
            for (slot, weight) in self.scratch[2 * h..].iter_mut().zip(row) {
                *slot += value * weight;
            }
        }

        // THE BLEND: a copy when z is near zero, and the derivative of a copy
        // is one - the additive gradient path gating exists to provide.
        for j in 0..h {
            let candidate = self.scratch[2 * h + j].tanh();
            let z = self.scratch[j];
            h_next[j] = (1.0 - z) * h_prev[j] + z * candidate;
        }

        Ok(())
    }
}

/// Branch on sign: exp of a large positive argument overflows, and the naive
/// form silently produces inf and then NaN.
#[inline]
fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        let exponential = z.exp();
        exponential / (1.0 + exponential)
    }
}

pub struct Lcg(u64);

impl Lcg {
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn uniform(&mut self) -> f64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 11) as f64 / (1_u64 << 53) as f64
    }
}
`,
        rationale:
          'The three gate matrices are packed into one stacked buffer per side, and the packing order gets a named enum rather than bare offsets — because that order is a convention every framework fixes differently, and porting weights without matching it yields a model that runs and is silently wrong. The candidate’s recurrent term is called out as the one slice the fusion cannot reach, since the reset is applied before its product. Scratch buffers move into the struct rather than being allocated per step, the update-gate bias is initialized toward carrying so the additive path is open from the start, and the sigmoid branches on sign to avoid the overflow the naive form produces.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(T * 3h^2) per sequence with two fused products per step and no per-step allocation.',
      },
      'make-it-fast': {
        code: `//! A GRU - input projections lifted out, sequences across cores.

use ndarray::{s, Array1, Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// The time loop is irreducibly sequential: step t reads the state step t-1
/// produced. That limitation IS the architecture - gating fixes the gradient,
/// not the parallelism, which is why attention displaced it.
///
/// Two things are available instead. The input side covers all three gates
/// and depends on no state, so all T projections are ONE matrix product
/// before the loop - which for a GRU removes roughly HALF the per-step work
/// rather than a third. And independent SEQUENCES can be processed in
/// parallel even though timesteps within one cannot.
pub struct FusedGru {
    w: Array2<f32>,      // (input, 3 * hidden)
    u: Array2<f32>,      // (hidden, 3 * hidden)
    bias: Array1<f32>,
    hidden: usize,
}

impl FusedGru {
    #[must_use]
    pub fn new(w: Array2<f32>, u: Array2<f32>, mut bias: Array1<f32>) -> Self {
        let hidden = u.nrows();
        // Update gate biased toward carrying: long memory before training.
        bias.slice_mut(s![..hidden]).fill(-1.0);
        Self { w, u, bias, hidden }
    }

    /// One sequence: (steps, features) in, (steps, hidden) out.
    #[must_use]
    pub fn forward_one(&self, sequence: ArrayView2<f32>, length: usize) -> Array2<f32> {
        let steps = sequence.nrows();
        let h = self.hidden;

        // ALL input projections for ALL three gates, in one product before
        // the loop. The textbook formulation repeats this T times.
        let mut projected = sequence.dot(&self.w);
        projected += &self.bias;

        let mut states = Array2::<f32>::zeros((steps + 1, h));

        for t in 0..steps {
            if t >= length {
                let previous = states.row(t).to_owned();
                states.row_mut(t + 1).assign(&previous);
                continue;
            }

            let previous = states.row(t).to_owned();

            // z and r recurrent terms from one product against the state.
            let recurrent = previous.dot(&self.u);

            let mut z = projected.slice(s![t, ..h]).to_owned() + recurrent.slice(s![..h]);
            z.mapv_inplace(|value| 1.0 / (1.0 + (-value).exp()));

            let mut r =
                projected.slice(s![t, h..2 * h]).to_owned() + recurrent.slice(s![h..2 * h]);
            r.mapv_inplace(|value| 1.0 / (1.0 + (-value).exp()));

            // The candidate's recurrent term is gated by r BEFORE the
            // product - the one place the fusion does not reach.
            let gated = &r * &previous;
            let mut candidate = projected.slice(s![t, 2 * h..]).to_owned()
                + gated.dot(&self.u.slice(s![.., 2 * h..]));
            candidate.mapv_inplace(f32::tanh);

            // THE BLEND, fused into one pass with no intermediate array.
            let mut next = Array1::<f32>::zeros(h);
            Zip::from(&mut next)
                .and(&z)
                .and(&previous)
                .and(&candidate)
                .for_each(|slot, &gate, &old, &new| *slot = (1.0 - gate) * old + gate * new);

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
}
`,
        rationale:
          'The doc comment states what is not available before what is: the time loop cannot be parallelized, because gating fixes the gradient rather than the parallelism. What can be done is lifting the input projection out — and for a GRU that is worth more than for a plain RNN, since the input side serves all three gates at once and removes about half the per-step work. Independent sequences then process in parallel, because timesteps within one are sequential while sequences are not. The candidate’s recurrent term is called out as the slice the fusion cannot reach, and the final blend is a single fused Zip pass with no intermediate array.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The lifted projection is one GEMM over the whole sequence and both per-step recurrent terms are matrix-vector products, all dispatched to BLAS rather than hand-written loops.',
            tradeoff: 'Binds the build to a system BLAS, and the per-step products are small enough that dispatch overhead competes with the work — which is why GPU GRU kernels fuse across timesteps instead.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Sequences are fully independent of each other, so a batch is a parallel map — the only axis with any parallelism available in this architecture.',
            tradeoff: 'A batch of one long sequence gets nothing, and sequences vary in length so a naive partition leaves workers idle at the end of the batch.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The output vector is sized to the batch before collect_into_vec fills it, so the results are never grown and moved.',
            tradeoff: 'Each sequence still allocates its own state, projection and per-step gate arrays; removing those would need a per-worker arena, which is more machinery than the allocations cost here.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'O(T * 3h^2) per sequence after the input side is lifted, with sequences across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
