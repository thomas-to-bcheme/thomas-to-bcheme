import type { AiMlModel } from '../../types';

/**
 * REINFORCE — the entry where the policy stops being derived from a
 * value function and becomes the thing that is optimized.
 *
 * The whole method is one identity: you can differentiate an
 * expectation over a distribution you control by weighting the
 * gradient of its log-density by the outcome. Everything else here is
 * a response to how noisy that estimator is.
 */
export const REINFORCE: AiMlModel = {
  slug: 'reinforce',
  name: 'REINFORCE',
  aliases: ['Vanilla policy gradient', 'Monte Carlo policy gradient', 'Score-function estimator', 'Likelihood-ratio method'],
  category: 'reinforcement-learning',
  group: 'policy-gradient',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'On-policy reinforcement learning, and the first method in this category that never estimates a value of anything. The policy is a parameterized distribution and the gradient of expected return with respect to its parameters is estimated directly from sampled trajectories, which is why it extends to continuous and structured action spaces where a value-based argmax has nothing to maximize over.',

  intuition:
    'Every value-based method so far has produced a policy as a by-product: learn the values, take the argmax. That works until the action space is continuous or combinatorial, at which point the argmax itself becomes an optimization problem you cannot afford to solve at every step. REINFORCE takes the other route and parameterizes the policy directly, then asks how to improve it. The obstacle is that expected return is an expectation over trajectories the policy itself generates, so changing the parameters changes the distribution being averaged over, and there is no obvious way to differentiate through that. The score-function identity resolves it in one line: the gradient of an expectation over a parameterized distribution equals the expectation of the outcome times the gradient of the log-density. Both sides are expectations you can sample. So the algorithm is embarrassingly simple — run an episode, compute the return, and take a gradient step that makes every action taken more likely in proportion to how good the return was. Good episodes get reinforced, bad ones get suppressed, and nothing needs to be known about the environment. What you pay for that generality is variance. The estimator is unbiased and it is also so noisy that the raw form is essentially unusable on anything real, which is why every practical policy-gradient method is REINFORCE plus a stack of variance reductions. The failure mode is distinctive too: with no exploration mechanism outside the policy itself, a policy that becomes deterministic early has no way back, because the gradient for an action it never takes is never sampled.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\mathbb{E}_{\\tau \\sim \\pi_{\\theta}}\\bigl[R(\\tau)\\bigr], \\qquad \\nabla_{\\theta} J(\\theta) = \\mathbb{E}_{\\tau \\sim \\pi_{\\theta}}\\Bigl[ \\sum_{t} \\nabla_{\\theta} \\log \\pi_{\\theta}(a_t \\mid s_t)\\,\\bigl(G_t - b(s_t)\\bigr) \\Bigr]',
      symbols: [
        { symbol: '\\nabla_{\\theta} \\log \\pi_{\\theta}(a_t \\mid s_t)', meaning: 'the score — the direction in parameter space that makes the action actually taken more likely, which is all this method ever computes' },
        { symbol: 'G_t', meaning: 'the return from time t onward, not from the episode start: an action cannot have caused rewards that preceded it' },
        { symbol: 'b(s_t)', meaning: 'a baseline, any function of state and not of action; it changes the variance of the estimator and provably not its mean' },
        { symbol: '\\tau \\sim \\pi_{\\theta}', meaning: 'trajectories drawn from the current policy, which is why every gradient step needs fresh data and none of it can be reused' },
      ],
    },
    reading:
      'The identity underneath is worth stating plainly, because it recurs far outside reinforcement learning: to differentiate an expectation with respect to the parameters of the distribution being averaged over, multiply the outcome by the gradient of the log-density. Nothing about the environment has to be differentiable, or even known — only the policy does. That is what makes the method work on discrete actions, on sampled text, and on any pipeline with a non-differentiable step in the middle. Three readings of the formula pay off. First, it is weighted maximum likelihood: the update makes the actions that were taken more likely, scaled by how well things went, so a policy gradient step is a supervised imitation step on your own behaviour weighted by outcome. Second, the surrogate that gets differentiated in code — the sum of log-probabilities times returns — has a value that means nothing at all. It is constructed so that its gradient is right, not so that its value is; watching it go down is watching noise, and this is one of the most common misreadings in applied RL. Third, the baseline subtraction is free in expectation. Any function of state, including a constant, leaves the mean of the estimator unchanged because the expected score is zero, so it can be chosen purely to reduce variance. That is the opening every practical improvement walks through: subtract a learned value function and you have actor-critic, constrain how far the policy moves per step and you have TRPO and PPO.',
  },

  optimization: {
    method: 'Stochastic gradient ascent on the score-function estimate of the policy gradient, computed from complete Monte Carlo episodes',
    updateRule: {
      formula:
        '\\theta \\leftarrow \\theta + \\alpha \\sum_{t=0}^{T} \\gamma^{t} \\bigl(G_t - b(s_t)\\bigr) \\nabla_{\\theta} \\log \\pi_{\\theta}(a_t \\mid s_t), \\qquad G_t = \\sum_{k=t}^{T} \\gamma^{k-t} r_k',
      symbols: [
        { symbol: 'G_t - b(s_t)', meaning: 'the advantage estimate: how much better this action turned out than the baseline expected, which is the signed weight on the score' },
        { symbol: '\\gamma^{t}', meaning: 'the discount on the step index itself, which the theory requires and almost every implementation quietly omits' },
        { symbol: '\\alpha', meaning: 'the step size, and the most dangerous hyperparameter here — a policy that moves too far in one step collects worse data and cannot recover from it' },
        { symbol: 'T', meaning: 'the episode end; the return is not available until it arrives, which is why this cannot be applied to a continuing task without truncation' },
      ],
    },
    rationale:
      'The raw estimator is unbiased and unusable, so the engineering is entirely in variance reduction, and each step of it is worth knowing separately. Reward-to-go comes first: weighting an action by the whole episode return credits it with rewards that preceded it, which is pure noise, and restricting to the return from that step onward removes it without bias. A baseline comes second, and it is the single largest win — subtracting any function of state leaves the mean untouched because the expected score is zero, so a good baseline can cut variance by an order of magnitude for free. The optimal one is the state value function, which is exactly what actor-critic introduces, and the crude version of running-mean normalization of returns within a batch is what most implementations actually use. Batching multiple episodes per update comes third, and it is not optional: a single-episode gradient is so noisy that the policy performs a random walk. An entropy bonus comes fourth, and it addresses the one failure the other three do not — because the policy is the only source of exploration, a distribution that sharpens early stops sampling the alternatives entirely, and the gradient for an action that is never taken is never computed. Adding a small entropy term to the objective keeps the distribution from collapsing before it has evidence. What none of this fixes is sample efficiency. The estimator is valid only for data from the current policy, so every gradient step discards its data, and that is the structural reason PPO exists: it is the same estimator with a trust region that makes several steps per batch safe.',
    hyperparameters: [
      { name: 'batch size (episodes per update)', role: 'The primary variance control. A single-episode gradient makes the policy random-walk; the estimator only becomes usable once many trajectories are averaged', typicalRange: '10 to 100 episodes, or 2,000 to 10,000 steps' },
      { name: 'learning rate', role: 'The most dangerous knob here, because a policy that steps too far collects worse data and the damage compounds through the distribution it then samples from', typicalRange: '1e-4 to 3e-4 with Adam' },
      { name: 'baseline choice', role: 'Constant, batch-mean, or a learned value function. Free in expectation and the largest single variance reduction available, which is why the learned version became actor-critic', typicalRange: 'batch-normalized returns, or a learned V' },
      { name: 'entropy coefficient', role: 'The only thing preventing premature determinism, since the policy is the sole source of exploration and a collapsed distribution stops sampling alternatives permanently', typicalRange: '0.0 to 0.01, higher for discrete actions' },
      { name: 'discount (gamma)', role: 'Sets the horizon and also acts as a variance control — a shorter horizon truncates the noisy tail of the return at the cost of ignoring genuinely delayed reward', typicalRange: '0.99, lower when returns are very noisy' },
      { name: 'advantage normalization', role: 'Standardizing advantages within a batch. Technically introduces bias since the statistics are sample-dependent, and is almost universal anyway because the stabilization is worth more', typicalRange: 'on, per batch' },
      { name: 'gradient clipping', role: 'Bounds the damage from an outlier episode whose return is far outside the batch distribution, which is the policy-gradient analogue of Huber loss', typicalRange: 'global norm 0.5 to 10' },
    ],
    convergence:
      'The estimator is unbiased, so under standard stochastic-approximation conditions and a step size satisfying Robbins-Monro, REINFORCE converges to a local optimum of expected return. Read that carefully: local, and of a non-concave objective in a distribution the optimizer is itself moving. In practice the guarantee delivers much less than it sounds like. The dominant obstacle is variance: the estimator scales badly with horizon and with the dimension of the action space, and a naive implementation on a long-horizon task produces gradients whose signal-to-noise ratio is close to zero, so training looks like a random walk with a slight drift. The characteristic failure mode, and the one to recognize on sight, is entropy collapse. There is no exploration mechanism outside the policy, so if the distribution sharpens onto one action before there is evidence for it — which a few lucky episodes are enough to cause — the alternatives stop being sampled, their scores stop being computed, and the policy is stuck at a deterministic solution it can never leave. This appears as a return curve that rises quickly, plateaus well below what is achievable, and never moves again, and it is why an entropy bonus is standard rather than optional. A second failure worth naming is that a large step collects worse data, which produces a worse gradient, which motivates another bad step; unlike supervised learning, a bad update here corrupts the future training distribution, and that feedback is precisely what trust-region methods were invented to bound. And as with every method in this category, seed variance is large enough that single-seed comparisons are uninformative.',
    complexity:
      'Per episode: one forward pass per step to sample the action, then one backward pass over the stored log-probabilities at episode end. The return computation is a single reversed pass, O(T). Compute per environment step is roughly one network forward, which makes this cheaper per step than DQN, whose extra target-network pass and minibatch replay dominate. Memory is small and bounded by the batch rather than by a replay buffer — there is no buffer, because on-policy data cannot be reused. The real cost is sample complexity: with no reuse, every gradient step consumes a full batch of fresh trajectories, so total environment interaction is typically several times what an off-policy method of comparable quality needs. That trade — cheaper per step, far more steps — is the defining cost profile of on-policy learning.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no policy to parameterize and no distribution over actions whose log-density could be differentiated, since a forecaster does not act and does not influence what it observes next; the moment a forecast drives a decision the problem is a control problem instead.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without taking actions, so the score-function estimator has no action distribution to attach to — and a policy gradient carries no notion of how unusual an observation was, only of how well the episode containing it turned out.',
      },
      optimization: {
        fit: 'primary',
        how: 'Optimize a parameterized policy directly by sampling trajectories and weighting the gradient of each action\'s log-probability by how well the episode went. Nothing about the environment or the objective needs to be differentiable — only the policy.',
        where: [
          'Objectives with a non-differentiable component, where backpropagation stops and the score-function estimator does not',
          'Continuous or structured action spaces, where a value-based argmax is itself an intractable optimization',
          'Variance reduction as a first-class design problem: reward-to-go, baselines, batching and entropy each removing a nameable source of noise',
          'The foundation every modern policy-gradient method builds on — actor-critic replaces the baseline with a learned critic, PPO adds a trust region',
        ],
        why: 'The conceptual pivot of this whole category, and the identity at its core is the most transferable thing in it: an expectation over a distribution you control can be differentiated by weighting outcomes by the gradient of the log-density, with no requirement that anything downstream be differentiable. That single fact is why policy gradients reach places backpropagation cannot — discrete sampling, black-box simulators, human preference scores, non-differentiable evaluation metrics. Three further lessons transfer. The baseline result is the clean one: subtracting any function of state changes variance and provably not the mean, which is a general template for building estimators that are cheaper without being wrong. The surrogate-value warning is the practical one: the quantity differentiated in code is constructed so its gradient is correct, and its value is meaningless — a reported policy loss that goes down tells you nothing, and misreading it is endemic. And the exploration lesson is the structural one: when the policy is the only source of stochasticity, losing entropy is losing the ability to learn at all, permanently, which has no analogue in a value-based method with an epsilon outside the policy. Where REINFORCE is the wrong choice is easy to state — if the actions are discrete and small and a simulator is available, a value-based method will get there with far fewer samples, and if the actions are continuous, PPO or SAC dominate it on every axis except simplicity.',
        featurization: [
          'Use reward-to-go rather than the full episode return; crediting an action with rewards that preceded it adds variance and no signal',
          'Subtract a baseline, even a batch mean — it is free in expectation and it is the largest single variance reduction available',
          'Batch many episodes per update, because a single-episode gradient is noise with a slight drift',
          'Keep an entropy term, since the policy is the only exploration mechanism and a collapsed distribution never recovers',
        ],
        evaluation:
          'Median return over at least five seeds with the interquartile range shown; policy-gradient runs vary enough across seeds that a single-run comparison measures the seed. Track policy entropy on the same plot as return — a return curve that plateaus while entropy has already collapsed is diagnosing itself. And never report the surrogate objective as a training loss: its value carries no information, only its gradient does.',
        pitfalls: [
          'Reading the surrogate objective as a loss, when it was constructed only so its gradient would be correct',
          'Weighting actions by the full episode return, which credits them for rewards that happened first',
          'Updating from one episode at a time, which produces a policy that random-walks',
          'Letting entropy collapse before there is evidence, after which the unexplored actions are never sampled or updated again',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'viable',
        how: 'Treat generation as a sequence of sampled token decisions and optimize a sequence-level score — a metric, a reward model, a human preference — that no differentiable loss can express. The sampling step blocks backpropagation; the score-function estimator does not need it.',
        where: [
          'Optimizing non-differentiable sequence-level metrics directly rather than the token-level cross-entropy that stands in for them',
          'Self-critical sequence training, where the baseline is the model\'s own greedy decode — a baseline that costs one extra forward pass and needs no learned critic',
          'Preference optimization from a learned reward model, which is REINFORCE-style estimation with a KL penalty to the reference policy',
          'Any generation pipeline with a sampling or search step in the middle that gradients cannot pass through',
        ],
        why: 'The place where the score-function estimator earns its keep outside control, and the argument is about what cross-entropy cannot express. Token-level maximum likelihood trains a model to predict the next token given a ground-truth prefix and then deploys it on prefixes it generated itself, and it cannot score a sequence as a whole at all — so any objective defined over the finished output is unreachable by backpropagation. A policy gradient reaches it, because it only needs to sample and to score. Two practical notes decide whether it works. The baseline matters more here than anywhere else: sequence-level rewards have enormous variance, and the self-critical trick of using the model\'s own greedy decode as the baseline is both cheap and unusually effective, since it directly asks whether sampling beat being deterministic. And the reward is almost always a proxy — a metric, or a learned preference model — which means the optimizer will find its defects, so a KL penalty toward the original model is standard and is a constraint rather than a regularizer. Where this goes wrong is well documented: unconstrained optimization against a learned reward produces fluent text that scores well and reads badly, which is reward hacking doing exactly what the objective asked.',
        featurization: [
          'Start from a supervised-pretrained model; policy gradients refine a competent policy and cannot discover language from scratch',
          'Use the model\'s own greedy decode as the baseline when no critic is available — cheap, and it directly measures whether sampling beat determinism',
          'Keep a KL penalty to the reference policy, since an unconstrained optimizer will find the reward model\'s defects rather than the behaviour it was meant to encode',
          'Normalize rewards within a batch, because sequence-level scores are unbounded and their scale sets the gradient scale',
        ],
        evaluation:
          'The target metric on held-out prompts, alongside a measure of how far the policy has moved from the reference — a large reward gain with a large KL divergence is usually reward hacking rather than improvement. Human or held-out judgement decides in the end, because the proxy being optimized is exactly the thing that stops being trustworthy once it is optimized against.',
        pitfalls: [
          'Optimizing a learned reward without a KL constraint, which produces text that scores well and reads badly',
          'Training from scratch rather than refining a supervised model, which policy gradients are far too sample-inefficient to do',
          'Unnormalized sequence rewards, whose scale silently becomes the learning rate',
          'Reporting the proxy metric as the result when the proxy was the thing being gamed',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Parameterize a policy over a narrowed candidate set and optimize long-horizon session value directly, with logged impressions reweighted by importance ratios so that data generated by the previous serving policy can still be used.',
        where: [
          'Long-horizon objectives — session value, retention — that a per-impression supervised loss structurally cannot represent',
          'Off-policy correction on logged traffic, which is what makes an on-policy estimator usable on data a previous policy generated',
          'Top-K slate recommendation, where the correction has to account for presenting several items rather than one',
          'Surfaces already running deliberate exploration, which supplies the action-probability logging every correction needs',
        ],
        why: 'One of the few settings where a policy-gradient method has a well-documented production track record, and the reason is structural: the action is a choice among candidates, the objective is long-horizon, and a policy that outputs a distribution over candidates is exactly the object a ranking system already serves. The obstacle is that the estimator is on-policy and the data is historical, which is resolved with importance weighting — reweighting each logged action by the ratio of the new policy\'s probability to the logged one. That correction is unbiased and has variance that grows sharply as the two policies diverge, so ratios are clipped in practice, which trades the bias back in. Two requirements decide feasibility before anything else. The logged action probabilities must have been recorded at serving time, because they cannot be reconstructed afterwards and every correction needs them. And the candidate set has to come from a retrieval stage, since a policy over a full catalogue is not something a softmax can represent. Where it works, the gain is the one supervised ranking cannot reach: optimizing what a session is worth rather than what the next click is worth.',
        featurization: [
          'Log the serving policy\'s action probabilities at request time; no off-policy correction is possible without them and they cannot be recovered later',
          'Narrow to a candidate set with retrieval first, since a policy distribution over a catalogue is not representable',
          'Clip importance ratios, accepting the bias — unclipped ratios have variance that explodes exactly when the new policy is most different',
          'Define the horizon explicitly, because the discount is choosing what the system optimizes rather than tuning it',
        ],
        evaluation:
          'Online experiments decide. Off-policy estimates are for triage, and their variance grows with the divergence between the candidate and logged policies, which is precisely the regime where a decision is needed. Report the long-horizon objective the system was built for, since improving click-through was never the reason to take on this machinery.',
        pitfalls: [
          'Propensities never logged, which makes every correction unavailable after the fact',
          'Unclipped importance ratios, whose variance makes the estimate useless where it matters most',
          'Treating an off-policy estimate as a decision rather than as triage',
          'A policy that collapses onto a few popular items, which is entropy collapse wearing a business-metric disguise',
        ],
      },
      'control-and-operations': {
        fit: 'adapted',
        how: 'Learn a stochastic control policy over a continuous action space directly from simulated interaction, using sampled trajectories and returns rather than any value function or model of the dynamics.',
        where: [
          'Continuous actions where a value-based argmax has nothing tractable to maximize over',
          'Black-box or non-differentiable simulators, which the score-function estimator does not need to differentiate through',
          'A conceptual baseline against which actor-critic and PPO can be measured, rather than a method to deploy',
          'Small problems where the simplicity of the implementation genuinely outweighs the sample cost',
        ],
        why: 'Marked adapted rather than primary because the plain method is almost never the right deployment choice here, and saying so is more useful than claiming otherwise. The structural fit is real — continuous actions are exactly where value-based methods run out, and operations problems are full of them. But the variance of the Monte Carlo estimator scales badly with horizon, and operations problems have long horizons, so the sample requirement becomes impractical against a simulator that is itself expensive to run. Every property that makes REINFORCE attractive here is retained by PPO, which adds a learned critic and a trust region and dominates it on sample efficiency by a wide margin. The honest recommendation is to understand REINFORCE as the thing PPO is made of, and to deploy PPO. Two cautions apply to the whole family regardless of which member is chosen: a stochastic policy takes random-ish actions by construction, which is a liability in a physical system and means the deployed policy should be the distribution\'s mode rather than a sample; and a reward penalty is not a constraint, so anything genuinely unsafe needs an interlock the policy cannot negotiate with.',
        featurization: [
          'Bound and normalize continuous actions, since an unbounded Gaussian policy will eventually sample something the actuator cannot do',
          'Normalize observations and returns; both set gradient scale, and neither is stable across operating regimes without it',
          'Deploy the mode rather than a sample from the policy, because a stochastic controller is a liability in a physical system',
          'Reach for PPO instead unless the simplicity of this implementation is genuinely the deciding factor',
        ],
        evaluation:
          'Simulated return against the incumbent controller on matched scenarios, with constraint violations counted separately rather than averaged into the return. Evaluate the deterministic policy that will actually be deployed, not the stochastic one that was trained, since they are different controllers and only one of them ships.',
        pitfalls: [
          'Long horizons, where the Monte Carlo return\'s variance makes the gradient nearly pure noise',
          'Deploying the stochastic policy, so a production controller samples its actions',
          'Expressing a hard constraint as a reward penalty, which an optimizer treats as a price rather than a limit',
          'Choosing this over PPO for anything beyond a study exercise, when PPO retains every advantage and removes the main cost',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Cheap per environment step — one forward pass to sample an action and one backward pass per batch — and expensive in total, because nothing is reused. Every gradient step consumes a fresh batch of complete episodes, so interaction requirements typically run several times those of an off-policy method reaching comparable quality. Memory is small and bounded by the batch rather than by any replay buffer, which does make it the easiest method here to run on modest hardware. Budget for at least five seeds, because the variance across them frequently exceeds the effect being measured. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One forward pass producing a distribution, then either a sample or its mode. Serving is trivial, and the decision that matters is which of the two is deployed: the trained object is stochastic, the shipped controller usually should not be, and a deterministic deployment of a policy trained stochastically is a different controller whose performance must be measured separately rather than assumed.',
    retrainingCadence:
      'Retrained in batches rather than updated continuously, since the estimator is only valid for data from the current policy and continuous online updating against live traffic means a live system taking sampled actions. The usual arrangement is periodic offline training against a simulator or corrected logs, followed by offline evaluation and a staged rollout. Cadence follows how fast the environment moves, and in practice the simulator goes stale before the policy does.',
    driftAndMonitoring: [
      'Policy entropy, which is the leading indicator of the characteristic failure — a collapsed distribution has stopped exploring permanently and the return curve will flatten shortly after',
      'Realized return under the deployed policy against the incumbent on matched scenarios, not in aggregate',
      'KL divergence between successive policy versions, since a large step collects worse data and the damage compounds through the distribution it then samples from',
      'Gradient norm and its variance, which is the direct read on whether the estimator still carries signal at the current batch size',
      'Action distribution over time: mass concentrating on a few actions is entropy collapse showing up in production',
      'Where a reward model stands in for the true objective, the gap between proxy score and the outcome it proxies for — that gap is what reward hacking looks like',
    ],
    productionGotchas: [
      'The surrogate objective\'s value is meaningless. It is constructed so its gradient is correct, and reporting it as a training loss — or tuning against it — is one of the most common errors in applied policy gradients',
      'Entropy collapse is permanent. Once the policy stops sampling an action its score is never computed again, and no amount of further training recovers it, because there is no exploration mechanism outside the policy',
      'Weighting an action by the full episode return instead of the reward-to-go credits it with rewards that preceded it, which is pure added variance and looks like a harmless simplification',
      'The theoretically required gamma^t factor on the step index is omitted in nearly every implementation, which makes the standard version a biased estimator of a slightly different objective — worth knowing before debugging a discrepancy against the derivation',
      'Single-episode updates produce a random walk. The estimator is only usable once many trajectories are averaged, and batch size is a correctness-adjacent parameter here rather than a throughput one',
      'A stochastic policy deployed as-is samples its actions in production. Ship the mode, and measure the deterministic policy separately, because it is not the one that was trained',
      'On-policy means no replay buffer and no learning from historical logs without importance correction, and the correction has variance that grows precisely as the policies diverge',
      'Seed variance routinely exceeds the difference between method variants, so a comparison run on one seed each is measuring the seed',
    ],
  },

  assumptions: [
    'The policy is differentiable in its parameters and assigns non-zero probability to every action it might need to take — a zero probability is an action whose gradient is never sampled',
    'Episodes terminate, because the Monte Carlo return does not exist until the episode ends; a continuing task must be truncated, which introduces bias',
    'Trajectories come from the current policy, which is what makes the estimator valid and what forbids replay',
    'Enough episodes can be collected per update to average the estimator down to something usable, which in practice means a simulator',
    'Rewards are on a bounded or normalized scale, since reward magnitude directly sets gradient magnitude here with nothing in between',
  ],

  pros: [
    {
      point: 'Nothing downstream of the policy needs to be differentiable',
      context:
        'The score-function estimator requires only the ability to sample and to score, which is why it reaches non-differentiable metrics, discrete sampling, black-box simulators and human preference signals that backpropagation cannot touch',
    },
    {
      point: 'Handles continuous and structured action spaces natively',
      context:
        'There is no argmax over actions anywhere, which is the exact wall every value-based method hits. A Gaussian policy over a continuous action is as easy as a softmax over a discrete one',
    },
    {
      point: 'Unbiased, with a clean theoretical account of what can be changed for free',
      context:
        'The baseline result — any function of state changes variance and not the mean — is unusually clean, and it is the doorway every practical improvement walks through, actor-critic and PPO included',
    },
    {
      point: 'Optimizes the policy that will be used, including its stochasticity',
      context:
        'No detour through a value function whose argmax may be a policy the agent never actually follows. What is improved is precisely what is deployed, modulo the decision to ship the mode',
    },
    {
      point: 'Simple enough to implement correctly in an afternoon',
      context:
        'Sample, compute returns, weight log-probabilities, step. That simplicity makes it the right thing to build first when debugging a new environment, because almost nothing can go wrong in the algorithm itself',
    },
  ],

  cons: [
    {
      point: 'Variance high enough that the raw estimator is unusable',
      context:
        'It scales badly with horizon and action dimension, and on a long-horizon task the gradient is close to pure noise. Every practical policy-gradient method is this estimator plus a stack of variance reductions, none of which is optional',
    },
    {
      point: 'On-policy, so every gradient step throws away its data',
      context:
        'No replay buffer, no reuse, no learning from logs without importance correction. Total interaction is typically several times what an off-policy method needs for the same result, which is the structural reason PPO exists',
    },
    {
      point: 'Entropy collapse is unrecoverable',
      context:
        'The policy is the only source of exploration, so a distribution that sharpens before the evidence supports it stops sampling the alternatives and never computes their gradients again. A value-based method with an epsilon outside the policy has no equivalent failure',
    },
    {
      point: 'Monte Carlo returns require episodes to end',
      context:
        'A continuing task has to be truncated, and truncation biases the return. High-variance returns from long episodes are also exactly where the estimator is weakest, so the constraint and the weakness compound',
    },
    {
      point: 'A bad step corrupts the data that trains the next one',
      context:
        'Unlike supervised learning, the optimizer controls its own training distribution, so an overlarge step produces worse trajectories and therefore a worse gradient. Bounding that feedback is the entire content of trust-region methods',
    },
    {
      point: 'Dominated in practice by its own descendants',
      context:
        'Actor-critic replaces the baseline with a learned critic and PPO adds a trust region with multiple epochs per batch; both retain every advantage listed above and remove the main cost. REINFORCE is what to understand, rarely what to deploy',
    },
  ],

  relatedSlugs: ['actor-critic', 'ppo-trpo', 'monte-carlo-control', 'q-learning', 'dqn', 'rlhf-dpo'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""REINFORCE - the policy gradient, transcribed.

A linear softmax policy, chosen because its score has a closed form you can
read straight off the code:

    d/dtheta_b  log pi(a | s)  =  (1[b == a] - pi(b | s)) * s

No autodiff, so the identity at the centre of the method is visible rather
than delegated.
"""

import math
import random


def softmax(scores):
    # Subtract the max before exponentiating. Without it a large score
    # overflows, and the overflow is silent right up until it is a nan.
    largest = max(scores)
    exponentials = [math.exp(score - largest) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def policy_probabilities(theta, state):
    """theta[a][i] is the weight on feature i for action a."""
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


def run_episode(env, theta, max_steps=1_000):
    """The return is not available until the episode ends, which is why this
    method cannot be applied to a continuing task without truncating it."""
    states, actions, rewards = [], [], []
    state = env.reset()

    for _ in range(max_steps):
        probabilities = policy_probabilities(theta, state)
        action = sample_action(probabilities, random.random())
        next_state, reward, done = env.step(action)

        states.append(state)
        actions.append(action)
        rewards.append(reward)

        state = next_state
        if done:
            break

    return states, actions, rewards


def returns_to_go(rewards, gamma):
    """G_t = r_t + gamma * G_(t+1), computed backwards in a single pass.

    Reward-to-GO, not the whole episode return. An action cannot have caused a
    reward that arrived before it, so including earlier rewards adds variance
    and contributes no signal - the first variance reduction, and free.
    """
    out = [0.0] * len(rewards)
    running = 0.0
    for step in range(len(rewards) - 1, -1, -1):
        running = rewards[step] + gamma * running
        out[step] = running
    return out


def train(env, n_features, n_actions, episodes=2_000, batch_episodes=10,
          alpha=0.01, gamma=0.99):
    theta = [[0.0] * n_features for _ in range(n_actions)]

    for _ in range(episodes // batch_episodes):
        # Gradients accumulate over a BATCH of episodes. A single-episode
        # gradient is noisy enough that the policy random-walks, so batching
        # here is what makes the estimator usable rather than a throughput
        # optimization.
        gradient = [[0.0] * n_features for _ in range(n_actions)]
        trajectories = []
        every_return = []

        for _ in range(batch_episodes):
            states, actions, rewards = run_episode(env, theta)
            discounted = returns_to_go(rewards, gamma)
            trajectories.append((states, actions, discounted))
            every_return.extend(discounted)

        # The baseline. Subtracting ANY function of state - a constant
        # included - leaves the gradient's mean untouched, because the
        # expected score is zero. It is free, and it is the single largest
        # variance reduction available.
        baseline = sum(every_return) / len(every_return)

        for states, actions, discounted in trajectories:
            for state, action, total_return in zip(states, actions, discounted):
                advantage = total_return - baseline
                probabilities = policy_probabilities(theta, state)

                # The score, for every action's weights at once: taking action
                # a pushes a's weights up and every other action's down, in
                # proportion to how likely they were.
                for candidate in range(n_actions):
                    indicator = 1.0 if candidate == action else 0.0
                    coefficient = advantage * (indicator - probabilities[candidate])
                    for index, feature in enumerate(state):
                        gradient[candidate][index] += coefficient * feature

        # ASCENT, not descent: expected return is being maximized, and the sign
        # error here is the easiest one in the method to make.
        for candidate in range(n_actions):
            for index in range(n_features):
                theta[candidate][index] += alpha * gradient[candidate][index] / batch_episodes

    return theta`,
        profile: 'O(|A| x d) per step for the score, in the interpreter. No library anywhere, including for the softmax.',
      },
      'make-it-right': {
        code: `"""REINFORCE - typed, batched, entropy-regularized, advantages normalized."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import NamedTuple, Protocol

import torch
from torch import Tensor, nn
from torch.distributions import Categorical


class Trajectory(NamedTuple):
    states: Tensor        # (T, features)
    actions: Tensor       # (T,)
    rewards: Tensor       # (T,)


class Environment(Protocol):
    def reset(self) -> Tensor: ...
    def step(self, action: int) -> tuple[Tensor, float, bool]: ...


@dataclass(frozen=True)
class ReinforceConfig:
    n_features: int
    n_actions: int
    hidden: tuple[int, ...] = (64, 64)
    learning_rate: float = 3e-4
    gamma: float = 0.99
    episodes_per_batch: int = 16
    # The only thing standing between this policy and premature determinism.
    # The policy is the sole source of exploration, so a distribution that
    # sharpens before the evidence supports it stops sampling the alternatives
    # and never computes their gradients again.
    entropy_coefficient: float = 0.01
    grad_clip_norm: float = 0.5
    normalize_advantages: bool = True

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma < 1.0:
            raise ValueError(f"gamma must be in [0, 1), got {self.gamma}")
        if self.episodes_per_batch < 2:
            raise ValueError("a single-episode gradient random-walks; batch at least two")
        if self.entropy_coefficient < 0.0:
            raise ValueError("a negative entropy coefficient rewards collapse")


@dataclass
class BatchDiagnostics:
    mean_return: float
    # Entropy is the leading indicator of the characteristic failure. A return
    # curve that plateaus is diagnosed by the entropy curve that collapsed a
    # few hundred updates earlier.
    policy_entropy: float
    grad_norm: float
    history: list[float] = field(default_factory=list)


def build_policy(config: ReinforceConfig) -> nn.Module:
    layers: list[nn.Module] = []
    width = config.n_features
    for size in config.hidden:
        layers += [nn.Linear(width, size), nn.Tanh()]
        width = size
    layers.append(nn.Linear(width, config.n_actions))
    return nn.Sequential(*layers)


def discounted_returns_to_go(rewards: Tensor, gamma: float) -> Tensor:
    """Reward-to-go: an action is credited only with what followed it."""
    out = torch.zeros_like(rewards)
    running = torch.zeros((), dtype=rewards.dtype)
    for step in range(rewards.shape[0] - 1, -1, -1):
        running = rewards[step] + gamma * running
        out[step] = running
    return out


def collect_batch(env: Environment, policy: nn.Module, config: ReinforceConfig) -> list[Trajectory]:
    """Rollouts run under no_grad: the graph is not needed here.

    Storing a per-step autograd graph across a whole batch of episodes holds
    memory proportional to total steps for no reason - the log-probabilities
    are recomputed in one batched pass at update time instead.
    """
    trajectories: list[Trajectory] = []

    with torch.no_grad():
        for _ in range(config.episodes_per_batch):
            states, actions, rewards = [], [], []
            state = env.reset()
            done = False

            while not done:
                distribution = Categorical(logits=policy(state))
                action = distribution.sample()
                next_state, reward, done = env.step(int(action))

                states.append(state)
                actions.append(action)
                rewards.append(reward)
                state = next_state

            trajectories.append(
                Trajectory(
                    states=torch.stack(states),
                    actions=torch.stack(actions),
                    rewards=torch.tensor(rewards, dtype=torch.float32),
                )
            )

    return trajectories


def update(
    policy: nn.Module,
    optimizer: torch.optim.Optimizer,
    trajectories: list[Trajectory],
    config: ReinforceConfig,
) -> BatchDiagnostics:
    states = torch.cat([t.states for t in trajectories])
    actions = torch.cat([t.actions for t in trajectories])
    advantages = torch.cat(
        [discounted_returns_to_go(t.rewards, config.gamma) for t in trajectories]
    )

    if config.normalize_advantages:
        # Standardizing within the batch. Technically this biases the
        # estimator, because the statistics depend on the sample - and it is
        # near-universal anyway, because the stabilization is worth more than
        # the bias costs.
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

    distribution = Categorical(logits=policy(states))
    log_probabilities = distribution.log_prob(actions)

    # This quantity's VALUE means nothing. It is constructed so that its
    # gradient equals the policy gradient, and nothing about its magnitude is
    # interpretable. Logging it as a training loss - or tuning against it - is
    # the most common misreading in applied policy gradients.
    surrogate = -(log_probabilities * advantages).mean()
    entropy = distribution.entropy().mean()
    objective = surrogate - config.entropy_coefficient * entropy

    optimizer.zero_grad(set_to_none=True)
    objective.backward()
    grad_norm = nn.utils.clip_grad_norm_(policy.parameters(), config.grad_clip_norm)
    optimizer.step()

    return BatchDiagnostics(
        mean_return=float(torch.stack([t.rewards.sum() for t in trajectories]).mean()),
        policy_entropy=float(entropy),
        grad_norm=float(grad_norm),
    )`,
        rationale:
          'Four changes, each removing a nameable failure. Episodes are batched before any update, because a single-episode gradient is noise with a drift rather than a descent direction. Advantages are the reward-to-go standardized within the batch, which is the free baseline in its usual crude form. An entropy term is added, because the policy is the only source of exploration and a collapsed distribution never recovers. And rollouts run under no_grad with log-probabilities recomputed in one batched pass at update time, which avoids holding a per-step autograd graph across the whole batch — the surrogate is also named rather than reported, since its value carries no information at all.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'One batched forward over all batch steps per update; no autograd graph retained during rollout.',
      },
      'make-it-fast': {
        code: `"""REINFORCE - parallel rollouts, returns computed without a Python loop.

The structural fact that makes this method cheap to accelerate: the episodes
in a batch are INDEPENDENT. Unlike an off-policy method whose updates are
sequentially dependent, on-policy data collection within one batch is
embarrassingly parallel, and collection is where nearly all the wall-clock is.
"""

from __future__ import annotations

import numpy as np
import torch
from numpy.typing import NDArray
from torch import Tensor


def batched_returns_to_go(
    rewards: NDArray[np.float32],
    episode_starts: NDArray[np.bool_],
    gamma: float,
    out: NDArray[np.float32],
) -> NDArray[np.float32]:
    """Reward-to-go for a whole flattened batch, one reversed pass.

    The recursion G_t = r_t + gamma * G_(t+1) is genuinely sequential in time,
    so it cannot be vectorized along the time axis. What it can do is run once
    over the concatenated batch instead of once per episode, with the running
    total reset at each episode boundary - which turns B separate Python loops
    into one, and writes into a buffer that was allocated once.
    """
    running = np.float32(0.0)
    for position in range(len(rewards) - 1, -1, -1):
        # A boundary resets the accumulator, so returns never leak across
        # episodes. Getting this wrong credits one episode's actions with the
        # next episode's rewards, and the result still trains - just worse.
        if episode_starts[position]:
            running = np.float32(0.0)
        running = rewards[position] + gamma * running
        out[position] = running
    return out


class RolloutBuffer:
    """Pre-allocated storage for one batch. Sized once, written in place.

    Appending to Python lists and stacking at the end allocates on every step
    and copies the whole batch at the boundary; a fixed buffer does neither.
    """

    def __init__(self, capacity: int, n_envs: int, n_features: int) -> None:
        self.states = np.zeros((capacity, n_envs, n_features), dtype=np.float32)
        self.actions = np.zeros((capacity, n_envs), dtype=np.int64)
        self.rewards = np.zeros((capacity, n_envs), dtype=np.float32)
        self.starts = np.zeros((capacity, n_envs), dtype=np.bool_)
        self._cursor = 0

    def add(
        self,
        states: NDArray[np.float32],
        actions: NDArray[np.int64],
        rewards: NDArray[np.float32],
        starts: NDArray[np.bool_],
    ) -> None:
        index = self._cursor
        self.states[index] = states      # in place; nothing allocated per step
        self.actions[index] = actions
        self.rewards[index] = rewards
        self.starts[index] = starts
        self._cursor += 1

    def flatten(self) -> tuple[Tensor, Tensor, NDArray[np.float32], NDArray[np.bool_]]:
        """Collapse (T, N) into (T*N,) with one reshape and no copy.

        Environment-major or time-major does not matter to the estimator: the
        gradient is a sum over independent (state, action, advantage) triples,
        so the batch can be flattened however keeps memory contiguous.
        """
        steps = self._cursor
        states = self.states[:steps].reshape(-1, self.states.shape[-1])
        return (
            torch.from_numpy(states),
            torch.from_numpy(self.actions[:steps].reshape(-1)),
            self.rewards[:steps].reshape(-1),
            self.starts[:steps].reshape(-1),
        )


@torch.no_grad()
def act_vectorized(policy: torch.nn.Module, states: Tensor, generator: torch.Generator) -> Tensor:
    """Sample an action for every environment from one forward pass.

    Gumbel-max rather than a Categorical object: sampling from a softmax is
    argmax(logits + gumbel noise), which needs no normalization, no per-env
    distribution object, and no exponentials at all.
    """
    logits = policy(states)
    uniform = torch.rand(logits.shape, generator=generator, device=logits.device)
    gumbel = -torch.log(-torch.log(uniform + 1e-20) + 1e-20)
    return (logits + gumbel).argmax(dim=1)


def surrogate_gradient_step(
    policy: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    states: Tensor,
    actions: Tensor,
    advantages: Tensor,
    entropy_coefficient: float,
) -> None:
    """One forward over the entire flattened batch.

    Log-probabilities are recomputed here rather than retained from rollout,
    which is both faster and dramatically cheaper in memory: no autograd graph
    is held across thousands of environment steps.
    """
    logits = policy(states)
    log_probabilities = torch.log_softmax(logits, dim=1)
    # gather, not a Python loop over samples: one indexed read per row.
    chosen = log_probabilities.gather(1, actions.unsqueeze(1)).squeeze(1)

    entropy = -(log_probabilities.exp() * log_probabilities).sum(dim=1).mean()
    objective = -(chosen * advantages).mean() - entropy_coefficient * entropy

    optimizer.zero_grad(set_to_none=True)
    objective.backward()
    optimizer.step()`,
        rationale:
          'Wall-clock here is rollout collection, and the episodes in an on-policy batch are independent — so environments step in lockstep under one forward pass, with Gumbel-max sampling replacing a per-environment distribution object. The return recursion is genuinely sequential in time and cannot be vectorized along it, so it instead runs once over the concatenated batch with a reset at each episode boundary rather than once per episode. Storage is a buffer sized once and written in place, and the surrogate is computed from one forward over the whole flattened batch, which keeps no autograd graph alive during rollout.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Every environment acts from a single forward pass and the whole batch updates from a single one, so no Python-level loop over environments or samples remains in either path.',
            tradeoff: 'Environments must step in lockstep, so an episode that ends early leaves its slot idle until the batch boundary unless auto-reset is handled explicitly.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The per-sample log-probability lookup becomes one gather and the entropy one reduction, replacing a loop that would dominate at batch sizes in the thousands.',
            tradeoff: 'The return recursion still needs its reversed pass — it is sequential in time by definition, and pretending otherwise is the one vectorization that cannot be done here.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The rollout buffer and the returns buffer are sized once and written in place, so a batch of thousands of steps performs no allocation and no end-of-batch stacking copy.',
            tradeoff: 'Capacity is fixed at construction, so an episode longer than the buffer must be truncated — which biases the return, quietly.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Gumbel-max sampling skips normalization and any per-environment distribution object, since argmax of logits plus Gumbel noise is already a softmax sample.',
            tradeoff: 'The sampled probabilities are never formed, so anything downstream needing them — an importance ratio, a logged propensity — has to recompute them.',
          },
        ],
        libraryName: 'NumPy + PyTorch',
        profile: 'One forward per batch step across all environments; no graph retained during rollout. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// REINFORCE - the policy gradient, transcribed.
//
// A linear softmax policy, chosen because the score has a closed form that can
// be read straight off the code:
//
//     d/dtheta_b  log pi(a | s)  =  (1[b == a] - pi(b | s)) * s
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
  // Subtract the max before exponentiating. Without it a large score
  // overflows, and the overflow is silent right up until it is a nan.
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

// theta[a][i] is the weight on feature i for action a.
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

// G_t = r_t + gamma * G_(t+1), computed backwards in a single pass.
//
// Reward-to-GO, not the whole episode return: an action cannot have caused a
// reward that arrived before it, so including earlier rewards adds variance
// and contributes no signal.
std::vector<double> ReturnsToGo(const std::vector<double>& rewards, double gamma) {
  std::vector<double> out(rewards.size(), 0.0);
  double running = 0.0;
  for (std::size_t offset = rewards.size(); offset > 0; --offset) {
    running = rewards[offset - 1] + gamma * running;
    out[offset - 1] = running;
  }
  return out;
}

template <typename Env>
std::vector<std::vector<double>> Train(Env& env, std::size_t n_features,
                                       std::size_t n_actions, int batches,
                                       std::size_t batch_episodes, double alpha,
                                       double gamma) {
  std::vector<std::vector<double>> theta(n_actions, std::vector<double>(n_features, 0.0));

  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);

  for (int batch = 0; batch < batches; ++batch) {
    // Gradients accumulate over a BATCH of episodes. A single-episode gradient
    // is noisy enough that the policy random-walks, so batching here is what
    // makes the estimator usable rather than a throughput optimization.
    std::vector<std::vector<double>> gradient(n_actions,
                                              std::vector<double>(n_features, 0.0));

    std::vector<std::vector<std::vector<double>>> batch_states;
    std::vector<std::vector<std::size_t>> batch_actions;
    std::vector<std::vector<double>> batch_returns;
    double return_sum = 0.0;
    std::size_t return_count = 0;

    for (std::size_t episode = 0; episode < batch_episodes; ++episode) {
      std::vector<std::vector<double>> states;
      std::vector<std::size_t> actions;
      std::vector<double> rewards;

      std::vector<double> state = env.reset();
      bool done = false;
      // The return does not exist until the episode ends, which is why this
      // method cannot be applied to a continuing task without truncation.
      while (!done) {
        const std::vector<double> probabilities = PolicyProbabilities(theta, state);
        const std::size_t action = SampleAction(probabilities, uniform(rng));
        const StepResult result = env.step(static_cast<int>(action));

        states.push_back(state);
        actions.push_back(action);
        rewards.push_back(result.reward);

        state = result.next_state;
        done = result.done;
      }

      std::vector<double> discounted = ReturnsToGo(rewards, gamma);
      for (double value : discounted) {
        return_sum += value;
        ++return_count;
      }

      batch_states.push_back(states);
      batch_actions.push_back(actions);
      batch_returns.push_back(discounted);
    }

    // The baseline. Subtracting ANY function of state - a constant included -
    // leaves the gradient's mean untouched because the expected score is zero.
    // Free, and the single largest variance reduction available.
    const double baseline = return_sum / static_cast<double>(return_count);

    for (std::size_t episode = 0; episode < batch_episodes; ++episode) {
      for (std::size_t step = 0; step < batch_actions[episode].size(); ++step) {
        const std::vector<double>& state = batch_states[episode][step];
        const std::size_t action = batch_actions[episode][step];
        const double advantage = batch_returns[episode][step] - baseline;

        const std::vector<double> probabilities = PolicyProbabilities(theta, state);

        // The score, for every action's weights at once: taking action a
        // pushes a's weights up and all the others down, in proportion to how
        // likely they were.
        for (std::size_t candidate = 0; candidate < n_actions; ++candidate) {
          const double indicator = candidate == action ? 1.0 : 0.0;
          const double coefficient = advantage * (indicator - probabilities[candidate]);
          for (std::size_t i = 0; i < n_features; ++i) {
            gradient[candidate][i] += coefficient * state[i];
          }
        }
      }
    }

    // ASCENT, not descent: expected return is being maximized, and the sign
    // error here is the easiest one in the method to make.
    for (std::size_t candidate = 0; candidate < n_actions; ++candidate) {
      for (std::size_t i = 0; i < n_features; ++i) {
        theta[candidate][i] += alpha * gradient[candidate][i] /
                               static_cast<double>(batch_episodes);
      }
    }
  }

  return theta;
}`,
        profile: 'O(|A| x d) per step for the score. Nested vectors scatter every row, and a trajectory is copied twice.',
      },
      'make-it-right': {
        code: `// REINFORCE - owned rollout storage, entropy regularization, normalized advantages.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

using Matrix = Eigen::MatrixXf;
using Vector = Eigen::VectorXf;

// Newtypes so a discount and a step size cannot be transposed. Both are bare
// floats in the naive version, and swapping them produces a run that trains
// badly rather than one that fails.
struct Discount {
  float value;
};

struct StepSize {
  float value;
};

struct Hyperparameters {
  Discount gamma{0.99F};
  StepSize learning_rate{3e-4F};
  // The only thing standing between this policy and premature determinism.
  // The policy is the sole source of exploration, so a distribution that
  // sharpens before the evidence supports it stops sampling the alternatives
  // and never computes their gradients again.
  float entropy_coefficient = 0.01F;
  float grad_clip_norm = 0.5F;
  std::size_t episodes_per_batch = 16;
};

// Structure-of-arrays storage for one batch of rollouts, owning its memory and
// reused across batches. The naive version copies each trajectory twice; this
// copies nothing and reuses the allocation.
class RolloutBatch {
 public:
  RolloutBatch(std::size_t capacity, std::size_t n_features)
      : n_features_(n_features),
        states_(capacity * n_features, 0.0F),
        actions_(capacity, 0),
        rewards_(capacity, 0.0F),
        advantages_(capacity, 0.0F),
        starts_(capacity, 0) {
    if (capacity == 0 || n_features == 0) {
      throw std::invalid_argument("capacity and feature width must be positive");
    }
  }

  void Clear() noexcept { size_ = 0; }

  void Add(std::span<const float> state, std::size_t action, float reward, bool episode_start) {
    if (state.size() != n_features_) {
      throw std::invalid_argument("state width does not match the batch");
    }
    if (size_ == rewards_.size()) {
      // Fail rather than truncate: a silently truncated episode biases the
      // return, and it looks exactly like a hyperparameter problem.
      throw std::length_error("rollout batch is full; an episode exceeded capacity");
    }
    std::copy(state.begin(), state.end(), states_.begin() + size_ * n_features_);
    actions_[size_] = action;
    rewards_[size_] = reward;
    starts_[size_] = episode_start ? 1 : 0;
    ++size_;
  }

  // Reward-to-go over the whole concatenated batch in one reversed pass, with
  // the accumulator reset at each episode boundary. Letting a return leak
  // across a boundary credits one episode's actions with the next episode's
  // rewards - and the run still trains, just worse.
  void ComputeAdvantages(Discount gamma) {
    float running = 0.0F;
    for (std::size_t offset = size_; offset > 0; --offset) {
      const std::size_t index = offset - 1;
      if (starts_[index] != 0) running = 0.0F;
      running = rewards_[index] + gamma.value * running;
      advantages_[index] = running;
    }

    // Standardize within the batch. Technically this biases the estimator,
    // since the statistics depend on the sample - and it is near-universal
    // anyway, because the stabilization is worth more than the bias costs.
    const float mean =
        std::accumulate(advantages_.begin(), advantages_.begin() + size_, 0.0F) /
        static_cast<float>(size_);
    float variance = 0.0F;
    for (std::size_t index = 0; index < size_; ++index) {
      const float centered = advantages_[index] - mean;
      variance += centered * centered;
    }
    const float deviation = std::sqrt(variance / static_cast<float>(size_)) + 1e-8F;
    for (std::size_t index = 0; index < size_; ++index) {
      advantages_[index] = (advantages_[index] - mean) / deviation;
    }
  }

  [[nodiscard]] std::size_t size() const noexcept { return size_; }
  [[nodiscard]] std::span<const float> Advantages() const { return {advantages_.data(), size_}; }

 private:
  std::size_t n_features_;
  std::vector<float> states_;
  std::vector<std::size_t> actions_;
  std::vector<float> rewards_;
  std::vector<float> advantages_;
  std::vector<std::uint8_t> starts_;   // not vector<bool>; that one is a bitfield
  std::size_t size_ = 0;
};

// Entropy of a softmax policy, from its probabilities. Tracked every batch,
// because a return curve that plateaus is explained by the entropy curve that
// collapsed a few hundred updates earlier.
[[nodiscard]] float PolicyEntropy(std::span<const float> probabilities) {
  float entropy = 0.0F;
  for (float probability : probabilities) {
    if (probability > 0.0F) entropy -= probability * std::log(probability);
  }
  return entropy;
}`,
        rationale:
          'Trajectory storage becomes a structure-of-arrays batch that owns its memory and is reused, replacing the naive version\'s two full copies per trajectory. Returns are computed over the concatenated batch with an explicit episode-boundary reset, since a leaked return credits one episode with another\'s rewards and still trains — just worse. Advantages are standardized within the batch, an entropy term is tracked because it is the leading indicator of the characteristic failure, and overflow throws rather than truncating, because a silently truncated episode biases the return and looks like a hyperparameter problem.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'One allocation per batch field, reused across batches; nothing copied per trajectory.',
      },
      'make-it-fast': {
        code: `// REINFORCE - parallel rollouts, batched logits as a single GEMM.
#include <cstddef>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

// The structural fact that makes this method cheap to accelerate: the episodes
// in one batch are INDEPENDENT. An off-policy method's updates are sequentially
// dependent and only its evaluation parallelizes; here, data COLLECTION - which
// is nearly all the wall-clock - is embarrassingly parallel.
template <typename Env>
void CollectBatchParallel(std::vector<Env>& workers,
                          const Eigen::MatrixXf& policy_weights,
                          std::vector<std::vector<float>>& states_out,
                          std::vector<std::vector<std::size_t>>& actions_out,
                          std::vector<std::vector<float>>& rewards_out) {
  const int episode_count = static_cast<int>(workers.size());

  // Each worker owns its environment, its RNG and its output slot, so nothing
  // is shared and no synchronization is needed anywhere in the loop.
  // schedule(dynamic) because episode lengths vary by an order of magnitude
  // and a static split leaves most threads waiting on the longest episode.
#pragma omp parallel for schedule(dynamic)
  for (int episode = 0; episode < episode_count; ++episode) {
    workers[episode].Rollout(policy_weights, states_out[episode], actions_out[episode],
                             rewards_out[episode]);
  }
}

// Logits for an entire batch in one matrix product.
//
// The naive version computes one |A| x d dot product per step. Over a batch of
// tens of thousands of steps that is tens of thousands of tiny GEMVs, each too
// small to saturate anything; one GEMM over the whole batch is the same
// arithmetic at a fraction of the cost.
class BatchedPolicy {
 public:
  // Samples in COLUMNS: each layer is one (width x batch) product and the
  // batch dimension stays contiguous in the inner loop.
  [[nodiscard]] Eigen::MatrixXf Logits(const Eigen::MatrixXf& states) const {
    Eigen::MatrixXf hidden = (w1_ * states).colwise() + b1_;
    // cwiseMax participates in the expression template, so the ReLU is applied
    // as the product is consumed and no intermediate matrix is written out.
    return (w2_ * hidden.cwiseMax(0.0F)).colwise() + b2_;
  }

  // Log-softmax and the chosen entries, fused: the probabilities are never
  // materialized as a separate matrix, only the per-column normalizer.
  void ChosenLogProbabilities(const Eigen::MatrixXf& logits,
                              const std::vector<std::size_t>& actions,
                              float* __restrict out) const {
    const Eigen::Index batch = logits.cols();
#pragma omp parallel for schedule(static)
    for (Eigen::Index column = 0; column < batch; ++column) {
      const float largest = logits.col(column).maxCoeff();
      const float normalizer =
          std::log((logits.col(column).array() - largest).exp().sum()) + largest;
      out[column] = logits(static_cast<Eigen::Index>(actions[static_cast<std::size_t>(column)]),
                           column) -
                    normalizer;
    }
  }

 private:
  Eigen::MatrixXf w1_;
  Eigen::VectorXf b1_;
  Eigen::MatrixXf w2_;
  Eigen::VectorXf b2_;
};`,
        rationale:
          'Collection dominates wall-clock and the episodes in an on-policy batch are independent, so rollouts run across threads with dynamic scheduling — episode lengths vary by an order of magnitude and a static split leaves most threads waiting on the longest one. The per-step GEMV becomes one GEMM over the whole batch with samples in columns, the ReLU stays inside the expression template so no intermediate matrix is written, and the log-softmax computes only the per-column normalizer rather than materializing a probability matrix.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Episodes within one on-policy batch are fully independent, each worker owning its environment, RNG and output slot, so collection parallelizes with no synchronization at all.',
            tradeoff: 'Each thread needs its own environment instance and RNG stream, which multiplies simulator memory by the thread count and makes a run reproducible only per-seed-per-thread-count.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Tens of thousands of per-step GEMVs, each too small to saturate anything, become one GEMM per layer over the whole batch — the same arithmetic at a fraction of the cost.',
            tradeoff: 'Samples must be columns rather than rows, the opposite of the natural collection order, so the batch is transposed at the boundary.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The ReLU and the bias broadcast are consumed as the product is evaluated, so neither writes an intermediate matrix the size of the batch.',
            tradeoff: 'The fused expression is harder to inspect in a debugger and a stray auto binding turns it into a dangling expression rather than a matrix.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Only the per-column log-normalizer and the chosen entry are computed, so the full probability matrix is never formed for a quantity that needs one number per sample.',
            tradeoff: 'Anything downstream needing the full distribution — entropy, an importance ratio, a logged propensity — has to recompute it.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'Collection across cores; one GEMM per layer per batch instead of one GEMV per step. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! REINFORCE - the policy gradient, transcribed.
//!
//! A linear softmax policy, chosen because the score has a closed form that
//! can be read straight off the code:
//!
//!     d/dtheta_b  log pi(a | s)  =  (1[b == a] - pi(b | s)) * s

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
    // Subtract the max before exponentiating. Without it a large score
    // overflows, and the overflow is silent right up until it is a nan.
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

/// theta[a][i] is the weight on feature i for action a.
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

/// G_t = r_t + gamma * G_(t+1), computed backwards in a single pass.
///
/// Reward-to-GO, not the whole episode return: an action cannot have caused a
/// reward that arrived before it, so including earlier rewards adds variance
/// and contributes no signal.
pub fn returns_to_go(rewards: &[f64], gamma: f64) -> Vec<f64> {
    let mut out = vec![0.0; rewards.len()];
    let mut running = 0.0;
    for step in (0..rewards.len()).rev() {
        running = rewards[step] + gamma * running;
        out[step] = running;
    }
    out
}

#[allow(clippy::too_many_arguments)]
pub fn train(
    env: &mut dyn Environment,
    n_features: usize,
    n_actions: usize,
    batches: usize,
    batch_episodes: usize,
    alpha: f64,
    gamma: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<Vec<f64>> {
    let mut theta = vec![vec![0.0; n_features]; n_actions];

    for _ in 0..batches {
        // Gradients accumulate over a BATCH of episodes. A single-episode
        // gradient is noisy enough that the policy random-walks, so batching
        // here is what makes the estimator usable rather than a throughput
        // optimization.
        let mut gradient = vec![vec![0.0; n_features]; n_actions];
        let mut batch: Vec<(Vec<Vec<f64>>, Vec<usize>, Vec<f64>)> = Vec::new();
        let mut return_sum = 0.0;
        let mut return_count = 0usize;

        for _ in 0..batch_episodes {
            let mut states: Vec<Vec<f64>> = Vec::new();
            let mut actions: Vec<usize> = Vec::new();
            let mut rewards: Vec<f64> = Vec::new();

            let mut state = env.reset();
            let mut done = false;
            // The return does not exist until the episode ends, which is why
            // this cannot be applied to a continuing task without truncation.
            while !done {
                let probabilities = policy_probabilities(&theta, &state);
                let action = sample_action(&probabilities, rand());
                let result = env.step(action);

                states.push(state);
                actions.push(action);
                rewards.push(result.reward);

                state = result.next_state;
                done = result.done;
            }

            let discounted = returns_to_go(&rewards, gamma);
            for &value in &discounted {
                return_sum += value;
                return_count += 1;
            }
            batch.push((states, actions, discounted));
        }

        // The baseline. Subtracting ANY function of state - a constant
        // included - leaves the gradient's mean untouched because the expected
        // score is zero. Free, and the largest single variance reduction.
        let baseline = return_sum / return_count as f64;

        for (states, actions, discounted) in &batch {
            for step in 0..actions.len() {
                let state = &states[step];
                let action = actions[step];
                let advantage = discounted[step] - baseline;
                let probabilities = policy_probabilities(&theta, state);

                // The score, for every action's weights at once: taking action
                // a pushes a's weights up and all the others down, in
                // proportion to how likely they were.
                for candidate in 0..n_actions {
                    let indicator = if candidate == action { 1.0 } else { 0.0 };
                    let coefficient = advantage * (indicator - probabilities[candidate]);
                    for i in 0..n_features {
                        gradient[candidate][i] += coefficient * state[i];
                    }
                }
            }
        }

        // ASCENT, not descent: expected return is being maximized, and the
        // sign error here is the easiest one in the method to make.
        for candidate in 0..n_actions {
            for i in 0..n_features {
                theta[candidate][i] += alpha * gradient[candidate][i] / batch_episodes as f64;
            }
        }
    }

    theta
}`,
        profile: 'O(|A| x d) per step for the score. Vec<Vec<f64>> scatters every row, and every index is bounds-checked.',
      },
      'make-it-right': {
        code: `//! REINFORCE - typed errors, flat rollout storage, entropy tracked.

use std::fmt;

/// Newtypes so a discount and a step size cannot be transposed. Both are bare
/// f32 in the naive version, and swapping them yields a run that trains badly
/// rather than one that fails.
#[derive(Debug, Clone, Copy)]
pub struct Discount(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct StepSize(pub f32);

#[derive(Debug, Clone, Copy)]
pub struct EntropyCoefficient(pub f32);

#[derive(Debug, PartialEq, Eq)]
pub enum ReinforceError {
    EmptyCapacity,
    BadDiscount,
    SingleEpisodeBatch,
    StateWidthMismatch { got: usize, expected: usize },
    /// Truncating a full batch would bias the return silently, so it is an
    /// error rather than a quiet drop.
    BatchFull { capacity: usize },
}

impl fmt::Display for ReinforceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCapacity => write!(f, "capacity and feature width must be positive"),
            Self::BadDiscount => write!(f, "gamma must be in [0, 1)"),
            Self::SingleEpisodeBatch => {
                write!(f, "a single-episode gradient random-walks; batch at least two")
            }
            Self::StateWidthMismatch { got, expected } => {
                write!(f, "state has width {got}, batch expects {expected}")
            }
            Self::BatchFull { capacity } => {
                write!(f, "rollout batch of {capacity} is full; an episode exceeded it")
            }
        }
    }
}

impl std::error::Error for ReinforceError {}

/// Structure-of-arrays storage for one batch, owning its memory and reused
/// across batches. The naive version copies each trajectory twice; this copies
/// nothing and reuses the allocation.
pub struct RolloutBatch {
    n_features: usize,
    states: Vec<f32>,
    actions: Vec<u32>,
    rewards: Vec<f32>,
    advantages: Vec<f32>,
    starts: Vec<bool>,
    len: usize,
}

impl RolloutBatch {
    pub fn new(capacity: usize, n_features: usize) -> Result<Self, ReinforceError> {
        if capacity == 0 || n_features == 0 {
            return Err(ReinforceError::EmptyCapacity);
        }
        Ok(Self {
            n_features,
            states: vec![0.0; capacity * n_features],
            actions: vec![0; capacity],
            rewards: vec![0.0; capacity],
            advantages: vec![0.0; capacity],
            starts: vec![false; capacity],
            len: 0,
        })
    }

    pub fn clear(&mut self) {
        self.len = 0;
    }

    /// Borrows the state and copies it into storage the batch already owns, so
    /// adding a step allocates nothing.
    pub fn push(
        &mut self,
        state: &[f32],
        action: u32,
        reward: f32,
        episode_start: bool,
    ) -> Result<(), ReinforceError> {
        if state.len() != self.n_features {
            return Err(ReinforceError::StateWidthMismatch {
                got: state.len(),
                expected: self.n_features,
            });
        }
        if self.len == self.rewards.len() {
            return Err(ReinforceError::BatchFull { capacity: self.rewards.len() });
        }

        let offset = self.len * self.n_features;
        self.states[offset..offset + self.n_features].copy_from_slice(state);
        self.actions[self.len] = action;
        self.rewards[self.len] = reward;
        self.starts[self.len] = episode_start;
        self.len += 1;
        Ok(())
    }

    /// Reward-to-go over the concatenated batch in one reversed pass, with the
    /// accumulator reset at each episode boundary. A return leaking across a
    /// boundary credits one episode's actions with the next episode's rewards,
    /// and the run still trains - just worse.
    pub fn compute_advantages(&mut self, gamma: Discount) {
        let mut running = 0.0_f32;
        for index in (0..self.len).rev() {
            if self.starts[index] {
                running = 0.0;
            }
            running = self.rewards[index] + gamma.0 * running;
            self.advantages[index] = running;
        }

        // Standardize within the batch. Technically this biases the estimator,
        // because the statistics depend on the sample - and it is near
        // universal anyway, since the stabilization is worth more.
        let slice = &mut self.advantages[..self.len];
        let mean = slice.iter().sum::<f32>() / slice.len() as f32;
        let deviation = (slice.iter().map(|v| (v - mean).powi(2)).sum::<f32>()
            / slice.len() as f32)
            .sqrt()
            + 1e-8;
        for value in slice.iter_mut() {
            *value = (*value - mean) / deviation;
        }
    }

    #[must_use]
    pub fn advantages(&self) -> &[f32] {
        &self.advantages[..self.len]
    }
}

/// Entropy of a softmax policy from its probabilities.
///
/// Tracked every batch, because a return curve that plateaus is explained by
/// the entropy curve that collapsed a few hundred updates earlier - and once
/// it has, the unexplored actions are never sampled or updated again.
#[must_use]
pub fn policy_entropy(probabilities: &[f32]) -> f32 {
    probabilities
        .iter()
        .filter(|&&p| p > 0.0)
        .map(|&p| -p * p.ln())
        .sum()
}`,
        rationale:
          'Trajectory storage becomes a structure-of-arrays batch that owns flat memory and is reused, replacing the naive version\'s two full copies per trajectory. Returns are computed over the concatenated batch with an explicit episode-boundary reset. Overflow returns an error rather than truncating, because a silently truncated episode biases the return and reads as a hyperparameter problem. Advantages are standardized in place, newtypes separate the discount from the step size, and entropy is exposed because it is the leading indicator of the failure that ends a run.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'One allocation per batch field, reused across batches; nothing copied per trajectory.',
      },
      'make-it-fast': {
        code: `//! REINFORCE - parallel rollouts, batched logits as a single GEMM.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// The structural fact that makes this method cheap to accelerate: the
/// episodes in one batch are INDEPENDENT. An off-policy method's updates are
/// sequentially dependent and only its evaluation parallelizes; here, data
/// COLLECTION - which is nearly all the wall-clock - is embarrassingly
/// parallel, and no synchronization is needed anywhere.
pub struct EpisodeTrace {
    pub states: Vec<f32>,
    pub actions: Vec<u32>,
    pub rewards: Vec<f32>,
}

impl EpisodeTrace {
    /// Sized from the expected episode length so a rollout never reallocates
    /// mid-episode, which would copy the trace while the environment waits.
    #[must_use]
    pub fn with_expected_length(expected_steps: usize, n_features: usize) -> Self {
        Self {
            states: Vec::with_capacity(expected_steps * n_features),
            actions: Vec::with_capacity(expected_steps),
            rewards: Vec::with_capacity(expected_steps),
        }
    }
}

/// Collect a whole batch across threads. Each worker owns its environment and
/// its RNG stream, so nothing is shared and the closure needs no locking.
pub fn collect_batch_parallel<E, F>(workers: &mut [E], rollout: F, expected_steps: usize,
                                    n_features: usize) -> Vec<EpisodeTrace>
where
    E: Send,
    F: Fn(&mut E, &mut EpisodeTrace) + Sync + Send,
{
    workers
        .par_iter_mut()
        .map(|worker| {
            let mut trace = EpisodeTrace::with_expected_length(expected_steps, n_features);
            rollout(worker, &mut trace);
            trace
        })
        .collect()
}

/// Logits for an entire batch in one matrix product.
///
/// The naive version computes one |A| x d dot product per step. Over a batch
/// of tens of thousands of steps that is tens of thousands of tiny GEMVs, each
/// too small to saturate anything; one GEMM is the same arithmetic far cheaper.
pub struct BatchedPolicy {
    w1: Array2<f32>,
    b1: Array1<f32>,
    w2: Array2<f32>,
    b2: Array1<f32>,
}

impl BatchedPolicy {
    #[must_use]
    pub fn logits(&self, states: ArrayView2<'_, f32>) -> Array2<f32> {
        let mut hidden = states.dot(&self.w1) + &self.b1;
        hidden.mapv_inplace(|value| value.max(0.0)); // ReLU in place, no temporary
        hidden.dot(&self.w2) + &self.b2
    }

    /// Log-probability of the chosen action per row, without materializing the
    /// probability matrix. Only the per-row normalizer is needed, and the
    /// iterator chain over each contiguous row keeps the bounds checks out.
    #[must_use]
    pub fn chosen_log_probabilities(&self, logits: &Array2<f32>, actions: &[u32]) -> Array1<f32> {
        let values: Vec<f32> = logits
            .axis_iter(Axis(0))
            .zip(actions.iter())
            .map(|(row, &action)| {
                let largest = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let normalizer = row.iter().map(|v| (v - largest).exp()).sum::<f32>().ln() + largest;
                row[action as usize] - normalizer
            })
            .collect();
        Array1::from_vec(values)
    }

    /// Entropy per row, computed from the same logits rather than from a
    /// separately stored probability matrix.
    #[must_use]
    pub fn mean_entropy(&self, logits: &Array2<f32>) -> f32 {
        let total: f32 = logits
            .axis_iter(Axis(0))
            .map(|row| {
                let largest = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let sum: f32 = row.iter().map(|v| (v - largest).exp()).sum();
                let normalizer = sum.ln() + largest;
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
          'Collection dominates wall-clock and on-policy episodes within a batch are independent, so rollouts run across threads with each worker owning its environment and RNG and nothing shared. Traces are sized from the expected episode length so a rollout never reallocates mid-episode. The per-step dot product becomes one GEMM per layer over the whole batch, and log-probabilities and entropy are computed from the logits through row iterators without ever materializing a probability matrix.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Episodes in an on-policy batch are fully independent, so collection — nearly all the wall-clock — parallelizes with each worker owning its environment and RNG and no locking anywhere.',
            tradeoff: 'Each thread needs its own environment instance and RNG stream, which multiplies simulator memory by the thread count and makes a run reproducible only per seed per thread count.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each trace is sized from the expected episode length, so a rollout never reallocates and copies its own trace while the environment waits on it.',
            tradeoff: 'The capacity is a guess: an episode longer than expected still grows the vector, and a short one holds memory it never uses.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Tens of thousands of per-step GEMVs, each too small to saturate anything, collapse into one GEMM per layer over the whole batch.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, complicating cross-compilation and making the binary sensitive to which implementation is linked.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Log-probabilities and entropy are computed by iterating contiguous rows, so the bounds checks fall out and no probability matrix is materialized for a quantity that needs one number per row.',
            tradeoff: 'Each row is traversed twice — once for the normalizer, once for the value — so it trades a little arithmetic for the memory the intermediate would have cost.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'Collection across cores; one GEMM per layer per batch instead of one GEMV per step. Illustrative, not a measured benchmark.',
      },
    },
  },
};
