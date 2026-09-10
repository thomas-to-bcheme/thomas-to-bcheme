import type { AiMlModel } from '../../types';

/**
 * LSTM — the deep-learning stress test for this schema.
 *
 * Chosen because it is primary for BOTH featured domains that usually pull in
 * opposite directions (forecasting and anomaly detection), and because it is
 * the first entry to exercise the `architecture` axis.
 */
export const LSTM: AiMlModel = {
  slug: 'lstm',
  name: 'Long Short-Term Memory',
  aliases: ['LSTM', 'Gated recurrent network'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['sequence-modeling', 'regression', 'classification', 'anomaly-detection'],
  architecture: 'lstm-gru',

  intuition:
    'A recurrent cell that carries an explicit memory track alongside its hidden state, and learns three gates that decide what to erase from that memory, what to write into it, and what to expose. The memory passes forward through addition rather than repeated multiplication, which is the entire trick: gradients can travel back hundreds of steps without vanishing.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{n}\\sum_{i=1}^{n} \\sum_{t=1}^{T} \\ell\\bigl( f_\\theta(\\mathbf{x}_{i,1:t}),\\, y_{i,t} \\bigr)',
      symbols: [
        { symbol: 'T', meaning: 'sequence length — the number of steps unrolled' },
        { symbol: '\\mathbf{x}_{i,1:t}', meaning: 'the input prefix up to step t; the model may never see beyond it' },
        { symbol: '\\ell', meaning: 'the per-step loss — squared error for forecasting, cross-entropy for labels' },
        { symbol: 'f_\\theta', meaning: 'the unrolled recurrence, sharing one parameter set across all T steps' },
      ],
    },
    reading:
      'The loss is whatever the task loss would be, summed over every timestep and averaged over sequences. Nothing about the objective is special — what is special is that the same weights produce every term in the sum, so one gradient update has to serve all T steps at once.',
  },

  optimization: {
    method: 'Backpropagation through time with gradient clipping, minimized by Adam',
    updateRule: {
      formula:
        '\\frac{\\partial J}{\\partial \\theta} = \\sum_{t=1}^{T} \\frac{\\partial J_t}{\\partial \\theta}, \\qquad \\mathbf{g} \\leftarrow \\mathbf{g}\\cdot\\min\\!\\left(1, \\frac{c}{\\lVert \\mathbf{g} \\rVert}\\right)',
      symbols: [
        { symbol: '\\mathbf{g}', meaning: 'the accumulated gradient over the unrolled graph' },
        { symbol: 'c', meaning: 'the clipping threshold — the norm the gradient is rescaled down to' },
        { symbol: 'T', meaning: 'truncation length; the graph is cut here to bound memory' },
      ],
    },
    rationale:
      'Unrolling the recurrence turns it into a very deep feed-forward network sharing one weight matrix, so the gradient is a sum over T paths. The additive cell state stops those paths from vanishing, but it does nothing about them exploding — a single steep step can send the norm to infinity. Clipping is therefore not optional hygiene, it is what makes the training stable at all. Adam is standard because the per-parameter scaling copes with gates that saturate at very different rates.',
    hyperparameters: [
      { name: 'hidden size', role: 'Memory capacity per step; the main lever on both fit and cost', typicalRange: '32 to 512' },
      { name: 'layers', role: 'Depth of stacked recurrence; rarely helps past 2–3', typicalRange: '1 to 3' },
      { name: 'truncation length (BPTT)', role: 'How far back gradients flow; bounds memory and runtime', typicalRange: '20 to 200 steps' },
      { name: 'gradient clip norm', role: 'Caps the update size so one steep batch cannot destroy the weights', typicalRange: '0.5 to 5.0' },
      { name: 'dropout', role: 'Applied between layers, not across time, or it destroys the memory', typicalRange: '0.0 to 0.3' },
    ],
    convergence:
      'No convexity and no guarantee — the objective is a deep non-convex surface and you are looking for a good local minimum, not the global one. The characteristic failure is not divergence but a plateau: the model learns the mean of the series, drives the loss down, and produces a flat forecast that looks fine on MSE and is useless. Exploding gradients show up as a sudden loss spike to NaN; vanishing ones show up as long-range dependencies simply never being learned, which is silent.',
    complexity:
      'O(T · H²) per sequence for both forward and backward, with H the hidden size. Strictly sequential in T — the recurrence cannot be parallelized across time, which is the structural reason Transformers displaced LSTMs at scale.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Feed a sliding window of past observations and predict the next value or the next h values. For multi-horizon, either decode autoregressively (feeding predictions back, which compounds error) or emit all h outputs at once from the final hidden state (which does not, and is usually better).',
        where: [
          'Retail and supply-chain demand forecasting across thousands of SKUs with one shared global model',
          'Energy load and generation forecasting, where daily and weekly cycles interact with weather',
          'Sensor and telemetry prediction in industrial monitoring, feeding a downstream control loop',
        ],
        why: 'Worth its cost only when you have many long, related series — a global LSTM learns patterns across series that no per-series ARIMA can see. On one short series it will lose to exponential smoothing, and it is important to say so: the trigger is series count and history length, not model sophistication.',
        featurization: [
          'Window the series into overlapping (input, target) pairs, split strictly by time',
          'Scale per series, not globally, so a high-volume series does not dominate the loss',
          'Append calendar features (hour, day-of-week, holiday) as extra input channels',
          'Difference or log-transform when the trend is multiplicative rather than additive',
        ],
        evaluation:
          'Rolling-origin backtesting with an expanding window, scored with MASE against a seasonal-naive baseline, evaluated at the horizon the business actually acts on rather than at h=1.',
        pitfalls: [
          'Scaling fit on the full series before splitting leaks future statistics into training',
          'Autoregressive decoding compounds error — a good h=1 model can be terrible at h=24',
          'A model that has learned the series mean shows a respectable MSE and a flat, worthless forecast',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Train on known-normal sequences only, then score by prediction or reconstruction error: an observation the model could not have anticipated from its own history is an anomaly. The LSTM-autoencoder variant compresses a window and reconstructs it, which catches shape anomalies a next-step predictor misses.',
        where: [
          'Server and network telemetry monitoring, where normal load has strong daily and weekly shape',
          'Predictive maintenance on rotating machinery, catching drift before a hard failure',
          'Cardiac and physiological monitoring, where the anomaly is a deviation from a personal baseline',
        ],
        why: 'This is where an LSTM beats every static detector: it models what is normal *for this time of day, given what just happened*. A z-score on raw values will fire every weekday morning; a sequence model will not. The cost is that a large enough network learns to reconstruct anomalies too, so capacity has to be constrained on purpose.',
        featurization: [
          'Train exclusively on a confirmed-clean window, or the model learns to accept anomalies',
          'Keep the bottleneck narrow in the autoencoder variant — capacity is the detector',
          'Score on a rolling window of error, not a single point, to suppress single-sample noise',
        ],
        evaluation:
          'Precision@k and time-to-detection against confirmed incidents, with the threshold set from the error quantiles of a held-out clean period, and whole anomaly episodes held out rather than individual points.',
        pitfalls: [
          'Contaminated training data silently redefines normal to include the failure mode',
          'Too much capacity reconstructs anomalies perfectly and the detector goes blind',
          'Thresholds drift with the system — recalibrate on a schedule even when the model does not change',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Not an optimizer itself. It enters an optimization pipeline as the learned dynamics model: predict how the system evolves under a candidate action sequence, then let a classical solver or a model-predictive controller search over those sequences.',
        where: [
          'World models inside model-based RL, where rollouts are cheaper than touching the real system',
          'Demand prediction feeding an inventory or dispatch optimizer',
        ],
        why: 'It supplies the forecast the optimizer consumes, and the quality of the decision is usually bounded by that forecast rather than by the solver. But it offers no constraint guarantees and no optimality argument, so it belongs inside the loop, never in place of it.',
        featurization: [
          'Include the action as an input channel — a dynamics model must be conditioned on what you did',
          'Train on trajectories under a diverse action distribution, or the model only knows one regime',
        ],
        evaluation:
          'Multi-step rollout error under held-out action sequences, not one-step accuracy: an optimizer will exploit exactly the horizon where the model is weakest.',
        pitfalls: [
          'One-step accuracy is a poor proxy for rollout accuracy, and the optimizer only cares about the latter',
          'The planner will find and exploit regions where the learned model is confidently wrong',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Model a customer or account as a sequence of events rather than a feature vector, so the signal is behavioural change over time rather than any single transaction.',
        where: [
          'Account-takeover detection from session and transaction sequences',
          'Merchant risk scoring where the pattern of activity matters more than its aggregate',
        ],
        why: 'Catches drift within an account that per-transaction tabular features flatten away. Gradient boosting still wins on engineered aggregates, so this is a complement rather than a replacement — and it costs the explainability that regulated decisions often require.',
        featurization: [
          'Sequence by event with explicit time deltas as a channel; irregular spacing is information',
          'Cap sequence length and truncate from the start, keeping recent behaviour',
        ],
        evaluation:
          'PR-AUC and recall at a fixed false-positive budget, on strictly time-based splits — random splits leak future fraud patterns backwards.',
        pitfalls: [
          'Label latency means recent sequences are not yet fully labelled',
          'Adversaries adapt, so the "normal" the model learned decays faster than in other domains',
        ],
      },
      'natural-language': {
        fit: 'adapted',
        how: 'Consume token embeddings step by step and emit a per-token or per-sequence representation, the standard architecture for NLP before attention displaced it.',
        where: [
          'Small-corpus sequence labelling where a pretrained transformer is overkill',
          'On-device text classification under tight memory limits',
        ],
        why: 'Largely superseded: the sequential recurrence cannot be parallelized across time, so it does not scale to pretraining, which is where nearly all modern NLP performance comes from. Still reasonable when the corpus is small and the latency budget is tight.',
        featurization: [
          'Bucket by sequence length to limit padding waste',
          'Bidirectional encoding when the whole sequence is available at inference',
        ],
        evaluation: 'Task F1 on a held-out set, benchmarked against a fine-tuned encoder to confirm the simpler model is genuinely sufficient.',
        pitfalls: [
          'Long-range dependency is still weaker than attention, however good the gating is',
          'No pretraining transfer means it needs far more labelled data',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on a single GPU for a typical global forecasting model. The sequential recurrence is the bottleneck — you can batch across sequences but never across time.',
    inferenceProfile:
      'Cheap per step and naturally streaming: carry the hidden state forward and each new observation costs one cell update. Milliseconds on CPU for modest hidden sizes.',
    retrainingCadence:
      'Weekly to monthly for forecasting; more often for anomaly detection, where the definition of normal drifts with the system.',
    driftAndMonitoring: [
      'Track per-segment forecast bias — sustained one-sided error means the learned dynamics no longer hold',
      'Watch the reconstruction/prediction error distribution on known-normal traffic, not just alert volume',
      'Alert on the input scaler going out of range; an unscaled input silently produces nonsense',
    ],
    productionGotchas: [
      'Hidden state must be reset at sequence boundaries or one series bleeds into the next',
      'The scaler is part of the model — persist and version it together, never refit at inference',
      'Training uses teacher forcing while inference feeds back predictions; that gap is a real accuracy cliff',
    ],
  },

  assumptions: [
    'The generating process is stationary enough that patterns learned on history persist into the forecast window',
    'Sequence order is meaningful and the sampling interval is consistent (or the interval is given as a feature)',
    'Enough sequences exist to fit a high-capacity model without memorizing them',
    'The relevant history fits inside the truncation window used for backpropagation',
  ],

  pros: [
    {
      point: 'Learns long-range temporal dependency without hand-specified lags',
      context:
        'The decisive advantage over ARIMA and lag-feature boosting when the relevant history is long or the lag structure is unknown. Worth nothing when the dependency is a known seasonal period you could simply encode.',
    },
    {
      point: 'One global model shares strength across thousands of series',
      context:
        'Where nearly all the real-world gain comes from — a series with 30 observations borrows structure from ones with 3,000. Irrelevant if you only have one series.',
    },
    {
      point: 'Streaming inference with O(1) state per step',
      context:
        'Makes it genuinely deployable on live telemetry, unlike an attention model that must re-attend over a window each step.',
    },
    {
      point: 'The same trained model serves forecasting and anomaly detection',
      context:
        'Prediction error IS the anomaly score, so one model covers both goals — an operational simplification that matters more than it sounds.',
    },
  ],

  cons: [
    {
      point: 'Cannot be parallelized across time',
      context:
        'The structural reason Transformers displaced LSTMs at scale. Barely matters at hundreds of steps; decisive at tens of thousands.',
    },
    {
      point: 'Needs substantially more data than classical alternatives',
      context:
        'On a single short series it will lose to two-parameter exponential smoothing, and confidently so. The honest trigger is many long series.',
    },
    {
      point: 'Point forecasts with no native uncertainty',
      context:
        'A real problem wherever the decision needs the tail rather than the mean — inventory, capacity, risk. Requires quantile loss or a probabilistic head bolted on.',
    },
    {
      point: 'Effectively opaque',
      context:
        'Fatal in regulated or causal work where the coefficient is the deliverable. Irrelevant when only the prediction is acted on.',
    },
  ],

  relatedSlugs: ['gru', 'rnn', 'temporal-fusion-transformer', 'autoencoder'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""One LSTM cell and a forward pass over a sequence - the gates, written out.

Four gates, all the same shape: forget decides what to drop from the cell
state, input decides what to consider writing, candidate is what to write,
and output decides what to expose as the hidden state.
"""

import math


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z))


def lstm_cell(x, h_prev, c_prev, weights, hidden_size):
    """One timestep. x, h_prev, c_prev are plain lists of floats."""
    combined = list(x) + list(h_prev)

    def gate(name):
        w, b = weights[name]
        out = []
        for j in range(hidden_size):
            acc = b[j]
            for k in range(len(combined)):
                acc += w[j][k] * combined[k]
            out.append(acc)
        return out

    f = [sigmoid(v) for v in gate("forget")]     # what to erase
    i = [sigmoid(v) for v in gate("input")]      # what to admit
    g = [math.tanh(v) for v in gate("candidate")]  # what to write
    o = [sigmoid(v) for v in gate("output")]     # what to expose

    # The additive update is the whole point: c flows forward through a sum,
    # not a repeated matrix product, so its gradient does not vanish.
    c = [f[j] * c_prev[j] + i[j] * g[j] for j in range(hidden_size)]
    h = [o[j] * math.tanh(c[j]) for j in range(hidden_size)]
    return h, c


def forward(sequence, weights, hidden_size):
    h = [0.0] * hidden_size
    c = [0.0] * hidden_size
    for x in sequence:
        h, c = lstm_cell(x, h, c, weights, hidden_size)
    return h`,
        profile: 'O(T · H · (D+H)) in pure Python — correct, and far too slow to train anything.',
      },
      'make-it-right': {
        code: `"""LSTM forecaster - typed, validated, and expressed in a framework."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class ForecastConfig:
    input_size: int
    hidden_size: int = 64
    num_layers: int = 2
    horizon: int = 24
    dropout: float = 0.1


class LstmForecaster(nn.Module):
    """Encodes a window and emits all \`horizon\` steps at once.

    Direct multi-horizon output rather than autoregressive decoding: feeding
    predictions back compounds error across the horizon, and the head costs
    almost nothing.
    """

    def __init__(self, config: ForecastConfig) -> None:
        super().__init__()
        if config.num_layers < 1:
            raise ValueError(f"num_layers must be >= 1, got {config.num_layers}")
        if not 0.0 <= config.dropout < 1.0:
            raise ValueError(f"dropout must be in [0, 1), got {config.dropout}")

        self.config = config
        self.lstm = nn.LSTM(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            # Dropout between layers only. Applying it across time would sever
            # the memory the architecture exists to preserve.
            dropout=config.dropout if config.num_layers > 1 else 0.0,
            batch_first=True,
        )
        self.head = nn.Linear(config.hidden_size, config.horizon)

    def forward(self, windows: Tensor) -> Tensor:
        if windows.dim() != 3:
            raise ValueError(f"expected (batch, time, features), got {tuple(windows.shape)}")

        outputs, _ = self.lstm(windows)
        return self.head(outputs[:, -1, :])   # last step summarizes the window


def train_step(
    model: LstmForecaster,
    optimizer: torch.optim.Optimizer,
    windows: Tensor,
    targets: Tensor,
    clip_norm: float = 1.0,
) -> float:
    model.train()
    optimizer.zero_grad(set_to_none=True)
    loss = nn.functional.mse_loss(model(windows), targets)
    loss.backward()
    # Not optional hygiene: one steep batch can send the gradient norm to
    # infinity and destroy the weights irrecoverably.
    nn.utils.clip_grad_norm_(model.parameters(), clip_norm)
    optimizer.step()
    return float(loss.item())`,
        rationale:
          'The hand-rolled cell is replaced by a framework module that is already fused and differentiable, the config becomes a frozen dataclass instead of loose keyword arguments, and the two things that actually break LSTM training in practice — dropout applied across time, and unclipped gradients — are handled explicitly rather than left to chance.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'O(T · H²) per sequence, fused CUDA kernels, batched across sequences.',
      },
      'make-it-fast': {
        code: `"""LSTM forecaster - packed batches, fused kernels, mixed precision."""

import torch
from torch import Tensor, nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence


class FastLstmForecaster(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 64, horizon: int = 24) -> None:
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers=2, batch_first=True)
        self.head = nn.Linear(hidden_size, horizon)

    def forward(self, windows: Tensor, lengths: Tensor) -> Tensor:
        # Packing skips padded timesteps entirely. On a batch bucketed by
        # length this is a large constant-factor win, and it also stops the
        # padding from polluting the final hidden state.
        packed = pack_padded_sequence(
            windows, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        packed_out, (hidden, _) = self.lstm(packed)
        pad_packed_sequence(packed_out, batch_first=True)
        return self.head(hidden[-1])


def train_epoch(model, optimizer, loader, device, clip_norm: float = 1.0) -> float:
    model.train()
    scaler = torch.amp.GradScaler(device)
    total = 0.0

    for windows, lengths, targets in loader:
        windows = windows.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        # bfloat16 autocast: the recurrence is memory-bandwidth bound, so
        # halving the activation traffic is close to halving the step time.
        with torch.autocast(device_type=device, dtype=torch.bfloat16):
            loss = nn.functional.mse_loss(model(windows, lengths), targets)

        scaler.scale(loss).backward()
        # Unscale before clipping, or the threshold is applied to scaled
        # gradients and means nothing.
        scaler.unscale_(optimizer)
        nn.utils.clip_grad_norm_(model.parameters(), clip_norm)
        scaler.step(optimizer)
        scaler.update()
        total += float(loss.item())

    return total / max(len(loader), 1)`,
        rationale:
          'Three changes, none of which touch the model. Variable-length batches are packed so padded steps are never computed. The forward and backward pass run in bfloat16 under autocast, which matters because the recurrence is bandwidth-bound rather than compute-bound. And transfers are non-blocking so the host is not stalling the device between batches.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Packed variable-length batches let one kernel launch cover many sequences without wasting work on padding — the dominant cost at short sequence lengths is launch overhead, not arithmetic.',
            tradeoff: 'Requires bucketing the loader by length; a badly bucketed batch packs poorly and the win evaporates.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'zero_grad(set_to_none=True) and in-place scaler updates avoid reallocating gradient buffers every step.',
            tradeoff: 'set_to_none changes .grad from a zero tensor to None, which breaks any code that reads gradients before the first backward pass.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'bfloat16 autocast halves activation traffic through the recurrence, which is where a memory-bound LSTM actually spends its time.',
            tradeoff: 'Reduced precision can destabilize training on ill-conditioned data; the gradient scaler exists precisely to paper over that and adds its own failure mode.',
          },
        ],
        libraryName: 'PyTorch (AMP)',
        profile: 'Roughly 2x step-time reduction on bandwidth-bound recurrences. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// One LSTM cell and a sequence forward pass - the gates, written out.
#include <cmath>
#include <cstddef>
#include <vector>

namespace {

double Sigmoid(double z) { return 1.0 / (1.0 + std::exp(-z)); }

// Weight block for one gate: [hidden][input + hidden] plus a bias.
struct Gate {
  std::vector<std::vector<double>> w;
  std::vector<double> b;
};

std::vector<double> Apply(const Gate& gate, const std::vector<double>& combined) {
  const std::size_t hidden = gate.b.size();
  std::vector<double> out(hidden, 0.0);
  for (std::size_t j = 0; j < hidden; ++j) {
    double acc = gate.b[j];
    for (std::size_t k = 0; k < combined.size(); ++k) {
      acc += gate.w[j][k] * combined[k];
    }
    out[j] = acc;
  }
  return out;
}

}  // namespace

struct LstmWeights {
  Gate forget, input, candidate, output;
};

struct State {
  std::vector<double> h;
  std::vector<double> c;
};

State LstmCell(const std::vector<double>& x, const State& prev, const LstmWeights& w) {
  std::vector<double> combined = x;
  combined.insert(combined.end(), prev.h.begin(), prev.h.end());

  const std::vector<double> f_raw = Apply(w.forget, combined);
  const std::vector<double> i_raw = Apply(w.input, combined);
  const std::vector<double> g_raw = Apply(w.candidate, combined);
  const std::vector<double> o_raw = Apply(w.output, combined);

  const std::size_t hidden = prev.h.size();
  State next{std::vector<double>(hidden), std::vector<double>(hidden)};
  for (std::size_t j = 0; j < hidden; ++j) {
    const double f = Sigmoid(f_raw[j]);
    const double i = Sigmoid(i_raw[j]);
    const double g = std::tanh(g_raw[j]);
    const double o = Sigmoid(o_raw[j]);

    // Additive cell update - the reason gradients survive long sequences.
    next.c[j] = f * prev.c[j] + i * g;
    next.h[j] = o * std::tanh(next.c[j]);
  }
  return next;
}`,
        profile: 'O(T · H · (D+H)). Four separate Apply calls means four passes over the same input vector.',
      },
      'make-it-right': {
        code: `// LSTM cell - one fused weight block, flat storage, validated at construction.
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <vector>

class LstmCell {
 public:
  // Gates are stored as ONE [4H x (D+H)] block, in the canonical
  // forget/input/candidate/output order, so a step is a single matrix-vector
  // product instead of four.
  LstmCell(std::size_t input_size, std::size_t hidden_size,
           std::vector<double> weights, std::vector<double> bias)
      : input_size_(input_size),
        hidden_size_(hidden_size),
        weights_(std::move(weights)),
        bias_(std::move(bias)) {
    const std::size_t rows = 4 * hidden_size_;
    const std::size_t cols = input_size_ + hidden_size_;
    if (hidden_size_ == 0 || input_size_ == 0) {
      throw std::invalid_argument("input and hidden sizes must be non-zero");
    }
    if (weights_.size() != rows * cols) {
      throw std::invalid_argument("weight block is not [4H x (D+H)]");
    }
    if (bias_.size() != rows) {
      throw std::invalid_argument("bias is not 4H");
    }
  }

  // h and c are updated in place; both must be hidden_size long.
  void Step(std::span<const double> x, std::span<double> h, std::span<double> c) const {
    if (x.size() != input_size_ || h.size() != hidden_size_ || c.size() != hidden_size_) {
      throw std::invalid_argument("state or input width does not match the cell");
    }

    const std::size_t cols = input_size_ + hidden_size_;
    std::vector<double> pre(4 * hidden_size_);

    for (std::size_t row = 0; row < 4 * hidden_size_; ++row) {
      const double* weight_row = weights_.data() + row * cols;
      double acc = bias_[row];
      for (std::size_t k = 0; k < input_size_; ++k) acc += weight_row[k] * x[k];
      for (std::size_t k = 0; k < hidden_size_; ++k) {
        acc += weight_row[input_size_ + k] * h[k];
      }
      pre[row] = acc;
    }

    for (std::size_t j = 0; j < hidden_size_; ++j) {
      const double f = Sigmoid(pre[j]);
      const double i = Sigmoid(pre[hidden_size_ + j]);
      const double g = std::tanh(pre[2 * hidden_size_ + j]);
      const double o = Sigmoid(pre[3 * hidden_size_ + j]);
      c[j] = f * c[j] + i * g;
      h[j] = o * std::tanh(c[j]);
    }
  }

  [[nodiscard]] std::size_t hidden_size() const noexcept { return hidden_size_; }

 private:
  static double Sigmoid(double z) noexcept { return 1.0 / (1.0 + std::exp(-z)); }

  std::size_t input_size_;
  std::size_t hidden_size_;
  std::vector<double> weights_;   // owned; rule of zero handles the rest
  std::vector<double> bias_;
};`,
        rationale:
          'The four separate gate structures collapse into one contiguous [4H x (D+H)] block in the canonical gate order, so a timestep touches the weights once rather than four times. Shape invariants are checked once at construction instead of on every step, and state is updated through spans in place rather than returned by value.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'One pass over the weight block per step; the pre-activation buffer is the only allocation.',
      },
      'make-it-fast': {
        code: `// LSTM cell - Eigen, one GEMM per step, batched across sequences.
#include <Eigen/Dense>
#include <stdexcept>

class BatchedLstmCell {
 public:
  BatchedLstmCell(Eigen::MatrixXd weights, Eigen::VectorXd bias, Eigen::Index hidden)
      : weights_(std::move(weights)), bias_(std::move(bias)), hidden_(hidden) {
    if (weights_.rows() != 4 * hidden_) {
      throw std::invalid_argument("weight block must have 4H rows");
    }
  }

  // States are [batch x hidden]; x is [batch x input]. Processing the whole
  // batch as one matrix turns a memory-bound matrix-vector product into a
  // compute-bound matrix-matrix product, which is where the hardware wins.
  void Step(const Eigen::MatrixXd& x, Eigen::MatrixXd& h, Eigen::MatrixXd& c) const {
    const Eigen::Index batch = x.rows();

    Eigen::MatrixXd combined(batch, x.cols() + hidden_);
    combined << x, h;

    // One GEMM for all four gates, plus a broadcast bias add. Eigen fuses the
    // transpose and the broadcast into the same traversal - no temporaries.
    Eigen::MatrixXd pre =
        (combined * weights_.transpose()).rowwise() + bias_.transpose();

    auto f = pre.leftCols(hidden_).array();
    auto i = pre.middleCols(hidden_, hidden_).array();
    auto g = pre.middleCols(2 * hidden_, hidden_).array();
    auto o = pre.rightCols(hidden_).array();

    // Array expressions stay lazy until assignment, so the gate nonlinearities
    // and the cell update evaluate in a single pass over memory.
    c.array() = Sigmoid(f) * c.array() + Sigmoid(i) * g.tanh();
    h.array() = Sigmoid(o) * c.array().tanh();
  }

 private:
  template <typename Derived>
  static auto Sigmoid(const Eigen::ArrayBase<Derived>& z) {
    return 1.0 / (1.0 + (-z).exp());
  }

  Eigen::MatrixXd weights_;
  Eigen::VectorXd bias_;
  Eigen::Index hidden_;
};`,
        rationale:
          'The per-sequence matrix-vector product becomes a batched matrix-matrix product, which is the single change that matters: matrix-vector is memory-bound and matrix-matrix is compute-bound, so the same arithmetic suddenly uses the hardware properly. The gate nonlinearities become lazy array expressions that evaluate in one pass.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Batching turns the gate projection into a GEMM, which Eigen dispatches to a blocked kernel that keeps operands in cache.',
            tradeoff: 'Only pays off once the batch is large enough; for batch size 1 this is strictly slower than the flat version.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The gate nonlinearities and the cell update compose into one traversal instead of materializing four intermediate matrices per step.',
            tradeoff: 'Storing an expression in auto rather than a concrete matrix produces a dangling reference — a classic and hard-to-spot Eigen bug.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen relies on the compiler to vectorize its kernels; unoptimized it is no faster than the hand-written loop.',
            tradeoff: '-march=native produces a binary that may not run on older CPUs in a heterogeneous fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'One GEMM per timestep across the whole batch. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! One LSTM cell and a sequence forward pass - the gates, written out.

fn sigmoid(z: f64) -> f64 {
    1.0 / (1.0 + (-z).exp())
}

pub struct Gate {
    pub w: Vec<Vec<f64>>,
    pub b: Vec<f64>,
}

fn apply(gate: &Gate, combined: &[f64]) -> Vec<f64> {
    let hidden = gate.b.len();
    let mut out = vec![0.0; hidden];
    for j in 0..hidden {
        let mut acc = gate.b[j];
        for k in 0..combined.len() {
            acc += gate.w[j][k] * combined[k];
        }
        out[j] = acc;
    }
    out
}

pub struct LstmWeights {
    pub forget: Gate,
    pub input: Gate,
    pub candidate: Gate,
    pub output: Gate,
}

pub fn lstm_cell(
    x: &[f64],
    h_prev: &[f64],
    c_prev: &[f64],
    w: &LstmWeights,
) -> (Vec<f64>, Vec<f64>) {
    let mut combined = x.to_vec();
    combined.extend_from_slice(h_prev);

    let f_raw = apply(&w.forget, &combined);
    let i_raw = apply(&w.input, &combined);
    let g_raw = apply(&w.candidate, &combined);
    let o_raw = apply(&w.output, &combined);

    let hidden = h_prev.len();
    let mut h = vec![0.0; hidden];
    let mut c = vec![0.0; hidden];
    for j in 0..hidden {
        let f = sigmoid(f_raw[j]);
        let i = sigmoid(i_raw[j]);
        let g = g_raw[j].tanh();
        let o = sigmoid(o_raw[j]);

        // Additive cell update - what keeps the gradient alive across steps.
        c[j] = f * c_prev[j] + i * g;
        h[j] = o * c[j].tanh();
    }
    (h, c)
}`,
        profile: 'O(T · H · (D+H)). Four allocations per step, and every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! LSTM cell - one fused weight block, typed errors, state updated in place.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum CellError {
    ZeroSized,
    WeightShape { expected: usize, found: usize },
    StateWidth { expected: usize, found: usize },
}

impl fmt::Display for CellError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroSized => write!(f, "input and hidden sizes must be non-zero"),
            Self::WeightShape { expected, found } => {
                write!(f, "expected a {expected}-element weight block, found {found}")
            }
            Self::StateWidth { expected, found } => {
                write!(f, "expected state of width {expected}, found {found}")
            }
        }
    }
}

impl std::error::Error for CellError {}

pub struct LstmCell {
    input_size: usize,
    hidden_size: usize,
    /// One flat [4H x (D+H)] block, in forget/input/candidate/output order.
    weights: Vec<f64>,
    bias: Vec<f64>,
}

impl LstmCell {
    /// Shape invariants are checked once, here — never on the hot path.
    pub fn new(
        input_size: usize,
        hidden_size: usize,
        weights: Vec<f64>,
        bias: Vec<f64>,
    ) -> Result<Self, CellError> {
        if input_size == 0 || hidden_size == 0 {
            return Err(CellError::ZeroSized);
        }
        let expected = 4 * hidden_size * (input_size + hidden_size);
        if weights.len() != expected {
            return Err(CellError::WeightShape { expected, found: weights.len() });
        }
        if bias.len() != 4 * hidden_size {
            return Err(CellError::WeightShape {
                expected: 4 * hidden_size,
                found: bias.len(),
            });
        }
        Ok(Self { input_size, hidden_size, weights, bias })
    }

    pub fn step(&self, x: &[f64], h: &mut [f64], c: &mut [f64]) -> Result<(), CellError> {
        if x.len() != self.input_size {
            return Err(CellError::StateWidth { expected: self.input_size, found: x.len() });
        }
        if h.len() != self.hidden_size || c.len() != self.hidden_size {
            return Err(CellError::StateWidth {
                expected: self.hidden_size,
                found: h.len(),
            });
        }

        let cols = self.input_size + self.hidden_size;
        let pre: Vec<f64> = self
            .weights
            .chunks_exact(cols)
            .zip(&self.bias)
            .map(|(row, b)| {
                let from_x: f64 = row[..self.input_size].iter().zip(x).map(|(w, v)| w * v).sum();
                let from_h: f64 = row[self.input_size..].iter().zip(h.iter()).map(|(w, v)| w * v).sum();
                b + from_x + from_h
            })
            .collect();

        let hidden = self.hidden_size;
        for j in 0..hidden {
            let f = sigmoid(pre[j]);
            let i = sigmoid(pre[hidden + j]);
            let g = pre[2 * hidden + j].tanh();
            let o = sigmoid(pre[3 * hidden + j]);
            c[j] = f * c[j] + i * g;
            h[j] = o * c[j].tanh();
        }
        Ok(())
    }
}

#[inline]
fn sigmoid(z: f64) -> f64 {
    1.0 / (1.0 + (-z).exp())
}`,
        rationale:
          'Four gate structures become one flat weight block walked with chunks_exact, so a step makes one pass over the weights instead of four. Shape errors become a typed Result validated once in the constructor, and state is mutated through borrowed slices rather than returned as freshly allocated vectors.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One pass over the weight block per step; one allocation for the pre-activations.',
      },
      'make-it-fast': {
        code: `//! LSTM cell - parallel gate projection, reusable buffer, no per-step allocation.

use rayon::prelude::*;

pub struct FastLstmCell {
    input_size: usize,
    hidden_size: usize,
    weights: Vec<f64>,
    bias: Vec<f64>,
}

impl FastLstmCell {
    /// \`pre\` is caller-owned scratch of length 4H, reused across every step of
    /// the sequence. The recurrence runs thousands of times, so an allocation
    /// per step is an allocation per step too many.
    pub fn step(&self, x: &[f64], h: &mut [f64], c: &mut [f64], pre: &mut [f64]) {
        let cols = self.input_size + self.hidden_size;
        let input_size = self.input_size;

        // The 4H rows are independent dot products - the one genuinely
        // parallel part of an otherwise strictly sequential architecture.
        pre.par_iter_mut()
            .zip(self.weights.par_chunks_exact(cols))
            .zip(self.bias.par_iter())
            .for_each(|((slot, row), b)| {
                let (w_x, w_h) = row.split_at(input_size);
                let from_x: f64 = w_x.iter().zip(x).map(|(w, v)| w * v).sum();
                let from_h: f64 = w_h.iter().zip(h.iter()).map(|(w, v)| w * v).sum();
                *slot = b + from_x + from_h;
            });

        let hidden = self.hidden_size;
        let (f_block, rest) = pre.split_at(hidden);
        let (i_block, rest) = rest.split_at(hidden);
        let (g_block, o_block) = rest.split_at(hidden);

        // Zipped iterators over four equal-length slices: the compiler proves
        // the lengths match once and drops the bounds checks entirely.
        for ((((cell, hid), &f), &i), (&g, &o)) in c
            .iter_mut()
            .zip(h.iter_mut())
            .zip(f_block)
            .zip(i_block)
            .zip(g_block.iter().zip(o_block))
        {
            *cell = sigmoid(f) * *cell + sigmoid(i) * g.tanh();
            *hid = sigmoid(o) * cell.tanh();
        }
    }
}

#[inline]
fn sigmoid(z: f64) -> f64 {
    1.0 / (1.0 + (-z).exp())
}`,
        rationale:
          'Two structural changes. The pre-activation buffer moves out to the caller and is reused across every step, removing an allocation from a loop that runs once per timestep. And the 4H gate rows — the only part of an LSTM that is genuinely parallel, since the time axis is not — are projected with rayon.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The 4H gate-row dot products are mutually independent, so they partition across cores with no shared mutable state. The time axis cannot be parallelized, which makes this the only place to find any.',
            tradeoff: 'Work-stealing overhead dominates for small hidden sizes; below roughly 256 units the sequential version wins.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Hoisting the scratch buffer to the caller removes one allocation per timestep from the hot recurrence.',
            tradeoff: 'Pushes a scratch buffer into the public signature, which is a worse API in exchange for the speed.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The zipped four-way iteration lets the compiler prove all slice lengths agree once, rather than checking every index in the gate update.',
            tradeoff: 'The nested zip tuple pattern is genuinely hard to read — a real maintainability cost for the elision.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Gate projection across cores; zero allocation per step. Illustrative, not a measured benchmark.',
      },
    },
  },
};
