import type { AiMlModel } from '../../types';

/**
 * LoRA and parameter-efficient fine-tuning — the entry where the
 * objective does not change at all.
 *
 * Everything here is a constraint on the feasible set: the same task
 * loss, minimized over a rank-r subspace through the pretrained weights
 * instead of over all of them. That framing explains both the wins and
 * the failures, because a technique that restricts rather than
 * regularizes fails by being unable to represent the update, not by
 * overfitting it.
 */
export const LORA_PEFT: AiMlModel = {
  slug: 'lora-peft',
  name: 'LoRA & Parameter-Efficient Fine-Tuning',
  aliases: ['LoRA', 'Low-Rank Adaptation', 'QLoRA', 'PEFT', 'Adapters', 'Prefix tuning'],
  category: 'generative-ai',
  group: 'adaptation-alignment',
  kind: 'technique',

  paradigms: ['supervised', 'self-supervised'],
  taskTypes: ['generation', 'sequence-modeling', 'classification', 'anomaly-detection'],
  paradigmNote:
    'The paradigm is inherited from whatever the fine-tuning data is — supervised on instruction pairs, self-supervised on continued pretraining over a domain corpus — because this technique changes the parameterization of the update and nothing about the learning signal. That is the honest characterization and it is also the useful one: anything true of full fine-tuning on the same data is true here, minus the capacity to express updates outside a low-rank subspace.',

  intuition:
    'Fine-tuning a large model means changing every weight, which means storing a gradient and two optimizer moments for every weight — several times the model\'s own size in memory before a single activation is saved. The observation behind LoRA is that the CHANGE a fine-tune makes is far simpler than the model it changes: adapting a general model to legal drafting or to one company\'s support tone is not learning language again, it is nudging behaviour the model already has. So freeze the pretrained weight and learn a low-rank correction beside it, W0 + BA with an inner dimension of eight or sixteen instead of four thousand. Two consequences fall straight out. Training memory collapses, because optimizer state is proportional to trainable parameters and there are now a thousand times fewer. And the result is a small file that means nothing on its own, which is a feature — one frozen base can serve hundreds of tenants, each with their own adapter, if you are willing to keep it unmerged. The failure mode is the mirror image of the premise: when the task really does require capability the base does not have, a low-rank update cannot express it, and no amount of tuning reveals that the ceiling is structural rather than statistical.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{A, B} \; \\mathbb{E}_{(x, y) \\sim \\mathcal{D}} \\bigl[ \\mathcal{L}\\bigl(f_{W_0 + \\frac{\\alpha}{r} BA}(x), \\, y\\bigr) \\bigr], \\quad B \\in \\mathbb{R}^{d \\times r}, \; A \\in \\mathbb{R}^{r \\times k}, \; r \\ll \\min(d, k)',
      symbols: [
        { symbol: 'W_0', meaning: 'the pretrained weight, frozen — it receives no gradient and no optimizer state' },
        { symbol: 'BA', meaning: 'the learned update, a product of two thin matrices and therefore of rank at most r' },
        { symbol: 'r', meaning: 'the rank: the entire capacity of the adaptation, and the one number that decides what cannot be learned' },
        { symbol: '\\alpha / r', meaning: 'a fixed scale on the update; dividing by r is what keeps a rank sweep from also sweeping the effective step size' },
        { symbol: '\\mathcal{L}', meaning: 'the ordinary task loss — cross-entropy, unchanged from full fine-tuning' },
      ],
    },
    reading:
      'Read what is NOT here: the loss is identical to full fine-tuning. Nothing was added, no penalty, no auxiliary term. The only change is the feasible set — the minimization runs over a rank-r subspace passing through the pretrained weights rather than over the whole parameter space. That distinction is worth holding onto, because it predicts the failure mode. A regularizer biases a search that could still reach the answer; a constraint removes the answer from the search entirely. When a task needs a full-rank change, this objective has no minimum near it, and the symptom is a loss curve that flattens early and stays there while every hyperparameter sweep comes back unhelpful. Two details in the parameterization matter more than they look. B is initialized to zero, so BA starts at zero and the adapted model starts EXACTLY at the pretrained model — there is no random perturbation to recover from, which is why these runs need no warm-up. And the alpha-over-r scaling exists so that raising the rank adds capacity without also raising the magnitude of the update; teams that hold alpha fixed while sweeping r are sweeping two things at once and usually conclude that rank does not matter.',
  },

  optimization: {
    method: 'AdamW over A and B only, with the frozen base contributing activations to the backward pass but never a weight gradient',
    updateRule: {
      formula:
        '\\frac{\\partial \\mathcal{L}}{\\partial A} = \\frac{\\alpha}{r} B^\\top \\frac{\\partial \\mathcal{L}}{\\partial h} x^\\top, \\qquad \\frac{\\partial \\mathcal{L}}{\\partial B} = \\frac{\\alpha}{r} \\frac{\\partial \\mathcal{L}}{\\partial h} (Ax)^\\top, \\qquad \\frac{\\partial \\mathcal{L}}{\\partial W_0} \; \\text{is never formed}',
      symbols: [
        { symbol: '\\partial \\mathcal{L} / \\partial h', meaning: 'the gradient arriving at the layer output — still computed, at every layer, for the full depth' },
        { symbol: 'Ax', meaning: 'the r-dimensional projection, cached from the forward pass and reused in both gradients' },
        { symbol: '\\partial \\mathcal{L} / \\partial W_0', meaning: 'the d-by-k weight gradient that full fine-tuning materializes and this one skips' },
        { symbol: '\\alpha / r', meaning: 'the same fixed scale as the forward pass, so it appears in both gradients and folds into B once in practice' },
      ],
    },
    rationale:
      'The saving is in memory, not in arithmetic, and conflating the two is the most common misunderstanding of this technique. Backpropagation still traverses the full depth of the frozen network, because the adapter in layer three needs the gradient that arrived from layer forty, so every activation gradient is computed exactly as in full fine-tuning. What disappears is the per-weight terms: the d-by-k weight gradient is never materialized, and Adam\'s two moment buffers shrink with the trainable-parameter count rather than the model size. Since those moments are the dominant training-memory cost for a large model, removing them is what lets a seven-billion-parameter model fine-tune on one consumer accelerator — and it is also why the observed speedup is modest, often well under two-fold, which surprises people who expected the parameter ratio to show up as a time ratio. Activation memory is untouched and frequently becomes the new binding constraint, which is why gradient checkpointing usually appears alongside this rather than as an alternative to it. QLoRA pushes further by holding the frozen base in four-bit and dequantizing per block during the forward pass, trading arithmetic for memory in the opposite direction from everything else here, and introducing a coupling worth naming: the adapter learns against a specific quantization, so it is no longer a clean delta on the original weights.',
    hyperparameters: [
      { name: 'rank r', role: 'The whole capacity of the adaptation. Undersized, it caps quality structurally; oversized, it mostly wastes memory rather than overfitting', typicalRange: '4 to 64, occasionally 128 or higher for continued pretraining' },
      { name: 'alpha', role: 'Scales the update as alpha over r. Reported alongside r or the number is meaningless, and holding it fixed across a rank sweep confounds the sweep', typicalRange: 'commonly r, 2r, or a fixed 16 or 32' },
      { name: 'target modules', role: 'Which projections get an adapter. The most consequential choice after rank and the least examined — attention-only versus attention-plus-MLP changes results more than doubling r', typicalRange: 'q,v projections up to every linear layer' },
      { name: 'learning rate', role: 'An order of magnitude or two above full fine-tuning, because the update starts at exactly zero and has far fewer parameters to move', typicalRange: '1e-5 to 1e-3' },
      { name: 'adapter dropout', role: 'Dropout on the adapter path only. Small datasets need it; on continued pretraining it usually does nothing', typicalRange: '0 to 0.1' },
      { name: 'base quantization', role: 'QLoRA\'s bit width for the frozen weights. Buys memory, and permanently ties the adapter to that quantization', typicalRange: '4-bit NF4, 8-bit, or none' },
    ],
    convergence:
      'Four characteristic failures, and only the first is the one people expect. Rank starvation: the task requires a change the subspace cannot represent, training loss flattens early, and every sweep comes back flat because the ceiling is structural. The tell is that full fine-tuning on the same data clears the plateau immediately, which is the one experiment that settles it and the one nobody runs because it is the expensive one. Scale confounding: sweeping r while holding alpha fixed changes the effective magnitude of the update at the same time as its capacity, and the usual conclusion — "rank did not matter" — is an artefact of the two moving together. Residual forgetting: the constraint reduces catastrophic forgetting relative to full fine-tuning but does not remove it, and nothing in the objective protects a capability the fine-tuning data never mentions; the signature is an in-domain metric improving while a general benchmark nobody ran drops several points. Quantization entanglement, specific to QLoRA: the frozen base carries a fixed quantization error, the adapter is trained to compensate for it, and merging that adapter into an unquantized base produces a measurably different model from the one that was evaluated — a silent discrepancy between the artefact tested and the artefact shipped.',
    complexity:
      'Trainable parameters per adapted matrix drop from d·k to r(d + k), which for a 4096-by-4096 projection at rank 8 is roughly 65,000 against 16.8 million. Optimizer state falls in proportion and is the saving that matters, since Adam holds two fp32 moments per trainable parameter. Forward cost adds O(r(d + k)) per adapted matrix, negligible beside the O(dk) base matmul. Backward cost is essentially unchanged, because activation gradients still propagate through every frozen layer. Activation memory is identical to full fine-tuning and typically becomes the binding constraint once optimizer state is gone.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Take a pretrained time-series foundation model — trained on a broad panel of series — and adapt it to one organization\'s data by learning low-rank corrections on the attention and projection weights while the backbone stays frozen. The inputs and targets are ordinary forecasting windows; what changes is that a few hundred series no longer have to support a full fine-tune.',
        where: [
          'Adapting a pretrained forecaster to a domain with idiosyncratic seasonality the general model never saw',
          'Per-tenant forecasting where every customer needs their own model and none of them has enough history for one',
          'Continual adaptation after a regime change, where a small adapter is retrained rather than the backbone',
          'Retail and demand panels where the base model is strong on shape but wrong on the local calendar',
        ],
        why: 'A reasonable fit, and the reason is the data-size mismatch rather than anything about time series specifically: these backbones are large and a single organization\'s panel is small, so full fine-tuning overfits before it adapts. The per-tenant story is the strongest case — one frozen backbone with a few megabytes per customer is a serving architecture that a fleet of full fine-tunes is not. Two honest limits, and the first is the one that decides the project. Classical baselines are unusually strong here; a seasonal-naive or exponential-smoothing model frequently beats an adapted foundation model on a single well-behaved panel, so the comparison must be run before the adaptation work is justified, not after. And low-rank adaptation cannot install structure the backbone lacks — if the base model has no notion of an intermittent-demand series, an adapter will not give it one, and the flat loss curve will be misread as a data problem for a week before anyone checks.',
        featurization: [
          'Normalize per series exactly as the base model\'s preprocessing did, since the adapter inherits every assumption in that pipeline',
          'Keep the context length the backbone was trained at; changing it is not something a low-rank update can absorb',
          'Split strictly by time, and hold out whole series as well, because per-tenant adapters overfit to the tenants they saw',
          'Encode local calendar and holiday effects as covariates rather than hoping the adapter discovers them',
        ],
        evaluation:
          'Rolling-origin backtesting against two baselines that must both be present: the un-adapted foundation model, which says whether the adapter did anything, and a classical seasonal method, which says whether any of it was worth doing. Report per-series as well as pooled error — a pooled improvement frequently hides a handful of large series carrying the average while the tail degrades.',
        pitfalls: [
          'No un-adapted baseline, so an adapter that changed nothing looks like a success',
          'No classical baseline, which is the comparison that most often ends the project',
          'Assuming a flat loss curve is a data problem when the rank is simply too small for the change required',
          'Adapting on a panel small enough that the adapter memorizes individual series',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Continue training a pretrained sequence model on one system\'s normal data — logs, telemetry, transaction narratives — with a low-rank adapter, then score by per-token surprisal under the adapted model. The adaptation is what makes the score domain-calibrated: a general model finds every service\'s logs surprising, which is useless.',
        where: [
          'Log anomaly detection where each service has its own vocabulary and a shared model has no threshold that works for all of them',
          'Per-tenant detectors over a frozen backbone, swapped by adapter at request time rather than deployed as separate models',
          'Narrative or free-text fraud review, where the base model supplies language and the adapter supplies the institution\'s normal',
          'Drift-triggered re-adaptation, cheap enough to rerun weekly as normal behaviour shifts',
        ],
        why: 'Genuinely useful, with the contribution in an unglamorous place: the adapter makes the score comparable within a domain. Surprisal under a general model reflects how unusual text is in general, which is a property of the corpus rather than of the system being watched, so thresholds set on it are arbitrary. Adapt to one service\'s normal and surprisal starts to mean "unlike this service", which is what the alert claims. The per-tenant economics are the other half — hundreds of adapters against one frozen backbone is affordable in a way that hundreds of fine-tunes is not. Three limits worth stating plainly. Surprisal is not a probability of anomaly and the threshold is still a quantile of observed normal scores, so it does not transfer across adapter versions. Training data contamination hurts more here than in most settings, because the adapter\'s entire job is to learn what normal looks like and a few percent of anomalies in that data teaches it that they are normal. And for structured numeric telemetry, a purpose-built detector usually wins outright — this fits where the signal is language.',
        featurization: [
          'Adapt on verified-normal data only; contamination is learned directly as normal and the metrics will not show it',
          'Template or mask high-cardinality identifiers before adaptation, or the adapter spends its rank memorizing request ids',
          'Recalibrate the threshold from a fresh normal-score quantile after every adapter retrain, since scores do not transfer across versions',
          'Keep a per-tenant normal sample for calibration rather than a pooled one, which is the reason for adapting in the first place',
        ],
        evaluation:
          'Precision at the alert volume the on-call rotation can actually absorb, not AUC — the operating point is a staffing constraint and AUC averages over volumes nobody would run. Track the alert rate on known-normal traffic as a stability check between adapter versions, because a shifted score distribution moves every threshold whether or not detection improved.',
        pitfalls: [
          'Contaminated normal data, which teaches the adapter that the anomaly is ordinary',
          'Reusing a threshold across adapter versions, when the score distribution moved underneath it',
          'Letting identifiers into the training text, which consumes the rank on memorization',
          'Choosing this over a purpose-built detector on structured numeric telemetry, where it has no advantage',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'The technique IS an optimization decision. The task loss is untouched; what changes is the feasible set, reparameterized as a rank-r subspace so that the optimizer state — the dominant memory term in large-model training — shrinks by three orders of magnitude while the objective stays the same.',
        where: [
          'Trading representational capacity for memory explicitly, with r as the dial and the trade written down rather than implied',
          'Constrained optimization as a practical tool: the constraint is what makes the problem fit on the hardware',
          'Reparameterization as a training-dynamics choice, since zero-initialized B means the run starts exactly at the pretrained model',
          'Quantization plus adaptation as coupled decisions, where QLoRA trades arithmetic for memory in the opposite direction',
        ],
        why: 'The clearest illustration in this reference of a principle worth carrying elsewhere: changing where you are allowed to search can be more useful than changing what you are searching for. Several lessons generalize. Memory and compute are separate budgets and an optimization that helps one may not touch the other — here the parameter count falls a thousandfold and the wall-clock time falls by rather less than half, which is exactly what the arithmetic predicts and consistently not what people expect. The alpha-over-r scaling is a small masterclass in experimental hygiene: without it, the capacity knob and the step-size knob are the same knob and every sweep is confounded. Zero-initializing one factor so the perturbation starts at exactly zero is a reparameterization trick that recurs well beyond adapters. And QLoRA is a clean example of a second-order coupling, where an optimization made for memory silently changes what the trained artefact is.',
        featurization: [
          'Sweep r with alpha proportional to r, or the sweep measures step size and capacity at once and resolves neither',
          'Profile activation memory before and after, since it is untouched here and usually becomes the new binding constraint',
          'Measure wall-clock separately from parameter count; the backward pass still traverses the full depth',
          'Record the target-module set with every result, because it moves quality more than rank does and is rarely reported',
        ],
        evaluation:
          'Report peak memory, wall-clock per step and task quality together, since the technique trades between them and any one number alone is a selective quote. The decisive comparison is against a full fine-tune on the same data at least once — it is the only way to tell a capacity ceiling from a data ceiling, and skipping it is how teams spend weeks tuning a rank that was never the problem.',
        pitfalls: [
          'Expecting a speedup proportional to the parameter reduction, when the backward pass is unchanged',
          'Sweeping rank with alpha held fixed, which confounds capacity with effective learning rate',
          'Never running the full fine-tuning comparison, leaving a structural ceiling indistinguishable from a data limit',
          'Reporting quality without the memory and latency numbers the technique exists to improve',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Adapt a pretrained language model to an instruction format, a domain register, or a task-specific output schema by learning low-rank updates on the attention and MLP projections. The data is ordinary supervised pairs or continued pretraining text; the adapter is what makes the run affordable and the artefact small.',
        where: [
          'Instruction tuning and style or tone adaptation on a few thousand examples',
          'Domain adaptation to legal, clinical or financial registers where vocabulary and conventions differ from general text',
          'Per-customer adapters over one frozen base in multi-tenant products, selected per request',
          'Structured-output conformance, where the task is making a capable model emit a schema reliably',
        ],
        why: 'The default way to specialize a large language model, and the argument is economic before it is technical: a few megabytes per task against tens of gigabytes per full fine-tune, with quality close enough on elicitation tasks that the gap rarely decides anything. The distinction that actually predicts success is elicitation versus acquisition. Teaching a model to answer in a house style, follow a schema, or prefer a domain\'s conventions is rearranging behaviour it already has, and a rank of eight is plenty. Teaching it a language it barely saw in pretraining, or a genuinely new capability, is acquisition, and low-rank updates are the wrong tool — the honest move there is continued pretraining at full rank or a different base model. The other caveat is quiet: adapters do not compose. Two adapters that each work do not reliably work stacked, because nothing in either objective knew about the other, and teams discover this after building a product around the assumption.',
        featurization: [
          'Match the base model\'s chat template and special tokens exactly; a mismatch degrades output with no error anywhere',
          'Mask the prompt tokens out of the loss for instruction tuning, or the model spends capacity learning to generate prompts',
          'Adapt the MLP projections as well as attention when the task is domain knowledge rather than format',
          'Hold out a general capability benchmark, because the in-domain metric cannot see what was forgotten',
        ],
        evaluation:
          'Paired in-domain quality and a general-capability benchmark, reported together — the second is the one that catches the regression the first is blind to. For instruction tuning, human or model-graded preference on a held-out prompt set beats perplexity, which moves for reasons unrelated to whether the output got better.',
        pitfalls: [
          'A chat template or tokenizer mismatch between adaptation and serving, silent and substantial',
          'Choosing low-rank adaptation for acquisition tasks, where the ceiling is structural',
          'Stacking adapters and assuming their effects compose, which nothing in the training guaranteed',
          'Shipping without a general benchmark, so forgetting is discovered by users',
        ],
      },
      'computer-vision': {
        fit: 'primary',
        how: 'Attach low-rank updates to the attention and projection weights of a vision transformer or a diffusion model\'s cross-attention, then train on a small image set. For diffusion, the adapter typically encodes a subject or a style and is applied at generation time alongside a trigger token.',
        where: [
          'Style and subject adapters for image generation, trained on tens of images',
          'Adapting a pretrained vision backbone to a specialized imaging domain — medical, industrial, satellite',
          'Cross-attention-only adaptation for text-conditioned control, which is cheaper and often sufficient',
          'Fine-grained classification on a small labelled set where a full fine-tune would overfit immediately',
        ],
        why: 'Standard practice, and in generative image models it is the dominant customization mechanism — the adapter ecosystem is large precisely because the artefacts are small and shareable. Two domain-specific points worth knowing. Which modules get adapters matters unusually much here: adapting only the text cross-attention changes what a model responds to, while adapting the backbone changes what it can render, and the two are frequently confused when results disappoint. And subject adapters trained on a handful of images overfit in a characteristic and visible way — the subject appears correctly but the model loses the ability to place it in contexts it handled before, which is forgetting that shows up as a composition failure rather than as a metric. The usual mitigations are regularization images and a deliberately low rank, and both are capacity restrictions applied on purpose.',
        featurization: [
          'Caption training images consistently, since the adapter binds behaviour to the phrasing it saw',
          'Include regularization images of the broader class to limit the collapse of everything toward the subject',
          'Prefer cross-attention adapters for conditioning changes and backbone adapters for appearance, and know which one the task needs',
          'Keep the rank deliberately small on tiny subject sets, where extra capacity buys overfitting rather than fidelity',
        ],
        evaluation:
          'Fidelity to the subject and prompt-following measured separately, because they trade against each other and a single score hides the trade. Generate a fixed prompt suite before and after, including prompts unrelated to the adaptation, since the unrelated ones are where collapse shows first.',
        pitfalls: [
          'Over-training on a small subject set until the model can render nothing else',
          'Adapting the wrong modules for the effect wanted, then blaming the rank',
          'Inconsistent captions, which make the adapter\'s behaviour unreliable to trigger',
          'Evaluating only on prompts resembling the training set, which cannot show what was lost',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Freeze a pretrained sequence or language backbone used for content and item understanding, and learn per-surface or per-market low-rank adapters against interaction data. The backbone supplies semantics; the adapter supplies the local population\'s behaviour.',
        where: [
          'Per-market or per-surface adapters over a shared content encoder',
          'Cold-start item understanding, where a text backbone is adapted to a catalogue\'s vocabulary',
          'Rapid re-adaptation after a catalogue or policy shift, retraining megabytes rather than a full model',
          'Sharing one backbone across teams that each need different behaviour from it',
        ],
        why: 'A real but secondary fit, and the boundary is worth being clear about. The ranking models that decide what a user sees are usually trained from scratch on interaction data, where there is no large pretrained artefact to adapt and this technique has nothing to attach to. Where it earns its place is the content-understanding half of the system — item text, descriptions, reviews — where a pretrained backbone exists and each surface needs a different slice of its behaviour. The serving argument is the same one as everywhere else here: one frozen backbone with small per-surface adapters is operationally simpler than a fleet of fine-tunes. The domain-specific caution is that interaction data is confounded by exposure, so an adapter trained on logged interactions partly learns the incumbent ranker\'s behaviour, and adaptation being cheap makes it easy to run that loop far more often than anyone examines it.',
        featurization: [
          'Adapt on content and text signals where a pretrained backbone exists; interaction-only models have nothing to adapt',
          'Keep the exposure confound explicit, since cheap retraining tightens the feedback loop rather than breaking it',
          'Version adapters against the backbone, because a backbone upgrade invalidates every surface\'s adapter at once',
          'Hold out whole surfaces or markets, not just rows, when the adapters are per-surface',
        ],
        evaluation:
          'Online tests decide, as always here; offline gains on logged data measure agreement with the incumbent ranker as much as quality. Between tests, watch catalogue coverage of the retrieved or ranked set per surface — an over-adapted surface narrows to a small slice of the catalogue before any accuracy metric moves.',
        pitfalls: [
          'Reaching for this on interaction-only models where there is no pretrained backbone',
          'Retraining adapters so often that the exposure feedback loop tightens unobserved',
          'Leaving adapters pinned to a backbone version nobody is willing to upgrade',
          'Trusting offline lift on logged data as evidence of an improvement to users',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The reason the technique exists: a seven-billion-parameter model that needs roughly eighty gigabytes of accelerator memory to fine-tune fully fits on a single consumer card once optimizer state is gone, and under four-bit quantization fits with room to spare. Wall-clock is a different story and consistently disappoints — the backward pass still traverses every frozen layer, so a run is typically tens of percent faster rather than the thousandfold the parameter ratio suggests. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'Two serving modes that are different systems, and choosing between them is an architecture decision rather than a flag. Merged: fold the scaled update into the weight once and the adapted model is byte-for-byte an ordinary model with exactly zero added latency — but it is now one model per adapter, and the multi-tenant economics vanish. Unmerged: keep the adapter as a side path, and a single batch can carry requests for different adapters, at the cost of an extra thin matmul per adapted matrix and the throughput lost to gathering per-request adapter weights. The second is what makes hundreds of tenants on one base possible, and it is the mode that never appears in single-adapter benchmarks.',
    retrainingCadence:
      'Cheap enough that cost stops being the constraint, which creates a different problem: adapter sprawl. Organizations accumulate dozens of adapters pinned to a base model nobody will upgrade, because upgrading invalidates all of them at once and no single team owns the re-adaptation. Plan the base-model upgrade path before the adapter count grows, not after.',
    driftAndMonitoring: [
      'A general-capability benchmark on a fixed prompt set alongside the in-domain metric, since forgetting is invisible to the metric that was optimized',
      'The base-model fingerprint each adapter was trained against, including its quantization, verified at load rather than assumed',
      'Effective rank of BA from its singular values — a rank-64 adapter using four directions is telling you the rank sweep was never run',
      'Score or output distribution shift between adapter versions, which moves every downstream threshold that was calibrated on the old one',
      'Serving-mode drift: which requests are served merged and which unmerged, because the two paths can and do diverge numerically',
    ],
    productionGotchas: [
      'An adapter is meaningless without its exact base. A different checkpoint, a different quantization of the same checkpoint, or a different tokenizer produces silent degradation rather than an error',
      'The alpha-over-r scale is part of the weights\' meaning and is stored separately from them. Load an adapter with the wrong alpha and it applies a different update with no indication',
      'Merging is not free under quantization: the adapter learned against quantization error, so merging into an unquantized base gives a model that differs from the one evaluated',
      'Adapters do not compose. Stacking two that each work is unsupported by anything in either objective, and the failures are subtle rather than obvious',
      'Unmerged multi-adapter serving has a real throughput cost that single-adapter benchmarks cannot show, and it is the mode the multi-tenant business case depends on',
      'The chat template, prompt format and special tokens used during adaptation are part of the adapter. Serving with a different template degrades output with no error',
      'Activation memory is unchanged, so a run that fits on paper by parameter count can still fail at the first long batch',
    ],
  },

  assumptions: [
    'The change required lies in or near a low-rank subspace of the pretrained weights — the intrinsic-dimension hypothesis, which holds for elicitation and fails for acquisition',
    'The base model already has the capability, so the task is to surface it rather than to install it',
    'The exact base checkpoint, including its quantization, is available at serving time and stays pinned',
    'The fine-tuning dataset is small enough that full fine-tuning would overfit, which is what makes the capacity restriction free',
    'The task does not require changing anything outside the adapted modules, which is a choice made when the target-module set is picked and rarely revisited',
  ],

  pros: [
    {
      point: 'Training memory falls by roughly the ratio of trainable parameters, because optimizer state dominates and it scales with what is trained rather than with model size',
      context: 'This is the whole reason the technique exists, and it is what puts a seven-billion-parameter fine-tune on one consumer card. It says nothing about wall-clock, which improves by far less',
    },
    {
      point: 'The artefact is a few megabytes, so hundreds of task- or tenant-specific variants cost what one full fine-tune would',
      context: 'Decisive for multi-tenant products and for any team shipping many small specializations. It requires keeping the adapter unmerged at serving time, which has its own throughput cost',
    },
    {
      point: 'Zero-initialized B means the adapted model starts exactly at the pretrained model, with no random perturbation to recover from',
      context: 'Removes the warm-up and instability that full fine-tuning of a large model often needs, and makes an untrained adapter a provable no-op rather than an approximate one',
    },
    {
      point: 'Forgetting is reduced relative to full fine-tuning, because most of the network cannot move at all',
      context: 'Reduced, not eliminated — the constrained update can still damage a capability the fine-tuning data never mentions, so the general benchmark is still required',
    },
    {
      point: 'Merging folds the update into the weights, giving an adapted model with exactly zero added inference latency',
      context: 'Available whenever one adapter per deployment is acceptable. Choosing it forfeits the per-request adapter switching that the multi-tenant case depends on',
    },
    {
      point: 'The objective is unchanged, so everything known about full fine-tuning on the same data still applies',
      context: 'Makes the technique easy to reason about and easy to compare against. The only difference to account for is what the rank-r subspace cannot express',
    },
  ],

  cons: [
    {
      point: 'A task needing a change outside the low-rank subspace has a structural ceiling that no hyperparameter reaches',
      context: 'The failure looks exactly like a data problem — a flat loss curve and unhelpful sweeps — and the only experiment that distinguishes them is a full fine-tune, which is the one teams avoid running',
    },
    {
      point: 'The speedup is far smaller than the parameter reduction suggests, because the backward pass still traverses every frozen layer',
      context: 'Consistently surprises teams who planned capacity from the parameter ratio. The saving is memory; treat time as roughly unchanged until measured',
    },
    {
      point: 'Rank and alpha interact, so a rank sweep with alpha held fixed measures step size and capacity simultaneously',
      context: 'The most common measurement error with this technique, and it reliably produces the conclusion that rank does not matter',
    },
    {
      point: 'The adapter is inseparable from its exact base, including the quantization the base was held in during training',
      context: 'Turns every base-model upgrade into a fleet-wide re-adaptation, and makes a mismatched load a silent quality regression rather than an error',
    },
    {
      point: 'Adapters do not compose; stacking two that each work is unsupported',
      context: 'Nothing in either objective knew about the other, so interference is expected. Products built on the assumption that adapters combine discover this late',
    },
    {
      point: 'Activation memory is untouched, so it becomes the binding constraint once optimizer state is gone',
      context: 'A run sized by parameter count alone still fails at the first long sequence, which is why gradient checkpointing usually appears alongside this rather than instead of it',
    },
    {
      point: 'Under QLoRA the adapter is trained against quantization error and partly learns to compensate for it',
      context: 'Merging into an unquantized base then yields a different model from the one that was evaluated — a discrepancy between the artefact tested and the artefact shipped, with nothing to signal it',
    },
  ],

  relatedSlugs: ['decoder-only-lm', 'rlhf-dpo', 'transformer', 'mixture-of-experts', 'rag'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""LoRA, transcribed from the objective.

No ML library. The point of writing it this way is that three claims
about this technique become things you can read rather than things you
are told:

    h = W0 @ x + (alpha / r) * B @ (A @ x)

First, W0 never appears on the left of an assignment after setup. It is
frozen, and freezing it is not a flag on an optimizer -- it is the
absence of any code that updates it.

Second, dL/dW0 is never formed. Look at backward() below: it computes
the gradient flowing BACK through the layer (needed, because layers
below this one still have adapters), and it computes dL/dA and dL/dB.
The d-by-k weight gradient that full fine-tuning would materialize is
simply not there. That single missing array is the entire memory
argument.

Third, B starts at zero, so the adapted model starts EXACTLY at the
pretrained model. Not approximately. There is nothing to warm up.
"""

import math
import random

Matrix = list[list[float]]
Vector = list[float]


def zeros(rows: int, cols: int) -> Matrix:
    return [[0.0 for _ in range(cols)] for _ in range(rows)]


def matvec(matrix: Matrix, vector: Vector) -> Vector:
    out = []
    for row in matrix:
        total = 0.0
        for index in range(len(vector)):
            total += row[index] * vector[index]
        out.append(total)
    return out


def matvec_transposed(matrix: Matrix, vector: Vector) -> Vector:
    """matrix.T @ vector, without building the transpose."""
    cols = len(matrix[0])
    out = [0.0] * cols
    for row_index, row in enumerate(matrix):
        scale = vector[row_index]
        if scale == 0.0:
            continue
        for col_index in range(cols):
            out[col_index] += row[col_index] * scale
    return out


def add_outer(target: Matrix, left: Vector, right: Vector, scale: float) -> None:
    """target += scale * outer(left, right), in place."""
    for row_index, left_value in enumerate(left):
        if left_value == 0.0:
            continue
        row = target[row_index]
        for col_index, right_value in enumerate(right):
            row[col_index] += scale * left_value * right_value


class LoRALinear:
    """One adapted projection: a frozen W0 plus a learned rank-r update.

    The shapes are the whole story. W0 is d-by-k and holds d*k numbers
    that will never change. A is r-by-k and B is d-by-r, and together
    they hold r*(d+k), which for d = k = 4096 and r = 8 is about 65
    thousand against 16.8 million.
    """

    def __init__(self, d_out, d_in, rank, alpha, rng):
        if rank <= 0 or rank > min(d_out, d_in):
            raise ValueError("rank must be in 1..min(d_out, d_in)")

        # Frozen. Stands in for a pretrained weight; in reality this is
        # loaded, and it is the only large array in this class.
        self.w0 = [
            [rng.gauss(0.0, 1.0 / math.sqrt(d_in)) for _ in range(d_in)]
            for _ in range(d_out)
        ]

        # A is initialized randomly and B at zero, so B @ A == 0 at step
        # zero and the layer is exactly W0. Reversing which one is zero
        # would work too; what must not happen is both being random,
        # which perturbs a pretrained model before training starts.
        self.a = [
            [rng.gauss(0.0, 1.0 / math.sqrt(d_in)) for _ in range(d_in)]
            for _ in range(rank)
        ]
        self.b = zeros(d_out, rank)

        self.rank = rank
        self.alpha = alpha
        # alpha / r, not alpha. Dividing by the rank is what lets you
        # raise r without also raising the magnitude of the update --
        # the difference between sweeping capacity and sweeping two
        # things at once.
        self.scale = alpha / rank

        self.grad_a = zeros(rank, d_in)
        self.grad_b = zeros(d_out, rank)
        self.cached_x = None
        self.cached_ax = None

    def forward(self, x: Vector) -> Vector:
        base = matvec(self.w0, x)
        projected = matvec(self.a, x)              # r numbers
        update = matvec(self.b, projected)         # d numbers
        self.cached_x = x
        self.cached_ax = projected
        return [base[i] + self.scale * update[i] for i in range(len(base))]

    def backward(self, grad_h: Vector) -> Vector:
        """Accumulate dL/dA and dL/dB; return dL/dx.

        dL/dx still needs W0, because layers below this one have
        adapters of their own and their gradients have to arrive. This
        is why LoRA saves memory and not much time: the backward pass
        walks the full depth exactly as it would otherwise.
        """
        # dL/dB = scale * grad_h (A x)^T
        add_outer(self.grad_b, grad_h, self.cached_ax, self.scale)

        # dL/dA = scale * (B^T grad_h) x^T
        back_through_b = matvec_transposed(self.b, grad_h)
        add_outer(self.grad_a, back_through_b, self.cached_x, self.scale)

        # dL/dx = W0^T grad_h + scale * A^T B^T grad_h.
        # Note what is absent: no outer product against W0 is ever
        # formed. That array is dL/dW0, and it is the one full
        # fine-tuning cannot avoid.
        through_base = matvec_transposed(self.w0, grad_h)
        through_adapter = matvec_transposed(self.a, back_through_b)
        return [
            through_base[i] + self.scale * through_adapter[i]
            for i in range(len(through_base))
        ]

    def zero_grad(self) -> None:
        for row in self.grad_a:
            for index in range(len(row)):
                row[index] = 0.0
        for row in self.grad_b:
            for index in range(len(row)):
                row[index] = 0.0

    def trainable_parameters(self) -> int:
        return self.rank * (len(self.a[0]) + len(self.b))

    def frozen_parameters(self) -> int:
        return len(self.w0) * len(self.w0[0])

    def merge(self) -> Matrix:
        """W0 + (alpha / r) B A, materialized.

        Zero added latency afterwards, because the result is an ordinary
        weight matrix. And the adapter is gone: one merged model serves
        one adapter, which is exactly the property the multi-tenant case
        is built on not having.
        """
        merged = [row[:] for row in self.w0]
        for out_index in range(len(self.b)):
            b_row = self.b[out_index]
            target = merged[out_index]
            for rank_index in range(self.rank):
                weight = self.scale * b_row[rank_index]
                if weight == 0.0:
                    continue
                a_row = self.a[rank_index]
                for in_index in range(len(a_row)):
                    target[in_index] += weight * a_row[in_index]
        return merged


class Adam:
    """Two moment buffers per trainable parameter, allocated here.

    Written out because this is the cost LoRA removes. Every buffer
    below is sized to the adapter, not to W0, and that ratio -- not the
    forward arithmetic -- is why the technique exists.
    """

    def __init__(self, shapes, lr, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.step_count = 0
        self.m = [zeros(rows, cols) for rows, cols in shapes]
        self.v = [zeros(rows, cols) for rows, cols in shapes]

    def step(self, params, grads):
        self.step_count += 1
        bias1 = 1.0 - self.beta1 ** self.step_count
        bias2 = 1.0 - self.beta2 ** self.step_count

        for slot, (param, grad) in enumerate(zip(params, grads)):
            m_buffer = self.m[slot]
            v_buffer = self.v[slot]
            for row_index, row in enumerate(param):
                grad_row = grad[row_index]
                m_row = m_buffer[row_index]
                v_row = v_buffer[row_index]
                for col_index in range(len(row)):
                    gradient = grad_row[col_index]
                    m_row[col_index] = (
                        self.beta1 * m_row[col_index] + (1.0 - self.beta1) * gradient
                    )
                    v_row[col_index] = (
                        self.beta2 * v_row[col_index]
                        + (1.0 - self.beta2) * gradient * gradient
                    )
                    m_hat = m_row[col_index] / bias1
                    v_hat = v_row[col_index] / bias2
                    row[col_index] -= self.lr * m_hat / (math.sqrt(v_hat) + self.eps)


def squared_error(prediction: Vector, target: Vector) -> float:
    return sum((p - t) ** 2 for p, t in zip(prediction, target)) / len(target)


def squared_error_grad(prediction: Vector, target: Vector) -> Vector:
    scale = 2.0 / len(target)
    return [scale * (p - t) for p, t in zip(prediction, target)]


def train(layer: LoRALinear, samples, epochs: int, lr: float):
    """The ordinary loop. The loss is the ordinary loss.

    Nothing in here is LoRA-specific, which is the point: the objective
    did not change, only the set of parameters the optimizer was handed.
    """
    optimizer = Adam(
        shapes=[(len(layer.a), len(layer.a[0])), (len(layer.b), len(layer.b[0]))],
        lr=lr,
    )

    history = []
    for _ in range(epochs):
        total = 0.0
        layer.zero_grad()
        for x, target in samples:
            prediction = layer.forward(x)
            total += squared_error(prediction, target)
            layer.backward(squared_error_grad(prediction, target))
        optimizer.step([layer.a, layer.b], [layer.grad_a, layer.grad_b])
        history.append(total / len(samples))
    return history


def rank_ceiling_demo(d: int, target_rank: int, adapter_rank: int, seed: int = 0):
    """The experiment that distinguishes a capacity ceiling from a data
    problem, run small enough to read.

    A target update of rank target_rank is planted, then fitted with an
    adapter of rank adapter_rank. When adapter_rank < target_rank the
    loss flattens at a positive floor and stays there -- not because the
    data is bad, not because the learning rate is wrong, but because the
    answer is outside the feasible set. In production this presents as a
    week of unhelpful sweeps.
    """
    rng = random.Random(seed)
    layer = LoRALinear(d, d, adapter_rank, alpha=adapter_rank, rng=rng)

    # Plant a rank-target_rank delta and generate data through W0 + it.
    left = [[rng.gauss(0.0, 0.4) for _ in range(target_rank)] for _ in range(d)]
    right = [[rng.gauss(0.0, 0.4) for _ in range(d)] for _ in range(target_rank)]

    samples = []
    for _ in range(64):
        x = [rng.gauss(0.0, 1.0) for _ in range(d)]
        base = matvec(layer.w0, x)
        delta = matvec(left, matvec(right, x))
        samples.append((x, [base[i] + delta[i] for i in range(d)]))

    history = train(layer, samples, epochs=400, lr=0.05)
    return {
        "final_loss": history[-1],
        "trainable": layer.trainable_parameters(),
        "frozen": layer.frozen_parameters(),
        "ratio": layer.frozen_parameters() / layer.trainable_parameters(),
    }
`,
        profile:
          'Per sample: one O(d·k) base matvec, two adapter matvecs at O(rk) and O(dr), and a backward pass that repeats all three plus two outer-product accumulations at O(rk) and O(dr). Illustrative, not a measured benchmark: the shape to read off is that the adapter terms are linear in r while the base term is quadratic in the layer width, so the forward cost is essentially unchanged and the arrays that vanish — dL/dW0 and its two Adam moments — are the ones that were never allocated here.',
      },
      'make-it-right': {
        rationale:
          'The configuration becomes a frozen dataclass validated once at construction, because rank, alpha and the target-module set are the three numbers that decide what the run can learn and every one of them is silently accepted by the literal version. The alpha-over-r scale travels with the weights rather than living in whoever launched the job, which is the fix for the most common silent misload of this technique: an adapter loaded with a different alpha applies a different update and reports nothing. The base model gets a fingerprint — checkpoint identity and quantization together — checked when an adapter is attached, so an adapter meeting a base it was not trained against raises instead of quietly degrading. Merging becomes a context manager, so the unmerge always happens even when the evaluation inside raises, and the merged and unmerged paths are verified to agree numerically rather than assumed to. Every recoverable failure names the values that caused it: a rank exceeding the matrix it adapts, a mismatched base, a merge attempted against a quantized weight the adapter was trained to compensate for. And the diagnostics that actually catch this technique failing are here as functions rather than as advice — effective rank from the update\'s spectrum, which says whether the rank sweep was ever run, and a retained-capability check, which is the only thing that sees the forgetting the in-domain metric cannot.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'Context managers for resource cleanup',
        ],
        code: `"""LoRA with the three silent failures made loud.

The literal version accepted all of these without complaint:

  * an adapter loaded against a base it was not trained on, which
    degrades quality and raises nothing;
  * an alpha that differs from the one the adapter was trained with,
    which applies a different update with no indication;
  * a merge left in place after an evaluation raised, so the next
    caller gets a model that is not the one they asked for.

Each becomes an exception or a context manager here. The fourth thing
that is added is diagnostic rather than defensive: effective_rank() and
retained_capability() are the two measurements that distinguish this
technique working from this technique appearing to work.
"""

from __future__ import annotations

import contextlib
import json
from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float32]


class AdapterError(Exception):
    """Base for every recoverable failure in adaptation."""


class InvalidAdapterConfig(AdapterError):
    """Rank, alpha or target modules cannot describe a usable adapter."""


class BaseModelMismatch(AdapterError):
    """The adapter was trained against a different base than this one.

    Includes quantization: an adapter trained against a four-bit base
    learned to compensate for that base's quantization error, so the
    same checkpoint in full precision is a different model as far as
    this adapter is concerned.
    """


class MergeNotSupported(AdapterError):
    """Merging would silently change the model that was evaluated."""


@dataclass(frozen=True)
class BaseFingerprint:
    """What an adapter is pinned to. All three parts, not just the name."""

    checkpoint_id: str
    quantization: str
    tokenizer_id: str

    def describe(self) -> str:
        return f"{self.checkpoint_id}[{self.quantization}]/{self.tokenizer_id}"


@dataclass(frozen=True)
class AdapterConfig:
    """Validated once, at construction, rather than trusted per call.

    Frozen because these values are part of the artefact's meaning:
    changing alpha after training does not adjust the adapter, it
    applies a different update with the same weights.
    """

    rank: int
    alpha: float
    target_modules: tuple[str, ...]
    dropout: float = 0.0

    def __post_init__(self) -> None:
        if self.rank <= 0:
            raise InvalidAdapterConfig(f"rank must be positive, got {self.rank}")
        if self.alpha <= 0.0:
            raise InvalidAdapterConfig(f"alpha must be positive, got {self.alpha}")
        if not self.target_modules:
            raise InvalidAdapterConfig(
                "no target modules: an adapter attached to nothing trains nothing"
            )
        if not 0.0 <= self.dropout < 1.0:
            raise InvalidAdapterConfig(f"dropout must be in [0, 1), got {self.dropout}")

    @property
    def scale(self) -> float:
        """alpha / r. Read from the config, never recomputed by a caller.

        Sweeping rank with alpha fixed sweeps this too, which is why a
        rank study that holds alpha constant measures two things and
        resolves neither.
        """
        return self.alpha / self.rank


@dataclass
class LoRAAdapter:
    """A frozen projection plus its rank-r update.

    The weight is a view onto the base model's array, never a copy. That
    is not only memory: a copy would let the adapter and the base drift
    apart, and an adapter whose frozen half has drifted is the hardest
    version of this bug to find.
    """

    name: str
    base_weight: FloatArray
    config: AdapterConfig
    fingerprint: BaseFingerprint
    down: FloatArray = field(init=False)
    up: FloatArray = field(init=False)
    _merged: bool = field(default=False, init=False)

    def __post_init__(self) -> None:
        out_features, in_features = self.base_weight.shape
        if self.config.rank > min(out_features, in_features):
            raise InvalidAdapterConfig(
                f"rank {self.config.rank} exceeds min dimension "
                f"{min(out_features, in_features)} of {self.name}; "
                "a full-rank update is just fine-tuning with extra steps"
            )

        rng = np.random.default_rng(abs(hash(self.name)) % (2**32))
        self.down = rng.normal(
            0.0, in_features**-0.5, size=(self.config.rank, in_features)
        ).astype(np.float32)
        # Zero, so the adapted model starts exactly at the pretrained
        # one. An untrained adapter is a provable no-op, not an
        # approximate one.
        self.up = np.zeros((out_features, self.config.rank), dtype=np.float32)

    @property
    def trainable_parameters(self) -> int:
        return int(self.down.size + self.up.size)

    @property
    def frozen_parameters(self) -> int:
        return int(self.base_weight.size)

    def delta(self) -> FloatArray:
        """The update alone, scaled. Materialized only for diagnostics."""
        return self.config.scale * (self.up @ self.down)

    def forward(self, activations: FloatArray) -> FloatArray:
        if activations.shape[-1] != self.base_weight.shape[1]:
            raise ValueError(
                f"{self.name}: expected {self.base_weight.shape[1]} input features, "
                f"got {activations.shape[-1]}"
            )

        base = activations @ self.base_weight.T
        if self._merged:
            return base
        return base + self.config.scale * (activations @ self.down.T) @ self.up.T

    @contextlib.contextmanager
    def merged(self) -> Iterator[None]:
        """Temporarily fold the update into the weight.

        A context manager rather than a merge()/unmerge() pair because
        the evaluation inside will eventually raise, and an unmerge that
        depends on an exception not happening is an unmerge that will be
        skipped exactly when it matters. On exit the base weight is
        restored bit-for-bit.
        """
        if self.fingerprint.quantization != "none":
            raise MergeNotSupported(
                f"{self.name}: base is {self.fingerprint.quantization}; the adapter "
                "was trained against that quantization error, so merging into a "
                "dequantized weight yields a different model than was evaluated"
            )

        original = self.base_weight.copy()
        self.base_weight += self.delta()
        self._merged = True
        try:
            yield
        finally:
            self.base_weight[...] = original
            self._merged = False


def effective_rank(adapter: LoRAAdapter, energy: float = 0.99) -> int:
    """Directions the update actually uses, from its spectrum.

    A rank-64 adapter whose delta has four meaningful singular values is
    reporting that the rank sweep was never run. Cheap to compute and
    almost never computed, which is why rank is usually a number someone
    copied from a blog post.
    """
    if not 0.0 < energy <= 1.0:
        raise ValueError(f"energy must be in (0, 1], got {energy}")

    singular_values = np.linalg.svd(adapter.delta(), compute_uv=False)
    total = float(singular_values.sum())
    if total == 0.0:
        return 0

    cumulative = np.cumsum(singular_values) / total
    return int(np.searchsorted(cumulative, energy) + 1)


def retained_capability(
    before: Sequence[float], after: Sequence[float], tolerance: float = 0.02
) -> tuple[bool, float]:
    """Did adaptation cost something the in-domain metric cannot see?

    Guard clauses rather than nesting, because the interesting path is
    the comparison and the uninteresting paths are all early exits.
    """
    if len(before) != len(after):
        raise ValueError(f"score counts differ: {len(before)} vs {len(after)}")
    if not before:
        raise ValueError("no held-out capability scores; forgetting is unmeasured")

    drop = float(np.mean(before) - np.mean(after))
    return drop <= tolerance, drop


class AdapterSet:
    """Adapters attached to one base, sharing one fingerprint."""

    def __init__(self, fingerprint: BaseFingerprint, config: AdapterConfig) -> None:
        self.fingerprint = fingerprint
        self.config = config
        self._adapters: dict[str, LoRAAdapter] = {}

    def attach(self, name: str, base_weight: FloatArray) -> LoRAAdapter:
        if name in self._adapters:
            raise InvalidAdapterConfig(f"{name} already has an adapter attached")
        if not any(pattern in name for pattern in self.config.target_modules):
            raise InvalidAdapterConfig(
                f"{name} matches none of {self.config.target_modules}; "
                "the target-module set moves quality more than rank does"
            )

        adapter = LoRAAdapter(
            name=name,
            base_weight=base_weight,
            config=self.config,
            fingerprint=self.fingerprint,
        )
        self._adapters[name] = adapter
        return adapter

    @property
    def trainable_parameters(self) -> int:
        return sum(item.trainable_parameters for item in self._adapters.values())

    @property
    def frozen_parameters(self) -> int:
        return sum(item.frozen_parameters for item in self._adapters.values())

    def save(self, directory: Path) -> None:
        """Weights and the scale that gives them meaning, together.

        Storing alpha and rank beside the tensors is the whole point.
        An adapter file without them is a set of numbers that can be
        applied at any magnitude, and it will be.
        """
        directory.mkdir(parents=True, exist_ok=True)
        manifest = {
            "rank": self.config.rank,
            "alpha": self.config.alpha,
            "target_modules": list(self.config.target_modules),
            "base": {
                "checkpoint_id": self.fingerprint.checkpoint_id,
                "quantization": self.fingerprint.quantization,
                "tokenizer_id": self.fingerprint.tokenizer_id,
            },
            "modules": sorted(self._adapters),
        }
        (directory / "adapter_config.json").write_text(json.dumps(manifest, indent=2))

        tensors = {}
        for name, adapter in self._adapters.items():
            tensors[f"{name}.lora_down"] = adapter.down
            tensors[f"{name}.lora_up"] = adapter.up
        np.savez(directory / "adapter_model.npz", **tensors)

    @classmethod
    def load(
        cls, directory: Path, serving_fingerprint: BaseFingerprint
    ) -> tuple[AdapterConfig, dict[str, FloatArray]]:
        """Refuse a mismatched base rather than degrade against it."""
        manifest = json.loads((directory / "adapter_config.json").read_text())
        trained_against = BaseFingerprint(**manifest["base"])

        if trained_against != serving_fingerprint:
            raise BaseModelMismatch(
                f"adapter trained against {trained_against.describe()}, "
                f"serving {serving_fingerprint.describe()}"
            )

        config = AdapterConfig(
            rank=manifest["rank"],
            alpha=manifest["alpha"],
            target_modules=tuple(manifest["target_modules"]),
        )
        with np.load(directory / "adapter_model.npz") as archive:
            tensors = {key: archive[key].astype(np.float32) for key in archive.files}
        return config, tensors
`,
        profile:
          'Asymptotically identical to the literal version — the same base matmul and the same two thin adapter matmuls — with the per-sample Python loop replaced by array operations, so the constant factor falls by orders of magnitude without any change in what is computed. Illustrative, not a measured benchmark: the substantive change is that a mismatched base, a rank exceeding the matrix it adapts, a merge against a quantized weight and an unmerge skipped by an exception are all failures a caller must now handle, where the literal version produced a plausible model for each.',
      },
      'make-it-fast': {
        rationale:
          'The optimization that matters here is not the single-adapter forward pass — that was already two thin matmuls beside a large one — it is serving many adapters in one batch, which is the mode the whole multi-tenant argument depends on and the mode that never appears in a single-adapter benchmark. Adapters are stacked into one contiguous (n_adapters, rank, in_features) tensor per module and selected by index, so a mixed batch becomes a gather plus one batched matmul instead of a Python loop over tenants; the gather is a strided read out of a single allocation rather than a walk over per-adapter arrays scattered across the heap. The alpha-over-r scale is folded into the up-projection once at load time, removing a full-width multiply from every forward pass and from every backward pass, where it otherwise appears twice. The two adapter matmuls are fused into the base output with in-place accumulation, so the d-wide intermediate that the literal version returned is never materialized; at batch scale that intermediate is the largest short-lived allocation in the layer. Scratch for the r-wide projection is allocated once at the maximum batch shape and sliced, so a serving loop performs no per-request allocation. Everything is float32 and C-contiguous end to end, which is what keeps BLAS on its fast path rather than silently copying for every call.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'A mixed-tenant batch becomes one gather and one batched matmul rather than a Python loop that pays dispatch per request',
            tradeoff: 'Requests must be grouped before they can be served, so batching adds queueing latency to every request in exchange for throughput',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The adapter output accumulates into the base result in place, so the full-width intermediate is never allocated',
            tradeoff: 'The base output is destroyed as it is updated, so anything needing the unadapted activations must copy them explicitly',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The r-wide projection scratch is sized once at the maximum batch shape and sliced per call, so serving allocates nothing per request',
            tradeoff: 'Scratch is held at peak shape for the process lifetime and the buffers are not reentrant, so a worker cannot share them across threads',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Stacked adapters in one C-contiguous float32 tensor let the per-request gather be a strided read and keep every matmul on the BLAS fast path',
            tradeoff: 'Adding or removing a tenant reallocates the whole stack, so the adapter set is effectively immutable between reloads',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The per-adapter update becomes one batched matmul over the gathered slices instead of a matmul per request',
            tradeoff: 'The batched form gathers a rank-by-in_features slab per row, so memory traffic grows with batch size even though the arithmetic does not',
          },
        ],
        code: `"""LoRA serving, shaped for the case the technique exists for.

One frozen base, many adapters, mixed in a single batch. The layout
follows from that: adapters stacked contiguously and selected by index,
the scale folded into the weights at load, the update accumulated into
the base output in place, and scratch allocated once.

What this does NOT change is worth stating first, because it is the
thing people expect it to change. The backward pass still walks the
full depth of the frozen model, so training throughput here is close to
full fine-tuning's. The saving was always memory.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float32]
IndexArray = npt.NDArray[np.int32]


@dataclass(frozen=True)
class ServingShape:
    max_batch: int
    rank: int
    in_features: int
    out_features: int


class StackedAdapters:
    """Every tenant's adapter for one module, in two contiguous tensors.

    down is (n_adapters, rank, in_features) and up is
    (n_adapters, out_features, rank), both C-contiguous float32. One
    allocation each, so selecting an adapter is a strided read rather
    than a pointer chase through n_adapters separate arrays -- which is
    the difference between a gather that streams and one that stalls.

    The cost of this layout is that the set is immutable: adding a
    tenant reallocates both tensors. That is the right trade for a
    serving process that reloads on a schedule, and the wrong one for a
    system that wants to register adapters at runtime.
    """

    def __init__(self, shape: ServingShape, n_adapters: int) -> None:
        self.shape = shape
        self.down = np.zeros(
            (n_adapters, shape.rank, shape.in_features), dtype=np.float32
        )
        self.up = np.zeros(
            (n_adapters, shape.out_features, shape.rank), dtype=np.float32
        )

        # Scratch at the largest batch shape, sliced per call. A serving
        # loop that allocates per request spends a measurable share of a
        # cheap layer inside the allocator.
        self._projection = np.empty((shape.max_batch, shape.rank), dtype=np.float32)
        self._gathered_down = np.empty(
            (shape.max_batch, shape.rank, shape.in_features), dtype=np.float32
        )
        self._gathered_up = np.empty(
            (shape.max_batch, shape.out_features, shape.rank), dtype=np.float32
        )

    def load(self, slot: int, down: FloatArray, up: FloatArray, scale: float) -> None:
        """Fold alpha/r into up once, here, and never again.

        The scale is a constant of the adapter, so applying it per
        forward pass is a full out_features-wide multiply repeated for
        the life of the deployment. Folding it in at load costs one
        multiply per weight, total.

        It also means the stored tensors are no longer the trained ones,
        so the manifest's alpha must not be re-applied downstream --
        exactly the kind of bookkeeping that has to be written down.
        """
        np.copyto(self.down[slot], down)
        np.multiply(up, np.float32(scale), out=self.up[slot], casting="same_kind")

    def forward(
        self, activations: FloatArray, base_weight: FloatArray, slots: IndexArray
    ) -> FloatArray:
        """Mixed-adapter batch in two batched matmuls.

        activations is (batch, in_features); slots[i] names the adapter
        for row i. The base matmul is shared across the whole batch --
        one frozen weight, which is the entire operational argument for
        this technique -- and only the thin update varies per row.
        """
        batch = activations.shape[0]
        if batch > self.shape.max_batch:
            raise ValueError(
                f"batch {batch} exceeds scratch shape {self.shape.max_batch}"
            )

        # Shared across every tenant in the batch, at full BLAS
        # throughput. This is the dominant term and it is paid once.
        out = activations @ base_weight.T

        # Gather into preallocated scratch rather than fancy-indexing
        # into a fresh array, which would allocate per call.
        np.take(self.down, slots, axis=0, out=self._gathered_down[:batch])
        np.take(self.up, slots, axis=0, out=self._gathered_up[:batch])

        # (batch, 1, in) @ (batch, in, rank) -> (batch, 1, rank).
        # einsum keeps the shape contract readable; the arithmetic is
        # the same batched GEMM either way.
        projection = np.einsum(
            "bi,bri->br",
            activations,
            self._gathered_down[:batch],
            out=self._projection[:batch],
            optimize=True,
        )

        # Accumulate in place. The out_features-wide intermediate the
        # earlier stages returned is never allocated; at batch scale it
        # is the largest short-lived array in the layer.
        out += np.einsum("br,bor->bo", projection, self._gathered_up[:batch])
        return out


class HomogeneousBatch:
    """The faster path when a batch happens to share one adapter.

    Worth having separately because it is common -- a single-tenant
    deployment, or a scheduler that groups by adapter -- and because the
    gather disappears entirely: one (rank, in) matmul for the whole
    batch instead of a per-row slab. Grouping requests by adapter before
    serving turns the general path into this one, at the cost of holding
    requests until a group forms.
    """

    def __init__(self, down: FloatArray, up: FloatArray, scale: float) -> None:
        self.down = np.ascontiguousarray(down, dtype=np.float32)
        self.up = np.ascontiguousarray(up * np.float32(scale), dtype=np.float32)

    def forward(self, activations: FloatArray, base_weight: FloatArray) -> FloatArray:
        out = activations @ base_weight.T
        # Two matmuls, no gather, no per-row slab. Fused into out so the
        # intermediate never lands.
        out += (activations @ self.down.T) @ self.up.T
        return out


def group_by_adapter(slots: IndexArray) -> list[tuple[int, IndexArray]]:
    """Turn a mixed batch into homogeneous runs.

    A sort plus a boundary scan, vectorized rather than a Python loop
    over requests. Whether this pays depends on the tenant distribution:
    a batch of sixty-four distinct adapters gains nothing and has paid
    for a sort, while skewed traffic -- which is what real multi-tenant
    traffic looks like -- collapses to a handful of groups.
    """
    order = np.argsort(slots, kind="stable")
    ordered = slots[order]
    boundaries = np.flatnonzero(np.diff(ordered)) + 1
    runs = np.split(order, boundaries)
    return [(int(ordered[run[0]]), run.astype(np.int32)) for run in runs]


def memory_breakdown(
    n_parameters: int, trainable: int, bytes_per_parameter: int = 4
) -> dict[str, float]:
    """Where the memory actually went, in gigabytes.

    Included because the number people plan capacity from -- the
    trainable-parameter ratio -- is not the number that decides whether
    a run fits. Optimizer state scales with trainable parameters and
    collapses; frozen weights and activations do not move at all, and
    activations are usually what fails first.
    """
    gigabyte = 1024**3
    frozen = n_parameters * bytes_per_parameter / gigabyte
    gradients = trainable * bytes_per_parameter / gigabyte
    # Adam keeps two fp32 moments per trainable parameter. This is the
    # term the technique removes, and the only one.
    optimizer = trainable * 2 * 4 / gigabyte
    return {
        "frozen_weights_gb": frozen,
        "gradients_gb": gradients,
        "optimizer_state_gb": optimizer,
        "trainable_fraction": trainable / n_parameters,
        "note": "activation memory is unchanged and is excluded here on purpose",
    }
`,
        profile:
          'Per batched forward: one (batch x in x out) GEMM shared across every tenant, plus a gather of batch rank-by-in and out-by-rank slabs and two batched matmuls at O(batch·rank·in) and O(batch·rank·out). Illustrative, not a measured benchmark: the shape worth reading is that arithmetic in the adapter path is linear in rank while the gather\'s memory traffic is linear in batch size, so the mixed-adapter path is bandwidth-bound where the homogeneous path is not — which is why grouping by adapter, when traffic allows it, is the larger win than anything done to the matmuls.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// LoRA, transcribed from the objective.
//
// No library. Three claims become readable rather than asserted:
//
//     h = W0 * x + (alpha / r) * B * (A * x)
//
// 1. w0_ appears on the left of an assignment exactly once, in the
//    constructor. Freezing a weight is not a flag -- it is the absence
//    of any code that writes to it.
//
// 2. dL/dW0 is never formed. Backward() computes the gradient flowing
//    back through the layer, because layers below have adapters of
//    their own, and it computes dL/dA and dL/dB. The d-by-k array that
//    full fine-tuning cannot avoid is simply not here, and that one
//    missing allocation is the whole memory argument.
//
// 3. up_ starts at zero, so the adapted model starts EXACTLY at the
//    pretrained one. Not approximately: there is nothing to warm up.

#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

namespace lora {

// Row-major, stored flat. Written out rather than nested vectors
// because the layout is load-bearing later and it is worth seeing it
// from the start.
struct Matrix {
  std::size_t rows;
  std::size_t cols;
  std::vector<float> data;

  Matrix(std::size_t row_count, std::size_t col_count)
      : rows(row_count), cols(col_count), data(row_count * col_count, 0.0F) {}

  float& At(std::size_t row, std::size_t col) { return data[row * cols + col]; }
  float At(std::size_t row, std::size_t col) const { return data[row * cols + col]; }
};

std::vector<float> MatVec(const Matrix& matrix, const std::vector<float>& vector) {
  std::vector<float> out(matrix.rows, 0.0F);
  for (std::size_t row = 0; row < matrix.rows; ++row) {
    float total = 0.0F;
    for (std::size_t col = 0; col < matrix.cols; ++col) {
      total += matrix.At(row, col) * vector[col];
    }
    out[row] = total;
  }
  return out;
}

// matrix^T * vector, without building the transpose.
std::vector<float> MatVecTransposed(const Matrix& matrix,
                                    const std::vector<float>& vector) {
  std::vector<float> out(matrix.cols, 0.0F);
  for (std::size_t row = 0; row < matrix.rows; ++row) {
    const float scale = vector[row];
    if (scale == 0.0F) {
      continue;
    }
    for (std::size_t col = 0; col < matrix.cols; ++col) {
      out[col] += matrix.At(row, col) * scale;
    }
  }
  return out;
}

// target += scale * outer(left, right)
void AddOuter(Matrix& target, const std::vector<float>& left,
              const std::vector<float>& right, float scale) {
  for (std::size_t row = 0; row < target.rows; ++row) {
    const float left_value = left[row];
    if (left_value == 0.0F) {
      continue;
    }
    for (std::size_t col = 0; col < target.cols; ++col) {
      target.At(row, col) += scale * left_value * right[col];
    }
  }
}

// One adapted projection.
//
// The shapes are the argument. w0_ is d-by-k and holds d*k numbers that
// will never change. down_ is r-by-k, up_ is d-by-r, and together they
// hold r*(d+k) -- for d = k = 4096 and r = 8, about 65 thousand against
// 16.8 million.
class LoRALinear {
 public:
  LoRALinear(std::size_t out_features, std::size_t in_features, std::size_t rank,
             float alpha, unsigned seed)
      : w0_(out_features, in_features),
        down_(rank, in_features),
        up_(out_features, rank),
        grad_down_(rank, in_features),
        grad_up_(out_features, rank),
        rank_(rank),
        // alpha / r, not alpha. Dividing by the rank is what lets r
        // rise without the magnitude of the update rising with it --
        // the difference between sweeping capacity and sweeping two
        // things at once and resolving neither.
        scale_(alpha / static_cast<float>(rank)) {
    std::mt19937 generator(seed);
    std::normal_distribution<float> normal(
        0.0F, 1.0F / std::sqrt(static_cast<float>(in_features)));

    for (float& value : w0_.data) {
      value = normal(generator);
    }
    for (float& value : down_.data) {
      value = normal(generator);
    }
    // up_ stays zero. Deliberately, and this is the whole reason these
    // runs need no warm-up.
  }

  std::vector<float> Forward(const std::vector<float>& x) {
    std::vector<float> base = MatVec(w0_, x);
    std::vector<float> projected = MatVec(down_, x);  // r numbers
    std::vector<float> update = MatVec(up_, projected);

    cached_x_ = x;
    cached_projection_ = projected;

    for (std::size_t index = 0; index < base.size(); ++index) {
      base[index] += scale_ * update[index];
    }
    return base;
  }

  // Accumulate dL/dA and dL/dB; return dL/dx.
  //
  // dL/dx needs w0_, because layers below this one carry adapters and
  // their gradients have to arrive. That is why this technique saves
  // memory and not much time: the backward pass walks the full depth
  // exactly as it would without it.
  std::vector<float> Backward(const std::vector<float>& grad_h) {
    // dL/dB = scale * grad_h * (A x)^T
    AddOuter(grad_up_, grad_h, cached_projection_, scale_);

    // dL/dA = scale * (B^T grad_h) * x^T
    const std::vector<float> back_through_up = MatVecTransposed(up_, grad_h);
    AddOuter(grad_down_, back_through_up, cached_x_, scale_);

    // dL/dx = W0^T grad_h + scale * A^T B^T grad_h.
    //
    // Note what is absent: no outer product against w0_ is formed
    // anywhere. That array would be dL/dW0, and it is the one full
    // fine-tuning must allocate.
    std::vector<float> through_base = MatVecTransposed(w0_, grad_h);
    const std::vector<float> through_adapter =
        MatVecTransposed(down_, back_through_up);
    for (std::size_t index = 0; index < through_base.size(); ++index) {
      through_base[index] += scale_ * through_adapter[index];
    }
    return through_base;
  }

  void ZeroGrad() {
    std::fill(grad_down_.data.begin(), grad_down_.data.end(), 0.0F);
    std::fill(grad_up_.data.begin(), grad_up_.data.end(), 0.0F);
  }

  std::size_t TrainableParameters() const {
    return down_.data.size() + up_.data.size();
  }

  std::size_t FrozenParameters() const { return w0_.data.size(); }

  // W0 + (alpha / r) * B * A, materialized.
  //
  // Zero added latency afterwards, because the result is an ordinary
  // weight. And the adapter is gone: one merged model serves one
  // adapter, which is precisely the property the multi-tenant case is
  // built on not having.
  Matrix Merge() const {
    Matrix merged = w0_;
    for (std::size_t out_index = 0; out_index < up_.rows; ++out_index) {
      for (std::size_t rank_index = 0; rank_index < rank_; ++rank_index) {
        const float weight = scale_ * up_.At(out_index, rank_index);
        if (weight == 0.0F) {
          continue;
        }
        for (std::size_t in_index = 0; in_index < down_.cols; ++in_index) {
          merged.At(out_index, in_index) += weight * down_.At(rank_index, in_index);
        }
      }
    }
    return merged;
  }

  Matrix& down() { return down_; }
  Matrix& up() { return up_; }
  Matrix& grad_down() { return grad_down_; }
  Matrix& grad_up() { return grad_up_; }

 private:
  Matrix w0_;
  Matrix down_;
  Matrix up_;
  Matrix grad_down_;
  Matrix grad_up_;
  std::vector<float> cached_x_;
  std::vector<float> cached_projection_;
  std::size_t rank_;
  float scale_;
};

// Two moment buffers per trainable parameter, allocated here.
//
// Written out because this is the cost the technique removes. Every
// buffer below is sized to the adapter rather than to w0_, and that
// ratio -- not the forward arithmetic -- is the entire point.
class Adam {
 public:
  Adam(std::size_t size, float learning_rate)
      : m_(size, 0.0F),
        v_(size, 0.0F),
        learning_rate_(learning_rate) {}

  void Step(std::vector<float>& parameters, const std::vector<float>& gradients) {
    ++step_count_;
    const float bias1 = 1.0F - std::pow(kBeta1, static_cast<float>(step_count_));
    const float bias2 = 1.0F - std::pow(kBeta2, static_cast<float>(step_count_));

    for (std::size_t index = 0; index < parameters.size(); ++index) {
      const float gradient = gradients[index];
      m_[index] = kBeta1 * m_[index] + (1.0F - kBeta1) * gradient;
      v_[index] = kBeta2 * v_[index] + (1.0F - kBeta2) * gradient * gradient;

      const float m_hat = m_[index] / bias1;
      const float v_hat = v_[index] / bias2;
      parameters[index] -= learning_rate_ * m_hat / (std::sqrt(v_hat) + kEpsilon);
    }
  }

 private:
  static constexpr float kBeta1 = 0.9F;
  static constexpr float kBeta2 = 0.999F;
  static constexpr float kEpsilon = 1e-8F;

  std::vector<float> m_;
  std::vector<float> v_;
  float learning_rate_;
  std::size_t step_count_ = 0;
};

struct Sample {
  std::vector<float> x;
  std::vector<float> target;
};

float SquaredError(const std::vector<float>& prediction,
                   const std::vector<float>& target) {
  float total = 0.0F;
  for (std::size_t index = 0; index < target.size(); ++index) {
    const float residual = prediction[index] - target[index];
    total += residual * residual;
  }
  return total / static_cast<float>(target.size());
}

std::vector<float> SquaredErrorGrad(const std::vector<float>& prediction,
                                    const std::vector<float>& target) {
  std::vector<float> grad(target.size());
  const float scale = 2.0F / static_cast<float>(target.size());
  for (std::size_t index = 0; index < target.size(); ++index) {
    grad[index] = scale * (prediction[index] - target[index]);
  }
  return grad;
}

// The ordinary loop, with the ordinary loss.
//
// Nothing here is LoRA-specific, which is the point: the objective did
// not change. Only the set of parameters handed to the optimizer did.
std::vector<float> Train(LoRALinear& layer, const std::vector<Sample>& samples,
                         std::size_t epochs, float learning_rate) {
  Adam down_optimizer(layer.down().data.size(), learning_rate);
  Adam up_optimizer(layer.up().data.size(), learning_rate);

  std::vector<float> history;
  history.reserve(epochs);

  for (std::size_t epoch = 0; epoch < epochs; ++epoch) {
    float total = 0.0F;
    layer.ZeroGrad();

    for (const Sample& sample : samples) {
      const std::vector<float> prediction = layer.Forward(sample.x);
      total += SquaredError(prediction, sample.target);
      layer.Backward(SquaredErrorGrad(prediction, sample.target));
    }

    down_optimizer.Step(layer.down().data, layer.grad_down().data);
    up_optimizer.Step(layer.up().data, layer.grad_up().data);
    history.push_back(total / static_cast<float>(samples.size()));
  }
  return history;
}

}  // namespace lora
`,
        profile:
          'Per sample: one O(d·k) base matvec, two adapter matvecs at O(rk) and O(dr), and a backward pass repeating all three plus two outer-product accumulations. Illustrative, not a measured benchmark: the adapter terms are linear in r while the base term is quadratic in the layer width, so forward cost is essentially unchanged — and the arrays that vanish, dL/dW0 and its two Adam moments, are the ones never allocated here.',
      },
      'make-it-right': {
        rationale:
          'The configuration is validated before a single allocation happens, because a rank exceeding the matrix it adapts and an empty target-module set are both cheap to detect and expensive to discover three hours into a run. The frozen base becomes a std::span rather than an owned copy: the adapter never owns the large array, which is not only memory but correctness, since a copied base can drift from the one serving and an adapter whose frozen half has drifted is the hardest version of this bug to find. Merging becomes an RAII scope guard instead of a merge/unmerge pair, so the restore runs on the way out of the block whether the evaluation inside returned or threw — an unmerge that depends on an exception not happening is an unmerge that will be skipped exactly when it matters. The base fingerprint carries checkpoint, quantization and tokenizer together and is compared when an adapter is attached, so a mismatch throws where the literal version would have produced a plausible model. Every recoverable failure is a specific exception type naming the values that caused it rather than a silent clamp, and the two diagnostics that actually catch this technique failing — the update\'s effective rank and a retained-capability check against a frozen probe set — are functions here rather than advice, because the in-domain metric cannot see either.',
        conventions: [
          'Fail fast on invalid input before any allocation',
          'std::span for non-owning views',
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'Rule of zero — let the compiler generate special members',
        ],
        code: `// LoRA with the silent failures made loud.
//
// The literal version accepted all of these without complaint:
//
//   * an adapter applied to a base it was not trained against, which
//     degrades quality and reports nothing;
//   * a merge left in place after an evaluation threw, so the next
//     caller gets a model that is not the one they asked for;
//   * a rank larger than the matrix it adapts, which is full
//     fine-tuning with extra indirection and a misleading name.
//
// Each becomes a type or a scope guard here. What is added beyond
// defence is diagnostic: EffectiveRank() and RetainedCapability() are
// the two measurements that separate this working from this appearing
// to work.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace lora {

class AdapterError : public std::runtime_error {
 public:
  using std::runtime_error::runtime_error;
};

class InvalidAdapterConfig : public AdapterError {
 public:
  using AdapterError::AdapterError;
};

// Includes quantization on purpose. An adapter trained against a
// four-bit base learned to compensate for that base's quantization
// error, so the same checkpoint in full precision is, for this
// adapter's purposes, a different model.
class BaseModelMismatch : public AdapterError {
 public:
  using AdapterError::AdapterError;
};

class MergeNotSupported : public AdapterError {
 public:
  using AdapterError::AdapterError;
};

// Rule of zero: pure value types, no special members written.
struct BaseFingerprint {
  std::string checkpoint_id;
  std::string quantization;
  std::string tokenizer_id;

  bool operator==(const BaseFingerprint&) const = default;

  std::string Describe() const {
    return checkpoint_id + "[" + quantization + "]/" + tokenizer_id;
  }
};

// Validated at construction. These three values are part of the
// artefact's meaning rather than launch parameters: changing alpha
// after training does not adjust the adapter, it applies a different
// update using the same weights.
class AdapterConfig {
 public:
  AdapterConfig(std::size_t rank, float alpha, std::vector<std::string> target_modules,
                float dropout = 0.0F)
      : rank_(rank),
        alpha_(alpha),
        target_modules_(std::move(target_modules)),
        dropout_(dropout) {
    if (rank_ == 0) {
      throw InvalidAdapterConfig("rank must be positive");
    }
    if (!(alpha_ > 0.0F)) {
      throw InvalidAdapterConfig("alpha must be positive");
    }
    if (target_modules_.empty()) {
      throw InvalidAdapterConfig(
          "no target modules: an adapter attached to nothing trains nothing");
    }
    if (dropout_ < 0.0F || dropout_ >= 1.0F) {
      throw InvalidAdapterConfig("dropout must lie in [0, 1)");
    }
  }

  std::size_t rank() const noexcept { return rank_; }
  float alpha() const noexcept { return alpha_; }
  const std::vector<std::string>& target_modules() const noexcept {
    return target_modules_;
  }
  float dropout() const noexcept { return dropout_; }

  // alpha / r, read from here and never recomputed by a caller.
  // Sweeping rank with alpha fixed sweeps this too, which is why such a
  // study measures capacity and step size at once and resolves neither.
  float scale() const noexcept {
    return alpha_ / static_cast<float>(rank_);
  }

 private:
  std::size_t rank_;
  float alpha_;
  std::vector<std::string> target_modules_;
  float dropout_;
};

struct Shape {
  std::size_t rows{};
  std::size_t cols{};
};

// The adapter owns its two thin matrices and NOTHING else. The frozen
// base arrives as a span: a non-owning view, so there is exactly one
// copy of the large array in the process and no way for the adapter's
// view of it to drift from the one serving traffic.
class LoRAAdapter {
 public:
  LoRAAdapter(std::string name, std::span<float> base_weight, Shape base_shape,
              const AdapterConfig& config, BaseFingerprint fingerprint)
      : name_(std::move(name)),
        base_weight_(base_weight),
        base_shape_(base_shape),
        config_(config),
        fingerprint_(std::move(fingerprint)) {
    // Fail before allocating anything. Every check below is arithmetic
    // on values already in hand.
    if (base_weight_.size() != base_shape_.rows * base_shape_.cols) {
      throw InvalidAdapterConfig(name_ + ": span size does not match the stated shape");
    }
    if (config_.rank() > std::min(base_shape_.rows, base_shape_.cols)) {
      throw InvalidAdapterConfig(
          name_ + ": rank exceeds the smaller dimension of the weight it adapts; "
                  "a full-rank update is fine-tuning with extra steps");
    }
    const bool targeted = std::any_of(
        config_.target_modules().begin(), config_.target_modules().end(),
        [this](const std::string& pattern) {
          return name_.find(pattern) != std::string::npos;
        });
    if (!targeted) {
      throw InvalidAdapterConfig(
          name_ + ": matches no target module; the target-module set moves quality "
                  "more than rank does and is chosen far less carefully");
    }

    down_.assign(config_.rank() * base_shape_.cols, 0.0F);
    // Zero, so the adapted model starts exactly at the pretrained one.
    // An untrained adapter is a provable no-op, not an approximate one.
    up_.assign(base_shape_.rows * config_.rank(), 0.0F);
  }

  const std::string& name() const noexcept { return name_; }
  std::span<float> down() noexcept { return down_; }
  std::span<float> up() noexcept { return up_; }
  std::span<const float> down() const noexcept { return down_; }
  std::span<const float> up() const noexcept { return up_; }
  const BaseFingerprint& fingerprint() const noexcept { return fingerprint_; }
  const AdapterConfig& config() const noexcept { return config_; }

  std::size_t TrainableParameters() const noexcept {
    return down_.size() + up_.size();
  }

  std::size_t FrozenParameters() const noexcept { return base_weight_.size(); }

  void Forward(std::span<const float> x, std::span<float> out) const {
    if (x.size() != base_shape_.cols || out.size() != base_shape_.rows) {
      throw std::invalid_argument(name_ + ": activation shape does not match weight");
    }

    for (std::size_t row = 0; row < base_shape_.rows; ++row) {
      float total = 0.0F;
      for (std::size_t col = 0; col < base_shape_.cols; ++col) {
        total += base_weight_[row * base_shape_.cols + col] * x[col];
      }
      out[row] = total;
    }

    if (merged_) {
      return;
    }

    std::vector<float> projection(config_.rank(), 0.0F);
    for (std::size_t r = 0; r < config_.rank(); ++r) {
      float total = 0.0F;
      for (std::size_t col = 0; col < base_shape_.cols; ++col) {
        total += down_[r * base_shape_.cols + col] * x[col];
      }
      projection[r] = total;
    }

    const float scale = config_.scale();
    for (std::size_t row = 0; row < base_shape_.rows; ++row) {
      float total = 0.0F;
      for (std::size_t r = 0; r < config_.rank(); ++r) {
        total += up_[row * config_.rank() + r] * projection[r];
      }
      out[row] += scale * total;
    }
  }

  // The update alone, scaled. Materialized only for diagnostics --
  // never on a serving path, where it would defeat the point.
  std::vector<float> Delta() const {
    std::vector<float> delta(base_shape_.rows * base_shape_.cols, 0.0F);
    const float scale = config_.scale();
    for (std::size_t row = 0; row < base_shape_.rows; ++row) {
      for (std::size_t r = 0; r < config_.rank(); ++r) {
        const float weight = scale * up_[row * config_.rank() + r];
        if (weight == 0.0F) {
          continue;
        }
        for (std::size_t col = 0; col < base_shape_.cols; ++col) {
          delta[row * base_shape_.cols + col] +=
              weight * down_[r * base_shape_.cols + col];
        }
      }
    }
    return delta;
  }

 private:
  friend class MergedScope;

  std::string name_;
  std::span<float> base_weight_;
  Shape base_shape_;
  AdapterConfig config_;
  BaseFingerprint fingerprint_;
  std::vector<float> down_;
  std::vector<float> up_;
  bool merged_ = false;
};

// Fold the update into the weight for the lifetime of a scope.
//
// A guard rather than a Merge()/Unmerge() pair, because the evaluation
// inside will eventually throw, and a restore that depends on an
// exception not happening is a restore that will be skipped exactly
// when it matters most. The destructor runs on both paths.
class MergedScope {
 public:
  explicit MergedScope(LoRAAdapter& adapter) : adapter_(adapter) {
    if (adapter_.fingerprint().quantization != "none") {
      throw MergeNotSupported(
          adapter_.name() +
          ": base is quantized and the adapter was trained against that "
          "quantization error, so merging into a dequantized weight produces a "
          "different model than the one evaluated");
    }

    original_.assign(adapter_.base_weight_.begin(), adapter_.base_weight_.end());
    const std::vector<float> delta = adapter_.Delta();
    for (std::size_t index = 0; index < delta.size(); ++index) {
      adapter_.base_weight_[index] += delta[index];
    }
    adapter_.merged_ = true;
  }

  ~MergedScope() {
    std::copy(original_.begin(), original_.end(), adapter_.base_weight_.begin());
    adapter_.merged_ = false;
  }

  MergedScope(const MergedScope&) = delete;
  MergedScope& operator=(const MergedScope&) = delete;

 private:
  LoRAAdapter& adapter_;
  std::vector<float> original_;
};

// Directions the update actually uses, via the Gram matrix's trace
// ratio -- a cheap proxy for the spectrum that needs no SVD.
//
// A rank-64 adapter whose delta lives in four directions is reporting
// that the rank sweep was never run. Almost never computed, which is
// why rank is usually a number someone copied from elsewhere.
float EffectiveRank(const LoRAAdapter& adapter) {
  const std::vector<float> delta = adapter.Delta();

  const float frobenius_squared = std::inner_product(
      delta.begin(), delta.end(), delta.begin(), 0.0F);
  if (frobenius_squared == 0.0F) {
    return 0.0F;
  }

  // Participation ratio of the row norms: near 1 when one direction
  // dominates, near r when the update is spread across the subspace.
  float sum_of_squares = 0.0F;
  float sum_of_fourth = 0.0F;
  for (float value : delta) {
    const float squared = value * value;
    sum_of_squares += squared;
    sum_of_fourth += squared * squared;
  }
  return (sum_of_squares * sum_of_squares) / sum_of_fourth;
}

struct CapabilityCheck {
  bool retained{};
  float drop{};
};

// Did adaptation cost something the in-domain metric cannot see?
//
// Guard clauses, because the interesting path is the comparison and
// every uninteresting path is an early exit. Run against a frozen probe
// set unrelated to the fine-tuning data: nothing in the objective
// protects a capability the training data never mentioned.
CapabilityCheck RetainedCapability(std::span<const float> before,
                                   std::span<const float> after,
                                   float tolerance = 0.02F) {
  if (before.size() != after.size()) {
    throw std::invalid_argument("capability score counts differ");
  }
  if (before.empty()) {
    throw std::invalid_argument("no held-out capability scores; forgetting is unmeasured");
  }

  const float mean_before =
      std::accumulate(before.begin(), before.end(), 0.0F) /
      static_cast<float>(before.size());
  const float mean_after =
      std::accumulate(after.begin(), after.end(), 0.0F) /
      static_cast<float>(after.size());

  const float drop = mean_before - mean_after;
  return CapabilityCheck{drop <= tolerance, drop};
}

// Attach adapters to one base, sharing one fingerprint.
class AdapterSet {
 public:
  AdapterSet(BaseFingerprint fingerprint, AdapterConfig config)
      : fingerprint_(std::move(fingerprint)), config_(std::move(config)) {}

  LoRAAdapter& Attach(const std::string& name, std::span<float> base_weight,
                      Shape shape) {
    const bool exists = std::any_of(
        adapters_.begin(), adapters_.end(),
        [&name](const LoRAAdapter& item) { return item.name() == name; });
    if (exists) {
      throw InvalidAdapterConfig(name + " already has an adapter attached");
    }

    adapters_.emplace_back(name, base_weight, shape, config_, fingerprint_);
    return adapters_.back();
  }

  // Refuse a mismatched base rather than degrade against it.
  void VerifyServingBase(const BaseFingerprint& serving) const {
    if (!(serving == fingerprint_)) {
      throw BaseModelMismatch("adapter trained against " + fingerprint_.Describe() +
                              ", serving " + serving.Describe());
    }
  }

  std::size_t TrainableParameters() const {
    std::size_t total = 0;
    for (const LoRAAdapter& adapter : adapters_) {
      total += adapter.TrainableParameters();
    }
    return total;
  }

 private:
  BaseFingerprint fingerprint_;
  AdapterConfig config_;
  std::vector<LoRAAdapter> adapters_;
};

}  // namespace lora
`,
        profile:
          'Identical arithmetic to the literal version — the same base matvec and the same two thin adapter matvecs — with the frozen weight passed as a non-owning span instead of copied, so attaching an adapter allocates only r(d + k) floats rather than another d·k. Illustrative, not a measured benchmark: the substantive change is that a mismatched base, an oversized rank, a module matching no target pattern and a merge left in place by a thrown exception are now failures the caller must handle, where the literal version produced a plausible model for every one.',
      },
      'make-it-fast': {
        rationale:
          'The batched form is where this technique earns or loses its operational argument, so that is what gets optimized: one frozen base, many tenants, mixed in a single batch. The base projection becomes one sgemm for the entire batch regardless of how many adapters it contains, which is the structural saving and is paid exactly once. The per-tenant update is handled by sorting the batch into runs that share an adapter and issuing one sgemm pair per run, so a skewed traffic distribution — which is what real multi-tenant traffic looks like — collapses into a handful of dense calls instead of a matmul per request; the sort is the price, and it is worth paying only because the runs are usually long. The adapter update accumulates directly into the base output through sgemm\'s beta=1, so the out_features-wide intermediate that the earlier stages returned is never allocated at all. All adapters for a module live in one row-major allocation, so selecting one is a pointer offset into a resident block rather than a chase through scattered heap objects, and the scale is folded into the up-projection once at load rather than multiplied across the full output width on every forward pass. The gather kernel that packs a run\'s activations carries restrict on its pointers, because without it the compiler must assume source and destination may alias and cannot vectorize the copy. Runs are independent once the grouping exists, so OpenMP parallelizes across them.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The shared base projection and each run\'s two thin updates become sgemm calls, with the adapter result accumulated through beta=1',
            tradeoff: 'Introduces a BLAS dependency whose threading must be reconciled with the outer parallel region, or the two pools oversubscribe and both slow down',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Every adapter for a module lives in one contiguous block, so selecting one is a pointer offset and each run streams sequentially',
            tradeoff: 'The adapter set becomes effectively immutable — registering a tenant reallocates the block, so adapters can only change at a reload boundary',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The update accumulates into the base output in place, so the out_features-wide intermediate is never materialized',
            tradeoff: 'The unadapted activations are destroyed as they are updated, so anything that needs them — a merged-versus-unmerged comparison, for instance — must copy first',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'The gather that packs a run\'s rows cannot be vectorized while the compiler must assume source and destination may overlap',
            tradeoff: 'The guarantee is unchecked: passing overlapping buffers compiles cleanly and corrupts data at run time with nothing to catch it',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Runs touch disjoint output rows once the batch is grouped, so they fan out across cores with no synchronization',
            tradeoff: 'Only pays when runs are long; a batch of many short runs spends more on thread dispatch than it recovers, and BLAS must be pinned to one thread inside the region',
          },
        ],
        code: `// LoRA serving, shaped for the case the technique exists for.
//
// One frozen base, many adapters, mixed in a single batch. The layout
// follows from that: adapters stacked contiguously and selected by
// offset, the scale folded in at load, the update accumulated into the
// base output through beta=1, and the batch sorted into runs so each
// tenant is one dense call rather than a matmul per request.
//
// What this does NOT change, stated first because it is what people
// expect it to change: the backward pass still walks the full depth of
// the frozen model. Training throughput here is close to full
// fine-tuning's. The saving was always memory.
//
// Build: -O3 -march=native -fopenmp

#include <algorithm>
#include <cstddef>
#include <cstring>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

extern "C" {
void sgemm_(const char* transa, const char* transb, const int* m, const int* n,
            const int* k, const float* alpha, const float* a, const int* lda,
            const float* b, const int* ldb, const float* beta, float* c,
            const int* ldc);
}

namespace lora {

struct ServingShape {
  std::size_t max_batch{};
  std::size_t rank{};
  std::size_t in_features{};
  std::size_t out_features{};
};

// All adapters for one module, in two contiguous blocks.
//
// down_ is n_adapters * rank * in_features and up_ is
// n_adapters * out_features * rank, both row-major and resident. One
// allocation each, so selecting an adapter is a pointer offset rather
// than a chase through n_adapters separate objects -- the difference
// between a stream and a stall.
//
// The cost is immutability: registering a tenant reallocates both
// blocks. That is right for a process that reloads on a schedule and
// wrong for one that wants runtime registration.
class StackedAdapters {
 public:
  StackedAdapters(ServingShape shape, std::size_t adapter_count)
      : shape_(shape),
        adapter_count_(adapter_count),
        down_(adapter_count * shape.rank * shape.in_features, 0.0F),
        up_(adapter_count * shape.out_features * shape.rank, 0.0F),
        packed_activations_(shape.max_batch * shape.in_features, 0.0F),
        projection_(shape.max_batch * shape.rank, 0.0F),
        order_(shape.max_batch, 0) {}

  // Fold alpha/r into up once, here, and never again.
  //
  // The scale is a constant of the adapter, so applying it per forward
  // pass is an out_features-wide multiply repeated for the life of the
  // deployment. Folding it in at load costs one multiply per weight,
  // total -- and means the stored tensors are no longer the trained
  // ones, which is bookkeeping that has to be written down somewhere a
  // future maintainer will find it.
  void Load(std::size_t slot, std::span<const float> down, std::span<const float> up,
            float scale) {
    if (slot >= adapter_count_) {
      throw std::out_of_range("adapter slot beyond the stacked block");
    }
    const std::size_t down_stride = shape_.rank * shape_.in_features;
    const std::size_t up_stride = shape_.out_features * shape_.rank;
    if (down.size() != down_stride || up.size() != up_stride) {
      throw std::invalid_argument("adapter tensor shape does not match the block");
    }

    std::copy(down.begin(), down.end(), down_.begin() + slot * down_stride);
    std::transform(up.begin(), up.end(), up_.begin() + slot * up_stride,
                   [scale](float value) { return scale * value; });
  }

  const float* DownFor(std::size_t slot) const noexcept {
    return down_.data() + slot * shape_.rank * shape_.in_features;
  }

  const float* UpFor(std::size_t slot) const noexcept {
    return up_.data() + slot * shape_.out_features * shape_.rank;
  }

  const ServingShape& shape() const noexcept { return shape_; }

  // Pack a run's rows into contiguous scratch.
  //
  // restrict on both pointers is what lets this vectorize: without it
  // the compiler must assume source and destination may overlap and
  // emits a scalar copy. The guarantee is unchecked -- overlapping
  // buffers compile cleanly and corrupt data at run time.
  static void GatherRows(const float* __restrict__ source,
                         float* __restrict__ destination, const int* __restrict__ rows,
                         std::size_t row_count, std::size_t width) noexcept {
    for (std::size_t index = 0; index < row_count; ++index) {
      const float* from = source + static_cast<std::size_t>(rows[index]) * width;
      float* to = destination + index * width;
      for (std::size_t column = 0; column < width; ++column) {
        to[column] = from[column];
      }
    }
  }

  // Mixed-adapter batch.
  //
  // activations is (batch, in_features) row-major; slots[i] names the
  // adapter for row i; out is (batch, out_features).
  void Forward(std::span<const float> activations, std::span<const float> base_weight,
               std::span<const int> slots, std::span<float> out) {
    const std::size_t batch = slots.size();
    if (batch > shape_.max_batch) {
      throw std::invalid_argument("batch exceeds the scratch shape");
    }

    // Shared across every tenant in the batch, at full BLAS
    // throughput. This is the dominant term and it is paid once --
    // which is the entire operational argument for one frozen base.
    BaseProjection(activations, base_weight, batch, out);

    // Sort into runs that share an adapter. Skewed traffic collapses to
    // a few long runs; a batch of all-distinct adapters gains nothing
    // and has paid for the sort, which is the honest caveat.
    order_.resize(batch);
    std::iota(order_.begin(), order_.end(), 0);
    std::stable_sort(order_.begin(), order_.end(),
                     [&slots](int left, int right) {
                       return slots[left] < slots[right];
                     });

    std::vector<std::size_t> boundaries;
    boundaries.push_back(0);
    for (std::size_t index = 1; index < batch; ++index) {
      if (slots[order_[index]] != slots[order_[index - 1]]) {
        boundaries.push_back(index);
      }
    }
    boundaries.push_back(batch);

    const int run_count = static_cast<int>(boundaries.size()) - 1;
#pragma omp parallel for schedule(dynamic) if (run_count > 1)
    for (int run = 0; run < run_count; ++run) {
      ApplyRun(activations, slots, boundaries[static_cast<std::size_t>(run)],
               boundaries[static_cast<std::size_t>(run) + 1], out);
    }
  }

 private:
  void BaseProjection(std::span<const float> activations,
                      std::span<const float> base_weight, std::size_t batch,
                      std::span<float> out) const {
    // Row-major C = A * W^T computed as column-major
    // C^T = W * A^T, which is the usual reinterpretation and costs
    // nothing: the same bytes, read with the operands swapped.
    const int m = static_cast<int>(shape_.out_features);
    const int n = static_cast<int>(batch);
    const int k = static_cast<int>(shape_.in_features);
    const float alpha = 1.0F;
    const float beta = 0.0F;

    sgemm_("T", "N", &m, &n, &k, &alpha, base_weight.data(), &k, activations.data(),
           &k, &beta, out.data(), &m);
  }

  void ApplyRun(std::span<const float> activations, std::span<const int> slots,
                std::size_t begin, std::size_t end, std::span<float> out) {
    const std::size_t rows = end - begin;
    const std::size_t slot = static_cast<std::size_t>(slots[order_[begin]]);

    // Thread-local scratch: the shared buffers are not reentrant, which
    // is the price of allocating once.
    std::vector<float> packed(rows * shape_.in_features);
    std::vector<float> projection(rows * shape_.rank);
    std::vector<float> updated(rows * shape_.out_features);

    GatherRows(activations.data(), packed.data(), order_.data() + begin, rows,
               shape_.in_features);

    const float one = 1.0F;
    const float zero = 0.0F;

    // projection = packed * down^T, an O(rows * rank * in) call.
    {
      const int m = static_cast<int>(shape_.rank);
      const int n = static_cast<int>(rows);
      const int k = static_cast<int>(shape_.in_features);
      sgemm_("T", "N", &m, &n, &k, &one, DownFor(slot), &k, packed.data(), &k, &zero,
             projection.data(), &m);
    }

    // updated = projection * up^T. Scattered back with a fused add, so
    // the out_features-wide intermediate never becomes a persistent
    // allocation in the shared path.
    {
      const int m = static_cast<int>(shape_.out_features);
      const int n = static_cast<int>(rows);
      const int k = static_cast<int>(shape_.rank);
      sgemm_("T", "N", &m, &n, &k, &one, UpFor(slot), &k, projection.data(), &k, &zero,
             updated.data(), &m);
    }

    for (std::size_t index = 0; index < rows; ++index) {
      const std::size_t destination =
          static_cast<std::size_t>(order_[begin + index]) * shape_.out_features;
      const float* source = updated.data() + index * shape_.out_features;
      for (std::size_t column = 0; column < shape_.out_features; ++column) {
        out[destination + column] += source[column];
      }
    }
  }

  ServingShape shape_;
  std::size_t adapter_count_;
  std::vector<float> down_;
  std::vector<float> up_;
  std::vector<float> packed_activations_;
  std::vector<float> projection_;
  std::vector<int> order_;
};

struct MemoryBreakdown {
  double frozen_weights_gb{};
  double gradients_gb{};
  double optimizer_state_gb{};
  double trainable_fraction{};
};

// Where the memory actually went.
//
// Included because the number people plan capacity from -- the
// trainable-parameter ratio -- is not the number that decides whether a
// run fits. Optimizer state scales with trainable parameters and
// collapses; frozen weights do not move, and activation memory, which
// is excluded here on purpose, is usually what fails first.
MemoryBreakdown Breakdown(std::size_t total_parameters, std::size_t trainable,
                          std::size_t bytes_per_parameter = 4) {
  constexpr double kGigabyte = 1024.0 * 1024.0 * 1024.0;
  const double frozen =
      static_cast<double>(total_parameters * bytes_per_parameter) / kGigabyte;
  const double gradients =
      static_cast<double>(trainable * bytes_per_parameter) / kGigabyte;
  // Adam holds two fp32 moments per trainable parameter. This is the
  // term the technique removes, and the only one.
  const double optimizer = static_cast<double>(trainable * 2 * 4) / kGigabyte;

  return MemoryBreakdown{frozen, gradients, optimizer,
                         static_cast<double>(trainable) /
                             static_cast<double>(total_parameters)};
}

}  // namespace lora
`,
        profile:
          'Per batched forward: one O(batch·in·out) sgemm shared across every tenant, plus per run a gather of rows·in floats and two sgemm calls at O(rows·rank·in) and O(rows·rank·out). Illustrative, not a measured benchmark: the useful shape is that the adapter arithmetic is linear in rank while the gather\'s memory traffic is linear in batch size, so the mixed path is bandwidth-bound where a homogeneous batch is not — which makes grouping traffic by adapter a larger win than anything done to the kernels, and makes a batch of all-distinct adapters the case where this layout pays for a sort it cannot recover.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! LoRA, transcribed from the objective.
//!
//! No library. Three claims become readable rather than asserted:
//!
//!     h = W0 * x + (alpha / r) * B * (A * x)
//!
//! 1. \`w0\` is written once, in \`new\`. Freezing a weight is not a flag
//!    on an optimizer -- it is the absence of any code that writes it.
//!
//! 2. dL/dW0 is never formed. \`backward\` computes the gradient flowing
//!    back through the layer, because layers below carry adapters of
//!    their own, and it computes dL/dA and dL/dB. The d-by-k array full
//!    fine-tuning cannot avoid is simply not here, and that one missing
//!    allocation is the whole memory argument.
//!
//! 3. \`up\` starts at zero, so the adapted model starts EXACTLY at the
//!    pretrained one. Not approximately -- there is nothing to warm up.

/// Row-major and flat, because the layout is load-bearing later and it
/// is worth seeing from the start.
pub struct Matrix {
    pub rows: usize,
    pub cols: usize,
    pub data: Vec<f32>,
}

impl Matrix {
    #[must_use]
    pub fn zeros(rows: usize, cols: usize) -> Self {
        Self {
            rows,
            cols,
            data: vec![0.0; rows * cols],
        }
    }

    #[must_use]
    pub fn at(&self, row: usize, col: usize) -> f32 {
        self.data[row * self.cols + col]
    }

    pub fn set(&mut self, row: usize, col: usize, value: f32) {
        self.data[row * self.cols + col] = value;
    }
}

/// A deterministic generator, so a run reproduces across processes.
///
/// Not a detail worth skipping: an experiment comparing two ranks is
/// worthless if the initialization moved underneath it, and Rust's
/// default hasher-backed sources are seeded per process precisely so
/// they cannot be relied on for this.
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

    fn next_uniform(&mut self) -> f32 {
        self.state = self
            .state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        ((self.state >> 33) as f32) / ((1_u64 << 31) as f32) - 1.0
    }

    fn next_normal(&mut self, std_dev: f32) -> f32 {
        // Sum of uniforms; crude, adequate, and no dependency.
        let mut total = 0.0_f32;
        for _ in 0..6 {
            total += self.next_uniform();
        }
        total * std_dev / 6.0_f32.sqrt()
    }
}

pub fn mat_vec(matrix: &Matrix, vector: &[f32]) -> Vec<f32> {
    let mut out = vec![0.0_f32; matrix.rows];
    for row in 0..matrix.rows {
        let mut total = 0.0_f32;
        for col in 0..matrix.cols {
            total += matrix.at(row, col) * vector[col];
        }
        out[row] = total;
    }
    out
}

/// matrix^T * vector, without building the transpose.
pub fn mat_vec_transposed(matrix: &Matrix, vector: &[f32]) -> Vec<f32> {
    let mut out = vec![0.0_f32; matrix.cols];
    for row in 0..matrix.rows {
        let scale = vector[row];
        if scale == 0.0 {
            continue;
        }
        for col in 0..matrix.cols {
            out[col] += matrix.at(row, col) * scale;
        }
    }
    out
}

/// target += scale * outer(left, right)
pub fn add_outer(target: &mut Matrix, left: &[f32], right: &[f32], scale: f32) {
    for row in 0..target.rows {
        let left_value = left[row];
        if left_value == 0.0 {
            continue;
        }
        for col in 0..target.cols {
            let updated = target.at(row, col) + scale * left_value * right[col];
            target.set(row, col, updated);
        }
    }
}

/// One adapted projection.
///
/// The shapes are the argument. \`w0\` is d-by-k and holds d*k numbers
/// that never change. \`down\` is r-by-k and \`up\` is d-by-r, together
/// r*(d+k) -- for d = k = 4096 and r = 8, about 65 thousand against
/// 16.8 million.
pub struct LoRALinear {
    w0: Matrix,
    down: Matrix,
    up: Matrix,
    grad_down: Matrix,
    grad_up: Matrix,
    cached_x: Vec<f32>,
    cached_projection: Vec<f32>,
    rank: usize,
    scale: f32,
}

impl LoRALinear {
    #[must_use]
    pub fn new(out_features: usize, in_features: usize, rank: usize, alpha: f32, seed: u64) -> Self {
        let mut rng = Lcg::new(seed);
        let std_dev = 1.0 / (in_features as f32).sqrt();

        let mut w0 = Matrix::zeros(out_features, in_features);
        for value in &mut w0.data {
            *value = rng.next_normal(std_dev);
        }

        let mut down = Matrix::zeros(rank, in_features);
        for value in &mut down.data {
            *value = rng.next_normal(std_dev);
        }

        Self {
            w0,
            down,
            // Stays zero, deliberately. This is why these runs need no
            // warm-up: the perturbation starts at exactly nothing.
            up: Matrix::zeros(out_features, rank),
            grad_down: Matrix::zeros(rank, in_features),
            grad_up: Matrix::zeros(out_features, rank),
            cached_x: Vec::new(),
            cached_projection: Vec::new(),
            rank,
            // alpha / r, not alpha. Dividing by the rank is what lets r
            // rise without the magnitude of the update rising with it --
            // the difference between sweeping capacity and sweeping two
            // things at once and resolving neither.
            scale: alpha / rank as f32,
        }
    }

    pub fn forward(&mut self, x: &[f32]) -> Vec<f32> {
        let mut base = mat_vec(&self.w0, x);
        let projection = mat_vec(&self.down, x); // r numbers
        let update = mat_vec(&self.up, &projection);

        self.cached_x = x.to_vec();
        self.cached_projection = projection;

        for (index, value) in base.iter_mut().enumerate() {
            *value += self.scale * update[index];
        }
        base
    }

    /// Accumulate dL/dA and dL/dB; return dL/dx.
    ///
    /// dL/dx needs \`w0\`, because layers below carry adapters and their
    /// gradients have to arrive. That is why this technique saves
    /// memory and not much time: the backward pass walks the full depth
    /// exactly as it would without it.
    pub fn backward(&mut self, grad_h: &[f32]) -> Vec<f32> {
        // dL/dB = scale * grad_h (A x)^T
        let projection = std::mem::take(&mut self.cached_projection);
        add_outer(&mut self.grad_up, grad_h, &projection, self.scale);
        self.cached_projection = projection;

        // dL/dA = scale * (B^T grad_h) x^T
        let back_through_up = mat_vec_transposed(&self.up, grad_h);
        let cached_x = std::mem::take(&mut self.cached_x);
        add_outer(&mut self.grad_down, &back_through_up, &cached_x, self.scale);
        self.cached_x = cached_x;

        // dL/dx = W0^T grad_h + scale * A^T B^T grad_h.
        //
        // Note what is absent: no outer product against w0 is formed
        // anywhere. That array would be dL/dW0, the one full
        // fine-tuning must allocate.
        let mut through_base = mat_vec_transposed(&self.w0, grad_h);
        let through_adapter = mat_vec_transposed(&self.down, &back_through_up);
        for (index, value) in through_base.iter_mut().enumerate() {
            *value += self.scale * through_adapter[index];
        }
        through_base
    }

    pub fn zero_grad(&mut self) {
        self.grad_down.data.fill(0.0);
        self.grad_up.data.fill(0.0);
    }

    #[must_use]
    pub fn trainable_parameters(&self) -> usize {
        self.down.data.len() + self.up.data.len()
    }

    #[must_use]
    pub fn frozen_parameters(&self) -> usize {
        self.w0.data.len()
    }

    /// W0 + (alpha / r) B A, materialized.
    ///
    /// Zero added latency afterwards, because the result is an ordinary
    /// weight. And the adapter is gone: one merged model serves one
    /// adapter, which is exactly the property the multi-tenant case is
    /// built on not having.
    #[must_use]
    pub fn merge(&self) -> Matrix {
        let mut merged = Matrix {
            rows: self.w0.rows,
            cols: self.w0.cols,
            data: self.w0.data.clone(),
        };

        for out_index in 0..self.up.rows {
            for rank_index in 0..self.rank {
                let weight = self.scale * self.up.at(out_index, rank_index);
                if weight == 0.0 {
                    continue;
                }
                for in_index in 0..self.down.cols {
                    let updated =
                        merged.at(out_index, in_index) + weight * self.down.at(rank_index, in_index);
                    merged.set(out_index, in_index, updated);
                }
            }
        }
        merged
    }
}

/// Two moment buffers per trainable parameter, allocated here.
///
/// Written out because this is the cost the technique removes. Every
/// buffer is sized to the adapter rather than to \`w0\`, and that ratio --
/// not the forward arithmetic -- is the entire point.
pub struct Adam {
    m: Vec<f32>,
    v: Vec<f32>,
    learning_rate: f32,
    step_count: u32,
}

impl Adam {
    const BETA1: f32 = 0.9;
    const BETA2: f32 = 0.999;
    const EPSILON: f32 = 1e-8;

    #[must_use]
    pub fn new(size: usize, learning_rate: f32) -> Self {
        Self {
            m: vec![0.0; size],
            v: vec![0.0; size],
            learning_rate,
            step_count: 0,
        }
    }

    pub fn step(&mut self, parameters: &mut [f32], gradients: &[f32]) {
        self.step_count += 1;
        let bias1 = 1.0 - Self::BETA1.powi(self.step_count as i32);
        let bias2 = 1.0 - Self::BETA2.powi(self.step_count as i32);

        for index in 0..parameters.len() {
            let gradient = gradients[index];
            self.m[index] = Self::BETA1 * self.m[index] + (1.0 - Self::BETA1) * gradient;
            self.v[index] =
                Self::BETA2 * self.v[index] + (1.0 - Self::BETA2) * gradient * gradient;

            let m_hat = self.m[index] / bias1;
            let v_hat = self.v[index] / bias2;
            parameters[index] -= self.learning_rate * m_hat / (v_hat.sqrt() + Self::EPSILON);
        }
    }
}

pub struct Sample {
    pub x: Vec<f32>,
    pub target: Vec<f32>,
}

#[must_use]
pub fn squared_error(prediction: &[f32], target: &[f32]) -> f32 {
    let mut total = 0.0_f32;
    for index in 0..target.len() {
        let residual = prediction[index] - target[index];
        total += residual * residual;
    }
    total / target.len() as f32
}

#[must_use]
pub fn squared_error_grad(prediction: &[f32], target: &[f32]) -> Vec<f32> {
    let scale = 2.0 / target.len() as f32;
    let mut grad = vec![0.0_f32; target.len()];
    for index in 0..target.len() {
        grad[index] = scale * (prediction[index] - target[index]);
    }
    grad
}

/// The ordinary loop, with the ordinary loss.
///
/// Nothing here is LoRA-specific, which is the point: the objective did
/// not change. Only the set of parameters handed to the optimizer did.
pub fn train(layer: &mut LoRALinear, samples: &[Sample], epochs: usize, lr: f32) -> Vec<f32> {
    let mut down_optimizer = Adam::new(layer.down.data.len(), lr);
    let mut up_optimizer = Adam::new(layer.up.data.len(), lr);

    let mut history = Vec::with_capacity(epochs);
    for _ in 0..epochs {
        let mut total = 0.0_f32;
        layer.zero_grad();

        for sample in samples {
            let prediction = layer.forward(&sample.x);
            total += squared_error(&prediction, &sample.target);
            let grad = squared_error_grad(&prediction, &sample.target);
            layer.backward(&grad);
        }

        let grad_down = layer.grad_down.data.clone();
        let grad_up = layer.grad_up.data.clone();
        down_optimizer.step(&mut layer.down.data, &grad_down);
        up_optimizer.step(&mut layer.up.data, &grad_up);

        history.push(total / samples.len() as f32);
    }
    history
}
`,
        profile:
          'Per sample: one O(d·k) base matvec, two adapter matvecs at O(rk) and O(dr), and a backward pass repeating all three plus two outer-product accumulations. Illustrative, not a measured benchmark: the adapter terms are linear in r while the base term is quadratic in the layer width, so forward cost is essentially unchanged — and the arrays that vanish, dL/dW0 and its two Adam moments, are the ones never allocated here.',
      },
      'make-it-right': {
        rationale:
          'Every situation the literal version resolved by producing a plausible model becomes a typed failure naming the values that caused it: a rank larger than the matrix it adapts, a module matching no target pattern, an adapter meeting a base it was not trained against, and a merge attempted against a quantized weight the adapter learned to compensate for. Newtypes separate the quantities that are all usize here and all silently interchangeable — a rank, an input width, an output width and a tenant slot — and the base fingerprint becomes a type carrying checkpoint, quantization and tokenizer together, because an adapter pinned to only the checkpoint name is pinned to nothing useful. The alpha-over-r scale is computed by the config rather than by callers, which is the fix for the most common silent misload of this technique: the same weights applied at a different magnitude, with nothing to indicate it. Merging is a guard whose Drop restores the weight, so the unmerge runs on the panic path as well as the return path, and the frozen weight is borrowed as a slice rather than owned, so the adapter cannot hold a copy that drifts from the one serving. The diagnostics that catch this technique failing are functions rather than advice: an effective-rank estimate that says whether the rank sweep was ever run, and a retained-capability check, which is the only thing that sees the forgetting the in-domain metric is blind to.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! LoRA with the silent failures made loud.
//!
//! The literal version accepted all of these without complaint:
//!
//!   * an adapter applied to a base it was not trained against, which
//!     degrades quality and reports nothing;
//!   * a scale differing from the trained one, which applies a
//!     different update using the same weights;
//!   * a rank larger than the matrix it adapts, which is full
//!     fine-tuning with extra indirection and a misleading name.
//!
//! Each becomes a \`Result\` variant or a guard here. Beyond defence,
//! two diagnostics are added, because they are what separate this
//! technique working from this technique appearing to work:
//! \`effective_rank\` and \`retained_capability\`.

use std::fmt;

/// The rank of the update: the entire capacity of the adaptation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Rank(pub usize);

/// Input width of the adapted projection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InFeatures(pub usize);

/// Output width of the adapted projection.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OutFeatures(pub usize);

/// Which tenant's adapter, in a multi-adapter deployment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct AdapterSlot(pub usize);

/// What an adapter is pinned to. All three parts, not just the name.
///
/// Quantization belongs here: an adapter trained against a four-bit
/// base learned to compensate for that base's quantization error, so
/// the same checkpoint in full precision is a different model as far as
/// this adapter is concerned.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BaseFingerprint {
    pub checkpoint_id: String,
    pub quantization: String,
    pub tokenizer_id: String,
}

impl fmt::Display for BaseFingerprint {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{}[{}]/{}",
            self.checkpoint_id, self.quantization, self.tokenizer_id
        )
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum AdapterError {
    RankExceedsWeight {
        rank: Rank,
        smallest_dimension: usize,
    },
    NoTargetModules,
    ModuleNotTargeted {
        module: String,
        patterns: Vec<String>,
    },
    ShapeMismatch {
        expected: usize,
        found: usize,
    },
    BaseModelMismatch {
        trained_against: BaseFingerprint,
        serving: BaseFingerprint,
    },
    MergeAgainstQuantizedBase {
        quantization: String,
    },
    NonPositiveAlpha {
        alpha: f32,
    },
    NoCapabilityScores,
}

impl fmt::Display for AdapterError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RankExceedsWeight {
                rank,
                smallest_dimension,
            } => write!(
                formatter,
                "rank {} exceeds the smaller dimension {smallest_dimension}; a full-rank \\
                 update is fine-tuning with extra steps",
                rank.0
            ),
            Self::NoTargetModules => write!(
                formatter,
                "no target modules: an adapter attached to nothing trains nothing"
            ),
            Self::ModuleNotTargeted { module, patterns } => write!(
                formatter,
                "{module} matches none of {patterns:?}; the target-module set moves \\
                 quality more than rank does and is chosen far less carefully"
            ),
            Self::ShapeMismatch { expected, found } => {
                write!(formatter, "expected {expected} values, found {found}")
            }
            Self::BaseModelMismatch {
                trained_against,
                serving,
            } => write!(
                formatter,
                "adapter trained against {trained_against}, serving {serving}"
            ),
            Self::MergeAgainstQuantizedBase { quantization } => write!(
                formatter,
                "base is {quantization}; the adapter was trained against that \\
                 quantization error, so merging into a dequantized weight produces a \\
                 different model than the one evaluated"
            ),
            Self::NonPositiveAlpha { alpha } => {
                write!(formatter, "alpha must be positive, got {alpha}")
            }
            Self::NoCapabilityScores => write!(
                formatter,
                "no held-out capability scores; forgetting is unmeasured"
            ),
        }
    }
}

impl std::error::Error for AdapterError {}

/// Validated once, at construction.
///
/// These values are part of the artefact's meaning rather than launch
/// parameters: changing alpha after training does not adjust the
/// adapter, it applies a different update using the same weights.
#[derive(Debug, Clone)]
pub struct AdapterConfig {
    rank: Rank,
    alpha: f32,
    target_modules: Vec<String>,
    dropout: f32,
}

impl AdapterConfig {
    pub fn new(
        rank: Rank,
        alpha: f32,
        target_modules: Vec<String>,
        dropout: f32,
    ) -> Result<Self, AdapterError> {
        if alpha <= 0.0 {
            return Err(AdapterError::NonPositiveAlpha { alpha });
        }
        if target_modules.is_empty() {
            return Err(AdapterError::NoTargetModules);
        }
        Ok(Self {
            rank,
            alpha,
            target_modules,
            dropout: dropout.clamp(0.0, 0.99),
        })
    }

    #[must_use]
    pub fn rank(&self) -> Rank {
        self.rank
    }

    #[must_use]
    pub fn dropout(&self) -> f32 {
        self.dropout
    }

    /// alpha / r, computed here and never by a caller.
    ///
    /// Sweeping rank with alpha fixed sweeps this too, which is why
    /// such a study measures capacity and effective step size at once
    /// and resolves neither.
    #[must_use]
    pub fn scale(&self) -> f32 {
        self.alpha / self.rank.0 as f32
    }

    fn targets(&self, module: &str) -> bool {
        self.target_modules
            .iter()
            .any(|pattern| module.contains(pattern.as_str()))
    }
}

/// A frozen projection plus its rank-r update.
///
/// The base is borrowed, never owned. Not only memory: an owned copy
/// can drift from the weight actually serving traffic, and an adapter
/// whose frozen half has drifted is the hardest version of this bug to
/// find.
pub struct LoRAAdapter<'base> {
    name: String,
    base_weight: &'base mut [f32],
    out_features: OutFeatures,
    in_features: InFeatures,
    config: AdapterConfig,
    fingerprint: BaseFingerprint,
    down: Vec<f32>,
    up: Vec<f32>,
    merged: bool,
}

impl<'base> LoRAAdapter<'base> {
    pub fn attach(
        name: impl Into<String>,
        base_weight: &'base mut [f32],
        out_features: OutFeatures,
        in_features: InFeatures,
        config: AdapterConfig,
        fingerprint: BaseFingerprint,
    ) -> Result<Self, AdapterError> {
        let name = name.into();
        let expected = out_features.0 * in_features.0;
        if base_weight.len() != expected {
            return Err(AdapterError::ShapeMismatch {
                expected,
                found: base_weight.len(),
            });
        }

        let smallest = out_features.0.min(in_features.0);
        if config.rank().0 == 0 || config.rank().0 > smallest {
            return Err(AdapterError::RankExceedsWeight {
                rank: config.rank(),
                smallest_dimension: smallest,
            });
        }
        if !config.targets(&name) {
            return Err(AdapterError::ModuleNotTargeted {
                module: name,
                patterns: config.target_modules.clone(),
            });
        }

        let rank = config.rank().0;
        let std_dev = 1.0 / (in_features.0 as f32).sqrt();
        let down = (0..rank * in_features.0)
            .map(|index| {
                let phase = (index as f32 * 0.618_034).fract() - 0.5;
                phase * std_dev * 3.464
            })
            .collect();

        Ok(Self {
            name,
            base_weight,
            out_features,
            in_features,
            config,
            fingerprint,
            down,
            // Zero, so the adapted model starts exactly at the
            // pretrained one. An untrained adapter is a provable no-op.
            up: vec![0.0; out_features.0 * rank],
            merged: false,
        })
    }

    #[must_use]
    pub fn trainable_parameters(&self) -> usize {
        self.down.len() + self.up.len()
    }

    #[must_use]
    pub fn frozen_parameters(&self) -> usize {
        self.base_weight.len()
    }

    pub fn forward(&self, x: &[f32], out: &mut [f32]) -> Result<(), AdapterError> {
        if x.len() != self.in_features.0 {
            return Err(AdapterError::ShapeMismatch {
                expected: self.in_features.0,
                found: x.len(),
            });
        }
        if out.len() != self.out_features.0 {
            return Err(AdapterError::ShapeMismatch {
                expected: self.out_features.0,
                found: out.len(),
            });
        }

        for (row, slot) in out.iter_mut().enumerate() {
            let start = row * self.in_features.0;
            *slot = self.base_weight[start..start + self.in_features.0]
                .iter()
                .zip(x)
                .map(|(weight, value)| weight * value)
                .sum();
        }

        if self.merged {
            return Ok(());
        }

        let rank = self.config.rank().0;
        let projection: Vec<f32> = (0..rank)
            .map(|r| {
                let start = r * self.in_features.0;
                self.down[start..start + self.in_features.0]
                    .iter()
                    .zip(x)
                    .map(|(weight, value)| weight * value)
                    .sum()
            })
            .collect();

        let scale = self.config.scale();
        for (row, slot) in out.iter_mut().enumerate() {
            let start = row * rank;
            let update: f32 = self.up[start..start + rank]
                .iter()
                .zip(&projection)
                .map(|(weight, value)| weight * value)
                .sum();
            *slot += scale * update;
        }
        Ok(())
    }

    /// The update alone, scaled. For diagnostics only — materializing
    /// it on a serving path would defeat the point of the technique.
    #[must_use]
    pub fn delta(&self) -> Vec<f32> {
        let rank = self.config.rank().0;
        let scale = self.config.scale();
        let mut delta = vec![0.0_f32; self.out_features.0 * self.in_features.0];

        for row in 0..self.out_features.0 {
            for r in 0..rank {
                let weight = scale * self.up[row * rank + r];
                if weight == 0.0 {
                    continue;
                }
                let down_row = &self.down[r * self.in_features.0..(r + 1) * self.in_features.0];
                let target =
                    &mut delta[row * self.in_features.0..(row + 1) * self.in_features.0];
                for (slot, value) in target.iter_mut().zip(down_row) {
                    *slot += weight * value;
                }
            }
        }
        delta
    }

    /// Fold the update into the weight for the lifetime of a guard.
    ///
    /// A guard rather than a merge/unmerge pair, because the evaluation
    /// inside will eventually panic or return early, and a restore that
    /// depends on that not happening is a restore that will be skipped
    /// exactly when it matters.
    pub fn merged(&mut self) -> Result<MergedGuard<'_, 'base>, AdapterError> {
        if self.fingerprint.quantization != "none" {
            return Err(AdapterError::MergeAgainstQuantizedBase {
                quantization: self.fingerprint.quantization.clone(),
            });
        }

        let original = self.base_weight.to_vec();
        let delta = self.delta();
        for (slot, value) in self.base_weight.iter_mut().zip(&delta) {
            *slot += value;
        }
        self.merged = true;
        Ok(MergedGuard {
            adapter: self,
            original,
        })
    }

    pub fn verify_serving_base(&self, serving: &BaseFingerprint) -> Result<(), AdapterError> {
        if &self.fingerprint != serving {
            return Err(AdapterError::BaseModelMismatch {
                trained_against: self.fingerprint.clone(),
                serving: serving.clone(),
            });
        }
        Ok(())
    }

    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }
}

pub struct MergedGuard<'adapter, 'base> {
    adapter: &'adapter mut LoRAAdapter<'base>,
    original: Vec<f32>,
}

impl Drop for MergedGuard<'_, '_> {
    fn drop(&mut self) {
        self.adapter.base_weight.copy_from_slice(&self.original);
        self.adapter.merged = false;
    }
}

/// Directions the update actually uses, as a participation ratio.
///
/// A rank-64 adapter whose delta lives in four directions is reporting
/// that the rank sweep was never run. Cheap, and almost never computed,
/// which is why rank is usually a number someone copied from elsewhere.
#[must_use]
pub fn effective_rank(delta: &[f32]) -> f32 {
    let (sum_squares, sum_fourth) = delta.iter().fold((0.0_f32, 0.0_f32), |acc, value| {
        let squared = value * value;
        (acc.0 + squared, acc.1 + squared * squared)
    });

    if sum_fourth == 0.0 {
        return 0.0;
    }
    (sum_squares * sum_squares) / sum_fourth
}

pub struct CapabilityCheck {
    pub retained: bool,
    pub drop: f32,
}

/// Did adaptation cost something the in-domain metric cannot see?
///
/// Run against a frozen probe set unrelated to the fine-tuning data:
/// nothing in the objective protects a capability the training data
/// never mentioned, and the in-domain metric improving is exactly what
/// makes the regression easy to miss.
pub fn retained_capability(
    before: &[f32],
    after: &[f32],
    tolerance: f32,
) -> Result<CapabilityCheck, AdapterError> {
    if before.is_empty() || before.len() != after.len() {
        return Err(AdapterError::NoCapabilityScores);
    }

    let mean = |values: &[f32]| values.iter().sum::<f32>() / values.len() as f32;
    let drop = mean(before) - mean(after);
    Ok(CapabilityCheck {
        retained: drop <= tolerance,
        drop,
    })
}
`,
        profile:
          'Identical arithmetic to the literal version — the same base matvec and the same two thin adapter matvecs — with the frozen weight borrowed as a mutable slice rather than owned, so attaching an adapter allocates r(d + k) floats and nothing else. Illustrative, not a measured benchmark: the substantive change is that an oversized rank, a module matching no target pattern, a mismatched base and a merge against a quantized weight are now failures the caller must handle, and the restore after a merge happens on the unwinding path as well as the ordinary one.',
      },
      'make-it-fast': {
        rationale:
          'The single-adapter forward pass was already two thin matmuls beside a large one, so the optimization that matters is the mixed-tenant batch — the mode the whole multi-tenant argument rests on and the one that never shows up in a single-adapter benchmark. The shared base projection becomes one ndarray GEMM for the entire batch no matter how many adapters it contains, paid exactly once, which is the structural saving. The per-tenant update is handled by grouping the batch into runs that share an adapter and issuing one GEMM pair per run, so skewed traffic collapses into a handful of dense calls rather than a matmul per request; the grouping sort is the price, and it is recoverable only because real multi-tenant runs are long. Adapters for a module live in one contiguous ndarray indexed on the leading axis, so selecting one is a slice of a resident block rather than a chase through scattered allocations, and the alpha-over-r scale is folded into the up-projection once at load instead of multiplied across the full output width on every pass. Runs touch disjoint output rows once grouped, so rayon fans them across cores with nothing to synchronize. Scratch is sized from the serving shape at construction rather than per request, and the row packing is written as an iterator chain over slices so the bounds checks are elided in the copy rather than paid per element.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The shared base projection is one GEMM for the whole batch, and each run\'s two thin updates are GEMMs over contiguous slices of the stacked block',
            tradeoff: 'Pulls in a BLAS backend whose thread pool must be pinned to one thread inside the rayon region, or the two pools oversubscribe and both get slower',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Every adapter for a module sits in one block indexed on the leading axis, so selecting one is a contiguous slice and each run streams sequentially',
            tradeoff: 'Registering a tenant reallocates the block, so the adapter set is effectively immutable between reloads rather than editable at run time',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Runs write disjoint output rows once the batch is grouped, so they fan out across cores with no synchronization at all',
            tradeoff: 'Only pays when runs are long; many short runs spend more on dispatch than they recover, and the win depends entirely on the tenant distribution',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Packing, projection and ordering buffers are sized from the serving shape at construction, so a request path performs no allocation',
            tradeoff: 'Scratch is held at the peak batch shape for the process lifetime, so memory does not shrink when traffic does',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Row packing and the scatter back into the output are written as zipped slice iterators, so the copies vectorize instead of paying a bounds check per element',
            tradeoff: 'The chained form obscures the index arithmetic, which is exactly where an off-by-one in a gather would otherwise be visible',
          },
        ],
        code: `//! LoRA serving, shaped for the case the technique exists for.
//!
//! One frozen base, many adapters, mixed in a single batch. The layout
//! follows: adapters stacked contiguously and selected by slice, the
//! scale folded in at load, and the batch grouped into runs so each
//! tenant is one dense call rather than a matmul per request.
//!
//! What this does NOT change, stated first because it is what people
//! expect it to change: the backward pass still walks the full depth of
//! the frozen model. Training throughput is close to full
//! fine-tuning's. The saving was always memory.

use ndarray::{Array2, Array3, ArrayView2, Axis};
use rayon::prelude::*;

#[derive(Debug, Clone, Copy)]
pub struct ServingShape {
    pub max_batch: usize,
    pub rank: usize,
    pub in_features: usize,
    pub out_features: usize,
}

/// All adapters for one module, in two contiguous blocks.
///
/// \`down\` is (n_adapters, rank, in_features) and \`up\` is
/// (n_adapters, out_features, rank), both resident. Selecting an
/// adapter is a slice on the leading axis rather than a pointer chase
/// through n separate allocations -- the difference between a stream
/// and a stall.
///
/// The cost is immutability: registering a tenant reallocates both
/// blocks. Right for a process that reloads on a schedule, wrong for
/// one that wants runtime registration.
pub struct StackedAdapters {
    shape: ServingShape,
    down: Array3<f32>,
    up: Array3<f32>,
}

impl StackedAdapters {
    #[must_use]
    pub fn new(shape: ServingShape, adapter_count: usize) -> Self {
        Self {
            shape,
            down: Array3::zeros((adapter_count, shape.rank, shape.in_features)),
            up: Array3::zeros((adapter_count, shape.out_features, shape.rank)),
        }
    }

    /// Fold alpha/r into \`up\` once, here, and never again.
    ///
    /// The scale is a constant of the adapter, so applying it per
    /// forward pass is an out_features-wide multiply repeated for the
    /// life of the deployment. Folding it in at load costs one multiply
    /// per weight, total -- and means the stored tensors are no longer
    /// the trained ones, which is bookkeeping that must be written down
    /// somewhere a future maintainer will find it.
    pub fn load(&mut self, slot: usize, down: &ArrayView2<'_, f32>, up: &ArrayView2<'_, f32>, scale: f32) {
        self.down.index_axis_mut(Axis(0), slot).assign(down);
        let mut target = self.up.index_axis_mut(Axis(0), slot);
        target.assign(up);
        target *= scale;
    }

    #[must_use]
    pub fn shape(&self) -> ServingShape {
        self.shape
    }
}

/// Buffers sized from the serving shape, once.
///
/// A request path that allocates spends a measurable share of a cheap
/// layer inside the allocator, and every shape here is known before the
/// first request arrives.
pub struct Scratch {
    order: Vec<u32>,
    packed: Vec<f32>,
    projection: Vec<f32>,
}

impl Scratch {
    #[must_use]
    pub fn new(shape: ServingShape) -> Self {
        Self {
            order: Vec::with_capacity(shape.max_batch),
            packed: Vec::with_capacity(shape.max_batch * shape.in_features),
            projection: Vec::with_capacity(shape.max_batch * shape.rank),
        }
    }
}

/// Group a batch into runs that share an adapter.
///
/// Whether this pays depends entirely on the tenant distribution. A
/// batch of sixty-four distinct adapters gains nothing and has paid for
/// a sort; skewed traffic -- which is what real multi-tenant traffic
/// looks like -- collapses to a handful of long runs.
#[must_use]
pub fn group_runs(slots: &[u32], scratch: &mut Scratch) -> Vec<(u32, std::ops::Range<usize>)> {
    scratch.order.clear();
    scratch.order.extend(0..slots.len() as u32);
    scratch
        .order
        .sort_unstable_by_key(|&row| slots[row as usize]);

    let mut runs = Vec::new();
    let mut begin = 0_usize;
    for index in 1..scratch.order.len() {
        let previous = slots[scratch.order[index - 1] as usize];
        let current = slots[scratch.order[index] as usize];
        if current != previous {
            runs.push((previous, begin..index));
            begin = index;
        }
    }
    if let Some(&last) = scratch.order.last() {
        runs.push((slots[last as usize], begin..scratch.order.len()));
    }
    runs
}

/// Pack a run's rows into contiguous scratch.
///
/// Written as zipped slice iterators so the copy vectorizes instead of
/// paying a bounds check per element. The cost is that the index
/// arithmetic is now implicit, which is exactly where an off-by-one in
/// a gather would otherwise be visible.
#[inline]
fn gather_rows(activations: &[f32], rows: &[u32], width: usize, out: &mut Vec<f32>) {
    out.clear();
    for &row in rows {
        let start = row as usize * width;
        out.extend_from_slice(&activations[start..start + width]);
    }
}

/// Mixed-adapter batch.
///
/// \`activations\` is (batch, in_features); \`slots[i]\` names the adapter
/// for row i. The base GEMM is shared across the whole batch -- one
/// frozen weight, which is the entire operational argument for this
/// technique -- and only the thin update varies per row.
pub fn forward_batch(
    adapters: &StackedAdapters,
    activations: &ArrayView2<'_, f32>,
    base_weight: &ArrayView2<'_, f32>,
    slots: &[u32],
    scratch: &mut Scratch,
) -> Array2<f32> {
    let shape = adapters.shape();

    // Shared across every tenant, at full BLAS throughput. The dominant
    // term, paid once.
    let mut out = activations.dot(&base_weight.t());

    let runs = group_runs(slots, scratch);
    let order = scratch.order.clone();

    // Each run owns its own rows of the output, so there is nothing to
    // synchronize. Collected rather than written in place because rayon
    // will not hand out disjoint scattered row views for free, and the
    // scatter below is cheap beside the GEMMs.
    let updates: Vec<(std::ops::Range<usize>, Array2<f32>)> = runs
        .par_iter()
        .map(|(slot, range)| {
            let rows = &order[range.clone()];

            let mut packed = Vec::with_capacity(rows.len() * shape.in_features);
            gather_rows(
                activations.as_slice().unwrap_or(&[]),
                rows,
                shape.in_features,
                &mut packed,
            );
            let packed = Array2::from_shape_vec((rows.len(), shape.in_features), packed)
                .expect("packed shape follows from the gather");

            let down = adapters.down.index_axis(Axis(0), *slot as usize);
            let up = adapters.up.index_axis(Axis(0), *slot as usize);

            // (rows x in) * (in x rank) then (rows x rank) * (rank x out).
            // The scale is already inside \`up\`.
            let projection = packed.dot(&down.t());
            (range.clone(), projection.dot(&up.t()))
        })
        .collect();

    for (range, update) in updates {
        for (offset, row) in range.enumerate() {
            let destination = order[row] as usize;
            let mut target = out.index_axis_mut(Axis(0), destination);
            let source = update.index_axis(Axis(0), offset);
            target
                .iter_mut()
                .zip(source.iter())
                .for_each(|(slot, value)| *slot += value);
        }
    }
    out
}

/// The faster path when a batch shares one adapter.
///
/// Worth naming separately because it is common -- a single-tenant
/// deployment, or a scheduler that groups by adapter -- and because the
/// gather disappears entirely: two GEMMs for the whole batch and no
/// per-row slab. Grouping requests before serving turns the general
/// path into this one, at the cost of holding requests until a group
/// forms.
#[must_use]
pub fn forward_homogeneous(
    activations: &ArrayView2<'_, f32>,
    base_weight: &ArrayView2<'_, f32>,
    down: &ArrayView2<'_, f32>,
    up_scaled: &ArrayView2<'_, f32>,
) -> Array2<f32> {
    let mut out = activations.dot(&base_weight.t());
    let projection = activations.dot(&down.t());
    out += &projection.dot(&up_scaled.t());
    out
}

pub struct MemoryBreakdown {
    pub frozen_weights_gb: f64,
    pub gradients_gb: f64,
    pub optimizer_state_gb: f64,
    pub trainable_fraction: f64,
}

/// Where the memory actually went.
///
/// Included because the number people plan capacity from -- the
/// trainable-parameter ratio -- is not the number that decides whether
/// a run fits. Optimizer state scales with trainable parameters and
/// collapses; frozen weights do not move, and activation memory, which
/// is excluded here on purpose, is usually what fails first.
#[must_use]
pub fn memory_breakdown(
    total_parameters: usize,
    trainable: usize,
    bytes_per_parameter: usize,
) -> MemoryBreakdown {
    const GIGABYTE: f64 = 1024.0 * 1024.0 * 1024.0;

    MemoryBreakdown {
        frozen_weights_gb: (total_parameters * bytes_per_parameter) as f64 / GIGABYTE,
        gradients_gb: (trainable * bytes_per_parameter) as f64 / GIGABYTE,
        // Adam holds two fp32 moments per trainable parameter. This is
        // the term the technique removes, and the only one.
        optimizer_state_gb: (trainable * 2 * 4) as f64 / GIGABYTE,
        trainable_fraction: trainable as f64 / total_parameters as f64,
    }
}
`,
        profile:
          'Per batched forward: one O(batch·in·out) GEMM shared across every tenant, plus per run a gather of rows·in floats and two GEMMs at O(rows·rank·in) and O(rows·rank·out). Illustrative, not a measured benchmark: the shape to read is that the adapter arithmetic is linear in rank while the gather\'s memory traffic is linear in batch size, so the mixed path is bandwidth-bound where a homogeneous batch is not — which makes grouping traffic by adapter a larger win than anything done to the kernels, and makes a batch of all-distinct adapters the case where this layout pays for a sort it never recovers.',
      },
    },
  },
};
