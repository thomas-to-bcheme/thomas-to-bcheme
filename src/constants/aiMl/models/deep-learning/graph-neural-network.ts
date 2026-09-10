import type { AiMlModel } from '../../types';

export const GRAPH_NEURAL_NETWORK: AiMlModel = {
  slug: 'graph-neural-network',
  name: 'Graph Neural Network',
  aliases: ['GNN', 'GCN', 'GraphSAGE', 'GAT', 'Message passing network'],
  category: 'deep-learning',
  group: 'graph',
  kind: 'model',

  paradigms: ['supervised', 'semi-supervised', 'self-supervised'],
  taskTypes: ['classification', 'regression', 'ranking', 'anomaly-detection'],
  architecture: 'graph',

  intuition:
    'Each node builds a representation by gathering messages from its neighbours, combining them, and updating itself — then repeats. After k rounds a node has absorbed information from everything within k hops. It is convolution generalized off the grid: a CNN assumes neighbours are the adjacent pixels, a GNN asks you to supply the adjacency explicitly. That single change is what lets it operate on molecules, payment networks, and road systems, where "nearby" is a relationship rather than a coordinate.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathbf{h}_u^{(k)} = \\phi\\Bigl( \\mathbf{h}_u^{(k-1)},\; \\bigoplus_{v \\in \\mathcal{N}(u)} \\psi\\bigl(\\mathbf{h}_u^{(k-1)}, \\mathbf{h}_v^{(k-1)}, \\mathbf{e}_{uv}\\bigr) \\Bigr)',
      symbols: [
        { symbol: '\\mathbf{h}_u^{(k)}', meaning: 'node u\'s representation after k rounds of message passing' },
        { symbol: '\\mathcal{N}(u)', meaning: 'the neighbours of u — supplied by the graph, not inferred' },
        { symbol: '\\bigoplus', meaning: 'a PERMUTATION-INVARIANT aggregator: sum, mean, or max' },
        { symbol: '\\psi, \\phi', meaning: 'learned message and update functions, shared across all nodes' },
      ],
    },
    reading:
      'Gather, aggregate, update — repeated k times. The aggregator must be permutation-invariant because a node\'s neighbours have no canonical order, and getting that wrong is the difference between a graph network and a broken sequence model. The choice among sum, mean and max is not cosmetic: sum preserves degree information and is strictly more expressive, mean discards it, and max captures the single most salient neighbour.',
  },

  optimization: {
    method: 'Backpropagation through the unrolled message-passing rounds, AdamW, neighbour sampling at scale',
    updateRule: {
      formula:
        '\\mathbf{H}^{(k)} = \\sigma\\Bigl( \\tilde{\\mathbf{D}}^{-1/2}\\tilde{\\mathbf{A}}\\tilde{\\mathbf{D}}^{-1/2} \\mathbf{H}^{(k-1)} \\mathbf{W}^{(k)} \\Bigr)',
      symbols: [
        { symbol: '\\tilde{\\mathbf{A}}', meaning: 'adjacency plus self-loops, so a node keeps its own signal' },
        { symbol: '\\tilde{\\mathbf{D}}^{-1/2}', meaning: 'symmetric degree normalization — stops hub nodes dominating' },
        { symbol: '\\mathbf{W}^{(k)}', meaning: 'the shared weight matrix for this layer' },
      ],
    },
    rationale:
      'In the GCN formulation the whole layer collapses into one sparse matrix product, which is why it is fast despite the irregular structure. Symmetric normalization is load-bearing: without it a node with ten thousand neighbours produces activations orders of magnitude larger than a node with three, and the network spends its capacity fighting degree rather than learning structure. The depth limit is the interesting part — past roughly three layers, over-smoothing sets in and every node representation converges toward the same vector, so unlike a CNN, deeper is actively worse.',
    hyperparameters: [
      { name: 'layers (hops)', role: 'Receptive field in hops; 2-3 is near-universal because of over-smoothing', typicalRange: '2 to 3' },
      { name: 'aggregator', role: 'sum / mean / max — expressiveness versus degree-invariance', typicalRange: 'mean for GCN, sum for GIN' },
      { name: 'hidden width', role: 'Representation capacity per node', typicalRange: '32 to 256' },
      { name: 'neighbour sample size', role: 'Caps fan-out per hop so the computation graph does not explode', typicalRange: '10 to 25 per hop' },
      { name: 'dropout / DropEdge', role: 'Regularization; DropEdge also directly mitigates over-smoothing', typicalRange: '0.1 to 0.5' },
    ],
    convergence:
      'Trains reliably at the shallow depths it is used at. The dominant failure is over-smoothing: repeated neighbourhood averaging is a low-pass filter, so after enough rounds every node in a connected component converges to essentially the same representation and accuracy collapses. It looks like underfitting and is cured by fewer layers, not more capacity. The second failure is neighbourhood explosion — at three hops with average degree fifty, one node\'s computation graph touches over a hundred thousand nodes, which is why sampling is mandatory at any real scale.',
    complexity:
      'O(|E| · d) per layer with sparse operations — linear in edges, not in nodes squared. Memory is the practical constraint: full-batch training requires the whole graph resident, which is what neighbour sampling exists to avoid.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Spatio-temporal GNN: a temporal module (recurrence, dilated convolution, or attention) handles the within-series dynamics, and message passing handles the between-series coupling. Alternate the two per layer.',
        where: [
          'Traffic forecasting where road-network topology determines how congestion propagates',
          'Power-grid load forecasting across physically connected substations',
          'Multi-site sensor forecasting where the physical layout is known',
        ],
        why: 'The right choice exactly when the series are *coupled by a known structure*. That is the honest trigger — if you have many series but no meaningful adjacency, a global sequence model is simpler and does as well. When the topology is real, encoding it directly beats making an unconstrained model rediscover it from correlations.',
        featurization: [
          'Build the adjacency from physical structure where it exists; a correlation-thresholded graph is a much weaker prior',
          'Normalize per node — series on the same graph often differ in scale by orders of magnitude',
          'Include edge features such as distance or capacity; they usually carry real signal',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE, plus a comparison against a per-series classical model to confirm the graph structure is actually earning its cost.',
        pitfalls: [
          'A graph built from correlations can encode leakage if the correlations were computed over the full series',
          'Over-smoothing flattens the spatial signal, so more hops usually makes forecasts worse',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Score by reconstruction of node features or graph structure, or supervised where labels exist. The distinguishing capability is detecting anomalous *structure* — a node whose connectivity pattern is unusual even though its own features look ordinary.',
        where: [
          'Fraud-ring detection where individually clean accounts form a suspicious subgraph',
          'Network intrusion detection over communication topology',
          'Money-laundering detection across transaction chains',
        ],
        why: 'This is where it genuinely beats tabular methods: gradient boosting sees one account at a time and cannot see that twelve of them transact only with each other. Relational anomalies are invisible per-row and obvious in the graph, and that is the whole argument for the extra complexity.',
        featurization: [
          'Include structural features — degree, clustering coefficient, centrality — alongside node attributes',
          'Train on confirmed-clean subgraphs; a contaminated graph teaches the ring as normal',
        ],
        evaluation:
          'Precision@k against confirmed cases, evaluated at the subgraph level rather than per node, since the finding is a group.',
        pitfalls: [
          'Adversaries deliberately structure transactions to look topologically ordinary',
          'Graph construction choices — what counts as an edge — change the answer more than the model does',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Learns heuristics for combinatorial problems that are naturally graph-shaped: predict which edges belong in a good solution, then hand that to a classical solver as a warm start or a branching prior.',
        where: [
          'Routing and vehicle-scheduling warm starts',
          'Learned branching heuristics inside a mixed-integer solver',
        ],
        why: 'Useful as a heuristic accelerator rather than a solver: it offers no feasibility guarantee and no optimality bound, so in any setting where constraints are hard it belongs inside the loop. What it contributes is a good starting point, which on large instances is where most of the solver time goes.',
        featurization: [
          'Encode constraints as edges so the structure the solver cares about is visible to the model',
          'Train on solved instances from the same distribution — transfer across instance families is poor',
        ],
        evaluation:
          'Optimality gap and solver wall-clock against a cold start, with constraint violations counted as hard failures.',
        pitfalls: [
          'No feasibility guarantee, so raw output can never be the final answer',
          'Generalizes poorly to instance sizes far outside the training distribution',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'Build the graph from shared attributes — device, address, payment instrument, IP — then classify nodes or subgraphs. The edges are usually more informative than the node features.',
        where: [
          'Fraud-ring and synthetic-identity detection',
          'Account-takeover detection through device and session sharing',
          'Anti-money-laundering across transaction networks',
        ],
        why: 'Fraud is fundamentally relational: individual accounts are engineered to look legitimate, and the tell is who they connect to. This is one of the clearest cases in applied ML where the graph formulation finds something no amount of per-row feature engineering will.',
        featurization: [
          'Choose edge semantics deliberately — shared-device and shared-address graphs behave very differently',
          'Time-box edges; a device shared three years ago is not evidence today',
        ],
        evaluation: 'PR-AUC and value-weighted recall on strictly time-based splits, evaluated per ring rather than per account.',
        pitfalls: [
          'Hub nodes such as shared corporate IPs create enormous spurious neighbourhoods and must be pruned',
          'Label latency and adversarial adaptation both hit harder here than in tabular fraud',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Message passing over the user-item bipartite interaction graph, so a user\'s representation absorbs information from items they engaged with and from users similar to them.',
        where: [
          'Collaborative filtering with explicit higher-order connectivity',
          'Cold-start mitigation through side-information graphs linking items by attribute',
        ],
        why: 'Captures multi-hop collaborative signal that matrix factorization approximates only implicitly. In production the added complexity often does not beat a well-tuned two-tower model plus gradient boosting, so it is a considered choice rather than a default.',
        featurization: [
          'Sample neighbours aggressively — interaction graphs have extreme degree skew',
          'Include side-information edges to give cold items any structure at all',
        ],
        evaluation: 'NDCG@k offline with online A/B as the decision, benchmarked against a two-tower baseline.',
        pitfalls: [
          'Popularity hubs dominate message passing unless degree is normalized carefully',
          'Full-graph training is infeasible at catalogue scale, so sampling artefacts become part of the model',
        ],
      },
      'control-and-operations': {
        fit: 'viable',
        how: 'Model the physical or logistical network directly — substations, intersections, warehouse nodes — and predict state or recommend actions per node.',
        where: [
          'Grid state estimation and contingency analysis',
          'Traffic-signal coordination across an intersection network',
        ],
        why: 'The topology is known, physical and stable, which is the ideal case for a graph prior: you are encoding a fact rather than hoping the model infers it. Usually paired with a classical controller that owns the safety constraints.',
        featurization: [
          'Edge features carry physical properties — line capacity, road length, travel time',
          'Keep the graph static where the physical network is static; a changing topology needs inductive methods',
        ],
        evaluation: 'Simulation against the incumbent controller with an explicit sim-to-real gap estimate.',
        pitfalls: [
          'A topology change — a closed road, a downed line — invalidates a transductive model entirely',
          'No safety guarantees, so a classical override layer is mandatory',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to hours with neighbour sampling. Full-batch training on a large graph is memory-bound rather than compute-bound, which is the usual surprise.',
    inferenceProfile:
      'Milliseconds per node once neighbourhoods are fetched — and fetching them is usually the real cost, since it is a multi-hop database traversal rather than a matrix multiply.',
    retrainingCadence:
      'Weekly to monthly. In fraud, whenever the adversarial pattern shifts, which is faster than any fixed cadence.',
    driftAndMonitoring: [
      'Track degree distribution — a shift means the graph construction upstream has changed',
      'Monitor for new hub nodes, which silently distort message passing across the whole component',
      'Watch node-representation variance across layers; collapsing variance is over-smoothing appearing in production',
    ],
    productionGotchas: [
      'Neighbourhood fetching dominates serving latency and is a graph-database problem, not an ML one',
      'Transductive models (plain GCN) cannot score a node absent at training time — inductive variants such as GraphSAGE are required for anything with new entities',
      'The graph construction rules are part of the model contract; changing what counts as an edge changes predictions everywhere',
    ],
  },

  assumptions: [
    'A meaningful graph structure exists and is known — this is the prior, and a wrong graph is worse than none',
    'The homophily assumption roughly holds: connected nodes tend to be similar',
    'Relevant information lies within a few hops, since depth is capped by over-smoothing',
    'The graph is stable enough between training and serving that the learned structure still applies',
  ],

  pros: [
    {
      point: 'Encodes known relational structure directly',
      context:
        'When the topology is real — a road network, a payment graph, a molecule — this is a fact given to the model rather than a pattern it must infer. That is a much stronger prior than anything a tabular model can express.',
    },
    {
      point: 'Detects relational patterns invisible per-row',
      context:
        'A fraud ring of individually clean accounts is the canonical case. No amount of per-account feature engineering surfaces it, and this is the strongest argument for the architecture.',
    },
    {
      point: 'Linear in edges, not quadratic in nodes',
      context:
        'Sparse operations keep it tractable on large graphs. The binding constraint is memory and neighbourhood fetching, not arithmetic.',
    },
    {
      point: 'Semi-supervised by nature',
      context:
        'Unlabelled nodes still contribute through message passing, so a small labelled fraction goes a long way — genuinely valuable where labelling is expensive.',
    },
  ],

  cons: [
    {
      point: 'Over-smoothing caps useful depth at two or three layers',
      context:
        'Repeated averaging is a low-pass filter, so deep GNNs converge every node to the same representation. It presents as underfitting and is cured by removing layers, which is counter-intuitive for anyone coming from CNNs.',
    },
    {
      point: 'Neighbourhood explosion makes exact training infeasible at scale',
      context:
        'Three hops on a degree-50 graph reaches over a hundred thousand nodes per example. Sampling is mandatory and introduces variance that becomes part of the model\'s behaviour.',
    },
    {
      point: 'Entirely dependent on the graph you construct',
      context:
        'Edge-definition choices move results more than architecture choices do. A poorly constructed graph is a bad prior, and a bad prior is worse than no prior.',
    },
    {
      point: 'Serving requires graph infrastructure',
      context:
        'Multi-hop neighbourhood fetching at request time is a database problem most ML platforms are not built for, and it is where these projects usually stall operationally.',
    },
  ],

  relatedSlugs: ['cnn', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""One round of message passing - gather, aggregate, update.

The aggregator MUST be permutation-invariant: a node's neighbours have no
canonical order, so anything order-sensitive is silently wrong.
"""


def message_passing(features, adjacency, weight, aggregator="mean"):
    """features[n][d], adjacency[n] -> list of neighbour indices."""
    n = len(features)
    d_out = len(weight[0])
    updated = []

    for node in range(n):
        # Self-loop: without it a node loses its own signal entirely after
        # the first round.
        neighbours = adjacency[node] + [node]

        # Aggregate. Sum keeps degree information; mean discards it and is
        # more stable when degrees vary wildly.
        pooled = [0.0] * len(features[0])
        for neighbour in neighbours:
            for j in range(len(pooled)):
                pooled[j] += features[neighbour][j]

        if aggregator == "mean":
            pooled = [p / len(neighbours) for p in pooled]

        # Update: a shared linear transform, then a nonlinearity.
        out = [0.0] * d_out
        for j in range(d_out):
            total = sum(pooled[i] * weight[i][j] for i in range(len(pooled)))
            out[j] = max(0.0, total)     # ReLU
        updated.append(out)

    return updated


def forward(features, adjacency, weights):
    """Stack rounds. Two or three - past that, over-smoothing collapses every
    node toward the same representation."""
    h = features
    for weight in weights:
        h = message_passing(h, adjacency, weight)
    return h`,
        profile: 'O(|E|·d + n·d²) per layer, with a Python loop per node and per neighbour.',
      },
      'make-it-right': {
        code: `"""GCN - typed, sparse, with the normalization that makes it work."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class GnnConfig:
    in_features: int
    hidden: int = 64
    out_features: int = 2
    # Two layers. Not a shrug - over-smoothing means three is usually worse
    # and four is usually much worse.
    layers: int = 2
    dropout: float = 0.5


def normalize_adjacency(edge_index: Tensor, num_nodes: int) -> Tensor:
    """Build the symmetric normalized adjacency with self-loops.

    D^-1/2 (A + I) D^-1/2. The normalization is load-bearing: without it a
    hub with 10,000 neighbours produces activations orders of magnitude
    larger than a node with three, and the network spends capacity fighting
    degree instead of learning structure.
    """
    if edge_index.dim() != 2 or edge_index.size(0) != 2:
        raise ValueError(f"edge_index must be (2, num_edges), got {tuple(edge_index.shape)}")

    self_loops = torch.arange(num_nodes, device=edge_index.device)
    row = torch.cat([edge_index[0], self_loops])
    col = torch.cat([edge_index[1], self_loops])

    degree = torch.zeros(num_nodes, device=edge_index.device)
    degree.scatter_add_(0, row, torch.ones_like(row, dtype=torch.float))
    inv_sqrt = degree.pow(-0.5)
    # An isolated node has degree 0, and 0^-0.5 is inf. Left unhandled this
    # produces NaN that spreads through the whole graph on the first matmul.
    inv_sqrt[torch.isinf(inv_sqrt)] = 0.0

    values = inv_sqrt[row] * inv_sqrt[col]
    return torch.sparse_coo_tensor(
        torch.stack([row, col]), values, (num_nodes, num_nodes)
    ).coalesce()


class GcnLayer(nn.Module):
    def __init__(self, in_features: int, out_features: int) -> None:
        super().__init__()
        self.linear = nn.Linear(in_features, out_features, bias=True)

    def forward(self, x: Tensor, adjacency: Tensor) -> Tensor:
        # Transform FIRST, then propagate. Doing it in this order costs
        # O(n·d_in·d_out + |E|·d_out); the reverse costs O(|E|·d_in + ...),
        # which is worse whenever d_out < d_in, i.e. almost always.
        return torch.sparse.mm(adjacency, self.linear(x))


class Gcn(nn.Module):
    def __init__(self, config: GnnConfig) -> None:
        super().__init__()
        if config.layers < 1:
            raise ValueError(f"need at least one layer, got {config.layers}")

        widths = [config.in_features] + [config.hidden] * (config.layers - 1)
        self.layers = nn.ModuleList(
            GcnLayer(widths[i], widths[i + 1] if i + 1 < len(widths) else config.hidden)
            for i in range(config.layers - 1)
        )
        self.output = GcnLayer(config.hidden if config.layers > 1 else config.in_features,
                               config.out_features)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: Tensor, adjacency: Tensor) -> Tensor:
        for layer in self.layers:
            x = self.dropout(torch.relu(layer(x, adjacency)))
        return self.output(x, adjacency)`,
        rationale:
          'Message passing becomes a sparse matrix product, which is the whole reason GCN is fast despite irregular structure. Symmetric degree normalization is added explicitly — without it hub nodes dominate — along with the isolated-node guard, since degree-zero yields an infinity that turns the entire graph to NaN on the first matmul. The transform-then-propagate ordering is chosen deliberately for its complexity profile.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch (sparse)',
        profile: 'O(|E|·d + n·d²) per layer via sparse mm.',
      },
      'make-it-fast': {
        code: `"""GNN at scale - neighbour sampling, CSR adjacency, fused scatter."""

import numpy as np
import torch
from numpy.typing import NDArray
from torch import Tensor


def build_csr(edge_index: NDArray[np.int64], num_nodes: int) -> tuple[NDArray, NDArray]:
    """Compressed sparse row adjacency: (indptr, indices).

    A COO edge list means a node's neighbours are scattered across memory.
    CSR puts them in one contiguous run, so sampling a neighbourhood is a
    single slice rather than a filtered scan of every edge.
    """
    order = np.argsort(edge_index[0], kind="stable")
    sorted_src = edge_index[0][order]
    indices = edge_index[1][order].astype(np.int64)

    counts = np.bincount(sorted_src, minlength=num_nodes)
    indptr = np.zeros(num_nodes + 1, dtype=np.int64)
    np.cumsum(counts, out=indptr[1:])

    return indptr, indices


def sample_neighbours(
    indptr: NDArray[np.int64],
    indices: NDArray[np.int64],
    seeds: NDArray[np.int64],
    fanout: int,
    rng: np.random.Generator,
) -> tuple[NDArray[np.int64], NDArray[np.int64]]:
    """Sample up to \`fanout\` neighbours per seed node.

    This is not an approximation for speed - it is what makes training
    possible at all. Three hops on a degree-50 graph reaches >100k nodes per
    example, so the exact computation graph does not fit in memory.
    """
    src_out = []
    dst_out = []

    for seed in seeds:
        start, end = indptr[seed], indptr[seed + 1]
        degree = end - start

        if degree <= fanout:
            chosen = indices[start:end]
        else:
            # Sample WITHOUT replacement so a neighbour cannot be double-counted
            # into the aggregate, which would silently reweight it.
            offsets = rng.choice(degree, size=fanout, replace=False)
            chosen = indices[start + offsets]

        src_out.append(np.full(len(chosen), seed, dtype=np.int64))
        dst_out.append(chosen)

    return np.concatenate(src_out), np.concatenate(dst_out)


def aggregate_mean(features: Tensor, src: Tensor, dst: Tensor, num_nodes: int) -> Tensor:
    """Mean-aggregate neighbour features with a fused scatter-add.

    index_add_ accumulates in ONE pass over the edge list, in place. Building
    per-node neighbour lists and looping would allocate per node and destroy
    the memory locality CSR just bought.
    """
    output = torch.zeros(num_nodes, features.size(1), device=features.device)
    output.index_add_(0, src, features[dst])

    counts = torch.zeros(num_nodes, device=features.device)
    counts.index_add_(0, src, torch.ones_like(src, dtype=torch.float))

    # clamp_min, not a mask: isolated nodes divide by 1 and keep their zeros,
    # which is correct and avoids a branch.
    return output / counts.clamp_min(1.0).unsqueeze(1)`,
        rationale:
          'Three changes for scale. The adjacency moves to CSR so a node\'s neighbours are one contiguous slice rather than scattered across an edge list. Neighbour sampling caps the fan-out, which is not an approximation for speed but the thing that makes training fit in memory at all. And aggregation becomes a fused in-place scatter-add over the edge list rather than per-node Python loops.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'CSR puts each node\'s neighbours in one contiguous run, turning neighbourhood sampling from a filtered scan of all edges into a single slice.',
            tradeoff: 'Building CSR requires a full sort of the edge list up front, and it must be rebuilt whenever the graph changes.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'index_add_ accumulates neighbour features in one in-place pass over the edge list, with no per-node intermediate allocation.',
            tradeoff: 'Scatter-add has non-deterministic float accumulation order on GPU, so results vary slightly run to run — which complicates exact reproducibility.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Sampling caps the computation graph so many seed nodes can be processed as one batch instead of one enormous exact neighbourhood.',
            tradeoff: 'Sampling variance becomes part of the model\'s behaviour, and results shift with the fan-out setting.',
          },
        ],
        libraryName: 'PyTorch / NumPy',
        profile: 'O(|E|·d) per layer, O(fanout^hops) per seed. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// One round of message passing - gather, aggregate, update.
#include <algorithm>
#include <cstddef>
#include <vector>

// adjacency[node] = list of neighbour indices.
std::vector<std::vector<double>> MessagePassing(
    const std::vector<std::vector<double>>& features,
    const std::vector<std::vector<std::size_t>>& adjacency,
    const std::vector<std::vector<double>>& weight) {
  const std::size_t n = features.size();
  const std::size_t d_in = features[0].size();
  const std::size_t d_out = weight[0].size();

  std::vector<std::vector<double>> updated(n, std::vector<double>(d_out, 0.0));

  for (std::size_t node = 0; node < n; ++node) {
    // Aggregate over neighbours plus self. The aggregator must be
    // permutation-invariant - neighbours have no canonical order.
    std::vector<double> pooled(d_in, 0.0);
    for (const std::size_t neighbour : adjacency[node]) {
      for (std::size_t j = 0; j < d_in; ++j) pooled[j] += features[neighbour][j];
    }
    // Self-loop: without it a node loses its own signal after round one.
    for (std::size_t j = 0; j < d_in; ++j) pooled[j] += features[node][j];

    const double count = static_cast<double>(adjacency[node].size() + 1);
    for (double& p : pooled) p /= count;   // mean aggregation

    // Update: shared linear transform then ReLU.
    for (std::size_t j = 0; j < d_out; ++j) {
      double total = 0.0;
      for (std::size_t i = 0; i < d_in; ++i) total += pooled[i] * weight[i][j];
      updated[node][j] = std::max(0.0, total);
    }
  }

  return updated;
}`,
        profile: 'O(|E|·d_in + n·d_in·d_out). Allocates a pooled vector per node; neighbours scattered across the heap.',
      },
      'make-it-right': {
        code: `// GCN layer - CSR adjacency, flat features, degree normalization.
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <vector>

// Compressed sparse row: a node's neighbours are one contiguous run, so the
// gather streams instead of chasing pointers across the heap.
class CsrGraph {
 public:
  CsrGraph(std::vector<std::size_t> indptr, std::vector<std::size_t> indices)
      : indptr_(std::move(indptr)), indices_(std::move(indices)) {
    if (indptr_.empty()) throw std::invalid_argument("indptr must not be empty");
    if (indptr_.back() != indices_.size()) {
      throw std::invalid_argument("indptr tail does not match the edge count");
    }
  }

  [[nodiscard]] std::size_t NodeCount() const noexcept { return indptr_.size() - 1; }

  [[nodiscard]] std::span<const std::size_t> Neighbours(std::size_t node) const {
    return {indices_.data() + indptr_[node], indptr_[node + 1] - indptr_[node]};
  }

  // Symmetric normalization D^-1/2 (A+I) D^-1/2, precomputed once. Without it
  // a hub with 10,000 neighbours swamps a node with three, and the network
  // spends its capacity fighting degree rather than learning structure.
  [[nodiscard]] std::vector<double> InverseSqrtDegrees() const {
    std::vector<double> inv(NodeCount());
    for (std::size_t node = 0; node < NodeCount(); ++node) {
      const double degree = static_cast<double>(indptr_[node + 1] - indptr_[node]) + 1.0;
      // Degree includes the self-loop, so it is never zero and this cannot
      // produce the infinity that would spread NaN through the whole graph.
      inv[node] = 1.0 / std::sqrt(degree);
    }
    return inv;
  }

 private:
  std::vector<std::size_t> indptr_;
  std::vector<std::size_t> indices_;
};

// features and output are flat [n x d], row-major.
void PropagateNormalized(const CsrGraph& graph, std::span<const double> features,
                         std::span<const double> inv_sqrt_degree, std::size_t d,
                         std::span<double> output) {
  const std::size_t n = graph.NodeCount();
  if (features.size() != n * d || output.size() != n * d) {
    throw std::invalid_argument("feature or output buffer does not match n x d");
  }

  std::fill(output.begin(), output.end(), 0.0);

  for (std::size_t node = 0; node < n; ++node) {
    double* dest = output.data() + node * d;
    const double scale_u = inv_sqrt_degree[node];

    for (const std::size_t neighbour : graph.Neighbours(node)) {
      const double weight = scale_u * inv_sqrt_degree[neighbour];
      const double* src = features.data() + neighbour * d;
      for (std::size_t j = 0; j < d; ++j) dest[j] += weight * src[j];
    }

    // Self-loop, with the same normalization as any other edge.
    const double self_weight = scale_u * scale_u;
    const double* self = features.data() + node * d;
    for (std::size_t j = 0; j < d; ++j) dest[j] += self_weight * self[j];
  }
}`,
        rationale:
          'The adjacency-of-vectors becomes CSR, so a node\'s neighbours are one contiguous run and the gather streams rather than chasing heap pointers. Features move to a flat row-major buffer, degree normalization is precomputed once instead of per call, and the self-loop is folded into the degree so the isolated-node infinity cannot arise at all.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(|E|·d) per propagation, zero allocation in the hot path.',
      },
      'make-it-fast': {
        code: `// GCN - Eigen sparse, transform-then-propagate, OpenMP over nodes.
#include <Eigen/Dense>
#include <Eigen/Sparse>
#include <stdexcept>

using SparseMatrix = Eigen::SparseMatrix<float, Eigen::RowMajor>;

// Build the normalized adjacency ONCE. It does not change between layers or
// epochs, so rebuilding it per forward pass - which the naive structure
// invites - is pure waste.
SparseMatrix BuildNormalizedAdjacency(const std::vector<Eigen::Triplet<float>>& edges,
                                      Eigen::Index n) {
  SparseMatrix a(n, n);
  a.setFromTriplets(edges.begin(), edges.end());

  // Add self-loops, then symmetric-normalize.
  for (Eigen::Index i = 0; i < n; ++i) a.coeffRef(i, i) += 1.0f;
  a.makeCompressed();

  Eigen::VectorXf inv_sqrt_degree(n);
  for (Eigen::Index i = 0; i < n; ++i) {
    inv_sqrt_degree(i) = 1.0f / std::sqrt(a.row(i).sum());
  }

  for (Eigen::Index i = 0; i < n; ++i) {
    for (SparseMatrix::InnerIterator it(a, i); it; ++it) {
      it.valueRef() *= inv_sqrt_degree(i) * inv_sqrt_degree(it.col());
    }
  }

  return a;
}

// One GCN layer.
//
// Transform FIRST, then propagate. The ordering matters for complexity:
//   transform-then-propagate: O(n·d_in·d_out + |E|·d_out)
//   propagate-then-transform: O(|E|·d_in  + n·d_in·d_out)
// Whenever d_out < d_in - the usual case as layers narrow - the first is
// strictly cheaper, and on a dense graph the gap is large.
Eigen::MatrixXf GcnLayer(const SparseMatrix& adjacency, const Eigen::MatrixXf& features,
                         const Eigen::MatrixXf& weight) {
  if (features.rows() != adjacency.rows()) {
    throw std::invalid_argument("feature matrix does not match the graph");
  }

  const Eigen::MatrixXf transformed = features * weight;   // dense GEMM
  Eigen::MatrixXf propagated = adjacency * transformed;    // sparse-dense product

  // Fused ReLU - one traversal, no intermediate matrix.
  return propagated.cwiseMax(0.0f);
}
`,
        rationale:
          'The normalized adjacency is built once rather than per forward pass, since it never changes. The layer uses transform-then-propagate, which is not stylistic: it costs O(n·d_in·d_out + |E|·d_out) versus O(|E|·d_in + …) the other way round, and is strictly cheaper whenever layers narrow — which is the usual case. Sparse-dense products keep the cost linear in edges.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The feature transform is a dense GEMM and the propagation a sparse-dense product, both dispatched to blocked kernels rather than hand-written loops.',
            tradeoff: 'The intermediate transformed matrix is materialized, which is O(n·d_out) memory that a fully fused implementation would avoid.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'RowMajor sparse storage means each node\'s neighbours are contiguous, so the sparse-dense product streams rather than gathering scattered rows.',
            tradeoff: 'Row-major sparse is slower for column-oriented operations, so a formulation needing transposed access would be penalized.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The ReLU composes into the propagation traversal instead of materializing an extra matrix per layer.',
            tradeoff: 'Storing such an expression in auto rather than a MatrixXf yields a dangling reference — the standard Eigen hazard.',
          },
        ],
        libraryName: 'Eigen (Sparse)',
        profile: 'O(n·d_in·d_out + |E|·d_out) per layer. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! One round of message passing - gather, aggregate, update.

/// adjacency[node] = neighbour indices.
pub fn message_passing(
    features: &[Vec<f64>],
    adjacency: &[Vec<usize>],
    weight: &[Vec<f64>],
) -> Vec<Vec<f64>> {
    let n = features.len();
    let d_in = features[0].len();
    let d_out = weight[0].len();

    let mut updated = vec![vec![0.0; d_out]; n];

    for node in 0..n {
        // Aggregate over neighbours plus self. The aggregator must be
        // permutation-invariant - neighbours have no canonical order.
        let mut pooled = vec![0.0; d_in];
        for &neighbour in &adjacency[node] {
            for j in 0..d_in {
                pooled[j] += features[neighbour][j];
            }
        }
        // Self-loop: without it a node loses its own signal after round one.
        for j in 0..d_in {
            pooled[j] += features[node][j];
        }

        let count = (adjacency[node].len() + 1) as f64;
        for p in pooled.iter_mut() {
            *p /= count;
        }

        // Update: shared linear transform then ReLU.
        for j in 0..d_out {
            let mut total = 0.0;
            for i in 0..d_in {
                total += pooled[i] * weight[i][j];
            }
            updated[node][j] = total.max(0.0);
        }
    }

    updated
}`,
        profile: 'O(|E|·d_in + n·d_in·d_out). Allocates a pooled vector per node; neighbours scattered across the heap.',
      },
      'make-it-right': {
        code: `//! GCN - CSR adjacency, flat features, typed errors.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum GraphError {
    EmptyIndptr,
    IndptrMismatch { tail: usize, edges: usize },
    BufferShape { expected: usize, found: usize },
}

impl fmt::Display for GraphError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyIndptr => write!(f, "indptr must not be empty"),
            Self::IndptrMismatch { tail, edges } => {
                write!(f, "indptr tail {tail} does not match {edges} edges")
            }
            Self::BufferShape { expected, found } => {
                write!(f, "expected a {expected}-element buffer, found {found}")
            }
        }
    }
}

impl std::error::Error for GraphError {}

/// Compressed sparse row: a node's neighbours are one contiguous slice, so the
/// gather streams instead of chasing pointers across the heap.
pub struct CsrGraph {
    indptr: Vec<usize>,
    indices: Vec<usize>,
    /// Precomputed once — it does not change between layers or epochs.
    inv_sqrt_degree: Vec<f32>,
}

impl CsrGraph {
    pub fn new(indptr: Vec<usize>, indices: Vec<usize>) -> Result<Self, GraphError> {
        if indptr.is_empty() {
            return Err(GraphError::EmptyIndptr);
        }
        if *indptr.last().unwrap() != indices.len() {
            return Err(GraphError::IndptrMismatch {
                tail: *indptr.last().unwrap(),
                edges: indices.len(),
            });
        }

        // Degree includes the self-loop, so it is never zero — which is what
        // stops the isolated-node infinity that would spread NaN everywhere.
        let inv_sqrt_degree = indptr
            .windows(2)
            .map(|w| 1.0 / ((w[1] - w[0]) as f32 + 1.0).sqrt())
            .collect();

        Ok(Self { indptr, indices, inv_sqrt_degree })
    }

    #[must_use]
    pub fn node_count(&self) -> usize {
        self.indptr.len() - 1
    }

    #[inline]
    #[must_use]
    pub fn neighbours(&self, node: usize) -> &[usize] {
        &self.indices[self.indptr[node]..self.indptr[node + 1]]
    }

    /// Symmetric-normalized propagation. \`features\` and \`out\` are flat [n x d].
    pub fn propagate(&self, features: &[f32], d: usize, out: &mut [f32]) -> Result<(), GraphError> {
        let n = self.node_count();
        if features.len() != n * d {
            return Err(GraphError::BufferShape { expected: n * d, found: features.len() });
        }
        if out.len() != n * d {
            return Err(GraphError::BufferShape { expected: n * d, found: out.len() });
        }

        out.fill(0.0);

        for node in 0..n {
            let scale_u = self.inv_sqrt_degree[node];
            let (before, rest) = out.split_at_mut(node * d);
            let dest = &mut rest[..d];
            let _ = before;

            for &neighbour in self.neighbours(node) {
                let weight = scale_u * self.inv_sqrt_degree[neighbour];
                let src = &features[neighbour * d..(neighbour + 1) * d];
                for (o, v) in dest.iter_mut().zip(src) {
                    *o += weight * v;
                }
            }

            // Self-loop, normalized like any other edge.
            let self_weight = scale_u * scale_u;
            let self_features = &features[node * d..(node + 1) * d];
            for (o, v) in dest.iter_mut().zip(self_features) {
                *o += self_weight * v;
            }
        }

        Ok(())
    }
}`,
        rationale:
          'Adjacency becomes CSR so neighbours are a contiguous slice, features move to a flat buffer, and inverse-square-root degrees are precomputed once at construction rather than per propagation. Folding the self-loop into the degree means the isolated-node infinity — which would otherwise spread NaN across the entire graph — cannot occur by construction.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(|E|·d) per propagation, zero allocation in the hot path.',
      },
      'make-it-fast': {
        code: `//! GCN - parallel gather over nodes, contiguous per-node output slices.

use rayon::prelude::*;

pub struct CsrGraph {
    indptr: Vec<usize>,
    indices: Vec<usize>,
    inv_sqrt_degree: Vec<f32>,
}

impl CsrGraph {
    #[inline]
    fn neighbours(&self, node: usize) -> &[usize] {
        &self.indices[self.indptr[node]..self.indptr[node + 1]]
    }

    /// Symmetric-normalized propagation, nodes in parallel.
    ///
    /// Gather rather than scatter is the key structural choice. A scatter
    /// formulation has multiple workers writing to the same destination node
    /// and needs atomics or locking; gathering means each worker owns one
    /// output row exclusively and writes it alone.
    pub fn propagate_parallel(&self, features: &[f32], d: usize, out: &mut [f32]) {
        out.par_chunks_exact_mut(d)
            .enumerate()
            .for_each(|(node, dest)| {
                dest.fill(0.0);
                let scale_u = self.inv_sqrt_degree[node];

                for &neighbour in self.neighbours(node) {
                    let weight = scale_u * self.inv_sqrt_degree[neighbour];
                    // Neighbour rows are contiguous, and zip over two
                    // equal-length slices drops the bounds checks.
                    let src = &features[neighbour * d..(neighbour + 1) * d];
                    for (o, v) in dest.iter_mut().zip(src) {
                        *o += weight * v;
                    }
                }

                let self_weight = scale_u * scale_u;
                let self_features = &features[node * d..(node + 1) * d];
                for (o, v) in dest.iter_mut().zip(self_features) {
                    *o += self_weight * v;
                }
            });
    }

    /// Sample up to \`fanout\` neighbours per seed.
    ///
    /// Not an approximation for speed — three hops on a degree-50 graph
    /// reaches over 100k nodes per example, so the exact computation graph
    /// simply does not fit. Sampling is what makes training possible.
    #[must_use]
    pub fn sample_neighbours(&self, seed: usize, fanout: usize, state: &mut u64) -> Vec<usize> {
        let neighbours = self.neighbours(seed);
        if neighbours.len() <= fanout {
            return neighbours.to_vec();
        }

        // Reservoir sampling: one pass, exact capacity, no shuffle of the
        // full neighbour list — which matters because hub nodes can have
        // hundreds of thousands of neighbours.
        let mut reservoir: Vec<usize> = neighbours[..fanout].to_vec();
        for (i, &candidate) in neighbours.iter().enumerate().skip(fanout) {
            *state ^= *state << 13;
            *state ^= *state >> 7;
            *state ^= *state << 17;
            let j = (*state % (i as u64 + 1)) as usize;
            if j < fanout {
                reservoir[j] = candidate;
            }
        }
        reservoir
    }
}`,
        rationale:
          'Propagation parallelizes over nodes using a gather rather than a scatter — the structural choice that matters, since scattering would have multiple workers writing the same destination and needing atomics, while gathering gives each worker exclusive ownership of one output row. Neighbour sampling uses reservoir sampling so a hub node with hundreds of thousands of edges costs one pass and exact capacity.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Gathering means each worker owns exactly one output row, so there is no contention, no atomics and no reduction — unlike the scatter formulation.',
            tradeoff: 'Every worker reads neighbour rows scattered across the feature matrix, so memory bandwidth becomes the ceiling before cores do.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'CSR makes each node\'s neighbour list one contiguous slice and each feature row contiguous, so both the outer and inner loops stream.',
            tradeoff: 'Requires a full sort to build CSR, and it must be rebuilt whenever the graph changes.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Reservoir sampling allocates exactly fanout elements once, rather than materializing and shuffling a hub node\'s full neighbour list.',
            tradeoff: 'Reservoir sampling is uniform but not independent across calls, so the same seed can produce correlated neighbourhoods across hops.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(|E|·d) per layer across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
