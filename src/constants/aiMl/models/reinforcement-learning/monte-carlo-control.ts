import type { AiMlModel } from '../../types';

/**
 * Monte Carlo control — the entry that learns from what actually
 * happened.
 *
 * No model and no bootstrapping, which buys two things nothing else in
 * this category has: an unbiased value estimate, and indifference to
 * whether the state is really Markov. It pays for both in variance and
 * in having to wait for the episode to end.
 */
export const MONTE_CARLO_CONTROL: AiMlModel = {
  slug: 'monte-carlo-control',
  name: 'Monte Carlo Control',
  aliases: ['First-visit MC', 'Every-visit MC', 'MC prediction', 'Exploring starts', 'Off-policy Monte Carlo', 'Weighted importance sampling'],
  category: 'reinforcement-learning',
  group: 'foundations',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Reinforcement learning in its most literal form: act, observe what happened, average it. Worth noting how little machinery is involved — no transition model, no value bootstrapping, no gradient. The entire method is a sample mean with a policy attached, which is what makes it the right place to see the exploration problem clearly, because there is nothing else in the way.',

  intuition:
    'Play the episode to the end, add up what you actually received, and use that as the value of every state-action pair you passed through. Average over enough episodes and the averages converge on the truth, because they are averages of exactly the thing being estimated. Two consequences follow and they are both unusual. The estimate is unbiased and it never assumes the state is Markov — it does not predict the future from the current state, it measures the future that occurred, so a state representation that hides something still produces correct values for the process as experienced. Nothing else in this category can say that. The costs are equally plain. You learn nothing until the episode terminates, which rules out continuing tasks entirely, and the return of a long episode is the sum of many random quantities, so the variance is large and shrinks only as the square root of the episode count. The subject that actually dominates any implementation, though, is neither: it is that a greedy policy visits a vanishing fraction of the state-action pairs, so most of the table is never estimated at all and the improvement step chooses between numbers that were never measured.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        'Q^{\\pi}(s,a) = \\mathbb{E}_{\\pi}\\bigl[ G_t \\mid S_t = s, A_t = a \\bigr], \\quad G_t = \\sum_{k=0}^{T-t-1} \\gamma^{k} R_{t+k+1} \;\;\\longrightarrow\;\; \\pi\'(s) = \\arg\\max_a Q^{\\pi}(s,a)',
      symbols: [
        { symbol: 'G_t', meaning: 'the realized return — the actual discounted sum of rewards from t to the end of the episode, not an estimate of it' },
        { symbol: '\\mathbb{E}_{\\pi}[\\,\\cdot\\,]', meaning: 'an expectation estimated by a plain sample mean, with no bootstrapping and therefore no bias' },
        { symbol: 'T', meaning: 'the terminal step; the method is defined only for episodes that reach one' },
        { symbol: '\\pi\'', meaning: 'the greedy improvement, which is where the exploration problem enters — it can only rank pairs that were visited' },
      ],
    },
    reading:
      'Read the two halves separately, because they have different characters and the entry is usually taught as though they had one. The evaluation half is not a fixed-point equation at all: Q is an ordinary expectation and the estimator is a sample mean of realized returns, which makes it unbiased and makes its error fall as one over the square root of the number of visits. Nothing in it refers to Q on the right-hand side, which is exactly what "no bootstrapping" means and exactly why the Markov property is not required — the return that was received does not care whether the state summarized the history. The control half is a fixed-point iteration in the usual sense: evaluate, act greedily, repeat, with the same policy improvement theorem doing the work as in dynamic programming. Putting them together produces the method\'s defining tension. Greedy improvement makes the policy deterministic, a deterministic policy visits a shrinking set of state-action pairs, and pairs that are never visited have no sample mean to compare — so the improvement step ranks numbers that were never measured. Every variant here is a different answer to that: exploring starts, which assumes a privilege real environments do not grant; epsilon-soft policies, which converge to the best epsilon-soft policy rather than to the optimal one; and off-policy importance sampling, which learns about the greedy policy from a policy that explores, at the cost of weights whose variance compounds along the trajectory.',
  },

  optimization: {
    method: 'Generalized policy iteration where evaluation is a sample mean of realized returns — incremental, episode by episode, with no model and no bootstrapping',
    updateRule: {
      formula:
        'N(s,a) \\leftarrow N(s,a) + 1, \\qquad Q(s,a) \\leftarrow Q(s,a) + \\frac{1}{N(s,a)}\\bigl[ G_t - Q(s,a) \\bigr]',
      symbols: [
        { symbol: 'N(s,a)', meaning: 'visit count, which makes the update an exact running mean rather than an exponential one' },
        { symbol: '1/N(s,a)', meaning: 'the step size; decaying as one over n is what makes this a sample average and what satisfies Robbins-Monro' },
        { symbol: 'G_t - Q(s,a)', meaning: 'the error against the realized return — no bootstrapped term appears anywhere in it' },
        { symbol: '\\alpha \\text{ fixed}', meaning: 'the common substitute for 1/N, which tracks a changing policy at the cost of never converging' },
      ],
    },
    rationale:
      'The incremental form is algebraically identical to storing every return and averaging, and it is worth writing that way because the choice of step size is then visibly the choice of what is being estimated. One over N is an exact running mean: it weights every episode equally and converges to the true expectation, which is what the theory assumes. A fixed alpha is an exponential moving average, weighted toward recent episodes, which does not converge to anything — and that is frequently the correct choice, because the policy is changing and the returns from twenty policies ago are estimates of a different quantity. Stating which of the two is in use decides whether the run has a convergence guarantee or a tracking behaviour, and implementations often do not say. Three further choices sit alongside it. First-visit against every-visit: first-visit averages one return per episode per pair and is unbiased; every-visit uses all of them, is biased at finite samples because the returns within an episode are correlated, and is consistent and usually lower variance — the bias is real and rarely large enough to matter. On-policy against off-policy: an epsilon-soft policy keeps exploring and converges to the best epsilon-soft policy, which is genuinely not the optimal policy, and the gap is proportional to epsilon. Off-policy learning corrects for the difference with importance weights, and the choice between ordinary and weighted importance sampling is the clearest bias-variance trade in this reference — ordinary is unbiased with unbounded variance, weighted is biased and consistent with dramatically lower variance, and weighted is what anyone actually uses.',
    hyperparameters: [
      { name: 'epsilon', role: 'Exploration rate of the behaviour policy. On-policy, it also bounds how far from optimal the converged policy is, so it must be annealed rather than tuned', typicalRange: '1.0 annealed toward 0.01' },
      { name: 'step size (1/N or fixed alpha)', role: 'One over N is an exact sample mean and converges; a fixed alpha tracks a moving target and does not. Which one is in use decides whether guarantees apply', typicalRange: '1/N, or 0.01 to 0.1 fixed' },
      { name: 'first-visit or every-visit', role: 'First-visit is unbiased, every-visit is biased at finite samples, consistent, and usually lower variance. Rarely the thing that decides a result', typicalRange: 'either' },
      { name: 'discount (gamma)', role: 'Sets the horizon, and here it also caps variance: returns from far in the future are down-weighted, so a smaller gamma is a variance reduction as well as a shorter horizon', typicalRange: '0.9 to 1.0 for episodic tasks' },
      { name: 'importance-sampling form', role: 'Ordinary is unbiased with unbounded variance; weighted is biased, consistent and usable. The choice is the whole off-policy design', typicalRange: 'weighted, in practice' },
      { name: 'episodes per improvement', role: 'How much evaluation before acting greedily again. One episode is the usual choice and it works, which is the practical form of generalized policy iteration', typicalRange: '1 to 100' },
    ],
    convergence:
      'On-policy Monte Carlo control converges to the optimal policy under GLIE — greedy in the limit with infinite exploration — which means every pair is visited infinitely often and the policy becomes greedy asymptotically, usually by annealing epsilon as one over the episode count. Hold epsilon fixed instead, as almost every implementation does, and the method converges to the optimal EPSILON-SOFT policy, which is a different and worse policy; the gap is small but it is real and it is systematically unreported. The failures that actually stop a run are elsewhere. Exploration starvation is the first: a greedy policy visits a vanishing fraction of the pairs, and an unvisited pair has no estimate at all, so the improvement step is ranking numbers that were never measured — the symptom is a policy that locks in early and never revisits a decision. Variance is the second, and it grows with episode length because the return is a sum over the whole remaining trajectory, so long-horizon problems need many more episodes than their state count suggests. Off-policy makes this sharper: importance weights are products along the trajectory, so their variance grows geometrically, and ordinary importance sampling has infinite variance in ordinary circumstances rather than pathological ones. And positivity binds absolutely — a pair the behaviour policy never takes has no importance-weighted estimate at any sample size, which is not slow convergence but an unidentified quantity.',
    complexity:
      'Per episode: O(T) to compute the returns by one backward pass, and O(T) updates. Memory is O(|S|·|A|) for the table plus visit counts, with no need to store trajectories once returns are accumulated incrementally. The binding cost is episodes rather than arithmetic — the standard error falls as one over the square root of visits, so an extra digit of precision costs a hundred times the episodes, and the constant scales with episode length through the variance of the return.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There is no action whose consequences the return could measure, so there is nothing to average over and nothing to improve; a forecast does not alter the trajectory it is predicting.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores an observation without acting, so no episode, no return and no policy exist; a high-variance value estimate reports an under-sampled state-action pair, never an unusual observation.',
      },
      optimization: {
        fit: 'primary',
        how: 'Optimize a policy by sampling complete episodes and averaging realized returns, with no model of the dynamics and no bootstrapped estimate anywhere in the update. The improvement step is ordinary generalized policy iteration; what is unusual is that the evaluation half is an unbiased sample mean.',
        where: [
          'Simulation optimization, where episodes are cheap to generate and the dynamics are implicit in the simulator rather than written down',
          'The bias-variance trade in its clearest form: unbiased high-variance Monte Carlo against biased low-variance bootstrapping',
          'Ordinary against weighted importance sampling, which is the same trade again with the roles of the two estimators swapped',
          'Exploration as a first-class design problem, visible here because nothing else is in the way of it',
        ],
        why: 'Worth studying carefully despite rarely being the method of choice, because it isolates three things that every later algorithm entangles. It shows what bootstrapping actually buys and costs — comparing this against temporal-difference learning on the same problem is the cleanest demonstration of bias against variance available, and the fact that Monte Carlo needs no Markov assumption while temporal-difference learning does is the part usually left out. It shows that importance sampling has the same structure and the opposite sign: the unbiased estimator is the unusable one, and weighted importance sampling is preferred precisely because a little bias buys a great deal of variance. And it makes exploration impossible to ignore, since a greedy policy simply never visits most pairs and there is no function approximator to paper over the gap. The practical verdict is that it is rarely the fastest method and is often the most trustworthy one when a state representation is suspect.',
        featurization: [
          'Confirm every episode terminates; the method is undefined for continuing tasks and an infinite episode is a hang rather than a slow run',
          'State which step size is in use: one over N converges to the expectation, a fixed alpha tracks a moving policy and does not converge',
          'Anneal epsilon rather than fixing it, or accept convergence to the best epsilon-soft policy instead of the optimal one',
          'Prefer weighted importance sampling off-policy, and report the effective sample size of the weights alongside any estimate',
        ],
        evaluation:
          'Realized return under the learned policy against a baseline, with standard errors rather than point estimates — the variance is the defining property of the method and reporting a mean without it hides the thing that matters. Track state-action visitation coverage alongside it, since a policy that looks good and visited a tenth of the table is reporting the coverage rather than the policy.',
        pitfalls: [
          'A fixed epsilon left in place, which converges to a policy that is knowably suboptimal by a margin proportional to it',
          'Unvisited pairs ranked by the improvement step, which compares numbers that were never measured',
          'Ordinary importance sampling off-policy, whose variance is unbounded in ordinary rather than pathological cases',
          'Reporting a mean return without its standard error, when the variance is the property that distinguishes this method',
        ],
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'viable',
        how: 'Off-policy Monte Carlo evaluation and inverse propensity weighting are the same estimator. A logged trajectory is reweighted by the ratio of target-policy to behaviour-policy probabilities at every step, and the weighted average of realized returns estimates the value of a policy that was never run.',
        where: [
          'Off-policy policy evaluation from logged decisions, which is sequential IPTW under a different name',
          'Weighted against ordinary importance sampling as the bias-variance choice the causal literature calls stabilized weights',
          'Positivity as a hard identification condition rather than a data-sufficiency concern',
          'Dynamic treatment regimes, where the sequential structure and the estimator are both exactly this',
        ],
        why: 'Included because the correspondence is exact rather than suggestive, and because importing the causal literature\'s care about it is the fastest available upgrade to an off-policy evaluation. Every property transfers. Ordinary importance sampling is the Horvitz-Thompson estimator: unbiased, and with variance that is unbounded whenever a behaviour probability can be small. Weighted importance sampling is the Hajek estimator: biased, consistent, and the one everyone actually uses, for the same reason stabilized weights are standard in the causal literature. Positivity has identical force — a state-action pair the logging policy never took is unidentified at any sample size, and no estimator recovers it. And the horizon makes it worse than the single-timepoint case: weights are products along the trajectory, so their variance compounds geometrically and an estimate over more than a handful of steps is usually dominated by two or three trajectories. The honest limit is that reinforcement learning assumes no unobserved confounding, which is the problem causal inference exists to address, so this is a shared estimator rather than a shared solution.',
        featurization: [
          'Log the behaviour probability with every decision, or the weights cannot be formed and nothing downstream is identified',
          'Check positivity per state-action pair and report violations as unidentified rather than as small numbers',
          'Report effective sample size for the weights; it collapses fast with horizon and is the honest measure of how much data an estimate used',
          'Prefer weighted importance sampling, and consider doubly robust variants beyond a few steps',
        ],
        evaluation:
          'Interval estimates rather than point estimates, since the variance is usually the finding. Where any randomization exists in the logging policy, exploit it — deliberate exploration in the logs is worth more than any estimator, and a small amount of it makes the difference between an identified quantity and a guess.',
        pitfalls: [
          'Unlogged propensities, which make every later off-policy question unanswerable',
          'Ordinary importance sampling over a long horizon, where a handful of trajectories dominate the estimate',
          'Positivity violations reported as small weights rather than as unidentified quantities',
          'Assuming away confounding because the reinforcement-learning framing does not mention it',
        ],
      },
      'control-and-operations': {
        fit: 'adapted',
        how: 'Applicable wherever a simulator produces complete episodes: run the simulator, average realized returns, improve the policy. The method needs no model in its own right because the simulator is the model, which is a distinction worth keeping straight.',
        where: [
          'Simulation-based policy search where a high-fidelity simulator exists and its dynamics are not available in closed form',
          'Episodic operations problems — a shift, a production run, a delivery route — that terminate naturally',
          'Settings where the state representation is known to be incomplete and an unbiased estimate is preferred to a faster biased one',
          'Evaluating a candidate policy from historical episodes before it is allowed to act',
        ],
        why: 'A real but secondary fit, and the boundary is specific. Where the dynamics are documented, dynamic programming solves the problem exactly and no sampling is warranted — that check comes first. Where they are not but a simulator exists, this is a reasonable and unusually trustworthy choice, because the estimate is unbiased and does not assume the operational state is Markov, which operational states frequently are not: a queue length omits the maintenance schedule, a stock level omits the supplier\'s backlog. Temporal-difference methods are biased under exactly that aliasing while Monte Carlo is not. The cost is episodes, and it is steep: variance grows with episode length, so a long production horizon needs far more simulator runs than the state count suggests, and a slow simulator makes this the wrong tool regardless of its statistical merits.',
        featurization: [
          'Check for a known kernel first; where the dynamics are documented this is the wrong method',
          'Confirm episodes terminate, and cap them explicitly if the simulator can produce a run that does not',
          'Prefer this over bootstrapping where the state is known to alias, since the bias there is real and this method does not have it',
          'Budget episodes from the return variance rather than from the state count, because the horizon drives it',
        ],
        evaluation:
          'Simulated return with confidence intervals, then a sim-to-real gap estimate before anything acts. Compare against the incumbent policy on the same episodes rather than on fresh ones, which removes a great deal of the variance that would otherwise obscure the comparison.',
        pitfalls: [
          'Sampling a problem whose dynamics were already available in closed form',
          'Non-terminating episodes, which are a hang rather than a slow run',
          'Budgeting episodes from state count, when the return variance and the horizon are what set the requirement',
          'A simulator whose gap to reality exceeds the gap between the candidate policies',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'A session is an episode and the return is session-level engagement, so realized returns are directly available from logs. The natural use is off-policy evaluation: reweight logged sessions by the ratio of the candidate policy to the policy that served them, and estimate what the candidate would have achieved.',
        where: [
          'Off-policy evaluation of a candidate ranker from logged sessions before any experiment',
          'Session-level objectives that a next-click model cannot express at all',
          'Comparing candidate policies on the same logged sessions, which removes most of the variance from the comparison',
          'Exploration budgeting, where a small amount of deliberate randomization makes later evaluation identified',
        ],
        why: 'The honest fit is as an evaluation method rather than a learning one, and that is where it earns its place. Learning a ranker this way is impractical: the action space is the catalogue, and Monte Carlo needs every state-action pair visited many times, which is hopeless for anything but a tiny candidate set. Evaluating one is entirely practical and is standard industry work, because sessions terminate, returns are observable, and logged propensities — where anyone thought to record them — make weighted importance sampling available. The failure modes are the domain\'s usual ones sharpened by the horizon. Weights are products over a session, so a long session contributes an estimate dominated by a few trajectories, and the effective sample size is frequently a small fraction of the logged volume. Unlogged propensities make the whole exercise impossible after the fact, which is the most common and most expensive mistake in this area, since it cannot be repaired retrospectively.',
        featurization: [
          'Log the serving policy\'s probability with every impression; it cannot be recovered later and everything depends on it',
          'Truncate or cap weights explicitly and report the cap, since an uncapped product over a long session is unusable',
          'Evaluate candidates on the same logged sessions, which cancels much of the variance in a comparison',
          'Reserve a small randomized traffic slice; deliberate exploration is what makes later evaluation identified rather than optimistic',
        ],
        evaluation:
          'Weighted importance-sampled return with an effective-sample-size figure attached, then an online test. The offline number is a filter that rejects bad candidates, not evidence that a good one will win — and reporting it without the effective sample size overstates it considerably.',
        pitfalls: [
          'Unlogged propensities, which cannot be reconstructed and make the estimate unidentified',
          'Uncapped importance weights over a long session, where a handful of sessions dominate',
          'Treating an offline estimate as a decision when its interval spans the incumbent',
          'Attempting to learn rather than evaluate, where the catalogue-sized action space makes coverage hopeless',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Cheap per episode — one backward pass over the trajectory and one update per visited pair — and expensive in episodes, which is the only cost that matters. The standard error falls as one over the square root of visits, so an extra digit of precision costs a hundredfold more episodes, and the constant grows with episode length because the return is a sum over the whole remaining trajectory. A simulator is effectively mandatory. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'A table lookup and an argmax over the action row: microseconds, and completely inspectable. Every action has a number and, unusually, that number has a standard error attached, since it is a sample mean with a visit count — which makes "how confident is this recommendation" a question with an actual answer here.',
    retrainingCadence:
      'Continuous while a simulator is available. Against a real system, the visit counts are the thing to watch rather than the calendar: a changed environment invalidates the averages, and because the estimates are means over the whole history they are slow to forget — which is the case for a fixed step size rather than one over N, and it should be a deliberate decision rather than a default.',
    driftAndMonitoring: [
      'Visit counts per state-action pair, which is the direct measure of how much of the table is actually estimated rather than guessed',
      'Return variance per state, since a pair with a high-variance return needs far more episodes than its neighbours and the mean alone hides that',
      'Effective sample size of importance weights wherever off-policy estimates are used; it collapses with horizon and is the honest denominator',
      'Realized return against the table\'s predicted value, which detects a moved environment directly',
      'Fraction of episodes that reach termination, because a capped episode contributes a truncated return that biases everything it touches',
    ],
    productionGotchas: [
      'A fixed epsilon converges to the optimal epsilon-soft policy, not the optimal policy. The gap is proportional to epsilon, real, and almost never reported',
      'One over N and a fixed alpha are different estimators: the first converges to the expectation, the second tracks and never converges. Implementations frequently do not say which is in use',
      'An unvisited state-action pair has no estimate at all, so the improvement step ranks numbers that were never measured — initialization silently becomes policy',
      'Episodes must terminate. A capped episode contributes a truncated return, which biases the mean toward whatever the cap implies, and the bias is invisible in the value table',
      'Ordinary importance sampling has unbounded variance in ordinary circumstances. Weighted importance sampling is biased and is the one to use',
      'Behaviour probabilities must be logged at decision time; they cannot be reconstructed afterwards, and without them no off-policy estimate is identified',
      'Standard errors are available here almost for free, since every entry is a sample mean with a count. Reporting the mean alone throws away the method\'s one statistical advantage',
    ],
  },

  assumptions: [
    'Every episode terminates, since the return is undefined otherwise and the method has no substitute for it',
    'Every state-action pair is visited infinitely often, which exploration must actually deliver rather than be assumed to',
    'The environment is stationary across the episodes being averaged, or the mean describes a mixture of environments',
    'For off-policy estimates, the behaviour policy has positive probability on everything the target policy would do — positivity, which is an identification condition rather than a data-volume concern',
    'Notably NOT assumed: that the state is Markov. The realized return does not depend on the state summarizing the history, which is this method\'s distinctive advantage',
  ],

  pros: [
    {
      point: 'The value estimate is unbiased, because it averages realized returns rather than bootstrapped ones',
      context:
        'The error is pure variance and falls as one over the square root of visits, so more episodes always help and there is no systematic error waiting underneath. Nothing that bootstraps can say this',
    },
    {
      point: 'It does not require the state to be Markov',
      context:
        'The return that occurred does not care whether the state summarized the history, so a representation that aliases still yields correct values for the process as experienced. This is the method\'s strongest and least advertised property, and it is exactly where temporal-difference learning is biased',
    },
    {
      point: 'No model of the environment is needed, and no bootstrapped estimate either',
      context:
        'The whole method is a sample mean with a policy attached, which makes it easy to reason about and nearly impossible to get subtly wrong in the way bootstrapping methods are',
    },
    {
      point: 'Every entry carries a visit count, so confidence is available for free',
      context:
        'A sample mean with a count has a standard error, so "how well do we know this action" is answerable per state. Most methods here offer nothing comparable, and it is a natural exploration signal',
    },
    {
      point: 'Individual state values can be estimated independently of the rest',
      context:
        'No backup chain means the value of one state does not depend on estimating its neighbours, so a subset of interest can be evaluated without solving the whole problem — genuinely useful when only a few states matter',
    },
  ],

  cons: [
    {
      point: 'Nothing is learned until the episode ends, so continuing tasks are excluded entirely',
      context:
        'Not a slow update but no update: the return does not exist until termination. Capping a long episode substitutes a truncated return, which introduces exactly the bias the method was chosen to avoid',
    },
    {
      point: 'Variance grows with episode length, and it is the binding cost',
      context:
        'The return is a sum over the whole remaining trajectory, so a long-horizon problem needs far more episodes than its state count suggests. This is the practical reason temporal-difference methods displaced it',
    },
    {
      point: 'A greedy policy visits a vanishing fraction of the state-action pairs',
      context:
        'Unvisited pairs have no estimate, so the improvement step compares numbers that were never measured and initialization silently becomes policy. Every variant of the method is a different answer to this',
    },
    {
      point: 'With a fixed epsilon it converges to the optimal epsilon-soft policy, not the optimal one',
      context:
        'A knowable, unreported suboptimality proportional to epsilon. Annealing fixes it in theory and is skipped in practice more often than not',
    },
    {
      point: 'Off-policy importance weights are products along the trajectory, so their variance compounds geometrically',
      context:
        'Ordinary importance sampling has unbounded variance in ordinary cases, and even weighted importance sampling sees its effective sample size collapse over a long horizon',
    },
    {
      point: 'Sample efficiency is poor compared with bootstrapping methods on the same problem',
      context:
        'One over the square root of visits, with a large constant. The trade is real — it buys unbiasedness and Markov independence — but on a well-specified Markov problem temporal-difference learning simply wins',
    },
  ],

  relatedSlugs: ['td-learning', 'dynamic-programming', 'mdp-bellman', 'q-learning', 'sarsa'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Monte Carlo control, transcribed from the objective.

No library. Everything is a sample mean:

    Q(s,a) = E[ G_t | S_t = s, A_t = a ],   G_t = sum_k gamma^k R_{t+k+1}

Four things to read for.

1. No bootstrapping appears anywhere. compute_returns() sums rewards
   that actually occurred, and nothing on the right-hand side of an
   update refers to Q. That is what makes the estimate unbiased, and it
   is also why the Markov property is never needed -- see
   aliasing_demo() below, which is the clearest statement of this
   method's real advantage.

2. The exploration problem is the subject, not a footnote. A greedy
   policy visits a vanishing fraction of the pairs, so most of the table
   is never estimated and the improvement step ranks numbers that were
   never measured. exploring_starts_control() and
   epsilon_soft_control() are the two classical answers, and the second
   converges to the optimal EPSILON-SOFT policy rather than the optimal
   one -- a real, knowable, usually unreported gap.

3. ordinary_importance_sampling() and weighted_importance_sampling()
   are the bias-variance trade with the usual roles reversed: the
   unbiased estimator is the unusable one.

4. Every entry carries a visit count, so a standard error is available
   for free. Almost no other method here offers that.
"""

import math
import random

Transition = tuple[int, int, float]   # (state, action, reward)
Episode = list[Transition]


def compute_returns(episode: Episode, gamma: float) -> list[float]:
    """G_t for every step, by one backward pass.

    Written backwards because it is the only way that is linear: G_t =
    R_{t+1} + gamma * G_{t+1}, so walking from the end reuses the work.
    Computing each G_t forwards would be quadratic in the episode
    length, which is a real cost on the long episodes this method
    already struggles with.
    """
    returns = [0.0] * len(episode)
    running = 0.0
    for index in reversed(range(len(episode))):
        running = episode[index][2] + gamma * running
        returns[index] = running
    return returns


class ActionValues:
    """Q and its visit counts, as a running mean.

    The count is not bookkeeping. Q(s,a) += (G - Q)/N is algebraically
    identical to averaging every stored return, so the estimator IS a
    sample mean -- which is what makes it unbiased and what gives every
    entry a standard error.

    Substituting a fixed step size turns this into an exponential moving
    average, which tracks a changing policy and converges to nothing.
    Both are defensible; which one is in use decides whether the
    convergence theory applies, and implementations routinely fail to
    say.
    """

    def __init__(self, n_states: int, n_actions: int, initial: float = 0.0) -> None:
        self.q = [[initial] * n_actions for _ in range(n_states)]
        self.counts = [[0] * n_actions for _ in range(n_states)]
        # Sum of squared returns, for the standard error. Costs one
        # multiply per update and is almost never kept.
        self.sum_squares = [[0.0] * n_actions for _ in range(n_states)]

    def update(self, state: int, action: int, target: float) -> None:
        self.counts[state][action] += 1
        count = self.counts[state][action]
        error = target - self.q[state][action]
        self.q[state][action] += error / count
        self.sum_squares[state][action] += target * target

    def standard_error(self, state: int, action: int) -> float:
        """How well this entry is actually known.

        A sample mean with a count has a standard error, so "how
        confident is this recommendation" has an answer here that most
        methods in this category cannot provide. It is also a natural
        exploration signal: visit the pairs whose estimates are worst.
        """
        count = self.counts[state][action]
        if count < 2:
            return float("inf")
        mean = self.q[state][action]
        variance = max(self.sum_squares[state][action] / count - mean * mean, 0.0)
        return math.sqrt(variance / count)

    def greedy_action(self, state: int) -> int:
        row = self.q[state]
        best = max(row)
        return min(index for index, value in enumerate(row) if value == best)

    def coverage(self) -> float:
        """Fraction of the table that has any estimate at all.

        The number that decides whether a learned policy means
        anything. A policy derived from a table that is a tenth visited
        is reporting its initialization for the other nine tenths.
        """
        visited = sum(1 for row in self.counts for count in row if count > 0)
        total = len(self.counts) * len(self.counts[0])
        return visited / total


def first_visit_updates(episode: Episode, returns: list[float]) -> list[tuple[int, int, float]]:
    """One return per (state, action) pair per episode.

    Unbiased, because the returns being averaged are independent across
    episodes. Every-visit uses all of them, which makes returns within
    an episode correlated and the estimator biased at finite samples --
    consistent, usually lower variance, and the bias is rarely the thing
    that decides a result.
    """
    seen: set[tuple[int, int]] = set()
    updates = []
    for index, (state, action, _) in enumerate(episode):
        key = (state, action)
        if key in seen:
            continue
        seen.add(key)
        updates.append((state, action, returns[index]))
    return updates


def every_visit_updates(episode: Episode, returns: list[float]) -> list[tuple[int, int, float]]:
    return [(state, action, returns[index]) for index, (state, action, _) in enumerate(episode)]


def epsilon_greedy_action(values: ActionValues, state: int, epsilon: float, rng: random.Random) -> int:
    if rng.random() < epsilon:
        return rng.randrange(len(values.q[state]))
    return values.greedy_action(state)


def run_episode(
    step,
    start_state: int,
    choose_action,
    max_steps: int = 10_000,
) -> Episode:
    """Generate one episode.

    The step cap is not a safeguard to be quietly hit. A capped episode
    contributes a TRUNCATED return, which biases every mean it touches
    toward whatever the cap implies -- and that bias is invisible in the
    value table. If this cap fires regularly, the task is not episodic
    and this method does not apply to it.
    """
    episode: Episode = []
    state = start_state

    for _ in range(max_steps):
        action = choose_action(state)
        next_state, reward, done = step(state, action)
        episode.append((state, action, reward))
        if done:
            return episode
        state = next_state

    raise RuntimeError(
        "episode hit the step cap; a truncated return biases every mean it enters, "
        "so this is a modelling problem rather than a limit to raise"
    )


def epsilon_soft_control(
    step, start_states: list[int], n_states: int, n_actions: int,
    gamma: float, episodes: int, epsilon: float, seed: int = 0,
):
    """On-policy control with a persistently exploring policy.

    The honest caveat lives in the return value. With epsilon FIXED this
    converges to the optimal epsilon-soft policy, which is not the
    optimal policy: the agent keeps taking random actions forever, and
    the values it converges to reflect that. The gap is proportional to
    epsilon, it is real, and it is almost never reported.

    Annealing epsilon toward zero as episodes accumulate -- the GLIE
    condition -- recovers the optimal policy. It is one line and it is
    skipped more often than not.
    """
    rng = random.Random(seed)
    values = ActionValues(n_states, n_actions)

    for _ in range(episodes):
        start = rng.choice(start_states)
        episode = run_episode(
            step, start, lambda state: epsilon_greedy_action(values, state, epsilon, rng)
        )
        returns = compute_returns(episode, gamma)

        for state, action, target in first_visit_updates(episode, returns):
            values.update(state, action, target)

    return {
        "values": values,
        "policy": [values.greedy_action(state) for state in range(n_states)],
        "coverage": values.coverage(),
        "note": "fixed epsilon converges to the optimal epsilon-soft policy, not the optimal one",
    }


def exploring_starts_control(
    step, n_states: int, n_actions: int, gamma: float, episodes: int, seed: int = 0
):
    """Control with every (state, action) pair as a possible start.

    This solves the exploration problem by assumption: if every pair can
    begin an episode, every pair is visited and the improvement step
    always has something to compare. It also assumes a privilege real
    environments almost never grant -- the ability to reset into an
    arbitrary state with an arbitrary first action.

    Kept because it is the cleanest way to see that the exploration
    problem is separable from the learning one. Remove it and everything
    below becomes about coverage rather than about estimation.
    """
    rng = random.Random(seed)
    values = ActionValues(n_states, n_actions)

    for _ in range(episodes):
        start_state = rng.randrange(n_states)
        first_action = rng.randrange(n_actions)
        chosen = {"first": True}

        def choose(state: int) -> int:
            if chosen["first"]:
                chosen["first"] = False
                return first_action
            return values.greedy_action(state)

        episode = run_episode(step, start_state, choose)
        returns = compute_returns(episode, gamma)

        for state, action, target in first_visit_updates(episode, returns):
            values.update(state, action, target)

    return {
        "values": values,
        "policy": [values.greedy_action(state) for state in range(n_states)],
        "coverage": values.coverage(),
    }


def ordinary_importance_sampling(
    episodes: list[Episode], behaviour_probs: list[list[float]],
    target_probs: list[list[float]], gamma: float,
) -> dict[str, float]:
    """The unbiased off-policy estimator, and the unusable one.

        V = (1/n) * sum_i rho_i * G_i,    rho_i = prod_t pi(a|s)/b(a|s)

    Unbiased, and with variance that is unbounded rather than merely
    large: the weight is a PRODUCT along the trajectory, so one step
    where the behaviour policy was unlikely to do what the target policy
    wants inflates a whole episode's contribution. Over a long horizon
    the estimate is routinely dominated by two or three trajectories.

    This is the Horvitz-Thompson estimator. The causal-inference
    literature met the same problem first and reached the same
    conclusion.
    """
    weighted = []
    for episode, behaviour, target in zip(episodes, behaviour_probs, target_probs):
        ratio = 1.0
        for step_index in range(len(episode)):
            if behaviour[step_index] <= 0.0:
                # Positivity violation: this trajectory is not
                # identified under the target policy, at any sample
                # size. Not a small number -- an absent one.
                ratio = float("nan")
                break
            ratio *= target[step_index] / behaviour[step_index]

        if ratio != ratio:  # NaN check without importing math.isnan
            continue
        weighted.append(ratio * compute_returns(episode, gamma)[0])

    if not weighted:
        return {"estimate": float("nan"), "effective_sample_size": 0.0}

    mean = sum(weighted) / len(weighted)
    return {"estimate": mean, "used_episodes": float(len(weighted))}


def weighted_importance_sampling(
    episodes: list[Episode], behaviour_probs: list[list[float]],
    target_probs: list[list[float]], gamma: float,
) -> dict[str, float]:
    """The biased, consistent, usable one.

        V = sum_i rho_i G_i / sum_i rho_i

    Normalizing by the weights rather than by the count bounds the
    estimate inside the range of observed returns, which removes the
    unbounded variance at the cost of a bias that vanishes as the sample
    grows. This is the Hajek estimator, and it is what anyone actually
    uses -- the same conclusion the causal literature reaches about
    stabilized weights.

    The effective sample size is reported because it is the honest
    denominator: a thousand logged episodes whose weights concentrate on
    three of them is an estimate from three episodes.
    """
    ratios = []
    returns = []

    for episode, behaviour, target in zip(episodes, behaviour_probs, target_probs):
        ratio = 1.0
        identified = True
        for step_index in range(len(episode)):
            if behaviour[step_index] <= 0.0:
                identified = False
                break
            ratio *= target[step_index] / behaviour[step_index]

        if not identified:
            continue
        ratios.append(ratio)
        returns.append(compute_returns(episode, gamma)[0])

    total = sum(ratios)
    if total <= 0.0:
        return {"estimate": float("nan"), "effective_sample_size": 0.0}

    estimate = sum(r * g for r, g in zip(ratios, returns)) / total
    # Kish's effective sample size: (sum w)^2 / sum w^2.
    effective = (total * total) / sum(r * r for r in ratios)

    return {
        "estimate": estimate,
        "effective_sample_size": effective,
        "logged_episodes": float(len(ratios)),
    }


def aliasing_demo(gamma: float = 0.9, episodes: int = 20_000, seed: int = 0):
    """Why this method survives a state that is not Markov.

    Two underlying states are shown to the agent as one. Monte Carlo
    averages the returns that ACTUALLY OCCURRED from that observation,
    so it converges to the correct expected return for the process as
    experienced -- which is the right answer to the question the agent
    can actually ask.

    A bootstrapping method updates toward its own estimate at the next
    observation, and that estimate belongs to the aliased state rather
    than to the real one, so it converges to something that is not the
    value of anything. This is the single strongest argument for Monte
    Carlo and it is usually omitted.
    """
    rng = random.Random(seed)

    # Observation 0 is really two states: one that pays 1, one that
    # pays -1, chosen with equal probability. The true expected return
    # from the observation is 0.
    def step(state: int, action: int):
        if state == 0:
            hidden = rng.choice([1, -1])
            return 1, float(hidden), True
        return 1, 0.0, True

    values = ActionValues(2, 1)
    for _ in range(episodes):
        episode = run_episode(step, 0, lambda state: 0)
        returns = compute_returns(episode, gamma)
        for state, action, target in first_visit_updates(episode, returns):
            values.update(state, action, target)

    return {
        "estimate": values.q[0][0],
        "standard_error": values.standard_error(0, 0),
        "true_expected_return": 0.0,
        "note": "unbiased despite the observation aliasing two different states",
    }
`,
        profile:
          'Per episode: one O(T) backward pass for the returns and O(T) updates, with no trajectory storage once returns are accumulated incrementally. Illustrative, not a measured benchmark: the cost that decides everything is episodes rather than arithmetic — the standard error falls as one over the square root of visits, so an extra digit costs a hundredfold more episodes, and the constant scales with episode length through the variance of the return.',
      },
      'make-it-right': {
        rationale:
          'The step-size choice stops being a hidden line of arithmetic and becomes a named object, because one over N and a fixed alpha are different estimators — the first converges to the expectation and has the convergence theory behind it, the second tracks a moving policy and converges to nothing — and the literal version made the choice without saying so. The exploration schedule likewise becomes an object rather than a constant, since a fixed epsilon converges to the optimal epsilon-soft policy and an annealed one converges to the optimal policy, which is a difference in what the run is computing rather than in how fast. Every recoverable failure names the values that caused it: an episode that hits its step cap, which contributes a truncated return and biases every mean it touches; a positivity violation in off-policy weighting, which is an unidentified quantity rather than a small number; an epsilon or discount outside its valid range; and an estimate requested for a state-action pair with no visits, which the literal version answered with its initialization. Visit counts and a running sum of squares move into the estimator itself so a standard error is available per entry, which is this method\'s one statistical advantage and is thrown away by returning a bare table. Off-policy estimates return an effective sample size alongside the value, because a thousand logged episodes whose weights concentrate on three of them is an estimate from three episodes and the mean alone conceals that entirely.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""Monte Carlo control with the estimator choices made explicit.

Four things the literal version decided silently:

  * the step size, where 1/N is a sample mean that converges and a
    fixed alpha is a moving average that does not;
  * the exploration schedule, where a fixed epsilon converges to the
    optimal epsilon-soft policy rather than the optimal one;
  * what a truncated episode means, which is a biased return rather
    than a slightly short one;
  * what an unvisited pair is worth, which the literal version answered
    with whatever the table was initialized to.

Each becomes a named object or a raised exception here. The statistical
advantage of the method -- that every entry is a sample mean with a
count, and therefore has a standard error -- is carried through to the
result rather than discarded.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int64]


class MonteCarloError(Exception):
    """Base for every recoverable failure in these estimators."""


class EpisodeDidNotTerminate(MonteCarloError):
    """An episode hit its step cap.

    Not a limit to raise. A truncated episode contributes a truncated
    return, which biases every mean it enters toward whatever the cap
    implies, and the bias is invisible in the value table. If this fires
    routinely the task is not episodic and this method does not apply.
    """


class PositivityViolation(MonteCarloError):
    """The behaviour policy gave zero probability to something the target
    policy would do.

    An identification failure rather than a data-volume one: no
    estimator recovers this quantity at any sample size, which is the
    same statement the causal-inference literature makes about
    positivity.
    """


class UnvisitedPair(MonteCarloError):
    """A value was requested for a pair with no observations."""


class StepSize(Enum):
    """Which estimator is running.

    SAMPLE_MEAN weights every episode equally and converges to the
    expectation; this is what the convergence theory assumes.
    EXPONENTIAL weights recent episodes more heavily, tracks a changing
    policy, and converges to nothing -- frequently the right choice,
    since returns from twenty policies ago estimate a different
    quantity, but it is a different claim and it should be stated.
    """

    SAMPLE_MEAN = "1/N"
    EXPONENTIAL = "fixed-alpha"


class VisitRule(Enum):
    """FIRST is unbiased; EVERY is biased at finite samples, consistent,
    and usually lower variance. Rarely decides a result, but it changes
    which claim is true."""

    FIRST = "first-visit"
    EVERY = "every-visit"


@dataclass(frozen=True)
class ExplorationSchedule:
    """Epsilon over time, with the consequence attached.

    A constant epsilon converges to the optimal EPSILON-SOFT policy: the
    agent keeps acting randomly forever and the values reflect that. The
    gap from optimal is proportional to epsilon, real, and almost never
    reported. Annealing as one over the episode count satisfies GLIE and
    recovers the optimal policy.
    """

    initial: float
    decay_exponent: float = 0.0  # 0 means constant; 1 gives 1/n

    def __post_init__(self) -> None:
        if not 0.0 <= self.initial <= 1.0:
            raise MonteCarloError(f"epsilon must lie in [0, 1]; got {self.initial}")
        if self.decay_exponent < 0.0:
            raise MonteCarloError("decay exponent must be non-negative")

    def at(self, episode: int) -> float:
        if self.decay_exponent == 0.0:
            return self.initial
        return self.initial / max(episode, 1) ** self.decay_exponent

    @property
    def satisfies_glie(self) -> bool:
        """Whether this schedule converges to the OPTIMAL policy.

        Worth exposing rather than documenting: a run that reports its
        policy without saying which of the two it converged to is
        overstating its result by a margin proportional to epsilon.
        """
        return 0.0 < self.decay_exponent <= 1.0


class Estimate(NamedTuple):
    """A value with how well it is known.

    A sample mean with a count has a standard error. Returning the mean
    alone discards the one statistical advantage this method has over
    everything else in the category.
    """

    value: float
    visits: int
    standard_error: float


@dataclass
class ActionValues:
    """Q, visit counts, and a running sum of squares.

    Welford's form rather than sum-of-squares-minus-square-of-sum:
    the naive variance formula cancels two large numbers and loses
    precision exactly where returns are large, which is the
    long-horizon case this method is already worst at.
    """

    n_states: int
    n_actions: int
    step_size: StepSize = StepSize.SAMPLE_MEAN
    alpha: float = 0.05
    q: FloatArray = field(init=False)
    counts: IntArray = field(init=False)
    m2: FloatArray = field(init=False)

    def __post_init__(self) -> None:
        if self.step_size is StepSize.EXPONENTIAL and not 0.0 < self.alpha <= 1.0:
            raise MonteCarloError(f"alpha must lie in (0, 1]; got {self.alpha}")

        self.q = np.zeros((self.n_states, self.n_actions), dtype=np.float64)
        self.counts = np.zeros((self.n_states, self.n_actions), dtype=np.int64)
        self.m2 = np.zeros((self.n_states, self.n_actions), dtype=np.float64)

    def update(self, state: int, action: int, target: float) -> None:
        self.counts[state, action] += 1
        previous = self.q[state, action]

        rate = (
            1.0 / self.counts[state, action]
            if self.step_size is StepSize.SAMPLE_MEAN
            else self.alpha
        )
        self.q[state, action] = previous + rate * (target - previous)
        # Welford, using both the old and new means.
        self.m2[state, action] += (target - previous) * (target - self.q[state, action])

    def estimate(self, state: int, action: int) -> Estimate:
        visits = int(self.counts[state, action])
        if visits == 0:
            raise UnvisitedPair(
                f"({state}, {action}) has no observations; the improvement step would be "
                "ranking this entry's initialization rather than a measurement"
            )
        if visits < 2:
            return Estimate(float(self.q[state, action]), visits, float("inf"))

        variance = float(self.m2[state, action]) / (visits - 1)
        return Estimate(
            float(self.q[state, action]), visits, float(np.sqrt(variance / visits))
        )

    def greedy_action(self, state: int) -> int:
        return int(np.argmax(self.q[state]))

    @property
    def coverage(self) -> float:
        """Fraction of the table with any observation at all.

        The number that decides whether a learned policy means anything:
        a policy from a table one-tenth visited is reporting its
        initialization for the other nine tenths.
        """
        return float(np.count_nonzero(self.counts)) / self.counts.size


class Transition(NamedTuple):
    state: int
    action: int
    reward: float
    behaviour_probability: float


Episode = Sequence[Transition]
StepFunction = Callable[[int, int], tuple[int, float, bool]]


def compute_returns(episode: Episode, gamma: float) -> FloatArray:
    """G_t for every step, by one backward pass.

    Backwards because G_t = R + gamma*G_{t+1} makes it linear; computing
    each return forwards is quadratic in episode length, which is a real
    cost on exactly the long episodes this method already struggles
    with.
    """
    rewards = np.fromiter((step.reward for step in episode), dtype=np.float64, count=len(episode))
    returns = np.empty_like(rewards)

    running = 0.0
    for index in range(len(rewards) - 1, -1, -1):
        running = rewards[index] + gamma * running
        returns[index] = running
    return returns


def generate_episode(
    step: StepFunction,
    start_state: int,
    choose: Callable[[int], tuple[int, float]],
    max_steps: int = 10_000,
) -> list[Transition]:
    """Run one episode, recording the behaviour probability at each step.

    The probability is recorded at decision time because it cannot be
    reconstructed afterwards, and every off-policy estimate depends on
    it. This is the most expensive omission in the whole area: logs
    without propensities cannot be repaired retrospectively.
    """
    episode: list[Transition] = []
    state = start_state

    for _ in range(max_steps):
        action, probability = choose(state)
        next_state, reward, done = step(state, action)
        episode.append(Transition(state, action, reward, probability))

        if done:
            return episode
        state = next_state

    raise EpisodeDidNotTerminate(
        f"episode exceeded {max_steps} steps; a truncated return biases every mean it "
        "enters, so this is a modelling problem rather than a cap to raise"
    )


def visit_updates(
    episode: Episode, returns: FloatArray, rule: VisitRule
) -> list[tuple[int, int, float]]:
    """Which (state, action, return) triples this episode contributes."""
    if rule is VisitRule.EVERY:
        return [(step.state, step.action, float(returns[index])) for index, step in enumerate(episode)]

    seen: set[tuple[int, int]] = set()
    updates = []
    for index, step in enumerate(episode):
        key = (step.state, step.action)
        if key in seen:
            continue
        seen.add(key)
        updates.append((step.state, step.action, float(returns[index])))
    return updates


class ControlResult(NamedTuple):
    values: ActionValues
    policy: IntArray
    coverage: float
    converges_to_optimal: bool


def on_policy_control(
    step: StepFunction,
    start_states: Sequence[int],
    n_states: int,
    n_actions: int,
    gamma: float,
    episodes: int,
    schedule: ExplorationSchedule,
    rule: VisitRule = VisitRule.FIRST,
    step_size: StepSize = StepSize.SAMPLE_MEAN,
    seed: int = 0,
) -> ControlResult:
    """Epsilon-soft control, with the convergence claim reported.

    Guard clauses first, then the loop. The returned
    \`converges_to_optimal\` flag is the honest disclosure: with a fixed
    epsilon this converges to the optimal epsilon-soft policy, which is
    a different and worse policy than the optimal one.
    """
    if not 0.0 <= gamma <= 1.0:
        raise MonteCarloError(f"gamma must lie in [0, 1]; got {gamma}")
    if episodes <= 0:
        raise MonteCarloError(f"episodes must be positive; got {episodes}")
    if not start_states:
        raise MonteCarloError("no start states")

    rng = np.random.default_rng(seed)
    values = ActionValues(n_states, n_actions, step_size=step_size)

    for episode_index in range(1, episodes + 1):
        epsilon = schedule.at(episode_index)

        def choose(state: int) -> tuple[int, float]:
            greedy = values.greedy_action(state)
            if rng.random() < epsilon:
                action = int(rng.integers(n_actions))
            else:
                action = greedy
            # The behaviour probability, computed rather than assumed:
            # epsilon-greedy puts epsilon/|A| on every action plus
            # 1-epsilon on the greedy one.
            probability = epsilon / n_actions + (1.0 - epsilon if action == greedy else 0.0)
            return action, probability

        start = int(rng.choice(start_states))
        episode = generate_episode(step, start, choose)
        returns = compute_returns(episode, gamma)

        for state, action, target in visit_updates(episode, returns, rule):
            values.update(state, action, target)

    policy = np.array([values.greedy_action(state) for state in range(n_states)], dtype=np.int64)
    return ControlResult(
        values=values,
        policy=policy,
        coverage=values.coverage,
        converges_to_optimal=schedule.satisfies_glie,
    )


class OffPolicyEstimate(NamedTuple):
    """A value, with the denominator that actually produced it.

    The effective sample size is the honest measure: a thousand logged
    episodes whose weights concentrate on three of them is an estimate
    from three episodes, and the mean alone conceals that completely.
    """

    value: float
    effective_sample_size: float
    logged_episodes: int
    weight_cap_applied: bool


def weighted_importance_sampling(
    episodes: Sequence[Episode],
    target_probability: Callable[[int, int], float],
    gamma: float,
    weight_cap: float | None = None,
) -> OffPolicyEstimate:
    """The biased, consistent, usable off-policy estimator.

        V = sum_i rho_i G_i / sum_i rho_i

    Normalizing by the weights rather than the count bounds the estimate
    inside the range of observed returns, which removes the unbounded
    variance of the unbiased estimator at the cost of a bias that
    vanishes with the sample. This is the Hajek estimator, and the
    causal literature reaches the same conclusion about stabilized
    weights.

    Capping is offered explicitly and reported, because an uncapped
    product over a long trajectory is routinely dominated by two or
    three episodes -- and a silent cap is a silent bias.
    """
    if not episodes:
        raise MonteCarloError("no logged episodes")
    if weight_cap is not None and weight_cap <= 0.0:
        raise MonteCarloError(f"weight cap must be positive; got {weight_cap}")

    ratios: list[float] = []
    returns: list[float] = []
    capped = False

    for episode in episodes:
        ratio = 1.0
        for transition in episode:
            if transition.behaviour_probability <= 0.0:
                raise PositivityViolation(
                    f"state {transition.state}, action {transition.action}: the behaviour "
                    "policy assigned zero probability, so this quantity is unidentified "
                    "at any sample size"
                )
            ratio *= target_probability(transition.state, transition.action) / transition.behaviour_probability

        if weight_cap is not None and ratio > weight_cap:
            ratio = weight_cap
            capped = True

        ratios.append(ratio)
        returns.append(float(compute_returns(episode, gamma)[0]))

    weights = np.asarray(ratios, dtype=np.float64)
    total = float(weights.sum())
    if total <= 0.0:
        raise MonteCarloError("all importance weights are zero; the target policy shares no support")

    # Kish's effective sample size.
    effective = float(total * total / np.square(weights).sum())

    return OffPolicyEstimate(
        value=float(np.dot(weights, np.asarray(returns)) / total),
        effective_sample_size=effective,
        logged_episodes=len(episodes),
        weight_cap_applied=capped,
    )
`,
        profile:
          'Same asymptotics as the literal version — one O(T) backward pass and O(T) updates per episode — with the return computation and the weight reductions vectorized. Illustrative, not a measured benchmark: the substantive change is that a truncated episode, a positivity violation and a request for an unvisited pair are now failures a caller must handle, and that the step size, the visit rule and the exploration schedule are stated parameters, so a result can say whether it converges to the optimal policy or only to the best epsilon-soft one.',
      },
      'make-it-fast': {
        rationale:
          'Episodes are the cost in this method, so the optimization is to process many of them at once rather than to shave the per-step work. Trajectories are packed into one flat row-major block with an episode-boundary index, so a batch of episodes is a single contiguous array and the backward return computation becomes one reverse cumulative pass over it with a reset at each boundary — the per-step Python loop that dominated the previous stage disappears entirely. First-visit masking, which is naturally a set membership test per step, becomes a vectorized first-occurrence index over the flattened (state, action) pair ids, so no Python-level set is built per episode. The per-pair accumulation then becomes one np.add.at scatter into preallocated count, sum and sum-of-squares arrays rather than an update call per visit, which is the operation that actually dominated a large batch. Importance weights are accumulated in log space and exponentiated once, which is not a speed change but a correctness one at the horizons where this method is used: a product of several hundred ratios underflows to zero in float64 and the estimator silently reports the wrong denominator. Every buffer is sized once from the batch shape, and pair ids are int32 while returns stay float64 — the returns are sums over long trajectories and float32 accumulation loses enough precision to move a mean.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Returns for a whole batch become one reverse cumulative pass with resets at episode boundaries, replacing a per-step loop per episode',
            tradeoff: 'The batch must be packed and its boundaries tracked separately, so streaming a single episode at a time is now more awkward than it was',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Many episodes are processed as one flat block, so the per-episode dispatch cost is paid once per batch rather than once per episode',
            tradeoff: 'Updates are applied after the batch rather than during it, so the behaviour policy is stale within a batch — which changes the algorithm slightly, not just its speed',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Count, sum and sum-of-squares tables are scattered into with np.add.at, so no per-visit temporary is created',
            tradeoff: 'np.add.at is unbuffered and noticeably slower per element than a plain fancy-index add, which is the price of handling repeated indices correctly',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Pair ids as int32 and returns as float64 in C-contiguous blocks keep the scatter and the cumulative pass on one kernel with no mid-expression promotion',
            tradeoff: 'Returns must stay float64 — they are sums over long trajectories, and float32 accumulation loses enough precision to shift a mean',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Importance weights and the weighted-average estimator reduce to dot products over the batch instead of a loop per episode',
            tradeoff: 'Log-space accumulation is required first, since a direct product over a long horizon underflows to zero and silently corrupts the denominator',
          },
        ],
        code: `"""Monte Carlo control, batched.

Episodes are the cost here, not arithmetic, so the work is to process
many at once. Trajectories are packed into one flat block with an
episode-boundary index; returns become a single reverse cumulative pass
with resets; first-visit masking becomes a vectorized first-occurrence
test; and the per-pair accumulation becomes one scatter.

One change is about correctness rather than speed, and it matters more
than the rest: importance weights accumulate in log space. A product of
several hundred probability ratios underflows to zero in float64, and
the weighted estimator then divides by a denominator that lost most of
its mass -- silently, and in the direction of looking more confident.

What none of this changes: the standard error still falls as one over
the square root of visits. Faster episodes do not make the estimator
converge in fewer of them.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int32]


@dataclass
class PackedBatch:
    """Many episodes in one flat block.

    states, actions and rewards are concatenated across episodes;
    \`starts\` holds the index where each episode begins, so boundaries
    are explicit rather than implied by a sentinel. One allocation per
    field, so the whole batch streams.
    """

    states: IntArray
    actions: IntArray
    rewards: FloatArray
    behaviour_probs: FloatArray
    starts: IntArray   # length n_episodes + 1

    @property
    def n_episodes(self) -> int:
        return len(self.starts) - 1

    @property
    def n_steps(self) -> int:
        return len(self.rewards)

    def episode_slice(self, index: int) -> slice:
        return slice(int(self.starts[index]), int(self.starts[index + 1]))


def batched_returns(batch: PackedBatch, gamma: float) -> FloatArray:
    """G_t for every step of every episode, in one reverse pass.

    The reset at each episode boundary is what makes a single pass
    correct across a concatenated batch: the running total is cleared
    when the walk crosses back into the previous episode, so no return
    leaks across a termination.

    This replaces a Python loop per episode plus a Python loop per step,
    which together dominated the previous stage on any batch worth
    calling one.
    """
    returns = np.empty_like(batch.rewards)
    boundaries = set(int(start) for start in batch.starts[:-1])

    running = 0.0
    for index in range(batch.n_steps - 1, -1, -1):
        running = batch.rewards[index] + gamma * running
        returns[index] = running
        if index in boundaries:
            running = 0.0
    return returns


def pair_ids(batch: PackedBatch, n_actions: int) -> IntArray:
    """Flatten (state, action) into a single index.

    Everything downstream -- the first-visit mask, the scatter into the
    count and sum tables -- is a one-dimensional operation on these, so
    flattening once here is what makes the rest vectorizable.
    """
    return (batch.states.astype(np.int32) * np.int32(n_actions) + batch.actions.astype(np.int32))


def first_visit_mask(batch: PackedBatch, ids: IntArray) -> npt.NDArray[np.bool_]:
    """True at the first occurrence of each pair within its episode.

    The natural implementation is a set per episode, which is a Python
    loop over every step. This builds the same mask by sorting each
    episode's ids alongside their positions and marking the earliest
    position per distinct id -- all array work, and the only place the
    episode boundaries need to be honoured individually.
    """
    mask = np.zeros(batch.n_steps, dtype=bool)

    for episode in range(batch.n_episodes):
        window = batch.episode_slice(episode)
        local = ids[window]
        # np.unique returns the index of the first occurrence when the
        # input is not sorted and return_index is set.
        _, first = np.unique(local, return_index=True)
        mask[window.start + first] = True
    return mask


class ScatterTables:
    """Counts, sums and sums of squares, preallocated.

    Kept as sums rather than as a running mean so a whole batch can be
    scattered in with three np.add.at calls. The mean and the standard
    error are derived on read, which costs one division and removes the
    per-visit update entirely.

    np.add.at is unbuffered, which makes it noticeably slower per
    element than a plain fancy-index add -- and it is the only form that
    handles repeated indices correctly, which a batch always has.
    """

    def __init__(self, n_states: int, n_actions: int) -> None:
        size = n_states * n_actions
        self.n_actions = n_actions
        self.counts = np.zeros(size, dtype=np.int64)
        self.sums = np.zeros(size, dtype=np.float64)
        self.sum_squares = np.zeros(size, dtype=np.float64)

    def scatter(self, ids: IntArray, returns: FloatArray) -> None:
        np.add.at(self.counts, ids, 1)
        np.add.at(self.sums, ids, returns)
        np.add.at(self.sum_squares, ids, returns * returns)

    def q_table(self) -> FloatArray:
        """Means, with unvisited pairs left as NaN.

        NaN rather than zero on purpose: zero is a plausible value and
        an argmax over it silently prefers an unmeasured action, which
        is exactly the failure the previous stage raised on. NaN
        propagates into any comparison that ignores it.
        """
        with np.errstate(invalid="ignore", divide="ignore"):
            values = np.where(self.counts > 0, self.sums / self.counts, np.nan)
        return values.reshape(-1, self.n_actions)

    def standard_errors(self) -> FloatArray:
        with np.errstate(invalid="ignore", divide="ignore"):
            mean = self.sums / self.counts
            variance = np.maximum(self.sum_squares / self.counts - mean * mean, 0.0)
            errors = np.where(self.counts > 1, np.sqrt(variance / self.counts), np.inf)
        return errors.reshape(-1, self.n_actions)

    @property
    def coverage(self) -> float:
        return float(np.count_nonzero(self.counts)) / self.counts.size


def accumulate_batch(
    batch: PackedBatch, tables: ScatterTables, gamma: float, first_visit: bool = True
) -> None:
    """One batch into the tables: returns, mask, scatter.

    Three vectorized steps, no per-visit call. On a batch of any size
    this is where the previous stage spent nearly all of its time.
    """
    returns = batched_returns(batch, gamma)
    ids = pair_ids(batch, tables.n_actions)

    if first_visit:
        mask = first_visit_mask(batch, ids)
        tables.scatter(ids[mask], returns[mask])
        return
    tables.scatter(ids, returns)


def log_importance_weights(
    batch: PackedBatch, target_probs: FloatArray
) -> tuple[FloatArray, npt.NDArray[np.bool_]]:
    """Per-episode log weights, plus which episodes are identified.

    Log space is a correctness requirement rather than a refinement. A
    product of several hundred ratios underflows to zero in float64, and
    the weighted estimator then divides by a denominator that lost most
    of its mass -- which shows up as an estimate that looks unusually
    confident rather than as an error.

    Positivity failures are returned as a mask rather than raised,
    because in a batched setting the right response is usually to report
    how much of the data is unidentified rather than to abandon the
    batch.
    """
    if np.any(target_probs < 0.0):
        raise ValueError("target probabilities must be non-negative")

    identified = batch.behaviour_probs > 0.0
    log_ratio = np.zeros(batch.n_steps, dtype=np.float64)
    np.log(
        np.divide(target_probs, batch.behaviour_probs, where=identified, out=np.ones_like(target_probs)),
        out=log_ratio,
        where=identified,
    )

    log_weights = np.empty(batch.n_episodes, dtype=np.float64)
    episode_identified = np.empty(batch.n_episodes, dtype=bool)

    for episode in range(batch.n_episodes):
        window = batch.episode_slice(episode)
        episode_identified[episode] = bool(np.all(identified[window]))
        log_weights[episode] = float(np.sum(log_ratio[window]))

    return log_weights, episode_identified


def weighted_importance_sampling(
    batch: PackedBatch, target_probs: FloatArray, gamma: float, log_weight_cap: float | None = None
) -> dict[str, float]:
    """The Hajek estimator, computed stably.

    Subtracting the maximum log weight before exponentiating is the
    standard trick and it is exactly right here: the estimator is a
    ratio, so a common factor cancels and the arithmetic stays inside
    float64 no matter how extreme the weights are.

    The effective sample size is returned because it is the honest
    denominator -- a thousand logged episodes whose weight concentrates
    on three of them is an estimate from three episodes.
    """
    returns = batched_returns(batch, gamma)
    episode_returns = np.array(
        [returns[int(batch.starts[index])] for index in range(batch.n_episodes)],
        dtype=np.float64,
    )

    log_weights, identified = log_importance_weights(batch, target_probs)
    if log_weight_cap is not None:
        log_weights = np.minimum(log_weights, log_weight_cap)

    usable = identified
    if not np.any(usable):
        return {"estimate": float("nan"), "effective_sample_size": 0.0, "identified_fraction": 0.0}

    shifted = log_weights[usable] - log_weights[usable].max()
    weights = np.exp(shifted)
    total = float(weights.sum())

    return {
        "estimate": float(np.dot(weights, episode_returns[usable]) / total),
        # Kish's effective sample size, scale-invariant so the shift
        # above does not affect it.
        "effective_sample_size": float(total * total / np.square(weights).sum()),
        "identified_fraction": float(np.count_nonzero(usable)) / batch.n_episodes,
        "logged_episodes": float(batch.n_episodes),
    }


def episodes_for_precision(observed_std: float, target_error: float) -> int:
    """How many episodes a target standard error needs.

    From the one-over-square-root law, and worth computing before
    launching a run rather than discovering afterwards: an extra decimal
    digit costs a hundredfold more episodes, and nothing in this file
    changes that. If the answer is larger than the simulator can
    deliver, the method is the wrong one and no optimization rescues it.
    """
    if target_error <= 0.0:
        raise ValueError(f"target error must be positive; got {target_error}")
    return int(np.ceil((observed_std / target_error) ** 2))
`,
        profile:
          'Per batch: one O(total steps) reverse pass for the returns, one O(total steps) first-visit mask, and three unbuffered scatters of the same length — with no per-episode or per-visit Python call. Illustrative, not a measured benchmark: the number that decides a run is still episodes, since the standard error falls as one over the square root of visits, and episodes_for_precision() is the honest way to find out whether the budget exists before spending it.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Monte Carlo control, transcribed from the objective.
//
// No library. Everything is a sample mean:
//
//     Q(s,a) = E[ G_t | S_t = s, A_t = a ],  G_t = sum_k gamma^k R_{t+k+1}
//
// Four things to read for.
//
// 1. No bootstrapping appears anywhere. ComputeReturns() sums rewards
//    that actually occurred, and nothing on the right of an update
//    refers to Q. That is what makes the estimate unbiased, and why the
//    Markov property is never needed -- see AliasingDemo(), which is
//    the clearest statement of this method's real advantage.
//
// 2. The exploration problem is the subject, not a footnote. A greedy
//    policy visits a vanishing fraction of the pairs, so most of the
//    table is never estimated and the improvement step ranks numbers
//    that were never measured.
//
// 3. OrdinaryImportanceSampling() and WeightedImportanceSampling() are
//    the bias-variance trade with the usual roles reversed: the
//    unbiased estimator is the unusable one.
//
// 4. Every entry carries a visit count, so a standard error comes free.
//    Almost no other method here offers that.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <limits>
#include <random>
#include <set>
#include <stdexcept>
#include <tuple>
#include <utility>
#include <vector>

namespace mc {

struct Transition {
  std::size_t state;
  std::size_t action;
  double reward;
  double behaviour_probability;
};

using Episode = std::vector<Transition>;

// G_t for every step, by one backward pass.
//
// Backwards because G_t = R + gamma*G_{t+1} makes it linear; computing
// each return forwards is quadratic in the episode length, which is a
// real cost on exactly the long episodes this method already struggles
// with.
std::vector<double> ComputeReturns(const Episode& episode, double gamma) {
  std::vector<double> returns(episode.size(), 0.0);
  double running = 0.0;

  for (std::size_t index = episode.size(); index-- > 0;) {
    running = episode[index].reward + gamma * running;
    returns[index] = running;
  }
  return returns;
}

// Q, visit counts, and a running sum of squares.
//
// Q += (G - Q)/N is algebraically identical to averaging every stored
// return, so the estimator IS a sample mean -- which is what makes it
// unbiased and what gives every entry a standard error. Substituting a
// fixed step size turns it into an exponential moving average that
// tracks a changing policy and converges to nothing. Both are
// defensible; which is in use decides whether the theory applies.
class ActionValues {
 public:
  ActionValues(std::size_t n_states, std::size_t n_actions, double initial = 0.0)
      : n_states_(n_states),
        n_actions_(n_actions),
        q_(n_states * n_actions, initial),
        counts_(n_states * n_actions, 0),
        sum_squares_(n_states * n_actions, 0.0) {}

  void Update(std::size_t state, std::size_t action, double target) {
    const std::size_t index = state * n_actions_ + action;
    ++counts_[index];
    q_[index] += (target - q_[index]) / static_cast<double>(counts_[index]);
    sum_squares_[index] += target * target;
  }

  double Value(std::size_t state, std::size_t action) const {
    return q_[state * n_actions_ + action];
  }

  std::size_t Visits(std::size_t state, std::size_t action) const {
    return counts_[state * n_actions_ + action];
  }

  // How well this entry is actually known.
  //
  // A sample mean with a count has a standard error, so "how confident
  // is this recommendation" has an answer here that most methods in
  // this category cannot provide. It is also a natural exploration
  // signal: visit the pairs whose estimates are worst.
  double StandardError(std::size_t state, std::size_t action) const {
    const std::size_t index = state * n_actions_ + action;
    if (counts_[index] < 2) {
      return std::numeric_limits<double>::infinity();
    }
    const double count = static_cast<double>(counts_[index]);
    const double mean = q_[index];
    const double variance = std::max(sum_squares_[index] / count - mean * mean, 0.0);
    return std::sqrt(variance / count);
  }

  std::size_t GreedyAction(std::size_t state) const {
    std::size_t chosen = 0;
    double best = -std::numeric_limits<double>::infinity();
    for (std::size_t action = 0; action < n_actions_; ++action) {
      const double value = Value(state, action);
      // Strict greater-than, so ties go to the lowest index.
      if (value > best) {
        best = value;
        chosen = action;
      }
    }
    return chosen;
  }

  // Fraction of the table that has any estimate at all.
  //
  // The number that decides whether a learned policy means anything: a
  // policy from a table one-tenth visited is reporting its
  // initialization for the other nine tenths.
  double Coverage() const {
    std::size_t visited = 0;
    for (std::size_t count : counts_) {
      visited += count > 0 ? 1 : 0;
    }
    return static_cast<double>(visited) / static_cast<double>(counts_.size());
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  std::vector<double> q_;
  std::vector<std::size_t> counts_;
  std::vector<double> sum_squares_;
};

struct Visit {
  std::size_t state;
  std::size_t action;
  double target;
};

// One return per (state, action) pair per episode.
//
// Unbiased, because the returns being averaged are independent across
// episodes. Every-visit uses all of them, which makes returns within an
// episode correlated and the estimator biased at finite samples --
// consistent, usually lower variance, and the bias is rarely what
// decides a result.
std::vector<Visit> FirstVisitUpdates(const Episode& episode,
                                     const std::vector<double>& returns) {
  std::set<std::pair<std::size_t, std::size_t>> seen;
  std::vector<Visit> visits;

  for (std::size_t index = 0; index < episode.size(); ++index) {
    const auto key = std::make_pair(episode[index].state, episode[index].action);
    if (!seen.insert(key).second) {
      continue;
    }
    visits.push_back(Visit{episode[index].state, episode[index].action, returns[index]});
  }
  return visits;
}

std::vector<Visit> EveryVisitUpdates(const Episode& episode,
                                     const std::vector<double>& returns) {
  std::vector<Visit> visits;
  visits.reserve(episode.size());
  for (std::size_t index = 0; index < episode.size(); ++index) {
    visits.push_back(Visit{episode[index].state, episode[index].action, returns[index]});
  }
  return visits;
}

// (next_state, reward, done)
using StepFunction = std::function<std::tuple<std::size_t, double, bool>(std::size_t, std::size_t)>;
// (action, behaviour probability)
using ChooseFunction = std::function<std::pair<std::size_t, double>(std::size_t)>;

// Generate one episode.
//
// The step cap is not a safeguard to be quietly hit. A capped episode
// contributes a TRUNCATED return, which biases every mean it touches
// toward whatever the cap implies -- and that bias is invisible in the
// value table. If this fires regularly, the task is not episodic and
// this method does not apply to it.
Episode GenerateEpisode(const StepFunction& step, std::size_t start_state,
                        const ChooseFunction& choose, std::size_t max_steps = 10000) {
  Episode episode;
  std::size_t state = start_state;

  for (std::size_t index = 0; index < max_steps; ++index) {
    const auto [action, probability] = choose(state);
    const auto [next_state, reward, done] = step(state, action);
    episode.push_back(Transition{state, action, reward, probability});

    if (done) {
      return episode;
    }
    state = next_state;
  }

  throw std::runtime_error(
      "episode hit the step cap; a truncated return biases every mean it enters, so "
      "this is a modelling problem rather than a limit to raise");
}

struct ControlResult {
  ActionValues values;
  std::vector<std::size_t> policy;
  double coverage;
};

// On-policy control with a persistently exploring policy.
//
// The honest caveat: with epsilon FIXED this converges to the optimal
// epsilon-soft policy, which is not the optimal policy -- the agent
// keeps taking random actions forever and the values reflect that. The
// gap is proportional to epsilon, real, and almost never reported.
// Annealing epsilon toward zero recovers the optimal policy, and it is
// skipped more often than not.
ControlResult EpsilonSoftControl(const StepFunction& step,
                                 const std::vector<std::size_t>& start_states,
                                 std::size_t n_states, std::size_t n_actions, double gamma,
                                 std::size_t episodes, double epsilon, unsigned seed = 0) {
  std::mt19937 generator(seed);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  std::uniform_int_distribution<std::size_t> action_choice(0, n_actions - 1);
  std::uniform_int_distribution<std::size_t> start_choice(0, start_states.size() - 1);

  ActionValues values(n_states, n_actions);

  for (std::size_t episode_index = 0; episode_index < episodes; ++episode_index) {
    const ChooseFunction choose = [&](std::size_t state) {
      const std::size_t greedy = values.GreedyAction(state);
      const std::size_t action =
          uniform(generator) < epsilon ? action_choice(generator) : greedy;
      // Computed rather than assumed: epsilon-greedy puts epsilon/|A|
      // on every action plus 1-epsilon on the greedy one.
      const double probability = epsilon / static_cast<double>(n_actions) +
                                 (action == greedy ? 1.0 - epsilon : 0.0);
      return std::make_pair(action, probability);
    };

    const Episode episode =
        GenerateEpisode(step, start_states[start_choice(generator)], choose);
    const std::vector<double> returns = ComputeReturns(episode, gamma);

    for (const Visit& visit : FirstVisitUpdates(episode, returns)) {
      values.Update(visit.state, visit.action, visit.target);
    }
  }

  std::vector<std::size_t> policy(n_states, 0);
  for (std::size_t state = 0; state < n_states; ++state) {
    policy[state] = values.GreedyAction(state);
  }
  return ControlResult{std::move(values), std::move(policy), values.Coverage()};
}

struct OffPolicyEstimate {
  double estimate;
  double effective_sample_size;
  std::size_t used_episodes;
};

// The unbiased off-policy estimator, and the unusable one.
//
//     V = (1/n) * sum_i rho_i * G_i,   rho_i = prod_t pi(a|s)/b(a|s)
//
// Unbiased, with variance that is unbounded rather than merely large:
// the weight is a PRODUCT along the trajectory, so one step where the
// behaviour policy was unlikely to do what the target wants inflates a
// whole episode's contribution. Over a long horizon the estimate is
// routinely dominated by two or three trajectories.
//
// This is the Horvitz-Thompson estimator; the causal-inference
// literature met the same problem first and reached the same
// conclusion.
OffPolicyEstimate OrdinaryImportanceSampling(
    const std::vector<Episode>& episodes,
    const std::vector<std::vector<double>>& target_probs, double gamma) {
  double total = 0.0;
  std::size_t used = 0;

  for (std::size_t index = 0; index < episodes.size(); ++index) {
    double ratio = 1.0;
    bool identified = true;

    for (std::size_t step_index = 0; step_index < episodes[index].size(); ++step_index) {
      const double behaviour = episodes[index][step_index].behaviour_probability;
      if (behaviour <= 0.0) {
        // Positivity violation: unidentified at any sample size. Not a
        // small number -- an absent one.
        identified = false;
        break;
      }
      ratio *= target_probs[index][step_index] / behaviour;
    }

    if (!identified) {
      continue;
    }
    total += ratio * ComputeReturns(episodes[index], gamma).front();
    ++used;
  }

  if (used == 0) {
    return OffPolicyEstimate{std::numeric_limits<double>::quiet_NaN(), 0.0, 0};
  }
  return OffPolicyEstimate{total / static_cast<double>(used), 0.0, used};
}

// The biased, consistent, usable one.
//
//     V = sum_i rho_i G_i / sum_i rho_i
//
// Normalizing by the weights rather than the count bounds the estimate
// inside the range of observed returns, which removes the unbounded
// variance at the cost of a bias that vanishes as the sample grows.
// This is the Hajek estimator, and it is what anyone actually uses.
//
// The effective sample size is reported because it is the honest
// denominator: a thousand logged episodes whose weight concentrates on
// three of them is an estimate from three episodes.
OffPolicyEstimate WeightedImportanceSampling(
    const std::vector<Episode>& episodes,
    const std::vector<std::vector<double>>& target_probs, double gamma) {
  std::vector<double> ratios;
  std::vector<double> returns;

  for (std::size_t index = 0; index < episodes.size(); ++index) {
    double ratio = 1.0;
    bool identified = true;

    for (std::size_t step_index = 0; step_index < episodes[index].size(); ++step_index) {
      const double behaviour = episodes[index][step_index].behaviour_probability;
      if (behaviour <= 0.0) {
        identified = false;
        break;
      }
      ratio *= target_probs[index][step_index] / behaviour;
    }

    if (!identified) {
      continue;
    }
    ratios.push_back(ratio);
    returns.push_back(ComputeReturns(episodes[index], gamma).front());
  }

  double total = 0.0;
  double sum_squares = 0.0;
  double weighted = 0.0;
  for (std::size_t index = 0; index < ratios.size(); ++index) {
    total += ratios[index];
    sum_squares += ratios[index] * ratios[index];
    weighted += ratios[index] * returns[index];
  }

  if (total <= 0.0) {
    return OffPolicyEstimate{std::numeric_limits<double>::quiet_NaN(), 0.0, ratios.size()};
  }
  // Kish's effective sample size.
  return OffPolicyEstimate{weighted / total, (total * total) / sum_squares, ratios.size()};
}

struct AliasingReport {
  double estimate;
  double standard_error;
  double true_expected_return;
};

// Why this method survives a state that is not Markov.
//
// Two underlying states are shown to the agent as one. Monte Carlo
// averages the returns that ACTUALLY OCCURRED from that observation, so
// it converges to the correct expected return for the process as
// experienced -- the right answer to the question the agent can
// actually ask.
//
// A bootstrapping method updates toward its own estimate at the next
// observation, and that estimate belongs to the aliased state rather
// than the real one, so it converges to something that is not the value
// of anything. This is the strongest argument for Monte Carlo and it is
// usually omitted.
AliasingReport AliasingDemo(double gamma = 0.9, std::size_t episodes = 20000,
                            unsigned seed = 0) {
  std::mt19937 generator(seed);
  std::bernoulli_distribution coin(0.5);

  const StepFunction step = [&](std::size_t state, std::size_t) {
    if (state == 0) {
      const double hidden = coin(generator) ? 1.0 : -1.0;
      return std::make_tuple<std::size_t, double, bool>(1, double(hidden), true);
    }
    return std::make_tuple<std::size_t, double, bool>(1, 0.0, true);
  };

  ActionValues values(2, 1);
  const ChooseFunction choose = [](std::size_t) { return std::make_pair<std::size_t, double>(0, 1.0); };

  for (std::size_t index = 0; index < episodes; ++index) {
    const Episode episode = GenerateEpisode(step, 0, choose);
    const std::vector<double> returns = ComputeReturns(episode, gamma);
    for (const Visit& visit : FirstVisitUpdates(episode, returns)) {
      values.Update(visit.state, visit.action, visit.target);
    }
  }

  return AliasingReport{values.Value(0, 0), values.StandardError(0, 0), 0.0};
}

}  // namespace mc
`,
        profile:
          'Per episode: one O(T) backward pass for the returns and O(T) updates, with a std::set lookup per step in the first-visit variant. Illustrative, not a measured benchmark: the cost that decides everything is episodes rather than arithmetic — the standard error falls as one over the square root of visits, so an extra digit costs a hundredfold more episodes, and the constant scales with episode length through the variance of the return.',
      },
      'make-it-right': {
        rationale:
          'The estimator choices the literal version made silently become named types, because each changes what the run computes rather than how fast it computes it. The step size becomes an enum: one over N is a sample mean that converges to the expectation and carries the convergence theory; a fixed alpha is an exponential moving average that tracks a changing policy and converges to nothing, which is often correct and is a different claim. The exploration schedule becomes a type that reports whether it satisfies GLIE, since a fixed epsilon converges to the optimal epsilon-soft policy and an annealed one converges to the optimal policy — a difference in the answer, not the speed, and one that is systematically unreported. Preconditions are checked before anything is allocated, and the failures that matter throw specific types naming their cause: an episode that reaches its step cap, whose truncated return biases every mean it enters; a positivity violation, which is an unidentified quantity rather than a small weight; and a value requested for a pair with no visits, which the literal version answered with its initialization. The value table keeps visit counts and a Welford accumulator rather than a raw sum of squares, because the naive variance formula cancels two large numbers exactly where returns are large — the long-horizon case this method is already worst at. Off-policy estimates return an effective sample size alongside the value, and every non-owning input arrives as a span so the estimators allocate nothing.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'std::span for non-owning views',
          'const-correctness on parameters and members',
          'Rule of zero — let the compiler generate special members',
          'RAII for every owned resource',
        ],
        code: `// Monte Carlo control with the estimator choices made explicit.
//
// Four things the literal version decided silently:
//
//   * the step size, where 1/N is a sample mean that converges and a
//     fixed alpha is a moving average that does not;
//   * the exploration schedule, where a fixed epsilon converges to the
//     optimal epsilon-soft policy rather than the optimal one;
//   * what a truncated episode means, which is a biased return rather
//     than a slightly short one;
//   * what an unvisited pair is worth, which the literal version
//     answered with whatever the table was initialized to.
//
// Each becomes a named type or a thrown exception. The method's one
// statistical advantage -- that every entry is a sample mean with a
// count, and therefore has a standard error -- is carried through to
// the result rather than discarded.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace mc {

class MonteCarloError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

// Not a limit to raise. A truncated episode contributes a truncated
// return, which biases every mean it enters toward whatever the cap
// implies, and the bias is invisible in the value table.
class EpisodeDidNotTerminate : public MonteCarloError {
 public:
  using MonteCarloError::MonteCarloError;
};

// An identification failure rather than a data-volume one: no estimator
// recovers this quantity at any sample size, which is the same
// statement the causal-inference literature makes about positivity.
class PositivityViolation : public MonteCarloError {
 public:
  using MonteCarloError::MonteCarloError;
};

class UnvisitedPair : public MonteCarloError {
 public:
  using MonteCarloError::MonteCarloError;
};

// Which estimator is running.
//
// kSampleMean weights every episode equally and converges to the
// expectation; this is what the convergence theory assumes.
// kExponential weights recent episodes more heavily, tracks a changing
// policy, and converges to nothing -- frequently the right choice,
// since returns from twenty policies ago estimate a different quantity,
// but it is a different claim and it should be stated.
enum class StepSize { kSampleMean, kExponential };

// kFirst is unbiased; kEvery is biased at finite samples, consistent,
// and usually lower variance.
enum class VisitRule { kFirst, kEvery };

// Epsilon over time, with the consequence attached.
//
// A constant epsilon converges to the optimal EPSILON-SOFT policy: the
// agent keeps acting randomly forever and the values reflect that. The
// gap from optimal is proportional to epsilon, real, and almost never
// reported. Annealing as 1/n satisfies GLIE and recovers the optimal
// policy.
class ExplorationSchedule {
 public:
  ExplorationSchedule(double initial, double decay_exponent)
      : initial_(initial), decay_exponent_(decay_exponent) {
    if (!(initial_ >= 0.0) || initial_ > 1.0) {
      throw MonteCarloError("epsilon must lie in [0, 1]");
    }
    if (decay_exponent_ < 0.0) {
      throw MonteCarloError("decay exponent must be non-negative");
    }
  }

  double At(std::size_t episode) const noexcept {
    if (decay_exponent_ == 0.0) {
      return initial_;
    }
    return initial_ / std::pow(static_cast<double>(std::max<std::size_t>(episode, 1)),
                               decay_exponent_);
  }

  // Whether this schedule converges to the OPTIMAL policy.
  //
  // Exposed rather than documented: a run reporting its policy without
  // saying which of the two it reached overstates the result by a
  // margin proportional to epsilon.
  bool SatisfiesGlie() const noexcept {
    return decay_exponent_ > 0.0 && decay_exponent_ <= 1.0;
  }

 private:
  double initial_;
  double decay_exponent_;
};

// A value with how well it is known.
//
// A sample mean with a count has a standard error. Returning the mean
// alone discards the one statistical advantage this method has over
// everything else in the category.
struct Estimate {
  double value{};
  std::size_t visits{};
  double standard_error{};
};

// Q, visit counts, and a Welford accumulator.
//
// Welford rather than sum-of-squares-minus-square-of-sum: the naive
// variance formula cancels two large numbers and loses precision
// exactly where returns are large, which is the long-horizon case this
// method is already worst at.
class ActionValues {
 public:
  ActionValues(std::size_t n_states, std::size_t n_actions,
               StepSize step_size = StepSize::kSampleMean, double alpha = 0.05)
      : n_states_(n_states),
        n_actions_(n_actions),
        step_size_(step_size),
        alpha_(alpha),
        q_(n_states * n_actions, 0.0),
        counts_(n_states * n_actions, 0),
        m2_(n_states * n_actions, 0.0) {
    if (n_states_ == 0 || n_actions_ == 0) {
      throw MonteCarloError("the table needs at least one state and one action");
    }
    if (step_size_ == StepSize::kExponential && (!(alpha_ > 0.0) || alpha_ > 1.0)) {
      throw MonteCarloError("alpha must lie in (0, 1]");
    }
  }

  void Update(std::size_t state, std::size_t action, double target) {
    const std::size_t index = state * n_actions_ + action;
    ++counts_[index];

    const double previous = q_[index];
    const double rate = step_size_ == StepSize::kSampleMean
                            ? 1.0 / static_cast<double>(counts_[index])
                            : alpha_;
    q_[index] = previous + rate * (target - previous);
    m2_[index] += (target - previous) * (target - q_[index]);
  }

  Estimate ValueOf(std::size_t state, std::size_t action) const {
    const std::size_t index = state * n_actions_ + action;
    if (counts_[index] == 0) {
      throw UnvisitedPair("state " + std::to_string(state) + ", action " +
                          std::to_string(action) +
                          " has no observations; the improvement step would rank this "
                          "entry's initialization rather than a measurement");
    }
    if (counts_[index] < 2) {
      return Estimate{q_[index], counts_[index], std::numeric_limits<double>::infinity()};
    }

    const double count = static_cast<double>(counts_[index]);
    const double variance = m2_[index] / (count - 1.0);
    return Estimate{q_[index], counts_[index], std::sqrt(variance / count)};
  }

  std::size_t GreedyAction(std::size_t state) const noexcept {
    std::size_t chosen = 0;
    double best = -std::numeric_limits<double>::infinity();
    for (std::size_t action = 0; action < n_actions_; ++action) {
      const double value = q_[state * n_actions_ + action];
      if (value > best) {
        best = value;
        chosen = action;
      }
    }
    return chosen;
  }

  // Fraction of the table with any observation at all.
  //
  // The number that decides whether a learned policy means anything.
  double Coverage() const noexcept {
    const std::size_t visited =
        static_cast<std::size_t>(std::count_if(counts_.begin(), counts_.end(),
                                               [](std::size_t count) { return count > 0; }));
    return static_cast<double>(visited) / static_cast<double>(counts_.size());
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  StepSize step_size_;
  double alpha_;
  std::vector<double> q_;
  std::vector<std::size_t> counts_;
  std::vector<double> m2_;
};

// Rule of zero: a value type, no special members written.
struct Transition {
  std::size_t state{};
  std::size_t action{};
  double reward{};
  double behaviour_probability{};
};

// G_t for every step, into a caller-provided buffer.
//
// The buffer is a span so this allocates nothing: a training loop calls
// it once per episode, and an allocation per episode is measurable at
// the episode counts this method needs.
void ComputeReturns(std::span<const Transition> episode, double gamma,
                    std::span<double> returns) {
  if (returns.size() != episode.size()) {
    throw MonteCarloError("return buffer does not match the episode length");
  }

  double running = 0.0;
  for (std::size_t index = episode.size(); index-- > 0;) {
    running = episode[index].reward + gamma * running;
    returns[index] = running;
  }
}

struct Visit {
  std::size_t state{};
  std::size_t action{};
  double target{};
};

std::vector<Visit> VisitUpdates(std::span<const Transition> episode,
                                std::span<const double> returns, VisitRule rule) {
  std::vector<Visit> visits;
  visits.reserve(episode.size());

  if (rule == VisitRule::kEvery) {
    for (std::size_t index = 0; index < episode.size(); ++index) {
      visits.push_back(Visit{episode[index].state, episode[index].action, returns[index]});
    }
    return visits;
  }

  std::vector<std::pair<std::size_t, std::size_t>> seen;
  seen.reserve(episode.size());

  for (std::size_t index = 0; index < episode.size(); ++index) {
    const auto key = std::make_pair(episode[index].state, episode[index].action);
    if (std::find(seen.begin(), seen.end(), key) != seen.end()) {
      continue;
    }
    seen.push_back(key);
    visits.push_back(Visit{episode[index].state, episode[index].action, returns[index]});
  }
  return visits;
}

// A value, with the denominator that actually produced it.
//
// The effective sample size is the honest measure: a thousand logged
// episodes whose weights concentrate on three of them is an estimate
// from three episodes, and the mean alone conceals that completely.
struct OffPolicyEstimate {
  double value{};
  double effective_sample_size{};
  std::size_t logged_episodes{};
  bool weight_cap_applied{};
};

// The biased, consistent, usable off-policy estimator.
//
//     V = sum_i rho_i G_i / sum_i rho_i
//
// Normalizing by the weights rather than the count bounds the estimate
// inside the range of observed returns, removing the unbounded variance
// of the unbiased form at the cost of a bias that vanishes with the
// sample. This is the Hajek estimator, and the causal literature
// reaches the same conclusion about stabilized weights.
//
// Log-space accumulation is a correctness requirement rather than a
// refinement: a product of several hundred ratios underflows to zero in
// double, and the estimator then divides by a denominator that lost
// most of its mass -- which looks like unusual confidence rather than
// an error.
OffPolicyEstimate WeightedImportanceSampling(
    std::span<const std::span<const Transition>> episodes,
    std::span<const std::span<const double>> target_probs, double gamma,
    double log_weight_cap = std::numeric_limits<double>::infinity()) {
  if (episodes.empty()) {
    throw MonteCarloError("no logged episodes");
  }
  if (episodes.size() != target_probs.size()) {
    throw MonteCarloError("episode and target-probability counts differ");
  }

  std::vector<double> log_weights;
  std::vector<double> returns;
  std::vector<double> scratch;
  bool capped = false;

  for (std::size_t index = 0; index < episodes.size(); ++index) {
    double log_ratio = 0.0;
    for (std::size_t step = 0; step < episodes[index].size(); ++step) {
      const double behaviour = episodes[index][step].behaviour_probability;
      if (!(behaviour > 0.0)) {
        throw PositivityViolation(
            "the behaviour policy assigned zero probability to a taken action, so this "
            "quantity is unidentified at any sample size");
      }
      log_ratio += std::log(target_probs[index][step] / behaviour);
    }

    if (log_ratio > log_weight_cap) {
      log_ratio = log_weight_cap;
      capped = true;
    }

    scratch.assign(episodes[index].size(), 0.0);
    ComputeReturns(episodes[index], gamma, scratch);

    log_weights.push_back(log_ratio);
    returns.push_back(scratch.empty() ? 0.0 : scratch.front());
  }

  // Shift by the maximum before exponentiating. The estimator is a
  // ratio, so a common factor cancels and the arithmetic stays inside
  // double no matter how extreme the weights are.
  const double largest = *std::max_element(log_weights.begin(), log_weights.end());

  double total = 0.0;
  double sum_squares = 0.0;
  double weighted = 0.0;
  for (std::size_t index = 0; index < log_weights.size(); ++index) {
    const double weight = std::exp(log_weights[index] - largest);
    total += weight;
    sum_squares += weight * weight;
    weighted += weight * returns[index];
  }

  if (!(total > 0.0)) {
    throw MonteCarloError("all importance weights are zero; the policies share no support");
  }

  return OffPolicyEstimate{weighted / total, (total * total) / sum_squares, episodes.size(),
                           capped};
}

// How many episodes a target standard error needs.
//
// From the one-over-square-root law, and worth computing before
// launching a run rather than afterwards: an extra decimal digit costs
// a hundredfold more episodes. If the answer exceeds what the simulator
// can deliver, the method is wrong for the problem and no
// implementation detail rescues it.
std::size_t EpisodesForPrecision(double observed_std, double target_error) {
  if (!(target_error > 0.0)) {
    throw MonteCarloError("target error must be positive");
  }
  const double ratio = observed_std / target_error;
  return static_cast<std::size_t>(std::ceil(ratio * ratio));
}

}  // namespace mc
`,
        profile:
          'Same asymptotics as the literal version — one O(T) backward pass and O(T) updates per episode — with the return buffer supplied by the caller so the estimators allocate nothing per episode, and the first-visit test on a small reserved vector rather than a tree. Illustrative, not a measured benchmark: the substantive change is that a truncated episode, a positivity violation and a request for an unvisited pair are now failures a caller must handle, and that importance weights accumulate in log space, which is the difference between a correct denominator and a silently underflowed one.',
      },
      'make-it-fast': {
        rationale:
          'Episodes are the cost in this method, so the work is to process many at once rather than to shave the per-step arithmetic. Trajectories are packed into one flat row-major block with an explicit episode-boundary index, so a batch is contiguous and the backward return computation becomes a single reverse pass over it with a reset at each boundary — the per-episode allocation and the per-episode function call both disappear. The first-visit test, which is naturally a set membership check per step, becomes a stamp array indexed by flattened state-action id and marked with the episode number: constant time, no allocation, and no comparison-based container in the inner loop. Accumulation then goes into three flat arrays — count, sum and sum of squares — indexed by that same flattened id, so the update is one indexed add per visit with no branch and no object. Restrict qualifiers on the reverse pass let it vectorize, since the compiler must otherwise assume the reward and return buffers may alias. Episodes within a batch are independent, so OpenMP fans the per-episode return computation across cores, with the accumulation kept serial because a scatter into shared counters is a race that a reduction clause cannot express cleanly. Importance weights accumulate in log space, which is not a speed change but the difference between a correct denominator and one that silently underflowed to zero at the horizons this method is used on.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A whole batch of trajectories lives in one contiguous block with explicit boundaries, so the reverse pass and the scatter both stream instead of chasing per-episode vectors',
            tradeoff: 'The batch must be packed before anything runs, so streaming a single episode as it is generated is more awkward than it was',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Return computation, the first-visit stamp test and the accumulation run in one traversal, so the per-episode return vector is never materialized',
            tradeoff: 'The per-step returns are gone by the time the pass ends, and they are exactly what a diagnostic wants when a value looks wrong',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The reverse return pass is a simple recurrence that vectorizes only once the reward and return buffers are known not to overlap',
            tradeoff: 'The guarantee is unchecked: overlapping buffers compile cleanly and corrupt the returns at run time with nothing to catch it',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Episodes in a batch are independent, so their return computations fan across cores with nothing to synchronize',
            tradeoff: 'Accumulation must stay serial, since a scatter into shared counters is a race — so the parallel region covers only part of the work and Amdahl bounds the win',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The reverse recurrence and the indexed accumulation are both tight loops over contiguous doubles once aliasing is ruled out',
            tradeoff: 'The binary stops being portable across machine generations, and floating-point contraction can shift the last digits of a return between build targets',
          },
        ],
        code: `// Monte Carlo control, batched.
//
// Episodes are the cost here, not arithmetic, so the work is to process
// many at once. Trajectories are packed into one flat block with an
// episode-boundary index; returns become a single reverse pass with
// resets; the first-visit test becomes a stamp array; and accumulation
// becomes three indexed adds.
//
// One change is about correctness rather than speed and matters more
// than the rest: importance weights accumulate in log space. A product
// of several hundred ratios underflows to zero in double, and the
// weighted estimator then divides by a denominator that lost most of
// its mass -- silently, and in the direction of looking more confident.
//
// What none of this changes: the standard error still falls as one over
// the square root of visits. Faster episodes do not make the estimator
// converge in fewer of them.
//
// Build: -O3 -march=native -fopenmp

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

namespace mc {

// Many episodes in one flat block.
//
// States, actions, rewards and behaviour probabilities are concatenated
// across episodes; \`starts\` holds where each episode begins, so
// boundaries are explicit rather than implied by a sentinel. One
// allocation per field, so the whole batch streams.
struct PackedBatch {
  std::vector<std::int32_t> states;
  std::vector<std::int32_t> actions;
  std::vector<double> rewards;
  std::vector<double> behaviour_probs;
  std::vector<std::int64_t> starts;  // length n_episodes + 1

  std::size_t n_episodes() const noexcept { return starts.size() - 1; }
  std::size_t n_steps() const noexcept { return rewards.size(); }

  std::int64_t begin_of(std::size_t episode) const noexcept { return starts[episode]; }
  std::int64_t end_of(std::size_t episode) const noexcept { return starts[episode + 1]; }
};

// G_t for one episode, in place.
//
// restrict on both pointers is what lets this vectorize: the compiler
// must otherwise assume the reward and return buffers may overlap and
// emits a scalar recurrence. The guarantee is unchecked, so overlapping
// buffers corrupt the returns silently.
inline void ReverseReturns(const double* __restrict__ rewards, double* __restrict__ returns,
                           std::int64_t length, double gamma) noexcept {
  double running = 0.0;
  for (std::int64_t index = length; index-- > 0;) {
    running = rewards[index] + gamma * running;
    returns[index] = running;
  }
}

// Counts, sums and sums of squares, flat and preallocated.
//
// Kept as sums rather than as a running mean so a whole batch can be
// accumulated with three indexed adds per visit. The mean and the
// standard error are derived on read, which costs one division and
// removes the per-visit update object entirely.
class ScatterTables {
 public:
  ScatterTables(std::size_t n_states, std::size_t n_actions)
      : n_actions_(n_actions),
        counts_(n_states * n_actions, 0),
        sums_(n_states * n_actions, 0.0),
        sum_squares_(n_states * n_actions, 0.0),
        // Stamp array for the first-visit test: constant time, no
        // allocation, no comparison-based container in the inner loop.
        stamp_(n_states * n_actions, -1) {}

  void Accumulate(std::int32_t pair_id, double target) noexcept {
    ++counts_[static_cast<std::size_t>(pair_id)];
    sums_[static_cast<std::size_t>(pair_id)] += target;
    sum_squares_[static_cast<std::size_t>(pair_id)] += target * target;
  }

  // True the first time this pair is seen within this episode.
  bool FirstVisitInEpisode(std::int32_t pair_id, std::int64_t episode) noexcept {
    if (stamp_[static_cast<std::size_t>(pair_id)] == episode) {
      return false;
    }
    stamp_[static_cast<std::size_t>(pair_id)] = episode;
    return true;
  }

  // Means, with unvisited pairs left as NaN.
  //
  // NaN rather than zero on purpose: zero is a plausible value and an
  // argmax over it silently prefers an unmeasured action, which is
  // exactly the failure worth surfacing.
  std::vector<double> Means() const {
    std::vector<double> means(counts_.size(), std::numeric_limits<double>::quiet_NaN());
    for (std::size_t index = 0; index < counts_.size(); ++index) {
      if (counts_[index] > 0) {
        means[index] = sums_[index] / static_cast<double>(counts_[index]);
      }
    }
    return means;
  }

  double Coverage() const noexcept {
    const std::size_t visited = static_cast<std::size_t>(
        std::count_if(counts_.begin(), counts_.end(), [](std::int64_t c) { return c > 0; }));
    return static_cast<double>(visited) / static_cast<double>(counts_.size());
  }

  std::size_t n_actions() const noexcept { return n_actions_; }

 private:
  std::size_t n_actions_;
  std::vector<std::int64_t> counts_;
  std::vector<double> sums_;
  std::vector<double> sum_squares_;
  std::vector<std::int64_t> stamp_;
};

// One batch into the tables: returns in parallel, then a serial scatter.
//
// The split is deliberate. Return computation is per-episode and
// independent, so it parallelizes cleanly. Accumulation is a scatter
// into shared counters, which is a race that no reduction clause
// expresses cleanly -- so it stays serial, and Amdahl bounds what the
// parallel half can win.
void AccumulateBatch(const PackedBatch& batch, ScatterTables& tables, double gamma,
                     bool first_visit = true) {
  std::vector<double> returns(batch.n_steps(), 0.0);

#pragma omp parallel for schedule(static)
  for (std::size_t episode = 0; episode < batch.n_episodes(); ++episode) {
    const std::int64_t begin = batch.begin_of(episode);
    const std::int64_t length = batch.end_of(episode) - begin;
    ReverseReturns(batch.rewards.data() + begin, returns.data() + begin, length, gamma);
  }

  const std::size_t n_actions = tables.n_actions();
  for (std::size_t episode = 0; episode < batch.n_episodes(); ++episode) {
    for (std::int64_t index = batch.begin_of(episode); index < batch.end_of(episode); ++index) {
      const std::int32_t pair_id =
          batch.states[static_cast<std::size_t>(index)] * static_cast<std::int32_t>(n_actions) +
          batch.actions[static_cast<std::size_t>(index)];

      if (first_visit &&
          !tables.FirstVisitInEpisode(pair_id, static_cast<std::int64_t>(episode))) {
        continue;
      }
      tables.Accumulate(pair_id, returns[static_cast<std::size_t>(index)]);
    }
  }
}

struct OffPolicyEstimate {
  double value{};
  double effective_sample_size{};
  double identified_fraction{};
  std::size_t logged_episodes{};
};

// The Hajek estimator, computed stably.
//
// Log-space accumulation is a correctness requirement: a product of
// several hundred ratios underflows to zero in double, and the
// estimator then divides by a denominator that lost most of its mass.
// Subtracting the maximum before exponentiating is exactly right here
// because the estimator is a ratio, so a common factor cancels and the
// arithmetic stays inside double however extreme the weights are.
//
// Positivity failures are reported as a fraction rather than thrown,
// because in a batched setting the right response is usually to say how
// much of the data is unidentified rather than to abandon the batch.
OffPolicyEstimate WeightedImportanceSampling(const PackedBatch& batch,
                                             std::span<const double> target_probs,
                                             double gamma,
                                             double log_weight_cap =
                                                 std::numeric_limits<double>::infinity()) {
  if (batch.n_episodes() == 0) {
    throw std::invalid_argument("no logged episodes");
  }
  if (target_probs.size() != batch.n_steps()) {
    throw std::invalid_argument("target probabilities do not cover every step");
  }

  std::vector<double> log_weights;
  std::vector<double> returns;
  std::vector<char> identified;
  log_weights.reserve(batch.n_episodes());
  returns.reserve(batch.n_episodes());
  identified.reserve(batch.n_episodes());

  std::vector<double> scratch(batch.n_steps(), 0.0);

  for (std::size_t episode = 0; episode < batch.n_episodes(); ++episode) {
    const std::int64_t begin = batch.begin_of(episode);
    const std::int64_t length = batch.end_of(episode) - begin;

    double log_ratio = 0.0;
    bool usable = true;
    for (std::int64_t index = begin; index < begin + length; ++index) {
      const double behaviour = batch.behaviour_probs[static_cast<std::size_t>(index)];
      if (!(behaviour > 0.0)) {
        usable = false;
        break;
      }
      log_ratio += std::log(target_probs[static_cast<std::size_t>(index)] / behaviour);
    }

    ReverseReturns(batch.rewards.data() + begin, scratch.data() + begin, length, gamma);

    log_weights.push_back(std::min(log_ratio, log_weight_cap));
    returns.push_back(scratch[static_cast<std::size_t>(begin)]);
    identified.push_back(usable ? 1 : 0);
  }

  double largest = -std::numeric_limits<double>::infinity();
  for (std::size_t index = 0; index < log_weights.size(); ++index) {
    if (identified[index] != 0) {
      largest = std::max(largest, log_weights[index]);
    }
  }
  if (!std::isfinite(largest)) {
    return OffPolicyEstimate{std::numeric_limits<double>::quiet_NaN(), 0.0, 0.0,
                             batch.n_episodes()};
  }

  double total = 0.0;
  double sum_squares = 0.0;
  double weighted = 0.0;
  std::size_t used = 0;

  for (std::size_t index = 0; index < log_weights.size(); ++index) {
    if (identified[index] == 0) {
      continue;
    }
    const double weight = std::exp(log_weights[index] - largest);
    total += weight;
    sum_squares += weight * weight;
    weighted += weight * returns[index];
    ++used;
  }

  return OffPolicyEstimate{
      weighted / total,
      // Kish's effective sample size, scale-invariant so the shift does
      // not affect it.
      (total * total) / sum_squares,
      static_cast<double>(used) / static_cast<double>(batch.n_episodes()),
      batch.n_episodes()};
}

// How many episodes a target standard error needs.
//
// From the one-over-square-root law, and worth computing before
// launching a run: an extra decimal digit costs a hundredfold more
// episodes, and nothing in this file changes that. If the answer
// exceeds what the simulator can deliver, the method is the wrong one.
std::size_t EpisodesForPrecision(double observed_std, double target_error) {
  if (!(target_error > 0.0)) {
    throw std::invalid_argument("target error must be positive");
  }
  const double ratio = observed_std / target_error;
  return static_cast<std::size_t>(std::ceil(ratio * ratio));
}

}  // namespace mc
`,
        profile:
          'Per batch: one O(total steps) reverse pass, parallel across episodes, and one O(total steps) serial scatter with a constant-time first-visit test. Illustrative, not a measured benchmark: the number that decides a run is still episodes, since the standard error falls as one over the square root of visits — EpisodesForPrecision() is the honest way to find out whether the budget exists before spending it, and the serial scatter is what bounds how much the parallel half can be worth.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Monte Carlo control, transcribed from the objective.
//!
//! No library. Everything is a sample mean:
//!
//!     Q(s,a) = E[ G_t | S_t = s, A_t = a ],  G_t = sum_k gamma^k R
//!
//! Four things to read for.
//!
//! 1. No bootstrapping appears anywhere. \`compute_returns\` sums rewards
//!    that actually occurred, and nothing on the right of an update
//!    refers to Q. That is what makes the estimate unbiased, and why
//!    the Markov property is never needed -- see \`aliasing_demo\`, the
//!    clearest statement of this method's real advantage.
//!
//! 2. The exploration problem is the subject, not a footnote. A greedy
//!    policy visits a vanishing fraction of the pairs, so most of the
//!    table is never estimated and the improvement step ranks numbers
//!    that were never measured.
//!
//! 3. \`ordinary_importance_sampling\` and \`weighted_importance_sampling\`
//!    are the bias-variance trade with the usual roles reversed: the
//!    unbiased estimator is the unusable one.
//!
//! 4. Every entry carries a visit count, so a standard error is free.
//!    Almost no other method here offers that.

use std::collections::BTreeSet;

/// A deterministic generator, so a run reproduces across processes.
/// An experiment comparing two exploration rates is worthless if the
/// episode stream moved underneath it.
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

    pub fn next_index(&mut self, bound: usize) -> usize {
        (self.next_uniform() * bound as f64) as usize % bound
    }
}

pub struct Transition {
    pub state: usize,
    pub action: usize,
    pub reward: f64,
    pub behaviour_probability: f64,
}

pub type Episode = Vec<Transition>;

/// G_t for every step, by one backward pass.
///
/// Backwards because G_t = R + gamma*G_{t+1} makes it linear; computing
/// each return forwards is quadratic in the episode length, which is a
/// real cost on exactly the long episodes this method already struggles
/// with.
#[must_use]
pub fn compute_returns(episode: &[Transition], gamma: f64) -> Vec<f64> {
    let mut returns = vec![0.0_f64; episode.len()];
    let mut running = 0.0;

    for index in (0..episode.len()).rev() {
        running = episode[index].reward + gamma * running;
        returns[index] = running;
    }
    returns
}

/// Q, visit counts, and a running sum of squares.
///
/// \`Q += (G - Q)/N\` is algebraically identical to averaging every
/// stored return, so the estimator IS a sample mean -- which is what
/// makes it unbiased and what gives every entry a standard error.
/// Substituting a fixed step size turns it into an exponential moving
/// average that tracks a changing policy and converges to nothing. Both
/// are defensible; which is in use decides whether the theory applies,
/// and implementations routinely fail to say.
pub struct ActionValues {
    n_actions: usize,
    q: Vec<f64>,
    counts: Vec<usize>,
    sum_squares: Vec<f64>,
}

impl ActionValues {
    #[must_use]
    pub fn new(n_states: usize, n_actions: usize) -> Self {
        Self {
            n_actions,
            q: vec![0.0; n_states * n_actions],
            counts: vec![0; n_states * n_actions],
            sum_squares: vec![0.0; n_states * n_actions],
        }
    }

    pub fn update(&mut self, state: usize, action: usize, target: f64) {
        let index = state * self.n_actions + action;
        self.counts[index] += 1;
        self.q[index] += (target - self.q[index]) / self.counts[index] as f64;
        self.sum_squares[index] += target * target;
    }

    #[must_use]
    pub fn value(&self, state: usize, action: usize) -> f64 {
        self.q[state * self.n_actions + action]
    }

    #[must_use]
    pub fn visits(&self, state: usize, action: usize) -> usize {
        self.counts[state * self.n_actions + action]
    }

    /// How well this entry is actually known.
    ///
    /// A sample mean with a count has a standard error, so "how
    /// confident is this recommendation" has an answer here that most
    /// methods in this category cannot provide. It is also a natural
    /// exploration signal: visit the pairs whose estimates are worst.
    #[must_use]
    pub fn standard_error(&self, state: usize, action: usize) -> f64 {
        let index = state * self.n_actions + action;
        if self.counts[index] < 2 {
            return f64::INFINITY;
        }
        let count = self.counts[index] as f64;
        let mean = self.q[index];
        let variance = (self.sum_squares[index] / count - mean * mean).max(0.0);
        (variance / count).sqrt()
    }

    #[must_use]
    pub fn greedy_action(&self, state: usize) -> usize {
        let base = state * self.n_actions;
        let mut best = f64::NEG_INFINITY;
        let mut chosen = 0_usize;

        for action in 0..self.n_actions {
            let value = self.q[base + action];
            // Strict greater-than, so ties go to the lowest index.
            if value > best {
                best = value;
                chosen = action;
            }
        }
        chosen
    }

    /// Fraction of the table that has any estimate at all.
    ///
    /// The number that decides whether a learned policy means anything.
    /// A policy from a table one-tenth visited is reporting its
    /// initialization for the other nine tenths.
    #[must_use]
    pub fn coverage(&self) -> f64 {
        let visited = self.counts.iter().filter(|count| **count > 0).count();
        visited as f64 / self.counts.len() as f64
    }
}

pub struct Visit {
    pub state: usize,
    pub action: usize,
    pub target: f64,
}

/// One return per (state, action) pair per episode.
///
/// Unbiased, because the returns being averaged are independent across
/// episodes. Every-visit uses all of them, which makes returns within
/// an episode correlated and the estimator biased at finite samples --
/// consistent, usually lower variance, and the bias is rarely what
/// decides a result.
#[must_use]
pub fn first_visit_updates(episode: &[Transition], returns: &[f64]) -> Vec<Visit> {
    let mut seen: BTreeSet<(usize, usize)> = BTreeSet::new();

    episode
        .iter()
        .enumerate()
        .filter_map(|(index, step)| {
            if seen.insert((step.state, step.action)) {
                Some(Visit {
                    state: step.state,
                    action: step.action,
                    target: returns[index],
                })
            } else {
                None
            }
        })
        .collect()
}

#[must_use]
pub fn every_visit_updates(episode: &[Transition], returns: &[f64]) -> Vec<Visit> {
    episode
        .iter()
        .enumerate()
        .map(|(index, step)| Visit {
            state: step.state,
            action: step.action,
            target: returns[index],
        })
        .collect()
}

/// Generate one episode.
///
/// The step cap is not a safeguard to be quietly hit. A capped episode
/// contributes a TRUNCATED return, which biases every mean it touches
/// toward whatever the cap implies -- and that bias is invisible in the
/// value table. If this fires regularly, the task is not episodic and
/// this method does not apply to it.
pub fn generate_episode(
    step: &mut dyn FnMut(usize, usize) -> (usize, f64, bool),
    start_state: usize,
    choose: &mut dyn FnMut(usize) -> (usize, f64),
    max_steps: usize,
) -> Result<Episode, String> {
    let mut episode = Episode::new();
    let mut state = start_state;

    for _ in 0..max_steps {
        let (action, probability) = choose(state);
        let (next_state, reward, done) = step(state, action);
        episode.push(Transition {
            state,
            action,
            reward,
            behaviour_probability: probability,
        });

        if done {
            return Ok(episode);
        }
        state = next_state;
    }

    Err("episode hit the step cap; a truncated return biases every mean it enters, so \\
         this is a modelling problem rather than a limit to raise"
        .to_owned())
}

pub struct ControlResult {
    pub values: ActionValues,
    pub policy: Vec<usize>,
    pub coverage: f64,
}

/// On-policy control with a persistently exploring policy.
///
/// The honest caveat: with epsilon FIXED this converges to the optimal
/// epsilon-soft policy, which is not the optimal policy -- the agent
/// keeps taking random actions forever and the values reflect that. The
/// gap is proportional to epsilon, real, and almost never reported.
/// Annealing epsilon toward zero recovers the optimal policy, and it is
/// skipped more often than not.
pub fn epsilon_soft_control(
    step: &mut dyn FnMut(usize, usize) -> (usize, f64, bool),
    start_states: &[usize],
    n_states: usize,
    n_actions: usize,
    gamma: f64,
    episodes: usize,
    epsilon: f64,
    seed: u64,
) -> Result<ControlResult, String> {
    let mut rng = Lcg::new(seed);
    let mut values = ActionValues::new(n_states, n_actions);

    for _ in 0..episodes {
        let start = start_states[rng.next_index(start_states.len())];

        let episode = {
            let values_ref = &values;
            let mut choose = |state: usize| -> (usize, f64) {
                let greedy = values_ref.greedy_action(state);
                let action = if rng.next_uniform() < epsilon {
                    rng.next_index(n_actions)
                } else {
                    greedy
                };
                // Computed rather than assumed: epsilon-greedy puts
                // epsilon/|A| on every action plus 1-epsilon on greedy.
                let probability = epsilon / n_actions as f64
                    + if action == greedy { 1.0 - epsilon } else { 0.0 };
                (action, probability)
            };
            generate_episode(step, start, &mut choose, 10_000)?
        };

        let returns = compute_returns(&episode, gamma);
        for visit in first_visit_updates(&episode, &returns) {
            values.update(visit.state, visit.action, visit.target);
        }
    }

    let policy = (0..n_states).map(|state| values.greedy_action(state)).collect();
    let coverage = values.coverage();

    Ok(ControlResult {
        values,
        policy,
        coverage,
    })
}

pub struct OffPolicyEstimate {
    pub estimate: f64,
    pub effective_sample_size: f64,
    pub used_episodes: usize,
}

/// The unbiased off-policy estimator, and the unusable one.
///
///     V = (1/n) * sum_i rho_i * G_i,   rho_i = prod_t pi(a|s)/b(a|s)
///
/// Unbiased, with variance that is unbounded rather than merely large:
/// the weight is a PRODUCT along the trajectory, so one step where the
/// behaviour policy was unlikely to do what the target wants inflates a
/// whole episode's contribution. Over a long horizon the estimate is
/// routinely dominated by two or three trajectories.
///
/// This is the Horvitz-Thompson estimator; the causal-inference
/// literature met the same problem first and reached the same
/// conclusion.
#[must_use]
pub fn ordinary_importance_sampling(
    episodes: &[Episode],
    target_probs: &[Vec<f64>],
    gamma: f64,
) -> OffPolicyEstimate {
    let mut total = 0.0_f64;
    let mut used = 0_usize;

    for (episode, targets) in episodes.iter().zip(target_probs) {
        let mut ratio = 1.0_f64;
        let mut identified = true;

        for (step, target) in episode.iter().zip(targets) {
            if step.behaviour_probability <= 0.0 {
                // Positivity violation: unidentified at any sample
                // size. Not a small number -- an absent one.
                identified = false;
                break;
            }
            ratio *= target / step.behaviour_probability;
        }

        if !identified {
            continue;
        }
        total += ratio * compute_returns(episode, gamma)[0];
        used += 1;
    }

    if used == 0 {
        return OffPolicyEstimate {
            estimate: f64::NAN,
            effective_sample_size: 0.0,
            used_episodes: 0,
        };
    }

    OffPolicyEstimate {
        estimate: total / used as f64,
        effective_sample_size: 0.0,
        used_episodes: used,
    }
}

/// The biased, consistent, usable one.
///
///     V = sum_i rho_i G_i / sum_i rho_i
///
/// Normalizing by the weights rather than the count bounds the estimate
/// inside the range of observed returns, which removes the unbounded
/// variance at the cost of a bias that vanishes as the sample grows.
/// This is the Hajek estimator, and it is what anyone actually uses.
///
/// The effective sample size is reported because it is the honest
/// denominator: a thousand logged episodes whose weight concentrates on
/// three of them is an estimate from three episodes.
#[must_use]
pub fn weighted_importance_sampling(
    episodes: &[Episode],
    target_probs: &[Vec<f64>],
    gamma: f64,
) -> OffPolicyEstimate {
    let mut ratios = Vec::with_capacity(episodes.len());
    let mut returns = Vec::with_capacity(episodes.len());

    for (episode, targets) in episodes.iter().zip(target_probs) {
        let mut ratio = 1.0_f64;
        let mut identified = true;

        for (step, target) in episode.iter().zip(targets) {
            if step.behaviour_probability <= 0.0 {
                identified = false;
                break;
            }
            ratio *= target / step.behaviour_probability;
        }

        if !identified {
            continue;
        }
        ratios.push(ratio);
        returns.push(compute_returns(episode, gamma)[0]);
    }

    let total: f64 = ratios.iter().sum();
    if total <= 0.0 {
        return OffPolicyEstimate {
            estimate: f64::NAN,
            effective_sample_size: 0.0,
            used_episodes: ratios.len(),
        };
    }

    let weighted: f64 = ratios.iter().zip(&returns).map(|(r, g)| r * g).sum();
    let sum_squares: f64 = ratios.iter().map(|r| r * r).sum();

    OffPolicyEstimate {
        estimate: weighted / total,
        // Kish's effective sample size.
        effective_sample_size: (total * total) / sum_squares,
        used_episodes: ratios.len(),
    }
}

pub struct AliasingReport {
    pub estimate: f64,
    pub standard_error: f64,
    pub true_expected_return: f64,
}

/// Why this method survives a state that is not Markov.
///
/// Two underlying states are shown to the agent as one. Monte Carlo
/// averages the returns that ACTUALLY OCCURRED from that observation,
/// so it converges to the correct expected return for the process as
/// experienced -- the right answer to the question the agent can
/// actually ask.
///
/// A bootstrapping method updates toward its own estimate at the next
/// observation, and that estimate belongs to the aliased state rather
/// than the real one, so it converges to something that is not the
/// value of anything. This is the strongest argument for Monte Carlo
/// and it is usually omitted.
pub fn aliasing_demo(gamma: f64, episodes: usize, seed: u64) -> Result<AliasingReport, String> {
    let mut rng = Lcg::new(seed);
    let mut values = ActionValues::new(2, 1);

    for _ in 0..episodes {
        let mut step = |state: usize, _action: usize| -> (usize, f64, bool) {
            if state == 0 {
                let hidden = if rng.next_uniform() < 0.5 { 1.0 } else { -1.0 };
                return (1, hidden, true);
            }
            (1, 0.0, true)
        };
        let mut choose = |_state: usize| -> (usize, f64) { (0, 1.0) };

        let episode = generate_episode(&mut step, 0, &mut choose, 10_000)?;
        let returns = compute_returns(&episode, gamma);
        for visit in first_visit_updates(&episode, &returns) {
            values.update(visit.state, visit.action, visit.target);
        }
    }

    Ok(AliasingReport {
        estimate: values.value(0, 0),
        standard_error: values.standard_error(0, 0),
        true_expected_return: 0.0,
    })
}
`,
        profile:
          'Per episode: one O(T) backward pass for the returns and O(T) updates, with a BTreeSet lookup per step in the first-visit variant. Illustrative, not a measured benchmark: the cost that decides everything is episodes rather than arithmetic — the standard error falls as one over the square root of visits, so an extra digit costs a hundredfold more episodes, and the constant scales with episode length through the variance of the return.',
      },
      'make-it-right': {
        rationale:
          'The estimator choices the literal version made silently become types, because each changes what the run computes rather than how fast it runs. The step size becomes an enum: one over N is a sample mean that converges to the expectation and carries the convergence theory, while a fixed alpha is an exponential moving average that tracks a changing policy and converges to nothing — often the right choice and always a different claim. The exploration schedule becomes a type that reports whether it satisfies GLIE, since a fixed epsilon converges to the optimal epsilon-soft policy and an annealed one converges to the optimal policy, a difference in the answer rather than the speed and one that is systematically unreported. Newtypes separate the quantities that are otherwise all bare usize and f64 and all silently interchangeable: a state, an action, an episode index, a return and a probability. Every recoverable failure is a variant naming the values that caused it, including the three that matter most — an episode reaching its step cap, whose truncated return biases every mean it enters; a positivity violation, which is an unidentified quantity rather than a small weight; and a value requested for a pair with no visits, which the literal version answered with its initialization. The table keeps a Welford accumulator rather than a raw sum of squares, because the naive variance formula cancels two large numbers exactly where returns are large — the long-horizon case this method is already worst at. Reads borrow slices, and the reductions are iterator chains.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Monte Carlo control with the estimator choices made explicit.
//!
//! Four things the literal version decided silently:
//!
//!   * the step size, where 1/N is a sample mean that converges and a
//!     fixed alpha is a moving average that does not;
//!   * the exploration schedule, where a fixed epsilon converges to the
//!     optimal epsilon-soft policy rather than the optimal one;
//!   * what a truncated episode means, which is a biased return rather
//!     than a slightly short one;
//!   * what an unvisited pair is worth, which the literal version
//!     answered with whatever the table was initialized to.
//!
//! Each becomes a type or a \`Result\` variant here. The method's one
//! statistical advantage -- every entry is a sample mean with a count,
//! and therefore has a standard error -- is carried through to the
//! result rather than discarded.

use std::fmt;

/// A state index. Distinct from an action index and an episode index,
/// all three of which are \`usize\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct StateId(pub usize);

/// An action index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ActionId(pub usize);

/// A realized discounted return. Distinct from a value estimate, which
/// is a mean of these.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Return(pub f64);

/// A behaviour- or target-policy probability. Zero here is an
/// identification failure, not a small number.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Probability(pub f64);

#[derive(Debug, Clone, PartialEq)]
pub enum MonteCarloError {
    /// Not a limit to raise. A truncated episode contributes a
    /// truncated return, which biases every mean it enters toward
    /// whatever the cap implies, and the bias is invisible in the
    /// value table.
    EpisodeDidNotTerminate { steps: usize },
    /// An identification failure rather than a data-volume one: no
    /// estimator recovers this quantity at any sample size, which is
    /// the same statement the causal literature makes about positivity.
    PositivityViolation { state: usize, action: usize },
    UnvisitedPair { state: usize, action: usize },
    InvalidEpsilon { epsilon: f64 },
    InvalidDiscount { gamma: f64 },
    InvalidAlpha { alpha: f64 },
    EmptyDataset,
    NoSharedSupport,
}

impl fmt::Display for MonteCarloError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EpisodeDidNotTerminate { steps } => write!(
                formatter,
                "episode exceeded {steps} steps; a truncated return biases every mean it \\
                 enters, so this is a modelling problem rather than a cap to raise"
            ),
            Self::PositivityViolation { state, action } => write!(
                formatter,
                "state {state}, action {action}: the behaviour policy assigned zero \\
                 probability, so this quantity is unidentified at any sample size"
            ),
            Self::UnvisitedPair { state, action } => write!(
                formatter,
                "({state}, {action}) has no observations; the improvement step would rank \\
                 this entry's initialization rather than a measurement"
            ),
            Self::InvalidEpsilon { epsilon } => {
                write!(formatter, "epsilon must lie in [0, 1]; got {epsilon}")
            }
            Self::InvalidDiscount { gamma } => {
                write!(formatter, "gamma must lie in [0, 1]; got {gamma}")
            }
            Self::InvalidAlpha { alpha } => {
                write!(formatter, "alpha must lie in (0, 1]; got {alpha}")
            }
            Self::EmptyDataset => write!(formatter, "no episodes"),
            Self::NoSharedSupport => write!(
                formatter,
                "all importance weights are zero; the target and behaviour policies share \\
                 no support"
            ),
        }
    }
}

impl std::error::Error for MonteCarloError {}

/// Which estimator is running.
///
/// \`SampleMean\` weights every episode equally and converges to the
/// expectation; this is what the convergence theory assumes.
/// \`Exponential\` weights recent episodes more heavily, tracks a
/// changing policy, and converges to nothing -- frequently the right
/// choice, since returns from twenty policies ago estimate a different
/// quantity, but it is a different claim and it should be stated.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum StepSize {
    SampleMean,
    Exponential(f64),
}

/// \`First\` is unbiased; \`Every\` is biased at finite samples,
/// consistent, and usually lower variance.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VisitRule {
    First,
    Every,
}

/// Epsilon over time, with the consequence attached.
///
/// A constant epsilon converges to the optimal EPSILON-SOFT policy: the
/// agent keeps acting randomly forever and the values reflect that. The
/// gap from optimal is proportional to epsilon, real, and almost never
/// reported. Annealing as 1/n satisfies GLIE and recovers the optimal
/// policy.
#[derive(Debug, Clone, Copy)]
pub struct ExplorationSchedule {
    initial: f64,
    decay_exponent: f64,
}

impl ExplorationSchedule {
    pub fn new(initial: f64, decay_exponent: f64) -> Result<Self, MonteCarloError> {
        if !(0.0..=1.0).contains(&initial) {
            return Err(MonteCarloError::InvalidEpsilon { epsilon: initial });
        }
        Ok(Self {
            initial,
            decay_exponent: decay_exponent.max(0.0),
        })
    }

    #[must_use]
    pub fn at(&self, episode: usize) -> f64 {
        if self.decay_exponent == 0.0 {
            return self.initial;
        }
        self.initial / (episode.max(1) as f64).powf(self.decay_exponent)
    }

    /// Whether this schedule converges to the OPTIMAL policy.
    ///
    /// Exposed rather than documented: a run reporting its policy
    /// without saying which of the two it reached overstates the result
    /// by a margin proportional to epsilon.
    #[must_use]
    pub fn satisfies_glie(&self) -> bool {
        self.decay_exponent > 0.0 && self.decay_exponent <= 1.0
    }
}

/// A value with how well it is known.
///
/// A sample mean with a count has a standard error. Returning the mean
/// alone discards the one statistical advantage this method has over
/// everything else in the category.
#[derive(Debug, Clone, Copy)]
pub struct Estimate {
    pub value: f64,
    pub visits: usize,
    pub standard_error: f64,
}

/// Q, visit counts, and a Welford accumulator.
///
/// Welford rather than sum-of-squares-minus-square-of-sum: the naive
/// variance formula cancels two large numbers and loses precision
/// exactly where returns are large, which is the long-horizon case this
/// method is already worst at.
pub struct ActionValues {
    n_actions: usize,
    step_size: StepSize,
    q: Vec<f64>,
    counts: Vec<usize>,
    m2: Vec<f64>,
}

impl ActionValues {
    pub fn new(
        n_states: usize,
        n_actions: usize,
        step_size: StepSize,
    ) -> Result<Self, MonteCarloError> {
        if n_states == 0 || n_actions == 0 {
            return Err(MonteCarloError::EmptyDataset);
        }
        if let StepSize::Exponential(alpha) = step_size {
            if !(alpha > 0.0 && alpha <= 1.0) {
                return Err(MonteCarloError::InvalidAlpha { alpha });
            }
        }

        Ok(Self {
            n_actions,
            step_size,
            q: vec![0.0; n_states * n_actions],
            counts: vec![0; n_states * n_actions],
            m2: vec![0.0; n_states * n_actions],
        })
    }

    pub fn update(&mut self, state: StateId, action: ActionId, target: Return) {
        let index = state.0 * self.n_actions + action.0;
        self.counts[index] += 1;

        let previous = self.q[index];
        let rate = match self.step_size {
            StepSize::SampleMean => 1.0 / self.counts[index] as f64,
            StepSize::Exponential(alpha) => alpha,
        };
        self.q[index] = previous + rate * (target.0 - previous);
        self.m2[index] += (target.0 - previous) * (target.0 - self.q[index]);
    }

    pub fn estimate(&self, state: StateId, action: ActionId) -> Result<Estimate, MonteCarloError> {
        let index = state.0 * self.n_actions + action.0;
        if self.counts[index] == 0 {
            return Err(MonteCarloError::UnvisitedPair {
                state: state.0,
                action: action.0,
            });
        }
        if self.counts[index] < 2 {
            return Ok(Estimate {
                value: self.q[index],
                visits: self.counts[index],
                standard_error: f64::INFINITY,
            });
        }

        let count = self.counts[index] as f64;
        let variance = self.m2[index] / (count - 1.0);
        Ok(Estimate {
            value: self.q[index],
            visits: self.counts[index],
            standard_error: (variance / count).sqrt(),
        })
    }

    #[must_use]
    pub fn greedy_action(&self, state: StateId) -> ActionId {
        let base = state.0 * self.n_actions;
        let mut best = f64::NEG_INFINITY;
        let mut chosen = ActionId(0);

        for action in 0..self.n_actions {
            if self.q[base + action] > best {
                best = self.q[base + action];
                chosen = ActionId(action);
            }
        }
        chosen
    }

    /// Fraction of the table with any observation at all.
    ///
    /// The number that decides whether a learned policy means anything.
    #[must_use]
    pub fn coverage(&self) -> f64 {
        self.counts.iter().filter(|count| **count > 0).count() as f64 / self.counts.len() as f64
    }
}

pub struct Transition {
    pub state: StateId,
    pub action: ActionId,
    pub reward: f64,
    pub behaviour_probability: Probability,
}

/// G_t for every step, by one backward pass.
///
/// Backwards because G_t = R + gamma*G_{t+1} makes it linear; forwards
/// is quadratic in the episode length, which is a real cost on exactly
/// the long episodes this method already struggles with.
pub fn compute_returns(episode: &[Transition], gamma: f64) -> Result<Vec<Return>, MonteCarloError> {
    if !(0.0..=1.0).contains(&gamma) {
        return Err(MonteCarloError::InvalidDiscount { gamma });
    }

    let mut returns = vec![Return(0.0); episode.len()];
    let mut running = 0.0_f64;

    for index in (0..episode.len()).rev() {
        running = episode[index].reward + gamma * running;
        returns[index] = Return(running);
    }
    Ok(returns)
}

/// A value, with the denominator that actually produced it.
///
/// The effective sample size is the honest measure: a thousand logged
/// episodes whose weights concentrate on three of them is an estimate
/// from three episodes, and the mean alone conceals that completely.
pub struct OffPolicyEstimate {
    pub value: f64,
    pub effective_sample_size: f64,
    pub logged_episodes: usize,
    pub weight_cap_applied: bool,
}

/// The biased, consistent, usable off-policy estimator.
///
///     V = sum_i rho_i G_i / sum_i rho_i
///
/// Normalizing by the weights rather than the count bounds the estimate
/// inside the range of observed returns, removing the unbounded
/// variance of the unbiased form at the cost of a bias that vanishes
/// with the sample. This is the Hajek estimator, and the causal
/// literature reaches the same conclusion about stabilized weights.
///
/// Log-space accumulation is a correctness requirement rather than a
/// refinement: a product of several hundred ratios underflows to zero
/// in f64, and the estimator then divides by a denominator that lost
/// most of its mass -- which reads as unusual confidence rather than as
/// an error.
pub fn weighted_importance_sampling(
    episodes: &[Vec<Transition>],
    target_probs: &[Vec<Probability>],
    gamma: f64,
    log_weight_cap: Option<f64>,
) -> Result<OffPolicyEstimate, MonteCarloError> {
    if episodes.is_empty() {
        return Err(MonteCarloError::EmptyDataset);
    }

    let mut log_weights = Vec::with_capacity(episodes.len());
    let mut returns = Vec::with_capacity(episodes.len());
    let mut capped = false;

    for (episode, targets) in episodes.iter().zip(target_probs) {
        let mut log_ratio = 0.0_f64;

        for (step, target) in episode.iter().zip(targets) {
            if step.behaviour_probability.0 <= 0.0 {
                return Err(MonteCarloError::PositivityViolation {
                    state: step.state.0,
                    action: step.action.0,
                });
            }
            log_ratio += (target.0 / step.behaviour_probability.0).ln();
        }

        if let Some(cap) = log_weight_cap {
            if log_ratio > cap {
                log_ratio = cap;
                capped = true;
            }
        }

        log_weights.push(log_ratio);
        returns.push(compute_returns(episode, gamma)?[0].0);
    }

    // Shift by the maximum before exponentiating. The estimator is a
    // ratio, so a common factor cancels and the arithmetic stays inside
    // f64 however extreme the weights are.
    let largest = log_weights.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let weights: Vec<f64> = log_weights.iter().map(|value| (value - largest).exp()).collect();

    let total: f64 = weights.iter().sum();
    if total <= 0.0 {
        return Err(MonteCarloError::NoSharedSupport);
    }

    let weighted: f64 = weights.iter().zip(&returns).map(|(w, g)| w * g).sum();
    let sum_squares: f64 = weights.iter().map(|w| w * w).sum();

    Ok(OffPolicyEstimate {
        value: weighted / total,
        // Kish's effective sample size, scale-invariant so the shift
        // above does not affect it.
        effective_sample_size: (total * total) / sum_squares,
        logged_episodes: episodes.len(),
        weight_cap_applied: capped,
    })
}

/// How many episodes a target standard error needs.
///
/// From the one-over-square-root law, and worth computing before
/// launching a run rather than discovering afterwards: an extra decimal
/// digit costs a hundredfold more episodes. If the answer exceeds what
/// the simulator can deliver, the method is wrong for the problem and
/// no implementation detail rescues it.
#[must_use]
pub fn episodes_for_precision(observed_std: f64, target_error: f64) -> Option<usize> {
    if target_error <= 0.0 {
        return None;
    }
    Some(((observed_std / target_error).powi(2)).ceil() as usize)
}
`,
        profile:
          'Same asymptotics as the literal version — one O(T) backward pass and O(T) updates per episode — with Welford accumulation in place of a raw sum of squares and log-space importance weights. Illustrative, not a measured benchmark: the substantive change is that a truncated episode, a positivity violation and a request for an unvisited pair are now failures a caller must handle, and that the weights cannot silently underflow, which is the difference between a correct denominator and an estimate that merely looks confident.',
      },
      'make-it-fast': {
        rationale:
          'Episodes are the cost in this method, so the work is to process many at once rather than to shave the per-step arithmetic. Trajectories are packed into one flat block with an explicit episode-boundary index, so a batch is contiguous and both the reverse return pass and the accumulation stream through it instead of chasing a per-episode Vec. The first-visit test, which is naturally a set membership check per step, becomes a stamp array indexed by flattened state-action id and marked with the episode number: constant time, zero allocation, and no comparison-based container in the inner loop. Accumulation goes into three flat arrays — count, sum and sum of squares — indexed by that same id, so a visit is three indexed adds with no branch and no allocation. Episodes are independent, so rayon fans the return computation across cores by splitting the flat block at its boundaries with split_at_mut, which is how disjoint mutable slices are handed out safely; the scatter stays serial because it writes into shared counters and a race there is a correctness bug rather than a slowdown. Importance weights accumulate in log space, which is not a speed change but the difference between a correct denominator and one that silently underflowed to zero at the horizons this method is used on. Buffers are sized once from the batch shape, and pair ids are u32 while returns stay f64 — returns are sums over long trajectories and f32 accumulation loses enough precision to move a mean.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'A whole batch of trajectories lives in one block with explicit boundaries, so the reverse pass and the scatter both stream instead of chasing per-episode vectors',
            tradeoff: 'The batch must be packed before anything runs, so streaming a single episode as it is generated is more awkward than it was',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Episodes are independent, so split_at_mut hands each one a disjoint slice of the return buffer and the reverse passes run across cores',
            tradeoff: 'The scatter stays serial because it writes shared counters, so Amdahl bounds the win and a batch of very short episodes gains almost nothing',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Return, stamp and accumulator buffers are sized from the batch shape once, so a run of millions of episodes allocates only between batches',
            tradeoff: 'Buffers stay at peak batch shape for the process lifetime and are not reentrant, so two solves cannot share a workspace',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The per-episode reverse recurrence and the weight reductions are written as slice iterators, so the hot loops vectorize instead of bounds-checking every step',
            tradeoff: 'The chained form hides the index arithmetic, which is where an off-by-one at an episode boundary would otherwise be visible',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The stamp test and the pair-id computation are a few instructions called once per step, where call overhead would rival the work',
            tradeoff: 'Inlining into both the scatter and the weighting loops grows the code for a benefit that disappears once episodes are long',
          },
        ],
        code: `//! Monte Carlo control, batched.
//!
//! Episodes are the cost here, not arithmetic, so the work is to
//! process many at once. Trajectories are packed into one flat block
//! with an episode-boundary index; returns become reverse passes over
//! disjoint slices; the first-visit test becomes a stamp array; and
//! accumulation becomes three indexed adds.
//!
//! One change is about correctness rather than speed and matters more
//! than the rest: importance weights accumulate in log space. A product
//! of several hundred ratios underflows to zero in f64, and the
//! weighted estimator then divides by a denominator that lost most of
//! its mass -- silently, and in the direction of looking more
//! confident.
//!
//! What none of this changes: the standard error still falls as one
//! over the square root of visits. Faster episodes do not make the
//! estimator converge in fewer of them.

use rayon::prelude::*;

/// Many episodes in one flat block.
///
/// States, actions, rewards and behaviour probabilities are
/// concatenated across episodes; \`starts\` holds where each episode
/// begins, so boundaries are explicit rather than implied by a
/// sentinel. One allocation per field, so the whole batch streams.
pub struct PackedBatch {
    pub states: Vec<u32>,
    pub actions: Vec<u32>,
    pub rewards: Vec<f64>,
    pub behaviour_probs: Vec<f64>,
    pub starts: Vec<u32>, // length n_episodes + 1
}

impl PackedBatch {
    #[must_use]
    pub fn n_episodes(&self) -> usize {
        self.starts.len() - 1
    }

    #[must_use]
    pub fn n_steps(&self) -> usize {
        self.rewards.len()
    }

    #[must_use]
    pub fn window(&self, episode: usize) -> std::ops::Range<usize> {
        self.starts[episode] as usize..self.starts[episode + 1] as usize
    }
}

/// G_t for one episode, into a disjoint slice.
///
/// Written as a reverse recurrence over slices so the bounds checks are
/// elided: this is the innermost loop of the whole method and it runs
/// once per step of every episode.
#[inline]
fn reverse_returns(rewards: &[f64], returns: &mut [f64], gamma: f64) {
    let mut running = 0.0_f64;
    for index in (0..rewards.len()).rev() {
        running = rewards[index] + gamma * running;
        returns[index] = running;
    }
}

/// Returns for a whole batch, computed across cores.
///
/// Episodes are independent, so each gets a disjoint slice of the
/// output. split_at_mut is how those slices are handed out safely --
/// the borrow checker proves they do not overlap, which is the whole
/// reason this parallelizes without a lock or an unsafe block.
pub fn batched_returns(batch: &PackedBatch, gamma: f64) -> Vec<f64> {
    let mut returns = vec![0.0_f64; batch.n_steps()];

    let mut windows: Vec<(usize, usize)> = Vec::with_capacity(batch.n_episodes());
    for episode in 0..batch.n_episodes() {
        let range = batch.window(episode);
        windows.push((range.start, range.end));
    }

    let mut remaining: &mut [f64] = &mut returns;
    let mut slices: Vec<&mut [f64]> = Vec::with_capacity(windows.len());
    let mut consumed = 0_usize;

    for (start, end) in &windows {
        let skip = start - consumed;
        let (_, rest) = remaining.split_at_mut(skip);
        let (chunk, rest) = rest.split_at_mut(end - start);
        slices.push(chunk);
        remaining = rest;
        consumed = *end;
    }

    slices
        .into_par_iter()
        .zip(windows.par_iter())
        .for_each(|(chunk, (start, end))| {
            reverse_returns(&batch.rewards[*start..*end], chunk, gamma);
        });

    returns
}

/// Counts, sums and sums of squares, flat and preallocated.
///
/// Kept as sums rather than as a running mean so a whole batch can be
/// accumulated with three indexed adds per visit. The mean and the
/// standard error are derived on read, which costs one division and
/// removes the per-visit update entirely.
pub struct ScatterTables {
    n_actions: usize,
    counts: Vec<u64>,
    sums: Vec<f64>,
    sum_squares: Vec<f64>,
    /// Stamp array for the first-visit test: constant time, no
    /// allocation, no comparison-based container in the inner loop.
    stamp: Vec<i64>,
}

impl ScatterTables {
    #[must_use]
    pub fn new(n_states: usize, n_actions: usize) -> Self {
        let size = n_states * n_actions;
        let mut counts = Vec::with_capacity(size);
        let mut sums = Vec::with_capacity(size);
        let mut sum_squares = Vec::with_capacity(size);
        let mut stamp = Vec::with_capacity(size);

        counts.resize(size, 0);
        sums.resize(size, 0.0);
        sum_squares.resize(size, 0.0);
        stamp.resize(size, -1);

        Self {
            n_actions,
            counts,
            sums,
            sum_squares,
            stamp,
        }
    }

    #[inline]
    fn pair_id(&self, state: u32, action: u32) -> usize {
        state as usize * self.n_actions + action as usize
    }

    /// True the first time this pair is seen within this episode.
    #[inline]
    fn first_visit_in_episode(&mut self, pair: usize, episode: i64) -> bool {
        if self.stamp[pair] == episode {
            return false;
        }
        self.stamp[pair] = episode;
        true
    }

    #[inline]
    fn accumulate(&mut self, pair: usize, target: f64) {
        self.counts[pair] += 1;
        self.sums[pair] += target;
        self.sum_squares[pair] += target * target;
    }

    /// Means, with unvisited pairs left as NaN.
    ///
    /// NaN rather than zero on purpose: zero is a plausible value and
    /// an argmax over it silently prefers an unmeasured action, which
    /// is exactly the failure worth surfacing.
    #[must_use]
    pub fn means(&self) -> Vec<f64> {
        self.counts
            .iter()
            .zip(&self.sums)
            .map(|(count, sum)| {
                if *count > 0 {
                    sum / *count as f64
                } else {
                    f64::NAN
                }
            })
            .collect()
    }

    #[must_use]
    pub fn coverage(&self) -> f64 {
        self.counts.iter().filter(|count| **count > 0).count() as f64 / self.counts.len() as f64
    }
}

/// One batch into the tables: parallel returns, then a serial scatter.
///
/// The split is deliberate. Return computation is per-episode and
/// independent, so it parallelizes cleanly. Accumulation writes shared
/// counters, so it stays serial -- a race there is a correctness bug
/// rather than a slowdown, and Amdahl bounds what the parallel half can
/// win.
pub fn accumulate_batch(
    batch: &PackedBatch,
    tables: &mut ScatterTables,
    gamma: f64,
    first_visit: bool,
) {
    let returns = batched_returns(batch, gamma);

    for episode in 0..batch.n_episodes() {
        let range = batch.window(episode);
        for index in range {
            let pair = tables.pair_id(batch.states[index], batch.actions[index]);
            if first_visit && !tables.first_visit_in_episode(pair, episode as i64) {
                continue;
            }
            tables.accumulate(pair, returns[index]);
        }
    }
}

pub struct OffPolicyEstimate {
    pub value: f64,
    pub effective_sample_size: f64,
    pub identified_fraction: f64,
    pub logged_episodes: usize,
}

/// The Hajek estimator, computed stably.
///
/// Log-space accumulation is a correctness requirement: a product of
/// several hundred ratios underflows to zero in f64, and the estimator
/// then divides by a denominator that lost most of its mass.
/// Subtracting the maximum before exponentiating is exactly right here
/// because the estimator is a ratio, so a common factor cancels and the
/// arithmetic stays inside f64 however extreme the weights are.
///
/// Positivity failures are reported as a fraction rather than returned
/// as an error, because in a batched setting the right response is
/// usually to say how much of the data is unidentified rather than to
/// abandon the batch.
#[must_use]
pub fn weighted_importance_sampling(
    batch: &PackedBatch,
    target_probs: &[f64],
    gamma: f64,
    log_weight_cap: Option<f64>,
) -> Option<OffPolicyEstimate> {
    if batch.n_episodes() == 0 || target_probs.len() != batch.n_steps() {
        return None;
    }

    let returns = batched_returns(batch, gamma);
    let mut log_weights = Vec::with_capacity(batch.n_episodes());
    let mut episode_returns = Vec::with_capacity(batch.n_episodes());
    let mut identified = Vec::with_capacity(batch.n_episodes());

    for episode in 0..batch.n_episodes() {
        let range = batch.window(episode);
        let start = range.start;

        let mut log_ratio = 0.0_f64;
        let mut usable = true;
        for index in range {
            let behaviour = batch.behaviour_probs[index];
            if behaviour <= 0.0 {
                usable = false;
                break;
            }
            log_ratio += (target_probs[index] / behaviour).ln();
        }

        log_weights.push(match log_weight_cap {
            Some(cap) => log_ratio.min(cap),
            None => log_ratio,
        });
        episode_returns.push(returns[start]);
        identified.push(usable);
    }

    let largest = log_weights
        .iter()
        .zip(&identified)
        .filter(|(_, usable)| **usable)
        .map(|(weight, _)| *weight)
        .fold(f64::NEG_INFINITY, f64::max);

    if !largest.is_finite() {
        return None;
    }

    let (total, sum_squares, weighted, used) = log_weights
        .iter()
        .zip(&episode_returns)
        .zip(&identified)
        .filter(|((_, _), usable)| **usable)
        .map(|((log_weight, value), _)| {
            let weight = (log_weight - largest).exp();
            (weight, weight * weight, weight * value, 1_usize)
        })
        .fold((0.0, 0.0, 0.0, 0_usize), |acc, item| {
            (acc.0 + item.0, acc.1 + item.1, acc.2 + item.2, acc.3 + item.3)
        });

    if total <= 0.0 {
        return None;
    }

    Some(OffPolicyEstimate {
        value: weighted / total,
        // Kish's effective sample size, scale-invariant so the shift
        // above does not affect it.
        effective_sample_size: (total * total) / sum_squares,
        identified_fraction: used as f64 / batch.n_episodes() as f64,
        logged_episodes: batch.n_episodes(),
    })
}

/// How many episodes a target standard error needs.
///
/// From the one-over-square-root law, and worth computing before
/// launching a run: an extra decimal digit costs a hundredfold more
/// episodes, and nothing in this file changes that. If the answer
/// exceeds what the simulator can deliver, the method is the wrong one.
#[must_use]
pub fn episodes_for_precision(observed_std: f64, target_error: f64) -> Option<usize> {
    if target_error <= 0.0 {
        return None;
    }
    Some(((observed_std / target_error).powi(2)).ceil() as usize)
}
`,
        profile:
          'Per batch: one O(total steps) reverse pass split across cores at episode boundaries, and one O(total steps) serial scatter with a constant-time first-visit test. Illustrative, not a measured benchmark: the number that decides a run is still episodes, since the standard error falls as one over the square root of visits — episodes_for_precision() is the honest way to find out whether the budget exists before spending it, and the serial scatter is what bounds how much the parallel half can be worth.',
      },
    },
  },
};
