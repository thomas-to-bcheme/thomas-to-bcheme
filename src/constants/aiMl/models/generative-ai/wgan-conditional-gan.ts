import type { AiMlModel } from '../../types';

/**
 * WGAN-GP & Conditional GAN — the two modifications that made adversarial
 * training usable.
 *
 * Included as a \`technique\` entry rather than a model, because neither is a
 * new architecture: one changes what the second network measures, the other
 * changes what both networks are told. Together they are the difference
 * between a research curiosity and something you can ship.
 */
export const WGAN_CONDITIONAL_GAN: AiMlModel = {
  slug: 'wgan-conditional-gan',
  name: 'WGAN-GP & Conditional GAN',
  aliases: ['WGAN', 'WGAN-GP', 'Wasserstein GAN', 'cGAN', 'Conditional GAN', 'Projection discriminator'],
  category: 'generative-ai',
  group: 'adversarial',
  kind: 'technique',

  paradigms: ['unsupervised', 'supervised'],
  taskTypes: ['generation', 'anomaly-detection'],
  paradigmNote:
    'Both paradigms appear because the two modifications sit on different axes. The Wasserstein objective is unsupervised — it changes what the second network measures and needs no labels. Conditioning is supervised: class labels, text or a paired input enter both networks, which turns generation from "produce something plausible" into "produce something plausible of this kind", and is where almost all practical value lives.',

  intuition:
    'A plain GAN’s discriminator answers a classification question, and once it can answer it confidently it stops being informative — the gradient it hands back vanishes exactly when the generator most needs guidance. Replace it with a critic that scores rather than classifies, constrain how fast that score can change, and the answer becomes a distance that stays meaningful however far apart the two distributions are. Separately and independently: tell both networks what they are looking at. A generator given a class label learns one conditional distribution per label rather than one blurred mixture, and the critic can then check that the sample matches its label rather than merely looking real.',

  objective: {
    kind: 'minimax',
    expression: {
      formula:
        '\\min_G \\max_{\\lVert f \\rVert_L \\le 1} \\ \\mathbb{E}_{\\mathbf{x}\\sim p_{\\text{data}}}\\bigl[f(\\mathbf{x}\\mid \\mathbf{c})\\bigr] - \\mathbb{E}_{\\mathbf{z}\\sim p_Z}\\bigl[f\\bigl(G(\\mathbf{z}\\mid\\mathbf{c})\\mid\\mathbf{c}\\bigr)\\bigr] + \\lambda\\,\\mathbb{E}_{\\hat{\\mathbf{x}}}\\Bigl[\\bigl(\\lVert\\nabla_{\\hat{\\mathbf{x}}} f(\\hat{\\mathbf{x}})\\rVert_2 - 1\\bigr)^2\\Bigr]',
      symbols: [
        { symbol: 'f', meaning: 'the critic — it scores, it does not classify, and its output is unbounded with no sigmoid anywhere' },
        { symbol: '\\lVert f \\rVert_L \\le 1', meaning: 'the Lipschitz constraint: without it the supremum is unbounded and the objective is meaningless' },
        { symbol: '\\mathbf{c}', meaning: 'the condition — a class label, a text embedding, a paired image; fed to BOTH networks' },
        { symbol: '\\hat{\\mathbf{x}}', meaning: 'points sampled on the line between real and generated data, where the constraint is enforced' },
        { symbol: '\\lambda', meaning: 'penalty weight, typically 10; a soft constraint standing in for a hard one' },
      ],
    },
    reading:
      'The first two terms are the Kantorovich-Rubinstein dual of the Wasserstein distance: the supremum over all 1-Lipschitz functions of the difference in expected score is exactly the earth-mover distance between the two distributions. That identity is what makes this different from a classification objective — the critic value is estimating a real distance, so it is meaningful even when the distributions do not overlap, which is precisely where a Jensen-Shannon-based discriminator saturates and dies. The third term is where theory meets practice: the constraint is over a function class, which cannot be imposed directly, so it becomes a penalty on the gradient norm at interpolated points. That substitution is soft where the constraint is hard, and the conditioning variable threading through every term is the other modification, entirely orthogonal to the first.',
  },

  optimization: {
    method: 'Alternating Adam with multiple critic steps per generator step, a gradient penalty on interpolates, and conditioning injected into both networks',
    updateRule: {
      formula:
        '\\hat{\\mathbf{x}} = \\epsilon \\mathbf{x} + (1-\\epsilon) G(\\mathbf{z}), \\ \\epsilon \\sim U[0,1], \\qquad f(\\mathbf{x}\\mid\\mathbf{c}) = \\psi\\bigl(\\phi(\\mathbf{x})\\bigr) + \\mathbf{y}_\\mathbf{c}^\\top \\phi(\\mathbf{x})',
      symbols: [
        { symbol: '\\epsilon \\sim U[0,1]', meaning: 'a fresh interpolation coefficient per sample; the penalty is enforced on the line between the distributions, not on either' },
        { symbol: '\\phi', meaning: 'the critic’s feature extractor, shared between the unconditional and conditional terms' },
        { symbol: '\\mathbf{y}_\\mathbf{c}^\\top \\phi', meaning: 'projection conditioning: an inner product between a class embedding and the features, rather than a concatenated input' },
        { symbol: 'n_{\\text{critic}}', meaning: 'critic steps per generator step, usually five — the critic must approximate the supremum before the generator moves' },
      ],
    },
    rationale:
      'Three choices carry the method and each is worth separating. The gradient penalty enforces the Lipschitz constraint on interpolates rather than on real or generated data, because the optimal critic’s gradient has norm one precisely along the transport path between the distributions, and penalizing elsewhere constrains a region the optimum does not care about. It replaced weight clipping, which enforced the constraint by brute force and destroyed critic capacity in the process — a cautionary example of satisfying a constraint in a way that ruins what it was protecting. The multiple-critic-steps schedule follows from the objective: the critic is estimating a supremum, and a poorly converged supremum is not a distance, so the generator should not move until the critic is close. And projection conditioning wins over concatenation because concatenating a label to the critic’s input lets it be ignored, while an inner product between a class embedding and the features makes class-consistency structurally part of the score.',
    hyperparameters: [
      { name: 'gradient penalty weight', role: 'The soft constraint’s strength. Ten is the near-universal default and it is surprisingly insensitive', typicalRange: '1 to 10' },
      { name: 'critic steps per generator step', role: 'How well the supremum is approximated before the generator moves. Five is standard', typicalRange: '1 to 10' },
      { name: 'Adam beta1', role: 'Kept at or near zero; momentum destabilizes a critic chasing a moving target', typicalRange: '0.0 to 0.5' },
      { name: 'conditioning mechanism', role: 'Projection, concatenation, or conditional normalization. Projection is the strongest and the least likely to be ignored', typicalRange: 'projection / concat / cond-norm' },
      { name: 'class embedding dimension', role: 'Width of the conditioning vector; too small and classes collide, too large and rare classes are undertrained', typicalRange: '64 to 512' },
      { name: 'batch normalization in the critic', role: 'Must be avoided — it makes the critic output depend on other samples, which invalidates the per-sample gradient penalty', typicalRange: 'layer/instance norm only' },
    ],
    convergence:
      'The headline improvement is that the critic loss finally correlates with sample quality, which no plain GAN loss does — a falling Wasserstein estimate genuinely means the distributions are closer, so for the first time in this family there is a curve worth watching. That is a real and large practical gain, and it should not be oversold: it is a correlation rather than a guarantee, the estimate is only a distance when the critic has approximated the supremum, and an under-trained critic gives a number that means nothing. The characteristic failures are different from a plain GAN’s. Too few critic steps gives a meaningless loss that still looks smooth. Batch normalization in the critic breaks the gradient penalty silently, because the penalty assumes the critic is a function of one sample and batch statistics make it a function of the whole batch. And on the conditional side, rare classes are undertrained and their conditional distributions collapse first, which an aggregate metric hides completely.',
    complexity:
      'The gradient penalty costs a second-order derivative — a gradient of a gradient — which roughly doubles the critic’s backward cost. Combined with five critic steps per generator step, a full round is roughly ten critic passes and one generator pass, making this several times more expensive per generator update than a plain GAN. The stability is bought with compute, and that trade should be stated plainly.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Conditioning is the whole story here: a conditional generator takes an encoded history and produces continuations, so the set of generated futures is an implicit predictive distribution. The Wasserstein objective matters because a critic comparing two sets of trajectories does not saturate the way a classifier does when the generated and real sets are far apart, which is the normal situation early in training.',
        where: [
          'Conditional synthetic-series generation, producing plausible continuations of a given history',
          'Scenario generation for stress testing, where diverse plausible futures are the deliverable',
          'Class-conditional synthesis — generating series for a specific regime, product or region',
          'Augmenting rare operating conditions that appear too seldom in the historical record',
        ],
        why: 'Conditioning turns an unconditional generator into something that can be steered, which is the difference between generating plausible series and generating plausible continuations of this series. The Wasserstein critic then keeps training stable in the regime where the two distributions barely overlap, which for trajectory data is most of training. Against it, the objections from the GAN entry survive intact: there is still no likelihood, so the implicit predictive distribution cannot be calibrated the way a quantile forecaster’s can, and a model optimizing realism is not optimizing calibration. Use this to generate conditioned data, not to forecast with.',
        featurization: [
          'Feed the history encoding to BOTH networks; conditioning only the generator leaves the critic unable to check that the continuation matches its history',
          'Use projection conditioning rather than concatenation in the critic, since a concatenated condition can simply be ignored',
          'Sample interpolates between real and generated trajectories for the penalty, not between two real ones',
          'Measure conditional diversity per history rather than overall, because collapse within a condition is invisible in an aggregate count',
        ],
        evaluation:
          'Train-on-synthetic-test-on-real for the synthesis use case, which is the only benchmark that reflects it. For any forecasting claim, calibration against a quantile baseline — and expect to lose, because realism and calibration are different objectives.',
        pitfalls: [
          'Conditioning only the generator, so nothing enforces that the output matches the condition',
          'Too few critic steps, giving a Wasserstein estimate that means nothing while looking smooth',
          'Per-condition mode collapse hidden by aggregate diversity metrics',
          'Treating generated futures as a calibrated predictive distribution, which they are not',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'The reconstruction-search machinery is unchanged from the plain GAN entry, but the score improves for a specific reason: a critic output is unbounded and continuous, where a discriminator probability saturates to zero or one and stops distinguishing degrees of abnormality. A mildly unusual input and a wildly unusual one both score as probability zero under a trained discriminator, and score differently under a critic.',
        where: [
          'Severity-graded anomaly scoring, where how anomalous matters and not only whether',
          'Conditional anomaly detection — is this normal given the operating regime, rather than in general',
          'Industrial inspection where a continuous defect score feeds a downstream triage threshold',
          'Monitoring across heterogeneous conditions, where a conditional model avoids one model per regime',
        ],
        why: 'The non-saturating critic is a genuine and specific improvement over a discriminator probability as a score, and conditioning adds a second one: asking whether this is normal for this regime is a sharper question than asking whether it is normal overall, and it avoids maintaining a separate model per regime. Both are real. Neither changes the fundamental position from the GAN entry — the scoring procedure is still expensive, mode collapse within a condition still turns a whole normal region into false positives, and an autoencoder remains simpler and usually competitive. This is a better version of an approach that was already not the first choice.',
        featurization: [
          'Use the critic score directly rather than a probability, since that is the entire improvement here',
          'Condition on operating regime where one exists, which sharpens the question the score answers',
          'Calibrate the score threshold per condition, because critic outputs are unnormalized and not comparable across conditions',
          'Check per-condition mode coverage, since a collapsed conditional distribution becomes a permanent false-positive source',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget with an autoencoder baseline, which remains the comparison that decides whether the complexity is warranted. Report scoring latency, and report per-condition performance rather than only the aggregate.',
        pitfalls: [
          'Comparing raw critic scores across conditions, when they are unnormalized and not on a common scale',
          'Per-condition collapse creating a permanent blind spot within one regime',
          'The same scoring-latency problem the plain GAN has, which neither modification addresses',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'This entry is substantially an optimization result. The Wasserstein distance is intractable as written, and Kantorovich-Rubinstein duality converts it into a supremum over 1-Lipschitz functions — which a neural network can approximate. That leaves the constraint, which is over a function class and cannot be imposed directly, so it becomes a soft penalty on the gradient norm at interpolated points. The whole method is a chain of substitutions, each of which trades exactness for tractability, and being able to name what each one costs is the point of studying it.',
        where: [
          'Kantorovich-Rubinstein duality as the move that makes an intractable distance computable',
          'Soft penalties standing in for hard constraints, and what is lost in the substitution',
          'Weight clipping as a cautionary example: a constraint satisfied in a way that destroys what it protected',
          'Multiple inner steps per outer step, the standard structure whenever an inner problem must be approximately solved first',
        ],
        why: 'Worth studying because it is the clearest case in this reference of choosing a better-behaved objective rather than better-tuning a badly-behaved one. The Jensen-Shannon divergence a plain GAN implicitly minimizes is constant when two distributions have disjoint support, which is why its gradient vanishes; the Wasserstein distance degrades gracefully there, so the fix was a change of metric rather than a change of architecture. The weight-clipping story is the other lesson and it is a sharp one — the constraint was enforced, the theory was satisfied, and the resulting critics were so capacity-limited that the method barely worked. Satisfying a constraint is not the same as satisfying it well.',
        featurization: [
          'Enforce the penalty on interpolates, since the optimal critic has unit gradient norm along the transport path and nowhere else in particular',
          'Run enough critic steps that the supremum is approximated, because an under-converged critic value is not a distance at all',
          'Avoid batch normalization in the critic, which makes the output depend on the batch and silently invalidates a per-sample penalty',
          'Track the Wasserstein estimate as a quality proxy — this is the only adversarial objective in the reference where the loss means something',
        ],
        evaluation:
          'Correlate the critic estimate against sample-quality metrics across training, which is the claim that distinguishes this from a plain GAN and is worth verifying rather than assuming. Ablate the critic-step count to confirm the estimate is converged, because a smooth curve from an under-trained critic is indistinguishable from a meaningful one.',
        pitfalls: [
          'Trusting the Wasserstein estimate from an under-trained critic, where it is smooth and meaningless',
          'Batch normalization in the critic breaking the penalty with no error anywhere',
          'Penalizing the gradient on real or generated data rather than on interpolates, which constrains the wrong region',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'Where these two modifications actually made their mark. Conditional image generation — class-conditional, text-conditional, or image-to-image translation — became practical, and the Wasserstein objective plus gradient penalty made high-resolution training stable enough to be routine rather than heroic.',
        where: [
          'Class-conditional image synthesis, where one model covers many categories',
          'Image-to-image translation, where the condition is a paired input such as a sketch or a segmentation map',
          'Text-conditional generation, with an encoded caption as the condition',
          'Super-resolution, where the low-resolution image is the condition and the critic judges the pairing',
        ],
        why: 'Conditioning is what made GANs useful rather than merely impressive: an unconditional generator produces something, and a conditional one produces what you asked for, which is the difference between a demo and a tool. The Wasserstein objective with a gradient penalty is what made training high-resolution models reliable enough to iterate on. Both have since been absorbed into the diffusion era rather than discarded — conditioning mechanisms transferred almost directly — and diffusion has taken over the generation itself. These techniques remain relevant where single-pass generation is required and in the many image-to-image systems still built on them.',
        featurization: [
          'Use projection conditioning in the critic; a concatenated label can be ignored and frequently is',
          'Replace batch normalization with layer or instance normalization in the critic, since the penalty assumes per-sample independence',
          'Apply conditional normalization in the generator, which is a much stronger conditioning signal than concatenation at the input',
          'Balance classes or reweight, because rare conditions collapse first and an aggregate metric will not show it',
        ],
        evaluation:
          'Conditional quality and diversity per class rather than aggregated, since a model can score well overall while a handful of classes have collapsed entirely. Report the Wasserstein estimate alongside, and verify that the critic is converged enough for it to mean anything.',
        pitfalls: [
          'Batch normalization in the critic silently breaking the gradient penalty',
          'Rare classes collapsing first while aggregate metrics stay healthy',
          'Concatenated conditioning being ignored by the critic, so class consistency is never enforced',
          'The doubled backward cost of the penalty being underestimated when planning compute',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Conditional synthesis of tabular records: generate synthetic examples of a specific class or segment, rather than samples from the overall mixture. For an imbalanced fraud problem that is exactly the useful capability, since the minority class is what needs augmenting.',
        where: [
          'Class-conditional minority oversampling for extremely imbalanced detection problems',
          'Segment-conditional synthetic data, generating records for a specific product or geography',
          'Conditional stress-scenario generation for risk models',
          'Privacy-oriented synthesis where the conditioning preserves segment structure',
        ],
        why: 'Conditional generation addresses the actual need in imbalanced problems — more of a specific class rather than more of the mixture — and the Wasserstein objective makes training on small minority sets less fragile, which matters because those sets are small by definition. The caveats from the GAN entry all carry over and one is sharper here: conditioning on a class with very few examples means the conditional generator learned that distribution from very few examples, so it can amplify their idiosyncrasies with more confidence than before. Simple oversampling remains the baseline to beat, and it frequently is not beaten.',
        featurization: [
          'Use an architecture designed for mixed categorical and continuous columns, which image-derived designs handle badly',
          'Validate by training a downstream model on synthetic data and testing on real, the only test that reflects the use case',
          'Check per-class diversity, since a conditional collapse produces many near-identical minority records',
          'Test for memorized training records before any privacy claim, because conditioning on a rare class makes memorization more likely rather than less',
        ],
        evaluation:
          'Downstream performance on real held-out data with and without the augmentation, against a simple-oversampling baseline. For privacy, membership-inference testing rather than the assertion that the data is synthetic.',
        pitfalls: [
          'Amplifying the idiosyncrasies of a handful of minority examples, which conditioning makes more likely rather than less',
          'Per-class collapse producing near-identical synthetic records',
          'Privacy claims without a membership-inference test, when rare-class conditioning increases memorization risk',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Several times a plain GAN per generator update: five critic steps is standard, and the gradient penalty requires a second-order derivative that roughly doubles each critic backward pass. The stability is genuinely bought with compute, which is the right trade and should be planned for rather than discovered.',
    inferenceProfile:
      'Unchanged — one forward pass through the generator, with the condition as an extra input. The critic is training scaffolding and is discarded. Conditioning adds essentially nothing to inference cost.',
    retrainingCadence:
      'Per project, as with any GAN. Conditional models additionally need retraining whenever the condition vocabulary changes, since a new class has no embedding and there is no graceful fallback.',
    driftAndMonitoring: [
      'Track the Wasserstein estimate, which unlike a plain GAN loss genuinely correlates with sample quality — but confirm the critic is converged, or the number is smooth and meaningless',
      'Monitor per-condition sample quality and diversity, because rare conditions collapse first and aggregates hide it entirely',
      'Watch the gradient-penalty term itself; a value that stays far from zero means the Lipschitz constraint is not being met',
      'Generate from a fixed latent and condition pair every epoch and look at it, which remains the most reliable monitoring available',
    ],
    productionGotchas: [
      'Batch normalization in the critic breaks the gradient penalty silently. The penalty assumes the critic is a function of one sample, and batch statistics make it a function of the whole batch — use layer or instance normalization',
      'An under-trained critic produces a Wasserstein estimate that is smooth, plausible and meaningless. The estimate is only a distance when the supremum is approximated',
      'Conditioning must reach both networks. A conditional generator with an unconditional critic has nothing enforcing that outputs match their condition, and the failure looks like poor conditioning rather than a missing constraint',
      'A new condition has no embedding. Conditional models cannot generalize to an unseen class, and there is no graceful degradation — the output is arbitrary',
      'Rare conditions collapse first and aggregate metrics will not show it. Per-condition evaluation is mandatory rather than thorough',
    ],
  },

  assumptions: [
    'The critic can approximate the supremum over 1-Lipschitz functions well enough that its value means something',
    'The gradient penalty on interpolates is an adequate stand-in for a hard Lipschitz constraint — a substitution rather than an equivalence',
    'The conditioning variable is available at both training and generation time, and its vocabulary is fixed',
    'Every condition has enough examples to learn its conditional distribution, which is false for rare classes',
    'The critic is a function of a single sample, which batch normalization silently violates',
  ],

  pros: [
    {
      point: 'The loss finally means something',
      context:
        'The Wasserstein estimate correlates with sample quality, where no plain GAN loss does. For the first time in this family there is a curve worth watching — a correlation rather than a guarantee, but a large practical gain over having nothing.',
    },
    {
      point: 'Gradients survive non-overlapping distributions',
      context:
        'Jensen-Shannon is constant when supports are disjoint, which is why a plain discriminator dies early in training. Wasserstein degrades gracefully there, so the fix was a change of metric rather than of architecture.',
    },
    {
      point: 'Conditioning makes generation steerable',
      context:
        'The difference between producing something plausible and producing what was asked for — which is the difference between a demo and a tool. Almost all practical value in this entry comes from this half.',
    },
    {
      point: 'Both modifications are architecture-agnostic',
      context:
        'Neither requires a particular generator or critic design, so they compose with whatever architecture the domain calls for. That is why the conditioning mechanisms transferred directly into the diffusion era.',
    },
  ],

  cons: [
    {
      point: 'Several times more expensive per generator update',
      context:
        'Five critic steps plus a second-order penalty roughly doubling each critic backward. The stability is bought with compute, and underestimating that is the most common planning error with this method.',
    },
    {
      point: 'The Lipschitz constraint is enforced softly and approximately',
      context:
        'A penalty on sampled interpolates is not the constraint the theory requires. The guarantees are therefore about an object the implementation does not exactly produce, which is worth knowing before leaning on them.',
    },
    {
      point: 'Batch normalization in the critic breaks it silently',
      context:
        'The penalty assumes per-sample independence and batch statistics violate it with no error anywhere. A specific, common and entirely invisible failure.',
    },
    {
      point: 'Rare conditions collapse first',
      context:
        'A conditional model spreads its capacity across conditions, and the ones with fewest examples fail first while aggregate metrics stay healthy. Per-condition evaluation is mandatory and routinely skipped.',
    },
    {
      point: 'Still no likelihood, and still overtaken',
      context:
        'Neither modification supplies a density, so principled evaluation remains unavailable, and diffusion has taken over most conditional generation. These remain relevant where single-pass generation is required.',
    },
  ],

  relatedSlugs: ['gan', 'ddpm', 'vae', 'normalizing-flows', 'score-based-flow-matching'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""WGAN-GP and conditional generation, transcribed the way the papers read.

Two independent modifications to the adversarial setup:

  1. WASSERSTEIN: the second network SCORES rather than classifies. No
     sigmoid, no cross-entropy - the critic value estimates a distance, which
     stays meaningful even when the two distributions do not overlap. That is
     exactly where a classifier saturates and its gradient dies.

  2. CONDITIONING: both networks are told what they are looking at. A
     generator given a label learns one conditional distribution per label
     rather than one blurred mixture.

The Lipschitz constraint the theory requires cannot be imposed directly, so it
becomes a PENALTY on the gradient norm at interpolated points - a soft stand-in
for a hard constraint, and the substitution is worth naming.

Plain loops, no libraries.
"""

import math
import random

SEED = 23
PENALTY_WEIGHT = 10.0
CRITIC_STEPS = 5


def relu(value):
    return value if value > 0.0 else 0.0


def matvec(weight, vector, bias):
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def critic_forward(x, condition_embedding, params):
    """Sample -> SCORE. Unbounded, with no sigmoid anywhere.

    The conditioning uses PROJECTION rather than concatenation: an inner
    product between the class embedding and the critic's features. A
    concatenated label can simply be ignored by the network; an inner product
    with the features makes class-consistency structurally part of the score.
    """
    features = [relu(v) for v in matvec(params['w1'], x, params['b1'])]

    unconditional = matvec(params['w2'], features, params['b2'])[0]
    conditional = sum(e * f for e, f in zip(condition_embedding, features))

    return unconditional + conditional, features


def generator_forward(z, condition_embedding, params):
    """Noise plus condition -> sample.

    The condition is concatenated at the input here, which is the simplest
    mechanism. Conditional normalization is stronger and is what real
    implementations use, but the principle is the same: the generator must
    know what it is being asked for.
    """
    combined = list(z) + list(condition_embedding)
    hidden = [relu(v) for v in matvec(params['w1'], combined, params['b1'])]
    return [math.tanh(v) for v in matvec(params['w2'], hidden, params['b2'])]


def wasserstein_critic_loss(real_scores, fake_scores):
    """E[f(fake)] - E[f(real)], minimized.

    This is the Kantorovich-Rubinstein dual: the SUPREMUM of this difference
    over all 1-Lipschitz functions IS the earth-mover distance between the two
    distributions. Which means the critic value estimates a real distance -
    and is therefore meaningful even when the distributions are far apart,
    where a classifier would simply saturate.
    """
    return (sum(fake_scores) / len(fake_scores)) - (sum(real_scores) / len(real_scores))


def wasserstein_estimate(real_scores, fake_scores):
    """The negated critic loss, which is the distance estimate.

    Unlike any plain GAN loss, THIS CORRELATES WITH SAMPLE QUALITY. It is the
    one adversarial objective in this reference where a falling curve means
    something - provided the critic has converged, because an unconverged
    supremum is not a distance at all.
    """
    return -wasserstein_critic_loss(real_scores, fake_scores)


def interpolate(real, fake, rng):
    """A point on the line between a real and a generated sample.

    The penalty is enforced HERE, not on real or fake data. The reason is
    specific: the optimal critic has unit gradient norm along the transport
    path between the distributions, and penalizing anywhere else constrains a
    region the optimum does not care about.
    """
    epsilon = rng.random()
    return [epsilon * r + (1.0 - epsilon) * f for r, f in zip(real, fake)]


def gradient_penalty(point, condition_embedding, params, epsilon=1e-4):
    """(||grad f(x)||_2 - 1)^2, by finite differences.

    A real implementation gets this from automatic differentiation, and it
    costs a SECOND-ORDER derivative - the gradient of a gradient - which
    roughly doubles the critic's backward pass. Done literally here it is one
    extra critic evaluation per input dimension, which makes visible just how
    much work the constraint costs.
    """
    base, _ = critic_forward(point, condition_embedding, params)

    squared_norm = 0.0
    for dimension in range(len(point)):
        nudged = list(point)
        nudged[dimension] += epsilon
        perturbed, _ = critic_forward(nudged, condition_embedding, params)
        derivative = (perturbed - base) / epsilon
        squared_norm += derivative * derivative

    norm = math.sqrt(squared_norm)
    # Penalized toward ONE, not toward zero. The constraint is that the
    # function is 1-Lipschitz, and the optimal critic attains that bound.
    return (norm - 1.0) ** 2


def critic_step(real_batch, fake_batch, conditions, params, rng):
    """One critic update. Note there is no sigmoid and no cross-entropy."""
    real_scores = []
    fake_scores = []
    penalty = 0.0

    for real, fake, condition in zip(real_batch, fake_batch, conditions):
        real_score, _ = critic_forward(real, condition, params)
        fake_score, _ = critic_forward(fake, condition, params)
        real_scores.append(real_score)
        fake_scores.append(fake_score)

        point = interpolate(real, fake, rng)
        penalty += gradient_penalty(point, condition, params)

    penalty /= len(real_batch)
    return wasserstein_critic_loss(real_scores, fake_scores) + PENALTY_WEIGHT * penalty


def generator_step(fake_scores):
    """-E[f(fake)]: the generator wants the critic to score its output high.

    No substitution is needed here, unlike a plain GAN. The Wasserstein
    objective has a usable gradient everywhere, so the theoretically correct
    form is also the one that works - which is the whole point of changing the
    metric rather than patching the loss.
    """
    return -sum(fake_scores) / len(fake_scores)


def train_round(real_batch, conditions, generator, critic, latent_dim, rng):
    """CRITIC_STEPS critic updates, then ONE generator update.

    The schedule follows from the objective rather than from folklore: the
    critic is estimating a SUPREMUM, and a poorly converged supremum is not a
    distance - so the generator should not move until the critic is close.
    """
    for _ in range(CRITIC_STEPS):
        fakes = [
            generator_forward(
                [rng.gauss(0.0, 1.0) for _ in range(latent_dim)], condition, generator
            )
            for condition in conditions
        ]
        critic_step(real_batch, fakes, conditions, critic, rng)

    fakes = [
        generator_forward(
            [rng.gauss(0.0, 1.0) for _ in range(latent_dim)], condition, generator
        )
        for condition in conditions
    ]
    scores = [critic_forward(fake, c, critic)[0] for fake, c in zip(fakes, conditions)]
    return generator_step(scores)


def per_condition_diversity(samples_by_condition, tolerance=0.1):
    """Distinct outputs PER CONDITION, not overall.

    Rare conditions collapse first, and an aggregate diversity count hides it
    completely: a model covering nine classes well and one not at all looks
    healthy in every aggregate metric. This is the check that finds it.
    """
    counts = {}
    for condition, samples in samples_by_condition.items():
        modes = []
        for sample in samples:
            if not any(
                max(abs(a - b) for a, b in zip(sample, mode)) < tolerance
                for mode in modes
            ):
                modes.append(sample)
        counts[condition] = len(modes)
    return counts
`,
        profile:
          'A full round is CRITIC_STEPS critic passes plus one generator pass, and the finite-difference penalty costs one extra critic evaluation per input dimension. Illustrative, not a measured benchmark: the literal penalty is O(d) times the critic, where a real second-order derivative is a constant factor — which is why this version is unusable past a handful of dimensions.',
      },

      'make-it-right': {
        code: `"""The same modifications, with the constraint and the conditioning as types.

Two things change. The Lipschitz constraint becomes an explicit object that
knows how it is being enforced and how far off it is, because it is a SOFT
stand-in for a hard requirement and the gap is worth measuring rather than
assuming. And conditioning becomes a type that knows which networks it reaches,
because a conditional generator with an unconditional critic has nothing
enforcing that outputs match their condition - and that failure looks like poor
conditioning rather than a missing constraint.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple, Sequence


class ConditioningMechanism(Enum):
    """How the condition reaches a network.

    Not interchangeable. A concatenated label can simply be IGNORED by the
    critic, while a projection — an inner product between the class embedding
    and the features — makes class-consistency structurally part of the score.
    """

    CONCATENATION = 'concat'
    PROJECTION = 'projection'
    CONDITIONAL_NORM = 'conditional-norm'


class UnconditionedCritic(ValueError):
    """Raised when the generator is conditioned and the critic is not.

    Its own type because the consequence is specific and misleading: nothing
    then enforces that an output matches its condition, and the symptom looks
    like weak conditioning rather than a missing constraint.
    """


class BatchDependentCritic(ValueError):
    """Raised when the critic uses batch normalization.

    The gradient penalty assumes the critic is a function of ONE sample.
    Batch statistics make it a function of the whole batch, which invalidates
    the per-sample penalty silently — no error, no warning, just a constraint
    that is not being enforced.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


class UnknownCondition(KeyError):
    """Raised when a condition has no learned embedding.

    A conditional model cannot generalize to an unseen class and there is no
    graceful degradation — the output is arbitrary rather than approximate.
    """


@dataclass(frozen=True)
class LipschitzConstraint:
    """A SOFT stand-in for a hard constraint on a function class.

    The theory requires the critic to be 1-Lipschitz. That is a constraint
    over a function class and cannot be imposed directly, so it becomes a
    penalty on the gradient norm at sampled interpolates. Frozen, and its own
    type, because the substitution is the method's central compromise and
    pretending otherwise is how its guarantees get overstated.
    """

    weight: float = 10.0
    target_norm: float = 1.0
    tolerance: float = 0.1

    def __post_init__(self) -> None:
        if self.weight <= 0.0:
            raise ShapeMismatch('the penalty weight must be positive')

    def penalty(self, gradient_norms: Sequence[float]) -> float:
        """Penalized toward ONE, not toward zero.

        The constraint is that the function is 1-Lipschitz, and the optimal
        critic attains that bound — so pushing the norm toward zero would
        actively prevent the critic from reaching the supremum.
        """
        return self.weight * math.fsum(
            (norm - self.target_norm) ** 2 for norm in gradient_norms
        ) / len(gradient_norms)

    def satisfied(self, gradient_norms: Sequence[float]) -> bool:
        """Whether the soft constraint is actually being met.

        Worth checking rather than assuming: a penalty term that stays far
        from zero means the Lipschitz condition is not holding, and the
        Wasserstein interpretation of the critic value then does not apply.
        """
        mean = math.fsum(gradient_norms) / len(gradient_norms)
        return abs(mean - self.target_norm) < self.tolerance


@dataclass(frozen=True)
class ConditioningSpec:
    """Which networks the condition reaches, and how.

    Frozen because changing it mid-training changes what is being enforced.
    """

    mechanism: ConditioningMechanism
    embedding_dimension: int
    reaches_generator: bool = True
    reaches_critic: bool = True

    def __post_init__(self) -> None:
        # Guard clause for the failure that looks like something else.
        if self.reaches_generator and not self.reaches_critic:
            raise UnconditionedCritic(
                'the generator is conditioned but the critic is not; nothing then '
                'enforces that outputs match their condition'
            )
        if self.embedding_dimension < 1:
            raise ShapeMismatch('the embedding must have at least one dimension')


class ConditionEmbedding:
    """A learned vector per condition, with unknown conditions refused.

    A conditional model cannot generalize to an unseen class, so returning a
    zero vector would be worse than failing: downstream it reads as a specific
    and meaningful condition rather than as a missing one.
    """

    def __init__(self, vocabulary: Sequence[str], dimension: int, seed: int = 23) -> None:
        rng = random.Random(seed)
        scale = 1.0 / math.sqrt(dimension)
        self._table = {
            name: [rng.gauss(0.0, scale) for _ in range(dimension)]
            for name in vocabulary
        }
        self._dimension = dimension

    def __getitem__(self, condition: str) -> list[float]:
        if condition not in self._table:
            raise UnknownCondition(
                f'{condition!r} has no learned embedding; a conditional model cannot '
                'generalize to an unseen class'
            )
        return self._table[condition]

    @property
    def dimension(self) -> int:
        return self._dimension


class CriticOutput(NamedTuple):
    """Score AND features.

    The features come back because projection conditioning needs them: the
    conditional term is an inner product between the class embedding and the
    critic's features, so computing the score alone would force a second pass.
    """

    score: float
    features: list[float]


class Critic:
    """Scores rather than classifies. No sigmoid anywhere."""

    def __init__(
        self,
        weights: dict[str, list],
        spec: ConditioningSpec,
        normalization: str = 'layer',
    ) -> None:
        # Guard clause for the silent failure.
        if normalization == 'batch':
            raise BatchDependentCritic(
                'the gradient penalty assumes the critic is a function of one '
                'sample; batch statistics make it a function of the batch and the '
                'penalty stops enforcing anything'
            )
        self._weights = weights
        self._spec = spec

    def __call__(self, x: Sequence[float], condition: Sequence[float]) -> CriticOutput:
        features = [
            max(0.0, bias + math.fsum(w * v for w, v in zip(row, x)))
            for row, bias in zip(self._weights['w1'], self._weights['b1'])
        ]

        unconditional = self._weights['b2'][0] + math.fsum(
            w * f for w, f in zip(self._weights['w2'][0], features)
        )

        if self._spec.mechanism is ConditioningMechanism.PROJECTION:
            # An inner product with the features, not a concatenated input:
            # this cannot be ignored the way a concatenated label can.
            conditional = math.fsum(e * f for e, f in zip(condition, features))
            return CriticOutput(score=unconditional + conditional, features=features)

        return CriticOutput(score=unconditional, features=features)


def interpolate(
    real: Sequence[float], fake: Sequence[float], rng: random.Random
) -> list[float]:
    """A point on the line between a real and a generated sample.

    The penalty is enforced HERE, not on real or fake data. The reason is
    specific: the optimal critic has unit gradient norm along the transport
    path between the distributions, and penalizing elsewhere constrains a
    region the optimum does not care about.
    """
    epsilon = rng.random()
    return [epsilon * r + (1.0 - epsilon) * f for r, f in zip(real, fake)]


class RoundResult(NamedTuple):
    """The distance estimate AND whether it can be trusted.

    Bundled because the Wasserstein estimate is only a distance when the
    critic has approximated the supremum — an under-trained critic produces a
    number that is smooth, plausible and meaningless, and reporting it without
    the caveat is how that mistake propagates.
    """

    wasserstein_estimate: float
    penalty: float
    constraint_satisfied: bool
    critic_steps: int

    def trustworthy(self, minimum_steps: int = 5) -> bool:
        return self.constraint_satisfied and self.critic_steps >= minimum_steps


def critic_loss(
    real_scores: Sequence[float],
    fake_scores: Sequence[float],
    gradient_norms: Sequence[float],
    constraint: LipschitzConstraint,
) -> tuple[float, float]:
    """E[f(fake)] - E[f(real)] plus the penalty.

    The first part is the Kantorovich-Rubinstein dual: the SUPREMUM of that
    difference over all 1-Lipschitz functions IS the earth-mover distance. So
    the critic value estimates a real distance, which is why it stays
    meaningful when the distributions do not overlap — precisely where a
    classifier saturates.
    """
    if not real_scores or not fake_scores:
        raise ShapeMismatch('both score sets must be non-empty')

    wasserstein = math.fsum(fake_scores) / len(fake_scores) - math.fsum(real_scores) / len(
        real_scores
    )
    penalty = constraint.penalty(gradient_norms)
    return wasserstein + penalty, -wasserstein


@dataclass
class ConditionalDiversityMonitor:
    """Distinct outputs PER CONDITION, not overall.

    Rare conditions collapse first, and an aggregate count hides it
    completely: a model covering nine classes well and one not at all looks
    healthy in every aggregate metric.
    """

    history: dict[str, list[int]] = field(default_factory=dict)

    def record(
        self, condition: str, samples: Sequence[Sequence[float]], tolerance: float = 0.1
    ) -> int:
        modes: list[Sequence[float]] = []
        for sample in samples:
            if not any(
                max(abs(a - b) for a, b in zip(sample, mode)) < tolerance
                for mode in modes
            ):
                modes.append(sample)
        self.history.setdefault(condition, []).append(len(modes))
        return len(modes)

    def collapsed_conditions(self, minimum: int) -> list[str]:
        """Which conditions have collapsed, not whether any have."""
        return [
            condition
            for condition, counts in self.history.items()
            if counts and counts[-1] < minimum
        ]
`,
        rationale:
          'Two changes. The Lipschitz constraint becomes an explicit frozen object that knows its penalty weight, its target norm and whether it is actually being satisfied — because it is a soft stand-in for a hard requirement over a function class, and the gap between the two is the method’s central compromise rather than an implementation detail. Making it a type with a satisfied predicate means the question "is the Wasserstein interpretation even applicable right now" can be asked, which it otherwise never is. The second is that conditioning becomes a spec that knows which networks it reaches, with the generator-conditioned-but-critic-not case refused outright: nothing then enforces that outputs match their condition, and the symptom looks like weak conditioning rather than a missing constraint. Around those, the mechanism becomes an enum because a concatenated label can be ignored by the critic while a projection cannot, batch normalization in the critic is refused because it silently invalidates a per-sample penalty, an unknown condition raises rather than returning a zero vector that reads downstream as a specific condition, and diversity is tracked per condition because rare ones collapse first and aggregates hide it.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: returning critic features alongside the score avoids a second forward pass for the projection term, which on five critic steps per round is a measurable saving.',
      },

      'make-it-fast': {
        code: `"""Batched, with the penalty as a proper directional derivative.

The structural change: the literal gradient penalty computed one finite
difference PER INPUT DIMENSION, which made the constraint cost O(d) critic
evaluations. The norm of a gradient does not need the gradient computed
componentwise - and in a real implementation it comes from reverse-mode
automatic differentiation at constant cost. Here it is a directional
derivative along a random direction, which estimates the same quantity in TWO
evaluations regardless of dimension.

Three changes:
  1. Both networks batch into GEMMs.
  2. The penalty becomes O(1) critic evaluations rather than O(d).
  3. Projection conditioning is one row-wise dot product, computed alongside
     the unconditional score rather than in a second pass.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


class BatchedCritic:
    """Scores rather than classifies. No sigmoid anywhere.

    Layer normalization, never batch normalization: the gradient penalty
    assumes the critic is a function of ONE sample, and batch statistics make
    it a function of the whole batch, which invalidates the penalty silently.
    """

    def __init__(self, w1: NDArray[np.float32], b1: NDArray[np.float32],
                 w2: NDArray[np.float32], b2: NDArray[np.float32]) -> None:
        self._w1 = np.ascontiguousarray(w1, dtype=FLOAT)
        self._b1 = np.ascontiguousarray(b1, dtype=FLOAT)
        self._w2 = np.ascontiguousarray(w2, dtype=FLOAT)
        self._b2 = np.ascontiguousarray(b2, dtype=FLOAT)

    def __call__(
        self, x: NDArray[np.float32], condition: NDArray[np.float32]
    ) -> NDArray[np.float32]:
        """x is (batch, dim), condition is (batch, embedding). Returns scores.

        The conditional term is a ROW-WISE dot product between each sample's
        class embedding and its own features — einsum over matching rows, not
        a matmul, which would build a full batch-by-batch outer product and
        throw away everything off the diagonal.
        """
        features = x @ self._w1
        features += self._b1
        # In-place ReLU: the feature matrix is the widest tensor here.
        np.maximum(features, 0.0, out=features)

        unconditional = features @ self._w2
        unconditional += self._b2

        # Projection conditioning, computed in the same pass. An inner product
        # with the features cannot be ignored the way a concatenated label can.
        conditional = np.einsum('ij,ij->i', features, condition, optimize=True)
        return unconditional.ravel() + conditional


def interpolate(
    real: NDArray[np.float32], fake: NDArray[np.float32], rng: np.random.Generator
) -> NDArray[np.float32]:
    """Points on the lines between real and generated samples.

    One epsilon PER SAMPLE, broadcast over the feature axis — a single shared
    epsilon would sample a one-dimensional family of interpolates rather than
    covering the region between the distributions.

    The penalty is enforced here and not on real or fake data, because the
    optimal critic has unit gradient norm along the transport path and
    penalizing elsewhere constrains a region the optimum does not care about.
    """
    epsilon = rng.random((real.shape[0], 1), dtype=FLOAT)
    return epsilon * real + (1.0 - epsilon) * fake


def gradient_penalty(
    critic: BatchedCritic,
    points: NDArray[np.float32],
    condition: NDArray[np.float32],
    rng: np.random.Generator,
    weight: float = 10.0,
    step: float = 1e-3,
) -> tuple[float, NDArray[np.float32]]:
    """(||grad f(x)||_2 - 1)^2, in TWO critic evaluations regardless of dim.

    The literal version took one finite difference per input dimension, which
    made the constraint cost O(d) critic passes. A directional derivative
    along a random unit direction estimates the gradient norm in constant
    cost: the expected squared directional derivative over random unit
    directions is the squared gradient norm over d, so scaling recovers it.

    A production implementation gets the exact gradient from reverse-mode
    automatic differentiation — also constant cost, and exact. This form is
    here because it makes the O(1)-versus-O(d) point visible.
    """
    direction = rng.standard_normal(points.shape, dtype=FLOAT)
    # Normalize per row: the estimator requires unit directions.
    direction /= np.linalg.norm(direction, axis=1, keepdims=True)

    base = critic(points, condition)
    nudged = critic(points + FLOAT(step) * direction, condition)
    directional = (nudged - base) / FLOAT(step)

    dimension = points.shape[1]
    norms = np.abs(directional) * np.sqrt(dimension, dtype=FLOAT)

    # Penalized toward ONE, not toward zero: the constraint is that the
    # function is 1-Lipschitz, and the optimal critic attains that bound.
    deviation = norms - 1.0
    penalty = float(weight * np.einsum('i,i->', deviation, deviation, optimize=True) / len(norms))
    return penalty, norms


def critic_loss(
    real_scores: NDArray[np.float32],
    fake_scores: NDArray[np.float32],
    penalty: float,
) -> tuple[float, float]:
    """E[f(fake)] - E[f(real)] plus the penalty, and the distance estimate.

    The first part is the Kantorovich-Rubinstein dual: the SUPREMUM of that
    difference over all 1-Lipschitz functions IS the earth-mover distance. The
    critic value therefore estimates a real distance, which is why it stays
    meaningful when the distributions do not overlap — where a classifier
    saturates and its gradient dies.
    """
    wasserstein = float(fake_scores.mean() - real_scores.mean())
    return wasserstein + penalty, -wasserstein


def per_condition_diversity(
    samples: NDArray[np.float32],
    conditions: NDArray[np.int32],
    tolerance: float = 0.1,
) -> dict[int, int]:
    """Distinct outputs PER CONDITION, in one pairwise pass per condition.

    Rare conditions collapse first, and an aggregate count hides it
    completely: a model covering nine classes well and one not at all looks
    healthy in every aggregate metric.

    ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2, so each condition's pairwise
    matrix is one GEMM rather than a loop over pairs.
    """
    counts: dict[int, int] = {}

    for condition in np.unique(conditions):
        block = samples[conditions == condition]
        if len(block) < 2:
            counts[int(condition)] = len(block)
            continue

        norms = np.einsum('ij,ij->i', block, block, optimize=True)
        distances = block @ block.T
        distances *= -2.0
        distances += norms
        distances += norms[:, None]

        close = distances < tolerance * tolerance
        assigned = np.zeros(len(block), dtype=bool)
        modes = 0
        for index in range(len(block)):
            if assigned[index]:
                continue
            assigned |= close[index]
            modes += 1
        counts[int(condition)] = modes

    return counts


def constraint_satisfied(norms: NDArray[np.float32], tolerance: float = 0.1) -> bool:
    """Whether the soft constraint is actually being met.

    Worth checking rather than assuming: a mean gradient norm far from one
    means the Lipschitz condition is not holding, and the Wasserstein
    interpretation of the critic value then simply does not apply — the number
    is smooth, plausible and not a distance.
    """
    return bool(abs(float(norms.mean()) - 1.0) < tolerance)
`,
        rationale:
          'The structural change is in the penalty, and it is asymptotic rather than constant. The literal version computed one finite difference per input dimension, making the Lipschitz constraint cost O(d) critic evaluations — which is why that version is unusable past a handful of dimensions. But the norm of a gradient does not require the gradient componentwise: a directional derivative along a random unit direction estimates it in two evaluations regardless of dimension, because the expected squared directional derivative over random unit directions is the squared gradient norm divided by d. A production implementation gets the exact gradient from reverse-mode differentiation at the same constant cost, and this form is written out because it makes the O(1)-versus-O(d) point visible. Around that, both networks become GEMMs with in-place activations, and projection conditioning is computed in the same pass as the unconditional score as a row-wise einsum rather than a matmul — a matmul would build a full batch-by-batch outer product and discard everything off the diagonal. The interpolation draws one epsilon per sample rather than one per batch, since a shared coefficient would sample a one-dimensional family rather than covering the region between the distributions.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Both networks are GEMMs over the batch, the projection term is a row-wise einsum computed alongside the unconditional score, and each per-condition diversity check is a single pairwise product.',
            tradeoff: 'The row-wise einsum for projection is a much smaller operation than the GEMM feeding it, so its call overhead is a meaningful share of the conditional path on small batches — a fused kernel would avoid that and is not expressible here.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The penalty, the interpolation and both score computations cover the whole batch at once, leaving Python loops only over conditions in the diversity check.',
            tradeoff: 'The directional-derivative penalty is a stochastic estimate of the gradient norm, so it has variance the exact version does not — the constraint is enforced in expectation rather than per sample, which is a second softening on top of the one the penalty already represents.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The ReLU, the bias adds and the interpolation scaling all write through existing buffers, so a critic pass allocates only its score vector.',
            tradeoff: 'The feature matrix is destroyed by the in-place ReLU, so diagnosing a dead critic layer — every unit clamped at zero, no gradient flowing — needs an unfused pass.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 contiguous weights keep every product on the BLAS fast path, and the per-row direction normalization reads contiguously.',
            tradeoff: 'float32 differencing in the directional derivative loses precision exactly where the penalty is measured, since the step size must be small enough to approximate a derivative and large enough not to be swamped by rounding — the exact gradient has no such tension.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'The penalty drops from O(d) critic evaluations to two, and every pass becomes a GEMM over the batch. Illustrative, not a measured benchmark: with five critic steps per round the penalty was previously the dominant cost by a wide margin, and this is the change that makes the method affordable at realistic dimensions.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// WGAN-GP and conditional generation, transcribed the way the papers read.
//
// Two independent modifications to the adversarial setup:
//
//   1. WASSERSTEIN: the second network SCORES rather than classifies. No
//      sigmoid, no cross-entropy - the critic value estimates a distance,
//      which stays meaningful even when the two distributions do not overlap.
//      That is exactly where a classifier saturates and its gradient dies.
//
//   2. CONDITIONING: both networks are told what they are looking at. A
//      generator given a label learns one conditional distribution per label
//      rather than one blurred mixture.
//
// The Lipschitz constraint the theory requires cannot be imposed directly, so
// it becomes a PENALTY on the gradient norm at interpolated points - a soft
// stand-in for a hard constraint, and the substitution is worth naming.
//
// Vector-of-vector, plain loops.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

constexpr double kPenaltyWeight = 10.0;
constexpr std::size_t kCriticSteps = 5;

struct MlpParams {
  Matrix w1;
  Vector b1;
  Matrix w2;
  Vector b2;
};

double Relu(double value) { return value > 0.0 ? value : 0.0; }

Vector MatVec(const Matrix& weight, const Vector& vector, const Vector& bias) {
  Vector output(weight.size(), 0.0);
  for (std::size_t i = 0; i < weight.size(); ++i) {
    double total = bias[i];
    for (std::size_t j = 0; j < vector.size(); ++j) {
      total += weight[i][j] * vector[j];
    }
    output[i] = total;
  }
  return output;
}

// Sample -> SCORE. Unbounded, with no sigmoid anywhere.
//
// The conditioning uses PROJECTION rather than concatenation: an inner product
// between the class embedding and the critic's features. A concatenated label
// can simply be ignored by the network; an inner product with the features
// makes class-consistency structurally part of the score.
double CriticForward(const Vector& x, const Vector& condition, const MlpParams& params,
                     Vector* features) {
  *features = MatVec(params.w1, x, params.b1);
  for (std::size_t i = 0; i < features->size(); ++i) {
    (*features)[i] = Relu((*features)[i]);
  }

  double unconditional = params.b2[0];
  for (std::size_t i = 0; i < features->size(); ++i) {
    unconditional += params.w2[0][i] * (*features)[i];
  }

  double conditional = 0.0;
  for (std::size_t i = 0; i < condition.size() && i < features->size(); ++i) {
    conditional += condition[i] * (*features)[i];
  }

  return unconditional + conditional;
}

// Noise plus condition -> sample.
//
// The condition is concatenated at the input here, the simplest mechanism.
// Conditional normalization is stronger and is what real implementations use,
// but the principle is the same: the generator must know what it is asked for.
Vector GeneratorForward(const Vector& z, const Vector& condition,
                        const MlpParams& params) {
  Vector combined = z;
  combined.insert(combined.end(), condition.begin(), condition.end());

  Vector hidden = MatVec(params.w1, combined, params.b1);
  for (std::size_t i = 0; i < hidden.size(); ++i) {
    hidden[i] = Relu(hidden[i]);
  }

  Vector output = MatVec(params.w2, hidden, params.b2);
  for (std::size_t i = 0; i < output.size(); ++i) {
    output[i] = std::tanh(output[i]);
  }
  return output;
}

// E[f(fake)] - E[f(real)], minimized.
//
// This is the Kantorovich-Rubinstein dual: the SUPREMUM of this difference
// over all 1-Lipschitz functions IS the earth-mover distance between the two
// distributions. Which means the critic value estimates a real distance - and
// is therefore meaningful even when the distributions are far apart, where a
// classifier would simply saturate.
double WassersteinCriticLoss(const Vector& real_scores, const Vector& fake_scores) {
  double real = 0.0;
  for (std::size_t i = 0; i < real_scores.size(); ++i) {
    real += real_scores[i];
  }
  double fake = 0.0;
  for (std::size_t i = 0; i < fake_scores.size(); ++i) {
    fake += fake_scores[i];
  }
  return fake / static_cast<double>(fake_scores.size()) -
         real / static_cast<double>(real_scores.size());
}

// A point on the line between a real and a generated sample.
//
// The penalty is enforced HERE, not on real or fake data. The reason is
// specific: the optimal critic has unit gradient norm along the transport path
// between the distributions, and penalizing anywhere else constrains a region
// the optimum does not care about.
Vector Interpolate(const Vector& real, const Vector& fake, std::mt19937& rng) {
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  const double epsilon = uniform(rng);

  Vector point(real.size(), 0.0);
  for (std::size_t i = 0; i < real.size(); ++i) {
    point[i] = epsilon * real[i] + (1.0 - epsilon) * fake[i];
  }
  return point;
}

// (||grad f(x)||_2 - 1)^2, by finite differences.
//
// A real implementation gets this from automatic differentiation, and it costs
// a SECOND-ORDER derivative - the gradient of a gradient - which roughly
// doubles the critic's backward pass. Done literally here it is one extra
// critic evaluation per input dimension, which makes visible just how much
// work the constraint costs.
double GradientPenalty(const Vector& point, const Vector& condition,
                       const MlpParams& params, double epsilon = 1e-4) {
  Vector features;
  const double base = CriticForward(point, condition, params, &features);

  double squared_norm = 0.0;
  for (std::size_t dimension = 0; dimension < point.size(); ++dimension) {
    Vector nudged = point;
    nudged[dimension] += epsilon;
    const double perturbed = CriticForward(nudged, condition, params, &features);
    const double derivative = (perturbed - base) / epsilon;
    squared_norm += derivative * derivative;
  }

  // Penalized toward ONE, not toward zero. The constraint is that the function
  // is 1-Lipschitz, and the optimal critic attains that bound.
  const double norm = std::sqrt(squared_norm);
  return (norm - 1.0) * (norm - 1.0);
}

// -E[f(fake)]: the generator wants the critic to score its output high.
//
// No substitution is needed here, unlike a plain GAN. The Wasserstein
// objective has a usable gradient everywhere, so the theoretically correct
// form is also the one that works - which is the whole point of changing the
// metric rather than patching the loss.
double GeneratorLoss(const Vector& fake_scores) {
  double total = 0.0;
  for (std::size_t i = 0; i < fake_scores.size(); ++i) {
    total += fake_scores[i];
  }
  return -total / static_cast<double>(fake_scores.size());
}

// Distinct outputs PER CONDITION, not overall.
//
// Rare conditions collapse first, and an aggregate diversity count hides it
// completely: a model covering nine classes well and one not at all looks
// healthy in every aggregate metric. This is the check that finds it.
std::size_t ConditionDiversity(const Matrix& samples, double tolerance = 0.1) {
  Matrix modes;
  for (std::size_t i = 0; i < samples.size(); ++i) {
    bool matched = false;
    for (std::size_t m = 0; m < modes.size() && !matched; ++m) {
      double furthest = 0.0;
      for (std::size_t d = 0; d < samples[i].size(); ++d) {
        furthest = std::max(furthest, std::abs(samples[i][d] - modes[m][d]));
      }
      matched = furthest < tolerance;
    }
    if (!matched) {
      modes.push_back(samples[i]);
    }
  }
  return modes.size();
}
`,
        profile:
          'A full round is kCriticSteps critic passes plus one generator pass, and the finite-difference penalty costs one extra critic evaluation per input dimension. Illustrative, not a measured benchmark: the literal penalty is O(d) times the critic, where a real second-order derivative is a constant factor — which is why this version is unusable past a handful of dimensions.',
      },

      'make-it-right': {
        code: `// The same modifications, with the constraint and the conditioning as types.
//
// Two things change. The Lipschitz constraint becomes an explicit object that
// knows how it is being enforced and how far off it is, because it is a SOFT
// stand-in for a hard requirement and the gap is worth measuring rather than
// assuming. And conditioning becomes a type that knows which networks it
// reaches, because a conditional generator with an unconditional critic has
// nothing enforcing that outputs match their condition - and that failure
// looks like poor conditioning rather than a missing constraint.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace wgan {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the consequence is specific and misleading: nothing
// then enforces that an output matches its condition, and the symptom looks
// like weak conditioning rather than a missing constraint.
class UnconditionedCritic : public std::logic_error {
 public:
  explicit UnconditionedCritic(const std::string& what) : std::logic_error(what) {}
};

// The gradient penalty assumes the critic is a function of ONE sample. Batch
// statistics make it a function of the whole batch, which invalidates the
// per-sample penalty silently - no error, no warning, just a constraint that
// is not being enforced.
class BatchDependentCritic : public std::invalid_argument {
 public:
  explicit BatchDependentCritic(const std::string& what)
      : std::invalid_argument(what) {}
};

// A conditional model cannot generalize to an unseen class and there is no
// graceful degradation - the output is arbitrary rather than approximate.
class UnknownCondition : public std::out_of_range {
 public:
  explicit UnknownCondition(const std::string& what) : std::out_of_range(what) {}
};

// How the condition reaches a network.
//
// Not interchangeable. A concatenated label can simply be IGNORED by the
// critic, while a projection - an inner product between the class embedding
// and the features - makes class-consistency structurally part of the score.
enum class ConditioningMechanism { kConcatenation, kProjection, kConditionalNorm };

// A SOFT stand-in for a hard constraint on a function class.
//
// The theory requires the critic to be 1-Lipschitz. That is a constraint over
// a function class and cannot be imposed directly, so it becomes a penalty on
// the gradient norm at sampled interpolates. Its own type because the
// substitution is the method's central compromise, and pretending otherwise is
// how its guarantees get overstated.
class LipschitzConstraint {
 public:
  explicit LipschitzConstraint(double weight = 10.0, double target = 1.0,
                               double tolerance = 0.1)
      : weight_(weight), target_(target), tolerance_(tolerance) {
    if (weight <= 0.0) {
      throw ShapeMismatch("the penalty weight must be positive");
    }
  }

  // Penalized toward ONE, not toward zero. The constraint is that the function
  // is 1-Lipschitz, and the optimal critic attains that bound - pushing the
  // norm toward zero would actively prevent reaching the supremum.
  [[nodiscard]] double Penalty(std::span<const double> gradient_norms) const {
    double total = 0.0;
    for (const double norm : gradient_norms) {
      total += (norm - target_) * (norm - target_);
    }
    return weight_ * total / static_cast<double>(gradient_norms.size());
  }

  // Whether the soft constraint is actually being met.
  //
  // Worth checking rather than assuming: a penalty term staying far from zero
  // means the Lipschitz condition is not holding, and the Wasserstein
  // interpretation of the critic value then does not apply.
  [[nodiscard]] bool Satisfied(std::span<const double> gradient_norms) const {
    const double mean =
        std::accumulate(gradient_norms.begin(), gradient_norms.end(), 0.0) /
        static_cast<double>(gradient_norms.size());
    return std::abs(mean - target_) < tolerance_;
  }

 private:
  double weight_;
  double target_;
  double tolerance_;
};

// Which networks the condition reaches, and how.
struct ConditioningSpec {
  ConditioningMechanism mechanism{ConditioningMechanism::kProjection};
  std::size_t embedding_dimension{};
  bool reaches_generator{true};
  bool reaches_critic{true};

  // Guard clause for the failure that looks like something else.
  void Validate() const {
    if (reaches_generator && !reaches_critic) {
      throw UnconditionedCritic(
          "the generator is conditioned but the critic is not; nothing then "
          "enforces that outputs match their condition");
    }
    if (embedding_dimension == 0) {
      throw ShapeMismatch("the embedding must have at least one dimension");
    }
  }
};

// A learned vector per condition, with unknown conditions refused.
//
// A conditional model cannot generalize to an unseen class, so returning a
// zero vector would be worse than failing: downstream it reads as a specific
// and meaningful condition rather than as a missing one.
class ConditionEmbedding {
 public:
  ConditionEmbedding(const std::vector<std::string>& vocabulary, std::size_t dimension,
                     unsigned seed)
      : dimension_(dimension) {
    std::mt19937 rng(seed);
    std::normal_distribution<double> normal(0.0, 1.0 / std::sqrt(static_cast<double>(dimension)));
    for (const std::string& name : vocabulary) {
      std::vector<double> vector(dimension, 0.0);
      for (double& value : vector) {
        value = normal(rng);
      }
      table_.emplace(name, std::move(vector));
    }
  }

  [[nodiscard]] std::span<const double> operator[](const std::string& condition) const {
    const auto found = table_.find(condition);
    if (found == table_.end()) {
      throw UnknownCondition(
          "condition has no learned embedding; a conditional model cannot "
          "generalize to an unseen class");
    }
    return found->second;
  }

  [[nodiscard]] std::size_t dimension() const noexcept { return dimension_; }

 private:
  std::size_t dimension_;
  std::unordered_map<std::string, std::vector<double>> table_;
};

// Score AND features.
//
// The features come back because projection conditioning needs them: the
// conditional term is an inner product between the class embedding and the
// critic's features, so computing the score alone would force a second pass.
struct CriticOutput {
  double score{};
  std::span<const double> features;
};

// Scores rather than classifies. No sigmoid anywhere.
class Critic {
 public:
  Critic(std::size_t input_dim, std::size_t feature_dim, ConditioningSpec spec,
         std::string_view normalization)
      : spec_(spec), input_dim_(input_dim), feature_dim_(feature_dim),
        w1_(input_dim * feature_dim, 0.0), b1_(feature_dim, 0.0),
        w2_(feature_dim, 0.0), features_(feature_dim, 0.0) {
    spec_.Validate();
    // Guard clause for the silent failure.
    if (normalization == "batch") {
      throw BatchDependentCritic(
          "the gradient penalty assumes the critic is a function of one sample; "
          "batch statistics make it a function of the batch and the penalty stops "
          "enforcing anything");
    }
  }

  [[nodiscard]] CriticOutput operator()(std::span<const double> x,
                                        std::span<const double> condition) {
    std::copy(b1_.begin(), b1_.end(), features_.begin());
    for (std::size_t j = 0; j < input_dim_; ++j) {
      const double value = x[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = w1_.data() + j * feature_dim_;
      for (std::size_t i = 0; i < feature_dim_; ++i) {
        features_[i] += value * row[i];
      }
    }
    for (double& value : features_) {
      value = value > 0.0 ? value : 0.0;
    }

    double score = b2_;
    for (std::size_t i = 0; i < feature_dim_; ++i) {
      score += w2_[i] * features_[i];
    }

    if (spec_.mechanism == ConditioningMechanism::kProjection) {
      // An inner product with the features, not a concatenated input: this
      // cannot be ignored the way a concatenated label can.
      for (std::size_t i = 0; i < condition.size() && i < feature_dim_; ++i) {
        score += condition[i] * features_[i];
      }
    }

    return CriticOutput{score, features_};
  }

 private:
  ConditioningSpec spec_;
  std::size_t input_dim_;
  std::size_t feature_dim_;
  std::vector<double> w1_;  // rule of zero: owning members only
  std::vector<double> b1_;
  std::vector<double> w2_;
  double b2_{0.0};
  std::vector<double> features_;
};

// The distance estimate AND whether it can be trusted.
//
// Bundled because the Wasserstein estimate is only a distance when the critic
// has approximated the supremum - an under-trained critic produces a number
// that is smooth, plausible and meaningless, and reporting it without the
// caveat is how that mistake propagates.
struct RoundResult {
  double wasserstein_estimate{};
  double penalty{};
  bool constraint_satisfied{};
  std::size_t critic_steps{};

  [[nodiscard]] bool Trustworthy(std::size_t minimum_steps = 5) const noexcept {
    return constraint_satisfied && critic_steps >= minimum_steps;
  }
};

// E[f(fake)] - E[f(real)] plus the penalty.
//
// The first part is the Kantorovich-Rubinstein dual: the SUPREMUM of that
// difference over all 1-Lipschitz functions IS the earth-mover distance. So
// the critic value estimates a real distance, which is why it stays meaningful
// when the distributions do not overlap - precisely where a classifier
// saturates.
[[nodiscard]] inline RoundResult CriticLoss(std::span<const double> real_scores,
                                            std::span<const double> fake_scores,
                                            std::span<const double> gradient_norms,
                                            const LipschitzConstraint& constraint,
                                            std::size_t critic_steps) {
  if (real_scores.empty() || fake_scores.empty()) {
    throw ShapeMismatch("both score sets must be non-empty");
  }

  const double real =
      std::accumulate(real_scores.begin(), real_scores.end(), 0.0) /
      static_cast<double>(real_scores.size());
  const double fake =
      std::accumulate(fake_scores.begin(), fake_scores.end(), 0.0) /
      static_cast<double>(fake_scores.size());

  RoundResult result;
  result.wasserstein_estimate = real - fake;
  result.penalty = constraint.Penalty(gradient_norms);
  result.constraint_satisfied = constraint.Satisfied(gradient_norms);
  result.critic_steps = critic_steps;
  return result;
}

}  // namespace wgan
`,
        rationale:
          'Two changes. The Lipschitz constraint becomes an explicit object that knows its weight, its target norm and whether it is actually being satisfied — because it is a soft stand-in for a hard requirement over a function class, and the gap between the two is the method’s central compromise rather than an implementation detail. Making it a type with a satisfied predicate means the question "is the Wasserstein interpretation even applicable right now" can be asked, which it otherwise never is; the round result then bundles the estimate with a trustworthiness flag, since an under-trained critic produces a number that is smooth, plausible and not a distance. The second is that conditioning becomes a spec that knows which networks it reaches, with the generator-conditioned-but-critic-not case refused outright: nothing then enforces that outputs match their condition, and the symptom looks like weak conditioning rather than a missing constraint. Around those, the mechanism becomes an enum because a concatenated label can be ignored while a projection cannot, batch normalization in the critic is refused because it silently invalidates a per-sample penalty, an unknown condition throws rather than returning a zero vector that reads downstream as a specific condition, and the critic owns its feature scratch so the projection term needs no second pass.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics with no per-call allocation, and the projection term reuses features the score pass already computed. Illustrative, not a measured benchmark: on five critic steps per round, avoiding a second forward pass for the conditional term is a measurable saving.',
      },

      'make-it-fast': {
        code: `// Batched, with the penalty as a proper directional derivative.
//
// The structural change: the literal gradient penalty computed one finite
// difference PER INPUT DIMENSION, which made the constraint cost O(d) critic
// evaluations. The norm of a gradient does not need the gradient computed
// componentwise - and in a real implementation it comes from reverse-mode
// automatic differentiation at constant cost. Here it is a directional
// derivative along a random direction, which estimates the same quantity in
// TWO evaluations regardless of dimension.
//
// Three changes:
//   1. Both networks batch into GEMMs.
//   2. The penalty becomes O(1) critic evaluations rather than O(d).
//   3. Projection conditioning is one row-wise dot product, computed alongside
//      the unconditional score rather than in a second pass.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace wgan {

// Scores rather than classifies. No sigmoid anywhere.
//
// Layer normalization, never batch normalization: the gradient penalty assumes
// the critic is a function of ONE sample, and batch statistics make it a
// function of the whole batch, which invalidates the penalty silently.
class BatchedCritic {
 public:
  BatchedCritic(int max_rows, int input_dim, int feature_dim)
      : input_dim_(input_dim), feature_dim_(feature_dim),
        w1_(static_cast<std::size_t>(input_dim) * feature_dim),
        b1_(static_cast<std::size_t>(feature_dim)),
        w2_(static_cast<std::size_t>(feature_dim)),
        features_(static_cast<std::size_t>(max_rows) * feature_dim) {}

  // x is (rows x input_dim), condition is (rows x feature_dim). Scores out.
  void operator()(const float* __restrict x, const float* __restrict condition,
                  int rows, float* __restrict scores) {
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, feature_dim_,
                input_dim_, 1.0F, x, input_dim_, w1_.data(), feature_dim_, 0.0F,
                features_.data(), feature_dim_);

    // Fused bias, ReLU, unconditional score and projection term in ONE pass
    // over each row. The conditional term is a row-wise dot product between a
    // sample's own embedding and its own features - computing it separately
    // would re-read the feature matrix for nothing.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = features_.data() + static_cast<std::size_t>(r) * feature_dim_;
      const float* embedding = condition + static_cast<std::size_t>(r) * feature_dim_;

      float unconditional = b2_;
      float conditional = 0.0F;
      for (int i = 0; i < feature_dim_; ++i) {
        const float value = row[i] + b1_[static_cast<std::size_t>(i)];
        const float activated = value > 0.0F ? value : 0.0F;
        row[i] = activated;
        unconditional += w2_[static_cast<std::size_t>(i)] * activated;
        conditional += embedding[i] * activated;
      }
      scores[r] = unconditional + conditional;
    }
  }

 private:
  int input_dim_;
  int feature_dim_;
  std::vector<float> w1_;
  std::vector<float> b1_;
  std::vector<float> w2_;
  float b2_{0.0F};
  std::vector<float> features_;
};

// Points on the lines between real and generated samples.
//
// One epsilon PER SAMPLE, not one per batch: a single shared coefficient would
// sample a one-dimensional family of interpolates rather than covering the
// region between the distributions.
//
// The penalty is enforced here and not on real or fake data, because the
// optimal critic has unit gradient norm along the transport path and
// penalizing elsewhere constrains a region the optimum does not care about.
inline void Interpolate(const float* __restrict real, const float* __restrict fake,
                        int rows, int dimension, uint64_t seed,
                        float* __restrict out) {
#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    uint64_t state = seed + static_cast<uint64_t>(r) * 0x9E3779B97F4A7C15ULL;
    state ^= state << 13;
    state ^= state >> 7;
    state ^= state << 17;
    const float epsilon = static_cast<float>(state >> 40) * (1.0F / 16777216.0F);

    const float* real_row = real + static_cast<std::size_t>(r) * dimension;
    const float* fake_row = fake + static_cast<std::size_t>(r) * dimension;
    float* target = out + static_cast<std::size_t>(r) * dimension;
    for (int d = 0; d < dimension; ++d) {
      target[d] = epsilon * real_row[d] + (1.0F - epsilon) * fake_row[d];
    }
  }
}

// (||grad f(x)||_2 - 1)^2, in TWO critic evaluations regardless of dimension.
//
// The literal version took one finite difference per input dimension, which
// made the constraint cost O(d) critic passes. A directional derivative along
// a random unit direction estimates the gradient norm in constant cost: the
// expected squared directional derivative over random unit directions is the
// squared gradient norm over d, so scaling recovers it.
//
// A production implementation gets the exact gradient from reverse-mode
// automatic differentiation - also constant cost, and exact. This form is here
// because it makes the O(1)-versus-O(d) point visible.
inline double GradientPenalty(BatchedCritic& critic, const float* __restrict points,
                              const float* __restrict condition, int rows, int dimension,
                              uint64_t seed, double weight,
                              std::vector<float>* scratch,
                              std::vector<float>* norms) {
  scratch->resize(static_cast<std::size_t>(rows) * dimension);
  std::vector<float> base(static_cast<std::size_t>(rows));
  std::vector<float> nudged(static_cast<std::size_t>(rows));
  norms->resize(static_cast<std::size_t>(rows));

  constexpr float kStep = 1e-3F;

  // A random unit direction per row, and the nudged point in the same pass.
#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    uint64_t state = seed ^ (static_cast<uint64_t>(r) * 0x2545F4914F6CDD1DULL);
    const float* point = points + static_cast<std::size_t>(r) * dimension;
    float* target = scratch->data() + static_cast<std::size_t>(r) * dimension;

    float squared = 0.0F;
    for (int d = 0; d < dimension; ++d) {
      state ^= state << 13;
      state ^= state >> 7;
      state ^= state << 17;
      const float draw = static_cast<float>(state >> 40) * (2.0F / 16777216.0F) - 1.0F;
      target[d] = draw;
      squared += draw * draw;
    }
    const float inverse = 1.0F / std::sqrt(squared);
    for (int d = 0; d < dimension; ++d) {
      target[d] = point[d] + kStep * target[d] * inverse;
    }
  }

  critic(points, condition, rows, base.data());
  critic(scratch->data(), condition, rows, nudged.data());

  const float scale = std::sqrt(static_cast<float>(dimension));
  double total = 0.0;

#pragma omp parallel for reduction(+ : total) schedule(static)
  for (int r = 0; r < rows; ++r) {
    const float directional = (nudged[static_cast<std::size_t>(r)] -
                               base[static_cast<std::size_t>(r)]) / kStep;
    const float norm = std::abs(directional) * scale;
    (*norms)[static_cast<std::size_t>(r)] = norm;
    // Penalized toward ONE, not toward zero: the constraint is that the
    // function is 1-Lipschitz, and the optimal critic attains that bound.
    total += static_cast<double>((norm - 1.0F) * (norm - 1.0F));
  }

  return weight * total / static_cast<double>(rows);
}

// E[f(fake)] - E[f(real)], and the distance estimate.
//
// The first part is the Kantorovich-Rubinstein dual: the SUPREMUM of that
// difference over all 1-Lipschitz functions IS the earth-mover distance.
[[nodiscard]] inline double WassersteinEstimate(std::span<const float> real_scores,
                                                std::span<const float> fake_scores) {
  double real = 0.0;
  double fake = 0.0;

#pragma omp parallel for reduction(+ : real) schedule(static)
  for (std::size_t i = 0; i < real_scores.size(); ++i) {
    real += static_cast<double>(real_scores[i]);
  }
#pragma omp parallel for reduction(+ : fake) schedule(static)
  for (std::size_t i = 0; i < fake_scores.size(); ++i) {
    fake += static_cast<double>(fake_scores[i]);
  }

  return real / static_cast<double>(real_scores.size()) -
         fake / static_cast<double>(fake_scores.size());
}

// Whether the soft constraint is actually being met.
//
// Worth checking rather than assuming: a mean gradient norm far from one means
// the Lipschitz condition is not holding, and the Wasserstein interpretation
// of the critic value then simply does not apply - the number is smooth,
// plausible and not a distance.
[[nodiscard]] inline bool ConstraintSatisfied(std::span<const float> norms,
                                              float tolerance = 0.1F) {
  double total = 0.0;
  for (const float norm : norms) {
    total += static_cast<double>(norm);
  }
  return std::abs(total / static_cast<double>(norms.size()) - 1.0) < tolerance;
}

}  // namespace wgan
`,
        rationale:
          'The structural change is in the penalty, and it is asymptotic rather than constant. The literal version computed one finite difference per input dimension, making the Lipschitz constraint cost O(d) critic evaluations — which is why that version is unusable past a handful of dimensions. But the norm of a gradient does not require the gradient componentwise: a directional derivative along a random unit direction estimates it in two evaluations regardless of dimension, because the expected squared directional derivative over random unit directions is the squared gradient norm divided by d. A production implementation gets the exact gradient from reverse-mode differentiation at the same constant cost, and this form is written out because it makes the O(1)-versus-O(d) point visible. Around that, the critic becomes a GEMM followed by one fused pass that applies the bias, the activation, the unconditional score and the projection term together — the conditional term is a row-wise dot product between a sample’s own embedding and its own features, so computing it separately would re-read the whole feature matrix for nothing. The interpolation draws one coefficient per sample rather than per batch, since a shared one would sample a one-dimensional family rather than the region between the distributions.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The critic feature projection is a dense product over the batch, which is the only arithmetic of any size in a critic pass and runs twice per penalty evaluation.',
            tradeoff: 'The penalty needs two full critic passes over the batch, so the BLAS call count doubles for the constraint alone — and with five critic steps per round that is ten feature projections per generator update.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias, ReLU, the unconditional score and the projection term all happen in one traversal of each feature row, so the conditional term costs no additional pass over the feature matrix.',
            tradeoff: 'The features are overwritten in place by the activation, so the pre-activation is gone — and a critic whose units have all died is only diagnosable from those.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Interpolation, direction generation, the fused scoring pass and both reductions are row-independent, with per-row generator state derived from the row index so it stays reproducible.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS calls, and the five-critic-steps schedule means the machine alternates between two phases with different bandwidth profiles rather than settling into one.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the interpolation source, the scratch and the output may overlap, and reloads every value across the fused inner loops.',
            tradeoff: 'Restrict is an unchecked promise, and the interpolation is genuinely tempting to call in place with the fake batch as the output — which would be silently wrong rather than slow.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'The penalty drops from O(d) critic evaluations to two, and every pass becomes a GEMM plus one fused traversal. Illustrative, not a measured benchmark: with five critic steps per round the penalty was previously the dominant cost by a wide margin, and this is the change that makes the method affordable at realistic dimensions.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// WGAN-GP and conditional generation, transcribed the way the papers read.
//
// Two independent modifications to the adversarial setup:
//
//   1. WASSERSTEIN: the second network SCORES rather than classifies. No
//      sigmoid, no cross-entropy - the critic value estimates a distance,
//      which stays meaningful even when the two distributions do not overlap.
//      That is exactly where a classifier saturates and its gradient dies.
//
//   2. CONDITIONING: both networks are told what they are looking at. A
//      generator given a label learns one conditional distribution per label
//      rather than one blurred mixture.
//
// The Lipschitz constraint the theory requires cannot be imposed directly, so
// it becomes a PENALTY on the gradient norm at interpolated points - a soft
// stand-in for a hard constraint, and the substitution is worth naming.
//
// Vec-of-Vec, index loops, no libraries.

const PENALTY_WEIGHT: f64 = 10.0;
const CRITIC_STEPS: usize = 5;

struct MlpParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

fn relu(value: f64) -> f64 {
    if value > 0.0 {
        value
    } else {
        0.0
    }
}

fn matvec(weight: &[Vec<f64>], vector: &[f64], bias: &[f64]) -> Vec<f64> {
    let mut output = vec![0.0_f64; weight.len()];
    for i in 0..weight.len() {
        let mut total = bias[i];
        for j in 0..vector.len() {
            total += weight[i][j] * vector[j];
        }
        output[i] = total;
    }
    output
}

/// Sample -> SCORE. Unbounded, with no sigmoid anywhere.
///
/// The conditioning uses PROJECTION rather than concatenation: an inner
/// product between the class embedding and the critic's features. A
/// concatenated label can simply be ignored by the network; an inner product
/// with the features makes class-consistency structurally part of the score.
fn critic_forward(x: &[f64], condition: &[f64], params: &MlpParams) -> (f64, Vec<f64>) {
    let mut features = matvec(&params.w1, x, &params.b1);
    for value in features.iter_mut() {
        *value = relu(*value);
    }

    let mut unconditional = params.b2[0];
    for i in 0..features.len() {
        unconditional += params.w2[0][i] * features[i];
    }

    let conditional: f64 = condition
        .iter()
        .zip(features.iter())
        .map(|(e, f)| e * f)
        .sum();

    (unconditional + conditional, features)
}

/// Noise plus condition -> sample.
///
/// The condition is concatenated at the input here, the simplest mechanism.
/// Conditional normalization is stronger and is what real implementations use,
/// but the principle is the same: the generator must know what it is asked for.
fn generator_forward(z: &[f64], condition: &[f64], params: &MlpParams) -> Vec<f64> {
    let mut combined = z.to_vec();
    combined.extend_from_slice(condition);

    let mut hidden = matvec(&params.w1, &combined, &params.b1);
    for value in hidden.iter_mut() {
        *value = relu(*value);
    }

    let mut output = matvec(&params.w2, &hidden, &params.b2);
    for value in output.iter_mut() {
        *value = value.tanh();
    }
    output
}

/// E[f(fake)] - E[f(real)], minimized.
///
/// This is the Kantorovich-Rubinstein dual: the SUPREMUM of this difference
/// over all 1-Lipschitz functions IS the earth-mover distance between the two
/// distributions. Which means the critic value estimates a real distance - and
/// is therefore meaningful even when the distributions are far apart, where a
/// classifier would simply saturate.
fn wasserstein_critic_loss(real_scores: &[f64], fake_scores: &[f64]) -> f64 {
    fake_scores.iter().sum::<f64>() / fake_scores.len() as f64
        - real_scores.iter().sum::<f64>() / real_scores.len() as f64
}

/// A point on the line between a real and a generated sample.
///
/// The penalty is enforced HERE, not on real or fake data. The reason is
/// specific: the optimal critic has unit gradient norm along the transport
/// path between the distributions, and penalizing anywhere else constrains a
/// region the optimum does not care about.
fn interpolate(real: &[f64], fake: &[f64], epsilon: f64) -> Vec<f64> {
    real.iter()
        .zip(fake)
        .map(|(r, f)| epsilon * r + (1.0 - epsilon) * f)
        .collect()
}

/// (||grad f(x)||_2 - 1)^2, by finite differences.
///
/// A real implementation gets this from automatic differentiation, and it
/// costs a SECOND-ORDER derivative - the gradient of a gradient - which
/// roughly doubles the critic's backward pass. Done literally here it is one
/// extra critic evaluation per input dimension, which makes visible just how
/// much work the constraint costs.
fn gradient_penalty(
    point: &[f64],
    condition: &[f64],
    params: &MlpParams,
    epsilon: f64,
) -> f64 {
    let (base, _) = critic_forward(point, condition, params);

    let mut squared_norm = 0.0;
    for dimension in 0..point.len() {
        let mut nudged = point.to_vec();
        nudged[dimension] += epsilon;
        let (perturbed, _) = critic_forward(&nudged, condition, params);
        let derivative = (perturbed - base) / epsilon;
        squared_norm += derivative * derivative;
    }

    // Penalized toward ONE, not toward zero. The constraint is that the
    // function is 1-Lipschitz, and the optimal critic attains that bound.
    let norm = squared_norm.sqrt();
    (norm - 1.0) * (norm - 1.0)
}

/// -E[f(fake)]: the generator wants the critic to score its output high.
///
/// No substitution is needed here, unlike a plain GAN. The Wasserstein
/// objective has a usable gradient everywhere, so the theoretically correct
/// form is also the one that works - which is the whole point of changing the
/// metric rather than patching the loss.
fn generator_loss(fake_scores: &[f64]) -> f64 {
    -fake_scores.iter().sum::<f64>() / fake_scores.len() as f64
}

/// Distinct outputs PER CONDITION, not overall.
///
/// Rare conditions collapse first, and an aggregate diversity count hides it
/// completely: a model covering nine classes well and one not at all looks
/// healthy in every aggregate metric. This is the check that finds it.
fn condition_diversity(samples: &[Vec<f64>], tolerance: f64) -> usize {
    let mut modes: Vec<&Vec<f64>> = Vec::new();
    for sample in samples {
        let matched = modes.iter().any(|mode| {
            sample
                .iter()
                .zip(mode.iter())
                .map(|(a, b)| (a - b).abs())
                .fold(0.0_f64, f64::max)
                < tolerance
        });
        if !matched {
            modes.push(sample);
        }
    }
    modes.len()
}

/// CRITIC_STEPS critic updates, then ONE generator update.
///
/// The schedule follows from the objective rather than from folklore: the
/// critic is estimating a SUPREMUM, and a poorly converged supremum is not a
/// distance - so the generator should not move until the critic is close.
fn round_schedule() -> usize {
    CRITIC_STEPS
}
`,
        profile:
          'A full round is CRITIC_STEPS critic passes plus one generator pass, and the finite-difference penalty costs one extra critic evaluation per input dimension. Illustrative, not a measured benchmark: the literal penalty is O(d) times the critic, where a real second-order derivative is a constant factor — which is why this version is unusable past a handful of dimensions.',
      },

      'make-it-right': {
        code: `//! The same modifications, with the constraint and the conditioning as types.
//!
//! Two things change. The Lipschitz constraint becomes an explicit type that
//! knows how it is being enforced and how far off it is, because it is a SOFT
//! stand-in for a hard requirement and the gap is worth measuring rather than
//! assuming. And conditioning becomes a type that knows which networks it
//! reaches, because a conditional generator with an unconditional critic has
//! nothing enforcing that outputs match their condition - and that failure
//! looks like poor conditioning rather than a missing constraint.

use std::collections::HashMap;
use std::fmt;

/// Width of a condition embedding.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct EmbeddingDim(pub usize);

/// Number of critic updates per generator update.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct CriticSteps(pub usize);

/// How the condition reaches a network.
///
/// Not interchangeable. A concatenated label can simply be IGNORED by the
/// critic, while a projection - an inner product between the class embedding
/// and the features - makes class-consistency structurally part of the score.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConditioningMechanism {
    Concatenation,
    Projection,
    ConditionalNorm,
}

#[derive(Debug, PartialEq)]
pub enum WganError {
    /// The generator is conditioned and the critic is not.
    ///
    /// Its own variant because the consequence is specific and misleading:
    /// nothing then enforces that an output matches its condition, and the
    /// symptom looks like weak conditioning rather than a missing constraint.
    UnconditionedCritic,
    /// The critic uses batch normalization.
    ///
    /// The gradient penalty assumes the critic is a function of ONE sample.
    /// Batch statistics make it a function of the whole batch, which
    /// invalidates the per-sample penalty silently.
    BatchDependentCritic,
    /// A condition with no learned embedding.
    ///
    /// A conditional model cannot generalize to an unseen class and there is
    /// no graceful degradation - the output is arbitrary, not approximate.
    UnknownCondition(String),
    /// A non-positive penalty weight, which enforces nothing.
    InvalidPenaltyWeight(f64),
    /// An empty score set, which has no mean.
    EmptyBatch,
}

impl fmt::Display for WganError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnconditionedCritic => write!(
                f,
                "the generator is conditioned but the critic is not; nothing then \
                 enforces that outputs match their condition"
            ),
            Self::BatchDependentCritic => write!(
                f,
                "the gradient penalty assumes the critic is a function of one sample; \
                 batch statistics make it a function of the batch"
            ),
            Self::UnknownCondition(name) => write!(
                f,
                "{name} has no learned embedding; a conditional model cannot \
                 generalize to an unseen class"
            ),
            Self::InvalidPenaltyWeight(weight) => {
                write!(f, "penalty weight {weight} must be positive")
            }
            Self::EmptyBatch => write!(f, "both score sets must be non-empty"),
        }
    }
}

impl std::error::Error for WganError {}

/// A SOFT stand-in for a hard constraint on a function class.
///
/// The theory requires the critic to be 1-Lipschitz. That is a constraint over
/// a function class and cannot be imposed directly, so it becomes a penalty on
/// the gradient norm at sampled interpolates. Its own type because the
/// substitution is the method's central compromise, and pretending otherwise
/// is how its guarantees get overstated.
#[derive(Debug, Clone, Copy)]
pub struct LipschitzConstraint {
    weight: f64,
    target: f64,
    tolerance: f64,
}

impl LipschitzConstraint {
    pub fn new(weight: f64, target: f64, tolerance: f64) -> Result<Self, WganError> {
        if weight <= 0.0 {
            return Err(WganError::InvalidPenaltyWeight(weight));
        }
        Ok(Self { weight, target, tolerance })
    }

    /// Penalized toward ONE, not toward zero.
    ///
    /// The constraint is that the function is 1-Lipschitz, and the optimal
    /// critic attains that bound — pushing the norm toward zero would actively
    /// prevent the critic from reaching the supremum.
    pub fn penalty(&self, gradient_norms: &[f64]) -> f64 {
        self.weight
            * gradient_norms
                .iter()
                .map(|norm| (norm - self.target) * (norm - self.target))
                .sum::<f64>()
            / gradient_norms.len() as f64
    }

    /// Whether the soft constraint is actually being met.
    ///
    /// Worth checking rather than assuming: a penalty term staying far from
    /// zero means the Lipschitz condition is not holding, and the Wasserstein
    /// interpretation of the critic value then does not apply.
    pub fn satisfied(&self, gradient_norms: &[f64]) -> bool {
        let mean = gradient_norms.iter().sum::<f64>() / gradient_norms.len() as f64;
        (mean - self.target).abs() < self.tolerance
    }
}

/// Which networks the condition reaches, and how.
#[derive(Debug, Clone, Copy)]
pub struct ConditioningSpec {
    pub mechanism: ConditioningMechanism,
    pub embedding: EmbeddingDim,
    pub reaches_generator: bool,
    pub reaches_critic: bool,
}

impl ConditioningSpec {
    /// Guard clause for the failure that looks like something else.
    pub fn validate(&self) -> Result<(), WganError> {
        if self.reaches_generator && !self.reaches_critic {
            return Err(WganError::UnconditionedCritic);
        }
        Ok(())
    }
}

/// A learned vector per condition, with unknown conditions refused.
///
/// A conditional model cannot generalize to an unseen class, so returning a
/// zero vector would be worse than failing: downstream it reads as a specific
/// and meaningful condition rather than as a missing one.
pub struct ConditionEmbedding {
    table: HashMap<String, Vec<f64>>,
    dimension: EmbeddingDim,
}

impl ConditionEmbedding {
    pub fn new(table: HashMap<String, Vec<f64>>, dimension: EmbeddingDim) -> Self {
        Self { table, dimension }
    }

    pub fn get(&self, condition: &str) -> Result<&[f64], WganError> {
        self.table
            .get(condition)
            .map(Vec::as_slice)
            .ok_or_else(|| WganError::UnknownCondition(condition.to_string()))
    }

    pub fn dimension(&self) -> EmbeddingDim {
        self.dimension
    }
}

/// Score AND features.
///
/// The features come back because projection conditioning needs them: the
/// conditional term is an inner product between the class embedding and the
/// critic's features, so computing the score alone would force a second pass.
pub struct CriticOutput<'a> {
    pub score: f64,
    pub features: &'a [f64],
}

/// Scores rather than classifies. No sigmoid anywhere.
pub struct Critic {
    spec: ConditioningSpec,
    w1: Vec<f64>,
    b1: Vec<f64>,
    w2: Vec<f64>,
    b2: f64,
    input_dim: usize,
    feature_dim: usize,
    features: Vec<f64>,
}

impl Critic {
    pub fn new(
        input_dim: usize,
        feature_dim: usize,
        spec: ConditioningSpec,
        normalization: &str,
    ) -> Result<Self, WganError> {
        spec.validate()?;
        // Guard clause for the silent failure.
        if normalization == "batch" {
            return Err(WganError::BatchDependentCritic);
        }
        Ok(Self {
            spec,
            w1: vec![0.0; input_dim * feature_dim],
            b1: vec![0.0; feature_dim],
            w2: vec![0.0; feature_dim],
            b2: 0.0,
            input_dim,
            feature_dim,
            features: vec![0.0; feature_dim],
        })
    }

    pub fn score(&mut self, x: &[f64], condition: &[f64]) -> CriticOutput<'_> {
        self.features.copy_from_slice(&self.b1);
        for (j, &value) in x.iter().enumerate().take(self.input_dim) {
            if value == 0.0 {
                continue;
            }
            let row = &self.w1[j * self.feature_dim..(j + 1) * self.feature_dim];
            for (slot, &w) in self.features.iter_mut().zip(row) {
                *slot += value * w;
            }
        }
        for value in self.features.iter_mut() {
            *value = value.max(0.0);
        }

        let mut score = self.b2
            + self
                .w2
                .iter()
                .zip(self.features.iter())
                .map(|(w, f)| w * f)
                .sum::<f64>();

        if self.spec.mechanism == ConditioningMechanism::Projection {
            // An inner product with the features, not a concatenated input:
            // this cannot be ignored the way a concatenated label can.
            score += condition
                .iter()
                .zip(self.features.iter())
                .map(|(e, f)| e * f)
                .sum::<f64>();
        }

        CriticOutput { score, features: &self.features }
    }
}

/// The distance estimate AND whether it can be trusted.
///
/// Bundled because the Wasserstein estimate is only a distance when the critic
/// has approximated the supremum - an under-trained critic produces a number
/// that is smooth, plausible and meaningless, and reporting it without the
/// caveat is how that mistake propagates.
pub struct RoundResult {
    pub wasserstein_estimate: f64,
    pub penalty: f64,
    pub constraint_satisfied: bool,
    pub critic_steps: CriticSteps,
}

impl RoundResult {
    pub fn trustworthy(&self, minimum: CriticSteps) -> bool {
        self.constraint_satisfied && self.critic_steps >= minimum
    }
}

/// E[f(fake)] - E[f(real)] plus the penalty.
///
/// The first part is the Kantorovich-Rubinstein dual: the SUPREMUM of that
/// difference over all 1-Lipschitz functions IS the earth-mover distance. So
/// the critic value estimates a real distance, which is why it stays
/// meaningful when the distributions do not overlap - precisely where a
/// classifier saturates.
pub fn critic_round(
    real_scores: &[f64],
    fake_scores: &[f64],
    gradient_norms: &[f64],
    constraint: &LipschitzConstraint,
    critic_steps: CriticSteps,
) -> Result<RoundResult, WganError> {
    if real_scores.is_empty() || fake_scores.is_empty() {
        return Err(WganError::EmptyBatch);
    }

    let real = real_scores.iter().sum::<f64>() / real_scores.len() as f64;
    let fake = fake_scores.iter().sum::<f64>() / fake_scores.len() as f64;

    Ok(RoundResult {
        wasserstein_estimate: real - fake,
        penalty: constraint.penalty(gradient_norms),
        constraint_satisfied: constraint.satisfied(gradient_norms),
        critic_steps,
    })
}

/// Distinct outputs PER CONDITION, not overall.
///
/// Rare conditions collapse first, and an aggregate count hides it completely:
/// a model covering nine classes well and one not at all looks healthy in
/// every aggregate metric.
pub fn collapsed_conditions(
    counts: &HashMap<String, usize>,
    minimum: usize,
) -> Vec<&str> {
    counts
        .iter()
        .filter(|(_, &count)| count < minimum)
        .map(|(name, _)| name.as_str())
        .collect()
}
`,
        rationale:
          'Two changes. The Lipschitz constraint becomes an explicit type that knows its weight, its target norm and whether it is actually being satisfied — because it is a soft stand-in for a hard requirement over a function class, and the gap between the two is the method’s central compromise rather than an implementation detail. Making it a type with a satisfied predicate means the question "is the Wasserstein interpretation even applicable right now" can be asked, which it otherwise never is; the round result then bundles the estimate with a trustworthiness check, since an under-trained critic produces a number that is smooth, plausible and not a distance. The second is that conditioning becomes a spec that knows which networks it reaches, with the generator-conditioned-but-critic-not case rejected at construction: nothing then enforces that outputs match their condition, and the symptom looks like weak conditioning rather than a missing constraint. Around those, the mechanism becomes an enum because a concatenated label can be ignored while a projection cannot, batch normalization in the critic is refused because it silently invalidates a per-sample penalty, an unknown condition returns an error rather than a zero vector that reads downstream as a specific condition, and the critic owns its feature scratch so the projection term reuses what the score pass already computed.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics with no per-call allocation, and the projection term reuses features the score pass already computed. Illustrative, not a measured benchmark: on five critic steps per round, avoiding a second forward pass for the conditional term is a measurable saving.',
      },

      'make-it-fast': {
        code: `//! Batched, with the penalty as a proper directional derivative.
//!
//! The structural change: the literal gradient penalty computed one finite
//! difference PER INPUT DIMENSION, which made the constraint cost O(d) critic
//! evaluations. The norm of a gradient does not need the gradient computed
//! componentwise - and in a real implementation it comes from reverse-mode
//! automatic differentiation at constant cost. Here it is a directional
//! derivative along a random direction, which estimates the same quantity in
//! TWO evaluations regardless of dimension.
//!
//! Three changes:
//!   1. Both networks batch into matrix products.
//!   2. The penalty becomes O(1) critic evaluations rather than O(d).
//!   3. Projection conditioning is one row-wise dot product, computed
//!      alongside the unconditional score rather than in a second pass.

use ndarray::{Array1, Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Scores rather than classifies. No sigmoid anywhere.
///
/// Layer normalization, never batch normalization: the gradient penalty
/// assumes the critic is a function of ONE sample, and batch statistics make
/// it a function of the whole batch, which invalidates the penalty silently.
pub struct BatchedCritic {
    w1: Array2<f32>,
    b1: Array1<f32>,
    w2: Array1<f32>,
    b2: f32,
    /// Scratch sized once, so a critic pass allocates only its scores.
    features: Array2<f32>,
}

impl BatchedCritic {
    pub fn new(max_rows: usize, w1: Array2<f32>, b1: Array1<f32>, w2: Array1<f32>) -> Self {
        let feature_dim = b1.len();
        Self { w1, b1, w2, b2: 0.0, features: Array2::zeros((max_rows, feature_dim)) }
    }

    /// \`x\` is (rows, input_dim), \`condition\` is (rows, feature_dim).
    ///
    /// The conditional term is a ROW-WISE dot product between each sample's
    /// own embedding and its own features - computed in the same pass as the
    /// unconditional score, because a separate pass would re-read the whole
    /// feature matrix for nothing.
    pub fn score(
        &mut self,
        x: ArrayView2<'_, f32>,
        condition: ArrayView2<'_, f32>,
    ) -> Array1<f32> {
        let rows = x.shape()[0];
        let mut features = self.features.slice_mut(ndarray::s![..rows, ..]);
        features.assign(&x.dot(&self.w1));

        let mut scores = Array1::<f32>::zeros(rows);

        // Fused bias, ReLU, unconditional score and projection term in ONE
        // traversal of each feature row.
        Zip::from(features.axis_iter_mut(Axis(0)))
            .and(condition.axis_iter(Axis(0)))
            .and(&mut scores)
            .par_for_each(|mut row, embedding, score| {
                let mut unconditional = self.b2;
                let mut conditional = 0.0f32;
                for ((value, &bias), (&weight, &e)) in row
                    .iter_mut()
                    .zip(self.b1.iter())
                    .zip(self.w2.iter().zip(embedding.iter()))
                {
                    let activated = (*value + bias).max(0.0);
                    *value = activated;
                    unconditional += weight * activated;
                    conditional += e * activated;
                }
                *score = unconditional + conditional;
            });

        scores
    }
}

/// Points on the lines between real and generated samples.
///
/// One epsilon PER SAMPLE, not one per batch: a single shared coefficient
/// would sample a one-dimensional family of interpolates rather than covering
/// the region between the distributions.
///
/// The penalty is enforced here and not on real or fake data, because the
/// optimal critic has unit gradient norm along the transport path and
/// penalizing elsewhere constrains a region the optimum does not care about.
pub fn interpolate(
    real: ArrayView2<'_, f32>,
    fake: ArrayView2<'_, f32>,
    epsilons: &[f32],
) -> Array2<f32> {
    let mut out = Array2::<f32>::zeros(real.raw_dim());
    Zip::from(out.axis_iter_mut(Axis(0)))
        .and(real.axis_iter(Axis(0)))
        .and(fake.axis_iter(Axis(0)))
        .and(epsilons)
        .par_for_each(|mut target, r, f, &epsilon| {
            for ((slot, &rv), &fv) in target.iter_mut().zip(r.iter()).zip(f.iter()) {
                *slot = epsilon * rv + (1.0 - epsilon) * fv;
            }
        });
    out
}

/// (||grad f(x)||_2 - 1)^2, in TWO critic evaluations regardless of dimension.
///
/// The literal version took one finite difference per input dimension, which
/// made the constraint cost O(d) critic passes. A directional derivative along
/// a random unit direction estimates the gradient norm in constant cost: the
/// expected squared directional derivative over random unit directions is the
/// squared gradient norm over d, so scaling recovers it.
///
/// A production implementation gets the exact gradient from reverse-mode
/// automatic differentiation - also constant cost, and exact. This form is
/// here because it makes the O(1)-versus-O(d) point visible.
pub fn gradient_penalty(
    critic: &mut BatchedCritic,
    points: ArrayView2<'_, f32>,
    condition: ArrayView2<'_, f32>,
    directions: ArrayView2<'_, f32>,
    weight: f32,
    step: f32,
) -> (f32, Array1<f32>) {
    let dimension = points.shape()[1] as f32;

    let mut nudged = points.to_owned();
    Zip::from(nudged.axis_iter_mut(Axis(0)))
        .and(directions.axis_iter(Axis(0)))
        .par_for_each(|mut target, direction| {
            // Normalize per row: the estimator requires unit directions.
            let norm = direction.iter().map(|d| d * d).sum::<f32>().sqrt();
            let scale = step / norm.max(1e-12);
            for (slot, &d) in target.iter_mut().zip(direction.iter()) {
                *slot += scale * d;
            }
        });

    let base = critic.score(points, condition);
    let shifted = critic.score(nudged.view(), condition);

    let mut norms = Array1::<f32>::zeros(base.len());
    Zip::from(&mut norms)
        .and(&base)
        .and(&shifted)
        .par_for_each(|norm, &b, &s| {
            *norm = ((s - b) / step).abs() * dimension.sqrt();
        });

    // Penalized toward ONE, not toward zero: the constraint is that the
    // function is 1-Lipschitz, and the optimal critic attains that bound.
    let penalty = weight
        * norms.iter().map(|n| (n - 1.0) * (n - 1.0)).sum::<f32>()
        / norms.len() as f32;

    (penalty, norms)
}

/// E[f(real)] - E[f(fake)]: the distance estimate.
///
/// The Kantorovich-Rubinstein dual: the SUPREMUM of this difference over all
/// 1-Lipschitz functions IS the earth-mover distance, which is why the critic
/// value stays meaningful when the distributions do not overlap.
pub fn wasserstein_estimate(real_scores: &Array1<f32>, fake_scores: &Array1<f32>) -> f64 {
    let real: f64 = real_scores.par_iter().map(|&v| f64::from(v)).sum();
    let fake: f64 = fake_scores.par_iter().map(|&v| f64::from(v)).sum();
    real / real_scores.len() as f64 - fake / fake_scores.len() as f64
}

/// Whether the soft constraint is actually being met.
///
/// Worth checking rather than assuming: a mean gradient norm far from one
/// means the Lipschitz condition is not holding, and the Wasserstein
/// interpretation of the critic value then simply does not apply - the number
/// is smooth, plausible and not a distance.
pub fn constraint_satisfied(norms: &Array1<f32>, tolerance: f32) -> bool {
    let mean = norms.iter().sum::<f32>() / norms.len() as f32;
    (mean - 1.0).abs() < tolerance
}

/// Distinct outputs PER CONDITION, in one pairwise pass per condition.
///
/// Rare conditions collapse first, and an aggregate count hides it completely:
/// a model covering nine classes well and one not at all looks healthy in
/// every aggregate metric.
pub fn per_condition_modes(
    samples: ArrayView2<'_, f32>,
    conditions: &[u32],
    tolerance: f32,
) -> Vec<(u32, usize)> {
    let mut unique: Vec<u32> = conditions.to_vec();
    unique.sort_unstable();
    unique.dedup();

    unique
        .into_par_iter()
        .map(|condition| {
            let rows: Vec<usize> = conditions
                .iter()
                .enumerate()
                .filter(|(_, &c)| c == condition)
                .map(|(index, _)| index)
                .collect();

            let mut modes: Vec<usize> = Vec::new();
            for &row in &rows {
                let candidate = samples.row(row);
                let matched = modes.iter().any(|&mode| {
                    candidate
                        .iter()
                        .zip(samples.row(mode).iter())
                        .map(|(a, b)| (a - b).abs())
                        .fold(0.0f32, f32::max)
                        < tolerance
                });
                if !matched {
                    modes.push(row);
                }
            }
            (condition, modes.len())
        })
        .collect()
}
`,
        rationale:
          'The structural change is in the penalty, and it is asymptotic rather than constant. The literal version computed one finite difference per input dimension, making the Lipschitz constraint cost O(d) critic evaluations — which is why that version is unusable past a handful of dimensions. But the norm of a gradient does not require the gradient componentwise: a directional derivative along a random unit direction estimates it in two evaluations regardless of dimension, because the expected squared directional derivative over random unit directions is the squared gradient norm divided by d. A production implementation gets the exact gradient from reverse-mode differentiation at the same constant cost, and this form is written out because it makes the O(1)-versus-O(d) point visible. Around that, the critic becomes a matrix product followed by one fused parallel pass applying the bias, the activation, the unconditional score and the projection term together — the conditional term is a row-wise dot product between a sample’s own embedding and its own features, so computing it separately would re-read the whole feature matrix for nothing. The interpolation takes one coefficient per sample rather than per batch, since a shared one would sample a one-dimensional family rather than the region between the distributions.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The critic feature projection is a dense product over the batch, which is the only arithmetic of any size in a critic pass and runs twice per penalty evaluation.',
            tradeoff: 'Binds the build to a system BLAS, and the penalty needs two full critic passes — so with five critic steps per round that is ten feature projections per generator update.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The fused scoring pass, the interpolation, the direction normalization and both reductions are row-independent with no shared writes.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS calls, and the five-critic-steps schedule means the machine alternates between two phases with different bandwidth profiles rather than settling into one.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The fused scoring pass zips the feature row against the bias, the output weight and the embedding simultaneously, so no per-element bounds check survives into the generated code.',
            tradeoff: 'The four-way zip is considerably harder to read than four indexed accesses, and it silently truncates to the shortest operand — so a feature width that disagrees with the embedding width produces a partially computed score rather than an error.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The feature scratch is allocated once and sliced per call, so every product sees a standard-layout operand and no critic pass reallocates.',
            tradeoff: 'The features are overwritten in place by the fused activation, so the pre-activation is gone — and a critic whose units have all died is only diagnosable from those.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'The penalty drops from O(d) critic evaluations to two, and every pass becomes a matrix product plus one fused traversal. Illustrative, not a measured benchmark: with five critic steps per round the penalty was previously the dominant cost by a wide margin, and this is the change that makes the method affordable at realistic dimensions.',
      },
    },
  },
};
