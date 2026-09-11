import type { AiMlModel } from '../../types';

/**
 * RLHF and DPO — the entry where the objective is a difference.
 *
 * Neither method ever learns what a good response is worth. Both learn
 * only which of two responses is better, and everything distinctive
 * about them follows from that: the reward is identified only up to a
 * per-prompt shift, the KL term is the only thing anchoring an
 * otherwise unbounded optimization, and the characteristic failure is
 * Goodhart's law arriving exactly on schedule.
 */
export const RLHF_DPO: AiMlModel = {
  slug: 'rlhf-dpo',
  name: 'RLHF & Direct Preference Optimization',
  aliases: ['RLHF', 'DPO', 'Preference optimization', 'Reward modelling', 'Bradley-Terry alignment', 'PPO fine-tuning'],
  category: 'generative-ai',
  group: 'adaptation-alignment',
  kind: 'technique',

  paradigms: ['reinforcement', 'supervised'],
  taskTypes: ['generation', 'sequence-modeling', 'ranking'],
  paradigmNote:
    'Genuinely both, and the split is what distinguishes the two methods rather than a classification quibble. Reward modelling is plain supervised learning on pairwise labels; the policy step in classic RLHF is reinforcement learning, with the policy sampling its own responses and being scored by that learned reward. DPO collapses the second stage into the first: an algebraic identity turns the KL-constrained reinforcement-learning problem into a supervised classification loss over the same preference pairs, which removes the sampling loop entirely. What it also removes is exploration, and that is the trade the two paradigms are really arguing about.',

  intuition:
    'A pretrained model can produce a plausible continuation but has no notion of which of two plausible continuations anyone would rather receive, and the reason is structural: next-token likelihood rewards imitating the training distribution, which contains excellent and terrible text in unknown proportion. Preferences are the missing supervision, and they are cheap in a specific form — people are unreliable at scoring a response out of ten and fairly reliable at saying which of two they prefer. So collect comparisons, fit something that explains them, and push the model toward what wins. Two routes from there. Classic RLHF fits a reward model to the comparisons and then optimizes the policy against it with reinforcement learning, held near the original by a KL penalty. DPO observes that the optimal policy under that penalty has a closed form, inverts it to express the reward in terms of the policy itself, and lands on a logistic loss over preference pairs with no reward model and no sampling. The idea that makes both work is also the one that makes them fail: because only differences are ever observed, the optimization has a direction it can run in forever, and the KL term is the only thing holding it. Release that and you get a model that scores superbly and is worse.',

  objective: {
    kind: 'margin',
    expression: {
      formula:
        '\\mathcal{L}_{\\text{DPO}}(\\theta) = -\\, \\mathbb{E}_{(x, y_w, y_l) \\sim \\mathcal{D}} \\left[ \\log \\sigma\\!\\left( \\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)} \\right) \\right]',
      symbols: [
        { symbol: 'y_w, y_l', meaning: 'the preferred and dispreferred responses to the same prompt — always a pair, never an absolute score' },
        { symbol: '\\pi_\\theta, \\pi_{\\text{ref}}', meaning: 'the policy being trained and the frozen reference it started from' },
        { symbol: '\\beta', meaning: 'the KL strength; small values permit a large departure from the reference, which is where the failures live' },
        { symbol: '\\beta \\log(\\pi_\\theta / \\pi_{\\text{ref}})', meaning: 'the implicit reward — DPO\'s central identity, a reward expressed entirely through the policy' },
        { symbol: '\\sigma', meaning: 'the logistic function, from the Bradley-Terry model of pairwise choice' },
      ],
    },
    reading:
      'A logistic loss on a margin: the difference between the implicit reward of the preferred response and that of the dispreferred one, with nothing in the objective that cares about either value on its own. That is the structural fact the whole entry turns on. Classic RLHF writes the same problem in two steps — fit a reward model to the comparisons, then maximize expected reward minus beta times the KL divergence from the reference — and the optimum of that second step has a closed form, a reference policy exponentially tilted by the reward. Inverting that identity expresses the reward as a log-ratio of policies, substituting it back into the Bradley-Terry likelihood yields exactly the formula above, and the reinforcement-learning problem has become a classification problem. Three consequences worth carrying. Because only differences are observed, a reward model is identified only up to a shift per prompt, so its absolute values are meaningless and comparing them across prompts is a mistake people make constantly. Because the objective only raises a margin, it can be satisfied by lowering the preferred response\'s likelihood as long as the dispreferred one falls faster — the widely reported pathology where both log-probabilities decline while the loss improves, and probability mass drains into sequences nobody labelled. And because the KL term is the only anchor, beta is not a regularization detail but the entire specification of how far a proxy may be trusted.',
  },

  optimization: {
    method: 'PPO against a learned reward model with a KL penalty, or DPO\'s gradient descent on the pairwise logistic loss with no sampling at all',
    updateRule: {
      formula:
        '\\nabla_\\theta \\mathcal{L}_{\\text{DPO}} = -\\beta \\, \\mathbb{E} \\Bigl[ \\underbrace{\\sigma\\bigl(\\hat{r}_\\theta(x, y_l) - \\hat{r}_\\theta(x, y_w)\\bigr)}_{\\text{how wrong the implicit reward is here}} \\bigl( \\nabla_\\theta \\log \\pi_\\theta(y_w \\mid x) - \\nabla_\\theta \\log \\pi_\\theta(y_l \\mid x) \\bigr) \\Bigr]',
      symbols: [
        { symbol: '\\hat{r}_\\theta(x, y)', meaning: 'the implicit reward, beta times the log-ratio of policy to reference on that response' },
        { symbol: '\\sigma(\\hat{r}_l - \\hat{r}_w)', meaning: 'a per-pair weight near one when the model currently has the pair backwards and near zero once it is confidently right' },
        { symbol: '\\nabla \\log \\pi_\\theta(y_w)', meaning: 'the ordinary likelihood gradient for the preferred response — raised' },
        { symbol: '\\nabla \\log \\pi_\\theta(y_l)', meaning: 'the same for the dispreferred response — lowered, and nothing bounds how far' },
      ],
    },
    rationale:
      'The gradient is worth reading slowly, because it explains both why DPO is stable and why it drifts. It is the ordinary likelihood gradient on the winner minus the ordinary likelihood gradient on the loser, scaled by how badly the current implicit reward has the pair ordered — an automatic curriculum that concentrates on pairs still being got wrong and ignores ones already settled. That is the good half. The bad half is that only the difference is controlled, so the update is indifferent between raising the winner and sinking the loser, and in practice it sinks the loser; the reported symptom is a healthy-looking loss with both log-probabilities falling, which means probability mass is moving to sequences that appeared in no label. Against that, PPO with a reward model keeps a property DPO gives up: it samples from the current policy, so it can reward responses the preference set never contained, which matters whenever the dataset was collected from a materially different model. The cost is operational — four models resident, a value head, rollouts, and a clip range and KL coefficient that both need tuning — and it is a real cost rather than a fashion, which is why DPO displaced it for most work. The honest summary is that DPO is a better default and a worse ceiling: reliable, cheap, one meaningful hyperparameter, and structurally unable to discover anything outside its dataset.',
    hyperparameters: [
      { name: 'beta', role: 'The KL strength, and the only thing bounding how far the policy may chase a proxy. Too small and reward hacking is guaranteed; too large and nothing moves', typicalRange: '0.01 to 0.5, commonly 0.1' },
      { name: 'reference policy', role: 'What the KL is measured against. Almost always the supervised-fine-tuned checkpoint, and a mismatch between it and the policy that generated the preference data is DPO\'s main silent failure', typicalRange: 'the SFT checkpoint' },
      { name: 'learning rate', role: 'Low, because the reference anchor is the only thing preventing collapse and a large step escapes it in a handful of updates', typicalRange: '1e-7 to 5e-6' },
      { name: 'preference batch size', role: 'Pairs per step. Larger batches damp the noise in individual annotations, which is substantial at typical agreement rates', typicalRange: '32 to 512 pairs' },
      { name: 'PPO clip range', role: 'RLHF only. Bounds the policy ratio per update; loose values make the run unstable rather than fast', typicalRange: '0.1 to 0.3' },
      { name: 'reward-model ensemble size', role: 'RLHF only. Disagreement across an ensemble is the cheapest available detector of the policy leaving the reward model\'s support', typicalRange: '1 to 5' },
    ],
    convergence:
      'Four failures, and the first is not a bug in any implementation. Reward hacking is Goodhart\'s law on schedule: optimize a learned proxy hard enough and true quality rises, peaks, and then declines while the proxy keeps improving, so the measured reward is a rising line over a model that is getting worse. The peak sits at a finite KL distance from the reference, which is why beta is the specification of the whole procedure and why KL from reference is the single most informative thing to plot. Second, the annotator ceiling: pairwise human agreement on realistic comparisons typically runs between seventy and eighty percent, so a reward model cannot be meaningfully more accurate than that, and every downstream number inherits the ceiling — a reward model reporting ninety-five percent validation accuracy has learned an artefact, most often length. Third, length and style bias, the most reproducible artefact in this area: annotators prefer longer, more confident, better-formatted answers, the reward model learns that faithfully, and the policy discovers it immediately, so verbosity is the first thing any preference-optimized model acquires. Fourth, DPO\'s likelihood displacement: because only the margin is constrained, both chosen and rejected log-probabilities commonly fall together, which satisfies the objective while moving mass to unlabelled sequences — monitor the two log-probabilities separately, since the loss curve cannot show it.',
    complexity:
      'Classic RLHF holds four models at once — policy, frozen reference, reward model and value head — and is dominated by rollout generation rather than by gradient steps, since each update needs fresh samples from the current policy. DPO holds two, policy and reference, needs two forward passes per response, and does no sampling at all; the reference passes depend on nothing being trained, so they can be computed once offline and cached, which removes the second model from the training loop entirely. Reward-model training itself is ordinary supervised learning, two forward passes per pair, and is the cheapest stage by a wide margin.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'Forecasts are scored against values that arrive on their own, so substituting a learned proxy for human preference replaces a ground truth with an approximation of one — and every failure mode here comes from optimizing a proxy that a real target was available for.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Preference optimization changes what a model prefers to emit and produces no measure of how unusual an input is; the reward is an ordering over responses to the same prompt, identified only up to a shift, so it cannot be read as a density or a score.',
      },
      optimization: {
        fit: 'primary',
        how: 'The entire technique is a constrained optimization and a case study in optimizing a proxy. Maximize expected reward under a KL trust region around a reference policy, where the reward is itself learned from noisy pairwise labels — and the constraint, not the objective, is what determines whether the result is any good.',
        where: [
          'KL-constrained policy optimization, where the constraint is the specification rather than a regularization detail',
          'Goodhart\'s law with a measurable turning point: true quality against proxy reward as a function of distance from the reference',
          'An algebraic reparameterization that converts a reinforcement-learning problem into a classification loss with no sampling',
          'Learning from comparisons rather than scores, which identifies the objective only up to a per-prompt shift',
        ],
        why: 'The most instructive optimization story in this reference, because the proxy is visibly a proxy and the divergence between it and the truth can be plotted. Several lessons transfer well beyond alignment. A learned objective is only trustworthy within the region where its training data lived, so unconstrained optimization against it is guaranteed to leave that region — the KL term is not conservatism, it is the statement of where the proxy is valid. The DPO derivation is a clean demonstration that a change of variables can eliminate an entire optimization stage, since the closed-form optimum of the constrained problem can be inverted and substituted back rather than reached by iteration. And the objective depending only on differences shows up everywhere once noticed: it means absolute reward values carry no information, which invalidates any comparison of reward across prompts and a great deal of reported tooling that does exactly that.',
        featurization: [
          'Plot true quality against KL from the reference rather than against training step; the turning point is the result and step count hides it',
          'Normalize or centre reward per prompt before any comparison, since the Bradley-Terry model fixes it only up to a per-prompt shift',
          'Hold out preference pairs from a different annotator cohort, because agreement rate is the ceiling on everything downstream',
          'Track chosen and rejected log-probabilities separately; a margin improving while both fall is the failure the loss curve cannot show',
        ],
        evaluation:
          'Win rate against the reference policy judged by something other than the reward being optimized — human review or an independent judge — reported against KL distance rather than against step. The critical measurement is where that curve turns: proxy reward rises monotonically past that point while true quality falls, and a run reported at its final step rather than its peak is reporting the wrong model.',
        pitfalls: [
          'Reporting the proxy reward as the result, which rises exactly while quality declines',
          'Treating beta as a regularization detail rather than as the statement of where the proxy can be trusted',
          'Comparing absolute reward values across prompts, which the preference model never identified',
          'Evaluating with a judge related to the reward model, which shares its blind spots and confirms them',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Collect pairwise comparisons on model responses to real prompts, fit a reward model or optimize the policy directly, and hold the result near the supervised-fine-tuned checkpoint with a KL term. This is the stage that turns a model which can produce a plausible answer into one that produces the answer people wanted.',
        where: [
          'Instruction-following and helpfulness tuning after supervised fine-tuning',
          'Harmlessness and refusal behaviour, where the preference data encodes a policy nobody can write down as rules',
          'Tone, format and house-style conformance that supervised data cannot specify by example alone',
          'Task-specific preference tuning — summarization faithfulness, code review style, support register',
        ],
        why: 'The standard final stage of post-training, and the reason is that the target is genuinely unspecifiable any other way: nobody can write the loss function for "a helpful answer", but almost anyone can pick the better of two. The domain-specific caveats are sharp. Verbosity bias is the most reproducible finding in the area — annotators prefer longer and more confident answers, the reward model learns it perfectly, and the policy exploits it within a few hundred steps, so length-controlled evaluation is mandatory rather than fastidious. Preference data ages badly: it reflects the model that generated it, so a dataset collected from last quarter\'s checkpoint is partly off-policy for this quarter\'s, and DPO is more sensitive to that than PPO because it cannot sample its way out. And alignment is a distribution over annotators, not a fact — who labelled the comparisons is part of the model\'s specification and belongs in its documentation as much as the training corpus does.',
        featurization: [
          'Report length-controlled win rates, because a raw win rate is measuring verbosity as much as quality',
          'Collect comparisons from the policy being tuned rather than from an older checkpoint, or accept a distribution gap DPO cannot close',
          'Record annotator cohort and agreement rate with the dataset; they are the ceiling on the reward model and on everything after it',
          'Deduplicate near-identical pairs, which inflate apparent agreement and concentrate the gradient on a narrow slice of behaviour',
        ],
        evaluation:
          'Pairwise win rate against the reference, length-controlled, judged independently of the reward model — an automated judge sharing the reward model\'s lineage confirms its biases rather than testing them. Alongside it, a capability benchmark the preference data never touched, since preference tuning routinely costs a few points of reasoning or factual accuracy and nothing in the objective notices.',
        pitfalls: [
          'Uncontrolled win rates, which reward length and formatting more than substance',
          'Preference data generated by a different checkpoint than the one being tuned',
          'A judge model related to the reward model, which makes the evaluation agree with the failure',
          'No capability benchmark, so the alignment tax goes unmeasured and is discovered by users',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'Apply the same pairwise machinery to image generation: collect comparisons between two generations from the same prompt, and either fit an aesthetic or alignment reward model or optimize the diffusion model directly with a DPO-style loss over the denoising likelihood.',
        where: [
          'Aesthetic and prompt-adherence tuning of text-to-image models',
          'Safety and content-policy behaviour expressed through comparisons rather than rules',
          'Brand or house-style conformance for a specific deployment',
          'Reducing characteristic artefacts that are obvious to a viewer and invisible to a pixel metric',
        ],
        why: 'A real and increasingly standard fit, with one structural complication that makes it harder than the language case. The likelihood of a diffusion sample is not directly available — it is a bound over a sampling trajectory — so the log-ratio at the centre of the loss becomes an approximation over sampled timesteps rather than an exact quantity, which adds variance the language version does not have. The motivation is strong anyway, because image quality is precisely the sort of target that is easy to compare and impossible to specify: no pixel metric agrees with a viewer about which of two images is better. The failure modes rhyme with the language ones and are more visible. Reward hacking produces a recognizable house style — oversaturated, over-smoothed, centrally composed — that scores well and collapses diversity, and because mode collapse is obvious by eye here, this is the setting where the cost of over-optimization is easiest to see.',
        featurization: [
          'Sample timesteps for the likelihood ratio rather than assuming a single step represents the trajectory',
          'Hold a fixed prompt suite, including prompts unrelated to the preference data, to watch diversity rather than only quality',
          'Separate aesthetic preference from prompt adherence in the data; a single comparison conflates them and the model optimizes the easier one',
          'Keep beta higher than the language default, since the noisier ratio makes a loose constraint fail faster',
        ],
        evaluation:
          'Human comparison against the reference on a fixed prompt suite, plus an explicit diversity measure across seeds — reward-hacked image models score well per image and produce the same image repeatedly, and no per-image metric can see that.',
        pitfalls: [
          'Optimizing until every output shares one house style, which scores well and is a collapse',
          'Conflating aesthetic quality with prompt adherence in a single comparison',
          'Ignoring the extra variance from approximating the diffusion likelihood ratio',
          'Evaluating only on prompts resembling the preference data, which cannot show lost diversity',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'The Bradley-Terry model underneath all of this is the same one classical learning-to-rank has used for decades, so pairwise implicit feedback — this item was clicked over that one — fits the reward-modelling half directly. The policy half applies where the system generates something rather than selecting it.',
        where: [
          'Pairwise learning-to-rank from implicit feedback, which is reward modelling by another name',
          'Generated surfaces — explanations, summaries, message copy — tuned by comparison rather than by click-through alone',
          'Conversational recommendation, where the response is generated and preference data is the natural supervision',
          'Offline preference data used to pre-train a ranker before online exploration',
        ],
        why: 'Worth including because it shows the lineage honestly: the pairwise logistic objective here is the same one RankNet used, and the interesting part is what the modern framing adds rather than any novelty in the loss. What it adds is the KL anchor and a language of proxy over-optimization that ranking has always needed and rarely names — a ranker optimized hard against a click proxy degrades in exactly the way a policy optimized against a reward model does. The boundary is worth being clear about. Ranking systems usually select from a catalogue rather than generate, and for selection the policy-optimization half has nothing to do; the reward-modelling half is simply supervised ranking, already well served by established methods. And implicit feedback is confounded by exposure in a way human comparisons are not: the loser of a click pair may have been positioned worse rather than been worse, which the Bradley-Terry model cannot distinguish and will happily fit.',
        featurization: [
          'Correct for position and exposure before treating a click pair as a preference, since the model cannot separate them',
          'Keep the pair within a single impression, or the comparison is confounded by context rather than reflecting quality',
          'Anchor a generated surface to its reference policy with a KL term, exactly as in the language case',
          'Treat the click proxy as a proxy and watch for the same turnover, because it behaves like one',
        ],
        evaluation:
          'Online tests decide, as always in this domain. Offline pairwise accuracy on held-out impressions is worth having as a regression guard, with the same caveat that it measures agreement with logged behaviour — including the incumbent ranker\'s exposure decisions — rather than quality.',
        pitfalls: [
          'Treating a click pair as a preference without correcting for position',
          'Applying the policy-optimization half to a system that selects rather than generates',
          'Optimizing a click proxy without watching for the turnover that a learned proxy always has',
          'Comparing items across impressions, where the Bradley-Terry shift is not identified',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Classic RLHF is the expensive path and most of the cost is not gradients: four models resident, and generation of fresh rollouts at every step, which dominates wall-clock and makes the run sensitive to sampling throughput rather than to training throughput. DPO is a different budget entirely — two forward passes per response, no sampling, and the reference passes precomputable offline, which in practice brings a preference run within reach of the same hardware that did the supervised fine-tune. The dominant cost in both cases is neither: it is collecting the comparisons. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'Nothing at all. Both methods produce an ordinary policy with the same architecture and the same latency as the model that went in, which is worth stating because it is unusual — the entire cost of this stage is paid at training time. The one change a deployment notices is behavioural: response length typically increases, which raises token cost per request even though per-token latency is unchanged.',
    retrainingCadence:
      'Set by preference-data collection, which is slow and human-bound, so the realistic cadence is weeks to months rather than continuous. The trap is that preference data ages against the model: a dataset collected from an earlier checkpoint is partly off-policy for the current one, and DPO has no mechanism to correct for that because it never samples. Budget fresh comparisons from the current policy alongside any retrain rather than reusing the existing set.',
    driftAndMonitoring: [
      'KL divergence from the reference policy, which is the axis every failure in this technique moves along and the one plot worth having',
      'Chosen and rejected log-probabilities tracked separately, since a margin can improve while both fall and the loss cannot show it',
      'Response-length distribution, because verbosity is the first thing a preference-optimized model acquires and the easiest to mistake for quality',
      'Capability benchmarks the preference data never touched, to measure the alignment tax rather than assume it is zero',
      'Reward-model ensemble disagreement in RLHF, which rises as the policy leaves the region the reward model was fitted on',
      'Refusal and over-refusal rates together, since harmlessness tuning moves both and only one is usually watched',
    ],
    productionGotchas: [
      'A reward model is identified only up to a per-prompt shift, so absolute reward values mean nothing and comparing them across prompts is a mistake tooling encourages',
      'Reward hacking is not an implementation bug. Proxy reward rises monotonically while true quality peaks and declines, so a run reported at its final step reports the wrong checkpoint',
      'The reference policy is part of the artefact. Change it and beta means something different, and a KL budget tuned against one reference does not transfer',
      'Verbosity is acquired within a few hundred steps and reads as quality in every uncontrolled evaluation, including most automated judges',
      'A judge model sharing lineage with the reward model agrees with its biases, which makes the evaluation confirm the failure instead of detecting it',
      'DPO can lower the likelihood of chosen and rejected responses together, moving probability mass to sequences nobody labelled — visible only if both are logged',
      'Preference data encodes the annotator cohort. Who labelled it is part of the model\'s specification and should be documented as carefully as the training corpus',
      'The alignment tax is real: a few points of reasoning or factual accuracy commonly go, and nothing in the objective notices or reports it',
    ],
  },

  assumptions: [
    'Human preferences are consistent enough to be modelled by Bradley-Terry — transitive, and driven by the response rather than by presentation order',
    'The annotators\' preferences are the ones worth optimizing, which is a value judgement embedded in the dataset rather than a property of the method',
    'The reward model or implicit reward remains valid over the region the policy reaches, which is exactly what the KL term is there to enforce and exactly what over-optimization violates',
    'The preference data is on-policy for the model being tuned; the further the generating policy is from it, the less of the data means anything, and DPO cannot sample to correct it',
    'The reference policy is already competent, since neither method teaches capability — both only reweight behaviour the model can already produce',
  ],

  pros: [
    {
      point: 'Optimizes a target that cannot be written down as a loss, using comparisons people can actually make reliably',
      context: 'The reason this stage exists. Absolute quality ratings are noisy and poorly calibrated between annotators; pairwise choices are far more stable, and Bradley-Terry is the standard way to turn the second into a model',
    },
    {
      point: 'DPO removes the reward model, the value head and the sampling loop by an exact algebraic substitution',
      context: 'Not an approximation but an identity under the KL-constrained objective. It turns four resident models into two and a reinforcement-learning loop into a supervised one, which is why it displaced PPO for most work',
    },
    {
      point: 'The KL term makes "how far may the model move" an explicit, tunable quantity',
      context: 'Rare and valuable: most techniques leave the trust in a proxy implicit. Here it is one number, and plotting quality against KL distance turns over-optimization into something you can see rather than suspect',
    },
    {
      point: 'Inference cost is completely unchanged — the output is an ordinary policy',
      context: 'The whole expense is at training time, so a preference-tuned model drops into existing serving with no architectural change. Token cost may rise through longer responses, which is behavioural rather than structural',
    },
    {
      point: 'The DPO gradient weights each pair by how wrong the model currently is on it',
      context: 'An automatic curriculum that costs nothing: settled pairs contribute almost no gradient while contested ones dominate, which is part of why the method is stable at low learning rates',
    },
  ],

  cons: [
    {
      point: 'Reward hacking is guaranteed rather than possible: optimize the proxy far enough and true quality turns over while the measured reward keeps rising',
      context: 'The peak sits at a finite KL distance, so the method has no natural stopping point and the stopping criterion has to come from an independent evaluation. Reporting the final checkpoint reports the wrong model',
    },
    {
      point: 'The reward model cannot exceed the annotators\' agreement rate, typically seventy to eighty percent on realistic comparisons',
      context: 'A low ceiling that everything downstream inherits, and a reward model reporting much higher validation accuracy has usually learned length or formatting rather than quality',
    },
    {
      point: 'Verbosity and formatting bias are learned faithfully and exploited immediately',
      context: 'The most reproducible artefact in this area. It makes uncontrolled win rates unusable as evidence, and length-controlled evaluation is the minimum bar rather than a refinement',
    },
    {
      point: 'DPO can drive the likelihood of preferred and dispreferred responses down together',
      context: 'The objective constrains only their difference, so this satisfies it perfectly while moving mass to unlabelled sequences. Invisible in the loss curve and visible only if both log-probabilities are logged',
    },
    {
      point: 'DPO cannot explore, so it is bounded by the responses its dataset already contains',
      context: 'The cost of removing the sampling loop. Where the preference data came from a materially different checkpoint, the gap cannot be closed by training longer, and PPO\'s on-policy sampling is the reason it still has a role',
    },
    {
      point: 'Preferences are a distribution over annotators, not a fact, and the dataset is a value judgement',
      context: 'Two cohorts produce two different models from the same procedure. This belongs in the model\'s documentation, and it usually is not there',
    },
    {
      point: 'The alignment tax is commonly a few points of reasoning or factual accuracy',
      context: 'Nothing in the objective protects a capability the preference data never mentioned, so it must be measured on held-out benchmarks or it will be discovered in production',
    },
  ],

  relatedSlugs: ['decoder-only-lm', 'lora-peft', 'q-learning', 'transformer', 'logistic-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""RLHF and DPO, transcribed from the objective.

No ML library, and a deliberately tiny world: a handful of prompts with
a handful of candidate responses each, so every quantity in the theory
can be computed exactly rather than estimated. That is what makes the
three claims below checkable instead of quoted.

    RLHF:  max_pi  E[r(x, y)] - beta * KL(pi || pi_ref)
    optimum:  pi*(y|x)  proportional to  pi_ref(y|x) * exp(r(x, y)/beta)
    DPO:   -log sigmoid( beta*log(pi/pi_ref)[y_w] - beta*log(pi/pi_ref)[y_l] )

Claim 1: the closed form above IS the optimum. tilted_policy() computes
it directly; dpo_train() reaches it by gradient descent on a
classification loss that never mentions reinforcement learning.

Claim 2: the reward is identified only up to a per-prompt shift.
bradley_terry_log_likelihood() is invariant to adding a constant to
every response of a prompt -- so absolute reward values carry no
information, and any tool comparing them across prompts is reading
noise.

Claim 3: reward hacking is not a bug. overoptimization_curve() fits a
reward model to limited comparisons, sweeps beta, and reports true
reward against KL from the reference. It rises, peaks, and falls, while
the proxy rises throughout.
"""

import math
import random

Distribution = list[float]


def softmax(logits: list[float]) -> Distribution:
    largest = max(logits)
    exponentials = [math.exp(value - largest) for value in logits]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def kl_divergence(policy: Distribution, reference: Distribution) -> float:
    """KL(policy || reference), the term that anchors the whole method.

    Asymmetric on purpose and in the direction that matters: it is
    infinite where the policy puts mass that the reference does not, so
    it forbids the policy from inventing behaviour rather than merely
    discouraging it.
    """
    total = 0.0
    for probability, base in zip(policy, reference):
        if probability <= 0.0:
            continue
        if base <= 0.0:
            return float("inf")
        total += probability * math.log(probability / base)
    return total


def tilted_policy(reference: Distribution, rewards: list[float], beta: float) -> Distribution:
    """The closed-form optimum of the KL-constrained problem.

        pi*(y|x)  proportional to  pi_ref(y|x) * exp(r(x, y) / beta)

    Worth staring at, because DPO is nothing more than this identity
    read backwards. Solve for r and you get beta * log(pi*/pi_ref) plus
    a term constant in y -- which is exactly the implicit reward, and
    exactly why the constant cancels in a difference.

    Note what beta does here. Large beta flattens the exponent and the
    optimum stays near the reference; small beta concentrates all mass
    on the highest-reward response, reference be damned. Beta is not a
    regularization detail, it is the statement of how far the proxy is
    trusted.
    """
    tilted = []
    for probability, reward in zip(reference, rewards):
        tilted.append(probability * math.exp(reward / beta))
    total = sum(tilted)
    return [value / total for value in tilted]


class PreferencePair:
    def __init__(self, prompt: int, winner: int, loser: int) -> None:
        self.prompt = prompt
        self.winner = winner
        self.loser = loser


def bradley_terry_log_likelihood(rewards: list[list[float]], pairs: list[PreferencePair]) -> float:
    """The likelihood a reward model is fitted to.

        P(y_w beats y_l) = sigmoid(r(y_w) - r(y_l))

    Only the DIFFERENCE appears. Add any constant to every response of
    one prompt and this value does not move, which is the formal
    statement that reward is identified up to a per-prompt shift --
    and the reason a dashboard comparing mean reward across prompts is
    displaying an arbitrary offset.
    """
    total = 0.0
    for pair in pairs:
        margin = rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser]
        # log sigmoid(margin), written stably.
        total += -math.log1p(math.exp(-margin)) if margin > 0 else margin - math.log1p(math.exp(margin))
    return total / len(pairs)


def fit_reward_model(
    n_prompts: int, n_responses: int, pairs: list[PreferencePair], steps: int, lr: float
) -> list[list[float]]:
    """Ordinary supervised learning on pairwise labels.

    Tabular, so there is no function approximation to hide behind: the
    reward model is one number per (prompt, response) and the only
    signal it ever sees is which of two was preferred. Everything it
    knows about a response it never saw is nothing, which is precisely
    why optimizing against it out of distribution is unsafe.
    """
    rewards = [[0.0 for _ in range(n_responses)] for _ in range(n_prompts)]

    for _ in range(steps):
        gradients = [[0.0 for _ in range(n_responses)] for _ in range(n_prompts)]
        for pair in pairs:
            margin = rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser]
            # d/dmargin of log sigmoid(margin) is sigmoid(-margin):
            # large when the pair is currently ordered wrongly, near
            # zero once it is confidently right. An automatic curriculum
            # that costs nothing.
            weight = 1.0 / (1.0 + math.exp(margin))
            gradients[pair.prompt][pair.winner] += weight
            gradients[pair.prompt][pair.loser] -= weight

        for prompt in range(n_prompts):
            for response in range(n_responses):
                rewards[prompt][response] += lr * gradients[prompt][response] / len(pairs)

    return rewards


def dpo_loss_and_gradient(
    logits: list[list[float]],
    reference: list[Distribution],
    pairs: list[PreferencePair],
    beta: float,
):
    """The DPO objective, computed rather than described.

    The implicit reward is beta * log(pi_theta / pi_ref), and the loss
    is a logistic loss on the difference between the winner's and the
    loser's. No reward model appears anywhere; no response is ever
    sampled.
    """
    policies = [softmax(row) for row in logits]
    gradients = [[0.0 for _ in row] for row in logits]
    total_loss = 0.0

    for pair in pairs:
        policy = policies[pair.prompt]
        base = reference[pair.prompt]

        implicit_winner = beta * math.log(policy[pair.winner] / base[pair.winner])
        implicit_loser = beta * math.log(policy[pair.loser] / base[pair.loser])
        margin = implicit_winner - implicit_loser

        total_loss += math.log1p(math.exp(-margin)) if margin > 0 else -margin + math.log1p(math.exp(margin))

        # sigma(r_loser - r_winner): how wrong the implicit reward
        # currently is on this pair. The whole gradient is scaled by it.
        weight = 1.0 / (1.0 + math.exp(margin))

        # d/dlogit_j of log pi(y) is [j == y] - pi(j), the ordinary
        # softmax gradient. So the update is the likelihood gradient of
        # the winner MINUS that of the loser -- and nothing in it cares
        # which of the two moves, only that they separate. That is the
        # source of the likelihood-displacement pathology: sinking the
        # loser satisfies the objective exactly as well as raising the
        # winner, and empirically it is what happens.
        for response in range(len(policy)):
            winner_term = (1.0 if response == pair.winner else 0.0) - policy[response]
            loser_term = (1.0 if response == pair.loser else 0.0) - policy[response]
            gradients[pair.prompt][response] -= beta * weight * (winner_term - loser_term)

    count = len(pairs)
    for row in gradients:
        for index in range(len(row)):
            row[index] /= count
    return total_loss / count, gradients


def dpo_train(
    reference: list[Distribution], pairs: list[PreferencePair], beta: float, steps: int, lr: float
):
    """Gradient descent on a classification loss, arriving at an
    RL optimum.

    The policy is initialized AT the reference, which is what the theory
    assumes and what production does. Every log-ratio starts at zero, so
    the implicit reward starts at zero everywhere and the first update
    is driven entirely by the labels.
    """
    logits = [[math.log(max(probability, 1e-12)) for probability in row] for row in reference]

    history = []
    for _ in range(steps):
        loss, gradients = dpo_loss_and_gradient(logits, reference, pairs, beta)
        for prompt, row in enumerate(logits):
            for response in range(len(row)):
                row[response] -= lr * gradients[prompt][response]
        history.append(loss)

    return [softmax(row) for row in logits], history


def log_probability_report(policy: list[Distribution], pairs: list[PreferencePair]):
    """Chosen and rejected log-probabilities, separately.

    The loss curve cannot distinguish "the winner went up" from "the
    loser went down twice as far", and the second is the reported
    failure. Logging both is the only way to see it, and it is the
    cheapest diagnostic in this entire entry.
    """
    chosen = 0.0
    rejected = 0.0
    for pair in pairs:
        chosen += math.log(max(policy[pair.prompt][pair.winner], 1e-12))
        rejected += math.log(max(policy[pair.prompt][pair.loser], 1e-12))
    count = len(pairs)
    return {
        "mean_chosen_logprob": chosen / count,
        "mean_rejected_logprob": rejected / count,
        "margin": (chosen - rejected) / count,
    }


def sample_preferences(
    true_rewards: list[list[float]], n_pairs: int, seed: int
) -> list[PreferencePair]:
    """Noisy annotators, sampled from Bradley-Terry.

    Labels come from sigmoid(r_a - r_b) rather than from argmax,
    because that is what the model assumes and what people actually do:
    disagree at a rate set by how close the two options are. Agreement
    on genuinely close pairs is near chance, and no reward model can
    exceed that.
    """
    rng = random.Random(seed)
    pairs = []
    for _ in range(n_pairs):
        prompt = rng.randrange(len(true_rewards))
        n_responses = len(true_rewards[prompt])
        first, second = rng.sample(range(n_responses), 2)

        gap = true_rewards[prompt][first] - true_rewards[prompt][second]
        probability_first_wins = 1.0 / (1.0 + math.exp(-gap))
        if rng.random() < probability_first_wins:
            pairs.append(PreferencePair(prompt, first, second))
        else:
            pairs.append(PreferencePair(prompt, second, first))
    return pairs


def overoptimization_curve(
    n_prompts: int = 6, n_responses: int = 8, n_pairs: int = 160, seed: int = 0
):
    """Goodhart's law, plotted.

    A true reward exists here and is never shown to the fitting
    procedure. A reward model is fitted to a limited, noisy sample of
    comparisons drawn from it, then the policy is tilted against the
    LEARNED reward at a sweep of beta values, and both rewards are
    measured under the result.

    What comes back: proxy reward rises monotonically as beta falls,
    true reward rises, peaks, and declines. The peak is at a finite KL
    distance, so there is no "train until converged" here -- the
    stopping point is a measurement, and it must come from an
    evaluation the optimizer never saw.
    """
    rng = random.Random(seed)
    true_rewards = [
        [rng.gauss(0.0, 1.0) for _ in range(n_responses)] for _ in range(n_prompts)
    ]
    reference = [softmax([rng.gauss(0.0, 0.5) for _ in range(n_responses)]) for _ in range(n_prompts)]

    pairs = sample_preferences(true_rewards, n_pairs, seed + 1)
    learned = fit_reward_model(n_prompts, n_responses, pairs, steps=600, lr=2.0)

    curve = []
    for beta in [2.0, 1.0, 0.5, 0.25, 0.125, 0.0625, 0.03125]:
        proxy_total = 0.0
        true_total = 0.0
        kl_total = 0.0

        for prompt in range(n_prompts):
            policy = tilted_policy(reference[prompt], learned[prompt], beta)
            kl_total += kl_divergence(policy, reference[prompt])
            for response in range(n_responses):
                proxy_total += policy[response] * learned[prompt][response]
                true_total += policy[response] * true_rewards[prompt][response]

        curve.append(
            {
                "beta": beta,
                "kl_from_reference": kl_total / n_prompts,
                "proxy_reward": proxy_total / n_prompts,
                "true_reward": true_total / n_prompts,
            }
        )
    return curve


def shift_invariance_check(rewards: list[list[float]], pairs: list[PreferencePair], shift: float):
    """The non-identifiability, demonstrated rather than claimed.

    Add a constant to every response of every prompt and the Bradley-
    Terry likelihood is unchanged to floating-point noise. The reward
    model has no opinion about absolute value and never did.
    """
    before = bradley_terry_log_likelihood(rewards, pairs)
    shifted = [[value + shift for value in row] for row in rewards]
    after = bradley_terry_log_likelihood(shifted, pairs)
    return {"before": before, "after": after, "difference": after - before}
`,
        profile:
          'Reward-model fitting is O(steps · pairs); DPO training is O(steps · pairs · responses) because the softmax gradient touches every response of the pair\'s prompt; the closed-form tilt is a single O(responses) pass per prompt. Illustrative, not a measured benchmark: the shape worth noticing is that the closed form and the gradient descent reach the same policy, so the entire reinforcement-learning apparatus in the tabular case is replaceable by one exponential — which is the identity DPO exploits at scale, where the closed form is unreachable.',
      },
      'make-it-right': {
        rationale:
          'The reference policy stops being an array passed alongside the data and becomes a pinned, fingerprinted object, because beta is meaningless without it — a KL budget tuned against one reference does not transfer to another, and the literal version would happily train against whatever was passed. Every recoverable failure names the values that caused it: a preference pair whose two responses are identical, an annotator cohort whose agreement rate is at chance and therefore carries no signal, a reference probability of zero where the policy is being asked to place mass, and a beta outside the range where the objective is numerically meaningful. Preference pairs become a NamedTuple carrying the annotator cohort, so the ceiling that cohort imposes travels with the data instead of living in a README. The stopping criterion becomes an explicit object rather than a step count, because the peak of true quality sits at a finite KL distance and a run that trains to convergence returns the wrong checkpoint by construction — the KLBudget here stops on a measured distance and records the checkpoint at the peak. Training runs inside a context manager that guarantees the reference model is released and the best checkpoint is restored, on the exception path as well as the ordinary one. And the two diagnostics that catch this failing are functions rather than advice: separate chosen and rejected log-probabilities, which is the only view that reveals likelihood displacement, and a length-controlled win rate, because an uncontrolled one measures verbosity.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'Context managers for resource cleanup',
        ],
        code: `"""Preference optimization with the silent failures made loud.

The literal version accepted all of these without complaint:

  * a beta tuned against one reference policy, applied to another,
    where it specifies a different trust region entirely;
  * an annotator cohort agreeing at chance, whose labels carry no
    signal and whose reward model will still report a number;
  * training to convergence, which by construction returns a
    checkpoint past the point where true quality turned over.

Each becomes an exception, a budget or a guard here. What is added
beyond defence is diagnostic: log_probability_report() and
length_controlled_win_rate() are the two measurements that separate
this working from this appearing to work.
"""

from __future__ import annotations

import contextlib
import math
from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from typing import NamedTuple, Protocol

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]

# Below this pairwise agreement the cohort is not distinguishable from
# coin flipping, and a reward model fitted to it is fitting noise.
MIN_ANNOTATOR_AGREEMENT = 0.55


class PreferenceError(Exception):
    """Base for every recoverable failure in preference optimization."""


class DegeneratePair(PreferenceError):
    """A comparison that carries no information."""


class UninformativeAnnotations(PreferenceError):
    """Agreement at or near chance; there is no signal to fit."""


class ReferenceMismatch(PreferenceError):
    """The policy is being anchored to a reference it did not start from.

    Beta is defined relative to a specific reference, so this is not a
    bookkeeping complaint: the same beta against a different reference
    is a different trust region and a different objective.
    """


class PreferencePair(NamedTuple):
    """A comparison, with the cohort that produced it.

    The cohort travels with the pair because the cohort's agreement
    rate is the ceiling on the reward model and on everything after it.
    Leaving it in a README is how that ceiling gets forgotten.
    """

    prompt_id: str
    chosen: str
    rejected: str
    cohort: str
    chosen_tokens: int
    rejected_tokens: int


@dataclass(frozen=True)
class ReferencePolicy:
    """The frozen anchor, fingerprinted.

    Pinned by identity rather than by value: a reference is a specific
    checkpoint, and two checkpoints that score identically still define
    different KL geometries.
    """

    checkpoint_id: str
    log_probs: dict[tuple[str, str], float]

    def log_prob(self, prompt_id: str, response: str) -> float:
        key = (prompt_id, response)
        if key not in self.log_probs:
            raise ReferenceMismatch(
                f"reference {self.checkpoint_id} has no log-probability for "
                f"{prompt_id!r}/{response[:32]!r}; the preference data was generated "
                "by a different policy than the one anchoring this run"
            )
        return self.log_probs[key]


class Policy(Protocol):
    """What the optimizer needs from a policy, and nothing more."""

    def log_prob(self, prompt_id: str, response: str) -> float: ...

    def parameters(self) -> FloatArray: ...

    def set_parameters(self, values: FloatArray) -> None: ...


@dataclass(frozen=True)
class DpoConfig:
    """Validated once, at construction."""

    beta: float
    learning_rate: float
    reference_checkpoint_id: str

    def __post_init__(self) -> None:
        if not 0.0 < self.beta <= 1.0:
            raise PreferenceError(
                f"beta must lie in (0, 1]; got {self.beta}. Beta is the statement of "
                "how far the proxy may be trusted, not a regularization detail"
            )
        if self.learning_rate <= 0.0:
            raise PreferenceError(f"learning rate must be positive, got {self.learning_rate}")


def validate_pairs(pairs: Sequence[PreferencePair]) -> None:
    """Guard clauses, so the interesting path is the training loop."""
    if not pairs:
        raise PreferenceError("no preference pairs")

    for pair in pairs:
        if pair.chosen == pair.rejected:
            raise DegeneratePair(
                f"{pair.prompt_id}: chosen and rejected are identical; the margin is "
                "zero by construction and the gradient is exactly nothing"
            )


def cohort_agreement(
    pairs: Sequence[PreferencePair], second_pass: Sequence[PreferencePair]
) -> float:
    """Agreement between two independent labellings of the same pairs.

    This number is the ceiling on the reward model, and a reward model
    reporting validation accuracy well above it has learned an
    artefact — length, most often — rather than quality.
    """
    if len(pairs) != len(second_pass):
        raise PreferenceError("labelling passes cover different pair counts")
    if not pairs:
        raise UninformativeAnnotations("no pairs to measure agreement over")

    agreed = sum(
        1 for first, second in zip(pairs, second_pass) if first.chosen == second.chosen
    )
    rate = agreed / len(pairs)

    if rate < MIN_ANNOTATOR_AGREEMENT:
        raise UninformativeAnnotations(
            f"cohort agreement {rate:.3f} is below {MIN_ANNOTATOR_AGREEMENT}; "
            "these labels are close to coin flips and the reward model will fit noise"
        )
    return rate


@dataclass
class KlBudget:
    """The stopping criterion, as an object rather than a step count.

    True quality peaks at a finite KL distance from the reference and
    declines after it, so "train to convergence" returns the wrong
    checkpoint by construction. This stops on measured distance and
    keeps the checkpoint from the best independent evaluation, not the
    last one.
    """

    max_kl: float
    best_score: float = -math.inf
    best_parameters: FloatArray | None = None
    best_kl: float = 0.0
    _stopped: bool = field(default=False, init=False)

    def observe(self, kl: float, score: float, parameters: FloatArray) -> bool:
        if kl < 0.0:
            raise ValueError(f"KL cannot be negative, got {kl}")

        if score > self.best_score:
            self.best_score = score
            self.best_parameters = parameters.copy()
            self.best_kl = kl

        if kl > self.max_kl:
            self._stopped = True
        return not self._stopped


@contextlib.contextmanager
def preference_training(policy: Policy, budget: KlBudget) -> Iterator[KlBudget]:
    """Restore the best checkpoint on the way out, always.

    A context manager rather than a restore call at the end, because
    the run will eventually raise — an evaluation times out, a batch is
    malformed — and a restore that depends on that not happening is a
    restore that will be skipped exactly when the run is salvageable.
    """
    try:
        yield budget
    finally:
        if budget.best_parameters is not None:
            policy.set_parameters(budget.best_parameters)


def implicit_reward(
    policy: Policy, reference: ReferencePolicy, pair_side: tuple[str, str], beta: float
) -> float:
    """beta * log(pi_theta / pi_ref) on one response.

    DPO's central identity. Absolute values are meaningless — the
    Bradley-Terry model identifies reward only up to a per-prompt shift
    — so this is only ever used inside a difference.
    """
    prompt_id, response = pair_side
    return beta * (policy.log_prob(prompt_id, response) - reference.log_prob(prompt_id, response))


def dpo_loss(
    policy: Policy,
    reference: ReferencePolicy,
    pairs: Sequence[PreferencePair],
    config: DpoConfig,
) -> float:
    """The pairwise logistic loss, computed stably.

    logaddexp rather than log(1 + exp(-margin)): the naive form
    overflows for the confidently-wrong pairs, which are precisely the
    ones carrying the whole gradient early in a run.
    """
    validate_pairs(pairs)
    if reference.checkpoint_id != config.reference_checkpoint_id:
        raise ReferenceMismatch(
            f"config anchors to {config.reference_checkpoint_id}, reference is "
            f"{reference.checkpoint_id}; beta specifies a different trust region "
            "against a different anchor"
        )

    margins = np.array(
        [
            implicit_reward(policy, reference, (pair.prompt_id, pair.chosen), config.beta)
            - implicit_reward(policy, reference, (pair.prompt_id, pair.rejected), config.beta)
            for pair in pairs
        ]
    )
    return float(np.mean(np.logaddexp(0.0, -margins)))


class LogProbReport(NamedTuple):
    mean_chosen: float
    mean_rejected: float
    margin: float
    both_falling: bool


def log_probability_report(
    policy: Policy, pairs: Sequence[PreferencePair], previous: LogProbReport | None = None
) -> LogProbReport:
    """Chosen and rejected log-probabilities, separately.

    The objective constrains only their difference, so it is satisfied
    equally well by raising the winner and by sinking the loser faster
    — and in practice it sinks the loser, moving probability mass to
    sequences nobody labelled. The loss curve cannot show this. These
    two numbers can, and nothing else will.
    """
    chosen = np.array([policy.log_prob(p.prompt_id, p.chosen) for p in pairs])
    rejected = np.array([policy.log_prob(p.prompt_id, p.rejected) for p in pairs])

    mean_chosen = float(chosen.mean())
    mean_rejected = float(rejected.mean())
    both_falling = (
        previous is not None
        and mean_chosen < previous.mean_chosen
        and mean_rejected < previous.mean_rejected
    )
    return LogProbReport(
        mean_chosen=mean_chosen,
        mean_rejected=mean_rejected,
        margin=mean_chosen - mean_rejected,
        both_falling=both_falling,
    )


def length_controlled_win_rate(
    wins: Sequence[bool], policy_tokens: Sequence[int], reference_tokens: Sequence[int]
) -> dict[str, float]:
    """A win rate with the length effect regressed out.

    Annotators prefer longer answers, reward models learn that
    faithfully, and policies exploit it within a few hundred steps. A
    raw win rate is therefore measuring verbosity as much as quality,
    which makes it evidence of very little on its own.

    The residual below is not a causal correction and is not offered as
    one; it is the minimum honest presentation — raw and adjusted side
    by side, with the length gap stated so a reader can judge.
    """
    if not (len(wins) == len(policy_tokens) == len(reference_tokens)):
        raise ValueError("win, policy-length and reference-length counts differ")
    if not wins:
        raise ValueError("no comparisons")

    outcomes = np.asarray(wins, dtype=np.float64)
    length_gap = np.asarray(policy_tokens, dtype=np.float64) - np.asarray(
        reference_tokens, dtype=np.float64
    )

    design = np.column_stack([np.ones_like(length_gap), length_gap])
    coefficients, *_ = np.linalg.lstsq(design, outcomes, rcond=None)

    return {
        "raw_win_rate": float(outcomes.mean()),
        "length_adjusted_win_rate": float(coefficients[0]),
        "mean_length_gap_tokens": float(length_gap.mean()),
        "slope_per_token": float(coefficients[1]),
    }
`,
        profile:
          'Same arithmetic as the literal version — one implicit-reward difference per pair, a logistic loss over the batch — with the per-pair Python loop replaced by array operations for the reductions. Illustrative, not a measured benchmark: the substantive change is that a mismatched reference, an annotator cohort at chance, a degenerate pair and a run trained past its KL budget are now failures the caller must handle, and the best checkpoint is restored on the exception path rather than lost with the run.',
      },
      'make-it-fast': {
        rationale:
          'The largest win in this technique is structural rather than numerical, and it comes from noticing that the reference policy is frozen: its log-probabilities depend on nothing being trained, so they can be computed once over the whole dataset and cached, which removes an entire model from the training loop and halves both the resident memory and the forward work per step. Everything else follows from shaping the remaining work as arrays. Chosen and rejected responses are packed into a single padded batch and scored in one forward pass rather than two, since they differ only in which rows they occupy; the per-token log-probability gather becomes one take_along_axis over a padded (batch, time) block with a mask, eliminating the Python loop over sequences that dominated the previous stage; and the sequence sums, the implicit-reward difference and the logistic loss are fused into one pass over the token block so the per-token intermediates are never materialized. Token ids are int32 and every float buffer is float32 and C-contiguous, which is what keeps the gather and the reductions on a single kernel rather than silently upcasting mid-expression. Scratch is allocated once at the maximum batch-by-sequence shape and sliced, so a training loop performs no per-step allocation — and because the reference cache is keyed by reference checkpoint, a changed anchor invalidates it rather than silently reusing the wrong numbers.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The per-sequence log-probability gather becomes one take_along_axis over a padded token block with a validity mask',
            tradeoff: 'Padding to the longest sequence in the batch wastes work proportional to the length spread, so batches must be length-bucketed or the saving erodes',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Chosen and rejected responses are scored in one forward pass rather than two, since they differ only in which rows of the batch they occupy',
            tradeoff: 'Peak activation memory doubles per step, which is usually what limits batch size in preference training in the first place',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Sequence sums, the implicit-reward difference and the logistic loss collapse into one pass, so the per-token arrays never land',
            tradeoff: 'The fused form hides the per-token quantities, and per-token log-probabilities are exactly what you want when diagnosing a run that has gone wrong',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The token block, mask and gather scratch are sized once at the maximum batch-by-sequence shape, so a training step allocates nothing',
            tradeoff: 'Buffers stay at peak shape for the process lifetime and are not reentrant, so a worker cannot share them across threads',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'int32 ids and float32 log-probabilities in C-contiguous blocks keep the gather and the reductions on one kernel instead of upcasting mid-expression',
            tradeoff: 'float32 accumulation over long sequences loses precision in the sequence sum, so the running total is the one place that must stay float64',
          },
        ],
        code: `"""Preference optimization, shaped around one observation.

The reference policy is frozen. Its log-probabilities depend on nothing
being trained, so they can be computed once for the whole dataset and
cached -- which removes an entire model from the training loop, halves
resident memory, and halves the forward work per step. That is the
largest win available here and it is structural rather than numerical.

Everything else is array shaping: chosen and rejected scored in one
padded batch, the per-token gather vectorized, and the sums fused into
the loss so no per-token intermediate lands.

What none of this changes: the peak of true quality still sits at a
finite KL distance, so a faster run reaches the wrong checkpoint sooner
unless the budget from the previous stage travels with it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float32]
IdArray = npt.NDArray[np.int32]


@dataclass(frozen=True)
class BatchShape:
    max_pairs: int
    max_tokens: int


class ReferenceCache:
    """Reference sequence log-probabilities, computed once.

    Keyed by the reference checkpoint id, so changing the anchor
    invalidates the cache instead of silently reusing numbers from a
    different geometry -- which would leave beta specifying a trust
    region around a policy no longer in the run.

    The values are float64 on purpose. They are summed over sequences
    that can run to thousands of tokens, and this is the one place where
    float32 accumulation loses enough precision to move a margin.
    """

    def __init__(self, reference_checkpoint_id: str) -> None:
        self.reference_checkpoint_id = reference_checkpoint_id
        self._chosen: npt.NDArray[np.float64] | None = None
        self._rejected: npt.NDArray[np.float64] | None = None

    def populate(
        self, chosen_logprobs: npt.NDArray[np.float64], rejected_logprobs: npt.NDArray[np.float64]
    ) -> None:
        if chosen_logprobs.shape != rejected_logprobs.shape:
            raise ValueError("chosen and rejected caches must cover the same pairs")
        self._chosen = np.ascontiguousarray(chosen_logprobs)
        self._rejected = np.ascontiguousarray(rejected_logprobs)

    def lookup(self, indices: IdArray) -> tuple[npt.NDArray[np.float64], npt.NDArray[np.float64]]:
        if self._chosen is None or self._rejected is None:
            raise RuntimeError(
                "reference cache empty; run the offline pass before training or the "
                "reference model has to stay resident for the whole run"
            )
        return self._chosen[indices], self._rejected[indices]


class PreferenceScratch:
    """Every buffer a step needs, allocated once at peak shape.

    A training loop that allocates per step spends a measurable share of
    a cheap stage inside the allocator, and both shapes are known from
    the batch configuration before the first step runs.
    """

    def __init__(self, shape: BatchShape) -> None:
        self.shape = shape
        rows = 2 * shape.max_pairs  # chosen and rejected in one batch

        self.token_ids = np.zeros((rows, shape.max_tokens), dtype=np.int32)
        self.mask = np.zeros((rows, shape.max_tokens), dtype=np.float32)
        self.gathered = np.zeros((rows, shape.max_tokens), dtype=np.float32)
        self.sequence_logprob = np.zeros(rows, dtype=np.float64)

    def pack(self, sequences: list[IdArray]) -> int:
        """Length-bucketed padding into the preallocated block.

        Padding to the longest sequence in the batch wastes work in
        proportion to the length spread, which is why callers bucket by
        length before packing. Unbucketed batches are where this layout
        quietly gives back most of what it gained.
        """
        rows = len(sequences)
        if rows > self.token_ids.shape[0]:
            raise ValueError(f"batch of {rows} exceeds scratch rows {self.token_ids.shape[0]}")

        longest = max(len(sequence) for sequence in sequences)
        if longest > self.shape.max_tokens:
            raise ValueError(f"sequence of {longest} tokens exceeds {self.shape.max_tokens}")

        self.token_ids[:rows, :longest] = 0
        self.mask[:rows, :longest] = 0.0
        for row, sequence in enumerate(sequences):
            length = len(sequence)
            self.token_ids[row, :length] = sequence
            self.mask[row, :length] = 1.0
        return longest


def sequence_log_probs(
    token_log_probs: FloatArray, token_ids: IdArray, mask: FloatArray, out: npt.NDArray[np.float64]
) -> npt.NDArray[np.float64]:
    """Per-sequence log-probability, without a loop over sequences.

    token_log_probs is (rows, time, vocab) log-softmax output. One
    take_along_axis pulls the realized token's log-probability at every
    position, the mask zeroes the padding, and the sum runs along time.
    The previous stage did this one sequence at a time in Python, which
    dominated its step cost entirely.
    """
    gathered = np.take_along_axis(token_log_probs, token_ids[:, :, None], axis=2)[..., 0]
    np.multiply(gathered, mask, out=gathered)
    # float64 accumulation: the sum runs over thousands of tokens and
    # float32 error here is large enough to move a margin.
    np.sum(gathered, axis=1, dtype=np.float64, out=out)
    return out


def fused_dpo_loss_and_margin(
    policy_chosen: npt.NDArray[np.float64],
    policy_rejected: npt.NDArray[np.float64],
    reference_chosen: npt.NDArray[np.float64],
    reference_rejected: npt.NDArray[np.float64],
    beta: float,
) -> tuple[float, npt.NDArray[np.float64], dict[str, float]]:
    """Implicit rewards, margin and loss in one pass.

    The intermediate implicit rewards are never materialized separately:
    the difference of differences collapses algebraically, which is both
    fewer temporaries and fewer chances for a sign to go astray.

        margin = beta * [(pi_c - ref_c) - (pi_r - ref_r)]

    logaddexp rather than log(1 + exp(-margin)) because the naive form
    overflows on exactly the confidently-wrong pairs that carry the
    gradient early in a run.
    """
    margin = beta * ((policy_chosen - reference_chosen) - (policy_rejected - reference_rejected))
    loss = float(np.mean(np.logaddexp(0.0, -margin)))

    # The diagnostics that matter, computed from arrays already in hand
    # rather than from a second pass: the objective constrains only the
    # difference, so both log-probabilities falling together satisfies
    # it while draining mass to unlabelled sequences.
    diagnostics = {
        "mean_chosen_logprob": float(policy_chosen.mean()),
        "mean_rejected_logprob": float(policy_rejected.mean()),
        "mean_margin": float(margin.mean()),
        "accuracy": float((margin > 0.0).mean()),
    }
    return loss, margin, diagnostics


def sequence_kl_estimate(
    policy_logprob: npt.NDArray[np.float64], reference_logprob: npt.NDArray[np.float64]
) -> float:
    """A low-variance KL estimate from the log-ratios already computed.

        k3 = exp(-d) - 1 + d,   d = log pi_ref - log pi_theta

    Always non-negative, unbiased, and far less noisy than the naive
    mean of -d, which is negative roughly half the time on small
    batches and makes the one plot that matters unreadable.

    It costs nothing here because both terms are already in hand -- and
    KL from the reference is the axis every failure in this technique
    moves along, so it should be on every step.
    """
    log_ratio = reference_logprob - policy_logprob
    return float(np.mean(np.expm1(log_ratio) - log_ratio))


def bucket_by_length(lengths: npt.NDArray[np.int32], batch_size: int) -> list[IdArray]:
    """Group pairs of similar length before packing.

    Padding cost is the spread within a batch, not the mean length, so
    sorting first turns a mostly-padding block into a mostly-tokens one.
    The cost is that batch composition is no longer random, which
    correlates gradient noise across steps in a way a shuffled loader
    avoids -- shuffle the buckets, not the rows inside them.
    """
    order = np.argsort(lengths, kind="stable").astype(np.int32)
    return [order[start : start + batch_size] for start in range(0, len(order), batch_size)]


def overoptimization_sweep(
    proxy_reward: FloatArray, true_reward: FloatArray, kl: FloatArray
) -> dict[str, float]:
    """Where the curve turned, from logged checkpoints.

    Cheap, and the single most useful summary of a preference run: the
    proxy is monotone in KL while the truth is not, so the argmax of the
    true reward names the checkpoint to ship and the final step names
    the one that would have been shipped by default.
    """
    if not (proxy_reward.shape == true_reward.shape == kl.shape):
        raise ValueError("reward and KL series must cover the same checkpoints")
    if proxy_reward.size == 0:
        raise ValueError("no checkpoints logged")

    peak = int(np.argmax(true_reward))
    return {
        "peak_checkpoint": peak,
        "peak_kl": float(kl[peak]),
        "peak_true_reward": float(true_reward[peak]),
        "final_true_reward": float(true_reward[-1]),
        "final_proxy_reward": float(proxy_reward[-1]),
        "true_reward_lost_by_training_on": float(true_reward[peak] - true_reward[-1]),
    }
`,
        profile:
          'Per step: one forward pass over 2·pairs padded sequences instead of two passes of pairs each, one take_along_axis over a (rows, time) block, and O(rows) reductions — with the reference model absent from the loop entirely once its log-probabilities are cached. Illustrative, not a measured benchmark: the useful shape is that the cache removes a whole model rather than a constant factor, and that padding waste scales with the length spread inside a batch, which is why bucketing matters more here than any change to the reductions.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// RLHF and DPO, transcribed from the objective.
//
// No library, and a deliberately tiny world: a few prompts with a few
// candidate responses each, so every quantity in the theory can be
// computed exactly rather than estimated.
//
//     RLHF:  max_pi  E[r(x, y)] - beta * KL(pi || pi_ref)
//     optimum:  pi*(y|x)  proportional to  pi_ref(y|x) * exp(r/beta)
//     DPO:   -log sigmoid( beta*log(pi/pi_ref)[w] - beta*log(pi/pi_ref)[l] )
//
// Claim 1: the closed form IS the optimum. TiltedPolicy() computes it
// directly; DpoTrain() reaches the same place by gradient descent on a
// classification loss that never mentions reinforcement learning.
//
// Claim 2: reward is identified only up to a per-prompt shift.
// BradleyTerryLogLikelihood() is invariant to adding a constant to
// every response of a prompt, so absolute reward values carry no
// information at all.
//
// Claim 3: reward hacking is not a bug. OveroptimizationCurve() fits a
// reward model to limited noisy comparisons, sweeps beta, and reports
// true reward against KL. It rises, peaks and falls while the proxy
// rises throughout.

#include <cmath>
#include <cstddef>
#include <limits>
#include <random>
#include <vector>

namespace preference {

using Distribution = std::vector<double>;

Distribution Softmax(const std::vector<double>& logits) {
  double largest = -std::numeric_limits<double>::infinity();
  for (double value : logits) {
    largest = std::max(largest, value);
  }

  Distribution result(logits.size());
  double total = 0.0;
  for (std::size_t index = 0; index < logits.size(); ++index) {
    result[index] = std::exp(logits[index] - largest);
    total += result[index];
  }
  for (double& value : result) {
    value /= total;
  }
  return result;
}

// log(1 + exp(x)), without overflowing for large x.
//
// Not fastidiousness: the confidently-wrong pairs are exactly the ones
// carrying the gradient early in a run, and they are exactly the ones
// the naive form loses.
double LogOnePlusExp(double value) {
  if (value > 0.0) {
    return value + std::log1p(std::exp(-value));
  }
  return std::log1p(std::exp(value));
}

double Sigmoid(double value) {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double exponential = std::exp(value);
  return exponential / (1.0 + exponential);
}

// KL(policy || reference), the term that anchors the whole method.
//
// Asymmetric on purpose, and in the direction that matters: infinite
// where the policy places mass the reference does not, so it forbids
// inventing behaviour rather than merely discouraging it.
double KlDivergence(const Distribution& policy, const Distribution& reference) {
  double total = 0.0;
  for (std::size_t index = 0; index < policy.size(); ++index) {
    if (policy[index] <= 0.0) {
      continue;
    }
    if (reference[index] <= 0.0) {
      return std::numeric_limits<double>::infinity();
    }
    total += policy[index] * std::log(policy[index] / reference[index]);
  }
  return total;
}

// The closed-form optimum of the KL-constrained problem.
//
//     pi*(y|x)  proportional to  pi_ref(y|x) * exp(r(x, y) / beta)
//
// Worth staring at, because DPO is this identity read backwards: solve
// for r and you get beta * log(pi*/pi_ref) plus a term constant in y --
// the implicit reward, and the reason that constant cancels inside a
// difference.
//
// Beta's role is visible here too. Large beta flattens the exponent and
// the optimum stays near the reference; small beta puts everything on
// the highest-reward response. Beta is the statement of how far the
// proxy is trusted, not a regularization detail.
Distribution TiltedPolicy(const Distribution& reference, const std::vector<double>& rewards,
                          double beta) {
  Distribution tilted(reference.size());
  double total = 0.0;
  for (std::size_t index = 0; index < reference.size(); ++index) {
    tilted[index] = reference[index] * std::exp(rewards[index] / beta);
    total += tilted[index];
  }
  for (double& value : tilted) {
    value /= total;
  }
  return tilted;
}

struct PreferencePair {
  std::size_t prompt;
  std::size_t winner;
  std::size_t loser;
};

using RewardTable = std::vector<std::vector<double>>;

// The likelihood a reward model is fitted to.
//
//     P(w beats l) = sigmoid(r(w) - r(l))
//
// Only the DIFFERENCE appears. Add a constant to every response of one
// prompt and this does not move -- the formal statement that reward is
// identified up to a per-prompt shift, and the reason a dashboard
// comparing mean reward across prompts is displaying an arbitrary
// offset.
double BradleyTerryLogLikelihood(const RewardTable& rewards,
                                 const std::vector<PreferencePair>& pairs) {
  double total = 0.0;
  for (const PreferencePair& pair : pairs) {
    const double margin =
        rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser];
    total += -LogOnePlusExp(-margin);
  }
  return total / static_cast<double>(pairs.size());
}

// Ordinary supervised learning on pairwise labels.
//
// Tabular, so there is no function approximation to hide behind: one
// number per (prompt, response), and the only signal is which of two
// was preferred. What it knows about a response it never saw is
// nothing, which is exactly why optimizing against it out of
// distribution is unsafe.
RewardTable FitRewardModel(std::size_t n_prompts, std::size_t n_responses,
                           const std::vector<PreferencePair>& pairs, std::size_t steps,
                           double learning_rate) {
  RewardTable rewards(n_prompts, std::vector<double>(n_responses, 0.0));

  for (std::size_t step = 0; step < steps; ++step) {
    RewardTable gradients(n_prompts, std::vector<double>(n_responses, 0.0));

    for (const PreferencePair& pair : pairs) {
      const double margin =
          rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser];
      // sigmoid(-margin): large when the pair is ordered wrongly, near
      // zero once it is confidently right. An automatic curriculum that
      // costs nothing.
      const double weight = Sigmoid(-margin);
      gradients[pair.prompt][pair.winner] += weight;
      gradients[pair.prompt][pair.loser] -= weight;
    }

    const double step_scale = learning_rate / static_cast<double>(pairs.size());
    for (std::size_t prompt = 0; prompt < n_prompts; ++prompt) {
      for (std::size_t response = 0; response < n_responses; ++response) {
        rewards[prompt][response] += step_scale * gradients[prompt][response];
      }
    }
  }
  return rewards;
}

struct DpoStep {
  double loss;
  std::vector<std::vector<double>> gradients;
};

// The DPO objective, computed rather than described.
//
// The implicit reward is beta * log(pi_theta / pi_ref) and the loss is
// a logistic loss on the difference between the winner's and the
// loser's. No reward model appears; no response is ever sampled.
DpoStep DpoLossAndGradient(const std::vector<std::vector<double>>& logits,
                           const std::vector<Distribution>& reference,
                           const std::vector<PreferencePair>& pairs, double beta) {
  std::vector<Distribution> policies;
  policies.reserve(logits.size());
  for (const std::vector<double>& row : logits) {
    policies.push_back(Softmax(row));
  }

  DpoStep step{0.0, std::vector<std::vector<double>>(
                        logits.size(), std::vector<double>(logits[0].size(), 0.0))};

  for (const PreferencePair& pair : pairs) {
    const Distribution& policy = policies[pair.prompt];
    const Distribution& base = reference[pair.prompt];

    const double implicit_winner = beta * std::log(policy[pair.winner] / base[pair.winner]);
    const double implicit_loser = beta * std::log(policy[pair.loser] / base[pair.loser]);
    const double margin = implicit_winner - implicit_loser;

    step.loss += LogOnePlusExp(-margin);
    const double weight = Sigmoid(-margin);

    // d/dlogit_j of log pi(y) is [j == y] - pi(j). So the update is the
    // ordinary likelihood gradient of the winner MINUS that of the
    // loser, and nothing in it cares which of the two moves -- only
    // that they separate. That indifference is the source of the
    // likelihood-displacement pathology: sinking the loser satisfies
    // the objective exactly as well as raising the winner, and
    // empirically it is what happens.
    for (std::size_t response = 0; response < policy.size(); ++response) {
      const double winner_term =
          (response == pair.winner ? 1.0 : 0.0) - policy[response];
      const double loser_term = (response == pair.loser ? 1.0 : 0.0) - policy[response];
      step.gradients[pair.prompt][response] -= beta * weight * (winner_term - loser_term);
    }
  }

  const double count = static_cast<double>(pairs.size());
  step.loss /= count;
  for (std::vector<double>& row : step.gradients) {
    for (double& value : row) {
      value /= count;
    }
  }
  return step;
}

// Gradient descent on a classification loss, arriving at an RL optimum.
//
// The policy is initialized AT the reference, which is what the theory
// assumes and what production does: every log-ratio starts at zero, so
// the implicit reward starts at zero everywhere and the first update is
// driven entirely by the labels.
std::vector<Distribution> DpoTrain(const std::vector<Distribution>& reference,
                                   const std::vector<PreferencePair>& pairs, double beta,
                                   std::size_t steps, double learning_rate,
                                   std::vector<double>* history) {
  std::vector<std::vector<double>> logits;
  logits.reserve(reference.size());
  for (const Distribution& row : reference) {
    std::vector<double> initial(row.size());
    for (std::size_t index = 0; index < row.size(); ++index) {
      initial[index] = std::log(std::max(row[index], 1e-12));
    }
    logits.push_back(std::move(initial));
  }

  for (std::size_t step = 0; step < steps; ++step) {
    const DpoStep result = DpoLossAndGradient(logits, reference, pairs, beta);
    for (std::size_t prompt = 0; prompt < logits.size(); ++prompt) {
      for (std::size_t response = 0; response < logits[prompt].size(); ++response) {
        logits[prompt][response] -= learning_rate * result.gradients[prompt][response];
      }
    }
    if (history != nullptr) {
      history->push_back(result.loss);
    }
  }

  std::vector<Distribution> policies;
  policies.reserve(logits.size());
  for (const std::vector<double>& row : logits) {
    policies.push_back(Softmax(row));
  }
  return policies;
}

struct LogProbReport {
  double mean_chosen;
  double mean_rejected;
  double margin;
};

// Chosen and rejected log-probabilities, separately.
//
// The loss cannot distinguish "the winner went up" from "the loser went
// down twice as far", and the second is the reported failure. These two
// numbers are the only view that shows it, and they are the cheapest
// diagnostic in this entry.
LogProbReport LogProbabilityReport(const std::vector<Distribution>& policy,
                                   const std::vector<PreferencePair>& pairs) {
  double chosen = 0.0;
  double rejected = 0.0;
  for (const PreferencePair& pair : pairs) {
    chosen += std::log(std::max(policy[pair.prompt][pair.winner], 1e-12));
    rejected += std::log(std::max(policy[pair.prompt][pair.loser], 1e-12));
  }
  const double count = static_cast<double>(pairs.size());
  return LogProbReport{chosen / count, rejected / count, (chosen - rejected) / count};
}

// Noisy annotators, sampled from Bradley-Terry.
//
// Labels come from sigmoid(r_a - r_b) rather than argmax, because that
// is what the model assumes and what people actually do: disagree at a
// rate set by how close the options are. Agreement on genuinely close
// pairs is near chance, and no reward model can exceed that.
std::vector<PreferencePair> SamplePreferences(const RewardTable& true_rewards,
                                              std::size_t n_pairs, unsigned seed) {
  std::mt19937 generator(seed);
  std::uniform_real_distribution<double> uniform(0.0, 1.0);

  std::vector<PreferencePair> pairs;
  pairs.reserve(n_pairs);

  for (std::size_t index = 0; index < n_pairs; ++index) {
    std::uniform_int_distribution<std::size_t> prompt_choice(0, true_rewards.size() - 1);
    const std::size_t prompt = prompt_choice(generator);

    std::uniform_int_distribution<std::size_t> response_choice(
        0, true_rewards[prompt].size() - 1);
    std::size_t first = response_choice(generator);
    std::size_t second = response_choice(generator);
    while (second == first) {
      second = response_choice(generator);
    }

    const double gap = true_rewards[prompt][first] - true_rewards[prompt][second];
    if (uniform(generator) < Sigmoid(gap)) {
      pairs.push_back(PreferencePair{prompt, first, second});
    } else {
      pairs.push_back(PreferencePair{prompt, second, first});
    }
  }
  return pairs;
}

struct CurvePoint {
  double beta;
  double kl_from_reference;
  double proxy_reward;
  double true_reward;
};

// Goodhart's law, plotted.
//
// A true reward exists and is never shown to the fitting procedure. A
// reward model is fitted to a limited, noisy sample from it, the policy
// is tilted against the LEARNED reward at a sweep of beta, and both
// rewards are measured under the result.
//
// What comes back: proxy reward rises monotonically as beta falls,
// true reward rises, peaks, and declines. The peak is at a finite KL
// distance, so there is no "train until converged" here -- the stopping
// point is a measurement from an evaluation the optimizer never saw.
std::vector<CurvePoint> OveroptimizationCurve(std::size_t n_prompts, std::size_t n_responses,
                                              std::size_t n_pairs, unsigned seed) {
  std::mt19937 generator(seed);
  std::normal_distribution<double> normal(0.0, 1.0);
  std::normal_distribution<double> small(0.0, 0.5);

  RewardTable true_rewards(n_prompts, std::vector<double>(n_responses));
  std::vector<Distribution> reference;
  reference.reserve(n_prompts);

  for (std::size_t prompt = 0; prompt < n_prompts; ++prompt) {
    for (std::size_t response = 0; response < n_responses; ++response) {
      true_rewards[prompt][response] = normal(generator);
    }
    std::vector<double> logits(n_responses);
    for (double& value : logits) {
      value = small(generator);
    }
    reference.push_back(Softmax(logits));
  }

  const std::vector<PreferencePair> pairs =
      SamplePreferences(true_rewards, n_pairs, seed + 1);
  const RewardTable learned =
      FitRewardModel(n_prompts, n_responses, pairs, 600, 2.0);

  std::vector<CurvePoint> curve;
  for (double beta : {2.0, 1.0, 0.5, 0.25, 0.125, 0.0625, 0.03125}) {
    double proxy_total = 0.0;
    double true_total = 0.0;
    double kl_total = 0.0;

    for (std::size_t prompt = 0; prompt < n_prompts; ++prompt) {
      const Distribution policy = TiltedPolicy(reference[prompt], learned[prompt], beta);
      kl_total += KlDivergence(policy, reference[prompt]);
      for (std::size_t response = 0; response < n_responses; ++response) {
        proxy_total += policy[response] * learned[prompt][response];
        true_total += policy[response] * true_rewards[prompt][response];
      }
    }

    const double scale = static_cast<double>(n_prompts);
    curve.push_back(
        CurvePoint{beta, kl_total / scale, proxy_total / scale, true_total / scale});
  }
  return curve;
}

}  // namespace preference
`,
        profile:
          'Reward-model fitting is O(steps · pairs) with an O(prompts · responses) gradient table rebuilt per step; DPO training is O(steps · pairs · responses) because the softmax gradient touches every response of the pair\'s prompt; the closed-form tilt is one O(responses) pass per prompt. Illustrative, not a measured benchmark: the shape to notice is that the closed form and the gradient descent reach the same policy, so in the tabular case the entire reinforcement-learning apparatus is replaceable by one exponential — which is the identity DPO exploits at scale, where that closed form is unreachable.',
      },
      'make-it-right': {
        rationale:
          'Everything the literal version accepted silently is rejected before any allocation happens: a beta outside the range where the objective is meaningful, a pair whose two responses are identical and whose margin is therefore zero by construction, an annotator cohort agreeing at chance whose labels carry no signal, and a reference distribution placing zero mass where the policy is asked to place some, which makes the KL infinite rather than large. The reference policy stops being a parameter passed alongside the data and becomes an owned, fingerprinted object, because beta is defined relative to a specific anchor — the same beta against a different reference is a different trust region, and a KL budget tuned against one does not transfer. The pair type carries its annotator cohort, so the ceiling that cohort imposes travels with the data rather than living in a document nobody reads. The stopping criterion becomes a KlBudget object rather than a step count, because true quality peaks at a finite KL distance and training to convergence returns the wrong checkpoint by construction; the budget records the best checkpoint by an independent score and an RAII guard restores it on the way out of the training scope, on the throwing path as well as the ordinary one. Non-owning spans replace copies everywhere the data is only read, and const-correctness marks which of these objects the training loop is allowed to move.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'RAII for every owned resource',
          'std::span for non-owning views',
          'const-correctness on parameters and members',
          'Rule of zero — let the compiler generate special members',
        ],
        code: `// Preference optimization with the silent failures made loud.
//
// The literal version accepted all of these without complaint:
//
//   * a beta tuned against one reference policy applied to another,
//     where it specifies an entirely different trust region;
//   * an annotator cohort agreeing at chance, whose labels carry no
//     signal and whose reward model still reports a number;
//   * training to convergence, which by construction returns a
//     checkpoint past the point where true quality turned over.
//
// Each becomes a thrown type, a budget or a guard. Beyond defence, the
// diagnostics that separate this working from this appearing to work
// are functions here: log-probabilities reported separately, and a
// length-controlled win rate.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace preference {

// Below this pairwise agreement the cohort is indistinguishable from
// coin flipping, and a reward model fitted to it fits noise.
inline constexpr double kMinAnnotatorAgreement = 0.55;

class PreferenceError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

class DegeneratePair : public PreferenceError {
 public:
  using PreferenceError::PreferenceError;
};

class UninformativeAnnotations : public PreferenceError {
 public:
  using PreferenceError::PreferenceError;
};

// Beta is defined relative to a specific reference, so this is not
// bookkeeping: the same beta against a different anchor is a different
// objective with a different trust region.
class ReferenceMismatch : public PreferenceError {
 public:
  using PreferenceError::PreferenceError;
};

// Rule of zero: a value type, no special members written.
//
// The cohort travels with the pair because its agreement rate is the
// ceiling on the reward model and on everything downstream. Left in a
// document, that ceiling is forgotten by the second week.
struct PreferencePair {
  std::string prompt_id;
  std::string chosen;
  std::string rejected;
  std::string cohort;
  std::size_t chosen_tokens{};
  std::size_t rejected_tokens{};
};

// Validated at construction, before anything is allocated.
class DpoConfig {
 public:
  DpoConfig(double beta, double learning_rate, std::string reference_checkpoint_id)
      : beta_(beta),
        learning_rate_(learning_rate),
        reference_checkpoint_id_(std::move(reference_checkpoint_id)) {
    if (!(beta_ > 0.0) || beta_ > 1.0) {
      throw PreferenceError(
          "beta must lie in (0, 1]; it is the statement of how far the proxy may be "
          "trusted, not a regularization detail");
    }
    if (!(learning_rate_ > 0.0)) {
      throw PreferenceError("learning rate must be positive");
    }
    if (reference_checkpoint_id_.empty()) {
      throw ReferenceMismatch("a KL-constrained objective without a named reference "
                              "does not specify anything");
    }
  }

  double beta() const noexcept { return beta_; }
  double learning_rate() const noexcept { return learning_rate_; }
  const std::string& reference_checkpoint_id() const noexcept {
    return reference_checkpoint_id_;
  }

 private:
  double beta_;
  double learning_rate_;
  std::string reference_checkpoint_id_;
};

// The frozen anchor, pinned by identity rather than by value.
//
// Two checkpoints scoring identically still define different KL
// geometries, so an anchor is a specific checkpoint and never "a model
// that behaves the same".
class ReferencePolicy {
 public:
  ReferencePolicy(std::string checkpoint_id, std::vector<double> log_probs)
      : checkpoint_id_(std::move(checkpoint_id)), log_probs_(std::move(log_probs)) {
    if (log_probs_.empty()) {
      throw ReferenceMismatch("reference policy carries no log-probabilities");
    }
    const bool any_zero_mass =
        std::any_of(log_probs_.begin(), log_probs_.end(),
                    [](double value) { return !std::isfinite(value); });
    if (any_zero_mass) {
      throw ReferenceMismatch(
          "reference assigns zero mass to a scored response; KL is infinite there, so "
          "the objective forbids rather than discourages it");
    }
  }

  const std::string& checkpoint_id() const noexcept { return checkpoint_id_; }

  double LogProb(std::size_t index) const {
    if (index >= log_probs_.size()) {
      throw ReferenceMismatch(
          "the preference data references a response the anchor never scored; it was "
          "generated by a different policy than the one anchoring this run");
    }
    return log_probs_[index];
  }

 private:
  std::string checkpoint_id_;
  std::vector<double> log_probs_;
};

void ValidatePairs(std::span<const PreferencePair> pairs) {
  if (pairs.empty()) {
    throw PreferenceError("no preference pairs");
  }
  for (const PreferencePair& pair : pairs) {
    if (pair.chosen == pair.rejected) {
      throw DegeneratePair(pair.prompt_id +
                           ": chosen and rejected are identical; the margin is zero by "
                           "construction and the gradient is exactly nothing");
    }
  }
}

// Agreement between two independent labellings of the same pairs.
//
// This number is the ceiling on the reward model. A reward model
// reporting validation accuracy well above it has learned an artefact
// -- length, most often -- rather than quality.
double CohortAgreement(std::span<const PreferencePair> first,
                       std::span<const PreferencePair> second) {
  if (first.size() != second.size()) {
    throw PreferenceError("labelling passes cover different pair counts");
  }
  if (first.empty()) {
    throw UninformativeAnnotations("no pairs to measure agreement over");
  }

  std::size_t agreed = 0;
  for (std::size_t index = 0; index < first.size(); ++index) {
    if (first[index].chosen == second[index].chosen) {
      ++agreed;
    }
  }

  const double rate = static_cast<double>(agreed) / static_cast<double>(first.size());
  if (rate < kMinAnnotatorAgreement) {
    throw UninformativeAnnotations(
        "cohort agreement is near chance; these labels are close to coin flips and the "
        "reward model will fit noise");
  }
  return rate;
}

// The stopping criterion, as an object rather than a step count.
//
// True quality peaks at a finite KL distance and declines after it, so
// "train to convergence" returns the wrong checkpoint by construction.
// This stops on measured distance and keeps the checkpoint from the
// best INDEPENDENT evaluation -- not the best proxy reward, which rises
// monotonically and would select the worst model available.
class KlBudget {
 public:
  explicit KlBudget(double max_kl) : max_kl_(max_kl) {
    if (!(max_kl_ > 0.0)) {
      throw PreferenceError("KL budget must be positive");
    }
  }

  bool Observe(double kl, double independent_score, std::span<const double> parameters) {
    if (kl < 0.0) {
      throw std::invalid_argument("KL cannot be negative");
    }

    if (independent_score > best_score_) {
      best_score_ = independent_score;
      best_kl_ = kl;
      best_parameters_.assign(parameters.begin(), parameters.end());
    }
    if (kl > max_kl_) {
      stopped_ = true;
    }
    return !stopped_;
  }

  std::span<const double> best_parameters() const noexcept { return best_parameters_; }
  double best_kl() const noexcept { return best_kl_; }
  double best_score() const noexcept { return best_score_; }

 private:
  double max_kl_;
  double best_score_ = -std::numeric_limits<double>::infinity();
  double best_kl_ = 0.0;
  std::vector<double> best_parameters_;
  bool stopped_ = false;
};

// Restore the best checkpoint on the way out, always.
//
// A guard rather than a restore call at the end of the loop, because
// the run will eventually throw -- an evaluation times out, a batch is
// malformed -- and a restore depending on that not happening is one
// that will be skipped exactly when the run is still salvageable.
class BestCheckpointGuard {
 public:
  BestCheckpointGuard(const KlBudget& budget, std::span<double> parameters)
      : budget_(budget), parameters_(parameters) {}

  ~BestCheckpointGuard() {
    const std::span<const double> best = budget_.best_parameters();
    if (!best.empty() && best.size() == parameters_.size()) {
      std::copy(best.begin(), best.end(), parameters_.begin());
    }
  }

  BestCheckpointGuard(const BestCheckpointGuard&) = delete;
  BestCheckpointGuard& operator=(const BestCheckpointGuard&) = delete;

 private:
  const KlBudget& budget_;
  std::span<double> parameters_;
};

double LogOnePlusExp(double value) {
  return value > 0.0 ? value + std::log1p(std::exp(-value)) : std::log1p(std::exp(value));
}

// The pairwise logistic loss over precomputed sequence log-probabilities.
//
// Everything arrives as a span: this function reads and owns nothing,
// which is what lets the caller decide whether the reference values
// came from a resident model or from an offline cache.
double DpoLoss(std::span<const double> policy_chosen, std::span<const double> policy_rejected,
               std::span<const double> reference_chosen,
               std::span<const double> reference_rejected, const DpoConfig& config,
               const ReferencePolicy& reference) {
  if (reference.checkpoint_id() != config.reference_checkpoint_id()) {
    throw ReferenceMismatch("config anchors to " + config.reference_checkpoint_id() +
                            ", reference is " + reference.checkpoint_id() +
                            "; beta specifies a different trust region against a "
                            "different anchor");
  }
  const std::size_t count = policy_chosen.size();
  if (policy_rejected.size() != count || reference_chosen.size() != count ||
      reference_rejected.size() != count) {
    throw PreferenceError("policy and reference series cover different pair counts");
  }

  double total = 0.0;
  for (std::size_t index = 0; index < count; ++index) {
    const double margin =
        config.beta() * ((policy_chosen[index] - reference_chosen[index]) -
                         (policy_rejected[index] - reference_rejected[index]));
    total += LogOnePlusExp(-margin);
  }
  return total / static_cast<double>(count);
}

struct LogProbReport {
  double mean_chosen{};
  double mean_rejected{};
  double margin{};
  bool both_falling{};
};

// Chosen and rejected log-probabilities, separately.
//
// The objective constrains only their difference, so it is satisfied
// equally by raising the winner and by sinking the loser faster -- and
// in practice it sinks the loser, moving mass to sequences nobody
// labelled. The loss curve cannot show this; these two numbers can, and
// nothing else will.
LogProbReport ReportLogProbabilities(std::span<const double> chosen,
                                     std::span<const double> rejected,
                                     const LogProbReport* previous = nullptr) {
  if (chosen.size() != rejected.size() || chosen.empty()) {
    throw PreferenceError("log-probability series must be non-empty and aligned");
  }

  const double mean_chosen =
      std::accumulate(chosen.begin(), chosen.end(), 0.0) / static_cast<double>(chosen.size());
  const double mean_rejected =
      std::accumulate(rejected.begin(), rejected.end(), 0.0) /
      static_cast<double>(rejected.size());

  const bool falling = previous != nullptr && mean_chosen < previous->mean_chosen &&
                       mean_rejected < previous->mean_rejected;
  return LogProbReport{mean_chosen, mean_rejected, mean_chosen - mean_rejected, falling};
}

struct WinRateReport {
  double raw{};
  double length_adjusted{};
  double mean_length_gap{};
  double slope_per_token{};
};

// A win rate with the length effect regressed out.
//
// Annotators prefer longer answers, reward models learn that faithfully,
// and policies exploit it within a few hundred steps. A raw win rate is
// therefore measuring verbosity as much as quality. The adjustment below
// is not a causal correction and is not offered as one -- it is the
// minimum honest presentation, raw and adjusted side by side with the
// length gap stated so a reader can judge.
WinRateReport LengthControlledWinRate(std::span<const bool> wins,
                                      std::span<const double> length_gap) {
  if (wins.size() != length_gap.size() || wins.empty()) {
    throw PreferenceError("win and length series must be non-empty and aligned");
  }

  const double count = static_cast<double>(wins.size());
  double mean_win = 0.0;
  double mean_gap = 0.0;
  for (std::size_t index = 0; index < wins.size(); ++index) {
    mean_win += wins[index] ? 1.0 : 0.0;
    mean_gap += length_gap[index];
  }
  mean_win /= count;
  mean_gap /= count;

  double covariance = 0.0;
  double variance = 0.0;
  for (std::size_t index = 0; index < wins.size(); ++index) {
    const double centred_gap = length_gap[index] - mean_gap;
    covariance += centred_gap * ((wins[index] ? 1.0 : 0.0) - mean_win);
    variance += centred_gap * centred_gap;
  }

  const double slope = variance > 0.0 ? covariance / variance : 0.0;
  return WinRateReport{mean_win, mean_win - slope * mean_gap, mean_gap, slope};
}

}  // namespace preference
`,
        profile:
          'Same arithmetic as the literal version — one implicit-reward difference per pair and a logistic loss over the batch — with every input arriving as a non-owning span, so the loss function allocates nothing and the caller decides whether the reference values came from a resident model or an offline cache. Illustrative, not a measured benchmark: the substantive change is that a mismatched anchor, a cohort at chance, a degenerate pair and a run trained past its KL budget are now failures the caller must handle, and the best checkpoint is restored on the throwing path rather than lost with the run.',
      },
      'make-it-fast': {
        rationale:
          'The structural win comes first and it is not a kernel change: the reference policy is frozen, so its sequence log-probabilities depend on nothing being trained and can be computed once over the whole dataset and stored, which removes an entire model from the training loop rather than making it faster. What remains is shaped for the cache. Chosen and rejected sequences are packed into one row-major token block so both sides of every pair are scored in a single pass, with the block laid out batch-major and length-bucketed so each row streams and the padding waste tracks the spread within a bucket rather than the longest sequence in the dataset. The per-token gather, the mask, the sequence sum and the logistic loss are fused into one traversal of that block, so the per-token intermediates that dominated the previous stage are never written; a restrict-qualified kernel is what makes that traversal vectorizable, since the compiler otherwise has to assume the log-probability block and the output sums may overlap. Pairs are independent once packed, so OpenMP parallelizes across rows with no synchronization, and the cached reference values are stored contiguously alongside the pair index so a step reads them as a slice rather than through a map. Sequence sums accumulate in double while the token block stays float, which is the one precision decision that matters here: a float accumulation over a few thousand tokens is large enough to move a margin and change which pairs the loss counts as correct.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Chosen and rejected sequences share one batch-major token block, so every row streams sequentially and the cached reference values are read as a contiguous slice',
            tradeoff: 'Padding to the longest sequence in the bucket wastes work proportional to the spread, so unbucketed batches give back most of what the layout gains',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Gather, mask, sequence sum and logistic loss run in one traversal, so the per-token arrays are never written',
            tradeoff: 'The fused form hides per-token log-probabilities, which are exactly what you want when diagnosing a run that has gone wrong',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the token-log-probability block and the output sums may overlap, and emits a scalar loop',
            tradeoff: 'The guarantee is unchecked: passing overlapping buffers compiles cleanly and corrupts the sums at run time with nothing to catch it',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Pairs are independent once packed, so sequence sums and per-pair losses fan out across cores with no synchronization',
            tradeoff: 'Only pays for batches of real size; a small batch spends more on thread dispatch than it recovers, and the reduction needs an explicit clause to stay deterministic',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The inner traversal is a masked multiply-accumulate over contiguous floats, which the vectorizer handles well once aliasing is ruled out',
            tradeoff: 'The binary stops being portable across machine generations, which matters when training and evaluation run on different hardware and a margin has to reproduce',
          },
        ],
        code: `// Preference optimization, shaped around one observation.
//
// The reference policy is frozen. Its sequence log-probabilities depend
// on nothing being trained, so they can be computed once for the whole
// dataset and stored -- which removes an entire model from the training
// loop, halves resident memory, and halves the forward work per step.
// That is the largest win available here, and it is structural rather
// than numerical.
//
// What remains is shaped for the cache: one row-major token block
// holding both sides of every pair, one fused traversal, and pairs fanned
// across cores.
//
// What none of this changes: the peak of true quality still sits at a
// finite KL distance, so a faster run reaches the wrong checkpoint
// sooner unless the budget travels with it.
//
// Build: -O3 -march=native -fopenmp

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace preference {

// Sequence log-probabilities for the frozen anchor, computed offline.
//
// Keyed by the reference checkpoint id so a changed anchor invalidates
// the cache rather than silently reusing numbers from a different
// geometry -- which would leave beta specifying a trust region around a
// policy no longer in the run.
//
// Values are double. They are sums over sequences of thousands of
// tokens, and this is the one place where float accumulation loses
// enough precision to move a margin.
class ReferenceCache {
 public:
  ReferenceCache(std::string checkpoint_id, std::vector<double> chosen,
                 std::vector<double> rejected)
      : checkpoint_id_(std::move(checkpoint_id)),
        chosen_(std::move(chosen)),
        rejected_(std::move(rejected)) {
    if (chosen_.size() != rejected_.size()) {
      throw std::invalid_argument("cache sides cover different pair counts");
    }
    if (chosen_.empty()) {
      throw std::runtime_error(
          "reference cache empty; run the offline pass or the reference model has to "
          "stay resident for the whole run");
    }
  }

  const std::string& checkpoint_id() const noexcept { return checkpoint_id_; }

  // Contiguous slices, read directly by a step rather than looked up
  // per pair through a map.
  std::span<const double> chosen(std::size_t offset, std::size_t count) const {
    return std::span<const double>(chosen_).subspan(offset, count);
  }

  std::span<const double> rejected(std::size_t offset, std::size_t count) const {
    return std::span<const double>(rejected_).subspan(offset, count);
  }

 private:
  std::string checkpoint_id_;
  std::vector<double> chosen_;
  std::vector<double> rejected_;
};

struct BatchShape {
  std::size_t max_rows{};    // two rows per pair: chosen and rejected
  std::size_t max_tokens{};
};

// Every buffer a step needs, allocated once at peak shape.
//
// A training loop that allocates per step spends a measurable share of a
// cheap stage in the allocator, and both shapes are known from the batch
// configuration before the first step runs.
class TokenBlock {
 public:
  explicit TokenBlock(BatchShape shape)
      : shape_(shape),
        token_ids_(shape.max_rows * shape.max_tokens, 0),
        mask_(shape.max_rows * shape.max_tokens, 0.0F),
        sequence_log_prob_(shape.max_rows, 0.0) {}

  // Length-bucketed packing into the preallocated block.
  //
  // Padding cost is the spread within a bucket, not the mean length,
  // which is why callers sort before packing. Unbucketed batches are
  // where this layout quietly gives back most of what it gained.
  std::size_t Pack(std::span<const std::span<const std::int32_t>> sequences) {
    if (sequences.size() > shape_.max_rows) {
      throw std::invalid_argument("batch exceeds the preallocated row count");
    }

    std::size_t longest = 0;
    for (const std::span<const std::int32_t>& sequence : sequences) {
      longest = std::max(longest, sequence.size());
    }
    if (longest > shape_.max_tokens) {
      throw std::invalid_argument("sequence exceeds the preallocated token width");
    }

    for (std::size_t row = 0; row < sequences.size(); ++row) {
      const std::size_t base = row * shape_.max_tokens;
      std::fill_n(mask_.begin() + static_cast<long>(base), longest, 0.0F);
      for (std::size_t position = 0; position < sequences[row].size(); ++position) {
        token_ids_[base + position] = sequences[row][position];
        mask_[base + position] = 1.0F;
      }
    }
    rows_ = sequences.size();
    width_ = longest;
    return longest;
  }

  std::size_t rows() const noexcept { return rows_; }
  std::size_t width() const noexcept { return width_; }
  std::span<const std::int32_t> token_ids() const noexcept { return token_ids_; }
  std::span<const float> mask() const noexcept { return mask_; }
  std::span<double> sequence_log_prob() noexcept {
    return std::span<double>(sequence_log_prob_).first(rows_);
  }

 private:
  BatchShape shape_;
  std::vector<std::int32_t> token_ids_;
  std::vector<float> mask_;
  std::vector<double> sequence_log_prob_;
  std::size_t rows_ = 0;
  std::size_t width_ = 0;
};

// Gather, mask and sum in one traversal.
//
// token_log_probs is (rows, width, vocab) log-softmax output, row-major.
// The previous stages walked each sequence separately in the host
// language, which dominated their step cost; this is one pass with the
// per-token intermediates never written.
//
// restrict is what makes it vectorizable. Without it the compiler must
// assume the block and the output sums may overlap. The guarantee is
// unchecked, so overlapping buffers corrupt the sums silently.
void FusedSequenceLogProb(const float* __restrict__ token_log_probs,
                          const std::int32_t* __restrict__ token_ids,
                          const float* __restrict__ mask, double* __restrict__ out,
                          std::size_t rows, std::size_t width, std::size_t vocab) noexcept {
#pragma omp parallel for schedule(static) if (rows > 8)
  for (std::size_t row = 0; row < rows; ++row) {
    const std::size_t token_base = row * width;
    const std::size_t block_base = row * width * vocab;

    // double accumulation over a float block: the sum runs over
    // thousands of tokens, and float error here is large enough to move
    // a margin and flip which pairs the loss counts as correct.
    double total = 0.0;
    for (std::size_t position = 0; position < width; ++position) {
      const std::size_t identifier =
          static_cast<std::size_t>(token_ids[token_base + position]);
      total += static_cast<double>(mask[token_base + position]) *
               static_cast<double>(token_log_probs[block_base + position * vocab + identifier]);
    }
    out[row] = total;
  }
}

inline double LogOnePlusExp(double value) noexcept {
  return value > 0.0 ? value + std::log1p(std::exp(-value)) : std::log1p(std::exp(value));
}

struct LossAndDiagnostics {
  double loss{};
  double mean_chosen_logprob{};
  double mean_rejected_logprob{};
  double mean_margin{};
  double accuracy{};
};

// Implicit rewards, margin, loss and diagnostics in one pass.
//
// The intermediate implicit rewards are never materialized: the
// difference of differences collapses algebraically, which is both
// fewer temporaries and fewer chances for a sign to go astray.
//
//     margin = beta * [(pi_c - ref_c) - (pi_r - ref_r)]
//
// The diagnostics come free because every array is already in hand, and
// they are the ones that matter: the objective constrains only the
// difference, so both log-probabilities falling together satisfies it
// perfectly while draining mass to unlabelled sequences.
LossAndDiagnostics FusedDpoLoss(std::span<const double> policy_chosen,
                                std::span<const double> policy_rejected,
                                std::span<const double> reference_chosen,
                                std::span<const double> reference_rejected, double beta) {
  const std::size_t count = policy_chosen.size();
  if (policy_rejected.size() != count || reference_chosen.size() != count ||
      reference_rejected.size() != count) {
    throw std::invalid_argument("series cover different pair counts");
  }

  double loss = 0.0;
  double chosen_total = 0.0;
  double rejected_total = 0.0;
  double margin_total = 0.0;
  std::size_t correct = 0;

#pragma omp parallel for schedule(static) reduction(+ : loss, chosen_total, rejected_total, \\
                                                        margin_total, correct) if (count > 64)
  for (std::size_t index = 0; index < count; ++index) {
    const double margin = beta * ((policy_chosen[index] - reference_chosen[index]) -
                                  (policy_rejected[index] - reference_rejected[index]));
    loss += LogOnePlusExp(-margin);
    chosen_total += policy_chosen[index];
    rejected_total += policy_rejected[index];
    margin_total += margin;
    correct += margin > 0.0 ? 1 : 0;
  }

  const double scale = static_cast<double>(count);
  return LossAndDiagnostics{loss / scale, chosen_total / scale, rejected_total / scale,
                            margin_total / scale,
                            static_cast<double>(correct) / scale};
}

// A low-variance KL estimate from log-ratios already in hand.
//
//     k3 = exp(-d) - 1 + d,   d = log pi_ref - log pi_theta
//
// Always non-negative, unbiased, and far less noisy than the mean of
// -d, which is negative roughly half the time on small batches and
// makes the one plot that matters unreadable. Costs nothing here, and
// KL from the reference is the axis every failure moves along.
double SequenceKlEstimate(std::span<const double> policy,
                          std::span<const double> reference) {
  if (policy.size() != reference.size() || policy.empty()) {
    throw std::invalid_argument("KL series must be non-empty and aligned");
  }

  double total = 0.0;
  for (std::size_t index = 0; index < policy.size(); ++index) {
    const double log_ratio = reference[index] - policy[index];
    total += std::expm1(log_ratio) - log_ratio;
  }
  return total / static_cast<double>(policy.size());
}

struct SweepSummary {
  std::size_t peak_checkpoint{};
  double peak_kl{};
  double peak_true_reward{};
  double final_true_reward{};
  double final_proxy_reward{};
  double true_reward_lost_by_training_on{};
};

// Where the curve turned, from logged checkpoints.
//
// Cheap, and the single most useful summary of a preference run: the
// proxy is monotone in KL while the truth is not, so the argmax of true
// reward names the checkpoint to ship and the final step names the one
// that would have been shipped by default.
SweepSummary OveroptimizationSweep(std::span<const double> proxy_reward,
                                   std::span<const double> true_reward,
                                   std::span<const double> kl) {
  if (proxy_reward.size() != true_reward.size() || true_reward.size() != kl.size()) {
    throw std::invalid_argument("series cover different checkpoint counts");
  }
  if (true_reward.empty()) {
    throw std::invalid_argument("no checkpoints logged");
  }

  std::size_t peak = 0;
  for (std::size_t index = 1; index < true_reward.size(); ++index) {
    if (true_reward[index] > true_reward[peak]) {
      peak = index;
    }
  }

  return SweepSummary{peak,
                      kl[peak],
                      true_reward[peak],
                      true_reward.back(),
                      proxy_reward.back(),
                      true_reward[peak] - true_reward.back()};
}

}  // namespace preference
`,
        profile:
          'Per step: one forward pass over 2·pairs padded sequences rather than two passes of pairs each, one fused traversal of the (rows, width, vocab) block at O(rows·width) gathered reads, and O(pairs) reductions — with the reference model absent from the loop entirely once its log-probabilities are cached. Illustrative, not a measured benchmark: the useful shape is that the cache removes a whole model rather than a constant factor, and that padding waste scales with the length spread inside a bucket, which is why bucketing matters more here than anything done to the kernels.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! RLHF and DPO, transcribed from the objective.
//!
//! No library, and a deliberately tiny world: a few prompts with a few
//! candidate responses each, so every quantity in the theory can be
//! computed exactly rather than estimated.
//!
//!     RLHF:  max_pi  E[r(x, y)] - beta * KL(pi || pi_ref)
//!     optimum:  pi*(y|x)  proportional to  pi_ref(y|x) * exp(r/beta)
//!     DPO:   -log sigmoid( beta*log(pi/pi_ref)[w] - beta*log(pi/pi_ref)[l] )
//!
//! Claim 1: the closed form IS the optimum. \`tilted_policy\` computes it
//! directly; \`dpo_train\` reaches the same place by gradient descent on
//! a classification loss that never mentions reinforcement learning.
//!
//! Claim 2: reward is identified only up to a per-prompt shift.
//! \`bradley_terry_log_likelihood\` is invariant to adding a constant to
//! every response of a prompt, so absolute reward values carry no
//! information whatsoever.
//!
//! Claim 3: reward hacking is not a bug. \`overoptimization_curve\` fits
//! a reward model to limited noisy comparisons, sweeps beta, and
//! reports true reward against KL. It rises, peaks and falls while the
//! proxy rises throughout.

/// A deterministic generator, so an experiment reproduces across
/// processes. A comparison between two betas is worthless if the
/// initialization moved underneath it.
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

    fn next_uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        ((self.state >> 11) as f64) / ((1_u64 << 53) as f64)
    }

    fn next_normal(&mut self, std_dev: f64) -> f64 {
        let mut total = 0.0;
        for _ in 0..12 {
            total += self.next_uniform();
        }
        (total - 6.0) * std_dev
    }

    fn next_index(&mut self, bound: usize) -> usize {
        (self.next_uniform() * bound as f64) as usize % bound
    }
}

#[must_use]
pub fn softmax(logits: &[f64]) -> Vec<f64> {
    let largest = logits.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let exponentials: Vec<f64> = logits.iter().map(|value| (value - largest).exp()).collect();
    let total: f64 = exponentials.iter().sum();
    exponentials.into_iter().map(|value| value / total).collect()
}

/// log(1 + exp(x)) without overflowing for large x.
///
/// Not fastidiousness: the confidently-wrong pairs are exactly the ones
/// carrying the gradient early in a run, and exactly the ones the naive
/// form loses.
#[must_use]
pub fn log_one_plus_exp(value: f64) -> f64 {
    if value > 0.0 {
        value + (-value).exp().ln_1p()
    } else {
        value.exp().ln_1p()
    }
}

#[must_use]
pub fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let exponential = value.exp();
        exponential / (1.0 + exponential)
    }
}

/// KL(policy || reference), the term that anchors the whole method.
///
/// Asymmetric on purpose and in the direction that matters: infinite
/// where the policy places mass the reference does not, so it forbids
/// inventing behaviour rather than merely discouraging it.
#[must_use]
pub fn kl_divergence(policy: &[f64], reference: &[f64]) -> f64 {
    let mut total = 0.0;
    for (probability, base) in policy.iter().zip(reference) {
        if *probability <= 0.0 {
            continue;
        }
        if *base <= 0.0 {
            return f64::INFINITY;
        }
        total += probability * (probability / base).ln();
    }
    total
}

/// The closed-form optimum of the KL-constrained problem.
///
///     pi*(y|x)  proportional to  pi_ref(y|x) * exp(r(x, y) / beta)
///
/// Worth staring at, because DPO is this identity read backwards: solve
/// for r and you get beta * log(pi*/pi_ref) plus a term constant in y --
/// the implicit reward, and the reason that constant cancels inside a
/// difference.
///
/// Beta's role is visible here too. Large beta flattens the exponent
/// and the optimum stays near the reference; small beta puts everything
/// on the highest-reward response. Beta is the statement of how far the
/// proxy is trusted, not a regularization detail.
#[must_use]
pub fn tilted_policy(reference: &[f64], rewards: &[f64], beta: f64) -> Vec<f64> {
    let tilted: Vec<f64> = reference
        .iter()
        .zip(rewards)
        .map(|(probability, reward)| probability * (reward / beta).exp())
        .collect();
    let total: f64 = tilted.iter().sum();
    tilted.into_iter().map(|value| value / total).collect()
}

pub struct PreferencePair {
    pub prompt: usize,
    pub winner: usize,
    pub loser: usize,
}

/// The likelihood a reward model is fitted to.
///
///     P(w beats l) = sigmoid(r(w) - r(l))
///
/// Only the DIFFERENCE appears. Add a constant to every response of one
/// prompt and this does not move -- the formal statement that reward is
/// identified up to a per-prompt shift, and the reason a dashboard
/// comparing mean reward across prompts is displaying an arbitrary
/// offset.
#[must_use]
pub fn bradley_terry_log_likelihood(rewards: &[Vec<f64>], pairs: &[PreferencePair]) -> f64 {
    let total: f64 = pairs
        .iter()
        .map(|pair| {
            let margin = rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser];
            -log_one_plus_exp(-margin)
        })
        .sum();
    total / pairs.len() as f64
}

/// Ordinary supervised learning on pairwise labels.
///
/// Tabular, so there is no function approximation to hide behind: one
/// number per (prompt, response), and the only signal is which of two
/// was preferred. What it knows about a response it never saw is
/// nothing, which is exactly why optimizing against it out of
/// distribution is unsafe.
#[must_use]
pub fn fit_reward_model(
    n_prompts: usize,
    n_responses: usize,
    pairs: &[PreferencePair],
    steps: usize,
    learning_rate: f64,
) -> Vec<Vec<f64>> {
    let mut rewards = vec![vec![0.0_f64; n_responses]; n_prompts];

    for _ in 0..steps {
        let mut gradients = vec![vec![0.0_f64; n_responses]; n_prompts];

        for pair in pairs {
            let margin = rewards[pair.prompt][pair.winner] - rewards[pair.prompt][pair.loser];
            // sigmoid(-margin): large when the pair is ordered wrongly,
            // near zero once it is confidently right. An automatic
            // curriculum that costs nothing.
            let weight = sigmoid(-margin);
            gradients[pair.prompt][pair.winner] += weight;
            gradients[pair.prompt][pair.loser] -= weight;
        }

        let step_scale = learning_rate / pairs.len() as f64;
        for (prompt, row) in gradients.iter().enumerate() {
            for (response, gradient) in row.iter().enumerate() {
                rewards[prompt][response] += step_scale * gradient;
            }
        }
    }
    rewards
}

pub struct DpoStep {
    pub loss: f64,
    pub gradients: Vec<Vec<f64>>,
}

/// The DPO objective, computed rather than described.
///
/// The implicit reward is beta * log(pi_theta / pi_ref) and the loss is
/// a logistic loss on the difference between the winner's and the
/// loser's. No reward model appears; no response is ever sampled.
#[must_use]
pub fn dpo_loss_and_gradient(
    logits: &[Vec<f64>],
    reference: &[Vec<f64>],
    pairs: &[PreferencePair],
    beta: f64,
) -> DpoStep {
    let policies: Vec<Vec<f64>> = logits.iter().map(|row| softmax(row)).collect();
    let mut gradients: Vec<Vec<f64>> = logits.iter().map(|row| vec![0.0; row.len()]).collect();
    let mut loss = 0.0_f64;

    for pair in pairs {
        let policy = &policies[pair.prompt];
        let base = &reference[pair.prompt];

        let implicit_winner = beta * (policy[pair.winner] / base[pair.winner]).ln();
        let implicit_loser = beta * (policy[pair.loser] / base[pair.loser]).ln();
        let margin = implicit_winner - implicit_loser;

        loss += log_one_plus_exp(-margin);
        let weight = sigmoid(-margin);

        // d/dlogit_j of log pi(y) is [j == y] - pi(j). So the update is
        // the ordinary likelihood gradient of the winner MINUS that of
        // the loser, and nothing in it cares which of the two moves --
        // only that they separate. That indifference is the source of
        // the likelihood-displacement pathology: sinking the loser
        // satisfies the objective exactly as well as raising the
        // winner, and empirically it is what happens.
        for response in 0..policy.len() {
            let winner_term = f64::from(response == pair.winner) - policy[response];
            let loser_term = f64::from(response == pair.loser) - policy[response];
            gradients[pair.prompt][response] -= beta * weight * (winner_term - loser_term);
        }
    }

    let count = pairs.len() as f64;
    for row in &mut gradients {
        for value in row.iter_mut() {
            *value /= count;
        }
    }
    DpoStep {
        loss: loss / count,
        gradients,
    }
}

/// Gradient descent on a classification loss, arriving at an RL optimum.
///
/// The policy is initialized AT the reference, which is what the theory
/// assumes and what production does: every log-ratio starts at zero, so
/// the implicit reward starts at zero everywhere and the first update
/// is driven entirely by the labels.
pub fn dpo_train(
    reference: &[Vec<f64>],
    pairs: &[PreferencePair],
    beta: f64,
    steps: usize,
    learning_rate: f64,
) -> (Vec<Vec<f64>>, Vec<f64>) {
    let mut logits: Vec<Vec<f64>> = reference
        .iter()
        .map(|row| row.iter().map(|value| value.max(1e-12).ln()).collect())
        .collect();

    let mut history = Vec::with_capacity(steps);
    for _ in 0..steps {
        let step = dpo_loss_and_gradient(&logits, reference, pairs, beta);
        for (prompt, row) in logits.iter_mut().enumerate() {
            for (response, value) in row.iter_mut().enumerate() {
                *value -= learning_rate * step.gradients[prompt][response];
            }
        }
        history.push(step.loss);
    }

    let policies = logits.iter().map(|row| softmax(row)).collect();
    (policies, history)
}

pub struct LogProbReport {
    pub mean_chosen: f64,
    pub mean_rejected: f64,
    pub margin: f64,
}

/// Chosen and rejected log-probabilities, separately.
///
/// The loss cannot distinguish "the winner went up" from "the loser
/// went down twice as far", and the second is the reported failure.
/// These two numbers are the only view that shows it, and they are the
/// cheapest diagnostic in this entry.
#[must_use]
pub fn log_probability_report(policy: &[Vec<f64>], pairs: &[PreferencePair]) -> LogProbReport {
    let count = pairs.len() as f64;
    let chosen: f64 = pairs
        .iter()
        .map(|pair| policy[pair.prompt][pair.winner].max(1e-12).ln())
        .sum();
    let rejected: f64 = pairs
        .iter()
        .map(|pair| policy[pair.prompt][pair.loser].max(1e-12).ln())
        .sum();

    LogProbReport {
        mean_chosen: chosen / count,
        mean_rejected: rejected / count,
        margin: (chosen - rejected) / count,
    }
}

/// Noisy annotators, sampled from Bradley-Terry.
///
/// Labels come from sigmoid(r_a - r_b) rather than argmax, because that
/// is what the model assumes and what people actually do: disagree at a
/// rate set by how close the options are. Agreement on genuinely close
/// pairs is near chance, and no reward model can exceed that.
#[must_use]
pub fn sample_preferences(
    true_rewards: &[Vec<f64>],
    n_pairs: usize,
    seed: u64,
) -> Vec<PreferencePair> {
    let mut rng = Lcg::new(seed);
    let mut pairs = Vec::with_capacity(n_pairs);

    for _ in 0..n_pairs {
        let prompt = rng.next_index(true_rewards.len());
        let n_responses = true_rewards[prompt].len();
        let first = rng.next_index(n_responses);
        let mut second = rng.next_index(n_responses);
        while second == first {
            second = rng.next_index(n_responses);
        }

        let gap = true_rewards[prompt][first] - true_rewards[prompt][second];
        if rng.next_uniform() < sigmoid(gap) {
            pairs.push(PreferencePair {
                prompt,
                winner: first,
                loser: second,
            });
        } else {
            pairs.push(PreferencePair {
                prompt,
                winner: second,
                loser: first,
            });
        }
    }
    pairs
}

pub struct CurvePoint {
    pub beta: f64,
    pub kl_from_reference: f64,
    pub proxy_reward: f64,
    pub true_reward: f64,
}

/// Goodhart's law, plotted.
///
/// A true reward exists and is never shown to the fitting procedure. A
/// reward model is fitted to a limited, noisy sample from it, the
/// policy is tilted against the LEARNED reward at a sweep of beta, and
/// both rewards are measured under the result.
///
/// What comes back: proxy reward rises monotonically as beta falls,
/// true reward rises, peaks, and declines. The peak is at a finite KL
/// distance, so there is no "train until converged" here -- the
/// stopping point is a measurement from an evaluation the optimizer
/// never saw.
#[must_use]
pub fn overoptimization_curve(
    n_prompts: usize,
    n_responses: usize,
    n_pairs: usize,
    seed: u64,
) -> Vec<CurvePoint> {
    let mut rng = Lcg::new(seed);

    let true_rewards: Vec<Vec<f64>> = (0..n_prompts)
        .map(|_| (0..n_responses).map(|_| rng.next_normal(1.0)).collect())
        .collect();
    let reference: Vec<Vec<f64>> = (0..n_prompts)
        .map(|_| {
            let logits: Vec<f64> = (0..n_responses).map(|_| rng.next_normal(0.5)).collect();
            softmax(&logits)
        })
        .collect();

    let pairs = sample_preferences(&true_rewards, n_pairs, seed + 1);
    let learned = fit_reward_model(n_prompts, n_responses, &pairs, 600, 2.0);

    [2.0, 1.0, 0.5, 0.25, 0.125, 0.0625, 0.031_25]
        .into_iter()
        .map(|beta| {
            let mut proxy_total = 0.0;
            let mut true_total = 0.0;
            let mut kl_total = 0.0;

            for prompt in 0..n_prompts {
                let policy = tilted_policy(&reference[prompt], &learned[prompt], beta);
                kl_total += kl_divergence(&policy, &reference[prompt]);
                for response in 0..n_responses {
                    proxy_total += policy[response] * learned[prompt][response];
                    true_total += policy[response] * true_rewards[prompt][response];
                }
            }

            let scale = n_prompts as f64;
            CurvePoint {
                beta,
                kl_from_reference: kl_total / scale,
                proxy_reward: proxy_total / scale,
                true_reward: true_total / scale,
            }
        })
        .collect()
}
`,
        profile:
          'Reward-model fitting is O(steps · pairs) with a gradient table rebuilt per step; DPO training is O(steps · pairs · responses) because the softmax gradient touches every response of the pair\'s prompt; the closed-form tilt is one O(responses) pass per prompt. Illustrative, not a measured benchmark: the shape to notice is that the closed form and the gradient descent reach the same policy, so in the tabular case the entire reinforcement-learning apparatus is replaceable by one exponential — which is the identity DPO exploits at scale, where that closed form is unreachable.',
      },
      'make-it-right': {
        rationale:
          'Everything the literal version accepted silently becomes a typed failure naming the values that caused it: a beta outside the range where the objective means anything, a pair whose two responses are identical and whose margin is therefore zero by construction, an annotator cohort agreeing at chance whose labels carry no signal, and a reference assigning zero mass where the policy is asked to place some, which makes the KL infinite rather than merely large. Newtypes separate the quantities that would otherwise all be f64 and all silently interchangeable — a beta, a KL distance, a sequence log-probability — and the reference becomes a fingerprinted type rather than an array passed alongside the data, because beta is defined relative to a specific anchor and the same beta against a different one is a different trust region. The preference pair carries its annotator cohort, so the ceiling that cohort imposes travels with the data instead of living in a document. The stopping criterion becomes a KL budget object rather than a step count, since true quality peaks at a finite distance and training to convergence returns the wrong checkpoint by construction; the budget records the best checkpoint by an INDEPENDENT score, never by the proxy, which is monotone and would select the worst model available. A Drop guard restores that checkpoint on the way out of the training scope, including the unwinding path. Reads take slices rather than owned vectors throughout, and the reductions are iterator chains rather than index loops.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Preference optimization with the silent failures made loud.
//!
//! The literal version accepted all of these without complaint:
//!
//!   * a beta tuned against one reference policy applied to another,
//!     where it specifies an entirely different trust region;
//!   * an annotator cohort agreeing at chance, whose labels carry no
//!     signal and whose reward model still reports a number;
//!   * training to convergence, which by construction returns a
//!     checkpoint past the point where true quality turned over.
//!
//! Each becomes a \`Result\` variant, a budget or a guard. Beyond
//! defence, the two diagnostics that separate this working from this
//! appearing to work are functions here: log-probabilities reported
//! separately, and a length-controlled win rate.

use std::fmt;

/// Below this pairwise agreement the cohort is indistinguishable from
/// coin flipping, and a reward model fitted to it fits noise.
const MIN_ANNOTATOR_AGREEMENT: f64 = 0.55;

/// The KL strength. A newtype because it is meaningless without the
/// reference it is measured against, and because it is otherwise one
/// more bare f64 among several.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Beta(pub f64);

/// A measured KL divergence from the reference — the axis every failure
/// in this technique moves along.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Kl(pub f64);

/// A sequence log-probability. Distinct from a reward, a margin and a
/// loss, all of which are also f64 here.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct LogProb(pub f64);

/// Who labelled a comparison. Their agreement rate is the ceiling on
/// the reward model and on everything downstream.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Cohort(pub String);

#[derive(Debug, Clone, PartialEq)]
pub enum PreferenceError {
    /// Beta outside the range where the objective is meaningful.
    InvalidBeta { beta: f64 },
    /// The two responses are identical, so the margin is zero and the
    /// gradient is exactly nothing.
    DegeneratePair { prompt_id: String },
    /// Labels close to coin flips; there is no signal to fit.
    UninformativeAnnotations { agreement: f64, floor: f64 },
    /// Beta is defined relative to a specific anchor, so this is not
    /// bookkeeping: the same beta elsewhere is a different objective.
    ReferenceMismatch {
        configured: String,
        supplied: String,
    },
    /// The preference data names a response the anchor never scored.
    UnscoredResponse { prompt_id: String },
    /// The reference assigns zero mass where the policy must place
    /// some, so the KL is infinite and the objective forbids it.
    ReferenceZeroMass { prompt_id: String },
    EmptyDataset,
    MisalignedSeries { left: usize, right: usize },
}

impl fmt::Display for PreferenceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidBeta { beta } => write!(
                formatter,
                "beta must lie in (0, 1]; got {beta}. It is the statement of how far the \\
                 proxy may be trusted, not a regularization detail"
            ),
            Self::DegeneratePair { prompt_id } => write!(
                formatter,
                "{prompt_id}: chosen and rejected are identical; the margin is zero by \\
                 construction and the gradient is exactly nothing"
            ),
            Self::UninformativeAnnotations { agreement, floor } => write!(
                formatter,
                "cohort agreement {agreement:.3} is below {floor:.3}; these labels are \\
                 close to coin flips and the reward model will fit noise"
            ),
            Self::ReferenceMismatch {
                configured,
                supplied,
            } => write!(
                formatter,
                "config anchors to {configured}, reference is {supplied}; beta specifies \\
                 a different trust region against a different anchor"
            ),
            Self::UnscoredResponse { prompt_id } => write!(
                formatter,
                "{prompt_id}: the anchor never scored this response, so the preference \\
                 data was generated by a different policy than the one anchoring this run"
            ),
            Self::ReferenceZeroMass { prompt_id } => write!(
                formatter,
                "{prompt_id}: reference assigns zero mass to a scored response; KL is \\
                 infinite there, so the objective forbids rather than discourages it"
            ),
            Self::EmptyDataset => write!(formatter, "no preference pairs"),
            Self::MisalignedSeries { left, right } => {
                write!(formatter, "series cover {left} and {right} items")
            }
        }
    }
}

impl std::error::Error for PreferenceError {}

/// A comparison, with the cohort that produced it.
pub struct PreferencePair {
    pub prompt_id: String,
    pub chosen: String,
    pub rejected: String,
    pub cohort: Cohort,
    pub chosen_tokens: usize,
    pub rejected_tokens: usize,
}

/// Validated once, at construction.
#[derive(Debug, Clone)]
pub struct DpoConfig {
    beta: Beta,
    learning_rate: f64,
    reference_checkpoint_id: String,
}

impl DpoConfig {
    pub fn new(
        beta: Beta,
        learning_rate: f64,
        reference_checkpoint_id: impl Into<String>,
    ) -> Result<Self, PreferenceError> {
        if !(beta.0 > 0.0) || beta.0 > 1.0 {
            return Err(PreferenceError::InvalidBeta { beta: beta.0 });
        }
        Ok(Self {
            beta,
            learning_rate: learning_rate.max(f64::MIN_POSITIVE),
            reference_checkpoint_id: reference_checkpoint_id.into(),
        })
    }

    #[must_use]
    pub fn beta(&self) -> Beta {
        self.beta
    }

    #[must_use]
    pub fn learning_rate(&self) -> f64 {
        self.learning_rate
    }
}

/// The frozen anchor, pinned by identity rather than by value.
///
/// Two checkpoints scoring identically still define different KL
/// geometries, so an anchor is a specific checkpoint and never "a model
/// that behaves the same".
pub struct ReferencePolicy {
    checkpoint_id: String,
    chosen: Vec<LogProb>,
    rejected: Vec<LogProb>,
}

impl ReferencePolicy {
    pub fn new(
        checkpoint_id: impl Into<String>,
        chosen: Vec<LogProb>,
        rejected: Vec<LogProb>,
    ) -> Result<Self, PreferenceError> {
        if chosen.len() != rejected.len() {
            return Err(PreferenceError::MisalignedSeries {
                left: chosen.len(),
                right: rejected.len(),
            });
        }
        if chosen.is_empty() {
            return Err(PreferenceError::EmptyDataset);
        }
        if let Some(position) = chosen
            .iter()
            .chain(&rejected)
            .position(|value| !value.0.is_finite())
        {
            return Err(PreferenceError::ReferenceZeroMass {
                prompt_id: format!("pair {position}"),
            });
        }

        Ok(Self {
            checkpoint_id: checkpoint_id.into(),
            chosen,
            rejected,
        })
    }

    #[must_use]
    pub fn checkpoint_id(&self) -> &str {
        &self.checkpoint_id
    }

    #[must_use]
    pub fn chosen(&self) -> &[LogProb] {
        &self.chosen
    }

    #[must_use]
    pub fn rejected(&self) -> &[LogProb] {
        &self.rejected
    }
}

pub fn validate_pairs(pairs: &[PreferencePair]) -> Result<(), PreferenceError> {
    if pairs.is_empty() {
        return Err(PreferenceError::EmptyDataset);
    }
    if let Some(pair) = pairs.iter().find(|pair| pair.chosen == pair.rejected) {
        return Err(PreferenceError::DegeneratePair {
            prompt_id: pair.prompt_id.clone(),
        });
    }
    Ok(())
}

/// Agreement between two independent labellings of the same pairs.
///
/// This number is the ceiling on the reward model. A reward model
/// reporting validation accuracy well above it has learned an artefact
/// -- length, most often -- rather than quality.
pub fn cohort_agreement(
    first: &[PreferencePair],
    second: &[PreferencePair],
) -> Result<f64, PreferenceError> {
    if first.len() != second.len() {
        return Err(PreferenceError::MisalignedSeries {
            left: first.len(),
            right: second.len(),
        });
    }
    if first.is_empty() {
        return Err(PreferenceError::EmptyDataset);
    }

    let agreed = first
        .iter()
        .zip(second)
        .filter(|(left, right)| left.chosen == right.chosen)
        .count();
    let rate = agreed as f64 / first.len() as f64;

    if rate < MIN_ANNOTATOR_AGREEMENT {
        return Err(PreferenceError::UninformativeAnnotations {
            agreement: rate,
            floor: MIN_ANNOTATOR_AGREEMENT,
        });
    }
    Ok(rate)
}

#[inline]
#[must_use]
fn log_one_plus_exp(value: f64) -> f64 {
    if value > 0.0 {
        value + (-value).exp().ln_1p()
    } else {
        value.exp().ln_1p()
    }
}

/// The pairwise logistic loss over precomputed sequence log-probabilities.
///
/// Everything arrives as a slice: this function owns nothing, which is
/// what lets the caller decide whether the reference values came from a
/// resident model or from an offline cache.
pub fn dpo_loss(
    policy_chosen: &[LogProb],
    policy_rejected: &[LogProb],
    reference: &ReferencePolicy,
    config: &DpoConfig,
) -> Result<f64, PreferenceError> {
    if reference.checkpoint_id() != config.reference_checkpoint_id {
        return Err(PreferenceError::ReferenceMismatch {
            configured: config.reference_checkpoint_id.clone(),
            supplied: reference.checkpoint_id().to_owned(),
        });
    }
    if policy_chosen.len() != reference.chosen().len() {
        return Err(PreferenceError::MisalignedSeries {
            left: policy_chosen.len(),
            right: reference.chosen().len(),
        });
    }

    let beta = config.beta().0;
    let total: f64 = policy_chosen
        .iter()
        .zip(policy_rejected)
        .zip(reference.chosen().iter().zip(reference.rejected()))
        .map(|((policy_c, policy_r), (ref_c, ref_r))| {
            let margin = beta * ((policy_c.0 - ref_c.0) - (policy_r.0 - ref_r.0));
            log_one_plus_exp(-margin)
        })
        .sum();

    Ok(total / policy_chosen.len() as f64)
}

pub struct LogProbReport {
    pub mean_chosen: f64,
    pub mean_rejected: f64,
    pub margin: f64,
    pub both_falling: bool,
}

/// Chosen and rejected log-probabilities, separately.
///
/// The objective constrains only their difference, so it is satisfied
/// equally by raising the winner and by sinking the loser faster -- and
/// in practice it sinks the loser, moving mass to sequences nobody
/// labelled. The loss curve cannot show this; these two numbers can,
/// and nothing else will.
#[must_use]
pub fn log_probability_report(
    chosen: &[LogProb],
    rejected: &[LogProb],
    previous: Option<&LogProbReport>,
) -> LogProbReport {
    let mean = |values: &[LogProb]| {
        values.iter().map(|value| value.0).sum::<f64>() / values.len().max(1) as f64
    };

    let mean_chosen = mean(chosen);
    let mean_rejected = mean(rejected);
    let both_falling = previous.is_some_and(|last| {
        mean_chosen < last.mean_chosen && mean_rejected < last.mean_rejected
    });

    LogProbReport {
        mean_chosen,
        mean_rejected,
        margin: mean_chosen - mean_rejected,
        both_falling,
    }
}

/// The stopping criterion, as an object rather than a step count.
///
/// True quality peaks at a finite KL distance and declines after it, so
/// "train to convergence" returns the wrong checkpoint by construction.
/// This stops on measured distance and keeps the checkpoint from the
/// best INDEPENDENT evaluation -- never the best proxy reward, which is
/// monotone in KL and would select the worst model available.
pub struct KlBudget {
    max_kl: Kl,
    best_score: f64,
    best_kl: Kl,
    best_parameters: Vec<f64>,
    stopped: bool,
}

impl KlBudget {
    #[must_use]
    pub fn new(max_kl: Kl) -> Self {
        Self {
            max_kl,
            best_score: f64::NEG_INFINITY,
            best_kl: Kl(0.0),
            best_parameters: Vec::new(),
            stopped: false,
        }
    }

    /// Returns false once the budget is spent.
    pub fn observe(&mut self, kl: Kl, independent_score: f64, parameters: &[f64]) -> bool {
        if independent_score > self.best_score {
            self.best_score = independent_score;
            self.best_kl = kl;
            self.best_parameters.clear();
            self.best_parameters.extend_from_slice(parameters);
        }
        if kl.0 > self.max_kl.0 {
            self.stopped = true;
        }
        !self.stopped
    }

    #[must_use]
    pub fn best(&self) -> (&[f64], f64, Kl) {
        (&self.best_parameters, self.best_score, self.best_kl)
    }
}

/// Restore the best checkpoint on the way out, always.
///
/// A guard rather than a restore at the end of the loop, because the
/// run will eventually return early or panic -- an evaluation times
/// out, a batch is malformed -- and a restore depending on that not
/// happening is one that will be skipped exactly when the run is still
/// salvageable.
pub struct BestCheckpointGuard<'budget, 'params> {
    budget: &'budget KlBudget,
    parameters: &'params mut [f64],
}

impl<'budget, 'params> BestCheckpointGuard<'budget, 'params> {
    #[must_use]
    pub fn new(budget: &'budget KlBudget, parameters: &'params mut [f64]) -> Self {
        Self { budget, parameters }
    }
}

impl Drop for BestCheckpointGuard<'_, '_> {
    fn drop(&mut self) {
        let (best, _, _) = self.budget.best();
        if !best.is_empty() && best.len() == self.parameters.len() {
            self.parameters.copy_from_slice(best);
        }
    }
}

pub struct WinRateReport {
    pub raw: f64,
    pub length_adjusted: f64,
    pub mean_length_gap: f64,
    pub slope_per_token: f64,
}

/// A win rate with the length effect regressed out.
///
/// Annotators prefer longer answers, reward models learn that
/// faithfully, and policies exploit it within a few hundred steps. A raw
/// win rate is therefore measuring verbosity as much as quality. The
/// adjustment is not a causal correction and is not offered as one --
/// it is the minimum honest presentation, raw and adjusted side by side
/// with the length gap stated so a reader can judge.
pub fn length_controlled_win_rate(
    wins: &[bool],
    length_gap: &[f64],
) -> Result<WinRateReport, PreferenceError> {
    if wins.len() != length_gap.len() {
        return Err(PreferenceError::MisalignedSeries {
            left: wins.len(),
            right: length_gap.len(),
        });
    }
    if wins.is_empty() {
        return Err(PreferenceError::EmptyDataset);
    }

    let count = wins.len() as f64;
    let mean_win = wins.iter().filter(|won| **won).count() as f64 / count;
    let mean_gap = length_gap.iter().sum::<f64>() / count;

    let (covariance, variance) = wins.iter().zip(length_gap).fold(
        (0.0_f64, 0.0_f64),
        |(covariance, variance), (won, gap)| {
            let centred = gap - mean_gap;
            (
                covariance + centred * (f64::from(*won) - mean_win),
                variance + centred * centred,
            )
        },
    );

    let slope = if variance > 0.0 { covariance / variance } else { 0.0 };
    Ok(WinRateReport {
        raw: mean_win,
        length_adjusted: mean_win - slope * mean_gap,
        mean_length_gap: mean_gap,
        slope_per_token: slope,
    })
}
`,
        profile:
          'Same arithmetic as the literal version — one implicit-reward difference per pair and a logistic loss over the batch — with every input borrowed as a slice, so the loss function allocates nothing and the caller decides whether the reference values came from a resident model or an offline cache. Illustrative, not a measured benchmark: the substantive change is that a mismatched anchor, a cohort at chance, a degenerate pair and a run trained past its KL budget are now failures the caller must handle, and the best checkpoint is restored on the unwinding path rather than lost with the run.',
      },
      'make-it-fast': {
        rationale:
          'The structural win comes first and it is not a kernel change: the reference policy is frozen, so its sequence log-probabilities depend on nothing being trained and can be computed once over the whole dataset and stored, which removes an entire model from the training loop rather than making it faster. What remains is shaped around that cache. Chosen and rejected sequences share one row-major ndarray so both sides of every pair are scored in a single pass, laid out batch-major and length-bucketed so each row streams and the padding waste tracks the spread inside a bucket rather than the longest sequence in the dataset. The per-token gather, the mask, the sequence sum and the logistic loss collapse into one traversal of that block, so the per-token intermediates that dominated the previous stage are never written, and the traversal is expressed as zipped slice iterators so the bounds checks are elided rather than paid per token. Pairs are independent once packed, so rayon fans the row reductions across cores with nothing to synchronize. Every buffer is sized from the batch shape at construction, so a training step allocates nothing. The one precision decision that matters is that the token block stays f32 while the sequence sums accumulate in f64: a f32 accumulation over a few thousand tokens is large enough to move a margin and flip which pairs the loss counts as correct.',
        optimizations: [
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Chosen and rejected sequences share one row-major block, so every row streams sequentially and the cached reference values are read as a contiguous slice rather than through a map',
            tradeoff: 'Padding to the longest sequence in the bucket wastes work proportional to the spread, so unbucketed batches give back most of what the layout gains',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The fused gather-mask-sum traversal is zipped slice iterators, so the inner loop vectorizes instead of paying a bounds check per token',
            tradeoff: 'The chained form hides the index arithmetic, which is exactly where an off-by-one in the token gather would otherwise be visible',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Pairs are independent once packed, so sequence sums and per-pair losses fan out across cores with no synchronization',
            tradeoff: 'Only pays for batches of real size, and a parallel float reduction is not bit-reproducible across thread counts, which matters when a margin has to reproduce',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Token, mask and sum buffers are sized from the batch shape at construction, so a training step performs no allocation',
            tradeoff: 'Scratch stays at peak shape for the process lifetime and is not reentrant, so a worker cannot share it across threads',
          },
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Token log-probabilities arrive as a (rows, time, vocab) array whose row views are contiguous, so the gather reads one stride and the reductions stay on one kernel',
            tradeoff: 'Pulls in a BLAS backend whose thread pool must be pinned to one thread inside the rayon region, or the two pools oversubscribe and both get slower',
          },
        ],
        code: `//! Preference optimization, shaped around one observation.
//!
//! The reference policy is frozen. Its sequence log-probabilities
//! depend on nothing being trained, so they can be computed once for
//! the whole dataset and stored -- which removes an entire model from
//! the training loop, halves resident memory, and halves the forward
//! work per step. That is the largest win available here, and it is
//! structural rather than numerical.
//!
//! What remains is shaped for the cache: one row-major block holding
//! both sides of every pair, one fused traversal, and pairs fanned
//! across cores.
//!
//! What none of this changes: the peak of true quality still sits at a
//! finite KL distance, so a faster run reaches the wrong checkpoint
//! sooner unless the budget travels with it.

use ndarray::{Array3, ArrayView3, Axis};
use rayon::prelude::*;

#[derive(Debug, Clone, Copy)]
pub struct BatchShape {
    /// Two rows per pair: chosen and rejected, scored in one pass.
    pub max_rows: usize,
    pub max_tokens: usize,
}

/// Sequence log-probabilities for the frozen anchor, computed offline.
///
/// Keyed by the reference checkpoint id so a changed anchor invalidates
/// the cache rather than silently reusing numbers from a different
/// geometry -- which would leave beta specifying a trust region around
/// a policy no longer in the run.
///
/// Values are f64. They are sums over sequences of thousands of tokens,
/// and this is the one place where f32 accumulation loses enough
/// precision to move a margin.
pub struct ReferenceCache {
    checkpoint_id: String,
    chosen: Vec<f64>,
    rejected: Vec<f64>,
}

impl ReferenceCache {
    pub fn new(checkpoint_id: impl Into<String>, chosen: Vec<f64>, rejected: Vec<f64>) -> Option<Self> {
        if chosen.is_empty() || chosen.len() != rejected.len() {
            return None;
        }
        Some(Self {
            checkpoint_id: checkpoint_id.into(),
            chosen,
            rejected,
        })
    }

    #[must_use]
    pub fn checkpoint_id(&self) -> &str {
        &self.checkpoint_id
    }

    /// Contiguous slices, read directly by a step rather than looked up
    /// per pair.
    #[must_use]
    pub fn window(&self, offset: usize, count: usize) -> (&[f64], &[f64]) {
        (
            &self.chosen[offset..offset + count],
            &self.rejected[offset..offset + count],
        )
    }
}

/// Every buffer a step needs, allocated once at peak shape.
pub struct TokenBlock {
    shape: BatchShape,
    token_ids: Vec<u32>,
    mask: Vec<f32>,
    sequence_log_prob: Vec<f64>,
    rows: usize,
    width: usize,
}

impl TokenBlock {
    #[must_use]
    pub fn new(shape: BatchShape) -> Self {
        let cells = shape.max_rows * shape.max_tokens;
        let mut token_ids = Vec::with_capacity(cells);
        let mut mask = Vec::with_capacity(cells);
        let mut sequence_log_prob = Vec::with_capacity(shape.max_rows);
        token_ids.resize(cells, 0);
        mask.resize(cells, 0.0);
        sequence_log_prob.resize(shape.max_rows, 0.0);

        Self {
            shape,
            token_ids,
            mask,
            sequence_log_prob,
            rows: 0,
            width: 0,
        }
    }

    /// Length-bucketed packing into the preallocated block.
    ///
    /// Padding cost is the spread within a bucket, not the mean length,
    /// which is why callers sort before packing. Unbucketed batches are
    /// where this layout quietly gives back most of what it gained.
    pub fn pack(&mut self, sequences: &[&[u32]]) -> Option<usize> {
        if sequences.len() > self.shape.max_rows {
            return None;
        }
        let longest = sequences.iter().map(|sequence| sequence.len()).max()?;
        if longest > self.shape.max_tokens {
            return None;
        }

        for (row, sequence) in sequences.iter().enumerate() {
            let base = row * self.shape.max_tokens;
            self.token_ids[base..base + longest].fill(0);
            self.mask[base..base + longest].fill(0.0);
            self.token_ids[base..base + sequence.len()].copy_from_slice(sequence);
            self.mask[base..base + sequence.len()].fill(1.0);
        }

        self.rows = sequences.len();
        self.width = longest;
        Some(longest)
    }

    #[must_use]
    pub fn rows(&self) -> usize {
        self.rows
    }

    /// Gather, mask and sum in one traversal.
    ///
    /// \`token_log_probs\` is (rows, width, vocab) log-softmax output.
    /// The previous stages walked each sequence separately, which
    /// dominated their step cost; this is one pass with the per-token
    /// intermediates never written.
    ///
    /// f64 accumulation over an f32 block: the sum runs over thousands
    /// of tokens, and f32 error here is large enough to move a margin
    /// and flip which pairs the loss counts as correct.
    pub fn fused_sequence_log_prob(&mut self, token_log_probs: &ArrayView3<'_, f32>) -> &[f64] {
        let width = self.shape.max_tokens;
        let rows = self.rows;

        let ids = &self.token_ids;
        let mask = &self.mask;

        self.sequence_log_prob[..rows]
            .par_iter_mut()
            .enumerate()
            .for_each(|(row, slot)| {
                let block = token_log_probs.index_axis(Axis(0), row);
                let base = row * width;

                *slot = ids[base..base + width]
                    .iter()
                    .zip(&mask[base..base + width])
                    .enumerate()
                    .map(|(position, (identifier, keep))| {
                        f64::from(*keep) * f64::from(block[[position, *identifier as usize]])
                    })
                    .sum();
            });

        &self.sequence_log_prob[..rows]
    }
}

#[inline]
#[must_use]
fn log_one_plus_exp(value: f64) -> f64 {
    if value > 0.0 {
        value + (-value).exp().ln_1p()
    } else {
        value.exp().ln_1p()
    }
}

pub struct LossAndDiagnostics {
    pub loss: f64,
    pub mean_chosen_logprob: f64,
    pub mean_rejected_logprob: f64,
    pub mean_margin: f64,
    pub accuracy: f64,
}

/// Implicit rewards, margin, loss and diagnostics in one pass.
///
/// The intermediate implicit rewards are never materialized: the
/// difference of differences collapses algebraically, which is both
/// fewer temporaries and fewer chances for a sign to go astray.
///
///     margin = beta * [(pi_c - ref_c) - (pi_r - ref_r)]
///
/// The diagnostics come free because every slice is already in hand,
/// and they are the ones that matter: the objective constrains only the
/// difference, so both log-probabilities falling together satisfies it
/// perfectly while draining mass to unlabelled sequences.
#[must_use]
pub fn fused_dpo_loss(
    policy_chosen: &[f64],
    policy_rejected: &[f64],
    reference_chosen: &[f64],
    reference_rejected: &[f64],
    beta: f64,
) -> LossAndDiagnostics {
    let count = policy_chosen.len().max(1) as f64;

    let (loss, chosen_total, rejected_total, margin_total, correct) = policy_chosen
        .par_iter()
        .zip(policy_rejected)
        .zip(reference_chosen.par_iter().zip(reference_rejected))
        .map(|((policy_c, policy_r), (ref_c, ref_r))| {
            let margin = beta * ((policy_c - ref_c) - (policy_r - ref_r));
            (
                log_one_plus_exp(-margin),
                *policy_c,
                *policy_r,
                margin,
                usize::from(margin > 0.0),
            )
        })
        .reduce(
            || (0.0, 0.0, 0.0, 0.0, 0_usize),
            |left, right| {
                (
                    left.0 + right.0,
                    left.1 + right.1,
                    left.2 + right.2,
                    left.3 + right.3,
                    left.4 + right.4,
                )
            },
        );

    LossAndDiagnostics {
        loss: loss / count,
        mean_chosen_logprob: chosen_total / count,
        mean_rejected_logprob: rejected_total / count,
        mean_margin: margin_total / count,
        accuracy: correct as f64 / count,
    }
}

/// A low-variance KL estimate from log-ratios already in hand.
///
///     k3 = exp(-d) - 1 + d,   d = log pi_ref - log pi_theta
///
/// Always non-negative, unbiased, and far less noisy than the mean of
/// -d, which is negative roughly half the time on small batches and
/// makes the one plot that matters unreadable. Costs nothing here, and
/// KL from the reference is the axis every failure moves along.
#[must_use]
pub fn sequence_kl_estimate(policy: &[f64], reference: &[f64]) -> f64 {
    let count = policy.len().max(1) as f64;
    policy
        .iter()
        .zip(reference)
        .map(|(policy_value, reference_value)| {
            let log_ratio = reference_value - policy_value;
            log_ratio.exp_m1() - log_ratio
        })
        .sum::<f64>()
        / count
}

/// Group pairs of similar length before packing.
///
/// Padding cost is the spread within a batch, not the mean length, so
/// sorting first turns a mostly-padding block into a mostly-tokens one.
/// The cost is that batch composition is no longer random, which
/// correlates gradient noise across steps -- shuffle the buckets, not
/// the rows inside them.
#[must_use]
pub fn bucket_by_length(lengths: &[u32], batch_size: usize) -> Vec<Vec<u32>> {
    let mut order: Vec<u32> = (0..lengths.len() as u32).collect();
    order.sort_unstable_by_key(|&row| lengths[row as usize]);
    order
        .chunks(batch_size)
        .map(<[u32]>::to_vec)
        .collect()
}

pub struct SweepSummary {
    pub peak_checkpoint: usize,
    pub peak_kl: f64,
    pub peak_true_reward: f64,
    pub final_true_reward: f64,
    pub final_proxy_reward: f64,
    pub true_reward_lost_by_training_on: f64,
}

/// Where the curve turned, from logged checkpoints.
///
/// Cheap, and the single most useful summary of a preference run: the
/// proxy is monotone in KL while the truth is not, so the argmax of
/// true reward names the checkpoint to ship and the final step names
/// the one that would have been shipped by default.
#[must_use]
pub fn overoptimization_sweep(
    proxy_reward: &[f64],
    true_reward: &[f64],
    kl: &[f64],
) -> Option<SweepSummary> {
    if true_reward.is_empty()
        || proxy_reward.len() != true_reward.len()
        || kl.len() != true_reward.len()
    {
        return None;
    }

    let peak = true_reward
        .iter()
        .enumerate()
        .max_by(|left, right| left.1.partial_cmp(right.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(index, _)| index)?;

    Some(SweepSummary {
        peak_checkpoint: peak,
        peak_kl: kl[peak],
        peak_true_reward: true_reward[peak],
        final_true_reward: *true_reward.last()?,
        final_proxy_reward: *proxy_reward.last()?,
        true_reward_lost_by_training_on: true_reward[peak] - true_reward.last()?,
    })
}

/// Allocate the token block once, from the shape the serving loop will
/// actually see. Included so the construction site is visible: every
/// dimension here is known before the first step runs.
#[must_use]
pub fn prepare(shape: BatchShape) -> (TokenBlock, Array3<f32>) {
    (
        TokenBlock::new(shape),
        Array3::zeros((shape.max_rows, shape.max_tokens, 0)),
    )
}
`,
        profile:
          'Per step: one forward pass over 2·pairs padded sequences rather than two passes of pairs each, one fused traversal of the (rows, width, vocab) block at O(rows·width) gathered reads, and O(pairs) reductions — with the reference model absent from the loop entirely once its log-probabilities are cached. Illustrative, not a measured benchmark: the useful shape is that the cache removes a whole model rather than a constant factor, and that padding waste scales with the length spread inside a bucket, which is why bucketing matters more here than anything done to the reductions.',
      },
    },
  },
};
