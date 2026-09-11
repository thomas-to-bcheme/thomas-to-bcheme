import type { AiMlModel } from '../../types';

/**
 * TRPO & PPO — the entry where the size of a policy step stops being a
 * learning rate and becomes a constraint.
 *
 * The insight both share: in supervised learning a bad step costs you
 * one update, and here it costs you the data that trains the next
 * one. Bounding how far the policy moves is therefore not
 * regularization — it is the thing that makes the method work.
 */
export const PPO_TRPO: AiMlModel = {
  slug: 'ppo-trpo',
  name: 'TRPO & PPO',
  aliases: ['Proximal Policy Optimization', 'Trust Region Policy Optimization', 'Clipped surrogate objective', 'Natural policy gradient'],
  category: 'reinforcement-learning',
  group: 'policy-gradient',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'On-policy reinforcement learning with an explicit bound on how far the policy may move per update. The bound is what makes it safe to take several gradient steps on one batch of trajectories, which is where most of the sample-efficiency gain over plain actor-critic comes from.',

  intuition:
    'Every policy-gradient method so far has a hidden problem: the optimizer controls its own training distribution. A step that is too large produces a worse policy, the worse policy collects worse data, and the next gradient is computed from it — so unlike supervised learning, where a bad step costs one update, here a bad step can end the run. Worse, a learning rate does not control what actually matters. It bounds movement in parameter space, and what needs bounding is movement in policy space, and the relationship between the two is the curvature of the policy manifold, which varies by orders of magnitude across the same network. TRPO fixes this directly: maximize the usual surrogate subject to a hard constraint that the new policy stay within a KL ball of the old one. That is a constrained optimization with a genuine monotonic-improvement result behind it, and it requires the Fisher information matrix, conjugate gradients, and a backtracking line search — correct, and painful enough that most people did not use it. PPO makes the same bargain with a much cruder instrument. Write the surrogate in terms of the probability ratio between the new and old policies, and clip that ratio: once the ratio leaves a small interval, the objective becomes flat and the gradient vanishes, so there is no incentive to move further. No second derivatives, no line search, plain Adam. The clip is not a real trust region and does not actually bound the KL, but it removes the pull toward large steps, and that turns out to be enough — enough that several epochs can be taken over the same batch, which is the actual source of the efficiency gain and the reason PPO became the default.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'L^{\\text{CLIP}}(\\theta) = \\mathbb{E}_t\\Bigl[ \\min\\bigl( r_t(\\theta)\\hat{A}_t,\\ \\mathrm{clip}(r_t(\\theta), 1-\\epsilon, 1+\\epsilon)\\,\\hat{A}_t \\bigr) \\Bigr], \\qquad r_t(\\theta) = \\frac{\\pi_{\\theta}(a_t \\mid s_t)}{\\pi_{\\theta_{\\text{old}}}(a_t \\mid s_t)}',
      symbols: [
        { symbol: 'r_t(\\theta)', meaning: 'the probability ratio between the current policy and the one that collected the data; it starts at exactly 1 and drifts as epochs are taken over the same batch' },
        { symbol: '\\mathrm{clip}(\\cdot, 1-\\epsilon, 1+\\epsilon)', meaning: 'the flat region: outside it the objective stops improving, so the gradient vanishes and there is no pull to move further' },
        { symbol: '\\min', meaning: 'what makes the bound one-sided in the right direction — it takes the pessimistic branch, so clipping never rewards a large step, only declines to reward it' },
        { symbol: '\\epsilon', meaning: 'the clip range, typically 0.2; it is a proxy for a trust region and does not actually bound the KL divergence' },
      ],
    },
    reading:
      'TRPO states the goal exactly: maximize the surrogate subject to the expected KL between old and new policies being at most delta. PPO states it approximately and pays nothing for second derivatives. Read the clipped objective by cases. When the advantage is positive the update wants to raise the action\'s probability, and the min caps the reward for doing so at a ratio of 1 + epsilon — beyond that the objective is constant and the gradient is exactly zero. When the advantage is negative the update wants to lower it, and the cap engages at 1 − epsilon. The asymmetry in the min is what makes this pessimistic rather than merely bounded: the clipped branch is chosen only when it is the smaller of the two, so the objective never rewards a step for having gone too far, but it does still penalize one that went too far in the wrong direction. Three things are worth being precise about, because they are widely misstated. The clip does not bound the KL divergence — it bounds the per-sample ratio, and a policy can still move a long way while every individual ratio stays inside the interval, which is why practical implementations also monitor the KL and stop early. The gradient being zero in the clipped region means those samples contribute nothing to that update, so an epoch late in the batch can be almost entirely clipped and effectively wasted. And the objective is only valid while the data is approximately on-policy: the ratio is an importance correction with no variance control, so taking too many epochs makes the surrogate an estimate of the wrong thing.',
  },

  optimization: {
    method: 'PPO: Adam on the clipped surrogate over several epochs of minibatches per rollout. TRPO: conjugate-gradient natural gradient with a backtracking line search enforcing a hard KL constraint',
    updateRule: {
      formula:
        '\\text{TRPO: } \\max_{\\theta}\\ \\mathbb{E}\\Bigl[r_t(\\theta)\\hat{A}_t\\Bigr] \\ \\text{ s.t. }\\ \\mathbb{E}\\bigl[D_{\\text{KL}}(\\pi_{\\theta_{\\text{old}}} \\Vert \\pi_{\\theta})\\bigr] \\le \\delta, \\qquad \\Delta\\theta \\propto F^{-1}\\nabla_{\\theta} L',
      symbols: [
        { symbol: 'F^{-1}\\nabla_{\\theta} L', meaning: 'the natural gradient: the ordinary gradient preconditioned by the inverse Fisher matrix, which converts a step in parameter space into a controlled step in policy space' },
        { symbol: 'F', meaning: 'the Fisher information matrix, never formed explicitly — conjugate gradients need only Fisher-vector products, which cost one extra backward pass each' },
        { symbol: '\\delta', meaning: 'the KL budget per update, typically 0.01; the quantity PPO approximates with a clip range and does not actually enforce' },
        { symbol: 'D_{\\text{KL}}(\\pi_{\\text{old}} \\Vert \\pi_{\\theta})', meaning: 'measured on the sampled states, so the constraint is an empirical average rather than a guarantee over the state space' },
      ],
    },
    rationale:
      'The two methods answer the same question and are worth holding side by side. TRPO is the principled version: the monotonic improvement result says that optimizing a surrogate with a KL penalty cannot make the true objective worse, and TRPO turns that penalty into a constraint to get a usable step size. The cost is the machinery — Fisher-vector products, conjugate gradients, a line search that must re-evaluate the constraint, and a second-order method wedged into a first-order training stack. PPO discards all of it for a clip and is worse in theory and better in practice, which is a result worth understanding rather than just accepting. The honest account of why is uncomfortable: careful ablation found that much of PPO\'s measured advantage came not from the clipped objective but from code-level details shipped alongside it — observation normalization with running statistics, reward scaling, orthogonal initialization with a small policy-head gain, advantage normalization per minibatch, learning-rate annealing, and gradient clipping. Removing those from PPO and adding them to TRPO closes most of the gap. The practical lesson is that in this category the implementation is part of the method, and an ablation that changes one line of the objective while leaving the harness alone is not measuring what it claims to. The genuinely load-bearing contribution of the clip is that it makes multiple epochs over one batch safe, and that is where the sample-efficiency gain over A2C actually comes from.',
    hyperparameters: [
      { name: 'clip range (epsilon)', role: 'The proxy trust region. Larger allows faster movement and more off-policy drift within a batch; smaller wastes epochs on samples whose gradient has been zeroed', typicalRange: '0.1 to 0.3, usually 0.2' },
      { name: 'epochs per batch', role: 'Where the sample-efficiency gain lives, and the thing the clip exists to make safe. Too many and the data is no longer on-policy enough for the ratio to mean anything', typicalRange: '3 to 10, fewer for large batches' },
      { name: 'target KL / early stopping', role: 'The admission that the clip does not bound the KL. Stopping the epoch loop when measured KL exceeds a threshold is what actually enforces the trust region', typicalRange: '0.01 to 0.03' },
      { name: 'GAE lambda', role: 'Inherited from actor-critic and unchanged in importance: the bias-variance dial on the advantage, usually worth more than the learning rate', typicalRange: '0.9 to 0.97' },
      { name: 'minibatch count', role: 'How the rollout is split within an epoch. More minibatches means more steps per epoch and faster drift away from the collecting policy', typicalRange: '4 to 32 per rollout' },
      { name: 'value-loss coefficient', role: 'Balances two very different gradient scales on a shared trunk, exactly as in A2C. Unchanged in role and still easy to leave at a harmful default', typicalRange: '0.5 to 1.0' },
      { name: 'entropy coefficient', role: 'Still the only thing preventing permanent exploration collapse, and neither the clip nor the critic does anything to restore lost entropy', typicalRange: '0.0 to 0.01' },
      { name: 'observation and reward normalization', role: 'Running-statistic normalization of both. Nominally a detail, measurably a large part of the method\'s advantage, and it introduces state that must be checkpointed with the weights', typicalRange: 'on, with running mean and variance' },
    ],
    convergence:
      'TRPO carries a monotonic improvement guarantee in its penalized form, which does not survive the relaxation to a hard constraint with an empirical KL estimate, a line search, and function approximation — so in practice it is a strong heuristic rather than a theorem being exercised. PPO has no such guarantee and does not claim one. What both deliver is stability: they fail gradually rather than catastrophically, and that is the property that made them defaults. The characteristic failures are specific. Entropy collapse is inherited unchanged from the whole family and remains the most common way a run ends early — the return plateaus, and the entropy curve explains it a few hundred updates earlier. The second is KL blow-up despite clipping: because the clip bounds per-sample ratios and not the divergence, a run with too many epochs or too large a learning rate can move far in one update, and only an explicit KL measurement catches it, which is why early stopping is standard. The third is epoch saturation — late epochs where most samples are clipped contribute almost nothing, so the compute is spent and the effective batch shrinks, visible as a clip fraction climbing toward one. The fourth is a critic that stops tracking, exactly as in A2C, diagnosed by explained variance and invisible in the return. And as everywhere in this category, seed variance is large enough that a single-seed comparison between variants measures the seed; five seeds and a median is the floor.',
    complexity:
      'PPO per update: E epochs over M minibatches, so E·M forward and backward passes over a rollout of T·N transitions — several times an A2C update for the same data, which is the point. Per environment step it is one shared forward, identical to A2C. TRPO per update: one gradient, then roughly ten conjugate-gradient iterations each costing a Fisher-vector product, which is an extra forward-backward pair, then a backtracking line search re-evaluating the constraint several times — call it an order of magnitude more compute per update than PPO, with no minibatching and a much larger memory peak. Memory for both is bounded by the rollout rather than by a replay buffer. The binding cost remains environment interaction: both are on-policy, so no data survives an update, and the multiple epochs PPO takes are precisely an attempt to extract more from each batch before discarding it.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no policy whose movement would need constraining and no action distribution to form a probability ratio from, because a forecaster does not act and does not influence what it observes next.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so there is no behaviour policy, no ratio and no advantage — and an unusual observation is not what a clipped surrogate is built to notice.',
      },
      optimization: {
        fit: 'primary',
        how: 'Optimize a policy by maximizing a surrogate whose improvement is bounded — by a hard KL constraint in TRPO, by a clipped probability ratio in PPO — so that several gradient steps can be taken safely on one batch of trajectories.',
        where: [
          'Step size as a constraint rather than a learning rate, which is the correct framing whenever an optimizer controls its own training distribution',
          'The natural gradient and the Fisher matrix as the principled route, and the clipped ratio as the first-order approximation that replaced it',
          'Multiple epochs per batch as the actual source of the efficiency gain, and the clip as what makes them safe',
          'The ablation result that much of the measured advantage lived in code-level details rather than the objective — a general caution about what a benchmark comparison is really measuring',
        ],
        why: 'The default policy-gradient method, and the most instructive entry in this category for reasons beyond its performance. Three lessons transfer past reinforcement learning. The first is the framing: when the optimizer determines the distribution it will be evaluated on next, step size stops being a tuning parameter and becomes a stability constraint, and the right unit to bound is movement in output space rather than in parameter space. The second is the approximation: TRPO does the correct thing expensively and PPO does an approximate thing cheaply enough that people actually use it, and the cheaper method won not because it was better but because it composed with ordinary first-order tooling. That pattern — the crude approximation that fits the existing stack beats the exact method that does not — recurs constantly. The third is the ablation, and it is the most valuable: a careful study found much of PPO\'s advantage over TRPO came from normalization, initialization and annealing choices shipped in the same code rather than from the clipped objective, which means the published comparison was partly measuring the harness. Where PPO is the wrong choice is clear enough: for continuous control where sample efficiency binds, SAC extracts far more from the same interactions; for discrete actions with a fast simulator, a value-based method may be cheaper; and where no simulator exists at all, no on-policy method is viable.',
        featurization: [
          'Normalize observations with running statistics and checkpoint those statistics with the weights, since they are part of the model and restoring without them silently breaks it',
          'Measure the KL each epoch and stop early when it exceeds the target, because the clip does not bound it and nothing else will catch a large step',
          'Track the clip fraction: climbing toward one means late epochs are contributing nothing and the compute is wasted',
          'Keep advantages normalized per minibatch and the critic\'s explained variance logged, both inherited from actor-critic and both still load-bearing',
        ],
        evaluation:
          'Median return over at least five seeds with the spread shown, on a separate deterministic rollout rather than the exploring training policy. Plot KL per update, clip fraction, policy entropy and critic explained variance alongside return — every characteristic failure of this method shows up in one of those four before it shows up in the return, and in none of them is the return curve itself diagnostic.',
        pitfalls: [
          'Believing the clip bounds the KL, when it bounds per-sample ratios and a policy can move far with every ratio in range',
          'Too many epochs per batch, after which the ratio is correcting data too far off-policy for the surrogate to estimate anything meaningful',
          'Ablating the objective while leaving the normalization, initialization and annealing in place, which measures the harness rather than the change',
          'Entropy collapse, inherited unchanged and still permanent — neither the clip nor the critic restores exploration',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Learn a continuous or discrete control policy from parallel simulated interaction, with the update bounded so that a single bad step cannot corrupt the data that trains the next one. Deployment is the policy\'s mode with exploration disabled.',
        where: [
          'Continuous-action control — robotics, process setpoints, actuator commands — where value-based argmax is intractable and stability matters more than peak sample efficiency',
          'Long-horizon operations problems with a cheap simulator that can be replicated across workers',
          'Settings where a method that fails gradually is worth more than one that occasionally reaches higher and occasionally diverges',
          'Sim-to-real pipelines, where the robustness of the training procedure is what makes domain randomization practical',
        ],
        why: 'The default choice for simulated control, and the reason is reliability rather than peak performance. An off-policy method such as SAC will usually reach a given return with fewer environment interactions, sometimes by a wide margin, and will also occasionally destabilize in ways that are hard to diagnose. PPO trades that away: it is less sample-efficient, it is far more tolerant of hyperparameters that are merely reasonable, and it fails by plateauing rather than by diverging. On a project where simulator time is cheap and engineering time is not, that trade is usually correct. Two qualifications matter in operations specifically. The critic is only valid on the distribution the current policy visits, so a policy moving into an unfamiliar operating regime is being advised by confident extrapolation — the trust region limits how fast that can happen, which is a genuine safety-adjacent benefit but not a guarantee. And a stochastic policy samples its actions by construction: the deployed controller should be the distribution\'s mode, evaluated separately from the training policy, and anything genuinely unsafe needs an interlock the optimizer cannot trade against.',
        featurization: [
          'Normalize observations with running statistics per operating regime, and checkpoint the statistics — restoring weights without them produces a silently wrong controller',
          'Bound continuous actions explicitly, since an unbounded Gaussian policy will eventually sample something the actuator cannot execute',
          'Randomize simulator parameters during training if the policy must transfer, because a policy trained on one dynamics model fits that model exactly',
          'Deploy the mode and measure it separately, as a deterministic policy is a different controller from the stochastic one that was trained',
        ],
        evaluation:
          'Simulated return against the incumbent controller on matched scenarios, with constraint violations counted separately rather than averaged in. Report robustness explicitly — performance under perturbed dynamics is what predicts transfer, and a policy that is best on the nominal model and brittle off it is worse than one that is uniformly good.',
        pitfalls: [
          'Normalization statistics left out of the checkpoint, which is the most common way a working policy fails on restore',
          'Deploying the stochastic policy, so a production controller samples its actions',
          'Trusting the critic outside the state distribution the current policy visits',
          'A hard constraint expressed as a reward penalty, which an optimizer treats as a price rather than a limit',
        ],
      },
      'natural-language': {
        fit: 'primary',
        how: 'Optimize a language model against a learned reward model with a KL penalty toward the reference policy, using the clipped surrogate so that several epochs can be taken on each batch of generations without the policy running away from the data that scored it.',
        where: [
          'Preference tuning from human feedback, where the standard pipeline is this method with a reward model and a reference-policy KL term',
          'Optimizing any non-differentiable sequence-level score — a metric, a verifier, a rubric — that no token-level loss can express',
          'Settings where the KL term is doing double duty: bounding the update and keeping the model near a distribution the reward model was calibrated on',
          'Reasoning and tool-use training, where the reward arrives at the end of a long generation and credit must be spread across it',
        ],
        why: 'The most consequential deployment of a reinforcement-learning method outside of games, and it works here for a reason specific to the setting: the optimizer is being pointed at a learned, imperfect reward model, and an unconstrained optimizer will find that model\'s defects rather than the behaviour it was meant to encode. The KL term toward the reference policy is therefore not a regularizer bolted on — it is the mechanism that keeps the policy in the region where the reward model was trained and is still meaningful, and the trust region does the same job at the level of individual updates. The costs are real. Four models are in play at once — policy, critic, reference and reward model — which makes memory rather than compute the binding constraint. The critic must be fitted on a distribution the policy is actively moving, and its explained variance is the diagnostic that says whether per-token advantages mean anything. And the reward model degrades as it is optimized against, so a rising reward with a rising KL is the signature of reward hacking rather than improvement. That combination of expense and fragility is exactly what motivated direct preference methods, which remove the critic and the sampling loop entirely — at the cost of the flexibility that a learned value function and an online reward signal provide.',
        featurization: [
          'Start from a supervised-tuned policy; neither this method nor any policy gradient can discover language from a reward signal',
          'Keep the KL penalty to the reference policy, since it is what keeps the optimizer inside the region where the reward model is still calibrated',
          'Normalize rewards within a batch, because sequence-level scores are unbounded and their scale directly sets gradient scale',
          'Watch the critic\'s explained variance, or the per-token advantages are noise and the run degenerates toward a worse Monte Carlo estimator',
        ],
        evaluation:
          'Held-out preference win rate judged by something other than the reward model being optimized, reported alongside KL from the reference policy. A reward gain accompanied by a large divergence is reward hacking; the proxy stops being trustworthy at exactly the point it is optimized hardest, which is why the evaluation must not reuse it.',
        pitfalls: [
          'Dropping or under-weighting the KL term, which produces fluent text that scores well and reads badly',
          'Reporting the reward model\'s score as the result, when the reward model is the thing being gamed',
          'Memory planned for one model when four are resident — policy, critic, reference and reward model',
          'Carrying the full pipeline where a direct preference method would remove the critic and the sampling loop together',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Several times an A2C update for the same rollout, since the whole point is taking multiple epochs over each batch — and correspondingly fewer environment interactions for the same result. TRPO costs roughly an order of magnitude more per update than PPO, because conjugate gradients need a Fisher-vector product per iteration and the line search re-evaluates the constraint several times. Memory is bounded by the rollout rather than by a replay buffer, except in the language-model setting where four resident models make memory the binding constraint. Parallel environments are the main scaling lever. Budget at least five seeds. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One forward pass through the policy; the critic is training machinery and does not ship. The observation-normalization statistics do ship, and they are the most commonly forgotten part of the artefact — a policy restored without the running mean and variance it was trained under receives inputs on a different scale and behaves like a different model, with nothing raising an error. Serve the distribution\'s mode rather than a sample unless stochasticity is genuinely wanted.',
    retrainingCadence:
      'Batch retraining rather than continuous updating: the method is on-policy, and live updating means a production system taking sampled actions while a critic that may have stopped tracking supplies its advantages. The usual arrangement is periodic offline training against a simulator or a generation loop, offline evaluation of the deterministic policy, then a staged rollout. The simulator or the reward model goes stale before the policy does, so revalidating it is what actually triggers a retraining cycle.',
    driftAndMonitoring: [
      'Measured KL per update against the target, since the clip does not bound it and a large step is otherwise invisible until the return collapses',
      'Clip fraction, which climbing toward one means late epochs are contributing nothing and the effective batch has shrunk',
      'Policy entropy, still the leading indicator of permanent exploration collapse and unaffected by either the clip or the critic',
      'Critic explained variance against realized returns — below zero the advantages are noise and everything downstream is meaningless',
      'Observation-normalization statistics, which drift with the state distribution and are part of the model rather than of the pipeline',
      'Where a reward model stands in for the true objective, the gap between its score and an independent judgement — that gap is what reward hacking looks like',
    ],
    productionGotchas: [
      'The clip does not bound the KL divergence. It bounds per-sample probability ratios, and a policy can move a long way with every ratio inside the interval, which is why explicit KL measurement and early stopping are standard rather than optional',
      'Normalization statistics are part of the model. Checkpointing weights without the running mean and variance produces a policy receiving differently scaled inputs, behaving differently, and raising nothing',
      'Too many epochs per batch quietly invalidates the surrogate: the ratio is an uncontrolled importance correction, and past a few epochs it is correcting data too far off-policy to estimate anything',
      'A high clip fraction means the gradient is zero for most samples in that epoch, so the compute is spent and the effective batch is a fraction of the nominal one',
      'Much of PPO\'s published advantage over TRPO came from code-level details rather than the objective, so an ablation that changes the objective while keeping the harness is not measuring the objective',
      'The advantage must still be detached, the losses must still be reported separately, and terminal must still be distinguished from truncation — every A2C hazard is inherited unchanged',
      'Entropy collapse remains permanent. Neither the trust region nor the critic restores exploration that has already been lost',
      'TRPO\'s monotonic-improvement guarantee does not survive the hard constraint, the empirical KL estimate, the line search, or function approximation — it is a strong heuristic in practice, not a theorem being exercised',
    ],
  },

  assumptions: [
    'Data is approximately on-policy: the probability ratio is an importance correction with no variance control, and it is only meaningful while the policy has not moved far from the one that collected the batch',
    'The policy is differentiable and stochastic, since the ratio requires a density for the action actually taken',
    'The critic can represent the value function on the states the policy visits, and its advantages are extrapolation everywhere else',
    'Environments can be replicated in parallel, which is where decorrelation comes from in the absence of a replay buffer',
    'A small KL step in the sampled states approximates a small change in behaviour overall — an empirical average standing in for a guarantee across the state space',
    'Rewards are on a bounded or normalized scale, since their magnitude sets the scale of both the advantage and the value regression',
  ],

  pros: [
    {
      point: 'Bounds movement in policy space rather than parameter space',
      context:
        'A learning rate controls the wrong quantity, because the map from parameters to behaviour has curvature that varies by orders of magnitude. Constraining the policy change directly is what makes the step size meaningful',
    },
    {
      point: 'Multiple epochs per batch, which is where the efficiency gain actually is',
      context:
        'The clip exists to make reusing a batch safe, and reusing it is what separates PPO from A2C on sample efficiency. Attributing the gain to the objective alone misreads which part is load-bearing',
    },
    {
      point: 'Fails gradually rather than catastrophically',
      context:
        'This is why it became the default. An off-policy method may reach higher with fewer samples and may also diverge in ways that are hard to diagnose; PPO plateaus, which is a far cheaper failure to debug',
    },
    {
      point: 'First-order and compatible with ordinary tooling',
      context:
        'No Fisher matrix, no conjugate gradients, no line search — just Adam on a clipped objective. TRPO is the more correct method and PPO is the one that composed with the existing stack, which is why it won',
    },
    {
      point: 'The KL term does double duty in preference tuning',
      context:
        'Pointed at a learned reward model, the constraint toward a reference policy is what keeps the optimizer inside the region where that reward model is still calibrated. The trust region is the safety mechanism, not a regularizer',
    },
  ],

  cons: [
    {
      point: 'The clip does not do what it is usually said to do',
      context:
        'It bounds per-sample probability ratios, not the KL divergence, so a run can move far with every ratio in range. Explicit KL measurement and early stopping are what actually enforce the trust region, and they are widely treated as optional',
    },
    {
      point: 'Still on-policy, so every batch is still discarded',
      context:
        'Multiple epochs extract more from each batch but nothing survives the update. Against an off-policy method with a replay buffer, the sample-efficiency gap on continuous control is often several-fold',
    },
    {
      point: 'Much of the published advantage was the harness, not the objective',
      context:
        'Normalization, initialization and annealing choices shipped alongside the clip account for a large share of the measured gain over TRPO. This is a caution about the method and about how comparisons in this field are made',
    },
    {
      point: 'Inherits every actor-critic hazard unchanged',
      context:
        'Detachment, separated loss reporting, terminal versus truncation, critic explained variance, the value coefficient on a shared trunk. The trust region solves the step-size problem and none of the others',
    },
    {
      point: 'Entropy collapse remains permanent',
      context:
        'Bounding the step slows how fast a policy can commit and does not restore exploration once lost. The failure looks like an early plateau and is explained only by the entropy curve',
    },
    {
      point: 'TRPO is expensive enough that almost nobody runs it',
      context:
        'Fisher-vector products, conjugate gradients and a backtracking line search cost roughly an order of magnitude more per update and resist minibatching. It is the principled version and it is mostly of historical and explanatory interest',
    },
  ],

  relatedSlugs: ['actor-critic', 'reinforce', 'sac', 'ddpg-td3', 'rlhf-dpo', 'dqn'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""PPO - the clipped surrogate, transcribed.

A linear softmax policy again, so the score has a closed form and the only new
machinery is visible: the probability RATIO against the policy that collected
the batch, and the flat region where the gradient is exactly zero.

The structure to notice is the epoch loop. A plain policy gradient takes one
step per batch; this takes several, and the clip is what makes that safe.
"""

import math
import random


def softmax(scores):
    largest = max(scores)
    exponentials = [math.exp(score - largest) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def policy_probabilities(theta, state):
    scores = []
    for action_weights in theta:
        score = 0.0
        for weight, feature in zip(action_weights, state):
            score += weight * feature
        scores.append(score)
    return softmax(scores)


def sample_action(probabilities, uniform_draw):
    cumulative = 0.0
    for action, probability in enumerate(probabilities):
        cumulative += probability
        if uniform_draw < cumulative:
            return action
    return len(probabilities) - 1


def returns_to_go(rewards, gamma):
    out = [0.0] * len(rewards)
    running = 0.0
    for step in range(len(rewards) - 1, -1, -1):
        running = rewards[step] + gamma * running
        out[step] = running
    return out


def clipped_coefficient(ratio, advantage, epsilon):
    """The scalar that multiplies the score, for min(r*A, clip(r)*A).

    The gradient of r with respect to theta is r * grad log pi, so the whole
    per-sample gradient is (A * r) * grad log pi - EXCEPT inside the flat
    region, where the objective is constant in theta and the gradient is
    exactly zero.

    Read the two cases. A positive advantage wants the action's probability
    raised, and past 1 + epsilon there is no further reward for raising it. A
    negative advantage wants it lowered, and past 1 - epsilon there is no
    further reward for lowering it. The min is what makes this one-sided: it
    declines to reward an overlarge step, and still penalizes a wrong one.
    """
    if advantage >= 0.0 and ratio > 1.0 + epsilon:
        return 0.0
    if advantage < 0.0 and ratio < 1.0 - epsilon:
        return 0.0
    return advantage * ratio


def train(env, n_features, n_actions, iterations=500, episodes_per_batch=16,
          epochs=4, alpha=0.01, gamma=0.99, epsilon=0.2):
    theta = [[0.0] * n_features for _ in range(n_actions)]

    for _ in range(iterations):
        batch = []
        every_return = []

        for _ in range(episodes_per_batch):
            states, actions, rewards, old_log_probs = [], [], [], []
            state = env.reset()
            done = False

            while not done:
                probabilities = policy_probabilities(theta, state)
                action = sample_action(probabilities, random.random())
                next_state, reward, done = env.step(action)

                states.append(state)
                actions.append(action)
                rewards.append(reward)
                # The log-probability under the policy that COLLECTED this
                # sample, frozen here. Every epoch below compares against it,
                # and it must not be recomputed as the policy moves.
                old_log_probs.append(math.log(probabilities[action] + 1e-12))

                state = next_state

            discounted = returns_to_go(rewards, gamma)
            every_return.extend(discounted)
            batch.append((states, actions, discounted, old_log_probs))

        baseline = sum(every_return) / len(every_return)

        # SEVERAL passes over the same data. This is where the sample
        # efficiency over a plain policy gradient comes from, and it is only
        # safe because the clip removes the incentive to keep moving.
        for _ in range(epochs):
            gradient = [[0.0] * n_features for _ in range(n_actions)]
            clipped_count = 0
            total_count = 0

            for states, actions, discounted, old_log_probs in batch:
                for state, action, total_return, old_log_prob in zip(
                    states, actions, discounted, old_log_probs
                ):
                    advantage = total_return - baseline
                    probabilities = policy_probabilities(theta, state)

                    # The ratio starts at exactly 1 on the first epoch, because
                    # the policy has not moved yet, and drifts from there.
                    log_ratio = math.log(probabilities[action] + 1e-12) - old_log_prob
                    ratio = math.exp(log_ratio)

                    coefficient = clipped_coefficient(ratio, advantage, epsilon)
                    total_count += 1
                    if coefficient == 0.0:
                        clipped_count += 1
                        continue        # zero gradient; this sample is inert

                    for candidate in range(n_actions):
                        indicator = 1.0 if candidate == action else 0.0
                        scaled = coefficient * (indicator - probabilities[candidate])
                        for index, feature in enumerate(state):
                            gradient[candidate][index] += scaled * feature

            # Ascent. A clip fraction climbing toward one means most of this
            # epoch contributed nothing at all and the compute was spent anyway.
            clip_fraction = clipped_count / total_count
            for candidate in range(n_actions):
                for index in range(n_features):
                    theta[candidate][index] += alpha * gradient[candidate][index] / total_count

    return theta`,
        profile: 'O(|A| x d) per sample per epoch, in the interpreter, with every sample revisited once per epoch.',
      },
      'make-it-right': {
        code: `"""PPO - GAE, minibatch epochs, KL early stopping, TRPO shown for contrast."""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import Tensor, nn
from torch.distributions import Categorical


@dataclass(frozen=True)
class PpoConfig:
    n_features: int
    n_actions: int
    learning_rate: float = 3e-4
    gamma: float = 0.99
    gae_lambda: float = 0.95
    clip_epsilon: float = 0.2
    epochs: int = 4
    minibatches: int = 4
    value_coefficient: float = 0.5
    entropy_coefficient: float = 0.01
    grad_clip_norm: float = 0.5
    # The admission that the clip does NOT bound the KL. It bounds per-sample
    # ratios, and a policy can move a long way with every ratio inside the
    # interval - so the trust region is actually enforced here, by stopping.
    target_kl: float = 0.015

    def __post_init__(self) -> None:
        if not 0.0 < self.clip_epsilon < 1.0:
            raise ValueError(f"clip epsilon must be in (0, 1), got {self.clip_epsilon}")
        if self.epochs < 1 or self.minibatches < 1:
            raise ValueError("epochs and minibatch count must be at least one")
        if not 0.0 <= self.gae_lambda <= 1.0:
            raise ValueError(f"lambda must be in [0, 1], got {self.gae_lambda}")


class RunningNormalizer:
    """Welford statistics over observations.

    Nominally a detail. Measurably a large part of this method's advantage -
    careful ablation found much of PPO's edge over TRPO came from normalization,
    initialization and annealing rather than from the clipped objective. It is
    therefore part of the MODEL, and it must be checkpointed with the weights:
    restoring the network without these statistics feeds it differently scaled
    inputs and produces a different policy, silently.
    """

    def __init__(self, size: int) -> None:
        self.mean = torch.zeros(size)
        self.var = torch.ones(size)
        self.count = 1e-4

    def update(self, batch: Tensor) -> None:
        batch_mean, batch_var = batch.mean(0), batch.var(0, unbiased=False)
        batch_count = batch.shape[0]
        delta = batch_mean - self.mean
        total = self.count + batch_count

        self.mean = self.mean + delta * batch_count / total
        m_a = self.var * self.count
        m_b = batch_var * batch_count
        self.var = (m_a + m_b + delta.pow(2) * self.count * batch_count / total) / total
        self.count = total

    def __call__(self, x: Tensor) -> Tensor:
        return (x - self.mean) / torch.sqrt(self.var + 1e-8)


def orthogonal_init(module: nn.Module, gain: float) -> nn.Module:
    """Orthogonal weights with a SMALL gain on the policy head.

    A near-uniform initial policy matters more here than it looks: the policy
    is the only source of exploration, and one that starts sharp has already
    lost options it will never sample again.
    """
    if isinstance(module, nn.Linear):
        nn.init.orthogonal_(module.weight, gain=gain)
        nn.init.constant_(module.bias, 0.0)
    return module


def ppo_epoch(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    states: Tensor,
    actions: Tensor,
    old_log_probs: Tensor,
    advantages: Tensor,
    returns: Tensor,
    config: PpoConfig,
) -> dict[str, float]:
    batch_size = states.shape[0]
    minibatch_size = batch_size // config.minibatches
    indices = torch.randperm(batch_size)

    stats = {"clip_fraction": 0.0, "approx_kl": 0.0, "policy_loss": 0.0, "value_loss": 0.0}

    for start in range(0, batch_size, minibatch_size):
        batch = indices[start : start + minibatch_size]

        logits, values = model(states[batch])
        distribution = Categorical(logits=logits)
        log_probs = distribution.log_prob(actions[batch])

        log_ratio = log_probs - old_log_probs[batch]
        ratio = log_ratio.exp()

        # Advantages normalized per MINIBATCH, not per batch - one of the
        # code-level details that turned out to matter as much as the objective.
        minibatch_advantages = advantages[batch]
        minibatch_advantages = (minibatch_advantages - minibatch_advantages.mean()) / (
            minibatch_advantages.std() + 1e-8
        )

        unclipped = ratio * minibatch_advantages
        clipped = torch.clamp(ratio, 1 - config.clip_epsilon, 1 + config.clip_epsilon)
        # torch.min takes the pessimistic branch, which is what makes the bound
        # one-sided: it declines to reward an overlarge step without ever
        # rewarding one.
        policy_loss = -torch.min(unclipped, clipped * minibatch_advantages).mean()

        value_loss = nn.functional.mse_loss(values, returns[batch])
        entropy = distribution.entropy().mean()

        loss = (
            policy_loss
            + config.value_coefficient * value_loss
            - config.entropy_coefficient * entropy
        )

        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip_norm)
        optimizer.step()

        with torch.no_grad():
            # The low-variance KL estimator, not -log_ratio.mean(): the naive
            # one is unbiased but noisy enough to trip early stopping at random.
            stats["approx_kl"] = float(((ratio - 1) - log_ratio).mean())
            stats["clip_fraction"] = float(
                ((ratio - 1).abs() > config.clip_epsilon).float().mean()
            )
        stats["policy_loss"] = float(policy_loss)
        stats["value_loss"] = float(value_loss)

    return stats


def fisher_vector_product(
    model: nn.Module, states: Tensor, vector: Tensor, damping: float = 0.1
) -> Tensor:
    """TRPO's inner operation, for contrast: F @ v without ever forming F.

    The Fisher is the Hessian of the KL at zero divergence, and the Hessian
    times a vector is the gradient of (gradient . vector) - so one extra
    backward pass gives the product. Conjugate gradients then solve F x = g in
    a handful of iterations, and a backtracking line search enforces the KL
    budget exactly.

    This is the principled version of what the clip approximates. It costs an
    order of magnitude more per update, resists minibatching, and needs a
    second-order routine inside a first-order training stack - which is why the
    cruder method is the one that gets used.
    """
    logits, _ = model(states)
    distribution = Categorical(logits=logits)
    kl = torch.distributions.kl_divergence(
        Categorical(logits=logits.detach()), distribution
    ).mean()

    grads = torch.autograd.grad(kl, list(model.parameters()), create_graph=True)
    flat_grad = torch.cat([g.reshape(-1) for g in grads])

    grad_vector_product = (flat_grad * vector).sum()
    second = torch.autograd.grad(grad_vector_product, list(model.parameters()))
    flat_second = torch.cat([g.reshape(-1) for g in second])

    # Damping keeps the system well-conditioned; without it conjugate gradients
    # stall on the Fisher's near-null directions.
    return flat_second + damping * vector`,
        rationale:
          'The batch becomes minibatched epochs with a shuffled permutation, advantages are normalized per minibatch rather than per batch, and the epoch loop is guarded by a measured KL — because the clip bounds per-sample ratios and not the divergence, so stopping is what actually enforces the trust region. Observation normalization and orthogonal initialization are included as part of the model rather than as hygiene, since the ablation found much of this method\'s measured advantage lived there. The low-variance KL estimator replaces the naive one, which is noisy enough to trip early stopping at random. And TRPO\'s Fisher-vector product is shown alongside, because it is what the clip approximates.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'E x M forward-backward passes per rollout; one extra backward per Fisher-vector product in the TRPO path.',
      },
      'make-it-fast': {
        code: `"""PPO - flattened rollouts, fused ratio statistics, epochs that stop early.

Two of the three changes here save compute. The third saves the run: stopping
the epoch loop on measured KL is both the cheapest optimization available and
the mechanism that actually enforces the trust region the clip only gestures at.
"""

from __future__ import annotations

import numpy as np
import torch
from numpy.typing import NDArray
from torch import Tensor


class FlatRollout:
    """(T, N) collected, (T*N,) consumed - one reshape, no copy.

    The gradient is a sum over independent (state, action, advantage, old
    log-prob) tuples, so time-major or env-major is irrelevant to the estimator
    and the layout can be chosen purely to keep minibatch gathers contiguous.
    """

    def __init__(self, horizon: int, n_envs: int, n_features: int) -> None:
        self.states = np.zeros((horizon, n_envs, n_features), dtype=np.float32)
        self.actions = np.zeros((horizon, n_envs), dtype=np.int64)
        self.rewards = np.zeros((horizon, n_envs), dtype=np.float32)
        self.values = np.zeros((horizon, n_envs), dtype=np.float32)
        # Frozen at collection time and never recomputed as the policy moves.
        self.old_log_probs = np.zeros((horizon, n_envs), dtype=np.float32)
        self.keeps_future = np.zeros((horizon, n_envs), dtype=np.float32)
        self.continues = np.zeros((horizon, n_envs), dtype=np.float32)
        self.advantages = np.zeros((horizon, n_envs), dtype=np.float32)
        # Sized once so the per-epoch shuffle never allocates.
        self.permutation = np.arange(horizon * n_envs, dtype=np.int64)

    def compute_advantages(self, last_value: NDArray[np.float32], gamma: float, lam: float) -> None:
        """GAE fused into one reversed sweep, writing into the existing buffer.

        Delta, the decay and the accumulation are one expression per step, so
        the block is traversed once and no intermediate delta array is written.
        """
        running = np.zeros_like(last_value)
        next_value = last_value

        for step in range(self.rewards.shape[0] - 1, -1, -1):
            delta = (
                self.rewards[step]
                + gamma * next_value * self.keeps_future[step]
                - self.values[step]
            )
            running = delta + gamma * lam * self.continues[step] * running
            self.advantages[step] = running
            next_value = self.values[step]

    def flatten(self, n_features: int):
        return (
            torch.from_numpy(self.states.reshape(-1, n_features)),
            torch.from_numpy(self.actions.reshape(-1)),
            torch.from_numpy(self.old_log_probs.reshape(-1)),
            torch.from_numpy(self.advantages.reshape(-1)),
            torch.from_numpy((self.advantages + self.values).reshape(-1)),
        )


def ratio_statistics(log_ratio: Tensor, clip_epsilon: float) -> tuple[float, float]:
    """Approximate KL and clip fraction from one tensor, in one pass.

    Both diagnostics are functions of the same log-ratio, so computing them
    together avoids a second exponential over the whole minibatch. The KL
    estimator is (r - 1) - log r rather than -log r: the naive form is unbiased
    but noisy enough to trip early stopping at random, and this one has
    dramatically lower variance at the same cost.
    """
    with torch.no_grad():
        ratio = log_ratio.exp()
        approx_kl = ((ratio - 1) - log_ratio).mean()
        clip_fraction = ((ratio - 1).abs() > clip_epsilon).float().mean()
    return float(approx_kl), float(clip_fraction)


def train_on_rollout(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    rollout: FlatRollout,
    n_features: int,
    epochs: int,
    minibatches: int,
    clip_epsilon: float,
    target_kl: float,
) -> dict[str, float]:
    states, actions, old_log_probs, advantages, returns = rollout.flatten(n_features)
    batch_size = states.shape[0]
    minibatch_size = batch_size // minibatches

    stats = {"epochs_run": 0.0, "approx_kl": 0.0, "clip_fraction": 0.0}

    for epoch in range(epochs):
        # Shuffled in place, reusing the permutation array allocated once.
        np.random.shuffle(rollout.permutation)
        order = torch.from_numpy(rollout.permutation)

        epoch_kl = 0.0
        for start in range(0, batch_size, minibatch_size):
            batch = order[start : start + minibatch_size]

            logits, values = model(states[batch])          # one shared forward, both heads
            log_probs = torch.log_softmax(logits, dim=1).gather(
                1, actions[batch].unsqueeze(1)
            ).squeeze(1)

            log_ratio = log_probs - old_log_probs[batch]
            ratio = log_ratio.exp()

            normalized = advantages[batch]
            normalized = (normalized - normalized.mean()) / (normalized.std() + 1e-8)

            clipped = torch.clamp(ratio, 1 - clip_epsilon, 1 + clip_epsilon)
            policy_loss = -torch.min(ratio * normalized, clipped * normalized).mean()
            value_loss = torch.nn.functional.mse_loss(values, returns[batch])

            optimizer.zero_grad(set_to_none=True)
            (policy_loss + 0.5 * value_loss).backward()
            optimizer.step()

            epoch_kl, clip_fraction = ratio_statistics(log_ratio, clip_epsilon)
            stats["clip_fraction"] = clip_fraction

        stats["epochs_run"] = float(epoch + 1)
        stats["approx_kl"] = epoch_kl

        # Early stop. The cheapest optimization in the method - a saturated
        # epoch whose samples are mostly clipped contributes nearly nothing
        # anyway - and simultaneously the mechanism that actually bounds the
        # policy movement, which the clip does not.
        if epoch_kl > target_kl:
            break

    return stats`,
        rationale:
          'The rollout is collected as a (T, N) block and consumed as a flat batch by reshape rather than copy, with the per-epoch shuffle reusing a permutation array allocated once. GAE fuses into one reversed sweep writing into the existing buffer. The two ratio diagnostics come from a single pass over the same log-ratio, using the low-variance KL estimator rather than the naive one. And the epoch loop stops on measured KL — which is both the cheapest saving available, since a saturated epoch contributes almost nothing, and the mechanism that actually enforces the trust region.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The rollout block, the advantage buffer and the shuffle permutation are sized once and written in place, so neither collection nor the epoch loop allocates.',
            tradeoff: 'Horizon, environment count and minibatch layout are fixed at construction, so changing any of them means rebuilding the store rather than passing a parameter.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'GAE produces delta, decay and accumulation in one sweep, and the KL and clip-fraction diagnostics come from a single exponential over the shared log-ratio instead of two passes.',
            tradeoff: 'The fused sweep no longer exposes the intermediate TD errors, so a unit test that used to assert on them has nothing left to inspect.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Log-probability lookup is one gather, the clip is one clamp, and the pessimistic branch is one elementwise min over the whole minibatch.',
            tradeoff: 'The clipped samples still cost a full forward and backward pass despite contributing zero gradient, so a high clip fraction wastes compute the vectorized form cannot skip.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Everything is float32 in one contiguous block reshaped rather than copied, so a minibatch gather streams instead of chasing scattered per-step arrays.',
            tradeoff: 'Float32 throughout means the running normalizer statistics accumulate in the same precision, which drifts over very long runs unless they are periodically recomputed.',
          },
        ],
        libraryName: 'NumPy + PyTorch',
        profile: 'One shared forward per minibatch; epochs stop as soon as measured KL exceeds target. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// PPO - the clipped surrogate, transcribed.
//
// A linear softmax policy, so the only new machinery is visible: the
// probability RATIO against the policy that collected the batch, and the flat
// region where the gradient is exactly zero.
//
// The structure to notice is the epoch loop. A plain policy gradient takes one
// step per batch; this takes several, and the clip is what makes that safe.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

struct StepResult {
  std::vector<double> next_state;
  double reward;
  bool done;
};

std::vector<double> Softmax(const std::vector<double>& scores) {
  double largest = scores[0];
  for (double score : scores) largest = score > largest ? score : largest;

  std::vector<double> probabilities(scores.size(), 0.0);
  double total = 0.0;
  for (std::size_t action = 0; action < scores.size(); ++action) {
    probabilities[action] = std::exp(scores[action] - largest);
    total += probabilities[action];
  }
  for (double& probability : probabilities) probability /= total;
  return probabilities;
}

std::vector<double> PolicyProbabilities(const std::vector<std::vector<double>>& theta,
                                        const std::vector<double>& state) {
  std::vector<double> scores(theta.size(), 0.0);
  for (std::size_t action = 0; action < theta.size(); ++action) {
    double score = 0.0;
    for (std::size_t i = 0; i < state.size(); ++i) {
      score += theta[action][i] * state[i];
    }
    scores[action] = score;
  }
  return Softmax(scores);
}

std::size_t SampleAction(const std::vector<double>& probabilities, double uniform_draw) {
  double cumulative = 0.0;
  for (std::size_t action = 0; action < probabilities.size(); ++action) {
    cumulative += probabilities[action];
    if (uniform_draw < cumulative) return action;
  }
  return probabilities.size() - 1;
}

std::vector<double> ReturnsToGo(const std::vector<double>& rewards, double gamma) {
  std::vector<double> out(rewards.size(), 0.0);
  double running = 0.0;
  for (std::size_t offset = rewards.size(); offset > 0; --offset) {
    running = rewards[offset - 1] + gamma * running;
    out[offset - 1] = running;
  }
  return out;
}

// The scalar that multiplies the score, for min(r*A, clip(r)*A).
//
// The gradient of r with respect to theta is r * grad log pi, so the whole
// per-sample gradient is (A * r) * grad log pi - EXCEPT inside the flat region,
// where the objective is constant in theta and the gradient is exactly zero.
//
// Read the two cases. A positive advantage wants the action's probability
// raised, and past 1 + epsilon there is no further reward for raising it. A
// negative advantage wants it lowered, and past 1 - epsilon there is no further
// reward for lowering it. The min is what makes this one-sided: it declines to
// reward an overlarge step, and still penalizes a wrong one.
double ClippedCoefficient(double ratio, double advantage, double epsilon) {
  if (advantage >= 0.0 && ratio > 1.0 + epsilon) return 0.0;
  if (advantage < 0.0 && ratio < 1.0 - epsilon) return 0.0;
  return advantage * ratio;
}

struct SampleRecord {
  std::vector<double> state;
  std::size_t action;
  double discounted_return;
  double old_log_prob;
};

template <typename Env>
std::vector<std::vector<double>> Train(Env& env, std::size_t n_features,
                                       std::size_t n_actions, int iterations,
                                       std::size_t episodes_per_batch, int epochs,
                                       double alpha, double gamma, double epsilon) {
  std::vector<std::vector<double>> theta(n_actions, std::vector<double>(n_features, 0.0));

  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);

  for (int iteration = 0; iteration < iterations; ++iteration) {
    std::vector<SampleRecord> batch;
    double return_sum = 0.0;

    for (std::size_t episode = 0; episode < episodes_per_batch; ++episode) {
      std::vector<std::vector<double>> states;
      std::vector<std::size_t> actions;
      std::vector<double> rewards;
      std::vector<double> old_log_probs;

      std::vector<double> state = env.reset();
      bool done = false;
      while (!done) {
        const std::vector<double> probabilities = PolicyProbabilities(theta, state);
        const std::size_t action = SampleAction(probabilities, uniform(rng));
        const StepResult result = env.step(static_cast<int>(action));

        states.push_back(state);
        actions.push_back(action);
        rewards.push_back(result.reward);
        // The log-probability under the policy that COLLECTED this sample,
        // frozen here. Every epoch below compares against it, and it must not
        // be recomputed as the policy moves.
        old_log_probs.push_back(std::log(probabilities[action] + 1e-12));

        state = result.next_state;
        done = result.done;
      }

      const std::vector<double> discounted = ReturnsToGo(rewards, gamma);
      for (std::size_t step = 0; step < actions.size(); ++step) {
        return_sum += discounted[step];
        batch.push_back({states[step], actions[step], discounted[step], old_log_probs[step]});
      }
    }

    const double baseline = return_sum / static_cast<double>(batch.size());

    // SEVERAL passes over the same data. This is where the sample efficiency
    // over a plain policy gradient comes from, and it is only safe because the
    // clip removes the incentive to keep moving.
    for (int epoch = 0; epoch < epochs; ++epoch) {
      std::vector<std::vector<double>> gradient(n_actions,
                                                std::vector<double>(n_features, 0.0));
      std::size_t clipped_count = 0;

      for (const SampleRecord& record : batch) {
        const double advantage = record.discounted_return - baseline;
        const std::vector<double> probabilities = PolicyProbabilities(theta, record.state);

        // The ratio starts at exactly 1 on the first epoch, because the policy
        // has not moved yet, and drifts from there.
        const double log_ratio =
            std::log(probabilities[record.action] + 1e-12) - record.old_log_prob;
        const double ratio = std::exp(log_ratio);

        const double coefficient = ClippedCoefficient(ratio, advantage, epsilon);
        if (coefficient == 0.0) {
          ++clipped_count;      // zero gradient; this sample is inert
          continue;
        }

        for (std::size_t candidate = 0; candidate < n_actions; ++candidate) {
          const double indicator = candidate == record.action ? 1.0 : 0.0;
          const double scaled = coefficient * (indicator - probabilities[candidate]);
          for (std::size_t i = 0; i < n_features; ++i) {
            gradient[candidate][i] += scaled * record.state[i];
          }
        }
      }

      // Ascent. A clip fraction climbing toward one means most of this epoch
      // contributed nothing and the compute was spent anyway.
      const double count = static_cast<double>(batch.size());
      for (std::size_t candidate = 0; candidate < n_actions; ++candidate) {
        for (std::size_t i = 0; i < n_features; ++i) {
          theta[candidate][i] += alpha * gradient[candidate][i] / count;
        }
      }
      (void)clipped_count;
    }
  }

  return theta;
}`,
        profile: 'O(|A| x d) per sample per epoch, with each sample copied into the batch and revisited once per epoch.',
      },
      'make-it-right': {
        code: `// PPO - owned flat rollout, minibatch epochs, KL early stopping.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

struct ClipRange {
  float value;
};

struct KlBudget {
  float value;
};

struct PpoConfig {
  ClipRange clip{0.2F};
  // The admission that the clip does NOT bound the KL. It bounds per-sample
  // ratios, and a policy can move a long way with every ratio inside the
  // interval - so the trust region is actually enforced by stopping here.
  KlBudget target_kl{0.015F};
  float gamma = 0.99F;
  float lambda = 0.95F;
  float value_coefficient = 0.5F;
  float entropy_coefficient = 0.01F;
  std::size_t epochs = 4;
  std::size_t minibatches = 4;
};

void ValidateConfig(const PpoConfig& config) {
  if (config.clip.value <= 0.0F || config.clip.value >= 1.0F) {
    throw std::invalid_argument("clip range must be in (0, 1)");
  }
  if (config.epochs == 0 || config.minibatches == 0) {
    throw std::invalid_argument("epochs and minibatch count must be at least one");
  }
  if (config.lambda < 0.0F || config.lambda > 1.0F) {
    throw std::invalid_argument("lambda must be in [0, 1]");
  }
}

// Structure-of-arrays rollout owning one flat allocation per field, reused
// between iterations. The naive version copies each sample into a record and
// then walks a vector of records once per epoch; this copies nothing and keeps
// a minibatch gather contiguous.
class Rollout {
 public:
  Rollout(std::size_t capacity, std::size_t n_features)
      : n_features_(n_features),
        states_(capacity * n_features, 0.0F),
        actions_(capacity, 0),
        rewards_(capacity, 0.0F),
        values_(capacity, 0.0F),
        // Frozen at collection time and never recomputed as the policy moves.
        old_log_probs_(capacity, 0.0F),
        advantages_(capacity, 0.0F),
        returns_(capacity, 0.0F),
        // Sized once so the per-epoch shuffle never allocates.
        permutation_(capacity, 0) {
    if (capacity == 0 || n_features == 0) {
      throw std::invalid_argument("capacity and feature width must be positive");
    }
    std::iota(permutation_.begin(), permutation_.end(), std::size_t{0});
  }

  void Shuffle(std::mt19937& rng) {
    std::shuffle(permutation_.begin(), permutation_.end(), rng);
  }

  [[nodiscard]] std::span<const std::size_t> Order() const { return permutation_; }
  [[nodiscard]] std::span<const float> OldLogProbs() const { return old_log_probs_; }
  [[nodiscard]] std::span<float> Advantages() { return advantages_; }

 private:
  std::size_t n_features_;
  std::vector<float> states_;
  std::vector<std::size_t> actions_;
  std::vector<float> rewards_;
  std::vector<float> values_;
  std::vector<float> old_log_probs_;
  std::vector<float> advantages_;
  std::vector<float> returns_;
  std::vector<std::size_t> permutation_;
};

// The pessimistic branch, written out. torch.min in the Python version; here
// the min is explicit, and so is the fact that it is what makes the bound
// one-sided - it declines to reward an overlarge step without rewarding one.
[[nodiscard]] float ClippedSurrogate(float ratio, float advantage, ClipRange clip) noexcept {
  const float unclipped = ratio * advantage;
  const float bounded = std::clamp(ratio, 1.0F - clip.value, 1.0F + clip.value) * advantage;
  return std::min(unclipped, bounded);
}

// The low-variance KL estimator, (r - 1) - log r, not -log r.
//
// The naive form is unbiased and noisy enough to trip early stopping at random;
// this one has dramatically lower variance for the same arithmetic, and the
// early stop is the only thing genuinely bounding policy movement.
[[nodiscard]] float ApproximateKl(std::span<const float> log_ratios) noexcept {
  float total = 0.0F;
  for (float log_ratio : log_ratios) {
    total += (std::exp(log_ratio) - 1.0F) - log_ratio;
  }
  return total / static_cast<float>(log_ratios.size());
}

// Welford statistics over observations.
//
// Nominally a detail, measurably a large part of this method's advantage -
// careful ablation found much of PPO's edge over TRPO came from normalization,
// initialization and annealing rather than from the clipped objective. It is
// therefore part of the MODEL and must be serialized with the weights.
class RunningNormalizer {
 public:
  explicit RunningNormalizer(std::size_t size) : mean_(size, 0.0F), variance_(size, 1.0F) {}

  void Update(std::span<const float> sample) {
    ++count_;
    for (std::size_t i = 0; i < sample.size(); ++i) {
      const float delta = sample[i] - mean_[i];
      mean_[i] += delta / static_cast<float>(count_);
      variance_[i] += delta * (sample[i] - mean_[i]);
    }
  }

  void Apply(std::span<float> observation) const {
    const auto denominator = static_cast<float>(count_ > 1 ? count_ - 1 : 1);
    for (std::size_t i = 0; i < observation.size(); ++i) {
      observation[i] = (observation[i] - mean_[i]) / std::sqrt(variance_[i] / denominator + 1e-8F);
    }
  }

 private:
  std::vector<float> mean_;
  std::vector<float> variance_;
  std::size_t count_ = 0;
};`,
        rationale:
          'The vector of per-sample records becomes one flat allocation per field with a permutation array sized once, so minibatch gathers stay contiguous and the per-epoch shuffle allocates nothing. The clip range and KL budget become distinct types, construction validates rather than failing downstream, and the pessimistic min is written out explicitly. The low-variance KL estimator replaces the naive one, since the early stop it feeds is the only thing genuinely bounding policy movement. And the running normalizer is included as part of the model, because the ablation found much of this method\'s measured advantage lived exactly there.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per rollout field, reused across iterations; shuffle in place, gathers contiguous.',
      },
      'make-it-fast': {
        code: `// PPO - lockstep collection, fused clip-and-statistics pass, batched GEMM.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

// Collection: every environment advances exactly one step into its own output
// slice, so the loop needs no synchronization and the work per iteration is
// uniform. This is the same lockstep structure A2C uses, and PPO inherits it.
template <typename Env>
void StepEnvironmentsParallel(std::vector<Env>& envs,
                              const std::size_t* __restrict actions,
                              float* __restrict next_states,
                              float* __restrict rewards,
                              std::uint8_t* __restrict ends,
                              std::size_t n_features) {
  const int count = static_cast<int>(envs.size());
#pragma omp parallel for schedule(static)
  for (int env = 0; env < count; ++env) {
    const auto index = static_cast<std::size_t>(env);
    envs[index].Step(actions[index], next_states + index * n_features, rewards + index,
                     ends + index);
  }
}

// The clipped surrogate and both diagnostics, in ONE pass over the minibatch.
//
// Ratio, clip, pessimistic min, per-sample gradient coefficient, approximate
// KL and clip fraction are all functions of the same log-ratio. Computing them
// separately means four traversals and four exponentials over the same data;
// fused, the minibatch is read once and the exponential is evaluated once.
struct ClipStatistics {
  float surrogate;
  float approximate_kl;
  float clip_fraction;
};

ClipStatistics ClippedSurrogateFused(const float* __restrict log_ratios,
                                     const float* __restrict advantages,
                                     std::size_t count, float clip,
                                     float* __restrict coefficients) noexcept {
  float surrogate_total = 0.0F;
  float kl_total = 0.0F;
  std::size_t clipped = 0;

  // Contiguous, no aliasing between inputs and the coefficient output, so this
  // autovectorizes without hand-written intrinsics.
  for (std::size_t index = 0; index < count; ++index) {
    const float log_ratio = log_ratios[index];
    const float ratio = std::exp(log_ratio);
    const float advantage = advantages[index];

    const float unclipped = ratio * advantage;
    const float bounded = std::clamp(ratio, 1.0F - clip, 1.0F + clip) * advantage;
    const bool is_clipped = bounded < unclipped;

    surrogate_total += is_clipped ? bounded : unclipped;
    // Zero inside the flat region: the objective is constant there, so the
    // sample contributes no gradient at all.
    coefficients[index] = is_clipped ? 0.0F : advantage * ratio;

    // The low-variance estimator, (r - 1) - log r, sharing the exponential
    // already computed rather than paying for a second one.
    kl_total += (ratio - 1.0F) - log_ratio;
    clipped += std::fabs(ratio - 1.0F) > clip ? 1 : 0;
  }

  const auto denominator = static_cast<float>(count);
  return {surrogate_total / denominator, kl_total / denominator,
          static_cast<float>(clipped) / denominator};
}

// One trunk GEMM per minibatch feeding both heads, exactly as in A2C - PPO
// changes the objective, not the forward pass, and running policy and critic
// separately would duplicate the trunk for nothing.
class SharedTrunkNetwork {
 public:
  void Forward(const Eigen::MatrixXf& states, Eigen::MatrixXf& logits,
               Eigen::VectorXf& values) const {
    const Eigen::MatrixXf features = ((w_trunk_ * states).colwise() + b_trunk_).cwiseMax(0.0F);
    logits = (w_policy_ * features).colwise() + b_policy_;
    values = (w_value_ * features).transpose() + Eigen::VectorXf::Constant(states.cols(), b_value_);
  }

 private:
  Eigen::MatrixXf w_trunk_;
  Eigen::VectorXf b_trunk_;
  Eigen::MatrixXf w_policy_;
  Eigen::VectorXf b_policy_;
  Eigen::RowVectorXf w_value_;
  float b_value_ = 0.0F;
};`,
        rationale:
          'Collection runs lockstep across threads, the same structure A2C uses and PPO inherits unchanged. The interesting change is the fused pass: ratio, clip, pessimistic min, per-sample gradient coefficient, approximate KL and clip fraction are all functions of the same log-ratio, so computing them separately means four traversals and four exponentials over the same minibatch — fused, it is read once and the exponential evaluated once. The trunk stays one GEMM feeding both heads, since PPO changes the objective and not the forward pass.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Surrogate, gradient coefficient, approximate KL and clip fraction share one traversal and one exponential, instead of four passes each recomputing exp(log_ratio).',
            tradeoff: 'The diagnostics are now entangled with the loss computation, so disabling them to save work is no longer possible without splitting the loop back apart.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The fused loop reads two contiguous inputs and writes one contiguous output, and restrict removes the aliasing ambiguity that would otherwise block autovectorization.',
            tradeoff: 'It is an unchecked promise — passing an overlapping coefficient buffer compiles silently and produces wrong gradients with no diagnostic.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each environment advances one step into a disjoint output slice, so lockstep collection parallelizes with no synchronization and uniform work per iteration.',
            tradeoff: 'A slow environment stalls the batch, and each thread needs its own environment instance, so simulator memory scales with the worker count.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The trunk is one GEMM per minibatch feeding both heads, rather than a per-sample product evaluated twice for the policy and the critic.',
            tradeoff: 'Samples must be columns rather than rows, the opposite of the natural collection order, so the minibatch is transposed at the boundary.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'One traversal and one exponential per minibatch for loss and diagnostics together. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! PPO - the clipped surrogate, transcribed.
//!
//! A linear softmax policy, so the only new machinery is visible: the
//! probability RATIO against the policy that collected the batch, and the flat
//! region where the gradient is exactly zero.
//!
//! The structure to notice is the epoch loop. A plain policy gradient takes one
//! step per batch; this takes several, and the clip is what makes that safe.

pub struct StepResult {
    pub next_state: Vec<f64>,
    pub reward: f64,
    pub done: bool,
}

pub trait Environment {
    fn reset(&mut self) -> Vec<f64>;
    fn step(&mut self, action: usize) -> StepResult;
}

pub fn softmax(scores: &[f64]) -> Vec<f64> {
    let mut largest = f64::NEG_INFINITY;
    for &score in scores {
        if score > largest {
            largest = score;
        }
    }

    let mut probabilities = vec![0.0; scores.len()];
    let mut total = 0.0;
    for action in 0..scores.len() {
        probabilities[action] = (scores[action] - largest).exp();
        total += probabilities[action];
    }
    for probability in &mut probabilities {
        *probability /= total;
    }
    probabilities
}

pub fn policy_probabilities(theta: &[Vec<f64>], state: &[f64]) -> Vec<f64> {
    let mut scores = vec![0.0; theta.len()];
    for action in 0..theta.len() {
        let mut score = 0.0;
        for i in 0..state.len() {
            score += theta[action][i] * state[i];
        }
        scores[action] = score;
    }
    softmax(&scores)
}

pub fn sample_action(probabilities: &[f64], uniform_draw: f64) -> usize {
    let mut cumulative = 0.0;
    for (action, &probability) in probabilities.iter().enumerate() {
        cumulative += probability;
        if uniform_draw < cumulative {
            return action;
        }
    }
    probabilities.len() - 1
}

pub fn returns_to_go(rewards: &[f64], gamma: f64) -> Vec<f64> {
    let mut out = vec![0.0; rewards.len()];
    let mut running = 0.0;
    for step in (0..rewards.len()).rev() {
        running = rewards[step] + gamma * running;
        out[step] = running;
    }
    out
}

/// The scalar that multiplies the score, for min(r*A, clip(r)*A).
///
/// The gradient of r with respect to theta is r * grad log pi, so the whole
/// per-sample gradient is (A * r) * grad log pi - EXCEPT inside the flat
/// region, where the objective is constant in theta and the gradient is
/// exactly zero.
///
/// Read the two cases. A positive advantage wants the action's probability
/// raised, and past 1 + epsilon there is no further reward for raising it. A
/// negative advantage wants it lowered, and past 1 - epsilon there is no
/// further reward for lowering it. The min is what makes this one-sided: it
/// declines to reward an overlarge step, and still penalizes a wrong one.
pub fn clipped_coefficient(ratio: f64, advantage: f64, epsilon: f64) -> f64 {
    if advantage >= 0.0 && ratio > 1.0 + epsilon {
        return 0.0;
    }
    if advantage < 0.0 && ratio < 1.0 - epsilon {
        return 0.0;
    }
    advantage * ratio
}

pub struct SampleRecord {
    pub state: Vec<f64>,
    pub action: usize,
    pub discounted_return: f64,
    pub old_log_prob: f64,
}

#[allow(clippy::too_many_arguments)]
pub fn train(
    env: &mut dyn Environment,
    n_features: usize,
    n_actions: usize,
    iterations: usize,
    episodes_per_batch: usize,
    epochs: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<Vec<f64>> {
    let mut theta = vec![vec![0.0; n_features]; n_actions];

    for _ in 0..iterations {
        let mut batch: Vec<SampleRecord> = Vec::new();
        let mut return_sum = 0.0;

        for _ in 0..episodes_per_batch {
            let mut states: Vec<Vec<f64>> = Vec::new();
            let mut actions: Vec<usize> = Vec::new();
            let mut rewards: Vec<f64> = Vec::new();
            let mut old_log_probs: Vec<f64> = Vec::new();

            let mut state = env.reset();
            let mut done = false;
            while !done {
                let probabilities = policy_probabilities(&theta, &state);
                let action = sample_action(&probabilities, rand());
                let result = env.step(action);

                states.push(state);
                actions.push(action);
                rewards.push(result.reward);
                // The log-probability under the policy that COLLECTED this
                // sample, frozen here. Every epoch below compares against it,
                // and it must not be recomputed as the policy moves.
                old_log_probs.push((probabilities[action] + 1e-12).ln());

                state = result.next_state;
                done = result.done;
            }

            let discounted = returns_to_go(&rewards, gamma);
            for step in 0..actions.len() {
                return_sum += discounted[step];
                batch.push(SampleRecord {
                    state: states[step].clone(),
                    action: actions[step],
                    discounted_return: discounted[step],
                    old_log_prob: old_log_probs[step],
                });
            }
        }

        let baseline = return_sum / batch.len() as f64;

        // SEVERAL passes over the same data. This is where the sample
        // efficiency over a plain policy gradient comes from, and it is only
        // safe because the clip removes the incentive to keep moving.
        for _ in 0..epochs {
            let mut gradient = vec![vec![0.0; n_features]; n_actions];
            let mut clipped_count = 0usize;

            for record in &batch {
                let advantage = record.discounted_return - baseline;
                let probabilities = policy_probabilities(&theta, &record.state);

                // The ratio starts at exactly 1 on the first epoch, because the
                // policy has not moved yet, and drifts from there.
                let log_ratio =
                    (probabilities[record.action] + 1e-12).ln() - record.old_log_prob;
                let ratio = log_ratio.exp();

                let coefficient = clipped_coefficient(ratio, advantage, epsilon);
                if coefficient == 0.0 {
                    clipped_count += 1; // zero gradient; this sample is inert
                    continue;
                }

                for candidate in 0..n_actions {
                    let indicator = if candidate == record.action { 1.0 } else { 0.0 };
                    let scaled = coefficient * (indicator - probabilities[candidate]);
                    for i in 0..n_features {
                        gradient[candidate][i] += scaled * record.state[i];
                    }
                }
            }

            // Ascent. A clip fraction climbing toward one means most of this
            // epoch contributed nothing and the compute was spent anyway.
            let count = batch.len() as f64;
            for candidate in 0..n_actions {
                for i in 0..n_features {
                    theta[candidate][i] += alpha * gradient[candidate][i] / count;
                }
            }
            let _ = clipped_count;
        }
    }

    theta
}`,
        profile: 'O(|A| x d) per sample per epoch. Each sample is cloned into the batch and revisited once per epoch; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! PPO - typed errors, flat rollout, minibatch epochs, KL early stopping.

use std::fmt;

/// Newtypes so a clip range and a KL budget cannot be transposed - both are
/// small positive floats and swapping them silently changes what is enforced.
#[derive(Debug, Clone, Copy)]
pub struct ClipRange(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct KlBudget(pub f32);

#[derive(Debug, PartialEq, Eq)]
pub enum PpoError {
    EmptyRollout,
    BadClipRange,
    BadLambda,
    NoEpochs,
    StateWidthMismatch { got: usize, expected: usize },
}

impl fmt::Display for PpoError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyRollout => write!(f, "capacity and feature width must be positive"),
            Self::BadClipRange => write!(f, "clip range must be in (0, 1)"),
            Self::BadLambda => write!(f, "lambda must be in [0, 1]"),
            Self::NoEpochs => write!(f, "epochs and minibatch count must be at least one"),
            Self::StateWidthMismatch { got, expected } => {
                write!(f, "state has width {got}, rollout expects {expected}")
            }
        }
    }
}

impl std::error::Error for PpoError {}

/// Structure-of-arrays rollout owning one flat allocation per field, reused
/// between iterations. The naive version clones each sample into a record and
/// walks a Vec of records once per epoch; this clones nothing and keeps a
/// minibatch gather contiguous.
pub struct Rollout {
    n_features: usize,
    states: Vec<f32>,
    actions: Vec<u32>,
    values: Vec<f32>,
    /// Frozen at collection time and never recomputed as the policy moves.
    old_log_probs: Vec<f32>,
    advantages: Vec<f32>,
    returns: Vec<f32>,
    /// Sized once so the per-epoch shuffle never allocates.
    permutation: Vec<u32>,
    len: usize,
}

impl Rollout {
    pub fn new(capacity: usize, n_features: usize) -> Result<Self, PpoError> {
        if capacity == 0 || n_features == 0 {
            return Err(PpoError::EmptyRollout);
        }
        Ok(Self {
            n_features,
            states: vec![0.0; capacity * n_features],
            actions: vec![0; capacity],
            values: vec![0.0; capacity],
            old_log_probs: vec![0.0; capacity],
            advantages: vec![0.0; capacity],
            returns: vec![0.0; capacity],
            permutation: (0..capacity as u32).collect(),
            len: 0,
        })
    }

    /// Borrows the state and copies it into storage the rollout already owns,
    /// so recording a step allocates nothing.
    pub fn push(
        &mut self,
        state: &[f32],
        action: u32,
        value: f32,
        old_log_prob: f32,
    ) -> Result<(), PpoError> {
        if state.len() != self.n_features {
            return Err(PpoError::StateWidthMismatch {
                got: state.len(),
                expected: self.n_features,
            });
        }
        let offset = self.len * self.n_features;
        self.states[offset..offset + self.n_features].copy_from_slice(state);
        self.actions[self.len] = action;
        self.values[self.len] = value;
        self.old_log_probs[self.len] = old_log_prob;
        self.len += 1;
        Ok(())
    }

    #[must_use]
    pub fn order(&self) -> &[u32] {
        &self.permutation[..self.len]
    }
}

/// The pessimistic branch, written out.
///
/// The min is what makes the bound one-sided: it declines to reward a step that
/// has already gone far enough, and still penalizes one that went the wrong way.
#[inline]
#[must_use]
pub fn clipped_surrogate(ratio: f32, advantage: f32, clip: ClipRange) -> f32 {
    let unclipped = ratio * advantage;
    let bounded = ratio.clamp(1.0 - clip.0, 1.0 + clip.0) * advantage;
    unclipped.min(bounded)
}

/// The low-variance KL estimator, (r - 1) - log r, not -log r.
///
/// The naive form is unbiased and noisy enough to trip early stopping at
/// random; this one has dramatically lower variance for the same arithmetic.
/// That matters because the early stop is the only thing genuinely bounding
/// policy movement - the clip bounds per-sample ratios, not the divergence.
#[must_use]
pub fn approximate_kl(log_ratios: &[f32]) -> f32 {
    log_ratios
        .iter()
        .map(|&log_ratio| (log_ratio.exp() - 1.0) - log_ratio)
        .sum::<f32>()
        / log_ratios.len() as f32
}

/// Fraction of samples whose ratio has left the clip interval.
///
/// Climbing toward one means late epochs are contributing almost nothing: their
/// gradient is zero and the forward and backward passes were paid anyway.
#[must_use]
pub fn clip_fraction(log_ratios: &[f32], clip: ClipRange) -> f32 {
    let clipped = log_ratios
        .iter()
        .filter(|&&log_ratio| (log_ratio.exp() - 1.0).abs() > clip.0)
        .count();
    clipped as f32 / log_ratios.len() as f32
}`,
        rationale:
          'The Vec of cloned per-sample records becomes one flat allocation per field with a permutation sized once, so minibatch gathers stay contiguous and nothing is cloned per step. Construction validates instead of failing downstream, and the clip range and KL budget become distinct types since both are small positive floats that transpose silently. The pessimistic min is written out explicitly, and the low-variance KL estimator replaces the naive one, because the early stop it feeds is the only thing genuinely bounding policy movement.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per rollout field, reused across iterations; shuffle in place, gathers contiguous.',
      },
      'make-it-fast': {
        code: `//! PPO - parallel collection, one fused clip-and-diagnostics pass, GEMM heads.

use ndarray::{Array1, Array2, ArrayView2};
use rayon::prelude::*;

/// Collection: every environment advances exactly one step into its own output
/// slot, so the loop needs no locking and the work per iteration is uniform.
/// The same lockstep structure A2C uses, inherited unchanged.
pub struct StepOutcome {
    pub reward: f32,
    pub terminal: bool,
    pub truncated: bool,
}

pub fn step_all<E, F>(envs: &mut [E], actions: &[u32], step: F) -> Vec<StepOutcome>
where
    E: Send,
    F: Fn(&mut E, u32) -> StepOutcome + Sync + Send,
{
    envs.par_iter_mut()
        .zip(actions.par_iter())
        .map(|(env, &action)| step(env, action))
        .collect()
}

/// Surrogate, per-sample gradient coefficient and both diagnostics, in ONE pass.
///
/// Ratio, clip, pessimistic min, gradient coefficient, approximate KL and clip
/// fraction are all functions of the same log-ratio. Computing them separately
/// means four traversals and four exponentials over the same minibatch; fused,
/// it is read once and the exponential is evaluated once.
pub struct ClipStatistics {
    pub surrogate: f32,
    pub approximate_kl: f32,
    pub clip_fraction: f32,
}

pub fn clipped_surrogate_fused(
    log_ratios: &[f32],
    advantages: &[f32],
    clip: f32,
    coefficients: &mut [f32],
) -> ClipStatistics {
    let mut surrogate_total = 0.0_f32;
    let mut kl_total = 0.0_f32;
    let mut clipped = 0_usize;

    // Zipped iteration over contiguous slices of equal length, so the bounds
    // checks fall out of the whole loop and it streams.
    for ((&log_ratio, &advantage), coefficient) in log_ratios
        .iter()
        .zip(advantages.iter())
        .zip(coefficients.iter_mut())
    {
        let ratio = log_ratio.exp();
        let unclipped = ratio * advantage;
        let bounded = ratio.clamp(1.0 - clip, 1.0 + clip) * advantage;
        let is_clipped = bounded < unclipped;

        surrogate_total += if is_clipped { bounded } else { unclipped };
        // Zero inside the flat region: the objective is constant there, so the
        // sample contributes no gradient at all.
        *coefficient = if is_clipped { 0.0 } else { advantage * ratio };

        // The low-variance estimator, sharing the exponential already computed
        // rather than paying for a second one.
        kl_total += (ratio - 1.0) - log_ratio;
        clipped += usize::from((ratio - 1.0).abs() > clip);
    }

    let denominator = log_ratios.len() as f32;
    ClipStatistics {
        surrogate: surrogate_total / denominator,
        approximate_kl: kl_total / denominator,
        clip_fraction: clipped as f32 / denominator,
    }
}

/// One trunk GEMM per minibatch feeding both heads, exactly as in A2C - PPO
/// changes the objective, not the forward pass, and running the policy and the
/// critic separately would duplicate the trunk for nothing.
pub struct SharedTrunk {
    w_trunk: Array2<f32>,
    b_trunk: Array1<f32>,
    w_policy: Array2<f32>,
    b_policy: Array1<f32>,
    w_value: Array1<f32>,
    b_value: f32,
}

impl SharedTrunk {
    #[must_use]
    pub fn forward(&self, states: ArrayView2<'_, f32>) -> (Array2<f32>, Array1<f32>) {
        let mut features = states.dot(&self.w_trunk) + &self.b_trunk;
        features.mapv_inplace(|value| value.max(0.0)); // in place, no temporary

        let logits = features.dot(&self.w_policy) + &self.b_policy;
        let values = features.dot(&self.w_value) + self.b_value;
        (logits, values)
    }
}

/// Epochs that stop as soon as the measured KL exceeds the budget.
///
/// The cheapest optimization available - a saturated epoch whose samples are
/// mostly clipped contributes almost nothing anyway - and simultaneously the
/// mechanism that actually bounds policy movement, which the clip does not.
pub fn run_epochs<F>(epochs: usize, target_kl: f32, mut epoch: F) -> usize
where
    F: FnMut(usize) -> f32,
{
    for index in 0..epochs {
        if epoch(index) > target_kl {
            return index + 1;
        }
    }
    epochs
}`,
        rationale:
          'Collection runs lockstep across threads, the structure A2C uses and PPO inherits. The change that matters is the fused pass: surrogate, gradient coefficient, approximate KL and clip fraction all derive from the same log-ratio, so a zipped walk over contiguous slices computes them in one traversal with one exponential instead of four. The trunk stays one GEMM feeding both heads, and the epoch loop exits on measured KL — the cheapest saving available and the only thing genuinely bounding how far the policy moves.',
        optimizations: [
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The fused clip pass zips three contiguous slices of equal length, so the bounds checks drop out of the loop that touches every sample in every epoch.',
            tradeoff: 'It requires the three slices to be pre-aligned to the same minibatch layout, so the gather that builds them is now a separate step that must stay in sync.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'States are copied once into rollout storage at collection and referenced by index thereafter, instead of being cloned into a per-sample record that every epoch then walks.',
            tradeoff: 'Indices into a shared buffer are easy to invalidate — a rollout reset between epochs would leave the permutation pointing at overwritten data with nothing complaining.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Each environment advances one step into its own slot, so lockstep collection parallelizes with no shared state and uniform work per iteration.',
            tradeoff: 'A slow environment stalls the batch, each thread needs its own environment instance, and reproducibility depends on the worker count as well as the seed.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The trunk becomes one GEMM per minibatch feeding both heads rather than a per-sample product evaluated twice.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, complicating cross-compilation and making the binary sensitive to which implementation is linked.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'One traversal and one exponential per minibatch for loss and diagnostics together; epochs stop on KL. Illustrative, not a measured benchmark.',
      },
    },
  },
};
