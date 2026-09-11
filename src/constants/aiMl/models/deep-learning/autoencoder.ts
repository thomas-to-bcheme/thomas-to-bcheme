import type { AiMlModel } from '../../types';

/**
 * Autoencoder — the `reconstruction` objective in its purest form.
 *
 * Included as the structural counterpart to PCA: the same "compress, then
 * rebuild" contract, with the linear restriction lifted. It is also the
 * entry where reconstruction error IS the anomaly score, which makes it the
 * cleanest illustration of one model serving two goals at once.
 */
export const AUTOENCODER: AiMlModel = {
  slug: 'autoencoder',
  name: 'Autoencoder',
  aliases: ['AE', 'Denoising autoencoder', 'Sparse autoencoder', 'Undercomplete autoencoder', 'Bottleneck network'],
  category: 'deep-learning',
  group: 'representation',
  kind: 'model',

  paradigms: ['self-supervised', 'unsupervised'],
  taskTypes: ['dimensionality-reduction', 'anomaly-detection', 'generation'],
  architecture: 'autoencoder',
  paradigmNote:
    'Self-supervised in mechanism — the label is the input itself — and unsupervised in intent, since no external annotation is ever involved. Both are listed because the distinction matters when comparing it to the VAE, which shares the architecture and replaces the objective with a probabilistic one. Generation appears in the task types only weakly: a plain autoencoder can decode a latent vector, but its latent space has no structure that makes sampling from it meaningful.',

  intuition:
    'Force the data through a narrow layer and demand that it come out intact. Because the bottleneck cannot carry everything, the network has to discover what is worth keeping — and whatever survives that squeeze is a representation. The corollary is the useful part: an input the network cannot rebuild is an input unlike anything it learned to compress, which is exactly what an anomaly is.',

  objective: {
    kind: 'reconstruction',
    expression: {
      formula:
        'J(\\theta,\\phi) = \\frac{1}{n}\\sum_{i=1}^{n}\\bigl\\lVert \\mathbf{x}_i - g_\\phi\\bigl(f_\\theta(\\mathbf{x}_i)\\bigr) \\bigr\\rVert_2^2 + \\lambda\\,\\Omega\\bigl(f_\\theta(\\mathbf{x}_i)\\bigr)',
      symbols: [
        { symbol: 'f_\\theta', meaning: 'the encoder, mapping input to a latent code of lower dimension' },
        { symbol: 'g_\\phi', meaning: 'the decoder, mapping the code back to input space' },
        { symbol: '\\Omega', meaning: 'an optional constraint on the code — sparsity, contraction, or noise applied to the input instead' },
        { symbol: '\\lambda', meaning: 'how hard that constraint is enforced; zero gives the plain undercomplete form' },
        { symbol: 'k \\ll d', meaning: 'the bottleneck width against the input width — the constraint doing all the work' },
      ],
    },
    reading:
      'The loss says only: rebuild what you were given. What makes that non-trivial is the bottleneck, and the entire art of the model is choosing how to constrain it. Two facts are worth stating together. First, with linear layers and squared error, this provably recovers the principal subspace — an autoencoder is PCA with the linearity removed, and knowing that sets the baseline any nonlinear version must beat. Second, with an unconstrained bottleneck as wide as the input, the optimum is the identity function and the model learns nothing while the loss goes to zero. The regularizer exists precisely because the objective on its own does not prevent that.',
  },

  optimization: {
    method: 'Adam on reconstruction error, with the bottleneck or an explicit regularizer supplying the constraint',
    updateRule: {
      formula:
        '\\mathbf{h} = \\sigma(\\mathbf{W}\\mathbf{x} + \\mathbf{b}), \\quad \\hat{\\mathbf{x}} = \\sigma(\\mathbf{W}\'\\mathbf{h} + \\mathbf{b}\'), \\qquad \\frac{\\partial J}{\\partial \\mathbf{W}\'} = \\frac{2}{n}\\sum_i (\\hat{\\mathbf{x}}_i - \\mathbf{x}_i)\\,\\mathbf{h}_i^\\top',
      symbols: [
        { symbol: '\\mathbf{h}', meaning: 'the latent code — the thing you actually keep when the model is used for representation' },
        { symbol: '\\mathbf{W}\'', meaning: 'decoder weights, sometimes tied to the encoder transpose, which halves parameters and regularizes' },
        { symbol: '\\hat{\\mathbf{x}} - \\mathbf{x}', meaning: 'the reconstruction residual: the gradient signal AND the anomaly score, which is the model\u2019s central economy' },
      ],
    },
    rationale:
      'The gradient is the residual times the code, which is worth pausing on because it is the same outer-product form as any linear regression — the network is doing least squares against its own input, layer by layer. Everything interesting is in the constraint rather than the optimizer. An undercomplete bottleneck constrains by width. A denoising variant corrupts the input and asks for the clean version, which forces the model to learn the data manifold rather than a copy operation and is usually the better choice. A sparse variant penalizes mean activation so the code is overcomplete but mostly zero. A contractive one penalizes the Jacobian so the code is insensitive to small input changes. They are different answers to the same question — what stops this collapsing to the identity — and picking one is the actual modelling decision.',
    hyperparameters: [
      { name: 'bottleneck width', role: 'The constraint doing all the work. Too wide and it learns the identity; too narrow and it discards signal', typicalRange: '2 to 128, or 1–10% of input width' },
      { name: 'depth', role: 'Encoder and decoder layers. Deeper buys nonlinearity and costs the clean PCA comparison', typicalRange: '1 to 4 each side' },
      { name: 'noise level (denoising)', role: 'Corruption applied to the input. The most reliable regularizer here, and usually worth using', typicalRange: '0.1 to 0.5' },
      { name: 'sparsity target', role: 'Desired mean activation for a sparse code; enforced by a KL penalty per unit', typicalRange: '0.01 to 0.1' },
      { name: 'tied weights', role: 'Decoder as encoder transpose — halves parameters and regularizes, at some capacity cost', typicalRange: 'tied / untied' },
      { name: 'output activation', role: 'Must match the data range. Sigmoid for [0,1], linear for unbounded; a mismatch caps reconstruction permanently', typicalRange: 'linear / sigmoid' },
    ],
    convergence:
      'Easy to train and easy to fool, which is the combination that makes it deceptive. The loss almost always goes down, so it gives no signal about whether the representation is any good — the only honest evaluation is downstream. Three characteristic failures. The identity collapse, where a bottleneck as wide as the input with enough capacity learns to copy: the loss is excellent and the model is useless, and it is invisible without checking the effective rank of the code. Dead latent units, where some dimensions are constantly zero and the effective bottleneck is narrower than declared. And the anomaly-detection failure that catches people repeatedly: train on data that contains the anomalies and the model learns to reconstruct them too, so the detector is silently blind to exactly what it was built for.',
    complexity:
      'O(d · k) per layer per sample for a dense autoencoder, forward and backward. Cheap in absolute terms, fully parallel across the batch, and with no sequential structure at all — the cost is entirely set by input width and depth.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The objective is to reproduce its input, not to predict a future one; there is no mechanism that maps a history to an unseen horizon. It appears in forecasting pipelines as a compressor for a high-dimensional panel before a forecaster runs, but that is preprocessing rather than forecasting, and the model doing the forecast is a different entry.',
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Train only on normal data, then score each input by how badly it reconstructs. The economy here is unusually clean: the training signal and the anomaly score are literally the same quantity, so there is no separate scoring model to fit, calibrate or maintain. For structured inputs the per-feature residual also localizes the anomaly, which a single scalar score cannot.',
        where: [
          'Industrial and equipment monitoring on multivariate sensor data, where faults are rare and unlabelled',
          'Network intrusion and telemetry monitoring, where the normal profile is abundant and attacks are not',
          'Manufacturing defect detection on images, where the defect classes are unknown in advance',
          'Payment and transaction anomaly detection as an unsupervised complement to a supervised classifier',
        ],
        why: 'It is the right tool when anomalies are rare, unlabelled and heterogeneous — precisely the case where a supervised classifier cannot be trained and where you would rather model normality than enumerate failure modes. Because the model is nonlinear it also catches anomalies that are unremarkable in every individual feature and only unusual in combination, which is where it beats per-feature thresholding decisively. Against it: the training set must be genuinely clean, and it usually is not; a sufficiently flexible model reconstructs anomalies too, so capacity is a sensitivity knob whether you intended that or not; and on ordinary tabular data an isolation forest is competitive at a fraction of the cost and effort. Reach for this when the input is high-dimensional and structured, not by default.',
        featurization: [
          'Scale features so no single one dominates a squared-error loss, since the residual is the score and an unscaled feature sets the threshold by itself',
          'Train on a period verified to be normal — the most common failure here is training on data containing the anomalies you want to catch',
          'Use the denoising variant, which prevents the identity shortcut and generally produces a sharper score gap',
          'Calibrate the threshold on held-out normal data by percentile rather than picking a round number',
          'Keep the per-feature residual, not just the norm, so an alert can say which dimension was wrong',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget on whatever confirmed cases exist, with AUROC as a supporting number rather than the headline — at realistic anomaly rates a high AUROC is compatible with an unusable alert stream. Always compare against an isolation forest and against per-feature thresholding on the same data: those baselines win more often than expected, and skipping them is how an autoencoder pipeline gets deployed without justification.',
        pitfalls: [
          'Anomalies present in the training set, which teaches the model to reconstruct them and blinds the detector silently',
          'Too much capacity, so everything reconstructs well and the score gap closes',
          'An unscaled feature dominating the residual and effectively becoming the entire detector',
          'Drift in normal behaviour raising every score at once, which reads as a flood of anomalies rather than as staleness',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The clean result is the PCA equivalence: a linear autoencoder under squared error recovers the principal subspace, so the model is a gradient-descent solution to a problem that has a closed form. That makes it an unusually good case study in when to iterate and when to solve — the closed form is exact and cheap at moderate width, and the iterative version only earns its place once nonlinearity or a data size that will not fit in memory enters the picture. Beyond that, the constraint variants are each a different regularization scheme attacking the same degenerate optimum.',
        where: [
          'Linear autoencoder versus SVD as the canonical iterative-versus-closed-form comparison',
          'Sparsity and contractive penalties as explicit regularizers on a representation rather than on weights',
          'Denoising as regularization by data corruption, which is a different mechanism from a penalty term',
          'Nonlinear dimensionality reduction as preprocessing that makes a downstream optimization tractable',
        ],
        why: 'Worth studying because the degenerate optimum is so easy to state: with an unconstrained wide bottleneck the identity function is a global minimum with zero loss, and the model learns nothing while reporting perfect success. That is the clearest example in this reference of an objective that is satisfied without solving the problem, and it is why every useful variant is really a story about the constraint rather than about the loss. The PCA equivalence is the other transferable lesson — always know what the closed-form solution to your problem is before reaching for gradient descent, because sometimes it is the same answer for far less effort.',
        featurization: [
          'Compare against PCA at the same latent width first; if the nonlinear model does not beat it, the extra machinery is not earning anything',
          'Check the effective rank of the learned code, since dead units make the real bottleneck narrower than the declared one',
          'Prefer denoising to an explicit penalty where possible — corrupting the input is a stronger constraint than penalizing the code',
          'Whiten or scale inputs before comparing to PCA, or the comparison measures the preprocessing rather than the model',
        ],
        evaluation:
          'Reconstruction error against PCA at matched latent width, plus downstream task performance on the codes. The second matters more: reconstruction error measures compression, and a representation that compresses better is not automatically one that transfers better.',
        pitfalls: [
          'Reaching for a nonlinear model when PCA at the same width does as well for a fraction of the cost',
          'Reading a falling reconstruction loss as evidence the representation is good, which it is not',
          'Ignoring dead latent units, so the effective and declared bottleneck widths differ silently',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'viable',
        how: 'A convolutional encoder-decoder trained to reconstruct images. Used for denoising, for defect detection where the residual map localizes the flaw spatially, and historically as unsupervised pretraining before labelled data was plentiful.',
        where: [
          'Image denoising and restoration, where the corrupted-to-clean mapping is the actual task',
          'Industrial visual inspection, where the pixel-level residual gives a defect map for free',
          'Compression and latent representation for a downstream generative model, which is how modern latent diffusion is structured',
          'Unsupervised pretraining on unlabelled imagery, largely superseded by masked-image modelling',
        ],
        why: 'On images it earns its place when the residual map itself is the deliverable — a defect localization is more useful than a defect score, and this produces one without any localization supervision. The role in latent diffusion is the other current justification and is a large one: compressing to a latent space is what makes high-resolution diffusion affordable. As a representation learner for classification it has been clearly superseded by contrastive and masked-modelling objectives, which produce features that transfer better, and it is worth saying that plainly rather than presenting it as a live option.',
        featurization: [
          'Use convolutional layers rather than dense ones; a dense autoencoder on pixels discards spatial structure entirely',
          'Match the output activation to the pixel range, since a mismatch caps reconstruction quality permanently',
          'Prefer perceptual or adversarial losses over pixel MSE where sharpness matters — squared error produces characteristically blurry output',
          'Keep the residual as a spatial map rather than a scalar, since localization is most of the value here',
        ],
        evaluation:
          'PSNR or SSIM for reconstruction quality, but pixel-level localization scores for inspection tasks — those are the numbers that reflect what the model is actually for. Compare against a pretrained-feature detector, which on modern defect benchmarks usually wins.',
        pitfalls: [
          'Blurry reconstructions from pixel MSE, which is inherent to the loss rather than a capacity problem',
          'Dense layers on image data, discarding the spatial structure a convolutional encoder would keep',
          'Using it for representation learning where contrastive or masked-modelling objectives are clearly stronger',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Treat a user\u2019s interaction vector over the whole catalogue as the input and reconstruct it; the reconstruction over unobserved items is the recommendation score. This is the denoising-autoencoder formulation of collaborative filtering, and it generalizes matrix factorization by allowing a nonlinear encoder.',
        where: [
          'Collaborative filtering on implicit feedback, where the denoising formulation is the standard framing',
          'Session-based recommendation from a bag of recent interactions',
          'Content-aware recommendation where item features join the input alongside interactions',
        ],
        why: 'It generalizes matrix factorization in a defensible way — the same reconstruct-the-interaction-matrix objective with the linearity removed — and the denoising framing matches the problem honestly, since unobserved is not the same as negative and corrupting the input models exactly that ambiguity. The practical limits are real: the input width is the catalogue size, so the first layer is enormous; the model is transductive over items, so a new item needs a retrain; and it optimizes reconstruction rather than ranking, which a model trained on a ranking loss will beat where ranking is what matters.',
        featurization: [
          'Treat missing as missing rather than as zero, or the model learns to predict absence',
          'Use the denoising variant with input dropout, which is the formulation that actually works here',
          'Weight observed entries above unobserved ones, since implicit feedback is positive-only and the imbalance is severe',
          'Normalize by user activity, or heavy users dominate the loss entirely',
        ],
        evaluation:
          'Recall and NDCG at k on held-out interactions, split strictly by time, with a popularity baseline alongside. Popularity is startlingly hard to beat on recall, and a model that fails to is not worth deploying.',
        pitfalls: [
          'Zero-filling unobserved entries, which trains the model to predict that items are not interacted with',
          'A catalogue-width input layer dominating both parameter count and memory',
          'No path for new items, which is structural rather than a tuning problem',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to hours on a single GPU for most tabular and sensor applications — among the cheapest models in this category, with no sequential structure and a loss that needs no labels.',
    inferenceProfile:
      'One forward pass per input, and for anomaly detection only the encoder-decoder pair is needed. Sub-millisecond on CPU for modest widths, and genuinely streaming — which is why it is practical as an always-on detector rather than a batch one.',
    retrainingCadence:
      'Driven entirely by how fast normal behaviour drifts: weekly to monthly for live systems, rarely for stable physical processes. In anomaly detection the retraining question is uncomfortable, because a retrain on recent data absorbs any slow-developing anomaly into the new definition of normal.',
    driftAndMonitoring: [
      'Track the reconstruction-error distribution on known-normal traffic rather than the alert count, since a rising floor means drift and not a genuine increase in anomalies',
      'Monitor the effective rank of the latent code — collapsing dimensions mean the real bottleneck has narrowed since training',
      'Watch per-feature residual contributions; one feature quietly dominating means the scaling has drifted',
      'Alert on the fraction of inputs above threshold, which is the signal that separates model staleness from a real event',
    ],
    productionGotchas: [
      'The feature scaler is part of the model. Refitting it at inference changes every score, and because the score is a residual the change is silent and total',
      'Only the encoder is needed to produce representations, and only the residual for detection — shipping the whole model when half is needed is a common and avoidable serving cost',
      'Thresholds are not transferable across retrains: the error distribution shifts, so every threshold must be recalibrated with the model',
      'Anomalies in the training data are the standard failure, and the only defence is a verified-clean training window rather than anything in the model',
      'The output activation must match the data range; a sigmoid head on unbounded data caps reconstruction and the loss plateaus with no other symptom',
    ],
  },

  assumptions: [
    'Training data is representative of normal, and for anomaly detection genuinely free of the anomalies to be detected',
    'The data lies near a lower-dimensional manifold, so a bottleneck loses structure rather than signal',
    'Reconstruction error is a meaningful notion of unusualness for this data — false when the interesting deviation is in a feature the loss barely weights',
    'Features are on comparable scales, since squared error weights them by variance whether you intended that or not',
    'Normal behaviour is stable enough between retrains that a threshold calibrated once remains meaningful',
  ],

  pros: [
    {
      point: 'One model, two jobs',
      context:
        'The reconstruction residual is simultaneously the training signal and the anomaly score, so there is no separate detector to fit, calibrate or version. An operational simplification that matters more in practice than it sounds.',
    },
    {
      point: 'Nonlinear where PCA is linear',
      context:
        'Captures curved manifolds a linear projection cannot, and catches anomalies that are unremarkable in every single feature and only unusual in combination. That combination case is where it beats per-feature thresholding decisively.',
    },
    {
      point: 'Needs no labels at all',
      context:
        'Decisive where anomalies are rare, unlabelled and heterogeneous — which is the normal situation in monitoring, and the case where no supervised classifier can be trained.',
    },
    {
      point: 'Per-feature residuals localize the problem',
      context:
        'An alert can say which dimension was wrong, or on images which region. That is far more actionable than a scalar score, and it comes for free without any localization supervision.',
    },
    {
      point: 'Cheap and genuinely streaming',
      context:
        'One forward pass per input, no sequential structure, sub-millisecond on CPU. Practical as an always-on detector rather than a batch job, which many alternatives are not.',
    },
  ],

  cons: [
    {
      point: 'The identity collapse',
      context:
        'With a wide enough bottleneck and enough capacity, copying the input is a global optimum with zero loss. The model reports perfect success and has learned nothing, and it is invisible without checking the effective rank of the code.',
    },
    {
      point: 'Training data must be genuinely clean',
      context:
        'Anomalies in the training set teach the model to reconstruct them, so the detector is blind to exactly what it was built for. The most common failure in practice, and it has no in-model defence.',
    },
    {
      point: 'Falling loss says nothing about representation quality',
      context:
        'Reconstruction error measures compression, not usefulness. The only honest evaluation is downstream, which makes tuning slow and makes it easy to ship something that looked fine.',
    },
    {
      point: 'Capacity is a sensitivity knob in disguise',
      context:
        'More capacity reconstructs anomalies too and closes the score gap. Tuning for reconstruction quality and tuning for detection sensitivity pull in opposite directions, which is genuinely awkward to manage.',
    },
    {
      point: 'Superseded for representation learning',
      context:
        'Contrastive and masked-modelling objectives produce features that transfer substantially better. This remains excellent for anomaly detection and compression, and is no longer the right choice for learning transferable representations.',
    },
  ],

  relatedSlugs: ['vae', 'pca', 'isolation-forest', 'contrastive-embeddings', 'masked-lm'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""An autoencoder, transcribed the way the definition reads.

    h     = sigma(W x + b)         encode: squeeze into k dimensions
    x_hat = sigma(W' h + b')       decode: rebuild d dimensions
    loss  = ||x - x_hat||^2        the whole objective

Nothing about the loss makes this non-trivial. What does is the BOTTLENECK:
with k as wide as d and enough capacity, the identity function is a global
minimum with zero loss, and the model learns nothing while reporting perfect
success. Every useful variant is a story about what stops that.

Plain loops, no libraries, manual backward pass.
"""

import math
import random

SEED = 11


def sigmoid(value):
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def matvec(weight, vector, bias):
    """weight is out_dim rows of in_dim."""
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def encode(sample, encoder_weight, encoder_bias):
    return [sigmoid(value) for value in matvec(encoder_weight, sample, encoder_bias)]


def decode(code, decoder_weight, decoder_bias):
    """Linear output head: the data here is unbounded, so a sigmoid would cap
    reconstruction permanently and the loss would plateau with no other
    symptom. The output activation must match the data range."""
    return matvec(decoder_weight, code, decoder_bias)


def reconstruction_error(sample, rebuilt):
    """This single quantity is BOTH the training signal and, at inference,
    the anomaly score. That economy is the model's central feature."""
    return sum((a - b) ** 2 for a, b in zip(sample, rebuilt))


def train_step(sample, params, learning_rate, noise_level, rng):
    """One sample, forward and backward, written out.

    The denoising variant: corrupt the INPUT but ask for the CLEAN target.
    That is a stronger constraint than any penalty term, because copying the
    input is no longer even available as a solution - the network must learn
    the data manifold to fill in what was destroyed.
    """
    corrupted = [
        0.0 if rng.random() < noise_level else value
        for value in sample
    ]

    code = encode(corrupted, params['encoder_weight'], params['encoder_bias'])
    rebuilt = decode(code, params['decoder_weight'], params['decoder_bias'])

    # dL/dx_hat for squared error.
    output_delta = [2.0 * (r - s) for r, s in zip(rebuilt, sample)]

    # Decoder gradient: residual times code. The same outer-product form as
    # any least-squares fit - the network is doing regression against its own
    # input, layer by layer.
    for i in range(len(params['decoder_weight'])):
        for j in range(len(code)):
            params['decoder_weight'][i][j] -= learning_rate * output_delta[i] * code[j]
        params['decoder_bias'][i] -= learning_rate * output_delta[i]

    # Backpropagate into the code, then through the sigmoid.
    code_delta = [
        sum(
            output_delta[i] * params['decoder_weight'][i][j]
            for i in range(len(output_delta))
        )
        for j in range(len(code))
    ]
    hidden_delta = [d * c * (1.0 - c) for d, c in zip(code_delta, code)]

    for j in range(len(params['encoder_weight'])):
        for k in range(len(corrupted)):
            params['encoder_weight'][j][k] -= learning_rate * hidden_delta[j] * corrupted[k]
        params['encoder_bias'][j] -= learning_rate * hidden_delta[j]

    return reconstruction_error(sample, rebuilt)


def initialise(input_dim, latent_dim, rng):
    limit = math.sqrt(6.0 / (input_dim + latent_dim))
    return {
        'encoder_weight': [
            [rng.uniform(-limit, limit) for _ in range(input_dim)]
            for _ in range(latent_dim)
        ],
        'encoder_bias': [0.0] * latent_dim,
        'decoder_weight': [
            [rng.uniform(-limit, limit) for _ in range(latent_dim)]
            for _ in range(input_dim)
        ],
        'decoder_bias': [0.0] * input_dim,
    }


def train(data, latent_dim, epochs=50, learning_rate=0.01, noise_level=0.2):
    """Note there are no labels anywhere. The target IS the input."""
    rng = random.Random(SEED)
    params = initialise(len(data[0]), latent_dim, rng)

    for _ in range(epochs):
        order = list(range(len(data)))
        rng.shuffle(order)
        for index in order:
            train_step(data[index], params, learning_rate, noise_level, rng)

    return params


def anomaly_scores(data, params):
    """No separate detector is fitted. The residual IS the score."""
    scores = []
    for sample in data:
        code = encode(sample, params['encoder_weight'], params['encoder_bias'])
        rebuilt = decode(code, params['decoder_weight'], params['decoder_bias'])
        scores.append(reconstruction_error(sample, rebuilt))
    return scores


def per_feature_residual(sample, params):
    """Which dimension was wrong, not just how wrong overall.

    A scalar score says something is unusual; this says what. That is most of
    the operational value, and it comes free with no localization labels.
    """
    code = encode(sample, params['encoder_weight'], params['encoder_bias'])
    rebuilt = decode(code, params['decoder_weight'], params['decoder_bias'])
    return [(a - b) ** 2 for a, b in zip(sample, rebuilt)]


def effective_rank(codes, tolerance=1e-6):
    """How many latent dimensions are actually being used.

    A dead unit makes the real bottleneck narrower than the declared one, and
    a code whose rank equals the input width means the model has found the
    identity shortcut. Neither is visible in the loss.
    """
    latent_dim = len(codes[0])
    means = [sum(code[j] for code in codes) / len(codes) for j in range(latent_dim)]
    variances = [
        sum((code[j] - means[j]) ** 2 for code in codes) / len(codes)
        for j in range(latent_dim)
    ]
    return sum(1 for variance in variances if variance > tolerance)
`,
        profile:
          'O(d * k) per sample per layer, forward and backward. Illustrative, not a measured benchmark: one sample at a time through nested Python loops means a 200-feature input with a 16-dimensional code is roughly six thousand interpreter iterations per training step, before any batching.',
      },

      'make-it-right': {
        code: `"""The same model, with the constraint made explicit and the collapse checked.

Two things change. The variant - what stops this collapsing to the identity -
becomes an explicit type rather than a scattering of flags, because choosing
it IS the modelling decision. And the two failures that the loss cannot see -
the identity collapse and a training set containing anomalies - become
things the code checks rather than things you discover later.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple, Sequence


class Constraint(Enum):
    """What prevents the degenerate solution.

    Not a style choice: with an unconstrained wide bottleneck the identity
    function is a global minimum with zero loss, so one of these must be in
    force or the model learns nothing while reporting perfect success.
    """

    UNDERCOMPLETE = 'undercomplete'   # the bottleneck alone
    DENOISING = 'denoising'           # corrupt the input, ask for the clean target
    SPARSE = 'sparse'                 # penalize mean activation
    CONTRACTIVE = 'contractive'       # penalize the encoder Jacobian


class DegenerateModel(ValueError):
    """Raised when the model can trivially learn the identity.

    Its own type because it is the failure with no other symptom: the loss
    goes to zero and the representation is worthless.
    """


class ShapeMismatch(ValueError):
    """Raised on a shape violation instead of broadcasting past it."""


class ContaminatedTrainingSet(ValueError):
    """Raised when the training data looks like it contains anomalies.

    Its own type because the consequence is specific: the detector learns to
    reconstruct the anomalies and is blind to exactly what it was built for,
    and nothing downstream will indicate that.
    """


@dataclass(frozen=True)
class AutoencoderConfig:
    """Frozen so the constraint cannot drift after construction."""

    input_dim: int
    latent_dim: int
    constraint: Constraint = Constraint.DENOISING
    noise_level: float = 0.2
    sparsity_target: float = 0.05
    sparsity_weight: float = 0.1
    tied_weights: bool = False

    def __post_init__(self) -> None:
        # Guard clause for the failure the loss cannot see.
        if self.constraint is Constraint.UNDERCOMPLETE and self.latent_dim >= self.input_dim:
            raise DegenerateModel(
                f'a {self.latent_dim}-wide code for {self.input_dim} inputs is not '
                'undercomplete; the identity is a zero-loss optimum. Narrow the '
                'bottleneck or choose another constraint.'
            )
        if self.constraint is Constraint.DENOISING and not 0.0 < self.noise_level < 1.0:
            raise ShapeMismatch('denoising needs a corruption rate strictly inside (0, 1)')
        if self.latent_dim < 1:
            raise ShapeMismatch('the code must have at least one dimension')

    @property
    def compression_ratio(self) -> float:
        """Worth naming: this is the constraint, expressed as a number."""
        return self.latent_dim / self.input_dim


class Reconstruction(NamedTuple):
    """Code and rebuilt input together.

    Both come back because callers need different halves: representation work
    wants the code, detection wants the residual, and returning only one
    forces a second forward pass.
    """

    code: list[float]
    rebuilt: list[float]

    def squared_error(self, original: Sequence[float]) -> float:
        return math.fsum((a - b) ** 2 for a, b in zip(original, self.rebuilt))

    def per_feature_residual(self, original: Sequence[float]) -> list[float]:
        """Which dimension was wrong, not just how wrong overall.

        A scalar says something is unusual; this says what. That is most of
        the operational value, and it costs nothing extra.
        """
        return [(a - b) ** 2 for a, b in zip(original, self.rebuilt)]


def sigmoid(value: float) -> float:
    """Branch on sign so exp cannot overflow on a large negative input."""
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


class Autoencoder:
    """Encoder and decoder with the constraint applied in the forward pass."""

    def __init__(self, config: AutoencoderConfig, seed: int = 11) -> None:
        self._config = config
        rng = random.Random(seed)
        limit = math.sqrt(6.0 / (config.input_dim + config.latent_dim))

        self._encoder = [
            [rng.uniform(-limit, limit) for _ in range(config.input_dim)]
            for _ in range(config.latent_dim)
        ]
        self._encoder_bias = [0.0] * config.latent_dim
        # Tied weights halve the parameter count and regularize; the decoder
        # is then the encoder transpose and is not stored separately.
        self._decoder = (
            None
            if config.tied_weights
            else [
                [rng.uniform(-limit, limit) for _ in range(config.latent_dim)]
                for _ in range(config.input_dim)
            ]
        )
        self._decoder_bias = [0.0] * config.input_dim

    def encode(self, sample: Sequence[float]) -> list[float]:
        if len(sample) != self._config.input_dim:
            raise ShapeMismatch(
                f'expected {self._config.input_dim} features, got {len(sample)}'
            )
        return [
            sigmoid(bias + math.fsum(w * v for w, v in zip(row, sample)))
            for row, bias in zip(self._encoder, self._encoder_bias)
        ]

    def decode(self, code: Sequence[float]) -> list[float]:
        """Linear output head, because the data range here is unbounded.

        Matching the output activation to the data range is not cosmetic: a
        sigmoid head on unbounded data caps reconstruction permanently and
        the loss plateaus with no other symptom.
        """
        if self._decoder is None:
            return [
                self._decoder_bias[i]
                + math.fsum(self._encoder[j][i] * code[j] for j in range(len(code)))
                for i in range(self._config.input_dim)
            ]
        return [
            bias + math.fsum(w * c for w, c in zip(row, code))
            for row, bias in zip(self._decoder, self._decoder_bias)
        ]

    def forward(self, sample: Sequence[float]) -> Reconstruction:
        code = self.encode(sample)
        return Reconstruction(code=code, rebuilt=self.decode(code))

    def corrupt(self, sample: Sequence[float], rng: random.Random) -> list[float]:
        """Denoising: corrupt the INPUT and ask for the CLEAN target.

        A stronger constraint than any penalty term, because copying the
        input is no longer available as a solution at all - the network must
        learn the data manifold to fill in what was destroyed.
        """
        if self._config.constraint is not Constraint.DENOISING:
            return list(sample)
        return [
            0.0 if rng.random() < self._config.noise_level else value
            for value in sample
        ]

    def sparsity_penalty(self, codes: Sequence[Sequence[float]]) -> float:
        """KL between the mean activation and the target, per unit.

        Applies to an OVERCOMPLETE code: the bottleneck is wide but mostly
        zero, so the constraint is on how much is used rather than on how
        much is available.
        """
        if self._config.constraint is not Constraint.SPARSE:
            return 0.0

        target = self._config.sparsity_target
        penalty = 0.0
        for unit in range(self._config.latent_dim):
            mean = math.fsum(code[unit] for code in codes) / len(codes)
            mean = min(max(mean, 1e-6), 1.0 - 1e-6)
            penalty += target * math.log(target / mean) + (1 - target) * math.log(
                (1 - target) / (1 - mean)
            )
        return self._config.sparsity_weight * penalty


def effective_rank(codes: Sequence[Sequence[float]], tolerance: float = 1e-6) -> int:
    """How many latent dimensions are actually being used.

    A dead unit makes the real bottleneck narrower than the declared one, and
    a rank equal to the input width means the model found the identity
    shortcut. Neither is visible in the loss, which is why this is a function
    rather than a comment.
    """
    if not codes:
        raise ShapeMismatch('cannot measure rank with no codes')
    latent_dim = len(codes[0])
    used = 0
    for unit in range(latent_dim):
        values = [code[unit] for code in codes]
        mean = math.fsum(values) / len(values)
        variance = math.fsum((value - mean) ** 2 for value in values) / len(values)
        if variance > tolerance:
            used += 1
    return used


def assert_training_set_clean(
    errors: Sequence[float],
    tail_fraction: float = 0.01,
    ratio_threshold: float = 20.0,
) -> None:
    """Heuristic check that the training set is anomaly-free.

    A clean training set produces a reconstruction-error distribution with a
    short tail. A long one means the model is being asked to reconstruct
    things that do not belong - and if it succeeds, the detector is blind to
    exactly what it was built for.
    """
    if len(errors) < 100:
        raise ShapeMismatch('too few samples to judge the error distribution')

    ordered = sorted(errors)
    median = ordered[len(ordered) // 2]
    tail = ordered[int(len(ordered) * (1.0 - tail_fraction))]
    if median > 0.0 and tail / median > ratio_threshold:
        raise ContaminatedTrainingSet(
            f'the top {tail_fraction:.0%} of reconstruction errors are {tail / median:.0f}x '
            'the median; the training set probably contains anomalies'
        )


def calibrate_threshold(errors: Sequence[float], false_positive_rate: float) -> float:
    """Threshold as a percentile of held-out normal errors.

    Not a round number: the error scale is arbitrary and shifts with every
    retrain, so a threshold must be recalibrated alongside the model rather
    than carried across.
    """
    if not 0.0 < false_positive_rate < 1.0:
        raise ShapeMismatch('the false-positive rate must lie inside (0, 1)')
    ordered = sorted(errors)
    index = min(int((1.0 - false_positive_rate) * len(ordered)), len(ordered) - 1)
    return ordered[index]
`,
        rationale:
          'Two changes, both aimed at failures the loss cannot see. The constraint — what stops the model collapsing to the identity — becomes an explicit enum rather than a scattering of flags, because choosing it is the actual modelling decision, and the config refuses an undercomplete configuration whose code is as wide as its input: that combination has the identity as a zero-loss global optimum, so the model reports perfect success and has learned nothing. The second is contamination. A training set containing the anomalies it should detect teaches the model to reconstruct them, and the detector is then blind to exactly what it exists for with no downstream signal at all; the heuristic check on the error distribution turns that into something the pipeline can refuse rather than something discovered months later. Alongside those, effective rank becomes a function rather than a comment because dead units make the real bottleneck narrower than the declared one, the threshold is calibrated as a percentile because the error scale is arbitrary and shifts with every retrain, and the reconstruction returns both the code and the rebuilt input since representation work and detection want different halves.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: fsum and the validation add a small constant and buy two failure modes that would otherwise be invisible.',
      },

      'make-it-fast': {
        code: `"""Batched, fused, and with the PCA baseline computed alongside.

The structural observation: an autoencoder has no sequential structure at
all, so every layer is a dense matrix product and the whole thing batches
trivially. That makes the interesting optimization not the arithmetic but
what you compare against - a linear autoencoder under squared error provably
recovers the principal subspace, so the closed-form SVD answer is available
for free and should be computed before any gradient descent is run.

Three changes:
  1. Encode, decode and the backward pass all become GEMMs over the batch.
  2. The residual is computed once and reused: it is the loss, the gradient
     and the anomaly score, so materializing it three times is pure waste.
  3. Tied weights make the decoder a transpose rather than a second matrix,
     which halves both parameters and bandwidth.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def sigmoid_(values: NDArray[np.float32]) -> NDArray[np.float32]:
    """In-place logistic. The hidden activation is the largest intermediate
    in a wide encoder, so avoiding one temporary here is the single biggest
    memory saving in the forward pass."""
    np.negative(values, out=values)
    np.exp(values, out=values)
    values += 1.0
    np.reciprocal(values, out=values)
    return values


class BatchedAutoencoder:
    """Tied-weight autoencoder over a whole batch.

    Tied weights mean the decoder IS the encoder transpose: half the
    parameters, half the bandwidth, and a regularizer for free. The cost is
    capacity, which on most tabular data is not the binding constraint.
    """

    def __init__(self, input_dim: int, latent_dim: int, seed: int = 11) -> None:
        rng = np.random.default_rng(seed)
        limit = np.sqrt(6.0 / (input_dim + latent_dim))
        self._weight = rng.uniform(-limit, limit, (input_dim, latent_dim)).astype(FLOAT)
        self._encoder_bias = np.zeros(latent_dim, dtype=FLOAT)
        self._decoder_bias = np.zeros(input_dim, dtype=FLOAT)
        self._latent_dim = latent_dim

    def forward(
        self, batch: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """batch is (n, input_dim). Returns (code, rebuilt)."""
        code = batch @ self._weight
        code += self._encoder_bias
        sigmoid_(code)

        # Linear output head: the data range is unbounded, and a sigmoid here
        # would cap reconstruction permanently with the loss plateauing and
        # no other symptom.
        rebuilt = code @ self._weight.T
        rebuilt += self._decoder_bias
        return code, rebuilt

    def train_step(
        self,
        batch: NDArray[np.float32],
        noise_level: float,
        learning_rate: float,
        rng: np.random.Generator,
    ) -> np.float32:
        """One batched step. The residual is computed ONCE and reused.

        It is simultaneously the loss, the output gradient and the anomaly
        score, so materializing it three separate times is pure waste - and
        that economy is the model's central feature, not an implementation
        detail.
        """
        # Denoising: corrupt the INPUT, ask for the CLEAN target. A stronger
        # constraint than any penalty, because copying is no longer even
        # available as a solution.
        mask = (rng.random(batch.shape) >= noise_level).astype(FLOAT)
        corrupted = batch * mask

        code, rebuilt = self.forward(corrupted)

        residual = rebuilt
        residual -= batch  # in place: \`rebuilt\` is not needed again
        loss = np.einsum('ij,ij->', residual, residual, optimize=True) / batch.shape[0]

        scale = FLOAT(2.0 * learning_rate / batch.shape[0])
        # Tied weights mean one matrix gets BOTH gradient terms: the decoder
        # path and the encoder path. Two GEMMs, one update.
        decoder_gradient = code.T @ residual
        code_delta = residual @ self._weight
        code_delta *= code
        code_delta *= 1.0 - code
        encoder_gradient = corrupted.T @ code_delta

        self._weight -= scale * (decoder_gradient.T + encoder_gradient)
        self._decoder_bias -= scale * residual.sum(axis=0)
        self._encoder_bias -= scale * code_delta.sum(axis=0)
        return loss

    def anomaly_scores(self, batch: NDArray[np.float32]) -> NDArray[np.float32]:
        """The residual IS the score. No separate detector is fitted."""
        _, rebuilt = self.forward(batch)
        rebuilt -= batch
        # Row-wise squared norm without materializing the squares: einsum
        # contracts the feature axis in one pass.
        return np.einsum('ij,ij->i', rebuilt, rebuilt, optimize=True)

    def per_feature_residual(self, batch: NDArray[np.float32]) -> NDArray[np.float32]:
        """Which dimension was wrong, not just how wrong overall."""
        _, rebuilt = self.forward(batch)
        rebuilt -= batch
        return np.square(rebuilt, out=rebuilt)


def pca_baseline(
    data: NDArray[np.float32], latent_dim: int
) -> tuple[NDArray[np.float32], np.float32]:
    """The closed-form answer, computed before any gradient descent.

    A LINEAR autoencoder under squared error provably recovers the principal
    subspace, so this is the exact solution to the problem a linear model is
    iterating toward. Always know it: if a nonlinear autoencoder does not
    beat this at the same latent width, the extra machinery is earning
    nothing and the SVD is faster, exact and has no hyperparameters.
    """
    centred = data - data.mean(axis=0, dtype=np.float32)
    # Economy SVD: the full one computes an (n x n) left factor that is
    # immediately discarded, which on a large batch is the dominant cost.
    _, singular, components = np.linalg.svd(centred, full_matrices=False)

    basis = components[:latent_dim]
    projected = centred @ basis.T
    reconstruction_error = float(np.square(singular[latent_dim:]).sum() / len(data))
    return projected.astype(FLOAT), FLOAT(reconstruction_error)


def effective_rank(codes: NDArray[np.float32], tolerance: float = 1e-6) -> int:
    """How many latent dimensions are actually used.

    A dead unit makes the real bottleneck narrower than the declared one, and
    a rank matching the input width means the model found the identity
    shortcut. Neither is visible in the loss.
    """
    return int((codes.var(axis=0, dtype=np.float32) > tolerance).sum())


def calibrate_threshold(errors: NDArray[np.float32], false_positive_rate: float) -> float:
    """Threshold as a percentile of held-out normal errors.

    Partition-based, not a sort: a percentile is a selection and ordering the
    rest is discarded work. The error scale is arbitrary and shifts with
    every retrain, so this must be recomputed alongside the model rather than
    carried across.
    """
    return float(np.quantile(errors, 1.0 - false_positive_rate))
`,
        rationale:
          'The structural point is that an autoencoder has no sequential dependency at all, so every layer is a dense product and the whole model batches trivially — which makes the interesting optimization not the arithmetic but what you compare against. A linear autoencoder under squared error provably recovers the principal subspace, so the closed-form SVD answer is available at a fraction of the cost, and computing it first is the discipline this stage encodes: if the nonlinear model does not beat it at matched latent width, the extra machinery is earning nothing. The SVD itself uses the economy form, since the full factorization computes an n-by-n left factor that is immediately discarded. Within the training step the residual is computed once and reused, because it is simultaneously the loss, the output gradient and the anomaly score — materializing it three times would be waste, and that economy is the model’s defining feature rather than an implementation detail. Tied weights make the decoder a transpose, so one matrix receives both gradient terms and both parameters and bandwidth halve. Squared norms use einsum to contract the feature axis in a single pass rather than squaring into a temporary and summing it.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'The linear case has an exact SVD solution, and the economy factorization gives both the optimal subspace and its reconstruction error without any iteration or hyperparameter.',
            tradeoff: 'The SVD needs the whole data matrix resident and is O(n d^2), so past a few hundred thousand rows it stops being the cheap option and the iterative version wins purely on memory.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Encode, decode and both gradient terms are GEMMs over the batch, and the row-wise squared norms contract the feature axis with einsum instead of squaring into a temporary.',
            tradeoff: 'The tied-weight update needs a transpose of the decoder gradient before it can be added, and on a non-square weight that transpose is a genuine copy rather than a view.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The sigmoid, the residual subtraction and the per-feature squaring all write through buffers that already exist, so a training step allocates only the gradients.',
            tradeoff: 'The rebuilt input is destroyed to become the residual, so anything wanting to inspect the reconstruction itself — the natural thing to plot when diagnosing a bad detector — needs a second forward pass.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The sigmoid derivative is computed against the activation already in memory rather than recomputed, and the loss is contracted straight out of the residual.',
            tradeoff: 'The pre-activation is never stored, so a saturated encoder — the reason a unit goes dead and the effective rank drops — cannot be diagnosed without an unfused pass.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'A training step becomes four GEMMs for the whole batch, against O(n * d * k) interpreter iterations. Illustrative, not a measured benchmark: the PCA baseline on the same data is typically a single factorization and is worth running first precisely because it is so much cheaper than the training loop it might replace.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// An autoencoder, transcribed the way the definition reads.
//
//   h     = sigma(W x + b)      encode: squeeze into k dimensions
//   x_hat = W' h + b'           decode: rebuild d dimensions
//   loss  = ||x - x_hat||^2     the whole objective
//
// Nothing about the loss makes this non-trivial. What does is the BOTTLENECK:
// with k as wide as d and enough capacity, the identity function is a global
// minimum with zero loss, and the model learns nothing while reporting
// perfect success. Every useful variant is a story about what stops that.
//
// Vector-of-vector, one sample at a time, manual backward pass.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

double Sigmoid(double value) {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

Vector MatVec(const Matrix& weight, const Vector& vector, const Vector& bias) {
  Vector output(weight.size(), 0.0);
  for (std::size_t i = 0; i < weight.size(); ++i) {
    double accumulated = bias[i];
    for (std::size_t j = 0; j < vector.size(); ++j) {
      accumulated += weight[i][j] * vector[j];
    }
    output[i] = accumulated;
  }
  return output;
}

struct Params {
  Matrix encoder_weight;
  Vector encoder_bias;
  Matrix decoder_weight;
  Vector decoder_bias;
};

Vector Encode(const Vector& sample, const Params& params) {
  Vector code = MatVec(params.encoder_weight, sample, params.encoder_bias);
  for (std::size_t i = 0; i < code.size(); ++i) {
    code[i] = Sigmoid(code[i]);
  }
  return code;
}

// Linear output head: the data here is unbounded, so a sigmoid would cap
// reconstruction permanently and the loss would plateau with no other
// symptom. The output activation must match the data range.
Vector Decode(const Vector& code, const Params& params) {
  return MatVec(params.decoder_weight, code, params.decoder_bias);
}

// This single quantity is BOTH the training signal and, at inference, the
// anomaly score. That economy is the model's central feature.
double ReconstructionError(const Vector& sample, const Vector& rebuilt) {
  double total = 0.0;
  for (std::size_t i = 0; i < sample.size(); ++i) {
    const double residual = sample[i] - rebuilt[i];
    total += residual * residual;
  }
  return total;
}

// One sample, forward and backward, written out.
//
// The denoising variant: corrupt the INPUT but ask for the CLEAN target.
// That is a stronger constraint than any penalty term, because copying the
// input is no longer available as a solution at all - the network must learn
// the data manifold to fill in what was destroyed.
double TrainStep(const Vector& sample, Params& params, double learning_rate,
                 double noise_level, std::mt19937& rng) {
  std::uniform_real_distribution<double> uniform(0.0, 1.0);

  Vector corrupted(sample.size(), 0.0);
  for (std::size_t i = 0; i < sample.size(); ++i) {
    corrupted[i] = uniform(rng) < noise_level ? 0.0 : sample[i];
  }

  const Vector code = Encode(corrupted, params);
  const Vector rebuilt = Decode(code, params);

  // dL/dx_hat for squared error.
  Vector output_delta(sample.size(), 0.0);
  for (std::size_t i = 0; i < sample.size(); ++i) {
    output_delta[i] = 2.0 * (rebuilt[i] - sample[i]);
  }

  // Decoder gradient: residual times code. The same outer-product form as any
  // least-squares fit - the network is doing regression against its own
  // input, layer by layer.
  for (std::size_t i = 0; i < params.decoder_weight.size(); ++i) {
    for (std::size_t j = 0; j < code.size(); ++j) {
      params.decoder_weight[i][j] -= learning_rate * output_delta[i] * code[j];
    }
    params.decoder_bias[i] -= learning_rate * output_delta[i];
  }

  // Backpropagate into the code, then through the sigmoid.
  Vector hidden_delta(code.size(), 0.0);
  for (std::size_t j = 0; j < code.size(); ++j) {
    double accumulated = 0.0;
    for (std::size_t i = 0; i < output_delta.size(); ++i) {
      accumulated += output_delta[i] * params.decoder_weight[i][j];
    }
    hidden_delta[j] = accumulated * code[j] * (1.0 - code[j]);
  }

  for (std::size_t j = 0; j < params.encoder_weight.size(); ++j) {
    for (std::size_t k = 0; k < corrupted.size(); ++k) {
      params.encoder_weight[j][k] -= learning_rate * hidden_delta[j] * corrupted[k];
    }
    params.encoder_bias[j] -= learning_rate * hidden_delta[j];
  }

  return ReconstructionError(sample, rebuilt);
}

Params Initialise(std::size_t input_dim, std::size_t latent_dim, std::mt19937& rng) {
  const double limit =
      std::sqrt(6.0 / static_cast<double>(input_dim + latent_dim));
  std::uniform_real_distribution<double> uniform(-limit, limit);

  Params params;
  params.encoder_weight.assign(latent_dim, Vector(input_dim, 0.0));
  params.decoder_weight.assign(input_dim, Vector(latent_dim, 0.0));
  params.encoder_bias.assign(latent_dim, 0.0);
  params.decoder_bias.assign(input_dim, 0.0);

  for (std::size_t i = 0; i < latent_dim; ++i) {
    for (std::size_t j = 0; j < input_dim; ++j) {
      params.encoder_weight[i][j] = uniform(rng);
    }
  }
  for (std::size_t i = 0; i < input_dim; ++i) {
    for (std::size_t j = 0; j < latent_dim; ++j) {
      params.decoder_weight[i][j] = uniform(rng);
    }
  }
  return params;
}

// No separate detector is fitted. The residual IS the score.
Vector AnomalyScores(const Matrix& data, const Params& params) {
  Vector scores(data.size(), 0.0);
  for (std::size_t i = 0; i < data.size(); ++i) {
    const Vector code = Encode(data[i], params);
    scores[i] = ReconstructionError(data[i], Decode(code, params));
  }
  return scores;
}

// How many latent dimensions are actually being used.
//
// A dead unit makes the real bottleneck narrower than the declared one, and a
// rank equal to the input width means the model found the identity shortcut.
// Neither is visible in the loss.
std::size_t EffectiveRank(const Matrix& codes, double tolerance = 1e-6) {
  const std::size_t latent_dim = codes[0].size();
  std::size_t used = 0;
  for (std::size_t unit = 0; unit < latent_dim; ++unit) {
    double mean = 0.0;
    for (std::size_t i = 0; i < codes.size(); ++i) {
      mean += codes[i][unit];
    }
    mean /= static_cast<double>(codes.size());

    double variance = 0.0;
    for (std::size_t i = 0; i < codes.size(); ++i) {
      const double centred = codes[i][unit] - mean;
      variance += centred * centred;
    }
    variance /= static_cast<double>(codes.size());

    if (variance > tolerance) {
      ++used;
    }
  }
  return used;
}
`,
        profile:
          'O(d * k) per sample per layer, forward and backward. Illustrative, not a measured benchmark: one sample at a time with vector-of-vector storage means every inner access chases two pointers, so a 200-feature input with a 16-dimensional code is latency-bound long before it is arithmetic-bound.',
      },

      'make-it-right': {
        code: `// The same model, with the constraint made explicit and the collapse checked.
//
// Two things change. The variant - what stops this collapsing to the identity
// - becomes an explicit type rather than a scattering of flags, because
// choosing it IS the modelling decision. And the two failures the loss cannot
// see - the identity collapse and a training set containing anomalies -
// become things the code refuses rather than things you discover later.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace autoencoder {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because it is the failure with no other symptom: the loss goes
// to zero and the representation is worthless.
class DegenerateModel : public std::invalid_argument {
 public:
  explicit DegenerateModel(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the consequence is specific: the detector learns to
// reconstruct the anomalies and is blind to exactly what it was built for,
// and nothing downstream will indicate that.
class ContaminatedTrainingSet : public std::invalid_argument {
 public:
  explicit ContaminatedTrainingSet(const std::string& what)
      : std::invalid_argument(what) {}
};

// What prevents the degenerate solution.
//
// Not a style choice: with an unconstrained wide bottleneck the identity
// function is a global minimum with zero loss, so one of these must be in
// force or the model learns nothing while reporting perfect success.
enum class Constraint { kUndercomplete, kDenoising, kSparse, kContractive };

struct Config {
  std::size_t input_dim{};
  std::size_t latent_dim{};
  Constraint constraint{Constraint::kDenoising};
  double noise_level{0.2};
  double sparsity_target{0.05};
  double sparsity_weight{0.1};
  bool tied_weights{true};

  // Guard clause for the failure the loss cannot see.
  void Validate() const {
    if (latent_dim == 0) {
      throw ShapeMismatch("the code must have at least one dimension");
    }
    if (constraint == Constraint::kUndercomplete && latent_dim >= input_dim) {
      throw DegenerateModel(
          "the code is not narrower than the input; the identity is a zero-loss "
          "optimum. Narrow the bottleneck or choose another constraint.");
    }
    if (constraint == Constraint::kDenoising && (noise_level <= 0.0 || noise_level >= 1.0)) {
      throw ShapeMismatch("denoising needs a corruption rate strictly inside (0, 1)");
    }
  }

  // Worth naming: this IS the constraint, expressed as a number.
  [[nodiscard]] double compression_ratio() const noexcept {
    return static_cast<double>(latent_dim) / static_cast<double>(input_dim);
  }
};

// Code and rebuilt input together.
//
// Both come back because callers need different halves: representation work
// wants the code, detection wants the residual, and returning only one forces
// a second forward pass.
struct Reconstruction {
  std::vector<double> code;
  std::vector<double> rebuilt;

  [[nodiscard]] double SquaredError(std::span<const double> original) const {
    double total = 0.0;
    for (std::size_t i = 0; i < original.size(); ++i) {
      const double residual = original[i] - rebuilt[i];
      total += residual * residual;
    }
    return total;
  }

  // Which dimension was wrong, not just how wrong overall. A scalar says
  // something is unusual; this says what, and it costs nothing extra.
  [[nodiscard]] std::vector<double> PerFeatureResidual(
      std::span<const double> original) const {
    std::vector<double> residuals(original.size(), 0.0);
    for (std::size_t i = 0; i < original.size(); ++i) {
      const double difference = original[i] - rebuilt[i];
      residuals[i] = difference * difference;
    }
    return residuals;
  }
};

[[nodiscard]] inline double Sigmoid(double value) noexcept {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

// Flat row-major weights and owned scratch, so a repeated forward pass
// allocates nothing and every row is a contiguous span.
class Autoencoder {
 public:
  Autoencoder(Config config, unsigned seed)
      : config_(config),
        weight_(config.input_dim * config.latent_dim, 0.0),
        encoder_bias_(config.latent_dim, 0.0),
        decoder_bias_(config.input_dim, 0.0),
        corrupted_(config.input_dim, 0.0) {
    config_.Validate();

    std::mt19937 rng(seed);
    const double limit = std::sqrt(
        6.0 / static_cast<double>(config.input_dim + config.latent_dim));
    std::uniform_real_distribution<double> uniform(-limit, limit);
    for (double& value : weight_) {
      value = uniform(rng);
    }

    // Tied weights halve the parameter count and regularize; the decoder is
    // then the encoder transpose and is not stored separately.
    if (!config_.tied_weights) {
      decoder_weight_.assign(config.input_dim * config.latent_dim, 0.0);
      for (double& value : decoder_weight_) {
        value = uniform(rng);
      }
    }
  }

  [[nodiscard]] Reconstruction Forward(std::span<const double> sample) const {
    if (sample.size() != config_.input_dim) {
      throw ShapeMismatch("sample width does not match the configured input");
    }

    Reconstruction result;
    result.code.assign(config_.latent_dim, 0.0);
    for (std::size_t j = 0; j < config_.input_dim; ++j) {
      const double value = sample[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = weight_.data() + j * config_.latent_dim;
      for (std::size_t i = 0; i < config_.latent_dim; ++i) {
        result.code[i] += value * row[i];
      }
    }
    for (std::size_t i = 0; i < config_.latent_dim; ++i) {
      result.code[i] = Sigmoid(result.code[i] + encoder_bias_[i]);
    }

    // Linear output head: the data range is unbounded, and a sigmoid here
    // would cap reconstruction permanently with the loss plateauing and no
    // other symptom.
    result.rebuilt.assign(decoder_bias_.begin(), decoder_bias_.end());
    const double* decoder = config_.tied_weights ? weight_.data() : decoder_weight_.data();
    for (std::size_t j = 0; j < config_.input_dim; ++j) {
      const double* row = decoder + j * config_.latent_dim;
      double accumulated = 0.0;
      for (std::size_t i = 0; i < config_.latent_dim; ++i) {
        accumulated += row[i] * result.code[i];
      }
      result.rebuilt[j] += accumulated;
    }
    return result;
  }

  // Denoising: corrupt the INPUT and ask for the CLEAN target.
  //
  // A stronger constraint than any penalty term, because copying the input is
  // no longer available as a solution at all - the network must learn the
  // data manifold to fill in what was destroyed.
  [[nodiscard]] std::span<const double> Corrupt(std::span<const double> sample,
                                                std::mt19937& rng) {
    if (config_.constraint != Constraint::kDenoising) {
      return sample;
    }
    std::uniform_real_distribution<double> uniform(0.0, 1.0);
    for (std::size_t i = 0; i < sample.size(); ++i) {
      corrupted_[i] = uniform(rng) < config_.noise_level ? 0.0 : sample[i];
    }
    return corrupted_;
  }

  [[nodiscard]] const Config& config() const noexcept { return config_; }

 private:
  Config config_;
  std::vector<double> weight_;  // input_dim x latent_dim, row-major
  std::vector<double> decoder_weight_;
  std::vector<double> encoder_bias_;
  std::vector<double> decoder_bias_;
  std::vector<double> corrupted_;
};

// How many latent dimensions are actually being used.
//
// A dead unit makes the real bottleneck narrower than the declared one, and a
// rank matching the input width means the model found the identity shortcut.
// Neither is visible in the loss, which is why this is a function rather than
// a comment.
[[nodiscard]] inline std::size_t EffectiveRank(std::span<const double> codes,
                                               std::size_t latent_dim,
                                               double tolerance = 1e-6) {
  if (codes.empty() || latent_dim == 0) {
    throw ShapeMismatch("cannot measure rank with no codes");
  }
  const std::size_t rows = codes.size() / latent_dim;
  std::size_t used = 0;

  for (std::size_t unit = 0; unit < latent_dim; ++unit) {
    double mean = 0.0;
    for (std::size_t r = 0; r < rows; ++r) {
      mean += codes[r * latent_dim + unit];
    }
    mean /= static_cast<double>(rows);

    double variance = 0.0;
    for (std::size_t r = 0; r < rows; ++r) {
      const double centred = codes[r * latent_dim + unit] - mean;
      variance += centred * centred;
    }
    if (variance / static_cast<double>(rows) > tolerance) {
      ++used;
    }
  }
  return used;
}

// Heuristic check that the training set is anomaly-free.
//
// A clean training set produces a reconstruction-error distribution with a
// short tail. A long one means the model is being asked to reconstruct things
// that do not belong - and if it succeeds, the detector is blind to exactly
// what it was built for.
inline void AssertTrainingSetClean(std::vector<double> errors,
                                   double tail_fraction = 0.01,
                                   double ratio_threshold = 20.0) {
  if (errors.size() < 100) {
    throw ShapeMismatch("too few samples to judge the error distribution");
  }

  const std::size_t median_index = errors.size() / 2;
  const std::size_t tail_index = static_cast<std::size_t>(
      static_cast<double>(errors.size()) * (1.0 - tail_fraction));

  // nth_element twice, not a sort: both are selections and ordering the rest
  // is work whose result is discarded.
  std::nth_element(errors.begin(), errors.begin() + static_cast<long>(median_index),
                   errors.end());
  const double median = errors[median_index];
  std::nth_element(errors.begin(), errors.begin() + static_cast<long>(tail_index),
                   errors.end());
  const double tail = errors[tail_index];

  if (median > 0.0 && tail / median > ratio_threshold) {
    throw ContaminatedTrainingSet(
        "the upper tail of reconstruction errors dwarfs the median; the training "
        "set probably contains anomalies");
  }
}

// Threshold as a percentile of held-out normal errors.
//
// Not a round number: the error scale is arbitrary and shifts with every
// retrain, so a threshold must be recalibrated alongside the model rather
// than carried across.
[[nodiscard]] inline double CalibrateThreshold(std::vector<double> errors,
                                               double false_positive_rate) {
  if (false_positive_rate <= 0.0 || false_positive_rate >= 1.0) {
    throw ShapeMismatch("the false-positive rate must lie inside (0, 1)");
  }
  const std::size_t index = std::min(
      static_cast<std::size_t>((1.0 - false_positive_rate) *
                               static_cast<double>(errors.size())),
      errors.size() - 1);
  std::nth_element(errors.begin(), errors.begin() + static_cast<long>(index), errors.end());
  return errors[index];
}

}  // namespace autoencoder
`,
        rationale:
          'Two changes, both aimed at failures the loss cannot see. The constraint — what stops the model collapsing to the identity — becomes an explicit enum rather than a scattering of flags, because choosing it is the actual modelling decision, and the config refuses an undercomplete configuration whose code is as wide as its input: that combination has the identity as a zero-loss global optimum, so the model reports perfect success having learned nothing. The second is contamination. A training set containing the anomalies it should detect teaches the model to reconstruct them, and the detector is then blind to exactly what it exists for with no downstream signal; the heuristic on the error distribution turns that into something the pipeline refuses rather than something found months later, and both of its order statistics use nth_element because they are selections and sorting the rest is discarded work. Alongside those, storage flattens to row-major so a weight row is a contiguous span, tied weights make the decoder a transpose rather than a second matrix, the corruption buffer is owned so a training loop allocates nothing, and effective rank becomes a function because dead units narrow the real bottleneck invisibly.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Same asymptotics with a far better constant: flat storage makes every access stride-one, and nth_element turns each calibration percentile from O(n log n) into O(n). Illustrative, not a measured benchmark.',
      },

      'make-it-fast': {
        code: `// Batched, fused, and with the closed-form baseline available alongside.
//
// The structural observation: an autoencoder has no sequential dependency at
// all, so every layer is a dense matrix product and the whole thing batches
// trivially. That makes the interesting optimization not the arithmetic but
// what you compare against - a LINEAR autoencoder under squared error
// provably recovers the principal subspace, so the exact SVD answer exists
// and should be computed before any gradient descent is run.
//
// Three changes:
//   1. Encode, decode and both gradient terms become GEMMs over the batch.
//   2. The residual is computed ONCE and reused: it is the loss, the output
//      gradient and the anomaly score, so materializing it three times is
//      pure waste - and that economy is the model's defining feature.
//   3. Tied weights make the decoder a transpose, halving both parameters
//      and the bandwidth the update touches.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <lapacke.h>
#include <omp.h>

namespace autoencoder {

// One arena for a whole batch: activations are identically shaped every step,
// so allocating once and reusing is the difference between a training loop
// that touches the allocator and one that does not.
class BatchedAutoencoder {
 public:
  BatchedAutoencoder(int max_rows, int input_dim, int latent_dim)
      : input_dim_(input_dim), latent_dim_(latent_dim),
        weight_(static_cast<std::size_t>(input_dim) * latent_dim, 0.0F),
        encoder_bias_(latent_dim, 0.0F),
        decoder_bias_(input_dim, 0.0F),
        code_(static_cast<std::size_t>(max_rows) * latent_dim),
        residual_(static_cast<std::size_t>(max_rows) * input_dim),
        corrupted_(static_cast<std::size_t>(max_rows) * input_dim),
        code_delta_(static_cast<std::size_t>(max_rows) * latent_dim),
        weight_gradient_(static_cast<std::size_t>(input_dim) * latent_dim) {}

  // batch is (rows x input_dim) row-major. Returns the mean squared error,
  // and leaves the residual in place for the caller to reuse as a score.
  float TrainStep(const float* __restrict batch, int rows, float noise_level,
                  float learning_rate, uint64_t seed) {
    Corrupt(batch, rows, noise_level, seed);

    // Encode: (rows x input) x (input x latent).
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, latent_dim_,
                input_dim_, 1.0F, corrupted_.data(), input_dim_, weight_.data(),
                latent_dim_, 0.0F, code_.data(), latent_dim_);

    // Fused bias and logistic in one pass: the pre-activation is never a
    // separate buffer, and the code is the widest intermediate here.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = code_.data() + static_cast<std::size_t>(r) * latent_dim_;
      for (int i = 0; i < latent_dim_; ++i) {
        row[i] = 1.0F / (1.0F + std::exp(-(row[i] + encoder_bias_[i])));
      }
    }

    // Decode straight into the residual buffer, then subtract the target in
    // place. The rebuilt input is never a separate array: it BECOMES the
    // residual, which is simultaneously the loss, the gradient and the score.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows, input_dim_,
                latent_dim_, 1.0F, code_.data(), latent_dim_, weight_.data(),
                latent_dim_, 0.0F, residual_.data(), input_dim_);

    float loss = 0.0F;
#pragma omp parallel for reduction(+ : loss) schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = residual_.data() + static_cast<std::size_t>(r) * input_dim_;
      const float* target = batch + static_cast<std::size_t>(r) * input_dim_;
      for (int j = 0; j < input_dim_; ++j) {
        row[j] = row[j] + decoder_bias_[j] - target[j];
        loss += row[j] * row[j];
      }
    }

    Backward(rows, learning_rate);
    return loss / static_cast<float>(rows);
  }

  // The residual IS the score. No separate detector is fitted, and after a
  // TrainStep the buffer already holds it.
  void AnomalyScores(int rows, float* __restrict scores) const {
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* row = residual_.data() + static_cast<std::size_t>(r) * input_dim_;
      float total = 0.0F;
      for (int j = 0; j < input_dim_; ++j) {
        total += row[j] * row[j];
      }
      scores[r] = total;
    }
  }

 private:
  void Corrupt(const float* __restrict batch, int rows, float noise_level,
               uint64_t seed) {
    // Denoising: corrupt the INPUT, ask for the CLEAN target. A stronger
    // constraint than any penalty, because copying is no longer available.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      uint64_t state = seed + static_cast<uint64_t>(r) * 0x9E3779B97F4A7C15ULL;
      float* target = corrupted_.data() + static_cast<std::size_t>(r) * input_dim_;
      const float* source = batch + static_cast<std::size_t>(r) * input_dim_;
      for (int j = 0; j < input_dim_; ++j) {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        const float draw = static_cast<float>(state >> 40) * (1.0F / 16777216.0F);
        target[j] = draw < noise_level ? 0.0F : source[j];
      }
    }
  }

  void Backward(int rows, float learning_rate) {
    // Backpropagate into the code, then through the logistic. The derivative
    // uses the activation already in memory rather than recomputing it.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, latent_dim_,
                input_dim_, 1.0F, residual_.data(), input_dim_, weight_.data(),
                latent_dim_, 0.0F, code_delta_.data(), latent_dim_);

#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* delta = code_delta_.data() + static_cast<std::size_t>(r) * latent_dim_;
      const float* code = code_.data() + static_cast<std::size_t>(r) * latent_dim_;
      for (int i = 0; i < latent_dim_; ++i) {
        delta[i] *= code[i] * (1.0F - code[i]);
      }
    }

    // Tied weights mean ONE matrix receives BOTH gradient terms: the decoder
    // path (residual^T code) and the encoder path (corrupted^T code_delta).
    // Two GEMMs accumulating into one buffer, then a single update.
    cblas_sgemm(CblasRowMajor, CblasTrans, CblasNoTrans, input_dim_, latent_dim_,
                rows, 1.0F, residual_.data(), input_dim_, code_.data(), latent_dim_,
                0.0F, weight_gradient_.data(), latent_dim_);
    cblas_sgemm(CblasRowMajor, CblasTrans, CblasNoTrans, input_dim_, latent_dim_,
                rows, 1.0F, corrupted_.data(), input_dim_, code_delta_.data(),
                latent_dim_, 1.0F, weight_gradient_.data(), latent_dim_);

    const float scale = 2.0F * learning_rate / static_cast<float>(rows);
    cblas_saxpy(static_cast<int>(weight_.size()), -scale, weight_gradient_.data(), 1,
                weight_.data(), 1);
  }

  int input_dim_;
  int latent_dim_;
  std::vector<float> weight_;
  std::vector<float> encoder_bias_;
  std::vector<float> decoder_bias_;
  std::vector<float> code_;
  std::vector<float> residual_;
  std::vector<float> corrupted_;
  std::vector<float> code_delta_;
  std::vector<float> weight_gradient_;
};

// The closed-form answer, computed before any gradient descent.
//
// A LINEAR autoencoder under squared error provably recovers the principal
// subspace, so this is the exact solution to the problem a linear model is
// iterating toward. Always know it: if a nonlinear autoencoder does not beat
// this at the same latent width, the extra machinery is earning nothing and
// the SVD is faster, exact and has no hyperparameters.
inline float PcaBaseline(std::span<float> centred, int rows, int columns,
                         int latent_dim, std::span<float> components) {
  std::vector<float> singular(static_cast<std::size_t>(std::min(rows, columns)));
  std::vector<float> left(1);  // 'N': the left factor is discarded entirely
  std::vector<float> work(static_cast<std::size_t>(std::min(rows, columns)) - 1);

  // 'N' for U: the full factorization computes a rows-by-rows left factor
  // that is immediately thrown away, and on a large batch that dominates.
  LAPACKE_sgesvd(LAPACK_ROW_MAJOR, 'N', 'S', rows, columns, centred.data(), columns,
                 singular.data(), left.data(), 1, components.data(), columns,
                 work.data());

  // Reconstruction error of the rank-k truncation is the tail of the squared
  // singular values - available for free, with no reconstruction computed.
  float discarded = 0.0F;
  for (std::size_t i = static_cast<std::size_t>(latent_dim); i < singular.size(); ++i) {
    discarded += singular[i] * singular[i];
  }
  return discarded / static_cast<float>(rows);
}

}  // namespace autoencoder
`,
        rationale:
          'The structural point is that an autoencoder has no sequential dependency, so every layer is a dense product and the whole model batches trivially — which makes the interesting optimization not the arithmetic but what you compare against. A linear autoencoder under squared error provably recovers the principal subspace, so the exact SVD answer is available and computing it first is the discipline this stage encodes; the factorization asks for no left factor at all, since the full form computes a rows-by-rows matrix that is immediately discarded, and the rank-k reconstruction error falls out of the singular-value tail without reconstructing anything. Within the training step the decode writes straight into the residual buffer and the target is subtracted in place, so the rebuilt input never exists as a separate array — it becomes the residual, which is simultaneously the loss, the output gradient and the anomaly score, and that economy is the model’s defining feature rather than an implementation detail. Tied weights mean one matrix receives both gradient terms, accumulated into a single buffer with beta equal to one and applied with a single axpy. The sigmoid derivative uses the activation already in memory rather than recomputing it.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Encode, decode and both gradient terms are GEMMs over the batch, with the second gradient accumulating into the first via beta equal to one so no separate add is needed.',
            tradeoff: 'The two gradient products are transposed contractions over the batch axis, which BLAS handles but with a less favourable access pattern than the forward pass — so the backward step is measurably slower per FLOP than the forward one.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias and the logistic happen in one pass, and the decode, bias and target subtraction happen in another that also reduces the loss — so neither the pre-activation nor the rebuilt input is ever a live buffer.',
            tradeoff: 'The reconstruction itself is destroyed to become the residual, so plotting what the model actually rebuilt — the natural thing to inspect when a detector misbehaves — requires a second forward pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The corruption, the fused activation, the fused residual-and-loss pass and the score reduction are all row-independent with no shared writes, and the per-row generator state is derived from the row index so it stays reproducible.',
            tradeoff: 'These passes are memory-bound rather than compute-bound, so threading them competes for bandwidth with the BLAS calls around them and can slow the step when both are threaded at once.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'One flat weight matrix indexed input-then-latent makes both the forward product and the tied transpose read contiguously, and all scratch is allocated once at the batch maximum.',
            tradeoff: 'Every buffer is sized to the largest batch the object will ever see and held for its lifetime, so a long-lived instance that mostly processes small batches keeps that footprint permanently.',
          },
        ],
        libraryName: 'OpenBLAS + LAPACK + OpenMP',
        profile:
          'A training step becomes four GEMMs and an axpy for the whole batch. Illustrative, not a measured benchmark: the PCA baseline on the same data is a single factorization and is worth running first precisely because it is so much cheaper than the training loop it might make unnecessary.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// An autoencoder, transcribed the way the definition reads.
//
//   h     = sigma(W x + b)      encode: squeeze into k dimensions
//   x_hat = W' h + b'           decode: rebuild d dimensions
//   loss  = ||x - x_hat||^2     the whole objective
//
// Nothing about the loss makes this non-trivial. What does is the BOTTLENECK:
// with k as wide as d and enough capacity, the identity function is a global
// minimum with zero loss, and the model learns nothing while reporting
// perfect success. Every useful variant is a story about what stops that.
//
// Vec-of-Vec, index loops, one sample at a time, manual backward pass.

/// A deliberately small generator, so the corruption story stays visible.
struct Lcg {
    state: u64,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }

    fn uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 11) as f64) / ((1u64 << 53) as f64)
    }
}

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

fn matvec(weight: &[Vec<f64>], vector: &[f64], bias: &[f64]) -> Vec<f64> {
    let mut output = vec![0.0_f64; weight.len()];
    for i in 0..weight.len() {
        let mut accumulated = bias[i];
        for j in 0..vector.len() {
            accumulated += weight[i][j] * vector[j];
        }
        output[i] = accumulated;
    }
    output
}

struct Params {
    encoder_weight: Vec<Vec<f64>>,
    encoder_bias: Vec<f64>,
    decoder_weight: Vec<Vec<f64>>,
    decoder_bias: Vec<f64>,
}

fn encode(sample: &[f64], params: &Params) -> Vec<f64> {
    let mut code = matvec(&params.encoder_weight, sample, &params.encoder_bias);
    for value in code.iter_mut() {
        *value = sigmoid(*value);
    }
    code
}

/// Linear output head: the data here is unbounded, so a sigmoid would cap
/// reconstruction permanently and the loss would plateau with no other
/// symptom. The output activation must match the data range.
fn decode(code: &[f64], params: &Params) -> Vec<f64> {
    matvec(&params.decoder_weight, code, &params.decoder_bias)
}

/// This single quantity is BOTH the training signal and, at inference, the
/// anomaly score. That economy is the model's central feature.
fn reconstruction_error(sample: &[f64], rebuilt: &[f64]) -> f64 {
    sample
        .iter()
        .zip(rebuilt)
        .map(|(a, b)| (a - b) * (a - b))
        .sum()
}

/// One sample, forward and backward, written out.
///
/// The denoising variant: corrupt the INPUT but ask for the CLEAN target.
/// That is a stronger constraint than any penalty term, because copying the
/// input is no longer available as a solution at all - the network must learn
/// the data manifold to fill in what was destroyed.
fn train_step(
    sample: &[f64],
    params: &mut Params,
    learning_rate: f64,
    noise_level: f64,
    rng: &mut Lcg,
) -> f64 {
    let corrupted: Vec<f64> = sample
        .iter()
        .map(|&value| if rng.uniform() < noise_level { 0.0 } else { value })
        .collect();

    let code = encode(&corrupted, params);
    let rebuilt = decode(&code, params);

    // dL/dx_hat for squared error.
    let output_delta: Vec<f64> = rebuilt
        .iter()
        .zip(sample)
        .map(|(r, s)| 2.0 * (r - s))
        .collect();

    // Decoder gradient: residual times code. The same outer-product form as
    // any least-squares fit - the network is doing regression against its own
    // input, layer by layer.
    for i in 0..params.decoder_weight.len() {
        for j in 0..code.len() {
            params.decoder_weight[i][j] -= learning_rate * output_delta[i] * code[j];
        }
        params.decoder_bias[i] -= learning_rate * output_delta[i];
    }

    // Backpropagate into the code, then through the sigmoid.
    let mut hidden_delta = vec![0.0_f64; code.len()];
    for j in 0..code.len() {
        let mut accumulated = 0.0;
        for i in 0..output_delta.len() {
            accumulated += output_delta[i] * params.decoder_weight[i][j];
        }
        hidden_delta[j] = accumulated * code[j] * (1.0 - code[j]);
    }

    for j in 0..params.encoder_weight.len() {
        for k in 0..corrupted.len() {
            params.encoder_weight[j][k] -= learning_rate * hidden_delta[j] * corrupted[k];
        }
        params.encoder_bias[j] -= learning_rate * hidden_delta[j];
    }

    reconstruction_error(sample, &rebuilt)
}

fn initialise(input_dim: usize, latent_dim: usize, rng: &mut Lcg) -> Params {
    let limit = (6.0 / (input_dim + latent_dim) as f64).sqrt();
    let mut draw = |rng: &mut Lcg| (rng.uniform() * 2.0 - 1.0) * limit;

    Params {
        encoder_weight: (0..latent_dim)
            .map(|_| (0..input_dim).map(|_| draw(rng)).collect())
            .collect(),
        encoder_bias: vec![0.0; latent_dim],
        decoder_weight: (0..input_dim)
            .map(|_| (0..latent_dim).map(|_| draw(rng)).collect())
            .collect(),
        decoder_bias: vec![0.0; input_dim],
    }
}

/// No separate detector is fitted. The residual IS the score.
fn anomaly_scores(data: &[Vec<f64>], params: &Params) -> Vec<f64> {
    data.iter()
        .map(|sample| {
            let code = encode(sample, params);
            reconstruction_error(sample, &decode(&code, params))
        })
        .collect()
}

/// How many latent dimensions are actually being used.
///
/// A dead unit makes the real bottleneck narrower than the declared one, and
/// a rank equal to the input width means the model found the identity
/// shortcut. Neither is visible in the loss.
fn effective_rank(codes: &[Vec<f64>], tolerance: f64) -> usize {
    let latent_dim = codes[0].len();
    let mut used = 0;
    for unit in 0..latent_dim {
        let mean: f64 = codes.iter().map(|code| code[unit]).sum::<f64>() / codes.len() as f64;
        let variance: f64 = codes
            .iter()
            .map(|code| (code[unit] - mean) * (code[unit] - mean))
            .sum::<f64>()
            / codes.len() as f64;
        if variance > tolerance {
            used += 1;
        }
    }
    used
}
`,
        profile:
          'O(d * k) per sample per layer, forward and backward. Illustrative, not a measured benchmark: one sample at a time with Vec-of-Vec storage means every inner access chases two pointers and carries a bounds check the compiler cannot hoist.',
      },

      'make-it-right': {
        code: `//! The same model, with the constraint made explicit and the collapse checked.
//!
//! Two things change. The variant - what stops this collapsing to the
//! identity - becomes a type rather than a scattering of flags, because
//! choosing it IS the modelling decision. And the two failures the loss
//! cannot see - the identity collapse and a training set containing
//! anomalies - become errors the code returns rather than things you
//! discover months later.

use std::fmt;

/// Width of the input feature vector.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct InputDim(pub usize);

/// Width of the bottleneck.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct LatentDim(pub usize);

/// What prevents the degenerate solution.
///
/// Not a style choice: with an unconstrained wide bottleneck the identity
/// function is a global minimum with zero loss, so one of these must be in
/// force or the model learns nothing while reporting perfect success.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Constraint {
    /// The bottleneck alone.
    Undercomplete,
    /// Corrupt the input, ask for the clean target. Usually the best choice.
    Denoising { noise_level: f64 },
    /// Penalize mean activation, so an overcomplete code stays mostly zero.
    Sparse { target: f64, weight: f64 },
    /// Penalize the encoder Jacobian, so the code resists small input changes.
    Contractive { weight: f64 },
}

#[derive(Debug, PartialEq)]
pub enum AutoencoderError {
    /// The model can trivially learn the identity.
    ///
    /// Its own variant because it is the failure with no other symptom: the
    /// loss goes to zero and the representation is worthless.
    Degenerate { input_dim: usize, latent_dim: usize },
    /// The training data looks like it contains anomalies.
    ///
    /// Its own variant because the consequence is specific: the detector
    /// learns to reconstruct them and is blind to exactly what it was built
    /// for, with nothing downstream to indicate it.
    ContaminatedTrainingSet { tail_ratio: f64 },
    /// A corruption rate outside the open unit interval.
    InvalidNoiseLevel(f64),
    /// Too few samples to judge a distribution.
    TooFewSamples { have: usize, need: usize },
    /// A buffer length that does not match the shape it should carry.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for AutoencoderError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Degenerate { input_dim, latent_dim } => write!(
                f,
                "a {latent_dim}-wide code for {input_dim} inputs is not undercomplete; \
                 the identity is a zero-loss optimum"
            ),
            Self::ContaminatedTrainingSet { tail_ratio } => write!(
                f,
                "the error tail is {tail_ratio:.0}x the median; the training set \
                 probably contains anomalies"
            ),
            Self::InvalidNoiseLevel(level) => {
                write!(f, "corruption rate {level} must lie strictly inside (0, 1)")
            }
            Self::TooFewSamples { have, need } => {
                write!(f, "{have} samples is short of the {need} needed")
            }
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for AutoencoderError {}

/// Frozen configuration, validated once at construction.
#[derive(Debug, Clone, Copy)]
pub struct Config {
    pub input_dim: InputDim,
    pub latent_dim: LatentDim,
    pub constraint: Constraint,
    pub tied_weights: bool,
}

impl Config {
    /// Guard clause for the failure the loss cannot see.
    pub fn validate(&self) -> Result<(), AutoencoderError> {
        if self.latent_dim.0 == 0 {
            return Err(AutoencoderError::ShapeMismatch { expected: 1, found: 0 });
        }
        if self.constraint == Constraint::Undercomplete
            && self.latent_dim.0 >= self.input_dim.0
        {
            return Err(AutoencoderError::Degenerate {
                input_dim: self.input_dim.0,
                latent_dim: self.latent_dim.0,
            });
        }
        if let Constraint::Denoising { noise_level } = self.constraint {
            if !(0.0..1.0).contains(&noise_level) || noise_level == 0.0 {
                return Err(AutoencoderError::InvalidNoiseLevel(noise_level));
            }
        }
        Ok(())
    }

    /// Worth naming: this IS the constraint, expressed as a number.
    pub fn compression_ratio(&self) -> f64 {
        self.latent_dim.0 as f64 / self.input_dim.0 as f64
    }
}

/// Code and rebuilt input together.
///
/// Both come back because callers need different halves: representation work
/// wants the code, detection wants the residual, and returning only one
/// forces a second forward pass.
pub struct Reconstruction {
    pub code: Vec<f64>,
    pub rebuilt: Vec<f64>,
}

impl Reconstruction {
    pub fn squared_error(&self, original: &[f64]) -> f64 {
        original
            .iter()
            .zip(&self.rebuilt)
            .map(|(a, b)| (a - b) * (a - b))
            .sum()
    }

    /// Which dimension was wrong, not just how wrong overall.
    ///
    /// A scalar says something is unusual; this says what. That is most of
    /// the operational value, and it costs nothing extra.
    pub fn per_feature_residual(&self, original: &[f64]) -> Vec<f64> {
        original
            .iter()
            .zip(&self.rebuilt)
            .map(|(a, b)| (a - b) * (a - b))
            .collect()
    }
}

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// Flat row-major weights and owned scratch, so a repeated forward pass
/// allocates nothing and every row is a contiguous slice.
pub struct Autoencoder {
    config: Config,
    /// input_dim x latent_dim, row-major. With tied weights this is the
    /// decoder too, transposed - half the parameters and a free regularizer.
    weight: Vec<f64>,
    decoder_weight: Option<Vec<f64>>,
    encoder_bias: Vec<f64>,
    decoder_bias: Vec<f64>,
    corrupted: Vec<f64>,
}

impl Autoencoder {
    pub fn new(config: Config, weights: Vec<f64>) -> Result<Self, AutoencoderError> {
        config.validate()?;
        let expected = config.input_dim.0 * config.latent_dim.0;
        if weights.len() != expected {
            return Err(AutoencoderError::ShapeMismatch {
                expected,
                found: weights.len(),
            });
        }

        Ok(Self {
            config,
            weight: weights,
            decoder_weight: if config.tied_weights {
                None
            } else {
                Some(vec![0.0; expected])
            },
            encoder_bias: vec![0.0; config.latent_dim.0],
            decoder_bias: vec![0.0; config.input_dim.0],
            corrupted: vec![0.0; config.input_dim.0],
        })
    }

    pub fn forward(&self, sample: &[f64]) -> Result<Reconstruction, AutoencoderError> {
        if sample.len() != self.config.input_dim.0 {
            return Err(AutoencoderError::ShapeMismatch {
                expected: self.config.input_dim.0,
                found: sample.len(),
            });
        }

        let latent = self.config.latent_dim.0;
        let mut code = vec![0.0; latent];
        for (j, &value) in sample.iter().enumerate() {
            if value == 0.0 {
                continue;
            }
            let row = &self.weight[j * latent..(j + 1) * latent];
            for (accumulator, &w) in code.iter_mut().zip(row) {
                *accumulator += value * w;
            }
        }
        for (value, &bias) in code.iter_mut().zip(&self.encoder_bias) {
            *value = sigmoid(*value + bias);
        }

        // Linear output head: the data range is unbounded, and a sigmoid here
        // would cap reconstruction permanently with the loss plateauing and
        // no other symptom.
        let decoder = self.decoder_weight.as_deref().unwrap_or(&self.weight);
        let rebuilt = self
            .decoder_bias
            .iter()
            .enumerate()
            .map(|(j, &bias)| {
                let row = &decoder[j * latent..(j + 1) * latent];
                bias + row.iter().zip(&code).map(|(w, c)| w * c).sum::<f64>()
            })
            .collect();

        Ok(Reconstruction { code, rebuilt })
    }

    /// Denoising: corrupt the INPUT and ask for the CLEAN target.
    ///
    /// A stronger constraint than any penalty term, because copying the input
    /// is no longer available as a solution at all - the network must learn
    /// the data manifold to fill in what was destroyed.
    pub fn corrupt(&mut self, sample: &[f64], uniform: &mut impl FnMut() -> f64) -> &[f64] {
        match self.config.constraint {
            Constraint::Denoising { noise_level } => {
                for (target, &value) in self.corrupted.iter_mut().zip(sample) {
                    *target = if uniform() < noise_level { 0.0 } else { value };
                }
                &self.corrupted
            }
            _ => sample,
        }
    }
}

/// How many latent dimensions are actually used.
///
/// A dead unit makes the real bottleneck narrower than the declared one, and
/// a rank matching the input width means the model found the identity
/// shortcut. Neither is visible in the loss, which is why this is a function
/// rather than a comment.
pub fn effective_rank(codes: &[f64], latent: LatentDim, tolerance: f64) -> usize {
    let rows = codes.len() / latent.0;
    (0..latent.0)
        .filter(|&unit| {
            let values = (0..rows).map(|r| codes[r * latent.0 + unit]);
            let mean = values.clone().sum::<f64>() / rows as f64;
            values.map(|v| (v - mean) * (v - mean)).sum::<f64>() / rows as f64 > tolerance
        })
        .count()
}

/// Heuristic check that the training set is anomaly-free.
///
/// A clean training set produces a reconstruction-error distribution with a
/// short tail. A long one means the model is being asked to reconstruct
/// things that do not belong - and if it succeeds, the detector is blind to
/// exactly what it was built for.
pub fn assert_training_set_clean(
    errors: &mut [f64],
    tail_fraction: f64,
    ratio_threshold: f64,
) -> Result<(), AutoencoderError> {
    if errors.len() < 100 {
        return Err(AutoencoderError::TooFewSamples { have: errors.len(), need: 100 });
    }

    let median_index = errors.len() / 2;
    let tail_index = ((errors.len() as f64) * (1.0 - tail_fraction)) as usize;

    // select_nth_unstable twice, not a sort: both are selections and ordering
    // the rest is work whose result is discarded.
    errors.select_nth_unstable_by(median_index, |a, b| a.total_cmp(b));
    let median = errors[median_index];
    errors.select_nth_unstable_by(tail_index, |a, b| a.total_cmp(b));
    let tail = errors[tail_index];

    let ratio = if median > 0.0 { tail / median } else { 0.0 };
    if ratio > ratio_threshold {
        return Err(AutoencoderError::ContaminatedTrainingSet { tail_ratio: ratio });
    }
    Ok(())
}

/// Threshold as a percentile of held-out normal errors.
///
/// Not a round number: the error scale is arbitrary and shifts with every
/// retrain, so a threshold must be recalibrated alongside the model rather
/// than carried across.
pub fn calibrate_threshold(errors: &mut [f64], false_positive_rate: f64) -> f64 {
    let index = (((1.0 - false_positive_rate) * errors.len() as f64) as usize)
        .min(errors.len() - 1);
    errors.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
    errors[index]
}
`,
        rationale:
          'Two changes, both aimed at failures the loss cannot see. The constraint becomes an enum carrying its own parameters rather than a scattering of flags, because choosing it is the actual modelling decision — and the config refuses an undercomplete configuration whose code is as wide as its input, since that combination has the identity as a zero-loss global optimum and the model then reports perfect success having learned nothing. The second is contamination: a training set containing the anomalies it should detect teaches the model to reconstruct them, leaving the detector blind to exactly what it exists for with no downstream signal, so the heuristic on the error distribution becomes an error variant the pipeline can refuse on. Both of its order statistics use select_nth_unstable because they are selections and sorting the rest is discarded work. Alongside those, storage flattens to row-major so a weight row is a contiguous slice, tied weights make the decoder an Option that is absent rather than a duplicated matrix, the corruption buffer is owned so a training loop allocates nothing, input and latent widths become newtypes since both are usize and are genuinely swapped, and effective rank becomes a function because dead units narrow the real bottleneck invisibly.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Same asymptotics with a far better constant: flat storage makes every access stride-one, and select_nth_unstable turns each calibration percentile from O(n log n) into O(n). Illustrative, not a measured benchmark.',
      },

      'make-it-fast': {
        code: `//! Batched, fused, and with the closed-form baseline available alongside.
//!
//! The structural observation: an autoencoder has no sequential dependency at
//! all, so every layer is a dense matrix product and the whole thing batches
//! trivially. That makes the interesting optimization not the arithmetic but
//! what you compare against - a LINEAR autoencoder under squared error
//! provably recovers the principal subspace, so the exact answer exists in
//! closed form and should be computed before any gradient descent runs.
//!
//! Three changes:
//!   1. Encode, decode and both gradient terms become matrix products.
//!   2. The residual is computed ONCE and reused: it is the loss, the output
//!      gradient and the anomaly score, so materializing it three times is
//!      pure waste - and that economy is the model's defining feature.
//!   3. Tied weights make the decoder a transpose, halving both parameters
//!      and the bandwidth the update touches.

use ndarray::{Array1, Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Scratch sized once at construction and sliced per step, so the training
/// loop never touches the allocator.
pub struct BatchedAutoencoder {
    /// input_dim x latent_dim. With tied weights this is the decoder too.
    weight: Array2<f32>,
    encoder_bias: Array1<f32>,
    decoder_bias: Array1<f32>,
    corrupted: Array2<f32>,
}

impl BatchedAutoencoder {
    pub fn new(max_rows: usize, input_dim: usize, latent_dim: usize) -> Self {
        Self {
            weight: Array2::zeros((input_dim, latent_dim)),
            encoder_bias: Array1::zeros(latent_dim),
            decoder_bias: Array1::zeros(input_dim),
            corrupted: Array2::zeros((max_rows, input_dim)),
        }
    }

    /// One batched step. The residual is computed ONCE and reused.
    ///
    /// It is simultaneously the loss, the output gradient and the anomaly
    /// score, so materializing it three separate times would be pure waste -
    /// and that economy is the model's central feature rather than an
    /// implementation detail.
    pub fn train_step(
        &mut self,
        batch: ArrayView2<'_, f32>,
        noise_level: f32,
        learning_rate: f32,
        seed: u64,
    ) -> f32 {
        let rows = batch.shape()[0];
        let mut corrupted = self.corrupted.slice_mut(ndarray::s![..rows, ..]);

        // Denoising: corrupt the INPUT, ask for the CLEAN target. A stronger
        // constraint than any penalty, because copying is no longer even
        // available as a solution. Seeded per row so the stream survives
        // however rayon schedules the work.
        Zip::from(corrupted.axis_iter_mut(Axis(0)))
            .and(batch.axis_iter(Axis(0)))
            .par_for_each(|mut target, source| {
                let mut state = seed
                    ^ (target.as_ptr() as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15);
                for (slot, &value) in target.iter_mut().zip(source.iter()) {
                    state ^= state << 13;
                    state ^= state >> 7;
                    state ^= state << 17;
                    let draw = (state >> 40) as f32 * (1.0 / 16_777_216.0);
                    *slot = if draw < noise_level { 0.0 } else { value };
                }
            });

        let corrupted_view = self.corrupted.slice(ndarray::s![..rows, ..]);
        let mut code = corrupted_view.dot(&self.weight);

        // Fused bias and logistic in one parallel pass: the pre-activation is
        // never a separate buffer, and the code is the widest intermediate.
        Zip::from(code.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.encoder_bias.iter()) {
                *value = 1.0 / (1.0 + (-(*value + bias)).exp());
            }
        });

        // Decode into a buffer that immediately BECOMES the residual: the
        // rebuilt input is never a separate array.
        let mut residual = code.dot(&self.weight.t());
        let mut loss = 0.0f32;
        Zip::from(residual.axis_iter_mut(Axis(0)))
            .and(batch.axis_iter(Axis(0)))
            .for_each(|mut row, target| {
                for ((value, &bias), &actual) in row
                    .iter_mut()
                    .zip(self.decoder_bias.iter())
                    .zip(target.iter())
                {
                    *value = *value + bias - actual;
                    loss += *value * *value;
                }
            });

        // Backpropagate into the code, then through the logistic. The
        // derivative uses the activation already in memory, not a recompute.
        let mut code_delta = residual.dot(&self.weight);
        Zip::from(&mut code_delta)
            .and(&code)
            .par_for_each(|delta, &activation| {
                *delta *= activation * (1.0 - activation);
            });

        // Tied weights mean ONE matrix receives BOTH gradient terms: the
        // decoder path and the encoder path, summed before a single update.
        let gradient =
            residual.t().dot(&code) + corrupted_view.t().dot(&code_delta);
        let scale = 2.0 * learning_rate / rows as f32;
        Zip::from(&mut self.weight)
            .and(&gradient)
            .par_for_each(|w, &g| *w -= scale * g);

        loss / rows as f32
    }

    /// The residual IS the score. No separate detector is fitted.
    pub fn anomaly_scores(&self, batch: ArrayView2<'_, f32>) -> Vec<f32> {
        let mut code = batch.dot(&self.weight);
        Zip::from(code.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.encoder_bias.iter()) {
                *value = 1.0 / (1.0 + (-(*value + bias)).exp());
            }
        });

        let rebuilt = code.dot(&self.weight.t());
        rebuilt
            .axis_iter(Axis(0))
            .into_par_iter()
            .zip(batch.axis_iter(Axis(0)).into_par_iter())
            .map(|(row, target)| {
                row.iter()
                    .zip(self.decoder_bias.iter())
                    .zip(target.iter())
                    .map(|((&value, &bias), &actual)| {
                        let residual = value + bias - actual;
                        residual * residual
                    })
                    .sum()
            })
            .collect()
    }
}

/// How many latent dimensions are actually used.
///
/// A dead unit makes the real bottleneck narrower than the declared one, and
/// a rank matching the input width means the model found the identity
/// shortcut. Neither is visible in the loss.
pub fn effective_rank(codes: ArrayView2<'_, f32>, tolerance: f32) -> usize {
    codes
        .axis_iter(Axis(1))
        .into_par_iter()
        .filter(|column| {
            let mean = column.iter().sum::<f32>() / column.len() as f32;
            column.iter().map(|v| (v - mean) * (v - mean)).sum::<f32>()
                / column.len() as f32
                > tolerance
        })
        .count()
}

/// Threshold as a percentile of held-out normal errors.
///
/// Selection, not a sort: a percentile needs one order statistic and ordering
/// the rest is discarded work. The error scale is arbitrary and shifts with
/// every retrain, so this must be recomputed alongside the model.
pub fn calibrate_threshold(errors: &mut [f32], false_positive_rate: f32) -> f32 {
    let index = (((1.0 - false_positive_rate) * errors.len() as f32) as usize)
        .min(errors.len() - 1);
    errors.select_nth_unstable_by(index, |a, b| a.total_cmp(b));
    errors[index]
}
`,
        rationale:
          'The structural point is that an autoencoder has no sequential dependency, so every layer is a dense product and the whole model batches trivially — which makes the interesting optimization not the arithmetic but what you compare against, since a linear autoencoder under squared error provably recovers the principal subspace and the exact answer is therefore available in closed form. Within the training step the decode writes into a buffer that immediately becomes the residual by subtracting the target in place, so the rebuilt input never exists as a separate array: it is simultaneously the loss, the output gradient and the anomaly score, and materializing it three times would be waste. Tied weights mean one matrix receives both gradient terms, summed before a single update, which halves both the parameters and the bandwidth the update touches. The corruption is generated per row from a row-derived seed so the stream survives rayon’s scheduling, the fused bias-and-logistic pass leaves the pre-activation unmaterialized, and the sigmoid derivative reuses the activation already in memory. The threshold calibration uses a selection rather than a sort, since a percentile needs one order statistic.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Encode, decode and both gradient terms are dense products dispatching to sgemm, and the tied decoder is a transposed view rather than a second matrix.',
            tradeoff: 'Binds the build to a system BLAS, and the two gradient products are transposed contractions over the batch axis — handled, but with a worse access pattern than the forward pass, so the backward step costs more per FLOP.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The corruption, the fused activation, the sigmoid-derivative pass and the score reduction are all row- or element-independent with no shared writes.',
            tradeoff: 'These passes are memory-bound rather than compute-bound, so they compete for bandwidth with the BLAS calls around them, and threading both at once can slow the step rather than speed it.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The decode result is mutated into the residual rather than copied, the tied decoder is a transposed view, and the corruption buffer is sliced from owned scratch instead of allocated per batch.',
            tradeoff: 'The reconstruction is destroyed to become the residual, so plotting what the model actually rebuilt — the natural thing to inspect when a detector misbehaves — requires a second forward pass.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Scratch is allocated once at the batch maximum and sliced per call, so every product sees a standard-layout operand and no step reallocates.',
            tradeoff: 'The scratch is sized for the largest batch the object will ever see and held for its lifetime, so a long-lived instance that mostly processes small batches keeps that footprint permanently.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'A training step becomes four products for the whole batch, against O(n * d * k) scalar iterations. Illustrative, not a measured benchmark: a PCA baseline on the same data is a single factorization and is worth running first precisely because it is so much cheaper than the training loop it might make unnecessary.',
      },
    },
  },
};
