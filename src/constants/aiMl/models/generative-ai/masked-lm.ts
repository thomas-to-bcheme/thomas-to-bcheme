import type { AiMlModel } from '../../types';

/**
 * Masked language model — the entry whose objective is deliberately NOT a
 * likelihood, and which is stronger for it at what it does.
 *
 * The direct counterpoint to the decoder-only entry: drop the causal mask,
 * gain bidirectional context, and lose the exact joint likelihood along with
 * the ability to generate. That trade is the whole content, and it is the
 * clearest case in this reference of giving up a mathematical property on
 * purpose.
 */
export const MASKED_LM: AiMlModel = {
  slug: 'masked-lm',
  name: 'Masked Language Model',
  aliases: ['BERT', 'MLM', 'Bidirectional encoder', 'RoBERTa', 'DeBERTa', 'Masked autoencoder'],
  category: 'generative-ai',
  group: 'autoregressive',
  kind: 'model',

  paradigms: ['self-supervised'],
  taskTypes: ['classification', 'sequence-modeling', 'dimensionality-reduction'],
  paradigmNote:
    'Self-supervised, and the label-manufacturing is more deliberate than in a causal model: the training loop chooses which positions to hide and then asks for them back, so the corruption process is a design decision rather than a consequence of the ordering. Notably absent from the task types is generation — that omission is the point of the entry rather than an oversight.',

  intuition:
    'A causal model sees only the left context because it has to: the chain rule imposes an order. If you are not going to generate, that constraint buys nothing — a classifier reading a sentence has the whole sentence. So hide fifteen percent of the tokens, let every position attend in both directions, and predict what was hidden. The representations are strictly better for understanding tasks because each token is informed by what follows it as well as what precedes it. What you give up is the ability to generate and the ability to compute a likelihood, and both losses follow from the same fact.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = -\\frac{1}{|\\mathcal{M}|}\\sum_{i \\in \\mathcal{M}} \\log p_\\theta\\bigl(x_i \\mid \\mathbf{x}_{\\setminus \\mathcal{M}}\\bigr)',
      symbols: [
        { symbol: '\\mathcal{M}', meaning: 'the masked positions — chosen by the training loop, typically fifteen percent of tokens' },
        { symbol: '\\mathbf{x}_{\\setminus \\mathcal{M}}', meaning: 'everything not masked, on BOTH sides; there is no causal restriction anywhere' },
        { symbol: 'p_\\theta(x_i \\mid \\cdot)', meaning: 'a conditional over the vocabulary — but these conditionals do NOT compose into a joint' },
        { symbol: '|\\mathcal{M}|', meaning: 'the count of masked positions; the loss is averaged over them and ignores the rest' },
      ],
    },
    reading:
      'Classified as a loss rather than a likelihood, and that classification is the central technical content of the entry. Each term looks like a log-probability, so the sum looks like a log-likelihood, and it is not one: the model produces the conditional distribution of each masked token given the rest, and a set of conditionals given different conditioning sets does not multiply into a joint. There is no factorization theorem here of the kind the chain rule provides for a causal model. Three things follow, and all three are usually stated as separate facts when they are one fact. The model cannot generate, because there is no ordering to generate along. It cannot score a sequence, because there is no density to evaluate — the pseudo-perplexity people compute is a heuristic and not a likelihood. And the loss value is not comparable to a causal model’s perplexity, so the two numbers should never be put on the same axis.',
  },

  optimization: {
    method: 'AdamW with a long warmup, then discarded: pretraining is done once and the practical work is fine-tuning',
    updateRule: {
      formula:
        '\\text{mask } 15\\% \\text{ of positions, then: } \\begin{cases} 80\\% & \\to \\texttt{[MASK]} \\\\ 10\\% & \\to \\text{random token} \\\\ 10\\% & \\to \\text{unchanged} \\end{cases}',
      symbols: [
        { symbol: '15\\%', meaning: 'the masking rate; a tuned constant balancing signal per example against how much context survives' },
        { symbol: '80\\%', meaning: 'replaced by a sentinel token that appears at pretraining and never at fine-tuning' },
        { symbol: '10\\% \\text{ random}', meaning: 'forces the model to check every position rather than trusting unmasked ones' },
        { symbol: '10\\% \\text{ unchanged}', meaning: 'the correction for the sentinel mismatch — the model must still predict a token that is already there' },
      ],
    },
    rationale:
      'The corruption recipe is the part worth understanding, because every clause in it is a correction for a problem the previous clause created. Masking fifteen percent is a balance: more gives more training signal per example but leaves less context to predict from, and less wastes forward passes on positions that contribute nothing to the loss. Then the eighty-ten-ten split addresses a mismatch the sentinel token introduces — that token appears during pretraining and never during fine-tuning, so a model that has only ever predicted at sentinel positions has learned to condition on something it will never see again. Replacing some masked positions with random tokens forces the model to evaluate every position rather than trusting unmasked ones, and leaving some unchanged forces it to predict tokens that are already correct. That is three mechanisms to patch one design decision, and it is a good illustration of how much of a method can be corrections rather than the core idea. The efficiency objection is the other thing to know: only fifteen percent of positions contribute to the loss, so the objective uses each forward pass far less than a causal model’s does, and replacement-detection objectives exist precisely to recover that.',
    hyperparameters: [
      { name: 'masking rate', role: 'Signal per example against surviving context. Fifteen percent is the convention; higher works with longer sequences', typicalRange: '15% to 40%' },
      { name: 'corruption split', role: 'The eighty-ten-ten recipe, correcting for the sentinel token that never appears at fine-tuning', typicalRange: '80/10/10' },
      { name: 'masking granularity', role: 'Token, whole-word or span. Span masking is consistently better because predicting one subword of a word is nearly free', typicalRange: 'token / word / span' },
      { name: 'sequence length', role: 'Attention is quadratic in it, and bidirectional attention has no cache to amortize anything', typicalRange: '128 to 512' },
      { name: 'fine-tuning learning rate', role: 'One to two orders of magnitude below pretraining; the pretraining rate destroys the representations', typicalRange: '1e-5 to 5e-5' },
      { name: 'pooling strategy', role: 'Sentinel token, mean or max over positions. Not interchangeable between checkpoints even when all are available', typicalRange: 'CLS / mean / max' },
    ],
    convergence:
      'Pretraining is stable and unremarkable, and almost nobody does it — the practical question is which checkpoint to fine-tune, and fine-tuning is where the failures are. The characteristic one is catastrophic forgetting from too high a learning rate: the pretraining rate destroys the representations within a few hundred steps, and the symptom is a model that trains to a plausible-looking loss while performing worse than a linear probe on frozen features. The second is instability on small datasets, where different seeds give materially different results and the published number is frequently the best of several runs. The third is subtler and worth naming: the masking rate and the corruption recipe are tuned constants, and the fifteen percent figure in particular has been shown to be far from optimal at longer sequence lengths — treating it as a law rather than a default leaves real performance unclaimed.',
    complexity:
      'Pretraining is O(n²·d) for attention plus O(n·d²) for projections, fully parallel across positions. Inference is one forward pass per sequence with no sequential structure at all, which is the operational advantage over a causal model — and there is no key-value cache because there is nothing to cache, since every position depends on every other and nothing is reused across calls.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Masked reconstruction as a pretraining objective rather than as the final task: patch the series, mask a fraction of the patches, and train an encoder to reconstruct them, then attach a supervised forecasting head. The pretraining uses unlabelled history, which in forecasting is abundant, and the head is what actually forecasts.',
        where: [
          'Pretraining a forecasting encoder on a large unlabelled panel before supervised fine-tuning',
          'Representation learning for downstream classification or clustering of series',
          'Imputation, where masked reconstruction is literally the task rather than a proxy for it',
          'Transfer across related panels, where the pretrained encoder carries structure the target lacks data for',
        ],
        why: 'The pretraining argument transfers cleanly: unlabelled series are abundant and masked reconstruction extracts structure from them without any labels, which is exactly the situation that made this objective valuable in language. Imputation is the one case where the objective and the task coincide, and it is the strongest fit here. But the model does not forecast — a bidirectional encoder has no mechanism for producing values beyond its input, so a supervised head is doing the forecasting and the pretraining is only initializing it. That distinction matters because it bounds what the pretraining can contribute, and because published gains from masked pretraining on forecasting benchmarks are frequently small once a properly tuned supervised baseline is included.',
        featurization: [
          'Patch the series before masking; masking individual timesteps is nearly free to predict from neighbours and teaches almost nothing',
          'Mask contiguous spans rather than scattered points, for the same reason span masking beats token masking in language',
          'Normalize per window, and keep the scaler with the model as for any series encoder',
          'Fine-tune the head with a much lower learning rate than pretraining used, or the representations are destroyed',
        ],
        evaluation:
          'Rolling-origin backtesting of the fine-tuned model against a supervised model of the same architecture trained from scratch — that comparison isolates what the pretraining contributed and it is frequently less than claimed. For imputation, reconstruction error on held-out masked spans directly.',
        pitfalls: [
          'Expecting the encoder to forecast; a supervised head does that and the pretraining only initializes it',
          'Masking individual timesteps, which are trivially interpolable and teach nothing',
          'Fine-tuning at the pretraining learning rate and destroying the representations',
          'Omitting the from-scratch baseline, so the pretraining benefit is never actually measured',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'There is no likelihood to threshold. The model produces the conditional distribution of a masked token given the rest, and a set of conditionals over different conditioning sets does not compose into a joint density — so there is no probability of a sequence to compute and nothing to call surprising. The pseudo-perplexity that is sometimes reported requires one forward pass per position and is a heuristic rather than a likelihood, and it is not comparable to a causal model’s perplexity; for likelihood-based detection the decoder-only entry is the correct tool.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Two separate optimization stories. The corruption recipe is a tuned design where each clause corrects a problem created by the previous one, which makes it a good study in how much of a method can be patches rather than core idea. And the pretrain-then-fine-tune structure is a compute-allocation decision: pretraining is expensive and amortized across every downstream task, fine-tuning is cheap and per-task, and the split between them is the actual choice.',
        where: [
          'Masking rate as an explicit trade between signal per example and surviving context',
          'The corruption recipe as a chain of corrections, each addressing a flaw introduced by the last',
          'Pretrain-then-fine-tune as amortization: one expensive run serving many cheap adaptations',
          'Parameter-efficient fine-tuning, capturing most of the benefit at a fraction of the parameters',
        ],
        why: 'Worth studying for the sample-efficiency argument, which is sharper here than almost anywhere else in this reference. Only the masked positions contribute to the loss, so at a fifteen percent rate the objective extracts signal from fifteen percent of a forward pass it paid for in full — a causal model gets a prediction at every position. That inefficiency is measurable, it motivated replacement-detection objectives that train on every position instead, and it is the clearest case here of an objective being improved by changing what it asks for rather than how it is optimized. The other transferable point is that the fifteen percent figure has been shown to be far from optimal at longer sequences, which is a reminder that a widely copied constant is not a law.',
        featurization: [
          'Treat the masking rate as a tunable rather than as a constant; fifteen percent is a default from one paper at one sequence length',
          'Mask spans rather than tokens, since predicting one subword of a known word is nearly free',
          'Fine-tune at one to two orders of magnitude below the pretraining learning rate',
          'Prefer parameter-efficient adaptation where the task set is large, since full fine-tuning stores a whole model per task',
        ],
        evaluation:
          'Sweep the masking rate on the target sequence length rather than inheriting it, and measure downstream task performance rather than pretraining loss — the two diverge, and pretraining loss is not the objective. Compare full against parameter-efficient fine-tuning at matched task performance to see what the extra parameters bought.',
        pitfalls: [
          'Treating fifteen percent as optimal when it is a default that does not transfer across sequence lengths',
          'Optimizing pretraining loss rather than downstream performance, which is what actually matters',
          'Full fine-tuning for every task, which stores a complete model per task for a marginal gain',
          'Comparing masked-model loss against causal-model perplexity, which are different quantities',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Pretrain a bidirectional encoder on a large corpus, then attach a task head and fine-tune. For classification the pooled representation feeds a linear layer; for token-level tasks each position feeds its own classifier; for retrieval the representations are used directly as embeddings.',
        where: [
          'Text classification at high volume, where a small fine-tuned encoder beats a large generative model on both accuracy and cost',
          'Token-level tasks — named-entity recognition, part-of-speech tagging, extraction — where bidirectional context is decisive',
          'Sentence and passage embeddings for retrieval and similarity',
          'Extractive question answering, where the answer is a span in the input rather than generated text',
        ],
        why: 'For understanding tasks this remains the right choice and the reasoning is structural rather than historical. Bidirectional context genuinely helps when the whole input is available, which for classification it always is. Inference is a single forward pass with no sequential generation, so throughput is orders of magnitude above a generative model. And the models are small enough to fine-tune and serve cheaply. Generative models have absorbed much of this territory through prompting, and the honest comparison is that they are more convenient and considerably more expensive — on a single high-volume classification task a fine-tuned encoder usually wins on accuracy as well as cost, and that is worth checking rather than assuming.',
        featurization: [
          'Match the tokenizer to the checkpoint exactly; a different one produces different subwords and degrades everything silently',
          'Use the pooling the checkpoint was trained for — sentinel-token and mean pooling are not interchangeable',
          'Fine-tune at a low learning rate with a short warmup, since the pretraining rate destroys the representations',
          'Run several seeds on small datasets, where variance between runs is large enough to dominate any comparison',
        ],
        evaluation:
          'Task F1 or accuracy on a held-out split, averaged over several seeds rather than reported from the best run — fine-tuning variance on small datasets is large and single-run numbers are not reproducible. Compare against a prompted generative model at matched latency and cost, which is the comparison that reflects the real alternative.',
        pitfalls: [
          'A tokenizer mismatch with the checkpoint, which degrades everything with no error',
          'Fine-tuning at the pretraining learning rate and forgetting the pretraining',
          'Reporting the best of several seeds, which is not reproducible',
          'Using a large generative model for a task a small encoder handles better and far more cheaply',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'Masked autoencoding: divide the image into patches, hide most of them — far more than in language — and reconstruct the missing pixels from the visible ones. Because images are spatially redundant, a high masking ratio is necessary to make the task hard enough to be informative, and it also makes the encoder cheap since it only processes the visible patches.',
        where: [
          'Self-supervised pretraining of vision encoders without labels',
          'Pretraining for dense prediction, where the reconstruction objective aligns with spatial detail',
          'Domains with abundant unlabelled imagery and expensive annotation, such as medical or satellite data',
          'Initializing an encoder for a downstream task with too few labels to train from scratch',
        ],
        why: 'The masking-ratio contrast with language is the instructive part: language needs fifteen percent and images need seventy-five or more, because a missing patch is largely inferable from its neighbours while a missing word frequently is not. That difference is a statement about redundancy in the two modalities rather than a tuning detail. The efficiency consequence is large and favourable — the encoder sees only the visible quarter of patches, so pretraining is several times cheaper than a comparable contrastive method. Against it: the learned features are reconstruction-oriented, so they transfer better to dense tasks than to linear classification, where contrastive pretraining remains stronger. Which objective to prefer depends on the downstream task rather than on general quality.',
        featurization: [
          'Mask aggressively — seventy-five percent or more, since images are redundant and a low ratio makes the task trivial',
          'Feed only the visible patches to the encoder, which is where most of the cost saving comes from',
          'Normalize the reconstruction target per patch, which measurably improves the learned features',
          'Choose the objective for the downstream task: masked reconstruction for dense prediction, contrastive for linear classification',
        ],
        evaluation:
          'Fine-tuning and linear-probe performance reported separately, because they rank pretraining objectives differently and masked reconstruction looks much worse under linear probing than it performs after fine-tuning. Compare against a contrastive baseline at matched pretraining compute.',
        pitfalls: [
          'A low masking ratio making the task trivially solvable by interpolation',
          'Judging the method by linear probing, which understates it relative to fine-tuning',
          'Feeding masked patches to the encoder, which discards the main efficiency gain',
          'Expecting language-style masking ratios to transfer, when the redundancy is entirely different',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Pretraining is expensive and done once by someone else — the practical decision is which checkpoint to start from. Fine-tuning is minutes to hours on a single accelerator, and parameter-efficient methods reduce it further, which makes this among the cheapest routes in this reference to a strong task-specific model.',
    inferenceProfile:
      'One forward pass per sequence, fully parallel across positions, with no sequential generation and no cache. That combination gives throughput orders of magnitude above a generative model on the same hardware, and it is the strongest remaining operational argument for the architecture.',
    retrainingCadence:
      'The encoder is replaced rather than retrained. Task heads are retrained whenever the label distribution moves, which is cheap and should be frequent.',
    driftAndMonitoring: [
      'Track the rate of out-of-vocabulary or heavily-subworded inputs, which indicates the tokenizer no longer matches the domain',
      'Watch per-class performance rather than the aggregate, since drift appears in a few classes long before the average moves',
      'Monitor input length against the pretrained maximum, because truncation is silent and removes the end of the text',
      'Compare against a frozen-feature linear probe periodically — if fine-tuning is not beating it, the fine-tuning has damaged the representations',
    ],
    productionGotchas: [
      'There is no likelihood. Do not build a scoring or anomaly-detection system on a masked model — the conditionals do not compose into a joint, and the pseudo-perplexity sometimes reported is a heuristic that also costs one forward pass per position',
      'The tokenizer is part of the model. A different one produces different subwords and degrades everything with no error anywhere',
      'Pooling strategy is part of the model. Sentinel-token and mean pooling are not interchangeable, even when a checkpoint exposes both',
      'Fine-tuning at the pretraining learning rate destroys the representations within a few hundred steps, and the symptom is a plausible loss curve with poor performance',
      'The sequence length is a hard maximum and truncation removes the end of the text, which for classification is frequently where the conclusion is',
      'Fine-tuning variance on small datasets is large. A single-seed result is not reproducible and should not be reported as one',
    ],
  },

  assumptions: [
    'The whole input is available at inference, which is what makes bidirectional context legitimate',
    'Generation is not required — the objective provides no mechanism for it and no ordering to generate along',
    'A likelihood is not required, since the conditionals do not compose into a joint density',
    'The input fits inside the pretrained sequence length, which is a hard maximum',
    'The pretraining domain is close enough to the target that the representations transfer, which the tokenizer largely determines',
  ],

  pros: [
    {
      point: 'Bidirectional context, which is free when you are not generating',
      context:
        'Every token is informed by what follows as well as what precedes, and for classification the whole input is always available — so the causal restriction buys nothing and dropping it costs nothing that matters.',
    },
    {
      point: 'One parallel forward pass, no sequential generation',
      context:
        'Throughput orders of magnitude above a generative model on the same hardware, with no cache and no per-token loop. The strongest remaining operational argument for the architecture.',
    },
    {
      point: 'Small enough to fine-tune and serve cheaply',
      context:
        'Minutes to hours on one accelerator for a strong task-specific model. On a single high-volume classification task this beats a prompted large model on accuracy as well as cost, which is worth checking rather than assuming.',
    },
    {
      point: 'Masked reconstruction transfers across modalities',
      context:
        'The same objective pretrains vision encoders, with a masking ratio five times higher because images are far more redundant. That contrast is itself informative about the modalities.',
    },
  ],

  cons: [
    {
      point: 'No joint likelihood, and therefore no scoring',
      context:
        'Conditionals over different conditioning sets do not multiply into a density. This is the central limitation and it is the same fact that prevents generation — the pseudo-perplexity sometimes reported is a heuristic, not a likelihood.',
    },
    {
      point: 'Cannot generate',
      context:
        'There is no ordering to generate along. For any task requiring produced text the decoder-only architecture is the only option, which is why generative models absorbed so much of this territory.',
    },
    {
      point: 'Sample-inefficient by construction',
      context:
        'Only the masked positions contribute to the loss, so fifteen percent of a fully-paid forward pass produces signal. Measurable, and the direct motivation for replacement-detection objectives that train on every position.',
    },
    {
      point: 'The sentinel token creates a pretrain-to-fine-tune mismatch',
      context:
        'It appears during pretraining and never afterwards, which the eighty-ten-ten recipe patches rather than solves. Three mechanisms correcting one design decision is a lot of machinery for a detail.',
    },
    {
      point: 'Fine-tuning is unstable on small datasets',
      context:
        'Different seeds give materially different results, so single-run numbers are not reproducible and published ones are frequently the best of several. This affects how much any small-data comparison should be believed.',
    },
  ],

  relatedSlugs: ['decoder-only-lm', 'transformer', 'contrastive-embeddings', 'autoencoder', 'vision-transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Masked language model, transcribed from the objective.

No ML library. Bidirectional self-attention with NO causal mask -- that
single omission relative to a decoder-only model is the whole difference,
and everything else follows from it: no generation, no likelihood, and
better representations for anything that reads a complete input.

The loss averages log p(x_i | x_not-masked) over the masked positions
only. It looks like a log-likelihood and is not one: each term conditions
on a different set, and conditionals over different conditioning sets do
not multiply into a joint.
"""

import math
import random


def softmax_rows(scores):
    """Row-wise softmax with the max subtracted for stability."""
    out = []
    for row in scores:
        top = max(row)
        exps = [math.exp(value - top) for value in row]
        total = sum(exps)
        out.append([value / total for value in exps])
    return out


def layer_norm(vector, gamma, beta, eps=1e-5):
    width = len(vector)
    mean = sum(vector) / width
    var = sum((value - mean) ** 2 for value in vector) / width
    scale = 1.0 / math.sqrt(var + eps)
    return [gamma[i] * (vector[i] - mean) * scale + beta[i] for i in range(width)]


def matvec(matrix, vector):
    return [sum(row[i] * vector[i] for i in range(len(vector))) for row in matrix]


def bidirectional_attention(hidden, w_q, w_k, w_v, w_o):
    """Self-attention over the full sequence, both directions.

    Compare against a causal model: identical arithmetic except that the
    decoder zeroes every score at j > i. Here nothing is zeroed. Position
    3 sees position 7. That is the entire architectural difference.
    """
    n_positions = len(hidden)
    width = len(hidden[0])

    queries = [matvec(w_q, hidden[pos]) for pos in range(n_positions)]
    keys = [matvec(w_k, hidden[pos]) for pos in range(n_positions)]
    values = [matvec(w_v, hidden[pos]) for pos in range(n_positions)]

    inv_sqrt_d = 1.0 / math.sqrt(width)
    scores = []
    for query_pos in range(n_positions):
        row = []
        for key_pos in range(n_positions):
            # No mask. A causal model would append -inf when key_pos > query_pos.
            dot = sum(queries[query_pos][k] * keys[key_pos][k] for k in range(width))
            row.append(dot * inv_sqrt_d)
        scores.append(row)

    weights = softmax_rows(scores)

    context = []
    for query_pos in range(n_positions):
        mixed = [0.0] * width
        for key_pos in range(n_positions):
            weight = weights[query_pos][key_pos]
            for k in range(width):
                mixed[k] += weight * values[key_pos][k]
        context.append(matvec(w_o, mixed))
    return context


def gelu(value):
    """The activation the original encoder used; tanh approximation."""
    inner = math.sqrt(2.0 / math.pi) * (value + 0.044715 * value ** 3)
    return 0.5 * value * (1.0 + math.tanh(inner))


def feed_forward(vector, w_in, w_out):
    hidden = [gelu(value) for value in matvec(w_in, vector)]
    return matvec(w_out, hidden)


def encode(token_ids, params):
    """Run the encoder stack. Every position attends to every position."""
    hidden = [
        [
            params["token_embed"][token_id][k] + params["pos_embed"][pos][k]
            for k in range(params["width"])
        ]
        for pos, token_id in enumerate(token_ids)
    ]

    for layer in params["layers"]:
        attended = bidirectional_attention(
            hidden, layer["w_q"], layer["w_k"], layer["w_v"], layer["w_o"]
        )
        hidden = [
            layer_norm(
                [hidden[pos][k] + attended[pos][k] for k in range(params["width"])],
                layer["ln1_gamma"],
                layer["ln1_beta"],
            )
            for pos in range(len(hidden))
        ]
        transformed = [
            feed_forward(hidden[pos], layer["w_in"], layer["w_out"])
            for pos in range(len(hidden))
        ]
        hidden = [
            layer_norm(
                [hidden[pos][k] + transformed[pos][k] for k in range(params["width"])],
                layer["ln2_gamma"],
                layer["ln2_beta"],
            )
            for pos in range(len(hidden))
        ]
    return hidden


def corrupt(token_ids, vocab_size, mask_token_id, rate=0.15, rng=None):
    """The 80/10/10 recipe, written out clause by clause.

    Each clause corrects a problem the previous one created:

      - masking at all gives the model something to predict
      - but the sentinel token appears at pretraining and never at
        fine-tuning, so a model that only ever predicts at sentinel
        positions has learned to condition on something it will not see
      - so 10% of chosen positions get a RANDOM token, forcing the model
        to evaluate every position rather than trusting unmasked ones
      - and 10% are LEFT ALONE, forcing it to predict a token that is
        already sitting there correctly

    Three mechanisms patching one design decision. Worth noticing how
    much of a published method can be corrections rather than core idea.
    """
    rng = rng or random.Random(0)
    corrupted = list(token_ids)
    targets = {}

    for pos, original in enumerate(token_ids):
        if rng.random() >= rate:
            continue
        targets[pos] = original
        draw = rng.random()
        if draw < 0.8:
            corrupted[pos] = mask_token_id
        elif draw < 0.9:
            corrupted[pos] = rng.randrange(vocab_size)
        # else: leave it unchanged -- deliberately, see docstring.

    return corrupted, targets


def masked_loss(token_ids, params, mask_token_id, rng=None):
    """Average negative log p(x_i | rest) over masked positions only.

    Note the denominator: len(targets), not len(token_ids). Roughly 85%
    of the positions we just paid a full forward pass for contribute
    nothing. That inefficiency is real, it is measurable, and it is the
    direct motivation for replacement-detection objectives that train on
    every position instead.
    """
    vocab_size = len(params["token_embed"])
    corrupted, targets = corrupt(token_ids, vocab_size, mask_token_id, rng=rng)
    if not targets:
        return 0.0

    hidden = encode(corrupted, params)

    total = 0.0
    for pos, target_id in targets.items():
        logits = matvec(params["head"], hidden[pos])
        top = max(logits)
        log_z = top + math.log(sum(math.exp(value - top) for value in logits))
        total += log_z - logits[target_id]

    return total / len(targets)


def fill_mask(token_ids, params, mask_token_id, top_k=5):
    """Predict the tokens at sentinel positions.

    This is the model's only native inference mode. It is NOT generation:
    the positions are fixed, the length is fixed, and filling several
    masks jointly would require an ordering the model does not have.
    """
    hidden = encode(token_ids, params)
    predictions = {}
    for pos, token_id in enumerate(token_ids):
        if token_id != mask_token_id:
            continue
        logits = matvec(params["head"], hidden[pos])
        ranked = sorted(range(len(logits)), key=lambda idx: -logits[idx])
        predictions[pos] = ranked[:top_k]
    return predictions
`,
        profile:
          'Every position pays a full vocabulary projection and only the masked fifteen percent are read, so the head alone is O(n·d·V) for O(rate·n·d·V) of useful work. Illustrative, not a measured benchmark: at a 30k vocabulary that wasted projection is the single largest avoidable cost in the file.',
      },
      'make-it-right': {
        rationale:
          'The corruption recipe becomes a frozen dataclass with validated proportions rather than three magic constants inside a branch, so the policy is inspectable and the eighty-ten-ten split cannot silently drift. The tokenizer contract — vocabulary size, sentinel id, maximum length — is checked at the constructor boundary, since a tokenizer mismatch is the failure that degrades everything with no error anywhere. Specific exceptions distinguish the failures that actually occur in production: truncation that would silently discard the end of the text, a sentinel id outside the vocabulary, and an attempt to use the model as though it had a likelihood.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""Masked language model with an explicit corruption policy.

The design point: make the 80/10/10 recipe a validated object rather than
three constants buried in a branch, and make the tokenizer contract
checkable, since a tokenizer mismatch is the failure mode that degrades
everything with no error anywhere.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Mapping, Sequence

import numpy as np
from numpy.typing import NDArray

EPSILON: Final[float] = 1e-5


class TokenizerMismatch(ValueError):
    """A token id falls outside the vocabulary the model was trained on.

    Almost always means the tokenizer does not match the checkpoint. The
    silent version of this bug -- ids that happen to be in range but mean
    different subwords -- cannot be caught here, which is why the
    tokenizer must be pinned alongside the weights.
    """


class SequenceTooLong(ValueError):
    """Input exceeds the pretrained maximum position count.

    Raised rather than truncated. Truncation is silent and removes the END
    of the text, which for classification is frequently where the
    conclusion sits.
    """


class NoMaskedPositions(ValueError):
    """Corruption selected nothing, so the loss has no terms.

    Happens on very short sequences at a low masking rate. Averaging over
    an empty set would produce a NaN that propagates into the gradient.
    """


class LikelihoodUnavailable(NotImplementedError):
    """The caller asked for a sequence probability. There isn't one.

    The model gives p(x_i | x_not-masked) for a masked position. Those
    conditionals are over different conditioning sets and do not multiply
    into a joint density. Pseudo-perplexity is a heuristic requiring one
    forward pass per position, and it is not comparable to a causal
    model's perplexity. Use a decoder-only model for scoring.
    """


@dataclass(frozen=True, slots=True)
class CorruptionPolicy:
    """How positions are chosen and what replaces them.

    Frozen because it is part of the pretraining contract: changing the
    rate mid-run changes the objective. The proportions are validated so
    the recipe cannot drift into a state where a fraction is implicitly
    negative.
    """

    rate: float = 0.15
    prob_sentinel: float = 0.8
    prob_random: float = 0.1
    span_length: int = 1

    def __post_init__(self) -> None:
        if not 0.0 < self.rate < 1.0:
            raise ValueError(f"masking rate must be in (0, 1), got {self.rate}")
        if self.prob_sentinel + self.prob_random > 1.0:
            raise ValueError(
                "sentinel and random proportions exceed 1.0: "
                f"{self.prob_sentinel} + {self.prob_random}"
            )
        if self.span_length < 1:
            raise ValueError(f"span_length must be >= 1, got {self.span_length}")

    @property
    def prob_unchanged(self) -> float:
        """The remainder: positions selected but left as they are."""
        return 1.0 - self.prob_sentinel - self.prob_random


@dataclass(frozen=True, slots=True)
class TokenizerContract:
    """What the checkpoint expects. Validated, because mismatches are silent."""

    vocab_size: int
    sentinel_id: int
    max_positions: int

    def __post_init__(self) -> None:
        if not 0 <= self.sentinel_id < self.vocab_size:
            raise ValueError(
                f"sentinel_id {self.sentinel_id} outside vocabulary of "
                f"{self.vocab_size}"
            )

    def validate(self, token_ids: Sequence[int]) -> None:
        """Guard clauses, cheapest first."""
        if len(token_ids) == 0:
            raise ValueError("empty sequence")
        if len(token_ids) > self.max_positions:
            raise SequenceTooLong(
                f"sequence of {len(token_ids)} exceeds pretrained maximum "
                f"{self.max_positions}; truncate deliberately, not implicitly"
            )
        out_of_range = [tid for tid in token_ids if not 0 <= tid < self.vocab_size]
        if out_of_range:
            raise TokenizerMismatch(
                f"{len(out_of_range)} token ids outside vocabulary "
                f"(first: {out_of_range[0]}, vocab_size: {self.vocab_size})"
            )


@dataclass(frozen=True, slots=True)
class MaskedBatch:
    """A corrupted sequence alongside what was hidden."""

    corrupted: NDArray[np.int32]
    positions: NDArray[np.int32]
    targets: NDArray[np.int32]

    def __len__(self) -> int:
        return int(self.positions.size)


class MaskedLanguageModel:
    """A bidirectional encoder with a masked-token head.

    Deliberately exposes no sampling or scoring method. Both would be
    lies: there is no ordering to generate along and no joint density to
    evaluate.
    """

    def __init__(
        self,
        weights: Mapping[str, NDArray[np.float32]],
        contract: TokenizerContract,
        policy: CorruptionPolicy | None = None,
    ) -> None:
        self._weights = weights
        self._contract = contract
        # No mutable default; a shared policy object across instances
        # would let one caller's tuning leak into another's.
        self._policy = policy if policy is not None else CorruptionPolicy()

    @property
    def policy(self) -> CorruptionPolicy:
        return self._policy

    def corrupt(
        self,
        token_ids: Sequence[int],
        rng: np.random.Generator,
    ) -> MaskedBatch:
        """Apply the corruption policy, masking whole spans if configured.

        Span masking is consistently better than token masking: predicting
        one subword of a word whose other subwords are visible is nearly
        free, so token-level masking spends much of its budget on
        positions that teach nothing.
        """
        self._contract.validate(token_ids)

        original = np.asarray(token_ids, dtype=np.int32)
        corrupted = original.copy()
        n_positions = original.size

        span = self._policy.span_length
        n_spans = max(1, int(round(n_positions * self._policy.rate / span)))
        starts = rng.choice(
            max(1, n_positions - span + 1), size=n_spans, replace=False
        )

        selected: list[int] = []
        for start in starts:
            selected.extend(range(int(start), min(int(start) + span, n_positions)))
        positions = np.unique(np.asarray(selected, dtype=np.int32))

        if positions.size == 0:
            raise NoMaskedPositions(
                f"rate {self._policy.rate} selected nothing from "
                f"{n_positions} positions"
            )

        draws = rng.random(positions.size)
        use_sentinel = draws < self._policy.prob_sentinel
        use_random = (draws >= self._policy.prob_sentinel) & (
            draws < self._policy.prob_sentinel + self._policy.prob_random
        )

        corrupted[positions[use_sentinel]] = self._contract.sentinel_id
        n_random = int(use_random.sum())
        if n_random > 0:
            corrupted[positions[use_random]] = rng.integers(
                0, self._contract.vocab_size, size=n_random, dtype=np.int32
            )
        # positions where neither flag is set keep their original token.

        return MaskedBatch(
            corrupted=corrupted,
            positions=positions,
            targets=original[positions],
        )

    def encode(self, token_ids: Sequence[int]) -> NDArray[np.float32]:
        """Bidirectional encoding. One pass, no cache, nothing sequential."""
        self._contract.validate(token_ids)

        ids = np.asarray(token_ids, dtype=np.int32)
        hidden = (
            self._weights["token_embed"][ids]
            + self._weights["pos_embed"][: ids.size]
        )

        n_layers = int(self._weights["n_layers"][0])
        for layer in range(n_layers):
            hidden = self._encoder_block(hidden, layer)
        return hidden

    def loss(self, batch: MaskedBatch) -> float:
        """Cross-entropy over masked positions only.

        Not a likelihood, and not comparable to a causal model's
        perplexity. Naming it \`loss\` rather than \`nll\` is deliberate.
        """
        if len(batch) == 0:
            raise NoMaskedPositions("batch has no masked positions")

        hidden = self.encode(batch.corrupted)[batch.positions]
        logits = hidden @ self._weights["head"].T

        shifted = logits - logits.max(axis=-1, keepdims=True)
        log_z = np.log(np.exp(shifted).sum(axis=-1))
        chosen = shifted[np.arange(batch.positions.size), batch.targets]
        return float(np.mean(log_z - chosen))

    def sequence_log_prob(self, token_ids: Sequence[int]) -> float:
        """Present only to fail loudly, because callers do ask for this."""
        raise LikelihoodUnavailable(
            f"a masked model has no joint density over the {len(token_ids)} "
            "tokens; the conditionals do not compose"
        )

    def _encoder_block(
        self, hidden: NDArray[np.float32], layer: int
    ) -> NDArray[np.float32]:
        queries = hidden @ self._weights[f"w_q_{layer}"].T
        keys = hidden @ self._weights[f"w_k_{layer}"].T
        values = hidden @ self._weights[f"w_v_{layer}"].T

        scores = queries @ keys.T / np.sqrt(hidden.shape[-1])
        # No causal mask. The one line a decoder-only model adds here is
        # the line that costs it the right half of every context.
        weights = _softmax(scores)
        attended = (weights @ values) @ self._weights[f"w_o_{layer}"].T

        hidden = _layer_norm(hidden + attended)
        inner = _gelu(hidden @ self._weights[f"w_in_{layer}"].T)
        return _layer_norm(hidden + inner @ self._weights[f"w_out_{layer}"].T)


def _softmax(scores: NDArray[np.float32]) -> NDArray[np.float32]:
    shifted = scores - scores.max(axis=-1, keepdims=True)
    exps = np.exp(shifted)
    return exps / exps.sum(axis=-1, keepdims=True)


def _layer_norm(hidden: NDArray[np.float32]) -> NDArray[np.float32]:
    mean = hidden.mean(axis=-1, keepdims=True)
    var = hidden.var(axis=-1, keepdims=True)
    return (hidden - mean) / np.sqrt(var + EPSILON)


def _gelu(hidden: NDArray[np.float32]) -> NDArray[np.float32]:
    inner = np.sqrt(2.0 / np.pi) * (hidden + 0.044715 * hidden ** 3)
    return 0.5 * hidden * (1.0 + np.tanh(inner))
`,
        profile:
          'Same asymptotics as the naive version — the vectorization is in the encoder, not the head, so the vocabulary projection still runs at every position. Illustrative, not a measured benchmark: what changed here is that a tokenizer mismatch or an over-length sequence now fails at the boundary instead of indexing out of bounds.',
      },
      'make-it-fast': {
        rationale:
          'The dominant waste in a naive implementation is computing vocabulary logits at every position when only fifteen percent of them enter the loss — the head projection is the single largest matmul in the model, so gathering the masked hidden states before projecting cuts that cost by roughly the inverse of the masking rate. Attention scores are computed once as a batched einsum across heads rather than per-head, layer-norm and the residual add are fused so intermediate arrays are never materialized, and the corruption mask is generated as one vectorized draw over the whole batch instead of a Python loop over positions. The loss is computed via a fused log-sum-exp rather than exponentiating and taking a log separately.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Attention and projections become batched einsums across heads and examples rather than per-position matvecs',
            tradeoff: 'The four-dimensional shape contract is no longer visible line by line; the shapes must be asserted rather than read off the loops',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Corruption for a whole batch is one vectorized draw instead of a loop over positions and sequences',
            tradeoff: 'Every sequence must be padded to a common length, and the padding has to be excluded from both attention and the loss or it silently contributes',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The head projection runs on gathered masked positions only, cutting the largest matmul by the inverse of the masking rate',
            tradeoff: 'Per-position logits are no longer available for inspection, so probing what the model predicts at unmasked positions requires a second, deliberate pass',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Gathering masked positions produces a compact contiguous block, so the head matmul hits BLAS at full efficiency',
            tradeoff: 'The gather itself copies, which costs bandwidth that only pays off when the masking rate is well below one',
          },
        ],
        code: `"""Masked language model with the head confined to masked positions.

The optimization that matters is structural rather than numeric. The
vocabulary projection is the largest matmul in the model -- width times
vocab, typically 768 x 30000 -- and a naive implementation runs it at
every position. Only the masked positions enter the loss. Gathering first
and projecting second cuts that cost by roughly 1/rate, which at the
conventional 15% is close to a 6x reduction on the single most expensive
operation.

Worth being precise about what this does and does not fix. It removes the
wasted projection. It does NOT remove the underlying sample-inefficiency
of the objective: the encoder still ran over every position and only 15%
of them produced a gradient signal. That is a property of the objective,
not of the implementation, and the only fix is a different objective.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Mapping

import numpy as np
from numpy.typing import NDArray

EPSILON: Final[float] = 1e-5
NEG_INF: Final[float] = -1e30


@dataclass(frozen=True, slots=True)
class BatchedMask:
    """Flat masked-position indices into a padded (batch, positions) block.

    Flat rather than per-sequence so the gather is one contiguous
    take() rather than a loop. row_of keeps the mapping back for anything
    that needs per-sequence attribution.
    """

    corrupted: NDArray[np.int32]
    attention_valid: NDArray[np.bool_]
    flat_positions: NDArray[np.int64]
    targets: NDArray[np.int32]
    row_of: NDArray[np.int32]


def corrupt_batch(
    token_ids: NDArray[np.int32],
    lengths: NDArray[np.int32],
    sentinel_id: int,
    vocab_size: int,
    rate: float,
    rng: np.random.Generator,
) -> BatchedMask:
    """Corrupt a whole padded batch in one vectorized pass.

    The subtlety is padding. A uniform draw over the padded rectangle
    would select padding positions, which would then contribute garbage
    targets to the loss. The valid mask is applied to the draw itself
    rather than filtered afterwards, so padding is never selected.
    """
    n_sequences, n_positions = token_ids.shape

    position_index = np.arange(n_positions, dtype=np.int32)[None, :]
    valid = position_index < lengths[:, None]

    chosen = (rng.random(token_ids.shape) < rate) & valid
    if not chosen.any():
        # Force one position per sequence rather than emitting a NaN loss.
        chosen[np.arange(n_sequences), np.maximum(lengths - 1, 0)] = True

    corrupted = token_ids.copy()
    draws = rng.random(token_ids.shape)

    use_sentinel = chosen & (draws < 0.8)
    use_random = chosen & (draws >= 0.8) & (draws < 0.9)
    # chosen & (draws >= 0.9) is left alone, deliberately.

    corrupted[use_sentinel] = sentinel_id
    n_random = int(use_random.sum())
    if n_random > 0:
        corrupted[use_random] = rng.integers(
            0, vocab_size, size=n_random, dtype=np.int32
        )

    rows, cols = np.nonzero(chosen)
    flat_positions = (rows.astype(np.int64) * n_positions + cols).astype(np.int64)

    return BatchedMask(
        corrupted=np.ascontiguousarray(corrupted, dtype=np.int32),
        attention_valid=valid,
        flat_positions=flat_positions,
        targets=token_ids[rows, cols].astype(np.int32),
        row_of=rows.astype(np.int32),
    )


def encode_batch(
    corrupted: NDArray[np.int32],
    attention_valid: NDArray[np.bool_],
    weights: Mapping[str, NDArray[np.float32]],
    n_heads: int,
) -> NDArray[np.float32]:
    """Batched bidirectional encoder.

    Shapes, asserted rather than inferable from loops:
        corrupted         (batch, positions)
        hidden            (batch, positions, width)
        heads             (batch, n_heads, positions, head_dim)
        scores            (batch, n_heads, positions, positions)
    """
    n_sequences, n_positions = corrupted.shape
    width = weights["token_embed"].shape[1]
    head_dim = width // n_heads
    inv_sqrt_d = np.float32(1.0 / np.sqrt(head_dim))

    hidden = (
        weights["token_embed"][corrupted]
        + weights["pos_embed"][None, :n_positions, :]
    ).astype(np.float32, copy=False)

    # Padding must be excluded from the KEY axis. Queries at padding
    # positions produce garbage, which is harmless only because those
    # positions are never gathered for the loss.
    key_block = np.where(attention_valid[:, None, None, :], 0.0, NEG_INF).astype(
        np.float32
    )

    n_layers = int(weights["n_layers"][0])
    for layer in range(n_layers):
        qkv = np.einsum(
            "bpw,thw->tbhp",
            hidden,
            weights[f"qkv_{layer}"].reshape(3, width, width),
            optimize=True,
        )
        queries, keys, values = (
            part.reshape(n_sequences, n_heads, head_dim, n_positions).transpose(
                0, 1, 3, 2
            )
            for part in qkv
        )

        scores = np.einsum("bhqd,bhkd->bhqk", queries, keys, optimize=True)
        scores *= inv_sqrt_d
        scores += key_block
        # Still no causal mask -- only the padding block.

        scores -= scores.max(axis=-1, keepdims=True)
        np.exp(scores, out=scores)
        scores /= scores.sum(axis=-1, keepdims=True)

        attended = np.einsum("bhqk,bhkd->bqhd", scores, values, optimize=True)
        attended = attended.reshape(n_sequences, n_positions, width)

        hidden = _fused_residual_norm(
            hidden, attended @ weights[f"w_o_{layer}"].T
        )
        inner = hidden @ weights[f"w_in_{layer}"].T
        _gelu_inplace(inner)
        hidden = _fused_residual_norm(hidden, inner @ weights[f"w_out_{layer}"].T)

    return hidden


def masked_loss(
    batch: BatchedMask,
    weights: Mapping[str, NDArray[np.float32]],
    n_heads: int,
) -> float:
    """Loss with the vocabulary projection confined to masked positions.

    This is the whole optimization. \`take\` on the flattened
    (batch * positions, width) view produces a compact contiguous block of
    exactly the masked hidden states, and the head runs on that block
    alone. At a 15% masking rate the largest matmul in the model shrinks
    by roughly 6x.
    """
    hidden = encode_batch(batch.corrupted, batch.attention_valid, weights, n_heads)
    width = hidden.shape[-1]

    gathered = np.ascontiguousarray(
        hidden.reshape(-1, width).take(batch.flat_positions, axis=0)
    )
    logits = gathered @ weights["head"].T

    # Fused log-sum-exp: subtract the max in place, then one log of one
    # sum rather than materializing exp(logits) as a separate array.
    logits -= logits.max(axis=-1, keepdims=True)
    log_z = np.log(np.exp(logits).sum(axis=-1))
    chosen = logits[np.arange(batch.targets.size), batch.targets]
    return float(np.mean(log_z - chosen))


def _fused_residual_norm(
    residual: NDArray[np.float32], delta: NDArray[np.float32]
) -> NDArray[np.float32]:
    """Add and normalize in place so neither intermediate is materialized."""
    delta += residual
    mean = delta.mean(axis=-1, keepdims=True)
    delta -= mean
    inv_std = 1.0 / np.sqrt(delta.var(axis=-1, keepdims=True) + EPSILON)
    delta *= inv_std
    return delta


def _gelu_inplace(hidden: NDArray[np.float32]) -> None:
    """GELU without allocating; the FFN intermediate is 4x width and hurts."""
    scratch = hidden * hidden
    scratch *= hidden
    scratch *= 0.044715
    scratch += hidden
    scratch *= np.float32(np.sqrt(2.0 / np.pi))
    np.tanh(scratch, out=scratch)
    scratch += 1.0
    hidden *= 0.5
    hidden *= scratch


def masking_rate_efficiency(rate: float, n_positions: int, width: int, vocab: int) -> dict[str, float]:
    """What the objective spends versus what it learns from.

    Illustrative arithmetic, not a benchmark. The ratio is the point: at
    the conventional 15%, the encoder processes every position and 85% of
    that work produces no gradient. Sweeping the rate on the actual
    sequence length is worth doing -- the 15% figure comes from one paper
    at one length and does not transfer.
    """
    encoder_flops = float(n_positions) * width * width * 12.0
    naive_head_flops = float(n_positions) * width * vocab * 2.0
    gathered_head_flops = naive_head_flops * rate
    return {
        "signal_fraction": rate,
        "head_flops_saved_fraction": 1.0 - rate,
        "head_share_of_naive": naive_head_flops / (encoder_flops + naive_head_flops),
        "head_share_of_gathered": gathered_head_flops
        / (encoder_flops + gathered_head_flops),
    }
`,
        profile:
          'The head drops to O(rate·n·d·V), roughly a sixfold reduction at the conventional fifteen percent rate, and the encoder itself is unchanged at O(n²·d + n·d²). Illustrative, not a measured benchmark: the encoder cost is the objective’s inefficiency rather than the implementation’s, and no amount of vectorizing removes it.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Masked language model, transcribed from the objective.
//
// Bidirectional self-attention with NO causal mask. The comparison with a
// decoder-only model is instructive: the arithmetic is identical except
// for one conditional that a decoder adds and an encoder omits. That one
// omission is what makes this model better at understanding and unable to
// generate.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

namespace mlm_naive {

struct Params {
    std::size_t vocab_size;
    std::size_t width;
    std::size_t n_layers;
    std::size_t sentinel_id;

    // Flat row-major storage, indexed by hand so the shapes stay visible.
    std::vector<float> token_embed;  // vocab_size x width
    std::vector<float> pos_embed;    // max_positions x width
    std::vector<float> w_q;          // n_layers x width x width
    std::vector<float> w_k;
    std::vector<float> w_v;
    std::vector<float> w_o;
    std::vector<float> w_in;         // n_layers x (4*width) x width
    std::vector<float> w_out;        // n_layers x width x (4*width)
    std::vector<float> head;         // vocab_size x width
};

// GELU, tanh approximation -- what the original encoder used.
float gelu(float value) {
    const float inner =
        std::sqrt(2.0F / 3.14159265F) * (value + 0.044715F * value * value * value);
    return 0.5F * value * (1.0F + std::tanh(inner));
}

void layer_norm(std::vector<float>& vector_in, std::size_t width) {
    float mean = 0.0F;
    for (std::size_t k = 0; k < width; ++k) {
        mean += vector_in[k];
    }
    mean /= static_cast<float>(width);

    float variance = 0.0F;
    for (std::size_t k = 0; k < width; ++k) {
        const float centred = vector_in[k] - mean;
        variance += centred * centred;
    }
    variance /= static_cast<float>(width);

    const float inv_std = 1.0F / std::sqrt(variance + 1e-5F);
    for (std::size_t k = 0; k < width; ++k) {
        vector_in[k] = (vector_in[k] - mean) * inv_std;
    }
}

void matvec(const std::vector<float>& matrix, std::size_t offset,
            std::size_t rows, std::size_t cols,
            const std::vector<float>& vector_in, std::size_t vector_offset,
            std::vector<float>& out, std::size_t out_offset) {
    for (std::size_t row = 0; row < rows; ++row) {
        float sum = 0.0F;
        for (std::size_t col = 0; col < cols; ++col) {
            sum += matrix[offset + row * cols + col] * vector_in[vector_offset + col];
        }
        out[out_offset + row] = sum;
    }
}

// Bidirectional attention. Every position attends to every position.
void attention_layer(std::vector<float>& hidden, std::size_t n_positions,
                     const Params& params, std::size_t layer) {
    const std::size_t width = params.width;
    const std::size_t plane = layer * width * width;

    std::vector<float> queries(n_positions * width, 0.0F);
    std::vector<float> keys(n_positions * width, 0.0F);
    std::vector<float> values(n_positions * width, 0.0F);

    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        matvec(params.w_q, plane, width, width, hidden, pos * width, queries, pos * width);
        matvec(params.w_k, plane, width, width, hidden, pos * width, keys, pos * width);
        matvec(params.w_v, plane, width, width, hidden, pos * width, values, pos * width);
    }

    const float inv_sqrt_d = 1.0F / std::sqrt(static_cast<float>(width));
    std::vector<float> context(n_positions * width, 0.0F);
    std::vector<float> scores(n_positions, 0.0F);

    for (std::size_t query_pos = 0; query_pos < n_positions; ++query_pos) {
        float top = -1e30F;
        for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
            // A causal model would skip every key_pos > query_pos here.
            // This model does not. That is the entire difference.
            float dot = 0.0F;
            for (std::size_t k = 0; k < width; ++k) {
                dot += queries[query_pos * width + k] * keys[key_pos * width + k];
            }
            scores[key_pos] = dot * inv_sqrt_d;
            if (scores[key_pos] > top) {
                top = scores[key_pos];
            }
        }

        float total = 0.0F;
        for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
            scores[key_pos] = std::exp(scores[key_pos] - top);
            total += scores[key_pos];
        }

        for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
            const float weight = scores[key_pos] / total;
            for (std::size_t k = 0; k < width; ++k) {
                context[query_pos * width + k] += weight * values[key_pos * width + k];
            }
        }
    }

    std::vector<float> projected(n_positions * width, 0.0F);
    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        matvec(params.w_o, plane, width, width, context, pos * width, projected, pos * width);
    }

    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        std::vector<float> residual(width, 0.0F);
        for (std::size_t k = 0; k < width; ++k) {
            residual[k] = hidden[pos * width + k] + projected[pos * width + k];
        }
        layer_norm(residual, width);
        for (std::size_t k = 0; k < width; ++k) {
            hidden[pos * width + k] = residual[k];
        }
    }
}

void feed_forward_layer(std::vector<float>& hidden, std::size_t n_positions,
                        const Params& params, std::size_t layer) {
    const std::size_t width = params.width;
    const std::size_t inner_width = 4 * width;
    const std::size_t in_plane = layer * inner_width * width;
    const std::size_t out_plane = layer * width * inner_width;

    std::vector<float> inner(inner_width, 0.0F);
    std::vector<float> projected(width, 0.0F);

    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        matvec(params.w_in, in_plane, inner_width, width, hidden, pos * width, inner, 0);
        for (std::size_t k = 0; k < inner_width; ++k) {
            inner[k] = gelu(inner[k]);
        }
        matvec(params.w_out, out_plane, width, inner_width, inner, 0, projected, 0);

        std::vector<float> residual(width, 0.0F);
        for (std::size_t k = 0; k < width; ++k) {
            residual[k] = hidden[pos * width + k] + projected[k];
        }
        layer_norm(residual, width);
        for (std::size_t k = 0; k < width; ++k) {
            hidden[pos * width + k] = residual[k];
        }
    }
}

std::vector<float> encode(const std::vector<std::size_t>& token_ids,
                          const Params& params) {
    const std::size_t n_positions = token_ids.size();
    const std::size_t width = params.width;

    std::vector<float> hidden(n_positions * width, 0.0F);
    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        for (std::size_t k = 0; k < width; ++k) {
            hidden[pos * width + k] =
                params.token_embed[token_ids[pos] * width + k] +
                params.pos_embed[pos * width + k];
        }
    }

    for (std::size_t layer = 0; layer < params.n_layers; ++layer) {
        attention_layer(hidden, n_positions, params, layer);
        feed_forward_layer(hidden, n_positions, params, layer);
    }
    return hidden;
}

struct Corrupted {
    std::vector<std::size_t> token_ids;
    std::vector<std::size_t> positions;
    std::vector<std::size_t> targets;
};

// The 80/10/10 recipe. Each clause corrects a problem the previous one
// created: masking gives something to predict, but the sentinel token
// never appears at fine-tuning, so some positions get a random token
// (forcing the model to check every position) and some are left alone
// (forcing it to predict a token that is already correct).
Corrupted corrupt(const std::vector<std::size_t>& token_ids, const Params& params,
                  float rate, std::mt19937& rng) {
    std::uniform_real_distribution<float> uniform(0.0F, 1.0F);
    std::uniform_int_distribution<std::size_t> vocab(0, params.vocab_size - 1);

    Corrupted out;
    out.token_ids = token_ids;

    for (std::size_t pos = 0; pos < token_ids.size(); ++pos) {
        if (uniform(rng) >= rate) {
            continue;
        }
        out.positions.push_back(pos);
        out.targets.push_back(token_ids[pos]);

        const float draw = uniform(rng);
        if (draw < 0.8F) {
            out.token_ids[pos] = params.sentinel_id;
        } else if (draw < 0.9F) {
            out.token_ids[pos] = vocab(rng);
        }
        // else: unchanged, deliberately.
    }
    return out;
}

// Average negative log p(x_i | rest) over the masked positions only.
// The denominator is the masked count, not the sequence length: roughly
// 85% of a fully-paid forward pass contributes nothing.
float masked_loss(const std::vector<std::size_t>& token_ids, const Params& params,
                  float rate, std::mt19937& rng) {
    const Corrupted corrupted = corrupt(token_ids, params, rate, rng);
    if (corrupted.positions.empty()) {
        return 0.0F;
    }

    const std::vector<float> hidden = encode(corrupted.token_ids, params);
    const std::size_t width = params.width;

    float total = 0.0F;
    std::vector<float> logits(params.vocab_size, 0.0F);

    for (std::size_t idx = 0; idx < corrupted.positions.size(); ++idx) {
        const std::size_t pos = corrupted.positions[idx];
        matvec(params.head, 0, params.vocab_size, width, hidden, pos * width, logits, 0);

        float top = -1e30F;
        for (std::size_t token = 0; token < params.vocab_size; ++token) {
            if (logits[token] > top) {
                top = logits[token];
            }
        }
        float sum_exp = 0.0F;
        for (std::size_t token = 0; token < params.vocab_size; ++token) {
            sum_exp += std::exp(logits[token] - top);
        }
        const float log_z = top + std::log(sum_exp);
        total += log_z - logits[corrupted.targets[idx]];
    }

    return total / static_cast<float>(corrupted.positions.size());
}

}  // namespace mlm_naive
`,
        profile:
          'Per-position matvecs throughout, so the encoder is memory-bound well below peak and the vocabulary head runs at every position. Illustrative, not a measured benchmark: this transcription exists to be read against the objective, and the structure of the waste is easier to see here than in the optimized version.',
      },
      'make-it-right': {
        rationale:
          'Every owned buffer becomes a std::vector held by the encoder, and every view into one becomes a std::span, so no function signature takes a pointer and a length that could disagree. The tokenizer contract — vocabulary size, sentinel id, maximum positions — is validated in the constructor before a single allocation, because a token id outside the vocabulary indexes the embedding table out of bounds and a sequence longer than the pretrained maximum walks off the position table. Const-correctness marks encode as non-mutating on the weights while the working buffers are mutable members, which makes the ownership boundary explicit rather than conventional.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        code: `// Masked language model with owned buffers and validated inputs.
//
// The design point is that the failures here are all bounds failures
// wearing different clothes: a token id outside the vocabulary indexes the
// embedding table out of bounds, a sequence longer than the pretrained
// maximum walks off the position table, and a sentinel id outside the
// vocabulary does both. Validating the contract once in the constructor
// converts all three into a thrown exception at the boundary.

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace mlm {

// A token id falls outside the vocabulary the checkpoint was trained on.
// Almost always a tokenizer mismatch. The silent version -- ids in range
// that mean different subwords -- cannot be caught here, which is why the
// tokenizer must be pinned with the weights.
class TokenizerMismatch : public std::invalid_argument {
public:
    explicit TokenizerMismatch(const std::string& what)
        : std::invalid_argument("tokenizer mismatch: " + what) {}
};

// Input exceeds the pretrained position count. Thrown rather than
// truncated: truncation is silent and removes the END of the text, which
// for classification is frequently where the conclusion sits.
class SequenceTooLong : public std::length_error {
public:
    explicit SequenceTooLong(const std::string& what)
        : std::length_error("sequence too long: " + what) {}
};

// The caller asked for a sequence probability. There isn't one: the
// conditionals are over different conditioning sets and do not multiply
// into a joint density.
class LikelihoodUnavailable : public std::logic_error {
public:
    explicit LikelihoodUnavailable(const std::string& what)
        : std::logic_error("no joint likelihood: " + what) {}
};

// Frozen once constructed; changing the rate mid-run changes the objective.
class CorruptionPolicy {
public:
    CorruptionPolicy(float rate, float prob_sentinel, float prob_random,
                     std::size_t span_length)
        : rate_(rate),
          prob_sentinel_(prob_sentinel),
          prob_random_(prob_random),
          span_length_(span_length) {
        if (rate <= 0.0F || rate >= 1.0F) {
            throw std::invalid_argument("masking rate must lie in (0, 1)");
        }
        if (prob_sentinel + prob_random > 1.0F) {
            throw std::invalid_argument("sentinel and random proportions exceed 1");
        }
        if (span_length == 0) {
            throw std::invalid_argument("span_length must be at least 1");
        }
    }

    CorruptionPolicy() : CorruptionPolicy(0.15F, 0.8F, 0.1F, 1) {}

    [[nodiscard]] float rate() const noexcept { return rate_; }
    [[nodiscard]] float prob_sentinel() const noexcept { return prob_sentinel_; }
    [[nodiscard]] float prob_random() const noexcept { return prob_random_; }
    [[nodiscard]] std::size_t span_length() const noexcept { return span_length_; }
    // The remainder: selected but left as they are.
    [[nodiscard]] float prob_unchanged() const noexcept {
        return 1.0F - prob_sentinel_ - prob_random_;
    }

private:
    float rate_;
    float prob_sentinel_;
    float prob_random_;
    std::size_t span_length_;
};

// What the checkpoint expects. Validated, because mismatches are silent.
class TokenizerContract {
public:
    TokenizerContract(std::size_t vocab_size, std::size_t sentinel_id,
                      std::size_t max_positions)
        : vocab_size_(vocab_size),
          sentinel_id_(sentinel_id),
          max_positions_(max_positions) {
        if (vocab_size == 0) {
            throw std::invalid_argument("empty vocabulary");
        }
        if (sentinel_id >= vocab_size) {
            throw TokenizerMismatch("sentinel id " + std::to_string(sentinel_id) +
                                    " outside vocabulary of " +
                                    std::to_string(vocab_size));
        }
    }

    // Fail fast, cheapest check first, before any allocation happens.
    void validate(std::span<const std::uint32_t> token_ids) const {
        if (token_ids.empty()) {
            throw std::invalid_argument("empty sequence");
        }
        if (token_ids.size() > max_positions_) {
            throw SequenceTooLong(std::to_string(token_ids.size()) +
                                  " exceeds pretrained maximum " +
                                  std::to_string(max_positions_) +
                                  "; truncate deliberately, not implicitly");
        }
        for (std::size_t pos = 0; pos < token_ids.size(); ++pos) {
            if (token_ids[pos] >= vocab_size_) {
                throw TokenizerMismatch("token id " + std::to_string(token_ids[pos]) +
                                        " at position " + std::to_string(pos) +
                                        " outside vocabulary of " +
                                        std::to_string(vocab_size_));
            }
        }
    }

    [[nodiscard]] std::size_t vocab_size() const noexcept { return vocab_size_; }
    [[nodiscard]] std::size_t sentinel_id() const noexcept { return sentinel_id_; }
    [[nodiscard]] std::size_t max_positions() const noexcept { return max_positions_; }

private:
    std::size_t vocab_size_;
    std::size_t sentinel_id_;
    std::size_t max_positions_;
};

// Every buffer is a vector member. Rule of zero: no destructor, no copy
// or move operators, nothing to leak.
class MaskedEncoder {
public:
    MaskedEncoder(TokenizerContract contract, std::size_t width,
                  std::size_t n_layers, std::size_t n_heads,
                  std::vector<float> weights, CorruptionPolicy policy = {})
        : contract_(contract),
          policy_(policy),
          width_(width),
          n_layers_(n_layers),
          n_heads_(n_heads),
          weights_(std::move(weights)) {
        if (width == 0 || n_heads == 0 || width % n_heads != 0) {
            throw std::invalid_argument("width must be a positive multiple of n_heads");
        }
        if (n_layers == 0) {
            throw std::invalid_argument("n_layers must be at least 1");
        }
        // Working buffers sized once for the pretrained maximum, so the
        // hot path never allocates.
        const std::size_t capacity = contract_.max_positions() * width_;
        hidden_.resize(capacity, 0.0F);
        scratch_.resize(capacity, 0.0F);
        queries_.resize(capacity, 0.0F);
        keys_.resize(capacity, 0.0F);
        values_.resize(capacity, 0.0F);
        scores_.resize(contract_.max_positions(), 0.0F);
    }

    // const on the weights; the working buffers are the mutable state.
    [[nodiscard]] std::span<const float> encode(
        std::span<const std::uint32_t> token_ids) {
        contract_.validate(token_ids);

        const std::size_t n_positions = token_ids.size();
        embed(token_ids);
        for (std::size_t layer = 0; layer < n_layers_; ++layer) {
            attention_block(n_positions, layer);
            feed_forward_block(n_positions, layer);
        }
        return std::span<const float>(hidden_.data(), n_positions * width_);
    }

    // Present only to fail loudly, because callers do ask for this.
    [[nodiscard]] float sequence_log_prob(
        std::span<const std::uint32_t> token_ids) const {
        throw LikelihoodUnavailable("the " + std::to_string(token_ids.size()) +
                                    " conditionals do not compose into a density; "
                                    "use a decoder-only model for scoring");
    }

    [[nodiscard]] const CorruptionPolicy& policy() const noexcept { return policy_; }

private:
    void embed(std::span<const std::uint32_t> token_ids) {
        const std::span<const float> token_embed = weight_view(kTokenEmbed);
        const std::span<const float> pos_embed = weight_view(kPosEmbed);
        for (std::size_t pos = 0; pos < token_ids.size(); ++pos) {
            const std::size_t row = static_cast<std::size_t>(token_ids[pos]) * width_;
            for (std::size_t k = 0; k < width_; ++k) {
                hidden_[pos * width_ + k] =
                    token_embed[row + k] + pos_embed[pos * width_ + k];
            }
        }
    }

    void attention_block(std::size_t n_positions, std::size_t layer) {
        project(n_positions, layer, kQuery, queries_);
        project(n_positions, layer, kKey, keys_);
        project(n_positions, layer, kValue, values_);

        const float inv_sqrt_d =
            1.0F / std::sqrt(static_cast<float>(width_ / n_heads_));
        std::span<float> context(scratch_.data(), n_positions * width_);
        std::fill(context.begin(), context.end(), 0.0F);

        for (std::size_t query_pos = 0; query_pos < n_positions; ++query_pos) {
            // No causal restriction: the key loop runs the full width.
            float top = -1e30F;
            for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                float dot = 0.0F;
                for (std::size_t k = 0; k < width_; ++k) {
                    dot += queries_[query_pos * width_ + k] *
                           keys_[key_pos * width_ + k];
                }
                scores_[key_pos] = dot * inv_sqrt_d;
                top = std::max(top, scores_[key_pos]);
            }

            float total = 0.0F;
            for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                scores_[key_pos] = std::exp(scores_[key_pos] - top);
                total += scores_[key_pos];
            }

            const float inv_total = 1.0F / total;
            for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                const float weight = scores_[key_pos] * inv_total;
                for (std::size_t k = 0; k < width_; ++k) {
                    context[query_pos * width_ + k] +=
                        weight * values_[key_pos * width_ + k];
                }
            }
        }

        add_projection_and_norm(context, n_positions, layer, kOutput);
    }

    void feed_forward_block(std::size_t n_positions, std::size_t layer) {
        const std::size_t inner_width = 4 * width_;
        std::vector<float> inner(inner_width, 0.0F);
        std::vector<float> projected(width_, 0.0F);

        const std::span<const float> w_in = weight_view(kFfIn, layer);
        const std::span<const float> w_out = weight_view(kFfOut, layer);

        for (std::size_t pos = 0; pos < n_positions; ++pos) {
            for (std::size_t row = 0; row < inner_width; ++row) {
                float sum = 0.0F;
                for (std::size_t k = 0; k < width_; ++k) {
                    sum += w_in[row * width_ + k] * hidden_[pos * width_ + k];
                }
                inner[row] = gelu(sum);
            }
            for (std::size_t row = 0; row < width_; ++row) {
                float sum = 0.0F;
                for (std::size_t k = 0; k < inner_width; ++k) {
                    sum += w_out[row * inner_width + k] * inner[k];
                }
                projected[row] = sum;
            }
            for (std::size_t k = 0; k < width_; ++k) {
                hidden_[pos * width_ + k] += projected[k];
            }
            normalize(std::span<float>(hidden_.data() + pos * width_, width_));
        }
    }

    void project(std::size_t n_positions, std::size_t layer, std::size_t which,
                 std::vector<float>& out) const {
        const std::span<const float> matrix = weight_view(which, layer);
        for (std::size_t pos = 0; pos < n_positions; ++pos) {
            for (std::size_t row = 0; row < width_; ++row) {
                float sum = 0.0F;
                for (std::size_t k = 0; k < width_; ++k) {
                    sum += matrix[row * width_ + k] * hidden_[pos * width_ + k];
                }
                out[pos * width_ + row] = sum;
            }
        }
    }

    void add_projection_and_norm(std::span<const float> context,
                                 std::size_t n_positions, std::size_t layer,
                                 std::size_t which) {
        const std::span<const float> matrix = weight_view(which, layer);
        for (std::size_t pos = 0; pos < n_positions; ++pos) {
            for (std::size_t row = 0; row < width_; ++row) {
                float sum = 0.0F;
                for (std::size_t k = 0; k < width_; ++k) {
                    sum += matrix[row * width_ + k] * context[pos * width_ + k];
                }
                hidden_[pos * width_ + row] += sum;
            }
            normalize(std::span<float>(hidden_.data() + pos * width_, width_));
        }
    }

    void normalize(std::span<float> vector_in) const {
        float mean = 0.0F;
        for (const float value : vector_in) {
            mean += value;
        }
        mean /= static_cast<float>(vector_in.size());

        float variance = 0.0F;
        for (const float value : vector_in) {
            const float centred = value - mean;
            variance += centred * centred;
        }
        variance /= static_cast<float>(vector_in.size());

        const float inv_std = 1.0F / std::sqrt(variance + 1e-5F);
        for (float& value : vector_in) {
            value = (value - mean) * inv_std;
        }
    }

    [[nodiscard]] static float gelu(float value) noexcept {
        const float inner = std::sqrt(2.0F / 3.14159265F) *
                            (value + 0.044715F * value * value * value);
        return 0.5F * value * (1.0F + std::tanh(inner));
    }

    // Offsets into the single weight blob, so the caller never holds a
    // raw pointer and a separate length.
    [[nodiscard]] std::span<const float> weight_view(std::size_t which,
                                                     std::size_t layer = 0) const {
        const std::size_t square = width_ * width_;
        const std::size_t inner = 4 * width_ * width_;
        std::size_t offset = 0;
        std::size_t extent = square;

        switch (which) {
            case kTokenEmbed:
                extent = contract_.vocab_size() * width_;
                break;
            case kPosEmbed:
                offset = contract_.vocab_size() * width_;
                extent = contract_.max_positions() * width_;
                break;
            default: {
                const std::size_t base = (contract_.vocab_size() +
                                          contract_.max_positions()) * width_;
                const std::size_t per_layer = 4 * square + 2 * inner;
                offset = base + layer * per_layer;
                if (which == kQuery) { extent = square; }
                if (which == kKey) { offset += square; extent = square; }
                if (which == kValue) { offset += 2 * square; extent = square; }
                if (which == kOutput) { offset += 3 * square; extent = square; }
                if (which == kFfIn) { offset += 4 * square; extent = inner; }
                if (which == kFfOut) { offset += 4 * square + inner; extent = inner; }
                break;
            }
        }
        return std::span<const float>(weights_.data() + offset, extent);
    }

    static constexpr std::size_t kTokenEmbed = 0;
    static constexpr std::size_t kPosEmbed = 1;
    static constexpr std::size_t kQuery = 2;
    static constexpr std::size_t kKey = 3;
    static constexpr std::size_t kValue = 4;
    static constexpr std::size_t kOutput = 5;
    static constexpr std::size_t kFfIn = 6;
    static constexpr std::size_t kFfOut = 7;

    const TokenizerContract contract_;
    const CorruptionPolicy policy_;
    const std::size_t width_;
    const std::size_t n_layers_;
    const std::size_t n_heads_;
    const std::vector<float> weights_;

    std::vector<float> hidden_;
    std::vector<float> scratch_;
    std::vector<float> queries_;
    std::vector<float> keys_;
    std::vector<float> values_;
    std::vector<float> scores_;
};

}  // namespace mlm
`,
        profile:
          'Unchanged arithmetic with the buffers sized once at construction, so the hot path no longer allocates per call. Illustrative, not a measured benchmark: the win is that a token id outside the vocabulary now throws at the boundary rather than reading past the embedding table.',
      },
      'make-it-fast': {
        rationale:
          'The largest matmul in the model is the vocabulary projection — width by vocabulary, typically 768 by 30000 — and the naive encoder runs it at every position when only the masked ones enter the loss. Gathering the masked hidden states into a compact contiguous block first turns that projection into a single GEMM over roughly fifteen percent of the rows. The per-position matvecs elsewhere become GEMMs over the whole sequence, which is the difference between a memory-bound loop and a compute-bound kernel, and the layer-norm is fused into the residual add so the intermediate is never written out. OpenMP parallelizes across sequences in a batch rather than across positions within one, because the inner loops are already handed to BLAS.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Projections and the vocabulary head become GEMM calls over the full sequence instead of per-position matvecs',
            tradeoff: 'A BLAS dependency with its own threading model, which must be reconciled with the OpenMP pool or the two oversubscribe the machine',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Gathered masked positions form a contiguous block, so the head GEMM streams rather than strides',
            tradeoff: 'The gather copies, costing bandwidth proportional to the masked count — worthwhile only while the masking rate stays well below one',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Residual add, layer-norm and GELU write once instead of materializing a separate array per step',
            tradeoff: 'The fused loops no longer read as the individual mathematical steps, so a numerical bug is harder to localize to one operation',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Sequences in a batch encode concurrently, which scales cleanly because they share nothing but the read-only weights',
            tradeoff: 'Each thread needs its own working buffers, so the memory footprint scales with thread count rather than staying fixed',
          },
        ],
        code: `// Masked language model with the vocabulary head confined to masked
// positions.
//
// The optimization that matters is structural. The head projection is
// width x vocab -- typically 768 x 30000 -- and it is by a wide margin the
// largest matmul in the model. A naive implementation runs it at every
// position. Only the masked positions enter the loss. Gathering first and
// projecting second shrinks it by roughly 1/rate: at the conventional 15%,
// close to 6x off the single most expensive operation.
//
// What this does NOT fix: the encoder still ran over every position, and
// only 15% of that work produced a gradient. That is the objective's
// sample-inefficiency, not the implementation's, and the only remedy is a
// different objective.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace mlm_fast {

constexpr float kEpsilon = 1e-5F;
constexpr float kNegInf = -1e30F;

struct Weights {
    std::size_t vocab_size;
    std::size_t width;
    std::size_t n_layers;
    std::size_t n_heads;
    std::size_t max_positions;

    const float* token_embed;  // vocab_size x width, row-major
    const float* pos_embed;    // max_positions x width
    const float* qkv;          // n_layers x (3*width) x width, fused
    const float* w_o;          // n_layers x width x width
    const float* w_in;         // n_layers x (4*width) x width
    const float* w_out;        // n_layers x width x (4*width)
    const float* head;         // vocab_size x width -- the expensive one
};

// Per-thread working set. Allocated once per thread rather than per call,
// which is the price of the OpenMP parallelism: footprint scales with
// thread count.
struct Workspace {
    std::vector<float> hidden;   // positions x width
    std::vector<float> qkv;      // positions x (3*width)
    std::vector<float> scores;   // n_heads x positions x positions
    std::vector<float> context;  // positions x width
    std::vector<float> inner;    // positions x (4*width)
    std::vector<float> gathered; // masked_count x width
    std::vector<float> logits;   // masked_count x vocab

    explicit Workspace(const Weights& weights, std::size_t max_masked) {
        const std::size_t positions = weights.max_positions;
        hidden.resize(positions * weights.width);
        qkv.resize(positions * 3 * weights.width);
        scores.resize(weights.n_heads * positions * positions);
        context.resize(positions * weights.width);
        inner.resize(positions * 4 * weights.width);
        gathered.resize(max_masked * weights.width);
        logits.resize(max_masked * weights.vocab_size);
    }
};

// Fused residual-add + layer-norm. One pass writes the result; the added
// array and the normalized array are never separate allocations.
void fused_residual_norm(float* __restrict hidden, const float* __restrict delta,
                         std::size_t n_positions, std::size_t width) {
    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        float* row = hidden + pos * width;
        const float* add = delta + pos * width;

        float mean = 0.0F;
        for (std::size_t k = 0; k < width; ++k) {
            row[k] += add[k];
            mean += row[k];
        }
        mean /= static_cast<float>(width);

        float variance = 0.0F;
        for (std::size_t k = 0; k < width; ++k) {
            const float centred = row[k] - mean;
            variance += centred * centred;
        }
        const float inv_std =
            1.0F / std::sqrt(variance / static_cast<float>(width) + kEpsilon);

        for (std::size_t k = 0; k < width; ++k) {
            row[k] = (row[k] - mean) * inv_std;
        }
    }
}

// GELU in place. The FFN intermediate is 4x width, so a separate output
// buffer here is the largest avoidable allocation in the block.
void gelu_inplace(float* __restrict values, std::size_t count) {
    const float coeff = std::sqrt(2.0F / 3.14159265F);
    for (std::size_t idx = 0; idx < count; ++idx) {
        const float value = values[idx];
        const float inner = coeff * (value + 0.044715F * value * value * value);
        values[idx] = 0.5F * value * (1.0F + std::tanh(inner));
    }
}

void encode(std::span<const std::uint32_t> token_ids, const Weights& weights,
            Workspace& work) {
    const std::size_t n_positions = token_ids.size();
    const std::size_t width = weights.width;
    const std::size_t head_dim = width / weights.n_heads;
    const auto positions_i = static_cast<blasint>(n_positions);
    const auto width_i = static_cast<blasint>(width);

    for (std::size_t pos = 0; pos < n_positions; ++pos) {
        const float* row = weights.token_embed +
                           static_cast<std::size_t>(token_ids[pos]) * width;
        const float* bias = weights.pos_embed + pos * width;
        float* out = work.hidden.data() + pos * width;
        for (std::size_t k = 0; k < width; ++k) {
            out[k] = row[k] + bias[k];
        }
    }

    for (std::size_t layer = 0; layer < weights.n_layers; ++layer) {
        // One GEMM for Q, K and V together: (positions x width) x
        // (width x 3*width). Fusing the three projections means one pass
        // over the hidden states instead of three.
        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, positions_i,
                    static_cast<blasint>(3 * width), width_i, 1.0F,
                    work.hidden.data(), width_i,
                    weights.qkv + layer * 3 * width * width, width_i, 0.0F,
                    work.qkv.data(), static_cast<blasint>(3 * width));

        const float inv_sqrt_d = 1.0F / std::sqrt(static_cast<float>(head_dim));

        for (std::size_t head = 0; head < weights.n_heads; ++head) {
            float* scores = work.scores.data() + head * n_positions * n_positions;

            for (std::size_t query_pos = 0; query_pos < n_positions; ++query_pos) {
                const float* query = work.qkv.data() + query_pos * 3 * width +
                                     head * head_dim;
                float top = kNegInf;
                for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                    const float* key = work.qkv.data() + key_pos * 3 * width +
                                       width + head * head_dim;
                    float dot = 0.0F;
                    // Autovectorizes: contiguous, no aliasing, fixed trip count.
                    for (std::size_t k = 0; k < head_dim; ++k) {
                        dot += query[k] * key[k];
                    }
                    const float score = dot * inv_sqrt_d;
                    scores[query_pos * n_positions + key_pos] = score;
                    top = std::max(top, score);
                }

                float total = 0.0F;
                for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                    const float value =
                        std::exp(scores[query_pos * n_positions + key_pos] - top);
                    scores[query_pos * n_positions + key_pos] = value;
                    total += value;
                }
                const float inv_total = 1.0F / total;
                for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                    scores[query_pos * n_positions + key_pos] *= inv_total;
                }
            }

            for (std::size_t query_pos = 0; query_pos < n_positions; ++query_pos) {
                float* out = work.context.data() + query_pos * width + head * head_dim;
                for (std::size_t k = 0; k < head_dim; ++k) {
                    out[k] = 0.0F;
                }
                for (std::size_t key_pos = 0; key_pos < n_positions; ++key_pos) {
                    const float weight = scores[query_pos * n_positions + key_pos];
                    const float* value = work.qkv.data() + key_pos * 3 * width +
                                         2 * width + head * head_dim;
                    for (std::size_t k = 0; k < head_dim; ++k) {
                        out[k] += weight * value[k];
                    }
                }
            }
        }

        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, positions_i, width_i,
                    width_i, 1.0F, work.context.data(), width_i,
                    weights.w_o + layer * width * width, width_i, 0.0F,
                    work.inner.data(), width_i);
        fused_residual_norm(work.hidden.data(), work.inner.data(), n_positions, width);

        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, positions_i,
                    static_cast<blasint>(4 * width), width_i, 1.0F,
                    work.hidden.data(), width_i,
                    weights.w_in + layer * 4 * width * width, width_i, 0.0F,
                    work.inner.data(), static_cast<blasint>(4 * width));
        gelu_inplace(work.inner.data(), n_positions * 4 * width);

        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, positions_i, width_i,
                    static_cast<blasint>(4 * width), 1.0F, work.inner.data(),
                    static_cast<blasint>(4 * width),
                    weights.w_out + layer * width * 4 * width,
                    static_cast<blasint>(4 * width), 0.0F, work.context.data(),
                    width_i);
        fused_residual_norm(work.hidden.data(), work.context.data(), n_positions,
                            width);
    }
}

// The point of the whole file: project only the masked positions.
float masked_loss(std::span<const std::uint32_t> token_ids,
                  std::span<const std::uint32_t> masked_positions,
                  std::span<const std::uint32_t> targets, const Weights& weights,
                  Workspace& work) {
    if (masked_positions.empty()) {
        return 0.0F;
    }

    encode(token_ids, weights, work);

    const std::size_t width = weights.width;
    const std::size_t n_masked = masked_positions.size();

    // Gather into a contiguous block so the head GEMM streams rather than
    // strides across the full hidden array.
    for (std::size_t idx = 0; idx < n_masked; ++idx) {
        const float* source =
            work.hidden.data() + static_cast<std::size_t>(masked_positions[idx]) * width;
        float* destination = work.gathered.data() + idx * width;
        for (std::size_t k = 0; k < width; ++k) {
            destination[k] = source[k];
        }
    }

    // One GEMM: (n_masked x width) x (width x vocab). At a 15% rate this
    // is ~6x smaller than projecting every position.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans,
                static_cast<blasint>(n_masked),
                static_cast<blasint>(weights.vocab_size),
                static_cast<blasint>(width), 1.0F, work.gathered.data(),
                static_cast<blasint>(width), weights.head,
                static_cast<blasint>(width), 0.0F, work.logits.data(),
                static_cast<blasint>(weights.vocab_size));

    float total = 0.0F;
    for (std::size_t idx = 0; idx < n_masked; ++idx) {
        const float* row = work.logits.data() + idx * weights.vocab_size;
        float top = kNegInf;
        for (std::size_t token = 0; token < weights.vocab_size; ++token) {
            top = std::max(top, row[token]);
        }
        float sum_exp = 0.0F;
        for (std::size_t token = 0; token < weights.vocab_size; ++token) {
            sum_exp += std::exp(row[token] - top);
        }
        total += top + std::log(sum_exp) - row[targets[idx]];
    }

    return total / static_cast<float>(n_masked);
}

// Parallelize across sequences, not positions. The inner loops are already
// GEMMs; splitting a single sequence would fight BLAS for the same cores.
// Set OPENBLAS_NUM_THREADS=1 alongside this or the two pools oversubscribe.
float batch_masked_loss(
    const std::vector<std::span<const std::uint32_t>>& sequences,
    const std::vector<std::span<const std::uint32_t>>& positions,
    const std::vector<std::span<const std::uint32_t>>& targets,
    const Weights& weights, std::vector<Workspace>& workspaces) {
    const auto n_sequences = static_cast<std::ptrdiff_t>(sequences.size());
    float total = 0.0F;

#pragma omp parallel for reduction(+ : total) schedule(dynamic)
    for (std::ptrdiff_t seq = 0; seq < n_sequences; ++seq) {
        const int thread = omp_get_thread_num();
        total += masked_loss(sequences[static_cast<std::size_t>(seq)],
                             positions[static_cast<std::size_t>(seq)],
                             targets[static_cast<std::size_t>(seq)], weights,
                             workspaces[static_cast<std::size_t>(thread)]);
    }

    return total / static_cast<float>(n_sequences);
}

}  // namespace mlm_fast
`,
        profile:
          'Encoder projections become GEMMs and the head shrinks by the inverse of the masking rate, so the largest matmul in the forward pass falls by roughly sixfold. Illustrative, not a measured benchmark: OpenBLAS must be pinned to one thread or its pool and the OpenMP pool oversubscribe the machine and both run slower.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Masked language model, transcribed from the objective.
//!
//! Bidirectional self-attention with no causal mask. The instructive
//! comparison is with a decoder-only model: identical arithmetic, except
//! that a decoder skips every key beyond the current query position and
//! this does not. That one omission is what makes the representations
//! better for understanding and makes generation impossible.

use std::f32::consts::PI;

pub struct Params {
    pub vocab_size: usize,
    pub width: usize,
    pub n_layers: usize,
    pub sentinel_id: usize,

    pub token_embed: Vec<f32>, // vocab_size * width
    pub pos_embed: Vec<f32>,   // max_positions * width
    pub w_q: Vec<f32>,         // n_layers * width * width
    pub w_k: Vec<f32>,
    pub w_v: Vec<f32>,
    pub w_o: Vec<f32>,
    pub w_in: Vec<f32>,  // n_layers * (4*width) * width
    pub w_out: Vec<f32>, // n_layers * width * (4*width)
    pub head: Vec<f32>,  // vocab_size * width
}

fn gelu(value: f32) -> f32 {
    let inner = (2.0 / PI).sqrt() * (value + 0.044715 * value * value * value);
    0.5 * value * (1.0 + inner.tanh())
}

fn layer_norm(vector: &mut [f32]) {
    let width = vector.len() as f32;
    let mut mean = 0.0;
    for value in vector.iter() {
        mean += *value;
    }
    mean /= width;

    let mut variance = 0.0;
    for value in vector.iter() {
        let centred = *value - mean;
        variance += centred * centred;
    }
    variance /= width;

    let inv_std = 1.0 / (variance + 1e-5).sqrt();
    for value in vector.iter_mut() {
        *value = (*value - mean) * inv_std;
    }
}

fn matvec(matrix: &[f32], rows: usize, cols: usize, vector: &[f32], out: &mut [f32]) {
    for row in 0..rows {
        let mut sum = 0.0;
        for col in 0..cols {
            sum += matrix[row * cols + col] * vector[col];
        }
        out[row] = sum;
    }
}

/// Self-attention over the full sequence. Nothing is masked out.
fn attention(hidden: &mut [f32], n_positions: usize, params: &Params, layer: usize) {
    let width = params.width;
    let plane = layer * width * width;

    let mut queries = vec![0.0f32; n_positions * width];
    let mut keys = vec![0.0f32; n_positions * width];
    let mut values = vec![0.0f32; n_positions * width];

    for pos in 0..n_positions {
        let slice = &hidden[pos * width..(pos + 1) * width];
        matvec(
            &params.w_q[plane..plane + width * width],
            width,
            width,
            slice,
            &mut queries[pos * width..(pos + 1) * width],
        );
        matvec(
            &params.w_k[plane..plane + width * width],
            width,
            width,
            slice,
            &mut keys[pos * width..(pos + 1) * width],
        );
        matvec(
            &params.w_v[plane..plane + width * width],
            width,
            width,
            slice,
            &mut values[pos * width..(pos + 1) * width],
        );
    }

    let inv_sqrt_d = 1.0 / (width as f32).sqrt();
    let mut context = vec![0.0f32; n_positions * width];
    let mut scores = vec![0.0f32; n_positions];

    for query_pos in 0..n_positions {
        let mut top = f32::NEG_INFINITY;
        for key_pos in 0..n_positions {
            // A causal model would \`continue\` when key_pos > query_pos.
            // The absence of that line is the whole architecture.
            let mut dot = 0.0;
            for k in 0..width {
                dot += queries[query_pos * width + k] * keys[key_pos * width + k];
            }
            scores[key_pos] = dot * inv_sqrt_d;
            if scores[key_pos] > top {
                top = scores[key_pos];
            }
        }

        let mut total = 0.0;
        for key_pos in 0..n_positions {
            scores[key_pos] = (scores[key_pos] - top).exp();
            total += scores[key_pos];
        }

        for key_pos in 0..n_positions {
            let weight = scores[key_pos] / total;
            for k in 0..width {
                context[query_pos * width + k] += weight * values[key_pos * width + k];
            }
        }
    }

    let mut projected = vec![0.0f32; width];
    for pos in 0..n_positions {
        matvec(
            &params.w_o[plane..plane + width * width],
            width,
            width,
            &context[pos * width..(pos + 1) * width],
            &mut projected,
        );
        for k in 0..width {
            hidden[pos * width + k] += projected[k];
        }
        layer_norm(&mut hidden[pos * width..(pos + 1) * width]);
    }
}

fn feed_forward(hidden: &mut [f32], n_positions: usize, params: &Params, layer: usize) {
    let width = params.width;
    let inner_width = 4 * width;
    let in_plane = layer * inner_width * width;
    let out_plane = layer * width * inner_width;

    let mut inner = vec![0.0f32; inner_width];
    let mut projected = vec![0.0f32; width];

    for pos in 0..n_positions {
        matvec(
            &params.w_in[in_plane..in_plane + inner_width * width],
            inner_width,
            width,
            &hidden[pos * width..(pos + 1) * width],
            &mut inner,
        );
        for value in inner.iter_mut() {
            *value = gelu(*value);
        }
        matvec(
            &params.w_out[out_plane..out_plane + width * inner_width],
            width,
            inner_width,
            &inner,
            &mut projected,
        );
        for k in 0..width {
            hidden[pos * width + k] += projected[k];
        }
        layer_norm(&mut hidden[pos * width..(pos + 1) * width]);
    }
}

pub fn encode(token_ids: &[usize], params: &Params) -> Vec<f32> {
    let width = params.width;
    let n_positions = token_ids.len();
    let mut hidden = vec![0.0f32; n_positions * width];

    for pos in 0..n_positions {
        for k in 0..width {
            hidden[pos * width + k] = params.token_embed[token_ids[pos] * width + k]
                + params.pos_embed[pos * width + k];
        }
    }

    for layer in 0..params.n_layers {
        attention(&mut hidden, n_positions, params, layer);
        feed_forward(&mut hidden, n_positions, params, layer);
    }
    hidden
}

pub struct Corrupted {
    pub token_ids: Vec<usize>,
    pub positions: Vec<usize>,
    pub targets: Vec<usize>,
}

/// The 80/10/10 recipe.
///
/// Each clause corrects a problem the previous one created. Masking gives
/// the model something to predict, but the sentinel token appears at
/// pretraining and never at fine-tuning -- so 10% of chosen positions get
/// a random token, forcing the model to check every position rather than
/// trusting unmasked ones, and 10% are left alone, forcing it to predict a
/// token that is already correct. Three mechanisms patching one design
/// decision.
pub fn corrupt(
    token_ids: &[usize],
    params: &Params,
    rate: f32,
    seed: &mut u64,
) -> Corrupted {
    let mut out = Corrupted {
        token_ids: token_ids.to_vec(),
        positions: Vec::new(),
        targets: Vec::new(),
    };

    for pos in 0..token_ids.len() {
        if next_uniform(seed) >= rate {
            continue;
        }
        out.positions.push(pos);
        out.targets.push(token_ids[pos]);

        let draw = next_uniform(seed);
        if draw < 0.8 {
            out.token_ids[pos] = params.sentinel_id;
        } else if draw < 0.9 {
            out.token_ids[pos] = (next_u64(seed) as usize) % params.vocab_size;
        }
        // else: unchanged, deliberately.
    }
    out
}

/// Average negative log p(x_i | rest) over the masked positions.
///
/// The denominator is the masked count, not the sequence length: roughly
/// 85% of a fully-paid forward pass contributes nothing to the gradient.
/// That is the objective's inefficiency, and it is the direct motivation
/// for replacement-detection objectives that train on every position.
pub fn masked_loss(
    token_ids: &[usize],
    params: &Params,
    rate: f32,
    seed: &mut u64,
) -> f32 {
    let corrupted = corrupt(token_ids, params, rate, seed);
    if corrupted.positions.is_empty() {
        return 0.0;
    }

    let hidden = encode(&corrupted.token_ids, params);
    let width = params.width;
    let mut logits = vec![0.0f32; params.vocab_size];
    let mut total = 0.0;

    for (idx, &pos) in corrupted.positions.iter().enumerate() {
        matvec(
            &params.head,
            params.vocab_size,
            width,
            &hidden[pos * width..(pos + 1) * width],
            &mut logits,
        );

        let mut top = f32::NEG_INFINITY;
        for value in logits.iter() {
            if *value > top {
                top = *value;
            }
        }
        let mut sum_exp = 0.0;
        for value in logits.iter() {
            sum_exp += (*value - top).exp();
        }
        total += top + sum_exp.ln() - logits[corrupted.targets[idx]];
    }

    total / corrupted.positions.len() as f32
}

fn next_u64(state: &mut u64) -> u64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

fn next_uniform(state: &mut u64) -> f32 {
    (next_u64(state) >> 40) as f32 / (1u64 << 24) as f32
}
`,
        profile:
          'Index loops with a scalar inner product per position pair, and the vocabulary head at every position. Illustrative, not a measured benchmark: the absent causal restriction in the key loop is the one thing to read for, since it is the only line separating this from a decoder-only model.',
      },
      'make-it-right': {
        rationale:
          'The absence of a likelihood becomes a property of the API rather than a caveat in the documentation: there is no score method and no sample method on the encoder, and the error enum names the attempt explicitly so a caller who reaches for one gets a compile error or a typed refusal rather than a plausible-looking number. Newtypes separate the three unrelated integers that are all usize — a token id, a position and a vocabulary index — which is the class of confusion that silently produces garbage rather than a panic. Every recoverable failure becomes a Result variant carrying the values that caused it, and the tokenizer contract is validated at the constructor boundary since a mismatch degrades output with no error anywhere.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Masked language model where the missing likelihood is in the API.
//!
//! The design point: a masked model has no joint density, and that is easy
//! to document and easy to ignore. So this type simply has no \`score\` and
//! no \`sample\` method, and the error enum names the attempt. A caller who
//! wants a sequence probability gets a compile error rather than a
//! plausible-looking number that is not a probability.

use std::fmt;

/// A vocabulary index. Distinct from a position, which is the confusion
/// that silently produces garbage rather than panicking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenId(pub u32);

/// An index along the sequence axis.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Position(pub usize);

/// The model's hidden width. Separate from vocabulary size, which it is
/// routinely multiplied against.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModelDim(pub usize);

/// The pretrained maximum sequence length. A hard ceiling, not a default.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MaxPositions(pub usize);

#[derive(Debug)]
pub enum MlmError {
    /// A token id falls outside the vocabulary the checkpoint was trained
    /// on. Almost always a tokenizer mismatch. The silent version -- ids
    /// in range that mean different subwords -- cannot be caught here,
    /// which is why the tokenizer must be pinned with the weights.
    TokenizerMismatch { token: TokenId, vocab_size: usize, at: Position },
    /// Longer than the pretrained maximum. Refused rather than truncated:
    /// truncation is silent and removes the END of the text, which for
    /// classification is frequently where the conclusion sits.
    SequenceTooLong { len: usize, max: MaxPositions },
    /// Corruption selected nothing, so the loss has no terms. Averaging
    /// over an empty set would emit a NaN into the gradient.
    NoMaskedPositions { len: usize, rate: f32 },
    /// The caller asked for a sequence probability. There isn't one.
    LikelihoodUnavailable { len: usize },
    /// The sentinel token is outside the vocabulary it must index into.
    InvalidSentinel { sentinel: TokenId, vocab_size: usize },
    /// Width is not divisible by head count, so the heads cannot tile it.
    HeadMismatch { width: ModelDim, n_heads: usize },
}

impl fmt::Display for MlmError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TokenizerMismatch { token, vocab_size, at } => write!(
                f,
                "token {} at position {} outside vocabulary of {}; \\
                 the tokenizer does not match this checkpoint",
                token.0, at.0, vocab_size
            ),
            Self::SequenceTooLong { len, max } => write!(
                f,
                "sequence of {} exceeds pretrained maximum {}; \\
                 truncate deliberately, not implicitly",
                len, max.0
            ),
            Self::NoMaskedPositions { len, rate } => write!(
                f,
                "rate {} selected no positions from {}; the loss would be NaN",
                rate, len
            ),
            Self::LikelihoodUnavailable { len } => write!(
                f,
                "a masked model has no joint density over {} tokens: the \\
                 conditionals condition on different sets and do not compose; \\
                 use a decoder-only model for scoring",
                len
            ),
            Self::InvalidSentinel { sentinel, vocab_size } => write!(
                f,
                "sentinel token {} outside vocabulary of {}",
                sentinel.0, vocab_size
            ),
            Self::HeadMismatch { width, n_heads } => write!(
                f,
                "width {} is not divisible by {} heads",
                width.0, n_heads
            ),
        }
    }
}

impl std::error::Error for MlmError {}

/// How positions are chosen and what replaces them.
///
/// Validated at construction because the proportions are a contract:
/// changing the rate mid-run changes the objective being optimized.
#[derive(Debug, Clone, Copy)]
pub struct CorruptionPolicy {
    rate: f32,
    prob_sentinel: f32,
    prob_random: f32,
    span_length: usize,
}

impl CorruptionPolicy {
    pub fn new(
        rate: f32,
        prob_sentinel: f32,
        prob_random: f32,
        span_length: usize,
    ) -> Result<Self, String> {
        if !(0.0..1.0).contains(&rate) || rate == 0.0 {
            return Err(format!("masking rate must lie in (0, 1), got {rate}"));
        }
        if prob_sentinel + prob_random > 1.0 {
            return Err(format!(
                "sentinel {prob_sentinel} plus random {prob_random} exceeds 1"
            ));
        }
        if span_length == 0 {
            return Err("span_length must be at least 1".to_string());
        }
        Ok(Self { rate, prob_sentinel, prob_random, span_length })
    }

    /// The remainder: positions selected but left exactly as they are.
    #[must_use]
    pub fn prob_unchanged(&self) -> f32 {
        1.0 - self.prob_sentinel - self.prob_random
    }

    #[must_use]
    pub fn rate(&self) -> f32 {
        self.rate
    }

    #[must_use]
    pub fn span_length(&self) -> usize {
        self.span_length
    }
}

impl Default for CorruptionPolicy {
    /// The conventional recipe. Worth noting that 15% comes from one paper
    /// at one sequence length and has been shown to be far from optimal at
    /// longer ones -- a default, not a law.
    fn default() -> Self {
        Self { rate: 0.15, prob_sentinel: 0.8, prob_random: 0.1, span_length: 1 }
    }
}

/// What the checkpoint expects of its inputs.
#[derive(Debug, Clone, Copy)]
pub struct TokenizerContract {
    vocab_size: usize,
    sentinel: TokenId,
    max_positions: MaxPositions,
}

impl TokenizerContract {
    pub fn new(
        vocab_size: usize,
        sentinel: TokenId,
        max_positions: MaxPositions,
    ) -> Result<Self, MlmError> {
        if sentinel.0 as usize >= vocab_size {
            return Err(MlmError::InvalidSentinel { sentinel, vocab_size });
        }
        Ok(Self { vocab_size, sentinel, max_positions })
    }

    /// Borrows a slice rather than taking a Vec; the caller keeps ownership.
    fn validate(&self, token_ids: &[TokenId]) -> Result<(), MlmError> {
        if token_ids.len() > self.max_positions.0 {
            return Err(MlmError::SequenceTooLong {
                len: token_ids.len(),
                max: self.max_positions,
            });
        }
        // Iterator chain rather than an index loop: the position comes
        // from enumerate() so it cannot drift out of step with the token.
        if let Some((at, token)) = token_ids
            .iter()
            .enumerate()
            .find(|(_, token)| token.0 as usize >= self.vocab_size)
        {
            return Err(MlmError::TokenizerMismatch {
                token: *token,
                vocab_size: self.vocab_size,
                at: Position(at),
            });
        }
        Ok(())
    }
}

/// A corrupted sequence alongside what was hidden.
pub struct MaskedBatch {
    pub corrupted: Vec<TokenId>,
    pub positions: Vec<Position>,
    pub targets: Vec<TokenId>,
}

pub struct MaskedEncoder {
    contract: TokenizerContract,
    policy: CorruptionPolicy,
    width: ModelDim,
    n_layers: usize,
    n_heads: usize,
    weights: Vec<f32>,
}

impl MaskedEncoder {
    /// Everything checkable is checked here, before a single forward pass.
    pub fn new(
        contract: TokenizerContract,
        width: ModelDim,
        n_layers: usize,
        n_heads: usize,
        weights: Vec<f32>,
        policy: CorruptionPolicy,
    ) -> Result<Self, MlmError> {
        if n_heads == 0 || width.0 % n_heads != 0 {
            return Err(MlmError::HeadMismatch { width, n_heads });
        }
        Ok(Self { contract, policy, width, n_layers, n_heads, weights })
    }

    /// Bidirectional encoding. One pass, no cache, nothing sequential --
    /// which is the operational advantage over a generative model.
    pub fn encode(&self, token_ids: &[TokenId]) -> Result<Vec<f32>, MlmError> {
        self.contract.validate(token_ids)?;

        let width = self.width.0;
        let mut hidden = vec![0.0f32; token_ids.len() * width];

        for (pos, token) in token_ids.iter().enumerate() {
            let embed_row = token.0 as usize * width;
            let pos_row = pos * width;
            for k in 0..width {
                hidden[pos_row + k] = self.weights[embed_row + k]
                    + self.weights[self.pos_embed_offset() + pos_row + k];
            }
        }

        for layer in 0..self.n_layers {
            self.attention_block(&mut hidden, token_ids.len(), layer);
            self.feed_forward_block(&mut hidden, token_ids.len(), layer);
        }
        Ok(hidden)
    }

    /// Cross-entropy over masked positions only.
    ///
    /// Named \`loss\`, not \`nll\`. It is not a likelihood and it is not
    /// comparable to a causal model's perplexity.
    pub fn loss(&self, batch: &MaskedBatch) -> Result<f32, MlmError> {
        if batch.positions.is_empty() {
            return Err(MlmError::NoMaskedPositions {
                len: batch.corrupted.len(),
                rate: self.policy.rate(),
            });
        }

        let hidden = self.encode(&batch.corrupted)?;
        let width = self.width.0;

        let total: f32 = batch
            .positions
            .iter()
            .zip(batch.targets.iter())
            .map(|(pos, target)| {
                let state = &hidden[pos.0 * width..(pos.0 + 1) * width];
                let logits = self.project_head(state);
                let top = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let log_z =
                    top + logits.iter().map(|v| (v - top).exp()).sum::<f32>().ln();
                log_z - logits[target.0 as usize]
            })
            .sum();

        Ok(total / batch.positions.len() as f32)
    }

    /// Deliberately returns an error. Callers do ask for this, and a
    /// plausible-looking number would be worse than a refusal.
    pub fn sequence_log_prob(&self, token_ids: &[TokenId]) -> Result<f32, MlmError> {
        Err(MlmError::LikelihoodUnavailable { len: token_ids.len() })
    }

    #[must_use]
    pub fn policy(&self) -> &CorruptionPolicy {
        &self.policy
    }

    fn project_head(&self, state: &[f32]) -> Vec<f32> {
        let width = self.width.0;
        let base = self.head_offset();
        (0..self.contract.vocab_size)
            .map(|token| {
                self.weights[base + token * width..base + (token + 1) * width]
                    .iter()
                    .zip(state.iter())
                    .map(|(w, h)| w * h)
                    .sum()
            })
            .collect()
    }

    fn attention_block(&self, hidden: &mut [f32], n_positions: usize, layer: usize) {
        let width = self.width.0;
        let head_dim = width / self.n_heads;
        let inv_sqrt_d = 1.0 / (head_dim as f32).sqrt();
        let base = self.layer_offset(layer);

        let project = |matrix_offset: usize| -> Vec<f32> {
            (0..n_positions)
                .flat_map(|pos| {
                    let state = &hidden[pos * width..(pos + 1) * width];
                    (0..width)
                        .map(|row| {
                            self.weights[matrix_offset + row * width
                                ..matrix_offset + (row + 1) * width]
                                .iter()
                                .zip(state.iter())
                                .map(|(w, h)| w * h)
                                .sum::<f32>()
                        })
                        .collect::<Vec<f32>>()
                })
                .collect()
        };

        let square = width * width;
        let queries = project(base);
        let keys = project(base + square);
        let values = project(base + 2 * square);

        let mut context = vec![0.0f32; n_positions * width];
        for query_pos in 0..n_positions {
            // The key range is the whole sequence. No causal restriction.
            let mut scores: Vec<f32> = (0..n_positions)
                .map(|key_pos| {
                    queries[query_pos * width..(query_pos + 1) * width]
                        .iter()
                        .zip(keys[key_pos * width..(key_pos + 1) * width].iter())
                        .map(|(q, k)| q * k)
                        .sum::<f32>()
                        * inv_sqrt_d
                })
                .collect();

            let top = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let mut total = 0.0;
            for score in scores.iter_mut() {
                *score = (*score - top).exp();
                total += *score;
            }

            for (key_pos, score) in scores.iter().enumerate() {
                let weight = score / total;
                for k in 0..width {
                    context[query_pos * width + k] +=
                        weight * values[key_pos * width + k];
                }
            }
        }

        self.add_projection_and_norm(hidden, &context, n_positions, base + 3 * square);
    }

    fn feed_forward_block(&self, hidden: &mut [f32], n_positions: usize, layer: usize) {
        let width = self.width.0;
        let inner_width = 4 * width;
        let base = self.layer_offset(layer) + 4 * width * width;

        for pos in 0..n_positions {
            let state: Vec<f32> = hidden[pos * width..(pos + 1) * width].to_vec();
            let inner: Vec<f32> = (0..inner_width)
                .map(|row| {
                    let sum: f32 = self.weights
                        [base + row * width..base + (row + 1) * width]
                        .iter()
                        .zip(state.iter())
                        .map(|(w, h)| w * h)
                        .sum();
                    gelu(sum)
                })
                .collect();

            let out_base = base + inner_width * width;
            for row in 0..width {
                let sum: f32 = self.weights[out_base + row * inner_width
                    ..out_base + (row + 1) * inner_width]
                    .iter()
                    .zip(inner.iter())
                    .map(|(w, h)| w * h)
                    .sum();
                hidden[pos * width + row] += sum;
            }
            layer_norm(&mut hidden[pos * width..(pos + 1) * width]);
        }
    }

    fn add_projection_and_norm(
        &self,
        hidden: &mut [f32],
        context: &[f32],
        n_positions: usize,
        matrix_offset: usize,
    ) {
        let width = self.width.0;
        for pos in 0..n_positions {
            let source = &context[pos * width..(pos + 1) * width];
            let projected: Vec<f32> = (0..width)
                .map(|row| {
                    self.weights[matrix_offset + row * width
                        ..matrix_offset + (row + 1) * width]
                        .iter()
                        .zip(source.iter())
                        .map(|(w, c)| w * c)
                        .sum()
                })
                .collect();
            for (k, value) in projected.iter().enumerate() {
                hidden[pos * width + k] += value;
            }
            layer_norm(&mut hidden[pos * width..(pos + 1) * width]);
        }
    }

    fn pos_embed_offset(&self) -> usize {
        self.contract.vocab_size * self.width.0
    }

    fn layer_offset(&self, layer: usize) -> usize {
        let width = self.width.0;
        let per_layer = 4 * width * width + 2 * 4 * width * width;
        self.pos_embed_offset() + self.contract.max_positions.0 * width
            + layer * per_layer
    }

    fn head_offset(&self) -> usize {
        self.layer_offset(self.n_layers)
    }
}

fn gelu(value: f32) -> f32 {
    let inner = (2.0 / std::f32::consts::PI).sqrt()
        * (value + 0.044715 * value * value * value);
    0.5 * value * (1.0 + inner.tanh())
}

fn layer_norm(vector: &mut [f32]) {
    let width = vector.len() as f32;
    let mean = vector.iter().sum::<f32>() / width;
    let variance =
        vector.iter().map(|v| (v - mean) * (v - mean)).sum::<f32>() / width;
    let inv_std = 1.0 / (variance + 1e-5).sqrt();
    for value in vector.iter_mut() {
        *value = (*value - mean) * inv_std;
    }
}
`,
        profile:
          'Iterator chains give bounds-check elision without changing the asymptotics, so the cost profile matches the naive version. Illustrative, not a measured benchmark: what the stage buys is that the missing likelihood is now a typed refusal rather than a documentation caveat a caller can ignore.',
      },
      'make-it-fast': {
        rationale:
          'The vocabulary projection dominates and only fifteen percent of its rows matter, so the masked hidden states are gathered into a contiguous slab before the single head matmul — one large well-shaped multiply instead of a full-sequence projection whose output is then mostly discarded. The per-layer projections move to ndarray with BLAS so they are GEMMs rather than iterator chains over rows. Rayon parallelizes across sequences in the batch rather than across positions within one, since positions are already inside a BLAS call and splitting them would contend for the same cores; each worker owns its scratch buffers, allocated once with the capacity the pretrained maximum implies so the hot path never reallocates.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Projections and the vocabulary head become GEMMs over the whole sequence instead of row-wise iterator chains',
            tradeoff: 'A BLAS dependency whose own thread pool must be pinned to one thread, or it fights rayon for the same cores',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Gathered masked states form a compact contiguous slab, so the head GEMM streams rather than strides across the hidden array',
            tradeoff: 'The gather copies, costing bandwidth proportional to the masked count — a net win only while the masking rate stays well below one',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Sequences encode concurrently, sharing nothing but the read-only weights',
            tradeoff: 'Per-worker scratch means the memory footprint scales with thread count rather than staying fixed at one sequence',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Masked position and target vectors are sized from the rate up front, so corruption never grows a Vec mid-loop',
            tradeoff: 'Over-allocates when the draw comes in below the expected count, holding memory the sequence did not need',
          },
        ],
        code: `//! Masked language model with the vocabulary head confined to masked
//! positions.
//!
//! The optimization that matters is structural rather than numeric. The
//! head projection is width x vocab -- typically 768 x 30000 -- and it is
//! by a wide margin the largest matmul in the model. A naive
//! implementation runs it at every position and then reads 15% of the
//! result. Gathering the masked states first shrinks it by roughly
//! 1/rate: at the conventional 15%, close to 6x off the most expensive
//! operation in the forward pass.
//!
//! What this does NOT fix: the encoder still ran over every position and
//! only 15% of that work produced a gradient. That inefficiency belongs to
//! the objective, not the implementation, and the only remedy is a
//! different objective -- which is precisely why replacement-detection
//! pretraining exists.
//!
//! Requires OPENBLAS_NUM_THREADS=1, or BLAS and rayon oversubscribe.

use ndarray::{s, Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

const EPSILON: f32 = 1e-5;

#[derive(Debug, Clone, Copy)]
pub struct ModelDim(pub usize);

#[derive(Debug, Clone, Copy)]
pub struct TokenId(pub u32);

pub struct Weights {
    pub token_embed: Array2<f32>, // vocab x width
    pub pos_embed: Array2<f32>,   // max_positions x width
    pub qkv: Vec<Array2<f32>>,    // per layer: (3*width) x width, fused
    pub w_o: Vec<Array2<f32>>,    // per layer: width x width
    pub w_in: Vec<Array2<f32>>,   // per layer: (4*width) x width
    pub w_out: Vec<Array2<f32>>,  // per layer: width x (4*width)
    pub head: Array2<f32>,        // vocab x width -- the expensive one
    pub n_heads: usize,
}

impl Weights {
    #[must_use]
    pub fn width(&self) -> ModelDim {
        ModelDim(self.token_embed.ncols())
    }

    #[must_use]
    pub fn vocab_size(&self) -> usize {
        self.token_embed.nrows()
    }
}

/// Per-worker scratch, allocated once at the pretrained maximum so the hot
/// path never reallocates. The cost of the rayon parallelism is that this
/// footprint multiplies by the thread count.
pub struct Scratch {
    hidden: Array2<f32>,
    qkv: Array2<f32>,
    context: Array2<f32>,
    inner: Array2<f32>,
    gathered: Array2<f32>,
}

impl Scratch {
    #[must_use]
    pub fn new(weights: &Weights, max_positions: usize, max_masked: usize) -> Self {
        let width = weights.width().0;
        Self {
            hidden: Array2::zeros((max_positions, width)),
            qkv: Array2::zeros((max_positions, 3 * width)),
            context: Array2::zeros((max_positions, width)),
            inner: Array2::zeros((max_positions, 4 * width)),
            gathered: Array2::zeros((max_masked, width)),
        }
    }
}

/// Corruption with both output vectors sized from the rate up front.
pub struct MaskedBatch {
    pub corrupted: Vec<TokenId>,
    pub positions: Vec<usize>,
    pub targets: Vec<TokenId>,
}

pub fn corrupt(
    token_ids: &[TokenId],
    sentinel: TokenId,
    vocab_size: usize,
    rate: f32,
    seed: &mut u64,
) -> MaskedBatch {
    // Expected count plus headroom, so neither Vec grows inside the loop.
    let expected = ((token_ids.len() as f32 * rate).ceil() as usize).max(1);
    let capacity = expected + expected / 2 + 4;

    let mut corrupted = token_ids.to_vec();
    let mut positions = Vec::with_capacity(capacity);
    let mut targets = Vec::with_capacity(capacity);

    for (pos, token) in token_ids.iter().enumerate() {
        if next_uniform(seed) >= rate {
            continue;
        }
        positions.push(pos);
        targets.push(*token);

        let draw = next_uniform(seed);
        if draw < 0.8 {
            corrupted[pos] = sentinel;
        } else if draw < 0.9 {
            corrupted[pos] = TokenId((next_u64(seed) % vocab_size as u64) as u32);
        }
        // else: unchanged, deliberately -- the sentinel never appears at
        // fine-tuning, so the model must also predict tokens already there.
    }

    if positions.is_empty() {
        let last = token_ids.len().saturating_sub(1);
        positions.push(last);
        targets.push(token_ids[last]);
        corrupted[last] = sentinel;
    }

    MaskedBatch { corrupted, positions, targets }
}

/// Fused residual add plus layer-norm, writing the row once.
fn fused_residual_norm(hidden: &mut Array2<f32>, delta: ArrayView2<f32>) {
    for (mut row, add) in hidden.outer_iter_mut().zip(delta.outer_iter()) {
        let width = row.len() as f32;
        let mut mean = 0.0;
        for (value, increment) in row.iter_mut().zip(add.iter()) {
            *value += increment;
            mean += *value;
        }
        mean /= width;

        let variance =
            row.iter().map(|v| (v - mean) * (v - mean)).sum::<f32>() / width;
        let inv_std = 1.0 / (variance + EPSILON).sqrt();
        for value in row.iter_mut() {
            *value = (*value - mean) * inv_std;
        }
    }
}

/// GELU in place. The FFN intermediate is 4x width, so a second buffer
/// here is the largest avoidable allocation in the block.
fn gelu_inplace(values: &mut Array2<f32>) {
    let coeff = (2.0 / std::f32::consts::PI).sqrt();
    values.mapv_inplace(|value| {
        let inner = coeff * (value + 0.044715 * value * value * value);
        0.5 * value * (1.0 + inner.tanh())
    });
}

fn encode_into(token_ids: &[TokenId], weights: &Weights, scratch: &mut Scratch) {
    let n_positions = token_ids.len();
    let width = weights.width().0;
    let head_dim = width / weights.n_heads;
    let inv_sqrt_d = 1.0 / (head_dim as f32).sqrt();

    {
        let mut hidden = scratch.hidden.slice_mut(s![..n_positions, ..]);
        for (pos, token) in token_ids.iter().enumerate() {
            let embed = weights.token_embed.row(token.0 as usize);
            let position = weights.pos_embed.row(pos);
            let mut row = hidden.row_mut(pos);
            for k in 0..width {
                row[k] = embed[k] + position[k];
            }
        }
    }

    for layer in 0..weights.qkv.len() {
        // One GEMM for Q, K and V together: fusing the three projections
        // means one pass over the hidden states instead of three.
        {
            let hidden = scratch.hidden.slice(s![..n_positions, ..]);
            let product = hidden.dot(&weights.qkv[layer].t());
            scratch
                .qkv
                .slice_mut(s![..n_positions, ..])
                .assign(&product);
        }

        let mut context = Array2::<f32>::zeros((n_positions, width));
        for head in 0..weights.n_heads {
            let lo = head * head_dim;
            let hi = lo + head_dim;

            let qkv = scratch.qkv.slice(s![..n_positions, ..]);
            let queries = qkv.slice(s![.., lo..hi]);
            let keys = qkv.slice(s![.., width + lo..width + hi]);
            let values = qkv.slice(s![.., 2 * width + lo..2 * width + hi]);

            // Full score matrix -- no causal mask anywhere in this file.
            let mut scores = queries.dot(&keys.t());
            scores *= inv_sqrt_d;

            for mut row in scores.outer_iter_mut() {
                let top = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let mut total = 0.0;
                for value in row.iter_mut() {
                    *value = (*value - top).exp();
                    total += *value;
                }
                row /= total;
            }

            let mixed = scores.dot(&values);
            context.slice_mut(s![.., lo..hi]).assign(&mixed);
        }

        let projected = context.dot(&weights.w_o[layer].t());
        {
            let mut hidden = scratch.hidden.slice_mut(s![..n_positions, ..]);
            let mut owned = hidden.to_owned();
            fused_residual_norm(&mut owned, projected.view());
            hidden.assign(&owned);
        }

        let mut inner = scratch
            .hidden
            .slice(s![..n_positions, ..])
            .dot(&weights.w_in[layer].t());
        gelu_inplace(&mut inner);
        let back = inner.dot(&weights.w_out[layer].t());
        scratch
            .inner
            .slice_mut(s![..n_positions, ..])
            .fill(0.0);
        {
            let mut hidden = scratch.hidden.slice_mut(s![..n_positions, ..]);
            let mut owned = hidden.to_owned();
            fused_residual_norm(&mut owned, back.view());
            hidden.assign(&owned);
        }

        scratch
            .context
            .slice_mut(s![..n_positions, ..])
            .assign(&context);
    }
}

/// The point of the file: project only the masked positions.
pub fn masked_loss(
    batch: &MaskedBatch,
    weights: &Weights,
    scratch: &mut Scratch,
) -> f32 {
    encode_into(&batch.corrupted, weights, scratch);

    let width = weights.width().0;
    let n_masked = batch.positions.len();

    // Gather into a contiguous slab. Slicing rows out of the hidden array
    // for the GEMM would stride; a compact copy streams.
    {
        let hidden = scratch.hidden.slice(s![..batch.corrupted.len(), ..]);
        let mut gathered = scratch.gathered.slice_mut(s![..n_masked, ..]);
        for (idx, &pos) in batch.positions.iter().enumerate() {
            gathered.row_mut(idx).assign(&hidden.row(pos));
        }
    }

    // One GEMM: (n_masked x width) x (width x vocab). Roughly 1/rate the
    // size of projecting every position.
    let gathered = scratch.gathered.slice(s![..n_masked, ..]);
    let logits = gathered.dot(&weights.head.t());

    let total: f32 = logits
        .outer_iter()
        .zip(batch.targets.iter())
        .map(|(row, target)| {
            let top = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let log_z = top + row.iter().map(|v| (v - top).exp()).sum::<f32>().ln();
            log_z - row[target.0 as usize]
        })
        .sum();

    total / n_masked as f32
}

/// Parallelize across sequences, not positions. Positions are already
/// inside a BLAS call; splitting them would contend for the same cores.
pub fn batch_masked_loss(
    batches: &[MaskedBatch],
    weights: &Weights,
    max_positions: usize,
    max_masked: usize,
) -> f32 {
    let total: f32 = batches
        .par_iter()
        .map_init(
            || Scratch::new(weights, max_positions, max_masked),
            |scratch, batch| masked_loss(batch, weights, scratch),
        )
        .sum();

    total / batches.len() as f32
}

/// Mean-pool a sequence into one embedding, excluding padding.
///
/// Worth stating explicitly because the pooling strategy is part of the
/// model: a checkpoint trained with sentinel-token pooling and one trained
/// with mean pooling are not interchangeable, even when both expose both.
pub fn mean_pool(hidden: ArrayView2<f32>, valid_len: usize) -> Array1<f32> {
    hidden
        .slice(s![..valid_len, ..])
        .mean_axis(Axis(0))
        .expect("valid_len must be non-zero")
}

fn next_u64(state: &mut u64) -> u64 {
    *state ^= *state << 13;
    *state ^= *state >> 7;
    *state ^= *state << 17;
    *state
}

fn next_uniform(state: &mut u64) -> f32 {
    (next_u64(state) >> 40) as f32 / (1u64 << 24) as f32
}
`,
        profile:
          'The head becomes one GEMM over roughly fifteen percent of the rows and sequences encode concurrently across cores. Illustrative, not a measured benchmark: per-worker scratch means the memory footprint scales with thread count, which is the real ceiling on how far the rayon parallelism goes.',
      },
    },
  },
};
