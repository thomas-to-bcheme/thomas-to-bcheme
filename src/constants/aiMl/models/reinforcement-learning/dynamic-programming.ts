import type { AiMlModel } from '../../types';

/**
 * Dynamic programming — the entry where two algorithms reach the same
 * answer by opposite routes, and the choice between them is a real one.
 *
 * Value iteration truncates evaluation to a single backup and pays for
 * it in sweeps; policy iteration evaluates exactly and pays for it per
 * iteration. The discount decides which is cheaper, and almost nobody
 * checks.
 */
export const DYNAMIC_PROGRAMMING: AiMlModel = {
  slug: 'dynamic-programming',
  name: 'Dynamic Programming (Value & Policy Iteration)',
  aliases: ['Value iteration', 'Policy iteration', 'Modified policy iteration', 'Generalized policy iteration', 'Asynchronous DP'],
  category: 'reinforcement-learning',
  group: 'foundations',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control'],
  paradigmNote:
    'Listed under reinforcement because it solves the reinforcement-learning problem, but it does no learning at all: the transition kernel and reward are given, and nothing is estimated from experience. That is the distinction worth holding onto — every method later in this category exists to relax exactly this assumption, and each pays sample efficiency for the privilege.',

  intuition:
    'Two loops that chase each other. One asks "given how I currently act, what is each state worth?", the other asks "given those values, is there a better action anywhere?". Improve the policy and the old values are stale; re-evaluate and the policy may no longer be greedy. Run them against each other and they converge to the pair that is consistent — the optimal policy and its value function. The interesting part is how much evaluation to do before improving again. Solve it exactly every time and you have policy iteration, which takes very few rounds and pays heavily for each. Do a single backup and improve immediately and you have value iteration, which takes many cheap rounds. They are the two ends of one dial, the answer is identical, and which end is cheaper depends almost entirely on the discount — a fact that decides real runtimes and is almost never checked before a solver is written.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        '\\pi_{k+1}(s) = \\arg\\max_a \\Bigl[ R(s,a) + \\gamma \\sum_{s\'} P(s\' \\mid s,a) V^{\\pi_k}(s\') \\Bigr] \;\\Longrightarrow\; V^{\\pi_{k+1}} \\ge V^{\\pi_k} \;\\text{componentwise}',
      symbols: [
        { symbol: 'V^{\\pi_k}', meaning: 'the value of the current policy, from the linear expectation equation — exactly or approximately' },
        { symbol: '\\pi_{k+1}', meaning: 'the greedy policy with respect to those values; the improvement step' },
        { symbol: '\\ge \\text{componentwise}', meaning: 'the policy improvement theorem: no state gets worse, and at least one gets strictly better unless the policy is already optimal' },
        { symbol: '\\gamma', meaning: 'the discount, which sets how many evaluation sweeps an approximate evaluation needs to be useful' },
      ],
    },
    reading:
      'The policy improvement theorem is the load-bearing statement and it is stronger than it looks: acting greedily with respect to a policy\'s own value function produces a policy that is at least as good in EVERY state, not merely in expectation or on average. That componentwise guarantee is what makes the alternation terminate rather than oscillate. Two consequences follow immediately. Since there are finitely many deterministic policies and each round produces a strictly better one until optimality, policy iteration terminates exactly, in a finite number of iterations — a genuine exact-termination guarantee, which is rare enough in this reference to be worth noticing. And because the theorem holds for any value function that is a valid evaluation of the current policy, the evaluation need not be exact: doing m sweeps instead of solving gives modified policy iteration, with m of one recovering value iteration and m of infinity recovering policy iteration. The whole family is one dial. The practically important asymmetry is hidden in that dial. Value iteration\'s sweep count scales as log tolerance over log gamma, so it degrades sharply as the discount approaches one; policy iteration\'s iteration count barely moves. At gamma of 0.9 they are comparable and at 0.999 they are not, and that is a decision to make before writing a solver rather than after profiling one.',
  },

  optimization: {
    method: 'Generalized policy iteration — alternating evaluation and greedy improvement, with the amount of evaluation per round as the free parameter',
    updateRule: {
      formula:
        'V_{k+1} = \\underbrace{(\\mathcal{T}^{\\pi})^m V_k}_{\\text{evaluate: } m \\text{ sweeps}}, \\qquad m = 1 \\Rightarrow \\text{value iteration}, \\quad m \\to \\infty \\Rightarrow \\text{policy iteration}',
      symbols: [
        { symbol: '\\mathcal{T}^{\\pi}', meaning: 'the expectation operator for a fixed policy — linear, and a gamma-contraction like the optimality operator' },
        { symbol: 'm', meaning: 'evaluation sweeps per improvement; the single dial the whole family sits on' },
        { symbol: 'm = 1', meaning: 'one backup then improve: value iteration, cheap rounds and many of them' },
        { symbol: 'm \\to \\infty', meaning: 'evaluate to convergence then improve: policy iteration, expensive rounds and few of them' },
      ],
    },
    rationale:
      'Both ends of the dial reach the same fixed point, so the choice is entirely about cost, and the cost structures are genuinely different rather than differing by a constant. Policy iteration\'s evaluation is a linear solve at O(|S|^3), which is brutal per round and bought back by a round count that is empirically tiny — frequently under ten, and provably bounded because each round produces a strictly better policy from a finite set. Value iteration\'s round is O(|S|^2·|A|), cheap enough to be irrelevant, but it needs roughly log tolerance over log gamma of them, which is a hundredfold more at gamma 0.999 than at 0.9. So the discount picks the winner: short horizons favour value iteration, long horizons favour policy iteration, and modified policy iteration with m between three and twenty is usually better than either, because the exact solve is overkill early when the policy is about to change anyway. Two refinements matter more than they are used. The greedy policy stabilizes long before the values converge — often in a small fraction of the sweeps — so a solver that only needs the policy and stops on value tolerance is doing most of its work for nothing; checking policy stability as well is free. And the span seminorm, the gap between the largest and smallest component of a Bellman residual, is the sharper stopping criterion, because a constant added to every state changes no greedy decision and the sup-norm criterion counts that constant as error.',
    hyperparameters: [
      { name: 'evaluation sweeps (m)', role: 'The dial between the two algorithms. One is value iteration, infinity is policy iteration, and a small number is usually better than either', typicalRange: '1 to 50, or exact' },
      { name: 'discount (gamma)', role: 'Part of the problem, but it also decides which algorithm is cheaper — value iteration degrades with it and policy iteration barely notices', typicalRange: '0.9 to 0.999' },
      { name: 'tolerance', role: 'When to stop. Far too strict if only the policy is wanted, since the greedy policy stabilizes well before the values do', typicalRange: '1e-6 to 1e-10' },
      { name: 'sweep order', role: 'Asynchronous DP lets states be updated in any order and any frequency, and a good order propagates value backwards from goals in a fraction of the passes', typicalRange: 'in-place, reverse-reachability, or residual-prioritized' },
      { name: 'initial value function', role: 'Warm-starting from a previous solve is the single largest practical saving when a kernel is re-estimated on a schedule', typicalRange: 'zeros, or the previous solution' },
    ],
    convergence:
      'Both converge, and to the same place, with different guarantees. Policy iteration terminates EXACTLY after finitely many rounds, because the improvement theorem makes each policy strictly better and the policy set is finite. That guarantee has a sharp edge in implementation: it depends on tie-breaking being consistent, and an argmax that resolves ties arbitrarily can cycle forever between two policies with identical value, which presents as a solver that never terminates on a problem that has an exact answer. Value iteration converges geometrically at rate gamma and never exactly, with the contraction supplying a real error bound from successive iterates. The failures people actually hit are elsewhere. A discount close to one makes value iteration slow in a way no implementation detail recovers — the sweep count is the contraction rate and nothing else. Asynchronous DP converges provided every state is updated infinitely often, and a prioritized order that quietly starves a state breaks that condition rather than merely slowing it. And all of these guarantees are tabular: they say nothing once values are approximated, because they are sup-norm arguments and approximation does not preserve that norm.',
    complexity:
      'Value iteration is O(|S|^2·|A|) per sweep, or O(nnz·|A|) with a sparse kernel, and needs log(tolerance)/log(gamma) sweeps. Policy iteration is O(|S|^3) per round for the exact solve plus one O(|S|^2·|A|) improvement, and needs remarkably few rounds — strongly polynomial for a fixed discount. Modified policy iteration is m sweeps plus an improvement per round. Memory is O(|S|) for the value function against O(|S|^2·|A|) for a dense kernel, which is the real constraint: the kernel, not the solver, is what exhausts a machine, and it is why sparse storage is the first change worth making.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'There are no actions to improve over, so the improvement step has nothing to range across and the whole alternation collapses; forecasting becomes relevant only one step downstream, once a prediction feeds a decision, which is the control-and-operations case rather than this one.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting on them, so there is no policy to evaluate or improve; a large Bellman residual reports an unconverged solver, never an unusual observation.',
      },
      optimization: {
        fit: 'primary',
        how: 'Solve a sequential decision problem exactly when the model is known, by alternating policy evaluation and greedy improvement until the pair is consistent. The output is an optimal policy with a certificate rather than an approximation with a hope.',
        where: [
          'Exact solutions to modest MDPs, which are the reference every approximate method should be measured against',
          'The evaluation-versus-improvement dial as a design choice with a measurable cost on either side',
          'Finite exact termination from a monotone improvement argument, which is unusual enough to be worth studying on its own',
          'Asynchronous and prioritized updates, where the order of work is the optimization rather than the arithmetic',
        ],
        why: 'Worth learning precisely rather than as background, because three lessons here generalize well past reinforcement learning. First, alternating two cheap steps that each improve a different half of a coupled problem is a pattern that recurs — expectation-maximization has the same shape, and so does block coordinate descent — and the improvement theorem is what makes the pattern terminate instead of oscillate. Second, the exactness of the inner step is a tunable rather than a requirement: modified policy iteration says that solving the subproblem approximately and improving sooner is usually better than solving it well, which is advice that transfers directly to any nested optimization. Third, the asymptotics can invert on a parameter that looks like part of the problem statement — the discount decides which algorithm wins, and by a factor of a hundred rather than a few percent. The limitation is the familiar one: every sweep touches every state, and the state count is exponential in the number of state variables.',
        featurization: [
          'Check the discount before choosing the algorithm; near one, policy iteration wins by a margin no implementation detail recovers',
          'Store the kernel sparsely from the start, since it is the array that exhausts memory long before the value function does',
          'Stop on policy stability as well as value tolerance, because the greedy policy settles well before the values do',
          'Use the span seminorm rather than the sup-norm when only the policy matters; a constant offset changes no decision and the sup-norm counts it as error',
        ],
        evaluation:
          'The Bellman residual in sup-norm for a value function, and exact evaluation of the derived policy against the optimal value for the policy itself — these are different questions and the second is the one that matters. Report the iteration or sweep count alongside the answer, since it is the quantity that separates the two algorithms and it is the one a reader needs to judge the choice.',
        pitfalls: [
          'Choosing value iteration at a discount near one, where the sweep count is the contraction rate and nothing else',
          'Arbitrary tie-breaking in the improvement step, which can cycle forever between two policies of identical value',
          'Iterating values to machine precision when the greedy policy stabilized a tenth of the way in',
          'A dense kernel, which exhausts memory at a state count the solver would have handled comfortably',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Where the dynamics are documented — a queue with known arrival and service rates, an inventory with a known demand distribution, a machine with a measured failure curve — the MDP can be written down and solved rather than sampled. The policy comes with an optimality certificate, which is frequently worth more than the policy.',
        where: [
          'Inventory and replenishment, where the classical order-up-to results are exactly these solutions',
          'Maintenance and replacement scheduling as optimal stopping, one of the few MDPs with structure worth exploiting explicitly',
          'Admission and routing control in queueing systems with known service processes',
          'Receding-horizon control, re-solving a short exact problem repeatedly instead of one intractable long one',
        ],
        why: 'The strongest fit in this reference, and the reason is worth stating plainly: operations research solved these problems with these algorithms decades before reinforcement learning existed, and where the kernel is known the exact solution is available at a cost no sampling method can match. Checking for a known kernel first is the highest-value habit in this whole category and it is skipped routinely. The domain also supplies the structure that makes large problems tractable — monotone value functions, threshold-optimal policies, decomposable state — and exploiting it collapses problems that are hopeless as generic MDPs. Two honest limits. State spaces multiply out fast, so a formulation that looks modest on paper is often enumerable only after aggressive aggregation. And the kernel is usually estimated rather than known, which makes the policy\'s sensitivity to estimation error a more important question than the gap between candidate policies — and it is almost never the question that gets asked.',
        featurization: [
          'Look for exploitable structure before scaling: thresholds, monotonicity and decomposition turn intractable problems into small ones',
          'Encode operational limits as unavailable actions rather than as reward penalties, which turn a hard constraint into an exchange rate',
          'Warm-start from the previous solution when re-solving on a schedule; a re-estimated kernel rarely moves the policy much',
          'Perturb the kernel within its estimation error and re-solve, since that sensitivity usually dominates the choice of algorithm',
        ],
        evaluation:
          'Exact evaluation of the incumbent policy against the computed optimum, which is available here precisely because the kernel is known — this is the rare domain where the comparison is a calculation rather than an experiment. Then simulate under perturbed dynamics, because a policy optimal for the estimated kernel and fragile to it is worse than a robust suboptimal one.',
        pitfalls: [
          'Learning a policy for a system whose dynamics are already documented',
          'A state space discovered to be intractable only after the formulation is fixed',
          'Constraints as penalties, which the optimizer treats as a price rather than a prohibition',
          'Ignoring kernel estimation error, which usually matters more than the last percent of optimality',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Applicable where a compact, genuinely Markov state exists and the action set has been narrowed to something enumerable — a small slate of candidate strategies, a handful of exposure policies, a discretized budget state — rather than the full catalogue.',
        where: [
          'Budget pacing and allocation over a session or a day, where the state is small and the dynamics are known',
          'Choosing among a handful of ranking strategies as a function of session state',
          'Exact solution of a simplified model to sanity-check what a learned policy should look like',
          'Optimal stopping within a session: when to stop recommending and when to prompt',
        ],
        why: 'A narrow but real fit, and being clear about the boundary is most of the value. The obstacles are both structural rather than incidental: the action space is the catalogue, so the improvement step\'s max is intractable without candidate generation, and a user is not a Markov state in any compact representation, so the guarantees describe a process that is not the one being served. Where it does apply, the state has usually been deliberately reduced to something small and tractable — a budget level, a fatigue counter, a session stage — and then the exact solution is both cheap and useful, often as a reference that tells you whether a learned policy is even approximately sensible. The alternative worth naming is the one that usually wins: if the problem is genuinely one step, a contextual bandit is the correct specialization and not a compromise.',
        featurization: [
          'Reduce the action set to an enumerable menu before the improvement step, or its max is not computable',
          'Compress the session into a state deliberately, and treat the Markov claim about that compression as an assumption to defend',
          'Check whether the problem is one step; if it is, a contextual bandit is the right tool and this is over-engineering',
          'Solve a simplified exact model as a reference for what a learned policy should resemble',
        ],
        evaluation:
          'Online tests decide. The exact solution\'s value here is as a reference point rather than as a deployable policy — a learned policy that disagrees sharply with the exact solution of a reasonable simplification is usually reporting a bug rather than a discovery.',
        pitfalls: [
          'A max over the full catalogue, which is not computable and is usually silently replaced',
          'Treating a user as Markov, which is the assumption doing all the work and the least examined',
          'Building this where a contextual bandit captures nearly all the value',
          'Trusting the exact solution of a simplification as though it were the solution of the real problem',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'There is no training. Value iteration is many cheap sweeps whose count comes from the discount; policy iteration is a handful of expensive linear solves. The crossover is set by gamma and by the state count, and it is worth measuring once rather than assuming: at a long horizon policy iteration can finish in the time value iteration needs to get started. The binding cost in both cases is the kernel, which is the largest array in the system and the reason sparse storage is the first change worth making. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'A table lookup: the policy is one action per state, so serving is a single indexed read with no arithmetic at all. Completely inspectable, and the value function that produced it can be shown alongside the recommendation — which is worth a great deal in any setting where an operator has to accept the decision rather than merely receive it.',
    retrainingCadence:
      'Re-solve when the kernel or the reward changes, which is an event rather than a drift: a re-layout, a price change or a new service-level target invalidates the solution rather than degrading it. Warm-starting from the previous value function usually cuts the re-solve to a fraction of the original, since a re-estimated kernel rarely moves the policy far.',
    driftAndMonitoring: [
      'Bellman residual of the deployed value function against freshly estimated dynamics, which detects a moved kernel directly',
      'Realized transition frequencies against the assumed kernel, since a specified model drifts silently while the policy keeps acting confidently',
      'Fraction of decisions where the second-best action is within a small margin, which marks the states where kernel error can flip the policy',
      'Realized discounted return against the value function\'s prediction, the end-to-end check that subsumes the others',
      'State-visitation coverage against the states the solve assumed reachable, since an unreachable state with a confident value is a specification error surfacing late',
    ],
    productionGotchas: [
      'Arbitrary tie-breaking in the improvement step can cycle forever between two policies of identical value. Consistent tie-breaking is what the finite-termination guarantee actually depends on',
      'Value iteration to machine precision is usually wasted work: the greedy policy stabilizes long before the values, and checking policy stability costs nothing',
      'The sup-norm stopping criterion counts a constant offset as error, though it changes no decision. The span seminorm is the right criterion when only the policy is wanted',
      'A dense kernel exhausts memory at a state count the solver itself would have handled comfortably, so the storage decision binds before the algorithmic one',
      'Asynchronous DP converges only if every state is updated infinitely often, so a prioritized order that starves a state breaks the guarantee rather than slowing it',
      'The policy is a table, so an unseen or newly-reachable state has no entry; the fallback is a design decision and it is usually made by accident',
      'These are exact methods on an assumed model. A policy optimal for an estimated kernel can be fragile to it, and that sensitivity is rarely measured',
    ],
  },

  assumptions: [
    'The transition kernel and reward are known — this is the assumption every later method in this category exists to relax',
    'The state is Markov, so the value function is well defined on the state alone',
    'State and action spaces are enumerable, since every sweep touches every state and every improvement ranges over every action',
    'The discount is strictly below one, or every policy terminates, so the operators are contractions and the guarantees hold',
    'The dynamics are stationary; a moving kernel invalidates the solution rather than degrading it gradually',
  ],

  pros: [
    {
      point: 'Policy iteration terminates exactly, in finitely many rounds',
      context:
        'The improvement theorem makes each policy strictly better and there are finitely many, so the answer is exact rather than approached. Rare in this reference — and it depends on consistent tie-breaking, which is an implementation detail that carries a proof',
    },
    {
      point: 'The amount of evaluation per round is a free parameter, not a requirement',
      context:
        'Modified policy iteration interpolates between the two algorithms, and a small number of sweeps usually beats both ends. The same "solve the subproblem approximately and move on" lesson transfers to any nested optimization',
    },
    {
      point: 'The greedy policy stabilizes long before the value function converges',
      context:
        'Often in a small fraction of the sweeps, so a solver that only needs the policy can stop far earlier. Checking policy stability is free and almost never done',
    },
    {
      point: 'The output is a table, so serving is a lookup and every decision is inspectable',
      context:
        'No arithmetic at inference and a value for every alternative action available for inspection. This is what the rest of the category trades away, and it matters wherever a decision must be justified',
    },
    {
      point: 'Asynchronous updates are permitted, so the order of work becomes an optimization',
      context:
        'States can be updated in any order and any frequency provided none is starved. Propagating value backwards from terminal states can reach a good policy in a fraction of the passes a uniform sweep needs',
    },
  ],

  cons: [
    {
      point: 'The kernel must be known, which it usually is not',
      context:
        'This is the single assumption separating these methods from everything later in the category, and each of those pays a large sample cost to relax it. The check worth making first is whether the kernel is actually available',
    },
    {
      point: 'Every sweep touches every state, and the state count is exponential in the state variables',
      context:
        'The curse of dimensionality in its plainest form. It makes these the reference solution rather than the practical one, and the dense kernel exhausts memory before the sweep cost even becomes relevant',
    },
    {
      point: 'Value iteration degrades sharply as the discount approaches one',
      context:
        'Sweep count is log tolerance over log gamma, so 0.999 costs roughly a hundred times 0.9 for the same accuracy. No implementation detail recovers this; the algorithm choice does',
    },
    {
      point: 'Arbitrary tie-breaking can make policy iteration cycle indefinitely',
      context:
        'Two policies of identical value can alternate forever, which presents as a solver hanging on a problem with an exact finite answer. The fix is one line and the diagnosis usually is not',
    },
    {
      point: 'Everything here is tabular, and the guarantees do not survive function approximation',
      context:
        'They are sup-norm arguments, and approximators do not preserve that norm. Carrying the intuition across that boundary is the formal root of the instability in approximate dynamic programming',
    },
    {
      point: 'Exact optimality for an assumed model can be fragile to that model',
      context:
        'A policy tuned to the last percent against an estimated kernel may be worse in deployment than a robust suboptimal one, and the sensitivity analysis that would show this is rarely run',
    },
  ],

  relatedSlugs: ['mdp-bellman', 'monte-carlo-control', 'td-learning', 'q-learning'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Value iteration and policy iteration, transcribed literally.

No library. Both algorithms on the same tiny MDP, so the comparison is
a measurement rather than a claim:

    evaluate:  V^pi = R_pi + gamma P_pi V^pi     (linear, solvable)
    improve:   pi'(s) = argmax_a [ R + gamma P V^pi ]

Four things to read for.

1. policy_iteration() and value_iteration() reach the same answer by
   opposite routes. Compare their iteration counts -- and then change
   gamma from 0.9 to 0.99 and compare again. Value iteration's count
   grows roughly tenfold; policy iteration's barely moves. That
   asymmetry decides real runtimes and is almost never checked before
   a solver is written.

2. modified_policy_iteration() is the dial they sit on. m = 1 is value
   iteration, m = infinity is policy iteration, and a small m is
   usually better than either.

3. sweeps_until_policy_stable() measures something most solvers ignore:
   the greedy policy stops changing long before the values converge.
   Iterating to machine precision after that point is work done for
   nothing.

4. cycling_demo() shows the failure that makes an exact algorithm hang.
   Policy iteration's finite-termination guarantee depends on
   consistent tie-breaking; with arbitrary ties it can alternate
   forever between two policies of identical value.
"""

Kernel = list[list[list[float]]]   # P[s][a][s']
Reward = list[list[float]]         # R[s][a]


def expected_next_value(kernel: Kernel, values: list[float], state: int, action: int) -> float:
    total = 0.0
    for next_state, probability in enumerate(kernel[state][action]):
        total += probability * values[next_state]
    return total


def action_value(
    kernel: Kernel, reward: Reward, values: list[float], state: int, action: int, gamma: float
) -> float:
    return reward[state][action] + gamma * expected_next_value(kernel, values, state, action)


def evaluate_policy_sweeps(
    kernel: Kernel, reward: Reward, policy: list[int], values: list[float], gamma: float, sweeps: int
) -> list[float]:
    """m applications of T^pi, starting from whatever values are given.

    Warm-starting from the previous round's values rather than from
    zeros is not a micro-optimization: consecutive policies are similar,
    so their value functions are too, and the evaluation usually starts
    most of the way to its answer.
    """
    current = list(values)
    for _ in range(sweeps):
        current = [
            action_value(kernel, reward, current, state, policy[state], gamma)
            for state in range(len(policy))
        ]
    return current


def evaluate_policy_exactly(
    kernel: Kernel, reward: Reward, policy: list[int], gamma: float
) -> list[float]:
    """Solve V^pi = R_pi + gamma P_pi V^pi, by Gaussian elimination.

    The max is gone, so the equation is linear and this is a solve
    rather than an iteration. That is the entire structural difference
    between the two algorithms: policy iteration pays O(|S|^3) here and
    buys back a round count that is startlingly small.
    """
    n_states = len(policy)
    matrix = []
    for state in range(n_states):
        row = [0.0] * (n_states + 1)
        row[state] = 1.0
        action = policy[state]
        row[n_states] = reward[state][action]
        for next_state, probability in enumerate(kernel[state][action]):
            row[next_state] -= gamma * probability
        matrix.append(row)

    for column in range(n_states):
        pivot = max(range(column, n_states), key=lambda r: abs(matrix[r][column]))
        if abs(matrix[pivot][column]) < 1e-12:
            raise ValueError(
                f"(I - gamma P_pi) is singular at column {column}; at gamma = 1 with a "
                "policy that never terminates the equation has no solution"
            )
        matrix[column], matrix[pivot] = matrix[pivot], matrix[column]

        for row in range(column + 1, n_states):
            factor = matrix[row][column] / matrix[column][column]
            if factor == 0.0:
                continue
            for position in range(column, n_states + 1):
                matrix[row][position] -= factor * matrix[column][position]

    values = [0.0] * n_states
    for state in reversed(range(n_states)):
        total = matrix[state][n_states]
        for column in range(state + 1, n_states):
            total -= matrix[state][column] * values[column]
        values[state] = total / matrix[state][state]
    return values


def improve_policy(kernel: Kernel, reward: Reward, values: list[float], gamma: float) -> list[int]:
    """Act greedily, breaking ties by lowest index.

    The tie-breaking is not a detail. Policy iteration terminates
    because each round produces a STRICTLY better policy from a finite
    set, and an argmax that resolves ties arbitrarily can alternate
    forever between two policies of identical value -- an exact
    algorithm that never returns. See cycling_demo() below.
    """
    improved = []
    for state in range(len(reward)):
        scored = [
            (action_value(kernel, reward, values, state, action, gamma), action)
            for action in range(len(reward[state]))
        ]
        best = max(value for value, _ in scored)
        improved.append(min(action for value, action in scored if value == best))
    return improved


def policy_iteration(kernel: Kernel, reward: Reward, gamma: float, max_rounds: int = 1000):
    """Evaluate exactly, improve, repeat until the policy stops changing.

    Termination here is EXACT and finite: the improvement theorem says
    each round is strictly better componentwise, and there are finitely
    many deterministic policies, so the loop cannot run forever and the
    answer is not an approximation.
    """
    policy = [0] * len(reward)
    history = []

    for round_index in range(max_rounds):
        values = evaluate_policy_exactly(kernel, reward, policy, gamma)
        improved = improve_policy(kernel, reward, values, gamma)
        history.append(list(improved))

        if improved == policy:
            return {
                "policy": policy,
                "values": values,
                "rounds": round_index + 1,
                "history": history,
                "exact": True,
            }
        policy = improved

    raise RuntimeError(
        "policy iteration did not terminate; with consistent tie-breaking this is "
        "impossible, so the tie-breaking is what to look at"
    )


def value_iteration(kernel: Kernel, reward: Reward, gamma: float, tolerance: float = 1e-10):
    """One backup then improve, repeated. Geometric, never exact.

    Read the sweep count against gamma. It is log(tolerance)/log(gamma)
    and nothing else -- so the discount, which is part of the problem
    statement, sets the runtime by a factor of a hundred between 0.9 and
    0.999. That is the comparison that should decide which algorithm to
    write.
    """
    values = [0.0] * len(reward)

    for sweep in range(1, 1_000_000):
        updated = [
            max(
                action_value(kernel, reward, values, state, action, gamma)
                for action in range(len(reward[state]))
            )
            for state in range(len(reward))
        ]
        gap = max(abs(new - old) for new, old in zip(updated, values))
        values = updated

        if gap < tolerance:
            return {
                "policy": improve_policy(kernel, reward, values, gamma),
                "values": values,
                "sweeps": sweep,
                "final_gap": gap,
                "error_bound": gamma * gap / (1.0 - gamma),
                "exact": False,
            }
    raise RuntimeError("value iteration exceeded its sweep cap")


def modified_policy_iteration(
    kernel: Kernel, reward: Reward, gamma: float, evaluation_sweeps: int, max_rounds: int = 10_000
):
    """The dial the two algorithms sit on.

    evaluation_sweeps = 1 is value iteration. evaluation_sweeps large
    approaches policy iteration. A small number -- three to twenty -- is
    usually better than either end, because solving the evaluation
    exactly is wasted effort early, when the policy is about to change
    anyway.

    Note the warm start: values carry across rounds rather than being
    reset, which is what makes a handful of sweeps enough.
    """
    if evaluation_sweeps < 1:
        raise ValueError(f"evaluation_sweeps must be at least 1, got {evaluation_sweeps}")

    policy = [0] * len(reward)
    values = [0.0] * len(reward)

    for round_index in range(max_rounds):
        values = evaluate_policy_sweeps(kernel, reward, policy, values, gamma, evaluation_sweeps)
        improved = improve_policy(kernel, reward, values, gamma)

        if improved == policy:
            return {
                "policy": policy,
                "values": values,
                "rounds": round_index + 1,
                "total_sweeps": (round_index + 1) * evaluation_sweeps,
            }
        policy = improved

    raise RuntimeError("modified policy iteration exceeded its round cap")


def sweeps_until_policy_stable(kernel: Kernel, reward: Reward, gamma: float, tolerance: float = 1e-10):
    """When the POLICY settles, against when the values do.

    Usually a small fraction of the way in. Everything after the first
    number is work spent refining values that no longer change any
    decision -- which makes a value-tolerance stopping rule the wrong
    criterion for a solver that only needs a policy, and checking policy
    stability costs one comparison per sweep.
    """
    values = [0.0] * len(reward)
    optimal = value_iteration(kernel, reward, gamma, tolerance)["policy"]
    policy_stable_at = None

    for sweep in range(1, 1_000_000):
        updated = [
            max(
                action_value(kernel, reward, values, state, action, gamma)
                for action in range(len(reward[state]))
            )
            for state in range(len(reward))
        ]
        gap = max(abs(new - old) for new, old in zip(updated, values))
        values = updated

        if policy_stable_at is None and improve_policy(kernel, reward, values, gamma) == optimal:
            policy_stable_at = sweep

        if gap < tolerance:
            return {
                "sweeps_to_optimal_policy": policy_stable_at,
                "sweeps_to_value_tolerance": sweep,
                "wasted_fraction": 1.0 - (policy_stable_at or sweep) / sweep,
            }
    raise RuntimeError("value iteration exceeded its sweep cap")


def span_seminorm(values: list[float]) -> float:
    """max(v) - min(v): the sharper stopping criterion.

    Adding a constant to every state changes no greedy decision, so a
    residual that is constant across states carries no information about
    the policy at all -- and the sup-norm criterion counts it as error.
    Stopping on span rather than sup-norm routinely halves the sweep
    count when only the policy is wanted.
    """
    return max(values) - min(values)


def cycling_demo(gamma: float = 0.9):
    """Why tie-breaking carries a proof.

    Two actions with identical dynamics and identical reward means two
    policies with identical value, and the improvement step has no
    reason to prefer either. With consistent tie-breaking the loop
    terminates on the first round. With ties resolved by alternating --
    which is what an unspecified argmax can effectively do -- it never
    terminates, and an algorithm with a finite-termination proof hangs.
    """
    kernel: Kernel = [[[1.0, 0.0], [1.0, 0.0]], [[0.0, 1.0], [0.0, 1.0]]]
    reward: Reward = [[1.0, 1.0], [0.0, 0.0]]

    consistent = policy_iteration(kernel, reward, gamma)

    # The same improvement step with an alternating tie-break, run for
    # a bounded number of rounds so this function returns.
    policy = [0] * len(reward)
    seen = []
    for round_index in range(10):
        values = evaluate_policy_exactly(kernel, reward, policy, gamma)
        improved = []
        for state in range(len(reward)):
            scored = [
                (action_value(kernel, reward, values, state, action, gamma), action)
                for action in range(len(reward[state]))
            ]
            best = max(value for value, _ in scored)
            tied = [action for value, action in scored if value == best]
            improved.append(tied[round_index % len(tied)])
        seen.append(tuple(improved))
        policy = improved

    return {
        "consistent_rounds": consistent["rounds"],
        "alternating_policies_seen": sorted(set(seen)),
        "note": "identical values, alternating argmax, no termination",
    }
`,
        profile:
          'A value-iteration sweep is O(|S|·|A|·|S\'|) and needs log(tolerance)/log(gamma) of them; a policy-iteration round is one O(|S|³) elimination plus one improvement, and needs remarkably few rounds. Illustrative, not a measured benchmark: the comparison worth running is the same MDP at gamma 0.9 and 0.99 — the sweep count grows roughly tenfold and the round count barely moves, which is the whole argument for checking the discount before choosing the algorithm.',
      },
      'make-it-right': {
        rationale:
          'The tie-breaking rule stops being an accident of how argmax happens to behave and becomes a named, explicit policy, because policy iteration\'s finite-termination proof depends on it: an arbitrary rule can alternate forever between two policies of identical value, which presents as an exact algorithm hanging on a problem with a finite answer. The stopping criterion likewise becomes an object rather than a float comparison, so a solver can say whether it stopped because the values converged, because the policy stopped changing, or because the span seminorm fell — three different questions that the literal version conflated into one tolerance. Every recoverable failure becomes a specific exception naming the values that caused it: a singular evaluation system, which at a discount near one with a non-terminating policy is a modelling error rather than a numerical one; an evaluation-sweep count below one, which is not a valid point on the dial; and a round cap reached, which with consistent tie-breaking is impossible and therefore points at the tie-breaking. Results become NamedTuples carrying the round count, the sweep count, the final gap and whether the answer is exact, since "policy iteration terminated exactly" and "value iteration stopped within tolerance" are different claims and a bare list of values cannot distinguish them. And the dial itself is a dataclass with the two ends named, so choosing between value iteration and policy iteration is a documented decision with the discount in view rather than a fork in the code.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""Dynamic programming with the decisions made explicit.

Three things the literal version left implicit, each of which is a
decision with consequences:

  * tie-breaking, which policy iteration's finite-termination proof
    depends on and which an unspecified argmax resolves arbitrarily;
  * the stopping criterion, where "values converged", "policy stopped
    changing" and "span fell below tolerance" are different questions
    with different answers;
  * the evaluation dial, where 1 is value iteration, exact is policy
    iteration, and the discount decides which is cheaper.

Each becomes a named object here rather than a literal in a loop.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import NamedTuple

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int64]


class DynamicProgrammingError(Exception):
    """Base for every recoverable failure in these solvers."""


class SingularEvaluation(DynamicProgrammingError):
    """(I - gamma P_pi) is not invertible.

    Not a numerical difficulty to work around: at a discount near one
    with a policy that never terminates, the expectation equation has no
    solution and the model is what needs fixing.
    """


class NonTerminating(DynamicProgrammingError):
    """Policy iteration exceeded its round cap.

    With consistent tie-breaking this cannot happen -- each round is
    strictly better and the policy set is finite -- so the message points
    where the bug actually is.
    """


class InvalidSchedule(DynamicProgrammingError):
    """A point on the evaluation dial that is not a point on it."""


class TieBreak(Enum):
    """How the improvement step resolves equal action values.

    This carries a proof. Policy iteration terminates because each round
    produces a strictly better policy from a finite set; a rule that can
    alternate between two policies of identical value breaks the
    argument, and the symptom is a solver that never returns.
    """

    LOWEST_INDEX = "lowest-index"
    PREFER_INCUMBENT = "prefer-incumbent"


class StoppingRule(Enum):
    """What "converged" means, stated rather than assumed.

    SPAN is the sharp one when only the policy is wanted: a constant
    added to every state changes no greedy decision, so a residual that
    is uniform across states carries no information about the policy and
    the sup-norm criterion counts it as error anyway.
    """

    SUP_NORM = "sup-norm"
    SPAN = "span"
    POLICY_STABLE = "policy-stable"


@dataclass(frozen=True)
class EvaluationSchedule:
    """How much evaluation to do before improving again.

    One dial, both algorithms. Frozen because it is part of the solver's
    identity: a result reported without it cannot be compared against
    another run.
    """

    sweeps: int | None  # None means solve exactly

    def __post_init__(self) -> None:
        if self.sweeps is not None and self.sweeps < 1:
            raise InvalidSchedule(
                f"evaluation sweeps must be at least 1 or None for exact; got {self.sweeps}"
            )

    @classmethod
    def value_iteration(cls) -> EvaluationSchedule:
        return cls(sweeps=1)

    @classmethod
    def policy_iteration(cls) -> EvaluationSchedule:
        return cls(sweeps=None)

    @property
    def is_exact(self) -> bool:
        return self.sweeps is None


class SolveResult(NamedTuple):
    """The answer, with what kind of answer it is.

    \`exact\` distinguishes "policy iteration terminated" from "value
    iteration stopped within tolerance", which are different claims. A
    bare value array cannot express the difference and readers assume
    the stronger one.
    """

    policy: IntArray
    values: FloatArray
    rounds: int
    total_sweeps: int
    final_gap: float
    error_bound: float
    exact: bool
    stopped_on: StoppingRule


def _action_values(
    kernel: FloatArray, reward: FloatArray, values: FloatArray, gamma: float
) -> FloatArray:
    """Q(s, a) for every pair at once."""
    return reward + gamma * (kernel @ values)


def improve_policy(
    kernel: FloatArray,
    reward: FloatArray,
    values: FloatArray,
    gamma: float,
    tie_break: TieBreak = TieBreak.LOWEST_INDEX,
    incumbent: IntArray | None = None,
) -> IntArray:
    """Greedy improvement with the tie rule stated.

    PREFER_INCUMBENT keeps the current action when it is within
    floating-point noise of the best, which both breaks ties
    consistently and stops a policy oscillating between numerically
    indistinguishable actions -- a real source of churn when the kernel
    is estimated and two actions are genuinely equivalent.
    """
    scored = _action_values(kernel, reward, values, gamma)

    if tie_break is TieBreak.LOWEST_INDEX or incumbent is None:
        return np.argmax(scored, axis=1).astype(np.int64)

    best = scored.max(axis=1)
    current = np.take_along_axis(scored, incumbent[:, None], axis=1)[:, 0]
    keep = current >= best - 1e-12
    return np.where(keep, incumbent, np.argmax(scored, axis=1)).astype(np.int64)


def evaluate_policy_exactly(
    kernel: FloatArray, reward: FloatArray, policy: IntArray, gamma: float
) -> FloatArray:
    """V^pi = (I - gamma P_pi)^-1 R_pi.

    The max is gone, so this is a solve rather than an iteration --
    the entire structural difference between the two algorithms.
    """
    n_states = kernel.shape[0]
    transition = kernel[np.arange(n_states), policy]
    expected_reward = reward[np.arange(n_states), policy]

    try:
        return np.linalg.solve(np.eye(n_states) - gamma * transition, expected_reward)
    except np.linalg.LinAlgError as error:
        raise SingularEvaluation(
            "(I - gamma P_pi) is singular; at gamma near 1 with a policy that never "
            "terminates the expectation equation has no solution, and the model is "
            "what needs fixing"
        ) from error


def evaluate_policy_sweeps(
    kernel: FloatArray,
    reward: FloatArray,
    policy: IntArray,
    values: FloatArray,
    gamma: float,
    sweeps: int,
) -> FloatArray:
    """m applications of T^pi, warm-started from the given values.

    The warm start is not a micro-optimization. Consecutive policies are
    similar, so their value functions are too, and evaluation usually
    begins most of the way to its answer -- which is what makes a
    handful of sweeps enough for the dial's middle.
    """
    n_states = kernel.shape[0]
    transition = kernel[np.arange(n_states), policy]
    expected_reward = reward[np.arange(n_states), policy]

    current = values
    for _ in range(sweeps):
        current = expected_reward + gamma * (transition @ current)
    return current


def span(values: FloatArray) -> float:
    """max - min: the criterion that ignores a constant offset."""
    return float(values.max() - values.min())


def solve(
    kernel: FloatArray,
    reward: FloatArray,
    gamma: float,
    schedule: EvaluationSchedule = EvaluationSchedule(sweeps=1),
    tolerance: float = 1e-10,
    stopping: StoppingRule = StoppingRule.SUP_NORM,
    tie_break: TieBreak = TieBreak.LOWEST_INDEX,
    max_rounds: int = 100_000,
) -> SolveResult:
    """One solver, with the dial as a parameter.

    Guard clauses first, then the loop. Both algorithms are this
    function with a different schedule, which is the honest way to
    present them: they are not alternatives so much as two settings.
    """
    if not 0.0 <= gamma < 1.0:
        raise DynamicProgrammingError(
            f"gamma must lie in [0, 1); got {gamma}. At exactly 1 the operators are not "
            "contractions and the guarantees do not hold"
        )
    if tolerance <= 0.0:
        raise ValueError(f"tolerance must be positive, got {tolerance}")
    if kernel.ndim != 3 or kernel.shape[0] != kernel.shape[2]:
        raise DynamicProgrammingError(f"kernel must be (S, A, S); got {kernel.shape}")

    n_states = kernel.shape[0]
    policy = np.zeros(n_states, dtype=np.int64)
    values = np.zeros(n_states, dtype=np.float64)
    total_sweeps = 0
    gap = np.inf

    for round_index in range(1, max_rounds + 1):
        if schedule.is_exact:
            values = evaluate_policy_exactly(kernel, reward, policy, gamma)
            total_sweeps += 1
        else:
            previous = values
            values = evaluate_policy_sweeps(
                kernel, reward, policy, values, gamma, schedule.sweeps or 1
            )
            total_sweeps += schedule.sweeps or 1
            gap = float(np.max(np.abs(values - previous)))

        improved = improve_policy(kernel, reward, values, gamma, tie_break, policy)
        stable = bool(np.array_equal(improved, policy))
        policy = improved

        if schedule.is_exact and stable:
            # Exact: the improvement theorem plus a finite policy set
            # means this is the answer, not an approximation to it.
            return SolveResult(
                policy=policy,
                values=values,
                rounds=round_index,
                total_sweeps=total_sweeps,
                final_gap=0.0,
                error_bound=0.0,
                exact=True,
                stopped_on=StoppingRule.POLICY_STABLE,
            )

        if schedule.is_exact:
            continue

        measured = {
            StoppingRule.SUP_NORM: gap,
            StoppingRule.SPAN: span(values) if round_index == 1 else gap,
            StoppingRule.POLICY_STABLE: 0.0 if stable else np.inf,
        }[stopping]

        if measured < tolerance:
            return SolveResult(
                policy=policy,
                values=values,
                rounds=round_index,
                total_sweeps=total_sweeps,
                final_gap=gap,
                error_bound=gamma * gap / (1.0 - gamma),
                exact=False,
                stopped_on=stopping,
            )

    raise NonTerminating(
        f"exceeded {max_rounds} rounds. With consistent tie-breaking policy iteration "
        "cannot fail to terminate, so the tie rule is what to examine first"
    )


class DialComparison(NamedTuple):
    sweeps_per_round: int | None
    rounds: int
    total_sweeps: int
    matches_reference: bool


def compare_schedules(
    kernel: FloatArray, reward: FloatArray, gamma: float, candidates: tuple[int | None, ...]
) -> list[DialComparison]:
    """Run the dial and report the cost of each setting.

    The point of measuring rather than asserting: the winner depends on
    gamma, and at a long horizon the ordering inverts. This is a few
    seconds of work that decides which solver to write, and it is
    usually skipped in favour of a default.
    """
    reference = solve(kernel, reward, gamma, EvaluationSchedule.policy_iteration())

    results = []
    for sweeps in candidates:
        result = solve(kernel, reward, gamma, EvaluationSchedule(sweeps=sweeps))
        results.append(
            DialComparison(
                sweeps_per_round=sweeps,
                rounds=result.rounds,
                total_sweeps=result.total_sweeps,
                matches_reference=bool(np.array_equal(result.policy, reference.policy)),
            )
        )
    return results
`,
        profile:
          'Identical asymptotics to the literal version — an O(|S|³) solve per exact round, an O(|S|·|A|·|S\'|) sweep otherwise — with the per-state Python loops replaced by array operations. Illustrative, not a measured benchmark: the substantive change is that tie-breaking, the stopping criterion and the evaluation dial are now stated parameters rather than implicit constants, so a result can say which of them produced it and whether the answer is exact or merely within tolerance.',
      },
      'make-it-fast': {
        rationale:
          'Three changes, in descending order of what they are worth. The kernel becomes sparse: a real MDP reaches a handful of successors per state-action pair, so a dense array is almost all zeros and both the sweep and the exact solve spend their time multiplying by them — flattening into one CSR block makes the cost the number of transitions that exist rather than the square of the state count, and it also moves the memory ceiling, which binds long before the arithmetic does. Then the evaluation solve is factored once per policy rather than re-solved: consecutive policies usually differ in a handful of states, so a sparse LU of (I - gamma P_pi) is reused across the sweeps that follow an improvement instead of being rebuilt, and the value function is warm-started from the previous round, which typically starts the evaluation most of the way to its answer. Then action elimination, which is free and rarely implemented: once the value function is bracketed by the contraction bound, an action whose optimistic value falls below another\'s pessimistic value can never be optimal, so it is dropped from every later improvement — on problems with many actions this removes most of the max. The remaining work fuses the reward add, the discounted expectation and the row-wise max into one pass over preallocated buffers so the state-by-action intermediate is never materialized, and the backup is written in place in Gauss-Seidel order, which propagates value across the state space within a single pass instead of one state per sweep.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Sweeps become one sparse matrix-vector product over all state-action pairs, and exact evaluation becomes one sparse factorization instead of a dense inverse',
            tradeoff: 'The CSR layout is immutable, so a re-estimated kernel means a rebuild rather than an edit — which is the normal case whenever the model is fitted on a schedule',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Reward add, discounted expectation and the row-wise max run in one pass, so the state-by-action array is never written on any sweep',
            tradeoff: 'The action values are discarded, and they are exactly what is wanted when asking why a state chose what it did or when eliminating actions',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Value, scratch and residual buffers are allocated once, so a solve running thousands of sweeps at a high discount allocates nothing',
            tradeoff: 'In-place Gauss-Seidel updates make the result depend on sweep order, so a run is no longer reproducible across a changed ordering even though the fixed point is the same',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Action elimination prunes actions that the contraction bound proves cannot be optimal, so later improvements range over a shrinking set',
            tradeoff: 'The bound is only tight once values are reasonably converged, so elimination does nothing early and the bookkeeping is pure overhead on small action sets',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Keeping the CSR data, the reward and the values all float64 and C-contiguous avoids a silent promotion that would copy the largest array in the system',
            tradeoff: 'float64 doubles the kernel\'s memory, which is the binding constraint precisely at the state counts where sparsity was the point',
          },
        ],
        code: `"""Dynamic programming for a kernel that is mostly zeros.

Three changes, in descending order of what they are worth:

  1. sparse transitions -- the memory ceiling binds long before the
     arithmetic does, and a dense kernel is almost all zeros;
  2. a factorization reused across a policy's evaluation, plus a warm
     start from the previous round;
  3. action elimination, which is free once the contraction bound is
     available and which most solvers never implement.

What none of this changes: the sweep count still comes from gamma. A
faster sweep does not shorten a long horizon, and at a discount near one
the right answer is still to switch algorithms rather than to optimize
the one you have.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from scipy import sparse
from scipy.sparse import linalg as sparse_linalg

FloatArray = npt.NDArray[np.float64]
IntArray = npt.NDArray[np.int64]


@dataclass
class SparseMdp:
    """Transitions as CSR over flattened (state, action) rows.

    Row s*A + a is that pair's successor distribution, so one sparse
    matvec covers every pair. Density is reported because it decides
    whether this layout is appropriate at all: above roughly ten percent
    non-zero the indirection costs more than it saves.
    """

    transitions: sparse.csr_matrix   # (S*A, S)
    reward: FloatArray               # (S*A,)
    n_states: int
    n_actions: int

    @classmethod
    def from_dense(cls, kernel: FloatArray, reward: FloatArray) -> SparseMdp:
        n_states, n_actions, _ = kernel.shape
        return cls(
            transitions=sparse.csr_matrix(
                kernel.reshape(n_states * n_actions, n_states), dtype=np.float64
            ),
            reward=np.ascontiguousarray(reward.reshape(-1), dtype=np.float64),
            n_states=n_states,
            n_actions=n_actions,
        )

    @property
    def density(self) -> float:
        return self.transitions.nnz / (self.transitions.shape[0] * self.n_states)

    def policy_rows(self, policy: IntArray) -> IntArray:
        """Flattened row indices for a policy, for slicing the CSR block."""
        return np.arange(self.n_states, dtype=np.int64) * self.n_actions + policy


class Workspace:
    """Buffers allocated once from the MDP's shape."""

    def __init__(self, mdp: SparseMdp) -> None:
        self.pairs = np.empty(mdp.n_states * mdp.n_actions, dtype=np.float64)
        self.values = np.zeros(mdp.n_states, dtype=np.float64)
        self.scratch = np.empty(mdp.n_states, dtype=np.float64)
        # Actions still possibly optimal. Shrinks as elimination fires.
        self.live = np.ones((mdp.n_states, mdp.n_actions), dtype=bool)


def fused_backup(mdp: SparseMdp, values: FloatArray, gamma: float, workspace: Workspace) -> FloatArray:
    """Sparse matvec, reward add, mask and row max in one pass.

    The (S*A) action-value array lands in preallocated scratch rather
    than being returned, so nothing is materialized per sweep. Eliminated
    actions are masked to negative infinity, which keeps the shape
    constant while removing them from the max.
    """
    np.multiply(mdp.transitions.dot(values), gamma, out=workspace.pairs)
    np.add(workspace.pairs, mdp.reward, out=workspace.pairs)

    shaped = workspace.pairs.reshape(mdp.n_states, mdp.n_actions)
    np.copyto(shaped, -np.inf, where=~workspace.live)
    np.max(shaped, axis=1, out=workspace.scratch)
    return workspace.scratch


class FactoredEvaluation:
    """A sparse LU of (I - gamma P_pi), reused while the policy holds.

    Policy iteration re-solves this every round, and consecutive
    policies usually differ in a handful of states -- but the sparsity
    pattern changes, so the factorization cannot be updated in place and
    is rebuilt per policy. What it CAN do is serve every solve while
    that policy is current, which matters for modified policy iteration
    and for evaluating several candidate value functions.

    The factorization is the expensive object here, so it is built once
    and held rather than reconstructed inside a loop that calls solve.
    """

    def __init__(self, mdp: SparseMdp, policy: IntArray, gamma: float) -> None:
        rows = mdp.policy_rows(policy)
        transition = mdp.transitions[rows]
        system = (sparse.eye(mdp.n_states, format="csc") - gamma * transition).tocsc()

        try:
            self._solve = sparse_linalg.factorized(system)
        except RuntimeError as error:
            raise ValueError(
                "(I - gamma P_pi) is singular; at gamma near 1 with a policy that never "
                "terminates the expectation equation has no solution"
            ) from error

        self.expected_reward = mdp.reward[rows]

    def values(self) -> FloatArray:
        return np.asarray(self._solve(self.expected_reward), dtype=np.float64)


def eliminate_actions(
    mdp: SparseMdp, values: FloatArray, gamma: float, gap: float, workspace: Workspace
) -> int:
    """Prune actions the contraction bound proves cannot be optimal.

    The bound says the true value lies within gamma*gap/(1-gamma) of the
    current estimate. So an action whose OPTIMISTIC value falls below
    another's PESSIMISTIC value is dominated for the rest of the solve,
    and can be dropped from every later improvement.

    Free in the sense that both quantities are already computed, and
    ineffective early: the bracket is wide until values are reasonably
    converged, so nothing is pruned for the first stretch and the
    bookkeeping is overhead. On problems with many actions it then
    removes most of the max at once.
    """
    if not np.isfinite(gap):
        return 0

    slack = gamma * gap / (1.0 - gamma)
    scored = (mdp.reward + gamma * mdp.transitions.dot(values)).reshape(
        mdp.n_states, mdp.n_actions
    )

    best_pessimistic = np.where(workspace.live, scored, -np.inf).max(axis=1) - slack
    dominated = (scored + slack) < best_pessimistic[:, None]

    removed = int(np.count_nonzero(dominated & workspace.live))
    workspace.live &= ~dominated
    return removed


def value_iteration(
    mdp: SparseMdp,
    gamma: float,
    tolerance: float = 1e-10,
    max_sweeps: int = 1_000_000,
    eliminate_every: int = 10,
) -> dict[str, object]:
    """Sweeps with elimination, into preallocated buffers.

    The sweep count is log(tolerance)/log(gamma) and nothing here moves
    it. What moves is the cost of each sweep: sparse rather than dense,
    fused rather than staged, and over a shrinking action set.
    """
    workspace = Workspace(mdp)
    gap = np.inf
    eliminated = 0

    for sweep in range(1, max_sweeps + 1):
        updated = fused_backup(mdp, workspace.values, gamma, workspace)
        gap = float(np.max(np.abs(updated - workspace.values)))
        workspace.values, workspace.scratch = updated.copy(), workspace.scratch

        if sweep % eliminate_every == 0:
            eliminated += eliminate_actions(mdp, workspace.values, gamma, gap, workspace)

        if gap < tolerance:
            break

    scored = (mdp.reward + gamma * mdp.transitions.dot(workspace.values)).reshape(
        mdp.n_states, mdp.n_actions
    )
    policy = np.argmax(np.where(workspace.live, scored, -np.inf), axis=1).astype(np.int64)

    return {
        "policy": policy,
        "values": workspace.values,
        "sweeps": sweep,
        "final_gap": gap,
        "error_bound": gamma * gap / (1.0 - gamma),
        "actions_eliminated": eliminated,
    }


def policy_iteration(
    mdp: SparseMdp, gamma: float, max_rounds: int = 1000
) -> dict[str, object]:
    """Exact evaluation by sparse factorization, then improve.

    The factorization is the round's whole cost, and it is why this
    algorithm wins at a long horizon: the round count barely responds to
    gamma while value iteration's sweep count scales as its logarithm.
    """
    policy = np.zeros(mdp.n_states, dtype=np.int64)

    for round_index in range(1, max_rounds + 1):
        values = FactoredEvaluation(mdp, policy, gamma).values()

        scored = (mdp.reward + gamma * mdp.transitions.dot(values)).reshape(
            mdp.n_states, mdp.n_actions
        )
        improved = np.argmax(scored, axis=1).astype(np.int64)

        if np.array_equal(improved, policy):
            return {
                "policy": policy,
                "values": values,
                "rounds": round_index,
                "exact": True,
            }
        policy = improved

    raise RuntimeError(
        "policy iteration did not terminate; with consistent tie-breaking this is "
        "impossible, so the tie rule is what to examine"
    )


def gauss_seidel_sweep(
    mdp: SparseMdp, values: FloatArray, gamma: float, order: IntArray
) -> float:
    """In-place backup reading its own updates within the pass.

    Jacobi computes every new value from the old array; this reads
    whatever is current, so information crosses the state space in one
    pass rather than one state per sweep. On goal-directed problems --
    where value propagates backwards from terminal states -- ordering by
    reverse reachability can reach a good policy in a small fraction of
    the passes.

    The cost is that the result now depends on the ordering. The fixed
    point does not change; the trajectory to it does, so two runs with
    different orders are no longer bitwise comparable.
    """
    indptr = mdp.transitions.indptr
    indices = mdp.transitions.indices
    data = mdp.transitions.data

    largest_change = 0.0
    for state in order:
        base = int(state) * mdp.n_actions
        best = -np.inf

        for action in range(mdp.n_actions):
            row = base + action
            expectation = float(
                np.dot(data[indptr[row] : indptr[row + 1]], values[indices[indptr[row] : indptr[row + 1]]])
            )
            candidate = mdp.reward[row] + gamma * expectation
            if candidate > best:
                best = candidate

        largest_change = max(largest_change, abs(best - values[state]))
        values[state] = best

    return largest_change


def choose_algorithm(gamma: float, n_states: int, tolerance: float = 1e-10) -> str:
    """Which end of the dial, from the two numbers that decide it.

    A rough comparison, not a benchmark: value iteration pays
    log(tolerance)/log(gamma) sweeps at roughly nnz each, policy
    iteration pays a handful of rounds at roughly a sparse
    factorization each. The point is that the answer depends on gamma
    and it flips -- which is worth knowing before a solver is written,
    not after it is profiled.
    """
    sweeps = np.log(tolerance) / np.log(gamma)
    # Empirically small and remarkably insensitive to gamma.
    rounds = 10.0
    factorization_penalty = np.sqrt(n_states)

    return "policy-iteration" if sweeps > rounds * factorization_penalty else "value-iteration"
`,
        profile:
          'A sparse sweep is O(nnz) against O(|S|²·|A|) dense, and a sparse factorization is far below the dense O(|S|³) for a kernel with few successors per pair. Sweep count stays log(tolerance)/log(gamma) and round count stays small, so the crossover moves with the discount. Illustrative, not a measured benchmark: check density first — above roughly ten percent non-zero the CSR indirection costs more than it saves — and check gamma second, since at a long horizon switching algorithms is worth more than every optimization in this file combined.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Value iteration and policy iteration, transcribed literally.
//
// No library. Both algorithms on the same tiny MDP, so the comparison
// is a measurement rather than a claim:
//
//     evaluate:  V^pi = R_pi + gamma P_pi V^pi     (linear, solvable)
//     improve:   pi'(s) = argmax_a [ R + gamma P V^pi ]
//
// Four things to read for.
//
// 1. PolicyIteration() and ValueIteration() reach the same answer by
//    opposite routes. Compare their counts -- then change gamma from
//    0.9 to 0.99 and compare again. The sweep count grows roughly
//    tenfold; the round count barely moves.
//
// 2. ModifiedPolicyIteration() is the dial they sit on. m = 1 is value
//    iteration, m large approaches policy iteration, and a small m is
//    usually better than either end.
//
// 3. SweepsUntilPolicyStable() measures what most solvers ignore: the
//    greedy policy settles long before the values converge.
//
// 4. CyclingDemo() shows why tie-breaking carries a proof. Policy
//    iteration's finite termination depends on it, and an arbitrary
//    rule can alternate forever between policies of identical value.

#include <cmath>
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

namespace dp {

using Kernel = std::vector<std::vector<std::vector<double>>>;  // P[s][a][s']
using Reward = std::vector<std::vector<double>>;               // R[s][a]

double ExpectedNextValue(const Kernel& kernel, const std::vector<double>& values,
                         std::size_t state, std::size_t action) {
  double total = 0.0;
  for (std::size_t next_state = 0; next_state < values.size(); ++next_state) {
    total += kernel[state][action][next_state] * values[next_state];
  }
  return total;
}

double ActionValue(const Kernel& kernel, const Reward& reward,
                   const std::vector<double>& values, std::size_t state, std::size_t action,
                   double gamma) {
  return reward[state][action] + gamma * ExpectedNextValue(kernel, values, state, action);
}

// m applications of T^pi, starting from whatever values are given.
//
// Warm-starting from the previous round rather than from zeros is not a
// micro-optimization: consecutive policies are similar, so their value
// functions are too, and evaluation usually starts most of the way to
// its answer.
std::vector<double> EvaluatePolicySweeps(const Kernel& kernel, const Reward& reward,
                                         const std::vector<std::size_t>& policy,
                                         std::vector<double> values, double gamma,
                                         std::size_t sweeps) {
  for (std::size_t sweep = 0; sweep < sweeps; ++sweep) {
    std::vector<double> updated(values.size(), 0.0);
    for (std::size_t state = 0; state < policy.size(); ++state) {
      updated[state] = ActionValue(kernel, reward, values, state, policy[state], gamma);
    }
    values = std::move(updated);
  }
  return values;
}

// Solve V^pi = R_pi + gamma P_pi V^pi, by Gaussian elimination.
//
// The max is gone, so the equation is linear and this is a solve rather
// than an iteration. That is the entire structural difference between
// the two algorithms: policy iteration pays O(|S|^3) here and buys back
// a round count that is startlingly small.
std::vector<double> EvaluatePolicyExactly(const Kernel& kernel, const Reward& reward,
                                          const std::vector<std::size_t>& policy,
                                          double gamma) {
  const std::size_t n_states = policy.size();
  std::vector<std::vector<double>> matrix(n_states, std::vector<double>(n_states + 1, 0.0));

  for (std::size_t state = 0; state < n_states; ++state) {
    const std::size_t action = policy[state];
    matrix[state][state] = 1.0;
    matrix[state][n_states] = reward[state][action];
    for (std::size_t next_state = 0; next_state < n_states; ++next_state) {
      matrix[state][next_state] -= gamma * kernel[state][action][next_state];
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
          "terminates the equation has no solution");
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

// Act greedily, breaking ties by lowest index.
//
// The tie-breaking is not a detail. Policy iteration terminates because
// each round produces a STRICTLY better policy from a finite set, and an
// argmax resolving ties arbitrarily can alternate forever between two
// policies of identical value -- an exact algorithm that never returns.
std::vector<std::size_t> ImprovePolicy(const Kernel& kernel, const Reward& reward,
                                       const std::vector<double>& values, double gamma) {
  std::vector<std::size_t> improved(reward.size(), 0);

  for (std::size_t state = 0; state < reward.size(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    std::size_t chosen = 0;
    for (std::size_t action = 0; action < reward[state].size(); ++action) {
      const double candidate = ActionValue(kernel, reward, values, state, action, gamma);
      // Strict greater-than, so ties resolve to the lowest index.
      if (candidate > best) {
        best = candidate;
        chosen = action;
      }
    }
    improved[state] = chosen;
  }
  return improved;
}

struct PolicyResult {
  std::vector<std::size_t> policy;
  std::vector<double> values;
  std::size_t rounds;
  bool exact;
};

// Evaluate exactly, improve, repeat until the policy stops changing.
//
// Termination here is EXACT and finite: the improvement theorem says
// each round is strictly better componentwise, and there are finitely
// many deterministic policies, so the loop cannot run forever and the
// answer is not an approximation.
PolicyResult PolicyIteration(const Kernel& kernel, const Reward& reward, double gamma,
                             std::size_t max_rounds = 1000) {
  std::vector<std::size_t> policy(reward.size(), 0);

  for (std::size_t round_index = 1; round_index <= max_rounds; ++round_index) {
    const std::vector<double> values = EvaluatePolicyExactly(kernel, reward, policy, gamma);
    const std::vector<std::size_t> improved = ImprovePolicy(kernel, reward, values, gamma);

    if (improved == policy) {
      return PolicyResult{policy, values, round_index, true};
    }
    policy = improved;
  }

  throw std::runtime_error(
      "policy iteration did not terminate; with consistent tie-breaking this is "
      "impossible, so the tie rule is what to examine");
}

struct ValueResult {
  std::vector<std::size_t> policy;
  std::vector<double> values;
  std::size_t sweeps;
  double final_gap;
  double error_bound;
};

// One backup then improve, repeated. Geometric, never exact.
//
// Read the sweep count against gamma: it is log(tolerance)/log(gamma)
// and nothing else, so the discount -- part of the problem statement --
// sets the runtime by a factor of a hundred between 0.9 and 0.999.
ValueResult ValueIteration(const Kernel& kernel, const Reward& reward, double gamma,
                           double tolerance = 1e-10, std::size_t max_sweeps = 1000000) {
  std::vector<double> values(reward.size(), 0.0);
  double gap = std::numeric_limits<double>::infinity();

  for (std::size_t sweep = 1; sweep <= max_sweeps; ++sweep) {
    std::vector<double> updated(values.size(), 0.0);
    for (std::size_t state = 0; state < reward.size(); ++state) {
      double best = -std::numeric_limits<double>::infinity();
      for (std::size_t action = 0; action < reward[state].size(); ++action) {
        best = std::max(best, ActionValue(kernel, reward, values, state, action, gamma));
      }
      updated[state] = best;
    }

    gap = 0.0;
    for (std::size_t state = 0; state < values.size(); ++state) {
      gap = std::max(gap, std::abs(updated[state] - values[state]));
    }
    values = std::move(updated);

    if (gap < tolerance) {
      return ValueResult{ImprovePolicy(kernel, reward, values, gamma), values, sweep, gap,
                         gamma * gap / (1.0 - gamma)};
    }
  }
  throw std::runtime_error("value iteration exceeded its sweep cap");
}

struct ModifiedResult {
  std::vector<std::size_t> policy;
  std::vector<double> values;
  std::size_t rounds;
  std::size_t total_sweeps;
};

// The dial the two algorithms sit on.
//
// evaluation_sweeps = 1 is value iteration; large values approach
// policy iteration. A small number -- three to twenty -- is usually
// better than either end, because solving the evaluation exactly is
// wasted effort early, when the policy is about to change anyway.
//
// Note the warm start: values carry across rounds rather than being
// reset, which is what makes a handful of sweeps enough.
ModifiedResult ModifiedPolicyIteration(const Kernel& kernel, const Reward& reward, double gamma,
                                       std::size_t evaluation_sweeps,
                                       std::size_t max_rounds = 10000) {
  if (evaluation_sweeps == 0) {
    throw std::invalid_argument("evaluation sweeps must be at least 1");
  }

  std::vector<std::size_t> policy(reward.size(), 0);
  std::vector<double> values(reward.size(), 0.0);

  for (std::size_t round_index = 1; round_index <= max_rounds; ++round_index) {
    values = EvaluatePolicySweeps(kernel, reward, policy, std::move(values), gamma,
                                  evaluation_sweeps);
    const std::vector<std::size_t> improved = ImprovePolicy(kernel, reward, values, gamma);

    if (improved == policy) {
      return ModifiedResult{policy, values, round_index, round_index * evaluation_sweeps};
    }
    policy = improved;
  }
  throw std::runtime_error("modified policy iteration exceeded its round cap");
}

struct StabilityReport {
  std::size_t sweeps_to_optimal_policy;
  std::size_t sweeps_to_value_tolerance;
  double wasted_fraction;
};

// When the POLICY settles, against when the values do.
//
// Usually a small fraction of the way in. Everything after the first
// number refines values that no longer change any decision -- which
// makes a value-tolerance stopping rule the wrong criterion for a
// solver that only needs a policy, and checking policy stability costs
// one comparison per sweep.
StabilityReport SweepsUntilPolicyStable(const Kernel& kernel, const Reward& reward, double gamma,
                                        double tolerance = 1e-10) {
  const std::vector<std::size_t> optimal =
      ValueIteration(kernel, reward, gamma, tolerance).policy;

  std::vector<double> values(reward.size(), 0.0);
  std::size_t stable_at = 0;

  for (std::size_t sweep = 1; sweep <= 1000000; ++sweep) {
    std::vector<double> updated(values.size(), 0.0);
    for (std::size_t state = 0; state < reward.size(); ++state) {
      double best = -std::numeric_limits<double>::infinity();
      for (std::size_t action = 0; action < reward[state].size(); ++action) {
        best = std::max(best, ActionValue(kernel, reward, values, state, action, gamma));
      }
      updated[state] = best;
    }

    double gap = 0.0;
    for (std::size_t state = 0; state < values.size(); ++state) {
      gap = std::max(gap, std::abs(updated[state] - values[state]));
    }
    values = std::move(updated);

    if (stable_at == 0 && ImprovePolicy(kernel, reward, values, gamma) == optimal) {
      stable_at = sweep;
    }
    if (gap < tolerance) {
      return StabilityReport{stable_at, sweep,
                             1.0 - static_cast<double>(stable_at) / static_cast<double>(sweep)};
    }
  }
  throw std::runtime_error("value iteration exceeded its sweep cap");
}

// max(v) - min(v): the sharper stopping criterion.
//
// Adding a constant to every state changes no greedy decision, so a
// residual that is uniform across states carries no information about
// the policy -- and the sup-norm criterion counts it as error anyway.
// Stopping on span routinely halves the sweep count when only the
// policy is wanted.
double SpanSeminorm(const std::vector<double>& values) {
  double smallest = std::numeric_limits<double>::infinity();
  double largest = -std::numeric_limits<double>::infinity();
  for (double value : values) {
    smallest = std::min(smallest, value);
    largest = std::max(largest, value);
  }
  return largest - smallest;
}

}  // namespace dp
`,
        profile:
          'A value-iteration sweep is O(|S|·|A|·|S\'|) and needs log(tolerance)/log(gamma) of them; a policy-iteration round is one O(|S|³) elimination plus one improvement, and needs remarkably few rounds. Illustrative, not a measured benchmark: the comparison worth running is the same MDP at gamma 0.9 and 0.99 — the sweep count grows roughly tenfold and the round count barely moves, which is the argument for checking the discount before choosing the algorithm.',
      },
      'make-it-right': {
        rationale:
          'The three decisions the literal version made implicitly become named objects, because each of them carries consequences the code otherwise hides. Tie-breaking becomes an explicit enum, since policy iteration\'s finite-termination proof rests on it and an unspecified argmax can alternate forever between policies of identical value — an exact algorithm that hangs. The stopping criterion becomes an enum too, because "the values converged", "the policy stopped changing" and "the span fell below tolerance" are three different questions and the literal version answered only the first while readers assumed the second. The evaluation dial becomes a small value type with both ends named, so a solver reports which algorithm it actually ran rather than leaving it to be inferred from a loop bound. Preconditions are checked before anything is allocated: a discount outside its valid range, an evaluation-sweep count of zero, and shapes that disagree between the kernel, the reward and the policy. The result type carries the round count, the sweep count, the final gap and — crucially — whether the answer is exact, since policy iteration terminating and value iteration stopping within tolerance are different claims that a bare vector cannot distinguish. Non-owning spans are used wherever data is only read, the special members are left to the compiler, and the solver holds no resource it does not own.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'No raw new/delete; std::vector and smart pointers instead',
        ],
        code: `// Dynamic programming with the decisions made explicit.
//
// Three things the literal version left implicit, each a decision with
// consequences:
//
//   * tie-breaking, which policy iteration's finite-termination proof
//     depends on and which an unspecified argmax resolves arbitrarily;
//   * the stopping criterion, where "values converged", "policy stopped
//     changing" and "span below tolerance" are different questions;
//   * the evaluation dial, where 1 is value iteration, exact is policy
//     iteration, and the discount decides which is cheaper.
//
// Each becomes a named type here rather than a literal in a loop.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <optional>
#include <span>
#include <stdexcept>
#include <vector>

namespace dp {

class DynamicProgrammingError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

// Not a numerical difficulty to work around: at a discount near one
// with a policy that never terminates, the expectation equation has no
// solution and the model is what needs fixing.
class SingularEvaluation : public DynamicProgrammingError {
 public:
  using DynamicProgrammingError::DynamicProgrammingError;
};

// With consistent tie-breaking this cannot happen -- each round is
// strictly better and the policy set is finite -- so the message points
// where the bug actually is.
class NonTerminating : public DynamicProgrammingError {
 public:
  using DynamicProgrammingError::DynamicProgrammingError;
};

class InvalidSchedule : public DynamicProgrammingError {
 public:
  using DynamicProgrammingError::DynamicProgrammingError;
};

// How the improvement step resolves equal action values.
//
// This carries a proof. Policy iteration terminates because each round
// produces a strictly better policy from a finite set; a rule that can
// alternate between two policies of identical value breaks the
// argument, and the symptom is a solver that never returns.
enum class TieBreak { kLowestIndex, kPreferIncumbent };

// What "converged" means, stated rather than assumed.
//
// kSpan is the sharp one when only the policy is wanted: a constant
// added to every state changes no greedy decision, so a uniform
// residual carries no information about the policy and the sup-norm
// criterion counts it as error anyway.
enum class StoppingRule { kSupNorm, kSpan, kPolicyStable };

// How much evaluation before improving again. One dial, both
// algorithms.
class EvaluationSchedule {
 public:
  static EvaluationSchedule ValueIteration() { return EvaluationSchedule(1); }
  static EvaluationSchedule PolicyIteration() { return EvaluationSchedule(std::nullopt); }

  static EvaluationSchedule Sweeps(std::size_t count) {
    if (count == 0) {
      throw InvalidSchedule("evaluation sweeps must be at least 1, or exact");
    }
    return EvaluationSchedule(count);
  }

  bool is_exact() const noexcept { return !sweeps_.has_value(); }
  std::size_t sweeps() const noexcept { return sweeps_.value_or(1); }

 private:
  explicit EvaluationSchedule(std::optional<std::size_t> sweeps) : sweeps_(sweeps) {}
  std::optional<std::size_t> sweeps_;
};

// The MDP, flat and validated once.
//
// One row-major vector rather than nested vectors: a locality decision
// and a correctness one at the same time, since a ragged structure can
// have rows of different lengths and nothing would say so.
class Problem {
 public:
  Problem(std::size_t n_states, std::size_t n_actions, std::vector<double> kernel,
          std::vector<double> reward, double gamma)
      : n_states_(n_states),
        n_actions_(n_actions),
        kernel_(std::move(kernel)),
        reward_(std::move(reward)),
        gamma_(gamma) {
    // Every check is arithmetic on values already in hand, so it runs
    // before the solver allocates anything.
    if (!(gamma_ >= 0.0) || gamma_ >= 1.0) {
      throw DynamicProgrammingError(
          "gamma must lie in [0, 1); at exactly 1 the operators are not contractions "
          "and the guarantees do not hold");
    }
    if (n_states_ == 0 || n_actions_ == 0) {
      throw DynamicProgrammingError("an MDP needs at least one state and one action");
    }
    if (kernel_.size() != n_states_ * n_actions_ * n_states_ ||
        reward_.size() != n_states_ * n_actions_) {
      throw DynamicProgrammingError("kernel or reward does not match the stated shape");
    }
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }
  double gamma() const noexcept { return gamma_; }

  std::span<const double> Successors(std::size_t state, std::size_t action) const noexcept {
    const std::size_t base = (state * n_actions_ + action) * n_states_;
    return std::span<const double>(kernel_).subspan(base, n_states_);
  }

  double RewardAt(std::size_t state, std::size_t action) const noexcept {
    return reward_[state * n_actions_ + action];
  }

  double ActionValue(std::size_t state, std::size_t action,
                     std::span<const double> values) const noexcept {
    const std::span<const double> successors = Successors(state, action);
    double expectation = 0.0;
    for (std::size_t next_state = 0; next_state < values.size(); ++next_state) {
      expectation += successors[next_state] * values[next_state];
    }
    return RewardAt(state, action) + gamma_ * expectation;
  }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  std::vector<double> kernel_;
  std::vector<double> reward_;
  double gamma_;
};

// The answer, with what kind of answer it is.
//
// \`exact\` separates "policy iteration terminated" from "value iteration
// stopped within tolerance" -- different claims that a bare vector
// cannot distinguish, and readers assume the stronger one.
struct SolveResult {
  std::vector<std::size_t> policy;
  std::vector<double> values;
  std::size_t rounds{};
  std::size_t total_sweeps{};
  double final_gap{};
  double error_bound{};
  bool exact{};
  StoppingRule stopped_on{};
};

std::vector<std::size_t> ImprovePolicy(const Problem& problem, std::span<const double> values,
                                       TieBreak tie_break,
                                       std::span<const std::size_t> incumbent) {
  std::vector<std::size_t> improved(problem.n_states(), 0);

  for (std::size_t state = 0; state < problem.n_states(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    std::size_t chosen = 0;

    for (std::size_t action = 0; action < problem.n_actions(); ++action) {
      const double candidate = problem.ActionValue(state, action, values);
      if (candidate > best) {
        best = candidate;
        chosen = action;
      }
    }

    // Keeping the incumbent when it is within noise of the best both
    // breaks ties consistently and stops a policy churning between
    // numerically indistinguishable actions -- a real problem when the
    // kernel is estimated and two actions are genuinely equivalent.
    if (tie_break == TieBreak::kPreferIncumbent && !incumbent.empty()) {
      const double current = problem.ActionValue(state, incumbent[state], values);
      if (current >= best - 1e-12) {
        chosen = incumbent[state];
      }
    }
    improved[state] = chosen;
  }
  return improved;
}

std::vector<double> EvaluatePolicyExactly(const Problem& problem,
                                          std::span<const std::size_t> policy) {
  const std::size_t n_states = problem.n_states();
  const std::size_t stride = n_states + 1;
  std::vector<double> matrix(n_states * stride, 0.0);

  for (std::size_t state = 0; state < n_states; ++state) {
    matrix[state * stride + state] = 1.0;
    matrix[state * stride + n_states] = problem.RewardAt(state, policy[state]);

    const std::span<const double> successors = problem.Successors(state, policy[state]);
    for (std::size_t next_state = 0; next_state < n_states; ++next_state) {
      matrix[state * stride + next_state] -= problem.gamma() * successors[next_state];
    }
  }

  for (std::size_t column = 0; column < n_states; ++column) {
    std::size_t pivot = column;
    for (std::size_t row = column + 1; row < n_states; ++row) {
      if (std::abs(matrix[row * stride + column]) >
          std::abs(matrix[pivot * stride + column])) {
        pivot = row;
      }
    }
    if (std::abs(matrix[pivot * stride + column]) < 1e-12) {
      throw SingularEvaluation(
          "(I - gamma P_pi) is singular; at gamma near 1 with a policy that never "
          "terminates the expectation equation has no solution");
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

// m applications of T^pi, warm-started from the given values.
//
// The warm start is what makes a handful of sweeps enough: consecutive
// policies are similar, so their value functions are too.
std::vector<double> EvaluatePolicySweeps(const Problem& problem,
                                         std::span<const std::size_t> policy,
                                         std::vector<double> values, std::size_t sweeps) {
  std::vector<double> scratch(values.size(), 0.0);

  for (std::size_t sweep = 0; sweep < sweeps; ++sweep) {
    for (std::size_t state = 0; state < policy.size(); ++state) {
      scratch[state] = problem.ActionValue(state, policy[state], values);
    }
    values.swap(scratch);
  }
  return values;
}

double SpanSeminorm(std::span<const double> values) {
  const auto [smallest, largest] = std::minmax_element(values.begin(), values.end());
  return *largest - *smallest;
}

// One solver, with the dial as a parameter.
//
// Both algorithms are this function with a different schedule, which is
// the honest way to present them: they are not alternatives so much as
// two settings of one knob.
SolveResult Solve(const Problem& problem, EvaluationSchedule schedule,
                  double tolerance = 1e-10, StoppingRule stopping = StoppingRule::kSupNorm,
                  TieBreak tie_break = TieBreak::kLowestIndex,
                  std::size_t max_rounds = 100000) {
  if (!(tolerance > 0.0)) {
    throw std::invalid_argument("tolerance must be positive");
  }

  std::vector<std::size_t> policy(problem.n_states(), 0);
  std::vector<double> values(problem.n_states(), 0.0);
  std::size_t total_sweeps = 0;
  double gap = std::numeric_limits<double>::infinity();

  for (std::size_t round_index = 1; round_index <= max_rounds; ++round_index) {
    if (schedule.is_exact()) {
      values = EvaluatePolicyExactly(problem, policy);
      ++total_sweeps;
    } else {
      const std::vector<double> previous = values;
      values = EvaluatePolicySweeps(problem, policy, std::move(values), schedule.sweeps());
      total_sweeps += schedule.sweeps();

      gap = 0.0;
      for (std::size_t state = 0; state < values.size(); ++state) {
        gap = std::max(gap, std::abs(values[state] - previous[state]));
      }
    }

    const std::vector<std::size_t> improved =
        ImprovePolicy(problem, values, tie_break, policy);
    const bool stable = improved == policy;
    policy = improved;

    if (schedule.is_exact()) {
      if (stable) {
        return SolveResult{policy, values,      round_index, total_sweeps, 0.0, 0.0, true,
                           StoppingRule::kPolicyStable};
      }
      continue;
    }

    const double measured = stopping == StoppingRule::kSupNorm  ? gap
                            : stopping == StoppingRule::kSpan   ? SpanSeminorm(values)
                                                                : (stable ? 0.0 : gap);
    if (measured < tolerance) {
      return SolveResult{policy,
                         values,
                         round_index,
                         total_sweeps,
                         gap,
                         problem.gamma() * gap / (1.0 - problem.gamma()),
                         false,
                         stopping};
    }
  }

  throw NonTerminating(
      "exceeded the round cap. With consistent tie-breaking policy iteration cannot "
      "fail to terminate, so the tie rule is what to examine first");
}

}  // namespace dp
`,
        profile:
          'Identical asymptotics to the literal version — an O(|S|³) elimination per exact round, an O(|S|·|A|·|S\'|) sweep otherwise — with the kernel in one flat row-major vector and successor rows handed out as non-owning spans. Illustrative, not a measured benchmark: the substantive change is that tie-breaking, the stopping criterion and the evaluation dial are stated parameters rather than implicit constants, so a result can report which of them produced it and whether the answer is exact or merely within tolerance.',
      },
      'make-it-fast': {
        rationale:
          'Three changes, in descending order of what they are worth. The kernel becomes CSR over flattened state-action pairs: a real MDP reaches a handful of successors per pair, so a dense layout is almost all zeros and both the sweep and the evaluation spend their time multiplying by them — and the memory ceiling binds long before the arithmetic does, so this moves the size of problem that fits at all rather than merely the speed. Then the backup is fused and in place: the sparse dot, the reward add and the row-wise max run as one pass writing directly into the value vector in Gauss-Seidel order, so the state-by-action intermediate is never materialized and information propagates across the state space within a single pass instead of one state per sweep. Then action elimination, which is free once the contraction bound exists and which almost no solver implements: an action whose optimistic value falls below another\'s pessimistic value can never be optimal, so it is struck from every later improvement, and on problems with many actions that removes most of the max. The inner sparse dot carries restrict on its pointers because the compiler must otherwise assume the value vector and the output may alias and will emit a scalar loop; the Jacobi variant is kept alongside precisely so there is a version whose states are independent and can be given to OpenMP, with the honest note that it needs more sweeps than the serial in-place one and can therefore lose overall.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Transitions live in one CSR block over flattened state-action pairs, so a sweep streams the non-zeros instead of indexing a three-level structure',
            tradeoff: 'The sparsity pattern is baked into the indices, so a re-estimated kernel means a rebuild — which is the normal case when the model is fitted on a schedule',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Sparse dot, reward add and the per-state max run in one pass writing straight into the value vector, so nothing is allocated per sweep',
            tradeoff: 'In-place updates make the result depend on sweep order, so two runs with different orderings are no longer bitwise comparable even though the fixed point is identical',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The inner sparse dot is a gather-multiply-accumulate that vectorizes only once the value vector and the output are known not to overlap',
            tradeoff: 'The guarantee is unchecked: overlapping buffers compile cleanly and corrupt the sweep at run time with nothing to catch it',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The Jacobi variant leaves states independent within a sweep, so the per-state maxima fan across cores with nothing to synchronize',
            tradeoff: 'It forces Jacobi over in-place Gauss-Seidel, which needs more sweeps, so the parallel version can lose overall where in-sweep propagation was doing the work',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The inner loop is a contiguous gather and accumulate, which the vectorizer handles well once aliasing is ruled out',
            tradeoff: 'The binary stops being portable across machine generations, and floating-point contraction can change the last digits of a value function between build targets',
          },
        ],
        code: `// Dynamic programming for a kernel that is mostly zeros.
//
// Three changes, in descending order of what they are worth:
//
//   1. sparse transitions -- the memory ceiling binds long before the
//      arithmetic does, and a dense kernel is almost all zeros;
//   2. a fused in-place backup in Gauss-Seidel order, so information
//      crosses the state space within one pass;
//   3. action elimination, free once the contraction bound exists and
//      almost never implemented.
//
// What none of this changes: the sweep count still comes from gamma. At
// a discount near one the right answer is still to switch algorithms
// rather than to optimize the one you have.
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

namespace dp {

// Transitions as CSR over flattened (state, action) rows.
//
// Row s*A + a is that pair's successor distribution. Density is
// reported because it decides whether this layout is appropriate at
// all: above roughly ten percent non-zero the indirection costs more
// than it saves and the dense backup was correct.
class SparseProblem {
 public:
  SparseProblem(std::size_t n_states, std::size_t n_actions, std::vector<std::int64_t> row_start,
                std::vector<std::int32_t> column, std::vector<double> transition,
                std::vector<double> reward, double gamma)
      : n_states_(n_states),
        n_actions_(n_actions),
        row_start_(std::move(row_start)),
        column_(std::move(column)),
        transition_(std::move(transition)),
        reward_(std::move(reward)),
        gamma_(gamma),
        live_(n_states * n_actions, 1) {
    if (row_start_.size() != n_states_ * n_actions_ + 1) {
      throw std::invalid_argument("CSR row pointer does not match (S * A) + 1");
    }
    if (column_.size() != transition_.size()) {
      throw std::invalid_argument("CSR indices and values differ in length");
    }
    if (!(gamma_ >= 0.0) || gamma_ >= 1.0) {
      throw std::invalid_argument("gamma must lie in [0, 1)");
    }
  }

  std::size_t n_states() const noexcept { return n_states_; }
  std::size_t n_actions() const noexcept { return n_actions_; }
  double gamma() const noexcept { return gamma_; }

  double Density() const noexcept {
    return static_cast<double>(transition_.size()) /
           static_cast<double>(n_states_ * n_actions_ * n_states_);
  }

  const std::int64_t* row_start() const noexcept { return row_start_.data(); }
  const std::int32_t* column() const noexcept { return column_.data(); }
  const double* transition() const noexcept { return transition_.data(); }
  const double* reward() const noexcept { return reward_.data(); }
  char* live() noexcept { return live_.data(); }
  const char* live() const noexcept { return live_.data(); }

 private:
  std::size_t n_states_;
  std::size_t n_actions_;
  std::vector<std::int64_t> row_start_;
  std::vector<std::int32_t> column_;
  std::vector<double> transition_;
  std::vector<double> reward_;
  double gamma_;
  std::vector<char> live_;
};

// One CSR row dotted with the value vector.
//
// restrict on every pointer is what makes this vectorize: the compiler
// must otherwise assume the value vector and the caller's output may
// overlap and emits a scalar loop. The guarantee is unchecked, so
// overlapping buffers corrupt the sweep silently.
inline double SparseRowDot(const std::int32_t* __restrict__ column,
                           const double* __restrict__ transition,
                           const double* __restrict__ values, std::int64_t begin,
                           std::int64_t end) noexcept {
  double total = 0.0;
  for (std::int64_t position = begin; position < end; ++position) {
    total += transition[position] * values[static_cast<std::size_t>(column[position])];
  }
  return total;
}

// In-place backup reading its own updates within the pass.
//
// Jacobi computes every new value from the old array; this reads
// whatever is current, so information crosses the state space in one
// pass rather than one state per sweep. On goal-directed problems,
// ordering by reverse reachability reaches a good policy in a small
// fraction of the passes a uniform sweep needs.
//
// The cost is that the result depends on the ordering. The fixed point
// does not change; the trajectory to it does.
double GaussSeidelSweep(const SparseProblem& problem, std::span<double> values,
                        std::span<const std::int32_t> order) noexcept {
  const std::int64_t* row_start = problem.row_start();
  const std::int32_t* column = problem.column();
  const double* transition = problem.transition();
  const double* reward = problem.reward();
  const char* live = problem.live();
  const std::size_t n_actions = problem.n_actions();
  const double gamma = problem.gamma();

  double largest_change = 0.0;
  for (std::int32_t index : order) {
    const std::size_t state = static_cast<std::size_t>(index);
    double best = -std::numeric_limits<double>::infinity();

    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      if (live[pair] == 0) {
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

// Jacobi variant: every state from the same input values.
//
// Kept alongside the in-place version precisely because its states are
// independent, which is what licenses the parallel loop. It needs more
// sweeps than Gauss-Seidel, so whether the parallelism wins depends on
// the core count against that gap -- a measurement, not a preference.
double JacobiSweep(const SparseProblem& problem, std::span<const double> values,
                   std::span<double> scratch) noexcept {
  const std::int64_t* row_start = problem.row_start();
  const std::int32_t* column = problem.column();
  const double* transition = problem.transition();
  const double* reward = problem.reward();
  const char* live = problem.live();
  const std::size_t n_actions = problem.n_actions();
  const double gamma = problem.gamma();
  const double* __restrict__ current = values.data();
  double* __restrict__ next = scratch.data();

#pragma omp parallel for schedule(static)
  for (std::size_t state = 0; state < values.size(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      if (live[pair] == 0) {
        continue;
      }
      best = std::max(best, reward[pair] + gamma * SparseRowDot(column, transition, current,
                                                                row_start[pair],
                                                                row_start[pair + 1]));
    }
    next[state] = best;
  }

  double gap = 0.0;
  for (std::size_t state = 0; state < values.size(); ++state) {
    gap = std::max(gap, std::abs(next[state] - current[state]));
  }
  return gap;
}

// Prune actions the contraction bound proves cannot be optimal.
//
// The bound says the truth lies within gamma*gap/(1-gamma) of the
// current estimate. So an action whose OPTIMISTIC value falls below
// another's PESSIMISTIC value is dominated for the rest of the solve
// and can be struck from every later improvement.
//
// Free in the sense that both quantities are already computed, and
// ineffective early: the bracket is wide until values are reasonably
// converged, so nothing is pruned at first and the bookkeeping is
// overhead. On many-action problems it then removes most of the max.
std::size_t EliminateActions(SparseProblem& problem, std::span<const double> values,
                             double gap) noexcept {
  if (!std::isfinite(gap)) {
    return 0;
  }

  const double slack = problem.gamma() * gap / (1.0 - problem.gamma());
  const std::int64_t* row_start = problem.row_start();
  const std::int32_t* column = problem.column();
  const double* transition = problem.transition();
  const double* reward = problem.reward();
  char* live = problem.live();
  const std::size_t n_actions = problem.n_actions();

  std::size_t removed = 0;
  std::vector<double> scored(n_actions, 0.0);

  for (std::size_t state = 0; state < values.size(); ++state) {
    double best = -std::numeric_limits<double>::infinity();

    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      scored[action] = live[pair] == 0
                           ? -std::numeric_limits<double>::infinity()
                           : reward[pair] + problem.gamma() *
                                                SparseRowDot(column, transition, values.data(),
                                                             row_start[pair],
                                                             row_start[pair + 1]);
      best = std::max(best, scored[action]);
    }

    const double pessimistic_best = best - slack;
    for (std::size_t action = 0; action < n_actions; ++action) {
      const std::size_t pair = state * n_actions + action;
      if (live[pair] != 0 && scored[action] + slack < pessimistic_best) {
        live[pair] = 0;
        ++removed;
      }
    }
  }
  return removed;
}

struct SolveResult {
  std::vector<double> values;
  std::vector<std::int32_t> policy;
  std::size_t sweeps{};
  double final_gap{};
  double error_bound{};
  std::size_t actions_eliminated{};
};

SolveResult ValueIterationSparse(SparseProblem& problem, double tolerance = 1e-10,
                                 std::size_t max_sweeps = 1000000,
                                 std::size_t eliminate_every = 10) {
  std::vector<double> values(problem.n_states(), 0.0);
  std::vector<std::int32_t> order(problem.n_states());
  for (std::size_t state = 0; state < order.size(); ++state) {
    order[state] = static_cast<std::int32_t>(state);
  }

  double gap = std::numeric_limits<double>::infinity();
  std::size_t eliminated = 0;
  std::size_t sweep = 0;

  for (sweep = 1; sweep <= max_sweeps; ++sweep) {
    gap = GaussSeidelSweep(problem, values, order);

    if (sweep % eliminate_every == 0) {
      eliminated += EliminateActions(problem, values, gap);
    }
    if (gap < tolerance) {
      break;
    }
  }

  std::vector<std::int32_t> policy(problem.n_states(), 0);
  const std::int64_t* row_start = problem.row_start();
  for (std::size_t state = 0; state < problem.n_states(); ++state) {
    double best = -std::numeric_limits<double>::infinity();
    for (std::size_t action = 0; action < problem.n_actions(); ++action) {
      const std::size_t pair = state * problem.n_actions() + action;
      if (problem.live()[pair] == 0) {
        continue;
      }
      const double candidate =
          problem.reward()[pair] +
          problem.gamma() * SparseRowDot(problem.column(), problem.transition(), values.data(),
                                         row_start[pair], row_start[pair + 1]);
      if (candidate > best) {
        best = candidate;
        policy[state] = static_cast<std::int32_t>(action);
      }
    }
  }

  return SolveResult{std::move(values), std::move(policy), sweep, gap,
                     problem.gamma() * gap / (1.0 - problem.gamma()), eliminated};
}

// Which end of the dial, from the two numbers that decide it.
//
// A rough comparison, not a benchmark: value iteration pays
// log(tolerance)/log(gamma) sweeps at roughly nnz each, policy
// iteration a handful of rounds at roughly a sparse factorization each.
// The point is that the answer depends on gamma and that it flips --
// worth knowing before a solver is written, not after it is profiled.
const char* ChooseAlgorithm(double gamma, std::size_t n_states, double tolerance = 1e-10) {
  const double sweeps = std::log(tolerance) / std::log(gamma);
  const double rounds = 10.0;  // empirically small, and insensitive to gamma
  return sweeps > rounds * std::sqrt(static_cast<double>(n_states)) ? "policy-iteration"
                                                                   : "value-iteration";
}

}  // namespace dp
`,
        profile:
          'A sparse sweep is O(nnz) against O(|S|²·|A|) dense, and elimination shrinks the per-state action loop as the bound tightens. Sweep count stays log(tolerance)/log(gamma), unchanged by anything here. Illustrative, not a measured benchmark: check density first — above roughly ten percent non-zero the CSR indirection costs more than it saves — and check gamma second, since at a long horizon switching to policy iteration is worth more than every optimization in this file combined.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Value iteration and policy iteration, transcribed literally.
//!
//! No library. Both algorithms on the same tiny MDP, so the comparison
//! is a measurement rather than a claim:
//!
//!     evaluate:  V^pi = R_pi + gamma P_pi V^pi     (linear, solvable)
//!     improve:   pi'(s) = argmax_a [ R + gamma P V^pi ]
//!
//! Four things to read for.
//!
//! 1. \`policy_iteration\` and \`value_iteration\` reach the same answer by
//!    opposite routes. Compare their counts -- then change gamma from
//!    0.9 to 0.99 and compare again. The sweep count grows roughly
//!    tenfold; the round count barely moves.
//!
//! 2. \`modified_policy_iteration\` is the dial they sit on. m = 1 is
//!    value iteration, large m approaches policy iteration, and a small
//!    m is usually better than either end.
//!
//! 3. \`sweeps_until_policy_stable\` measures what most solvers ignore:
//!    the greedy policy settles long before the values converge.
//!
//! 4. \`cycling_demo\` shows why tie-breaking carries a proof. Policy
//!    iteration's finite termination depends on it, and an arbitrary
//!    rule can alternate forever between policies of identical value.

/// P[state][action][next_state]
pub type Kernel = Vec<Vec<Vec<f64>>>;
/// R[state][action]
pub type Reward = Vec<Vec<f64>>;

#[must_use]
pub fn expected_next_value(kernel: &Kernel, values: &[f64], state: usize, action: usize) -> f64 {
    kernel[state][action]
        .iter()
        .zip(values)
        .map(|(probability, value)| probability * value)
        .sum()
}

#[must_use]
pub fn action_value(
    kernel: &Kernel,
    reward: &Reward,
    values: &[f64],
    state: usize,
    action: usize,
    gamma: f64,
) -> f64 {
    reward[state][action] + gamma * expected_next_value(kernel, values, state, action)
}

/// m applications of T^pi, starting from whatever values are given.
///
/// Warm-starting from the previous round rather than from zeros is not
/// a micro-optimization: consecutive policies are similar, so their
/// value functions are too, and evaluation usually starts most of the
/// way to its answer.
#[must_use]
pub fn evaluate_policy_sweeps(
    kernel: &Kernel,
    reward: &Reward,
    policy: &[usize],
    values: &[f64],
    gamma: f64,
    sweeps: usize,
) -> Vec<f64> {
    let mut current = values.to_vec();
    for _ in 0..sweeps {
        current = (0..policy.len())
            .map(|state| action_value(kernel, reward, &current, state, policy[state], gamma))
            .collect();
    }
    current
}

/// Solve V^pi = R_pi + gamma P_pi V^pi, by Gaussian elimination.
///
/// The max is gone, so the equation is linear and this is a solve
/// rather than an iteration. That is the entire structural difference
/// between the two algorithms: policy iteration pays O(|S|^3) here and
/// buys back a round count that is startlingly small.
pub fn evaluate_policy_exactly(
    kernel: &Kernel,
    reward: &Reward,
    policy: &[usize],
    gamma: f64,
) -> Result<Vec<f64>, String> {
    let n_states = policy.len();
    let mut matrix = vec![vec![0.0_f64; n_states + 1]; n_states];

    for state in 0..n_states {
        let action = policy[state];
        matrix[state][state] = 1.0;
        matrix[state][n_states] = reward[state][action];
        for next_state in 0..n_states {
            matrix[state][next_state] -= gamma * kernel[state][action][next_state];
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
                 policy that never terminates the equation has no solution"
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

/// Act greedily, breaking ties by lowest index.
///
/// The tie-breaking is not a detail. Policy iteration terminates
/// because each round produces a STRICTLY better policy from a finite
/// set, and an argmax resolving ties arbitrarily can alternate forever
/// between two policies of identical value -- an exact algorithm that
/// never returns.
#[must_use]
pub fn improve_policy(kernel: &Kernel, reward: &Reward, values: &[f64], gamma: f64) -> Vec<usize> {
    (0..reward.len())
        .map(|state| {
            let mut best = f64::NEG_INFINITY;
            let mut chosen = 0_usize;
            for action in 0..reward[state].len() {
                let candidate = action_value(kernel, reward, values, state, action, gamma);
                // Strict greater-than, so ties go to the lowest index.
                if candidate > best {
                    best = candidate;
                    chosen = action;
                }
            }
            chosen
        })
        .collect()
}

pub struct PolicyResult {
    pub policy: Vec<usize>,
    pub values: Vec<f64>,
    pub rounds: usize,
    pub exact: bool,
}

/// Evaluate exactly, improve, repeat until the policy stops changing.
///
/// Termination here is EXACT and finite: the improvement theorem says
/// each round is strictly better componentwise, and there are finitely
/// many deterministic policies, so the loop cannot run forever and the
/// answer is not an approximation.
pub fn policy_iteration(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    max_rounds: usize,
) -> Result<PolicyResult, String> {
    let mut policy = vec![0_usize; reward.len()];

    for round_index in 1..=max_rounds {
        let values = evaluate_policy_exactly(kernel, reward, &policy, gamma)?;
        let improved = improve_policy(kernel, reward, &values, gamma);

        if improved == policy {
            return Ok(PolicyResult {
                policy,
                values,
                rounds: round_index,
                exact: true,
            });
        }
        policy = improved;
    }

    Err("policy iteration did not terminate; with consistent tie-breaking this is \\
         impossible, so the tie rule is what to examine"
        .to_owned())
}

pub struct ValueResult {
    pub policy: Vec<usize>,
    pub values: Vec<f64>,
    pub sweeps: usize,
    pub final_gap: f64,
    pub error_bound: f64,
}

/// One backup then improve, repeated. Geometric, never exact.
///
/// Read the sweep count against gamma: it is log(tolerance)/log(gamma)
/// and nothing else, so the discount -- part of the problem statement --
/// sets the runtime by a factor of a hundred between 0.9 and 0.999.
pub fn value_iteration(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    tolerance: f64,
    max_sweeps: usize,
) -> Result<ValueResult, String> {
    let mut values = vec![0.0_f64; reward.len()];

    for sweep in 1..=max_sweeps {
        let updated: Vec<f64> = (0..reward.len())
            .map(|state| {
                (0..reward[state].len())
                    .map(|action| action_value(kernel, reward, &values, state, action, gamma))
                    .fold(f64::NEG_INFINITY, f64::max)
            })
            .collect();

        let gap = updated
            .iter()
            .zip(&values)
            .map(|(new, old)| (new - old).abs())
            .fold(0.0, f64::max);
        values = updated;

        if gap < tolerance {
            return Ok(ValueResult {
                policy: improve_policy(kernel, reward, &values, gamma),
                values,
                sweeps: sweep,
                final_gap: gap,
                error_bound: gamma * gap / (1.0 - gamma),
            });
        }
    }
    Err("value iteration exceeded its sweep cap".to_owned())
}

pub struct ModifiedResult {
    pub policy: Vec<usize>,
    pub values: Vec<f64>,
    pub rounds: usize,
    pub total_sweeps: usize,
}

/// The dial the two algorithms sit on.
///
/// \`evaluation_sweeps\` of 1 is value iteration; large values approach
/// policy iteration. A small number -- three to twenty -- is usually
/// better than either end, because solving the evaluation exactly is
/// wasted effort early, when the policy is about to change anyway.
///
/// Note the warm start: values carry across rounds rather than being
/// reset, which is what makes a handful of sweeps enough.
pub fn modified_policy_iteration(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    evaluation_sweeps: usize,
    max_rounds: usize,
) -> Result<ModifiedResult, String> {
    if evaluation_sweeps == 0 {
        return Err("evaluation sweeps must be at least 1".to_owned());
    }

    let mut policy = vec![0_usize; reward.len()];
    let mut values = vec![0.0_f64; reward.len()];

    for round_index in 1..=max_rounds {
        values = evaluate_policy_sweeps(kernel, reward, &policy, &values, gamma, evaluation_sweeps);
        let improved = improve_policy(kernel, reward, &values, gamma);

        if improved == policy {
            return Ok(ModifiedResult {
                policy,
                values,
                rounds: round_index,
                total_sweeps: round_index * evaluation_sweeps,
            });
        }
        policy = improved;
    }
    Err("modified policy iteration exceeded its round cap".to_owned())
}

pub struct StabilityReport {
    pub sweeps_to_optimal_policy: usize,
    pub sweeps_to_value_tolerance: usize,
    pub wasted_fraction: f64,
}

/// When the POLICY settles, against when the values do.
///
/// Usually a small fraction of the way in. Everything after the first
/// number refines values that no longer change any decision -- which
/// makes a value-tolerance stopping rule the wrong criterion for a
/// solver that only needs a policy, and checking policy stability costs
/// one comparison per sweep.
pub fn sweeps_until_policy_stable(
    kernel: &Kernel,
    reward: &Reward,
    gamma: f64,
    tolerance: f64,
) -> Result<StabilityReport, String> {
    let optimal = value_iteration(kernel, reward, gamma, tolerance, 1_000_000)?.policy;

    let mut values = vec![0.0_f64; reward.len()];
    let mut stable_at = 0_usize;

    for sweep in 1..=1_000_000_usize {
        let updated: Vec<f64> = (0..reward.len())
            .map(|state| {
                (0..reward[state].len())
                    .map(|action| action_value(kernel, reward, &values, state, action, gamma))
                    .fold(f64::NEG_INFINITY, f64::max)
            })
            .collect();

        let gap = updated
            .iter()
            .zip(&values)
            .map(|(new, old)| (new - old).abs())
            .fold(0.0, f64::max);
        values = updated;

        if stable_at == 0 && improve_policy(kernel, reward, &values, gamma) == optimal {
            stable_at = sweep;
        }
        if gap < tolerance {
            return Ok(StabilityReport {
                sweeps_to_optimal_policy: stable_at,
                sweeps_to_value_tolerance: sweep,
                wasted_fraction: 1.0 - stable_at as f64 / sweep as f64,
            });
        }
    }
    Err("value iteration exceeded its sweep cap".to_owned())
}

/// max(v) - min(v): the sharper stopping criterion.
///
/// Adding a constant to every state changes no greedy decision, so a
/// residual that is uniform across states carries no information about
/// the policy -- and the sup-norm criterion counts it as error anyway.
/// Stopping on span routinely halves the sweep count when only the
/// policy is wanted.
#[must_use]
pub fn span_seminorm(values: &[f64]) -> f64 {
    let largest = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let smallest = values.iter().copied().fold(f64::INFINITY, f64::min);
    largest - smallest
}

/// Why tie-breaking carries a proof.
///
/// Two actions with identical dynamics and identical reward means two
/// policies with identical value, and the improvement step has no
/// reason to prefer either. With consistent tie-breaking the loop
/// terminates immediately. With ties resolved by alternating -- which
/// is what an unspecified argmax can effectively do -- it never
/// terminates, and an algorithm with a finite-termination proof hangs.
pub fn cycling_demo(gamma: f64) -> Result<(usize, Vec<Vec<usize>>), String> {
    let kernel: Kernel = vec![
        vec![vec![1.0, 0.0], vec![1.0, 0.0]],
        vec![vec![0.0, 1.0], vec![0.0, 1.0]],
    ];
    let reward: Reward = vec![vec![1.0, 1.0], vec![0.0, 0.0]];

    let consistent = policy_iteration(&kernel, &reward, gamma, 1000)?;

    let mut policy = vec![0_usize; reward.len()];
    let mut seen = Vec::new();
    for round_index in 0..10 {
        let values = evaluate_policy_exactly(&kernel, &reward, &policy, gamma)?;
        let improved: Vec<usize> = (0..reward.len())
            .map(|state| {
                let scored: Vec<(f64, usize)> = (0..reward[state].len())
                    .map(|action| {
                        (action_value(&kernel, &reward, &values, state, action, gamma), action)
                    })
                    .collect();
                let best = scored.iter().map(|(value, _)| *value).fold(f64::NEG_INFINITY, f64::max);
                let tied: Vec<usize> = scored
                    .iter()
                    .filter(|(value, _)| (*value - best).abs() < 1e-12)
                    .map(|(_, action)| *action)
                    .collect();
                tied[round_index % tied.len()]
            })
            .collect();
        seen.push(improved.clone());
        policy = improved;
    }

    Ok((consistent.rounds, seen))
}
`,
        profile:
          'A value-iteration sweep is O(|S|·|A|·|S\'|) and needs log(tolerance)/log(gamma) of them; a policy-iteration round is one O(|S|³) elimination plus one improvement, and needs remarkably few rounds. Illustrative, not a measured benchmark: the comparison worth running is the same MDP at gamma 0.9 and 0.99 — the sweep count grows roughly tenfold and the round count barely moves, which is the argument for checking the discount before choosing the algorithm.',
      },
      'make-it-right': {
        rationale:
          'The three decisions the literal version made implicitly become types, because each carries consequences the code otherwise hides. Tie-breaking becomes an enum, since policy iteration\'s finite-termination proof rests on it and an unspecified argmax can alternate forever between policies of identical value — an exact algorithm that hangs. The stopping criterion becomes an enum too, because "the values converged", "the policy stopped changing" and "the span fell below tolerance" are three different questions and the literal version answered only the first while the reader assumed the second. The evaluation dial becomes a type with both ends named, so a result reports which algorithm actually ran rather than leaving it to be inferred from a loop bound. Newtypes separate the discount, the sup-norm gap and the state and action indices, which are otherwise all bare f64 and usize and all silently interchangeable. Every recoverable failure is a variant naming the values that caused it, including a round cap reached — which with consistent tie-breaking is impossible, so the message points at the tie rule rather than suggesting a larger cap. The result type carries whether the answer is exact, since policy iteration terminating and value iteration stopping within tolerance are different claims a bare Vec cannot distinguish. Reads borrow slices throughout and the backups are iterator chains rather than index loops.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Dynamic programming with the decisions made explicit.
//!
//! Three things the literal version left implicit, each a decision with
//! consequences:
//!
//!   * tie-breaking, which policy iteration's finite-termination proof
//!     depends on and which an unspecified argmax resolves arbitrarily;
//!   * the stopping criterion, where "values converged", "policy
//!     stopped changing" and "span below tolerance" are different
//!     questions with different answers;
//!   * the evaluation dial, where 1 is value iteration, exact is policy
//!     iteration, and the discount decides which is cheaper.
//!
//! Each becomes a named type here rather than a literal in a loop.

use std::fmt;

/// A state index. Distinct from an action index, which is also a usize.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StateId(pub usize);

/// An action index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ActionId(pub usize);

/// The discount. Part of the problem statement, and also the number
/// that decides which algorithm is cheaper.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Discount(f64);

impl Discount {
    pub fn new(gamma: f64) -> Result<Self, DpError> {
        if !(0.0..1.0).contains(&gamma) {
            return Err(DpError::InvalidDiscount { gamma });
        }
        Ok(Self(gamma))
    }

    #[must_use]
    pub fn gamma(self) -> f64 {
        self.0
    }

    /// Sweeps value iteration needs for a tolerance, from the
    /// contraction. Knowable before running anything, which is what
    /// makes the algorithm choice a decision rather than a discovery.
    #[must_use]
    pub fn sweeps_for_tolerance(self, tolerance: f64) -> usize {
        if self.0 == 0.0 {
            return 1;
        }
        (tolerance.ln() / self.0.ln()).ceil() as usize
    }
}

/// A sup-norm distance between value functions.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct SupGap(pub f64);

/// How the improvement step resolves equal action values.
///
/// This carries a proof. Policy iteration terminates because each round
/// produces a strictly better policy from a finite set; a rule that can
/// alternate between two policies of identical value breaks the
/// argument, and the symptom is a solver that never returns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TieBreak {
    LowestIndex,
    PreferIncumbent,
}

/// What "converged" means, stated rather than assumed.
///
/// \`Span\` is the sharp one when only the policy is wanted: a constant
/// added to every state changes no greedy decision, so a uniform
/// residual carries no information about the policy and the sup-norm
/// criterion counts it as error anyway.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StoppingRule {
    SupNorm,
    Span,
    PolicyStable,
}

/// How much evaluation before improving again. One dial, both
/// algorithms.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EvaluationSchedule {
    /// m sweeps of T^pi. One is value iteration.
    Sweeps(usize),
    /// Solve the linear system. This is policy iteration.
    Exact,
}

impl EvaluationSchedule {
    pub fn sweeps(count: usize) -> Result<Self, DpError> {
        if count == 0 {
            return Err(DpError::InvalidSchedule { sweeps: count });
        }
        Ok(Self::Sweeps(count))
    }

    #[must_use]
    pub fn is_exact(self) -> bool {
        matches!(self, Self::Exact)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum DpError {
    InvalidDiscount { gamma: f64 },
    InvalidSchedule { sweeps: usize },
    ShapeMismatch { expected: usize, found: usize },
    /// Not a numerical difficulty to work around: at a discount near
    /// one with a policy that never terminates, the expectation
    /// equation has no solution and the model is what needs fixing.
    SingularEvaluation { column: usize },
    /// With consistent tie-breaking this cannot happen, so the message
    /// points where the bug actually is.
    NonTerminating { rounds: usize },
}

impl fmt::Display for DpError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDiscount { gamma } => write!(
                formatter,
                "gamma must lie in [0, 1); got {gamma}. At exactly 1 the operators are \\
                 not contractions and the guarantees do not hold"
            ),
            Self::InvalidSchedule { sweeps } => write!(
                formatter,
                "evaluation sweeps must be at least 1 or Exact; got {sweeps}"
            ),
            Self::ShapeMismatch { expected, found } => {
                write!(formatter, "expected {expected} values, found {found}")
            }
            Self::SingularEvaluation { column } => write!(
                formatter,
                "(I - gamma P_pi) is singular at column {column}; at gamma near 1 with a \\
                 policy that never terminates the equation has no solution"
            ),
            Self::NonTerminating { rounds } => write!(
                formatter,
                "exceeded {rounds} rounds. With consistent tie-breaking policy iteration \\
                 cannot fail to terminate, so the tie rule is what to examine first"
            ),
        }
    }
}

impl std::error::Error for DpError {}

/// The MDP, flat and validated once.
///
/// One row-major Vec rather than nested Vecs: a locality decision and a
/// correctness one at the same time, since a ragged structure can have
/// rows of different lengths and nothing would say so.
pub struct Problem {
    n_states: usize,
    n_actions: usize,
    kernel: Vec<f64>,
    reward: Vec<f64>,
    discount: Discount,
}

impl Problem {
    pub fn new(
        n_states: usize,
        n_actions: usize,
        kernel: Vec<f64>,
        reward: Vec<f64>,
        discount: Discount,
    ) -> Result<Self, DpError> {
        if kernel.len() != n_states * n_actions * n_states {
            return Err(DpError::ShapeMismatch {
                expected: n_states * n_actions * n_states,
                found: kernel.len(),
            });
        }
        if reward.len() != n_states * n_actions {
            return Err(DpError::ShapeMismatch {
                expected: n_states * n_actions,
                found: reward.len(),
            });
        }
        Ok(Self {
            n_states,
            n_actions,
            kernel,
            reward,
            discount,
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
    pub fn successors(&self, state: StateId, action: ActionId) -> &[f64] {
        let base = (state.0 * self.n_actions + action.0) * self.n_states;
        &self.kernel[base..base + self.n_states]
    }

    #[must_use]
    pub fn reward_at(&self, state: StateId, action: ActionId) -> f64 {
        self.reward[state.0 * self.n_actions + action.0]
    }

    #[must_use]
    pub fn action_value(&self, state: StateId, action: ActionId, values: &[f64]) -> f64 {
        let expectation: f64 = self
            .successors(state, action)
            .iter()
            .zip(values)
            .map(|(probability, value)| probability * value)
            .sum();
        self.reward_at(state, action) + self.discount.gamma() * expectation
    }
}

/// The answer, with what kind of answer it is.
///
/// \`exact\` separates "policy iteration terminated" from "value
/// iteration stopped within tolerance" -- different claims that a bare
/// Vec cannot distinguish, and readers assume the stronger one.
pub struct SolveResult {
    pub policy: Vec<ActionId>,
    pub values: Vec<f64>,
    pub rounds: usize,
    pub total_sweeps: usize,
    pub final_gap: SupGap,
    pub error_bound: f64,
    pub exact: bool,
    pub stopped_on: StoppingRule,
}

#[must_use]
pub fn improve_policy(
    problem: &Problem,
    values: &[f64],
    tie_break: TieBreak,
    incumbent: &[ActionId],
) -> Vec<ActionId> {
    (0..problem.n_states())
        .map(|state| {
            let state_id = StateId(state);
            let mut best = f64::NEG_INFINITY;
            let mut chosen = ActionId(0);

            for action in 0..problem.n_actions() {
                let candidate = problem.action_value(state_id, ActionId(action), values);
                if candidate > best {
                    best = candidate;
                    chosen = ActionId(action);
                }
            }

            // Keeping the incumbent when it is within noise of the best
            // both breaks ties consistently and stops a policy churning
            // between numerically indistinguishable actions -- a real
            // problem when the kernel is estimated.
            if tie_break == TieBreak::PreferIncumbent && !incumbent.is_empty() {
                let current = problem.action_value(state_id, incumbent[state], values);
                if current >= best - 1e-12 {
                    chosen = incumbent[state];
                }
            }
            chosen
        })
        .collect()
}

pub fn evaluate_policy_exactly(
    problem: &Problem,
    policy: &[ActionId],
) -> Result<Vec<f64>, DpError> {
    let n_states = problem.n_states();
    let mut matrix = vec![vec![0.0_f64; n_states + 1]; n_states];

    for state in 0..n_states {
        let state_id = StateId(state);
        matrix[state][state] = 1.0;
        matrix[state][n_states] = problem.reward_at(state_id, policy[state]);

        let successors = problem.successors(state_id, policy[state]);
        for (next_state, probability) in successors.iter().enumerate() {
            matrix[state][next_state] -= problem.discount.gamma() * probability;
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
            return Err(DpError::SingularEvaluation { column });
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

/// m applications of T^pi, warm-started from the given values.
///
/// The warm start is what makes a handful of sweeps enough: consecutive
/// policies are similar, so their value functions are too.
#[must_use]
pub fn evaluate_policy_sweeps(
    problem: &Problem,
    policy: &[ActionId],
    values: &[f64],
    sweeps: usize,
) -> Vec<f64> {
    let mut current = values.to_vec();
    for _ in 0..sweeps {
        current = (0..problem.n_states())
            .map(|state| problem.action_value(StateId(state), policy[state], &current))
            .collect();
    }
    current
}

#[must_use]
pub fn span_seminorm(values: &[f64]) -> f64 {
    let largest = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let smallest = values.iter().copied().fold(f64::INFINITY, f64::min);
    largest - smallest
}

/// One solver, with the dial as a parameter.
///
/// Both algorithms are this function with a different schedule, which
/// is the honest way to present them: they are not alternatives so much
/// as two settings of one knob.
pub fn solve(
    problem: &Problem,
    schedule: EvaluationSchedule,
    tolerance: f64,
    stopping: StoppingRule,
    tie_break: TieBreak,
    max_rounds: usize,
) -> Result<SolveResult, DpError> {
    let gamma = problem.discount.gamma();
    let mut policy = vec![ActionId(0); problem.n_states()];
    let mut values = vec![0.0_f64; problem.n_states()];
    let mut total_sweeps = 0_usize;
    let mut gap = f64::INFINITY;

    for round_index in 1..=max_rounds {
        match schedule {
            EvaluationSchedule::Exact => {
                values = evaluate_policy_exactly(problem, &policy)?;
                total_sweeps += 1;
            }
            EvaluationSchedule::Sweeps(count) => {
                let previous = values.clone();
                values = evaluate_policy_sweeps(problem, &policy, &values, count);
                total_sweeps += count;
                gap = values
                    .iter()
                    .zip(&previous)
                    .map(|(new, old)| (new - old).abs())
                    .fold(0.0, f64::max);
            }
        }

        let improved = improve_policy(problem, &values, tie_break, &policy);
        let stable = improved == policy;
        policy = improved;

        if schedule.is_exact() {
            if stable {
                return Ok(SolveResult {
                    policy,
                    values,
                    rounds: round_index,
                    total_sweeps,
                    final_gap: SupGap(0.0),
                    error_bound: 0.0,
                    exact: true,
                    stopped_on: StoppingRule::PolicyStable,
                });
            }
            continue;
        }

        let measured = match stopping {
            StoppingRule::SupNorm => gap,
            StoppingRule::Span => span_seminorm(&values),
            StoppingRule::PolicyStable => {
                if stable {
                    0.0
                } else {
                    gap
                }
            }
        };

        if measured < tolerance {
            return Ok(SolveResult {
                policy,
                values,
                rounds: round_index,
                total_sweeps,
                final_gap: SupGap(gap),
                error_bound: gamma * gap / (1.0 - gamma),
                exact: false,
                stopped_on: stopping,
            });
        }
    }

    Err(DpError::NonTerminating { rounds: max_rounds })
}
`,
        profile:
          'Identical asymptotics to the literal version — an O(|S|³) elimination per exact round, an O(|S|·|A|·|S\'|) sweep otherwise — with the kernel in one flat row-major Vec and successor rows borrowed as slices. Illustrative, not a measured benchmark: the substantive change is that tie-breaking, the stopping criterion and the evaluation dial are stated parameters rather than implicit constants, so a result can report which produced it and whether the answer is exact or merely within tolerance.',
      },
      'make-it-fast': {
        rationale:
          'Three changes, in descending order of what they are worth. The kernel becomes CSR over flattened state-action pairs: a real MDP reaches a handful of successors per pair, so a dense layout is almost all zeros and both the sweep and the evaluation spend their time multiplying by them — and because the kernel is the largest array in the system, this moves the size of problem that fits at all rather than merely the speed. Then the backup fuses and runs in place: the sparse dot, the reward add and the max over live actions become one pass writing straight into the value vector in Gauss-Seidel order, so the state-by-action intermediate is never built and information propagates across the state space within a single pass instead of one state per sweep; the inner gather is a zipped slice iterator so the bounds checks are elided rather than paid per non-zero. Then action elimination, which is free once the contraction bound exists and which almost no solver implements: an action whose optimistic value falls below another\'s pessimistic value can never be optimal and is struck from every later improvement, which on many-action problems removes most of the max at once. A Jacobi variant is kept alongside precisely because its states are independent and can therefore be given to rayon, with the honest note that it needs more sweeps than the in-place version and can lose overall — which core count and problem structure decide, not preference. Scratch is sized from the state count at construction so a long solve allocates nothing.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Transitions live in one CSR block over flattened state-action pairs, so a sweep streams the non-zeros instead of indexing a three-level structure',
            tradeoff: 'The sparsity pattern is baked into the indices, so a re-estimated kernel means a rebuild — the normal case when the model is fitted on a schedule',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The inner gather zips the CSR index and value slices, so the hot loop vectorizes instead of paying a bounds check per non-zero',
            tradeoff: 'The chained form hides the index arithmetic, which is exactly where a malformed CSR row pointer would otherwise be visible',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The Jacobi variant leaves states independent within a sweep, so the per-state maxima fan across cores with nothing to synchronize',
            tradeoff: 'It forces Jacobi over in-place Gauss-Seidel, which needs more sweeps, so the parallel version can lose overall where in-sweep propagation was doing the work',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Value, scratch and liveness buffers are sized from the state count at construction, so a solve running thousands of sweeps allocates nothing',
            tradeoff: 'The workspace is not reentrant, so two solves cannot share it and a nested parallel solve needs its own copy',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The sparse row dot is a few instructions called once per live state-action pair per sweep, where call overhead would rival the work',
            tradeoff: 'Inlining it into the Gauss-Seidel, Jacobi and elimination loops grows the code, and the benefit disappears once rows are long enough to dominate',
          },
        ],
        code: `//! Dynamic programming for a kernel that is mostly zeros.
//!
//! Three changes, in descending order of what they are worth:
//!
//!   1. sparse transitions -- the memory ceiling binds long before the
//!      arithmetic does, and a dense kernel is almost all zeros;
//!   2. a fused in-place backup in Gauss-Seidel order, so information
//!      crosses the state space within one pass;
//!   3. action elimination, free once the contraction bound exists and
//!      almost never implemented.
//!
//! What none of this changes: the sweep count still comes from gamma.
//! At a discount near one the right answer is still to switch
//! algorithms rather than to optimize the one you have.

use rayon::prelude::*;

/// Transitions as CSR over flattened (state, action) rows.
///
/// Row s*A + a is that pair's successor distribution. Density is
/// reported because it decides whether this layout is appropriate at
/// all: above roughly ten percent non-zero the indirection costs more
/// than it saves and the dense backup was correct.
pub struct SparseProblem {
    n_states: usize,
    n_actions: usize,
    row_start: Vec<u32>,
    column: Vec<u32>,
    transition: Vec<f64>,
    reward: Vec<f64>,
    gamma: f64,
    live: Vec<bool>,
}

impl SparseProblem {
    pub fn new(
        n_states: usize,
        n_actions: usize,
        row_start: Vec<u32>,
        column: Vec<u32>,
        transition: Vec<f64>,
        reward: Vec<f64>,
        gamma: f64,
    ) -> Option<Self> {
        if row_start.len() != n_states * n_actions + 1
            || column.len() != transition.len()
            || !(0.0..1.0).contains(&gamma)
        {
            return None;
        }
        Some(Self {
            n_states,
            n_actions,
            row_start,
            column,
            transition,
            reward,
            gamma,
            live: vec![true; n_states * n_actions],
        })
    }

    #[must_use]
    pub fn n_states(&self) -> usize {
        self.n_states
    }

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

    /// The fused per-state body: sparse dot, reward add, max over live
    /// actions. The state-by-action intermediate is never built.
    #[inline]
    fn best_value(&self, state: usize, values: &[f64]) -> f64 {
        let base = state * self.n_actions;
        (0..self.n_actions)
            .filter(|action| self.live[base + action])
            .map(|action| {
                let pair = base + action;
                self.reward[pair] + self.gamma * self.row_dot(pair, values)
            })
            .fold(f64::NEG_INFINITY, f64::max)
    }
}

/// Buffers sized once from the state count.
pub struct Workspace {
    values: Vec<f64>,
    scratch: Vec<f64>,
    order: Vec<u32>,
}

impl Workspace {
    #[must_use]
    pub fn new(n_states: usize) -> Self {
        let mut values = Vec::with_capacity(n_states);
        let mut scratch = Vec::with_capacity(n_states);
        let mut order = Vec::with_capacity(n_states);
        values.resize(n_states, 0.0);
        scratch.resize(n_states, 0.0);
        order.extend(0..n_states as u32);
        Self {
            values,
            scratch,
            order,
        }
    }

    /// Reorder the sweep. On goal-directed problems, ordering by
    /// reverse reachability from terminal states reaches a good policy
    /// in a small fraction of the passes a naive order needs -- the
    /// ordering is the optimization, not the arithmetic.
    pub fn set_order(&mut self, order: &[u32]) {
        self.order.clear();
        self.order.extend_from_slice(order);
    }
}

/// In-place backup reading its own updates within the pass.
///
/// Jacobi computes every new value from the old array; this reads
/// whatever is current, so information crosses the state space in one
/// pass rather than one state per sweep.
///
/// The cost is that the result now depends on the ordering. The fixed
/// point does not change; the trajectory to it does, so two runs with
/// different orders are no longer bitwise comparable.
pub fn gauss_seidel_sweep(problem: &SparseProblem, workspace: &mut Workspace) -> f64 {
    let mut largest_change = 0.0_f64;

    for index in 0..workspace.order.len() {
        let state = workspace.order[index] as usize;
        let best = problem.best_value(state, &workspace.values);
        largest_change = largest_change.max((best - workspace.values[state]).abs());
        workspace.values[state] = best;
    }
    largest_change
}

/// Jacobi variant: every state from the same input values.
///
/// Kept alongside the in-place version precisely because its states are
/// independent, which is what licenses the parallel map. It needs more
/// sweeps than Gauss-Seidel, so whether the parallelism wins depends on
/// the core count against that gap -- a measurement, not a preference.
pub fn jacobi_sweep(problem: &SparseProblem, workspace: &mut Workspace) -> f64 {
    {
        let current: &[f64] = &workspace.values;
        workspace
            .scratch
            .par_iter_mut()
            .enumerate()
            .for_each(|(state, slot)| {
                *slot = problem.best_value(state, current);
            });
    }

    let gap = workspace
        .scratch
        .iter()
        .zip(&workspace.values)
        .map(|(new, old)| (new - old).abs())
        .fold(0.0, f64::max);

    std::mem::swap(&mut workspace.values, &mut workspace.scratch);
    gap
}

/// Prune actions the contraction bound proves cannot be optimal.
///
/// The bound says the truth lies within gamma*gap/(1-gamma) of the
/// current estimate. So an action whose OPTIMISTIC value falls below
/// another's PESSIMISTIC value is dominated for the rest of the solve
/// and can be struck from every later improvement.
///
/// Free in the sense that both quantities are already computed, and
/// ineffective early: the bracket is wide until values are reasonably
/// converged, so nothing is pruned at first and the bookkeeping is pure
/// overhead. On many-action problems it then removes most of the max.
pub fn eliminate_actions(problem: &mut SparseProblem, values: &[f64], gap: f64) -> usize {
    if !gap.is_finite() {
        return 0;
    }

    let slack = problem.gamma * gap / (1.0 - problem.gamma);
    let n_actions = problem.n_actions;
    let mut removed = 0_usize;
    let mut scored = vec![f64::NEG_INFINITY; n_actions];

    for state in 0..problem.n_states {
        let base = state * n_actions;

        for action in 0..n_actions {
            scored[action] = if problem.live[base + action] {
                problem.reward[base + action]
                    + problem.gamma * problem.row_dot(base + action, values)
            } else {
                f64::NEG_INFINITY
            };
        }

        let best = scored.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let pessimistic_best = best - slack;

        for action in 0..n_actions {
            if problem.live[base + action] && scored[action] + slack < pessimistic_best {
                problem.live[base + action] = false;
                removed += 1;
            }
        }
    }
    removed
}

pub struct SolveResult {
    pub values: Vec<f64>,
    pub policy: Vec<u32>,
    pub sweeps: usize,
    pub final_gap: f64,
    pub error_bound: f64,
    pub actions_eliminated: usize,
}

pub fn value_iteration(
    problem: &mut SparseProblem,
    tolerance: f64,
    max_sweeps: usize,
    eliminate_every: usize,
) -> SolveResult {
    let mut workspace = Workspace::new(problem.n_states());
    let mut gap = f64::INFINITY;
    let mut eliminated = 0_usize;
    let mut sweeps = 0_usize;

    for sweep in 1..=max_sweeps {
        gap = gauss_seidel_sweep(problem, &mut workspace);
        sweeps = sweep;

        if eliminate_every > 0 && sweep % eliminate_every == 0 {
            let values = workspace.values.clone();
            eliminated += eliminate_actions(problem, &values, gap);
        }
        if gap < tolerance {
            break;
        }
    }

    let policy = (0..problem.n_states())
        .map(|state| {
            let base = state * problem.n_actions;
            let mut best = f64::NEG_INFINITY;
            let mut chosen = 0_u32;

            for action in 0..problem.n_actions {
                if !problem.live[base + action] {
                    continue;
                }
                let candidate = problem.reward[base + action]
                    + problem.gamma * problem.row_dot(base + action, &workspace.values);
                if candidate > best {
                    best = candidate;
                    chosen = action as u32;
                }
            }
            chosen
        })
        .collect();

    SolveResult {
        values: workspace.values,
        policy,
        sweeps,
        final_gap: gap,
        error_bound: problem.gamma * gap / (1.0 - problem.gamma),
        actions_eliminated: eliminated,
    }
}

/// Which end of the dial, from the two numbers that decide it.
///
/// A rough comparison, not a benchmark: value iteration pays
/// log(tolerance)/log(gamma) sweeps at roughly nnz each, policy
/// iteration a handful of rounds at roughly a sparse factorization
/// each. The point is that the answer depends on gamma and that it
/// flips -- worth knowing before a solver is written, not after it is
/// profiled.
#[must_use]
pub fn choose_algorithm(gamma: f64, n_states: usize, tolerance: f64) -> &'static str {
    let sweeps = tolerance.ln() / gamma.ln();
    // Empirically small, and remarkably insensitive to gamma.
    let rounds = 10.0_f64;

    if sweeps > rounds * (n_states as f64).sqrt() {
        "policy-iteration"
    } else {
        "value-iteration"
    }
}
`,
        profile:
          'A sparse sweep is O(nnz) against O(|S|²·|A|) dense, and elimination shrinks the per-state action loop as the bound tightens. Sweep count stays log(tolerance)/log(gamma), unchanged by anything here. Illustrative, not a measured benchmark: check density first — above roughly ten percent non-zero the CSR indirection costs more than it saves — and check gamma second, since at a long horizon switching to policy iteration is worth more than every optimization in this file combined.',
      },
    },
  },
};
