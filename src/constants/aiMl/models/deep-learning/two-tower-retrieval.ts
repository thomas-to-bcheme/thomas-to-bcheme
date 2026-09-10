import type { AiMlModel } from '../../types';

export const TWO_TOWER_RETRIEVAL: AiMlModel = {
  slug: 'two-tower-retrieval',
  name: 'Two-Tower Retrieval',
  aliases: ['Dual encoder', 'Bi-encoder', 'Siamese retrieval network'],
  category: 'deep-learning',
  group: 'retrieval',
  kind: 'model',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['ranking', 'dimensionality-reduction', 'anomaly-detection'],
  architecture: 'feedforward',

  intuition:
    'Two separate encoders — one for the query, one for the item — trained so that relevant pairs land close together in a shared vector space. The separation is the entire architectural point: because the item tower never sees the query, every item embedding can be computed offline and indexed. Retrieval then becomes nearest-neighbour search rather than scoring millions of candidates one at a time. A cross-encoder is more accurate and structurally cannot do this.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = -\\log \\frac{\\exp\\bigl(s(q, d^{+})/\\tau\\bigr)}{\\exp\\bigl(s(q, d^{+})/\\tau\\bigr) + \\sum_{d^{-} \\in \\mathcal{N}} \\exp\\bigl(s(q, d^{-})/\\tau\\bigr)}',
      symbols: [
        { symbol: 's(q,d)', meaning: 'similarity — cosine or dot product between the two embeddings' },
        { symbol: 'd^{+}', meaning: 'the known-relevant item for this query' },
        { symbol: '\\mathcal{N}', meaning: 'negatives — the choice of these matters more than the architecture' },
        { symbol: '\\tau', meaning: 'temperature; sharpens or softens the distribution over candidates' },
      ],
    },
    reading:
      'Softmax cross-entropy over one positive and a set of negatives — InfoNCE. The model is being asked to rank the true item above the distractors, not to predict a score, which is why the negatives define the task. Train against random negatives and the model learns only to separate obviously unrelated things; train against hard negatives and it learns the distinctions that actually matter at serving time.',
  },

  optimization: {
    method: 'Contrastive training with in-batch negatives, AdamW, large batches',
    updateRule: {
      formula:
        'S = \\frac{E_Q E_D^{\\top}}{\\tau}, \\qquad \\mathcal{L} = \\frac{1}{B}\\sum_{i=1}^{B} \\mathrm{CrossEntropy}\\bigl(S_{i,:},\\, i\\bigr)',
      symbols: [
        { symbol: 'E_Q, E_D', meaning: 'the batch of query and item embeddings, each B x d' },
        { symbol: 'S', meaning: 'the B x B similarity matrix — every query against every item in the batch' },
        { symbol: 'i', meaning: 'the diagonal is the correct label: query i matches item i' },
      ],
    },
    rationale:
      'In-batch negatives are the trick that makes this trainable at all. Rather than sampling negatives explicitly, every other item in the batch serves as a negative for every query, so one B x B matrix product yields B² training signals from B examples. That is why batch size behaves like a hyperparameter of the *objective* here rather than just of the optimizer — a larger batch is a harder and more informative task. The known failure is false negatives: with a large batch, some in-batch item genuinely is relevant to the query and is being pushed away as if it were not.',
    hyperparameters: [
      { name: 'batch size', role: 'Determines the number of in-batch negatives; behaves like an objective parameter', typicalRange: '1,024 to 32,768' },
      { name: 'temperature', role: 'Sharpness of the contrastive distribution; small values emphasise hard negatives', typicalRange: '0.01 to 0.1' },
      { name: 'embedding dimension', role: 'Capacity versus index size and query latency', typicalRange: '64 to 768' },
      { name: 'hard-negative ratio', role: 'Fraction of mined hard negatives mixed with in-batch ones', typicalRange: '0 to 4 per positive' },
      { name: 'normalization', role: 'L2-normalize embeddings so dot product is cosine — required for most ANN indices', typicalRange: 'on' },
    ],
    convergence:
      'Trains stably, and the loss is a poor guide to quality. The characteristic failure is representation collapse: all embeddings drift toward the same region, the loss looks acceptable, and retrieval is useless — visible only by monitoring embedding variance, never from the loss curve. The second is the train/serve mismatch that defines this model class: training uses in-batch negatives drawn from the positives distribution, while serving searches the entire catalogue, most of which is nothing like a positive. A model that looks excellent offline can retrieve badly for exactly that reason.',
    complexity:
      'O(B²·d) for the similarity matrix per step, which is why batch size eventually costs quadratically. Serving is O(d) to encode the query plus sublinear ANN lookup — the whole point of the design.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The model produces a similarity ranking over a fixed catalogue, and forecasting has no catalogue and no query. There is an adjacent technique — retrieving similar historical windows to condition a forecast — but that uses embeddings as a nearest-neighbour lookup rather than as the forecaster, and the forecasting model is whatever consumes them.',
      },
      'anomaly-detection': {
        fit: 'adapted',
        why: 'Distance to the nearest neighbour in embedding space is a usable novelty score: an item far from everything known is unusual. But the space was trained to separate *relevant* from *irrelevant*, not normal from anomalous, so the geometry is optimized for the wrong distinction.',
        how: 'Embed the item, query the index for its nearest neighbours, and score by distance to the k-th neighbour. Works best where the anomaly is genuinely novel content rather than an unusual value.',
        where: [
          'Near-duplicate and novel-content detection in large catalogues',
          'Flagging queries with no good match in the corpus, as a retrieval-quality signal',
        ],
        featurization: [
          'L2-normalize so distances are comparable across the space',
          'Fit the threshold on a known-clean corpus, since distance scales are arbitrary',
        ],
        evaluation:
          'Precision@k against confirmed novel items, with the threshold from the distance distribution of a clean holdout.',
        pitfalls: [
          'The embedding geometry encodes relevance, not normality — a common and rarely stated mismatch',
          'Dense regions of the catalogue produce systematically lower distances regardless of novelty',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'Retrieval selects from an existing catalogue by similarity; it has no objective over decision variables, no constraints, and no notion of feasibility. It frequently supplies candidates that a downstream optimizer then allocates over, but the similarity search itself optimizes nothing about the world.',
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'The retrieval stage of a two-stage system. Precompute every item embedding offline into an ANN index, encode the user or context at request time, and fetch a few hundred candidates for a heavier ranker to reorder.',
        where: [
          'Candidate generation over catalogues of millions of items',
          'Personalized feed and homepage retrieval under strict latency budgets',
          'Semantic search where lexical matching misses paraphrase',
        ],
        why: 'It is the only architecture that makes million-item retrieval tractable in milliseconds, and the reason is structural rather than statistical: because the towers are independent, item embeddings are precomputable. A cross-encoder scores better on any individual pair and would need to run millions of times per request, so the standard pattern pairs them — this retrieves, a cross-encoder or GBM reranks.',
        featurization: [
          'Mine hard negatives from the model\'s own current retrievals; random negatives plateau quickly',
          'Include content features so cold items get a meaningful embedding with no interaction history',
          'L2-normalize, since most ANN indices assume cosine geometry',
        ],
        evaluation:
          'Recall@k at the candidate-set size the reranker actually consumes — not NDCG, since ordering is the reranker\'s job. Then online A/B, because offline retrieval gains routinely fail to transfer.',
        pitfalls: [
          'Training on in-batch negatives while serving against the full catalogue is a real distribution mismatch',
          'False negatives: an in-batch item that genuinely is relevant gets pushed away',
          'Popularity bias — frequent items dominate the space unless sampling corrects for it',
        ],
      },
      'natural-language': {
        fit: 'primary',
        how: 'Dense passage retrieval: encode the question with one tower and passages with the other, index the passages, and retrieve by vector similarity. This is the retrieval half of a RAG system.',
        where: [
          'Retrieval-augmented generation, grounding a language model in a corpus',
          'Semantic search and FAQ matching where wording differs from the query',
          'Duplicate-question detection',
        ],
        why: 'Solves the vocabulary-mismatch problem that lexical search cannot: a question and its answer often share almost no words. Dense retrieval matches on meaning. In practice hybrid retrieval — dense plus BM25 — beats either alone, because lexical matching remains better on rare exact terms like identifiers and part numbers.',
        featurization: [
          'Chunk passages to a size the encoder handles well; over-long chunks dilute the embedding',
          'Keep query and passage encoders separate unless data is scarce — sharing them helps only in low-data regimes',
        ],
        evaluation:
          'Recall@k on held-out question-passage pairs, plus end-to-end answer quality, since retrieval recall does not always translate into better generation.',
        pitfalls: [
          'Dense retrieval underperforms lexical search on rare exact strings — hence hybrid',
          'Embeddings are corpus-specific; re-embedding the entire index is required whenever the encoder changes',
        ],
      },
      'computer-vision': {
        fit: 'viable',
        how: 'Image-text or image-image dual encoders trained contrastively, giving a shared space where a text query retrieves images or an image retrieves visually similar ones.',
        where: [
          'Visual and text-to-image search over large catalogues',
          'Near-duplicate detection and reverse image search',
        ],
        why: 'The contrastive image-text objective also yields zero-shot classification for free — classify by embedding the class names and retrieving the nearest — which is a capability supervised training simply does not offer.',
        featurization: [
          'Augment the image tower but not the text tower; they have different invariances',
          'Very large batches matter more here than in text retrieval',
        ],
        evaluation: 'Recall@k on held-out pairs plus zero-shot accuracy on a benchmark the corpus did not contain.',
        pitfalls: [
          'Enormous batch requirements make training expensive and hardware-bound',
          'The space inherits the biases of the web-scale pairs it was trained on',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours to days on multi-GPU, and the cost is driven by batch size because the objective needs it — this is one of the few models where the hardware budget directly limits model quality.',
    inferenceProfile:
      'One tower pass to encode the query — single-digit milliseconds — plus a sublinear ANN lookup. Item embeddings are precomputed, which is the entire design goal.',
    retrainingCadence:
      'Monthly, or whenever the catalogue distribution shifts. Every retrain forces a full re-embed and index rebuild, which is usually the operational bottleneck rather than the training itself.',
    driftAndMonitoring: [
      'Track embedding-norm and variance distributions — collapse shows up here and nowhere else',
      'Monitor recall@k against a labelled probe set on a fixed schedule',
      'Watch catalogue coverage: if retrieval concentrates on a shrinking item subset, popularity bias is compounding',
    ],
    productionGotchas: [
      'Query and item encoders must be versioned together with the index — a mismatch produces plausible, wrong results silently',
      'Re-embedding a large catalogue takes hours, so index rebuilds need to be planned as a deployment step',
      'ANN indices are approximate; recall degrades with aggressive tuning, and the loss is invisible without a probe set',
    ],
  },

  assumptions: [
    'Relevance is expressible as geometric proximity in a single shared space',
    'Item embeddings can be precomputed, meaning the item tower does not depend on the query',
    'Enough positive pairs exist to learn the space — this is data-hungry',
    'The catalogue is stable enough that an index rebuilt periodically stays current',
  ],

  pros: [
    {
      point: 'Item embeddings are precomputable',
      context:
        'The structural property that makes million-item retrieval possible in milliseconds. It is also exactly what a cross-encoder gives up in exchange for accuracy, which is why the two are used together rather than as alternatives.',
    },
    {
      point: 'Matches on meaning rather than tokens',
      context:
        'Solves vocabulary mismatch, which lexical search structurally cannot. Loses to BM25 on rare exact strings, which is why hybrid retrieval is standard.',
    },
    {
      point: 'One shared space serves many uses',
      context:
        'The same embeddings support retrieval, clustering, deduplication and novelty scoring — real operational leverage from one training run.',
    },
    {
      point: 'Handles cold-start items with content features',
      context:
        'An item with no interaction history still gets a meaningful embedding from its content, which collaborative filtering cannot do by construction.',
    },
  ],

  cons: [
    {
      point: 'Less accurate than a cross-encoder on any single pair',
      context:
        'The towers never interact, so fine-grained query-item reasoning is impossible. This is a deliberate trade for precomputability, and the standard mitigation is to rerank.',
    },
    {
      point: 'Quality is bounded by negative sampling, not architecture',
      context:
        'Random negatives plateau quickly and hard-negative mining is where the real gains are. Teams often tune the model when they should be tuning the negatives.',
    },
    {
      point: 'Batch size is effectively part of the objective',
      context:
        'More in-batch negatives means a harder, better task, so quality is coupled to available hardware in a way most models are not.',
    },
    {
      point: 'Every retrain forces a full index rebuild',
      context:
        'Embeddings from different encoder versions are not comparable, so partial updates are impossible. This is the main operational cost and it is easy to underestimate.',
    },
  ],

  relatedSlugs: ['transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Two-tower retrieval with in-batch negatives - the objective, written out.

Every OTHER item in the batch acts as a negative for each query, so one batch
of B examples yields B*B training signals. That is the trick that makes
contrastive retrieval trainable.
"""

import math


def encode(features, weights):
    """A tower: one linear layer, then L2-normalize.

    Normalizing makes the dot product a cosine, which bounds similarity to
    [-1, 1] and is what most ANN indices assume.
    """
    out = []
    for row in weights:
        out.append(sum(f * w for f, w in zip(features, row)))

    norm = math.sqrt(sum(v * v for v in out)) or 1.0
    return [v / norm for v in out]


def in_batch_loss(query_features, item_features, q_weights, d_weights, temperature=0.05):
    """InfoNCE over the batch. The diagonal is the correct pairing."""
    batch = len(query_features)

    queries = [encode(q, q_weights) for q in query_features]
    items = [encode(d, d_weights) for d in item_features]

    total = 0.0
    for i in range(batch):
        # Similarity of query i against EVERY item in the batch.
        scores = []
        for j in range(batch):
            dot = sum(a * b for a, b in zip(queries[i], items[j]))
            scores.append(dot / temperature)

        # Softmax cross-entropy with the true label being i itself.
        largest = max(scores)
        denominator = sum(math.exp(s - largest) for s in scores)
        total -= (scores[i] - largest) - math.log(denominator)

    return total / batch`,
        profile: 'O(B²·d) for the similarity matrix, built with a Python loop per pair.',
      },
      'make-it-right': {
        code: `"""Two-tower retrieval - typed, with the diagnostics the loss will not give."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class TowerConfig:
    input_dim: int
    embedding_dim: int = 128
    hidden_dim: int = 512
    temperature: float = 0.05

    def __post_init__(self) -> None:
        if self.temperature <= 0:
            raise ValueError(f"temperature must be positive, got {self.temperature}")


class Tower(nn.Module):
    """One encoder. Query and item towers are SEPARATE instances - sharing
    weights only helps when data is scarce, and otherwise forces two different
    input distributions through one set of parameters."""

    def __init__(self, config: TowerConfig) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(config.input_dim, config.hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(config.hidden_dim, config.embedding_dim),
        )

    def forward(self, x: Tensor) -> Tensor:
        # L2-normalize so the dot product IS cosine similarity. Most ANN
        # indices assume this, and skipping it makes distances meaningless.
        return nn.functional.normalize(self.net(x), p=2, dim=-1)


@dataclass(frozen=True)
class ContrastiveStep:
    loss: Tensor
    accuracy: float
    embedding_std: float

    @property
    def has_collapsed(self) -> bool:
        """Representation collapse is invisible in the loss and fatal to
        retrieval - all embeddings drift together and the loss still looks
        fine. Embedding spread is the only signal that catches it."""
        return self.embedding_std < 0.01


def contrastive_step(
    query_tower: Tower,
    item_tower: Tower,
    query_features: Tensor,
    item_features: Tensor,
    temperature: float,
) -> ContrastiveStep:
    if query_features.size(0) != item_features.size(0):
        raise ValueError("queries and items must be paired one-to-one")
    if query_features.size(0) < 2:
        raise ValueError("in-batch negatives need a batch of at least 2")

    queries = query_tower(query_features)
    items = item_tower(item_features)

    # The whole B x B similarity matrix in one product. The diagonal is the
    # positive pair; everything off-diagonal is a negative, for free.
    similarity = (queries @ items.T) / temperature
    labels = torch.arange(similarity.size(0), device=similarity.device)

    loss = nn.functional.cross_entropy(similarity, labels)

    with torch.no_grad():
        accuracy = float((similarity.argmax(dim=1) == labels).float().mean())
        embedding_std = float(items.std(dim=0).mean())

    return ContrastiveStep(loss=loss, accuracy=accuracy, embedding_std=embedding_std)`,
        rationale:
          'The per-pair loop collapses into one B×B matrix product, which is both faster and clearer about what in-batch negatives actually are. Embeddings are L2-normalized so similarity is genuinely cosine, and the step returns embedding spread — because representation collapse is fatal to retrieval and completely invisible in the loss curve.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'O(B²·d) as one GEMM plus a cross-entropy reduction.',
      },
      'make-it-fast': {
        code: `"""Retrieval at scale - cross-device negatives, hard mining, quantized index."""

import numpy as np
import torch
import torch.distributed as dist
from numpy.typing import NDArray
from torch import Tensor


def gather_across_devices(embeddings: Tensor) -> Tensor:
    """Collect embeddings from every rank to widen the negative pool.

    Batch size IS the objective here - more in-batch negatives is a harder and
    more informative task. Gathering across N devices multiplies the effective
    negatives by N without any device holding a larger batch.
    """
    if not dist.is_initialized():
        return embeddings

    gathered = [torch.zeros_like(embeddings) for _ in range(dist.get_world_size())]
    dist.all_gather(gathered, embeddings)
    # The local slice must keep its graph connection - all_gather detaches,
    # so splicing it back in is what preserves the local gradient path.
    gathered[dist.get_rank()] = embeddings
    return torch.cat(gathered, dim=0)


def mine_hard_negatives(
    query_embeddings: Tensor,
    item_embeddings: Tensor,
    positive_indices: Tensor,
    k: int = 8,
) -> Tensor:
    """Retrieve the model's own top mistakes as negatives.

    Random negatives plateau early - separating a query from an unrelated item
    is trivial. Hard negatives are where the remaining signal is, and mining
    them from the model's CURRENT retrievals is what keeps the task hard as it
    improves.
    """
    with torch.no_grad():
        scores = query_embeddings @ item_embeddings.T
        # Mask the true positive so it cannot be mined as its own negative.
        scores.scatter_(1, positive_indices.unsqueeze(1), float("-inf"))
        return scores.topk(k, dim=1).indices


def build_quantized_index(embeddings: NDArray[np.float32], n_centroids: int = 4096):
    """IVF-PQ index: coarse partition plus product quantization.

    Flat search is O(N·d) per query and does not hold a catalogue of millions
    in memory. IVF probes only a few partitions, and PQ compresses each vector
    from d floats to a handful of bytes - together roughly 100x smaller and
    sublinear to search, at a measurable and TUNABLE recall cost.
    """
    import faiss

    dim = embeddings.shape[1]
    # Contiguous float32 is what FAISS expects; anything else is copied.
    embeddings = np.ascontiguousarray(embeddings, dtype=np.float32)
    faiss.normalize_L2(embeddings)

    quantizer = faiss.IndexFlatIP(dim)
    index = faiss.IndexIVFPQ(quantizer, dim, n_centroids, dim // 4, 8)

    index.train(embeddings)
    index.add(embeddings)
    index.nprobe = 32      # partitions probed per query - the recall/latency dial

    return index`,
        rationale:
          'Three changes aimed at the three real bottlenecks. Cross-device gathering widens the negative pool without any single device holding a bigger batch — which matters because batch size *is* the objective here. Hard-negative mining keeps the task difficult as the model improves, where random negatives plateau. And an IVF-PQ index makes catalogue-scale search sublinear and roughly 100× smaller in memory, at a tunable recall cost.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'all_gather multiplies the effective negative count by the device count, and since more negatives is a strictly harder task, this improves model quality rather than just throughput.',
            tradeoff: 'Communication cost scales with embedding size and device count, and the local-slice splice is easy to get wrong — omitting it silently kills the local gradient.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'FAISS requires contiguous float32; passing anything else triggers a full silent copy of the whole catalogue.',
            tradeoff: 'Forces a materialized copy when embeddings arrive as a view or in float64.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Product quantization stores each vector as a handful of subspace codes rather than d floats, so distance computation reads roughly 100x less memory — ANN search is memory-bound, so that is where the win is.',
            tradeoff: 'Quantization is lossy and recall degrades measurably; without a labelled probe set the loss is completely invisible in production.',
          },
        ],
        libraryName: 'PyTorch / FAISS',
        profile: 'O(B²·d) training per device; sublinear ANN search at serve. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Two-tower retrieval with in-batch negatives - the objective, written out.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

// One tower: linear layer, then L2-normalize so the dot product is a cosine.
std::vector<double> Encode(const std::vector<double>& features,
                           const std::vector<std::vector<double>>& weights) {
  std::vector<double> out(weights.size(), 0.0);
  for (std::size_t j = 0; j < weights.size(); ++j) {
    double acc = 0.0;
    for (std::size_t k = 0; k < features.size(); ++k) acc += features[k] * weights[j][k];
    out[j] = acc;
  }

  double norm = 0.0;
  for (const double v : out) norm += v * v;
  norm = std::sqrt(norm);
  if (norm > 0.0) {
    for (double& v : out) v /= norm;
  }
  return out;
}

// InfoNCE over the batch. Every OTHER item is a negative for each query, so
// B examples yield B*B training signals.
double InBatchLoss(const std::vector<std::vector<double>>& query_features,
                   const std::vector<std::vector<double>>& item_features,
                   const std::vector<std::vector<double>>& q_weights,
                   const std::vector<std::vector<double>>& d_weights,
                   double temperature) {
  const std::size_t batch = query_features.size();

  std::vector<std::vector<double>> queries, items;
  for (const auto& q : query_features) queries.push_back(Encode(q, q_weights));
  for (const auto& d : item_features) items.push_back(Encode(d, d_weights));

  double total = 0.0;
  for (std::size_t i = 0; i < batch; ++i) {
    std::vector<double> scores(batch);
    for (std::size_t j = 0; j < batch; ++j) {
      double dot = 0.0;
      for (std::size_t k = 0; k < queries[i].size(); ++k) dot += queries[i][k] * items[j][k];
      scores[j] = dot / temperature;
    }

    // Softmax cross-entropy with the diagonal as the true label.
    const double largest = *std::max_element(scores.begin(), scores.end());
    double denominator = 0.0;
    for (const double s : scores) denominator += std::exp(s - largest);
    total -= (scores[i] - largest) - std::log(denominator);
  }

  return total / static_cast<double>(batch);
}`,
        profile: 'O(B²·d) with a score vector allocated per query row and embeddings scattered across the heap.',
      },
      'make-it-right': {
        code: `// Two-tower retrieval - flat embeddings, reused scratch, collapse diagnostic.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <vector>

struct ContrastiveResult {
  double loss;
  double accuracy;
  double embedding_std;

  // Representation collapse is invisible in the loss and fatal to retrieval:
  // every embedding drifts together while the loss still looks reasonable.
  [[nodiscard]] bool HasCollapsed() const noexcept { return embedding_std < 0.01; }
};

class ContrastiveScorer {
 public:
  ContrastiveScorer(std::size_t batch, std::size_t dim, double temperature)
      : batch_(batch), dim_(dim), temperature_(temperature), scores_(batch) {
    if (batch < 2) throw std::invalid_argument("in-batch negatives need a batch of at least 2");
    if (temperature <= 0.0) throw std::invalid_argument("temperature must be positive");
  }

  // queries and items are flat [batch x dim], already L2-normalized.
  // Scratch lives in the object and is reused across every call - the naive
  // version allocates a score vector per query row, every step.
  [[nodiscard]] ContrastiveResult Score(std::span<const double> queries,
                                        std::span<const double> items) {
    if (queries.size() != batch_ * dim_ || items.size() != batch_ * dim_) {
      throw std::invalid_argument("embedding buffers do not match batch x dim");
    }

    double total_loss = 0.0;
    std::size_t correct = 0;

    for (std::size_t i = 0; i < batch_; ++i) {
      const double* query = queries.data() + i * dim_;

      double largest = -std::numeric_limits<double>::infinity();
      std::size_t best = 0;
      for (std::size_t j = 0; j < batch_; ++j) {
        const double* item = items.data() + j * dim_;
        double dot = 0.0;
        for (std::size_t k = 0; k < dim_; ++k) dot += query[k] * item[k];
        scores_[j] = dot / temperature_;
        if (scores_[j] > largest) {
          largest = scores_[j];
          best = j;
        }
      }
      if (best == i) ++correct;

      double denominator = 0.0;
      for (const double s : scores_) denominator += std::exp(s - largest);
      total_loss -= (scores_[i] - largest) - std::log(denominator);
    }

    return ContrastiveResult{total_loss / static_cast<double>(batch_),
                             static_cast<double>(correct) / static_cast<double>(batch_),
                             EmbeddingStd(items)};
  }

 private:
  // Mean per-dimension standard deviation - the collapse signal.
  [[nodiscard]] double EmbeddingStd(std::span<const double> items) const {
    double total = 0.0;
    for (std::size_t k = 0; k < dim_; ++k) {
      double mean = 0.0;
      for (std::size_t i = 0; i < batch_; ++i) mean += items[i * dim_ + k];
      mean /= static_cast<double>(batch_);

      double variance = 0.0;
      for (std::size_t i = 0; i < batch_; ++i) {
        const double d = items[i * dim_ + k] - mean;
        variance += d * d;
      }
      total += std::sqrt(variance / static_cast<double>(batch_));
    }
    return total / static_cast<double>(dim_);
  }

  std::size_t batch_, dim_;
  double temperature_;
  std::vector<double> scores_;   // reused across calls
};`,
        rationale:
          'Embeddings move to flat row-major buffers so each row is contiguous, the score scratch lives in the object and is reused across every step rather than allocated per query, and the result carries the embedding-spread diagnostic — the only signal that catches representation collapse, which the loss curve will never reveal.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(B²·d), one persistent scratch vector, contiguous access throughout.',
      },
      'make-it-fast': {
        code: `// Two-tower retrieval - Eigen, one GEMM for the whole similarity matrix.
#include <Eigen/Dense>
#include <stdexcept>

struct ContrastiveResult {
  float loss;
  float accuracy;
};

// The entire B x B similarity matrix in ONE product.
//
// The per-pair loop is memory-bound and has no reuse; as a GEMM it becomes
// compute-bound and cache-blocked. This is the same im2col-style insight as
// convolution: reshape the problem until it is a matrix multiply.
ContrastiveResult ContrastiveLoss(const Eigen::MatrixXf& queries,
                                  const Eigen::MatrixXf& items,
                                  float temperature) {
  if (queries.rows() != items.rows()) {
    throw std::invalid_argument("queries and items must be paired one-to-one");
  }
  const Eigen::Index batch = queries.rows();

  // [B x d] * [d x B] -> [B x B]. One GEMM.
  Eigen::MatrixXf similarity = (queries * items.transpose()) / temperature;

  // Row-wise log-sum-exp as fused array expressions, never materializing the
  // exponentiated matrix separately from its reduction.
  const Eigen::VectorXf row_max = similarity.rowwise().maxCoeff();
  const Eigen::VectorXf log_denominator =
      ((similarity.colwise() - row_max).array().exp().rowwise().sum()).log() +
      row_max.array();

  float total = 0.0f;
  Eigen::Index correct = 0;
  for (Eigen::Index i = 0; i < batch; ++i) {
    total -= similarity(i, i) - log_denominator(i);

    Eigen::Index best;
    similarity.row(i).maxCoeff(&best);
    if (best == i) ++correct;
  }

  return ContrastiveResult{total / static_cast<float>(batch),
                           static_cast<float>(correct) / static_cast<float>(batch)};
}

// L2-normalize rows in place so the dot product is exactly a cosine.
void NormalizeRows(Eigen::MatrixXf& embeddings) {
  // rowwise().norm() then a broadcast divide, fused into one traversal.
  const Eigen::VectorXf norms = embeddings.rowwise().norm().cwiseMax(1e-12f);
  embeddings = embeddings.array().colwise() / norms.array();
}`,
        rationale:
          'The per-pair scoring loop becomes a single GEMM for the whole B×B similarity matrix — the same reshape-into-matrix-multiply insight that im2col applies to convolution, turning a memory-bound loop with no reuse into a compute-bound blocked kernel. The log-sum-exp is expressed as fused array operations so the exponentiated matrix is never materialized separately from its reduction.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The B x B similarity matrix is one GEMM rather than B² separate dot products, which is where essentially all the speedup comes from.',
            tradeoff: 'The full B x B matrix is materialized, so memory grows quadratically with batch size — and batch size is exactly what you want to increase here.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The row-wise log-sum-exp composes into fused traversals instead of building separate exponentiated and reduced matrices.',
            tradeoff: 'Storing such an expression in auto rather than a concrete type yields a dangling reference.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen depends on the compiler to vectorize its kernels; unoptimized it is no faster than the hand-written loop.',
            tradeoff: '-march=native produces a binary that may not run on older CPUs in the fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'One GEMM plus fused reductions per step. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Two-tower retrieval with in-batch negatives - the objective, written out.

/// One tower: linear layer, then L2-normalize so the dot product is a cosine.
pub fn encode(features: &[f64], weights: &[Vec<f64>]) -> Vec<f64> {
    let mut out = vec![0.0; weights.len()];
    for j in 0..weights.len() {
        let mut acc = 0.0;
        for k in 0..features.len() {
            acc += features[k] * weights[j][k];
        }
        out[j] = acc;
    }

    let norm: f64 = out.iter().map(|v| v * v).sum::<f64>().sqrt();
    if norm > 0.0 {
        for v in out.iter_mut() {
            *v /= norm;
        }
    }
    out
}

/// InfoNCE over the batch. Every OTHER item is a negative for each query, so
/// B examples yield B*B training signals.
pub fn in_batch_loss(
    query_features: &[Vec<f64>],
    item_features: &[Vec<f64>],
    q_weights: &[Vec<f64>],
    d_weights: &[Vec<f64>],
    temperature: f64,
) -> f64 {
    let batch = query_features.len();

    let queries: Vec<Vec<f64>> = query_features.iter().map(|q| encode(q, q_weights)).collect();
    let items: Vec<Vec<f64>> = item_features.iter().map(|d| encode(d, d_weights)).collect();

    let mut total = 0.0;
    for i in 0..batch {
        let mut scores = vec![0.0; batch];
        for j in 0..batch {
            let mut dot = 0.0;
            for k in 0..queries[i].len() {
                dot += queries[i][k] * items[j][k];
            }
            scores[j] = dot / temperature;
        }

        // Softmax cross-entropy with the diagonal as the true label.
        let largest = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let denominator: f64 = scores.iter().map(|s| (s - largest).exp()).sum();
        total -= (scores[i] - largest) - denominator.ln();
    }

    total / batch as f64
}`,
        profile: 'O(B²·d) with a score vector allocated per query and embeddings in scattered Vecs.',
      },
      'make-it-right': {
        code: `//! Two-tower retrieval - flat embeddings, typed errors, collapse diagnostic.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum ContrastiveError {
    BatchTooSmall,
    BadTemperature,
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for ContrastiveError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::BatchTooSmall => write!(f, "in-batch negatives need a batch of at least 2"),
            Self::BadTemperature => write!(f, "temperature must be positive"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected a {expected}-element buffer, found {found}")
            }
        }
    }
}

impl std::error::Error for ContrastiveError {}

#[derive(Debug, Clone, Copy)]
pub struct ContrastiveResult {
    pub loss: f32,
    pub accuracy: f32,
    pub embedding_std: f32,
}

impl ContrastiveResult {
    /// Representation collapse is invisible in the loss and fatal to
    /// retrieval — every embedding drifts together while the loss looks fine.
    #[must_use]
    pub fn has_collapsed(&self) -> bool {
        self.embedding_std < 0.01
    }
}

pub struct ContrastiveScorer {
    batch: usize,
    dim: usize,
    temperature: f32,
    /// Reused across every call — the naive version allocates per query row.
    scores: Vec<f32>,
}

impl ContrastiveScorer {
    pub fn new(batch: usize, dim: usize, temperature: f32) -> Result<Self, ContrastiveError> {
        if batch < 2 {
            return Err(ContrastiveError::BatchTooSmall);
        }
        if temperature <= 0.0 {
            return Err(ContrastiveError::BadTemperature);
        }
        Ok(Self { batch, dim, temperature, scores: vec![0.0; batch] })
    }

    /// \`queries\` and \`items\` are flat [batch x dim], already L2-normalized.
    pub fn score(
        &mut self,
        queries: &[f32],
        items: &[f32],
    ) -> Result<ContrastiveResult, ContrastiveError> {
        let expected = self.batch * self.dim;
        if queries.len() != expected {
            return Err(ContrastiveError::ShapeMismatch { expected, found: queries.len() });
        }
        if items.len() != expected {
            return Err(ContrastiveError::ShapeMismatch { expected, found: items.len() });
        }

        let mut total_loss = 0.0_f32;
        let mut correct = 0usize;

        for i in 0..self.batch {
            let query = &queries[i * self.dim..(i + 1) * self.dim];

            let mut largest = f32::NEG_INFINITY;
            let mut best = 0usize;
            for (j, slot) in self.scores.iter_mut().enumerate() {
                let item = &items[j * self.dim..(j + 1) * self.dim];
                let dot: f32 = query.iter().zip(item).map(|(a, b)| a * b).sum();
                *slot = dot / self.temperature;
                if *slot > largest {
                    largest = *slot;
                    best = j;
                }
            }
            if best == i {
                correct += 1;
            }

            let denominator: f32 = self.scores.iter().map(|s| (s - largest).exp()).sum();
            total_loss -= (self.scores[i] - largest) - denominator.ln();
        }

        Ok(ContrastiveResult {
            loss: total_loss / self.batch as f32,
            accuracy: correct as f32 / self.batch as f32,
            embedding_std: embedding_std(items, self.batch, self.dim),
        })
    }
}

/// Mean per-dimension standard deviation — the collapse signal.
fn embedding_std(items: &[f32], batch: usize, dim: usize) -> f32 {
    let mut total = 0.0_f32;
    for k in 0..dim {
        let mean: f32 = (0..batch).map(|i| items[i * dim + k]).sum::<f32>() / batch as f32;
        let variance: f32 =
            (0..batch).map(|i| (items[i * dim + k] - mean).powi(2)).sum::<f32>() / batch as f32;
        total += variance.sqrt();
    }
    total / dim as f32
}`,
        rationale:
          'Embeddings become flat contiguous buffers, the score scratch lives in the scorer and is reused rather than allocated per query, and failures are a typed Result validated at construction. The result carries embedding spread because collapse is the failure that matters here and the loss curve gives no warning of it.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(B²·d), one persistent scratch vector, contiguous access.',
      },
      'make-it-fast': {
        code: `//! Retrieval - parallel similarity rows, quantized index scan.

use rayon::prelude::*;

/// InfoNCE with the similarity matrix computed row-parallel.
///
/// Each query's row is independent, so workers never share state and no
/// reduction is needed beyond summing the per-row losses.
pub fn contrastive_loss_parallel(
    queries: &[f32],
    items: &[f32],
    batch: usize,
    dim: usize,
    temperature: f32,
) -> f32 {
    let total: f32 = (0..batch)
        .into_par_iter()
        .map(|i| {
            let query = &queries[i * dim..(i + 1) * dim];

            // Per-worker scratch, allocated once per row rather than per pair.
            let mut scores = Vec::with_capacity(batch);
            let mut largest = f32::NEG_INFINITY;

            for j in 0..batch {
                let item = &items[j * dim..(j + 1) * dim];
                let dot: f32 = query.iter().zip(item).map(|(a, b)| a * b).sum();
                let score = dot / temperature;
                largest = largest.max(score);
                scores.push(score);
            }

            let denominator: f32 = scores.iter().map(|s| (s - largest).exp()).sum();
            -((scores[i] - largest) - denominator.ln())
        })
        .sum();

    total / batch as f32
}

/// Asymmetric distance scan over a product-quantized index.
///
/// Each vector is stored as \`m\` subspace codes rather than \`dim\` floats -
/// roughly a 100x memory reduction. The query is decompressed ONCE into a
/// lookup table, then every candidate is scored by summing \`m\` table reads.
/// ANN search is memory-bound, so shrinking the data IS the optimization.
pub fn pq_search(
    lookup: &[f32],     // [m x 256] distances from this query to every centroid
    codes: &[u8],       // [n x m] quantized catalogue
    m: usize,
    top_k: usize,
) -> Vec<(usize, f32)> {
    let mut scored: Vec<(usize, f32)> = codes
        .par_chunks_exact(m)
        .enumerate()
        .map(|(index, code)| {
            // m table lookups and adds - no floating-point distance computed
            // against a full-width vector anywhere.
            let distance: f32 = code
                .iter()
                .enumerate()
                .map(|(sub, &c)| lookup[sub * 256 + c as usize])
                .sum();
            (index, distance)
        })
        .collect();

    // select_nth_unstable, not a full sort: O(n) to partition around the k-th
    // element versus O(n log n) to order everything we then discard.
    if scored.len() > top_k {
        scored.select_nth_unstable_by(top_k, |a, b| a.1.total_cmp(&b.1));
        scored.truncate(top_k);
    }
    scored.sort_unstable_by(|a, b| a.1.total_cmp(&b.1));
    scored
}`,
        rationale:
          'Similarity rows are computed in parallel — each row is independent, so there is no shared state. The search path uses product-quantized codes with an asymmetric distance table: the query is decompressed once and every candidate costs m table lookups instead of a full-width distance, which matters because ANN search is memory-bound. Top-k uses select_nth_unstable rather than a full sort.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each similarity row and each candidate distance is independent, so both loops partition across cores with no synchronization.',
            tradeoff: 'Per-row scratch is allocated per worker task; at very small batches the allocation dominates the arithmetic.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Quantized codes are one contiguous byte array, so scanning the catalogue streams sequentially and roughly 100x less memory moves than with full-width float vectors.',
            tradeoff: 'Quantization is lossy — recall degrades measurably and invisibly without a labelled probe set to measure it.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'select_nth_unstable partitions around the k-th element in O(n) rather than sorting all n candidates that are then mostly discarded.',
            tradeoff: 'Partitioning leaves the tail unordered, so a second small sort is still needed for the k results that are kept.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(B²·d) training across cores; O(n·m) byte-wise index scan. Illustrative, not a measured benchmark.',
      },
    },
  },
};
