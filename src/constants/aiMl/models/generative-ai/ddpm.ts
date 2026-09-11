import type { AiMlModel } from '../../types';

/**
 * DDPM — the model that replaced adversarial training for image generation,
 * and did it by making generation a sequence of easy problems.
 *
 * Included as the fourth corner of the generative set alongside the VAE,
 * flows and GANs: it inherits the VAE's variational framing, discards the
 * learned encoder, and buys sample quality with inference compute rather
 * than with training instability.
 */
export const DDPM: AiMlModel = {
  slug: 'ddpm',
  name: 'Denoising Diffusion (DDPM)',
  aliases: ['DDPM', 'Diffusion model', 'Denoising diffusion', 'DDIM', 'Latent diffusion'],
  category: 'generative-ai',
  group: 'diffusion',
  kind: 'model',

  paradigms: ['self-supervised', 'unsupervised'],
  taskTypes: ['generation', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Self-supervised in the most literal sense available: the training target is noise that the training loop itself added, so the label is manufactured and known exactly. That is why diffusion training is so stable compared with everything adversarial — the supervision is a known quantity rather than the output of another network that is also learning.',

  intuition:
    'Generating an image in one step is hard; removing a little noise from a slightly noisy image is easy. So define a process that gradually destroys data into pure noise over a thousand steps, train one network to undo a single step of it, and then run that network a thousand times starting from noise. Nothing about any individual step is difficult, which is why this trains stably where a GAN does not — and the price is paid exactly where you would expect, at inference, where a thousand sequential network evaluations produce one sample.',

  objective: {
    kind: 'elbo',
    expression: {
      formula:
        '\\mathcal{L}_{\\text{simple}} = \\mathbb{E}_{t,\\mathbf{x}_0,\\boldsymbol{\\epsilon}}\\Bigl[\\bigl\\lVert \\boldsymbol{\\epsilon} - \\boldsymbol{\\epsilon}_\\theta\\bigl(\\sqrt{\\bar{\\alpha}_t}\\mathbf{x}_0 + \\sqrt{1-\\bar{\\alpha}_t}\\,\\boldsymbol{\\epsilon},\\ t\\bigr)\\bigr\\rVert^2\\Bigr]',
      symbols: [
        { symbol: '\\boldsymbol{\\epsilon}', meaning: 'the noise actually added — the training target, known exactly because the loop added it' },
        { symbol: '\\boldsymbol{\\epsilon}_\\theta', meaning: 'the network: given a noisy input and a timestep, predict which noise was added' },
        { symbol: '\\bar{\\alpha}_t', meaning: 'cumulative signal retention at step t; the closed form that lets any t be sampled directly' },
        { symbol: 't \\sim U[1,T]', meaning: 'a random timestep per example — the model learns every noise level from one loss' },
      ],
    },
    reading:
      'The objective is a mean squared error on noise, which is why this is classified as an ELBO with a caveat rather than without one. The derivation is a genuine variational bound of exactly the VAE’s form — a sum of KL terms over a fixed, non-learned encoder — and each term reduces to a weighted noise-prediction error. Then the weighting is dropped. The simplified objective above is what everybody trains, it produces much better samples, and it is no longer a bound on the likelihood: the reweighting emphasizes the middle noise levels where perceptually important structure lives, at the cost of the guarantee. That substitution is worth naming rather than glossing, because it is the same shape of move as the GAN’s non-saturating loss — the correct objective was replaced by one that works better, and the theory no longer strictly applies.',
  },

  optimization: {
    method: 'Adam on the simplified noise-prediction loss, with the noise schedule fixed in advance and never learned',
    updateRule: {
      formula:
        'q(\\mathbf{x}_t \\mid \\mathbf{x}_0) = \\mathcal{N}\\bigl(\\sqrt{\\bar{\\alpha}_t}\\mathbf{x}_0,\\ (1-\\bar{\\alpha}_t)\\mathbf{I}\\bigr), \\qquad \\mathbf{x}_{t-1} = \\frac{1}{\\sqrt{\\alpha_t}}\\Bigl(\\mathbf{x}_t - \\frac{1-\\alpha_t}{\\sqrt{1-\\bar{\\alpha}_t}}\\boldsymbol{\\epsilon}_\\theta\\Bigr) + \\sigma_t \\mathbf{z}',
      symbols: [
        { symbol: '\\bar{\\alpha}_t = \\prod_{s\\le t}\\alpha_s', meaning: 'the cumulative product; its closed form is what makes training parallel across timesteps' },
        { symbol: '\\sigma_t \\mathbf{z}', meaning: 'noise injected during sampling — set it to zero and the sampler becomes deterministic, which is DDIM' },
        { symbol: '\\alpha_t', meaning: 'per-step signal retention, from a fixed schedule; cosine beats linear on most data' },
        { symbol: 'T', meaning: 'the number of diffusion steps; training uses all of them, sampling need not' },
      ],
    },
    rationale:
      'The single most important structural fact is that the forward process has a closed form: because the noise accumulates as a product of Gaussians, the state at any timestep can be sampled directly from the clean data without simulating the intervening steps. That is what makes training embarrassingly parallel — each example draws one random timestep and one noise vector, and no sequential rollout ever happens during training. All the sequential cost is deferred to sampling, which is the whole cost profile of the model in one sentence. The schedule itself is fixed rather than learned, and the choice matters more than it looks: a linear schedule destroys information too quickly at the end, so most of the compute is spent on steps where the input is already indistinguishable from noise, and a cosine schedule redistributes it toward the levels that carry structure. Sampling variance is the other free parameter — setting it to zero gives a deterministic sampler whose trajectory can be traversed in far fewer steps, which is the basis of every fast-sampling method.',
    hyperparameters: [
      { name: 'diffusion steps T', role: 'Length of the forward process. More gives a gentler per-step problem; sampling need not use all of them', typicalRange: '1000 to 4000' },
      { name: 'noise schedule', role: 'Cosine or linear. Linear wastes capacity on steps that are already pure noise; cosine is the near-universal default', typicalRange: 'cosine / linear' },
      { name: 'sampling steps', role: 'The quality-versus-latency dial, adjustable at inference with no retraining — the most useful knob in the model', typicalRange: '10 to 1000' },
      { name: 'sampling variance', role: 'Zero gives a deterministic sampler and far fewer steps for the same quality; nonzero gives more diversity', typicalRange: '0 (DDIM) to full (DDPM)' },
      { name: 'guidance scale', role: 'How hard conditioning is enforced at sampling time. Higher means more prompt adherence and less diversity', typicalRange: '1.0 to 15.0' },
      { name: 'prediction target', role: 'Noise, the clean sample, or a velocity parameterization. Noise is standard; velocity is better at the extreme noise levels', typicalRange: 'epsilon / x0 / v' },
    ],
    convergence:
      'Genuinely well-behaved, and this is the entry where that can be said without qualification. There is one loss, it is a mean squared error against a known target, it decreases, and it correlates with sample quality — which after the GAN entry is worth stating plainly, because the contrast is the whole reason diffusion displaced adversarial training. The failures that remain are not optimization failures. A badly chosen schedule wastes capacity on noise levels that carry no information, which shows up as a model that trains fine and samples poorly. Too few sampling steps produces visible artifacts that no amount of further training fixes, because the problem is at inference. And guidance turned up too high collapses diversity — every sample becomes an exaggerated version of the condition, which looks like quality improving and is not.',
    complexity:
      'Training is O(1) network evaluations per example, since the closed-form forward process means no rollout — the same cost as any supervised regression. Sampling is O(S) sequential evaluations for S steps, which at a thousand steps is three orders of magnitude more expensive per sample than a GAN. That asymmetry is the defining cost characteristic, and every practical advance in this area has been about reducing S.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Condition the denoiser on an encoding of the history and diffuse over the forecast window, so each sampled trajectory is a draw from the predictive distribution. The same machinery handles imputation without modification: fix the observed values at every denoising step and let the model fill the rest, which is a natural fit because the model already works by repeatedly refining a partially-correct signal.',
        where: [
          'Probabilistic multivariate forecasting where the joint distribution over horizons and series matters',
          'Time-series imputation, where the conditioning-by-fixing trick makes it a direct application rather than an adaptation',
          'Forecasting with genuinely multimodal predictive distributions that a Gaussian head cannot represent',
          'Scenario generation, where a set of diverse plausible futures is the deliverable',
        ],
        why: 'Two real advantages over a quantile forecaster. The predictive distribution is unconstrained in shape, so genuine multimodality survives rather than being collapsed into an interval; and sampled trajectories are jointly consistent across both time and series, which is what any decision aggregating over a horizon actually needs. Imputation falling out for free is a third. Against it: sampling cost is severe — hundreds of sequential network evaluations per trajectory, times however many trajectories you need — which for a large panel is prohibitive on any short planning cycle. And on most business series the predictive distribution is close enough to well-behaved that a quantile model captures what matters for a tiny fraction of the cost. The honest trigger is demonstrated multimodality or a genuine need for joint samples.',
        featurization: [
          'Normalize per series, since the diffusion process assumes a roughly standard-scale target and an unscaled series wastes the schedule',
          'Condition every denoising step on the history encoding, not only the first, or the conditioning washes out along the trajectory',
          'Use a deterministic sampler with strided steps for production, since that is where the cost is and quality degrades gracefully',
          'For imputation, re-fix the observed values at every step rather than only at the start, or the model drifts away from them',
        ],
        evaluation:
          'Continuous ranked probability score and joint log-likelihood on held-out windows against a quantile baseline, with rolling-origin backtesting. Report the sampling-step count alongside every number, because quality and cost are on a dial here and a result quoted without its position on that dial is not comparable.',
        pitfalls: [
          'Sampling cost making a large panel infeasible within the planning cycle',
          'Conditioning only the first step, so the history influence fades along the trajectory',
          'Too few sampling steps producing artifacts that look like model error',
          'Assuming a multimodal predictive distribution without demonstrating one, which is the only justification for the cost',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Noise the input partway — not to pure noise, but to an intermediate level — then denoise it back and compare. The model pulls the result toward the distribution it learned, so normal inputs return roughly unchanged and anomalous ones are visibly corrected toward normality. The difference between input and reconstruction is both the score and, for images, a map showing where the abnormality is.',
        where: [
          'Medical imaging, where the reconstruction shows what the scan would have looked like without the pathology',
          'Industrial visual inspection where defects are unknown in advance and localization matters',
          'Settings needing an interpretable correction rather than a scalar score',
          'Domains where a likelihood-trained autoencoder produces reconstructions too blurry to compare against',
        ],
        why: 'The partial-noising trick is genuinely elegant and the noise level is a meaningful sensitivity knob rather than an arbitrary threshold: noise a little and only sharp local anomalies are corrected, noise a lot and global structure gets rewritten too. The reconstructions are also sharp, which matters because a blurry reconstruction makes every fine detail look anomalous. Against it, the cost is the same objection as everywhere else in this entry — denoising is a multi-step sequential process, so scoring one input costs tens of network evaluations against an autoencoder’s one, and an autoencoder remains competitive on many tasks. This is the better detector where the reconstruction quality genuinely matters and the budget allows it.',
        featurization: [
          'Tune the partial-noising level explicitly, since it is the sensitivity knob and the default is arbitrary',
          'Use a deterministic sampler so the same input gives the same reconstruction, which stochastic sampling does not',
          'Score with a perceptual distance rather than pixel error where the domain has one, since sharp reconstructions differ from the input in ways pixel error overweights',
          'Train on a verified-normal set, since anomalies in training teach the model to reconstruct them faithfully',
        ],
        evaluation:
          'Image-level and pixel-level scores reported separately, since a model can flag the right image for the wrong region, with an autoencoder and a pretrained-feature baseline on the same data. Report scoring latency, which is the property that decides whether this is deployable.',
        pitfalls: [
          'Stochastic sampling making the score non-deterministic between runs on the same input',
          'Sequential scoring cost ruling out real-time detection',
          'A partial-noising level so high that normal detail is also rewritten, producing false positives everywhere',
          'Training data containing anomalies, which the model then reconstructs faithfully',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'The defining property of diffusion is that quality and compute sit on an explicit dial you can move at inference without retraining, and almost everything interesting here is about moving along it. A model trained with a thousand steps can be sampled in twenty, because the deterministic sampler follows a trajectory whose intermediate points can be skipped — which reframes sampling as solving an ordinary differential equation, where step count is a solver choice. Guidance is a second inference-time knob trading diversity for adherence, also free of retraining.',
        where: [
          'A quality-versus-compute frontier traversable at inference, which almost nothing else in this reference offers',
          'Deterministic sampling as an ODE solve, where fewer steps is a solver decision rather than an approximation to the model',
          'The reweighted objective: dropping the variational weighting improves samples and forfeits the bound',
          'Progressive distillation, training a student to take one step where the teacher took two, halving cost repeatedly',
        ],
        why: 'Worth studying because the trade is explicit, reversible and made at serving time, which is unusual — almost every other accuracy-for-speed decision in this reference is baked in at training. The reframing of sampling as an ODE solve is the conceptual key: once the reverse process is deterministic, the intermediate states are points on a trajectory and skipping them is exactly what a solver with a larger step size does, so the entire numerical-integration literature becomes applicable. The reweighting story is the honest counterpoint and the same shape as the GAN’s non-saturating substitution: the theoretically correct objective was replaced by one that samples better, and the likelihood guarantee was given up in the process.',
        featurization: [
          'Use a cosine schedule; a linear one spends most of its steps at noise levels where the input carries no information',
          'Sample deterministically with strided steps in production, since that is where the cost is and the degradation is gradual',
          'Tune the guidance scale explicitly — it trades adherence against diversity and the default is not optimal for any particular task',
          'Report the step count with every quality number, because the two are on a dial and a result without its position is not comparable',
        ],
        evaluation:
          'Plot sample quality against sampling steps and choose a point deliberately rather than accepting a default, which is the same discipline the ANN-index entry demands of recall against latency. Measure guidance scale against both adherence and diversity, since improving one degrades the other and only reporting the first is misleading.',
        pitfalls: [
          'Comparing models at different step counts, which measures the sampler rather than the model',
          'A linear schedule wasting most of the trajectory on uninformative noise levels',
          'High guidance collapsing diversity while every individual sample looks better',
          'Treating the simplified objective as a likelihood bound, which it is not once the weighting is dropped',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'A U-Net predicts the noise in a corrupted image given the timestep, with attention layers at the lower resolutions and conditioning injected through cross-attention. Latent diffusion runs the whole process in the compressed space of a pretrained autoencoder rather than in pixels, which is what made high-resolution generation affordable and is now the standard arrangement.',
        where: [
          'Text-to-image generation, which is where diffusion became the dominant approach',
          'Image editing, inpainting and outpainting, where fixing known regions at every step is a natural fit',
          'Super-resolution and restoration, conditioned on the degraded input',
          'Video and 3D generation, where the same framework extends with temporal or spatial conditioning',
        ],
        why: 'It displaced GANs for image generation on two counts and both are structural rather than incidental. Training is stable — one regression loss against a known target, no equilibrium to find — so results are reproducible across runs in a way adversarial training never was. And mode coverage is good, because the model is trained to denoise every input rather than to fool a critic, so there is no mechanism that rewards collapsing onto a few outputs. The cost is inference: hundreds of sequential evaluations against a GAN’s one, which is why every practical advance has been about reducing step count. Latent diffusion is the other decisive move, cutting the cost by working in a compressed space where the expensive spatial dimensions are already gone.',
        featurization: [
          'Work in a pretrained latent space rather than in pixels for anything above modest resolution; this is the single largest cost reduction available',
          'Inject conditioning through cross-attention at every resolution, not only at the input',
          'Use a cosine schedule and a velocity parameterization, which behaves better at the extreme noise levels than noise prediction does',
          'Fix known regions at every denoising step for inpainting, re-imposing them rather than only initializing with them',
        ],
        evaluation:
          'Sample quality and diversity metrics together at a stated step count, with human evaluation on a sample as the honest check. Compare against a GAN at matched inference cost rather than matched quality, since that is the comparison that reflects the actual trade.',
        pitfalls: [
          'Pixel-space diffusion at high resolution, which is affordable only in the latent formulation',
          'Quality numbers quoted without a step count, making them incomparable',
          'Guidance scale turned up until diversity collapses, which reads as quality improving',
          'Expecting GAN-like latency, which no amount of tuning delivers without distillation',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Tabular diffusion for synthetic record generation: diffuse continuous columns directly and categorical ones through a multinomial or embedded formulation, conditioning on class to generate specific segments. Used to rebalance extremely imbalanced datasets or to share data that cannot be shared directly.',
        where: [
          'Class-conditional minority oversampling for imbalanced fraud detection',
          'Synthetic record generation where the real data is restricted',
          'Imputation of missing fields, which the fixing-known-values trick handles directly',
          'Augmenting rare attack patterns that appear too seldom to train on',
        ],
        why: 'The stability argument matters more here than in images: adversarial tabular generators are notoriously fragile on small minority classes, and a single stable regression loss is a real improvement. Mode coverage matters more too, since the point of generating minority examples is diversity rather than realism, and a model that collapses defeats its own purpose. Against it: mixed categorical and continuous columns are genuinely awkward for a process designed around Gaussian noise, sampling cost is high for what is usually a bulk offline job, and simple oversampling remains competitive often enough that it must be the baseline. Privacy claims need a membership-inference test, as with any generative model.',
        featurization: [
          'Handle categorical columns with a formulation designed for them rather than diffusing one-hot vectors as if continuous',
          'Normalize continuous columns, since the process assumes a roughly standard scale',
          'Validate by training a downstream model on synthetic data and testing on real, which is the only test that reflects the use case',
          'Compare against simple oversampling first, which is frequently competitive and vastly cheaper',
        ],
        evaluation:
          'Downstream model performance on real held-out data with and without the augmentation. For privacy, membership-inference testing rather than the assertion that the data is synthetic.',
        pitfalls: [
          'Treating one-hot categorical columns as continuous, which produces invalid records',
          'Sampling cost dominating what should be a cheap offline augmentation step',
          'Amplifying the idiosyncrasies of a handful of minority examples',
          'Privacy claims without a membership-inference test',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Comparable to any supervised regression of the same size, because the closed-form forward process means no rollout during training — this is the half of the cost profile that is unremarkable, and the contrast with sampling is the whole story.',
    inferenceProfile:
      'The expensive half by three orders of magnitude. Each sample needs S sequential network evaluations, and even at twenty steps that is twenty forward passes where a GAN needs one. Distillation and better solvers have brought this down substantially, but the asymmetry is structural and every serving design has to start from it.',
    retrainingCadence:
      'Per project, as with most generative models. Notably, the sampler can be changed without retraining — step count, solver and guidance scale are all inference-time settings, which means quality and cost can be retuned in production without touching the model.',
    driftAndMonitoring: [
      'Report the sampling step count with every quality measurement, since the two are on a dial and a number without its position is meaningless',
      'Track guidance scale against diversity, because raising it improves each sample and degrades the set',
      'Monitor latency at the tail, which is the binding constraint rather than the mean for any interactive use',
      'Verify sampler determinism where the application depends on it, since a stochastic sampler gives a different output for the same input',
    ],
    productionGotchas: [
      'Sampling cost is the whole deployment problem. A design that assumes GAN-like latency will not survive contact with a thousand-step sampler, and distillation or a fast solver has to be part of the plan rather than an optimization for later',
      'Step count is a serving parameter, not a model parameter. Two deployments of the same checkpoint at different step counts produce materially different output quality, and comparing them is comparing samplers',
      'Guidance scale trades diversity for adherence and the default is not optimal for anything in particular. Turning it up makes individual samples look better and the collection worse',
      'The noise schedule is baked into the checkpoint. A sampler using a different schedule than the model was trained with produces degraded output with no error anywhere',
      'Stochastic sampling means the same input gives different outputs. Where reproducibility matters, the sampler must be deterministic and the seed recorded',
    ],
  },

  assumptions: [
    'The data can be meaningfully corrupted toward Gaussian noise and back, which is natural for continuous data and awkward for discrete',
    'A single network can learn the denoising task across every noise level, which is what the timestep conditioning provides',
    'Inference compute is available — the model is defined by trading it for quality, and a tight latency budget removes the reason to choose it',
    'The noise schedule used at sampling matches the one used at training, since it is part of the model',
    'Sample quality rather than exact likelihood is the goal, since the simplified objective forfeits the bound',
  ],

  pros: [
    {
      point: 'Stable, single-objective training',
      context:
        'One regression loss against a target the training loop constructed and therefore knows exactly. No equilibrium, no balance, no collapse — and after the GAN entry that contrast is the whole reason diffusion displaced adversarial training.',
    },
    {
      point: 'Good mode coverage by construction',
      context:
        'The model is trained to denoise every input rather than to fool a critic, so nothing rewards collapsing onto a few outputs. Mode collapse, the unfixed weakness of GANs, simply does not have a mechanism here.',
    },
    {
      point: 'Quality and compute on a dial, adjustable at serving time',
      context:
        'Step count and guidance are inference parameters, so the same checkpoint serves a fast preview and a slow final render. Almost nothing else in this reference offers a retrain-free quality knob.',
    },
    {
      point: 'Conditioning and editing are natural',
      context:
        'Because generation is iterative refinement, fixing known regions at every step gives inpainting and imputation directly. That is a structural fit rather than an adaptation, and it is why image editing converged on diffusion.',
    },
    {
      point: 'Training is parallel across timesteps',
      context:
        'The closed-form forward process means any noise level can be sampled directly, so training never simulates a trajectory. All the sequential cost is deferred to sampling, which is what makes training affordable.',
    },
  ],

  cons: [
    {
      point: 'Sampling is orders of magnitude more expensive than a GAN',
      context:
        'Hundreds of sequential evaluations per sample against one. The defining cost of the method, structural rather than incidental, and every serving design has to start from it.',
    },
    {
      point: 'The trained objective is not the derived bound',
      context:
        'Dropping the variational weighting improves samples and forfeits the likelihood guarantee. The same shape of substitution as the GAN’s non-saturating loss, and equally worth naming rather than glossing.',
    },
    {
      point: 'Awkward on discrete data',
      context:
        'Gaussian corruption is natural for continuous values and contrived for categories. Discrete formulations exist and are consistently less mature, which is why text generation stayed autoregressive.',
    },
    {
      point: 'Guidance trades diversity for adherence',
      context:
        'Raising it makes each sample match the condition better and makes the set less varied. Easy to over-tune because the failure looks like improvement, and only a diversity metric reveals it.',
    },
    {
      point: 'Results depend on serving parameters',
      context:
        'Step count, solver and guidance all change the output without changing the model. Comparisons across deployments are comparing samplers unless those settings are pinned and reported.',
    },
  ],

  relatedSlugs: ['score-based-flow-matching', 'time-series-diffusion', 'vae', 'gan', 'normalizing-flows'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DDPM, transcribed the way the paper reads.

Two processes:

  FORWARD (fixed, no learning):  gradually add noise until nothing is left
      q(x_t | x_0) = N(sqrt(alpha_bar_t) x_0, (1 - alpha_bar_t) I)

  REVERSE (learned):             remove a little noise, one step at a time
      loss = || eps - eps_theta(x_t, t) ||^2

The closed form for q(x_t | x_0) is the structural key: because the noise
accumulates as a product of Gaussians, ANY timestep can be sampled directly
from the clean data. Training therefore never simulates a trajectory - all the
sequential cost is deferred to sampling, which is the whole cost profile of
this model in one sentence.

Plain loops, no libraries.
"""

import math
import random

SEED = 29


def linear_beta_schedule(steps, start=1e-4, end=0.02):
    """The original schedule. Included to be compared against, not used.

    A linear schedule destroys information too quickly at the end, so most of
    the trajectory is spent at noise levels where the input is already
    indistinguishable from noise - capacity spent on steps that carry nothing.
    """
    return [start + (end - start) * t / (steps - 1) for t in range(steps)]


def cosine_beta_schedule(steps, offset=0.008):
    """The schedule that actually works, and it is not a minor difference.

    Defined through the CUMULATIVE signal retention rather than the per-step
    noise, so information is destroyed at a roughly constant rate in
    perceptual terms. That redistributes the trajectory toward the noise
    levels where structure lives.
    """
    def f(t):
        angle = ((t / steps) + offset) / (1.0 + offset) * math.pi / 2.0
        return math.cos(angle) ** 2

    alpha_bars = [f(t) / f(0) for t in range(steps + 1)]
    betas = []
    for t in range(steps):
        beta = 1.0 - alpha_bars[t + 1] / alpha_bars[t]
        # Clipped: an unclipped cosine schedule produces betas near one at the
        # end, which makes the reverse step numerically unstable.
        betas.append(min(beta, 0.999))
    return betas


def build_schedule(betas):
    """Precompute every coefficient the forward and reverse steps need.

    All of these are FIXED - nothing here is learned. That is worth stating
    plainly, because it is the difference from a VAE: the encoder is not a
    network, it is a schedule chosen in advance.
    """
    alphas = [1.0 - beta for beta in betas]

    alpha_bars = []
    running = 1.0
    for alpha in alphas:
        running *= alpha
        alpha_bars.append(running)

    return {
        'betas': betas,
        'alphas': alphas,
        'alpha_bars': alpha_bars,
        'sqrt_alpha_bars': [math.sqrt(a) for a in alpha_bars],
        'sqrt_one_minus_alpha_bars': [math.sqrt(1.0 - a) for a in alpha_bars],
    }


def forward_diffuse(x0, t, schedule, rng):
    """Jump straight to timestep t. No intervening steps are simulated.

    x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * eps

    The noise eps is returned because it IS the training target - the loop
    added it, so the label is known exactly. That is what makes diffusion
    training so much more stable than anything adversarial: the supervision is
    a known quantity rather than the output of another network that is also
    learning.
    """
    signal = schedule['sqrt_alpha_bars'][t]
    noise_scale = schedule['sqrt_one_minus_alpha_bars'][t]

    epsilon = [rng.gauss(0.0, 1.0) for _ in x0]
    x_t = [signal * value + noise_scale * e for value, e in zip(x0, epsilon)]
    return x_t, epsilon


def denoiser(x_t, t, params, num_steps):
    """The network: given a noisy input and a timestep, predict the noise.

    The timestep enters as a sinusoidal embedding rather than a raw number,
    because a single scalar spanning a thousand values is a poor input to a
    network - the embedding gives it a smooth multi-scale representation.
    """
    embedding = timestep_embedding(t, len(params['w_time']), num_steps)

    hidden = []
    for i, row in enumerate(params['w1']):
        total = params['b1'][i] + params['w_time'][i] * embedding[i % len(embedding)]
        for weight, value in zip(row, x_t):
            total += weight * value
        hidden.append(math.tanh(total))

    return [
        bias + sum(w * h for w, h in zip(row, hidden))
        for row, bias in zip(params['w2'], params['b2'])
    ]


def timestep_embedding(t, width, num_steps):
    """Sinusoidal position encoding over the timestep.

    Same construction as a transformer's positional encoding, and for the same
    reason: a smooth multi-scale representation of an integer position.
    """
    half = width // 2
    return [
        math.sin(t / (10000.0 ** (2 * i / width))) if i < half
        else math.cos(t / (10000.0 ** (2 * (i - half) / width)))
        for i in range(width)
    ]


def training_loss(x0, params, schedule, num_steps, rng):
    """One training example. Note there is no rollout anywhere.

    A random timestep, one noise draw, one network evaluation. Training is
    embarrassingly parallel across examples AND across timesteps, which is
    entirely due to the closed form above.
    """
    t = rng.randrange(num_steps)
    x_t, epsilon = forward_diffuse(x0, t, schedule, rng)
    predicted = denoiser(x_t, t, params, num_steps)

    # A plain mean squared error on noise. The DERIVATION is a variational
    # bound of exactly the VAE's form, with a weighting per timestep - and
    # that weighting is DROPPED here. The simplified objective samples much
    # better and is no longer a bound on the likelihood.
    return sum((e - p) ** 2 for e, p in zip(epsilon, predicted)) / len(epsilon)


def ddpm_sample_step(x_t, t, params, schedule, num_steps, rng, stochastic=True):
    """One reverse step. This is where all the cost lives.

    x_{t-1} = (x_t - (1-alpha_t)/sqrt(1-alpha_bar_t) * eps_theta) / sqrt(alpha_t)
              + sigma_t * z
    """
    predicted = denoiser(x_t, t, params, num_steps)

    alpha = schedule['alphas'][t]
    alpha_bar = schedule['alpha_bars'][t]
    coefficient = (1.0 - alpha) / math.sqrt(1.0 - alpha_bar)

    mean = [
        (value - coefficient * p) / math.sqrt(alpha)
        for value, p in zip(x_t, predicted)
    ]

    if t == 0 or not stochastic:
        # Setting the injected noise to zero makes the sampler DETERMINISTIC,
        # which is DDIM - and a deterministic trajectory can be traversed in
        # far fewer steps, because its intermediate points can be skipped.
        return mean

    sigma = math.sqrt(schedule['betas'][t])
    return [m + sigma * rng.gauss(0.0, 1.0) for m in mean]


def sample(dimension, params, schedule, num_steps, rng, stochastic=True):
    """Start from pure noise and walk back. S sequential network evaluations.

    This is the whole cost profile: training is one evaluation per example,
    sampling is S. At a thousand steps that is three orders of magnitude more
    expensive per sample than a GAN, and every practical advance in this area
    has been about reducing S.
    """
    x = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    for t in range(num_steps - 1, -1, -1):
        x = ddpm_sample_step(x, t, params, schedule, num_steps, rng, stochastic)
    return x


def strided_sample(dimension, params, schedule, num_steps, stride, rng):
    """Skip steps. Only valid for the DETERMINISTIC sampler.

    Once the reverse process has no injected noise, its intermediate states
    are points on a trajectory - so skipping them is exactly what a solver
    with a larger step size does, and the whole numerical-integration
    literature becomes applicable.
    """
    x = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    for t in range(num_steps - 1, -1, -stride):
        x = ddpm_sample_step(x, t, params, schedule, num_steps, rng, stochastic=False)
    return x
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) sequential evaluations. Illustrative, not a measured benchmark: at a thousand steps that is three orders of magnitude more work per sample than a single-pass generator, which is the defining cost characteristic of the whole family.',
      },

      'make-it-right': {
        code: `"""The same model, with the schedule as a type and the sampler as a choice.

Two things change. The noise schedule becomes an object that validates its own
invariants and precomputes every derived coefficient once, because it is a
FIXED part of the model — baked into the checkpoint, and a sampler using a
different one produces degraded output with no error anywhere. And the sampler
becomes an explicit type, because step count and determinism are serving
parameters that change the output without changing the model, which makes them
exactly the sort of thing that should not be a loose argument.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple, Sequence


class ScheduleKind(Enum):
    """Which noise schedule. Not interchangeable at serving time.

    LINEAR destroys information too quickly at the end, so most of the
    trajectory sits at noise levels where the input carries nothing. COSINE
    redistributes it toward the levels where structure lives, and the
    difference is large rather than marginal.
    """

    LINEAR = 'linear'
    COSINE = 'cosine'


class SamplerKind(Enum):
    """Stochastic or deterministic, which is a bigger choice than it looks.

    DDPM injects noise at every step; DDIM does not. A deterministic
    trajectory can be traversed in far fewer steps because its intermediate
    points are skippable, and it makes the same input give the same output.
    """

    DDPM = 'ddpm'
    DDIM = 'ddim'


class ScheduleMismatch(ValueError):
    """Raised when a sampler's schedule differs from the trained one.

    Its own type because the schedule is part of the MODEL, not the sampler:
    the network learned to denoise at specific noise levels, and sampling with
    different ones produces degraded output with nothing to indicate it.
    """


class DegenerateSchedule(ValueError):
    """Raised when a schedule is not monotone or leaves signal at the end.

    Cumulative signal retention must decrease to near zero, or the reverse
    process starts from something that is not the prior it assumes.
    """


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


class NoisedSample(NamedTuple):
    """The noisy input AND the noise that was added.

    Both come back because the noise IS the training target — the loop added
    it, so the label is known exactly. That is what makes diffusion training
    stable where adversarial training is not: the supervision is a known
    quantity rather than the output of a network that is also learning.
    """

    x_t: list[float]
    epsilon: list[float]
    timestep: int


class NoiseSchedule:
    """Fixed, not learned, and part of the model artifact.

    Worth stating plainly because it is the structural difference from a VAE:
    the encoder here is not a network, it is a schedule chosen in advance. All
    derived coefficients are precomputed once, since they are constants of the
    schedule and recomputing them per step is pure waste.
    """

    def __init__(self, kind: ScheduleKind, steps: int, cosine_offset: float = 0.008) -> None:
        if steps < 2:
            raise ShapeMismatch('a diffusion process needs at least two steps')

        self._kind = kind
        self._steps = steps
        self._betas = (
            self._linear(steps) if kind is ScheduleKind.LINEAR
            else self._cosine(steps, cosine_offset)
        )

        alphas = [1.0 - beta for beta in self._betas]
        self._alpha_bars: list[float] = []
        running = 1.0
        for alpha in alphas:
            running *= alpha
            self._alpha_bars.append(running)

        # Guard clause: the reverse process starts from a standard Gaussian,
        # so the forward process must actually reach one.
        if self._alpha_bars[-1] > 0.01:
            raise DegenerateSchedule(
                f'cumulative signal retention ends at {self._alpha_bars[-1]:.3f}; the '
                'forward process does not reach the prior the sampler assumes'
            )
        if any(a >= b for a, b in zip(self._alpha_bars, self._alpha_bars[1:])):
            raise DegenerateSchedule('signal retention must decrease monotonically')

        self._alphas = alphas
        self._sqrt_alpha_bars = [math.sqrt(a) for a in self._alpha_bars]
        self._sqrt_one_minus = [math.sqrt(1.0 - a) for a in self._alpha_bars]

    @staticmethod
    def _linear(steps: int, start: float = 1e-4, end: float = 0.02) -> list[float]:
        return [start + (end - start) * t / (steps - 1) for t in range(steps)]

    @staticmethod
    def _cosine(steps: int, offset: float) -> list[float]:
        """Defined through CUMULATIVE retention rather than per-step noise.

        That is the whole point: information is destroyed at a roughly
        constant perceptual rate rather than collapsing at the end.
        """
        def f(t: int) -> float:
            angle = ((t / steps) + offset) / (1.0 + offset) * math.pi / 2.0
            return math.cos(angle) ** 2

        bars = [f(t) / f(0) for t in range(steps + 1)]
        # Clipped: an unclipped cosine schedule produces betas near one at the
        # end, which makes the reverse step numerically unstable.
        return [min(1.0 - bars[t + 1] / bars[t], 0.999) for t in range(steps)]

    @property
    def steps(self) -> int:
        return self._steps

    def fingerprint(self) -> tuple[str, int]:
        """Comparable across training and serving, so a mismatch is catchable."""
        return (self._kind.value, self._steps)

    def assert_matches(self, trained: NoiseSchedule) -> None:
        """Guard clause for a mismatch with no other symptom."""
        if self.fingerprint() != trained.fingerprint():
            raise ScheduleMismatch(
                f'sampling schedule {self.fingerprint()} differs from the trained '
                f'{trained.fingerprint()}; the network learned different noise levels'
            )

    def diffuse(self, x0: Sequence[float], t: int, rng: random.Random) -> NoisedSample:
        """Jump straight to timestep t. No intervening steps are simulated.

        The closed form is the structural key: because the noise accumulates
        as a product of Gaussians, any timestep is directly sampleable from
        the clean data. Training therefore never simulates a trajectory, and
        all the sequential cost is deferred to sampling.
        """
        if not 0 <= t < self._steps:
            raise ShapeMismatch(f'timestep {t} outside [0, {self._steps})')

        epsilon = [rng.gauss(0.0, 1.0) for _ in x0]
        x_t = [
            self._sqrt_alpha_bars[t] * value + self._sqrt_one_minus[t] * e
            for value, e in zip(x0, epsilon)
        ]
        return NoisedSample(x_t=x_t, epsilon=epsilon, timestep=t)

    def reverse_mean(
        self, x_t: Sequence[float], predicted_noise: Sequence[float], t: int
    ) -> list[float]:
        coefficient = (1.0 - self._alphas[t]) / self._sqrt_one_minus[t]
        root_alpha = math.sqrt(self._alphas[t])
        return [
            (value - coefficient * p) / root_alpha
            for value, p in zip(x_t, predicted_noise)
        ]

    def sampling_sigma(self, t: int) -> float:
        return math.sqrt(self._betas[t])


@dataclass(frozen=True)
class SamplerConfig:
    """Serving parameters that change the output without changing the model.

    Frozen and explicit because that is exactly what makes them dangerous: two
    deployments of one checkpoint at different step counts produce materially
    different quality, and comparing them compares samplers rather than models.
    """

    kind: SamplerKind = SamplerKind.DDIM
    steps: int = 50
    guidance_scale: float = 1.0

    def __post_init__(self) -> None:
        if self.steps < 1:
            raise ShapeMismatch('at least one sampling step is required')
        # Guard clause for the combination that is simply invalid: skipping
        # steps assumes a deterministic trajectory whose intermediate points
        # can be omitted, which stochastic sampling does not have.
        if self.kind is SamplerKind.DDPM and self.steps < 100:
            raise ShapeMismatch(
                'stochastic sampling cannot skip steps; use DDIM for low step counts'
            )
        if self.guidance_scale < 1.0:
            raise ShapeMismatch('guidance below 1.0 pushes away from the condition')

    def timesteps(self, schedule: NoiseSchedule) -> list[int]:
        """Which timesteps to visit, evenly strided and descending."""
        stride = max(schedule.steps // self.steps, 1)
        return list(range(schedule.steps - 1, -1, -stride))


class SampleResult(NamedTuple):
    """The sample AND the settings that produced it.

    Bundled because quality and cost are on a dial here: a sample reported
    without its step count and guidance scale is not comparable to any other,
    and that is the most common way diffusion results become meaningless.
    """

    values: list[float]
    steps_taken: int
    sampler: SamplerKind
    guidance_scale: float


def guided_prediction(
    conditional: Sequence[float],
    unconditional: Sequence[float],
    scale: float,
) -> list[float]:
    """Classifier-free guidance: extrapolate away from the unconditional.

    A serving-time knob trading DIVERSITY for ADHERENCE. Raising it makes each
    sample match its condition better and makes the collection less varied,
    which is easy to over-tune because the failure looks like improvement.
    """
    return [
        u + scale * (c - u)
        for c, u in zip(conditional, unconditional)
    ]
`,
        rationale:
          'Two changes. The noise schedule becomes a type that validates its own invariants and precomputes every derived coefficient once — because it is a fixed part of the model rather than a sampler setting, and a sampler using a different schedule than the network was trained on produces degraded output with no error anywhere, so there is a fingerprint and a mismatch check. Its validation is substantive rather than cosmetic: cumulative signal retention must decrease monotonically and must actually reach near zero, or the reverse process starts from something that is not the prior it assumes. The second change is that the sampler becomes an explicit frozen config, because step count, determinism and guidance are serving parameters that change the output without changing the model — which makes them precisely the sort of thing that should not be loose arguments, and it lets the invalid combination be refused outright: skipping steps assumes a deterministic trajectory whose intermediate points can be omitted, which a stochastic sampler does not have. The sample result carries its settings for the same reason, since a diffusion result quoted without its step count is not comparable to anything.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics, with every schedule coefficient hoisted out of the sampling loop. Illustrative, not a measured benchmark: at a thousand steps those square roots were being recomputed a thousand times per sample for values that never change.',
      },

      'make-it-fast': {
        code: `"""Batched training, and a sampler that skips.

Two changes of completely different character, which is the point:

  TRAINING batches trivially. The closed-form forward process means every
  example can draw its own random timestep and be diffused directly, so a
  batch is one gather from a precomputed coefficient table and one network
  pass. There is no rollout to parallelize because there is no rollout.

  SAMPLING does not batch away. It is inherently sequential, and the only
  real optimization is to TAKE FEWER STEPS - which is available because the
  deterministic sampler follows a trajectory whose intermediate points can be
  skipped. That reframes sampling as solving an ODE, where step count is a
  solver choice rather than an approximation to the model.

The asymmetry between those two paragraphs is the whole cost profile.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


class BatchedSchedule:
    """Every coefficient precomputed as an array, indexed by timestep.

    All of these are constants of the schedule - nothing is learned. Storing
    them as arrays means a batch with a different timestep per example is one
    fancy-index gather rather than a loop.
    """

    def __init__(self, betas: NDArray[np.float32]) -> None:
        self._betas = np.ascontiguousarray(betas, dtype=FLOAT)
        alphas = 1.0 - self._betas
        self._alphas = alphas
        # cumprod, not a Python loop: the cumulative product is the one place
        # the schedule has a sequential dependency, and NumPy already has it.
        self._alpha_bars = np.cumprod(alphas, dtype=FLOAT)
        self._sqrt_alpha_bars = np.sqrt(self._alpha_bars)
        self._sqrt_one_minus = np.sqrt(1.0 - self._alpha_bars)
        self._reverse_coefficient = (1.0 - alphas) / self._sqrt_one_minus
        self._root_alphas = np.sqrt(alphas)

    @property
    def steps(self) -> int:
        return len(self._betas)

    def diffuse(
        self,
        x0: NDArray[np.float32],
        timesteps: NDArray[np.int32],
        rng: np.random.Generator,
    ) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        """Every example at its OWN random timestep, in one operation.

        The gather is the whole trick: a different t per example would be a
        loop in the literal version, and here it is one indexed read from the
        coefficient table broadcast over the feature axis.
        """
        signal = self._sqrt_alpha_bars[timesteps][:, None]
        noise_scale = self._sqrt_one_minus[timesteps][:, None]

        epsilon = rng.standard_normal(x0.shape, dtype=FLOAT)
        # Fused: the noisy input is built in place from the scaled clean data
        # rather than materializing both scaled terms separately.
        x_t = x0 * signal
        x_t += noise_scale * epsilon
        return x_t, epsilon

    def reverse_mean(
        self,
        x_t: NDArray[np.float32],
        predicted: NDArray[np.float32],
        t: int,
    ) -> NDArray[np.float32]:
        """One reverse step, in place over the predicted-noise buffer."""
        out = predicted
        out *= -self._reverse_coefficient[t]
        out += x_t
        out /= self._root_alphas[t]
        return out

    def sigma(self, t: int) -> float:
        return float(np.sqrt(self._betas[t]))


def cosine_betas(steps: int, offset: float = 0.008) -> NDArray[np.float32]:
    """Defined through CUMULATIVE retention rather than per-step noise.

    Information is destroyed at a roughly constant perceptual rate rather than
    collapsing at the end, which is where a linear schedule wastes most of its
    trajectory.
    """
    t = np.arange(steps + 1, dtype=np.float64)
    angle = ((t / steps) + offset) / (1.0 + offset) * np.pi / 2.0
    bars = np.cos(angle) ** 2
    bars /= bars[0]
    # Clipped: an unclipped cosine schedule produces betas near one at the
    # end, which makes the reverse step numerically unstable.
    return np.clip(1.0 - bars[1:] / bars[:-1], 0.0, 0.999).astype(FLOAT)


def timestep_embedding(
    timesteps: NDArray[np.int32], width: int
) -> NDArray[np.float32]:
    """Sinusoidal encoding for a whole batch of timesteps at once.

    Same construction as a transformer's positional encoding, and for the same
    reason: a smooth multi-scale representation of an integer position. The
    frequencies are computed once and broadcast, not rebuilt per example.
    """
    half = width // 2
    frequencies = np.exp(
        -np.log(10000.0) * np.arange(half, dtype=FLOAT) / half
    )
    angles = timesteps[:, None].astype(FLOAT) * frequencies[None, :]
    return np.concatenate((np.sin(angles), np.cos(angles)), axis=1)


def training_step(
    x0: NDArray[np.float32],
    schedule: BatchedSchedule,
    denoiser,
    rng: np.random.Generator,
) -> np.float32:
    """One batched training step. Note there is no rollout anywhere.

    A random timestep per example, one noise draw, one network pass. Training
    is embarrassingly parallel across examples AND timesteps, entirely because
    the forward process has a closed form.
    """
    timesteps = rng.integers(0, schedule.steps, size=len(x0)).astype(np.int32)
    x_t, epsilon = schedule.diffuse(x0, timesteps, rng)

    predicted = denoiser(x_t, timestep_embedding(timesteps, 128))

    # A plain mean squared error on noise. The DERIVATION is a variational
    # bound with a per-timestep weighting, and that weighting is DROPPED here:
    # the simplified objective samples much better and is no longer a bound.
    residual = predicted
    residual -= epsilon
    return np.einsum('ij,ij->', residual, residual, optimize=True) / residual.size


def ddim_sample(
    shape: tuple[int, int],
    schedule: BatchedSchedule,
    denoiser,
    steps: int,
    rng: np.random.Generator,
) -> NDArray[np.float32]:
    """Deterministic sampling with STRIDED timesteps.

    This is the only real optimization available for sampling, and it works
    because the deterministic reverse process is a trajectory: its
    intermediate states are points on a path, so skipping them is exactly what
    a solver with a larger step size does. Twenty steps out of a thousand is a
    fifty-fold reduction, and the quality degrades gradually rather than
    falling off a cliff.

    Note what is NOT here: no batching over steps, because the dependency is
    real. Sampling is sequential and the only lever is step count.
    """
    stride = max(schedule.steps // steps, 1)
    visited = np.arange(schedule.steps - 1, -1, -stride, dtype=np.int32)

    x = rng.standard_normal(shape, dtype=FLOAT)
    # The batch dimension IS parallel even though the steps are not: many
    # samples advance together through the same sequential trajectory.
    embeddings = timestep_embedding(visited, 128)

    for index, t in enumerate(visited):
        predicted = denoiser(x, np.broadcast_to(embeddings[index], (shape[0], 128)))
        x = schedule.reverse_mean(x, predicted, int(t))

    return x


def guided_prediction(
    conditional: NDArray[np.float32],
    unconditional: NDArray[np.float32],
    scale: float,
) -> NDArray[np.float32]:
    """Classifier-free guidance, computed in place on the conditional buffer.

    A serving-time knob trading DIVERSITY for ADHERENCE. Raising it makes each
    sample match its condition better and makes the collection less varied,
    which is easy to over-tune because the failure looks like improvement.

    Note the cost: this needs BOTH a conditional and an unconditional
    prediction, so guided sampling is twice the network evaluations of
    unguided sampling at the same step count.
    """
    out = conditional
    out -= unconditional
    out *= FLOAT(scale)
    out += unconditional
    return out
`,
        rationale:
          'The two halves of this model optimize in completely different ways, and the contrast is the point. Training batches trivially because the closed-form forward process means every example can draw its own random timestep and be diffused directly — so a batch is one fancy-index gather from a precomputed coefficient table and one network pass, with no rollout to parallelize because there is no rollout. Sampling does not batch away at all: the step dependency is real, so the only genuine optimization is to take fewer steps, which is available because the deterministic reverse process is a trajectory whose intermediate points can be skipped. That reframing — sampling as an ODE solve where step count is a solver choice — is what makes a fifty-fold reduction possible without retraining. Around those, every schedule coefficient is precomputed as an array so a per-example timestep is an indexed read rather than a loop, the reverse step and the guidance combination both run in place over the predicted-noise buffer, and the timestep embedding computes its frequencies once and broadcasts. Guidance is noted as doubling the evaluation count, which is easy to forget when quoting step counts.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'A different timestep per example becomes one gather from the coefficient table, so the whole batch diffuses in a single operation rather than one example at a time.',
            tradeoff: 'The gather materializes a per-example coefficient column that is then broadcast over every feature, which on wide inputs is a small but real memory overhead the scalar version did not have.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The reverse step, the residual and the guidance combination all write through the predicted-noise buffer, so a sampling step allocates nothing beyond the network output.',
            tradeoff: 'The predicted noise is destroyed by the reverse step, so inspecting what the model actually predicted — the natural diagnostic when samples degrade at a particular noise level — needs an unfused pass.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The noisy input is built by scaling the clean data in place and adding the scaled noise, and the loss contracts straight out of the residual with einsum rather than squaring into a temporary.',
            tradeoff: 'The scaled clean signal and the scaled noise are never separately available, which are exactly the two quantities to look at when diagnosing a schedule that destroys information too fast.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Many samples advance together through the same sequential trajectory, so the step loop costs a constant number of interpreter operations regardless of how many samples are in flight.',
            tradeoff: 'Batching helps throughput and does nothing for latency: a single sample still needs every sequential step, so an interactive request is no faster for the batching and the only lever left is step count.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Training becomes one gather and one network pass per batch; sampling becomes S sequential passes with S chosen at serving time. Illustrative, not a measured benchmark: strided deterministic sampling at twenty steps out of a thousand is a fifty-fold reduction, and it is the only optimization in this entry that changes the order of magnitude.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DDPM, transcribed the way the paper reads.
//
// Two processes:
//
//   FORWARD (fixed, no learning):  gradually add noise until nothing is left
//       q(x_t | x_0) = N(sqrt(alpha_bar_t) x_0, (1 - alpha_bar_t) I)
//
//   REVERSE (learned):             remove a little noise, one step at a time
//       loss = || eps - eps_theta(x_t, t) ||^2
//
// The closed form for q(x_t | x_0) is the structural key: because the noise
// accumulates as a product of Gaussians, ANY timestep can be sampled directly
// from the clean data. Training therefore never simulates a trajectory - all
// the sequential cost is deferred to sampling, which is the whole cost profile
// of this model in one sentence.
//
// Vector-of-vector, plain loops.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

constexpr double kPi = 3.14159265358979323846;

struct Schedule {
  Vector betas;
  Vector alphas;
  Vector alpha_bars;
  Vector sqrt_alpha_bars;
  Vector sqrt_one_minus_alpha_bars;
};

// The original schedule. Included to be compared against, not used.
//
// A linear schedule destroys information too quickly at the end, so most of
// the trajectory is spent at noise levels where the input is already
// indistinguishable from noise - capacity spent on steps that carry nothing.
Vector LinearBetas(std::size_t steps, double start = 1e-4, double end = 0.02) {
  Vector betas(steps, 0.0);
  for (std::size_t t = 0; t < steps; ++t) {
    betas[t] = start + (end - start) * static_cast<double>(t) /
                           static_cast<double>(steps - 1);
  }
  return betas;
}

// The schedule that actually works, and it is not a minor difference.
//
// Defined through the CUMULATIVE signal retention rather than the per-step
// noise, so information is destroyed at a roughly constant rate in perceptual
// terms. That redistributes the trajectory toward the noise levels where
// structure lives.
Vector CosineBetas(std::size_t steps, double offset = 0.008) {
  const auto f = [steps, offset](std::size_t t) {
    const double angle = ((static_cast<double>(t) / static_cast<double>(steps)) + offset) /
                         (1.0 + offset) * kPi / 2.0;
    return std::cos(angle) * std::cos(angle);
  };

  Vector bars(steps + 1, 0.0);
  for (std::size_t t = 0; t <= steps; ++t) {
    bars[t] = f(t) / f(0);
  }

  Vector betas(steps, 0.0);
  for (std::size_t t = 0; t < steps; ++t) {
    // Clipped: an unclipped cosine schedule produces betas near one at the
    // end, which makes the reverse step numerically unstable.
    betas[t] = std::min(1.0 - bars[t + 1] / bars[t], 0.999);
  }
  return betas;
}

// Precompute every coefficient the forward and reverse steps need.
//
// All of these are FIXED - nothing here is learned. That is worth stating
// plainly, because it is the difference from a VAE: the encoder is not a
// network, it is a schedule chosen in advance.
Schedule BuildSchedule(Vector betas) {
  Schedule schedule;
  schedule.betas = std::move(betas);
  schedule.alphas.resize(schedule.betas.size());
  schedule.alpha_bars.resize(schedule.betas.size());
  schedule.sqrt_alpha_bars.resize(schedule.betas.size());
  schedule.sqrt_one_minus_alpha_bars.resize(schedule.betas.size());

  double running = 1.0;
  for (std::size_t t = 0; t < schedule.betas.size(); ++t) {
    schedule.alphas[t] = 1.0 - schedule.betas[t];
    running *= schedule.alphas[t];
    schedule.alpha_bars[t] = running;
    schedule.sqrt_alpha_bars[t] = std::sqrt(running);
    schedule.sqrt_one_minus_alpha_bars[t] = std::sqrt(1.0 - running);
  }
  return schedule;
}

// Jump straight to timestep t. No intervening steps are simulated.
//
//   x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * eps
//
// The noise eps is returned because it IS the training target - the loop added
// it, so the label is known exactly. That is what makes diffusion training so
// much more stable than anything adversarial: the supervision is a known
// quantity rather than the output of another network that is also learning.
Vector ForwardDiffuse(const Vector& x0, std::size_t t, const Schedule& schedule,
                      std::mt19937& rng, Vector* epsilon) {
  std::normal_distribution<double> normal(0.0, 1.0);
  epsilon->resize(x0.size());

  Vector x_t(x0.size(), 0.0);
  for (std::size_t i = 0; i < x0.size(); ++i) {
    (*epsilon)[i] = normal(rng);
    x_t[i] = schedule.sqrt_alpha_bars[t] * x0[i] +
             schedule.sqrt_one_minus_alpha_bars[t] * (*epsilon)[i];
  }
  return x_t;
}

// Sinusoidal position encoding over the timestep.
//
// Same construction as a transformer's positional encoding, and for the same
// reason: a smooth multi-scale representation of an integer position. A single
// scalar spanning a thousand values is a poor input to a network.
Vector TimestepEmbedding(std::size_t t, std::size_t width) {
  Vector embedding(width, 0.0);
  const std::size_t half = width / 2;
  for (std::size_t i = 0; i < width; ++i) {
    const double frequency =
        std::pow(10000.0, -2.0 * static_cast<double>(i % half) / static_cast<double>(width));
    embedding[i] = i < half ? std::sin(static_cast<double>(t) * frequency)
                            : std::cos(static_cast<double>(t) * frequency);
  }
  return embedding;
}

struct DenoiserParams {
  Matrix w1;
  Vector b1;
  Vector w_time;
  Matrix w2;
  Vector b2;
};

// The network: given a noisy input and a timestep, predict the noise.
Vector Denoise(const Vector& x_t, std::size_t t, const DenoiserParams& params) {
  const Vector embedding = TimestepEmbedding(t, params.w_time.size());

  Vector hidden(params.w1.size(), 0.0);
  for (std::size_t i = 0; i < params.w1.size(); ++i) {
    double total = params.b1[i] + params.w_time[i] * embedding[i % embedding.size()];
    for (std::size_t j = 0; j < x_t.size(); ++j) {
      total += params.w1[i][j] * x_t[j];
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

// One training example. Note there is no rollout anywhere.
//
// A random timestep, one noise draw, one network evaluation. Training is
// embarrassingly parallel across examples AND across timesteps, which is
// entirely due to the closed form above.
double TrainingLoss(const Vector& x0, const DenoiserParams& params,
                    const Schedule& schedule, std::mt19937& rng) {
  std::uniform_int_distribution<std::size_t> uniform(0, schedule.betas.size() - 1);
  const std::size_t t = uniform(rng);

  Vector epsilon;
  const Vector x_t = ForwardDiffuse(x0, t, schedule, rng, &epsilon);
  const Vector predicted = Denoise(x_t, t, params);

  // A plain mean squared error on noise. The DERIVATION is a variational
  // bound of exactly the VAE's form, with a weighting per timestep - and that
  // weighting is DROPPED here. The simplified objective samples much better
  // and is no longer a bound on the likelihood.
  double total = 0.0;
  for (std::size_t i = 0; i < epsilon.size(); ++i) {
    const double residual = epsilon[i] - predicted[i];
    total += residual * residual;
  }
  return total / static_cast<double>(epsilon.size());
}

// One reverse step. This is where all the cost lives.
Vector ReverseStep(const Vector& x_t, std::size_t t, const DenoiserParams& params,
                   const Schedule& schedule, std::mt19937& rng, bool stochastic) {
  const Vector predicted = Denoise(x_t, t, params);

  const double coefficient =
      (1.0 - schedule.alphas[t]) / schedule.sqrt_one_minus_alpha_bars[t];
  const double root_alpha = std::sqrt(schedule.alphas[t]);

  Vector next(x_t.size(), 0.0);
  for (std::size_t i = 0; i < x_t.size(); ++i) {
    next[i] = (x_t[i] - coefficient * predicted[i]) / root_alpha;
  }

  if (t == 0 || !stochastic) {
    // Setting the injected noise to zero makes the sampler DETERMINISTIC,
    // which is DDIM - and a deterministic trajectory can be traversed in far
    // fewer steps, because its intermediate points can be skipped.
    return next;
  }

  std::normal_distribution<double> normal(0.0, std::sqrt(schedule.betas[t]));
  for (std::size_t i = 0; i < next.size(); ++i) {
    next[i] += normal(rng);
  }
  return next;
}

// Start from pure noise and walk back. S sequential network evaluations.
//
// This is the whole cost profile: training is one evaluation per example,
// sampling is S. At a thousand steps that is three orders of magnitude more
// expensive per sample than a single-pass generator.
Vector Sample(std::size_t dimension, const DenoiserParams& params,
              const Schedule& schedule, std::mt19937& rng, bool stochastic) {
  std::normal_distribution<double> normal(0.0, 1.0);
  Vector x(dimension, 0.0);
  for (std::size_t i = 0; i < dimension; ++i) {
    x[i] = normal(rng);
  }

  for (std::size_t t = schedule.betas.size(); t-- > 0;) {
    x = ReverseStep(x, t, params, schedule, rng, stochastic);
  }
  return x;
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) sequential evaluations. Illustrative, not a measured benchmark: at a thousand steps that is three orders of magnitude more work per sample than a single-pass generator, which is the defining cost characteristic of the whole family.',
      },

      'make-it-right': {
        code: `// The same model, with the schedule as a type and the sampler as a choice.
//
// Two things change. The noise schedule becomes an object that validates its
// own invariants and precomputes every derived coefficient once, because it is
// a FIXED part of the model - baked into the checkpoint, and a sampler using a
// different one produces degraded output with no error anywhere. And the
// sampler becomes an explicit type, because step count and determinism are
// serving parameters that change the output without changing the model.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace ddpm {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the schedule is part of the MODEL, not the sampler: the
// network learned to denoise at specific noise levels, and sampling with
// different ones produces degraded output with nothing to indicate it.
class ScheduleMismatch : public std::logic_error {
 public:
  explicit ScheduleMismatch(const std::string& what) : std::logic_error(what) {}
};

// Cumulative signal retention must decrease to near zero, or the reverse
// process starts from something that is not the prior it assumes.
class DegenerateSchedule : public std::invalid_argument {
 public:
  explicit DegenerateSchedule(const std::string& what)
      : std::invalid_argument(what) {}
};

// Which noise schedule. Not interchangeable at serving time.
//
// kLinear destroys information too quickly at the end, so most of the
// trajectory sits at noise levels where the input carries nothing. kCosine
// redistributes it toward the levels where structure lives, and the difference
// is large rather than marginal.
enum class ScheduleKind { kLinear, kCosine };

// Stochastic or deterministic, which is a bigger choice than it looks.
//
// kDdpm injects noise at every step; kDdim does not. A deterministic
// trajectory can be traversed in far fewer steps because its intermediate
// points are skippable, and it makes the same input give the same output.
enum class SamplerKind { kDdpm, kDdim };

// The noisy input AND the noise that was added.
//
// Both come back because the noise IS the training target - the loop added it,
// so the label is known exactly. That is what makes diffusion training stable
// where adversarial training is not.
struct NoisedSample {
  std::vector<double> x_t;
  std::vector<double> epsilon;
  std::size_t timestep{};
};

// Fixed, not learned, and part of the model artifact.
//
// Worth stating plainly because it is the structural difference from a VAE:
// the encoder here is not a network, it is a schedule chosen in advance. All
// derived coefficients are precomputed once, since they are constants and
// recomputing them per step is pure waste.
class NoiseSchedule {
 public:
  NoiseSchedule(ScheduleKind kind, std::size_t steps, double cosine_offset = 0.008)
      : kind_(kind), steps_(steps) {
    if (steps < 2) {
      throw ShapeMismatch("a diffusion process needs at least two steps");
    }

    betas_ = kind == ScheduleKind::kLinear ? Linear(steps) : Cosine(steps, cosine_offset);

    alphas_.resize(steps);
    alpha_bars_.resize(steps);
    sqrt_alpha_bars_.resize(steps);
    sqrt_one_minus_.resize(steps);
    reverse_coefficient_.resize(steps);
    root_alphas_.resize(steps);

    double running = 1.0;
    for (std::size_t t = 0; t < steps; ++t) {
      alphas_[t] = 1.0 - betas_[t];
      running *= alphas_[t];
      alpha_bars_[t] = running;
      sqrt_alpha_bars_[t] = std::sqrt(running);
      sqrt_one_minus_[t] = std::sqrt(1.0 - running);
      reverse_coefficient_[t] = (1.0 - alphas_[t]) / sqrt_one_minus_[t];
      root_alphas_[t] = std::sqrt(alphas_[t]);
    }

    // Guard clause: the reverse process starts from a standard Gaussian, so
    // the forward process must actually reach one.
    if (alpha_bars_.back() > 0.01) {
      throw DegenerateSchedule(
          "cumulative signal retention does not reach the prior the sampler assumes");
    }
    if (!std::is_sorted(alpha_bars_.rbegin(), alpha_bars_.rend())) {
      throw DegenerateSchedule("signal retention must decrease monotonically");
    }
  }

  [[nodiscard]] std::size_t steps() const noexcept { return steps_; }

  // Comparable across training and serving, so a mismatch is catchable.
  [[nodiscard]] std::pair<int, std::size_t> Fingerprint() const noexcept {
    return {static_cast<int>(kind_), steps_};
  }

  // Guard clause for a mismatch with no other symptom.
  void AssertMatches(const NoiseSchedule& trained) const {
    if (Fingerprint() != trained.Fingerprint()) {
      throw ScheduleMismatch(
          "sampling schedule differs from the trained one; the network learned "
          "different noise levels");
    }
  }

  // Jump straight to timestep t. No intervening steps are simulated.
  //
  // The closed form is the structural key: because the noise accumulates as a
  // product of Gaussians, any timestep is directly sampleable from the clean
  // data. Training therefore never simulates a trajectory.
  [[nodiscard]] NoisedSample Diffuse(std::span<const double> x0, std::size_t t,
                                     std::mt19937& rng) const {
    if (t >= steps_) {
      throw ShapeMismatch("timestep outside the schedule");
    }

    NoisedSample sample;
    sample.timestep = t;
    sample.epsilon.resize(x0.size());
    sample.x_t.resize(x0.size());

    std::normal_distribution<double> normal(0.0, 1.0);
    for (std::size_t i = 0; i < x0.size(); ++i) {
      sample.epsilon[i] = normal(rng);
      sample.x_t[i] = sqrt_alpha_bars_[t] * x0[i] + sqrt_one_minus_[t] * sample.epsilon[i];
    }
    return sample;
  }

  void ReverseMean(std::span<const double> x_t, std::span<const double> predicted,
                   std::size_t t, std::span<double> out) const {
    for (std::size_t i = 0; i < x_t.size(); ++i) {
      out[i] = (x_t[i] - reverse_coefficient_[t] * predicted[i]) / root_alphas_[t];
    }
  }

  [[nodiscard]] double Sigma(std::size_t t) const noexcept {
    return std::sqrt(betas_[t]);
  }

 private:
  [[nodiscard]] static std::vector<double> Linear(std::size_t steps) {
    std::vector<double> betas(steps, 0.0);
    for (std::size_t t = 0; t < steps; ++t) {
      betas[t] = 1e-4 + (0.02 - 1e-4) * static_cast<double>(t) /
                            static_cast<double>(steps - 1);
    }
    return betas;
  }

  // Defined through CUMULATIVE retention rather than per-step noise. That is
  // the whole point: information is destroyed at a roughly constant perceptual
  // rate rather than collapsing at the end.
  [[nodiscard]] static std::vector<double> Cosine(std::size_t steps, double offset) {
    constexpr double kPi = 3.14159265358979323846;
    const auto f = [steps, offset](std::size_t t) {
      const double angle =
          ((static_cast<double>(t) / static_cast<double>(steps)) + offset) /
          (1.0 + offset) * kPi / 2.0;
      return std::cos(angle) * std::cos(angle);
    };

    std::vector<double> bars(steps + 1, 0.0);
    for (std::size_t t = 0; t <= steps; ++t) {
      bars[t] = f(t) / f(0);
    }

    std::vector<double> betas(steps, 0.0);
    for (std::size_t t = 0; t < steps; ++t) {
      // Clipped: an unclipped cosine schedule produces betas near one at the
      // end, which makes the reverse step numerically unstable.
      betas[t] = std::min(1.0 - bars[t + 1] / bars[t], 0.999);
    }
    return betas;
  }

  ScheduleKind kind_;
  std::size_t steps_;
  std::vector<double> betas_;  // rule of zero: owning members only
  std::vector<double> alphas_;
  std::vector<double> alpha_bars_;
  std::vector<double> sqrt_alpha_bars_;
  std::vector<double> sqrt_one_minus_;
  std::vector<double> reverse_coefficient_;
  std::vector<double> root_alphas_;
};

// Serving parameters that change the output without changing the model.
//
// Explicit because that is exactly what makes them dangerous: two deployments
// of one checkpoint at different step counts produce materially different
// quality, and comparing them compares samplers rather than models.
struct SamplerConfig {
  SamplerKind kind{SamplerKind::kDdim};
  std::size_t steps{50};
  double guidance_scale{1.0};

  void Validate() const {
    if (steps == 0) {
      throw ShapeMismatch("at least one sampling step is required");
    }
    // Guard clause for the combination that is simply invalid: skipping steps
    // assumes a deterministic trajectory whose intermediate points can be
    // omitted, which stochastic sampling does not have.
    if (kind == SamplerKind::kDdpm && steps < 100) {
      throw ShapeMismatch(
          "stochastic sampling cannot skip steps; use DDIM for low step counts");
    }
    if (guidance_scale < 1.0) {
      throw ShapeMismatch("guidance below 1.0 pushes away from the condition");
    }
  }

  // Which timesteps to visit, evenly strided and descending.
  [[nodiscard]] std::vector<std::size_t> Timesteps(const NoiseSchedule& schedule) const {
    const std::size_t stride = std::max<std::size_t>(schedule.steps() / steps, 1);
    std::vector<std::size_t> visited;
    for (std::size_t t = schedule.steps(); t-- > 0; ) {
      if ((schedule.steps() - 1 - t) % stride == 0) {
        visited.push_back(t);
      }
    }
    return visited;
  }
};

// The sample AND the settings that produced it.
//
// Bundled because quality and cost are on a dial here: a sample reported
// without its step count and guidance scale is not comparable to any other,
// and that is the most common way diffusion results become meaningless.
struct SampleResult {
  std::vector<double> values;
  std::size_t steps_taken{};
  SamplerKind sampler{};
  double guidance_scale{};
};

// Classifier-free guidance: extrapolate away from the unconditional.
//
// A serving-time knob trading DIVERSITY for ADHERENCE. Raising it makes each
// sample match its condition better and makes the collection less varied,
// which is easy to over-tune because the failure looks like improvement.
inline void GuidedPrediction(std::span<const double> conditional,
                             std::span<const double> unconditional, double scale,
                             std::span<double> out) {
  for (std::size_t i = 0; i < conditional.size(); ++i) {
    out[i] = unconditional[i] + scale * (conditional[i] - unconditional[i]);
  }
}

}  // namespace ddpm
`,
        rationale:
          'Two changes. The noise schedule becomes a type that validates its own invariants and precomputes every derived coefficient once — including the reverse-step coefficient and the root alpha, which the literal version recomputed a thousand times per sample for values that never change. Its validation is substantive: cumulative signal retention must decrease monotonically and must actually reach near zero, or the reverse process starts from something that is not the prior it assumes. It also carries a fingerprint and a mismatch check, because the schedule is part of the model rather than a sampler setting and a sampler using a different one produces degraded output with no error anywhere. The second change is that the sampler becomes an explicit config, because step count, determinism and guidance are serving parameters that change the output without changing the model — which lets the invalid combination be refused outright: skipping steps assumes a deterministic trajectory whose intermediate points can be omitted, and a stochastic sampler does not have one. The sample result carries its settings for the same reason, since a diffusion result quoted without its step count is not comparable to anything.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics, with every schedule coefficient hoisted out of the sampling loop. Illustrative, not a measured benchmark: at a thousand steps those square roots and divisions were being recomputed once per step for values fixed at construction.',
      },

      'make-it-fast': {
        code: `// Batched training, and a sampler that skips.
//
// Two changes of completely different character, which is the point:
//
//   TRAINING batches trivially. The closed-form forward process means every
//   example can draw its own random timestep and be diffused directly, so a
//   batch is one gather from a precomputed coefficient table and one network
//   pass. There is no rollout to parallelize because there is no rollout.
//
//   SAMPLING does not batch away. It is inherently sequential, and the only
//   real optimization is to TAKE FEWER STEPS - available because the
//   deterministic sampler follows a trajectory whose intermediate points can
//   be skipped. That reframes sampling as solving an ODE, where step count is
//   a solver choice rather than an approximation to the model.
//
// The asymmetry between those two paragraphs is the whole cost profile.
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

namespace ddpm {

// Every coefficient precomputed as a flat array, indexed by timestep.
//
// All of these are constants of the schedule - nothing is learned. Storing
// them contiguously means a batch with a different timestep per example is one
// indexed read rather than a loop.
class FastSchedule {
 public:
  explicit FastSchedule(std::span<const float> betas)
      : steps_(betas.size()), betas_(betas.begin(), betas.end()),
        sqrt_alpha_bars_(betas.size()), sqrt_one_minus_(betas.size()),
        reverse_coefficient_(betas.size()), root_alphas_(betas.size()) {
    float running = 1.0F;
    for (std::size_t t = 0; t < steps_; ++t) {
      const float alpha = 1.0F - betas_[t];
      running *= alpha;
      sqrt_alpha_bars_[t] = std::sqrt(running);
      sqrt_one_minus_[t] = std::sqrt(1.0F - running);
      reverse_coefficient_[t] = (1.0F - alpha) / sqrt_one_minus_[t];
      root_alphas_[t] = std::sqrt(alpha);
    }
  }

  // Every example at its OWN random timestep, in one pass.
  //
  // The gather is the whole trick: a different t per example would be a loop
  // in the literal version, and here it is one indexed read from the
  // coefficient table.
  void Diffuse(const float* __restrict x0, const int32_t* __restrict timesteps,
               int rows, int dimension, uint64_t seed, float* __restrict x_t,
               float* __restrict epsilon) const {
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const std::size_t t = static_cast<std::size_t>(timesteps[r]);
      const float signal = sqrt_alpha_bars_[t];
      const float noise_scale = sqrt_one_minus_[t];

      uint64_t state = seed + static_cast<uint64_t>(r) * 0x9E3779B97F4A7C15ULL;
      const float* source = x0 + static_cast<std::size_t>(r) * dimension;
      float* noisy = x_t + static_cast<std::size_t>(r) * dimension;
      float* noise = epsilon + static_cast<std::size_t>(r) * dimension;

      // Box-Muller pairs, generated inline so the noise never needs a
      // separate pass or a separate buffer of uniforms.
      for (int d = 0; d < dimension; d += 2) {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        const float u1 = std::max(static_cast<float>(state >> 40) * (1.0F / 16777216.0F),
                                  1e-7F);
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        const float u2 = static_cast<float>(state >> 40) * (1.0F / 16777216.0F);

        const float radius = std::sqrt(-2.0F * std::log(u1));
        const float angle = 6.2831853F * u2;
        noise[d] = radius * std::cos(angle);
        if (d + 1 < dimension) {
          noise[d + 1] = radius * std::sin(angle);
        }
      }

      // Fused: the noisy input is built in one pass over the row rather than
      // materializing both scaled terms separately.
      for (int d = 0; d < dimension; ++d) {
        noisy[d] = signal * source[d] + noise_scale * noise[d];
      }
    }
  }

  // One reverse step, fused and in place over the predicted-noise buffer.
  void ReverseStep(const float* __restrict x_t, std::size_t t, int rows, int dimension,
                   float* __restrict predicted) const {
    const float coefficient = reverse_coefficient_[t];
    const float inverse_root = 1.0F / root_alphas_[t];

#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* current = x_t + static_cast<std::size_t>(r) * dimension;
      float* target = predicted + static_cast<std::size_t>(r) * dimension;
      for (int d = 0; d < dimension; ++d) {
        target[d] = (current[d] - coefficient * target[d]) * inverse_root;
      }
    }
  }

  [[nodiscard]] std::size_t steps() const noexcept { return steps_; }

 private:
  std::size_t steps_;
  std::vector<float> betas_;
  std::vector<float> sqrt_alpha_bars_;
  std::vector<float> sqrt_one_minus_;
  std::vector<float> reverse_coefficient_;
  std::vector<float> root_alphas_;
};

// Sinusoidal encoding for a whole batch of timesteps at once.
//
// Same construction as a transformer's positional encoding, and for the same
// reason: a smooth multi-scale representation of an integer position. The
// frequencies are computed once and reused across the batch.
inline void TimestepEmbedding(const int32_t* __restrict timesteps, int rows, int width,
                              float* __restrict out) {
  const int half = width / 2;
  std::vector<float> frequencies(static_cast<std::size_t>(half));
  for (int i = 0; i < half; ++i) {
    frequencies[static_cast<std::size_t>(i)] =
        std::exp(-std::log(10000.0F) * static_cast<float>(i) / static_cast<float>(half));
  }

#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    float* row = out + static_cast<std::size_t>(r) * width;
    const float t = static_cast<float>(timesteps[r]);
    for (int i = 0; i < half; ++i) {
      const float angle = t * frequencies[static_cast<std::size_t>(i)];
      row[i] = std::sin(angle);
      row[half + i] = std::cos(angle);
    }
  }
}

// Which timesteps a strided deterministic sampler visits.
//
// This is the only real optimization available for sampling, and it works
// because the deterministic reverse process is a trajectory: its intermediate
// states are points on a path, so skipping them is exactly what a solver with
// a larger step size does. Twenty steps out of a thousand is a fifty-fold
// reduction, and quality degrades gradually rather than falling off a cliff.
[[nodiscard]] inline std::vector<int32_t> StridedTimesteps(std::size_t total,
                                                           std::size_t wanted) {
  const std::size_t stride = std::max<std::size_t>(total / wanted, 1);
  std::vector<int32_t> visited;
  visited.reserve(wanted);
  for (std::size_t t = total; t-- > 0;) {
    if ((total - 1 - t) % stride == 0) {
      visited.push_back(static_cast<int32_t>(t));
    }
  }
  return visited;
}

// Classifier-free guidance, fused in place over the conditional buffer.
//
// A serving-time knob trading DIVERSITY for ADHERENCE. Note the cost: it needs
// BOTH a conditional and an unconditional prediction, so guided sampling is
// twice the network evaluations of unguided sampling at the same step count.
inline void GuidedPrediction(float* __restrict conditional,
                             const float* __restrict unconditional, std::size_t count,
                             float scale) {
#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < count; ++i) {
    conditional[i] = unconditional[i] + scale * (conditional[i] - unconditional[i]);
  }
}

// Mean squared error on noise, as one fused reduction.
//
// The DERIVATION is a variational bound with a per-timestep weighting, and
// that weighting is DROPPED here: the simplified objective samples much better
// and is no longer a bound on the likelihood.
[[nodiscard]] inline double NoiseLoss(const float* __restrict predicted,
                                      const float* __restrict epsilon,
                                      std::size_t count) {
  double total = 0.0;

#pragma omp parallel for reduction(+ : total) schedule(static)
  for (std::size_t i = 0; i < count; ++i) {
    const float residual = predicted[i] - epsilon[i];
    total += static_cast<double>(residual) * static_cast<double>(residual);
  }
  return total / static_cast<double>(count);
}

}  // namespace ddpm
`,
        rationale:
          'The two halves of this model optimize in completely different ways, and the contrast is the point. Training batches trivially because the closed-form forward process means every example draws its own random timestep and is diffused directly — so a batch is one indexed read from a precomputed coefficient table and one network pass, with no rollout to parallelize because there is no rollout; the noise is generated inline with a per-row generator so it never needs a separate pass or a buffer of uniforms. Sampling does not batch away at all: the step dependency is real, so the only genuine optimization is to take fewer steps, which is available because the deterministic reverse process is a trajectory whose intermediate points can be skipped. That reframing makes a fifty-fold reduction possible without retraining. Around those, every schedule coefficient including the reverse-step coefficient is precomputed once as a flat float32 array, the reverse step and the guidance combination both run fused in place over the predicted-noise buffer, and the timestep embedding computes its frequencies once for the whole batch. Guidance is noted as doubling the evaluation count, which is easy to forget when quoting step counts.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The noise generation, the scaling and the noisy-input construction happen in one traversal per row, and the reverse step writes through the predicted-noise buffer rather than allocating a new state.',
            tradeoff: 'The predicted noise is destroyed by the reverse step, so inspecting what the model actually predicted — the natural diagnostic when samples degrade at a particular noise level — needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Diffusion, the reverse step, the embedding and the loss reduction are all row-independent, with per-row generator state derived from the row index so the noise stays reproducible.',
            tradeoff: 'The reproducibility now depends on row ordering rather than on a single stream, so a batch assembled in a different order produces different noise for the same data — which makes a training run irreproducible across shuffling changes.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Flat float32 coefficient tables make the per-example timestep lookup a single contiguous read, and row-major activations keep every fused pass stride-one.',
            tradeoff: 'The coefficient tables are indexed by a per-example timestep, so consecutive rows read scattered positions in them — the tables are small enough to stay cached, but the access pattern is genuinely random rather than sequential.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The fused diffusion and reverse-step loops are contiguous, restrict-qualified and of known trip count, which is everything the vectorizer needs including for the transcendentals in the noise generation.',
            tradeoff: 'The vectorized transcendentals differ in low-order bits across targets, so the same seed produces slightly different noise on different machines — which matters because the noise is the training target rather than an implementation detail.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Training becomes one gather and one network pass per batch; sampling becomes S sequential passes with S chosen at serving time. Illustrative, not a measured benchmark: strided deterministic sampling at twenty steps out of a thousand is a fifty-fold reduction, and it is the only optimization here that changes the order of magnitude.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// DDPM, transcribed the way the paper reads.
//
// Two processes:
//
//   FORWARD (fixed, no learning):  gradually add noise until nothing is left
//       q(x_t | x_0) = N(sqrt(alpha_bar_t) x_0, (1 - alpha_bar_t) I)
//
//   REVERSE (learned):             remove a little noise, one step at a time
//       loss = || eps - eps_theta(x_t, t) ||^2
//
// The closed form for q(x_t | x_0) is the structural key: because the noise
// accumulates as a product of Gaussians, ANY timestep can be sampled directly
// from the clean data. Training therefore never simulates a trajectory - all
// the sequential cost is deferred to sampling, which is the whole cost profile
// of this model in one sentence.
//
// Vec-of-Vec, index loops, no libraries.

use std::f64::consts::PI;

/// A deliberately small generator, so the noise story stays visible.
struct Lcg {
    state: u64,
    spare: Option<f64>,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1, spare: None }
    }

    fn uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 11) as f64) / ((1u64 << 53) as f64)
    }

    /// Box-Muller, caching the spare normal it produces for free.
    fn normal(&mut self) -> f64 {
        if let Some(value) = self.spare.take() {
            return value;
        }
        let u1 = self.uniform().max(1e-12);
        let u2 = self.uniform();
        let radius = (-2.0 * u1.ln()).sqrt();
        let angle = 2.0 * PI * u2;
        self.spare = Some(radius * angle.sin());
        radius * angle.cos()
    }
}

struct Schedule {
    betas: Vec<f64>,
    alphas: Vec<f64>,
    alpha_bars: Vec<f64>,
    sqrt_alpha_bars: Vec<f64>,
    sqrt_one_minus_alpha_bars: Vec<f64>,
}

/// The original schedule. Included to be compared against, not used.
///
/// A linear schedule destroys information too quickly at the end, so most of
/// the trajectory is spent at noise levels where the input is already
/// indistinguishable from noise - capacity spent on steps that carry nothing.
fn linear_betas(steps: usize) -> Vec<f64> {
    (0..steps)
        .map(|t| 1e-4 + (0.02 - 1e-4) * t as f64 / (steps - 1) as f64)
        .collect()
}

/// The schedule that actually works, and it is not a minor difference.
///
/// Defined through the CUMULATIVE signal retention rather than the per-step
/// noise, so information is destroyed at a roughly constant rate in perceptual
/// terms. That redistributes the trajectory toward the noise levels where
/// structure lives.
fn cosine_betas(steps: usize, offset: f64) -> Vec<f64> {
    let f = |t: usize| {
        let angle = ((t as f64 / steps as f64) + offset) / (1.0 + offset) * PI / 2.0;
        angle.cos().powi(2)
    };

    let bars: Vec<f64> = (0..=steps).map(|t| f(t) / f(0)).collect();
    (0..steps)
        // Clipped: an unclipped cosine schedule produces betas near one at the
        // end, which makes the reverse step numerically unstable.
        .map(|t| (1.0 - bars[t + 1] / bars[t]).min(0.999))
        .collect()
}

/// Precompute every coefficient the forward and reverse steps need.
///
/// All of these are FIXED - nothing here is learned. That is worth stating
/// plainly, because it is the difference from a VAE: the encoder is not a
/// network, it is a schedule chosen in advance.
fn build_schedule(betas: Vec<f64>) -> Schedule {
    let alphas: Vec<f64> = betas.iter().map(|beta| 1.0 - beta).collect();

    let mut alpha_bars = Vec::with_capacity(alphas.len());
    let mut running = 1.0;
    for &alpha in &alphas {
        running *= alpha;
        alpha_bars.push(running);
    }

    let sqrt_alpha_bars = alpha_bars.iter().map(|a| a.sqrt()).collect();
    let sqrt_one_minus_alpha_bars = alpha_bars.iter().map(|a| (1.0 - a).sqrt()).collect();

    Schedule { betas, alphas, alpha_bars, sqrt_alpha_bars, sqrt_one_minus_alpha_bars }
}

/// Jump straight to timestep t. No intervening steps are simulated.
///
///   x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * eps
///
/// The noise eps is returned because it IS the training target - the loop
/// added it, so the label is known exactly. That is what makes diffusion
/// training so much more stable than anything adversarial: the supervision is
/// a known quantity rather than the output of another network that is also
/// learning.
fn forward_diffuse(
    x0: &[f64],
    t: usize,
    schedule: &Schedule,
    rng: &mut Lcg,
) -> (Vec<f64>, Vec<f64>) {
    let signal = schedule.sqrt_alpha_bars[t];
    let noise_scale = schedule.sqrt_one_minus_alpha_bars[t];

    let epsilon: Vec<f64> = (0..x0.len()).map(|_| rng.normal()).collect();
    let x_t = x0
        .iter()
        .zip(&epsilon)
        .map(|(value, e)| signal * value + noise_scale * e)
        .collect();
    (x_t, epsilon)
}

/// Sinusoidal position encoding over the timestep.
///
/// Same construction as a transformer's positional encoding, and for the same
/// reason: a smooth multi-scale representation of an integer position. A
/// single scalar spanning a thousand values is a poor input to a network.
fn timestep_embedding(t: usize, width: usize) -> Vec<f64> {
    let half = width / 2;
    (0..width)
        .map(|i| {
            let frequency = 10000.0_f64.powf(-2.0 * (i % half) as f64 / width as f64);
            let angle = t as f64 * frequency;
            if i < half {
                angle.sin()
            } else {
                angle.cos()
            }
        })
        .collect()
}

struct DenoiserParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w_time: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

/// The network: given a noisy input and a timestep, predict the noise.
fn denoise(x_t: &[f64], t: usize, params: &DenoiserParams) -> Vec<f64> {
    let embedding = timestep_embedding(t, params.w_time.len());

    let hidden: Vec<f64> = params
        .w1
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let mut total = params.b1[i] + params.w_time[i] * embedding[i % embedding.len()];
            for (weight, value) in row.iter().zip(x_t) {
                total += weight * value;
            }
            total.tanh()
        })
        .collect();

    params
        .w2
        .iter()
        .zip(&params.b2)
        .map(|(row, bias)| bias + row.iter().zip(&hidden).map(|(w, h)| w * h).sum::<f64>())
        .collect()
}

/// One training example. Note there is no rollout anywhere.
///
/// A random timestep, one noise draw, one network evaluation. Training is
/// embarrassingly parallel across examples AND across timesteps, which is
/// entirely due to the closed form above.
fn training_loss(
    x0: &[f64],
    params: &DenoiserParams,
    schedule: &Schedule,
    rng: &mut Lcg,
) -> f64 {
    let t = (rng.uniform() * schedule.betas.len() as f64) as usize;
    let t = t.min(schedule.betas.len() - 1);

    let (x_t, epsilon) = forward_diffuse(x0, t, schedule, rng);
    let predicted = denoise(&x_t, t, params);

    // A plain mean squared error on noise. The DERIVATION is a variational
    // bound of exactly the VAE's form, with a weighting per timestep - and
    // that weighting is DROPPED here. The simplified objective samples much
    // better and is no longer a bound on the likelihood.
    epsilon
        .iter()
        .zip(&predicted)
        .map(|(e, p)| (e - p) * (e - p))
        .sum::<f64>()
        / epsilon.len() as f64
}

/// One reverse step. This is where all the cost lives.
fn reverse_step(
    x_t: &[f64],
    t: usize,
    params: &DenoiserParams,
    schedule: &Schedule,
    rng: &mut Lcg,
    stochastic: bool,
) -> Vec<f64> {
    let predicted = denoise(x_t, t, params);

    let coefficient =
        (1.0 - schedule.alphas[t]) / schedule.sqrt_one_minus_alpha_bars[t];
    let root_alpha = schedule.alphas[t].sqrt();

    let mut next: Vec<f64> = x_t
        .iter()
        .zip(&predicted)
        .map(|(value, p)| (value - coefficient * p) / root_alpha)
        .collect();

    if t == 0 || !stochastic {
        // Setting the injected noise to zero makes the sampler DETERMINISTIC,
        // which is DDIM - and a deterministic trajectory can be traversed in
        // far fewer steps, because its intermediate points can be skipped.
        return next;
    }

    let sigma = schedule.betas[t].sqrt();
    for value in next.iter_mut() {
        *value += sigma * rng.normal();
    }
    next
}

/// Start from pure noise and walk back. S sequential network evaluations.
///
/// This is the whole cost profile: training is one evaluation per example,
/// sampling is S. At a thousand steps that is three orders of magnitude more
/// expensive per sample than a single-pass generator.
fn sample(
    dimension: usize,
    params: &DenoiserParams,
    schedule: &Schedule,
    rng: &mut Lcg,
    stochastic: bool,
) -> Vec<f64> {
    let mut x: Vec<f64> = (0..dimension).map(|_| rng.normal()).collect();
    for t in (0..schedule.betas.len()).rev() {
        x = reverse_step(&x, t, params, schedule, rng, stochastic);
    }
    x
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) sequential evaluations. Illustrative, not a measured benchmark: at a thousand steps that is three orders of magnitude more work per sample than a single-pass generator, which is the defining cost characteristic of the whole family.',
      },

      'make-it-right': {
        code: `//! The same model, with the schedule as a type and the sampler as a choice.
//!
//! Two things change. The noise schedule becomes a type that validates its own
//! invariants and precomputes every derived coefficient once, because it is a
//! FIXED part of the model - baked into the checkpoint, and a sampler using a
//! different one produces degraded output with no error anywhere. And the
//! sampler becomes an explicit type, because step count and determinism are
//! serving parameters that change the output without changing the model.

use std::f64::consts::PI;
use std::fmt;

/// Number of diffusion steps in the schedule.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct DiffusionSteps(pub usize);

/// Number of steps a sampler actually visits — usually far fewer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct SamplingSteps(pub usize);

/// A position in the diffusion process.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Timestep(pub usize);

/// Which noise schedule. Not interchangeable at serving time.
///
/// \`Linear\` destroys information too quickly at the end, so most of the
/// trajectory sits at noise levels where the input carries nothing. \`Cosine\`
/// redistributes it toward the levels where structure lives, and the
/// difference is large rather than marginal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScheduleKind {
    Linear,
    Cosine,
}

/// Stochastic or deterministic, which is a bigger choice than it looks.
///
/// \`Ddpm\` injects noise at every step; \`Ddim\` does not. A deterministic
/// trajectory can be traversed in far fewer steps because its intermediate
/// points are skippable, and it makes the same input give the same output.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SamplerKind {
    Ddpm,
    Ddim,
}

#[derive(Debug, PartialEq)]
pub enum DiffusionError {
    /// A sampler schedule that differs from the trained one.
    ///
    /// Its own variant because the schedule is part of the MODEL, not the
    /// sampler: the network learned to denoise at specific noise levels, and
    /// sampling with different ones degrades the output with nothing to say so.
    ScheduleMismatch,
    /// Signal retention that does not reach the prior, or is not monotone.
    DegenerateSchedule { final_retention: f64 },
    /// A timestep outside the schedule.
    TimestepOutOfRange { t: usize, steps: usize },
    /// Too few steps, or too few for a stochastic sampler.
    ///
    /// Skipping steps assumes a deterministic trajectory whose intermediate
    /// points can be omitted, which stochastic sampling does not have.
    InvalidStepCount { steps: usize, sampler: SamplerKind },
    /// Guidance below one, which pushes away from the condition.
    InvalidGuidance(f64),
}

impl fmt::Display for DiffusionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ScheduleMismatch => write!(
                f,
                "sampling schedule differs from the trained one; the network learned \
                 different noise levels"
            ),
            Self::DegenerateSchedule { final_retention } => write!(
                f,
                "signal retention ends at {final_retention:.3}; the forward process \
                 does not reach the prior the sampler assumes"
            ),
            Self::TimestepOutOfRange { t, steps } => {
                write!(f, "timestep {t} outside [0, {steps})")
            }
            Self::InvalidStepCount { steps, sampler } => write!(
                f,
                "{steps} steps is invalid for {sampler:?}; stochastic sampling cannot \
                 skip steps"
            ),
            Self::InvalidGuidance(scale) => {
                write!(f, "guidance {scale} below 1.0 pushes away from the condition")
            }
        }
    }
}

impl std::error::Error for DiffusionError {}

/// The noisy input AND the noise that was added.
///
/// Both come back because the noise IS the training target - the loop added
/// it, so the label is known exactly. That is what makes diffusion training
/// stable where adversarial training is not: the supervision is a known
/// quantity rather than the output of a network that is also learning.
pub struct NoisedSample {
    pub x_t: Vec<f64>,
    pub epsilon: Vec<f64>,
    pub timestep: Timestep,
}

/// Fixed, not learned, and part of the model artifact.
///
/// Worth stating plainly because it is the structural difference from a VAE:
/// the encoder here is not a network, it is a schedule chosen in advance. All
/// derived coefficients are precomputed once, since they are constants and
/// recomputing them per step is pure waste.
pub struct NoiseSchedule {
    kind: ScheduleKind,
    steps: DiffusionSteps,
    betas: Vec<f64>,
    sqrt_alpha_bars: Vec<f64>,
    sqrt_one_minus: Vec<f64>,
    reverse_coefficient: Vec<f64>,
    root_alphas: Vec<f64>,
}

impl NoiseSchedule {
    pub fn new(
        kind: ScheduleKind,
        steps: DiffusionSteps,
        cosine_offset: f64,
    ) -> Result<Self, DiffusionError> {
        let betas = match kind {
            ScheduleKind::Linear => (0..steps.0)
                .map(|t| 1e-4 + (0.02 - 1e-4) * t as f64 / (steps.0 - 1) as f64)
                .collect::<Vec<f64>>(),
            ScheduleKind::Cosine => Self::cosine(steps.0, cosine_offset),
        };

        // Capacity known exactly: five coefficient tables, one allocation each.
        let mut sqrt_alpha_bars = Vec::with_capacity(steps.0);
        let mut sqrt_one_minus = Vec::with_capacity(steps.0);
        let mut reverse_coefficient = Vec::with_capacity(steps.0);
        let mut root_alphas = Vec::with_capacity(steps.0);

        let mut running = 1.0;
        let mut previous = 1.0;
        for &beta in &betas {
            let alpha = 1.0 - beta;
            running *= alpha;
            // Guard clause: retention must decrease, or the process is not a
            // corruption at all.
            if running >= previous {
                return Err(DiffusionError::DegenerateSchedule { final_retention: running });
            }
            previous = running;

            sqrt_alpha_bars.push(running.sqrt());
            sqrt_one_minus.push((1.0 - running).sqrt());
            reverse_coefficient.push((1.0 - alpha) / (1.0 - running).sqrt());
            root_alphas.push(alpha.sqrt());
        }

        // Guard clause: the reverse process starts from a standard Gaussian,
        // so the forward process must actually reach one.
        if running > 0.01 {
            return Err(DiffusionError::DegenerateSchedule { final_retention: running });
        }

        Ok(Self {
            kind,
            steps,
            betas,
            sqrt_alpha_bars,
            sqrt_one_minus,
            reverse_coefficient,
            root_alphas,
        })
    }

    /// Defined through CUMULATIVE retention rather than per-step noise.
    ///
    /// That is the whole point: information is destroyed at a roughly constant
    /// perceptual rate rather than collapsing at the end.
    fn cosine(steps: usize, offset: f64) -> Vec<f64> {
        let f = |t: usize| {
            let angle = ((t as f64 / steps as f64) + offset) / (1.0 + offset) * PI / 2.0;
            angle.cos().powi(2)
        };
        let bars: Vec<f64> = (0..=steps).map(|t| f(t) / f(0)).collect();
        // Clipped: an unclipped cosine schedule produces betas near one at the
        // end, which makes the reverse step numerically unstable.
        (0..steps)
            .map(|t| (1.0 - bars[t + 1] / bars[t]).min(0.999))
            .collect()
    }

    pub fn steps(&self) -> DiffusionSteps {
        self.steps
    }

    /// Comparable across training and serving, so a mismatch is catchable.
    pub fn fingerprint(&self) -> (ScheduleKind, usize) {
        (self.kind, self.steps.0)
    }

    /// Guard clause for a mismatch with no other symptom.
    pub fn assert_matches(&self, trained: &NoiseSchedule) -> Result<(), DiffusionError> {
        if self.fingerprint() == trained.fingerprint() {
            Ok(())
        } else {
            Err(DiffusionError::ScheduleMismatch)
        }
    }

    /// Jump straight to timestep t. No intervening steps are simulated.
    ///
    /// The closed form is the structural key: because the noise accumulates as
    /// a product of Gaussians, any timestep is directly sampleable from the
    /// clean data. Training therefore never simulates a trajectory.
    pub fn diffuse(
        &self,
        x0: &[f64],
        t: Timestep,
        normals: &[f64],
    ) -> Result<NoisedSample, DiffusionError> {
        if t.0 >= self.steps.0 {
            return Err(DiffusionError::TimestepOutOfRange { t: t.0, steps: self.steps.0 });
        }

        let signal = self.sqrt_alpha_bars[t.0];
        let noise_scale = self.sqrt_one_minus[t.0];
        let epsilon = normals[..x0.len()].to_vec();
        let x_t = x0
            .iter()
            .zip(&epsilon)
            .map(|(value, e)| signal * value + noise_scale * e)
            .collect();

        Ok(NoisedSample { x_t, epsilon, timestep: t })
    }

    pub fn reverse_mean(&self, x_t: &[f64], predicted: &[f64], t: Timestep) -> Vec<f64> {
        let coefficient = self.reverse_coefficient[t.0];
        let root_alpha = self.root_alphas[t.0];
        x_t.iter()
            .zip(predicted)
            .map(|(value, p)| (value - coefficient * p) / root_alpha)
            .collect()
    }

    pub fn sigma(&self, t: Timestep) -> f64 {
        self.betas[t.0].sqrt()
    }
}

/// Serving parameters that change the output without changing the model.
///
/// Explicit because that is exactly what makes them dangerous: two deployments
/// of one checkpoint at different step counts produce materially different
/// quality, and comparing them compares samplers rather than models.
#[derive(Debug, Clone, Copy)]
pub struct SamplerConfig {
    pub kind: SamplerKind,
    pub steps: SamplingSteps,
    pub guidance_scale: f64,
}

impl SamplerConfig {
    pub fn validate(&self) -> Result<(), DiffusionError> {
        if self.steps.0 == 0 {
            return Err(DiffusionError::InvalidStepCount {
                steps: self.steps.0,
                sampler: self.kind,
            });
        }
        // Guard clause for the combination that is simply invalid: skipping
        // steps assumes a deterministic trajectory whose intermediate points
        // can be omitted, which stochastic sampling does not have.
        if self.kind == SamplerKind::Ddpm && self.steps.0 < 100 {
            return Err(DiffusionError::InvalidStepCount {
                steps: self.steps.0,
                sampler: self.kind,
            });
        }
        if self.guidance_scale < 1.0 {
            return Err(DiffusionError::InvalidGuidance(self.guidance_scale));
        }
        Ok(())
    }

    /// Which timesteps to visit, evenly strided and descending.
    pub fn timesteps(&self, schedule: &NoiseSchedule) -> Vec<Timestep> {
        let stride = (schedule.steps().0 / self.steps.0).max(1);
        (0..schedule.steps().0)
            .rev()
            .step_by(stride)
            .map(Timestep)
            .collect()
    }
}

/// The sample AND the settings that produced it.
///
/// Bundled because quality and cost are on a dial here: a sample reported
/// without its step count and guidance scale is not comparable to any other,
/// and that is the most common way diffusion results become meaningless.
pub struct SampleResult {
    pub values: Vec<f64>,
    pub steps_taken: SamplingSteps,
    pub sampler: SamplerKind,
    pub guidance_scale: f64,
}

/// Classifier-free guidance: extrapolate away from the unconditional.
///
/// A serving-time knob trading DIVERSITY for ADHERENCE. Raising it makes each
/// sample match its condition better and makes the collection less varied,
/// which is easy to over-tune because the failure looks like improvement.
pub fn guided_prediction(conditional: &[f64], unconditional: &[f64], scale: f64) -> Vec<f64> {
    conditional
        .iter()
        .zip(unconditional)
        .map(|(c, u)| u + scale * (c - u))
        .collect()
}
`,
        rationale:
          'Two changes. The noise schedule becomes a type that validates its own invariants and precomputes every derived coefficient once — including the reverse-step coefficient and the root alpha, which the literal version recomputed once per step for values that never change. Its validation is substantive: cumulative signal retention is checked for monotonicity as it is built and for actually reaching near zero at the end, because otherwise the reverse process starts from something that is not the prior it assumes. It also carries a fingerprint and a mismatch check, because the schedule is part of the model rather than a sampler setting and sampling with a different one degrades output with nothing to say so. The second change is that the sampler becomes an explicit validated config, since step count, determinism and guidance are serving parameters that change the output without changing the model — which lets the invalid combination be rejected outright: skipping steps assumes a deterministic trajectory whose intermediate points can be omitted, and a stochastic sampler has no such trajectory. Newtypes separate diffusion steps from sampling steps from a timestep, three quantities that are all usize and are genuinely confused.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics, with every schedule coefficient hoisted out of the sampling loop. Illustrative, not a measured benchmark: at a thousand steps those square roots and divisions were being recomputed once per step for values fixed at construction.',
      },

      'make-it-fast': {
        code: `//! Batched training, and a sampler that skips.
//!
//! Two changes of completely different character, which is the point:
//!
//!   TRAINING batches trivially. The closed-form forward process means every
//!   example can draw its own random timestep and be diffused directly, so a
//!   batch is one gather from a precomputed coefficient table and one network
//!   pass. There is no rollout to parallelize because there is no rollout.
//!
//!   SAMPLING does not batch away. It is inherently sequential, and the only
//!   real optimization is to TAKE FEWER STEPS - available because the
//!   deterministic sampler follows a trajectory whose intermediate points can
//!   be skipped. That reframes sampling as solving an ODE, where step count
//!   is a solver choice rather than an approximation to the model.
//!
//! The asymmetry between those two paragraphs is the whole cost profile.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Every coefficient precomputed as a flat array, indexed by timestep.
///
/// All of these are constants of the schedule - nothing is learned. Storing
/// them contiguously means a batch with a different timestep per example is
/// one indexed read rather than a loop.
pub struct FastSchedule {
    sqrt_alpha_bars: Array1<f32>,
    sqrt_one_minus: Array1<f32>,
    reverse_coefficient: Array1<f32>,
    root_alphas: Array1<f32>,
    betas: Array1<f32>,
}

impl FastSchedule {
    pub fn new(betas: Array1<f32>) -> Self {
        let steps = betas.len();
        // Capacity known exactly: four coefficient tables built in one pass.
        let mut sqrt_alpha_bars = Vec::with_capacity(steps);
        let mut sqrt_one_minus = Vec::with_capacity(steps);
        let mut reverse_coefficient = Vec::with_capacity(steps);
        let mut root_alphas = Vec::with_capacity(steps);

        let mut running = 1.0f32;
        for &beta in betas.iter() {
            let alpha = 1.0 - beta;
            running *= alpha;
            sqrt_alpha_bars.push(running.sqrt());
            sqrt_one_minus.push((1.0 - running).sqrt());
            reverse_coefficient.push((1.0 - alpha) / (1.0 - running).sqrt());
            root_alphas.push(alpha.sqrt());
        }

        Self {
            sqrt_alpha_bars: sqrt_alpha_bars.into(),
            sqrt_one_minus: sqrt_one_minus.into(),
            reverse_coefficient: reverse_coefficient.into(),
            root_alphas: root_alphas.into(),
            betas,
        }
    }

    pub fn steps(&self) -> usize {
        self.betas.len()
    }

    /// Every example at its OWN random timestep, in one parallel pass.
    ///
    /// The gather is the whole trick: a different t per example would be a
    /// loop in the literal version, and here it is one indexed read from the
    /// coefficient table per row.
    pub fn diffuse(
        &self,
        x0: ArrayView2<'_, f32>,
        timesteps: &[u32],
        normals: ArrayView2<'_, f32>,
    ) -> Array2<f32> {
        let mut x_t = Array2::<f32>::zeros(x0.raw_dim());

        Zip::from(x_t.axis_iter_mut(Axis(0)))
            .and(x0.axis_iter(Axis(0)))
            .and(normals.axis_iter(Axis(0)))
            .and(timesteps)
            .par_for_each(|mut target, source, noise, &t| {
                let signal = self.sqrt_alpha_bars[t as usize];
                let noise_scale = self.sqrt_one_minus[t as usize];
                // Fused: the noisy input is built in one pass over the row
                // rather than materializing both scaled terms separately.
                for ((slot, &value), &e) in
                    target.iter_mut().zip(source.iter()).zip(noise.iter())
                {
                    *slot = signal * value + noise_scale * e;
                }
            });

        x_t
    }

    /// One reverse step, fused and in place over the predicted-noise buffer.
    pub fn reverse_step(
        &self,
        x_t: ArrayView2<'_, f32>,
        predicted: &mut Array2<f32>,
        t: usize,
    ) {
        let coefficient = self.reverse_coefficient[t];
        let inverse_root = 1.0 / self.root_alphas[t];

        Zip::from(predicted)
            .and(x_t)
            .par_for_each(|target, &current| {
                *target = (current - coefficient * *target) * inverse_root;
            });
    }
}

/// Sinusoidal encoding for a whole batch of timesteps at once.
///
/// Same construction as a transformer's positional encoding, and for the same
/// reason: a smooth multi-scale representation of an integer position. The
/// frequencies are computed once and reused across the batch.
pub fn timestep_embedding(timesteps: &[u32], width: usize) -> Array2<f32> {
    let half = width / 2;
    let frequencies: Vec<f32> = (0..half)
        .map(|i| (-(10000.0f32).ln() * i as f32 / half as f32).exp())
        .collect();

    let mut out = Array2::<f32>::zeros((timesteps.len(), width));
    Zip::from(out.axis_iter_mut(Axis(0)))
        .and(timesteps)
        .par_for_each(|mut row, &t| {
            for (i, &frequency) in frequencies.iter().enumerate() {
                let angle = t as f32 * frequency;
                row[i] = angle.sin();
                row[half + i] = angle.cos();
            }
        });
    out
}

/// Which timesteps a strided deterministic sampler visits.
///
/// This is the only real optimization available for sampling, and it works
/// because the deterministic reverse process is a trajectory: its intermediate
/// states are points on a path, so skipping them is exactly what a solver with
/// a larger step size does. Twenty steps out of a thousand is a fifty-fold
/// reduction, and quality degrades gradually rather than falling off a cliff.
pub fn strided_timesteps(total: usize, wanted: usize) -> Vec<u32> {
    let stride = (total / wanted).max(1);
    (0..total).rev().step_by(stride).map(|t| t as u32).collect()
}

/// Mean squared error on noise, as one parallel reduction.
///
/// The DERIVATION is a variational bound with a per-timestep weighting, and
/// that weighting is DROPPED here: the simplified objective samples much
/// better and is no longer a bound on the likelihood.
pub fn noise_loss(predicted: ArrayView2<'_, f32>, epsilon: ArrayView2<'_, f32>) -> f64 {
    let total: f64 = Zip::from(predicted)
        .and(epsilon)
        .into_par_iter()
        .map(|(&p, &e)| {
            let residual = f64::from(p - e);
            residual * residual
        })
        .sum();
    total / predicted.len() as f64
}

/// Classifier-free guidance, fused in place over the conditional buffer.
///
/// A serving-time knob trading DIVERSITY for ADHERENCE. Note the cost: it
/// needs BOTH a conditional and an unconditional prediction, so guided
/// sampling is twice the network evaluations of unguided sampling at the same
/// step count.
pub fn guided_prediction(
    conditional: &mut Array2<f32>,
    unconditional: ArrayView2<'_, f32>,
    scale: f32,
) {
    Zip::from(conditional)
        .and(unconditional)
        .par_for_each(|c, &u| {
            *c = u + scale * (*c - u);
        });
}

/// Per-sample squared norm, for monitoring the trajectory.
///
/// Worth tracking during sampling: the state should shrink toward the data
/// scale as noise is removed, and a norm that grows means the schedule used at
/// sampling does not match the one the network was trained on.
pub fn trajectory_norms(x: ArrayView2<'_, f32>) -> Vec<f32> {
    x.axis_iter(Axis(0))
        .into_par_iter()
        .map(|row| row.iter().map(|v| v * v).sum::<f32>().sqrt())
        .collect()
}
`,
        rationale:
          'The two halves of this model optimize in completely different ways, and the contrast is the point. Training batches trivially because the closed-form forward process means every example draws its own random timestep and is diffused directly — so a batch is one indexed read from a precomputed coefficient table and one network pass, with no rollout to parallelize because there is no rollout. Sampling does not batch away at all: the step dependency is real, so the only genuine optimization is to take fewer steps, which is available because the deterministic reverse process is a trajectory whose intermediate points can be skipped. That reframing makes a fifty-fold reduction possible without retraining. Around those, all four schedule coefficient tables are built in one pass with known capacity and stored contiguously in f32, the diffusion and the reverse step both fuse into one parallel traversal per row, and the timestep embedding computes its frequencies once for the whole batch. Guidance runs in place over the conditional buffer, with the cost noted: it needs both predictions, so guided sampling is twice the evaluations at the same step count.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Diffusion, the reverse step, the embedding, the loss and the guidance combination are all row- or element-independent with no shared writes.',
            tradeoff: 'Only the batch axis parallelizes — the sampling steps themselves are sequential, so a single-sample interactive request gets no benefit at all and the only lever left is step count.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The reverse step and the guidance combination both write through the predicted-noise buffer rather than allocating a new state, so a sampling step allocates nothing beyond the network output.',
            tradeoff: 'The predicted noise is destroyed by the reverse step, so inspecting what the model actually predicted — the natural diagnostic when samples degrade at a particular noise level — needs an unfused pass.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'All four coefficient tables have exactly known lengths and are built in a single pass over the betas, so the schedule construction allocates once per table.',
            tradeoff: 'The tables are indexed by a per-example timestep, so consecutive rows read scattered positions — they stay cached at realistic step counts, but the access pattern is genuinely random rather than sequential.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-major activations and contiguous f32 coefficient tables keep every fused pass stride-one and every gather a single aligned read.',
            tradeoff: 'The fused diffusion pass requires the noise to be supplied as a matching contiguous array rather than generated inline, which means a separate allocation for the normals that a generate-as-you-go version would avoid.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Training becomes one gather and one network pass per batch; sampling becomes S sequential passes with S chosen at serving time. Illustrative, not a measured benchmark: strided deterministic sampling at twenty steps out of a thousand is a fifty-fold reduction, and it is the only optimization here that changes the order of magnitude.',
      },
    },
  },
};
