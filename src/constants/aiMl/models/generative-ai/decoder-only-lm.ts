import type { AiMlModel } from '../../types';

/**
 * Decoder-only language model — the entry where an exact likelihood costs
 * nothing architectural, and where the interesting engineering is all at
 * inference.
 *
 * The objective is the cleanest `likelihood` in this reference: exact,
 * tractable, factorized by the chain rule, with no bound and no invertibility
 * constraint. Everything hard about the model is in serving it.
 */
export const DECODER_ONLY_LM: AiMlModel = {
  slug: 'decoder-only-lm',
  name: 'Decoder-Only Language Model',
  aliases: ['GPT', 'Causal LM', 'Autoregressive transformer', 'LLM', 'Next-token prediction'],
  category: 'generative-ai',
  group: 'autoregressive',
  kind: 'model',

  paradigms: ['self-supervised'],
  taskTypes: ['generation', 'sequence-modeling', 'density-estimation', 'classification', 'anomaly-detection'],
  paradigmNote:
    'Self-supervised and nothing else: the label for every position is the next token, which is already in the data. That single fact is why the method scales — the supervision is free and unlimited, so the binding constraint becomes compute rather than annotation, which is a structurally different position from every supervised model in this reference.',

  intuition:
    'Predict the next token, over and over, on everything ever written. The objective is trivial and the consequence is not: to predict the next token well you have to model syntax, then facts, then reasoning, then style, because all of those constrain what comes next. Nothing in the training says "learn arithmetic" — arithmetic is learned because it helps predict the token after an equals sign. That is the whole argument for scale, and it is also why the capabilities are uneven in ways that are hard to predict from the objective.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\log p_\\theta(\\mathbf{x}) = \\sum_{i=1}^{n} \\log p_\\theta\\bigl(x_i \\mid x_1,\\dots,x_{i-1}\\bigr), \\qquad \\mathcal{L} = -\\frac{1}{n}\\sum_{i=1}^{n}\\log p_\\theta(x_i \\mid x_{<i})',
      symbols: [
        { symbol: 'p_\\theta(x_i \\mid x_{<i})', meaning: 'a softmax over the vocabulary, conditioned on every earlier token and none later' },
        { symbol: '\\sum_i', meaning: 'the chain rule: the joint factorizes exactly, so the likelihood is a sum with no approximation anywhere' },
        { symbol: 'x_{<i}', meaning: 'the prefix; the causal mask is what guarantees position i never sees beyond it' },
        { symbol: '\\exp(\\mathcal{L})', meaning: 'perplexity — the same number on a scale people quote, and nothing more than that' },
      ],
    },
    reading:
      'This is the cleanest exact likelihood in the reference and it is worth dwelling on why. A VAE bounds its likelihood, a normalizing flow buys exactness with an invertible dimension-preserving architecture, a diffusion model gets one afterwards from an ODE solve. Here the chain rule factorizes the joint exactly into conditionals the model already computes, so the likelihood is a sum of terms from one forward pass — no bound, no architectural constraint, no extra computation. The cost is paid elsewhere: the factorization imposes an order, so generation is inherently sequential and cannot be parallelized, and that single consequence is the source of every inference difficulty in this entry. Note also what the training loss is doing that evaluation is not: teacher forcing means every position is predicted from the true prefix, while generation predicts from its own output, and that gap is real.',
  },

  optimization: {
    method: 'AdamW with a warmup-then-decay schedule, at a scale where the schedule and the data mixture matter more than the architecture',
    updateRule: {
      formula:
        'L(N, D) \\approx \\frac{A}{N^{\\alpha}} + \\frac{B}{D^{\\beta}} + L_\\infty, \\qquad \\min_{N,D} L \\ \\text{ s.t. } \\ C \\approx 6ND',
      symbols: [
        { symbol: 'N', meaning: 'parameter count' },
        { symbol: 'D', meaning: 'training tokens' },
        { symbol: 'C \\approx 6ND', meaning: 'training compute, which is fixed — the optimization is how to split it between N and D' },
        { symbol: 'L_\\infty', meaning: 'the irreducible term; the entropy the data itself has, which no model removes' },
        { symbol: '\\alpha, \\beta', meaning: 'empirical exponents; that they are close in value is what makes the split roughly balanced' },
      ],
    },
    rationale:
      'The interesting optimization here is not the gradient step but the compute allocation, and the scaling-law result is genuinely load-bearing. Loss falls as a power law in both parameters and tokens with similar exponents, so for a fixed compute budget there is an optimal split — and the field spent years on the wrong side of it, training models far larger than their token budgets justified. Correcting that produced models several times smaller and better at the same cost, which is a rare case of a purely quantitative result changing practice immediately. The second-order lesson is about what the law does not say: it predicts loss, not capability, and the relationship between them is not smooth. Around all of this the mechanics are unremarkable — warmup is mandatory for the same reason as in any transformer, decoupled weight decay for the same reason, and gradient clipping because a single bad batch at this scale is expensive to recover from.',
    hyperparameters: [
      { name: 'parameter count', role: 'One half of the compute split. Larger is not better at fixed compute — it was the field’s main error for years', typicalRange: '1e8 to 1e12' },
      { name: 'training tokens', role: 'The other half. Roughly twenty tokens per parameter is the compute-optimal region', typicalRange: '20x to 200x parameters' },
      { name: 'context length', role: 'Attention is quadratic in it, and the KV cache is linear in it — two different costs that bind at different scales', typicalRange: '2k to 1M tokens' },
      { name: 'vocabulary size', role: 'Trades sequence length against embedding and output-projection size; the output softmax is a real cost at large vocabularies', typicalRange: '32k to 256k' },
      { name: 'warmup steps', role: 'Mandatory, as in any transformer: the attention softmax saturates without it and the run never starts', typicalRange: '1k to 10k' },
      { name: 'sampling temperature', role: 'An inference-time knob with no right value — it trades coherence against diversity per application', typicalRange: '0.0 to 1.5' },
    ],
    convergence:
      'Training is remarkably well-behaved for its scale — one loss, it goes down, and it goes down predictably enough that the final value can be forecast from a fraction of the run, which is how large training budgets are justified at all. The difficulties are elsewhere and mostly not optimization. Loss improves smoothly while capabilities appear unevenly, so a smaller loss does not translate into a predictable capability gain and the standard benchmarks are a poor guide. Data contamination is a live and largely unsolved problem: the corpus is enormous, the benchmarks are public, and establishing that an evaluation is uncontaminated is genuinely difficult. And the training-to-generation gap from teacher forcing is structural — every training position is predicted from a true prefix, every generated position from the model’s own output, so errors compound at inference in a way the loss never measures.',
    complexity:
      'Training is O(n²·d) for attention plus O(n·d²) for the projections, fully parallel across positions because the causal mask lets every position be predicted simultaneously. Generation is the opposite: strictly sequential, one token at a time, and with a key-value cache it is O(n·d²) total rather than O(n³) — but each step is memory-bound rather than compute-bound, reading the entire parameter set to produce a single token. That distinction is the single most important fact about serving these models.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Tokenize the numbers and forecast them as text — quantize values into bins, feed the history as a token sequence, and sample continuations. Sampled sequences form a predictive distribution, and the same in-context mechanism that makes these models few-shot learners means a series can be forecast with no fitting at all.',
        where: [
          'Zero-shot forecasting for a series with too little history to fit anything',
          'Forecasting where a textual description of the series or of known events is genuinely available and useful',
          'Rapid baselining, where a non-trivial forecast in minutes has value',
          'Panels with a long tail of short series that individually cannot support a model',
        ],
        why: 'The zero-shot capability is real and is the honest reason to consider it: a general-purpose model produces a plausible continuation for a series it has never seen, which nothing conventional does. The pretrained-forecaster entry in this reference is essentially this idea built purposefully. Against it, the objections are substantial. Tokenizing numbers is lossy by construction — quantization bins are a resolution ceiling — and these models are demonstrably weak at arithmetic, which is uncomfortable for a numerical task. Context limits cap the usable history. Inference is far more expensive than any classical forecaster. And the benchmark-contamination problem is at its sharpest here, since forecasting datasets are public and the corpora are vast. Excellent for cold start, and not a replacement for a fitted model on a panel you have data for.',
        featurization: [
          'Scale and quantize per series, and treat the bin resolution as an explicit accuracy ceiling rather than an implementation detail',
          'Keep the history inside the context window; a longer one is truncated and the truncation is rarely reported',
          'Sample many continuations rather than taking the greedy one, since the distribution is the point',
          'Verify on data that provably postdates the training corpus, because contamination cannot otherwise be excluded',
        ],
        evaluation:
          'Rolling-origin backtesting against seasonal-naive, exponential smoothing and a tuned gradient booster — all three, because published comparisons frequently omit them and they win more often than the headline results suggest. Report the quantization resolution alongside accuracy, since it bounds what is achievable.',
        pitfalls: [
          'Quantization resolution silently capping accuracy below what the task needs',
          'Benchmark contamination making a zero-shot result meaningless',
          'Weak arithmetic on a numerical task, which no prompting reliably fixes',
          'Inference cost orders of magnitude above a classical fit for a marginal gain',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Perplexity as the score. Because the likelihood is exact and per-token, an unusual sequence has measurably low probability and the per-token breakdown localizes exactly where the surprise is — which for structured text like logs is considerably more actionable than a sequence-level score.',
        where: [
          'Log anomaly detection, where normal entries are highly templated and an unusual one is genuinely improbable',
          'Command and audit-trail monitoring, where the anomaly is an unusual sequence rather than an unusual event',
          'Detecting machine-generated or manipulated text by its likelihood profile',
          'Code and configuration review, where an improbable construct is worth a human look',
        ],
        why: 'The exact per-token likelihood is a genuinely good anomaly score for sequential structured text, and the localization is the real benefit — knowing which token was surprising is what makes an alert actionable. Logs are the strongest case because they are templated, so a deviation is both rare and meaningful. Against it: a general-purpose model’s notion of surprising is calibrated to internet text rather than to your logs, so fine-tuning on normal traffic is usually necessary; perplexity is sensitive to formatting in ways that generate false positives on cosmetic changes; and inference cost per sequence is high for what is often a high-volume stream. A small model fine-tuned on your own normal data beats a large general one here, which is worth knowing before reaching for the biggest available.',
        featurization: [
          'Fine-tune on normal logs; a general model’s surprise is calibrated to internet text, not to your system',
          'Normalize volatile fields — timestamps, identifiers, addresses — or every line is surprising for cosmetic reasons',
          'Score per token and aggregate deliberately, since the localization is most of the value',
          'Prefer a small fine-tuned model to a large general one, which is both cheaper and more accurate here',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget on labelled incidents, against a template-mining baseline — log anomaly detection has decades of cheap non-neural methods and they are competitive. Report per-sequence inference cost, which decides whether a high-volume stream can be scored at all.',
        pitfalls: [
          'A general-purpose model flagging cosmetic formatting differences as anomalies',
          'Inference cost making high-volume log scoring impractical',
          'Skipping the template-mining baseline, which is far cheaper and often as good',
          'Aggregating per-token scores in a way that discards the localization that made the method worth using',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'Nearly everything difficult about this model is an optimization problem at inference, and the key observation is about arithmetic intensity rather than algorithms. Generating one token requires reading every parameter and doing one multiply-accumulate per parameter — so decode is bound by memory bandwidth, not by compute, and the accelerator sits mostly idle. Every serving technique follows from that single fact: the key-value cache avoids recomputing the prefix, batching amortizes the weight read across requests, quantization shrinks the bytes that must be read, and speculative decoding gets more than one token per weight read.',
        where: [
          'The key-value cache turning O(n³) generation into O(n²), which is the largest single algorithmic win available',
          'Arithmetic intensity as the diagnostic: decode is memory-bound, prefill is compute-bound, and they need different optimizations',
          'Batching as bandwidth amortization rather than throughput scaling — the weight read is shared, which is why it helps so much',
          'Quantization and speculative decoding as two different ways of attacking a bandwidth limit',
          'Scaling laws as a compute-allocation result, where the field was measurably on the wrong side for years',
        ],
        why: 'This is the best case study in the reference for the compute-bound versus memory-bound distinction, because the two phases of the same model sit on opposite sides of it. Prefill processes the whole prompt in parallel and saturates arithmetic; decode produces one token at a time and saturates bandwidth. Optimizing the wrong one is the standard mistake, and it is easy to make because they run in the same process on the same hardware. The key-value cache is also the cleanest asymptotic improvement here: recomputing attention over the whole prefix for every new token is cubic in sequence length, and caching what cannot change makes it quadratic — a change that required no approximation and no accuracy loss, which is rare.',
        featurization: [
          'Cache keys and values from the first token; recomputing the prefix per token is cubic and entirely avoidable',
          'Measure achieved memory bandwidth during decode rather than FLOP utilization, which will look idle and mislead you',
          'Batch aggressively at decode, since the weight read is shared across the batch and that is where the win comes from',
          'Size the key-value cache explicitly — it is linear in context and batch, and it is what actually runs out of memory',
        ],
        evaluation:
          'Profile prefill and decode separately; they are compute-bound and memory-bound respectively and a single throughput number averages two different problems into one meaningless figure. Report tokens per second at a stated batch size and context length, since both change it by more than most optimizations do.',
        pitfalls: [
          'Optimizing arithmetic during decode, when the bottleneck is bandwidth and the arithmetic units are idle',
          'Omitting the key-value cache and paying a cubic cost for no reason',
          'Under-sizing the cache, which is linear in batch times context and is usually what exhausts memory',
          'Quoting throughput without batch size and context length, which makes it uncomparable',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'The dominant architecture for essentially every language task, used through one of three routes: prompting a general model with instructions and examples, fine-tuning it on a task, or using its likelihood directly for scoring. The same weights serve generation, classification and ranking depending only on how the input is framed.',
        where: [
          'Open-ended generation, summarization, translation and dialogue',
          'Classification and extraction via prompting, which frequently matches a fine-tuned smaller model with no training at all',
          'Code generation and transformation, where the autoregressive framing matches the task structure exactly',
          'Reranking and scoring, where the exact likelihood is used directly rather than generated from',
        ],
        why: 'Task-agnosticism is the real result. One model handles tasks it was never trained on because the tasks can be expressed as text continuation, which collapsed a field of task-specific architectures into one. That is a larger change than any individual capability. The honest limits are well established and worth stating: no reliable mechanism for factual accuracy, so confident errors are a permanent property rather than a bug to be fixed; a fixed context window; sequential generation that cannot be parallelized; and inference cost far above a small task-specific model for tasks a small model handles. A fine-tuned encoder is still the right choice for high-volume single-task classification.',
        featurization: [
          'Use a subword tokenizer and be aware of what it does to numbers and rare words, which is where surprising failures originate',
          'Keep prompts inside the context window; truncation is usually silent and removes the beginning',
          'Prefer retrieval over parametric recall for facts, since the model has no mechanism for knowing what it does not know',
          'Use the likelihood directly for scoring tasks rather than generating and parsing, which is both cheaper and more reliable',
        ],
        evaluation:
          'Task-specific metrics with a fine-tuned smaller model as the baseline, because on a single high-volume task it frequently wins on both accuracy and cost. For generation, human evaluation remains the honest check. Verify that evaluation data postdates the training corpus, which is difficult and routinely skipped.',
        pitfalls: [
          'Treating fluent output as accurate, which is the defining failure of the technology',
          'Silent prompt truncation removing the instructions at the start',
          'Using a large general model where a small fine-tuned one is better and far cheaper',
          'Benchmark contamination, which is hard to exclude and rarely checked',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Generative recommendation: represent items as token sequences — either identifiers or learned semantic codes — and let the model generate the next item in a user’s sequence directly, rather than scoring candidates. Retrieval becomes decoding, which removes the separate index entirely.',
        where: [
          'Sequential recommendation where the interaction history is naturally a sequence',
          'Generative retrieval, decoding item identifiers directly instead of searching an index',
          'Cold-start items, where a semantic code derived from content gives a new item a representation immediately',
          'Explanation generation alongside a recommendation, which the same model produces for free',
        ],
        why: 'The genuinely interesting property is that generating an identifier replaces the retrieval index: no embedding store, no approximate search, no recall ceiling from the index. Semantic codes also give new items a representation from their content rather than from interactions, which addresses cold start structurally. Against it: constraining generation to valid identifiers needs real machinery, popularity bias enters through the training distribution in ways that are hard to correct, and a well-tuned two-tower model plus an index is cheaper and usually at least as good. This is a promising direction rather than a settled one, and worth describing as such.',
        featurization: [
          'Use hierarchical semantic codes rather than raw identifiers, so an unseen item still has a valid representation',
          'Constrain decoding to valid item codes, or the model generates identifiers that do not exist',
          'Keep the interaction history inside the context window, which caps how much history is usable',
          'Measure popularity bias explicitly, since it enters through the training distribution rather than through a scoring function',
        ],
        evaluation:
          'Recall and NDCG at k on held-out interactions split strictly by time, against a two-tower plus index baseline at matched latency — that comparison is the one that decides whether the generative framing is worth its cost, and it is frequently unflattering.',
        pitfalls: [
          'Unconstrained decoding producing invalid item identifiers',
          'Popularity bias baked into the training distribution and hard to correct afterwards',
          'Context limits capping usable interaction history',
          'Inference cost per request far above an index lookup',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Pretraining is among the largest computations anyone performs, which is why almost nobody does it — the practical decision is which checkpoint to start from. Fine-tuning is hours to days, and parameter-efficient methods bring it to hours on a single machine, which makes adaptation the affordable half by orders of magnitude.',
    inferenceProfile:
      'Two phases with opposite characteristics, and conflating them is the standard mistake. Prefill processes the whole prompt in parallel and is compute-bound. Decode produces one token at a time, reads every parameter per token, and is memory-bound — the arithmetic units sit largely idle. Batching helps enormously during decode because the weight read is shared, which is unlike most batching arguments.',
    retrainingCadence:
      'Base models are replaced rather than retrained. Fine-tuned adapters are refreshed as often as the task data changes, which is cheap. Knowledge is better updated through retrieval than through retraining, since retraining to add a fact is both expensive and unreliable.',
    driftAndMonitoring: [
      'Track prompt and completion length distributions, since both drive cost directly and drift without anyone changing the model',
      'Monitor the fraction of requests hitting the context limit, because truncation is usually silent and removes the beginning of the prompt',
      'Measure achieved memory bandwidth during decode rather than compute utilization, which will look idle and mislead you',
      'Watch key-value cache occupancy, which is linear in batch times context and is usually what exhausts memory first',
    ],
    productionGotchas: [
      'Decode is memory-bound, not compute-bound. Every serving optimization follows from that, and optimizing arithmetic instead is the most common and most expensive mistake',
      'The key-value cache is linear in batch times context and is what actually runs out of memory. It has to be sized explicitly rather than discovered',
      'Context truncation is silent and usually removes the start of the prompt, which is where the instructions are',
      'Tokenization is part of the model. A different tokenizer produces different token counts, different costs and different behaviour on numbers',
      'Sampling parameters change the output more than most model changes do, so they must be pinned and logged with every result',
      'The model has no mechanism for knowing what it does not know. Confident fabrication is a property of the objective, not a defect to be patched',
    ],
  },

  assumptions: [
    'The task can be expressed as text continuation, which is what makes one model serve many tasks',
    'Next-token prediction on a broad corpus induces the capabilities the task needs — true unevenly, and not predictable from the loss',
    'The relevant context fits inside the window, since nothing outside it exists for the model',
    'Inference compute is available; sequential generation is expensive and cannot be parallelized away',
    'Evaluation data postdates the training corpus, which is difficult to establish and routinely assumed',
  ],

  pros: [
    {
      point: 'Exact likelihood with no architectural cost',
      context:
        'The chain rule factorizes the joint exactly, so the likelihood is a sum of terms one forward pass already computes. No bound as in a VAE, no invertibility constraint as in a flow, no ODE solve as in diffusion.',
    },
    {
      point: 'Free and unlimited supervision',
      context:
        'The label is the next token, which is already there. That makes compute rather than annotation the binding constraint, which is a structurally different position from every supervised model here and the reason scaling worked.',
    },
    {
      point: 'One model, many tasks',
      context:
        'Tasks the model never saw are handled because they can be written as text continuation. This collapsed a field of task-specific architectures into one, which is a larger change than any individual capability.',
    },
    {
      point: 'Training parallelizes fully across positions',
      context:
        'The causal mask lets every position be predicted simultaneously, so a whole sequence is one forward pass. That is what makes training at this scale possible at all — and the asymmetry with generation is stark.',
    },
  ],

  cons: [
    {
      point: 'Generation is inherently sequential',
      context:
        'The factorization imposes an order, so tokens cannot be produced in parallel. Every inference difficulty in this entry descends from that one consequence, and no engineering removes it.',
    },
    {
      point: 'Decode is memory-bound',
      context:
        'Each token requires reading every parameter, so the accelerator is starved rather than busy. Counter-intuitive, decisive for serving design, and the reason most optimization effort is misdirected.',
    },
    {
      point: 'No mechanism for factual reliability',
      context:
        'The objective rewards plausible continuations, and plausible is not true. Confident fabrication is a property of what is being optimized rather than a defect, which is why retrieval rather than retraining is the mitigation.',
    },
    {
      point: 'A hard context window',
      context:
        'Nothing outside it exists for the model, and truncation is usually silent and removes the beginning. Long-context variants extend it at quadratic attention cost and linear cache cost.',
    },
    {
      point: 'Contamination is hard to exclude',
      context:
        'The corpus is enormous and benchmarks are public, so establishing that an evaluation is uncontaminated is genuinely difficult. This affects how much any published capability claim should be believed.',
    },
  ],

  relatedSlugs: ['transformer', 'masked-lm', 'mixture-of-experts', 'rag', 'time-series-diffusion'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A decoder-only LM, transcribed the way the definition reads.

    log p(x) = sum_i log p(x_i | x_1..x_{i-1})

The chain rule factorizes the joint EXACTLY, so the likelihood is a sum of
terms one forward pass already computes - no bound, no invertibility
constraint, no extra computation. That is the cleanest exact likelihood in
this whole reference.

The cost is paid elsewhere: the factorization imposes an ORDER, so generation
is sequential. This version makes that cost visible in the worst possible way
- it recomputes the entire prefix for every new token, which is CUBIC in
sequence length. The fix is the key-value cache in the fast stage, and seeing
the naive version first is the point.

Plain loops, no libraries.
"""

import math
import random

SEED = 41


def softmax(scores):
    """Subtract the max before exponentiating, or a large logit overflows."""
    peak = max(scores)
    exponentials = [math.exp(score - peak) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def causal_attention(queries, keys, values, head_dim):
    """Attention with a CAUSAL mask: position i sees 1..i and nothing later.

    The mask is what makes the chain-rule factorization exact. Without it
    position i would see the token it is supposed to predict, and the loss
    would go to zero while the model learned nothing - the classic and
    completely silent failure of this architecture.
    """
    tokens = len(queries)
    scale = 1.0 / math.sqrt(head_dim)
    output = []

    for i in range(tokens):
        # Only positions up to and including i. Everything later is masked
        # to negative infinity, which the softmax turns into exactly zero.
        scores = []
        for j in range(tokens):
            if j > i:
                scores.append(-math.inf)
                continue
            dot = sum(queries[i][d] * keys[j][d] for d in range(head_dim))
            scores.append(dot * scale)

        weights = softmax(scores)
        mixed = [0.0] * head_dim
        for j in range(i + 1):
            for d in range(head_dim):
                mixed[d] += weights[j] * values[j][d]
        output.append(mixed)

    return output


def linear(vectors, weight, bias):
    out_dim = len(weight[0])
    return [
        [bias[j] + sum(v * weight[k][j] for k, v in enumerate(vector)) for j in range(out_dim)]
        for vector in vectors
    ]


def layer_norm(vectors, gain, shift, epsilon=1e-5):
    output = []
    for vector in vectors:
        mean = sum(vector) / len(vector)
        variance = sum((value - mean) ** 2 for value in vector) / len(vector)
        denominator = math.sqrt(variance + epsilon)
        output.append([
            (value - mean) / denominator * gain[i] + shift[i]
            for i, value in enumerate(vector)
        ])
    return output


def gelu(value):
    inner = math.sqrt(2.0 / math.pi) * (value + 0.044715 * value ** 3)
    return 0.5 * value * (1.0 + math.tanh(inner))


def block(tokens, params, head_dim):
    """One pre-norm decoder block: causal attention, then an MLP."""
    normed = layer_norm(tokens, params['ln1_gain'], params['ln1_shift'])
    queries = linear(normed, params['wq'], params['bq'])
    keys = linear(normed, params['wk'], params['bk'])
    values = linear(normed, params['wv'], params['bv'])

    attended = causal_attention(queries, keys, values, head_dim)
    projected = linear(attended, params['wo'], params['bo'])
    tokens = [[a + b for a, b in zip(t, p)] for t, p in zip(tokens, projected)]

    normed = layer_norm(tokens, params['ln2_gain'], params['ln2_shift'])
    hidden = [[gelu(v) for v in row] for row in linear(normed, params['w1'], params['b1'])]
    out = linear(hidden, params['w2'], params['b2'])
    return [[a + b for a, b in zip(t, o)] for t, o in zip(tokens, out)]


def forward(token_ids, params, head_dim, depth):
    """Embed, add positions, run the blocks, project to the vocabulary.

    Note that this computes logits for EVERY position at once. Because the
    causal mask guarantees position i never sees beyond i, all n predictions
    are valid simultaneously - which is why training parallelizes completely
    across positions and generation does not.
    """
    tokens = [
        [e + p for e, p in zip(params['embedding'][token], params['position'][index])]
        for index, token in enumerate(token_ids)
    ]

    for layer in range(depth):
        tokens = block(tokens, params['blocks'][layer], head_dim)

    tokens = layer_norm(tokens, params['final_gain'], params['final_shift'])
    return linear(tokens, params['unembedding'], params['unembedding_bias'])


def training_loss(token_ids, params, head_dim, depth):
    """Cross-entropy against the NEXT token at every position.

    Teacher forcing: every position is predicted from the TRUE prefix. At
    generation time each position is predicted from the model's own output
    instead, and that gap is real - errors compound at inference in a way this
    loss never measures.
    """
    logits = forward(token_ids[:-1], params, head_dim, depth)

    total = 0.0
    for position, row in enumerate(logits):
        probabilities = softmax(row)
        target = token_ids[position + 1]
        total -= math.log(max(probabilities[target], 1e-12))

    return total / len(logits)


def exact_log_likelihood(token_ids, params, head_dim, depth):
    """The chain rule, summed. An EXACT log-density with no approximation.

    Worth contrasting: a VAE bounds this quantity, a normalizing flow buys it
    with an invertible architecture, a diffusion model recovers it from an ODE
    solve. Here it is a sum of terms the forward pass already produced.
    """
    logits = forward(token_ids[:-1], params, head_dim, depth)
    return sum(
        math.log(max(softmax(row)[token_ids[position + 1]], 1e-12))
        for position, row in enumerate(logits)
    )


def perplexity(token_ids, params, head_dim, depth):
    """exp of the mean negative log-likelihood. Nothing more than that."""
    log_likelihood = exact_log_likelihood(token_ids, params, head_dim, depth)
    return math.exp(-log_likelihood / (len(token_ids) - 1))


def generate(prompt, params, head_dim, depth, count, temperature, rng):
    """Sequential generation, recomputing EVERYTHING every step.

    This is the cost that matters. Each new token re-runs the full forward
    pass over the whole sequence so far, and attention inside it is quadratic,
    which makes generating n tokens CUBIC in n.

    The keys and values for positions already processed CANNOT CHANGE - the
    causal mask guarantees it - so recomputing them is pure waste. Caching
    them is the single largest algorithmic win available on this model, and it
    is what the fast stage does.
    """
    tokens = list(prompt)

    for _ in range(count):
        logits = forward(tokens, params, head_dim, depth)
        last = logits[-1]

        if temperature <= 0.0:
            tokens.append(max(range(len(last)), key=last.__getitem__))
            continue

        scaled = [value / temperature for value in last]
        probabilities = softmax(scaled)

        threshold = rng.random()
        cumulative = 0.0
        for token, probability in enumerate(probabilities):
            cumulative += probability
            if cumulative >= threshold:
                tokens.append(token)
                break

    return tokens
`,
        profile:
          'Training is O(n^2 d + n d^2) for the whole sequence in one pass. Generation here is O(n^3) — each of n tokens re-runs a quadratic forward pass over the whole prefix. Illustrative, not a measured benchmark: that cubic factor is entirely avoidable and removing it is the largest single win available on this model.',
      },

      'make-it-right': {
        code: `"""The same model, with the cache as a type and the context limit checked.

Two things change. The key-value cache becomes an explicit object with its own
memory accounting, because it is the model's real memory footprint at serving
time and it is what actually runs out rather than the weights. And the context
window becomes a checked limit, because truncation is otherwise silent and
removes the START of the prompt — which is where the instructions are.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import NamedTuple, Sequence


class ContextOverflow(ValueError):
    """Raised when a sequence exceeds the context window.

    Its own type because the alternative is silent truncation from the FRONT,
    which removes the system prompt and the instructions while leaving the
    most recent tokens — so the model behaves as though it was never told what
    to do, and nothing is logged.
    """


class CacheExhausted(RuntimeError):
    """Raised when the key-value cache cannot hold another token.

    Its own type because the cache — not the weights — is what actually runs
    out of memory in production. It grows linearly in batch times context,
    which means capacity is a function of traffic shape rather than of the
    model.
    """


class CausalityViolation(AssertionError):
    """Raised when a position can attend to a later one.

    Its own type because the failure is catastrophic and completely silent:
    the loss goes to near zero because the model can see the answer, and
    nothing else indicates anything is wrong.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


@dataclass(frozen=True)
class ModelShape:
    """Derived once, so no call site recomputes head width or cache size."""

    depth: int
    model_dim: int
    num_heads: int
    context_length: int
    vocabulary: int

    def __post_init__(self) -> None:
        if self.model_dim % self.num_heads:
            raise ShapeMismatch(
                f'width {self.model_dim} does not divide into {self.num_heads} heads'
            )

    @property
    def head_dim(self) -> int:
        return self.model_dim // self.num_heads

    @property
    def scale(self) -> float:
        """1/sqrt(d_k). Omitting it saturates the softmax and stalls training."""
        return 1.0 / math.sqrt(self.head_dim)

    def cache_bytes(self, batch: int, bytes_per_value: int = 2) -> int:
        """The number that decides serving capacity.

        Two tensors — keys and values — per layer, per position, per batch
        element. Linear in batch times context, which is why capacity depends
        on traffic shape rather than on the model, and why this is what runs
        out rather than the weights.
        """
        return 2 * self.depth * batch * self.context_length * self.model_dim * bytes_per_value


class KeyValueCache:
    """Keys and values for positions already processed.

    The reason this is correct: the causal mask guarantees position i never
    attends to anything later, so the keys and values for earlier positions
    CANNOT CHANGE when a new token arrives. Recomputing them is pure waste,
    and caching turns generation from cubic in sequence length into quadratic.

    Preallocated to the context length rather than grown, because growing a
    buffer per token during generation is exactly the allocation pattern to
    avoid in the hot path.
    """

    __slots__ = ('_keys', '_values', '_length', '_capacity', '_head_dim')

    def __init__(self, shape: ModelShape) -> None:
        self._capacity = shape.context_length
        self._head_dim = shape.head_dim
        self._keys: list[list[float]] = [[] for _ in range(shape.context_length)]
        self._values: list[list[float]] = [[] for _ in range(shape.context_length)]
        self._length = 0

    def append(self, key: Sequence[float], value: Sequence[float]) -> None:
        if self._length >= self._capacity:
            raise CacheExhausted(
                f'the cache is full at {self._capacity} positions; generation cannot '
                'continue without evicting or restarting'
            )
        self._keys[self._length] = list(key)
        self._values[self._length] = list(value)
        self._length += 1

    @property
    def length(self) -> int:
        return self._length

    def keys(self) -> list[list[float]]:
        return self._keys[:self._length]

    def values(self) -> list[list[float]]:
        return self._values[:self._length]

    def reset(self) -> None:
        """Reuse the allocation across requests rather than reallocating."""
        self._length = 0


@dataclass(frozen=True)
class SamplingConfig:
    """Inference-time settings that change the output more than the model does.

    Frozen and explicit because that is what makes them dangerous: two
    deployments of one checkpoint at different temperatures produce materially
    different behaviour, and a result reported without them is not comparable
    to anything.
    """

    temperature: float = 1.0
    top_p: float = 1.0
    top_k: int = 0
    seed: int | None = None

    def __post_init__(self) -> None:
        if self.temperature < 0.0:
            raise ShapeMismatch('temperature cannot be negative')
        if not 0.0 < self.top_p <= 1.0:
            raise ShapeMismatch('top_p must lie in (0, 1]')
        if self.top_k < 0:
            raise ShapeMismatch('top_k cannot be negative')

    @property
    def deterministic(self) -> bool:
        """Temperature zero is greedy decoding, and needs no seed."""
        return self.temperature == 0.0


class TokenScore(NamedTuple):
    """A token AND its log-probability.

    The log-probability comes back because it is free — the forward pass
    computed it — and because per-token likelihood is what makes this model
    usable as an anomaly detector and as a scorer, not only as a generator.
    """

    token: int
    log_probability: float


def stable_log_softmax(logits: Sequence[float]) -> list[float]:
    """log-softmax without forming the softmax first.

    Taking the logarithm of a softmax underflows for a confident distribution,
    which is exactly the regime a trained language model lives in — so this is
    correctness rather than polish.
    """
    peak = max(logits)
    shifted = [value - peak for value in logits]
    total = math.log(math.fsum(math.exp(value) for value in shifted))
    return [value - total for value in shifted]


def assert_causal(attention_weights: Sequence[Sequence[float]]) -> None:
    """Verify no position attends to a later one.

    Worth having as a test: if the mask is wrong the loss collapses toward
    zero because the model can see the token it is predicting, and absolutely
    nothing else indicates a problem. This is the cheapest possible guard
    against the most catastrophic silent failure in the architecture.
    """
    for i, row in enumerate(attention_weights):
        for j, weight in enumerate(row):
            if j > i and abs(weight) > 1e-9:
                raise CausalityViolation(
                    f'position {i} attends to {j} with weight {weight}; the causal '
                    'mask is wrong and the loss will collapse to near zero'
                )


def fit_context(
    tokens: Sequence[int], shape: ModelShape, allow_truncation: bool = False
) -> list[int]:
    """Guard clause for the failure that is otherwise silent.

    Truncation removes the FRONT of the sequence, which is where the system
    prompt and instructions live. The model then behaves as though it was
    never told what to do, and nothing is logged — so the default here is to
    refuse rather than to truncate quietly.
    """
    if len(tokens) <= shape.context_length:
        return list(tokens)
    if not allow_truncation:
        raise ContextOverflow(
            f'{len(tokens)} tokens exceed the {shape.context_length}-token context; '
            'truncating would remove the instructions at the front'
        )
    return list(tokens[-shape.context_length:])


def sample_token(
    logits: Sequence[float], config: SamplingConfig, rng: random.Random
) -> TokenScore:
    """Temperature, then nucleus, then top-k — in that order, deliberately.

    The order matters and is easy to get wrong: temperature rescales the
    distribution, so applying it AFTER truncation changes which tokens were
    eligible. Scaling first and truncating second is the convention every
    implementation follows, and mixing the order gives subtly different output.
    """
    if config.deterministic:
        token = max(range(len(logits)), key=logits.__getitem__)
        return TokenScore(token=token, log_probability=stable_log_softmax(logits)[token])

    scaled = [value / config.temperature for value in logits]
    log_probabilities = stable_log_softmax(scaled)
    probabilities = [math.exp(value) for value in log_probabilities]

    order = sorted(range(len(probabilities)), key=lambda i: -probabilities[i])

    if config.top_k:
        order = order[:config.top_k]

    if config.top_p < 1.0:
        cumulative = 0.0
        kept: list[int] = []
        for token in order:
            kept.append(token)
            cumulative += probabilities[token]
            if cumulative >= config.top_p:
                break
        order = kept

    mass = math.fsum(probabilities[token] for token in order)
    threshold = rng.random() * mass
    cumulative = 0.0
    for token in order:
        cumulative += probabilities[token]
        if cumulative >= threshold:
            return TokenScore(token=token, log_probability=log_probabilities[token])

    return TokenScore(token=order[-1], log_probability=log_probabilities[order[-1]])


def exact_log_likelihood(
    logits_per_position: Sequence[Sequence[float]], targets: Sequence[int]
) -> float:
    """The chain rule, summed. An EXACT log-density with no approximation.

    Worth contrasting: a VAE bounds this quantity, a normalizing flow buys it
    with an invertible architecture, a diffusion model recovers it from an ODE
    solve. Here it is a sum of terms the forward pass already produced.
    """
    if len(logits_per_position) != len(targets):
        raise ShapeMismatch('one logit row per target is required')

    return math.fsum(
        stable_log_softmax(row)[target]
        for row, target in zip(logits_per_position, targets)
    )


@dataclass
class DecodeStats:
    """Prefill and decode counted separately.

    They are compute-bound and memory-bound respectively, so a single
    throughput number averages two entirely different problems into one
    meaningless figure — which is the standard mistake when profiling this
    model.
    """

    prefill_tokens: int = 0
    decode_tokens: int = 0
    cache_positions: int = 0
    weight_reads: int = 0

    def record_prefill(self, tokens: int) -> None:
        self.prefill_tokens += tokens
        self.cache_positions += tokens
        self.weight_reads += 1

    def record_decode(self, batch: int = 1) -> None:
        """Each decode step reads EVERY parameter to produce one token per
        batch element. That is why decode is memory-bound, and why batching
        helps so much: the weight read is shared across the batch."""
        self.decode_tokens += batch
        self.cache_positions += batch
        self.weight_reads += 1

    @property
    def tokens_per_weight_read(self) -> float:
        """Arithmetic intensity, roughly. Prefill is high and decode is near
        one, which is exactly why they need different optimizations."""
        total = self.prefill_tokens + self.decode_tokens
        return total / self.weight_reads if self.weight_reads else 0.0
`,
        rationale:
          'Two changes. The key-value cache becomes an explicit type with its own memory accounting, because it is the model’s real footprint at serving time — linear in batch times context, which means capacity depends on traffic shape rather than on the model, and it is what actually runs out rather than the weights. It is preallocated to the context length rather than grown, since growing a buffer per token is exactly the allocation pattern to avoid in a generation loop, and exhaustion becomes a specific error rather than a memory failure. The second is that the context window becomes a checked limit that refuses by default rather than truncating, because truncation removes the front of the sequence — where the system prompt and instructions live — so the model behaves as though it was never told what to do and nothing is logged. Around those: log-softmax is computed without forming the softmax, since taking the logarithm of a confident distribution underflows and that is the regime a trained model lives in; the sampling config is frozen and explicit because temperature changes behaviour more than most model changes do; the causality assertion exists because a wrong mask collapses the loss toward zero with no other symptom; and prefill and decode are counted separately because they are compute-bound and memory-bound and averaging them is the standard profiling mistake.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Same asymptotics for training; generation is unchanged here because the cache is defined but the loop is not yet restructured around it. Illustrative, not a measured benchmark: the cache type exists so the fast stage can use it, and its memory accounting is the number that decides serving capacity.',
      },

      'make-it-fast': {
        code: `"""The key-value cache, and why decode is memory-bound.

This is the most consequential optimization in the reference, and it is worth
stating precisely why it is correct. The causal mask guarantees position i
never attends to anything after i. So when a new token arrives, the keys and
values for every earlier position CANNOT CHANGE. Recomputing them is not an
approximation being avoided - it is arithmetic whose result is already known.

    naive generation:   O(n^3)   full quadratic forward pass per token
    with the cache:     O(n^2)   one new row of attention per token

Then the second observation, which is the one people miss. With the cache in
place, producing one token requires reading EVERY parameter and doing one
multiply-accumulate each. Arithmetic intensity is about one - so decode is
bound by MEMORY BANDWIDTH, not compute, and the arithmetic units sit idle.

Every remaining serving technique follows from that: batching amortizes the
weight read, quantization shrinks the bytes read, speculative decoding gets
more than one token per read. None of them is about doing less arithmetic.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


class KvCache:
    """Preallocated keys and values, one slab per layer.

    Preallocated to the full context rather than grown: growing a buffer per
    token is the allocation pattern to avoid in a generation loop, and the
    peak footprint is the same either way since the context is a hard limit.

    Layout is (layer, batch, head, position, head_dim). Position is the
    second-to-last axis on purpose - it is the axis that grows, and putting it
    there keeps each head's history contiguous for the attention product.
    """

    def __init__(self, depth: int, batch: int, heads: int, context: int, head_dim: int) -> None:
        shape = (depth, batch, heads, context, head_dim)
        self._keys = np.zeros(shape, dtype=FLOAT)
        self._values = np.zeros(shape, dtype=FLOAT)
        self._length = 0
        self._context = context

    @property
    def length(self) -> int:
        return self._length

    def bytes(self) -> int:
        """What actually runs out of memory in production.

        Linear in batch times context, so serving capacity is a function of
        traffic shape rather than of the model — and it is usually this rather
        than the weights that exhausts the device.
        """
        return self._keys.nbytes + self._values.nbytes

    def append(
        self, layer: int, keys: NDArray[np.float32], values: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Write the new position and return views over the whole history.

        Views, not copies: the attention product below reads straight out of
        the cache slab, so nothing is duplicated per step.
        """
        width = keys.shape[2]
        end = self._length + width
        if end > self._context:
            raise RuntimeError(
                f'cache full at {self._context} positions; generation cannot continue'
            )

        self._keys[layer, :, :, self._length:end, :] = keys
        self._values[layer, :, :, self._length:end, :] = values

        # Note \`advance\` is separate: the length must move once per TOKEN, not
        # once per layer, and every layer writes at the same position.
        return (
            self._keys[layer, :, :, :end, :],
            self._values[layer, :, :, :end, :],
        )

    def advance(self, width: int) -> None:
        self._length += width

    def reset(self) -> None:
        """Reuse the allocation across requests rather than reallocating."""
        self._length = 0


def cached_attention(
    query: NDArray[np.float32],
    keys: NDArray[np.float32],
    values: NDArray[np.float32],
) -> NDArray[np.float32]:
    """One new query against the whole cached history.

    No causal mask is needed here, and that is the point: the cache contains
    only positions up to and including the current one, so causality is
    enforced by what is IN the cache rather than by masking a full matrix.
    That removes both the mask and the wasted computation behind it.

    query is (batch, heads, 1, head_dim); keys and values are
    (batch, heads, length, head_dim). One new row of attention per token
    rather than a full quadratic matrix — this is the O(n^3) to O(n^2) change.
    """
    scale = FLOAT(1.0 / np.sqrt(query.shape[-1]))
    scores = np.einsum('bhqd,bhkd->bhqk', query, keys, optimize=True)
    scores *= scale

    # Stable softmax in place over the single query row.
    scores -= scores.max(axis=-1, keepdims=True)
    np.exp(scores, out=scores)
    scores /= scores.sum(axis=-1, keepdims=True)

    return np.einsum('bhqk,bhkd->bhqd', scores, values, optimize=True)


def prefill(
    tokens: NDArray[np.int32],
    embedding: NDArray[np.float32],
    position: NDArray[np.float32],
) -> NDArray[np.float32]:
    """Process the whole prompt in ONE parallel pass.

    This half is compute-bound: every position is computed simultaneously
    because the causal mask makes all n predictions valid at once, so the
    arithmetic units are saturated and this is the phase where FLOP
    optimization actually helps.

    Confusing this phase with decode is the standard profiling mistake — they
    sit on opposite sides of the memory-versus-compute boundary and need
    opposite optimizations.
    """
    hidden = embedding[tokens]
    hidden += position[: tokens.shape[1]]
    return hidden


def fused_qkv_decode(
    hidden: NDArray[np.float32],
    qkv_weight: NDArray[np.float32],
    heads: int,
) -> tuple[NDArray[np.float32], ...]:
    """One GEMV for all three projections of a single new token.

    Note what this is: a matrix-VECTOR product, not matrix-matrix. During
    decode there is one token, so every weight matrix is read to multiply
    against a single vector — arithmetic intensity of one, which is the whole
    memory-bound story in one line.
    """
    batch, _, model_dim = hidden.shape
    head_dim = model_dim // heads

    projected = hidden.reshape(batch, model_dim) @ qkv_weight
    projected = projected.reshape(batch, 3, heads, head_dim)
    # (3, batch, heads, 1, head_dim): the singleton query axis is what makes
    # the cached attention above a one-row product.
    projected = projected.transpose(1, 0, 2, 3)[:, :, :, None, :]
    return projected[0], projected[1], projected[2]


def batched_sample(
    logits: NDArray[np.float32],
    temperature: float,
    top_p: float,
    rng: np.random.Generator,
) -> NDArray[np.int32]:
    """Nucleus sampling for a whole batch at once.

    Temperature is applied BEFORE truncation, deliberately: it rescales the
    distribution, so truncating first would change which tokens were
    eligible. Every implementation follows this order and mixing it gives
    subtly different output.
    """
    if temperature <= 0.0:
        return logits.argmax(axis=-1).astype(np.int32)

    scaled = logits / FLOAT(temperature)
    scaled -= scaled.max(axis=-1, keepdims=True)
    np.exp(scaled, out=scaled)
    scaled /= scaled.sum(axis=-1, keepdims=True)

    if top_p >= 1.0:
        return _categorical(scaled, rng)

    # Sort descending, find the nucleus boundary per row, zero the tail.
    order = np.argsort(-scaled, axis=-1)
    ordered = np.take_along_axis(scaled, order, axis=-1)
    cumulative = np.cumsum(ordered, axis=-1)

    # Keep everything up to and INCLUDING the token that crosses the
    # threshold, or a very peaked distribution keeps nothing at all.
    keep = cumulative - ordered < top_p
    ordered *= keep
    ordered /= ordered.sum(axis=-1, keepdims=True)

    picked = _categorical(ordered, rng)
    return np.take_along_axis(order, picked[:, None], axis=-1).ravel().astype(np.int32)


def _categorical(probabilities: NDArray[np.float32], rng: np.random.Generator) -> NDArray[np.int32]:
    """One uniform draw per row against the cumulative distribution.

    searchsorted per row rather than a Python loop: the inverse-CDF sample is
    a binary search, and doing it as an array operation keeps the whole batch
    in one call.
    """
    cumulative = np.cumsum(probabilities, axis=-1)
    draws = rng.random((len(probabilities), 1), dtype=FLOAT) * cumulative[:, -1:]
    return (cumulative < draws).sum(axis=-1).astype(np.int32)


def arithmetic_intensity(parameters: int, batch: int, bytes_per_parameter: int = 2) -> float:
    """FLOPs per byte read during decode. The diagnostic that matters.

    One decode step reads every parameter and does roughly two FLOPs per
    parameter per batch element, so intensity is about batch divided by
    bytes-per-parameter. At batch one with 16-bit weights that is around one
    FLOP per byte — against hardware that wants hundreds.

    That gap IS the memory-bound problem, and it is why batching helps so much
    here: the weight read is shared, so intensity scales linearly with batch
    until the cache runs out of memory.
    """
    flops = 2 * parameters * batch
    bytes_read = parameters * bytes_per_parameter
    return flops / bytes_read
`,
        rationale:
          'This is the most consequential optimization in the reference and the correctness argument is worth stating precisely: the causal mask guarantees position i never attends to anything later, so when a new token arrives the keys and values for earlier positions cannot change — recomputing them is not an approximation being avoided but arithmetic whose result is already known. That turns generation from cubic in sequence length into quadratic. The cache is preallocated to the full context rather than grown, since the context is a hard limit so the peak footprint is identical and growing per token is the allocation pattern to avoid in a hot loop, and the layout puts the growing position axis second-to-last so each head’s history stays contiguous for the attention product. No causal mask appears in the cached attention at all, which is the second win: causality is enforced by what is in the cache rather than by masking a full matrix, so both the mask and the computation behind it disappear. The deeper point is the arithmetic-intensity function at the end — with the cache in place, decode reads every parameter to produce one token, so it is bandwidth-bound rather than compute-bound, and every remaining technique is about that rather than about doing less arithmetic.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The cache is allocated once at full context and written by slice, the softmax runs in place over the score row, and the sampling probabilities are normalized through their own buffer.',
            tradeoff: 'Preallocating to the full context means a short request holds the same memory as a long one, so serving capacity is set by the worst case rather than the average — which is why paged cache schemes exist.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The cached attention is two einsums over the batch and head axes, and the fused projection is one product for all three of Q, K and V.',
            tradeoff: 'During decode these are matrix-VECTOR products rather than matrix-matrix, so BLAS cannot reach anywhere near peak — the operation is bandwidth-bound and no amount of library tuning changes that.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The cache returns views rather than copies so attention reads straight out of the slab, and the nucleus truncation reuses the sorted probability buffer rather than building a mask array.',
            tradeoff: 'The raw logits are destroyed by the in-place softmax, so a diagnostic wanting the pre-temperature distribution — the natural thing to inspect when sampling looks wrong — needs an unfused pass.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Sampling handles the whole batch in one call with a per-row inverse-CDF search, and every decode step advances every sequence together.',
            tradeoff: 'Batching is the main lever for decode throughput because the weight read is shared, but it does nothing for single-request latency — and it is bounded by cache memory rather than by compute, so the two constraints pull against each other.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Generation drops from O(n^3) to O(n^2) with the cache, and each decode step is then bandwidth-bound at an arithmetic intensity of roughly the batch size. Illustrative, not a measured benchmark: the cache is the only change here that alters the asymptotics, and everything after it is about bytes read rather than operations performed.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A decoder-only LM, transcribed the way the definition reads.
//
//     log p(x) = sum_i log p(x_i | x_1..x_{i-1})
//
// The chain rule factorizes the joint EXACTLY, so the likelihood is a sum of
// terms one forward pass already computes - no bound, no invertibility
// constraint, no extra computation. That is the cleanest exact likelihood in
// this whole reference.
//
// The cost is paid elsewhere: the factorization imposes an ORDER, so
// generation is sequential. This version makes that cost visible in the worst
// possible way - it recomputes the entire prefix for every new token, which is
// CUBIC in sequence length. The fix is the key-value cache in the fast stage.
//
// Vector-of-vector, plain loops.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

// Subtract the max before exponentiating, or a large logit overflows.
Vector Softmax(const Vector& scores) {
  const double peak = *std::max_element(scores.begin(), scores.end());
  Vector output(scores.size(), 0.0);
  double total = 0.0;
  for (std::size_t i = 0; i < scores.size(); ++i) {
    output[i] = std::exp(scores[i] - peak);
    total += output[i];
  }
  for (double& value : output) {
    value /= total;
  }
  return output;
}

// Attention with a CAUSAL mask: position i sees 1..i and nothing later.
//
// The mask is what makes the chain-rule factorization exact. Without it
// position i would see the token it is supposed to predict, and the loss would
// go to zero while the model learned nothing - the classic and completely
// silent failure of this architecture.
Matrix CausalAttention(const Matrix& queries, const Matrix& keys, const Matrix& values,
                       std::size_t head_dim) {
  const std::size_t tokens = queries.size();
  const double scale = 1.0 / std::sqrt(static_cast<double>(head_dim));
  Matrix output(tokens, Vector(head_dim, 0.0));

  for (std::size_t i = 0; i < tokens; ++i) {
    // Only positions up to and including i. Everything later is masked to
    // negative infinity, which the softmax turns into exactly zero.
    Vector scores(tokens, -std::numeric_limits<double>::infinity());
    for (std::size_t j = 0; j <= i; ++j) {
      double dot = 0.0;
      for (std::size_t d = 0; d < head_dim; ++d) {
        dot += queries[i][d] * keys[j][d];
      }
      scores[j] = dot * scale;
    }

    const Vector weights = Softmax(scores);
    for (std::size_t j = 0; j <= i; ++j) {
      for (std::size_t d = 0; d < head_dim; ++d) {
        output[i][d] += weights[j] * values[j][d];
      }
    }
  }
  return output;
}

Matrix Linear(const Matrix& vectors, const Matrix& weight, const Vector& bias) {
  const std::size_t out_dim = weight[0].size();
  Matrix output(vectors.size(), Vector(out_dim, 0.0));
  for (std::size_t i = 0; i < vectors.size(); ++i) {
    for (std::size_t j = 0; j < out_dim; ++j) {
      output[i][j] = bias[j];
    }
    for (std::size_t k = 0; k < vectors[i].size(); ++k) {
      const double value = vectors[i][k];
      for (std::size_t j = 0; j < out_dim; ++j) {
        output[i][j] += value * weight[k][j];
      }
    }
  }
  return output;
}

Matrix LayerNorm(const Matrix& vectors, const Vector& gain, const Vector& shift) {
  constexpr double kEpsilon = 1e-5;
  Matrix output(vectors.size(), Vector(vectors[0].size(), 0.0));

  for (std::size_t i = 0; i < vectors.size(); ++i) {
    double mean = 0.0;
    for (const double value : vectors[i]) {
      mean += value;
    }
    mean /= static_cast<double>(vectors[i].size());

    double variance = 0.0;
    for (const double value : vectors[i]) {
      variance += (value - mean) * (value - mean);
    }
    variance /= static_cast<double>(vectors[i].size());

    const double denominator = std::sqrt(variance + kEpsilon);
    for (std::size_t d = 0; d < vectors[i].size(); ++d) {
      output[i][d] = (vectors[i][d] - mean) / denominator * gain[d] + shift[d];
    }
  }
  return output;
}

double Gelu(double value) {
  constexpr double kRootTwoOverPi = 0.7978845608028654;
  const double inner = kRootTwoOverPi * (value + 0.044715 * value * value * value);
  return 0.5 * value * (1.0 + std::tanh(inner));
}

// Cross-entropy against the NEXT token at every position.
//
// Teacher forcing: every position is predicted from the TRUE prefix. At
// generation time each position is predicted from the model's own output
// instead, and that gap is real - errors compound at inference in a way this
// loss never measures.
double TrainingLoss(const Matrix& logits, const std::vector<int>& token_ids) {
  double total = 0.0;
  for (std::size_t position = 0; position < logits.size(); ++position) {
    const Vector probabilities = Softmax(logits[position]);
    const int target = token_ids[position + 1];
    total -= std::log(std::max(probabilities[static_cast<std::size_t>(target)], 1e-12));
  }
  return total / static_cast<double>(logits.size());
}

// The chain rule, summed. An EXACT log-density with no approximation.
//
// Worth contrasting: a VAE bounds this quantity, a normalizing flow buys it
// with an invertible architecture, a diffusion model recovers it from an ODE
// solve. Here it is a sum of terms the forward pass already produced.
double ExactLogLikelihood(const Matrix& logits, const std::vector<int>& token_ids) {
  double total = 0.0;
  for (std::size_t position = 0; position < logits.size(); ++position) {
    const Vector probabilities = Softmax(logits[position]);
    total += std::log(
        std::max(probabilities[static_cast<std::size_t>(token_ids[position + 1])], 1e-12));
  }
  return total;
}

// exp of the mean negative log-likelihood. Nothing more than that.
double Perplexity(const Matrix& logits, const std::vector<int>& token_ids) {
  return std::exp(-ExactLogLikelihood(logits, token_ids) /
                  static_cast<double>(logits.size()));
}

// Sequential generation, recomputing EVERYTHING every step.
//
// This is the cost that matters. Each new token re-runs the full forward pass
// over the whole sequence so far, and attention inside it is quadratic, which
// makes generating n tokens CUBIC in n.
//
// The keys and values for positions already processed CANNOT CHANGE - the
// causal mask guarantees it - so recomputing them is pure waste. Caching them
// is the single largest algorithmic win available on this model.
int SampleToken(const Vector& logits, double temperature, std::mt19937& rng) {
  if (temperature <= 0.0) {
    return static_cast<int>(
        std::max_element(logits.begin(), logits.end()) - logits.begin());
  }

  Vector scaled(logits.size(), 0.0);
  for (std::size_t i = 0; i < logits.size(); ++i) {
    scaled[i] = logits[i] / temperature;
  }
  const Vector probabilities = Softmax(scaled);

  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  const double threshold = uniform(rng);
  double cumulative = 0.0;
  for (std::size_t token = 0; token < probabilities.size(); ++token) {
    cumulative += probabilities[token];
    if (cumulative >= threshold) {
      return static_cast<int>(token);
    }
  }
  return static_cast<int>(probabilities.size()) - 1;
}
`,
        profile:
          'Training is O(n^2 d + n d^2) for the whole sequence in one pass. Generation here is O(n^3) — each of n tokens re-runs a quadratic forward pass over the whole prefix. Illustrative, not a measured benchmark: that cubic factor is entirely avoidable and removing it is the largest single win available on this model.',
      },

      'make-it-right': {
        code: `// The same model, with the cache as a type and the context limit checked.
//
// Two things change. The key-value cache becomes an explicit object with its
// own memory accounting, because it is the model's real memory footprint at
// serving time and it is what actually runs out rather than the weights. And
// the context window becomes a checked limit, because truncation is otherwise
// silent and removes the START of the prompt - which is where the instructions
// are.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace lm {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the alternative is silent truncation from the FRONT,
// which removes the system prompt and the instructions while leaving the most
// recent tokens - so the model behaves as though it was never told what to do,
// and nothing is logged.
class ContextOverflow : public std::length_error {
 public:
  explicit ContextOverflow(const std::string& what) : std::length_error(what) {}
};

// Its own type because the cache - not the weights - is what actually runs out
// of memory in production. It grows linearly in batch times context, which
// means capacity is a function of traffic shape rather than of the model.
class CacheExhausted : public std::runtime_error {
 public:
  explicit CacheExhausted(const std::string& what) : std::runtime_error(what) {}
};

// Its own type because the failure is catastrophic and completely silent: the
// loss goes to near zero because the model can see the answer, and nothing
// else indicates anything is wrong.
class CausalityViolation : public std::logic_error {
 public:
  explicit CausalityViolation(const std::string& what) : std::logic_error(what) {}
};

// Derived once, so no call site recomputes head width or cache size.
struct ModelShape {
  std::size_t depth{};
  std::size_t model_dim{};
  std::size_t num_heads{};
  std::size_t context_length{};
  std::size_t vocabulary{};

  void Validate() const {
    if (num_heads == 0 || model_dim % num_heads != 0) {
      throw ShapeMismatch("model width does not divide into the head count");
    }
  }

  [[nodiscard]] std::size_t head_dim() const noexcept { return model_dim / num_heads; }

  // 1/sqrt(d_k). Omitting it saturates the softmax and stalls training.
  [[nodiscard]] double scale() const noexcept {
    return 1.0 / std::sqrt(static_cast<double>(head_dim()));
  }

  // The number that decides serving capacity.
  //
  // Two tensors - keys and values - per layer, per position, per batch
  // element. Linear in batch times context, which is why capacity depends on
  // traffic shape rather than on the model, and why this is what runs out
  // rather than the weights.
  [[nodiscard]] std::size_t CacheBytes(std::size_t batch,
                                       std::size_t bytes_per_value = 2) const noexcept {
    return 2 * depth * batch * context_length * model_dim * bytes_per_value;
  }
};

// Keys and values for positions already processed.
//
// The reason this is correct: the causal mask guarantees position i never
// attends to anything later, so the keys and values for earlier positions
// CANNOT CHANGE when a new token arrives. Recomputing them is pure waste, and
// caching turns generation from cubic in sequence length into quadratic.
//
// Preallocated to the context length rather than grown, because growing a
// buffer per token during generation is exactly the allocation pattern to
// avoid in the hot path.
class KeyValueCache {
 public:
  KeyValueCache(const ModelShape& shape, std::size_t batch)
      : shape_(shape), batch_(batch),
        keys_(shape.depth * batch * shape.context_length * shape.model_dim, 0.0F),
        values_(shape.depth * batch * shape.context_length * shape.model_dim, 0.0F) {}

  void Append(std::size_t layer, std::size_t batch_index, std::span<const float> key,
              std::span<const float> value) {
    if (length_ >= shape_.context_length) {
      throw CacheExhausted(
          "the cache is full; generation cannot continue without evicting or "
          "restarting");
    }
    const std::size_t offset = Offset(layer, batch_index, length_);
    std::copy(key.begin(), key.end(), keys_.begin() + static_cast<long>(offset));
    std::copy(value.begin(), value.end(), values_.begin() + static_cast<long>(offset));
  }

  // Length advances once per TOKEN, not once per layer: every layer writes at
  // the same position, so the caller advances after the full stack.
  void Advance() noexcept { ++length_; }

  [[nodiscard]] std::span<const float> Keys(std::size_t layer,
                                            std::size_t batch_index) const {
    return {keys_.data() + Offset(layer, batch_index, 0), length_ * shape_.model_dim};
  }

  [[nodiscard]] std::span<const float> Values(std::size_t layer,
                                              std::size_t batch_index) const {
    return {values_.data() + Offset(layer, batch_index, 0), length_ * shape_.model_dim};
  }

  [[nodiscard]] std::size_t length() const noexcept { return length_; }

  [[nodiscard]] std::size_t bytes() const noexcept {
    return (keys_.size() + values_.size()) * sizeof(float);
  }

  // Reuse the allocation across requests rather than reallocating.
  void Reset() noexcept { length_ = 0; }

 private:
  [[nodiscard]] std::size_t Offset(std::size_t layer, std::size_t batch_index,
                                   std::size_t position) const noexcept {
    return ((layer * batch_ + batch_index) * shape_.context_length + position) *
           shape_.model_dim;
  }

  ModelShape shape_;
  std::size_t batch_;
  std::vector<float> keys_;  // rule of zero: owning members only
  std::vector<float> values_;
  std::size_t length_{0};
};

// Inference-time settings that change the output more than the model does.
//
// Explicit because that is what makes them dangerous: two deployments of one
// checkpoint at different temperatures produce materially different behaviour,
// and a result reported without them is not comparable to anything.
struct SamplingConfig {
  double temperature{1.0};
  double top_p{1.0};
  std::size_t top_k{0};

  void Validate() const {
    if (temperature < 0.0) {
      throw ShapeMismatch("temperature cannot be negative");
    }
    if (top_p <= 0.0 || top_p > 1.0) {
      throw ShapeMismatch("top_p must lie in (0, 1]");
    }
  }

  // Temperature zero is greedy decoding, and needs no generator.
  [[nodiscard]] bool deterministic() const noexcept { return temperature == 0.0; }
};

// A token AND its log-probability.
//
// The log-probability comes back because it is free - the forward pass
// computed it - and because per-token likelihood is what makes this model
// usable as an anomaly detector and as a scorer, not only as a generator.
struct TokenScore {
  int token{};
  double log_probability{};
};

// log-softmax without forming the softmax first.
//
// Taking the logarithm of a softmax underflows for a confident distribution,
// which is exactly the regime a trained language model lives in - so this is
// correctness rather than polish.
[[nodiscard]] inline std::vector<double> StableLogSoftmax(std::span<const double> logits) {
  const double peak = *std::max_element(logits.begin(), logits.end());
  double total = 0.0;
  for (const double value : logits) {
    total += std::exp(value - peak);
  }
  const double log_total = std::log(total);

  std::vector<double> output(logits.size(), 0.0);
  for (std::size_t i = 0; i < logits.size(); ++i) {
    output[i] = logits[i] - peak - log_total;
  }
  return output;
}

// Verify no position attends to a later one.
//
// Worth having as a test: if the mask is wrong the loss collapses toward zero
// because the model can see the token it is predicting, and absolutely nothing
// else indicates a problem. The cheapest possible guard against the most
// catastrophic silent failure in the architecture.
inline void AssertCausal(std::span<const double> weights, std::size_t tokens) {
  for (std::size_t i = 0; i < tokens; ++i) {
    for (std::size_t j = i + 1; j < tokens; ++j) {
      if (std::abs(weights[i * tokens + j]) > 1e-9) {
        throw CausalityViolation(
            "a position attends to a later one; the causal mask is wrong and the "
            "loss will collapse to near zero");
      }
    }
  }
}

// Guard clause for the failure that is otherwise silent.
//
// Truncation removes the FRONT of the sequence, which is where the system
// prompt and instructions live. The model then behaves as though it was never
// told what to do, and nothing is logged - so the default here is to refuse
// rather than to truncate quietly.
[[nodiscard]] inline std::span<const int> FitContext(std::span<const int> tokens,
                                                     const ModelShape& shape,
                                                     bool allow_truncation = false) {
  if (tokens.size() <= shape.context_length) {
    return tokens;
  }
  if (!allow_truncation) {
    throw ContextOverflow(
        "the sequence exceeds the context window; truncating would remove the "
        "instructions at the front");
  }
  return tokens.subspan(tokens.size() - shape.context_length, shape.context_length);
}

// Prefill and decode counted separately.
//
// They are compute-bound and memory-bound respectively, so a single throughput
// number averages two entirely different problems into one meaningless figure
// - which is the standard mistake when profiling this model.
struct DecodeStats {
  std::size_t prefill_tokens{};
  std::size_t decode_tokens{};
  std::size_t weight_reads{};

  void RecordPrefill(std::size_t tokens) noexcept {
    prefill_tokens += tokens;
    ++weight_reads;
  }

  // Each decode step reads EVERY parameter to produce one token per batch
  // element. That is why decode is memory-bound, and why batching helps so
  // much: the weight read is shared across the batch.
  void RecordDecode(std::size_t batch = 1) noexcept {
    decode_tokens += batch;
    ++weight_reads;
  }

  // Arithmetic intensity, roughly. Prefill is high and decode is near one,
  // which is exactly why they need different optimizations.
  [[nodiscard]] double TokensPerWeightRead() const noexcept {
    return weight_reads == 0
               ? 0.0
               : static_cast<double>(prefill_tokens + decode_tokens) /
                     static_cast<double>(weight_reads);
  }
};

}  // namespace lm
`,
        rationale:
          'Two changes. The key-value cache becomes an explicit type with its own memory accounting, because it is the model’s real footprint at serving time — linear in batch times context, which means capacity depends on traffic shape rather than on the model, and it is what actually runs out rather than the weights. It is preallocated to the context length as one flat buffer with explicit offsets rather than grown, since growing per token is the allocation pattern to avoid in a generation loop, and exhaustion becomes a specific exception rather than a memory failure; advancing the length is deliberately separate from appending, because every layer writes at the same position and the length must move once per token. The second is that the context window becomes a checked limit that refuses by default rather than truncating, because truncation removes the front of the sequence — where the instructions live — so the model behaves as though it was never told what to do and nothing is logged. Around those: log-softmax is computed without forming the softmax, since taking the logarithm of a confident distribution underflows; the causality assertion exists because a wrong mask collapses the loss with no other symptom; and prefill and decode are counted separately because averaging a compute-bound and a memory-bound phase is the standard profiling mistake.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same asymptotics for training; generation is unchanged here because the cache is defined but the loop is not yet restructured around it. Illustrative, not a measured benchmark: the flat cache layout with explicit offsets is what lets the fast stage hand BLAS a contiguous operand.',
      },

      'make-it-fast': {
        code: `// The key-value cache, and why decode is memory-bound.
//
// This is the most consequential optimization in the reference, and it is
// worth stating precisely why it is correct. The causal mask guarantees
// position i never attends to anything after i. So when a new token arrives,
// the keys and values for every earlier position CANNOT CHANGE. Recomputing
// them is not an approximation being avoided - it is arithmetic whose result
// is already known.
//
//     naive generation:   O(n^3)   full quadratic forward pass per token
//     with the cache:     O(n^2)   one new row of attention per token
//
// Then the second observation, which is the one people miss. With the cache in
// place, producing one token requires reading EVERY parameter and doing one
// multiply-accumulate each. Arithmetic intensity is about one - so decode is
// bound by MEMORY BANDWIDTH, not compute, and the arithmetic units sit idle.
//
// Every remaining serving technique follows from that: batching amortizes the
// weight read, quantization shrinks the bytes read, speculative decoding gets
// more than one token per read. None is about doing less arithmetic.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace lm {

// Preallocated keys and values, one flat slab.
//
// Layout is (layer, batch, head, position, head_dim). Position is the
// second-to-last axis on purpose - it is the axis that grows, and putting it
// there keeps each head's history CONTIGUOUS, which is what lets the attention
// product below be a single GEMV over the slab rather than a strided gather.
class KvCache {
 public:
  KvCache(int depth, int batch, int heads, int context, int head_dim)
      : depth_(depth), batch_(batch), heads_(heads), context_(context),
        head_dim_(head_dim),
        keys_(static_cast<std::size_t>(depth) * batch * heads * context * head_dim),
        values_(static_cast<std::size_t>(depth) * batch * heads * context * head_dim) {}

  // What actually runs out of memory in production.
  //
  // Linear in batch times context, so serving capacity is a function of
  // traffic shape rather than of the model - and it is usually this rather
  // than the weights that exhausts the device.
  [[nodiscard]] std::size_t bytes() const noexcept {
    return (keys_.size() + values_.size()) * sizeof(float);
  }

  [[nodiscard]] float* KeySlot(int layer, int batch_index, int head) noexcept {
    return keys_.data() + Offset(layer, batch_index, head) +
           static_cast<std::size_t>(length_) * head_dim_;
  }

  [[nodiscard]] float* ValueSlot(int layer, int batch_index, int head) noexcept {
    return values_.data() + Offset(layer, batch_index, head) +
           static_cast<std::size_t>(length_) * head_dim_;
  }

  [[nodiscard]] const float* KeyHistory(int layer, int batch_index, int head) const noexcept {
    return keys_.data() + Offset(layer, batch_index, head);
  }

  [[nodiscard]] const float* ValueHistory(int layer, int batch_index,
                                          int head) const noexcept {
    return values_.data() + Offset(layer, batch_index, head);
  }

  [[nodiscard]] int length() const noexcept { return length_; }

  // Advances once per TOKEN, not once per layer: every layer writes at the
  // same position, so the caller advances after the full stack.
  void Advance() noexcept { ++length_; }

  // Reuse the allocation across requests rather than reallocating.
  void Reset() noexcept { length_ = 0; }

 private:
  [[nodiscard]] std::size_t Offset(int layer, int batch_index, int head) const noexcept {
    return ((static_cast<std::size_t>(layer) * batch_ + batch_index) * heads_ + head) *
           context_ * head_dim_;
  }

  int depth_;
  int batch_;
  int heads_;
  int context_;
  int head_dim_;
  std::vector<float> keys_;
  std::vector<float> values_;
};

// One new query against the whole cached history.
//
// No causal mask is needed here, and that is the point: the cache contains
// only positions up to and including the current one, so causality is enforced
// by what is IN the cache rather than by masking a full matrix. That removes
// both the mask and the wasted computation behind it.
//
// One new row of attention per token rather than a full quadratic matrix -
// this is the O(n^3) to O(n^2) change.
inline void CachedAttention(const float* __restrict query,
                            const float* __restrict keys,
                            const float* __restrict values, int length, int head_dim,
                            float* __restrict scores, float* __restrict out) {
  const float scale = 1.0F / std::sqrt(static_cast<float>(head_dim));

  // scores = K * q, one GEMV over the contiguous key history.
  cblas_sgemv(CblasRowMajor, CblasNoTrans, length, head_dim, scale, keys, head_dim,
              query, 1, 0.0F, scores, 1);

  // Stable softmax in place over the single query row.
  float peak = -std::numeric_limits<float>::infinity();
  for (int j = 0; j < length; ++j) {
    peak = std::max(peak, scores[j]);
  }
  float total = 0.0F;
  for (int j = 0; j < length; ++j) {
    scores[j] = std::exp(scores[j] - peak);
    total += scores[j];
  }
  const float inverse = 1.0F / total;

  // out = V^T * weights, the second GEMV. Both products read the cache slab
  // directly rather than through a gathered copy.
  cblas_sgemv(CblasRowMajor, CblasTrans, length, head_dim, inverse, values, head_dim,
              scores, 1, 0.0F, out, 1);
}

// Process the whole prompt in ONE parallel pass.
//
// This half is compute-bound: every position is computed simultaneously
// because the causal mask makes all n predictions valid at once, so the
// arithmetic units are saturated and this is the phase where FLOP optimization
// actually helps.
//
// Confusing this phase with decode is the standard profiling mistake - they
// sit on opposite sides of the memory-versus-compute boundary and need
// opposite optimizations.
inline void PrefillProjection(const float* __restrict hidden, int tokens, int model_dim,
                              const float* __restrict weight, int out_dim,
                              float* __restrict out) {
  // Matrix-MATRIX: many tokens against the weights at once, which is what
  // saturates the arithmetic units.
  cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, tokens, out_dim, model_dim,
              1.0F, hidden, model_dim, weight, out_dim, 0.0F, out, out_dim);
}

// One GEMV for all three projections of a single new token.
//
// Note what this is: a matrix-VECTOR product, not matrix-matrix. During decode
// there is one token, so every weight matrix is read to multiply against a
// single vector - arithmetic intensity of one, which is the whole memory-bound
// story in one line.
inline void DecodeProjection(const float* __restrict hidden, int model_dim,
                             const float* __restrict qkv_weight,
                             float* __restrict out) {
  cblas_sgemv(CblasRowMajor, CblasTrans, model_dim, 3 * model_dim, 1.0F, qkv_weight,
              3 * model_dim, hidden, 1, 0.0F, out, 1);
}

// Nucleus sampling for a whole batch at once.
//
// Temperature is applied BEFORE truncation, deliberately: it rescales the
// distribution, so truncating first would change which tokens were eligible.
// Every implementation follows this order and mixing it gives subtly different
// output.
inline int SampleToken(float* __restrict logits, int vocabulary, float temperature,
                       float top_p, uint64_t seed, std::vector<int>* order) {
  if (temperature <= 0.0F) {
    return static_cast<int>(std::max_element(logits, logits + vocabulary) - logits);
  }

  float peak = -std::numeric_limits<float>::infinity();
  for (int i = 0; i < vocabulary; ++i) {
    logits[i] /= temperature;
    peak = std::max(peak, logits[i]);
  }
  float total = 0.0F;
  for (int i = 0; i < vocabulary; ++i) {
    logits[i] = std::exp(logits[i] - peak);
    total += logits[i];
  }
  for (int i = 0; i < vocabulary; ++i) {
    logits[i] /= total;
  }

  order->resize(static_cast<std::size_t>(vocabulary));
  std::iota(order->begin(), order->end(), 0);

  // partial_sort, not a full sort: the nucleus is almost always a small
  // prefix, so ordering the whole vocabulary is discarded work. A conservative
  // bound on the nucleus size keeps this correct for any top_p.
  const int candidates = std::min(vocabulary, 1024);
  std::partial_sort(order->begin(), order->begin() + candidates, order->end(),
                    [logits](int a, int b) { return logits[a] > logits[b]; });

  uint64_t state = seed | 1ULL;
  state ^= state << 13;
  state ^= state >> 7;
  state ^= state << 17;
  const float draw = static_cast<float>(state >> 40) * (1.0F / 16777216.0F);

  float cumulative = 0.0F;
  float nucleus = 0.0F;
  int kept = 0;
  for (; kept < candidates; ++kept) {
    nucleus += logits[(*order)[static_cast<std::size_t>(kept)]];
    if (nucleus >= top_p) {
      ++kept;
      break;
    }
  }

  const float threshold = draw * nucleus;
  for (int i = 0; i < kept; ++i) {
    cumulative += logits[(*order)[static_cast<std::size_t>(i)]];
    if (cumulative >= threshold) {
      return (*order)[static_cast<std::size_t>(i)];
    }
  }
  return (*order)[static_cast<std::size_t>(kept - 1)];
}

// FLOPs per byte read during decode. The diagnostic that matters.
//
// One decode step reads every parameter and does roughly two FLOPs per
// parameter per batch element, so intensity is about batch divided by
// bytes-per-parameter. At batch one with 16-bit weights that is around one
// FLOP per byte - against hardware that wants hundreds.
//
// That gap IS the memory-bound problem, and it is why batching helps so much
// here: the weight read is shared, so intensity scales linearly with batch
// until the cache runs out of memory.
[[nodiscard]] inline double ArithmeticIntensity(std::size_t parameters, int batch,
                                                int bytes_per_parameter = 2) {
  const double flops = 2.0 * static_cast<double>(parameters) * batch;
  const double bytes = static_cast<double>(parameters) * bytes_per_parameter;
  return flops / bytes;
}

}  // namespace lm
`,
        rationale:
          'This is the most consequential optimization in the reference and the correctness argument is worth stating precisely: the causal mask guarantees position i never attends to anything later, so when a new token arrives the keys and values for earlier positions cannot change — recomputing them is not an approximation being avoided but arithmetic whose result is already known. That turns generation from cubic in sequence length into quadratic. The cache layout puts the growing position axis second-to-last so each head’s history is contiguous, which is what lets the cached attention be two GEMV calls reading the slab directly rather than a strided gather into a staging buffer. No causal mask appears in the cached attention at all: causality is enforced by what is in the cache rather than by masking a full matrix, so both the mask and the computation behind it disappear. The contrast between the prefill and decode projections is deliberate and is the second point — prefill is matrix-matrix and saturates arithmetic, decode is matrix-vector and reads every weight for one token, which is why the arithmetic-intensity function at the end matters more than any FLOP count. Sampling uses partial_sort because the nucleus is almost always a small prefix.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Cached attention is two GEMV calls over the contiguous key and value history, and prefill is a GEMM because many tokens are available at once.',
            tradeoff: 'During decode these are matrix-vector products, so BLAS cannot approach peak — the operation is bandwidth-bound and no library tuning changes that, which is precisely the point the arithmetic-intensity helper makes.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Position as the second-to-last axis keeps each head’s history contiguous, so both attention products read the cache slab directly rather than through a gathered copy.',
            tradeoff: 'That layout makes a cross-request operation — evicting or compacting one sequence out of a batched cache — a strided scatter, which is exactly what a paged-attention scheme has to solve.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The softmax normalization folds into the second GEMV’s alpha rather than being a separate pass over the score row, and the temperature scaling folds into the same traversal as finding the maximum.',
            tradeoff: 'The raw logits are destroyed by the in-place scaling, so a diagnostic wanting the pre-temperature distribution — the natural thing to inspect when sampling looks wrong — needs an unfused pass.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The softmax exponentials and the score reduction are contiguous and branch-free, and only vectorize when the compiler may emit the host machine width.',
            tradeoff: 'The binary stops being portable across machine generations, and the vectorized exponential differs in low-order bits across targets — which changes sampled tokens for a fixed seed, so generation is not bit-reproducible across hardware.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Generation drops from O(n^3) to O(n^2) with the cache, and each decode step is then bandwidth-bound at an arithmetic intensity of roughly the batch size. Illustrative, not a measured benchmark: the cache is the only change here that alters the asymptotics, and everything after it is about bytes read rather than operations performed.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A decoder-only LM, transcribed the way the definition reads.
//
//     log p(x) = sum_i log p(x_i | x_1..x_{i-1})
//
// The chain rule factorizes the joint EXACTLY, so the likelihood is a sum of
// terms one forward pass already computes - no bound, no invertibility
// constraint, no extra computation. That is the cleanest exact likelihood in
// this whole reference.
//
// The cost is paid elsewhere: the factorization imposes an ORDER, so
// generation is sequential. This version makes that cost visible in the worst
// possible way - it recomputes the entire prefix for every new token, which is
// CUBIC in sequence length. The fix is the key-value cache in the fast stage.
//
// Vec-of-Vec, index loops, no libraries.

/// Subtract the max before exponentiating, or a large logit overflows.
fn softmax(scores: &[f64]) -> Vec<f64> {
    let peak = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mut output: Vec<f64> = scores.iter().map(|s| (s - peak).exp()).collect();
    let total: f64 = output.iter().sum();
    for value in output.iter_mut() {
        *value /= total;
    }
    output
}

/// Attention with a CAUSAL mask: position i sees 1..i and nothing later.
///
/// The mask is what makes the chain-rule factorization exact. Without it
/// position i would see the token it is supposed to predict, and the loss
/// would go to zero while the model learned nothing - the classic and
/// completely silent failure of this architecture.
fn causal_attention(
    queries: &[Vec<f64>],
    keys: &[Vec<f64>],
    values: &[Vec<f64>],
    head_dim: usize,
) -> Vec<Vec<f64>> {
    let tokens = queries.len();
    let scale = 1.0 / (head_dim as f64).sqrt();
    let mut output = vec![vec![0.0_f64; head_dim]; tokens];

    for i in 0..tokens {
        // Only positions up to and including i. Everything later is masked to
        // negative infinity, which the softmax turns into exactly zero.
        let mut scores = vec![f64::NEG_INFINITY; tokens];
        for j in 0..=i {
            let mut dot = 0.0;
            for d in 0..head_dim {
                dot += queries[i][d] * keys[j][d];
            }
            scores[j] = dot * scale;
        }

        let weights = softmax(&scores);
        for j in 0..=i {
            for d in 0..head_dim {
                output[i][d] += weights[j] * values[j][d];
            }
        }
    }
    output
}

fn linear(vectors: &[Vec<f64>], weight: &[Vec<f64>], bias: &[f64]) -> Vec<Vec<f64>> {
    let out_dim = weight[0].len();
    vectors
        .iter()
        .map(|vector| {
            let mut row = bias.to_vec();
            for (k, &value) in vector.iter().enumerate() {
                for j in 0..out_dim {
                    row[j] += value * weight[k][j];
                }
            }
            row
        })
        .collect()
}

fn layer_norm(vectors: &[Vec<f64>], gain: &[f64], shift: &[f64]) -> Vec<Vec<f64>> {
    const EPSILON: f64 = 1e-5;
    vectors
        .iter()
        .map(|vector| {
            let width = vector.len() as f64;
            let mean = vector.iter().sum::<f64>() / width;
            let variance =
                vector.iter().map(|v| (v - mean) * (v - mean)).sum::<f64>() / width;
            let denominator = (variance + EPSILON).sqrt();
            vector
                .iter()
                .zip(gain)
                .zip(shift)
                .map(|((value, g), s)| (value - mean) / denominator * g + s)
                .collect()
        })
        .collect()
}

fn gelu(value: f64) -> f64 {
    const ROOT_TWO_OVER_PI: f64 = 0.797_884_560_802_865_4;
    let inner = ROOT_TWO_OVER_PI * (value + 0.044_715 * value * value * value);
    0.5 * value * (1.0 + inner.tanh())
}

/// Cross-entropy against the NEXT token at every position.
///
/// Teacher forcing: every position is predicted from the TRUE prefix. At
/// generation time each position is predicted from the model's own output
/// instead, and that gap is real - errors compound at inference in a way this
/// loss never measures.
fn training_loss(logits: &[Vec<f64>], token_ids: &[usize]) -> f64 {
    let mut total = 0.0;
    for (position, row) in logits.iter().enumerate() {
        let probabilities = softmax(row);
        total -= probabilities[token_ids[position + 1]].max(1e-12).ln();
    }
    total / logits.len() as f64
}

/// The chain rule, summed. An EXACT log-density with no approximation.
///
/// Worth contrasting: a VAE bounds this quantity, a normalizing flow buys it
/// with an invertible architecture, a diffusion model recovers it from an ODE
/// solve. Here it is a sum of terms the forward pass already produced.
fn exact_log_likelihood(logits: &[Vec<f64>], token_ids: &[usize]) -> f64 {
    logits
        .iter()
        .enumerate()
        .map(|(position, row)| softmax(row)[token_ids[position + 1]].max(1e-12).ln())
        .sum()
}

/// exp of the mean negative log-likelihood. Nothing more than that.
fn perplexity(logits: &[Vec<f64>], token_ids: &[usize]) -> f64 {
    (-exact_log_likelihood(logits, token_ids) / logits.len() as f64).exp()
}

/// Sequential generation, recomputing EVERYTHING every step.
///
/// This is the cost that matters. Each new token re-runs the full forward pass
/// over the whole sequence so far, and attention inside it is quadratic, which
/// makes generating n tokens CUBIC in n.
///
/// The keys and values for positions already processed CANNOT CHANGE - the
/// causal mask guarantees it - so recomputing them is pure waste. Caching them
/// is the single largest algorithmic win available on this model.
fn sample_token(logits: &[f64], temperature: f64, draw: f64) -> usize {
    if temperature <= 0.0 {
        let mut best = 0;
        for (index, &value) in logits.iter().enumerate() {
            if value > logits[best] {
                best = index;
            }
        }
        return best;
    }

    let scaled: Vec<f64> = logits.iter().map(|value| value / temperature).collect();
    let probabilities = softmax(&scaled);

    let mut cumulative = 0.0;
    for (token, probability) in probabilities.iter().enumerate() {
        cumulative += probability;
        if cumulative >= draw {
            return token;
        }
    }
    probabilities.len() - 1
}
`,
        profile:
          'Training is O(n^2 d + n d^2) for the whole sequence in one pass. Generation here is O(n^3) — each of n tokens re-runs a quadratic forward pass over the whole prefix. Illustrative, not a measured benchmark: that cubic factor is entirely avoidable and removing it is the largest single win available on this model.',
      },

      'make-it-right': {
        code: `//! The same model, with the cache as a type and the context limit checked.
//!
//! Two things change. The key-value cache becomes an explicit type with its
//! own memory accounting, because it is the model's real memory footprint at
//! serving time and it is what actually runs out rather than the weights. And
//! the context window becomes a checked limit, because truncation is
//! otherwise silent and removes the START of the prompt - which is where the
//! instructions are.

use std::fmt;

/// Width of the residual stream.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ModelDim(pub usize);

/// Maximum sequence the model can attend over. A hard limit.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ContextLength(pub usize);

/// A token identifier, distinct from a position.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenId(pub u32);

#[derive(Debug, PartialEq)]
pub enum LanguageModelError {
    /// A sequence exceeding the context window.
    ///
    /// Its own variant because the alternative is silent truncation from the
    /// FRONT, which removes the system prompt and the instructions while
    /// leaving the most recent tokens - so the model behaves as though it was
    /// never told what to do, and nothing is logged.
    ContextOverflow { have: usize, limit: usize },
    /// The key-value cache cannot hold another token.
    ///
    /// Its own variant because the cache - not the weights - is what actually
    /// runs out of memory in production. It grows linearly in batch times
    /// context, so capacity is a function of traffic shape.
    CacheExhausted { capacity: usize },
    /// A position attends to a later one.
    ///
    /// Its own variant because the failure is catastrophic and completely
    /// silent: the loss goes to near zero because the model can see the
    /// answer, and nothing else indicates anything is wrong.
    CausalityViolation { query: usize, key: usize },
    /// A width that does not divide into the head count.
    IndivisibleHeads { model_dim: usize, heads: usize },
    /// A sampling parameter outside its valid range.
    InvalidSampling { reason: &'static str },
}

impl fmt::Display for LanguageModelError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ContextOverflow { have, limit } => write!(
                f,
                "{have} tokens exceed the {limit}-token context; truncating would \
                 remove the instructions at the front"
            ),
            Self::CacheExhausted { capacity } => write!(
                f,
                "the cache is full at {capacity} positions; generation cannot continue \
                 without evicting or restarting"
            ),
            Self::CausalityViolation { query, key } => write!(
                f,
                "position {query} attends to {key}; the causal mask is wrong and the \
                 loss will collapse to near zero"
            ),
            Self::IndivisibleHeads { model_dim, heads } => {
                write!(f, "width {model_dim} does not divide into {heads} heads")
            }
            Self::InvalidSampling { reason } => write!(f, "invalid sampling: {reason}"),
        }
    }
}

impl std::error::Error for LanguageModelError {}

/// Derived once, so no call site recomputes head width or cache size.
#[derive(Debug, Clone, Copy)]
pub struct ModelShape {
    pub depth: usize,
    pub model_dim: ModelDim,
    pub num_heads: usize,
    pub context: ContextLength,
    pub vocabulary: usize,
}

impl ModelShape {
    pub fn validate(&self) -> Result<(), LanguageModelError> {
        if self.num_heads == 0 || self.model_dim.0 % self.num_heads != 0 {
            return Err(LanguageModelError::IndivisibleHeads {
                model_dim: self.model_dim.0,
                heads: self.num_heads,
            });
        }
        Ok(())
    }

    pub fn head_dim(&self) -> usize {
        self.model_dim.0 / self.num_heads
    }

    /// 1/sqrt(d_k). Omitting it saturates the softmax and stalls training.
    pub fn scale(&self) -> f32 {
        1.0 / (self.head_dim() as f32).sqrt()
    }

    /// The number that decides serving capacity.
    ///
    /// Two tensors — keys and values — per layer, per position, per batch
    /// element. Linear in batch times context, which is why capacity depends
    /// on traffic shape rather than on the model, and why this is what runs
    /// out rather than the weights.
    pub fn cache_bytes(&self, batch: usize, bytes_per_value: usize) -> usize {
        2 * self.depth * batch * self.context.0 * self.model_dim.0 * bytes_per_value
    }
}

/// Keys and values for positions already processed.
///
/// The reason this is correct: the causal mask guarantees position i never
/// attends to anything later, so the keys and values for earlier positions
/// CANNOT CHANGE when a new token arrives. Recomputing them is pure waste, and
/// caching turns generation from cubic in sequence length into quadratic.
///
/// Preallocated to the context length rather than grown, because growing a
/// buffer per token during generation is exactly the allocation pattern to
/// avoid in the hot path.
pub struct KeyValueCache {
    keys: Vec<f32>,
    values: Vec<f32>,
    shape: ModelShape,
    batch: usize,
    length: usize,
}

impl KeyValueCache {
    pub fn new(shape: ModelShape, batch: usize) -> Result<Self, LanguageModelError> {
        shape.validate()?;
        // Capacity known exactly: one allocation each, never grown.
        let slab = shape.depth * batch * shape.context.0 * shape.model_dim.0;
        Ok(Self {
            keys: vec![0.0; slab],
            values: vec![0.0; slab],
            shape,
            batch,
            length: 0,
        })
    }

    pub fn append(
        &mut self,
        layer: usize,
        batch_index: usize,
        key: &[f32],
        value: &[f32],
    ) -> Result<(), LanguageModelError> {
        if self.length >= self.shape.context.0 {
            return Err(LanguageModelError::CacheExhausted {
                capacity: self.shape.context.0,
            });
        }
        let offset = self.offset(layer, batch_index, self.length);
        let width = self.shape.model_dim.0;
        self.keys[offset..offset + width].copy_from_slice(key);
        self.values[offset..offset + width].copy_from_slice(value);
        Ok(())
    }

    /// Advances once per TOKEN, not once per layer: every layer writes at the
    /// same position, so the caller advances after the full stack.
    pub fn advance(&mut self) {
        self.length += 1;
    }

    pub fn keys(&self, layer: usize, batch_index: usize) -> &[f32] {
        let start = self.offset(layer, batch_index, 0);
        &self.keys[start..start + self.length * self.shape.model_dim.0]
    }

    pub fn values(&self, layer: usize, batch_index: usize) -> &[f32] {
        let start = self.offset(layer, batch_index, 0);
        &self.values[start..start + self.length * self.shape.model_dim.0]
    }

    pub fn length(&self) -> usize {
        self.length
    }

    pub fn bytes(&self) -> usize {
        (self.keys.len() + self.values.len()) * std::mem::size_of::<f32>()
    }

    /// Reuse the allocation across requests rather than reallocating.
    pub fn reset(&mut self) {
        self.length = 0;
    }

    fn offset(&self, layer: usize, batch_index: usize, position: usize) -> usize {
        ((layer * self.batch + batch_index) * self.shape.context.0 + position)
            * self.shape.model_dim.0
    }
}

/// Inference-time settings that change the output more than the model does.
///
/// Explicit because that is what makes them dangerous: two deployments of one
/// checkpoint at different temperatures produce materially different
/// behaviour, and a result reported without them is not comparable to anything.
#[derive(Debug, Clone, Copy)]
pub struct SamplingConfig {
    pub temperature: f64,
    pub top_p: f64,
    pub top_k: usize,
    pub seed: Option<u64>,
}

impl SamplingConfig {
    pub fn validate(&self) -> Result<(), LanguageModelError> {
        if self.temperature < 0.0 {
            return Err(LanguageModelError::InvalidSampling {
                reason: "temperature cannot be negative",
            });
        }
        if self.top_p <= 0.0 || self.top_p > 1.0 {
            return Err(LanguageModelError::InvalidSampling {
                reason: "top_p must lie in (0, 1]",
            });
        }
        Ok(())
    }

    /// Temperature zero is greedy decoding, and needs no seed.
    pub fn deterministic(&self) -> bool {
        self.temperature == 0.0
    }
}

/// A token AND its log-probability.
///
/// The log-probability comes back because it is free — the forward pass
/// computed it — and because per-token likelihood is what makes this model
/// usable as an anomaly detector and as a scorer, not only as a generator.
#[derive(Debug, Clone, Copy)]
pub struct TokenScore {
    pub token: TokenId,
    pub log_probability: f64,
}

/// log-softmax without forming the softmax first.
///
/// Taking the logarithm of a softmax underflows for a confident distribution,
/// which is exactly the regime a trained language model lives in - so this is
/// correctness rather than polish.
pub fn stable_log_softmax(logits: &[f64]) -> Vec<f64> {
    let peak = logits.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let total: f64 = logits.iter().map(|value| (value - peak).exp()).sum();
    let log_total = total.ln();
    logits.iter().map(|value| value - peak - log_total).collect()
}

/// Verify no position attends to a later one.
///
/// Worth having as a test: if the mask is wrong the loss collapses toward zero
/// because the model can see the token it is predicting, and absolutely
/// nothing else indicates a problem. The cheapest possible guard against the
/// most catastrophic silent failure in the architecture.
pub fn assert_causal(weights: &[f64], tokens: usize) -> Result<(), LanguageModelError> {
    for i in 0..tokens {
        for j in i + 1..tokens {
            if weights[i * tokens + j].abs() > 1e-9 {
                return Err(LanguageModelError::CausalityViolation { query: i, key: j });
            }
        }
    }
    Ok(())
}

/// Guard clause for the failure that is otherwise silent.
///
/// Truncation removes the FRONT of the sequence, which is where the system
/// prompt and instructions live. The model then behaves as though it was never
/// told what to do, and nothing is logged - so the default here is to refuse
/// rather than to truncate quietly.
pub fn fit_context<'a>(
    tokens: &'a [TokenId],
    shape: &ModelShape,
    allow_truncation: bool,
) -> Result<&'a [TokenId], LanguageModelError> {
    if tokens.len() <= shape.context.0 {
        return Ok(tokens);
    }
    if !allow_truncation {
        return Err(LanguageModelError::ContextOverflow {
            have: tokens.len(),
            limit: shape.context.0,
        });
    }
    Ok(&tokens[tokens.len() - shape.context.0..])
}

/// Prefill and decode counted separately.
///
/// They are compute-bound and memory-bound respectively, so a single
/// throughput number averages two entirely different problems into one
/// meaningless figure - which is the standard mistake when profiling this
/// model.
#[derive(Debug, Default, Clone, Copy)]
pub struct DecodeStats {
    pub prefill_tokens: usize,
    pub decode_tokens: usize,
    pub weight_reads: usize,
}

impl DecodeStats {
    pub fn record_prefill(&mut self, tokens: usize) {
        self.prefill_tokens += tokens;
        self.weight_reads += 1;
    }

    /// Each decode step reads EVERY parameter to produce one token per batch
    /// element. That is why decode is memory-bound, and why batching helps so
    /// much: the weight read is shared across the batch.
    pub fn record_decode(&mut self, batch: usize) {
        self.decode_tokens += batch;
        self.weight_reads += 1;
    }

    /// Arithmetic intensity, roughly. Prefill is high and decode is near one,
    /// which is exactly why they need different optimizations.
    pub fn tokens_per_weight_read(&self) -> f64 {
        if self.weight_reads == 0 {
            0.0
        } else {
            (self.prefill_tokens + self.decode_tokens) as f64 / self.weight_reads as f64
        }
    }
}
`,
        rationale:
          'Two changes. The key-value cache becomes an explicit type with its own memory accounting, because it is the model’s real footprint at serving time — linear in batch times context, which means capacity depends on traffic shape rather than on the model, and it is what actually runs out rather than the weights. It is allocated once at full context as two flat slabs with explicit offsets rather than grown, since growing per token is the allocation pattern to avoid in a generation loop, and exhaustion becomes a specific error variant; advancing the length is deliberately separate from appending, because every layer writes at the same position and the length must move once per token. The second is that the context window becomes a checked limit that refuses by default rather than truncating, because truncation removes the front of the sequence — where the instructions live — so the model behaves as though it was never told what to do and nothing is logged. Around those: log-softmax is computed without forming the softmax, since taking the logarithm of a confident distribution underflows and that is the regime a trained model lives in; the causality check returns an error naming both positions because a wrong mask collapses the loss with no other symptom; and prefill and decode are counted separately because averaging a compute-bound and a memory-bound phase is the standard profiling mistake.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same asymptotics for training; generation is unchanged here because the cache is defined but the loop is not yet restructured around it. Illustrative, not a measured benchmark: the flat slab layout with explicit offsets is what lets the fast stage hand BLAS a contiguous operand.',
      },

      'make-it-fast': {
        code: `//! The key-value cache, and why decode is memory-bound.
//!
//! This is the most consequential optimization in the reference, and it is
//! worth stating precisely why it is correct. The causal mask guarantees
//! position i never attends to anything after i. So when a new token arrives,
//! the keys and values for every earlier position CANNOT CHANGE. Recomputing
//! them is not an approximation being avoided - it is arithmetic whose result
//! is already known.
//!
//!     naive generation:   O(n^3)   full quadratic forward pass per token
//!     with the cache:     O(n^2)   one new row of attention per token
//!
//! Then the second observation, which is the one people miss. With the cache
//! in place, producing one token requires reading EVERY parameter and doing
//! one multiply-accumulate each. Arithmetic intensity is about one - so decode
//! is bound by MEMORY BANDWIDTH, not compute, and the arithmetic units idle.
//!
//! Every remaining serving technique follows from that: batching amortizes the
//! weight read, quantization shrinks the bytes read, speculative decoding gets
//! more than one token per read. None is about doing less arithmetic.

use ndarray::{s, Array1, Array2, Array3, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Preallocated keys and values, one slab per layer.
///
/// Layout is (layer, head, position, head_dim). Position is the second-to-last
/// axis on purpose - it is the axis that grows, and putting it there keeps
/// each head's history CONTIGUOUS, which is what lets the attention product
/// below be a single matrix-vector product over the slab rather than a strided
/// gather.
pub struct KvCache {
    keys: Array3<f32>,
    values: Array3<f32>,
    context: usize,
    length: usize,
}

impl KvCache {
    pub fn new(layers_times_heads: usize, context: usize, head_dim: usize) -> Self {
        Self {
            keys: Array3::zeros((layers_times_heads, context, head_dim)),
            values: Array3::zeros((layers_times_heads, context, head_dim)),
            context,
            length: 0,
        }
    }

    /// What actually runs out of memory in production.
    ///
    /// Linear in batch times context, so serving capacity is a function of
    /// traffic shape rather than of the model - and it is usually this rather
    /// than the weights that exhausts the device.
    pub fn bytes(&self) -> usize {
        (self.keys.len() + self.values.len()) * std::mem::size_of::<f32>()
    }

    pub fn write(&mut self, slot: usize, key: ArrayView1<'_, f32>, value: ArrayView1<'_, f32>) {
        self.keys.slice_mut(s![slot, self.length, ..]).assign(&key);
        self.values.slice_mut(s![slot, self.length, ..]).assign(&value);
    }

    /// Views over the whole history - views, not copies, so the attention
    /// product reads straight out of the slab and nothing is duplicated.
    pub fn history(&self, slot: usize) -> (ArrayView2<'_, f32>, ArrayView2<'_, f32>) {
        (
            self.keys.slice(s![slot, ..self.length, ..]),
            self.values.slice(s![slot, ..self.length, ..]),
        )
    }

    /// Advances once per TOKEN, not once per layer: every layer writes at the
    /// same position, so the caller advances after the full stack.
    pub fn advance(&mut self) {
        self.length += 1;
    }

    pub fn length(&self) -> usize {
        self.length
    }

    pub fn full(&self) -> bool {
        self.length >= self.context
    }

    /// Reuse the allocation across requests rather than reallocating.
    pub fn reset(&mut self) {
        self.length = 0;
    }
}

/// One new query against the whole cached history.
///
/// No causal mask is needed here, and that is the point: the cache contains
/// only positions up to and including the current one, so causality is
/// enforced by what is IN the cache rather than by masking a full matrix. That
/// removes both the mask and the wasted computation behind it.
///
/// One new row of attention per token rather than a full quadratic matrix -
/// this is the O(n^3) to O(n^2) change.
pub fn cached_attention(
    query: ArrayView1<'_, f32>,
    keys: ArrayView2<'_, f32>,
    values: ArrayView2<'_, f32>,
    scores: &mut Array1<f32>,
) -> Array1<f32> {
    let scale = 1.0 / (query.len() as f32).sqrt();

    // scores = K * q, one matrix-vector product over the contiguous history.
    scores.slice_mut(s![..keys.shape()[0]]).assign(&keys.dot(&query));
    let mut active = scores.slice_mut(s![..keys.shape()[0]]);
    active *= scale;

    // Stable softmax in place over the single query row.
    let peak = active.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    let mut total = 0.0f32;
    for value in active.iter_mut() {
        *value = (*value - peak).exp();
        total += *value;
    }
    let inverse = 1.0 / total;
    for value in active.iter_mut() {
        *value *= inverse;
    }

    // out = V^T * weights, the second product. Both read the slab directly.
    values.t().dot(&active)
}

/// Process the whole prompt in ONE parallel pass.
///
/// This half is compute-bound: every position is computed simultaneously
/// because the causal mask makes all n predictions valid at once, so the
/// arithmetic units are saturated and this is the phase where FLOP
/// optimization actually helps.
///
/// Note the shape: matrix-MATRIX, many tokens against the weights at once.
/// Confusing this phase with decode is the standard profiling mistake - they
/// sit on opposite sides of the memory-versus-compute boundary.
pub fn prefill_projection(
    hidden: ArrayView2<'_, f32>,
    weight: ArrayView2<'_, f32>,
) -> Array2<f32> {
    hidden.dot(&weight)
}

/// One product for all three projections of a single new token.
///
/// Note what this is: a matrix-VECTOR product, not matrix-matrix. During
/// decode there is one token, so every weight matrix is read to multiply
/// against a single vector - arithmetic intensity of one, which is the whole
/// memory-bound story in one line.
pub fn decode_projection(
    hidden: ArrayView1<'_, f32>,
    qkv_weight: ArrayView2<'_, f32>,
) -> Array1<f32> {
    qkv_weight.t().dot(&hidden)
}

/// Nucleus sampling, with the order applied deliberately.
///
/// Temperature is applied BEFORE truncation: it rescales the distribution, so
/// truncating first would change which tokens were eligible. Every
/// implementation follows this order and mixing it gives subtly different
/// output.
pub fn sample_token(
    logits: &mut Array1<f32>,
    temperature: f32,
    top_p: f32,
    draw: f32,
    order: &mut Vec<u32>,
) -> u32 {
    if temperature <= 0.0 {
        return logits
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.total_cmp(b.1))
            .map_or(0, |(index, _)| index as u32);
    }

    let peak = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max) / temperature;
    let mut total = 0.0f32;
    for value in logits.iter_mut() {
        *value = (*value / temperature - peak).exp();
        total += *value;
    }
    let inverse = 1.0 / total;
    for value in logits.iter_mut() {
        *value *= inverse;
    }

    // Capacity known exactly, reused across calls: a fresh index permutation
    // per token would be the largest allocation in the decode loop.
    order.clear();
    order.extend(0..logits.len() as u32);

    // select_nth_unstable then sort the prefix: the nucleus is almost always a
    // small prefix, so ordering the whole vocabulary is discarded work.
    let candidates = order.len().min(1024);
    order.select_nth_unstable_by(candidates - 1, |&a, &b| {
        logits[b as usize].total_cmp(&logits[a as usize])
    });
    order[..candidates].sort_unstable_by(|&a, &b| {
        logits[b as usize].total_cmp(&logits[a as usize])
    });

    let mut nucleus = 0.0f32;
    let mut kept = 0;
    while kept < candidates {
        nucleus += logits[order[kept] as usize];
        kept += 1;
        if nucleus >= top_p {
            break;
        }
    }

    let threshold = draw * nucleus;
    let mut cumulative = 0.0f32;
    for &token in &order[..kept] {
        cumulative += logits[token as usize];
        if cumulative >= threshold {
            return token;
        }
    }
    order[kept - 1]
}

/// FLOPs per byte read during decode. The diagnostic that matters.
///
/// One decode step reads every parameter and does roughly two FLOPs per
/// parameter per batch element, so intensity is about batch divided by
/// bytes-per-parameter. At batch one with 16-bit weights that is around one
/// FLOP per byte - against hardware that wants hundreds.
///
/// That gap IS the memory-bound problem, and it is why batching helps so much
/// here: the weight read is shared, so intensity scales linearly with batch
/// until the cache runs out of memory.
pub fn arithmetic_intensity(parameters: usize, batch: usize, bytes_per_parameter: usize) -> f64 {
    let flops = 2.0 * parameters as f64 * batch as f64;
    let bytes = parameters as f64 * bytes_per_parameter as f64;
    flops / bytes
}

/// Per-token log-probabilities for a whole batch, in parallel.
///
/// Exposed because the per-token likelihood is what makes this model usable as
/// an anomaly detector and as a scorer, not only as a generator - and it is
/// free, since the forward pass already computed it.
pub fn token_log_probabilities(
    logits: ArrayView2<'_, f32>,
    targets: &[u32],
) -> Vec<f32> {
    logits
        .axis_iter(Axis(0))
        .into_par_iter()
        .zip(targets.par_iter())
        .map(|(row, &target)| {
            let peak = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let total: f32 = row.iter().map(|value| (value - peak).exp()).sum();
            row[target as usize] - peak - total.ln()
        })
        .collect()
}
`,
        rationale:
          'This is the most consequential optimization in the reference and the correctness argument is worth stating precisely: the causal mask guarantees position i never attends to anything later, so when a new token arrives the keys and values for earlier positions cannot change — recomputing them is not an approximation being avoided but arithmetic whose result is already known. That turns generation from cubic in sequence length into quadratic. The cache layout puts the growing position axis second-to-last so each head’s history is contiguous, and the history accessor returns views rather than copies, which is what lets the attention product read straight out of the slab. No causal mask appears in the cached attention at all: causality is enforced by what is in the cache rather than by masking a full matrix, so both the mask and the computation behind it disappear. The contrast between the prefill and decode projections is deliberate and is the second point — prefill is matrix-matrix and saturates arithmetic, decode is matrix-vector and reads every weight for one token, which is why the arithmetic-intensity function matters more than any FLOP count. Sampling reuses its index permutation across calls and uses a partial selection, since a fresh allocation per token would be the largest cost in the decode loop.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Cached attention is two products over the contiguous key and value history, and prefill is a matrix-matrix product because many tokens are available at once.',
            tradeoff: 'Binds the build to a system BLAS, and during decode these are matrix-vector products that cannot approach peak — the operation is bandwidth-bound and no library tuning changes that, which is precisely the point the arithmetic-intensity helper makes.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Position as the second-to-last axis keeps each head’s history contiguous, and the history accessor hands out views so both attention products read the slab without a gathered copy.',
            tradeoff: 'That layout makes evicting or compacting one sequence out of a batched cache a strided scatter, which is exactly the problem a paged-attention scheme has to solve.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The sampling index permutation is cleared and refilled rather than reallocated, which matters because a fresh vocabulary-sized allocation per token would dominate the decode loop.',
            tradeoff: 'Reusing the buffer across calls makes the sampler stateful, so it cannot be shared between concurrent decode streams without one buffer per stream.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The softmax runs in place over the score slice, the temperature scaling rewrites the logits, and the cache is written by slice assignment rather than through an intermediate.',
            tradeoff: 'The raw logits are destroyed by the in-place scaling, so a diagnostic wanting the pre-temperature distribution — the natural thing to inspect when sampling looks wrong — needs an unfused pass.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Generation drops from O(n^3) to O(n^2) with the cache, and each decode step is then bandwidth-bound at an arithmetic intensity of roughly the batch size. Illustrative, not a measured benchmark: the cache is the only change here that alters the asymptotics, and everything after it is about bytes read rather than operations performed.',
      },
    },
  },
};
