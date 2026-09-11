import type { AiMlModel } from '../../types';

/**
 * SARSA — the entry where the agent learns the value of the policy it
 * is actually following, exploration and all.
 *
 * One symbol separates it from Q-learning: the next action in the
 * target is the one that will be taken rather than the one that would
 * be best. Everything else here — the safer policies, the inability to
 * learn from logged data, the different answer on the cliff — follows
 * from that.
 */
export const SARSA: AiMlModel = {
  slug: 'sarsa',
  name: 'SARSA',
  aliases: ['On-policy TD control', 'State-Action-Reward-State-Action', 'Expected SARSA', 'SARSA(lambda)'],
  category: 'reinforcement-learning',
  group: 'value-based',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'On-policy reinforcement learning in its plainest form: the policy being evaluated and the policy generating the data are the same object, which is what the name spells out — state, action, reward, state, action, with the second action being the one actually executed. That identity is the entire content of the method and the source of every property that distinguishes it from Q-learning.',

  intuition:
    'Q-learning asks "what would this be worth if I acted optimally from here?" and answers a question about a policy nobody is following, because the agent is still exploring. SARSA asks the question the agent can actually act on: "what is this worth given that I will keep behaving the way I am behaving, mistakes included?" The change is one symbol in the update — the next action is the one that will be taken rather than the best available — and the consequence is a genuinely different value function. An agent learning under SARSA discovers that standing next to a cliff is dangerous, because sometimes it does fall off, and it routes around the edge. Q-learning learns the shortest path along the edge and then keeps falling off it, because the values it learned assume an optimality its own exploration contradicts. Neither is wrong: SARSA is correct about the policy being run and Q-learning is correct about a policy that would be run if exploration stopped. Which one you want depends on whether exploration is free, and the answer to that is usually no.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        'Q^{\\pi}(s,a) = \\mathbb{E}_{\\pi}\\bigl[ r + \\gamma\\, Q^{\\pi}(s\', a\') \\mid s, a \\bigr], \\quad a\' \\sim \\pi(\\cdot \\mid s\')',
      symbols: [
        { symbol: 'a\' \\sim \\pi', meaning: 'the action actually taken next, sampled from the behaviour policy — this single symbol is the whole difference from Q-learning' },
        { symbol: 'Q^{\\pi}', meaning: 'the value of the policy being followed, exploration included, rather than of the greedy policy' },
        { symbol: '\\pi', meaning: 'an epsilon-soft behaviour policy; the fixed point moves with epsilon, which is a feature rather than a defect' },
        { symbol: '\\gamma', meaning: 'the discount, setting the horizon over which exploration mistakes are counted' },
      ],
    },
    reading:
      'Compare it against the Bellman optimality equation and one operator has changed: a max over next actions has become an expectation under the policy. That is the on-policy/off-policy distinction in its entirety, and every difference between SARSA and Q-learning is downstream of it. Three consequences are worth holding onto. First, the fixed point depends on epsilon: SARSA converges to the value of the epsilon-soft policy it is running, so a policy that will sometimes act randomly is evaluated as a policy that will sometimes act randomly, which is why it prefers routes with room for error. That is the correct answer to the question an exploring agent should be asking, and it is a different question from the one Q-learning answers. Second, anneal epsilon toward zero and the two converge to the same place, because an epsilon-soft policy approaching greedy has a value function approaching the optimal one — so the disagreement is a statement about the learning process rather than about the destination. Third, the target uses the action that WILL be taken, which means the update cannot be formed until that action is chosen, and that chosen action must be the one executed. Implementations that sample an action for the update and then sample again to act are running something that is neither SARSA nor Q-learning, and the bug is invisible in every metric except the resulting behaviour.',
  },

  optimization: {
    method: 'Stochastic approximation on the on-policy TD error, with the next action drawn from the same policy that is being improved',
    updateRule: {
      formula:
        'Q(s,a) \\leftarrow Q(s,a) + \\alpha \\bigl[ r + \\gamma Q(s\', a\') - Q(s,a) \\bigr], \\qquad \\text{Expected SARSA: } \; \\gamma Q(s\',a\') \\to \\gamma \\sum_{b} \\pi(b \\mid s\') Q(s\', b)',
      symbols: [
        { symbol: 'Q(s\', a\')', meaning: 'the value of the action actually taken next — a sample from the policy, and therefore a source of variance' },
        { symbol: '\\sum_b \\pi(b \\mid s\') Q(s\', b)', meaning: 'Expected SARSA\'s target: the same expectation computed exactly instead of sampled' },
        { symbol: '\\alpha', meaning: 'the step size; decaying to converge, constant to track a policy that is still changing' },
        { symbol: '\\epsilon', meaning: 'the exploration rate, which sets both how much is explored and which policy is being evaluated' },
      ],
    },
    rationale:
      'The update is one line and the interesting engineering is in the two variants around it. Expected SARSA replaces the sampled next action with the exact expectation under the policy, which removes the variance introduced by sampling a prime while leaving the bias untouched — strictly less noisy for the same computation up to a sum over actions, and in practice it tolerates a larger step size because of it. It also unifies the family: with a greedy target policy the expectation collapses to a max and Expected SARSA becomes Q-learning, so the two methods are endpoints of one parameterization rather than rivals. That framing is worth carrying, because it makes the real choice visible — not "SARSA or Q-learning" but "which policy should the target be evaluated under, and is it the one being executed". Eligibility traces extend the method the same way they extend TD, propagating one error back across the recent trajectory, and the on-policy setting makes them simpler than their off-policy counterparts because no importance correction is required. The cost of all of this is the same thing that gives it its advantages: being on-policy means the data must come from the current policy, so there is no replay buffer, no learning from logs, and no reuse of experience after the policy moves. That single limitation is why Q-learning rather than SARSA is what deep reinforcement learning was built on.',
    hyperparameters: [
      { name: 'epsilon', role: 'Exploration rate, and also part of the definition of what is being learned — the fixed point is the value of the epsilon-soft policy, so changing it changes the answer', typicalRange: '1.0 annealed toward 0.01' },
      { name: 'step size (alpha)', role: 'Decaying satisfies Robbins-Monro and converges; constant tracks a policy that is still improving, which is the normal case in control', typicalRange: '0.05 to 0.5' },
      { name: 'discount (gamma)', role: 'The horizon over which exploration mistakes are counted, which is why a longer horizon makes SARSA more conservative than Q-learning rather than equally so', typicalRange: '0.9 to 0.99' },
      { name: 'lambda', role: 'Trace decay for SARSA(lambda). On-policy traces need no importance correction, which makes them simpler here than in any off-policy method', typicalRange: '0.7 to 0.95' },
      { name: 'expected vs sampled target', role: 'Expected SARSA removes the variance of sampling the next action for the cost of a sum over actions. Almost always worth it when the action set is small', typicalRange: 'expected, when |A| is small' },
      { name: 'initial Q values', role: 'Optimistic initialization drives systematic early exploration for free, and interacts with epsilon rather than substituting for it', typicalRange: '0, or above the largest plausible return' },
    ],
    convergence:
      'SARSA converges to the optimal action-value function with probability one under two conditions together: the Robbins-Monro conditions on the step size, and GLIE — greedy in the limit with infinite exploration, which in practice means annealing epsilon as roughly one over the visit count. Hold epsilon fixed, as most implementations do, and it converges instead to the action-value function of the optimal epsilon-soft policy. That is not a failure: it is the correct value of the policy actually being run, and it is what makes the method safe around irreversible mistakes. It does mean that comparing a fixed-epsilon SARSA run against a Q-learning run and calling one better is comparing answers to two different questions. The characteristic failures are elsewhere. The most common is an implementation bug rather than an algorithmic one: sampling the next action to form the target and then sampling again to act breaks the on-policy identity, and the result is neither SARSA nor Q-learning and looks fine in every metric except the behaviour. A constant step size means the estimate tracks rather than converges, which is usually right and makes "converged" the wrong word. And under function approximation the tabular guarantee weakens to a bounded-error result at best — though SARSA is notably better behaved here than Q-learning, because on-policy sampling removes one leg of the deadly triad and the divergence that comes with it.',
    complexity:
      'O(1) per step for the sampled target: one lookup for the current pair, one for the next, one arithmetic update. Expected SARSA is O(|A|) per step for the expectation, which is nothing for the small action sets it suits and prohibitive for large ones. SARSA(lambda) adds a trace pass, O(|S|·|A|) naively and O(k) with a cutoff. Memory is O(|S|·|A|) for the table, doubled if traces are kept. The binding cost is transitions rather than compute, and on-policy learning cannot reuse them: every policy change invalidates the experience collected before it, which is the practical price of the method.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no action to evaluate and no policy to be on, so the one thing distinguishing this method from every other value estimator has nothing to attach to; forecasting becomes relevant only once a prediction feeds a decision, which is the control-and-operations case.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so no behaviour policy exists to be on-policy with respect to; a large TD error here reports an under-learned state-action pair, which is a statement about the agent rather than about the data.',
      },
      optimization: {
        fit: 'primary',
        how: 'Improve a policy by evaluating it as it actually behaves — exploration included — rather than as it would behave if exploration stopped. The target uses the action that will be taken, which makes the learned values an honest account of the policy being run.',
        where: [
          'Sequential decisions where exploration carries real cost, so the value of a state must account for the mistakes that will be made in it',
          'On-policy against off-policy as a design decision with visible consequences rather than a technicality',
          'Expected SARSA as the parameterization that contains both this and Q-learning, which reframes the choice as "under which policy is the target evaluated"',
          'Variance reduction by computing an expectation instead of sampling it, which is the same move that appears throughout estimation',
        ],
        why: 'The most instructive pairing in this category, because SARSA and Q-learning differ by one symbol and disagree substantively, which makes the on-policy question concrete rather than definitional. Three lessons transfer. The first is that an estimator should evaluate the thing you will actually do: Q-learning\'s values are correct about a hypothetical greedy agent and an exploring agent acting on them will underperform its own predictions, which is a mismatch that recurs whenever a model is fitted to an idealization of the system it will control. The second is Expected SARSA\'s framing — replacing a sampled expectation with a computed one costs a sum and removes variance for free, and doing so here reveals that the two methods are endpoints of a single family rather than alternatives. The third is the cost: on-policy learning cannot reuse experience, so every policy update discards the data collected before it, and that single property is why the deep reinforcement-learning literature is built on Q-learning instead. The honest summary is that SARSA is the better answer when exploration is expensive and the worse one when data is.',
        featurization: [
          'Use the action actually executed in the target; sampling one for the update and another to act is neither method and fails silently',
          'Anneal epsilon if the optimal policy is the goal, since fixed epsilon converges to the best epsilon-soft policy instead',
          'Prefer Expected SARSA whenever the action set is small enough to sum over, since it removes variance for no bias',
          'Compare against Q-learning on the same problem rather than choosing on principle; the disagreement between them is informative about the task',
        ],
        evaluation:
          'Online return during learning, not just the final policy\'s return — SARSA\'s advantage is precisely that it performs better while still exploring, and an evaluation that only scores the greedy policy at the end measures the one thing the method does not optimize. Report both: the greedy-policy return says whether learning succeeded, and the behaviour-policy return says whether it was safe to run.',
        pitfalls: [
          'Re-sampling the next action between the update and the step, which quietly breaks the on-policy identity',
          'Comparing a fixed-epsilon SARSA run against Q-learning as though they answered the same question',
          'Evaluating only the greedy policy, which discards the entire advantage of the method',
          'Reaching for a replay buffer, which invalidates the on-policy assumption without any error appearing',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Learn a control policy from live interaction where exploration carries physical or financial cost, and value states by what will actually happen under the exploring policy rather than by what would happen under perfect play. The result routes away from configurations where a random action would be expensive.',
        where: [
          'Process control near an operating envelope, where the cost of an exploratory action is not symmetric with its benefit',
          'Robotics and physical systems, where a random action next to a hard constraint is a real incident rather than a lost step',
          'Dispatch and scheduling under live operation, where the policy cannot be taken offline to be improved',
          'Any setting with an irreversible failure mode, where the value of a state must include the probability of stumbling into it',
        ],
        why: 'The strongest applied fit for this method specifically, and the argument is about safety rather than accuracy. An operating policy that is still learning will take exploratory actions, and in a physical system some of those are expensive — so a value function that assumes they will not be taken is systematically wrong about exactly the states where being wrong matters. SARSA prices them in, which is why it prefers a margin from the constraint boundary and why its online performance during learning is better than Q-learning\'s in precisely these environments. Two cautions. It is not a safety mechanism: it accounts for exploration in the values, it does not prevent a bad action, and a hard interlock is still required for anything genuinely dangerous. And because it is on-policy, it cannot learn from the historical logs most operations teams already have, which frequently makes the decision for them — an off-policy method with importance correction is the only way to use that data, whatever its other drawbacks.',
        featurization: [
          'Include the distance to any constraint boundary in the state, since that is what the method will learn to keep',
          'Keep epsilon fixed and low deliberately when exploration remains live, and report that the learned values are the epsilon-soft ones',
          'Use a constant step size because the process drifts, then describe the estimate as tracking rather than converged',
          'Pair with a hard interlock; this method prices exploration into the values and does not prevent any individual action',
        ],
        evaluation:
          'Cumulative realized cost during learning, which is the quantity the method actually improves, alongside the greedy policy\'s simulated performance. Count constraint violations separately as hard failures rather than averaging them into the return, since a policy that is better on average and violates a limit is not better.',
        pitfalls: [
          'Treating on-policy value estimation as a safety guarantee rather than a bias in the right direction',
          'Attempting to warm-start from historical logs, which the on-policy assumption forbids without correction',
          'Reporting only the greedy policy, which hides the online cost the method exists to reduce',
          'A discount chosen short for convergence speed, which also shortens how far ahead exploration risk is counted',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Learn a session policy from live traffic where the serving policy is the one being evaluated, so the value of a state accounts for the exploration the system is actually performing. Applicable once the action set has been narrowed by candidate generation to something enumerable.',
        where: [
          'Live on-policy learning on a surface that is already exploring deliberately',
          'Small action sets after candidate generation, where Expected SARSA\'s sum over actions is affordable',
          'Settings where exploration has a user-visible cost, so the value of a state should include the poor recommendations that will be made in it',
          'Session-level control where the serving policy and the learning policy are the same system',
        ],
        why: 'A narrow fit, and being clear about why is most of the value. The attraction is real: recommendation surfaces explore continuously, and a value function that prices that exploration in is a more honest account of what the system delivers than one assuming greedy play. What rules it out in most cases is the data. On-policy learning cannot use logged impressions from a previous policy, and logged impressions are what the domain has — years of them, which off-policy methods with importance correction can exploit and this cannot. The action space is the second obstacle: SARSA needs a value per state-action pair and a catalogue is not enumerable, so candidate generation has to come first. Where both obstacles are absent — a small slate of strategies, live traffic, deliberate exploration already in place — it is a reasonable choice, and its bias toward the policy actually being served is a genuine advantage over an off-policy estimate that assumes the ranker stops exploring.',
        featurization: [
          'Narrow the action set with candidate generation before anything else; a catalogue-sized action space has no tabular value function',
          'Confirm the learning policy and the serving policy are the same object, since the method assumes it and nothing checks it',
          'Prefer Expected SARSA once the action set is small, which removes the variance of sampling the served item',
          'Do not plan to warm-start from logs; that requires an off-policy method and the correction it implies',
        ],
        evaluation:
          'Online tests decide. During learning, track the realized session value under the serving policy rather than the greedy policy\'s estimate, because the serving policy is what users experience and is what this method optimizes.',
        pitfalls: [
          'Warm-starting from logged impressions, which breaks the on-policy assumption silently',
          'An action space that was never narrowed, leaving a value table that cannot be populated',
          'Judging by the greedy policy\'s offline estimate, which ignores the exploration users are actually receiving',
          'Assuming the serving policy and the learning policy stay identical through a deployment that updates one of them independently',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The cheapest per step in this category: two lookups and an arithmetic update, or O(|A|) for the expected variant. The cost that binds is transitions, and on-policy learning makes them expensive in a specific way — experience collected under a previous policy cannot be reused, so every improvement discards its own history and the sample requirement is set by how often the policy changes rather than by how much data exists. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'An argmax over the action row of a table: microseconds, fully inspectable, and identical to Q-learning at serving time. What differs is what the numbers mean — these are the values of the exploring policy, so reading them as the optimal policy\'s values overstates what a greedy deployment will achieve.',
    retrainingCadence:
      'Continuous by construction, since the method learns from the policy it is running. With a constant step size there is no retrain event and the estimate tracks indefinitely; with a decaying one it converges and stops responding to change. On a live system the first is almost always right, and it means the deployment has no cadence so much as a permanent learner.',
    driftAndMonitoring: [
      'Online return under the behaviour policy, which is the quantity this method improves and the one a greedy-only evaluation cannot see',
      'Gap between the behaviour-policy return and the greedy-policy return, which is the current cost of exploration and should shrink as epsilon anneals',
      'Epsilon and the visit-count schedule together, since the fixed point is defined by epsilon and a stalled anneal means the target moved and stopped',
      'TD-error distribution, whose mean should sit near zero once the policy has stabilized — a sustained departure means the environment moved',
      'State-action coverage, because an unvisited pair has no estimate and the improvement step will still rank it',
    ],
    productionGotchas: [
      'The action used in the target must be the action executed. Sampling one for the update and another to act is neither SARSA nor Q-learning, and it looks correct in every metric except the resulting behaviour',
      'With a fixed epsilon this converges to the value of the epsilon-soft policy, not the optimal one. That is the right answer to the right question and it is routinely reported as though it were the optimal value',
      'On-policy learning forbids a replay buffer. Adding one because it improved sample efficiency silently changes what is being learned, with no error anywhere',
      'Historical logs cannot be used without importance correction, which frequently decides the method choice before any of its advantages are considered',
      'Epsilon must actually be annealed at serving, or the deployed policy keeps taking random actions in production — the same trap as Q-learning, with the added subtlety that the values were learned assuming it',
      'SARSA is better behaved than Q-learning under function approximation because on-policy sampling removes one leg of the deadly triad, and that is a reason to prefer it that rarely appears in the comparison',
      'Its conservatism is a bias, not a safety mechanism. It prices exploration into the values and prevents no individual action, so anything genuinely dangerous still needs an interlock',
    ],
  },

  assumptions: [
    'The behaviour policy and the policy being evaluated are the same — the defining assumption, and the one a replay buffer or a log breaks',
    'The environment is a Markov decision process, since the update bootstraps off the next state\'s value',
    'State and action spaces are enumerable, because a value is stored per pair and the improvement step ranges over all of them',
    'Every state-action pair is visited infinitely often, which exploration must deliver rather than be assumed to',
    'Exploration will continue during operation — which is what makes the epsilon-soft value function the relevant one rather than a compromise',
  ],

  pros: [
    {
      point: 'Learns the value of the policy it is actually running, exploration included',
      context:
        'The values are an honest account of what the agent will achieve rather than of what an idealized greedy agent would. That is the whole method, and it is why online performance during learning is better than Q-learning\'s in environments with costly mistakes',
    },
    {
      point: 'Safer around irreversible failures, because the risk of a random action is priced into nearby states',
      context:
        'Not a safety mechanism but a bias in the right direction: it keeps a margin from constraint boundaries because it has learned that it sometimes stumbles. Anything genuinely dangerous still needs an interlock',
    },
    {
      point: 'Expected SARSA removes the variance of sampling the next action for the cost of a sum',
      context:
        'Same bias, less noise, and it tolerates a larger step size as a result. It also unifies the family — a greedy target policy turns it into Q-learning — which reframes the choice as which policy the target evaluates',
    },
    {
      point: 'Better behaved than Q-learning under function approximation',
      context:
        'On-policy sampling removes one leg of the deadly triad, so the divergence that afflicts off-policy bootstrapping with approximation does not arise. This is a real advantage and it is rarely mentioned in the comparison',
    },
    {
      point: 'Converges to the optimal policy under GLIE, so the conservatism is a property of the learning process rather than of the destination',
      context:
        'Anneal epsilon and SARSA and Q-learning agree. The disagreement people observe is between a fixed-epsilon run and an off-policy one, which is a comparison of two different questions',
    },
  ],

  cons: [
    {
      point: 'On-policy learning cannot reuse experience',
      context:
        'Every policy change invalidates the data collected before it: no replay buffer, no learning from logs, no experience reuse. This single limitation is why deep reinforcement learning was built on Q-learning instead',
    },
    {
      point: 'With a fixed epsilon it converges to the value of the epsilon-soft policy, not the optimal one',
      context:
        'Correct, and routinely reported as though it were the optimal value. The gap is proportional to epsilon and it is the reason a fixed-epsilon SARSA run is not comparable to a Q-learning run',
    },
    {
      point: 'The on-policy identity is easy to break by accident',
      context:
        'Sampling the next action for the target and then sampling again to act produces a method that is neither SARSA nor Q-learning. Nothing errors, no metric moves, and only the behaviour differs',
    },
    {
      point: 'The table does not generalize and does not scale',
      context:
        'Every state-action pair learned independently, memory as the product of the two spaces. The same wall Q-learning hits, without the off-policy property that made the deep replacement possible',
    },
    {
      point: 'Expected SARSA costs a sum over actions',
      context:
        'Negligible for a handful of actions and prohibitive for a large set, which is exactly where the variance it removes would have mattered most',
    },
    {
      point: 'Sample-inefficient, and made more so by being on-policy',
      context:
        'It needs many visits to every pair and cannot amortize them across policy versions. In practice this means a simulator, and a simulator that can be stepped fast enough to keep up with a policy that changes constantly',
    },
  ],

  relatedSlugs: ['q-learning', 'td-learning', 'dqn', 'monte-carlo-control', 'mdp-bellman'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Tabular SARSA - the on-policy update, transcribed.

One thing to watch above all others: a' is chosen BEFORE the update and then
executed. Drawing it twice - once to form the target, once to act - is neither
SARSA nor Q-learning, and nothing in any metric will tell you.
"""

import random


def epsilon_greedy(q_row, n_actions, epsilon):
    """The behaviour policy. It is also the policy being evaluated - that
    identity is the whole method."""
    if random.random() < epsilon:
        return random.randrange(n_actions)
    return max(range(n_actions), key=lambda a: q_row[a])


def train(env, n_states, n_actions, episodes=5_000, alpha=0.1, gamma=0.99, epsilon=0.1):
    # Q[s][a] = expected discounted return from taking a in s and then
    # continuing to behave epsilon-greedily. Not optimally. Epsilon-greedily.
    Q = [[0.0] * n_actions for _ in range(n_states)]

    for _ in range(episodes):
        state = env.reset()
        # The first action is drawn before the loop: every iteration needs an
        # action already in hand, because the update it forms depends on it.
        action = epsilon_greedy(Q[state], n_actions, epsilon)
        done = False

        while not done:
            next_state, reward, done = env.step(action)

            # Draw the next action NOW, from the same policy. This value is the
            # a' inside the target AND the action executed on the next pass of
            # the loop. One draw, used for both. Two draws is the classic bug.
            next_action = 0 if done else epsilon_greedy(Q[next_state], n_actions, epsilon)

            # Q[s'][a'], not max over a of Q[s'][a]. That single substitution
            # is the entire difference from Q-learning, and it is why this
            # learns the value of a policy that sometimes acts at random.
            bootstrap = 0.0 if done else Q[next_state][next_action]

            td_target = reward + gamma * bootstrap
            Q[state][action] += alpha * (td_target - Q[state][action])

            state, action = next_state, next_action

    return Q


def expected_sarsa_target(q_row, n_actions, epsilon, gamma, reward):
    """Expected SARSA: compute the expectation instead of sampling it.

    Epsilon-greedy puts epsilon/|A| on every action plus 1 - epsilon on the
    greedy one. Summing that out by hand removes the variance of the draw and
    leaves the bias untouched. Set epsilon to 0 here and the sum collapses to a
    max - which is Q-learning. The two methods are endpoints of one family.
    """
    greedy = max(range(n_actions), key=lambda a: q_row[a])

    expectation = 0.0
    for a in range(n_actions):
        prob = epsilon / n_actions
        if a == greedy:
            prob += 1.0 - epsilon
        expectation += prob * q_row[a]

    return reward + gamma * expectation`,
        profile: 'O(1) per step for the sampled target, O(|A|) for the expected one. Python lists throughout.',
      },
      'make-it-right': {
        code: `"""Tabular SARSA - typed, annealed, with the on-policy invariant asserted."""

from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
from numpy.typing import NDArray

QTable = NDArray[np.float64]


class Environment(Protocol):
    def reset(self) -> int: ...
    def step(self, action: int) -> tuple[int, float, bool]: ...


@dataclass(frozen=True)
class SarsaConfig:
    n_states: int
    n_actions: int
    alpha: float = 0.1
    gamma: float = 0.99
    epsilon_start: float = 1.0
    epsilon_end: float = 0.01
    epsilon_decay_episodes: int = 1_000
    # Sampled target vs. the exact expectation. Expected SARSA is strictly
    # less noisy for the cost of a sum over actions, so it is the default
    # whenever the action set is small enough to sum over.
    expected: bool = True

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma < 1.0:
            raise ValueError(f"gamma must be in [0, 1), got {self.gamma}")
        if not 0.0 < self.alpha <= 1.0:
            raise ValueError(f"alpha must be in (0, 1], got {self.alpha}")
        if self.n_states < 1 or self.n_actions < 1:
            raise ValueError("state and action spaces must be non-empty")


@dataclass
class TrainingResult:
    q_table: QTable
    # SARSA's advantage is online performance WHILE exploring, so the return
    # under the behaviour policy is the quantity that matters. Recording only
    # the greedy policy's return measures the one thing this does not optimize.
    behaviour_returns: list[float] = field(default_factory=list)
    greedy_returns: list[float] = field(default_factory=list)
    mean_abs_td_error: list[float] = field(default_factory=list)

    @property
    def exploration_cost(self) -> float:
        """Gap between what the greedy policy would earn and what the agent
        actually earns while still exploring. It should shrink as epsilon
        anneals; if it does not, the anneal has stalled."""
        if not self.behaviour_returns or not self.greedy_returns:
            return 0.0
        window = min(50, len(self.behaviour_returns), len(self.greedy_returns))
        return float(
            np.mean(self.greedy_returns[-window:]) - np.mean(self.behaviour_returns[-window:])
        )


def _policy_probabilities(q_row: NDArray[np.float64], epsilon: float) -> NDArray[np.float64]:
    """Epsilon-greedy as an explicit distribution.

    Writing the policy down as probabilities rather than as a sampling
    procedure is what makes Expected SARSA one line, and it makes the
    on-policy claim auditable: this is the distribution the target integrates
    over and it must be the one the agent samples from.
    """
    n_actions = q_row.shape[0]
    probabilities = np.full(n_actions, epsilon / n_actions, dtype=np.float64)
    probabilities[int(np.argmax(q_row))] += 1.0 - epsilon
    return probabilities


def _anneal(episode: int, config: SarsaConfig) -> float:
    progress = min(1.0, episode / config.epsilon_decay_episodes)
    return config.epsilon_start + progress * (config.epsilon_end - config.epsilon_start)


def train(env: Environment, config: SarsaConfig, episodes: int = 5_000) -> TrainingResult:
    q = np.zeros((config.n_states, config.n_actions), dtype=np.float64)
    rng = np.random.default_rng(0)
    result = TrainingResult(q_table=q)

    for episode in range(episodes):
        # Fixed epsilon converges to the value of the epsilon-soft policy, not
        # the optimal one. Both are correct answers; only one of them is the
        # answer people usually report.
        epsilon = _anneal(episode, config)

        state = env.reset()
        probabilities = _policy_probabilities(q[state], epsilon)
        action = int(rng.choice(config.n_actions, p=probabilities))

        done = False
        behaviour_return = 0.0
        td_errors: list[float] = []

        while not done:
            next_state, reward, done = env.step(action)

            if done:
                # No future past a terminal. Bootstrapping past one is the
                # single most common bug in any TD implementation.
                bootstrap = 0.0
                next_action = 0
            else:
                next_probabilities = _policy_probabilities(q[next_state], epsilon)
                # Draw once. This action is both the a' in the target and the
                # action executed next iteration - the on-policy invariant.
                next_action = int(rng.choice(config.n_actions, p=next_probabilities))
                bootstrap = (
                    float(next_probabilities @ q[next_state])
                    if config.expected
                    else float(q[next_state, next_action])
                )

            td_error = reward + config.gamma * bootstrap - q[state, action]
            q[state, action] += config.alpha * td_error

            behaviour_return += reward
            td_errors.append(abs(td_error))
            state, action = next_state, next_action

        result.behaviour_returns.append(behaviour_return)
        result.mean_abs_td_error.append(float(np.mean(td_errors)) if td_errors else 0.0)

    return result`,
        rationale:
          'The policy is written down as an explicit probability vector rather than as a sampling procedure, which is what makes Expected SARSA a single dot product and — more importantly — makes the on-policy claim auditable: the distribution the target integrates over is visibly the one the agent samples from. Epsilon is annealed rather than fixed, so the fixed point walks toward the optimal policy instead of stopping at the epsilon-soft one. And the result records the behaviour-policy return alongside the greedy one, because the gap between them is the exploration cost this method exists to reduce and a greedy-only evaluation cannot see it.',
        conventions: [
          'Explicit type hints on every public signature',
          'No mutable default arguments',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(|A|) per step for the expected target; the table is one contiguous array.',
      },
      'make-it-fast': {
        code: `"""Expected SARSA - vectorized across environments stepping in lockstep.

Note what is absent: a replay buffer. On-policy learning cannot reuse
experience collected under a previous policy, so the only parallelism
available is breadth - many environments running the CURRENT policy at once -
rather than depth into stored history. That constraint is the method, not an
oversight, and it is the reason deep RL was built on off-policy methods.
"""

import numpy as np
from numpy.typing import NDArray

QTable = NDArray[np.float64]


def expected_bootstrap(
    q: QTable,
    next_states: NDArray[np.intp],
    epsilon: float,
    out: NDArray[np.float64],
) -> NDArray[np.float64]:
    """Expectation under epsilon-greedy, in closed form, for a whole batch.

    The sum over actions never needs to be built explicitly. Epsilon-greedy is
    a uniform mixture plus a point mass on the greedy action, so its
    expectation is exactly epsilon * mean(row) + (1 - epsilon) * max(row) -
    two reductions instead of a weighted sum, and no probability vector is
    materialized. Setting epsilon to 0 leaves max(row), which is the
    Q-learning target; the family really is one parameterization.
    """
    rows = q[next_states]                       # one gather, (batch, |A|)
    np.max(rows, axis=1, out=out)               # greedy component, in place
    out *= 1.0 - epsilon
    out += epsilon * rows.mean(axis=1)          # uniform component
    return out


def run_vectorized(
    envs,
    n_states: int,
    n_actions: int,
    steps: int = 100_000,
    alpha: float = 0.1,
    gamma: float = 0.99,
    epsilon: float = 0.1,
) -> QTable:
    rng = np.random.default_rng(0)
    n_envs = len(envs)

    q = np.zeros((n_states, n_actions), dtype=np.float64)

    # Scratch buffers allocated once and reused every step, so the hot loop
    # allocates nothing at all.
    bootstrap = np.empty(n_envs, dtype=np.float64)
    actions = np.empty(n_envs, dtype=np.intp)

    states = np.array([env.reset() for env in envs], dtype=np.intp)
    actions[:] = select_actions(q, states, epsilon, n_actions, rng)

    for _ in range(steps // n_envs):
        results = [env.step(int(a)) for env, a in zip(envs, actions)]
        next_states = np.fromiter((r[0] for r in results), dtype=np.intp, count=n_envs)
        rewards = np.fromiter((r[1] for r in results), dtype=np.float64, count=n_envs)
        dones = np.fromiter((r[2] for r in results), dtype=np.bool_, count=n_envs)

        expected_bootstrap(q, next_states, epsilon, bootstrap)
        bootstrap[dones] = 0.0

        targets = rewards + gamma * bootstrap
        deltas = alpha * (targets - q[states, actions])

        # np.add.at, not q[states, actions] += deltas: when two environments
        # visit the same (s, a) in one batch, plain fancy-index assignment
        # keeps only the last write and silently drops the others.
        np.add.at(q, (states, actions), deltas)

        # Choosing the next actions AFTER the update rather than before is
        # deliberate: it keeps the behaviour policy synchronized with the table
        # the agent is about to act on, which is what on-policy means once the
        # updates are batched.
        states = np.where(dones, [env.reset() for env in envs], next_states)
        actions[:] = select_actions(q, states, epsilon, n_actions, rng)

    return q


def select_actions(
    q: QTable,
    states: NDArray[np.intp],
    epsilon: float,
    n_actions: int,
    rng: np.random.Generator,
) -> NDArray[np.intp]:
    """Epsilon-greedy for every environment in one pass - one RNG draw for the
    explore mask, one argmax over the gathered rows, one select."""
    explore = rng.random(states.shape[0]) < epsilon
    greedy = np.argmax(q[states], axis=1)
    return np.where(explore, rng.integers(n_actions, size=states.shape[0]), greedy).astype(np.intp)`,
        rationale:
          'Two changes. The expectation over actions is folded into closed form — epsilon-greedy is a uniform mixture plus a point mass, so its expectation is epsilon·mean + (1−epsilon)·max, two reductions with no probability vector materialized and no per-action loop. And many environments step in lockstep under the current policy, which is the only parallelism an on-policy method is allowed: there is deliberately no replay buffer, because reusing experience from a previous policy would quietly change what is being learned with nothing erroring.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The weighted sum over actions collapses to a mean and a max, so the |A|-length probability vector and the elementwise product it multiplies are never built.',
            tradeoff: 'The closed form is specific to epsilon-greedy — a softmax or any other policy loses it and has to build the probability vector again.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Per-step work is a gather and an arithmetic update, so a single-environment loop is almost entirely Python overhead; stepping n environments in lockstep amortizes it across the batch.',
            tradeoff: 'Environments must be steppable in lockstep and similar in episode length, and the batched update means the policy is one step stale relative to a strictly sequential SARSA run.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The bootstrap and action buffers are allocated once and written in place with the out= parameter, so the hot loop performs no allocation.',
            tradeoff: 'np.add.at is far slower per element than plain fancy-index assignment — accepted deliberately, because the faster form silently drops duplicate state-action updates.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'One batched update per n_envs steps; the expectation costs two reductions. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Tabular SARSA - the on-policy update, transcribed.
#include <algorithm>
#include <cstddef>
#include <random>
#include <vector>

struct StepResult {
  int next_state;
  double reward;
  bool done;
};

// Environment is any type with reset() and step(action).
template <typename Env>
std::vector<std::vector<double>> Train(Env& env, std::size_t n_states,
                                       std::size_t n_actions, int episodes,
                                       double alpha, double gamma, double epsilon) {
  std::vector<std::vector<double>> q(n_states, std::vector<double>(n_actions, 0.0));

  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  std::uniform_int_distribution<std::size_t> pick_action(0, n_actions - 1);

  // The behaviour policy. It is also the policy being evaluated, and that
  // identity is the entire method.
  auto epsilon_greedy = [&](std::size_t state) -> std::size_t {
    if (uniform(rng) < epsilon) {
      return pick_action(rng);
    }
    const auto& row = q[state];
    return static_cast<std::size_t>(
        std::distance(row.begin(), std::max_element(row.begin(), row.end())));
  };

  for (int episode = 0; episode < episodes; ++episode) {
    auto state = static_cast<std::size_t>(env.reset());
    // Drawn before the loop: each iteration needs an action already in hand,
    // because the target it forms depends on the action that follows it.
    std::size_t action = epsilon_greedy(state);
    bool done = false;

    while (!done) {
      const StepResult result = env.step(static_cast<int>(action));
      const auto next_state = static_cast<std::size_t>(result.next_state);

      // Drawn NOW, and this same value is executed on the next iteration.
      // Drawing once for the target and again to act is the classic bug: it
      // produces a method that is neither SARSA nor Q-learning and looks
      // correct in every metric except the resulting behaviour.
      std::size_t next_action = 0;
      double bootstrap = 0.0;
      if (!result.done) {
        next_action = epsilon_greedy(next_state);
        // q[s'][a'], not the max over the row. One substitution, and it is
        // the whole difference from Q-learning.
        bootstrap = q[next_state][next_action];
      }

      const double td_target = result.reward + gamma * bootstrap;
      q[state][action] += alpha * (td_target - q[state][action]);

      state = next_state;
      action = next_action;
      done = result.done;
    }
  }

  return q;
}`,
        profile: 'O(1) per step plus an |A| scan for the greedy branch. vector<vector<double>> scatters every state row across the heap.',
      },
      'make-it-right': {
        code: `// SARSA - flat table, the policy written down explicitly, expected target.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

struct StepResult {
  int next_state;
  double reward;
  bool done;
};

// A newtype-ish wrapper so an exploration rate cannot be passed where a step
// size is expected - the two are both bare doubles in the naive version and
// transposing them produces a run that trains badly rather than one that fails.
struct Epsilon {
  double value;
};

class SarsaTable {
 public:
  SarsaTable(std::size_t n_states, std::size_t n_actions)
      : n_actions_(n_actions),
        // One flat allocation: a state's action row is contiguous, so both
        // the max scan and the expectation stream instead of chasing a
        // pointer per state.
        values_(n_states * n_actions, 0.0) {
    if (n_states == 0 || n_actions == 0) {
      throw std::invalid_argument("state and action spaces must be non-empty");
    }
  }

  [[nodiscard]] std::span<const double> Row(std::size_t state) const {
    return {values_.data() + state * n_actions_, n_actions_};
  }

  [[nodiscard]] std::size_t GreedyAction(std::size_t state) const {
    const auto row = Row(state);
    return static_cast<std::size_t>(
        std::distance(row.begin(), std::max_element(row.begin(), row.end())));
  }

  // Expected SARSA's target: the expectation under the behaviour policy,
  // computed rather than sampled. Same bias, no sampling variance, and it
  // tolerates a larger step size as a result.
  //
  // Epsilon-greedy is a uniform mixture plus a point mass on the greedy
  // action, so the sum has a closed form. Passing epsilon = 0 leaves the max,
  // which is Q-learning - the two methods are one parameterization.
  [[nodiscard]] double ExpectedValue(std::size_t state, Epsilon epsilon) const {
    const auto row = Row(state);
    const double mean = std::accumulate(row.begin(), row.end(), 0.0) /
                        static_cast<double>(n_actions_);
    const double best = *std::max_element(row.begin(), row.end());
    return epsilon.value * mean + (1.0 - epsilon.value) * best;
  }

  // Returns the TD error, because a TD error whose mean has settled near zero
  // is the convergence signal - episode return can plateau with the values
  // still badly wrong.
  double Update(std::size_t state, std::size_t action, double target, double alpha) {
    double& cell = values_[state * n_actions_ + action];
    const double td_error = target - cell;
    cell += alpha * td_error;
    return td_error;
  }

 private:
  std::size_t n_actions_;
  std::vector<double> values_;
};

// Linear anneal. With epsilon held fixed this converges to the value of the
// epsilon-soft policy rather than the optimal one - a correct answer to a
// different question, and one that is routinely reported as if it were the
// optimal value.
[[nodiscard]] Epsilon AnnealEpsilon(int episode, int decay_episodes, Epsilon start,
                                    Epsilon end) {
  const double progress =
      std::min(1.0, static_cast<double>(episode) / static_cast<double>(decay_episodes));
  return Epsilon{start.value + progress * (end.value - start.value)};
}`,
        rationale:
          'The nested vectors become one flat allocation, so a state\'s action row is contiguous and both the greedy scan and the expectation stream. The expectation is given a closed form rather than a loop over a probability vector, which is what makes Expected SARSA cheap enough to be the default. And epsilon gets its own type: it and the step size are both bare doubles in the naive version, and transposing them yields a run that trains badly instead of one that fails.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'Two contiguous |A| passes per step for the expectation; one allocation for the whole table.',
      },
      'make-it-fast': {
        code: `// Expected SARSA - the target maintained in O(1) per update.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <vector>

// The expected target is epsilon * mean(row) + (1 - epsilon) * max(row), and
// an update touches exactly one cell of one row. Both reductions can therefore
// be maintained incrementally instead of rescanned: the sum by adding the
// delta, the max by the same repair Q-learning uses. That turns the hottest
// operation in the loop from two |A| passes into a constant number of flops.
class IncrementalSarsaTable {
 public:
  IncrementalSarsaTable(std::size_t n_states, std::size_t n_actions)
      : n_actions_(n_actions),
        values_(n_states * n_actions, 0.0),
        row_sum_(n_states, 0.0),
        row_max_(n_states, 0.0),
        row_argmax_(n_states, 0),
        writes_since_rescan_(n_states, 0) {}

  [[nodiscard]] double ExpectedValue(std::size_t state, double epsilon) const noexcept {
    const double mean = row_sum_[state] / static_cast<double>(n_actions_);
    return epsilon * mean + (1.0 - epsilon) * row_max_[state];
  }

  [[nodiscard]] std::size_t GreedyAction(std::size_t state) const noexcept {
    return row_argmax_[state];
  }

  void Update(std::size_t state, std::size_t action, double target, double alpha) noexcept {
    const std::size_t index = state * n_actions_ + action;
    const double delta = alpha * (target - values_[index]);
    values_[index] += delta;

    // The sum is exact under addition, so it needs no scan at all - only a
    // periodic rescan to stop rounding error accumulating over millions of
    // updates.
    row_sum_[state] += delta;

    const double updated = values_[index];
    if (updated >= row_max_[state]) {
      // The written cell became the max. O(1), and the common case, since
      // updates pull values toward higher returns.
      row_max_[state] = updated;
      row_argmax_[state] = action;
    } else if (row_argmax_[state] == action) {
      // The standing max was just lowered and has to be found again. Only
      // this branch pays O(|A|).
      RecomputeRow(state);
      return;
    }

    if (++writes_since_rescan_[state] >= kRescanInterval) {
      RecomputeRow(state);
    }
  }

 private:
  static constexpr std::size_t kRescanInterval = 4096;

  void RecomputeRow(std::size_t state) noexcept {
    const double* row = values_.data() + state * n_actions_;
    const double* best = std::max_element(row, row + n_actions_);
    row_max_[state] = *best;
    row_argmax_[state] = static_cast<std::size_t>(best - row);
    // Recomputed rather than trusted: the incremental sum drifts, and a drifted
    // mean biases every expected target formed from this row.
    row_sum_[state] = std::accumulate(row, row + n_actions_, 0.0);
    writes_since_rescan_[state] = 0;
  }

  std::size_t n_actions_;
  std::vector<double> values_;
  std::vector<double> row_sum_;
  std::vector<double> row_max_;
  std::vector<std::size_t> row_argmax_;
  std::vector<std::size_t> writes_since_rescan_;
};`,
        rationale:
          'The expected target is two reductions over a row, recomputed on every single step even though an update writes exactly one cell. Both are maintained incrementally instead: the sum by adding the delta, the max by the standard repair, so the hottest operation in the loop becomes a constant number of flops. The periodic rescan is not defensive padding — the incrementally maintained sum genuinely drifts over millions of updates, and a drifted mean biases every target formed from that row.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Contiguous rows plus cached per-row sum, max and argmax turn the expected-target computation from two |A| passes into three array reads.',
            tradeoff: 'Four extra |S|-length arrays, and every write now carries a repair obligation that a plain table does not.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The sum and max repairs share the single write that triggered them, so the update does not walk the row twice or build a probability vector at all.',
            tradeoff: 'The fused update is specific to epsilon-greedy; a policy without a closed-form expectation has to rebuild the weighted sum and loses the whole scheme.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The rescan path is a max_element and an accumulate over a contiguous row, both of which autovectorize cleanly once optimization is enabled.',
            tradeoff: '-march=native yields a binary that may fault on older CPUs in a heterogeneous fleet.',
          },
        ],
        profile: 'O(1) expected target per step, O(|A|) only on a max-lowering write or a periodic rescan. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Tabular SARSA - the on-policy update, transcribed.

pub struct StepResult {
    pub next_state: usize,
    pub reward: f64,
    pub done: bool,
}

pub trait Environment {
    fn reset(&mut self) -> usize;
    fn step(&mut self, action: usize) -> StepResult;
}

/// The behaviour policy - and also the policy being evaluated. That identity
/// is the entire method.
fn epsilon_greedy(row: &[f64], epsilon: f64, rand: &mut dyn FnMut() -> f64) -> usize {
    if rand() < epsilon {
        let n_actions = row.len();
        return (rand() * n_actions as f64) as usize % n_actions;
    }
    let mut best = 0;
    for a in 1..row.len() {
        if row[a] > row[best] {
            best = a;
        }
    }
    best
}

pub fn train(
    env: &mut dyn Environment,
    n_states: usize,
    n_actions: usize,
    episodes: usize,
    alpha: f64,
    gamma: f64,
    epsilon: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<Vec<f64>> {
    let mut q = vec![vec![0.0; n_actions]; n_states];

    for _ in 0..episodes {
        let mut state = env.reset();
        // Drawn before the loop: each iteration needs an action already in
        // hand, because the target it forms depends on the action that
        // follows it.
        let mut action = epsilon_greedy(&q[state], epsilon, rand);
        let mut done = false;

        while !done {
            let result = env.step(action);

            // Drawn NOW, and this same value is what gets executed next
            // iteration. Drawing once for the target and again to act
            // produces a method that is neither SARSA nor Q-learning, and
            // nothing anywhere reports it.
            let (next_action, bootstrap) = if result.done {
                (0, 0.0)
            } else {
                let a_prime = epsilon_greedy(&q[result.next_state], epsilon, rand);
                // q[s'][a'], not the max over the row. One substitution, and
                // it is the whole difference from Q-learning.
                (a_prime, q[result.next_state][a_prime])
            };

            let td_target = result.reward + gamma * bootstrap;
            q[state][action] += alpha * (td_target - q[state][action]);

            state = result.next_state;
            action = next_action;
            done = result.done;
        }
    }

    q
}`,
        profile: 'O(1) per step plus an |A| scan for the greedy branch. Vec<Vec<f64>> scatters state rows; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! SARSA - flat table, typed errors, the expectation in closed form.

use std::fmt;

/// Newtypes so an exploration rate and a step size cannot be transposed. Both
/// are bare f64 in the naive version, and swapping them produces a run that
/// trains badly rather than one that fails.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Epsilon(pub f64);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StepSize(pub f64);

#[derive(Debug, PartialEq, Eq)]
pub enum SarsaError {
    EmptySpace,
    BadDiscount,
    BadEpsilon,
}

impl fmt::Display for SarsaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptySpace => write!(f, "state and action spaces must be non-empty"),
            Self::BadDiscount => write!(f, "gamma must be in [0, 1)"),
            Self::BadEpsilon => write!(f, "epsilon must be in [0, 1]"),
        }
    }
}

impl std::error::Error for SarsaError {}

pub struct SarsaTable {
    n_actions: usize,
    /// One flat allocation: a state's action row is contiguous, so both the
    /// greedy scan and the expectation stream rather than chasing a pointer.
    values: Vec<f64>,
}

impl SarsaTable {
    pub fn new(n_states: usize, n_actions: usize) -> Result<Self, SarsaError> {
        if n_states == 0 || n_actions == 0 {
            return Err(SarsaError::EmptySpace);
        }
        Ok(Self { n_actions, values: vec![0.0; n_states * n_actions] })
    }

    #[must_use]
    pub fn row(&self, state: usize) -> &[f64] {
        &self.values[state * self.n_actions..(state + 1) * self.n_actions]
    }

    #[must_use]
    pub fn greedy_action(&self, state: usize) -> usize {
        self.row(state)
            .iter()
            .enumerate()
            // total_cmp rather than partial_cmp().unwrap(): a NaN from a
            // diverged update would panic, and panicking mid-training is a
            // worse failure than returning a defined action.
            .max_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or(0, |(index, _)| index)
    }

    /// Expected SARSA's target: the expectation under the behaviour policy,
    /// computed instead of sampled. Same bias, none of the sampling variance.
    ///
    /// Epsilon-greedy is a uniform mixture plus a point mass on the greedy
    /// action, so the weighted sum collapses to a mean and a max and no
    /// probability vector is ever built. Pass Epsilon(0.0) and what remains is
    /// the max - which is Q-learning. One parameterization, two endpoints.
    #[must_use]
    pub fn expected_value(&self, state: usize, epsilon: Epsilon) -> f64 {
        let row = self.row(state);
        let mean = row.iter().sum::<f64>() / row.len() as f64;
        let best = row.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        epsilon.0 * mean + (1.0 - epsilon.0) * best
    }

    /// Returns the TD error: a TD error whose mean has settled near zero is
    /// the convergence signal, not a rising episode return.
    pub fn update(&mut self, state: usize, action: usize, target: f64, alpha: StepSize) -> f64 {
        let index = state * self.n_actions + action;
        let td_error = target - self.values[index];
        self.values[index] += alpha.0 * td_error;
        td_error
    }
}

/// Linear anneal. Held fixed, epsilon makes this converge to the value of the
/// epsilon-soft policy rather than the optimal one - a correct answer to a
/// different question, and one routinely reported as though it were optimal.
#[must_use]
pub fn anneal(episode: usize, decay_episodes: usize, start: Epsilon, end: Epsilon) -> Epsilon {
    let progress = (episode as f64 / decay_episodes as f64).min(1.0);
    Epsilon(start.0 + progress * (end.0 - start.0))
}`,
        rationale:
          'The nested Vec becomes one flat allocation with contiguous action rows, construction validates instead of panicking downstream, and the expectation gets a closed form so Expected SARSA costs two reductions rather than a materialized probability vector. Epsilon and the step size become distinct types, because both are bare f64 in the naive version and transposing them produces a run that trains badly instead of one that fails. `total_cmp` is deliberate: a NaN from a diverged update would panic under `partial_cmp().unwrap()`, and crashing mid-training is worse than returning a defined action.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Two contiguous |A| passes per step for the expectation; one allocation for the whole table.',
      },
      'make-it-fast': {
        code: `//! SARSA(lambda) - eligibility traces kept sparse, evaluation across cores.

use rayon::prelude::*;

/// Naive SARSA(lambda) decays every entry of an |S| x |A| trace vector on every
/// single step, which costs more than the algorithm it accelerates. But traces
/// decay geometrically, so almost all of them are numerically irrelevant within
/// a few dozen steps: keeping only the active ones turns an O(|S| x |A|) sweep
/// into a pass over a short list.
pub struct SparseTraces {
    /// (flat index, trace value), most recent last.
    active: Vec<(u32, f64)>,
    cutoff: f64,
}

impl SparseTraces {
    #[must_use]
    pub fn new(expected_active: usize, cutoff: f64) -> Self {
        Self {
            // Sized once from the expected trace horizon, so the hot loop
            // never reallocates.
            active: Vec::with_capacity(expected_active),
            cutoff,
        }
    }

    /// Replacing traces rather than accumulating: revisiting a pair resets its
    /// eligibility to 1 instead of stacking. Accumulating traces diverge on
    /// any environment with a cycle, which is most of them.
    pub fn visit(&mut self, index: u32) {
        if let Some(entry) = self.active.iter_mut().find(|(i, _)| *i == index) {
            entry.1 = 1.0;
            return;
        }
        self.active.push((index, 1.0));
    }

    /// Decay every active trace and drop the ones that no longer matter. The
    /// cutoff is what keeps the list short, and it is an approximation - a
    /// trace below it is discarded rather than allowed to decay to zero.
    pub fn decay(&mut self, gamma_lambda: f64) {
        let cutoff = self.cutoff;
        for entry in &mut self.active {
            entry.1 *= gamma_lambda;
        }
        self.active.retain(|(_, trace)| *trace > cutoff);
    }

    #[inline]
    #[must_use]
    pub fn iter(&self) -> impl Iterator<Item = &(u32, f64)> {
        self.active.iter()
    }
}

pub struct SarsaLambda {
    n_actions: usize,
    values: Vec<f64>,
    traces: SparseTraces,
}

impl SarsaLambda {
    /// One TD error, credited backwards across every eligible pair. On-policy
    /// traces need no importance correction at all, which is what makes them
    /// simpler here than in any off-policy method.
    pub fn apply(&mut self, td_error: f64, alpha: f64, gamma_lambda: f64) {
        let step = alpha * td_error;
        for (index, trace) in self.traces.iter() {
            // Iterating a slice rather than indexing it lets the bounds check
            // be elided across the whole update.
            self.values[*index as usize] += step * trace;
        }
        self.traces.decay(gamma_lambda);
    }

    #[inline]
    #[must_use]
    pub fn expected_value(&self, state: usize, epsilon: f64) -> f64 {
        let row = &self.values[state * self.n_actions..(state + 1) * self.n_actions];
        let mean = row.iter().sum::<f64>() / row.len() as f64;
        let best = row.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        epsilon * mean + (1.0 - epsilon) * best
    }
}

/// Evaluate a frozen policy across independent episodes concurrently.
///
/// Training is sequential by construction here - more so than in Q-learning,
/// because on-policy learning cannot even replay stored experience - so
/// evaluation is the only place genuine parallelism exists. Reporting both
/// returns matters: the behaviour-policy return is what this method improves.
#[must_use]
pub fn evaluate_parallel<F>(rollout: F, episodes: usize) -> (f64, f64)
where
    F: Fn(u64) -> f64 + Sync + Send,
{
    let returns: Vec<f64> = (0..episodes as u64).into_par_iter().map(&rollout).collect();

    let mean = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance =
        returns.iter().map(|r| (r - mean).powi(2)).sum::<f64>() / (returns.len() as f64 - 1.0);

    (mean, variance.sqrt())
}`,
        rationale:
          'The method is extended to SARSA(lambda), and the naive form of that decays an entire |S|×|A| trace vector every step — more expensive than the algorithm it is meant to accelerate. Traces decay geometrically, so the list of numerically relevant ones is short: keeping only those turns the sweep into a pass over a few dozen entries. Traces replace rather than accumulate, which matters because accumulating traces diverge on any environment with a cycle. Parallelism goes into evaluation, the honest placement given that on-policy training cannot even replay stored experience.',
        optimizations: [
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The active-trace list is sized once from the expected trace horizon, so the per-step visit and decay never reallocate.',
            tradeoff: 'The capacity is a guess; an environment with a longer effective horizon than expected still grows the vector, and one with a shorter horizon holds memory it never uses.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Credit assignment walks the active list and the row reductions walk a slice, so the bounds checks fall out of both hot paths.',
            tradeoff: 'The trace cutoff makes the update an approximation of true SARSA(lambda) — traces below it are dropped rather than left to decay, which slightly truncates long-range credit.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Evaluation episodes are independent, while on-policy training updates are sequentially dependent and cannot replay stored experience — so this is where parallelism honestly is.',
            tradeoff: 'Training throughput is unchanged, which is the bottleneck people usually want fixed; this only shortens the evaluation half.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Credit assignment over a short active list instead of an |S| x |A| sweep; evaluation across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
