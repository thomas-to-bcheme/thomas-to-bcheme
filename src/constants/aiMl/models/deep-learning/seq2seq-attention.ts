import type { AiMlModel } from '../../types';

/**
 * Seq2Seq with Attention — the entry where the fixed-size state stops being
 * the bottleneck.
 *
 * Follows the recurrent entries because it removes their defining constraint
 * rather than mitigating it. An encoder-decoder without attention compresses a
 * whole source sequence into one vector; attention keeps every encoder state
 * and lets the decoder look up what it needs at each output step. The
 * recurrence survives here and the transformer removes it — which makes this
 * the hinge between the two halves of the sequence group.
 */
export const SEQ2SEQ_ATTENTION: AiMlModel = {
  slug: 'seq2seq-attention',
  name: 'Seq2Seq with Attention',
  aliases: ['Encoder-decoder', 'Bahdanau attention', 'Luong attention', 'Neural machine translation', 'Soft alignment'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['sequence-modeling', 'generation'],
  architecture: 'hybrid',
  paradigmNote:
    'Classified hybrid because the recurrence and the attention are separate mechanisms doing separate jobs: a recurrent encoder and decoder carry order, and an attention layer bridges them. The transformer keeps the second and discards the first, which is why this entry sits between them.',

  intuition:
    'Translating a sentence with a plain encoder-decoder means reading the whole source, compressing it into one fixed vector, and then generating from that vector alone. Everything the decoder will ever know about the source has to fit there — and it does not, which is why the approach degraded sharply on long sentences and why reversing the source words used to help. Attention removes the compression. Keep every encoder state, and at each output step compute a score between what the decoder is currently doing and each source position, turn those scores into weights that sum to one, and read a weighted average. The decoder is no longer remembering the source; it is looking at it, and choosing where to look.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = -\\sum_{u=1}^{U} \\log p\\!\\left(y_u \\mid y_{<u}, \\mathbf{x}\\right), \\qquad \\mathbf{c}_u = \\sum_{t=1}^{T} \\alpha_{ut}\\, \\mathbf{h}_t',
      symbols: [
        { symbol: '\\mathbf{h}_t', meaning: 'encoder state at source position t — all of them are kept, which is the whole change' },
        { symbol: '\\alpha_{ut}', meaning: 'attention weight: how much output step u reads from source position t, summing to one over t' },
        { symbol: '\\mathbf{c}_u', meaning: 'the context vector — a fresh weighted average of the source, recomputed at every output step' },
        { symbol: 'y_{<u}', meaning: 'the previously generated tokens; during training these are the true ones, which is teacher forcing' },
      ],
    },
    reading:
      'Maximize the probability of the target sequence one token at a time, conditioning on the source and on what has been generated so far. The second expression is where the architecture lives: the context is a convex combination of every encoder state, with weights chosen per output step. That single change converts a fixed-capacity memory into a content-addressed lookup, and it is why performance stops degrading with source length. The conditioning on y-less-than-u also names the method’s characteristic problem — during training those tokens are the true ones and at inference they are the model’s own, so errors compound in a regime the model was never shown.',
  },

  optimization: {
    method: 'Teacher-forced maximum likelihood by backpropagation through both recurrences; beam search at inference',
    updateRule: {
      formula:
        '\\alpha_{ut} = \\frac{\\exp(e_{ut})}{\\sum_{t^{\\prime}} \\exp(e_{ut^{\\prime}})}, \\qquad e_{ut} = \\mathbf{v}^{\\top}\\tanh\\!\\left(W_s\\mathbf{s}_{u-1} + W_h\\mathbf{h}_t\\right)',
      symbols: [
        { symbol: 'e_{ut}', meaning: 'the compatibility score between decoder state and source position — additive here, a dot product in the multiplicative variant' },
        { symbol: 'W_h\\mathbf{h}_t', meaning: 'depends only on the encoder, so it is computed once per source and reused at every output step' },
        { symbol: '\\mathbf{v}^{\\top}\\tanh(\\cdot)', meaning: 'Bahdanau’s additive scoring: a small network, more expressive and slower than a dot product' },
        { symbol: '\\text{softmax}', meaning: 'normalizes the scores into a distribution over source positions — which is why the weights read as a soft alignment' },
      ],
    },
    rationale:
      'Training is teacher-forced maximum likelihood: feed the true previous token, predict the next, and backpropagate through the decoder, the attention and the encoder together. Nothing about the optimizer is unusual; three details are. The additive score has a term that depends only on the encoder, so projecting all encoder states once per source rather than once per output step removes a factor of U from the attention cost — the single most consequential implementation detail here. Padded source positions must be masked before the softmax, or the model attends to padding and the weights become nonsense in a way that trains without complaint. And decoding is a search problem the loss says nothing about: greedy decoding takes the best token at each step and is myopic, beam search keeps several hypotheses and is a heuristic with no optimality guarantee, and without length normalization it systematically prefers short outputs because every additional token multiplies in another probability below one.',
    hyperparameters: [
      { name: 'attention type', role: 'Additive (Bahdanau) or multiplicative (Luong). Additive is more expressive; multiplicative is a matrix product and far faster, which is what the transformer adopted', typicalRange: 'multiplicative with scaling once dimensions are large' },
      { name: 'beam width', role: 'How many hypotheses to keep at decode time. Returns flatten quickly and very wide beams can score worse, which is a genuinely counterintuitive result', typicalRange: '4 to 10 for translation' },
      { name: 'length penalty', role: 'Normalization of the sequence score by length. Not optional: without it the search prefers short outputs by construction', typicalRange: 'alpha 0.6 to 1.0 in the standard formulation' },
      { name: 'teacher forcing ratio', role: 'How often the true previous token is fed rather than the model’s own. Scheduled sampling anneals it to reduce exposure bias' },
      { name: 'encoder direction', role: 'Bidirectional encoders are standard, since a source position benefits from both sides; the decoder must stay causal' },
      { name: 'coverage penalty', role: 'Discourages attending repeatedly to the same source position, which is the mechanism behind repeated and dropped output' },
    ],
    convergence:
      'Trains reliably given the usual recurrent care — clipping, and gating in both recurrences. The failure modes are about generation rather than fitting. Exposure bias: teacher forcing means the model never sees its own mistakes during training, so at inference an early error puts it in a state the training distribution never contained and errors compound. Repetition and omission: nothing constrains the attention to cover the source once, so a decoder can attend to the same span repeatedly and produce loops, or skip a span entirely — coverage penalties address the symptom rather than the cause. Length bias: the sequence score is a product of probabilities, so longer is always less likely and the search must be corrected for it. And the decoder remains sequential, so generation cannot be parallelized even though the encoder can.',
    complexity:
      'Encoder: O(T · h^2) and sequential in T. Attention: O(T · U · h) — the product of source and target length, which is where the cost is and which is quadratic when the two are comparable. Decoder: O(U · h^2), sequential in U. Beam search multiplies the decode cost by the beam width. Memory holds all T encoder states rather than one summary vector, which is the trade that buys the lookup and is negligible relative to the activations.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Encode the history with a recurrent encoder, then decode the horizon step by step with attention back over the encoder states — so the forecast for a distant horizon can look directly at the relevant part of the history rather than at a summary of it. Known-future covariates such as holidays or promotions enter the decoder at each step, which is a genuine structural advantage over a model that only sees the past.',
        where: [
          'Multi-horizon forecasting where different horizons depend on different parts of the history, such as a weekly and an annual pattern',
          'Series with known future covariates, which the decoder can consume at each step',
          'The direct ancestor of attention-based forecasters, where the attention weights over the history are shown to analysts as an explanation',
          'Global models over many series, where the encoder-decoder structure shares one set of weights across all of them',
        ],
        why: 'The attention lets a long history stay accessible instead of being compressed, which is the same argument as in translation and applies just as well to a seasonal series. The interpretable weights are a real secondary benefit in a forecasting context, where the question "what is this based on" is asked more often than in most domains. Against it: the decoder is sequential, so multi-step generation is slow; errors compound across the horizon exactly as they do in text; and on a single ordinary business series it loses to exponential smoothing, because none of this apparatus is identifiable from a few hundred observations.',
        featurization: [
          'Scale per series and encode calendar structure explicitly, as for any neural forecaster trained across series',
          'Feed known-future covariates into the decoder rather than the encoder — that is what the split is for, and it is frequently wired wrongly',
          'Mask padded history positions before the attention softmax, or the model attends to padding and trains without complaint',
          'Predict all horizons directly rather than recursively where possible, which avoids compounding the model’s own errors',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing. Inspect the attention weights as a diagnostic rather than as an explanation — they show where the model looked, which is not the same as why the forecast is what it is.',
        pitfalls: [
          'Reading attention weights as causal attribution, which they are not — they are one layer’s routing, and a well-known caution in the interpretability literature',
          'Recursive decoding compounding errors across a long horizon, which teacher-forced training never exhibits',
          'Leaking future covariates into the encoder, which is a subtle and complete invalidation of the backtest',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The architecture maps one sequence to another under supervision from paired examples; it has no notion of normality or of outlyingness, and a reconstruction variant of it is the autoencoder rather than this entry.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Decoding is a search problem the training loss says nothing about, and it is the clearest example in this category of a combinatorial search bolted to a learned model. The space is every possible output sequence, which is exponential; greedy decoding is the myopic heuristic; beam search keeps a bounded frontier and is still a heuristic with no optimality guarantee. Attention itself is a soft assignment — a relaxation of choosing one source position into a distribution over all of them, which is what makes it differentiable.',
        where: [
          'Beam search as a bounded-width heuristic over an exponential sequence space, with no guarantee of finding the highest-probability output',
          'Length normalization as a correction for a scoring function that is biased by construction',
          'Attention as a differentiable relaxation of a hard alignment, which is the same move that makes many discrete decisions trainable',
        ],
        why: 'It is worth studying because the model and the search are separable and both matter: a better model with greedy decoding frequently loses to a worse model with a good beam, and the loss the model was trained on does not measure decoding quality at all. The length-bias result is also instructive — a sequence score that is a product of probabilities is monotonically decreasing in length, so the search prefers short outputs for reasons that have nothing to do with the data, and the fix is an explicit correction rather than a better model.',
        featurization: [
          'Normalize the sequence score by length, or the search systematically truncates',
          'Add a coverage term when repetition or omission is observed, since nothing in the objective constrains the attention to cover the source once',
        ],
        evaluation:
          'Compare greedy, beam and exhaustive decoding on short instances where exhaustive is feasible — the gap between beam and exhaustive is a direct measurement of what the heuristic costs, and it is usually larger than expected.',
        pitfalls: [
          'Assuming a wider beam is monotonically better, when very wide beams frequently score worse — a genuinely counterintuitive and well-replicated result',
          'Comparing models under different decoding settings, which confounds the model with the search',
          'Omitting length normalization and then attributing the short outputs to the model',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'The formulation neural machine translation was built on. A bidirectional recurrent encoder reads the source; a decoder generates the target one token at a time, computing an attention distribution over source positions at every step and consuming the resulting context vector alongside its own state. The attention weights form a soft alignment between source and target that can be read directly.',
        where: [
          'Neural machine translation, where this architecture replaced phrase-based statistical systems',
          'Abstractive summarization, where the decoder must select from a long source rather than compress it',
          'Speech recognition with attention-based decoders, as the alternative to the CTC formulation',
          'Any sequence-to-sequence transduction where input and output lengths differ and are not monotonically aligned',
        ],
        why: 'It solved the specific problem that limited encoder-decoder translation: a fixed context vector could not hold a long sentence, and quality fell off with length. Attention removed that ceiling and, as a side effect, produced alignments a linguist could inspect — which is rare. It has been superseded by the transformer, which kept the attention and discarded the recurrence to gain parallelism, so this entry is now the explanation of where attention came from rather than a deployment choice. What survives operationally is the encoder-decoder structure itself, which the transformer inherited unchanged.',
        featurization: [
          'Mask padded source positions before the softmax, or attention mass leaks onto padding and training proceeds without any error',
          'Bucket by length before batching, since attention cost is the product of source and target lengths and a mixed batch wastes most of it',
          'Share embeddings between the decoder input and the output projection where the vocabularies overlap, which is a large parameter saving',
          'Use subword units rather than words, which bounds the vocabulary and removes the unknown-token problem',
        ],
        evaluation:
          'BLEU or a learned metric on a held-out set, always reporting the decoding configuration alongside — a model compared at different beam widths is not a comparison of models. Inspect alignments qualitatively on known-hard cases such as reordering and long-distance agreement.',
        pitfalls: [
          'Reporting scores without the beam width and length penalty, which makes the numbers incomparable',
          'Exposure bias at generation, where an early mistake puts the decoder in a state training never contained',
          'Repetition loops from unconstrained attention, which coverage penalties treat symptomatically',
          'Reading attention as explanation rather than as routing, a caution the interpretability literature has made repeatedly',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Two recurrences plus an attention that costs the product of source and target lengths. Both recurrences are sequential, so the encoder parallelizes across the batch and not across time, and training wall-clock is dominated by that rather than by the attention arithmetic.',
    inferenceProfile:
      'Generation is sequential in output length and multiplied by the beam width, so a beam of eight is roughly eight times the decode cost. The encoder runs once per input and its states are cached for the whole decode, which is the standard and necessary optimization.',
    retrainingCadence:
      'Periodic and full, warm-started. Vocabulary changes force more than a refit — a new subword model reindexes every embedding, so vocabulary and weights are versioned together or not at all.',
    driftAndMonitoring: [
      'Track output length distribution against the reference: systematic shortening is the length-bias signature and points at the decoder configuration rather than the model',
      'Monitor repetition rate, since attention loops produce degenerate output that aggregate quality metrics smooth over',
      'Watch the share of attention mass falling on padding or on the end-of-sequence position, which indicates a masking bug',
      'Compare teacher-forced and free-running loss — a widening gap is exposure bias rather than a fitting problem',
    ],
    productionGotchas: [
      'Source padding must be masked before the softmax, not after — masking afterwards leaves the weights normalized over padding and the context vector is wrong while training proceeds cleanly',
      'Length normalization must match between evaluation and deployment, or the deployed model produces systematically different lengths from the one that was benchmarked',
      'Encoder states must be cached across the decode; recomputing them per output step multiplies the cost by the target length and is an easy accidental regression',
      'Beam search state — hypotheses, scores, finished flags — is intricate, and an off-by-one in the finished handling produces plausible output that is systematically worse',
      'The end-of-sequence token must be handled explicitly in the beam, or hypotheses that have finished keep accumulating score and crowd out live ones',
    ],
  },

  assumptions: [
    'Input and output are sequences whose alignment is learnable but not necessarily monotonic — which is what distinguishes this from the CTC formulation',
    'Paired examples exist: this is supervised transduction and needs source-target pairs, not just target sequences',
    'The source is short enough that attention over every position is affordable, since the cost is the product of the two lengths',
    'Teacher forcing during training approximates the inference regime well enough, which is exactly the assumption exposure bias violates',
    'A single attention distribution per output step suffices, which multi-head attention later relaxed',
  ],

  pros: [
    {
      point: 'Removes the fixed-size bottleneck entirely',
      context:
        'Quality stops degrading with source length, which was the ceiling on encoder-decoder models before it. The single change that made neural translation work, and the reason the mechanism survived into the transformer unchanged.',
    },
    {
      point: 'Attention weights are inspectable as a soft alignment',
      context:
        'A genuinely rare property — the model produces something a domain expert can read. Worth being careful with: it shows where the layer looked, which is routing rather than explanation.',
    },
    {
      point: 'Handles unequal and non-monotonic input-output lengths',
      context:
        'Reordering, insertion and deletion are all representable, which is what translation requires and what a monotonic formulation like CTC cannot express.',
    },
    {
      point: 'The encoder-decoder structure generalizes far beyond translation',
      context:
        'Summarization, speech, forecasting and code generation all use it unchanged. Learning it once pays across the category, which is why it sits here rather than in an applied domain.',
    },
  ],

  cons: [
    {
      point: 'The decoder is sequential, so generation cannot be parallelized',
      context:
        'The encoder parallelizes across the batch and the decode does not, which caps throughput. The transformer removed the recurrence and kept the attention for exactly this reason.',
    },
    {
      point: 'Attention cost is the product of source and target lengths',
      context:
        'Quadratic when the two are comparable, which bounds usable sequence length. The same cost the transformer inherited and that a long line of efficient-attention work exists to reduce.',
    },
    {
      point: 'Exposure bias between training and generation',
      context:
        'Teacher forcing never shows the model its own mistakes, so an early error at inference lands it outside the training distribution and compounds. Scheduled sampling reduces it and does not remove it.',
    },
    {
      point: 'Decoding quality depends on a search the loss never optimized',
      context:
        'Beam width and length penalty change output substantially and are not part of training. A model comparison at different decoding settings is not a model comparison at all, and this is frequently overlooked.',
    },
  ],

  relatedSlugs: ['transformer', 'lstm', 'ctc'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Additive attention and greedy decoding - transcribed.

The decoder no longer receives a single summary of the source. At every output
step it scores itself against each encoder state, normalizes those scores into
weights, and reads a weighted average. That is the whole mechanism.
"""

import math


def additive_score(decoder_state, encoder_state, W_s, W_h, v):
    """e_ut = v^T tanh(W_s s_{u-1} + W_h h_t)

    Bahdanau's additive form: a small network rather than a dot product. More
    expressive, and slower - which is why the multiplicative variant is what
    the transformer adopted.
    """
    hidden = len(v)
    total = 0.0

    for j in range(hidden):
        projected = 0.0
        for k in range(len(decoder_state)):
            projected += W_s[k][j] * decoder_state[k]
        for k in range(len(encoder_state)):
            projected += W_h[k][j] * encoder_state[k]
        total += v[j] * math.tanh(projected)

    return total


def attention(decoder_state, encoder_states, W_s, W_h, v):
    """Scores, softmax, weighted average. One context vector per output step."""
    scores = [
        additive_score(decoder_state, state, W_s, W_h, v) for state in encoder_states
    ]

    # Softmax with the max subtracted: exp of a large score overflows, and the
    # naive form silently produces NaN.
    largest = max(scores)
    exponentials = [math.exp(score - largest) for score in scores]
    partition = sum(exponentials)
    weights = [value / partition for value in exponentials]

    # The context: a convex combination of EVERY encoder state, recomputed
    # fresh at each output step. Nothing is compressed, which is the whole
    # difference from a fixed context vector.
    hidden = len(encoder_states[0])
    context = [0.0] * hidden
    for t, state in enumerate(encoder_states):
        for j in range(hidden):
            context[j] += weights[t] * state[j]

    return context, weights


def greedy_decode(encoder_states, start_token, max_length, step_fn, W_s, W_h, v):
    """Take the highest-probability token at every step.

    Myopic by construction: a token that looks best now may lead nowhere, and
    nothing here can revise it. Beam search keeps several hypotheses precisely
    because of this.
    """
    decoder_state = [0.0] * len(encoder_states[0])
    token = start_token
    output = []
    alignments = []

    for _ in range(max_length):
        context, weights = attention(decoder_state, encoder_states, W_s, W_h, v)
        alignments.append(weights)

        # step_fn advances the decoder recurrence and returns log-probabilities
        # over the vocabulary.
        decoder_state, log_probabilities = step_fn(decoder_state, token, context)

        best = 0
        for index in range(1, len(log_probabilities)):
            if log_probabilities[index] > log_probabilities[best]:
                best = index

        if best == 0:      # end-of-sequence
            break

        output.append(best)
        token = best

    return output, alignments`,
        profile: 'O(U * T * h^2) for the attention alone, since the additive score reprojects every encoder state at every output step.',
      },
      'make-it-right': {
        code: `"""Attention - typed, batched, masked, with the encoder projection cached."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]

ScoreType = Literal["additive", "multiplicative"]


@dataclass
class AttentionLayer:
    """Additive or multiplicative scoring over a cached encoder projection."""

    W_s: Matrix        # (decoder_hidden, attention_hidden)
    W_h: Matrix        # (encoder_hidden, attention_hidden)
    v: Vector          # (attention_hidden,)
    score_type: ScoreType = "additive"

    def project_encoder(self, encoder_states: Tensor) -> Tensor:
        """W_h @ h_t, computed ONCE per source rather than per output step.

        This term depends only on the encoder, so recomputing it at every
        decoder step - which the naive formulation does - repeats the same
        product U times. Hoisting it is the single most consequential
        implementation detail in additive attention.
        """
        if encoder_states.ndim != 3:
            raise ValueError(f"expected (batch, time, hidden), got {encoder_states.shape}")
        return encoder_states @ self.W_h

    def __call__(
        self,
        decoder_state: Matrix,
        encoder_states: Tensor,
        projected: Tensor,
        source_mask: NDArray,
    ) -> tuple[Matrix, Matrix]:
        """One output step for a whole batch. Returns (context, weights)."""
        if source_mask.shape != encoder_states.shape[:2]:
            raise ValueError(
                f"mask shape {source_mask.shape} does not match "
                f"{encoder_states.shape[:2]} source positions"
            )

        if self.score_type == "additive":
            # (batch, 1, attn) + (batch, time, attn) broadcasts to every
            # source position without materializing a per-step projection.
            combined = np.tanh(decoder_state @ self.W_s)[:, None, :] + projected
            scores = combined @ self.v
        else:
            # Luong: a plain dot product against the projected states. Far
            # cheaper, and what the transformer generalized.
            scores = np.einsum("bh,bth->bt", decoder_state @ self.W_s, projected)

        # MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
        # normalized over padding, so the context vector is wrong while
        # training proceeds without any error - the classic silent bug here.
        scores = np.where(source_mask, scores, -np.inf)

        largest = np.max(scores, axis=1, keepdims=True)
        exponentials = np.exp(scores - largest)
        weights = exponentials / exponentials.sum(axis=1, keepdims=True)

        # The context: a convex combination of every encoder state, fresh at
        # each output step. Nothing is compressed.
        context = np.einsum("bt,bth->bh", weights, encoder_states)
        return context, weights


def beam_search(
    encoder_states: Tensor,
    projected: Tensor,
    source_mask: NDArray,
    step_fn,
    attention_layer: AttentionLayer,
    beam_width: int = 5,
    max_length: int = 100,
    length_penalty: float = 0.7,
    eos: int = 0,
) -> list[int]:
    """Bounded-width search over an exponential space.

    A heuristic with no optimality guarantee: the highest-probability sequence
    can fall off the beam at any step and is unrecoverable afterwards.
    """
    if beam_width < 1:
        raise ValueError(f"beam_width must be at least 1, got {beam_width}")

    hidden = encoder_states.shape[2]
    beams: list[tuple[float, list[int], Vector]] = [(0.0, [], np.zeros(hidden))]
    finished: list[tuple[float, list[int]]] = []

    for _ in range(max_length):
        candidates: list[tuple[float, list[int], Vector]] = []

        for score, tokens, state in beams:
            context, _ = attention_layer(
                state[None, :], encoder_states, projected, source_mask
            )
            next_state, log_probabilities = step_fn(state, tokens, context[0])

            top = np.argpartition(log_probabilities, -beam_width)[-beam_width:]
            for token in top:
                extended = score + float(log_probabilities[token])
                if token == eos:
                    # LENGTH NORMALIZATION. The sequence score is a product of
                    # probabilities, so it decreases monotonically with length
                    # and the search prefers short outputs by construction.
                    # Without this correction the model looks terse and the
                    # cause is the search rather than the model.
                    normalized = extended / ((len(tokens) + 1) ** length_penalty)
                    finished.append((normalized, tokens))
                else:
                    candidates.append((extended, [*tokens, int(token)], next_state))

        if not candidates:
            break
        candidates.sort(key=lambda item: item[0], reverse=True)
        beams = candidates[:beam_width]

    if not finished:
        return beams[0][1]
    return max(finished, key=lambda item: item[0])[1]`,
        rationale:
          'Two changes carry the value and neither is the batching. The encoder projection is hoisted out of the decoder loop — it depends only on the encoder, so the naive formulation repeats the same product once per output token, and caching it removes a factor of U from the attention cost. And the source mask is applied before the softmax rather than after, which is the silent bug in this architecture: masking afterwards leaves the weights normalized over padding, so the context vector is wrong and training proceeds without any error. Beam search is added with length normalization, because the sequence score is a product of probabilities and therefore biased toward short outputs by construction rather than by anything in the data.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(T * h * a) once per source for the projection, then O(U * T * a) for the scores — a factor of h removed from the inner loop.',
      },
      'make-it-fast': {
        code: `"""Attention - scores as one GEMM, beam state batched, buffers reused."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Tensor = NDArray[np.float64]


class BatchedAttention:
    """Multiplicative scoring, and the beam treated as a batch.

    Two changes. The additive score is replaced by a dot product, which turns
    the whole attention into one matrix product per step - this is exactly the
    move the transformer made, and it trades a little expressiveness for a
    kernel the hardware is built for.

    And the beam stops being a Python list of hypotheses stepped one at a
    time. A beam of width B is B independent decoder states, so it becomes a
    batch dimension: one forward pass per step for the entire beam rather than
    B of them. On a beam of ten that is an order of magnitude.
    """

    def __init__(self, encoder_hidden: int, decoder_hidden: int, max_source: int,
                 beam_width: int) -> None:
        # Single projection matrix for multiplicative scoring: the additive
        # form needs two projections and a tanh, this needs one product.
        self._W = np.zeros((decoder_hidden, encoder_hidden), dtype=np.float32)

        # Buffers sized for the beam, allocated once and rewritten per step.
        self._scores = np.empty((beam_width, max_source), dtype=np.float32)
        self._weights = np.empty((beam_width, max_source), dtype=np.float32)
        self._context = np.empty((beam_width, encoder_hidden), dtype=np.float32)

    def step(
        self,
        decoder_states: Matrix,      # (beam, decoder_hidden)
        encoder_states: Matrix,      # (source, encoder_hidden) - one source
        source_mask: NDArray,        # (source,)
    ) -> tuple[Matrix, Matrix]:
        """Attention for the entire beam in one pass."""
        beam, source = decoder_states.shape[0], encoder_states.shape[0]
        scores = self._scores[:beam, :source]
        weights = self._weights[:beam, :source]

        # One GEMM for every (hypothesis, source position) pair. The
        # projection and the score fuse: (S @ W) @ H^T evaluated right to
        # left would build a (decoder, source) intermediate per hypothesis;
        # this ordering never materializes one.
        np.matmul(decoder_states @ self._W, encoder_states.T, out=scores)

        # MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
        # normalized over padding, so the context is wrong while training
        # proceeds cleanly - the silent bug in this architecture.
        scores[:, ~source_mask] = -np.inf

        # Softmax written through the score buffer: no temporary per step,
        # and with a beam of ten over a long source that is the dominant
        # allocation otherwise.
        np.subtract(scores, scores.max(axis=1, keepdims=True), out=scores)
        np.exp(scores, out=scores)
        np.divide(scores, scores.sum(axis=1, keepdims=True), out=weights)

        context = self._context[:beam]
        np.matmul(weights, encoder_states, out=context)
        return context, weights

    def rank(
        self,
        beam_scores: Vector,          # (beam,)
        log_probabilities: Matrix,    # (beam, vocab)
        beam_width: int,
    ) -> tuple[NDArray, NDArray, Vector]:
        """Top-k over the flattened (beam, vocab) grid in one call.

        The naive beam loops over hypotheses, takes the top tokens of each,
        then sorts the union - three passes and a Python sort. Flattening the
        grid makes it one partition over beam * vocab, which is a single
        vectorized call regardless of beam width.
        """
        combined = (beam_scores[:, None] + log_probabilities).ravel()

        # argpartition, not argsort: the top-k is an O(n) selection and
        # ordering the rest is work whose result is discarded.
        top = np.argpartition(combined, -beam_width)[-beam_width:]
        top = top[np.argsort(combined[top])[::-1]]

        vocab = log_probabilities.shape[1]
        return top // vocab, top % vocab, combined[top]`,
        rationale:
          'Two changes, and the second is the larger one. Additive scoring becomes multiplicative, which turns the whole attention into one matrix product per step — exactly the move the transformer made, trading a little expressiveness for a kernel the hardware is built for. Then the beam stops being a list of hypotheses stepped one at a time: a beam of width B is B independent decoder states, so it becomes a batch dimension and a step costs one forward pass instead of B. Top-k selection over the flattened beam-by-vocabulary grid replaces a loop plus a sort with a single partition, and every per-step buffer is allocated once, since with a wide beam over a long source those temporaries dominate.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Multiplicative scoring makes the attention one GEMM over every hypothesis-position pair, and the context is a second GEMM against the weights.',
            tradeoff: 'Multiplicative scoring is less expressive than additive and needs scaling as dimensions grow, or the dot products saturate the softmax into near-one-hot weights that pass almost no gradient.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The beam becomes a batch dimension, so one decoder pass serves every hypothesis and the top-k is one partition over the flattened grid rather than a loop plus a sort.',
            tradeoff: 'Hypotheses now advance in lockstep, so a finished one still occupies a slot and consumes compute until the whole beam terminates — wasted work the sequential version avoided.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Score, weight and context buffers are allocated once for the widest beam and longest source, and the softmax is written through the score buffer rather than materializing temporaries per step.',
            tradeoff: 'Fixes the beam width and source length at construction, and the in-place softmax destroys the raw scores — which anything wanting to inspect the pre-softmax alignment must copy first.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(B * T * h) per decode step for the whole beam, versus B separate passes. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Additive attention and greedy decoding - transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

// e_ut = v^T tanh(W_s s_{u-1} + W_h h_t)
//
// Bahdanau's additive form: a small network rather than a dot product. More
// expressive, and slower - which is why the multiplicative variant is what
// the transformer adopted.
double AdditiveScore(const std::vector<double>& decoder_state,
                     const std::vector<double>& encoder_state,
                     const std::vector<std::vector<double>>& W_s,
                     const std::vector<std::vector<double>>& W_h,
                     const std::vector<double>& v) {
  double total = 0.0;

  for (std::size_t j = 0; j < v.size(); ++j) {
    double projected = 0.0;
    for (std::size_t k = 0; k < decoder_state.size(); ++k) {
      projected += W_s[k][j] * decoder_state[k];
    }
    for (std::size_t k = 0; k < encoder_state.size(); ++k) {
      projected += W_h[k][j] * encoder_state[k];
    }
    total += v[j] * std::tanh(projected);
  }

  return total;
}

// Scores, softmax, weighted average. One context vector per output step.
std::vector<double> Attention(const std::vector<double>& decoder_state,
                              const std::vector<std::vector<double>>& encoder_states,
                              const std::vector<std::vector<double>>& W_s,
                              const std::vector<std::vector<double>>& W_h,
                              const std::vector<double>& v,
                              std::vector<double>& weights_out) {
  const std::size_t source = encoder_states.size();
  std::vector<double> scores(source, 0.0);

  for (std::size_t t = 0; t < source; ++t) {
    scores[t] = AdditiveScore(decoder_state, encoder_states[t], W_s, W_h, v);
  }

  // Softmax with the max subtracted: exp of a large score overflows, and the
  // naive form silently produces NaN.
  const double largest = *std::max_element(scores.begin(), scores.end());
  double partition = 0.0;
  for (std::size_t t = 0; t < source; ++t) {
    scores[t] = std::exp(scores[t] - largest);
    partition += scores[t];
  }

  weights_out.assign(source, 0.0);
  for (std::size_t t = 0; t < source; ++t) weights_out[t] = scores[t] / partition;

  // The context: a convex combination of EVERY encoder state, recomputed
  // fresh at each output step. Nothing is compressed, which is the whole
  // difference from a fixed context vector.
  const std::size_t hidden = encoder_states[0].size();
  std::vector<double> context(hidden, 0.0);
  for (std::size_t t = 0; t < source; ++t) {
    for (std::size_t j = 0; j < hidden; ++j) {
      context[j] += weights_out[t] * encoder_states[t][j];
    }
  }

  return context;
}`,
        profile: 'O(U * T * h * a) for the attention alone, since the additive score reprojects every encoder state at every output step.',
      },
      'make-it-right': {
        code: `// Attention - flat storage, cached encoder projection, masked, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

// Additive attention with the encoder-side projection cached.
//
// W_h * h_t depends only on the ENCODER, so the naive formulation repeats
// that product once per output token. Hoisting it out removes a factor of U
// from the attention cost, and it is the single most consequential
// implementation detail in this architecture.
class AdditiveAttention {
 public:
  AdditiveAttention(std::vector<double> w_s, std::vector<double> w_h, std::vector<double> v,
                    std::size_t decoder_hidden, std::size_t encoder_hidden,
                    std::size_t max_source)
      : w_s_(std::move(w_s)),
        w_h_(std::move(w_h)),
        v_(std::move(v)),
        decoder_hidden_(decoder_hidden),
        encoder_hidden_(encoder_hidden),
        attention_hidden_(v_.size()),
        projected_(max_source * v_.size(), 0.0),
        scores_(max_source, 0.0),
        weights_(max_source, 0.0) {
    if (attention_hidden_ == 0) throw std::invalid_argument("zero-width attention");
    if (w_s_.size() != decoder_hidden_ * attention_hidden_) {
      throw std::invalid_argument("W_s does not match the decoder width");
    }
    if (w_h_.size() != encoder_hidden_ * attention_hidden_) {
      throw std::invalid_argument("W_h does not match the encoder width");
    }
  }

  // Called ONCE per source sequence, not once per output step.
  void ProjectEncoder(std::span<const double> encoder_states, std::size_t source) {
    if (encoder_states.size() != source * encoder_hidden_) {
      throw std::invalid_argument("encoder states do not match the declared length");
    }

    std::fill(projected_.begin(), projected_.begin() + static_cast<long>(source * attention_hidden_),
              0.0);

    for (std::size_t t = 0; t < source; ++t) {
      const double* state = encoder_states.data() + t * encoder_hidden_;
      double* target = projected_.data() + t * attention_hidden_;
      for (std::size_t k = 0; k < encoder_hidden_; ++k) {
        const double value = state[k];
        const double* row = w_h_.data() + k * attention_hidden_;
        for (std::size_t j = 0; j < attention_hidden_; ++j) target[j] += value * row[j];
      }
    }
  }

  // One output step. mask marks which source positions are real.
  void Step(std::span<const double> decoder_state, std::span<const double> encoder_states,
            std::span<const char> mask, std::size_t source, std::span<double> context) {
    std::vector<double> decoder_projection(attention_hidden_, 0.0);
    for (std::size_t k = 0; k < decoder_hidden_; ++k) {
      const double value = decoder_state[k];
      const double* row = w_s_.data() + k * attention_hidden_;
      for (std::size_t j = 0; j < attention_hidden_; ++j) decoder_projection[j] += value * row[j];
    }

    for (std::size_t t = 0; t < source; ++t) {
      // MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
      // normalized over padding, so the context is wrong while training
      // proceeds without any error - the silent bug in this architecture.
      if (!mask[t]) {
        scores_[t] = -std::numeric_limits<double>::infinity();
        continue;
      }

      const double* projected = projected_.data() + t * attention_hidden_;
      double total = 0.0;
      for (std::size_t j = 0; j < attention_hidden_; ++j) {
        total += v_[j] * std::tanh(decoder_projection[j] + projected[j]);
      }
      scores_[t] = total;
    }

    const double largest =
        *std::max_element(scores_.begin(), scores_.begin() + static_cast<long>(source));
    double partition = 0.0;
    for (std::size_t t = 0; t < source; ++t) {
      weights_[t] = std::exp(scores_[t] - largest);
      partition += weights_[t];
    }
    for (std::size_t t = 0; t < source; ++t) weights_[t] /= partition;

    std::fill(context.begin(), context.end(), 0.0);
    for (std::size_t t = 0; t < source; ++t) {
      const double weight = weights_[t];
      const double* state = encoder_states.data() + t * encoder_hidden_;
      for (std::size_t j = 0; j < encoder_hidden_; ++j) context[j] += weight * state[j];
    }
  }

  [[nodiscard]] std::span<const double> weights(std::size_t source) const {
    return {weights_.data(), source};
  }

 private:
  std::vector<double> w_s_;
  std::vector<double> w_h_;
  std::vector<double> v_;
  std::size_t decoder_hidden_;
  std::size_t encoder_hidden_;
  std::size_t attention_hidden_;
  std::vector<double> projected_;   // cached per source, reused every step
  std::vector<double> scores_;
  std::vector<double> weights_;
};`,
        rationale:
          'The encoder projection is hoisted out of the decoder loop and computed once per source, which removes a factor of the target length from the attention cost — it depends only on the encoder, so the naive formulation repeats the same product once per output token. Source padding is masked before the softmax rather than after, which is this architecture’s silent bug: masking afterwards leaves the weights normalized over padding, so the context vector is wrong while training proceeds cleanly. Nested vectors become flat row-major buffers, and the score, weight and projection scratch are owned by the object rather than allocated per step.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(T * h * a) once per source, then O(T * a) per output step — a factor of h removed from the inner loop.',
      },
      'make-it-fast': {
        code: `// Attention - multiplicative scoring as one GEMM, beam as a batch.
#include <Eigen/Dense>
#include <limits>
#include <stdexcept>
#include <vector>

using RowMajorMatrix =
    Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// Two changes.
//
// The additive score becomes a dot product, which turns the whole attention
// into one matrix product per step - exactly the move the transformer made,
// trading a little expressiveness for a kernel the hardware is built for.
//
// And the beam stops being a loop over hypotheses. A beam of width B is B
// independent decoder states, so it becomes a BATCH dimension: one pass per
// step for the whole beam rather than B of them.
class BatchedAttention {
 public:
  BatchedAttention(RowMajorMatrix w, int max_source, int beam_width, int encoder_hidden)
      : w_(std::move(w)),
        scores_(beam_width, max_source),
        weights_(beam_width, max_source),
        context_(beam_width, encoder_hidden) {
    if (beam_width < 1) throw std::invalid_argument("beam width must be at least 1");
  }

  // decoder_states is (beam, decoder_hidden); encoder_states is
  // (source, encoder_hidden) for a single source sequence.
  const RowMajorMatrix& Step(const RowMajorMatrix& decoder_states,
                             const RowMajorMatrix& encoder_states,
                             const std::vector<char>& mask) {
    const int beam = static_cast<int>(decoder_states.rows());
    const int source = static_cast<int>(encoder_states.rows());

    // One GEMM covering every (hypothesis, source position) pair. The
    // parenthesization matters: (S * W) * H^T never materializes a
    // (decoder, source) intermediate, where the other order would.
    auto scores = scores_.topLeftCorner(beam, source);
    scores.noalias() = (decoder_states * w_) * encoder_states.transpose();

    // MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
    // normalized over padding, so the context is wrong while training
    // proceeds cleanly - the silent bug in this architecture.
    for (int t = 0; t < source; ++t) {
      if (!mask[static_cast<std::size_t>(t)]) {
        scores.col(t).setConstant(-std::numeric_limits<float>::infinity());
      }
    }

    // Softmax as fused array expressions: no intermediate materialized, and
    // the max is subtracted first because exp of a large score overflows.
    auto weights = weights_.topLeftCorner(beam, source);
    weights = (scores.colwise() - scores.rowwise().maxCoeff()).array().exp().matrix();
    weights = weights.array().colwise() / weights.rowwise().sum().array();

    auto context = context_.topRows(beam);
    context.noalias() = weights * encoder_states;
    return context_;
  }

 private:
  RowMajorMatrix w_;          // (decoder_hidden, encoder_hidden)
  RowMajorMatrix scores_;     // allocated once for the widest beam
  RowMajorMatrix weights_;
  RowMajorMatrix context_;
};`,
        rationale:
          'Additive scoring becomes multiplicative, turning the attention into a single matrix product per step — the move the transformer made, which trades a little expressiveness for a kernel the hardware is built for. The beam becomes a batch dimension rather than a loop, so a step costs one pass for every hypothesis instead of B passes. The parenthesization of the score product is load-bearing and called out: evaluating it in the other order would materialize a decoder-by-source intermediate per hypothesis. All buffers are allocated once for the widest beam and longest source, and precision drops to float since the attention is memory-bound.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Scoring and the context are each one GEMM covering the whole beam, replacing a loop over hypotheses each doing its own reduction.',
            tradeoff: 'Multiplicative scoring needs a scale factor as dimensions grow, or the dot products saturate the softmax into near-one-hot weights that pass almost no gradient — the same reason the transformer divides by the square root of the head dimension.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The softmax composes as fused array expressions and noalias() writes each product straight into its buffer, so no intermediate is created per decode step.',
            tradeoff: 'noalias() is an unchecked assertion, and the score product’s parenthesization is load-bearing — writing it the other way silently allocates a decoder-by-source matrix per hypothesis and exhausts memory on a long source.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A hypothesis is one contiguous row of scores and a source position one contiguous encoder state, which suits both the GEMM panels and the row-wise softmax.',
            tradeoff: 'Eigen defaults to column-major, so the layout must be carried through every type, and the column-wise mask write strides in exactly the dimension the rest of the code walks.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(B * T * h) per decode step for the whole beam, versus B separate passes. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Additive attention and greedy decoding - transcribed.

/// e_ut = v^T tanh(W_s s_{u-1} + W_h h_t)
///
/// Bahdanau's additive form: a small network rather than a dot product. More
/// expressive, and slower - which is why the multiplicative variant is what
/// the transformer adopted.
pub fn additive_score(
    decoder_state: &[f64],
    encoder_state: &[f64],
    w_s: &[Vec<f64>],
    w_h: &[Vec<f64>],
    v: &[f64],
) -> f64 {
    let mut total = 0.0;

    for j in 0..v.len() {
        let mut projected = 0.0;
        for k in 0..decoder_state.len() {
            projected += w_s[k][j] * decoder_state[k];
        }
        for k in 0..encoder_state.len() {
            projected += w_h[k][j] * encoder_state[k];
        }
        total += v[j] * projected.tanh();
    }

    total
}

/// Scores, softmax, weighted average. One context vector per output step.
pub fn attention(
    decoder_state: &[f64],
    encoder_states: &[Vec<f64>],
    w_s: &[Vec<f64>],
    w_h: &[Vec<f64>],
    v: &[f64],
) -> (Vec<f64>, Vec<f64>) {
    let mut scores: Vec<f64> = encoder_states
        .iter()
        .map(|state| additive_score(decoder_state, state, w_s, w_h, v))
        .collect();

    // Softmax with the max subtracted: exp of a large score overflows, and
    // the naive form silently produces NaN.
    let largest = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mut partition = 0.0;
    for score in &mut scores {
        *score = (*score - largest).exp();
        partition += *score;
    }
    let weights: Vec<f64> = scores.iter().map(|value| value / partition).collect();

    // The context: a convex combination of EVERY encoder state, recomputed
    // fresh at each output step. Nothing is compressed, which is the whole
    // difference from a fixed context vector.
    let hidden = encoder_states[0].len();
    let mut context = vec![0.0; hidden];
    for (t, state) in encoder_states.iter().enumerate() {
        for j in 0..hidden {
            context[j] += weights[t] * state[j];
        }
    }

    (context, weights)
}

/// Take the highest-probability token at every step.
///
/// Myopic by construction: a token that looks best now may lead nowhere, and
/// nothing here can revise it. Beam search keeps several hypotheses precisely
/// because of this.
pub fn greedy_decode(
    encoder_states: &[Vec<f64>],
    max_length: usize,
    mut step_fn: impl FnMut(&[f64], usize, &[f64]) -> (Vec<f64>, Vec<f64>),
    w_s: &[Vec<f64>],
    w_h: &[Vec<f64>],
    v: &[f64],
) -> Vec<usize> {
    let mut decoder_state = vec![0.0; encoder_states[0].len()];
    let mut token = 0;
    let mut output = Vec::new();

    for _ in 0..max_length {
        let (context, _) = attention(&decoder_state, encoder_states, w_s, w_h, v);
        let (next_state, log_probabilities) = step_fn(&decoder_state, token, &context);
        decoder_state = next_state;

        let best = log_probabilities
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or(0, |(index, _)| index);

        if best == 0 {
            break;      // end-of-sequence
        }
        output.push(best);
        token = best;
    }

    output
}`,
        profile: 'O(U * T * h * a) for the attention alone, with the encoder reprojected at every output step and every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Attention - typed errors, cached encoder projection, masked softmax.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum AttentionError {
    ZeroWidth,
    ShapeMismatch { expected: usize, found: usize },
    MaskMismatch { source: usize, mask: usize },
    BeamWidth { value: usize },
    AllMasked,
}

impl fmt::Display for AttentionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroWidth => write!(f, "zero-width attention layer"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::MaskMismatch { source, mask } => {
                write!(f, "{source} source positions but a mask of length {mask}")
            }
            Self::BeamWidth { value } => write!(f, "beam width must be at least 1, got {value}"),
            Self::AllMasked => write!(
                f,
                "every source position is masked; the softmax would divide by zero"
            ),
        }
    }
}

impl std::error::Error for AttentionError {}

/// Beam width. A newtype because it and the maximum length are both bare
/// usize at every decode call site, and they are not interchangeable.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BeamWidth(usize);

impl BeamWidth {
    pub fn new(value: usize) -> Result<Self, AttentionError> {
        if value == 0 {
            return Err(AttentionError::BeamWidth { value });
        }
        Ok(Self(value))
    }
}

/// Additive attention with the encoder-side projection cached.
///
/// W_h * h_t depends only on the ENCODER, so the naive formulation repeats
/// that product once per output token. Hoisting it removes a factor of U from
/// the attention cost, and it is the single most consequential implementation
/// detail in this architecture.
pub struct AdditiveAttention {
    w_s: Vec<f64>,          // row-major (decoder_hidden, attention_hidden)
    w_h: Vec<f64>,          // row-major (encoder_hidden, attention_hidden)
    v: Vec<f64>,
    projected: Vec<f64>,    // cached per source, reused every output step
    scores: Vec<f64>,
    decoder_hidden: usize,
    encoder_hidden: usize,
    attention_hidden: usize,
}

impl AdditiveAttention {
    pub fn new(
        w_s: Vec<f64>,
        w_h: Vec<f64>,
        v: Vec<f64>,
        decoder_hidden: usize,
        encoder_hidden: usize,
        max_source: usize,
    ) -> Result<Self, AttentionError> {
        let attention_hidden = v.len();
        if attention_hidden == 0 || decoder_hidden == 0 || encoder_hidden == 0 {
            return Err(AttentionError::ZeroWidth);
        }
        if w_s.len() != decoder_hidden * attention_hidden {
            return Err(AttentionError::ShapeMismatch {
                expected: decoder_hidden * attention_hidden,
                found: w_s.len(),
            });
        }
        if w_h.len() != encoder_hidden * attention_hidden {
            return Err(AttentionError::ShapeMismatch {
                expected: encoder_hidden * attention_hidden,
                found: w_h.len(),
            });
        }

        Ok(Self {
            w_s,
            w_h,
            v,
            projected: vec![0.0; max_source * attention_hidden],
            scores: vec![0.0; max_source],
            decoder_hidden,
            encoder_hidden,
            attention_hidden,
        })
    }

    /// Called ONCE per source sequence, not once per output step.
    pub fn project_encoder(
        &mut self,
        encoder_states: &[f64],
        source: usize,
    ) -> Result<(), AttentionError> {
        if encoder_states.len() != source * self.encoder_hidden {
            return Err(AttentionError::ShapeMismatch {
                expected: source * self.encoder_hidden,
                found: encoder_states.len(),
            });
        }

        let a = self.attention_hidden;
        self.projected[..source * a].fill(0.0);

        for (t, state) in encoder_states.chunks_exact(self.encoder_hidden).enumerate() {
            let target = &mut self.projected[t * a..(t + 1) * a];
            for (k, &value) in state.iter().enumerate() {
                let row = &self.w_h[k * a..(k + 1) * a];
                for (slot, weight) in target.iter_mut().zip(row) {
                    *slot += value * weight;
                }
            }
        }

        Ok(())
    }

    /// One output step. \`mask\` marks which source positions are real.
    pub fn step(
        &mut self,
        decoder_state: &[f64],
        encoder_states: &[f64],
        mask: &[bool],
        context: &mut [f64],
    ) -> Result<(), AttentionError> {
        let source = mask.len();
        if encoder_states.len() != source * self.encoder_hidden {
            return Err(AttentionError::MaskMismatch {
                source: encoder_states.len() / self.encoder_hidden,
                mask: source,
            });
        }
        if !mask.iter().any(|&live| live) {
            return Err(AttentionError::AllMasked);
        }

        let a = self.attention_hidden;
        let mut decoder_projection = vec![0.0_f64; a];
        for (k, &value) in decoder_state.iter().take(self.decoder_hidden).enumerate() {
            let row = &self.w_s[k * a..(k + 1) * a];
            for (slot, weight) in decoder_projection.iter_mut().zip(row) {
                *slot += value * weight;
            }
        }

        for t in 0..source {
            // MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
            // normalized over padding, so the context is wrong while training
            // proceeds without any error - the silent bug here.
            if !mask[t] {
                self.scores[t] = f64::NEG_INFINITY;
                continue;
            }

            let projected = &self.projected[t * a..(t + 1) * a];
            self.scores[t] = self
                .v
                .iter()
                .zip(decoder_projection.iter().zip(projected))
                .map(|(weight, (s, h))| weight * (s + h).tanh())
                .sum();
        }

        let largest = self.scores[..source]
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max);
        let mut partition = 0.0;
        for score in &mut self.scores[..source] {
            *score = (*score - largest).exp();
            partition += *score;
        }

        context.fill(0.0);
        for (t, state) in encoder_states.chunks_exact(self.encoder_hidden).enumerate() {
            let weight = self.scores[t] / partition;
            for (slot, value) in context.iter_mut().zip(state) {
                *slot += weight * value;
            }
        }

        Ok(())
    }
}

/// Length-normalized sequence score.
///
/// The raw score is a sum of log-probabilities and therefore decreases
/// monotonically with length, so a search over it prefers short outputs by
/// construction. Without this correction the model looks terse and the cause
/// is the search rather than the model.
#[must_use]
pub fn normalized_score(log_probability: f64, length: usize, alpha: f64) -> f64 {
    log_probability / (length as f64).powf(alpha)
}
`,
        rationale:
          'The encoder projection is hoisted out of the decoder loop and cached per source, removing a factor of the target length from the attention cost. Source padding is masked before the softmax rather than after — the silent bug in this architecture, since masking afterwards leaves the weights normalized over padding and the context vector wrong while training proceeds cleanly. Errors become a typed Result including the fully-masked case that would otherwise divide by zero, the beam width gets a newtype since it sits beside the maximum length at every call site, and length normalization is provided explicitly because the sequence score is biased toward short outputs by construction.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(T * h * a) once per source, then O(T * a) per output step — a factor of h removed from the inner loop.',
      },
      'make-it-fast': {
        code: `//! Attention - multiplicative scoring in BLAS, beam advanced as a batch.

use ndarray::{s, Array1, Array2, ArrayView1, ArrayView2, Axis};
use rayon::prelude::*;

/// Two changes.
///
/// The additive score becomes a dot product, which turns the whole attention
/// into one matrix product per step - exactly the move the transformer made,
/// trading a little expressiveness for a kernel the hardware is built for.
///
/// And the beam stops being a loop over hypotheses. A beam of width B is B
/// independent decoder states, so it becomes a BATCH dimension: one pass per
/// step for the whole beam rather than B of them.
pub struct BatchedAttention {
    /// (decoder_hidden, encoder_hidden) - one projection, not two plus a tanh.
    w: Array2<f32>,
}

impl BatchedAttention {
    #[must_use]
    pub fn new(w: Array2<f32>) -> Self {
        Self { w }
    }

    /// Attention for the entire beam in one pass.
    ///
    /// \`decoder_states\` is (beam, decoder_hidden); \`encoder_states\` is
    /// (source, encoder_hidden) for a single source sequence.
    #[must_use]
    pub fn step(
        &self,
        decoder_states: ArrayView2<f32>,
        encoder_states: ArrayView2<f32>,
        mask: &[bool],
    ) -> (Array2<f32>, Array2<f32>) {
        // One GEMM covering every (hypothesis, source position) pair. The
        // association matters: (S . W) . H^T never materializes a
        // (decoder, source) intermediate, where the other order would.
        let mut scores = decoder_states.dot(&self.w).dot(&encoder_states.t());

        // MASK BEFORE THE SOFTMAX. Masking afterwards leaves the weights
        // normalized over padding, so the context is wrong while training
        // proceeds cleanly - the silent bug in this architecture.
        for (t, &live) in mask.iter().enumerate() {
            if !live {
                scores.slice_mut(s![.., t]).fill(f32::NEG_INFINITY);
            }
        }

        // Rows are independent, so the softmax is a parallel map over
        // hypotheses with the max subtracted first - exp of a large score
        // overflows, and the naive form silently produces NaN.
        scores
            .axis_iter_mut(Axis(0))
            .into_par_iter()
            .for_each(|mut row| {
                let largest = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let mut partition = 0.0_f32;
                row.map_inplace(|value| {
                    *value = (*value - largest).exp();
                    partition += *value;
                });
                row.map_inplace(|value| *value /= partition);
            });

        let context = scores.dot(&encoder_states);
        (context, scores)
    }

    /// Top-k over the flattened (beam, vocab) grid.
    ///
    /// The naive beam loops over hypotheses, takes the top tokens of each,
    /// then sorts the union - three passes and a sort. Flattening makes it one
    /// selection over beam * vocab regardless of beam width.
    #[must_use]
    pub fn rank(
        beam_scores: ArrayView1<f32>,
        log_probabilities: ArrayView2<f32>,
        beam_width: usize,
    ) -> Vec<(usize, usize, f32)> {
        let vocab = log_probabilities.ncols();

        let mut combined: Vec<(usize, f32)> = Vec::with_capacity(beam_scores.len() * vocab);
        combined.par_extend(
            log_probabilities
                .axis_iter(Axis(0))
                .into_par_iter()
                .enumerate()
                .flat_map_iter(|(b, row)| {
                    let base = beam_scores[b];
                    row.into_iter()
                        .enumerate()
                        .map(move |(token, &value)| (b * vocab + token, base + value))
                        .collect::<Vec<_>>()
                }),
        );

        // select_nth_unstable, not a full sort: the top-k is an O(n)
        // selection and ordering the rest is discarded work.
        let split = beam_width.min(combined.len());
        combined.select_nth_unstable_by(split - 1, |a, b| b.1.total_cmp(&a.1));
        combined.truncate(split);
        combined.sort_unstable_by(|a, b| b.1.total_cmp(&a.1));

        combined
            .into_iter()
            .map(|(flat, score)| (flat / vocab, flat % vocab, score))
            .collect()
    }
}
`,
        rationale:
          'Additive scoring becomes multiplicative, turning the attention into one BLAS matrix product per step — the move the transformer made, trading expressiveness for a kernel the hardware is built for. The beam becomes a batch dimension rather than a loop, so a step is one pass for every hypothesis, and the softmax over independent rows is a parallel map. Top-k selection flattens the beam-by-vocabulary grid and uses a linear-time selection rather than a loop plus a full sort, since ordering the discarded candidates is work whose result is thrown away.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Scoring and the context are each one GEMM covering the whole beam, replacing a loop over hypotheses each doing its own reduction.',
            tradeoff: 'Binds the build to a system BLAS, and multiplicative scoring needs a scale factor as dimensions grow or the dot products saturate the softmax into near-one-hot weights that pass almost no gradient.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Softmax rows and the per-hypothesis score expansion are independent, so both are parallel maps with no shared mutable state.',
            tradeoff: 'A beam is typically fewer than ten rows, so the parallel softmax is often dominated by fork-join overhead — the win is in the vocabulary-sized expansion, not the beam-sized one.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The flattened candidate grid is sized to beam times vocabulary before being filled, so a parallel extend never reallocates while workers are producing into it.',
            tradeoff: 'Materializes the full beam-by-vocabulary grid, which for a large vocabulary is a substantial allocation per decode step — a top-k that streamed would avoid it at the cost of a much more intricate reduction.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'O(B * T * h) per decode step for the whole beam, versus B separate passes. Illustrative, not a measured benchmark.',
      },
    },
  },
};
