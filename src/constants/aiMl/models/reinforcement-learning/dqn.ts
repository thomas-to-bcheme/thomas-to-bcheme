import type { AiMlModel } from '../../types';

/**
 * DQN — the entry where the value table becomes a neural network, and
 * everything that made tabular Q-learning provably safe stops applying.
 *
 * The interesting content is not "Q-learning with a network". It is the
 * two stabilizers — a replay buffer and a frozen target network — and
 * the fact that they are patches on a divergence that was never
 * eliminated, only made rare enough to ship.
 */
export const DQN: AiMlModel = {
  slug: 'dqn',
  name: 'Deep Q-Network (DQN)',
  aliases: ['Deep Q-learning', 'Double DQN', 'Dueling DQN', 'Rainbow'],
  category: 'reinforcement-learning',
  group: 'value-based',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Off-policy reinforcement learning with a neural function approximator. The paradigm is unchanged from tabular Q-learning; what changes is that the value function now generalizes across states it has never visited, which is the whole reason to do it and the source of every new failure mode.',

  intuition:
    'Tabular Q-learning stores one number per state-action pair, which means it cannot play a game whose screen has more configurations than there are atoms in anything. Replace the table with a network that maps a state to a vector of action values and the method generalizes: states that look alike get similar values without being visited separately. That substitution is the entire idea, and it breaks the convergence proof immediately. The proof relied on each update touching exactly one cell; a network update moves every state at once, including the state the target was just computed from, so the agent is chasing a target that moves because it moved. DQN makes this work with two blunt interventions. Experience goes into a large replay buffer and minibatches are drawn from it at random, which breaks the temporal correlation that makes consecutive samples nearly identical. And the target is computed from a separate copy of the network that is frozen for thousands of steps, which stops the target from moving every time the estimate does. Neither is a fix. They convert a method that reliably diverges into one that usually does not, and the residual failure is not an error message — it is a Q-value curve that climbs smoothly to a thousand while the agent gets worse. The right time to reach for DQN is when actions are discrete, a simulator can supply tens of millions of transitions, and a policy-gradient method is not a better fit. That is a narrower set of conditions than its fame suggests.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'L(\\theta) = \\mathbb{E}_{(s,a,r,s\') \\sim \\mathcal{D}} \\Bigl[ \\bigl( r + \\gamma \\max_{a\'} Q_{\\theta^-}(s\', a\') - Q_{\\theta}(s, a) \\bigr)^2 \\Bigr]',
      symbols: [
        { symbol: '\\theta^-', meaning: 'the target network: a frozen copy of the weights, refreshed every few thousand steps, whose only job is to stop the target moving with the estimate' },
        { symbol: '\\mathcal{D}', meaning: 'the replay buffer — a large pool of past transitions sampled uniformly, which is what makes the minibatch approximately i.i.d.' },
        { symbol: '\\max_{a\'}', meaning: 'the greedy bootstrap, off-policy and unchanged from tabular Q-learning; the source of the maximization bias Double DQN exists to remove' },
        { symbol: '\\gamma', meaning: 'the discount, which also bounds the magnitude a diverging value estimate can reach before it is visible' },
      ],
    },
    reading:
      'Read literally, this is a regression: predict the bootstrapped return of the action you took, squared error, gradient descent. Two things make that reading misleading in ways that matter. First, it is not the gradient of anything. The target contains the parameters, and the derivative through it is deliberately discarded — this is a semi-gradient method, and the quantity being descended is not the gradient of L or of any other function. That is why nothing here has the convergence guarantee an ordinary regression would, and why "the loss went down" is not evidence that learning is working. Second, the distribution is not fixed. The buffer fills with whatever the current policy visits, so the regression problem changes as the policy does, and old transitions describe a world the agent has left. Put these together with function approximation and you have the deadly triad — bootstrapping, off-policy sampling, and approximation — which is known to diverge and which DQN does not escape. The replay buffer and the target network narrow the window in which it happens rather than closing it. In practice the squared error is also replaced by a Huber loss, because a single transition with an outsized TD error would otherwise produce a gradient large enough to destroy the network in one step, and rewards are clipped to a fixed range for the same reason. Both are admissions that the objective as written is not stable enough to optimize directly.',
  },

  optimization: {
    method: 'Semi-gradient descent on the squared (in practice Huber) TD error, with Adam or RMSProp, uniform replay, and a periodically refreshed target network',
    updateRule: {
      formula:
        '\\theta \\leftarrow \\theta - \\alpha \\nabla_{\\theta} \\, \\ell_{\\delta}\\bigl( y - Q_{\\theta}(s,a) \\bigr), \\qquad y_{\\text{DDQN}} = r + \\gamma \\, Q_{\\theta^-}\\bigl(s\', \\arg\\max_{a\'} Q_{\\theta}(s\', a\')\\bigr)',
      symbols: [
        { symbol: 'y_{\\text{DDQN}}', meaning: 'the Double DQN target: the online network selects the action, the target network values it, which removes the bias from taking a max over noisy estimates' },
        { symbol: '\\ell_{\\delta}', meaning: 'Huber loss — quadratic near zero, linear beyond delta, so one anomalous TD error cannot produce a network-destroying gradient' },
        { symbol: '\\nabla_{\\theta}', meaning: 'taken through the prediction only, never through the target; the discarded term is what makes this a semi-gradient rather than a gradient' },
        { symbol: '\\alpha', meaning: 'the learning rate, typically 1e-4 and an order of magnitude below what supervised training of the same network would tolerate' },
      ],
    },
    rationale:
      'Everything in a working DQN is a countermeasure to a specific pathology, and the method is best learned as that list. Replay exists because consecutive transitions are almost the same sample, and training a network on a strongly autocorrelated stream makes it fit the last few seconds and forget everything else. The target network exists because a bootstrapped target computed from the network being updated is a feedback loop, and freezing it for several thousand steps turns a moving target into a sequence of stationary regression problems. Double DQN exists because a max over noisy estimates systematically selects whichever action got lucky, and in a table that bias was an annoyance while under approximation it compounds into value estimates that climb without bound. Huber loss and reward clipping exist because a single large TD error times a network-sized gradient is enough to destroy the parameters irrecoverably. Dueling heads exist because in most states the action barely matters, and forcing the network to learn |A| nearly identical numbers wastes its capacity on a quantity with no decision content. Prioritized replay exists because uniform sampling spends most of its budget on transitions the network already predicts correctly. None of these is optional in a competitive implementation, and the compounding of them is what Rainbow measured: the combination substantially outperforms the sum of the parts, which is the real lesson — DQN is not one algorithm but a stack of stabilizers, and removing any one of them degrades a run in a way that looks like a hyperparameter problem rather than a missing component.',
    hyperparameters: [
      { name: 'replay buffer size', role: 'How much history stays available. Too small and the network overfits the recent policy and forgets; too large and most samples describe a policy the agent abandoned long ago', typicalRange: '1e5 to 1e6 transitions' },
      { name: 'target network update period', role: 'The single most important stability knob. Longer means a more stationary target and slower propagation of value information; shorter means faster learning and a return of the feedback loop', typicalRange: '1,000 to 10,000 gradient steps' },
      { name: 'learning rate', role: 'An order of magnitude below supervised training of the same architecture, because the regression targets are non-stationary and a large step chases noise into divergence', typicalRange: '1e-4 to 2.5e-4 with Adam' },
      { name: 'epsilon schedule', role: 'Exploration, annealed over the first fraction of training. A floor is kept rather than annealing to zero, because a deterministic greedy policy in a deterministic environment stops generating new data entirely', typicalRange: '1.0 to 0.01 over ~1e6 steps' },
      { name: 'batch size', role: 'Averages the gradient over independent transitions; larger batches stabilize the semi-gradient step at a proportional cost per update', typicalRange: '32 to 512' },
      { name: 'train frequency and warmup', role: 'Gradient steps per environment step, and how many transitions are collected before the first update. Training on an almost-empty buffer is training on one correlated episode', typicalRange: 'one update per 4 steps; 50k step warmup' },
      { name: 'n-step return length', role: 'Bootstraps after n rewards instead of one, trading the bias of a bad value estimate for the variance of a longer sampled return. The cheapest real improvement available', typicalRange: '1 to 5' },
      { name: 'discount (gamma)', role: 'The effective horizon. Above 0.99 the fixed point becomes numerically delicate under approximation, and small value errors compound over the longer horizon', typicalRange: '0.99, rarely above' },
    ],
    convergence:
      'There is no convergence guarantee, and this is the central fact about the method rather than a footnote. Combining bootstrapping, off-policy sampling, and function approximation is the deadly triad, and counterexamples where the parameters diverge on trivially small problems have been known since the early 1990s. DQN does not resolve the triad; the replay buffer and the target network reduce the frequency and severity of the divergence enough that the method works on many problems. What follows from that is a distinctive set of failure modes. The most dangerous is silent value explosion: Q-estimates climb smoothly into the hundreds or thousands while the loss stays small, because the network is tracking its own inflated targets consistently, and the policy degrades throughout without a single error being raised. Monitoring the mean predicted Q against the actual discounted return observed is the only reliable detection, and it is routinely omitted. The second is catastrophic forgetting when the buffer is too small relative to how fast the policy moves, which appears as periodic collapses in return that recover and collapse again. The third is seed variance: identical code and hyperparameters across different random seeds can produce runs that solve the task and runs that never leave the floor, so any single-seed comparison between two variants is uninformative, and reporting a median over at least five seeds is the minimum credible protocol. Where the method does succeed, the qualitative pattern is a long flat stretch with no apparent progress followed by a fast rise, because the value function must become roughly correct globally before the greedy policy derived from it becomes any good.',
    complexity:
      'Per gradient step: one forward and backward pass over a minibatch through the online network, plus one forward pass through the target network, so roughly three network passes per update at batch size B. Per environment step: one forward pass to act. Wall-clock is usually dominated by environment simulation rather than by the network, which is why vectorized environments matter more than a faster GPU for most problems. Memory is dominated by the replay buffer: one million transitions of stacked 84x84 frames is around 7 GB if frames are stored as uint8 and shared between consecutive transitions, and around four times that if the stacking is materialized per transition — a distinction that decides whether the buffer fits in RAM. Sample complexity is the binding cost: tens of millions of environment steps for an Atari-scale task, which makes a fast simulator a hard prerequisite rather than a convenience.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'Forecasting has no action to value and no state the forecaster influences, so the one structure this method exploits — that a decision now changes what is observed next — is absent; the moment a forecast drives a decision the problem belongs under control-and-operations instead.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting on them, and a large TD error here is a statement about an under-trained region of the value network rather than about anything unusual in the data — the same quantity prioritized replay uses to decide what to train on next.',
      },
      optimization: {
        fit: 'primary',
        how: 'Learn a policy for a sequential decision problem with discrete actions by regressing action values against bootstrapped targets, with a network supplying generalization across states that were never visited. The policy is the argmax over the network output; it is never represented explicitly.',
        where: [
          'Sequential decisions over a state space far too large to enumerate, where the tabular methods stop being an option at all',
          'The deadly triad as a concrete engineering problem rather than a theoretical caution — bootstrapping, off-policy data, and approximation combined',
          'Stabilization as a design discipline: replay for decorrelation, a frozen target for stationarity, Double DQN for the maximization bias, Huber for gradient magnitude',
          'Off-policy learning as the property that makes replay legal, and therefore makes sample reuse and learning from logged data possible',
        ],
        why: 'The pivotal entry in this category, because it is where the guarantees end and engineering judgment starts. Three things transfer beyond reinforcement learning. The first is that a bootstrapped target is a feedback loop, and any system that fits a model to targets derived from its own current output needs an explicit mechanism to break the loop — freezing a copy is the simplest one and it recurs far outside RL. The second is that a max over noisy estimates is biased upward, always, and the cleaner the estimator looks the easier that is to miss; the Double DQN fix of separating selection from evaluation is the general remedy. The third is the monitoring lesson: this method fails by producing confident, smoothly increasing, entirely wrong numbers, and the only detection is comparing predictions against realized outcomes. A loss curve cannot see it. Where DQN is the wrong choice is equally instructive — continuous actions make the argmax intractable and call for DDPG or SAC, an on-policy problem with an expensive simulator is better served by PPO, and a problem with no state to carry forward is a bandit and should be treated as one.',
        featurization: [
          'Stack several consecutive observations, or use a recurrent encoder, when a single frame is not Markov — velocity is not observable from one image',
          'Clip or normalize rewards to a fixed scale, since the loss magnitude and therefore the gradient magnitude are set by the reward units',
          'Store frames once as uint8 and stack by index at sample time; materializing the stack per transition multiplies buffer memory by the stack depth',
          'Warm up the buffer before the first gradient step, because training on a nearly empty buffer is training on one correlated episode',
        ],
        evaluation:
          'Median return over at least five random seeds, with the interquartile range reported — single-seed comparisons between variants are uninformative, because seed variance on the same code routinely exceeds the difference between two genuinely different algorithms. Evaluate a separate greedy or low-epsilon policy periodically rather than reading the training return, which is contaminated by exploration. And plot mean predicted Q against the realized discounted return on the same axes: their divergence is the only visible symptom of the failure mode that matters most.',
        pitfalls: [
          'Treating a falling loss as evidence of learning, when a network tracking its own inflated targets has a small loss and a worthless policy',
          'Comparing variants on one seed each, where the difference observed is usually seed variance',
          'Bootstrapping past a terminal state, which injects a fictional future return and is the most common implementation bug',
          'Confusing the end of an episode with a time-limit truncation, which is not terminal and must still be bootstrapped',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Learn a discrete control policy — a setpoint from a menu, a dispatch choice, a mode switch — from simulated interaction, with a network generalizing across a continuous sensor state that no table could index. Deployment is a frozen network evaluated greedily, with exploration disabled.',
        where: [
          'Dispatch and routing over a discrete action menu with a high-dimensional state description',
          'Discrete setpoint or mode selection in process control, where the choice set is small but the state is continuous and large',
          'Inventory and replenishment policies with discrete order quantities and a long-horizon cost',
          'Traffic signal control and similar scheduling problems where a simulator already exists and is the reason the method is feasible',
        ],
        why: 'The natural applied home, and the qualifier that decides most projects is the simulator. DQN needs tens of millions of transitions and learns from a stream it partly generates, so a system that cannot be simulated faithfully cannot be trained on — and a system that can be simulated faithfully often admits a classical optimizer or a model-predictive controller that comes with guarantees this method lacks. The honest decision rule is to reach for DQN when the action set is discrete and small, the state is too rich to enumerate, the horizon is long enough that greedy heuristics visibly leave value behind, and a simulator already exists. Two cautions carry real weight in operations. The first is that off-policy learning from historical logs, which is the property that makes this method attractive to teams with years of data, still requires the logged actions to have covered the action space — logs generated by a deterministic legacy controller contain no information about the actions it never took, and the network will extrapolate confidently into exactly that gap. The second is that a greedy argmax over a network output has no notion of a constraint; safety must come from an interlock outside the policy, not from the reward function, because a reward penalty is a preference and a constraint is not.',
        featurization: [
          'Include every sensor the decision depends on in the state, since a violated Markov assumption shows up as an unlearnable plateau rather than an error',
          'Normalize observations to a consistent scale; a network trained on raw sensor units learns slowly and generalizes badly across ranges',
          'Encode constraint proximity explicitly, because the network learns what is in the state and infers nothing from what is not',
          'Check that historical logs actually explored the action set before attempting to learn from them offline',
        ],
        evaluation:
          'Simulated return against the incumbent controller on identical scenarios, plus constraint violations counted separately rather than averaged into the return — a policy that is better on average and breaches a limit is not better. Before deployment, shadow-run the frozen policy against the live controller and compare decisions, since the sim-to-real gap surfaces as systematic disagreement in specific regimes rather than as uniformly degraded performance.',
        pitfalls: [
          'Learning from logs produced by a deterministic legacy controller, which leaves the network extrapolating into actions never observed',
          'Expressing a hard constraint as a reward penalty, which makes it negotiable to an optimizer that is explicitly trading it off',
          'Leaving exploration enabled at deployment, so a production controller periodically takes a random action',
          'Trusting a simulator that was validated on the incumbent policy\'s operating region, which is precisely the region the new policy will leave',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Treat a session as a sequence of decisions and learn action values for a narrowed candidate set, optimizing long-horizon session or retention value rather than the immediate click a supervised ranker maximizes. Off-policy learning is what makes logged impressions usable as training data.',
        where: [
          'Slate or strategy selection over a small candidate set produced by an upstream retrieval stage',
          'Long-horizon objectives — session length, return visits — that a per-impression supervised loss cannot express',
          'Sequential surfaces where an early recommendation changes what the user does next, which is the structure that makes this a control problem at all',
          'Settings with large logged interaction histories, since being off-policy is what allows them to be replayed',
        ],
        why: 'A real but demanding fit, and the demands are what usually decide it. The attraction is genuine: a supervised ranker optimizes the next click and is structurally unable to represent the fact that a recommendation changes the state a user is in, while a value-based method optimizes the discounted future directly. Three obstacles stand in the way. The action space must be narrowed to something the network can produce a value for, so retrieval has to come first and the method operates on a candidate set rather than a catalogue. The reward must be defined over a horizon long enough to matter and short enough to observe, and picking it is the hardest modelling decision in the project rather than a detail. And offline evaluation is unreliable here in a way it is not elsewhere — logged data reflects the policy that generated it, and off-policy estimates of a new policy have variance that grows with how much the two differ, which is exactly the case where an estimate is needed. The practical consequence is that online experiments decide, which makes iteration slow and expensive. Where teams succeed, it is usually with a small discrete strategy space rather than item-level actions, and with a policy-gradient method as a serious alternative that is often the better one.',
        featurization: [
          'Narrow the action set with a retrieval stage first; a network cannot emit a value per item over a catalogue',
          'Define the reward over an explicit horizon and state it as a modelling decision, because the discount is choosing what the system optimizes',
          'Keep the behaviour policy\'s action probabilities in the logs, since every off-policy estimator needs them and they cannot be recovered later',
          'Include session context in the state, or the problem collapses to a contextual bandit with extra machinery and no extra benefit',
        ],
        evaluation:
          'Online A/B tests are the decision; off-policy estimates are for triage only and their variance grows precisely when the candidate policy differs most from the logged one. Report the long-horizon metric the system was built to optimize, not click-through, since improving click-through was never the reason to take on this complexity.',
        pitfalls: [
          'Item-level action spaces, where the network has nothing to emit a value over',
          'Off-policy estimates trusted beyond triage, where their variance is largest exactly when the decision matters',
          'Logged propensities never recorded, which makes every correction method unavailable after the fact',
          'A state with no session context, which makes the problem a contextual bandit dressed up as control',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'A convolutional encoder maps raw pixels to action values, trained end to end by the TD error alone — the representation is learned from reward rather than from labels, and no vision objective appears anywhere in the loss.',
        where: [
          'Visual control from pixels, where perception and policy are trained as one network rather than as a pipeline',
          'Frame stacking as the standard answer to a single image being non-Markov, since velocity is not visible in one frame',
          'Reward-driven representation learning as a study object — what features emerge when the only supervision is a scalar',
          'Auxiliary self-supervised losses added to the encoder, which is the standard remedy for how weak that supervision is',
        ],
        why: 'Included because it is instructive rather than because DQN is a vision method — it is not, and treating it as one is the error to avoid. What it demonstrates is how little supervision a convolutional encoder can be trained on: a scalar reward, delayed and sparse, is many orders of magnitude less information per sample than a label, and the resulting sample requirements show it. Tens of millions of frames to learn a representation that a supervised task would fit in thousands is the cost of the substitution, and it is the clearest available argument for why pretraining a visual encoder separately and freezing it is usually the better engineering choice. The pathologies are also specific: the encoder is being trained against a non-stationary target, so the features themselves drift while the value head is trying to fit them, which is a moving foundation the supervised setting never has. If the actual task is a vision task — detection, segmentation, classification — this is the wrong tool by a wide margin. It earns its place only when the output is an action and the input happens to be pixels.',
        featurization: [
          'Stack consecutive frames or use a recurrent encoder; one frame does not contain velocity and the problem is not Markov without it',
          'Store frames as uint8 and convert at sample time, since the buffer and not the network is what exhausts memory',
          'Downsample and grayscale aggressively — the resolution needed for control is far below the resolution needed for recognition',
          'Consider a pretrained frozen encoder, because reward is a far weaker supervisory signal than labels and rarely the better source of features',
        ],
        evaluation:
          'Return, not any vision metric — the encoder exists to support a policy and its features are only as good as the decisions they enable. If representation quality is the actual question, probe the frozen features on a supervised task, which tends to reveal that they encode what the reward depended on and discard everything else.',
        pitfalls: [
          'Reaching for this on an actual vision task, where a supervised model is better by orders of magnitude in both accuracy and sample cost',
          'Materializing stacked frames per transition, which multiplies replay memory by the stack depth and is the usual reason the buffer will not fit',
          'Expecting general visual features from reward supervision, which produces representations narrowly specialized to the reward',
          'Ignoring that the encoder is fitting a non-stationary target, so the features drift underneath the value head throughout training',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The expensive entry in this category by a wide margin. Tens of millions of environment steps for an Atari-scale task, one gradient step per handful of environment steps, and three network passes per gradient step. Wall-clock is usually dominated by the simulator rather than the network, which makes vectorized environments a larger lever than a faster accelerator on most problems. Buffer memory is the other hard constraint: a million transitions of stacked frames is a few gigabytes stored as uint8 with frames shared, and several times that if the stacking is materialized. Budget for at least five seeds, because a single run is not evidence. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One forward pass and an argmax — milliseconds on CPU for a small network, and the policy is never represented separately from the value function. Serving is unremarkable; what deserves attention is that the deployed artefact is a frozen network whose outputs are absolute value estimates, and those estimates are commonly inflated even in a policy that performs well. Rank order is what the policy uses and rank order is what can be trusted; the magnitudes should not be shown to anyone as expected returns.',
    retrainingCadence:
      'Retrained rather than updated continuously in almost every production setting, because online learning against live traffic means a live system taking exploratory actions and a value function that can silently diverge without anyone noticing. The usual arrangement is periodic offline retraining in a simulator against refreshed data, followed by shadow evaluation and a staged rollout. Cadence is set by how fast the environment moves; a drifted environment invalidates the simulator before it invalidates the policy, which means simulator revalidation is the real trigger.',
    driftAndMonitoring: [
      'Mean predicted Q against the realized discounted return on the same axes — their divergence is the only visible symptom of value explosion, and a loss curve cannot show it',
      'Realized return under the deployed policy versus the incumbent, on matched scenarios rather than in aggregate',
      'Action distribution over time: a policy collapsing onto one action is a value function that has stopped discriminating, which looks like stability and is not',
      'State-distribution shift between the simulator and production, since the network extrapolates confidently in regions it never trained on',
      'TD-error distribution on fresh transitions, whose growth means the environment moved away from what the network learned',
      'Epsilon at serving, which must be zero or near it — an exploring production controller is a bug that looks like variance',
    ],
    productionGotchas: [
      'The values can diverge silently. Q-estimates climbing into the thousands with a small loss and a degrading policy raise no error anywhere, and only a prediction-against-realized-return plot exposes it',
      'Bootstrapping past a terminal state injects a fictional future return — the most common implementation bug in the method and one that produces a plausible-looking training curve',
      'A time-limit truncation is not a terminal state. Treating it as one teaches the agent that the world ends at the episode limit, and the resulting policy is visibly short-sighted',
      'Seed variance often exceeds the difference between algorithm variants, so a single-seed comparison is not evidence and a five-seed median is the minimum credible protocol',
      'Materializing stacked frames per transition multiplies buffer memory by the stack depth, which is usually why a buffer that should fit does not',
      'Reward scale sets gradient scale. An unclipped reward of a thousand produces a gradient large enough to destroy the network in one step, which is what Huber loss and reward clipping exist to prevent',
      'Learning offline from logs produced by a deterministic policy leaves the network extrapolating into actions never taken, with confident values and no data behind them',
      'Exploration left enabled at serving means the production policy periodically acts at random — the same trap as tabular Q-learning, with far more expensive consequences',
    ],
  },

  assumptions: [
    'The environment is a Markov decision process in the state actually given to the network — frame stacking exists because a single observation usually is not',
    'The action space is discrete and small enough to emit one value per action, which is what rules out continuous control entirely',
    'Similar states have similar values, which is the generalization assumption the network embodies and the reason a table was worth replacing',
    'Transitions are cheap enough to collect tens of millions of them, which in practice means a simulator',
    'The replay buffer is a reasonable approximation of a stationary distribution, which it is not, and the whole stabilization stack exists to make the gap survivable',
    'Rewards are on a bounded, known scale, or have been clipped onto one, because gradient magnitude is set by reward magnitude',
  ],

  pros: [
    {
      point: 'Generalizes across states, which makes state spaces that no table can index tractable',
      context:
        'This is the entire reason to accept the loss of every tabular guarantee. A network gives similar values to similar states without visiting them separately, and that is what moved value-based RL from gridworlds to raw pixels',
    },
    {
      point: 'Off-policy, so experience can be stored and reused',
      context:
        'The replay buffer is only legal because the method is off-policy, and it is what makes DQN dramatically more sample-efficient than an on-policy method per transition collected. It is also what allows learning from logged data at all',
    },
    {
      point: 'The stabilizers are modular and each addresses a nameable pathology',
      context:
        'Replay for correlation, a frozen target for the feedback loop, Double DQN for maximization bias, Huber for gradient magnitude, dueling for wasted capacity, prioritization for wasted samples. That decomposition is rare and it makes the method unusually teachable',
    },
    {
      point: 'The policy is free once the values exist',
      context:
        'No separate policy network, no actor to keep synchronized with a critic, and no policy-gradient variance to control. For discrete actions this is a genuine simplification over actor-critic methods',
    },
    {
      point: 'The improvements compose better than they add',
      context:
        'Rainbow\'s result — that combining the extensions substantially outperforms the sum of their individual contributions — is the practical argument for treating the full stack as the method rather than as optional refinements',
    },
  ],

  cons: [
    {
      point: 'No convergence guarantee, and the divergence it can suffer is silent',
      context:
        'Bootstrapping plus off-policy sampling plus function approximation is the deadly triad and DQN does not escape it. The characteristic failure is a smoothly rising value curve, a small loss, and a policy getting steadily worse, with no error raised anywhere',
    },
    {
      point: 'Extremely sample-inefficient',
      context:
        'Tens of millions of environment steps for tasks a person learns in minutes. This makes a fast, faithful simulator a prerequisite rather than a convenience, and it rules the method out wherever transitions are expensive or physical',
    },
    {
      point: 'Discrete actions only',
      context:
        'The argmax over actions is the mechanism, and it does not exist for a continuous action space. Discretizing a continuous space works up to two or three dimensions and then dies to the exponential, which is why DDPG, TD3 and SAC exist',
    },
    {
      point: 'Seed variance frequently exceeds the effect being measured',
      context:
        'Identical code and hyperparameters can produce a run that solves the task and a run that never starts. Any comparison on fewer than about five seeds is measuring the seed, which is a large fraction of published comparisons',
    },
    {
      point: 'Hyperparameter sensitivity concentrated in unintuitive places',
      context:
        'Target update period, buffer size and reward scale matter far more than network width or depth, and none of them behaves like a familiar supervised hyperparameter. Tuning intuition transferred from supervised learning misleads here',
    },
    {
      point: 'Overestimation is built into the update',
      context:
        'A max over noisy estimates is biased upward by construction. Double DQN reduces it substantially and does not remove it, and the residual bias is why reported value estimates should never be presented as expected returns',
    },
  ],

  relatedSlugs: ['q-learning', 'sarsa', 'td-learning', 'ddpg-td3', 'ppo-trpo', 'cnn'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DQN - the whole method transcribed, network included.

No autodiff and no tensors: a two-layer MLP with hand-written backprop, so the
semi-gradient is visible as code. Watch for where the gradient is NOT taken -
through the target - because that omission is the entire reason none of the
usual convergence results apply here.
"""

import math
import random


def make_network(n_inputs, n_hidden, n_actions):
    """Weights as lists of lists. Small random init, never zeros: identical
    hidden units receive identical gradients and stay identical forever."""
    scale = 1.0 / math.sqrt(n_inputs)
    return {
        "w1": [[random.uniform(-scale, scale) for _ in range(n_inputs)] for _ in range(n_hidden)],
        "b1": [0.0] * n_hidden,
        "w2": [[random.uniform(-scale, scale) for _ in range(n_hidden)] for _ in range(n_actions)],
        "b2": [0.0] * n_actions,
    }


def copy_network(net):
    """The target network is a frozen snapshot of the online one. Freezing it
    is what stops the target moving every time the estimate does."""
    return {
        "w1": [row[:] for row in net["w1"]],
        "b1": net["b1"][:],
        "w2": [row[:] for row in net["w2"]],
        "b2": net["b2"][:],
    }


def forward(net, state):
    """Returns (q_values, hidden). The hidden activations are kept because the
    backward pass needs them and recomputing them would be the same work."""
    hidden = []
    for row, bias in zip(net["w1"], net["b1"]):
        total = bias
        for weight, feature in zip(row, state):
            total += weight * feature
        hidden.append(total if total > 0.0 else 0.0)        # ReLU

    q_values = []
    for row, bias in zip(net["w2"], net["b2"]):
        total = bias
        for weight, activation in zip(row, hidden):
            total += weight * activation
        q_values.append(total)

    return q_values, hidden


def backward(net, state, hidden, action, td_error, lr):
    """One SGD step on the squared TD error, for the taken action only.

    The derivative of (y - Q(s,a))^2 with respect to theta is
    -2 (y - Q(s,a)) dQ(s,a)/dtheta. But y depends on theta too, through the
    target network, and that dependence is simply not differentiated. The
    discarded term is what makes this a SEMI-gradient method: the direction
    being descended is not the gradient of this loss or of any other function.
    """
    # Only the taken action's output unit appears in the loss at all. The
    # other |A| - 1 outputs get no gradient, which is why one transition
    # teaches the network about exactly one action.
    grad_output = -td_error

    grad_hidden = [0.0] * len(hidden)
    for index, weight in enumerate(net["w2"][action]):
        grad_hidden[index] = grad_output * weight
        net["w2"][action][index] -= lr * grad_output * hidden[index]
    net["b2"][action] -= lr * grad_output

    for unit in range(len(hidden)):
        if hidden[unit] <= 0.0:
            continue                                        # ReLU is closed here
        delta = grad_hidden[unit]
        for index, feature in enumerate(state):
            net["w1"][unit][index] -= lr * delta * feature
        net["b1"][unit] -= lr * delta


def train(env, n_inputs, n_actions, steps=200_000, n_hidden=64, lr=1e-3,
          gamma=0.99, batch_size=32, buffer_size=50_000, target_period=1_000,
          warmup=1_000, epsilon_start=1.0, epsilon_end=0.05, epsilon_steps=50_000):
    online = make_network(n_inputs, n_hidden, n_actions)
    target = copy_network(online)

    buffer = []                  # (state, action, reward, next_state, done)
    state = env.reset()

    for step in range(steps):
        fraction = min(1.0, step / epsilon_steps)
        epsilon = epsilon_start + fraction * (epsilon_end - epsilon_start)

        if random.random() < epsilon:
            action = random.randrange(n_actions)
        else:
            q_values, _ = forward(online, state)
            action = max(range(n_actions), key=lambda a: q_values[a])

        next_state, reward, done = env.step(action)

        buffer.append((state, action, reward, next_state, done))
        if len(buffer) > buffer_size:
            buffer.pop(0)                                   # a ring buffer, by hand

        state = env.reset() if done else next_state

        # Training on a nearly empty buffer is training on one correlated
        # episode, which is precisely what replay exists to prevent.
        if len(buffer) < warmup:
            continue

        for _ in range(batch_size):
            # Uniform sampling is the decorrelation mechanism. Consecutive
            # transitions are almost the same sample; a network trained on
            # that stream fits the last few seconds and forgets the rest.
            s, a, r, s_next, terminal = random.choice(buffer)

            # The bootstrap comes from the FROZEN copy. Taking it from the
            # online network closes a feedback loop between the estimate and
            # its own target, which is the configuration that diverges.
            if terminal:
                bootstrap = 0.0                             # no future past a terminal
            else:
                next_q, _ = forward(target, s_next)
                bootstrap = max(next_q)

            y = r + gamma * bootstrap
            q_values, hidden = forward(online, s)
            td_error = y - q_values[a]

            backward(online, s, hidden, a, td_error, lr)

        if step % target_period == 0:
            # Refresh the frozen copy. Too often and the feedback loop comes
            # back; too rarely and value information stops propagating at all.
            target = copy_network(online)

    return online`,
        profile: 'One scalar multiply-accumulate per weight per sample, in the interpreter. Roughly six orders of magnitude off a real implementation.',
      },
      'make-it-right': {
        code: `"""DQN - typed, Double-Q targets, Huber loss, truncation handled correctly."""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple, Protocol

import numpy as np
import torch
from torch import Tensor, nn


class Transition(NamedTuple):
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    # Terminal means the MDP ended and there is no future. Truncated means the
    # episode hit a wall-clock or step limit and the future is still there.
    # Collapsing the two teaches the agent the world ends at the time limit,
    # and the resulting policy is visibly short-sighted.
    terminal: bool


class Environment(Protocol):
    def reset(self) -> np.ndarray: ...
    def step(self, action: int) -> tuple[np.ndarray, float, bool, bool]: ...


@dataclass(frozen=True)
class DqnConfig:
    n_inputs: int
    n_actions: int
    hidden: tuple[int, ...] = (128, 128)
    learning_rate: float = 1e-4
    gamma: float = 0.99
    batch_size: int = 32
    buffer_size: int = 100_000
    warmup_steps: int = 5_000
    target_update_period: int = 2_000
    train_frequency: int = 4
    grad_clip_norm: float = 10.0
    huber_delta: float = 1.0

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma < 1.0:
            raise ValueError(f"gamma must be in [0, 1), got {self.gamma}")
        if self.warmup_steps < self.batch_size:
            raise ValueError("warmup must exceed the batch size, or the first batch repeats samples")
        if self.n_actions < 2:
            raise ValueError("a single-action problem is not a control problem")


class ReplayBuffer:
    """A fixed-capacity ring over pre-allocated arrays.

    A list of Python tuples reallocates, fragments, and costs a gather per
    sample. One contiguous array per field costs one fancy-index per batch.
    """

    def __init__(self, capacity: int, n_inputs: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be positive")
        self._states = np.zeros((capacity, n_inputs), dtype=np.float32)
        self._next_states = np.zeros((capacity, n_inputs), dtype=np.float32)
        self._actions = np.zeros(capacity, dtype=np.int64)
        self._rewards = np.zeros(capacity, dtype=np.float32)
        self._terminals = np.zeros(capacity, dtype=np.bool_)
        self._capacity = capacity
        self._cursor = 0
        self._size = 0

    def __len__(self) -> int:
        return self._size

    def add(self, transition: Transition) -> None:
        index = self._cursor
        self._states[index] = transition.state
        self._next_states[index] = transition.next_state
        self._actions[index] = transition.action
        self._rewards[index] = transition.reward
        self._terminals[index] = transition.terminal
        self._cursor = (self._cursor + 1) % self._capacity
        self._size = min(self._size + 1, self._capacity)

    def sample(self, batch_size: int, rng: np.random.Generator) -> tuple[Tensor, ...]:
        if self._size < batch_size:
            raise ValueError(f"buffer holds {self._size}, cannot sample {batch_size}")
        index = rng.integers(0, self._size, size=batch_size)
        return (
            torch.from_numpy(self._states[index]),
            torch.from_numpy(self._actions[index]),
            torch.from_numpy(self._rewards[index]),
            torch.from_numpy(self._next_states[index]),
            torch.from_numpy(self._terminals[index]),
        )


def build_network(config: DqnConfig) -> nn.Module:
    layers: list[nn.Module] = []
    width = config.n_inputs
    for size in config.hidden:
        layers += [nn.Linear(width, size), nn.ReLU()]
        width = size
    layers.append(nn.Linear(width, config.n_actions))
    return nn.Sequential(*layers)


def double_dqn_target(
    online: nn.Module,
    target: nn.Module,
    rewards: Tensor,
    next_states: Tensor,
    terminals: Tensor,
    gamma: float,
) -> Tensor:
    """Online network SELECTS the action, target network VALUES it.

    A plain max over the target network's own outputs picks whichever action
    the noise happened to favour, and that bias compounds under function
    approximation into value estimates that climb without bound. Splitting
    selection from evaluation makes the two sources of noise independent, so
    the max can no longer systematically select for its own error.
    """
    with torch.no_grad():
        best_actions = online(next_states).argmax(dim=1, keepdim=True)
        next_values = target(next_states).gather(1, best_actions).squeeze(1)
        # Terminal transitions have no future. Truncated ones DO, which is why
        # the flag stored is terminal and not done.
        next_values = next_values.masked_fill(terminals, 0.0)
        return rewards + gamma * next_values


def train_step(
    online: nn.Module,
    target: nn.Module,
    optimizer: torch.optim.Optimizer,
    batch: tuple[Tensor, ...],
    config: DqnConfig,
) -> float:
    states, actions, rewards, next_states, terminals = batch

    y = double_dqn_target(online, target, rewards, next_states, terminals, config.gamma)
    predicted = online(states).gather(1, actions.unsqueeze(1)).squeeze(1)

    # Huber rather than MSE: one transition with an outsized TD error would
    # otherwise produce a gradient large enough to destroy the network in a
    # single step, and there is no recovering from that.
    loss = nn.functional.smooth_l1_loss(predicted, y, beta=config.huber_delta)

    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    # A second bound on step size, for the case where a whole batch is bad.
    nn.utils.clip_grad_norm_(online.parameters(), config.grad_clip_norm)
    optimizer.step()

    return float(loss.item())`,
        rationale:
          'Four changes, each addressing a nameable failure rather than a style preference. Terminal and truncated become distinct flags, because collapsing them teaches the agent the world ends at the time limit. The target becomes Double DQN, so a max over noisy estimates can no longer select for its own error. The squared error becomes Huber with gradient clipping, because a single outsized TD error otherwise produces an unrecoverable step. And the buffer becomes pre-allocated contiguous arrays rather than a list of tuples, which turns per-sample gathers into one fancy-index per batch.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'Three network passes per gradient step at batch size 32; one contiguous gather per batch.',
      },
      'make-it-fast': {
        code: `"""DQN - uint8 frame storage, index-based stacking, vectorized envs.

The two costs that actually bind are replay memory and simulator throughput.
Neither is the network, which is why almost nothing here is about the network.
"""

from __future__ import annotations

import numpy as np
import torch
from torch import Tensor

STACK = 4


class FrameRingBuffer:
    """A million transitions of stacked 84x84 frames, in about 7 GB.

    Two decisions do all the work. Frames are stored as uint8 and converted at
    sample time, which is a 4x saving over float32 for free - the network wants
    floats, the buffer does not. And the stack is assembled by INDEX rather
    than stored: consecutive transitions share three of their four frames, so
    materializing the stack per transition would store every frame four times
    and turn 7 GB into 28. That single distinction decides whether the buffer
    fits in RAM, and it is the usual reason one does not.
    """

    def __init__(self, capacity: int, height: int, width: int) -> None:
        # One flat allocation per field, single dtype, written in place.
        self._frames = np.zeros((capacity, height, width), dtype=np.uint8)
        self._actions = np.zeros(capacity, dtype=np.int64)
        self._rewards = np.zeros(capacity, dtype=np.float32)
        self._terminals = np.zeros(capacity, dtype=np.bool_)
        self._capacity = capacity
        self._cursor = 0
        self._size = 0

    def add(self, frame: np.ndarray, action: int, reward: float, terminal: bool) -> None:
        index = self._cursor
        self._frames[index] = frame          # in place; no per-transition allocation
        self._actions[index] = action
        self._rewards[index] = reward
        self._terminals[index] = terminal
        self._cursor = (self._cursor + 1) % self._capacity
        self._size = min(self._size + 1, self._capacity)

    def _stack_indices(self, index: np.ndarray) -> np.ndarray:
        """Gather STACK consecutive frame indices per sample, wrapping the ring.

        One broadcast subtraction builds the whole (batch, STACK) index matrix,
        so no Python loop over samples appears anywhere in the hot path.
        """
        offsets = np.arange(STACK - 1, -1, -1, dtype=np.int64)
        return (index[:, None] - offsets[None, :]) % self._capacity

    def sample(self, batch_size: int, rng: np.random.Generator, device: torch.device):
        # Avoid the cursor: a window straddling it mixes the newest transitions
        # with the oldest ones and produces a state that never existed.
        valid_low = STACK
        index = rng.integers(valid_low, self._size - 1, size=batch_size)

        states = self._frames[self._stack_indices(index)]
        next_states = self._frames[self._stack_indices(index + 1)]

        return (
            # One transfer per field, one dtype conversion on the device rather
            # than |batch| conversions on the host.
            torch.from_numpy(states).to(device, non_blocking=True).float().div_(255.0),
            torch.from_numpy(self._actions[index]).to(device, non_blocking=True),
            torch.from_numpy(self._rewards[index]).to(device, non_blocking=True),
            torch.from_numpy(next_states).to(device, non_blocking=True).float().div_(255.0),
            torch.from_numpy(self._terminals[index]).to(device, non_blocking=True),
        )


def n_step_returns(rewards: np.ndarray, gamma: float, n: int) -> np.ndarray:
    """Accumulate n rewards before bootstrapping, as one reversed pass.

    Trades the bias of a bad value estimate for the variance of a longer
    sampled return, and it is the cheapest real improvement available to a
    DQN - a few lines for a change in learning speed that usually exceeds
    anything gained by tuning the network.
    """
    out = np.zeros_like(rewards)
    running = 0.0
    for position in range(len(rewards) - 1, -1, -1):
        running = rewards[position] + gamma * running
        out[position] = running
    return out


@torch.no_grad()
def act_vectorized(
    online: torch.nn.Module,
    states: Tensor,
    epsilon: float,
    n_actions: int,
    generator: torch.Generator,
) -> Tensor:
    """One forward pass covering every environment in the vector.

    Simulator throughput, not gradient computation, is what bounds wall-clock
    on most problems. Stepping N environments in lockstep amortizes both the
    interpreter overhead and the per-call launch cost of the forward pass over
    the whole batch, which is a far larger lever than a faster accelerator.
    """
    greedy = online(states).argmax(dim=1)
    explore = torch.rand(states.shape[0], generator=generator, device=states.device) < epsilon
    random_actions = torch.randint(
        n_actions, (states.shape[0],), generator=generator, device=states.device
    )
    return torch.where(explore, random_actions, greedy)`,
        rationale:
          'Nothing here is about the network, because the network is not what binds. Frames are stored once as uint8 and the four-frame stack is assembled by index at sample time — consecutive transitions share three of their four frames, so materializing the stack per transition would store every frame four times and quadruple a buffer that already decides whether the job fits in RAM. Environments step in lockstep under one forward pass, because simulator throughput bounds wall-clock on most problems. And n-step returns are added, which is a few lines for more learning speed than any network tuning produces.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Frames live as uint8 in one flat array and are converted to float on the device at sample time, which is a 4x memory saving over storing float32 and moves the conversion off the host.',
            tradeoff: 'Every sample pays a cast and a divide, and the buffer can only hold quantized observations — a continuous state vector cannot use this representation at all.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The ring is allocated once per field and written in place, so adding a transition performs no allocation and the buffer never fragments or reallocates.',
            tradeoff: 'Capacity is fixed at construction and the cursor region must be excluded from sampling, an easily forgotten correctness obligation that produces states which never existed.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Stacking indices are built with one broadcast subtraction and every environment acts from a single forward pass, so no Python loop over samples or environments remains in the hot path.',
            tradeoff: 'Environments must step in lockstep, and the greedy action is computed for every environment including those about to explore, so a fraction of that compute is discarded.',
          },
        ],
        libraryName: 'NumPy + PyTorch',
        profile: 'Roughly 7 GB for 1e6 stacked-frame transitions instead of ~28 GB. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DQN - the whole method transcribed, network and backprop included.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

struct StepResult {
  std::vector<double> next_state;
  double reward;
  bool done;
};

// A two-layer MLP as plain vectors, so the semi-gradient is visible rather
// than hidden behind an autodiff tape.
struct Network {
  std::vector<std::vector<double>> w1;   // [hidden][inputs]
  std::vector<double> b1;
  std::vector<std::vector<double>> w2;   // [actions][hidden]
  std::vector<double> b2;
};

Network MakeNetwork(std::size_t n_inputs, std::size_t n_hidden,
                    std::size_t n_actions, std::mt19937& rng) {
  // Zeros would make every hidden unit receive an identical gradient and stay
  // identical forever, so the init has to break the symmetry.
  const double scale = 1.0 / std::sqrt(static_cast<double>(n_inputs));
  std::uniform_real_distribution<double> init(-scale, scale);

  Network net;
  net.w1.assign(n_hidden, std::vector<double>(n_inputs, 0.0));
  net.b1.assign(n_hidden, 0.0);
  net.w2.assign(n_actions, std::vector<double>(n_hidden, 0.0));
  net.b2.assign(n_actions, 0.0);

  for (auto& row : net.w1) {
    for (double& weight : row) weight = init(rng);
  }
  for (auto& row : net.w2) {
    for (double& weight : row) weight = init(rng);
  }
  return net;
}

// Returns the action values; writes the hidden activations out, because the
// backward pass needs them and recomputing would be the same work twice.
std::vector<double> Forward(const Network& net, const std::vector<double>& state,
                            std::vector<double>& hidden) {
  hidden.assign(net.b1.size(), 0.0);
  for (std::size_t unit = 0; unit < net.w1.size(); ++unit) {
    double total = net.b1[unit];
    for (std::size_t i = 0; i < state.size(); ++i) {
      total += net.w1[unit][i] * state[i];
    }
    hidden[unit] = total > 0.0 ? total : 0.0;               // ReLU
  }

  std::vector<double> q(net.w2.size(), 0.0);
  for (std::size_t action = 0; action < net.w2.size(); ++action) {
    double total = net.b2[action];
    for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
      total += net.w2[action][unit] * hidden[unit];
    }
    q[action] = total;
  }
  return q;
}

// One SGD step on the squared TD error, for the taken action only.
//
// The target y depends on the parameters too, through the target network, and
// that dependence is never differentiated. The discarded term is what makes
// this a SEMI-gradient: the direction descended is not the gradient of this
// loss, nor of any other function.
void Backward(Network& net, const std::vector<double>& state,
              const std::vector<double>& hidden, std::size_t action,
              double td_error, double lr) {
  // Only the taken action's output unit appears in the loss. The other
  // |A| - 1 outputs receive nothing, which is why one transition teaches the
  // network about exactly one action.
  const double grad_output = -td_error;

  std::vector<double> grad_hidden(hidden.size(), 0.0);
  for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
    grad_hidden[unit] = grad_output * net.w2[action][unit];
    net.w2[action][unit] -= lr * grad_output * hidden[unit];
  }
  net.b2[action] -= lr * grad_output;

  for (std::size_t unit = 0; unit < hidden.size(); ++unit) {
    if (hidden[unit] <= 0.0) continue;                      // ReLU is closed here
    const double delta = grad_hidden[unit];
    for (std::size_t i = 0; i < state.size(); ++i) {
      net.w1[unit][i] -= lr * delta * state[i];
    }
    net.b1[unit] -= lr * delta;
  }
}

struct Transition {
  std::vector<double> state;
  std::size_t action;
  double reward;
  std::vector<double> next_state;
  bool terminal;
};

template <typename Env>
Network Train(Env& env, std::size_t n_inputs, std::size_t n_actions, int steps,
              std::size_t n_hidden, double lr, double gamma, std::size_t batch_size,
              std::size_t buffer_size, int target_period, std::size_t warmup,
              double epsilon) {
  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  std::uniform_int_distribution<std::size_t> pick_action(0, n_actions - 1);

  Network online = MakeNetwork(n_inputs, n_hidden, n_actions, rng);
  // The target network is a frozen copy. Freezing it is what stops the target
  // from moving every time the estimate does.
  Network target = online;

  std::vector<Transition> buffer;
  std::vector<double> hidden;
  std::vector<double> state = env.reset();

  for (int step = 0; step < steps; ++step) {
    std::size_t action = 0;
    if (uniform(rng) < epsilon) {
      action = pick_action(rng);
    } else {
      const std::vector<double> q = Forward(online, state, hidden);
      action = static_cast<std::size_t>(
          std::distance(q.begin(), std::max_element(q.begin(), q.end())));
    }

    const StepResult result = env.step(static_cast<int>(action));
    buffer.push_back({state, action, result.reward, result.next_state, result.done});
    if (buffer.size() > buffer_size) {
      buffer.erase(buffer.begin());                         // a ring buffer, by hand
    }

    state = result.done ? env.reset() : result.next_state;

    // Training on a nearly empty buffer is training on one correlated
    // episode, which is exactly what replay exists to prevent.
    if (buffer.size() < warmup) continue;

    std::uniform_int_distribution<std::size_t> pick(0, buffer.size() - 1);
    for (std::size_t i = 0; i < batch_size; ++i) {
      // Uniform sampling is the decorrelation mechanism: consecutive
      // transitions are nearly the same sample, and a network trained on that
      // stream fits the last few seconds and forgets everything earlier.
      const Transition& t = buffer[pick(rng)];

      // The bootstrap comes from the FROZEN copy. Taking it from the online
      // network closes a feedback loop between an estimate and its own
      // target, and that configuration diverges.
      double bootstrap = 0.0;
      if (!t.terminal) {
        const std::vector<double> next_q = Forward(target, t.next_state, hidden);
        bootstrap = *std::max_element(next_q.begin(), next_q.end());
      }

      const std::vector<double> q = Forward(online, t.state, hidden);
      const double td_error = t.reward + gamma * bootstrap - q[t.action];
      Backward(online, t.state, hidden, t.action, td_error, lr);
    }

    if (step % target_period == 0) {
      // Refresh the frozen copy. Too often and the feedback loop returns; too
      // rarely and value information stops propagating.
      target = online;
    }
  }

  return online;
}`,
        profile: 'One scalar multiply-accumulate per weight per sample. vector<vector<double>> scatters every row across the heap.',
      },
      'make-it-right': {
        code: `// DQN - owned buffer, flat weights, Double-Q targets, Huber loss.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

using Matrix = Eigen::MatrixXf;
using Vector = Eigen::VectorXf;

// Terminal means the MDP ended and there is no future. Truncated means the
// episode hit a step limit and the future is still there. Collapsing the two
// teaches the agent that the world ends at the time limit, and the resulting
// policy is visibly short-sighted.
enum class EpisodeEnd : std::uint8_t { kRunning, kTerminal, kTruncated };

struct Hyperparameters {
  float gamma = 0.99F;
  float learning_rate = 1e-4F;
  float huber_delta = 1.0F;
  float grad_clip_norm = 10.0F;
  std::size_t batch_size = 32;
  int target_update_period = 2000;
};

// A fixed-capacity ring over flat, contiguous storage. One allocation per
// field at construction; a vector of per-transition vectors would allocate
// twice per step and scatter every sample across the heap.
class ReplayBuffer {
 public:
  ReplayBuffer(std::size_t capacity, std::size_t n_inputs)
      : capacity_(capacity),
        n_inputs_(n_inputs),
        states_(capacity * n_inputs, 0.0F),
        next_states_(capacity * n_inputs, 0.0F),
        actions_(capacity, 0),
        rewards_(capacity, 0.0F),
        terminals_(capacity, 0) {
    if (capacity == 0 || n_inputs == 0) {
      throw std::invalid_argument("capacity and input width must be positive");
    }
  }

  void Add(std::span<const float> state, std::size_t action, float reward,
           std::span<const float> next_state, bool terminal) {
    if (state.size() != n_inputs_ || next_state.size() != n_inputs_) {
      throw std::invalid_argument("state width does not match the buffer");
    }
    const std::size_t offset = cursor_ * n_inputs_;
    std::copy(state.begin(), state.end(), states_.begin() + offset);
    std::copy(next_state.begin(), next_state.end(), next_states_.begin() + offset);
    actions_[cursor_] = action;
    rewards_[cursor_] = reward;
    terminals_[cursor_] = terminal ? 1 : 0;

    cursor_ = (cursor_ + 1) % capacity_;
    size_ = std::min(size_ + 1, capacity_);
  }

  [[nodiscard]] std::size_t size() const noexcept { return size_; }

  [[nodiscard]] std::span<const float> State(std::size_t index) const {
    return {states_.data() + index * n_inputs_, n_inputs_};
  }

 private:
  std::size_t capacity_;
  std::size_t n_inputs_;
  std::vector<float> states_;
  std::vector<float> next_states_;
  std::vector<std::size_t> actions_;
  std::vector<float> rewards_;
  std::vector<std::uint8_t> terminals_;   // not vector<bool>; that one is a bitfield
  std::size_t cursor_ = 0;
  std::size_t size_ = 0;
};

// Online network SELECTS the action, target network VALUES it.
//
// A plain max over the target network's own outputs picks whichever action the
// noise favoured, and under function approximation that bias compounds into
// value estimates that climb without bound. Splitting selection from
// evaluation makes the two noise sources independent, so the max can no longer
// select for its own error.
Vector DoubleDqnTarget(const Matrix& online_next_q, const Matrix& target_next_q,
                       const Vector& rewards, const std::vector<std::uint8_t>& terminals,
                       float gamma) {
  Vector targets(rewards.size());
  for (Eigen::Index row = 0; row < rewards.size(); ++row) {
    if (terminals[static_cast<std::size_t>(row)] != 0) {
      targets(row) = rewards(row);                          // no future past a terminal
      continue;
    }
    Eigen::Index best = 0;
    online_next_q.row(row).maxCoeff(&best);
    targets(row) = rewards(row) + gamma * target_next_q(row, best);
  }
  return targets;
}

// Huber rather than squared error: one transition with an outsized TD error
// would otherwise produce a gradient large enough to destroy the network in a
// single step, and there is no recovering from that.
float HuberGradient(float td_error, float delta) noexcept {
  return std::clamp(-td_error, -delta, delta);
}`,
        rationale:
          'The nested weight vectors become Eigen matrices and the buffer becomes one flat allocation per field, so a transition costs a copy rather than two heap allocations. Terminal and truncated become distinct states, because collapsing them teaches the agent the world ends at the step limit. The target becomes Double DQN, so the max can no longer select for its own noise. And the squared-error gradient becomes a clamped Huber gradient, bounding the damage a single anomalous transition can do.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per buffer field; batched forward as a GEMM instead of per-sample loops.',
      },
      'make-it-fast': {
        code: `// DQN - uint8 frame ring, index-based stacking, BLAS-backed batch forward.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

constexpr std::size_t kStack = 4;

// A million transitions of stacked 84x84 frames, in about 7 GB.
//
// Two decisions do all of it. Frames are stored as uint8 and converted at
// sample time - the network wants floats, the buffer does not, and that is a
// 4x saving for free. And the stack is assembled by INDEX rather than stored:
// consecutive transitions share three of their four frames, so materializing
// the stack per transition writes every frame four times and turns 7 GB into
// 28. That distinction decides whether the buffer fits in RAM.
class FrameRing {
 public:
  FrameRing(std::size_t capacity, std::size_t height, std::size_t width)
      : capacity_(capacity),
        pixels_(height * width),
        // One flat allocation, row-major, single dtype. Sequential frames land
        // in sequential memory, so a batch gather streams.
        frames_(capacity * height * width, 0),
        actions_(capacity, 0),
        rewards_(capacity, 0.0F),
        terminals_(capacity, 0) {}

  void Add(const std::uint8_t* __restrict frame, std::uint8_t action, float reward,
           bool terminal) noexcept {
    std::uint8_t* __restrict destination = frames_.data() + cursor_ * pixels_;
    std::copy_n(frame, pixels_, destination);
    actions_[cursor_] = action;
    rewards_[cursor_] = reward;
    terminals_[cursor_] = terminal ? 1 : 0;
    cursor_ = (cursor_ + 1) % capacity_;
    size_ = std::min(size_ + 1, capacity_);
  }

  // Assemble a minibatch of stacked states directly into the network's input
  // matrix. Gather, uint8-to-float conversion, and the 1/255 scaling happen in
  // one pass, so no intermediate uint8 batch is ever materialized.
  void GatherStacked(const std::size_t* __restrict indices, std::size_t batch_size,
                     float* __restrict out) const noexcept {
    const std::size_t row_stride = kStack * pixels_;

    // Samples are independent gathers over disjoint output rows, which is the
    // one genuinely data-parallel loop in the whole training step.
#pragma omp parallel for schedule(static)
    for (std::size_t sample = 0; sample < batch_size; ++sample) {
      float* __restrict row = out + sample * row_stride;
      for (std::size_t slot = 0; slot < kStack; ++slot) {
        // Wrap backwards through the ring: the newest frame is last.
        const std::size_t frame_index =
            (indices[sample] + capacity_ - (kStack - 1 - slot)) % capacity_;
        const std::uint8_t* __restrict source = frames_.data() + frame_index * pixels_;
        float* __restrict destination = row + slot * pixels_;
        for (std::size_t pixel = 0; pixel < pixels_; ++pixel) {
          destination[pixel] = static_cast<float>(source[pixel]) * (1.0F / 255.0F);
        }
      }
    }
  }

 private:
  std::size_t capacity_;
  std::size_t pixels_;
  std::vector<std::uint8_t> frames_;
  std::vector<std::uint8_t> actions_;
  std::vector<float> rewards_;
  std::vector<std::uint8_t> terminals_;
  std::size_t cursor_ = 0;
  std::size_t size_ = 0;
};

// The batched forward pass is a GEMM and nothing else. Per-sample loops leave
// the machine idle; one matrix product over the whole minibatch is what the
// tuned kernel underneath Eigen was written for.
class BatchedMlp {
 public:
  // Columns are samples, so each layer is one (width x batch) product and the
  // batch dimension stays contiguous in the inner loop.
  [[nodiscard]] Eigen::MatrixXf Forward(const Eigen::MatrixXf& states) const {
    Eigen::MatrixXf hidden = (w1_ * states).colwise() + b1_;
    hidden = hidden.cwiseMax(0.0F);                         // ReLU, fused into the expression
    return (w2_ * hidden).colwise() + b2_;
  }

 private:
  Eigen::MatrixXf w1_;
  Eigen::VectorXf b1_;
  Eigen::MatrixXf w2_;
  Eigen::VectorXf b2_;
};`,
        rationale:
          'The two costs that actually bind are replay memory and batch assembly, so neither of the changes here touches the algorithm. Frames live as uint8 in one flat row-major ring and the four-frame stack is gathered by index, because consecutive transitions share three of their four frames and materializing the stack per transition quadruples a buffer that already decides whether the job fits in RAM. Gather, conversion and scaling fuse into one parallel pass, and the forward becomes a single GEMM per layer with samples in columns rather than a loop over samples.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Frames are one flat contiguous array so sequential frames are sequential in memory, which is what makes the stacked gather stream instead of chasing pointers.',
            tradeoff: 'Capacity is fixed at construction, and the sampled window must avoid the write cursor or a batch mixes the newest frames with the oldest and builds a state that never existed.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The gather, the uint8-to-float conversion and the 1/255 scaling happen in a single pass directly into the network input, so no intermediate uint8 minibatch is ever materialized.',
            tradeoff: 'The gather now knows about the network input layout, coupling two components that were independent and making a layout change a two-file edit.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Minibatch assembly is independent gathers writing to disjoint output rows — the one genuinely data-parallel loop in the training step.',
            tradeoff: 'The loop is memory-bound, so throughput saturates well before the core count does and the extra threads mostly contend for bandwidth.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Each layer becomes one GEMM over the whole minibatch, which is what the tuned kernel underneath Eigen exists for.',
            tradeoff: 'Samples must be columns rather than rows, which is the opposite of the natural storage order and costs a transpose at the boundary.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'Roughly 7 GB for 1e6 stacked-frame transitions instead of ~28 GB; one GEMM per layer per batch. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! DQN - the whole method transcribed, network and backprop included.

pub struct StepResult {
    pub next_state: Vec<f64>,
    pub reward: f64,
    pub done: bool,
}

pub trait Environment {
    fn reset(&mut self) -> Vec<f64>;
    fn step(&mut self, action: usize) -> StepResult;
}

/// A two-layer MLP as plain vectors, so the semi-gradient is visible as code
/// rather than hidden behind an autodiff tape.
#[derive(Clone)]
pub struct Network {
    pub w1: Vec<Vec<f64>>, // [hidden][inputs]
    pub b1: Vec<f64>,
    pub w2: Vec<Vec<f64>>, // [actions][hidden]
    pub b2: Vec<f64>,
}

pub fn make_network(
    n_inputs: usize,
    n_hidden: usize,
    n_actions: usize,
    rand: &mut dyn FnMut() -> f64,
) -> Network {
    // Zeros would give every hidden unit an identical gradient and leave them
    // identical forever, so the init has to break the symmetry.
    let scale = 1.0 / (n_inputs as f64).sqrt();
    let mut draw = || (rand() * 2.0 - 1.0) * scale;

    Network {
        w1: (0..n_hidden).map(|_| (0..n_inputs).map(|_| draw()).collect()).collect(),
        b1: vec![0.0; n_hidden],
        w2: (0..n_actions).map(|_| (0..n_hidden).map(|_| draw()).collect()).collect(),
        b2: vec![0.0; n_actions],
    }
}

/// Returns (q_values, hidden). The hidden activations come back because the
/// backward pass needs them and recomputing would repeat the same work.
pub fn forward(net: &Network, state: &[f64]) -> (Vec<f64>, Vec<f64>) {
    let mut hidden = vec![0.0; net.b1.len()];
    for unit in 0..net.w1.len() {
        let mut total = net.b1[unit];
        for i in 0..state.len() {
            total += net.w1[unit][i] * state[i];
        }
        hidden[unit] = if total > 0.0 { total } else { 0.0 }; // ReLU
    }

    let mut q = vec![0.0; net.w2.len()];
    for action in 0..net.w2.len() {
        let mut total = net.b2[action];
        for unit in 0..hidden.len() {
            total += net.w2[action][unit] * hidden[unit];
        }
        q[action] = total;
    }

    (q, hidden)
}

/// One SGD step on the squared TD error, for the taken action only.
///
/// The target depends on the parameters too, through the target network, and
/// that dependence is never differentiated. The discarded term is what makes
/// this a SEMI-gradient method: the direction being descended is not the
/// gradient of this loss, or of any other function.
pub fn backward(
    net: &mut Network,
    state: &[f64],
    hidden: &[f64],
    action: usize,
    td_error: f64,
    lr: f64,
) {
    // Only the taken action's output unit is in the loss. The other |A| - 1
    // outputs get nothing, which is why one transition teaches the network
    // about exactly one action.
    let grad_output = -td_error;

    let mut grad_hidden = vec![0.0; hidden.len()];
    for unit in 0..hidden.len() {
        grad_hidden[unit] = grad_output * net.w2[action][unit];
        net.w2[action][unit] -= lr * grad_output * hidden[unit];
    }
    net.b2[action] -= lr * grad_output;

    for unit in 0..hidden.len() {
        if hidden[unit] <= 0.0 {
            continue; // ReLU is closed here
        }
        let delta = grad_hidden[unit];
        for i in 0..state.len() {
            net.w1[unit][i] -= lr * delta * state[i];
        }
        net.b1[unit] -= lr * delta;
    }
}

pub struct Transition {
    pub state: Vec<f64>,
    pub action: usize,
    pub reward: f64,
    pub next_state: Vec<f64>,
    pub terminal: bool,
}

#[allow(clippy::too_many_arguments)]
pub fn train(
    env: &mut dyn Environment,
    n_inputs: usize,
    n_actions: usize,
    steps: usize,
    n_hidden: usize,
    lr: f64,
    gamma: f64,
    batch_size: usize,
    buffer_size: usize,
    target_period: usize,
    warmup: usize,
    epsilon: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Network {
    let mut online = make_network(n_inputs, n_hidden, n_actions, rand);
    // The target network is a frozen copy. Freezing it is what stops the
    // target moving every time the estimate does.
    let mut target = online.clone();

    let mut buffer: Vec<Transition> = Vec::new();
    let mut state = env.reset();

    for step in 0..steps {
        let action = if rand() < epsilon {
            (rand() * n_actions as f64) as usize % n_actions
        } else {
            let (q, _) = forward(&online, &state);
            let mut best = 0;
            for a in 1..n_actions {
                if q[a] > q[best] {
                    best = a;
                }
            }
            best
        };

        let result = env.step(action);
        buffer.push(Transition {
            state: state.clone(),
            action,
            reward: result.reward,
            next_state: result.next_state.clone(),
            terminal: result.done,
        });
        if buffer.len() > buffer_size {
            buffer.remove(0); // a ring buffer, by hand
        }

        state = if result.done { env.reset() } else { result.next_state };

        // Training on a nearly empty buffer is training on one correlated
        // episode, which is what replay exists to prevent.
        if buffer.len() < warmup {
            continue;
        }

        for _ in 0..batch_size {
            // Uniform sampling is the decorrelation mechanism: consecutive
            // transitions are nearly the same sample, and a network trained on
            // that stream fits the last few seconds and forgets the rest.
            let pick = (rand() * buffer.len() as f64) as usize % buffer.len();
            let t = &buffer[pick];

            // The bootstrap comes from the FROZEN copy. Taking it from the
            // online network closes a feedback loop between an estimate and
            // its own target, and that configuration diverges.
            let bootstrap = if t.terminal {
                0.0 // no future past a terminal
            } else {
                let (next_q, _) = forward(&target, &t.next_state);
                next_q.iter().copied().fold(f64::NEG_INFINITY, f64::max)
            };

            let (q, hidden) = forward(&online, &t.state);
            let td_error = t.reward + gamma * bootstrap - q[t.action];

            let state_copy = t.state.clone();
            let action_taken = t.action;
            backward(&mut online, &state_copy, &hidden, action_taken, td_error, lr);
        }

        if step % target_period == 0 {
            // Refresh the frozen copy. Too often and the feedback loop comes
            // back; too rarely and value information stops propagating.
            target = online.clone();
        }
    }

    online
}`,
        profile: 'One scalar multiply-accumulate per weight per sample; Vec<Vec<f64>> scatters every row, and every index is bounds-checked.',
      },
      'make-it-right': {
        code: `//! DQN - typed errors, flat weights, Double-Q targets, Huber gradient.

use std::fmt;

/// Terminal means the MDP ended and there is no future. Truncated means the
/// episode hit a step limit and the future is still there. Collapsing the two
/// teaches the agent that the world ends at the time limit, and the resulting
/// policy is visibly short-sighted. Making it an enum rather than a bool means
/// the distinction cannot be forgotten at a call site.
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

/// Newtypes so a discount and a learning rate cannot be transposed. Both are
/// bare f64 in the naive version, and swapping them produces a run that trains
/// badly rather than one that fails.
#[derive(Debug, Clone, Copy)]
pub struct Discount(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct LearningRate(pub f32);

#[derive(Debug, PartialEq, Eq)]
pub enum DqnError {
    EmptyCapacity,
    BadDiscount,
    StateWidthMismatch { got: usize, expected: usize },
    NotEnoughSamples { held: usize, requested: usize },
}

impl fmt::Display for DqnError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCapacity => write!(f, "replay capacity must be positive"),
            Self::BadDiscount => write!(f, "gamma must be in [0, 1)"),
            Self::StateWidthMismatch { got, expected } => {
                write!(f, "state has width {got}, buffer expects {expected}")
            }
            Self::NotEnoughSamples { held, requested } => {
                write!(f, "buffer holds {held}, cannot sample {requested}")
            }
        }
    }
}

impl std::error::Error for DqnError {}

/// A fixed-capacity ring over flat storage: one allocation per field, written
/// in place. A Vec of per-transition Vecs allocates twice per step and
/// scatters every sample across the heap.
pub struct ReplayBuffer {
    n_inputs: usize,
    states: Vec<f32>,
    next_states: Vec<f32>,
    actions: Vec<u8>,
    rewards: Vec<f32>,
    ends: Vec<EpisodeEnd>,
    cursor: usize,
    size: usize,
}

impl ReplayBuffer {
    pub fn new(capacity: usize, n_inputs: usize) -> Result<Self, DqnError> {
        if capacity == 0 || n_inputs == 0 {
            return Err(DqnError::EmptyCapacity);
        }
        Ok(Self {
            n_inputs,
            states: vec![0.0; capacity * n_inputs],
            next_states: vec![0.0; capacity * n_inputs],
            actions: vec![0; capacity],
            rewards: vec![0.0; capacity],
            ends: vec![EpisodeEnd::Running; capacity],
            cursor: 0,
            size: 0,
        })
    }

    /// Borrows the states rather than taking ownership: a transition is copied
    /// into storage the buffer already owns, so nothing is allocated per step.
    pub fn add(
        &mut self,
        state: &[f32],
        action: u8,
        reward: f32,
        next_state: &[f32],
        end: EpisodeEnd,
    ) -> Result<(), DqnError> {
        if state.len() != self.n_inputs || next_state.len() != self.n_inputs {
            return Err(DqnError::StateWidthMismatch {
                got: state.len(),
                expected: self.n_inputs,
            });
        }

        let offset = self.cursor * self.n_inputs;
        self.states[offset..offset + self.n_inputs].copy_from_slice(state);
        self.next_states[offset..offset + self.n_inputs].copy_from_slice(next_state);
        self.actions[self.cursor] = action;
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

    #[must_use]
    pub fn state(&self, index: usize) -> &[f32] {
        &self.states[index * self.n_inputs..(index + 1) * self.n_inputs]
    }
}

/// Online network SELECTS the action, target network VALUES it.
///
/// A plain max over the target network's own outputs picks whichever action
/// the noise favoured, and under function approximation that bias compounds
/// into value estimates that climb without bound. Splitting selection from
/// evaluation makes the two noise sources independent, so the max can no
/// longer select for its own error.
#[must_use]
pub fn double_dqn_target(
    online_next_q: &[f32],
    target_next_q: &[f32],
    reward: f32,
    end: EpisodeEnd,
    gamma: Discount,
) -> f32 {
    if !end.bootstraps() {
        return reward; // no future past a terminal
    }

    let best = online_next_q
        .iter()
        .enumerate()
        // total_cmp rather than partial_cmp().unwrap(): a NaN from a diverged
        // update would panic, and panicking mid-training is a worse failure
        // than returning a defined action.
        .max_by(|(_, a), (_, b)| a.total_cmp(b))
        .map_or(0, |(index, _)| index);

    reward + gamma.0 * target_next_q[best]
}

/// Huber rather than squared error: one transition with an outsized TD error
/// would otherwise produce a gradient large enough to destroy the network in a
/// single step, and there is no recovering from that.
#[inline]
#[must_use]
pub fn huber_gradient(td_error: f32, delta: f32) -> f32 {
    (-td_error).clamp(-delta, delta)
}`,
        rationale:
          'The nested Vecs become one flat allocation per field written in place, so a transition costs a copy into storage the buffer already owns rather than two heap allocations. The done flag becomes a three-state enum, because terminal and truncated need different treatment and a bool lets a call site forget that. Newtypes separate the discount from the learning rate. The target becomes Double DQN with total_cmp instead of an unwrap that a diverged NaN would turn into a mid-training panic, and the squared-error gradient becomes a clamped Huber gradient.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per buffer field at construction; nothing allocated per transition.',
      },
      'make-it-fast': {
        code: `//! DQN - u8 frame ring, index-based stacking, BLAS-backed batch forward.

use ndarray::{s, Array2, ArrayView2, Axis};

pub const STACK: usize = 4;

/// A million transitions of stacked 84x84 frames, in about 7 GB.
///
/// Two decisions do all of it. Frames are stored as u8 and converted at sample
/// time - the network wants floats, the buffer does not, and that is a 4x
/// saving for free. And the stack is assembled by INDEX rather than stored:
/// consecutive transitions share three of their four frames, so cloning the
/// stack into each transition writes every frame four times and turns 7 GB
/// into 28. That distinction decides whether the buffer fits in RAM, and it is
/// the usual reason one does not.
pub struct FrameRing {
    capacity: usize,
    pixels: usize,
    frames: Vec<u8>,
    actions: Vec<u8>,
    rewards: Vec<f32>,
    terminals: Vec<bool>,
    cursor: usize,
    size: usize,
}

impl FrameRing {
    #[must_use]
    pub fn new(capacity: usize, height: usize, width: usize) -> Self {
        let pixels = height * width;
        Self {
            capacity,
            pixels,
            // Sized exactly once at construction. The hot path never
            // reallocates, and a ring that grew mid-training would copy
            // gigabytes while the agent waited.
            frames: vec![0; capacity * pixels],
            actions: Vec::with_capacity(capacity),
            rewards: Vec::with_capacity(capacity),
            terminals: Vec::with_capacity(capacity),
            cursor: 0,
            size: 0,
        }
    }

    /// Takes a borrowed frame and copies it into storage the ring already
    /// owns, so adding a transition allocates nothing at all.
    pub fn add(&mut self, frame: &[u8], action: u8, reward: f32, terminal: bool) {
        let offset = self.cursor * self.pixels;
        self.frames[offset..offset + self.pixels].copy_from_slice(frame);

        if self.size < self.capacity {
            self.actions.push(action);
            self.rewards.push(reward);
            self.terminals.push(terminal);
            self.size += 1;
        } else {
            self.actions[self.cursor] = action;
            self.rewards[self.cursor] = reward;
            self.terminals[self.cursor] = terminal;
        }

        self.cursor = (self.cursor + 1) % self.capacity;
    }

    /// Assemble a minibatch of stacked states directly into the network input.
    ///
    /// Gather, u8-to-f32 conversion and the 1/255 scaling happen in one pass
    /// over slices, so no intermediate u8 batch is materialized and the bounds
    /// checks fall out of the inner loop.
    pub fn gather_stacked(&self, indices: &[usize], out: &mut Array2<f32>) {
        let row_stride = STACK * self.pixels;

        for (sample, &index) in indices.iter().enumerate() {
            let mut row = out.slice_mut(s![sample, ..]);
            let row = row.as_slice_mut().expect("output rows are contiguous");

            for slot in 0..STACK {
                // Wrap backwards through the ring: the newest frame is last.
                let frame_index = (index + self.capacity - (STACK - 1 - slot)) % self.capacity;
                let source = &self.frames[frame_index * self.pixels..(frame_index + 1) * self.pixels];
                let destination = &mut row[slot * self.pixels..(slot + 1) * self.pixels];

                for (out_pixel, &in_pixel) in destination.iter_mut().zip(source.iter()) {
                    *out_pixel = f32::from(in_pixel) * (1.0 / 255.0);
                }
            }
            debug_assert_eq!(row.len(), row_stride);
        }
    }
}

/// The batched forward pass is a matrix product and nothing else. Per-sample
/// loops leave the machine idle; one GEMM over the whole minibatch is what the
/// BLAS kernel underneath ndarray was written for.
pub struct BatchedMlp {
    w1: Array2<f32>,
    b1: Array2<f32>,
    w2: Array2<f32>,
    b2: Array2<f32>,
}

impl BatchedMlp {
    #[must_use]
    pub fn forward(&self, states: ArrayView2<'_, f32>) -> Array2<f32> {
        // (batch x inputs) dot (inputs x hidden) - one GEMM, batch stays the
        // outer dimension so each sample's row is contiguous.
        let mut hidden = states.dot(&self.w1) + &self.b1;
        hidden.mapv_inplace(|value| value.max(0.0)); // ReLU, in place
        hidden.dot(&self.w2) + &self.b2
    }

    /// Greedy action per sample, without collecting an intermediate Vec of
    /// rows only to iterate it again.
    #[must_use]
    pub fn greedy_actions(&self, q: &Array2<f32>) -> Vec<usize> {
        q.axis_iter(Axis(0))
            .map(|row| {
                row.iter()
                    .enumerate()
                    .max_by(|(_, a), (_, b)| a.total_cmp(b))
                    .map_or(0, |(index, _)| index)
            })
            .collect()
    }
}`,
        rationale:
          'The binding costs are replay memory and batch assembly, so nothing here changes the algorithm. Frames are stored once as u8 in a ring sized exactly at construction, and the four-frame stack is gathered by index instead of cloned into each transition — consecutive transitions share three of their four frames, so cloning quadruples a buffer that already decides whether the job fits in RAM. Gather, conversion and scaling fuse into one pass over slices, and the forward becomes a BLAS-backed GEMM per layer rather than a loop over samples.',
        optimizations: [
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The frame ring and its metadata are sized once at construction, so the hot path never reallocates — a ring that grew mid-training would copy gigabytes while the agent waited.',
            tradeoff: 'Capacity is fixed forever, and the full allocation is taken up front whether or not training ever fills it.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'Stacked states are assembled by index from shared frames instead of cloned per transition, which is a 4x memory saving since consecutive transitions differ by one frame.',
            tradeoff: 'A sampled window straddling the write cursor silently mixes the newest frames with the oldest, so the sampler carries a correctness obligation that a per-transition copy does not.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Gather, conversion and scaling run over contiguous source and destination slices in one pass, so the bounds checks fall out of the inner loop and nothing intermediate is materialized.',
            tradeoff: 'It depends on the output rows being contiguous, which a non-standard-layout array breaks with a runtime panic rather than a compile error.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Each layer becomes one GEMM over the whole minibatch, which is what the tuned kernel exists for and what per-sample loops leave on the table.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, which complicates cross-compilation and makes the binary sensitive to which implementation is linked.',
          },
        ],
        libraryName: 'ndarray',
        profile: 'Roughly 7 GB for 1e6 stacked-frame transitions instead of ~28 GB; one GEMM per layer per batch. Illustrative, not a measured benchmark.',
      },
    },
  },
};
