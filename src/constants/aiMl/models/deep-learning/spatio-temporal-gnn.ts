import type { AiMlModel } from '../../types';

/**
 * Spatio-temporal graph networks — the forecasting architecture that treats
 * the sensor network as a graph rather than as N independent series.
 *
 * Covers the STGCN / DCRNN / Graph WaveNet family: a diffusion or Chebyshev
 * graph convolution over space, interleaved with a causal convolution or a
 * recurrence over time.
 */
export const SPATIO_TEMPORAL_GNN: AiMlModel = {
  slug: 'spatio-temporal-gnn',
  name: 'Spatio-Temporal Graph Network',
  aliases: ['STGNN', 'STGCN', 'DCRNN', 'Graph WaveNet', 'Diffusion convolutional RNN'],
  category: 'deep-learning',
  group: 'graph',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'sequence-modeling', 'anomaly-detection'],
  architecture: 'graph',
  paradigmNote:
    'Structurally a hybrid — a graph convolution stacked with a temporal convolution or recurrence — but classified as graph because the graph operator is what distinguishes it. Strip the graph out and it is N independent temporal models, which is precisely the baseline it has to beat.',

  intuition:
    'A hundred traffic sensors are not a hundred independent series: congestion at one junction shows up downstream twenty minutes later, and the road network says which junctions are downstream. So alternate two operations — mix each node with its graph neighbours, then mix each node with its own recent past — and stack them. Spatial dependency comes from the graph rather than from being learned blind, which is the entire reason this beats a per-series model when the network is real.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{\\lvert \\Omega \\rvert} \\sum_{(i,t,h) \\in \\Omega} \\bigl\\lvert \\hat{y}_{i,t+h} - y_{i,t+h} \\bigr\\rvert, \\qquad \\hat{\\mathbf{Y}} = f_\\theta\\bigl(\\mathbf{X}_{t-L+1:t},\\, \\tilde{\\mathbf{A}}\\bigr)',
      symbols: [
        { symbol: '\\Omega', meaning: 'the observed (node, time, horizon) triples — sensor networks always have gaps, and the loss must be masked to them' },
        { symbol: '\\tilde{\\mathbf{A}}', meaning: 'the normalized adjacency or transition matrix; the structural prior, given rather than learned' },
        { symbol: '\\mathbf{X}_{t-L+1:t}', meaning: 'the input window: L timesteps by N nodes by C channels' },
        { symbol: 'h', meaning: 'forecast horizon, typically emitted for all h at once rather than recursively' },
        { symbol: 'N', meaning: 'number of nodes; the spatial cost is quadratic in it only if the graph is dense' },
      ],
    },
    reading:
      'An ordinary masked mean-absolute-error over every node and every horizon — nothing about the loss is special, and that is worth noticing. All of the modelling is in f, specifically in the adjacency it is handed. MAE rather than MSE is near-universal here because traffic and load series have heavy-tailed spikes that squared error chases at the expense of everything else. The mask is not hygiene either: on real sensor networks five to fifteen percent of readings are missing at any moment, and an unmasked loss trains the model to predict the imputation.',
  },

  optimization: {
    method: 'Adam on the masked MAE, with the graph operator applied as repeated sparse matrix products rather than as a materialized power',
    updateRule: {
      formula:
        '\\mathbf{Z} = \\sum_{k=0}^{K} \\mathbf{P}^{k} \\mathbf{X} \\mathbf{W}_k, \\qquad \\mathbf{P} = \\mathbf{D}^{-1}\\mathbf{A}, \\qquad \\mathbf{H} = \\mathbf{Z}_1 \\odot \\sigma(\\mathbf{Z}_2)',
      symbols: [
        { symbol: '\\mathbf{P}^{k}', meaning: 'k-step diffusion — reach exactly k hops, never materialized as a dense matrix' },
        { symbol: 'K', meaning: 'diffusion order, the receptive field in hops; the single most important structural hyperparameter' },
        { symbol: '\\mathbf{W}_k', meaning: 'a separate channel mixing matrix per hop, so near and far neighbours are weighted differently' },
        { symbol: '\\odot \\sigma(\\cdot)', meaning: 'the gated linear unit on the temporal convolution — the gate decides which timesteps pass' },
      ],
    },
    rationale:
      'Two independent choices, and conflating them is the usual source of confusion. Spatially, the operator is a truncated polynomial in the transition matrix: hop k reaches exactly k steps out and gets its own weights, so the model is not forced to treat an immediate neighbour like a distant one. It is computed as K successive sparse products against the feature matrix, never as a matrix power — P raised to K is dense even when P is not, and materializing it turns a linear-in-edges operation into a quadratic-in-nodes one. Temporally, a causal gated convolution replaces a recurrence in the modern variants, which buys parallelism across time at the cost of a receptive field fixed by depth. Adam is standard; the loss surface is unremarkable and the training is stable, which is not true of most architectures in this category.',
    hyperparameters: [
      { name: 'diffusion order K', role: 'Receptive field in hops. Past 3 the operator over-smooths and every node converges to the graph average', typicalRange: '1 to 3' },
      { name: 'temporal kernel width', role: 'Timesteps mixed per layer; total temporal receptive field is depth times width minus depth', typicalRange: '2 to 6' },
      { name: 'hidden channels', role: 'Capacity per node per step; cost is quadratic in it for the channel mixing', typicalRange: '16 to 128' },
      { name: 'input window L', role: 'History fed in; must exceed the total temporal receptive field or the deeper layers see nothing', typicalRange: '12 to 96 steps' },
      { name: 'adjacency threshold', role: 'Where a Gaussian-kernel distance graph is cut to zero; controls sparsity and therefore the whole cost profile', typicalRange: '0.05 to 0.2' },
      { name: 'adaptive adjacency rank', role: 'For the learned-graph variants: rank of the node-embedding product that supplements the given graph', typicalRange: '10 to 40' },
    ],
    convergence:
      'Stable and unremarkable to train, which is the appeal — but with two characteristic and unrelated failures. The first is over-smoothing: increase K or depth and node representations converge toward the graph mean, so the model produces a well-behaved network-average forecast and loses exactly the local detail it was built for. The signature is validation error that improves with depth and then plateaus above the per-node baseline. The second is a wrong graph, which never announces itself: a physically implausible adjacency trains perfectly happily to a slightly worse result than no graph at all, and the only way to detect it is to ablate the graph and compare against an identity adjacency. That ablation should be the first experiment, not the last.',
    complexity:
      'O(K · |E| · C + N · C²) per layer per timestep — linear in edges for the diffusion, quadratic in channels for the mixing. The channel term usually dominates on a sparse road network. Parallel across nodes and, in the convolutional variants, across time; the recurrent variants surrender the latter.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Feed a window of L timesteps over all N nodes plus the adjacency, and emit all H horizons for all nodes in one pass. The graph is built from whatever encodes proximity in the domain — road-network distance, electrical topology, physical adjacency — and normalized to a transition matrix. Known covariates such as time of day enter as extra input channels on every node.',
        where: [
          'Traffic speed and volume forecasting on road sensor networks, the benchmark task this family was created for',
          'Electricity load and renewable generation across a grid, where the network topology is known exactly',
          'Ride-hailing and delivery demand over a spatial cell grid, with adjacency from cell contiguity',
          'Water and gas distribution network flow, where physical connectivity is documented and hydraulically meaningful',
        ],
        why: 'Worth its cost when the cross-series dependency is real, directional and known — and then the gain over a per-series model is large, because a downstream sensor genuinely does see upstream congestion later. The honest trigger is the graph, not the data volume: with a physically meaningful adjacency this is the right architecture, and with a graph built from correlation of the target it usually is not, since that graph is fitted to the training period and drifts. On a handful of series with no meaningful network it loses to gradient boosting on lag features, and it loses while costing far more to serve.',
        featurization: [
          'Build the adjacency from domain distance with a thresholded Gaussian kernel, and keep it sparse — a dense graph destroys both the cost profile and the locality',
          'Mask missing readings in the loss rather than imputing them, or the model learns the imputation as a target',
          'Scale globally across nodes rather than per node, so a node with sparse history borrows the shared scale',
          'Add time-of-day and day-of-week as input channels; without them the model spends capacity rediscovering the daily cycle',
          'Emit all horizons directly rather than decoding recursively, which stops the error compounding across the horizon',
        ],
        evaluation:
          'Rolling-origin backtesting reporting MAE, RMSE and MAPE per horizon separately — an aggregate over horizons hides that the short ones are easy. Two ablations are mandatory rather than optional: replace the adjacency with the identity, which measures what the graph is actually worth, and replace it with a random graph of the same density, which catches a model that is merely benefiting from smoothing.',
        pitfalls: [
          'A correlation-derived adjacency that is fitted to the training window and silently stale by deployment',
          'Over-smoothing at higher K producing a plausible network-average forecast that is worse than a per-node model',
          'Skipping the identity-adjacency ablation and therefore never learning whether the graph contributed anything',
          'Nodes added or removed after training, which most implementations cannot accommodate without a full retrain',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Train the forecaster on normal operation, then score each node at each step by how far the observation falls from its own prediction, normalized per node. Because the prediction conditions on the neighbours, a reading that is unremarkable in isolation but inconsistent with the rest of the network is caught — which is the specific class of fault a per-sensor threshold cannot see.',
        where: [
          'Sensor fault and drift detection in industrial and utility networks, distinguishing a broken sensor from a genuine local event',
          'Grid and pipeline monitoring, where a real fault propagates along the topology and an instrument failure does not',
          'Cellular and CDN performance monitoring, where the graph is the service topology',
          'Detecting the actual event — an accident, a burst main — as a coherent deviation across a neighbourhood of nodes',
        ],
        why: 'The graph earns its place here more clearly than in plain forecasting: the discriminating question is whether the neighbours agree, and a per-series detector cannot ask it. That makes the sensor-fault versus real-event distinction tractable, which is the one operators actually care about and the one that generates most false alarms. Against it: it needs a clean training period that is genuinely normal, the residual threshold has to be calibrated per node because sensors differ in noise, and it is the wrong tool entirely for point outliers in tabular data, where an isolation forest costs a thousandth as much.',
        featurization: [
          'Normalize residuals per node before thresholding; sensors differ in noise by an order of magnitude and a shared threshold alarms on the noisiest',
          'Score over a short window rather than a single step, since one-step residuals are dominated by noise',
          'Hold out a known-normal period for calibration that is separate from the training period',
          'Keep a graph-agreement term explicitly — whether the neighbours also deviated — as the feature that separates a sensor fault from an event',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget on labelled incidents, evaluated with a detection window rather than exact-timestep matching, since an alarm a minute early is a success. Report sensor faults and genuine events separately: they are different problems and a single number lets one hide behind the other.',
        pitfalls: [
          'A training period that quietly contains the faults you are trying to detect, which teaches the model they are normal',
          'One global residual threshold across heterogeneous sensors, which produces alerts ranked by noise rather than by anomaly',
          'Missing data reading as a large residual and alarming, when the correct response is to abstain',
          'Alarm storms as one real event propagates through the graph and every neighbouring node fires separately',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Two genuinely separate optimization problems sit inside this architecture. The first is the graph operator itself: a truncated polynomial in the transition matrix is a deliberate low-order approximation to a spectral filter, and the reason it is computed as K sparse products rather than a matrix power is that the exact power is dense — the same sparse-versus-dense reasoning that governs iterative linear solvers. The second is the adaptive-adjacency variants, where the graph becomes a learned low-rank node-embedding product, turning graph construction from a modelling decision into a constrained parameter estimation problem.',
        where: [
          'Chebyshev and diffusion polynomials as truncated approximations to a full spectral graph filter, avoiding an eigendecomposition entirely',
          'Repeated sparse matrix-vector products in place of a materialized matrix power, exactly as in Krylov methods',
          'Low-rank adaptive adjacency as learned structure under a rank constraint, when the true graph is unknown or wrong',
          'Downstream: the forecast feeds a network-level control problem — signal timing, dispatch, unit commitment — which is where the actual objective lives',
        ],
        why: 'Worth studying for the sparse-versus-dense lesson, which generalizes far beyond graphs: the whole architecture is fast because a k-hop operator is applied and never formed. It is also an honest example of a learned structural prior, where the rank constraint is doing the work that the missing domain knowledge would have done. What it is not is a solver — the forecast is an input to a downstream optimization, never the optimization itself, and treating a prediction as a decision is the standard mistake in the operational deployments.',
        featurization: [
          'Apply the operator as K successive sparse products; forming the power turns a linear-in-edges cost into a quadratic-in-nodes one',
          'Row-normalize the transition matrix so repeated application does not change the scale of the features',
          'Bound the adaptive-adjacency rank explicitly, or it fits training-period correlation and generalizes worse than the physical graph',
          'Keep the given graph alongside any learned one rather than replacing it, so the physical prior survives',
        ],
        evaluation:
          'Compare the truncated operator against a full spectral filter on a graph small enough to eigendecompose, to see what the truncation actually costs. For adaptive adjacency, compare the learned graph against the physical one structurally, not just by validation error — a learned graph that has no physical interpretation is a warning about the next distribution shift.',
        pitfalls: [
          'Materializing the k-hop matrix, which is the difference between a model that scales to a city and one that does not',
          'Raising K until the operator over-smooths, which improves training loss and degrades everything else',
          'Letting a learned adjacency replace the physical one, which discards the only part of the model that is guaranteed to still be true next year',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'The forecast becomes the state estimate a network-level controller acts on: predicted flows across a road network feed signal timing, predicted load across a grid feeds unit commitment and reserve procurement. The graph in the model is the same graph the controller acts over, which is what makes the two composable at all.',
        where: [
          'Adaptive traffic signal control taking a short-horizon network flow forecast as input',
          'Grid operations — reserve sizing, congestion management, curtailment planning',
          'Fleet repositioning against a forecast demand surface over spatial cells',
        ],
        why: 'The pairing is natural because the decision is network-level and so is the forecast; a per-node forecast fed to a network-level controller produces mutually inconsistent inputs. The real difficulty is not accuracy but that the model is trained on observed operation and the controller then changes that operation, so the deployment shifts the very distribution the model was fitted on — a feedback loop no amount of forecast accuracy addresses. Uncertainty also matters more than the point forecast here, and this family emits point forecasts natively.',
        featurization: [
          'Emit quantiles or an interval rather than a point, since the control decision is asymmetric in cost',
          'Include the control action as an input channel where it is known, or the model attributes its effect to the weather',
          'Keep the forecast horizon matched to the control interval — a longer horizon is wasted and a shorter one is unusable',
        ],
        evaluation:
          'Score the decision, not the forecast: regret against the decision made with hindsight. A model with worse MAE that is better calibrated in the tail frequently produces better decisions, and forecast-accuracy metrics will never show it.',
        pitfalls: [
          'The controller shifting the distribution the model was trained on, which degrades it in production in a way backtesting cannot reveal',
          'Optimizing MAE when the decision cost is asymmetric, so the model is tuned against the wrong objective',
          'Treating a point forecast as certain in a downstream optimizer, which produces confident and brittle plans',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on a single GPU for a few hundred nodes and a year of history — small by deep-learning standards, because the sparse operator is cheap and the model is shallow. The convolutional variants train several times faster than the recurrent ones, since they parallelize across time as well as nodes.',
    inferenceProfile:
      'One forward pass per network per interval, producing every node and horizon at once: milliseconds for a few hundred nodes. The graph is fixed, so the normalized adjacency is precomputed once and the serving path is a handful of sparse products. Batching over time windows is trivial and rarely needed, since the natural request rate is one per sampling interval.',
    retrainingCadence:
      'Monthly to quarterly under stable topology, and immediately on any topology change — a new sensor or a closed road invalidates the adjacency, which is a structural input rather than a feature.',
    driftAndMonitoring: [
      'Track per-node error, not the network aggregate; a few degraded sensors are invisible in the mean and are exactly what needs replacing',
      'Alert on the missing-data rate per node, since the mask silently absorbs a sensor that has stopped reporting',
      'Re-verify the adjacency against the current topology on a schedule; it is the input most likely to be quietly wrong',
      'Compare against the identity-adjacency baseline in production, not just at development time — the graph can stop helping',
    ],
    productionGotchas: [
      'Node identity is baked into the model. Adding or removing a sensor changes N and most implementations cannot serve the new network without a retrain',
      'The adjacency and its normalization are part of the model artifact and must be versioned with the weights; rebuilding it at load time from a changed distance table silently changes the model',
      'The scaler is fitted across nodes and must be persisted, never refitted at inference',
      'Missing inputs at serving time need an explicit policy — a mask channel the model was trained with, not a zero-fill that reads as a genuine reading of zero',
    ],
  },

  assumptions: [
    'The graph encodes real dependency between nodes and is stable over the deployment horizon — this is the load-bearing assumption and the one most often false',
    'Node set and topology are fixed between retrains; the architecture has no native way to handle a node it has never seen',
    'Spatial dependency is local enough to be captured within K hops, so the truncated operator loses nothing that matters',
    'All nodes are sampled on a common clock, with missingness handled by masking rather than by resampling',
    'The relationship between neighbours is stationary enough that patterns learned on history persist into the forecast window',
  ],

  pros: [
    {
      point: 'Exploits known network structure instead of learning it blind',
      context:
        'The decisive advantage when a physical graph exists: an upstream-to-downstream lag that a per-series model must infer from data is simply given. Worth nothing, and worse than nothing, when the graph is guessed or derived from target correlation.',
    },
    {
      point: 'One model serves every node, sharing strength across the network',
      context:
        'A newly instrumented sensor with weeks of history borrows the learned dynamics of the whole network. This is where most of the practical gain comes from and it is the same argument as for any global forecasting model.',
    },
    {
      point: 'Cost is linear in edges, not quadratic in nodes',
      context:
        'The k-hop operator is applied rather than formed, so a sparse city-scale network is entirely tractable. Only true if the graph is genuinely sparse — a dense adjacency removes this property completely.',
    },
    {
      point: 'Detects network-inconsistent readings, not just per-sensor outliers',
      context:
        'The prediction conditions on the neighbours, which makes the sensor-fault versus real-event distinction possible. That specific question is what a per-series detector fundamentally cannot answer.',
    },
  ],

  cons: [
    {
      point: 'Requires a graph, and a wrong graph fails silently',
      context:
        'A physically implausible adjacency trains happily to a slightly worse result than no graph at all, with no diagnostic anywhere. The identity-adjacency ablation is the only honest check and it is routinely skipped.',
    },
    {
      point: 'Over-smooths as depth or hop count grows',
      context:
        'Node representations converge toward the graph average, producing a smooth network-average forecast that loses the local detail the model exists for. Caps useful depth at two or three layers, which is genuinely limiting.',
    },
    {
      point: 'The node set is structural, not data',
      context:
        'Add a sensor and most implementations need a retrain. Decisive in a growing network, irrelevant in a fixed installation — and the difference is worth establishing before choosing the architecture.',
    },
    {
      point: 'Point forecasts with no native uncertainty',
      context:
        'A problem wherever the decision needs the tail — reserve sizing, capacity, dispatch. Requires a quantile head bolted on, and the interpretable-attention alternatives in this reference give it natively.',
    },
    {
      point: 'Substantially more machinery than the baseline it must beat',
      context:
        'Against gradient boosting on lag and neighbour-lag features it often wins by a few percent for an order of magnitude more operational complexity. On a small network with no meaningful topology it simply loses.',
    },
  ],

  relatedSlugs: ['graph-neural-network', 'lstm', 'tcn', 'temporal-fusion-transformer', 'kalman-filter'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""One spatio-temporal block, transcribed the way the equations read.

Two operations, alternated:

  spatial   Z = sum_k P^k X W_k        mix each node with its k-hop neighbours
  temporal  H = A * sigmoid(B)         a causal gated convolution over time

P is the row-normalized transition matrix D^-1 A. Note carefully that P^k is
APPLIED k times and never formed - forming it makes a sparse graph dense,
which is the difference between a model that scales to a city and one that
does not. Here that is just a loop; in the fast stage it is the whole point.

Plain loops, no libraries. Adjacency as a list of neighbour lists.
"""

import math

BLANK_MASK = -1.0


def row_normalize(adjacency):
    """D^-1 A as neighbour lists of (node, weight) with weights summing to 1."""
    normalized = []
    for row in adjacency:
        total = sum(weight for _, weight in row)
        if total == 0.0:
            normalized.append([])
            continue
        normalized.append([(node, weight / total) for node, weight in row])
    return normalized


def diffusion_conv(features, transition, weights_per_hop):
    """Z[n][c_out] = sum over hops k of (P^k X)[n] . W_k[:, c_out].

    features:        N x C_in
    transition:      neighbour lists of (node, weight)
    weights_per_hop: K + 1 matrices, each C_in x C_out
    """
    num_nodes = len(features)
    num_in = len(features[0])
    num_out = len(weights_per_hop[0][0])

    output = [[0.0] * num_out for _ in range(num_nodes)]

    # hop_features starts at X (k = 0) and is advanced one hop at a time by a
    # single sparse product. K products total, no matrix power anywhere.
    hop_features = [row[:] for row in features]

    for weights in weights_per_hop:
        for node in range(num_nodes):
            for channel_out in range(num_out):
                accumulated = 0.0
                for channel_in in range(num_in):
                    accumulated += hop_features[node][channel_in] * weights[channel_in][channel_out]
                output[node][channel_out] += accumulated

        # Advance one hop: next[n] = sum over neighbours m of P[n][m] * hop[m].
        advanced = [[0.0] * num_in for _ in range(num_nodes)]
        for node in range(num_nodes):
            for neighbour, weight in transition[node]:
                for channel_in in range(num_in):
                    advanced[node][channel_in] += weight * hop_features[neighbour][channel_in]
        hop_features = advanced

    return output


def gated_temporal_conv(sequence, kernel_value, kernel_gate, bias_value, bias_gate):
    """Causal 1D convolution over time with a gated linear unit.

    sequence: T x N x C_in. Returns (T - width + 1) x N x C_out - a causal
    convolution consumes width - 1 steps of context and cannot invent them.
    """
    num_steps = len(sequence)
    num_nodes = len(sequence[0])
    num_in = len(sequence[0][0])
    width = len(kernel_value)
    num_out = len(kernel_value[0][0])
    out_steps = num_steps - width + 1

    output = [[[0.0] * num_out for _ in range(num_nodes)] for _ in range(out_steps)]

    for step in range(out_steps):
        for node in range(num_nodes):
            for channel_out in range(num_out):
                value = bias_value[channel_out]
                gate = bias_gate[channel_out]
                for offset in range(width):
                    for channel_in in range(num_in):
                        observation = sequence[step + offset][node][channel_in]
                        value += observation * kernel_value[offset][channel_in][channel_out]
                        gate += observation * kernel_gate[offset][channel_in][channel_out]
                # The gate decides which timesteps pass. sigmoid(gate) near
                # zero closes the channel for this step entirely.
                opened = 1.0 / (1.0 + math.exp(-gate))
                output[step][node][channel_out] = value * opened

    return output


def masked_mae(predictions, targets, mask):
    """Sensor networks always have gaps. An unmasked loss trains the model to
    predict whatever was used to fill them."""
    total = 0.0
    counted = 0
    for step in range(len(predictions)):
        for node in range(len(predictions[step])):
            for horizon in range(len(predictions[step][node])):
                if not mask[step][node][horizon]:
                    continue
                total += abs(predictions[step][node][horizon] - targets[step][node][horizon])
                counted += 1
    if counted == 0:
        raise ValueError("every target in the batch is masked out")
    return total / counted


def stgcn_block(sequence, adjacency, temporal_a, temporal_b, spatial_weights):
    """The STGCN sandwich: temporal, then spatial, then temporal."""
    transition = row_normalize(adjacency)

    hidden = gated_temporal_conv(sequence, *temporal_a)

    # The graph operator is per-timestep: it mixes space, not time.
    mixed = [diffusion_conv(frame, transition, spatial_weights) for frame in hidden]

    return gated_temporal_conv(mixed, *temporal_b)
`,
        profile:
          'O(T * (K * |E| * C + N * C^2)) per block, with the channel mixing dominating on a sparse graph. Illustrative, not a measured benchmark: five nested Python loops in the temporal convolution means a 300-node network over 12 steps is already millions of interpreter iterations per block.',
      },

      'make-it-right': {
        code: `"""The same block, typed, with the graph in CSR and the shape contract checked.

What changes is the representation and the boundary. The adjacency becomes a
compressed sparse row structure, which is what makes "linear in edges" a
property of the code rather than of the maths. Every shape precondition is
checked once, up front, because a silent shape mismatch in a graph model
produces a plausible forecast rather than an error.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import NamedTuple, Sequence

Matrix = list[list[float]]
Tensor3 = list[list[list[float]]]


class CsrGraph(NamedTuple):
    """Row-normalized transition matrix in compressed sparse row form.

    indptr has num_nodes + 1 entries; the neighbours of node n are
    indices[indptr[n]:indptr[n + 1]] with the matching weights.
    """

    indptr: list[int]
    indices: list[int]
    weights: list[float]
    num_nodes: int

    def out_degree(self, node: int) -> int:
        return self.indptr[node + 1] - self.indptr[node]


@dataclass(frozen=True)
class BlockConfig:
    """Frozen so a block's shape contract cannot drift after construction."""

    num_nodes: int
    in_channels: int
    hidden_channels: int
    diffusion_order: int
    temporal_width: int

    def receptive_field(self) -> int:
        """A block is two causal convolutions, so it consumes twice the context."""
        return 2 * (self.temporal_width - 1) + 1


class ShapeMismatch(ValueError):
    """Raised on a shape violation rather than broadcasting past it."""


class DegenerateGraph(ValueError):
    """Raised when the graph cannot support the requested diffusion order."""


def build_csr(edges: Sequence[tuple[int, int, float]], num_nodes: int) -> CsrGraph:
    """Build a row-normalized CSR transition matrix from a weighted edge list.

    Row normalization matters: repeated application of an unnormalized
    adjacency changes the feature scale at every hop, and the model then
    spends its capacity undoing that.
    """
    if num_nodes <= 0:
        raise ShapeMismatch("a graph needs at least one node")

    by_row: list[list[tuple[int, float]]] = [[] for _ in range(num_nodes)]
    for source, target, weight in edges:
        if not 0 <= source < num_nodes or not 0 <= target < num_nodes:
            raise ShapeMismatch(f"edge ({source}, {target}) is outside the node range")
        if weight < 0.0:
            raise ShapeMismatch("a transition weight cannot be negative")
        by_row[source].append((target, weight))

    isolated = sum(1 for row in by_row if not row)
    if isolated == num_nodes:
        raise DegenerateGraph("every node is isolated; the graph operator is the identity")

    indptr = [0]
    indices: list[int] = []
    weights: list[float] = []
    for row in by_row:
        total = math.fsum(weight for _, weight in row)
        for target, weight in row:
            indices.append(target)
            weights.append(weight / total if total > 0.0 else 0.0)
        indptr.append(len(indices))

    return CsrGraph(indptr=indptr, indices=indices, weights=weights, num_nodes=num_nodes)


def spmm(graph: CsrGraph, features: Matrix) -> Matrix:
    """One sparse product: out[n] = sum over neighbours m of P[n][m] * X[m].

    The only place the graph is touched. Applying this k times gives P^k X
    without ever forming P^k, which is what keeps the cost linear in edges.
    """
    if len(features) != graph.num_nodes:
        raise ShapeMismatch(f"expected {graph.num_nodes} rows, got {len(features)}")

    num_channels = len(features[0])
    output = [[0.0] * num_channels for _ in range(graph.num_nodes)]

    for node in range(graph.num_nodes):
        row = output[node]
        for slot in range(graph.indptr[node], graph.indptr[node + 1]):
            weight = graph.weights[slot]
            neighbour = features[graph.indices[slot]]
            for channel in range(num_channels):
                row[channel] += weight * neighbour[channel]
    return output


def diffusion_conv(
    features: Matrix,
    graph: CsrGraph,
    weights_per_hop: Sequence[Matrix],
) -> Matrix:
    """Z = sum over hops k of (P^k X) W_k, hop by hop."""
    if not weights_per_hop:
        raise ShapeMismatch("a diffusion convolution needs at least the zero-hop term")

    num_out = len(weights_per_hop[0][0])
    output = [[0.0] * num_out for _ in range(graph.num_nodes)]
    hop = features

    for hop_index, weights in enumerate(weights_per_hop):
        if len(weights) != len(hop[0]):
            raise ShapeMismatch(f"hop {hop_index} weight has the wrong input width")
        for node, row in enumerate(hop):
            target = output[node]
            for channel_in, activation in enumerate(row):
                if activation == 0.0:
                    continue
                weight_row = weights[channel_in]
                for channel_out in range(num_out):
                    target[channel_out] += activation * weight_row[channel_out]
        if hop_index + 1 < len(weights_per_hop):
            hop = spmm(graph, hop)

    return output


def sigmoid(value: float) -> float:
    """Branch on the sign so exp never overflows on a large negative input."""
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


class TemporalKernel(NamedTuple):
    """Value and gate branches of one gated causal convolution."""

    value: Tensor3          # width x in_channels x out_channels
    gate: Tensor3
    value_bias: list[float]
    gate_bias: list[float]

    @property
    def width(self) -> int:
        return len(self.value)


def gated_temporal_conv(sequence: Tensor3, kernel: TemporalKernel) -> Tensor3:
    """Causal gated convolution over time. Output is width - 1 steps shorter."""
    if len(sequence) < kernel.width:
        raise ShapeMismatch(
            f"a width-{kernel.width} kernel needs at least that many steps, got {len(sequence)}"
        )

    num_nodes = len(sequence[0])
    num_out = len(kernel.value[0][0])
    out_steps = len(sequence) - kernel.width + 1
    output: Tensor3 = []

    for step in range(out_steps):
        frame = [[0.0] * num_out for _ in range(num_nodes)]
        for node in range(num_nodes):
            values = list(kernel.value_bias)
            gates = list(kernel.gate_bias)
            for offset in range(kernel.width):
                observations = sequence[step + offset][node]
                value_slab = kernel.value[offset]
                gate_slab = kernel.gate[offset]
                for channel_in, activation in enumerate(observations):
                    if activation == 0.0:
                        continue
                    value_row = value_slab[channel_in]
                    gate_row = gate_slab[channel_in]
                    for channel_out in range(num_out):
                        values[channel_out] += activation * value_row[channel_out]
                        gates[channel_out] += activation * gate_row[channel_out]
            frame[node] = [
                value * sigmoid(gate) for value, gate in zip(values, gates)
            ]
        output.append(frame)

    return output


def masked_mae(predictions: Tensor3, targets: Tensor3, observed: Sequence[Sequence[Sequence[bool]]]) -> float:
    """Mean absolute error over observed entries only.

    Guard clause first: an all-masked batch is a data-pipeline bug, and
    returning zero for it would let training proceed on nothing at all.
    """
    total = 0.0
    counted = 0
    for step, (prediction_frame, target_frame, mask_frame) in enumerate(
        zip(predictions, targets, observed)
    ):
        for node, (prediction_row, target_row, mask_row) in enumerate(
            zip(prediction_frame, target_frame, mask_frame)
        ):
            if len(prediction_row) != len(target_row):
                raise ShapeMismatch(f"step {step} node {node} horizon width disagrees")
            for prediction, target, is_observed in zip(prediction_row, target_row, mask_row):
                if not is_observed:
                    continue
                total += abs(prediction - target)
                counted += 1

    if counted == 0:
        raise ShapeMismatch("every target in the batch is masked out")
    return total / counted


def stgcn_block(
    sequence: Tensor3,
    graph: CsrGraph,
    config: BlockConfig,
    first: TemporalKernel,
    spatial: Sequence[Matrix],
    second: TemporalKernel,
) -> Tensor3:
    """Temporal, spatial, temporal. Preconditions checked before any work."""
    if len(sequence) < config.receptive_field():
        raise ShapeMismatch(
            f"block needs {config.receptive_field()} steps, got {len(sequence)}"
        )
    if len(spatial) != config.diffusion_order + 1:
        raise ShapeMismatch("one weight matrix per hop, including the zero-hop term")

    hidden = gated_temporal_conv(sequence, first)
    # The graph operator mixes space and never time: applied per frame.
    mixed = [diffusion_conv(frame, graph, spatial) for frame in hidden]
    return gated_temporal_conv(mixed, second)
`,
        rationale:
          'The graph representation is the substantive change. Neighbour lists become compressed sparse row, which is what turns "linear in the number of edges" from a claim about the mathematics into a property of the code — one flat traversal of indices and weights per hop, with no per-node allocation. Row normalization moves into the CSR construction where it belongs, since applying an unnormalized transition matrix repeatedly rescales the features at every hop and the model then wastes capacity undoing it. Shape preconditions are checked once at the boundary rather than trusted, because a graph model that receives the wrong shape produces a plausible forecast instead of an error, and the causal-convolution length contract — a block consumes twice the kernel width minus two steps of context — is stated in the config rather than rediscovered by the caller. The sigmoid branches on sign so a large negative gate cannot overflow, which the literal version does not survive.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Same asymptotics with a much better constant: CSR traversal is one pass over the edge arrays per hop instead of a nested list walk. Illustrative, not a measured benchmark — the sparsity skip on zero activations helps on ReLU-heavy hidden states and does nothing on dense inputs.',
      },

      'make-it-fast': {
        code: `"""Batched, vectorized, and fused. The hop loop stays; every other loop goes.

Three structural changes:

  1. The temporal convolution becomes one matrix product. A causal window of
     width w over T steps is a strided view of shape (T - w + 1, w, N, C),
     which reshapes to a 2-D matrix and multiplies against the flattened
     kernel. Value and gate branches are one product with 2 * C_out columns,
     so the two are fused rather than computed separately.
  2. The graph operator becomes a sparse-dense product per hop. K products,
     never a matrix power - the same rule as the literal version, but now the
     reason is visible: forming P^K would be a dense N x N allocation.
  3. The batch and time axes collapse into the leading dimension of a single
     BLAS call, so channel mixing is one GEMM instead of T separate ones.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray
from numpy.lib.stride_tricks import sliding_window_view
from scipy.sparse import csr_matrix

FLOAT = np.float32


class SpatioTemporalBlock:
    """Holds the graph and the pre-flattened kernels. Both are call-invariant."""

    def __init__(
        self,
        transition: csr_matrix,
        diffusion_order: int,
        temporal_width: int,
    ) -> None:
        if transition.shape[0] != transition.shape[1]:
            raise ValueError("the transition matrix must be square")

        # CSR with sorted indices and a single dtype: scipy dispatches to its
        # fast path only when both hold, and silently copies when they do not.
        transition = transition.astype(FLOAT)
        transition.sort_indices()
        self._transition = transition
        self._order = diffusion_order
        self._width = temporal_width
        self._num_nodes = transition.shape[0]

    def gated_temporal(
        self,
        sequence: NDArray[np.float32],
        kernel: NDArray[np.float32],
        bias: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        """sequence (B, T, N, C_in) -> (B, T - w + 1, N, C_out).

        kernel is (w * C_in, 2 * C_out): value and gate side by side, so one
        GEMM produces both branches and the gate is never a second pass.
        """
        batch, steps, nodes, channels = sequence.shape
        if steps < self._width:
            raise ValueError(f"need at least {self._width} steps, got {steps}")

        # A strided view, not a copy: the (w, C) window per output step is
        # materialized only by the reshape below, and only once.
        windows = sliding_window_view(sequence, self._width, axis=1)
        # (B, T', N, C, w) -> (B, T', N, w, C) -> flat rows of w * C
        windows = np.moveaxis(windows, -1, -2)
        out_steps = steps - self._width + 1
        flat = np.ascontiguousarray(
            windows.reshape(batch * out_steps * nodes, self._width * channels)
        )

        projected = flat @ kernel
        projected += bias
        value, gate = np.split(projected, 2, axis=1)

        # In-place sigmoid on the gate, then in-place multiply: the gated
        # output reuses the value buffer and no intermediate is materialized.
        np.negative(gate, out=gate)
        np.exp(gate, out=gate)
        gate += 1.0
        np.divide(value, gate, out=value)

        return value.reshape(batch, out_steps, nodes, -1)

    def diffusion(
        self,
        frames: NDArray[np.float32],
        weights: NDArray[np.float32],
    ) -> NDArray[np.float32]:
        """frames (B, T, N, C_in), weights (K + 1, C_in, C_out) -> (B, T, N, C_out).

        The hop loop is the only Python-level loop left, and it is K long.
        """
        batch, steps, nodes, channels = frames.shape
        if nodes != self._num_nodes:
            raise ValueError(f"expected {self._num_nodes} nodes, got {nodes}")

        # (B * T, N, C) with N in the middle: the sparse product needs nodes
        # as the leading axis of a 2-D operand, so the reshape below puts
        # (N, B * T * C) contiguously and the SpMM sees one dense block.
        hop = frames.reshape(batch * steps, nodes, channels)
        out_channels = weights.shape[2]
        output = np.zeros((batch * steps, nodes, out_channels), dtype=FLOAT)

        for hop_index in range(self._order + 1):
            # einsum over (BT, N, C_in) x (C_in, C_out) is one GEMM after the
            # implicit reshape, and it accumulates straight into output.
            output += np.einsum('bnc,co->bno', hop, weights[hop_index], optimize=True)
            if hop_index < self._order:
                # One sparse product advances every batch and timestep at
                # once: transpose nodes to the front, multiply, transpose back.
                as_matrix = hop.transpose(1, 0, 2).reshape(nodes, -1)
                advanced = self._transition @ as_matrix
                hop = advanced.reshape(nodes, batch * steps, channels).transpose(1, 0, 2)
                hop = np.ascontiguousarray(hop)

        return output.reshape(batch, steps, nodes, out_channels)


def masked_mae(
    predictions: NDArray[np.float32],
    targets: NDArray[np.float32],
    observed: NDArray[np.bool_],
) -> np.float32:
    """One pass, no boolean indexing - the mask becomes a weight.

    Boolean indexing would allocate a compacted copy of every observed value;
    multiplying by the mask and dividing by its sum touches each element once.
    """
    counted = observed.sum(dtype=np.int64)
    if counted == 0:
        raise ValueError("every target in the batch is masked out")

    residual = np.subtract(predictions, targets, dtype=FLOAT)
    np.abs(residual, out=residual)
    residual *= observed
    return residual.sum(dtype=np.float64) / counted
`,
        rationale:
          'The temporal convolution stops being a loop and becomes a single matrix product: a causal window of width w is a strided view over the time axis, and once flattened, mixing (w * C_in) inputs to C_out outputs is exactly a GEMM. The value and gate branches are concatenated into one kernel with twice the output width, so the gated linear unit costs one product rather than two, and the sigmoid-and-multiply runs in place over that buffer so the gated result never allocates. The graph operator becomes one sparse-dense product per hop with the batch and time axes folded into the dense operand, which means K SpMM calls total instead of K per timestep — and the hop loop remains, deliberately, because forming the matrix power is the thing this whole architecture is built to avoid. The loss turns the mask into a multiplicative weight rather than a boolean index, which avoids allocating a compacted copy of every observed value.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Both the temporal window mixing and the per-hop channel mixing become single GEMM calls covering the whole batch and every timestep at once.',
            tradeoff: 'The window flattening materializes a (T * N) by (w * C) matrix, so peak memory scales with the kernel width — a width-6 kernel holds six copies of the activations while the product runs.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Value and gate share one kernel and one product, the sigmoid and the multiply run in place over that buffer, and the per-hop mixing accumulates directly into the output array.',
            tradeoff: 'The value buffer is destroyed by the in-place gating, so nothing downstream can inspect the pre-gate activations — which is exactly what you want when debugging a dead gate.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Sorted-index float32 CSR is the only form scipy dispatches to its fast SpMM path for, and the transposes are re-contiguized so each hop product reads a dense block rather than a strided one.',
            tradeoff: 'Each hop pays an explicit copy to restore contiguity, and float32 accumulation over many hops and channels drifts measurably against float64 — visible on long-horizon forecasts where errors compound.',
          },
        ],
        libraryName: 'NumPy + SciPy sparse',
        profile:
          'K sparse products plus K GEMMs per block for the whole batch, against T * N * C^2 interpreter iterations. Illustrative, not a measured benchmark: the remaining cost is dominated by the channel-mixing GEMM on a sparse graph, which is why hidden width rather than node count sets the training budget.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// One spatio-temporal block, transcribed from the equations.
//
//   spatial   Z = sum_k P^k X W_k     mix each node with its k-hop neighbours
//   temporal  H = A * sigmoid(B)      a causal gated convolution over time
//
// P is the row-normalized transition matrix. P^k is APPLIED k times and never
// formed: a matrix power makes a sparse graph dense, which is the difference
// between a model that scales to a city and one that does not.
//
// Vector-of-vector throughout, which the next stage replaces.

#include <cmath>
#include <cstddef>
#include <vector>

using Matrix = std::vector<std::vector<double>>;
using Tensor3 = std::vector<Matrix>;

// One weighted edge out of a node.
struct Neighbour {
  std::size_t node;
  double weight;
};

std::vector<std::vector<Neighbour>> RowNormalize(
    const std::vector<std::vector<Neighbour>>& adjacency) {
  std::vector<std::vector<Neighbour>> normalized(adjacency.size());
  for (std::size_t n = 0; n < adjacency.size(); ++n) {
    double total = 0.0;
    for (std::size_t e = 0; e < adjacency[n].size(); ++e) {
      total += adjacency[n][e].weight;
    }
    if (total == 0.0) {
      continue;  // isolated node: the operator is the identity here
    }
    for (std::size_t e = 0; e < adjacency[n].size(); ++e) {
      normalized[n].push_back({adjacency[n][e].node, adjacency[n][e].weight / total});
    }
  }
  return normalized;
}

// Z[n][co] = sum over hops k of (P^k X)[n] . W_k[:, co]
Matrix DiffusionConv(const Matrix& features,
                     const std::vector<std::vector<Neighbour>>& transition,
                     const std::vector<Matrix>& weights_per_hop) {
  const std::size_t nodes = features.size();
  const std::size_t in_channels = features[0].size();
  const std::size_t out_channels = weights_per_hop[0][0].size();

  Matrix output(nodes, std::vector<double>(out_channels, 0.0));
  Matrix hop = features;  // k = 0 is X itself

  for (std::size_t k = 0; k < weights_per_hop.size(); ++k) {
    const Matrix& weights = weights_per_hop[k];
    for (std::size_t n = 0; n < nodes; ++n) {
      for (std::size_t co = 0; co < out_channels; ++co) {
        double accumulated = 0.0;
        for (std::size_t ci = 0; ci < in_channels; ++ci) {
          accumulated += hop[n][ci] * weights[ci][co];
        }
        output[n][co] += accumulated;
      }
    }

    if (k + 1 == weights_per_hop.size()) {
      break;
    }
    // Advance exactly one hop with a single sparse product.
    Matrix advanced(nodes, std::vector<double>(in_channels, 0.0));
    for (std::size_t n = 0; n < nodes; ++n) {
      for (std::size_t e = 0; e < transition[n].size(); ++e) {
        const Neighbour& edge = transition[n][e];
        for (std::size_t ci = 0; ci < in_channels; ++ci) {
          advanced[n][ci] += edge.weight * hop[edge.node][ci];
        }
      }
    }
    hop = advanced;
  }

  return output;
}

// Causal gated convolution over time. Output is width - 1 steps shorter: a
// causal filter consumes context it cannot invent.
Tensor3 GatedTemporalConv(const Tensor3& sequence,
                          const std::vector<Matrix>& kernel_value,
                          const std::vector<Matrix>& kernel_gate,
                          const std::vector<double>& bias_value,
                          const std::vector<double>& bias_gate) {
  const std::size_t steps = sequence.size();
  const std::size_t nodes = sequence[0].size();
  const std::size_t in_channels = sequence[0][0].size();
  const std::size_t width = kernel_value.size();
  const std::size_t out_channels = kernel_value[0][0].size();
  const std::size_t out_steps = steps - width + 1;

  Tensor3 output(out_steps, Matrix(nodes, std::vector<double>(out_channels, 0.0)));

  for (std::size_t t = 0; t < out_steps; ++t) {
    for (std::size_t n = 0; n < nodes; ++n) {
      for (std::size_t co = 0; co < out_channels; ++co) {
        double value = bias_value[co];
        double gate = bias_gate[co];
        for (std::size_t w = 0; w < width; ++w) {
          for (std::size_t ci = 0; ci < in_channels; ++ci) {
            const double observation = sequence[t + w][n][ci];
            value += observation * kernel_value[w][ci][co];
            gate += observation * kernel_gate[w][ci][co];
          }
        }
        // sigmoid(gate) near zero closes this channel for this step.
        output[t][n][co] = value / (1.0 + std::exp(-gate));
      }
    }
  }

  return output;
}

// Sensor networks always have gaps. An unmasked loss trains the model to
// predict whatever filled them.
double MaskedMae(const Tensor3& predictions, const Tensor3& targets,
                 const std::vector<std::vector<std::vector<bool>>>& observed) {
  double total = 0.0;
  std::size_t counted = 0;
  for (std::size_t t = 0; t < predictions.size(); ++t) {
    for (std::size_t n = 0; n < predictions[t].size(); ++n) {
      for (std::size_t h = 0; h < predictions[t][n].size(); ++h) {
        if (!observed[t][n][h]) {
          continue;
        }
        total += std::abs(predictions[t][n][h] - targets[t][n][h]);
        ++counted;
      }
    }
  }
  return counted == 0 ? 0.0 : total / static_cast<double>(counted);
}
`,
        profile:
          'O(T * (K * |E| * C + N * C^2)) per block. Illustrative, not a measured benchmark: five nested loops and a vector-of-vector layout mean every innermost access chases two pointers, so the traversal is bound by latency rather than by arithmetic.',
      },

      'make-it-right': {
        code: `// The same block, with CSR graph storage and a checked shape contract.
//
// The change that matters is representation: the graph becomes compressed
// sparse row, which is what makes "linear in edges" a property of the code
// rather than of the maths, and the activation tensors become flat buffers
// with explicit strides so a frame is a contiguous span.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace stgnn {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what)
      : std::invalid_argument(what) {}
};

// Row-normalized transition matrix. Rule of zero: every member owns itself,
// so the compiler generates copy, move and destruction correctly.
class CsrGraph {
 public:
  // Validation at the boundary: a graph that exists is one whose invariants
  // already hold, so SpMM below need not re-check them.
  CsrGraph(std::span<const std::size_t> sources,
           std::span<const std::size_t> targets,
           std::span<const double> weights, std::size_t num_nodes)
      : num_nodes_(num_nodes) {
    if (num_nodes == 0) {
      throw ShapeMismatch("a graph needs at least one node");
    }
    if (sources.size() != targets.size() || sources.size() != weights.size()) {
      throw ShapeMismatch("edge arrays have mismatched lengths");
    }

    std::vector<std::vector<std::pair<std::size_t, double>>> by_row(num_nodes);
    for (std::size_t e = 0; e < sources.size(); ++e) {
      if (sources[e] >= num_nodes || targets[e] >= num_nodes) {
        throw ShapeMismatch("an edge endpoint is outside the node range");
      }
      if (weights[e] < 0.0) {
        throw ShapeMismatch("a transition weight cannot be negative");
      }
      by_row[sources[e]].emplace_back(targets[e], weights[e]);
    }

    indptr_.reserve(num_nodes + 1);
    indptr_.push_back(0);
    for (auto& row : by_row) {
      // Sorted column indices make the SpMM inner loop a forward scan of the
      // feature matrix rather than a random walk through it.
      std::sort(row.begin(), row.end());
      const double total = std::accumulate(
          row.begin(), row.end(), 0.0,
          [](double acc, const auto& edge) { return acc + edge.second; });
      for (const auto& [target, weight] : row) {
        indices_.push_back(target);
        values_.push_back(total > 0.0 ? weight / total : 0.0);
      }
      indptr_.push_back(indices_.size());
    }
  }

  // out[n] = sum over neighbours m of P[n][m] * X[m]. The only place the
  // graph is touched; applying this k times gives P^k X without forming it.
  void Apply(std::span<const double> features, std::size_t channels,
             std::span<double> out) const {
    if (features.size() != num_nodes_ * channels) {
      throw ShapeMismatch("feature buffer does not match nodes * channels");
    }
    std::fill(out.begin(), out.end(), 0.0);

    for (std::size_t n = 0; n < num_nodes_; ++n) {
      double* row = out.data() + n * channels;
      for (std::size_t slot = indptr_[n]; slot < indptr_[n + 1]; ++slot) {
        const double weight = values_[slot];
        const double* neighbour = features.data() + indices_[slot] * channels;
        for (std::size_t c = 0; c < channels; ++c) {
          row[c] += weight * neighbour[c];
        }
      }
    }
  }

  [[nodiscard]] std::size_t num_nodes() const noexcept { return num_nodes_; }
  [[nodiscard]] std::size_t num_edges() const noexcept { return indices_.size(); }

 private:
  std::size_t num_nodes_;
  std::vector<std::size_t> indptr_;
  std::vector<std::size_t> indices_;
  std::vector<double> values_;
};

// The block's shape contract, stated once. A causal convolution consumes
// width - 1 steps of context, and a block is two of them.
struct BlockShape {
  std::size_t num_nodes{};
  std::size_t in_channels{};
  std::size_t hidden_channels{};
  std::size_t diffusion_order{};
  std::size_t temporal_width{};

  [[nodiscard]] std::size_t receptive_field() const noexcept {
    return 2 * (temporal_width - 1) + 1;
  }
};

// Branch on sign so a large negative gate cannot overflow exp.
[[nodiscard]] inline double Sigmoid(double value) noexcept {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

// Owns the scratch buffers so a repeated forward pass allocates nothing.
class SpatioTemporalBlock {
 public:
  SpatioTemporalBlock(CsrGraph graph, BlockShape shape)
      : graph_(std::move(graph)), shape_(shape) {
    if (shape_.temporal_width < 2) {
      throw ShapeMismatch("a gated temporal convolution needs width at least 2");
    }
    if (graph_.num_nodes() != shape_.num_nodes) {
      throw ShapeMismatch("graph node count disagrees with the block shape");
    }
    const std::size_t frame = shape_.num_nodes * shape_.hidden_channels;
    hop_.assign(frame, 0.0);
    advanced_.assign(frame, 0.0);
  }

  // features is nodes * in_channels for ONE timestep, row-major.
  // weights_per_hop is (order + 1) matrices of in_channels * out_channels.
  void Diffusion(std::span<const double> features, std::size_t in_channels,
                 std::span<const double> weights_per_hop,
                 std::size_t out_channels, std::span<double> out) {
    const std::size_t hops = shape_.diffusion_order + 1;
    if (weights_per_hop.size() != hops * in_channels * out_channels) {
      throw ShapeMismatch("one weight matrix per hop, including the zero-hop term");
    }

    std::fill(out.begin(), out.end(), 0.0);
    hop_.assign(features.begin(), features.end());

    for (std::size_t k = 0; k < hops; ++k) {
      const double* weights = weights_per_hop.data() + k * in_channels * out_channels;
      for (std::size_t n = 0; n < shape_.num_nodes; ++n) {
        const double* activations = hop_.data() + n * in_channels;
        double* target = out.data() + n * out_channels;
        for (std::size_t ci = 0; ci < in_channels; ++ci) {
          const double activation = activations[ci];
          if (activation == 0.0) {
            continue;
          }
          const double* weight_row = weights + ci * out_channels;
          for (std::size_t co = 0; co < out_channels; ++co) {
            target[co] += activation * weight_row[co];
          }
        }
      }
      if (k + 1 < hops) {
        advanced_.resize(shape_.num_nodes * in_channels);
        graph_.Apply(std::span<const double>(hop_.data(), shape_.num_nodes * in_channels),
                     in_channels, advanced_);
        hop_.swap(advanced_);
      }
    }
  }

  // sequence is steps * nodes * in_channels, row-major. Writes
  // (steps - width + 1) * nodes * out_channels.
  void GatedTemporal(std::span<const double> sequence, std::size_t steps,
                     std::size_t in_channels,
                     std::span<const double> kernel_value,
                     std::span<const double> kernel_gate,
                     std::span<const double> bias_value,
                     std::span<const double> bias_gate,
                     std::size_t out_channels, std::span<double> out) const {
    if (steps < shape_.temporal_width) {
      throw ShapeMismatch("sequence is shorter than the temporal kernel");
    }

    const std::size_t width = shape_.temporal_width;
    const std::size_t out_steps = steps - width + 1;
    const std::size_t frame_in = shape_.num_nodes * in_channels;

    for (std::size_t t = 0; t < out_steps; ++t) {
      for (std::size_t n = 0; n < shape_.num_nodes; ++n) {
        double* target = out.data() + (t * shape_.num_nodes + n) * out_channels;
        for (std::size_t co = 0; co < out_channels; ++co) {
          double value = bias_value[co];
          double gate = bias_gate[co];
          for (std::size_t w = 0; w < width; ++w) {
            const double* observations =
                sequence.data() + (t + w) * frame_in + n * in_channels;
            const double* value_slab = kernel_value.data() + (w * in_channels) * out_channels;
            const double* gate_slab = kernel_gate.data() + (w * in_channels) * out_channels;
            for (std::size_t ci = 0; ci < in_channels; ++ci) {
              value += observations[ci] * value_slab[ci * out_channels + co];
              gate += observations[ci] * gate_slab[ci * out_channels + co];
            }
          }
          target[co] = value * Sigmoid(gate);
        }
      }
    }
  }

  [[nodiscard]] const BlockShape& shape() const noexcept { return shape_; }

 private:
  CsrGraph graph_;
  BlockShape shape_;
  std::vector<double> hop_;
  std::vector<double> advanced_;
};

// An all-masked batch is a pipeline bug, and returning zero for it would let
// training proceed on nothing at all.
[[nodiscard]] inline double MaskedMae(std::span<const double> predictions,
                                      std::span<const double> targets,
                                      std::span<const unsigned char> observed) {
  if (predictions.size() != targets.size() || predictions.size() != observed.size()) {
    throw ShapeMismatch("prediction, target and mask lengths disagree");
  }

  double total = 0.0;
  std::size_t counted = 0;
  for (std::size_t i = 0; i < predictions.size(); ++i) {
    if (observed[i] == 0) {
      continue;
    }
    total += std::abs(predictions[i] - targets[i]);
    ++counted;
  }
  if (counted == 0) {
    throw ShapeMismatch("every target in the batch is masked out");
  }
  return total / static_cast<double>(counted);
}

}  // namespace stgnn
`,
        rationale:
          'The graph becomes compressed sparse row with sorted column indices, which is what makes the edge-linear cost a property of the code: the inner loop is a forward scan over the edge arrays and a forward scan over the feature matrix, rather than a random walk through a vector of vectors. The activation tensors flatten into single buffers with explicit strides, so a timestep is a contiguous span and the traversal is bandwidth-bound rather than latency-bound. The block owns its hop scratch and swaps buffers between hops rather than reallocating, and every precondition — width, node count, weight-array length — is checked at the constructor or the entry point, because a graph model handed the wrong shape produces a plausible forecast rather than an error. The sigmoid branches on sign, which the literal version does not survive on a large negative gate. All borrowed inputs arrive as spans, so the caller keeps ownership of its own activations and nothing is copied to call the block.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same asymptotics with a far better constant: CSR plus flat buffers turns every inner access into a stride-one read. Illustrative, not a measured benchmark — the sparsity skip on zero activations pays on ReLU-heavy hidden states and costs a branch on dense inputs.',
      },

      'make-it-fast': {
        code: `// Batched block: the channel mixing goes to BLAS, the graph stays sparse,
// and the parallelism goes on nodes.
//
// Three changes. The temporal convolution becomes one GEMM by materializing
// the causal window as a (T' * N) by (w * C_in) matrix, with the value and
// gate kernels concatenated so both branches come out of a single product.
// The graph operator stays a hand-written SpMM because no BLAS covers sparse
// times dense, and it parallelizes over nodes, which is the axis with no
// write conflicts. The hop loop survives on purpose: forming P^K is the
// dense allocation this architecture exists to avoid.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace stgnn {

// Row-major CSR with 32-bit indices: the index arrays are streamed once per
// hop, so halving their width measurably reduces the bandwidth they consume.
struct CsrView {
  const int* __restrict indptr;
  const int* __restrict indices;
  const float* __restrict values;
  int num_nodes;
};

class FastBlock {
 public:
  FastBlock(int num_nodes, int max_steps, int max_channels, int width, int order)
      : num_nodes_(num_nodes),
        width_(width),
        order_(order),
        // One allocation each, sized to the worst case, so the forward pass
        // never touches the allocator.
        window_(static_cast<std::size_t>(max_steps) * num_nodes * width * max_channels),
        projected_(static_cast<std::size_t>(max_steps) * num_nodes * 2 * max_channels),
        hop_(static_cast<std::size_t>(max_steps) * num_nodes * max_channels),
        advanced_(static_cast<std::size_t>(max_steps) * num_nodes * max_channels) {}

  // sequence: steps * nodes * in_channels, row-major.
  // kernel:   (width * in_channels) * (2 * out_channels) - value and gate
  //           side by side, so one GEMM produces both branches.
  void GatedTemporal(const float* __restrict sequence, int steps, int in_channels,
                     const float* __restrict kernel, const float* __restrict bias,
                     int out_channels, float* __restrict out) {
    const int out_steps = steps - width_ + 1;
    const int row_width = width_ * in_channels;
    const int rows = out_steps * num_nodes_;
    const int frame_in = num_nodes_ * in_channels;

    // Gather the causal windows into one contiguous matrix. This is the only
    // copy, and it is what turns a five-deep loop nest into a GEMM.
#pragma omp parallel for collapse(2) schedule(static)
    for (int t = 0; t < out_steps; ++t) {
      for (int n = 0; n < num_nodes_; ++n) {
        float* dst = window_.data() +
                     static_cast<std::size_t>(t * num_nodes_ + n) * row_width;
        for (int w = 0; w < width_; ++w) {
          const float* src = sequence +
                             static_cast<std::size_t>(t + w) * frame_in +
                             static_cast<std::size_t>(n) * in_channels;
          std::copy(src, src + in_channels, dst + w * in_channels);
        }
      }
    }

    // One GEMM for value and gate together: (rows x row_width) x
    // (row_width x 2 * out_channels).
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, 2 * out_channels,
                row_width, 1.0F, window_.data(), row_width, kernel,
                2 * out_channels, 0.0F, projected_.data(), 2 * out_channels);

    // Fused bias, sigmoid and gate-multiply in one pass over the result: the
    // value and gate halves are read together and only the product is stored.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* row = projected_.data() + static_cast<std::size_t>(r) * 2 * out_channels;
      float* target = out + static_cast<std::size_t>(r) * out_channels;
      for (int co = 0; co < out_channels; ++co) {
        const float value = row[co] + bias[co];
        const float gate = row[out_channels + co] + bias[out_channels + co];
        target[co] = value / (1.0F + std::exp(-gate));
      }
    }
  }

  // frames: steps * nodes * in_channels. weights: (order + 1) matrices of
  // in_channels * out_channels. Accumulates into out.
  void Diffusion(const float* __restrict frames, int steps, int in_channels,
                 const float* __restrict weights, int out_channels,
                 const CsrView& graph, float* __restrict out) {
    const std::size_t frame_in = static_cast<std::size_t>(steps) * num_nodes_ * in_channels;
    const int rows = steps * num_nodes_;

    std::fill(out, out + static_cast<std::size_t>(rows) * out_channels, 0.0F);
    std::copy(frames, frames + frame_in, hop_.data());

    for (int k = 0; k <= order_; ++k) {
      // Channel mixing for every step and node at once: one GEMM per hop,
      // accumulating into out with beta = 1.
      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, out_channels,
                  in_channels, 1.0F, hop_.data(), in_channels,
                  weights + static_cast<std::size_t>(k) * in_channels * out_channels,
                  out_channels, 1.0F, out, out_channels);

      if (k == order_) {
        break;
      }
      Spmm(graph, hop_.data(), steps, in_channels, advanced_.data());
      hop_.swap(advanced_);
    }
  }

 private:
  // Sparse times dense, parallel over nodes. Nodes are the right axis: each
  // thread owns whole output rows, so there are no write conflicts and no
  // reduction, and the only shared reads are the feature rows.
  void Spmm(const CsrView& graph, const float* __restrict features, int steps,
            int channels, float* __restrict out) const {
    const std::size_t frame = static_cast<std::size_t>(num_nodes_) * channels;

#pragma omp parallel for collapse(2) schedule(static)
    for (int t = 0; t < steps; ++t) {
      for (int n = 0; n < graph.num_nodes; ++n) {
        float* row = out + static_cast<std::size_t>(t) * frame +
                     static_cast<std::size_t>(n) * channels;
        std::fill(row, row + channels, 0.0F);
        const int begin = graph.indptr[n];
        const int end = graph.indptr[n + 1];
        for (int slot = begin; slot < end; ++slot) {
          const float weight = graph.values[slot];
          const float* neighbour = features + static_cast<std::size_t>(t) * frame +
                                   static_cast<std::size_t>(graph.indices[slot]) * channels;
          // Contiguous and restrict-qualified, so this autovectorizes
          // without an intrinsic in sight.
          for (int c = 0; c < channels; ++c) {
            row[c] += weight * neighbour[c];
          }
        }
      }
    }
  }

  int num_nodes_;
  int width_;
  int order_;
  std::vector<float> window_;
  std::vector<float> projected_;
  std::vector<float> hop_;
  std::vector<float> advanced_;
};

// Masked MAE as one reduction. The mask multiplies rather than branches, so
// the loop stays vectorizable and the count comes out of the same pass.
[[nodiscard]] inline double MaskedMae(std::span<const float> predictions,
                                      std::span<const float> targets,
                                      std::span<const float> observed) {
  double total = 0.0;
  double counted = 0.0;

#pragma omp parallel for reduction(+ : total, counted) schedule(static)
  for (std::size_t i = 0; i < predictions.size(); ++i) {
    const float weight = observed[i];
    total += weight * std::abs(predictions[i] - targets[i]);
    counted += weight;
  }
  return counted == 0.0 ? 0.0 : total / counted;
}

}  // namespace stgnn
`,
        rationale:
          'The temporal convolution stops being a five-deep loop nest and becomes a single GEMM: the causal windows are gathered once into a contiguous (T prime times N) by (width times channels) matrix, and the value and gate kernels are concatenated so both branches emerge from one product instead of two. Bias, sigmoid and the gate multiply then fuse into one pass over that result, so neither branch is ever materialized separately. The graph operator stays hand-written because no BLAS covers sparse-times-dense, but it parallelizes over nodes — the axis where each thread owns whole output rows, so there is no reduction and no write conflict anywhere — and its inner loop over channels is contiguous and restrict-qualified, which is all the compiler needs to vectorize it. The hop loop survives deliberately, and the buffers are allocated once at construction so the forward pass never enters the allocator. Index arrays drop to 32 bits because they are streamed in full on every hop and their bandwidth is a measurable share of the sparse product.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Both the temporal window mixing and the per-hop channel mixing are dense matrix products, and the per-hop one accumulates in place with beta = 1 so the hop sum needs no separate add.',
            tradeoff: 'The window gather is a real copy — width times the activation memory — so peak footprint scales with kernel width, and a wide kernel can cost more in bandwidth than the GEMM saves in arithmetic.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The window gather, the fused gating pass and the sparse product are all embarrassingly parallel over (step, node), with each thread owning whole output rows.',
            tradeoff: 'Sparse rows vary wildly in length on a real road network, so static scheduling leaves threads idle on the short rows while dynamic scheduling adds per-chunk overhead to a loop that is already memory-bound.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Nodes-then-channels row-major with sorted CSR indices makes both the feature reads and the accumulation stride-one, so the prefetcher tracks the sparse product despite the indirection.',
            tradeoff: 'Every scratch buffer is sized to the worst-case step count and channel width, so a block configured for the largest layer holds that footprint permanently regardless of what it is actually asked to process.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the feature, output and CSR arrays may overlap, and reloads the accumulator on every iteration of the sparse inner loop.',
            tradeoff: 'Restrict is an unchecked promise: hand it overlapping buffers — easy to do when swapping hop scratch — and the result is silently wrong rather than slow.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'K GEMMs plus K sparse products per block for the whole batch, versus T * N * C^2 scalar iterations. Illustrative, not a measured benchmark: the GEMMs run near machine peak while the sparse product is bandwidth-bound, so on a sparse graph the profile is dominated by the dense channel mixing and hidden width sets the budget.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// One spatio-temporal block, transcribed from the equations.
//
//   spatial   Z = sum_k P^k X W_k     mix each node with its k-hop neighbours
//   temporal  H = A * sigmoid(B)      a causal gated convolution over time
//
// P is the row-normalized transition matrix D^-1 A. Note that P^k is APPLIED
// k times and never formed: a matrix power turns a sparse graph dense, which
// is the difference between a model that scales to a city and one that does
// not. Here that is only a loop; in the fast stage it is the whole point.
//
// Vec-of-Vec, index loops, panics on bad input. The next stage replaces all
// three.

/// One weighted edge out of a node.
struct Neighbour {
    node: usize,
    weight: f64,
}

fn row_normalize(adjacency: &[Vec<Neighbour>]) -> Vec<Vec<Neighbour>> {
    let mut normalized = Vec::new();
    for row in adjacency {
        let total: f64 = row.iter().map(|edge| edge.weight).sum();
        if total == 0.0 {
            normalized.push(Vec::new()); // isolated node
            continue;
        }
        let mut scaled = Vec::new();
        for edge in row {
            scaled.push(Neighbour {
                node: edge.node,
                weight: edge.weight / total,
            });
        }
        normalized.push(scaled);
    }
    normalized
}

/// Z[n][co] = sum over hops k of (P^k X)[n] . W_k[:, co]
fn diffusion_conv(
    features: &[Vec<f64>],
    transition: &[Vec<Neighbour>],
    weights_per_hop: &[Vec<Vec<f64>>],
) -> Vec<Vec<f64>> {
    let nodes = features.len();
    let in_channels = features[0].len();
    let out_channels = weights_per_hop[0][0].len();

    let mut output = vec![vec![0.0_f64; out_channels]; nodes];
    let mut hop: Vec<Vec<f64>> = features.to_vec(); // k = 0 is X itself

    for (k, weights) in weights_per_hop.iter().enumerate() {
        for n in 0..nodes {
            for co in 0..out_channels {
                let mut accumulated = 0.0;
                for ci in 0..in_channels {
                    accumulated += hop[n][ci] * weights[ci][co];
                }
                output[n][co] += accumulated;
            }
        }

        if k + 1 == weights_per_hop.len() {
            break;
        }
        // Advance exactly one hop with a single sparse product.
        let mut advanced = vec![vec![0.0_f64; in_channels]; nodes];
        for n in 0..nodes {
            for edge in &transition[n] {
                for ci in 0..in_channels {
                    advanced[n][ci] += edge.weight * hop[edge.node][ci];
                }
            }
        }
        hop = advanced;
    }

    output
}

/// Causal gated convolution over time. Output is width - 1 steps shorter: a
/// causal filter consumes context it cannot invent.
fn gated_temporal_conv(
    sequence: &[Vec<Vec<f64>>],
    kernel_value: &[Vec<Vec<f64>>],
    kernel_gate: &[Vec<Vec<f64>>],
    bias_value: &[f64],
    bias_gate: &[f64],
) -> Vec<Vec<Vec<f64>>> {
    let steps = sequence.len();
    let nodes = sequence[0].len();
    let in_channels = sequence[0][0].len();
    let width = kernel_value.len();
    let out_channels = kernel_value[0][0].len();
    let out_steps = steps - width + 1;

    let mut output = vec![vec![vec![0.0_f64; out_channels]; nodes]; out_steps];

    for t in 0..out_steps {
        for n in 0..nodes {
            for co in 0..out_channels {
                let mut value = bias_value[co];
                let mut gate = bias_gate[co];
                for w in 0..width {
                    for ci in 0..in_channels {
                        let observation = sequence[t + w][n][ci];
                        value += observation * kernel_value[w][ci][co];
                        gate += observation * kernel_gate[w][ci][co];
                    }
                }
                // sigmoid(gate) near zero closes this channel for this step.
                output[t][n][co] = value / (1.0 + (-gate).exp());
            }
        }
    }

    output
}

/// Sensor networks always have gaps. An unmasked loss trains the model to
/// predict whatever filled them.
fn masked_mae(
    predictions: &[Vec<Vec<f64>>],
    targets: &[Vec<Vec<f64>>],
    observed: &[Vec<Vec<bool>>],
) -> f64 {
    let mut total = 0.0;
    let mut counted = 0_usize;
    for t in 0..predictions.len() {
        for n in 0..predictions[t].len() {
            for h in 0..predictions[t][n].len() {
                if !observed[t][n][h] {
                    continue;
                }
                total += (predictions[t][n][h] - targets[t][n][h]).abs();
                counted += 1;
            }
        }
    }
    if counted == 0 {
        return 0.0;
    }
    total / counted as f64
}

/// The STGCN sandwich: temporal, then spatial, then temporal.
fn stgcn_block(
    sequence: &[Vec<Vec<f64>>],
    adjacency: &[Vec<Neighbour>],
    spatial_weights: &[Vec<Vec<f64>>],
    first: (&[Vec<Vec<f64>>], &[Vec<Vec<f64>>], &[f64], &[f64]),
    second: (&[Vec<Vec<f64>>], &[Vec<Vec<f64>>], &[f64], &[f64]),
) -> Vec<Vec<Vec<f64>>> {
    let transition = row_normalize(adjacency);

    let hidden = gated_temporal_conv(sequence, first.0, first.1, first.2, first.3);

    // The graph operator mixes space and never time: applied per frame.
    let mixed: Vec<Vec<Vec<f64>>> = hidden
        .iter()
        .map(|frame| diffusion_conv(frame, &transition, spatial_weights))
        .collect();

    gated_temporal_conv(&mixed, second.0, second.1, second.2, second.3)
}
`,
        profile:
          'O(T * (K * |E| * C + N * C^2)) per block. Illustrative, not a measured benchmark: three levels of Vec-of-Vec means every innermost access chases two pointers and carries a bounds check the compiler cannot hoist, so this is latency-bound long before it is arithmetic-bound.',
      },

      'make-it-right': {
        code: `//! The same block, with CSR graph storage, flat tensors and typed errors.
//!
//! The representational change is the substantive one: the graph becomes
//! compressed sparse row, which makes "linear in edges" a property of the
//! code rather than of the maths, and the activation tensors become flat Vecs
//! with explicit strides so a timestep is a contiguous slice. Shape errors
//! become variants a caller can match on, because a graph model handed the
//! wrong shape produces a plausible forecast rather than a panic.

use std::fmt;

/// Number of graph nodes. Distinct from Channels so the two cannot swap.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct NodeCount(pub usize);

/// Number of feature channels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Channels(pub usize);

/// Number of timesteps in a window.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Steps(pub usize);

#[derive(Debug, PartialEq, Eq)]
pub enum BlockError {
    /// An edge endpoint lies outside the declared node range.
    EdgeOutOfRange { node: usize, nodes: usize },
    /// A transition weight was negative, so row normalization is meaningless.
    NegativeWeight,
    /// Every node is isolated: the graph operator degenerates to the identity.
    DegenerateGraph,
    /// A buffer length does not match the shape it is supposed to carry.
    ShapeMismatch { expected: usize, found: usize },
    /// The sequence is shorter than the causal kernel needs.
    SequenceTooShort { steps: usize, required: usize },
    /// Every target in the batch is masked out - a pipeline bug, not a zero.
    FullyMasked,
}

impl fmt::Display for BlockError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EdgeOutOfRange { node, nodes } => {
                write!(f, "edge endpoint {node} outside a {nodes}-node graph")
            }
            Self::NegativeWeight => write!(f, "a transition weight cannot be negative"),
            Self::DegenerateGraph => write!(f, "every node is isolated"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::SequenceTooShort { steps, required } => {
                write!(f, "{steps} steps is short of the {required} the kernel needs")
            }
            Self::FullyMasked => write!(f, "every target in the batch is masked out"),
        }
    }
}

impl std::error::Error for BlockError {}

/// Row-normalized transition matrix in compressed sparse row form.
pub struct CsrGraph {
    indptr: Vec<usize>,
    indices: Vec<usize>,
    values: Vec<f64>,
    nodes: NodeCount,
}

impl CsrGraph {
    /// Validation lives here, so \`apply\` can assume its invariants hold.
    ///
    /// Row normalization belongs in construction: applying an unnormalized
    /// adjacency repeatedly rescales the features at every hop, and the model
    /// then spends capacity undoing it.
    pub fn from_edges(
        edges: &[(usize, usize, f64)],
        nodes: NodeCount,
    ) -> Result<Self, BlockError> {
        let mut by_row: Vec<Vec<(usize, f64)>> = vec![Vec::new(); nodes.0];
        for &(source, target, weight) in edges {
            if source >= nodes.0 {
                return Err(BlockError::EdgeOutOfRange { node: source, nodes: nodes.0 });
            }
            if target >= nodes.0 {
                return Err(BlockError::EdgeOutOfRange { node: target, nodes: nodes.0 });
            }
            if weight < 0.0 {
                return Err(BlockError::NegativeWeight);
            }
            by_row[source].push((target, weight));
        }

        if by_row.iter().all(Vec::is_empty) {
            return Err(BlockError::DegenerateGraph);
        }

        let mut indptr = Vec::with_capacity(nodes.0 + 1);
        let mut indices = Vec::with_capacity(edges.len());
        let mut values = Vec::with_capacity(edges.len());
        indptr.push(0);

        for row in &mut by_row {
            // Sorted columns make the inner loop a forward scan of the feature
            // matrix rather than a random walk through it.
            row.sort_unstable_by_key(|&(target, _)| target);
            let total: f64 = row.iter().map(|&(_, weight)| weight).sum();
            for &(target, weight) in row.iter() {
                indices.push(target);
                values.push(if total > 0.0 { weight / total } else { 0.0 });
            }
            indptr.push(indices.len());
        }

        Ok(Self { indptr, indices, values, nodes })
    }

    /// out[n] = sum over neighbours m of P[n][m] * X[m].
    ///
    /// The only place the graph is touched. Applying this k times gives
    /// P^k X without ever forming P^k.
    pub fn apply(
        &self,
        features: &[f64],
        channels: Channels,
        out: &mut [f64],
    ) -> Result<(), BlockError> {
        let expected = self.nodes.0 * channels.0;
        if features.len() != expected {
            return Err(BlockError::ShapeMismatch { expected, found: features.len() });
        }
        if out.len() != expected {
            return Err(BlockError::ShapeMismatch { expected, found: out.len() });
        }

        out.fill(0.0);
        for (node, row) in out.chunks_exact_mut(channels.0).enumerate() {
            for slot in self.indptr[node]..self.indptr[node + 1] {
                let weight = self.values[slot];
                let start = self.indices[slot] * channels.0;
                let neighbour = &features[start..start + channels.0];
                // Zipped slices: one fused walk, no per-element bounds check.
                for (accumulator, &value) in row.iter_mut().zip(neighbour) {
                    *accumulator += weight * value;
                }
            }
        }
        Ok(())
    }

    pub fn nodes(&self) -> NodeCount {
        self.nodes
    }
}

/// The block's shape contract. A causal convolution consumes width - 1 steps
/// of context, and a block is two of them back to back.
#[derive(Debug, Clone, Copy)]
pub struct BlockShape {
    pub nodes: NodeCount,
    pub in_channels: Channels,
    pub hidden_channels: Channels,
    pub diffusion_order: usize,
    pub temporal_width: usize,
}

impl BlockShape {
    pub fn receptive_field(&self) -> usize {
        2 * (self.temporal_width - 1) + 1
    }
}

/// Branch on sign so a large negative gate cannot overflow exp.
fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// Owns the hop scratch so a repeated forward pass allocates nothing.
pub struct SpatioTemporalBlock {
    graph: CsrGraph,
    shape: BlockShape,
    hop: Vec<f64>,
    advanced: Vec<f64>,
}

impl SpatioTemporalBlock {
    pub fn new(graph: CsrGraph, shape: BlockShape) -> Result<Self, BlockError> {
        if shape.temporal_width < 2 {
            return Err(BlockError::SequenceTooShort { steps: shape.temporal_width, required: 2 });
        }
        if graph.nodes() != shape.nodes {
            return Err(BlockError::ShapeMismatch {
                expected: shape.nodes.0,
                found: graph.nodes().0,
            });
        }
        let frame = shape.nodes.0 * shape.hidden_channels.0;
        Ok(Self { graph, shape, hop: vec![0.0; frame], advanced: vec![0.0; frame] })
    }

    /// \`features\` is one timestep, nodes * in_channels row-major.
    /// \`weights_per_hop\` is (order + 1) matrices of in_channels * out_channels.
    pub fn diffusion(
        &mut self,
        features: &[f64],
        in_channels: Channels,
        weights_per_hop: &[f64],
        out_channels: Channels,
        out: &mut [f64],
    ) -> Result<(), BlockError> {
        let hops = self.shape.diffusion_order + 1;
        let expected = hops * in_channels.0 * out_channels.0;
        if weights_per_hop.len() != expected {
            return Err(BlockError::ShapeMismatch { expected, found: weights_per_hop.len() });
        }

        out.fill(0.0);
        self.hop.resize(features.len(), 0.0);
        self.hop.copy_from_slice(features);
        self.advanced.resize(features.len(), 0.0);

        for k in 0..hops {
            let base = k * in_channels.0 * out_channels.0;
            let weights = &weights_per_hop[base..base + in_channels.0 * out_channels.0];

            for (activations, target) in self
                .hop
                .chunks_exact(in_channels.0)
                .zip(out.chunks_exact_mut(out_channels.0))
            {
                for (ci, &activation) in activations.iter().enumerate() {
                    if activation == 0.0 {
                        continue;
                    }
                    let row = &weights[ci * out_channels.0..(ci + 1) * out_channels.0];
                    for (accumulator, &weight) in target.iter_mut().zip(row) {
                        *accumulator += activation * weight;
                    }
                }
            }

            if k + 1 < hops {
                self.graph.apply(&self.hop, in_channels, &mut self.advanced)?;
                std::mem::swap(&mut self.hop, &mut self.advanced);
            }
        }
        Ok(())
    }

    /// \`sequence\` is steps * nodes * in_channels, row-major.
    /// Writes (steps - width + 1) * nodes * out_channels.
    pub fn gated_temporal(
        &self,
        sequence: &[f64],
        steps: Steps,
        in_channels: Channels,
        kernel_value: &[f64],
        kernel_gate: &[f64],
        bias_value: &[f64],
        bias_gate: &[f64],
        out_channels: Channels,
        out: &mut [f64],
    ) -> Result<(), BlockError> {
        let width = self.shape.temporal_width;
        if steps.0 < width {
            return Err(BlockError::SequenceTooShort { steps: steps.0, required: width });
        }

        let out_steps = steps.0 - width + 1;
        let frame_in = self.shape.nodes.0 * in_channels.0;

        for t in 0..out_steps {
            for n in 0..self.shape.nodes.0 {
                let target_start = (t * self.shape.nodes.0 + n) * out_channels.0;
                let target = &mut out[target_start..target_start + out_channels.0];
                target.copy_from_slice(bias_value);

                let mut gates = bias_gate.to_vec();
                for w in 0..width {
                    let start = (t + w) * frame_in + n * in_channels.0;
                    let observations = &sequence[start..start + in_channels.0];
                    for (ci, &activation) in observations.iter().enumerate() {
                        if activation == 0.0 {
                            continue;
                        }
                        let slab = (w * in_channels.0 + ci) * out_channels.0;
                        let value_row = &kernel_value[slab..slab + out_channels.0];
                        let gate_row = &kernel_gate[slab..slab + out_channels.0];
                        for ((value, &vw), (gate, &gw)) in target
                            .iter_mut()
                            .zip(value_row)
                            .zip(gates.iter_mut().zip(gate_row))
                        {
                            *value += activation * vw;
                            *gate += activation * gw;
                        }
                    }
                }
                for (value, &gate) in target.iter_mut().zip(gates.iter()) {
                    *value *= sigmoid(gate);
                }
            }
        }
        Ok(())
    }
}

/// Mean absolute error over observed entries only. An all-masked batch is a
/// pipeline bug, not a zero loss, so it becomes an error.
pub fn masked_mae(
    predictions: &[f64],
    targets: &[f64],
    observed: &[bool],
) -> Result<f64, BlockError> {
    if predictions.len() != targets.len() {
        return Err(BlockError::ShapeMismatch {
            expected: predictions.len(),
            found: targets.len(),
        });
    }

    let (total, counted) = predictions
        .iter()
        .zip(targets)
        .zip(observed)
        .filter(|&(_, &is_observed)| is_observed)
        .fold((0.0_f64, 0_usize), |(sum, count), ((prediction, target), _)| {
            (sum + (prediction - target).abs(), count + 1)
        });

    if counted == 0 {
        return Err(BlockError::FullyMasked);
    }
    Ok(total / counted as f64)
}
`,
        rationale:
          'The graph becomes compressed sparse row with sorted column indices, which is what makes the edge-linear cost a property of the code: one forward scan over the edge arrays per hop, with the feature reads also moving forward rather than jumping. Activation tensors flatten into single Vecs with explicit strides so a timestep is a contiguous slice and chunks_exact can walk it without indexing, which is also where the bounds checks go. The five ways this block actually fails — an out-of-range edge, a negative weight, a degenerate graph, a shape mismatch, a sequence shorter than the kernel — each become an error variant a caller can match on and handle, rather than a panic in the middle of a training step. Node, channel and step counts become newtypes because they are all usize and are genuinely swapped in practice, and row normalization moves into construction where it belongs, since applying an unnormalized transition matrix repeatedly rescales the features at every hop. The hop scratch is owned and swapped rather than reallocated per hop.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same asymptotics with a far better constant: flat buffers plus chunks_exact turns every inner access into a stride-one read with the bounds check hoisted out. Illustrative, not a measured benchmark — the zero-activation skip pays on ReLU-heavy hidden states and costs a branch on dense inputs.',
      },

      'make-it-fast': {
        code: `//! Batched block: ndarray with BLAS for the dense mixing, rayon over nodes
//! for the sparse product.
//!
//! Three changes. The temporal convolution becomes one GEMM by gathering the
//! causal windows into a (T' * N) by (w * C_in) matrix, with the value and
//! gate kernels concatenated so a single product yields both branches. The
//! graph operator stays a hand-written sparse product because no BLAS covers
//! sparse times dense, and it parallelizes over nodes - the axis where each
//! thread owns whole output rows, so there is no reduction and no locking.
//! The hop loop survives deliberately: forming P^K is the dense allocation
//! this entire architecture exists to avoid.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// CSR view with 32-bit indices: the index arrays are streamed in full on
/// every hop, so halving their width measurably cuts the bandwidth they cost.
pub struct CsrView<'a> {
    pub indptr: &'a [i32],
    pub indices: &'a [i32],
    pub values: &'a [f32],
    pub nodes: usize,
}

pub struct FastBlock {
    nodes: usize,
    width: usize,
    order: usize,
    /// Window gather buffer, allocated once at the worst-case size so the
    /// forward pass never touches the allocator.
    window: Array2<f32>,
    hop: Array2<f32>,
    advanced: Array2<f32>,
}

impl FastBlock {
    pub fn new(nodes: usize, max_steps: usize, max_channels: usize, width: usize, order: usize) -> Self {
        Self {
            nodes,
            width,
            order,
            window: Array2::zeros((max_steps * nodes, width * max_channels)),
            hop: Array2::zeros((max_steps * nodes, max_channels)),
            advanced: Array2::zeros((max_steps * nodes, max_channels)),
        }
    }

    /// \`sequence\` is (steps * nodes, in_channels) row-major.
    /// \`kernel\` is (width * in_channels, 2 * out_channels): value and gate
    /// side by side, so one GEMM produces both branches.
    pub fn gated_temporal(
        &mut self,
        sequence: ArrayView2<'_, f32>,
        steps: usize,
        in_channels: usize,
        kernel: ArrayView2<'_, f32>,
        bias: &[f32],
        out_channels: usize,
    ) -> Array2<f32> {
        let out_steps = steps - self.width + 1;
        let row_width = self.width * in_channels;
        let rows = out_steps * self.nodes;

        // Gather the causal windows into one contiguous matrix. The only copy
        // in here, and what turns a four-deep loop nest into a GEMM.
        {
            let mut window = self.window.slice_mut(s![..rows, ..row_width]);
            window
                .axis_iter_mut(Axis(0))
                .into_par_iter()
                .enumerate()
                .for_each(|(row, mut dst)| {
                    let t = row / self.nodes;
                    let n = row % self.nodes;
                    for w in 0..self.width {
                        let src = sequence.row((t + w) * self.nodes + n);
                        dst.slice_mut(s![w * in_channels..(w + 1) * in_channels])
                            .assign(&src);
                    }
                });
        }

        // One GEMM covering value and gate: ndarray's dot dispatches straight
        // to sgemm when both operands are contiguous f32.
        let projected = self
            .window
            .slice(s![..rows, ..row_width])
            .dot(&kernel);

        // Fused bias, sigmoid and gate multiply in one parallel pass: the two
        // halves are read together and only the product is written.
        let mut out = Array2::<f32>::zeros((rows, out_channels));
        out.axis_iter_mut(Axis(0))
            .into_par_iter()
            .enumerate()
            .for_each(|(row, mut target)| {
                let source = projected.row(row);
                for co in 0..out_channels {
                    let value = source[co] + bias[co];
                    let gate = source[out_channels + co] + bias[out_channels + co];
                    target[co] = value / (1.0 + (-gate).exp());
                }
            });
        out
    }

    /// \`frames\` is (steps * nodes, in_channels). \`weights\` is (order + 1)
    /// matrices of (in_channels, out_channels). One GEMM per hop, one sparse
    /// product per hop, no matrix power anywhere.
    pub fn diffusion(
        &mut self,
        frames: ArrayView2<'_, f32>,
        steps: usize,
        in_channels: usize,
        weights: &[ArrayView2<'_, f32>],
        out_channels: usize,
        graph: &CsrView<'_>,
    ) -> Array2<f32> {
        let rows = steps * self.nodes;
        let mut out = Array2::<f32>::zeros((rows, out_channels));

        self.hop
            .slice_mut(s![..rows, ..in_channels])
            .assign(&frames);

        for k in 0..=self.order {
            // Channel mixing for every step and node at once, accumulated.
            let mixed = self.hop.slice(s![..rows, ..in_channels]).dot(&weights[k]);
            out += &mixed;

            if k == self.order {
                break;
            }
            Self::spmm(
                graph,
                self.hop.slice(s![..rows, ..in_channels]),
                steps,
                self.nodes,
                &mut self.advanced.slice_mut(s![..rows, ..in_channels]),
            );
            std::mem::swap(&mut self.hop, &mut self.advanced);
        }
        out
    }

    /// Sparse times dense, parallel over output rows. Nodes are the correct
    /// axis: each thread owns whole rows, so there are no write conflicts and
    /// no reduction - only shared immutable reads of the feature matrix.
    fn spmm(
        graph: &CsrView<'_>,
        features: ArrayView2<'_, f32>,
        steps: usize,
        nodes: usize,
        out: &mut ndarray::ArrayViewMut2<'_, f32>,
    ) {
        out.axis_iter_mut(Axis(0))
            .into_par_iter()
            .enumerate()
            .for_each(|(row, mut target)| {
                let t = row / nodes;
                let n = row % nodes;
                target.fill(0.0);
                let begin = graph.indptr[n] as usize;
                let end = graph.indptr[n + 1] as usize;
                for slot in begin..end {
                    let weight = graph.values[slot];
                    let neighbour = features.row(t * nodes + graph.indices[slot] as usize);
                    // Zipped contiguous slices: the fused walk the compiler
                    // vectorizes, with no bounds check per element.
                    for (accumulator, &value) in target.iter_mut().zip(neighbour.iter()) {
                        *accumulator += weight * value;
                    }
                }
            });
    }
}

/// Masked MAE as one parallel reduction. The mask multiplies rather than
/// branches, so the loop stays vectorizable and the count comes free.
pub fn masked_mae(predictions: &[f32], targets: &[f32], observed: &[f32]) -> f64 {
    let (total, counted) = predictions
        .par_iter()
        .zip(targets)
        .zip(observed)
        .map(|((&prediction, &target), &weight)| {
            (f64::from(weight) * f64::from((prediction - target).abs()), f64::from(weight))
        })
        .reduce(|| (0.0, 0.0), |a, b| (a.0 + b.0, a.1 + b.1));

    if counted == 0.0 {
        return 0.0;
    }
    total / counted
}
`,
        rationale:
          'The temporal convolution stops being a loop nest and becomes a single GEMM: the causal windows are gathered once into a contiguous (T prime times N) by (width times channels) matrix, and the value and gate kernels are concatenated so one product yields both branches instead of two. Bias, sigmoid and the gate multiply then fuse into one parallel pass over that result, so neither branch is materialized separately. The sparse product stays hand-written because no BLAS covers sparse-times-dense, but it parallelizes over output rows, which is the axis where each rayon task owns whole rows — no reduction, no locking, only shared immutable reads of the feature matrix — and its inner loop is a zip over contiguous slices, which is what removes the per-element bounds checks entirely. Every scratch array is allocated once at the worst-case size and sliced down per call, and the hop buffers are swapped rather than reallocated. CSR indices drop to 32 bits because they are streamed in full on every hop.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Both the temporal window mixing and the per-hop channel mixing are dense products, and dot dispatches straight to sgemm when the operands are contiguous f32.',
            tradeoff: 'Binds the build to a system BLAS, and the window gather is a genuine copy of width times the activation memory, so a wide kernel can cost more in bandwidth than the GEMM recovers in arithmetic.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The window gather, the fused gating pass and the sparse product are all row-independent, so each becomes a parallel iterator with no shared mutable state.',
            tradeoff: 'Sparse rows vary wildly in length on a real road network, so rayon’s work stealing helps but the longest-degree node still bounds the sparse product, and on a small graph the task overhead exceeds the work.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The sparse accumulation and the gating pass become zips over contiguous slices, so the per-element bounds checks the indexed version pays disappear.',
            tradeoff: 'The zip in the gather and the row/column arithmetic derived from a flattened (step, node) index are much harder to read than the nested loops they replace, and an off-by-one in that flattening is a silent wrong answer rather than a compile error.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'One flat allocation per tensor with a fixed stride makes every frame a contiguous slice, which is what lets both the BLAS dispatch and the vectorized inner loops apply at all.',
            tradeoff: 'Buffers are sized to the worst-case step count and channel width, so a block configured for the largest layer holds that footprint permanently regardless of what it is asked to process.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'K GEMMs plus K sparse products per block for the whole batch, versus T * N * C^2 scalar iterations. Illustrative, not a measured benchmark: the GEMMs run near machine peak while the sparse product is bandwidth-bound, so on a sparse graph the dense channel mixing dominates and hidden width rather than node count sets the budget.',
      },
    },
  },
};
