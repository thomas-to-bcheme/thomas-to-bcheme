import type { AiMlModel } from '../../types';

/**
 * Actor-Critic — the entry where the policy-gradient baseline stops
 * being a constant and becomes a learned value function.
 *
 * That one substitution buys a bias-variance dial the Monte Carlo
 * estimator does not have, and it introduces the problem that defines
 * the method: two learners, each supplying the other's training
 * signal, neither of which is correct yet.
 */
export const ACTOR_CRITIC: AiMlModel = {
  slug: 'actor-critic',
  name: 'Actor-Critic (A2C)',
  aliases: ['A2C', 'A3C', 'Advantage Actor-Critic', 'GAE', 'Generalized Advantage Estimation'],
  category: 'reinforcement-learning',
  group: 'policy-gradient',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'On-policy reinforcement learning that maintains both a parameterized policy and a parameterized value function, using the second to reduce the variance of the first. It is the point where the value-based and policy-gradient branches of this category stop being alternatives and become components of one method.',

  intuition:
    'REINFORCE weights each action by the return that actually followed it, which is unbiased and enormously noisy, because a single sampled return over a long horizon is dominated by everything that happened to occur afterwards. The fix is already visible in the theory: any function of state can be subtracted for free, and the best one is the state\'s own value. Learn that function and two things happen at once. The subtraction removes the part of the return that was predictable from the state, leaving only the part attributable to the action — which is the definition of an advantage. And once a value function exists, the sampled return can be replaced entirely by a bootstrapped estimate, so an update no longer has to wait for the episode to end. What you gain is a dial. Bootstrap after one step and variance nearly vanishes while bias is whatever the critic\'s error is; bootstrap after the whole episode and you are back to REINFORCE. Generalized advantage estimation makes that dial continuous, and choosing where to set it is the central tuning decision of the method. What you pay is a second learning problem coupled to the first. The critic supplies the actor\'s training signal, the actor determines the distribution the critic is fitted on, and neither is right at the start. An actor that improves faster than its critic is optimizing against systematically wrong advantages, which is the characteristic failure and the reason relative learning rates matter more here than anywhere else in this category.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'L(\\theta, \\phi) = -\\mathbb{E}\\bigl[\\log \\pi_{\\theta}(a_t \\mid s_t)\\,\\hat{A}_t\\bigr] + c_v\\,\\mathbb{E}\\bigl[(V_{\\phi}(s_t) - \\hat{R}_t)^2\\bigr] - c_e\\,\\mathbb{E}\\bigl[H(\\pi_{\\theta}(\\cdot \\mid s_t))\\bigr]',
      symbols: [
        { symbol: '\\hat{A}_t', meaning: 'the advantage estimate, treated as a constant by the policy term — the gradient must never flow through it into the critic, and this is the single most common bug in the method' },
        { symbol: 'V_{\\phi}', meaning: 'the critic: a learned state-value function, fitted by regression onto bootstrapped returns, whose only job is to make the advantage less noisy' },
        { symbol: 'c_v', meaning: 'the value-loss coefficient, which matters mostly because a shared trunk lets the regression gradient overwhelm the far smaller policy gradient' },
        { symbol: 'c_e', meaning: 'the entropy coefficient; the policy is still the sole source of exploration, so collapse is still permanent' },
      ],
    },
    reading:
      'Three objectives are being optimized in one expression, and they are not the same kind of object. The first term is a policy-gradient surrogate whose value is meaningless and whose gradient is the point. The second is an ordinary regression with an interpretable loss — the critic is genuinely being fitted to a target and its error genuinely measures something. The third is a regularizer keeping the policy from committing prematurely. Reading them as one number is a mistake: a total loss that falls can be a critic improving while the policy degrades, and the two must be logged separately or the run cannot be diagnosed. The advantage estimate is where the real design decision lives. A one-step advantage r + gamma·V(s\') − V(s) has almost no variance and carries all of the critic\'s bias; the full Monte Carlo advantage has no bias beyond the baseline and all of REINFORCE\'s variance. Generalized advantage estimation interpolates between them with an exponentially weighted sum of TD errors, and its lambda is a bias-variance dial that is usually worth more attention than the learning rate. The detachment requirement deserves to be stated as loudly as possible: the advantage appears in the policy term as a scalar weight, and if it is left attached to the computation graph, the policy loss backpropagates into the critic and trains it to make advantages large rather than accurate. Nothing errors, the loss curves look plausible, and the run is silently optimizing the wrong thing.',
  },

  optimization: {
    method: 'Simultaneous stochastic gradient descent on a coupled policy surrogate and value regression, with advantages estimated by GAE over short on-policy rollouts',
    updateRule: {
      formula:
        '\\hat{A}^{\\text{GAE}}_t = \\sum_{l \\ge 0} (\\gamma\\lambda)^{l}\\,\\delta_{t+l}, \\qquad \\delta_t = r_t + \\gamma V_{\\phi}(s_{t+1}) - V_{\\phi}(s_t)',
      symbols: [
        { symbol: '\\delta_t', meaning: 'the one-step TD error — the same quantity TD learning updates on, reused here as the unit the advantage is built from' },
        { symbol: '\\lambda', meaning: 'the bias-variance dial: 0 gives the low-variance, fully bootstrapped advantage, 1 gives the unbiased Monte Carlo one' },
        { symbol: '\\gamma\\lambda', meaning: 'the effective decay on how far forward TD errors are accumulated, which sets the horizon the advantage actually sees' },
        { symbol: 'V_{\\phi}(s_{t+1})', meaning: 'the bootstrap; it must be zeroed at a true terminal and retained at a time-limit truncation, and conflating those is a standard bug' },
      ],
    },
    rationale:
      'The method exists to trade REINFORCE\'s variance for a controlled amount of bias, and almost every design decision is about managing the coupling that trade introduces. GAE is the mechanism: accumulating discounted TD errors over the rollout gives an advantage whose bias and variance are set by a single parameter, computed in one reversed pass for free. The relative learning rates of actor and critic are the next decision and the one most often got wrong — an actor moving faster than its critic optimizes against advantages that are systematically wrong, and the usual symptom is a return curve that rises and then falls away with no accompanying change in the loss. A shared trunk between actor and critic is common because features useful for valuing a state are useful for choosing in it, and it introduces its own problem: the value regression has a much larger natural gradient scale than the policy surrogate, so without a value-loss coefficient the trunk is trained almost entirely by the critic. Rollout length is the third decision, and it is a genuine trade rather than a tuning detail — short rollouts update more often on staler bootstraps, long ones are closer to Monte Carlo and update less. A2C and A3C differ only in how parallelism is arranged: A3C ran asynchronous workers applying lock-free updates from slightly stale parameters, A2C steps many environments in lockstep and applies one synchronous update, and the synchronous version turned out to be both simpler and at least as good, which is a useful lesson about where the benefit of the asynchronous design actually came from. It was the decorrelation from parallel environments, not the asynchrony.',
    hyperparameters: [
      { name: 'GAE lambda', role: 'The bias-variance dial on the advantage. Often worth more than the learning rate, and the first thing to move when the gradient is too noisy or the critic is too trusted', typicalRange: '0.9 to 0.97' },
      { name: 'value-loss coefficient', role: 'Balances a regression with a large natural gradient scale against a policy surrogate with a small one. Matters most with a shared trunk, where the critic otherwise trains it alone', typicalRange: '0.25 to 1.0' },
      { name: 'entropy coefficient', role: 'The policy is still the only source of exploration, so collapse is still permanent. Unchanged in role from REINFORCE and unchanged in importance', typicalRange: '0.0 to 0.01' },
      { name: 'rollout length', role: 'Steps collected per environment before an update. Short means frequent updates on staler bootstraps; long approaches Monte Carlo and updates less often', typicalRange: '5 to 128 steps' },
      { name: 'number of parallel environments', role: 'The decorrelation mechanism, and the actual source of A3C\'s benefit. Independent environments make a batch approximately i.i.d. without any replay buffer', typicalRange: '8 to 64' },
      { name: 'actor and critic learning rates', role: 'Their ratio is the coupling knob. A critic that lags leaves the actor optimizing against wrong advantages, which is the characteristic failure of the method', typicalRange: '3e-4 actor, equal or up to 3x for the critic' },
      { name: 'discount (gamma)', role: 'The horizon, and jointly with lambda it sets how far forward the advantage actually looks — the two interact and should not be tuned independently', typicalRange: '0.99' },
    ],
    convergence:
      'No convergence guarantee worth relying on. Actor-critic is a two-timescale stochastic approximation, and results exist for the tabular and linear cases given a critic that adapts faster than the actor, but they do not survive nonlinear function approximation and the practical behaviour is governed by the coupling rather than by the theory. The characteristic failure follows directly from that coupling: when the actor improves faster than the critic can track, the advantages it optimizes against are systematically wrong, and the run produces a return curve that climbs, turns over, and collapses without the loss showing anything unusual. The diagnosis is the critic\'s explained variance against realized returns, which is the single most informative number in an actor-critic run and is routinely not logged. Below roughly zero the critic is worse than predicting the mean and the advantages are noise. Entropy collapse is inherited unchanged from REINFORCE and remains permanent — the critic does nothing to restore exploration, and a policy that has stopped sampling an action still never learns about it. A third failure is specific to the shared trunk: because the value regression has a much larger gradient scale, a badly set value coefficient produces a trunk that serves the critic and starves the policy, which presents as an actor that will not move. And as everywhere in this category, seed variance is large enough that a single-seed comparison measures the seed rather than the method.',
    complexity:
      'Per environment step: one forward pass through the policy and one through the critic, or one shared forward with two heads. Per update: one backward over a rollout of T steps across N environments, so the batch is T·N transitions and there is no replay buffer to sample from. GAE costs a single reversed pass over the rollout, O(T·N), which is negligible. Memory is bounded by the rollout rather than by stored history, which makes this substantially lighter than DQN and is a real practical advantage on constrained hardware. Sample complexity sits between REINFORCE and an off-policy method: bootstrapping recovers much of the efficiency lost to being on-policy, but every batch is still discarded after one gradient step, which is precisely the waste PPO removes by taking several epochs over the same data.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no action whose advantage could be estimated and no policy for a critic to evaluate, since a forecaster does not influence what it observes next; the critic here is a value function over a controlled process, not a predictor of a series.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so the advantage — how much better an action turned out than expected — has nothing to attach to, and a large critic error reports an under-fitted region of the value function rather than anything unusual in the data.',
      },
      optimization: {
        fit: 'primary',
        how: 'Optimize a parameterized policy using advantages estimated by a learned critic rather than by sampled returns, trading a controlled amount of bias for a large reduction in variance and removing the need to wait for episodes to end.',
        where: [
          'The bias-variance trade made explicit and tunable, with GAE\'s lambda as a single continuous dial between full bootstrapping and Monte Carlo',
          'Two coupled learners as an engineering problem: each supplies the other\'s signal, and their relative rates decide whether the run works',
          'Parallel environments as the decorrelation mechanism, which is what A3C\'s benefit actually came from and what A2C kept while dropping the asynchrony',
          'The detachment requirement — a scalar weight that must not carry gradient — as a concrete instance of a general hazard in multi-objective training',
        ],
        why: 'The synthesis point of this category, and the reason it is worth studying even though PPO has largely replaced it in deployment. Three lessons transfer past reinforcement learning. The first is that a learned baseline is the general way to reduce the variance of a sampled estimator, and that once a baseline exists it can usually also replace part of the sample — which is what bootstrapping does here and what control variates do elsewhere. The second is about coupled learners: whenever one model produces another\'s training signal, their relative learning rates become a first-class hyperparameter, and the failure when they are wrong is not an error but a plausible-looking run optimizing the wrong objective. The third is the detachment hazard — a quantity used as a weight rather than as a prediction must be severed from the graph, and forgetting it produces no error, no warning, and a silently different objective. Where actor-critic is the wrong choice: if the horizon is short and returns are cheap, REINFORCE with a batch baseline is simpler and nearly as good; if stability matters, PPO is the same method with a trust region and several epochs per batch, which dominates it; and for continuous control where sample efficiency is the binding constraint, an off-policy method such as SAC is a better use of the same interactions.',
        featurization: [
          'Log the policy and value losses separately — summed, a rising policy loss hides inside a falling value loss',
          'Track the critic\'s explained variance against realized returns; below zero the advantages are noise and nothing downstream is meaningful',
          'Detach the advantage before it multiplies the log-probability, or the policy term trains the critic to make advantages large rather than correct',
          'Zero the bootstrap at a true terminal and keep it at a time-limit truncation, which are different events that a single done flag conflates',
        ],
        evaluation:
          'Median return over at least five seeds with the spread shown, evaluated on a separate deterministic rollout rather than on the exploring training policy. Plot critic explained variance and policy entropy alongside return: a plateau is almost always explained by one of the two — a critic that stopped tracking, or a policy that stopped exploring — and neither is visible in the return curve itself.',
        pitfalls: [
          'A total loss reported as one number, which hides a degrading policy inside an improving critic',
          'An advantage left attached to the graph, which silently changes what the critic is trained to do',
          'An actor tuned to move faster than its critic, which optimizes against advantages that are systematically wrong',
          'Entropy collapse, inherited unchanged from REINFORCE and equally permanent — the critic does nothing to restore exploration',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Learn a control policy over continuous or discrete actions from parallel simulated interaction, with a critic supplying low-variance advantages so that updates can happen every few steps instead of once per episode.',
        where: [
          'Continuous-action control where a value-based argmax is intractable and Monte Carlo returns are too noisy to use directly',
          'Long-horizon operations problems where waiting for an episode to end would make updates impossibly infrequent',
          'Simulators that can be replicated cheaply, since parallel environments are the decorrelation mechanism this method depends on',
          'Settings where memory is constrained, because a rollout buffer is orders of magnitude smaller than a replay buffer',
        ],
        why: 'A real fit, and the honest framing is that it is the foundation rather than the destination. Everything this method brings to an operations problem — continuous actions, bootstrapped updates on long horizons, modest memory — is retained by PPO, which adds a trust region and several epochs per batch and is more robust to the hyperparameters that matter. So the practical recommendation is to understand actor-critic and deploy PPO, or SAC where sample efficiency binds hardest. Two cautions apply to the family and deserve stating here. The critic is a model of value under the current policy, so it is only trustworthy in the region the current policy visits, and a policy that moves into an unfamiliar operating regime is being advised by a critic extrapolating with confidence and no data. And a stochastic policy samples its actions by construction, which is a liability in a physical system: the deployed controller should be the distribution\'s mode, evaluated separately, and anything genuinely unsafe needs an interlock the policy cannot trade against.',
        featurization: [
          'Normalize observations with running statistics, since both heads are sensitive to input scale and operating regimes differ by orders of magnitude',
          'Bound continuous actions explicitly, because an unbounded Gaussian policy will eventually sample something the actuator cannot execute',
          'Replicate the simulator rather than lengthening rollouts; parallel environments decorrelate a batch, longer rollouts only add horizon',
          'Deploy the mode and evaluate it separately, since a deterministic policy is a different controller from the stochastic one that was trained',
        ],
        evaluation:
          'Simulated return against the incumbent controller on matched scenarios, with constraint violations counted separately rather than averaged in. Report critic explained variance per operating regime as well as overall — a critic that is accurate on average and wrong in one regime produces a policy that is confidently bad in exactly that regime.',
        pitfalls: [
          'Trusting the critic outside the state distribution the current policy actually visits',
          'Deploying the stochastic policy, so a production controller samples its actions',
          'Choosing this over PPO for anything beyond a study exercise, when PPO keeps the advantages and removes the main instabilities',
          'A hard constraint expressed as a reward penalty, which an optimizer treats as a price rather than a limit',
        ],
      },
      'natural-language': {
        fit: 'adapted',
        how: 'Optimize a generation policy against a sequence-level or preference-based reward with a learned value head supplying per-token advantages, which is the structure preference-tuning pipelines are built from.',
        where: [
          'Preference optimization from a reward model, where the standard pipeline is an actor-critic method with a KL penalty to the reference policy',
          'Per-token credit assignment on a reward that only arrives at the end of the sequence, which is exactly what a critic is for',
          'A value head attached to the language model itself, sharing the trunk that already encodes the context',
          'Understanding why direct preference methods were proposed — they remove the critic, and with it this method\'s coupling problem',
        ],
        why: 'Marked adapted because what is actually deployed is PPO rather than plain A2C, but the structure is this one and the difficulties are this one\'s. The attraction is real: a sequence-level reward arriving only at the end gives every token the same credit under a Monte Carlo estimator, and a critic is precisely the machinery that distributes it across the tokens that earned it. The costs are also this method\'s costs, amplified by scale. Two large models train simultaneously with coupled signals, memory holds a policy, a critic, a reference and often a reward model at once, and the critic must be fitted on a distribution the policy is actively moving. The critic\'s explained variance is the diagnostic here as everywhere, and it is why direct preference optimization was attractive enough to displace this pipeline in many settings — it removes the critic entirely and therefore removes the coupling, at the cost of the flexibility a learned value function provides. Where the critic earns its place is where the reward is dense or intermediate credit genuinely matters.',
        featurization: [
          'Start from a supervised-tuned policy; neither the actor nor the critic can discover language from a reward signal',
          'Keep a KL penalty to the reference policy, since an unconstrained optimizer finds the reward model\'s defects rather than the behaviour it encodes',
          'Attach the value head to the shared trunk but watch the value-loss coefficient, because the regression gradient will otherwise dominate the trunk',
          'Normalize rewards within a batch, as sequence-level scores are unbounded and their scale directly sets gradient scale',
        ],
        evaluation:
          'Held-out preference win rate alongside KL from the reference policy: a reward gain accompanied by a large divergence is usually reward hacking rather than improvement. Track critic explained variance as well — a critic that is not tracking makes every per-token advantage noise, and the run degenerates toward a worse version of the Monte Carlo estimator it was meant to improve on.',
        pitfalls: [
          'Optimizing a learned reward without a KL constraint, which yields text that scores well and reads badly',
          'A value-loss coefficient left at a default on a shared trunk, so the critic trains the representation and the policy barely moves',
          'Assuming the critic is tracking without measuring it, when its failure is invisible in the reward curve',
          'Carrying the full pipeline when a direct preference method would remove the critic and the coupling along with it',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Moderate by the standards of this category: one or two forward passes per environment step and one backward pass per rollout, with no replay buffer and memory bounded by the rollout rather than by stored history. That makes it markedly lighter than DQN on memory and heavier on interaction, since every batch is discarded after a single gradient step. Parallel environments are the main scaling lever and the main cost — simulator instances multiply with worker count. Budget for at least five seeds, because the coupling between actor and critic makes run-to-run variance large. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One forward pass through the policy; the critic is training machinery and is discarded at deployment. The served artefact is therefore smaller than what was trained, which is a genuine operational advantage. The decision that matters is whether to ship the distribution\'s mode or a sample: the trained object is stochastic, most deployments should not be, and the deterministic policy is a different controller whose performance must be measured rather than assumed.',
    retrainingCadence:
      'Batch retraining rather than continuous updating, since the estimator is on-policy and live updating means a production system taking sampled actions with a critic that may have stopped tracking. The usual arrangement is periodic offline training against a simulator, offline evaluation of the deterministic policy, then a staged rollout. As with every simulator-trained policy, the simulator goes stale before the policy does, so revalidating it is the real trigger for a retraining cycle.',
    driftAndMonitoring: [
      'Critic explained variance against realized returns — the single most informative number in an actor-critic run, and the one most often not logged; below zero, every advantage downstream is noise',
      'Policy and value losses separately, never summed, since a degrading policy hides comfortably inside an improving critic',
      'Policy entropy, which is still the leading indicator of permanent exploration collapse and is unaffected by the presence of a critic',
      'KL divergence between successive policy versions, because a large step both collects worse data and outruns the critic that was fitted on the old distribution',
      'Realized return of the deployed deterministic policy against the incumbent, on matched scenarios rather than in aggregate',
      'State-distribution shift between training and production, since the critic is only trustworthy where the training policy actually visited',
    ],
    productionGotchas: [
      'The advantage must be detached before it multiplies the log-probability. Left attached, the policy term backpropagates into the critic and trains it to produce large advantages rather than accurate ones — no error, plausible curves, wrong objective',
      'A summed loss is undiagnosable. The policy surrogate\'s value means nothing and the value loss means something, so reporting their sum discards the only interpretable half',
      'If the actor outruns the critic, the whole run optimizes against systematically wrong advantages, and the symptom is a return curve that rises and then collapses with nothing unusual in the loss',
      'With a shared trunk the value regression has a much larger gradient scale than the policy surrogate, so a default value coefficient can leave the trunk trained almost entirely by the critic',
      'A true terminal and a time-limit truncation require different bootstrap handling, and a single done flag conflates them — the resulting policy is visibly short-sighted at the episode limit',
      'Entropy collapse is inherited from REINFORCE unchanged. Adding a critic reduces variance and does nothing whatsoever to restore lost exploration',
      'The critic is only valid on the distribution the current policy visits, so a policy that moves regions is being advised by confident extrapolation',
      'A2C and A3C differ only in synchronization, and the benefit attributed to asynchrony was really decorrelation from parallel environments — worth knowing before building the harder one',
    ],
  },

  assumptions: [
    'The policy is differentiable and assigns non-zero probability to every action it might need, since an action never sampled is never improved',
    'The critic can represent the value function well enough on the states the policy visits — everywhere else its advantages are extrapolation',
    'Trajectories come from the current policy, which is what makes the advantage estimate valid and what forbids replay',
    'Environments can be replicated in parallel, because that is where the decorrelation comes from in the absence of a replay buffer',
    'The critic adapts at least as fast as the actor, which the two-timescale results require and which the learning-rate ratio must actually deliver',
    'Rewards are on a bounded or normalized scale, since their magnitude sets the scale of both the advantage and the value regression',
  ],

  pros: [
    {
      point: 'A tunable bias-variance trade rather than a fixed one',
      context:
        'GAE\'s lambda moves continuously between the fully bootstrapped advantage and the Monte Carlo one, computed in a single reversed pass. It is usually the most valuable parameter in the method and it costs nothing to compute',
    },
    {
      point: 'Updates without waiting for episodes to end',
      context:
        'Bootstrapping removes REINFORCE\'s requirement for a complete return, which makes long-horizon and continuing tasks tractable and lets updates happen every few steps instead of once per episode',
    },
    {
      point: 'Keeps the policy-gradient advantages while recovering much of the lost efficiency',
      context:
        'Continuous and structured action spaces, non-differentiable environments, and direct optimization of the deployed policy all survive, with far less of the variance that made the plain estimator unusable',
    },
    {
      point: 'Memory bounded by the rollout, not by stored history',
      context:
        'No replay buffer at all, so the memory footprint is orders of magnitude below a value-based method of comparable capability. On constrained hardware this is frequently the deciding factor',
    },
    {
      point: 'The critic is training machinery and does not ship',
      context:
        'Only the policy is served, so the deployed artefact is smaller than what was trained — the opposite of a value-based method, where the value function is the policy',
    },
  ],

  cons: [
    {
      point: 'Two coupled learners, each supplying the other\'s signal',
      context:
        'Their relative learning rates become a first-class hyperparameter, and getting them wrong produces a plausible-looking run optimizing systematically wrong advantages. This is the defining difficulty of the method',
    },
    {
      point: 'The bias the critic introduces is real and unmeasured by default',
      context:
        'Bootstrapping through an inaccurate value function biases every advantage, and nothing surfaces it unless explained variance is tracked — which it usually is not',
    },
    {
      point: 'The detachment bug is silent and easy to write',
      context:
        'An advantage left on the graph makes the policy loss train the critic toward large advantages rather than accurate ones. No error, no warning, and curves that look entirely normal',
    },
    {
      point: 'Still on-policy, so data is still discarded after one step',
      context:
        'Bootstrapping recovers efficiency relative to REINFORCE but every batch is used once. Taking several epochs over the same rollout is precisely what PPO adds, and it is why PPO superseded this',
    },
    {
      point: 'Entropy collapse is inherited unchanged',
      context:
        'The critic reduces variance and restores no exploration whatsoever. A policy that has stopped sampling an action still never learns about it, and the failure remains permanent',
    },
    {
      point: 'More moving parts than its successors, with less robustness',
      context:
        'Value coefficient, entropy coefficient, lambda, rollout length, worker count and two learning rates, all interacting. PPO has most of the same knobs and tolerates bad settings far better, which is why plain A2C is now mostly a teaching artefact',
    },
  ],

  relatedSlugs: ['reinforce', 'ppo-trpo', 'td-learning', 'sac', 'ddpg-td3', 'rlhf-dpo'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Actor-critic - the one-step advantage update, transcribed.

Two learners in one loop. The critic is fitted by regression onto a
bootstrapped return; the actor is pushed by a policy gradient weighted by how
wrong the critic turned out to be.

Watch for the coincidence that makes the method this compact: the SAME
quantity serves both. The TD error is the critic's regression residual and the
actor's advantage estimate, computed once and used twice.
"""

import math
import random


def softmax(scores):
    largest = max(scores)
    exponentials = [math.exp(score - largest) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def policy_probabilities(theta, state):
    """theta[a][i] is the actor's weight on feature i for action a."""
    scores = []
    for action_weights in theta:
        score = 0.0
        for weight, feature in zip(action_weights, state):
            score += weight * feature
        scores.append(score)
    return softmax(scores)


def state_value(w, state):
    """A linear critic: V(s) = w . s.

    Linear on purpose - its gradient with respect to w is just s, so the
    critic's update stays readable next to the actor's.
    """
    total = 0.0
    for weight, feature in zip(w, state):
        total += weight * feature
    return total


def sample_action(probabilities, uniform_draw):
    cumulative = 0.0
    for action, probability in enumerate(probabilities):
        cumulative += probability
        if uniform_draw < cumulative:
            return action
    return len(probabilities) - 1


def train(env, n_features, n_actions, episodes=5_000, alpha_actor=0.01,
          alpha_critic=0.05, gamma=0.99):
    theta = [[0.0] * n_features for _ in range(n_actions)]   # the actor
    w = [0.0] * n_features                                   # the critic

    for _ in range(episodes):
        state = env.reset()
        done = False

        # gamma^t on the step index. The derivation requires it and nearly
        # every implementation silently drops it; writing it out here makes the
        # omission elsewhere a decision rather than an accident.
        discount_so_far = 1.0

        while not done:
            probabilities = policy_probabilities(theta, state)
            action = sample_action(probabilities, random.random())
            next_state, reward, done = env.step(action)

            # Zero at a true terminal: there is no future to bootstrap from.
            next_value = 0.0 if done else state_value(w, next_state)
            value = state_value(w, state)

            # One quantity, two jobs.
            td_error = reward + gamma * next_value - value

            # Critic. The gradient of (target - V)^2 with respect to w is
            # -2 * td_error * dV/dw, and dV/dw is s for a linear critic. This
            # is a semi-gradient: the target's own dependence on w, through
            # V(s'), is not differentiated.
            for index, feature in enumerate(state):
                w[index] += alpha_critic * td_error * feature

            # Actor. The score, weighted by the advantage.
            #
            # Note that td_error enters here as a NUMBER: the critic's
            # parameters play no part in this update at all. That is the
            # hand-written equivalent of detaching the advantage from the
            # graph, and forgetting it in an autodiff implementation trains
            # the critic to make advantages LARGE rather than accurate.
            for candidate in range(n_actions):
                indicator = 1.0 if candidate == action else 0.0
                coefficient = discount_so_far * td_error * (indicator - probabilities[candidate])
                for index, feature in enumerate(state):
                    theta[candidate][index] += alpha_actor * coefficient * feature

            discount_so_far *= gamma
            state = next_state

    return theta, w`,
        profile: 'O(|A| x d) per step for the actor plus O(d) for the critic, in the interpreter. One update per environment step, no batching.',
      },
      'make-it-right': {
        code: `"""Actor-critic - shared trunk, GAE advantages, losses reported separately."""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import torch
from torch import Tensor, nn
from torch.distributions import Categorical


class Rollout(NamedTuple):
    states: Tensor        # (T, N, features)
    actions: Tensor       # (T, N)
    rewards: Tensor       # (T, N)
    values: Tensor        # (T, N)   critic output at collection time
    # A true terminal has no future. A time-limit truncation does, and its
    # bootstrap must be kept. One done flag conflates them, and the resulting
    # policy is visibly short-sighted at the episode limit.
    terminals: Tensor     # (T, N)
    truncations: Tensor   # (T, N)
    last_value: Tensor    # (N,)    bootstrap for the step after the rollout


@dataclass(frozen=True)
class ActorCriticConfig:
    n_features: int
    n_actions: int
    trunk: tuple[int, ...] = (64, 64)
    learning_rate: float = 3e-4
    gamma: float = 0.99
    # The bias-variance dial. Usually worth more attention than the learning
    # rate: 0 is the fully bootstrapped advantage, 1 is Monte Carlo.
    gae_lambda: float = 0.95
    # The value regression has a much larger natural gradient scale than the
    # policy surrogate, so on a shared trunk this is what stops the critic
    # training the representation by itself.
    value_coefficient: float = 0.5
    entropy_coefficient: float = 0.01
    grad_clip_norm: float = 0.5

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma < 1.0:
            raise ValueError(f"gamma must be in [0, 1), got {self.gamma}")
        if not 0.0 <= self.gae_lambda <= 1.0:
            raise ValueError(f"lambda must be in [0, 1], got {self.gae_lambda}")
        if self.value_coefficient <= 0.0:
            raise ValueError("a non-positive value coefficient leaves the critic untrained")


class ActorCritic(nn.Module):
    """One trunk, two heads.

    Features useful for valuing a state are useful for choosing in it, so the
    representation is shared - which is also why the value coefficient exists.
    """

    def __init__(self, config: ActorCriticConfig) -> None:
        super().__init__()
        layers: list[nn.Module] = []
        width = config.n_features
        for size in config.trunk:
            layers += [nn.Linear(width, size), nn.Tanh()]
            width = size
        self.trunk = nn.Sequential(*layers)
        self.policy_head = nn.Linear(width, config.n_actions)
        self.value_head = nn.Linear(width, 1)

    def forward(self, states: Tensor) -> tuple[Tensor, Tensor]:
        features = self.trunk(states)
        return self.policy_head(features), self.value_head(features).squeeze(-1)


def generalized_advantage(rollout: Rollout, config: ActorCriticConfig) -> tuple[Tensor, Tensor]:
    """GAE in one reversed pass: A_t = delta_t + gamma * lambda * A_(t+1).

    The recursion is exact, so the exponentially weighted sum of TD errors
    costs the same single backward pass a plain return would.
    """
    horizon = rollout.rewards.shape[0]
    advantages = torch.zeros_like(rollout.rewards)
    running = torch.zeros_like(rollout.last_value)
    next_value = rollout.last_value

    for step in range(horizon - 1, -1, -1):
        # Terminal: no future, so the bootstrap is zero and the accumulated
        # advantage is cut. Truncated: the future exists, so the bootstrap is
        # kept and only the accumulation is cut, because the trajectory the
        # rollout saw does not continue.
        keeps_future = (~rollout.terminals[step]).float()
        continues = keeps_future * (~rollout.truncations[step]).float()

        delta = (
            rollout.rewards[step]
            + config.gamma * next_value * keeps_future
            - rollout.values[step]
        )
        running = delta + config.gamma * config.gae_lambda * continues * running
        advantages[step] = running
        next_value = rollout.values[step]

    # The critic regresses onto advantage + value, which is the same target the
    # advantage was built from and keeps the two consistent.
    returns = advantages + rollout.values
    return advantages, returns


def explained_variance(predicted: Tensor, actual: Tensor) -> float:
    """1 - Var(actual - predicted) / Var(actual).

    The single most informative number in an actor-critic run, and the one most
    often not logged. Below zero the critic is worse than predicting the mean,
    which means every advantage downstream of it is noise.
    """
    variance = actual.var()
    if variance == 0:
        return 0.0
    return float(1.0 - (actual - predicted).var() / variance)


def update(
    model: ActorCritic,
    optimizer: torch.optim.Optimizer,
    rollout: Rollout,
    config: ActorCriticConfig,
) -> dict[str, float]:
    advantages, returns = generalized_advantage(rollout, config)

    states = rollout.states.reshape(-1, config.n_features)
    actions = rollout.actions.reshape(-1)
    advantages = advantages.reshape(-1)
    returns = returns.reshape(-1)

    advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

    logits, values = model(states)
    distribution = Categorical(logits=logits)

    # detach() is load-bearing. The advantage is a WEIGHT, not a prediction; if
    # it stays attached, the policy term backpropagates into the value head and
    # trains the critic to make advantages large rather than correct. Nothing
    # errors, both curves look plausible, and the objective is silently wrong.
    policy_loss = -(distribution.log_prob(actions) * advantages.detach()).mean()
    value_loss = nn.functional.mse_loss(values, returns)
    entropy = distribution.entropy().mean()

    loss = policy_loss + config.value_coefficient * value_loss - config.entropy_coefficient * entropy

    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip_norm)
    optimizer.step()

    # Reported separately, never summed. The policy surrogate's value means
    # nothing and the value loss means something; adding them discards the only
    # interpretable half and hides a degrading policy inside an improving critic.
    return {
        "policy_surrogate": float(policy_loss),
        "value_loss": float(value_loss),
        "entropy": float(entropy),
        "explained_variance": explained_variance(values.detach(), returns),
    }`,
        rationale:
          'The one-step advantage becomes GAE, which is a continuous bias-variance dial computed in the same single reversed pass. Terminal and truncated become separate flags with different bootstrap handling, because conflating them teaches the agent the world ends at the step limit. The advantage is explicitly detached — left attached it trains the critic toward large advantages rather than accurate ones, with no error and plausible curves. The trunk is shared with a value coefficient balancing two gradient scales, and the losses are returned separately alongside explained variance, which is the number that actually diagnoses the run.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'One shared forward per batch yielding both heads; GAE is one reversed pass over (T, N).',
      },
      'make-it-fast': {
        code: `"""A2C - environments in lockstep, GAE over the whole (T, N) block at once.

The name is the optimization. A3C ran asynchronous workers applying lock-free
updates from stale parameters; A2C steps N environments synchronously and
applies one update. The synchronous version is simpler and at least as good,
which localized where the benefit had actually come from: decorrelation across
independent environments, not the asynchrony.
"""

from __future__ import annotations

import numpy as np
import torch
from numpy.typing import NDArray
from torch import Tensor


class RolloutStore:
    """Pre-allocated (T, N) storage, sized once and written in place.

    Appending per step and stacking at the boundary allocates T times and then
    copies the whole block; a fixed buffer does neither, and the rollout is the
    hot path of the whole method.
    """

    def __init__(self, horizon: int, n_envs: int, n_features: int) -> None:
        self.states = np.zeros((horizon, n_envs, n_features), dtype=np.float32)
        self.actions = np.zeros((horizon, n_envs), dtype=np.int64)
        self.rewards = np.zeros((horizon, n_envs), dtype=np.float32)
        self.values = np.zeros((horizon, n_envs), dtype=np.float32)
        self.terminals = np.zeros((horizon, n_envs), dtype=np.float32)
        self.truncations = np.zeros((horizon, n_envs), dtype=np.float32)
        # Reused every rollout rather than reallocated.
        self.advantages = np.zeros((horizon, n_envs), dtype=np.float32)

    def add(self, step: int, states, actions, rewards, values, terminals, truncations) -> None:
        self.states[step] = states           # in place, no allocation per step
        self.actions[step] = actions
        self.rewards[step] = rewards
        self.values[step] = values
        self.terminals[step] = terminals
        self.truncations[step] = truncations


def gae_vectorized(
    store: RolloutStore,
    last_value: NDArray[np.float32],
    gamma: float,
    lam: float,
) -> NDArray[np.float32]:
    """GAE for every environment simultaneously.

    The recursion is sequential in TIME and cannot be vectorized along it - but
    it is fully independent across environments, so each step of the reversed
    pass is one length-N array operation rather than N scalar ones. The Python
    loop shrinks from T*N iterations to T.
    """
    horizon = store.rewards.shape[0]
    running = np.zeros_like(last_value)
    next_value = last_value

    for step in range(horizon - 1, -1, -1):
        keeps_future = 1.0 - store.terminals[step]
        continues = keeps_future * (1.0 - store.truncations[step])

        # delta, the decay and the accumulation computed as one expression per
        # step, writing straight into the pre-allocated advantage block.
        delta = store.rewards[step] + gamma * next_value * keeps_future - store.values[step]
        running = delta + gamma * lam * continues * running
        store.advantages[step] = running
        next_value = store.values[step]

    return store.advantages


@torch.no_grad()
def act_and_value(model: torch.nn.Module, states: Tensor, generator: torch.Generator):
    """One shared forward yields BOTH heads.

    Running the policy and the critic as separate passes duplicates the trunk -
    which is most of the compute - for no reason. Sharing it means collection
    costs one forward per step regardless of how many heads hang off it.
    """
    logits, values = model(states)

    # Gumbel-max: argmax(logits + gumbel noise) is already a softmax sample, so
    # no normalization and no per-environment distribution object is built.
    uniform = torch.rand(logits.shape, generator=generator, device=logits.device)
    gumbel = -torch.log(-torch.log(uniform + 1e-20) + 1e-20)
    actions = (logits + gumbel).argmax(dim=1)

    return actions, values


def flatten_for_update(store: RolloutStore, advantages: NDArray[np.float32]):
    """Collapse (T, N) to (T*N,) with reshape and no copy.

    The gradient is a sum over independent (state, action, advantage) triples,
    so time-major or env-major makes no difference to the estimator and the
    layout can be chosen purely for contiguity.
    """
    n_features = store.states.shape[-1]
    return (
        torch.from_numpy(store.states.reshape(-1, n_features)),
        torch.from_numpy(store.actions.reshape(-1)),
        torch.from_numpy(advantages.reshape(-1)),
        torch.from_numpy((advantages + store.values).reshape(-1)),
    )`,
        rationale:
          'A2C is itself the optimization: N environments step in lockstep and one synchronous update replaces A3C\'s asynchronous lock-free workers, which is simpler and at least as good — locating the benefit in decorrelation rather than asynchrony. The GAE recursion stays sequential in time, because it genuinely is, but becomes one length-N array operation per step instead of N scalar ones, shrinking the Python loop from T·N iterations to T. Storage is a (T, N) block sized once and written in place, and a single shared forward returns both heads rather than paying for the trunk twice.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'N environments step in lockstep under one forward pass, so the per-step interpreter cost is paid once per batch rather than once per environment — this is what A2C is.',
            tradeoff: 'Environments must step synchronously, so a slow one stalls the batch, and reproducibility now depends on the environment count as well as the seed.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Each step of the reversed GAE pass is one length-N array operation, cutting the Python loop from T·N iterations to T.',
            tradeoff: 'The time axis genuinely cannot be vectorized — the recursion depends on its own previous result — so T iterations remain and grow with rollout length.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The (T, N) rollout block and the advantage buffer are sized once and written in place, so a rollout performs no allocation and no end-of-rollout stacking copy.',
            tradeoff: 'Horizon and environment count are fixed at construction, so changing either means rebuilding the store rather than adjusting a parameter.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'One shared trunk forward returns both heads, and Gumbel-max sampling skips normalization entirely, so neither the trunk nor the probability vector is computed twice.',
            tradeoff: 'Sampled probabilities are never formed, so anything needing them — a logged propensity, an importance ratio for a later PPO epoch — must recompute them.',
          },
        ],
        libraryName: 'NumPy + PyTorch',
        profile: 'One forward per batch step across all environments; GAE as T array operations instead of T x N scalar ones. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Actor-critic - the one-step advantage update, transcribed.
//
// Two learners in one loop. Watch for the coincidence that makes the method
// this compact: the TD error is the critic's regression residual AND the
// actor's advantage estimate, computed once and used twice.
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

// theta[a][i] is the actor's weight on feature i for action a.
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

// A linear critic: V(s) = w . s. Linear on purpose - its gradient with respect
// to w is just s, which keeps the update readable beside the actor's.
double StateValue(const std::vector<double>& w, const std::vector<double>& state) {
  double total = 0.0;
  for (std::size_t i = 0; i < state.size(); ++i) total += w[i] * state[i];
  return total;
}

std::size_t SampleAction(const std::vector<double>& probabilities, double uniform_draw) {
  double cumulative = 0.0;
  for (std::size_t action = 0; action < probabilities.size(); ++action) {
    cumulative += probabilities[action];
    if (uniform_draw < cumulative) return action;
  }
  return probabilities.size() - 1;
}

template <typename Env>
void Train(Env& env, std::size_t n_features, std::size_t n_actions, int episodes,
           double alpha_actor, double alpha_critic, double gamma,
           std::vector<std::vector<double>>& theta, std::vector<double>& w) {
  theta.assign(n_actions, std::vector<double>(n_features, 0.0));
  w.assign(n_features, 0.0);

  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);

  for (int episode = 0; episode < episodes; ++episode) {
    std::vector<double> state = env.reset();
    bool done = false;

    // gamma^t on the step index. The derivation requires it and nearly every
    // implementation silently drops it; writing it out makes the omission
    // elsewhere a decision rather than an accident.
    double discount_so_far = 1.0;

    while (!done) {
      const std::vector<double> probabilities = PolicyProbabilities(theta, state);
      const std::size_t action = SampleAction(probabilities, uniform(rng));
      const StepResult result = env.step(static_cast<int>(action));

      // Zero at a true terminal: there is no future to bootstrap from.
      const double next_value = result.done ? 0.0 : StateValue(w, result.next_state);
      const double value = StateValue(w, state);

      // One quantity, two jobs.
      const double td_error = result.reward + gamma * next_value - value;

      // Critic. The gradient of (target - V)^2 with respect to w is
      // -2 * td_error * dV/dw, and dV/dw is s for a linear critic. A
      // semi-gradient: the target's own dependence on w through V(s') is not
      // differentiated.
      for (std::size_t i = 0; i < n_features; ++i) {
        w[i] += alpha_critic * td_error * state[i];
      }

      // Actor. The score, weighted by the advantage.
      //
      // td_error enters as a NUMBER: the critic's parameters play no part in
      // this update. That is the hand-written equivalent of detaching the
      // advantage from a graph, and forgetting it in an autodiff version
      // trains the critic to make advantages LARGE rather than accurate.
      for (std::size_t candidate = 0; candidate < n_actions; ++candidate) {
        const double indicator = candidate == action ? 1.0 : 0.0;
        const double coefficient =
            discount_so_far * td_error * (indicator - probabilities[candidate]);
        for (std::size_t i = 0; i < n_features; ++i) {
          theta[candidate][i] += alpha_actor * coefficient * state[i];
        }
      }

      discount_so_far *= gamma;
      state = result.next_state;
      done = result.done;
    }
  }
}`,
        profile: 'O(|A| x d) per step for the actor plus O(d) for the critic. One update per environment step, no batching.',
      },
      'make-it-right': {
        code: `// Actor-critic - owned rollout storage, GAE advantages, diagnostics separated.
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

// Newtypes so a discount, a trace decay and a step size cannot be transposed.
// All three are bare floats in the naive version.
struct Discount {
  float value;
};

struct TraceDecay {
  float value;
};

// A true terminal has no future. A time-limit truncation does, and its
// bootstrap must be kept. A single done flag conflates them, and the resulting
// policy is visibly short-sighted at the episode limit.
enum class EpisodeEnd : std::uint8_t { kRunning, kTerminal, kTruncated };

struct ActorCriticConfig {
  Discount gamma{0.99F};
  // The bias-variance dial: 0 is the fully bootstrapped advantage, 1 is Monte
  // Carlo. Usually worth more attention than the learning rate.
  TraceDecay lambda{0.95F};
  // The value regression has a much larger natural gradient scale than the
  // policy surrogate, so on a shared trunk this is what stops the critic
  // training the representation by itself.
  float value_coefficient = 0.5F;
  float entropy_coefficient = 0.01F;
};

// Structure-of-arrays rollout storage, owning its memory and reused between
// rollouts. The naive version holds nothing at all because it updates online;
// batching requires storage, and this is the shape that does not fragment.
class Rollout {
 public:
  Rollout(std::size_t horizon, std::size_t n_envs, std::size_t n_features)
      : horizon_(horizon),
        n_envs_(n_envs),
        n_features_(n_features),
        states_(horizon * n_envs * n_features, 0.0F),
        actions_(horizon * n_envs, 0),
        rewards_(horizon * n_envs, 0.0F),
        values_(horizon * n_envs, 0.0F),
        ends_(horizon * n_envs, EpisodeEnd::kRunning),
        advantages_(horizon * n_envs, 0.0F),
        returns_(horizon * n_envs, 0.0F) {
    if (horizon == 0 || n_envs == 0 || n_features == 0) {
      throw std::invalid_argument("horizon, env count and feature width must be positive");
    }
  }

  [[nodiscard]] std::size_t Index(std::size_t step, std::size_t env) const noexcept {
    return step * n_envs_ + env;
  }

  // GAE in one reversed pass: A_t = delta_t + gamma * lambda * A_(t+1).
  //
  // The recursion is exact, so an exponentially weighted sum of TD errors
  // costs the same single backward pass a plain return would.
  void ComputeAdvantages(const ActorCriticConfig& config, std::span<const float> last_value) {
    std::vector<float> running(n_envs_, 0.0F);
    std::vector<float> next_value(last_value.begin(), last_value.end());

    for (std::size_t offset = horizon_; offset > 0; --offset) {
      const std::size_t step = offset - 1;
      for (std::size_t env = 0; env < n_envs_; ++env) {
        const std::size_t index = Index(step, env);
        const EpisodeEnd end = ends_[index];

        // Terminal: no future, so the bootstrap is zeroed and the accumulated
        // advantage is cut. Truncated: the future exists, so the bootstrap is
        // kept and only the accumulation is cut, because the trajectory the
        // rollout observed does not continue past the boundary.
        const float keeps_future = end == EpisodeEnd::kTerminal ? 0.0F : 1.0F;
        const float continues = end == EpisodeEnd::kRunning ? 1.0F : 0.0F;

        const float delta =
            rewards_[index] + config.gamma.value * next_value[env] * keeps_future - values_[index];
        running[env] = delta + config.gamma.value * config.lambda.value * continues * running[env];

        advantages_[index] = running[env];
        // The critic regresses onto advantage + value, the same target the
        // advantage was built from, which keeps the two consistent.
        returns_[index] = running[env] + values_[index];
        next_value[env] = values_[index];
      }
    }
  }

  [[nodiscard]] std::span<const float> Advantages() const { return advantages_; }
  [[nodiscard]] std::span<const float> Returns() const { return returns_; }
  [[nodiscard]] std::span<const float> Values() const { return values_; }

 private:
  std::size_t horizon_;
  std::size_t n_envs_;
  std::size_t n_features_;
  std::vector<float> states_;
  std::vector<std::size_t> actions_;
  std::vector<float> rewards_;
  std::vector<float> values_;
  std::vector<EpisodeEnd> ends_;
  std::vector<float> advantages_;
  std::vector<float> returns_;
};

// 1 - Var(actual - predicted) / Var(actual).
//
// The single most informative number in an actor-critic run, and the one most
// often not logged. Below zero the critic is worse than predicting the mean,
// which makes every advantage downstream of it noise.
[[nodiscard]] float ExplainedVariance(std::span<const float> predicted,
                                      std::span<const float> actual) {
  const auto count = static_cast<float>(actual.size());
  const float mean = std::accumulate(actual.begin(), actual.end(), 0.0F) / count;

  float total_variance = 0.0F;
  float residual_variance = 0.0F;
  for (std::size_t index = 0; index < actual.size(); ++index) {
    const float centered = actual[index] - mean;
    const float residual = actual[index] - predicted[index];
    total_variance += centered * centered;
    residual_variance += residual * residual;
  }

  if (total_variance == 0.0F) return 0.0F;
  return 1.0F - residual_variance / total_variance;
}`,
        rationale:
          'Online per-step updates become batched rollouts over owned structure-of-arrays storage, since batching needs storage and this is the shape that does not fragment. The one-step advantage becomes GAE, a continuous bias-variance dial computed in the same single reversed pass. The done flag becomes a three-state enum, because terminal and truncated need different bootstrap handling and a bool lets a call site forget it. And explained variance is computed explicitly, because it is the number that diagnoses whether the critic is tracking at all.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per rollout field, reused between rollouts; GAE is one reversed pass.',
      },
      'make-it-fast': {
        code: `// A2C - environments in lockstep, GAE fused, both heads from one GEMM.
#include <cstddef>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

// The name is the optimization. A3C ran asynchronous workers applying lock-free
// updates from stale parameters; A2C steps N environments synchronously and
// applies one update. The synchronous version is simpler and at least as good,
// which localized where the benefit had actually come from: decorrelation
// across independent environments, not the asynchrony.
template <typename Env>
void StepEnvironmentsParallel(std::vector<Env>& envs,
                              const std::size_t* __restrict actions,
                              float* __restrict next_states,
                              float* __restrict rewards,
                              std::uint8_t* __restrict ends,
                              std::size_t n_features) {
  const int count = static_cast<int>(envs.size());

  // Each environment owns its own state and writes to a disjoint output slice,
  // so the loop needs no synchronization. schedule(static) because every
  // environment advances exactly one step - unlike whole-episode rollouts,
  // the work per iteration is uniform here.
#pragma omp parallel for schedule(static)
  for (int env = 0; env < count; ++env) {
    const auto index = static_cast<std::size_t>(env);
    envs[index].Step(actions[index], next_states + index * n_features, rewards + index,
                     ends + index);
  }
}

// GAE across every environment at once, fused into a single reversed sweep.
//
// The recursion is sequential in TIME and cannot be vectorized along it, but it
// is fully independent across environments. Fusing delta, the decay, the
// advantage and the critic's regression target into one pass means the block is
// traversed once rather than four times, and no intermediate delta buffer is
// ever written.
void GaeFused(const float* __restrict rewards, const float* __restrict values,
              const std::uint8_t* __restrict ends, const float* __restrict last_value,
              std::size_t horizon, std::size_t n_envs, float gamma, float lambda,
              float* __restrict advantages, float* __restrict returns) {
  std::vector<float> running(n_envs, 0.0F);
  std::vector<float> next_value(last_value, last_value + n_envs);

  for (std::size_t offset = horizon; offset > 0; --offset) {
    const std::size_t step = offset - 1;
    const std::size_t base = step * n_envs;

    // Contiguous in env for a fixed step, so this inner loop streams and the
    // compiler can vectorize it without any aliasing ambiguity.
    for (std::size_t env = 0; env < n_envs; ++env) {
      const std::size_t index = base + env;
      const float keeps_future = ends[index] == 2 ? 0.0F : 1.0F;   // 2 == terminal
      const float continues = ends[index] == 0 ? 1.0F : 0.0F;      // 0 == running

      const float delta = rewards[index] + gamma * next_value[env] * keeps_future - values[index];
      running[env] = delta + gamma * lambda * continues * running[env];

      advantages[index] = running[env];
      returns[index] = running[env] + values[index];
      next_value[env] = values[index];
    }
  }
}

// One trunk GEMM feeds both heads.
//
// Running the policy and the critic as separate passes duplicates the trunk,
// which is most of the compute, for no reason at all. Sharing it means
// collection costs one forward per step regardless of how many heads hang off.
class SharedTrunkNetwork {
 public:
  // Samples in COLUMNS: each layer is one (width x batch) product and the batch
  // dimension stays contiguous in the inner loop.
  void Forward(const Eigen::MatrixXf& states, Eigen::MatrixXf& logits,
               Eigen::VectorXf& values) const {
    // cwiseMax participates in the expression template, so the activation is
    // applied as the product is consumed and no intermediate is written.
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
          'Environments step in lockstep across threads with static scheduling, since every environment advances exactly one step and the work per iteration is uniform — unlike whole-episode rollouts. The GAE sweep fuses delta, the decay, the advantage and the critic target into one reversed pass, traversing the block once instead of four times with no intermediate delta buffer. And a single trunk GEMM feeds both heads, because running the policy and the critic separately duplicates the trunk, which is most of the compute.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each environment advances one step into a disjoint output slice, so stepping N of them needs no synchronization at all — this lockstep collection is what A2C is.',
            tradeoff: 'A slow environment stalls the whole batch, and each thread needs its own environment instance, so simulator memory scales with the worker count.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Delta, the decay, the advantage and the critic regression target are produced in one reversed sweep, so the rollout block is traversed once instead of four times and no delta buffer is written.',
            tradeoff: 'The fused sweep is harder to unit-test piecewise, since the intermediate TD errors it used to expose no longer exist anywhere to assert on.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The inner loop runs over environments at a fixed step, which is contiguous, and restrict removes the aliasing ambiguity that would otherwise block autovectorization of the reversed sweep.',
            tradeoff: 'It is an unchecked promise — passing overlapping buffers compiles silently and produces wrong advantages with no diagnostic anywhere.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The trunk becomes one GEMM over the whole batch feeding both heads, rather than a per-step GEMV run twice for the policy and the critic.',
            tradeoff: 'Samples must be columns rather than rows, the opposite of the natural collection order, so the batch is transposed at the boundary.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'One trunk GEMM per batch feeding both heads; one fused reversed sweep for GAE. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Actor-critic - the one-step advantage update, transcribed.
//!
//! Two learners in one loop. Watch for the coincidence that makes the method
//! this compact: the TD error is the critic's regression residual AND the
//! actor's advantage estimate, computed once and used twice.

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

/// theta[a][i] is the actor's weight on feature i for action a.
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

/// A linear critic: V(s) = w . s. Linear on purpose - its gradient with respect
/// to w is just s, which keeps the update readable beside the actor's.
pub fn state_value(w: &[f64], state: &[f64]) -> f64 {
    let mut total = 0.0;
    for i in 0..state.len() {
        total += w[i] * state[i];
    }
    total
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

#[allow(clippy::too_many_arguments)]
pub fn train(
    env: &mut dyn Environment,
    n_features: usize,
    n_actions: usize,
    episodes: usize,
    alpha_actor: f64,
    alpha_critic: f64,
    gamma: f64,
    rand: &mut dyn FnMut() -> f64,
) -> (Vec<Vec<f64>>, Vec<f64>) {
    let mut theta = vec![vec![0.0; n_features]; n_actions]; // the actor
    let mut w = vec![0.0; n_features]; // the critic

    for _ in 0..episodes {
        let mut state = env.reset();
        let mut done = false;

        // gamma^t on the step index. The derivation requires it and nearly
        // every implementation silently drops it; writing it out makes the
        // omission elsewhere a decision rather than an accident.
        let mut discount_so_far = 1.0;

        while !done {
            let probabilities = policy_probabilities(&theta, &state);
            let action = sample_action(&probabilities, rand());
            let result = env.step(action);

            // Zero at a true terminal: there is no future to bootstrap from.
            let next_value = if result.done { 0.0 } else { state_value(&w, &result.next_state) };
            let value = state_value(&w, &state);

            // One quantity, two jobs.
            let td_error = result.reward + gamma * next_value - value;

            // Critic. The gradient of (target - V)^2 with respect to w is
            // -2 * td_error * dV/dw, and dV/dw is s for a linear critic. A
            // semi-gradient: the target's own dependence on w through V(s') is
            // not differentiated.
            for i in 0..n_features {
                w[i] += alpha_critic * td_error * state[i];
            }

            // Actor. The score, weighted by the advantage.
            //
            // td_error enters as a NUMBER: the critic's parameters play no part
            // in this update. That is the hand-written equivalent of detaching
            // the advantage from a graph, and forgetting it in an autodiff
            // version trains the critic to make advantages LARGE rather than
            // accurate.
            for candidate in 0..n_actions {
                let indicator = if candidate == action { 1.0 } else { 0.0 };
                let coefficient =
                    discount_so_far * td_error * (indicator - probabilities[candidate]);
                for i in 0..n_features {
                    theta[candidate][i] += alpha_actor * coefficient * state[i];
                }
            }

            discount_so_far *= gamma;
            state = result.next_state;
            done = result.done;
        }
    }

    (theta, w)
}`,
        profile: 'O(|A| x d) per step for the actor plus O(d) for the critic. Vec<Vec<f64>> scatters every row; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Actor-critic - typed errors, flat rollout storage, GAE, diagnostics exposed.

use std::fmt;

/// Newtypes so a discount, a trace decay and a step size cannot be transposed.
/// All three are bare f32 in the naive version.
#[derive(Debug, Clone, Copy)]
pub struct Discount(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct TraceDecay(pub f32);

/// A true terminal has no future. A time-limit truncation does, and its
/// bootstrap must be kept. A single bool conflates them, and the resulting
/// policy is visibly short-sighted at the episode limit - so the distinction
/// is encoded in a type that a call site cannot forget.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EpisodeEnd {
    Running,
    Terminal,
    Truncated,
}

impl EpisodeEnd {
    /// Terminal cuts the bootstrap. Truncated keeps it.
    #[inline]
    #[must_use]
    pub fn keeps_future(self) -> f32 {
        if matches!(self, Self::Terminal) { 0.0 } else { 1.0 }
    }

    /// Both cut the ACCUMULATION, because the observed trajectory ends either
    /// way and an advantage must not sum TD errors across the boundary.
    #[inline]
    #[must_use]
    pub fn continues(self) -> f32 {
        if matches!(self, Self::Running) { 1.0 } else { 0.0 }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum ActorCriticError {
    EmptyRollout,
    BadDiscount,
    BadLambda,
    NonPositiveValueCoefficient,
}

impl fmt::Display for ActorCriticError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyRollout => write!(f, "horizon, env count and feature width must be positive"),
            Self::BadDiscount => write!(f, "gamma must be in [0, 1)"),
            Self::BadLambda => write!(f, "lambda must be in [0, 1]"),
            Self::NonPositiveValueCoefficient => {
                write!(f, "a non-positive value coefficient leaves the critic untrained")
            }
        }
    }
}

impl std::error::Error for ActorCriticError {}

/// Structure-of-arrays rollout storage, owning flat memory and reused between
/// rollouts. The naive version stores nothing because it updates online;
/// batching needs storage, and this is the shape that does not fragment.
pub struct Rollout {
    horizon: usize,
    n_envs: usize,
    rewards: Vec<f32>,
    values: Vec<f32>,
    ends: Vec<EpisodeEnd>,
    advantages: Vec<f32>,
    returns: Vec<f32>,
}

impl Rollout {
    pub fn new(horizon: usize, n_envs: usize) -> Result<Self, ActorCriticError> {
        if horizon == 0 || n_envs == 0 {
            return Err(ActorCriticError::EmptyRollout);
        }
        let cells = horizon * n_envs;
        Ok(Self {
            horizon,
            n_envs,
            rewards: vec![0.0; cells],
            values: vec![0.0; cells],
            ends: vec![EpisodeEnd::Running; cells],
            advantages: vec![0.0; cells],
            returns: vec![0.0; cells],
        })
    }

    /// GAE in one reversed pass: A_t = delta_t + gamma * lambda * A_(t+1).
    ///
    /// The recursion is exact, so an exponentially weighted sum of TD errors
    /// costs the same single backward pass a plain return would.
    pub fn compute_advantages(
        &mut self,
        gamma: Discount,
        lambda: TraceDecay,
        last_value: &[f32],
    ) {
        let mut running = vec![0.0_f32; self.n_envs];
        let mut next_value = last_value.to_vec();

        for step in (0..self.horizon).rev() {
            let base = step * self.n_envs;
            for env in 0..self.n_envs {
                let index = base + env;
                let end = self.ends[index];

                let delta = self.rewards[index]
                    + gamma.0 * next_value[env] * end.keeps_future()
                    - self.values[index];
                running[env] = delta + gamma.0 * lambda.0 * end.continues() * running[env];

                self.advantages[index] = running[env];
                // The critic regresses onto advantage + value, the same target
                // the advantage was built from, keeping the two consistent.
                self.returns[index] = running[env] + self.values[index];
                next_value[env] = self.values[index];
            }
        }
    }

    #[must_use]
    pub fn advantages(&self) -> &[f32] {
        &self.advantages
    }

    #[must_use]
    pub fn returns(&self) -> &[f32] {
        &self.returns
    }
}

/// 1 - Var(actual - predicted) / Var(actual).
///
/// The single most informative number in an actor-critic run, and the one most
/// often not logged. Below zero the critic is worse than predicting the mean,
/// which makes every advantage downstream of it noise.
#[must_use]
pub fn explained_variance(predicted: &[f32], actual: &[f32]) -> f32 {
    let count = actual.len() as f32;
    let mean = actual.iter().sum::<f32>() / count;

    let total: f32 = actual.iter().map(|v| (v - mean).powi(2)).sum();
    let residual: f32 = actual
        .iter()
        .zip(predicted.iter())
        .map(|(a, p)| (a - p).powi(2))
        .sum();

    if total == 0.0 {
        return 0.0;
    }
    1.0 - residual / total
}`,
        rationale:
          'Online per-step updates become batched rollouts over flat structure-of-arrays storage that is reused rather than reallocated. The one-step advantage becomes GAE, a continuous bias-variance dial computed in the same single reversed pass. The done bool becomes an enum whose two methods encode the distinction that matters — terminal cuts the bootstrap, both cut the accumulation — so a call site cannot forget it. And explained variance is exposed, because it is the number that says whether the critic is tracking at all.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per rollout field, reused between rollouts; GAE is one reversed pass.',
      },
      'make-it-fast': {
        code: `//! A2C - environments in lockstep, GAE over contiguous slices, one trunk GEMM.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// The name is the optimization. A3C ran asynchronous workers applying
/// lock-free updates from stale parameters; A2C steps N environments
/// synchronously and applies one update. The synchronous version is simpler
/// and at least as good, which localized where the benefit had actually come
/// from: decorrelation across independent environments, not the asynchrony.
pub struct StepOutcome {
    pub reward: f32,
    pub terminal: bool,
    pub truncated: bool,
}

/// Advance every environment exactly one step, in parallel.
///
/// Each environment owns its own state and writes to its own output slot, so
/// nothing is shared and the closure needs no locking. Unlike whole-episode
/// rollouts the work per iteration is uniform here, so the split is even.
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

/// GAE across every environment at once, fused into a single reversed sweep.
///
/// The recursion is sequential in TIME and cannot be vectorized along it, but
/// it is fully independent across environments. Fusing delta, the decay, the
/// advantage and the critic's regression target into one pass means the block
/// is traversed once rather than four times, with no delta buffer written.
pub fn gae_fused(
    rewards: &[f32],
    values: &[f32],
    keeps_future: &[f32],
    continues: &[f32],
    last_value: &[f32],
    horizon: usize,
    n_envs: usize,
    gamma: f32,
    lambda: f32,
    advantages: &mut [f32],
    returns: &mut [f32],
) {
    let mut running = vec![0.0_f32; n_envs];
    let mut next_value = last_value.to_vec();

    for step in (0..horizon).rev() {
        let range = step * n_envs..(step + 1) * n_envs;

        // Every participant is a contiguous slice of the same length, so the
        // zipped iterator chain drops its bounds checks and the whole inner
        // sweep streams.
        let rewards_row = &rewards[range.clone()];
        let values_row = &values[range.clone()];
        let keeps_row = &keeps_future[range.clone()];
        let continues_row = &continues[range.clone()];
        let advantages_row = &mut advantages[range.clone()];
        let returns_row = &mut returns[range];

        for env in 0..n_envs {
            let delta = rewards_row[env] + gamma * next_value[env] * keeps_row[env]
                - values_row[env];
            running[env] = delta + gamma * lambda * continues_row[env] * running[env];

            advantages_row[env] = running[env];
            returns_row[env] = running[env] + values_row[env];
            next_value[env] = values_row[env];
        }
    }
}

/// One trunk GEMM feeds both heads.
///
/// Running the policy and the critic as separate passes duplicates the trunk,
/// which is most of the compute, for no reason. Sharing it means collection
/// costs one forward per step regardless of how many heads hang off it.
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

    /// Mean entropy from the logits directly, without collecting a probability
    /// matrix only to reduce it again.
    #[must_use]
    pub fn mean_entropy(&self, logits: &Array2<f32>) -> f32 {
        let total: f32 = logits
            .axis_iter(Axis(0))
            .map(|row| {
                let largest = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let normalizer = row.iter().map(|v| (v - largest).exp()).sum::<f32>().ln() + largest;
                -row.iter()
                    .map(|v| {
                        let log_p = v - normalizer;
                        log_p.exp() * log_p
                    })
                    .sum::<f32>()
            })
            .sum();
        total / logits.nrows() as f32
    }
}`,
        rationale:
          'Environments advance one step each across threads, which is uniform work per iteration and needs no locking since each owns its state and output slot. The GAE sweep fuses delta, the decay, the advantage and the critic target into one reversed pass over contiguous per-step slices, traversing the block once instead of four times with no delta buffer. And one trunk GEMM feeds both heads, because running the policy and the critic separately duplicates the trunk, which is most of the compute.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each environment advances one step into its own output slot, so lockstep collection parallelizes with no shared state and no locking — this is what A2C is.',
            tradeoff: 'A slow environment stalls the batch, each thread needs its own environment instance, and reproducibility now depends on the environment count as well as the seed.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Every participant in the reversed sweep is a contiguous per-step slice of the same length, which is what lets the fused inner loop stream instead of striding.',
            tradeoff: 'It fixes the rollout as time-major, so any consumer wanting environment-major order pays a transpose the naive layout would not have needed.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The zipped slice walks in the sweep and the row iterators in the entropy reduction both drop their bounds checks, and no probability matrix is materialized for a per-row quantity.',
            tradeoff: 'Each row is traversed twice in the entropy path — once for the normalizer, once for the value — trading a little arithmetic for the memory an intermediate would cost.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The trunk becomes one GEMM over the whole batch feeding both heads, rather than a per-step product run twice for the policy and the critic.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, complicating cross-compilation and making the binary sensitive to which implementation is linked.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'One trunk GEMM per batch feeding both heads; one fused reversed sweep for GAE. Illustrative, not a measured benchmark.',
      },
    },
  },
};
