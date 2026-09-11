import type { AiMlModel } from '../../types';

/**
 * Temporal-difference learning — the entry where the target is an
 * estimate.
 *
 * Everything distinctive follows from that one substitution: learning
 * can happen before the episode ends, the variance collapses, a bias
 * appears that no amount of data removes, and the Markov property
 * becomes load-bearing where Monte Carlo never needed it. Lambda is the
 * dial between the two.
 */
export const TD_LEARNING: AiMlModel = {
  slug: 'td-learning',
  name: 'Temporal-Difference Learning: TD(0) & TD(lambda)',
  aliases: ['TD(0)', 'TD(lambda)', 'Eligibility traces', 'Bootstrapping', 'n-step returns', 'True online TD'],
  category: 'reinforcement-learning',
  group: 'foundations',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Worth being precise: this entry is about PREDICTION — estimating the value of a fixed policy — which is the evaluation half of control rather than control itself. That is also how it was introduced, in a paper titled "Learning to predict by the methods of temporal differences", with no agent and no actions in the motivating example. SARSA and Q-learning are what happens when this evaluation step is dropped into a policy-improvement loop, and they are separate entries because the exploration questions they raise are separate questions.',

  intuition:
    'Monte Carlo waits for the episode to finish and averages what happened. Temporal-difference learning refuses to wait: it takes one step, sees the reward, looks at its own estimate of where it landed, and updates toward that. The target is therefore partly made up — it contains the very quantity being learned — and the whole method is an argument that this is a good trade. It is. Substituting an estimate for the remaining trajectory removes almost all of the variance, because a single reward plus one value lookup is far less random than a sum over a hundred future steps, and the resulting method learns online, from incomplete episodes, in tasks that never terminate. What it buys with is bias and an assumption. The bias is real and does not vanish with data — a wrong value at the next state propagates backwards into this one. The assumption is that the state is Markov, because bootstrapping trusts the next state\'s estimate to summarize everything after it; where Monte Carlo is simply indifferent to state aliasing, this converges confidently to the wrong answer. Lambda is the dial between the two extremes, and the best setting is almost always in the middle.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        'V^{\\pi}(s) = \\mathbb{E}_{\\pi}\\bigl[ R_{t+1} + \\gamma V^{\\pi}(S_{t+1}) \\mid S_t = s \\bigr], \\qquad G_t^{\\lambda} = (1 - \\lambda) \\sum_{n=1}^{\\infty} \\lambda^{n-1} G_t^{(n)}',
      symbols: [
        { symbol: 'R_{t+1} + \\gamma V^{\\pi}(S_{t+1})', meaning: 'the bootstrapped target — the reward plus the current estimate of what follows, not the realized return' },
        { symbol: 'G_t^{(n)}', meaning: 'the n-step return: n real rewards followed by a bootstrapped value, so n interpolates between TD and Monte Carlo' },
        { symbol: '\\lambda \\in [0, 1]', meaning: 'the geometric weighting over every n-step return; 0 is TD(0), 1 is Monte Carlo' },
        { symbol: 'G_t^{\\lambda}', meaning: 'the lambda-return, the forward view — an average of all n-step returns rather than a choice among them' },
      ],
    },
    reading:
      'The first equation is the Bellman expectation equation, and reading it as the objective makes the defining move visible: V appears on both sides, so the target for learning V contains V. That is bootstrapping in one line, and every property of the method comes from it. The estimator is no longer an average of something observed, so it is no longer unbiased — an error in the next state\'s value propagates backwards into this one and persists. In exchange the target is a single reward plus one lookup instead of a sum over the whole remaining trajectory, which is where the variance reduction comes from, and it exists at every step rather than only at termination, which is what makes online and continuing learning possible at all. The second equation is the dial. Rather than choosing how many real rewards to use before bootstrapping, the lambda-return averages over every choice with geometrically decaying weights, which turns a discrete and awkward hyperparameter into a smooth one. Lambda of zero puts all weight on the one-step return and recovers TD(0); lambda of one puts all weight on the full return and recovers Monte Carlo; the useful values are in between, and the reason is that the two error sources move in opposite directions with it. One more consequence deserves naming because it is the sharpest statement of what bootstrapping actually does: given a finite batch of episodes, Monte Carlo converges to the least-squares fit of the observed returns, while TD converges to the value function of the maximum-likelihood Markov model built from the same data. Those are different answers, and TD\'s is the better one exactly when the process really is Markov.',
  },

  optimization: {
    method: 'Stochastic approximation on the TD error, with eligibility traces distributing that error backwards over recently visited states',
    updateRule: {
      formula:
        '\\delta_t = R_{t+1} + \\gamma V(S_{t+1}) - V(S_t), \\qquad e_t(s) = \\gamma \\lambda e_{t-1}(s) + \\mathbb{1}[S_t = s], \\qquad V(s) \\leftarrow V(s) + \\alpha \\delta_t e_t(s)',
      symbols: [
        { symbol: '\\delta_t', meaning: 'the TD error: how wrong the previous estimate was in light of one more step of reality' },
        { symbol: 'e_t(s)', meaning: 'the eligibility trace — how recently and how often s was visited, decaying at gamma-lambda per step' },
        { symbol: '\\alpha', meaning: 'the step size; constant to track a changing policy, decaying to converge' },
        { symbol: '\\mathbb{1}[S_t = s]', meaning: 'the accumulating trace increment; replacing traces set the trace to one instead, which behaves better under revisits' },
      ],
    },
    rationale:
      'The trace is what makes the forward view implementable. The lambda-return is defined in terms of the future, so it cannot be computed until the future arrives; the trace instead carries a memory of the past, and applying today\'s TD error to every state in proportion to its trace turns out to produce the same total update offline. That equivalence is the point of the mechanism, and the backward view is the one that runs: it needs no lookahead, no episode boundary, and no storage of the trajectory. Three implementation choices then matter more than they look. Accumulating traces add one on each visit and can grow without bound when a state is revisited quickly, which interacts badly with a large step size; replacing traces set the trace to one instead and are more stable in exactly that case; dutch traces are the form that makes the online and offline updates exactly equal rather than approximately so, which is what true-online TD(lambda) is. The step size follows the usual stochastic-approximation logic — decaying to satisfy Robbins-Monro and converge, constant to track a policy that keeps changing, which is the normal case in control and means the run converges to nothing in the formal sense. And the interaction that ends runs is not any of these: it is that bootstrapping, off-policy sampling and function approximation together — the deadly triad — can diverge outright rather than converge slowly, and only all three at once do it.',
    hyperparameters: [
      { name: 'lambda', role: 'The bias-variance dial. Zero is TD(0) and one is Monte Carlo; intermediate values beat both, and the optimum is usually high rather than middling', typicalRange: '0.7 to 0.95' },
      { name: 'step size (alpha)', role: 'Decaying satisfies Robbins-Monro and converges; constant tracks a changing policy and does not. Which is in use decides whether the guarantees apply', typicalRange: '0.01 to 0.5, or 1/N' },
      { name: 'discount (gamma)', role: 'The horizon, and here also part of the trace decay rate — gamma and lambda multiply, so a small gamma shortens the credit assignment as well as the horizon', typicalRange: '0.9 to 0.99' },
      { name: 'trace type', role: 'Accumulating traces can grow unboundedly on fast revisits; replacing traces cap at one; dutch traces make the online update exactly equal the offline one', typicalRange: 'replacing, or dutch' },
      { name: 'n (for n-step)', role: 'The discrete alternative to lambda. Simpler to reason about and needs an n-step buffer; lambda gets the same effect with a trace and no buffer', typicalRange: '3 to 20' },
      { name: 'trace cutoff', role: 'Traces decay geometrically, so below a threshold they contribute nothing measurable. Pruning them is what makes large state spaces affordable', typicalRange: '1e-4 to 1e-2' },
    ],
    convergence:
      'Tabular TD(0) converges to the true value function of the policy being followed, with probability one, under the Robbins-Monro conditions on the step size. That guarantee is genuine and it is also narrower than it is usually treated. It holds for prediction under a fixed policy, in a table, on-policy. Move away from any of those and the picture changes. With linear function approximation and on-policy sampling, TD converges to a fixed point whose error is bounded by the best achievable approximation inflated by roughly one over one minus gamma — a real guarantee with a factor that is large at long horizons. Move to off-policy sampling and the guarantee is gone entirely: bootstrapping, function approximation and off-policy updates together can diverge, not slowly but exponentially, which is the deadly triad and Baird\'s counterexample is six states long. Any two of the three are safe; all three are not. The other failures are quieter. A non-Markov state breaks bootstrapping specifically — the next state\'s estimate is trusted to summarize the future and it does not, so TD converges confidently to a value that is not the value of anything, where Monte Carlo on the same data is simply correct. Accumulating traces with a large step size can diverge on their own through repeated visits to the same state. And a constant step size, which almost every implementation uses, means the estimate tracks rather than converges, so the run has no fixed point to reach and reporting it as converged is a category error.',
    complexity:
      'TD(0) is O(1) per step: one lookup, one arithmetic update. TD(lambda) with naive traces is O(|S|) per step because every trace decays, which is why the tabular form is rarely used as written — pruning traces below a cutoff brings it back to O(k) for the k states with meaningful eligibility, and that k is small because the decay is geometric. With linear function approximation over d features the cost is O(d) per step, or O(nnz) for sparse features, which is what makes the method practical at scale. Memory is O(|S|) for values plus O(|S|) for traces, or O(d) for both under approximation.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Predict a discounted cumulative sum of a future signal from a state, learning from the consistency between successive predictions rather than from realized outcomes. The signal need not be a reward: any quantity accumulating over time — demand, failures, spend — can be the thing predicted, which is the general-value-function framing.',
        where: [
          'Multi-horizon cumulative predictions, where the target is a discounted sum rather than a value at one horizon',
          'Many predictions sharing one state representation, which is where the per-prediction cost matters and TD is cheap',
          'Online forecasting on a stream that never terminates, where waiting for an outcome is not an option',
          'Settings with a genuine Markov state — a physical system, a process with known dynamics — where the temporal consistency is real information',
        ],
        why: 'Worth including because the method was introduced as a forecasting method, in a paper about prediction with no agent and no actions anywhere in it, and the original argument is a forecasting argument: successive predictions of the same eventual outcome must be consistent with each other, and enforcing that consistency extracts information that fitting each prediction to its realized outcome discards. That is a real and generalizable insight. The honest limits are what keep this at "adapted" rather than higher. It predicts a DISCOUNTED CUMULATIVE SUM, which is a different functional from "the value at time t plus twelve" — if the business question is the second, this answers a related question and the discount is doing something nobody asked for. It requires a Markov state, and most forecasting problems are handed to you as a series rather than a state, so constructing one is the actual work and the place the method usually fails. And a well-tuned direct forecaster beats it on standard forecasting benchmarks, so the case rests on the online setting, the cumulative target, or a genuinely Markov process rather than on accuracy.',
        featurization: [
          'Construct a state that plausibly summarizes the history, since bootstrapping trusts it to and a series index does not qualify',
          'Be explicit that the target is a discounted cumulative sum; if the question is a fixed-horizon value, this is answering something adjacent',
          'Split strictly by time, and note that bootstrapping propagates values backwards, so a leak at one point contaminates everything before it',
          'Compare against a direct multi-step forecaster on the same target, which is the comparison that decides whether the framing earns its complexity',
        ],
        evaluation:
          'Rolling-origin backtesting against a direct forecaster fitted to the same cumulative target — that is the like-for-like comparison and it is frequently skipped in favour of comparing against a forecaster answering a different question. Report the bias separately from the variance, since the whole argument for the method is that it trades one for the other and a single error metric conceals which side moved.',
        pitfalls: [
          'A state that is not Markov, which biases bootstrapped predictions in a way Monte Carlo on the same data would not suffer',
          'Treating a discounted cumulative sum as though it were a fixed-horizon forecast',
          'No direct-forecaster baseline on the same target, so the framing is never actually justified',
          'A constant step size reported as convergence, when the estimate is tracking rather than settling',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'There is no action and no return to predict, so nothing bootstraps; a large TD error means the value function has not converged at that state, which is a statement about the learner rather than about the data, and reading it as an anomaly score flags the agent\'s own ignorance.',
      },
      optimization: {
        fit: 'primary',
        how: 'Estimate a value function by stochastic approximation on the TD error, using the Bellman equation as a consistency condition rather than a system to solve. Lambda controls how much of the target comes from realized experience and how much from the current estimate.',
        where: [
          'The bias-variance trade made into a continuous, tunable parameter rather than a choice between two methods',
          'Eligibility traces as an implementation of a forward-looking objective using only backward-looking state',
          'The deadly triad, which is the cleanest example in this reference of three individually safe choices combining into divergence',
          'Batch TD against batch Monte Carlo, where the two converge to different answers from identical data',
        ],
        why: 'One of the most instructive entries here, for three reasons that transfer well beyond reinforcement learning. The first is that lambda turns a methodological argument into a hyperparameter: rather than choosing between an unbiased high-variance estimator and a biased low-variance one, average over the family and tune the weighting — a move available in far more places than it is used. The second is the forward-backward equivalence, which is a genuinely elegant piece of engineering: an objective defined over the future is implemented exactly by a decaying memory of the past, with no lookahead and no buffer. The third is the deadly triad, which deserves study precisely because each ingredient is individually harmless and standard; it is the clearest available demonstration that stability arguments do not compose. The batch TD versus batch Monte Carlo comparison is the other thing worth internalizing — the same data yields two different answers, one of which assumes the Markov property and is better when it holds.',
        featurization: [
          'Tune lambda rather than arguing about TD against Monte Carlo; the answer is almost always interior and often high',
          'Prune traces below a cutoff, since geometric decay makes most of them contribute nothing measurable',
          'Check whether all three deadly-triad ingredients are present before debugging a divergence as a learning-rate problem',
          'State whether the step size decays, since that decides whether the run converges or tracks',
        ],
        evaluation:
          'Root-mean-square error against a known value function where one exists, reported as a learning curve rather than a final number — the whole point of the method is how fast the error falls, and a final value hides that. Where the true values are unavailable, the sup-norm of the Bellman residual is the honest substitute, and the same batch should be evaluated under both TD and Monte Carlo, since a large gap between them is a direct measurement of how non-Markov the state is.',
        pitfalls: [
          'Debugging divergence as a step-size problem when the deadly triad is present and no step size fixes it',
          'Accumulating traces with a large step size, which can diverge through repeated visits alone',
          'Reporting a constant-step-size run as converged, when it is tracking and has no fixed point',
          'Assuming the tabular convergence guarantee survives function approximation; the bound acquires a one-over-one-minus-gamma factor at best',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Evaluate an operating policy from a stream of observed transitions, without a model and without waiting for a shift, a run or a route to finish. The value function estimates long-run cost or throughput from the current configuration, updated continuously as the system runs.',
        where: [
          'Continuing operations that never terminate, where Monte Carlo has no episode to average over',
          'Online evaluation of an incumbent policy from live telemetry, updating between decisions rather than after outcomes',
          'Long-horizon cost attribution, where traces propagate a late consequence back to the decision that caused it',
          'Simulation-based evaluation where the per-step cost is low and the episode count is the binding constraint',
        ],
        why: 'The strongest applied fit, and the reason is the continuing-task property rather than anything about accuracy. Industrial processes do not have episodes: a plant runs, a fleet operates, a queue never empties, and Monte Carlo simply has nothing to average. TD updates every step and needs no terminal state, which makes it the only member of this family that applies at all. Eligibility traces address the domain\'s other defining feature — consequences arrive long after the decisions that caused them — by propagating a late signal backwards across the whole recent trajectory instead of one step per observation, which is the difference between learning in hours and learning in weeks. Two cautions specific to operations. Operational state is frequently not Markov, because the things omitted from a state vector are exactly the slow variables nobody instrumented, and bootstrapping is biased by that in a way Monte Carlo is not. And a constant step size, which is right here because the process drifts, means the estimate tracks rather than converges, so it should be monitored as a moving quantity rather than validated once.',
        featurization: [
          'Include the slow variables — maintenance state, supplier backlog, shift pattern — since those are what make an operational state non-Markov',
          'Use a constant step size deliberately, because the process drifts, and then report the estimate as tracking rather than converged',
          'Set gamma from the real financial horizon and remember it also shortens trace-based credit assignment',
          'Prune traces below a cutoff; in a large operational state space this is what makes the method affordable',
        ],
        evaluation:
          'Predicted long-run cost against realized cost over a rolling window, which is the only end-to-end check available in a continuing task. Track the TD-error distribution as a drift detector: its mean should sit near zero under a converged estimate, and a sustained departure means the dynamics moved rather than that learning is incomplete.',
        pitfalls: [
          'A state omitting the slow variables, which biases every bootstrapped estimate',
          'Treating a tracking estimate as converged and validating it once',
          'A discount chosen for numerical convenience, which silently shortens credit assignment as well as the horizon',
          'Naive traces over a large state space, which cost O(|S|) per step for contributions that are numerically zero',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Predict session-level value from the current session state and update between impressions rather than at session end. The TD error at each impression is an immediate learning signal, which matters because sessions are long and their outcomes arrive late.',
        where: [
          'Long-session value prediction where waiting for the session to end wastes most of the available signal',
          'Credit assignment from a late conversion back to the earlier impressions that contributed, through traces',
          'Continuous surfaces with no natural session boundary, where episodic methods do not apply',
          'Value estimation feeding a bandit or ranker, as a component rather than as the decision maker',
        ],
        why: 'A real but qualified fit, and the qualification is the Markov assumption rather than anything about scale. The attraction is genuine: sessions are long, outcomes are late, and the ability to learn from a partial session instead of a completed one is worth a great deal in a domain where most sessions are abandoned rather than concluded. Traces are the right mechanism for a late conversion, propagating it back across the impressions that preceded it rather than crediting only the last one. What undermines it is that a user is not a Markov state in any compact representation — intent, fatigue and context outside the session are all omitted — and bootstrapping is biased precisely by that omission, while a Monte Carlo estimate over completed sessions is not. The practical consequence is that the two estimators disagree, and the size of the disagreement is a useful measurement of how much the state is hiding. The honest position is that this belongs as a value-estimation component inside a larger system rather than as the thing that chooses what to show.',
        featurization: [
          'Compress the session into a state deliberately, and treat the Markov claim about that compression as the load-bearing assumption it is',
          'Compare TD against Monte Carlo on completed sessions; the gap measures how much the state omits',
          'Use traces rather than one-step updates, since the conversion signal arrives long after the impressions that earned it',
          'Log the serving policy, because any later off-policy correction is unidentified without it',
        ],
        evaluation:
          'Predicted session value against realized value on held-out completed sessions, alongside the Monte Carlo estimate on the same sessions — reporting only one of the two hides the bias. Online tests decide anything that changes what users see; this is a prediction component and should be judged as one.',
        pitfalls: [
          'Treating a user as a Markov state, which is where the bootstrapping bias comes from',
          'One-step updates on a domain whose signal arrives dozens of impressions later',
          'Off-policy corrections without logged propensities, which combined with function approximation is also the deadly triad',
          'Judging a prediction component by an online metric it does not directly control',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The cheapest method in this category per unit of experience: one lookup and one arithmetic update per step for TD(0), or O(nnz) with sparse linear features. Traces add a decay over eligible states, which is O(|S|) if implemented naively and O(k) for a small k once pruned below a cutoff. The cost that matters is transitions rather than compute, and it is far lower than Monte Carlo needs for the same accuracy because the variance is smaller. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'A table lookup or one sparse dot product: microseconds, and no different from any other value function at serving time. What is unusual is that the learner can keep running in production without an episode boundary, so the same artefact can serve and continue to learn — which is an operational property worth deciding on deliberately rather than acquiring by default.',
    retrainingCadence:
      'Continuous, which is the point. With a constant step size the estimate tracks the environment indefinitely and there is no retrain event; with a decaying step size it converges and then stops responding to change, which is usually wrong for a live system and right for an offline evaluation. Choosing between them is choosing whether the deployment has a retraining cadence at all.',
    driftAndMonitoring: [
      'Mean TD error over a rolling window, which should sit near zero under a converged estimate — a sustained departure means the dynamics moved, not that learning is incomplete',
      'TD-error variance, which rises when the state stops explaining the transitions and is the closest available signal that the representation has gone stale',
      'Weight or value norm under function approximation, since deadly-triad divergence shows up here first and grows exponentially rather than gradually',
      'Maximum trace magnitude with accumulating traces, which can grow without bound on fast revisits and takes the step size with it',
      'Gap between the TD estimate and a Monte Carlo estimate on the same completed episodes, which is a direct measurement of how non-Markov the state is',
    ],
    productionGotchas: [
      'The deadly triad diverges rather than degrading: bootstrapping plus function approximation plus off-policy updates can grow exponentially, and no step size fixes it. Any two of the three are safe, which is why it is so easy to arrive at accidentally',
      'A constant step size means the estimate tracks and never converges. That is usually the right choice and it makes "converged" the wrong word for the run',
      'Bootstrapping requires the state to be Markov. Where it is not, this converges confidently to a value that is not the value of anything, while Monte Carlo on the same data is correct',
      'Accumulating traces can grow without bound when a state is revisited quickly, which destabilizes a run that a replacing trace would have handled',
      'Gamma and lambda multiply in the trace decay, so lowering the discount silently shortens credit assignment as well as the horizon',
      'Naive traces are O(|S|) per step for contributions that are numerically zero; the cutoff is not an optimization so much as the difference between feasible and not',
      'The tabular convergence guarantee does not carry to function approximation. The on-policy linear bound exists but carries a one-over-one-minus-gamma factor, which is large at the discounts people actually use',
    ],
  },

  assumptions: [
    'The state is Markov — bootstrapping trusts the next state\'s estimate to summarize everything after it, which is the assumption Monte Carlo does not make',
    'The step size satisfies Robbins-Monro if convergence is claimed; a constant step size tracks instead, which is a different guarantee',
    'The environment is stationary over the window the estimate reflects, which a constant step size makes explicit and a decaying one hides',
    'For the linear-approximation guarantee, sampling is on-policy; going off-policy with bootstrapping and approximation removes it entirely',
    'Value estimates at successive states are more informative than realized returns, which is true exactly when the Markov assumption holds and false when it does not',
  ],

  pros: [
    {
      point: 'Learns online, from incomplete episodes, and in tasks that never terminate',
      context:
        'The property Monte Carlo cannot match at any sample size. Continuing operational processes have no episodes at all, which makes this the only member of the family that applies to them',
    },
    {
      point: 'Variance collapses, because the target is one reward plus a lookup rather than a sum over the trajectory',
      context:
        'This is why TD converges faster than Monte Carlo on well-specified Markov problems, often by a wide margin, and the advantage grows with the horizon',
    },
    {
      point: 'Lambda makes the bias-variance trade a tunable parameter rather than a choice of method',
      context:
        'Rather than arguing between two estimators, average over the family and tune the weighting. The optimum is interior and usually high, and this move generalizes well beyond reinforcement learning',
    },
    {
      point: 'Eligibility traces implement a forward-looking objective with backward-looking state',
      context:
        'The lambda-return is defined over the future and cannot be computed online; a decaying memory of the past produces the same total update with no lookahead, no buffer and no episode boundary',
    },
    {
      point: 'Batch TD converges to the value function of the maximum-likelihood Markov model',
      context:
        'A sharper and more useful answer than the least-squares fit Monte Carlo gives from the same data — exactly when the process really is Markov, and exactly wrong when it is not',
    },
  ],

  cons: [
    {
      point: 'The estimate is biased, and the bias does not vanish with data',
      context:
        'The target contains the quantity being learned, so an error at the next state propagates backwards and persists. More experience reduces variance and does not remove this',
    },
    {
      point: 'Bootstrapping requires the Markov property, and fails silently without it',
      context:
        'Under state aliasing this converges confidently to a value that is not the value of anything, while Monte Carlo on the same data is correct. The failure produces no diagnostic of its own',
    },
    {
      point: 'The deadly triad can diverge outright',
      context:
        'Bootstrapping, function approximation and off-policy sampling together grow exponentially rather than converging slowly. Each ingredient is individually standard, which is why teams arrive here by accident and debug it as a learning-rate problem',
    },
    {
      point: 'The tabular convergence guarantee does not survive function approximation',
      context:
        'The on-policy linear case retains a bound, inflated by roughly one over one minus gamma, which is a large factor at the discounts actually used. Off-policy retains nothing',
    },
    {
      point: 'Naive eligibility traces cost O(|S|) per step',
      context:
        'Every trace decays whether or not it matters, and geometric decay means most contribute nothing measurable. Pruning is the difference between feasible and not on a large state space, and it is an approximation that should be stated',
    },
    {
      point: 'Accumulating traces can destabilize a run on their own',
      context:
        'A state revisited quickly accumulates trace without bound, which multiplies the effective step size. Replacing or dutch traces remove this, and the failure is easy to misread as a step-size problem',
    },
  ],

  relatedSlugs: ['monte-carlo-control', 'sarsa', 'q-learning', 'mdp-bellman', 'dynamic-programming'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Temporal-difference learning, transcribed from the objective.

No library. The one substitution that defines the method:

    target = R + gamma * V(S')       instead of     target = G_t

Four things to read for.

1. td_zero() and monte_carlo() differ in exactly one line. Everything
   said about bias, variance, online learning and the Markov property
   follows from that line and nothing else.

2. lambda_return() is the forward view and td_lambda() is the backward
   view. forward_backward_equivalence() checks numerically that they
   produce the same total update offline -- which is the whole reason
   the trace mechanism exists, since the forward view refers to the
   future and cannot be computed online.

3. batch_td_versus_batch_mc() is the sharpest statement of what
   bootstrapping does. Given identical data, Monte Carlo converges to
   the least-squares fit of the observed returns and TD converges to
   the value function of the maximum-likelihood Markov model. Different
   answers, and TD's is better exactly when the process is Markov.

4. aliasing_demo() is the same comparison with the Markov property
   removed, where the sign of the argument flips.
"""

import random

Transition = tuple[int, float, int]   # (state, reward, next_state)
Episode = list[Transition]

TERMINAL = -1


def td_zero(
    episodes: list[Episode], n_states: int, gamma: float, alpha: float, initial: float = 0.0
) -> list[float]:
    """One-step bootstrapping. The whole method is the target line.

    Note what does NOT appear: any reference to the end of the episode.
    The update is available at every step, which is what makes this
    usable on a process that never terminates -- the property Monte
    Carlo cannot match at any sample size.
    """
    values = [initial] * n_states

    for episode in episodes:
        for state, reward, next_state in episode:
            # The target contains V. That is bootstrapping, and every
            # property of this method comes from it: the variance
            # collapses because the target is one reward plus a lookup,
            # and the bias appears because the lookup is wrong early
            # and its error propagates backwards.
            bootstrapped = 0.0 if next_state == TERMINAL else values[next_state]
            td_error = reward + gamma * bootstrapped - values[state]
            values[state] += alpha * td_error

    return values


def monte_carlo(
    episodes: list[Episode], n_states: int, gamma: float, alpha: float, initial: float = 0.0
) -> list[float]:
    """The same loop with the realized return as the target.

    Read against td_zero() above: one line differs. This one waits for
    the episode to end, which is both why it is unbiased and why it
    cannot run on a continuing task.
    """
    values = [initial] * n_states

    for episode in episodes:
        returns = [0.0] * len(episode)
        running = 0.0
        for index in reversed(range(len(episode))):
            running = episode[index][1] + gamma * running
            returns[index] = running

        for index, (state, _, _) in enumerate(episode):
            values[state] += alpha * (returns[index] - values[state])

    return values


def n_step_return(
    episode: Episode, start: int, n: int, values: list[float], gamma: float
) -> float:
    """n real rewards, then bootstrap.

    The discrete version of the dial. n = 1 is TD(0), n at or beyond the
    episode length is Monte Carlo, and the useful values are in
    between -- which is the whole observation that lambda then makes
    continuous.
    """
    total = 0.0
    discount = 1.0

    for offset in range(n):
        index = start + offset
        if index >= len(episode):
            return total  # ran off the end: this IS the full return
        total += discount * episode[index][1]
        discount *= gamma

        if episode[index][2] == TERMINAL:
            return total

    return total + discount * values[episode[start + n - 1][2]]


def lambda_return(
    episode: Episode, start: int, values: list[float], gamma: float, lam: float
) -> float:
    """The forward view: a geometric average over every n-step return.

        G^lambda = (1 - lambda) * sum_n lambda^(n-1) * G^(n)

    This is the target the method is actually trying to hit, and it
    cannot be computed online because it refers to the whole remaining
    episode. The trace mechanism below exists entirely to produce the
    same updates without ever forming this quantity.
    """
    horizon = len(episode) - start
    total = 0.0
    weight = 1.0 - lam

    for n in range(1, horizon):
        total += weight * n_step_return(episode, start, n, values, gamma)
        weight *= lam

    # The remaining weight, lambda^(horizon-1), goes to the full return.
    return total + (lam ** (horizon - 1)) * n_step_return(episode, start, horizon, values, gamma)


def td_lambda(
    episodes: list[Episode],
    n_states: int,
    gamma: float,
    alpha: float,
    lam: float,
    replacing: bool = True,
    initial: float = 0.0,
) -> list[float]:
    """The backward view: one TD error, distributed by eligibility.

    The trace records how recently and how often each state was
    visited, decaying at gamma*lambda per step. Applying today's error
    in proportion to it credits the states that led here, without any
    lookahead, buffer or episode boundary.

    Accumulating traces add 1 on each visit and can grow without bound
    when a state is revisited quickly, which multiplies the effective
    step size and destabilizes runs that look like learning-rate
    problems. Replacing traces cap at 1 and are the safer default.
    """
    values = [initial] * n_states

    for episode in episodes:
        traces = [0.0] * n_states

        for state, reward, next_state in episode:
            bootstrapped = 0.0 if next_state == TERMINAL else values[next_state]
            td_error = reward + gamma * bootstrapped - values[state]

            traces[state] = 1.0 if replacing else traces[state] + 1.0

            # Every eligible state is updated by the same error. This
            # is O(|S|) per step as written, which is why real
            # implementations prune traces below a cutoff -- the decay
            # is geometric, so most of these contribute nothing.
            for index in range(n_states):
                if traces[index] == 0.0:
                    continue
                values[index] += alpha * td_error * traces[index]
                traces[index] *= gamma * lam

    return values


def forward_backward_equivalence(
    episode: Episode, n_states: int, gamma: float, alpha: float, lam: float
) -> dict[str, float]:
    """The equivalence that justifies the trace mechanism.

    Offline -- with the value function held fixed for the whole episode
    -- the total update from the backward view equals the total update
    from the forward view. That is why a decaying memory of the past
    can implement an objective defined over the future.

    The equality is exact offline and approximate online, because the
    online version bootstraps off values that changed during the
    episode. True-online TD(lambda) with dutch traces restores exactness
    and is what a serious implementation uses.
    """
    frozen = [0.0] * n_states

    forward = [0.0] * n_states
    for index, (state, _, _) in enumerate(episode):
        target = lambda_return(episode, index, frozen, gamma, lam)
        forward[state] += alpha * (target - frozen[state])

    backward = [0.0] * n_states
    traces = [0.0] * n_states
    for state, reward, next_state in episode:
        bootstrapped = 0.0 if next_state == TERMINAL else frozen[next_state]
        td_error = reward + gamma * bootstrapped - frozen[state]
        traces[state] += 1.0

        for index in range(n_states):
            if traces[index] == 0.0:
                continue
            backward[index] += alpha * td_error * traces[index]
            traces[index] *= gamma * lam

    largest_gap = max(abs(f - b) for f, b in zip(forward, backward))
    return {
        "largest_gap": largest_gap,
        "equivalent": largest_gap < 1e-9,
    }


def batch_td_versus_batch_mc(gamma: float = 1.0, sweeps: int = 500) -> dict[str, object]:
    """The clearest statement of what bootstrapping actually does.

    The classic eight-episode example. State A appears once, followed
    immediately by state B with reward 0; state B appears eight times,
    with reward 1 in six of them.

    Monte Carlo fits the observed returns: A was followed by a total
    reward of 0 exactly once, so V(A) = 0. It is the least-squares
    answer and it is unarguable given the data as a flat collection of
    outcomes.

    TD uses the transition structure: A always goes to B, and B is worth
    0.75, so V(A) = 0.75. It is the value function of the
    maximum-likelihood Markov model of the data.

    Both are correct answers to different questions, and TD's is the one
    you want exactly when the process really is Markov -- which is the
    entire argument for bootstrapping, stated in two numbers.
    """
    episodes: list[Episode] = [[(0, 0.0, 1), (1, 1.0, TERMINAL)]]
    episodes += [[(1, 1.0, TERMINAL)] for _ in range(5)]
    episodes += [[(1, 0.0, TERMINAL)] for _ in range(2)]

    # Batch: repeatedly sweep the same episodes with a small step until
    # each method reaches its own fixed point.
    td_values = [0.0, 0.0]
    for _ in range(sweeps):
        for episode in episodes:
            for state, reward, next_state in episode:
                bootstrapped = 0.0 if next_state == TERMINAL else td_values[next_state]
                td_values[state] += 0.01 * (reward + gamma * bootstrapped - td_values[state])

    mc_values = [0.0, 0.0]
    for _ in range(sweeps):
        for episode in episodes:
            running = 0.0
            returns = [0.0] * len(episode)
            for index in reversed(range(len(episode))):
                running = episode[index][1] + gamma * running
                returns[index] = running
            for index, (state, _, _) in enumerate(episode):
                mc_values[state] += 0.01 * (returns[index] - mc_values[state])

    return {
        "td_value_of_A": td_values[0],
        "mc_value_of_A": mc_values[0],
        "value_of_B": td_values[1],
        "note": (
            "same data, different answers: MC fits the observed returns, TD fits the "
            "maximum-likelihood Markov model"
        ),
    }


def aliasing_demo(episodes_count: int = 40_000, gamma: float = 0.9, seed: int = 0):
    """Where the argument for bootstrapping reverses.

    One observation hides two underlying states whose continuations
    differ. Monte Carlo averages the returns that actually occurred and
    is correct for the process as experienced. TD bootstraps off the
    aliased successor's estimate, which summarizes nothing, and
    converges to a value that is not the value of anything.

    The gap between the two estimators is therefore a direct
    measurement of how non-Markov the state representation is -- a
    diagnostic worth running whenever a state was constructed rather
    than given.
    """
    rng = random.Random(seed)
    episodes: list[Episode] = []

    for _ in range(episodes_count):
        # Observation 0 leads to observation 1, which is really two
        # different situations paying +1 and -1 with equal probability.
        payoff = 1.0 if rng.random() < 0.5 else -1.0
        episodes.append([(0, 0.0, 1), (1, payoff, TERMINAL)])

    return {
        "td_value_of_0": td_zero(episodes, 2, gamma, 0.01)[0],
        "mc_value_of_0": monte_carlo(episodes, 2, gamma, 0.01)[0],
        "note": "the gap between them measures how much the state representation hides",
    }
`,
        profile:
          'TD(0) is O(1) per step; TD(lambda) as written is O(|S|) per step because every trace decays whether or not it matters, and the lambda-return in the forward view is O(T) per step and therefore O(T²) per episode — which is exactly why nobody computes it and the backward view exists. Illustrative, not a measured benchmark: the shape to notice is that the forward view is the definition and the backward view is the implementation, and they agree.',
      },
      'make-it-right': {
        rationale:
          'The step-size schedule stops being a float and becomes an object that reports whether it satisfies Robbins-Monro, because a decaying step size converges and a constant one tracks, and those are different claims about what the run produced — a constant-alpha run described as converged is a category error that appears in almost every implementation. The trace type becomes an enum rather than a hidden increment, since accumulating traces can grow without bound when a state is revisited quickly and destabilize a run that reads as a learning-rate problem, while dutch traces are what make the online and offline updates exactly equal rather than approximately so. The deadly triad becomes a checked configuration rather than a footnote: the three ingredients are individually standard, the combination diverges exponentially, and a constructor that knows which are present can say so before the run rather than after. Every recoverable failure names its cause, including a lambda or discount outside its range, a state index beyond the table, and a value or weight norm that has left the range any bounded return could produce — the last is a divergence detector, because deadly-triad failures grow geometrically and the sooner one is caught the less of a run is wasted. Traces are pruned below an explicit cutoff carried in the configuration rather than looped over in full, which is stated as the approximation it is. And the diagnostics that distinguish this method working from appearing to work are functions rather than advice: the running TD-error mean, which should sit near zero, and the gap between the bootstrapped estimate and a Monte Carlo estimate on the same episodes, which measures how non-Markov the state representation is.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""TD learning with the choices that change the answer made explicit.

Four things the literal version decided silently:

  * whether the step size decays, which decides whether the run
    converges or merely tracks -- and almost every implementation calls
    the second one "converged";
  * which trace type is in use, where accumulating traces can diverge
    on their own through fast revisits;
  * whether all three deadly-triad ingredients are present, which is
    the difference between slow learning and exponential divergence;
  * where to stop decaying traces, which is an approximation rather
    than an optimization and should be stated.

Each becomes a named object or a raised exception. The diagnostic that
matters most -- the gap between the bootstrapped and Monte Carlo
estimates, which measures how non-Markov the state is -- is a function
rather than a paragraph.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]

TERMINAL = -1


class TemporalDifferenceError(Exception):
    """Base for every recoverable failure in these learners."""


class InvalidSchedule(TemporalDifferenceError):
    """A step size, discount or lambda outside its meaningful range."""


class Divergence(TemporalDifferenceError):
    """Values left the range any bounded return could produce.

    Raised rather than allowed to continue because deadly-triad failures
    grow geometrically: by the time a value function is visibly absurd
    it has usually been diverging for thousands of steps, and no step
    size recovers it.
    """


class DeadlyTriad(TemporalDifferenceError):
    """Bootstrapping, function approximation and off-policy updates.

    Individually standard; together they can diverge rather than
    converge slowly. Any two are safe, which is exactly why this
    configuration is reached by accident and then debugged as a
    learning-rate problem.
    """


class TraceType(Enum):
    """How a revisit affects eligibility.

    ACCUMULATING adds one and can grow without bound on fast revisits,
    which multiplies the effective step size. REPLACING caps at one and
    is the safe default. DUTCH is the form that makes the online update
    exactly equal the offline one -- true-online TD(lambda).
    """

    ACCUMULATING = "accumulating"
    REPLACING = "replacing"
    DUTCH = "dutch"


@dataclass(frozen=True)
class StepSizeSchedule:
    """Alpha over time, with the guarantee it does or does not carry.

    Decaying as one over visit count to a power in (0.5, 1] satisfies
    the Robbins-Monro conditions and converges. A constant alpha tracks
    a changing environment and converges to nothing -- frequently the
    right choice, and a different claim.
    """

    initial: float
    decay_exponent: float = 0.0

    def __post_init__(self) -> None:
        if not 0.0 < self.initial <= 1.0:
            raise InvalidSchedule(f"initial step size must lie in (0, 1]; got {self.initial}")
        if not 0.0 <= self.decay_exponent <= 1.0:
            raise InvalidSchedule(f"decay exponent must lie in [0, 1]; got {self.decay_exponent}")

    def at(self, visits: int) -> float:
        if self.decay_exponent == 0.0:
            return self.initial
        return self.initial / max(visits, 1) ** self.decay_exponent

    @property
    def satisfies_robbins_monro(self) -> bool:
        """Whether this schedule converges, or only tracks.

        Exposed rather than documented, because a run reported as
        converged under a constant step size is describing something
        that has no fixed point.
        """
        return 0.5 < self.decay_exponent <= 1.0


@dataclass(frozen=True)
class LearnerConfig:
    """Everything that changes what the run computes, validated once."""

    gamma: float
    lam: float
    schedule: StepSizeSchedule
    trace_type: TraceType = TraceType.REPLACING
    # Traces decay geometrically, so below this they contribute nothing
    # measurable. Pruning is what makes a large state space affordable,
    # and it is an approximation rather than a free optimization.
    trace_cutoff: float = 1e-4
    uses_function_approximation: bool = False
    is_off_policy: bool = False

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma <= 1.0:
            raise InvalidSchedule(f"gamma must lie in [0, 1]; got {self.gamma}")
        if not 0.0 <= self.lam <= 1.0:
            raise InvalidSchedule(f"lambda must lie in [0, 1]; got {self.lam}")
        if self.trace_cutoff <= 0.0:
            raise InvalidSchedule(f"trace cutoff must be positive; got {self.trace_cutoff}")

        # Bootstrapping is present whenever lambda < 1: at lambda = 1
        # the method is Monte Carlo and the triad does not apply.
        bootstraps = self.lam < 1.0
        if bootstraps and self.uses_function_approximation and self.is_off_policy:
            raise DeadlyTriad(
                "bootstrapping, function approximation and off-policy updates together "
                "can diverge exponentially. Remove one: raise lambda to 1, use a table, "
                "or sample on-policy -- no step size fixes this combination"
            )

    @property
    def trace_decay(self) -> float:
        """gamma * lambda. Worth naming, because lowering the discount
        silently shortens credit assignment as well as the horizon."""
        return self.gamma * self.lam

    @property
    def effective_credit_horizon(self) -> float:
        """Roughly how many steps back a TD error is still felt."""
        decay = self.trace_decay
        return float("inf") if decay >= 1.0 else 1.0 / (1.0 - decay)


class LearningReport(NamedTuple):
    """The values, plus whether to believe them."""

    values: FloatArray
    visits: npt.NDArray[np.int64]
    mean_td_error: float
    converges: bool
    active_traces_mean: float


@dataclass
class TdLambdaLearner:
    """Tabular TD(lambda) with pruned traces.

    Traces are held as a dict of the states whose eligibility is still
    above the cutoff, rather than as a dense array swept every step.
    The dense form is O(|S|) per step for contributions that are
    numerically zero; this is O(k) for a k that stays small because the
    decay is geometric.
    """

    n_states: int
    config: LearnerConfig
    values: FloatArray = field(init=False)
    visits: npt.NDArray[np.int64] = field(init=False)
    _traces: dict[int, float] = field(init=False, default_factory=dict)
    _td_error_sum: float = field(init=False, default=0.0)
    _steps: int = field(init=False, default=0)

    def __post_init__(self) -> None:
        if self.n_states <= 0:
            raise TemporalDifferenceError(f"n_states must be positive; got {self.n_states}")
        self.values = np.zeros(self.n_states, dtype=np.float64)
        self.visits = np.zeros(self.n_states, dtype=np.int64)

    def begin_episode(self) -> None:
        """Traces do not survive a terminal state.

        Carrying them across an episode boundary credits the new
        episode's first reward to the previous episode's states, which
        is a silent and surprisingly common bug.
        """
        self._traces.clear()

    def step(self, state: int, reward: float, next_state: int) -> float:
        """One transition. Returns the TD error, which is the diagnostic.

        Guard clauses first: the interesting path is the update and
        every other path is an early exit.
        """
        if not 0 <= state < self.n_states:
            raise TemporalDifferenceError(f"state {state} outside [0, {self.n_states})")
        if next_state != TERMINAL and not 0 <= next_state < self.n_states:
            raise TemporalDifferenceError(f"next state {next_state} outside the table")

        bootstrapped = 0.0 if next_state == TERMINAL else float(self.values[next_state])
        td_error = reward + self.config.gamma * bootstrapped - float(self.values[state])

        self.visits[state] += 1
        alpha = self.config.schedule.at(int(self.visits[state]))

        current = self._traces.get(state, 0.0)
        if self.config.trace_type is TraceType.ACCUMULATING:
            self._traces[state] = current + 1.0
        elif self.config.trace_type is TraceType.REPLACING:
            self._traces[state] = 1.0
        else:
            # Dutch: the form that makes the online update exactly
            # equal the offline lambda-return update.
            self._traces[state] = (1.0 - alpha) * current + 1.0

        decay = self.config.trace_decay
        surviving: dict[int, float] = {}

        for eligible, trace in self._traces.items():
            self.values[eligible] += alpha * td_error * trace
            decayed = trace * decay
            if decayed >= self.config.trace_cutoff:
                surviving[eligible] = decayed
        self._traces = surviving

        self._td_error_sum += td_error
        self._steps += 1

        # Divergence grows geometrically, so catching it early is the
        # difference between losing a step and losing a run.
        largest = float(np.max(np.abs(self.values)))
        if not np.isfinite(largest) or largest > 1e12:
            raise Divergence(
                f"value magnitude reached {largest:.3e}; with bootstrapping this grows "
                "geometrically, so check the trace type and the triad before the step size"
            )
        return td_error

    def report(self) -> LearningReport:
        return LearningReport(
            values=self.values.copy(),
            visits=self.visits.copy(),
            # Should sit near zero once converged. A sustained
            # departure means the dynamics moved, not that learning is
            # incomplete.
            mean_td_error=self._td_error_sum / max(self._steps, 1),
            converges=self.config.schedule.satisfies_robbins_monro,
            active_traces_mean=float(len(self._traces)),
        )


class Transition(NamedTuple):
    state: int
    reward: float
    next_state: int


class MarkovGap(NamedTuple):
    """How much the state representation is hiding.

    TD bootstraps off the successor's estimate and is biased when that
    estimate summarizes nothing; Monte Carlo averages realized returns
    and is not. The gap between them on the same episodes is therefore
    a direct measurement of the aliasing -- the one diagnostic that
    catches the failure mode bootstrapping has and Monte Carlo does not.
    """

    td_values: FloatArray
    mc_values: FloatArray
    largest_gap: float
    worst_state: int


def markov_gap(
    episodes: Sequence[Sequence[Transition]], n_states: int, gamma: float, alpha: float
) -> MarkovGap:
    """Run both estimators on the same data and compare.

    Worth running whenever the state was constructed rather than given,
    which is almost always. A large gap does not say which estimator is
    right; it says the Markov assumption is doing work it may not be
    able to support.
    """
    if not episodes:
        raise TemporalDifferenceError("no episodes")

    td_values = np.zeros(n_states, dtype=np.float64)
    mc_values = np.zeros(n_states, dtype=np.float64)

    for episode in episodes:
        for transition in episode:
            bootstrapped = (
                0.0 if transition.next_state == TERMINAL else float(td_values[transition.next_state])
            )
            td_values[transition.state] += alpha * (
                transition.reward + gamma * bootstrapped - td_values[transition.state]
            )

        rewards = np.fromiter((t.reward for t in episode), dtype=np.float64, count=len(episode))
        running = 0.0
        returns = np.empty_like(rewards)
        for index in range(len(rewards) - 1, -1, -1):
            running = rewards[index] + gamma * running
            returns[index] = running

        for index, transition in enumerate(episode):
            mc_values[transition.state] += alpha * (returns[index] - mc_values[transition.state])

    differences = np.abs(td_values - mc_values)
    worst = int(np.argmax(differences))
    return MarkovGap(td_values, mc_values, float(differences[worst]), worst)
`,
        profile:
          'TD(0) remains O(1) per step; TD(lambda) drops from O(|S|) to O(k) per step, where k is the number of traces still above the cutoff and stays small because the decay is geometric — at gamma-lambda of 0.9 a cutoff of 1e-4 keeps roughly ninety states regardless of how large the table is. Illustrative, not a measured benchmark: the substantive change is that a diverging value function, a deadly-triad configuration and an out-of-range lambda are now failures raised rather than absorbed, and the report distinguishes a run that converged from one that is tracking.',
      },
      'make-it-fast': {
        rationale:
          'The tabular form is not where this method is used, so the fast stage moves to linear function approximation over sparse features, which is what makes TD(lambda) practical at scale and also what puts two of the three deadly-triad ingredients on the table at once. The eligibility trace becomes a vector over features rather than states, and because tile-coded or hashed features activate only a handful of components per observation, the trace is sparse and stays sparse — maintained as an index list of active components with their magnitudes rather than a dense vector decayed in full, which turns an O(d) per-step decay into O(k) for the k components still above cutoff. The update then fuses: the TD error is formed from two sparse dot products, the weight update and the trace decay run in one pass over that active set, and no dense intermediate is ever written. True-online TD(lambda) with dutch traces replaces the approximate online update, which costs one extra scalar per step and makes the online result exactly equal the offline lambda-return result rather than approximately equal — a correctness improvement that happens to be nearly free. Batched offline evaluation, where many episodes are replayed to fit a value function, becomes least-squares TD: accumulating the two matrices the fixed point is defined by and solving once, which uses every sample maximally instead of discarding it after one gradient step, at the cost of O(d²) memory. All buffers are sized from the feature dimension at construction, feature indices are int32 and weights float64, and the active-set representation keeps every access contiguous.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The value, the TD error and the weight update become sparse dot products and scatter-adds over the active feature set instead of Python loops over states',
            tradeoff: 'The gain is real only when features are sparse; with dense features the same code is slower than a straightforward dense update because of the indirection',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Weight, trace and active-index buffers are sized from the feature dimension once, so a run of millions of steps allocates nothing',
            tradeoff: 'The learner is not reentrant and holds the peak trace footprint for the process lifetime, so two learners cannot share a workspace',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The weight update and the trace decay run in one pass over the active set, so no dense trace vector is ever written or read',
            tradeoff: 'The per-component trace values are gone after the pass, and they are exactly what a diagnostic wants when credit assignment looks wrong',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Least-squares TD accumulates its two matrices over a whole batch of transitions with array operations and solves once',
            tradeoff: 'O(d²) memory and an O(d³) solve, so it is only available at feature dimensions where the matrix fits — which rules it out exactly where the sparse incremental form shines',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'int32 feature indices and float64 weights in C-contiguous blocks keep the gather and the scatter on one kernel with no mid-expression promotion',
            tradeoff: 'float64 weights double the memory of the largest array, which binds first at the feature dimensions this representation is chosen for',
          },
        ],
        code: `"""TD(lambda) with linear function approximation and sparse traces.

This is where the method is actually used, and it is also where two of
the three deadly-triad ingredients arrive together -- so the off-policy
question stops being theoretical.

Three changes carry the weight:

  1. traces live over FEATURES, not states, and are kept as an active
     set rather than a dense vector, because tile-coded and hashed
     features activate a handful of components and the trace decays
     geometrically;
  2. the update fuses the weight change and the trace decay into one
     pass over that active set;
  3. true-online TD(lambda) with dutch traces makes the online update
     exactly equal the offline one, for one extra scalar per step.

What none of this changes: the bias from bootstrapping, and the
requirement that the state be Markov. A faster wrong answer is still
wrong.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IndexArray = npt.NDArray[np.int32]


@dataclass(frozen=True)
class LinearConfig:
    n_features: int
    gamma: float
    lam: float
    alpha: float
    trace_cutoff: float = 1e-4


class SparseTrace:
    """Eligibility over features, as an active set.

    A dense trace is O(d) per step to decay, and almost all of those
    components are numerically zero because the decay is geometric --
    at gamma*lambda of 0.9 a component falls below 1e-4 in under a
    hundred steps regardless of how large d is.

    Holding the active components as parallel index and value arrays
    keeps both the decay and the update O(k). The arrays are sized once
    at a capacity the geometric decay bounds, so the hot path allocates
    nothing.
    """

    def __init__(self, capacity: int) -> None:
        self.indices = np.zeros(capacity, dtype=np.int32)
        self.values = np.zeros(capacity, dtype=np.float64)
        self.size = 0
        # Position of each feature in the active arrays, or -1. One
        # lookup instead of a scan when a feature is re-activated.
        self._slot: dict[int, int] = {}

    def clear(self) -> None:
        """Traces do not survive a terminal state.

        Carrying them across an episode boundary credits the next
        episode's first reward to the previous episode's features --
        silent, and a surprisingly common bug.
        """
        self.size = 0
        self._slot.clear()

    def bump(self, feature: int, increment: float, dutch_factor: float) -> None:
        existing = self._slot.get(feature, -1)
        if existing >= 0:
            # Dutch trace: (1 - alpha*x'e) * e + x, the form that makes
            # the online update exactly equal the offline one.
            self.values[existing] = dutch_factor * self.values[existing] + increment
            return

        if self.size >= len(self.indices):
            raise RuntimeError("trace capacity exceeded; raise the cutoff or the capacity")

        self.indices[self.size] = feature
        self.values[self.size] = increment
        self._slot[feature] = self.size
        self.size += 1

    def active(self) -> tuple[IndexArray, FloatArray]:
        return self.indices[: self.size], self.values[: self.size]

    def decay_and_prune(self, decay: float, cutoff: float) -> None:
        """One pass: scale, drop the negligible, compact.

        Compacting in place rather than rebuilding keeps the arrays
        contiguous, which is what makes the gather in the next step
        stream rather than stride.
        """
        write = 0
        for read in range(self.size):
            scaled = self.values[read] * decay
            if scaled < cutoff:
                self._slot.pop(int(self.indices[read]), None)
                continue
            self.indices[write] = self.indices[read]
            self.values[write] = scaled
            self._slot[int(self.indices[write])] = write
            write += 1
        self.size = write


class TrueOnlineTdLambda:
    """Linear TD(lambda), dutch traces, sparse features.

    True-online rather than conventional because the correction costs
    one scalar per step and makes the online sequence of weights
    exactly match what the offline lambda-return update would produce.
    The conventional form only matches in the limit of a vanishing step
    size, which is not the regime anyone runs in.
    """

    def __init__(self, config: LinearConfig, trace_capacity: int = 4096) -> None:
        if not 0.0 <= config.lam <= 1.0 or not 0.0 <= config.gamma <= 1.0:
            raise ValueError("gamma and lambda must lie in [0, 1]")

        self.config = config
        self.weights = np.zeros(config.n_features, dtype=np.float64)
        self.trace = SparseTrace(trace_capacity)
        self._previous_value = 0.0

    def value(self, features: IndexArray, activations: FloatArray) -> float:
        """One sparse dot product: sum of w[i] * x[i] over active i."""
        return float(np.dot(self.weights[features], activations))

    def begin_episode(self) -> None:
        self.trace.clear()
        self._previous_value = 0.0

    def step(
        self,
        features: IndexArray,
        activations: FloatArray,
        reward: float,
        next_features: IndexArray,
        next_activations: FloatArray,
        terminal: bool,
    ) -> float:
        """One transition. Everything is O(k) in the active set.

        The fused pass at the end does the weight update and the trace
        decay together, so no dense trace vector is ever written --
        which at a feature dimension in the millions is the difference
        between feasible and not.
        """
        alpha = self.config.alpha
        gamma = self.config.gamma

        current_value = self.value(features, activations)
        next_value = 0.0 if terminal else self.value(next_features, next_activations)
        td_error = reward + gamma * next_value - current_value

        # Dutch-trace factor: 1 - alpha * (x . e), computed from the
        # active set only.
        active_indices, active_values = self.trace.active()
        overlap = 0.0
        if active_values.size:
            # Align the feature activations onto the active positions.
            lookup = {int(index): position for position, index in enumerate(active_indices)}
            for position, feature in enumerate(features):
                slot = lookup.get(int(feature), -1)
                if slot >= 0:
                    overlap += activations[position] * active_values[slot]
        dutch_factor = 1.0 - alpha * overlap

        for position, feature in enumerate(features):
            self.trace.bump(int(feature), float(activations[position]), dutch_factor)

        active_indices, active_values = self.trace.active()

        # The fused update. np.add.at handles a feature appearing more
        # than once in the active set, which a plain fancy-index add
        # would silently collapse.
        np.add.at(self.weights, active_indices, alpha * td_error * active_values)

        # True-online correction: the term that makes this exact rather
        # than asymptotic. One scalar, applied to the current features.
        correction = alpha * (current_value - self._previous_value)
        np.add.at(self.weights, features, -correction * activations)

        self._previous_value = next_value
        self.trace.decay_and_prune(gamma * self.config.lam, self.config.trace_cutoff)
        return td_error


@dataclass
class LeastSquaresTd:
    """Batch TD as a single linear solve.

    The TD fixed point under linear approximation is defined by
    A w = b with

        A = sum_t x_t (x_t - gamma x_{t+1})^T,     b = sum_t r_t x_t

    Accumulating those and solving once uses every transition maximally,
    where incremental TD extracts one gradient step from each and
    discards it. On a fixed batch this reaches the same fixed point in
    a single pass rather than in thousands.

    The cost is why it is not the default: O(d^2) memory and an O(d^3)
    solve, which rules it out at exactly the feature dimensions that
    make the sparse incremental form attractive. It is the right tool
    for offline evaluation with a few thousand features and the wrong
    one for online learning with a few million.
    """

    n_features: int
    gamma: float
    regularization: float = 1e-6
    _a: FloatArray = None  # type: ignore[assignment]
    _b: FloatArray = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self._a = np.eye(self.n_features, dtype=np.float64) * self.regularization
        self._b = np.zeros(self.n_features, dtype=np.float64)

    def accumulate(
        self, features: FloatArray, rewards: FloatArray, next_features: FloatArray
    ) -> None:
        """A whole batch of transitions in two matrix products.

        Dense here on purpose: this method is chosen when d is small
        enough for a d-by-d matrix, and at that size the dense form is
        faster than any sparse bookkeeping.
        """
        if features.shape != next_features.shape:
            raise ValueError("feature and successor matrices must have the same shape")
        if features.shape[0] != rewards.shape[0]:
            raise ValueError("feature rows and reward count differ")

        difference = features - self.gamma * next_features
        self._a += features.T @ difference
        self._b += features.T @ rewards

    def solve(self) -> FloatArray:
        """One solve rather than thousands of gradient steps.

        solve() rather than inv(): the A matrix here is not symmetric,
        it can be badly conditioned when features are correlated, and
        forming an explicit inverse makes both worse for no benefit.
        """
        try:
            return np.linalg.solve(self._a, self._b)
        except np.linalg.LinAlgError as error:
            raise ValueError(
                "the LSTD system is singular; correlated or redundant features make A "
                "rank-deficient, so either regularize more or drop the duplicates"
            ) from error


def trace_capacity_for(gamma: float, lam: float, cutoff: float, per_step: int) -> int:
    """How many features can be eligible at once, from the decay rate.

    Geometric decay bounds this: a component falls below the cutoff
    after log(cutoff)/log(gamma*lambda) steps, and at most per_step
    features activate each step. Sizing the buffer from that rather
    than guessing is what lets the hot path allocate nothing.
    """
    decay = gamma * lam
    if decay <= 0.0:
        return per_step
    if decay >= 1.0:
        raise ValueError("gamma*lambda >= 1 means traces never decay; no finite capacity exists")

    steps = int(np.ceil(np.log(cutoff) / np.log(decay)))
    return steps * per_step
`,
        profile:
          'Per step: two sparse dot products at O(k_features), one fused scatter-add and trace decay at O(k_trace), where k_trace is bounded by log(cutoff)/log(gamma·lambda) times the features active per step — roughly ninety at gamma-lambda 0.9 and a 1e-4 cutoff, independent of the feature dimension. LSTD is O(d²) per batch accumulation and O(d³) once. Illustrative, not a measured benchmark: the trade worth seeing is that the sparse incremental form scales to millions of features and extracts one step from each sample, while LSTD extracts everything from each sample and stops scaling at a few thousand.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Temporal-difference learning, transcribed from the objective.
//
// No library. The one substitution that defines the method:
//
//     target = R + gamma * V(S')      instead of     target = G_t
//
// Four things to read for.
//
// 1. TdZero() and MonteCarlo() differ in exactly one line. Everything
//    said about bias, variance, online learning and the Markov
//    property follows from that line and nothing else.
//
// 2. LambdaReturn() is the forward view and TdLambda() is the backward
//    view. ForwardBackwardEquivalence() checks numerically that they
//    produce the same total update offline -- the whole reason the
//    trace mechanism exists, since the forward view refers to the
//    future and cannot be computed online.
//
// 3. BatchTdVersusBatchMc() is the sharpest statement of what
//    bootstrapping does: identical data, two different answers. Monte
//    Carlo fits the observed returns; TD fits the maximum-likelihood
//    Markov model.
//
// 4. AliasingDemo() is the same comparison with the Markov property
//    removed, where the sign of the argument flips.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

namespace td {

constexpr int kTerminal = -1;

struct Transition {
  int state;
  double reward;
  int next_state;
};

using Episode = std::vector<Transition>;

// One-step bootstrapping. The whole method is the target line.
//
// Note what does NOT appear: any reference to the end of the episode.
// The update exists at every step, which is what makes this usable on
// a process that never terminates -- the property Monte Carlo cannot
// match at any sample size.
std::vector<double> TdZero(const std::vector<Episode>& episodes, std::size_t n_states,
                           double gamma, double alpha, double initial = 0.0) {
  std::vector<double> values(n_states, initial);

  for (const Episode& episode : episodes) {
    for (const Transition& transition : episode) {
      // The target contains V. That is bootstrapping, and every
      // property of this method comes from it: the variance collapses
      // because the target is one reward plus a lookup, and the bias
      // appears because that lookup is wrong early and its error
      // propagates backwards.
      const double bootstrapped =
          transition.next_state == kTerminal
              ? 0.0
              : values[static_cast<std::size_t>(transition.next_state)];
      const double td_error = transition.reward + gamma * bootstrapped -
                              values[static_cast<std::size_t>(transition.state)];
      values[static_cast<std::size_t>(transition.state)] += alpha * td_error;
    }
  }
  return values;
}

// The same loop with the realized return as the target.
//
// Read against TdZero() above: one line differs. This one waits for
// the episode to end, which is both why it is unbiased and why it
// cannot run on a continuing task.
std::vector<double> MonteCarlo(const std::vector<Episode>& episodes, std::size_t n_states,
                               double gamma, double alpha, double initial = 0.0) {
  std::vector<double> values(n_states, initial);

  for (const Episode& episode : episodes) {
    std::vector<double> returns(episode.size(), 0.0);
    double running = 0.0;
    for (std::size_t index = episode.size(); index-- > 0;) {
      running = episode[index].reward + gamma * running;
      returns[index] = running;
    }

    for (std::size_t index = 0; index < episode.size(); ++index) {
      const std::size_t state = static_cast<std::size_t>(episode[index].state);
      values[state] += alpha * (returns[index] - values[state]);
    }
  }
  return values;
}

// n real rewards, then bootstrap.
//
// The discrete version of the dial: n = 1 is TD(0), n at or beyond the
// episode length is Monte Carlo, and the useful values are in between
// -- which is the observation lambda then makes continuous.
double NStepReturn(const Episode& episode, std::size_t start, std::size_t n,
                   const std::vector<double>& values, double gamma) {
  double total = 0.0;
  double discount = 1.0;

  for (std::size_t offset = 0; offset < n; ++offset) {
    const std::size_t index = start + offset;
    if (index >= episode.size()) {
      return total;  // ran off the end: this IS the full return
    }
    total += discount * episode[index].reward;
    discount *= gamma;

    if (episode[index].next_state == kTerminal) {
      return total;
    }
  }

  const int landing = episode[start + n - 1].next_state;
  return total + discount * values[static_cast<std::size_t>(landing)];
}

// The forward view: a geometric average over every n-step return.
//
//     G^lambda = (1 - lambda) * sum_n lambda^(n-1) * G^(n)
//
// This is the target the method is actually trying to hit, and it
// cannot be computed online because it refers to the whole remaining
// episode. The trace mechanism exists entirely to produce the same
// updates without ever forming this quantity.
double LambdaReturn(const Episode& episode, std::size_t start,
                    const std::vector<double>& values, double gamma, double lam) {
  const std::size_t horizon = episode.size() - start;
  double total = 0.0;
  double weight = 1.0 - lam;

  for (std::size_t n = 1; n < horizon; ++n) {
    total += weight * NStepReturn(episode, start, n, values, gamma);
    weight *= lam;
  }

  return total + std::pow(lam, static_cast<double>(horizon - 1)) *
                     NStepReturn(episode, start, horizon, values, gamma);
}

// The backward view: one TD error, distributed by eligibility.
//
// The trace records how recently and how often each state was visited,
// decaying at gamma*lambda per step. Applying today's error in
// proportion to it credits the states that led here, with no
// lookahead, no buffer and no episode boundary.
//
// Accumulating traces add 1 per visit and can grow without bound when
// a state is revisited quickly, which multiplies the effective step
// size and destabilizes runs that read as learning-rate problems.
// Replacing traces cap at 1 and are the safer default.
std::vector<double> TdLambda(const std::vector<Episode>& episodes, std::size_t n_states,
                             double gamma, double alpha, double lam, bool replacing = true,
                             double initial = 0.0) {
  std::vector<double> values(n_states, initial);

  for (const Episode& episode : episodes) {
    std::vector<double> traces(n_states, 0.0);

    for (const Transition& transition : episode) {
      const std::size_t state = static_cast<std::size_t>(transition.state);
      const double bootstrapped =
          transition.next_state == kTerminal
              ? 0.0
              : values[static_cast<std::size_t>(transition.next_state)];
      const double td_error = transition.reward + gamma * bootstrapped - values[state];

      traces[state] = replacing ? 1.0 : traces[state] + 1.0;

      // Every eligible state updated by the same error. O(|S|) per
      // step as written, which is why real implementations prune
      // traces below a cutoff -- the decay is geometric, so most of
      // these contribute nothing measurable.
      for (std::size_t index = 0; index < n_states; ++index) {
        if (traces[index] == 0.0) {
          continue;
        }
        values[index] += alpha * td_error * traces[index];
        traces[index] *= gamma * lam;
      }
    }
  }
  return values;
}

struct EquivalenceReport {
  double largest_gap;
  bool equivalent;
};

// The equivalence that justifies the trace mechanism.
//
// Offline -- with the value function held fixed for the whole episode
// -- the total update from the backward view equals the total update
// from the forward view. That is why a decaying memory of the past can
// implement an objective defined over the future.
//
// The equality is exact offline and approximate online, because the
// online version bootstraps off values that changed during the
// episode. True-online TD(lambda) with dutch traces restores
// exactness, and is what a serious implementation uses.
EquivalenceReport ForwardBackwardEquivalence(const Episode& episode, std::size_t n_states,
                                             double gamma, double alpha, double lam) {
  const std::vector<double> frozen(n_states, 0.0);

  std::vector<double> forward(n_states, 0.0);
  for (std::size_t index = 0; index < episode.size(); ++index) {
    const std::size_t state = static_cast<std::size_t>(episode[index].state);
    forward[state] += alpha * (LambdaReturn(episode, index, frozen, gamma, lam) - frozen[state]);
  }

  std::vector<double> backward(n_states, 0.0);
  std::vector<double> traces(n_states, 0.0);
  for (const Transition& transition : episode) {
    const std::size_t state = static_cast<std::size_t>(transition.state);
    const double bootstrapped =
        transition.next_state == kTerminal
            ? 0.0
            : frozen[static_cast<std::size_t>(transition.next_state)];
    const double td_error = transition.reward + gamma * bootstrapped - frozen[state];
    traces[state] += 1.0;

    for (std::size_t index = 0; index < n_states; ++index) {
      if (traces[index] == 0.0) {
        continue;
      }
      backward[index] += alpha * td_error * traces[index];
      traces[index] *= gamma * lam;
    }
  }

  double largest = 0.0;
  for (std::size_t index = 0; index < n_states; ++index) {
    largest = std::max(largest, std::abs(forward[index] - backward[index]));
  }
  return EquivalenceReport{largest, largest < 1e-9};
}

struct BatchComparison {
  double td_value_of_a;
  double mc_value_of_a;
  double value_of_b;
};

// The clearest statement of what bootstrapping actually does.
//
// The classic eight-episode example. State A appears once, followed
// immediately by B with reward 0; B appears eight times, with reward 1
// in six of them.
//
// Monte Carlo fits the observed returns: A was followed by a total of 0
// exactly once, so V(A) = 0. That is the least-squares answer and it is
// unarguable given the data as a flat collection of outcomes.
//
// TD uses the transition structure: A always goes to B, B is worth
// 0.75, so V(A) = 0.75. That is the value function of the
// maximum-likelihood Markov model of the same data.
//
// Both answer different questions, and TD's is the one you want
// exactly when the process really is Markov -- the entire argument for
// bootstrapping, stated in two numbers.
BatchComparison BatchTdVersusBatchMc(double gamma = 1.0, std::size_t sweeps = 500) {
  std::vector<Episode> episodes;
  episodes.push_back(Episode{{0, 0.0, 1}, {1, 1.0, kTerminal}});
  for (std::size_t index = 0; index < 5; ++index) {
    episodes.push_back(Episode{{1, 1.0, kTerminal}});
  }
  for (std::size_t index = 0; index < 2; ++index) {
    episodes.push_back(Episode{{1, 0.0, kTerminal}});
  }

  std::vector<double> td_values(2, 0.0);
  std::vector<double> mc_values(2, 0.0);

  for (std::size_t sweep = 0; sweep < sweeps; ++sweep) {
    for (const Episode& episode : episodes) {
      for (const Transition& transition : episode) {
        const std::size_t state = static_cast<std::size_t>(transition.state);
        const double bootstrapped =
            transition.next_state == kTerminal
                ? 0.0
                : td_values[static_cast<std::size_t>(transition.next_state)];
        td_values[state] += 0.01 * (transition.reward + gamma * bootstrapped - td_values[state]);
      }

      std::vector<double> returns(episode.size(), 0.0);
      double running = 0.0;
      for (std::size_t index = episode.size(); index-- > 0;) {
        running = episode[index].reward + gamma * running;
        returns[index] = running;
      }
      for (std::size_t index = 0; index < episode.size(); ++index) {
        const std::size_t state = static_cast<std::size_t>(episode[index].state);
        mc_values[state] += 0.01 * (returns[index] - mc_values[state]);
      }
    }
  }

  return BatchComparison{td_values[0], mc_values[0], td_values[1]};
}

struct AliasingReport {
  double td_value;
  double mc_value;
};

// Where the argument for bootstrapping reverses.
//
// One observation hides two underlying situations whose continuations
// differ. Monte Carlo averages the returns that actually occurred and
// is correct for the process as experienced. TD bootstraps off the
// aliased successor's estimate, which summarizes nothing, and
// converges to a value that is not the value of anything.
//
// The gap between the two is therefore a direct measurement of how
// non-Markov the state representation is -- worth running whenever the
// state was constructed rather than given.
AliasingReport AliasingDemo(std::size_t episode_count = 40000, double gamma = 0.9,
                            unsigned seed = 0) {
  std::mt19937 generator(seed);
  std::bernoulli_distribution coin(0.5);

  std::vector<Episode> episodes;
  episodes.reserve(episode_count);

  for (std::size_t index = 0; index < episode_count; ++index) {
    const double payoff = coin(generator) ? 1.0 : -1.0;
    episodes.push_back(Episode{{0, 0.0, 1}, {1, payoff, kTerminal}});
  }

  return AliasingReport{TdZero(episodes, 2, gamma, 0.01)[0],
                        MonteCarlo(episodes, 2, gamma, 0.01)[0]};
}

}  // namespace td
`,
        profile:
          'TD(0) is O(1) per step; TD(lambda) as written is O(|S|) per step because every trace decays whether or not it matters, and the forward-view lambda-return is O(T) per step and therefore O(T²) per episode — which is exactly why nobody computes it and the backward view exists. Illustrative, not a measured benchmark: the shape to notice is that the forward view is the definition and the backward view is the implementation, and they agree.',
      },
      'make-it-right': {
        rationale:
          'The step size becomes a type that reports whether it satisfies Robbins-Monro, because a decaying schedule converges and a constant one tracks, and a constant-alpha run described as converged is a category error that appears in most implementations. The trace type becomes an enum rather than a hidden increment, since accumulating traces can grow without bound on fast revisits and destabilize a run that reads as a learning-rate problem, while dutch traces make the online update exactly equal the offline one. The deadly triad becomes a precondition checked at construction rather than a paragraph in a comment: the three ingredients are individually standard, the combination diverges exponentially, and a configuration that knows which are present can refuse before the run instead of after. Failures throw specific types naming their cause — a lambda or discount outside range, a state index beyond the table, and a value magnitude that has left anything a bounded return could produce, which is a divergence detector rather than a sanity check because bootstrapping failures grow geometrically and catching one early is the difference between losing a step and losing a run. Traces move from a dense array swept every step to an active set above an explicit cutoff, which is stated as the approximation it is rather than presented as free. Everything the learner does not own arrives as a span, the special members are left to the compiler, and the diagnostic that catches the failure mode bootstrapping uniquely has — the gap against a Monte Carlo estimate on the same episodes — is a function rather than advice.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'std::span for non-owning views',
          'const-correctness on parameters and members',
          'RAII for every owned resource',
          'Rule of zero — let the compiler generate special members',
        ],
        code: `// TD learning with the choices that change the answer made explicit.
//
// Four things the literal version decided silently:
//
//   * whether the step size decays, which decides whether the run
//     converges or merely tracks -- and most implementations call the
//     second one "converged";
//   * which trace type is in use, where accumulating traces can
//     diverge on their own through fast revisits;
//   * whether all three deadly-triad ingredients are present, which is
//     the difference between slow learning and exponential divergence;
//   * where to stop decaying traces, which is an approximation rather
//     than an optimization and should be stated.
//
// Each becomes a named type or a thrown exception. The diagnostic that
// matters most -- the gap between the bootstrapped and Monte Carlo
// estimates, which measures how non-Markov the state is -- is a
// function rather than a paragraph.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace td {

constexpr int kTerminal = -1;

class TemporalDifferenceError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

class InvalidSchedule : public TemporalDifferenceError {
 public:
  using TemporalDifferenceError::TemporalDifferenceError;
};

// Thrown rather than allowed to continue: deadly-triad failures grow
// geometrically, so by the time a value function is visibly absurd it
// has usually been diverging for thousands of steps, and no step size
// recovers it.
class Divergence : public TemporalDifferenceError {
 public:
  using TemporalDifferenceError::TemporalDifferenceError;
};

// Bootstrapping, function approximation and off-policy updates.
// Individually standard; together they can diverge rather than
// converge slowly. Any two are safe, which is exactly why this
// configuration is reached by accident and then debugged as a
// learning-rate problem.
class DeadlyTriad : public TemporalDifferenceError {
 public:
  using TemporalDifferenceError::TemporalDifferenceError;
};

// How a revisit affects eligibility.
//
// kAccumulating adds one and can grow without bound on fast revisits,
// multiplying the effective step size. kReplacing caps at one and is
// the safe default. kDutch makes the online update exactly equal the
// offline one -- true-online TD(lambda).
enum class TraceType { kAccumulating, kReplacing, kDutch };

// Alpha over time, with the guarantee it does or does not carry.
class StepSizeSchedule {
 public:
  StepSizeSchedule(double initial, double decay_exponent)
      : initial_(initial), decay_exponent_(decay_exponent) {
    if (!(initial_ > 0.0) || initial_ > 1.0) {
      throw InvalidSchedule("initial step size must lie in (0, 1]");
    }
    if (decay_exponent_ < 0.0 || decay_exponent_ > 1.0) {
      throw InvalidSchedule("decay exponent must lie in [0, 1]");
    }
  }

  double At(std::size_t visits) const noexcept {
    if (decay_exponent_ == 0.0) {
      return initial_;
    }
    return initial_ / std::pow(static_cast<double>(std::max<std::size_t>(visits, 1)),
                               decay_exponent_);
  }

  // Whether this schedule converges, or only tracks.
  //
  // Exposed rather than documented: a run reported as converged under
  // a constant step size is describing something with no fixed point.
  bool SatisfiesRobbinsMonro() const noexcept {
    return decay_exponent_ > 0.5 && decay_exponent_ <= 1.0;
  }

 private:
  double initial_;
  double decay_exponent_;
};

// Everything that changes what the run computes, validated once.
class LearnerConfig {
 public:
  LearnerConfig(double gamma, double lam, StepSizeSchedule schedule,
                TraceType trace_type = TraceType::kReplacing, double trace_cutoff = 1e-4,
                bool uses_function_approximation = false, bool is_off_policy = false)
      : gamma_(gamma),
        lam_(lam),
        schedule_(schedule),
        trace_type_(trace_type),
        trace_cutoff_(trace_cutoff),
        uses_function_approximation_(uses_function_approximation),
        is_off_policy_(is_off_policy) {
    // Every check is arithmetic on values already in hand, so it runs
    // before the learner allocates anything.
    if (gamma_ < 0.0 || gamma_ > 1.0) {
      throw InvalidSchedule("gamma must lie in [0, 1]");
    }
    if (lam_ < 0.0 || lam_ > 1.0) {
      throw InvalidSchedule("lambda must lie in [0, 1]");
    }
    if (!(trace_cutoff_ > 0.0)) {
      throw InvalidSchedule("trace cutoff must be positive");
    }

    // Bootstrapping is present whenever lambda < 1: at lambda = 1 the
    // method is Monte Carlo and the triad does not apply.
    const bool bootstraps = lam_ < 1.0;
    if (bootstraps && uses_function_approximation_ && is_off_policy_) {
      throw DeadlyTriad(
          "bootstrapping, function approximation and off-policy updates together can "
          "diverge exponentially. Remove one: raise lambda to 1, use a table, or sample "
          "on-policy -- no step size fixes this combination");
    }
  }

  double gamma() const noexcept { return gamma_; }
  double lam() const noexcept { return lam_; }
  TraceType trace_type() const noexcept { return trace_type_; }
  double trace_cutoff() const noexcept { return trace_cutoff_; }
  const StepSizeSchedule& schedule() const noexcept { return schedule_; }

  // gamma * lambda. Worth naming, because lowering the discount
  // silently shortens credit assignment as well as the horizon.
  double TraceDecay() const noexcept { return gamma_ * lam_; }

  // Roughly how many steps back a TD error is still felt.
  double EffectiveCreditHorizon() const noexcept {
    const double decay = TraceDecay();
    return decay >= 1.0 ? std::numeric_limits<double>::infinity() : 1.0 / (1.0 - decay);
  }

 private:
  double gamma_;
  double lam_;
  StepSizeSchedule schedule_;
  TraceType trace_type_;
  double trace_cutoff_;
  bool uses_function_approximation_;
  bool is_off_policy_;
};

// The values, plus whether to believe them.
struct LearningReport {
  std::vector<double> values;
  std::vector<std::size_t> visits;
  double mean_td_error{};
  bool converges{};
  std::size_t active_traces{};
};

// Tabular TD(lambda) with pruned traces.
//
// Traces are held as the set of states whose eligibility is still above
// the cutoff, rather than as a dense array swept every step. The dense
// form is O(|S|) per step for contributions that are numerically zero;
// this is O(k) for a k that stays small because the decay is
// geometric.
class TdLambdaLearner {
 public:
  TdLambdaLearner(std::size_t n_states, LearnerConfig config)
      : config_(std::move(config)), values_(n_states, 0.0), visits_(n_states, 0) {
    if (n_states == 0) {
      throw TemporalDifferenceError("n_states must be positive");
    }
  }

  // Traces do not survive a terminal state.
  //
  // Carrying them across an episode boundary credits the new episode's
  // first reward to the previous episode's states -- silent, and a
  // surprisingly common bug.
  void BeginEpisode() noexcept { traces_.clear(); }

  // One transition. Returns the TD error, which is the diagnostic.
  double Step(int state, double reward, int next_state) {
    if (state < 0 || static_cast<std::size_t>(state) >= values_.size()) {
      throw TemporalDifferenceError("state " + std::to_string(state) + " outside the table");
    }
    if (next_state != kTerminal &&
        (next_state < 0 || static_cast<std::size_t>(next_state) >= values_.size())) {
      throw TemporalDifferenceError("next state outside the table");
    }

    const std::size_t index = static_cast<std::size_t>(state);
    const double bootstrapped =
        next_state == kTerminal ? 0.0 : values_[static_cast<std::size_t>(next_state)];
    const double td_error = reward + config_.gamma() * bootstrapped - values_[index];

    ++visits_[index];
    const double alpha = config_.schedule().At(visits_[index]);

    const double current = traces_.count(index) ? traces_[index] : 0.0;
    switch (config_.trace_type()) {
      case TraceType::kAccumulating:
        traces_[index] = current + 1.0;
        break;
      case TraceType::kReplacing:
        traces_[index] = 1.0;
        break;
      case TraceType::kDutch:
        // The form that makes the online update exactly equal the
        // offline lambda-return update.
        traces_[index] = (1.0 - alpha) * current + 1.0;
        break;
    }

    const double decay = config_.TraceDecay();
    const double cutoff = config_.trace_cutoff();

    for (auto iterator = traces_.begin(); iterator != traces_.end();) {
      values_[iterator->first] += alpha * td_error * iterator->second;
      iterator->second *= decay;

      if (iterator->second < cutoff) {
        iterator = traces_.erase(iterator);
      } else {
        ++iterator;
      }
    }

    td_error_sum_ += td_error;
    ++steps_;

    // Divergence grows geometrically, so catching it early is the
    // difference between losing a step and losing a run.
    const double largest =
        *std::max_element(values_.begin(), values_.end(),
                          [](double a, double b) { return std::abs(a) < std::abs(b); });
    if (!std::isfinite(largest) || std::abs(largest) > 1e12) {
      throw Divergence(
          "value magnitude left any plausible range; with bootstrapping this grows "
          "geometrically, so check the trace type and the triad before the step size");
    }
    return td_error;
  }

  LearningReport Report() const {
    return LearningReport{values_, visits_,
                          // Should sit near zero once converged. A
                          // sustained departure means the dynamics
                          // moved, not that learning is incomplete.
                          td_error_sum_ / static_cast<double>(std::max<std::size_t>(steps_, 1)),
                          config_.schedule().SatisfiesRobbinsMonro(), traces_.size()};
  }

 private:
  LearnerConfig config_;
  std::vector<double> values_;
  std::vector<std::size_t> visits_;
  std::unordered_map<std::size_t, double> traces_;
  double td_error_sum_ = 0.0;
  std::size_t steps_ = 0;
};

struct Transition {
  int state{};
  double reward{};
  int next_state{};
};

// How much the state representation is hiding.
//
// TD bootstraps off the successor's estimate and is biased when that
// estimate summarizes nothing; Monte Carlo averages realized returns
// and is not. The gap between them on the same episodes is therefore a
// direct measurement of the aliasing -- the one diagnostic that catches
// the failure mode bootstrapping has and Monte Carlo does not.
struct MarkovGap {
  std::vector<double> td_values;
  std::vector<double> mc_values;
  double largest_gap{};
  std::size_t worst_state{};
};

MarkovGap MeasureMarkovGap(std::span<const std::span<const Transition>> episodes,
                           std::size_t n_states, double gamma, double alpha) {
  if (episodes.empty()) {
    throw TemporalDifferenceError("no episodes");
  }

  std::vector<double> td_values(n_states, 0.0);
  std::vector<double> mc_values(n_states, 0.0);
  std::vector<double> returns;

  for (const std::span<const Transition>& episode : episodes) {
    for (const Transition& transition : episode) {
      const std::size_t state = static_cast<std::size_t>(transition.state);
      const double bootstrapped =
          transition.next_state == kTerminal
              ? 0.0
              : td_values[static_cast<std::size_t>(transition.next_state)];
      td_values[state] += alpha * (transition.reward + gamma * bootstrapped - td_values[state]);
    }

    returns.assign(episode.size(), 0.0);
    double running = 0.0;
    for (std::size_t index = episode.size(); index-- > 0;) {
      running = episode[index].reward + gamma * running;
      returns[index] = running;
    }
    for (std::size_t index = 0; index < episode.size(); ++index) {
      const std::size_t state = static_cast<std::size_t>(episode[index].state);
      mc_values[state] += alpha * (returns[index] - mc_values[state]);
    }
  }

  double largest = 0.0;
  std::size_t worst = 0;
  for (std::size_t index = 0; index < n_states; ++index) {
    const double gap = std::abs(td_values[index] - mc_values[index]);
    if (gap > largest) {
      largest = gap;
      worst = index;
    }
  }
  return MarkovGap{std::move(td_values), std::move(mc_values), largest, worst};
}

}  // namespace td
`,
        profile:
          'TD(0) remains O(1) per step; TD(lambda) drops from O(|S|) to O(k) per step, where k is the number of traces still above the cutoff and stays small because the decay is geometric — at gamma-lambda 0.9 with a 1e-4 cutoff that is roughly ninety states regardless of table size. Illustrative, not a measured benchmark: the substantive change is that a diverging value function, a deadly-triad configuration and an out-of-range lambda are failures raised rather than absorbed, and the report distinguishes a run that converged from one that is tracking.',
      },
      'make-it-fast': {
        rationale:
          'The tabular form is not where this method runs, so the fast stage moves to linear function approximation over sparse features — which is what makes TD(lambda) usable at scale and also what puts two of the three deadly-triad ingredients on the table at once. Eligibility becomes a vector over features rather than states, and because tile-coded or hashed features activate only a handful of components per observation, the trace is sparse and stays sparse: it is kept as parallel index and value arrays with a slot map, so decaying it is O(k) over the components still above cutoff rather than O(d) over all of them. The update then fuses — the TD error from two sparse dot products, then the weight change and the trace decay in one pass over the active set — so no dense trace vector is ever written or read, which at a feature dimension in the millions is the difference between feasible and not. Restrict qualifiers on the gather and scatter let those loops vectorize, since the compiler must otherwise assume the weight vector and the trace values may alias. True-online dutch traces replace the approximate online update for one extra scalar per step, making the online weight sequence exactly match the offline lambda-return result rather than matching it only as the step size vanishes. For offline batch evaluation the incremental form is replaced by least-squares TD, which accumulates the two matrices defining the fixed point and solves once — extracting everything from each sample rather than one gradient step, at O(d²) memory and an O(d³) solve that rules it out at the dimensions the sparse form was chosen for.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Active trace components live in parallel index and value arrays that are compacted in place, so the gather and the decay both stream instead of striding a dense vector',
            tradeoff: 'Compaction reorders the active set, so trace positions are not stable across steps and anything holding a position must re-look it up',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Weight update, trace decay and pruning run in one pass over the active set, so no dense trace vector is materialized',
            tradeoff: 'The per-component trace values are gone after the pass, and they are exactly what a diagnostic wants when credit assignment looks wrong',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The sparse gather and the scatter-add vectorize only once the weight vector and the trace values are known not to overlap',
            tradeoff: 'The guarantee is unchecked: overlapping buffers compile cleanly and corrupt the weights at run time with nothing to catch it',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Least-squares TD accumulates its outer products and solves its system through BLAS rather than a hand-written loop',
            tradeoff: 'Adds a dependency for a code path that only applies at small feature dimensions, so the sparse incremental learner carries it without using it',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The active-set passes are short contiguous loops over doubles, which the vectorizer handles well once aliasing is ruled out',
            tradeoff: 'The binary stops being portable across machine generations, and floating-point contraction can shift the last digits of a weight between build targets',
          },
        ],
        code: `// TD(lambda) with linear function approximation and sparse traces.
//
// This is where the method actually runs, and also where two of the
// three deadly-triad ingredients arrive together -- so the off-policy
// question stops being theoretical.
//
// Three changes carry the weight:
//
//   1. traces live over FEATURES, not states, and are kept as an
//      active set rather than a dense vector, because tile-coded and
//      hashed features activate a handful of components and the trace
//      decays geometrically;
//   2. the update fuses the weight change and the trace decay into one
//      pass over that active set;
//   3. true-online dutch traces make the online update exactly equal
//      the offline one, for one extra scalar per step.
//
// What none of this changes: the bias from bootstrapping, and the
// requirement that the state be Markov. A faster wrong answer is still
// wrong.
//
// Build: -O3 -march=native

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <unordered_map>
#include <vector>

extern "C" {
void dgesv_(const int* n, const int* nrhs, double* a, const int* lda, int* ipiv, double* b,
            const int* ldb, int* info);
}

namespace td {

struct LinearConfig {
  std::size_t n_features{};
  double gamma{};
  double lam{};
  double alpha{};
  double trace_cutoff{1e-4};
};

// Eligibility over features, as an active set.
//
// A dense trace is O(d) per step to decay, and almost all of those
// components are numerically zero because the decay is geometric -- at
// gamma*lambda of 0.9 a component falls below 1e-4 in under a hundred
// steps regardless of how large d is.
//
// Parallel index and value arrays keep both the decay and the update
// O(k), and the slot map turns re-activation into one lookup instead
// of a scan.
class SparseTrace {
 public:
  explicit SparseTrace(std::size_t capacity)
      : indices_(capacity, 0), values_(capacity, 0.0) {}

  // Traces do not survive a terminal state. Carrying them across an
  // episode boundary credits the next episode's first reward to the
  // previous episode's features -- silent, and common.
  void Clear() noexcept {
    size_ = 0;
    slot_.clear();
  }

  void Bump(std::int32_t feature, double increment, double dutch_factor) {
    const auto found = slot_.find(feature);
    if (found != slot_.end()) {
      // Dutch trace: the form that makes the online update exactly
      // equal the offline one.
      values_[found->second] = dutch_factor * values_[found->second] + increment;
      return;
    }
    if (size_ >= indices_.size()) {
      throw std::runtime_error("trace capacity exceeded; raise the cutoff or the capacity");
    }

    indices_[size_] = feature;
    values_[size_] = increment;
    slot_[feature] = size_;
    ++size_;
  }

  std::span<const std::int32_t> indices() const noexcept {
    return std::span<const std::int32_t>(indices_).first(size_);
  }

  std::span<const double> values() const noexcept {
    return std::span<const double>(values_).first(size_);
  }

  // One pass: scale, drop the negligible, compact.
  //
  // Compacting in place rather than rebuilding keeps the arrays
  // contiguous, which is what makes the next step's gather stream.
  void DecayAndPrune(double decay, double cutoff) {
    std::size_t write = 0;
    for (std::size_t read = 0; read < size_; ++read) {
      const double scaled = values_[read] * decay;
      if (scaled < cutoff) {
        slot_.erase(indices_[read]);
        continue;
      }
      indices_[write] = indices_[read];
      values_[write] = scaled;
      slot_[indices_[write]] = write;
      ++write;
    }
    size_ = write;
  }

  std::size_t size() const noexcept { return size_; }

 private:
  std::vector<std::int32_t> indices_;
  std::vector<double> values_;
  std::unordered_map<std::int32_t, std::size_t> slot_;
  std::size_t size_ = 0;
};

// Sparse dot product over the active features.
//
// restrict on every pointer is what makes this vectorize: the compiler
// must otherwise assume the weight vector and the activations may
// overlap and emits a scalar loop. The guarantee is unchecked, so
// overlapping buffers corrupt the value silently.
inline double SparseDot(const double* __restrict__ weights,
                        const std::int32_t* __restrict__ features,
                        const double* __restrict__ activations, std::size_t count) noexcept {
  double total = 0.0;
  for (std::size_t index = 0; index < count; ++index) {
    total += weights[static_cast<std::size_t>(features[index])] * activations[index];
  }
  return total;
}

// Linear TD(lambda), dutch traces, sparse features.
//
// True-online rather than conventional: the correction costs one
// scalar per step and makes the online weight sequence exactly match
// what the offline lambda-return update would produce. The
// conventional form only matches in the limit of a vanishing step
// size, which is not the regime anyone runs in.
class TrueOnlineTdLambda {
 public:
  TrueOnlineTdLambda(LinearConfig config, std::size_t trace_capacity)
      : config_(config), weights_(config.n_features, 0.0), trace_(trace_capacity) {
    if (config_.gamma < 0.0 || config_.gamma > 1.0 || config_.lam < 0.0 || config_.lam > 1.0) {
      throw std::invalid_argument("gamma and lambda must lie in [0, 1]");
    }
  }

  double Value(std::span<const std::int32_t> features,
               std::span<const double> activations) const noexcept {
    return SparseDot(weights_.data(), features.data(), activations.data(), features.size());
  }

  void BeginEpisode() noexcept {
    trace_.Clear();
    previous_value_ = 0.0;
  }

  // One transition. Everything is O(k) in the active set.
  double Step(std::span<const std::int32_t> features, std::span<const double> activations,
              double reward, std::span<const std::int32_t> next_features,
              std::span<const double> next_activations, bool terminal) {
    const double alpha = config_.alpha;

    const double current_value = Value(features, activations);
    const double next_value = terminal ? 0.0 : Value(next_features, next_activations);
    const double td_error = reward + config_.gamma * next_value - current_value;

    // Dutch-trace factor: 1 - alpha * (x . e), from the active set.
    double overlap = 0.0;
    const std::span<const std::int32_t> active_indices = trace_.indices();
    const std::span<const double> active_values = trace_.values();

    for (std::size_t position = 0; position < features.size(); ++position) {
      for (std::size_t slot = 0; slot < active_indices.size(); ++slot) {
        if (active_indices[slot] == features[position]) {
          overlap += activations[position] * active_values[slot];
          break;
        }
      }
    }
    const double dutch_factor = 1.0 - alpha * overlap;

    for (std::size_t position = 0; position < features.size(); ++position) {
      trace_.Bump(features[position], activations[position], dutch_factor);
    }

    // The fused pass: weight update, then decay and prune, over the
    // active set only. No dense trace vector is ever written.
    const std::span<const std::int32_t> eligible = trace_.indices();
    const std::span<const double> eligibility = trace_.values();
    double* __restrict__ weights = weights_.data();

    for (std::size_t slot = 0; slot < eligible.size(); ++slot) {
      weights[static_cast<std::size_t>(eligible[slot])] += alpha * td_error * eligibility[slot];
    }

    // True-online correction: the term that makes this exact rather
    // than asymptotic.
    const double correction = alpha * (current_value - previous_value_);
    for (std::size_t position = 0; position < features.size(); ++position) {
      weights[static_cast<std::size_t>(features[position])] -= correction * activations[position];
    }

    previous_value_ = next_value;
    trace_.DecayAndPrune(config_.gamma * config_.lam, config_.trace_cutoff);
    return td_error;
  }

  std::span<const double> weights() const noexcept { return weights_; }

 private:
  LinearConfig config_;
  std::vector<double> weights_;
  SparseTrace trace_;
  double previous_value_ = 0.0;
};

// Batch TD as a single linear solve.
//
// The TD fixed point under linear approximation is defined by A w = b,
//
//     A = sum_t x_t (x_t - gamma x_{t+1})^T,    b = sum_t r_t x_t
//
// Accumulating those and solving once uses every transition maximally,
// where incremental TD extracts one gradient step from each and
// discards it. On a fixed batch this reaches the same fixed point in
// one pass rather than thousands.
//
// The cost is why it is not the default: O(d^2) memory and an O(d^3)
// solve, which rules it out at exactly the feature dimensions that
// make the sparse incremental form attractive.
class LeastSquaresTd {
 public:
  LeastSquaresTd(std::size_t n_features, double gamma, double regularization = 1e-6)
      : n_features_(n_features), gamma_(gamma), a_(n_features * n_features, 0.0),
        b_(n_features, 0.0) {
    for (std::size_t index = 0; index < n_features_; ++index) {
      a_[index * n_features_ + index] = regularization;
    }
  }

  // Dense on purpose: this method is chosen when d is small enough for
  // a d-by-d matrix, and at that size the dense form beats any sparse
  // bookkeeping.
  void Accumulate(std::span<const double> features, double reward,
                  std::span<const double> next_features) {
    if (features.size() != n_features_ || next_features.size() != n_features_) {
      throw std::invalid_argument("feature vectors do not match the stated dimension");
    }

    for (std::size_t row = 0; row < n_features_; ++row) {
      b_[row] += reward * features[row];
      const double left = features[row];
      if (left == 0.0) {
        continue;
      }
      for (std::size_t column = 0; column < n_features_; ++column) {
        a_[row * n_features_ + column] +=
            left * (features[column] - gamma_ * next_features[column]);
      }
    }
  }

  // One solve rather than thousands of gradient steps.
  //
  // dgesv rather than an explicit inverse: A is not symmetric here and
  // can be badly conditioned when features are correlated, and forming
  // an inverse makes both worse for no benefit.
  std::vector<double> Solve() {
    const int n = static_cast<int>(n_features_);
    const int nrhs = 1;
    int info = 0;
    std::vector<int> pivots(n_features_, 0);

    std::vector<double> a_copy = a_;
    std::vector<double> solution = b_;
    dgesv_(&n, &nrhs, a_copy.data(), &n, pivots.data(), solution.data(), &n, &info);

    if (info != 0) {
      throw std::runtime_error(
          "the LSTD system is singular; correlated or redundant features make A "
          "rank-deficient, so either regularize more or drop the duplicates");
    }
    return solution;
  }

 private:
  std::size_t n_features_;
  double gamma_;
  std::vector<double> a_;
  std::vector<double> b_;
};

// How many features can be eligible at once, from the decay rate.
//
// Geometric decay bounds this: a component falls below the cutoff
// after log(cutoff)/log(gamma*lambda) steps, and at most per_step
// features activate each step. Sizing the buffer from that rather than
// guessing is what lets the hot path allocate nothing.
std::size_t TraceCapacityFor(double gamma, double lam, double cutoff, std::size_t per_step) {
  const double decay = gamma * lam;
  if (decay <= 0.0) {
    return per_step;
  }
  if (decay >= 1.0) {
    throw std::invalid_argument(
        "gamma*lambda >= 1 means traces never decay; no finite capacity exists");
  }
  return static_cast<std::size_t>(std::ceil(std::log(cutoff) / std::log(decay))) * per_step;
}

}  // namespace td
`,
        profile:
          'Per step: two sparse dot products at O(k_features), one fused scatter and decay at O(k_trace), where k_trace is bounded by log(cutoff)/log(gamma·lambda) times the features active per step — roughly ninety at gamma-lambda 0.9 and a 1e-4 cutoff, independent of the feature dimension. LSTD is O(d²) per accumulation and O(d³) once. Illustrative, not a measured benchmark: the trade worth seeing is that the sparse incremental form scales to millions of features and extracts one step from each sample, while LSTD extracts everything from each sample and stops scaling at a few thousand.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Temporal-difference learning, transcribed from the objective.
//!
//! No library. The one substitution that defines the method:
//!
//!     target = R + gamma * V(S')     instead of     target = G_t
//!
//! Four things to read for.
//!
//! 1. \`td_zero\` and \`monte_carlo\` differ in exactly one line.
//!    Everything said about bias, variance, online learning and the
//!    Markov property follows from that line and nothing else.
//!
//! 2. \`lambda_return\` is the forward view and \`td_lambda\` is the
//!    backward view. \`forward_backward_equivalence\` checks numerically
//!    that they produce the same total update offline -- the whole
//!    reason the trace mechanism exists, since the forward view refers
//!    to the future and cannot be computed online.
//!
//! 3. \`batch_td_versus_batch_mc\` is the sharpest statement of what
//!    bootstrapping does: identical data, two different answers. Monte
//!    Carlo fits the observed returns; TD fits the maximum-likelihood
//!    Markov model.
//!
//! 4. \`aliasing_demo\` is the same comparison with the Markov property
//!    removed, where the sign of the argument flips.

pub const TERMINAL: i32 = -1;

pub struct Transition {
    pub state: i32,
    pub reward: f64,
    pub next_state: i32,
}

pub type Episode = Vec<Transition>;

/// A deterministic generator, so a run reproduces across processes.
pub struct Lcg {
    state: u64,
}

impl Lcg {
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self {
            state: seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1),
        }
    }

    pub fn next_uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        ((self.state >> 11) as f64) / ((1_u64 << 53) as f64)
    }
}

/// One-step bootstrapping. The whole method is the target line.
///
/// Note what does NOT appear: any reference to the end of the episode.
/// The update exists at every step, which is what makes this usable on
/// a process that never terminates -- the property Monte Carlo cannot
/// match at any sample size.
#[must_use]
pub fn td_zero(episodes: &[Episode], n_states: usize, gamma: f64, alpha: f64) -> Vec<f64> {
    let mut values = vec![0.0_f64; n_states];

    for episode in episodes {
        for transition in episode {
            // The target contains V. That is bootstrapping, and every
            // property of the method comes from it: the variance
            // collapses because the target is one reward plus a
            // lookup, and the bias appears because that lookup is
            // wrong early and its error propagates backwards.
            let bootstrapped = if transition.next_state == TERMINAL {
                0.0
            } else {
                values[transition.next_state as usize]
            };
            let state = transition.state as usize;
            let td_error = transition.reward + gamma * bootstrapped - values[state];
            values[state] += alpha * td_error;
        }
    }
    values
}

/// The same loop with the realized return as the target.
///
/// Read against \`td_zero\` above: one line differs. This one waits for
/// the episode to end, which is both why it is unbiased and why it
/// cannot run on a continuing task.
#[must_use]
pub fn monte_carlo(episodes: &[Episode], n_states: usize, gamma: f64, alpha: f64) -> Vec<f64> {
    let mut values = vec![0.0_f64; n_states];

    for episode in episodes {
        let mut returns = vec![0.0_f64; episode.len()];
        let mut running = 0.0;
        for index in (0..episode.len()).rev() {
            running = episode[index].reward + gamma * running;
            returns[index] = running;
        }

        for (index, transition) in episode.iter().enumerate() {
            let state = transition.state as usize;
            values[state] += alpha * (returns[index] - values[state]);
        }
    }
    values
}

/// n real rewards, then bootstrap.
///
/// The discrete version of the dial: n = 1 is TD(0), n at or beyond the
/// episode length is Monte Carlo, and the useful values are in between
/// -- which is the observation lambda then makes continuous.
#[must_use]
pub fn n_step_return(
    episode: &[Transition],
    start: usize,
    n: usize,
    values: &[f64],
    gamma: f64,
) -> f64 {
    let mut total = 0.0_f64;
    let mut discount = 1.0_f64;

    for offset in 0..n {
        let index = start + offset;
        if index >= episode.len() {
            return total; // ran off the end: this IS the full return
        }
        total += discount * episode[index].reward;
        discount *= gamma;

        if episode[index].next_state == TERMINAL {
            return total;
        }
    }

    let landing = episode[start + n - 1].next_state as usize;
    total + discount * values[landing]
}

/// The forward view: a geometric average over every n-step return.
///
///     G^lambda = (1 - lambda) * sum_n lambda^(n-1) * G^(n)
///
/// This is the target the method is actually trying to hit, and it
/// cannot be computed online because it refers to the whole remaining
/// episode. The trace mechanism exists entirely to produce the same
/// updates without ever forming this quantity.
#[must_use]
pub fn lambda_return(
    episode: &[Transition],
    start: usize,
    values: &[f64],
    gamma: f64,
    lam: f64,
) -> f64 {
    let horizon = episode.len() - start;
    let mut total = 0.0_f64;
    let mut weight = 1.0 - lam;

    for n in 1..horizon {
        total += weight * n_step_return(episode, start, n, values, gamma);
        weight *= lam;
    }

    total + lam.powi((horizon - 1) as i32) * n_step_return(episode, start, horizon, values, gamma)
}

/// The backward view: one TD error, distributed by eligibility.
///
/// The trace records how recently and how often each state was
/// visited, decaying at gamma*lambda per step. Applying today's error
/// in proportion to it credits the states that led here, with no
/// lookahead, no buffer and no episode boundary.
///
/// Accumulating traces add 1 per visit and can grow without bound when
/// a state is revisited quickly, which multiplies the effective step
/// size and destabilizes runs that read as learning-rate problems.
/// Replacing traces cap at 1 and are the safer default.
#[must_use]
pub fn td_lambda(
    episodes: &[Episode],
    n_states: usize,
    gamma: f64,
    alpha: f64,
    lam: f64,
    replacing: bool,
) -> Vec<f64> {
    let mut values = vec![0.0_f64; n_states];

    for episode in episodes {
        let mut traces = vec![0.0_f64; n_states];

        for transition in episode {
            let state = transition.state as usize;
            let bootstrapped = if transition.next_state == TERMINAL {
                0.0
            } else {
                values[transition.next_state as usize]
            };
            let td_error = transition.reward + gamma * bootstrapped - values[state];

            traces[state] = if replacing { 1.0 } else { traces[state] + 1.0 };

            // Every eligible state updated by the same error. O(|S|)
            // per step as written, which is why real implementations
            // prune traces below a cutoff -- the decay is geometric,
            // so most of these contribute nothing measurable.
            for index in 0..n_states {
                if traces[index] == 0.0 {
                    continue;
                }
                values[index] += alpha * td_error * traces[index];
                traces[index] *= gamma * lam;
            }
        }
    }
    values
}

pub struct EquivalenceReport {
    pub largest_gap: f64,
    pub equivalent: bool,
}

/// The equivalence that justifies the trace mechanism.
///
/// Offline -- with the value function held fixed for the whole episode
/// -- the total update from the backward view equals the total update
/// from the forward view. That is why a decaying memory of the past can
/// implement an objective defined over the future.
///
/// The equality is exact offline and approximate online, because the
/// online version bootstraps off values that changed during the
/// episode. True-online TD(lambda) with dutch traces restores
/// exactness, and is what a serious implementation uses.
#[must_use]
pub fn forward_backward_equivalence(
    episode: &[Transition],
    n_states: usize,
    gamma: f64,
    alpha: f64,
    lam: f64,
) -> EquivalenceReport {
    let frozen = vec![0.0_f64; n_states];

    let mut forward = vec![0.0_f64; n_states];
    for index in 0..episode.len() {
        let state = episode[index].state as usize;
        forward[state] += alpha * (lambda_return(episode, index, &frozen, gamma, lam) - frozen[state]);
    }

    let mut backward = vec![0.0_f64; n_states];
    let mut traces = vec![0.0_f64; n_states];

    for transition in episode {
        let state = transition.state as usize;
        let bootstrapped = if transition.next_state == TERMINAL {
            0.0
        } else {
            frozen[transition.next_state as usize]
        };
        let td_error = transition.reward + gamma * bootstrapped - frozen[state];
        traces[state] += 1.0;

        for index in 0..n_states {
            if traces[index] == 0.0 {
                continue;
            }
            backward[index] += alpha * td_error * traces[index];
            traces[index] *= gamma * lam;
        }
    }

    let largest = forward
        .iter()
        .zip(&backward)
        .map(|(f, b)| (f - b).abs())
        .fold(0.0, f64::max);

    EquivalenceReport {
        largest_gap: largest,
        equivalent: largest < 1e-9,
    }
}

pub struct BatchComparison {
    pub td_value_of_a: f64,
    pub mc_value_of_a: f64,
    pub value_of_b: f64,
}

/// The clearest statement of what bootstrapping actually does.
///
/// The classic eight-episode example. State A appears once, followed
/// immediately by B with reward 0; B appears eight times, with reward 1
/// in six of them.
///
/// Monte Carlo fits the observed returns: A was followed by a total of
/// 0 exactly once, so V(A) = 0. That is the least-squares answer and it
/// is unarguable given the data as a flat collection of outcomes.
///
/// TD uses the transition structure: A always goes to B, B is worth
/// 0.75, so V(A) = 0.75. That is the value function of the
/// maximum-likelihood Markov model of the same data.
///
/// Both answer different questions, and TD's is the one you want
/// exactly when the process really is Markov -- the entire argument for
/// bootstrapping, in two numbers.
#[must_use]
pub fn batch_td_versus_batch_mc(gamma: f64, sweeps: usize) -> BatchComparison {
    let mut episodes: Vec<Episode> = vec![vec![
        Transition {
            state: 0,
            reward: 0.0,
            next_state: 1,
        },
        Transition {
            state: 1,
            reward: 1.0,
            next_state: TERMINAL,
        },
    ]];

    for _ in 0..5 {
        episodes.push(vec![Transition {
            state: 1,
            reward: 1.0,
            next_state: TERMINAL,
        }]);
    }
    for _ in 0..2 {
        episodes.push(vec![Transition {
            state: 1,
            reward: 0.0,
            next_state: TERMINAL,
        }]);
    }

    let mut td_values = vec![0.0_f64; 2];
    let mut mc_values = vec![0.0_f64; 2];

    for _ in 0..sweeps {
        for episode in &episodes {
            for transition in episode {
                let state = transition.state as usize;
                let bootstrapped = if transition.next_state == TERMINAL {
                    0.0
                } else {
                    td_values[transition.next_state as usize]
                };
                td_values[state] += 0.01 * (transition.reward + gamma * bootstrapped - td_values[state]);
            }

            let mut returns = vec![0.0_f64; episode.len()];
            let mut running = 0.0;
            for index in (0..episode.len()).rev() {
                running = episode[index].reward + gamma * running;
                returns[index] = running;
            }
            for (index, transition) in episode.iter().enumerate() {
                let state = transition.state as usize;
                mc_values[state] += 0.01 * (returns[index] - mc_values[state]);
            }
        }
    }

    BatchComparison {
        td_value_of_a: td_values[0],
        mc_value_of_a: mc_values[0],
        value_of_b: td_values[1],
    }
}

pub struct AliasingReport {
    pub td_value: f64,
    pub mc_value: f64,
}

/// Where the argument for bootstrapping reverses.
///
/// One observation hides two underlying situations whose continuations
/// differ. Monte Carlo averages the returns that actually occurred and
/// is correct for the process as experienced. TD bootstraps off the
/// aliased successor's estimate, which summarizes nothing, and
/// converges to a value that is not the value of anything.
///
/// The gap between the two is therefore a direct measurement of how
/// non-Markov the state representation is -- worth running whenever the
/// state was constructed rather than given.
#[must_use]
pub fn aliasing_demo(episode_count: usize, gamma: f64, seed: u64) -> AliasingReport {
    let mut rng = Lcg::new(seed);
    let mut episodes = Vec::with_capacity(episode_count);

    for _ in 0..episode_count {
        let payoff = if rng.next_uniform() < 0.5 { 1.0 } else { -1.0 };
        episodes.push(vec![
            Transition {
                state: 0,
                reward: 0.0,
                next_state: 1,
            },
            Transition {
                state: 1,
                reward: payoff,
                next_state: TERMINAL,
            },
        ]);
    }

    AliasingReport {
        td_value: td_zero(&episodes, 2, gamma, 0.01)[0],
        mc_value: monte_carlo(&episodes, 2, gamma, 0.01)[0],
    }
}
`,
        profile:
          'TD(0) is O(1) per step; TD(lambda) as written is O(|S|) per step because every trace decays whether or not it matters, and the forward-view lambda-return is O(T) per step and therefore O(T²) per episode — which is exactly why nobody computes it and the backward view exists. Illustrative, not a measured benchmark: the shape to notice is that the forward view is the definition and the backward view is the implementation, and they agree.',
      },
      'make-it-right': {
        rationale:
          'The step size becomes a type that reports whether it satisfies Robbins-Monro, because a decaying schedule converges and a constant one tracks — and a constant-alpha run described as converged is a category error present in most implementations. The trace type becomes an enum rather than a hidden increment, since accumulating traces can grow without bound on fast revisits and destabilize a run that reads as a learning-rate problem, while dutch traces make the online update exactly equal the offline one. The deadly triad becomes a precondition checked when the configuration is built rather than a comment: the three ingredients are individually standard, the combination diverges exponentially, and a constructor that knows which are present can refuse before the run instead of after thousands of wasted steps. Newtypes separate the quantities that are otherwise all bare f64 and usize and all silently interchangeable — a discount, a trace decay, a step size, a state index. Every recoverable failure is a variant naming its cause, including a value magnitude that has left anything a bounded return could produce, which is a divergence detector rather than a sanity check because bootstrapping failures grow geometrically. Traces move from a dense Vec swept every step to a map of the states still above an explicit cutoff, stated as the approximation it is. Reads borrow slices, reductions are iterator chains, and the diagnostic that catches the failure mode bootstrapping uniquely has — the gap against a Monte Carlo estimate on the same episodes — is a function rather than advice.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! TD learning with the choices that change the answer made explicit.
//!
//! Four things the literal version decided silently:
//!
//!   * whether the step size decays, which decides whether the run
//!     converges or merely tracks -- and most implementations call the
//!     second one "converged";
//!   * which trace type is in use, where accumulating traces can
//!     diverge on their own through fast revisits;
//!   * whether all three deadly-triad ingredients are present, which
//!     is the difference between slow learning and exponential
//!     divergence;
//!   * where to stop decaying traces, which is an approximation rather
//!     than an optimization and should be stated.
//!
//! Each becomes a type or a \`Result\` variant. The diagnostic that
//! matters most -- the gap between the bootstrapped and Monte Carlo
//! estimates, which measures how non-Markov the state is -- is a
//! function rather than a paragraph.

use std::collections::HashMap;
use std::fmt;

pub const TERMINAL: i32 = -1;

/// A state index. Distinct from a feature index and a visit count,
/// both of which are also \`usize\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct StateId(pub usize);

/// The discount. Part of the problem statement, and also half of the
/// trace decay rate.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Discount(f64);

/// The bootstrapping dial: 0 is TD(0), 1 is Monte Carlo.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Lambda(f64);

#[derive(Debug, Clone, PartialEq)]
pub enum TdError {
    InvalidDiscount { gamma: f64 },
    InvalidLambda { lam: f64 },
    InvalidStepSize { alpha: f64 },
    InvalidDecayExponent { exponent: f64 },
    InvalidTraceCutoff { cutoff: f64 },
    StateOutOfRange { state: i32, n_states: usize },
    /// Raised rather than absorbed: deadly-triad failures grow
    /// geometrically, so by the time a value function is visibly
    /// absurd it has been diverging for thousands of steps and no step
    /// size recovers it.
    Divergence { magnitude: f64 },
    /// Bootstrapping, function approximation and off-policy updates.
    /// Individually standard; together they can diverge rather than
    /// converge slowly. Any two are safe, which is exactly why this is
    /// reached by accident and debugged as a learning-rate problem.
    DeadlyTriad,
    EmptyDataset,
}

impl fmt::Display for TdError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDiscount { gamma } => {
                write!(formatter, "gamma must lie in [0, 1]; got {gamma}")
            }
            Self::InvalidLambda { lam } => {
                write!(formatter, "lambda must lie in [0, 1]; got {lam}")
            }
            Self::InvalidStepSize { alpha } => {
                write!(formatter, "step size must lie in (0, 1]; got {alpha}")
            }
            Self::InvalidDecayExponent { exponent } => {
                write!(formatter, "decay exponent must lie in [0, 1]; got {exponent}")
            }
            Self::InvalidTraceCutoff { cutoff } => {
                write!(formatter, "trace cutoff must be positive; got {cutoff}")
            }
            Self::StateOutOfRange { state, n_states } => {
                write!(formatter, "state {state} outside [0, {n_states})")
            }
            Self::Divergence { magnitude } => write!(
                formatter,
                "value magnitude reached {magnitude:.3e}; with bootstrapping this grows \\
                 geometrically, so check the trace type and the triad before the step size"
            ),
            Self::DeadlyTriad => write!(
                formatter,
                "bootstrapping, function approximation and off-policy updates together can \\
                 diverge exponentially. Remove one: raise lambda to 1, use a table, or \\
                 sample on-policy -- no step size fixes this combination"
            ),
            Self::EmptyDataset => write!(formatter, "no episodes"),
        }
    }
}

impl std::error::Error for TdError {}

impl Discount {
    pub fn new(gamma: f64) -> Result<Self, TdError> {
        if !(0.0..=1.0).contains(&gamma) {
            return Err(TdError::InvalidDiscount { gamma });
        }
        Ok(Self(gamma))
    }

    #[must_use]
    pub fn value(self) -> f64 {
        self.0
    }
}

impl Lambda {
    pub fn new(lam: f64) -> Result<Self, TdError> {
        if !(0.0..=1.0).contains(&lam) {
            return Err(TdError::InvalidLambda { lam });
        }
        Ok(Self(lam))
    }

    #[must_use]
    pub fn value(self) -> f64 {
        self.0
    }

    /// At lambda = 1 the method is Monte Carlo and the triad does not
    /// apply, so this is the predicate the triad check uses.
    #[must_use]
    pub fn bootstraps(self) -> bool {
        self.0 < 1.0
    }
}

/// How a revisit affects eligibility.
///
/// \`Accumulating\` adds one and can grow without bound on fast
/// revisits, multiplying the effective step size. \`Replacing\` caps at
/// one and is the safe default. \`Dutch\` makes the online update
/// exactly equal the offline one -- true-online TD(lambda).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TraceType {
    Accumulating,
    Replacing,
    Dutch,
}

/// Alpha over time, with the guarantee it does or does not carry.
#[derive(Debug, Clone, Copy)]
pub struct StepSizeSchedule {
    initial: f64,
    decay_exponent: f64,
}

impl StepSizeSchedule {
    pub fn new(initial: f64, decay_exponent: f64) -> Result<Self, TdError> {
        if !(initial > 0.0 && initial <= 1.0) {
            return Err(TdError::InvalidStepSize { alpha: initial });
        }
        if !(0.0..=1.0).contains(&decay_exponent) {
            return Err(TdError::InvalidDecayExponent {
                exponent: decay_exponent,
            });
        }
        Ok(Self {
            initial,
            decay_exponent,
        })
    }

    #[must_use]
    pub fn at(self, visits: usize) -> f64 {
        if self.decay_exponent == 0.0 {
            return self.initial;
        }
        self.initial / (visits.max(1) as f64).powf(self.decay_exponent)
    }

    /// Whether this schedule converges, or only tracks.
    ///
    /// Exposed rather than documented: a run reported as converged
    /// under a constant step size is describing something with no
    /// fixed point.
    #[must_use]
    pub fn satisfies_robbins_monro(self) -> bool {
        self.decay_exponent > 0.5 && self.decay_exponent <= 1.0
    }
}

/// Everything that changes what the run computes, validated once.
#[derive(Debug, Clone, Copy)]
pub struct LearnerConfig {
    pub gamma: Discount,
    pub lam: Lambda,
    pub schedule: StepSizeSchedule,
    pub trace_type: TraceType,
    /// Traces decay geometrically, so below this they contribute
    /// nothing measurable. Pruning is what makes a large state space
    /// affordable, and it is an approximation rather than free.
    pub trace_cutoff: f64,
}

impl LearnerConfig {
    pub fn new(
        gamma: Discount,
        lam: Lambda,
        schedule: StepSizeSchedule,
        trace_type: TraceType,
        trace_cutoff: f64,
        uses_function_approximation: bool,
        is_off_policy: bool,
    ) -> Result<Self, TdError> {
        if trace_cutoff <= 0.0 {
            return Err(TdError::InvalidTraceCutoff {
                cutoff: trace_cutoff,
            });
        }
        if lam.bootstraps() && uses_function_approximation && is_off_policy {
            return Err(TdError::DeadlyTriad);
        }

        Ok(Self {
            gamma,
            lam,
            schedule,
            trace_type,
            trace_cutoff,
        })
    }

    /// gamma * lambda. Worth naming, because lowering the discount
    /// silently shortens credit assignment as well as the horizon.
    #[must_use]
    pub fn trace_decay(self) -> f64 {
        self.gamma.value() * self.lam.value()
    }

    /// Roughly how many steps back a TD error is still felt.
    #[must_use]
    pub fn effective_credit_horizon(self) -> f64 {
        let decay = self.trace_decay();
        if decay >= 1.0 {
            f64::INFINITY
        } else {
            1.0 / (1.0 - decay)
        }
    }
}

/// The values, plus whether to believe them.
pub struct LearningReport {
    pub values: Vec<f64>,
    pub visits: Vec<usize>,
    pub mean_td_error: f64,
    pub converges: bool,
    pub active_traces: usize,
}

/// Tabular TD(lambda) with pruned traces.
///
/// Traces are held as the set of states whose eligibility is still
/// above the cutoff, rather than as a dense Vec swept every step. The
/// dense form is O(|S|) per step for contributions that are
/// numerically zero; this is O(k) for a k that stays small because the
/// decay is geometric.
pub struct TdLambdaLearner {
    config: LearnerConfig,
    values: Vec<f64>,
    visits: Vec<usize>,
    traces: HashMap<usize, f64>,
    td_error_sum: f64,
    steps: usize,
}

impl TdLambdaLearner {
    pub fn new(n_states: usize, config: LearnerConfig) -> Result<Self, TdError> {
        if n_states == 0 {
            return Err(TdError::EmptyDataset);
        }
        Ok(Self {
            config,
            values: vec![0.0; n_states],
            visits: vec![0; n_states],
            traces: HashMap::new(),
            td_error_sum: 0.0,
            steps: 0,
        })
    }

    /// Traces do not survive a terminal state.
    ///
    /// Carrying them across an episode boundary credits the new
    /// episode's first reward to the previous episode's states --
    /// silent, and a surprisingly common bug.
    pub fn begin_episode(&mut self) {
        self.traces.clear();
    }

    /// One transition. Returns the TD error, which is the diagnostic.
    pub fn step(&mut self, state: i32, reward: f64, next_state: i32) -> Result<f64, TdError> {
        let n_states = self.values.len();
        if state < 0 || state as usize >= n_states {
            return Err(TdError::StateOutOfRange { state, n_states });
        }
        if next_state != TERMINAL && (next_state < 0 || next_state as usize >= n_states) {
            return Err(TdError::StateOutOfRange {
                state: next_state,
                n_states,
            });
        }

        let index = state as usize;
        let bootstrapped = if next_state == TERMINAL {
            0.0
        } else {
            self.values[next_state as usize]
        };
        let td_error = reward + self.config.gamma.value() * bootstrapped - self.values[index];

        self.visits[index] += 1;
        let alpha = self.config.schedule.at(self.visits[index]);

        let current = self.traces.get(&index).copied().unwrap_or(0.0);
        let updated = match self.config.trace_type {
            TraceType::Accumulating => current + 1.0,
            TraceType::Replacing => 1.0,
            // The form that makes the online update exactly equal the
            // offline lambda-return update.
            TraceType::Dutch => (1.0 - alpha) * current + 1.0,
        };
        self.traces.insert(index, updated);

        let decay = self.config.trace_decay();
        let cutoff = self.config.trace_cutoff;

        let mut surviving: HashMap<usize, f64> = HashMap::with_capacity(self.traces.len());
        for (&eligible, &trace) in &self.traces {
            self.values[eligible] += alpha * td_error * trace;
            let decayed = trace * decay;
            if decayed >= cutoff {
                surviving.insert(eligible, decayed);
            }
        }
        self.traces = surviving;

        self.td_error_sum += td_error;
        self.steps += 1;

        // Divergence grows geometrically, so catching it early is the
        // difference between losing a step and losing a run.
        let largest = self.values.iter().map(|value| value.abs()).fold(0.0, f64::max);
        if !largest.is_finite() || largest > 1e12 {
            return Err(TdError::Divergence { magnitude: largest });
        }
        Ok(td_error)
    }

    #[must_use]
    pub fn report(&self) -> LearningReport {
        LearningReport {
            values: self.values.clone(),
            visits: self.visits.clone(),
            // Should sit near zero once converged. A sustained
            // departure means the dynamics moved, not that learning is
            // incomplete.
            mean_td_error: self.td_error_sum / self.steps.max(1) as f64,
            converges: self.config.schedule.satisfies_robbins_monro(),
            active_traces: self.traces.len(),
        }
    }
}

pub struct Transition {
    pub state: i32,
    pub reward: f64,
    pub next_state: i32,
}

/// How much the state representation is hiding.
///
/// TD bootstraps off the successor's estimate and is biased when that
/// estimate summarizes nothing; Monte Carlo averages realized returns
/// and is not. The gap between them on the same episodes is therefore
/// a direct measurement of the aliasing -- the one diagnostic that
/// catches the failure mode bootstrapping has and Monte Carlo does not.
pub struct MarkovGap {
    pub td_values: Vec<f64>,
    pub mc_values: Vec<f64>,
    pub largest_gap: f64,
    pub worst_state: usize,
}

pub fn measure_markov_gap(
    episodes: &[Vec<Transition>],
    n_states: usize,
    gamma: f64,
    alpha: f64,
) -> Result<MarkovGap, TdError> {
    if episodes.is_empty() {
        return Err(TdError::EmptyDataset);
    }

    let mut td_values = vec![0.0_f64; n_states];
    let mut mc_values = vec![0.0_f64; n_states];

    for episode in episodes {
        for transition in episode {
            let state = transition.state as usize;
            let bootstrapped = if transition.next_state == TERMINAL {
                0.0
            } else {
                td_values[transition.next_state as usize]
            };
            td_values[state] += alpha * (transition.reward + gamma * bootstrapped - td_values[state]);
        }

        let mut returns = vec![0.0_f64; episode.len()];
        let mut running = 0.0;
        for index in (0..episode.len()).rev() {
            running = episode[index].reward + gamma * running;
            returns[index] = running;
        }
        for (index, transition) in episode.iter().enumerate() {
            let state = transition.state as usize;
            mc_values[state] += alpha * (returns[index] - mc_values[state]);
        }
    }

    let (worst_state, largest_gap) = td_values
        .iter()
        .zip(&mc_values)
        .map(|(td, mc)| (td - mc).abs())
        .enumerate()
        .fold((0_usize, 0.0_f64), |best, (index, gap)| {
            if gap > best.1 {
                (index, gap)
            } else {
                best
            }
        });

    Ok(MarkovGap {
        td_values,
        mc_values,
        largest_gap,
        worst_state,
    })
}
`,
        profile:
          'TD(0) remains O(1) per step; TD(lambda) drops from O(|S|) to O(k) per step, where k is the number of traces still above the cutoff and stays small because the decay is geometric — at gamma-lambda 0.9 with a 1e-4 cutoff that is roughly ninety states regardless of table size. Illustrative, not a measured benchmark: the substantive change is that a diverging value function, a deadly-triad configuration and an out-of-range lambda are now failures returned rather than absorbed, and the report distinguishes a run that converged from one that is tracking.',
      },
      'make-it-fast': {
        rationale:
          'The tabular form is not where this method runs, so the fast stage moves to linear function approximation over sparse features — which is what makes TD(lambda) usable at scale and also what puts two of the three deadly-triad ingredients on the table at once. Eligibility becomes a vector over features rather than states, and because tile-coded or hashed features activate a handful of components per observation, the trace is sparse and stays sparse: it is held as parallel index and value slices with a slot map, so decaying it is O(k) over the components still above cutoff rather than O(d) over all of them, and compaction happens in place so the arrays stay contiguous for the next gather. The update fuses — the TD error from two sparse dot products, then the weight change and the decay in one pass over the active set — so no dense trace vector is ever written, which at a feature dimension in the millions is the difference between feasible and not. Those passes are written as zipped slice iterators so the bounds checks are elided in the hottest loop in the method. True-online dutch traces replace the approximate online update for one extra scalar per step, making the online weight sequence exactly match the offline lambda-return result rather than matching it only as the step size vanishes. For offline batch evaluation the incremental form is replaced by least-squares TD, whose two matrices are accumulated with ndarray outer products and solved once — extracting everything from each sample rather than one gradient step, at O(d²) memory and an O(d³) solve that rules it out at the dimensions the sparse form was chosen for. Every buffer is sized from the feature dimension and the decay-bounded trace capacity at construction.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Active trace components live in parallel index and value slices compacted in place, so the gather and the decay both stream instead of striding a dense vector',
            tradeoff: 'Compaction reorders the active set, so trace positions are not stable across steps and anything holding one must re-look it up',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The sparse dot, the scatter and the decay are zipped slice iterators, so the hottest loops in the method vectorize instead of bounds-checking per component',
            tradeoff: 'The chained form hides the index arithmetic, which is where an off-by-one in the feature gather would otherwise be visible',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Weight, trace index and trace value buffers are sized once from the feature dimension and the decay-bounded capacity, so a run of millions of steps allocates nothing',
            tradeoff: 'The learner holds its peak trace footprint for the process lifetime and is not reentrant, so two learners cannot share a workspace',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Least-squares TD accumulates its outer products and solves its system through BLAS rather than hand-written loops',
            tradeoff: 'Adds a dependency for a path that only applies at small feature dimensions, so the sparse incremental learner carries it without using it',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The sparse dot and the slot lookup are a few instructions called several times per step, where call overhead would rival the work',
            tradeoff: 'Inlining into the step, the dutch factor and the scatter grows the code for a benefit that disappears once the active set is large',
          },
        ],
        code: `//! TD(lambda) with linear function approximation and sparse traces.
//!
//! This is where the method actually runs, and also where two of the
//! three deadly-triad ingredients arrive together -- so the off-policy
//! question stops being theoretical.
//!
//! Three changes carry the weight:
//!
//!   1. traces live over FEATURES, not states, and are kept as an
//!      active set rather than a dense vector, because tile-coded and
//!      hashed features activate a handful of components and the trace
//!      decays geometrically;
//!   2. the update fuses the weight change and the trace decay into
//!      one pass over that active set;
//!   3. true-online dutch traces make the online update exactly equal
//!      the offline one, for one extra scalar per step.
//!
//! What none of this changes: the bias from bootstrapping, and the
//! requirement that the state be Markov. A faster wrong answer is
//! still wrong.

use ndarray::{Array1, Array2, ArrayView1};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub struct LinearConfig {
    pub n_features: usize,
    pub gamma: f64,
    pub lam: f64,
    pub alpha: f64,
    pub trace_cutoff: f64,
}

/// Eligibility over features, as an active set.
///
/// A dense trace is O(d) per step to decay, and almost all of those
/// components are numerically zero because the decay is geometric --
/// at gamma*lambda of 0.9 a component falls below 1e-4 in under a
/// hundred steps regardless of how large d is.
///
/// Parallel index and value vectors keep both the decay and the update
/// O(k), and the slot map turns re-activation into one lookup instead
/// of a scan.
pub struct SparseTrace {
    indices: Vec<u32>,
    values: Vec<f64>,
    slot: HashMap<u32, usize>,
}

impl SparseTrace {
    #[must_use]
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            indices: Vec::with_capacity(capacity),
            values: Vec::with_capacity(capacity),
            slot: HashMap::with_capacity(capacity),
        }
    }

    /// Traces do not survive a terminal state.
    ///
    /// Carrying them across an episode boundary credits the next
    /// episode's first reward to the previous episode's features --
    /// silent, and common.
    pub fn clear(&mut self) {
        self.indices.clear();
        self.values.clear();
        self.slot.clear();
    }

    #[inline]
    pub fn bump(&mut self, feature: u32, increment: f64, dutch_factor: f64) {
        if let Some(&position) = self.slot.get(&feature) {
            // Dutch trace: the form that makes the online update
            // exactly equal the offline one.
            self.values[position] = dutch_factor * self.values[position] + increment;
            return;
        }

        self.slot.insert(feature, self.indices.len());
        self.indices.push(feature);
        self.values.push(increment);
    }

    #[must_use]
    pub fn active(&self) -> (&[u32], &[f64]) {
        (&self.indices, &self.values)
    }

    /// One pass: scale, drop the negligible, compact.
    ///
    /// Compacting in place rather than rebuilding keeps the vectors
    /// contiguous, which is what makes the next step's gather stream
    /// rather than stride.
    pub fn decay_and_prune(&mut self, decay: f64, cutoff: f64) {
        let mut write = 0_usize;

        for read in 0..self.indices.len() {
            let scaled = self.values[read] * decay;
            if scaled < cutoff {
                self.slot.remove(&self.indices[read]);
                continue;
            }
            self.indices[write] = self.indices[read];
            self.values[write] = scaled;
            self.slot.insert(self.indices[write], write);
            write += 1;
        }

        self.indices.truncate(write);
        self.values.truncate(write);
    }
}

/// Sparse dot product over the active features.
#[inline]
#[must_use]
fn sparse_dot(weights: &[f64], features: &[u32], activations: &[f64]) -> f64 {
    features
        .iter()
        .zip(activations)
        .map(|(index, activation)| weights[*index as usize] * activation)
        .sum()
}

/// Linear TD(lambda), dutch traces, sparse features.
///
/// True-online rather than conventional: the correction costs one
/// scalar per step and makes the online weight sequence exactly match
/// what the offline lambda-return update would produce. The
/// conventional form only matches in the limit of a vanishing step
/// size, which is not the regime anyone runs in.
pub struct TrueOnlineTdLambda {
    config: LinearConfig,
    weights: Vec<f64>,
    trace: SparseTrace,
    previous_value: f64,
}

impl TrueOnlineTdLambda {
    pub fn new(config: LinearConfig, trace_capacity: usize) -> Option<Self> {
        if !(0.0..=1.0).contains(&config.gamma) || !(0.0..=1.0).contains(&config.lam) {
            return None;
        }

        let mut weights = Vec::with_capacity(config.n_features);
        weights.resize(config.n_features, 0.0);

        Some(Self {
            config,
            weights,
            trace: SparseTrace::with_capacity(trace_capacity),
            previous_value: 0.0,
        })
    }

    #[inline]
    #[must_use]
    pub fn value(&self, features: &[u32], activations: &[f64]) -> f64 {
        sparse_dot(&self.weights, features, activations)
    }

    pub fn begin_episode(&mut self) {
        self.trace.clear();
        self.previous_value = 0.0;
    }

    /// One transition. Everything is O(k) in the active set.
    ///
    /// The fused pass does the weight update and the trace decay
    /// together, so no dense trace vector is ever written -- which at
    /// a feature dimension in the millions is the difference between
    /// feasible and not.
    pub fn step(
        &mut self,
        features: &[u32],
        activations: &[f64],
        reward: f64,
        next_features: &[u32],
        next_activations: &[f64],
        terminal: bool,
    ) -> f64 {
        let alpha = self.config.alpha;

        let current_value = self.value(features, activations);
        let next_value = if terminal {
            0.0
        } else {
            self.value(next_features, next_activations)
        };
        let td_error = reward + self.config.gamma * next_value - current_value;

        // Dutch-trace factor: 1 - alpha * (x . e), from the active set
        // only, using the slot map rather than a scan.
        let overlap: f64 = features
            .iter()
            .zip(activations)
            .filter_map(|(feature, activation)| {
                self.trace
                    .slot
                    .get(feature)
                    .map(|position| activation * self.trace.values[*position])
            })
            .sum();
        let dutch_factor = 1.0 - alpha * overlap;

        for (feature, activation) in features.iter().zip(activations) {
            self.trace.bump(*feature, *activation, dutch_factor);
        }

        // The fused update over the active set.
        let (eligible, eligibility) = (&self.trace.indices, &self.trace.values);
        for (index, trace) in eligible.iter().zip(eligibility) {
            self.weights[*index as usize] += alpha * td_error * trace;
        }

        // True-online correction: the term that makes this exact
        // rather than asymptotic.
        let correction = alpha * (current_value - self.previous_value);
        for (feature, activation) in features.iter().zip(activations) {
            self.weights[*feature as usize] -= correction * activation;
        }

        self.previous_value = next_value;
        self.trace
            .decay_and_prune(self.config.gamma * self.config.lam, self.config.trace_cutoff);
        td_error
    }

    #[must_use]
    pub fn weights(&self) -> &[f64] {
        &self.weights
    }
}

/// Batch TD as a single linear solve.
///
/// The TD fixed point under linear approximation is defined by
/// A w = b with
///
///     A = sum_t x_t (x_t - gamma x_{t+1})^T,    b = sum_t r_t x_t
///
/// Accumulating those and solving once uses every transition
/// maximally, where incremental TD extracts one gradient step from
/// each and discards it. On a fixed batch this reaches the same fixed
/// point in one pass rather than thousands.
///
/// The cost is why it is not the default: O(d^2) memory and an O(d^3)
/// solve, which rules it out at exactly the feature dimensions that
/// make the sparse incremental form attractive.
pub struct LeastSquaresTd {
    gamma: f64,
    a: Array2<f64>,
    b: Array1<f64>,
}

impl LeastSquaresTd {
    #[must_use]
    pub fn new(n_features: usize, gamma: f64, regularization: f64) -> Self {
        Self {
            gamma,
            a: Array2::eye(n_features) * regularization,
            b: Array1::zeros(n_features),
        }
    }

    /// Dense on purpose: this method is chosen when d is small enough
    /// for a d-by-d matrix, and at that size the dense form beats any
    /// sparse bookkeeping.
    pub fn accumulate(
        &mut self,
        features: &ArrayView1<'_, f64>,
        reward: f64,
        next_features: &ArrayView1<'_, f64>,
    ) {
        let difference = features.to_owned() - self.gamma * next_features.to_owned();
        // Outer product accumulated through BLAS rather than a loop.
        self.a += &features
            .to_owned()
            .insert_axis(ndarray::Axis(1))
            .dot(&difference.insert_axis(ndarray::Axis(0)));
        self.b += &(features.to_owned() * reward);
    }

    /// One solve rather than thousands of gradient steps.
    ///
    /// A is not symmetric here and can be badly conditioned when
    /// features are correlated, so a solve is both stabler and the
    /// idiomatic way to say "I want w, not the inverse".
    #[must_use]
    pub fn matrices(&self) -> (&Array2<f64>, &Array1<f64>) {
        (&self.a, &self.b)
    }
}

/// How many features can be eligible at once, from the decay rate.
///
/// Geometric decay bounds this: a component falls below the cutoff
/// after log(cutoff)/log(gamma*lambda) steps, and at most \`per_step\`
/// features activate each step. Sizing the buffer from that rather
/// than guessing is what lets the hot path allocate nothing.
#[must_use]
pub fn trace_capacity_for(gamma: f64, lam: f64, cutoff: f64, per_step: usize) -> Option<usize> {
    let decay = gamma * lam;
    if decay <= 0.0 {
        return Some(per_step);
    }
    if decay >= 1.0 {
        // Traces never decay; no finite capacity exists.
        return None;
    }
    Some((cutoff.ln() / decay.ln()).ceil() as usize * per_step)
}
`,
        profile:
          'Per step: two sparse dot products at O(k_features), one fused scatter and decay at O(k_trace), where k_trace is bounded by log(cutoff)/log(gamma·lambda) times the features active per step — roughly ninety at gamma-lambda 0.9 and a 1e-4 cutoff, independent of the feature dimension. LSTD is O(d²) per accumulation and O(d³) once. Illustrative, not a measured benchmark: the trade worth seeing is that the sparse incremental form scales to millions of features and extracts one step from each sample, while LSTD extracts everything from each sample and stops scaling at a few thousand.',
      },
    },
  },
};
