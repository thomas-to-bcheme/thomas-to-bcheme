import type { AiMlModel } from '../../types';

/**
 * Imitation learning — the entry where the reward disappears and a
 * labelled dataset takes its place.
 *
 * Behavioural cloning is supervised learning, which is why it is the
 * first thing anyone tries and why it works more often than it should.
 * What makes it belong in this category rather than the supervised one
 * is that the learner's own mistakes change what it sees next, and
 * nothing in supervised learning accounts for that.
 */
export const IMITATION_LEARNING: AiMlModel = {
  slug: 'imitation-learning',
  name: 'Imitation Learning (Behavioral Cloning, DAgger)',
  aliases: ['Behavioral cloning', 'DAgger', 'Learning from demonstration', 'Inverse RL', 'GAIL'],
  category: 'reinforcement-learning',
  group: 'online-decision',
  kind: 'model',

  paradigms: ['supervised', 'reinforcement'],
  taskTypes: ['control', 'classification'],
  paradigmNote:
    'Supervised learning on state-action pairs, placed in this category because the sequential structure is what makes it fail. The training objective is an ordinary classification or regression loss with no reward anywhere — and the thing being learned is a policy whose own errors determine the inputs it sees next, which is a property no supervised loss can express and the entire source of the difficulty.',

  intuition:
    'If an expert already solves the task, the obvious move is to record what they do and fit a model that maps states to their actions. That is behavioural cloning, it is ordinary supervised learning with no reward and no exploration, and it works far more often than the theory suggests it should — which is exactly why the way it fails is worth understanding precisely. The failure is not that the model is inaccurate. It is that the model is evaluated somewhere it was never trained. The demonstrations cover the states an expert visits, and an expert who is good rarely visits bad states, so there is almost no data about how to recover from a mistake. The moment the learner makes a small error it is slightly off the expert\'s distribution, where its predictions are slightly worse, which produces a slightly larger error, and the drift compounds. The cost of this is not linear in the episode length but quadratic, which is the formal statement of "a small imitation error becomes a large behavioural one". DAgger fixes it by changing what is labelled rather than how it is fitted: run the learner, collect the states IT visits, ask the expert what they would have done there, add those to the dataset, and repeat. Now the training distribution converges toward the one the policy is actually evaluated on, and the error becomes linear again. The catch is in the requirement — an expert who can be queried on arbitrary states, interactively, which is exactly what you usually do not have. Most of the field is about what to do when you only have a fixed set of demonstrations.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{\\theta}\\ \\mathbb{E}_{s \\sim d_{\\pi^{*}}}\\bigl[\\ell\\bigl(\\pi_{\\theta}(s),\\, \\pi^{*}(s)\\bigr)\\bigr] \\qquad \\text{evaluated under} \\qquad s \\sim d_{\\pi_{\\theta}}',
      symbols: [
        { symbol: 'd_{\\pi^{*}}', meaning: 'the state distribution the EXPERT visits — what the dataset covers, and what the loss is minimized over' },
        { symbol: 'd_{\\pi_{\\theta}}', meaning: 'the state distribution the LEARNER visits — what performance is actually measured on, and which the learner\'s own errors move' },
        { symbol: '\\ell', meaning: 'an ordinary supervised loss: cross-entropy over discrete actions, squared error over continuous ones; no reward appears anywhere' },
        { symbol: '\\pi^{*}(s)', meaning: 'the expert\'s action, which is the label — so the ceiling on performance is the expert, and their mistakes are inherited as targets' },
      ],
    },
    reading:
      'The entire content is the gap between the two distributions written on either side of that phrase. Train on one, be graded on the other, and every guarantee supervised learning offers evaporates — because those guarantees all assume the test distribution is the training distribution, and here the model itself moves the test distribution by acting. The consequence has a precise form: if the per-state error rate is epsilon over an episode of length T, behavioural cloning incurs cost that scales as epsilon times T squared, while a method whose training data comes from its own distribution incurs epsilon times T. The squared term is the compounding, and it is why a policy with 99% action accuracy can still fail a long task reliably. Two further readings matter. The dataset contains almost no recovery data, by construction: a good expert does not get into bad states, so the states where the learner most needs guidance are precisely the ones least represented — which is why deliberately perturbing the expert during collection, and labelling the recovery, is one of the highest-value things a data-collection protocol can do. And the label is the expert\'s action, which sets a ceiling: imitation cannot exceed the demonstrator, it can only approach them, and any systematic error the expert makes is being fitted as a target rather than corrected. That is the structural reason to move to inverse reinforcement learning, which infers what the expert was trying to achieve and then optimizes it — generalizing further, at the cost of a much harder and less stable problem.',
  },

  optimization: {
    method: 'Supervised fitting of a policy to demonstrated actions, optionally with interactive dataset aggregation (DAgger) so that the training distribution converges toward the states the learner itself visits',
    updateRule: {
      formula:
        '\\mathcal{D}_{i+1} = \\mathcal{D}_{i} \\cup \\bigl\\{(s, \\pi^{*}(s)) : s \\sim d_{\\pi_{i}}\\bigr\\}, \\qquad \\pi_{i+1} = \\arg\\min_{\\theta}\\ \\mathbb{E}_{(s,a) \\sim \\mathcal{D}_{i+1}}\\bigl[\\ell(\\pi_{\\theta}(s), a)\\bigr]',
      symbols: [
        { symbol: 's \\sim d_{\\pi_{i}}', meaning: 'states visited by the CURRENT learner — the whole of DAgger is that the states come from the policy and the labels come from the expert' },
        { symbol: '\\mathcal{D}_{i} \\cup', meaning: 'aggregation, not replacement: the dataset only grows, which is what makes the sequence of fitted policies stable rather than oscillating' },
        { symbol: '\\pi^{*}(s)', meaning: 'the expert queried on a state they did not choose to visit — the requirement that makes DAgger hard to apply, since most experts are recordings rather than oracles' },
        { symbol: '\\arg\\min_{\\theta}', meaning: 'refitted from the whole aggregated set each round, which is why the total training cost grows quadratically in the number of rounds' },
      ],
    },
    rationale:
      'Three approaches, and the differences between them are about what is scarce. Behavioural cloning assumes demonstrations are all you get, needs nothing beyond a supervised trainer, and pays for it with compounding distribution shift. DAgger assumes the expert can be queried interactively and spends those queries where they matter most — on the states the learner actually reaches — which is what converts the quadratic cost back to linear. Its practical form mixes expert and learner control with a decaying probability, so the first rounds stay near the expert while the policy is still bad and later rounds explore the learner\'s own distribution, and its practical difficulty is that a human expert asked to label thousands of out-of-context states is expensive and inconsistent. Inverse reinforcement learning changes the target: infer the reward the expert appears to be optimizing, then optimize it with any method from this category. That generalizes beyond the demonstrated states in a way copying actions cannot, and it is substantially harder — the problem is ill-posed, since many rewards explain the same behaviour, and the adversarial formulation used in practice inherits every instability of a minimax game. Two data-side interventions deserve as much attention as the algorithm choice, because they are cheaper and often larger. Perturbing the expert during collection and recording the recovery supplies exactly the data the expert distribution structurally lacks. And representing the action distribution rather than its mean matters whenever the expert is multimodal: averaging two valid ways around an obstacle produces a trajectory straight into it, which is a failure that looks like model capacity and is actually a modelling-choice error.',
    hyperparameters: [
      { name: 'DAgger mixing schedule (beta)', role: 'Probability of executing the expert rather than the learner during collection. Decayed from one, so early rounds stay near the expert while the policy is still dangerous', typicalRange: 'beta_i = 0.5^i, or linear to zero' },
      { name: 'aggregation rounds', role: 'How many collect-label-refit cycles. Each round costs expert queries and a refit over the whole grown dataset, so the budget is usually set by expert availability', typicalRange: '5 to 20 rounds' },
      { name: 'action representation', role: 'A point prediction, a discretization, or a mixture. Decisive when the expert is multimodal, because the mean of two valid actions is frequently not a valid action', typicalRange: 'discretized bins or a mixture head' },
      { name: 'observation history length', role: 'How much past context the policy sees. More is not better here: extra history is what enables causal confusion, which is the reverse of supervised intuition', typicalRange: 'as short as the task permits' },
      { name: 'expert perturbation rate', role: 'How often the expert is deliberately knocked off course during collection so the recovery can be recorded. Often the highest-value line in the whole protocol', typicalRange: '5% to 20% of steps' },
      { name: 'demonstration count', role: 'The binding resource. Diminishing returns arrive quickly on the expert distribution, which is why coverage of failure states beats sheer volume', typicalRange: 'tens to thousands, task-dependent' },
      { name: 'regularization', role: 'Standard supervised regularization applies, and it matters more than usual because the policy will be evaluated off its training distribution where an overfitted model degrades fastest', typicalRange: 'weight decay, dropout, augmentation' },
    ],
    convergence:
      'This is the one entry in this category whose training is straightforwardly convergent — it is supervised learning, it optimizes a convex-in-output loss, and it behaves exactly as a classifier or regressor behaves. The whole difficulty lies in what that guarantee does not cover. The standard result is the one to remember: behavioural cloning with per-state error epsilon over horizon T incurs cost scaling as epsilon times T squared, while DAgger achieves epsilon times T, and the difference is entirely down to whose state distribution the training data came from. The characteristic failures are worth naming individually because they are unusually distinct. Compounding distribution shift is the headline one and it presents as a policy with excellent held-out action accuracy that fails the actual task, which is why validation accuracy on expert data is a nearly useless metric here. Causal confusion is the most surprising: give the policy access to its own previous action, or to any feature that correlates with the expert\'s action rather than causing it, and it can learn to copy the correlate instead of the cause — and because that feature is available at every step, more information makes performance worse, reversing the usual supervised intuition entirely. Multimodality is the quietest: when the expert has several valid options, a model fitted to minimize squared error predicts their average, and the average of two valid actions is often invalid in a way that looks like an underfit model. And the ceiling is structural — the expert\'s mistakes are labels, so systematic expert error is being fitted rather than corrected, and no amount of data improves on the demonstrator.',
    complexity:
      'Training is ordinary supervised training over the demonstration set, and it is cheap by the standards of this category: no simulator, no exploration, no replay, no instability. That is the entire practical appeal. DAgger multiplies it by the number of rounds and, because each round refits over the whole aggregated dataset, total training cost across rounds grows quadratically rather than linearly — the standard mitigation is to warm-start each round from the previous policy rather than refitting from scratch. Inference is one forward pass. The resource that actually binds is neither compute nor data volume but expert queries: DAgger\'s cost model is measured in how many states a human is willing to label out of context, and the algorithms that succeed in practice are the ones that spend those queries selectively — querying only where an ensemble of policies disagrees, rather than on every visited state.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'A multi-step autoregressive forecaster trained on ground-truth history is behavioural cloning of the true trajectory: it is fitted on states it will never see at inference, because at inference it consumes its own predictions.',
        where: [
          'Teacher forcing in autoregressive forecasting, which is behavioural cloning with the true history as the expert',
          'Scheduled sampling, which is DAgger: train on a mixture of true and self-generated history so the training distribution moves toward the inference one',
          'Multi-step rollout error as the honest evaluation, since one-step accuracy is measured on a distribution the model never encounters when deployed',
          'Any forecaster whose own output feeds its next input, where the drift compounds exactly as it does for a cloned policy',
        ],
        why: 'Included because the correspondence is exact rather than analogical, and recognizing it explains a failure that otherwise looks mysterious. An autoregressive forecaster trained with teacher forcing sees ground-truth history at every training step and its own predictions at every inference step — train on one distribution, deploy on another, with the model itself moving the second one. That is behavioural cloning, the compounding is the same compounding, and the standard forecasting symptom is the same: excellent one-step accuracy and a multi-step rollout that drifts away. The remedies transfer both directions. Scheduled sampling, which mixes model predictions into the training history with an increasing probability, is DAgger with the ground-truth series as the always-available expert — and it is a setting where DAgger\'s hardest requirement is trivially satisfied, because the correct next value is known for every state the model wanders into. That is a genuinely better position than a robotics team is ever in. The limit of the correspondence is worth stating too: a forecaster\'s errors do not change the world, only its own inputs, so the distribution shift is confined to the model\'s internal state rather than compounding through a real system.',
        featurization: [
          'Evaluate on multi-step rollouts under self-generated history, since one-step accuracy is measured on a distribution the model never sees in deployment',
          'Mix self-generated history into training with an increasing probability, which is scheduled sampling and is DAgger with a free expert',
          'Watch for the forecasting analogue of causal confusion: a lagged target as an input feature lets the model copy rather than predict',
          'Report the drift over the horizon explicitly, because the error growth pattern is what distinguishes this failure from ordinary inaccuracy',
        ],
        evaluation:
          'Rolling-origin multi-step error with the model consuming its own predictions, at the horizon the decision acts on. One-step held-out error measures performance on the expert distribution and systematically overstates what deployment will deliver — which is the same warning behavioural cloning gets, for the same reason.',
        pitfalls: [
          'One-step accuracy reported as model quality, when deployment runs on self-generated history',
          'Teacher forcing throughout training with no exposure to the model\'s own errors, which guarantees the drift',
          'A lagged target among the input features, which lets the model copy the answer and collapses at rollout',
          'Treating the drift as an accuracy problem to be fixed with capacity, when it is a distribution problem',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Detection scores observations without acting, so there is no policy whose own errors change what it sees next — the property that makes this entry belong in this category rather than the supervised one is exactly the property detection does not have.',
      },
      optimization: {
        fit: 'primary',
        how: 'Learn a policy by fitting demonstrated actions with an ordinary supervised loss, then close the distribution gap by collecting states from the learner and labelling them with the expert.',
        where: [
          'Distribution shift caused by the model itself, which is the clearest instance of a failure supervised theory cannot express',
          'The quadratic-versus-linear horizon cost, which makes "small error, large failure" a precise statement rather than an intuition',
          'Causal confusion, where adding an informative feature makes performance worse — the sharpest counterexample to ordinary supervised intuition available',
          'Multimodal targets, where fitting the mean of several valid answers produces an invalid one',
        ],
        why: 'The most transferable entry in this category, because almost none of its lessons are about reinforcement learning. The first is the central one: whenever a model\'s output influences its own future inputs, the training and deployment distributions differ and the divergence compounds — that covers recommender feedback loops, autoregressive generation, any controller, and any pipeline where a model\'s prediction becomes another model\'s input. The fix is structural rather than statistical: get labels on the distribution the model actually produces. The second is causal confusion, and it is worth carrying because it inverts a habit: more informative features normally help, and here a feature that correlates with the target without causing it is actively harmful, because it is available at every step and the model will take it. The third is about multimodality — a squared-error loss on a multimodal target returns the mean, the mean of two valid actions is frequently invalid, and the symptom looks exactly like insufficient capacity. Where imitation is the wrong choice is straightforward. It cannot exceed the expert, so if the goal is superhuman performance and a reward and simulator exist, reinforcement learning is the answer and imitation is at best an initialization. If the expert is inconsistent or mediocre, their errors become training targets. And if no interactive expert exists and the horizon is long, plain cloning will compound and something has to supply recovery data — usually deliberate perturbation during collection, which is cheap and routinely skipped.',
        featurization: [
          'Perturb the expert during collection and record the recovery, since the expert distribution structurally contains almost no data about fixing mistakes',
          'Give the policy as little history as the task permits, because extra context is what makes causal confusion possible',
          'Represent the action distribution rather than its mean whenever the expert is multimodal, or the fitted average will be invalid',
          'Validate on rollouts under the learner\'s own control, never on held-out expert actions, which measure the wrong distribution',
        ],
        evaluation:
          'Task success under the learner\'s own control over full episodes — that is the only measurement that sees the compounding. Held-out action accuracy on expert data is measured on the wrong distribution and is close to uninformative; a policy at 99% action accuracy can fail a long task reliably, and the gap between those two numbers is the whole subject.',
        pitfalls: [
          'Validation accuracy on expert states treated as a performance estimate, when deployment runs on a distribution the model moves',
          'No recovery data anywhere in the dataset, so the policy has never seen a state it will spend most of its failures in',
          'A previous-action feature that lets the policy copy itself, which is causal confusion and gets worse with more context',
          'Squared-error regression onto a multimodal expert, which returns an average that is not a valid action',
        ],
      },
    },
    breadth: {
      'control-and-operations': {
        fit: 'primary',
        how: 'Fit a controller to recorded operator or expert demonstrations, then either deploy it directly or use it to initialize a reinforcement-learning policy that improves on it with far less exploration.',
        where: [
          'Robot learning from demonstration, where teleoperated trajectories are cheap and a reward function is hard to specify',
          'Automating a task an experienced operator performs well but cannot articulate as a rule set',
          'Initializing a reinforcement-learning policy from demonstrations, which removes most of the random-exploration phase',
          'Any setting where exploration is unsafe, since imitation requires no exploration at all',
        ],
        why: 'The most practically deployed form of learned control after classical methods, and the reasons are as much organizational as technical. Specifying a reward function that captures what an operator actually cares about is genuinely hard and a common way for reinforcement-learning projects to fail; demonstrating the behaviour sidesteps that entirely. Imitation also requires no exploration, which matters enormously on physical systems where exploration means damage. And it initializes well: starting a reinforcement-learning run from a cloned policy removes the long unproductive random phase, which is often the difference between a feasible and an infeasible interaction budget. Three cautions decide projects. The expert is the ceiling, so if the operator is inconsistent across shifts the policy learns the average of inconsistent behaviour, which may be worse than any individual. Recovery data is the thing that is missing, always, and deliberately perturbing the system during collection to record how the operator corrects it is the highest-value change most protocols can make. And a cloned policy has no notion of a constraint — it has only seen an expert who happened to respect one, which is not the same as being unable to violate it, so a hard interlock remains mandatory.',
        featurization: [
          'Perturb the system during collection and record the operator\'s correction, which supplies the recovery data demonstrations otherwise lack',
          'Check consistency across demonstrators before pooling; averaging two incompatible strategies produces a policy that follows neither',
          'Keep the observation as close to the operator\'s own information as possible, since a mismatch is where causal confusion enters',
          'Treat the cloned policy as an initialization when a reward exists, rather than as the final artefact',
        ],
        evaluation:
          'Closed-loop task success under the policy\'s own control against the operator on matched scenarios, with constraint violations counted separately. Report performance in perturbed starting conditions specifically — that is where the absence of recovery data shows, and it will not appear in an evaluation that starts every episode from a nominal state.',
        pitfalls: [
          'Pooled demonstrations from operators using different strategies, yielding a policy that averages incompatible behaviours',
          'Evaluation only from nominal starting states, which never probes the missing recovery data',
          'Assuming a cloned policy respects a constraint because the expert did, when it has only seen the constraint never being tested',
          'Treating imitation as the ceiling when a reward function exists and reinforcement learning could exceed the demonstrator',
        ],
      },
      'natural-language': {
        fit: 'primary',
        how: 'Supervised fine-tuning on demonstration data is behavioural cloning: the model is fitted to produce the tokens a demonstrator produced, on prefixes the demonstrator wrote rather than prefixes the model will generate.',
        where: [
          'Instruction tuning, which is the largest deployment of behavioural cloning anywhere and is rarely described as one',
          'Exposure bias as the language-model name for compounding distribution shift, arising from exactly the same mismatch',
          'Rejection sampling and best-of-n distillation, which are DAgger-shaped: generate under the model, label the good outputs, aggregate, refit',
          'The ceiling argument that motivates preference optimization, since cloning cannot exceed the demonstrator',
        ],
        why: 'The most consequential instance of behavioural cloning in current practice, and naming it as such explains several things that otherwise look like separate phenomena. Supervised fine-tuning trains on prefixes a human wrote and deploys on prefixes the model wrote, which is the distribution mismatch exactly; exposure bias is its symptom and the degradation of long generations is its compounding. The ceiling argument is the same one: the model is fitted to reproduce demonstrations, so it approaches the demonstrator and cannot pass them, which is precisely the gap that preference-based methods exist to close — they optimize a signal about what is better rather than a label about what was done, which is the inverse-reinforcement-learning move applied to text. Rejection sampling fine-tuning is the DAgger move: generate under the current model, keep or label the good outputs, aggregate, refit — training on the model\'s own distribution rather than the demonstrator\'s. Two cautions carry over unchanged. Multimodality is severe here, since many good responses exist for any prompt and fitting all of them with one likelihood produces something blander than any of them. And demonstration quality is the ceiling, which is why a small carefully curated set routinely beats a large mediocre one — a result that is surprising under ordinary supervised intuition and obvious under this one.',
        featurization: [
          'Curate demonstrations for quality over volume, since every demonstration is a target and the expert is the ceiling',
          'Generate under the current model and label those outputs, which is the DAgger move and trains on the distribution that will be deployed',
          'Evaluate on long generations under the model\'s own prefixes, because that is where compounding appears and short-prompt evaluation hides it',
          'Expect blandness from multimodal targets: one likelihood fitted to many good answers lands between them',
        ],
        evaluation:
          'Held-out human or model-judged quality on full generations produced under the model\'s own decoding, not token-level likelihood on demonstration text. Token likelihood is the language-model version of held-out action accuracy on expert states: measured on the wrong distribution, and systematically optimistic about deployment.',
        pitfalls: [
          'Token-level perplexity on demonstrations reported as capability, when deployment runs on self-generated prefixes',
          'Volume prioritized over demonstration quality, when every example is a target and mediocre ones are fitted as faithfully as good ones',
          'Expecting cloning to exceed the demonstrator, which is the ceiling and is what preference methods exist to lift',
          'Short-prompt evaluation only, which never exposes the compounding that long generations suffer',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The cheapest entry in this category by a wide margin, and that is most of its appeal. Ordinary supervised training over demonstrations: no simulator, no exploration, no replay buffer, no instability, and reproducible runs. DAgger multiplies that by the number of rounds and refits over a dataset that grows each round, so total cost across rounds is quadratic unless each round warm-starts from the previous policy. The resource that actually binds is expert queries — how many states a human will label out of context — and no amount of compute substitutes for it. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'One forward pass, deterministic if the mean is served. The deployed artefact is a plain supervised model with no value function, no planner and no sampling, which makes it the simplest thing to serve in this category and the easiest to reason about at the request level. What is absent is any notion of confidence about being outside its training distribution, which is exactly the situation it will spend its failures in — an ensemble or an explicit out-of-distribution check is the standard addition and is routinely omitted.',
    retrainingCadence:
      'Retrained when new demonstrations arrive or when the deployed policy is observed to fail, and the failures themselves are the most valuable data available — a state where the policy went wrong is precisely a state the expert distribution never covered. A production loop that captures those states, labels them and aggregates is DAgger in operational form, and it is the version most teams can actually run, since the expert is being asked about real situations rather than synthetic ones.',
    driftAndMonitoring: [
      'Task success under the policy\'s own control over full episodes, which is the only measurement that sees the compounding; held-out action accuracy does not',
      'Divergence between the states the policy visits and the demonstration distribution, since that gap is the failure mechanism made measurable',
      'Ensemble disagreement or an explicit out-of-distribution score at serving, because a cloned policy has no native notion of being somewhere it was not trained',
      'Error growth over the episode: a fault rate that rises with elapsed time is compounding, and a flat one is ordinary inaccuracy',
      'Demonstration coverage of failure and recovery states, which is what determines whether the policy can get back on track at all',
      'Expert consistency across demonstrators, since pooled incompatible strategies produce a policy that follows neither',
    ],
    productionGotchas: [
      'Held-out action accuracy on expert data is close to useless as a performance estimate. It is measured on a distribution the deployed policy does not visit, and a policy at 99% accuracy can fail a long task reliably',
      'Causal confusion reverses the usual intuition: giving the policy its previous action, or any feature that correlates with the expert\'s action without causing it, can make performance worse. More context is not safely better here',
      'The demonstrations contain almost no recovery data, because a good expert does not make mistakes. Deliberately perturbing the expert during collection is the cheapest large improvement available and is routinely skipped',
      'Fitting a squared-error regression to a multimodal expert returns the average of valid actions, which is frequently not a valid action — and it presents as an underfit model rather than as a modelling-choice error',
      'The expert is the ceiling. Their systematic mistakes are labels being fitted, not errors being corrected, and no quantity of data improves on the demonstrator',
      'DAgger needs an expert who can be queried on arbitrary states, interactively. Most experts are recordings, and this single requirement is why plain cloning remains so common',
      'Refitting from scratch each DAgger round makes total training cost quadratic in the round count; warm-starting from the previous policy is the standard fix',
      'A cloned policy has seen an expert who respected a constraint, which is not the same as being unable to violate one. Hard limits still need an interlock',
    ],
  },

  assumptions: [
    'The expert is good enough to be worth copying, since their actions are the labels and their errors are fitted as targets',
    'The policy observes enough to reproduce the expert\'s decision; a hidden variable the expert used and the policy cannot see makes the mapping unlearnable rather than merely hard',
    'The demonstrations cover the states the learner will visit — the assumption that behavioural cloning breaks and DAgger exists to repair',
    'The expert is consistent, or at least consistently multimodal in a way the action representation can express',
    'For DAgger specifically, the expert can be queried interactively on states they did not choose to visit',
    'The observation contains no feature that correlates with the expert\'s action without causing it, or causal confusion is available for the model to exploit',
  ],

  pros: [
    {
      point: 'It is supervised learning, with everything that brings',
      context:
        'No reward function, no exploration, no simulator, no instability, reproducible runs and a mature tooling stack. That is a categorically easier engineering problem than anything else in this category, and it is why it is tried first',
    },
    {
      point: 'No exploration means no unsafe exploration',
      context:
        'On a physical system, exploration means damage. Imitation requires none at all, which makes it the only option in settings where a random action is unacceptable and no faithful simulator exists',
    },
    {
      point: 'It sidesteps reward specification entirely',
      context:
        'Writing a reward that captures what an operator actually cares about is genuinely hard and a common way for reinforcement-learning projects to fail quietly. Demonstrating the behaviour avoids the problem rather than solving it',
    },
    {
      point: 'It is an excellent initialization for reinforcement learning',
      context:
        'Starting from a cloned policy removes the long unproductive random-exploration phase, which is frequently the difference between a feasible interaction budget and an impossible one. This hybrid is the standard approach where both are available',
    },
    {
      point: 'DAgger converts the quadratic horizon cost to linear',
      context:
        'And it does so by changing what gets labelled rather than how the model is fitted, which is a general template: when a model\'s output moves its own input distribution, get labels on the distribution it actually produces',
    },
  ],

  cons: [
    {
      point: 'Compounding distribution shift, quadratic in the horizon',
      context:
        'The policy is trained on the expert\'s states and evaluated on its own, so a small error takes it somewhere it has no data and the drift accelerates. This is the defining failure and it is invisible in held-out accuracy',
    },
    {
      point: 'The expert is a hard ceiling',
      context:
        'Their actions are the labels, so their systematic mistakes are fitted as targets. Imitation can approach a demonstrator and never exceed one, which rules it out wherever the goal is to do better than current practice',
    },
    {
      point: 'Causal confusion makes more information harmful',
      context:
        'A feature correlating with the expert\'s action rather than causing it will be used, and it is available at every step. The previous-action case is the standard example and it inverts ordinary feature-engineering intuition entirely',
    },
    {
      point: 'Multimodal experts break point predictions',
      context:
        'Two valid ways around an obstacle average into a trajectory through it. The symptom looks exactly like insufficient capacity, and the actual fix is a different action representation rather than a bigger model',
    },
    {
      point: 'Recovery data is structurally absent',
      context:
        'A good expert does not get into bad states, so the dataset has almost nothing about the situations where the policy most needs guidance. It has to be manufactured deliberately, and most collection protocols do not',
    },
    {
      point: 'DAgger needs an interactive expert, which usually does not exist',
      context:
        'Querying a human on thousands of out-of-context states is expensive, slow and inconsistent, and most experts are recordings rather than oracles. That single requirement is why plain cloning, with all its flaws, remains the common case',
    },
  ],

  relatedSlugs: ['ppo-trpo', 'rlhf-dpo', 'sac', 'gan', 'model-based-rl', 'decoder-only-lm'],
