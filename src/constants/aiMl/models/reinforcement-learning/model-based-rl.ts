import type { AiMlModel } from '../../types';

/**
 * Model-Based RL & MPC — the entry where the agent stops learning only
 * what to do and starts learning what happens.
 *
 * Every transition becomes a full supervised example instead of one
 * scalar reward, which is where the sample efficiency comes from. And
 * a planner pointed at a learned model is an optimizer pointed at a
 * learned function, which is where the trouble comes from.
 */
export const MODEL_BASED_RL: AiMlModel = {
  slug: 'model-based-rl',
  name: 'Model-Based RL & MPC',
  aliases: ['Model Predictive Control', 'MPC', 'Dyna', 'CEM planning', 'World models', 'PETS'],
  category: 'reinforcement-learning',
  group: 'online-decision',
  kind: 'model',

  paradigms: ['reinforcement', 'supervised'],
  taskTypes: ['control', 'sequence-modeling'],
  paradigmNote:
    'Two learning problems stacked. The dynamics model is fitted by ordinary supervised regression — the next state is the label, so every transition is a full, densely supervised example — and the control problem is then solved against that model by planning or by policy learning. That split is the whole reason this branch is dramatically more sample-efficient than anything model-free: it extracts a state vector of information per step rather than one scalar.',

  intuition:
    'Every method so far has learned what to do without ever learning what happens. A transition gives a model-free agent one scalar of information — the reward — and it throws away the rest, which is the next state, a full observation of how the world responded. Model-based methods keep it. Fit a dynamics model that predicts the next state from the current state and action, and suddenly each interaction is a complete supervised example, which is why this branch routinely learns from one or two orders of magnitude fewer interactions than a model-free one. Once a model exists there are two things to do with it. Plan with it: search over action sequences by rolling them out in imagination, pick the best one, execute only its first action, then throw the rest away and replan from the new state. That last part sounds wasteful and is the entire mechanism — replanning every step means model error never gets a chance to accumulate, and it is why model predictive control is deployed across process industries where no other optimal-control method is. Or generate with it: use the model to synthesize experience and train an ordinary model-free agent on the mix, which is Dyna and its descendants. The catch is the one that keeps recurring in this category. A planner searching for the best action sequence under a learned model is an optimizer pointed at a learned function, and it will find the places where the model is wrong and optimistic — except here the errors compound step by step down the rollout, so a model that is slightly wrong per step can be arbitrarily wrong at horizon twenty. Every serious technique in this area is a response to that.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\max_{\\phi}\\ \\sum_{t} \\log p_{\\phi}\\bigl(s_{t+1} \\mid s_t, a_t\\bigr), \\qquad a^{*}_{t} = \\Bigl[\\arg\\max_{a_{t:t+H}} \\mathbb{E}_{\\hat{s} \\sim p_{\\phi}}\\sum_{k=0}^{H} \\gamma^{k} r(\\hat{s}_{t+k}, a_{t+k})\\Bigr]_{0}',
      symbols: [
        { symbol: '\\log p_{\\phi}(s_{t+1} \\mid s_t, a_t)', meaning: 'the dynamics likelihood — an ordinary supervised objective over transitions, which is what makes this branch sample-efficient' },
        { symbol: 'H', meaning: 'the planning horizon, and the single most important knob: long enough to see consequences, short enough that compounding model error has not ruined the rollout' },
        { symbol: '[\\cdot]_{0}', meaning: 'execute only the FIRST action of the optimized sequence, then replan — receding horizon, and the reason model error never accumulates in practice' },
        { symbol: '\\mathbb{E}_{\\hat{s} \\sim p_{\\phi}}', meaning: 'the expectation is over the model\'s own predictions, not the world; everything the planner believes comes from a function that was fitted rather than observed' },
      ],
    },
    reading:
      'Two objectives, one stacked on the other, and they fail in different ways. The first is a plain likelihood: fit the transition distribution. It behaves like supervised learning because it is supervised learning, with the usual diagnostics and the usual notion of held-out error. The second is a search: find the action sequence that the fitted model says is best. Nothing about the second objective is estimated from data — it is an optimization over a function, and its value is only as meaningful as the function is accurate. That mismatch is the heart of the method. A model with one percent error per step and a twenty-step horizon has no useful accuracy at the end of the rollout, and the planner will preferentially choose sequences whose predicted return is high, which correlates with wherever the model has drifted optimistically. This is the same optimizer-exploits-model failure that a deterministic actor has against its critic, with compounding added. Two structural responses appear in the formula itself. The receding horizon is the first: only the first action is executed, so the plan is recomputed from a real observed state every step and the model never has to be right for more than one step at a time in practice. The second is the horizon length, which is a genuine bias-variance trade rather than a tuning detail — too short and the plan is myopic, too long and the later terms are fiction. The usual third response is not visible here: replace the point prediction with a distribution and an ensemble, so the planner can be told how uncertain the model is and penalized for exploiting places where it does not know.',
  },

  optimization: {
    method: 'Supervised fitting of a dynamics model, then either decision-time planning by sampling-based optimization over action sequences (random shooting, CEM, MPPI) or policy learning on model-generated rollouts (Dyna, MBPO)',
    updateRule: {
      formula:
        '\\mu \\leftarrow \\tfrac{1}{|E|}\\sum_{a \\in E} a, \\quad \\sigma^2 \\leftarrow \\tfrac{1}{|E|}\\sum_{a \\in E}(a - \\mu)^2, \\qquad E = \\text{top-}k\\ \\text{of}\\ \\{a^{(i)} \\sim \\mathcal{N}(\\mu, \\sigma^2)\\}_{i=1}^{N}',
      symbols: [
        { symbol: 'E', meaning: 'the elite set — the best k of N sampled action sequences under the model, which is the only thing the next iteration is fitted to' },
        { symbol: '\\mathcal{N}(\\mu, \\sigma^2)', meaning: 'a distribution over action SEQUENCES, refitted each iteration; the cross-entropy method is nothing more than repeatedly resampling from the elites' },
        { symbol: 'N', meaning: 'candidates per iteration, which is pure parallel compute — the one place in this category where more hardware straightforwardly buys a better decision' },
        { symbol: 'k', meaning: 'elite count; small makes the search greedy and prone to exploiting model error, large makes it slow to converge within the time budget' },
      ],
    },
    rationale:
      'The design decisions divide cleanly into the model and what is done with it. On the model side, the single most valuable choice is to predict a distribution rather than a point and to keep an ensemble of them, because that gives two distinct kinds of uncertainty: the spread within a model captures noise in the environment, and the disagreement between models captures ignorance about it. Only the second is reducible by collecting data, and only the second should make a planner cautious — conflating them is a common and consequential error. Predicting state deltas rather than absolute next states is the other standard choice and it matters more than it looks, because consecutive states are highly correlated and a model predicting absolutes can achieve excellent held-out error while being useless for planning. On the planning side, sampling-based optimizers dominate gradient-based ones because the model is often non-differentiable, the reward usually is, and the action space is low-dimensional enough that sampling works. Random shooting is the baseline; the cross-entropy method refits a distribution to the elite candidates and converges far faster for the same budget; MPPI weights candidates softly rather than truncating to elites and is smoother. Horizon length is the decisive hyperparameter, and there is a useful heuristic: extend the horizon only until the model\'s multi-step prediction error stops being small, and measure that rather than guessing. The alternative use of the model — generating synthetic experience for a model-free learner — trades differently: it is cheap at decision time, since there is no planning loop, and it moves the compounding-error problem into the training data instead, which is why MBPO-style methods branch short model rollouts off real states rather than generating long imagined trajectories.',
    hyperparameters: [
      { name: 'planning horizon', role: 'The decisive knob. Long enough to see the consequences of an action, short enough that compounding model error has not turned the later terms into fiction. Set it from measured multi-step error, not by guessing', typicalRange: '5 to 30 steps' },
      { name: 'candidates per iteration', role: 'How many action sequences are evaluated. Pure parallel compute, and the one place in this category where more hardware straightforwardly buys a better decision', typicalRange: '100 to 1,000' },
      { name: 'elite fraction', role: 'What the cross-entropy distribution is refitted to. Too greedy and the search converges onto whatever the model is most optimistic about; too loose and it does not converge in the time available', typicalRange: 'top 10%' },
      { name: 'ensemble size', role: 'Members of the dynamics ensemble. Their disagreement is the estimate of what the model does not know, which is the only uncertainty a planner should be penalized by', typicalRange: '5 to 7 models' },
      { name: 'uncertainty penalty', role: 'How much predicted return is discounted where the ensemble disagrees. This is the explicit defence against the planner exploiting model error, and it is essential offline', typicalRange: 'problem-specific; tune against held-out rollouts' },
      { name: 'model rollout length (Dyna-style)', role: 'How far to imagine when generating synthetic experience. Short rollouts branched off real states beat long imagined trajectories, for exactly the compounding reason', typicalRange: '1 to 5 steps' },
      { name: 'model retrain cadence', role: 'How often the dynamics model is refitted as new data arrives. The data distribution shifts as the policy improves, so a model fitted once is fitted to a policy that no longer exists', typicalRange: 'every few hundred environment steps' },
      { name: 'replan frequency', role: 'How often the plan is recomputed. Every step is the standard and is what keeps model error from accumulating; anything less trades robustness for compute', typicalRange: 'every step' },
    ],
    convergence:
      'There is no convergence guarantee for the learned-model case, and the theory that does exist is instructive about why. Classical MPC with a known model and a convex problem has real stability guarantees, and it is one of the few genuinely deployed optimal-control technologies — so the guarantees are lost precisely at the step where the model stops being derived and starts being fitted. What replaces them is a set of characteristic failures. Model exploitation is the first and the defining one: the planner searches for high predicted return and finds regions where the model is optimistically wrong, so predicted return climbs while realized return does not, and the gap between the two is the diagnostic that matters. Compounding error is the second and it is mathematically unavoidable — a per-step error that looks negligible is multiplied down the rollout, which is why a horizon that worked at ten steps can be useless at thirty, and why measured multi-step error should set the horizon rather than intuition. Distribution shift is the third: the model is fitted on data from the current policy, the planner immediately moves the policy, and the new states are exactly the ones the model has not seen. This is why interleaving model fitting with data collection is mandatory rather than optional, and why the offline setting — no new data at all — needs an explicit pessimism penalty to be workable. The fourth is quieter: a model can have excellent one-step held-out error and still be useless, because one-step error on highly correlated consecutive states is an easy target. Multi-step rollout error against real trajectories is the honest evaluation and is routinely skipped.',
    complexity:
      'Model fitting is ordinary supervised training and is cheap relative to everything else. Decision-time planning is where the cost lives: N candidate sequences times H horizon steps times the ensemble size, per decision, which is an enormous amount of compute inside a control loop — and it is all embarrassingly parallel, so it maps onto batched hardware essentially perfectly. That combination is unusual in this category: the wall-clock constraint is a real-time deadline rather than a training budget, and the work fits a GPU. The Dyna-style alternative inverts this: planning cost moves to training time, decision time becomes a single policy forward pass, and what is paid instead is the risk of training on synthetic data. Sample complexity is the reason for the whole branch — one to two orders of magnitude fewer environment interactions than a model-free method is typical on continuous control, which is the difference between feasible and infeasible when interactions are physical.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'The dynamics model is a multivariate forecaster conditioned on actions: it predicts the system\'s next state given its current state and what is done to it, which is a forecasting problem with an exogenous input the forecaster controls.',
        where: [
          'Forecasting a controlled process, where the future depends on decisions still to be made and an uncontrolled forecast is answering the wrong question',
          'Scenario generation: rolling the model forward under different action sequences, which is what a planner does and what a what-if analysis wants',
          'Multi-step rollout error as the evaluation that matters, which is the same discipline good forecasting practice already has',
          'Model predictive control as the bridge between a forecast and a decision, which is the form the forecast actually gets used in',
        ],
        why: 'Genuinely adjacent, and the adjacency is worth being precise about. A dynamics model is a forecaster — same architecture choices, same multi-step error problem, same temptation to report one-step accuracy that means nothing. What differs is that the future depends on actions not yet taken, so the object being learned is conditional on a decision rather than unconditional on time. That changes the evaluation in a way forecasters recognize immediately: you cannot score it on a historical trajectory alone, because the interesting queries are about action sequences that were never executed, and no amount of held-out data answers those. The transfer runs both directions and is unusually clean. Forecasting practice supplies the discipline this area needs — rolling-origin evaluation, multi-step error, honest baselines, predicting deltas rather than levels. Model-based control supplies the framing forecasting often lacks: a forecast exists to support a decision, and the horizon that matters is the one the decision acts on. Where this stops being a forecasting problem is the moment the planner enters: optimizing over the model\'s output is not something a forecast evaluation covers, and it introduces a failure — the optimizer finding the model\'s errors — that no forecasting metric detects.',
        featurization: [
          'Predict state deltas rather than absolute next states; consecutive states are highly correlated and predicting levels gives excellent one-step error with no useful signal',
          'Evaluate on multi-step rollout error against real trajectories, not one-step held-out error, which is an easy target and nearly uninformative',
          'Normalize per state dimension, since a dynamics vector mixes quantities on wildly different scales and the loss will otherwise be dominated by the largest',
          'Model the action conditioning explicitly rather than treating past actions as ordinary exogenous features, because the queries that matter are counterfactual',
        ],
        evaluation:
          'Multi-step rollout error at the horizon the planner actually uses, measured against real trajectories from a held-out period — that number sets the horizon and nothing else should. Report calibration of the predictive intervals too, since a planner penalized by uncertainty is only as good as that uncertainty is honest, and an overconfident model is worse than a less accurate well-calibrated one.',
        pitfalls: [
          'One-step held-out error reported as model quality, when consecutive states are correlated enough to make it trivially good',
          'Evaluating only on historical action sequences, which never covers the counterfactual queries the planner will make',
          'Predicting absolute states rather than deltas, which hides the actual difficulty of the problem',
          'Assuming a forecast-quality model is a plan-quality model, when the planner will search exactly where the model is wrong',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, and this entry is about optimizing a decision against a learned model of consequences — the related idea of treating dynamics-model prediction error as a novelty signal belongs to the density and reconstruction methods, which is where that argument is made properly.',
      },
      optimization: {
        fit: 'primary',
        how: 'Learn how the system responds to actions, then optimize over action sequences against that learned model, executing only the first action and replanning from the next real observation.',
        where: [
          'Sample efficiency as a structural property: every transition is a full supervised example rather than one scalar reward',
          'The receding horizon as the mechanism that keeps model error from accumulating, and the reason MPC ships where other optimal control does not',
          'Optimizer-exploits-model with compounding error, which is the sharpest instance of a failure that recurs throughout this category',
          'Epistemic versus aleatoric uncertainty as an operational distinction: only ignorance should make a planner cautious, and only ignorance is reducible',
        ],
        why: 'The branch with the best sample efficiency and the most instructive failure mode, and the lessons here generalize further than anything else in this category. The first is about information: a scalar reward is an extraordinarily thin channel, and if the system\'s response is observable then learning it turns every interaction into dense supervision. Any time a pipeline is learning from a summary statistic when the full outcome was available, that comparison applies. The second is the receding horizon, which is a genuinely deep idea stated simply — plan far ahead, commit only to the next step, and recompute. It converts a method that requires a model accurate over twenty steps into one that requires a model accurate over one, and the same pattern appears anywhere a plan meets an imperfect forecast. The third is the uncertainty distinction: the variance within a model and the disagreement between models mean different things, and only the second tells you where more data would help. Conflating them produces a planner that is cautious about a noisy but well-understood region and confident in a region it has never seen. Where this branch is the wrong choice is sharply defined. If a simulator already exists, you already have a model and the entire value proposition evaporates — use it directly with a model-free method. If the dynamics are harder to learn than the policy, which is common in contact-rich or chaotic systems, the model will be the bottleneck and a model-free method will win. And if the decision has a real-time deadline that a planning loop cannot meet, the Dyna-style use of the model is the only viable form.',
        featurization: [
          'Interleave model fitting with data collection, because the planner immediately moves the policy into states the model has not seen',
          'Keep an ensemble and separate its disagreement from its predicted noise; only the first should make the planner cautious',
          'Set the horizon from measured multi-step rollout error rather than intuition, since that is precisely where compounding bites',
          'Check whether a simulator already exists — if it does, the sample-efficiency argument for learning a model is gone',
        ],
        evaluation:
          'Predicted return from the planner plotted against realized return on the same axes. Their divergence is model exploitation, it is the failure the entire branch is engineered around, and no single-series metric reveals it. Alongside that, report multi-step rollout error at the planning horizon and the environment interactions consumed — sample efficiency is the claim this branch makes and it should be measured rather than asserted.',
        pitfalls: [
          'A model fitted once and then planned against indefinitely, while the policy moves into states it never saw',
          'A horizon chosen by intuition, where compounding error has already made the later terms fiction',
          'Aleatoric and epistemic uncertainty conflated, producing caution in noisy regions and confidence in unknown ones',
          'Reaching for a learned model when a simulator already exists, which discards the only reason to accept the extra machinery',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Fit a model of the plant from operating data, then optimize a control sequence against it each cycle under explicit constraints, executing the first action and replanning from the next measurement.',
        where: [
          'Process control, where model predictive control with a first-principles model has been the deployed standard for decades',
          'Systems with hard operating constraints, which MPC handles natively inside the optimization rather than through a reward penalty',
          'Settings where interactions are physical and expensive, so one to two orders of magnitude better sample efficiency decides feasibility',
          'Hybrid designs where a learned residual corrects a first-principles model, which is usually the strongest option available',
        ],
        why: 'The strongest applied fit in this entire category, and the one place where the industrial track record predates the machine-learning framing by decades. Model predictive control is deployed across refining, chemicals, power and manufacturing, and the reasons are exactly its properties: constraints are handled inside the optimization rather than expressed as reward penalties an optimizer will trade away, the receding horizon absorbs disturbance and model error, and the whole thing is inspectable — a plan is a sequence of actions and their predicted consequences, which an engineer can read and challenge. What machine learning contributes is the model, in settings where deriving one from first principles is impractical, and the honest recommendation is almost always the hybrid: keep the physics where physics is available and learn a residual for what it misses. That structure preserves the constraint handling and the interpretability while fixing the part that was wrong. Two cautions. The guarantees classical MPC carries come from the model being correct, so a learned model buys flexibility at the cost of exactly the property that made the method trustworthy — and the planner will search wherever the learned part is optimistic. And a real-time deadline is a hard constraint on the planner: candidate count and horizon are bounded by the control cycle, which makes this one of the few settings where decision-time compute is the binding engineering problem.',
        featurization: [
          'Start from a first-principles model and learn a residual where it is wrong; the hybrid keeps the constraint handling and fixes the part that was failing',
          'Encode constraints inside the optimization rather than as reward penalties, since a penalty is a price and a constraint is not',
          'Size candidate count and horizon against the control cycle, because a plan that arrives late is not a plan',
          'Refit on recent operating data as the plant drifts, since a model fitted to last year\'s configuration is confidently wrong about this one',
        ],
        evaluation:
          'Closed-loop performance against the incumbent controller on matched scenarios, with constraint violations counted separately rather than averaged in. Report multi-step model error by operating regime, since a plant model that is accurate at the usual setpoint and wrong near a limit is wrong exactly where the controller will be pushed.',
        pitfalls: [
          'A purely learned model where physics was available, discarding both the guarantees and the interpretability for no gain',
          'Constraints as reward penalties, which an explicit optimizer will trade against return',
          'A model fitted on data from the incumbent controller, which never visited the regions the new one will',
          'A planning budget that does not fit the control cycle, which silently degrades to a stale plan',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'A dynamics model answers interventional queries — what happens if this action is taken — and a planner issues a great many of them, which makes the model\'s behaviour under intervention rather than under observation the property that matters.',
        where: [
          'Planning as a sequence of interventional queries, which is exactly what a do-operator expresses',
          'Learning a model from logged operating data, where the action was chosen by an existing controller and is therefore confounded with the state',
          'Offline model-based methods, whose pessimism penalties are a response to the same extrapolation problem causal inference calls positivity',
          'Distinguishing a model that predicts well from one that supports intervention, which is the central distinction in both fields',
        ],
        why: 'Included because the connection is structural rather than decorative, and because it names the failure precisely. A dynamics model fitted on logged data learns the conditional distribution of the next state given the state and the action that was actually taken — but the action was chosen by some controller as a function of the state, so action and state are confounded, and a model that has learned the resulting correlation will confidently predict the consequence of an action nobody would have taken in that state. That is the observational-versus-interventional gap, and a planner is a machine for finding exactly the action sequences the logged controller never produced. The correspondence extends to the remedies. Positivity — the requirement that every action have some probability in every state — is what the logged data fails, and the model-based response is an uncertainty penalty that refuses to trust predictions outside the support, which is the same idea as trimming or bounding in a causal estimator. Randomized exploration in the logged system is the analogue of a randomized experiment and is worth the cost for the same reason. The practical instruction is short: a dynamics model evaluated only on held-out prediction accuracy has been validated as an observational model and not as a causal one, and the planner will use it as the latter.',
        featurization: [
          'Check action coverage per state region before trusting the model there; a logged deterministic controller supplies none',
          'Add randomized exploration to the logged system where it is safe, which is the cheapest way to buy the support the model needs',
          'Penalize predictions where the ensemble disagrees, which is the operational form of refusing to extrapolate beyond support',
          'Validate on trajectories generated under a different action policy, not only on held-out data from the same controller',
        ],
        evaluation:
          'Prediction error on trajectories generated under a deliberately different action policy, which is the only evaluation that tests the interventional claim. Held-out accuracy on data from the logging controller validates the model as an observational one and says nothing about the queries a planner will actually make.',
        pitfalls: [
          'Held-out accuracy taken as evidence the model supports intervention, when it only evidences observational fit',
          'Logged data from a deterministic controller, which gives no support for any action it did not take',
          'No uncertainty penalty offline, leaving the planner free to exploit exactly the unsupported regions',
          'Treating the action as an ordinary feature, which hides that it was chosen as a function of the state',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The cheapest branch here in environment interactions — one to two orders of magnitude fewer than model-free on continuous control, because every transition is a full supervised example — and the most expensive at decision time if planning is used. Model fitting is ordinary supervised training. The planning loop is N candidates times H steps times ensemble size per decision, which is a large amount of compute inside a control cycle and is embarrassingly parallel, so it maps onto batched hardware almost perfectly. That inversion is unusual: the binding constraint is a real-time deadline rather than a training budget. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'Two very different profiles depending on how the model is used. A planning deployment runs the full optimization every control cycle, so latency is the design constraint and candidate count and horizon are chosen to fit it — the payoff is a decision that is inspectable, since the plan and its predicted consequences can be read directly. A Dyna-style deployment ships only the policy, so inference is one forward pass and the model never leaves training. Choosing between them is mostly a question of whether the control cycle can afford a search.',
    retrainingCadence:
      'Frequent, and more so than elsewhere in this category, because the failure it prevents is specific: the planner moves the system into states the model has not seen, so a model fitted once is fitted to a policy that no longer exists. Online settings interleave fitting with collection every few hundred steps. Deployed process control refits on recent operating data as the plant drifts, and the trigger is usually a rise in multi-step prediction error rather than a schedule.',
    driftAndMonitoring: [
      'Predicted return from the planner against realized return — their divergence is model exploitation, and it is the failure this branch is engineered around',
      'Multi-step rollout error at the planning horizon, measured against real trajectories; one-step error is an easy target and nearly uninformative',
      'Ensemble disagreement over the states actually visited, which is the direct read on whether the planner is operating inside its support',
      'Calibration of the predictive intervals, since an uncertainty penalty is only as good as the uncertainty is honest',
      'Planning latency against the control cycle, because a plan that arrives late has silently become a stale plan',
      'State-distribution shift between the fitting data and where the controller now operates, which is what makes a once-fitted model wrong',
    ],
    productionGotchas: [
      'One-step held-out error is close to meaningless on its own. Consecutive states are highly correlated, so a model can score beautifully and be useless at horizon ten — multi-step rollout error is the number that matters',
      'The planner will find the model\'s errors, because searching for high predicted return correlates with searching for optimistic error, and compounding makes it worse the longer the horizon',
      'Predict state deltas, not absolute next states. Predicting levels makes the task artificially easy and hides how wrong the model is about change',
      'Aleatoric and epistemic uncertainty are different things. Environment noise should not make a planner cautious; model ignorance should, and only the second shrinks with data',
      'A model fitted once and planned against indefinitely is being used outside its support within a few policy improvements. Interleaving fitting with collection is mandatory rather than a refinement',
      'Learning from logs produced by a deterministic controller gives no information about actions it never took, and the planner will confidently choose exactly those',
      'If a simulator already exists you already have a model, and the sample-efficiency argument that justifies this entire branch no longer applies',
      'Classical MPC\'s stability guarantees come from the model being correct. Replacing a derived model with a fitted one keeps the structure and gives up the guarantee, which is worth stating explicitly to anyone who expects both',
    ],
  },

  assumptions: [
    'The next state is observable and predictable from the current state and action, which is what makes the dynamics a supervised problem at all',
    'The state is Markov in what the model is given; a partially observed system needs history or a latent state, and a model fitted without one is fitting noise',
    'The reward function is known or separately learnable, since the planner scores imagined trajectories and must be able to evaluate states it has never visited',
    'Model error stays small enough over the planning horizon that the optimized sequence is meaningful, which is the assumption the receding horizon exists to weaken',
    'The data covers the state-action region the planner will search, or an explicit uncertainty penalty stands in for the coverage that is missing',
    'The decision-time compute budget accommodates the planning loop, or the model is used to train a policy instead',
  ],

  pros: [
    {
      point: 'By far the best sample efficiency in this category',
      context:
        'Every transition is a full supervised example rather than one scalar reward, which typically means one to two orders of magnitude fewer environment interactions. When interactions are physical, that is the difference between a feasible project and an impossible one',
    },
    {
      point: 'The receding horizon makes an imperfect model usable',
      context:
        'Plan far ahead, execute one step, replan from a real observation. It converts a method that would need a model accurate over twenty steps into one that needs it accurate over one, and it is why MPC ships where other optimal control does not',
    },
    {
      point: 'Constraints are handled inside the optimization',
      context:
        'A planner can refuse infeasible sequences outright, rather than expressing a limit as a reward penalty that an optimizer treats as a price. For any system with hard operating limits this is a categorical advantage over every other entry here',
    },
    {
      point: 'The decision is inspectable',
      context:
        'A plan is a sequence of actions and their predicted consequences, which an engineer can read, challenge and overrule. No policy network offers anything comparable, and in regulated or safety-relevant settings it is often the deciding property',
    },
    {
      point: 'The model transfers across objectives',
      context:
        'Dynamics do not depend on the reward, so a fitted model can be replanned against a new objective with no retraining at all. A value function or a policy has to be relearned from scratch when the goal changes',
    },
    {
      point: 'Planning compute is embarrassingly parallel',
      context:
        'Thousands of candidate rollouts are independent, so the decision-time cost maps onto batched hardware almost perfectly. This is the one place in this category where more hardware straightforwardly buys a better decision',
    },
  ],

  cons: [
    {
      point: 'The planner exploits the model, and compounding makes it worse',
      context:
        'Searching for high predicted return correlates with searching for optimistic model error, and per-step errors multiply down the rollout. Every technique in this area is a response to this, and none of them removes it',
    },
    {
      point: 'Decision-time cost can be prohibitive',
      context:
        'Candidates times horizon times ensemble size, every control cycle. Where the cycle is short the planning budget binds hard, and the Dyna-style alternative — train a policy on model rollouts — is the only viable form',
    },
    {
      point: 'Model quality is not the same as plan quality',
      context:
        'A model with excellent held-out one-step error can be useless for planning, because consecutive states are correlated and the error that matters accumulates. Multi-step rollout evaluation is the honest measure and is routinely skipped',
    },
    {
      point: 'Two learning problems instead of one',
      context:
        'A dynamics model and a controller, each with their own failure modes, interacting. When a run underperforms, isolating whether the model or the planner is at fault is genuinely harder than debugging a model-free method',
    },
    {
      point: 'Some systems are harder to model than to control',
      context:
        'Contact-rich manipulation and chaotic dynamics are the standard examples: the policy is learnable and the dynamics are not, so the model becomes the bottleneck and a model-free method wins outright',
    },
    {
      point: 'The value proposition disappears if a simulator exists',
      context:
        'A simulator is a model. Where one is already available, learning another buys nothing and costs the compounding-error failure mode — yet reaching for model-based methods anyway is a common and expensive mistake',
    },
  ],

  relatedSlugs: ['mdp-bellman', 'dynamic-programming', 'sac', 'ddpg-td3', 'kalman-filter', 'multi-armed-bandits'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Model-based RL with random-shooting MPC, transcribed.

Two pieces. A dynamics model fitted by ordinary regression - the next state IS
the label, which is why every transition here carries a whole state vector of
information instead of a single scalar reward. And a planner that searches over
action sequences by rolling them out through that model.

Watch the last line of the control loop: only the FIRST action of the optimized
sequence is executed, and the rest is thrown away and recomputed. That looks
wasteful and is the entire mechanism - replanning from a real observation every
step means model error never gets a chance to accumulate.
"""

import random


def make_model(n_state, n_action):
    """Predicts the state DELTA: s' - s = A s + B a + c.

    Predicting the delta rather than the absolute next state matters more than
    it looks. Consecutive states are highly correlated, so a model predicting
    absolutes scores beautifully on held-out error while having learned almost
    nothing about how the system actually changes.
    """
    return {
        "a": [[0.0] * n_state for _ in range(n_state)],
        "b": [[0.0] * n_action for _ in range(n_state)],
        "c": [0.0] * n_state,
    }


def predict(model, state, action):
    next_state = []
    for row in range(len(model["c"])):
        delta = model["c"][row]
        for index, value in enumerate(state):
            delta += model["a"][row][index] * value
        for index, value in enumerate(action):
            delta += model["b"][row][index] * value
        next_state.append(state[row] + delta)
    return next_state


def fit_step(model, state, action, next_state, lr):
    """One SGD step on squared error over the delta.

    Ordinary supervised learning: the label was handed over by the environment
    for free, alongside the reward that a model-free method would have kept
    instead. That asymmetry is the whole sample-efficiency argument.
    """
    for row in range(len(model["c"])):
        target = next_state[row] - state[row]

        prediction = model["c"][row]
        for index, value in enumerate(state):
            prediction += model["a"][row][index] * value
        for index, value in enumerate(action):
            prediction += model["b"][row][index] * value

        error = prediction - target
        for index, value in enumerate(state):
            model["a"][row][index] -= lr * error * value
        for index, value in enumerate(action):
            model["b"][row][index] -= lr * error * value
        model["c"][row] -= lr * error


def rollout_return(model, reward_fn, state, sequence, gamma):
    """Score one candidate action sequence by imagining it.

    Every term past the first has the model predicting from its OWN previous
    prediction. Errors therefore compound: a per-step error that looks
    negligible is multiplied down the rollout, which is why the horizon is the
    most important knob here and why it should be set from measured multi-step
    error rather than guessed.
    """
    imagined = list(state)
    total = 0.0
    discount = 1.0

    for action in sequence:
        imagined = predict(model, imagined, action)
        total += discount * reward_fn(imagined, action)
        discount *= gamma

    return total


def plan_random_shooting(model, reward_fn, state, n_action, horizon, candidates,
                         action_low, action_high, gamma):
    """The simplest planner there is: sample sequences, keep the best.

    No gradients and no structure, which is exactly why it works when the model
    is non-differentiable. It is also the baseline the cross-entropy method
    improves on, by refitting a distribution to the best candidates instead of
    resampling uniformly every iteration.
    """
    best_sequence = None
    best_score = -float("inf")

    for _ in range(candidates):
        sequence = [
            [random.uniform(action_low, action_high) for _ in range(n_action)]
            for _ in range(horizon)
        ]
        score = rollout_return(model, reward_fn, state, sequence, gamma)
        if score > best_score:
            best_sequence, best_score = sequence, score

    return best_sequence


def run(env, reward_fn, n_state, n_action, steps=10_000, horizon=15,
        candidates=200, lr=1e-3, gamma=0.99, action_low=-1.0, action_high=1.0,
        warmup=200):
    model = make_model(n_state, n_action)
    state = env.reset()

    for step in range(steps):
        if step < warmup:
            # Planning against a model that knows nothing is searching for the
            # maxima of noise, and the planner is very good at finding them.
            action = [random.uniform(action_low, action_high) for _ in range(n_action)]
        else:
            sequence = plan_random_shooting(
                model, reward_fn, state, n_action, horizon, candidates,
                action_low, action_high, gamma,
            )
            action = sequence[0]        # only the first. Receding horizon.

        next_state, reward, done = env.step(action)

        # Fit as we go. The planner immediately moves the system into states the
        # model has not seen, so a model fitted once is fitted to a policy that
        # no longer exists.
        fit_step(model, state, action, next_state, lr)

        state = env.reset() if done else next_state

    return model`,
        profile: 'Candidates x horizon model evaluations per decision, each a scalar loop over the state dimension. Nothing is reused between decisions.',
      },
      'make-it-right': {
        code: `"""Model-based RL - probabilistic ensemble, CEM planner, uncertainty penalty."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import torch
from torch import Tensor, nn

LOG_VAR_BOUNDS = (-10.0, 0.5)


@dataclass(frozen=True)
class PlannerConfig:
    n_state: int
    n_action: int
    action_low: float = -1.0
    action_high: float = 1.0
    # The decisive knob. Set it from MEASURED multi-step rollout error, not from
    # intuition: compounding is what makes a horizon that worked at ten steps
    # useless at thirty.
    horizon: int = 15
    candidates: int = 500
    elite_fraction: float = 0.1
    iterations: int = 5
    gamma: float = 0.99
    # How much predicted return is discounted where the ensemble disagrees.
    # This is the explicit defence against the planner exploiting model error.
    uncertainty_penalty: float = 1.0

    def __post_init__(self) -> None:
        if self.horizon < 1:
            raise ValueError("horizon must be at least one step")
        if not 0.0 < self.elite_fraction <= 1.0:
            raise ValueError(f"elite fraction must be in (0, 1], got {self.elite_fraction}")
        if self.action_low >= self.action_high:
            raise ValueError("action bounds must be ordered")

    @property
    def elite_count(self) -> int:
        return max(2, int(self.candidates * self.elite_fraction))


class ProbabilisticDynamics(nn.Module):
    """Predicts a DISTRIBUTION over the state delta, not a point.

    The variance head is not decoration. It separates the two kinds of
    uncertainty a planner has to treat differently:

      - the predicted variance is ALEATORIC - noise in the environment, which
        more data will not reduce and which should NOT make a planner cautious
      - disagreement ACROSS ensemble members is EPISTEMIC - ignorance about the
        dynamics, which more data does reduce and which absolutely should

    Conflating them yields a planner that is timid in a noisy but well-mapped
    region and confident in a region it has never visited.
    """

    def __init__(self, config: PlannerConfig, hidden: int = 200) -> None:
        super().__init__()
        width = config.n_state + config.n_action
        self.trunk = nn.Sequential(
            nn.Linear(width, hidden), nn.SiLU(),
            nn.Linear(hidden, hidden), nn.SiLU(),
        )
        self.mean_head = nn.Linear(hidden, config.n_state)
        self.log_var_head = nn.Linear(hidden, config.n_state)

    def forward(self, states: Tensor, actions: Tensor) -> tuple[Tensor, Tensor]:
        features = self.trunk(torch.cat([states, actions], dim=-1))
        # Bounded: an unconstrained log-variance runs away to explain a hard
        # sample as pure noise, and the Gaussian likelihood rewards it for that.
        log_var = self.log_var_head(features).clamp(*LOG_VAR_BOUNDS)
        return self.mean_head(features), log_var


def gaussian_nll(mean: Tensor, log_var: Tensor, target_delta: Tensor) -> Tensor:
    """Negative log-likelihood of the observed delta.

    The target is the DELTA, never the absolute next state: consecutive states
    are correlated enough that predicting levels gives excellent held-out error
    and almost no information about how the system changes.
    """
    inverse_var = torch.exp(-log_var)
    return (((mean - target_delta) ** 2) * inverse_var + log_var).mean()


class DynamicsEnsemble(nn.Module):
    """Independently initialized members, trained on bootstrapped batches.

    Independence is the point: correlated members agree everywhere, including
    where they are all wrong, and the disagreement signal disappears exactly
    when it is needed.
    """

    def __init__(self, config: PlannerConfig, size: int = 5) -> None:
        super().__init__()
        self.members = nn.ModuleList([ProbabilisticDynamics(config) for _ in range(size)])

    def predict(self, states: Tensor, actions: Tensor) -> tuple[Tensor, Tensor]:
        means = torch.stack([member(states, actions)[0] for member in self.members])
        # Mean prediction, and the epistemic term as spread ACROSS members.
        return means.mean(dim=0), means.std(dim=0).sum(dim=-1)


def cross_entropy_plan(
    ensemble: DynamicsEnsemble,
    reward_fn: Callable[[Tensor, Tensor], Tensor],
    state: Tensor,
    config: PlannerConfig,
    warm_start: Tensor | None = None,
) -> Tensor:
    """Refit a distribution over action SEQUENCES to its own elites.

    Random shooting resamples uniformly every time and learns nothing from what
    it already tried. CEM keeps a Gaussian over sequences and refits it to the
    best candidates each iteration, which concentrates the search where the
    returns are and converges far faster for the same evaluation budget.
    """
    mean = (
        warm_start
        if warm_start is not None
        else torch.zeros(config.horizon, config.n_action)
    )
    std = torch.full_like(mean, (config.action_high - config.action_low) / 2.0)

    for _ in range(config.iterations):
        noise = torch.randn(config.candidates, config.horizon, config.n_action)
        sequences = (mean + std * noise).clamp(config.action_low, config.action_high)

        returns = evaluate_sequences(ensemble, reward_fn, state, sequences, config)
        elites = sequences[returns.topk(config.elite_count).indices]

        mean = elites.mean(dim=0)
        std = elites.std(dim=0) + 1e-6

    return mean


@torch.no_grad()
def evaluate_sequences(
    ensemble: DynamicsEnsemble,
    reward_fn: Callable[[Tensor, Tensor], Tensor],
    state: Tensor,
    sequences: Tensor,
    config: PlannerConfig,
) -> Tensor:
    """Roll every candidate forward through the model and score it.

    Each step predicts from the model's OWN previous prediction, so error
    compounds down the horizon - which is why the epistemic penalty accumulates
    alongside the reward rather than being applied once at the end.
    """
    imagined = state.expand(sequences.shape[0], -1).clone()
    total = torch.zeros(sequences.shape[0])
    discount = 1.0

    for step in range(config.horizon):
        actions = sequences[:, step, :]
        delta, disagreement = ensemble.predict(imagined, actions)
        imagined = imagined + delta

        reward = reward_fn(imagined, actions)
        # Penalize where the ensemble disagrees, not where it predicts noise:
        # only ignorance is reducible, and only ignorance should deter a planner.
        total += discount * (reward - config.uncertainty_penalty * disagreement)
        discount *= config.gamma

    return total


def control_loop(env, ensemble, reward_fn, config: PlannerConfig, steps: int) -> None:
    state = torch.as_tensor(env.reset(), dtype=torch.float32)
    previous_plan: Tensor | None = None

    for _ in range(steps):
        plan = cross_entropy_plan(ensemble, reward_fn, state, config, previous_plan)

        # Receding horizon: execute the first action only, then replan from a
        # real observation. The plan is a sequence and all but one step of it is
        # discarded, which is what stops model error from accumulating.
        next_state, _, done = env.step(plan[0].tolist())

        # Warm start: shift the surviving plan forward one step. The world moved
        # by one step and the old plan is still nearly right for the rest.
        previous_plan = torch.cat([plan[1:], plan[-1:].clone()])

        state = torch.as_tensor(env.reset() if done else next_state, dtype=torch.float32)
        if done:
            previous_plan = None`,
        rationale:
          'Random shooting becomes the cross-entropy method, which refits a distribution over sequences to its own elites and converges far faster for the same evaluation budget. The point-prediction model becomes a probabilistic ensemble, which separates the two uncertainties a planner must treat differently: predicted variance is environment noise and should not deter it, while disagreement across independently initialized members is ignorance and should. That disagreement becomes an explicit penalty accumulated down the rollout, the target becomes the state delta, and the plan is warm-started by shifting the previous solution forward one step.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        libraryName: 'PyTorch',
        profile: 'Iterations x candidates x horizon x ensemble model evaluations per decision, batched across candidates.',
      },
      'make-it-fast': {
        code: `"""MPC - the whole planner as one batched tensor program.

Planning cost is candidates x horizon x ensemble per decision, inside a control
cycle. It is also embarrassingly parallel in candidates AND in ensemble
members, which makes this one of the few places in this category where the
work maps onto batched hardware essentially perfectly.

The horizon is the one axis that genuinely cannot be parallelized: step k+1
depends on step k. Everything else collapses.
"""

from __future__ import annotations

from typing import Callable

import torch
from torch import Tensor


class BatchedEnsemble(torch.nn.Module):
    """All ensemble members as one weight tensor with a leading member axis.

    Separate modules mean E small GEMMs per layer, each too small to saturate
    anything, plus E kernel launches. A leading member dimension turns every
    layer into one baddbmm over (E, batch, width) - identical arithmetic, one
    launch - and the members stay independent, which is what the disagreement
    signal requires.
    """

    def __init__(self, size: int, n_input: int, n_state: int, hidden: int = 200) -> None:
        super().__init__()
        self.w1 = torch.nn.Parameter(torch.empty(size, n_input, hidden))
        self.b1 = torch.nn.Parameter(torch.zeros(size, 1, hidden))
        self.w2 = torch.nn.Parameter(torch.empty(size, hidden, n_state))
        self.b2 = torch.nn.Parameter(torch.zeros(size, 1, n_state))
        for tensor in (self.w1, self.w2):
            torch.nn.init.orthogonal_(tensor, gain=1.0)

    def forward(self, joint: Tensor) -> Tensor:
        """joint is (E, batch, n_input); returns (E, batch, n_state) deltas."""
        hidden = torch.baddbmm(self.b1, joint, self.w1)
        hidden = torch.nn.functional.silu(hidden)
        return torch.baddbmm(self.b2, hidden, self.w2)


class PlanBuffers:
    """Every tensor the planner needs, allocated once at construction.

    A planning loop that allocates runs inside a control cycle and does so
    thousands of times per second. Sizing the buffers once turns the planner
    into a fixed-cost operation, which is what a real-time deadline requires.
    """

    def __init__(self, ensemble_size: int, candidates: int, horizon: int,
                 n_state: int, n_action: int, device: torch.device) -> None:
        # Single dtype throughout, contiguous, reused every iteration.
        self.imagined = torch.zeros((ensemble_size, candidates, n_state),
                                    dtype=torch.float32, device=device)
        self.joint = torch.zeros((ensemble_size, candidates, n_state + n_action),
                                 dtype=torch.float32, device=device)
        self.returns = torch.zeros(candidates, dtype=torch.float32, device=device)
        self.noise = torch.zeros((candidates, horizon, n_action),
                                 dtype=torch.float32, device=device)
        self.n_state = n_state


@torch.no_grad()
def evaluate_batched(
    ensemble: BatchedEnsemble,
    reward_fn: Callable[[Tensor, Tensor], Tensor],
    state: Tensor,
    sequences: Tensor,
    buffers: PlanBuffers,
    gamma: float,
    penalty: float,
) -> Tensor:
    """Every candidate and every ensemble member, advanced together.

    One model call per HORIZON STEP covers the entire search - the naive form
    makes candidates x ensemble separate calls per step. The horizon loop is
    all that remains, and it has to: step k+1 predicts from step k's output.
    """
    ensemble_size, candidates, n_state = buffers.imagined.shape

    buffers.imagined.copy_(state.view(1, 1, n_state).expand(ensemble_size, candidates, n_state))
    buffers.returns.zero_()
    discount = 1.0

    for step in range(sequences.shape[1]):
        actions = sequences[:, step, :].unsqueeze(0).expand(ensemble_size, -1, -1)

        # Written into the pre-allocated joint buffer rather than concatenated
        # into a fresh tensor on every one of thousands of steps.
        buffers.joint[..., :n_state].copy_(buffers.imagined)
        buffers.joint[..., n_state:].copy_(actions)

        deltas = ensemble(buffers.joint)          # (E, candidates, n_state)
        buffers.imagined.add_(deltas)             # in place; deltas, not levels

        # Epistemic term: spread ACROSS members, computed on the same tensor
        # that was just produced rather than from a second pass.
        disagreement = buffers.imagined.std(dim=0).sum(dim=-1)
        mean_state = buffers.imagined.mean(dim=0)

        reward = reward_fn(mean_state, sequences[:, step, :])
        buffers.returns.add_(discount * (reward - penalty * disagreement))
        discount *= gamma

    return buffers.returns


@torch.no_grad()
def cem_plan(
    ensemble: BatchedEnsemble,
    reward_fn: Callable[[Tensor, Tensor], Tensor],
    state: Tensor,
    buffers: PlanBuffers,
    previous_plan: Tensor | None,
    horizon: int,
    n_action: int,
    iterations: int,
    elite_count: int,
    bounds: tuple[float, float],
    gamma: float,
    penalty: float,
) -> Tensor:
    """CEM, warm-started from the surviving tail of the last plan.

    Warm-starting is the cheapest real speedup in MPC and it is not an
    approximation: the world advanced one step, so last cycle's plan shifted
    forward by one is already close to optimal, and the search starts from
    there instead of from scratch. It typically removes an entire CEM iteration.
    """
    if previous_plan is None:
        mean = torch.zeros(horizon, n_action, device=state.device)
    else:
        mean = torch.cat([previous_plan[1:], previous_plan[-1:]])

    std = torch.full_like(mean, (bounds[1] - bounds[0]) / 2.0)

    for _ in range(iterations):
        # normal_ fills the pre-allocated noise buffer in place: no allocation
        # anywhere in the planning loop.
        buffers.noise.normal_()
        sequences = torch.addcmul(mean, buffers.noise, std).clamp_(*bounds)

        returns = evaluate_batched(
            ensemble, reward_fn, state, sequences, buffers, gamma, penalty
        )
        elites = sequences[returns.topk(elite_count).indices]

        mean = elites.mean(dim=0)
        std = elites.std(dim=0).clamp_min_(1e-6)

    return mean`,
        rationale:
          'Planning is candidates × horizon × ensemble per decision, inside a control cycle — and it is parallel in candidates and in members, so both axes collapse into batched tensor operations and one model call per horizon step covers the entire search. The horizon loop is the one axis that genuinely cannot go, because step k+1 predicts from step k. Every tensor is allocated once, since a planner that allocates does so thousands of times per second against a deadline. And the search warm-starts from the previous plan shifted forward, which is not an approximation — the world advanced one step and last cycle\'s solution is already close.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'All candidates and all ensemble members advance in one model call per horizon step, replacing candidates × ensemble separate calls and collapsing the two parallel axes of the search.',
            tradeoff: 'Peak memory is now candidates × ensemble × state width, so a long horizon with a large search must trade candidate count against the memory the batch occupies.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The imagined states, joint inputs, noise and returns are sized once and written in place, so a planning loop running against a real-time deadline performs no allocation at all.',
            tradeoff: 'Candidate count, horizon and ensemble size are fixed at construction, so adapting the search budget to remaining cycle time means rebuilding the buffers.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'A leading member dimension makes each layer one batched matmul instead of E small GEMMs that individually cannot saturate the hardware.',
            tradeoff: 'The ensemble shares one module and one optimizer, so bootstrapping members on different data subsets — which is what keeps their errors independent — has to be arranged by masking rather than by separate training.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The epistemic spread and the mean state are reductions over the same just-written tensor, and addcmul builds the candidate sequences without materializing the scaled noise separately.',
            tradeoff: 'The per-member predictions are overwritten in place, so a diagnostic wanting individual member trajectories has to re-run the rollout rather than read them back.',
          },
        ],
        libraryName: 'PyTorch',
        profile: 'One model call per horizon step for the whole search; nothing allocated inside the planning loop. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Model-based RL with random-shooting MPC, transcribed.
//
// Two pieces. A dynamics model fitted by ordinary regression - the next state
// IS the label, which is why every transition here carries a whole state vector
// of information instead of a single scalar reward. And a planner that searches
// over action sequences by rolling them out through that model.
//
// Watch the last line of the control loop: only the FIRST action of the
// optimized sequence is executed, and the rest is thrown away and recomputed.
// That looks wasteful and is the entire mechanism - replanning from a real
// observation every step means model error never accumulates.
#include <cstddef>
#include <limits>
#include <random>
#include <vector>

// Predicts the state DELTA: s' - s = A s + B a + c.
//
// Predicting the delta rather than the absolute next state matters more than it
// looks. Consecutive states are highly correlated, so a model predicting
// absolutes scores beautifully on held-out error while having learned almost
// nothing about how the system actually changes.
struct LinearDynamics {
  std::vector<std::vector<double>> a;   // [state][state]
  std::vector<std::vector<double>> b;   // [state][action]
  std::vector<double> c;                // [state]
};

LinearDynamics MakeModel(std::size_t n_state, std::size_t n_action) {
  return {std::vector<std::vector<double>>(n_state, std::vector<double>(n_state, 0.0)),
          std::vector<std::vector<double>>(n_state, std::vector<double>(n_action, 0.0)),
          std::vector<double>(n_state, 0.0)};
}

std::vector<double> Predict(const LinearDynamics& model, const std::vector<double>& state,
                            const std::vector<double>& action) {
  std::vector<double> next_state(state.size(), 0.0);
  for (std::size_t row = 0; row < model.c.size(); ++row) {
    double delta = model.c[row];
    for (std::size_t i = 0; i < state.size(); ++i) delta += model.a[row][i] * state[i];
    for (std::size_t j = 0; j < action.size(); ++j) delta += model.b[row][j] * action[j];
    next_state[row] = state[row] + delta;
  }
  return next_state;
}

// One SGD step on squared error over the delta.
//
// Ordinary supervised learning: the label was handed over by the environment
// for free, alongside the reward a model-free method would have kept instead.
// That asymmetry is the whole sample-efficiency argument.
void FitStep(LinearDynamics& model, const std::vector<double>& state,
             const std::vector<double>& action, const std::vector<double>& next_state,
             double lr) {
  for (std::size_t row = 0; row < model.c.size(); ++row) {
    const double target = next_state[row] - state[row];

    double prediction = model.c[row];
    for (std::size_t i = 0; i < state.size(); ++i) prediction += model.a[row][i] * state[i];
    for (std::size_t j = 0; j < action.size(); ++j) prediction += model.b[row][j] * action[j];

    const double error = prediction - target;
    for (std::size_t i = 0; i < state.size(); ++i) model.a[row][i] -= lr * error * state[i];
    for (std::size_t j = 0; j < action.size(); ++j) model.b[row][j] -= lr * error * action[j];
    model.c[row] -= lr * error;
  }
}

// Score one candidate action sequence by imagining it.
//
// Every term past the first has the model predicting from its OWN previous
// prediction. Errors therefore compound: a per-step error that looks negligible
// is multiplied down the rollout, which is why the horizon is the most
// important knob here and why it should be set from measured multi-step error
// rather than guessed.
template <typename RewardFn>
double RolloutReturn(const LinearDynamics& model, RewardFn reward_fn,
                     const std::vector<double>& state,
                     const std::vector<std::vector<double>>& sequence, double gamma) {
  std::vector<double> imagined = state;
  double total = 0.0;
  double discount = 1.0;

  for (const std::vector<double>& action : sequence) {
    imagined = Predict(model, imagined, action);
    total += discount * reward_fn(imagined, action);
    discount *= gamma;
  }
  return total;
}

// The simplest planner there is: sample sequences, keep the best.
//
// No gradients and no structure, which is exactly why it works when the model
// is non-differentiable. It is also the baseline the cross-entropy method
// improves on, by refitting a distribution to the best candidates instead of
// resampling uniformly every iteration.
template <typename RewardFn>
std::vector<std::vector<double>> PlanRandomShooting(
    const LinearDynamics& model, RewardFn reward_fn, const std::vector<double>& state,
    std::size_t n_action, std::size_t horizon, std::size_t candidates, double action_low,
    double action_high, double gamma, std::mt19937& rng) {
  std::uniform_real_distribution<double> uniform(action_low, action_high);

  std::vector<std::vector<double>> best_sequence;
  double best_score = -std::numeric_limits<double>::infinity();

  for (std::size_t candidate = 0; candidate < candidates; ++candidate) {
    std::vector<std::vector<double>> sequence(horizon, std::vector<double>(n_action, 0.0));
    for (auto& action : sequence) {
      for (double& value : action) value = uniform(rng);
    }

    const double score = RolloutReturn(model, reward_fn, state, sequence, gamma);
    if (score > best_score) {
      best_sequence = sequence;
      best_score = score;
    }
  }
  return best_sequence;
}

template <typename Env, typename RewardFn>
LinearDynamics Run(Env& env, RewardFn reward_fn, std::size_t n_state, std::size_t n_action,
                   int steps, std::size_t horizon, std::size_t candidates, double lr,
                   double gamma, double action_low, double action_high, std::size_t warmup) {
  LinearDynamics model = MakeModel(n_state, n_action);
  std::mt19937 rng(0);
  std::uniform_real_distribution<double> uniform(action_low, action_high);

  std::vector<double> state = env.reset();

  for (int step = 0; step < steps; ++step) {
    std::vector<double> action(n_action, 0.0);
    if (static_cast<std::size_t>(step) < warmup) {
      // Planning against a model that knows nothing is searching for the maxima
      // of noise, and the planner is very good at finding them.
      for (double& value : action) value = uniform(rng);
    } else {
      const auto sequence = PlanRandomShooting(model, reward_fn, state, n_action, horizon,
                                               candidates, action_low, action_high, gamma, rng);
      action = sequence.front();      // only the first. Receding horizon.
    }

    const auto result = env.step(action);

    // Fit as we go. The planner immediately moves the system into states the
    // model has not seen, so a model fitted once is fitted to a policy that no
    // longer exists.
    FitStep(model, state, action, result.next_state, lr);

    state = result.done ? env.reset() : result.next_state;
  }

  return model;
}`,
        profile: 'Candidates x horizon model evaluations per decision, each a scalar loop over the state dimension. Every candidate sequence allocates.',
      },
      'make-it-right': {
        code: `// Model-based RL - probabilistic ensemble, CEM planner, uncertainty penalty.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <vector>

#include <Eigen/Dense>

// Newtypes so a planning horizon and an ensemble size cannot be transposed -
// both are small counts, and swapping them produces a run that plans badly
// rather than one that fails.
struct Horizon {
  std::size_t steps;
};

struct EnsembleSize {
  std::size_t members;
};

struct PlannerConfig {
  Horizon horizon{15};
  EnsembleSize ensemble{5};
  std::size_t candidates = 500;
  std::size_t iterations = 5;
  double elite_fraction = 0.1;
  double gamma = 0.99;
  double action_low = -1.0;
  double action_high = 1.0;
  // How much predicted return is discounted where the ensemble disagrees. This
  // is the explicit defence against the planner exploiting model error.
  double uncertainty_penalty = 1.0;
};

void ValidateConfig(const PlannerConfig& config) {
  if (config.horizon.steps == 0) throw std::invalid_argument("horizon must be at least one step");
  if (config.ensemble.members < 2) {
    throw std::invalid_argument("a one-member ensemble has no disagreement to measure");
  }
  if (config.elite_fraction <= 0.0 || config.elite_fraction > 1.0) {
    throw std::invalid_argument("elite fraction must be in (0, 1]");
  }
  if (config.action_low >= config.action_high) {
    throw std::invalid_argument("action bounds must be ordered");
  }
}

// A prediction carrying BOTH kinds of uncertainty, kept separate on purpose.
//
//   variance     is ALEATORIC - noise in the environment, which more data will
//                not reduce and which should NOT make a planner cautious
//   disagreement is EPISTEMIC - ignorance about the dynamics, which more data
//                does reduce and which absolutely should
//
// Conflating them yields a planner that is timid in a noisy but well-mapped
// region and confident in a region it has never visited.
struct DynamicsPrediction {
  Eigen::VectorXd mean_delta;
  Eigen::VectorXd variance;
  double disagreement;
};

// Independently initialized members, trained on bootstrapped batches.
//
// Independence is the point: correlated members agree everywhere, including
// where they are all wrong, and the disagreement signal vanishes exactly when
// it was needed.
class DynamicsEnsemble {
 public:
  DynamicsEnsemble(EnsembleSize size, std::size_t n_state, std::size_t n_action)
      : n_state_(n_state), n_action_(n_action) {
    members_.reserve(size.members);
    for (std::size_t member = 0; member < size.members; ++member) {
      members_.emplace_back(n_state, n_action, static_cast<unsigned>(member));
    }
  }

  [[nodiscard]] DynamicsPrediction Predict(const Eigen::VectorXd& state,
                                           const Eigen::VectorXd& action) const {
    Eigen::MatrixXd member_means(static_cast<Eigen::Index>(members_.size()),
                                 static_cast<Eigen::Index>(n_state_));
    Eigen::VectorXd mean_variance = Eigen::VectorXd::Zero(static_cast<Eigen::Index>(n_state_));

    for (std::size_t member = 0; member < members_.size(); ++member) {
      const auto [delta, variance] = members_[member].Forward(state, action);
      member_means.row(static_cast<Eigen::Index>(member)) = delta.transpose();
      mean_variance += variance;
    }
    mean_variance /= static_cast<double>(members_.size());

    const Eigen::VectorXd mean_delta = member_means.colwise().mean();
    // Spread ACROSS members: the epistemic term, and the only one the planner
    // should be penalized by.
    const double disagreement =
        (member_means.rowwise() - mean_delta.transpose()).array().square().sum();

    return {mean_delta, mean_variance, std::sqrt(disagreement)};
  }

 private:
  // A single probabilistic member. Predicts a delta and a bounded log-variance.
  class Member {
   public:
    Member(std::size_t n_state, std::size_t n_action, unsigned seed);
    [[nodiscard]] std::pair<Eigen::VectorXd, Eigen::VectorXd> Forward(
        const Eigen::VectorXd& state, const Eigen::VectorXd& action) const;
  };

  std::size_t n_state_;
  std::size_t n_action_;
  std::vector<Member> members_;
};

// Refit a distribution over action SEQUENCES to its own elites.
//
// Random shooting resamples uniformly every time and learns nothing from what
// it already tried. CEM keeps a Gaussian over sequences and refits it to the
// best candidates each iteration, which concentrates the search where the
// returns are and converges far faster for the same evaluation budget.
class CrossEntropyPlanner {
 public:
  CrossEntropyPlanner(PlannerConfig config, std::size_t n_action)
      : config_(config),
        n_action_(n_action),
        mean_(static_cast<Eigen::Index>(config.horizon.steps),
              static_cast<Eigen::Index>(n_action)),
        std_(static_cast<Eigen::Index>(config.horizon.steps),
             static_cast<Eigen::Index>(n_action)) {
    ValidateConfig(config);
    Reset();
  }

  void Reset() {
    mean_.setZero();
    std_.setConstant((config_.action_high - config_.action_low) / 2.0);
  }

  // Warm start: shift the surviving plan forward one step. The world advanced
  // by one step and the old plan is still nearly right for the rest, so the
  // search starts near the answer rather than from scratch.
  void ShiftForward() {
    const Eigen::Index last = mean_.rows() - 1;
    mean_.topRows(last) = mean_.bottomRows(last);
    std_.setConstant((config_.action_high - config_.action_low) / 4.0);
  }

  [[nodiscard]] std::size_t EliteCount() const {
    return std::max<std::size_t>(
        2, static_cast<std::size_t>(static_cast<double>(config_.candidates) *
                                    config_.elite_fraction));
  }

 private:
  PlannerConfig config_;
  std::size_t n_action_;
  Eigen::MatrixXd mean_;
  Eigen::MatrixXd std_;
};`,
        rationale:
          'Random shooting becomes the cross-entropy method, which refits a distribution over sequences to its own elites and converges far faster for the same budget, warm-started by shifting the surviving plan forward. The point-prediction model becomes a probabilistic ensemble whose prediction type keeps the two uncertainties separate — predicted variance is environment noise and should not deter a planner, disagreement across independently initialized members is ignorance and should. Construction validates, and the horizon and ensemble size become distinct types because both are small counts that transpose silently.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        libraryName: 'Eigen',
        profile: 'Iterations x candidates x horizon x ensemble evaluations per decision; the planner owns and reuses its distribution.',
      },
      'make-it-fast': {
        code: `// MPC - candidates and ensemble members rolled forward together.
#include <algorithm>
#include <cstddef>
#include <vector>

#include <Eigen/Dense>
#include <omp.h>

// Planning cost is candidates x horizon x ensemble per decision, inside a
// control cycle. It is also embarrassingly parallel in candidates AND in
// ensemble members, which makes this one of the few places in this category
// where the work maps onto the hardware essentially perfectly.
//
// The horizon is the one axis that genuinely cannot be parallelized: step k+1
// predicts from step k. Everything else collapses into batched arithmetic.
class BatchedPlanner {
 public:
  BatchedPlanner(std::size_t candidates, std::size_t horizon, std::size_t ensemble,
                 std::size_t n_state, std::size_t n_action)
      : candidates_(candidates),
        horizon_(horizon),
        ensemble_(ensemble),
        n_state_(n_state),
        n_action_(n_action),
        // Every buffer allocated once at construction. A planning loop that
        // allocates runs inside a control cycle and does so thousands of times
        // per second; sizing once turns planning into a fixed-cost operation,
        // which is what a real-time deadline requires.
        imagined_(ensemble * candidates * n_state, 0.0F),
        joint_(ensemble * candidates * (n_state + n_action), 0.0F),
        deltas_(ensemble * candidates * n_state, 0.0F),
        returns_(candidates, 0.0F),
        sequences_(candidates * horizon * n_action, 0.0F) {}

  // Rows are (member, candidate) pairs and columns are features, laid out
  // row-major, so a whole rollout step is one contiguous block that a GEMM
  // consumes directly and the gather never strides.
  [[nodiscard]] Eigen::Map<Eigen::MatrixXf> JointMatrix() noexcept {
    return {joint_.data(), static_cast<Eigen::Index>(ensemble_ * candidates_),
            static_cast<Eigen::Index>(n_state_ + n_action_)};
  }

  // Assemble the model input for one horizon step: current imagined states
  // beside the candidate actions, written straight into the existing buffer
  // with no concatenation and no temporary.
  void FillJoint(std::size_t step) noexcept {
    const std::size_t joint_width = n_state_ + n_action_;

    // Rows are independent and write to disjoint slices, which is the whole
    // search's parallelism made explicit.
#pragma omp parallel for schedule(static)
    for (std::size_t row = 0; row < ensemble_ * candidates_; ++row) {
      const std::size_t candidate = row % candidates_;
      float* __restrict destination = joint_.data() + row * joint_width;
      const float* __restrict imagined = imagined_.data() + row * n_state_;
      const float* __restrict action =
          sequences_.data() + (candidate * horizon_ + step) * n_action_;

      std::copy_n(imagined, n_state_, destination);
      std::copy_n(action, n_action_, destination + n_state_);
    }
  }

  // Advance every imagined state by its predicted delta, and accumulate the
  // epistemic spread in the SAME pass.
  //
  // The mean and the across-member variance are both reductions over the block
  // that was just written, so fusing them means one traversal rather than three
  // and no intermediate mean buffer at all.
  void AdvanceAndScore(float discount, float penalty, const float* __restrict rewards) noexcept {
#pragma omp parallel for schedule(static)
    for (std::size_t candidate = 0; candidate < candidates_; ++candidate) {
      float spread = 0.0F;

      for (std::size_t dimension = 0; dimension < n_state_; ++dimension) {
        float sum = 0.0F;
        float sum_squares = 0.0F;

        for (std::size_t member = 0; member < ensemble_; ++member) {
          const std::size_t index =
              (member * candidates_ + candidate) * n_state_ + dimension;
          // In place: deltas, not levels, added onto the running state.
          imagined_[index] += deltas_[index];
          const float value = imagined_[index];
          sum += value;
          sum_squares += value * value;
        }

        const auto count = static_cast<float>(ensemble_);
        const float mean = sum / count;
        spread += std::max(0.0F, sum_squares / count - mean * mean);
      }

      returns_[candidate] +=
          discount * (rewards[candidate] - penalty * std::sqrt(spread));
    }
  }

 private:
  std::size_t candidates_;
  std::size_t horizon_;
  std::size_t ensemble_;
  std::size_t n_state_;
  std::size_t n_action_;
  std::vector<float> imagined_;
  std::vector<float> joint_;
  std::vector<float> deltas_;
  std::vector<float> returns_;
  std::vector<float> sequences_;
};

// One layer of the ensemble over the entire search, as a single GEMM.
//
// Per-candidate or per-member calls make thousands of tiny products, each too
// small to saturate anything. Stacking every (member, candidate) pair into the
// rows of one matrix makes each layer one product for the whole rollout step.
void EnsembleLayer(const Eigen::Map<Eigen::MatrixXf>& joint, const Eigen::MatrixXf& weights,
                   const Eigen::VectorXf& bias, Eigen::MatrixXf& out) {
  out.noalias() = joint * weights;
  out.rowwise() += bias.transpose();
  out = out.cwiseMax(0.0F);
}`,
        rationale:
          'Planning is candidates × horizon × ensemble per decision inside a control cycle, and it is parallel in candidates and in members — so both axes collapse into rows of one matrix and each layer becomes a single GEMM over the whole rollout step. The horizon loop is the one axis that cannot go, because step k+1 predicts from step k. Every buffer is allocated once, since a planner that allocates does so thousands of times per second against a deadline, and the state advance and the epistemic spread fuse into one traversal of the block just written.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Every (member, candidate) pair is one contiguous row, so a rollout step is a single dense block that the gather fills without striding and the GEMM consumes directly.',
            tradeoff: 'Candidate count, horizon and ensemble size are baked into the layout, so adapting the search budget to remaining cycle time means reallocating rather than passing a smaller argument.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Candidates and ensemble members are fully independent within a horizon step, writing to disjoint slices — this is the search\'s parallelism, and it is the dominant cost of the decision.',
            tradeoff: 'The reduction across members is done inside each candidate\'s iteration, so the parallel split is over candidates only and a search with few candidates leaves cores idle.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The state advance, the mean and the across-member variance are produced in one traversal of the block just written, instead of three passes with an intermediate mean buffer.',
            tradeoff: 'The variance is accumulated as a sum of squares, which loses precision against a two-pass formulation when the state values are large relative to their spread.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Each ensemble layer is one product over every member-candidate row, rather than thousands of tiny per-candidate products that individually cannot saturate the hardware.',
            tradeoff: 'All members must share an architecture and be resident as one weight matrix, so a heterogeneous ensemble — a real diversity mechanism — is no longer expressible.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'One GEMM per layer per horizon step for the whole search; nothing allocated inside the planning loop. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Model-based RL with random-shooting MPC, transcribed.
//!
//! Two pieces. A dynamics model fitted by ordinary regression - the next state
//! IS the label, which is why every transition here carries a whole state
//! vector of information instead of a single scalar reward. And a planner that
//! searches over action sequences by rolling them out through that model.
//!
//! Watch the last line of the control loop: only the FIRST action of the
//! optimized sequence is executed, and the rest is thrown away and recomputed.
//! That looks wasteful and is the entire mechanism - replanning from a real
//! observation every step means model error never accumulates.

pub struct StepResult {
    pub next_state: Vec<f64>,
    pub reward: f64,
    pub done: bool,
}

pub trait Environment {
    fn reset(&mut self) -> Vec<f64>;
    fn step(&mut self, action: &[f64]) -> StepResult;
}

/// Predicts the state DELTA: s' - s = A s + B a + c.
///
/// Predicting the delta rather than the absolute next state matters more than
/// it looks. Consecutive states are highly correlated, so a model predicting
/// absolutes scores beautifully on held-out error while having learned almost
/// nothing about how the system actually changes.
pub struct LinearDynamics {
    pub a: Vec<Vec<f64>>, // [state][state]
    pub b: Vec<Vec<f64>>, // [state][action]
    pub c: Vec<f64>,      // [state]
}

pub fn make_model(n_state: usize, n_action: usize) -> LinearDynamics {
    LinearDynamics {
        a: vec![vec![0.0; n_state]; n_state],
        b: vec![vec![0.0; n_action]; n_state],
        c: vec![0.0; n_state],
    }
}

pub fn predict(model: &LinearDynamics, state: &[f64], action: &[f64]) -> Vec<f64> {
    let mut next_state = vec![0.0; state.len()];
    for row in 0..model.c.len() {
        let mut delta = model.c[row];
        for i in 0..state.len() {
            delta += model.a[row][i] * state[i];
        }
        for j in 0..action.len() {
            delta += model.b[row][j] * action[j];
        }
        next_state[row] = state[row] + delta;
    }
    next_state
}

/// One SGD step on squared error over the delta.
///
/// Ordinary supervised learning: the label was handed over by the environment
/// for free, alongside the reward a model-free method would have kept instead.
/// That asymmetry is the whole sample-efficiency argument.
pub fn fit_step(
    model: &mut LinearDynamics,
    state: &[f64],
    action: &[f64],
    next_state: &[f64],
    lr: f64,
) {
    for row in 0..model.c.len() {
        let target = next_state[row] - state[row];

        let mut prediction = model.c[row];
        for i in 0..state.len() {
            prediction += model.a[row][i] * state[i];
        }
        for j in 0..action.len() {
            prediction += model.b[row][j] * action[j];
        }

        let error = prediction - target;
        for i in 0..state.len() {
            model.a[row][i] -= lr * error * state[i];
        }
        for j in 0..action.len() {
            model.b[row][j] -= lr * error * action[j];
        }
        model.c[row] -= lr * error;
    }
}

/// Score one candidate action sequence by imagining it.
///
/// Every term past the first has the model predicting from its OWN previous
/// prediction. Errors therefore compound: a per-step error that looks
/// negligible is multiplied down the rollout, which is why the horizon is the
/// most important knob here and why it should be set from measured multi-step
/// error rather than guessed.
pub fn rollout_return<R>(
    model: &LinearDynamics,
    reward_fn: &R,
    state: &[f64],
    sequence: &[Vec<f64>],
    gamma: f64,
) -> f64
where
    R: Fn(&[f64], &[f64]) -> f64,
{
    let mut imagined = state.to_vec();
    let mut total = 0.0;
    let mut discount = 1.0;

    for action in sequence {
        imagined = predict(model, &imagined, action);
        total += discount * reward_fn(&imagined, action);
        discount *= gamma;
    }
    total
}

/// The simplest planner there is: sample sequences, keep the best.
///
/// No gradients and no structure, which is exactly why it works when the model
/// is non-differentiable. It is also the baseline the cross-entropy method
/// improves on, by refitting a distribution to the best candidates instead of
/// resampling uniformly every iteration.
#[allow(clippy::too_many_arguments)]
pub fn plan_random_shooting<R>(
    model: &LinearDynamics,
    reward_fn: &R,
    state: &[f64],
    n_action: usize,
    horizon: usize,
    candidates: usize,
    action_low: f64,
    action_high: f64,
    gamma: f64,
    rand: &mut dyn FnMut() -> f64,
) -> Vec<Vec<f64>>
where
    R: Fn(&[f64], &[f64]) -> f64,
{
    let mut best_sequence = Vec::new();
    let mut best_score = f64::NEG_INFINITY;

    for _ in 0..candidates {
        let sequence: Vec<Vec<f64>> = (0..horizon)
            .map(|_| {
                (0..n_action)
                    .map(|_| action_low + rand() * (action_high - action_low))
                    .collect()
            })
            .collect();

        let score = rollout_return(model, reward_fn, state, &sequence, gamma);
        if score > best_score {
            best_sequence = sequence;
            best_score = score;
        }
    }
    best_sequence
}

#[allow(clippy::too_many_arguments)]
pub fn run<R>(
    env: &mut dyn Environment,
    reward_fn: &R,
    n_state: usize,
    n_action: usize,
    steps: usize,
    horizon: usize,
    candidates: usize,
    lr: f64,
    gamma: f64,
    action_low: f64,
    action_high: f64,
    warmup: usize,
    rand: &mut dyn FnMut() -> f64,
) -> LinearDynamics
where
    R: Fn(&[f64], &[f64]) -> f64,
{
    let mut model = make_model(n_state, n_action);
    let mut state = env.reset();

    for step in 0..steps {
        let action = if step < warmup {
            // Planning against a model that knows nothing is searching for the
            // maxima of noise, and the planner is very good at finding them.
            (0..n_action)
                .map(|_| action_low + rand() * (action_high - action_low))
                .collect()
        } else {
            let sequence = plan_random_shooting(
                &model, reward_fn, &state, n_action, horizon, candidates, action_low,
                action_high, gamma, rand,
            );
            sequence[0].clone() // only the first. Receding horizon.
        };

        let result = env.step(&action);

        // Fit as we go. The planner immediately moves the system into states
        // the model has not seen, so a model fitted once is fitted to a policy
        // that no longer exists.
        fit_step(&mut model, &state, &action, &result.next_state, lr);

        state = if result.done { env.reset() } else { result.next_state };
    }

    model
}`,
        profile: 'Candidates x horizon model evaluations per decision. Every candidate sequence allocates a Vec of Vecs, and every index is bounds-checked.',
      },
      'make-it-right': {
        code: `//! Model-based RL - probabilistic ensemble, CEM planner, uncertainty penalty.

use std::fmt;

/// Newtypes so a planning horizon and an ensemble size cannot be transposed.
/// Both are small counts, and swapping them produces a run that plans badly
/// rather than one that fails.
#[derive(Debug, Clone, Copy)]
pub struct Horizon(pub usize);

#[derive(Debug, Clone, Copy)]
pub struct EnsembleSize(pub usize);

#[derive(Debug, Clone, Copy)]
pub struct UncertaintyPenalty(pub f64);

#[derive(Debug, PartialEq, Eq)]
pub enum PlannerError {
    ZeroHorizon,
    SingletonEnsemble,
    BadEliteFraction,
    UnorderedActionBounds,
    StateWidthMismatch { got: usize, expected: usize },
}

impl fmt::Display for PlannerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroHorizon => write!(f, "horizon must be at least one step"),
            Self::SingletonEnsemble => {
                write!(f, "a one-member ensemble has no disagreement to measure")
            }
            Self::BadEliteFraction => write!(f, "elite fraction must be in (0, 1]"),
            Self::UnorderedActionBounds => write!(f, "action bounds must be ordered"),
            Self::StateWidthMismatch { got, expected } => {
                write!(f, "state has width {got}, model expects {expected}")
            }
        }
    }
}

impl std::error::Error for PlannerError {}

/// A prediction carrying BOTH kinds of uncertainty, kept separate on purpose.
///
///   \`variance\`     is ALEATORIC - noise in the environment, which more data
///                  will not reduce and which should NOT make a planner cautious
///   \`disagreement\` is EPISTEMIC - ignorance about the dynamics, which more data
///                  does reduce and which absolutely should
///
/// Conflating them yields a planner that is timid in a noisy but well-mapped
/// region and confident in a region it has never visited.
pub struct DynamicsPrediction {
    pub mean_delta: Vec<f64>,
    pub variance: Vec<f64>,
    pub disagreement: f64,
}

pub struct PlannerConfig {
    pub horizon: Horizon,
    pub ensemble: EnsembleSize,
    pub candidates: usize,
    pub iterations: usize,
    pub elite_fraction: f64,
    pub gamma: f64,
    pub action_bounds: (f64, f64),
    pub penalty: UncertaintyPenalty,
}

impl PlannerConfig {
    pub fn validate(&self) -> Result<(), PlannerError> {
        if self.horizon.0 == 0 {
            return Err(PlannerError::ZeroHorizon);
        }
        if self.ensemble.0 < 2 {
            return Err(PlannerError::SingletonEnsemble);
        }
        if self.elite_fraction <= 0.0 || self.elite_fraction > 1.0 {
            return Err(PlannerError::BadEliteFraction);
        }
        if self.action_bounds.0 >= self.action_bounds.1 {
            return Err(PlannerError::UnorderedActionBounds);
        }
        Ok(())
    }

    #[must_use]
    pub fn elite_count(&self) -> usize {
        (((self.candidates as f64) * self.elite_fraction) as usize).max(2)
    }
}

/// Refit a distribution over action SEQUENCES to its own elites.
///
/// Random shooting resamples uniformly every time and learns nothing from what
/// it already tried. CEM keeps a Gaussian over sequences and refits it to the
/// best candidates each iteration, which concentrates the search where the
/// returns are and converges far faster for the same evaluation budget.
pub struct CrossEntropyPlanner {
    config: PlannerConfig,
    n_action: usize,
    /// Flat, horizon-major, owned and reused between decisions.
    mean: Vec<f64>,
    deviation: Vec<f64>,
}

impl CrossEntropyPlanner {
    pub fn new(config: PlannerConfig, n_action: usize) -> Result<Self, PlannerError> {
        config.validate()?;
        let cells = config.horizon.0 * n_action;
        let spread = (config.action_bounds.1 - config.action_bounds.0) / 2.0;
        Ok(Self {
            config,
            n_action,
            mean: vec![0.0; cells],
            deviation: vec![spread; cells],
        })
    }

    pub fn reset(&mut self) {
        self.mean.fill(0.0);
        let spread = (self.config.action_bounds.1 - self.config.action_bounds.0) / 2.0;
        self.deviation.fill(spread);
    }

    /// Warm start: shift the surviving plan forward one step.
    ///
    /// The world advanced by one step and the old plan is still nearly right
    /// for the rest, so the search starts near the answer rather than from
    /// scratch. Rotating in place avoids allocating a new plan every cycle.
    pub fn shift_forward(&mut self) {
        self.mean.rotate_left(self.n_action);
        let spread = (self.config.action_bounds.1 - self.config.action_bounds.0) / 4.0;
        self.deviation.fill(spread);
    }

    /// Refit the distribution to the elite sequences of this iteration.
    pub fn refit(&mut self, elites: &[f64], elite_count: usize) {
        let cells = self.mean.len();
        for cell in 0..cells {
            let mean: f64 = (0..elite_count).map(|e| elites[e * cells + cell]).sum::<f64>()
                / elite_count as f64;
            let variance: f64 = (0..elite_count)
                .map(|e| (elites[e * cells + cell] - mean).powi(2))
                .sum::<f64>()
                / elite_count as f64;

            self.mean[cell] = mean;
            // Floored: a collapsed deviation stops the search dead, and CEM
            // has no other mechanism for reopening it.
            self.deviation[cell] = variance.sqrt().max(1e-6);
        }
    }

    #[must_use]
    pub fn first_action(&self) -> &[f64] {
        // Receding horizon: only this slice is ever executed.
        &self.mean[..self.n_action]
    }
}`,
        rationale:
          'Random shooting becomes the cross-entropy method, which refits a distribution over sequences to its own elites and converges far faster for the same budget, warm-started by rotating the surviving plan forward in place rather than allocating a new one each cycle. The point-prediction model becomes a probabilistic ensemble whose prediction type keeps the two uncertainties separate — environment noise should not deter a planner, ignorance should. Construction validates, the distribution is flat and reused, and newtypes separate two small counts that transpose silently.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Iterations x candidates x horizon x ensemble evaluations per decision; the planner owns and reuses its distribution.',
      },
      'make-it-fast': {
        code: `//! MPC - candidates and ensemble members rolled forward together.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// Planning cost is candidates x horizon x ensemble per decision, inside a
/// control cycle. It is also embarrassingly parallel in candidates AND in
/// ensemble members, which makes this one of the few places in this category
/// where the work maps onto the hardware essentially perfectly.
///
/// The horizon is the one axis that genuinely cannot be parallelized: step k+1
/// predicts from step k. Everything else collapses into batched arithmetic.
pub struct BatchedPlanner {
    candidates: usize,
    horizon: usize,
    ensemble: usize,
    n_state: usize,
    n_action: usize,
    /// Rows are (member, candidate) pairs, columns are features. Every buffer
    /// is sized once at construction: a planning loop that allocates runs
    /// inside a control cycle and does so thousands of times per second, so
    /// sizing once turns planning into a fixed-cost operation.
    imagined: Array2<f32>,
    joint: Array2<f32>,
    returns: Vec<f32>,
    sequences: Vec<f32>,
}

impl BatchedPlanner {
    #[must_use]
    pub fn new(candidates: usize, horizon: usize, ensemble: usize, n_state: usize,
               n_action: usize) -> Self {
        let rows = ensemble * candidates;
        Self {
            candidates,
            horizon,
            ensemble,
            n_state,
            n_action,
            imagined: Array2::zeros((rows, n_state)),
            joint: Array2::zeros((rows, n_state + n_action)),
            returns: Vec::with_capacity(candidates),
            sequences: vec![0.0; candidates * horizon * n_action],
        }
    }

    /// Assemble the model input for one horizon step: current imagined states
    /// beside the candidate actions, written straight into the existing buffer
    /// with no concatenation and no temporary.
    pub fn fill_joint(&mut self, step: usize) {
        let n_state = self.n_state;
        let n_action = self.n_action;
        let horizon = self.horizon;
        let candidates = self.candidates;
        let sequences = &self.sequences;
        let imagined = &self.imagined;

        // Rows are independent and write to disjoint slices, which is the whole
        // search's parallelism made explicit.
        self.joint
            .axis_iter_mut(Axis(0))
            .into_par_iter()
            .enumerate()
            .for_each(|(row, mut joint_row)| {
                let candidate = row % candidates;
                let action_offset = (candidate * horizon + step) * n_action;

                // Contiguous slice copies on both halves, so the bounds checks
                // fall out and the gather streams.
                let target = joint_row.as_slice_mut().expect("joint rows are contiguous");
                let state_row = imagined.slice(s![row, ..]);
                for (destination, &value) in target[..n_state].iter_mut().zip(state_row.iter()) {
                    *destination = value;
                }
                target[n_state..]
                    .copy_from_slice(&sequences[action_offset..action_offset + n_action]);
            });
    }

    /// Advance every imagined state by its predicted delta and accumulate the
    /// epistemic spread in the SAME pass.
    ///
    /// The mean and the across-member variance are both reductions over the
    /// block that was just written, so fusing them means one traversal rather
    /// than three and no intermediate mean buffer at all.
    pub fn advance_and_score(&mut self, deltas: ArrayView2<'_, f32>, discount: f32,
                             penalty: f32, rewards: &[f32]) {
        self.imagined += &deltas; // in place; deltas, not levels

        let ensemble = self.ensemble;
        let candidates = self.candidates;
        let n_state = self.n_state;
        let imagined = &self.imagined;

        let scores: Vec<f32> = (0..candidates)
            .into_par_iter()
            .map(|candidate| {
                let mut spread = 0.0_f32;
                for dimension in 0..n_state {
                    let mut sum = 0.0_f32;
                    let mut sum_squares = 0.0_f32;
                    for member in 0..ensemble {
                        let value = imagined[[member * candidates + candidate, dimension]];
                        sum += value;
                        sum_squares += value * value;
                    }
                    let count = ensemble as f32;
                    let mean = sum / count;
                    spread += (sum_squares / count - mean * mean).max(0.0);
                }
                discount * (rewards[candidate] - penalty * spread.sqrt())
            })
            .collect();

        if self.returns.is_empty() {
            self.returns.extend_from_slice(&scores);
        } else {
            for (total, score) in self.returns.iter_mut().zip(scores.iter()) {
                *total += score;
            }
        }
    }

    /// One layer of the ensemble over the entire search, as a single GEMM.
    ///
    /// Per-candidate or per-member calls make thousands of tiny products, each
    /// too small to saturate anything. Stacking every (member, candidate) pair
    /// into the rows of one matrix makes each layer one product for the whole
    /// rollout step.
    #[must_use]
    pub fn ensemble_layer(&self, weights: &Array2<f32>, bias: &Array2<f32>) -> Array2<f32> {
        let mut out = self.joint.dot(weights) + bias;
        out.mapv_inplace(|value| value.max(0.0)); // in place, no temporary
        out
    }
}`,
        rationale:
          'Planning is candidates × horizon × ensemble per decision inside a control cycle, and it is parallel in candidates and in members — so both axes collapse into rows of one matrix and each layer becomes a single GEMM over the whole rollout step. The horizon loop is the one axis that cannot go, because step k+1 predicts from step k. Every buffer is sized once, since a planner that allocates does so thousands of times per second against a deadline, and the state advance and the epistemic spread fuse into one traversal of the block just written.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Candidates and ensemble members are fully independent within a horizon step and write to disjoint rows, which is the dominant cost of the decision and the search\'s natural parallelism.',
            tradeoff: 'The across-member reduction is done inside each candidate\'s task, so the split is over candidates only and a search with few candidates leaves cores idle.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Both halves of the joint row are filled by contiguous slice copies, so the per-step gather streams and its bounds checks fall out of the hot path.',
            tradeoff: 'It requires the joint rows to be in standard layout, which a transposed or sliced view turns into a runtime panic rather than a compile error.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The returns and sequence buffers are sized once at construction, so a planner running against a real-time deadline never reallocates mid-decision.',
            tradeoff: 'Candidate count and horizon are fixed at construction, so adapting the search budget to remaining cycle time means rebuilding the planner.',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Each ensemble layer is one product over every member-candidate row, rather than thousands of tiny per-candidate products that individually cannot saturate the hardware.',
            tradeoff: 'It pulls in a system BLAS as a build dependency, and all members must share an architecture to live in one weight matrix, so a heterogeneous ensemble is no longer expressible.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'One GEMM per layer per horizon step for the whole search; nothing allocated inside the planning loop. Illustrative, not a measured benchmark.',
      },
    },
  },
};
