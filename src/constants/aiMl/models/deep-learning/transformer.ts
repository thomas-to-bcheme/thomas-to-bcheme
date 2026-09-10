import type { AiMlModel } from '../../types';

export const TRANSFORMER: AiMlModel = {
  slug: 'transformer',
  name: 'Transformer',
  aliases: ['Self-attention network', 'Encoder-only Transformer', 'BERT-family'],
  category: 'deep-learning',
  group: 'attention',
  kind: 'model',

  paradigms: ['supervised', 'self-supervised'],
  taskTypes: [
    'sequence-modeling',
    'classification',
    'regression',
    'ranking',
    'anomaly-detection',
  ],
  architecture: 'transformer',

  intuition:
    'Every position looks at every other position and decides, from content alone, which ones matter to it. A convolution asserts in advance that neighbours are relevant; recurrence asserts that recency is. Attention asserts neither — it learns the routing. That is why it transfers across modalities, and also why it needs far more data than architectures whose prior is built in: it has to learn from scratch what the others assume.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}}\\right)V',
      symbols: [
        { symbol: 'Q, K, V', meaning: 'queries, keys and values — three learned projections of the same input' },
        { symbol: 'QK^{\\top}', meaning: 'all-pairs similarity: an n x n matrix of how much each position attends to each other' },
        { symbol: '\\sqrt{d_k}', meaning: 'the scaling that keeps the softmax out of its saturated regime' },
        { symbol: 'V', meaning: 'the values, mixed according to the attention weights' },
      ],
    },
    reading:
      'Compare every position against every other, normalize those scores into weights, and take a weighted average of the values. The division by root-d_k is not cosmetic: without it, dot products of high-dimensional vectors grow with dimension, the softmax saturates into a near one-hot, and gradients vanish. The task loss on top is ordinary — cross-entropy for tokens, MSE for regression.',
  },

  optimization: {
    method: 'AdamW with warmup and cosine decay, pre-norm residual blocks, gradient clipping',
    updateRule: {
      formula:
        '\\eta_t = \\eta_{\\max} \\cdot \\min\\!\\left(\\frac{t}{T_{\\text{warm}}},\; \\tfrac{1}{2}\\Bigl(1 + \\cos\\tfrac{\\pi (t - T_{\\text{warm}})}{T - T_{\\text{warm}}}\\Bigr)\\right)',
      symbols: [
        { symbol: 'T_{\\text{warm}}', meaning: 'warmup steps — a linear ramp from zero' },
        { symbol: '\\eta_{\\max}', meaning: 'peak learning rate, reached at the end of warmup' },
        { symbol: 't', meaning: 'the current optimizer step' },
      ],
    },
    rationale:
      'Warmup is genuinely load-bearing rather than a tuning nicety. Adam\'s second-moment estimate is unreliable in the first few hundred steps, and combined with the residual stream that produces enormous early updates that destroy the attention patterns before they form. Ramping the learning rate from zero avoids it. Pre-norm placement — LayerNorm before the sublayer rather than after — is the other structural fix: it gives the residual stream a clean identity path, which is what made deep transformers trainable without exhaustive warmup tuning. AdamW rather than Adam because decoupled weight decay actually regularizes here, where L2-in-the-gradient does not.',
    hyperparameters: [
      { name: 'd_model / n_heads', role: 'Width and how many independent attention subspaces; head dim is d_model/n_heads', typicalRange: '256–4096, 4–32 heads' },
      { name: 'depth', role: 'Number of blocks; capacity scales roughly with depth x width', typicalRange: '6 to 96' },
      { name: 'warmup steps', role: 'Ramp length — too short and early updates destabilize training', typicalRange: '1% to 10% of total steps' },
      { name: 'context length', role: 'Sequence window; attention cost is quadratic in this', typicalRange: '512 to 128k' },
      { name: 'dropout', role: 'Applied to attention weights and residuals; often 0 at very large scale', typicalRange: '0.0 to 0.1' },
    ],
    convergence:
      'Non-convex but, with warmup and pre-norm, remarkably reliable — which is precisely why the architecture scaled. The characteristic failures are about data and memory rather than optimization: overfitting badly when pretraining is skipped, and running out of memory because attention is quadratic in sequence length. Attention-entropy collapse is the subtle one — heads degenerate into attending to a single position and stop contributing, which the loss does not reveal and only per-head inspection catches.',
    complexity:
      'O(n²·d) time and O(n²) memory for attention, plus O(n·d²) for the feed-forward layers. The quadratic term dominates past a few thousand tokens and is the entire reason FlashAttention, sliding-window attention, and linear-attention variants exist.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Patch the series into segments, embed each patch as a token, and attend across patches. Patching rather than one-token-per-timestep is what made transformers competitive here — it cuts sequence length by the patch factor and gives each token enough local context to be meaningful.',
        where: [
          'Long-horizon multivariate forecasting with many correlated series',
          'Forecasting with rich exogenous covariates that attention can weight per horizon',
        ],
        why: 'Competitive rather than dominant, and worth being precise about: a well-tuned linear model beats many transformer forecasters on standard benchmarks, which was a genuinely embarrassing finding for the field. It earns its cost when series are numerous, histories are long, and cross-series structure exists to learn — otherwise the inductive bias it lacks is the bias you needed.',
        featurization: [
          'Patch the series; per-timestep tokens make sequence length explode for no benefit',
          'Instance-normalize per series to handle distribution shift between train and test windows',
          'Causal masking is mandatory — bidirectional attention leaks the future',
        ],
        evaluation:
          'Rolling-origin backtesting scored with MASE against seasonal naive AND against a linear baseline, because the linear baseline frequently wins.',
        pitfalls: [
          'Omitting the causal mask leaks future values and produces spectacular, meaningless validation scores',
          'Quadratic memory makes long lookbacks infeasible without patching or windowed attention',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Train on normal sequences and score by prediction or reconstruction error, or use masked reconstruction — mask random positions and measure how badly they are recovered.',
        where: [
          'Multivariate telemetry monitoring where cross-channel relationships define normal',
          'Log-sequence anomaly detection over structured event streams',
        ],
        why: 'The advantage over an LSTM detector is that attention can relate distant events directly, so a failure whose precursor was hours earlier is reachable. The cost is data hunger and the same capacity trap every reconstruction detector has — a large enough model reconstructs anomalies too.',
        featurization: [
          'Train exclusively on confirmed-normal windows',
          'Attention weights double as an explanation of which positions drove the score',
        ],
        evaluation:
          'Precision@k and time-to-detection against confirmed incidents, holding out whole episodes rather than points.',
        pitfalls: [
          'Needs far more normal data than a classical detector before it is competitive',
          'Excess capacity reconstructs anomalies and the detector goes blind',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Not an optimizer. It appears as a learned dynamics model whose rollouts a planner searches over, and increasingly as the policy network inside decision-transformer formulations that treat trajectories as sequences.',
        where: [
          'World models in model-based RL, where attention over trajectory history conditions the prediction',
          'Sequence-to-sequence formulations of routing and scheduling',
        ],
        why: 'Offers no constraint guarantees and no optimality argument, so it belongs inside the loop rather than replacing the solver. Its real contribution is conditioning on long context — a schedule that depends on events far back is expressible here and not in a Markov state.',
        featurization: [
          'Encode the action as part of the token, or the dynamics model is not conditioned on what you did',
          'Train on trajectories under a diverse action distribution or it knows only one regime',
        ],
        evaluation:
          'Multi-step rollout error under held-out action sequences — a planner exploits exactly the horizon where the model is weakest.',
        pitfalls: [
          'One-step accuracy is a poor proxy for rollout accuracy, and only the latter matters to a planner',
          'No feasibility guarantee, so a hard-constrained problem still needs a classical solver',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Pretrain on unlabelled text with a masked or autoregressive objective, then fine-tune a small head on the downstream task. For encoder models the pretrained representation is the product; the head is almost an afterthought.',
        where: [
          'Named-entity recognition, classification and extraction on a pretrained encoder',
          'Semantic search and reranking from contextual embeddings',
          'Text-to-SQL and structured extraction via sequence-to-sequence decoding',
        ],
        why: 'The architecture the field converged on, and the reason is transfer: attention plus scale turned a single self-supervised objective into general linguistic capability, so a few thousand labelled examples now suffice where a from-scratch model needed hundreds of thousands. The economics of NLP inverted because of this.',
        featurization: [
          'Use the pretrained tokenizer exactly — a mismatched vocabulary silently destroys the transfer',
          'Bucket by sequence length to limit padding waste under quadratic attention',
        ],
        evaluation:
          'Task F1 or exact match on a held-out split, with explicit contamination checks against the pretraining corpus.',
        pitfalls: [
          'Fine-tuning on a small set can catastrophically forget the pretrained representation — use a low learning rate',
          'Benchmark contamination inflates reported scores when the eval set appeared in pretraining data',
        ],
      },
      'computer-vision': {
        fit: 'viable',
        how: 'Vision Transformer: split the image into fixed patches, embed each as a token, and attend across them with a positional encoding supplying the spatial information convolution gets structurally.',
        where: [
          'Large-scale image classification where pretraining data is abundant',
          'Multimodal models where a shared architecture across vision and text is the point',
        ],
        why: 'Overtakes CNNs at very large scale, where enough data exists to *learn* the spatial prior rather than assume it — and loses below that threshold, because a learned prior needs far more evidence than a built-in one. The honest rule is that dataset size, not architecture fashion, decides between them.',
        featurization: [
          'Patch size trades sequence length against spatial detail directly',
          'Heavy augmentation and regularization are required — ViTs overfit more readily than CNNs',
        ],
        evaluation: 'Top-k accuracy sliced by lighting, pose and demographic, plus robustness under corruption.',
        pitfalls: [
          'Underperforms a CNN on modest datasets, sometimes badly',
          'Quadratic attention over patches makes high-resolution input expensive without windowing',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Session-based recommendation: treat the interaction history as a token sequence and attend over it to predict the next item.',
        where: [
          'Sequential recommendation where order and recency both matter',
          'Reranking a candidate set with cross-attention between query and items',
        ],
        why: 'Captures long-range session structure that a bag-of-history model discards. In practice gradient boosting still wins the final ranking stage on tabular features, so this typically supplies the retrieval or the sequence representation rather than the final score.',
        featurization: [
          'Cap history length; attention cost is quadratic in it',
          'Include dwell time and gaps as features — the sequence alone is not the whole signal',
        ],
        evaluation: 'NDCG@k offline with online A/B as the decision, since offline ranking gains routinely fail to transfer.',
        pitfalls: [
          'The catalogue is the output vocabulary, so the softmax needs sampling or candidate generation',
          'Logged sequences reflect what the previous ranker chose to show',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Pretraining is GPU-months at scale and is why almost nobody does it. Fine-tuning a pretrained encoder is minutes to hours on one GPU, which is the path essentially everyone takes.',
    inferenceProfile:
      'Tens of milliseconds for an encoder on GPU. Cost is dominated by sequence length through the quadratic attention term, so batching by similar length matters more than batch size.',
    retrainingCadence:
      'Fine-tune when the task distribution shifts; re-pretrain essentially never. Vocabulary drift is usually handled by fine-tuning rather than starting over.',
    driftAndMonitoring: [
      'Track out-of-vocabulary and unknown-token rates — a rising rate signals the domain moving away from the tokenizer',
      'Monitor per-slice task metrics; aggregate scores hide subgroup degradation entirely',
      'Watch input length distribution, since a shift changes both latency and cost non-linearly',
    ],
    productionGotchas: [
      'Tokenizer and model must be versioned together — a vocabulary mismatch produces plausible-looking nonsense',
      'Padding and attention masks must be correct, or padded positions silently contribute to the output',
      'Batching by uniform length rather than uniform count is what actually controls serving cost',
    ],
  },

  assumptions: [
    'Enough data exists to learn the routing that convolution and recurrence assume structurally',
    'The relevant context fits inside the attention window, since nothing outside it is reachable',
    'Positional information is supplied explicitly — attention itself is permutation-invariant',
    'A pretrained checkpoint exists in a compatible domain, or the data budget is very large',
  ],

  pros: [
    {
      point: 'Fully parallel across sequence positions',
      context:
        'The structural reason it displaced recurrence: training parallelizes over the sequence axis, which made pretraining at scale economically possible. Irrelevant at inference for autoregressive decoding, which is sequential again.',
    },
    {
      point: 'Direct paths between distant positions',
      context:
        'Any two positions are one attention hop apart, so long-range dependency does not degrade with distance the way it does through recurrence.',
    },
    {
      point: 'Transfers across modalities and tasks',
      context:
        'The same architecture serves text, vision, audio and time series, because it assumes almost nothing about input structure. That generality is exactly what costs it data efficiency.',
    },
    {
      point: 'Attention weights offer a partial window into the model',
      context:
        'Genuinely useful for debugging which positions drove a prediction — though attention is not a faithful explanation, and treating it as one is a known error.',
    },
  ],

  cons: [
    {
      point: 'Quadratic time and memory in sequence length',
      context:
        'The defining constraint. It is why long-context work is an active research area and why patching, windowing and FlashAttention exist. Irrelevant at 512 tokens, decisive at 100k.',
    },
    {
      point: 'Very data-hungry without pretraining',
      context:
        'It must learn the spatial or temporal prior that CNNs and RNNs have built in. On a modest dataset from scratch it will lose to both, and that is the expected outcome rather than a bug.',
    },
    {
      point: 'Permutation-invariant without positional encoding',
      context:
        'Attention alone cannot tell order. The positional scheme is a real design decision — absolute, relative and rotary encodings extrapolate to unseen lengths very differently.',
    },
    {
      point: 'Expensive and opaque relative to the alternatives',
      context:
        'Both training and serving cost more than a CNN or GBM of comparable task performance. On tabular data that trade is simply not worth making.',
    },
  ],

  relatedSlugs: ['lstm', 'cnn'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Scaled dot-product attention - the equation, transcribed.

Three loops: for each query position, score it against every key position,
softmax those scores, then take the weighted average of the values.
"""

import math


def softmax(scores):
    # Subtract the max before exponentiating - otherwise exp() overflows on
    # large logits and the whole row becomes NaN.
    largest = max(scores)
    exps = [math.exp(s - largest) for s in scores]
    total = sum(exps)
    return [e / total for e in exps]


def attention(queries, keys, values, causal=False):
    """queries[n][d_k], keys[m][d_k], values[m][d_v] -> output[n][d_v]."""
    n = len(queries)
    m = len(keys)
    d_k = len(queries[0])
    scale = 1.0 / math.sqrt(d_k)

    output = []
    for i in range(n):
        # Score this query against every key: the all-pairs comparison.
        scores = []
        for j in range(m):
            dot = sum(queries[i][k] * keys[j][k] for k in range(d_k))
            # Causal masking: a position may not attend to the future.
            # Without this a sequence model trivially cheats.
            if causal and j > i:
                scores.append(float("-inf"))
            else:
                # Scaling by sqrt(d_k) keeps the softmax out of saturation,
                # where gradients vanish.
                scores.append(dot * scale)

        weights = softmax(scores)

        # Weighted average of the value vectors.
        mixed = [0.0] * len(values[0])
        for j in range(m):
            for v in range(len(mixed)):
                mixed[v] += weights[j] * values[j][v]
        output.append(mixed)

    return output`,
        profile: 'O(n·m·d) in pure Python with the all-pairs matrix built row by row.',
      },
      'make-it-right': {
        code: `"""Transformer block - typed, pre-norm, with masking handled explicitly."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class TransformerConfig:
    d_model: int = 512
    n_heads: int = 8
    d_ff: int = 2048
    dropout: float = 0.1

    def __post_init__(self) -> None:
        if self.d_model % self.n_heads != 0:
            raise ValueError(
                f"d_model {self.d_model} must divide evenly by n_heads {self.n_heads}"
            )


class MultiHeadAttention(nn.Module):
    """Heads are a RESHAPE, not separate modules.

    One fused qkv projection then a view into (batch, heads, seq, head_dim) -
    running n_heads separate Linear layers would be the same arithmetic in
    n_heads times as many kernel launches.
    """

    def __init__(self, config: TransformerConfig) -> None:
        super().__init__()
        self.n_heads = config.n_heads
        self.head_dim = config.d_model // config.n_heads

        self.qkv = nn.Linear(config.d_model, 3 * config.d_model, bias=False)
        self.out = nn.Linear(config.d_model, config.d_model)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: Tensor, mask: Tensor | None = None) -> Tensor:
        batch, seq, _ = x.shape

        qkv = self.qkv(x).reshape(batch, seq, 3, self.n_heads, self.head_dim)
        q, k, v = qkv.permute(2, 0, 3, 1, 4)     # (batch, heads, seq, head_dim)

        scores = (q @ k.transpose(-2, -1)) / (self.head_dim ** 0.5)

        if mask is not None:
            # -inf, not a large negative number: after softmax this is exactly
            # zero, whereas -1e9 leaves a small residue that accumulates over
            # long sequences.
            scores = scores.masked_fill(mask == 0, float("-inf"))

        weights = self.dropout(torch.softmax(scores, dim=-1))
        mixed = (weights @ v).transpose(1, 2).reshape(batch, seq, -1)
        return self.out(mixed)


class TransformerBlock(nn.Module):
    """PRE-norm: LayerNorm before each sublayer, not after.

    Post-norm (the original paper) needs careful warmup tuning to train deep.
    Pre-norm leaves the residual stream a clean identity path, which is what
    made deep transformers trainable in practice.
    """

    def __init__(self, config: TransformerConfig) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(config.d_model)
        self.attention = MultiHeadAttention(config)
        self.norm2 = nn.LayerNorm(config.d_model)
        self.feedforward = nn.Sequential(
            nn.Linear(config.d_model, config.d_ff),
            nn.GELU(),
            nn.Linear(config.d_ff, config.d_model),
            nn.Dropout(config.dropout),
        )

    def forward(self, x: Tensor, mask: Tensor | None = None) -> Tensor:
        x = x + self.attention(self.norm1(x), mask)
        return x + self.feedforward(self.norm2(x))


def causal_mask(seq_len: int, device: str = "cpu") -> Tensor:
    """Lower-triangular mask. Omitting this in a sequence model lets every
    position read the answer, which validates spectacularly and means nothing."""
    return torch.tril(torch.ones(seq_len, seq_len, dtype=torch.bool, device=device))`,
        rationale:
          'Heads become a reshape of one fused qkv projection rather than separate modules — identical arithmetic in a fraction of the kernel launches. Normalization moves to pre-norm, which is what actually made deep transformers trainable, and masking uses true -inf rather than a large negative constant, whose residue accumulates over long sequences.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'O(n²·d) attention, O(n·d²) feed-forward, on fused kernels.',
      },
      'make-it-fast': {
        code: `"""Attention - FlashAttention, KV caching, length bucketing."""

import torch
from torch import Tensor, nn


class FastAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int) -> None:
        super().__init__()
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model, bias=False)
        self.out = nn.Linear(d_model, d_model)

    def forward(self, x: Tensor, is_causal: bool = True) -> Tensor:
        batch, seq, _ = x.shape
        qkv = self.qkv(x).reshape(batch, seq, 3, self.n_heads, self.head_dim)
        q, k, v = qkv.permute(2, 0, 3, 1, 4)

        # FlashAttention: never materializes the n x n score matrix at all.
        # It tiles the computation so scores stay in SRAM, which turns
        # attention from O(n^2) MEMORY to O(n) memory. That is the change that
        # made long context feasible - it is a memory-traffic win, not an
        # arithmetic one.
        mixed = torch.nn.functional.scaled_dot_product_attention(
            q, k, v, is_causal=is_causal
        )

        return self.out(mixed.transpose(1, 2).reshape(batch, seq, -1))


class CachedAttention(nn.Module):
    """Incremental decoding with a KV cache.

    Autoregressive generation recomputes attention over the entire prefix for
    every new token, which is O(n^2) work across a sequence for something that
    only needs O(n). Caching past keys and values makes each step O(n) instead
    - the single most important inference optimization for generation.
    """

    def __init__(self, d_model: int, n_heads: int, max_seq: int, max_batch: int) -> None:
        super().__init__()
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model, bias=False)
        self.out = nn.Linear(d_model, d_model)

        # Pre-allocated to full size. Growing the cache per token would
        # reallocate and copy on every single step of generation.
        self.register_buffer(
            "k_cache",
            torch.zeros(max_batch, n_heads, max_seq, self.head_dim),
            persistent=False,
        )
        self.register_buffer(
            "v_cache",
            torch.zeros(max_batch, n_heads, max_seq, self.head_dim),
            persistent=False,
        )

    def forward(self, x: Tensor, position: int) -> Tensor:
        batch, seq, _ = x.shape
        qkv = self.qkv(x).reshape(batch, seq, 3, self.n_heads, self.head_dim)
        q, k, v = qkv.permute(2, 0, 3, 1, 4)

        # Write this step's keys/values into the cache, then attend over the
        # whole prefix. No recomputation of anything already seen.
        self.k_cache[:batch, :, position : position + seq] = k
        self.v_cache[:batch, :, position : position + seq] = v

        keys = self.k_cache[:batch, :, : position + seq]
        values = self.v_cache[:batch, :, : position + seq]

        mixed = torch.nn.functional.scaled_dot_product_attention(
            q, keys, values, is_causal=False   # prefix is all valid history
        )
        return self.out(mixed.transpose(1, 2).reshape(batch, seq, -1))


def bucket_by_length(sequences: list[Tensor], bucket_size: int = 64) -> list[list[Tensor]]:
    """Group sequences of similar length before batching.

    Attention is quadratic in the PADDED length, so one long sequence in a
    batch makes every short one pay its cost. Bucketing is usually a larger
    throughput win than any kernel-level optimization.
    """
    ordered = sorted(sequences, key=len)
    return [ordered[i : i + bucket_size] for i in range(0, len(ordered), bucket_size)]`,
        rationale:
          'Three changes, each targeting a different bottleneck. FlashAttention never materializes the n×n score matrix, converting attention from quadratic *memory* to linear — the change that made long context feasible. KV caching turns autoregressive decoding from O(n²) total work into O(n). And length bucketing addresses the fact that attention cost is quadratic in the *padded* length, so one long sequence taxes every short one in its batch.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'FlashAttention tiles the score computation so it stays in SRAM and the n x n matrix is never written to memory — attention is memory-bandwidth bound, so this is where the win comes from.',
            tradeoff: 'The fused kernel supports a fixed set of mask patterns; a custom or arbitrary mask falls back to the materializing path and loses the benefit entirely.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The KV cache is allocated at full size once, so incremental decoding writes into it rather than reallocating and copying the whole prefix every token.',
            tradeoff: 'Memory is reserved for max_seq x max_batch whether used or not, which at long context is a large fixed cost even for short generations.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Length bucketing keeps padded length close to true length, and since attention is quadratic in padded length this is often the single largest throughput gain available.',
            tradeoff: 'Bucketing reorders the data, so any downstream code depending on input order must re-sort — and small buckets underfill the device.',
          },
        ],
        libraryName: 'PyTorch (SDPA)',
        profile: 'O(n) attention memory; O(n) per decode step with caching. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Scaled dot-product attention - the equation, transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <vector>

namespace {

// Subtract the max before exponentiating - otherwise exp() overflows on large
// logits and the row becomes NaN.
void SoftmaxInPlace(std::vector<double>& scores) {
  const double largest = *std::max_element(scores.begin(), scores.end());
  double total = 0.0;
  for (double& s : scores) {
    s = std::exp(s - largest);
    total += s;
  }
  for (double& s : scores) s /= total;
}

}  // namespace

// queries[n][d_k], keys[m][d_k], values[m][d_v] -> output[n][d_v]
std::vector<std::vector<double>> Attention(
    const std::vector<std::vector<double>>& queries,
    const std::vector<std::vector<double>>& keys,
    const std::vector<std::vector<double>>& values,
    bool causal) {
  const std::size_t n = queries.size();
  const std::size_t m = keys.size();
  const std::size_t d_k = queries[0].size();
  const std::size_t d_v = values[0].size();
  const double scale = 1.0 / std::sqrt(static_cast<double>(d_k));

  std::vector<std::vector<double>> output(n, std::vector<double>(d_v, 0.0));

  for (std::size_t i = 0; i < n; ++i) {
    // Score this query against every key - the all-pairs comparison.
    std::vector<double> scores(m);
    for (std::size_t j = 0; j < m; ++j) {
      if (causal && j > i) {
        // A position may not attend to the future.
        scores[j] = -std::numeric_limits<double>::infinity();
        continue;
      }
      double dot = 0.0;
      for (std::size_t k = 0; k < d_k; ++k) dot += queries[i][k] * keys[j][k];
      // Scaling keeps the softmax out of saturation, where gradients vanish.
      scores[j] = dot * scale;
    }

    SoftmaxInPlace(scores);

    for (std::size_t j = 0; j < m; ++j) {
      for (std::size_t v = 0; v < d_v; ++v) {
        output[i][v] += scores[j] * values[j][v];
      }
    }
  }

  return output;
}`,
        profile: 'O(n·m·d) with an m-length score vector allocated per query row.',
      },
      'make-it-right': {
        code: `// Attention - flat storage, fused QKV, scratch reused across rows.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

class MultiHeadAttention {
 public:
  MultiHeadAttention(std::size_t d_model, std::size_t n_heads)
      : d_model_(d_model), n_heads_(n_heads), head_dim_(d_model / n_heads) {
    if (n_heads == 0 || d_model % n_heads != 0) {
      throw std::invalid_argument("d_model must divide evenly by n_heads");
    }
  }

  // q, k, v are flat [seq x head_dim] for ONE head. out is [seq x head_dim].
  // Scratch is caller-owned and reused across heads and rows - the naive
  // version allocates a score vector per query row, which at seq=1024 across
  // 8 heads is thousands of allocations per forward pass.
  void AttendHead(std::span<const float> q, std::span<const float> k,
                  std::span<const float> v, std::size_t seq, bool causal,
                  std::span<float> scores, std::span<float> out) const {
    if (scores.size() < seq) throw std::invalid_argument("scratch too small");

    const float scale = 1.0f / std::sqrt(static_cast<float>(head_dim_));

    for (std::size_t i = 0; i < seq; ++i) {
      const float* query = q.data() + i * head_dim_;
      const std::size_t limit = causal ? i + 1 : seq;

      float largest = -std::numeric_limits<float>::infinity();
      for (std::size_t j = 0; j < limit; ++j) {
        const float* key = k.data() + j * head_dim_;
        float dot = 0.0f;
        for (std::size_t d = 0; d < head_dim_; ++d) dot += query[d] * key[d];
        scores[j] = dot * scale;
        largest = std::max(largest, scores[j]);
      }

      // Fused exp-and-sum: one pass rather than exponentiate then reduce.
      float total = 0.0f;
      for (std::size_t j = 0; j < limit; ++j) {
        scores[j] = std::exp(scores[j] - largest);
        total += scores[j];
      }

      float* dest = out.data() + i * head_dim_;
      std::fill(dest, dest + head_dim_, 0.0f);
      const float inv_total = 1.0f / total;
      for (std::size_t j = 0; j < limit; ++j) {
        const float weight = scores[j] * inv_total;
        const float* value = v.data() + j * head_dim_;
        for (std::size_t d = 0; d < head_dim_; ++d) dest[d] += weight * value[d];
      }
    }
  }

  [[nodiscard]] std::size_t head_dim() const noexcept { return head_dim_; }
  [[nodiscard]] std::size_t n_heads() const noexcept { return n_heads_; }

 private:
  std::size_t d_model_, n_heads_, head_dim_;
};`,
        rationale:
          'Scratch memory moves to the caller and is reused across heads and rows, removing thousands of allocations per forward pass. Causal masking becomes a loop bound rather than an -inf fill, so masked positions are never computed at all, and the exponentiate-and-sum is fused into one traversal instead of two.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n²·d) with roughly half the work under causal masking; zero allocation in the hot path.',
      },
      'make-it-fast': {
        code: `// Attention - Eigen, batched GEMM, tiled so the score matrix never lands.
#include <Eigen/Dense>
#include <cmath>

// Standard batched attention: three GEMMs and a softmax.
Eigen::MatrixXf AttentionGemm(const Eigen::MatrixXf& q, const Eigen::MatrixXf& k,
                              const Eigen::MatrixXf& v, bool causal) {
  const float scale = 1.0f / std::sqrt(static_cast<float>(q.cols()));

  // One GEMM for ALL pairs at once, rather than a dot product per (i, j).
  Eigen::MatrixXf scores = (q * k.transpose()) * scale;

  if (causal) {
    for (Eigen::Index i = 0; i < scores.rows(); ++i) {
      for (Eigen::Index j = i + 1; j < scores.cols(); ++j) {
        scores(i, j) = -std::numeric_limits<float>::infinity();
      }
    }
  }

  // Row-wise softmax as fused array expressions - no intermediate matrices.
  const Eigen::VectorXf row_max = scores.rowwise().maxCoeff();
  scores = (scores.colwise() - row_max).array().exp();
  scores = scores.array().colwise() / scores.rowwise().sum().array();

  return scores * v;
}

// Tiled (FlashAttention-style) attention: the n x n score matrix is NEVER
// materialized. Process keys in blocks, keeping a running softmax normalizer
// and a running output, rescaling as each block arrives.
//
// This is a MEMORY-traffic optimization, not an arithmetic one - the flop
// count is identical. It converts O(n^2) memory into O(n), which is what
// makes long context possible at all.
Eigen::MatrixXf AttentionTiled(const Eigen::MatrixXf& q, const Eigen::MatrixXf& k,
                               const Eigen::MatrixXf& v, Eigen::Index block) {
  const Eigen::Index n = q.rows();
  const Eigen::Index d = v.cols();
  const float scale = 1.0f / std::sqrt(static_cast<float>(q.cols()));

  Eigen::MatrixXf output = Eigen::MatrixXf::Zero(n, d);
  Eigen::VectorXf running_max = Eigen::VectorXf::Constant(n, -std::numeric_limits<float>::infinity());
  Eigen::VectorXf running_sum = Eigen::VectorXf::Zero(n);

  for (Eigen::Index start = 0; start < k.rows(); start += block) {
    const Eigen::Index len = std::min(block, k.rows() - start);

    // Only this tile of scores exists at any moment - block-sized, not n x n.
    Eigen::MatrixXf tile = (q * k.middleRows(start, len).transpose()) * scale;

    const Eigen::VectorXf tile_max = tile.rowwise().maxCoeff();
    const Eigen::VectorXf new_max = running_max.cwiseMax(tile_max);

    // Rescale the accumulated output to the new maximum, then add this tile.
    const Eigen::VectorXf correction = (running_max - new_max).array().exp();
    tile = (tile.colwise() - new_max).array().exp();

    running_sum = running_sum.cwiseProduct(correction) + tile.rowwise().sum();
    output = output.array().colwise() * correction.array();
    output += tile * v.middleRows(start, len);
    running_max = new_max;
  }

  return output.array().colwise() / running_sum.array();
}`,
        rationale:
          'The per-pair dot products become one GEMM for the whole score matrix, and then the tiled variant goes further by never materializing that matrix at all — processing keys in blocks with a running softmax normalizer that is rescaled as each block arrives. The flop count is identical; what changes is memory traffic, converting O(n²) memory to O(n), which is precisely what makes long context possible.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The all-pairs score computation becomes a single GEMM that dispatches to a blocked cache-aware kernel, instead of n x m separate dot products.',
            tradeoff: 'The full score matrix is O(n²) memory, which is exactly the constraint the tiled variant exists to remove.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Tiling keeps only a block of scores live at once, with a running max and sum carried across blocks — the n x n matrix is never written to memory.',
            tradeoff: 'The online rescaling adds arithmetic and makes the code substantially harder to verify; a subtle error in the correction term produces silently wrong output.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The row-wise softmax composes into fused traversals rather than materializing an intermediate matrix per step.',
            tradeoff: 'Assigning such an expression to auto rather than a concrete MatrixXf yields a dangling reference.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n²·d) flops, O(block·n) memory when tiled. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Scaled dot-product attention - the equation, transcribed.

fn softmax_in_place(scores: &mut [f64]) {
    // Subtract the max before exponentiating, or exp() overflows on large
    // logits and the row becomes NaN.
    let largest = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mut total = 0.0;
    for s in scores.iter_mut() {
        *s = (*s - largest).exp();
        total += *s;
    }
    for s in scores.iter_mut() {
        *s /= total;
    }
}

/// queries[n][d_k], keys[m][d_k], values[m][d_v] -> output[n][d_v]
pub fn attention(
    queries: &[Vec<f64>],
    keys: &[Vec<f64>],
    values: &[Vec<f64>],
    causal: bool,
) -> Vec<Vec<f64>> {
    let n = queries.len();
    let m = keys.len();
    let d_k = queries[0].len();
    let d_v = values[0].len();
    let scale = 1.0 / (d_k as f64).sqrt();

    let mut output = vec![vec![0.0; d_v]; n];

    for i in 0..n {
        // Score this query against every key - the all-pairs comparison.
        let mut scores = vec![0.0; m];
        for j in 0..m {
            if causal && j > i {
                // A position may not attend to the future.
                scores[j] = f64::NEG_INFINITY;
                continue;
            }
            let mut dot = 0.0;
            for k in 0..d_k {
                dot += queries[i][k] * keys[j][k];
            }
            // Scaling keeps the softmax out of saturation.
            scores[j] = dot * scale;
        }

        softmax_in_place(&mut scores);

        for j in 0..m {
            for v in 0..d_v {
                output[i][v] += scores[j] * values[j][v];
            }
        }
    }

    output
}`,
        profile: 'O(n·m·d). Allocates a score vector per query row; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Attention - flat slices, typed errors, scratch reused across rows.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum AttentionError {
    HeadMismatch { d_model: usize, n_heads: usize },
    ShapeMismatch,
    ScratchTooSmall { needed: usize, found: usize },
}

impl fmt::Display for AttentionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HeadMismatch { d_model, n_heads } => {
                write!(f, "d_model {d_model} must divide evenly by n_heads {n_heads}")
            }
            Self::ShapeMismatch => write!(f, "q, k and v describe different shapes"),
            Self::ScratchTooSmall { needed, found } => {
                write!(f, "scratch needs {needed} elements, found {found}")
            }
        }
    }
}

impl std::error::Error for AttentionError {}

pub struct MultiHeadAttention {
    n_heads: usize,
    head_dim: usize,
}

impl MultiHeadAttention {
    pub fn new(d_model: usize, n_heads: usize) -> Result<Self, AttentionError> {
        if n_heads == 0 || d_model % n_heads != 0 {
            return Err(AttentionError::HeadMismatch { d_model, n_heads });
        }
        Ok(Self { n_heads, head_dim: d_model / n_heads })
    }

    /// One head. \`q\`, \`k\`, \`v\` are flat [seq x head_dim]; \`scratch\` is
    /// caller-owned and reused across every head and row — the naive version
    /// allocates a score vector per query, which at seq=1024 across 8 heads is
    /// thousands of allocations per forward pass.
    pub fn attend_head(
        &self,
        q: &[f32],
        k: &[f32],
        v: &[f32],
        seq: usize,
        causal: bool,
        scratch: &mut [f32],
        out: &mut [f32],
    ) -> Result<(), AttentionError> {
        if q.len() != seq * self.head_dim || k.len() != q.len() || v.len() != q.len() {
            return Err(AttentionError::ShapeMismatch);
        }
        if scratch.len() < seq {
            return Err(AttentionError::ScratchTooSmall { needed: seq, found: scratch.len() });
        }

        let scale = 1.0 / (self.head_dim as f32).sqrt();

        for i in 0..seq {
            let query = &q[i * self.head_dim..(i + 1) * self.head_dim];
            // Causal masking as a loop BOUND, not an -inf fill: masked
            // positions are never computed rather than computed and discarded.
            let limit = if causal { i + 1 } else { seq };

            let mut largest = f32::NEG_INFINITY;
            for (j, slot) in scratch[..limit].iter_mut().enumerate() {
                let key = &k[j * self.head_dim..(j + 1) * self.head_dim];
                let dot: f32 = query.iter().zip(key).map(|(a, b)| a * b).sum();
                *slot = dot * scale;
                largest = largest.max(*slot);
            }

            // Fused exponentiate-and-sum: one pass, not two.
            let mut total = 0.0_f32;
            for slot in scratch[..limit].iter_mut() {
                *slot = (*slot - largest).exp();
                total += *slot;
            }

            let dest = &mut out[i * self.head_dim..(i + 1) * self.head_dim];
            dest.fill(0.0);
            let inv_total = 1.0 / total;
            for (j, &score) in scratch[..limit].iter().enumerate() {
                let weight = score * inv_total;
                let value = &v[j * self.head_dim..(j + 1) * self.head_dim];
                for (o, val) in dest.iter_mut().zip(value) {
                    *o += weight * val;
                }
            }
        }

        Ok(())
    }

    #[must_use]
    pub fn n_heads(&self) -> usize {
        self.n_heads
    }
}`,
        rationale:
          'Scratch is hoisted to the caller and reused across every head and row, eliminating thousands of allocations per forward pass. Causal masking becomes a loop bound so masked positions are never computed, the exponentiate-and-sum fuses into one traversal, and shape failures are a typed Result rather than a panic deep in an index.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n²·d), roughly halved under causal masking; zero allocation in the hot path.',
      },
      'make-it-fast': {
        code: `//! Attention - heads in parallel, tiled online softmax.

use rayon::prelude::*;

/// Attention across heads concurrently.
///
/// Heads are completely independent — that is the entire point of multi-head —
/// so they are the natural parallel axis: each worker owns one head's output
/// slice exclusively and no reduction is needed.
pub fn attend_all_heads(
    qkv: &[f32],
    out: &mut [f32],
    n_heads: usize,
    seq: usize,
    head_dim: usize,
    causal: bool,
) {
    let head_stride = seq * head_dim;

    out.par_chunks_exact_mut(head_stride)
        .enumerate()
        .for_each(|(head, head_out)| {
            let base = head * head_stride;
            let q = &qkv[base..base + head_stride];
            let k = &qkv[base + n_heads * head_stride..][..head_stride];
            let v = &qkv[base + 2 * n_heads * head_stride..][..head_stride];

            // Per-worker scratch, allocated once for this head's whole pass.
            let mut scratch = vec![0.0_f32; seq];
            attend_tiled(q, k, v, seq, head_dim, causal, &mut scratch, head_out);
        });
}

/// Tiled attention with an online softmax.
///
/// The n x n score matrix is NEVER materialized. Keys are processed in blocks
/// while a running max and normalizer are carried forward and the accumulated
/// output is rescaled as each block arrives. Flop count is unchanged — this is
/// a memory-traffic optimization, and it is what makes long context feasible.
fn attend_tiled(
    q: &[f32],
    k: &[f32],
    v: &[f32],
    seq: usize,
    head_dim: usize,
    causal: bool,
    scratch: &mut [f32],
    out: &mut [f32],
) {
    const BLOCK: usize = 64;
    let scale = 1.0 / (head_dim as f32).sqrt();

    for i in 0..seq {
        let query = &q[i * head_dim..(i + 1) * head_dim];
        let limit = if causal { i + 1 } else { seq };
        let dest = &mut out[i * head_dim..(i + 1) * head_dim];
        dest.fill(0.0);

        let mut running_max = f32::NEG_INFINITY;
        let mut running_sum = 0.0_f32;

        for block_start in (0..limit).step_by(BLOCK) {
            let block_end = (block_start + BLOCK).min(limit);

            let mut block_max = f32::NEG_INFINITY;
            for j in block_start..block_end {
                let key = &k[j * head_dim..(j + 1) * head_dim];
                let dot: f32 = query.iter().zip(key).map(|(a, b)| a * b).sum();
                scratch[j] = dot * scale;
                block_max = block_max.max(scratch[j]);
            }

            // Rescale everything accumulated so far to the new maximum.
            let new_max = running_max.max(block_max);
            let correction = (running_max - new_max).exp();
            running_sum *= correction;
            for value in dest.iter_mut() {
                *value *= correction;
            }

            for j in block_start..block_end {
                let weight = (scratch[j] - new_max).exp();
                running_sum += weight;
                let value = &v[j * head_dim..(j + 1) * head_dim];
                for (o, val) in dest.iter_mut().zip(value) {
                    *o += weight * val;
                }
            }
            running_max = new_max;
        }

        let inv = 1.0 / running_sum;
        for value in dest.iter_mut() {
            *value *= inv;
        }
    }
}`,
        rationale:
          'Heads run concurrently — they are independent by construction, so each worker owns one output slice with no reduction. Within a head, attention is tiled with an online softmax that carries a running max and normalizer across blocks, so the score matrix is never fully materialized. The flop count is unchanged; the memory traffic is what improves.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Attention heads are mutually independent, so each worker owns one head\'s output slice exclusively and no synchronization or reduction is required.',
            tradeoff: 'Each worker allocates its own scratch buffer per head; a thread-local arena would avoid it but complicates the lifetimes considerably.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Tiling keeps the working set to one block of scores plus the running accumulators, so the inner loops stream contiguous memory and stay in cache.',
            tradeoff: 'The online rescaling adds arithmetic per block and makes the code much harder to verify — a subtle error in the correction term is silently wrong rather than obviously broken.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The zipped dot product and the value accumulation walk slices of proven-equal length, so bounds checks drop out of the innermost loops.',
            tradeoff: 'The scratch buffer is still indexed by a computed j, so those accesses keep their checks.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n²·d) flops, O(block) score memory, heads across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
