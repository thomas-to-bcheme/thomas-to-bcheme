import type { AiMlModel } from '../../types';

/**
 * Genetic Algorithms & Stochastic Search — the optimizer that asks the least of
 * its problem.
 *
 * Authored as a technique, not a model: nothing is fitted to data and no
 * hypothesis class is learned. The deliverable is a candidate decision, and the
 * only thing the algorithm ever consumes is a ranking of candidates by a black-box
 * fitness. That is both the whole appeal (it runs where gradients, convexity and
 * even a closed-form objective are unavailable) and the whole cost (it spends
 * thousands of evaluations to learn what a gradient reads off in one).
 *
 * The code progression is built around the problem the method really has,
 * which is evaluation cost and reproducibility rather than the operators
 * themselves: the literal loop, then a typed and seeded API whose reruns are
 * bit-identical, then whole-population evaluation and breeding in parallel
 * with a per-child random stream so the answer does not depend on the thread
 * count.
 */
export const GENETIC_ALGORITHM: AiMlModel = {
  slug: 'genetic-algorithm',
  name: 'Genetic Algorithms & Stochastic Search',
  aliases: ['Genetic algorithm', 'Stochastic search', 'Evolutionary algorithms', 'Evolution strategies'],
  category: 'classical-ml',
  group: 'mathematical-optimization',
  kind: 'technique',

  // Both empty on purpose, and the one place this entry differs from a model:
  // see paradigmNote. A technique may carry no paradigm or task type; claiming
  // 'reinforcement' or 'control' here would be a label chosen for the filter
  // rather than for the method.
  paradigms: [],
  taskTypes: [],
  paradigmNote:
    'Not a learning paradigm at all: no parameters are fitted to data, and there is no training set, no generalization gap and no inference step. It is a search procedure that returns a candidate decision. It is sometimes filed under reinforcement learning because both improve from a scalar signal, but a genetic algorithm has no state, no policy and no credit assignment across time. It sees one number per candidate and nothing else. Listed with the other classical methods because it sits beside them as a way to choose a model configuration, and in its own group because that is a different job from fitting one.',

  intuition:
    'Keep a crowd of candidate answers and let the better ones have more children. Score every candidate with the fitness function, pick parents with a bias toward the high scorers, cut two parents together to make a child that inherits pieces of each, flip a few bits at random so the crowd keeps trying things nobody had, and repeat. The whole method is one dial: how hard to lean on what already works (selection pressure, crossover) against how hard to keep looking (mutation, population size). Lean too hard and the crowd collapses into near-copies of one decent answer, which is premature convergence. Lean too softly and it is random search with extra steps. The reason to accept that cost is what the fitness function is allowed to be. It can be a simulator, a lab assay, a compiled binary, a human rating, a backtest. It can be discontinuous, noisy, or defined over schedules and subsets and graphs where there is no gradient to take. The price is sample efficiency: a gradient method on a differentiable objective will beat it by orders of magnitude, so the honest question is never "is a genetic algorithm good" but "have I run out of anything cheaper that applies".',

  objective: {
    kind: 'fitness',
    expression: {
      formula:
        'x^{\\star} \\;=\\; \\arg\\max_{x \\in \\mathcal{X}} \\, f(x), \\qquad \\mathcal{X} = \\{0,1\\}^{L} \\;\\text{ or }\\; \\mathbb{R}^{d} \\;\\text{ or }\\; S_n, \\qquad \\text{given only } x \\mapsto f(x), \\text{ never } \\nabla f',
      symbols: [
        { symbol: 'f(x)', meaning: 'the fitness: a black box returning one number per candidate. It may be noisy, discontinuous, expensive, or the output of a simulator' },
        { symbol: '\\mathcal{X}', meaning: 'the search space, which is the representation choice: bit strings, real vectors, or permutations (S_n) for ordering problems' },
        { symbol: 'L,\\; d,\\; n', meaning: 'genome length for bit strings, dimension for real vectors, and number of items for permutations' },
        { symbol: 'x^{\\star}', meaning: 'the best candidate found. Not a certified optimum: nothing in the procedure proves that no better one exists' },
        { symbol: '\\nabla f', meaning: 'the gradient, which is exactly what this method does not need and exactly what you should use if it exists' },
      ],
    },
    reading:
      'Find the candidate with the highest score, when the only access to the score is by trying a candidate. Everything distinctive follows from that sentence. There is no loss surface to descend, so there is no learning rate, no backpropagation and no notion of a derivative; there is only a ranking, and rank-based selection such as a tournament does not even use the magnitude of f, so any monotone rescaling of the fitness leaves the run unchanged. That is also why the objective can be defined on a space with no geometry at all, such as the set of all schedules. The cost of that generality is a hard limit on what can be claimed: the output is the best candidate seen so far and a trace of how the search behaved, never a bound on how far it is from the optimum. If the problem is linear with linear constraints, a solver returns the optimum and a proof of it, and this method returns neither. Constraints are the second thing the formula hides. Here they are folded into f, by a penalty, a repair step, or a feasibility-first comparison, and the way that is done changes what the search converges to far more than the crossover operator does.',
  },

  optimization: {
    method: 'Population-based stochastic search: select parents by fitness, recombine, mutate, replace, and carry the best few forward unchanged (elitism)',
    updateRule: {
      formula:
        '\\begin{aligned} P_{t+1} &= \\mathrm{Elite}_{k}(P_t) \\;\\cup\\; \\mathrm{Mutate}_{p_m}\\Bigl(\\mathrm{Cross}_{p_c}\\bigl(\\mathrm{Select}(P_t;\\, f)\\bigr)\\Bigr) \\\\[4pt] \\mathbb{E}\\bigl[m(H,t{+}1)\\bigr] &\\;\\ge\\; m(H,t)\\,\\frac{\\bar f(H)}{\\bar f}\\Bigl[\\,1 - p_c\\,\\frac{\\delta(H)}{L-1} - o(H)\\,p_m\\Bigr] \\end{aligned}',
      symbols: [
        { symbol: 'P_t', meaning: 'the population at generation t: N candidate genomes' },
        { symbol: '\\mathrm{Select}(P_t; f)', meaning: 'pick parents with a bias toward high fitness. Tournament selection draws s candidates at random and keeps the best; roulette selection picks in proportion to fitness' },
        { symbol: '\\mathrm{Cross}_{p_c}', meaning: 'with probability p_c, splice two parents at a random cut point (one-point crossover); otherwise copy a parent' },
        { symbol: '\\mathrm{Mutate}_{p_m}', meaning: 'flip each bit independently with probability p_m, conventionally 1/L, so that about one bit changes per child' },
        { symbol: '\\mathrm{Elite}_k', meaning: 'the k best candidates copied to the next generation unmodified, so the best score found can never go down' },
        { symbol: 'H,\\; m(H,t)', meaning: 'a schema, meaning a pattern of fixed positions with wildcards elsewhere, and the number of population members matching it at generation t' },
        { symbol: '\\bar f(H) / \\bar f', meaning: 'the schema average fitness relative to the population average, which is the selection pressure acting on that pattern' },
        { symbol: '\\delta(H),\\; o(H)', meaning: 'the defining length (distance between outermost fixed positions) and order (number of fixed positions): the two quantities that decide how likely crossover and mutation are to break the pattern' },
      ],
    },
    rationale:
      'The second line is the schema theorem, read informally: a pattern of bits that is short, involves few fixed positions, and scores above the population average receives an exponentially growing share of the trials, because selection amplifies it by the fitness ratio while crossover and mutation only occasionally cut through it. That is the argument for why recombination can do something random restarts cannot, namely assemble good partial solutions found in different individuals into one. It is also much weaker than its reputation. It is an inequality about the next generation only, it says nothing about how new schemata are created, and the building-block hypothesis built on it, that real problems decompose into short independent blocks, is an assumption about the problem rather than a result about the algorithm. When the blocks are not independent (strong epistasis) crossover mostly destroys what selection built, and a mutation-only method such as a (1+1) evolution strategy or simulated annealing often wins. The practical reading is then a design rule: choose a genome encoding in which nearby bits interact and distant bits do not, and expect crossover to pay off only to that degree. Selection pressure and mutation rate are the exploration dial. Tournament size s sets how fast a good candidate takes over the population, roughly ln(N)/ln(s) generations. A mutation rate near 1/L per bit keeps about one change per child, which is the standard balance between local refinement and escape; a rate much above that is a random walk, and one well below it leaves the population unable to leave the basin it is in. Similarity belongs in this design too. Hamming distance, the count of differing bits, is the natural metric on bit-string genomes and it is what diversity-preserving variants use: fitness sharing divides each candidate fitness by the number of neighbours inside a niche radius, and crowding makes a child replace the most similar parent instead of the worst member. Swapping the metric breaks that silently. Hamming on a plain binary encoding of an integer has cliffs (7 and 8 differ in four bits though they are adjacent), so Gray-code the integer or the niches mean nothing. Euclidean distance is the right one for real-valued genomes, but only after each gene is scaled to a comparable range, or one wide-range gene decides every niche. And neither is meaningful for permutations, where a position-based or ordering distance such as Kendall tau is the matching choice.',
    hyperparameters: [
      { name: 'population size N', role: 'Parallel hypotheses held at once. More diversity and slower convergence per generation; scales with how rugged the landscape is more than with genome length', typicalRange: '50 to 1,000' },
      { name: 'generations G', role: 'Search budget. Total evaluations are about N times G, and that product is the real cost knob', typicalRange: '100 to 10,000, or stop on stagnation' },
      { name: 'tournament size s', role: 'Selection pressure. s of 2 is gentle; large s takes over the population quickly and invites premature convergence', typicalRange: '2 to 7' },
      { name: 'crossover rate p_c', role: 'How often two parents are spliced rather than one being copied. Worth lowering when the encoding has strong interactions between distant genes', typicalRange: '0.6 to 0.95' },
      { name: 'mutation rate p_m', role: 'Per-gene change probability, the main source of new material. 1/L means about one flip per child; for real-valued genomes the equivalent is the step size sigma, which strong methods adapt online', typicalRange: '0.5/L to 3/L per bit' },
      { name: 'elite count k', role: 'Candidates carried over unchanged, which guarantees monotone best-so-far. Too many reduce the population to its elite', typicalRange: '1 to 5 percent of N' },
      { name: 'niche radius sigma_share', role: 'Hamming (or scaled Euclidean) distance inside which candidates share fitness, in the diversity-preserving variant. Too small does nothing; too large merges real optima into one niche', typicalRange: 'a few percent of L, tuned on diversity curves' },
      { name: 'random seed and restarts', role: 'The run is a random variable. Seed it for reproducibility, and judge the method by its distribution over many seeds, never by one run', typicalRange: '20 or more seeds per configuration' },
    ],
    convergence:
      'There is no finite-time guarantee, and being precise about what is guaranteed matters. With elitism and a mutation operator that can reach any genome, the best score converges to the global optimum in probability as generations grow without bound, but random search satisfies the same statement, so it distinguishes nothing. What is known is mostly problem-specific runtime analysis: a (1+1) evolutionary algorithm solves OneMax in expected time of order L log L evaluations, and that sort of result does not extend to general landscapes. The No Free Lunch theorems apply in full: averaged over all possible fitness functions no search strategy beats another, so a genetic algorithm helps exactly to the degree that nearby candidates have correlated fitness and good partial solutions recombine, and a problem with neither is random search. The failures are specific and observable. Premature convergence is the diversity collapsing: the population fills with near-copies, mean pairwise Hamming distance falls toward zero, and further generations only polish one basin. A deceptive landscape, where the short patterns that look good lead away from the optimum, defeats the schema argument by construction. Epistasis makes crossover destructive. Noisy fitness lets a lucky evaluation of a mediocre candidate win a tournament and, once elitism has frozen it, stick forever unless elites are re-evaluated. And a penalty weight set too low converges to an infeasible optimum while one set too high produces a population that never crosses the feasibility boundary where the good solutions live.',
    complexity:
      'O(G * N * (L + C_f)) time, where C_f is the cost of one fitness evaluation, and in practice C_f dominates everything: for a simulator or a model-training run the operators are free and the whole cost is evaluations. Memory is O(N * L) for the population, plus the cached scores. The embarrassingly parallel structure is the main practical lever, since the N evaluations in a generation are independent, but the generations themselves are strictly sequential. Cost scales with how many evaluations you can afford rather than with problem size, which is a real advantage when f is cheap and a real disqualifier when each evaluation takes minutes.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'It does not forecast. It searches the space of forecasting pipelines. Encode a configuration as a genome: which lags enter (a bit mask), the differencing order, the seasonal period, the regularization strength, the tree depth, the ensemble weights. Define fitness as the negative error of a rolling-origin backtest of that configuration, and let the population search the mixed discrete-and-continuous space. The forecast itself is still made by the model the search selects.',
        where: [
          'Lag and feature subset selection for a gradient-boosted or linear forecaster, where the mask is a bit string and the objective is a backtest score',
          'Hyperparameter search for a forecasting pipeline whose space mixes categorical choices (model family, seasonality handling) with continuous ones',
          'Choosing ensemble weights or a combination of base forecasters under a non-differentiable metric such as pinball loss at several quantiles or a business cost',
          'Calibrating the parameters of a simulation-based demand model where the likelihood is intractable and only simulated-versus-observed error is available',
        ],
        why: 'A reasonable choice when the configuration space is mixed and structured and the metric is not differentiable, and an honest second choice when it is not. Each fitness evaluation here is a full backtest, which is expensive, and for a few continuous hyperparameters Bayesian optimization or even plain random search reaches a comparable result in far fewer evaluations. The genetic algorithm earns its place on the combinatorial part: subset selection over dozens of lags and exogenous features, where the space is too large to enumerate and recombining two good masks is a sensible move. Treat it as a way to pick the configuration, never as part of the forecaster, and be wary of how it can overfit the selection itself.',
        featurization: [
          'Encode the configuration so that nearby genomes are similar configurations: a bit mask for lags, a Gray-coded or real-valued gene for ordered hyperparameters',
          'Make fitness a rolling-origin backtest error scaled against a seasonal-naive baseline (MASE), so scores are comparable across series',
          'Cache the score of every distinct genome, since the same mask recurs and a backtest is the expensive step',
          'Hold out a final period that the search never scores, to measure the selection effect honestly',
        ],
        evaluation:
          'Measure the selected configuration on a final held-out window that the search never saw, against a well-tuned random-search baseline given the same number of backtests. The comparison that matters is score at equal evaluation budget; a genetic algorithm that merely matches random search at the same cost has not justified its machinery.',
        pitfalls: [
          'Selection overfits the backtest: the winning configuration is the luckiest of thousands scored on the same folds, so its in-search score is optimistically biased (the same winner curse as stepwise selection)',
          'Look-ahead leakage inside the fitness function silently rewards configurations that peek at the future, and the search is very good at finding exactly that',
          'Stochastic model training makes fitness noisy, so a lucky run of a mediocre configuration is promoted and frozen by elitism unless elites are re-scored',
          'Running a backtest per candidate per generation without caching, which spends most of the budget re-evaluating genomes already seen',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'It searches for a decision that maximizes a score and defines no notion of normal behaviour or of an unusual observation, so there is nothing to detect with; it can tune a detector hyperparameters, but that is optimization applied to a detector rather than detection.',
      },
      optimization: {
        fit: 'primary',
        how: 'Treat the problem as a black box f over a candidate representation and search it with a population. Choose a genome that makes feasible solutions easy to represent (a bit string for subsets, a permutation for orderings, a real vector for continuous parameters), a fitness that folds constraints in by penalty, repair or feasibility-first comparison, and variation operators that respect the structure (order crossover for permutations, not one-point). The output is the best candidate found plus the convergence and diversity traces that say whether to trust it.',
        where: [
          'Hyperparameter and neural architecture search, where each evaluation is a training run and the space mixes discrete structure with continuous settings',
          'Scheduling and timetabling (shifts, exams, job-shop sequences), where constraints are numerous, messy and awkward to write as a linear program',
          'Engineering and design optimization against a simulator, such as antenna shapes, airfoils or layout, where f is a physics solver and no gradient exists',
          'Feature and subset selection, where the genome is a mask and fitness is a cross-validated score',
          'Routing and packing heuristics (travelling salesman, bin packing) at sizes where exact solvers stall, often as a metaheuristic wrapped around local search',
        ],
        why: 'The right tool when the objective cannot be differentiated, cannot be written down in closed form, and is too irregular for a convex or mixed-integer formulation, and the wrong tool in almost every other case. The order of preference matters. If f is differentiable, use gradients, which are orders of magnitude more sample-efficient. If it is linear with linear constraints, use linear or mixed-integer programming, which is exact and returns an optimality certificate that this method cannot give. If it is continuous, smooth enough and low-dimensional, CMA-ES adapts its own step size and covariance and usually beats a hand-built genetic algorithm. If each evaluation is expensive and the dimension is modest, Bayesian optimization spends evaluations far more carefully. Simulated annealing and random search are the honest siblings in stochastic search: they have no population and no crossover, they are simpler, and on a surprising number of problems they match a genetic algorithm. What a genetic algorithm uniquely offers is recombination, so it deserves the job only when good partial solutions genuinely combine, and when a population of diverse answers (several different good designs, not one) is itself useful.',
        featurization: [
          'Choose the encoding so that distance between genomes tracks distance between solutions; Hamming distance on bits, scaled Euclidean on reals, a position or order distance on permutations',
          'Gray-code integers that are stored as bits, or Hamming-1 neighbours will not be adjacent in value',
          'Handle constraints deliberately: a repair step that always returns a feasible solution, or a feasibility-first comparison rule, is usually sturdier than a hand-tuned penalty weight',
          'Normalise the fitness scale if using roulette selection, since proportional selection is sensitive to offsets that tournament selection ignores',
          'Cache evaluations by genome hash; duplicates are common once the population starts to converge',
        ],
        evaluation:
          'Report the distribution of best-so-far fitness against number of fitness evaluations across at least twenty seeds, with a median and an interquartile band, and compare it with random search and simulated annealing at the same evaluation budget. A single lucky run proves nothing. Track mean pairwise Hamming distance each generation to diagnose premature convergence directly, and when an exact method is applicable, measure the optimality gap against its certified bound.',
        pitfalls: [
          'Using it where a gradient, a linear program or a convex solver applies, which wastes orders of magnitude in evaluations and gives up the optimality proof',
          'Reporting the best of many runs as though it were the expected result, which hides the variance that is the main property of the method',
          'Premature convergence mistaken for convergence: the best score stops rising because the population stopped exploring, not because the optimum was reached',
          'A penalty weight tuned until the demo works, which then fails on the next instance; this is the usual source of an infeasible final answer',
          'Applying one-point crossover to a permutation, which produces duplicate and missing items and needs a repair step the code did not have',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'viable',
        how: 'Scheduling, routing, rostering and packing problems are search over discrete arrangements with many awkward rules. Encode an arrangement as a genome (a permutation of jobs, an assignment vector), define fitness as total cost with penalties for violated rules, and let the population search. In practice it is most often the outer loop of a hybrid, with a fast local-search or constructive heuristic polishing each child (a memetic algorithm).',
        where: [
          'Job-shop and flow-shop sequencing, where a permutation encodes the order and a decoder builds the schedule',
          'Staff rostering and exam timetabling with a long list of soft preferences and hard rules',
          'Vehicle routing and delivery-sequence heuristics at sizes beyond exact solvers',
          'Layout and bin-packing heuristics where the evaluation is a placement simulator',
        ],
        why: 'Viable rather than primary, and the reason is the competition. Where the problem has linear structure, a mixed-integer solver with a modern branch-and-cut engine returns a provably optimal or bounded answer and routinely handles instances that practitioners assume need a heuristic. Constraint programming is the other strong alternative for rule-heavy scheduling. A genetic algorithm earns its keep when the rules do not fit those formalisms (a simulator evaluates the schedule), when a good-enough answer within a time budget is acceptable, or when a warm start from the current schedule matters, since a population can be seeded with the incumbent plus perturbations. It is the pragmatic choice, not the principled one, and the optimality gap it leaves is unknown unless you also solve a relaxation.',
        featurization: [
          'Use a representation plus a decoder that always yields a feasible schedule, so the search never wastes evaluations on infeasible ones',
          'Pair permutation genomes with order-preserving crossover (order crossover, partially mapped crossover) rather than one-point cuts',
          'Seed the initial population with the incumbent schedule and perturbations of it, plus a few random immigrants to keep diversity',
          'Separate hard constraints (repair or reject) from soft preferences (weighted cost)',
        ],
        evaluation:
          'Compare cost against the incumbent heuristic and, where tractable, against the bound from a mixed-integer relaxation, so that the gap is a number rather than a feeling. Re-run on perturbed instances to measure robustness, and report time-to-target alongside final cost, since the time budget is usually the binding constraint.',
        pitfalls: [
          'Treating the best schedule found as optimal when no bound was ever computed',
          'A decoder that is slow, which makes it the whole cost; the search is only as fast as one fitness evaluation',
          'Over-tuned penalty weights that encode this week data and break when demand changes',
          'Solving a problem a mixed-integer solver would have settled exactly, in a fraction of the engineering time',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'There is no training, and the cost is entirely evaluations: roughly population size times generations times the cost of one fitness evaluation. When fitness is a few arithmetic operations (a knapsack score) a search of a million evaluations is seconds. When it is a model-training run or a simulator, the same count is days and the operators are free by comparison, so the parallelism of evaluating a generation at once, across cores or machines, is the main lever. Illustrative cost profile, not a measured benchmark.',
    inferenceProfile:
      'The output is a solution, not a model, so there is no inference step, and serving the result is free. The recurring cost is re-running the search whenever the instance changes. For repeated decisions (daily rosters, hourly schedules), warm-starting from the previous solution and bounding the run by a wall-clock budget rather than a generation count is what makes it deployable.',
    retrainingCadence:
      'Re-run whenever the problem instance changes: new orders, new constraints, new costs. This is an event, not a drift. Seed the new population with the previous best and perturbations of it, plus a fraction of random immigrants, so the search starts from a good answer without being trapped in the old basin.',
    driftAndMonitoring: [
      'Mean pairwise Hamming distance (or scaled Euclidean distance for real genomes) per generation, since a collapse toward zero is premature convergence caught early',
      'Best-versus-mean fitness gap per generation, which measures remaining selection pressure',
      'Best-so-far fitness against evaluation count across seeds, summarised as median and interquartile band, to detect a regression in search quality after any change',
      'Fraction of feasible candidates in the population, which exposes a penalty weight drifting away from the constraint boundary',
      'Evaluation cache hit rate, a free indicator of how much of the budget is spent on genomes already seen',
    ],
    productionGotchas: [
      'Seed every run and thread the generator explicitly; with a global random source or a thread-dependent stream, the same input produces a different answer and no regression can be diagnosed',
      'In a parallel run, derive each child random stream from (seed, generation, child index) instead of sharing one generator, or the result depends on thread scheduling',
      'Noisy fitness plus elitism freezes a lucky evaluation: re-evaluate elites each generation, or average several evaluations, when the function is stochastic',
      'Quote the distribution over seeds, not the best run, or the headline number will not reproduce',
      'Penalty-based constraint handling is a hidden hyperparameter that interacts with the instance scale, so prefer repair or feasibility-first comparison where possible',
      'Evaluate in batches and cache by genome hash; duplicates become the majority of the population near convergence',
      'A wall-clock budget needs a stopping rule that tolerates an unfinished generation, and the result must still be a valid, feasible candidate',
    ],
  },

  assumptions: [
    'Fitness is cheap enough to afford on the order of N times G evaluations, which is thousands to millions; if each takes minutes, a sample-efficient method such as Bayesian optimization is the better choice',
    'Fitness has some locality: genomes that are close under the chosen distance (Hamming for bits, Euclidean for reals) tend to score similarly. Without it the landscape is random and so is the search',
    'For crossover to help, good partial solutions must recombine: short groups of genes contribute fitness fairly independently, which is the building-block assumption and is a property of the problem, not of the algorithm',
    'Constraints can be expressed through the encoding, a repair step, or the fitness, in a way that does not distort what is being optimized',
    'The fitness function is stationary within a run, or its noise is handled explicitly, since elitism and selection assume a score means the same thing in generation 5 as in generation 500',
    'A good answer, not a proven-optimal one, is acceptable, because the method returns the best candidate found and no certificate',
  ],

  pros: [
    {
      point: 'Needs only the ability to score a candidate: no gradient, no convexity, no closed form',
      context:
        'The decisive advantage when f is a simulator, a physical experiment, or defined on schedules, subsets and graphs. Worthless when f is differentiable, since gradient methods then get the same answer in far fewer evaluations.',
    },
    {
      point: 'Handles discrete, combinatorial and mixed search spaces natively',
      context:
        'Feature masks, orderings and architecture choices are the genome itself, with no relaxation step. The catch is that the encoding and operators carry the real intelligence, and a poor encoding makes it slower than random search.',
    },
    {
      point: 'Returns a population of diverse good answers, not one',
      context:
        'Useful when several distinct designs are wanted (trade-offs along a Pareto front with a multi-objective variant), or when the best answer may be infeasible for reasons the fitness did not capture. Irrelevant when only the single best value counts.',
    },
    {
      point: 'Embarrassingly parallel across the population within a generation',
      context:
        'Evaluations are independent, so throughput scales with cores or machines when fitness is expensive. It does nothing for the sequential dependence between generations, so wall-clock speedup caps at the population size.',
    },
    {
      point: 'Tolerates noise, discontinuity and plateaus that break local methods',
      context:
        'Rank-based selection ignores the magnitude of f, so a few outliers do not dominate. Noise still needs explicit handling, because elitism will freeze a lucky evaluation.',
    },
  ],

  cons: [
    {
      point: 'Sample-inefficient: spends thousands of evaluations to learn what a gradient reads off in one',
      context:
        'Dominant cost when each evaluation is a training run. If f is differentiable, gradient methods are orders of magnitude cheaper; if evaluations are expensive and the dimension is modest, Bayesian optimization is the better deal.',
    },
    {
      point: 'No optimality guarantee and no bound on how far the answer is from the best',
      context:
        'A mixed-integer or linear solver returns a certificate; this returns a candidate and a convergence plot. Acceptable for engineering heuristics, unacceptable where a proof of optimality or a worst-case gap is required.',
    },
    {
      point: 'Premature convergence: the population collapses into near-copies of one decent answer',
      context:
        'Caused by selection pressure outrunning mutation. Visible as mean Hamming distance falling toward zero while best fitness plateaus. Mitigated with fitness sharing, crowding, a lower tournament size, or restarts, and each mitigation costs speed.',
    },
    {
      point: 'Many interacting hyperparameters, and results depend on them and on the random seed',
      context:
        'Population size, mutation rate, selection pressure and the penalty weight interact, and a single run is a random sample. Judge it by a distribution over seeds; a one-off demo that works is the usual source of disappointment.',
    },
    {
      point: 'Often matched by simpler stochastic search',
      context:
        'Random search is a strong baseline for hyperparameters, and simulated annealing or a (1+1) evolution strategy needs no crossover and often ties on rugged landscapes. The population machinery earns its cost only when recombination of building blocks actually helps.',
    },
  ],

  relatedSlugs: ['linear-programming', 'multi-armed-bandits', 'stepwise-regression', 'random-forest', 'gradient-boosting'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A genetic algorithm on 0/1 knapsack - every operator written out.

Population, fitness, tournament selection, one-point crossover, bit-flip
mutation, elitism. The only thing the search ever asks of the problem is
fitness(genome) -> number: no gradient, no structure, just a ranking.
"""

import random


def fitness(genome, values, weights, capacity):
    total_value = 0
    total_weight = 0
    for j in range(len(genome)):
        if genome[j] == 1:
            total_value += values[j]
            total_weight += weights[j]

    if total_weight > capacity:
        # infeasible: rank by how far over the limit, so any feasible genome wins
        return -(total_weight - capacity)
    return total_value


def hamming(a, b):
    return sum(1 for j in range(len(a)) if a[j] != b[j])


def diversity(population):
    """Mean pairwise Hamming distance: it collapsing is premature convergence."""
    total = 0
    pairs = 0
    for i in range(len(population)):
        for k in range(i + 1, len(population)):
            total += hamming(population[i], population[k])
            pairs += 1
    return total / pairs


def tournament(population, scores, size):
    best = random.randrange(len(population))
    for _ in range(size - 1):
        challenger = random.randrange(len(population))
        if scores[challenger] > scores[best]:
            best = challenger
    return population[best]


def evolve(values, weights, capacity, pop_size=60, generations=200,
           tournament_size=3, crossover_rate=0.9, elite=2):
    length = len(values)
    mutation_rate = 1.0 / length          # about one flipped bit per child
    population = [[random.randint(0, 1) for _ in range(length)]
                  for _ in range(pop_size)]
    history = []

    for generation in range(generations):
        scores = [fitness(g, values, weights, capacity) for g in population]
        history.append((max(scores), diversity(population)))

        # elitism: the best genomes pass to the next generation unchanged
        ranked = sorted(range(pop_size), key=lambda i: scores[i], reverse=True)
        next_population = [population[i][:] for i in ranked[:elite]]

        while len(next_population) < pop_size:
            mother = tournament(population, scores, tournament_size)
            father = tournament(population, scores, tournament_size)

            if random.random() < crossover_rate:
                cut = random.randint(1, length - 1)      # one-point crossover
                child = mother[:cut] + father[cut:]
            else:
                child = mother[:]

            for j in range(length):
                if random.random() < mutation_rate:
                    child[j] = 1 - child[j]              # bit flip
            next_population.append(child)

        population = next_population

    scores = [fitness(g, values, weights, capacity) for g in population]
    best = max(range(pop_size), key=lambda i: scores[i])
    return population[best], scores[best], history`,
        profile: 'O(G * N * (L + tournament)) in pure Python, plus an O(N^2 * L) diversity measure every generation that dominates for large N.',
      },
      'make-it-right': {
        code: `"""Genetic algorithm - typed, seeded, validated, bit-identical on rerun."""

from dataclasses import dataclass
from typing import Callable

import numpy as np
from numpy.typing import NDArray

Genome = NDArray[np.bool_]           # shape (L,)
Population = NDArray[np.bool_]       # shape (N, L)
Fitness = Callable[[Genome], float]  # the only thing the problem supplies


@dataclass(frozen=True)
class GAConfig:
    pop_size: int = 100
    generations: int = 200
    tournament_size: int = 3
    crossover_rate: float = 0.9
    mutation_rate: float | None = None   # None means 1/L
    elite: int = 2
    seed: int = 0

    def __post_init__(self) -> None:
        if self.pop_size < 2:
            raise ValueError(f"pop_size must be at least 2, got {self.pop_size}")
        if not 0 <= self.elite < self.pop_size:
            raise ValueError(f"elite must be in [0, pop_size), got {self.elite}")
        if self.tournament_size < 1:
            raise ValueError("tournament_size must be at least 1")
        for name in ("crossover_rate", "mutation_rate"):
            rate = getattr(self, name)
            if rate is not None and not 0.0 <= rate <= 1.0:
                raise ValueError(f"{name} must be in [0, 1], got {rate}")


@dataclass(frozen=True)
class GAResult:
    best_genome: Genome
    best_fitness: float
    best_history: NDArray[np.float64]
    diversity_history: NDArray[np.float64]
    evaluations: int


def mean_pairwise_hamming(population: Population) -> float:
    """Mean Hamming distance over all pairs in O(N*L), not O(N^2 * L).

    Per locus, k ones and (N - k) zeros contribute k * (N - k) differing pairs.
    """
    n = population.shape[0]
    ones = population.sum(axis=0, dtype=np.int64)
    return float((ones * (n - ones)).sum()) / (n * (n - 1) / 2)


def _tournament(scores: NDArray[np.float64], size: int, count: int,
                rng: np.random.Generator) -> NDArray[np.intp]:
    contenders = rng.integers(0, scores.size, size=(count, size))
    best_slot = scores[contenders].argmax(axis=1)
    return contenders[np.arange(count), best_slot]


def _crossover(mothers: Population, fathers: Population, rate: float,
               rng: np.random.Generator) -> Population:
    count, length = mothers.shape
    cut = rng.integers(1, length, size=(count, 1))
    children = np.where(np.arange(length) < cut, mothers, fathers)
    keep_mother = rng.random(count) >= rate
    children[keep_mother] = mothers[keep_mother]
    return children


def evolve(fitness: Fitness, genome_length: int, config: GAConfig) -> GAResult:
    """Maximise fitness over bit strings. Same config and seed, same answer."""
    if genome_length < 2:
        raise ValueError(f"genome_length must be at least 2, got {genome_length}")

    rng = np.random.default_rng(config.seed)   # explicit stream, never global
    rate = config.mutation_rate if config.mutation_rate is not None else 1.0 / genome_length
    n_children = config.pop_size - config.elite

    population: Population = rng.random((config.pop_size, genome_length)) < 0.5
    scores = np.array([fitness(genome) for genome in population], dtype=np.float64)
    evaluations = config.pop_size
    best_history = np.empty(config.generations)
    diversity_history = np.empty(config.generations)

    for generation in range(config.generations):
        best_history[generation] = scores.max()
        diversity_history[generation] = mean_pairwise_hamming(population)

        elite_rows = np.argsort(scores)[::-1][: config.elite]
        mothers = population[_tournament(scores, config.tournament_size, n_children, rng)]
        fathers = population[_tournament(scores, config.tournament_size, n_children, rng)]
        children = _crossover(mothers, fathers, config.crossover_rate, rng)
        children ^= rng.random(children.shape) < rate           # bit-flip mutation

        # Elite scores are carried over rather than recomputed. That is only
        # sound for a deterministic fitness; re-score elites if it is noisy.
        child_scores = np.array([fitness(genome) for genome in children])
        evaluations += n_children
        population = np.concatenate([population[elite_rows], children])
        scores = np.concatenate([scores[elite_rows], child_scores])

    best = int(scores.argmax())
    return GAResult(population[best].copy(), float(scores[best]),
                    best_history, diversity_history, evaluations)`,
        rationale:
          'Four changes, none of them about the operators. Randomness comes from one explicit numpy Generator seeded from the config, instead of the global random module, so a run is reproducible and two runs cannot interfere. Configuration is a frozen, validated dataclass, so a bad mutation rate fails at construction instead of producing a quietly wrong search. The per-child loops become array operations: tournament, crossover and mutation each act on the whole generation at once. And diversity is measured in O(N*L) from per-locus bit counts rather than O(N^2*L) from all pairs, which makes it cheap enough to record every generation.',
        conventions: [
          'Explicit type hints on every public signature',
          'No mutable default arguments',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(G * N * L) for the operators, vectorised; fitness is still called once per child from Python.',
      },
      'make-it-fast': {
        code: `"""Genetic algorithm - whole-generation array ops, preallocated, one pass per score."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float32]


def knapsack_scores(population: Matrix, value_weight: Matrix, capacity: float) -> NDArray[np.float32]:
    """Score every genome in one matrix product.

    value_weight is (L, 2): column 0 values, column 1 weights. One gemm reads
    the population once and yields both totals for every genome.
    """
    totals = population @ value_weight
    overweight = np.maximum(totals[:, 1] - capacity, 0.0)
    return np.where(overweight > 0.0, -overweight, totals[:, 0])


def evolve_fast(values: Matrix, weights: Matrix, capacity: float, *, pop_size: int,
                generations: int, tournament_size: int, crossover_rate: float,
                elite: int, seed: int) -> tuple[NDArray[np.float32], float]:
    rng = np.random.default_rng(seed)
    length = values.size
    n_children = pop_size - elite
    rate = 1.0 / length
    value_weight = np.ascontiguousarray(np.stack([values, weights], axis=1), dtype=np.float32)
    columns = np.arange(length)[None, :]

    # float32 0/1 genomes: the matmul needs no cast copy on every generation.
    current = (rng.random((pop_size, length), dtype=np.float32) < 0.5).astype(np.float32)
    following = np.empty_like(current)
    scores = knapsack_scores(current, value_weight, capacity)

    for _ in range(generations):
        top = np.argpartition(scores, -elite)[-elite:]            # O(N), not a full sort
        elite_scores = scores[top].copy()
        following[:elite] = current[top]

        # one RNG call draws every contender for both parents of every child
        contenders = rng.integers(0, pop_size, size=(2, n_children, tournament_size))
        winners = np.take_along_axis(
            contenders, scores[contenders].argmax(axis=2)[..., None], axis=2
        )[..., 0]

        children = following[elite:]                              # a view, not a copy
        children[...] = current[winners[1]]                       # father everywhere
        cut = rng.integers(1, length, size=(n_children, 1))
        np.copyto(children, current[winners[0]], where=columns < cut)           # mother's prefix
        np.copyto(children, current[winners[0]],
                  where=(rng.random(n_children) >= crossover_rate)[:, None])    # no crossover
        flips = rng.random(children.shape, dtype=np.float32) < rate
        np.subtract(1.0, children, out=children, where=flips)     # in-place bit flip

        scores[elite:] = knapsack_scores(children, value_weight, capacity)
        scores[:elite] = elite_scores
        current, following = following, current                   # swap buffers, no allocation

    best = int(scores.argmax())
    return current[best].astype(np.uint8), float(scores[best])`,
        rationale:
          'The fitness function stops being a per-genome Python callable and becomes one matrix product over the whole population, so scoring a generation costs a single BLAS call. That is the largest change and also the main limit: it only applies when fitness can be written as an array expression. The rest removes allocation and interpreter overhead. Both populations are allocated once and swapped, crossover and mutation write into the next generation in place, and the elite are picked with a partial selection instead of a sort. Where fitness is a black-box simulator that cannot be batched this way, the equivalent move is to evaluate the generation with a process pool, because the evaluations are independent.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Stacking values and weights into an (L, 2) matrix turns scoring the whole population into one gemm that reads the genomes once and returns both totals for every candidate.',
            tradeoff: 'Only works when fitness is expressible as an array operation. A simulator, a model-training run or any branching logic cannot be batched this way, and forcing it to is a rewrite of the problem, not an optimization.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The current and next populations are allocated once and swapped each generation, and crossover and mutation write into the next buffer with copyto and subtract(out=...), so no population-sized array is created in the loop.',
            tradeoff: 'In-place writes into views make aliasing bugs easy (a write into the next buffer that silently reads the current one), and the code is harder to read and to test than the functional version.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One integers() call draws every tournament contender for both parents of every child, and one random() call decides every mutation, so the interpreter is entered a fixed number of times per generation instead of once per child.',
            tradeoff: 'Large temporaries (n_children by tournament_size by 2 indices, and an N by L random matrix) raise peak memory, which can matter for a long genome and a large population.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Genomes are stored as float32 zeros and ones in one C-contiguous array, so the matmul needs no per-generation cast copy of a bool array.',
            tradeoff: 'Uses 4 bytes per gene where a bit would do (a 32-fold memory cost over bit packing), and float32 sums are exact only for integer totals below 2^24, so real-valued fitness can lose precision.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(G * N * L) per run with one BLAS call per generation for fitness. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A genetic algorithm on 0/1 knapsack - every operator written out.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <random>
#include <utility>
#include <vector>

using Genome = std::vector<int>;

double Fitness(const Genome& genome, const std::vector<double>& values,
               const std::vector<double>& weights, double capacity) {
  double total_value = 0.0;
  double total_weight = 0.0;
  for (std::size_t j = 0; j < genome.size(); ++j) {
    if (genome[j] == 1) {
      total_value += values[j];
      total_weight += weights[j];
    }
  }
  // infeasible: rank by how far over the limit, so any feasible genome wins
  if (total_weight > capacity) return -(total_weight - capacity);
  return total_value;
}

std::size_t Hamming(const Genome& a, const Genome& b) {
  std::size_t differing = 0;
  for (std::size_t j = 0; j < a.size(); ++j) {
    if (a[j] != b[j]) ++differing;
  }
  return differing;
}

// Mean pairwise Hamming distance; collapsing toward zero is premature convergence.
double Diversity(const std::vector<Genome>& population) {
  double total = 0.0;
  double pairs = 0.0;
  for (std::size_t i = 0; i < population.size(); ++i) {
    for (std::size_t k = i + 1; k < population.size(); ++k) {
      total += static_cast<double>(Hamming(population[i], population[k]));
      pairs += 1.0;
    }
  }
  return total / pairs;
}

std::size_t Tournament(const std::vector<double>& scores, int size, std::mt19937& rng) {
  std::uniform_int_distribution<std::size_t> pick(0, scores.size() - 1);
  std::size_t best = pick(rng);
  for (int round = 1; round < size; ++round) {
    const std::size_t challenger = pick(rng);
    if (scores[challenger] > scores[best]) best = challenger;
  }
  return best;
}

Genome Evolve(const std::vector<double>& values, const std::vector<double>& weights,
              double capacity, int pop_size, int generations, int tournament_size,
              double crossover_rate, int elite, unsigned seed) {
  const std::size_t length = values.size();
  const double mutation_rate = 1.0 / static_cast<double>(length);
  std::mt19937 rng(seed);
  std::uniform_real_distribution<double> unit(0.0, 1.0);
  std::uniform_int_distribution<int> coin(0, 1);
  std::uniform_int_distribution<std::size_t> cut_point(1, length - 1);

  std::vector<Genome> population(pop_size, Genome(length));
  for (Genome& genome : population) {
    for (std::size_t j = 0; j < length; ++j) genome[j] = coin(rng);
  }

  std::vector<double> scores(pop_size);
  for (int generation = 0; generation < generations; ++generation) {
    for (int i = 0; i < pop_size; ++i) {
      scores[i] = Fitness(population[i], values, weights, capacity);
    }

    // elitism: the best genomes pass to the next generation unchanged
    std::vector<int> ranked(pop_size);
    std::iota(ranked.begin(), ranked.end(), 0);
    std::sort(ranked.begin(), ranked.end(), [&](int a, int b) { return scores[a] > scores[b]; });
    std::vector<Genome> next_population;
    for (int slot = 0; slot < elite; ++slot) next_population.push_back(population[ranked[slot]]);

    while (static_cast<int>(next_population.size()) < pop_size) {
      const Genome& mother = population[Tournament(scores, tournament_size, rng)];
      const Genome& father = population[Tournament(scores, tournament_size, rng)];

      Genome child = mother;
      if (unit(rng) < crossover_rate) {
        const std::size_t cut = cut_point(rng);            // one-point crossover
        for (std::size_t j = cut; j < length; ++j) child[j] = father[j];
      }
      for (std::size_t j = 0; j < length; ++j) {
        if (unit(rng) < mutation_rate) child[j] = 1 - child[j];   // bit flip
      }
      next_population.push_back(std::move(child));
    }
    population = std::move(next_population);
  }

  for (int i = 0; i < pop_size; ++i) scores[i] = Fitness(population[i], values, weights, capacity);
  const int best = static_cast<int>(std::max_element(scores.begin(), scores.end()) - scores.begin());
  return population[best];
}`,
        profile: 'O(G * N * (L + tournament)) plus an O(N^2 * L) diversity helper. Every genome is a separate heap allocation holding 4 bytes per bit.',
      },
      'make-it-right': {
        code: `// Genetic algorithm - validated config, seeded, rerunning returns the same answer.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

struct Config {
  std::size_t pop_size = 100;
  std::size_t generations = 200;
  std::size_t tournament_size = 3;
  std::size_t elite = 2;
  double crossover_rate = 0.9;
  double mutation_rate = -1.0;   // negative means 1 / genome_length
  std::uint64_t seed = 0;
};

struct Result {
  std::vector<std::uint8_t> best_genome;
  double best_fitness = 0.0;
  std::vector<double> best_history;
  std::vector<double> diversity_history;
};

using FitnessFn = std::function<double(std::span<const std::uint8_t>)>;

class GeneticAlgorithm {
 public:
  GeneticAlgorithm(Config config, std::size_t genome_length, FitnessFn fitness)
      : config_(config), genome_length_(genome_length), fitness_(std::move(fitness)) {
    // Fail fast, before any population is allocated.
    if (genome_length_ < 2) throw std::invalid_argument("genome_length must be at least 2");
    if (config_.pop_size < 2) throw std::invalid_argument("pop_size must be at least 2");
    if (config_.elite >= config_.pop_size) throw std::invalid_argument("elite must be below pop_size");
    if (config_.tournament_size == 0) throw std::invalid_argument("tournament_size must be positive");
    if (config_.crossover_rate < 0.0 || config_.crossover_rate > 1.0) {
      throw std::invalid_argument("crossover_rate must be in [0, 1]");
    }
    if (!fitness_) throw std::invalid_argument("fitness function is empty");
  }

  // const: the RNG is local and seeded from config, so Run() twice gives one answer.
  [[nodiscard]] Result Run() const {
    std::mt19937_64 rng(config_.seed);
    const double rate = config_.mutation_rate >= 0.0
                            ? config_.mutation_rate
                            : 1.0 / static_cast<double>(genome_length_);
    const std::size_t n = config_.pop_size;
    const std::size_t len = genome_length_;

    std::vector<std::uint8_t> current(n * len);
    std::vector<std::uint8_t> next(n * len);
    std::bernoulli_distribution coin(0.5);
    for (std::uint8_t& bit : current) bit = coin(rng) ? 1 : 0;

    std::vector<double> scores(n);
    std::vector<double> next_scores(n);
    for (std::size_t i = 0; i < n; ++i) scores[i] = fitness_(Row(current, i));

    Result result;
    result.best_history.reserve(config_.generations);
    result.diversity_history.reserve(config_.generations);

    for (std::size_t generation = 0; generation < config_.generations; ++generation) {
      result.best_history.push_back(*std::max_element(scores.begin(), scores.end()));
      result.diversity_history.push_back(MeanPairwiseHamming(current, n));

      std::vector<std::size_t> order(n);
      std::iota(order.begin(), order.end(), std::size_t{0});
      std::partial_sort(order.begin(), order.begin() + config_.elite, order.end(),
                        [&](std::size_t a, std::size_t b) { return scores[a] > scores[b]; });

      for (std::size_t slot = 0; slot < config_.elite; ++slot) {
        const auto source = Row(current, order[slot]);
        std::copy(source.begin(), source.end(), next.begin() + slot * len);
        next_scores[slot] = scores[order[slot]];   // sound only for deterministic fitness
      }

      for (std::size_t child = config_.elite; child < n; ++child) {
        const auto mother = Row(current, Tournament(scores, rng));
        const auto father = Row(current, Tournament(scores, rng));
        std::uint8_t* out = next.data() + child * len;
        std::copy(mother.begin(), mother.end(), out);
        if (std::uniform_real_distribution<double>(0.0, 1.0)(rng) < config_.crossover_rate) {
          const std::size_t cut = 1 + rng() % (len - 1);
          std::copy(father.begin() + cut, father.end(), out + cut);
        }
        for (std::size_t j = 0; j < len; ++j) {
          if (std::uniform_real_distribution<double>(0.0, 1.0)(rng) < rate) out[j] ^= 1;
        }
        next_scores[child] = fitness_(std::span<const std::uint8_t>(out, len));
      }
      current.swap(next);
      scores.swap(next_scores);
    }

    const std::size_t best = static_cast<std::size_t>(
        std::max_element(scores.begin(), scores.end()) - scores.begin());
    const auto winner = Row(current, best);
    result.best_genome.assign(winner.begin(), winner.end());
    result.best_fitness = scores[best];
    return result;
  }

 private:
  [[nodiscard]] std::span<const std::uint8_t> Row(const std::vector<std::uint8_t>& flat,
                                                  std::size_t index) const {
    return std::span<const std::uint8_t>(flat).subspan(index * genome_length_, genome_length_);
  }

  [[nodiscard]] std::size_t Tournament(const std::vector<double>& scores,
                                       std::mt19937_64& rng) const {
    std::uniform_int_distribution<std::size_t> pick(0, scores.size() - 1);
    std::size_t best = pick(rng);
    for (std::size_t round = 1; round < config_.tournament_size; ++round) {
      const std::size_t challenger = pick(rng);
      if (scores[challenger] > scores[best]) best = challenger;
    }
    return best;
  }

  // Per-locus counts: k ones and (n - k) zeros give k * (n - k) differing pairs.
  [[nodiscard]] double MeanPairwiseHamming(const std::vector<std::uint8_t>& flat,
                                           std::size_t n) const {
    std::vector<std::uint64_t> ones(genome_length_, 0);
    for (std::size_t i = 0; i < n; ++i) {
      const auto row = Row(flat, i);
      for (std::size_t j = 0; j < genome_length_; ++j) ones[j] += row[j];
    }
    double differing = 0.0;
    for (const std::uint64_t k : ones) differing += static_cast<double>(k * (n - k));
    return differing / (static_cast<double>(n) * static_cast<double>(n - 1) / 2.0);
  }

  Config config_;
  std::size_t genome_length_;
  FitnessFn fitness_;
};`,
        rationale:
          'The genetic algorithm becomes an object whose constructor does all the validation, so an invalid configuration throws before a single buffer is allocated and Run() can assume a sane state. Run() is const and builds a local, seeded generator, which makes it a pure function of its inputs: calling it twice returns bit-identical results, which is the property a regression test needs. The population moves from a vector of vectors into one flat byte buffer addressed through std::span rows, which removes a heap allocation per genome and stores a gene in one byte rather than four. Two buffers are allocated once and swapped each generation instead of rebuilt.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(G * N * L) with two population buffers allocated once; fitness is called through std::function, one indirect call per child.',
      },
      'make-it-fast': {
        code: `// Genetic algorithm - breed, mutate and score every child in one parallel pass.
// Build: g++ -std=c++20 -O3 -march=native -fopenmp
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

constexpr std::uint64_t kGolden = 0x9E3779B97F4A7C15ULL;

constexpr std::uint64_t Mix(std::uint64_t z) {
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
  return z ^ (z >> 31);
}

// A SplitMix64 stream: 8 bytes of state, so it is cheap to create once per child.
// Constructing a std::mt19937_64 per child would initialise 2.5 KB and cost more
// than scoring a knapsack genome.
class SplitMixRng {
 public:
  using result_type = std::uint64_t;
  explicit SplitMixRng(std::uint64_t seed) : state_(seed) {}
  static constexpr result_type min() { return 0; }
  static constexpr result_type max() { return ~result_type{0}; }
  result_type operator()() { state_ += kGolden; return Mix(state_); }

 private:
  std::uint64_t state_;
};

struct Knapsack {
  std::span<const float> values;
  std::span<const float> weights;
  float capacity;

  // Fused: one pass over the genome yields value and weight together.
  [[nodiscard]] float Score(const std::uint8_t* genome) const {
    float value = 0.0F;
    float weight = 0.0F;
    for (std::size_t j = 0; j < values.size(); ++j) {
      const float bit = static_cast<float>(genome[j]);   // multiply, do not branch
      value += bit * values[j];
      weight += bit * weights[j];
    }
    return weight > capacity ? -(weight - capacity) : value;
  }
};

struct Params {
  std::size_t pop_size, generations, tournament_size, elite;
  double crossover_rate, mutation_rate;
  std::uint64_t seed;
};

template <class Rng>
std::size_t Tournament(std::span<const float> scores, std::size_t size, Rng& rng) {
  std::uniform_int_distribution<std::size_t> pick(0, scores.size() - 1);
  std::size_t best = pick(rng);
  for (std::size_t round = 1; round < size; ++round) {
    const std::size_t challenger = pick(rng);
    if (scores[challenger] > scores[best]) best = challenger;
  }
  return best;
}

std::vector<std::uint8_t> EvolveParallel(const Knapsack& problem, const Params& p) {
  const std::size_t len = problem.values.size();
  const std::size_t n = p.pop_size;
  if (len < 2 || p.elite >= n || p.tournament_size == 0) {
    throw std::invalid_argument("invalid genome length, elite count or tournament size");
  }
  const auto n_signed = static_cast<std::ptrdiff_t>(n);

  std::vector<std::uint8_t> current(n * len);   // row-major: one genome per row
  std::vector<std::uint8_t> next(n * len);
  std::vector<float> scores(n);
  std::vector<float> next_scores(n);
  std::vector<std::size_t> order(n);

  {
    SplitMixRng rng(Mix(p.seed));
    for (std::uint8_t& bit : current) bit = static_cast<std::uint8_t>(rng() & 1U);
  }
#pragma omp parallel for schedule(static)
  for (std::ptrdiff_t i = 0; i < n_signed; ++i) scores[i] = problem.Score(&current[i * len]);

  for (std::size_t generation = 0; generation < p.generations; ++generation) {
    std::iota(order.begin(), order.end(), std::size_t{0});
    std::partial_sort(order.begin(), order.begin() + p.elite, order.end(),
                      [&](std::size_t a, std::size_t b) { return scores[a] > scores[b]; });
    for (std::size_t slot = 0; slot < p.elite; ++slot) {
      std::copy_n(&current[order[slot] * len], len, &next[slot * len]);
      next_scores[slot] = scores[order[slot]];
    }

    // Each child owns its row, its score slot and its random stream, so the
    // iterations share nothing and the result does not depend on thread count.
#pragma omp parallel for schedule(static)
    for (std::ptrdiff_t c = static_cast<std::ptrdiff_t>(p.elite); c < n_signed; ++c) {
      SplitMixRng rng(Mix(Mix(p.seed ^ generation) ^ static_cast<std::uint64_t>(c)));
      const std::uint8_t* mother = &current[Tournament<SplitMixRng>(scores, p.tournament_size, rng) * len];
      const std::uint8_t* father = &current[Tournament<SplitMixRng>(scores, p.tournament_size, rng) * len];
      std::uint8_t* child = &next[static_cast<std::size_t>(c) * len];

      const bool cross = std::uniform_real_distribution<double>(0.0, 1.0)(rng) < p.crossover_rate;
      const std::size_t cut = cross ? 1 + rng() % (len - 1) : len;
      std::copy_n(mother, cut, child);
      std::copy_n(father + cut, len - cut, child + cut);

      // Skip-ahead mutation: jump to the next flipped bit, so about one RNG draw
      // per child instead of one per gene when the rate is 1/L.
      std::geometric_distribution<std::size_t> gap(p.mutation_rate);
      for (std::size_t pos = gap(rng); pos < len; pos += 1 + gap(rng)) child[pos] ^= 1U;

      next_scores[static_cast<std::size_t>(c)] = problem.Score(child);   // fused: no copy
    }
    current.swap(next);
    scores.swap(next_scores);
  }

  const std::size_t best = static_cast<std::size_t>(
      std::max_element(scores.begin(), scores.end()) - scores.begin());
  return {current.begin() + best * len, current.begin() + (best + 1) * len};
}`,
        rationale:
          'The structure changes from three passes over the population (breed, mutate, score) to one fused parallel pass per child: a child is assembled, mutated and scored while it is still in cache, then never touched again. That is safe to parallelise because each iteration owns its row, its score slot and, crucially, its own random stream derived from (seed, generation, child index). A shared generator would make the answer depend on thread scheduling, and a per-thread one on the thread count; a per-child stream makes the result identical on one core or sixty-four. The hand-written Mersenne Twister is replaced by a SplitMix64 stream because seeding a twister per child costs more than scoring the child.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Breeding and scoring are independent across children, so a single parallel-for over the child rows scales with cores, with a static schedule because every iteration costs about the same.',
            tradeoff: 'A knapsack score is microseconds, so for small populations thread startup and the implicit barrier each generation cost more than they save; it pays only when fitness is expensive, and generations stay strictly sequential, so speedup caps at the population size.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Crossover, mutation and scoring happen in one loop body, so the child is scored directly from the row just written, with no intermediate offspring array and no second sweep over the population.',
            tradeoff: 'The loop body now mixes variation and evaluation, so it is harder to unit-test or swap an operator in isolation, and a fitness function that cannot be inlined defeats the point.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'The whole population is one flat byte array with one genome per row, so a child reads two parent rows and writes one contiguously, and the score loop streams over genes.',
            tradeoff: 'One byte per gene still wastes seven bits, and random parent choice means each child touches two arbitrary rows, so a large population is bound by memory latency rather than arithmetic.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The multiply-by-bit score loop is branch-free and vectorisable, and native flags let the compiler use the widest vector unit available.',
            tradeoff: 'The float reductions only vectorise under -ffast-math, which also permits reassociation and so changes the rounding of every score, and a -march=native binary may not run on an older machine in the fleet.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(G * N * L) split across cores, one fused pass per child. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A genetic algorithm on 0/1 knapsack - every operator written out.
//!
//! A tiny xorshift generator is inlined so the file needs no dependencies.

struct Rng(u64);

impl Rng {
    fn new(seed: u64) -> Self {
        Rng(seed | 1) // xorshift state must be non-zero
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    fn unit(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    fn below(&mut self, bound: usize) -> usize {
        (self.unit() * bound as f64) as usize
    }
}

fn fitness(genome: &Vec<u8>, values: &Vec<f64>, weights: &Vec<f64>, capacity: f64) -> f64 {
    let mut total_value = 0.0;
    let mut total_weight = 0.0;
    for j in 0..genome.len() {
        if genome[j] == 1 {
            total_value += values[j];
            total_weight += weights[j];
        }
    }
    // infeasible: rank by how far over the limit, so any feasible genome wins
    if total_weight > capacity {
        return -(total_weight - capacity);
    }
    total_value
}

fn hamming(a: &Vec<u8>, b: &Vec<u8>) -> usize {
    let mut differing = 0;
    for j in 0..a.len() {
        if a[j] != b[j] {
            differing += 1;
        }
    }
    differing
}

/// Mean pairwise Hamming distance; collapsing toward zero is premature convergence.
fn diversity(population: &Vec<Vec<u8>>) -> f64 {
    let mut total = 0.0;
    let mut pairs = 0.0;
    for i in 0..population.len() {
        for k in (i + 1)..population.len() {
            total += hamming(&population[i], &population[k]) as f64;
            pairs += 1.0;
        }
    }
    total / pairs
}

fn tournament(scores: &Vec<f64>, size: usize, rng: &mut Rng) -> usize {
    let mut best = rng.below(scores.len());
    for _ in 1..size {
        let challenger = rng.below(scores.len());
        if scores[challenger] > scores[best] {
            best = challenger;
        }
    }
    best
}

pub fn evolve(
    values: &Vec<f64>,
    weights: &Vec<f64>,
    capacity: f64,
    pop_size: usize,
    generations: usize,
    tournament_size: usize,
    crossover_rate: f64,
    elite: usize,
    seed: u64,
) -> (Vec<u8>, f64) {
    let length = values.len();
    let mutation_rate = 1.0 / length as f64; // about one flipped bit per child
    let mut rng = Rng::new(seed);

    let mut population: Vec<Vec<u8>> = Vec::new();
    for _ in 0..pop_size {
        let mut genome = Vec::new();
        for _ in 0..length {
            genome.push(rng.below(2) as u8);
        }
        population.push(genome);
    }

    for _ in 0..generations {
        let mut scores = Vec::new();
        for genome in &population {
            scores.push(fitness(genome, values, weights, capacity));
        }
        let _spread = diversity(&population); // record it to watch for collapse

        // elitism: the best genomes pass to the next generation unchanged
        let mut ranked: Vec<usize> = (0..pop_size).collect();
        ranked.sort_by(|&a, &b| scores[b].partial_cmp(&scores[a]).unwrap());
        let mut next_population: Vec<Vec<u8>> = Vec::new();
        for slot in 0..elite {
            next_population.push(population[ranked[slot]].clone());
        }

        while next_population.len() < pop_size {
            let mother = tournament(&scores, tournament_size, &mut rng);
            let father = tournament(&scores, tournament_size, &mut rng);

            let mut child = population[mother].clone();
            if rng.unit() < crossover_rate {
                let cut = 1 + rng.below(length - 1); // one-point crossover
                for j in cut..length {
                    child[j] = population[father][j];
                }
            }
            for j in 0..length {
                if rng.unit() < mutation_rate {
                    child[j] = 1 - child[j]; // bit flip
                }
            }
            next_population.push(child);
        }
        population = next_population;
    }

    let mut best = 0;
    let mut best_score = fitness(&population[0], values, weights, capacity);
    for i in 1..pop_size {
        let score = fitness(&population[i], values, weights, capacity);
        if score > best_score {
            best = i;
            best_score = score;
        }
    }
    (population[best].clone(), best_score)
}`,
        profile: 'O(G * N * (L + tournament)). Vec<Vec<u8>> scatters genomes across the heap, every index is bounds-checked, and each child is cloned.',
      },
      'make-it-right': {
        code: `//! Genetic algorithm - Result-based errors, validated newtypes, reproducible stream.

use std::fmt;

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

#[derive(Debug, PartialEq)]
pub enum GaError {
    GenomeTooShort(usize),
    PopulationTooSmall(usize),
    EliteTooLarge { elite: usize, pop_size: usize },
    EmptyTournament,
    ProbabilityOutOfRange(f64),
}

impl fmt::Display for GaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::GenomeTooShort(len) => write!(f, "genome length must be at least 2, got {len}"),
            Self::PopulationTooSmall(n) => write!(f, "population size must be at least 2, got {n}"),
            Self::EliteTooLarge { elite, pop_size } => {
                write!(f, "elite count {elite} must be below population size {pop_size}")
            }
            Self::EmptyTournament => write!(f, "tournament size must be at least 1"),
            Self::ProbabilityOutOfRange(p) => write!(f, "probability must be in [0, 1], got {p}"),
        }
    }
}

impl std::error::Error for GaError {}

/// A probability that can only be constructed in range, so a bad rate is
/// rejected once, at the boundary, rather than inside the search loop.
#[derive(Debug, Clone, Copy)]
pub struct Probability(f64);

impl Probability {
    pub fn new(value: f64) -> Result<Self, GaError> {
        if (0.0..=1.0).contains(&value) {
            Ok(Self(value))
        } else {
            Err(GaError::ProbabilityOutOfRange(value))
        }
    }

    #[must_use]
    pub fn get(self) -> f64 {
        self.0
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pop_size: usize,
    generations: usize,
    tournament_size: usize,
    elite: usize,
    crossover_rate: Probability,
    mutation_rate: Probability,
    seed: u64,
}

impl Config {
    pub fn new(
        pop_size: usize,
        generations: usize,
        tournament_size: usize,
        elite: usize,
        crossover_rate: Probability,
        mutation_rate: Probability,
        seed: u64,
    ) -> Result<Self, GaError> {
        if pop_size < 2 {
            return Err(GaError::PopulationTooSmall(pop_size));
        }
        if elite >= pop_size {
            return Err(GaError::EliteTooLarge { elite, pop_size });
        }
        if tournament_size == 0 {
            return Err(GaError::EmptyTournament);
        }
        Ok(Self { pop_size, generations, tournament_size, elite, crossover_rate, mutation_rate, seed })
    }
}

#[derive(Debug, Clone)]
pub struct GaResult {
    pub best_genome: Vec<bool>,
    pub best_fitness: f64,
    pub best_history: Vec<f64>,
}

fn tournament(scores: &[f64], size: usize, rng: &mut ChaCha8Rng) -> usize {
    (0..size)
        .map(|_| rng.gen_range(0..scores.len()))
        .max_by(|&a, &b| scores[a].total_cmp(&scores[b]))
        .expect("tournament size is validated to be at least 1")
}

/// Maximise \`fitness\` over bit strings of \`genome_length\`. ChaCha8 is used rather
/// than StdRng because its output is specified, so the stream is stable across
/// rand versions; the same seed gives the same answer.
pub fn evolve<F>(config: &Config, genome_length: usize, fitness: F) -> Result<GaResult, GaError>
where
    F: Fn(&[bool]) -> f64,
{
    if genome_length < 2 {
        return Err(GaError::GenomeTooShort(genome_length));
    }

    let mut rng = ChaCha8Rng::seed_from_u64(config.seed);
    let mut population: Vec<Vec<bool>> = (0..config.pop_size)
        .map(|_| (0..genome_length).map(|_| rng.gen_bool(0.5)).collect())
        .collect();
    let mut scores: Vec<f64> = population.iter().map(|genome| fitness(genome)).collect();
    let mut best_history = Vec::with_capacity(config.generations);

    for _ in 0..config.generations {
        best_history.push(scores.iter().copied().fold(f64::NEG_INFINITY, f64::max));

        let mut ranked: Vec<usize> = (0..config.pop_size).collect();
        ranked.sort_unstable_by(|&a, &b| scores[b].total_cmp(&scores[a]));

        let mut next: Vec<Vec<bool>> = ranked[..config.elite]
            .iter()
            .map(|&index| population[index].clone())
            .collect();
        // Elite scores are carried over, sound only for a deterministic fitness.
        let mut next_scores: Vec<f64> = ranked[..config.elite].iter().map(|&i| scores[i]).collect();

        while next.len() < config.pop_size {
            let mother = &population[tournament(&scores, config.tournament_size, &mut rng)];
            let father = &population[tournament(&scores, config.tournament_size, &mut rng)];

            let mut child = mother.clone();
            if rng.gen_bool(config.crossover_rate.get()) {
                let cut = rng.gen_range(1..genome_length);
                child[cut..].copy_from_slice(&father[cut..]);
            }
            for gene in &mut child {
                if rng.gen_bool(config.mutation_rate.get()) {
                    *gene = !*gene;
                }
            }
            next_scores.push(fitness(&child));
            next.push(child);
        }
        population = next;
        scores = next_scores;
    }

    let (best, &best_fitness) = scores
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.total_cmp(b))
        .expect("population is non-empty by construction");
    Ok(GaResult { best_genome: population[best].clone(), best_fitness, best_history })
}`,
        rationale:
          'Validation moves to the type boundary. A Probability can only be constructed in range and a Config only through a constructor that returns a Result, so evolve never sees a rate of 1.7 or an elite count larger than the population, and the caller handles the failure rather than the search panicking. The index loops become iterator chains (tournament is a map-and-max over contenders), and the generator becomes a seeded ChaCha8 stream whose output is specified, so a fixed seed gives the same answer across rand versions, which the default StdRng does not promise. Fitness is generic over Fn(&[bool]), borrowed rather than copied, so any closure can be passed.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(G * N * L), with a clone per child and a Vec<Vec<bool>> population; the fitness closure is monomorphised and can be inlined.',
      },
      'make-it-fast': {
        code: `//! Genetic algorithm - children bred, mutated and scored in parallel with rayon.

use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use rayon::prelude::*;

pub struct Knapsack<'a> {
    pub values: &'a [f32],
    pub weights: &'a [f32],
    pub capacity: f32,
}

impl Knapsack<'_> {
    /// One fused pass yields value and weight; the multiply-by-bit form has no
    /// branch, so the loop can vectorise.
    #[inline]
    fn score(&self, genome: &[u8]) -> f32 {
        let (value, weight) = genome
            .iter()
            .zip(self.values)
            .zip(self.weights)
            .fold((0.0_f32, 0.0_f32), |(v, w), ((&gene, &val), &wt)| {
                let bit = f32::from(gene);
                (v + bit * val, w + bit * wt)
            });
        if weight > self.capacity { -(weight - self.capacity) } else { value }
    }
}

pub struct Params {
    pub pop_size: usize,
    pub generations: usize,
    pub tournament_size: usize,
    pub elite: usize,
    pub crossover_rate: f64,
    pub mutation_rate: f64,
    pub seed: u64,
}

#[inline]
fn splitmix64(mut z: u64) -> u64 {
    z = z.wrapping_add(0x9E37_79B9_7F4A_7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// One random stream per child, derived from (seed, generation, child index), so
/// the result is identical regardless of how rayon schedules the work.
#[inline]
fn child_rng(seed: u64, generation: usize, child: usize) -> ChaCha8Rng {
    ChaCha8Rng::seed_from_u64(splitmix64(splitmix64(seed ^ generation as u64) ^ child as u64))
}

#[inline]
fn tournament(scores: &[f32], size: usize, rng: &mut ChaCha8Rng) -> usize {
    (0..size)
        .map(|_| rng.gen_range(0..scores.len()))
        .max_by(|&a, &b| scores[a].total_cmp(&scores[b]))
        .expect("tournament size must be at least 1")
}

pub fn evolve_parallel(problem: &Knapsack<'_>, params: &Params) -> (Vec<u8>, f32) {
    let len = problem.values.len();
    let n = params.pop_size;
    let mut rng = ChaCha8Rng::seed_from_u64(params.seed);

    let mut current: Vec<u8> = (0..n * len).map(|_| u8::from(rng.gen_bool(0.5))).collect();
    let mut next = vec![0_u8; n * len];
    let mut scores: Vec<f32> = current.par_chunks_exact(len).map(|g| problem.score(g)).collect();
    let mut next_scores = vec![0.0_f32; n];
    let mut order: Vec<usize> = (0..n).collect();

    for generation in 0..params.generations {
        order.sort_unstable_by(|&a, &b| scores[b].total_cmp(&scores[a]));

        // Disjoint mutable halves: elite rows first, children after.
        let (elite_rows, child_rows) = next.split_at_mut(params.elite * len);
        let (elite_scores, child_scores) = next_scores.split_at_mut(params.elite);
        for (slot, &source) in order.iter().take(params.elite).enumerate() {
            elite_rows[slot * len..(slot + 1) * len]
                .copy_from_slice(&current[source * len..(source + 1) * len]);
            elite_scores[slot] = scores[source];
        }

        let parents = &current;
        let parent_scores = &scores;
        child_rows
            .par_chunks_exact_mut(len)
            .zip(child_scores.par_iter_mut())
            .enumerate()
            .for_each(|(child, (row, score))| {
                let mut rng = child_rng(params.seed, generation, child);
                let mother = tournament(parent_scores, params.tournament_size, &mut rng) * len;
                let father = tournament(parent_scores, params.tournament_size, &mut rng) * len;

                let cut = if rng.gen_bool(params.crossover_rate) { rng.gen_range(1..len) } else { len };
                row[..cut].copy_from_slice(&parents[mother..mother + cut]);
                row[cut..].copy_from_slice(&parents[father + cut..father + len]);

                for gene in row.iter_mut() {
                    if rng.gen_bool(params.mutation_rate) {
                        *gene ^= 1;
                    }
                }
                *score = problem.score(row); // scored while still in cache
            });

        std::mem::swap(&mut current, &mut next);
        std::mem::swap(&mut scores, &mut next_scores);
    }

    let best = scores
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.total_cmp(b))
        .map_or(0, |(index, _)| index);
    (current[best * len..(best + 1) * len].to_vec(), scores[best])
}`,
        rationale:
          'A generation becomes one parallel pass in which each child is built from slices of the parent buffer, mutated and scored in the same closure, with no per-child allocation: the population is one flat byte buffer, children are written straight into their rows of the next buffer, and the two buffers are swapped. The borrow checker does the safety work that C++ leaves to the programmer, because the elite rows, child rows and score slots are split into disjoint mutable slices, so the parallel loop provably shares nothing writable. As in the C++ version each child draws from its own stream keyed by (seed, generation, child), so the result does not depend on the rayon thread pool size.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Children are independent, so par_chunks_exact_mut over the child rows zipped with the score slots spreads breeding, mutation and scoring across cores with no locks or atomics.',
            tradeoff: 'Work-stealing has overhead per task, so a cheap fitness and a small population run slower than the sequential loop; it pays only once evaluation is expensive. Generations stay sequential, capping speedup at the population size.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The population is one flat Vec<u8> viewed as rows through slices, so parents are read and children written as contiguous memory, and the generation swap is a pointer swap rather than a rebuild.',
            tradeoff: 'Row indexing is manual arithmetic (index * len), which is easy to get wrong and loses the type-level guarantee that a row has the right length unless it is asserted at the boundary.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'score, child_rng and tournament are called per child inside the parallel closure, and inlining lets the compiler fuse the score loop into the closure and vectorise the multiply-by-bit reduction.',
            tradeoff: 'Inlining grows the closure body and the binary, and the hint is unnecessary within one crate under release optimisation, so it is worth keeping only where a profile shows a call boundary blocking vectorisation.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The score kernel zips genome, values and weights in a fold, so the compiler can prove the lengths line up and drop the per-element bounds checks that index loops pay.',
            tradeoff: 'zip silently truncates to the shortest slice, so a genome longer or shorter than the value arrays would give a wrong score rather than an error; lengths must be validated once up front.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(G * N * L) spread across cores, with no allocation in the generation loop. Illustrative, not a measured benchmark.',
      },
    },
  },
};
