import type { AiMlModel } from '../../types';

/**
 * DDPG & TD3 — the entry where the argmax over actions stops being
 * enumerable and becomes a second network trained to find it.
 *
 * Everything that follows is a consequence: the actor can only be as
 * good as the critic it climbs, and its whole job is to find the
 * action the critic likes most — including the ones the critic is
 * wrong about.
 */
export const DDPG_TD3: AiMlModel = {
  slug: 'ddpg-td3',
  name: 'DDPG & TD3',
  aliases: ['Deep Deterministic Policy Gradient', 'Twin Delayed DDPG', 'TD3', 'Deterministic policy gradient'],
  category: 'reinforcement-learning',
  group: 'continuous-control',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Off-policy reinforcement learning with a deterministic policy. Being off-policy restores the replay buffer that the policy-gradient methods gave up, and being deterministic means exploration must be injected from outside the policy rather than arising from it — the two facts that distinguish this branch from everything above it.',

  intuition:
    'DQN derives its policy from an argmax over the action values, which requires enumerating the actions. For a continuous action space that is not merely expensive, it does not exist. The deterministic policy gradient resolves this with a substitution that is obvious in hindsight: if the argmax cannot be computed, train a network to approximate it. So there are two networks — a critic Q(s, a) fitted by the usual Bellman regression, and an actor that outputs a single action and is trained to maximize the critic\'s output at that action. The actor\'s gradient is the critic\'s gradient with respect to the action, chained back through the actor, which means the critic must be differentiable in the action and the actor is climbing a surface the critic defines. That last clause is the whole story of this method\'s difficulty. The actor is an optimizer pointed at a learned function, and a learned function has errors — sharp spurious peaks in regions where little data exists. The actor will find them, because finding maxima is exactly its job, and it will then take the action at the peak, collect data showing the peak is not real, and the critic will correct it while the actor moves to the next one. DDPG does this and is famously brittle. TD3 adds three targeted countermeasures: two critics with the smaller value taken, so overestimation is replaced by deliberate pessimism; delayed actor updates, so the actor climbs a critic that has had time to settle; and noise added to the target action, which smooths the surface so a spike one action-width wide cannot be exploited. None of the three is clever. All three are aimed at the same failure.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'L(\\phi_i) = \\mathbb{E}\\Bigl[\\bigl(y - Q_{\\phi_i}(s,a)\\bigr)^2\\Bigr], \\quad y = r + \\gamma \\min_{i=1,2} Q_{\\phi_i^{-}}\\bigl(s\', \\tilde{a}\'\\bigr), \\qquad \\max_{\\theta}\\ \\mathbb{E}\\bigl[Q_{\\phi_1}(s, \\mu_{\\theta}(s))\\bigr]',
      symbols: [
        { symbol: '\\min_{i=1,2}', meaning: 'clipped double-Q: two independently initialized critics, the smaller value taken, trading an upward bias for a deliberate downward one because only the upward bias compounds' },
        { symbol: '\\tilde{a}\'', meaning: 'the target action with clipped noise added — target policy smoothing, which flattens spurious narrow peaks the actor would otherwise climb' },
        { symbol: '\\mu_{\\theta}(s)', meaning: 'a deterministic actor: one action, not a distribution, so exploration has to come from outside the policy' },
        { symbol: 'Q_{\\phi_1}', meaning: 'the actor maximizes only the first critic, not the min — using the min here would make the actor chase the more pessimistic surface and slow it for no benefit' },
      ],
    },
    reading:
      'Two objectives, and they are not the same kind of object. The critic loss is an ordinary regression with an interpretable value: it measures how far the action values are from their bootstrapped targets, and it behaves like a supervised loss. The actor objective is not a loss at all — there is no target and no data-derived quantity in it. It says: adjust the actor so the critic rates its output higher. That is an optimizer pointed at another network\'s output, and the consequence is the method\'s central pathology. Wherever the critic is wrong in the optimistic direction, the actor is attracted to exactly that point, because the actor is a maximizer and a spurious peak is a maximum. The critic will eventually be corrected there, since the actor keeps taking that action and collecting contradicting data, but in the meantime the policy is bad and the process can oscillate. All three TD3 modifications attack this. The min over two critics converts the maximization bias into a pessimistic one, and pessimism is safe here in a way optimism is not: underestimating an action\'s value makes the actor avoid it, which costs some performance, while overestimating one makes the actor seek it, which compounds. Delaying the actor lets the critic settle between policy moves, reducing the rate at which the actor chases noise. And adding clipped noise to the target action makes the regression target an average over a small neighbourhood, so a peak narrower than the noise cannot survive it. Read together, TD3 is not three tricks but one hypothesis about what goes wrong, tested three ways.',
  },

  optimization: {
    method: 'Alternating off-policy updates from a replay buffer: twin critics by Bellman regression on a smoothed, pessimistic target, and a delayed deterministic actor by gradient ascent through the critic',
    updateRule: {
      formula:
        '\\nabla_{\\theta} J = \\mathbb{E}\\Bigl[ \\nabla_{a} Q_{\\phi_1}(s,a)\\big|_{a = \\mu_{\\theta}(s)} \; \\nabla_{\\theta}\\mu_{\\theta}(s) \\Bigr], \\qquad \\phi^{-} \\leftarrow \\tau\\phi + (1-\\tau)\\phi^{-}',
      symbols: [
        { symbol: '\\nabla_{a} Q(s,a)', meaning: 'the critic\'s gradient with respect to the action — the whole method requires the critic to be differentiable in the action, which is why this branch exists only for continuous control' },
        { symbol: '\\nabla_{\\theta}\\mu_{\\theta}(s)', meaning: 'the actor Jacobian; the chain rule joins two networks, and the actor inherits every error in the surface it is climbing' },
        { symbol: '\\tau', meaning: 'the Polyak coefficient, typically 0.005: target networks drift continuously rather than jumping, which is smoother than DQN\'s periodic copy' },
        { symbol: '\\phi^{-}', meaning: 'the target critics, whose slow drift is what keeps the regression target approximately stationary' },
      ],
    },
    rationale:
      'Each piece is a response to something that breaks without it, and the list is worth holding in mind as a diagnostic checklist. The replay buffer is back, because the method is off-policy again — this is the branch\'s main advantage over PPO and typically worth several-fold in sample efficiency on continuous control. Target networks are back for the same reason as in DQN, but updated by Polyak averaging rather than periodic copying, which makes the target drift smoothly instead of stepping and suits a setting where the actor is also moving. Exploration must be injected because the policy is deterministic: Gaussian noise added to the action at collection time, with a scale expressed in action units, which makes it a hyperparameter with a physical meaning rather than an abstract one. The three TD3 changes then address the actor-exploits-critic failure. Clipped double-Q is the largest single improvement and is a genuine change of sign in the bias: two critics, the smaller value used for the target, accepting underestimation because only overestimation is self-reinforcing. Delayed policy updates — typically one actor step per two critic steps — reduce how often the actor moves relative to how often the surface it climbs is corrected. Target policy smoothing adds clipped noise to the action used in the target, which is a regularizer stating that actions close together should have similar values, and it is what stops a one-action-wide artifact from being exploitable. In practice TD3 turns a method that required careful per-environment tuning into one that mostly works, which is why plain DDPG is now of mainly historical interest.',
    hyperparameters: [
      { name: 'exploration noise scale', role: 'The only exploration mechanism, since the policy is deterministic. Expressed in action units, which makes it depend on the action scaling and not transfer between environments', typicalRange: '0.1 of the action range' },
      { name: 'target smoothing noise and clip', role: 'Noise added to the target action, clipped so it stays local. The regularizer asserting that nearby actions have similar values, and what makes a narrow critic artifact unexploitable', typicalRange: 'sigma 0.2, clipped to 0.5' },
      { name: 'policy delay', role: 'Critic updates per actor update. Letting the critic settle between policy moves is the cheapest of the three TD3 fixes and one of the most effective', typicalRange: '2' },
      { name: 'Polyak tau', role: 'How fast target networks track the online ones. Small keeps the regression target stationary; too small and value information stops propagating at all', typicalRange: '0.001 to 0.01' },
      { name: 'replay buffer size', role: 'How much history stays available. Too small and the critic forgets regions the policy has left; too large and much of it describes a policy long abandoned', typicalRange: '1e5 to 1e6 transitions' },
      { name: 'learning rates', role: 'Actor and critic, usually equal, and both well below what a supervised model of the same size would take because the regression target is non-stationary', typicalRange: '1e-3 down to 1e-4' },
      { name: 'action bounds and squashing', role: 'A tanh output scaled to the action range. Saturation is a real failure mode: a saturated tanh has near-zero gradient, so an actor pinned at a bound stops learning', typicalRange: 'tanh scaled to the environment limits' },
      { name: 'warmup with random actions', role: 'Pure random actions for the first steps, so the critic is fitted on something before the actor starts climbing it. Skipping this is a common cause of early collapse', typicalRange: '1,000 to 25,000 steps' },
    ],
    convergence:
      'No convergence guarantee. The deadly triad is present in full — bootstrapping, off-policy sampling, function approximation — and the deterministic policy gradient adds a second coupled optimization on top of it, so this is less theoretically grounded than anything above it in this category. The characteristic failure has a name worth remembering: the actor exploits the critic. Q-values climb, the actor moves to the region where the critic is most optimistic, the realized returns do not follow, and the whole thing can oscillate or collapse. Diagnosing it requires plotting predicted Q against realized discounted return, and a gap that grows is the signature; the critic loss will not show it, because the critic is tracking its own inflated targets consistently. Plain DDPG fails this way often enough that reproducing published results was a known problem, which is the context TD3 was written in. The second failure is actor saturation: with a tanh output, an actor driven to the action bound has a vanishing gradient and stops responding, which presents as a policy frozen at an extreme with a critic that keeps training. The third is a buffer that is too small relative to how fast the policy moves, so the critic forgets regions and the actor rediscovers them repeatedly. And seed variance in this family is among the worst in reinforcement learning — a single-seed result here is close to meaningless, and published comparisons in this area have repeatedly turned out to be measuring the seed and the code-level details rather than the algorithm.',
    complexity:
      'Per gradient step: two critic forward-backward passes plus two target-critic forwards, and on actor steps one actor forward, one critic forward and a backward through both — so roughly five to six network passes per critic update and a little more on the delayed actor steps. That is more per update than PPO but on far fewer environment interactions, which is the trade this branch makes. Per environment step: one actor forward. Memory is dominated by the replay buffer of full transitions, which for continuous state and action vectors is modest compared with a frame buffer but still the largest single allocation. Sample complexity is the reason to be here: on continuous control, an off-policy method of this family typically reaches a given return with several times fewer environment steps than an on-policy method, and that gap is the entire argument for tolerating the instability.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no action to differentiate the critic with respect to and no policy whose output would be maximized, because a forecaster does not act; the continuous-valued output of a forecast is a prediction, not a control signal.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so there is no action space for a deterministic actor to output into — and an inflated critic value here reports the actor exploiting a modelling error rather than anything unusual in the data.',
      },
      optimization: {
        fit: 'primary',
        how: 'Learn a deterministic policy over a continuous action space by training an actor to maximize a learned action-value function, with the actor\'s gradient chained through the critic and both fitted off-policy from a replay buffer.',
        where: [
          'Continuous action spaces, where a value-based argmax does not exist and this branch is the value-based answer to that',
          'The deterministic policy gradient as a construction: an intractable argmax replaced by a network trained to approximate it',
          'Optimizer-exploits-model as a named failure, with three independent countermeasures aimed at the same hypothesis',
          'Pessimism as a deliberate bias: taking the min of two estimates because only the optimistic error is self-reinforcing',
        ],
        why: 'The most transferable lesson in this category, and it has nothing to do with reinforcement learning specifically. Whenever an optimizer is pointed at a learned model, it will find that model\'s errors, because finding extrema is what optimizers do and a modelling error in the favourable direction is an extremum. That is the same failure as reward hacking against a learned reward model, the same as an adversarial example against a classifier, and the same as any Bayesian-optimization loop that runs away to where its surrogate is most optimistic. TD3\'s three answers generalize equally well. Take the minimum of an ensemble rather than the mean, because in this setting the bias direction matters more than the bias magnitude. Update the optimizer less often than the model it optimizes against, so it is climbing something that has settled. And smooth the model\'s output over a neighbourhood, so an artifact narrower than the smoothing cannot be exploited. Where this family is the wrong choice is straightforward: discrete actions belong to the DQN family, since the argmax is available and approximating it adds only failure modes; and where stability matters more than sample efficiency, PPO is far more forgiving. Within the family itself, SAC generally dominates TD3 — it has fewer knobs, needs no explicit exploration schedule, and is usually at least as good.',
        featurization: [
          'Scale actions to a fixed range with a tanh and check for saturation, since a saturated actor has a vanishing gradient and stops learning at the bound',
          'Express exploration noise in action units and re-tune it when the action scaling changes, because it does not transfer',
          'Warm up with random actions before the actor starts training, so the critic is fitted on something before it is climbed',
          'Plot predicted Q against realized discounted return; a growing gap is the actor exploiting the critic, and the loss curve cannot show it',
        ],
        evaluation:
          'Median return over at least five seeds with the interquartile range shown, evaluated with exploration noise disabled — this family has some of the worst seed variance in the field, and single-seed comparisons here have a documented history of measuring the seed. Track predicted Q against realized return on the same axes throughout, since that gap is the failure the method exists to manage.',
        pitfalls: [
          'A single critic, which reintroduces the overestimation that clipped double-Q exists to invert',
          'An actor updated as often as the critic, so it chases a surface that has not settled between its own moves',
          'No target smoothing, which leaves narrow critic artifacts directly exploitable by a maximizer',
          'Exploration noise carried over from another environment, where the action scale made it mean something different',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Learn a continuous-valued controller — a torque, a flow rate, a setpoint — from simulated interaction, with off-policy replay making the most of every transition. Deployment is the deterministic actor with exploration noise removed.',
        where: [
          'Robotic manipulation and locomotion, where torques and joint targets are continuous and high-dimensional',
          'Process control with continuous actuators, where discretizing the action space would either be coarse or explode combinatorially',
          'Settings where each environment interaction is expensive enough that off-policy sample efficiency is the deciding property',
          'Problems with a differentiable, well-behaved action-value surface, which is the condition under which this method is well-behaved too',
        ],
        why: 'The natural home of this family and the reason it exists. Continuous actuators are what operations problems actually have, and the several-fold sample-efficiency advantage over an on-policy method is the difference between a feasible and an infeasible simulator budget. Three cautions carry real weight here. The deterministic policy is an advantage at deployment — no sampling, reproducible decisions, a controller that behaves the same way twice — and it is precisely why exploration has to be added artificially during training, which means a production system doing online learning would be injecting noise into a live actuator. That is usually unacceptable, and it is the strongest argument for training entirely in simulation. The critic is only meaningful on the state-action distribution the buffer contains, so a policy asked to operate outside it is being advised by extrapolation, and the actor will actively seek the most optimistic extrapolation available. And a hard constraint must be enforced by an interlock rather than by the reward, because an actor whose entire function is to maximize a learned surface will find whatever the reward function failed to forbid.',
        featurization: [
          'Normalize observations with running statistics and checkpoint them with the weights, since restoring without them produces a silently different controller',
          'Scale actions to the actuator limits with a tanh and monitor saturation, because an actor pinned at a bound has stopped learning',
          'Randomize simulator dynamics if the policy must transfer, as a deterministic policy fitted to one dynamics model exploits that model exactly',
          'Never inject exploration noise into a live actuator; train in simulation and deploy the deterministic actor with noise removed',
        ],
        evaluation:
          'Simulated return against the incumbent controller on matched scenarios with noise disabled, plus constraint violations counted separately rather than averaged in. Report performance under perturbed dynamics: a deterministic policy that is optimal on the nominal model and brittle off it transfers badly, and robustness here predicts deployment far better than nominal return does.',
        pitfalls: [
          'Online learning on live hardware, which means adding exploration noise to a real actuator',
          'Trusting the critic outside the state-action region the buffer covers, where the actor actively seeks the most optimistic extrapolation',
          'A hard constraint expressed in the reward, which an explicit maximizer will treat as a price',
          'Normalization statistics left out of the checkpoint, the most common way a working policy fails on restore',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'A convolutional encoder feeds both actor and critic for control from pixels, trained end to end by the TD error and the deterministic policy gradient, with no vision objective anywhere in the loss.',
        where: [
          'Visual servoing and manipulation from camera input, where perception and control are learned as one network',
          'Encoder gradient routing as a concrete design decision — the actor\'s gradient is normally stopped before it reaches the encoder',
          'Auxiliary self-supervised or reconstruction losses on the encoder, which are close to standard here because reward alone is too weak a signal',
          'Data augmentation on observations, which turned out to be one of the most effective interventions for pixel-based continuous control',
        ],
        why: 'Included because there is a specific and instructive detail here, not because this is a vision method — it is not, and a genuine vision task deserves a supervised model. The detail is gradient routing. With a shared encoder, the actor\'s objective is to maximize the critic, and its gradient flows back through the critic and into the encoder, which means the actor can improve its objective by changing the representation rather than by choosing better actions. That is a degenerate solution and it destabilizes training, so the standard practice is to let only the critic\'s loss train the encoder and stop the actor\'s gradient at the encoder boundary. It is a one-line change that decides whether pixel-based runs work, and it generalizes: whenever two objectives share a representation and one of them is an optimizer pointed at the other, the routing has to be decided deliberately. The broader caution is the same as for DQN. Reward is a far weaker supervisory signal than labels, the sample requirements reflect that, and a pretrained frozen encoder is usually the better engineering choice unless the control task genuinely needs features the reward alone can discover.',
        featurization: [
          'Stop the actor\'s gradient at the encoder; letting it through lets the actor improve its objective by changing the representation instead of the action',
          'Apply random-shift augmentation to observations, which is among the most effective single interventions for pixel-based continuous control',
          'Stack frames or use a recurrent encoder, since velocity is not observable in a single image and the problem is not Markov without it',
          'Store observations as uint8 and convert at sample time, because the replay buffer rather than the network is what exhausts memory',
        ],
        evaluation:
          'Return with exploration disabled, not any vision metric — the encoder exists to support control and its features are only as good as the decisions they enable. If representation quality is itself the question, probe the frozen encoder on a supervised task, which usually shows it has kept what the reward depended on and discarded the rest.',
        pitfalls: [
          'Letting the actor gradient reach a shared encoder, which permits a degenerate solution and destabilizes the run',
          'Reaching for this on an actual vision task, where a supervised model wins by orders of magnitude on both accuracy and sample cost',
          'Materializing stacked frames per transition, which multiplies replay memory by the stack depth',
          'Expecting general visual features from reward supervision, which produces representations narrowly specialized to the reward',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Five or six network passes per critic update and a little more on the delayed actor steps, against far fewer environment interactions than an on-policy method needs — typically several times fewer on continuous control, which is the entire argument for this family. Memory is dominated by the replay buffer of full transitions, modest for vector observations and the largest allocation in the job for pixel ones. Budget at least five seeds and expect wide spread: variance in this family is among the worst in the field, and single-seed results here have a documented history of not replicating. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One actor forward pass and no sampling at all. The deterministic policy is a genuine operational advantage over the stochastic families — the same state produces the same action every time, which makes the controller reproducible, auditable and straightforward to test. The critics are training machinery and do not ship. What does ship alongside the weights is the observation normalization and the action scaling, and both are part of the model rather than of the pipeline.',
    retrainingCadence:
      'Offline retraining in simulation, then evaluation of the deterministic actor, then a staged rollout. Online learning is particularly unattractive here because exploration is injected as noise on the action: continuous learning on a live system means deliberately perturbing a real actuator, which is rarely acceptable. The trigger for a retraining cycle is usually simulator revalidation rather than policy degradation, since the simulator goes stale first.',
    driftAndMonitoring: [
      'Predicted Q against realized discounted return — a growing gap is the actor exploiting the critic, and it is the failure this method is built around managing',
      'Actor output distribution against the action bounds: mass pinned at a limit means a saturated tanh with vanishing gradient, so the policy has stopped learning there',
      'Realized return of the deterministic policy against the incumbent on matched scenarios, with noise disabled',
      'Critic loss for both critics separately, since a large and persistent divergence between the twins means one has drifted and the min is no longer doing what it was meant to',
      'State-action coverage of the replay buffer relative to where the policy now operates, because the actor actively seeks the least-covered optimistic region',
      'Observation-normalization and action-scaling parameters, which are part of the model and drift with the state distribution',
    ],
    productionGotchas: [
      'The actor is an optimizer pointed at a learned function, so it will find the critic\'s errors. That is not a bug to fix but the property the whole method has to be engineered around',
      'A single critic reintroduces maximization bias with a maximizer attached to it, which is materially worse than in DQN — clipped double-Q is the largest single improvement TD3 makes and is not optional',
      'Exploration noise is expressed in action units, so it does not transfer between environments with different action scales and a copied hyperparameter silently means something else',
      'Exploration noise must be removed at deployment. A deterministic policy that is still being perturbed is not the policy that was evaluated',
      'A saturated tanh actor has a near-zero gradient, so a policy pinned at an action bound stops learning while the critic keeps training, which looks like a plateau rather than a failure',
      'With a shared encoder, the actor\'s gradient must be stopped before it reaches the encoder, or the actor can improve its objective by changing the representation instead of the action',
      'Skipping the random-action warmup means the actor starts climbing a critic fitted on almost nothing, which is a common cause of early collapse',
      'Seed variance in this family is severe enough that published comparisons have repeatedly turned out to be measuring seeds and code-level details rather than algorithms',
    ],
  },

  assumptions: [
    'The action space is continuous and the critic is differentiable in the action — the chain rule through the critic is the mechanism, and a discrete action space has no gradient to take',
    'The action-value surface is smooth enough in the action that a local gradient step is informative, which target policy smoothing both assumes and enforces',
    'The replay buffer covers the state-action region the policy now operates in; everywhere else the critic extrapolates and the actor seeks the optimistic extrapolation',
    'The environment is a Markov decision process in the observation given to the networks',
    'Transitions are cheap enough to collect in the hundreds of thousands, which in practice means a simulator',
    'Exploration can be injected as noise on the action, which is acceptable in simulation and usually not on live hardware',
  ],

  pros: [
    {
      point: 'Continuous actions without a tractable argmax',
      context:
        'This is the branch\'s reason to exist. Replacing the enumeration DQN relies on with a network trained to approximate it is what makes value-based methods available for continuous control at all',
    },
    {
      point: 'Off-policy, so the replay buffer and its sample efficiency come back',
      context:
        'Typically several times fewer environment interactions than an on-policy method for the same return on continuous control, which is the whole argument for tolerating the additional instability',
    },
    {
      point: 'The deployed policy is deterministic',
      context:
        'Same state, same action, every time — reproducible, auditable and simple to test, which is a real operational advantage over the stochastic families and rarely mentioned as one',
    },
    {
      point: 'TD3\'s three fixes are one hypothesis tested three ways',
      context:
        'Pessimistic ensembling, delayed optimizer updates and smoothing the optimized surface all target the same failure. The decomposition is unusually clean and each piece generalizes far outside reinforcement learning',
    },
    {
      point: 'Pessimism is the safe direction for the bias',
      context:
        'Taking the min of two critics underestimates values, which makes the actor avoid an action — a bounded cost. Overestimating makes the actor seek it, which compounds. Choosing the direction rather than minimizing magnitude is the insight',
    },
  ],

  cons: [
    {
      point: 'The actor exploits the critic, by construction',
      context:
        'Its objective is to find the maximum of a learned surface, and a modelling error in the optimistic direction is a maximum. Every countermeasure manages this; none removes it, because it is what the method is',
    },
    {
      point: 'Exploration is external and does not transfer',
      context:
        'A deterministic policy supplies no exploration, so noise is added in action units, tuned per environment, and injected into the actuator — which makes online learning on real hardware effectively unavailable',
    },
    {
      point: 'Severe seed variance and brittleness',
      context:
        'Among the worst in the field. Plain DDPG was hard enough to reproduce that TD3 was written partly in response, and comparisons in this area have repeatedly turned out to be measuring seeds and implementation details',
    },
    {
      point: 'Discrete actions are not an option',
      context:
        'The gradient of the critic with respect to the action is the whole mechanism and it does not exist for a discrete action space. Discretizing a continuous one to use DQN instead works up to two or three dimensions and then dies',
    },
    {
      point: 'Actor saturation stops learning silently',
      context:
        'A tanh output driven to the action bound has a vanishing gradient, so the policy freezes at an extreme while the critic keeps training. It presents as a plateau rather than as a failure and is easy to miss',
    },
    {
      point: 'Largely superseded within its own branch',
      context:
        'SAC generally matches or beats TD3 with fewer hyperparameters and no explicit exploration schedule, because a maximum-entropy stochastic policy supplies its own exploration. TD3 remains the clearer explanation of the failure both are managing',
    },
  ],

  relatedSlugs: ['sac', 'dqn', 'ppo-trpo', 'actor-critic', 'q-learning', 'model-based-rl'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DDPG - the deterministic policy gradient, transcribed.

Two networks and one chain rule. The critic is fitted by Bellman regression.
The actor is trained by pushing its output uphill on the critic's surface,
which means dQ/da is computed explicitly and then chained into the actor.

Watch what the actor's objective IS: there is no target in it and no quantity
derived from data. It says "make the critic rate this action higher". That is
an optimizer pointed at a learned function, and it is the whole difficulty.
"""

import math
import random


def make_critic(n_state, n_action, n_hidden):
    """Q(s, a) over the concatenation [s; a]. It must be differentiable in a -
    that requirement is why this branch exists only for continuous control."""
    scale = 1.0 / math.sqrt(n_state + n_action)
    return {
        "w1": [[random.uniform(-scale, scale) for _ in range(n_state + n_action)]
               for _ in range(n_hidden)],
        "b1": [0.0] * n_hidden,
        "w2": [random.uniform(-scale, scale) for _ in range(n_hidden)],
        "b2": 0.0,
    }


def critic_forward(critic, state, action):
    joint = list(state) + list(action)

    hidden = []
    for row, bias in zip(critic["w1"], critic["b1"]):
        total = bias
        for weight, feature in zip(row, joint):
            total += weight * feature
        hidden.append(total if total > 0.0 else 0.0)        # ReLU

    q = critic["b2"]
    for weight, activation in zip(critic["w2"], hidden):
        q += weight * activation

    return q, hidden, joint


def critic_backward(critic, joint, hidden, td_error, lr, n_state):
    """One SGD step on the squared TD error, and dQ/da on the way out.

    The action gradient is the piece the actor needs, and it costs nothing
    extra: it is the same backward pass, read off at the input layer instead of
    stopping at the weights.
    """
    grad_q = -td_error

    grad_hidden = [0.0] * len(hidden)
    for index in range(len(hidden)):
        grad_hidden[index] = grad_q * critic["w2"][index]
        critic["w2"][index] -= lr * grad_q * hidden[index]
    critic["b2"] -= lr * grad_q

    # dQ/d(input), accumulated across hidden units, then sliced to the action
    # half of the concatenation.
    grad_input = [0.0] * len(joint)
    for unit in range(len(hidden)):
        if hidden[unit] <= 0.0:
            continue                                        # ReLU is closed here
        delta = grad_hidden[unit]
        for index in range(len(joint)):
            grad_input[index] += delta * critic["w1"][unit][index]
            critic["w1"][unit][index] -= lr * delta * joint[index]
        critic["b1"][unit] -= lr * delta

    return grad_input[n_state:]


def actor_forward(actor, state, action_limit):
    """A DETERMINISTIC policy: one action, not a distribution.

    tanh bounds the output to the actuator range. It is also a real failure
    mode - a saturated tanh has a near-zero derivative, so an actor driven to
    the bound stops learning while the critic keeps training.
    """
    pre_activation = []
    for row in actor["w"]:
        total = 0.0
        for weight, feature in zip(row, state):
            total += weight * feature
        pre_activation.append(total)

    action = [action_limit * math.tanh(z) for z in pre_activation]
    return action, pre_activation


def actor_backward(actor, state, pre_activation, dq_daction, lr, action_limit):
    """Chain dQ/da into the actor. ASCENT: the actor maximizes the critic.

    da_k/dw[k][i] = action_limit * (1 - tanh(z_k)^2) * s[i], so the whole
    update is dQ/da_k times that. Two networks joined by one chain rule, and
    the actor inherits every error in the surface it is climbing.
    """
    for index in range(len(pre_activation)):
        squashed = math.tanh(pre_activation[index])
        local = action_limit * (1.0 - squashed * squashed)
        coefficient = dq_daction[index] * local
        for feature_index, feature in enumerate(state):
            actor["w"][index][feature_index] += lr * coefficient * feature


def soft_update(target, online, tau):
    """Polyak averaging: the target drifts continuously rather than jumping.

    DQN copies its target network periodically. Here the actor is moving too,
    so a smoothly drifting target suits the setting better than a step change.
    """
    for key in target:
        if isinstance(target[key], list) and target[key] and isinstance(target[key][0], list):
            for row_index in range(len(target[key])):
                for index in range(len(target[key][row_index])):
                    target[key][row_index][index] = (
                        tau * online[key][row_index][index]
                        + (1.0 - tau) * target[key][row_index][index]
                    )
        elif isinstance(target[key], list):
            for index in range(len(target[key])):
                target[key][index] = tau * online[key][index] + (1.0 - tau) * target[key][index]
        else:
            target[key] = tau * online[key] + (1.0 - tau) * target[key]


def train(env, n_state, n_action, steps=100_000, n_hidden=64, lr=1e-3, gamma=0.99,
          tau=0.005, action_limit=1.0, noise_scale=0.1, buffer_size=50_000,
          warmup=1_000, batch_size=32):
    scale = 1.0 / math.sqrt(n_state)
    actor = {"w": [[random.uniform(-scale, scale) for _ in range(n_state)]
                   for _ in range(n_action)]}
    critic = make_critic(n_state, n_action, n_hidden)

    target_actor = {"w": [row[:] for row in actor["w"]]}
    target_critic = {
        "w1": [row[:] for row in critic["w1"]],
        "b1": critic["b1"][:],
        "w2": critic["w2"][:],
        "b2": critic["b2"],
    }

    buffer = []
    state = env.reset()

    for step in range(steps):
        # The policy is deterministic, so it supplies NO exploration. Noise has
        # to be added from outside, and its scale is in action units - which is
        # why this hyperparameter does not transfer between environments.
        if step < warmup:
            action = [random.uniform(-action_limit, action_limit) for _ in range(n_action)]
        else:
            action, _ = actor_forward(actor, state, action_limit)
            action = [
                max(-action_limit, min(action_limit, a + random.gauss(0.0, noise_scale)))
                for a in action
            ]

        next_state, reward, done = env.step(action)
        buffer.append((state, action, reward, next_state, done))
        if len(buffer) > buffer_size:
            buffer.pop(0)

        state = env.reset() if done else next_state
        if len(buffer) < warmup:
            continue

        for _ in range(batch_size):
            s, a, r, s_next, terminal = random.choice(buffer)

            # The target: bootstrap through the TARGET actor and TARGET critic,
            # both drifting slowly, so the regression target is approximately
            # stationary while the online networks move.
            if terminal:
                bootstrap = 0.0                             # no future past a terminal
            else:
                next_action, _ = actor_forward(target_actor, s_next, action_limit)
                bootstrap, _, _ = critic_forward(target_critic, s_next, next_action)

            q, hidden, joint = critic_forward(critic, s, a)
            td_error = r + gamma * bootstrap - q

            # One backward pass serves both networks: it fits the critic and
            # hands back dQ/da for the actor.
            dq_daction = critic_backward(critic, joint, hidden, td_error, lr, n_state)

            # The actor is evaluated at ITS OWN current output, not at the
            # stored action - the objective is "what would the critic say about
            # what I would do now", which is what makes this off-policy.
            current_action, pre_activation = actor_forward(actor, s, action_limit)
            _, actor_hidden, actor_joint = critic_forward(critic, s, current_action)
            dq_dcurrent = critic_backward(critic, actor_joint, actor_hidden, 0.0, 0.0, n_state)

            actor_backward(actor, s, pre_activation, dq_dcurrent, lr, action_limit)

            soft_update(target_critic, critic, tau)
            soft_update(target_actor, actor, tau)

    return actor, critic`,
        profile: 'Two critic passes plus two target passes per sample, all scalar and in the interpreter. No batching anywhere.',
      },
      'make-it-right': {
        code: `"""TD3 - twin critics, delayed actor, smoothed targets, typed throughout."""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import numpy as np
import torch
from numpy.typing import NDArray
from torch import Tensor, nn


class Batch(NamedTuple):
    states: Tensor
    actions: Tensor
    rewards: Tensor
    next_states: Tensor
    # Terminal, not done: a time-limit truncation still has a future and must
    # still be bootstrapped. Conflating them teaches the agent the world ends
    # at the episode limit.
    terminals: Tensor


@dataclass(frozen=True)
class Td3Config:
    n_state: int
    n_action: int
    action_limit: float
    hidden: tuple[int, ...] = (256, 256)
    learning_rate: float = 3e-4
    gamma: float = 0.99
    tau: float = 0.005
    # Exploration, in ACTION UNITS. The policy is deterministic and supplies
    # none of its own, so this is the entire mechanism - and it does not
    # transfer between environments with different action scales.
    exploration_noise: float = 0.1
    # Target policy smoothing: noise on the target action, clipped so it stays
    # local. It asserts that nearby actions have similar values, which is what
    # makes a critic artifact narrower than the noise unexploitable.
    target_noise: float = 0.2
    target_noise_clip: float = 0.5
    # One actor step per two critic steps, so the actor climbs a surface that
    # has had time to settle between its own moves.
    policy_delay: int = 2
    warmup_steps: int = 10_000

    def __post_init__(self) -> None:
        if self.action_limit <= 0.0:
            raise ValueError("action limit must be positive")
        if not 0.0 < self.tau <= 1.0:
            raise ValueError(f"tau must be in (0, 1], got {self.tau}")
        if self.policy_delay < 1:
            raise ValueError("policy delay must be at least one")
        if self.target_noise_clip < self.target_noise:
            raise ValueError("clipping below the noise scale makes the smoothing one-sided")


class Actor(nn.Module):
    """Deterministic: one action, not a distribution."""

    def __init__(self, config: Td3Config) -> None:
        super().__init__()
        layers: list[nn.Module] = []
        width = config.n_state
        for size in config.hidden:
            layers += [nn.Linear(width, size), nn.ReLU()]
            width = size
        layers += [nn.Linear(width, config.n_action), nn.Tanh()]
        self.net = nn.Sequential(*layers)
        self.action_limit = config.action_limit

    def forward(self, states: Tensor) -> Tensor:
        return self.action_limit * self.net(states)


class TwinCritic(nn.Module):
    """Two independently initialized critics over the same (s, a) input.

    Independent initialization is the point: their errors have to be
    uncorrelated for the min to remove anything.
    """

    def __init__(self, config: Td3Config) -> None:
        super().__init__()
        self.q1 = self._build(config)
        self.q2 = self._build(config)

    @staticmethod
    def _build(config: Td3Config) -> nn.Module:
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


class ReplayBuffer:
    """Fixed-capacity ring over pre-allocated arrays, one per field."""

    def __init__(self, capacity: int, n_state: int, n_action: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be positive")
        self._states = np.zeros((capacity, n_state), dtype=np.float32)
        self._next_states = np.zeros((capacity, n_state), dtype=np.float32)
        self._actions = np.zeros((capacity, n_action), dtype=np.float32)
        self._rewards = np.zeros(capacity, dtype=np.float32)
        self._terminals = np.zeros(capacity, dtype=np.bool_)
        self._capacity = capacity
        self._cursor = 0
        self._size = 0

    def __len__(self) -> int:
        return self._size

    def add(self, state: NDArray[np.float32], action: NDArray[np.float32],
            reward: float, next_state: NDArray[np.float32], terminal: bool) -> None:
        index = self._cursor
        self._states[index] = state
        self._actions[index] = action
        self._rewards[index] = reward
        self._next_states[index] = next_state
        self._terminals[index] = terminal
        self._cursor = (self._cursor + 1) % self._capacity
        self._size = min(self._size + 1, self._capacity)

    def sample(self, batch_size: int, rng: np.random.Generator) -> Batch:
        if self._size < batch_size:
            raise ValueError(f"buffer holds {self._size}, cannot sample {batch_size}")
        index = rng.integers(0, self._size, size=batch_size)
        return Batch(
            torch.from_numpy(self._states[index]),
            torch.from_numpy(self._actions[index]),
            torch.from_numpy(self._rewards[index]),
            torch.from_numpy(self._next_states[index]),
            torch.from_numpy(self._terminals[index]),
        )


@torch.no_grad()
def smoothed_pessimistic_target(
    target_actor: Actor, target_critic: TwinCritic, batch: Batch, config: Td3Config
) -> Tensor:
    """The TD3 target: smoothed action, minimum over two critics.

    The min is a deliberate change of BIAS DIRECTION, not a reduction in its
    magnitude. Underestimating an action's value makes the actor avoid it,
    which costs a bounded amount of performance. Overestimating makes the actor
    SEEK it, which compounds - because the actor is a maximizer and a spurious
    peak is a maximum.
    """
    noise = (torch.randn_like(batch.actions) * config.target_noise).clamp(
        -config.target_noise_clip, config.target_noise_clip
    )
    next_actions = (target_actor(batch.next_states) + noise).clamp(
        -config.action_limit, config.action_limit
    )

    q1, q2 = target_critic(batch.next_states, next_actions)
    next_value = torch.min(q1, q2).masked_fill(batch.terminals, 0.0)
    return batch.rewards + config.gamma * next_value


def update(
    actor: Actor, critic: TwinCritic,
    target_actor: Actor, target_critic: TwinCritic,
    actor_optimizer: torch.optim.Optimizer, critic_optimizer: torch.optim.Optimizer,
    batch: Batch, config: Td3Config, step: int,
) -> dict[str, float]:
    target = smoothed_pessimistic_target(target_actor, target_critic, batch, config)
    q1, q2 = critic(batch.states, batch.actions)
    critic_loss = nn.functional.mse_loss(q1, target) + nn.functional.mse_loss(q2, target)

    critic_optimizer.zero_grad(set_to_none=True)
    critic_loss.backward()
    critic_optimizer.step()

    stats = {"critic_loss": float(critic_loss), "mean_q": float(q1.mean())}

    # Delayed: the actor moves only every policy_delay critic updates, so it is
    # climbing a surface that has settled rather than chasing one that moves
    # underneath it every step.
    if step % config.policy_delay != 0:
        return stats

    # The actor maximizes q1 alone, not the min. Using the min here would make
    # the actor climb the more pessimistic of two surfaces for no benefit; the
    # pessimism belongs in the TARGET, where the compounding happens.
    actor_loss = -critic.q1(
        torch.cat([batch.states, actor(batch.states)], dim=1)
    ).mean()

    actor_optimizer.zero_grad(set_to_none=True)
    actor_loss.backward()
    actor_optimizer.step()

    with torch.no_grad():
        for online, target_parameter in zip(critic.parameters(), target_critic.parameters()):
            target_parameter.mul_(1 - config.tau).add_(online, alpha=config.tau)
        for online, target_parameter in zip(actor.parameters(), target_actor.parameters()):
            target_parameter.mul_(1 - config.tau).add_(online, alpha=config.tau)

    stats["actor_loss"] = float(actor_loss)
    return stats`,
        rationale:
          'The single critic becomes two independently initialized ones with the minimum taken in the target, which changes the direction of the bias rather than its size — the actor is a maximizer, so an optimistic error compounds and a pessimistic one merely costs performance. The actor is delayed so it climbs a surface that has settled. Clipped noise is added to the target action, which asserts that nearby actions have similar values and makes a narrow critic artifact unexploitable. Terminal is separated from truncation, and the buffer becomes pre-allocated contiguous arrays rather than a list of tuples.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'Four critic passes plus one actor pass per update, with the actor skipped on most steps.',
      },
      'make-it-fast': {
        code: `"""TD3 - fused twin critics, foreach Polyak, actor work skipped when delayed.

None of this changes the algorithm. All of it removes work that a direct
implementation does per step and that adds up at a million environment steps.
"""

from __future__ import annotations

import numpy as np
import torch
from torch import Tensor, nn


class FusedTwinCritic(nn.Module):
    """Both critics as one batched matrix multiply.

    Two separate networks mean two GEMMs per layer, each half the size and each
    too small to saturate anything. Stacking them into a single weight tensor
    with a leading pair dimension turns every layer into one baddbmm - identical
    arithmetic, half the kernel launches, and the pair dimension keeps the two
    sets of parameters genuinely independent, which is what the min requires.
    """

    def __init__(self, n_input: int, hidden: int) -> None:
        super().__init__()
        # Leading dim 2: index 0 is critic one, index 1 is critic two.
        self.w1 = nn.Parameter(torch.empty(2, n_input, hidden))
        self.b1 = nn.Parameter(torch.zeros(2, 1, hidden))
        self.w2 = nn.Parameter(torch.empty(2, hidden, 1))
        self.b2 = nn.Parameter(torch.zeros(2, 1, 1))
        for tensor in (self.w1, self.w2):
            nn.init.orthogonal_(tensor, gain=1.0)

    def forward(self, states: Tensor, actions: Tensor) -> Tensor:
        joint = torch.cat([states, actions], dim=1)
        # (2, batch, n_input) without copying: expand is a stride trick.
        batched = joint.unsqueeze(0).expand(2, -1, -1)

        hidden = torch.baddbmm(self.b1, batched, self.w1).relu_()   # ReLU in place
        return torch.baddbmm(self.b2, hidden, self.w2).squeeze(-1)  # (2, batch)


class ContiguousReplay:
    """One flat allocation per field; a batch is one fancy-index per field.

    A list of per-transition tuples allocates twice per environment step and
    scatters every sample, which at a million steps is the largest avoidable
    cost in the whole loop.
    """

    def __init__(self, capacity: int, n_state: int, n_action: int, device: torch.device) -> None:
        # Single dtype throughout, so a sampled batch needs no conversion and
        # transfers as one contiguous block per field.
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
        return (
            self.states[index], self.actions[index], self.rewards[index],
            self.next_states[index], self.terminals[index],
        )


@torch.no_grad()
def polyak_foreach(target_params: list[Tensor], online_params: list[Tensor], tau: float) -> None:
    """Soft-update every parameter tensor in two fused calls.

    A Python loop with mul_ and add_ per tensor runs hundreds of tiny kernel
    launches on EVERY step - and unlike DQN's periodic copy, this happens
    continuously. The foreach ops batch the whole parameter list into one
    launch each, which is a real fraction of wall-clock in a direct TD3.
    """
    torch._foreach_mul_(target_params, 1.0 - tau)
    torch._foreach_add_(target_params, online_params, alpha=tau)


@torch.no_grad()
def target_value(
    target_actor: nn.Module, target_critic: FusedTwinCritic,
    next_states: Tensor, rewards: Tensor, terminals: Tensor,
    gamma: float, action_limit: float, noise: float, noise_clip: float,
) -> Tensor:
    """Smoothed pessimistic target, with the min taken across the pair axis.

    Because both critics live in one tensor, the minimum is a reduction over
    dimension 0 rather than a comparison between two separate results - no
    second forward pass and no intermediate tensors to materialize.
    """
    smoothing = (torch.randn_like(rewards.unsqueeze(-1)) * noise).clamp(-noise_clip, noise_clip)
    next_actions = (target_actor(next_states) + smoothing).clamp(-action_limit, action_limit)

    pair = target_critic(next_states, next_actions)          # (2, batch)
    next_value = pair.min(dim=0).values.masked_fill(terminals, 0.0)
    return rewards + gamma * next_value


def critic_step(critic: FusedTwinCritic, optimizer: torch.optim.Optimizer,
                states: Tensor, actions: Tensor, target: Tensor) -> Tensor:
    """One loss covering both critics: the pair axis broadcasts against the
    shared target, so there is no second loss term to add."""
    pair = critic(states, actions)                           # (2, batch)
    loss = nn.functional.mse_loss(pair, target.unsqueeze(0).expand_as(pair))

    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    optimizer.step()
    return loss.detach()`,
        rationale:
          'Three removals, none of which touches the algorithm. The twin critics become one weight tensor with a leading pair dimension, so every layer is a single batched matmul instead of two half-sized ones and the min is a reduction rather than a comparison between separate results. The Polyak update — which unlike DQN\'s periodic copy runs on every step — becomes two fused foreach calls instead of hundreds of tiny per-tensor kernel launches. And the replay buffer is one flat allocation per field in a single dtype, so a batch is one fancy-index per field rather than a gather over scattered tuples.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'The Polyak update touches every parameter tensor on every step; batching them into two foreach calls replaces hundreds of per-tensor launches with two.',
            tradeoff: 'It requires the parameter lists to stay in matching order, which a model refactor can silently break — mismatched ordering soft-updates the wrong tensors with no error.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Stacking both critics under a leading pair dimension turns two half-sized GEMMs per layer into one batched matmul, and makes the min a reduction over that axis.',
            tradeoff: 'The two critics now share a module and an optimizer, so anything that needs them treated separately — a per-critic learning rate, a staggered reset — no longer has a natural place.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Every replay field is one flat float32 allocation, so a sampled batch is one contiguous fancy-index per field with no dtype conversion on the path.',
            tradeoff: 'Capacity is fixed at construction and the whole buffer is allocated up front, whether or not training ever fills it.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'copy_ writes transitions into existing storage and relu_ activates in place, so neither the collection path nor the critic forward allocates per step.',
            tradeoff: 'In-place activation destroys the pre-activation values, so any diagnostic that wanted to inspect them has to recompute the layer.',
          },
        ],
        libraryName: 'PyTorch',
        profile: 'One batched matmul per critic layer instead of two; two fused calls per Polyak update. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DDPG - the deterministic policy gradient, transcribed.
//
// Two networks and one chain rule. The critic is fitted by Bellman regression;
// the actor is trained by pushing its output uphill on the critic's surface,
// which means dQ/da is computed explicitly and chained into the actor.
//
// Watch what the actor's objective IS: no target, no quantity derived from
// data. "Make the critic rate this action higher" is an optimizer pointed at a
// learned function, and that is the whole difficulty.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

struct StepResult {
  std::vector<double> next_state;
  double reward;
  bool done;
};

// Q(s, a) over the concatenation [s; a]. It must be differentiable in a - that
// requirement is why this branch exists only for continuous control.
struct Critic {
  std::vector<std::vector<double>> w1;   // [hidden][state + action]
  std::vector<double> b1;
  std::vector<double> w2;                // [hidden]
  double b2;
};

// A DETERMINISTIC policy: one action, not a distribution.
struct Actor {
  std::vector<std::vector<double>> w;    // [action][state]
};

double CriticForward(const Critic& critic, const std::vector<double>& joint,
                     std::vector<double>& hidden) {
  hidden.assign(critic.b1.size(), 0.0);
  for (std::size_t unit = 0; unit < critic.w1.size(); ++unit) {
    double total = critic.b1[unit];
    for (std::size_t i = 0; i < joint.size(); ++i) {
      total += critic.w1[unit][i] * joint[i];
    }
    hidden[unit] = total > 0.0 ? total : 0.0;               // ReLU
  }

  double q = critic.b2;
  for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
    q += critic.w2[unit] * hidden[unit];
  }
  return q;
}

// One SGD step on the squared TD error, with dQ/da handed back on the way out.
//
// The action gradient costs nothing extra: it is the same backward pass, read
// off at the input layer instead of stopping at the weights.
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
    if (hidden[unit] <= 0.0) continue;                      // ReLU is closed here
    const double delta = grad_hidden[unit];
    for (std::size_t i = 0; i < joint.size(); ++i) {
      grad_input[i] += delta * critic.w1[unit][i];
      critic.w1[unit][i] -= lr * delta * joint[i];
    }
    critic.b1[unit] -= lr * delta;
  }

  // Slice off the action half of the concatenation: that is dQ/da.
  return std::vector<double>(grad_input.begin() + static_cast<std::ptrdiff_t>(n_state),
                             grad_input.end());
}

// tanh bounds the output to the actuator range. It is also a real failure
// mode: a saturated tanh has a near-zero derivative, so an actor driven to the
// bound stops learning while the critic keeps training.
std::vector<double> ActorForward(const Actor& actor, const std::vector<double>& state,
                                 double action_limit, std::vector<double>& pre_activation) {
  pre_activation.assign(actor.w.size(), 0.0);
  std::vector<double> action(actor.w.size(), 0.0);

  for (std::size_t index = 0; index < actor.w.size(); ++index) {
    double total = 0.0;
    for (std::size_t i = 0; i < state.size(); ++i) {
      total += actor.w[index][i] * state[i];
    }
    pre_activation[index] = total;
    action[index] = action_limit * std::tanh(total);
  }
  return action;
}

// Chain dQ/da into the actor. ASCENT: the actor maximizes the critic.
//
// da_k/dw[k][i] = action_limit * (1 - tanh(z_k)^2) * s[i], so the update is
// dQ/da_k times that. Two networks joined by one chain rule, and the actor
// inherits every error in the surface it is climbing.
void ActorBackward(Actor& actor, const std::vector<double>& state,
                   const std::vector<double>& pre_activation,
                   const std::vector<double>& dq_daction, double lr, double action_limit) {
  for (std::size_t index = 0; index < pre_activation.size(); ++index) {
    const double squashed = std::tanh(pre_activation[index]);
    const double local = action_limit * (1.0 - squashed * squashed);
    const double coefficient = dq_daction[index] * local;
    for (std::size_t i = 0; i < state.size(); ++i) {
      actor.w[index][i] += lr * coefficient * state[i];
    }
  }
}

// Polyak averaging: the target drifts continuously rather than jumping. DQN
// copies its target periodically; here the actor is moving too, so a smoothly
// drifting target suits the setting better than a step change.
void SoftUpdate(std::vector<double>& target, const std::vector<double>& online, double tau) {
  for (std::size_t i = 0; i < target.size(); ++i) {
    target[i] = tau * online[i] + (1.0 - tau) * target[i];
  }
}

struct Transition {
  std::vector<double> state;
  std::vector<double> action;
  double reward;
  std::vector<double> next_state;
  bool terminal;
};

template <typename Env>
void Train(Env& env, std::size_t n_state, std::size_t n_action, int steps,
           std::size_t n_hidden, double lr, double gamma, double tau,
           double action_limit, double noise_scale, std::size_t buffer_size,
           std::size_t warmup, Actor& actor, Critic& critic) {
  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(-action_limit, action_limit);
  std::normal_distribution<double> gaussian(0.0, noise_scale);

  Actor target_actor = actor;
  Critic target_critic = critic;

  std::vector<Transition> buffer;
  std::vector<double> state = env.reset();
  std::vector<double> hidden;
  std::vector<double> pre_activation;

  for (int step = 0; step < steps; ++step) {
    // The policy is deterministic and supplies NO exploration. Noise has to
    // come from outside, and its scale is in action units - which is why this
    // hyperparameter does not transfer between environments.
    std::vector<double> action;
    if (static_cast<std::size_t>(step) < warmup) {
      action.resize(n_action);
      for (double& value : action) value = uniform(rng);
    } else {
      action = ActorForward(actor, state, action_limit, pre_activation);
      for (double& value : action) {
        value = std::max(-action_limit, std::min(action_limit, value + gaussian(rng)));
      }
    }

    const StepResult result = env.step(action);
    buffer.push_back({state, action, result.reward, result.next_state, result.done});
    if (buffer.size() > buffer_size) buffer.erase(buffer.begin());

    state = result.done ? env.reset() : result.next_state;
    if (buffer.size() < warmup) continue;

    std::uniform_int_distribution<std::size_t> pick(0, buffer.size() - 1);
    const Transition& sample = buffer[pick(rng)];

    // Bootstrap through the TARGET actor and TARGET critic, both drifting
    // slowly, so the regression target is approximately stationary while the
    // online networks move.
    double bootstrap = 0.0;
    if (!sample.terminal) {
      const std::vector<double> next_action =
          ActorForward(target_actor, sample.next_state, action_limit, pre_activation);
      std::vector<double> joint = sample.next_state;
      joint.insert(joint.end(), next_action.begin(), next_action.end());
      bootstrap = CriticForward(target_critic, joint, hidden);
    }

    std::vector<double> joint = sample.state;
    joint.insert(joint.end(), sample.action.begin(), sample.action.end());
    const double q = CriticForward(critic, joint, hidden);
    const double td_error = sample.reward + gamma * bootstrap - q;

    CriticBackward(critic, joint, hidden, td_error, lr, n_state);

    // The actor is evaluated at ITS OWN current output, not at the stored
    // action: the objective is "what would the critic say about what I would
    // do now", which is what makes this off-policy.
    const std::vector<double> current =
        ActorForward(actor, sample.state, action_limit, pre_activation);
    std::vector<double> actor_joint = sample.state;
    actor_joint.insert(actor_joint.end(), current.begin(), current.end());
    CriticForward(critic, actor_joint, hidden);
    const std::vector<double> dq_daction =
        CriticBackward(critic, actor_joint, hidden, 0.0, 0.0, n_state);

    ActorBackward(actor, sample.state, pre_activation, dq_daction, lr, action_limit);

    SoftUpdate(target_critic.w2, critic.w2, tau);
    SoftUpdate(target_critic.b1, critic.b1, tau);
    for (std::size_t unit = 0; unit < critic.w1.size(); ++unit) {
      SoftUpdate(target_critic.w1[unit], critic.w1[unit], tau);
    }
    for (std::size_t index = 0; index < actor.w.size(); ++index) {
      SoftUpdate(target_actor.w[index], actor.w[index], tau);
    }
  }
}`,
        profile: 'Two critic passes plus two target passes per sample, all scalar. Nested vectors scatter every row, and each concatenation allocates.',
      },
      'make-it-right': {
        code: `// TD3 - owned replay, twin critics, delayed actor, smoothed targets.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

// Newtypes so an exploration noise scale and a target smoothing scale cannot
// be transposed - both are small positive floats in action units, and swapping
// them changes what is being regularized with no visible symptom.
struct ExplorationNoise {
  float value;
};

struct SmoothingNoise {
  float value;
};

// Terminal has no future. A time-limit truncation does, and must still be
// bootstrapped. A single done flag conflates them and the resulting policy is
// visibly short-sighted at the episode limit.
enum class EpisodeEnd : std::uint8_t { kRunning, kTerminal, kTruncated };

struct Td3Config {
  float gamma = 0.99F;
  float tau = 0.005F;
  ExplorationNoise exploration{0.1F};
  // Target policy smoothing: noise on the target action, clipped so it stays
  // local. It asserts that nearby actions have similar values, which is what
  // makes a critic artifact narrower than the noise unexploitable.
  SmoothingNoise smoothing{0.2F};
  float smoothing_clip = 0.5F;
  // One actor step per two critic steps, so the actor climbs a surface that
  // has settled between its own moves.
  std::size_t policy_delay = 2;
  float action_limit = 1.0F;
};

void ValidateConfig(const Td3Config& config) {
  if (config.action_limit <= 0.0F) {
    throw std::invalid_argument("action limit must be positive");
  }
  if (config.tau <= 0.0F || config.tau > 1.0F) {
    throw std::invalid_argument("tau must be in (0, 1]");
  }
  if (config.policy_delay == 0) {
    throw std::invalid_argument("policy delay must be at least one");
  }
  if (config.smoothing_clip < config.smoothing.value) {
    throw std::invalid_argument("clipping below the noise scale makes smoothing one-sided");
  }
}

// A fixed-capacity ring over flat storage, one allocation per field. The naive
// version pushes a struct holding three vectors per step and erases from the
// front when full, which allocates twice per step and is quadratic on eviction.
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
  [[nodiscard]] std::span<const float> State(std::size_t index) const {
    return {states_.data() + index * n_state_, n_state_};
  }

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

// The TD3 target: smoothed action, minimum over two independently initialized
// critics.
//
// The min is a deliberate change of BIAS DIRECTION, not a reduction in its
// magnitude. Underestimating an action's value makes the actor avoid it, which
// costs a bounded amount of performance; overestimating makes the actor SEEK
// it, which compounds - because the actor is a maximizer and a spurious peak
// is a maximum.
[[nodiscard]] float PessimisticTarget(float reward, float q1_next, float q2_next,
                                      EpisodeEnd end, float gamma) noexcept {
  if (end == EpisodeEnd::kTerminal) return reward;
  return reward + gamma * std::min(q1_next, q2_next);
}

// Clipped smoothing noise on the target action, kept inside the actuator range.
void SmoothTargetAction(std::span<float> action, const Td3Config& config, std::mt19937& rng) {
  std::normal_distribution<float> gaussian(0.0F, config.smoothing.value);
  for (float& value : action) {
    const float noise = std::clamp(gaussian(rng), -config.smoothing_clip, config.smoothing_clip);
    value = std::clamp(value + noise, -config.action_limit, config.action_limit);
  }
}

// Polyak averaging over a flat parameter view, so a network's whole parameter
// set is one contiguous pass rather than a walk over nested structures.
void SoftUpdate(std::span<float> target, std::span<const float> online, float tau) noexcept {
  for (std::size_t i = 0; i < target.size(); ++i) {
    target[i] = tau * online[i] + (1.0F - tau) * target[i];
  }
}`,
        rationale:
          'The single critic becomes two with the minimum taken in the target, which flips the direction of the bias rather than shrinking it — an optimistic error compounds under a maximizer and a pessimistic one merely costs performance. The actor is delayed, clipped noise smooths the target action, and the done flag becomes a three-state enum because terminal and truncation need different bootstrap handling. The buffer becomes one flat allocation per field with a ring cursor, replacing a vector of per-step structs that allocated twice per step and was quadratic on eviction.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per buffer field; Polyak over a flat contiguous parameter view.',
      },
      'make-it-fast': {
        code: `// TD3 - fused twin critics, flat parameter vectors, contiguous replay.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <vector>

#include <Eigen/Dense>

// Both critics as ONE matrix multiply.
//
// Two separate networks mean two GEMMs per layer, each half the size and each
// too small to saturate anything. Stacking the two weight sets side by side
// into one matrix turns every layer into a single wider product - identical
// arithmetic, one kernel instead of two - and the two halves stay genuinely
// independent, which is what the min requires.
class FusedTwinCritic {
 public:
  FusedTwinCritic(std::size_t n_input, std::size_t hidden)
      // [hidden * 2, n_input]: rows 0..hidden-1 are critic one, the rest two.
      : w1_(static_cast<Eigen::Index>(hidden * 2), static_cast<Eigen::Index>(n_input)),
        b1_(static_cast<Eigen::Index>(hidden * 2)),
        w2_(2, static_cast<Eigen::Index>(hidden)),
        b2_(2),
        hidden_(static_cast<Eigen::Index>(hidden)) {}

  // Returns a (2 x batch) block: row 0 is critic one, row 1 is critic two.
  [[nodiscard]] Eigen::Matrix<float, 2, Eigen::Dynamic> Forward(
      const Eigen::MatrixXf& joint) const {
    // One GEMM for both critics. cwiseMax stays inside the expression template,
    // so the ReLU is applied as the product is consumed and no intermediate
    // hidden matrix is written out.
    const Eigen::MatrixXf hidden = ((w1_ * joint).colwise() + b1_).cwiseMax(0.0F);

    Eigen::Matrix<float, 2, Eigen::Dynamic> out(2, joint.cols());
    out.row(0) = w2_.row(0) * hidden.topRows(hidden_);
    out.row(1) = w2_.row(1) * hidden.bottomRows(hidden_);
    out.row(0).array() += b2_(0);
    out.row(1).array() += b2_(1);
    return out;
  }

  // The minimum is a reduction down the pair axis rather than a comparison
  // between two separately computed results.
  [[nodiscard]] static Eigen::VectorXf Pessimistic(
      const Eigen::Matrix<float, 2, Eigen::Dynamic>& pair) {
    return pair.colwise().minCoeff().transpose();
  }

 private:
  Eigen::MatrixXf w1_;
  Eigen::VectorXf b1_;
  Eigen::Matrix<float, 2, Eigen::Dynamic> w2_;
  Eigen::Vector2f b2_;
  Eigen::Index hidden_;
};

// Polyak over the entire network as ONE contiguous span.
//
// Unlike DQN's periodic target copy, this runs on EVERY step, so walking a
// nested parameter structure per update is a cost paid a million times. Laying
// every parameter out in one flat vector makes the soft update a single fused
// streaming pass that autovectorizes.
void PolyakFlat(float* __restrict target, const float* __restrict online,
                std::size_t count, float tau) noexcept {
  const float keep = 1.0F - tau;
  for (std::size_t i = 0; i < count; ++i) {
    target[i] = tau * online[i] + keep * target[i];
  }
}

// Replay with the joint [s; a] vector stored PRE-CONCATENATED.
//
// The critic always consumes state and action together, and the naive version
// builds that concatenation per sample - an allocation and a copy inside the
// hot loop. Storing it joined once at insertion means a minibatch gather is a
// straight contiguous copy with nothing assembled.
class JointReplay {
 public:
  JointReplay(std::size_t capacity, std::size_t n_state, std::size_t n_action)
      : capacity_(capacity),
        joint_width_(n_state + n_action),
        n_state_(n_state),
        joint_(capacity * (n_state + n_action), 0.0F),
        next_states_(capacity * n_state, 0.0F),
        rewards_(capacity, 0.0F),
        terminals_(capacity, 0) {}

  void Add(const float* __restrict state, const float* __restrict action, float reward,
           const float* __restrict next_state, bool terminal) noexcept {
    float* __restrict destination = joint_.data() + cursor_ * joint_width_;
    std::copy_n(state, n_state_, destination);
    std::copy_n(action, joint_width_ - n_state_, destination + n_state_);
    std::copy_n(next_state, n_state_, next_states_.data() + cursor_ * n_state_);
    rewards_[cursor_] = reward;
    terminals_[cursor_] = terminal ? 1 : 0;

    cursor_ = (cursor_ + 1) % capacity_;
    size_ = std::min(size_ + 1, capacity_);
  }

  // Gather a minibatch straight into the critic's input matrix: one contiguous
  // copy per sample, no concatenation and no temporary.
  void GatherJoint(const std::size_t* __restrict indices, std::size_t batch_size,
                   float* __restrict out) const noexcept {
    for (std::size_t sample = 0; sample < batch_size; ++sample) {
      const float* __restrict source = joint_.data() + indices[sample] * joint_width_;
      std::copy_n(source, joint_width_, out + sample * joint_width_);
    }
  }

 private:
  std::size_t capacity_;
  std::size_t joint_width_;
  std::size_t n_state_;
  std::vector<float> joint_;
  std::vector<float> next_states_;
  std::vector<float> rewards_;
  std::vector<std::uint8_t> terminals_;
  std::size_t cursor_ = 0;
  std::size_t size_ = 0;
};`,
        rationale:
          'Three removals, none touching the algorithm. Both critics become one wider weight matrix, so every layer is a single GEMM rather than two half-sized ones and the min becomes a column-wise reduction. Every parameter is laid out in one flat vector so the Polyak update — which unlike DQN\'s periodic copy runs on every step — is a single fused streaming pass instead of a walk over nested structures. And the replay stores the [s; a] vector pre-concatenated, since the critic always consumes them together and the naive version builds that concatenation inside the hot loop.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Stacking both critics into one weight matrix turns two half-sized GEMMs per layer into a single wider one, which is what the tuned kernel is built for.',
            tradeoff: 'The two critics now share a matrix, so anything wanting them treated separately — a per-critic learning rate, a staggered reset — has no natural place to hook in.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The Polyak update is one streaming pass over a flat parameter vector, and the ReLU stays inside the Eigen expression so no intermediate hidden matrix is written.',
            tradeoff: 'It requires every parameter to live in one contiguous allocation, which forces a layout the model structure would not otherwise choose and makes partial freezing awkward.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Storing [s; a] pre-concatenated means a minibatch gather is one contiguous copy per sample, with no concatenation or temporary built inside the hot loop.',
            tradeoff: 'The state is duplicated across the joint buffer and the next-state buffer, so replay memory grows by roughly the state width per transition.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The flat Polyak pass and the contiguous gather are simple streaming loops that autovectorize cleanly once optimization is enabled.',
            tradeoff: '-march=native produces a binary that may fault on older CPUs in a heterogeneous fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'One GEMM per critic layer instead of two; one streaming pass per Polyak update. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! DDPG - the deterministic policy gradient, transcribed.
//!
//! Two networks and one chain rule. The critic is fitted by Bellman
//! regression; the actor is trained by pushing its output uphill on the
//! critic's surface, which means dQ/da is computed explicitly and chained in.
//!
//! Watch what the actor's objective IS: no target and no quantity derived from
//! data. "Make the critic rate this action higher" is an optimizer pointed at
//! a learned function, and that is the whole difficulty.

pub struct StepResult {
    pub next_state: Vec<f64>,
    pub reward: f64,
    pub done: bool,
}

pub trait Environment {
    fn reset(&mut self) -> Vec<f64>;
    fn step(&mut self, action: &[f64]) -> StepResult;
}

/// Q(s, a) over the concatenation [s; a]. It must be differentiable in a -
/// that requirement is why this branch exists only for continuous control.
#[derive(Clone)]
pub struct Critic {
    pub w1: Vec<Vec<f64>>, // [hidden][state + action]
    pub b1: Vec<f64>,
    pub w2: Vec<f64>,      // [hidden]
    pub b2: f64,
}

/// A DETERMINISTIC policy: one action, not a distribution.
#[derive(Clone)]
pub struct Actor {
    pub w: Vec<Vec<f64>>, // [action][state]
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

/// One SGD step on the squared TD error, with dQ/da handed back.
///
/// The action gradient costs nothing extra: it is the same backward pass, read
/// off at the input layer instead of stopping at the weights.
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
            continue; // ReLU is closed here
        }
        let delta = grad_hidden[unit];
        for i in 0..joint.len() {
            grad_input[i] += delta * critic.w1[unit][i];
            critic.w1[unit][i] -= lr * delta * joint[i];
        }
        critic.b1[unit] -= lr * delta;
    }

    // Slice off the action half of the concatenation: that is dQ/da.
    grad_input[n_state..].to_vec()
}

/// tanh bounds the output to the actuator range. It is also a real failure
/// mode: a saturated tanh has a near-zero derivative, so an actor driven to
/// the bound stops learning while the critic keeps training.
pub fn actor_forward(actor: &Actor, state: &[f64], action_limit: f64) -> (Vec<f64>, Vec<f64>) {
    let mut pre_activation = vec![0.0; actor.w.len()];
    let mut action = vec![0.0; actor.w.len()];

    for index in 0..actor.w.len() {
        let mut total = 0.0;
        for i in 0..state.len() {
            total += actor.w[index][i] * state[i];
        }
        pre_activation[index] = total;
        action[index] = action_limit * total.tanh();
    }
    (action, pre_activation)
}

/// Chain dQ/da into the actor. ASCENT: the actor maximizes the critic.
///
/// da_k/dw[k][i] = action_limit * (1 - tanh(z_k)^2) * s[i], so the update is
/// dQ/da_k times that. Two networks joined by one chain rule, and the actor
/// inherits every error in the surface it is climbing.
pub fn actor_backward(
    actor: &mut Actor,
    state: &[f64],
    pre_activation: &[f64],
    dq_daction: &[f64],
    lr: f64,
    action_limit: f64,
) {
    for index in 0..pre_activation.len() {
        let squashed = pre_activation[index].tanh();
        let local = action_limit * (1.0 - squashed * squashed);
        let coefficient = dq_daction[index] * local;
        for i in 0..state.len() {
            actor.w[index][i] += lr * coefficient * state[i];
        }
    }
}

/// Polyak averaging: the target drifts continuously rather than jumping. DQN
/// copies its target periodically; here the actor is moving too, so a smoothly
/// drifting target suits the setting better than a step change.
pub fn soft_update(target: &mut [f64], online: &[f64], tau: f64) {
    for i in 0..target.len() {
        target[i] = tau * online[i] + (1.0 - tau) * target[i];
    }
}

pub struct Transition {
    pub state: Vec<f64>,
    pub action: Vec<f64>,
    pub reward: f64,
    pub next_state: Vec<f64>,
    pub terminal: bool,
}

#[allow(clippy::too_many_arguments)]
pub fn train(
    env: &mut dyn Environment,
    actor: &mut Actor,
    critic: &mut Critic,
    n_state: usize,
    n_action: usize,
    steps: usize,
    lr: f64,
    gamma: f64,
    tau: f64,
    action_limit: f64,
    noise_scale: f64,
    buffer_size: usize,
    warmup: usize,
    rand: &mut dyn FnMut() -> f64,
) {
    let mut target_actor = actor.clone();
    let mut target_critic = critic.clone();
    let mut buffer: Vec<Transition> = Vec::new();
    let mut state = env.reset();

    for step in 0..steps {
        // The policy is deterministic and supplies NO exploration. Noise comes
        // from outside, and its scale is in action units - which is why this
        // hyperparameter does not transfer between environments.
        let action = if step < warmup {
            (0..n_action).map(|_| (rand() * 2.0 - 1.0) * action_limit).collect::<Vec<f64>>()
        } else {
            let (mut a, _) = actor_forward(actor, &state, action_limit);
            for value in &mut a {
                let noise = (rand() * 2.0 - 1.0) * noise_scale;
                *value = (*value + noise).clamp(-action_limit, action_limit);
            }
            a
        };

        let result = env.step(&action);
        buffer.push(Transition {
            state: state.clone(),
            action: action.clone(),
            reward: result.reward,
            next_state: result.next_state.clone(),
            terminal: result.done,
        });
        if buffer.len() > buffer_size {
            buffer.remove(0);
        }

        state = if result.done { env.reset() } else { result.next_state };
        if buffer.len() < warmup {
            continue;
        }

        let pick = (rand() * buffer.len() as f64) as usize % buffer.len();
        let sample_state = buffer[pick].state.clone();
        let sample_action = buffer[pick].action.clone();
        let sample_next = buffer[pick].next_state.clone();
        let sample_reward = buffer[pick].reward;
        let sample_terminal = buffer[pick].terminal;

        // Bootstrap through the TARGET actor and TARGET critic, both drifting
        // slowly, so the regression target is approximately stationary while
        // the online networks move.
        let bootstrap = if sample_terminal {
            0.0 // no future past a terminal
        } else {
            let (next_action, _) = actor_forward(&target_actor, &sample_next, action_limit);
            let mut joint = sample_next.clone();
            joint.extend_from_slice(&next_action);
            critic_forward(&target_critic, &joint).0
        };

        let mut joint = sample_state.clone();
        joint.extend_from_slice(&sample_action);
        let (q, hidden) = critic_forward(critic, &joint);
        let td_error = sample_reward + gamma * bootstrap - q;
        critic_backward(critic, &joint, &hidden, td_error, lr, n_state);

        // The actor is evaluated at ITS OWN current output, not at the stored
        // action: the objective is "what would the critic say about what I
        // would do now", which is what makes this off-policy.
        let (current, pre_activation) = actor_forward(actor, &sample_state, action_limit);
        let mut actor_joint = sample_state.clone();
        actor_joint.extend_from_slice(&current);
        let (_, actor_hidden) = critic_forward(critic, &actor_joint);
        let dq = critic_backward(critic, &actor_joint, &actor_hidden, 0.0, 0.0, n_state);

        actor_backward(actor, &sample_state, &pre_activation, &dq, lr, action_limit);

        soft_update(&mut target_critic.w2, &critic.w2, tau);
        soft_update(&mut target_critic.b1, &critic.b1, tau);
        for unit in 0..critic.w1.len() {
            let online_row = critic.w1[unit].clone();
            soft_update(&mut target_critic.w1[unit], &online_row, tau);
        }
        for index in 0..actor.w.len() {
            let online_row = actor.w[index].clone();
            soft_update(&mut target_actor.w[index], &online_row, tau);
        }
    }
}`,
        profile: 'Two critic passes plus two target passes per sample. Nested Vecs scatter every row; each concatenation and every soft update allocates.',
      },
      'make-it-right': {
        code: `//! TD3 - typed errors, flat replay, twin critics, delayed actor.

use std::fmt;

/// Newtypes so an exploration noise scale and a target smoothing scale cannot
/// be transposed. Both are small positive floats in action units, and swapping
/// them changes what is being regularized with no visible symptom.
#[derive(Debug, Clone, Copy)]
pub struct ExplorationNoise(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct SmoothingNoise(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct ActionLimit(pub f32);

/// Terminal has no future. A time-limit truncation does, and must still be
/// bootstrapped. A single bool conflates them, and the resulting policy is
/// visibly short-sighted at the episode limit.
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
pub enum Td3Error {
    EmptyCapacity,
    BadTau,
    ZeroPolicyDelay,
    ClipBelowNoise,
    WidthMismatch { got: usize, expected: usize },
}

impl fmt::Display for Td3Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCapacity => write!(f, "capacity, state width and action width must be positive"),
            Self::BadTau => write!(f, "tau must be in (0, 1]"),
            Self::ZeroPolicyDelay => write!(f, "policy delay must be at least one"),
            Self::ClipBelowNoise => {
                write!(f, "clipping below the noise scale makes smoothing one-sided")
            }
            Self::WidthMismatch { got, expected } => {
                write!(f, "vector has width {got}, buffer expects {expected}")
            }
        }
    }
}

impl std::error::Error for Td3Error {}

/// A fixed-capacity ring over flat storage, one allocation per field. The naive
/// version pushes a struct holding three Vecs per step and removes from the
/// front when full, which allocates three times per step and is quadratic on
/// eviction.
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
    pub fn new(capacity: usize, n_state: usize, n_action: usize) -> Result<Self, Td3Error> {
        if capacity == 0 || n_state == 0 || n_action == 0 {
            return Err(Td3Error::EmptyCapacity);
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
    ) -> Result<(), Td3Error> {
        if state.len() != self.n_state || next_state.len() != self.n_state {
            return Err(Td3Error::WidthMismatch { got: state.len(), expected: self.n_state });
        }
        if action.len() != self.n_action {
            return Err(Td3Error::WidthMismatch { got: action.len(), expected: self.n_action });
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

/// The TD3 target: smoothed action, minimum over two independently initialized
/// critics.
///
/// The min is a deliberate change of BIAS DIRECTION, not a reduction in its
/// magnitude. Underestimating an action's value makes the actor avoid it,
/// which costs a bounded amount of performance; overestimating makes the actor
/// SEEK it, which compounds - because the actor is a maximizer and a spurious
/// peak is a maximum.
#[inline]
#[must_use]
pub fn pessimistic_target(
    reward: f32,
    q1_next: f32,
    q2_next: f32,
    end: EpisodeEnd,
    gamma: f32,
) -> f32 {
    if !end.bootstraps() {
        return reward;
    }
    reward + gamma * q1_next.min(q2_next)
}

/// Clipped smoothing noise on the target action, kept inside the actuator
/// range. It asserts that nearby actions have similar values, which is what
/// makes a critic artifact narrower than the noise unexploitable.
pub fn smooth_target_action(
    action: &mut [f32],
    noise: SmoothingNoise,
    clip: f32,
    limit: ActionLimit,
    sample_normal: &mut dyn FnMut() -> f32,
) {
    for value in action.iter_mut() {
        let perturbation = (sample_normal() * noise.0).clamp(-clip, clip);
        *value = (*value + perturbation).clamp(-limit.0, limit.0);
    }
}

/// Polyak averaging over a flat parameter slice, so a network's whole
/// parameter set is one contiguous pass rather than a walk over nested Vecs.
pub fn soft_update(target: &mut [f32], online: &[f32], tau: f32) {
    for (target_value, &online_value) in target.iter_mut().zip(online.iter()) {
        *target_value = tau * online_value + (1.0 - tau) * *target_value;
    }
}`,
        rationale:
          'The single critic becomes two with the minimum taken in the target, flipping the direction of the bias rather than shrinking it — under a maximizer an optimistic error compounds and a pessimistic one merely costs performance. Clipped noise smooths the target action, the done bool becomes an enum because terminal and truncation need different bootstrap handling, and newtypes separate two noise scales that are both small positive floats. The buffer becomes one flat allocation per field with a ring cursor, replacing a Vec of structs that allocated three times per step and was quadratic on eviction.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per buffer field; Polyak over a flat contiguous slice.',
      },
      'make-it-fast': {
        code: `//! TD3 - fused twin critics, flat parameter slices, pre-joined replay.

use ndarray::{s, Array2, ArrayView2, Axis};

/// Both critics as ONE matrix multiply.
///
/// Two separate networks mean two GEMMs per layer, each half the size and each
/// too small to saturate anything. Stacking the two weight sets side by side
/// into one matrix turns every layer into a single wider product - identical
/// arithmetic, one kernel instead of two - and the two halves stay genuinely
/// independent, which is what the min requires.
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
        out.slice_mut(s![.., 0])
            .assign(&left.dot(&self.w2.slice(s![.., 0])));
        out.slice_mut(s![.., 1])
            .assign(&right.dot(&self.w2.slice(s![.., 1])));
        out + &self.b2
    }

    /// The minimum is a reduction across the pair axis rather than a comparison
    /// between two separately computed results.
    #[must_use]
    pub fn pessimistic(pair: &Array2<f32>) -> Vec<f32> {
        pair.axis_iter(Axis(0))
            .map(|row| row[0].min(row[1]))
            .collect()
    }
}

/// Polyak over the entire network as ONE contiguous slice.
///
/// Unlike DQN's periodic target copy, this runs on EVERY step, so walking a
/// nested parameter structure per update is a cost paid a million times. Laying
/// every parameter out in one flat vector makes the soft update a single fused
/// zipped pass with the bounds checks elided.
#[inline]
pub fn polyak_flat(target: &mut [f32], online: &[f32], tau: f32) {
    let keep = 1.0 - tau;
    for (target_value, &online_value) in target.iter_mut().zip(online.iter()) {
        *target_value = tau * online_value + keep * *target_value;
    }
}

/// Replay with the joint [s; a] vector stored PRE-CONCATENATED.
///
/// The critic always consumes state and action together, and the naive version
/// builds that concatenation per sample - an allocation and a copy inside the
/// hot loop. Storing it joined once at insertion makes a minibatch gather a
/// straight contiguous copy with nothing assembled and nothing cloned.
pub struct JointReplay {
    capacity: usize,
    joint_width: usize,
    n_state: usize,
    joint: Vec<f32>,
    next_states: Vec<f32>,
    rewards: Vec<f32>,
    terminals: Vec<bool>,
    cursor: usize,
    size: usize,
}

impl JointReplay {
    #[must_use]
    pub fn new(capacity: usize, n_state: usize, n_action: usize) -> Self {
        let joint_width = n_state + n_action;
        Self {
            capacity,
            joint_width,
            n_state,
            // Sized exactly once. A ring that grew mid-training would copy
            // hundreds of megabytes while the agent waited on it.
            joint: vec![0.0; capacity * joint_width],
            next_states: vec![0.0; capacity * n_state],
            rewards: Vec::with_capacity(capacity),
            terminals: Vec::with_capacity(capacity),
            cursor: 0,
            size: 0,
        }
    }

    pub fn add(&mut self, state: &[f32], action: &[f32], reward: f32,
               next_state: &[f32], terminal: bool) {
        let offset = self.cursor * self.joint_width;
        self.joint[offset..offset + self.n_state].copy_from_slice(state);
        self.joint[offset + self.n_state..offset + self.joint_width].copy_from_slice(action);

        let state_offset = self.cursor * self.n_state;
        self.next_states[state_offset..state_offset + self.n_state].copy_from_slice(next_state);

        if self.size < self.capacity {
            self.rewards.push(reward);
            self.terminals.push(terminal);
            self.size += 1;
        } else {
            self.rewards[self.cursor] = reward;
            self.terminals[self.cursor] = terminal;
        }

        self.cursor = (self.cursor + 1) % self.capacity;
    }

    /// Gather a minibatch straight into the critic's input matrix: one
    /// contiguous copy per sample, no concatenation and no temporary.
    pub fn gather_joint(&self, indices: &[usize], out: &mut Array2<f32>) {
        for (sample, &index) in indices.iter().enumerate() {
            let source = &self.joint[index * self.joint_width..(index + 1) * self.joint_width];
            let mut row = out.slice_mut(s![sample, ..]);
            let row = row.as_slice_mut().expect("output rows are contiguous");
            row.copy_from_slice(source);
        }
    }
}`,
        rationale:
          'Three removals, none touching the algorithm. Both critics become one wider weight matrix, so every layer is a single GEMM rather than two half-sized ones and the min becomes a per-row reduction. Every parameter lives in one flat slice so the Polyak update — which unlike DQN\'s periodic copy runs on every step — is a single zipped pass rather than a walk over nested Vecs. And the replay stores [s; a] pre-concatenated, since the critic always consumes them together and the naive version built that concatenation inside the hot loop.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Stacking both critics into one weight matrix turns two half-sized GEMMs per layer into a single wider one, which is what the tuned kernel exists for.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, and the two critics now share a matrix, so treating them separately has no natural place to hook in.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Polyak runs over one flat parameter slice and the minibatch gather copies contiguous joint rows, so both hot paths stream rather than chasing nested structures.',
            tradeoff: 'It requires every parameter in one allocation and the output rows in standard layout, which a non-contiguous array turns into a runtime panic rather than a compile error.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The joint ring and its metadata are sized once at construction, so the hot path never reallocates — a ring that grew mid-training would copy hundreds of megabytes while the agent waited.',
            tradeoff: 'Capacity is fixed forever and the full allocation is taken up front, whether or not training ever fills it.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The Polyak pass is called for every parameter block on every step, so removing the call overhead matters at a million steps even though the body is trivial.',
            tradeoff: 'Inlining a function used in many places grows code size, which can cost instruction-cache locality elsewhere in the loop.',
          },
        ],
        libraryName: 'ndarray',
        profile: 'One GEMM per critic layer instead of two; one zipped pass per Polyak update. Illustrative, not a measured benchmark.',
      },
    },
  },
};
