import type { AiMlModel } from '../../types';

/**
 * Mixture of experts — the entry where the interesting object is the router
 * rather than the network.
 *
 * A technique rather than a model: it replaces a dense feed-forward block
 * with many and a learned choice among them, so parameter count and
 * per-token compute stop being the same number. The auxiliary load-balancing
 * loss is the part worth understanding, because it exists to fix a failure
 * the primary objective actively causes.
 */
export const MIXTURE_OF_EXPERTS: AiMlModel = {
  slug: 'mixture-of-experts',
  name: 'Mixture of Experts',
  aliases: ['MoE', 'Sparse MoE', 'Switch Transformer', 'Sparsely-gated mixture of experts', 'Expert routing'],
  category: 'generative-ai',
  group: 'autoregressive',
  kind: 'technique',

  paradigms: ['self-supervised', 'supervised'],
  taskTypes: ['generation', 'sequence-modeling', 'classification', 'regression'],
  paradigmNote:
    'A layer substitution rather than a training paradigm, so it inherits whatever objective the host model uses — which is why both self-supervised and supervised are listed. What it adds on top is an auxiliary loss of its own, and that addition is unusual: the load-balancing term optimizes nothing anyone wants, it exists purely to prevent the primary objective from collapsing the router.',

  intuition:
    'A dense layer applies every parameter to every token, which ties capacity to cost: doubling the parameters doubles the arithmetic. Replace the layer with many copies and a small router that picks one or two per token, and the two quantities come apart — total parameters grow with the expert count while per-token compute stays fixed. The difficulty is immediate and is the whole subject: the router is trained by gradient descent on the primary loss, and the fastest way for it to reduce that loss early is to send everything to whichever expert is currently best, which starves the others of gradient and makes them permanently worse. So a separate auxiliary loss is added whose only job is to stop that, and tuning its weight against the primary loss is the real engineering.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\mathcal{L}_{\\text{task}} + \\alpha \\underbrace{E \\sum_{e=1}^{E} f_e \\cdot P_e}_{\\text{load balancing}}, \\quad f_e = \\frac{1}{T}\\sum_t \\mathbb{1}[e \\in \\text{top-}k(t)]',
      symbols: [
        { symbol: 'E', meaning: 'number of experts; total parameters scale with it while per-token compute does not' },
        { symbol: 'f_e', meaning: 'fraction of tokens actually routed to expert e — a hard count, so not differentiable' },
        { symbol: 'P_e', meaning: 'mean router probability for expert e — soft, and the only path gradient can take' },
        { symbol: '\\alpha', meaning: 'the balancing weight; too small collapses the router, too large degrades the task' },
        { symbol: 'k', meaning: 'experts per token, almost always 1 or 2; the sparsity is what buys the compute saving' },
      ],
    },
    reading:
      'A task loss plus a penalty that optimizes nothing anybody wants. The balancing term is minimized when every expert receives an equal share, which is not a goal in itself — it is a defence against a failure the task loss creates. Note the asymmetry in the product: the token fraction is a hard count and carries no gradient, so all the gradient flows through the soft router probability, and the hard count acts only as a per-expert weight. That construction is doing something subtle: it penalizes high router confidence on experts that are already overloaded, which is the only differentiable handle on a discrete routing decision. The honest reading of the whole objective is that this is a technique whose main term is borrowed from whatever model hosts it and whose own contribution is a regularizer correcting for its own instability.',
  },

  optimization: {
    method: 'The host model’s optimizer, with a capacity factor and token dropping as the mechanism that makes batched routing possible',
    updateRule: {
      formula:
        'y_t = \\sum_{e \\in \\text{top-}k(t)} g_e(x_t) \\cdot \\text{FFN}_e(x_t), \\quad g(x) = \\text{softmax}\\bigl(W_r x\\bigr), \\quad \\text{capacity} = \\frac{T \\cdot k}{E} \\cdot c',
      symbols: [
        { symbol: 'g_e(x_t)', meaning: 'router weight for the chosen expert; multiplying by it is what makes the choice differentiable at all' },
        { symbol: 'W_r', meaning: 'the router — one small matrix, typically the cheapest parameter block in the layer and the most consequential' },
        { symbol: 'c', meaning: 'capacity factor, typically 1.0 to 1.25; the slack that decides how many tokens get dropped' },
        { symbol: 'T', meaning: 'tokens in the batch; capacity is per-batch, so routing behaviour depends on batch composition' },
      ],
    },
    rationale:
      'Two mechanisms, and both are consequences of wanting this to run on real hardware rather than of the idea itself. The router weight multiplies the expert output so that a gradient reaches the router at all: the top-k selection is discrete and has no derivative, but the weight of the chosen expert does, so the router learns by having its confidence scaled against how useful the choice turned out to be. That is a genuine trick and it is why the weight appears in the forward pass rather than only in the loss. The capacity factor is less elegant. Batched expert computation requires a fixed buffer per expert, so a batch where routing is uneven overflows some buffers, and the overflow tokens are simply dropped — they pass through the residual connection with no expert applied. That is a real correctness compromise accepted for throughput, and it means the layer’s output depends on which other tokens happen to share the batch. In training that is noise. In inference it is a reproducibility problem that surprises people, because the same input can produce different outputs depending on batch composition.',
    hyperparameters: [
      { name: 'expert count', role: 'Total parameters scale with it at fixed per-token compute; also scales the memory every device must hold', typicalRange: '8 to 128' },
      { name: 'experts per token (k)', role: 'One gives the largest compute saving; two is usually more stable because the router gets a second gradient path', typicalRange: '1 to 2' },
      { name: 'balancing weight', role: 'The most consequential knob here. Too small and the router collapses; too large and it overrides the task', typicalRange: '0.001 to 0.01' },
      { name: 'capacity factor', role: 'Slack in the per-expert buffer. Below 1.0 drops tokens routinely; above 1.25 wastes memory and compute', typicalRange: '1.0 to 1.25' },
      { name: 'router noise', role: 'Jitter added to router logits during training, which encourages exploration early and hurts if left on', typicalRange: '0 to 1e-2' },
      { name: 'expert dropout', role: 'Applied inside experts rather than to the routing, since dropping a routing decision drops the token entirely', typicalRange: '0 to 0.1' },
    ],
    convergence:
      'The characteristic failure is router collapse, and it is worth describing precisely because it is not a bug but the primary objective working as intended. Early in training one expert is marginally better than the others by chance; the router reduces loss by sending more tokens there; those tokens make it better still while the others receive almost no gradient and stagnate. The end state is a model with the memory cost of many experts and the capacity of one or two. The diagnostic is the routing histogram, not the loss curve — the loss looks entirely healthy throughout, which is what makes this failure expensive to discover late. The second failure is instability: router logits can grow without bound because nothing in the task loss penalizes confidence, and the fix in practice is to compute the router in float32 even when everything else is bfloat16, which is a numerical rather than algorithmic remedy. The third is fine-tuning behaviour: these models overfit noticeably faster than dense models of matched quality, because the effective capacity per token is far larger than the compute suggests.',
    complexity:
      'Per-token compute is O(k·d·d_ff) regardless of expert count, against O(d·d_ff) for a dense layer — so at k=1 the arithmetic is roughly that of the dense layer it replaced while total parameters are E times larger. Memory is the real cost and it is O(E·d·d_ff), which must be resident somewhere; on multiple devices this becomes an all-to-all communication per layer, which is frequently the actual bottleneck rather than the arithmetic.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Substitute the feed-forward blocks of a forecasting transformer with expert layers. The plausible story is that a heterogeneous panel contains distinguishable regimes or series families, and that the router learns to send each to specialized parameters — which would be capacity where it is needed rather than uniformly.',
        where: [
          'Large heterogeneous panels where series families behave differently enough to specialize',
          'Multi-region or multi-product forecasting under a single model with shared low-level structure',
          'Settings with abundant data per regime, since each expert only sees its own routed share',
          'Serving constraints that cap per-token compute while leaving memory headroom',
        ],
        why: 'The regime-specialization story is appealing and mostly unproven at typical forecasting scale. The constraint is data volume: each expert trains only on the tokens routed to it, so an eight-expert layer gives each expert a fraction of an already-modest dataset, and forecasting panels are usually orders of magnitude smaller than the language corpora where this technique was established. A dense model of matched memory footprint is the honest baseline and frequently wins. The place it does earn its keep is a genuinely large panel with distinguishable families and a hard per-token compute budget — and even there the routing histogram should be inspected before believing the specialization story, because a collapsed router produces a dense model at several times the memory cost.',
        featurization: [
          'Include the series identifier or family in the router input, or the router has nothing to specialize on',
          'Check the routing histogram against known regimes; if routing is uncorrelated with them, the specialization story is false',
          'Keep the per-expert token count large enough to train on — this bounds the expert count far more tightly than in language',
          'Compare against a dense model of matched memory, not matched compute, since memory is what this technique actually spends',
        ],
        evaluation:
          'Rolling-origin backtesting against a dense baseline of matched memory footprint, plus the routing histogram as a first-class diagnostic. A model whose accuracy matches the dense baseline while routing has collapsed is strictly worse than the baseline and the loss curve will not say so.',
        pitfalls: [
          'Too many experts for the panel size, so each trains on too few tokens',
          'Never inspecting routing, and shipping a collapsed router that cost the memory of many experts for the capacity of one',
          'Comparing against a compute-matched rather than memory-matched dense baseline, which flatters the technique',
          'Batch-composition dependence at inference, which makes single-series forecasts irreproducible when batching changes',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The technique provides no notion of surprise. It replaces a feed-forward block and inherits whatever objective the host model has, so anomaly scoring is a property of the host — a decoder-only model with expert layers scores by its own likelihood, and that likelihood is not what the routing contributed. The one genuinely MoE-specific signal, a token routed to an unusual expert, is a statement about the router’s partition rather than about the data, and it drifts with batch composition because of capacity dropping. Use the host model’s objective for detection.',
      },
      optimization: {
        fit: 'primary',
        how: 'The whole technique is a compute-allocation argument, and it is the clearest case in this reference of decoupling two quantities that are normally locked together: total parameters and per-token arithmetic. The auxiliary loss, the capacity factor and the all-to-all communication are each a separate optimization problem introduced by that decoupling.',
        where: [
          'Decoupling parameter count from per-token compute, which is the core claim and it holds',
          'The auxiliary loss as a defence against a degenerate optimum the primary objective prefers',
          'Capacity factor as an explicit accuracy-for-throughput trade, paid in dropped tokens',
          'Expert-parallel placement, where the all-to-all becomes the real bottleneck rather than the arithmetic',
        ],
        why: 'Worth studying for two transferable lessons. The first is that adding an auxiliary term to defend against your own objective’s preferred degenerate solution is a general pattern, and the construction here is unusually instructive — the hard token count carries no gradient and acts only as a weight on the soft probability, which is how a discrete decision gets a differentiable penalty. The second is that the headline win is not where the cost went. Arithmetic per token stays flat as promised, and then memory grows linearly with expert count and the all-to-all exchange per layer becomes the bottleneck on multiple devices. A technique that moves the constraint rather than removing it is still valuable, but the accounting should be honest about which constraint now binds.',
        featurization: [
          'Track the routing histogram from the first steps, since collapse happens early and the loss curve hides it entirely',
          'Compute the router in float32 even in a bfloat16 model; unbounded logit growth is a real and cheap-to-fix instability',
          'Measure the all-to-all time separately from the expert compute, or the profile attributes the cost to the wrong place',
          'Report the dropped-token fraction, because it is a silent accuracy cost that never appears in the loss',
        ],
        evaluation:
          'Quality at matched total memory against a dense baseline, not at matched FLOPs — matched-FLOP comparisons are the standard way this technique is made to look better than it is. Alongside that, the routing entropy over training and the dropped-token fraction, both of which can be healthy-looking in aggregate while the loss is fine and the model is quietly dense.',
        pitfalls: [
          'Matched-FLOP comparisons that ignore the memory the experts occupy',
          'Tuning the balancing weight by task loss alone, which cannot see a collapsed router',
          'Attributing the cost to arithmetic when the all-to-all dominates',
          'Treating dropped tokens as negligible without ever measuring the fraction',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'Replace the feed-forward block in every second transformer layer with an expert layer, keeping attention dense. Attention is left alone because its cost is quadratic in sequence length rather than in parameters, so routing it would complicate the layer without addressing where the parameters are.',
        where: [
          'Large language models where total capacity matters and per-token serving compute is capped',
          'Multilingual models, where the specialization story is strongest because languages are genuinely distinguishable',
          'Settings with memory headroom but a hard latency budget',
          'Domain-mixed corpora where routing has real structure to find',
        ],
        why: 'This is where the technique was established and where it demonstrably works: several of the strongest openly-described models use it, and the parameter-to-compute decoupling is real at that scale. Two honest caveats. The memory cost is unavoidable and total, since every expert must be resident somewhere regardless of how rarely it is used, which makes these models awkward on single devices and shifts the difficulty into expert-parallel serving where the all-to-all per layer frequently dominates. And fine-tuning is harder than for a dense model of matched quality — they overfit faster, because effective capacity per token is far above what the compute suggests, so the fine-tuning recipe that works on a dense model of the same speed will usually overfit here.',
        featurization: [
          'Alternate expert and dense layers rather than routing every block; routing everything gains little and costs stability',
          'Keep attention dense, since its cost scales with sequence length rather than parameter count',
          'Compute the router in float32 and monitor routing entropy from the first steps',
          'Reduce the learning rate and shorten fine-tuning relative to a dense model of matched quality',
        ],
        evaluation:
          'Held-out loss at matched total memory against a dense baseline, and separately at matched serving latency, because the technique wins on one of those comparisons and not the other. Routing entropy and dropped-token fraction reported alongside, since both can degrade while the loss looks fine.',
        pitfalls: [
          'Routing every layer, which adds all-to-all cost for marginal quality',
          'Fine-tuning with a dense model’s recipe and overfitting quickly',
          'Ignoring batch-composition dependence, which makes serving non-reproducible',
          'Reporting only the matched-FLOP comparison, which is the flattering one',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Route by user segment, item category or surface so that different populations get different parameters while the serving cost per request stays fixed. This is the oldest form of the idea in production systems, predating the sparse transformer version, and it usually appears as per-segment towers rather than a learned router.',
        where: [
          'Multi-surface ranking where a single model serves feeds, search and notifications with different dynamics',
          'Heavily segmented user populations with enough traffic per segment to train on',
          'Multi-task ranking where distinct objectives can occupy distinct parameters',
          'Latency-capped serving with memory to spare',
        ],
        why: 'Fits well because the segmentation is frequently known in advance, which removes the hardest part: a hand-specified router cannot collapse, and the routing histogram is fixed by construction. That makes this the safest version of the technique. The limit is the same data-volume constraint as forecasting — small segments starve, and the usual remedy is a shared dense trunk under the routed head so that low-traffic segments still benefit from the bulk of the parameters. Where a learned router is used instead, the collapse failure returns in full and the routing histogram must be monitored as a production metric rather than a training diagnostic.',
        featurization: [
          'Prefer a known segmentation over a learned router when one exists; it removes the collapse failure entirely',
          'Keep a shared dense trunk beneath the routed head so small segments are not starved',
          'Monitor per-segment traffic, since a shrinking segment silently becomes an undertrained expert',
          'If routing is learned, treat the histogram as a production metric rather than a training diagnostic',
        ],
        evaluation:
          'Per-segment offline ranking metrics rather than the pooled aggregate, since the pooled number hides a starved segment entirely, followed by an online test. Traffic share per expert tracked over time, because segment drift shows up there long before it shows up in the aggregate metric.',
        pitfalls: [
          'Segments too small to train their own parameters',
          'Pooled metrics concealing a segment that has degraded',
          'No shared trunk, so every segment pays for its own low-level representation',
          'Serving memory growing with segment count until the model no longer fits',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Per-token arithmetic close to the dense layer it replaced, which is the point, against memory that scales linearly with expert count. On multiple devices the all-to-all exchange per expert layer is frequently the dominant term, so the effective cost is a communication cost rather than a compute cost. Illustrative, not a measured benchmark.',
    inferenceProfile:
      'Fixed compute per token and total memory proportional to expert count, since every expert must be resident whether or not it is used. That combination is comfortable on a cluster and awkward on a single device, which is the practical dividing line for whether this technique is available at all.',
    retrainingCadence:
      'As for the host model. One MoE-specific addition: the routing distribution should be re-examined after any change to the data mixture, because a shift in mixture can quietly starve experts that were previously well-used.',
    driftAndMonitoring: [
      'Routing histogram as the primary health metric — collapse is invisible in the loss and expensive to discover late',
      'Dropped-token fraction, which is a silent accuracy cost that no loss term reports',
      'Router logit magnitude, since unbounded growth precedes numerical instability in reduced precision',
      'All-to-all time as a separate line in the profile, or the cost is attributed to the wrong component',
      'Per-expert traffic share over time, because a data-mixture shift starves experts without any other symptom',
    ],
    productionGotchas: [
      'Output depends on batch composition. Capacity is per-batch and overflow tokens are dropped, so the same input can produce different outputs depending on what else is in the batch — this breaks reproducibility and surprises people who expect a deterministic model',
      'Every expert must be resident in memory regardless of use, so total memory is the constraint even though per-token compute is not',
      'A collapsed router produces a model with the memory cost of many experts and the capacity of one or two, and the loss curve looks entirely healthy',
      'Router precision matters. Computing router logits in bfloat16 invites unbounded growth and instability; float32 there is a cheap and standard fix',
      'Fine-tuning overfits faster than for a dense model of matched quality, so a recipe transplanted from a dense model of the same speed will usually need fewer steps and a lower rate',
      'Expert-parallel serving introduces an all-to-all per layer, which is frequently the real latency bottleneck rather than the expert arithmetic',
      'Matched-FLOP comparisons flatter this technique considerably; the honest comparison is at matched total memory',
    ],
  },

  assumptions: [
    'The token distribution contains structure a router can usefully partition, rather than being homogeneous',
    'Memory is available for all experts while per-token compute is the binding constraint — if memory binds instead, the technique is counterproductive',
    'Enough data exists that each expert trains on a sufficient share, which bounds expert count far more tightly than compute does',
    'Batch-composition dependence of the output is acceptable, or capacity is set high enough that dropping effectively never happens',
    'The host model provides the actual objective; this technique supplies capacity and a regularizer, not a learning signal',
  ],

  pros: [
    {
      point: 'Parameter count and per-token compute come apart',
      context:
        'The central claim and it holds: total capacity grows with expert count while arithmetic per token stays at roughly the dense layer it replaced. This is the clearest decoupling of two normally-locked quantities in this reference.',
    },
    {
      point: 'A drop-in layer substitution',
      context:
        'It replaces a feed-forward block and inherits the host objective, so it composes with almost any transformer without redesigning training. That is why it appears across language, vision and ranking.',
    },
    {
      point: 'Specialization is real where the data is genuinely heterogeneous',
      context:
        'Multilingual and multi-surface models show routing that correlates with meaningful structure. Worth verifying with the histogram rather than assuming, since a collapsed router looks identical in the loss.',
    },
    {
      point: 'The known-segmentation variant is safe',
      context:
        'A hand-specified router cannot collapse, which removes the technique’s main failure mode entirely. This is why per-segment towers have been production practice in ranking for far longer than sparse transformers have existed.',
    },
  ],

  cons: [
    {
      point: 'Router collapse, which the primary objective actively prefers',
      context:
        'Sending everything to the currently-best expert lowers the task loss fastest, so the degenerate solution is an attractor. Invisible in the loss curve, diagnosable only from the routing histogram, and expensive to find late.',
    },
    {
      point: 'Total memory scales with expert count',
      context:
        'Every expert must be resident whether or not it is used, which moves the constraint from compute to memory rather than removing it. On a single device this frequently makes the technique unavailable.',
    },
    {
      point: 'Output depends on batch composition',
      context:
        'Per-batch capacity means overflow tokens are dropped, so the same input can yield different outputs depending on its batch. A genuine correctness compromise accepted for throughput, and a reproducibility problem in serving.',
    },
    {
      point: 'Another loss term with another weight to tune',
      context:
        'The balancing weight trades against the task loss with no principled setting. Too small collapses the router, too large degrades the task, and the task loss alone cannot tell you which is happening.',
    },
    {
      point: 'All-to-all communication becomes the bottleneck',
      context:
        'Expert-parallel serving exchanges tokens across devices every expert layer, and that cost is frequently larger than the arithmetic saved. A profile that only measures compute will attribute the latency to the wrong place.',
    },
    {
      point: 'Fine-tuning is harder than for a dense model of matched quality',
      context:
        'Effective capacity per token is far above what the compute suggests, so these models overfit faster. A dense model’s recipe transplanted directly will usually overfit.',
    },
  ],

  relatedSlugs: ['decoder-only-lm', 'transformer', 'masked-lm', 'random-forest', 'gradient-boosting'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Sparse mixture of experts, transcribed from the objective.

No ML library. One router, E expert MLPs, top-k selection per token, and
the auxiliary load-balancing loss written out so the two terms of

    L = L_task + alpha * E * sum_e f_e * P_e

can be read against each other.

The thing to notice: \`+ '\`' + \`f_e\` is a hard count of tokens routed to expert
e, so it carries no gradient. \`+ '\`' + \`P_e\` is the mean router probability
and is soft. All the gradient flows through P_e, with f_e acting only as
a per-expert weight. That asymmetry is how a discrete routing decision
gets a differentiable penalty, and it is the whole trick.
"""

import math


def softmax(values):
    top = max(values)
    exps = [math.exp(value - top) for value in values]
    total = sum(exps)
    return [value / total for value in exps]


def matvec(matrix, vector):
    return [
        sum(row[idx] * vector[idx] for idx in range(len(vector)))
        for row in matrix
    ]


def relu(values):
    return [value if value > 0.0 else 0.0 for value in values]


def expert_forward(token, w_in, w_out):
    """One expert: a plain two-layer MLP. Nothing special about it.

    The experts are ordinary. Everything interesting is in the router.
    """
    return matvec(w_out, relu(matvec(w_in, token)))


def route(token, router_weights, n_experts, top_k):
    """Score every expert, keep the k best, renormalize over those.

    Renormalizing over the kept experts matters: without it the output
    magnitude depends on how much probability mass happened to land
    outside the top-k, which varies per token and injects noise the
    residual stream has to absorb.
    """
    logits = matvec(router_weights, token)
    probabilities = softmax(logits)

    ranked = sorted(range(n_experts), key=lambda expert: -probabilities[expert])
    chosen = ranked[:top_k]

    kept_mass = sum(probabilities[expert] for expert in chosen)
    weights = {expert: probabilities[expert] / kept_mass for expert in chosen}
    return weights, probabilities


def moe_layer(tokens, router_weights, experts, top_k, capacity_factor):
    """Forward pass with capacity, so token dropping is visible.

    Capacity is the ugly part and it is not an implementation detail.
    Batched expert computation needs a fixed buffer per expert, so an
    uneven batch overflows some buffers and the overflow tokens are
    DROPPED -- they pass through with no expert applied at all.

    Consequence worth stating plainly: the output for a token depends on
    which other tokens share its batch. In training that is noise. At
    serving time it means the same input can produce different outputs,
    which surprises people who expect a deterministic model.
    """
    n_tokens = len(tokens)
    n_experts = len(experts)
    width = len(tokens[0])

    capacity = max(1, int(n_tokens * top_k / n_experts * capacity_factor))

    outputs = [[0.0] * width for _ in range(n_tokens)]
    assignments = [[] for _ in range(n_experts)]
    dropped = 0

    router_probabilities = []
    for position, token in enumerate(tokens):
        weights, probabilities = route(token, router_weights, n_experts, top_k)
        router_probabilities.append(probabilities)
        for expert, weight in weights.items():
            if len(assignments[expert]) >= capacity:
                dropped += 1
                continue
            assignments[expert].append((position, weight))

    for expert, assigned in enumerate(assignments):
        w_in, w_out = experts[expert]
        for position, weight in assigned:
            expert_output = expert_forward(tokens[position], w_in, w_out)
            for idx in range(width):
                # The router weight multiplies the expert output. This is
                # what makes the routing decision differentiable at all:
                # top-k has no derivative, but the weight of the chosen
                # expert does, so the router learns by having its
                # confidence scaled against how useful the choice was.
                outputs[position][idx] += weight * expert_output[idx]

    return outputs, assignments, router_probabilities, dropped


def load_balancing_loss(assignments, router_probabilities, n_tokens):
    """The auxiliary term: E * sum_e f_e * P_e.

    Minimized when every expert gets an equal share. That is not a goal
    anybody has -- it is a defence against a failure the TASK loss
    causes. Early in training one expert is marginally better by chance,
    the router reduces loss fastest by sending everything there, those
    tokens make it better still, and the rest stagnate for want of
    gradient. The end state is the memory cost of many experts and the
    capacity of one.

    The loss curve looks entirely healthy throughout. Only the routing
    histogram shows it, which is why collapse is usually discovered late.
    """
    n_experts = len(assignments)

    fraction = [len(assigned) / n_tokens for assigned in assignments]
    mean_probability = [
        sum(probabilities[expert] for probabilities in router_probabilities) / n_tokens
        for expert in range(n_experts)
    ]

    # fraction[] is a hard count: no gradient. mean_probability[] is soft
    # and is the only path a gradient can take.
    return n_experts * sum(
        fraction[expert] * mean_probability[expert] for expert in range(n_experts)
    )


def routing_histogram(assignments, n_tokens):
    """The diagnostic that actually matters. Watch this, not the loss."""
    shares = [len(assigned) / n_tokens for assigned in assignments]
    total = sum(shares)
    if total <= 0.0:
        return {"shares": shares, "entropy": 0.0, "max_share": 0.0}

    normalized = [share / total for share in shares]
    entropy = -sum(
        share * math.log(share) for share in normalized if share > 0.0
    )
    return {
        "shares": shares,
        # Uniform routing gives log(E); collapse drives this toward 0.
        "entropy": entropy,
        "max_share": max(shares),
    }
`,
        profile:
          'Per-token compute is O(k·d·d_ff) against O(d·d_ff) for the dense layer it replaces, so at k=1 the arithmetic barely moves while parameters grow E-fold. Illustrative, not a measured benchmark: this transcription runs one expert call per assigned token in a Python loop, so it is dominated by interpreter overhead and demonstrates the routing rather than the saving.',
      },
      'make-it-right': {
        rationale:
          'The router becomes a class with the routing histogram as a first-class output rather than something a caller reconstructs, because collapse is invisible in the loss and a diagnostic that must be assembled by hand does not get watched. Capacity and the dropped-token count stop being incidental and become part of the returned result, so the accuracy cost of batching is reported rather than silent. Specific exceptions separate the failures that actually occur: a collapsed router detected by entropy threshold, a capacity factor that guarantees dropping, and a top-k larger than the expert count. The router logits are computed in float64 here to make the precision point explicit — unbounded logit growth is the standard numerical failure and float32 routing in a reduced-precision model is the standard fix.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        code: `"""Mixture of experts with routing health as a returned value.

The design point: router collapse is invisible in the loss and visible
only in the routing histogram, so the histogram is part of the layer's
output rather than something a caller reassembles. A diagnostic that has
to be reconstructed by hand does not get watched, and this particular
failure is expensive to discover late.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Final, Sequence

import numpy as np
from numpy.typing import NDArray

# Uniform routing over E experts gives entropy log(E). Below this fraction
# of it, the router has effectively collapsed.
COLLAPSE_ENTROPY_RATIO: Final[float] = 0.5


class RouterCollapsed(RuntimeError):
    """Routing entropy has fallen far enough that experts are starving.

    Not a numerical error -- the primary objective PREFERS this solution.
    Sending every token to the currently-best expert lowers the task loss
    fastest, so collapse is an attractor rather than a bug, and the loss
    curve looks healthy the whole way down.
    """


class CapacityTooTight(ValueError):
    """A capacity factor below 1.0 guarantees dropping even under perfect
    routing, which is almost never intended."""


class InvalidTopK(ValueError):
    """More experts requested per token than exist."""


class RouterPrecisionWarning(UserWarning):
    """Router logits computed in reduced precision.

    Nothing in the task loss penalizes router confidence, so logits can
    grow without bound; in bfloat16 that reaches instability quickly. The
    standard fix is float32 for the router alone, which is cheap because
    the router is the smallest weight in the layer.
    """


@dataclass(frozen=True, slots=True)
class MoEConfig:
    """Frozen because these are a training contract, not runtime knobs."""

    n_experts: int
    top_k: int = 2
    capacity_factor: float = 1.25
    balancing_weight: float = 0.01
    router_jitter: float = 0.0

    def __post_init__(self) -> None:
        if self.n_experts < 2:
            raise ValueError(f"need at least 2 experts, got {self.n_experts}")
        if not 1 <= self.top_k <= self.n_experts:
            raise InvalidTopK(
                f"top_k {self.top_k} outside [1, {self.n_experts}]"
            )
        if self.capacity_factor < 1.0:
            raise CapacityTooTight(
                f"capacity_factor {self.capacity_factor} drops tokens even "
                "under perfectly uniform routing"
            )
        if self.balancing_weight < 0.0:
            raise ValueError("balancing_weight must be non-negative")

    def capacity_for(self, n_tokens: int) -> int:
        """Per-expert buffer size. Per BATCH, which is the whole problem."""
        exact = n_tokens * self.top_k / self.n_experts * self.capacity_factor
        return max(1, int(exact))


@dataclass(frozen=True, slots=True)
class RoutingHealth:
    """What a caller must monitor. Returned, not reconstructed."""

    shares: NDArray[np.float64]
    entropy: float
    max_entropy: float
    dropped_fraction: float

    @property
    def entropy_ratio(self) -> float:
        """1.0 is uniform routing; toward 0.0 is collapse."""
        if self.max_entropy <= 0.0:
            return 0.0
        return self.entropy / self.max_entropy

    @property
    def has_collapsed(self) -> bool:
        return self.entropy_ratio < COLLAPSE_ENTROPY_RATIO

    def raise_if_collapsed(self) -> None:
        """Guard clause for a training loop that should stop early."""
        if not self.has_collapsed:
            return
        busiest = int(np.argmax(self.shares))
        raise RouterCollapsed(
            f"entropy ratio {self.entropy_ratio:.3f} below "
            f"{COLLAPSE_ENTROPY_RATIO}; expert {busiest} holds "
            f"{self.shares[busiest]:.1%} of tokens"
        )


@dataclass(slots=True)
class MoEOutput:
    """The layer output alongside everything needed to judge it."""

    activations: NDArray[np.float32]
    balancing_loss: float
    health: RoutingHealth
    assignments: list[NDArray[np.int32]] = field(default_factory=list)


class Router:
    """Top-k routing with the histogram as an output.

    Deliberately separate from the experts: the experts are ordinary MLPs
    and the router is where every interesting failure lives, so they do
    not belong in one class.
    """

    def __init__(self, weights: NDArray[np.float32], config: MoEConfig) -> None:
        if weights.shape[0] != config.n_experts:
            raise ValueError(
                f"router has {weights.shape[0]} rows for "
                f"{config.n_experts} experts"
            )
        # float64 here to make the precision point explicit. In a real
        # bfloat16 model the router alone runs in float32 -- cheap,
        # because it is the smallest weight in the layer.
        self._weights = weights.astype(np.float64)
        self._config = config

    def route(
        self,
        tokens: NDArray[np.float32],
        rng: np.random.Generator | None = None,
    ) -> tuple[NDArray[np.int32], NDArray[np.float64], NDArray[np.float64]]:
        """Return chosen experts, renormalized weights, and full probabilities.

        The full probability matrix is returned because the balancing loss
        needs the soft distribution over ALL experts, not just the chosen
        ones -- the gradient path runs through the unchosen entries too.
        """
        logits = tokens.astype(np.float64) @ self._weights.T

        if self._config.router_jitter > 0.0:
            # No mutable default; a shared Generator across calls would
            # make one caller's draws depend on another's.
            generator = rng if rng is not None else np.random.default_rng()
            logits = logits + generator.normal(
                scale=self._config.router_jitter, size=logits.shape
            )

        shifted = logits - logits.max(axis=-1, keepdims=True)
        exps = np.exp(shifted)
        probabilities = exps / exps.sum(axis=-1, keepdims=True)

        top_k = self._config.top_k
        chosen = np.argpartition(-probabilities, top_k - 1, axis=-1)[:, :top_k]
        chosen_probabilities = np.take_along_axis(probabilities, chosen, axis=-1)

        # Renormalize over the kept experts. Without this the output
        # magnitude depends on how much mass fell outside the top-k,
        # which varies per token and injects noise downstream.
        kept_mass = chosen_probabilities.sum(axis=-1, keepdims=True)
        weights = chosen_probabilities / np.maximum(kept_mass, 1e-12)

        return chosen.astype(np.int32), weights, probabilities


class MoELayer:
    """Experts plus a router, with capacity enforced and reported."""

    def __init__(
        self,
        router: Router,
        expert_w_in: NDArray[np.float32],
        expert_w_out: NDArray[np.float32],
        config: MoEConfig,
    ) -> None:
        if expert_w_in.shape[0] != config.n_experts:
            raise ValueError(
                f"{expert_w_in.shape[0]} expert weight blocks for "
                f"{config.n_experts} experts"
            )
        self._router = router
        self._w_in = expert_w_in
        self._w_out = expert_w_out
        self._config = config

    def forward(
        self,
        tokens: NDArray[np.float32],
        rng: np.random.Generator | None = None,
    ) -> MoEOutput:
        if tokens.ndim != 2:
            raise ValueError(f"expected (tokens, width), got {tokens.shape}")

        n_tokens, width = tokens.shape
        chosen, weights, probabilities = self._router.route(tokens, rng)
        capacity = self._config.capacity_for(n_tokens)

        activations = np.zeros((n_tokens, width), dtype=np.float32)
        assignments: list[NDArray[np.int32]] = []
        dropped = 0

        for expert in range(self._config.n_experts):
            slot_positions, slot_ranks = np.nonzero(chosen == expert)
            if slot_positions.size == 0:
                assignments.append(np.empty(0, dtype=np.int32))
                continue

            # Capacity truncation. Order is arrival order within the
            # batch, so which tokens survive depends on batch composition.
            if slot_positions.size > capacity:
                dropped += int(slot_positions.size - capacity)
                slot_positions = slot_positions[:capacity]
                slot_ranks = slot_ranks[:capacity]

            assignments.append(slot_positions.astype(np.int32))

            hidden = tokens[slot_positions] @ self._w_in[expert].T
            np.maximum(hidden, 0.0, out=hidden)
            expert_output = hidden @ self._w_out[expert].T

            # Router weight scales the expert output; this is the only
            # differentiable path to the routing decision.
            scale = weights[slot_positions, slot_ranks].astype(np.float32)
            activations[slot_positions] += scale[:, None] * expert_output

        health = self._health(assignments, n_tokens, dropped)
        balancing = self._balancing_loss(assignments, probabilities, n_tokens)

        return MoEOutput(
            activations=activations,
            balancing_loss=self._config.balancing_weight * balancing,
            health=health,
            assignments=assignments,
        )

    def _balancing_loss(
        self,
        assignments: Sequence[NDArray[np.int32]],
        probabilities: NDArray[np.float64],
        n_tokens: int,
    ) -> float:
        """E * sum_e f_e * P_e, with the gradient asymmetry preserved.

        f_e is a hard count and carries no gradient. P_e is soft. The
        product penalizes high router confidence on already-overloaded
        experts, which is the only differentiable handle available on a
        discrete decision.
        """
        n_experts = self._config.n_experts
        fraction = np.array(
            [assigned.size / n_tokens for assigned in assignments], dtype=np.float64
        )
        mean_probability = probabilities.mean(axis=0)
        return float(n_experts * np.dot(fraction, mean_probability))

    def _health(
        self,
        assignments: Sequence[NDArray[np.int32]],
        n_tokens: int,
        dropped: int,
    ) -> RoutingHealth:
        shares = np.array(
            [assigned.size / n_tokens for assigned in assignments], dtype=np.float64
        )
        total = shares.sum()
        if total <= 0.0:
            return RoutingHealth(shares, 0.0, 0.0, 1.0)

        normalized = shares / total
        nonzero = normalized[normalized > 0.0]
        entropy = float(-np.sum(nonzero * np.log(nonzero)))

        return RoutingHealth(
            shares=shares,
            entropy=entropy,
            max_entropy=float(np.log(self._config.n_experts)),
            dropped_fraction=dropped / (n_tokens * self._config.top_k),
        )
`,
        profile:
          'Same asymptotics as the naive version — one gather and two matmuls per expert rather than a Python loop per token, so the constant factor falls substantially without the complexity changing. Illustrative, not a measured benchmark: what the stage buys is that a collapsed router now raises rather than training quietly to a healthy-looking loss, and the dropped-token fraction is reported instead of invisible.',
      },
      'make-it-fast': {
        rationale:
          'The per-expert Python loop becomes a single grouped matmul: tokens are sorted by expert assignment so each expert’s inputs form one contiguous block, and the whole layer is then two batched matmuls over a permuted array rather than E separate gathers. The permutation is the key move — it converts a scatter-gather pattern into contiguous slices, which is what lets BLAS run at full efficiency, and the inverse permutation puts the outputs back. Router probabilities are computed once for the whole batch as one matmul, the top-k uses a partial partition rather than a full sort, and the balancing loss reuses the already-materialized probability matrix rather than recomputing it.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Routing becomes one matmul for the whole batch and each expert one pair of GEMMs over a contiguous block',
            tradeoff: 'The routing decision per token is no longer visible in the code; it is implied by a permutation array that has to be trusted or asserted',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Sorting tokens by expert replaces a per-token dispatch with one pass over E contiguous segments',
            tradeoff: 'The sort costs O(T log T) and only pays off once the token count per expert is large enough to amortize it',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The permuted token block is contiguous per expert, so each expert GEMM streams instead of gathering scattered rows',
            tradeoff: 'The permutation materializes a full copy of the batch, doubling the layer’s peak activation memory',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Expert outputs are written directly into a preallocated permuted buffer, so no intermediate per-expert array is created',
            tradeoff: 'The buffer is sized for the worst case across experts, so memory is held whether or not routing is balanced',
          },
        ],
        code: `"""Mixture of experts with tokens sorted into contiguous expert blocks.

The optimization that matters: a naive implementation gathers scattered
rows per expert, which strides across memory and leaves BLAS idle.
Sorting the batch by expert assignment makes each expert's inputs one
CONTIGUOUS slice, so the layer becomes a pass over E contiguous segments
with two GEMMs each. The inverse permutation puts the outputs back.

What this does NOT change: the capacity mechanism, and therefore the
batch-composition dependence of the output. That is inherent to batched
expert computation, not an artefact of any implementation -- the same
input really can produce different outputs depending on what shares its
batch, and no amount of optimization removes it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import numpy as np
from numpy.typing import NDArray

COLLAPSE_ENTROPY_RATIO: Final[float] = 0.5


@dataclass(frozen=True, slots=True)
class SortedRouting:
    """A permutation that makes each expert's tokens contiguous.

    order          -- token indices sorted by assigned expert
    expert_offsets -- E+1 boundaries, so expert e owns order[off[e]:off[e+1]]
    weights        -- router weight per (permuted) slot
    probabilities  -- full soft distribution, kept for the balancing loss
    """

    order: NDArray[np.int64]
    expert_offsets: NDArray[np.int64]
    weights: NDArray[np.float32]
    probabilities: NDArray[np.float32]
    dropped: int


def route_and_sort(
    tokens: NDArray[np.float32],
    router_weights: NDArray[np.float32],
    n_experts: int,
    top_k: int,
    capacity_factor: float,
) -> SortedRouting:
    """One matmul for routing, one argsort for locality.

    Router logits in float32 even if \`+ '\`' + \`tokens\` is lower precision: nothing
    in the task loss penalizes router confidence, so logits grow without
    bound, and in bfloat16 that reaches instability quickly. The router is
    the smallest weight in the layer, so the upcast is nearly free.
    """
    n_tokens = tokens.shape[0]

    logits = tokens.astype(np.float32, copy=False) @ router_weights.T
    logits -= logits.max(axis=-1, keepdims=True)
    np.exp(logits, out=logits)
    logits /= logits.sum(axis=-1, keepdims=True)
    probabilities = logits  # now a distribution; reused below, not recomputed

    # Partial partition rather than a full sort: only the top-k boundary
    # matters, and k is 1 or 2 against E of 8 to 128.
    chosen = np.argpartition(-probabilities, top_k - 1, axis=-1)[:, :top_k]
    chosen_probabilities = np.take_along_axis(probabilities, chosen, axis=-1)
    kept_mass = chosen_probabilities.sum(axis=-1, keepdims=True)
    slot_weights = chosen_probabilities / np.maximum(kept_mass, 1e-12)

    flat_experts = chosen.reshape(-1)
    flat_tokens = np.repeat(np.arange(n_tokens, dtype=np.int64), top_k)
    flat_weights = slot_weights.reshape(-1).astype(np.float32)

    # Stable sort by expert: within an expert, arrival order is preserved,
    # which is what makes capacity truncation deterministic FOR A FIXED
    # BATCH -- and undefined across different batches.
    order = np.argsort(flat_experts, kind="stable")
    sorted_experts = flat_experts[order]

    counts = np.bincount(sorted_experts, minlength=n_experts)
    capacity = max(1, int(n_tokens * top_k / n_experts * capacity_factor))

    keep = np.ones(order.size, dtype=bool)
    offsets = np.zeros(n_experts + 1, dtype=np.int64)
    cursor = 0
    dropped = 0
    for expert in range(n_experts):
        count = int(counts[expert])
        if count > capacity:
            keep[cursor + capacity : cursor + count] = False
            dropped += count - capacity
        cursor += count

    kept_order = order[keep]
    kept_experts = flat_experts[kept_order]
    kept_counts = np.bincount(kept_experts, minlength=n_experts)
    offsets[1:] = np.cumsum(kept_counts)

    return SortedRouting(
        order=flat_tokens[kept_order],
        expert_offsets=offsets,
        weights=flat_weights[kept_order],
        probabilities=probabilities,
        dropped=dropped,
    )


def moe_forward(
    tokens: NDArray[np.float32],
    routing: SortedRouting,
    expert_w_in: NDArray[np.float32],
    expert_w_out: NDArray[np.float32],
    out: NDArray[np.float32] | None = None,
) -> NDArray[np.float32]:
    """Two GEMMs per expert over contiguous slices.

    The permutation is the whole optimization. \`+ '\`' + \`permuted\` is a copy of
    the batch in expert order, so \`+ '\`' + \`permuted[lo:hi]\` is a contiguous block
    that BLAS can stream. The cost is a full extra copy of the activations,
    which roughly doubles peak memory for this layer -- worth it because
    the alternative is a strided gather inside every expert matmul.
    """
    n_tokens, width = tokens.shape
    n_experts = expert_w_in.shape[0]
    n_slots = routing.order.size

    permuted = np.ascontiguousarray(tokens[routing.order])
    # Preallocated and written in place, so no per-expert intermediate.
    permuted_out = np.empty((n_slots, width), dtype=np.float32)

    for expert in range(n_experts):
        lo = int(routing.expert_offsets[expert])
        hi = int(routing.expert_offsets[expert + 1])
        if hi <= lo:
            continue

        block = permuted[lo:hi]
        hidden = block @ expert_w_in[expert].T
        np.maximum(hidden, 0.0, out=hidden)
        np.matmul(hidden, expert_w_out[expert].T, out=permuted_out[lo:hi])

    # Router weight scales the output before scatter-add. Still the only
    # differentiable path to the routing decision.
    permuted_out *= routing.weights[:, None]

    activations = out if out is not None else np.zeros(
        (n_tokens, width), dtype=np.float32
    )
    if out is not None:
        activations.fill(0.0)

    # np.add.at is the correct scatter-add: a token routed to k experts
    # appears k times in \`+ '\`' + \`order\` and its contributions must sum.
    np.add.at(activations, routing.order, permuted_out)
    return activations


def balancing_loss(
    routing: SortedRouting, n_tokens: int, n_experts: int, weight: float
) -> float:
    """E * sum_e f_e * P_e, reusing the probability matrix already computed.

    Recomputing the softmax here would double the router cost for no
    reason; the forward pass already materialized it.
    """
    counts = np.diff(routing.expert_offsets).astype(np.float32)
    fraction = counts / np.float32(n_tokens)
    mean_probability = routing.probabilities.mean(axis=0)
    return float(weight * n_experts * np.dot(fraction, mean_probability))


def routing_health(
    routing: SortedRouting, n_tokens: int, n_experts: int, top_k: int
) -> dict[str, float]:
    """The metric to watch. Cheap enough to compute every step.

    A model whose task loss looks perfect while entropy_ratio sits near
    zero has the memory footprint of E experts and the capacity of one.
    No other signal reports that.
    """
    counts = np.diff(routing.expert_offsets).astype(np.float64)
    total = counts.sum()
    if total <= 0.0:
        return {"entropy_ratio": 0.0, "max_share": 0.0, "dropped_fraction": 1.0}

    shares = counts / total
    nonzero = shares[shares > 0.0]
    entropy = float(-np.sum(nonzero * np.log(nonzero)))
    max_entropy = float(np.log(n_experts))

    return {
        "entropy_ratio": entropy / max_entropy if max_entropy > 0.0 else 0.0,
        "max_share": float(shares.max()),
        "dropped_fraction": routing.dropped / max(1, n_tokens * top_k),
        "collapsed": float(
            (entropy / max_entropy if max_entropy > 0.0 else 0.0)
            < COLLAPSE_ENTROPY_RATIO
        ),
    }
`,
        profile:
          'Per-token arithmetic is unchanged at O(k·d·d_ff) — the asymptotics were never the problem — but each expert now issues two GEMMs over a contiguous block instead of a strided gather, which is the difference between memory-bound and compute-bound. Illustrative, not a measured benchmark: the sort adds O(T log T) and the permutation copy roughly doubles peak activation memory for the layer, so the win depends on tokens per expert being large.',
      },
    },
    cpp: {
      'make-it-work': {
        code: `// Sparse mixture of experts, transcribed from the objective.
//
//     L = L_task + alpha * E * sum_e f_e * P_e
//
// One router, E expert MLPs, top-k selection per token, and the auxiliary
// load-balancing loss written out so the two terms can be read against
// each other.
//
// The asymmetry to notice: f_e is a hard count of tokens routed to expert
// e and carries no gradient. P_e is the mean router probability and is
// soft. All gradient flows through P_e, with f_e acting only as a
// per-expert weight. That is how a discrete routing decision gets a
// differentiable penalty, and it is the whole trick.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <vector>

namespace moe_naive {

struct Expert {
    std::vector<float> w_in;   // d_ff x width
    std::vector<float> w_out;  // width x d_ff
};

struct Layer {
    std::size_t width;
    std::size_t d_ff;
    std::size_t n_experts;
    std::size_t top_k;
    float capacity_factor;
    float balancing_weight;

    std::vector<float> router;  // n_experts x width -- the smallest weight
                                // in the layer and the most consequential
    std::vector<Expert> experts;
};

void softmax(std::vector<float>& values) {
    float top = -1e30F;
    for (const float value : values) {
        top = std::max(top, value);
    }
    float total = 0.0F;
    for (float& value : values) {
        value = std::exp(value - top);
        total += value;
    }
    for (float& value : values) {
        value /= total;
    }
}

void matvec(const std::vector<float>& matrix, std::size_t rows, std::size_t cols,
            const float* vector_in, float* out) {
    for (std::size_t row = 0; row < rows; ++row) {
        float sum = 0.0F;
        for (std::size_t col = 0; col < cols; ++col) {
            sum += matrix[row * cols + col] * vector_in[col];
        }
        out[row] = sum;
    }
}

// One expert: a plain two-layer MLP. The experts are ordinary; everything
// interesting lives in the router.
void expert_forward(const Expert& expert, std::size_t width, std::size_t d_ff,
                    const float* token, float* out) {
    std::vector<float> hidden(d_ff, 0.0F);
    matvec(expert.w_in, d_ff, width, token, hidden.data());
    for (float& value : hidden) {
        if (value < 0.0F) {
            value = 0.0F;
        }
    }
    matvec(expert.w_out, width, d_ff, hidden.data(), out);
}

struct Assignment {
    std::size_t token;
    float weight;
};

struct Routed {
    // Per expert, the tokens it received and the router weight for each.
    std::vector<std::vector<Assignment>> per_expert;
    // Full soft distribution per token; the balancing loss needs ALL
    // entries, not just the chosen ones -- the gradient path runs through
    // the unchosen probabilities too.
    std::vector<std::vector<float>> probabilities;
    std::size_t dropped;
};

// Top-k routing with capacity enforced, so token dropping is visible.
//
// Capacity is the ugly part and it is not an implementation detail.
// Batched expert computation needs a fixed buffer per expert, so an uneven
// batch overflows some buffers and the overflow tokens are DROPPED -- they
// pass straight through the residual with no expert applied.
//
// The consequence is worth stating plainly: a token's output depends on
// which other tokens share its batch. In training that is noise. At
// serving time the same input can produce different outputs, which
// surprises people who expect a deterministic model.
Routed route(const Layer& layer, const std::vector<float>& tokens,
             std::size_t n_tokens) {
    Routed out;
    out.per_expert.resize(layer.n_experts);
    out.probabilities.resize(n_tokens);
    out.dropped = 0;

    const std::size_t capacity = std::max<std::size_t>(
        1, static_cast<std::size_t>(static_cast<float>(n_tokens * layer.top_k) /
                                    static_cast<float>(layer.n_experts) *
                                    layer.capacity_factor));

    std::vector<float> logits(layer.n_experts, 0.0F);
    std::vector<std::size_t> ranked(layer.n_experts, 0);

    for (std::size_t token = 0; token < n_tokens; ++token) {
        const float* input = tokens.data() + token * layer.width;
        matvec(layer.router, layer.n_experts, layer.width, input, logits.data());
        softmax(logits);
        out.probabilities[token] = logits;

        std::iota(ranked.begin(), ranked.end(), 0);
        std::partial_sort(ranked.begin(), ranked.begin() + layer.top_k, ranked.end(),
                          [&logits](std::size_t left, std::size_t right) {
                              return logits[left] > logits[right];
                          });

        // Renormalize over the kept experts. Without this the output
        // magnitude depends on how much probability mass happened to fall
        // outside the top-k, which varies per token and injects noise the
        // residual stream then has to absorb.
        float kept_mass = 0.0F;
        for (std::size_t slot = 0; slot < layer.top_k; ++slot) {
            kept_mass += logits[ranked[slot]];
        }

        for (std::size_t slot = 0; slot < layer.top_k; ++slot) {
            const std::size_t expert = ranked[slot];
            if (out.per_expert[expert].size() >= capacity) {
                ++out.dropped;
                continue;
            }
            out.per_expert[expert].push_back(
                Assignment{token, logits[expert] / kept_mass});
        }
    }

    return out;
}

std::vector<float> moe_forward(const Layer& layer, const std::vector<float>& tokens,
                               std::size_t n_tokens, const Routed& routed) {
    std::vector<float> activations(n_tokens * layer.width, 0.0F);
    std::vector<float> expert_output(layer.width, 0.0F);

    for (std::size_t expert = 0; expert < layer.n_experts; ++expert) {
        for (const Assignment& assignment : routed.per_expert[expert]) {
            expert_forward(layer.experts[expert], layer.width, layer.d_ff,
                           tokens.data() + assignment.token * layer.width,
                           expert_output.data());
            for (std::size_t k = 0; k < layer.width; ++k) {
                // The router weight multiplies the expert output. This is
                // what makes the routing decision differentiable at all:
                // top-k has no derivative, but the weight of the chosen
                // expert does, so the router learns by having its
                // confidence scaled against how useful the choice was.
                activations[assignment.token * layer.width + k] +=
                    assignment.weight * expert_output[k];
            }
        }
    }

    return activations;
}

// The auxiliary term: E * sum_e f_e * P_e.
//
// Minimized when every expert receives an equal share. That is not a goal
// anybody has -- it is a defence against a failure the TASK loss causes.
// Early in training one expert is marginally better by chance, the router
// lowers loss fastest by sending everything there, those tokens make it
// better still, and the rest stagnate for want of gradient. The end state
// is the memory cost of many experts and the capacity of one.
//
// The loss curve looks entirely healthy throughout. Only the routing
// histogram shows it, which is why collapse is usually found late.
float load_balancing_loss(const Layer& layer, const Routed& routed,
                          std::size_t n_tokens) {
    const auto tokens_f = static_cast<float>(n_tokens);
    float sum = 0.0F;

    for (std::size_t expert = 0; expert < layer.n_experts; ++expert) {
        const float fraction =
            static_cast<float>(routed.per_expert[expert].size()) / tokens_f;

        float mean_probability = 0.0F;
        for (std::size_t token = 0; token < n_tokens; ++token) {
            mean_probability += routed.probabilities[token][expert];
        }
        mean_probability /= tokens_f;

        sum += fraction * mean_probability;
    }

    return layer.balancing_weight * static_cast<float>(layer.n_experts) * sum;
}

struct RoutingHealth {
    std::vector<float> shares;
    float entropy;
    float max_entropy;
    float max_share;
    float dropped_fraction;
};

// The diagnostic that actually matters. Watch this, not the loss.
RoutingHealth routing_health(const Layer& layer, const Routed& routed,
                             std::size_t n_tokens) {
    RoutingHealth health;
    health.shares.resize(layer.n_experts, 0.0F);
    health.max_share = 0.0F;

    float total = 0.0F;
    for (std::size_t expert = 0; expert < layer.n_experts; ++expert) {
        const auto count = static_cast<float>(routed.per_expert[expert].size());
        health.shares[expert] = count / static_cast<float>(n_tokens);
        health.max_share = std::max(health.max_share, health.shares[expert]);
        total += count;
    }

    health.entropy = 0.0F;
    if (total > 0.0F) {
        for (std::size_t expert = 0; expert < layer.n_experts; ++expert) {
            const float share =
                static_cast<float>(routed.per_expert[expert].size()) / total;
            if (share > 0.0F) {
                health.entropy -= share * std::log(share);
            }
        }
    }

    // Uniform routing gives log(E); collapse drives this toward 0.
    health.max_entropy = std::log(static_cast<float>(layer.n_experts));
    health.dropped_fraction = static_cast<float>(routed.dropped) /
                              static_cast<float>(n_tokens * layer.top_k);
    return health;
}

}  // namespace moe_naive
`,
        profile:
          'Per-token compute is O(k·d·d_ff) against O(d·d_ff) for the dense layer replaced, so at k=1 the arithmetic barely moves while parameter count grows E-fold. Illustrative, not a measured benchmark: this version calls one expert per assigned token with a fresh hidden buffer each time, so it is allocation-dominated and exists to be read against the objective rather than run.',
      },
      'make-it-right': {
        rationale:
          'Every buffer becomes owned by the layer object so the hot path allocates nothing, and every view into one becomes a std::span, which removes the pointer-plus-length pairs that could disagree. The routing histogram becomes a returned value rather than something a caller reconstructs, because collapse is invisible in the loss and a diagnostic assembled by hand does not get watched. Configuration is validated before any allocation — a capacity factor below one guarantees dropping under even perfect routing, a top-k above the expert count is nonsense, and both are cheap to catch at construction. Router logits are computed in double deliberately to make the precision point explicit, since unbounded logit growth is the standard numerical failure and higher precision for the router alone is the standard fix.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        code: `// Mixture of experts with routing health as a returned value.
//
// The design point: router collapse is invisible in the loss and visible
// only in the routing histogram, so the histogram is part of the layer's
// output rather than something the caller reassembles. A diagnostic that
// must be reconstructed by hand does not get watched, and this failure is
// expensive to discover late.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace moe {

// Uniform routing over E experts gives entropy log(E). Below this fraction
// of it, the router has effectively collapsed.
constexpr double kCollapseEntropyRatio = 0.5;

// Routing entropy has fallen far enough that experts are starving.
//
// Not a numerical error: the primary objective PREFERS this solution.
// Sending every token to the currently-best expert lowers the task loss
// fastest, so collapse is an attractor rather than a bug, and the loss
// curve looks healthy the whole way down.
class RouterCollapsed : public std::runtime_error {
public:
    explicit RouterCollapsed(const std::string& what)
        : std::runtime_error("router collapsed: " + what) {}
};

// A capacity factor below 1.0 drops tokens even under perfectly uniform
// routing, which is almost never intended.
class CapacityTooTight : public std::invalid_argument {
public:
    explicit CapacityTooTight(const std::string& what)
        : std::invalid_argument("capacity too tight: " + what) {}
};

// More experts requested per token than exist.
class InvalidTopK : public std::invalid_argument {
public:
    explicit InvalidTopK(const std::string& what)
        : std::invalid_argument("invalid top_k: " + what) {}
};

// Validated once; these are a training contract, not runtime knobs.
class MoEConfig {
public:
    MoEConfig(std::size_t width, std::size_t d_ff, std::size_t n_experts,
              std::size_t top_k, float capacity_factor, float balancing_weight)
        : width_(width),
          d_ff_(d_ff),
          n_experts_(n_experts),
          top_k_(top_k),
          capacity_factor_(capacity_factor),
          balancing_weight_(balancing_weight) {
        // Fail fast, before the layer allocates anything at all.
        if (width == 0 || d_ff == 0) {
            throw std::invalid_argument("width and d_ff must be positive");
        }
        if (n_experts < 2) {
            throw std::invalid_argument("need at least 2 experts, got " +
                                        std::to_string(n_experts));
        }
        if (top_k == 0 || top_k > n_experts) {
            throw InvalidTopK(std::to_string(top_k) + " outside [1, " +
                              std::to_string(n_experts) + "]");
        }
        if (capacity_factor < 1.0F) {
            throw CapacityTooTight(
                std::to_string(capacity_factor) +
                " drops tokens even under perfectly uniform routing");
        }
        if (balancing_weight < 0.0F) {
            throw std::invalid_argument("balancing_weight must be non-negative");
        }
    }

    [[nodiscard]] std::size_t width() const noexcept { return width_; }
    [[nodiscard]] std::size_t d_ff() const noexcept { return d_ff_; }
    [[nodiscard]] std::size_t n_experts() const noexcept { return n_experts_; }
    [[nodiscard]] std::size_t top_k() const noexcept { return top_k_; }
    [[nodiscard]] float balancing_weight() const noexcept {
        return balancing_weight_;
    }

    // Per-expert buffer size. Per BATCH, which is the whole problem.
    [[nodiscard]] std::size_t capacity_for(std::size_t n_tokens) const noexcept {
        const auto exact = static_cast<float>(n_tokens * top_k_) /
                           static_cast<float>(n_experts_) * capacity_factor_;
        return std::max<std::size_t>(1, static_cast<std::size_t>(exact));
    }

private:
    std::size_t width_;
    std::size_t d_ff_;
    std::size_t n_experts_;
    std::size_t top_k_;
    float capacity_factor_;
    float balancing_weight_;
};

// What a caller must monitor. Returned, not reconstructed.
class RoutingHealth {
public:
    RoutingHealth(std::vector<float> shares, double entropy, double max_entropy,
                  float dropped_fraction)
        : shares_(std::move(shares)),
          entropy_(entropy),
          max_entropy_(max_entropy),
          dropped_fraction_(dropped_fraction) {}

    // 1.0 is uniform routing; toward 0.0 is collapse.
    [[nodiscard]] double entropy_ratio() const noexcept {
        return max_entropy_ > 0.0 ? entropy_ / max_entropy_ : 0.0;
    }

    [[nodiscard]] bool has_collapsed() const noexcept {
        return entropy_ratio() < kCollapseEntropyRatio;
    }

    [[nodiscard]] float dropped_fraction() const noexcept {
        return dropped_fraction_;
    }

    [[nodiscard]] std::span<const float> shares() const noexcept {
        return std::span<const float>(shares_);
    }

    // Guard clause for a training loop that should stop early.
    void throw_if_collapsed() const {
        if (!has_collapsed()) {
            return;
        }
        const auto busiest = static_cast<std::size_t>(
            std::distance(shares_.begin(),
                          std::max_element(shares_.begin(), shares_.end())));
        throw RouterCollapsed("entropy ratio " + std::to_string(entropy_ratio()) +
                              " below " + std::to_string(kCollapseEntropyRatio) +
                              "; expert " + std::to_string(busiest) + " holds " +
                              std::to_string(shares_[busiest]) + " of tokens");
    }

private:
    std::vector<float> shares_;
    double entropy_;
    double max_entropy_;
    float dropped_fraction_;
};

struct Assignment {
    std::size_t token;
    float weight;
};

// Experts plus a router, with every working buffer owned by the object.
// Rule of zero: no destructor, no copy or move operators, nothing to leak.
class MoELayer {
public:
    MoELayer(MoEConfig config, std::vector<float> router_weights,
             std::vector<float> expert_w_in, std::vector<float> expert_w_out,
             std::size_t max_tokens)
        : config_(config),
          router_weights_(std::move(router_weights)),
          expert_w_in_(std::move(expert_w_in)),
          expert_w_out_(std::move(expert_w_out)),
          max_tokens_(max_tokens) {
        const std::size_t expected_router = config.n_experts() * config.width();
        if (router_weights_.size() != expected_router) {
            throw std::invalid_argument(
                "router has " + std::to_string(router_weights_.size()) +
                " weights, expected " + std::to_string(expected_router));
        }
        const std::size_t expected_in =
            config.n_experts() * config.d_ff() * config.width();
        if (expert_w_in_.size() != expected_in) {
            throw std::invalid_argument("expert input weights mis-sized");
        }

        // Sized once at construction so the hot path never allocates.
        logits_.resize(config.n_experts(), 0.0);
        ranked_.resize(config.n_experts(), 0);
        probabilities_.resize(max_tokens * config.n_experts(), 0.0F);
        hidden_.resize(config.d_ff(), 0.0F);
        expert_output_.resize(config.width(), 0.0F);
        per_expert_.resize(config.n_experts());
        activations_.resize(max_tokens * config.width(), 0.0F);
    }

    struct Result {
        std::span<const float> activations;
        float balancing_loss;
        RoutingHealth health;
    };

    // const on the weights; the working buffers are the mutable state.
    [[nodiscard]] Result forward(std::span<const float> tokens) {
        const std::size_t n_tokens = tokens.size() / config_.width();
        if (n_tokens == 0 || n_tokens > max_tokens_) {
            throw std::invalid_argument(
                "token count " + std::to_string(n_tokens) + " outside [1, " +
                std::to_string(max_tokens_) + "]");
        }

        const std::size_t dropped = assign(tokens, n_tokens);
        apply_experts(tokens, n_tokens);

        return Result{
            std::span<const float>(activations_.data(), n_tokens * config_.width()),
            balancing_loss(n_tokens), health(n_tokens, dropped)};
    }

private:
    std::size_t assign(std::span<const float> tokens, std::size_t n_tokens) {
        for (std::vector<Assignment>& bucket : per_expert_) {
            bucket.clear();
        }
        const std::size_t capacity = config_.capacity_for(n_tokens);
        std::size_t dropped = 0;

        for (std::size_t token = 0; token < n_tokens; ++token) {
            router_softmax(tokens.subspan(token * config_.width(), config_.width()));

            for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
                probabilities_[token * config_.n_experts() + expert] =
                    static_cast<float>(logits_[expert]);
            }

            std::iota(ranked_.begin(), ranked_.end(), 0);
            std::partial_sort(
                ranked_.begin(), ranked_.begin() + config_.top_k(), ranked_.end(),
                [this](std::size_t left, std::size_t right) {
                    return logits_[left] > logits_[right];
                });

            // Renormalize over the kept experts, or output magnitude
            // depends on how much mass fell outside the top-k.
            double kept_mass = 0.0;
            for (std::size_t slot = 0; slot < config_.top_k(); ++slot) {
                kept_mass += logits_[ranked_[slot]];
            }

            for (std::size_t slot = 0; slot < config_.top_k(); ++slot) {
                const std::size_t expert = ranked_[slot];
                if (per_expert_[expert].size() >= capacity) {
                    ++dropped;
                    continue;
                }
                per_expert_[expert].push_back(Assignment{
                    token, static_cast<float>(logits_[expert] / kept_mass)});
            }
        }
        return dropped;
    }

    // double for the router alone. Nothing in the task loss penalizes
    // router confidence, so logits grow without bound; in reduced
    // precision that reaches instability quickly. The router is the
    // smallest weight in the layer, so the upcast is nearly free.
    void router_softmax(std::span<const float> token) {
        for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
            double sum = 0.0;
            const std::size_t row = expert * config_.width();
            for (std::size_t k = 0; k < config_.width(); ++k) {
                sum += static_cast<double>(router_weights_[row + k]) * token[k];
            }
            logits_[expert] = sum;
        }

        const double top = *std::max_element(logits_.begin(), logits_.end());
        double total = 0.0;
        for (double& value : logits_) {
            value = std::exp(value - top);
            total += value;
        }
        for (double& value : logits_) {
            value /= total;
        }
    }

    void apply_experts(std::span<const float> tokens, std::size_t n_tokens) {
        std::fill_n(activations_.begin(), n_tokens * config_.width(), 0.0F);

        for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
            const std::size_t in_plane = expert * config_.d_ff() * config_.width();
            const std::size_t out_plane = expert * config_.width() * config_.d_ff();

            for (const Assignment& assignment : per_expert_[expert]) {
                const std::span<const float> input =
                    tokens.subspan(assignment.token * config_.width(),
                                   config_.width());

                for (std::size_t row = 0; row < config_.d_ff(); ++row) {
                    float sum = 0.0F;
                    for (std::size_t k = 0; k < config_.width(); ++k) {
                        sum += expert_w_in_[in_plane + row * config_.width() + k] *
                               input[k];
                    }
                    hidden_[row] = sum > 0.0F ? sum : 0.0F;
                }

                for (std::size_t row = 0; row < config_.width(); ++row) {
                    float sum = 0.0F;
                    for (std::size_t k = 0; k < config_.d_ff(); ++k) {
                        sum += expert_w_out_[out_plane + row * config_.d_ff() + k] *
                               hidden_[k];
                    }
                    // Router weight scales the expert output; the only
                    // differentiable path to the routing decision.
                    activations_[assignment.token * config_.width() + row] +=
                        assignment.weight * sum;
                }
            }
        }
    }

    // E * sum_e f_e * P_e, with the gradient asymmetry preserved: f_e is a
    // hard count with no gradient, P_e is soft, and the product penalizes
    // high router confidence on already-overloaded experts.
    [[nodiscard]] float balancing_loss(std::size_t n_tokens) const {
        const auto tokens_f = static_cast<float>(n_tokens);
        float sum = 0.0F;

        for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
            const float fraction =
                static_cast<float>(per_expert_[expert].size()) / tokens_f;
            float mean_probability = 0.0F;
            for (std::size_t token = 0; token < n_tokens; ++token) {
                mean_probability +=
                    probabilities_[token * config_.n_experts() + expert];
            }
            sum += fraction * (mean_probability / tokens_f);
        }

        return config_.balancing_weight() *
               static_cast<float>(config_.n_experts()) * sum;
    }

    [[nodiscard]] RoutingHealth health(std::size_t n_tokens,
                                       std::size_t dropped) const {
        std::vector<float> shares(config_.n_experts(), 0.0F);
        float total = 0.0F;
        for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
            const auto count = static_cast<float>(per_expert_[expert].size());
            shares[expert] = count / static_cast<float>(n_tokens);
            total += count;
        }

        double entropy = 0.0;
        if (total > 0.0F) {
            for (std::size_t expert = 0; expert < config_.n_experts(); ++expert) {
                const double share =
                    static_cast<double>(per_expert_[expert].size()) / total;
                if (share > 0.0) {
                    entropy -= share * std::log(share);
                }
            }
        }

        return RoutingHealth(
            std::move(shares), entropy,
            std::log(static_cast<double>(config_.n_experts())),
            static_cast<float>(dropped) /
                static_cast<float>(n_tokens * config_.top_k()));
    }

    const MoEConfig config_;
    const std::vector<float> router_weights_;
    const std::vector<float> expert_w_in_;
    const std::vector<float> expert_w_out_;
    const std::size_t max_tokens_;

    std::vector<double> logits_;
    std::vector<std::size_t> ranked_;
    std::vector<float> probabilities_;
    std::vector<float> hidden_;
    std::vector<float> expert_output_;
    std::vector<std::vector<Assignment>> per_expert_;
    std::vector<float> activations_;
};

}  // namespace moe
`,
        profile:
          'Same asymptotics as the naive version with the allocations hoisted to construction, so the per-call cost is arithmetic rather than allocator traffic. Illustrative, not a measured benchmark: the substantive change is that a collapsed router now throws instead of training quietly to a healthy-looking loss, and the dropped-token fraction is reported rather than silent.',
      },
      'make-it-fast': {
        rationale:
          'The per-token expert dispatch becomes a grouped GEMM: tokens are permuted into expert order so each expert’s inputs form one contiguous block, and the layer is then two BLAS calls per expert over slices instead of a matvec per assigned token. That permutation is the whole optimization — it converts a strided gather inside the innermost loop into a sequential stream, which is the difference between memory-bound and compute-bound. Routing becomes a single GEMM over the whole batch, the top-k uses nth_element rather than a partial sort, the ReLU is fused into the first projection so the hidden buffer is written once, and OpenMP parallelizes across experts because their blocks are disjoint and share only the read-only weights.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Each expert becomes two GEMMs over a contiguous block instead of one matvec per assigned token',
            tradeoff: 'A BLAS dependency with its own thread pool that must be pinned to one thread, or it and OpenMP oversubscribe the same cores',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Permuting tokens into expert order makes each expert block contiguous, so the GEMMs stream rather than gather',
            tradeoff: 'The permutation materializes a full copy of the batch activations, roughly doubling the layer’s peak memory',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'ReLU is applied as the first projection writes, so the d_ff intermediate is touched once instead of twice',
            tradeoff: 'The activation is no longer a separable step, so swapping it for a different nonlinearity means editing the projection loop',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Experts process disjoint token blocks concurrently, sharing only read-only weights',
            tradeoff: 'Load is uneven by construction — a partially collapsed router leaves most threads idle waiting on one busy expert',
          },
        ],
        code: `// Mixture of experts with tokens permuted into contiguous expert blocks.
//
// The optimization that matters: a naive implementation dispatches one
// matvec per assigned token, which strides across memory and leaves BLAS
// idle. Permuting the batch into expert order makes each expert's inputs
// one CONTIGUOUS block, so the layer becomes a pass over E segments with
// two GEMMs each. The inverse permutation scatters the outputs back.
//
// What this does NOT change: the capacity mechanism, and therefore the
// batch-composition dependence of the output. That is inherent to batched
// expert computation rather than an artefact of any implementation -- the
// same input really can produce different outputs depending on what shares
// its batch, and no amount of optimization removes it.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace moe_fast {

constexpr double kCollapseEntropyRatio = 0.5;

struct Weights {
    std::size_t width;
    std::size_t d_ff;
    std::size_t n_experts;
    std::size_t top_k;
    float capacity_factor;
    float balancing_weight;

    const float* router;      // n_experts x width
    const float* expert_w_in;  // n_experts x d_ff x width
    const float* expert_w_out; // n_experts x width x d_ff
};

// Allocated once; the permutation buffers are the price of the locality.
struct Workspace {
    std::vector<float> logits;        // n_tokens x n_experts
    std::vector<std::size_t> slots;   // n_tokens * top_k, sorted by expert
    std::vector<float> slot_weights;
    std::vector<std::size_t> offsets; // n_experts + 1
    std::vector<float> permuted;      // slots x width -- the extra copy
    std::vector<float> permuted_out;
    std::vector<float> hidden;        // slots x d_ff
    std::vector<std::size_t> ranked;

    Workspace(const Weights& weights, std::size_t max_tokens) {
        const std::size_t max_slots = max_tokens * weights.top_k;
        logits.resize(max_tokens * weights.n_experts);
        slots.resize(max_slots);
        slot_weights.resize(max_slots);
        offsets.resize(weights.n_experts + 1);
        permuted.resize(max_slots * weights.width);
        permuted_out.resize(max_slots * weights.width);
        hidden.resize(max_slots * weights.d_ff);
        ranked.resize(weights.n_experts);
    }
};

// Routing as a single GEMM over the whole batch, then a counting sort into
// expert order. The sort is O(T·k) rather than comparison-based because
// the key is a small integer -- the expert index.
std::size_t route_and_permute(std::span<const float> tokens, std::size_t n_tokens,
                              const Weights& weights, Workspace& work) {
    const std::size_t width = weights.width;
    const std::size_t n_experts = weights.n_experts;
    const std::size_t top_k = weights.top_k;

    // One GEMM: (n_tokens x width) x (width x n_experts).
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans,
                static_cast<blasint>(n_tokens), static_cast<blasint>(n_experts),
                static_cast<blasint>(width), 1.0F, tokens.data(),
                static_cast<blasint>(width), weights.router,
                static_cast<blasint>(width), 0.0F, work.logits.data(),
                static_cast<blasint>(n_experts));

    std::vector<std::size_t> counts(n_experts, 0);
    std::vector<std::size_t> chosen(n_tokens * top_k, 0);
    std::vector<float> chosen_weights(n_tokens * top_k, 0.0F);

    for (std::size_t token = 0; token < n_tokens; ++token) {
        float* row = work.logits.data() + token * n_experts;

        const float top = *std::max_element(row, row + n_experts);
        float total = 0.0F;
        for (std::size_t expert = 0; expert < n_experts; ++expert) {
            row[expert] = std::exp(row[expert] - top);
            total += row[expert];
        }
        for (std::size_t expert = 0; expert < n_experts; ++expert) {
            row[expert] /= total;
        }

        // nth_element rather than partial_sort: only the top-k boundary
        // matters, and k is 1 or 2 against E of 8 to 128.
        std::iota(work.ranked.begin(), work.ranked.end(), 0);
        std::nth_element(work.ranked.begin(), work.ranked.begin() + top_k - 1,
                         work.ranked.end(),
                         [row](std::size_t left, std::size_t right) {
                             return row[left] > row[right];
                         });

        float kept_mass = 0.0F;
        for (std::size_t slot = 0; slot < top_k; ++slot) {
            kept_mass += row[work.ranked[slot]];
        }
        for (std::size_t slot = 0; slot < top_k; ++slot) {
            const std::size_t expert = work.ranked[slot];
            chosen[token * top_k + slot] = expert;
            chosen_weights[token * top_k + slot] = row[expert] / kept_mass;
            ++counts[expert];
        }
    }

    const auto capacity = std::max<std::size_t>(
        1, static_cast<std::size_t>(static_cast<float>(n_tokens * top_k) /
                                    static_cast<float>(n_experts) *
                                    weights.capacity_factor));

    work.offsets[0] = 0;
    for (std::size_t expert = 0; expert < n_experts; ++expert) {
        work.offsets[expert + 1] =
            work.offsets[expert] + std::min(counts[expert], capacity);
    }

    std::vector<std::size_t> cursor(work.offsets.begin(), work.offsets.end() - 1);
    std::size_t dropped = 0;

    for (std::size_t token = 0; token < n_tokens; ++token) {
        for (std::size_t slot = 0; slot < top_k; ++slot) {
            const std::size_t expert = chosen[token * top_k + slot];
            // Capacity truncation in arrival order, which makes it
            // deterministic FOR A FIXED BATCH and undefined across batches.
            if (cursor[expert] >= work.offsets[expert + 1]) {
                ++dropped;
                continue;
            }
            const std::size_t destination = cursor[expert]++;
            work.slots[destination] = token;
            work.slot_weights[destination] = chosen_weights[token * top_k + slot];
        }
    }

    const std::size_t n_slots = work.offsets[n_experts];
    // The permutation copy. This is what buys contiguity, and it costs a
    // full extra copy of the batch activations.
    for (std::size_t slot = 0; slot < n_slots; ++slot) {
        const float* source = tokens.data() + work.slots[slot] * width;
        std::copy_n(source, width, work.permuted.data() + slot * width);
    }

    return dropped;
}

// Two GEMMs per expert over contiguous slices, experts in parallel.
//
// Load is uneven by construction: a partially collapsed router leaves most
// threads idle waiting on one busy expert, which is another reason the
// routing histogram belongs in the profile and not just in training logs.
void apply_experts(std::size_t n_tokens, const Weights& weights,
                   Workspace& work, std::span<float> activations) {
    const std::size_t width = weights.width;
    const std::size_t d_ff = weights.d_ff;
    const auto n_experts = static_cast<std::ptrdiff_t>(weights.n_experts);

    std::fill_n(activations.begin(), n_tokens * width, 0.0F);

#pragma omp parallel for schedule(dynamic)
    for (std::ptrdiff_t expert = 0; expert < n_experts; ++expert) {
        const auto index = static_cast<std::size_t>(expert);
        const std::size_t lo = work.offsets[index];
        const std::size_t hi = work.offsets[index + 1];
        if (hi <= lo) {
            continue;
        }
        const auto rows = static_cast<blasint>(hi - lo);

        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows,
                    static_cast<blasint>(d_ff), static_cast<blasint>(width), 1.0F,
                    work.permuted.data() + lo * width,
                    static_cast<blasint>(width),
                    weights.expert_w_in + index * d_ff * width,
                    static_cast<blasint>(width), 0.0F,
                    work.hidden.data() + lo * d_ff, static_cast<blasint>(d_ff));

        // ReLU fused into the pass that reads the projection output, so
        // the d_ff intermediate is touched once rather than twice.
        float* hidden = work.hidden.data() + lo * d_ff;
        const std::size_t count = (hi - lo) * d_ff;
        for (std::size_t idx = 0; idx < count; ++idx) {
            if (hidden[idx] < 0.0F) {
                hidden[idx] = 0.0F;
            }
        }

        cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, rows,
                    static_cast<blasint>(width), static_cast<blasint>(d_ff), 1.0F,
                    hidden, static_cast<blasint>(d_ff),
                    weights.expert_w_out + index * width * d_ff,
                    static_cast<blasint>(d_ff), 0.0F,
                    work.permuted_out.data() + lo * width,
                    static_cast<blasint>(width));
    }

    // Scatter-add back. A token routed to k experts appears k times in
    // \`slots\` and its contributions must sum, so this cannot be a copy.
    const std::size_t n_slots = work.offsets[weights.n_experts];
    for (std::size_t slot = 0; slot < n_slots; ++slot) {
        const float weight = work.slot_weights[slot];
        const float* source = work.permuted_out.data() + slot * width;
        float* destination = activations.data() + work.slots[slot] * width;
        for (std::size_t k = 0; k < width; ++k) {
            destination[k] += weight * source[k];
        }
    }
}

// E * sum_e f_e * P_e, reusing the probability matrix the routing GEMM
// already produced rather than recomputing the softmax.
float balancing_loss(std::size_t n_tokens, const Weights& weights,
                     const Workspace& work) {
    const auto tokens_f = static_cast<float>(n_tokens);
    float sum = 0.0F;

    for (std::size_t expert = 0; expert < weights.n_experts; ++expert) {
        const float fraction =
            static_cast<float>(work.offsets[expert + 1] - work.offsets[expert]) /
            tokens_f;
        float mean_probability = 0.0F;
        for (std::size_t token = 0; token < n_tokens; ++token) {
            mean_probability += work.logits[token * weights.n_experts + expert];
        }
        sum += fraction * (mean_probability / tokens_f);
    }

    return weights.balancing_weight * static_cast<float>(weights.n_experts) * sum;
}

struct Health {
    double entropy_ratio;
    float max_share;
    float dropped_fraction;
    bool collapsed;
};

// The metric to watch. Cheap enough to compute every step, and the only
// signal that reports a model with the memory of E experts and the
// capacity of one.
Health routing_health(std::size_t n_tokens, std::size_t dropped,
                      const Weights& weights, const Workspace& work) {
    const std::size_t total = work.offsets[weights.n_experts];
    if (total == 0) {
        return Health{0.0, 0.0F, 1.0F, true};
    }

    double entropy = 0.0;
    float max_share = 0.0F;
    for (std::size_t expert = 0; expert < weights.n_experts; ++expert) {
        const std::size_t count =
            work.offsets[expert + 1] - work.offsets[expert];
        const double share =
            static_cast<double>(count) / static_cast<double>(total);
        if (share > 0.0) {
            entropy -= share * std::log(share);
        }
        max_share = std::max(max_share, static_cast<float>(share));
    }

    const double max_entropy = std::log(static_cast<double>(weights.n_experts));
    const double ratio = max_entropy > 0.0 ? entropy / max_entropy : 0.0;

    return Health{ratio, max_share,
                  static_cast<float>(dropped) /
                      static_cast<float>(n_tokens * weights.top_k),
                  ratio < kCollapseEntropyRatio};
}

}  // namespace moe_fast
`,
        profile:
          'Per-token arithmetic is unchanged at O(k·d·d_ff) — the asymptotics were never the problem — but each expert now issues two GEMMs over a contiguous block rather than a matvec per token, and the experts run concurrently. Illustrative, not a measured benchmark: the permutation copy roughly doubles peak activation memory for the layer, and OpenBLAS must be pinned to one thread or it and the OpenMP pool contend for the same cores.',
      },
    },
    rust: {
      'make-it-work': {
        code: `//! Sparse mixture of experts, transcribed from the objective.
//!
//!     L = L_task + alpha * E * sum_e f_e * P_e
//!
//! One router, E expert MLPs, top-k selection per token, and the auxiliary
//! load-balancing loss written out so the two terms can be read against
//! each other.
//!
//! The asymmetry to notice: f_e is a hard count of tokens routed to expert
//! e and carries no gradient. P_e is the mean router probability and is
//! soft. All the gradient flows through P_e, with f_e acting only as a
//! per-expert weight. That is how a discrete routing decision acquires a
//! differentiable penalty, and it is the whole trick.

pub struct Expert {
    pub w_in: Vec<f32>,  // d_ff * width
    pub w_out: Vec<f32>, // width * d_ff
}

pub struct Layer {
    pub width: usize,
    pub d_ff: usize,
    pub n_experts: usize,
    pub top_k: usize,
    pub capacity_factor: f32,
    pub balancing_weight: f32,

    /// The smallest weight in the layer and by far the most consequential.
    pub router: Vec<f32>, // n_experts * width
    pub experts: Vec<Expert>,
}

fn softmax(values: &mut [f32]) {
    let mut top = f32::NEG_INFINITY;
    for value in values.iter() {
        if *value > top {
            top = *value;
        }
    }
    let mut total = 0.0;
    for value in values.iter_mut() {
        *value = (*value - top).exp();
        total += *value;
    }
    for value in values.iter_mut() {
        *value /= total;
    }
}

fn matvec(matrix: &[f32], rows: usize, cols: usize, vector: &[f32], out: &mut [f32]) {
    for row in 0..rows {
        let mut sum = 0.0;
        for col in 0..cols {
            sum += matrix[row * cols + col] * vector[col];
        }
        out[row] = sum;
    }
}

/// One expert: a plain two-layer MLP.
///
/// The experts are ordinary. Everything interesting lives in the router.
fn expert_forward(expert: &Expert, width: usize, d_ff: usize, token: &[f32], out: &mut [f32]) {
    let mut hidden = vec![0.0f32; d_ff];
    matvec(&expert.w_in, d_ff, width, token, &mut hidden);
    for value in hidden.iter_mut() {
        if *value < 0.0 {
            *value = 0.0;
        }
    }
    matvec(&expert.w_out, width, d_ff, &hidden, out);
}

pub struct Assignment {
    pub token: usize,
    pub weight: f32,
}

pub struct Routed {
    /// Per expert, the tokens it received and the router weight for each.
    pub per_expert: Vec<Vec<Assignment>>,
    /// Full soft distribution per token. The balancing loss needs ALL
    /// entries rather than only the chosen ones -- the gradient path runs
    /// through the unchosen probabilities too.
    pub probabilities: Vec<Vec<f32>>,
    pub dropped: usize,
}

/// Top-k routing with capacity enforced, so token dropping is visible.
///
/// Capacity is the ugly part and it is not an implementation detail.
/// Batched expert computation needs a fixed buffer per expert, so an
/// uneven batch overflows some buffers and the overflow tokens are
/// DROPPED -- they pass straight through the residual with no expert
/// applied at all.
///
/// The consequence is worth stating plainly: a token's output depends on
/// which other tokens share its batch. In training that is noise. At
/// serving time the same input can produce different outputs, which
/// surprises people who expect a deterministic model.
pub fn route(layer: &Layer, tokens: &[f32], n_tokens: usize) -> Routed {
    let capacity = ((n_tokens * layer.top_k) as f32 / layer.n_experts as f32
        * layer.capacity_factor) as usize;
    let capacity = capacity.max(1);

    let mut per_expert: Vec<Vec<Assignment>> =
        (0..layer.n_experts).map(|_| Vec::new()).collect();
    let mut probabilities = Vec::with_capacity(n_tokens);
    let mut dropped = 0;
    let mut logits = vec![0.0f32; layer.n_experts];

    for token in 0..n_tokens {
        let input = &tokens[token * layer.width..(token + 1) * layer.width];
        matvec(&layer.router, layer.n_experts, layer.width, input, &mut logits);
        softmax(&mut logits);
        probabilities.push(logits.clone());

        let mut ranked: Vec<usize> = (0..layer.n_experts).collect();
        ranked.sort_by(|left, right| {
            logits[*right]
                .partial_cmp(&logits[*left])
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Renormalize over the kept experts. Without this the output
        // magnitude depends on how much probability mass happened to fall
        // outside the top-k, which varies per token and injects noise the
        // residual stream then has to absorb.
        let kept_mass: f32 = ranked[..layer.top_k]
            .iter()
            .map(|expert| logits[*expert])
            .sum();

        for &expert in &ranked[..layer.top_k] {
            if per_expert[expert].len() >= capacity {
                dropped += 1;
                continue;
            }
            per_expert[expert].push(Assignment {
                token,
                weight: logits[expert] / kept_mass,
            });
        }
    }

    Routed { per_expert, probabilities, dropped }
}

pub fn moe_forward(
    layer: &Layer,
    tokens: &[f32],
    n_tokens: usize,
    routed: &Routed,
) -> Vec<f32> {
    let mut activations = vec![0.0f32; n_tokens * layer.width];
    let mut expert_output = vec![0.0f32; layer.width];

    for expert in 0..layer.n_experts {
        for assignment in &routed.per_expert[expert] {
            let input = &tokens
                [assignment.token * layer.width..(assignment.token + 1) * layer.width];
            expert_forward(
                &layer.experts[expert],
                layer.width,
                layer.d_ff,
                input,
                &mut expert_output,
            );
            for k in 0..layer.width {
                // The router weight multiplies the expert output. This is
                // what makes the routing decision differentiable at all:
                // top-k has no derivative, but the weight of the chosen
                // expert does, so the router learns by having its
                // confidence scaled against how useful the choice was.
                activations[assignment.token * layer.width + k] +=
                    assignment.weight * expert_output[k];
            }
        }
    }

    activations
}

/// The auxiliary term: E * sum_e f_e * P_e.
///
/// Minimized when every expert receives an equal share. That is not a goal
/// anybody has -- it is a defence against a failure the TASK loss causes.
/// Early in training one expert is marginally better by chance, the router
/// lowers loss fastest by sending everything there, those tokens make it
/// better still, and the rest stagnate for want of gradient. The end state
/// is the memory cost of many experts and the capacity of one.
///
/// The loss curve looks entirely healthy throughout. Only the routing
/// histogram shows it, which is why collapse is usually discovered late.
pub fn load_balancing_loss(layer: &Layer, routed: &Routed, n_tokens: usize) -> f32 {
    let tokens_f = n_tokens as f32;
    let mut sum = 0.0;

    for expert in 0..layer.n_experts {
        let fraction = routed.per_expert[expert].len() as f32 / tokens_f;

        let mut mean_probability = 0.0;
        for probabilities in &routed.probabilities {
            mean_probability += probabilities[expert];
        }
        mean_probability /= tokens_f;

        sum += fraction * mean_probability;
    }

    layer.balancing_weight * layer.n_experts as f32 * sum
}

pub struct RoutingHealth {
    pub shares: Vec<f32>,
    pub entropy: f32,
    pub max_entropy: f32,
    pub max_share: f32,
    pub dropped_fraction: f32,
}

/// The diagnostic that actually matters. Watch this, not the loss.
pub fn routing_health(layer: &Layer, routed: &Routed, n_tokens: usize) -> RoutingHealth {
    let mut shares = vec![0.0f32; layer.n_experts];
    let mut max_share = 0.0f32;
    let mut total = 0.0f32;

    for expert in 0..layer.n_experts {
        let count = routed.per_expert[expert].len() as f32;
        shares[expert] = count / n_tokens as f32;
        if shares[expert] > max_share {
            max_share = shares[expert];
        }
        total += count;
    }

    let mut entropy = 0.0f32;
    if total > 0.0 {
        for expert in 0..layer.n_experts {
            let share = routed.per_expert[expert].len() as f32 / total;
            if share > 0.0 {
                entropy -= share * share.ln();
            }
        }
    }

    RoutingHealth {
        shares,
        entropy,
        // Uniform routing gives ln(E); collapse drives this toward 0.
        max_entropy: (layer.n_experts as f32).ln(),
        max_share,
        dropped_fraction: routed.dropped as f32 / (n_tokens * layer.top_k) as f32,
    }
}
`,
        profile:
          'Per-token compute is O(k·d·d_ff) against O(d·d_ff) for the dense layer it replaces, so at k=1 the arithmetic barely moves while parameters grow E-fold. Illustrative, not a measured benchmark: this version allocates a hidden buffer per assigned token and fully sorts the expert scores per token, so it is dominated by overhead and exists to be read against the objective.',
      },
      'make-it-right': {
        rationale:
          'Router collapse becomes a typed outcome rather than a footnote: the forward pass returns routing health alongside the activations, and a caller can turn a collapsed router into an error with one call instead of reconstructing the histogram from assignment lists. Newtypes separate the three unrelated counts that are all usize here — an expert index, a token position and a slot in the top-k — which is exactly the confusion that silently misroutes rather than panicking. Configuration is validated at the constructor boundary, since a capacity factor below one guarantees dropping and a top-k above the expert count is meaningless, and both are free to catch there. The full probability matrix is borrowed rather than cloned per token, and the router runs in f64 to make the precision point explicit.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Iterator chains over manual index loops',
        ],
        code: `//! Mixture of experts with routing health as a returned value.
//!
//! The design point: router collapse is invisible in the loss and visible
//! only in the routing histogram, so the histogram is part of what the
//! layer returns rather than something the caller reassembles from
//! assignment lists. A diagnostic that has to be reconstructed by hand
//! does not get watched, and this particular failure is expensive to find
//! late.

use std::fmt;

/// Uniform routing over E experts gives entropy ln(E). Below this fraction
/// of it, the router has effectively collapsed.
const COLLAPSE_ENTROPY_RATIO: f64 = 0.5;

/// An expert index. Distinct from a token position and from a top-k slot,
/// which is the confusion that silently misroutes rather than panicking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ExpertId(pub usize);

/// A position in the batch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenPos(pub usize);

/// The model's hidden width, as distinct from the expert inner width.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ModelDim(pub usize);

/// The expert inner width, which is typically four times ModelDim.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FeedForwardDim(pub usize);

#[derive(Debug)]
pub enum MoEError {
    /// Routing entropy has fallen far enough that experts are starving.
    ///
    /// Not a numerical error: the primary objective PREFERS this solution.
    /// Sending every token to the currently-best expert lowers the task
    /// loss fastest, so collapse is an attractor rather than a bug, and
    /// the loss curve looks healthy the whole way down.
    RouterCollapsed { entropy_ratio: f64, busiest: ExpertId, share: f32 },
    /// A capacity factor below 1.0 drops tokens even under perfectly
    /// uniform routing, which is almost never intended.
    CapacityTooTight { factor: f32 },
    /// More experts requested per token than exist.
    InvalidTopK { top_k: usize, n_experts: usize },
    /// Fewer than two experts is a dense layer with extra machinery.
    TooFewExperts { n_experts: usize },
    /// Weight buffer does not match the declared shape.
    WeightShape { expected: usize, found: usize, which: &'static str },
    /// Token buffer length is not a multiple of the width.
    RaggedBatch { len: usize, width: ModelDim },
}

impl fmt::Display for MoEError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RouterCollapsed { entropy_ratio, busiest, share } => write!(
                f,
                "routing entropy ratio {entropy_ratio:.3} below \\
                 {COLLAPSE_ENTROPY_RATIO}; expert {} holds {:.1}% of tokens -- \\
                 the memory cost of every expert for the capacity of one",
                busiest.0,
                share * 100.0
            ),
            Self::CapacityTooTight { factor } => write!(
                f,
                "capacity factor {factor} drops tokens even under perfectly \\
                 uniform routing"
            ),
            Self::InvalidTopK { top_k, n_experts } => {
                write!(f, "top_k {top_k} outside [1, {n_experts}]")
            }
            Self::TooFewExperts { n_experts } => write!(
                f,
                "{n_experts} experts is a dense layer with extra machinery"
            ),
            Self::WeightShape { expected, found, which } => {
                write!(f, "{which} has {found} weights, expected {expected}")
            }
            Self::RaggedBatch { len, width } => write!(
                f,
                "token buffer of {len} is not a multiple of width {}",
                width.0
            ),
        }
    }
}

impl std::error::Error for MoEError {}

/// Validated once; these are a training contract, not runtime knobs.
#[derive(Debug, Clone, Copy)]
pub struct MoEConfig {
    width: ModelDim,
    d_ff: FeedForwardDim,
    n_experts: usize,
    top_k: usize,
    capacity_factor: f32,
    balancing_weight: f32,
}

impl MoEConfig {
    pub fn new(
        width: ModelDim,
        d_ff: FeedForwardDim,
        n_experts: usize,
        top_k: usize,
        capacity_factor: f32,
        balancing_weight: f32,
    ) -> Result<Self, MoEError> {
        if n_experts < 2 {
            return Err(MoEError::TooFewExperts { n_experts });
        }
        if top_k == 0 || top_k > n_experts {
            return Err(MoEError::InvalidTopK { top_k, n_experts });
        }
        if capacity_factor < 1.0 {
            return Err(MoEError::CapacityTooTight { factor: capacity_factor });
        }
        Ok(Self { width, d_ff, n_experts, top_k, capacity_factor, balancing_weight })
    }

    /// Per-expert buffer size. Per BATCH, which is the whole problem.
    #[must_use]
    pub fn capacity_for(&self, n_tokens: usize) -> usize {
        let exact = (n_tokens * self.top_k) as f32 / self.n_experts as f32
            * self.capacity_factor;
        (exact as usize).max(1)
    }

    #[must_use]
    pub fn n_experts(&self) -> usize {
        self.n_experts
    }

    #[must_use]
    pub fn top_k(&self) -> usize {
        self.top_k
    }
}

/// What a caller must monitor. Returned, not reconstructed.
#[derive(Debug, Clone)]
pub struct RoutingHealth {
    shares: Vec<f32>,
    entropy: f64,
    max_entropy: f64,
    dropped_fraction: f32,
}

impl RoutingHealth {
    /// 1.0 is uniform routing; toward 0.0 is collapse.
    #[must_use]
    pub fn entropy_ratio(&self) -> f64 {
        if self.max_entropy <= 0.0 {
            return 0.0;
        }
        self.entropy / self.max_entropy
    }

    #[must_use]
    pub fn has_collapsed(&self) -> bool {
        self.entropy_ratio() < COLLAPSE_ENTROPY_RATIO
    }

    #[must_use]
    pub fn dropped_fraction(&self) -> f32 {
        self.dropped_fraction
    }

    /// Turn the diagnostic into an error, for a training loop that should
    /// stop rather than spend another day collapsing.
    pub fn err_if_collapsed(&self) -> Result<(), MoEError> {
        if !self.has_collapsed() {
            return Ok(());
        }
        // Iterator chain rather than an index loop: the index comes from
        // enumerate() so it cannot drift out of step with the share.
        let (busiest, share) = self
            .shares
            .iter()
            .enumerate()
            .max_by(|left, right| {
                left.1.partial_cmp(right.1).unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|(idx, share)| (ExpertId(idx), *share))
            .unwrap_or((ExpertId(0), 0.0));

        Err(MoEError::RouterCollapsed {
            entropy_ratio: self.entropy_ratio(),
            busiest,
            share,
        })
    }
}

/// The layer output alongside everything needed to judge it.
pub struct MoEOutput {
    pub activations: Vec<f32>,
    pub balancing_loss: f32,
    pub health: RoutingHealth,
}

struct Assignment {
    token: TokenPos,
    weight: f32,
}

pub struct MoELayer {
    config: MoEConfig,
    router: Vec<f64>,
    expert_w_in: Vec<f32>,
    expert_w_out: Vec<f32>,
}

impl MoELayer {
    /// Everything checkable is checked here, before any forward pass.
    pub fn new(
        config: MoEConfig,
        router: &[f32],
        expert_w_in: Vec<f32>,
        expert_w_out: Vec<f32>,
    ) -> Result<Self, MoEError> {
        let width = config.width.0;
        let d_ff = config.d_ff.0;

        let expected_router = config.n_experts * width;
        if router.len() != expected_router {
            return Err(MoEError::WeightShape {
                expected: expected_router,
                found: router.len(),
                which: "router",
            });
        }
        let expected_in = config.n_experts * d_ff * width;
        if expert_w_in.len() != expected_in {
            return Err(MoEError::WeightShape {
                expected: expected_in,
                found: expert_w_in.len(),
                which: "expert_w_in",
            });
        }

        Ok(Self {
            config,
            // f64 for the router alone. Nothing in the task loss penalizes
            // router confidence, so logits grow without bound; in reduced
            // precision that reaches instability quickly. The router is
            // the smallest weight in the layer, so the upcast is cheap.
            router: router.iter().map(|value| f64::from(*value)).collect(),
            expert_w_in,
            expert_w_out,
        })
    }

    /// Borrows the batch; the caller keeps ownership of its activations.
    pub fn forward(&self, tokens: &[f32]) -> Result<MoEOutput, MoEError> {
        let width = self.config.width.0;
        if tokens.is_empty() || tokens.len() % width != 0 {
            return Err(MoEError::RaggedBatch {
                len: tokens.len(),
                width: self.config.width,
            });
        }

        let n_tokens = tokens.len() / width;
        let (per_expert, probabilities, dropped) = self.assign(tokens, n_tokens);
        let activations = self.apply_experts(tokens, n_tokens, &per_expert);

        Ok(MoEOutput {
            activations,
            balancing_loss: self.balancing_loss(&per_expert, &probabilities, n_tokens),
            health: self.health(&per_expert, n_tokens, dropped),
        })
    }

    fn assign(
        &self,
        tokens: &[f32],
        n_tokens: usize,
    ) -> (Vec<Vec<Assignment>>, Vec<f32>, usize) {
        let width = self.config.width.0;
        let n_experts = self.config.n_experts;
        let capacity = self.config.capacity_for(n_tokens);

        let mut per_expert: Vec<Vec<Assignment>> = (0..n_experts)
            .map(|_| Vec::with_capacity(capacity))
            .collect();
        // One flat buffer rather than a Vec per token: the balancing loss
        // reads it column-wise and cloning per token was pure waste.
        let mut probabilities = vec![0.0f32; n_tokens * n_experts];
        let mut dropped = 0;

        for token in 0..n_tokens {
            let input = &tokens[token * width..(token + 1) * width];
            let soft = self.router_softmax(input);

            for (expert, value) in soft.iter().enumerate() {
                probabilities[token * n_experts + expert] = *value as f32;
            }

            let mut ranked: Vec<usize> = (0..n_experts).collect();
            ranked.sort_unstable_by(|left, right| {
                soft[*right]
                    .partial_cmp(&soft[*left])
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            // Renormalize over the kept experts, or output magnitude
            // depends on how much mass fell outside the top-k.
            let kept_mass: f64 = ranked[..self.config.top_k]
                .iter()
                .map(|expert| soft[*expert])
                .sum();

            for &expert in &ranked[..self.config.top_k] {
                if per_expert[expert].len() >= capacity {
                    dropped += 1;
                    continue;
                }
                per_expert[expert].push(Assignment {
                    token: TokenPos(token),
                    weight: (soft[expert] / kept_mass) as f32,
                });
            }
        }

        (per_expert, probabilities, dropped)
    }

    fn router_softmax(&self, token: &[f32]) -> Vec<f64> {
        let width = self.config.width.0;
        let mut logits: Vec<f64> = (0..self.config.n_experts)
            .map(|expert| {
                self.router[expert * width..(expert + 1) * width]
                    .iter()
                    .zip(token.iter())
                    .map(|(weight, value)| weight * f64::from(*value))
                    .sum()
            })
            .collect();

        let top = logits.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let total: f64 = logits.iter().map(|value| (value - top).exp()).sum();
        for value in logits.iter_mut() {
            *value = (*value - top).exp() / total;
        }
        logits
    }

    fn apply_experts(
        &self,
        tokens: &[f32],
        n_tokens: usize,
        per_expert: &[Vec<Assignment>],
    ) -> Vec<f32> {
        let width = self.config.width.0;
        let d_ff = self.config.d_ff.0;
        let mut activations = vec![0.0f32; n_tokens * width];

        for (expert, assigned) in per_expert.iter().enumerate() {
            let in_plane = expert * d_ff * width;
            let out_plane = expert * width * d_ff;

            for assignment in assigned {
                let input = &tokens
                    [assignment.token.0 * width..(assignment.token.0 + 1) * width];

                let hidden: Vec<f32> = (0..d_ff)
                    .map(|row| {
                        let sum: f32 = self.expert_w_in
                            [in_plane + row * width..in_plane + (row + 1) * width]
                            .iter()
                            .zip(input.iter())
                            .map(|(weight, value)| weight * value)
                            .sum();
                        sum.max(0.0)
                    })
                    .collect();

                for row in 0..width {
                    let sum: f32 = self.expert_w_out
                        [out_plane + row * d_ff..out_plane + (row + 1) * d_ff]
                        .iter()
                        .zip(hidden.iter())
                        .map(|(weight, value)| weight * value)
                        .sum();
                    // Router weight scales the expert output; the only
                    // differentiable path to the routing decision.
                    activations[assignment.token.0 * width + row] +=
                        assignment.weight * sum;
                }
            }
        }

        activations
    }

    /// E * sum_e f_e * P_e, with the gradient asymmetry preserved: f_e is
    /// a hard count carrying no gradient, P_e is soft, and the product
    /// penalizes high router confidence on already-overloaded experts.
    fn balancing_loss(
        &self,
        per_expert: &[Vec<Assignment>],
        probabilities: &[f32],
        n_tokens: usize,
    ) -> f32 {
        let n_experts = self.config.n_experts;
        let tokens_f = n_tokens as f32;

        let sum: f32 = (0..n_experts)
            .map(|expert| {
                let fraction = per_expert[expert].len() as f32 / tokens_f;
                let mean_probability: f32 = (0..n_tokens)
                    .map(|token| probabilities[token * n_experts + expert])
                    .sum::<f32>()
                    / tokens_f;
                fraction * mean_probability
            })
            .sum();

        self.config.balancing_weight * n_experts as f32 * sum
    }

    fn health(
        &self,
        per_expert: &[Vec<Assignment>],
        n_tokens: usize,
        dropped: usize,
    ) -> RoutingHealth {
        let shares: Vec<f32> = per_expert
            .iter()
            .map(|assigned| assigned.len() as f32 / n_tokens as f32)
            .collect();

        let total: f64 = per_expert.iter().map(|assigned| assigned.len() as f64).sum();
        let entropy = if total > 0.0 {
            -per_expert
                .iter()
                .map(|assigned| assigned.len() as f64 / total)
                .filter(|share| *share > 0.0)
                .map(|share| share * share.ln())
                .sum::<f64>()
        } else {
            0.0
        };

        RoutingHealth {
            shares,
            entropy,
            max_entropy: (self.config.n_experts as f64).ln(),
            dropped_fraction: dropped as f32 / (n_tokens * self.config.top_k) as f32,
        }
    }
}
`,
        profile:
          'Same asymptotics as the naive version, with the per-token probability clone replaced by one flat buffer and the hidden vector allocated per assigned token rather than per call. Illustrative, not a measured benchmark: the substantive change is that a collapsed router becomes a typed error a training loop can act on rather than a number nobody computed.',
      },
      'make-it-fast': {
        rationale:
          'Tokens are permuted into expert order so each expert’s inputs form one contiguous block, turning the per-token dispatch into two ndarray GEMMs per expert over slices — the permutation is the whole optimization, because it converts a strided gather inside the innermost loop into a sequential stream. Routing becomes a single matmul over the batch with select_nth_unstable for the top-k rather than a full sort, rayon parallelizes across experts since their blocks are disjoint and share only read-only weights, and every buffer is sized from the token count up front so the hot path never grows a Vec. The scatter-add back is kept explicit because a token routed to two experts contributes twice and a copy would silently drop one term.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Routing is one GEMM over the batch and each expert two GEMMs over a contiguous block, instead of a matvec per assigned token',
            tradeoff: 'A BLAS dependency whose own thread pool must be pinned to one thread, or it and rayon contend for the same cores',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The permuted batch gives each expert a contiguous slice, so its GEMMs stream rather than gather scattered rows',
            tradeoff: 'The permutation materializes a full copy of the batch activations, roughly doubling the layer’s peak memory',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Experts process disjoint token blocks concurrently, sharing only the read-only weights',
            tradeoff: 'Load is uneven by construction — a partially collapsed router leaves most workers idle behind one busy expert',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Slot, offset and permutation buffers are sized from the token count and top-k up front, so nothing grows mid-pass',
            tradeoff: 'Buffers are sized for the worst case across experts, so memory is held whether or not routing turns out balanced',
          },
        ],
        code: `//! Mixture of experts with tokens permuted into contiguous expert blocks.
//!
//! The optimization that matters: a naive implementation dispatches one
//! matvec per assigned token, which strides across memory and leaves BLAS
//! idle. Permuting the batch into expert order makes each expert's inputs
//! one CONTIGUOUS block, so the layer becomes a pass over E segments with
//! two GEMMs each. The inverse permutation scatters the outputs back.
//!
//! What this does NOT change: the capacity mechanism, and therefore the
//! batch-composition dependence of the output. That is inherent to batched
//! expert computation rather than an artefact of any implementation -- the
//! same input really can produce different outputs depending on what
//! shares its batch, and no amount of optimization removes it.
//!
//! Requires OPENBLAS_NUM_THREADS=1, or BLAS and rayon oversubscribe.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

const COLLAPSE_ENTROPY_RATIO: f64 = 0.5;

#[derive(Debug, Clone, Copy)]
pub struct ExpertId(pub usize);

pub struct Weights {
    pub router: Array2<f32>,           // n_experts x width
    pub expert_w_in: Vec<Array2<f32>>, // per expert: d_ff x width
    pub expert_w_out: Vec<Array2<f32>>, // per expert: width x d_ff
    pub top_k: usize,
    pub capacity_factor: f32,
    pub balancing_weight: f32,
}

impl Weights {
    #[must_use]
    pub fn n_experts(&self) -> usize {
        self.expert_w_in.len()
    }

    #[must_use]
    pub fn width(&self) -> usize {
        self.router.ncols()
    }
}

/// A permutation that makes each expert's tokens contiguous.
///
/// \`slots\`          -- token index per permuted row
/// \`offsets\`        -- E+1 boundaries, so expert e owns rows [off\\[e\\], off\\[e+1\\])
/// \`slot_weights\`   -- router weight per permuted row
/// \`probabilities\`  -- full soft distribution, kept for the balancing loss
pub struct SortedRouting {
    pub slots: Vec<usize>,
    pub offsets: Vec<usize>,
    pub slot_weights: Vec<f32>,
    pub probabilities: Array2<f32>,
    pub dropped: usize,
}

/// One GEMM for routing, then a counting sort into expert order.
///
/// The sort is O(T·k) rather than comparison-based, because the key is a
/// small integer -- the expert index -- so the offsets can be built from
/// a histogram directly.
pub fn route_and_sort(tokens: ArrayView2<f32>, weights: &Weights) -> SortedRouting {
    let n_tokens = tokens.nrows();
    let n_experts = weights.n_experts();
    let top_k = weights.top_k;

    // One GEMM: (n_tokens x width) x (width x n_experts).
    let mut probabilities = tokens.dot(&weights.router.t());

    for mut row in probabilities.outer_iter_mut() {
        let top = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let mut total = 0.0;
        for value in row.iter_mut() {
            *value = (*value - top).exp();
            total += *value;
        }
        row /= total;
    }

    let mut counts = vec![0usize; n_experts];
    let mut chosen = Vec::with_capacity(n_tokens * top_k);
    let mut chosen_weights = Vec::with_capacity(n_tokens * top_k);
    let mut ranked: Vec<usize> = (0..n_experts).collect();

    for row in probabilities.outer_iter() {
        // select_nth_unstable rather than a full sort: only the top-k
        // boundary matters, and k is 1 or 2 against E of 8 to 128.
        ranked.iter_mut().enumerate().for_each(|(idx, slot)| *slot = idx);
        ranked.select_nth_unstable_by(top_k - 1, |left, right| {
            row[*right]
                .partial_cmp(&row[*left])
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let kept_mass: f32 = ranked[..top_k].iter().map(|expert| row[*expert]).sum();
        for &expert in &ranked[..top_k] {
            chosen.push(expert);
            chosen_weights.push(row[expert] / kept_mass);
            counts[expert] += 1;
        }
    }

    let capacity = (((n_tokens * top_k) as f32 / n_experts as f32
        * weights.capacity_factor) as usize)
        .max(1);

    let mut offsets = Vec::with_capacity(n_experts + 1);
    offsets.push(0usize);
    for expert in 0..n_experts {
        let kept = counts[expert].min(capacity);
        offsets.push(offsets[expert] + kept);
    }

    let n_slots = offsets[n_experts];
    let mut slots = vec![0usize; n_slots];
    let mut slot_weights = vec![0.0f32; n_slots];
    let mut cursor: Vec<usize> = offsets[..n_experts].to_vec();
    let mut dropped = 0;

    for (flat, &expert) in chosen.iter().enumerate() {
        // Capacity truncation in arrival order, which makes it
        // deterministic FOR A FIXED BATCH and undefined across batches.
        if cursor[expert] >= offsets[expert + 1] {
            dropped += 1;
            continue;
        }
        let destination = cursor[expert];
        cursor[expert] += 1;
        slots[destination] = flat / top_k;
        slot_weights[destination] = chosen_weights[flat];
    }

    SortedRouting { slots, offsets, slot_weights, probabilities, dropped }
}

/// Two GEMMs per expert over contiguous slices, experts in parallel.
///
/// Load is uneven by construction: a partially collapsed router leaves
/// most workers idle behind one busy expert, which is another reason the
/// routing histogram belongs in the profile and not only in training logs.
pub fn moe_forward(
    tokens: ArrayView2<f32>,
    routing: &SortedRouting,
    weights: &Weights,
) -> Array2<f32> {
    let width = weights.width();
    let n_tokens = tokens.nrows();
    let n_slots = routing.slots.len();

    // The permutation copy. This is what buys contiguity, and it costs a
    // full extra copy of the batch activations.
    let mut permuted = Array2::<f32>::zeros((n_slots, width));
    for (slot, &token) in routing.slots.iter().enumerate() {
        permuted.row_mut(slot).assign(&tokens.row(token));
    }

    let blocks: Vec<(usize, Array2<f32>)> = (0..weights.n_experts())
        .into_par_iter()
        .filter_map(|expert| {
            let lo = routing.offsets[expert];
            let hi = routing.offsets[expert + 1];
            if hi <= lo {
                return None;
            }

            let block = permuted.slice(s![lo..hi, ..]);
            let mut hidden = block.dot(&weights.expert_w_in[expert].t());
            hidden.mapv_inplace(|value| value.max(0.0));
            Some((lo, hidden.dot(&weights.expert_w_out[expert].t())))
        })
        .collect();

    let mut activations = Array2::<f32>::zeros((n_tokens, width));
    for (lo, block) in blocks {
        for (offset, row) in block.outer_iter().enumerate() {
            let slot = lo + offset;
            let token = routing.slots[slot];
            let weight = routing.slot_weights[slot];
            // Scatter-ADD, not assign: a token routed to k experts appears
            // k times in slots and its contributions must sum.
            let mut target = activations.row_mut(token);
            for (destination, value) in target.iter_mut().zip(row.iter()) {
                *destination += weight * value;
            }
        }
    }

    activations
}

/// E * sum_e f_e * P_e, reusing the probability matrix the routing GEMM
/// already produced rather than recomputing the softmax.
#[must_use]
pub fn balancing_loss(routing: &SortedRouting, weights: &Weights, n_tokens: usize) -> f32 {
    let n_experts = weights.n_experts();
    let mean_probability = routing
        .probabilities
        .mean_axis(Axis(0))
        .expect("non-empty batch");

    let sum: f32 = (0..n_experts)
        .map(|expert| {
            let count = routing.offsets[expert + 1] - routing.offsets[expert];
            (count as f32 / n_tokens as f32) * mean_probability[expert]
        })
        .sum();

    weights.balancing_weight * n_experts as f32 * sum
}

pub struct Health {
    pub entropy_ratio: f64,
    pub max_share: f32,
    pub dropped_fraction: f32,
    pub collapsed: bool,
    pub busiest: ExpertId,
}

/// The metric to watch. Cheap enough to compute every step, and the only
/// signal that reports a model carrying the memory of every expert while
/// using the capacity of one.
#[must_use]
pub fn routing_health(
    routing: &SortedRouting,
    weights: &Weights,
    n_tokens: usize,
) -> Health {
    let n_experts = weights.n_experts();
    let total: f64 = routing.offsets[n_experts] as f64;
    if total <= 0.0 {
        return Health {
            entropy_ratio: 0.0,
            max_share: 0.0,
            dropped_fraction: 1.0,
            collapsed: true,
            busiest: ExpertId(0),
        };
    }

    let shares: Vec<f64> = (0..n_experts)
        .map(|expert| {
            (routing.offsets[expert + 1] - routing.offsets[expert]) as f64 / total
        })
        .collect();

    let entropy = -shares
        .iter()
        .filter(|share| **share > 0.0)
        .map(|share| share * share.ln())
        .sum::<f64>();
    let max_entropy = (n_experts as f64).ln();
    let ratio = if max_entropy > 0.0 { entropy / max_entropy } else { 0.0 };

    let (busiest, max_share) = shares
        .iter()
        .enumerate()
        .max_by(|left, right| {
            left.1.partial_cmp(right.1).unwrap_or(std::cmp::Ordering::Equal)
        })
        .map(|(idx, share)| (ExpertId(idx), *share as f32))
        .unwrap_or((ExpertId(0), 0.0));

    Health {
        entropy_ratio: ratio,
        max_share,
        dropped_fraction: routing.dropped as f32 / (n_tokens * weights.top_k) as f32,
        collapsed: ratio < COLLAPSE_ENTROPY_RATIO,
        busiest,
    }
}
`,
        profile:
          'Per-token arithmetic is unchanged at O(k·d·d_ff) — the asymptotics were never the problem — but each expert now issues two GEMMs over a contiguous block and the experts run concurrently. Illustrative, not a measured benchmark: the permutation copy roughly doubles peak activation memory for the layer, and a partially collapsed router serializes the rayon pass behind its one busy expert.',
      },
    },
  },
};
