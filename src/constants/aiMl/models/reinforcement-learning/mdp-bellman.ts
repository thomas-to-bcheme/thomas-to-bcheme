import type { AiMlModel } from '../../types';

/**
 * MDPs and the Bellman equations — the entry that is a contract rather
 * than an algorithm.
 *
 * Nothing here is solved. What is established is that a solution exists,
 * is unique, and can be approached geometrically — and every algorithm
 * in this category is a different way of not computing it exactly. The
 * most useful single fact is that the discount factor is what makes all
 * three of those true.
 */
export const MDP_BELLMAN: AiMlModel = {
  slug: 'mdp-bellman',
  name: 'MDPs & the Bellman Equations',
  aliases: ['Markov Decision Process', 'Bellman optimality equation', 'Bellman expectation equation', 'Dynamic programming principle', 'Optimal substructure'],
  category: 'reinforcement-learning',
  group: 'foundations',
  kind: 'technique',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'A formalism rather than a learning procedure, so it has no paradigm of its own — it is listed under reinforcement because it is the problem statement every method in this category approximates. Worth noting that the Bellman recursion long predates reinforcement learning and is equally at home in operations research and optimal control, where the dynamics are known and the question is purely computational.',

  intuition:
    'Decide once what counts as the state, and make it a state that renders the past irrelevant — everything you need to know about history is in the current description. Then the value of a situation decomposes: what you get now, plus the discounted value of wherever you land. That recursion is the whole idea, and it is the reason a problem spanning a thousand steps can be attacked one step at a time. What makes it more than a tautology is the discount. Because a future reward is worth strictly less than a present one, the one-step backup shrinks disagreements between any two guesses by a constant factor, so repeating it drives every starting point to the same answer. Existence, uniqueness and a convergence rate all fall out of that single fact. The cost is stated equally simply: the whole structure rests on the state being genuinely Markov, and when it is not, the equations still have a fixed point — just not the one anybody wanted, and nothing in the arithmetic says so.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        'V^{*}(s) = \\max_{a \\in \\mathcal{A}} \\Bigl[ R(s, a) + \\gamma \\sum_{s\'} P(s\' \\mid s, a) \\, V^{*}(s\') \\Bigr], \\qquad V^{\\pi}(s) = \\sum_{a} \\pi(a \\mid s) \\Bigl[ R(s, a) + \\gamma \\sum_{s\'} P(s\' \\mid s, a) \\, V^{\\pi}(s\') \\Bigr]',
      symbols: [
        { symbol: 'P(s\' \\mid s, a)', meaning: 'the transition kernel — the environment\'s dynamics, and the thing that is known here and unknown everywhere else in this category' },
        { symbol: 'R(s, a)', meaning: 'expected immediate reward; the specification of the task, and the only place preferences enter' },
        { symbol: '\\gamma \\in [0, 1)', meaning: 'the discount, which is what makes the backup a contraction and therefore what makes a unique solution exist' },
        { symbol: '\\max_a', meaning: 'the optimality equation\'s nonlinearity — the reason control has no closed form while evaluation does' },
        { symbol: '\\pi(a \\mid s)', meaning: 'a fixed policy; with it the max disappears and the second equation is linear in V' },
      ],
    },
    reading:
      'Two equations, and the difference between them is the most useful thing in the formalism. The second, for a FIXED policy, is linear in V — it is a system of as many equations as there are states, and it can be solved exactly by matrix inversion. The first, for the optimal policy, has a max in it and is therefore nonlinear, with no closed form at any size. That single structural difference is why every method in this category alternates between an evaluation step that is easy and an improvement step that is not. Neither equation is a loss being minimized over data: they are self-consistency conditions, satisfied when a value function equals its own one-step lookahead. Read the recursion as the statement that an optimal decision sequence has optimal continuations — Bellman\'s principle of optimality — which is exactly what licences solving a long-horizon problem one step at a time. And note where the discount sits. It is inside the recursion, multiplying the successor value, so it compounds: a reward k steps away is worth gamma to the k. That is why gamma is an effective horizon of roughly one over one-minus-gamma steps rather than a preference about patience, and why moving it from 0.9 to 0.99 changes the problem being solved rather than tuning the solution to it.',
  },

  optimization: {
    method: 'Not an algorithm — a fixed-point characterization whose operator is a gamma-contraction, which is the property every method downstream exploits',
    updateRule: {
      formula:
        '(\\mathcal{T}V)(s) = \\max_a \\Bigl[ R(s,a) + \\gamma \\sum_{s\'} P(s\' \\mid s,a) V(s\') \\Bigr], \\qquad \\lVert \\mathcal{T}V - \\mathcal{T}U \\rVert_\\infty \\le \\gamma \\lVert V - U \\rVert_\\infty',
      symbols: [
        { symbol: '\\mathcal{T}', meaning: 'the Bellman optimality operator: one backup applied to every state at once' },
        { symbol: '\\lVert \\cdot \\rVert_\\infty', meaning: 'the sup-norm — the worst error over all states, which is the norm the contraction holds in' },
        { symbol: '\\gamma', meaning: 'the contraction modulus, so every backup shrinks the worst-case error by at least this factor' },
        { symbol: 'V^{*} = \\mathcal{T}V^{*}', meaning: 'the fixed point, unique by the Banach theorem and reachable from any starting V' },
      ],
    },
    rationale:
      'The contraction inequality is the load-bearing result, and almost everything practical follows from it mechanically. Banach\'s fixed-point theorem applies directly: the operator has exactly one fixed point, iterating it from any starting value converges to that point, and the error falls geometrically at rate gamma. That gives a computable stopping rule most people never use — if two successive iterates differ by less than epsilon in sup-norm, the current estimate is within gamma·epsilon over one-minus-gamma of the truth — so a value-iteration run has an actual error bound rather than a vibe about convergence. The contraction also explains the cost of a long horizon honestly: at gamma of 0.99 each backup removes one percent of the error, so reaching a given tolerance takes roughly a hundred times as many sweeps as it would at gamma of 0.9. That is not an implementation inefficiency, it is the problem being harder. Two boundaries worth naming. At gamma equal to one the contraction is gone, and the equations only have a solution under extra structure — proper episodic termination, or a switch to the average-reward formulation, which is a genuinely different set of equations rather than a limiting case. And the whole argument runs in sup-norm, which is exactly the norm function approximation does not preserve: a projection that is a contraction in least squares need not be one in sup-norm, and that mismatch is the formal root of the instability that appears the moment a table is replaced by a network.',
    hyperparameters: [
      { name: 'discount (gamma)', role: 'Not a preference but a specification of the horizon, roughly one over one-minus-gamma steps. It also sets the convergence rate, so it trades the problem you solve against the cost of solving it', typicalRange: '0.9 to 0.999' },
      { name: 'state representation', role: 'The Markov contract. Everything in the formalism is conditional on it, and violating it changes which fixed point exists without changing any arithmetic', typicalRange: 'problem-specific' },
      { name: 'reward specification', role: 'The entire task definition. Every downstream method optimizes exactly what is written here, which is why misspecification is silently and enthusiastically exploited', typicalRange: 'problem-specific' },
      { name: 'action set', role: 'What the agent may do. Enumerable actions make the max tractable; continuous ones make the optimality equation unsolvable directly', typicalRange: 'discrete and small, or a parameterized family' },
      { name: 'horizon and termination', role: 'Finite-horizon problems have a time-indexed value function and no fixed point at all; infinite-horizon ones need either discounting or proper termination', typicalRange: 'episodic, or infinite with gamma below 1' },
    ],
    convergence:
      'Guaranteed and quantified for the tabular case with a known model: a unique fixed point exists, value iteration reaches it geometrically at rate gamma, and the sup-norm gap between successive iterates bounds the distance to it. The failures are all in the modelling rather than the arithmetic, which is what makes them hard to see. A non-Markov state is the central one — the equations remain perfectly well-posed and converge to the fixed point of the aggregated process, which is generally not the value function of anything anyone wanted; the value estimates look stable and the derived policy is simply wrong, with no diagnostic in the numbers. A discount of exactly one removes the contraction and the iteration diverges unless every policy is proper, which is easy to violate by accident when a state can loop forever. Reward scale interacts with everything downstream: multiplying rewards by a constant multiplies values by the same constant, harmless in a table and destabilizing the moment a function approximator with a fixed learning rate is involved. And sup-norm is the norm this all lives in, so the contraction argument gives no guarantee whatsoever once values are projected onto an approximator — the deadly triad of bootstrapping, off-policy sampling and approximation is exactly the statement that the contraction can fail in the projected norm.',
    complexity:
      'Policy evaluation is a linear system: O(|S|^3) solved directly, or O(|S|^2·|A|) per sweep iteratively, which is usually far cheaper for sparse dynamics since the cost is really the number of reachable successors rather than the number of states squared. The optimality equation has no closed form, so it is solved iteratively, with the number of sweeps set by gamma and the tolerance. The binding constraint is neither: it is that |S| grows exponentially in the number of state variables, so the tabular guarantees are exact and unreachable for almost every real problem — which is the entire reason the rest of this category exists.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The formalism requires actions that change the transition, and a forecast does not act on the series it describes — the Markov assumption is shared with state-space models, but without a decision variable there is no max, no policy, and nothing for the Bellman recursion to say.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations and takes no action that alters what happens next, so there is no transition kernel and no return to optimize; a large Bellman residual is a statement about an unconverged value function, never about the data.',
      },
      optimization: {
        fit: 'primary',
        how: 'The formalism IS the optimization problem: a sequential decision problem stated as states, actions, a transition kernel, a reward and a discount, whose solution is characterized by a fixed point rather than by a gradient. Everything downstream is a different relaxation of "the kernel is known and the state space is enumerable".',
        where: [
          'Optimal substructure as a proof technique — the principle of optimality is what licences solving a long problem one step at a time',
          'The contraction property as a convergence certificate, with a computable error bound from successive iterates',
          'Linear evaluation against nonlinear control, which is the structural reason every method alternates between the two',
          'The discount as a horizon specification, where changing it changes the problem rather than tuning the solver',
        ],
        why: 'Worth studying in its own right rather than as preamble, because three lessons here transfer directly to problems that have nothing to do with agents. First, that a recursion plus a contraction gives existence, uniqueness and a rate all at once — a pattern that recurs in numerical analysis, in equilibrium computation and in anything solved by successive approximation. Second, that a maximum inside a recursion is what destroys a closed form: the same equations without the max are a linear solve, and recognizing which of the two a problem is has decided more architectures than any algorithmic preference. Third, that the norm in which a contraction holds is part of the result and not a technicality — the entire instability of deep reinforcement learning is the observation that the sup-norm contraction says nothing once values are projected in least squares. The honest limitation is equally clean: the guarantees are exact and the state space is exponential, so this is the reference solution nobody can compute.',
        featurization: [
          'Check that the state genuinely satisfies the Markov property before anything else; every guarantee below is conditional on it and none of them fail loudly when it breaks',
          'Choose the discount from the horizon the problem actually has, then accept the convergence cost it implies rather than lowering it to make the solver finish',
          'Verify each row of the transition kernel sums to one, since a mis-normalized kernel converges perfectly to the value of a different process',
          'State the reward as the objective rather than as a hint toward it; every method in this category optimizes the literal text',
        ],
        evaluation:
          'The Bellman residual in sup-norm, which is the only quantity here with a guarantee attached: the gap between successive iterates bounds the distance to the true value function by gamma over one-minus-gamma times that gap. For a derived policy, compare its exact evaluation against the optimal value rather than comparing value estimates, since two value functions can differ substantially and induce the same greedy policy.',
        pitfalls: [
          'Treating gamma as a tuning knob, when lowering it solves a shorter-horizon problem and reports the answer to a different question',
          'A non-Markov state, which converges cleanly to the fixed point of the wrong process with no diagnostic anywhere',
          'Gamma at exactly one without proper termination, where the contraction is gone and the iteration diverges',
          'Assuming the contraction survives function approximation; it holds in sup-norm and approximators do not preserve that norm',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'The formalism was built for this and reads as a literal description of an operations problem: the state is the physical or logistical configuration, actions are the interventions available, the kernel is the system dynamics, and the reward is throughput minus cost. Where the dynamics are genuinely known — a queue, an inventory, a machine with a documented failure model — the equations can be solved rather than learned.',
        where: [
          'Inventory and replenishment policies, where the classical order-up-to results are Bellman solutions in closed form',
          'Maintenance scheduling as an optimal-stopping problem, one of the few MDPs with a genuinely analytic answer',
          'Queueing and admission control, where the kernel follows from the arrival and service processes',
          'Equipment replacement and capacity planning over a long horizon with known cost structure',
        ],
        why: 'The strongest fit in this reference for a reason worth stating plainly: operations research solved these problems with these equations decades before reinforcement learning existed, and where the dynamics are known the exact solution is available and no learning is required. That is the first thing to check, and it is checked far too rarely — a team that reaches for a policy-gradient method on a problem with a known transition kernel has chosen a sampling approximation to something it could have computed. The structural limitation is the state space rather than the mathematics. Realistic operations problems have many state variables and the table is exponential in their number, which is what pushes practice toward approximation, decomposition into independent subproblems, or a receding-horizon controller that re-solves a short problem repeatedly.',
        featurization: [
          'Look for a known kernel first; if the dynamics are documented, solve the equations rather than sampling an approximation to them',
          'Exploit structure before scaling — monotone value functions, threshold-optimal policies and decomposable state often collapse the problem entirely',
          'Encode operational constraints as unavailable actions rather than as reward penalties, which the optimizer will otherwise trade against',
          'Keep the discount tied to a real financial horizon, where an operations problem usually has one already',
        ],
        evaluation:
          'Exact policy evaluation against the incumbent policy, which is available here precisely because the kernel is known — this is the rare domain where the comparison is a calculation rather than an experiment. Simulate the resulting policy against a kernel perturbed within its estimation error, since the sensitivity of the answer to the dynamics is usually larger than the gap between candidate policies.',
        pitfalls: [
          'Learning a policy for a system whose dynamics are already written down',
          'A state space that multiplies out to more entries than can be enumerated, discovered after the formulation is fixed',
          'Constraints expressed as penalties, which turns a hard limit into an exchange rate',
          'Ignoring kernel estimation error, when the policy is often more sensitive to it than to the discount',
        ],
      },
      'causal-inference': {
        fit: 'viable',
        how: 'The transition kernel is an interventional distribution rather than an observational one — P(s\' | s, do(a)) — which makes an MDP a causal model with a time index. Evaluating a policy that was never run is then exactly the identification problem, and the sequential importance weights that solve it are inverse propensity weighting applied at every step.',
        where: [
          'Off-policy evaluation from logged decisions, which is sequential IPTW under another name',
          'Dynamic treatment regimes in clinical settings, where the same equations appear with different vocabulary',
          'Sequential confounding, where the Markov assumption plays the role of sequential ignorability',
          'Policy comparison from observational logs, before any live experiment is contemplated',
        ],
        why: 'Worth including because the correspondence is exact rather than decorative, and it is the fastest way to import decades of causal-inference care into a reinforcement-learning project. The Markov assumption is doing the work that sequential ignorability does: it asserts that the state contains everything that confounds the action and the outcome, which is an untestable substantive claim and not a modelling convenience. The consequences are the familiar ones. Importance weights multiply across timesteps, so their variance grows geometrically with the horizon and an off-policy estimate over more than a handful of steps is usually too noisy to act on — the reinforcement-learning literature calls this the curse of horizon and the causal literature met it first. Positivity has the same bite: a state-action pair the logging policy never chose is not identified, and no estimator recovers it. The honest boundary is that reinforcement learning usually assumes away the confounding that causal inference exists to handle, so the fit is a lens on off-policy evaluation rather than a claim that MDPs solve causal problems.',
        featurization: [
          'Treat the Markov assumption as the identification assumption it is, and argue for it substantively rather than asserting it',
          'Check positivity per state-action pair; an action the logging policy never took in a state is not identified at any sample size',
          'Report the effective sample size of the importance weights, which collapses fast as the horizon grows',
          'Prefer doubly robust or model-assisted estimators over raw importance sampling beyond a few steps',
        ],
        evaluation:
          'Off-policy value estimates with confidence intervals rather than point estimates, since the variance is the finding here more often than the mean. Where a randomized logging policy exists even partially, use it: a little deliberate exploration in the logs is worth more than any estimator.',
        pitfalls: [
          'Unobserved confounding, which the Markov assumption assumes away rather than addresses',
          'Importance weights compounding over a long horizon until the estimate is dominated by a handful of trajectories',
          'Positivity violations reported as small values rather than as unidentified quantities',
          'Reading an off-policy point estimate as a decision when its interval spans the incumbent',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Frame a session as an episode: the state summarizes interaction history, actions are items or slates to surface, and the reward is engagement over the session rather than on the next click. The formalism is what makes the long-horizon objective expressible at all.',
        where: [
          'Session-level objectives, where the sequence of recommendations matters more than any single one',
          'Stating the exploration-exploitation structure precisely before choosing between a bandit and a full MDP',
          'Slate and sequence problems where an action changes what the user will consider next',
          'Making the feedback loop explicit: today\'s policy generates tomorrow\'s training data, which is a transition, not noise',
        ],
        why: 'A useful framing and a poor literal application, and being clear about which is which saves a great deal of work. The framing earns its place because ranking genuinely is sequential — the exposure decision changes the state — and a pointwise model cannot express that at all. The literal application fails on both terms of the formalism: the action space is the entire catalogue, so the max over actions is intractable without a candidate-generation stage, and the state is a user, which is emphatically not Markov in any compact representation. What usually survives is the vocabulary rather than the solution method: stating the problem as an MDP clarifies that a contextual bandit is the one-step special case, and the bandit is very often the right thing to build.',
        featurization: [
          'Compress the session into a state deliberately, since the raw history is unbounded and the Markov claim is about the compression',
          'Restrict the action set with candidate generation before any max over actions is contemplated',
          'Decide explicitly whether the problem is one-step; if it is, a contextual bandit is the correct specialization and not a compromise',
          'Log the policy that generated each impression, or off-policy evaluation later is not identified',
        ],
        evaluation:
          'Online tests decide. Off-policy estimates on logged data are worth computing first and worth distrusting, because the horizon inflates importance-weight variance and the logs reflect the incumbent policy\'s exposure decisions as much as user preference.',
        pitfalls: [
          'Treating a user as a Markov state, which is the assumption doing all the work and the one least examined',
          'A max over the full catalogue, which is intractable and usually silently replaced by something else',
          'Building a full MDP where a contextual bandit captures nearly all the value',
          'Unlogged propensities, which make every later off-policy question unanswerable',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'There is no training. Solving the equations exactly costs one linear solve per policy evaluation, or a sequence of sweeps whose count is set by the discount and the tolerance — at gamma of 0.99, reaching a given accuracy takes roughly a hundred times the sweeps it would at 0.9, which is the problem being harder rather than the solver being slow. The real cost is that a sweep touches every state, and the state count is exponential in the number of state variables. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'A single argmax over the action row of a solved value function: microseconds, and completely inspectable — every action considered has a number attached and the reason one was chosen can be printed. This is the property every approximate method in this category gives up, and it is worth a great deal in any setting where a policy has to be defended to somebody.',
    retrainingCadence:
      'Re-solve when the kernel or the reward changes, and note that this is a discrete event rather than a drift: a re-layout, a new price, a changed service-level target invalidates the solution completely rather than degrading it gradually. Where the kernel is estimated from data, re-estimating it on a schedule and re-solving is cheap; where it is specified by hand, the review cadence is a process question rather than a technical one.',
    driftAndMonitoring: [
      'Bellman residual in sup-norm on the deployed value function, which detects a moved kernel directly rather than by proxy',
      'Realized transition frequencies against the assumed kernel, since a specified model drifts from reality silently and the policy keeps acting confidently',
      'State-visitation coverage against the states the solution assumed reachable; an unreachable state with a confident value is a specification error surfacing late',
      'Realized discounted return against the value function\'s prediction, which is the end-to-end check that subsumes the others',
      'Frequency of states with no defined action, which is a fallback path that usually exists and usually has never been exercised',
    ],
    productionGotchas: [
      'The reward function is the specification, not a hint. Every method in this category optimizes the literal text, and a mismatch with the real objective is exploited rather than smoothed over',
      'The Markov claim is an assumption about the state representation and nothing checks it. A non-Markov state yields a clean, converged, confident solution to a different problem',
      'Gamma is part of the problem statement. Changing it to make a solver converge quietly answers a different question, and the answer will still look reasonable',
      'A transition kernel whose rows do not sum to one converges perfectly well to the value of a process that leaks probability, with no error raised anywhere',
      'Tie-breaking in the argmax is a policy decision. Exact ties are common in structured problems, and an arbitrary rule can produce a policy that oscillates between equivalent actions',
      'Sup-norm contraction is what all the guarantees rest on, and function approximation does not preserve it — carrying the tabular intuition across that boundary is the origin of most deep-RL instability',
      'A finite-horizon problem has a time-indexed value function and no fixed point at all; solving it as if it were infinite-horizon is a silent modelling error',
    ],
  },

  assumptions: [
    'The state is Markov — it contains everything about the history that matters for the future, which is a substantive claim and never a free one',
    'The transition kernel and reward are stationary; a changing environment invalidates the fixed point being computed rather than degrading it',
    'The discount is strictly below one, or the episode terminates with probability one under every policy, since otherwise the contraction and its guarantees are gone',
    'State and action spaces are enumerable, which is exactly the assumption every other method in this category exists to relax',
    'The reward function expresses the objective completely, because anything left out is not traded off — it is ignored',
  ],

  pros: [
    {
      point: 'Existence, uniqueness and a convergence rate all follow from one contraction inequality',
      context:
        'Unusually strong for anything in this reference, and the reason the formalism is worth learning precisely rather than approximately. It also supplies a computable error bound from successive iterates, which almost nobody uses',
    },
    {
      point: 'The recursion turns a horizon-length problem into a one-step problem',
      context:
        'Bellman\'s principle of optimality is what makes sequential decisions tractable at all. The same pattern — optimal substructure plus a contraction — recurs well outside reinforcement learning',
    },
    {
      point: 'Policy evaluation is a linear system with an exact solution',
      context:
        'The max is the only nonlinearity, so removing it makes the problem a matrix inverse. Recognizing which of the two equations a task needs has settled more design questions than any algorithmic preference',
    },
    {
      point: 'A solved value function is completely inspectable',
      context:
        'Every action in every state has a number and a reason. This is what every approximate method trades away, and it is worth a great deal wherever a policy must be explained rather than merely deployed',
    },
    {
      point: 'It states the problem precisely enough that the right specialization becomes obvious',
      context:
        'Writing a task as an MDP frequently reveals that it is one-step, or that the dynamics are known, or that the state cannot be Markov — each of which points at a simpler method than the one originally planned',
    },
  ],

  cons: [
    {
      point: 'The state space is exponential in the number of state variables',
      context:
        'The guarantees are exact and unreachable for almost every real problem. This single fact is why the rest of this category exists, and why the exact solution is a reference point rather than a method',
    },
    {
      point: 'Everything is conditional on the Markov property and nothing checks it',
      context:
        'A non-Markov state produces a converged, confident solution to the aggregated process instead. There is no diagnostic in the numbers, which makes this the most dangerous failure here',
    },
    {
      point: 'The transition kernel must be known, which it usually is not',
      context:
        'Where it is known the equations should be solved rather than learned, and that check is skipped far too often. Where it is not, every method downstream is paying sample efficiency to estimate it implicitly',
    },
    {
      point: 'The optimality equation has no closed form at any size',
      context:
        'The max makes it nonlinear, so control is always iterative even when the model is fully known. Only the fixed-policy evaluation step is a solve',
    },
    {
      point: 'The contraction holds in sup-norm, which function approximation does not preserve',
      context:
        'Every stability guarantee stops at the boundary between a table and an approximator, and carrying the intuition across it anyway is the formal root of the deadly triad',
    },
    {
      point: 'A long horizon is expensive in a way that cannot be tuned away',
      context:
        'Convergence rate is the discount, so gamma at 0.999 needs roughly a thousand times the sweeps of 0.9 for the same tolerance. Lowering it to finish sooner answers a different question',
    },
  ],

  relatedSlugs: ['dynamic-programming', 'q-learning', 'td-learning', 'monte-carlo-control', 'kalman-filter'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""MDPs and the Bellman equations, transcribed literally.

No library. A tiny MDP held as nested lists, so every claim in the
theory becomes something that can be computed rather than quoted:

    V*(s)  = max_a [ R(s,a) + gamma * sum_s' P(s'|s,a) V*(s') ]
    V^pi(s) =  sum_a pi(a|s) [ R(s,a) + gamma * sum_s' P(s'|s,a) V^pi(s') ]

Four things to read for.

1. The two equations are structurally different. The second is LINEAR
   in V, and solve_policy_value_exactly() inverts it by Gaussian
   elimination with no iteration at all. The first has a max in it and
   is nonlinear, so value_iteration() can only approach it. That single
   difference is why every method in this category alternates between a
   cheap evaluation step and an expensive improvement step.

2. contraction_check() measures the inequality the whole formalism
   rests on: one backup shrinks the sup-norm gap between any two value
   functions by at least gamma.

3. value_iteration() returns a real error BOUND, not a sense that it
   converged. If two successive iterates differ by eps then the current
   estimate is within gamma*eps/(1-gamma) of the truth.

4. markov_violation_demo() aggregates two states that behave
   differently and solves again. Nothing errors. The iteration
   converges cleanly to the fixed point of a process nobody wanted, and
   the derived policy is wrong -- which is the most dangerous failure
   here precisely because the numbers look healthy.
"""

Kernel = list[list[list[float]]]   # P[state][action][next_state]
Reward = list[list[float]]         # R[state][action]
Policy = list[list[float]]         # pi[state][action]


def sup_norm(left: list[float], right: list[float]) -> float:
    """Largest absolute difference over states.

    The norm the contraction holds in, and not an arbitrary choice: the
    guarantees below are all sup-norm statements, and they say nothing
    about a least-squares projection -- which is exactly the gap where
    deep reinforcement learning loses its stability argument.
    """
    return max(abs(a - b) for a, b in zip(left, right))


def expected_next_value(
    kernel: Kernel, values: list[float], state: int, action: int
) -> float:
    total = 0.0
    for next_state, probability in enumerate(kernel[state][action]):
        total += probability * values[next_state]
    return total


def bellman_optimality_backup(
    kernel: Kernel, reward: Reward, values: list[float], gamma: float
) -> list[float]:
    """One application of T: the max makes this nonlinear.

    Every state updated from the same input values, which is what makes
    this an operator rather than a sweep -- and what makes the
    contraction argument apply cleanly.
    """
    updated = []
    for state, action_rewards in enumerate(reward):
        best = max(
            action_rewards[action] + gamma * expected_next_value(kernel, values, state, action)
            for action in range(len(action_rewards))
        )
        updated.append(best)
    return updated


def bellman_expectation_backup(
    kernel: Kernel, reward: Reward, policy: Policy, values: list[float], gamma: float
) -> list[float]:
    """One application of T^pi: no max, therefore linear in V.

    Read against the function above. The only difference is that the
    max became an average under a fixed policy, and that is the entire
    reason this equation has a closed-form solution and the other does
    not.
    """
    updated = []
    for state, action_probabilities in enumerate(policy):
        total = 0.0
        for action, probability in enumerate(action_probabilities):
            if probability == 0.0:
                continue
            total += probability * (
                reward[state][action]
                + gamma * expected_next_value(kernel, values, state, action)
            )
        updated.append(total)
    return updated


def solve_policy_value_exactly(
    kernel: Kernel, reward: Reward, policy: Policy, gamma: float
) -> list[float]:
    """V^pi = (I - gamma P_pi)^-1 R_pi, by Gaussian elimination.

    Written out because the fact that this is possible at all is the
    structural point. Policy evaluation is a linear system with as many
    equations as states; no iteration, no tolerance, no convergence
    criterion. The optimality equation admits nothing of the kind at
    any size.
    """
    n_states = len(reward)

    # Build (I - gamma P_pi) augmented with R_pi.
    matrix = []
    for state in range(n_states):
        row = [0.0] * (n_states + 1)
        row[state] = 1.0

        for action, probability in enumerate(policy[state]):
            if probability == 0.0:
                continue
            row[n_states] += probability * reward[state][action]
            for next_state, transition in enumerate(kernel[state][action]):
                row[next_state] -= gamma * probability * transition
        matrix.append(row)

    # Forward elimination with partial pivoting.
    for column in range(n_states):
        pivot_row = max(range(column, n_states), key=lambda r: abs(matrix[r][column]))
        if abs(matrix[pivot_row][column]) < 1e-12:
            raise ValueError(
                f"(I - gamma P_pi) is singular at column {column}; this happens at "
                "gamma = 1 with a policy that never terminates, where the equation "
                "has no solution rather than a hard one"
            )
        matrix[column], matrix[pivot_row] = matrix[pivot_row], matrix[column]

        for row in range(column + 1, n_states):
            factor = matrix[row][column] / matrix[column][column]
            if factor == 0.0:
                continue
            for position in range(column, n_states + 1):
                matrix[row][position] -= factor * matrix[column][position]

    # Back substitution.
    values = [0.0] * n_states
    for state in reversed(range(n_states)):
        total = matrix[state][n_states]
        for column in range(state + 1, n_states):
            total -= matrix[state][column] * values[column]
        values[state] = total / matrix[state][state]
    return values


def value_iteration(
    kernel: Kernel, reward: Reward, gamma: float, tolerance: float = 1e-8, max_sweeps: int = 10_000
):
    """Iterate T to its fixed point, with an actual error bound.

    The contraction gives more than "it converged": if successive
    iterates differ by eps in sup-norm, the current estimate is within
    gamma*eps/(1-gamma) of V*. That bound is computable, free, and
    almost never reported.

    Note the sweep count against gamma. At 0.9 each backup removes a
    tenth of the error; at 0.999 it removes a thousandth. The hundredfold
    difference in sweeps is the problem being harder, not the solver
    being slow.
    """
    if not 0.0 <= gamma < 1.0:
        raise ValueError(
            f"gamma must lie in [0, 1); got {gamma}. At exactly 1 the backup is not a "
            "contraction and none of the guarantees below hold"
        )

    values = [0.0] * len(reward)
    for sweep in range(max_sweeps):
        updated = bellman_optimality_backup(kernel, reward, values, gamma)
        gap = sup_norm(updated, values)
        values = updated

        if gap < tolerance:
            return {
                "values": values,
                "sweeps": sweep + 1,
                "final_gap": gap,
                # The bound, from the contraction. Not an estimate.
                "error_bound": gamma * gap / (1.0 - gamma),
            }

    return {
        "values": values,
        "sweeps": max_sweeps,
        "final_gap": gap,
        "error_bound": gamma * gap / (1.0 - gamma),
    }


def greedy_policy(kernel: Kernel, reward: Reward, values: list[float], gamma: float) -> list[int]:
    """Act greedily on a value function.

    Tie-breaking is a policy decision, not an implementation detail:
    exact ties are common in structured problems, and min() here picks
    the lowest index deterministically so a re-solve does not silently
    produce a different policy with the same value.
    """
    actions = []
    for state, action_rewards in enumerate(reward):
        scored = [
            (
                action_rewards[action] + gamma * expected_next_value(kernel, values, state, action),
                action,
            )
            for action in range(len(action_rewards))
        ]
        best_value = max(score for score, _ in scored)
        actions.append(min(action for score, action in scored if score == best_value))
    return actions


def contraction_check(
    kernel: Kernel, reward: Reward, gamma: float, first: list[float], second: list[float]
) -> dict[str, float]:
    """The inequality the entire formalism rests on, measured.

        ||T V - T U||_inf  <=  gamma * ||V - U||_inf

    Everything else -- that a solution exists, that it is unique, that
    iteration reaches it, at what rate -- is Banach's fixed-point
    theorem applied to this one line.
    """
    before = sup_norm(first, second)
    after = sup_norm(
        bellman_optimality_backup(kernel, reward, first, gamma),
        bellman_optimality_backup(kernel, reward, second, gamma),
    )
    return {
        "gap_before": before,
        "gap_after": after,
        "observed_modulus": after / before if before > 0.0 else 0.0,
        "gamma": gamma,
        "holds": after <= gamma * before + 1e-12,
    }


def effective_horizon(gamma: float) -> float:
    """Roughly how many steps the discount actually looks ahead.

    1/(1-gamma). Worth computing rather than intuiting: gamma of 0.99 is
    a hundred-step horizon, which is a different problem from the
    ten-step one at 0.9 rather than a more patient version of it.
    """
    return 1.0 / (1.0 - gamma)


def markov_violation_demo(gamma: float = 0.9) -> dict[str, object]:
    """The failure with no diagnostic.

    Two states that behave differently are merged into one, as any
    coarse state representation does. The aggregated MDP is perfectly
    well-formed: the kernel normalizes, the backup contracts, value
    iteration converges, and the bound is satisfied.

    It converges to the value function of the aggregated process, which
    is not the value function of the original. The derived policy is
    wrong and nothing anywhere says so -- which is why the Markov claim
    has to be argued substantively rather than checked numerically.
    """
    # Three states. From s0, action 0 leads to s1 (good), action 1 to s2
    # (bad). s1 and s2 are absorbing with very different rewards.
    kernel: Kernel = [
        [[0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        [[0.0, 1.0, 0.0], [0.0, 1.0, 0.0]],
        [[0.0, 0.0, 1.0], [0.0, 0.0, 1.0]],
    ]
    reward: Reward = [[0.0, 0.0], [1.0, 1.0], [-1.0, -1.0]]

    true_solution = value_iteration(kernel, reward, gamma)
    true_policy = greedy_policy(kernel, reward, true_solution["values"], gamma)

    # Now aggregate s1 and s2 into a single state, averaging what an
    # observer who cannot tell them apart would see.
    aggregated_kernel: Kernel = [
        [[0.0, 1.0], [0.0, 1.0]],
        [[0.0, 1.0], [0.0, 1.0]],
    ]
    aggregated_reward: Reward = [[0.0, 0.0], [0.0, 0.0]]

    aggregated_solution = value_iteration(aggregated_kernel, aggregated_reward, gamma)
    aggregated_policy = greedy_policy(
        aggregated_kernel, aggregated_reward, aggregated_solution["values"], gamma
    )

    return {
        "markov_values": true_solution["values"],
        "markov_policy": true_policy,
        "aggregated_values": aggregated_solution["values"],
        "aggregated_policy": aggregated_policy,
        "note": (
            "both runs converged inside their error bounds; the aggregated one "
            "solved a different problem and reported no difficulty doing so"
        ),
    }
`,
        profile:
          'One optimality backup is O(|S|·|A|·|S\'|) where |S\'| is the number of reachable successors, and value iteration needs roughly log(tolerance)/log(gamma) sweeps — about 175 at gamma 0.9 and 1750 at 0.99 for the same tolerance. Exact policy evaluation is one O(|S|³) elimination. Illustrative, not a measured benchmark: the shape worth reading is that the sweep count depends on gamma and not on the problem, which is the contraction rate showing up directly as running time.',
      },
      'make-it-right': {
        rationale:
          'The MDP stops being four loose nested lists and becomes a validated object, because every guarantee in this entry is conditional on properties nothing in the literal version checked: rows of the kernel summing to one, a discount strictly below one, rewards that are finite, and shapes that agree across the kernel, the reward and the policy. A kernel that leaks probability converges perfectly to the value of a process that loses mass, which is the exact shape of failure this formalism specializes in — clean numbers describing the wrong problem — so the checks happen once at construction rather than being implied. Every recoverable failure becomes a specific exception naming the values that caused it, including the two that are genuinely unrecoverable rather than merely wrong: a discount of one with a policy that never terminates, where the linear system is singular and the equation has no solution, and a state with no available action, where the max is over an empty set. The discount becomes a frozen value object that also reports its own effective horizon, so the number people treat as a tuning knob announces the horizon it actually specifies. Value iteration returns a result object carrying the sweep count, the final gap and the contraction error bound rather than a bare list, because the bound is free, computable and the only honest statement about how converged the answer is. And the diagnostics that catch a misspecified model are functions rather than advice: a measured contraction modulus, and an exact policy evaluation that lets a derived policy be compared by its value rather than by the value function that produced it.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""The formalism with its preconditions enforced.

The literal version accepted all of these without complaint:

  * a transition row summing to 0.97, which converges cleanly to the
    value of a process that leaks probability;
  * a discount of exactly 1, where the backup is not a contraction and
    every guarantee silently stops applying;
  * a state with no available action, where the max is over an empty
    set;
  * a kernel, reward and policy whose shapes disagree, which indexes
    into whatever happens to be there.

Each is checked once, at construction. That placement is the point: an
MDP is a contract, and a contract validated per call is one that gets
validated in three places and skipped in the fourth.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int64]

# Rows may drift by this much from summing to one before it is an error
# rather than floating-point noise.
KERNEL_TOLERANCE = 1e-9


class MdpError(Exception):
    """Base for every violated precondition of the formalism."""


class MalformedKernel(MdpError):
    """A transition row does not describe a distribution.

    Worth its own type because the failure is silent: probability that
    leaks out of a row is never redistributed and never reported, and
    the fixed point that results is the value function of a process
    that quietly loses mass.
    """


class InvalidDiscount(MdpError):
    """Gamma outside [0, 1), where the contraction does not hold."""


class NoAvailableAction(MdpError):
    """A state with an empty action set; the max has nothing to range over."""


class SingularEvaluation(MdpError):
    """(I - gamma P_pi) is not invertible.

    This is not a numerical difficulty to work around. At gamma of one
    with a policy that never terminates, the expectation equation has no
    solution, and the right response is to fix the model.
    """


@dataclass(frozen=True)
class Discount:
    """The discount, with the horizon it actually specifies.

    A value object rather than a float because it is routinely treated
    as a tuning knob, and it is not one: changing it changes the problem
    being solved and the cost of solving it at the same time.
    """

    gamma: float

    def __post_init__(self) -> None:
        if not 0.0 <= self.gamma < 1.0:
            raise InvalidDiscount(
                f"gamma must lie in [0, 1); got {self.gamma}. At exactly 1 the Bellman "
                "backup is not a contraction, so existence, uniqueness and the "
                "convergence rate all stop applying"
            )

    @property
    def effective_horizon(self) -> float:
        """1/(1-gamma) — roughly how many steps this looks ahead."""
        return 1.0 / (1.0 - self.gamma)

    def sweeps_for_tolerance(self, tolerance: float, initial_gap: float = 1.0) -> int:
        """How many backups a given accuracy needs, from the contraction.

        Computable in advance, which makes the cost of a long horizon a
        planning input rather than a surprise: at gamma 0.999 this is
        roughly a thousand times the count at 0.9.
        """
        if tolerance <= 0.0:
            raise ValueError(f"tolerance must be positive, got {tolerance}")
        if self.gamma == 0.0:
            return 1
        return int(np.ceil(np.log(tolerance / initial_gap) / np.log(self.gamma)))


@dataclass(frozen=True)
class MarkovDecisionProcess:
    """States, actions, dynamics, reward — validated once.

    Frozen because an MDP is the problem statement. Mutating the kernel
    after a solve leaves a value function that answers a question no
    longer being asked, and nothing downstream would notice.
    """

    kernel: FloatArray      # (states, actions, states)
    reward: FloatArray      # (states, actions)
    available: npt.NDArray[np.bool_]  # (states, actions)

    def __post_init__(self) -> None:
        if self.kernel.ndim != 3:
            raise MalformedKernel(f"kernel must be (S, A, S); got shape {self.kernel.shape}")

        n_states, n_actions, n_next = self.kernel.shape
        if n_states != n_next:
            raise MalformedKernel(
                f"kernel maps {n_states} states to {n_next}; a transition kernel is square"
            )
        if self.reward.shape != (n_states, n_actions):
            raise MdpError(
                f"reward shape {self.reward.shape} does not match kernel ({n_states}, {n_actions})"
            )
        if self.available.shape != (n_states, n_actions):
            raise MdpError(
                f"availability shape {self.available.shape} does not match the reward"
            )

        if not np.all(np.isfinite(self.reward[self.available])):
            raise MdpError("reward contains a non-finite value on an available action")
        if np.any(self.kernel < 0.0):
            raise MalformedKernel("kernel contains a negative probability")

        # The check that matters most, and the one nothing else catches.
        row_sums = self.kernel.sum(axis=2)
        offenders = np.argwhere(np.abs(row_sums[self.available] - 1.0) > KERNEL_TOLERANCE)
        if offenders.size > 0:
            worst = float(np.max(np.abs(row_sums[self.available] - 1.0)))
            raise MalformedKernel(
                f"a transition row departs from 1 by {worst:.3e}; probability that leaks "
                "is never redistributed, and the fixed point becomes the value of a "
                "process that loses mass"
            )

        empty = np.flatnonzero(~self.available.any(axis=1))
        if empty.size > 0:
            raise NoAvailableAction(
                f"states {empty.tolist()} have no available action; the max in the "
                "optimality equation ranges over an empty set"
            )

    @property
    def n_states(self) -> int:
        return int(self.kernel.shape[0])

    @property
    def n_actions(self) -> int:
        return int(self.kernel.shape[1])

    def action_values(self, values: FloatArray, discount: Discount) -> FloatArray:
        """Q(s, a) for every pair, with unavailable actions masked out.

        Masked rather than dropped so the array shape is constant, and
        masked to negative infinity rather than to a large negative
        number, which would be an exchange rate instead of a prohibition.
        """
        expected = self.kernel @ values
        scored = self.reward + discount.gamma * expected
        return np.where(self.available, scored, -np.inf)


class SolveResult(NamedTuple):
    """A value function, with how much to trust it.

    The bound is free — it falls straight out of the contraction — and
    reporting a value function without it is reporting a number with an
    unstated accuracy.
    """

    values: FloatArray
    sweeps: int
    final_gap: float
    error_bound: float
    converged: bool


def value_iteration(
    mdp: MarkovDecisionProcess,
    discount: Discount,
    tolerance: float = 1e-10,
    max_sweeps: int = 100_000,
) -> SolveResult:
    """Iterate the optimality operator, with a real error bound.

    Guard clauses first, then the loop: the interesting path is the
    iteration and everything else is an early exit.
    """
    if tolerance <= 0.0:
        raise ValueError(f"tolerance must be positive, got {tolerance}")

    values = np.zeros(mdp.n_states, dtype=np.float64)
    gap = np.inf

    for sweep in range(1, max_sweeps + 1):
        updated = mdp.action_values(values, discount).max(axis=1)
        gap = float(np.max(np.abs(updated - values)))
        values = updated

        if gap < tolerance:
            return SolveResult(
                values=values,
                sweeps=sweep,
                final_gap=gap,
                error_bound=discount.gamma * gap / (1.0 - discount.gamma),
                converged=True,
            )

    return SolveResult(
        values=values,
        sweeps=max_sweeps,
        final_gap=gap,
        error_bound=discount.gamma * gap / (1.0 - discount.gamma),
        converged=False,
    )


def evaluate_policy_exactly(
    mdp: MarkovDecisionProcess, policy: FloatArray, discount: Discount
) -> FloatArray:
    """V^pi = (I - gamma P_pi)^-1 R_pi, solved rather than iterated.

    The structural point of the whole formalism: with the max removed
    the equation is linear, and a linear system is solved rather than
    approached. solve() rather than inv(), which is both stabler and the
    idiomatic way to say "I want x, not the inverse".
    """
    if policy.shape != (mdp.n_states, mdp.n_actions):
        raise MdpError(f"policy shape {policy.shape} does not match the MDP")
    if not np.allclose(policy.sum(axis=1), 1.0, atol=KERNEL_TOLERANCE):
        raise MdpError("policy rows must be distributions over actions")
    if np.any(policy[~mdp.available] > 0.0):
        raise MdpError("policy places mass on an unavailable action")

    transition = np.einsum("sa,sat->st", policy, mdp.kernel)
    expected_reward = np.einsum("sa,sa->s", policy, mdp.reward)
    system = np.eye(mdp.n_states) - discount.gamma * transition

    try:
        return np.linalg.solve(system, expected_reward)
    except np.linalg.LinAlgError as error:
        raise SingularEvaluation(
            "(I - gamma P_pi) is singular; at gamma near 1 with a policy that never "
            "terminates the expectation equation has no solution, and the model is "
            "what needs fixing"
        ) from error


def greedy_policy(
    mdp: MarkovDecisionProcess, values: FloatArray, discount: Discount
) -> IntArray:
    """Act greedily, breaking ties by lowest index.

    Tie-breaking is a policy decision rather than an implementation
    detail: exact ties are common in structured problems, and an
    unspecified rule lets a re-solve return a different policy with an
    identical value, which reads as instability and is not.
    """
    return np.argmax(mdp.action_values(values, discount), axis=1).astype(np.int64)


class ContractionReport(NamedTuple):
    gap_before: float
    gap_after: float
    observed_modulus: float
    gamma: float
    holds: bool


def contraction_report(
    mdp: MarkovDecisionProcess, discount: Discount, first: FloatArray, second: FloatArray
) -> ContractionReport:
    """The inequality everything rests on, measured rather than assumed.

        ||T V - T U||_inf  <=  gamma * ||V - U||_inf

    A cheap assertion to keep in a test suite: if it fails, the kernel
    or the discount is malformed in a way the constructor missed, and
    every guarantee downstream is void.
    """
    before = float(np.max(np.abs(first - second)))
    after = float(
        np.max(
            np.abs(
                mdp.action_values(first, discount).max(axis=1)
                - mdp.action_values(second, discount).max(axis=1)
            )
        )
    )
    return ContractionReport(
        gap_before=before,
        gap_after=after,
        observed_modulus=after / before if before > 0.0 else 0.0,
        gamma=discount.gamma,
        holds=after <= discount.gamma * before + 1e-9,
    )


def policy_gap(
    mdp: MarkovDecisionProcess, policy: FloatArray, optimal_values: FloatArray, discount: Discount
) -> float:
    """How much a policy actually loses, in sup-norm.

    Compare policies by their exact value, never by the value functions
    that produced them: two value functions can differ substantially and
    induce the same greedy policy, and two that differ slightly can
    induce different ones. The policy is the artefact; the value
    function is scaffolding.
    """
    return float(np.max(np.abs(optimal_values - evaluate_policy_exactly(mdp, policy, discount))))
`,
        profile:
          'One backup becomes a single (S, A, S) times (S,) contraction plus a row-wise max, so the per-sweep cost is unchanged asymptotically but the Python loop over states is gone; exact evaluation is one O(|S|³) solve. Illustrative, not a measured benchmark: the substantive change is that a leaking kernel, a discount of one, a state with no action and a policy placing mass on an unavailable one are now failures raised at construction, where the literal version converged cleanly on every one of them and reported a number.',
      },
      'make-it-fast': {
        rationale:
          'The dense kernel is the wrong data structure and replacing it is worth more than every other change here combined: a real MDP has a handful of reachable successors per state-action pair, so a dense (S, A, S) array is almost entirely zeros and a dense backup spends its time multiplying by them. Flattening the pairs into one CSR matrix turns the expectation into a single sparse matrix-vector product whose cost is the number of non-zero transitions rather than the square of the state count, which is the difference between a problem that fits and one that does not. On top of that the backup is fused: the reward add, the discounted expectation, the availability mask and the per-state max over actions run as one pass into preallocated buffers, so the (S·A) intermediate that the previous stage materialized on every sweep is never written. Gauss-Seidel ordering replaces the Jacobi sweep — reading updated values within the same pass rather than from a copy — which converges in noticeably fewer sweeps on most structured problems at no cost beyond giving up the clean operator semantics. Where the tolerance is loose, prioritized sweeping reorders the work by Bellman residual so the states that are still wrong are updated first instead of every state being visited equally. Everything is float64 and C-contiguous end to end, since the accumulated error over thousands of sweeps at a high discount is large enough to matter and a silent dtype promotion mid-expression would copy the whole kernel.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The expectation over successors becomes one sparse matrix-vector product over all state-action pairs at once instead of a loop or a dense contraction',
            tradeoff: 'The CSR layout must be built up front and is immutable, so a kernel that changes — an estimated model refreshed on a schedule — means a rebuild rather than an edit',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Reward, discounted expectation, availability mask and the per-state max run in one pass, so the (S·A) action-value array is never written',
            tradeoff: 'The fused form hides the action values, which are exactly what you want when asking why a particular action was chosen',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Value, scratch and residual buffers are allocated once, so ten thousand sweeps at a high discount allocate nothing',
            tradeoff: 'The buffers are not reentrant, so two solves cannot share a workspace and a parallel sweep needs its own copy',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Keeping the CSR data, the reward and the values all float64 and C-contiguous avoids a silent promotion that would copy the whole kernel mid-expression',
            tradeoff: 'float64 doubles the memory of the largest array in the system, which is the binding constraint at the state counts where sparsity was the point',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The per-state Gauss-Seidel pass is the one remaining loop, and prioritized sweeping shrinks it to the states whose residual is still large',
            tradeoff: 'The priority queue costs a log factor per update and only pays when the residual is concentrated; on a uniformly-wrong value function it is pure overhead',
          },
        ],
        code: `"""The Bellman backup, shaped for a kernel that is mostly zeros.

A real MDP has a handful of reachable successors per state-action pair.
A dense (S, A, S) kernel is therefore almost entirely zeros, and a dense
backup spends nearly all of its time multiplying by them. Flattening
into one CSR matrix over state-action pairs turns the expectation into a
single sparse matrix-vector product whose cost is the number of
transitions that exist.

What this does not change: the sweep count still comes from gamma, so a
faster sweep does not shorten a long horizon. It makes each of the
thousand sweeps cheap; it does not make there be fewer of them.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from scipy import sparse

FloatArray = npt.NDArray[np.float64]
IndexArray = npt.NDArray[np.int32]


@dataclass
class SparseMdp:
    """Transitions as one CSR matrix over flattened (state, action) rows.

    transitions is (S·A, S): row s*A + a holds the successor
    distribution for that pair. One sparse matvec then computes the
    expectation for every pair simultaneously, which is the whole
    reason for the flattening.

    The layout is immutable by construction — CSR indices encode the
    sparsity pattern — so a kernel re-estimated on a schedule means a
    rebuild. That is the right trade for a solver and the wrong one for
    a model that is being edited.
    """

    transitions: sparse.csr_matrix
    reward: FloatArray            # (S·A,), flattened to match
    available: npt.NDArray[np.bool_]  # (S·A,)
    n_states: int
    n_actions: int

    @classmethod
    def from_dense(
        cls,
        kernel: FloatArray,
        reward: FloatArray,
        available: npt.NDArray[np.bool_],
    ) -> SparseMdp:
        n_states, n_actions, _ = kernel.shape
        flattened = kernel.reshape(n_states * n_actions, n_states)

        return cls(
            transitions=sparse.csr_matrix(flattened, dtype=np.float64),
            reward=np.ascontiguousarray(reward.reshape(-1), dtype=np.float64),
            available=np.ascontiguousarray(available.reshape(-1)),
            n_states=n_states,
            n_actions=n_actions,
        )

    @property
    def density(self) -> float:
        """What fraction of the kernel is actually non-zero.

        Worth reporting rather than assuming: if this is near one the
        sparse layout is pure overhead and the dense backup was
        correct. It is the number that decides which implementation is
        appropriate, and it is cheap.
        """
        return self.transitions.nnz / (self.transitions.shape[0] * self.n_states)


class BackupWorkspace:
    """Every buffer a sweep needs, allocated once.

    A solver running ten thousand sweeps at a high discount allocates
    nothing after construction. The buffers are not reentrant, which is
    the price: two solves cannot share a workspace.
    """

    def __init__(self, mdp: SparseMdp) -> None:
        self.pairs = np.empty(mdp.n_states * mdp.n_actions, dtype=np.float64)
        self.updated = np.empty(mdp.n_states, dtype=np.float64)
        self.residual = np.empty(mdp.n_states, dtype=np.float64)


def fused_optimality_backup(
    mdp: SparseMdp, values: FloatArray, gamma: float, workspace: BackupWorkspace
) -> FloatArray:
    """One backup: sparse matvec, mask and max, in a single pass.

    The (S·A) action-value array is written into preallocated scratch
    rather than returned, so nothing is materialized per sweep. The
    availability mask is applied as negative infinity rather than as a
    large negative reward, which keeps a prohibition a prohibition
    instead of an exchange rate the optimizer can trade against.
    """
    # Expectation for every (state, action) pair at once. Cost is the
    # number of transitions that exist, not the square of the state
    # count -- which is the entire point of the layout.
    np.multiply(mdp.transitions.dot(values), gamma, out=workspace.pairs)
    np.add(workspace.pairs, mdp.reward, out=workspace.pairs)
    np.copyto(workspace.pairs, -np.inf, where=~mdp.available)

    # Row-wise max over actions, into the preallocated value buffer.
    np.max(
        workspace.pairs.reshape(mdp.n_states, mdp.n_actions), axis=1, out=workspace.updated
    )
    return workspace.updated


def value_iteration(
    mdp: SparseMdp, gamma: float, tolerance: float = 1e-10, max_sweeps: int = 100_000
) -> dict[str, object]:
    """Jacobi iteration with the contraction's error bound.

    Sweep count is set by gamma and the tolerance and not by anything
    done here. That is worth restating because it is the thing a faster
    backup cannot fix: at gamma 0.999 the answer needs roughly a
    thousand times the sweeps of gamma 0.9, and each of them is now
    cheap.
    """
    workspace = BackupWorkspace(mdp)
    values = np.zeros(mdp.n_states, dtype=np.float64)
    gap = np.inf

    for sweep in range(1, max_sweeps + 1):
        updated = fused_optimality_backup(mdp, values, gamma, workspace)
        np.subtract(updated, values, out=workspace.residual)
        gap = float(np.max(np.abs(workspace.residual)))
        values = values.copy() if sweep == 1 else values
        np.copyto(values, updated)

        if gap < tolerance:
            break

    return {
        "values": values,
        "sweeps": sweep,
        "final_gap": gap,
        "error_bound": gamma * gap / (1.0 - gamma),
        "converged": gap < tolerance,
    }


def gauss_seidel_sweep(
    mdp: SparseMdp, values: FloatArray, gamma: float, order: IndexArray
) -> float:
    """In-place backup reading its own updates within the sweep.

    Jacobi computes every new value from the old array; Gauss-Seidel
    reads whatever is current, so information propagates across the
    state space within a single pass instead of one state per sweep.
    On most structured problems that is a meaningful reduction in sweep
    count for no extra arithmetic.

    What it costs is the clean operator semantics: this is no longer an
    application of T to a value function, so the contraction bound needs
    restating and the ordering now affects the trajectory. The fixed
    point is the same; the path to it is not.
    """
    largest_change = 0.0
    indptr = mdp.transitions.indptr
    indices = mdp.transitions.indices
    data = mdp.transitions.data

    for state in order:
        best = -np.inf
        base = int(state) * mdp.n_actions

        for action in range(mdp.n_actions):
            row = base + action
            if not mdp.available[row]:
                continue

            expectation = 0.0
            for position in range(indptr[row], indptr[row + 1]):
                expectation += data[position] * values[indices[position]]

            candidate = mdp.reward[row] + gamma * expectation
            if candidate > best:
                best = candidate

        change = abs(best - values[state])
        if change > largest_change:
            largest_change = change
        values[state] = best

    return largest_change


def prioritized_sweeping(
    mdp: SparseMdp,
    gamma: float,
    predecessors: list[list[int]],
    tolerance: float = 1e-10,
    max_updates: int = 1_000_000,
) -> dict[str, object]:
    """Update the states that are still wrong, in residual order.

    A uniform sweep spends the same effort on a state whose value has
    converged as on one that has not. Prioritized sweeping keeps a queue
    ordered by Bellman residual and pushes a state's predecessors
    whenever its value moves, so work follows the information.

    Whether it pays is a property of the problem: when the residual is
    concentrated -- a goal-directed problem where value propagates
    backwards from a terminal state -- it is a large win; on a uniformly
    wrong value function the heap is pure overhead against a vectorized
    sweep. The density and residual distribution decide, not taste.
    """
    values = np.zeros(mdp.n_states, dtype=np.float64)
    queue: list[tuple[float, int]] = []
    queued: set[int] = set()

    for state in range(mdp.n_states):
        heapq.heappush(queue, (-abs(mdp.reward[state * mdp.n_actions]), state))
        queued.add(state)

    updates = 0
    while queue and updates < max_updates:
        priority, state = heapq.heappop(queue)
        queued.discard(state)

        if -priority < tolerance:
            continue

        previous = values[state]
        gauss_seidel_sweep(mdp, values, gamma, np.array([state], dtype=np.int32))
        updates += 1

        change = abs(values[state] - previous)
        if change < tolerance:
            continue

        # The change propagates backwards, so predecessors are the
        # states whose values are now stale.
        for predecessor in predecessors[state]:
            if predecessor in queued:
                continue
            heapq.heappush(queue, (-gamma * change, predecessor))
            queued.add(predecessor)

    return {"values": values, "updates": updates}


def sweeps_needed(gamma: float, tolerance: float, initial_gap: float = 1.0) -> int:
    """How many backups the tolerance needs, before running any.

    Straight from the contraction, and the honest way to size a job: the
    cost of a long horizon is knowable in advance rather than discovered
    after an hour. Nothing in this file changes this number.
    """
    if not 0.0 <= gamma < 1.0:
        raise ValueError(f"gamma must lie in [0, 1); got {gamma}")
    if gamma == 0.0:
        return 1
    return int(np.ceil(np.log(tolerance / initial_gap) / np.log(gamma)))
`,
        profile:
          'One sparse backup is O(nnz) where nnz is the number of transitions that exist, against O(|S|²·|A|) dense — on a kernel with a handful of successors per pair that is the difference between linear and quadratic in the state count. Sweep count remains log(tolerance)/log(gamma), unchanged by anything here. Illustrative, not a measured benchmark: the number worth checking first is the kernel density, since above roughly ten percent non-zero the sparse layout costs more in indirection than it saves in arithmetic and the dense backup is the right implementation.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// MDPs and the Bellman equations, transcribed literally.
//
// No library. A tiny MDP in nested vectors, so every claim in the
// theory becomes something computed rather than quoted:
//
//     V*(s)   = max_a [ R(s,a) + gamma * sum_s' P(s'|s,a) V*(s') ]
//     V^pi(s) = sum_a pi(a|s) [ R(s,a) + gamma * sum_s' P(s'|s,a) V^pi(s') ]
//
// Four things to read for.
//
// 1. The two equations are structurally different. The second is LINEAR
//    in V, and SolvePolicyValueExactly() inverts it by Gaussian
//    elimination with no iteration at all. The first has a max and is
//    nonlinear, so ValueIteration() can only approach it. That is why
//    every method in this category alternates between a cheap
//    evaluation step and an expensive improvement step.
//
// 2. ContractionCheck() measures the inequality everything rests on:
//    one backup shrinks the sup-norm gap between any two value
//    functions by at least gamma.
//
// 3. ValueIteration() returns a real error BOUND rather than a sense
//    that it converged. If successive iterates differ by eps, the
//    estimate is within gamma*eps/(1-gamma) of the truth.
//
// 4. MarkovViolationDemo() aggregates two states that behave
//    differently and solves again. Nothing errors, the iteration
//    converges inside its bound, and the answer is the value function
//    of a process nobody wanted.

#include <cmath>
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

namespace mdp {

using Kernel = std::vector<std::vector<std::vector<double>>>;  // P[s][a][s']
using Reward = std::vector<std::vector<double>>;               // R[s][a]
using Policy = std::vector<std::vector<double>>;               // pi[s][a]

// Largest absolute difference over states.
//
// The norm the contraction holds in, and not an arbitrary choice: every
// guarantee here is a sup-norm statement, and none of them survive a
// least-squares projection -- which is precisely where deep
// reinforcement learning loses its stability argument.
double SupNorm(const std::vector<double>& left, const std::vector<double>& right) {
  double largest = 0.0;
  for (std::size_t index = 0; index < left.size(); ++index) {
    largest = std::max(largest, std::abs(left[index] - right[index]));
  }
  return largest;
}

double ExpectedNextValue(const Kernel& kernel, const std::vector<double>& values,
                         std::size_t state, std::size_t action) {
  double total = 0.0;
  for (std::size_t next_state = 0; next_state < kernel[state][action].size(); ++next_state) {
    total += kernel[state][action][next_state] * values[next_state];
  }
  return total;
}

// One application of T. The max is what makes this nonlinear.
//
// Every state updated from the same input values, which is what makes
// this an operator rather than a sweep -- and what lets the contraction
// argument apply cleanly.
std::vector<double> BellmanOptimalityBackup(const Kernel& kernel, const Reward& reward,
                                            const std::vector<double>& values, double gamma) {
  std::vector<double> updated(values.size(), 0.0);

  for (std::size_t state = 0; state < reward.size(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    for (std::size_t action = 0; action < reward[state].size(); ++action) {
      const double candidate =
          reward[state][action] + gamma * ExpectedNextValue(kernel, values, state, action);
      best = std::max(best, candidate);
    }
    updated[state] = best;
  }
  return updated;
}

// One application of T^pi: no max, therefore linear in V.
//
// Read against the function above. The only difference is that the max
// became an average under a fixed policy, and that is the entire reason
// this equation has a closed-form solution and the other does not.
std::vector<double> BellmanExpectationBackup(const Kernel& kernel, const Reward& reward,
                                             const Policy& policy,
                                             const std::vector<double>& values, double gamma) {
  std::vector<double> updated(values.size(), 0.0);

  for (std::size_t state = 0; state < policy.size(); ++state) {
    double total = 0.0;
    for (std::size_t action = 0; action < policy[state].size(); ++action) {
      const double probability = policy[state][action];
      if (probability == 0.0) {
        continue;
      }
      total += probability * (reward[state][action] +
                              gamma * ExpectedNextValue(kernel, values, state, action));
    }
    updated[state] = total;
  }
  return updated;
}

// V^pi = (I - gamma P_pi)^-1 R_pi, by Gaussian elimination.
//
// Written out because the fact that it is possible at all is the
// structural point. Policy evaluation is a linear system with as many
// equations as states: no iteration, no tolerance, no convergence
// criterion. The optimality equation admits nothing of the kind at any
// size.
std::vector<double> SolvePolicyValueExactly(const Kernel& kernel, const Reward& reward,
                                            const Policy& policy, double gamma) {
  const std::size_t n_states = reward.size();
  std::vector<std::vector<double>> matrix(n_states, std::vector<double>(n_states + 1, 0.0));

  for (std::size_t state = 0; state < n_states; ++state) {
    matrix[state][state] = 1.0;
    for (std::size_t action = 0; action < policy[state].size(); ++action) {
      const double probability = policy[state][action];
      if (probability == 0.0) {
        continue;
      }
      matrix[state][n_states] += probability * reward[state][action];
      for (std::size_t next_state = 0; next_state < n_states; ++next_state) {
        matrix[state][next_state] -= gamma * probability * kernel[state][action][next_state];
      }
    }
  }

  for (std::size_t column = 0; column < n_states; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < n_states; ++row) {
      if (std::abs(matrix[row][column]) > std::abs(matrix[pivot][column])) {
        pivot = row;
      }
    }
    if (std::abs(matrix[pivot][column]) < 1e-12) {
      throw std::runtime_error(
          "(I - gamma P_pi) is singular; at gamma = 1 with a policy that never "
          "terminates the equation has no solution rather than a hard one");
    }
    std::swap(matrix[column], matrix[pivot]);

    for (std::size_t row = column + 1; row < n_states; ++row) {
      const double factor = matrix[row][column] / matrix[column][column];
      if (factor == 0.0) {
        continue;
      }
      for (std::size_t position = column; position <= n_states; ++position) {
        matrix[row][position] -= factor * matrix[column][position];
      }
    }
  }

  std::vector<double> values(n_states, 0.0);
  for (std::size_t index = n_states; index-- > 0;) {
    double total = matrix[index][n_states];
    for (std::size_t column = index + 1; column < n_states; ++column) {
      total -= matrix[index][column] * values[column];
    }
    values[index] = total / matrix[index][index];
  }
  return values;
}

struct SolveResult {
  std::vector<double> values;
  std::size_t sweeps;
  double final_gap;
  double error_bound;
  bool converged;
};

// Iterate T to its fixed point, with an actual error bound.
//
// The contraction gives more than "it converged": if successive
// iterates differ by eps in sup-norm then the estimate is within
// gamma*eps/(1-gamma) of V*. That bound is computable, free, and almost
// never reported.
//
// Note the sweep count against gamma. At 0.9 each backup removes a
// tenth of the error; at 0.999 a thousandth. The difference is the
// problem being harder, not the solver being slow.
SolveResult ValueIteration(const Kernel& kernel, const Reward& reward, double gamma,
                           double tolerance = 1e-10, std::size_t max_sweeps = 100000) {
  if (!(gamma >= 0.0) || gamma >= 1.0) {
    throw std::invalid_argument(
        "gamma must lie in [0, 1); at exactly 1 the backup is not a contraction and "
        "none of the guarantees hold");
  }

  std::vector<double> values(reward.size(), 0.0);
  double gap = std::numeric_limits<double>::infinity();

  for (std::size_t sweep = 1; sweep <= max_sweeps; ++sweep) {
    std::vector<double> updated = BellmanOptimalityBackup(kernel, reward, values, gamma);
    gap = SupNorm(updated, values);
    values = std::move(updated);

    if (gap < tolerance) {
      return SolveResult{values, sweep, gap, gamma * gap / (1.0 - gamma), true};
    }
  }
  return SolveResult{values, max_sweeps, gap, gamma * gap / (1.0 - gamma), false};
}

// Act greedily on a value function.
//
// Tie-breaking is a policy decision rather than an implementation
// detail: exact ties are common in structured problems, and taking the
// lowest index deterministically means a re-solve cannot silently
// produce a different policy with an identical value.
std::vector<std::size_t> GreedyPolicy(const Kernel& kernel, const Reward& reward,
                                      const std::vector<double>& values, double gamma) {
  std::vector<std::size_t> actions(reward.size(), 0);

  for (std::size_t state = 0; state < reward.size(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    std::size_t chosen = 0;

    for (std::size_t action = 0; action < reward[state].size(); ++action) {
      const double candidate =
          reward[state][action] + gamma * ExpectedNextValue(kernel, values, state, action);
      if (candidate > best) {
        best = candidate;
        chosen = action;
      }
    }
    actions[state] = chosen;
  }
  return actions;
}

struct ContractionReport {
  double gap_before;
  double gap_after;
  double observed_modulus;
  double gamma;
  bool holds;
};

// The inequality the entire formalism rests on, measured.
//
//     ||T V - T U||_inf  <=  gamma * ||V - U||_inf
//
// Everything else -- that a solution exists, that it is unique, that
// iteration reaches it, at what rate -- is Banach's fixed-point theorem
// applied to this one line.
ContractionReport ContractionCheck(const Kernel& kernel, const Reward& reward, double gamma,
                                   const std::vector<double>& first,
                                   const std::vector<double>& second) {
  const double before = SupNorm(first, second);
  const double after = SupNorm(BellmanOptimalityBackup(kernel, reward, first, gamma),
                               BellmanOptimalityBackup(kernel, reward, second, gamma));

  return ContractionReport{before, after, before > 0.0 ? after / before : 0.0, gamma,
                           after <= gamma * before + 1e-12};
}

// Roughly how many steps the discount actually looks ahead.
//
// 1/(1-gamma). Worth computing rather than intuiting: gamma of 0.99 is
// a hundred-step horizon, a different problem from the ten-step one at
// 0.9 rather than a more patient version of it.
double EffectiveHorizon(double gamma) { return 1.0 / (1.0 - gamma); }

struct MarkovDemo {
  SolveResult markov;
  std::vector<std::size_t> markov_policy;
  SolveResult aggregated;
  std::vector<std::size_t> aggregated_policy;
};

// The failure with no diagnostic.
//
// Two states that behave differently are merged into one, as any coarse
// state representation does. The aggregated MDP is perfectly well
// formed: the kernel normalizes, the backup contracts, value iteration
// converges inside its bound.
//
// It converges to the value function of the aggregated process, which
// is not the value function of the original. The derived policy is
// wrong and nothing anywhere says so -- which is why the Markov claim
// must be argued substantively rather than checked numerically.
MarkovDemo MarkovViolationDemo(double gamma = 0.9) {
  const Kernel kernel = {
      {{0.0, 1.0, 0.0}, {0.0, 0.0, 1.0}},
      {{0.0, 1.0, 0.0}, {0.0, 1.0, 0.0}},
      {{0.0, 0.0, 1.0}, {0.0, 0.0, 1.0}},
  };
  const Reward reward = {{0.0, 0.0}, {1.0, 1.0}, {-1.0, -1.0}};

  const SolveResult markov = ValueIteration(kernel, reward, gamma);

  const Kernel aggregated_kernel = {{{0.0, 1.0}, {0.0, 1.0}}, {{0.0, 1.0}, {0.0, 1.0}}};
  const Reward aggregated_reward = {{0.0, 0.0}, {0.0, 0.0}};
  const SolveResult aggregated = ValueIteration(aggregated_kernel, aggregated_reward, gamma);

  return MarkovDemo{markov, GreedyPolicy(kernel, reward, markov.values, gamma), aggregated,
                    GreedyPolicy(aggregated_kernel, aggregated_reward, aggregated.values,
                                 gamma)};
}

}  // namespace mdp
`,
        profile:
          'One optimality backup is O(|S|·|A|·|S\'|) for |S\'| reachable successors, and value iteration needs roughly log(tolerance)/log(gamma) sweeps — about 175 at gamma 0.9 and 1750 at 0.99 for the same tolerance. Exact policy evaluation is one O(|S|³) elimination. Illustrative, not a measured benchmark: the shape to read is that the sweep count depends on gamma rather than on the problem, which is the contraction rate appearing directly as running time.',
      },
      'make-it-right': {
        rationale:
          'The MDP stops being four loose nested vectors and becomes a type whose invariants are checked once, before anything is allocated, because every guarantee in this entry is conditional on properties the literal version never examined: rows of the kernel summing to one, a discount strictly below one, finite rewards on available actions, and shapes that agree across the kernel, the reward and the availability mask. A kernel that leaks probability converges perfectly to the value of a process that loses mass, which is the characteristic failure of this formalism — clean numbers describing the wrong problem — so it becomes a thrown type rather than an assumption. The discount becomes a value object that reports the horizon it specifies and the sweep count it implies, because it is routinely treated as a solver knob and it is not one. Value iteration returns a result carrying the sweep count, the final sup-norm gap and the contraction error bound instead of a bare vector, since the bound is free and a value function reported without it has an unstated accuracy. Storage moves to one flat row-major vector behind an accessor rather than a vector of vectors of vectors, which is both a locality decision and a correctness one: a ragged structure can have rows of different lengths and nothing would say so. Non-owning spans are used wherever the data is only read, const-correctness marks what a solve may touch, and the special members are left to the compiler throughout.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'No raw new/delete; std::vector and smart pointers instead',
          'Rule of zero — let the compiler generate special members',
        ],
        code: `// The formalism with its preconditions enforced.
//
// The literal version accepted all of these without complaint:
//
//   * a transition row summing to 0.97, which converges cleanly to the
//     value of a process that leaks probability;
//   * a discount of exactly 1, where the backup is not a contraction
//     and every guarantee silently stops applying;
//   * a state with no available action, where the max ranges over an
//     empty set;
//   * ragged rows, where the kernel, the reward and the policy quietly
//     disagree about how many actions exist.
//
// Each is checked once, at construction. That placement is the point:
// an MDP is a contract, and a contract validated per call gets
// validated in three places and skipped in the fourth.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace mdp {

// Rows may drift by this much from summing to one before it is an error
// rather than floating-point noise.
inline constexpr double kKernelTolerance = 1e-9;

class MdpError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

// Its own type because the failure is silent: probability leaking out
// of a row is never redistributed and never reported, and the fixed
// point becomes the value of a process that loses mass.
class MalformedKernel : public MdpError {
 public:
  using MdpError::MdpError;
};

class InvalidDiscount : public MdpError {
 public:
  using MdpError::MdpError;
};

class NoAvailableAction : public MdpError {
 public:
  using MdpError::MdpError;
};

// Not a numerical difficulty to work around. At gamma of one with a
// policy that never terminates the expectation equation has no
// solution, and the right response is to fix the model.
class SingularEvaluation : public MdpError {
 public:
  using MdpError::MdpError;
};

// The discount, with the horizon it actually specifies.
//
// A value object rather than a double because it is routinely treated
// as a tuning knob and it is not one: changing it changes the problem
// being solved and the cost of solving it at the same time.
class Discount {
 public:
  explicit Discount(double gamma) : gamma_(gamma) {
    if (!(gamma_ >= 0.0) || gamma_ >= 1.0) {
      throw InvalidDiscount(
          "gamma must lie in [0, 1); at exactly 1 the Bellman backup is not a "
          "contraction, so existence, uniqueness and the convergence rate all stop "
          "applying");
    }
  }

  double gamma() const noexcept { return gamma_; }

  // 1/(1-gamma): roughly how many steps this looks ahead.
  double EffectiveHorizon() const noexcept { return 1.0 / (1.0 - gamma_); }

  // How many backups a given accuracy needs, from the contraction.
  //
  // Computable in advance, which makes the cost of a long horizon a
  // planning input rather than a surprise: at gamma 0.999 this is
  // roughly a thousand times the count at 0.9.
  std::size_t SweepsForTolerance(double tolerance, double initial_gap = 1.0) const {
    if (!(tolerance > 0.0)) {
      throw std::invalid_argument("tolerance must be positive");
    }
    if (gamma_ == 0.0) {
      return 1;
    }
    return static_cast<std::size_t>(
        std::ceil(std::log(tolerance / initial_gap) / std::log(gamma_)));
  }

 private:
  double gamma_;
};

// States, actions, dynamics, reward — validated once, stored flat.
//
// One row-major vector rather than a vector of vectors of vectors. That
// is a locality decision and also a correctness one: a ragged structure
// can have rows of different lengths and nothing anywhere would say so.
class MarkovDecisionProcess {
 public:
  MarkovDecisionProcess(std::size_t n_states, std::size_t n_actions,
                        std::vector<double> kernel, std::vector<double> reward,
                        std::vector<char> available)
      : n_states_(n_states),
        n_actions_(n_actions),
        kernel_(std::move(kernel)),
        reward_(std::move(reward)),
        available_(std::move(available)) {
    // Every check below is arithmetic on values already in hand, so it
    // runs before the solver allocates anything.
    if (n_states_ == 0 || n_actions_ == 0) {
      throw MdpError("an MDP needs at least one state and one action");
    }
    if (kernel_.size() != n_states_ * n_actions_ * n_states_) {
      throw MalformedKernel("kernel size does not match (S, A, S)");
    }
    if (reward_.size() != n_states_ * n_actions_ ||
        available_.size() != n_states_ * n_actions_) {
      throw MdpError("reward or availability does not match (S, A)");
    }

    for (std::size_t pair = 0; pair < n_states_ * n_actions_; ++pair) {
      if (available_[pair] == 0) {
        continue;
      }
      if (!std::isfinite(reward_[pair])) {
        throw MdpError("reward is not finite on an available action");
      }

      double row_sum = 0.0;
      for (std::size_t next_state = 0; next_state < n_states_; ++next_state) {
        const double probability = kernel_[pair * n_states_ + next_state];
        if (probability < 0.0) {
          throw MalformedKernel("kernel contains a negative probability");
        }
        row_sum += probability;
      }
      if (std::abs(row_sum - 1.0) > kKernelTolerance) {
        throw MalformedKernel(
            "a transition row departs from 1 by " + std::to_string(row_sum - 1.0) +
            "; probability that leaks is never redistributed, and the fixed point "
            "becomes the value of a process that loses mass");
      }
    }

    for (std::size_t state = 0; state < n_states_; ++state) {
      const bool any = std::any_of(
          available_.begin() + static_cast<long>(state * n_actions_),
          available_.begin() + static_cast<long>((state + 1) * n_actions_),
          [](char flag) { return flag != 0; });
      if (!any) {
        throw NoAvailableAction("state " + std::to_string(state) +
                                " has no available action; the max in the optimality "
                                "equation ranges over an empty set");
      }
    }
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }

  bool Available(std::size_t state, std::size_t action) const noexcept {
    return available_[state * n_actions_ + action] != 0;
  }

  double RewardAt(std::size_t state, std::size_t action) const noexcept {
    return reward_[state * n_actions_ + action];
  }

  // A non-owning view of one successor distribution. No copy, and the
  // caller cannot hold it past the MDP's lifetime by accident.
  std::span<const double> Successors(std::size_t state, std::size_t action) const noexcept {
    const std::size_t base = (state * n_actions_ + action) * n_states_;
    return std::span<const double>(kernel_).subspan(base, n_states_);
  }

  // Q(s, a), with unavailable actions at negative infinity rather than
  // at a large negative reward — a prohibition rather than an exchange
  // rate the optimizer can trade against.
  double ActionValue(std::size_t state, std::size_t action, std::span<const double> values,
                     const Discount& discount) const noexcept {
    if (!Available(state, action)) {
      return -std::numeric_limits<double>::infinity();
    }
    const std::span<const double> successors = Successors(state, action);
    double expectation = 0.0;
    for (std::size_t next_state = 0; next_state < values.size(); ++next_state) {
      expectation += successors[next_state] * values[next_state];
    }
    return RewardAt(state, action) + discount.gamma() * expectation;
  }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  std::vector<double> kernel_;
  std::vector<double> reward_;
  std::vector<char> available_;
};

// A value function, with how much to trust it.
//
// The bound is free — it falls straight out of the contraction — and
// reporting a value function without it is reporting a number with an
// unstated accuracy.
struct SolveResult {
  std::vector<double> values;
  std::size_t sweeps{};
  double final_gap{};
  double error_bound{};
  bool converged{};
};

SolveResult ValueIteration(const MarkovDecisionProcess& mdp, const Discount& discount,
                           double tolerance = 1e-10, std::size_t max_sweeps = 100000) {
  if (!(tolerance > 0.0)) {
    throw std::invalid_argument("tolerance must be positive");
  }

  std::vector<double> values(mdp.n_states(), 0.0);
  std::vector<double> updated(mdp.n_states(), 0.0);
  double gap = std::numeric_limits<double>::infinity();
  std::size_t sweep = 0;

  for (sweep = 1; sweep <= max_sweeps; ++sweep) {
    for (std::size_t state = 0; state < mdp.n_states(); ++state) {
      double best = -std::numeric_limits<double>::infinity();
      for (std::size_t action = 0; action < mdp.n_actions(); ++action) {
        best = std::max(best, mdp.ActionValue(state, action, values, discount));
      }
      updated[state] = best;
    }

    gap = 0.0;
    for (std::size_t state = 0; state < values.size(); ++state) {
      gap = std::max(gap, std::abs(updated[state] - values[state]));
    }
    values.swap(updated);

    if (gap < tolerance) {
      break;
    }
  }

  const double bound = discount.gamma() * gap / (1.0 - discount.gamma());
  return SolveResult{std::move(values), sweep, gap, bound, gap < tolerance};
}

// V^pi = (I - gamma P_pi)^-1 R_pi, solved rather than iterated.
//
// The structural point of the whole formalism: with the max removed the
// equation is linear, and a linear system is solved rather than
// approached.
std::vector<double> EvaluatePolicyExactly(const MarkovDecisionProcess& mdp,
                                          std::span<const double> policy,
                                          const Discount& discount) {
  const std::size_t n_states = mdp.n_states();
  const std::size_t n_actions = mdp.n_actions();

  if (policy.size() != n_states * n_actions) {
    throw MdpError("policy does not match the MDP's (S, A) shape");
  }

  std::vector<double> matrix(n_states * (n_states + 1), 0.0);
  const std::size_t stride = n_states + 1;

  for (std::size_t state = 0; state < n_states; ++state) {
    matrix[state * stride + state] = 1.0;

    double row_mass = 0.0;
    for (std::size_t action = 0; action < n_actions; ++action) {
      const double probability = policy[state * n_actions + action];
      if (probability == 0.0) {
        continue;
      }
      if (!mdp.Available(state, action)) {
        throw MdpError("policy places mass on an unavailable action");
      }
      row_mass += probability;

      matrix[state * stride + n_states] += probability * mdp.RewardAt(state, action);
      const std::span<const double> successors = mdp.Successors(state, action);
      for (std::size_t next_state = 0; next_state < n_states; ++next_state) {
        matrix[state * stride + next_state] -=
            discount.gamma() * probability * successors[next_state];
      }
    }
    if (std::abs(row_mass - 1.0) > kKernelTolerance) {
      throw MdpError("policy rows must be distributions over actions");
    }
  }

  for (std::size_t column = 0; column < n_states; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < n_states; ++row) {
      if (std::abs(matrix[row * stride + column]) > std::abs(matrix[pivot * stride + column])) {
        pivot = row;
      }
    }
    if (std::abs(matrix[pivot * stride + column]) < 1e-12) {
      throw SingularEvaluation(
          "(I - gamma P_pi) is singular; at gamma near 1 with a policy that never "
          "terminates the expectation equation has no solution, and the model is what "
          "needs fixing");
    }
    for (std::size_t position = 0; position < stride; ++position) {
      std::swap(matrix[column * stride + position], matrix[pivot * stride + position]);
    }

    for (std::size_t row = column + 1; row < n_states; ++row) {
      const double factor =
          matrix[row * stride + column] / matrix[column * stride + column];
      if (factor == 0.0) {
        continue;
      }
      for (std::size_t position = column; position < stride; ++position) {
        matrix[row * stride + position] -= factor * matrix[column * stride + position];
      }
    }
  }

  std::vector<double> values(n_states, 0.0);
  for (std::size_t index = n_states; index-- > 0;) {
    double total = matrix[index * stride + n_states];
    for (std::size_t column = index + 1; column < n_states; ++column) {
      total -= matrix[index * stride + column] * values[column];
    }
    values[index] = total / matrix[index * stride + index];
  }
  return values;
}

struct ContractionReport {
  double gap_before{};
  double gap_after{};
  double observed_modulus{};
  double gamma{};
  bool holds{};
};

// The inequality everything rests on, measured rather than assumed.
//
// A cheap assertion to keep in a test suite: if it fails, the kernel or
// the discount is malformed in a way the constructor missed, and every
// guarantee downstream is void.
ContractionReport ContractionCheck(const MarkovDecisionProcess& mdp, const Discount& discount,
                                   std::span<const double> first,
                                   std::span<const double> second) {
  const auto backup = [&mdp, &discount](std::span<const double> values) {
    std::vector<double> updated(values.size(), 0.0);
    for (std::size_t state = 0; state < values.size(); ++state) {
      double best = -std::numeric_limits<double>::infinity();
      for (std::size_t action = 0; action < mdp.n_actions(); ++action) {
        best = std::max(best, mdp.ActionValue(state, action, values, discount));
      }
      updated[state] = best;
    }
    return updated;
  };

  double before = 0.0;
  for (std::size_t index = 0; index < first.size(); ++index) {
    before = std::max(before, std::abs(first[index] - second[index]));
  }

  const std::vector<double> left = backup(first);
  const std::vector<double> right = backup(second);
  double after = 0.0;
  for (std::size_t index = 0; index < left.size(); ++index) {
    after = std::max(after, std::abs(left[index] - right[index]));
  }

  return ContractionReport{before, after, before > 0.0 ? after / before : 0.0,
                           discount.gamma(), after <= discount.gamma() * before + 1e-9};
}

}  // namespace mdp
`,
        profile:
          'Identical arithmetic to the literal version, with the kernel in one flat row-major vector and successor rows handed out as non-owning spans, so a backup streams contiguously instead of chasing a pointer per state-action pair. Illustrative, not a measured benchmark: the substantive change is that a leaking kernel, a discount of one, a state with no available action and a policy placing mass on an unavailable one are failures thrown at construction, where the literal version converged cleanly on every one and returned a number.',
      },
      'make-it-fast': {
        rationale:
          'The dense kernel is the wrong data structure and replacing it is worth more than everything else here combined: a real MDP has a handful of reachable successors per state-action pair, so a dense layout is almost entirely zeros and a backup spends its time multiplying by them. Flattening the pairs into one CSR block turns a sweep into a walk over the transitions that exist, which changes the cost from quadratic in the state count to linear in the number of non-zeros — the difference between a problem that fits in memory and one that does not. On top of that the backup fuses: the sparse dot, the reward add, the availability mask and the per-state max run as one pass into preallocated buffers, so the state-by-action intermediate the previous stage wrote on every sweep is never materialized. The inner dot carries restrict on its pointers, because without it the compiler must assume the value array and the output may alias and cannot vectorize a loop that is otherwise ideal for it. States are independent within a Jacobi sweep, so OpenMP parallelizes across them with no synchronization; the Gauss-Seidel variant is kept separately and deliberately serial, since reading updated values within a pass is exactly the dependency that makes it converge in fewer sweeps and exactly the dependency that forbids parallelizing it. Everything stays double and contiguous, since error accumulated over thousands of sweeps at a high discount is large enough to matter.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Transitions live in one CSR block over flattened state-action pairs, so a sweep streams through the non-zeros instead of indexing a three-level structure',
            tradeoff: 'The sparsity pattern is baked into the indices, so a re-estimated kernel means a rebuild rather than an edit',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Sparse dot, reward add, availability mask and the per-state max run in one pass, so the state-by-action array is never written',
            tradeoff: 'The fused form hides the action values, which are exactly what is wanted when asking why a particular action was chosen',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The inner sparse dot is a gather-multiply-accumulate that vectorizes only once the value array and the output are known not to overlap',
            tradeoff: 'The guarantee is unchecked: passing overlapping buffers compiles cleanly and corrupts the sweep at run time with nothing to catch it',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'States are independent within a Jacobi sweep, so the per-state maxima fan across cores with nothing to synchronize',
            tradeoff: 'It forces Jacobi over Gauss-Seidel, which needs more sweeps — so the parallel version can lose overall on problems where in-sweep propagation was doing the work',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The inner loop is a contiguous gather and accumulate, which the vectorizer handles well once aliasing is ruled out',
            tradeoff: 'The binary stops being portable across machine generations, and floating-point contraction can change the last digits of a value function between build targets',
          },
        ],
        code: `// The Bellman backup, shaped for a kernel that is mostly zeros.
//
// A real MDP has a handful of reachable successors per state-action
// pair, so a dense kernel is almost entirely zeros and a dense backup
// spends nearly all its time multiplying by them. One CSR block over
// flattened pairs turns a sweep into a walk over the transitions that
// exist.
//
// What this does not change: the sweep count still comes from gamma. A
// faster sweep does not shorten a long horizon -- it makes each of the
// thousand sweeps cheap, not fewer of them.
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

namespace mdp {

// Transitions as CSR over flattened (state, action) rows.
//
// Row s*A + a holds the successor distribution for that pair, so one
// pass computes the expectation for every pair. The layout is immutable
// by construction -- the indices encode the sparsity pattern -- which is
// the right trade for a solver and the wrong one for a model being
// edited.
class SparseMdp {
 public:
  SparseMdp(std::size_t n_states, std::size_t n_actions, std::vector<std::int64_t> row_start,
            std::vector<std::int32_t> column, std::vector<double> value,
            std::vector<double> reward, std::vector<char> available)
      : n_states_(n_states),
        n_actions_(n_actions),
        row_start_(std::move(row_start)),
        column_(std::move(column)),
        value_(std::move(value)),
        reward_(std::move(reward)),
        available_(std::move(available)) {
    if (row_start_.size() != n_states_ * n_actions_ + 1) {
      throw std::invalid_argument("CSR row pointer does not match (S * A) + 1");
    }
    if (column_.size() != value_.size()) {
      throw std::invalid_argument("CSR indices and values differ in length");
    }
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }
  std::size_t nonzeros() const noexcept { return value_.size(); }

  // What fraction of the kernel is actually non-zero.
  //
  // Worth reporting rather than assuming: near one, the sparse layout
  // is pure indirection overhead and the dense backup was correct. This
  // is the number that decides which implementation is appropriate.
  double Density() const noexcept {
    return static_cast<double>(value_.size()) /
           static_cast<double>(n_states_ * n_actions_ * n_states_);
  }

  const std::int64_t* row_start() const noexcept { return row_start_.data(); }
  const std::int32_t* column() const noexcept { return column_.data(); }
  const double* value() const noexcept { return value_.data(); }
  const double* reward() const noexcept { return reward_.data(); }
  const char* available() const noexcept { return available_.data(); }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  std::vector<std::int64_t> row_start_;
  std::vector<std::int32_t> column_;
  std::vector<double> value_;
  std::vector<double> reward_;
  std::vector<char> available_;
};

// One CSR row dotted with the value vector.
//
// restrict on every pointer is what makes this vectorize: the compiler
// must otherwise assume the value array and the caller's output may
// overlap, and emits a scalar loop. The guarantee is unchecked, so
// overlapping buffers corrupt the sweep silently.
inline double SparseRowDot(const std::int32_t* __restrict__ column,
                           const double* __restrict__ value,
                           const double* __restrict__ values, std::int64_t begin,
                           std::int64_t end) noexcept {
  double total = 0.0;
  for (std::int64_t position = begin; position < end; ++position) {
    total += value[position] * values[static_cast<std::size_t>(column[position])];
  }
  return total;
}

struct SolveResult {
  std::vector<double> values;
  std::size_t sweeps{};
  double final_gap{};
  double error_bound{};
  bool converged{};
};

// Jacobi value iteration: every state from the same input values.
//
// States are independent within a sweep, which is what licenses the
// parallel loop. The fused body -- sparse dot, reward add, mask, max --
// never writes the state-by-action intermediate.
SolveResult ValueIterationSparse(const SparseMdp& mdp, double gamma,
                                 double tolerance = 1e-10,
                                 std::size_t max_sweeps = 100000) {
  if (!(gamma >= 0.0) || gamma >= 1.0) {
    throw std::invalid_argument("gamma must lie in [0, 1)");
  }

  std::vector<double> values(mdp.n_states(), 0.0);
  std::vector<double> updated(mdp.n_states(), 0.0);

  const std::int64_t* row_start = mdp.row_start();
  const std::int32_t* column = mdp.column();
  const double* transition = mdp.value();
  const double* reward = mdp.reward();
  const char* available = mdp.available();
  const std::size_t n_actions = mdp.n_actions();

  double gap = std::numeric_limits<double>::infinity();
  std::size_t sweep = 0;

  for (sweep = 1; sweep <= max_sweeps; ++sweep) {
    const double* __restrict__ current = values.data();
    double* __restrict__ next = updated.data();

#pragma omp parallel for schedule(static)
    for (std::size_t state = 0; state < mdp.n_states(); ++state) {
      double best = -std::numeric_limits<double>::infinity();

      for (std::size_t action = 0; action < n_actions; ++action) {
        const std::size_t pair = state * n_actions + action;
        if (available[pair] == 0) {
          continue;
        }
        const double expectation = SparseRowDot(column, transition, current,
                                                row_start[pair], row_start[pair + 1]);
        best = std::max(best, reward[pair] + gamma * expectation);
      }
      next[state] = best;
    }

    gap = 0.0;
    for (std::size_t state = 0; state < values.size(); ++state) {
      gap = std::max(gap, std::abs(updated[state] - values[state]));
    }
    values.swap(updated);

    if (gap < tolerance) {
      break;
    }
  }

  return SolveResult{std::move(values), sweep, gap, gamma * gap / (1.0 - gamma),
                     gap < tolerance};
}

// In-place backup reading its own updates within the sweep.
//
// Jacobi computes every new value from the old array; this reads
// whatever is current, so information propagates across the state space
// within one pass instead of one state per sweep. On most structured
// problems that is a meaningful reduction in sweep count for no extra
// arithmetic.
//
// Deliberately serial: the in-sweep dependency is exactly what makes it
// converge faster and exactly what forbids parallelizing it. Ordering
// now affects the trajectory, though not the fixed point.
double GaussSeidelSweep(const SparseMdp& mdp, std::span<double> values, double gamma,
                        std::span<const std::int32_t> order) noexcept {
  const std::int64_t* row_start = mdp.row_start();
  const std::int32_t* column = mdp.column();
  const double* transition = mdp.value();
  const double* reward = mdp.reward();
  const char* available = mdp.available();
  const std::size_t n_actions = mdp.n_actions();

  double largest_change = 0.0;
  for (std::int32_t index : order) {
    const std::size_t state = static_cast<std::size_t>(index);
    double best = -std::numeric_limits<double>::infinity();

    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      if (available[pair] == 0) {
        continue;
      }
      const double expectation = SparseRowDot(column, transition, values.data(),
                                              row_start[pair], row_start[pair + 1]);
      best = std::max(best, reward[pair] + gamma * expectation);
    }

    largest_change = std::max(largest_change, std::abs(best - values[state]));
    values[state] = best;
  }
  return largest_change;
}

// Act greedily, without materializing the action values.
//
// Separate from the solve because the fused backup deliberately
// discards the per-action numbers, and this is where they are wanted.
// Paid once at the end rather than on every sweep.
std::vector<std::int32_t> GreedyPolicy(const SparseMdp& mdp, std::span<const double> values,
                                       double gamma) {
  std::vector<std::int32_t> policy(mdp.n_states(), 0);

  const std::int64_t* row_start = mdp.row_start();
  const std::int32_t* column = mdp.column();
  const double* transition = mdp.value();
  const double* reward = mdp.reward();
  const char* available = mdp.available();
  const std::size_t n_actions = mdp.n_actions();

  for (std::size_t state = 0; state < mdp.n_states(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    std::int32_t chosen = 0;

    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      if (available[pair] == 0) {
        continue;
      }
      const double candidate =
          reward[pair] + gamma * SparseRowDot(column, transition, values.data(),
                                              row_start[pair], row_start[pair + 1]);
      // Strict greater-than, so ties resolve to the lowest index
      // deterministically -- a re-solve cannot silently return a
      // different policy with an identical value.
      if (candidate > best) {
        best = candidate;
        chosen = static_cast<std::int32_t>(action);
      }
    }
    policy[state] = chosen;
  }
  return policy;
}

// How many backups the tolerance needs, before running any.
//
// Straight from the contraction, and the honest way to size a job: the
// cost of a long horizon is knowable in advance rather than discovered
// after an hour. Nothing in this file changes this number.
std::size_t SweepsNeeded(double gamma, double tolerance, double initial_gap = 1.0) {
  if (!(gamma >= 0.0) || gamma >= 1.0) {
    throw std::invalid_argument("gamma must lie in [0, 1)");
  }
  if (gamma == 0.0) {
    return 1;
  }
  return static_cast<std::size_t>(
      std::ceil(std::log(tolerance / initial_gap) / std::log(gamma)));
}

}  // namespace mdp
`,
        profile:
          'One sparse backup is O(nnz) for nnz transitions that exist, against O(|S|²·|A|) dense — on a kernel with a handful of successors per pair that is the difference between linear and quadratic in the state count. Sweep count stays log(tolerance)/log(gamma), unchanged by anything here. Illustrative, not a measured benchmark: check the kernel density first, since above roughly ten percent non-zero the CSR indirection costs more than it saves and the dense backup is the right implementation.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! MDPs and the Bellman equations, transcribed literally.
//!
//! No library. A tiny MDP in nested vectors, so every claim in the
//! theory becomes something computed rather than quoted:
//!
//!     V*(s)   = max_a [ R(s,a) + gamma * sum_s' P(s'|s,a) V*(s') ]
//!     V^pi(s) = sum_a pi(a|s) [ R(s,a) + gamma * sum_s' P(s'|s,a) V^pi(s') ]
//!
//! Four things to read for.
//!
//! 1. The two equations are structurally different. The second is
//!    LINEAR in V, and \`solve_policy_value_exactly\` inverts it by
//!    Gaussian elimination with no iteration at all. The first has a
//!    max and is nonlinear, so \`value_iteration\` can only approach it.
//!    That is why every method in this category alternates between a
//!    cheap evaluation step and an expensive improvement step.
//!
//! 2. \`contraction_check\` measures the inequality everything rests on:
//!    one backup shrinks the sup-norm gap between any two value
//!    functions by at least gamma.
//!
//! 3. \`value_iteration\` returns a real error BOUND, not a sense that it
//!    converged. If successive iterates differ by eps, the estimate is
//!    within gamma*eps/(1-gamma) of the truth.
//!
//! 4. \`markov_violation_demo\` aggregates two states that behave
//!    differently and solves again. Nothing errors, the iteration
//!    converges inside its bound, and the answer is the value function
//!    of a process nobody wanted.

/// P[state][action][next_state]
pub type Kernel = Vec<Vec<Vec<f64>>>;
/// R[state][action]
pub type Reward = Vec<Vec<f64>>;
/// pi[state][action]
pub type Policy = Vec<Vec<f64>>;

/// Largest absolute difference over states.
///
/// The norm the contraction holds in, and not an arbitrary choice:
/// every guarantee here is a sup-norm statement, and none of them
/// survive a least-squares projection -- which is precisely where deep
/// reinforcement learning loses its stability argument.
#[must_use]
pub fn sup_norm(left: &[f64], right: &[f64]) -> f64 {
    left.iter()
        .zip(right)
        .map(|(a, b)| (a - b).abs())
        .fold(0.0, f64::max)
}

#[must_use]
pub fn expected_next_value(kernel: &Kernel, values: &[f64], state: usize, action: usize) -> f64 {
    kernel[state][action]
        .iter()
        .zip(values)
        .map(|(probability, value)| probability * value)
        .sum()
}

/// One application of T. The max is what makes this nonlinear.
///
/// Every state updated from the same input values, which is what makes
/// this an operator rather than a sweep -- and what lets the
/// contraction argument apply cleanly.
#[must_use]
pub fn bellman_optimality_backup(
    kernel: &Kernel,
    reward: &Reward,
    values: &[f64],
    gamma: f64,
) -> Vec<f64> {
    (0..reward.len())
        .map(|state| {
            (0..reward[state].len())
                .map(|action| {
                    reward[state][action]
                        + gamma * expected_next_value(kernel, values, state, action)
                })
                .fold(f64::NEG_INFINITY, f64::max)
        })
        .collect()
}

/// One application of T^pi: no max, therefore linear in V.
///
/// Read against the function above. The only difference is that the max
/// became an average under a fixed policy, and that is the entire
/// reason this equation has a closed-form solution and the other does
/// not.
#[must_use]
pub fn bellman_expectation_backup(
    kernel: &Kernel,
    reward: &Reward,
    policy: &Policy,
    values: &[f64],
    gamma: f64,
) -> Vec<f64> {
    (0..policy.len())
        .map(|state| {
            policy[state]
                .iter()
                .enumerate()
                .filter(|(_, probability)| **probability != 0.0)
                .map(|(action, probability)| {
                    probability
                        * (reward[state][action]
                            + gamma * expected_next_value(kernel, values, state, action))
                })
                .sum()
        })
        .collect()
}

/// V^pi = (I - gamma P_pi)^-1 R_pi, by Gaussian elimination.
///
/// Written out because the fact that it is possible at all is the
/// structural point. Policy evaluation is a linear system with as many
/// equations as states: no iteration, no tolerance, no convergence
/// criterion. The optimality equation admits nothing of the kind at any
/// size.
pub fn solve_policy_value_exactly(
    kernel: &Kernel,
    reward: &Reward,
    policy: &Policy,
    gamma: f64,
) -> Result<Vec<f64>, String> {
    let n_states = reward.len();
    let mut matrix = vec![vec![0.0_f64; n_states + 1]; n_states];

    for state in 0..n_states {
        matrix[state][state] = 1.0;
        for (action, probability) in policy[state].iter().enumerate() {
            if *probability == 0.0 {
                continue;
            }
            matrix[state][n_states] += probability * reward[state][action];
            for next_state in 0..n_states {
                matrix[state][next_state] -=
                    gamma * probability * kernel[state][action][next_state];
            }
        }
    }

    for column in 0..n_states {
        let pivot = (column..n_states)
            .max_by(|left, right| {
                matrix[*left][column]
                    .abs()
                    .partial_cmp(&matrix[*right][column].abs())
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .unwrap_or(column);

        if matrix[pivot][column].abs() < 1e-12 {
            return Err(format!(
                "(I - gamma P_pi) is singular at column {column}; at gamma = 1 with a \\
                 policy that never terminates the equation has no solution rather than \\
                 a hard one"
            ));
        }
        matrix.swap(column, pivot);

        for row in (column + 1)..n_states {
            let factor = matrix[row][column] / matrix[column][column];
            if factor == 0.0 {
                continue;
            }
            for position in column..=n_states {
                matrix[row][position] -= factor * matrix[column][position];
            }
        }
    }

    let mut values = vec![0.0_f64; n_states];
    for state in (0..n_states).rev() {
        let mut total = matrix[state][n_states];
        for column in (state + 1)..n_states {
            total -= matrix[state][column] * values[column];
        }
        values[state] = total / matrix[state][state];
    }
    Ok(values)
}

pub struct SolveResult {
    pub values: Vec<f64>,
    pub sweeps: usize,
    pub final_gap: f64,
    pub error_bound: f64,
    pub converged: bool,
}

/// Iterate T to its fixed point, with an actual error bound.
///
/// The contraction gives more than "it converged": if successive
/// iterates differ by eps in sup-norm then the estimate is within
/// gamma*eps/(1-gamma) of V*. That bound is computable, free, and
/// almost never reported.
///
/// Note the sweep count against gamma. At 0.9 each backup removes a
/// tenth of the error; at 0.999 a thousandth. The difference is the
/// problem being harder, not the solver being slow.
pub fn value_iteration(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    tolerance: f64,
    max_sweeps: usize,
) -> Result<SolveResult, String> {
    if !(0.0..1.0).contains(&gamma) {
        return Err(format!(
            "gamma must lie in [0, 1); got {gamma}. At exactly 1 the backup is not a \\
             contraction and none of the guarantees hold"
        ));
    }

    let mut values = vec![0.0_f64; reward.len()];
    let mut gap = f64::INFINITY;

    for sweep in 1..=max_sweeps {
        let updated = bellman_optimality_backup(kernel, reward, &values, gamma);
        gap = sup_norm(&updated, &values);
        values = updated;

        if gap < tolerance {
            return Ok(SolveResult {
                values,
                sweeps: sweep,
                final_gap: gap,
                error_bound: gamma * gap / (1.0 - gamma),
                converged: true,
            });
        }
    }

    Ok(SolveResult {
        values,
        sweeps: max_sweeps,
        final_gap: gap,
        error_bound: gamma * gap / (1.0 - gamma),
        converged: false,
    })
}

/// Act greedily on a value function.
///
/// Tie-breaking is a policy decision rather than an implementation
/// detail: exact ties are common in structured problems, and taking the
/// lowest index deterministically means a re-solve cannot silently
/// produce a different policy with an identical value.
#[must_use]
pub fn greedy_policy(kernel: &Kernel, reward: &Reward, values: &[f64], gamma: f64) -> Vec<usize> {
    (0..reward.len())
        .map(|state| {
            let mut best = f64::NEG_INFINITY;
            let mut chosen = 0_usize;
            for action in 0..reward[state].len() {
                let candidate = reward[state][action]
                    + gamma * expected_next_value(kernel, values, state, action);
                if candidate > best {
                    best = candidate;
                    chosen = action;
                }
            }
            chosen
        })
        .collect()
}

pub struct ContractionReport {
    pub gap_before: f64,
    pub gap_after: f64,
    pub observed_modulus: f64,
    pub gamma: f64,
    pub holds: bool,
}

/// The inequality the entire formalism rests on, measured.
///
///     ||T V - T U||_inf  <=  gamma * ||V - U||_inf
///
/// Everything else -- that a solution exists, that it is unique, that
/// iteration reaches it, at what rate -- is Banach's fixed-point
/// theorem applied to this one line.
#[must_use]
pub fn contraction_check(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    first: &[f64],
    second: &[f64],
) -> ContractionReport {
    let before = sup_norm(first, second);
    let after = sup_norm(
        &bellman_optimality_backup(kernel, reward, first, gamma),
        &bellman_optimality_backup(kernel, reward, second, gamma),
    );

    ContractionReport {
        gap_before: before,
        gap_after: after,
        observed_modulus: if before > 0.0 { after / before } else { 0.0 },
        gamma,
        holds: after <= gamma * before + 1e-12,
    }
}

/// Roughly how many steps the discount actually looks ahead.
///
/// 1/(1-gamma). Worth computing rather than intuiting: gamma of 0.99 is
/// a hundred-step horizon, a different problem from the ten-step one at
/// 0.9 rather than a more patient version of it.
#[must_use]
pub fn effective_horizon(gamma: f64) -> f64 {
    1.0 / (1.0 - gamma)
}

pub struct MarkovDemo {
    pub markov_values: Vec<f64>,
    pub markov_policy: Vec<usize>,
    pub aggregated_values: Vec<f64>,
    pub aggregated_policy: Vec<usize>,
}

/// The failure with no diagnostic.
///
/// Two states that behave differently are merged into one, as any
/// coarse state representation does. The aggregated MDP is perfectly
/// well formed: the kernel normalizes, the backup contracts, value
/// iteration converges inside its bound.
///
/// It converges to the value function of the aggregated process, which
/// is not the value function of the original. The derived policy is
/// wrong and nothing anywhere says so -- which is why the Markov claim
/// must be argued substantively rather than checked numerically.
pub fn markov_violation_demo(gamma: f64) -> Result<MarkovDemo, String> {
    let kernel: Kernel = vec![
        vec![vec![0.0, 1.0, 0.0], vec![0.0, 0.0, 1.0]],
        vec![vec![0.0, 1.0, 0.0], vec![0.0, 1.0, 0.0]],
        vec![vec![0.0, 0.0, 1.0], vec![0.0, 0.0, 1.0]],
    ];
    let reward: Reward = vec![vec![0.0, 0.0], vec![1.0, 1.0], vec![-1.0, -1.0]];

    let markov = value_iteration(&kernel, &reward, gamma, 1e-10, 100_000)?;
    let markov_policy = greedy_policy(&kernel, &reward, &markov.values, gamma);

    let aggregated_kernel: Kernel = vec![
        vec![vec![0.0, 1.0], vec![0.0, 1.0]],
        vec![vec![0.0, 1.0], vec![0.0, 1.0]],
    ];
    let aggregated_reward: Reward = vec![vec![0.0, 0.0], vec![0.0, 0.0]];

    let aggregated = value_iteration(&aggregated_kernel, &aggregated_reward, gamma, 1e-10, 100_000)?;
    let aggregated_policy =
        greedy_policy(&aggregated_kernel, &aggregated_reward, &aggregated.values, gamma);

    Ok(MarkovDemo {
        markov_values: markov.values,
        markov_policy,
        aggregated_values: aggregated.values,
        aggregated_policy,
    })
}
`,
        profile:
          'One optimality backup is O(|S|·|A|·|S\'|) for |S\'| reachable successors, and value iteration needs roughly log(tolerance)/log(gamma) sweeps — about 175 at gamma 0.9 and 1750 at 0.99 for the same tolerance. Exact policy evaluation is one O(|S|³) elimination. Illustrative, not a measured benchmark: the shape to read is that the sweep count depends on gamma rather than on the problem, which is the contraction rate appearing directly as running time.',
      },
      'make-it-right': {
        rationale:
          'The MDP stops being three loose nested vectors and becomes a type whose invariants are checked once at construction, because every guarantee in this entry is conditional on properties the literal version never examined: rows of the kernel summing to one, a discount strictly below one, finite rewards on available actions, and shapes that agree between the kernel, the reward and the availability mask. A kernel leaking probability converges perfectly to the value of a process that loses mass, which is this formalism\'s characteristic failure — clean numbers describing the wrong problem — so it becomes a typed error naming the row and the drift rather than an assumption. Newtypes separate the quantities that are otherwise all bare f64 or usize and all silently interchangeable: a discount, a sup-norm gap, a state index and an action index. The discount type also reports the horizon it specifies and the sweep count it implies, because it is routinely treated as a solver knob and it is not one. Value iteration returns a result carrying the sweep count, the final gap and the contraction error bound instead of a bare vector, since the bound is free and a value function reported without it has an unstated accuracy. Storage moves to one flat row-major Vec behind accessors, which is a locality decision and a correctness one at once — a ragged nested structure can have rows of different lengths and nothing would say so. Reads borrow slices throughout, and the backups are iterator chains rather than index loops.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! The formalism with its preconditions enforced.
//!
//! The literal version accepted all of these without complaint:
//!
//!   * a transition row summing to 0.97, which converges cleanly to the
//!     value of a process that leaks probability;
//!   * a discount of exactly 1, where the backup is not a contraction
//!     and every guarantee silently stops applying;
//!   * a state with no available action, where the max ranges over an
//!     empty set;
//!   * ragged rows, where the kernel, the reward and the policy quietly
//!     disagree about how many actions exist.
//!
//! Each is checked once, at construction. That placement is the point:
//! an MDP is a contract, and a contract validated per call gets
//! validated in three places and skipped in the fourth.

use std::fmt;

/// Rows may drift by this much from summing to one before it is an
/// error rather than floating-point noise.
const KERNEL_TOLERANCE: f64 = 1e-9;

/// A state index. Distinct from an action index and from a flattened
/// pair index, both of which are also \`usize\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct StateId(pub usize);

/// An action index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ActionId(pub usize);

/// A sup-norm distance between value functions — the quantity every
/// guarantee here is stated in.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct SupGap(pub f64);

#[derive(Debug, Clone, PartialEq)]
pub enum MdpError {
    /// Probability that leaks out of a row is never redistributed and
    /// never reported, and the fixed point becomes the value of a
    /// process that loses mass.
    MalformedKernel { pair: usize, row_sum: f64 },
    NegativeProbability { pair: usize },
    InvalidDiscount { gamma: f64 },
    NoAvailableAction { state: usize },
    NonFiniteReward { pair: usize },
    ShapeMismatch { expected: usize, found: usize },
    /// Not a numerical difficulty to work around. At gamma of one with
    /// a policy that never terminates the expectation equation has no
    /// solution, and the model is what needs fixing.
    SingularEvaluation { column: usize },
    PolicyNotDistribution { state: usize, row_sum: f64 },
    PolicyOnUnavailableAction { state: usize, action: usize },
}

impl fmt::Display for MdpError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MalformedKernel { pair, row_sum } => write!(
                formatter,
                "transition row {pair} sums to {row_sum}; probability that leaks is never \\
                 redistributed, and the fixed point becomes the value of a process that \\
                 loses mass"
            ),
            Self::NegativeProbability { pair } => {
                write!(formatter, "transition row {pair} contains a negative probability")
            }
            Self::InvalidDiscount { gamma } => write!(
                formatter,
                "gamma must lie in [0, 1); got {gamma}. At exactly 1 the Bellman backup \\
                 is not a contraction, so existence, uniqueness and the convergence rate \\
                 all stop applying"
            ),
            Self::NoAvailableAction { state } => write!(
                formatter,
                "state {state} has no available action; the max in the optimality \\
                 equation ranges over an empty set"
            ),
            Self::NonFiniteReward { pair } => {
                write!(formatter, "reward at pair {pair} is not finite")
            }
            Self::ShapeMismatch { expected, found } => {
                write!(formatter, "expected {expected} values, found {found}")
            }
            Self::SingularEvaluation { column } => write!(
                formatter,
                "(I - gamma P_pi) is singular at column {column}; at gamma near 1 with a \\
                 policy that never terminates the expectation equation has no solution"
            ),
            Self::PolicyNotDistribution { state, row_sum } => {
                write!(formatter, "policy row {state} sums to {row_sum}, not 1")
            }
            Self::PolicyOnUnavailableAction { state, action } => write!(
                formatter,
                "policy places mass on unavailable action {action} in state {state}"
            ),
        }
    }
}

impl std::error::Error for MdpError {}

/// The discount, with the horizon it actually specifies.
///
/// A newtype rather than an f64 because it is routinely treated as a
/// tuning knob and it is not one: changing it changes the problem being
/// solved and the cost of solving it at the same time.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Discount(f64);

impl Discount {
    pub fn new(gamma: f64) -> Result<Self, MdpError> {
        if !(0.0..1.0).contains(&gamma) {
            return Err(MdpError::InvalidDiscount { gamma });
        }
        Ok(Self(gamma))
    }

    #[must_use]
    pub fn gamma(self) -> f64 {
        self.0
    }

    /// 1/(1-gamma): roughly how many steps this looks ahead.
    #[must_use]
    pub fn effective_horizon(self) -> f64 {
        1.0 / (1.0 - self.0)
    }

    /// How many backups a given accuracy needs, from the contraction.
    ///
    /// Computable in advance, which makes the cost of a long horizon a
    /// planning input rather than a surprise: at gamma 0.999 this is
    /// roughly a thousand times the count at 0.9.
    #[must_use]
    pub fn sweeps_for_tolerance(self, tolerance: f64, initial_gap: f64) -> usize {
        if self.0 == 0.0 {
            return 1;
        }
        (tolerance / initial_gap).ln().div_euclid(self.0.ln()).ceil() as usize
    }
}

/// States, actions, dynamics, reward — validated once, stored flat.
///
/// One row-major Vec rather than nested Vecs. That is a locality
/// decision and also a correctness one: a ragged structure can have
/// rows of different lengths and nothing anywhere would say so.
pub struct MarkovDecisionProcess {
    n_states: usize,
    n_actions: usize,
    kernel: Vec<f64>,
    reward: Vec<f64>,
    available: Vec<bool>,
}

impl MarkovDecisionProcess {
    pub fn new(
        n_states: usize,
        n_actions: usize,
        kernel: Vec<f64>,
        reward: Vec<f64>,
        available: Vec<bool>,
    ) -> Result<Self, MdpError> {
        if kernel.len() != n_states * n_actions * n_states {
            return Err(MdpError::ShapeMismatch {
                expected: n_states * n_actions * n_states,
                found: kernel.len(),
            });
        }
        if reward.len() != n_states * n_actions || available.len() != n_states * n_actions {
            return Err(MdpError::ShapeMismatch {
                expected: n_states * n_actions,
                found: reward.len(),
            });
        }

        for pair in 0..n_states * n_actions {
            if !available[pair] {
                continue;
            }
            if !reward[pair].is_finite() {
                return Err(MdpError::NonFiniteReward { pair });
            }

            let row = &kernel[pair * n_states..(pair + 1) * n_states];
            if row.iter().any(|probability| *probability < 0.0) {
                return Err(MdpError::NegativeProbability { pair });
            }
            let row_sum: f64 = row.iter().sum();
            if (row_sum - 1.0).abs() > KERNEL_TOLERANCE {
                return Err(MdpError::MalformedKernel { pair, row_sum });
            }
        }

        if let Some(state) = (0..n_states)
            .find(|state| !available[state * n_actions..(state + 1) * n_actions].iter().any(|f| *f))
        {
            return Err(MdpError::NoAvailableAction { state });
        }

        Ok(Self {
            n_states,
            n_actions,
            kernel,
            reward,
            available,
        })
    }

    #[must_use]
    pub fn n_states(&self) -> usize {
        self.n_states
    }

    #[must_use]
    pub fn n_actions(&self) -> usize {
        self.n_actions
    }

    #[must_use]
    pub fn available(&self, state: StateId, action: ActionId) -> bool {
        self.available[state.0 * self.n_actions + action.0]
    }

    /// One successor distribution, borrowed. No copy, and the borrow
    /// checker keeps it from outliving the MDP.
    #[must_use]
    pub fn successors(&self, state: StateId, action: ActionId) -> &[f64] {
        let base = (state.0 * self.n_actions + action.0) * self.n_states;
        &self.kernel[base..base + self.n_states]
    }

    /// Q(s, a), with unavailable actions at negative infinity rather
    /// than at a large negative reward — a prohibition rather than an
    /// exchange rate the optimizer can trade against.
    #[must_use]
    pub fn action_value(
        &self,
        state: StateId,
        action: ActionId,
        values: &[f64],
        discount: Discount,
    ) -> f64 {
        if !self.available(state, action) {
            return f64::NEG_INFINITY;
        }
        let expectation: f64 = self
            .successors(state, action)
            .iter()
            .zip(values)
            .map(|(probability, value)| probability * value)
            .sum();
        self.reward[state.0 * self.n_actions + action.0] + discount.gamma() * expectation
    }

    fn best_action_value(&self, state: StateId, values: &[f64], discount: Discount) -> f64 {
        (0..self.n_actions)
            .map(|action| self.action_value(state, ActionId(action), values, discount))
            .fold(f64::NEG_INFINITY, f64::max)
    }
}

/// A value function, with how much to trust it.
///
/// The bound is free — it falls straight out of the contraction — and
/// reporting a value function without it is reporting a number with an
/// unstated accuracy.
pub struct SolveResult {
    pub values: Vec<f64>,
    pub sweeps: usize,
    pub final_gap: SupGap,
    pub error_bound: f64,
    pub converged: bool,
}

pub fn value_iteration(
    mdp: &MarkovDecisionProcess,
    discount: Discount,
    tolerance: f64,
    max_sweeps: usize,
) -> SolveResult {
    let mut values = vec![0.0_f64; mdp.n_states()];
    let mut gap = f64::INFINITY;
    let mut sweeps = 0;

    for sweep in 1..=max_sweeps {
        let updated: Vec<f64> = (0..mdp.n_states())
            .map(|state| mdp.best_action_value(StateId(state), &values, discount))
            .collect();

        gap = updated
            .iter()
            .zip(&values)
            .map(|(new, old)| (new - old).abs())
            .fold(0.0, f64::max);
        values = updated;
        sweeps = sweep;

        if gap < tolerance {
            break;
        }
    }

    SolveResult {
        values,
        sweeps,
        final_gap: SupGap(gap),
        error_bound: discount.gamma() * gap / (1.0 - discount.gamma()),
        converged: gap < tolerance,
    }
}

/// Act greedily, breaking ties by lowest index.
///
/// Tie-breaking is a policy decision rather than an implementation
/// detail: exact ties are common in structured problems, and an
/// unspecified rule lets a re-solve return a different policy with an
/// identical value, which reads as instability and is not.
#[must_use]
pub fn greedy_policy(
    mdp: &MarkovDecisionProcess,
    values: &[f64],
    discount: Discount,
) -> Vec<ActionId> {
    (0..mdp.n_states())
        .map(|state| {
            let mut best = f64::NEG_INFINITY;
            let mut chosen = 0_usize;
            for action in 0..mdp.n_actions() {
                let candidate =
                    mdp.action_value(StateId(state), ActionId(action), values, discount);
                if candidate > best {
                    best = candidate;
                    chosen = action;
                }
            }
            ActionId(chosen)
        })
        .collect()
}

pub struct ContractionReport {
    pub gap_before: SupGap,
    pub gap_after: SupGap,
    pub observed_modulus: f64,
    pub gamma: f64,
    pub holds: bool,
}

/// The inequality everything rests on, measured rather than assumed.
///
/// A cheap assertion to keep in a test suite: if it fails, the kernel or
/// the discount is malformed in a way the constructor missed, and every
/// guarantee downstream is void.
#[must_use]
pub fn contraction_report(
    mdp: &MarkovDecisionProcess,
    discount: Discount,
    first: &[f64],
    second: &[f64],
) -> ContractionReport {
    let backup = |values: &[f64]| -> Vec<f64> {
        (0..mdp.n_states())
            .map(|state| mdp.best_action_value(StateId(state), values, discount))
            .collect()
    };

    let before = first
        .iter()
        .zip(second)
        .map(|(a, b)| (a - b).abs())
        .fold(0.0, f64::max);
    let after = backup(first)
        .iter()
        .zip(&backup(second))
        .map(|(a, b)| (a - b).abs())
        .fold(0.0, f64::max);

    ContractionReport {
        gap_before: SupGap(before),
        gap_after: SupGap(after),
        observed_modulus: if before > 0.0 { after / before } else { 0.0 },
        gamma: discount.gamma(),
        holds: after <= discount.gamma() * before + 1e-9,
    }
}
`,
        profile:
          'Identical arithmetic to the literal version, with the kernel in one flat row-major Vec and successor rows borrowed as slices, so a backup streams contiguously instead of chasing a pointer per state-action pair. Illustrative, not a measured benchmark: the substantive change is that a leaking kernel, a discount of one, a state with no available action and a policy placing mass on an unavailable one are now failures returned at construction, where the literal version converged cleanly on every one and returned a number.',
      },
      'make-it-fast': {
        rationale:
          'The dense kernel is the wrong data structure and replacing it is worth more than everything else here combined: a real MDP has a handful of reachable successors per state-action pair, so a dense layout is almost entirely zeros and a backup spends its time multiplying by them. Flattening into one CSR block over state-action pairs turns a sweep into a walk over the transitions that exist, changing the cost from quadratic in the state count to linear in the number of non-zeros — the difference between a problem that fits and one that does not. The per-state body then fuses the sparse dot, the reward add, the availability mask and the max over actions into one pass, so the state-by-action intermediate the previous stage built on every sweep is never materialized; it is written as zipped slice iterators over the CSR arrays so the bounds checks are elided in the inner gather rather than paid per non-zero. States are independent within a Jacobi sweep, so rayon fans them across cores with nothing to synchronize, and the Gauss-Seidel variant is kept separately and deliberately serial, since reading updated values within a pass is exactly what makes it converge in fewer sweeps and exactly what forbids parallelizing it. Scratch is sized from the state count at construction so a ten-thousand-sweep solve allocates nothing, and the value and scratch buffers are swapped rather than reassigned so no sweep copies a vector.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Transitions live in one CSR block over flattened state-action pairs, so a sweep streams through non-zeros instead of indexing a three-level structure',
            tradeoff: 'The sparsity pattern is baked into the indices, so a re-estimated kernel means a rebuild rather than an edit',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The inner gather zips the CSR index and value slices, so the hot loop vectorizes instead of paying a bounds check per non-zero',
            tradeoff: 'The chained form hides the index arithmetic, which is exactly where a malformed CSR row pointer would otherwise be visible',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'States are independent within a Jacobi sweep, so the per-state maxima fan across cores with nothing to synchronize',
            tradeoff: 'It forces Jacobi over Gauss-Seidel, which needs more sweeps — so the parallel version can lose overall where in-sweep propagation was doing the work',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Value and scratch buffers are sized from the state count at construction, so a ten-thousand-sweep solve allocates nothing',
            tradeoff: 'The workspace is not reentrant, so two solves cannot share it and a nested parallel solve needs its own copy',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The sparse row dot is a few instructions called once per state-action pair per sweep, where call overhead would rival the work',
            tradeoff: 'Inlining it into both the Jacobi and Gauss-Seidel loops grows the code, and the benefit disappears once rows are long enough to dominate',
          },
        ],
        code: `//! The Bellman backup, shaped for a kernel that is mostly zeros.
//!
//! A real MDP has a handful of reachable successors per state-action
//! pair, so a dense kernel is almost entirely zeros and a dense backup
//! spends nearly all its time multiplying by them. One CSR block over
//! flattened pairs turns a sweep into a walk over the transitions that
//! exist.
//!
//! What this does not change: the sweep count still comes from gamma. A
//! faster sweep does not shorten a long horizon -- it makes each of the
//! thousand sweeps cheap, not fewer of them.

use rayon::prelude::*;

/// Transitions as CSR over flattened (state, action) rows.
///
/// Row s*A + a holds the successor distribution for that pair, so one
/// pass covers every pair. The layout is immutable by construction --
/// the indices encode the sparsity pattern -- which is the right trade
/// for a solver and the wrong one for a model being edited.
pub struct SparseMdp {
    n_states: usize,
    n_actions: usize,
    row_start: Vec<u32>,
    column: Vec<u32>,
    transition: Vec<f64>,
    reward: Vec<f64>,
    available: Vec<bool>,
}

impl SparseMdp {
    pub fn new(
        n_states: usize,
        n_actions: usize,
        row_start: Vec<u32>,
        column: Vec<u32>,
        transition: Vec<f64>,
        reward: Vec<f64>,
        available: Vec<bool>,
    ) -> Option<Self> {
        if row_start.len() != n_states * n_actions + 1 || column.len() != transition.len() {
            return None;
        }
        Some(Self {
            n_states,
            n_actions,
            row_start,
            column,
            transition,
            reward,
            available,
        })
    }

    #[must_use]
    pub fn n_states(&self) -> usize {
        self.n_states
    }

    #[must_use]
    pub fn nonzeros(&self) -> usize {
        self.transition.len()
    }

    /// What fraction of the kernel is actually non-zero.
    ///
    /// Worth reporting rather than assuming: near one, the sparse
    /// layout is pure indirection overhead and the dense backup was
    /// correct. This is the number that decides which implementation is
    /// appropriate, and it is cheap.
    #[must_use]
    pub fn density(&self) -> f64 {
        self.transition.len() as f64 / (self.n_states * self.n_actions * self.n_states) as f64
    }

    /// One CSR row dotted with the value vector.
    ///
    /// Zipped slice iterators rather than an index loop, so the gather
    /// vectorizes instead of paying a bounds check per non-zero.
    #[inline]
    fn row_dot(&self, pair: usize, values: &[f64]) -> f64 {
        let begin = self.row_start[pair] as usize;
        let end = self.row_start[pair + 1] as usize;

        self.column[begin..end]
            .iter()
            .zip(&self.transition[begin..end])
            .map(|(index, probability)| probability * values[*index as usize])
            .sum()
    }

    /// The fused per-state body: sparse dot, reward add, mask, max.
    ///
    /// The state-by-action intermediate is never written, which is the
    /// allocation the previous stage paid on every sweep.
    #[inline]
    fn best_value(&self, state: usize, values: &[f64], gamma: f64) -> f64 {
        let base = state * self.n_actions;
        (0..self.n_actions)
            .filter(|action| self.available[base + action])
            .map(|action| {
                let pair = base + action;
                self.reward[pair] + gamma * self.row_dot(pair, values)
            })
            .fold(f64::NEG_INFINITY, f64::max)
    }
}

/// Buffers sized once from the state count.
///
/// A solver running ten thousand sweeps at a high discount allocates
/// nothing after construction. Not reentrant, which is the price: two
/// solves cannot share a workspace.
pub struct Workspace {
    values: Vec<f64>,
    scratch: Vec<f64>,
}

impl Workspace {
    #[must_use]
    pub fn new(n_states: usize) -> Self {
        let mut values = Vec::with_capacity(n_states);
        let mut scratch = Vec::with_capacity(n_states);
        values.resize(n_states, 0.0);
        scratch.resize(n_states, 0.0);
        Self { values, scratch }
    }
}

pub struct SolveResult {
    pub values: Vec<f64>,
    pub sweeps: usize,
    pub final_gap: f64,
    pub error_bound: f64,
    pub converged: bool,
}

/// Jacobi value iteration: every state from the same input values.
///
/// States are independent within a sweep, which is what licenses the
/// parallel map. The buffers are swapped rather than reassigned, so no
/// sweep copies a vector.
pub fn value_iteration(
    mdp: &SparseMdp,
    gamma: f64,
    tolerance: f64,
    max_sweeps: usize,
    workspace: &mut Workspace,
) -> SolveResult {
    workspace.values.fill(0.0);
    let mut gap = f64::INFINITY;
    let mut sweeps = 0;

    for sweep in 1..=max_sweeps {
        {
            let current: &[f64] = &workspace.values;
            workspace
                .scratch
                .par_iter_mut()
                .enumerate()
                .for_each(|(state, slot)| {
                    *slot = mdp.best_value(state, current, gamma);
                });
        }

        gap = workspace
            .scratch
            .iter()
            .zip(&workspace.values)
            .map(|(new, old)| (new - old).abs())
            .fold(0.0, f64::max);

        std::mem::swap(&mut workspace.values, &mut workspace.scratch);
        sweeps = sweep;

        if gap < tolerance {
            break;
        }
    }

    SolveResult {
        values: workspace.values.clone(),
        sweeps,
        final_gap: gap,
        error_bound: gamma * gap / (1.0 - gamma),
        converged: gap < tolerance,
    }
}

/// In-place backup reading its own updates within the sweep.
///
/// Jacobi computes every new value from the old array; this reads
/// whatever is current, so information propagates across the state
/// space within one pass instead of one state per sweep. On most
/// structured problems that is a meaningful reduction in sweep count
/// for no extra arithmetic.
///
/// Deliberately serial: the in-sweep dependency is exactly what makes
/// it converge faster and exactly what forbids parallelizing it.
/// Ordering now affects the trajectory, though not the fixed point.
pub fn gauss_seidel_sweep(
    mdp: &SparseMdp,
    values: &mut [f64],
    gamma: f64,
    order: &[u32],
) -> f64 {
    let mut largest_change = 0.0_f64;

    for &index in order {
        let state = index as usize;
        let best = mdp.best_value(state, values, gamma);
        largest_change = largest_change.max((best - values[state]).abs());
        values[state] = best;
    }
    largest_change
}

/// Act greedily, without materializing the action values.
///
/// Separate from the solve because the fused backup deliberately
/// discards the per-action numbers, and this is where they are wanted.
/// Paid once at the end rather than on every sweep.
#[must_use]
pub fn greedy_policy(mdp: &SparseMdp, values: &[f64], gamma: f64) -> Vec<u32> {
    (0..mdp.n_states())
        .map(|state| {
            let base = state * mdp.n_actions;
            let mut best = f64::NEG_INFINITY;
            let mut chosen = 0_u32;

            for action in 0..mdp.n_actions {
                let pair = base + action;
                if !mdp.available[pair] {
                    continue;
                }
                let candidate = mdp.reward[pair] + gamma * mdp.row_dot(pair, values);
                // Strict greater-than, so ties resolve to the lowest
                // index deterministically: a re-solve cannot silently
                // return a different policy with an identical value.
                if candidate > best {
                    best = candidate;
                    chosen = action as u32;
                }
            }
            chosen
        })
        .collect()
}

/// How many backups the tolerance needs, before running any.
///
/// Straight from the contraction, and the honest way to size a job: the
/// cost of a long horizon is knowable in advance rather than discovered
/// after an hour. Nothing in this file changes this number.
#[must_use]
pub fn sweeps_needed(gamma: f64, tolerance: f64, initial_gap: f64) -> Option<usize> {
    if !(0.0..1.0).contains(&gamma) {
        return None;
    }
    if gamma == 0.0 {
        return Some(1);
    }
    Some(((tolerance / initial_gap).ln() / gamma.ln()).ceil() as usize)
}
`,
        profile:
          'One sparse backup is O(nnz) for nnz transitions that exist, against O(|S|²·|A|) dense — on a kernel with a handful of successors per pair that is the difference between linear and quadratic in the state count. Sweep count stays log(tolerance)/log(gamma), unchanged by anything here. Illustrative, not a measured benchmark: check the kernel density first, since above roughly ten percent non-zero the CSR indirection costs more than it saves and the dense backup is the right implementation.',
      },
    },
  },
};
