import type { AiMlModel } from '../../types';

/**
 * Score-based models & flow matching — the entry that shows three apparently
 * different methods are one method.
 *
 * DDPM, denoising score matching and flow matching were developed separately
 * and look nothing alike. They are the same object viewed from three angles,
 * and seeing why is more useful than any one of them individually — it is
 * also what makes the twenty-step samplers possible.
 */
export const SCORE_BASED_FLOW_MATCHING: AiMlModel = {
  slug: 'score-based-flow-matching',
  name: 'Score-Based Models & Flow Matching',
  aliases: ['Score matching', 'Denoising score matching', 'SDE diffusion', 'Probability flow ODE', 'Flow matching', 'Rectified flow', 'Stochastic interpolants'],
  category: 'generative-ai',
  group: 'diffusion',
  kind: 'model',

  paradigms: ['self-supervised', 'unsupervised'],
  taskTypes: ['generation', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Self-supervised for the same reason DDPM is: the regression target is constructed by the training loop from a known interpolation, so the label is exact. What changes here is not the paradigm but the framing — the discrete chain of denoising steps becomes a continuous-time process, which is what makes the connection to differential equations and the resulting sampler improvements available.',

  intuition:
    'Stop thinking about a thousand discrete denoising steps and think about a continuous path from noise to data. At any point along that path there is a direction that leads toward the data distribution — the score, or equivalently a velocity — and a network can be trained to predict it by regression. Once you have that direction field, generating a sample is solving a differential equation, which means every numerical-integration technique becomes available. Flow matching then asks the obvious follow-up: if the path is ours to choose, why not choose a straight one? A straight path can be traversed in very few large steps, which is the whole reason modern samplers need dozens rather than thousands.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\mathbb{E}_{t,\\mathbf{x}_0,\\mathbf{x}_1}\\Bigl[\\bigl\\lVert v_\\theta(\\mathbf{x}_t, t) - u_t(\\mathbf{x}_t \\mid \\mathbf{x}_0,\\mathbf{x}_1) \\bigr\\rVert^2\\Bigr], \\quad \\mathbf{x}_t = (1-t)\\mathbf{x}_0 + t\\mathbf{x}_1, \\quad u_t = \\mathbf{x}_1 - \\mathbf{x}_0',
      symbols: [
        { symbol: 'v_\\theta', meaning: 'the learned velocity field — where to move at this point and this time' },
        { symbol: 'u_t', meaning: 'the conditional target velocity, known exactly because the interpolation was constructed' },
        { symbol: '\\mathbf{x}_0, \\mathbf{x}_1', meaning: 'a noise sample and a data sample, paired arbitrarily; the path between them is chosen, not derived' },
        { symbol: '\\mathbf{x}_t', meaning: 'a point on the interpolation — the closed form is what makes training parallel across t' },
        { symbol: '\\nabla_{\\mathbf{x}}\\log p_t(\\mathbf{x})', meaning: 'the score; a fixed affine transform of this velocity, which is why the two objectives are one' },
      ],
    },
    reading:
      'Classified as a plain loss rather than a likelihood or a bound, and that classification is the point. What is optimized is an ordinary regression against a target the training loop constructed and therefore knows exactly — for the straight-line path, the target velocity is literally the difference between the two endpoints, a constant along the whole path. The connection to likelihood is a theorem about the trained model rather than a property of the objective: once the velocity field is learned, the associated probability-flow ODE transports the prior to the data distribution, and integrating the divergence along it recovers an exact log-likelihood. So the training is regression and the density comes afterwards, which is a cleaner separation than either the VAE’s bound or a flow’s architectural constraint.',
  },

  optimization: {
    method: 'Adam on the velocity or score regression, with the path chosen for straightness and sampling as an ODE solve',
    updateRule: {
      formula:
        'd\\mathbf{x} = \\Bigl[f(\\mathbf{x},t) - \\tfrac{1}{2}g(t)^2 \\nabla_{\\mathbf{x}}\\log p_t(\\mathbf{x})\\Bigr]dt \\quad (\\text{ODE}), \\qquad d\\mathbf{x} = \\bigl[\\cdots - g(t)^2\\nabla\\log p_t\\bigr]dt + g(t)\\,d\\bar{\\mathbf{w}} \\quad (\\text{SDE})',
      symbols: [
        { symbol: 'g(t)\\,d\\bar{\\mathbf{w}}', meaning: 'the noise term; present in the SDE, absent in the ODE, and the two share the same marginals' },
        { symbol: '\\nabla\\log p_t', meaning: 'the score, supplied by the network — the only learned quantity in either equation' },
        { symbol: 'f(\\mathbf{x},t)', meaning: 'the drift of the forward corruption; fixed by the choice of process, not learned' },
        { symbol: '\\tfrac{1}{2} \\text{ versus } 1', meaning: 'the only difference between the two equations: halving the score term removes the stochasticity and preserves the marginals' },
      ],
    },
    rationale:
      'Two results do all the work. The first is that the stochastic process and a deterministic ODE share the same time-marginal distributions, differing only by a factor on the score term — which means you can train once and sample either way, and the deterministic route gives reproducibility, exact likelihoods, and a trajectory whose intermediate points can be skipped. That single equivalence is what turned diffusion sampling from a fixed thousand-step procedure into a solver problem where the whole numerical-integration literature applies. The second is that the path is a design choice. The variance-preserving path DDPM uses is curved, so a large step leaves the trajectory; a straight-line interpolation between noise and data has constant velocity, so in principle one step suffices and in practice a handful does. Rectification then goes further, re-pairing noise with the data it actually flowed to and retraining, which straightens the paths iteratively. This is the clearest case in this reference of improving a method by changing the problem rather than the model.',
    hyperparameters: [
      { name: 'path / interpolant', role: 'Straight-line, variance-preserving, or variance-exploding. Straightness is what determines how few steps work', typicalRange: 'linear / VP / VE' },
      { name: 'time distribution', role: 'How t is sampled during training. Uniform is standard; logit-normal emphasizes the middle where the task is hardest', typicalRange: 'uniform / logit-normal' },
      { name: 'sampling steps', role: 'A solver choice rather than a model property. Straight paths need far fewer than curved ones', typicalRange: '1 to 100' },
      { name: 'solver', role: 'Euler, Heun, or a higher-order method. A better solver buys quality at the same step count for free', typicalRange: 'Euler / Heun / DPM' },
      { name: 'rectification rounds', role: 'Re-pair and retrain to straighten the paths. Each round trades training compute for fewer sampling steps', typicalRange: '0 to 3' },
      { name: 'prediction target', role: 'Score, noise, or velocity. All are affine transforms of each other, but they weight the noise levels differently', typicalRange: 'v / eps / score' },
    ],
    convergence:
      'Training is a regression against an exactly known target, so it inherits every good property of diffusion training: one loss, it goes down, no equilibrium, no collapse. The failures live at sampling time and are solver failures rather than optimization ones. Too few steps on a curved path produces samples that have visibly left the trajectory — and the fix is a straighter path or a better solver rather than more training, which is a genuinely different diagnosis from anything else in this reference. The score is also badly estimated at very low noise levels, where the true score diverges and the network has seen few examples that close to the data, so integrating all the way to zero noise amplifies whatever error is there; the standard fix is to stop slightly short. And the three formulations use different conventions for what the network predicts, so a checkpoint from one framework sampled by another’s code produces plausible nonsense — a conversion error rather than a model error, and a common one.',
    complexity:
      'Training is O(1) network evaluations per example, exactly as in DDPM. Sampling is O(S) sequential evaluations, but S is now genuinely small: straight paths with a good solver reach acceptable quality in the tens rather than the thousands, and distillation pushes it toward one. Likelihood evaluation additionally needs the divergence of the velocity field along the trajectory, which is estimated stochastically because computing it exactly is quadratic in dimension.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'The same conditional setup as any diffusion forecaster — condition the velocity field on an encoded history and integrate over the forecast window — with the difference concentrated at sampling time, where a straight path and a decent solver bring the cost from hundreds of evaluations per trajectory down to tens.',
        where: [
          'Probabilistic forecasting where the sampling cost of ordinary diffusion was the blocker',
          'Large panels needing many trajectories per series, where a tenfold sampling reduction decides feasibility',
          'Applications wanting an exact predictive likelihood, which the probability-flow ODE supplies and a bound would not',
          'Imputation, where the fixing-known-values trick carries over unchanged',
        ],
        why: 'The argument is entirely about cost. Everything that makes diffusion attractive for forecasting — unconstrained predictive distributions, jointly consistent trajectories, imputation for free — is inherited unchanged, and the sampling cost that made it impractical on a large panel drops by an order of magnitude. The exact likelihood via the deterministic sampler is a genuine secondary benefit, because it allows the model to be compared against a quantile forecaster on a common footing. Against it: still far more machinery than a quantile head, still no calibration guarantee, and on most business series the predictive distribution does not need this much freedom. The trigger is unchanged from the diffusion entry — demonstrated multimodality or a genuine need for joint samples — and only the cost objection has weakened.',
        featurization: [
          'Use a straight-line interpolant, since that is where the step-count reduction comes from',
          'Condition the velocity field at every solver step, not only at initialization',
          'Stop integration slightly short of zero noise, where the score is badly estimated and error is amplified',
          'Report the solver and step count with every result, because they change the output as much as the model does',
        ],
        evaluation:
          'Continuous ranked probability score against a quantile baseline, with the step count and solver stated. The exact likelihood from the probability-flow ODE is worth reporting alongside, since it is a comparison a diffusion model could not previously offer.',
        pitfalls: [
          'A curved path forcing many steps and losing the cost advantage entirely',
          'Integrating to exactly zero noise, where the score estimate is worst',
          'Conditioning only at initialization, so the history influence fades along the trajectory',
          'Comparing against a diffusion baseline at a different step count, which compares solvers',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'The probability-flow ODE gives an exact log-likelihood, so the score is a density in the same sense as a normalizing flow’s — with the difference that the divergence term must be estimated stochastically, since computing it exactly is quadratic in dimension.',
        where: [
          'Density-based detection where an exact likelihood is wanted and a bound will not do',
          'Domains where a flow’s architectural constraints are too restrictive but its exactness is needed',
          'Partial-noising reconstruction detection, inherited directly from the diffusion formulation',
        ],
        why: 'It supplies what a VAE cannot and a normalizing flow can, without the flow’s dimension-preserving architecture — which is a real structural advantage, since the architecture is free here. The caveats are inherited rather than new and they are the important part: the high-dimensional likelihood pathology applies exactly as it does to flows, so out-of-distribution inputs can score higher than training data and "low likelihood implies anomalous" is not reliable in image-scale dimensions. The stochastic divergence estimator adds variance to the very number you wanted exactly, and evaluating a likelihood means integrating an ODE, which is far more expensive than a forward pass. Validate on known out-of-distribution data before trusting it.',
        featurization: [
          'Use the deterministic sampler for likelihood, since the stochastic one does not give one',
          'Average the divergence estimator over several draws, or the likelihood moves between evaluations of the same input',
          'Validate against held-out out-of-distribution data, because the high-dimensional pathology is invisible from training',
          'Tighten solver tolerance for likelihood relative to sampling, since density is far more sensitive to integration error',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget, plus the explicit check that out-of-distribution data scores lower than in-distribution — the check that catches the likelihood pathology, and one that is almost never run. Report likelihood variance across divergence-estimator draws.',
        pitfalls: [
          'The high-dimensional likelihood inversion, inherited unchanged from normalizing flows',
          'Reporting a likelihood as exact when the divergence term was estimated stochastically',
          'Integration cost making density-based scoring impractical at scale',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'This entry is a unification result and its consequences, which makes it optimization and numerical analysis almost end to end. Three separately-developed methods — the discrete denoising chain, denoising score matching, and flow matching — turn out to be the same object under different parameterizations, and once that is seen, sampling stops being a fixed procedure and becomes a solver problem. The path itself then becomes a design variable: choose a straight one and large steps stay on the trajectory, which is where the order-of-magnitude reduction in sampling cost comes from.',
        where: [
          'The SDE-ODE equivalence: same marginals, and the deterministic route gives reproducibility, likelihoods and skippable steps',
          'Higher-order solvers buying quality at fixed step count, with no retraining at all',
          'Path straightness as a design variable — improving the method by changing the problem rather than the model',
          'Rectification and distillation as iterative straightening, trading training compute for sampling steps',
        ],
        why: 'Worth studying because it is the clearest demonstration in this reference that reformulating a problem can be worth more than improving a solution. Nothing about the network changed between a thousand-step DDPM and a twenty-step flow-matching sampler; what changed was recognizing that sampling is integration and that the path being integrated was a free choice made badly. The SDE-ODE equivalence is the transferable technical result — two processes agreeing on their marginals while differing in every trajectory, so you can pick whichever has the properties you need. And the fact that the same trained network can be sampled stochastically for diversity or deterministically for reproducibility, with no retraining, is a design freedom almost nothing else here offers.',
        featurization: [
          'Prefer a straight interpolant; curvature is precisely what forces small steps',
          'Use a higher-order solver before increasing the step count, since it is free quality at fixed cost',
          'Convert carefully between score, noise and velocity parameterizations — they are affine transforms of each other and mixing conventions silently produces nonsense',
          'Measure path curvature directly rather than inferring it from sample quality, since it predicts the achievable step count',
        ],
        evaluation:
          'Plot quality against step count for each solver and path choice; the shape of that curve is the actual result and a single number at one step count hides it. Verify the SDE and ODE samplers agree in distribution, which is both a correctness check on the implementation and a demonstration of the equivalence.',
        pitfalls: [
          'Mixing parameterization conventions between frameworks, which produces plausible nonsense rather than an error',
          'Increasing step count when a better solver would have been free',
          'Comparing models at different step counts, which measures the sampler',
          'Assuming a straight path without measuring curvature, when the training may not have produced one',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'The current standard formulation for image and video generation: a velocity-prediction network trained with a straight-line interpolant in a compressed latent space, sampled with a higher-order solver in a few dozen steps. The architecture is unchanged from diffusion; the path and the sampler are what moved.',
        where: [
          'Text-to-image and text-to-video generation at current production scale',
          'Few-step generation via rectification or distillation, approaching single-pass latency',
          'Exact likelihood evaluation for model comparison, which adversarial models cannot offer',
          'Image editing and inpainting, inherited unchanged from the diffusion formulation',
        ],
        why: 'It kept everything that made diffusion win — stable training, good mode coverage, natural conditioning — and removed the objection that mattered most, which was inference cost. A few dozen steps rather than a thousand is the difference between a batch job and an interactive one, and distillation is pushing that toward single-pass, which would close the last gap to a GAN. The honest caveats are that very-few-step samples are still visibly worse than many-step ones on fine detail, and that the proliferation of parameterizations across frameworks makes checkpoint interchange genuinely error-prone in a way the DDPM era was not.',
        featurization: [
          'Work in a pretrained latent space, which remains the single largest cost reduction available',
          'Use velocity prediction with a straight interpolant, the current default for good reasons',
          'Choose a higher-order solver before raising the step count',
          'Pin the parameterization convention explicitly when exchanging checkpoints between frameworks',
        ],
        evaluation:
          'Quality and diversity at a stated step count and solver, with the quality-versus-steps curve reported rather than a single point. Compare against a diffusion baseline at matched inference cost, which is the comparison that reflects the actual advance.',
        pitfalls: [
          'Checkpoint parameterization mismatches between frameworks, producing plausible nonsense',
          'Very-low-step sampling degrading fine detail in ways aggregate metrics miss',
          'Quality numbers without a step count, which are not comparable to anything',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Identical in shape to DDPM — one network evaluation per example, no rollout — so the training budget is unremarkable. Rectification rounds add whole additional training runs, which is a deliberate trade of training compute for sampling steps and should be planned as such.',
    inferenceProfile:
      'The reason this entry exists: tens of sequential evaluations rather than hundreds or thousands, and distillation pushes toward one. Still more than a single-pass generator, but no longer in a different regime, and the step count is a serving parameter rather than a model property.',
    retrainingCadence:
      'Per project. The sampler, solver and step count can all change without retraining, which means inference quality and cost can be retuned in production against a fixed checkpoint.',
    driftAndMonitoring: [
      'Report solver and step count with every quality measurement, since both change the output as much as the model does',
      'Track path curvature if rectification is used, because that is what determines how few steps remain viable',
      'Verify the deterministic and stochastic samplers still agree in distribution after any change, as a correctness check',
      'Monitor likelihood variance across divergence-estimator draws wherever density is being used',
    ],
    productionGotchas: [
      'Parameterization conventions differ between frameworks. A checkpoint predicting velocity sampled by code expecting noise produces plausible nonsense with no error anywhere, and this is the most common failure when exchanging models',
      'The step count is a serving parameter. Two deployments of one checkpoint at different counts produce materially different quality, and comparing them compares solvers',
      'Integrating to exactly zero noise amplifies the worst-estimated part of the score. Stopping slightly short is standard and its omission is a subtle quality loss',
      'Exact likelihood needs the deterministic sampler and a stochastic divergence estimator, so the number has variance — averaging over draws is required before it means anything',
      'A straight path is a property of the training, not a guarantee. Measure curvature rather than assuming the interpolant produced what it was meant to',
    ],
  },

  assumptions: [
    'The data is continuous, so a continuous-time transport between noise and data is meaningful',
    'One network can represent the velocity or score across every time along the path',
    'The learned field is smooth enough that a large-step solver stays on the trajectory — which is what path straightness buys',
    'The sampling parameterization matches the training one, since they are affine transforms and mixing them is silent',
    'Likelihood, where used, is a meaningful measure of typicality — false in high dimensions, exactly as for normalizing flows',
  ],

  pros: [
    {
      point: 'An order of magnitude fewer sampling steps',
      context:
        'Tens rather than thousands, from choosing a straight path and a better solver. The single change that made diffusion-family models viable for interactive use, and it required no architectural change at all.',
    },
    {
      point: 'One trained model, two samplers',
      context:
        'Stochastic for diversity, deterministic for reproducibility and exact likelihoods — the same network, chosen at serving time. A design freedom almost nothing else in this reference offers.',
    },
    {
      point: 'Exact likelihood without architectural constraint',
      context:
        'The probability-flow ODE gives a real density, where a VAE gives a bound and a normalizing flow demands an invertible dimension-preserving architecture. This gets the exactness and keeps the architecture free.',
    },
    {
      point: 'Regression training against an exact target',
      context:
        'Inherits every good property of diffusion training — one loss, no equilibrium, no collapse — while the improvements happen entirely at sampling time.',
    },
    {
      point: 'The path is a design variable',
      context:
        'Improving the method by changing the problem rather than the model is the transferable lesson here, and it is rare enough to be worth naming.',
    },
  ],

  cons: [
    {
      point: 'Parameterization conventions are a minefield',
      context:
        'Score, noise and velocity are affine transforms of each other, and every framework picks differently. A mismatch produces plausible nonsense rather than an error, and it is the most common failure when exchanging checkpoints.',
    },
    {
      point: 'Still sequential, still more than one pass',
      context:
        'Tens of evaluations is a large improvement on thousands and is still not a single forward pass. Where latency is the binding constraint, a GAN or a distilled model is still the answer.',
    },
    {
      point: 'The score is badly estimated near zero noise',
      context:
        'The true score diverges there and the network has seen little data that close, so integrating all the way amplifies the error. Stopping short is standard and its omission is a subtle, easily-missed quality loss.',
    },
    {
      point: 'Exact likelihood is expensive and stochastic',
      context:
        'It needs an ODE solve plus a divergence estimate that is quadratic in dimension if done exactly, so the practical version has variance. Calling the result exact without averaging over draws overstates it.',
    },
    {
      point: 'Straightness is not guaranteed',
      context:
        'Choosing a straight interpolant does not ensure the learned field produces straight trajectories. Curvature has to be measured, and rectification costs whole additional training runs to fix.',
    },
  ],

  relatedSlugs: ['ddpm', 'normalizing-flows', 'neural-ode', 'time-series-diffusion', 'vae'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Score matching, the probability-flow ODE, and flow matching side by side.

Three formulations that look nothing alike and are the same object:

  DENOISING SCORE MATCHING   regress the score of the noised distribution
  PROBABILITY FLOW ODE       a deterministic path with the same marginals
  FLOW MATCHING              regress a velocity along a chosen path

The point of putting them in one file is the conversion functions at the
bottom: score, noise and velocity are AFFINE TRANSFORMS of each other. Mixing
conventions between frameworks produces plausible nonsense with no error
anywhere, which is the most common failure when exchanging checkpoints.

Plain loops, no libraries.
"""

import math
import random

SEED = 31


def network(x, t, params):
    """Predicts a direction. Which direction depends on the convention.

    That ambiguity is not sloppiness - it is the actual situation. The same
    architecture is trained to predict a score, a noise vector or a velocity
    depending on the framework, and the caller has to know which.
    """
    embedding = math.sin(t * math.pi), math.cos(t * math.pi)

    hidden = []
    for i, row in enumerate(params['w1']):
        total = params['b1'][i] + params['w_time'][i] * embedding[i % 2]
        for weight, value in zip(row, x):
            total += weight * value
        hidden.append(math.tanh(total))

    return [
        bias + sum(w * h for w, h in zip(row, hidden))
        for row, bias in zip(params['w2'], params['b2'])
    ]


# --------------------------------------------------------------------------
# Denoising score matching
# --------------------------------------------------------------------------

def denoising_score_matching_loss(x0, sigma, params, rng):
    """Regress the score of the NOISED distribution, not of the data.

    The trick that makes this tractable: the score of the data distribution is
    unknown, but the score of the data-plus-known-noise distribution has a
    closed form - it is just the scaled noise. So an intractable objective
    becomes a regression against a target the loop constructed.

        score of q(x_t | x_0) = -(x_t - x_0) / sigma^2 = -eps / sigma
    """
    epsilon = [rng.gauss(0.0, 1.0) for _ in x0]
    x_t = [value + sigma * e for value, e in zip(x0, epsilon)]

    target = [-e / sigma for e in epsilon]
    predicted = network(x_t, sigma, params)

    return sum((t - p) ** 2 for t, p in zip(target, predicted)) / len(target)


# --------------------------------------------------------------------------
# Flow matching
# --------------------------------------------------------------------------

def flow_matching_loss(x0, x1, params, rng):
    """Regress a VELOCITY along a chosen path.

    With a straight-line interpolation the target velocity is simply the
    difference between the endpoints - a CONSTANT along the whole path. That
    is the entire reason flow matching samples in few steps: a constant
    velocity means one large step is exact, and in practice a handful suffice.

        x_t = (1 - t) * x0 + t * x1
        u_t = x1 - x0                 <- constant in t
    """
    t = rng.random()
    x_t = [(1.0 - t) * a + t * b for a, b in zip(x0, x1)]

    target = [b - a for a, b in zip(x0, x1)]
    predicted = network(x_t, t, params)

    return sum((u - p) ** 2 for u, p in zip(target, predicted)) / len(target)


# --------------------------------------------------------------------------
# Sampling: the same trained field, two different equations
# --------------------------------------------------------------------------

def sde_sample_step(x, t, step, params, rng, g):
    """Stochastic: inject noise at every step.

    Gives diversity and does NOT give a likelihood, because the trajectory is
    not a deterministic map.
    """
    score = network(x, t, params)
    drift = [-g * g * s for s in score]
    noise_scale = math.sqrt(abs(step)) * g

    return [
        value + step * d + noise_scale * rng.gauss(0.0, 1.0)
        for value, d in zip(x, drift)
    ]


def ode_sample_step(x, t, step, params, g):
    """Deterministic: the SAME marginals, with HALF the score coefficient.

    That factor of one half is the only difference between the two equations,
    and it is the whole result: the stochastic process and this deterministic
    ODE agree on their time-marginal distributions while sharing no
    trajectories at all.

    What the deterministic route buys: reproducibility, an exact likelihood,
    and a trajectory whose intermediate points can be SKIPPED - which is what
    turned sampling from a fixed procedure into a solver problem.
    """
    score = network(x, t, params)
    drift = [-0.5 * g * g * s for s in score]
    return [value + step * d for value, d in zip(x, drift)]


def euler_sample(dimension, params, steps, rng, g=1.0):
    """First-order integration. The simplest solver, and rarely the best.

    A higher-order solver buys quality at the SAME step count for free, which
    is worth trying before increasing the step count.
    """
    x = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    step = -1.0 / steps

    # Stop slightly short of zero: the true score DIVERGES there and the
    # network has seen little data that close, so integrating all the way
    # amplifies the worst-estimated part of the field.
    for index in range(steps):
        t = 1.0 - index / steps
        x = ode_sample_step(x, max(t, 1e-3), step, params, g)
    return x


def heun_sample(dimension, params, steps, rng, g=1.0):
    """Second-order: evaluate, step, re-evaluate, average the two slopes.

    Twice the evaluations per step and a much better step, so at a fixed
    evaluation budget it usually wins. That is the cheapest quality
    improvement available in this whole family.
    """
    x = [rng.gauss(0.0, 1.0) for _ in range(dimension)]
    step = -1.0 / steps

    for index in range(steps):
        t = max(1.0 - index / steps, 1e-3)
        first = network(x, t, params)
        predicted = [value + step * (-0.5 * g * g * s) for value, s in zip(x, first)]

        next_t = max(t + step, 1e-3)
        second = network(predicted, next_t, params)

        x = [
            value + step * (-0.5 * g * g) * 0.5 * (a + b)
            for value, a, b in zip(x, first, second)
        ]
    return x


# --------------------------------------------------------------------------
# The conversions. This is the part that causes real production failures.
# --------------------------------------------------------------------------

def noise_to_score(epsilon_prediction, sigma):
    """score = -eps / sigma."""
    return [-e / sigma for e in epsilon_prediction]


def score_to_noise(score_prediction, sigma):
    """eps = -sigma * score."""
    return [-sigma * s for s in score_prediction]


def velocity_to_score(velocity, x_t, t):
    """For a straight-line path, velocity and score are related through the
    interpolation coefficients.

    All three quantities are AFFINE TRANSFORMS of each other. A checkpoint
    predicting velocity, sampled by code expecting noise, produces output that
    looks like a badly trained model rather than like a bug - which is exactly
    why this is worth writing down rather than leaving implicit.
    """
    return [(v - value) / max(1.0 - t, 1e-6) for v, value in zip(velocity, x_t)]


def path_curvature(trajectory):
    """How far the sampled path deviates from a straight line.

    This is what determines how few steps are viable, and it is worth
    MEASURING rather than assuming: choosing a straight interpolant does not
    guarantee the learned field produces straight trajectories.
    """
    if len(trajectory) < 3:
        return 0.0

    start, end = trajectory[0], trajectory[-1]
    straight = [b - a for a, b in zip(start, end)]
    length = math.sqrt(sum(v * v for v in straight)) or 1.0

    total = 0.0
    for index in range(1, len(trajectory) - 1):
        fraction = index / (len(trajectory) - 1)
        expected = [a + fraction * d for a, d in zip(start, straight)]
        deviation = math.sqrt(
            sum((p - e) ** 2 for p, e in zip(trajectory[index], expected))
        )
        total += deviation

    return total / (len(trajectory) - 2) / length
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) for a first-order solver and O(2S) for Heun. Illustrative, not a measured benchmark: Heun doubles the per-step cost and usually wins at a fixed evaluation budget, which is why solver choice should be exhausted before step count is raised.',
      },

      'make-it-right': {
        code: `"""The same formulations, with the parameterization made a type.

One change dominates. Score, noise and velocity are affine transforms of each
other, and every framework picks a different one — so a checkpoint predicting
velocity, sampled by code expecting noise, produces output that looks like a
badly trained model rather than like a bug. Making the convention part of the
type means that mismatch becomes an error rather than a mystery, and it is the
single highest-value piece of typing in this entry.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple, Protocol, Sequence


class Parameterization(Enum):
    """What the network predicts. NOT interchangeable between frameworks.

    All three are affine transforms of each other, which is exactly what makes
    a mismatch so dangerous: the output is plausible rather than obviously
    wrong, so it reads as a poorly trained model.
    """

    SCORE = 'score'
    NOISE = 'noise'
    VELOCITY = 'velocity'


class ParameterizationMismatch(ValueError):
    """Raised when a sampler's convention differs from a checkpoint's.

    Its own type because the failure mode is specific and misleading: the
    sampler runs, produces output, and that output looks like a training
    problem rather than a conversion error.
    """


class DegeneratePath(ValueError):
    """Raised when an interpolant does not connect noise to data."""


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of computing nonsense."""


class PathKind(Enum):
    """How noise and data are connected. The design variable that matters.

    LINEAR gives a constant target velocity, so in principle one step suffices
    and in practice a handful do. VARIANCE_PRESERVING is what DDPM uses and is
    curved, which is precisely why it needs many steps.
    """

    LINEAR = 'linear'
    VARIANCE_PRESERVING = 'vp'
    VARIANCE_EXPLODING = 've'


@dataclass(frozen=True)
class Interpolant:
    """The path between noise and data, and its exact target velocity.

    Frozen because the path is a property of the trained model: a sampler
    integrating a different path than the network was trained on will not stay
    on any trajectory at all.
    """

    kind: PathKind

    def position(self, x0: Sequence[float], x1: Sequence[float], t: float) -> list[float]:
        """x_t along the path. Closed form, which is what makes training
        parallel across t — no trajectory is ever simulated."""
        if self.kind is PathKind.LINEAR:
            return [(1.0 - t) * a + t * b for a, b in zip(x0, x1)]

        # Variance-preserving: a trigonometric path keeping unit variance.
        angle = t * math.pi / 2.0
        return [
            math.cos(angle) * a + math.sin(angle) * b for a, b in zip(x0, x1)
        ]

    def target_velocity(
        self, x0: Sequence[float], x1: Sequence[float], t: float
    ) -> list[float]:
        """The exact velocity along the path — the regression target.

        For the linear path this is CONSTANT in t, which is the entire reason
        flow matching samples in few steps: a constant velocity means one
        large step is exact.
        """
        if self.kind is PathKind.LINEAR:
            return [b - a for a, b in zip(x0, x1)]

        angle = t * math.pi / 2.0
        scale = math.pi / 2.0
        return [
            scale * (-math.sin(angle) * a + math.cos(angle) * b)
            for a, b in zip(x0, x1)
        ]

    @property
    def is_straight(self) -> bool:
        return self.kind is PathKind.LINEAR


class Prediction(NamedTuple):
    """A network output AND what convention it is in.

    Carrying the convention with the value is what turns a silent conversion
    error into a type error. The alternative — a bare list and a comment — is
    how checkpoints get sampled wrongly.
    """

    values: list[float]
    parameterization: Parameterization
    sigma: float
    t: float

    def as_score(self) -> list[float]:
        """Convert to the score convention. All three are affine transforms."""
        if self.parameterization is Parameterization.SCORE:
            return list(self.values)
        if self.parameterization is Parameterization.NOISE:
            return [-value / max(self.sigma, 1e-8) for value in self.values]
        # Velocity to score, for a straight path.
        return [value / max(1.0 - self.t, 1e-6) for value in self.values]

    def as_noise(self) -> list[float]:
        if self.parameterization is Parameterization.NOISE:
            return list(self.values)
        return [-self.sigma * s for s in self.as_score()]


class VelocityField(Protocol):
    """A trained model, with its conventions attached.

    A protocol rather than a class because the samplers below should work
    against any implementation — but the conventions are part of the contract,
    not an implementation detail.
    """

    @property
    def parameterization(self) -> Parameterization: ...

    @property
    def interpolant(self) -> Interpolant: ...

    def __call__(self, x: Sequence[float], t: float) -> list[float]: ...


@dataclass(frozen=True)
class SamplerConfig:
    """Solver, step count, and the convention it expects.

    The convention is here rather than assumed, because mismatching it is the
    most common way a working checkpoint produces nonsense.
    """

    steps: int
    order: int = 2
    expects: Parameterization = Parameterization.VELOCITY
    minimum_t: float = 1e-3

    def __post_init__(self) -> None:
        if self.steps < 1:
            raise ShapeMismatch('at least one sampling step is required')
        if self.order not in (1, 2):
            raise ShapeMismatch('only first- and second-order solvers are supported')
        # Guard clause for the quality loss nobody notices: the true score
        # DIVERGES at zero noise and the network has seen little data that
        # close, so integrating all the way amplifies the worst-estimated part
        # of the field.
        if self.minimum_t <= 0.0:
            raise ShapeMismatch(
                'integration must stop short of zero; the score diverges there and '
                'the estimate is at its worst'
            )

    def assert_compatible(self, field: VelocityField) -> None:
        """Guard clause for the failure that looks like something else."""
        if self.expects is not field.parameterization:
            raise ParameterizationMismatch(
                f'sampler expects {self.expects.value} but the model predicts '
                f'{field.parameterization.value}; these are affine transforms of each '
                'other, so the output will look like a training problem'
            )

    def timesteps(self) -> list[float]:
        """Descending from one, stopping short of zero."""
        return [
            max(1.0 - index / self.steps, self.minimum_t)
            for index in range(self.steps)
        ]


def flow_matching_loss(
    x0: Sequence[float],
    x1: Sequence[float],
    field: VelocityField,
    t: float,
) -> float:
    """Regress the velocity against a target the interpolant defines exactly.

    Nothing here is a bound or an estimate: the target is constructed, so the
    supervision is exact. That is what this family inherits from diffusion and
    why training is so much better behaved than anything adversarial.
    """
    if len(x0) != len(x1):
        raise ShapeMismatch('endpoints must share a dimension')

    x_t = field.interpolant.position(x0, x1, t)
    target = field.interpolant.target_velocity(x0, x1, t)
    predicted = field(x_t, t)

    return math.fsum((u - p) ** 2 for u, p in zip(target, predicted)) / len(target)


class SampleTrace(NamedTuple):
    """The sample, the trajectory, and the settings that produced it.

    The trajectory comes back because path curvature is worth measuring rather
    than assuming: choosing a straight interpolant does not guarantee the
    learned field produces straight trajectories, and curvature is what
    determines how few steps remain viable.
    """

    values: list[float]
    trajectory: list[list[float]]
    steps: int
    order: int

    def curvature(self) -> float:
        """Mean deviation from the straight line, relative to its length."""
        if len(self.trajectory) < 3:
            return 0.0

        start, end = self.trajectory[0], self.trajectory[-1]
        straight = [b - a for a, b in zip(start, end)]
        length = math.sqrt(math.fsum(v * v for v in straight)) or 1.0

        total = 0.0
        for index in range(1, len(self.trajectory) - 1):
            fraction = index / (len(self.trajectory) - 1)
            expected = [a + fraction * d for a, d in zip(start, straight)]
            total += math.sqrt(
                math.fsum((p - e) ** 2 for p, e in zip(self.trajectory[index], expected))
            )

        return total / (len(self.trajectory) - 2) / length


def sample(
    field: VelocityField,
    config: SamplerConfig,
    initial: Sequence[float],
) -> SampleTrace:
    """Integrate the velocity field. Second order by default, and for a reason.

    Heun costs two evaluations per step and takes a much better step, so at a
    FIXED evaluation budget it usually wins — which makes solver order the
    cheapest quality improvement available, and the one to exhaust before
    raising the step count.
    """
    config.assert_compatible(field)

    x = list(initial)
    trajectory = [list(x)]
    times = config.timesteps()
    step = -1.0 / config.steps

    for index, t in enumerate(times):
        first = field(x, t)

        if config.order == 1:
            x = [value + step * v for value, v in zip(x, first)]
        else:
            predicted = [value + step * v for value, v in zip(x, first)]
            next_t = times[index + 1] if index + 1 < len(times) else config.minimum_t
            second = field(predicted, next_t)
            x = [
                value + step * 0.5 * (a + b)
                for value, a, b in zip(x, first, second)
            ]

        trajectory.append(list(x))

    return SampleTrace(
        values=x, trajectory=trajectory, steps=config.steps, order=config.order
    )
`,
        rationale:
          'One change dominates and it is not about arithmetic. Score, noise and velocity are affine transforms of each other, and every framework picks a different convention — so a checkpoint predicting velocity sampled by code expecting noise produces output that looks like a badly trained model rather than like a bug, which makes it the most common and most misdiagnosed failure when exchanging checkpoints. Making the convention part of the prediction type and part of the sampler config turns that silent mismatch into an error with a message that names the actual problem. The interpolant becomes a frozen type carrying both its position and its exact target velocity, which makes visible the property the whole method rests on: for a straight path the target velocity is constant in t, and that constancy is precisely why few large steps work. The sampler config refuses integration to exactly zero, because the true score diverges there and the network has seen little data that close, so the last step amplifies the worst-estimated part of the field. And the trace returns the trajectory, because path curvature determines how few steps remain viable and choosing a straight interpolant does not guarantee the learned field produced straight paths.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: keeping the trajectory for curvature measurement costs one copy per step, which is negligible against a network evaluation and buys the only diagnostic that predicts achievable step count.',
      },

      'make-it-fast': {
        code: `"""Batched, with the divergence estimated rather than computed.

Two optimizations of different kinds:

  TRAINING batches exactly as DDPM does — the interpolant has a closed form,
  so every example takes its own random t and there is no rollout. Nothing
  clever is needed.

  LIKELIHOOD is where the real algorithmic change is. The probability-flow
  ODE gives an exact log-density, but it needs the DIVERGENCE of the velocity
  field along the trajectory - and computing that exactly costs one
  Jacobian-vector product per dimension, which is O(d) network evaluations per
  step. Hutchinson's estimator gets it in ONE, by noting that the expected
  value of v^T J v over random v with unit covariance IS the trace.

That substitution is what makes exact-likelihood evaluation affordable at all,
and it is why the resulting number has variance.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def linear_interpolant(
    x0: NDArray[np.float32], x1: NDArray[np.float32], t: NDArray[np.float32]
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Positions and target velocities for a whole batch at its own times.

    The target velocity for a straight path is the endpoint difference, which
    is CONSTANT in t — so it is computed once per pair rather than per
    timestep, and that constancy is the entire reason few steps work.
    """
    coefficient = t[:, None]
    velocity = x1 - x0

    # Fused: the position is built from the velocity already computed rather
    # than from both endpoints again.
    x_t = x0 + coefficient * velocity
    return x_t, velocity


def flow_matching_loss(
    field,
    x0: NDArray[np.float32],
    x1: NDArray[np.float32],
    rng: np.random.Generator,
) -> np.float32:
    """One batched step. Every example at its OWN random time.

    No rollout anywhere: the interpolant has a closed form, so training is
    embarrassingly parallel across examples and times alike.
    """
    t = rng.random(len(x0), dtype=FLOAT)
    x_t, target = linear_interpolant(x0, x1, t)

    residual = field(x_t, t)
    residual -= target
    # einsum contracts the squared norm in one pass rather than squaring into
    # a temporary and summing it.
    return np.einsum('ij,ij->', residual, residual, optimize=True) / residual.size


def hutchinson_divergence(
    field,
    x: NDArray[np.float32],
    t: NDArray[np.float32],
    rng: np.random.Generator,
    epsilon: float = 1e-3,
    probes: int = 1,
) -> NDArray[np.float32]:
    """Trace of the Jacobian, in O(1) network evaluations rather than O(d).

    The identity: for a random vector v with unit covariance,

        E[ v^T J v ] = trace(J)

    So one directional derivative per probe estimates the divergence,
    regardless of dimension. Computing it exactly would need one
    Jacobian-vector product PER DIMENSION, which at image scale is thousands
    of network evaluations per integration step - entirely impractical.

    The cost of the substitution is variance: the returned likelihood is an
    ESTIMATE, and calling it exact without averaging over probes overstates it.
    """
    base = field(x, t)
    total = np.zeros(len(x), dtype=FLOAT)

    for _ in range(probes):
        # Rademacher probes rather than Gaussian: same unit covariance, lower
        # estimator variance, and cheaper to generate.
        probe = rng.integers(0, 2, x.shape).astype(FLOAT)
        probe *= 2.0
        probe -= 1.0

        nudged = field(x + FLOAT(epsilon) * probe, t)
        nudged -= base
        nudged /= FLOAT(epsilon)
        total += np.einsum('ij,ij->i', probe, nudged, optimize=True)

    return total / probes


def ode_sample(
    field,
    shape: tuple[int, int],
    steps: int,
    rng: np.random.Generator,
    order: int = 2,
    minimum_t: float = 1e-3,
) -> NDArray[np.float32]:
    """Deterministic integration with Heun by default, and for a reason.

    Heun costs two evaluations per step and takes a much better step, so at a
    FIXED evaluation budget it usually wins - which makes solver order the
    cheapest quality improvement available, and the one to exhaust before
    raising the step count.

    Note what is NOT here: no batching over steps. The dependency is real, and
    the only lever is step count and solver order.
    """
    x = rng.standard_normal(shape, dtype=FLOAT)
    times = np.maximum(
        1.0 - np.arange(steps, dtype=FLOAT) / steps, FLOAT(minimum_t)
    )
    step = FLOAT(-1.0 / steps)

    for index in range(steps):
        t = np.full(shape[0], times[index], dtype=FLOAT)
        first = field(x, t)

        if order == 1:
            # In place: the state is updated through the prediction buffer.
            first *= step
            x += first
            continue

        predicted = x + step * first
        next_t = np.full(
            shape[0],
            times[index + 1] if index + 1 < steps else FLOAT(minimum_t),
            dtype=FLOAT,
        )
        second = field(predicted, next_t)

        # Fused average-and-step: neither slope is materialized separately.
        second += first
        second *= step * FLOAT(0.5)
        x += second

    return x


def exact_log_likelihood(
    field,
    x: NDArray[np.float32],
    steps: int,
    rng: np.random.Generator,
    probes: int = 4,
) -> NDArray[np.float32]:
    """Integrate the ODE BACKWARDS, accumulating the divergence.

        log p(x) = log p_prior(z) + integral of divergence along the path

    This is a real density rather than a bound, which is what the deterministic
    sampler buys over the stochastic one. It costs an ODE solve plus a
    divergence estimate per step, so it is orders of magnitude more expensive
    than sampling - and the divergence is estimated, so the result has
    variance that must be averaged away before it means anything.
    """
    state = x.copy()
    log_determinant = np.zeros(len(x), dtype=FLOAT)
    step = FLOAT(1.0 / steps)

    for index in range(steps):
        t = np.full(len(x), FLOAT(index) / steps, dtype=FLOAT)
        velocity = field(state, t)
        divergence = hutchinson_divergence(field, state, t, rng, probes=probes)

        state += step * velocity
        log_determinant += step * divergence

    # Standard Gaussian prior at the far end of the path.
    prior = -0.5 * np.einsum('ij,ij->i', state, state, optimize=True)
    prior -= 0.5 * x.shape[1] * np.log(2.0 * np.pi).astype(FLOAT)
    return prior + log_determinant


def path_curvature(trajectory: NDArray[np.float32]) -> NDArray[np.float32]:
    """Deviation from the straight line, per sample, as one vectorized pass.

    This is what determines how few steps are viable, and it is worth
    MEASURING rather than assuming: choosing a straight interpolant does not
    guarantee the learned field produces straight trajectories.

    trajectory is (steps, batch, dim).
    """
    start, end = trajectory[0], trajectory[-1]
    straight = end - start

    fractions = np.linspace(0.0, 1.0, len(trajectory), dtype=FLOAT)[1:-1, None, None]
    expected = start + fractions * straight

    deviation = trajectory[1:-1] - expected
    distances = np.sqrt(np.einsum('sbd,sbd->sb', deviation, deviation, optimize=True))
    lengths = np.sqrt(np.einsum('bd,bd->b', straight, straight, optimize=True))

    return distances.mean(axis=0) / np.maximum(lengths, 1e-8)
`,
        rationale:
          'Two optimizations of different kinds, and the second is the substantive one. Training batches exactly as DDPM does — the interpolant has a closed form, so every example takes its own random time and there is no rollout to parallelize — and the straight-path target velocity is computed once per pair rather than per timestep because it is constant in t, which is the same property that makes few sampling steps work. The real algorithmic change is in likelihood evaluation. The probability-flow ODE gives an exact density but needs the divergence of the velocity field along the trajectory, and computing that exactly costs one Jacobian-vector product per dimension — thousands of network evaluations per integration step at image scale, which is simply impractical. Hutchinson’s estimator gets it in one, because the expectation of a quadratic form in a unit-covariance random vector is the trace; Rademacher probes are used rather than Gaussian since they share the unit covariance with lower estimator variance. The cost of that substitution is named rather than hidden: the resulting likelihood is an estimate with variance, and calling it exact without averaging over probes overstates it.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Every squared norm and every divergence probe contracts with einsum in a single pass rather than squaring into a temporary, and the curvature measurement reduces a three-axis trajectory tensor in one contraction.',
            tradeoff: 'The curvature computation holds the whole trajectory — steps times batch times dimension — in memory at once, so measuring it on a long integration at a large batch is itself a substantial allocation.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The divergence estimator, the interpolation and the loss all cover the whole batch, so the only remaining Python loops are over solver steps and probes.',
            tradeoff: 'The Hutchinson estimator trades an exact O(d) computation for a stochastic O(1) one, so the likelihood it produces has variance — the speedup is not free, it moves the cost into the number of probes needed for a stable estimate.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The solver updates the state through the prediction buffers, the divergence probe is transformed in place, and the Heun average fuses into the second slope so neither is materialized separately.',
            tradeoff: 'The first slope is consumed by the fused average, so a diagnostic comparing the two Heun slopes — which is how you see that a step is too large — needs an unfused pass.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 throughout keeps the network evaluations on the BLAS fast path and halves the bandwidth of the trajectory tensor, which is re-read by the curvature reduction.',
            tradeoff: 'float32 accumulation of the divergence integral along many steps drifts, and because the log-likelihood is that accumulation plus a prior term the error lands directly in the reported density — the one number this computation exists to produce.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Likelihood evaluation drops from O(d) network evaluations per step to O(probes). Illustrative, not a measured benchmark: at image scale that is a reduction from thousands to single digits per step, which is the difference between a computable density and an impossible one.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Score matching, the probability-flow ODE, and flow matching side by side.
//
// Three formulations that look nothing alike and are the same object:
//
//   DENOISING SCORE MATCHING   regress the score of the noised distribution
//   PROBABILITY FLOW ODE       a deterministic path with the same marginals
//   FLOW MATCHING              regress a velocity along a chosen path
//
// The point of putting them in one file is the conversion functions at the
// bottom: score, noise and velocity are AFFINE TRANSFORMS of each other.
// Mixing conventions between frameworks produces plausible nonsense with no
// error anywhere, which is the most common failure when exchanging
// checkpoints.
//
// Vector-of-vector, plain loops.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

constexpr double kPi = 3.14159265358979323846;

struct FieldParams {
  Matrix w1;
  Vector b1;
  Vector w_time;
  Matrix w2;
  Vector b2;
};

// Predicts a direction. WHICH direction depends on the convention.
//
// That ambiguity is not sloppiness - it is the actual situation. The same
// architecture is trained to predict a score, a noise vector or a velocity
// depending on the framework, and the caller has to know which.
Vector Field(const Vector& x, double t, const FieldParams& params) {
  const double embed_sin = std::sin(t * kPi);
  const double embed_cos = std::cos(t * kPi);

  Vector hidden(params.w1.size(), 0.0);
  for (std::size_t i = 0; i < params.w1.size(); ++i) {
    double total = params.b1[i] + params.w_time[i] * (i % 2 == 0 ? embed_sin : embed_cos);
    for (std::size_t j = 0; j < x.size(); ++j) {
      total += params.w1[i][j] * x[j];
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

// Regress the score of the NOISED distribution, not of the data.
//
// The trick that makes this tractable: the score of the data distribution is
// unknown, but the score of the data-plus-known-noise distribution has a
// closed form - it is just the scaled noise. So an intractable objective
// becomes a regression against a target the loop constructed.
//
//   score of q(x_t | x_0) = -(x_t - x_0) / sigma^2 = -eps / sigma
double DenoisingScoreMatchingLoss(const Vector& x0, double sigma,
                                  const FieldParams& params, std::mt19937& rng) {
  std::normal_distribution<double> normal(0.0, 1.0);

  Vector x_t(x0.size(), 0.0);
  Vector target(x0.size(), 0.0);
  for (std::size_t i = 0; i < x0.size(); ++i) {
    const double epsilon = normal(rng);
    x_t[i] = x0[i] + sigma * epsilon;
    target[i] = -epsilon / sigma;
  }

  const Vector predicted = Field(x_t, sigma, params);

  double total = 0.0;
  for (std::size_t i = 0; i < target.size(); ++i) {
    const double residual = target[i] - predicted[i];
    total += residual * residual;
  }
  return total / static_cast<double>(target.size());
}

// Regress a VELOCITY along a chosen path.
//
// With a straight-line interpolation the target velocity is simply the
// difference between the endpoints - a CONSTANT along the whole path. That is
// the entire reason flow matching samples in few steps: a constant velocity
// means one large step is exact, and in practice a handful suffice.
//
//   x_t = (1 - t) * x0 + t * x1
//   u_t = x1 - x0                 <- constant in t
double FlowMatchingLoss(const Vector& x0, const Vector& x1, const FieldParams& params,
                        std::mt19937& rng) {
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  const double t = uniform(rng);

  Vector x_t(x0.size(), 0.0);
  Vector target(x0.size(), 0.0);
  for (std::size_t i = 0; i < x0.size(); ++i) {
    target[i] = x1[i] - x0[i];
    x_t[i] = x0[i] + t * target[i];
  }

  const Vector predicted = Field(x_t, t, params);

  double total = 0.0;
  for (std::size_t i = 0; i < target.size(); ++i) {
    const double residual = target[i] - predicted[i];
    total += residual * residual;
  }
  return total / static_cast<double>(target.size());
}

// Stochastic: inject noise at every step.
//
// Gives diversity and does NOT give a likelihood, because the trajectory is
// not a deterministic map.
Vector SdeStep(const Vector& x, double t, double step, const FieldParams& params,
               double g, std::mt19937& rng) {
  const Vector score = Field(x, t, params);
  std::normal_distribution<double> normal(0.0, std::sqrt(std::abs(step)) * g);

  Vector next(x.size(), 0.0);
  for (std::size_t i = 0; i < x.size(); ++i) {
    next[i] = x[i] + step * (-g * g * score[i]) + normal(rng);
  }
  return next;
}

// Deterministic: the SAME marginals, with HALF the score coefficient.
//
// That factor of one half is the only difference between the two equations,
// and it is the whole result: the stochastic process and this deterministic
// ODE agree on their time-marginal distributions while sharing no trajectories
// at all.
//
// What the deterministic route buys: reproducibility, an exact likelihood, and
// a trajectory whose intermediate points can be SKIPPED - which is what turned
// sampling from a fixed procedure into a solver problem.
Vector OdeStep(const Vector& x, double t, double step, const FieldParams& params,
               double g) {
  const Vector score = Field(x, t, params);

  Vector next(x.size(), 0.0);
  for (std::size_t i = 0; i < x.size(); ++i) {
    next[i] = x[i] + step * (-0.5 * g * g * score[i]);
  }
  return next;
}

// Second-order: evaluate, step, re-evaluate, average the two slopes.
//
// Twice the evaluations per step and a much better step, so at a fixed
// evaluation budget it usually wins. That is the cheapest quality improvement
// available in this whole family.
Vector HeunSample(std::size_t dimension, const FieldParams& params, std::size_t steps,
                  std::mt19937& rng, double g = 1.0) {
  std::normal_distribution<double> normal(0.0, 1.0);
  Vector x(dimension, 0.0);
  for (std::size_t i = 0; i < dimension; ++i) {
    x[i] = normal(rng);
  }

  const double step = -1.0 / static_cast<double>(steps);
  for (std::size_t index = 0; index < steps; ++index) {
    // Stop slightly short of zero: the true score DIVERGES there and the
    // network has seen little data that close, so integrating all the way
    // amplifies the worst-estimated part of the field.
    const double t = std::max(1.0 - static_cast<double>(index) / static_cast<double>(steps),
                              1e-3);
    const Vector first = Field(x, t, params);

    Vector predicted(x.size(), 0.0);
    for (std::size_t i = 0; i < x.size(); ++i) {
      predicted[i] = x[i] + step * (-0.5 * g * g * first[i]);
    }

    const Vector second = Field(predicted, std::max(t + step, 1e-3), params);
    for (std::size_t i = 0; i < x.size(); ++i) {
      x[i] += step * (-0.5 * g * g) * 0.5 * (first[i] + second[i]);
    }
  }
  return x;
}

// ---------------------------------------------------------------------------
// The conversions. This is the part that causes real production failures.
// ---------------------------------------------------------------------------

Vector NoiseToScore(const Vector& epsilon_prediction, double sigma) {
  Vector score(epsilon_prediction.size(), 0.0);
  for (std::size_t i = 0; i < score.size(); ++i) {
    score[i] = -epsilon_prediction[i] / sigma;
  }
  return score;
}

Vector ScoreToNoise(const Vector& score_prediction, double sigma) {
  Vector epsilon(score_prediction.size(), 0.0);
  for (std::size_t i = 0; i < epsilon.size(); ++i) {
    epsilon[i] = -sigma * score_prediction[i];
  }
  return epsilon;
}

// All three quantities are AFFINE TRANSFORMS of each other. A checkpoint
// predicting velocity, sampled by code expecting noise, produces output that
// looks like a badly trained model rather than like a bug - which is exactly
// why this is worth writing down rather than leaving implicit.
Vector VelocityToScore(const Vector& velocity, const Vector& x_t, double t) {
  Vector score(velocity.size(), 0.0);
  for (std::size_t i = 0; i < score.size(); ++i) {
    score[i] = (velocity[i] - x_t[i]) / std::max(1.0 - t, 1e-6);
  }
  return score;
}

// How far the sampled path deviates from a straight line.
//
// This is what determines how few steps are viable, and it is worth MEASURING
// rather than assuming: choosing a straight interpolant does not guarantee the
// learned field produces straight trajectories.
double PathCurvature(const Matrix& trajectory) {
  if (trajectory.size() < 3) {
    return 0.0;
  }

  const Vector& start = trajectory.front();
  const Vector& end = trajectory.back();

  double length_squared = 0.0;
  Vector straight(start.size(), 0.0);
  for (std::size_t i = 0; i < start.size(); ++i) {
    straight[i] = end[i] - start[i];
    length_squared += straight[i] * straight[i];
  }
  const double length = std::max(std::sqrt(length_squared), 1e-8);

  double total = 0.0;
  for (std::size_t index = 1; index + 1 < trajectory.size(); ++index) {
    const double fraction =
        static_cast<double>(index) / static_cast<double>(trajectory.size() - 1);
    double deviation = 0.0;
    for (std::size_t i = 0; i < start.size(); ++i) {
      const double expected = start[i] + fraction * straight[i];
      const double difference = trajectory[index][i] - expected;
      deviation += difference * difference;
    }
    total += std::sqrt(deviation);
  }

  return total / static_cast<double>(trajectory.size() - 2) / length;
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) for a first-order solver and O(2S) for Heun. Illustrative, not a measured benchmark: Heun doubles the per-step cost and usually wins at a fixed evaluation budget, which is why solver choice should be exhausted before step count is raised.',
      },

      'make-it-right': {
        code: `// The same formulations, with the parameterization made a type.
//
// One change dominates. Score, noise and velocity are affine transforms of
// each other, and every framework picks a different one - so a checkpoint
// predicting velocity, sampled by code expecting noise, produces output that
// looks like a badly trained model rather than like a bug. Making the
// convention part of the type means that mismatch becomes an error rather than
// a mystery, and it is the single highest-value piece of typing here.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace flow {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the failure mode is specific and misleading: the
// sampler runs, produces output, and that output looks like a training problem
// rather than a conversion error.
class ParameterizationMismatch : public std::logic_error {
 public:
  explicit ParameterizationMismatch(const std::string& what)
      : std::logic_error(what) {}
};

// What the network predicts. NOT interchangeable between frameworks.
//
// All three are affine transforms of each other, which is exactly what makes a
// mismatch so dangerous: the output is plausible rather than obviously wrong,
// so it reads as a poorly trained model.
enum class Parameterization { kScore, kNoise, kVelocity };

// How noise and data are connected. The design variable that matters.
//
// kLinear gives a constant target velocity, so in principle one step suffices
// and in practice a handful do. kVariancePreserving is what DDPM uses and is
// curved, which is precisely why it needs many steps.
enum class PathKind { kLinear, kVariancePreserving };

// The path between noise and data, and its exact target velocity.
//
// The path is a property of the trained model: a sampler integrating a
// different path than the network was trained on will not stay on any
// trajectory at all.
class Interpolant {
 public:
  explicit Interpolant(PathKind kind) : kind_(kind) {}

  // x_t along the path. Closed form, which is what makes training parallel
  // across t - no trajectory is ever simulated.
  void Position(std::span<const double> x0, std::span<const double> x1, double t,
                std::span<double> out) const {
    if (kind_ == PathKind::kLinear) {
      for (std::size_t i = 0; i < x0.size(); ++i) {
        out[i] = (1.0 - t) * x0[i] + t * x1[i];
      }
      return;
    }
    constexpr double kPi = 3.14159265358979323846;
    const double angle = t * kPi / 2.0;
    for (std::size_t i = 0; i < x0.size(); ++i) {
      out[i] = std::cos(angle) * x0[i] + std::sin(angle) * x1[i];
    }
  }

  // The exact velocity along the path - the regression target.
  //
  // For the linear path this is CONSTANT in t, which is the entire reason
  // flow matching samples in few steps: a constant velocity means one large
  // step is exact.
  void TargetVelocity(std::span<const double> x0, std::span<const double> x1, double t,
                      std::span<double> out) const {
    if (kind_ == PathKind::kLinear) {
      for (std::size_t i = 0; i < x0.size(); ++i) {
        out[i] = x1[i] - x0[i];
      }
      return;
    }
    constexpr double kPi = 3.14159265358979323846;
    const double angle = t * kPi / 2.0;
    const double scale = kPi / 2.0;
    for (std::size_t i = 0; i < x0.size(); ++i) {
      out[i] = scale * (-std::sin(angle) * x0[i] + std::cos(angle) * x1[i]);
    }
  }

  [[nodiscard]] bool is_straight() const noexcept { return kind_ == PathKind::kLinear; }

 private:
  PathKind kind_;
};

// A network output AND what convention it is in.
//
// Carrying the convention with the value is what turns a silent conversion
// error into a type error. The alternative - a bare vector and a comment - is
// how checkpoints get sampled wrongly.
class Prediction {
 public:
  Prediction(std::vector<double> values, Parameterization parameterization, double sigma,
             double t)
      : values_(std::move(values)), parameterization_(parameterization), sigma_(sigma),
        t_(t) {}

  // Convert to the score convention. All three are affine transforms.
  [[nodiscard]] std::vector<double> AsScore() const {
    if (parameterization_ == Parameterization::kScore) {
      return values_;
    }

    std::vector<double> score(values_.size(), 0.0);
    if (parameterization_ == Parameterization::kNoise) {
      for (std::size_t i = 0; i < values_.size(); ++i) {
        score[i] = -values_[i] / std::max(sigma_, 1e-8);
      }
      return score;
    }

    for (std::size_t i = 0; i < values_.size(); ++i) {
      score[i] = values_[i] / std::max(1.0 - t_, 1e-6);
    }
    return score;
  }

  [[nodiscard]] Parameterization parameterization() const noexcept {
    return parameterization_;
  }

 private:
  std::vector<double> values_;  // rule of zero: owning members only
  Parameterization parameterization_;
  double sigma_;
  double t_;
};

// Solver, step count, and the convention it expects.
//
// The convention is here rather than assumed, because mismatching it is the
// most common way a working checkpoint produces nonsense.
struct SamplerConfig {
  std::size_t steps{20};
  int order{2};
  Parameterization expects{Parameterization::kVelocity};
  double minimum_t{1e-3};

  void Validate() const {
    if (steps == 0) {
      throw ShapeMismatch("at least one sampling step is required");
    }
    if (order != 1 && order != 2) {
      throw ShapeMismatch("only first- and second-order solvers are supported");
    }
    // Guard clause for the quality loss nobody notices: the true score
    // DIVERGES at zero noise and the network has seen little data that close,
    // so integrating all the way amplifies the worst-estimated part.
    if (minimum_t <= 0.0) {
      throw ShapeMismatch(
          "integration must stop short of zero; the score diverges there and the "
          "estimate is at its worst");
    }
  }

  // Guard clause for the failure that looks like something else.
  void AssertCompatible(Parameterization model) const {
    if (expects != model) {
      throw ParameterizationMismatch(
          "sampler convention differs from the model's; these are affine transforms "
          "of each other, so the output will look like a training problem");
    }
  }

  [[nodiscard]] std::vector<double> Timesteps() const {
    std::vector<double> times;
    times.reserve(steps);
    for (std::size_t index = 0; index < steps; ++index) {
      times.push_back(std::max(
          1.0 - static_cast<double>(index) / static_cast<double>(steps), minimum_t));
    }
    return times;
  }
};

// The sample, the trajectory, and the settings that produced it.
//
// The trajectory comes back because path curvature is worth measuring rather
// than assuming: choosing a straight interpolant does not guarantee the learned
// field produces straight trajectories, and curvature is what determines how
// few steps remain viable.
struct SampleTrace {
  std::vector<double> values;
  std::vector<std::vector<double>> trajectory;
  std::size_t steps{};
  int order{};

  // Mean deviation from the straight line, relative to its length.
  [[nodiscard]] double Curvature() const {
    if (trajectory.size() < 3) {
      return 0.0;
    }

    const std::vector<double>& start = trajectory.front();
    const std::vector<double>& end = trajectory.back();

    std::vector<double> straight(start.size(), 0.0);
    double length_squared = 0.0;
    for (std::size_t i = 0; i < start.size(); ++i) {
      straight[i] = end[i] - start[i];
      length_squared += straight[i] * straight[i];
    }
    const double length = std::max(std::sqrt(length_squared), 1e-8);

    double total = 0.0;
    for (std::size_t index = 1; index + 1 < trajectory.size(); ++index) {
      const double fraction =
          static_cast<double>(index) / static_cast<double>(trajectory.size() - 1);
      double deviation = 0.0;
      for (std::size_t i = 0; i < start.size(); ++i) {
        const double difference =
            trajectory[index][i] - (start[i] + fraction * straight[i]);
        deviation += difference * difference;
      }
      total += std::sqrt(deviation);
    }

    return total / static_cast<double>(trajectory.size() - 2) / length;
  }
};

// Regress the velocity against a target the interpolant defines exactly.
//
// Nothing here is a bound or an estimate: the target is constructed, so the
// supervision is exact. That is what this family inherits from diffusion and
// why training is so much better behaved than anything adversarial.
[[nodiscard]] inline double FlowMatchingLoss(std::span<const double> target,
                                             std::span<const double> predicted) {
  if (target.size() != predicted.size()) {
    throw ShapeMismatch("target and prediction widths disagree");
  }

  double total = 0.0;
  for (std::size_t i = 0; i < target.size(); ++i) {
    const double residual = target[i] - predicted[i];
    total += residual * residual;
  }
  return total / static_cast<double>(target.size());
}

}  // namespace flow
`,
        rationale:
          'One change dominates and it is not about arithmetic. Score, noise and velocity are affine transforms of each other, and every framework picks a different convention — so a checkpoint predicting velocity sampled by code expecting noise produces output that looks like a badly trained model rather than like a bug, which makes it the most common and most misdiagnosed failure when exchanging checkpoints. Making the convention part of the prediction type and part of the sampler config turns that silent mismatch into an exception with a message that names the actual problem. The interpolant becomes a type carrying both its position and its exact target velocity, written into caller-provided spans so the caller owns every allocation, and it makes visible the property the whole method rests on: for a straight path the target velocity is constant in t, and that constancy is precisely why few large steps work. The sampler config refuses integration to exactly zero, because the true score diverges there and the network has seen little data that close, so the last step amplifies the worst-estimated part of the field. The trace returns the trajectory, because curvature determines how few steps remain viable and a straight interpolant does not guarantee the learned field produced straight paths.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: writing into caller-provided spans removes the per-call allocation the literal version paid on every interpolation.',
      },

      'make-it-fast': {
        code: `// Batched, with the divergence estimated rather than computed.
//
// Two optimizations of different kinds:
//
//   TRAINING batches exactly as DDPM does - the interpolant has a closed form,
//   so every example takes its own random t and there is no rollout. Nothing
//   clever is needed.
//
//   LIKELIHOOD is where the real algorithmic change is. The probability-flow
//   ODE gives an exact log-density, but it needs the DIVERGENCE of the
//   velocity field along the trajectory - and computing that exactly costs one
//   Jacobian-vector product per dimension, which is O(d) network evaluations
//   per step. Hutchinson's estimator gets it in ONE, by noting that the
//   expected value of v^T J v over random v with unit covariance IS the trace.
//
// That substitution is what makes exact-likelihood evaluation affordable at
// all, and it is why the resulting number has variance.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

#include <omp.h>

namespace flow {

// Positions and target velocities for a whole batch at its own times.
//
// The target velocity for a straight path is the endpoint difference, which is
// CONSTANT in t - so it is computed once per pair rather than per timestep,
// and that constancy is the entire reason few steps work.
inline void LinearInterpolant(const float* __restrict x0, const float* __restrict x1,
                              const float* __restrict t, int rows, int dimension,
                              float* __restrict x_t, float* __restrict velocity) {
#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    const float coefficient = t[r];
    const float* start = x0 + static_cast<std::size_t>(r) * dimension;
    const float* end = x1 + static_cast<std::size_t>(r) * dimension;
    float* position = x_t + static_cast<std::size_t>(r) * dimension;
    float* target = velocity + static_cast<std::size_t>(r) * dimension;

    // Fused: the position is built from the velocity already computed rather
    // than from both endpoints again.
    for (int d = 0; d < dimension; ++d) {
      target[d] = end[d] - start[d];
      position[d] = start[d] + coefficient * target[d];
    }
  }
}

// Trace of the Jacobian, in O(1) network evaluations rather than O(d).
//
// The identity: for a random vector v with unit covariance,
//
//     E[ v^T J v ] = trace(J)
//
// So one directional derivative per probe estimates the divergence, regardless
// of dimension. Computing it exactly would need one Jacobian-vector product
// PER DIMENSION, which at image scale is thousands of network evaluations per
// integration step - entirely impractical.
//
// The cost of the substitution is variance: the returned likelihood is an
// ESTIMATE, and calling it exact without averaging over probes overstates it.
template <typename Field>
void HutchinsonDivergence(Field&& field, const float* __restrict x,
                          const float* __restrict t, int rows, int dimension,
                          uint64_t seed, int probes, float epsilon,
                          float* __restrict base, float* __restrict scratch,
                          float* __restrict nudged, float* __restrict out) {
  field(x, t, rows, base);
  std::fill(out, out + rows, 0.0F);

  for (int probe = 0; probe < probes; ++probe) {
    // Rademacher probes rather than Gaussian: same unit covariance, lower
    // estimator variance, and cheaper to generate.
#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      uint64_t state = seed + static_cast<uint64_t>(probe) * 0x9E3779B97F4A7C15ULL +
                       static_cast<uint64_t>(r) * 0x2545F4914F6CDD1DULL;
      const float* point = x + static_cast<std::size_t>(r) * dimension;
      float* direction = scratch + static_cast<std::size_t>(r) * dimension;
      float* target = nudged + static_cast<std::size_t>(r) * dimension;

      for (int d = 0; d < dimension; ++d) {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        direction[d] = (state >> 63) != 0 ? 1.0F : -1.0F;
        target[d] = point[d] + epsilon * direction[d];
      }
    }

    field(nudged, t, rows, nudged);

#pragma omp parallel for schedule(static)
    for (int r = 0; r < rows; ++r) {
      const float* direction = scratch + static_cast<std::size_t>(r) * dimension;
      const float* shifted = nudged + static_cast<std::size_t>(r) * dimension;
      const float* reference = base + static_cast<std::size_t>(r) * dimension;

      float total = 0.0F;
      for (int d = 0; d < dimension; ++d) {
        total += direction[d] * (shifted[d] - reference[d]) / epsilon;
      }
      out[r] += total;
    }
  }

#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    out[r] /= static_cast<float>(probes);
  }
}

// Deterministic integration with Heun by default, and for a reason.
//
// Heun costs two evaluations per step and takes a much better step, so at a
// FIXED evaluation budget it usually wins - which makes solver order the
// cheapest quality improvement available, and the one to exhaust before
// raising the step count.
//
// Note what is NOT here: no batching over steps. The dependency is real, and
// the only lever is step count and solver order.
template <typename Field>
void OdeSample(Field&& field, float* __restrict x, int rows, int dimension, int steps,
               int order, float minimum_t, float* __restrict first,
               float* __restrict second, float* __restrict predicted) {
  const std::size_t count = static_cast<std::size_t>(rows) * dimension;
  const float step = -1.0F / static_cast<float>(steps);
  std::vector<float> times(static_cast<std::size_t>(rows));

  for (int index = 0; index < steps; ++index) {
    const float t =
        std::max(1.0F - static_cast<float>(index) / static_cast<float>(steps), minimum_t);
    std::fill(times.begin(), times.end(), t);
    field(x, times.data(), rows, first);

    if (order == 1) {
#pragma omp parallel for schedule(static)
      for (std::size_t i = 0; i < count; ++i) {
        x[i] += step * first[i];
      }
      continue;
    }

#pragma omp parallel for schedule(static)
    for (std::size_t i = 0; i < count; ++i) {
      predicted[i] = x[i] + step * first[i];
    }

    const float next_t = std::max(t + step, minimum_t);
    std::fill(times.begin(), times.end(), next_t);
    field(predicted, times.data(), rows, second);

    // Fused average-and-step: neither slope is materialized separately.
#pragma omp parallel for schedule(static)
    for (std::size_t i = 0; i < count; ++i) {
      x[i] += step * 0.5F * (first[i] + second[i]);
    }
  }
}

// Deviation from the straight line, per sample, as one pass.
//
// This is what determines how few steps are viable, and it is worth MEASURING
// rather than assuming: choosing a straight interpolant does not guarantee the
// learned field produces straight trajectories.
inline void PathCurvature(const float* __restrict trajectory, int steps, int rows,
                          int dimension, float* __restrict out) {
  const std::size_t frame = static_cast<std::size_t>(rows) * dimension;
  const float* start = trajectory;
  const float* end = trajectory + static_cast<std::size_t>(steps - 1) * frame;

#pragma omp parallel for schedule(static)
  for (int r = 0; r < rows; ++r) {
    const std::size_t offset = static_cast<std::size_t>(r) * dimension;

    float length_squared = 0.0F;
    for (int d = 0; d < dimension; ++d) {
      const float straight = end[offset + d] - start[offset + d];
      length_squared += straight * straight;
    }
    const float length = std::max(std::sqrt(length_squared), 1e-8F);

    float total = 0.0F;
    for (int index = 1; index + 1 < steps; ++index) {
      const float fraction =
          static_cast<float>(index) / static_cast<float>(steps - 1);
      const float* current = trajectory + static_cast<std::size_t>(index) * frame;

      float deviation = 0.0F;
      for (int d = 0; d < dimension; ++d) {
        const float expected =
            start[offset + d] + fraction * (end[offset + d] - start[offset + d]);
        const float difference = current[offset + d] - expected;
        deviation += difference * difference;
      }
      total += std::sqrt(deviation);
    }

    out[r] = total / static_cast<float>(steps - 2) / length;
  }
}

}  // namespace flow
`,
        rationale:
          'Two optimizations of different kinds, and the second is the substantive one. Training batches exactly as DDPM does — the interpolant has a closed form, so every example takes its own random time and there is no rollout — and the straight-path target velocity is computed once per pair and reused to build the position, because it is constant in t, which is the same property that makes few sampling steps work. The real algorithmic change is in likelihood evaluation. The probability-flow ODE gives an exact density but needs the divergence of the velocity field along the trajectory, and computing that exactly costs one Jacobian-vector product per dimension — thousands of network evaluations per integration step at image scale. Hutchinson’s estimator gets it in one, because the expectation of a quadratic form in a unit-covariance random vector is the trace; Rademacher probes are used rather than Gaussian since they share the unit covariance with lower estimator variance and are generated with a single bit test. The cost of that substitution is named rather than hidden: the resulting likelihood is an estimate with variance. The Heun average fuses into a single pass so neither slope is materialized separately.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The interpolant builds the position from the velocity it just computed, the Heun average combines both slopes in one traversal, and the divergence probe is generated and applied in the same pass.',
            tradeoff: 'The first Heun slope is consumed by the fused average, so a diagnostic comparing the two slopes — which is how you see that a step is too large — needs an unfused pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The interpolation, the probe generation, the divergence reduction, the solver updates and the curvature measurement are all row-independent with no shared writes.',
            tradeoff: 'Only the batch axis parallelizes — the solver steps are sequential, so a single-sample request gets nothing from the threading and the only remaining lever is step count and solver order.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'Every inner loop here is contiguous, restrict-qualified and of known trip count, including the divergence reduction and the curvature deviation.',
            tradeoff: 'The Rademacher probe is generated by a bit test inside the loop, which introduces a data dependency through the generator state that prevents the compiler from vectorizing that specific loop however it is written.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Row-major activations keep every fused pass stride-one, and the trajectory is stored step-major so a curvature measurement reads whole frames contiguously.',
            tradeoff: 'Step-major means a single sample’s trajectory is strided across frames, so a per-sample path diagnostic — the natural thing to plot when one sample looks wrong — reads badly.',
          },
        ],
        libraryName: 'OpenMP',
        profile:
          'Likelihood evaluation drops from O(d) network evaluations per step to O(probes). Illustrative, not a measured benchmark: at image scale that is a reduction from thousands to single digits per step, which is the difference between a computable density and an impossible one.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// Score matching, the probability-flow ODE, and flow matching side by side.
//
// Three formulations that look nothing alike and are the same object:
//
//   DENOISING SCORE MATCHING   regress the score of the noised distribution
//   PROBABILITY FLOW ODE       a deterministic path with the same marginals
//   FLOW MATCHING              regress a velocity along a chosen path
//
// The point of putting them in one file is the conversion functions at the
// bottom: score, noise and velocity are AFFINE TRANSFORMS of each other.
// Mixing conventions between frameworks produces plausible nonsense with no
// error anywhere, which is the most common failure when exchanging
// checkpoints.
//
// Vec-of-Vec, index loops, no libraries.

use std::f64::consts::PI;

struct FieldParams {
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w_time: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

/// Predicts a direction. WHICH direction depends on the convention.
///
/// That ambiguity is not sloppiness - it is the actual situation. The same
/// architecture is trained to predict a score, a noise vector or a velocity
/// depending on the framework, and the caller has to know which.
fn field(x: &[f64], t: f64, params: &FieldParams) -> Vec<f64> {
    let embed = [(t * PI).sin(), (t * PI).cos()];

    let hidden: Vec<f64> = params
        .w1
        .iter()
        .enumerate()
        .map(|(i, row)| {
            let mut total = params.b1[i] + params.w_time[i] * embed[i % 2];
            for (weight, value) in row.iter().zip(x) {
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

/// Regress the score of the NOISED distribution, not of the data.
///
/// The trick that makes this tractable: the score of the data distribution is
/// unknown, but the score of the data-plus-known-noise distribution has a
/// closed form - it is just the scaled noise. So an intractable objective
/// becomes a regression against a target the loop constructed.
///
///   score of q(x_t | x_0) = -(x_t - x_0) / sigma^2 = -eps / sigma
fn denoising_score_matching_loss(
    x0: &[f64],
    sigma: f64,
    params: &FieldParams,
    normals: &[f64],
) -> f64 {
    let x_t: Vec<f64> = x0
        .iter()
        .zip(normals)
        .map(|(value, e)| value + sigma * e)
        .collect();
    let target: Vec<f64> = normals.iter().map(|e| -e / sigma).collect();

    let predicted = field(&x_t, sigma, params);
    target
        .iter()
        .zip(&predicted)
        .map(|(t, p)| (t - p) * (t - p))
        .sum::<f64>()
        / target.len() as f64
}

/// Regress a VELOCITY along a chosen path.
///
/// With a straight-line interpolation the target velocity is simply the
/// difference between the endpoints - a CONSTANT along the whole path. That is
/// the entire reason flow matching samples in few steps: a constant velocity
/// means one large step is exact, and in practice a handful suffice.
///
///   x_t = (1 - t) * x0 + t * x1
///   u_t = x1 - x0                 <- constant in t
fn flow_matching_loss(x0: &[f64], x1: &[f64], t: f64, params: &FieldParams) -> f64 {
    let target: Vec<f64> = x0.iter().zip(x1).map(|(a, b)| b - a).collect();
    let x_t: Vec<f64> = x0
        .iter()
        .zip(&target)
        .map(|(a, velocity)| a + t * velocity)
        .collect();

    let predicted = field(&x_t, t, params);
    target
        .iter()
        .zip(&predicted)
        .map(|(u, p)| (u - p) * (u - p))
        .sum::<f64>()
        / target.len() as f64
}

/// Stochastic: inject noise at every step.
///
/// Gives diversity and does NOT give a likelihood, because the trajectory is
/// not a deterministic map.
fn sde_step(
    x: &[f64],
    t: f64,
    step: f64,
    params: &FieldParams,
    g: f64,
    normals: &[f64],
) -> Vec<f64> {
    let score = field(x, t, params);
    let noise_scale = step.abs().sqrt() * g;

    x.iter()
        .zip(&score)
        .zip(normals)
        .map(|((value, s), z)| value + step * (-g * g * s) + noise_scale * z)
        .collect()
}

/// Deterministic: the SAME marginals, with HALF the score coefficient.
///
/// That factor of one half is the only difference between the two equations,
/// and it is the whole result: the stochastic process and this deterministic
/// ODE agree on their time-marginal distributions while sharing no
/// trajectories at all.
///
/// What the deterministic route buys: reproducibility, an exact likelihood,
/// and a trajectory whose intermediate points can be SKIPPED - which is what
/// turned sampling from a fixed procedure into a solver problem.
fn ode_step(x: &[f64], t: f64, step: f64, params: &FieldParams, g: f64) -> Vec<f64> {
    let score = field(x, t, params);
    x.iter()
        .zip(&score)
        .map(|(value, s)| value + step * (-0.5 * g * g * s))
        .collect()
}

/// Second-order: evaluate, step, re-evaluate, average the two slopes.
///
/// Twice the evaluations per step and a much better step, so at a fixed
/// evaluation budget it usually wins. That is the cheapest quality improvement
/// available in this whole family.
fn heun_sample(initial: &[f64], params: &FieldParams, steps: usize, g: f64) -> Vec<f64> {
    let mut x = initial.to_vec();
    let step = -1.0 / steps as f64;

    for index in 0..steps {
        // Stop slightly short of zero: the true score DIVERGES there and the
        // network has seen little data that close, so integrating all the way
        // amplifies the worst-estimated part of the field.
        let t = (1.0 - index as f64 / steps as f64).max(1e-3);
        let first = field(&x, t, params);

        let predicted: Vec<f64> = x
            .iter()
            .zip(&first)
            .map(|(value, s)| value + step * (-0.5 * g * g * s))
            .collect();

        let second = field(&predicted, (t + step).max(1e-3), params);

        for ((value, a), b) in x.iter_mut().zip(&first).zip(&second) {
            *value += step * (-0.5 * g * g) * 0.5 * (a + b);
        }
    }
    x
}

// ---------------------------------------------------------------------------
// The conversions. This is the part that causes real production failures.
// ---------------------------------------------------------------------------

fn noise_to_score(epsilon_prediction: &[f64], sigma: f64) -> Vec<f64> {
    epsilon_prediction.iter().map(|e| -e / sigma).collect()
}

fn score_to_noise(score_prediction: &[f64], sigma: f64) -> Vec<f64> {
    score_prediction.iter().map(|s| -sigma * s).collect()
}

/// All three quantities are AFFINE TRANSFORMS of each other. A checkpoint
/// predicting velocity, sampled by code expecting noise, produces output that
/// looks like a badly trained model rather than like a bug - which is exactly
/// why this is worth writing down rather than leaving implicit.
fn velocity_to_score(velocity: &[f64], x_t: &[f64], t: f64) -> Vec<f64> {
    velocity
        .iter()
        .zip(x_t)
        .map(|(v, value)| (v - value) / (1.0 - t).max(1e-6))
        .collect()
}

/// How far the sampled path deviates from a straight line.
///
/// This is what determines how few steps are viable, and it is worth MEASURING
/// rather than assuming: choosing a straight interpolant does not guarantee
/// the learned field produces straight trajectories.
fn path_curvature(trajectory: &[Vec<f64>]) -> f64 {
    if trajectory.len() < 3 {
        return 0.0;
    }

    let start = &trajectory[0];
    let end = &trajectory[trajectory.len() - 1];
    let straight: Vec<f64> = start.iter().zip(end).map(|(a, b)| b - a).collect();
    let length = straight.iter().map(|v| v * v).sum::<f64>().sqrt().max(1e-8);

    let mut total = 0.0;
    for index in 1..trajectory.len() - 1 {
        let fraction = index as f64 / (trajectory.len() - 1) as f64;
        let deviation: f64 = trajectory[index]
            .iter()
            .zip(start)
            .zip(&straight)
            .map(|((p, a), d)| {
                let difference = p - (a + fraction * d);
                difference * difference
            })
            .sum();
        total += deviation.sqrt();
    }

    total / (trajectory.len() - 2) as f64 / length
}
`,
        profile:
          'Training is O(1) network evaluations per example; sampling is O(S) for a first-order solver and O(2S) for Heun. Illustrative, not a measured benchmark: Heun doubles the per-step cost and usually wins at a fixed evaluation budget, which is why solver choice should be exhausted before step count is raised.',
      },

      'make-it-right': {
        code: `//! The same formulations, with the parameterization made a type.
//!
//! One change dominates. Score, noise and velocity are affine transforms of
//! each other, and every framework picks a different one - so a checkpoint
//! predicting velocity, sampled by code expecting noise, produces output that
//! looks like a badly trained model rather than like a bug. Making the
//! convention part of the type means that mismatch becomes an error rather
//! than a mystery, and it is the highest-value piece of typing here.

use std::f64::consts::PI;
use std::fmt;

/// A position along the path, in [0, 1].
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct PathTime(pub f64);

/// Number of solver steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct SolverSteps(pub usize);

/// Solver order — first or second.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SolverOrder {
    Euler,
    Heun,
}

/// What the network predicts. NOT interchangeable between frameworks.
///
/// All three are affine transforms of each other, which is exactly what makes
/// a mismatch so dangerous: the output is plausible rather than obviously
/// wrong, so it reads as a poorly trained model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Parameterization {
    Score,
    Noise,
    Velocity,
}

/// How noise and data are connected. The design variable that matters.
///
/// \`Linear\` gives a constant target velocity, so in principle one step
/// suffices and in practice a handful do. \`VariancePreserving\` is what DDPM
/// uses and is curved, which is precisely why it needs many steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathKind {
    Linear,
    VariancePreserving,
}

#[derive(Debug, PartialEq)]
pub enum FlowError {
    /// A sampler convention differing from a checkpoint's.
    ///
    /// Its own variant because the failure mode is specific and misleading:
    /// the sampler runs, produces output, and that output looks like a
    /// training problem rather than a conversion error.
    ParameterizationMismatch {
        expected: Parameterization,
        found: Parameterization,
    },
    /// Integration all the way to zero, where the score diverges.
    IntegratesToZero,
    /// A zero step count.
    NoSteps,
    /// Endpoints of differing width.
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for FlowError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ParameterizationMismatch { expected, found } => write!(
                f,
                "sampler expects {expected:?} but the model predicts {found:?}; these \
                 are affine transforms of each other, so the output will look like a \
                 training problem"
            ),
            Self::IntegratesToZero => write!(
                f,
                "integration must stop short of zero; the score diverges there and the \
                 estimate is at its worst"
            ),
            Self::NoSteps => write!(f, "at least one sampling step is required"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for FlowError {}

/// The path between noise and data, and its exact target velocity.
///
/// The path is a property of the trained model: a sampler integrating a
/// different path than the network was trained on will not stay on any
/// trajectory at all.
#[derive(Debug, Clone, Copy)]
pub struct Interpolant {
    pub kind: PathKind,
}

impl Interpolant {
    /// x_t along the path. Closed form, which is what makes training parallel
    /// across t — no trajectory is ever simulated.
    pub fn position(&self, x0: &[f64], x1: &[f64], t: PathTime, out: &mut [f64]) {
        match self.kind {
            PathKind::Linear => {
                for ((slot, &a), &b) in out.iter_mut().zip(x0).zip(x1) {
                    *slot = (1.0 - t.0) * a + t.0 * b;
                }
            }
            PathKind::VariancePreserving => {
                let angle = t.0 * PI / 2.0;
                for ((slot, &a), &b) in out.iter_mut().zip(x0).zip(x1) {
                    *slot = angle.cos() * a + angle.sin() * b;
                }
            }
        }
    }

    /// The exact velocity along the path — the regression target.
    ///
    /// For the linear path this is CONSTANT in t, which is the entire reason
    /// flow matching samples in few steps: a constant velocity means one large
    /// step is exact.
    pub fn target_velocity(&self, x0: &[f64], x1: &[f64], t: PathTime, out: &mut [f64]) {
        match self.kind {
            PathKind::Linear => {
                for ((slot, &a), &b) in out.iter_mut().zip(x0).zip(x1) {
                    *slot = b - a;
                }
            }
            PathKind::VariancePreserving => {
                let angle = t.0 * PI / 2.0;
                let scale = PI / 2.0;
                for ((slot, &a), &b) in out.iter_mut().zip(x0).zip(x1) {
                    *slot = scale * (-angle.sin() * a + angle.cos() * b);
                }
            }
        }
    }

    pub fn is_straight(&self) -> bool {
        self.kind == PathKind::Linear
    }
}

/// A network output AND what convention it is in.
///
/// Carrying the convention with the value is what turns a silent conversion
/// error into a type error. The alternative — a bare Vec and a comment — is
/// how checkpoints get sampled wrongly.
pub struct Prediction {
    pub values: Vec<f64>,
    pub parameterization: Parameterization,
    pub sigma: f64,
    pub t: PathTime,
}

impl Prediction {
    /// Convert to the score convention. All three are affine transforms.
    pub fn as_score(&self) -> Vec<f64> {
        match self.parameterization {
            Parameterization::Score => self.values.clone(),
            Parameterization::Noise => {
                self.values.iter().map(|v| -v / self.sigma.max(1e-8)).collect()
            }
            Parameterization::Velocity => self
                .values
                .iter()
                .map(|v| v / (1.0 - self.t.0).max(1e-6))
                .collect(),
        }
    }

    pub fn as_noise(&self) -> Vec<f64> {
        match self.parameterization {
            Parameterization::Noise => self.values.clone(),
            _ => self.as_score().iter().map(|s| -self.sigma * s).collect(),
        }
    }
}

/// Solver, step count, and the convention it expects.
///
/// The convention is here rather than assumed, because mismatching it is the
/// most common way a working checkpoint produces nonsense.
#[derive(Debug, Clone, Copy)]
pub struct SamplerConfig {
    pub steps: SolverSteps,
    pub order: SolverOrder,
    pub expects: Parameterization,
    pub minimum_t: f64,
}

impl SamplerConfig {
    pub fn validate(&self) -> Result<(), FlowError> {
        if self.steps.0 == 0 {
            return Err(FlowError::NoSteps);
        }
        // Guard clause for the quality loss nobody notices: the true score
        // DIVERGES at zero noise and the network has seen little data that
        // close, so integrating all the way amplifies the worst-estimated part.
        if self.minimum_t <= 0.0 {
            return Err(FlowError::IntegratesToZero);
        }
        Ok(())
    }

    /// Guard clause for the failure that looks like something else.
    pub fn assert_compatible(&self, model: Parameterization) -> Result<(), FlowError> {
        if self.expects == model {
            Ok(())
        } else {
            Err(FlowError::ParameterizationMismatch {
                expected: self.expects,
                found: model,
            })
        }
    }

    /// Descending from one, stopping short of zero.
    pub fn timesteps(&self) -> Vec<PathTime> {
        (0..self.steps.0)
            .map(|index| {
                PathTime((1.0 - index as f64 / self.steps.0 as f64).max(self.minimum_t))
            })
            .collect()
    }
}

/// The sample, the trajectory, and the settings that produced it.
///
/// The trajectory comes back because path curvature is worth measuring rather
/// than assuming: choosing a straight interpolant does not guarantee the
/// learned field produces straight trajectories, and curvature is what
/// determines how few steps remain viable.
pub struct SampleTrace {
    pub values: Vec<f64>,
    pub trajectory: Vec<Vec<f64>>,
    pub steps: SolverSteps,
    pub order: SolverOrder,
}

impl SampleTrace {
    /// Mean deviation from the straight line, relative to its length.
    pub fn curvature(&self) -> f64 {
        if self.trajectory.len() < 3 {
            return 0.0;
        }

        let start = &self.trajectory[0];
        let end = &self.trajectory[self.trajectory.len() - 1];
        let straight: Vec<f64> = start.iter().zip(end).map(|(a, b)| b - a).collect();
        let length = straight.iter().map(|v| v * v).sum::<f64>().sqrt().max(1e-8);

        let total: f64 = (1..self.trajectory.len() - 1)
            .map(|index| {
                let fraction = index as f64 / (self.trajectory.len() - 1) as f64;
                self.trajectory[index]
                    .iter()
                    .zip(start)
                    .zip(&straight)
                    .map(|((p, a), d)| {
                        let difference = p - (a + fraction * d);
                        difference * difference
                    })
                    .sum::<f64>()
                    .sqrt()
            })
            .sum();

        total / (self.trajectory.len() - 2) as f64 / length
    }
}

/// Regress the velocity against a target the interpolant defines exactly.
///
/// Nothing here is a bound or an estimate: the target is constructed, so the
/// supervision is exact. That is what this family inherits from diffusion and
/// why training is so much better behaved than anything adversarial.
pub fn flow_matching_loss(target: &[f64], predicted: &[f64]) -> Result<f64, FlowError> {
    if target.len() != predicted.len() {
        return Err(FlowError::ShapeMismatch {
            expected: target.len(),
            found: predicted.len(),
        });
    }
    Ok(target
        .iter()
        .zip(predicted)
        .map(|(u, p)| (u - p) * (u - p))
        .sum::<f64>()
        / target.len() as f64)
}
`,
        rationale:
          'One change dominates and it is not about arithmetic. Score, noise and velocity are affine transforms of each other, and every framework picks a different convention — so a checkpoint predicting velocity sampled by code expecting noise produces output that looks like a badly trained model rather than like a bug, which makes it the most common and most misdiagnosed failure when exchanging checkpoints. Making the convention part of the prediction type and part of the sampler config turns that silent mismatch into an error variant whose message names the actual problem. The interpolant becomes a type carrying both its position and its exact target velocity, written into caller-provided slices so the caller owns every allocation, and it makes visible the property the whole method rests on: for a straight path the target velocity is constant in t, and that constancy is precisely why few large steps work. The sampler config refuses integration to exactly zero, because the true score diverges there and the network has seen little data that close. The trace returns the trajectory, because curvature determines how few steps remain viable and a straight interpolant does not guarantee the learned field produced straight paths.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly. Illustrative, not a measured benchmark: writing into caller-provided slices removes the per-call allocation the literal version paid on every interpolation.',
      },

      'make-it-fast': {
        code: `//! Batched, with the divergence estimated rather than computed.
//!
//! Two optimizations of different kinds:
//!
//!   TRAINING batches exactly as DDPM does - the interpolant has a closed
//!   form, so every example takes its own random t and there is no rollout.
//!   Nothing clever is needed.
//!
//!   LIKELIHOOD is where the real algorithmic change is. The probability-flow
//!   ODE gives an exact log-density, but it needs the DIVERGENCE of the
//!   velocity field along the trajectory - and computing that exactly costs
//!   one Jacobian-vector product per dimension, which is O(d) network
//!   evaluations per step. Hutchinson's estimator gets it in ONE, by noting
//!   that the expected value of v^T J v over random v with unit covariance IS
//!   the trace.
//!
//! That substitution is what makes exact-likelihood evaluation affordable at
//! all, and it is why the resulting number has variance.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis, Zip};
use rayon::prelude::*;

/// Positions and target velocities for a whole batch at its own times.
///
/// The target velocity for a straight path is the endpoint difference, which
/// is CONSTANT in t - so it is computed once per pair rather than per
/// timestep, and that constancy is the entire reason few steps work.
pub fn linear_interpolant(
    x0: ArrayView2<'_, f32>,
    x1: ArrayView2<'_, f32>,
    t: ArrayView1<'_, f32>,
) -> (Array2<f32>, Array2<f32>) {
    let mut position = Array2::<f32>::zeros(x0.raw_dim());
    let mut velocity = Array2::<f32>::zeros(x0.raw_dim());

    Zip::from(position.axis_iter_mut(Axis(0)))
        .and(velocity.axis_iter_mut(Axis(0)))
        .and(x0.axis_iter(Axis(0)))
        .and(x1.axis_iter(Axis(0)))
        .and(t)
        .par_for_each(|mut pos, mut vel, start, end, &coefficient| {
            // Fused: the position is built from the velocity already computed
            // rather than from both endpoints again.
            for (((p, v), &a), &b) in pos
                .iter_mut()
                .zip(vel.iter_mut())
                .zip(start.iter())
                .zip(end.iter())
            {
                *v = b - a;
                *p = a + coefficient * *v;
            }
        });

    (position, velocity)
}

/// Trace of the Jacobian, in O(1) network evaluations rather than O(d).
///
/// The identity: for a random vector v with unit covariance,
///
///     E[ v^T J v ] = trace(J)
///
/// So one directional derivative per probe estimates the divergence,
/// regardless of dimension. Computing it exactly would need one
/// Jacobian-vector product PER DIMENSION, which at image scale is thousands of
/// network evaluations per integration step - entirely impractical.
///
/// The cost of the substitution is variance: the returned likelihood is an
/// ESTIMATE, and calling it exact without averaging over probes overstates it.
pub fn hutchinson_divergence<F>(
    mut field: F,
    x: ArrayView2<'_, f32>,
    t: ArrayView1<'_, f32>,
    probes: &[Array2<f32>],
    epsilon: f32,
) -> Array1<f32>
where
    F: FnMut(ArrayView2<'_, f32>, ArrayView1<'_, f32>) -> Array2<f32>,
{
    let base = field(x, t);
    let mut total = Array1::<f32>::zeros(x.shape()[0]);

    for probe in probes {
        // Rademacher probes rather than Gaussian: same unit covariance, lower
        // estimator variance, and cheaper to generate.
        let nudged = &x + &(probe * epsilon);
        let shifted = field(nudged.view(), t);

        Zip::from(&mut total)
            .and(probe.axis_iter(Axis(0)))
            .and(shifted.axis_iter(Axis(0)))
            .and(base.axis_iter(Axis(0)))
            .par_for_each(|slot, direction, after, before| {
                let mut sum = 0.0f32;
                for ((&d, &a), &b) in direction.iter().zip(after.iter()).zip(before.iter()) {
                    sum += d * (a - b) / epsilon;
                }
                *slot += sum;
            });
    }

    total / probes.len() as f32
}

/// Deterministic integration with Heun by default, and for a reason.
///
/// Heun costs two evaluations per step and takes a much better step, so at a
/// FIXED evaluation budget it usually wins - which makes solver order the
/// cheapest quality improvement available, and the one to exhaust before
/// raising the step count.
///
/// Note what is NOT here: no batching over steps. The dependency is real, and
/// the only lever is step count and solver order.
pub fn ode_sample<F>(
    mut field: F,
    initial: Array2<f32>,
    steps: usize,
    heun: bool,
    minimum_t: f32,
) -> Array2<f32>
where
    F: FnMut(ArrayView2<'_, f32>, ArrayView1<'_, f32>) -> Array2<f32>,
{
    let rows = initial.shape()[0];
    let mut x = initial;
    let step = -1.0f32 / steps as f32;

    for index in 0..steps {
        let t = (1.0 - index as f32 / steps as f32).max(minimum_t);
        let times = Array1::from_elem(rows, t);
        let first = field(x.view(), times.view());

        if !heun {
            Zip::from(&mut x)
                .and(&first)
                .par_for_each(|value, &slope| *value += step * slope);
            continue;
        }

        let predicted = &x + &(&first * step);
        let next_t = (t + step).max(minimum_t);
        let next_times = Array1::from_elem(rows, next_t);
        let second = field(predicted.view(), next_times.view());

        // Fused average-and-step: neither slope is materialized separately.
        Zip::from(&mut x)
            .and(&first)
            .and(&second)
            .par_for_each(|value, &a, &b| {
                *value += step * 0.5 * (a + b);
            });
    }

    x
}

/// Deviation from the straight line, per sample, as one parallel pass.
///
/// This is what determines how few steps are viable, and it is worth
/// MEASURING rather than assuming: choosing a straight interpolant does not
/// guarantee the learned field produces straight trajectories.
pub fn path_curvature(trajectory: &[Array2<f32>]) -> Vec<f32> {
    if trajectory.len() < 3 {
        return vec![0.0; trajectory.first().map_or(0, |a| a.shape()[0])];
    }

    let start = &trajectory[0];
    let end = &trajectory[trajectory.len() - 1];
    let rows = start.shape()[0];

    (0..rows)
        .into_par_iter()
        .map(|r| {
            let begin = start.row(r);
            let finish = end.row(r);

            let length = begin
                .iter()
                .zip(finish.iter())
                .map(|(a, b)| (b - a) * (b - a))
                .sum::<f32>()
                .sqrt()
                .max(1e-8);

            let total: f32 = (1..trajectory.len() - 1)
                .map(|index| {
                    let fraction = index as f32 / (trajectory.len() - 1) as f32;
                    trajectory[index]
                        .row(r)
                        .iter()
                        .zip(begin.iter())
                        .zip(finish.iter())
                        .map(|((p, &a), &b)| {
                            let difference = p - (a + fraction * (b - a));
                            difference * difference
                        })
                        .sum::<f32>()
                        .sqrt()
                })
                .sum();

            total / (trajectory.len() - 2) as f32 / length
        })
        .collect()
}
`,
        rationale:
          'Two optimizations of different kinds, and the second is the substantive one. Training batches exactly as DDPM does — the interpolant has a closed form, so every example takes its own random time and there is no rollout — and the straight-path target velocity is computed once per pair and reused to build the position, because it is constant in t, which is the same property that makes few sampling steps work. The real algorithmic change is in likelihood evaluation. The probability-flow ODE gives an exact density but needs the divergence of the velocity field along the trajectory, and computing that exactly costs one Jacobian-vector product per dimension — thousands of network evaluations per integration step at image scale. Hutchinson’s estimator gets it in one, because the expectation of a quadratic form in a unit-covariance random vector is the trace; Rademacher probes share that covariance with lower estimator variance. The cost of the substitution is named rather than hidden: the resulting likelihood is an estimate with variance. The Heun average fuses into a single parallel pass so neither slope is materialized separately.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The interpolation, the divergence reduction, the solver updates and the curvature measurement are all row-independent with no shared writes.',
            tradeoff: 'Only the batch axis parallelizes — the solver steps are sequential, so a single-sample request gets nothing from the threading and the only remaining lever is step count and solver order.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The interpolant builds the position from the velocity it just wrote, the first-order update writes through the state in place, and the Heun average combines both slopes without materializing either separately.',
            tradeoff: 'The first Heun slope is consumed by the fused average, so a diagnostic comparing the two slopes — which is how you see that a step is too large — needs an unfused pass.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The fused interpolation, the divergence inner product and the curvature deviation are all zips over contiguous rows, so no per-element bounds check survives.',
            tradeoff: 'The four-way zip in the interpolation truncates silently to the shortest operand, so endpoints of differing width produce a partially computed path rather than an error — which the previous stage caught with a shape check that this one drops for speed.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-major activations keep every fused pass stride-one, and the probes are stored as full arrays so the divergence inner product reads contiguously.',
            tradeoff: 'The probes are materialized as full batch-sized arrays before use, so a high probe count for a stable likelihood estimate multiplies peak memory by exactly that count.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Likelihood evaluation drops from O(d) network evaluations per step to O(probes). Illustrative, not a measured benchmark: at image scale that is a reduction from thousands to single digits per step, which is the difference between a computable density and an impossible one.',
      },
    },
  },
};
