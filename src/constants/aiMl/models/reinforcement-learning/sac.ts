import type { AiMlModel } from '../../types';

/**
 * SAC — the entry where exploration stops being something you add and
 * becomes part of what is being maximized.
 *
 * Put entropy in the objective and three of TD3's problems dissolve at
 * once: no exploration schedule, no target actor, and a policy that
 * cannot collapse onto a single action because doing so would lower
 * the thing it is optimizing.
 */
export const SAC: AiMlModel = {
  slug: 'sac',
  name: 'Soft Actor-Critic',
  aliases: ['SAC', 'Maximum-entropy RL', 'Soft Q-learning', 'Automatic temperature tuning'],
  category: 'reinforcement-learning',
  group: 'continuous-control',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Off-policy reinforcement learning with a stochastic policy and an entropy term inside the objective rather than beside it. That combination is unusual: off-policy replay normally pairs with a deterministic policy, and a stochastic policy normally pairs with on-policy learning. Getting both is what makes this the default for continuous control.',

  intuition:
    'Every method so far has treated exploration as something bolted on — an epsilon, a noise scale, an entropy bonus tuned until the run stops collapsing. SAC changes the objective instead: maximize return plus the entropy of the policy, weighted by a temperature. The agent is now paid to remain uncertain, and that single change does a surprising amount of work. Exploration is no longer a schedule to tune, because a policy that narrows onto one action loses entropy and therefore loses objective value; the exploration is whatever the return-versus-uncertainty trade says it should be, state by state. The value function changes shape too. The max over actions in the Bellman equation becomes a log-sum-exp — a soft maximum — so a state with several near-equally-good actions is worth more than a state with one, which is a genuinely different and often better notion of value. And because the policy is stochastic, the actor can be trained by reparameterizing the sample rather than by a score-function estimator, which means the gradient flows through the sampled action into the critic and carries far less variance than REINFORCE-style estimation. What remains from TD3 is the pessimism: two critics with the minimum taken, because an actor is still an optimizer pointed at a learned surface. What goes away is the target actor, the exploration noise schedule, and most of the brittleness. The temperature is the one new knob, and it is usually tuned automatically against a target entropy, which is why SAC in practice has fewer things to get wrong than anything else in this branch.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        'Q_{\\text{soft}}(s,a) = r + \\gamma\\,\\mathbb{E}_{s\'}\\bigl[V_{\\text{soft}}(s\')\\bigr], \\qquad V_{\\text{soft}}(s) = \\mathbb{E}_{a \\sim \\pi}\\bigl[Q_{\\text{soft}}(s,a) - \\alpha \\log \\pi(a \\mid s)\\bigr] \;=\; \\alpha \\log \\int_{\\mathcal{A}} e^{Q_{\\text{soft}}(s,a)/\\alpha}\\,da',
      symbols: [
        { symbol: '\\alpha \\log \\int e^{Q/\\alpha}', meaning: 'the soft maximum: the hard max of ordinary Q-learning replaced by a log-sum-exp, which is what makes a state with several good actions worth more than one with a single good action' },
        { symbol: '-\\alpha \\log \\pi(a \\mid s)', meaning: 'the entropy bonus, inside the value rather than beside the loss — it is part of what is being estimated, not a regularizer on the estimate' },
        { symbol: '\\alpha', meaning: 'the temperature, trading return against uncertainty; as it goes to zero the log-sum-exp becomes a max and this reduces exactly to ordinary Q-learning' },
        { symbol: '\\pi(a \\mid s)', meaning: 'a stochastic policy, so exploration is emitted by the policy itself rather than injected as noise from outside it' },
      ],
    },
    reading:
      'The formula says two things worth separating. The first is what the agent is being paid for: discounted return plus the entropy of its own action distribution, so remaining uncertain has value and a policy that commits early is giving something up. The second is what that does to the value function. Write the optimal soft value and the max over actions has become a log-sum-exp — a smooth maximum that is dominated by the best action but raised by every other action that is nearly as good. That is not a computational convenience; it is a different definition of what a state is worth, and it is usually the better one for control, because a state offering several viable actions really is more valuable than one offering a single narrow path. Two limits make the family visible. As the temperature goes to zero the log-sum-exp collapses to a max and this becomes ordinary Q-learning with a deterministic policy. As it grows the policy approaches uniform and the return term stops mattering. The actor\'s objective is the other half and it has an elegant reading: minimizing the KL divergence between the policy and the Boltzmann distribution induced by the critic, exp(Q/alpha) normalized. The policy is being projected onto the exponentiated value function, which is why the entropy term is not an add-on — it falls out of the projection. And because the policy is stochastic and reparameterizable, its gradient flows pathwise through the sampled action into the critic rather than through a score-function estimator, which is the variance reduction that makes this practical.',
  },

  optimization: {
    method: 'Off-policy soft policy iteration from a replay buffer: twin critics regressed onto the soft Bellman target, a reparameterized stochastic actor minimizing KL to the exponentiated critic, and a temperature tuned against a target entropy',
    updateRule: {
      formula:
        'a = \\tanh\\bigl(\\mu_{\\theta}(s) + \\sigma_{\\theta}(s) \\odot \\varepsilon\\bigr),\\ \\varepsilon \\sim \\mathcal{N}(0, I), \\qquad J(\\alpha) = \\mathbb{E}\\bigl[-\\alpha\\bigl(\\log \\pi(a \\mid s) + \\bar{\\mathcal{H}}\\bigr)\\bigr]',
      symbols: [
        { symbol: '\\tanh(\\mu + \\sigma \\odot \\varepsilon)', meaning: 'the reparameterization: randomness moved into an input so the gradient flows pathwise through the action into the critic, rather than through a high-variance score-function estimator' },
        { symbol: '\\tanh', meaning: 'squashes to the actuator range and changes the density — the log-probability needs a Jacobian correction, and omitting it is the most common bug in this method' },
        { symbol: '\\bar{\\mathcal{H}}', meaning: 'the target entropy, conventionally minus the action dimension; the temperature is tuned to hit it rather than chosen by hand' },
        { symbol: 'J(\\alpha)', meaning: 'the temperature objective: raise alpha when the policy is more certain than the target, lower it when less, which removes the family\'s worst hyperparameter' },
      ],
    },
    rationale:
      'Each component removes something that had to be tuned before. The entropy term removes the exploration schedule: a stochastic policy that is paid for uncertainty explores as much as the return structure warrants, per state, without a decaying noise scale or an epsilon. The reparameterization removes the variance that made policy gradients painful: because the action is a deterministic function of the parameters and an independent noise draw, the gradient passes through the sampled action into the critic — a pathwise derivative rather than a score-function one, and dramatically lower variance as a result. Automatic temperature tuning removes the one knob the entropy term introduced, by making alpha a learned quantity adjusted to hit a target entropy that has a sensible default in the action dimension. And the twin critics with a minimum are inherited from TD3 unchanged, because the underlying hazard is unchanged: the actor is an optimizer pointed at a learned surface and will find its optimistic errors, so the bias direction has to be flipped. Two things that are absent are worth noticing. There is no target actor — the stochastic policy plus the entropy term smooths the target enough that TD3\'s explicit target policy smoothing is not needed, and the sampled next action plays that role. And there is no separate exploration policy at all, so the thing being trained and the thing collecting data are the same object, which removes an entire class of mismatch bugs. The one detail that must not be skipped is the tanh log-probability correction: squashing a Gaussian changes its density, and the change-of-variables term is mathematically required rather than a numerical nicety.',
    hyperparameters: [
      { name: 'target entropy', role: 'What the temperature is tuned to reach, conventionally minus the action dimension. It replaces the exploration schedule entirely and its default is good enough that it is rarely moved', typicalRange: '-dim(A)' },
      { name: 'temperature (alpha)', role: 'The return-versus-uncertainty exchange rate. Learned rather than set in the standard formulation, which is the single largest usability improvement over TD3', typicalRange: 'learned; initialized near 0.2' },
      { name: 'Polyak tau', role: 'How fast the target critics track the online ones. Only critics have targets here — the stochastic policy removes the need for a target actor', typicalRange: '0.005' },
      { name: 'replay buffer size', role: 'How much history stays available. Off-policy learning is what makes this sample-efficient, and the buffer is where that efficiency lives', typicalRange: '1e5 to 1e6 transitions' },
      { name: 'learning rate', role: 'Actor, critics and temperature, usually all equal. SAC tolerates a wider range here than TD3 does, which is part of why it is easier to get working', typicalRange: '3e-4' },
      { name: 'log-std bounds', role: 'Clamping the policy\'s log standard deviation. Without it the distribution can collapse toward a delta or diverge, and both destroy the log-probability numerically', typicalRange: 'clamped to [-20, 2]' },
      { name: 'updates per environment step', role: 'The sample-efficiency dial. More gradient steps per transition extracts more from the buffer and eventually overfits the critic to it', typicalRange: '1, up to 20 for sample-limited settings' },
      { name: 'warmup with random actions', role: 'Random actions before training starts, so the critic is fitted on something before the actor begins climbing it', typicalRange: '1,000 to 10,000 steps' },
    ],
    convergence:
      'Soft policy iteration converges to the optimal maximum-entropy policy in the tabular case, which is a real result and the reason the method has a principled name rather than a list of tricks. It does not survive function approximation, and SAC inherits the deadly triad in full like everything else in this branch. What it does deliver is markedly better empirical stability than TD3, and the reason is structural rather than incidental: the entropy term keeps the policy spread out, which keeps the buffer covering a wider region, which keeps the critic better supported exactly where the actor is looking. The characteristic failures are fewer and more diagnosable. The first is not an algorithmic failure at all but an implementation one — omitting the tanh Jacobian correction in the log-probability, which produces a systematically wrong entropy, a temperature controller chasing a quantity that is not entropy, and a run that trains badly in a way that looks like bad hyperparameters. It is the single most common bug in SAC implementations. The second is temperature collapse: if the target entropy is set too low, alpha is driven toward zero, the policy becomes effectively deterministic, and the method degenerates into a worse TD3 without target smoothing. The third is the inherited one — the actor still exploits critic errors, and the min over two critics is still doing the work of preventing it, so a single-critic variant fails here for the same reason it fails there. And critic overfitting appears when the update-to-data ratio is pushed high for sample efficiency: more gradient steps per transition extracts more signal until it starts fitting the buffer rather than the environment.',
    complexity:
      'Per gradient step: two critic forward-backward passes, two target-critic forwards, one actor forward with a reparameterized sample, one critic forward for the actor objective, and a scalar update for the temperature — roughly six network passes, similar to TD3 and rather more than an on-policy method. Per environment step: one actor forward and one sample. Memory is dominated by the replay buffer of full transitions. The reason to accept the per-update cost is sample efficiency: SAC typically reaches a given return on continuous control with several times fewer environment interactions than PPO, and the update-to-data ratio can be raised further when interactions are the scarce resource, trading compute for samples on a dial that on-policy methods do not have.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no action distribution whose entropy could be valued and no policy to project onto an exponentiated value function, because a forecaster does not act and does not influence what it observes next.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so there is no action space for a stochastic policy to emit into — and the entropy term here measures the agent\'s own indecision rather than anything surprising about the data.',
      },
      optimization: {
        fit: 'primary',
        how: 'Maximize discounted return plus policy entropy, so exploration is part of the objective rather than a schedule attached to it, with off-policy replay supplying sample efficiency and twin critics supplying pessimism.',
        where: [
          'Continuous control where sample efficiency is the binding constraint and interactions are the scarce resource',
          'Entropy in the objective rather than beside it, which turns an exploration schedule into a property of the optimum',
          'The reparameterization trick as the low-variance alternative to score-function estimation, and why it needs a continuous, differentiable sampling path',
          'The soft Bellman equation as ordinary Q-learning with the max replaced by a log-sum-exp, recovering the hard case in the zero-temperature limit',
        ],
        why: 'The strongest default in continuous control, and the most instructive entry on what happens when a heuristic is promoted into the objective. Three lessons transfer. The first is the promotion itself: exploration had been a schedule bolted onto every previous method, tuned per environment and prone to being wrong; putting it in the objective made it a property of the optimum, which is a general move worth recognizing — if you keep tuning a knob to prevent a failure, the failure may belong in the objective. The second is the reparameterization: moving randomness into an input turns a score-function estimator into a pathwise one and removes most of the variance, and it is available whenever the sampling path is continuous and differentiable, which is exactly why it works here and not for discrete actions. The third is the soft maximum: replacing a hard max with a log-sum-exp makes a value function that prefers states with options, and that preference is often what was wanted all along. Where SAC is the wrong choice is narrower than for most entries. Discrete actions have a SAC variant but the reparameterization is unavailable and the value-based family is a better fit. A setting where a deterministic, auditable controller is required at deployment can take the distribution\'s mean, but then the entropy the method optimized is not present at serving and the deployed policy must be evaluated separately. And where an enormous simulator budget exists and robustness matters more than sample efficiency, PPO remains more forgiving.',
        featurization: [
          'Apply the tanh Jacobian correction to the log-probability — squashing changes the density, and omitting the term makes the entropy and the temperature controller both wrong',
          'Clamp the policy log standard deviation, since an unbounded one collapses toward a delta or diverges and destroys the log-probability numerically',
          'Let the temperature be learned against a target entropy of minus the action dimension rather than fixing it by hand',
          'Warm up with random actions, so the critic is fitted on something before the actor starts climbing it',
        ],
        evaluation:
          'Median return over at least five seeds with the interquartile range shown, evaluated with the policy mean rather than a sample if that is what will be deployed — those are different controllers. Track policy entropy and the learned temperature alongside return: entropy falling to the target and staying there is healthy, entropy collapsing below it means the temperature controller is chasing a mis-computed quantity, which is almost always the missing tanh correction.',
        pitfalls: [
          'Omitting the tanh log-probability correction, the single most common bug in this method and one that looks like bad hyperparameters',
          'A target entropy set too low, which drives the temperature toward zero and degenerates the method into a worse TD3',
          'A single critic, which reintroduces the optimism an actor is built to seek out',
          'Evaluating the sampled policy when the mean will be deployed, or the reverse — they are different controllers with different returns',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Learn a stochastic continuous controller from simulated or logged interaction, with off-policy replay making the most of each transition and the entropy term producing policies that keep options open rather than committing to a single narrow trajectory.',
        where: [
          'Robotic manipulation and locomotion, where interactions are expensive and continuous actions are the native form',
          'Energy and thermal control — battery dispatch, HVAC, process setpoints — where a simulator exists and sample efficiency decides the project budget',
          'Sim-to-real transfer, where the entropy term produces policies that are less brittle to dynamics mismatch than a deterministic optimum',
          'Settings where the update-to-data ratio can be raised to trade compute for scarce environment interactions',
        ],
        why: 'The default choice for simulated continuous control, and the entropy term earns its place here for a reason beyond exploration. A deterministic optimum found against a simulator is fitted to that simulator exactly, including the parts of it that are wrong; a maximum-entropy policy is by construction one that performs well across a spread of actions, which makes it measurably more robust to the dynamics mismatch that decides whether sim-to-real works. That robustness is not a side effect being rationalized — it follows directly from optimizing over a distribution rather than a point. Three cautions matter. The policy is stochastic, so a production controller should almost always serve the distribution\'s mean, and the resulting deterministic policy has different performance from the one that was trained and must be evaluated in its own right. The critic remains valid only where the buffer has coverage, and the actor still seeks the most optimistic region, so the entropy term widens coverage without guaranteeing it. And a hard constraint still belongs in an interlock rather than the reward, because an optimizer paid for both return and uncertainty will explore into whatever the reward failed to forbid.',
        featurization: [
          'Scale actions to the actuator limits through the tanh and keep the Jacobian correction, since the two are the same mechanism seen from two sides',
          'Normalize observations with running statistics and checkpoint them with the weights, or a restored policy silently receives differently scaled inputs',
          'Randomize simulator dynamics during training; the entropy term helps with transfer and does not substitute for actually training across the uncertainty',
          'Serve the policy mean and evaluate that controller separately from the stochastic one that was trained',
        ],
        evaluation:
          'Simulated return against the incumbent controller on matched scenarios using the deployment-time policy, with constraint violations counted separately rather than averaged in. Report performance under perturbed dynamics explicitly — that is where the maximum-entropy formulation is expected to pay, and it is the number that predicts transfer.',
        pitfalls: [
          'Serving samples from the policy, so a production controller behaves differently on identical inputs',
          'Trusting the critic outside the region the buffer covers, where the actor actively seeks the most optimistic extrapolation',
          'A hard constraint expressed as a reward penalty, which an optimizer treats as a price rather than a limit',
          'Pushing the update-to-data ratio until the critic fits the buffer rather than the environment, which looks like sample efficiency until it stops working',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'A convolutional encoder feeds the critics and the policy for control from pixels, with the encoder trained by the critic loss alone and the target value averaged over augmented views of the same observation.',
        where: [
          'Visual manipulation and locomotion from camera input, where sample efficiency matters most and this family is the most efficient available',
          'Random-shift augmentation on observations, which turned out to be the single most effective intervention for pixel-based continuous control',
          'Averaging the target over several augmented views, which is variance reduction on the regression target and closely analogous to TD3\'s target smoothing',
          'Encoder gradient routing, where only the critic loss trains the representation and the actor\'s gradient is stopped at the boundary',
        ],
        why: 'Included for a specific and transferable detail rather than because this is a vision method — it is not, and a genuine vision task deserves a supervised model. The detail is that augmentation here is doing two different jobs and they are worth separating. Applying random shifts to the observations regularizes the encoder in the ordinary supervised sense, which is unsurprising. Averaging the critic\'s target over several augmented views of the same next state is something else: it reduces the variance of the regression target, which is the same purpose TD3\'s target policy smoothing serves in action space, applied in observation space instead. Recognizing that these are two mechanisms rather than one explains why the combination outperforms either. The general caution is unchanged from the rest of this branch. Reward is a far weaker supervisory signal than labels, the sample requirements show it, and a pretrained frozen encoder is usually the better engineering choice unless the control task genuinely needs features that only the reward can identify.',
        featurization: [
          'Stop the actor gradient at the encoder; letting it through lets the actor improve its objective by changing the representation rather than the action',
          'Apply random-shift augmentation to observations, which is the highest-return single change in pixel-based continuous control',
          'Average the critic target over several augmented views, which reduces target variance the way action-space smoothing does',
          'Store observations as uint8 and convert at sample time, because the replay buffer rather than the network is what exhausts memory',
        ],
        evaluation:
          'Return under the deployment-time policy, not any vision metric — the encoder exists to support control and its features are only as good as the decisions they enable. If representation quality is the actual question, probe the frozen encoder on a supervised task, which typically shows it encodes what the reward depended on and little else.',
        pitfalls: [
          'Letting the actor gradient reach a shared encoder, which permits a degenerate solution and destabilizes the run',
          'Treating augmentation as one mechanism when the encoder regularization and the target averaging are doing different jobs',
          'Reaching for this on an actual vision task, where a supervised model wins by orders of magnitude on accuracy and sample cost',
          'Materializing stacked frames per transition, which multiplies replay memory by the stack depth',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Roughly six network passes per gradient step, comparable to TD3 and more than an on-policy method — against several times fewer environment interactions than PPO needs for the same return on continuous control. The update-to-data ratio is a genuine dial: more gradient steps per transition buys sample efficiency with compute, up to the point where the critic starts fitting the buffer rather than the environment. Memory is dominated by the replay buffer. Seed variance is meaningfully lower than TD3\'s but still large enough that five seeds is the floor. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One actor forward producing a mean and a standard deviation, then either a sample or the tanh of the mean. Almost every deployment serves the mean, which makes the controller deterministic and reproducible — but it is then not the policy that was trained, and its return must be measured rather than assumed. The critics and the temperature are training machinery and do not ship; the observation normalization and the action scaling do, and both are part of the model.',
    retrainingCadence:
      'Offline retraining against a simulator or logged interaction, evaluation of the deployment-time policy, then a staged rollout. Continuous online learning is more defensible here than in TD3 — exploration comes from the policy rather than from noise injected into an actuator — but it still means a live system taking stochastic actions, which is usually unacceptable outside simulation. The simulator goes stale before the policy does, so revalidating it is what triggers the cycle.',
    driftAndMonitoring: [
      'Policy entropy against the target entropy — sitting at the target is healthy, falling well below it means the temperature controller is chasing a mis-computed quantity, which is nearly always a missing tanh correction',
      'The learned temperature itself: driven toward zero, the method has quietly degenerated into a deterministic actor-critic without target smoothing',
      'Predicted Q against realized discounted return, since the actor still exploits critic error and the min over two critics is what holds it back',
      'Both critic losses separately; a persistent divergence between the twins means one has drifted and the pessimism is no longer doing its job',
      'Return of the deployment-time policy — the mean, if that is what ships — measured separately from the stochastic training policy',
      'Replay coverage relative to where the policy now operates, because the entropy term widens coverage without guaranteeing it',
    ],
    productionGotchas: [
      'The tanh log-probability correction is mathematically required, not optional. Omitting it makes the reported entropy wrong, makes the temperature controller optimize the wrong quantity, and produces a run that fails in a way indistinguishable from bad hyperparameters — the single most common bug in this method',
      'A target entropy set too low drives the temperature to zero, the policy to determinism, and the method into a worse TD3 with no target smoothing to compensate',
      'The trained policy is stochastic and the deployed one is usually its mean. Those are different controllers and the deployed one has to be evaluated on its own',
      'The log standard deviation must be clamped. Unbounded, it collapses toward a delta or diverges, and the log-probability goes numerically wrong before anything visible happens',
      'A single critic fails here for exactly the reason it fails in TD3: an actor is an optimizer pointed at a learned surface and will find the optimistic errors',
      'Pushing the update-to-data ratio for sample efficiency eventually overfits the critic to the buffer rather than the environment, which presents as a run that trains well and transfers badly',
      'There is no target actor and none is needed, but implementations ported from TD3 sometimes keep one, which adds staleness without adding stability',
      'Observation normalization statistics are part of the model. A checkpoint without them restores a policy that receives differently scaled inputs and raises nothing',
    ],
  },

  assumptions: [
    'The action space is continuous and the sampling path is differentiable, which is what makes the reparameterized gradient available and what a discrete action space does not provide',
    'The policy family can represent the shape the soft optimum wants — a squashed Gaussian is unimodal, and a genuinely multi-modal optimum is approximated rather than represented',
    'The critic is differentiable in the action, inherited from the deterministic branch and unchanged',
    'The replay buffer covers the region the policy operates in; the entropy term widens that coverage without guaranteeing it',
    'The environment is a Markov decision process in the observation given to the networks',
    'Uncertainty in the policy is acceptable during training, which is true in a simulator and usually not on live hardware',
  ],

  pros: [
    {
      point: 'Exploration is part of the objective, so there is no schedule to tune',
      context:
        'A policy paid for entropy explores as much as the return structure warrants, state by state, with no epsilon and no decaying noise scale. This removes the hyperparameter that caused most of the brittleness in every previous method here',
    },
    {
      point: 'Off-policy and sample-efficient, with a dial to trade compute for samples',
      context:
        'Several times fewer environment interactions than PPO on continuous control, and the update-to-data ratio can be raised further when interactions are the scarce resource — an option on-policy methods simply do not have',
    },
    {
      point: 'The reparameterized gradient is low-variance',
      context:
        'Moving randomness into an input makes the actor gradient pathwise rather than score-function, which is the difference between a usable estimator and REINFORCE\'s. It is available precisely because the action space is continuous',
    },
    {
      point: 'The soft value function prefers states with options',
      context:
        'Replacing the max with a log-sum-exp means a state offering several good actions is worth more than one offering a single narrow path. For control that is usually the right notion of value, and it is free',
    },
    {
      point: 'Maximum-entropy policies transfer better',
      context:
        'Optimizing over a distribution rather than a point produces controllers less brittle to dynamics mismatch, which is a direct consequence of the objective rather than an observed side effect, and it is what makes sim-to-real more practical',
    },
    {
      point: 'Fewer things to get wrong than anything else in this branch',
      context:
        'No exploration schedule, no target actor, no target policy smoothing, and a temperature that tunes itself against a target entropy with a sensible default. That usability is the main reason it displaced TD3',
    },
  ],

  cons: [
    {
      point: 'The tanh log-probability correction is easy to omit and fails silently',
      context:
        'Squashing changes the density and the Jacobian term is required. Without it the entropy is wrong, the temperature controller optimizes the wrong quantity, and the run looks like a hyperparameter problem. It is the most common bug in this method',
    },
    {
      point: 'The actor still exploits the critic',
      context:
        'Inherited from the deterministic branch and unchanged. The min over twin critics is what holds it back, the entropy term helps by widening buffer coverage, and neither removes the underlying hazard',
    },
    {
      point: 'Continuous actions only, in practice',
      context:
        'The reparameterization needs a differentiable sampling path, which a discrete action space does not have. Discrete variants exist and are not the standard choice; the value-based family fits that case better',
    },
    {
      point: 'A squashed Gaussian is unimodal',
      context:
        'The soft optimum can be genuinely multi-modal — several distinct good strategies — and the policy family cannot represent that, so it approximates with a single mode and loses the alternatives',
    },
    {
      point: 'The deployed policy is usually not the trained one',
      context:
        'Serving the mean gives a deterministic controller, which is what production wants and is not the object the entropy term optimized. Its performance must be measured separately rather than inferred from training curves',
    },
    {
      point: 'Sample efficiency can be pushed until the critic overfits the buffer',
      context:
        'Raising the update-to-data ratio extracts more from each transition until it starts fitting the replay distribution rather than the environment, which presents as a run that trains well and transfers badly',
    },
  ],

  relatedSlugs: ['ddpg-td3', 'ppo-trpo', 'actor-critic', 'dqn', 'q-learning', 'model-based-rl'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""SAC - the maximum-entropy update, transcribed.

A squashed Gaussian policy with the log-probability derived by hand, because
the change-of-variables term is the part everyone gets wrong and the point of
writing it out is to see exactly where it comes from.

Reparameterization is visible too: the noise draw is an INPUT, so the action is
a deterministic function of the parameters and the gradient flows through it
into the critic. That is what makes this low-variance where REINFORCE is not.
"""

import math
import random

LOG_STD_MIN = -20.0
LOG_STD_MAX = 2.0


def make_critic(n_state, n_action, n_hidden):
    scale = 1.0 / math.sqrt(n_state + n_action)
    return {
        "w1": [[random.uniform(-scale, scale) for _ in range(n_state + n_action)]
               for _ in range(n_hidden)],
        "b1": [0.0] * n_hidden,
        "w2": [random.uniform(-scale, scale) for _ in range(n_hidden)],
        "b2": 0.0,
    }


def critic_forward(critic, joint):
    hidden = []
    for row, bias in zip(critic["w1"], critic["b1"]):
        total = bias
        for weight, feature in zip(row, joint):
            total += weight * feature
        hidden.append(total if total > 0.0 else 0.0)        # ReLU

    q = critic["b2"]
    for weight, activation in zip(critic["w2"], hidden):
        q += weight * activation
    return q, hidden


def critic_backward(critic, joint, hidden, td_error, lr, n_state):
    """Fits the critic and returns dQ/da, which the actor needs."""
    grad_q = -td_error

    grad_hidden = [0.0] * len(hidden)
    for index in range(len(hidden)):
        grad_hidden[index] = grad_q * critic["w2"][index]
        critic["w2"][index] -= lr * grad_q * hidden[index]
    critic["b2"] -= lr * grad_q

    grad_input = [0.0] * len(joint)
    for unit in range(len(hidden)):
        if hidden[unit] <= 0.0:
            continue
        delta = grad_hidden[unit]
        for index in range(len(joint)):
            grad_input[index] += delta * critic["w1"][unit][index]
            critic["w1"][unit][index] -= lr * delta * joint[index]
        critic["b1"][unit] -= lr * delta

    return grad_input[n_state:]


def sample_action(actor, state, eps):
    """a = tanh(mu + sigma * eps), with the log-probability of a, not of u.

    The Gaussian density is over the PRE-squash variable u. Pushing u through
    tanh changes the density, and the change-of-variables rule says to subtract
    the log of the absolute Jacobian determinant:

        log pi(a) = log N(u; mu, sigma) - sum_i log(1 - tanh(u_i)^2)

    That second term is not a numerical nicety. It is required, and leaving it
    out makes the reported entropy wrong, makes the temperature controller
    optimize a quantity that is not entropy, and produces a run that fails in a
    way indistinguishable from bad hyperparameters. It is the single most
    common bug in a SAC implementation.
    """
    mu, log_std, action, log_prob = [], [], [], 0.0

    for index in range(len(actor["w_mu"])):
        mean = 0.0
        for weight, feature in zip(actor["w_mu"][index], state):
            mean += weight * feature

        raw_log_std = 0.0
        for weight, feature in zip(actor["w_log_std"][index], state):
            raw_log_std += weight * feature
        # Clamped: unbounded, the distribution collapses toward a delta or
        # diverges, and the log-probability goes wrong before anything visible
        # happens.
        raw_log_std = max(LOG_STD_MIN, min(LOG_STD_MAX, raw_log_std))

        sigma = math.exp(raw_log_std)
        pre_squash = mean + sigma * eps[index]
        squashed = math.tanh(pre_squash)

        # Gaussian part. With u = mu + sigma * eps the standardized residual is
        # exactly eps, so this reduces to a constant plus -log sigma.
        log_prob += -0.5 * eps[index] * eps[index] - raw_log_std - 0.5 * math.log(2.0 * math.pi)
        # Change-of-variables correction. 1 - tanh(u)^2 = 1 - a^2.
        log_prob -= math.log(1.0 - squashed * squashed + 1e-6)

        mu.append(mean)
        log_std.append(raw_log_std)
        action.append(squashed)

    return action, log_prob, mu, log_std


def actor_backward(actor, state, action, mu, log_std, eps, dq_daction, alpha, lr):
    """Pathwise gradient of Q(s, a) - alpha * log pi(a | s).

    Every derivative below is through the SAMPLE, because eps is fixed:

        da/dmu       = 1 - a^2
        da/dlog_std  = (1 - a^2) * sigma * eps
        dlogpi/du    = 2a            (from the correction term alone)
        dlogpi/dlog_std has an extra -1 from the -log sigma in the Gaussian

    ASCENT: the objective is being maximized.
    """
    for index in range(len(mu)):
        squashed = action[index]
        sigma = math.exp(log_std[index])
        local = 1.0 - squashed * squashed                   # da/du

        # d/dmu of [Q - alpha * log pi]
        grad_mu = dq_daction[index] * local - alpha * 2.0 * squashed
        # d/dlog_std of the same, chaining du/dlog_std = sigma * eps
        grad_log_std = (
            dq_daction[index] * local * sigma * eps[index]
            - alpha * (-1.0 + 2.0 * squashed * sigma * eps[index])
        )

        for feature_index, feature in enumerate(state):
            actor["w_mu"][index][feature_index] += lr * grad_mu * feature
            actor["w_log_std"][index][feature_index] += lr * grad_log_std * feature


def temperature_step(log_alpha, log_prob, target_entropy, lr):
    """Tune alpha to hit a target entropy instead of choosing it by hand.

    J(alpha) = -alpha * (log pi + target_entropy), so the gradient with respect
    to log_alpha is -alpha * (log pi + target_entropy). When the policy is more
    certain than the target, log pi is above -target_entropy and alpha rises,
    paying more for uncertainty. This removes the family's worst hyperparameter.
    """
    alpha = math.exp(log_alpha)
    gradient = -alpha * (log_prob + target_entropy)
    return log_alpha - lr * gradient


def train(env, n_state, n_action, steps=100_000, n_hidden=64, lr=3e-4, gamma=0.99,
          tau=0.005, buffer_size=50_000, warmup=1_000):
    scale = 1.0 / math.sqrt(n_state)
    actor = {
        "w_mu": [[random.uniform(-scale, scale) for _ in range(n_state)]
                 for _ in range(n_action)],
        "w_log_std": [[0.0] * n_state for _ in range(n_action)],
    }
    critic_a = make_critic(n_state, n_action, n_hidden)
    critic_b = make_critic(n_state, n_action, n_hidden)
    target_a = {k: ([r[:] for r in v] if isinstance(v, list) and v and isinstance(v[0], list)
                    else (v[:] if isinstance(v, list) else v)) for k, v in critic_a.items()}
    target_b = {k: ([r[:] for r in v] if isinstance(v, list) and v and isinstance(v[0], list)
                    else (v[:] if isinstance(v, list) else v)) for k, v in critic_b.items()}

    # Conventional default: minus the action dimension. There is no target
    # ACTOR anywhere in this method - a stochastic policy plus the entropy term
    # smooths the target, so only the critics need slow copies.
    target_entropy = -float(n_action)
    log_alpha = math.log(0.2)

    buffer = []
    state = env.reset()

    for step in range(steps):
        if step < warmup:
            action = [random.uniform(-1.0, 1.0) for _ in range(n_action)]
        else:
            eps = [random.gauss(0.0, 1.0) for _ in range(n_action)]
            action, _, _, _ = sample_action(actor, state, eps)

        next_state, reward, done = env.step(action)
        buffer.append((state, action, reward, next_state, done))
        if len(buffer) > buffer_size:
            buffer.pop(0)

        state = env.reset() if done else next_state
        if len(buffer) < warmup:
            continue

        s, a, r, s_next, terminal = random.choice(buffer)
        alpha = math.exp(log_alpha)

        # Soft target: the min of two critics MINUS the entropy term. The
        # entropy sits inside the value being estimated, not beside the loss.
        if terminal:
            bootstrap = 0.0
        else:
            eps_next = [random.gauss(0.0, 1.0) for _ in range(n_action)]
            next_action, next_log_prob, _, _ = sample_action(actor, s_next, eps_next)
            joint_next = list(s_next) + list(next_action)
            q_next = min(critic_forward(target_a, joint_next)[0],
                         critic_forward(target_b, joint_next)[0])
            bootstrap = q_next - alpha * next_log_prob

        joint = list(s) + list(a)
        for critic in (critic_a, critic_b):
            q, hidden = critic_forward(critic, joint)
            critic_backward(critic, joint, hidden, r + gamma * bootstrap - q, lr, n_state)

        # Actor: maximize Q - alpha * log pi at its own current sample.
        eps_now = [random.gauss(0.0, 1.0) for _ in range(n_action)]
        current, log_prob, mu, log_std = sample_action(actor, s, eps_now)
        joint_now = list(s) + list(current)
        _, hidden_now = critic_forward(critic_a, joint_now)
        dq = critic_backward(critic_a, joint_now, hidden_now, 0.0, 0.0, n_state)
        actor_backward(actor, s, current, mu, log_std, eps_now, dq, alpha, lr)

        log_alpha = temperature_step(log_alpha, log_prob, target_entropy, lr)

        for online, target in ((critic_a, target_a), (critic_b, target_b)):
            for index in range(len(online["w2"])):
                target["w2"][index] = tau * online["w2"][index] + (1 - tau) * target["w2"][index]
                target["b1"][index] = tau * online["b1"][index] + (1 - tau) * target["b1"][index]
                for i in range(len(online["w1"][index])):
                    target["w1"][index][i] = (
                        tau * online["w1"][index][i] + (1 - tau) * target["w1"][index][i]
                    )
            target["b2"] = tau * online["b2"] + (1 - tau) * target["b2"]

    return actor, critic_a, critic_b`,
        profile: 'Six scalar network passes per transition, all in the interpreter. The log-probability and its derivatives are computed per action dimension in a loop.',
      },
      'make-it-right': {
        code: `"""SAC - typed, numerically stable log-probability, learned temperature."""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import numpy as np
import torch
from torch import Tensor, nn

LOG_STD_BOUNDS = (-20.0, 2.0)


class Batch(NamedTuple):
    states: Tensor
    actions: Tensor
    rewards: Tensor
    next_states: Tensor
    # Terminal, not done: a time-limit truncation still has a future and must
    # still be bootstrapped.
    terminals: Tensor


@dataclass(frozen=True)
class SacConfig:
    n_state: int
    n_action: int
    action_limit: float = 1.0
    hidden: tuple[int, ...] = (256, 256)
    learning_rate: float = 3e-4
    gamma: float = 0.99
    tau: float = 0.005
    # Conventional default. The temperature is tuned to hit this rather than
    # chosen by hand, which is the largest usability win over TD3.
    target_entropy: float | None = None
    initial_alpha: float = 0.2

    def __post_init__(self) -> None:
        if self.action_limit <= 0.0:
            raise ValueError("action limit must be positive")
        if not 0.0 < self.tau <= 1.0:
            raise ValueError(f"tau must be in (0, 1], got {self.tau}")
        if self.initial_alpha <= 0.0:
            raise ValueError("temperature must be positive; it is optimized in log space")

    @property
    def entropy_target(self) -> float:
        return -float(self.n_action) if self.target_entropy is None else self.target_entropy


class SquashedGaussianActor(nn.Module):
    """Stochastic, reparameterized, and bounded by a tanh.

    The tanh does two jobs at once: it keeps the action inside the actuator
    range, and it makes the density non-Gaussian. Those are the same fact seen
    from two sides, and the log-probability has to account for the second.
    """

    def __init__(self, config: SacConfig) -> None:
        super().__init__()
        layers: list[nn.Module] = []
        width = config.n_state
        for size in config.hidden:
            layers += [nn.Linear(width, size), nn.ReLU()]
            width = size
        self.trunk = nn.Sequential(*layers)
        self.mean_head = nn.Linear(width, config.n_action)
        self.log_std_head = nn.Linear(width, config.n_action)
        self.action_limit = config.action_limit

    def forward(self, states: Tensor) -> tuple[Tensor, Tensor]:
        features = self.trunk(states)
        mean = self.mean_head(features)
        # Clamped rather than left free: an unbounded log-std collapses toward
        # a delta or diverges, and the log-probability goes numerically wrong
        # before anything visible happens to the return.
        log_std = self.log_std_head(features).clamp(*LOG_STD_BOUNDS)
        return mean, log_std

    def sample(self, states: Tensor) -> tuple[Tensor, Tensor]:
        mean, log_std = self(states)
        std = log_std.exp()

        # rsample, not sample: the reparameterized draw keeps the gradient path
        # through the action into the critic. Calling sample() here silently
        # detaches it and the actor never learns.
        normal = torch.distributions.Normal(mean, std)
        pre_squash = normal.rsample()
        action = torch.tanh(pre_squash)

        # log pi(a) = log N(u) - sum_i log(1 - tanh(u_i)^2), the
        # change-of-variables term for the squash.
        #
        # Written via softplus rather than as log(1 - a^2): the direct form
        # loses all precision as the action saturates toward the bound, which
        # is exactly where a trained policy spends its time. The identity
        # log(1 - tanh(u)^2) = 2 * (log 2 - u - softplus(-2u)) is exact and
        # stable across the whole range.
        log_prob = normal.log_prob(pre_squash).sum(-1)
        log_prob -= (
            2.0 * (np.log(2.0) - pre_squash - nn.functional.softplus(-2.0 * pre_squash))
        ).sum(-1)

        return self.action_limit * action, log_prob


class TwinCritic(nn.Module):
    """Two independently initialized critics; the min is taken in the target.

    Inherited from TD3 unchanged, because the hazard is unchanged: the actor is
    an optimizer pointed at a learned surface and will find its optimistic
    errors. The entropy term widens buffer coverage; it does not remove this.
    """

    def __init__(self, config: SacConfig) -> None:
        super().__init__()
        self.q1 = self._build(config)
        self.q2 = self._build(config)

    @staticmethod
    def _build(config: SacConfig) -> nn.Module:
        layers: list[nn.Module] = []
        width = config.n_state + config.n_action
        for size in config.hidden:
            layers += [nn.Linear(width, size), nn.ReLU()]
            width = size
        layers.append(nn.Linear(width, 1))
        return nn.Sequential(*layers)

    def forward(self, states: Tensor, actions: Tensor) -> tuple[Tensor, Tensor]:
        joint = torch.cat([states, actions], dim=1)
        return self.q1(joint).squeeze(-1), self.q2(joint).squeeze(-1)


@torch.no_grad()
def soft_target(
    actor: SquashedGaussianActor, target_critic: TwinCritic,
    batch: Batch, alpha: Tensor, gamma: float,
) -> Tensor:
    """r + gamma * (min Q' - alpha * log pi).

    The entropy term is inside the value being estimated, not beside the loss.
    That is the whole difference from TD3, and it is why there is no target
    actor here: the sampled next action plus the entropy bonus already smooths
    the target that TD3 had to smooth explicitly.
    """
    next_actions, next_log_probs = actor.sample(batch.next_states)
    q1, q2 = target_critic(batch.next_states, next_actions)
    soft_value = torch.min(q1, q2) - alpha * next_log_probs
    return batch.rewards + gamma * soft_value.masked_fill(batch.terminals, 0.0)


def update(
    actor: SquashedGaussianActor, critic: TwinCritic, target_critic: TwinCritic,
    log_alpha: Tensor, optimizers: dict[str, torch.optim.Optimizer],
    batch: Batch, config: SacConfig,
) -> dict[str, float]:
    alpha = log_alpha.exp().detach()

    target = soft_target(actor, target_critic, batch, alpha, config.gamma)
    q1, q2 = critic(batch.states, batch.actions)
    critic_loss = nn.functional.mse_loss(q1, target) + nn.functional.mse_loss(q2, target)

    optimizers["critic"].zero_grad(set_to_none=True)
    critic_loss.backward()
    optimizers["critic"].step()

    sampled, log_probs = actor.sample(batch.states)
    q1_pi, q2_pi = critic(batch.states, sampled)
    actor_loss = (alpha * log_probs - torch.min(q1_pi, q2_pi)).mean()

    optimizers["actor"].zero_grad(set_to_none=True)
    actor_loss.backward()
    optimizers["actor"].step()

    # Temperature. log_probs is detached because alpha is being tuned against a
    # measurement of the policy's entropy, not jointly optimized with it.
    alpha_loss = -(log_alpha.exp() * (log_probs.detach() + config.entropy_target)).mean()
    optimizers["alpha"].zero_grad(set_to_none=True)
    alpha_loss.backward()
    optimizers["alpha"].step()

    with torch.no_grad():
        for online, target_parameter in zip(critic.parameters(), target_critic.parameters()):
            target_parameter.mul_(1 - config.tau).add_(online, alpha=config.tau)

    return {
        "critic_loss": float(critic_loss),
        "actor_loss": float(actor_loss),
        "alpha": float(alpha),
        # Entropy is the diagnostic that matters. Sitting at the target is
        # healthy; well below it means the correction term is wrong.
        "entropy": float(-log_probs.mean()),
    }`,
        rationale:
          'The hand-derived log-probability becomes the numerically stable softplus identity, because the direct log(1 − a²) form loses all precision exactly where a trained policy spends its time — near the action bound. The reparameterized draw is made explicit with rsample, since the ordinary sample silently detaches the gradient and the actor never learns. The temperature becomes a learned parameter optimized in log space against a target entropy, terminal is separated from truncation, and the entropy is surfaced as the diagnostic that says whether the correction term is right.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'Six network passes per update; the log-probability correction is two elementwise ops instead of a per-dimension loop.',
      },
      'make-it-fast': {
        code: `"""SAC - fused twin critics, fused sample-and-log-prob, foreach Polyak.

The algorithm is unchanged. What changes is how much redundant work a direct
implementation does per step, which at a million steps is most of the run.
"""

from __future__ import annotations

import math

import torch
from torch import Tensor, nn

LOG_TWO = math.log(2.0)


class FusedTwinCritic(nn.Module):
    """Both critics as one batched matrix multiply.

    Two separate networks mean two GEMMs per layer, each half the size and each
    too small to saturate anything. A leading pair dimension turns every layer
    into one baddbmm - identical arithmetic, half the kernel launches - and the
    two parameter sets stay genuinely independent, which is what the min needs.
    """

    def __init__(self, n_input: int, hidden: int) -> None:
        super().__init__()
        self.w1 = nn.Parameter(torch.empty(2, n_input, hidden))
        self.b1 = nn.Parameter(torch.zeros(2, 1, hidden))
        self.w2 = nn.Parameter(torch.empty(2, hidden, 1))
        self.b2 = nn.Parameter(torch.zeros(2, 1, 1))
        for tensor in (self.w1, self.w2):
            nn.init.orthogonal_(tensor, gain=1.0)

    def forward(self, states: Tensor, actions: Tensor) -> Tensor:
        joint = torch.cat([states, actions], dim=1)
        # expand is a stride trick: (2, batch, n_input) with no copy.
        batched = joint.unsqueeze(0).expand(2, -1, -1)
        hidden = torch.baddbmm(self.b1, batched, self.w1).relu_()   # ReLU in place
        return torch.baddbmm(self.b2, hidden, self.w2).squeeze(-1)  # (2, batch)


def sample_with_log_prob(
    mean: Tensor, log_std: Tensor, action_limit: float
) -> tuple[Tensor, Tensor]:
    """Action and its log-probability in ONE pass, no distribution object.

    A Normal object builds several tensors and recomputes the standard
    deviation and the normalizing constant on every call; all of it is three
    elementwise expressions over tensors already in hand.

    The squash correction uses the softplus identity

        log(1 - tanh(u)^2) = 2 * (log 2 - u - softplus(-2u))

    which is exact, and stable where the direct log(1 - a^2) form loses all
    precision - near the action bound, which is where a trained policy lives.
    The pre-squash value is reused for both the Gaussian term and the
    correction, so nothing is recomputed and no intermediate is materialized.
    """
    std = log_std.exp()
    noise = torch.randn_like(mean)
    pre_squash = mean + std * noise          # the reparameterization, written out

    # Gaussian log-density at the reparameterized sample. The standardized
    # residual is exactly \`noise\`, so no subtraction or division is needed.
    gaussian = -0.5 * noise.pow(2) - log_std - 0.5 * math.log(2.0 * math.pi)
    correction = 2.0 * (LOG_TWO - pre_squash - nn.functional.softplus(-2.0 * pre_squash))

    log_prob = (gaussian - correction).sum(-1)
    return action_limit * torch.tanh(pre_squash), log_prob


class ContiguousReplay:
    """One flat allocation per field; a batch is one fancy-index per field.

    A list of per-transition tuples allocates twice per environment step and
    scatters every sample, which at a million steps is the largest avoidable
    cost in the loop.
    """

    def __init__(self, capacity: int, n_state: int, n_action: int, device: torch.device) -> None:
        # Single dtype throughout, so a sampled batch needs no conversion.
        self.states = torch.zeros((capacity, n_state), dtype=torch.float32, device=device)
        self.next_states = torch.zeros((capacity, n_state), dtype=torch.float32, device=device)
        self.actions = torch.zeros((capacity, n_action), dtype=torch.float32, device=device)
        self.rewards = torch.zeros(capacity, dtype=torch.float32, device=device)
        self.terminals = torch.zeros(capacity, dtype=torch.bool, device=device)
        self.capacity = capacity
        self.cursor = 0
        self.size = 0

    def add(self, state: Tensor, action: Tensor, reward: float,
            next_state: Tensor, terminal: bool) -> None:
        index = self.cursor
        # copy_ writes into storage that already exists; assignment would not.
        self.states[index].copy_(state)
        self.actions[index].copy_(action)
        self.next_states[index].copy_(next_state)
        self.rewards[index] = reward
        self.terminals[index] = terminal
        self.cursor = (self.cursor + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size: int, generator: torch.Generator):
        index = torch.randint(0, self.size, (batch_size,), generator=generator,
                              device=self.states.device)
        return (self.states[index], self.actions[index], self.rewards[index],
                self.next_states[index], self.terminals[index])


@torch.no_grad()
def polyak_foreach(target_params: list[Tensor], online_params: list[Tensor], tau: float) -> None:
    """Soft-update every parameter tensor in two fused calls.

    Only the CRITICS have targets in SAC - there is no target actor - but this
    still runs on every single step, so a Python loop with mul_ and add_ per
    tensor is hundreds of tiny kernel launches per update.
    """
    torch._foreach_mul_(target_params, 1.0 - tau)
    torch._foreach_add_(target_params, online_params, alpha=tau)


@torch.no_grad()
def soft_target_fused(
    actor: nn.Module, target_critic: FusedTwinCritic,
    next_states: Tensor, rewards: Tensor, terminals: Tensor,
    alpha: Tensor, gamma: float, action_limit: float,
) -> Tensor:
    """The min across the pair axis is a reduction, not a comparison.

    Because both critics live in one tensor, the pessimistic value comes out of
    a single reduction over dimension 0 - no second forward pass, and no
    intermediate pair of result tensors to materialize.
    """
    mean, log_std = actor(next_states)
    next_actions, next_log_probs = sample_with_log_prob(mean, log_std, action_limit)

    pair = target_critic(next_states, next_actions)          # (2, batch)
    soft_value = pair.min(dim=0).values - alpha * next_log_probs
    return rewards + gamma * soft_value.masked_fill(terminals, 0.0)`,
        rationale:
          'Three removals, none touching the algorithm. The twin critics become one weight tensor with a leading pair dimension, so every layer is a single batched matmul and the min is a reduction rather than a comparison between separate results. Sampling and the log-probability collapse into one pass over tensors already in hand — no distribution object, and the pre-squash value reused for both the Gaussian term and the softplus correction. And the Polyak update, which runs every step even though only the critics have targets here, becomes two fused foreach calls instead of hundreds of per-tensor launches.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Sampling, the Gaussian log-density and the squash correction share one pass over the same pre-squash tensor, replacing a distribution object that rebuilds the standard deviation and normalizer on every call.',
            tradeoff: 'The distribution object is gone, so anything wanting its other methods — entropy in closed form, a KL against another policy — has to be written out by hand.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'A leading pair dimension turns two half-sized GEMMs per critic layer into one batched matmul, and makes the pessimistic min a reduction over that axis.',
            tradeoff: 'The two critics share a module and an optimizer, so a per-critic learning rate or a staggered reset no longer has a natural place to hook in.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'The Polyak update touches every critic parameter on every step; batching it into two foreach calls replaces hundreds of per-tensor launches with two.',
            tradeoff: 'It requires the parameter lists to stay in matching order, which a model refactor can break silently — mismatched ordering soft-updates the wrong tensors with no error.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Every replay field is one flat float32 allocation, so a sampled batch is one contiguous fancy-index per field with no dtype conversion on the path.',
            tradeoff: 'Capacity is fixed at construction and the whole buffer is allocated up front, whether or not training ever fills it.',
          },
        ],
        libraryName: 'PyTorch',
        profile: 'One batched matmul per critic layer instead of two; sampling and log-probability in one pass. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// SAC - the maximum-entropy update, transcribed.
//
// A squashed Gaussian policy with the log-probability derived by hand, because
// the change-of-variables term is the part everyone gets wrong and the point of
// writing it out is to see exactly where it comes from.
//
// Reparameterization is visible too: the noise draw is an INPUT, so the action
// is a deterministic function of the parameters and the gradient flows through
// it into the critic. That is what makes this low-variance where a
// score-function estimator is not.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

constexpr double kLogStdMin = -20.0;
constexpr double kLogStdMax = 2.0;

struct Actor {
  std::vector<std::vector<double>> w_mu;       // [action][state]
  std::vector<std::vector<double>> w_log_std;  // [action][state]
};

struct Critic {
  std::vector<std::vector<double>> w1;         // [hidden][state + action]
  std::vector<double> b1;
  std::vector<double> w2;
  double b2;
};

struct SampledAction {
  std::vector<double> action;
  std::vector<double> mu;
  std::vector<double> log_std;
  double log_prob;
};

double CriticForward(const Critic& critic, const std::vector<double>& joint,
                     std::vector<double>& hidden) {
  hidden.assign(critic.b1.size(), 0.0);
  for (std::size_t unit = 0; unit < critic.w1.size(); ++unit) {
    double total = critic.b1[unit];
    for (std::size_t i = 0; i < joint.size(); ++i) total += critic.w1[unit][i] * joint[i];
    hidden[unit] = total > 0.0 ? total : 0.0;               // ReLU
  }

  double q = critic.b2;
  for (std::size_t unit = 0; unit < hidden.size(); ++unit) q += critic.w2[unit] * hidden[unit];
  return q;
}

// Fits the critic and hands back dQ/da, which the actor needs.
std::vector<double> CriticBackward(Critic& critic, const std::vector<double>& joint,
                                   const std::vector<double>& hidden, double td_error,
                                   double lr, std::size_t n_state) {
  const double grad_q = -td_error;

  std::vector<double> grad_hidden(hidden.size(), 0.0);
  for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
    grad_hidden[unit] = grad_q * critic.w2[unit];
    critic.w2[unit] -= lr * grad_q * hidden[unit];
  }
  critic.b2 -= lr * grad_q;

  std::vector<double> grad_input(joint.size(), 0.0);
  for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
    if (hidden[unit] <= 0.0) continue;
    const double delta = grad_hidden[unit];
    for (std::size_t i = 0; i < joint.size(); ++i) {
      grad_input[i] += delta * critic.w1[unit][i];
      critic.w1[unit][i] -= lr * delta * joint[i];
    }
    critic.b1[unit] -= lr * delta;
  }

  return std::vector<double>(grad_input.begin() + static_cast<std::ptrdiff_t>(n_state),
                             grad_input.end());
}

// a = tanh(mu + sigma * eps), with the log-probability of a, not of u.
//
// The Gaussian density is over the PRE-squash variable. Pushing it through tanh
// changes the density, and the change-of-variables rule says to subtract the log
// of the absolute Jacobian determinant:
//
//     log pi(a) = log N(u; mu, sigma) - sum_i log(1 - tanh(u_i)^2)
//
// That second term is required, not a numerical nicety. Leaving it out makes the
// reported entropy wrong, makes the temperature controller optimize something
// that is not entropy, and produces a run that fails in a way indistinguishable
// from bad hyperparameters. It is the single most common bug in SAC.
SampledAction SampleAction(const Actor& actor, const std::vector<double>& state,
                           const std::vector<double>& eps) {
  SampledAction out;
  out.log_prob = 0.0;

  for (std::size_t index = 0; index < actor.w_mu.size(); ++index) {
    double mean = 0.0;
    for (std::size_t i = 0; i < state.size(); ++i) mean += actor.w_mu[index][i] * state[i];

    double raw_log_std = 0.0;
    for (std::size_t i = 0; i < state.size(); ++i) {
      raw_log_std += actor.w_log_std[index][i] * state[i];
    }
    // Clamped: unbounded, the distribution collapses toward a delta or
    // diverges, and the log-probability goes wrong before anything visible
    // happens to the return.
    raw_log_std = std::max(kLogStdMin, std::min(kLogStdMax, raw_log_std));

    const double sigma = std::exp(raw_log_std);
    const double pre_squash = mean + sigma * eps[index];
    const double squashed = std::tanh(pre_squash);

    // Gaussian part. With u = mu + sigma * eps the standardized residual is
    // exactly eps, so this reduces to a constant plus -log sigma.
    out.log_prob += -0.5 * eps[index] * eps[index] - raw_log_std -
                    0.5 * std::log(2.0 * M_PI);
    // Change-of-variables correction. 1 - tanh(u)^2 = 1 - a^2.
    out.log_prob -= std::log(1.0 - squashed * squashed + 1e-6);

    out.mu.push_back(mean);
    out.log_std.push_back(raw_log_std);
    out.action.push_back(squashed);
  }

  return out;
}

// Pathwise gradient of Q(s, a) - alpha * log pi(a | s).
//
// Every derivative is through the SAMPLE, because eps is fixed:
//
//     da/dmu      = 1 - a^2
//     da/dlog_std = (1 - a^2) * sigma * eps
//     dlogpi/du   = 2a           (from the correction term alone)
//     dlogpi/dlog_std carries an extra -1 from the -log sigma
//
// ASCENT: the objective is being maximized.
void ActorBackward(Actor& actor, const std::vector<double>& state, const SampledAction& sample,
                   const std::vector<double>& eps, const std::vector<double>& dq_daction,
                   double alpha, double lr) {
  for (std::size_t index = 0; index < sample.mu.size(); ++index) {
    const double squashed = sample.action[index];
    const double sigma = std::exp(sample.log_std[index]);
    const double local = 1.0 - squashed * squashed;         // da/du

    const double grad_mu = dq_daction[index] * local - alpha * 2.0 * squashed;
    const double grad_log_std =
        dq_daction[index] * local * sigma * eps[index] -
        alpha * (-1.0 + 2.0 * squashed * sigma * eps[index]);

    for (std::size_t i = 0; i < state.size(); ++i) {
      actor.w_mu[index][i] += lr * grad_mu * state[i];
      actor.w_log_std[index][i] += lr * grad_log_std * state[i];
    }
  }
}

// Tune alpha to hit a target entropy instead of choosing it by hand.
//
// J(alpha) = -alpha * (log pi + target_entropy), so the gradient with respect to
// log_alpha is -alpha * (log pi + target_entropy). When the policy is more
// certain than the target, alpha rises and uncertainty is paid for more. This
// removes the family's worst hyperparameter.
double TemperatureStep(double log_alpha, double log_prob, double target_entropy, double lr) {
  const double alpha = std::exp(log_alpha);
  const double gradient = -alpha * (log_prob + target_entropy);
  return log_alpha - lr * gradient;
}`,
        profile: 'Six scalar network passes per transition. The log-probability and its derivatives are computed per action dimension in a loop.',
      },
      'make-it-right': {
        code: `// SAC - owned replay, numerically stable log-probability, learned temperature.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

// Newtypes so a temperature and a Polyak coefficient cannot be transposed -
// both are small positive floats and swapping them trains badly rather than
// failing.
struct Temperature {
  float value;
};

struct PolyakTau {
  float value;
};

// Terminal has no future. A time-limit truncation does, and must still be
// bootstrapped. A single done flag conflates them.
enum class EpisodeEnd : std::uint8_t { kRunning, kTerminal, kTruncated };

struct SacConfig {
  float gamma = 0.99F;
  PolyakTau tau{0.005F};
  float learning_rate = 3e-4F;
  // Conventional default: minus the action dimension. The temperature is tuned
  // to hit this rather than chosen by hand, which is the largest usability win
  // over the deterministic branch.
  float target_entropy = 0.0F;
  float action_limit = 1.0F;
};

void ValidateConfig(const SacConfig& config) {
  if (config.action_limit <= 0.0F) throw std::invalid_argument("action limit must be positive");
  if (config.tau.value <= 0.0F || config.tau.value > 1.0F) {
    throw std::invalid_argument("tau must be in (0, 1]");
  }
  if (config.gamma < 0.0F || config.gamma >= 1.0F) {
    throw std::invalid_argument("gamma must be in [0, 1)");
  }
}

// log(1 - tanh(u)^2), computed stably.
//
// The direct form loses all precision as the action saturates toward the bound,
// which is exactly where a trained policy spends its time. The identity
//
//     log(1 - tanh(u)^2) = 2 * (log 2 - u - softplus(-2u))
//
// is exact and stable across the whole range. This single function is the
// difference between a SAC that trains and one that reports a plausible but
// wrong entropy.
[[nodiscard]] float SquashCorrection(float pre_squash) noexcept {
  const float softplus = std::log1p(std::exp(-2.0F * std::fabs(pre_squash))) +
                         std::max(0.0F, -2.0F * pre_squash);
  return 2.0F * (static_cast<float>(M_LN2) - pre_squash - softplus);
}

// Log-probability of the SQUASHED action, summed over dimensions.
[[nodiscard]] float SquashedLogProb(std::span<const float> noise,
                                    std::span<const float> log_std,
                                    std::span<const float> pre_squash) noexcept {
  float total = 0.0F;
  for (std::size_t i = 0; i < noise.size(); ++i) {
    // With u = mu + sigma * eps the standardized residual is exactly eps, so
    // the Gaussian term needs no subtraction or division.
    total += -0.5F * noise[i] * noise[i] - log_std[i] -
             0.5F * std::log(2.0F * static_cast<float>(M_PI));
    total -= SquashCorrection(pre_squash[i]);
  }
  return total;
}

// A fixed-capacity ring over flat storage, one allocation per field. The naive
// version pushes a struct holding three vectors per step and erases from the
// front when full, which allocates repeatedly and is quadratic on eviction.
class ReplayBuffer {
 public:
  ReplayBuffer(std::size_t capacity, std::size_t n_state, std::size_t n_action)
      : capacity_(capacity),
        n_state_(n_state),
        n_action_(n_action),
        states_(capacity * n_state, 0.0F),
        next_states_(capacity * n_state, 0.0F),
        actions_(capacity * n_action, 0.0F),
        rewards_(capacity, 0.0F),
        ends_(capacity, EpisodeEnd::kRunning) {
    if (capacity == 0 || n_state == 0 || n_action == 0) {
      throw std::invalid_argument("capacity, state width and action width must be positive");
    }
  }

  void Add(std::span<const float> state, std::span<const float> action, float reward,
           std::span<const float> next_state, EpisodeEnd end) {
    if (state.size() != n_state_ || action.size() != n_action_) {
      throw std::invalid_argument("state or action width does not match the buffer");
    }
    std::copy(state.begin(), state.end(), states_.begin() + cursor_ * n_state_);
    std::copy(next_state.begin(), next_state.end(), next_states_.begin() + cursor_ * n_state_);
    std::copy(action.begin(), action.end(), actions_.begin() + cursor_ * n_action_);
    rewards_[cursor_] = reward;
    ends_[cursor_] = end;

    cursor_ = (cursor_ + 1) % capacity_;
    size_ = std::min(size_ + 1, capacity_);
  }

  [[nodiscard]] std::size_t size() const noexcept { return size_; }

 private:
  std::size_t capacity_;
  std::size_t n_state_;
  std::size_t n_action_;
  std::vector<float> states_;
  std::vector<float> next_states_;
  std::vector<float> actions_;
  std::vector<float> rewards_;
  std::vector<EpisodeEnd> ends_;
  std::size_t cursor_ = 0;
  std::size_t size_ = 0;
};

// The soft target: minimum of two critics MINUS the entropy term.
//
// The entropy sits inside the value being estimated, not beside the loss - that
// is the whole difference from the deterministic branch, and it is why there is
// no target ACTOR here. A stochastic policy plus the entropy bonus already
// smooths the target that TD3 had to smooth explicitly.
[[nodiscard]] float SoftTarget(float reward, float q1_next, float q2_next, float next_log_prob,
                               Temperature alpha, EpisodeEnd end, float gamma) noexcept {
  if (end == EpisodeEnd::kTerminal) return reward;
  const float soft_value = std::min(q1_next, q2_next) - alpha.value * next_log_prob;
  return reward + gamma * soft_value;
}

// Polyak over a flat parameter view. Only the CRITICS have targets in SAC.
void SoftUpdate(std::span<float> target, std::span<const float> online, PolyakTau tau) noexcept {
  for (std::size_t i = 0; i < target.size(); ++i) {
    target[i] = tau.value * online[i] + (1.0F - tau.value) * target[i];
  }
}`,
        rationale:
          'The hand-written log(1 − a²) becomes the softplus identity, because the direct form loses all precision exactly where a trained policy spends its time — saturated near the action bound — and that single function decides whether the entropy being reported is real. The buffer becomes one flat allocation per field with a ring cursor, replacing a vector of structs that reallocated per step and was quadratic on eviction. The done flag becomes a three-state enum, the temperature and Polyak coefficient become distinct types, and construction validates rather than failing downstream.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per buffer field; the squash correction is two transcendentals per dimension instead of a log of a near-zero quantity.',
      },
      'make-it-fast': {
        code: `// SAC - fused twin critics, fused sample-and-log-prob, flat Polyak.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

// Both critics as ONE matrix multiply.
//
// Two separate networks mean two GEMMs per layer, each half the size and too
// small to saturate anything. Stacking the two weight sets side by side turns
// every layer into a single wider product - identical arithmetic, one kernel
// instead of two - and the halves stay independent, which the min requires.
class FusedTwinCritic {
 public:
  FusedTwinCritic(std::size_t n_input, std::size_t hidden)
      : w1_(static_cast<Eigen::Index>(hidden * 2), static_cast<Eigen::Index>(n_input)),
        b1_(static_cast<Eigen::Index>(hidden * 2)),
        w2_(2, static_cast<Eigen::Index>(hidden)),
        b2_(2),
        hidden_(static_cast<Eigen::Index>(hidden)) {}

  [[nodiscard]] Eigen::Matrix<float, 2, Eigen::Dynamic> Forward(
      const Eigen::MatrixXf& joint) const {
    // cwiseMax stays inside the expression template, so the ReLU is applied as
    // the product is consumed and no intermediate hidden matrix is written out.
    const Eigen::MatrixXf hidden = ((w1_ * joint).colwise() + b1_).cwiseMax(0.0F);

    Eigen::Matrix<float, 2, Eigen::Dynamic> out(2, joint.cols());
    out.row(0) = w2_.row(0) * hidden.topRows(hidden_);
    out.row(1) = w2_.row(1) * hidden.bottomRows(hidden_);
    out.row(0).array() += b2_(0);
    out.row(1).array() += b2_(1);
    return out;
  }

 private:
  Eigen::MatrixXf w1_;
  Eigen::VectorXf b1_;
  Eigen::Matrix<float, 2, Eigen::Dynamic> w2_;
  Eigen::Vector2f b2_;
  Eigen::Index hidden_;
};

// Action, log-probability and entropy accumulator, in ONE pass per sample.
//
// The direct version walks the action dimensions three times: once to sample,
// once for the Gaussian term, once for the squash correction. All three read
// the same pre-squash value, so fusing them means one traversal, one tanh and
// one exp per dimension rather than three traversals and repeated
// transcendentals.
//
// The correction uses the identity
//     log(1 - tanh(u)^2) = 2 * (log 2 - u - softplus(-2u))
// which is exact and stable near the action bound, where the direct
// log(1 - a^2) form has already lost all its precision.
void SampleAndLogProbFused(const float* __restrict mean, const float* __restrict log_std,
                           const float* __restrict noise, std::size_t batch,
                           std::size_t n_action, float action_limit,
                           float* __restrict actions, float* __restrict log_probs) noexcept {
  constexpr float kHalfLogTwoPi = 0.9189385F;   // 0.5 * log(2 * pi)

  // Samples are independent and write to disjoint output rows, which makes this
  // the one genuinely data-parallel loop in the update.
#pragma omp parallel for schedule(static)
  for (std::size_t sample = 0; sample < batch; ++sample) {
    float total = 0.0F;
    for (std::size_t dim = 0; dim < n_action; ++dim) {
      const std::size_t index = sample * n_action + dim;

      const float sigma = std::exp(log_std[index]);
      const float pre_squash = mean[index] + sigma * noise[index];
      const float squashed = std::tanh(pre_squash);

      // Gaussian term: with u = mu + sigma * eps the standardized residual is
      // exactly the noise draw, so nothing has to be subtracted or divided.
      total += -0.5F * noise[index] * noise[index] - log_std[index] - kHalfLogTwoPi;

      const float softplus = std::log1p(std::exp(-2.0F * std::fabs(pre_squash))) +
                             std::max(0.0F, -2.0F * pre_squash);
      total -= 2.0F * (static_cast<float>(M_LN2) - pre_squash - softplus);

      actions[index] = action_limit * squashed;
    }
    log_probs[sample] = total;
  }
}

// Polyak over the entire critic as ONE contiguous span.
//
// Only the critics have targets in SAC - there is no target actor - but this
// still runs on every step, so walking a nested parameter structure per update
// is a cost paid a million times. One flat vector makes it a single fused
// streaming pass that autovectorizes.
void PolyakFlat(float* __restrict target, const float* __restrict online, std::size_t count,
                float tau) noexcept {
  const float keep = 1.0F - tau;
  for (std::size_t i = 0; i < count; ++i) {
    target[i] = tau * online[i] + keep * target[i];
  }
}`,
        rationale:
          'Three removals, none touching the algorithm. Both critics become one wider weight matrix, so each layer is a single GEMM rather than two half-sized ones. Sampling, the Gaussian term and the squash correction fuse into one pass per sample — the direct version walks the action dimensions three times over the same pre-squash value, paying repeated transcendentals — and the correction uses the stable softplus identity. And the Polyak update, which runs every step even though only the critics have targets, becomes one streaming pass over a flat parameter vector.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Sampling, the Gaussian log-density and the squash correction share one traversal and one pre-squash value, replacing three passes that each recompute the same exponential and tanh.',
            tradeoff: 'The pre-squash values are never stored, so a diagnostic wanting the unsquashed distribution has to recompute the whole forward pass.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Sample rows are independent and write to disjoint outputs, which makes the fused log-probability pass the one genuinely data-parallel loop in the update.',
            tradeoff: 'The loop is transcendental-heavy rather than memory-bound, so it scales further than a gather would — but the thread-team setup is pure overhead at small batch sizes.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Stacking both critics into one weight matrix turns two half-sized GEMMs per layer into a single wider one, which is what the tuned kernel is built for.',
            tradeoff: 'The two critics share a matrix, so anything wanting them treated separately — a per-critic learning rate, a staggered reset — has no natural place to hook in.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The flat Polyak pass and the fused inner loop are simple streaming computations that autovectorize cleanly once optimization is enabled.',
            tradeoff: '-march=native produces a binary that may fault on older CPUs in a heterogeneous fleet.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'One GEMM per critic layer instead of two; one traversal per sample for action and log-probability together. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! SAC - the maximum-entropy update, transcribed.
//!
//! A squashed Gaussian policy with the log-probability derived by hand, because
//! the change-of-variables term is the part everyone gets wrong and the point
//! of writing it out is to see exactly where it comes from.
//!
//! Reparameterization is visible too: the noise draw is an INPUT, so the action
//! is a deterministic function of the parameters and the gradient flows through
//! it into the critic. That is what makes this low-variance where a
//! score-function estimator is not.

pub const LOG_STD_MIN: f64 = -20.0;
pub const LOG_STD_MAX: f64 = 2.0;

pub struct Actor {
    pub w_mu: Vec<Vec<f64>>,      // [action][state]
    pub w_log_std: Vec<Vec<f64>>, // [action][state]
}

#[derive(Clone)]
pub struct Critic {
    pub w1: Vec<Vec<f64>>, // [hidden][state + action]
    pub b1: Vec<f64>,
    pub w2: Vec<f64>,
    pub b2: f64,
}

pub struct SampledAction {
    pub action: Vec<f64>,
    pub mu: Vec<f64>,
    pub log_std: Vec<f64>,
    pub log_prob: f64,
}

pub fn critic_forward(critic: &Critic, joint: &[f64]) -> (f64, Vec<f64>) {
    let mut hidden = vec![0.0; critic.b1.len()];
    for unit in 0..critic.w1.len() {
        let mut total = critic.b1[unit];
        for i in 0..joint.len() {
            total += critic.w1[unit][i] * joint[i];
        }
        hidden[unit] = if total > 0.0 { total } else { 0.0 }; // ReLU
    }

    let mut q = critic.b2;
    for unit in 0..hidden.len() {
        q += critic.w2[unit] * hidden[unit];
    }
    (q, hidden)
}

/// Fits the critic and hands back dQ/da, which the actor needs.
pub fn critic_backward(
    critic: &mut Critic,
    joint: &[f64],
    hidden: &[f64],
    td_error: f64,
    lr: f64,
    n_state: usize,
) -> Vec<f64> {
    let grad_q = -td_error;

    let mut grad_hidden = vec![0.0; hidden.len()];
    for unit in 0..hidden.len() {
        grad_hidden[unit] = grad_q * critic.w2[unit];
        critic.w2[unit] -= lr * grad_q * hidden[unit];
    }
    critic.b2 -= lr * grad_q;

    let mut grad_input = vec![0.0; joint.len()];
    for unit in 0..hidden.len() {
        if hidden[unit] <= 0.0 {
            continue;
        }
        let delta = grad_hidden[unit];
        for i in 0..joint.len() {
            grad_input[i] += delta * critic.w1[unit][i];
            critic.w1[unit][i] -= lr * delta * joint[i];
        }
        critic.b1[unit] -= lr * delta;
    }

    grad_input[n_state..].to_vec()
}

/// a = tanh(mu + sigma * eps), with the log-probability of a, not of u.
///
/// The Gaussian density is over the PRE-squash variable. Pushing it through
/// tanh changes the density, and the change-of-variables rule says to subtract
/// the log of the absolute Jacobian determinant:
///
///     log pi(a) = log N(u; mu, sigma) - sum_i log(1 - tanh(u_i)^2)
///
/// That second term is required, not a numerical nicety. Leaving it out makes
/// the reported entropy wrong, makes the temperature controller optimize
/// something that is not entropy, and produces a run that fails in a way
/// indistinguishable from bad hyperparameters. It is the most common bug here.
pub fn sample_action(actor: &Actor, state: &[f64], eps: &[f64]) -> SampledAction {
    let mut out = SampledAction {
        action: Vec::new(),
        mu: Vec::new(),
        log_std: Vec::new(),
        log_prob: 0.0,
    };

    for index in 0..actor.w_mu.len() {
        let mut mean = 0.0;
        for i in 0..state.len() {
            mean += actor.w_mu[index][i] * state[i];
        }

        let mut raw_log_std = 0.0;
        for i in 0..state.len() {
            raw_log_std += actor.w_log_std[index][i] * state[i];
        }
        // Clamped: unbounded, the distribution collapses toward a delta or
        // diverges, and the log-probability goes wrong before anything visible
        // happens to the return.
        let raw_log_std = raw_log_std.clamp(LOG_STD_MIN, LOG_STD_MAX);

        let sigma = raw_log_std.exp();
        let pre_squash = mean + sigma * eps[index];
        let squashed = pre_squash.tanh();

        // Gaussian part. With u = mu + sigma * eps the standardized residual is
        // exactly eps, so this reduces to a constant plus -log sigma.
        out.log_prob +=
            -0.5 * eps[index] * eps[index] - raw_log_std - 0.5 * (2.0 * std::f64::consts::PI).ln();
        // Change-of-variables correction. 1 - tanh(u)^2 = 1 - a^2.
        out.log_prob -= (1.0 - squashed * squashed + 1e-6).ln();

        out.mu.push(mean);
        out.log_std.push(raw_log_std);
        out.action.push(squashed);
    }

    out
}

/// Pathwise gradient of Q(s, a) - alpha * log pi(a | s).
///
/// Every derivative is through the SAMPLE, because eps is fixed:
///
///     da/dmu      = 1 - a^2
///     da/dlog_std = (1 - a^2) * sigma * eps
///     dlogpi/du   = 2a           (from the correction term alone)
///     dlogpi/dlog_std carries an extra -1 from the -log sigma
///
/// ASCENT: the objective is being maximized.
pub fn actor_backward(
    actor: &mut Actor,
    state: &[f64],
    sample: &SampledAction,
    eps: &[f64],
    dq_daction: &[f64],
    alpha: f64,
    lr: f64,
) {
    for index in 0..sample.mu.len() {
        let squashed = sample.action[index];
        let sigma = sample.log_std[index].exp();
        let local = 1.0 - squashed * squashed; // da/du

        let grad_mu = dq_daction[index] * local - alpha * 2.0 * squashed;
        let grad_log_std = dq_daction[index] * local * sigma * eps[index]
            - alpha * (-1.0 + 2.0 * squashed * sigma * eps[index]);

        for i in 0..state.len() {
            actor.w_mu[index][i] += lr * grad_mu * state[i];
            actor.w_log_std[index][i] += lr * grad_log_std * state[i];
        }
    }
}

/// Tune alpha to hit a target entropy instead of choosing it by hand.
///
/// J(alpha) = -alpha * (log pi + target_entropy), so the gradient with respect
/// to log_alpha is -alpha * (log pi + target_entropy). When the policy is more
/// certain than the target, alpha rises and uncertainty is paid for more. This
/// removes the family's worst hyperparameter.
pub fn temperature_step(log_alpha: f64, log_prob: f64, target_entropy: f64, lr: f64) -> f64 {
    let alpha = log_alpha.exp();
    let gradient = -alpha * (log_prob + target_entropy);
    log_alpha - lr * gradient
}`,
        profile: 'Six scalar network passes per transition. Nested Vecs scatter every row; the log-probability is accumulated per action dimension.',
      },
      'make-it-right': {
        code: `//! SAC - typed errors, flat replay, stable log-probability, learned alpha.

use std::fmt;

/// Newtypes so a temperature and a Polyak coefficient cannot be transposed.
/// Both are small positive floats and swapping them trains badly rather than
/// failing.
#[derive(Debug, Clone, Copy)]
pub struct Temperature(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct PolyakTau(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct TargetEntropy(pub f32);

/// Terminal has no future. A time-limit truncation does, and must still be
/// bootstrapped. A single bool conflates them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EpisodeEnd {
    Running,
    Terminal,
    Truncated,
}

impl EpisodeEnd {
    #[inline]
    #[must_use]
    pub fn bootstraps(self) -> bool {
        !matches!(self, Self::Terminal)
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum SacError {
    EmptyCapacity,
    BadTau,
    BadDiscount,
    NonPositiveTemperature,
    WidthMismatch { got: usize, expected: usize },
}

impl fmt::Display for SacError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCapacity => {
                write!(f, "capacity, state width and action width must be positive")
            }
            Self::BadTau => write!(f, "tau must be in (0, 1]"),
            Self::BadDiscount => write!(f, "gamma must be in [0, 1)"),
            Self::NonPositiveTemperature => {
                write!(f, "temperature must be positive; it is optimized in log space")
            }
            Self::WidthMismatch { got, expected } => {
                write!(f, "vector has width {got}, buffer expects {expected}")
            }
        }
    }
}

impl std::error::Error for SacError {}

/// log(1 - tanh(u)^2), computed stably.
///
/// The direct form loses all precision as the action saturates toward the
/// bound, which is exactly where a trained policy spends its time. The identity
///
///     log(1 - tanh(u)^2) = 2 * (log 2 - u - softplus(-2u))
///
/// is exact and stable across the whole range. This one function is the
/// difference between a SAC that trains and one that reports a plausible but
/// wrong entropy - and the entropy is what the temperature controller steers on.
#[inline]
#[must_use]
pub fn squash_correction(pre_squash: f32) -> f32 {
    let softplus = (-2.0 * pre_squash.abs()).exp().ln_1p() + (-2.0 * pre_squash).max(0.0);
    2.0 * (std::f32::consts::LN_2 - pre_squash - softplus)
}

/// Log-probability of the SQUASHED action, summed over dimensions.
#[must_use]
pub fn squashed_log_prob(noise: &[f32], log_std: &[f32], pre_squash: &[f32]) -> f32 {
    const HALF_LOG_TWO_PI: f32 = 0.918_938_5;

    noise
        .iter()
        .zip(log_std.iter())
        .zip(pre_squash.iter())
        .map(|((&eps, &log_sigma), &u)| {
            // With u = mu + sigma * eps the standardized residual is exactly
            // eps, so the Gaussian term needs no subtraction or division.
            -0.5 * eps * eps - log_sigma - HALF_LOG_TWO_PI - squash_correction(u)
        })
        .sum()
}

/// A fixed-capacity ring over flat storage, one allocation per field. The naive
/// version pushes a struct holding three Vecs per step and removes from the
/// front when full, which allocates repeatedly and is quadratic on eviction.
pub struct ReplayBuffer {
    n_state: usize,
    n_action: usize,
    states: Vec<f32>,
    next_states: Vec<f32>,
    actions: Vec<f32>,
    rewards: Vec<f32>,
    ends: Vec<EpisodeEnd>,
    cursor: usize,
    size: usize,
}

impl ReplayBuffer {
    pub fn new(capacity: usize, n_state: usize, n_action: usize) -> Result<Self, SacError> {
        if capacity == 0 || n_state == 0 || n_action == 0 {
            return Err(SacError::EmptyCapacity);
        }
        Ok(Self {
            n_state,
            n_action,
            states: vec![0.0; capacity * n_state],
            next_states: vec![0.0; capacity * n_state],
            actions: vec![0.0; capacity * n_action],
            rewards: vec![0.0; capacity],
            ends: vec![EpisodeEnd::Running; capacity],
            cursor: 0,
            size: 0,
        })
    }

    /// Borrows both vectors and copies them into storage the buffer already
    /// owns, so recording a transition allocates nothing.
    pub fn add(
        &mut self,
        state: &[f32],
        action: &[f32],
        reward: f32,
        next_state: &[f32],
        end: EpisodeEnd,
    ) -> Result<(), SacError> {
        if state.len() != self.n_state || next_state.len() != self.n_state {
            return Err(SacError::WidthMismatch { got: state.len(), expected: self.n_state });
        }
        if action.len() != self.n_action {
            return Err(SacError::WidthMismatch { got: action.len(), expected: self.n_action });
        }

        let state_offset = self.cursor * self.n_state;
        let action_offset = self.cursor * self.n_action;
        self.states[state_offset..state_offset + self.n_state].copy_from_slice(state);
        self.next_states[state_offset..state_offset + self.n_state].copy_from_slice(next_state);
        self.actions[action_offset..action_offset + self.n_action].copy_from_slice(action);
        self.rewards[self.cursor] = reward;
        self.ends[self.cursor] = end;

        self.cursor = (self.cursor + 1) % self.capacity();
        self.size = (self.size + 1).min(self.capacity());
        Ok(())
    }

    #[must_use]
    pub fn capacity(&self) -> usize {
        self.rewards.len()
    }
}

/// The soft target: minimum of two critics MINUS the entropy term.
///
/// The entropy sits inside the value being estimated, not beside the loss -
/// that is the whole difference from the deterministic branch, and it is why
/// there is no target ACTOR here. A stochastic policy plus the entropy bonus
/// already smooths the target that TD3 had to smooth explicitly.
#[inline]
#[must_use]
pub fn soft_target(
    reward: f32,
    q1_next: f32,
    q2_next: f32,
    next_log_prob: f32,
    alpha: Temperature,
    end: EpisodeEnd,
    gamma: f32,
) -> f32 {
    if !end.bootstraps() {
        return reward;
    }
    reward + gamma * (q1_next.min(q2_next) - alpha.0 * next_log_prob)
}

/// Temperature objective, in log space so alpha stays positive by construction.
#[inline]
#[must_use]
pub fn temperature_gradient(
    log_alpha: f32,
    log_prob: f32,
    target: TargetEntropy,
) -> f32 {
    -log_alpha.exp() * (log_prob + target.0)
}`,
        rationale:
          'The hand-written log(1 − a²) becomes the softplus identity, because the direct form loses all precision exactly where a trained policy spends its time — saturated near the action bound — and the entropy it produces is what the temperature controller steers on. The buffer becomes one flat allocation per field with a ring cursor, replacing a Vec of structs that reallocated per step and was quadratic on eviction. The done bool becomes an enum, newtypes separate three small positive floats that would otherwise transpose silently, and construction validates rather than failing downstream.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per buffer field; the squash correction is two transcendentals per dimension instead of a log of a near-zero quantity.',
      },
      'make-it-fast': {
        code: `//! SAC - fused twin critics, fused sample-and-log-prob, flat Polyak.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// Both critics as ONE matrix multiply.
///
/// Two separate networks mean two GEMMs per layer, each half the size and each
/// too small to saturate anything. Stacking the two weight sets side by side
/// turns every layer into a single wider product - identical arithmetic, one
/// kernel instead of two - and the halves stay independent, which the min needs.
pub struct FusedTwinCritic {
    /// [joint_width, hidden * 2]: columns 0..hidden are critic one.
    w1: Array2<f32>,
    b1: Array2<f32>,
    /// [hidden, 2], one output column per critic.
    w2: Array2<f32>,
    b2: Array2<f32>,
    hidden: usize,
}

impl FusedTwinCritic {
    /// Returns a (batch x 2) block: column 0 is critic one, column 1 is two.
    #[must_use]
    pub fn forward(&self, joint: ArrayView2<'_, f32>) -> Array2<f32> {
        let mut features = joint.dot(&self.w1) + &self.b1;
        features.mapv_inplace(|value| value.max(0.0)); // ReLU in place, no temporary

        let left = features.slice(s![.., ..self.hidden]);
        let right = features.slice(s![.., self.hidden..]);

        let mut out = Array2::zeros((joint.nrows(), 2));
        out.slice_mut(s![.., 0]).assign(&left.dot(&self.w2.slice(s![.., 0])));
        out.slice_mut(s![.., 1]).assign(&right.dot(&self.w2.slice(s![.., 1])));
        out + &self.b2
    }

    /// The pessimistic value is a per-row reduction, not a comparison between
    /// two separately computed results.
    #[must_use]
    pub fn pessimistic(pair: &Array2<f32>) -> Vec<f32> {
        pair.axis_iter(Axis(0)).map(|row| row[0].min(row[1])).collect()
    }
}

/// log(1 - tanh(u)^2) via the softplus identity: exact, and stable near the
/// action bound where the direct log(1 - a^2) form has lost all its precision.
#[inline]
#[must_use]
pub fn squash_correction(pre_squash: f32) -> f32 {
    let softplus = (-2.0 * pre_squash.abs()).exp().ln_1p() + (-2.0 * pre_squash).max(0.0);
    2.0 * (std::f32::consts::LN_2 - pre_squash - softplus)
}

/// Action and log-probability in ONE pass per sample, across threads.
///
/// The direct version walks the action dimensions three times: once to sample,
/// once for the Gaussian term, once for the correction. All three read the same
/// pre-squash value, so fusing them means one traversal, one tanh and one exp
/// per dimension rather than three traversals with repeated transcendentals.
///
/// Sample rows are independent, so the outer loop parallelizes with no shared
/// state - and unlike a gather, this loop is transcendental-heavy rather than
/// memory-bound, so it actually scales with core count.
pub fn sample_and_log_prob(
    mean: &[f32],
    log_std: &[f32],
    noise: &[f32],
    n_action: usize,
    action_limit: f32,
    actions: &mut [f32],
    log_probs: &mut [f32],
) {
    const HALF_LOG_TWO_PI: f32 = 0.918_938_5;

    actions
        .par_chunks_mut(n_action)
        .zip(log_probs.par_iter_mut())
        .enumerate()
        .for_each(|(sample, (action_row, log_prob))| {
            let base = sample * n_action;
            // Contiguous slices of equal length, so the zipped walk drops its
            // bounds checks and the inner loop streams.
            let mean_row = &mean[base..base + n_action];
            let log_std_row = &log_std[base..base + n_action];
            let noise_row = &noise[base..base + n_action];

            let mut total = 0.0_f32;
            for (((out, &mu), &log_sigma), &eps) in action_row
                .iter_mut()
                .zip(mean_row.iter())
                .zip(log_std_row.iter())
                .zip(noise_row.iter())
            {
                let pre_squash = mu + log_sigma.exp() * eps;

                // Gaussian term: the standardized residual is exactly eps, so
                // nothing has to be subtracted or divided.
                total += -0.5 * eps * eps - log_sigma - HALF_LOG_TWO_PI;
                total -= squash_correction(pre_squash);

                *out = action_limit * pre_squash.tanh();
            }
            *log_prob = total;
        });
}

/// Polyak over the entire critic as ONE contiguous slice.
///
/// Only the critics have targets in SAC - there is no target actor - but this
/// still runs on every step, so walking a nested parameter structure per update
/// is a cost paid a million times.
#[inline]
pub fn polyak_flat(target: &mut [f32], online: &[f32], tau: f32) {
    let keep = 1.0 - tau;
    for (target_value, &online_value) in target.iter_mut().zip(online.iter()) {
        *target_value = tau * online_value + keep * *target_value;
    }
}`,
        rationale:
          'Three removals, none touching the algorithm. Both critics become one wider weight matrix, so each layer is a single GEMM and the pessimistic value is a per-row reduction. Sampling, the Gaussian term and the squash correction fuse into one parallel pass per sample — the direct version walks the action dimensions three times over the same pre-squash value, paying repeated transcendentals — and the correction uses the stable softplus identity. And the Polyak update, which runs every step even though only the critics have targets, is one zipped pass over a flat slice.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Sample rows are independent and the fused log-probability pass is transcendental-heavy rather than memory-bound, so it actually scales with core count instead of saturating on bandwidth.',
            tradeoff: 'Thread-team setup is pure overhead at small batch sizes, and reproducibility of the floating-point sum now depends on the chunking as well as the seed.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The inner loop zips four contiguous slices of equal length, so the bounds checks fall out of the path that touches every action dimension of every sample.',
            tradeoff: 'The four slices must stay aligned to the same per-sample layout, so any change to how the actor emits its heads has to be mirrored here.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Stacking both critics into one weight matrix turns two half-sized GEMMs per layer into a single wider one, which is what the tuned kernel exists for.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, and the two critics now share a matrix, so treating them separately has no natural hook.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The squash correction is called once per action dimension per sample per update, so removing the call overhead matters despite the trivial body.',
            tradeoff: 'Inlining a function used across several hot loops grows code size, which can cost instruction-cache locality elsewhere in the update.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'One GEMM per critic layer instead of two; one traversal per sample for action and log-probability together. Illustrative, not a measured benchmark.',
      },
    },
  },
};
