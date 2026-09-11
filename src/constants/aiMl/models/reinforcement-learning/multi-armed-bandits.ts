import type { AiMlModel } from '../../types';

/**
 * Multi-armed bandits — the most specialized entry in this category
 * and the one that actually ships.
 *
 * Delete the state transition from an MDP and what remains is a
 * problem with real regret guarantees, algorithms that fit on a
 * napkin, and a production track record the rest of reinforcement
 * learning does not have.
 */
export const MULTI_ARMED_BANDITS: AiMlModel = {
  slug: 'multi-armed-bandits',
  name: 'Multi-Armed Bandits (UCB, Thompson)',
  aliases: ['UCB1', 'Thompson sampling', 'Contextual bandits', 'LinUCB', 'Epsilon-greedy'],
  category: 'reinforcement-learning',
  group: 'online-decision',
  kind: 'model',

  paradigms: ['reinforcement'],
  taskTypes: ['control', 'ranking'],
  paradigmNote:
    'Reinforcement learning with the state transition removed: an action produces an immediate reward and does not change what the next decision looks like. That single deletion is what buys back the regret guarantees the rest of this category gave up, and it is also the assumption most likely to be quietly false in practice.',

  intuition:
    'Everything else in this category spends its effort on credit assignment across time. A bandit has no time to assign across — you pick an arm, you get a reward, and the next decision starts from the same place. What is left when the temporal structure is gone is the exploration-exploitation trade in its purest form: you can only learn about an arm by pulling it, and every pull spent learning is a pull not spent earning. Three answers matter. Epsilon-greedy explores at random with some probability, which is simple and wasteful, because it explores arms it already knows are bad just as often as promising ones. UCB is optimistic in the face of uncertainty: score each arm by its estimated mean plus a confidence bonus that shrinks as it is pulled, then take the best score. An arm that looks bad but has barely been tried keeps a high bonus and gets tried again; an arm that has been tried and is genuinely bad falls away. Thompson sampling is Bayesian and even simpler to state: keep a posterior over each arm\'s value, draw one sample from each, play the argmax of the samples. Arms the posterior is uncertain about sometimes draw high and get played, in exact proportion to the probability they are best. What makes this group worth studying is that it is the only one here with meaningful theory — regret bounds that hold, are tight, and are actually predictive of behaviour — and simultaneously the group that appears most often in production, usually in contextual form. It is also the group most often reached for wrongly, because the assumption it rests on, that actions do not change the state, fails quietly rather than loudly.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'R_T = T\\mu^{*} - \\mathbb{E}\\Bigl[\\sum_{t=1}^{T} \\mu_{a_t}\\Bigr] \;=\; \\sum_{a\\,:\\,\\Delta_a > 0} \\Delta_a \\, \\mathbb{E}\\bigl[N_a(T)\\bigr], \\qquad \\Delta_a = \\mu^{*} - \\mu_a',
      symbols: [
        { symbol: 'R_T', meaning: 'cumulative regret: what an oracle always playing the best arm would have earned, minus what was actually earned — the quantity every guarantee here is stated about' },
        { symbol: '\\Delta_a', meaning: 'the gap between the best arm and arm a; regret decomposes into gap times number of pulls, which is why a nearly-tied arm is cheap to be wrong about' },
        { symbol: 'N_a(T)', meaning: 'how many times arm a was pulled — the only thing an algorithm controls, and the whole design problem is keeping it small for bad arms' },
        { symbol: '\\mu^{*}', meaning: 'the best arm\'s mean reward, unknown; the regret is defined against it and measured only in hindsight' },
      ],
    },
    reading:
      'The decomposition on the right is the most useful thing in the formula, because it says exactly where regret comes from: each suboptimal arm contributes its gap multiplied by how often it was played. Two consequences follow. An arm that is nearly as good as the best is cheap to keep exploring — the gap is small, so pulling it costs almost nothing — while an arm that is much worse must be abandoned fast. And no algorithm can do better than logarithmic pulls of a suboptimal arm, which is the lower bound: you cannot become confident an arm is worse without sampling it enough times to distinguish it, and the number of samples needed scales as one over the gap squared. UCB achieves that bound by construction, and the bonus term is doing precisely this accounting: it is the width of a confidence interval, so an arm stops being played once its upper confidence bound falls below the best arm\'s mean. Thompson sampling achieves it too, by an entirely different route — it plays each arm with the posterior probability that it is best, which is exactly the amount of exploration the uncertainty justifies. The two are worth holding side by side because they are the same idea in two languages, frequentist and Bayesian, and the Bayesian one is usually better in practice while the frequentist one is easier to reason about. The limitation is in the first symbol: regret is defined against a fixed best arm, so all of this assumes the arm means are stationary, and none of it survives a world where the best arm changes without an explicit mechanism for forgetting.',
  },

  optimization: {
    method: 'Sequential decisions under uncertainty: optimism via confidence bounds (UCB), probability matching via posterior sampling (Thompson), or random exploration (epsilon-greedy), with contextual variants fitting a per-arm model of reward given features',
    updateRule: {
      formula:
        'a_t^{\\text{UCB}} = \\arg\\max_a \\Bigl( \\hat{\\mu}_a + \\sqrt{\\tfrac{2\\ln t}{N_a}} \\Bigr), \\qquad a_t^{\\text{TS}} = \\arg\\max_a \\tilde{\\theta}_a, \;\; \\tilde{\\theta}_a \\sim p(\\theta_a \\mid \\mathcal{D}_t)',
      symbols: [
        { symbol: '\\sqrt{2\\ln t / N_a}', meaning: 'the confidence radius: wide for a rarely pulled arm, shrinking as the square root of its pull count, growing slowly in total time so nothing is abandoned permanently' },
        { symbol: '\\tilde{\\theta}_a', meaning: 'one draw from arm a\'s posterior — Thompson plays an arm with exactly the probability that it is best, which is probability matching' },
        { symbol: '\\hat{\\mu}_a', meaning: 'the running mean, updated incrementally; storing a sum and a count is all the state a non-contextual bandit has' },
        { symbol: 't', meaning: 'total pulls so far, not pulls of this arm — the bonus grows for every arm as time passes, which is what keeps an abandoned arm eventually revisited' },
      ],
    },
    rationale:
      'Three algorithms, and the differences between them are more instructive than any one alone. Epsilon-greedy is the baseline everyone writes first and it is genuinely bad in a specific way: it spends its exploration budget uniformly over arms, so an arm already known to be terrible is explored exactly as often as one that is plausibly best. It has linear regret with a fixed epsilon and needs an annealing schedule to be competitive, which is one more thing to tune. UCB replaces random exploration with directed exploration: the bonus is a confidence radius, so exploration goes where uncertainty is, and the algorithm is deterministic, which makes it reproducible and auditable — genuinely useful properties in production. Thompson sampling is usually the best-performing of the three and the easiest to extend, because the whole algorithm is "sample from the posterior and act greedily on the sample", which works for any model you can put a posterior on. It also handles delayed and batched feedback more gracefully than UCB, since several decisions drawn from the same posterior naturally diversify, where UCB would deterministically pick the same arm every time until the batch lands. The contextual extension is what actually ships: model reward as a function of features and arm, maintain uncertainty over the model parameters, and apply the same optimism or sampling to the predicted reward. LinUCB and linear Thompson sampling are the standard forms, and the reason they stay linear in practice is that the uncertainty quantification is what matters, and it is exactly what gets hard when the model gets deep.',
    hyperparameters: [
      { name: 'exploration constant', role: 'The multiplier on UCB\'s confidence radius. The theoretical value is often too exploratory in practice, and tuning it down is standard and worth doing deliberately rather than accidentally', typicalRange: '0.5 to 2.0 times the theoretical bonus' },
      { name: 'prior', role: 'Thompson sampling\'s starting belief per arm. A Beta(1,1) is uninformative; a stronger prior is how domain knowledge enters and how a cold start is survived', typicalRange: 'Beta(1,1), or matched to a known base rate' },
      { name: 'epsilon and its schedule', role: 'For the baseline. Fixed epsilon gives linear regret; a 1/t decay is needed to be competitive, which is a hyperparameter the other two do not have', typicalRange: '0.1 fixed, or decaying as 1/t' },
      { name: 'discount or sliding window', role: 'The nonstationarity mechanism. Without one, an arm with a long history cannot be overtaken when the world changes, because its confidence interval has already collapsed', typicalRange: 'discount 0.99, or a window of recent pulls' },
      { name: 'regularization (contextual)', role: 'The ridge term in LinUCB\'s design matrix. It sets the initial uncertainty and keeps the matrix invertible before enough data has arrived', typicalRange: '1.0' },
      { name: 'batch size / update cadence', role: 'How many decisions are served before the posterior is refreshed. Larger batches are operationally simpler and delay learning, and Thompson tolerates them far better than UCB does', typicalRange: 'per-request to hourly' },
      { name: 'minimum allocation floor', role: 'A guaranteed share of traffic per arm. Not in any of the theory, and standard in production because it preserves the ability to detect a change and to estimate every arm', typicalRange: '1% to 5% per arm' },
    ],
    convergence:
      'This is the only group in this category with guarantees that are both provable and predictive of what actually happens. UCB1 attains regret O(sum over suboptimal arms of log(T) over the gap), which matches the known lower bound up to constants — no algorithm can do better, and the reason is information-theoretic rather than algorithmic. Thompson sampling attains the same asymptotic rate and is typically better in finite time. Epsilon-greedy with a fixed epsilon has linear regret and is only competitive with an annealing schedule. Read these bounds carefully, though, because their assumptions are where deployments fail. They assume stationary arm means: if the best arm changes, an algorithm whose confidence intervals have already collapsed will not notice, and the failure mode is a system confidently serving a formerly-best arm long after it stopped being best. A discount factor or a sliding window is the standard fix and it costs some asymptotic regret to buy responsiveness. They assume immediate feedback: with delayed rewards, decisions are made against a stale posterior, and Thompson sampling degrades gracefully here while UCB degenerates into pulling the same arm repeatedly. They assume independent arms, so a hundred near-identical variants are each explored separately rather than sharing evidence, which is what the contextual form fixes. And they assume the arm set is fixed, so a new arm added mid-run has no history and either needs an optimistic prior or will be starved. Perhaps most importantly, they say nothing about the quality of the estimates produced: a bandit deliberately stops sampling arms it believes are bad, so the data it leaves behind supports a confident statement about the winner and a very weak one about everything else.',
    complexity:
      'Non-contextual: O(K) per decision to score the arms and O(1) to update, with O(K) memory holding a running mean and a count per arm. This is cheap enough to run inside a request handler and is one of the reasons bandits ship where the rest of this category does not. Contextual LinUCB: maintaining the inverse of a d-by-d design matrix per arm costs O(d^2) per update with a rank-one formula, or O(d^3) if the inverse is recomputed, and scoring is O(K d^2) per decision for the confidence term. Linear Thompson sampling additionally samples from a d-dimensional Gaussian, which needs a factorization of the covariance — O(d^3) if done naively per decision, and O(d^2) if the factor is maintained incrementally. The practical scaling limit is the number of arms times the feature dimension, which is why production systems narrow the arm set with a retrieval stage first and keep the model linear.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Allocate a decision — which forecaster to trust, which model to serve — across a set of candidates whose performance is learned online, treating each candidate as an arm and its realized accuracy as the reward.',
        where: [
          'Online model selection among competing forecasters, where the best model changes with the regime and a fixed backtest choice goes stale',
          'Forecast combination with weights adapted online rather than fitted once on history',
          'Deciding which of several expensive forecasting pipelines to run when only some can be afforded per cycle, which is genuine bandit feedback',
          'Regime-change detection as a by-product: a persistent shift in which arm wins is a signal in itself',
        ],
        why: 'Marked adapted because the honest version of this fit contains a correction worth making. In most forecasting settings the feedback is FULL, not bandit: the outcome is observed, so every candidate forecaster can be scored after the fact, whether or not it was the one served. That is the prediction-with-expert-advice problem, and its right algorithm is exponential weighting over all experts, which has better regret than any bandit algorithm because it uses strictly more information. Reaching for a bandit there is over-general and measurably worse. Genuine bandit feedback appears only when running a candidate is itself costly — an expensive simulation, a paid external forecast, a pipeline that cannot be run for every model every cycle — and then the bandit machinery is correct. The second correction is that forecasting is usually nonstationary by nature, which is the assumption every bound here rests on, so a discounted or sliding-window variant is mandatory rather than optional. Get both of those right and this is a clean, cheap, well-understood way to keep a model portfolio honest; get them wrong and it is a complicated way to underperform a simple weighted average.',
        featurization: [
          'Check whether feedback is really bandit feedback: if every candidate can be scored after the outcome, use exponential weights over experts instead, which strictly dominates',
          'Use a discounted or sliding-window variant, since forecasting regimes shift and an undiscounted bound assumes they do not',
          'Define the reward as a proper scoring rule on the forecast, not as accuracy on a threshold, or the allocation optimizes the wrong thing',
          'Keep an allocation floor per candidate so a model that becomes good again can be noticed',
        ],
        evaluation:
          'Cumulative realized forecast loss against the best single candidate chosen in hindsight — that difference is the regret and it is the quantity the method is designed to control. Report it against the simple baselines too: a static backtest-selected model and a uniform average, because the adaptive machinery has to beat both to be worth its complexity.',
        pitfalls: [
          'Using a bandit where full feedback is available, which discards information and underperforms exponential weights',
          'No discounting, so a candidate that dominated an old regime keeps a collapsed confidence interval and cannot be overtaken',
          'A reward defined on a metric that is not a proper scoring rule, which makes the allocation optimize something other than forecast quality',
          'Treating the selection as free when running each candidate has a real cost, which is the thing that made it a bandit in the first place',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations rather than choosing among actions with rewards, so there is no arm to pull and no regret to accumulate — the adjacent problem of allocating scarce investigation capacity across detectors is a bandit, but the detection itself is not.',
      },
      optimization: {
        fit: 'primary',
        how: 'Choose repeatedly among a fixed set of options whose payoffs are unknown, balancing the cost of learning against the cost of not learning, with the arm means estimated online and exploration directed by uncertainty rather than by chance.',
        where: [
          'The exploration-exploitation trade isolated from credit assignment, which is what makes it analyzable at all',
          'Regret as an objective with matching upper and lower bounds — the only place in this category where the theory is tight and predictive',
          'Optimism versus probability matching as two routes to the same rate, one frequentist and one Bayesian',
          'The contextual extension, which is where almost all production use actually lives',
        ],
        why: 'The most practically useful entry in this category and the most commonly reached for wrongly. Three lessons transfer. The first is the regret decomposition: cost equals gap times pulls, so being wrong about a near-tie is cheap and being wrong about a large gap is expensive — a framing that applies to any resource allocation under uncertainty and that reframes "how confident do I need to be" as "how much does being wrong cost here". The second is that directed exploration beats random exploration by a wide margin, and the mechanism is simply a confidence interval; epsilon-greedy explores arms it already knows are bad, which is the clearest illustration available of why uncertainty should steer exploration. The third is a warning. A bandit optimizes cumulative reward and will deliberately stop sampling arms it believes are inferior, which means it is actively destroying the statistical power needed to estimate those arms. If the goal is to learn each option\'s effect precisely, that is a randomized experiment, not a bandit, and the two objectives genuinely conflict. Where bandits are the wrong choice otherwise: if the action changes what the next decision looks like, the state assumption is false and this is an MDP wearing a disguise; and if the arm set is enormous or the arms are near-duplicates, independent per-arm estimation wastes evidence and a contextual model is required.',
        featurization: [
          'Verify the action does not change the next state — that assumption is the whole method and it fails quietly rather than loudly',
          'Use a discounted or sliding-window variant if the arm means can move, since every bound assumes they cannot',
          'Prefer Thompson sampling when feedback is delayed or batched, because several decisions drawn from one posterior diversify where UCB repeats',
          'Keep an allocation floor per arm, which is absent from all the theory and standard in production for exactly the reasons the theory ignores',
        ],
        evaluation:
          'Cumulative regret against the best fixed arm in hindsight is the primary metric, and it is computable offline in simulation where the true means are known. In production, track realized reward against a holdout running uniform allocation — that holdout is what makes regret measurable at all, and it is also the only sample that supports unbiased estimation of every arm.',
        pitfalls: [
          'Using a bandit when the actions change the state, which silently makes every guarantee inapplicable',
          'Expecting reliable estimates for arms the bandit stopped pulling, when it stopped pulling them precisely to avoid paying for that information',
          'No nonstationarity mechanism, so a collapsed confidence interval outlives the world it was measured in',
          'Near-duplicate arms treated as independent, so evidence that should be shared is spent many times over',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Score a narrowed candidate set with a model of reward given user and item features, then select optimistically or by posterior sampling so that the system continuously buys the information it needs about items it has not shown enough.',
        where: [
          'Cold-start items and users, where the uncertainty is largest and directed exploration is worth the most',
          'Headline, creative and layout selection, which are small fixed arm sets and the textbook case',
          'Ad and content allocation, where contextual bandits with linear models are the long-standing production standard',
          'Generating the exploration data that every downstream off-policy method needs, with logged propensities',
        ],
        why: 'The largest production deployment of anything in this category, and the reason is fit rather than fashion. A supervised ranker trained on logged clicks has a feedback loop: it only observes outcomes for items it chose to show, so items it never shows never accumulate evidence and stay unshown regardless of merit. That is exactly the failure directed exploration fixes, and the fix is cheap — a confidence term or a posterior draw, computed per request, on top of a model that already exists. Three qualifications decide whether it works. The arm set must be narrowed by retrieval first, because per-arm uncertainty over a catalogue is not maintainable and near-duplicate items waste evidence that a contextual model would share. Feedback is delayed and batched in almost every real system, which favours Thompson sampling strongly — a batch of decisions drawn from one posterior explores naturally, where UCB would serve the same arm for the whole batch. And the state assumption deserves genuine scrutiny: if a recommendation meaningfully changes what the user does next, this is a sequential problem and the bandit is approximating it, which is often an acceptable approximation and should be a decision rather than an oversight.',
        featurization: [
          'Narrow the arm set with retrieval before anything else, since per-arm uncertainty over a catalogue is not maintainable',
          'Log the selection propensities at serving time, because every off-policy method downstream needs them and they cannot be recovered later',
          'Prefer Thompson sampling under batched or delayed feedback, where a single posterior naturally diversifies a batch of decisions',
          'Share evidence across near-duplicate items with a contextual model rather than treating each as an independent arm',
        ],
        evaluation:
          'Online experiments decide, with a uniform-allocation holdout maintained deliberately — it is what makes regret measurable and it is the only traffic that supports unbiased estimation of every arm. Report the long-horizon objective as well as immediate reward, since a bandit optimizes the immediate reward it was given and will happily trade away anything it was not.',
        pitfalls: [
          'An un-narrowed catalogue as the arm set, where per-arm uncertainty cannot be maintained and everything is a cold start',
          'Propensities never logged, which makes every downstream correction unavailable',
          'UCB under batched feedback, which deterministically serves the same arm for the entire batch',
          'Assuming the state assumption holds when a recommendation visibly changes what the user does next',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'Run an experiment whose allocation adapts as evidence accumulates, shifting traffic toward better-performing arms while retaining enough sampling of the alternatives to say something about them afterwards.',
        where: [
          'Adaptive experiments where the cost of serving a losing variant to users is substantial',
          'Best-arm identification, which is a genuinely different objective from regret minimization and has its own algorithms',
          'Sequential testing where a decision must be made as early as the evidence allows',
          'Understanding why adaptively collected data breaks ordinary inference, which is the most useful thing here',
        ],
        why: 'Included because the tension is real and routinely mishandled. A bandit minimizes regret, which means it deliberately stops sampling arms it believes are worse — and the sample sizes it leaves behind are therefore both small and, crucially, dependent on the outcomes observed so far. That dependence breaks the standard estimators: the sample mean of an adaptively sampled arm is biased, the usual confidence intervals do not have their nominal coverage, and a p-value computed as though the allocation were fixed is simply wrong. There is real methodology for this — adaptively weighted estimators and always-valid sequential inference — and it is not what most teams reach for. So the first thing to settle is which objective is actually wanted. If the goal is to earn as much as possible while learning, a bandit is right and the inference afterwards needs the corrected machinery. If the goal is a trustworthy estimate of every arm\'s effect, a fixed randomized allocation is right and the bandit is actively working against you. If the goal is to find the best arm as fast as possible and the intermediate cost does not matter, neither is right — best-arm identification is a third objective with its own algorithms, and it allocates quite differently from regret minimization.',
        featurization: [
          'Decide the objective first: cumulative reward, best-arm identification, or unbiased estimation of every arm — the three lead to different allocations',
          'Keep a fixed-allocation holdout, which preserves a clean sample for ordinary inference and costs a known amount of regret',
          'Use adaptively weighted estimators or always-valid sequential intervals when analyzing adaptively collected data',
          'Record the allocation probabilities at decision time, since the analysis depends on them and they cannot be reconstructed',
        ],
        evaluation:
          'State the objective and evaluate against it: regret against the best arm in hindsight for cumulative reward, probability of correct selection for best-arm identification, and coverage of the intervals for estimation. Reporting a naive confidence interval on adaptively collected data is the characteristic error, and it will be too narrow and centred in the wrong place.',
        pitfalls: [
          'Naive confidence intervals on adaptively collected data, which are biased and do not have their stated coverage',
          'Expecting a bandit to deliver a precise estimate of a losing arm it deliberately stopped sampling',
          'Using regret minimization when the actual goal is identifying the best arm, which allocates differently',
          'Switching allocation rules mid-experiment without recording when, which makes any later analysis unreconstructable',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Negligible, and that is a substantive property rather than a footnote. A non-contextual bandit holds a running mean and a count per arm and updates in constant time; a contextual one maintains a small matrix per arm. There is no training job, no simulator, no replay buffer and no gradient step — the model updates as the data arrives, inside the serving path. This is the main reason bandits appear in production systems where nothing else in this category does. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'Microseconds for the non-contextual case: score K arms and take the argmax. Contextual scoring is a small matrix operation per arm and still comfortably inside a request budget once the arm set has been narrowed. UCB is deterministic, which makes decisions reproducible and auditable; Thompson sampling is not, so an identical request can yield different arms, and any system needing reproducible decisions must log the draw rather than expecting to replay it.',
    retrainingCadence:
      'There is no retraining. The state is the posterior or the sufficient statistics, and it updates continuously as rewards arrive — which is the entire operational appeal. What does need a cadence is a decision about forgetting: with a discount or a sliding window, how fast to forget is the one parameter standing between a system that adapts to change and one that is confidently serving yesterday\'s winner. Reviewing that setting against observed nonstationarity is the real periodic task.',
    driftAndMonitoring: [
      'Arm allocation over time, which is the most directly interpretable signal available — a collapse onto one arm means exploration has effectively stopped',
      'Realized reward against a uniform-allocation holdout, which is what makes regret measurable in production rather than only in simulation',
      'Per-arm pull counts and posterior widths, since an arm with a collapsed interval cannot be overtaken without an explicit forgetting mechanism',
      'Feedback delay distribution, because every guarantee assumes immediate feedback and a lengthening delay quietly degrades the algorithm',
      'Evidence of nonstationarity: a change in which arm wins on recent data, compared against what the undiscounted statistics still believe',
      'Logged selection propensities, which are needed by every downstream off-policy analysis and are irrecoverable if not written at decision time',
    ],
    productionGotchas: [
      'The no-state assumption is the whole method and it fails quietly. If an action changes what the next decision looks like, every guarantee here is void and nothing will indicate that',
      'A bandit deliberately stops sampling arms it believes are worse, so the data it leaves cannot support a confident estimate of those arms. Wanting both maximum reward and precise per-arm estimates is wanting two different experiments',
      'Confidence intervals computed on adaptively collected data are biased and do not have their nominal coverage. This is the most common analytical error downstream of a bandit deployment',
      'Without discounting or a sliding window, an arm with a long history has a collapsed interval and cannot be overtaken when the world changes',
      'UCB under batched or delayed feedback degenerates into serving the same arm for the whole batch, because it is deterministic and nothing has updated. Thompson sampling does not have this problem',
      'A new arm added mid-run has no history and will be starved unless given an optimistic prior, which is a deployment step rather than an algorithmic one',
      'Near-duplicate arms are treated as independent and each explored separately, spending the same evidence many times. That is what the contextual form exists to fix',
      'The theoretical exploration constant is usually too exploratory in practice. Tuning it down is normal and should be a recorded decision rather than an accident',
    ],
  },

  assumptions: [
    'Actions do not change the state — the defining assumption, what buys the regret guarantees, and the one most likely to be quietly false',
    'Arm means are stationary, or an explicit forgetting mechanism is present; every bound here is stated against a fixed best arm',
    'Feedback arrives quickly enough relative to the decision rate that the posterior is not badly stale when the next decision is made',
    'Rewards are bounded or sub-Gaussian, which is what the concentration inequalities behind the confidence bonus require',
    'The arm set is fixed, or new arms are explicitly initialized with an optimistic prior rather than left to accumulate history',
    'Arms are independent unless a contextual model is used, so near-duplicates genuinely do waste evidence',
  ],

  pros: [
    {
      point: 'Real guarantees that match a lower bound and predict actual behaviour',
      context:
        'UCB and Thompson both attain logarithmic regret, and no algorithm can do better. This is the only group in this category where the theory is tight, and where it tells you something useful about a run before you start it',
    },
    {
      point: 'Cheap enough to run inside a request handler',
      context:
        'A running mean and a count per arm, updated in constant time, with no training job, no simulator and no replay buffer. That operational profile is the main reason bandits ship where the rest of this category does not',
    },
    {
      point: 'Directed exploration is dramatically better than random exploration',
      context:
        'Epsilon-greedy explores arms it already knows are bad; UCB and Thompson spend their budget where uncertainty is. The gap between the two is the clearest demonstration available of why uncertainty should steer exploration',
    },
    {
      point: 'Thompson sampling extends to anything you can put a posterior on',
      context:
        'Sample from the posterior, act greedily on the sample. That recipe carries to linear models, trees and neural approximations, and it handles delayed and batched feedback gracefully because one posterior naturally diversifies a batch',
    },
    {
      point: 'The contextual form fixes the cold-start feedback loop directly',
      context:
        'A supervised ranker only observes outcomes for what it chose to show, so unshown items stay unshown. Adding a confidence term or a posterior draw on top of the existing model breaks that loop for very little machinery',
    },
  ],

  cons: [
    {
      point: 'The no-state assumption fails silently',
      context:
        'If an action changes what the next decision looks like, the problem is an MDP and every guarantee is void — with nothing raising an error. This is the most common way a bandit is the wrong tool and nobody notices',
    },
    {
      point: 'It destroys the statistical power needed to estimate the arms it abandons',
      context:
        'Minimizing regret means deliberately not paying for information about inferior arms. Wanting both maximum reward and precise per-arm effects is wanting two different experiments, and they allocate traffic differently',
    },
    {
      point: 'Adaptively collected data breaks ordinary inference',
      context:
        'Sample means are biased and standard confidence intervals lose their coverage, because the sample sizes depend on the outcomes observed. Corrected estimators exist and are not what most teams reach for',
    },
    {
      point: 'Every guarantee assumes stationarity',
      context:
        'An arm with a long history has a collapsed confidence interval and cannot be overtaken when the world changes. A discount or a sliding window is mandatory in practice and costs asymptotic regret to buy responsiveness',
    },
    {
      point: 'Independent arms waste evidence',
      context:
        'A hundred near-identical variants are each explored separately, so the same information is bought many times. Contextual models fix this and bring their own difficulty — maintaining calibrated uncertainty over a learned model',
    },
    {
      point: 'UCB handles delay and batching badly',
      context:
        'Being deterministic, it serves the same arm for an entire batch when nothing has updated in between. Thompson sampling has no such problem, which is a large part of why it dominates in real systems',
    },
  ],

  relatedSlugs: ['mdp-bellman', 'q-learning', 'ppo-trpo', 'gaussian-process', 'propensity-iptw', 'matrix-factorization'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Three bandit algorithms, transcribed side by side.

All three answer the same question - which arm now - and the differences
between them are the whole content of the topic. Only the standard library is
used, including for the Beta draw Thompson needs.
"""

import math
import random


def epsilon_greedy(means, counts, epsilon):
    """Explore at random, otherwise take the best known arm.

    The flaw is visible in one line: the random branch picks UNIFORMLY, so an
    arm already known to be terrible is explored exactly as often as one that
    is plausibly best. That is why fixed-epsilon regret is linear in T.
    """
    if random.random() < epsilon:
        return random.randrange(len(means))
    return max(range(len(means)), key=lambda arm: means[arm])


def ucb1(means, counts, total_pulls):
    """Optimism in the face of uncertainty.

    The bonus is a confidence RADIUS: wide for an arm pulled rarely, shrinking
    as the square root of its pull count. So exploration goes where the
    uncertainty is rather than where a coin lands, which is the entire
    improvement over epsilon-greedy.

    Note the numerator is the TOTAL pull count, not this arm's. That is what
    makes every bonus creep upward as time passes, so an arm abandoned early is
    eventually revisited rather than written off forever.
    """
    for arm in range(len(means)):
        if counts[arm] == 0:
            return arm          # every arm once, or the bonus is undefined

    best_arm, best_score = 0, -float("inf")
    for arm in range(len(means)):
        bonus = math.sqrt(2.0 * math.log(total_pulls) / counts[arm])
        score = means[arm] + bonus
        if score > best_score:
            best_arm, best_score = arm, score
    return best_arm


def thompson_sampling(successes, failures):
    """Probability matching, via one draw per arm.

    A Beta(1 + successes, 1 + failures) posterior over each arm's success rate,
    one sample from each, and the argmax of the samples. An arm is played with
    exactly the probability that it IS the best arm under the current posterior
    - which is precisely as much exploration as the uncertainty justifies, with
    no bonus term and no schedule to tune.
    """
    best_arm, best_draw = 0, -float("inf")
    for arm in range(len(successes)):
        draw = random.betavariate(1.0 + successes[arm], 1.0 + failures[arm])
        if draw > best_draw:
            best_arm, best_draw = arm, draw
    return best_arm


def run(bandit, n_arms, horizon, algorithm="ucb", epsilon=0.1):
    """One pull per step, with the regret decomposition accumulated alongside.

    Regret is gap times pulls, summed over suboptimal arms. Tracking it
    directly makes the accounting visible: a near-tied arm costs almost nothing
    to keep trying, and a badly worse one has to be abandoned fast.
    """
    means = [0.0] * n_arms
    counts = [0] * n_arms
    successes = [0] * n_arms
    failures = [0] * n_arms

    cumulative_reward = 0.0
    regret_history = []
    best_mean = max(bandit.true_means)

    for step in range(1, horizon + 1):
        if algorithm == "epsilon":
            arm = epsilon_greedy(means, counts, epsilon)
        elif algorithm == "ucb":
            arm = ucb1(means, counts, step)
        else:
            arm = thompson_sampling(successes, failures)

        reward = bandit.pull(arm)

        # Incremental mean: a running sum and a count is ALL the state a
        # non-contextual bandit has, which is why this fits in a request
        # handler and nothing else in this category does.
        counts[arm] += 1
        means[arm] += (reward - means[arm]) / counts[arm]

        if reward > 0.5:
            successes[arm] += 1
        else:
            failures[arm] += 1

        cumulative_reward += reward
        regret_history.append(step * best_mean - cumulative_reward)

    return means, counts, regret_history`,
        profile: 'O(K) per decision to score the arms, O(1) to update. Three running numbers per arm and nothing else.',
      },
      'make-it-right': {
        code: `"""Bandit policies - typed, with a forgetting mechanism and honest diagnostics."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
from numpy.typing import NDArray


class Policy(Protocol):
    """One interface, three implementations. The whole topic is the difference
    between them, so making them substitutable is the point of the abstraction
    rather than an incidental tidiness."""

    def select(self, step: int) -> int: ...
    def update(self, arm: int, reward: float) -> None: ...


@dataclass
class ArmStatistics:
    """Sufficient statistics with a DISCOUNT.

    Every regret bound in this area assumes stationary arm means. Without
    forgetting, an arm with a long history has a confidence interval that has
    already collapsed and cannot be overtaken when the world changes - and the
    failure mode is a system confidently serving a formerly-best arm. The
    discount costs asymptotic regret and buys responsiveness, which is almost
    always the right trade in production.
    """

    n_arms: int
    discount: float = 1.0
    _weighted_sum: NDArray[np.float64] = field(init=False)
    _weighted_count: NDArray[np.float64] = field(init=False)

    def __post_init__(self) -> None:
        if self.n_arms < 2:
            raise ValueError("a one-armed bandit has nothing to decide")
        if not 0.0 < self.discount <= 1.0:
            raise ValueError(f"discount must be in (0, 1], got {self.discount}")
        self._weighted_sum = np.zeros(self.n_arms, dtype=np.float64)
        self._weighted_count = np.zeros(self.n_arms, dtype=np.float64)

    def update(self, arm: int, reward: float) -> None:
        # Everything decays, not just the arm that was pulled: the passage of
        # time is what makes old evidence about ANY arm less relevant.
        self._weighted_sum *= self.discount
        self._weighted_count *= self.discount
        self._weighted_sum[arm] += reward
        self._weighted_count[arm] += 1.0

    @property
    def means(self) -> NDArray[np.float64]:
        # Safe division: an unpulled arm has no mean, and returning zero rather
        # than a nan keeps the comparison well-defined without pretending.
        return np.divide(
            self._weighted_sum,
            self._weighted_count,
            out=np.zeros_like(self._weighted_sum),
            where=self._weighted_count > 0,
        )

    @property
    def counts(self) -> NDArray[np.float64]:
        return self._weighted_count

    @property
    def effective_horizon(self) -> float:
        """Total weighted evidence. With a discount this plateaus rather than
        growing, which is exactly what keeps the confidence bonus from
        shrinking to nothing."""
        return float(self._weighted_count.sum())


@dataclass
class UcbPolicy:
    stats: ArmStatistics
    # The theoretical constant is usually too exploratory in practice. Tuning
    # it down is normal and belongs in the config as a recorded decision rather
    # than as a magic number edited into the formula.
    exploration: float = 1.0

    def select(self, step: int) -> int:
        counts = self.stats.counts
        unpulled = np.flatnonzero(counts == 0)
        if unpulled.size > 0:
            return int(unpulled[0])     # the bonus is undefined without a pull

        horizon = max(self.stats.effective_horizon, np.e)
        bonus = self.exploration * np.sqrt(2.0 * np.log(horizon) / counts)
        return int(np.argmax(self.stats.means + bonus))

    def update(self, arm: int, reward: float) -> None:
        self.stats.update(arm, reward)


@dataclass
class ThompsonPolicy:
    """Beta-Bernoulli posterior sampling.

    Preferred under delayed or batched feedback: several decisions drawn from
    one posterior diversify naturally, where UCB is deterministic and will
    serve the same arm for an entire batch because nothing has updated.
    """

    n_arms: int
    prior_alpha: float = 1.0
    prior_beta: float = 1.0
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(0))
    _successes: NDArray[np.float64] = field(init=False)
    _failures: NDArray[np.float64] = field(init=False)

    def __post_init__(self) -> None:
        if self.prior_alpha <= 0.0 or self.prior_beta <= 0.0:
            raise ValueError("Beta prior parameters must be positive")
        self._successes = np.zeros(self.n_arms, dtype=np.float64)
        self._failures = np.zeros(self.n_arms, dtype=np.float64)

    def select(self, step: int) -> int:
        draws = self.rng.beta(
            self.prior_alpha + self._successes, self.prior_beta + self._failures
        )
        return int(np.argmax(draws))

    def update(self, arm: int, reward: float) -> None:
        if not 0.0 <= reward <= 1.0:
            raise ValueError(f"Beta-Bernoulli needs a reward in [0, 1], got {reward}")
        # Fractional updates are valid for a reward in [0, 1] and keep the
        # conjugacy exact, which is cleaner than thresholding to a Bernoulli.
        self._successes[arm] += reward
        self._failures[arm] += 1.0 - reward


@dataclass
class AllocationFloor:
    """A guaranteed share of traffic per arm.

    Absent from every bound in the literature and standard in production, for
    reasons the theory does not model: it preserves the ability to notice that
    an arm has become good, and it leaves a sample that ordinary inference can
    actually be run on. Adaptively collected data cannot support a standard
    confidence interval, and this is the cheapest way to keep some that can.
    """

    inner: Policy
    n_arms: int
    floor: float = 0.02
    rng: np.random.Generator = field(default_factory=lambda: np.random.default_rng(1))

    def select(self, step: int) -> int:
        if self.rng.random() < self.floor * self.n_arms:
            return int(self.rng.integers(self.n_arms))
        return self.inner.select(step)

    def update(self, arm: int, reward: float) -> None:
        self.inner.update(arm, reward)`,
        rationale:
          'The three algorithms become one substitutable interface, because the topic is the difference between them. Statistics gain a discount, since every bound here assumes stationary arm means and an undiscounted arm with a long history has a collapsed interval that cannot be overtaken. Thompson accepts fractional rewards rather than thresholding to a Bernoulli, which keeps the conjugacy exact. And an allocation floor is added — absent from all the theory and standard in production, because it preserves both the ability to notice a change and a sample that ordinary inference can be run on.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'No mutable default arguments',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(K) per decision as array operations; the discount makes the update O(K) rather than O(1).',
      },
      'make-it-fast': {
        code: `"""LinUCB - Cholesky maintained incrementally, never an explicit inverse.

The contextual case is where production lives, and it is where the naive
implementation quietly becomes the bottleneck. Per arm it maintains a d-by-d
design matrix A = lambda*I + sum x x^T, and it needs two things from it: the
ridge solution A^-1 b, and the confidence width sqrt(x^T A^-1 x).

Forming A^-1 to get either is the wrong move twice over - O(d^3) per update,
and numerically the worst available way to solve a linear system.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray


class CholeskyArm:
    """Ridge statistics for one arm, held as a Cholesky factor.

    A = L L^T is maintained directly. Adding an observation is a rank-one
    update to A, and there is an O(d^2) in-place algorithm that turns L into
    the factor of A + x x^T without ever rebuilding it - compared with O(d^3)
    to refactorize and the same again to invert.

    Everything the algorithm needs is then a triangular solve, which is both
    faster and far better conditioned than multiplying by an inverse.
    """

    def __init__(self, dimension: int, ridge: float = 1.0) -> None:
        # A = ridge * I, so its factor starts as sqrt(ridge) * I.
        self.factor = np.eye(dimension, dtype=np.float64) * np.sqrt(ridge)
        self.b = np.zeros(dimension, dtype=np.float64)
        self.dimension = dimension
        self._updates_since_refactor = 0
        # Scratch buffers reused by every update and every score, so the hot
        # path allocates nothing at all.
        self._scratch = np.empty(dimension, dtype=np.float64)

    def update(self, features: NDArray[np.float64], reward: float) -> None:
        """Rank-one Cholesky update, in place, O(d^2).

        The classic cholupdate: sweep down the diagonal, rotating each row so
        that the factor absorbs the outer product. No matrix is formed and no
        inverse is touched.
        """
        np.copyto(self._scratch, features)
        x = self._scratch

        for k in range(self.dimension):
            diagonal = self.factor[k, k]
            r = np.hypot(diagonal, x[k])
            cosine = r / diagonal
            sine = x[k] / diagonal
            self.factor[k, k] = r

            if k + 1 < self.dimension:
                column = self.factor[k + 1 :, k]
                # In place on both the factor column and the working vector.
                column += sine * x[k + 1 :]
                column /= cosine
                x[k + 1 :] *= cosine
                x[k + 1 :] -= sine * column

        self.b += reward * features
        self._updates_since_refactor += 1

    def score(self, features: NDArray[np.float64], alpha: float) -> float:
        """Predicted reward plus the confidence width, via two triangular solves.

        theta = A^-1 b   is  L^T z = y  after  L y = b
        width = sqrt(x^T A^-1 x)  is  ||z|| after  L z = x

        Both are back-substitutions. Neither forms an inverse, and the second
        one is why this formulation is worth the trouble: the width IS the norm
        of a solve, which is numerically clean where x^T A^-1 x computed from
        an explicit inverse loses precision exactly when A is near-singular -
        which is precisely the under-explored regime the bonus exists for.
        """
        theta = _solve_from_factor(self.factor, self.b)
        z = _forward_substitute(self.factor, features)
        return float(features @ theta + alpha * np.linalg.norm(z))

    @property
    def needs_refactor(self) -> bool:
        """Rank-one updates drift. Periodically rebuilding the factor from the
        accumulated matrix restores exactness, and the interval is a real
        trade rather than defensive padding."""
        return self._updates_since_refactor >= 10_000


def _forward_substitute(factor: NDArray[np.float64], rhs: NDArray[np.float64]):
    """Solve L z = rhs. Contiguous, single dtype, one BLAS-level call."""
    from scipy.linalg import solve_triangular

    return solve_triangular(factor, rhs, lower=True, check_finite=False)


def _solve_from_factor(factor: NDArray[np.float64], rhs: NDArray[np.float64]):
    """Solve A theta = rhs given A = L L^T, as two triangular solves."""
    from scipy.linalg import cho_solve

    return cho_solve((factor, True), rhs, check_finite=False)


def score_all_arms(
    factors: NDArray[np.float64],
    thetas: NDArray[np.float64],
    features: NDArray[np.float64],
    alpha: float,
) -> NDArray[np.float64]:
    """Score every arm for one context in a single batched operation.

    Stacking the per-arm factors into one (K, d, d) block turns K separate
    triangular solves into one batched solve, and the mean term into a single
    matrix-vector product. At production arm counts that is the difference
    between a Python loop over arms and one BLAS call.
    """
    means = thetas @ features                         # (K,) in one GEMV
    # One batched triangular solve across the leading arm axis.
    z = np.linalg.solve(factors, np.broadcast_to(features, (factors.shape[0], features.size)).T).T
    widths = np.linalg.norm(z, axis=1)
    return means + alpha * widths`,
        rationale:
          'The contextual case is where production lives and where the naive implementation becomes the bottleneck. Instead of forming and storing each arm\'s inverse design matrix, the Cholesky factor is maintained directly with an in-place rank-one update — O(d²) per observation against O(d³) to refactorize, and every quantity the algorithm needs becomes a triangular solve. That is faster and materially better conditioned: the confidence width is the norm of a solve, which stays accurate exactly where an explicit inverse loses precision, in the under-explored regime the bonus exists for. Arm scoring is then one batched operation rather than a loop.',
        optimizations: [
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'Maintaining a Cholesky factor and back-substituting replaces an explicit inverse, which is both O(d) more expensive to keep up to date and the least accurate way to solve a linear system — worst precisely when the design matrix is near-singular, which is the under-explored arm the bonus is meant to serve.',
            tradeoff: 'Rank-one updates accumulate floating-point drift, so the factor must be periodically rebuilt from scratch — a maintenance obligation an explicit recomputation does not carry.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Stacking the per-arm factors into one leading-axis block turns K separate triangular solves into one batched call and the mean terms into a single product.',
            tradeoff: 'Every arm must share the same feature dimension and be resident in one contiguous block, so adding or removing an arm means reallocating the whole stack.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The rank-one update runs entirely in a reused scratch vector and writes the factor in place, so the per-observation path performs no allocation.',
            tradeoff: 'The scratch buffer makes the arm object non-reentrant, so two threads updating the same arm corrupt it silently rather than contending.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Scoring every arm for a context is one batched solve and one norm along an axis, replacing a per-arm Python loop that dominates at production arm counts.',
            tradeoff: 'The batched form computes a full solve for every arm including ones a cheap pre-filter would have excluded, so it does more arithmetic to avoid more overhead.',
          },
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(d^2) per observation instead of O(d^3); one batched solve per decision instead of K. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Three bandit algorithms, transcribed side by side.
//
// All three answer the same question - which arm now - and the differences
// between them are the whole content of the topic.
#include <cmath>
#include <cstddef>
#include <limits>
#include <random>
#include <vector>

// Explore at random, otherwise take the best known arm.
//
// The flaw is visible in one line: the random branch picks UNIFORMLY, so an arm
// already known to be terrible is explored exactly as often as one that is
// plausibly best. That is why fixed-epsilon regret is linear in T.
std::size_t EpsilonGreedy(const std::vector<double>& means, double epsilon,
                          std::mt19937& rng) {
  std::uniform_real_distribution<double> uniform(0.0, 1.0);
  if (uniform(rng) < epsilon) {
    std::uniform_int_distribution<std::size_t> pick(0, means.size() - 1);
    return pick(rng);
  }

  std::size_t best = 0;
  for (std::size_t arm = 1; arm < means.size(); ++arm) {
    if (means[arm] > means[best]) best = arm;
  }
  return best;
}

// Optimism in the face of uncertainty.
//
// The bonus is a confidence RADIUS: wide for an arm pulled rarely, shrinking as
// the square root of its pull count. Exploration goes where the uncertainty is
// rather than where a coin lands, which is the entire improvement.
//
// Note the numerator is the TOTAL pull count, not this arm's. That is what makes
// every bonus creep upward as time passes, so an arm abandoned early is
// eventually revisited rather than written off forever.
std::size_t Ucb1(const std::vector<double>& means, const std::vector<std::size_t>& counts,
                 std::size_t total_pulls) {
  for (std::size_t arm = 0; arm < means.size(); ++arm) {
    if (counts[arm] == 0) return arm;   // the bonus is undefined without a pull
  }

  std::size_t best = 0;
  double best_score = -std::numeric_limits<double>::infinity();
  for (std::size_t arm = 0; arm < means.size(); ++arm) {
    const double bonus =
        std::sqrt(2.0 * std::log(static_cast<double>(total_pulls)) /
                  static_cast<double>(counts[arm]));
    const double score = means[arm] + bonus;
    if (score > best_score) {
      best = arm;
      best_score = score;
    }
  }
  return best;
}

// Probability matching, via one draw per arm.
//
// A Beta(1 + successes, 1 + failures) posterior over each arm's success rate,
// one sample from each, and the argmax of the samples. An arm is played with
// exactly the probability that it IS the best arm under the current posterior -
// precisely as much exploration as the uncertainty justifies, with no bonus term
// and no schedule to tune.
//
// The standard library has no Beta distribution, so it is built from two Gammas:
// if X ~ Gamma(a, 1) and Y ~ Gamma(b, 1) then X / (X + Y) ~ Beta(a, b).
double SampleBeta(double alpha, double beta, std::mt19937& rng) {
  std::gamma_distribution<double> gamma_a(alpha, 1.0);
  std::gamma_distribution<double> gamma_b(beta, 1.0);
  const double x = gamma_a(rng);
  const double y = gamma_b(rng);
  return x / (x + y);
}

std::size_t ThompsonSampling(const std::vector<double>& successes,
                             const std::vector<double>& failures, std::mt19937& rng) {
  std::size_t best = 0;
  double best_draw = -std::numeric_limits<double>::infinity();
  for (std::size_t arm = 0; arm < successes.size(); ++arm) {
    const double draw = SampleBeta(1.0 + successes[arm], 1.0 + failures[arm], rng);
    if (draw > best_draw) {
      best = arm;
      best_draw = draw;
    }
  }
  return best;
}

// One pull per step, with the regret decomposition accumulated alongside.
//
// Regret is gap times pulls, summed over suboptimal arms. Tracking it directly
// makes the accounting visible: a near-tied arm costs almost nothing to keep
// trying, and a badly worse one has to be abandoned fast.
template <typename Bandit>
std::vector<double> Run(Bandit& bandit, std::size_t n_arms, std::size_t horizon,
                        const char* algorithm, double epsilon) {
  std::vector<double> means(n_arms, 0.0);
  std::vector<std::size_t> counts(n_arms, 0);
  std::vector<double> successes(n_arms, 0.0);
  std::vector<double> failures(n_arms, 0.0);

  std::mt19937 rng(0);
  double cumulative_reward = 0.0;
  double best_mean = bandit.BestMean();
  std::vector<double> regret_history;
  regret_history.reserve(horizon);

  for (std::size_t step = 1; step <= horizon; ++step) {
    std::size_t arm = 0;
    if (algorithm[0] == 'e') {
      arm = EpsilonGreedy(means, epsilon, rng);
    } else if (algorithm[0] == 'u') {
      arm = Ucb1(means, counts, step);
    } else {
      arm = ThompsonSampling(successes, failures, rng);
    }

    const double reward = bandit.Pull(arm);

    // Incremental mean: a running sum and a count is ALL the state a
    // non-contextual bandit has, which is why this fits in a request handler
    // and nothing else in this category does.
    ++counts[arm];
    means[arm] += (reward - means[arm]) / static_cast<double>(counts[arm]);

    successes[arm] += reward;
    failures[arm] += 1.0 - reward;

    cumulative_reward += reward;
    regret_history.push_back(static_cast<double>(step) * best_mean - cumulative_reward);
  }

  return regret_history;
}`,
        profile: 'O(K) per decision to score the arms, O(1) to update. Three running numbers per arm and nothing else.',
      },
      'make-it-right': {
        code: `// Bandit policies - one interface, a forgetting mechanism, honest diagnostics.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <memory>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

// Newtypes so a discount and an exploration constant cannot be transposed -
// both are small positive doubles and swapping them changes behaviour without
// failing.
struct Discount {
  double value;
};

struct ExplorationConstant {
  double value;
};

// One interface, three implementations. The whole topic is the difference
// between them, so making them substitutable is the point of the abstraction
// rather than incidental tidiness.
class Policy {
 public:
  virtual ~Policy() = default;
  [[nodiscard]] virtual std::size_t Select(std::size_t step) = 0;
  virtual void Update(std::size_t arm, double reward) = 0;
};

// Sufficient statistics with a DISCOUNT.
//
// Every regret bound in this area assumes stationary arm means. Without
// forgetting, an arm with a long history has a confidence interval that has
// already collapsed and cannot be overtaken when the world changes - and the
// failure mode is a system confidently serving a formerly-best arm. The discount
// costs asymptotic regret and buys responsiveness, which is almost always the
// right trade in production.
class ArmStatistics {
 public:
  ArmStatistics(std::size_t n_arms, Discount discount)
      : discount_(discount), weighted_sum_(n_arms, 0.0), weighted_count_(n_arms, 0.0) {
    if (n_arms < 2) throw std::invalid_argument("a one-armed bandit has nothing to decide");
    if (discount.value <= 0.0 || discount.value > 1.0) {
      throw std::invalid_argument("discount must be in (0, 1]");
    }
  }

  void Update(std::size_t arm, double reward) {
    // Everything decays, not just the arm that was pulled: the passage of time
    // is what makes old evidence about ANY arm less relevant.
    for (double& value : weighted_sum_) value *= discount_.value;
    for (double& value : weighted_count_) value *= discount_.value;
    weighted_sum_[arm] += reward;
    weighted_count_[arm] += 1.0;
  }

  // An unpulled arm has no mean. Returning zero rather than a nan keeps the
  // comparison well-defined without pretending the arm has been measured.
  [[nodiscard]] double Mean(std::size_t arm) const noexcept {
    return weighted_count_[arm] > 0.0 ? weighted_sum_[arm] / weighted_count_[arm] : 0.0;
  }

  [[nodiscard]] double Count(std::size_t arm) const noexcept { return weighted_count_[arm]; }
  [[nodiscard]] std::size_t Size() const noexcept { return weighted_count_.size(); }

  // Total weighted evidence. With a discount this plateaus rather than growing,
  // which is exactly what keeps the confidence bonus from shrinking to nothing.
  [[nodiscard]] double EffectiveHorizon() const {
    return std::accumulate(weighted_count_.begin(), weighted_count_.end(), 0.0);
  }

 private:
  Discount discount_;
  std::vector<double> weighted_sum_;
  std::vector<double> weighted_count_;
};

class UcbPolicy final : public Policy {
 public:
  // The theoretical constant is usually too exploratory in practice. Tuning it
  // down is normal and belongs in the config as a recorded decision rather than
  // as a magic number edited into the formula.
  UcbPolicy(ArmStatistics stats, ExplorationConstant exploration)
      : stats_(std::move(stats)), exploration_(exploration) {}

  [[nodiscard]] std::size_t Select(std::size_t) override {
    for (std::size_t arm = 0; arm < stats_.Size(); ++arm) {
      if (stats_.Count(arm) == 0.0) return arm;   // the bonus needs a pull first
    }

    const double horizon = std::max(stats_.EffectiveHorizon(), std::exp(1.0));
    std::size_t best = 0;
    double best_score = -std::numeric_limits<double>::infinity();
    for (std::size_t arm = 0; arm < stats_.Size(); ++arm) {
      const double bonus =
          exploration_.value * std::sqrt(2.0 * std::log(horizon) / stats_.Count(arm));
      const double score = stats_.Mean(arm) + bonus;
      if (score > best_score) {
        best = arm;
        best_score = score;
      }
    }
    return best;
  }

  void Update(std::size_t arm, double reward) override { stats_.Update(arm, reward); }

 private:
  ArmStatistics stats_;
  ExplorationConstant exploration_;
};

// Beta-Bernoulli posterior sampling.
//
// Preferred under delayed or batched feedback: several decisions drawn from one
// posterior diversify naturally, where UCB is deterministic and will serve the
// same arm for an entire batch because nothing has updated in between.
class ThompsonPolicy final : public Policy {
 public:
  ThompsonPolicy(std::size_t n_arms, double prior_alpha, double prior_beta)
      : prior_alpha_(prior_alpha),
        prior_beta_(prior_beta),
        successes_(n_arms, 0.0),
        failures_(n_arms, 0.0),
        rng_(0) {
    if (prior_alpha <= 0.0 || prior_beta <= 0.0) {
      throw std::invalid_argument("Beta prior parameters must be positive");
    }
  }

  [[nodiscard]] std::size_t Select(std::size_t) override {
    std::size_t best = 0;
    double best_draw = -std::numeric_limits<double>::infinity();
    for (std::size_t arm = 0; arm < successes_.size(); ++arm) {
      std::gamma_distribution<double> gamma_a(prior_alpha_ + successes_[arm], 1.0);
      std::gamma_distribution<double> gamma_b(prior_beta_ + failures_[arm], 1.0);
      const double x = gamma_a(rng_);
      const double y = gamma_b(rng_);
      const double draw = x / (x + y);
      if (draw > best_draw) {
        best = arm;
        best_draw = draw;
      }
    }
    return best;
  }

  void Update(std::size_t arm, double reward) override {
    if (reward < 0.0 || reward > 1.0) {
      throw std::invalid_argument("Beta-Bernoulli needs a reward in [0, 1]");
    }
    // Fractional updates are valid for a reward in [0, 1] and keep the
    // conjugacy exact, which is cleaner than thresholding to a Bernoulli.
    successes_[arm] += reward;
    failures_[arm] += 1.0 - reward;
  }

 private:
  double prior_alpha_;
  double prior_beta_;
  std::vector<double> successes_;
  std::vector<double> failures_;
  std::mt19937 rng_;
};

// A guaranteed share of traffic per arm.
//
// Absent from every bound in the literature and standard in production, for
// reasons the theory does not model: it preserves the ability to notice that an
// arm has become good, and it leaves a sample that ordinary inference can
// actually be run on - which adaptively collected data cannot support.
class AllocationFloor final : public Policy {
 public:
  AllocationFloor(std::unique_ptr<Policy> inner, std::size_t n_arms, double floor)
      : inner_(std::move(inner)), n_arms_(n_arms), floor_(floor), rng_(1) {
    if (floor < 0.0 || floor * static_cast<double>(n_arms) > 1.0) {
      throw std::invalid_argument("per-arm floor must be non-negative and sum below one");
    }
  }

  [[nodiscard]] std::size_t Select(std::size_t step) override {
    std::uniform_real_distribution<double> uniform(0.0, 1.0);
    if (uniform(rng_) < floor_ * static_cast<double>(n_arms_)) {
      std::uniform_int_distribution<std::size_t> pick(0, n_arms_ - 1);
      return pick(rng_);
    }
    return inner_->Select(step);
  }

  void Update(std::size_t arm, double reward) override { inner_->Update(arm, reward); }

 private:
  std::unique_ptr<Policy> inner_;
  std::size_t n_arms_;
  double floor_;
  std::mt19937 rng_;
};`,
        rationale:
          'The three algorithms become one owned interface, because the topic is the difference between them. Statistics gain a discount, since every bound here assumes stationary arm means and an undiscounted arm with a long history has a collapsed interval that cannot be overtaken. Thompson accepts fractional rewards rather than thresholding to a Bernoulli, keeping the conjugacy exact, and validates at the boundary. And an allocation floor wraps any policy — absent from all the theory and standard in production, because it preserves both the ability to notice a change and a sample ordinary inference can run on.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(K) per decision; the discount makes the update O(K) rather than O(1), and the policy owns all its state.',
      },
      'make-it-fast': {
        code: `// LinUCB - Cholesky maintained incrementally, never an explicit inverse.
#include <cstddef>
#include <vector>

#include <Eigen/Cholesky>
#include <Eigen/Dense>

// The contextual case is where production lives, and where the naive
// implementation quietly becomes the bottleneck. Per arm it maintains a d-by-d
// design matrix A = lambda*I + sum x x^T, and it needs two things from it: the
// ridge solution A^-1 b, and the confidence width sqrt(x^T A^-1 x).
//
// Forming A^-1 to get either is the wrong move twice over - O(d^3) per update,
// and numerically the worst available way to solve a linear system.
class CholeskyArm {
 public:
  CholeskyArm(std::size_t dimension, double ridge)
      : llt_(Eigen::MatrixXd::Identity(static_cast<Eigen::Index>(dimension),
                                       static_cast<Eigen::Index>(dimension)) *
             ridge),
        b_(Eigen::VectorXd::Zero(static_cast<Eigen::Index>(dimension))),
        scratch_(static_cast<Eigen::Index>(dimension)) {}

  // Rank-one update in place, O(d^2).
  //
  // Eigen's LLT carries rankUpdate precisely for this: it turns the factor of A
  // into the factor of A + x x^T without rebuilding it, against O(d^3) to
  // refactorize and the same again to invert.
  void Update(const Eigen::VectorXd& features, double reward) {
    llt_.rankUpdate(features, 1.0);
    b_.noalias() += reward * features;
    ++updates_since_refactor_;
  }

  // Predicted reward plus the confidence width, via triangular solves.
  //
  //   theta = A^-1 b            is  two back-substitutions through L
  //   width = sqrt(x^T A^-1 x)  is  the norm of z after solving L z = x
  //
  // Neither forms an inverse, and the second is why this formulation is worth
  // the trouble: the width IS the norm of a solve, which stays accurate where
  // x^T A^-1 x computed from an explicit inverse loses precision - exactly when
  // A is near-singular, which is the under-explored regime the bonus exists for.
  [[nodiscard]] double Score(const Eigen::VectorXd& features, double alpha) {
    const Eigen::VectorXd theta = llt_.solve(b_);
    // matrixL().solve is a single forward substitution; scratch_ is reused so
    // the hot path allocates nothing.
    scratch_.noalias() = llt_.matrixL().solve(features);
    return features.dot(theta) + alpha * scratch_.norm();
  }

  // Rank-one updates accumulate drift. Periodically rebuilding the factor from
  // the accumulated matrix restores exactness, and the interval is a real trade
  // rather than defensive padding.
  [[nodiscard]] bool NeedsRefactor() const noexcept {
    return updates_since_refactor_ >= 10000;
  }

 private:
  Eigen::LLT<Eigen::MatrixXd> llt_;
  Eigen::VectorXd b_;
  Eigen::VectorXd scratch_;
  std::size_t updates_since_refactor_ = 0;
};

// Score every arm for one context with the arm parameters laid out contiguously.
//
// Per-arm objects scattered across the heap mean K cache misses per decision
// before any arithmetic happens. Packing the ridge solutions into one
// (K x d) row-major matrix makes the mean term a single GEMV, which at
// production arm counts is the difference between a pointer chase and one call.
Eigen::VectorXd ScoreAllArms(const Eigen::MatrixXd& thetas,
                             const std::vector<CholeskyArm*>& arms,
                             const Eigen::VectorXd& features, double alpha) {
  // One matrix-vector product covers every arm's predicted reward.
  Eigen::VectorXd scores = thetas * features;

  for (Eigen::Index arm = 0; arm < scores.size(); ++arm) {
    // The width still needs a per-arm solve, because each arm has its own
    // factor - this is the part that does not batch, and knowing which half
    // batches is the whole point of separating them.
    scores(arm) += alpha * arms[static_cast<std::size_t>(arm)]->Score(features, 0.0);
  }
  return scores;
}`,
        rationale:
          'Instead of forming and storing each arm\'s inverse design matrix, the Cholesky factor is maintained directly with a rank-one update — O(d²) per observation against O(d³) to refactorize — and every quantity the algorithm needs becomes a triangular solve. That is faster and materially better conditioned: the confidence width is the norm of a solve, which stays accurate exactly where an explicit inverse loses precision, in the under-explored regime the bonus exists for. The ridge solutions are packed contiguously so the mean term is one GEMV rather than a pointer chase across K scattered objects.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Packing the per-arm ridge solutions into one row-major matrix makes every arm\'s predicted reward a single GEMV instead of K separate dot products across scattered objects.',
            tradeoff: 'The parameter block must be kept in sync with the per-arm factors, so an arm added or removed invalidates the packed matrix and forces a rebuild.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'noalias on the accumulation and the triangular solve keeps Eigen from materializing an intermediate vector on every update and every score.',
            tradeoff: 'noalias is an unchecked promise that source and destination do not overlap, and a violation produces silently wrong parameters rather than an error.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'The arm parameters live in one contiguous block, so a decision streams through them instead of taking a cache miss per arm before any arithmetic starts.',
            tradeoff: 'The factors themselves cannot be packed the same way — each arm needs its own triangular matrix — so the layout is split and the width computation still chases pointers.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The rank-one update and the back-substitutions are dense small-matrix kernels that Eigen vectorizes well once optimization is enabled.',
            tradeoff: '-march=native produces a binary that may fault on older CPUs in a heterogeneous fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(d^2) per observation instead of O(d^3); one GEMV per decision for the mean terms. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Three bandit algorithms, transcribed side by side.
//!
//! All three answer the same question - which arm now - and the differences
//! between them are the whole content of the topic.

/// Explore at random, otherwise take the best known arm.
///
/// The flaw is visible in one line: the random branch picks UNIFORMLY, so an
/// arm already known to be terrible is explored exactly as often as one that is
/// plausibly best. That is why fixed-epsilon regret is linear in T.
pub fn epsilon_greedy(means: &[f64], epsilon: f64, rand: &mut dyn FnMut() -> f64) -> usize {
    if rand() < epsilon {
        return (rand() * means.len() as f64) as usize % means.len();
    }

    let mut best = 0;
    for arm in 1..means.len() {
        if means[arm] > means[best] {
            best = arm;
        }
    }
    best
}

/// Optimism in the face of uncertainty.
///
/// The bonus is a confidence RADIUS: wide for an arm pulled rarely, shrinking
/// as the square root of its pull count. Exploration goes where the uncertainty
/// is rather than where a coin lands, which is the entire improvement.
///
/// Note the numerator is the TOTAL pull count, not this arm's. That is what
/// makes every bonus creep upward as time passes, so an arm abandoned early is
/// eventually revisited rather than written off forever.
pub fn ucb1(means: &[f64], counts: &[usize], total_pulls: usize) -> usize {
    for arm in 0..means.len() {
        if counts[arm] == 0 {
            return arm; // the bonus is undefined without a pull
        }
    }

    let mut best = 0;
    let mut best_score = f64::NEG_INFINITY;
    for arm in 0..means.len() {
        let bonus = (2.0 * (total_pulls as f64).ln() / counts[arm] as f64).sqrt();
        let score = means[arm] + bonus;
        if score > best_score {
            best = arm;
            best_score = score;
        }
    }
    best
}

/// A Beta draw from two Gammas: if X ~ Gamma(a, 1) and Y ~ Gamma(b, 1) then
/// X / (X + Y) ~ Beta(a, b). Written out because the point is that Thompson
/// sampling needs nothing more exotic than this.
pub fn sample_beta(alpha: f64, beta: f64, sample_gamma: &mut dyn FnMut(f64) -> f64) -> f64 {
    let x = sample_gamma(alpha);
    let y = sample_gamma(beta);
    x / (x + y)
}

/// Probability matching, via one draw per arm.
///
/// A Beta(1 + successes, 1 + failures) posterior over each arm's success rate,
/// one sample from each, and the argmax of the samples. An arm is played with
/// exactly the probability that it IS the best arm under the current posterior
/// - precisely as much exploration as the uncertainty justifies, with no bonus
/// term and no schedule to tune.
pub fn thompson_sampling(
    successes: &[f64],
    failures: &[f64],
    sample_gamma: &mut dyn FnMut(f64) -> f64,
) -> usize {
    let mut best = 0;
    let mut best_draw = f64::NEG_INFINITY;
    for arm in 0..successes.len() {
        let draw = sample_beta(1.0 + successes[arm], 1.0 + failures[arm], sample_gamma);
        if draw > best_draw {
            best = arm;
            best_draw = draw;
        }
    }
    best
}

pub trait Bandit {
    fn pull(&mut self, arm: usize) -> f64;
    fn best_mean(&self) -> f64;
}

/// One pull per step, with the regret decomposition accumulated alongside.
///
/// Regret is gap times pulls, summed over suboptimal arms. Tracking it directly
/// makes the accounting visible: a near-tied arm costs almost nothing to keep
/// trying, and a badly worse one has to be abandoned fast.
pub fn run(
    bandit: &mut dyn Bandit,
    n_arms: usize,
    horizon: usize,
    algorithm: &str,
    epsilon: f64,
    rand: &mut dyn FnMut() -> f64,
    sample_gamma: &mut dyn FnMut(f64) -> f64,
) -> Vec<f64> {
    let mut means = vec![0.0; n_arms];
    let mut counts = vec![0usize; n_arms];
    let mut successes = vec![0.0; n_arms];
    let mut failures = vec![0.0; n_arms];

    let mut cumulative_reward = 0.0;
    let best_mean = bandit.best_mean();
    let mut regret_history = Vec::new();

    for step in 1..=horizon {
        let arm = match algorithm {
            "epsilon" => epsilon_greedy(&means, epsilon, rand),
            "ucb" => ucb1(&means, &counts, step),
            _ => thompson_sampling(&successes, &failures, sample_gamma),
        };

        let reward = bandit.pull(arm);

        // Incremental mean: a running sum and a count is ALL the state a
        // non-contextual bandit has, which is why this fits in a request
        // handler and nothing else in this category does.
        counts[arm] += 1;
        means[arm] += (reward - means[arm]) / counts[arm] as f64;

        successes[arm] += reward;
        failures[arm] += 1.0 - reward;

        cumulative_reward += reward;
        regret_history.push(step as f64 * best_mean - cumulative_reward);
    }

    regret_history
}`,
        profile: 'O(K) per decision to score the arms, O(1) to update. Three running numbers per arm and nothing else.',
      },
      'make-it-right': {
        code: `//! Bandit policies - one trait, a forgetting mechanism, honest diagnostics.

use std::fmt;

/// Newtypes so a discount and an exploration constant cannot be transposed.
/// Both are small positive floats and swapping them changes behaviour without
/// failing.
#[derive(Debug, Clone, Copy)]
pub struct Discount(pub f64);

#[derive(Debug, Clone, Copy)]
pub struct ExplorationConstant(pub f64);

#[derive(Debug, PartialEq, Eq)]
pub enum BanditError {
    SingleArm,
    BadDiscount,
    NonPositivePrior,
    RewardOutOfRange,
    FloorExceedsOne,
}

impl fmt::Display for BanditError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SingleArm => write!(f, "a one-armed bandit has nothing to decide"),
            Self::BadDiscount => write!(f, "discount must be in (0, 1]"),
            Self::NonPositivePrior => write!(f, "Beta prior parameters must be positive"),
            Self::RewardOutOfRange => write!(f, "Beta-Bernoulli needs a reward in [0, 1]"),
            Self::FloorExceedsOne => write!(f, "per-arm floor times arm count must not exceed one"),
        }
    }
}

impl std::error::Error for BanditError {}

/// One trait, three implementations. The whole topic is the difference between
/// them, so making them substitutable is the point of the abstraction rather
/// than incidental tidiness.
pub trait Policy {
    fn select(&mut self, step: usize) -> usize;
    fn update(&mut self, arm: usize, reward: f64) -> Result<(), BanditError>;
}

/// Sufficient statistics with a DISCOUNT.
///
/// Every regret bound in this area assumes stationary arm means. Without
/// forgetting, an arm with a long history has a confidence interval that has
/// already collapsed and cannot be overtaken when the world changes - and the
/// failure mode is a system confidently serving a formerly-best arm. The
/// discount costs asymptotic regret and buys responsiveness, which is almost
/// always the right trade in production.
pub struct ArmStatistics {
    discount: Discount,
    weighted_sum: Vec<f64>,
    weighted_count: Vec<f64>,
}

impl ArmStatistics {
    pub fn new(n_arms: usize, discount: Discount) -> Result<Self, BanditError> {
        if n_arms < 2 {
            return Err(BanditError::SingleArm);
        }
        if discount.0 <= 0.0 || discount.0 > 1.0 {
            return Err(BanditError::BadDiscount);
        }
        Ok(Self {
            discount,
            weighted_sum: vec![0.0; n_arms],
            weighted_count: vec![0.0; n_arms],
        })
    }

    pub fn update(&mut self, arm: usize, reward: f64) {
        // Everything decays, not just the arm that was pulled: the passage of
        // time is what makes old evidence about ANY arm less relevant.
        for value in &mut self.weighted_sum {
            *value *= self.discount.0;
        }
        for value in &mut self.weighted_count {
            *value *= self.discount.0;
        }
        self.weighted_sum[arm] += reward;
        self.weighted_count[arm] += 1.0;
    }

    /// An unpulled arm has no mean. Returning zero rather than a NaN keeps the
    /// comparison well-defined without pretending the arm has been measured.
    #[must_use]
    pub fn mean(&self, arm: usize) -> f64 {
        if self.weighted_count[arm] > 0.0 {
            self.weighted_sum[arm] / self.weighted_count[arm]
        } else {
            0.0
        }
    }

    #[must_use]
    pub fn count(&self, arm: usize) -> f64 {
        self.weighted_count[arm]
    }

    /// Total weighted evidence. With a discount this plateaus rather than
    /// growing, which is what keeps the confidence bonus from shrinking away.
    #[must_use]
    pub fn effective_horizon(&self) -> f64 {
        self.weighted_count.iter().sum()
    }

    #[must_use]
    pub fn len(&self) -> usize {
        self.weighted_count.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.weighted_count.is_empty()
    }
}

pub struct UcbPolicy {
    stats: ArmStatistics,
    /// The theoretical constant is usually too exploratory in practice. Tuning
    /// it down is normal and belongs here as a recorded decision rather than as
    /// a magic number edited into the formula.
    exploration: ExplorationConstant,
}

impl Policy for UcbPolicy {
    fn select(&mut self, _step: usize) -> usize {
        if let Some(arm) = (0..self.stats.len()).find(|&arm| self.stats.count(arm) == 0.0) {
            return arm; // the bonus needs a pull first
        }

        let horizon = self.stats.effective_horizon().max(std::f64::consts::E);
        (0..self.stats.len())
            .map(|arm| {
                let bonus =
                    self.exploration.0 * (2.0 * horizon.ln() / self.stats.count(arm)).sqrt();
                (arm, self.stats.mean(arm) + bonus)
            })
            // total_cmp rather than partial_cmp().unwrap(): a NaN from a
            // degenerate count would panic, and panicking in a request handler
            // is a worse failure than picking a defined arm.
            .max_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or(0, |(arm, _)| arm)
    }

    fn update(&mut self, arm: usize, reward: f64) -> Result<(), BanditError> {
        self.stats.update(arm, reward);
        Ok(())
    }
}

/// Beta-Bernoulli posterior sampling.
///
/// Preferred under delayed or batched feedback: several decisions drawn from
/// one posterior diversify naturally, where UCB is deterministic and will serve
/// the same arm for an entire batch because nothing has updated in between.
pub struct ThompsonPolicy<F> {
    prior_alpha: f64,
    prior_beta: f64,
    successes: Vec<f64>,
    failures: Vec<f64>,
    sample_gamma: F,
}

impl<F: FnMut(f64) -> f64> ThompsonPolicy<F> {
    pub fn new(
        n_arms: usize,
        prior_alpha: f64,
        prior_beta: f64,
        sample_gamma: F,
    ) -> Result<Self, BanditError> {
        if prior_alpha <= 0.0 || prior_beta <= 0.0 {
            return Err(BanditError::NonPositivePrior);
        }
        Ok(Self {
            prior_alpha,
            prior_beta,
            successes: vec![0.0; n_arms],
            failures: vec![0.0; n_arms],
            sample_gamma,
        })
    }
}

impl<F: FnMut(f64) -> f64> Policy for ThompsonPolicy<F> {
    fn select(&mut self, _step: usize) -> usize {
        let mut best = 0;
        let mut best_draw = f64::NEG_INFINITY;
        for arm in 0..self.successes.len() {
            let x = (self.sample_gamma)(self.prior_alpha + self.successes[arm]);
            let y = (self.sample_gamma)(self.prior_beta + self.failures[arm]);
            let draw = x / (x + y);
            if draw > best_draw {
                best = arm;
                best_draw = draw;
            }
        }
        best
    }

    fn update(&mut self, arm: usize, reward: f64) -> Result<(), BanditError> {
        if !(0.0..=1.0).contains(&reward) {
            return Err(BanditError::RewardOutOfRange);
        }
        // Fractional updates are valid for a reward in [0, 1] and keep the
        // conjugacy exact, which is cleaner than thresholding to a Bernoulli.
        self.successes[arm] += reward;
        self.failures[arm] += 1.0 - reward;
        Ok(())
    }
}

/// A guaranteed share of traffic per arm.
///
/// Absent from every bound in the literature and standard in production, for
/// reasons the theory does not model: it preserves the ability to notice that
/// an arm has become good, and it leaves a sample that ordinary inference can
/// actually be run on - which adaptively collected data cannot support.
pub struct AllocationFloor<P, R> {
    inner: P,
    n_arms: usize,
    floor: f64,
    rand: R,
}

impl<P: Policy, R: FnMut() -> f64> AllocationFloor<P, R> {
    pub fn new(inner: P, n_arms: usize, floor: f64, rand: R) -> Result<Self, BanditError> {
        if floor < 0.0 || floor * n_arms as f64 > 1.0 {
            return Err(BanditError::FloorExceedsOne);
        }
        Ok(Self { inner, n_arms, floor, rand })
    }
}

impl<P: Policy, R: FnMut() -> f64> Policy for AllocationFloor<P, R> {
    fn select(&mut self, step: usize) -> usize {
        if (self.rand)() < self.floor * self.n_arms as f64 {
            return ((self.rand)() * self.n_arms as f64) as usize % self.n_arms;
        }
        self.inner.select(step)
    }

    fn update(&mut self, arm: usize, reward: f64) -> Result<(), BanditError> {
        self.inner.update(arm, reward)
    }
}`,
        rationale:
          'The three algorithms become one trait, because the topic is the difference between them. Statistics gain a discount, since every bound here assumes stationary arm means and an undiscounted arm with a long history has a collapsed interval that cannot be overtaken. Rewards outside [0, 1] return an error rather than corrupting the conjugacy, total_cmp replaces an unwrap that a degenerate count would turn into a panic inside a request handler, and an allocation floor wraps any policy — absent from the theory and standard in production for reasons the theory does not model.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(K) per decision; the discount makes the update O(K) rather than O(1), and each policy owns its state.',
      },
      'make-it-fast': {
        code: `//! LinUCB - Cholesky maintained incrementally, never an explicit inverse.

use ndarray::{s, Array1, Array2, ArrayView1};

/// The contextual case is where production lives, and where the naive
/// implementation quietly becomes the bottleneck. Per arm it maintains a d-by-d
/// design matrix A = lambda*I + sum x x^T, and it needs two things from it: the
/// ridge solution A^-1 b, and the confidence width sqrt(x^T A^-1 x).
///
/// Forming A^-1 to get either is the wrong move twice over - O(d^3) per update,
/// and numerically the worst available way to solve a linear system.
pub struct CholeskyArm {
    /// Lower-triangular L with A = L L^T, updated in place.
    factor: Array2<f64>,
    b: Array1<f64>,
    dimension: usize,
    /// Scratch reused by every update and every score, so the hot path
    /// allocates nothing at all.
    scratch: Array1<f64>,
    updates_since_refactor: usize,
}

impl CholeskyArm {
    #[must_use]
    pub fn new(dimension: usize, ridge: f64) -> Self {
        // A = ridge * I, so its factor starts as sqrt(ridge) * I.
        let mut factor = Array2::zeros((dimension, dimension));
        for i in 0..dimension {
            factor[[i, i]] = ridge.sqrt();
        }
        Self {
            factor,
            b: Array1::zeros(dimension),
            dimension,
            // Sized once; a growing scratch would reallocate inside the request
            // path, which is the one place a bandit cannot afford it.
            scratch: Array1::zeros(dimension),
            updates_since_refactor: 0,
        }
    }

    /// Rank-one Cholesky update, in place, O(d^2).
    ///
    /// The classic cholupdate: sweep down the diagonal, rotating each row so
    /// that the factor absorbs the outer product. No matrix is formed and no
    /// inverse is touched, against O(d^3) to refactorize and the same to invert.
    pub fn update(&mut self, features: ArrayView1<'_, f64>, reward: f64) {
        self.scratch.assign(&features);

        for k in 0..self.dimension {
            let diagonal = self.factor[[k, k]];
            let x_k = self.scratch[k];
            let r = diagonal.hypot(x_k);
            let cosine = r / diagonal;
            let sine = x_k / diagonal;
            self.factor[[k, k]] = r;

            if k + 1 < self.dimension {
                // Slice views rather than indexed loops: the zipped walk over
                // two contiguous columns drops its bounds checks.
                let (mut column, mut tail) = (
                    self.factor.slice_mut(s![k + 1.., k]),
                    self.scratch.slice_mut(s![k + 1..]),
                );
                for (c, t) in column.iter_mut().zip(tail.iter_mut()) {
                    *c = (*c + sine * *t) / cosine;
                    *t = cosine * *t - sine * *c;
                }
            }
        }

        self.b.scaled_add(reward, &features);
        self.updates_since_refactor += 1;
    }

    /// Predicted reward plus the confidence width, via triangular solves.
    ///
    ///   theta = A^-1 b            is  two back-substitutions through L
    ///   width = sqrt(x^T A^-1 x)  is  the norm of z after solving L z = x
    ///
    /// Neither forms an inverse, and the second is why this formulation is
    /// worth the trouble: the width IS the norm of a solve, which stays
    /// accurate where x^T A^-1 x computed from an explicit inverse loses
    /// precision - exactly when A is near-singular, which is the
    /// under-explored regime the bonus exists for.
    #[must_use]
    pub fn score(&self, theta: ArrayView1<'_, f64>, features: ArrayView1<'_, f64>, alpha: f64) -> f64 {
        let z = forward_substitute(&self.factor, features);
        features.dot(&theta) + alpha * z.dot(&z).sqrt()
    }

    /// Rank-one updates accumulate drift. Periodically rebuilding the factor
    /// from the accumulated matrix restores exactness, and the interval is a
    /// real trade rather than defensive padding.
    #[must_use]
    pub fn needs_refactor(&self) -> bool {
        self.updates_since_refactor >= 10_000
    }
}

/// Solve L z = rhs by forward substitution over contiguous rows.
#[inline]
#[must_use]
pub fn forward_substitute(factor: &Array2<f64>, rhs: ArrayView1<'_, f64>) -> Array1<f64> {
    let n = rhs.len();
    let mut z = Array1::zeros(n);
    for i in 0..n {
        let row = factor.slice(s![i, ..i]);
        let already = row.dot(&z.slice(s![..i]));
        z[i] = (rhs[i] - already) / factor[[i, i]];
    }
    z
}

/// Score every arm for one context with the ridge solutions packed contiguously.
///
/// Per-arm objects scattered across the heap mean K cache misses per decision
/// before any arithmetic happens. Packing the solutions into one (K x d)
/// row-major matrix makes the mean term a single GEMV, which at production arm
/// counts is the difference between a pointer chase and one BLAS call.
#[must_use]
pub fn score_all_arms(
    thetas: &Array2<f64>,
    arms: &[CholeskyArm],
    features: ArrayView1<'_, f64>,
    alpha: f64,
) -> Array1<f64> {
    // One matrix-vector product covers every arm's predicted reward.
    let mut scores = thetas.dot(&features);

    for (arm_index, arm) in arms.iter().enumerate() {
        // The width still needs a per-arm solve, because each arm has its own
        // factor - this is the half that does not batch, and knowing which half
        // does is the point of separating them.
        let z = forward_substitute(&arm.factor, features);
        scores[arm_index] += alpha * z.dot(&z).sqrt();
    }
    scores
}`,
        rationale:
          'Instead of forming and storing each arm\'s inverse design matrix, the Cholesky factor is maintained directly with an in-place rank-one update — O(d²) per observation against O(d³) to refactorize — and every quantity the algorithm needs becomes a triangular solve. That is faster and materially better conditioned: the confidence width is the norm of a solve, which stays accurate exactly where an explicit inverse loses precision, in the under-explored regime the bonus exists for. The ridge solutions are packed contiguously so the mean term is one GEMV rather than K cache misses.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The rank-one sweep walks two contiguous column slices with a zipped iterator, so the inner loop of the update streams instead of indexing a two-dimensional array per element.',
            tradeoff: 'It fixes the factor as a dense square array even though only the lower triangle is used, so roughly half the allocation is never touched.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Packing the per-arm ridge solutions into one row-major matrix makes every arm\'s predicted reward a single GEMV instead of K separate dot products across scattered objects.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, and the packed block must be kept in sync with the per-arm factors, so adding an arm forces a rebuild.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The scratch vector is sized once at construction, so the update path never reallocates inside a request handler — the one place a bandit cannot afford to.',
            tradeoff: 'Each arm carries its own scratch, so memory grows with the arm count even though only one arm is updated at a time.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The forward substitution is called once per arm per decision, so removing the call overhead matters at production arm counts despite the small body.',
            tradeoff: 'Inlining a routine used from several call sites grows code size, which can cost instruction-cache locality in the scoring loop.',
          },
        ],
        libraryName: 'ndarray',
        profile: 'O(d^2) per observation instead of O(d^3); one GEMV per decision for the mean terms. Illustrative, not a measured benchmark.',
      },
    },
  },
};
