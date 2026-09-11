import type { AiMlModel } from '../../types';

/**
 * GAN — the `minimax` objective, and the entry where "the loss went down" is
 * not merely uninformative but actively misleading.
 *
 * Included as the third corner of the generative triangle alongside the VAE
 * and normalizing flows: same goal, and an objective that is a game between
 * two networks rather than a quantity either of them minimizes.
 */
export const GAN: AiMlModel = {
  slug: 'gan',
  name: 'Generative Adversarial Network',
  aliases: ['GAN', 'Adversarial training', 'DCGAN', 'Generator-discriminator'],
  category: 'generative-ai',
  group: 'adversarial',
  kind: 'model',

  paradigms: ['unsupervised'],
  taskTypes: ['generation', 'anomaly-detection'],
  paradigmNote:
    'Unsupervised in that no labels exist, but the mechanism is unusual enough to be worth naming: the supervision is manufactured by a second network that is itself being trained, so the training signal is non-stationary by construction. Every other model in this reference optimizes against a fixed objective; this one optimizes against an opponent that moves.',

  intuition:
    'Train a forger and a detective at the same time. The forger produces samples, the detective tries to tell them from real data, and each improves against the other. Neither ever sees an explicit description of what makes data realistic — the forger only ever learns from the detective’s mistakes. That is the appeal, because it means no likelihood needs to be defined and no reconstruction distance has to be chosen, which is why GAN images were sharp when everything else was blurry. It is also the problem: the target is moving, so there is nothing that decreases monotonically and no loss value that tells you how well it is going.',

  objective: {
    kind: 'minimax',
    expression: {
      formula:
        '\\min_G \\max_D \\ V(D,G) = \\mathbb{E}_{\\mathbf{x}\\sim p_{\\text{data}}}\\bigl[\\log D(\\mathbf{x})\\bigr] + \\mathbb{E}_{\\mathbf{z}\\sim p_Z}\\bigl[\\log\\bigl(1 - D(G(\\mathbf{z}))\\bigr)\\bigr]',
      symbols: [
        { symbol: 'D', meaning: 'the discriminator: outputs the probability that its input came from the data rather than the generator' },
        { symbol: 'G', meaning: 'the generator: maps noise to samples, and never sees real data directly at any point' },
        { symbol: 'p_Z', meaning: 'the latent prior, usually a standard Gaussian; the only stochasticity in the generator' },
        { symbol: '\\min_G \\max_D', meaning: 'a game, not a minimization — the solution is an equilibrium and not the bottom of anything' },
      ],
    },
    reading:
      'Read the two terms from the discriminator’s side: it wants to score real data high and generated data low, and the generator wants to prevent the second half. What makes this different from every other objective in this reference is the ordering of the operators — there is no single quantity being minimized, so there is no loss curve that means anything. A falling generator loss usually means the discriminator is losing, which is not progress. Two practical consequences follow. At the optimum the discriminator is at one half everywhere and both losses sit at constants, so convergence looks identical to failure. And the generator’s gradient through this form vanishes exactly when the discriminator is confident, which is at the start of training — so the form that is written is not the form that is used.',
  },

  optimization: {
    method: 'Alternating Adam on two networks, with the non-saturating generator loss and a maintained balance between them',
    updateRule: {
      formula:
        '\\mathcal{L}_D = -\\log D(\\mathbf{x}) - \\log\\bigl(1 - D(G(\\mathbf{z}))\\bigr), \\qquad \\mathcal{L}_G = -\\log D\\bigl(G(\\mathbf{z})\\bigr)',
      symbols: [
        { symbol: '\\mathcal{L}_G = -\\log D(G(z))', meaning: 'the NON-SATURATING form: maximize the chance of fooling rather than minimize the chance of being caught' },
        { symbol: '\\log(1 - D(G(z)))', meaning: 'the theoretically correct form, which has near-zero gradient exactly when the generator is bad' },
        { symbol: '\\mathbf{z} \\sim p_Z', meaning: 'fresh noise every step; a fixed set of latents would be memorized rather than learned from' },
      ],
    },
    rationale:
      'The single most important detail is that the generator loss written in the theory is not the one anyone uses. Minimizing log(1 − D(G(z))) is correct in the limit and useless in practice: when the generator is poor the discriminator is confident, that term saturates, and the gradient reaching the generator is essentially zero — so the generator learns slowest precisely when it most needs to learn. The non-saturating form flips it into maximizing log D(G(z)), which has the same fixed point and a strong gradient when the discriminator is winning. It is not the same objective and it is not a bound on the original; it is a substitution that works, and the gap between the written theory and the used practice is unusually wide here. Around that sits a balance problem with no principled solution: if the discriminator gets too strong the generator receives no signal, if it gets too weak the signal is meaningless, and the practical answer is a collection of heuristics — matched learning rates, per-step alternation, label smoothing, sometimes noise on the discriminator inputs.',
    hyperparameters: [
      { name: 'discriminator/generator step ratio', role: 'How many discriminator steps per generator step. The main balance lever, and a symptom-driven one', typicalRange: '1:1 to 5:1' },
      { name: 'learning rates', role: 'Often different for the two networks; the balance is more sensitive to their ratio than to their size', typicalRange: '1e-5 to 2e-4' },
      { name: 'Adam beta1', role: 'Lowered from the usual 0.9 because momentum destabilizes a game with a moving target', typicalRange: '0.0 to 0.5' },
      { name: 'latent dimension', role: 'Width of the noise prior. Too small caps diversity, too large leaves directions unused', typicalRange: '64 to 512' },
      { name: 'label smoothing', role: 'Targets of 0.9 rather than 1.0 for real data; keeps the discriminator from becoming over-confident and starving the generator', typicalRange: '0.0 to 0.2' },
      { name: 'batch size', role: 'Larger batches stabilize the gradient estimate materially here, more than in ordinary training', typicalRange: '64 to 512' },
    ],
    convergence:
      'There is no convergence in the usual sense, and this is the entry where that statement is literal rather than a caveat. The losses oscillate, and at the theoretical optimum they sit at constants — so a healthy run and a dead one produce indistinguishable curves, and sample inspection is the only real monitoring. Three failures dominate. Mode collapse: the generator finds a small set of outputs the discriminator currently rates well and produces only those, so the loss looks fine and diversity is gone; the diagnostic is generating a large batch and measuring how many distinct modes appear, which is trivial and routinely skipped. Discriminator overpowering: it becomes confident, its gradient to the generator vanishes, and the generator freezes — recognizable by discriminator accuracy approaching one and generator loss climbing. And oscillation, where the two networks cycle without either improving, which can persist indefinitely because nothing about the dynamics forces progress. None of these is a bug to be fixed once; they are the normal operating hazards of the method.',
    complexity:
      'O(B · (C_G + 2·C_D)) per full step — one generator forward and backward, and two discriminator passes since it sees both real and fake batches. Roughly twice a comparable non-adversarial model per step, and considerably more in wall-clock terms because the step count needed is much higher and much less predictable.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Not forecasting so much as synthesis: train on historical series and generate new ones with the same statistical character, for augmentation or for sharing data that cannot be shared directly. A conditional variant can produce futures given a history, and the set of generated futures is then an implicit predictive distribution.',
        where: [
          'Synthetic time-series generation for augmenting a scarce training set',
          'Privacy-preserving data sharing, where a synthetic panel stands in for a confidential one',
          'Scenario generation for stress testing, where plausible-but-unseen trajectories are the deliverable',
          'Simulating rare conditions that appear too seldom in the historical record to train on',
        ],
        why: 'Synthesis is a genuine use and the sharpness argument carries over — GAN-generated series avoid the over-smoothing that a likelihood-trained generator produces. For forecasting specifically the case is weak and worth stating plainly. There is no likelihood, so the implicit predictive distribution cannot be evaluated or calibrated the way a quantile forecaster’s can; mode collapse means that distribution may be missing modes entirely while looking fine; and DeepAR or a quantile model gives a calibrated distribution directly, for a fraction of the training difficulty. Use this to generate data, not to forecast with.',
        featurization: [
          'Condition on history explicitly if the output is meant to be a forecast rather than a fresh series, since an unconditional GAN has no notion of continuation',
          'Preserve temporal structure with an architecture that has it — a plain MLP generator produces series that match marginals and not dynamics',
          'Measure mode coverage against the historical distribution, because collapse is invisible in any loss',
          'Validate synthetic data by training a downstream model on it and testing on real data, which is the only test that matters',
        ],
        evaluation:
          'For synthesis, train-on-synthetic-test-on-real is the honest benchmark and the only one that reflects the use case. For any forecasting claim, calibration against a quantile baseline — and expect the GAN to lose, because it optimizes realism rather than calibration and those are different things.',
        pitfalls: [
          'Mode collapse producing synthetic data that covers only part of the real distribution, with nothing in the loss to show it',
          'Matching marginal distributions while getting the temporal dependence wrong, which visual inspection misses',
          'Treating generated futures as a calibrated predictive distribution, which they are not',
          'Privacy claims without a formal guarantee — a GAN can and does memorize training examples',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Train on normal data only, then score a new input by how well the generator can produce it: search the latent space for the code whose output best matches the input, and combine the residual with the discriminator’s judgement. An input the generator cannot reach is one unlike anything it learned.',
        where: [
          'Medical imaging anomaly detection, where normal scans are plentiful and pathologies are rare and varied',
          'Industrial visual inspection where defects are unknown in advance',
          'Settings needing both a score and a plausible reconstruction showing what normal would have looked like',
          'Image domains where a likelihood-based detector produces over-smoothed reconstructions',
        ],
        why: 'It works and it produces something genuinely useful — a reconstruction showing what the input would have looked like if it were normal, which is far more actionable than a scalar score. But the framing is adapted rather than native for a hard reason: the original formulation needs a latent optimization per query, which means hundreds of gradient steps to score one input, and that is not a detector so much as a research procedure. Encoder-augmented variants fix the speed and give back some accuracy. Underneath, mode collapse is directly harmful here: a generator missing a mode of normal data will flag that entire mode as anomalous, and the training loss says nothing about it. An autoencoder is simpler, faster and usually competitive.',
        featurization: [
          'Prefer an encoder-augmented variant, since per-query latent optimization is hundreds of steps and not deployable',
          'Combine reconstruction residual with discriminator features rather than using either alone — the combination is consistently stronger',
          'Measure mode coverage on normal data before deploying, because a missing mode becomes a permanent false-positive source',
          'Train on a verified-normal set, since anomalies in training teach the generator to produce them',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget with an autoencoder baseline on the same data — that comparison is usually close and the autoencoder is far cheaper, so it is the one that decides whether the complexity is warranted. Report scoring latency explicitly, since it is the property that rules out the original formulation.',
        pitfalls: [
          'Per-query latent optimization making the detector too slow to deploy at all',
          'Mode collapse turning a whole region of normal data into a permanent false-positive source',
          'Training data containing anomalies, which the generator learns to produce',
          'Unstable training producing detectors whose quality varies between runs with identical settings',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'A GAN is a two-player game before it is a generative model, and almost everything interesting about it is optimization. The solution concept is a Nash equilibrium rather than a minimum, which changes what convergence means and removes the guarantee that gradient descent makes progress at all — in a game, simultaneous gradient steps can cycle indefinitely around an equilibrium they never reach. Around that sit the non-saturating loss substitution, the balance problem between two learners, and the general difficulty that the objective for each player is non-stationary because the other keeps moving.',
        where: [
          'Nash equilibrium as a solution concept, and why "the loss went down" is meaningless when the objective is a game',
          'Rotational dynamics in simultaneous gradient descent, where the vector field circles rather than descends',
          'The non-saturating substitution: changing the objective because the correct one has no usable gradient',
          'Non-stationary optimization, where each player faces a target the other is actively moving',
        ],
        why: 'This is the clearest case in the whole reference of an optimization problem that is not a minimization, and the consequences are concrete rather than philosophical. Simultaneous gradient descent on a minimax objective has rotational components in its dynamics, so the iterates can orbit an equilibrium forever while every individual step looks locally correct — that is not a tuning failure, it is what the vector field does. The non-saturating substitution is the other transferable lesson: when the correct objective has no gradient in the region you are actually in, changing the objective is sometimes the right move, and being explicit that it is a substitution rather than an approximation is what keeps the reasoning honest.',
        featurization: [
          'Monitor discriminator accuracy rather than either loss; around one half is healthy and near one means the generator has stopped receiving signal',
          'Use the non-saturating generator loss always, since the theoretically correct form has no gradient exactly when it is needed',
          'Lower Adam momentum, because momentum amplifies the rotational dynamics rather than damping them',
          'Generate a large sample and count distinct modes on a schedule, since collapse is invisible in every loss',
        ],
        evaluation:
          'Sample quality and diversity measured directly, never loss values — a healthy run and a dead one produce indistinguishable curves and that is a property of the objective rather than a monitoring gap. Track discriminator accuracy as the balance diagnostic, and treat a sustained move toward one as the signal that training has effectively stopped.',
        pitfalls: [
          'Reading loss curves as progress, which is the defining mistake with this objective',
          'Using the theoretically correct generator loss and finding training does not start',
          'High Adam momentum amplifying rotation and preventing settling',
          'Never measuring mode coverage, so collapse is discovered only from sample inspection',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'A convolutional generator maps noise to an image through transposed convolutions or upsampling, and a convolutional discriminator classifies. This is where GANs made their reputation, and the architectural conventions that made them work — strided convolutions, batch normalization, no fully connected layers — are as much of the contribution as the objective.',
        where: [
          'Image synthesis and editing, where adversarial training produced the first sharp generated images',
          'Image-to-image translation, where paired or unpaired domain transfer is the task',
          'Super-resolution, where the adversarial term is what prevents the over-smoothing a pixel loss produces',
          'Data augmentation for domains where real examples are scarce or restricted',
        ],
        why: 'The sharpness argument is the real one and it is structural: a pixel-wise likelihood loss averages over plausible outputs and averaging images produces blur, while an adversarial loss only requires the output to be indistinguishable, which permits committing to one sharp possibility. That is why GANs dominated image synthesis for years. They have since been largely overtaken by diffusion, which produces better diversity and trains stably — and the diversity half of that is the point, because mode collapse was always the unaddressed weakness. GANs remain competitive where inference must be a single forward pass, since a diffusion model needs many.',
        featurization: [
          'Use convolutional architectures on both sides; a fully connected generator on images fails for reasons that have nothing to do with the objective',
          'Normalize images to the generator output range, and match the final activation to it',
          'Avoid transposed convolutions with mismatched stride and kernel, which produce the characteristic checkerboard artifact',
          'Keep a fixed latent batch and generate from it every epoch, which is the cheapest way to see collapse as it happens',
        ],
        evaluation:
          'Sample quality and diversity metrics together, never either alone — a collapsed generator can score well on quality and is worthless. Human evaluation on a sample remains the honest check, and comparison against a diffusion model at matched compute is the current baseline.',
        pitfalls: [
          'Checkerboard artifacts from badly configured transposed convolutions',
          'Mode collapse producing beautiful samples with almost no variety',
          'Quality metrics alone hiding a total loss of diversity',
          'Training instability making results irreproducible across runs with identical settings',
        ],
      },
      'risk-and-fraud': {
        fit: 'adapted',
        how: 'Generate synthetic examples of the rare class to rebalance a training set, or produce synthetic records that preserve statistical structure without exposing real ones. Tabular variants adapt the architecture to mixed categorical and continuous columns, which a plain image-style generator handles badly.',
        where: [
          'Class rebalancing for extremely imbalanced fraud datasets',
          'Synthetic record generation where the real data cannot be shared for regulatory reasons',
          'Stress-scenario generation for risk models',
          'Augmenting rare attack patterns that appear too seldom to train on directly',
        ],
        why: 'The imbalance problem is real and synthetic minority examples do sometimes help. But the caveats are unusually heavy here and mostly point the other way. Generating more of a class the model has barely seen is close to circular: the generator learned the minority distribution from the same few examples, so it can amplify their idiosyncrasies rather than filling the space. Simpler oversampling methods frequently match it. And privacy claims need a formal guarantee, because a GAN can and does memorize training examples — synthetic is not the same as private, and regulators increasingly know this.',
        featurization: [
          'Use an architecture built for tabular data with mixed types; an image-style generator handles categorical columns badly',
          'Validate synthetic data by training on it and testing on real, which is the only test that reflects the use case',
          'Check for memorized training records explicitly before making any privacy claim',
          'Compare against simple oversampling first, which is frequently competitive and vastly simpler',
        ],
        evaluation:
          'Downstream model performance on real held-out data with and without the synthetic augmentation, which is the only measurement that matters. For privacy, membership-inference testing rather than an assertion that the data is synthetic.',
        pitfalls: [
          'Amplifying the idiosyncrasies of a handful of minority examples rather than filling the space',
          'Privacy claims without a formal guarantee, when memorization is demonstrable',
          'Mode collapse making synthetic minority examples nearly identical to each other',
          'Skipping the simple-oversampling baseline, which frequently performs as well',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Expensive and unpredictable — roughly double a comparable non-adversarial model per step, and far more in wall clock because the required step count is high and variable. Runs with identical settings and different seeds genuinely diverge in outcome, so the realistic budget includes several attempts.',
    inferenceProfile:
      'One forward pass through the generator and nothing else: milliseconds, and the discriminator is discarded entirely. This is the strongest remaining argument for GANs over diffusion, which needs many sequential passes to produce one sample.',
    retrainingCadence:
      'Per project rather than on a schedule. Because runs are unstable, retraining is closer to re-running an experiment than to refreshing a model, and the new checkpoint has to be re-evaluated on samples rather than trusted.',
    driftAndMonitoring: [
      'Generate from a fixed latent batch every epoch and look at it; this is the cheapest and most reliable monitoring available and there is no substitute',
      'Track discriminator accuracy rather than either loss — around one half is healthy, near one means the generator has stopped learning',
      'Measure mode coverage on a schedule by generating a large sample and counting distinct outputs, since collapse is invisible in the losses',
      'Checkpoint often, because a run can degrade irreversibly and the best model is frequently not the last one',
    ],
    productionGotchas: [
      'Loss values do not indicate quality. At the theoretical optimum both losses are constants, so a healthy run and a dead one look identical — this is the single most important operational fact about the method',
      'Training is genuinely irreproducible across seeds. Two runs with identical settings can differ from excellent to collapsed, so the pipeline must select on samples rather than on the last checkpoint',
      'Only the generator ships. The discriminator is training scaffolding and keeping it in the artifact is a common and pointless cost',
      'Mode collapse is silent and permanent. A deployed generator producing three outputs forever will not surface in any metric that does not explicitly measure diversity',
      'GANs memorize. Any privacy claim about synthetic data needs a membership-inference test rather than the assertion that the data was generated',
    ],
  },

  assumptions: [
    'Sample realism is what matters and an explicit likelihood is not required — the trade the whole method makes',
    'The training set is large and diverse enough that the discriminator cannot simply memorize it',
    'An equilibrium between the two networks is reachable by simultaneous gradient steps, which is an assumption rather than a guarantee',
    'Diversity will be measured separately, because nothing in the objective rewards it',
    'Several training runs are affordable, since any single one may collapse for reasons unrelated to the configuration',
  ],

  pros: [
    {
      point: 'Sharp samples, because no averaging is involved',
      context:
        'A likelihood loss averages over plausible outputs and averaging images produces blur; an adversarial loss only demands indistinguishability, so the model can commit to one sharp possibility. This is why GAN images were sharp when nothing else was.',
    },
    {
      point: 'No likelihood or reconstruction distance need be defined',
      context:
        'The discriminator learns what realistic means, which sidesteps choosing a pixel metric that does not match perception. Genuinely freeing in domains where no good distance exists.',
    },
    {
      point: 'Single-pass generation',
      context:
        'One forward pass per sample, against the many sequential steps a diffusion model needs. The strongest remaining argument for GANs, and decisive wherever generation latency is a constraint.',
    },
    {
      point: 'The architecture is unconstrained',
      context:
        'No invertibility requirement as in flows, no tractable-likelihood requirement as in autoregressive models. The generator can be any differentiable map from noise to data.',
    },
  ],

  cons: [
    {
      point: 'The loss tells you nothing',
      context:
        'At equilibrium both losses are constants, so a healthy run and a collapsed one produce identical curves. Every other model here can be monitored by its objective, and this one cannot — which changes how the whole workflow has to be built.',
    },
    {
      point: 'Mode collapse is silent',
      context:
        'The generator can produce a handful of outputs forever while every loss looks fine. Nothing in the objective rewards diversity, so it has to be measured separately and almost never is.',
    },
    {
      point: 'Training is unstable and irreproducible',
      context:
        'Identical settings with different seeds can give excellent or collapsed results. The realistic budget includes several attempts, and the pipeline has to select on samples rather than trusting the last checkpoint.',
    },
    {
      point: 'No likelihood, so no principled evaluation',
      context:
        'Density cannot be evaluated, models cannot be compared by likelihood, and anomaly detection has to go through a reconstruction proxy. The exact thing a normalizing flow provides is the thing this gives up.',
    },
    {
      point: 'Superseded for most generative work',
      context:
        'Diffusion produces better diversity and trains stably, and has taken over image synthesis. GANs remain competitive where single-pass generation is required, and it is worth being clear that this is now a narrower niche.',
    },
  ],

  relatedSlugs: ['wgan-conditional-gan', 'vae', 'ddpm', 'normalizing-flows', 'autoencoder'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A GAN training loop, transcribed the way the paper reads.

Two networks, one game:

    max_D  log D(x) + log(1 - D(G(z)))       the discriminator's half
    min_G  log(1 - D(G(z)))                  the generator's half, in theory

That second line is NOT what anyone uses, and the substitution is the single
most important detail in the method - see generator_loss below.

There is no quantity being minimized here. The solution is an equilibrium,
not the bottom of anything, which is why no loss curve in this file means
what a loss curve usually means.

Plain loops, no libraries, manual backward passes.
"""

import math
import random

SEED = 17


def sigmoid(value):
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def relu(value):
    return value if value > 0.0 else 0.0


def matvec(weight, vector, bias):
    return [
        bias[i] + sum(w * v for w, v in zip(row, vector))
        for i, row in enumerate(weight)
    ]


def generator_forward(z, params):
    """Noise -> sample. The generator NEVER sees real data directly.

    Everything it learns arrives through the discriminator's gradients, which
    is what makes the training signal non-stationary: the teacher is itself
    being trained.
    """
    hidden = [relu(v) for v in matvec(params['w1'], z, params['b1'])]
    return [math.tanh(v) for v in matvec(params['w2'], hidden, params['b2'])], hidden


def discriminator_forward(x, params):
    """Sample -> probability it is real. Returns the logit too.

    The logit comes back because both losses below are numerically stable
    only when written in terms of it: log(sigmoid(a)) computed by taking the
    logarithm of a sigmoid underflows for a confident discriminator, which is
    exactly the regime that matters.
    """
    hidden = [relu(v) for v in matvec(params['w1'], x, params['b1'])]
    logit = matvec(params['w2'], hidden, params['b2'])[0]
    return sigmoid(logit), logit, hidden


def stable_log_sigmoid(logit):
    """log(sigmoid(a)), without ever forming the sigmoid.

    For a large negative logit sigmoid underflows to zero and its logarithm
    is negative infinity. This form is exact everywhere, and a confident
    discriminator lives exactly in that regime.
    """
    if logit >= 0.0:
        return -math.log1p(math.exp(-logit))
    return logit - math.log1p(math.exp(logit))


def discriminator_loss(real_logit, fake_logit):
    """-log D(x) - log(1 - D(G(z))). The half that is uncomplicated."""
    return -stable_log_sigmoid(real_logit) - stable_log_sigmoid(-fake_logit)


def generator_loss(fake_logit, saturating=False):
    """THE detail that matters.

    Theory says minimize log(1 - D(G(z))). In practice that is unusable: when
    the generator is poor the discriminator is confident, the term saturates,
    and the gradient reaching the generator is essentially ZERO - so it learns
    slowest exactly when it most needs to learn.

    The non-saturating form maximizes log D(G(z)) instead. Same fixed point,
    strong gradient when the discriminator is winning. It is not a bound and
    not an approximation; it is a substitution that works, and the gap between
    the written theory and the used practice is unusually wide here.
    """
    if saturating:
        return stable_log_sigmoid(-fake_logit)  # the theoretical form
    return -stable_log_sigmoid(fake_logit)      # the one everyone uses


def discriminator_gradient_wrt_input(x, params, target):
    """dL/dx through the discriminator. This is the ONLY channel by which the
    generator learns anything at all."""
    probability, _, hidden = discriminator_forward(x, params)
    output_delta = probability - target

    hidden_delta = [
        output_delta * params['w2'][0][j] * (1.0 if hidden[j] > 0.0 else 0.0)
        for j in range(len(hidden))
    ]
    return [
        sum(hidden_delta[j] * params['w1'][j][k] for j in range(len(hidden)))
        for k in range(len(x))
    ]


def train_step(real_batch, generator, discriminator, latent_dim, rate, rng):
    """One alternating step. Order matters: discriminator first.

    The discriminator must be at least somewhat competent before its gradients
    are worth anything to the generator - updating the generator against a
    random discriminator is pushing against noise.
    """
    # --- discriminator: two passes, because it sees both distributions ---
    for x in real_batch:
        _, logit, hidden = discriminator_forward(x, discriminator)
        delta = sigmoid(logit) - 1.0  # target 1 for real
        update_discriminator(x, hidden, delta, discriminator, rate)

    fakes = []
    for _ in real_batch:
        z = [rng.gauss(0.0, 1.0) for _ in range(latent_dim)]
        sample, hidden = generator_forward(z, generator)
        fakes.append((z, sample, hidden))

        _, logit, d_hidden = discriminator_forward(sample, discriminator)
        delta = sigmoid(logit) - 0.0  # target 0 for fake
        update_discriminator(sample, d_hidden, delta, discriminator, rate)

    # --- generator: one pass, through the discriminator ---
    for z, sample, g_hidden in fakes:
        # Non-saturating: target the generator's samples at 1, so the gradient
        # is strong precisely when the discriminator is confident they are 0.
        input_gradient = discriminator_gradient_wrt_input(sample, discriminator, 1.0)
        update_generator(z, g_hidden, sample, input_gradient, generator, rate)


def update_discriminator(x, hidden, delta, params, rate):
    for j in range(len(hidden)):
        params['w2'][0][j] -= rate * delta * hidden[j]
    params['b2'][0] -= rate * delta

    for j in range(len(hidden)):
        if hidden[j] <= 0.0:
            continue
        hidden_delta = delta * params['w2'][0][j]
        for k in range(len(x)):
            params['w1'][j][k] -= rate * hidden_delta * x[k]
        params['b1'][j] -= rate * hidden_delta


def update_generator(z, hidden, sample, input_gradient, params, rate):
    # Through the output tanh, then back into the generator's weights.
    output_delta = [
        input_gradient[i] * (1.0 - sample[i] * sample[i])
        for i in range(len(sample))
    ]

    for i in range(len(output_delta)):
        for j in range(len(hidden)):
            params['w2'][i][j] -= rate * output_delta[i] * hidden[j]
        params['b2'][i] -= rate * output_delta[i]

    for j in range(len(hidden)):
        if hidden[j] <= 0.0:
            continue
        hidden_delta = sum(
            output_delta[i] * params['w2'][i][j] for i in range(len(output_delta))
        )
        for k in range(len(z)):
            params['w1'][j][k] -= rate * hidden_delta * z[k]
        params['b1'][j] -= rate * hidden_delta


def count_distinct_modes(samples, tolerance=0.1):
    """The diagnostic nothing else provides.

    Mode collapse is INVISIBLE in both losses: a generator producing three
    outputs forever has a perfectly healthy-looking loss curve. Counting
    distinct outputs is trivial and is the only thing that reveals it.
    """
    modes = []
    for sample in samples:
        if not any(
            max(abs(a - b) for a, b in zip(sample, mode)) < tolerance
            for mode in modes
        ):
            modes.append(sample)
    return len(modes)


def discriminator_accuracy(real_batch, fake_batch, params):
    """The balance metric, and the only monitoring that means anything.

    Around 0.5 is healthy. Near 1.0 means the discriminator has won and the
    generator is receiving no usable gradient - which is invisible in the
    losses, because at the theoretical optimum both are constants and a dead
    run looks exactly like a converged one.
    """
    correct = sum(1 for x in real_batch if discriminator_forward(x, params)[0] > 0.5)
    correct += sum(1 for x in fake_batch if discriminator_forward(x, params)[0] <= 0.5)
    return correct / (len(real_batch) + len(fake_batch))
`,
        profile:
          'O(B * (C_G + 2 * C_D)) per full step — one generator pass and two discriminator passes, since the discriminator sees both distributions. Illustrative, not a measured benchmark: roughly twice a comparable non-adversarial model per step, and far more in wall clock because the required step count is high and unpredictable.',
      },

      'make-it-right': {
        code: `"""The same loop, with the game structure made explicit and monitored.

Two things change, and neither is about the arithmetic. The two players
become separate objects with their own optimizers, because they are separate
learners with separate objectives and coupling them in one structure is how
the balance problem gets hidden. And the diagnostics that actually work -
discriminator accuracy and mode coverage - become part of the training loop
rather than an afterthought, because the losses genuinely tell you nothing.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple, Sequence


class GeneratorLossForm(Enum):
    """Which generator objective to use.

    SATURATING is what the paper derives; NON_SATURATING is what everybody
    uses. They share a fixed point and they are NOT the same objective, and
    being explicit about the substitution is the point of making this a type.
    """

    SATURATING = 'saturating'
    NON_SATURATING = 'non-saturating'


class TrainingCollapsed(RuntimeError):
    """Raised when the discriminator has won decisively.

    Its own type because the consequence is specific and invisible in the
    losses: once the discriminator is confident, the gradient reaching the
    generator vanishes and training has effectively stopped. At the
    theoretical optimum both losses are constants, so a dead run and a
    converged one produce identical curves.
    """


class ModeCollapse(RuntimeError):
    """Raised when generated diversity has collapsed.

    Its own type because nothing in the objective rewards diversity: a
    generator producing three outputs forever has a perfectly healthy loss
    curve, and only an explicit count reveals it.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


def stable_log_sigmoid(logit: float) -> float:
    """log(sigmoid(a)) without ever forming the sigmoid.

    For a large negative logit the sigmoid underflows to zero and its
    logarithm is negative infinity. This form is exact everywhere — and a
    confident discriminator lives exactly in that regime, so this is
    correctness rather than polish.
    """
    if logit >= 0.0:
        return -math.log1p(math.exp(-logit))
    return logit - math.log1p(math.exp(logit))


class GameLosses(NamedTuple):
    """Both losses AND the accuracy.

    The accuracy is bundled in deliberately: the losses alone are not
    interpretable, so returning them without the balance metric invites
    exactly the mistake this model punishes.
    """

    discriminator: float
    generator: float
    discriminator_accuracy: float

    def balanced(self, tolerance: float = 0.2) -> bool:
        """Around one half is healthy. Near one means the generator has
        stopped receiving signal, which no loss value will show."""
        return abs(self.discriminator_accuracy - 0.5) < tolerance


@dataclass(frozen=True)
class GameConfig:
    """Frozen, because the balance settings define the dynamics."""

    latent_dimension: int
    data_dimension: int
    discriminator_steps: int = 1
    generator_loss: GeneratorLossForm = GeneratorLossForm.NON_SATURATING
    label_smoothing: float = 0.1
    collapse_accuracy: float = 0.95
    minimum_modes: int = 8

    def __post_init__(self) -> None:
        if self.latent_dimension < 1 or self.data_dimension < 1:
            raise ShapeMismatch('both dimensions must be positive')
        if not 0.0 <= self.label_smoothing < 0.5:
            raise ShapeMismatch('label smoothing must lie in [0, 0.5)')
        if self.generator_loss is GeneratorLossForm.SATURATING:
            # Not refused, because it is the theoretically correct form and
            # worth being able to demonstrate — but it is the reason a GAN
            # appears not to train at all, so it is worth flagging.
            pass

    @property
    def real_target(self) -> float:
        """Label smoothing: target 0.9 rather than 1.0 for real data.

        Keeps the discriminator from becoming arbitrarily confident, which is
        what starves the generator of gradient.
        """
        return 1.0 - self.label_smoothing


class Player:
    """One network with its own parameters and its own objective.

    Separate objects because they ARE separate learners: different losses,
    often different learning rates, and a balance between them that has to be
    managed. Bundling them into one structure is how that balance gets hidden.
    """

    def __init__(self, weights: dict[str, list], learning_rate: float) -> None:
        self._weights = weights
        self._learning_rate = learning_rate

    @property
    def learning_rate(self) -> float:
        return self._learning_rate

    @property
    def weights(self) -> dict[str, list]:
        return self._weights


@dataclass
class DiversityMonitor:
    """Tracks distinct outputs across training.

    Mode collapse is invisible in every loss, so this is not optional
    instrumentation — it is the only signal that the generator has stopped
    covering the distribution.
    """

    history: list[int] = field(default_factory=list)

    def record(self, samples: Sequence[Sequence[float]], tolerance: float = 0.1) -> int:
        modes: list[Sequence[float]] = []
        for sample in samples:
            if not any(
                max(abs(a - b) for a, b in zip(sample, mode)) < tolerance
                for mode in modes
            ):
                modes.append(sample)
        self.history.append(len(modes))
        return len(modes)

    def collapsing(self, minimum: int, window: int = 5) -> bool:
        if len(self.history) < window:
            return False
        return max(self.history[-window:]) < minimum


class AdversarialGame:
    """The two players and the alternation between them."""

    def __init__(
        self,
        generator: Player,
        discriminator: Player,
        config: GameConfig,
        seed: int = 17,
    ) -> None:
        self._generator = generator
        self._discriminator = discriminator
        self._config = config
        self._rng = random.Random(seed)
        self._diversity = DiversityMonitor()

    def sample_latents(self, count: int) -> list[list[float]]:
        """Fresh noise every step.

        A fixed latent set would be memorized rather than learned from — the
        generator would learn a lookup table from those specific codes.
        """
        return [
            [self._rng.gauss(0.0, 1.0) for _ in range(self._config.latent_dimension)]
            for _ in range(count)
        ]

    def discriminator_loss(self, real_logits: Sequence[float], fake_logits: Sequence[float]) -> float:
        """-log D(x) - log(1 - D(G(z))), with smoothed real targets."""
        target = self._config.real_target
        real = -math.fsum(
            target * stable_log_sigmoid(logit)
            + (1.0 - target) * stable_log_sigmoid(-logit)
            for logit in real_logits
        ) / len(real_logits)
        fake = -math.fsum(stable_log_sigmoid(-logit) for logit in fake_logits) / len(fake_logits)
        return real + fake

    def generator_loss(self, fake_logits: Sequence[float]) -> float:
        """The substitution that makes the method work at all.

        The saturating form has near-zero gradient exactly when the
        discriminator is confident — which is at the start of training, so
        the generator learns slowest when it most needs to learn. The
        non-saturating form has the same fixed point and a strong gradient in
        that regime. It is a substitution, not an approximation.
        """
        if self._config.generator_loss is GeneratorLossForm.SATURATING:
            return math.fsum(stable_log_sigmoid(-logit) for logit in fake_logits) / len(fake_logits)
        return -math.fsum(stable_log_sigmoid(logit) for logit in fake_logits) / len(fake_logits)

    @staticmethod
    def discriminator_accuracy(
        real_logits: Sequence[float], fake_logits: Sequence[float]
    ) -> float:
        """The balance metric, and the only monitoring that means anything.

        Around 0.5 is healthy. Near 1.0 means the discriminator has won and
        the generator receives no usable gradient — which is invisible in the
        losses, because at the theoretical optimum both are constants and a
        dead run looks exactly like a converged one.
        """
        correct = sum(1 for logit in real_logits if logit > 0.0)
        correct += sum(1 for logit in fake_logits if logit <= 0.0)
        return correct / (len(real_logits) + len(fake_logits))

    def assert_healthy(
        self, losses: GameLosses, samples: Sequence[Sequence[float]]
    ) -> None:
        """Guard clauses for the two failures that no loss reveals."""
        if losses.discriminator_accuracy > self._config.collapse_accuracy:
            raise TrainingCollapsed(
                f'discriminator accuracy is {losses.discriminator_accuracy:.2f}; '
                'the generator is receiving no usable gradient and training has '
                'effectively stopped'
            )

        self._diversity.record(samples)
        if self._diversity.collapsing(self._config.minimum_modes):
            raise ModeCollapse(
                f'fewer than {self._config.minimum_modes} distinct outputs across '
                'recent checks; the generator has collapsed and no loss will say so'
            )
`,
        rationale:
          'Two changes, and neither is about the arithmetic. The two players become separate objects with their own learning rates, because they genuinely are separate learners with separate objectives and a balance between them that has to be managed — bundling them into one structure is how that balance gets hidden. The second is that the diagnostics which actually work become part of the training loop rather than an afterthought, because the losses genuinely tell you nothing: at the theoretical optimum both are constants, so a dead run and a converged one produce identical curves. Discriminator accuracy is therefore bundled into the loss return type rather than offered separately, since returning the losses alone invites exactly the mistake this model punishes, and both failures that no loss reveals — the discriminator winning decisively and mode collapse — become guard clauses with their own exception types. The generator loss form becomes an explicit enum rather than a boolean, because the saturating and non-saturating versions are not the same objective and naming the substitution is the point. Log-sigmoid is computed without ever forming the sigmoid, which is correctness rather than polish: a confident discriminator lives precisely in the regime where the naive form underflows.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: the diversity check is O(samples squared) in the mode comparison, which is affordable at a few hundred samples and is the reason it runs on a schedule rather than every step.',
      },

      'make-it-fast': {
        code: `"""Batched, fused, and with the one thing that CANNOT be fused named.

The structural observation is a negative one worth stating first: the two
players' updates cannot be merged. The generator's gradient flows THROUGH the
discriminator, so the discriminator must be updated before the generator uses
it, and that dependency is real - unlike almost every other optimization in
this reference, there is no rearrangement that removes it.

What does batch:
  1. Both networks become GEMMs over the batch.
  2. The discriminator's two passes concatenate into ONE: real and fake are
     stacked, so the layer sees a double batch and BLAS is called once
     instead of twice with half-sized operands.
  3. Losses and accuracy come from logits in one fused pass, never by
     forming probabilities and taking logarithms of them.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def stable_log_sigmoid(logits: NDArray[np.float32]) -> NDArray[np.float32]:
    """log(sigmoid(a)) elementwise, without ever forming the sigmoid.

    Written as a branchless select on the sign: for a large negative logit
    the sigmoid underflows to zero and its logarithm is negative infinity,
    and a confident discriminator lives exactly in that regime. This is
    correctness rather than polish.
    """
    positive = logits >= 0.0
    safe = np.where(positive, -logits, logits)
    np.exp(safe, out=safe)
    np.log1p(safe, out=safe)
    return np.where(positive, -safe, logits - safe)


class BatchedMlp:
    """Two layers, evaluated for a whole batch. Both players use this."""

    def __init__(self, w1: NDArray[np.float32], b1: NDArray[np.float32],
                 w2: NDArray[np.float32], b2: NDArray[np.float32],
                 output_activation: str) -> None:
        self._w1 = np.ascontiguousarray(w1, dtype=FLOAT)
        self._b1 = np.ascontiguousarray(b1, dtype=FLOAT)
        self._w2 = np.ascontiguousarray(w2, dtype=FLOAT)
        self._b2 = np.ascontiguousarray(b2, dtype=FLOAT)
        self._output_activation = output_activation

    def forward(
        self, x: NDArray[np.float32]
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Returns the output and the hidden activations for the backward pass."""
        hidden = x @ self._w1
        hidden += self._b1
        # In-place ReLU: the hidden state is the widest tensor here and a
        # temporary per layer is the largest avoidable allocation.
        np.maximum(hidden, 0.0, out=hidden)

        output = hidden @ self._w2
        output += self._b2
        if self._output_activation == 'tanh':
            np.tanh(output, out=output)
        # The discriminator returns a LOGIT, deliberately: every loss below
        # is stable only when written in terms of it.
        return output, hidden


def discriminator_step(
    discriminator: BatchedMlp,
    real: NDArray[np.float32],
    fake: NDArray[np.float32],
    real_target: float,
) -> tuple[float, float]:
    """One discriminator update over BOTH distributions in a single pass.

    The two passes concatenate: the discriminator sees a double batch, so
    BLAS is called once on a large operand rather than twice on half-sized
    ones. On small batches that difference is most of the step cost.
    """
    stacked = np.concatenate((real, fake), axis=0)
    logits, _ = discriminator.forward(stacked)
    logits = logits.ravel()

    split = real.shape[0]
    real_logits, fake_logits = logits[:split], logits[split:]

    # Label smoothing: target 0.9 rather than 1.0, which keeps the
    # discriminator from becoming arbitrarily confident and starving the
    # generator of gradient.
    real_term = real_target * stable_log_sigmoid(real_logits) + (
        1.0 - real_target
    ) * stable_log_sigmoid(-real_logits)
    loss = float(-real_term.mean() - stable_log_sigmoid(-fake_logits).mean())

    # Accuracy from the SAME logits, in the same pass. The balance metric is
    # the only monitoring that means anything here, so computing it should
    # never cost a second forward pass.
    accuracy = float(
        ((real_logits > 0.0).sum() + (fake_logits <= 0.0).sum())
        / logits.size
    )
    return loss, accuracy


def generator_loss(fake_logits: NDArray[np.float32], non_saturating: bool = True) -> float:
    """The substitution that makes the method work at all.

    The saturating form has near-zero gradient exactly when the discriminator
    is confident - which is at the start of training, so the generator learns
    slowest when it most needs to learn. The non-saturating form has the same
    fixed point and a strong gradient in that regime. A substitution, not an
    approximation.
    """
    if non_saturating:
        return float(-stable_log_sigmoid(fake_logits).mean())
    return float(stable_log_sigmoid(-fake_logits).mean())


def mode_coverage(
    samples: NDArray[np.float32], tolerance: float = 0.1, reference: int = 10
) -> float:
    """Distinct-output fraction, as one pairwise distance computation.

    Mode collapse is INVISIBLE in both losses: a generator producing three
    outputs forever has a perfectly healthy loss curve. This is the only
    signal, so it is worth computing properly rather than sampling by eye.

    ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2, so the whole pairwise distance
    matrix is one GEMM plus two broadcasts - no loop over pairs.
    """
    norms = np.einsum('ij,ij->i', samples, samples, optimize=True)
    distances = samples @ samples.T
    distances *= -2.0
    distances += norms
    distances += norms[:, None]

    # A greedy count over the thresholded adjacency: each sample joins an
    # existing mode if it is within tolerance of any member.
    close = distances < tolerance * tolerance
    assigned = np.zeros(len(samples), dtype=bool)
    modes = 0
    for index in range(len(samples)):
        if assigned[index]:
            continue
        assigned |= close[index]
        modes += 1

    return modes / reference


def latent_batch(
    count: int, dimension: int, rng: np.random.Generator
) -> NDArray[np.float32]:
    """Fresh noise every step.

    A fixed latent set would be memorized rather than learned from - the
    generator would learn a lookup table from those specific codes.
    """
    return rng.standard_normal((count, dimension), dtype=FLOAT)


def fixed_probe(dimension: int, count: int, seed: int) -> NDArray[np.float32]:
    """A FIXED latent batch, kept for monitoring only.

    Generating from the same latents every epoch and looking at the output is
    the cheapest and most reliable GAN monitoring there is, and there is no
    substitute - because the losses are constants at equilibrium and a
    healthy run looks identical to a dead one.
    """
    return np.random.default_rng(seed).standard_normal((count, dimension), dtype=FLOAT)
`,
        rationale:
          'The structural observation here is a negative one and it is worth stating first: the two players’ updates cannot be merged, because the generator’s gradient flows through the discriminator and the discriminator must therefore be updated before the generator consumes it. That dependency is real, and unlike almost every other optimization in this reference there is no rearrangement that removes it — so the win has to come from elsewhere. It comes from three places. Both networks become GEMMs over the batch with in-place activations, since the hidden state is the widest tensor and a temporary per layer is the largest avoidable allocation. The discriminator’s two passes concatenate into one: real and fake are stacked so the layer sees a double batch and BLAS is called once on a large operand rather than twice on half-sized ones, which on modest batches is most of the step cost. And every loss and the accuracy are computed from logits in one pass, never by forming probabilities and taking logarithms of them — the log-sigmoid is a branchless select on the sign, which is correctness rather than polish because a confident discriminator lives precisely where the naive form underflows. Mode coverage becomes a single pairwise GEMM via the norm expansion, since it is the only signal that reveals collapse and it should be cheap enough to run often.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Both networks are GEMMs over the batch, the discriminator sees real and fake stacked into one operand, and mode coverage becomes a single pairwise product via the squared-norm expansion.',
            tradeoff: 'The pairwise distance matrix for mode coverage is quadratic in sample count, so the diversity check has to run on a schedule rather than every step — which means collapse is detected late rather than as it starts.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Concatenating the discriminator’s two distributions into one forward pass halves the number of BLAS calls and doubles their operand size, which matters most at the modest batch sizes GANs typically use.',
            tradeoff: 'Stacking means real and fake share a normalization pass wherever batch normalization is used, which leaks batch statistics between the two distributions and is a known source of subtle training pathology.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The ReLU, the output tanh and the log-sigmoid transform all write through existing buffers, so a forward pass allocates only its output.',
            tradeoff: 'The pre-activation is destroyed by the in-place ReLU, so diagnosing a dead generator layer — where every unit is clamped at zero and no gradient flows — needs an unfused pass.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Loss and discriminator accuracy come from the same logits in one traversal, so the balance metric that is the only meaningful monitoring never costs a second forward pass.',
            tradeoff: 'Fusing the two means the accuracy is computed on the smoothed-target logits rather than on a clean evaluation batch, so it inherits whatever the label smoothing does to the decision boundary.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'A full step becomes one double-batch discriminator GEMM pair and one generator GEMM pair. Illustrative, not a measured benchmark: the alternation itself cannot be parallelized, so the achievable speedup is bounded by what happens inside each half rather than across them.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A GAN training loop, transcribed the way the paper reads.
//
// Two networks, one game:
//   max_D  log D(x) + log(1 - D(G(z)))     the discriminator's half
//   min_G  log(1 - D(G(z)))                the generator's half, in theory
//
// That second line is NOT what anyone uses, and the substitution is the single
// most important detail in the method - see GeneratorLoss below.
//
// There is no quantity being minimized here. The solution is an equilibrium,
// not the bottom of anything, which is why no loss value in this file means
// what a loss value usually means.
//
// Vector-of-vector, manual backward passes.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

struct MlpParams {
  Matrix w1;
  Vector b1;
  Matrix w2;
  Vector b2;
};

double Sigmoid(double value) {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

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

// Noise -> sample. The generator NEVER sees real data directly.
//
// Everything it learns arrives through the discriminator's gradients, which is
// what makes the training signal non-stationary: the teacher is itself being
// trained.
Vector GeneratorForward(const Vector& z, const MlpParams& params, Vector* hidden) {
  *hidden = MatVec(params.w1, z, params.b1);
  for (std::size_t i = 0; i < hidden->size(); ++i) {
    (*hidden)[i] = Relu((*hidden)[i]);
  }

  Vector output = MatVec(params.w2, *hidden, params.b2);
  for (std::size_t i = 0; i < output.size(); ++i) {
    output[i] = std::tanh(output[i]);
  }
  return output;
}

// Sample -> LOGIT, deliberately not a probability.
//
// Every loss below is numerically stable only when written in terms of the
// logit: log(sigmoid(a)) computed by taking the logarithm of a sigmoid
// underflows for a confident discriminator, which is exactly the regime that
// matters.
double DiscriminatorForward(const Vector& x, const MlpParams& params, Vector* hidden) {
  *hidden = MatVec(params.w1, x, params.b1);
  for (std::size_t i = 0; i < hidden->size(); ++i) {
    (*hidden)[i] = Relu((*hidden)[i]);
  }
  return MatVec(params.w2, *hidden, params.b2)[0];
}

// log(sigmoid(a)), without ever forming the sigmoid.
//
// For a large negative logit the sigmoid underflows to zero and its logarithm
// is negative infinity. This form is exact everywhere, and a confident
// discriminator lives exactly in that regime.
double StableLogSigmoid(double logit) {
  if (logit >= 0.0) {
    return -std::log1p(std::exp(-logit));
  }
  return logit - std::log1p(std::exp(logit));
}

// -log D(x) - log(1 - D(G(z))). The half that is uncomplicated.
double DiscriminatorLoss(double real_logit, double fake_logit) {
  return -StableLogSigmoid(real_logit) - StableLogSigmoid(-fake_logit);
}

// THE detail that matters.
//
// Theory says minimize log(1 - D(G(z))). In practice that is unusable: when
// the generator is poor the discriminator is confident, the term saturates,
// and the gradient reaching the generator is essentially ZERO - so it learns
// slowest exactly when it most needs to learn.
//
// The non-saturating form maximizes log D(G(z)) instead. Same fixed point,
// strong gradient when the discriminator is winning. It is not a bound and not
// an approximation; it is a substitution that works, and the gap between the
// written theory and the used practice is unusually wide here.
double GeneratorLoss(double fake_logit, bool saturating = false) {
  if (saturating) {
    return StableLogSigmoid(-fake_logit);  // the theoretical form
  }
  return -StableLogSigmoid(fake_logit);    // the one everyone uses
}

// dL/dx through the discriminator.
//
// This is the ONLY channel by which the generator learns anything at all.
Vector DiscriminatorInputGradient(const Vector& x, const MlpParams& params, double target) {
  Vector hidden;
  const double logit = DiscriminatorForward(x, params, &hidden);
  const double output_delta = Sigmoid(logit) - target;

  Vector gradient(x.size(), 0.0);
  for (std::size_t j = 0; j < hidden.size(); ++j) {
    if (hidden[j] <= 0.0) {
      continue;
    }
    const double hidden_delta = output_delta * params.w2[0][j];
    for (std::size_t k = 0; k < x.size(); ++k) {
      gradient[k] += hidden_delta * params.w1[j][k];
    }
  }
  return gradient;
}

void UpdateDiscriminator(const Vector& x, const Vector& hidden, double delta,
                         MlpParams* params, double rate) {
  for (std::size_t j = 0; j < hidden.size(); ++j) {
    params->w2[0][j] -= rate * delta * hidden[j];
  }
  params->b2[0] -= rate * delta;

  for (std::size_t j = 0; j < hidden.size(); ++j) {
    if (hidden[j] <= 0.0) {
      continue;
    }
    const double hidden_delta = delta * params->w2[0][j];
    for (std::size_t k = 0; k < x.size(); ++k) {
      params->w1[j][k] -= rate * hidden_delta * x[k];
    }
    params->b1[j] -= rate * hidden_delta;
  }
}

// The diagnostic nothing else provides.
//
// Mode collapse is INVISIBLE in both losses: a generator producing three
// outputs forever has a perfectly healthy loss curve. Counting distinct
// outputs is trivial and is the only thing that reveals it.
std::size_t CountDistinctModes(const Matrix& samples, double tolerance = 0.1) {
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

// The balance metric, and the only monitoring that means anything.
//
// Around 0.5 is healthy. Near 1.0 means the discriminator has won and the
// generator is receiving no usable gradient - which is invisible in the
// losses, because at the theoretical optimum both are constants and a dead run
// looks exactly like a converged one.
double DiscriminatorAccuracy(const Matrix& real, const Matrix& fake,
                             const MlpParams& params) {
  Vector hidden;
  std::size_t correct = 0;
  for (std::size_t i = 0; i < real.size(); ++i) {
    correct += DiscriminatorForward(real[i], params, &hidden) > 0.0 ? 1 : 0;
  }
  for (std::size_t i = 0; i < fake.size(); ++i) {
    correct += DiscriminatorForward(fake[i], params, &hidden) <= 0.0 ? 1 : 0;
  }
  return static_cast<double>(correct) / static_cast<double>(real.size() + fake.size());
}
`,
        profile:
          'O(B * (C_G + 2 * C_D)) per full step — one generator pass and two discriminator passes, since the discriminator sees both distributions. Illustrative, not a measured benchmark: roughly twice a comparable non-adversarial model per step, and far more in wall clock because the required step count is high and unpredictable.',
      },

      'make-it-right': {
        code: `// The same loop, with the game structure made explicit and monitored.
//
// Two things change, and neither is about the arithmetic. The two players
// become separate objects with their own optimizers, because they are separate
// learners with separate objectives and coupling them in one structure is how
// the balance problem gets hidden. And the diagnostics that actually work -
// discriminator accuracy and mode coverage - become part of the training loop
// rather than an afterthought, because the losses genuinely tell you nothing.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace gan {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the consequence is specific and invisible in the
// losses: once the discriminator is confident, the gradient reaching the
// generator vanishes and training has effectively stopped. At the theoretical
// optimum both losses are constants, so a dead run and a converged one produce
// identical curves.
class TrainingCollapsed : public std::runtime_error {
 public:
  explicit TrainingCollapsed(const std::string& what) : std::runtime_error(what) {}
};

// Its own type because nothing in the objective rewards diversity: a generator
// producing three outputs forever has a perfectly healthy loss curve, and only
// an explicit count reveals it.
class ModeCollapse : public std::runtime_error {
 public:
  explicit ModeCollapse(const std::string& what) : std::runtime_error(what) {}
};

// Which generator objective to use.
//
// kSaturating is what the paper derives; kNonSaturating is what everybody
// uses. They share a fixed point and they are NOT the same objective, and
// being explicit about the substitution is the point of making this a type.
enum class GeneratorLossForm { kSaturating, kNonSaturating };

// log(sigmoid(a)) without ever forming the sigmoid.
//
// For a large negative logit the sigmoid underflows to zero and its logarithm
// is negative infinity. This form is exact everywhere - and a confident
// discriminator lives exactly in that regime, so this is correctness rather
// than polish.
[[nodiscard]] inline double StableLogSigmoid(double logit) noexcept {
  if (logit >= 0.0) {
    return -std::log1p(std::exp(-logit));
  }
  return logit - std::log1p(std::exp(logit));
}

// Both losses AND the accuracy.
//
// The accuracy is bundled in deliberately: the losses alone are not
// interpretable, so returning them without the balance metric invites exactly
// the mistake this model punishes.
struct GameLosses {
  double discriminator{};
  double generator{};
  double discriminator_accuracy{};

  // Around one half is healthy. Near one means the generator has stopped
  // receiving signal, which no loss value will show.
  [[nodiscard]] bool Balanced(double tolerance = 0.2) const noexcept {
    return std::abs(discriminator_accuracy - 0.5) < tolerance;
  }
};

// Frozen configuration, because the balance settings define the dynamics.
struct GameConfig {
  std::size_t latent_dimension{};
  std::size_t data_dimension{};
  std::size_t discriminator_steps{1};
  GeneratorLossForm generator_loss{GeneratorLossForm::kNonSaturating};
  double label_smoothing{0.1};
  double collapse_accuracy{0.95};
  std::size_t minimum_modes{8};

  void Validate() const {
    if (latent_dimension == 0 || data_dimension == 0) {
      throw ShapeMismatch("both dimensions must be positive");
    }
    if (label_smoothing < 0.0 || label_smoothing >= 0.5) {
      throw ShapeMismatch("label smoothing must lie in [0, 0.5)");
    }
  }

  // Label smoothing: target 0.9 rather than 1.0 for real data.
  //
  // Keeps the discriminator from becoming arbitrarily confident, which is
  // what starves the generator of gradient.
  [[nodiscard]] double real_target() const noexcept { return 1.0 - label_smoothing; }
};

// One network with its own parameters and its own objective.
//
// Separate objects because they ARE separate learners: different losses, often
// different learning rates, and a balance between them that has to be managed.
// Bundling them into one structure is how that balance gets hidden.
class Player {
 public:
  Player(std::size_t input_dim, std::size_t hidden_dim, std::size_t output_dim,
         double learning_rate)
      : learning_rate_(learning_rate), input_dim_(input_dim), hidden_dim_(hidden_dim),
        output_dim_(output_dim), w1_(input_dim * hidden_dim, 0.0), b1_(hidden_dim, 0.0),
        w2_(hidden_dim * output_dim, 0.0), b2_(output_dim, 0.0), hidden_(hidden_dim, 0.0) {}

  // Returns the pre-activation output; the caller applies whatever final
  // nonlinearity its role needs, because the discriminator wants a LOGIT and
  // the generator wants a bounded sample.
  void Forward(std::span<const double> x, std::span<double> out) {
    if (x.size() != input_dim_) {
      throw ShapeMismatch("input width does not match the player");
    }

    std::copy(b1_.begin(), b1_.end(), hidden_.begin());
    for (std::size_t j = 0; j < input_dim_; ++j) {
      const double value = x[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = w1_.data() + j * hidden_dim_;
      for (std::size_t i = 0; i < hidden_dim_; ++i) {
        hidden_[i] += value * row[i];
      }
    }
    for (double& value : hidden_) {
      value = value > 0.0 ? value : 0.0;
    }

    std::copy(b2_.begin(), b2_.end(), out.begin());
    for (std::size_t j = 0; j < hidden_dim_; ++j) {
      const double value = hidden_[j];
      if (value == 0.0) {
        continue;
      }
      const double* row = w2_.data() + j * output_dim_;
      for (std::size_t i = 0; i < output_dim_; ++i) {
        out[i] += value * row[i];
      }
    }
  }

  [[nodiscard]] double learning_rate() const noexcept { return learning_rate_; }
  [[nodiscard]] std::span<const double> hidden() const noexcept { return hidden_; }

 private:
  double learning_rate_;
  std::size_t input_dim_;
  std::size_t hidden_dim_;
  std::size_t output_dim_;
  std::vector<double> w1_;  // rule of zero: owning members only
  std::vector<double> b1_;
  std::vector<double> w2_;
  std::vector<double> b2_;
  std::vector<double> hidden_;
};

// Tracks distinct outputs across training.
//
// Mode collapse is invisible in every loss, so this is not optional
// instrumentation - it is the only signal that the generator has stopped
// covering the distribution.
class DiversityMonitor {
 public:
  std::size_t Record(std::span<const double> samples, std::size_t dimension,
                     double tolerance = 0.1) {
    const std::size_t count = samples.size() / dimension;
    std::vector<std::size_t> modes;

    for (std::size_t i = 0; i < count; ++i) {
      const double* candidate = samples.data() + i * dimension;
      bool matched = false;
      for (std::size_t m = 0; m < modes.size() && !matched; ++m) {
        const double* mode = samples.data() + modes[m] * dimension;
        double furthest = 0.0;
        for (std::size_t d = 0; d < dimension; ++d) {
          furthest = std::max(furthest, std::abs(candidate[d] - mode[d]));
        }
        matched = furthest < tolerance;
      }
      if (!matched) {
        modes.push_back(i);
      }
    }

    history_.push_back(modes.size());
    return modes.size();
  }

  [[nodiscard]] bool Collapsing(std::size_t minimum, std::size_t window = 5) const {
    if (history_.size() < window) {
      return false;
    }
    const auto begin = history_.end() - static_cast<long>(window);
    return *std::max_element(begin, history_.end()) < minimum;
  }

 private:
  std::vector<std::size_t> history_;
};

// The two players and the alternation between them.
class AdversarialGame {
 public:
  AdversarialGame(GameConfig config) : config_(config) { config_.Validate(); }

  [[nodiscard]] double DiscriminatorLoss(std::span<const double> real_logits,
                                         std::span<const double> fake_logits) const {
    const double target = config_.real_target();
    double real = 0.0;
    for (const double logit : real_logits) {
      real += target * StableLogSigmoid(logit) +
              (1.0 - target) * StableLogSigmoid(-logit);
    }
    double fake = 0.0;
    for (const double logit : fake_logits) {
      fake += StableLogSigmoid(-logit);
    }
    return -real / static_cast<double>(real_logits.size()) -
           fake / static_cast<double>(fake_logits.size());
  }

  // The substitution that makes the method work at all.
  //
  // The saturating form has near-zero gradient exactly when the discriminator
  // is confident - which is at the start of training, so the generator learns
  // slowest when it most needs to learn. The non-saturating form has the same
  // fixed point and a strong gradient in that regime.
  [[nodiscard]] double GeneratorLoss(std::span<const double> fake_logits) const {
    double total = 0.0;
    for (const double logit : fake_logits) {
      total += config_.generator_loss == GeneratorLossForm::kSaturating
                   ? StableLogSigmoid(-logit)
                   : -StableLogSigmoid(logit);
    }
    return total / static_cast<double>(fake_logits.size());
  }

  // The balance metric, and the only monitoring that means anything.
  [[nodiscard]] static double DiscriminatorAccuracy(std::span<const double> real_logits,
                                                    std::span<const double> fake_logits) {
    std::size_t correct = 0;
    for (const double logit : real_logits) {
      correct += logit > 0.0 ? 1 : 0;
    }
    for (const double logit : fake_logits) {
      correct += logit <= 0.0 ? 1 : 0;
    }
    return static_cast<double>(correct) /
           static_cast<double>(real_logits.size() + fake_logits.size());
  }

  // Guard clauses for the two failures that no loss reveals.
  void AssertHealthy(const GameLosses& losses, std::span<const double> samples) {
    if (losses.discriminator_accuracy > config_.collapse_accuracy) {
      throw TrainingCollapsed(
          "the discriminator has won; the generator is receiving no usable "
          "gradient and training has effectively stopped");
    }

    diversity_.Record(samples, config_.data_dimension);
    if (diversity_.Collapsing(config_.minimum_modes)) {
      throw ModeCollapse(
          "too few distinct outputs across recent checks; the generator has "
          "collapsed and no loss will say so");
    }
  }

 private:
  GameConfig config_;
  DiversityMonitor diversity_;
};

}  // namespace gan
`,
        rationale:
          'Two changes, and neither is about the arithmetic. The two players become separate objects with their own learning rates and their own scratch, because they genuinely are separate learners with separate objectives and a balance between them that has to be managed — bundling them into one structure is how that balance gets hidden. The Forward method deliberately returns a pre-activation, because the discriminator needs a logit for numerical stability and the generator needs a bounded sample, and baking either choice into the shared network would force the other role to undo it. The second change is that the diagnostics which actually work become part of the game object rather than an afterthought, because the losses genuinely tell you nothing: at the theoretical optimum both are constants, so a dead run and a converged one produce identical curves. Discriminator accuracy is therefore bundled into the loss struct rather than offered separately, and both failures that no loss reveals — the discriminator winning decisively and mode collapse — become guard clauses with their own exception types. The generator loss form becomes an enum rather than a boolean, because the two versions are not the same objective and naming the substitution is the point.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics with no per-call allocation, since each player owns its hidden scratch. Illustrative, not a measured benchmark: the diversity check is quadratic in sample count, which is affordable at a few hundred samples and is why it runs on a schedule rather than every step.',
      },

      'make-it-fast': {
        code: `// Batched, fused, and with the one thing that CANNOT be fused named.
//
// The structural observation is a negative one worth stating first: the two
// players' updates cannot be merged. The generator's gradient flows THROUGH
// the discriminator, so the discriminator must be updated before the generator
// uses it, and that dependency is real - unlike almost every other
// optimization in this reference, there is no rearrangement that removes it.
//
// What does batch:
//   1. Both networks become GEMMs over the batch.
//   2. The discriminator's two passes concatenate into ONE: real and fake are
//      stacked, so the layer sees a double batch and BLAS is called once
//      instead of twice with half-sized operands.
//   3. Losses and accuracy come from logits in one fused pass, never by
//      forming probabilities and taking logarithms of them.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace gan {

// log(sigmoid(a)) without ever forming the sigmoid.
//
// Written as a select on the sign: for a large negative logit the sigmoid
// underflows to zero and its logarithm is negative infinity, and a confident
// discriminator lives exactly in that regime. Correctness, not polish.
[[gnu::always_inline]] inline float StableLogSigmoid(float logit) noexcept {
  return logit >= 0.0F ? -std::log1p(std::exp(-logit))
                       : logit - std::log1p(std::exp(logit));
}

// Two layers, evaluated for a whole batch. Both players use this.
class BatchedMlp {
 public:
  BatchedMlp(int max_rows, int input_dim, int hidden_dim, int output_dim)
      : input_dim_(input_dim), hidden_dim_(hidden_dim), output_dim_(output_dim),
        w1_(static_cast<std::size_t>(input_dim) * hidden_dim),
        b1_(static_cast<std::size_t>(hidden_dim)),
        w2_(static_cast<std::size_t>(hidden_dim) * output_dim),
        b2_(static_cast<std::size_t>(output_dim)),
        hidden_(static_cast<std::size_t>(max_rows) * hidden_dim) {}

  // x is (rows x input_dim) row-major. The output is a PRE-ACTIVATION: the
  // discriminator wants a logit and the generator wants a bounded sample, so
  // the final nonlinearity belongs to the caller.
  void Forward(const float* __restrict x, int rows, float* __restrict out) {
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, hidden_dim_,
                input_dim_, 1.0F, x, input_dim_, w1_.data(), hidden_dim_, 0.0F,
                hidden_.data(), hidden_dim_);

    // Fused bias and ReLU in one pass: the pre-activation is never a separate
    // buffer, and the hidden state is the widest tensor in the network.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = hidden_.data() + static_cast<std::size_t>(r) * hidden_dim_;
      for (int h = 0; h < hidden_dim_; ++h) {
        const float value = row[h] + b1_[static_cast<std::size_t>(h)];
        row[h] = value > 0.0F ? value : 0.0F;
      }
    }

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, rows, output_dim_,
                hidden_dim_, 1.0F, hidden_.data(), hidden_dim_, w2_.data(), output_dim_,
                0.0F, out, output_dim_);

#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      float* row = out + static_cast<std::size_t>(r) * output_dim_;
      for (int o = 0; o < output_dim_; ++o) {
        row[o] += b2_[static_cast<std::size_t>(o)];
      }
    }
  }

  [[nodiscard]] std::span<float> hidden() noexcept { return hidden_; }

 private:
  int input_dim_;
  int hidden_dim_;
  int output_dim_;
  std::vector<float> w1_;
  std::vector<float> b1_;
  std::vector<float> w2_;
  std::vector<float> b2_;
  std::vector<float> hidden_;
};

struct GameLosses {
  float discriminator{};
  float generator{};
  float discriminator_accuracy{};
};

// One discriminator evaluation over BOTH distributions in a single pass.
//
// The two passes concatenate: the discriminator sees a double batch, so BLAS
// is called once on a large operand rather than twice on half-sized ones. On
// the modest batches GANs typically use, that difference is most of the cost.
inline GameLosses EvaluateGame(BatchedMlp& discriminator,
                               const float* __restrict real,
                               const float* __restrict fake, int rows, int dimension,
                               float real_target, bool non_saturating,
                               std::vector<float>* stacked,
                               std::vector<float>* logits) {
  stacked->resize(static_cast<std::size_t>(2 * rows) * dimension);
  std::copy(real, real + static_cast<std::size_t>(rows) * dimension, stacked->begin());
  std::copy(fake, fake + static_cast<std::size_t>(rows) * dimension,
            stacked->begin() + static_cast<long>(rows) * dimension);

  logits->resize(static_cast<std::size_t>(2 * rows));
  discriminator.Forward(stacked->data(), 2 * rows, logits->data());

  // Loss and accuracy from the SAME logits in one fused reduction. The balance
  // metric is the only monitoring that means anything here, so computing it
  // should never cost a second forward pass.
  double real_term = 0.0;
  double fake_term = 0.0;
  int correct = 0;

#pragma omp parallel for reduction(+ : real_term, fake_term, correct) schedule(static)
  for (int i = 0; i < 2 * rows; ++i) {
    const float logit = (*logits)[static_cast<std::size_t>(i)];
    if (i < rows) {
      // Label smoothing: target 0.9 rather than 1.0, which keeps the
      // discriminator from becoming arbitrarily confident and starving the
      // generator of gradient.
      real_term += real_target * StableLogSigmoid(logit) +
                   (1.0F - real_target) * StableLogSigmoid(-logit);
      correct += logit > 0.0F ? 1 : 0;
    } else {
      fake_term += StableLogSigmoid(-logit);
      correct += logit <= 0.0F ? 1 : 0;
    }
  }

  GameLosses losses;
  losses.discriminator =
      static_cast<float>(-(real_term + fake_term) / static_cast<double>(rows));

  // The substitution that makes the method work at all: the saturating form
  // has near-zero gradient exactly when the discriminator is confident.
  double generator_term = 0.0;
#pragma omp parallel for reduction(+ : generator_term) schedule(static)
  for (int i = rows; i < 2 * rows; ++i) {
    const float logit = (*logits)[static_cast<std::size_t>(i)];
    generator_term += non_saturating ? -StableLogSigmoid(logit)
                                     : StableLogSigmoid(-logit);
  }
  losses.generator = static_cast<float>(generator_term / static_cast<double>(rows));
  losses.discriminator_accuracy =
      static_cast<float>(correct) / static_cast<float>(2 * rows);
  return losses;
}

// Distinct-mode count, as one pairwise distance computation.
//
// Mode collapse is INVISIBLE in both losses: a generator producing three
// outputs forever has a perfectly healthy loss curve. This is the only signal,
// so it is worth computing properly rather than sampling by eye.
//
// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2, so the whole pairwise matrix is one
// GEMM plus two broadcasts - no loop over pairs.
[[nodiscard]] inline std::size_t CountDistinctModes(const float* __restrict samples,
                                                    int count, int dimension,
                                                    float tolerance,
                                                    std::vector<float>* scratch) {
  std::vector<float> norms(static_cast<std::size_t>(count), 0.0F);
#pragma omp parallel for schedule(static)
  for (int i = 0; i < count; ++i) {
    const float* row = samples + static_cast<std::size_t>(i) * dimension;
    float total = 0.0F;
    for (int d = 0; d < dimension; ++d) {
      total += row[d] * row[d];
    }
    norms[static_cast<std::size_t>(i)] = total;
  }

  scratch->resize(static_cast<std::size_t>(count) * count);
  cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, count, count, dimension, -2.0F,
              samples, dimension, samples, dimension, 0.0F, scratch->data(), count);

  const float threshold = tolerance * tolerance;
  std::vector<bool> assigned(static_cast<std::size_t>(count), false);
  std::size_t modes = 0;

  for (int i = 0; i < count; ++i) {
    if (assigned[static_cast<std::size_t>(i)]) {
      continue;
    }
    ++modes;
    const float* row = scratch->data() + static_cast<std::size_t>(i) * count;
    for (int j = 0; j < count; ++j) {
      const float distance = row[j] + norms[static_cast<std::size_t>(i)] +
                             norms[static_cast<std::size_t>(j)];
      if (distance < threshold) {
        assigned[static_cast<std::size_t>(j)] = true;
      }
    }
  }
  return modes;
}

}  // namespace gan
`,
        rationale:
          'The structural observation here is a negative one and it is worth stating first: the two players’ updates cannot be merged, because the generator’s gradient flows through the discriminator and the discriminator must therefore be updated before the generator consumes it. That dependency is real, and unlike almost every other optimization in this reference there is no rearrangement that removes it — so the win has to come from elsewhere. It comes from three places. Both networks become GEMMs over the batch with bias and ReLU fused into one pass, so the pre-activation is never a separate buffer. The discriminator’s two evaluations concatenate into one: real and fake are stacked so BLAS is called once on a double-sized operand rather than twice on half-sized ones, which at the modest batch sizes GANs use is most of the step cost. And every loss plus the accuracy comes from the same logits in one fused reduction, never by forming probabilities and taking logarithms of them — the log-sigmoid selects on the sign, which is correctness rather than polish because a confident discriminator lives precisely where the naive form underflows. Mode counting becomes a single pairwise GEMM via the squared-norm expansion, since it is the only signal that reveals collapse.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Both networks are GEMMs over the batch, the discriminator sees real and fake stacked into one operand, and the pairwise mode-distance matrix is one GEMM via the norm expansion.',
            tradeoff: 'The pairwise matrix is quadratic in sample count, so the diversity check has to run on a schedule rather than every step — which means collapse is detected late rather than as it begins.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias and ReLU happen in one traversal, and both losses plus the accuracy come from a single reduction over the logits, so the balance metric never costs a second forward pass.',
            tradeoff: 'The accuracy is computed on the smoothed-target logits rather than on a clean evaluation batch, so it inherits whatever the label smoothing does to the decision boundary.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The fused activation, the bias pass and the loss reductions are all row-independent, and the reductions use named accumulators rather than a critical section.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS calls, so threading both competes for bandwidth — and the alternation between players means half the machine is idle for half the step whatever the threading does.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The fused bias-ReLU pass and the loss reductions are contiguous, restrict-qualified and of known trip count, which is everything the vectorizer needs for the transcendental in the log-sigmoid.',
            tradeoff: 'The vectorized exponential differs in low-order bits across targets, and because a GAN is already irreproducible across seeds, that removes the last route to bit-identical comparison between machines.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'A full step becomes one double-batch discriminator GEMM pair and one generator GEMM pair. Illustrative, not a measured benchmark: the alternation itself cannot be parallelized, so the achievable speedup is bounded by what happens inside each half rather than across them.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A GAN training loop, transcribed the way the paper reads.
//
// Two networks, one game:
//   max_D  log D(x) + log(1 - D(G(z)))     the discriminator's half
//   min_G  log(1 - D(G(z)))                the generator's half, in theory
//
// That second line is NOT what anyone uses, and the substitution is the single
// most important detail in the method - see generator_loss below.
//
// There is no quantity being minimized here. The solution is an equilibrium,
// not the bottom of anything, which is why no loss value in this file means
// what a loss value usually means.
//
// Vec-of-Vec, index loops, manual backward passes.

struct MlpParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
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

/// Noise -> sample. The generator NEVER sees real data directly.
///
/// Everything it learns arrives through the discriminator's gradients, which
/// is what makes the training signal non-stationary: the teacher is itself
/// being trained.
fn generator_forward(z: &[f64], params: &MlpParams) -> (Vec<f64>, Vec<f64>) {
    let mut hidden = matvec(&params.w1, z, &params.b1);
    for value in hidden.iter_mut() {
        *value = relu(*value);
    }

    let mut output = matvec(&params.w2, &hidden, &params.b2);
    for value in output.iter_mut() {
        *value = value.tanh();
    }
    (output, hidden)
}

/// Sample -> LOGIT, deliberately not a probability.
///
/// Every loss below is numerically stable only when written in terms of the
/// logit: log(sigmoid(a)) computed by taking the logarithm of a sigmoid
/// underflows for a confident discriminator, which is exactly the regime that
/// matters.
fn discriminator_forward(x: &[f64], params: &MlpParams) -> (f64, Vec<f64>) {
    let mut hidden = matvec(&params.w1, x, &params.b1);
    for value in hidden.iter_mut() {
        *value = relu(*value);
    }
    (matvec(&params.w2, &hidden, &params.b2)[0], hidden)
}

/// log(sigmoid(a)), without ever forming the sigmoid.
///
/// For a large negative logit the sigmoid underflows to zero and its logarithm
/// is negative infinity. This form is exact everywhere, and a confident
/// discriminator lives exactly in that regime.
fn stable_log_sigmoid(logit: f64) -> f64 {
    if logit >= 0.0 {
        -(-logit).exp().ln_1p()
    } else {
        logit - logit.exp().ln_1p()
    }
}

/// -log D(x) - log(1 - D(G(z))). The half that is uncomplicated.
fn discriminator_loss(real_logit: f64, fake_logit: f64) -> f64 {
    -stable_log_sigmoid(real_logit) - stable_log_sigmoid(-fake_logit)
}

/// THE detail that matters.
///
/// Theory says minimize log(1 - D(G(z))). In practice that is unusable: when
/// the generator is poor the discriminator is confident, the term saturates,
/// and the gradient reaching the generator is essentially ZERO - so it learns
/// slowest exactly when it most needs to learn.
///
/// The non-saturating form maximizes log D(G(z)) instead. Same fixed point,
/// strong gradient when the discriminator is winning. It is not a bound and
/// not an approximation; it is a substitution that works, and the gap between
/// the written theory and the used practice is unusually wide here.
fn generator_loss(fake_logit: f64, saturating: bool) -> f64 {
    if saturating {
        stable_log_sigmoid(-fake_logit) // the theoretical form
    } else {
        -stable_log_sigmoid(fake_logit) // the one everyone uses
    }
}

/// dL/dx through the discriminator.
///
/// This is the ONLY channel by which the generator learns anything at all.
fn discriminator_input_gradient(x: &[f64], params: &MlpParams, target: f64) -> Vec<f64> {
    let (logit, hidden) = discriminator_forward(x, params);
    let output_delta = sigmoid(logit) - target;

    let mut gradient = vec![0.0_f64; x.len()];
    for j in 0..hidden.len() {
        if hidden[j] <= 0.0 {
            continue;
        }
        let hidden_delta = output_delta * params.w2[0][j];
        for k in 0..x.len() {
            gradient[k] += hidden_delta * params.w1[j][k];
        }
    }
    gradient
}

fn update_discriminator(
    x: &[f64],
    hidden: &[f64],
    delta: f64,
    params: &mut MlpParams,
    rate: f64,
) {
    for j in 0..hidden.len() {
        params.w2[0][j] -= rate * delta * hidden[j];
    }
    params.b2[0] -= rate * delta;

    for j in 0..hidden.len() {
        if hidden[j] <= 0.0 {
            continue;
        }
        let hidden_delta = delta * params.w2[0][j];
        for k in 0..x.len() {
            params.w1[j][k] -= rate * hidden_delta * x[k];
        }
        params.b1[j] -= rate * hidden_delta;
    }
}

/// The diagnostic nothing else provides.
///
/// Mode collapse is INVISIBLE in both losses: a generator producing three
/// outputs forever has a perfectly healthy loss curve. Counting distinct
/// outputs is trivial and is the only thing that reveals it.
fn count_distinct_modes(samples: &[Vec<f64>], tolerance: f64) -> usize {
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

/// The balance metric, and the only monitoring that means anything.
///
/// Around 0.5 is healthy. Near 1.0 means the discriminator has won and the
/// generator is receiving no usable gradient - which is invisible in the
/// losses, because at the theoretical optimum both are constants and a dead
/// run looks exactly like a converged one.
fn discriminator_accuracy(real: &[Vec<f64>], fake: &[Vec<f64>], params: &MlpParams) -> f64 {
    let correct = real
        .iter()
        .filter(|x| discriminator_forward(x, params).0 > 0.0)
        .count()
        + fake
            .iter()
            .filter(|x| discriminator_forward(x, params).0 <= 0.0)
            .count();
    correct as f64 / (real.len() + fake.len()) as f64
}
`,
        profile:
          'O(B * (C_G + 2 * C_D)) per full step — one generator pass and two discriminator passes, since the discriminator sees both distributions. Illustrative, not a measured benchmark: roughly twice a comparable non-adversarial model per step, and far more in wall clock because the required step count is high and unpredictable.',
      },

      'make-it-right': {
        code: `//! The same loop, with the game structure made explicit and monitored.
//!
//! Two things change, and neither is about the arithmetic. The two players
//! become separate types with their own optimizers, because they are separate
//! learners with separate objectives and coupling them in one structure is how
//! the balance problem gets hidden. And the diagnostics that actually work -
//! discriminator accuracy and mode coverage - become part of the training loop
//! rather than an afterthought, because the losses genuinely tell you nothing.

use std::fmt;

/// Width of the noise prior.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct LatentDim(pub usize);

/// Width of the data space.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct DataDim(pub usize);

/// Which generator objective to use.
///
/// \`Saturating\` is what the paper derives; \`NonSaturating\` is what everybody
/// uses. They share a fixed point and they are NOT the same objective, and
/// being explicit about the substitution is the point of making this a type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GeneratorLossForm {
    Saturating,
    NonSaturating,
}

#[derive(Debug, PartialEq)]
pub enum GameError {
    /// The discriminator has won decisively.
    ///
    /// Its own variant because the consequence is specific and invisible in
    /// the losses: once the discriminator is confident, the gradient reaching
    /// the generator vanishes and training has effectively stopped. At the
    /// theoretical optimum both losses are constants, so a dead run and a
    /// converged one produce identical curves.
    TrainingCollapsed { accuracy: f64 },
    /// Generated diversity has collapsed.
    ///
    /// Its own variant because nothing in the objective rewards diversity: a
    /// generator producing three outputs forever has a perfectly healthy loss
    /// curve, and only an explicit count reveals it.
    ModeCollapse { modes: usize, minimum: usize },
    /// A label-smoothing value outside the usable range.
    InvalidSmoothing(f64),
    /// A zero dimension somewhere.
    DegenerateDimension,
}

impl fmt::Display for GameError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TrainingCollapsed { accuracy } => write!(
                f,
                "discriminator accuracy is {accuracy:.2}; the generator is receiving \
                 no usable gradient and training has effectively stopped"
            ),
            Self::ModeCollapse { modes, minimum } => write!(
                f,
                "only {modes} distinct outputs against a minimum of {minimum}; the \
                 generator has collapsed and no loss will say so"
            ),
            Self::InvalidSmoothing(value) => {
                write!(f, "label smoothing {value} must lie in [0, 0.5)")
            }
            Self::DegenerateDimension => write!(f, "dimensions must be positive"),
        }
    }
}

impl std::error::Error for GameError {}

/// log(sigmoid(a)) without ever forming the sigmoid.
///
/// For a large negative logit the sigmoid underflows to zero and its logarithm
/// is negative infinity. This form is exact everywhere - and a confident
/// discriminator lives exactly in that regime, so this is correctness rather
/// than polish.
#[inline]
pub fn stable_log_sigmoid(logit: f64) -> f64 {
    if logit >= 0.0 {
        -(-logit).exp().ln_1p()
    } else {
        logit - logit.exp().ln_1p()
    }
}

/// Both losses AND the accuracy.
///
/// The accuracy is bundled in deliberately: the losses alone are not
/// interpretable, so returning them without the balance metric invites exactly
/// the mistake this model punishes.
#[derive(Debug, Clone, Copy)]
pub struct GameLosses {
    pub discriminator: f64,
    pub generator: f64,
    pub discriminator_accuracy: f64,
}

impl GameLosses {
    /// Around one half is healthy. Near one means the generator has stopped
    /// receiving signal, which no loss value will show.
    pub fn balanced(&self, tolerance: f64) -> bool {
        (self.discriminator_accuracy - 0.5).abs() < tolerance
    }
}

/// Frozen configuration, because the balance settings define the dynamics.
#[derive(Debug, Clone, Copy)]
pub struct GameConfig {
    pub latent: LatentDim,
    pub data: DataDim,
    pub discriminator_steps: usize,
    pub generator_loss: GeneratorLossForm,
    pub label_smoothing: f64,
    pub collapse_accuracy: f64,
    pub minimum_modes: usize,
}

impl GameConfig {
    pub fn validate(&self) -> Result<(), GameError> {
        if self.latent.0 == 0 || self.data.0 == 0 {
            return Err(GameError::DegenerateDimension);
        }
        if !(0.0..0.5).contains(&self.label_smoothing) {
            return Err(GameError::InvalidSmoothing(self.label_smoothing));
        }
        Ok(())
    }

    /// Label smoothing: target 0.9 rather than 1.0 for real data.
    ///
    /// Keeps the discriminator from becoming arbitrarily confident, which is
    /// what starves the generator of gradient.
    pub fn real_target(&self) -> f64 {
        1.0 - self.label_smoothing
    }
}

/// One network with its own parameters and its own objective.
///
/// Separate types because they ARE separate learners: different losses, often
/// different learning rates, and a balance between them that has to be
/// managed. Bundling them into one structure is how that balance gets hidden.
pub struct Player {
    w1: Vec<f64>,
    b1: Vec<f64>,
    w2: Vec<f64>,
    b2: Vec<f64>,
    input_dim: usize,
    hidden_dim: usize,
    output_dim: usize,
    learning_rate: f64,
    hidden: Vec<f64>,
}

impl Player {
    pub fn new(
        input_dim: usize,
        hidden_dim: usize,
        output_dim: usize,
        learning_rate: f64,
    ) -> Self {
        Self {
            w1: vec![0.0; input_dim * hidden_dim],
            b1: vec![0.0; hidden_dim],
            w2: vec![0.0; hidden_dim * output_dim],
            b2: vec![0.0; output_dim],
            input_dim,
            hidden_dim,
            output_dim,
            learning_rate,
            hidden: vec![0.0; hidden_dim],
        }
    }

    /// Returns the PRE-ACTIVATION output.
    ///
    /// The discriminator wants a logit and the generator wants a bounded
    /// sample, so the final nonlinearity belongs to the caller — baking either
    /// choice in here would force the other role to undo it.
    pub fn forward(&mut self, x: &[f64], out: &mut [f64]) {
        self.hidden.copy_from_slice(&self.b1);
        for (j, &value) in x.iter().enumerate().take(self.input_dim) {
            if value == 0.0 {
                continue;
            }
            let row = &self.w1[j * self.hidden_dim..(j + 1) * self.hidden_dim];
            for (slot, &w) in self.hidden.iter_mut().zip(row) {
                *slot += value * w;
            }
        }
        for value in self.hidden.iter_mut() {
            *value = value.max(0.0);
        }

        out[..self.output_dim].copy_from_slice(&self.b2);
        for (j, &value) in self.hidden.iter().enumerate() {
            if value == 0.0 {
                continue;
            }
            let row = &self.w2[j * self.output_dim..(j + 1) * self.output_dim];
            for (slot, &w) in out.iter_mut().zip(row) {
                *slot += value * w;
            }
        }
    }

    pub fn learning_rate(&self) -> f64 {
        self.learning_rate
    }
}

/// Tracks distinct outputs across training.
///
/// Mode collapse is invisible in every loss, so this is not optional
/// instrumentation - it is the only signal that the generator has stopped
/// covering the distribution.
#[derive(Default)]
pub struct DiversityMonitor {
    history: Vec<usize>,
}

impl DiversityMonitor {
    pub fn record(&mut self, samples: &[f64], dimension: usize, tolerance: f64) -> usize {
        let mut modes: Vec<&[f64]> = Vec::new();
        for candidate in samples.chunks_exact(dimension) {
            let matched = modes.iter().any(|mode| {
                candidate
                    .iter()
                    .zip(mode.iter())
                    .map(|(a, b)| (a - b).abs())
                    .fold(0.0_f64, f64::max)
                    < tolerance
            });
            if !matched {
                modes.push(candidate);
            }
        }
        self.history.push(modes.len());
        modes.len()
    }

    pub fn collapsing(&self, minimum: usize, window: usize) -> bool {
        if self.history.len() < window {
            return false;
        }
        self.history[self.history.len() - window..]
            .iter()
            .all(|&count| count < minimum)
    }
}

/// The two players and the alternation between them.
pub struct AdversarialGame {
    config: GameConfig,
    diversity: DiversityMonitor,
}

impl AdversarialGame {
    pub fn new(config: GameConfig) -> Result<Self, GameError> {
        config.validate()?;
        Ok(Self { config, diversity: DiversityMonitor::default() })
    }

    pub fn discriminator_loss(&self, real_logits: &[f64], fake_logits: &[f64]) -> f64 {
        let target = self.config.real_target();
        let real: f64 = real_logits
            .iter()
            .map(|&logit| {
                target * stable_log_sigmoid(logit)
                    + (1.0 - target) * stable_log_sigmoid(-logit)
            })
            .sum::<f64>()
            / real_logits.len() as f64;
        let fake: f64 = fake_logits
            .iter()
            .map(|&logit| stable_log_sigmoid(-logit))
            .sum::<f64>()
            / fake_logits.len() as f64;
        -real - fake
    }

    /// The substitution that makes the method work at all.
    ///
    /// The saturating form has near-zero gradient exactly when the
    /// discriminator is confident - which is at the start of training, so the
    /// generator learns slowest when it most needs to learn. The
    /// non-saturating form has the same fixed point and a strong gradient in
    /// that regime.
    pub fn generator_loss(&self, fake_logits: &[f64]) -> f64 {
        fake_logits
            .iter()
            .map(|&logit| match self.config.generator_loss {
                GeneratorLossForm::Saturating => stable_log_sigmoid(-logit),
                GeneratorLossForm::NonSaturating => -stable_log_sigmoid(logit),
            })
            .sum::<f64>()
            / fake_logits.len() as f64
    }

    /// The balance metric, and the only monitoring that means anything.
    pub fn discriminator_accuracy(real_logits: &[f64], fake_logits: &[f64]) -> f64 {
        let correct = real_logits.iter().filter(|&&logit| logit > 0.0).count()
            + fake_logits.iter().filter(|&&logit| logit <= 0.0).count();
        correct as f64 / (real_logits.len() + fake_logits.len()) as f64
    }

    /// Guard clauses for the two failures that no loss reveals.
    pub fn assert_healthy(
        &mut self,
        losses: &GameLosses,
        samples: &[f64],
    ) -> Result<(), GameError> {
        if losses.discriminator_accuracy > self.config.collapse_accuracy {
            return Err(GameError::TrainingCollapsed {
                accuracy: losses.discriminator_accuracy,
            });
        }

        let modes = self.diversity.record(samples, self.config.data.0, 0.1);
        if self.diversity.collapsing(self.config.minimum_modes, 5) {
            return Err(GameError::ModeCollapse {
                modes,
                minimum: self.config.minimum_modes,
            });
        }
        Ok(())
    }
}
`,
        rationale:
          'Two changes, and neither is about the arithmetic. The two players become separate types with their own learning rates and their own scratch, because they genuinely are separate learners with separate objectives and a balance between them that has to be managed — bundling them into one structure is how that balance gets hidden. The forward method deliberately returns a pre-activation, because the discriminator needs a logit for numerical stability while the generator needs a bounded sample, and baking either choice into the shared network would force the other role to undo it. The second change is that the diagnostics which actually work become part of the game rather than an afterthought, because the losses genuinely tell you nothing: at the theoretical optimum both are constants, so a dead run and a converged one produce identical curves. Discriminator accuracy is bundled into the loss struct rather than offered separately, and both failures no loss reveals — the discriminator winning decisively and mode collapse — become checked conditions returning their own error variants. The generator loss form becomes an enum rather than a boolean, because the two versions are not the same objective and naming the substitution is the point.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics with no per-call allocation, since each player owns its hidden scratch. Illustrative, not a measured benchmark: the diversity check is quadratic in sample count, which is affordable at a few hundred samples and is why it runs on a schedule rather than every step.',
      },

      'make-it-fast': {
        code: `//! Batched, fused, and with the one thing that CANNOT be fused named.
//!
//! The structural observation is a negative one worth stating first: the two
//! players' updates cannot be merged. The generator's gradient flows THROUGH
//! the discriminator, so the discriminator must be updated before the
//! generator uses it, and that dependency is real - unlike almost every other
//! optimization in this reference, there is no rearrangement that removes it.
//!
//! What does batch:
//!   1. Both networks become matrix products over the batch.
//!   2. The discriminator's two passes concatenate into ONE: real and fake are
//!      stacked, so the layer sees a double batch and BLAS is called once
//!      instead of twice with half-sized operands.
//!   3. Losses and accuracy come from logits in one fused pass, never by
//!      forming probabilities and taking logarithms of them.

use ndarray::{s, Array1, Array2, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// log(sigmoid(a)) without ever forming the sigmoid.
///
/// A select on the sign: for a large negative logit the sigmoid underflows to
/// zero and its logarithm is negative infinity, and a confident discriminator
/// lives exactly in that regime. Correctness, not polish.
#[inline]
pub fn stable_log_sigmoid(logit: f32) -> f32 {
    if logit >= 0.0 {
        -(-logit).exp().ln_1p()
    } else {
        logit - logit.exp().ln_1p()
    }
}

/// Two layers, evaluated for a whole batch. Both players use this.
pub struct BatchedMlp {
    w1: Array2<f32>,
    b1: Array1<f32>,
    w2: Array2<f32>,
    b2: Array1<f32>,
    /// Scratch sized once, so a forward pass allocates only its output.
    hidden: Array2<f32>,
}

impl BatchedMlp {
    pub fn new(max_rows: usize, w1: Array2<f32>, b1: Array1<f32>, w2: Array2<f32>, b2: Array1<f32>) -> Self {
        let hidden_width = b1.len();
        Self { w1, b1, w2, b2, hidden: Array2::zeros((max_rows, hidden_width)) }
    }

    /// \`x\` is (rows, input_dim). The output is a PRE-ACTIVATION: the
    /// discriminator wants a logit and the generator wants a bounded sample,
    /// so the final nonlinearity belongs to the caller.
    pub fn forward(&mut self, x: ArrayView2<'_, f32>) -> Array2<f32> {
        let rows = x.shape()[0];
        let mut hidden = self.hidden.slice_mut(s![..rows, ..]);
        hidden.assign(&x.dot(&self.w1));

        // Fused bias and ReLU in one parallel pass: the pre-activation is
        // never a separate buffer, and the hidden state is the widest tensor.
        Zip::from(hidden.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.b1.iter()) {
                *value = (*value + bias).max(0.0);
            }
        });

        let mut out = hidden.dot(&self.w2);
        Zip::from(out.axis_iter_mut(Axis(0))).par_for_each(|mut row| {
            for (value, &bias) in row.iter_mut().zip(self.b2.iter()) {
                *value += bias;
            }
        });
        out
    }
}

pub struct GameLosses {
    pub discriminator: f32,
    pub generator: f32,
    pub discriminator_accuracy: f32,
}

/// One discriminator evaluation over BOTH distributions in a single pass.
///
/// The two passes concatenate: the discriminator sees a double batch, so BLAS
/// is called once on a large operand rather than twice on half-sized ones. On
/// the modest batches GANs typically use, that difference is most of the cost.
pub fn evaluate_game(
    discriminator: &mut BatchedMlp,
    real: ArrayView2<'_, f32>,
    fake: ArrayView2<'_, f32>,
    real_target: f32,
    non_saturating: bool,
) -> GameLosses {
    let rows = real.shape()[0];
    let dimension = real.shape()[1];

    // Capacity known exactly: one allocation for the stacked operand.
    let mut stacked = Array2::<f32>::zeros((2 * rows, dimension));
    stacked.slice_mut(s![..rows, ..]).assign(&real);
    stacked.slice_mut(s![rows.., ..]).assign(&fake);

    let logits = discriminator.forward(stacked.view());
    let flat = logits.into_shape(2 * rows).expect("one logit per row");

    // Loss and accuracy from the SAME logits in one parallel reduction. The
    // balance metric is the only monitoring that means anything here, so
    // computing it should never cost a second forward pass.
    let (real_term, correct_real) = flat
        .slice(s![..rows])
        .as_slice()
        .expect("contiguous")
        .par_iter()
        .map(|&logit| {
            // Label smoothing: target 0.9 rather than 1.0, which keeps the
            // discriminator from becoming arbitrarily confident.
            let term = real_target * stable_log_sigmoid(logit)
                + (1.0 - real_target) * stable_log_sigmoid(-logit);
            (f64::from(term), usize::from(logit > 0.0))
        })
        .reduce(|| (0.0, 0), |a, b| (a.0 + b.0, a.1 + b.1));

    let (fake_term, correct_fake, generator_term) = flat
        .slice(s![rows..])
        .as_slice()
        .expect("contiguous")
        .par_iter()
        .map(|&logit| {
            // The substitution that makes the method work at all: the
            // saturating form has near-zero gradient exactly when the
            // discriminator is confident.
            let generator = if non_saturating {
                -stable_log_sigmoid(logit)
            } else {
                stable_log_sigmoid(-logit)
            };
            (
                f64::from(stable_log_sigmoid(-logit)),
                usize::from(logit <= 0.0),
                f64::from(generator),
            )
        })
        .reduce(|| (0.0, 0, 0.0), |a, b| (a.0 + b.0, a.1 + b.1, a.2 + b.2));

    GameLosses {
        discriminator: ((-real_term - fake_term) / rows as f64) as f32,
        generator: (generator_term / rows as f64) as f32,
        discriminator_accuracy: (correct_real + correct_fake) as f32 / (2 * rows) as f32,
    }
}

/// Distinct-mode count, as one pairwise distance computation.
///
/// Mode collapse is INVISIBLE in both losses: a generator producing three
/// outputs forever has a perfectly healthy loss curve. This is the only
/// signal, so it is worth computing properly rather than sampling by eye.
///
/// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2, so the whole pairwise matrix is
/// one product plus two broadcasts - no loop over pairs.
pub fn count_distinct_modes(samples: ArrayView2<'_, f32>, tolerance: f32) -> usize {
    let count = samples.shape()[0];
    let norms: Vec<f32> = samples
        .axis_iter(Axis(0))
        .into_par_iter()
        .map(|row| row.iter().map(|v| v * v).sum())
        .collect();

    let mut distances = samples.dot(&samples.t());
    distances *= -2.0;

    let threshold = tolerance * tolerance;
    let mut assigned = vec![false; count];
    let mut modes = 0;

    for i in 0..count {
        if assigned[i] {
            continue;
        }
        modes += 1;
        let row = distances.row(i);
        for j in 0..count {
            if row[j] + norms[i] + norms[j] < threshold {
                assigned[j] = true;
            }
        }
    }
    modes
}

/// A FIXED latent batch, kept for monitoring only.
///
/// Generating from the same latents every epoch and looking at the output is
/// the cheapest and most reliable GAN monitoring there is, and there is no
/// substitute - because the losses are constants at equilibrium and a healthy
/// run looks identical to a dead one.
pub fn fixed_probe(count: usize, dimension: usize, normals: &[f32]) -> Array2<f32> {
    Array2::from_shape_vec((count, dimension), normals[..count * dimension].to_vec())
        .expect("probe shape matches the supplied normals")
}
`,
        rationale:
          'The structural observation here is a negative one and it is worth stating first: the two players’ updates cannot be merged, because the generator’s gradient flows through the discriminator and the discriminator must therefore be updated before the generator consumes it. That dependency is real, and unlike almost every other optimization in this reference there is no rearrangement that removes it — so the win has to come from elsewhere. It comes from three places. Both networks become matrix products over the batch with bias and ReLU fused into one parallel pass, so the pre-activation is never a separate buffer. The discriminator’s two evaluations concatenate into one stacked operand, so BLAS is called once on a double-sized matrix rather than twice on half-sized ones, which at the modest batch sizes GANs use is most of the step cost. And every loss plus the accuracy comes from the same logits in one parallel reduction, never by forming probabilities and taking logarithms of them — the log-sigmoid selects on the sign, which is correctness rather than polish because a confident discriminator lives precisely where the naive form underflows. Mode counting becomes a single pairwise product via the squared-norm expansion, since it is the only signal that reveals collapse.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Both networks are dense products over the batch, the discriminator sees real and fake stacked into one operand, and the pairwise mode-distance matrix is one product via the norm expansion.',
            tradeoff: 'Binds the build to a system BLAS, and the pairwise matrix is quadratic in sample count — so the diversity check runs on a schedule rather than every step, which means collapse is detected late rather than as it begins.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The fused activation, the bias pass and both loss reductions are row-independent, and the reductions fold parallel partials rather than locking.',
            tradeoff: 'These passes are memory-bound and interleave with the BLAS calls, and the alternation between players means half the machine is idle for half the step whatever the threading does.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The stacked operand, the per-sample norms and the mode assignment all have exactly known lengths, so none reallocates while being filled.',
            tradeoff: 'Stacking real and fake means materializing a double-sized copy of the batch every step, which the two-pass form avoids entirely — the copy is the price of the single larger BLAS call.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The logits are sliced into real and fake halves as contiguous runs, so both reductions walk memory linearly and the parallel iterators see flat slices.',
            tradeoff: 'That contiguity depends on the stacking order, so reordering the concatenation for any reason silently turns both reductions into strided walks with no error anywhere.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'A full step becomes one double-batch discriminator product pair and one generator product pair. Illustrative, not a measured benchmark: the alternation itself cannot be parallelized, so the achievable speedup is bounded by what happens inside each half rather than across them.',
      },
    },
  },
};
