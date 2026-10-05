import type { AiMlModel } from '../../types';

/**
 * Linear & Integer Programming — the entry where nothing is learned and the
 * optimizer IS the deliverable.
 *
 * Every other classical-ml entry fits parameters to data and then, incidentally,
 * calls an optimizer. Here the data are the problem statement (costs, capacities,
 * demands) and the output is a decision with a proof of optimality attached. That
 * changes what the entry has to say: the geometry (a polytope whose optimum sits
 * on a vertex), the dual (shadow prices that make the answer explainable), the
 * hard boundary at integrality (NP-hard), and the one place machine learning
 * actually meets it (a forecast becomes a right-hand side).
 *
 * The code progression is a dense-tableau simplex, then a typed two-phase solver
 * whose infeasible and unbounded outcomes are values or exceptions rather than
 * silent garbage, then a revised simplex that reuses one factorisation per
 * iteration (and the library call that replaces all of it once integers appear).
 */
export const LINEAR_PROGRAMMING: AiMlModel = {
  slug: 'linear-programming',
  name: 'Linear & Integer Programming',
  aliases: [
    'Linear programming',
    'Integer programming',
    'MILP',
    'Simplex',
    'Mixed-integer programming',
    'Branch and bound',
    'Interior-point method',
  ],
  category: 'classical-ml',
  group: 'mathematical-optimization',
  kind: 'technique',

  // A technique, not a model: nothing is estimated from data. Both axes are left
  // empty rather than stretched to fit — see paradigmNote.
  paradigms: [],
  taskTypes: [],
  paradigmNote:
    'No learning paradigm and no task type applies, deliberately. The inputs are the problem (costs, capacities, demands), not a training set, and the output is a decision with an optimality certificate rather than a prediction. It lives in classical-ml because it shares the toolbox and is the downstream consumer of the regression and forecasting entries, not because it fits parameters to data.',

  intuition:
    'Write the decision as a list of numbers, the cost as a weighted sum of them, and every rule as a weighted sum that must stay under a limit. Each rule cuts space in half with a flat wall, so the set of decisions that obey every rule is a many-faced solid, a polytope. A linear cost is a tilted plane, and sliding that plane as far as it will go while still touching the solid always ends on a corner. That one geometric fact is the whole algorithm: simplex starts at a corner and walks along edges to a neighbouring corner that is cheaper, and it can stop the moment no neighbour is cheaper, because a convex solid has no false peaks. Interior-point methods reach the same corner by a different route, cutting through the inside along a smooth path instead of along the skin. The second idea is what makes this explainable to a business: every wall has a price. The dual variable on the machine-hours constraint says what one more hour is worth, and it comes out of the same solve for free. Then comes the cliff. Require that some variables be whole numbers (build the plant or do not, ship whole pallets) and the feasible set stops being a solid and becomes a scatter of lattice points inside one. The problem becomes NP-hard, and the practical method is to solve the continuous version, branch on a fractional variable, and let the continuous solution serve as a bound that prunes most of the tree. Everything that follows is about how well the continuous relaxation approximates the integer problem.',

  objective: {
    kind: 'constrained-program',
    expression: {
      formula:
        '\\min_{x \\in \\mathbb{R}^{n}} \\; c^{\\top}x \\quad \\text{s.t.} \\quad Ax \\le b, \\;\\; x \\ge 0, \\;\\; x_j \\in \\mathbb{Z} \\;\\; \\forall j \\in \\mathcal{I}',
      symbols: [
        { symbol: 'x', meaning: 'the decision variables: quantities to produce, ship, schedule or select' },
        { symbol: 'c', meaning: 'the cost vector. Maximizing profit p is the same problem with c = -p, so there is no separate maximization form' },
        { symbol: 'A,\\; b', meaning: 'the constraint matrix and right-hand side; each row a_i^{\\top}x \\le b_i is one half-space, and a covering rule a^{\\top}x \\ge \\beta is written as the row -a^{\\top}x \\le -\\beta' },
        { symbol: '\\mathcal{P} = \\{x : Ax \\le b,\\, x \\ge 0\\}', meaning: 'the feasible set: an intersection of half-spaces, which is a convex polyhedron (a polytope when bounded) with finitely many vertices' },
        { symbol: '\\mathcal{I}', meaning: 'the indices required to be integer. Empty is a linear program, a proper subset is a mixed-integer program (MILP), and all indices is a pure integer program; this one set is the difference between polynomial time and NP-hard' },
      ],
    },
    reading:
      'Pick the cheapest point that obeys every rule. Because the cost is linear and the feasible set is convex, a local minimum is global, and the fundamental theorem of linear programming goes further: if an optimum exists, one sits at a vertex of the polytope. That is the license for simplex to search only vertices, a finite set, rather than a continuum. The geometry also fixes which distances can be optimized. A rule a_i^T x <= b_i is a dot product against a wall, and its slack b_i - a_i^T x divided by the Euclidean length of a_i is the straight-line distance from x to that wall, which is why rescaling a row changes the number but not the geometry. The same thread decides the norm angle. An L1 ball (Manhattan distance) is a cross-polytope and an L-infinity ball (Chebyshev distance) is a hypercube, and both are polyhedra, so minimizing an L1 or L-infinity error is again a linear program: split each residual into positive and negative parts for the absolute value, and bound the largest residual by one epigraph variable for the max. The L2 ball is round, not polyhedral, so squared Euclidean error needs a quadratic program instead. That is exactly why least absolute deviations and quantile regression are linear programs while ordinary least squares is not, and why an L1 constraint region has corners on the axes (sparse solutions) while an L2 region does not. Duality supplies the second reading. For every program there is a dual whose optimum is equal to it (strong duality), and the optimal dual variable y_i is the derivative of the optimal cost with respect to b_i: the shadow price of rule i. A rule that is not binding has a price of zero, and a rule that is binding has a price that says how much one more unit of that resource is worth. That number is the explanation a planner can act on, and it holds only while the optimal basis stays the same, which is the standard way it gets misread.',
  },

  optimization: {
    method:
      'Simplex (walk the vertices of the polytope), interior-point methods (follow the central path through the interior), and branch-and-bound or branch-and-cut over linear relaxations for the integer variables',
    updateRule: {
      formula:
        '\\bar{c}_j = c_j - c_B^{\\top}B^{-1}a_j < 0, \\qquad d = B^{-1}a_j, \\qquad \\theta^{*} = \\min_{i:\\, d_i > 0} \\frac{(B^{-1}b)_i}{d_i}, \\qquad x_B \\leftarrow x_B - \\theta^{*}d, \\;\\; x_j \\leftarrow \\theta^{*}',
      symbols: [
        { symbol: 'B', meaning: 'the basis: m linearly independent columns of the constraint matrix (slacks included) that define the current vertex; B^{-1}b gives the values of the basic variables' },
        { symbol: '\\bar{c}_j', meaning: 'the reduced cost of the nonbasic column j: the change in cost per unit increase of x_j with the basis re-balancing around it. A negative value means moving along this edge improves the objective' },
        { symbol: 'y^{\\top} = c_B^{\\top}B^{-1}', meaning: 'the dual variables (shadow prices) read off the current basis; at the optimum they are feasible for the dual program and their value matches the primal cost' },
        { symbol: 'd = B^{-1}a_j', meaning: 'how each basic variable changes per unit increase of the entering variable: the direction of the edge being walked' },
        { symbol: '\\theta^{*}', meaning: 'the ratio test: the largest step along the edge before some basic variable hits zero; that variable leaves the basis and the walk arrives at the next vertex' },
        { symbol: 'z^{\\text{LP}}_{\\text{node}} \\ge z^{\\text{inc}}', meaning: 'the branch-and-bound prune rule for a minimization: if a subproblem\'s relaxation is already no better than the best integer solution found, nothing beneath it can win' },
      ],
    },
    rationale:
      'Simplex is the right default because it moves between vertices, which is exactly where the optimum lives, and because it is warm-startable: change a right-hand side and the old basis is still dual feasible, so the dual simplex re-solves in a handful of pivots instead of starting over. That is why it, not the interior-point method, is the engine inside branch-and-bound, where every node is a re-solve after one bound changes. Interior-point methods win on very large, sparse problems with no integers: each iteration is one sparse factorisation, the iteration count is nearly independent of size (a few dozen), and the worst case is polynomial where simplex has an exponential worst case. They land in the interior and need a crossover step to recover a vertex and a clean basis, which matters whenever the shadow prices will be read. The pricing rule is where the similarity question hides. Dantzig pricing picks the most negative reduced cost, which is a raw dot product and changes if a column is rescaled; steepest-edge and devex pricing divide it by the Euclidean length of the edge direction, which turns it into the cosine of the angle between the cost gradient and the edge, so the choice no longer depends on units. It costs extra work per pivot and usually saves far more pivots, which is why it is the default in serious solvers. For integers, a good formulation matters more than a good solver: a tighter relaxation (a smaller gap between the LP bound and the integer optimum) prunes exponentially more of the tree than a faster pivot ever will, and a big-M constraint with M loose by a factor of a thousand is the commonest way to destroy that gap.',
    hyperparameters: [
      { name: 'algorithm (primal simplex, dual simplex, barrier)', role: 'Dual simplex for re-solves and branch-and-bound nodes, barrier for large sparse continuous models, primal when starting from a feasible basis', typicalRange: 'solver default; barrier above roughly 1e5 to 1e6 nonzeros' },
      { name: 'pricing rule', role: 'Which improving edge to take. Dantzig is a dot product and scale-dependent; steepest-edge and devex normalize by edge length and cut pivots; Bland guarantees no cycling and is slow', typicalRange: 'steepest-edge / devex by default' },
      { name: 'feasibility and optimality tolerance', role: 'How much constraint violation or reduced-cost error is treated as zero; the knob that trades false infeasibility against accepting a slightly infeasible plan', typicalRange: '1e-6 to 1e-9' },
      { name: 'presolve', role: 'Removes fixed variables, singleton rows and duplicate constraints, and tightens bounds before any pivot; often shrinks a model by an order of magnitude', typicalRange: 'on' },
      { name: 'relative MIP gap', role: 'Stop when (incumbent - bound) / incumbent falls below this; the honest meaning of "optimal" for an integer program', typicalRange: '1e-4 default; 1e-2 to 5e-2 for time-boxed production runs' },
      { name: 'time limit and node limit', role: 'Hard stops that return the best incumbent and the remaining gap instead of running unboundedly', typicalRange: 'set from the decision deadline, not from the model' },
      { name: 'big-M value', role: 'The constant linking a binary to a continuous variable. As small as the data allows: it directly sets how loose the relaxation is and how bad the numerics get', typicalRange: 'derived from variable bounds, never a round "1e9"' },
      { name: 'warm-start basis or incumbent', role: 'Reusing the previous solve after a small data change is the largest practical saving when re-planning on a schedule', typicalRange: 'previous solution' },
    ],
    convergence:
      'Simplex terminates in finitely many pivots when no vertex is degenerate, and degeneracy is the failure mode that matters: several bases describe the same vertex, a pivot can make zero progress, and the algorithm can cycle. Bland\'s rule or a perturbation of the right-hand side removes cycling at a cost in speed. The worst case is exponential (the Klee-Minty cube forces Dantzig pricing through every vertex), yet the observed pivot count is a small multiple of the number of constraints, and smoothed analysis explains why: the bad instances are a measure-zero set that any noise destroys. Interior-point methods are polynomial (Karmarkar, 1984) and take a few dozen iterations in practice, with the cost buried in each factorisation. A pure LP therefore has a hard guarantee. A MILP does not: it is NP-hard in general, branch-and-bound can visit exponentially many nodes, and solve time has a heavy tail, so two instances of identical size can differ by a factor of a thousand. The guarantee that survives is the bound, not the time: at any moment the solver reports an incumbent and a proven lower bound, and their gap is a certificate. Two more failure modes belong here. Primal degeneracy makes the dual solution non-unique, so a shadow price read off one solver can differ from another\'s without either being wrong. And badly scaled coefficients (a cost in the millions beside a capacity in the thousandths) push the tolerances to misclassify a feasible model as infeasible, which is a data problem presenting as a solver problem.',
    complexity:
      'Dense tableau: O(mn) per pivot, O(mn) memory. Revised simplex: one factorisation of the m x m basis, then O(m^2) per pivot with an updated factorisation (O(m^3) if refactored each iteration), and far less on sparse data. Interior point: about 20 to 60 iterations, each a sparse Cholesky of A D A^T, with a polynomial worst case of roughly O(n^3.5 L) for L input bits. Simplex worst case is exponential, typical case is a small multiple of m pivots. MILP: NP-hard; worst case exponential in the number of integer variables, with practical cost set by the integrality gap rather than by problem size.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'A linear program forecasts nothing; it consumes forecasts. The pattern is predict-then-optimize: a demand, load or arrival forecast becomes the right-hand side b (a covering requirement such as "meet demand in every period") or the cost vector c, and the program returns the plan that serves it at least cost. The forecast is an input with an error bar, and the whole question is how that error propagates. Inside a stable basis the effect is linear and exactly priced: the change in plan cost from a forecast miss of delta in constraint i is y_i times delta, so the shadow prices say which forecast errors are expensive and which are free.',
        where: [
          'Day-ahead unit commitment and economic dispatch in electricity markets, a MILP consuming load and renewable forecasts',
          'Aggregate production planning and material requirements planning against a demand forecast, with inventory carried between periods as constraints',
          'Workforce and shift scheduling in contact centres, an integer covering program driven by forecast arrival volumes',
          'Airline and hotel revenue management, where bid prices are the dual variables of an allocation LP built on demand forecasts',
        ],
        why: 'The case where a good forecast and a good decision part ways, and the reason the pairing is worth studying rather than gluing together. A point forecast fed into an LP under-hedges. The optimum sits at a vertex, which means the plan is tight on its binding constraints by construction: sized exactly to the forecast, so every unit of shortfall is a stockout and every unit of surplus a holding cost, and the two are not priced equally. The newsvendor result is the clean form of it: the optimal order is the quantile of the demand distribution at the critical ratio cu / (cu + co), not the mean, so planning to the mean is wrong whenever the costs are asymmetric. Two remedies, in increasing cost. Replace the point forecast with the quantile the cost structure calls for (which is why quantile regression is the natural upstream model, and itself an LP). Or move to stochastic or robust programming: a scenario LP that chooses first-stage decisions to be good across sampled demands with recourse, or a robust model that holds against an uncertainty set. And since the loss that matters is decision cost rather than forecast accuracy, the best-fit forecast is not necessarily the best-for-the-LP forecast; the smart predict-then-optimize line of work trains the forecaster on the downstream decision loss for exactly that reason.',
        featurization: [
          'Forecast the quantile or the scenario set the cost asymmetry calls for, not the mean, and hand the LP a distribution rather than a number',
          'Express the forecast in the units and granularity of the constraint it feeds, and aggregate forecast errors the way the constraints aggregate demand (errors cancel across periods but not within one)',
          'Add inventory or slack variables so a forecast miss has an explicit recourse price instead of an infeasible model',
          'Re-solve on a rolling horizon with the newest forecast and warm-start from the previous basis, rather than committing to one long plan',
        ],
        evaluation:
          'Decision regret, not forecast error: realized cost of the plan built from the forecast minus the cost of the plan an oracle with hindsight demand would have built, evaluated by rolling-origin backtest. Report the stockout and holding cost split, since two forecasts with the same MAPE can differ by a large factor in regret. MAPE or RMSE of the forecast alone is not an evaluation of this system.',
        pitfalls: [
          'Feeding a point forecast into the right-hand side, so the plan is exactly tight and every error is a stockout',
          'The optimizer exploiting forecast error: the plan concentrates on whatever the forecast over-predicted (the optimizer\'s curse), so in-sample cost looks better than it will be',
          'Selecting the forecast model on accuracy when the decision cost is asymmetric',
          'Plan churn between re-solves: a small forecast revision flips the optimal basis and the plan swings, so stability constraints or a penalty on change are often needed',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'A linear program chooses a best feasible decision and scores no observation as unusual; an infeasible model or an extreme dual price is a diagnostic of an over-constrained formulation, not of anomalous data.',
      },
      optimization: {
        fit: 'primary',
        how: 'This is the entry for the optimization domain in its exact form. Decide the variables, write the cost as a linear function of them and every rule as a linear inequality, and hand the model to a solver. The result is an optimal plan, a proof of optimality (or a bound and a gap when integers are involved), and the shadow prices of every rule. Modelling is the skill: the solver is a commodity and the formulation is not. Absolute values linearize with a split variable (x = x+ - x-, cost on x+ + x-), a maximum with an epigraph variable t >= each term, a fixed charge with a binary and a bound, and a logical either-or with a binary and a big-M. That toolkit is what lets L1 and L-infinity objectives, minimax and fixed-cost problems all be solved exactly as linear programs, while anything quadratic (squared error, variance) leaves the class.',
        where: [
          'Transportation, assignment and minimum-cost flow, whose constraint matrices are totally unimodular so the LP optimum is already integral and no branching is needed',
          'Blending and diet problems (Stigler\'s diet was an early simplex test case), the original industrial use',
          'Facility location, network design and capacity planning as MILPs, solved by branch-and-cut',
          'Least absolute deviations and quantile regression, which are linear programs (the residual is split into positive and negative parts), and basis pursuit, which is min of the L1 norm under linear equalities',
        ],
        why: 'Worth knowing exactly because it is the one place in this reference where "optimal" is a checkable claim rather than a hope. A local search or genetic algorithm returns something good; a linear program returns something good plus a certificate that nothing better exists, and the dual variables explain it. Take the exact method whenever the objective and constraints really are linear (or can be made so), and fall back to heuristics when they are not or when the integer structure defeats the bound. The comparison against the stochastic methods in this group is the point: a heuristic is chosen when the model cannot be written down, an LP when it can. The one honest limit is the assumption underneath everything, that the numbers in A, b and c are known. The optimum is optimal for the model as written, and the model is a simplification of reality in ways the solver cannot see.',
        featurization: [
          'Linearize deliberately: split variables for absolute values, an epigraph variable for a max, binaries with tight bounds for fixed charges, and keep anything quadratic out',
          'Scale the model so coefficients span a narrow range (a few orders of magnitude); mixed units such as dollars beside fractions of a percent are the usual cause of spurious infeasibility',
          'Prefer tight formulations: derive each big-M from the actual variable bounds, and add valid inequalities, so the LP relaxation is close to the integer optimum',
          'Keep the model in a form that can be re-solved: stable variable names and a fixed structure so a previous basis or incumbent can warm-start the next run',
        ],
        evaluation:
          'Optimality gap (incumbent against proven bound) for an integer program, and primal and dual feasibility residuals for a continuous one; for a pure LP, check complementary slackness or compare the primal and dual objective values. Then compare against the incumbent heuristic on the same instances: a plan that is provably 3 percent from the bound beats an unquantified plan regardless of how good it looks. Report the solve-time distribution (median and 99th percentile), since MILP time is heavy-tailed and a mean hides the instance that misses the deadline.',
        pitfalls: [
          'A big-M chosen as a large round number, which loosens the relaxation and ruins the numerics at once',
          'A weak formulation that is correct but has a huge integrality gap, so the solver never closes it',
          'Reading "infeasible" and "unbounded" as solver faults when they are model faults: infeasible usually means conflicting rules or bad data, unbounded usually means a missing constraint',
          'Treating "optimal" as a statement about the world instead of about the model, and treating shadow prices as valid far outside the range where the basis holds',
          'Equal-cost alternative optima: the solver returns one arbitrarily, so plans change across solver versions or thread counts without any change in the data',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Operations is where linear and integer programming earned its place: production, inventory, staffing, routing and network flow are all allocation of limited resources under linear rules. The model is built once from the business rules and re-solved whenever the data change, often with the previous basis as a warm start. The output is an executable plan plus the shadow prices that say which resource is the bottleneck and what relaxing it is worth.',
        where: [
          'Workforce, crew and shift scheduling as integer covering and set-partitioning programs',
          'Vehicle routing and delivery planning, solved at scale by branch-and-price (column generation inside branch-and-bound)',
          'Supply-chain network design, production planning and multi-period inventory, a mix of continuous flows and binary open-or-close decisions',
          'Energy dispatch and unit commitment, security-constrained and solved by system operators on a daily cycle',
        ],
        why: 'The strongest fit in this reference, and the reason is structural: these problems come with explicit, countable resources and hard rules, which is what a linear program is made of, and the dual variables answer the question managers actually ask ("what would one more truck, one more hour, one more dollar of capacity be worth?"). The limits are specific. Routing and scheduling are naturally combinatorial, so what matters is the formulation and whether a decomposition (column generation, Benders) is available, not the choice of solver. The model is only as good as its constraint list: a rule nobody wrote down is a rule the optimizer will violate, and an optimizer finds every loophole in a formulation faster than the people who wrote it. And when the instance is too large or the deadline too short for the bound to close, an anytime heuristic seeded from the LP relaxation, or the genetic algorithm, is the pragmatic answer; an LP-relaxation bound is then still useful for saying how good that heuristic is.',
        featurization: [
          'Translate each business rule into a constraint explicitly, with units, and keep a traceable map from rule to row so an infeasible model can be debugged in business terms',
          'Choose the formulation by its relaxation strength (assignment-style and flow-style models are far tighter than big-M models of the same problem)',
          'Add elastic slack variables with a penalty cost on soft rules, so the model returns a best-effort plan and a report of what it broke instead of just "infeasible"',
          'Aggregate time and space until the model solves within the decision deadline, then disaggregate with a second, smaller solve',
        ],
        evaluation:
          'Realized cost against the incumbent process over a backtest window, plus the optimality gap on each solve, plus the share of solves that hit the time limit. Validate the model by feeding it historical data and checking that it reproduces what the business actually did, or something strictly cheaper that the business would accept; a model that proposes an impossible plan has a missing constraint.',
        pitfalls: [
          'A missing business rule that the optimizer exploits, which the plan then violates in practice',
          'Solve time creeping past the decision deadline as the instance grows, with no fallback plan or time-limited incumbent',
          'Unstable plans: tiny data changes flip the optimal basis, so schedules for hundreds of people change daily',
          'Optimizing a cost that is a proxy for the real objective, then being surprised when the plan is cheap on paper and unpopular in practice',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'The linear program is not the recommender; it is the allocation layer on top of one. A relevance model produces a score for each user-item pair, typically a dot product of embeddings, and the program chooses which items to show under rules a scorer cannot express: a budget cap per advertiser, a minimum exposure per supplier, a diversity quota per slate, an inventory limit per item. The scores become the objective coefficients, the rules become constraints, and the optimum is the constrained slate allocation. In ad serving the dual variable on a budget constraint is the pacing multiplier, so the live system only needs to compute score minus price and take the argmax; the LP is solved offline or in batches and its dual prices drive serving.',
        where: [
          'Guaranteed-delivery display advertising, a large allocation LP solved offline whose dual prices drive online serving',
          'Advertiser budget pacing, where the budget constraint\'s dual variable is the bid-shading multiplier',
          'Fairness-of-exposure ranking, an LP over doubly stochastic matrices of rank probabilities decomposed into rankings (Birkhoff-von Neumann)',
          'Diversity and supplier-quota re-ranking of a candidate slate, where a hard coverage rule is a linear constraint',
        ],
        why: 'A real fit with narrow edges. The program takes relevance as given, so it inherits the similarity choice of the scorer: scores built from a raw dot product reward large-norm (popular) items and put that bias into the objective, while cosine scores remove it but also remove the magnitude signal that budgets and expected value depend on, so swapping one for the other changes which items dominate the optimum and what the dual prices mean. Where it fits is the constrained part. A single user\'s ranking with no shared resource is a sort, and an LP adds nothing; the LP earns its keep exactly when items or users compete for something finite. Per-request integer programming is too slow to serve, so the pattern is solve in aggregate, keep the dual prices, and apply them per request. The alternative to name is a bandit with a budget: when the scores themselves are unknown and must be learned online, a bandit-with-knapsacks method does the exploration while the same LP supplies the pacing.',
        featurization: [
          'Aggregate users into segments before solving, so the model has thousands of variables rather than billions, and apply the resulting dual prices per request',
          'Calibrate relevance scores to expected value in comparable units before they become objective coefficients, since the LP will happily maximize an uncalibrated score',
          'State each business rule as a linear constraint with an explicit slack, so an over-constrained slate degrades gracefully',
          'Refresh the dual prices on a schedule shorter than the drift of the traffic and the budgets they price',
        ],
        evaluation:
          'Online experiment on the downstream metric (revenue, delivery rate, long-run engagement), with constraint satisfaction (under- and over-delivery against budgets and quotas) as a guardrail metric. Offline, report the value of the LP allocation against the unconstrained greedy ranking, which shows what the constraints cost and what they bought.',
        pitfalls: [
          'Optimizing an uncalibrated score, which the LP exploits at the expense of the real objective',
          'Stale dual prices: budgets exhaust early or late because pacing multipliers were computed for traffic that no longer exists',
          'Using the LP where the problem has no shared resource, which is a sort with extra latency',
          'Treating the relevance model and the allocation layer as independent, so the score distribution shifts under the constraints and the scorer is never retrained for it',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'There is no training. The cost is the solve. A continuous LP with a million sparse variables is typically seconds to minutes with a modern open-source solver such as HiGHS, and warm-started re-solves after a small change are a fraction of that. An integer program is a different animal: solve time is heavy-tailed and not predictable from size, so a small model can run for hours and a large, well-formulated one can finish in seconds. Budget by the time limit, never by the average. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'The "inference" is the solve, run in batch on a schedule (hourly, daily, rolling-horizon), not per request. What reaches the serving path is small: the plan itself, or the dual prices so that a per-request decision is a subtraction and an argmax. The output is fully inspectable, since every decision can be traced to the binding constraints and their prices.',
    retrainingCadence:
      'Re-solve whenever the inputs change: new forecast, new capacities, new prices. The model structure changes only when business rules do, which is a deliberate change with review. A rolling horizon re-solves each period and commits only the first slice of the plan, and warm-starting from the previous basis or incumbent is the standard way to keep that inside the deadline.',
    driftAndMonitoring: [
      'Solve status and time distribution (median and 99th percentile), since a drifting data distribution shows up first as degeneracy and longer solves',
      'Optimality gap at termination for integer programs, and the rate of time-limit hits',
      'Infeasibility rate and which constraints are in the irreducible infeasible subset when it happens, which points at the bad data or conflicting rule',
      'Realized cost against the plan\'s predicted cost, which measures how wrong the inputs were; a persistent one-sided gap is a biased forecast',
      'Shadow-price and binding-set stability across solves: a basis that flips daily means the plan is unstable even if each solve is correct',
      'Numerical warnings (condition estimate, scaling messages), which precede spurious infeasibility',
    ],
    productionGotchas: [
      'Always set a time limit and a gap target, and always have a fallback plan (the previous plan or the best incumbent), because an integer program has no guarantee of finishing',
      'Alternative optima are returned arbitrarily, so solver version, thread count or row order can change the plan without any change in the data; add a tie-breaking secondary objective or fix the seed and threads when plan stability matters',
      'Shadow prices are valid only inside the range where the basis does not change, and are not unique under degeneracy, so a number shown to a planner needs its range and a caveat',
      'Numerical scaling is the silent failure: costs in millions beside capacities in thousandths produce false infeasibility or a plan that violates a rule by the tolerance',
      '"Infeasible" is a result and not an error to retry: the useful behaviour is to relax soft constraints with penalties and report exactly what was broken',
      'Licensing: commercial solvers are far faster on hard MILPs but are not zero-cost; HiGHS, OR-Tools and CBC cover the free-tier case, and the sensible architecture keeps the model solver-agnostic so the backend can be swapped',
      'The model is part of the product: version the formulation and its data lineage together, and keep a regression suite of instances with known optimal values',
    ],
  },

  assumptions: [
    'Proportionality and additivity: cost and resource use scale linearly with the decision and add across decisions. Economies of scale, discounts and interactions violate this and must be modelled with integers or approximated',
    'Certainty: the coefficients in A, b and c are treated as known. This is the assumption that real data violates, and stochastic or robust programming exists to relax it',
    'Divisibility, unless integrality is stated explicitly: continuous variables can take fractional values, and the integer set is where that stops being true',
    'The objective and the rules can be written down at all. If the objective is a black box, a simulator or a learned model, a heuristic such as the genetic algorithm is the tool, not this',
    'A scalar objective: several goals are collapsed into one weighted cost or handled lexicographically, and the weights are a modelling decision the solver cannot validate',
    'Numerically sane coefficients, spanning a limited range, so that tolerances mean what they claim to',
  ],

  pros: [
    {
      point: 'Convex, so a local optimum is the global optimum, and the result comes with a proof',
      context:
        'No restarts, no seeds and no "good enough" argument: the solver either returns the optimum, or an incumbent plus a bound saying how far from optimal it could be. Decisive for audited plans and capital decisions; irrelevant when the objective cannot be written as a linear function in the first place.',
    },
    {
      point: 'Duality gives shadow prices for free, which makes the answer explainable to the business',
      context:
        'The marginal value of one more unit of each resource comes out of the same solve and identifies the bottleneck. Valuable for budgeting and negotiation; it must be quoted with the range over which the basis holds and with a degeneracy caveat.',
    },
    {
      point: 'Mature, fast, free solvers and warm-starting',
      context:
        'HiGHS, OR-Tools and CBC handle large sparse models at zero cost, and a re-solve after a data change is much cheaper than the first solve. Matters for rolling-horizon operations; less so for a one-off model, where formulation time dominates.',
    },
    {
      point: 'Flexible modelling for its size: L1 and L-infinity objectives, minimax, fixed charges and logical rules all become linear',
      context:
        'Absolute values, maxima and either-or rules are all linearizable, so a surprising range of problems (quantile regression, robust fitting, scheduling) is exactly solvable. The range ends at anything quadratic or non-convex.',
    },
    {
      point: 'Network-structured problems solve as plain LPs with integral answers',
      context:
        'Assignment, transportation and min-cost flow have totally unimodular constraint matrices, so the vertex solution is already whole and no branching is needed. This is why those problems scale to millions of arcs while a generic integer program of the same size does not.',
    },
  ],

  cons: [
    {
      point: 'Integer variables make it NP-hard, with heavy-tailed solve times',
      context:
        'Two models of identical size can differ in solve time by orders of magnitude, and a deadline is not guaranteed to be met. Mitigated by a time limit, a gap target and a fallback plan, and by formulating tightly; it is a reason to ask whether integrality is genuinely required or a rounded LP is good enough.',
    },
    {
      point: 'Assumes the data are known, and optimizing against a forecast concentrates the plan on the forecast\'s errors',
      context:
        'A vertex solution is tight on its binding constraints, so any shortfall is felt at full price, and a point forecast under-hedges whenever costs are asymmetric. Addressed by quantile forecasts, scenarios or robust constraints, at the cost of a larger model; ignoring it is the standard way these systems disappoint in production.',
    },
    {
      point: 'Only linear: squared error, variance and economies of scale are outside the class',
      context:
        'Least squares and portfolio variance need a quadratic program, and non-convex or black-box objectives need other methods. Piecewise-linear approximation extends the reach at the price of extra integer variables.',
    },
    {
      point: 'A formulation is a model of reality, and the solver proves optimality only for the model',
      context:
        'A missing rule is exploited, not flagged, and a proxy cost is optimized faithfully into an unwanted plan. The mitigation is process: backtests against historical decisions, elastic constraints, and review of the plan by the people who must execute it.',
    },
    {
      point: 'Plans can be unstable: a small data change can flip the optimal basis',
      context:
        'Degenerate and tie-heavy problems return one of many equal optima, so schedules swing between runs. Fixable with stability penalties or a secondary objective; a serious operational problem for anything people have to act on daily.',
    },
    {
      point: 'Numerically fragile when coefficients span many orders of magnitude, with big-M constraints the worst offender',
      context:
        'Tolerances then misclassify feasible models as infeasible, and loose big-M values wreck the relaxation. Handled by scaling and by deriving every M from real bounds; rarely a problem on a well-scaled model, constant pain on a careless one.',
    },
  ],

  relatedSlugs: [
    'genetic-algorithm',
    'quantile-regression',
    'multi-armed-bandits',
    'dynamic-programming',
    'ridge-lasso',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Dense-tableau simplex, transcribed literally.

Solves   minimize c.x   subject to   A x <= b,  x >= 0,  with b >= 0.

b >= 0 is what lets us skip phase one: the slack variables form a ready-made
feasible starting basis (x = 0). Each block below is one step of the algorithm.
"""

TOL = 1e-9
MAX_PIVOTS = 10_000


def simplex(c, A, b):
    m = len(A)            # number of constraints
    n = len(c)            # number of decision variables
    width = n + m + 1     # decision columns, slack columns, right-hand side

    # Tableau rows are [ A | I | b ]; the last row is the cost row [ c | 0 | 0 ].
    tableau = []
    for i in range(m):
        row = list(A[i])
        row += [1.0 if k == i else 0.0 for k in range(m)]
        row.append(b[i])
        tableau.append(row)
    tableau.append(list(c) + [0.0] * m + [0.0])

    basis = [n + i for i in range(m)]     # slack i starts out basic

    for _ in range(MAX_PIVOTS):
        # 1. Pricing: entering column = the most negative reduced cost.
        enter = -1
        most_negative = -TOL
        for j in range(n + m):
            if tableau[m][j] < most_negative:
                most_negative = tableau[m][j]
                enter = j
        if enter == -1:
            break                         # no improving edge: optimal

        # 2. Ratio test: how far can we move before a basic variable hits 0?
        leave = -1
        best_ratio = float("inf")
        for i in range(m):
            if tableau[i][enter] > TOL:
                ratio = tableau[i][width - 1] / tableau[i][enter]
                if ratio < best_ratio:
                    best_ratio = ratio
                    leave = i
        if leave == -1:
            raise ValueError("unbounded: the objective falls without limit")

        # 3. Pivot: Gauss-Jordan elimination on (leave, enter).
        pivot = tableau[leave][enter]
        for j in range(width):
            tableau[leave][j] /= pivot
        for i in range(m + 1):
            if i == leave:
                continue
            factor = tableau[i][enter]
            for j in range(width):
                tableau[i][j] -= factor * tableau[leave][j]
        basis[leave] = enter
    else:
        raise RuntimeError("pivot limit reached; the problem may be cycling")

    x = [0.0] * n
    for i in range(m):
        if basis[i] < n:
            x[basis[i]] = tableau[i][width - 1]
    objective = -tableau[m][width - 1]
    # Reduced cost of slack i is -y_i, and y_i = d(objective)/d(b_i).
    shadow_prices = [-tableau[m][n + i] for i in range(m)]
    return x, objective, shadow_prices


if __name__ == "__main__":
    # minimize -3 x1 - 5 x2  (i.e. maximize 3 x1 + 5 x2)
    #   x1 <= 4,   2 x2 <= 12,   3 x1 + 2 x2 <= 18
    x, z, y = simplex([-3.0, -5.0], [[1, 0], [0, 2], [3, 2]], [4.0, 12.0, 18.0])
    print(x, z, y)    # [2.0, 6.0] -36.0 [0.0, -1.5, -1.0]`,
        profile:
          'O(m*n) per pivot in pure Python, over a dense tableau that stores every zero. Fine for a classroom problem, and roughly two orders of magnitude slower than the same arithmetic in BLAS.',
      },
      'make-it-right': {
        code: `"""Linear programming - a typed, validated two-phase simplex API.

Infeasible and unbounded problems are legitimate answers, not crashes, so each
has its own exception type the caller can catch without guessing from a message.
"""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

TOL = 1e-9
MAX_PIVOTS = 50_000


class LinearProgramError(Exception):
    """Base class for every outcome the solver reports on purpose."""


class InfeasibleError(LinearProgramError):
    """No x satisfies every constraint."""


class UnboundedError(LinearProgramError):
    """The objective falls without limit along a feasible ray."""


class PivotLimitError(LinearProgramError):
    """Cycling, or an instance harder than MAX_PIVOTS allows."""


@dataclass(frozen=True)
class LinearProgram:
    """minimize c.x  subject to  A x <= b,  x >= 0.  Validated on construction."""

    c: Vector
    A: Matrix
    b: Vector

    def __post_init__(self) -> None:
        if self.A.ndim != 2 or self.c.ndim != 1 or self.b.ndim != 1:
            raise ValueError("expected A (m, n), c (n,), b (m,)")
        rows, cols = self.A.shape
        if rows == 0 or cols == 0:
            raise ValueError("cannot solve an empty program")
        if self.c.shape != (cols,) or self.b.shape != (rows,):
            raise ValueError(
                f"shape mismatch: A={self.A.shape}, c={self.c.shape}, b={self.b.shape}"
            )
        for name, values in (("c", self.c), ("A", self.A), ("b", self.b)):
            if not np.isfinite(values).all():
                raise ValueError(f"{name} contains NaN or infinity")


@dataclass(frozen=True)
class Solution:
    x: Vector
    objective: float
    shadow_prices: Vector      # d(objective)/d(b_i), valid while the basis holds


def _pivot(tableau: Matrix, row: int, col: int) -> None:
    tableau[row] /= tableau[row, col]
    factors = tableau[:, col].copy()
    factors[row] = 0.0
    tableau -= np.outer(factors, tableau[row])      # one rank-1 update


def _run_simplex(tableau: Matrix, basis: NDArray[np.int_], eligible: int) -> None:
    """Pivot until optimal. Only columns below 'eligible' may enter the basis."""
    rows = tableau.shape[0] - 1
    for _ in range(MAX_PIVOTS):
        reduced = tableau[rows, :eligible]
        enter = int(np.argmin(reduced))
        if reduced[enter] >= -TOL:
            return
        column = tableau[:rows, enter]
        positive = column > TOL
        if not positive.any():
            raise UnboundedError("objective decreases without limit")
        ratios = np.full(rows, np.inf)
        ratios[positive] = tableau[:rows, -1][positive] / column[positive]
        leave = int(np.argmin(ratios))
        _pivot(tableau, leave, enter)
        basis[leave] = enter
    raise PivotLimitError(f"no optimum within {MAX_PIVOTS} pivots")


def solve(lp: LinearProgram) -> Solution:
    """Solve exactly. Raises InfeasibleError or UnboundedError, never returns garbage."""
    m, n = lp.A.shape

    # A row with b < 0 is negated so its right-hand side is >= 0; its slack then
    # enters with coefficient -1 and cannot start basic, so it gets an artificial.
    sign = np.where(lp.b < 0.0, -1.0, 1.0)
    art_rows = np.flatnonzero(sign < 0.0)
    k = art_rows.size
    art_cols = n + m + np.arange(k)

    tableau = np.zeros((m + 1, n + m + k + 1))
    tableau[:m, :n] = sign[:, None] * lp.A
    tableau[:m, n : n + m] = np.diag(sign)
    tableau[:m, -1] = sign * lp.b
    tableau[art_rows, art_cols] = 1.0
    basis = np.arange(n, n + m)
    basis[art_rows] = art_cols

    if k > 0:
        # Phase I: minimize the sum of the artificials. Zero means feasible.
        tableau[m, art_cols] = 1.0
        for row in art_rows:
            tableau[m] -= tableau[row]
        _run_simplex(tableau, basis, eligible=n + m + k)
        if -tableau[m, -1] > TOL:
            raise InfeasibleError("no point satisfies every constraint")
        for row in np.flatnonzero(basis >= n + m):      # drive artificials out
            real = np.flatnonzero(np.abs(tableau[row, : n + m]) > TOL)
            if real.size > 0:
                _pivot(tableau, int(row), int(real[0]))
                basis[row] = real[0]

    # Phase II: the true cost, priced out against the current basis.
    tableau[m] = 0.0
    tableau[m, :n] = lp.c
    for row, col in enumerate(basis):
        if col < n:
            tableau[m] -= lp.c[col] * tableau[row]
    _run_simplex(tableau, basis, eligible=n + m)

    x = np.zeros(n)
    for row, col in enumerate(basis):
        if col < n:
            x[col] = tableau[row, -1]
    return Solution(x=x, objective=float(-tableau[m, -1]), shadow_prices=-tableau[m, n : n + m])`,
        rationale:
          'The tableau loops collapse into one rank-1 update and one vectorised ratio test, and the contract changes: the first version assumed b >= 0 and had no way to say "infeasible", whereas this one adds a phase one so a negative right-hand side is handled and an unsatisfiable model raises InfeasibleError instead of returning nonsense. Unbounded and cycling outcomes get their own exception types, malformed inputs fail at construction rather than as an IndexError mid-pivot, and the frozen dataclasses make a problem and its solution immutable values.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile:
          'O(m*n) per pivot, executed as a BLAS-backed rank-1 update; still a dense tableau, so memory is O(m*(n+m)).',
      },
      'make-it-fast': {
        code: `"""Revised simplex with factorisation reuse - then the production MILP path."""

import numpy as np
import scipy.linalg as la
from numpy.typing import NDArray
from scipy import sparse
from scipy.optimize import Bounds, LinearConstraint, milp

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def revised_simplex(
    A: Matrix, b: Vector, c: Vector, basis: NDArray[np.int_],
    tol: float = 1e-9, max_pivots: int = 50_000,
) -> tuple[Vector, float, Vector]:
    """minimize c.x  s.t.  A x = b, x >= 0, from a feasible starting basis.

    No tableau and no explicit inverse. Each iteration factors the m x m basis
    ONCE and reuses that factorisation for all three solves it needs: the primal
    values, the duals, and the entering column.
    """
    m, total = A.shape
    basis = basis.copy()
    ratios = np.empty(m)                                   # reused every iteration

    for _ in range(max_pivots):
        factor = la.lu_factor(A[:, basis])                 # one O(m^3) factorisation...
        x_basic = la.lu_solve(factor, b)                   # ...B x_B = b
        duals = la.lu_solve(factor, c[basis], trans=1)     # ...B^T y = c_B
        reduced = c - A.T @ duals                          # price EVERY column in one matvec
        reduced[basis] = 0.0

        enter = int(np.argmin(reduced))
        if reduced[enter] >= -tol:
            x = np.zeros(total)
            x[basis] = x_basic
            return x, float(c @ x), duals

        direction = la.lu_solve(factor, A[:, enter])       # ...B d = a_enter
        positive = direction > tol
        if not positive.any():
            raise ValueError("unbounded")
        ratios.fill(np.inf)
        np.divide(x_basic, direction, out=ratios, where=positive)
        basis[int(np.argmin(ratios))] = enter
    raise RuntimeError("pivot limit reached")


def solve_milp(
    c: Vector, A_ub: Matrix, b_ub: Vector, is_integer: NDArray[np.bool_],
    time_limit_s: float, mip_rel_gap: float,
) -> Vector:
    """Production path once any variable must be integer: HiGHS via SciPy.

    Presolve, cutting planes and primal heuristics are the part a hand-rolled
    simplex does not have, and they dominate MILP solve time.
    """
    result = milp(
        c=c,
        constraints=LinearConstraint(sparse.csr_array(A_ub), ub=b_ub),
        integrality=is_integer.astype(int),
        bounds=Bounds(lb=0.0),
        options={"time_limit": time_limit_s, "mip_rel_gap": mip_rel_gap},
    )
    if result.status == 2:
        raise ValueError("infeasible")
    if result.status == 3:
        raise ValueError("unbounded")
    if result.x is None:
        raise TimeoutError(f"no incumbent within {time_limit_s}s: {result.message}")
    return result.x`,
        rationale:
          'The dense tableau, which updates every entry of an m x (n+m) array on every pivot, is replaced by a revised simplex that only ever touches the m x m basis, and that basis is factored once per iteration and reused for the primal values, the duals and the entering column. Pricing all columns collapses into a single matrix-vector product. The second function is the honest endpoint: once variables must be integer the right move is not a faster hand-written pivot but a library MILP solver, called once with the model as a sparse matrix and with explicit time and gap limits.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'The tableau carries the basis inverse implicitly and updates it on every pivot, which accumulates rounding error; here the basis is factored with partial-pivoting LU and solved against, never inverted, so the primal values, duals and entering column all come from one stable factorisation.',
            tradeoff: 'Refactoring the basis every iteration is O(m^3), which is worse than the tableau for small dense problems; production codes update the factorisation across pivots (Forrest-Tomlin or product form) for O(m^2), and refactor only periodically for stability.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Pricing every nonbasic column is c - A.T @ y, a single matrix-vector product, instead of a Python loop over columns computing one dot product each.',
            tradeoff: 'It prices all columns each iteration, which is wasted work for very wide problems; partial pricing (scan a subset) is cheaper per iteration and takes slightly more iterations.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The ratio buffer is allocated once outside the loop and filled in place with np.divide(out=..., where=...), so no array is created per pivot and non-candidate rows are masked out rather than divided.',
            tradeoff: 'Reusing a buffer makes the function non-reentrant if it is ever shared across threads, so each call owns its own.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'The MILP is handed to HiGHS as one sparse matrix in a single call, rather than assembled constraint by constraint through a Python modelling layer; presolve, cuts and the whole branch-and-bound tree then run in compiled code.',
            tradeoff: 'The solver is a black box: SciPy exposes no incumbent callback, no warm start and no basis access, so interactive control and re-solves need the highspy bindings instead.',
          },
        ],
        libraryName: 'SciPy (HiGHS)',
        profile:
          'Per iteration one O(m^3) dense LU plus O(m*n) pricing, with no tableau stored. Illustrative, not a measured benchmark; sparse HiGHS is far faster still on real models.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Dense-tableau simplex, transcribed literally.
// minimize c.x  subject to  A x <= b,  x >= 0,  with b >= 0 (slack basis is feasible).
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

struct Result {
  std::vector<double> x;
  double objective;
  std::vector<double> shadow_prices;   // d(objective) / d(b_i)
};

Result Simplex(const std::vector<double>& c,
               const std::vector<std::vector<double>>& A,
               const std::vector<double>& b) {
  const std::size_t m = A.size();
  const std::size_t n = c.size();
  const std::size_t width = n + m + 1;
  const double tol = 1e-9;

  // Rows are [ A | I | b ]; the last row is the cost row [ c | 0 | 0 ].
  std::vector<std::vector<double>> t(m + 1, std::vector<double>(width, 0.0));
  for (std::size_t i = 0; i < m; ++i) {
    for (std::size_t j = 0; j < n; ++j) t[i][j] = A[i][j];
    t[i][n + i] = 1.0;
    t[i][width - 1] = b[i];
  }
  for (std::size_t j = 0; j < n; ++j) t[m][j] = c[j];

  std::vector<std::size_t> basis(m);
  for (std::size_t i = 0; i < m; ++i) basis[i] = n + i;

  for (int pivots = 0; pivots < 10000; ++pivots) {
    // 1. Pricing: most negative reduced cost.
    std::size_t enter = n + m;
    double most_negative = -tol;
    for (std::size_t j = 0; j < n + m; ++j) {
      if (t[m][j] < most_negative) {
        most_negative = t[m][j];
        enter = j;
      }
    }

    if (enter == n + m) {                      // optimal: read the answer off
      Result result{std::vector<double>(n, 0.0), -t[m][width - 1],
                    std::vector<double>(m, 0.0)};
      for (std::size_t i = 0; i < m; ++i) {
        if (basis[i] < n) result.x[basis[i]] = t[i][width - 1];
        result.shadow_prices[i] = -t[m][n + i];
      }
      return result;
    }

    // 2. Ratio test.
    std::size_t leave = m;
    double best_ratio = std::numeric_limits<double>::infinity();
    for (std::size_t i = 0; i < m; ++i) {
      if (t[i][enter] > tol) {
        const double ratio = t[i][width - 1] / t[i][enter];
        if (ratio < best_ratio) {
          best_ratio = ratio;
          leave = i;
        }
      }
    }
    if (leave == m) throw std::runtime_error("unbounded");

    // 3. Pivot: Gauss-Jordan elimination on (leave, enter).
    const double pivot = t[leave][enter];
    for (std::size_t j = 0; j < width; ++j) t[leave][j] /= pivot;
    for (std::size_t i = 0; i <= m; ++i) {
      if (i == leave) continue;
      const double factor = t[i][enter];
      for (std::size_t j = 0; j < width; ++j) t[i][j] -= factor * t[leave][j];
    }
    basis[leave] = enter;
  }
  throw std::runtime_error("pivot limit reached");
}`,
        profile:
          'O(m*n) per pivot. vector<vector<double>> scatters the rows across the heap, so each pivot walks cold cache lines row by row.',
      },
      'make-it-right': {
        code: `// Linear programming - validated problem, RAII tableau, Status-based result.
// Infeasible and unbounded are expected outcomes of a well-posed question, so
// they are values in the result rather than exceptions.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

enum class Status { kOptimal, kInfeasible, kUnbounded, kPivotLimit };

struct Solution {
  Status status = Status::kPivotLimit;
  std::vector<double> x;
  double objective = 0.0;
  std::vector<double> shadow_prices;   // d(objective)/d(b_i), valid while the basis holds
};

inline constexpr double kTol = 1e-9;
inline constexpr int kMaxPivots = 50'000;

// minimize c.x  subject to  A x <= b,  x >= 0.  Immutable once constructed.
class LinearProgram {
 public:
  LinearProgram(std::vector<double> c, std::vector<double> a_row_major,
                std::vector<double> b)
      : c_(std::move(c)), a_(std::move(a_row_major)), b_(std::move(b)) {
    if (c_.empty() || b_.empty()) throw std::invalid_argument("empty program");
    if (a_.size() != b_.size() * c_.size()) {
      throw std::invalid_argument("A must have rows(b) x cols(c) entries");
    }
    const auto is_finite = [](double v) { return std::isfinite(v); };
    if (!std::all_of(c_.begin(), c_.end(), is_finite) ||
        !std::all_of(a_.begin(), a_.end(), is_finite) ||
        !std::all_of(b_.begin(), b_.end(), is_finite)) {
      throw std::invalid_argument("non-finite coefficient");
    }
  }

  [[nodiscard]] std::size_t rows() const noexcept { return b_.size(); }
  [[nodiscard]] std::size_t cols() const noexcept { return c_.size(); }
  [[nodiscard]] std::span<const double> row(std::size_t i) const {
    return {a_.data() + i * cols(), cols()};
  }
  [[nodiscard]] std::span<const double> c() const noexcept { return c_; }
  [[nodiscard]] std::span<const double> b() const noexcept { return b_; }

 private:
  std::vector<double> c_, a_, b_;      // rule of zero: no special members declared
};

// One contiguous row-major buffer; row(r) hands out a non-owning view.
class Tableau {
 public:
  Tableau(std::size_t rows, std::size_t cols)
      : rows_(rows), cols_(cols), data_(rows * cols, 0.0) {}

  [[nodiscard]] std::size_t rows() const noexcept { return rows_; }
  [[nodiscard]] std::size_t cols() const noexcept { return cols_; }
  [[nodiscard]] double& at(std::size_t r, std::size_t c) noexcept { return data_[r * cols_ + c]; }
  [[nodiscard]] double at(std::size_t r, std::size_t c) const noexcept { return data_[r * cols_ + c]; }
  [[nodiscard]] std::span<double> row(std::size_t r) noexcept { return {data_.data() + r * cols_, cols_}; }

  void Pivot(std::size_t pivot_row, std::size_t pivot_col) {
    std::span<double> pivot = row(pivot_row);
    const double inverse = 1.0 / pivot[pivot_col];
    for (double& value : pivot) value *= inverse;
    for (std::size_t r = 0; r < rows_; ++r) {
      if (r == pivot_row) continue;
      std::span<double> target = row(r);
      const double factor = target[pivot_col];
      if (factor == 0.0) continue;       // exact zero: nothing to eliminate
      for (std::size_t j = 0; j < cols_; ++j) target[j] -= factor * pivot[j];
    }
  }

 private:
  std::size_t rows_, cols_;
  std::vector<double> data_;
};

// Pivots until optimal. Only columns below 'eligible' may enter the basis.
Status RunSimplex(Tableau& t, std::vector<std::size_t>& basis, std::size_t eligible) {
  const std::size_t m = t.rows() - 1;
  const std::size_t rhs = t.cols() - 1;
  for (int pivots = 0; pivots < kMaxPivots; ++pivots) {
    std::size_t enter = eligible;
    double most_negative = -kTol;
    for (std::size_t j = 0; j < eligible; ++j) {
      if (t.at(m, j) < most_negative) {
        most_negative = t.at(m, j);
        enter = j;
      }
    }
    if (enter == eligible) return Status::kOptimal;

    std::size_t leave = m;
    double best = std::numeric_limits<double>::infinity();
    for (std::size_t i = 0; i < m; ++i) {
      if (t.at(i, enter) > kTol && t.at(i, rhs) / t.at(i, enter) < best) {
        best = t.at(i, rhs) / t.at(i, enter);
        leave = i;
      }
    }
    if (leave == m) return Status::kUnbounded;

    t.Pivot(leave, enter);
    basis[leave] = enter;
  }
  return Status::kPivotLimit;
}

Solution Solve(const LinearProgram& lp) {
  const std::size_t m = lp.rows();
  const std::size_t n = lp.cols();

  std::vector<std::size_t> art_rows;     // rows with b < 0 need an artificial
  for (std::size_t i = 0; i < m; ++i) {
    if (lp.b()[i] < 0.0) art_rows.push_back(i);
  }
  const std::size_t k = art_rows.size();
  const std::size_t rhs = n + m + k;

  Tableau t(m + 1, rhs + 1);
  std::vector<std::size_t> basis(m);
  std::size_t next_artificial = n + m;
  for (std::size_t i = 0; i < m; ++i) {
    const double sign = lp.b()[i] < 0.0 ? -1.0 : 1.0;   // make the rhs non-negative
    const std::span<const double> a_i = lp.row(i);
    for (std::size_t j = 0; j < n; ++j) t.at(i, j) = sign * a_i[j];
    t.at(i, n + i) = sign;
    t.at(i, rhs) = sign * lp.b()[i];
    if (sign < 0.0) {
      t.at(i, next_artificial) = 1.0;
      basis[i] = next_artificial++;
    } else {
      basis[i] = n + i;
    }
  }

  Solution out;
  if (k > 0) {                            // Phase I: minimize the artificials
    for (std::size_t a = n + m; a < n + m + k; ++a) t.at(m, a) = 1.0;
    for (const std::size_t i : art_rows) {
      for (std::size_t j = 0; j <= rhs; ++j) t.at(m, j) -= t.at(i, j);
    }
    out.status = RunSimplex(t, basis, rhs);
    if (out.status == Status::kPivotLimit) return out;
    if (-t.at(m, rhs) > kTol) {
      out.status = Status::kInfeasible;
      return out;
    }
    for (std::size_t i = 0; i < m; ++i) {  // drive leftover artificials out
      if (basis[i] < n + m) continue;
      for (std::size_t j = 0; j < n + m; ++j) {
        if (std::abs(t.at(i, j)) > kTol) {
          t.Pivot(i, j);
          basis[i] = j;
          break;
        }
      }
    }
  }

  std::span<double> cost_row = t.row(m);  // Phase II: the true cost, priced out
  std::fill(cost_row.begin(), cost_row.end(), 0.0);
  for (std::size_t j = 0; j < n; ++j) cost_row[j] = lp.c()[j];
  for (std::size_t i = 0; i < m; ++i) {
    if (basis[i] >= n) continue;
    const double cost = lp.c()[basis[i]];
    for (std::size_t j = 0; j <= rhs; ++j) cost_row[j] -= cost * t.at(i, j);
  }
  out.status = RunSimplex(t, basis, n + m);
  if (out.status != Status::kOptimal) return out;

  out.x.assign(n, 0.0);
  for (std::size_t i = 0; i < m; ++i) {
    if (basis[i] < n) out.x[basis[i]] = t.at(i, rhs);
  }
  out.objective = -t.at(m, rhs);
  out.shadow_prices.resize(m);
  for (std::size_t i = 0; i < m; ++i) out.shadow_prices[i] = -t.at(m, n + i);
  return out;
}`,
        rationale:
          'Three structural changes. The nested vectors become one contiguous row-major buffer behind a Tableau class, so a pivot streams through memory. The problem is a validated, immutable class: every shape and finiteness check happens in the constructor, before a single tableau cell is allocated. And the outcome is a Status in the result, because "infeasible" and "unbounded" are answers the caller must branch on, not exceptional events, while genuinely malformed input still throws. Phase one handles negative right-hand sides, which the first version could not.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'O(m*n) per pivot over a contiguous buffer, one allocation for the tableau; same asymptotics as before with the cache behaviour fixed.',
      },
      'make-it-fast': {
        code: `// Revised simplex - one LU factorisation per iteration, reused for every solve.
#include <Eigen/Dense>

#include <limits>
#include <stdexcept>
#include <vector>

struct RevisedResult {
  Eigen::VectorXd x;
  double objective;
  Eigen::VectorXd duals;      // shadow prices
};

// minimize c.x  subject to  A x = b,  x >= 0, from a feasible starting basis.
// No tableau and no explicit inverse: the m x m basis is factored once per
// iteration and that single factorisation answers three questions.
RevisedResult RevisedSimplex(const Eigen::MatrixXd& A, const Eigen::VectorXd& b,
                             const Eigen::VectorXd& c, std::vector<int> basis,
                             double tol = 1e-9, int max_pivots = 50000) {
  const Eigen::Index m = A.rows();
  const Eigen::Index total = A.cols();
  if (b.size() != m || c.size() != total || static_cast<Eigen::Index>(basis.size()) != m) {
    throw std::invalid_argument("dimension mismatch");
  }

  Eigen::MatrixXd basis_matrix(m, m);
  Eigen::VectorXd c_basic(m);
  Eigen::VectorXd reduced(total);

  for (int pivot = 0; pivot < max_pivots; ++pivot) {
    for (Eigen::Index k = 0; k < m; ++k) {        // column-major: contiguous copies
      basis_matrix.col(k) = A.col(basis[k]);
      c_basic(k) = c(basis[k]);
    }

    const Eigen::PartialPivLU<Eigen::MatrixXd> lu(basis_matrix);   // factor once...
    const Eigen::VectorXd x_basic = lu.solve(b);                    // ...B x_B = b
    const Eigen::VectorXd duals = lu.transpose().solve(c_basic);   // ...B^T y = c_B

    reduced.noalias() = c - A.transpose() * duals;  // price every column, fused
    for (const int index : basis) reduced(index) = 0.0;

    Eigen::Index enter = 0;
    if (reduced.minCoeff(&enter) >= -tol) {         // optimal
      RevisedResult result{Eigen::VectorXd::Zero(total), 0.0, duals};
      for (Eigen::Index k = 0; k < m; ++k) result.x(basis[k]) = x_basic(k);
      result.objective = c.dot(result.x);
      return result;
    }

    const Eigen::VectorXd direction = lu.solve(A.col(enter));      // ...B d = a_enter
    Eigen::Index leave = -1;
    double best_ratio = std::numeric_limits<double>::infinity();
    for (Eigen::Index k = 0; k < m; ++k) {
      if (direction(k) > tol && x_basic(k) / direction(k) < best_ratio) {
        best_ratio = x_basic(k) / direction(k);
        leave = k;
      }
    }
    if (leave < 0) throw std::runtime_error("unbounded");
    basis[leave] = static_cast<int>(enter);
  }
  throw std::runtime_error("pivot limit reached");
}

// Build with:  g++ -std=c++20 -O3 -march=native -DNDEBUG -I/path/to/eigen
// Optionally add -DEIGEN_USE_LAPACKE -llapacke -lopenblas to route the LU and
// the products through a tuned LAPACK/BLAS.`,
        rationale:
          'The tableau, whose every pivot rewrites an m x (n+m) array, is replaced by a revised simplex that touches only the m x m basis. That basis is LU-factored once and the same factorisation is reused for the primal values, the dual prices (via the transpose, with no second factorisation) and the entering column. Pricing every nonbasic column becomes one fused matrix-vector expression. The result is the same vertex sequence for far less arithmetic when n is much larger than m.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'reduced.noalias() = c - A.transpose() * duals evaluates in one pass into a preallocated vector; written with named intermediates it would allocate a temporary for the product and another for the difference on every pivot.',
            tradeoff: 'noalias() is a promise that the right-hand side does not overlap the destination; it is correct here and silently wrong if the expression is later edited to read from reduced.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The factorisation and the matrix-vector product are the O(m^3) and O(m*n) work; with EIGEN_USE_LAPACKE they dispatch to a blocked, multithreaded LAPACK/BLAS instead of Eigen\'s own kernels.',
            tradeoff: 'Adds a link-time dependency and a build-configuration axis, and for a small basis the dispatch overhead exceeds the arithmetic it saves.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen relies on the compiler to vectorize its kernels, and the dense LU and the product both depend on SIMD to be competitive.',
            tradeoff: '-march=native emits instructions the oldest CPU in the fleet may lack, so the binary is not portable across a mixed fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile:
          'Per iteration one O(m^3) LU plus O(m*n) pricing, no tableau stored; a production solver updates the factorisation for O(m^2). Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Dense-tableau simplex, transcribed literally.
//! minimize c.x  subject to  A x <= b,  x >= 0,  with b >= 0 (slack basis is feasible).

pub fn simplex(c: &[f64], a: &[Vec<f64>], b: &[f64]) -> (Vec<f64>, f64, Vec<f64>) {
    let m = a.len();
    let n = c.len();
    let width = n + m + 1;
    let tol = 1e-9;

    // Rows are [ A | I | b ]; the last row is the cost row [ c | 0 | 0 ].
    let mut t = vec![vec![0.0; width]; m + 1];
    for i in 0..m {
        for j in 0..n {
            t[i][j] = a[i][j];
        }
        t[i][n + i] = 1.0;
        t[i][width - 1] = b[i];
    }
    for j in 0..n {
        t[m][j] = c[j];
    }
    let mut basis: Vec<usize> = (0..m).map(|i| n + i).collect();

    for _ in 0..10_000 {
        // 1. Pricing: most negative reduced cost.
        let mut enter = None;
        let mut most_negative = -tol;
        for j in 0..n + m {
            if t[m][j] < most_negative {
                most_negative = t[m][j];
                enter = Some(j);
            }
        }
        let Some(enter) = enter else {
            // Optimal: read the answer off the tableau.
            let mut x = vec![0.0; n];
            for i in 0..m {
                if basis[i] < n {
                    x[basis[i]] = t[i][width - 1];
                }
            }
            let shadow_prices = (0..m).map(|i| -t[m][n + i]).collect();
            return (x, -t[m][width - 1], shadow_prices);
        };

        // 2. Ratio test.
        let mut leave = None;
        let mut best_ratio = f64::INFINITY;
        for i in 0..m {
            if t[i][enter] > tol {
                let ratio = t[i][width - 1] / t[i][enter];
                if ratio < best_ratio {
                    best_ratio = ratio;
                    leave = Some(i);
                }
            }
        }
        let leave = leave.expect("unbounded: the objective falls without limit");

        // 3. Pivot: Gauss-Jordan elimination on (leave, enter).
        let pivot = t[leave][enter];
        for j in 0..width {
            t[leave][j] /= pivot;
        }
        for i in 0..=m {
            if i == leave {
                continue;
            }
            let factor = t[i][enter];
            for j in 0..width {
                let delta = factor * t[leave][j];
                t[i][j] -= delta;
            }
        }
        basis[leave] = enter;
    }
    panic!("pivot limit reached; the problem may be cycling");
}`,
        profile:
          'O(m*n) per pivot. Every t[i][j] is bounds-checked, and Vec<Vec<f64>> scatters the rows across the heap.',
      },
      'make-it-right': {
        code: `//! Linear programming - a validated two-phase simplex with typed errors.

use std::fmt;

const TOL: f64 = 1e-9;
const MAX_PIVOTS: usize = 50_000;

#[derive(Debug, PartialEq)]
pub enum LpError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    NonFinite,
    Infeasible,
    Unbounded,
    PivotLimit,
}

impl fmt::Display for LpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot solve an empty program"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} entries in A, found {found}")
            }
            Self::NonFinite => write!(f, "coefficient is NaN or infinite"),
            Self::Infeasible => write!(f, "no point satisfies every constraint"),
            Self::Unbounded => write!(f, "objective falls without limit"),
            Self::PivotLimit => write!(f, "no optimum within the pivot limit"),
        }
    }
}

impl std::error::Error for LpError {}

#[derive(Debug, Clone)]
pub struct Solution {
    pub x: Vec<f64>,
    pub objective: f64,
    /// d(objective)/d(b_i); valid only while the optimal basis is unchanged.
    pub shadow_prices: Vec<f64>,
}

/// minimize c.x subject to A x <= b, x >= 0. A is row-major, m x n.
#[derive(Debug, Clone)]
pub struct LinearProgram {
    c: Vec<f64>,
    a: Vec<f64>,
    b: Vec<f64>,
}

impl LinearProgram {
    pub fn new(c: &[f64], a: &[f64], b: &[f64]) -> Result<Self, LpError> {
        if c.is_empty() || b.is_empty() {
            return Err(LpError::Empty);
        }
        if a.len() != b.len() * c.len() {
            return Err(LpError::ShapeMismatch { expected: b.len() * c.len(), found: a.len() });
        }
        if !c.iter().chain(a).chain(b).all(|v| v.is_finite()) {
            return Err(LpError::NonFinite);
        }
        Ok(Self { c: c.to_vec(), a: a.to_vec(), b: b.to_vec() })
    }

    pub fn solve(&self) -> Result<Solution, LpError> {
        let (m, n) = (self.b.len(), self.c.len());
        let art_rows: Vec<usize> = (0..m).filter(|&i| self.b[i] < 0.0).collect();
        let k = art_rows.len();
        let mut t = Tableau::new(m, n, n + m + k + 1);
        let rhs = t.width - 1;

        let mut next_artificial = n + m;
        for i in 0..m {
            let sign = if self.b[i] < 0.0 { -1.0 } else { 1.0 };
            let row = t.row_mut(i);
            for (dst, src) in row[..n].iter_mut().zip(&self.a[i * n..(i + 1) * n]) {
                *dst = sign * src;
            }
            row[n + i] = sign;
            row[rhs] = sign * self.b[i];
            if sign < 0.0 {
                row[next_artificial] = 1.0;
                t.basis[i] = next_artificial;
                next_artificial += 1;
            }
        }

        if k > 0 {
            // Phase I: minimize the sum of the artificials; zero means feasible.
            for artificial in n + m..n + m + k {
                t.row_mut(m)[artificial] = 1.0;
            }
            for &i in &art_rows {
                let source = t.row(i).to_vec();
                t.row_mut(m).iter_mut().zip(&source).for_each(|(v, s)| *v -= s);
            }
            t.run(rhs)?;
            if -t.row(m)[rhs] > TOL {
                return Err(LpError::Infeasible);
            }
            t.drive_out_artificials(n + m);
        }

        // Phase II: the true cost, priced out against the current basis.
        t.row_mut(m).fill(0.0);
        t.row_mut(m)[..n].copy_from_slice(&self.c);
        for i in 0..m {
            if t.basis[i] < n {
                let cost = self.c[t.basis[i]];
                let source = t.row(i).to_vec();
                t.row_mut(m).iter_mut().zip(&source).for_each(|(v, s)| *v -= cost * s);
            }
        }
        t.run(n + m)?;

        let mut x = vec![0.0; n];
        for (i, &col) in t.basis.iter().enumerate() {
            if col < n {
                x[col] = t.row(i)[rhs];
            }
        }
        let shadow_prices = t.row(m)[n..n + m].iter().map(|v| -v).collect();
        Ok(Solution { x, objective: -t.row(m)[rhs], shadow_prices })
    }
}

struct Tableau {
    data: Vec<f64>,
    width: usize,
    rows: usize,
    basis: Vec<usize>,
}

impl Tableau {
    /// One row per constraint plus the cost row; slack i starts out basic.
    fn new(constraints: usize, vars: usize, width: usize) -> Self {
        Self {
            data: vec![0.0; (constraints + 1) * width],
            width,
            rows: constraints + 1,
            basis: (vars..vars + constraints).collect(),
        }
    }

    fn row(&self, r: usize) -> &[f64] {
        &self.data[r * self.width..(r + 1) * self.width]
    }

    fn row_mut(&mut self, r: usize) -> &mut [f64] {
        &mut self.data[r * self.width..(r + 1) * self.width]
    }

    fn pivot(&mut self, pivot_row: usize, pivot_col: usize) {
        let divisor = self.row(pivot_row)[pivot_col];
        let pivot: Vec<f64> = self.row(pivot_row).iter().map(|v| v / divisor).collect();
        for (r, row) in self.data.chunks_exact_mut(self.width).enumerate() {
            if r == pivot_row {
                row.copy_from_slice(&pivot);
            } else {
                let factor = row[pivot_col];
                row.iter_mut().zip(&pivot).for_each(|(v, p)| *v -= factor * p);
            }
        }
    }

    /// Pivot until optimal; only columns below 'eligible' may enter.
    fn run(&mut self, eligible: usize) -> Result<(), LpError> {
        let m = self.rows - 1;
        let rhs = self.width - 1;
        for _ in 0..MAX_PIVOTS {
            let (enter, reduced) = self.row(m)[..eligible]
                .iter()
                .copied()
                .enumerate()
                .min_by(|a, b| a.1.total_cmp(&b.1))
                .ok_or(LpError::Empty)?;
            if reduced >= -TOL {
                return Ok(());
            }
            let leave = (0..m)
                .filter(|&i| self.row(i)[enter] > TOL)
                .map(|i| (i, self.row(i)[rhs] / self.row(i)[enter]))
                .min_by(|a, b| a.1.total_cmp(&b.1))
                .map(|(i, _)| i)
                .ok_or(LpError::Unbounded)?;
            self.pivot(leave, enter);
            self.basis[leave] = enter;
        }
        Err(LpError::PivotLimit)
    }

    fn drive_out_artificials(&mut self, first_artificial: usize) {
        for i in 0..self.rows - 1 {
            if self.basis[i] < first_artificial {
                continue;
            }
            let replacement = self.row(i)[..first_artificial].iter().position(|v| v.abs() > TOL);
            if let Some(col) = replacement {
                self.pivot(i, col);
                self.basis[i] = col;
            }
        }
    }
}`,
        rationale:
          'Panics become a typed LpError: malformed input is rejected at the constructor boundary, and Infeasible, Unbounded and PivotLimit are variants the caller can match on, so the compiler forces every outcome to be handled. The nested Vec becomes one flat buffer, the index loops become iterator chains, and phase one is added so a negative right-hand side is handled and an unsatisfiable model returns Err(Infeasible) instead of a wrong plan. min_by with total_cmp makes the pricing and ratio-test selections declarative.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'O(m*n) per pivot over a contiguous buffer; the pivot row is copied once per pivot, which the optimized stage removes.',
      },
      'make-it-fast': {
        code: `//! Dense simplex pivot, data-parallel over rows - and the production MILP path.

use good_lp::{constraint, default_solver, variable, variables, Expression, ResolutionError,
              Solution as _, SolverModel};
use rayon::prelude::*;

pub struct Tableau {
    data: Vec<f64>,       // one contiguous row-major buffer
    scratch: Vec<f64>,    // the normalised pivot row, reused by every pivot
    width: usize,
}

impl Tableau {
    pub fn from_rows(rows: &[&[f64]]) -> Self {
        let width = rows[0].len();
        let mut data = Vec::with_capacity(rows.len() * width);
        for row in rows {
            data.extend_from_slice(row);
        }
        Self { data, scratch: vec![0.0; width], width }
    }

    /// Gauss-Jordan pivot. Once the pivot row is normalised, every other row is
    /// updated independently from it, so the elimination is a parallel map over
    /// rows with no shared mutable state and no locking.
    #[inline]
    pub fn pivot(&mut self, pivot_row: usize, pivot_col: usize) {
        let width = self.width;
        let row = &mut self.data[pivot_row * width..(pivot_row + 1) * width];
        let inverse = 1.0 / row[pivot_col];
        row.iter_mut().for_each(|v| *v *= inverse);
        self.scratch.copy_from_slice(row);            // reused buffer: no per-pivot allocation

        let pivot = &self.scratch;
        self.data
            .par_chunks_exact_mut(width)
            .enumerate()
            .for_each(|(r, row)| {
                if r == pivot_row {
                    return;
                }
                let factor = row[pivot_col];
                if factor == 0.0 {
                    return;                           // exact zero: nothing to eliminate
                }
                row.iter_mut().zip(pivot).for_each(|(v, p)| *v -= factor * p);
            });
    }
}

/// The production path once any variable must be integer: HiGHS behind good_lp
/// (enable the crate's "highs" feature). Presolve, cuts and heuristics are what
/// a hand-written tableau does not have.
pub fn plan(
    profit: &[f64],
    usage: &[Vec<f64>],
    capacity: &[f64],
    is_integer: &[bool],
) -> Result<Vec<f64>, ResolutionError> {
    let mut vars = variables!();
    let x: Vec<_> = is_integer
        .iter()
        .map(|&integer| {
            let definition = variable().min(0.0);
            vars.add(if integer { definition.integer() } else { definition })
        })
        .collect();

    let objective: Expression = x.iter().zip(profit).map(|(&v, &p)| p * v).sum();
    let mut model = vars.maximise(objective).using(default_solver);
    for (row, &limit) in usage.iter().zip(capacity) {
        let used: Expression = x.iter().zip(row).map(|(&v, &a)| a * v).sum();
        model = model.with(constraint!(used <= limit));
    }

    let solution = model.solve()?;
    Ok(x.iter().map(|&v| solution.value(v)).collect())
}`,
        rationale:
          'The elimination step is the O(m*n) hot loop, and once the pivot row is normalised every other row updates independently, so it becomes a rayon parallel map over contiguous rows with no locking. The per-pivot allocation of the previous stage is replaced by one scratch row reused across pivots, and the buffer is built once with a known capacity. The second function is the honest endpoint for the integer case: model the problem declaratively and hand it to HiGHS through good_lp rather than extending a tableau with branching by hand.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'After the pivot row is normalised, each remaining row is a function of only itself and that row, so par_chunks_exact_mut spreads the elimination across cores with no shared mutable state.',
            tradeoff: 'Only the per-pivot update parallelises; the pivots themselves are strictly sequential, and below a few thousand rows the work-stealing overhead exceeds the O(m*n) arithmetic, so small models are faster serial.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The tableau is a single flat Vec processed as non-overlapping row slices, so each worker streams through memory and the compiler can vectorize the inner multiply-subtract.',
            tradeoff: 'A dense tableau stores every zero and updates them all, which is exactly the work a sparse revised simplex avoids; contiguity wins only while the problem is dense.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The buffer is sized once to rows x width before the rows are copied in, so building the tableau causes no growth reallocation of the largest array in the program.',
            tradeoff: 'The capacity must be known up front; a model that adds columns later (cutting planes) has to reserve for them or pay for the reallocation anyway.',
          },
          {
            technique: 'Eliminate needless clone() in the hot path',
            why: 'The previous stage collected a fresh normalised pivot row into a new Vec on every pivot; here the row is normalised in place and copied into one preallocated scratch buffer.',
            tradeoff: 'The scratch row makes pivot take &mut self and ties the buffer to one tableau, so two threads cannot pivot the same tableau concurrently.',
          },
        ],
        libraryName: 'rayon / good_lp (HiGHS)',
        profile:
          'O(m*n) per pivot, divided across cores for large dense tableaus, with zero per-pivot allocation. Illustrative, not a measured benchmark.',
      },
    },
  },
};
