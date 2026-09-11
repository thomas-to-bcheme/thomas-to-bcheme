import type { AiMlModel } from '../../types';

/**
 * Normalizing flows — the generative model that computes an exact likelihood.
 *
 * Included as the direct structural counterpoint to the VAE: same goal, same
 * latent-variable framing, and an objective that is the actual log-likelihood
 * rather than a bound on it. The price is paid entirely in architecture,
 * which is what makes it a good study in constraint-driven design.
 */
export const NORMALIZING_FLOWS: AiMlModel = {
  slug: 'normalizing-flows',
  name: 'Normalizing Flows',
  aliases: ['RealNVP', 'Glow', 'Coupling flows', 'Autoregressive flows', 'Invertible neural networks'],
  category: 'generative-ai',
  group: 'latent-variable',
  kind: 'model',

  paradigms: ['unsupervised'],
  taskTypes: ['generation', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Unsupervised in the strictest sense: the objective is the likelihood of the data under the model and nothing else enters. Unlike a VAE there is no encoder to train separately and no approximate posterior, because the inverse of the model IS the encoder — a property that comes from the architecture rather than from the objective.',

  intuition:
    'Start from a simple distribution you can sample and evaluate — a standard Gaussian — and push it through an invertible function. The change-of-variables formula says exactly what happens to the density: it is the base density at the preimage, corrected by how much the transformation stretched or compressed space there. So if you can build a flexible invertible function whose local volume change you can compute cheaply, you get an exact likelihood for free. The entire field is a search for such functions, and every architecture in it is a different answer to the same question: how do you keep a Jacobian determinant tractable without making the map trivial?',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\log p_\\theta(\\mathbf{x}) = \\log p_Z\\bigl(f_\\theta(\\mathbf{x})\\bigr) + \\log\\left\\lvert \\det \\frac{\\partial f_\\theta}{\\partial \\mathbf{x}} \\right\\rvert = \\log p_Z(\\mathbf{z}) + \\sum_{k=1}^{K} \\log\\left\\lvert \\det \\mathbf{J}_k \\right\\rvert',
      symbols: [
        { symbol: 'f_\\theta', meaning: 'the flow: an invertible map from data space to latent space, composed of K simpler bijections' },
        { symbol: 'p_Z', meaning: 'the base distribution, chosen so it can be both sampled and evaluated in closed form' },
        { symbol: '\\mathbf{J}_k', meaning: 'the Jacobian of the k-th transformation; the whole design problem is making its determinant cheap' },
        { symbol: '\\log\\lvert\\det\\rvert', meaning: 'the volume correction — positive where the map compresses, negative where it expands' },
        { symbol: 'K', meaning: 'the number of composed layers; determinants add in log space, so depth is free in this term' },
      ],
    },
    reading:
      'Read the two terms as separate jobs. The first asks whether the latent code lands somewhere the base distribution considers likely; the second corrects for the fact that the transformation changed how much space a region occupies. Without the correction the model could achieve arbitrarily high likelihood by compressing all its inputs into a tiny region of latent space, which is the degenerate solution the determinant exists to prevent. Two properties follow that distinguish this from everything nearby. The likelihood is exact — no bound, no sampling estimate, no variational gap — so model comparison actually means something. And because determinants multiply while their logarithms add, composing many layers costs nothing extra in this term, which is why flows are built deep and narrow.',
  },

  optimization: {
    method: 'Adam on the exact negative log-likelihood, with the architecture constrained so the Jacobian determinant is triangular',
    updateRule: {
      formula:
        '\\mathbf{y}_{1:d} = \\mathbf{x}_{1:d}, \\quad \\mathbf{y}_{d+1:D} = \\mathbf{x}_{d+1:D} \\odot \\exp\\bigl(s(\\mathbf{x}_{1:d})\\bigr) + t(\\mathbf{x}_{1:d}), \\qquad \\log\\lvert\\det \\mathbf{J}\\rvert = \\sum_j s_j(\\mathbf{x}_{1:d})',
      symbols: [
        { symbol: 's, t', meaning: 'scale and translation networks — arbitrarily complex, because they are never inverted' },
        { symbol: '\\mathbf{x}_{1:d}', meaning: 'the frozen half; it conditions the transformation of the other half and passes through unchanged' },
        { symbol: '\\odot \\exp(s)', meaning: 'an elementwise affine map whose Jacobian is diagonal on the transformed block' },
        { symbol: '\\sum_j s_j', meaning: 'the log-determinant: a sum, not a determinant computation, because the Jacobian is triangular' },
      ],
    },
    rationale:
      'The coupling layer is the idea worth extracting, and it is an unusually clean piece of design. Split the input in half; leave one half alone; transform the other half elementwise using parameters computed from the frozen half. The Jacobian of that map is block-triangular with a diagonal block, so its determinant is the product of the diagonal — a sum in log space, computed in linear time and without ever forming the matrix. The scale and translation networks can be arbitrarily deep and nonlinear because they are only ever evaluated forwards, never inverted, so all the expressive power hides in the part that does not need to be invertible. The cost is that half the dimensions pass through untouched, so the halves must be permuted between layers and depth becomes the only route to expressiveness. That is the trade the whole family makes: every architecture here buys a tractable determinant with a structural restriction, and deeper stacks are how the restriction is paid off.',
    hyperparameters: [
      { name: 'coupling layers', role: 'Depth. The only route to expressiveness, since each layer transforms half the dimensions', typicalRange: '8 to 32' },
      { name: 'coupling network width', role: 'Capacity of the scale and translation networks; free to be large since they are never inverted', typicalRange: '128 to 512' },
      { name: 'permutation scheme', role: 'How the halves are shuffled between layers. Fixed reversal, random, or a learned 1x1 convolution', typicalRange: 'reverse / random / learned' },
      { name: 'scale clamping', role: 'Bounds the exponential in the affine map. Without it the log-determinant diverges and training produces NaN', typicalRange: 'tanh-clamped to ±2 to ±5' },
      { name: 'dequantization noise', role: 'Continuous flows on discrete data assign unbounded density to the exact values unless noise is added', typicalRange: 'uniform or variational' },
      { name: 'base distribution', role: 'Almost always a standard Gaussian; must be both samplable and exactly evaluable', typicalRange: 'standard normal' },
    ],
    convergence:
      'Training is stable and pleasant compared with adversarial alternatives — there is one loss, it is exact, and it goes down. The failures are architectural rather than optimizational. The most common is a diverging log-determinant: the affine scale is exponentiated, so an unclamped scale network can drive it to infinity and the loss becomes NaN in a single step, which is why clamping is mandatory rather than advisable. The second is the expressiveness ceiling — because the map must be invertible and dimension-preserving, the model cannot compress, so a distribution on a low-dimensional manifold embedded in a high-dimensional space is fundamentally awkward for it, and the symptom is a model that fits fine and samples poorly. The third is specific to discrete data: without dequantization the likelihood is unbounded, and the model will happily chase it to infinity rather than learning anything.',
    complexity:
      'O(K · d · W) for a forward pass with K coupling layers and width W, both for density evaluation and for sampling, since both directions cost the same in a coupling flow. Memory is substantially higher than a comparable non-invertible model because the map is dimension-preserving at every layer — nothing is ever compressed, so the activation width never shrinks.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Condition the flow on an encoding of the history and let it model the distribution of the next values jointly. Because the likelihood is exact, the model is trained directly on the predictive density rather than on a point loss with an assumed error distribution — and because it is a joint density over the horizon, the correlation structure between horizons is modelled rather than assumed independent.',
        where: [
          'Multivariate probabilistic forecasting where the correlation between series matters as much as each marginal',
          'Forecasting with genuinely non-Gaussian predictive distributions — multimodal, skewed, or heavy-tailed',
          'Risk applications needing an exact joint density over a horizon rather than per-step quantiles',
          'Settings where the predictive distribution itself is the deliverable rather than a summary of it',
        ],
        why: 'Where the predictive distribution is genuinely non-Gaussian, this models it without assuming a family — which is a real advantage over a quantile forecaster that emits marginals, since a flow gives the joint and the joint is what any decision aggregating over time or across series actually needs. Against it, the objections are substantial and mostly practical: it is far more machinery than the alternatives, the invertibility constraint forces the latent dimension to equal the output dimension so a long multivariate horizon becomes a wide flow, and on most business series the predictive distribution is close enough to Gaussian that a quantile head captures everything that matters for a fraction of the cost. The honest trigger is a genuinely complicated predictive distribution that you can demonstrate is not Gaussian.',
        featurization: [
          'Normalize per series, since the base distribution is standard and an unscaled input makes the flow spend its capacity fixing the scale',
          'Condition every coupling layer on the history encoding rather than only the first, or the conditioning washes out with depth',
          'Model the horizon jointly rather than per step, because the joint structure is the only reason to prefer this over quantile regression',
          'Clamp the affine scale, since a diverging log-determinant produces NaN in a single step',
        ],
        evaluation:
          'Continuous ranked probability score and joint log-likelihood on held-out windows, with a quantile-regression baseline on the same data — that comparison is what establishes whether the extra machinery bought anything, and it frequently has not. Rolling-origin backtesting throughout, since a random split leaks future structure.',
        pitfalls: [
          'Assuming a non-Gaussian predictive distribution without demonstrating one, which is the only justification for the cost',
          'A wide multivariate horizon making the flow enormous, since dimension is preserved at every layer',
          'Conditioning only the first layer, so the history influence fades with depth',
          'Comparing likelihoods across models with different dequantization, which makes the numbers incomparable',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Fit the flow to normal data and score each point by its exact log-likelihood — low likelihood means anomalous. It is the most direct possible expression of density-based detection, with no reconstruction proxy, no bound and no threshold heuristic between the model and the score.',
        where: [
          'Tabular and low-dimensional anomaly detection where a genuine density is wanted rather than a proxy',
          'Scientific and instrument monitoring where the density is itself the object of interest',
          'Fraud and risk screening on engineered features, where the feature space is modest and well understood',
          'Cases requiring a calibrated probability rather than an uncalibrated score',
        ],
        why: 'On modest-dimensional tabular data this works well and the score means exactly what it says, which is more than any reconstruction-based detector can claim. But this fit is capped at viable for a specific and important reason: on high-dimensional data, particularly images, flows have been shown to assign HIGHER likelihood to out-of-distribution inputs than to their own training data — a model trained on one image dataset can rate a completely different one as more probable. That is not a tuning failure but a property of how likelihood behaves in high dimensions, where typicality and density come apart, and it means "low likelihood implies anomalous" is simply false there. Knowing that result is more valuable than knowing the architecture, and it is why typicality-based tests exist as an alternative to raw likelihood.',
        featurization: [
          'Standardize features, since the base distribution is standard and scale mismatch wastes model capacity',
          'Prefer a typicality test over a raw likelihood threshold in higher dimensions, where the two genuinely diverge',
          'Validate on known out-of-distribution data before trusting the score, because the high-dimensional failure is not visible from training',
          'Dequantize discrete features, or the likelihood is unbounded and the model chases it rather than learning',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget, and crucially an explicit check that held-out out-of-distribution data scores lower than in-distribution data — that check is the one that catches the high-dimensional likelihood pathology, and it is almost never run. Compare against an isolation forest, which on tabular data is competitive at a small fraction of the cost.',
        pitfalls: [
          'The high-dimensional likelihood inversion, where out-of-distribution inputs score higher than training data',
          'Training data containing the anomalies, which the density then rates as likely',
          'Comparing likelihoods across models with different dequantization schemes, which is meaningless',
          'Enormous cost against an isolation forest that performs comparably on tabular features',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The whole family is a constrained design problem: maximize expressiveness subject to the map being invertible and its Jacobian determinant being computable in less than cubic time. Every architecture is a different point on that frontier — coupling layers make the Jacobian triangular by construction, autoregressive flows do the same by ordering, and continuous flows replace the determinant with a trace. Underneath sits a general lesson about building constraints into a hypothesis class rather than enforcing them with a penalty.',
        where: [
          'Structural constraint as architecture: invertibility is guaranteed by construction rather than penalized in the loss',
          'Triangular Jacobians as the device that turns a cubic determinant into a linear sum',
          'The expressiveness-tractability frontier, where each architecture trades one for the other explicitly',
          'Change of variables as an exact reparameterization, against variational bounds as an approximate one',
        ],
        why: 'Worth studying because it is the clearest demonstration in this reference that a hard constraint can be designed into a model rather than imposed on it — nothing in the training ever checks invertibility, because the architecture makes violation impossible. That is a far stronger guarantee than a penalty, and the pattern transfers. The comparison with the VAE is the other lesson: both model the same kind of thing, and the flow pays for exactness in architectural restriction while the VAE pays for freedom in a variational gap. Neither is free, and seeing where each puts the cost is more instructive than either in isolation.',
        featurization: [
          'Permute or mix dimensions between coupling layers, or the untransformed half never changes and depth buys nothing',
          'Clamp the scale network output, since the exponential makes an unbounded scale a single-step divergence',
          'Prefer a learned invertible mixing layer to a fixed permutation where cost permits, since it uses depth more efficiently',
          'Verify invertibility numerically once as a test — the architecture guarantees it, but an implementation bug does not',
        ],
        evaluation:
          'Compare architectures at matched parameter count on the same data, reporting both likelihood and sample quality, because they diverge more than expected. Measure the forward and inverse cost separately: some flows are cheap in one direction and expensive in the other, and which direction matters depends entirely on whether you are evaluating densities or sampling.',
        pitfalls: [
          'Forgetting to permute between layers, which leaves half the dimensions untransformed throughout',
          'An unclamped scale producing a diverging log-determinant and NaN within a step',
          'Choosing an architecture whose cheap direction is not the direction the application uses',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'Multi-scale coupling flows over images, with squeeze operations trading spatial resolution for channels and invertible mixing between couplings. This was a serious line of image generation before diffusion, and the architecture is still used where an exact likelihood is genuinely needed.',
        where: [
          'Exact-likelihood image density estimation, where a bound or a score will not do',
          'Invertible feature extraction, where the ability to recover the input exactly is the requirement',
          'Lossless compression, where a density model translates directly into a code length',
          'As an invertible component inside a larger model rather than as a generator in its own right',
        ],
        why: 'It remains the right tool when an exact likelihood over images is genuinely required — lossless compression is the clearest case, since code length is log-likelihood and a bound is not good enough. As a generative model for images it has been comprehensively overtaken by diffusion, which produces far better samples at a fraction of the parameter count, and the reason is structural: dimension preservation makes flows enormous, and the invertibility constraint limits what each layer can do. The out-of-distribution likelihood pathology is also at its sharpest here, which is worth knowing before using image likelihoods for anything consequential.',
        featurization: [
          'Dequantize pixel values, or the density on discrete inputs is unbounded and training diverges to it',
          'Use multi-scale architecture with squeeze operations, since a flat flow at image resolution is unaffordable',
          'Prefer learned invertible mixing over fixed permutations between couplings, which uses depth far more efficiently',
          'Report bits per dimension rather than raw likelihood, and state the dequantization used, or the numbers are incomparable',
        ],
        evaluation:
          'Bits per dimension on held-out data with the dequantization scheme stated explicitly, plus sample quality assessed separately — the two diverge sharply and a flow can have excellent likelihood and poor samples. Compare against a diffusion model at matched compute, which is usually unflattering.',
        pitfalls: [
          'Skipping dequantization and training toward an unbounded likelihood',
          'Enormous parameter count from dimension preservation at every layer',
          'Out-of-distribution inputs scoring higher than training data, which is at its worst in this domain',
          'Reporting likelihood without the dequantization scheme, making the number meaningless for comparison',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Model the joint density of engineered risk features on normal activity, then use the exact likelihood as an unsupervised score alongside a supervised classifier. Because the density is joint, it captures feature combinations that are individually unremarkable and jointly implausible, which is precisely the fraud signature that per-feature rules miss.',
        where: [
          'Unsupervised risk scoring as a complement to a supervised model trained on confirmed cases',
          'Novel-attack detection, where the pattern has not been seen and so cannot have been labelled',
          'Density-based feature validation, flagging inputs the downstream model was never trained on',
          'Calibrated risk probabilities where a raw score would not be actionable',
        ],
        why: 'The joint-density argument is genuinely strong here: fraud frequently looks normal on every individual feature and implausible in combination, and a density model catches that where thresholds cannot. Feature spaces in risk are also usually modest in dimension, which keeps the high-dimensional likelihood pathology at bay. Against it: adversaries adapt faster than the model is retrained, the density says nothing about whether an unusual pattern is malicious or merely rare, and a gradient-boosted classifier on labelled cases beats it wherever labels exist. It belongs as a complement rather than a replacement.',
        featurization: [
          'Standardize and, where possible, decorrelate features first, since the flow otherwise spends depth learning the covariance',
          'Fit on a verified-normal period, because a density fitted on contaminated data rates the contamination as likely',
          'Combine the likelihood with supervised scores rather than using it alone, since it cannot distinguish rare from malicious',
          'Refit on a rolling window so the notion of normal tracks legitimate behavioural drift',
        ],
        evaluation:
          'Lift over the supervised model alone at a fixed review budget, measured on confirmed cases with a strictly time-based split. Report how many of the flagged cases were novel patterns rather than ones the supervised model already caught, since that is the only thing this contributes.',
        pitfalls: [
          'Training on contaminated data, so the fraud is rated as likely',
          'Treating low likelihood as evidence of malice when it only indicates rarity',
          'Adversarial drift outpacing the retrain cadence',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours to days on a GPU, and considerably more than a comparable VAE at equal quality because the model is dimension-preserving at every layer and depth is the only route to expressiveness. The likelihood objective is exact and stable, so the cost is compute rather than tuning.',
    inferenceProfile:
      'Density evaluation and sampling both cost one pass through the stack, which is an unusual property — most generative models are cheap in one direction and expensive in the other. For coupling flows both directions are the same cost, so a single deployment serves both use cases without a second model.',
    retrainingCadence:
      'Driven by distribution drift rather than by the model. In anomaly detection the usual uncomfortable question applies: retraining on recent data absorbs any slow-developing anomaly into the new definition of normal.',
    driftAndMonitoring: [
      'Track the log-likelihood distribution on known-normal data rather than the alert count, since a shifting floor means drift and not more anomalies',
      'Monitor the log-determinant magnitude, because a growing one is the precursor to the divergence that produces NaN',
      'Validate against held-out out-of-distribution data periodically, since the high-dimensional likelihood pathology is invisible from training alone',
      'Alert on inputs outside the range the flow was fitted on, where the density is extrapolated rather than estimated',
    ],
    productionGotchas: [
      'Likelihoods are only comparable under identical preprocessing and dequantization. Two models with different schemes produce numbers that cannot be compared at all, and this is routinely violated in published results',
      'The scale network must be clamped. An unbounded exponential makes the log-determinant diverge and produces NaN in one step, with no gradual warning',
      'On discrete data the continuous density is unbounded without dequantization, so the model trains toward infinity rather than toward the data',
      'Dimension preservation means memory does not shrink with depth, unlike every encoder in this reference — a flow is much larger than its parameter count suggests',
      'Higher likelihood does not mean more in-distribution in high dimensions. Do not build an out-of-distribution detector on raw image likelihoods without validating it',
    ],
  },

  assumptions: [
    'The data distribution is continuous, or has been dequantized so that a continuous density is meaningful',
    'The data lies in a space of the same dimension as the latent, since the map is invertible and cannot compress',
    'The target distribution is reachable from the base distribution by a composition of the chosen bijections',
    'Likelihood is a meaningful measure of typicality for this data — false in high dimensions, where density and typicality diverge',
    'Preprocessing is identical between training and evaluation, since likelihood is not invariant to it',
  ],

  pros: [
    {
      point: 'Exact likelihood, not a bound',
      context:
        'The defining property and the reason to choose it over a VAE. Model comparison, lossless compression and calibrated density all require the real number, and a variational bound cannot supply any of them.',
    },
    {
      point: 'Invertibility is guaranteed by construction',
      context:
        'Nothing in training ever checks it, because the architecture makes violation impossible. A far stronger guarantee than a penalty, and the pattern transfers well beyond this model.',
    },
    {
      point: 'Sampling and density evaluation cost the same',
      context:
        'Unusual: most generative models are cheap in one direction and expensive in the other. One deployment serves both, with no second model and no approximation in either direction.',
    },
    {
      point: 'Stable, single-objective training',
      context:
        'One exact loss that goes down, with none of the equilibrium problems of adversarial training or the term-balancing of an ELBO. A genuine practical advantage that is easy to undervalue until you have debugged the alternatives.',
    },
  ],

  cons: [
    {
      point: 'Dimension preservation makes it large',
      context:
        'No layer can compress, so activation width never shrinks and the model is far bigger than its parameter count suggests. This is the structural reason diffusion overtook flows for image generation.',
    },
    {
      point: 'Invertibility caps expressiveness per layer',
      context:
        'Each coupling layer transforms only half its input, so depth is the only route to flexibility — and a distribution on a low-dimensional manifold is fundamentally awkward for a map that cannot reduce dimension.',
    },
    {
      point: 'High-dimensional likelihoods can invert',
      context:
        'Flows have been shown to assign higher likelihood to out-of-distribution data than to their own training data. Not a tuning failure but a property of density in high dimensions, and it invalidates the obvious anomaly-detection use there.',
    },
    {
      point: 'Diverges hard if the scale is unclamped',
      context:
        'The exponential in the affine coupling makes the log-determinant unbounded, so one bad step gives NaN. Trivially fixed and trivially forgotten, and the failure is abrupt rather than gradual.',
    },
    {
      point: 'Likelihoods are not portable',
      context:
        'Comparable only under identical preprocessing and dequantization, which makes cross-paper comparison unreliable and cross-model comparison inside one system easy to get wrong.',
    },
  ],

  relatedSlugs: ['vae', 'ddpm', 'neural-ode', 'score-based-flow-matching', 'autoencoder'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A RealNVP coupling flow, transcribed the way the change of variables reads.

    log p(x) = log p_Z(f(x)) + log |det df/dx|

The second term is the whole design problem. A general Jacobian determinant
costs O(d^3); the coupling layer makes it a SUM by construction:

    y[:d]  = x[:d]                             frozen half, passes through
    y[d:]  = x[d:] * exp(s(x[:d])) + t(x[:d])  affine, conditioned on the half

The Jacobian of that is block-triangular with a diagonal block, so its
determinant is the product of the diagonal - a sum in log space, computed in
linear time without ever forming the matrix.

Plain loops, no libraries.
"""

import math
import random

SEED = 13
LOG_2PI = math.log(2.0 * math.pi)


def tanh_network(inputs, params):
    """The scale-and-translate network.

    Never inverted, so it can be arbitrarily deep and nonlinear. ALL the
    expressive power of a flow hides in the part that does not need to be
    invertible - that is the trick, stated plainly.
    """
    hidden = []
    for row, bias in zip(params['w1'], params['b1']):
        total = bias + sum(w * v for w, v in zip(row, inputs))
        hidden.append(math.tanh(total))

    return [
        bias + sum(w * h for w, h in zip(row, hidden))
        for row, bias in zip(params['w2'], params['b2'])
    ]


def clamp_scale(raw, limit=3.0):
    """Bound the scale before exponentiating.

    NOT optional. The affine map exponentiates s, so an unbounded scale
    network makes the log-determinant diverge and the loss becomes NaN in a
    single step - with no gradual warning at all.
    """
    return limit * math.tanh(raw / limit)


def coupling_forward(x, split, params):
    """Data -> latent. Returns the output and the log-determinant.

    The log-determinant is a SUM of the scales. No determinant is computed
    anywhere, because the architecture guarantees the Jacobian is triangular.
    """
    frozen = x[:split]
    transformed = x[split:]

    raw = tanh_network(frozen, params)
    scales = [clamp_scale(raw[i]) for i in range(len(transformed))]
    shifts = raw[len(transformed):]

    output = list(frozen)
    log_determinant = 0.0
    for i, value in enumerate(transformed):
        output.append(value * math.exp(scales[i]) + shifts[i])
        log_determinant += scales[i]

    return output, log_determinant


def coupling_inverse(y, split, params):
    """Latent -> data. The SAME network, evaluated forwards.

    This is what makes the construction work: inverting the coupling never
    requires inverting the scale network, because that network reads only the
    frozen half - which is unchanged and therefore already known.
    """
    frozen = y[:split]
    transformed = y[split:]

    raw = tanh_network(frozen, params)
    scales = [clamp_scale(raw[i]) for i in range(len(transformed))]
    shifts = raw[len(transformed):]

    output = list(frozen)
    for i, value in enumerate(transformed):
        output.append((value - shifts[i]) * math.exp(-scales[i]))

    return output


def permute(vector, permutation):
    """Shuffle dimensions between couplings.

    Without this the same half is frozen in every layer and depth buys
    nothing at all - the untransformed dimensions would pass straight from
    input to output unchanged.
    """
    return [vector[index] for index in permutation]


def inverse_permutation(permutation):
    inverse = [0] * len(permutation)
    for position, index in enumerate(permutation):
        inverse[index] = position
    return inverse


def flow_forward(x, layers):
    """Compose the couplings. Determinants MULTIPLY, so logs ADD.

    That is why flows are built deep: composing K layers costs nothing extra
    in the log-determinant term, it is just a longer sum.
    """
    state = list(x)
    total_log_determinant = 0.0

    for layer in layers:
        state = permute(state, layer['permutation'])
        state, log_determinant = coupling_forward(state, layer['split'], layer['params'])
        total_log_determinant += log_determinant

    return state, total_log_determinant


def flow_inverse(z, layers):
    """Run the stack backwards, inverting each layer."""
    state = list(z)
    for layer in reversed(layers):
        state = coupling_inverse(state, layer['split'], layer['params'])
        state = permute(state, inverse_permutation(layer['permutation']))
    return state


def standard_normal_log_density(z):
    """log p_Z(z) for a standard Gaussian base."""
    return -0.5 * sum(value * value + LOG_2PI for value in z)


def log_likelihood(x, layers):
    """The exact log-density. No bound, no sampling estimate, no gap.

    Contrast a VAE, which can only bound this quantity. That difference is
    the entire reason to choose a flow.
    """
    z, log_determinant = flow_forward(x, layers)
    return standard_normal_log_density(z) + log_determinant


def negative_log_likelihood(batch, layers):
    """The training objective, and the only one there is."""
    return -sum(log_likelihood(x, layers) for x in batch) / len(batch)


def sample(layers, dimension, rng):
    """Draw from the base and push it through the inverse.

    Sampling and density evaluation cost the SAME here, which is unusual:
    most generative models are cheap in one direction and expensive in the
    other, and this needs no second model for either.
    """
    z = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    return flow_inverse(z, layers)


def check_invertibility(x, layers, tolerance=1e-8):
    """The architecture guarantees this - an implementation bug does not.

    Worth running once as a test: nothing in training ever checks
    invertibility, so a transposed index or a sign error produces a model
    that trains happily and cannot sample.
    """
    z, _ = flow_forward(x, layers)
    recovered = flow_inverse(z, layers)
    return max(abs(a - b) for a, b in zip(x, recovered)) < tolerance
`,
        profile:
          'O(K * d * W) per density evaluation with K coupling layers and width W, and the same cost for sampling. Illustrative, not a measured benchmark: the log-determinant is O(d) because the architecture makes the Jacobian triangular — a general determinant at the same dimension would be O(d^3) and would make the whole approach unusable.',
      },

      'make-it-right': {
        code: `"""The same flow, with the bijection as a protocol and invertibility tested.

Two things change. A bijection becomes an explicit interface with forward,
inverse and log-determinant, because composing them is the whole method and a
uniform contract is what makes composition safe. And the numerical guards move
from comments into code: the scale clamp is enforced at construction rather
than hoped for, and invertibility becomes a testable property rather than an
architectural claim nobody verified.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import NamedTuple, Protocol, Sequence


class NotInvertible(RuntimeError):
    """Raised when forward then inverse does not recover the input.

    Its own type because the architecture GUARANTEES invertibility and an
    implementation bug does not: a transposed index or a sign error produces
    a model that trains happily and cannot sample, with nothing in the loss
    to indicate it.
    """


class DivergentScale(ValueError):
    """Raised when the affine scale is unbounded.

    The coupling exponentiates the scale, so an unclamped network makes the
    log-determinant diverge and the loss becomes NaN in a single step, with
    no gradual warning. Refusing the configuration is cheaper than debugging
    the NaN.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


class Transformed(NamedTuple):
    """Output AND log-determinant.

    They come back together because they are produced together: the
    log-determinant of a coupling is a by-product of the scales it already
    computed, and returning only the output would force a second pass.
    """

    values: list[float]
    log_determinant: float


class Bijection(Protocol):
    """A single invertible transformation.

    A protocol rather than a base class because composition is the whole
    method: a flow is a list of these, and every one must honour the same
    contract for the composition to be invertible at all.
    """

    def forward(self, x: Sequence[float]) -> Transformed: ...

    def inverse(self, y: Sequence[float]) -> list[float]: ...

    @property
    def dimension(self) -> int: ...


@dataclass(frozen=True)
class CouplingConfig:
    """Frozen, because the split and the clamp define the transformation."""

    dimension: int
    split: int
    scale_limit: float = 3.0

    def __post_init__(self) -> None:
        if not 0 < self.split < self.dimension:
            raise ShapeMismatch(
                f'split {self.split} must leave both halves non-empty in '
                f'{self.dimension} dimensions'
            )
        # Guard clause for the single-step divergence.
        if not 0.0 < self.scale_limit <= 10.0:
            raise DivergentScale(
                f'scale limit {self.scale_limit} is unusable; the coupling '
                'exponentiates the scale and an unbounded one gives NaN in one step'
            )

    @property
    def transformed_width(self) -> int:
        return self.dimension - self.split


class AffineCoupling:
    """The construction that makes the determinant tractable.

    Split the input; leave one half alone; transform the other elementwise
    with parameters computed from the frozen half. The Jacobian is
    block-triangular with a diagonal block, so its determinant is the product
    of the diagonal — a sum in log space, in linear time, without ever
    forming the matrix.
    """

    def __init__(self, config: CouplingConfig, weights: dict[str, list]) -> None:
        self._config = config
        self._weights = weights

    @property
    def dimension(self) -> int:
        return self._config.dimension

    def _scale_and_shift(self, frozen: Sequence[float]) -> tuple[list[float], list[float]]:
        """The network is NEVER inverted, so it can be arbitrarily complex.

        All the expressive power of a flow hides in the part that does not
        need to be invertible. That is the trick, and it is why the scale
        network here is a free design choice rather than a constrained one.
        """
        hidden = [
            math.tanh(bias + math.fsum(w * v for w, v in zip(row, frozen)))
            for row, bias in zip(self._weights['w1'], self._weights['b1'])
        ]
        raw = [
            bias + math.fsum(w * h for w, h in zip(row, hidden))
            for row, bias in zip(self._weights['w2'], self._weights['b2'])
        ]

        width = self._config.transformed_width
        limit = self._config.scale_limit
        # Clamped through a tanh rather than a hard clip: a hard clip has zero
        # gradient outside the range, so a saturated unit could never recover.
        scales = [limit * math.tanh(value / limit) for value in raw[:width]]
        shifts = list(raw[width:width * 2])
        return scales, shifts

    def forward(self, x: Sequence[float]) -> Transformed:
        if len(x) != self._config.dimension:
            raise ShapeMismatch(f'expected {self._config.dimension} values, got {len(x)}')

        split = self._config.split
        scales, shifts = self._scale_and_shift(x[:split])

        values = list(x[:split])
        values.extend(
            value * math.exp(scale) + shift
            for value, scale, shift in zip(x[split:], scales, shifts)
        )
        # The log-determinant is a SUM of the scales. No determinant is
        # computed anywhere — the architecture guarantees triangularity.
        return Transformed(values=values, log_determinant=math.fsum(scales))

    def inverse(self, y: Sequence[float]) -> list[float]:
        """The SAME network, evaluated forwards.

        This is what makes the construction work: inverting never requires
        inverting the scale network, because that network reads only the
        frozen half — which is unchanged and therefore already known.
        """
        split = self._config.split
        scales, shifts = self._scale_and_shift(y[:split])

        values = list(y[:split])
        values.extend(
            (value - shift) * math.exp(-scale)
            for value, scale, shift in zip(y[split:], scales, shifts)
        )
        return values


class Permutation:
    """Shuffles dimensions between couplings.

    Without this the same half is frozen in every layer and depth buys
    nothing — the untransformed dimensions would pass straight from input to
    output unchanged. The inverse is precomputed because it is needed on
    every sample and recomputing it is pure waste.
    """

    def __init__(self, order: Sequence[int]) -> None:
        if sorted(order) != list(range(len(order))):
            raise ShapeMismatch('a permutation must be a bijection on its indices')
        self._order = list(order)
        self._inverse = [0] * len(order)
        for position, index in enumerate(order):
            self._inverse[index] = position

    @property
    def dimension(self) -> int:
        return len(self._order)

    def forward(self, x: Sequence[float]) -> Transformed:
        # A permutation has determinant plus or minus one, so its log
        # magnitude is exactly zero — it contributes nothing to the density.
        return Transformed(values=[x[i] for i in self._order], log_determinant=0.0)

    def inverse(self, y: Sequence[float]) -> list[float]:
        return [y[i] for i in self._inverse]


class Flow:
    """A composition of bijections, with the invariant checked on request."""

    def __init__(self, layers: Sequence[Bijection]) -> None:
        if not layers:
            raise ShapeMismatch('a flow needs at least one bijection')
        dimensions = {layer.dimension for layer in layers}
        if len(dimensions) != 1:
            raise ShapeMismatch(f'every layer must share a dimension, found {dimensions}')
        self._layers = list(layers)
        self._dimension = dimensions.pop()

    def forward(self, x: Sequence[float]) -> Transformed:
        """Determinants MULTIPLY, so logs ADD.

        That is why flows are built deep: composing K layers costs nothing
        extra in the log-determinant term, it is just a longer sum.
        """
        values = list(x)
        total = 0.0
        for layer in self._layers:
            result = layer.forward(values)
            values, total = result.values, total + result.log_determinant
        return Transformed(values=values, log_determinant=total)

    def inverse(self, z: Sequence[float]) -> list[float]:
        values = list(z)
        for layer in reversed(self._layers):
            values = layer.inverse(values)
        return values

    def log_likelihood(self, x: Sequence[float]) -> float:
        """The EXACT log-density. No bound, no estimate, no variational gap.

        Contrast a VAE, which can only bound this quantity. That difference
        is the entire reason to choose a flow.
        """
        result = self.forward(x)
        base = -0.5 * math.fsum(
            value * value + math.log(2.0 * math.pi) for value in result.values
        )
        return base + result.log_determinant

    def sample(self, rng: random.Random) -> list[float]:
        """Sampling and density evaluation cost the SAME here.

        Unusual: most generative models are cheap in one direction and
        expensive in the other, and this needs no second model for either.
        """
        return self.inverse([rng.gauss(0.0, 1.0) for _ in range(self._dimension)])

    def assert_invertible(self, x: Sequence[float], tolerance: float = 1e-8) -> None:
        """The architecture guarantees this — an implementation does not.

        Nothing in training ever checks invertibility, so a transposed index
        or a sign error produces a model that trains happily and cannot
        sample. This belongs in a test suite, permanently.
        """
        recovered = self.inverse(self.forward(x).values)
        error = max(abs(a - b) for a, b in zip(x, recovered))
        if error > tolerance:
            raise NotInvertible(
                f'forward then inverse differs by {error:.2e}; the architecture '
                'guarantees invertibility, so this is an implementation bug'
            )


def dequantize(values: Sequence[int], levels: int, rng: random.Random) -> list[float]:
    """Add uniform noise to discrete data before fitting a continuous density.

    Without this the likelihood is UNBOUNDED: a continuous density can put
    arbitrarily much mass on a finite set of exact values, so the model
    chases infinity rather than learning the distribution. The likelihood is
    also only comparable between models using the same scheme, which is why
    a published bits-per-dimension without its dequantization is meaningless.
    """
    return [(value + rng.random()) / levels for value in values]
`,
        rationale:
          'Two changes. A bijection becomes an explicit protocol with forward, inverse and log-determinant, because composition is the whole method and a uniform contract is what makes composing arbitrary layers safe — the flow then validates that every layer shares a dimension, which is the invariant the composition depends on. The second is that the numerical guards move from comments into code. The scale clamp is enforced at construction with its own exception type, because the coupling exponentiates the scale and an unclamped network produces NaN in a single step with no gradual warning; it is applied through a tanh rather than a hard clip, since a hard clip has zero gradient outside its range and a saturated unit could never recover. Invertibility becomes a testable assertion with its own error type, because the architecture guarantees it and an implementation does not — a transposed index produces a model that trains happily and cannot sample, and nothing in the loss would indicate that. The permutation precomputes its inverse since that is needed on every sample, and dequantization is provided with an explicit note that the likelihood is unbounded without it and incomparable across schemes.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: the precomputed inverse permutation turns sampling from O(d log d) per layer into O(d), which matters when sampling is the production path.',
      },

      'make-it-fast': {
        code: `"""Batched, masked, and fused. The split becomes a mask, not a slice.

The structural change worth understanding: the literal version splits the
vector, which means the two halves live in different arrays and every layer
concatenates them back. Masking instead keeps the vector whole and multiplies
by a binary mask - so the coupling becomes elementwise arithmetic over the
full vector, the permutation becomes a matrix product, and nothing is ever
split, concatenated or copied.

Three changes:
  1. Masked coupling. One array throughout; the frozen half is selected by
     multiplication rather than by slicing.
  2. The scale network becomes GEMMs over the batch.
  3. The log-determinant is one masked reduction, which is where the
     architecture's linear-time determinant becomes visible as a single sum.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32
LOG_2PI = float(np.log(2.0 * np.pi))


class MaskedCoupling:
    """An affine coupling expressed with a binary mask rather than a split.

    mask == 1 marks the frozen dimensions. The transformation is then
    elementwise over the WHOLE vector, with the mask selecting what changes:

        y = mask * x + (1 - mask) * (x * exp(s) + t)

    Algebraically identical to the split form, and structurally much better:
    no slicing, no concatenation, and the scale network reads a masked copy
    rather than a separate array.
    """

    def __init__(self, mask: NDArray[np.float32], w1: NDArray[np.float32],
                 b1: NDArray[np.float32], w2: NDArray[np.float32],
                 b2: NDArray[np.float32], scale_limit: float = 3.0) -> None:
        self._mask = np.ascontiguousarray(mask, dtype=FLOAT)
        self._w1 = np.ascontiguousarray(w1, dtype=FLOAT)
        self._b1 = np.ascontiguousarray(b1, dtype=FLOAT)
        self._w2 = np.ascontiguousarray(w2, dtype=FLOAT)
        self._b2 = np.ascontiguousarray(b2, dtype=FLOAT)
        self._limit = FLOAT(scale_limit)

    def _scale_and_shift(
        self, x: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Two GEMMs for the whole batch. The network is never inverted, so
        it can be as large as you like — all the expressive power hides
        here, in the part that does not have to be invertible."""
        hidden = (x * self._mask) @ self._w1
        hidden += self._b1
        np.tanh(hidden, out=hidden)

        projected = hidden @ self._w2
        projected += self._b2
        width = projected.shape[1] // 2
        scale, shift = projected[:, :width], projected[:, width:]

        # Clamp in place through a tanh: NOT optional, since the coupling
        # exponentiates this and an unbounded scale is a one-step NaN. A tanh
        # rather than a clip because a clip has zero gradient outside its
        # range and a saturated unit could never recover.
        scale /= self._limit
        np.tanh(scale, out=scale)
        scale *= self._limit
        return scale, shift

    def forward(
        self, x: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Returns the output and the per-sample log-determinant."""
        scale, shift = self._scale_and_shift(x)
        free = 1.0 - self._mask

        # Fused: exponentiate in place, apply the affine map, and select with
        # the mask in one expression — no intermediate array for the
        # transformed half exists at any point.
        transformed = np.exp(scale * free)
        transformed *= x
        transformed += shift * free
        output = self._mask * x + free * transformed

        # The log-determinant is a masked SUM of the scales. No determinant is
        # computed anywhere: the architecture makes the Jacobian triangular,
        # which is the whole reason this is O(d) rather than O(d^3).
        log_determinant = np.einsum('ij,j->i', scale, free, optimize=True)
        return output, log_determinant

    def inverse(self, y: NDArray[np.float32]) -> NDArray[np.float32]:
        """The SAME network, evaluated forwards.

        Inverting never requires inverting the scale network, because that
        network reads only the masked half — which is unchanged and therefore
        already known. That is the entire construction.
        """
        scale, shift = self._scale_and_shift(y)
        free = 1.0 - self._mask

        recovered = y - shift * free
        recovered *= np.exp(-scale * free)
        return self._mask * y + free * recovered


class LinearMixing:
    """A learned invertible mixing layer, replacing a fixed permutation.

    A permutation is a fixed, sparse special case of this. A general
    invertible matrix uses depth far more efficiently — but its determinant
    is no longer free, so it is kept as an LU factorization where the
    log-determinant is a sum over the diagonal and stays O(d).
    """

    def __init__(self, lower: NDArray[np.float32], upper: NDArray[np.float32],
                 permutation: NDArray[np.int32]) -> None:
        self._lower = lower
        self._upper = upper
        self._permutation = permutation
        # Precomputed once: the log-determinant of an LU factorization is a
        # sum over the upper diagonal, and it does not depend on the input.
        self._log_determinant = float(np.sum(np.log(np.abs(np.diag(upper)))))
        self._weight = (lower @ upper)[permutation]

    def forward(
        self, x: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        return x @ self._weight.T, np.full(x.shape[0], self._log_determinant, dtype=FLOAT)


class BatchedFlow:
    """A composition of masked couplings and mixing layers."""

    def __init__(self, layers: list) -> None:
        self._layers = layers

    def log_likelihood(self, batch: NDArray[np.float32]) -> NDArray[np.float32]:
        """Exact log-density for a whole batch. No bound, no estimate.

        Determinants MULTIPLY, so logs ADD — composing K layers is just a
        longer sum, which is why flows are built deep.
        """
        state = batch
        total = np.zeros(batch.shape[0], dtype=FLOAT)

        for layer in self._layers:
            state, log_determinant = layer.forward(state)
            total += log_determinant

        # Base log-density contracted in one pass rather than squaring into a
        # temporary and summing it.
        squared = np.einsum('ij,ij->i', state, state, optimize=True)
        base = -0.5 * (squared + FLOAT(batch.shape[1] * LOG_2PI))
        return base + total

    def sample(self, count: int, dimension: int, rng: np.random.Generator) -> NDArray[np.float32]:
        """Sampling and density evaluation cost the SAME here.

        Unusual: most generative models are cheap in one direction and
        expensive in the other, and this needs no second model for either.
        """
        state = rng.standard_normal((count, dimension)).astype(FLOAT)
        for layer in reversed(self._layers):
            state = layer.inverse(state)
        return state


def dequantize(
    values: NDArray[np.int32], levels: int, rng: np.random.Generator
) -> NDArray[np.float32]:
    """Uniform noise before fitting a continuous density to discrete data.

    Without it the likelihood is UNBOUNDED: a continuous density can put
    arbitrarily much mass on a finite set of exact values, so the model
    chases infinity rather than learning. Likelihoods are also only
    comparable between models using the same scheme, which is why a published
    bits-per-dimension without its dequantization is meaningless.
    """
    noise = rng.random(values.shape, dtype=FLOAT)
    return (values.astype(FLOAT) + noise) / FLOAT(levels)


def bits_per_dimension(log_likelihood: NDArray[np.float32], dimension: int, levels: int) -> float:
    """The reporting convention, with the dequantization correction included.

    Omitting the level correction is the standard way published numbers
    become incomparable — it is a constant offset, so it never looks wrong.
    """
    nats = -log_likelihood.mean() / dimension
    return float(nats / np.log(2.0) + np.log2(levels))
`,
        rationale:
          'The structural change worth understanding is that the split becomes a mask. The literal version slices the vector, which means the two halves live in different arrays and every layer concatenates them back; multiplying by a binary mask keeps the vector whole, so the coupling becomes elementwise arithmetic over the full width and nothing is ever split, concatenated or copied. The formulation is algebraically identical and structurally far better: the scale network reads a masked copy rather than a separate array, the affine map fuses into one expression with no intermediate for the transformed half, and the log-determinant becomes a single masked contraction — which is where the architecture’s linear-time determinant becomes visible as one sum rather than an argument in a comment. The scale clamp runs in place through a tanh rather than a clip, deliberately, because a clip has zero gradient outside its range and a saturated unit could never recover. The fixed permutation is also generalized to a learned invertible mixing layer kept in LU form, where the log-determinant is a precomputed sum over the diagonal and therefore still free.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The scale network is two GEMMs for the whole batch, the mixing layer is one, and both the log-determinant and the base density contract in a single einsum pass rather than squaring into temporaries.',
            tradeoff: 'Masking means the scale network computes outputs for the frozen dimensions too and then discards them, so roughly half the network arithmetic is wasted — the split form avoids that waste and pays for it in copies instead.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The exponential, the affine map and the mask selection happen in one chained expression, and the scale clamp runs in place over the projection buffer.',
            tradeoff: 'The raw scale is destroyed by the in-place clamp, so diagnosing a scale network that has saturated — which is why a flow stops improving — needs an unfused pass.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The tanh, the clamp and the bias adds all write through existing buffers, so a forward pass allocates only the coupling output.',
            tradeoff: 'The layers mutate arrays derived from their input, so a caller that keeps a reference to an intermediate state finds it changed — a real hazard when caching activations for a gradient check.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 contiguous weights and masks keep every product on the BLAS fast path, and the mask is stored as float rather than bool so it multiplies without a conversion.',
            tradeoff: 'float32 accumulation of the log-determinant across a deep stack drifts, and because the density is the sum of that with the base term the error lands directly in the reported likelihood — which is the one number this model exists to get exactly right.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'A density evaluation becomes two GEMMs and a contraction per coupling layer for the whole batch. Illustrative, not a measured benchmark: the log-determinant stays O(d) per layer because the architecture guarantees triangularity — a general determinant at the same dimension would be O(d^3) and would make the approach unusable at any width.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A RealNVP coupling flow, transcribed the way the change of variables reads.
//
//   log p(x) = log p_Z(f(x)) + log |det df/dx|
//
// The second term is the whole design problem. A general Jacobian determinant
// costs O(d^3); the coupling layer makes it a SUM by construction:
//
//   y[:d] = x[:d]                              frozen half, passes through
//   y[d:] = x[d:] * exp(s(x[:d])) + t(x[:d])   affine, conditioned on the half
//
// The Jacobian of that is block-triangular with a diagonal block, so its
// determinant is the product of the diagonal - a sum in log space, computed in
// linear time without ever forming the matrix.
//
// Vector-of-vector, plain loops.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

const double kLog2Pi = std::log(2.0 * 3.14159265358979323846);

struct CouplingParams {
  Matrix w1;
  Vector b1;
  Matrix w2;
  Vector b2;
};

struct Layer {
  CouplingParams params;
  std::vector<std::size_t> permutation;
  std::size_t split{};
};

// The scale-and-translate network.
//
// Never inverted, so it can be arbitrarily deep and nonlinear. ALL the
// expressive power of a flow hides in the part that does not need to be
// invertible - that is the trick, stated plainly.
Vector TanhNetwork(const Vector& inputs, const CouplingParams& params) {
  Vector hidden(params.w1.size(), 0.0);
  for (std::size_t i = 0; i < params.w1.size(); ++i) {
    double total = params.b1[i];
    for (std::size_t j = 0; j < inputs.size(); ++j) {
      total += params.w1[i][j] * inputs[j];
    }
    hidden[i] = std::tanh(total);
  }

  Vector output(params.w2.size(), 0.0);
  for (std::size_t i = 0; i < params.w2.size(); ++i) {
    double total = params.b2[i];
    for (std::size_t j = 0; j < hidden.size(); ++j) {
      total += params.w2[i][j] * hidden[j];
    }
    output[i] = total;
  }
  return output;
}

// Bound the scale before exponentiating.
//
// NOT optional. The affine map exponentiates s, so an unbounded scale network
// makes the log-determinant diverge and the loss becomes NaN in a single step
// - with no gradual warning at all.
double ClampScale(double raw, double limit = 3.0) {
  return limit * std::tanh(raw / limit);
}

// Data -> latent. Returns the output and the log-determinant.
//
// The log-determinant is a SUM of the scales. No determinant is computed
// anywhere, because the architecture guarantees the Jacobian is triangular.
Vector CouplingForward(const Vector& x, std::size_t split,
                       const CouplingParams& params, double* log_determinant) {
  const Vector frozen(x.begin(), x.begin() + static_cast<long>(split));
  const Vector raw = TanhNetwork(frozen, params);
  const std::size_t width = x.size() - split;

  Vector output = frozen;
  *log_determinant = 0.0;
  for (std::size_t i = 0; i < width; ++i) {
    const double scale = ClampScale(raw[i]);
    output.push_back(x[split + i] * std::exp(scale) + raw[width + i]);
    *log_determinant += scale;
  }
  return output;
}

// Latent -> data. The SAME network, evaluated forwards.
//
// This is what makes the construction work: inverting the coupling never
// requires inverting the scale network, because that network reads only the
// frozen half - which is unchanged and therefore already known.
Vector CouplingInverse(const Vector& y, std::size_t split,
                       const CouplingParams& params) {
  const Vector frozen(y.begin(), y.begin() + static_cast<long>(split));
  const Vector raw = TanhNetwork(frozen, params);
  const std::size_t width = y.size() - split;

  Vector output = frozen;
  for (std::size_t i = 0; i < width; ++i) {
    const double scale = ClampScale(raw[i]);
    output.push_back((y[split + i] - raw[width + i]) * std::exp(-scale));
  }
  return output;
}

// Shuffle dimensions between couplings.
//
// Without this the same half is frozen in every layer and depth buys nothing
// at all - the untransformed dimensions would pass straight from input to
// output unchanged.
Vector Permute(const Vector& vector, const std::vector<std::size_t>& permutation) {
  Vector output(vector.size(), 0.0);
  for (std::size_t i = 0; i < permutation.size(); ++i) {
    output[i] = vector[permutation[i]];
  }
  return output;
}

Vector Unpermute(const Vector& vector, const std::vector<std::size_t>& permutation) {
  Vector output(vector.size(), 0.0);
  for (std::size_t i = 0; i < permutation.size(); ++i) {
    output[permutation[i]] = vector[i];
  }
  return output;
}

// Compose the couplings. Determinants MULTIPLY, so logs ADD.
//
// That is why flows are built deep: composing K layers costs nothing extra in
// the log-determinant term, it is just a longer sum.
Vector FlowForward(const Vector& x, const std::vector<Layer>& layers,
                   double* total_log_determinant) {
  Vector state = x;
  *total_log_determinant = 0.0;

  for (std::size_t index = 0; index < layers.size(); ++index) {
    state = Permute(state, layers[index].permutation);
    double log_determinant = 0.0;
    state = CouplingForward(state, layers[index].split, layers[index].params,
                            &log_determinant);
    *total_log_determinant += log_determinant;
  }
  return state;
}

Vector FlowInverse(const Vector& z, const std::vector<Layer>& layers) {
  Vector state = z;
  for (std::size_t index = layers.size(); index-- > 0;) {
    state = CouplingInverse(state, layers[index].split, layers[index].params);
    state = Unpermute(state, layers[index].permutation);
  }
  return state;
}

// The EXACT log-density. No bound, no sampling estimate, no variational gap.
//
// Contrast a VAE, which can only bound this quantity. That difference is the
// entire reason to choose a flow.
double LogLikelihood(const Vector& x, const std::vector<Layer>& layers) {
  double log_determinant = 0.0;
  const Vector z = FlowForward(x, layers, &log_determinant);

  double base = 0.0;
  for (std::size_t i = 0; i < z.size(); ++i) {
    base += -0.5 * (z[i] * z[i] + kLog2Pi);
  }
  return base + log_determinant;
}

// Draw from the base and push it through the inverse.
//
// Sampling and density evaluation cost the SAME here, which is unusual: most
// generative models are cheap in one direction and expensive in the other,
// and this needs no second model for either.
Vector Sample(const std::vector<Layer>& layers, std::size_t dimension,
              std::mt19937& rng) {
  std::normal_distribution<double> normal(0.0, 1.0);
  Vector z(dimension, 0.0);
  for (std::size_t i = 0; i < dimension; ++i) {
    z[i] = normal(rng);
  }
  return FlowInverse(z, layers);
}

// The architecture guarantees this - an implementation bug does not.
//
// Worth running once as a test: nothing in training ever checks invertibility,
// so a transposed index or a sign error produces a model that trains happily
// and cannot sample.
bool CheckInvertibility(const Vector& x, const std::vector<Layer>& layers,
                        double tolerance = 1e-8) {
  double log_determinant = 0.0;
  const Vector recovered = FlowInverse(FlowForward(x, layers, &log_determinant), layers);
  for (std::size_t i = 0; i < x.size(); ++i) {
    if (std::abs(x[i] - recovered[i]) > tolerance) {
      return false;
    }
  }
  return true;
}
`,
        profile:
          'O(K * d * W) per density evaluation with K coupling layers and width W, and the same cost for sampling. Illustrative, not a measured benchmark: the log-determinant is O(d) because the architecture makes the Jacobian triangular — a general determinant at the same dimension would be O(d^3) and would make the whole approach unusable.',
      },

      'make-it-right': {
        code: `// The same flow, with the bijection as an interface and invertibility tested.
//
// Two things change. A bijection becomes an explicit interface with forward,
// inverse and log-determinant, because composing them is the whole method and
// a uniform contract is what makes composition safe. And the numerical guards
// move from comments into code: the scale clamp is enforced at construction
// rather than hoped for, and invertibility becomes a testable property rather
// than an architectural claim nobody verified.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <memory>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace flows {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the architecture GUARANTEES invertibility and an
// implementation bug does not: a transposed index or a sign error produces a
// model that trains happily and cannot sample, with nothing in the loss to
// indicate it.
class NotInvertible : public std::logic_error {
 public:
  explicit NotInvertible(const std::string& what) : std::logic_error(what) {}
};

// The coupling exponentiates the scale, so an unclamped network makes the
// log-determinant diverge and the loss becomes NaN in a single step, with no
// gradual warning. Refusing the configuration is cheaper than debugging NaN.
class DivergentScale : public std::invalid_argument {
 public:
  explicit DivergentScale(const std::string& what) : std::invalid_argument(what) {}
};

// Output AND log-determinant.
//
// They come back together because they are produced together: the
// log-determinant of a coupling is a by-product of the scales it already
// computed, and returning only the output would force a second pass.
struct Transformed {
  std::vector<double> values;
  double log_determinant{};
};

// A single invertible transformation.
//
// An interface rather than a concrete type because composition is the whole
// method: a flow is a list of these, and every one must honour the same
// contract for the composition to be invertible at all.
class Bijection {
 public:
  virtual ~Bijection() = default;
  [[nodiscard]] virtual Transformed Forward(std::span<const double> x) const = 0;
  [[nodiscard]] virtual std::vector<double> Inverse(std::span<const double> y) const = 0;
  [[nodiscard]] virtual std::size_t dimension() const noexcept = 0;
};

struct CouplingConfig {
  std::size_t dimension{};
  std::size_t split{};
  double scale_limit{3.0};

  void Validate() const {
    if (split == 0 || split >= dimension) {
      throw ShapeMismatch("the split must leave both halves non-empty");
    }
    // Guard clause for the single-step divergence.
    if (scale_limit <= 0.0 || scale_limit > 10.0) {
      throw DivergentScale(
          "scale limit is unusable; the coupling exponentiates the scale and an "
          "unbounded one gives NaN in one step");
    }
  }

  [[nodiscard]] std::size_t transformed_width() const noexcept {
    return dimension - split;
  }
};

// The construction that makes the determinant tractable.
//
// Split the input; leave one half alone; transform the other elementwise with
// parameters computed from the frozen half. The Jacobian is block-triangular
// with a diagonal block, so its determinant is the product of the diagonal -
// a sum in log space, in linear time, without ever forming the matrix.
class AffineCoupling final : public Bijection {
 public:
  AffineCoupling(CouplingConfig config, std::vector<double> w1, std::vector<double> b1,
                 std::vector<double> w2, std::vector<double> b2)
      : config_(config), w1_(std::move(w1)), b1_(std::move(b1)), w2_(std::move(w2)),
        b2_(std::move(b2)), hidden_(b1_.size(), 0.0), raw_(b2_.size(), 0.0) {
    config_.Validate();
  }

  [[nodiscard]] std::size_t dimension() const noexcept override { return config_.dimension; }

  [[nodiscard]] Transformed Forward(std::span<const double> x) const override {
    if (x.size() != config_.dimension) {
      throw ShapeMismatch("input width does not match the coupling");
    }
    std::vector<double> scale;
    std::vector<double> shift;
    ScaleAndShift(x.subspan(0, config_.split), &scale, &shift);

    Transformed result;
    result.values.assign(x.begin(), x.begin() + static_cast<long>(config_.split));
    result.values.reserve(config_.dimension);
    for (std::size_t i = 0; i < config_.transformed_width(); ++i) {
      result.values.push_back(x[config_.split + i] * std::exp(scale[i]) + shift[i]);
    }
    // The log-determinant is a SUM of the scales. No determinant is computed
    // anywhere — the architecture guarantees triangularity.
    result.log_determinant = std::accumulate(scale.begin(), scale.end(), 0.0);
    return result;
  }

  // The SAME network, evaluated forwards.
  //
  // Inverting never requires inverting the scale network, because that
  // network reads only the frozen half — which is unchanged and therefore
  // already known. That is the entire construction.
  [[nodiscard]] std::vector<double> Inverse(std::span<const double> y) const override {
    std::vector<double> scale;
    std::vector<double> shift;
    ScaleAndShift(y.subspan(0, config_.split), &scale, &shift);

    std::vector<double> values(y.begin(), y.begin() + static_cast<long>(config_.split));
    values.reserve(config_.dimension);
    for (std::size_t i = 0; i < config_.transformed_width(); ++i) {
      values.push_back((y[config_.split + i] - shift[i]) * std::exp(-scale[i]));
    }
    return values;
  }

 private:
  // The network is NEVER inverted, so it can be arbitrarily complex. All the
  // expressive power of a flow hides in the part that does not need to be
  // invertible — that is the trick, and it is why this is a free choice.
  void ScaleAndShift(std::span<const double> frozen, std::vector<double>* scale,
                     std::vector<double>* shift) const {
    const std::size_t hidden_width = b1_.size();
    std::vector<double> hidden(hidden_width, 0.0);
    for (std::size_t i = 0; i < hidden_width; ++i) {
      double total = b1_[i];
      for (std::size_t j = 0; j < frozen.size(); ++j) {
        total += w1_[i * frozen.size() + j] * frozen[j];
      }
      hidden[i] = std::tanh(total);
    }

    const std::size_t width = config_.transformed_width();
    scale->assign(width, 0.0);
    shift->assign(width, 0.0);
    for (std::size_t i = 0; i < 2 * width; ++i) {
      double total = b2_[i];
      for (std::size_t j = 0; j < hidden_width; ++j) {
        total += w2_[i * hidden_width + j] * hidden[j];
      }
      if (i < width) {
        // Clamped through a tanh rather than a hard clip: a hard clip has
        // zero gradient outside the range, so a saturated unit could never
        // recover.
        (*scale)[i] = config_.scale_limit * std::tanh(total / config_.scale_limit);
      } else {
        (*shift)[i - width] = total;
      }
    }
  }

  CouplingConfig config_;
  std::vector<double> w1_;  // rule of zero: owning members only
  std::vector<double> b1_;
  std::vector<double> w2_;
  std::vector<double> b2_;
  mutable std::vector<double> hidden_;
  mutable std::vector<double> raw_;
};

// Shuffles dimensions between couplings.
//
// Without this the same half is frozen in every layer and depth buys nothing
// - the untransformed dimensions would pass straight from input to output.
// The inverse is precomputed because it is needed on every sample.
class Permutation final : public Bijection {
 public:
  explicit Permutation(std::vector<std::size_t> order) : order_(std::move(order)) {
    std::vector<std::size_t> sorted = order_;
    std::sort(sorted.begin(), sorted.end());
    for (std::size_t i = 0; i < sorted.size(); ++i) {
      if (sorted[i] != i) {
        throw ShapeMismatch("a permutation must be a bijection on its indices");
      }
    }
    inverse_.assign(order_.size(), 0);
    for (std::size_t position = 0; position < order_.size(); ++position) {
      inverse_[order_[position]] = position;
    }
  }

  [[nodiscard]] std::size_t dimension() const noexcept override { return order_.size(); }

  [[nodiscard]] Transformed Forward(std::span<const double> x) const override {
    Transformed result;
    result.values.resize(order_.size());
    for (std::size_t i = 0; i < order_.size(); ++i) {
      result.values[i] = x[order_[i]];
    }
    // A permutation has determinant plus or minus one, so its log magnitude
    // is exactly zero — it contributes nothing to the density.
    result.log_determinant = 0.0;
    return result;
  }

  [[nodiscard]] std::vector<double> Inverse(std::span<const double> y) const override {
    std::vector<double> values(inverse_.size(), 0.0);
    for (std::size_t i = 0; i < inverse_.size(); ++i) {
      values[i] = y[inverse_[i]];
    }
    return values;
  }

 private:
  std::vector<std::size_t> order_;
  std::vector<std::size_t> inverse_;
};

// A composition of bijections, with the invariant checked on request.
class Flow {
 public:
  explicit Flow(std::vector<std::unique_ptr<Bijection>> layers)
      : layers_(std::move(layers)) {
    if (layers_.empty()) {
      throw ShapeMismatch("a flow needs at least one bijection");
    }
    dimension_ = layers_.front()->dimension();
    for (const auto& layer : layers_) {
      if (layer->dimension() != dimension_) {
        throw ShapeMismatch("every layer must share a dimension");
      }
    }
  }

  // Determinants MULTIPLY, so logs ADD. That is why flows are built deep:
  // composing K layers costs nothing extra in the log-determinant term.
  [[nodiscard]] Transformed Forward(std::span<const double> x) const {
    Transformed state;
    state.values.assign(x.begin(), x.end());
    for (const auto& layer : layers_) {
      Transformed next = layer->Forward(state.values);
      state.values = std::move(next.values);
      state.log_determinant += next.log_determinant;
    }
    return state;
  }

  [[nodiscard]] std::vector<double> Inverse(std::span<const double> z) const {
    std::vector<double> values(z.begin(), z.end());
    for (std::size_t index = layers_.size(); index-- > 0;) {
      values = layers_[index]->Inverse(values);
    }
    return values;
  }

  // The EXACT log-density. No bound, no estimate, no variational gap.
  [[nodiscard]] double LogLikelihood(std::span<const double> x) const {
    const Transformed result = Forward(x);
    constexpr double kLog2Pi = 1.8378770664093453;
    double base = 0.0;
    for (const double value : result.values) {
      base += -0.5 * (value * value + kLog2Pi);
    }
    return base + result.log_determinant;
  }

  // The architecture guarantees this — an implementation does not.
  void AssertInvertible(std::span<const double> x, double tolerance = 1e-8) const {
    const std::vector<double> recovered = Inverse(Forward(x).values);
    for (std::size_t i = 0; i < x.size(); ++i) {
      if (std::abs(x[i] - recovered[i]) > tolerance) {
        throw NotInvertible(
            "forward then inverse does not recover the input; the architecture "
            "guarantees invertibility, so this is an implementation bug");
      }
    }
  }

 private:
  std::vector<std::unique_ptr<Bijection>> layers_;
  std::size_t dimension_{};
};

}  // namespace flows
`,
        rationale:
          'Two changes. A bijection becomes an explicit interface with forward, inverse and log-determinant, because composition is the whole method and a uniform contract is what makes composing arbitrary layers safe — the flow then validates that every layer shares a dimension, which is the invariant the composition depends on, and owns its layers through unique pointers so lifetime is not a caller concern. The second is that the numerical guards move from comments into code. The scale clamp is enforced at construction with its own exception type, because the coupling exponentiates the scale and an unclamped network produces NaN in a single step with no gradual warning; it is applied through a tanh rather than a hard clip, since a clip has zero gradient outside its range and a saturated unit could never recover. Invertibility becomes an assertion with its own error type, because the architecture guarantees it and an implementation does not — a transposed index produces a model that trains happily and cannot sample. Weights flatten to row-major buffers so each row is a contiguous walk, and the permutation precomputes its inverse since that is needed on every sample.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: the precomputed inverse permutation turns sampling from a search into a direct index, which matters when sampling is the production path.',
      },

      'make-it-fast': {
        code: `// Batched, masked, and fused. The split becomes a mask, not a slice.
//
// The structural change worth understanding: the literal version splits the
// vector, so the two halves live in different buffers and every layer
// concatenates them back. Masking instead keeps the vector whole and
// multiplies by a binary mask - so the coupling becomes elementwise
// arithmetic over the full width, and nothing is ever split, concatenated or
// copied.
//
// Three changes:
//   1. Masked coupling. One buffer throughout; the frozen half is selected by
//      multiplication rather than by slicing.
//   2. The scale network becomes GEMMs over the batch.
//   3. The log-determinant is one masked reduction, which is where the
//      architecture's linear-time determinant becomes visible as a sum.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace flows {

// An affine coupling expressed with a binary mask rather than a split.
//
// mask == 1 marks the frozen dimensions. The transformation is then
// elementwise over the WHOLE vector, with the mask selecting what changes:
//
//   y = mask * x + (1 - mask) * (x * exp(s) + t)
//
// Algebraically identical to the split form, and structurally much better: no
// slicing, no concatenation, and the scale network reads a masked copy rather
// than a separate buffer.
class MaskedCoupling {
 public:
  MaskedCoupling(int batch, int dimension, int hidden, float scale_limit = 3.0F)
      : batch_(batch), dimension_(dimension), hidden_width_(hidden),
        limit_(scale_limit),
        mask_(static_cast<std::size_t>(dimension), 0.0F),
        masked_(static_cast<std::size_t>(batch) * dimension),
        hidden_(static_cast<std::size_t>(batch) * hidden),
        projected_(static_cast<std::size_t>(batch) * 2 * dimension) {}

  // Returns the output in \`out\` and the per-sample log-determinant.
  void Forward(const float* __restrict x, const float* __restrict w1,
               const float* __restrict b1, const float* __restrict w2,
               const float* __restrict b2, float* __restrict out,
               float* __restrict log_determinant) {
    ScaleAndShift(x, w1, b1, w2, b2);

    // Fused: exponentiate, apply the affine map, select with the mask and
    // reduce the log-determinant in ONE pass per row. No intermediate for the
    // transformed half exists at any point.
#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      const float* row = x + static_cast<std::size_t>(b) * dimension_;
      const float* projected =
          projected_.data() + static_cast<std::size_t>(b) * 2 * dimension_;
      float* target = out + static_cast<std::size_t>(b) * dimension_;

      float accumulated = 0.0F;
      for (int d = 0; d < dimension_; ++d) {
        const float free = 1.0F - mask_[static_cast<std::size_t>(d)];
        const float scale = projected[d] * free;
        const float shift = projected[dimension_ + d] * free;
        target[d] = mask_[static_cast<std::size_t>(d)] * row[d] +
                    free * (row[d] * std::exp(scale) + shift);
        // The log-determinant is a masked SUM of the scales. No determinant
        // is computed anywhere: the architecture makes the Jacobian
        // triangular, which is why this is O(d) rather than O(d^3).
        accumulated += scale;
      }
      log_determinant[b] = accumulated;
    }
  }

  // The SAME network, evaluated forwards.
  //
  // Inverting never requires inverting the scale network, because that network
  // reads only the masked half - which is unchanged and therefore already
  // known. That is the entire construction.
  void Inverse(const float* __restrict y, const float* __restrict w1,
               const float* __restrict b1, const float* __restrict w2,
               const float* __restrict b2, float* __restrict out) {
    ScaleAndShift(y, w1, b1, w2, b2);

#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      const float* row = y + static_cast<std::size_t>(b) * dimension_;
      const float* projected =
          projected_.data() + static_cast<std::size_t>(b) * 2 * dimension_;
      float* target = out + static_cast<std::size_t>(b) * dimension_;

      for (int d = 0; d < dimension_; ++d) {
        const float free = 1.0F - mask_[static_cast<std::size_t>(d)];
        const float scale = projected[d] * free;
        const float shift = projected[dimension_ + d] * free;
        target[d] = mask_[static_cast<std::size_t>(d)] * row[d] +
                    free * ((row[d] - shift) * std::exp(-scale));
      }
    }
  }

  [[nodiscard]] std::span<float> mask() noexcept { return mask_; }

 private:
  // Two GEMMs for the whole batch. The network is never inverted, so it can
  // be as large as you like - all the expressive power hides here, in the
  // part that does not have to be invertible.
  void ScaleAndShift(const float* __restrict x, const float* __restrict w1,
                     const float* __restrict b1, const float* __restrict w2,
                     const float* __restrict b2) {
    // The masked copy is the one real cost of the mask formulation: the
    // scale network must not see the free half, so the input is masked into
    // scratch rather than sliced.
#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      const float* row = x + static_cast<std::size_t>(b) * dimension_;
      float* target = masked_.data() + static_cast<std::size_t>(b) * dimension_;
      for (int d = 0; d < dimension_; ++d) {
        target[d] = row[d] * mask_[static_cast<std::size_t>(d)];
      }
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, batch_, hidden_width_,
                dimension_, 1.0F, masked_.data(), dimension_, w1, hidden_width_, 0.0F,
                hidden_.data(), hidden_width_);

#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      float* row = hidden_.data() + static_cast<std::size_t>(b) * hidden_width_;
      for (int h = 0; h < hidden_width_; ++h) {
        row[h] = std::tanh(row[h] + b1[h]);
      }
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, batch_, 2 * dimension_,
                hidden_width_, 1.0F, hidden_.data(), hidden_width_, w2, 2 * dimension_,
                0.0F, projected_.data(), 2 * dimension_);

    // Bias and clamp fused in one pass. The clamp is NOT optional: the
    // coupling exponentiates this and an unbounded scale is a one-step NaN.
    // A tanh rather than a clip, because a clip has zero gradient outside its
    // range and a saturated unit could never recover.
#pragma omp parallel for schedule(static)
    for (int b = 0; b < batch_; ++b) {
      float* row = projected_.data() + static_cast<std::size_t>(b) * 2 * dimension_;
      for (int d = 0; d < dimension_; ++d) {
        row[d] = limit_ * std::tanh((row[d] + b2[d]) / limit_);
        row[dimension_ + d] += b2[dimension_ + d];
      }
    }
  }

  int batch_;
  int dimension_;
  int hidden_width_;
  float limit_;
  std::vector<float> mask_;
  std::vector<float> masked_;
  std::vector<float> hidden_;
  std::vector<float> projected_;
};

// The exact log-density for a whole batch. No bound, no estimate.
//
// Determinants MULTIPLY, so logs ADD - composing K layers is just a longer
// sum, which is why flows are built deep.
inline void BaseLogDensity(const float* __restrict z, int batch, int dimension,
                           float* __restrict out) {
  constexpr float kLog2Pi = 1.8378771F;

#pragma omp parallel for schedule(static)
  for (int b = 0; b < batch; ++b) {
    const float* row = z + static_cast<std::size_t>(b) * dimension;
    float squared = 0.0F;
    for (int d = 0; d < dimension; ++d) {
      squared += row[d] * row[d];
    }
    out[b] = -0.5F * (squared + static_cast<float>(dimension) * kLog2Pi);
  }
}

// The reporting convention, with the dequantization correction included.
//
// Omitting the level correction is the standard way published numbers become
// incomparable - it is a constant offset, so it never looks wrong.
[[nodiscard]] inline double BitsPerDimension(std::span<const float> log_likelihood,
                                             int dimension, int levels) {
  double total = 0.0;
  for (const float value : log_likelihood) {
    total += value;
  }
  const double nats = -total / static_cast<double>(log_likelihood.size()) /
                      static_cast<double>(dimension);
  return nats / std::log(2.0) + std::log2(static_cast<double>(levels));
}

}  // namespace flows
`,
        rationale:
          'The structural change worth understanding is that the split becomes a mask. The literal version slices the vector, so the two halves live in different buffers and every layer concatenates them back; multiplying by a binary mask keeps the vector whole, so the coupling becomes elementwise arithmetic over the full width and nothing is ever split or concatenated. The affine map, the mask selection and the log-determinant reduction then fuse into one pass per row, so no intermediate for the transformed half ever exists and the determinant sum comes free from a traversal already happening. The scale network becomes two GEMMs over the batch, with bias and clamp fused into a single pass over the projection; the clamp goes through a tanh rather than a clip deliberately, because a clip has zero gradient outside its range and a saturated unit could never recover. The one honest cost of the mask formulation is named in the code: the scale network must not see the free half, so the input is masked into scratch rather than sliced, which is a real copy the split form avoids.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The scale network is two dense products over the whole batch, which is the only arithmetic of any size in a coupling layer.',
            tradeoff: 'Masking means the network computes scale and shift for the frozen dimensions too and then multiplies them away, so roughly half the GEMM output is discarded — the split form avoids that waste and pays for it in copies instead.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The exponential, the affine map, the mask selection and the log-determinant reduction all happen in one traversal of each row, so the determinant sum costs nothing beyond a pass already being made.',
            tradeoff: 'The raw scale is consumed by the fused pass, so diagnosing a scale network that has saturated — which is why a flow stops improving — needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The masking, the activation, the clamp and the fused coupling pass are all row-independent with no shared writes, and the log-determinant is written per row rather than reduced across them.',
            tradeoff: 'These passes are memory-bound and interleave with the GEMMs, so threading both competes for bandwidth — and the masked copy is a full extra pass over the activations on every layer.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the input, output and projection buffers may overlap, and reloads every value across the fused inner loop.',
            tradeoff: 'Restrict is an unchecked promise, and the inverse path is genuinely tempting to call in place with the same buffer for input and output — which would be silently wrong rather than slow.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'A density evaluation becomes two GEMMs and one fused pass per coupling layer for the whole batch. Illustrative, not a measured benchmark: the log-determinant stays O(d) per layer because the architecture guarantees triangularity — a general determinant at the same dimension would be O(d^3) and would make the approach unusable at any width.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A RealNVP coupling flow, transcribed the way the change of variables reads.
//
//   log p(x) = log p_Z(f(x)) + log |det df/dx|
//
// The second term is the whole design problem. A general Jacobian determinant
// costs O(d^3); the coupling layer makes it a SUM by construction:
//
//   y[:d] = x[:d]                              frozen half, passes through
//   y[d:] = x[d:] * exp(s(x[:d])) + t(x[:d])   affine, conditioned on the half
//
// The Jacobian of that is block-triangular with a diagonal block, so its
// determinant is the product of the diagonal - a sum in log space, computed in
// linear time without ever forming the matrix.
//
// Vec-of-Vec, index loops, no libraries.

use std::f64::consts::PI;

struct CouplingParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

struct Layer {
    params: CouplingParams,
    permutation: Vec<usize>,
    split: usize,
}

/// The scale-and-translate network.
///
/// Never inverted, so it can be arbitrarily deep and nonlinear. ALL the
/// expressive power of a flow hides in the part that does not need to be
/// invertible - that is the trick, stated plainly.
fn tanh_network(inputs: &[f64], params: &CouplingParams) -> Vec<f64> {
    let mut hidden = vec![0.0_f64; params.w1.len()];
    for i in 0..params.w1.len() {
        let mut total = params.b1[i];
        for j in 0..inputs.len() {
            total += params.w1[i][j] * inputs[j];
        }
        hidden[i] = total.tanh();
    }

    let mut output = vec![0.0_f64; params.w2.len()];
    for i in 0..params.w2.len() {
        let mut total = params.b2[i];
        for j in 0..hidden.len() {
            total += params.w2[i][j] * hidden[j];
        }
        output[i] = total;
    }
    output
}

/// Bound the scale before exponentiating.
///
/// NOT optional. The affine map exponentiates s, so an unbounded scale network
/// makes the log-determinant diverge and the loss becomes NaN in a single step
/// - with no gradual warning at all.
fn clamp_scale(raw: f64, limit: f64) -> f64 {
    limit * (raw / limit).tanh()
}

/// Data -> latent. Returns the output and the log-determinant.
///
/// The log-determinant is a SUM of the scales. No determinant is computed
/// anywhere, because the architecture guarantees the Jacobian is triangular.
fn coupling_forward(x: &[f64], split: usize, params: &CouplingParams) -> (Vec<f64>, f64) {
    let frozen = &x[..split];
    let raw = tanh_network(frozen, params);
    let width = x.len() - split;

    let mut output = frozen.to_vec();
    let mut log_determinant = 0.0;
    for i in 0..width {
        let scale = clamp_scale(raw[i], 3.0);
        output.push(x[split + i] * scale.exp() + raw[width + i]);
        log_determinant += scale;
    }
    (output, log_determinant)
}

/// Latent -> data. The SAME network, evaluated forwards.
///
/// This is what makes the construction work: inverting the coupling never
/// requires inverting the scale network, because that network reads only the
/// frozen half - which is unchanged and therefore already known.
fn coupling_inverse(y: &[f64], split: usize, params: &CouplingParams) -> Vec<f64> {
    let frozen = &y[..split];
    let raw = tanh_network(frozen, params);
    let width = y.len() - split;

    let mut output = frozen.to_vec();
    for i in 0..width {
        let scale = clamp_scale(raw[i], 3.0);
        output.push((y[split + i] - raw[width + i]) * (-scale).exp());
    }
    output
}

/// Shuffle dimensions between couplings.
///
/// Without this the same half is frozen in every layer and depth buys nothing
/// at all - the untransformed dimensions would pass straight from input to
/// output unchanged.
fn permute(vector: &[f64], permutation: &[usize]) -> Vec<f64> {
    permutation.iter().map(|&index| vector[index]).collect()
}

fn unpermute(vector: &[f64], permutation: &[usize]) -> Vec<f64> {
    let mut output = vec![0.0_f64; vector.len()];
    for (position, &index) in permutation.iter().enumerate() {
        output[index] = vector[position];
    }
    output
}

/// Compose the couplings. Determinants MULTIPLY, so logs ADD.
///
/// That is why flows are built deep: composing K layers costs nothing extra in
/// the log-determinant term, it is just a longer sum.
fn flow_forward(x: &[f64], layers: &[Layer]) -> (Vec<f64>, f64) {
    let mut state = x.to_vec();
    let mut total = 0.0;

    for layer in layers {
        state = permute(&state, &layer.permutation);
        let (next, log_determinant) = coupling_forward(&state, layer.split, &layer.params);
        state = next;
        total += log_determinant;
    }
    (state, total)
}

fn flow_inverse(z: &[f64], layers: &[Layer]) -> Vec<f64> {
    let mut state = z.to_vec();
    for layer in layers.iter().rev() {
        state = coupling_inverse(&state, layer.split, &layer.params);
        state = unpermute(&state, &layer.permutation);
    }
    state
}

/// The EXACT log-density. No bound, no sampling estimate, no variational gap.
///
/// Contrast a VAE, which can only bound this quantity. That difference is the
/// entire reason to choose a flow.
fn log_likelihood(x: &[f64], layers: &[Layer]) -> f64 {
    let (z, log_determinant) = flow_forward(x, layers);
    let log_2pi = (2.0 * PI).ln();
    let base: f64 = z.iter().map(|v| -0.5 * (v * v + log_2pi)).sum();
    base + log_determinant
}

/// The architecture guarantees this - an implementation bug does not.
///
/// Worth running once as a test: nothing in training ever checks
/// invertibility, so a transposed index or a sign error produces a model that
/// trains happily and cannot sample.
fn check_invertibility(x: &[f64], layers: &[Layer], tolerance: f64) -> bool {
    let (z, _) = flow_forward(x, layers);
    let recovered = flow_inverse(&z, layers);
    x.iter()
        .zip(&recovered)
        .all(|(a, b)| (a - b).abs() < tolerance)
}
`,
        profile:
          'O(K * d * W) per density evaluation with K coupling layers and width W, and the same cost for sampling. Illustrative, not a measured benchmark: the log-determinant is O(d) because the architecture makes the Jacobian triangular — a general determinant at the same dimension would be O(d^3) and would make the whole approach unusable.',
      },

      'make-it-right': {
        code: `//! The same flow, with the bijection as a trait and invertibility tested.
//!
//! Two things change. A bijection becomes an explicit trait with forward,
//! inverse and log-determinant, because composing them is the whole method and
//! a uniform contract is what makes composition safe. And the numerical guards
//! move from comments into code: the scale clamp is enforced at construction
//! rather than hoped for, and invertibility becomes a testable property rather
//! than an architectural claim nobody verified.

use std::f64::consts::PI;
use std::fmt;

/// Width of the data and latent space — equal, since the map is invertible.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Dimension(pub usize);

/// Number of composed bijections.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Depth(pub usize);

#[derive(Debug, PartialEq)]
pub enum FlowError {
    /// Forward then inverse did not recover the input.
    ///
    /// Its own variant because the architecture GUARANTEES invertibility and
    /// an implementation bug does not: a transposed index or a sign error
    /// produces a model that trains happily and cannot sample, with nothing
    /// in the loss to indicate it.
    NotInvertible { error: f64 },
    /// An unbounded affine scale.
    ///
    /// The coupling exponentiates the scale, so an unclamped network makes
    /// the log-determinant diverge and the loss becomes NaN in a single step.
    /// Refusing the configuration is cheaper than debugging the NaN.
    DivergentScale { limit: f64 },
    /// A split that leaves one half empty, so nothing is transformed.
    DegenerateSplit { split: usize, dimension: usize },
    /// Layers of differing width, which cannot compose.
    InconsistentDimension { expected: usize, found: usize },
    /// An index list that is not a permutation.
    NotAPermutation,
}

impl fmt::Display for FlowError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotInvertible { error } => write!(
                f,
                "forward then inverse differs by {error:.2e}; the architecture \
                 guarantees invertibility, so this is an implementation bug"
            ),
            Self::DivergentScale { limit } => write!(
                f,
                "scale limit {limit} is unusable; the coupling exponentiates the \
                 scale and an unbounded one gives NaN in one step"
            ),
            Self::DegenerateSplit { split, dimension } => {
                write!(f, "split {split} leaves a half empty in {dimension} dimensions")
            }
            Self::InconsistentDimension { expected, found } => {
                write!(f, "every layer must share a dimension; expected {expected}, found {found}")
            }
            Self::NotAPermutation => write!(f, "the index list is not a bijection"),
        }
    }
}

impl std::error::Error for FlowError {}

/// Output AND log-determinant.
///
/// They come back together because they are produced together: the
/// log-determinant of a coupling is a by-product of the scales it already
/// computed, and returning only the output would force a second pass.
pub struct Transformed {
    pub values: Vec<f64>,
    pub log_determinant: f64,
}

/// A single invertible transformation.
///
/// A trait rather than a concrete type because composition is the whole
/// method: a flow is a list of these, and every one must honour the same
/// contract for the composition to be invertible at all.
pub trait Bijection {
    fn forward(&self, x: &[f64]) -> Transformed;
    fn inverse(&self, y: &[f64]) -> Vec<f64>;
    fn dimension(&self) -> Dimension;
}

#[derive(Debug, Clone, Copy)]
pub struct CouplingConfig {
    pub dimension: Dimension,
    pub split: usize,
    pub scale_limit: f64,
}

impl CouplingConfig {
    pub fn validate(&self) -> Result<(), FlowError> {
        if self.split == 0 || self.split >= self.dimension.0 {
            return Err(FlowError::DegenerateSplit {
                split: self.split,
                dimension: self.dimension.0,
            });
        }
        // Guard clause for the single-step divergence.
        if self.scale_limit <= 0.0 || self.scale_limit > 10.0 {
            return Err(FlowError::DivergentScale { limit: self.scale_limit });
        }
        Ok(())
    }

    pub fn transformed_width(&self) -> usize {
        self.dimension.0 - self.split
    }
}

/// The construction that makes the determinant tractable.
///
/// Split the input; leave one half alone; transform the other elementwise with
/// parameters computed from the frozen half. The Jacobian is block-triangular
/// with a diagonal block, so its determinant is the product of the diagonal -
/// a sum in log space, in linear time, without ever forming the matrix.
pub struct AffineCoupling {
    config: CouplingConfig,
    w1: Vec<f64>,
    b1: Vec<f64>,
    w2: Vec<f64>,
    b2: Vec<f64>,
    hidden_width: usize,
}

impl AffineCoupling {
    pub fn new(
        config: CouplingConfig,
        w1: Vec<f64>,
        b1: Vec<f64>,
        w2: Vec<f64>,
        b2: Vec<f64>,
    ) -> Result<Self, FlowError> {
        config.validate()?;
        let hidden_width = b1.len();
        Ok(Self { config, w1, b1, w2, b2, hidden_width })
    }

    /// The network is NEVER inverted, so it can be arbitrarily complex.
    ///
    /// All the expressive power of a flow hides in the part that does not
    /// need to be invertible — that is the trick, and it is why the scale
    /// network is a free design choice rather than a constrained one.
    fn scale_and_shift(&self, frozen: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let hidden: Vec<f64> = (0..self.hidden_width)
            .map(|i| {
                let row = &self.w1[i * frozen.len()..(i + 1) * frozen.len()];
                (self.b1[i] + row.iter().zip(frozen).map(|(w, v)| w * v).sum::<f64>()).tanh()
            })
            .collect();

        let width = self.config.transformed_width();
        let mut scale = Vec::with_capacity(width);
        let mut shift = Vec::with_capacity(width);

        for i in 0..2 * width {
            let row = &self.w2[i * self.hidden_width..(i + 1) * self.hidden_width];
            let total =
                self.b2[i] + row.iter().zip(&hidden).map(|(w, h)| w * h).sum::<f64>();
            if i < width {
                // Clamped through a tanh rather than a hard clip: a hard clip
                // has zero gradient outside the range, so a saturated unit
                // could never recover.
                scale.push(self.config.scale_limit * (total / self.config.scale_limit).tanh());
            } else {
                shift.push(total);
            }
        }
        (scale, shift)
    }
}

impl Bijection for AffineCoupling {
    fn forward(&self, x: &[f64]) -> Transformed {
        let split = self.config.split;
        let (scale, shift) = self.scale_and_shift(&x[..split]);

        let mut values = Vec::with_capacity(self.config.dimension.0);
        values.extend_from_slice(&x[..split]);
        values.extend(
            x[split..]
                .iter()
                .zip(&scale)
                .zip(&shift)
                .map(|((v, s), t)| v * s.exp() + t),
        );

        // The log-determinant is a SUM of the scales. No determinant is
        // computed anywhere — the architecture guarantees triangularity.
        Transformed { values, log_determinant: scale.iter().sum() }
    }

    /// The SAME network, evaluated forwards.
    ///
    /// Inverting never requires inverting the scale network, because that
    /// network reads only the frozen half — which is unchanged and therefore
    /// already known. That is the entire construction.
    fn inverse(&self, y: &[f64]) -> Vec<f64> {
        let split = self.config.split;
        let (scale, shift) = self.scale_and_shift(&y[..split]);

        let mut values = Vec::with_capacity(self.config.dimension.0);
        values.extend_from_slice(&y[..split]);
        values.extend(
            y[split..]
                .iter()
                .zip(&scale)
                .zip(&shift)
                .map(|((v, s), t)| (v - t) * (-s).exp()),
        );
        values
    }

    fn dimension(&self) -> Dimension {
        self.config.dimension
    }
}

/// Shuffles dimensions between couplings.
///
/// Without this the same half is frozen in every layer and depth buys nothing
/// - the untransformed dimensions would pass straight from input to output.
/// The inverse is precomputed because it is needed on every sample.
pub struct Permutation {
    order: Vec<usize>,
    inverse: Vec<usize>,
}

impl Permutation {
    pub fn new(order: Vec<usize>) -> Result<Self, FlowError> {
        let mut sorted = order.clone();
        sorted.sort_unstable();
        if sorted.iter().enumerate().any(|(i, &value)| i != value) {
            return Err(FlowError::NotAPermutation);
        }
        let mut inverse = vec![0; order.len()];
        for (position, &index) in order.iter().enumerate() {
            inverse[index] = position;
        }
        Ok(Self { order, inverse })
    }
}

impl Bijection for Permutation {
    fn forward(&self, x: &[f64]) -> Transformed {
        Transformed {
            values: self.order.iter().map(|&i| x[i]).collect(),
            // A permutation has determinant plus or minus one, so its log
            // magnitude is exactly zero — it contributes nothing.
            log_determinant: 0.0,
        }
    }

    fn inverse(&self, y: &[f64]) -> Vec<f64> {
        self.inverse.iter().map(|&i| y[i]).collect()
    }

    fn dimension(&self) -> Dimension {
        Dimension(self.order.len())
    }
}

/// A composition of bijections, with the invariant checked on request.
pub struct Flow {
    layers: Vec<Box<dyn Bijection>>,
    dimension: Dimension,
}

impl Flow {
    pub fn new(layers: Vec<Box<dyn Bijection>>) -> Result<Self, FlowError> {
        let dimension = layers
            .first()
            .map(|layer| layer.dimension())
            .ok_or(FlowError::InconsistentDimension { expected: 0, found: 0 })?;

        for layer in &layers {
            if layer.dimension() != dimension {
                return Err(FlowError::InconsistentDimension {
                    expected: dimension.0,
                    found: layer.dimension().0,
                });
            }
        }
        Ok(Self { layers, dimension })
    }

    /// Determinants MULTIPLY, so logs ADD.
    ///
    /// That is why flows are built deep: composing K layers costs nothing
    /// extra in the log-determinant term, it is just a longer sum.
    pub fn forward(&self, x: &[f64]) -> Transformed {
        self.layers.iter().fold(
            Transformed { values: x.to_vec(), log_determinant: 0.0 },
            |state, layer| {
                let next = layer.forward(&state.values);
                Transformed {
                    values: next.values,
                    log_determinant: state.log_determinant + next.log_determinant,
                }
            },
        )
    }

    pub fn inverse(&self, z: &[f64]) -> Vec<f64> {
        self.layers
            .iter()
            .rev()
            .fold(z.to_vec(), |state, layer| layer.inverse(&state))
    }

    /// The EXACT log-density. No bound, no estimate, no variational gap.
    pub fn log_likelihood(&self, x: &[f64]) -> f64 {
        let result = self.forward(x);
        let log_2pi = (2.0 * PI).ln();
        let base: f64 = result.values.iter().map(|v| -0.5 * (v * v + log_2pi)).sum();
        base + result.log_determinant
    }

    /// The architecture guarantees this — an implementation does not.
    ///
    /// Nothing in training ever checks invertibility, so a transposed index
    /// or a sign error produces a model that trains happily and cannot
    /// sample. This belongs in a test suite, permanently.
    pub fn assert_invertible(&self, x: &[f64], tolerance: f64) -> Result<(), FlowError> {
        let recovered = self.inverse(&self.forward(x).values);
        let error = x
            .iter()
            .zip(&recovered)
            .map(|(a, b)| (a - b).abs())
            .fold(0.0f64, f64::max);
        if error > tolerance {
            return Err(FlowError::NotInvertible { error });
        }
        Ok(())
    }

    pub fn depth(&self) -> Depth {
        Depth(self.layers.len())
    }
}
`,
        rationale:
          'Two changes. A bijection becomes an explicit trait with forward, inverse and dimension, because composition is the whole method and a uniform contract is what makes composing arbitrary layers safe — the flow then validates that every layer shares a dimension, which is the invariant the composition depends on. The second is that the numerical guards move from comments into code. The scale clamp is enforced at construction with its own error variant, because the coupling exponentiates the scale and an unclamped network produces NaN in a single step with no gradual warning; it is applied through a tanh rather than a hard clip, since a clip has zero gradient outside its range and a saturated unit could never recover. Invertibility becomes a checked assertion returning its own variant, because the architecture guarantees it and an implementation does not — a transposed index produces a model that trains happily and cannot sample, and nothing in the loss would say so. Weights flatten to row-major slices so each row is a contiguous walk, the permutation precomputes its inverse since sampling needs it on every call, and the composition is a fold rather than a mutable loop.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: the precomputed inverse permutation turns sampling from a search into a direct index, which matters when sampling is the production path.',
      },

      'make-it-fast': {
        code: `//! Batched, masked, and fused. The split becomes a mask, not a slice.
//!
//! The structural change worth understanding: the literal version splits the
//! vector, so the two halves live in different buffers and every layer
//! concatenates them back. Masking instead keeps the vector whole and
//! multiplies by a binary mask - so the coupling becomes elementwise
//! arithmetic over the full width, and nothing is ever split or concatenated.
//!
//! Three changes:
//!   1. Masked coupling. One array throughout; the frozen half is selected by
//!      multiplication rather than by slicing.
//!   2. The scale network becomes matrix products over the batch.
//!   3. The log-determinant is one masked reduction, which is where the
//!      architecture's linear-time determinant becomes visible as a sum.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

const LOG_2PI: f32 = 1.837_877_1;

/// An affine coupling expressed with a binary mask rather than a split.
///
/// mask == 1 marks the frozen dimensions. The transformation is then
/// elementwise over the WHOLE vector, with the mask selecting what changes:
///
///   y = mask * x + (1 - mask) * (x * exp(s) + t)
///
/// Algebraically identical to the split form, and structurally much better: no
/// slicing, no concatenation, and the scale network reads a masked copy rather
/// than a separate array.
pub struct MaskedCoupling {
    mask: Array1<f32>,
    free: Array1<f32>,
    w1: Array2<f32>,
    b1: Array1<f32>,
    w2: Array2<f32>,
    b2: Array1<f32>,
    limit: f32,
    /// Scratch sized once, so a forward pass allocates only its output.
    masked: Array2<f32>,
    hidden: Array2<f32>,
    projected: Array2<f32>,
}

impl MaskedCoupling {
    pub fn new(
        batch: usize,
        mask: Array1<f32>,
        w1: Array2<f32>,
        b1: Array1<f32>,
        w2: Array2<f32>,
        b2: Array1<f32>,
        limit: f32,
    ) -> Self {
        let dimension = mask.len();
        let hidden_width = b1.len();
        let free = mask.mapv(|value| 1.0 - value);
        Self {
            mask,
            free,
            w1,
            b1,
            w2,
            b2,
            limit,
            masked: Array2::zeros((batch, dimension)),
            hidden: Array2::zeros((batch, hidden_width)),
            projected: Array2::zeros((batch, 2 * dimension)),
        }
    }

    /// Two products for the whole batch. The network is never inverted, so it
    /// can be as large as you like - all the expressive power hides here, in
    /// the part that does not have to be invertible.
    fn scale_and_shift(&mut self, x: ArrayView2<'_, f32>) {
        // The masked copy is the one real cost of the mask formulation: the
        // scale network must not see the free half, so the input is masked
        // into scratch rather than sliced.
        Zip::from(self.masked.axis_iter_mut(Axis(0)))
            .and(x.axis_iter(Axis(0)))
            .par_for_each(|mut target, source| {
                for ((slot, &value), &m) in
                    target.iter_mut().zip(source.iter()).zip(self.mask.iter())
                {
                    *slot = value * m;
                }
            });

        self.hidden.assign(&self.masked.dot(&self.w1));
        Zip::from(self.hidden.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.b1.iter()) {
                *value = (*value + bias).tanh();
            }
        });

        self.projected.assign(&self.hidden.dot(&self.w2));

        // Bias and clamp fused in one pass. The clamp is NOT optional: the
        // coupling exponentiates this and an unbounded scale is a one-step
        // NaN. A tanh rather than a clip, because a clip has zero gradient
        // outside its range and a saturated unit could never recover.
        let dimension = self.mask.len();
        let limit = self.limit;
        Zip::from(self.projected.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for d in 0..dimension {
                row[d] = limit * ((row[d] + self.b2[d]) / limit).tanh();
                row[dimension + d] += self.b2[dimension + d];
            }
        });
    }

    /// Returns the output and the per-sample log-determinant.
    pub fn forward(&mut self, x: ArrayView2<'_, f32>) -> (Array2<f32>, Array1<f32>) {
        self.scale_and_shift(x);

        let dimension = self.mask.len();
        let mut out = Array2::<f32>::zeros(x.raw_dim());
        let mut log_determinant = Array1::<f32>::zeros(x.shape()[0]);

        // Fused: exponentiate, apply the affine map, select with the mask and
        // reduce the log-determinant in ONE pass per row. No intermediate for
        // the transformed half exists at any point.
        Zip::from(out.axis_iter_mut(Axis(0)))
            .and(x.axis_iter(Axis(0)))
            .and(self.projected.axis_iter(Axis(0)))
            .and(&mut log_determinant)
            .par_for_each(|mut target, source, projected, determinant| {
                let mut accumulated = 0.0f32;
                for d in 0..dimension {
                    let free = self.free[d];
                    let scale = projected[d] * free;
                    let shift = projected[dimension + d] * free;
                    target[d] = self.mask[d] * source[d]
                        + free * (source[d] * scale.exp() + shift);
                    // The log-determinant is a masked SUM of the scales. No
                    // determinant is computed anywhere: the architecture
                    // makes the Jacobian triangular, which is why this is
                    // O(d) rather than O(d^3).
                    accumulated += scale;
                }
                *determinant = accumulated;
            });

        (out, log_determinant)
    }

    /// The SAME network, evaluated forwards.
    ///
    /// Inverting never requires inverting the scale network, because that
    /// network reads only the masked half - which is unchanged and therefore
    /// already known. That is the entire construction.
    pub fn inverse(&mut self, y: ArrayView2<'_, f32>) -> Array2<f32> {
        self.scale_and_shift(y);

        let dimension = self.mask.len();
        let mut out = Array2::<f32>::zeros(y.raw_dim());

        Zip::from(out.axis_iter_mut(Axis(0)))
            .and(y.axis_iter(Axis(0)))
            .and(self.projected.axis_iter(Axis(0)))
            .par_for_each(|mut target, source, projected| {
                for d in 0..dimension {
                    let free = self.free[d];
                    let scale = projected[d] * free;
                    let shift = projected[dimension + d] * free;
                    target[d] = self.mask[d] * source[d]
                        + free * ((source[d] - shift) * (-scale).exp());
                }
            });

        out
    }
}

/// Exact log-density for a whole batch. No bound, no estimate.
///
/// Determinants MULTIPLY, so logs ADD - composing K layers is just a longer
/// sum, which is why flows are built deep.
pub fn base_log_density(z: ArrayView2<'_, f32>) -> Array1<f32> {
    let dimension = z.shape()[1] as f32;
    z.axis_iter(Axis(0))
        .into_par_iter()
        .map(|row| {
            // Contracted in one pass rather than squaring into a temporary
            // and summing it.
            let squared: f32 = row.iter().map(|v| v * v).sum();
            -0.5 * (squared + dimension * LOG_2PI)
        })
        .collect::<Vec<f32>>()
        .into()
}

/// Uniform noise before fitting a continuous density to discrete data.
///
/// Without it the likelihood is UNBOUNDED: a continuous density can put
/// arbitrarily much mass on a finite set of exact values, so the model chases
/// infinity rather than learning the distribution. Likelihoods are also only
/// comparable between models using the same scheme, which is why a published
/// bits-per-dimension without its dequantization is meaningless.
pub fn dequantize(values: &[i32], levels: f32, noise: &[f32]) -> Vec<f32> {
    values
        .par_iter()
        .zip(noise.par_iter())
        .map(|(&value, &jitter)| (value as f32 + jitter) / levels)
        .collect()
}

/// The reporting convention, with the dequantization correction included.
///
/// Omitting the level correction is the standard way published numbers become
/// incomparable - it is a constant offset, so it never looks wrong.
pub fn bits_per_dimension(log_likelihood: ArrayView1<'_, f32>, dimension: usize, levels: f32) -> f64 {
    let mean: f64 = log_likelihood.iter().map(|&v| f64::from(v)).sum::<f64>()
        / log_likelihood.len() as f64;
    let nats = -mean / dimension as f64;
    nats / std::f64::consts::LN_2 + f64::from(levels).log2()
}
`,
        rationale:
          'The structural change worth understanding is that the split becomes a mask. The literal version slices the vector, so the two halves live in different buffers and every layer concatenates them back; multiplying by a binary mask keeps the vector whole, so the coupling becomes elementwise arithmetic over the full width and nothing is ever split or concatenated. The affine map, the mask selection and the log-determinant reduction fuse into one pass per row, so no intermediate for the transformed half ever exists and the determinant sum comes free from a traversal already happening — which is where the architecture’s linear-time determinant becomes visible as a single accumulation rather than an argument in a comment. The scale network becomes two matrix products over the batch, with bias and clamp fused into one pass over the projection, and the clamp goes through a tanh rather than a clip deliberately, since a clip has zero gradient outside its range and a saturated unit could never recover. The one honest cost of the mask formulation is named in the code: the scale network must not see the free half, so the input is masked into scratch rather than sliced, which is a real copy the split form avoids.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The scale network is two dense products over the whole batch, dispatching to sgemm on contiguous f32 operands, and it is the only arithmetic of any size in a coupling layer.',
            tradeoff: 'Binds the build to a system BLAS, and masking means the network computes scale and shift for the frozen dimensions too and then multiplies them away — roughly half the product output is discarded.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The masking, the activation, the clamp and the fused coupling pass are all row-independent with no shared writes, and the log-determinant is written per row rather than reduced across them.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS products, so parallelizing both competes for bandwidth — and the masked copy is a full extra pass over the activations on every layer.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Scratch is allocated once at construction and every product sees a standard-layout operand, so no forward pass reallocates beyond its output.',
            tradeoff: 'The scratch is sized for a fixed batch and held for the layer’s lifetime, so a stack of thirty couplings each holding batch-sized buffers is a substantial fixed footprint independent of what is being processed.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The free mask is precomputed once rather than derived per call, the projection is assigned into existing scratch, and the fused pass reads the input rather than copying it.',
            tradeoff: 'The projection buffer is overwritten by the clamp, so the raw scale is gone — and diagnosing a saturated scale network, which is why a flow stops improving, needs an unfused pass.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'A density evaluation becomes two products and one fused pass per coupling layer for the whole batch. Illustrative, not a measured benchmark: the log-determinant stays O(d) per layer because the architecture guarantees triangularity — a general determinant at the same dimension would be O(d^3) and would make the approach unusable at any width.',
      },
    },
  },
};
