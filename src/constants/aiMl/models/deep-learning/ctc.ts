import type { AiMlModel } from '../../types';

/**
 * CTC — the first `kind: 'technique'` entry in this category.
 *
 * It is a loss function and an output layer, not an architecture: it sits on
 * top of any frame-synchronous encoder and supplies the training signal when
 * the alignment between input and output is unknown. Included because the
 * forward-backward dynamic program is the clearest example in the whole
 * reference of an exact marginalization over an exponential latent space —
 * no bound, no sampling, no approximation.
 */
export const CTC: AiMlModel = {
  slug: 'ctc',
  name: 'Connectionist Temporal Classification',
  aliases: ['CTC', 'CTC loss', 'Alignment-free sequence loss', 'Best-path decoding'],
  category: 'deep-learning',
  group: 'sequence',
  kind: 'technique',

  paradigms: ['supervised'],
  taskTypes: ['sequence-modeling', 'classification'],
  architecture: 'hybrid',
  paradigmNote:
    'A technique rather than a model: CTC is an output layer and a loss, deliberately agnostic to what produced the frames. The encoder underneath it has been recurrent, convolutional and more recently a transformer, and the loss is unchanged in each case — which is precisely why it is worth learning separately from any one of them.',

  intuition:
    'You have a thousand audio frames and a nine-character transcript, and nobody has told you which frames belong to which character. Rather than guess an alignment, add a blank symbol meaning "emit nothing here" and score every alignment that collapses to the transcript, summing them all. There are exponentially many, but because the alignment can only move forward, the sum factorizes into a two-pass dynamic program that computes it exactly.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\mathcal{L}(\\theta) = -\\sum_{i=1}^{n} \\log \\sum_{\\pi \\in \\mathcal{B}^{-1}(\\mathbf{y}_i)} \\prod_{t=1}^{T_i} p_\\theta\\bigl(\\pi_t \\mid \\mathbf{x}_i\\bigr)',
      symbols: [
        { symbol: '\\pi', meaning: 'an alignment — exactly one symbol per input frame, blank allowed' },
        { symbol: '\\mathcal{B}', meaning: 'the collapse map: merge runs of identical symbols, then delete every blank' },
        { symbol: '\\mathcal{B}^{-1}(\\mathbf{y})', meaning: 'every length-T alignment that collapses to the target — exponentially many of them' },
        { symbol: 'p_\\theta(\\pi_t \\mid \\mathbf{x})', meaning: 'the encoder softmax at frame t over the label set plus blank' },
        { symbol: 'T_i', meaning: 'input length in frames; must be at least the target length plus one blank per repeated pair' },
      ],
    },
    reading:
      'Read the inner sum as a marginalization: the alignment is a latent variable and it is integrated out rather than estimated. The loss is then an ordinary negative log-likelihood of the label sequence given the input. Two things are worth pausing on. First, the product inside means the model treats frames as conditionally independent given the input — there is no term coupling one output to the next, which is the single most consequential thing about CTC. Second, the sum is exact: unlike an ELBO, nothing is bounded and nothing is sampled, because the monotonicity of the alignment gives the latent space a Markov structure a dynamic program can traverse.',
  },

  optimization: {
    method: 'Forward-backward dynamic programming over the alignment lattice, differentiated in closed form and minimized by Adam',
    updateRule: {
      formula:
        '\\frac{\\partial \\mathcal{L}}{\\partial a_t^k} = p_t^k - \\underbrace{\\frac{1}{Z}\\sum_{s\\,:\\,\\ell\'_s = k} \\alpha_t(s)\\,\\beta_t(s)}_{\\gamma_t(k)}, \\qquad Z = \\alpha_T(S) + \\alpha_T(S-1)',
      symbols: [
        { symbol: 'a_t^k', meaning: 'the pre-softmax logit for label k at frame t — the gradient is taken here, not at the probability' },
        { symbol: '\\alpha_t(s)', meaning: 'forward score: every path consuming the extended target up to position s by frame t' },
        { symbol: '\\beta_t(s)', meaning: 'backward score: every way frames t+1..T finish the extended target from position s' },
        { symbol: '\\ell\'', meaning: 'the target with a blank inserted before, between and after every label; length S = 2U+1' },
        { symbol: '\\gamma_t(k)', meaning: 'posterior occupancy — the probability that frame t emits k, summed over all alignments' },
        { symbol: 'Z', meaning: 'the marginal likelihood; a valid path ends on the final label or the trailing blank' },
      ],
    },
    rationale:
      'The whole method is one observation: because the collapse map only ever moves forward through the extended target, the exponential sum over alignments has the structure of a chain, and forward-backward computes it exactly in O(T·S). The gradient then arrives in a form worth memorizing — softmax minus target, where the target is the posterior occupancy rather than a one-hot vector. That is the only structural difference between CTC and ordinary per-frame cross-entropy: same gradient shape, soft target computed by a dynamic program instead of read from a label file. Everything is done in log space with log-sum-exp; a thousand-frame utterance underflows to exactly zero in probability space, and the failure is a NaN rather than a warning.',
    hyperparameters: [
      { name: 'time subsampling factor', role: 'How much the encoder downsamples in time; too aggressive and T drops below the extended target length, making the loss infinite', typicalRange: '2x to 8x' },
      { name: 'blank index', role: 'Not tuned but a hard contract — training, loss and decoder must agree, and a mismatch fails silently', typicalRange: '0 or the last index' },
      { name: 'beam width (decoding)', role: 'Width of the prefix beam search; 1 is greedy best-path decoding', typicalRange: '1 to 500' },
      { name: 'language-model weight', role: 'How much an external LM is trusted, since the loss provides no output-to-output dependency of its own', typicalRange: '0.0 to 3.0' },
      { name: 'insertion bonus', role: 'Counteracts the LM and blank bias systematically shortening the output', typicalRange: '0.0 to 5.0' },
      { name: 'gradient clip norm', role: 'CTC gradients spike hard on near-impossible alignments early in training', typicalRange: '1 to 400' },
    ],
    convergence:
      'The dynamic program is exact, so the gradient is unbiased and there is no estimator variance to fight — but the surface is the encoder’s, non-convex, with one characteristic and very recognizable failure. Early in training the cheapest way to reduce the loss is to predict blank everywhere, so the model does exactly that, the loss plateaus at the score of the all-blank path, and it can sit there for thousands of steps before any label emerges. The other failure is a length violation: if T is shorter than the extended target the likelihood is genuinely zero and the loss is infinite, and the usual mitigation of zeroing infinite losses quietly trains the model on a length-biased subset of the data. Converged CTC posteriors are also famously peaky — near-blank at almost every frame with narrow spikes — which is a property of the objective and not a defect, but it makes the alignments unsafe to read as timings.',
    complexity:
      'O(T · S) per sequence for forward-backward, with S = 2U+1 — linear in both input and output length, and negligible beside the encoder that produced the frames. Sequential in T and fully parallel across the batch and across the state axis. Prefix beam decoding with a language model is a different matter and is usually the dominant inference cost.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The collapse map deletes blanks and merges repeats, which discards duration and timing outright — the two things a forecast is made of. CTC produces an unaligned symbol sequence from a longer signal; forecasting asks for values at specified future instants, and there is no target sequence shorter than the input to marginalize over.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'It is a supervised loss requiring a target label sequence per example, with no notion of normality, density or outlyingness; the per-frame posterior is a confidence over labels, not a measure of how unusual the input was.',
      },
      optimization: {
        fit: 'primary',
        how: 'The technique *is* a dynamic program, and it is the cleanest instance in this reference of exact inference over an exponential space. The lattice has T·S cells; the exponentially many alignments through it are summed by two linear passes because the recursion has only three legal predecessors per cell — stay, advance one, or skip the blank when the next label is not a repeat. Decoding then poses a second and separate optimization problem: find the highest-probability *label sequence*, which is not the collapse of the highest-probability *alignment*, because many alignments collapse to the same output. Prefix beam search is the tractable heuristic, and the gap between it and the true answer is real.',
        where: [
          'Forward-backward over the alignment lattice as the canonical exact-marginalization dynamic program, alongside HMM inference and belief propagation',
          'Log-sum-exp in the semiring position of a sum-product recursion — swap it for max-plus and the same code becomes Viterbi',
          'Prefix beam search as a bounded-width heuristic over label sequences, distinct from the best-path shortcut that is exact only for the alignment',
          'Length and insertion penalties as explicit corrections to a scoring function that is biased by construction',
        ],
        why: 'Worth studying because it is a rare case where a hard combinatorial problem is solved exactly rather than approximated, and the reason is structural and legible: monotonicity of the alignment makes the latent space a chain. The contrast with variational inference is the lesson — a VAE bounds its marginal because the latent has no such structure, while CTC computes the same kind of quantity exactly because it does. The decoding half then teaches the opposite lesson: greedy best-path decoding is exact for the wrong question, and the distinction between the most likely alignment and the most likely output catches people who have used the loss for years.',
        featurization: [
          'Run every recursion in log space with log-sum-exp; probability space underflows to zero in a few hundred frames and reports it as a NaN',
          'Precompute the skip-legality mask once per target rather than testing the repeat condition inside the frame loop',
          'Represent the extended target explicitly with blanks interleaved; the special cases people write to avoid materializing it are where the bugs live',
          'Swap log-sum-exp for max to obtain Viterbi alignment from identical code, which is the right way to extract timings if you need them',
        ],
        evaluation:
          'Check the dynamic program against brute-force enumeration over every alignment on a toy instance — a handful of frames and two labels — which is the only way to be sure the skip condition is right. Verify that the posterior occupancy sums to one at every frame; it is a cheap invariant that catches most implementation errors immediately. For decoding, compare greedy, prefix beam and exhaustive enumeration on short inputs where exhaustive is feasible, and read the gap as the cost of the heuristic.',
        pitfalls: [
          'Allowing the skip transition into a repeated label, which silently over-counts paths and yields a loss that is too low but never obviously wrong',
          'Confusing best-path decoding with maximum-likelihood decoding — the first is exact for the alignment and merely a heuristic for the output',
          'Reading the peaky posterior as an alignment; it locates the spike, not the extent of the symbol',
          'Zeroing infinite losses on length-violating examples, which silently biases training toward short targets',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'The formulation automatic speech recognition was rebuilt on. An encoder turns a spectrogram into one distribution per frame over the character or subword set plus blank; CTC supplies the loss without any frame-level alignment, replacing the forced-alignment stage that HMM-based systems required. At inference, greedy decoding collapses the per-frame argmax, or a prefix beam search fuses in an external language model.',
        where: [
          'End-to-end speech recognition, including the streaming systems where frame-synchronous output is the requirement rather than a preference',
          'Keyword spotting and wake-word detection, where the target is a single short label sequence in a long stream',
          'Phoneme recognition and pronunciation modelling, the task the technique was introduced on',
          'The alignment-free half of hybrid CTC/attention systems, where a CTC head regularizes an attention decoder and enforces monotonicity it does not otherwise have',
        ],
        why: 'It removed the requirement for a frame-aligned corpus, which was the practical bottleneck in speech for two decades — transcripts are cheap and alignments are not. Against it: the conditional independence across frames means the acoustic model carries no language model of its own, so an external LM is not a refinement but a necessity on open vocabulary, and a CTC system without one makes spelling errors no human would. It is also strictly monotonic, which is why the same era gave machine translation to attention-based encoder-decoders instead — reordering is exactly what CTC cannot express.',
        featurization: [
          'Subword or character targets rather than words, which keeps the label set small and removes the unknown-token problem',
          'Pass true pre-padding input lengths into the loss; padded frames included in T inflate the marginal and corrupt every gradient in the batch',
          'Check the subsampled frame count against the extended target length per example before the batch is formed, not after the loss returns infinity',
          'Feed log-probabilities, not probabilities — every mainstream implementation expects log-softmax output and reports nothing if given the wrong one',
        ],
        evaluation:
          'Word and character error rate on a held-out set, always reported with the decoding configuration and the language model attached — a CTC model quoted without its LM and beam width is not a comparable number. Track the blank emission rate as a training diagnostic: a rate near one means the model is stuck on the all-blank plateau.',
        pitfalls: [
          'Comparing CTC against an attention decoder without matching decode-time language models, which measures the LM rather than the acoustic model',
          'Blank index disagreeing between the loss and the decoder, which produces fluent nonsense with no error anywhere',
          'Expecting word timings from the posterior; the spikes are not extents, and Viterbi alignment is the correct tool',
          'Over-subsampling in time to save encoder compute, which makes long targets unrepresentable and the loss infinite',
        ],
      },
      'computer-vision': {
        fit: 'viable',
        how: 'The standard recognition head for text in images. A convolutional encoder reduces a cropped line image to a left-to-right sequence of column features, a recurrent or attention layer contextualizes them, and CTC trains the whole stack against the transcription alone — no character bounding boxes, which is the entire appeal. The reading order of a text line is monotonic, so the assumption CTC makes is genuinely true here rather than merely tolerated.',
        where: [
          'Scene-text and document OCR recognition, where CTC has been the default head for line-level recognition',
          'Handwriting recognition, both offline images and online pen trajectories',
          'Licence-plate and meter reading, where the label set is small and constrained and the technique is hard to beat',
          'Continuous sign-language recognition, where the gloss sequence is monotonic in the video',
        ],
        why: 'The labelling economics are even better than in speech: annotating a transcription per line is minutes of work, annotating per-character boxes is hours, and CTC makes the difference free. On constrained alphabets — digits, plates, forms — the absence of an implicit language model barely matters, so the main objection to CTC largely disappears and it beats more elaborate heads at a fraction of the cost. It falls apart on curved, rotated or multi-line text, where the left-to-right monotonic assumption is simply false and a rectification stage or an attention decoder is required.',
        featurization: [
          'Rectify and normalize line height before the encoder; CTC assumes a monotonic left-to-right reading order and cannot recover one that is not there',
          'Keep enough width after downsampling that the column count exceeds the character count with repeats — narrow images with long labels are the usual source of infinite loss',
          'Augment with the distortions the deployment actually contains, since the head is only as good as the column features it is handed',
          'Segment into lines before recognition rather than after; the technique has no way to express two lines at once',
        ],
        evaluation:
          'Character and word accuracy per line, stratified by image quality and by label length — aggregate accuracy hides that long lines fail disproportionately. Include an explicit count of examples rejected for length violation, which is otherwise invisible.',
        pitfalls: [
          'Curved or rotated text violating monotonicity, which no amount of training fixes',
          'Aggressive width downsampling making long labels unrepresentable, seen as infinite loss on exactly the hardest examples',
          'Adjacent identical characters collapsing when the encoder resolution is too coarse to place a blank between them',
          'Evaluating on cropped ground-truth lines and deploying on detector output, where the accuracy drop comes from the detector rather than the head',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The loss itself is negligible — O(T·S) of scalar arithmetic against an encoder doing matrix products, typically a low single-digit percentage of step time even in a naive implementation. What costs is the encoder and the sequence length; the loss is only ever the bottleneck when it runs unbatched on CPU while the encoder is on the accelerator.',
    inferenceProfile:
      'The loss does not exist at inference; what remains is the encoder plus a decode. Greedy best-path decoding is one argmax per frame and a collapse, which is microseconds and streams naturally — output can be emitted as frames arrive, which is the property that keeps CTC in production for streaming recognition. Prefix beam search with a language model is orders of magnitude more expensive and is usually the largest single line item in a CTC serving budget.',
    retrainingCadence:
      'Driven by the encoder and the domain, not by the loss: quarterly or on acoustic or visual domain shift. The decoder-side language model is retrained far more often than the acoustic model, since vocabulary drifts faster than acoustics.',
    driftAndMonitoring: [
      'Track the blank emission rate; a rise toward one is the all-blank collapse reappearing, and it is visible long before error rate moves',
      'Count examples rejected for length violation every epoch — a nonzero and growing count means subsampling and target length have drifted apart',
      'Assert that posterior occupancy sums to one per frame in a test, as a permanent guard on the forward-backward implementation',
      'Monitor error rate separately by target length; CTC degrades on long sequences first, and the aggregate hides it',
    ],
    productionGotchas: [
      'The blank index is a contract between training, loss and decoder. Off by one and the system produces confident nonsense with no error raised anywhere — the single most common CTC bug',
      'Every implementation expects log-probabilities; passing probabilities trains a model that converges to something plausible and wrong',
      'Input lengths must be the true pre-padding lengths. Padding counted into T adds alignments through padded frames and corrupts the gradient for the whole batch',
      'Zeroing infinite losses to keep training alive silently drops the length-violating examples, biasing the model toward short targets',
      'The loss assumes conditional independence, so a language model applied at decode time is part of the system and must be versioned with the acoustic model',
    ],
  },

  assumptions: [
    'The alignment between input and output is monotonic — the output is consumed left to right with no reordering, which is what makes the dynamic program possible and what rules out translation',
    'The input is at least as long as the target with one blank wedged between every pair of repeated labels; otherwise the likelihood is exactly zero',
    'Outputs are conditionally independent across frames given the input, so any dependency between adjacent labels must come from outside the model',
    'Frames arrive on a common clock — the encoder is frame-synchronous and emits exactly one distribution per input step',
    'One target label sequence per example is available, and no frame-level alignment is needed or assumed',
  ],

  pros: [
    {
      point: 'Trains on unaligned pairs, removing the forced-alignment stage entirely',
      context:
        'The whole reason it exists, and the reason end-to-end speech and OCR became practical — transcripts cost minutes to annotate and alignments cost hours. Worth nothing if you already have frame-level labels, in which case plain cross-entropy is simpler and stronger.',
    },
    {
      point: 'Marginalizes exactly rather than bounding or sampling',
      context:
        'Unlike an ELBO or a policy-gradient estimator, the gradient is exact and has no variance to fight, because the monotonic latent space has chain structure. Directly comparable to HMM forward-backward, and the reason CTC training is boringly stable once past the blank plateau.',
    },
    {
      point: 'Frame-synchronous, so decoding streams',
      context:
        'Output can be emitted as frames arrive, which is decisive for live captioning and dictation. An attention decoder must see the whole utterance before it emits anything, and no amount of engineering removes that.',
    },
    {
      point: 'A loss, not an architecture — the encoder is free',
      context:
        'The same objective has served recurrent, convolutional and transformer encoders unchanged, so it survives architectural fashion. It also composes: a CTC head bolted onto an attention model regularizes it and enforces monotonicity the attention lacks.',
    },
    {
      point: 'Cheap enough to ignore',
      context:
        'O(T·S) beside an encoder doing matrix products means the loss is a rounding error in the training budget. Relevant because it makes the exactness free — there is no accuracy-for-speed trade to consider.',
    },
  ],

  cons: [
    {
      point: 'Conditional independence across frames means no implicit language model',
      context:
        'Decisive on open-vocabulary speech, where a CTC system without an external LM makes spelling errors no human would; nearly irrelevant on constrained alphabets like digits or licence plates, where the objection largely evaporates.',
    },
    {
      point: 'Strictly monotonic alignment',
      context:
        'Rules out translation, any reordering, and curved or multi-line text. Exactly why machine translation went to attention-based encoder-decoders while speech stayed with CTC — the assumption is true in one domain and false in the other.',
    },
    {
      point: 'Peaky posteriors make the alignment unsafe to read',
      context:
        'Fine when the transcript is all you want; wrong tool when you need timings or extents, and people ship word-level timestamps from CTC spikes without realizing the spike marks a position, not a duration. Viterbi over the same lattice is the correct tool.',
    },
    {
      point: 'Silent failure on length violation',
      context:
        'A target longer than the input has genuinely zero likelihood and infinite loss. The standard mitigation zeroes those batches, which keeps training alive and biases the model toward short targets without ever logging that it happened.',
    },
    {
      point: 'The blank plateau at the start of training',
      context:
        'Predicting blank everywhere is the locally cheapest thing to do, so the model does it and can stay there for thousands of steps. Harmless once recognized, but indistinguishable from a broken implementation if you have not seen it before.',
    },
  ],

  relatedSlugs: ['seq2seq-attention', 'rnn', 'lstm', 'transformer', 'hidden-markov-model'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""CTC loss and gradient, transcribed the way the definition reads.

The alignment between T input frames and U output labels is unknown. CTC adds
a blank symbol meaning "emit nothing here", scores every alignment that
collapses to the target, and sums them. There are exponentially many, but the
collapse map only moves forward, so a two-pass dynamic program computes the
sum exactly.

Probability space, no log-sum-exp, no libraries. This underflows to zero past
a few hundred frames, which is the first thing the next stage fixes.
"""

import math

BLANK = 0


def extend_with_blanks(targets):
    """[a, b] becomes [blank, a, blank, b, blank]. Length 2U + 1."""
    extended = [BLANK]
    for label in targets:
        extended.append(label)
        extended.append(BLANK)
    return extended


def ctc_loss_and_grad(probs, targets):
    """probs is T rows of K per-frame probabilities. Returns (loss, dL/dlogits)."""
    num_frames = len(probs)
    num_labels = len(probs[0])
    ext = extend_with_blanks(targets)
    num_states = len(ext)

    # ----- forward pass -------------------------------------------------
    # alpha[t][s]: total probability of every path that has consumed the
    # extended target up to position s after t + 1 frames, with frame t
    # emitting ext[s]. The emission at t is included in the value.
    alpha = [[0.0] * num_states for _ in range(num_frames)]
    alpha[0][0] = probs[0][BLANK]
    if num_states > 1:
        alpha[0][1] = probs[0][ext[1]]

    for frame in range(1, num_frames):
        for state in range(num_states):
            # Three legal predecessors and no more: stay where you are,
            # advance one position, or skip a blank entirely.
            total = alpha[frame - 1][state]
            if state >= 1:
                total += alpha[frame - 1][state - 1]
            # The skip is legal only into a real label, and only when that
            # label is not a repeat of the one two positions back: two
            # identical labels in a row MUST keep the blank between them,
            # or the collapse map would merge them into one.
            if state >= 2 and ext[state] != BLANK and ext[state] != ext[state - 2]:
                total += alpha[frame - 1][state - 2]
            alpha[frame][state] = total * probs[frame][ext[state]]

    # A valid path ends on the final label or on the trailing blank.
    likelihood = alpha[num_frames - 1][num_states - 1]
    if num_states > 1:
        likelihood += alpha[num_frames - 1][num_states - 2]

    # ----- backward pass ------------------------------------------------
    # beta[t][s]: probability that frames t + 1 .. T finish the extended
    # target from position s, given frame t emitted ext[s]. Excludes the
    # emission at t, so alpha * beta is exactly the paths through (t, s).
    beta = [[0.0] * num_states for _ in range(num_frames)]
    beta[num_frames - 1][num_states - 1] = 1.0
    if num_states > 1:
        beta[num_frames - 1][num_states - 2] = 1.0

    for frame in range(num_frames - 2, -1, -1):
        for state in range(num_states):
            total = beta[frame + 1][state] * probs[frame + 1][ext[state]]
            if state + 1 < num_states:
                total += beta[frame + 1][state + 1] * probs[frame + 1][ext[state + 1]]
            if (
                state + 2 < num_states
                and ext[state + 2] != BLANK
                and ext[state + 2] != ext[state]
            ):
                total += beta[frame + 1][state + 2] * probs[frame + 1][ext[state + 2]]
            beta[frame][state] = total

    # ----- gradient -----------------------------------------------------
    # gamma[t][s] = alpha * beta / Z is the posterior probability that frame t
    # sits at extended position s. Summed over s it is 1.0 for every frame,
    # which is the cheapest correctness check there is.
    grad = [[0.0] * num_labels for _ in range(num_frames)]
    for frame in range(num_frames):
        occupancy = [0.0] * num_labels
        for state in range(num_states):
            posterior = alpha[frame][state] * beta[frame][state] / likelihood
            occupancy[ext[state]] += posterior
        # Softmax minus target, where the target is the posterior occupancy
        # instead of a one-hot vector. That single substitution is the whole
        # difference between CTC and per-frame cross-entropy.
        for label in range(num_labels):
            grad[frame][label] = probs[frame][label] - occupancy[label]

    return -math.log(likelihood), grad


def greedy_decode(probs):
    """Best path: argmax per frame, merge runs, then drop blanks.

    Exact for the most likely ALIGNMENT and merely a heuristic for the most
    likely OUTPUT, because many alignments collapse to the same label
    sequence and this counts only the single best one.
    """
    best_per_frame = [max(range(len(row)), key=row.__getitem__) for row in probs]
    collapsed = []
    previous = None
    for label in best_per_frame:
        if label != previous and label != BLANK:
            collapsed.append(label)
        previous = label
    return collapsed


def brute_force_likelihood(probs, targets):
    """Enumerate every alignment. Only tractable for a toy case - and the only
    way to be certain the skip condition above is right."""
    num_frames = len(probs)
    num_labels = len(probs[0])
    total = 0.0

    def collapse(path):
        out = []
        previous = None
        for label in path:
            if label != previous and label != BLANK:
                out.append(label)
            previous = label
        return out

    def walk(path):
        nonlocal total
        if len(path) == num_frames:
            if collapse(path) == list(targets):
                score = 1.0
                for frame, label in enumerate(path):
                    score *= probs[frame][label]
                total += score
            return
        for label in range(num_labels):
            walk(path + [label])

    walk([])
    return total
`,
        profile:
          'O(T * S) cells, each a handful of Python float operations, plus a full K-wide gradient row per frame. Illustrative, not a measured benchmark: a 1000-frame utterance is roughly a million interpreter iterations, and underflows to a NaN before it finishes being slow.',
      },

      'make-it-right': {
        code: `"""CTC in log space, with the precondition that makes the loss finite checked.

Identical dynamic program. The arithmetic moves into log space so a long
utterance does not underflow, the length precondition is asserted rather than
discovered as an infinity, and the two things that always travel together -
loss and gradient - are returned together.
"""

from __future__ import annotations

import math
from typing import NamedTuple, Sequence

BLANK: int = 0
NEG_INF: float = -math.inf


class CtcResult(NamedTuple):
    """Loss, gradient and marginal share one forward-backward pass."""

    loss: float
    logit_grad: list[list[float]]
    log_likelihood: float


class AlignmentImpossible(ValueError):
    """No alignment exists. Raised, rather than returned as an infinite loss."""


def log_add(left: float, right: float) -> float:
    """log(exp(left) + exp(right)), stable and total on negative infinity."""
    if left == NEG_INF:
        return right
    if right == NEG_INF:
        return left
    high, low = (left, right) if left > right else (right, left)
    return high + math.log1p(math.exp(low - high))


def extend_with_blanks(targets: Sequence[int]) -> list[int]:
    """Interleave blanks: [a, b] becomes [blank, a, blank, b, blank]."""
    extended: list[int] = [BLANK]
    for label in targets:
        extended.append(label)
        extended.append(BLANK)
    return extended


def minimum_frames(targets: Sequence[int]) -> int:
    """Target length plus one forced blank per repeated adjacent pair."""
    repeats = sum(1 for left, right in zip(targets, targets[1:]) if left == right)
    return len(targets) + repeats


def skip_allowed(extended: Sequence[int]) -> list[bool]:
    """Precompute the repeat condition once per target, not once per cell."""
    return [
        state >= 2
        and extended[state] != BLANK
        and extended[state] != extended[state - 2]
        for state in range(len(extended))
    ]


def _forward(
    log_probs: Sequence[Sequence[float]],
    extended: Sequence[int],
    can_skip: Sequence[bool],
) -> list[list[float]]:
    num_frames, num_states = len(log_probs), len(extended)
    log_alpha = [[NEG_INF] * num_states for _ in range(num_frames)]
    log_alpha[0][0] = log_probs[0][BLANK]
    if num_states > 1:
        log_alpha[0][1] = log_probs[0][extended[1]]

    for frame in range(1, num_frames):
        previous = log_alpha[frame - 1]
        current = log_alpha[frame]
        for state in range(num_states):
            total = previous[state]
            if state >= 1:
                total = log_add(total, previous[state - 1])
            if can_skip[state]:
                total = log_add(total, previous[state - 2])
            current[state] = total + log_probs[frame][extended[state]]
    return log_alpha


def _backward(
    log_probs: Sequence[Sequence[float]],
    extended: Sequence[int],
    can_skip: Sequence[bool],
) -> list[list[float]]:
    num_frames, num_states = len(log_probs), len(extended)
    log_beta = [[NEG_INF] * num_states for _ in range(num_frames)]
    log_beta[num_frames - 1][num_states - 1] = 0.0
    if num_states > 1:
        log_beta[num_frames - 1][num_states - 2] = 0.0

    for frame in range(num_frames - 2, -1, -1):
        nxt = log_beta[frame + 1]
        emit = log_probs[frame + 1]
        current = log_beta[frame]
        for state in range(num_states):
            total = nxt[state] + emit[extended[state]]
            if state + 1 < num_states:
                total = log_add(total, nxt[state + 1] + emit[extended[state + 1]])
            if state + 2 < num_states and can_skip[state + 2]:
                total = log_add(total, nxt[state + 2] + emit[extended[state + 2]])
            current[state] = total
    return log_beta


def ctc_loss(
    log_probs: Sequence[Sequence[float]],
    targets: Sequence[int],
) -> CtcResult:
    """Negative log marginal likelihood of the target over every alignment.

    log_probs must be log-softmax output, T rows of K. Passing probabilities
    instead trains a model that converges to something plausible and wrong,
    and nothing in the arithmetic will complain.
    """
    # Guard clauses first. Each of these is a real production failure and each
    # one is silent if it is allowed through.
    if not log_probs:
        raise AlignmentImpossible("no frames were supplied")
    if BLANK in targets:
        raise AlignmentImpossible("the blank index cannot appear in the target")

    required = minimum_frames(targets)
    if len(log_probs) < required:
        raise AlignmentImpossible(
            f"{len(log_probs)} frames cannot cover a target needing {required}"
        )

    extended = extend_with_blanks(targets)
    can_skip = skip_allowed(extended)
    num_frames, num_states = len(log_probs), len(extended)

    log_alpha = _forward(log_probs, extended, can_skip)
    log_beta = _backward(log_probs, extended, can_skip)

    log_z = log_alpha[num_frames - 1][num_states - 1]
    if num_states > 1:
        log_z = log_add(log_z, log_alpha[num_frames - 1][num_states - 2])
    if log_z == NEG_INF:
        raise AlignmentImpossible("the lattice admits no path to the target")

    num_labels = len(log_probs[0])
    logit_grad: list[list[float]] = []
    for frame in range(num_frames):
        occupancy = [0.0] * num_labels
        for state in range(num_states):
            log_gamma = log_alpha[frame][state] + log_beta[frame][state] - log_z
            if log_gamma != NEG_INF:
                occupancy[extended[state]] += math.exp(log_gamma)
        logit_grad.append(
            [
                math.exp(log_probs[frame][label]) - occupancy[label]
                for label in range(num_labels)
            ]
        )

    return CtcResult(loss=-log_z, logit_grad=logit_grad, log_likelihood=log_z)


def occupancy_sums_to_one(result: CtcResult, tolerance: float = 1e-6) -> bool:
    """Permanent invariant: the gradient row must sum to zero at every frame.

    Softmax sums to one, posterior occupancy sums to one, so the difference
    sums to zero. Cheapest possible guard on a forward-backward pass, and it
    catches nearly every way the skip condition can be written wrongly.
    """
    return all(abs(sum(row)) < tolerance for row in result.logit_grad)
`,
        rationale:
          'Every recursion moves into log space with a log-sum-exp that is total on negative infinity, which is not a refinement but the difference between a function that works on real utterances and one that returns NaN past a few hundred frames. The length precondition — target length plus one blank per repeated pair — is checked before any work rather than surfacing as an infinite loss, and it is raised as a specific exception so a caller can drop the example deliberately instead of zeroing infinities and silently training on a length-biased subset. The repeat condition governing the skip transition is precomputed once per target rather than re-evaluated in every cell, which removes the place that condition is most often written wrongly. Loss, gradient and marginal come back in one NamedTuple because they are produced by one pass and separating them invites a second.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        profile:
          'Same O(T * S) cells, now three log_add calls each instead of three multiplications. Illustrative, not a measured benchmark: log space costs perhaps two to three times the arithmetic and buys numerical validity at any sequence length, which is not a trade so much as a correction.',
      },

      'make-it-fast': {
        code: `"""Batched CTC in log space. The frame loop stays; everything inside it goes.

The recursion over frames is genuinely sequential - frame t needs frame t - 1
and no reformulation changes that. Everything else is not. The state axis
becomes three shifted slices added together, the batch axis becomes a leading
dimension, and T * S * B interpreter iterations become T iterations over whole
arrays.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

BLANK = 0
FLOAT = np.float32


class BatchedCtc:
    """Owns the scratch buffers. Allocating them once is the optimization."""

    def __init__(self, batch: int, num_states: int, num_labels: int) -> None:
        shape = (batch, num_states)
        self._num_labels = num_labels
        # Three shifted views of the previous frame, plus the emission row.
        # Pre-allocated so the frame loop never touches the allocator.
        self._stay = np.empty(shape, dtype=FLOAT)
        self._step = np.empty(shape, dtype=FLOAT)
        self._skip = np.empty(shape, dtype=FLOAT)
        self._emit = np.empty(shape, dtype=FLOAT)
        self._scratch = np.empty(shape, dtype=FLOAT)

    def __call__(
        self,
        log_probs: NDArray[np.float32],
        targets: NDArray[np.int32],
        input_lengths: NDArray[np.int32],
        target_lengths: NDArray[np.int32],
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """log_probs is (T, B, K), time-major so one frame is contiguous.

        Time-major is not a stylistic choice: the inner operation reads a whole
        frame across the batch, and in batch-major layout that read is strided.
        """
        num_frames, batch, num_labels = log_probs.shape
        log_probs = np.ascontiguousarray(log_probs, dtype=FLOAT)
        max_target = targets.shape[1]
        num_states = 2 * max_target + 1

        # ext[b, s]: extended targets for the whole batch at once, blanks on
        # even positions. One vectorized write instead of B * S appends.
        ext = np.full((batch, num_states), BLANK, dtype=np.int32)
        ext[:, 1::2] = targets

        # Skip legality is a property of the target, not of the frame, so it
        # is computed once for the batch rather than B * T * S times.
        can_skip = np.zeros((batch, num_states), dtype=bool)
        can_skip[:, 2:] = (ext[:, 2:] != BLANK) & (ext[:, 2:] != ext[:, :-2])

        states = np.arange(num_states, dtype=np.int32)
        live = states[None, :] < (2 * target_lengths[:, None] + 1)
        rows = np.arange(batch, dtype=np.int32)[:, None]

        log_alpha = np.full((num_frames, batch, num_states), -np.inf, dtype=FLOAT)
        log_alpha[0, :, 0] = log_probs[0, rows[:, 0], BLANK]
        log_alpha[0, :, 1] = log_probs[0, rows[:, 0], ext[:, 1]]

        self._recurse(log_probs, ext, can_skip, live, rows, log_alpha, forward=True)

        log_beta = np.full((num_frames, batch, num_states), -np.inf, dtype=FLOAT)
        end = input_lengths - 1
        tail = 2 * target_lengths
        log_beta[end, rows[:, 0], tail] = 0.0
        log_beta[end, rows[:, 0], np.maximum(tail - 1, 0)] = 0.0
        self._recurse(log_probs, ext, can_skip, live, rows, log_beta, forward=False)

        # Gather the marginal from each sequence's own final frame, not from a
        # shared T - 1 that padded sequences never reach.
        final = log_alpha[end, rows[:, 0], :]
        log_z = np.logaddexp(
            final[rows[:, 0], tail], final[rows[:, 0], np.maximum(tail - 1, 0)]
        )

        # gamma = alpha + beta - Z, exponentiated and scattered onto labels.
        log_gamma = log_alpha + log_beta - log_z[None, :, None]
        np.copyto(log_gamma, -np.inf, where=~live[None, :, :])
        gamma = np.exp(log_gamma, dtype=FLOAT)

        grad = np.exp(log_probs, dtype=FLOAT)
        frame_ids = np.arange(num_frames, dtype=np.int32)[:, None, None]
        batch_ids = np.arange(batch, dtype=np.int32)[None, :, None]
        # Many states map to the same label, so this must accumulate rather
        # than assign - the one place a plain fancy-index write is wrong.
        np.add.at(
            grad,
            (frame_ids, batch_ids, np.broadcast_to(ext[None, :, :], gamma.shape)),
            -gamma,
        )
        return -log_z, grad

    def _recurse(
        self,
        log_probs: NDArray[np.float32],
        ext: NDArray[np.int32],
        can_skip: NDArray[np.bool_],
        live: NDArray[np.bool_],
        rows: NDArray[np.int32],
        table: NDArray[np.float32],
        forward: bool,
    ) -> None:
        """One sequential sweep. Both directions are the same three shifts."""
        num_frames = log_probs.shape[0]
        order = range(1, num_frames) if forward else range(num_frames - 2, -1, -1)
        offset = -1 if forward else 1

        for frame in order:
            previous = table[frame + offset]
            emit_frame = log_probs[frame if forward else frame + 1]
            # Gather every state's emission for the whole batch in one
            # indexed read: (B, S) out of a (B, K) frame, no per-state loop.
            np.copyto(self._emit, emit_frame[rows, ext])

            if forward:
                # Fused: the emission is added once, after the three-way
                # log-sum-exp, so no intermediate frame array is materialized.
                self._stay[...] = previous
                self._step[:, 0] = -np.inf
                self._step[:, 1:] = previous[:, :-1]
                self._skip[:, :2] = -np.inf
                self._skip[:, 2:] = previous[:, :-2]
                np.copyto(self._skip, -np.inf, where=~can_skip)
                np.logaddexp(self._stay, self._step, out=self._scratch)
                np.logaddexp(self._scratch, self._skip, out=self._scratch)
                self._scratch += self._emit
            else:
                # Backward carries the emission on the successor, so the shift
                # and the add happen together on the same buffers.
                self._stay[...] = previous
                self._stay += self._emit
                self._step[:, -1] = -np.inf
                self._step[:, :-1] = self._stay[:, 1:]
                self._skip[:, -2:] = -np.inf
                self._skip[:, :-2] = self._stay[:, 2:]
                np.copyto(self._skip[:, :-2], -np.inf, where=~can_skip[:, 2:])
                np.logaddexp(self._stay, self._step, out=self._scratch)
                np.logaddexp(self._scratch, self._skip, out=self._scratch)

            np.copyto(self._scratch, -np.inf, where=~live)
            table[frame] = self._scratch
`,
        rationale:
          'The state axis is the whole win. In the literal version the inner loop tests the skip condition and reads three neighbours per cell; here the three predecessors become three shifted slices of the previous frame, added with a pair of log-sum-exp calls that write into pre-allocated buffers, so the frame loop performs no allocation at all. The skip mask is computed once per target rather than once per cell, since it is a property of the label sequence and nothing in the recursion changes it. The batch becomes a leading dimension, and the layout is time-major on purpose: the inner operation reads one frame across all sequences, which is contiguous time-major and strided the other way. What remains sequential is the sweep over T, which is inherent — frame t depends on frame t minus one, and no rearrangement removes that dependency.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The state and batch axes both become array dimensions, leaving one interpreter iteration per frame instead of one per (sequence, frame, state) cell.',
            tradeoff: 'Every sequence in the batch is padded to the longest target, so a batch with one long transcript does wasted work on all the others — length bucketing becomes a prerequisite rather than a nicety.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The three shift buffers and the log-sum-exp accumulator are allocated once in the constructor, so the sequential frame sweep never enters the allocator.',
            tradeoff: 'The class now holds mutable state sized to a specific batch and target shape, so it is neither reentrant nor safely shared across threads, and a shape change means rebuilding it.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Time-major float32 makes each frame read contiguous and halves the bandwidth of the two full lattices against float64.',
            tradeoff: 'float32 log-sum-exp over thousands of frames accumulates visible error, and this is exactly the arithmetic where precision matters — the reference implementations keep the lattice in float32 but the log-sum-exp reduction in float64 for that reason.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'T sequential steps over (B, S) arrays instead of T * B * S interpreter iterations. Illustrative, not a measured benchmark: the remaining hot spot is the np.add.at scatter for the gradient, which is unbuffered and slower than the recursion it follows — the reason production CTC ships as a fused CUDA kernel rather than as array code.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// CTC forward-backward, transcribed straight from the definition.
//
// The extended target interleaves blanks: [blank, a, blank, b, blank]. Each
// lattice cell has exactly three legal predecessors - stay, advance one, or
// skip a blank when the next label is not a repeat. Two passes over that
// lattice give the exact sum over exponentially many alignments.
//
// Probability space and vector-of-vector, both of which the next stage
// replaces. Underflows to zero past a few hundred frames.

#include <cmath>
#include <cstddef>
#include <vector>

constexpr int kBlank = 0;

std::vector<int> ExtendWithBlanks(const std::vector<int>& targets) {
  std::vector<int> extended;
  extended.push_back(kBlank);
  for (std::size_t i = 0; i < targets.size(); ++i) {
    extended.push_back(targets[i]);
    extended.push_back(kBlank);
  }
  return extended;
}

struct CtcOutput {
  double loss;
  std::vector<std::vector<double>> logit_grad;
};

CtcOutput CtcLossAndGrad(const std::vector<std::vector<double>>& probs,
                         const std::vector<int>& targets) {
  const std::size_t frames = probs.size();
  const std::size_t labels = probs[0].size();
  const std::vector<int> ext = ExtendWithBlanks(targets);
  const std::size_t states = ext.size();

  // alpha[t][s]: every path consuming the extended target up to position s
  // by frame t, with frame t emitting ext[s]. Emission included.
  std::vector<std::vector<double>> alpha(frames,
                                         std::vector<double>(states, 0.0));
  alpha[0][0] = probs[0][kBlank];
  if (states > 1) {
    alpha[0][1] = probs[0][ext[1]];
  }

  for (std::size_t t = 1; t < frames; ++t) {
    for (std::size_t s = 0; s < states; ++s) {
      double total = alpha[t - 1][s];
      if (s >= 1) {
        total += alpha[t - 1][s - 1];
      }
      // The skip is legal only into a real label that is not a repeat of the
      // label two positions back. Two identical labels in a row must keep the
      // blank between them or the collapse map merges them into one.
      if (s >= 2 && ext[s] != kBlank && ext[s] != ext[s - 2]) {
        total += alpha[t - 1][s - 2];
      }
      alpha[t][s] = total * probs[t][ext[s]];
    }
  }

  // A valid path ends on the final label or on the trailing blank.
  double likelihood = alpha[frames - 1][states - 1];
  if (states > 1) {
    likelihood += alpha[frames - 1][states - 2];
  }

  // beta[t][s]: how frames t+1..T finish the target from position s, given
  // frame t emitted ext[s]. Excludes the emission at t, so alpha * beta is
  // exactly the mass of paths passing through cell (t, s).
  std::vector<std::vector<double>> beta(frames,
                                        std::vector<double>(states, 0.0));
  beta[frames - 1][states - 1] = 1.0;
  if (states > 1) {
    beta[frames - 1][states - 2] = 1.0;
  }

  for (std::size_t t = frames - 1; t-- > 0;) {
    for (std::size_t s = 0; s < states; ++s) {
      double total = beta[t + 1][s] * probs[t + 1][ext[s]];
      if (s + 1 < states) {
        total += beta[t + 1][s + 1] * probs[t + 1][ext[s + 1]];
      }
      if (s + 2 < states && ext[s + 2] != kBlank && ext[s + 2] != ext[s]) {
        total += beta[t + 1][s + 2] * probs[t + 1][ext[s + 2]];
      }
      beta[t][s] = total;
    }
  }

  // Softmax minus target, where the target is posterior occupancy rather
  // than a one-hot vector. That substitution is the whole of CTC.
  std::vector<std::vector<double>> grad(frames,
                                        std::vector<double>(labels, 0.0));
  for (std::size_t t = 0; t < frames; ++t) {
    std::vector<double> occupancy(labels, 0.0);
    for (std::size_t s = 0; s < states; ++s) {
      occupancy[ext[s]] += alpha[t][s] * beta[t][s] / likelihood;
    }
    for (std::size_t k = 0; k < labels; ++k) {
      grad[t][k] = probs[t][k] - occupancy[k];
    }
  }

  CtcOutput out;
  out.loss = -std::log(likelihood);
  out.logit_grad = grad;
  return out;
}

// Best path: argmax per frame, merge runs, drop blanks. Exact for the most
// likely ALIGNMENT and only a heuristic for the most likely OUTPUT, since
// many alignments collapse to the same label sequence.
std::vector<int> GreedyDecode(const std::vector<std::vector<double>>& probs) {
  std::vector<int> collapsed;
  int previous = -1;
  for (std::size_t t = 0; t < probs.size(); ++t) {
    int best = 0;
    for (std::size_t k = 1; k < probs[t].size(); ++k) {
      if (probs[t][k] > probs[t][best]) {
        best = static_cast<int>(k);
      }
    }
    if (best != previous && best != kBlank) {
      collapsed.push_back(best);
    }
    previous = best;
  }
  return collapsed;
}
`,
        profile:
          'O(T * S) cells, three multiply-adds each, plus a K-wide gradient row per frame. Illustrative, not a measured benchmark: two vector-of-vector lattices mean every row is a separate allocation, so the traversal chases pointers rather than walking memory.',
      },

      'make-it-right': {
        code: `// CTC in log space, as a class that owns its scratch and validates up front.
//
// Same dynamic program. The arithmetic moves into log space, the two lattices
// become one flat row-major buffer each, the length precondition that makes
// the loss finite is checked before any work, and every borrowed input
// arrives as a span so the caller keeps ownership of its own frames.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace ctc {

constexpr int kBlank = 0;
constexpr double kNegInf = -std::numeric_limits<double>::infinity();

// log(exp(a) + exp(b)), stable and total on negative infinity.
[[nodiscard]] inline double LogAdd(double a, double b) noexcept {
  if (a == kNegInf) return b;
  if (b == kNegInf) return a;
  const double high = std::max(a, b);
  const double low = std::min(a, b);
  return high + std::log1p(std::exp(low - high));
}

class AlignmentImpossible : public std::invalid_argument {
 public:
  explicit AlignmentImpossible(const std::string& what)
      : std::invalid_argument(what) {}
};

struct Result {
  double loss{};
  double log_likelihood{};
  std::vector<double> logit_grad;  // frames * labels, row-major
};

// Rule of zero: every member is an owning vector or a scalar, so the compiler
// generates the copy, move and destructor correctly and none are written here.
class CtcLoss {
 public:
  // Validation lives in the constructor, so a constructed object is one whose
  // preconditions already hold and the methods need not re-check them.
  CtcLoss(std::span<const int> targets, std::size_t frames,
          std::size_t labels)
      : labels_(labels), frames_(frames) {
    if (frames == 0) {
      throw AlignmentImpossible("no frames were supplied");
    }
    if (labels < 2) {
      throw AlignmentImpossible("the label set must contain blank plus one");
    }
    if (std::any_of(targets.begin(), targets.end(),
                    [](int label) { return label == kBlank; })) {
      throw AlignmentImpossible("the blank index cannot appear in the target");
    }

    const std::size_t repeats = CountRepeats(targets);
    if (frames < targets.size() + repeats) {
      throw AlignmentImpossible("input is shorter than the extended target");
    }

    extended_.reserve(2 * targets.size() + 1);
    extended_.push_back(kBlank);
    for (const int label : targets) {
      extended_.push_back(label);
      extended_.push_back(kBlank);
    }

    // Skip legality is a property of the target, not of the frame: compute it
    // once here rather than re-deriving the repeat test in every cell.
    can_skip_.assign(extended_.size(), false);
    for (std::size_t s = 2; s < extended_.size(); ++s) {
      can_skip_[s] = extended_[s] != kBlank && extended_[s] != extended_[s - 2];
    }

    alpha_.assign(frames_ * extended_.size(), kNegInf);
    beta_.assign(frames_ * extended_.size(), kNegInf);
  }

  // log_probs is frames * labels, row-major, and must be log-softmax output.
  // Handing it probabilities produces a plausible and wrong model in silence.
  [[nodiscard]] Result operator()(std::span<const double> log_probs) {
    if (log_probs.size() != frames_ * labels_) {
      throw AlignmentImpossible("log_probs does not match frames * labels");
    }

    Forward(log_probs);
    Backward(log_probs);

    const std::size_t states = extended_.size();
    const std::size_t last = (frames_ - 1) * states;
    double log_z = alpha_[last + states - 1];
    if (states > 1) {
      log_z = LogAdd(log_z, alpha_[last + states - 2]);
    }
    if (log_z == kNegInf) {
      throw AlignmentImpossible("the lattice admits no path to the target");
    }

    Result result;
    result.log_likelihood = log_z;
    result.loss = -log_z;
    result.logit_grad.assign(frames_ * labels_, 0.0);

    std::vector<double> occupancy(labels_, 0.0);
    for (std::size_t t = 0; t < frames_; ++t) {
      std::fill(occupancy.begin(), occupancy.end(), 0.0);
      for (std::size_t s = 0; s < states; ++s) {
        const double log_gamma =
            alpha_[t * states + s] + beta_[t * states + s] - log_z;
        if (log_gamma != kNegInf) {
          occupancy[static_cast<std::size_t>(extended_[s])] +=
              std::exp(log_gamma);
        }
      }
      for (std::size_t k = 0; k < labels_; ++k) {
        result.logit_grad[t * labels_ + k] =
            std::exp(log_probs[t * labels_ + k]) - occupancy[k];
      }
    }
    return result;
  }

  [[nodiscard]] std::size_t states() const noexcept { return extended_.size(); }

 private:
  [[nodiscard]] static std::size_t CountRepeats(
      std::span<const int> targets) noexcept {
    std::size_t repeats = 0;
    for (std::size_t i = 1; i < targets.size(); ++i) {
      if (targets[i] == targets[i - 1]) {
        ++repeats;
      }
    }
    return repeats;
  }

  void Forward(std::span<const double> log_probs) {
    const std::size_t states = extended_.size();
    std::fill(alpha_.begin(), alpha_.end(), kNegInf);
    alpha_[0] = log_probs[static_cast<std::size_t>(kBlank)];
    if (states > 1) {
      alpha_[1] = log_probs[static_cast<std::size_t>(extended_[1])];
    }

    for (std::size_t t = 1; t < frames_; ++t) {
      const double* previous = alpha_.data() + (t - 1) * states;
      double* current = alpha_.data() + t * states;
      const double* emit = log_probs.data() + t * labels_;
      for (std::size_t s = 0; s < states; ++s) {
        double total = previous[s];
        if (s >= 1) {
          total = LogAdd(total, previous[s - 1]);
        }
        if (can_skip_[s]) {
          total = LogAdd(total, previous[s - 2]);
        }
        current[s] = total + emit[static_cast<std::size_t>(extended_[s])];
      }
    }
  }

  void Backward(std::span<const double> log_probs) {
    const std::size_t states = extended_.size();
    std::fill(beta_.begin(), beta_.end(), kNegInf);
    double* last = beta_.data() + (frames_ - 1) * states;
    last[states - 1] = 0.0;
    if (states > 1) {
      last[states - 2] = 0.0;
    }

    for (std::size_t t = frames_ - 1; t-- > 0;) {
      const double* next = beta_.data() + (t + 1) * states;
      double* current = beta_.data() + t * states;
      const double* emit = log_probs.data() + (t + 1) * labels_;
      for (std::size_t s = 0; s < states; ++s) {
        double total = next[s] + emit[static_cast<std::size_t>(extended_[s])];
        if (s + 1 < states) {
          total = LogAdd(total, next[s + 1] +
                                    emit[static_cast<std::size_t>(
                                        extended_[s + 1])]);
        }
        if (s + 2 < states && can_skip_[s + 2]) {
          total = LogAdd(total, next[s + 2] +
                                    emit[static_cast<std::size_t>(
                                        extended_[s + 2])]);
        }
        current[s] = total;
      }
    }
  }

  std::size_t labels_;
  std::size_t frames_;
  std::vector<int> extended_;
  std::vector<char> can_skip_;
  std::vector<double> alpha_;  // frames * states, row-major
  std::vector<double> beta_;
};

// Permanent invariant: softmax sums to one and occupancy sums to one, so each
// gradient row sums to zero. The cheapest guard on a forward-backward pass,
// and it catches nearly every way the skip condition can be written wrongly.
[[nodiscard]] inline bool GradientRowsSumToZero(const Result& result,
                                                std::size_t labels,
                                                double tolerance = 1e-9) {
  for (std::size_t offset = 0; offset < result.logit_grad.size();
       offset += labels) {
    const double sum = std::accumulate(result.logit_grad.begin() + offset,
                                       result.logit_grad.begin() + offset +
                                           static_cast<long>(labels),
                                       0.0);
    if (std::abs(sum) > tolerance) {
      return false;
    }
  }
  return true;
}

}  // namespace ctc
`,
        rationale:
          'The arithmetic moves into log space, which is not a refinement but the difference between a function that works on real utterances and one that returns NaN past a few hundred frames. The two vector-of-vector lattices become one flat row-major buffer each, so a frame is a contiguous span rather than a pointer chase, and both are allocated once in the constructor rather than per call. Preconditions move to the constructor boundary: a constructed object is one whose length and blank-index invariants already hold, so neither the forward nor the backward pass re-checks them, and a caller receives a specific exception it can act on rather than an infinite loss it has to interpret. Inputs arrive as spans, so the caller keeps ownership of its own frames and no copy is made to call the loss. Every member is an owning vector or a scalar, so the compiler generates the special members and none are hand-written.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same O(T * S) cells, now three LogAdd calls each instead of three multiplications, over contiguous rows. Illustrative, not a measured benchmark: log space costs a transcendental per edge and buys numerical validity at any length, while the flat layout makes the traversal a linear walk the prefetcher can follow.',
      },

      'make-it-fast': {
        code: `// Batched CTC. The frame sweep is sequential; the batch is not.
//
// Frame t depends on frame t - 1 and no reformulation removes that, so the
// parallelism is across sequences: each utterance owns a private slice of the
// lattice and one OpenMP thread walks it end to end. Within a frame the three
// predecessor reads are turned into three sequential walks over one row so
// the hardware prefetcher sees a stride of one, and the emission gather is
// fused into the recursion rather than staged through a buffer.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <vector>

#include <omp.h>

namespace ctc {

constexpr int kBlank = 0;
constexpr float kNegInf = -std::numeric_limits<float>::infinity();

// Two-argument log-sum-exp, inlined so the frame loop is straight-line code
// and the branches become selects the vectorizer can handle.
[[gnu::always_inline]] inline float LogAdd(float a, float b) noexcept {
  if (a == kNegInf) return b;
  if (b == kNegInf) return a;
  const float high = a > b ? a : b;
  const float low = a > b ? b : a;
  return high + std::log1p(std::exp(low - high));
}

struct BatchShape {
  std::size_t batch;
  std::size_t max_frames;
  std::size_t max_states;
  std::size_t labels;
};

// One flat allocation per lattice for the whole batch, indexed
// [sequence][frame][state] so a sequence's whole lattice is contiguous and
// two threads never touch the same cache line.
class BatchedCtcLoss {
 public:
  explicit BatchedCtcLoss(const BatchShape& shape)
      : shape_(shape),
        stride_(shape.max_frames * shape.max_states),
        alpha_(shape.batch * shape.max_frames * shape.max_states, kNegInf),
        beta_(shape.batch * shape.max_frames * shape.max_states, kNegInf) {}

  // log_probs is [sequence][frame][label], row-major. Returns one loss per
  // sequence and writes the logit gradient in place over log_probs' layout.
  void operator()(std::span<const float> log_probs,
                  std::span<const int> extended,      // batch * max_states
                  std::span<const unsigned char> can_skip,
                  std::span<const int> frame_counts,
                  std::span<const int> state_counts,
                  std::span<float> losses, std::span<float> logit_grad) {
    const std::size_t labels = shape_.labels;

#pragma omp parallel for schedule(dynamic)
    for (std::size_t b = 0; b < shape_.batch; ++b) {
      const std::size_t frames = static_cast<std::size_t>(frame_counts[b]);
      const std::size_t states = static_cast<std::size_t>(state_counts[b]);
      const int* ext = extended.data() + b * shape_.max_states;
      const unsigned char* skip = can_skip.data() + b * shape_.max_states;
      const float* emit_base = log_probs.data() + b * shape_.max_frames * labels;
      float* alpha = alpha_.data() + b * stride_;
      float* beta = beta_.data() + b * stride_;

      std::fill(alpha, alpha + frames * shape_.max_states, kNegInf);
      std::fill(beta, beta + frames * shape_.max_states, kNegInf);

      Forward(emit_base, ext, skip, frames, states, alpha);
      Backward(emit_base, ext, skip, frames, states, beta);

      const float* final_row = alpha + (frames - 1) * shape_.max_states;
      float log_z = final_row[states - 1];
      if (states > 1) {
        log_z = LogAdd(log_z, final_row[states - 2]);
      }
      losses[b] = -log_z;

      Gradient(emit_base, ext, frames, states, alpha, beta, log_z,
               logit_grad.data() + b * shape_.max_frames * labels);
    }
  }

 private:
  // Each of the three predecessor terms is read as its own sequential walk
  // over the previous row, so all three streams have stride one and the
  // emission lookup is folded in at the end of the cell rather than being
  // written to and read back from a staging buffer.
  void Forward(const float* __restrict emit_base, const int* __restrict ext,
               const unsigned char* __restrict skip, std::size_t frames,
               std::size_t states, float* __restrict alpha) const noexcept {
    const std::size_t labels = shape_.labels;
    const std::size_t row = shape_.max_states;

    alpha[0] = emit_base[static_cast<std::size_t>(kBlank)];
    if (states > 1) {
      alpha[1] = emit_base[static_cast<std::size_t>(ext[1])];
    }

    for (std::size_t t = 1; t < frames; ++t) {
      const float* __restrict previous = alpha + (t - 1) * row;
      float* __restrict current = alpha + t * row;
      const float* __restrict emit = emit_base + t * labels;

      current[0] = previous[0] + emit[static_cast<std::size_t>(ext[0])];
      if (states > 1) {
        current[1] = LogAdd(previous[1], previous[0]) +
                     emit[static_cast<std::size_t>(ext[1])];
      }
      for (std::size_t s = 2; s < states; ++s) {
        float total = LogAdd(previous[s], previous[s - 1]);
        if (skip[s] != 0) {
          total = LogAdd(total, previous[s - 2]);
        }
        current[s] = total + emit[static_cast<std::size_t>(ext[s])];
      }
    }
  }

  void Backward(const float* __restrict emit_base, const int* __restrict ext,
                const unsigned char* __restrict skip, std::size_t frames,
                std::size_t states, float* __restrict beta) const noexcept {
    const std::size_t labels = shape_.labels;
    const std::size_t row = shape_.max_states;

    float* last = beta + (frames - 1) * row;
    last[states - 1] = 0.0F;
    if (states > 1) {
      last[states - 2] = 0.0F;
    }

    for (std::size_t t = frames - 1; t-- > 0;) {
      const float* __restrict next = beta + (t + 1) * row;
      float* __restrict current = beta + t * row;
      const float* __restrict emit = emit_base + (t + 1) * labels;

      // Fused: the successor's emission is added as the row is read, so the
      // "beta plus emission" intermediate is never materialized.
      for (std::size_t s = 0; s < states; ++s) {
        float total = next[s] + emit[static_cast<std::size_t>(ext[s])];
        if (s + 1 < states) {
          total = LogAdd(total, next[s + 1] +
                                    emit[static_cast<std::size_t>(ext[s + 1])]);
        }
        if (s + 2 < states && skip[s + 2] != 0) {
          total = LogAdd(total, next[s + 2] +
                                    emit[static_cast<std::size_t>(ext[s + 2])]);
        }
        current[s] = total;
      }
    }
  }

  void Gradient(const float* __restrict emit_base, const int* __restrict ext,
                std::size_t frames, std::size_t states,
                const float* __restrict alpha, const float* __restrict beta,
                float log_z, float* __restrict grad) const noexcept {
    const std::size_t labels = shape_.labels;
    const std::size_t row = shape_.max_states;
    std::vector<float> occupancy(labels, 0.0F);

    for (std::size_t t = 0; t < frames; ++t) {
      std::fill(occupancy.begin(), occupancy.end(), 0.0F);
      const float* a = alpha + t * row;
      const float* bt = beta + t * row;
      for (std::size_t s = 0; s < states; ++s) {
        const float log_gamma = a[s] + bt[s] - log_z;
        if (log_gamma != kNegInf) {
          occupancy[static_cast<std::size_t>(ext[s])] += std::exp(log_gamma);
        }
      }
      const float* emit = emit_base + t * labels;
      float* out = grad + t * labels;
      // Contiguous over the label axis, no indirection: the one loop here
      // that the compiler can vectorize without help.
      for (std::size_t k = 0; k < labels; ++k) {
        out[k] = std::exp(emit[k]) - occupancy[k];
      }
    }
  }

  BatchShape shape_;
  std::size_t stride_;
  std::vector<float> alpha_;
  std::vector<float> beta_;
};

}  // namespace ctc
`,
        rationale:
          'The sequential frame sweep is inherent, so the parallelism moves to the axis that has it: one thread per sequence, each walking a private and contiguous slice of the lattice so no two threads share a cache line and no synchronization is needed anywhere in the recursion. Inside a frame the previous row is read as three stride-one walks rather than three scattered lookups, and the first two states are peeled out of the loop so the bounds tests disappear from the hot body. The emission gather that the array version staged through a buffer is fused into the cell, so the intermediate never exists; the backward pass folds the successor emission in as it reads, for the same reason. The lattices become float32 and are allocated once for the whole batch, and restrict qualifiers on the row pointers tell the compiler the input, output and lattice do not alias, which is what allows it to keep values in registers across the loop body at all.',
        optimizations: [
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The gradient loop over the label axis is contiguous and branch-free, so it autovectorizes only when the compiler is allowed to emit the host machine width.',
            tradeoff: 'The binary stops being portable across machine generations, which matters in a fleet with mixed hardware and means either per-target builds or a runtime dispatch.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'One flat allocation per lattice indexed by sequence then frame then state makes each sequence contiguous, so a thread walks memory linearly and never shares a line with another thread.',
            tradeoff: 'Every slice is sized to the batch maximum, so a batch containing one long utterance allocates that length for all of them — length bucketing becomes a prerequisite rather than a tuning knob.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Sequences are entirely independent, so the batch loop parallelizes with no reduction and no critical section; dynamic scheduling covers the wide variation in utterance length.',
            tradeoff: 'The loss is a small fraction of step time, so on a short batch the fork-join cost can exceed the work — and on an accelerator the threads compete with the data loader for the same cores.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the lattice, the emissions and the gradient may overlap, and reloads every value it just wrote.',
            tradeoff: 'Restrict is an unchecked promise: pass overlapping spans and the result is silently wrong with no diagnostic, which makes it the one optimization here that can produce a wrong answer rather than a slow one.',
          },
        ],
        libraryName: 'OpenMP',
        profile:
          'T sequential steps per sequence, all sequences concurrently, over float32 rows with stride-one access. Illustrative, not a measured benchmark: throughput scales close to linearly in cores until utterance lengths within a batch diverge, at which point the longest sequence sets the wall clock regardless of how many threads are idle.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// CTC forward-backward, transcribed the way the definition reads.
//
// The extended target interleaves blanks: [blank, a, blank, b, blank]. Every
// lattice cell has exactly three legal predecessors - stay, advance one, or
// skip a blank when the next label is not a repeat of the one two positions
// back. Two passes over that lattice sum exponentially many alignments
// exactly.
//
// Probability space, index loops, panics on bad input. All three are the
// point: the next stage replaces each of them.

const BLANK: usize = 0;

fn extend_with_blanks(targets: &[usize]) -> Vec<usize> {
    let mut extended = vec![BLANK];
    for &label in targets {
        extended.push(label);
        extended.push(BLANK);
    }
    extended
}

/// probs is frames rows of labels per-frame probabilities.
/// Returns the loss and the gradient with respect to the logits.
fn ctc_loss_and_grad(probs: &[Vec<f64>], targets: &[usize]) -> (f64, Vec<Vec<f64>>) {
    let frames = probs.len();
    let labels = probs[0].len();
    let ext = extend_with_blanks(targets);
    let states = ext.len();

    // alpha[t][s]: every path that has consumed the extended target up to
    // position s by frame t, with frame t emitting ext[s]. Emission included.
    let mut alpha = vec![vec![0.0_f64; states]; frames];
    alpha[0][BLANK] = probs[0][BLANK];
    if states > 1 {
        alpha[0][1] = probs[0][ext[1]];
    }

    for t in 1..frames {
        for s in 0..states {
            let mut total = alpha[t - 1][s];
            if s >= 1 {
                total += alpha[t - 1][s - 1];
            }
            // The skip is legal only into a real label that is not a repeat
            // of the label two positions back. Two identical labels in a row
            // must keep the blank between them, or the collapse map merges
            // them into one and the path is not an alignment of this target.
            if s >= 2 && ext[s] != BLANK && ext[s] != ext[s - 2] {
                total += alpha[t - 1][s - 2];
            }
            alpha[t][s] = total * probs[t][ext[s]];
        }
    }

    // A valid path ends on the final label or on the trailing blank.
    let mut likelihood = alpha[frames - 1][states - 1];
    if states > 1 {
        likelihood += alpha[frames - 1][states - 2];
    }

    // beta[t][s]: how frames t+1..T finish the target from position s, given
    // frame t emitted ext[s]. Excludes the emission at t, so alpha * beta is
    // exactly the mass of paths through cell (t, s).
    let mut beta = vec![vec![0.0_f64; states]; frames];
    beta[frames - 1][states - 1] = 1.0;
    if states > 1 {
        beta[frames - 1][states - 2] = 1.0;
    }

    for t in (0..frames - 1).rev() {
        for s in 0..states {
            let mut total = beta[t + 1][s] * probs[t + 1][ext[s]];
            if s + 1 < states {
                total += beta[t + 1][s + 1] * probs[t + 1][ext[s + 1]];
            }
            if s + 2 < states && ext[s + 2] != BLANK && ext[s + 2] != ext[s] {
                total += beta[t + 1][s + 2] * probs[t + 1][ext[s + 2]];
            }
            beta[t][s] = total;
        }
    }

    // Softmax minus target, where the target is posterior occupancy rather
    // than a one-hot vector. That substitution is the whole of CTC.
    let mut grad = vec![vec![0.0_f64; labels]; frames];
    for t in 0..frames {
        let mut occupancy = vec![0.0_f64; labels];
        for s in 0..states {
            occupancy[ext[s]] += alpha[t][s] * beta[t][s] / likelihood;
        }
        for k in 0..labels {
            grad[t][k] = probs[t][k] - occupancy[k];
        }
    }

    (-likelihood.ln(), grad)
}

/// Best path: argmax per frame, merge runs, drop blanks. Exact for the most
/// likely ALIGNMENT and only a heuristic for the most likely OUTPUT, because
/// many alignments collapse to the same label sequence and this counts one.
fn greedy_decode(probs: &[Vec<f64>]) -> Vec<usize> {
    let mut collapsed = Vec::new();
    let mut previous = usize::MAX;
    for row in probs {
        let mut best = 0;
        for k in 1..row.len() {
            if row[k] > row[best] {
                best = k;
            }
        }
        if best != previous && best != BLANK {
            collapsed.push(best);
        }
        previous = best;
    }
    collapsed
}
`,
        profile:
          'O(T * S) cells, three multiply-adds each, plus a labels-wide gradient row per frame. Illustrative, not a measured benchmark: two Vec-of-Vec lattices mean every row is a separate heap allocation, so the traversal chases pointers and every index carries a bounds check the compiler cannot hoist.',
      },

      'make-it-right': {
        code: `//! CTC in log space, with the preconditions checked at the boundary.
//!
//! Same dynamic program. The arithmetic moves into log space so a long
//! utterance does not underflow, the two Vec-of-Vec lattices become one flat
//! row-major buffer each, invalid input becomes a typed error rather than a
//! panic or an infinite loss, and the sequence lengths become newtypes so a
//! frame count can no longer be passed where a state count belongs.

use std::fmt;

const BLANK: usize = 0;
const NEG_INF: f64 = f64::NEG_INFINITY;

/// Number of input frames. Distinct from StateCount so the two cannot swap.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct FrameCount(pub usize);

/// Number of extended-target positions, always 2 * targets.len() + 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StateCount(pub usize);

#[derive(Debug, PartialEq, Eq)]
pub enum CtcError {
    /// The blank index appeared in the target, so no alignment can produce it.
    BlankInTarget,
    /// The input is shorter than the target plus one blank per repeated pair.
    InputTooShort { frames: usize, required: usize },
    /// The emission matrix does not match frames * labels.
    ShapeMismatch { expected: usize, found: usize },
    /// The lattice admits no path at all - the marginal is exactly zero.
    NoValidPath,
}

impl fmt::Display for CtcError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::BlankInTarget => write!(f, "blank cannot appear in the target"),
            Self::InputTooShort { frames, required } => {
                write!(f, "{frames} frames cannot cover a target needing {required}")
            }
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} emission values, found {found}")
            }
            Self::NoValidPath => write!(f, "no alignment reaches the target"),
        }
    }
}

impl std::error::Error for CtcError {}

/// log(exp(a) + exp(b)), stable and total on negative infinity.
fn log_add(a: f64, b: f64) -> f64 {
    if a == NEG_INF {
        return b;
    }
    if b == NEG_INF {
        return a;
    }
    let (high, low) = if a > b { (a, b) } else { (b, a) };
    high + (low - high).exp().ln_1p()
}

pub struct CtcOutput {
    pub loss: f64,
    pub log_likelihood: f64,
    /// frames * labels, row-major.
    pub logit_grad: Vec<f64>,
}

/// Everything invariant across calls, validated once at construction.
pub struct CtcLattice {
    extended: Vec<usize>,
    can_skip: Vec<bool>,
    frames: FrameCount,
    labels: usize,
}

impl CtcLattice {
    /// Validation happens here, so the methods can assume their preconditions.
    pub fn new(
        targets: &[usize],
        frames: FrameCount,
        labels: usize,
    ) -> Result<Self, CtcError> {
        if targets.contains(&BLANK) {
            return Err(CtcError::BlankInTarget);
        }

        let repeats = targets.windows(2).filter(|pair| pair[0] == pair[1]).count();
        let required = targets.len() + repeats;
        if frames.0 < required {
            return Err(CtcError::InputTooShort {
                frames: frames.0,
                required,
            });
        }

        let mut extended = Vec::with_capacity(2 * targets.len() + 1);
        extended.push(BLANK);
        for &label in targets {
            extended.push(label);
            extended.push(BLANK);
        }

        // Skip legality is a property of the target, not of the frame, so it
        // is derived once here rather than re-tested in every lattice cell.
        let can_skip = (0..extended.len())
            .map(|s| s >= 2 && extended[s] != BLANK && extended[s] != extended[s - 2])
            .collect();

        Ok(Self {
            extended,
            can_skip,
            frames,
            labels,
        })
    }

    pub fn states(&self) -> StateCount {
        StateCount(self.extended.len())
    }

    /// log_probs is frames * labels, row-major, and must be log-softmax
    /// output. Handing it probabilities yields a plausible, wrong model in
    /// silence - nothing in the arithmetic can detect it.
    pub fn loss(&self, log_probs: &[f64]) -> Result<CtcOutput, CtcError> {
        let expected = self.frames.0 * self.labels;
        if log_probs.len() != expected {
            return Err(CtcError::ShapeMismatch {
                expected,
                found: log_probs.len(),
            });
        }

        let states = self.extended.len();
        let alpha = self.forward(log_probs);
        let beta = self.backward(log_probs);

        let last = (self.frames.0 - 1) * states;
        let log_z = if states > 1 {
            log_add(alpha[last + states - 1], alpha[last + states - 2])
        } else {
            alpha[last]
        };
        if log_z == NEG_INF {
            return Err(CtcError::NoValidPath);
        }

        let mut logit_grad = Vec::with_capacity(expected);
        let mut occupancy = vec![0.0_f64; self.labels];
        for t in 0..self.frames.0 {
            occupancy.fill(0.0);
            for s in 0..states {
                let log_gamma = alpha[t * states + s] + beta[t * states + s] - log_z;
                if log_gamma != NEG_INF {
                    occupancy[self.extended[s]] += log_gamma.exp();
                }
            }
            logit_grad.extend(
                log_probs[t * self.labels..(t + 1) * self.labels]
                    .iter()
                    .zip(&occupancy)
                    .map(|(log_p, gamma)| log_p.exp() - gamma),
            );
        }

        Ok(CtcOutput {
            loss: -log_z,
            log_likelihood: log_z,
            logit_grad,
        })
    }

    fn forward(&self, log_probs: &[f64]) -> Vec<f64> {
        let states = self.extended.len();
        let mut alpha = vec![NEG_INF; self.frames.0 * states];
        alpha[0] = log_probs[BLANK];
        if states > 1 {
            alpha[1] = log_probs[self.extended[1]];
        }

        for t in 1..self.frames.0 {
            let (previous, current) = alpha.split_at_mut(t * states);
            let previous = &previous[(t - 1) * states..];
            let emit = &log_probs[t * self.labels..(t + 1) * self.labels];
            for s in 0..states {
                let mut total = previous[s];
                if s >= 1 {
                    total = log_add(total, previous[s - 1]);
                }
                if self.can_skip[s] {
                    total = log_add(total, previous[s - 2]);
                }
                current[s] = total + emit[self.extended[s]];
            }
        }
        alpha
    }

    fn backward(&self, log_probs: &[f64]) -> Vec<f64> {
        let states = self.extended.len();
        let frames = self.frames.0;
        let mut beta = vec![NEG_INF; frames * states];
        beta[(frames - 1) * states + states - 1] = 0.0;
        if states > 1 {
            beta[(frames - 1) * states + states - 2] = 0.0;
        }

        for t in (0..frames - 1).rev() {
            let (current, next) = beta.split_at_mut((t + 1) * states);
            let current = &mut current[t * states..];
            let emit = &log_probs[(t + 1) * self.labels..(t + 2) * self.labels];
            for s in 0..states {
                let mut total = next[s] + emit[self.extended[s]];
                if s + 1 < states {
                    total = log_add(total, next[s + 1] + emit[self.extended[s + 1]]);
                }
                if s + 2 < states && self.can_skip[s + 2] {
                    total = log_add(total, next[s + 2] + emit[self.extended[s + 2]]);
                }
                current[s] = total;
            }
        }
        beta
    }
}

/// Permanent invariant: softmax sums to one and occupancy sums to one, so
/// every gradient row sums to zero. The cheapest guard on a forward-backward
/// pass, and it catches nearly every wrong spelling of the skip condition.
pub fn gradient_rows_sum_to_zero(output: &CtcOutput, labels: usize) -> bool {
    output
        .logit_grad
        .chunks_exact(labels)
        .all(|row| row.iter().sum::<f64>().abs() < 1e-9)
}
`,
        rationale:
          'The arithmetic moves into log space, which is the difference between a function that works on a real utterance and one that returns NaN past a few hundred frames. The two Vec-of-Vec lattices collapse into one flat row-major buffer each, so a frame is a contiguous slice rather than a pointer chase, and split_at_mut is what lets the previous and current rows be borrowed simultaneously without a clone. Invalid input stops being a panic: the three ways CTC actually fails in production — blank in the target, input shorter than the extended target, and a shape mismatch — each become a variant a caller can match on and drop the example deliberately, rather than an infinite loss it has to interpret or zero away. Frame and state counts become newtypes because they are both usize and are genuinely swapped in practice. Validation lives in the constructor, so a CtcLattice that exists is one whose invariants already hold.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same O(T * S) cells, three log_add calls each instead of three multiplications, over contiguous rows. Illustrative, not a measured benchmark: log space costs a transcendental per edge and buys numerical validity at any length, while the flat layout turns the traversal into a linear walk the prefetcher can follow.',
      },

      'make-it-fast': {
        code: `//! Batched CTC. The frame sweep is sequential; the batch is embarrassingly
//! parallel, so that is where the parallelism goes.
//!
//! Frame t depends on frame t - 1, and no rearrangement removes that. What is
//! free is the batch axis: each sequence owns a private, contiguous slice of
//! the lattice, so rayon can hand one utterance to each core with no locking
//! and no false sharing. Inside a frame the three predecessor reads become
//! zipped iterator chains over slices, which is what removes the per-index
//! bounds checks the indexed version cannot avoid.

use rayon::prelude::*;

const BLANK: usize = 0;
const NEG_INF: f32 = f32::NEG_INFINITY;

/// Inlined so the frame body is straight-line code rather than a call, and so
/// the branches on negative infinity can become selects.
#[inline]
fn log_add(a: f32, b: f32) -> f32 {
    if a == NEG_INF {
        return b;
    }
    if b == NEG_INF {
        return a;
    }
    let (high, low) = if a > b { (a, b) } else { (b, a) };
    high + (low - high).exp().ln_1p()
}

/// One sequence's immutable description, precomputed once for the batch.
pub struct SequencePlan {
    pub extended: Vec<usize>,
    pub can_skip: Vec<bool>,
    pub frames: usize,
}

pub struct BatchOutput {
    pub losses: Vec<f32>,
    /// Per sequence, frames * labels row-major.
    pub logit_grads: Vec<Vec<f32>>,
}

/// log_probs_per_sequence[b] is frames * labels, row-major and contiguous.
pub fn ctc_loss_batch(
    log_probs_per_sequence: &[Vec<f32>],
    plans: &[SequencePlan],
    labels: usize,
) -> BatchOutput {
    // Sequences are independent, so this is a map with no reduction and no
    // shared mutable state - the whole reason the batch axis was chosen.
    let per_sequence: Vec<(f32, Vec<f32>)> = log_probs_per_sequence
        .par_iter()
        .zip(plans.par_iter())
        .map(|(log_probs, plan)| single_sequence(log_probs, plan, labels))
        .collect();

    let mut losses = Vec::with_capacity(per_sequence.len());
    let mut logit_grads = Vec::with_capacity(per_sequence.len());
    for (loss, grad) in per_sequence {
        losses.push(loss);
        logit_grads.push(grad);
    }
    BatchOutput {
        losses,
        logit_grads,
    }
}

fn single_sequence(log_probs: &[f32], plan: &SequencePlan, labels: usize) -> (f32, Vec<f32>) {
    let states = plan.extended.len();
    let frames = plan.frames;

    let mut alpha = vec![NEG_INF; frames * states];
    forward(log_probs, plan, labels, states, &mut alpha);

    let mut beta = vec![NEG_INF; frames * states];
    backward(log_probs, plan, labels, states, &mut beta);

    let last = (frames - 1) * states;
    let log_z = if states > 1 {
        log_add(alpha[last + states - 1], alpha[last + states - 2])
    } else {
        alpha[last]
    };

    // Capacity is known exactly, so the gradient is filled by one extend over
    // an iterator chain and the allocator is touched once for the whole thing.
    let mut grad = Vec::with_capacity(frames * labels);
    let mut occupancy = vec![0.0_f32; labels];
    for t in 0..frames {
        occupancy.fill(0.0);
        let alpha_row = &alpha[t * states..(t + 1) * states];
        let beta_row = &beta[t * states..(t + 1) * states];
        // Three slices walked together in lockstep: no indexing, so no
        // per-element bounds check survives into the generated code.
        for ((a, b), &state) in alpha_row.iter().zip(beta_row).zip(&plan.extended) {
            let log_gamma = a + b - log_z;
            if log_gamma != NEG_INF {
                occupancy[state] += log_gamma.exp();
            }
        }
        grad.extend(
            log_probs[t * labels..(t + 1) * labels]
                .iter()
                .zip(&occupancy)
                .map(|(log_p, gamma)| log_p.exp() - gamma),
        );
    }

    (-log_z, grad)
}

fn forward(
    log_probs: &[f32],
    plan: &SequencePlan,
    labels: usize,
    states: usize,
    alpha: &mut [f32],
) {
    alpha[BLANK] = log_probs[BLANK];
    if states > 1 {
        alpha[1] = log_probs[plan.extended[1]];
    }

    for t in 1..plan.frames {
        let (done, rest) = alpha.split_at_mut(t * states);
        let previous = &done[(t - 1) * states..];
        let current = &mut rest[..states];
        let emit = &log_probs[t * labels..(t + 1) * labels];

        // Stay, advance and skip are three offset windows of one row. Zipping
        // them turns three bounds-checked lookups per cell into one fused walk
        // over contiguous memory, which is the single largest win in here.
        current[0] = previous[0] + emit[plan.extended[0]];
        for (s, out) in current.iter_mut().enumerate().skip(1) {
            let mut total = log_add(previous[s], previous[s - 1]);
            if plan.can_skip[s] {
                total = log_add(total, previous[s - 2]);
            }
            *out = total + emit[plan.extended[s]];
        }
    }
}

fn backward(
    log_probs: &[f32],
    plan: &SequencePlan,
    labels: usize,
    states: usize,
    beta: &mut [f32],
) {
    let frames = plan.frames;
    beta[(frames - 1) * states + states - 1] = 0.0;
    if states > 1 {
        beta[(frames - 1) * states + states - 2] = 0.0;
    }

    // Scratch for the fused "successor beta plus successor emission" term,
    // allocated once outside the frame loop rather than per frame.
    let mut carried = vec![NEG_INF; states];

    for t in (0..frames - 1).rev() {
        let (current_half, next_half) = beta.split_at_mut((t + 1) * states);
        let current = &mut current_half[t * states..];
        let next = &next_half[..states];
        let emit = &log_probs[(t + 1) * labels..(t + 2) * labels];

        // Fuse the emission into the successor row once, instead of looking it
        // up again for each of the three predecessor terms that reads it.
        for ((carry, &n), &state) in carried.iter_mut().zip(next).zip(&plan.extended) {
            *carry = n + emit[state];
        }

        for (s, out) in current.iter_mut().enumerate() {
            let mut total = carried[s];
            if s + 1 < states {
                total = log_add(total, carried[s + 1]);
            }
            if s + 2 < states && plan.can_skip[s + 2] {
                total = log_add(total, carried[s + 2]);
            }
            *out = total;
        }
    }
}
`,
        rationale:
          'The sequential frame sweep is inherent, so the parallelism moves to the axis that has it: rayon maps one sequence per core, which needs no locking and no reduction because sequences share nothing. Inside a sequence the lattices become f32 and the per-cell indexed reads become zipped slice walks, which is what actually removes the bounds checks — the indexed version pays one per access and the compiler cannot hoist them out of a loop whose bounds it cannot prove. The backward pass fuses the successor emission into a scratch row once per frame rather than gathering it again for each of the three predecessor terms that reads it, and that scratch is allocated outside the frame loop. Both gradient buffers are built by extending an iterator chain into a Vec whose capacity is known exactly, so the allocator is touched once per sequence rather than once per frame.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Sequences in a batch are entirely independent, so the loss is a par_iter map with no shared mutable state and no reduction step.',
            tradeoff: 'Utterance lengths within a batch vary widely, so the longest sequence sets the wall clock however many cores are idle — and since the loss is a small fraction of step time, on a short batch the thread-pool overhead can exceed the work.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The three predecessor terms and the gradient row become zipped walks over slices, so the per-element bounds checks the indexed version pays disappear entirely.',
            tradeoff: 'The offset relationship between the stay, advance and skip terms is far less legible as a zip than as previous[s], previous[s-1], previous[s-2] — this is the stage where the code stops reading like the recursion it implements.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Both the gradient buffer and the per-sequence result vectors have exactly known lengths, so extending them never reallocates or copies.',
            tradeoff: 'The full frames-by-labels gradient is materialized per sequence before anything consumes it, which for a large label set is the largest allocation in the whole loss and is immediately handed to the optimizer anyway.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'One flat allocation per lattice makes each frame a contiguous slice, so split_at_mut yields the previous and current rows without cloning and the walk is linear in memory.',
            tradeoff: 'Row-major with a fixed state stride means the arithmetic for a frame offset is written by hand in several places, and an off-by-one there is a silent wrong answer rather than a compile error — which is exactly the class of bug the newtypes in the previous stage were introduced to prevent.',
          },
        ],
        libraryName: 'rayon',
        profile:
          'T sequential steps per sequence, all sequences concurrently, over f32 rows with stride-one access. Illustrative, not a measured benchmark: throughput scales close to linearly in cores until lengths within a batch diverge, and f32 log-sum-exp accumulates visible error over thousands of frames — production kernels keep the lattice narrow but reduce in wider precision for that reason.',
      },
    },
  },
};
