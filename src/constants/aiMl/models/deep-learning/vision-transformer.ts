import type { AiMlModel } from '../../types';

/**
 * Vision Transformer — the entry that makes "the architecture was never the
 * point" concrete.
 *
 * ViT removes every vision-specific inductive bias a CNN builds in and
 * replaces them with data and a training recipe. It is the cleanest available
 * case study in the recipe mattering more than the architecture.
 */
export const VISION_TRANSFORMER: AiMlModel = {
  slug: 'vision-transformer',
  name: 'Vision Transformer',
  aliases: ['ViT', 'Patch transformer', 'DeiT', 'Image transformer'],
  category: 'deep-learning',
  group: 'attention',
  kind: 'model',

  paradigms: ['supervised', 'self-supervised'],
  taskTypes: ['classification', 'dimensionality-reduction', 'anomaly-detection'],
  architecture: 'transformer',
  paradigmNote:
    'Listed under both paradigms because the practically important versions are self-supervised. A ViT trained from scratch on a mid-sized labelled dataset is a mediocre model; the same architecture pretrained by masked-image modelling or self-distillation and then fine-tuned is a strong one, and the difference is entirely the pretraining objective rather than the network.',

  intuition:
    'Cut the image into a grid of 16-by-16 patches, flatten each one into a vector, and feed the resulting sequence to a plain text transformer with nothing changed. The model is told nothing about two-dimensional structure — not locality, not translation equivariance, not scale — beyond a learned position embedding per patch. That sounds like it should not work, and on a hundred thousand images it does not: below a certain data scale a convolutional network wins comfortably, because the biases a CNN hardcodes are true and free. Above that scale the transformer learns better biases than the ones we knew to build in, and overtakes.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = -\\frac{1}{n}\\sum_{i=1}^{n}\\sum_{c=1}^{C} \\tilde{y}_{i,c}\\log p_\\theta(c \\mid \\mathbf{x}_i), \\qquad \\mathrm{Attn}(\\mathbf{Q},\\mathbf{K},\\mathbf{V}) = \\mathrm{softmax}\\!\\left(\\frac{\\mathbf{Q}\\mathbf{K}^\\top}{\\sqrt{d_k}}\\right)\\mathbf{V}',
      symbols: [
        { symbol: '\\tilde{y}', meaning: 'the target, which is almost never one-hot in practice — label smoothing and mixup make it a distribution' },
        { symbol: 'N = HW/P^2', meaning: 'sequence length: patches per image. Attention cost is quadratic in this, which is the whole resolution problem' },
        { symbol: '\\sqrt{d_k}', meaning: 'the scale factor. Without it the dot products grow with head width and the softmax saturates into a near-one-hot that passes no gradient' },
        { symbol: '\\mathbf{Q},\\mathbf{K},\\mathbf{V}', meaning: 'three linear projections of the same patch sequence — in practice one fused projection, then split' },
        { symbol: 'p_\\theta(c \\mid \\mathbf{x})', meaning: 'softmax over classes from the class token, or from mean-pooled patch tokens' },
      ],
    },
    reading:
      'The loss is ordinary cross-entropy and carries no information about the architecture, which is exactly the point worth making: everything distinctive about ViT is in the forward pass and the training recipe, not in the objective. Two details in the attention expression do carry weight. The scale factor is not cosmetic — remove it and the dot products grow with head width until the softmax is effectively one-hot, at which point gradients stop flowing and training stalls silently. And the target is almost never one-hot: label smoothing, mixup and CutMix are not optional refinements here but part of what makes the model trainable at all at moderate data scale.',
  },

  optimization: {
    method: 'AdamW with a long warmup, cosine decay, heavy augmentation and stochastic depth',
    updateRule: {
      formula:
        '\\eta_t = \\eta_{\\max}\\cdot\\min\\!\\left(\\frac{t}{t_w},\\ \\tfrac{1}{2}\\left(1+\\cos\\frac{\\pi(t-t_w)}{T-t_w}\\right)\\right), \\qquad \\theta \\leftarrow \\theta - \\eta_t\\left(\\hat{m}_t/(\\sqrt{\\hat{v}_t}+\\epsilon) + \\lambda\\theta\\right)',
      symbols: [
        { symbol: 't_w', meaning: 'warmup steps — typically thousands. Skip them and the run diverges in the first few hundred updates' },
        { symbol: '\\lambda', meaning: 'decoupled weight decay, applied to the parameter and not through the gradient; this is the W in AdamW' },
        { symbol: '\\hat{m}_t, \\hat{v}_t', meaning: 'bias-corrected first and second gradient moments' },
        { symbol: 'T', meaning: 'total steps. The schedule is defined against it, so changing the budget changes every learning rate' },
      ],
    },
    rationale:
      'This is the entry where the optimizer is not a detail. A ViT trained with the recipe that works for a ResNet simply fails, and it took the field two years and a separate paper to establish that the gap was never architectural. Warmup is mandatory rather than helpful: the attention logits at initialization are near-uniform, early large updates saturate the softmax, and a saturated softmax passes no gradient — the failure is a loss curve that flattens in the first few hundred steps and never recovers. Decoupled weight decay matters because coupling decay into an adaptive optimizer scales it by the gradient magnitude, which is nonsense. Augmentation carries the inductive bias the architecture lacks: RandAugment, mixup and CutMix are how the model is told about translation and scale, and removing them costs several points of accuracy that no amount of extra capacity recovers. Stochastic depth is what allows depth past about twelve blocks without collapse.',
    hyperparameters: [
      { name: 'patch size', role: 'Sets sequence length as the square of its inverse; halving it quadruples the tokens and roughly quadruples attention cost', typicalRange: '8, 14 or 16 pixels' },
      { name: 'embedding width', role: 'Model capacity; the projections are quadratic in it and dominate FLOPs at low resolution', typicalRange: '384 to 1280' },
      { name: 'depth', role: 'Blocks stacked. Past roughly 24 the returns need stochastic depth and careful initialization to appear at all', typicalRange: '12 to 32' },
      { name: 'heads', role: 'Attention subspaces. Head width is what matters, and below about 32 per head quality degrades noticeably', typicalRange: '6 to 16' },
      { name: 'warmup steps', role: 'Not optional. Too short and the run diverges immediately, with a characteristic flat loss curve', typicalRange: '5k to 20k steps' },
      { name: 'weight decay', role: 'Much larger than CNN practice; the main regularizer alongside augmentation', typicalRange: '0.05 to 0.3' },
      { name: 'stochastic depth rate', role: 'Probability of dropping a whole block during training; scales with depth and is what makes deep ViTs trainable', typicalRange: '0.0 to 0.4' },
    ],
    convergence:
      'Well-behaved once the recipe is right and brittle before then, which is an uncomfortable combination because the failures look like architecture problems. Three are characteristic. Skipping or shortening warmup gives a loss that flattens in the first few hundred steps as the attention softmax saturates, and it never recovers however long it runs. Attention collapse in deep models sends every head toward the same near-uniform distribution, so the model becomes an expensive MLP — visible as attention entropy climbing toward its maximum and constant across heads. And training from scratch on a mid-sized dataset simply underperforms a ResNet, which is not a bug but the data-scale threshold asserting itself: the honest response is to pretrain or to use a CNN, not to tune harder.',
    complexity:
      'O(N²·d) for attention and O(N·d²) for the projections, with N the patch count. At 224 pixels and patch 16 there are 196 tokens and the projections dominate; at 1024 pixels there are over four thousand and the quadratic term takes over completely. That crossover is the entire reason hierarchical and windowed variants exist.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'The patching idea transfers directly and is the substance of PatchTST: cut the series into overlapping segments of a few dozen steps, treat each segment as a token, and run the same encoder. A patch is a far better token than a single timestep — it carries local shape, it cuts sequence length by the patch size and therefore attention cost by its square, and it gives the model something with internal structure to attend over.',
        where: [
          'Long-horizon multivariate forecasting, where patching is what makes a thousand-step context affordable',
          'Channel-independent forecasting, where each series is encoded separately with shared weights — consistently stronger than mixing channels early',
          'Time-series foundation models, which are patch transformers pretrained across many domains',
          'Representation learning on sensor data, where masked-patch pretraining then feeds a small supervised head',
        ],
        why: 'The transfer is real and the reasoning is clean: a single timestep carries almost no information, so attention over timesteps spends its capacity relating noise, while a patch has local shape worth attending to. The quadratic saving is the other half — patch length P divides the sequence and therefore divides attention cost by P squared. Against it: on a single ordinary business series with a few hundred observations it loses decisively to exponential smoothing, and the honest trigger is many long series rather than model sophistication. The channel-independence result is also worth knowing because it is counterintuitive — encoding each series separately with shared weights beats letting the model mix channels early, which suggests cross-series attention mostly overfits.',
        featurization: [
          'Use overlapping patches with a stride below the patch length, so a pattern straddling a boundary is not destroyed',
          'Normalize per series and per window (reversible instance normalization), which matters more here than the architecture does',
          'Keep channels independent with shared weights unless cross-series structure is demonstrably present',
          'Emit all horizons at once from the encoded sequence rather than decoding recursively, which stops errors compounding',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive and against exponential smoothing, reported per horizon. The naive baselines matter more here than anywhere else in this reference, because long-horizon benchmark results in this literature have repeatedly failed to beat a linear model once evaluated carefully.',
        pitfalls: [
          'Not normalizing per window, which leaves the model modelling the level rather than the shape',
          'Non-overlapping patches severing patterns exactly at boundaries',
          'Comparing against no linear baseline, which in this specific literature is how several published wins evaporated',
          'Leaking scaler statistics computed over the full series into a backtest',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Use a pretrained ViT as a frozen feature extractor and do the detection in feature space. Patch tokens from a self-supervised model carry enough semantics that a simple nearest-neighbour or Gaussian model over a memory bank of normal patch features localizes defects precisely — and because the score is per patch, the output is a defect map rather than a single image-level number.',
        where: [
          'Industrial visual inspection, where patch-level feature memory banks are the current standard approach on defect benchmarks',
          'Medical imaging triage, flagging studies whose features are unlike the normal population',
          'Content moderation and document fraud, where the anomaly is a local manipulation rather than a global property',
          'Wafer and PCB inspection, where defects are small, local and heterogeneous',
        ],
        why: 'It works because the hard part of visual anomaly detection is a good representation, and self-supervised ViT features are a very good one that required no defect labels — which is decisive, since defects are rare and labelling them exhaustively is impossible. Patch-level granularity gives localization for free. The caveats are real: the features are frozen and optimize nothing about anomalies, so a defect that is semantically invisible to the pretraining objective is invisible to the detector; the memory bank grows with the normal set and needs subsampling; and it is a genuinely heavy way to solve a problem that a classical detector handles when the defect is a simple intensity or geometry deviation.',
        featurization: [
          'Take features from an intermediate block, not the last — the final layers are specialized to the pretraining objective and discard the texture detail defects live in',
          'Build the memory bank from confirmed-normal images only, and subsample it with a coverage-preserving selection or it grows without bound',
          'Aggregate neighbouring patches before scoring, so a defect spanning a patch boundary is not halved',
          'Keep the resolution high enough that the smallest defect of interest covers more than one patch',
        ],
        evaluation:
          'Image-level AUROC and pixel-level localization scores reported separately, since a model can flag the right image for the wrong region. Always compare against a classical baseline on the same data — on defects that are simple intensity deviations, a cheap detector matches this at a fraction of the cost and that comparison is routinely skipped.',
        pitfalls: [
          'Using final-layer features, which are too semantic and miss texture-level defects entirely',
          'A memory bank built from images that quietly contain defects, which teaches the detector they are normal',
          'Domain shift from a lighting or camera change invalidating the whole bank at once',
          'Reporting only image-level AUROC, which hides that the localization is wrong',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'Two separate stories. The training-recipe one is the more important: ViT is the clearest case in modern vision of the optimization procedure determining the result, where identical architectures differ by many points of accuracy purely through schedule, decay and augmentation. The systems one is attention cost — the quadratic memory of materializing an N-by-N attention matrix is the binding constraint on resolution, and the fix is a classic IO-aware restructuring that tiles the computation and recomputes the softmax online so the matrix is never written to memory at all.',
        where: [
          'Warmup and cosine schedules as the difference between divergence and convergence, not as tuning',
          'Decoupled weight decay, which is a correction to how decay interacts with an adaptive optimizer',
          'Online softmax with tiling — the FlashAttention idea — as an IO-bound rather than compute-bound optimization',
          'Gradient checkpointing trading recomputation for activation memory, which is what makes large batches fit',
        ],
        why: 'Worth studying because it is the strongest available counterexample to architecture-first thinking: the field spent two years attributing to the architecture a gap that was entirely in the recipe. The attention-memory story is equally instructive for a different reason — the naive implementation is not slow because of arithmetic but because it writes and re-reads an N-by-N matrix, so the win comes from never materializing it rather than from doing less work. That distinction, compute-bound versus memory-bound, is the single most useful diagnostic habit in performance work.',
        featurization: [
          'Never skip warmup; the attention softmax saturates in the first few hundred steps without it and no later schedule recovers',
          'Decouple weight decay from the adaptive update, or decay is silently scaled by gradient magnitude',
          'Tile attention and keep only running softmax statistics, so memory is linear in sequence length rather than quadratic',
          'Profile memory traffic before arithmetic on attention — the naive version is bandwidth-bound and optimizing FLOPs does nothing',
        ],
        evaluation:
          'Ablate the recipe one element at a time against a fixed architecture — warmup, decay, each augmentation — which is the only way to see how much of the result is the model. For the systems side, measure achieved memory bandwidth rather than FLOP utilization, since the naive attention kernel can look compute-idle while being entirely bandwidth-saturated.',
        pitfalls: [
          'Attributing a recipe difference to the architecture, which is precisely the error the field made collectively',
          'Optimizing attention FLOPs when the kernel is memory-bound and the arithmetic was never the constraint',
          'Changing total steps without noticing that a cosine schedule redefines every learning rate along the way',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'The default backbone for image understanding at scale. Patches become tokens, a stack of self-attention blocks mixes them globally from the first layer, and a class token or mean pooling produces the image representation. Detection and segmentation heads attach to the patch tokens directly, and the same encoder serves as the image tower of a vision-language model unchanged.',
        where: [
          'Large-scale image classification and as the pretrained backbone nearly everything else fine-tunes from',
          'Self-supervised representation learning by masked-image modelling or self-distillation, which is where the strongest features come from',
          'The image encoder in vision-language models, where a shared token interface with the text side is the actual advantage',
          'Dense prediction — detection and segmentation — via hierarchical or windowed variants that restore some locality',
        ],
        why: 'Global receptive field from the first layer, and a token interface that composes with text, audio and video without adaptation — which is why multimodal models are built on it rather than on convolutions. The honest limit is data: below roughly ten million images a well-trained CNN matches or beats it, because convolution’s hardcoded locality and translation equivariance are true and cost nothing to assume. ViT wins when there is enough data to learn better biases than those, and when there is not, choosing it is a mistake that heavy augmentation only partly disguises.',
        featurization: [
          'Normalize with the statistics the pretrained checkpoint used; a mismatch degrades features silently and substantially',
          'Interpolate position embeddings when changing resolution rather than reinitializing them, which is the standard and frequently forgotten step',
          'Use strong augmentation — RandAugment, mixup, CutMix — since it supplies the inductive bias the architecture does not have',
          'Prefer a hierarchical or windowed variant for dense prediction; a flat ViT at high resolution spends everything on quadratic attention',
        ],
        evaluation:
          'Top-1 accuracy for classification, with a matched-recipe CNN baseline at the same data scale — matched recipe is the whole point, since an unmatched comparison measures the schedule rather than the model. For transfer, linear probing and fine-tuning separately: they rank pretraining methods differently and reporting only one is how misleading claims get made.',
        pitfalls: [
          'Training from scratch on a mid-sized dataset and concluding the architecture is weak, when it is the data scale',
          'Forgetting to interpolate position embeddings at a new resolution, which quietly destroys accuracy',
          'Quadratic attention making high resolution unaffordable, which a flat ViT has no answer to',
          'Comparing against a CNN trained with an old recipe, which measures the recipe gap rather than the architecture gap',
        ],
      },
      'control-and-operations': {
        fit: 'adapted',
        how: 'Used as the perception front end of a visuomotor policy: a frozen or lightly tuned ViT encodes camera frames into tokens, and a policy head consumes them. The appeal is that the representation was learned from data the robot never had to collect, and patch tokens give a spatially addressable interface a policy can attend over.',
        where: [
          'Robot manipulation policies built on frozen self-supervised visual features',
          'Autonomous inspection and navigation, where a pretrained encoder replaces a hand-designed vision stack',
          'Quality-control automation, where the same encoder serves both inspection and the actuation decision',
        ],
        why: 'Pretrained features dramatically reduce the robot data needed, which is the dominant cost in this domain — and self-supervised ViT features transfer to manipulation better than supervised classification features, apparently because classification discards the spatial detail a policy needs. Against it: latency is a hard constraint in a control loop and a large ViT is not cheap; the features are frozen and optimize nothing about the control objective; and the distribution shift between internet images and a robot’s camera is larger than it looks.',
        featurization: [
          'Use patch tokens rather than the pooled class token; a policy needs spatial addressing and pooling destroys it',
          'Match the preprocessing to the pretraining exactly, since a robot camera is already far from the pretraining distribution',
          'Distil into a smaller encoder if the control loop has a latency budget, rather than accepting a slower loop',
          'Freeze the encoder initially and fine-tune only if the data supports it — a small robot dataset will overfit a full backbone immediately',
        ],
        evaluation:
          'Task success rate on held-out object and scene configurations, not feature quality — the representation metric and the control metric diverge more than expected. Measure end-to-end loop latency, which is a hard constraint rather than a number to report.',
        pitfalls: [
          'Encoder latency breaking the control loop, which no amount of accuracy compensates for',
          'Pooled features discarding the spatial information the policy depends on',
          'Overfitting a full backbone to a few hundred robot demonstrations',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Pretraining is a large-scale undertaking — hundreds to thousands of accelerator-days at the sizes that matter — which is why almost nobody pretrains and almost everybody fine-tunes. Fine-tuning is hours on a handful of GPUs, and the practical decision is which checkpoint to start from rather than how to train.',
    inferenceProfile:
      'Tens of milliseconds per image on a GPU at 224 pixels for a base model; considerably more on CPU, which is usually prohibitive without distillation or quantization. Cost scales as the square of the token count, so resolution is the dominant lever and a doubling of image side roughly quadruples the attention term.',
    retrainingCadence:
      'The backbone is effectively static — replaced when a better checkpoint appears, not retrained on a schedule. Heads are retrained as the label set or the domain shifts, which is a much cheaper and much more frequent operation.',
    driftAndMonitoring: [
      'Track input statistics against the preprocessing the checkpoint expects; normalization drift degrades features without any error',
      'Monitor attention entropy per layer if training or fine-tuning deeply — uniformly high entropy across heads is attention collapse',
      'Watch per-class accuracy rather than the aggregate, since domain shift shows up in a few classes long before the average moves',
      'Alert on input resolution changes, which invalidate position embeddings unless they are interpolated',
    ],
    productionGotchas: [
      'Position embeddings are tied to a token grid. Change resolution without interpolating them and accuracy degrades badly with nothing logged',
      'Normalization constants are part of the model. Using ImageNet statistics with a checkpoint trained on different ones is a silent, substantial regression',
      'Attention memory is quadratic in tokens, so a resolution increase that looks modest can be an out-of-memory failure',
      'The class token and mean pooling are different interfaces and are not interchangeable between checkpoints, even when both exist',
      'Fine-tuning with the pretraining learning rate destroys the features; fine-tuning needs a rate one to two orders of magnitude smaller',
    ],
  },

  assumptions: [
    'Enough pretraining data exists, directly or through a checkpoint, to learn the spatial structure the architecture does not assume',
    'The image can be meaningfully cut into fixed-size patches on a fixed grid — false for extreme aspect ratios and for resolution-critical fine detail',
    'Global relationships matter enough to justify attending over every patch pair from the first layer',
    'Inference resolution matches training resolution, or position embeddings are interpolated to match',
    'The preprocessing pipeline reproduces the checkpoint’s exactly, since the features are not robust to a normalization mismatch',
  ],

  pros: [
    {
      point: 'Global receptive field from the first layer',
      context:
        'A patch attends to every other patch immediately, whereas a CNN needs depth to relate distant regions. Decisive when the relationship between distant parts of an image is the signal; irrelevant when the task is local texture, where a CNN is both sufficient and cheaper.',
    },
    {
      point: 'One token interface across modalities',
      context:
        'The reason vision-language models are built on ViT and not on convolutions: images, text and audio become the same kind of sequence and a single stack consumes all of them. Worth nothing in a single-modality pipeline.',
    },
    {
      point: 'Scales with data better than convolutional networks',
      context:
        'Past roughly ten million images it learns spatial biases better than the ones we knew to hardcode, and keeps improving where CNNs flatten. Below that threshold this advantage is negative, and saying so plainly matters.',
    },
    {
      point: 'Exceptional self-supervised features',
      context:
        'Masked-image modelling and self-distillation on ViTs produce representations that transfer better than supervised ones, including to dense tasks. This is where most current practical value comes from — the classification result is almost incidental.',
    },
  ],

  cons: [
    {
      point: 'Data-hungry by construction',
      context:
        'Removing inductive bias means the bias has to come from data. On a mid-sized dataset from scratch a ResNet wins comfortably, and the honest response is to use a CNN or a pretrained checkpoint rather than to tune harder.',
    },
    {
      point: 'Quadratic attention caps resolution',
      context:
        'Doubling the image side roughly quadruples attention cost, which makes high-resolution dense prediction unaffordable for a flat ViT. Hierarchical and windowed variants exist precisely because of this and give back some of the global reach.',
    },
    {
      point: 'Brittle to the training recipe',
      context:
        'Warmup, decoupled decay, augmentation and stochastic depth are load-bearing, and getting them wrong looks like an architecture failure. This costs real practitioner time and is not visible from the model definition.',
    },
    {
      point: 'Resolution and preprocessing are baked in',
      context:
        'Position embeddings are tied to a token grid and normalization constants to the checkpoint. Both cause silent, substantial degradation when mismatched — among the most common production errors with this model.',
    },
    {
      point: 'Attention maps are routing, not explanation',
      context:
        'They are visually compelling and routinely presented as evidence of what the model looked at, which the interpretability literature has repeatedly cautioned against. In a regulated setting that gap between appearance and evidence is a genuine liability.',
    },
  ],

  relatedSlugs: ['transformer', 'cnn', 'contrastive-embeddings', 'autoencoder', 'masked-lm'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""One ViT encoder block and the patch embedding, written out literally.

The pipeline is short and there is nothing vision-specific in it after the
first step:

    image -> patches -> linear projection -> + position -> [attention, MLP] xL

The only thing telling the model about two-dimensional structure is the
learned position embedding, one vector per grid cell. Everything else is a
plain text transformer.

Plain loops, no libraries. Attention is written as the definition reads, which
means the full N x N matrix is materialized - the exact thing the fast stage
refuses to do.
"""

import math


def patchify(image, patch_size):
    """(height, width, channels) -> (num_patches, patch_size^2 * channels).

    Row-major over the grid, which fixes the token order and therefore what
    the position embeddings mean. Changing it silently invalidates them.
    """
    height, width, channels = len(image), len(image[0]), len(image[0][0])
    if height % patch_size != 0 or width % patch_size != 0:
        raise ValueError("image dimensions must divide the patch size")

    patches = []
    for row in range(0, height, patch_size):
        for column in range(0, width, patch_size):
            flat = []
            for dy in range(patch_size):
                for dx in range(patch_size):
                    for c in range(channels):
                        flat.append(image[row + dy][column + dx][c])
            patches.append(flat)
    return patches


def linear(vectors, weight, bias):
    """out[i][j] = sum_k vectors[i][k] * weight[k][j] + bias[j]."""
    out_dim = len(weight[0])
    output = []
    for vector in vectors:
        row = [bias[j] for j in range(out_dim)]
        for k, value in enumerate(vector):
            for j in range(out_dim):
                row[j] += value * weight[k][j]
        output.append(row)
    return output


def softmax(scores):
    """Subtract the max before exponentiating, or a large logit overflows."""
    peak = max(scores)
    exponentials = [math.exp(score - peak) for score in scores]
    total = sum(exponentials)
    return [value / total for value in exponentials]


def attention_head(queries, keys, values, head_dim):
    """softmax(Q K^T / sqrt(d)) V for one head.

    The scale factor is not cosmetic. Without it the dot products grow with
    head width until the softmax is effectively one-hot, at which point the
    gradient through it is zero and training stalls with no other symptom.
    """
    num_tokens = len(queries)
    scale = 1.0 / math.sqrt(head_dim)

    # The full N x N score matrix, materialized because that is what the
    # definition says. It is also the entire memory problem.
    output = []
    for i in range(num_tokens):
        scores = []
        for j in range(num_tokens):
            dot = 0.0
            for d in range(head_dim):
                dot += queries[i][d] * keys[j][d]
            scores.append(dot * scale)

        weights = softmax(scores)
        mixed = [0.0] * head_dim
        for j in range(num_tokens):
            for d in range(head_dim):
                mixed[d] += weights[j] * values[j][d]
        output.append(mixed)
    return output


def multi_head_attention(tokens, wq, wk, wv, wo, bq, bk, bv, bo, num_heads):
    """Project, split into heads, attend per head, concatenate, project."""
    queries = linear(tokens, wq, bq)
    keys = linear(tokens, wk, bk)
    values = linear(tokens, wv, bv)

    model_dim = len(queries[0])
    head_dim = model_dim // num_heads

    concatenated = [[0.0] * model_dim for _ in tokens]
    for head in range(num_heads):
        lo, hi = head * head_dim, (head + 1) * head_dim
        head_out = attention_head(
            [row[lo:hi] for row in queries],
            [row[lo:hi] for row in keys],
            [row[lo:hi] for row in values],
            head_dim,
        )
        for token, mixed in enumerate(head_out):
            concatenated[token][lo:hi] = mixed

    return linear(concatenated, wo, bo)


def layer_norm(vectors, gain, shift, epsilon=1e-6):
    """Per-token normalization: mean and variance over the feature axis."""
    output = []
    for vector in vectors:
        mean = sum(vector) / len(vector)
        variance = sum((value - mean) ** 2 for value in vector) / len(vector)
        denominator = math.sqrt(variance + epsilon)
        output.append([
            (value - mean) / denominator * gain[i] + shift[i]
            for i, value in enumerate(vector)
        ])
    return output


def gelu(value):
    """The tanh approximation, which is what the reference models use."""
    inner = math.sqrt(2.0 / math.pi) * (value + 0.044715 * value ** 3)
    return 0.5 * value * (1.0 + math.tanh(inner))


def encoder_block(tokens, params, num_heads):
    """Pre-norm: normalize BEFORE each sublayer, add the residual after.

    Pre-norm rather than post-norm is why deep ViTs train at all - it keeps a
    clean identity path from input to output, so the gradient reaches the
    early blocks without passing through every normalization on the way.
    """
    normed = layer_norm(tokens, params['ln1_gain'], params['ln1_shift'])
    attended = multi_head_attention(
        normed, params['wq'], params['wk'], params['wv'], params['wo'],
        params['bq'], params['bk'], params['bv'], params['bo'], num_heads,
    )
    tokens = [
        [a + b for a, b in zip(token, delta)]
        for token, delta in zip(tokens, attended)
    ]

    normed = layer_norm(tokens, params['ln2_gain'], params['ln2_shift'])
    hidden = linear(normed, params['w1'], params['b1'])
    hidden = [[gelu(value) for value in row] for row in hidden]
    projected = linear(hidden, params['w2'], params['b2'])

    return [
        [a + b for a, b in zip(token, delta)]
        for token, delta in zip(tokens, projected)
    ]


def vit_forward(image, params, patch_size, num_heads, depth):
    """Patchify, embed, prepend the class token, add positions, then blocks."""
    patches = patchify(image, patch_size)
    tokens = linear(patches, params['patch_weight'], params['patch_bias'])

    # The class token is a learned vector that belongs to no patch. It has
    # nowhere to look but the patches, so its final state is the image
    # summary - a trick borrowed wholesale from BERT.
    tokens = [list(params['class_token'])] + tokens

    # Position embeddings are the ONLY thing carrying 2-D structure, and they
    # are tied to this exact token count. A different grid needs them
    # interpolated, which is the most-forgotten step in deploying a ViT.
    if len(params['position']) != len(tokens):
        raise ValueError("position embeddings do not match the token count")
    tokens = [
        [value + offset for value, offset in zip(token, position)]
        for token, position in zip(tokens, params['position'])
    ]

    for layer in range(depth):
        tokens = encoder_block(tokens, params['blocks'][layer], num_heads)

    tokens = layer_norm(tokens, params['final_gain'], params['final_shift'])
    return tokens[0]  # the class token, now the image representation
`,
        profile:
          'O(N^2 * d) for attention and O(N * d^2) for the projections, with N the token count. Illustrative, not a measured benchmark: at 196 tokens and width 768 this is tens of millions of interpreter iterations per block, and the N x N score matrix is materialized per head — which is the memory problem, not the arithmetic one.',
      },

      'make-it-right': {
        code: `"""The same block, typed, with the shape contract and grid geometry explicit.

What changes is the boundary rather than the arithmetic. Patch geometry
becomes a frozen dataclass that derives the token count instead of leaving it
implicit, position-embedding interpolation is provided rather than assumed,
and the preconditions that silently degrade a ViT in production - a mismatched
grid, a head width that does not divide, a normalization mismatch - are
checked rather than discovered as a quiet accuracy loss.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import NamedTuple, Sequence

Vector = list[float]
Matrix = list[Vector]


class ShapeMismatch(ValueError):
    """Raised on a shape violation instead of broadcasting past it."""


class GridMismatch(ValueError):
    """Raised when position embeddings do not match the current token grid.

    Its own type because the correct response is specific: interpolate, not
    reinitialize. This is the single most common silent ViT failure.
    """


@dataclass(frozen=True)
class PatchGeometry:
    """Frozen so the token count cannot drift from the grid it describes."""

    image_height: int
    image_width: int
    patch_size: int
    channels: int = 3

    def __post_init__(self) -> None:
        if self.patch_size <= 0:
            raise ShapeMismatch("patch size must be positive")
        if self.image_height % self.patch_size or self.image_width % self.patch_size:
            raise ShapeMismatch(
                f"a {self.image_height}x{self.image_width} image does not divide into "
                f"{self.patch_size}-pixel patches"
            )

    @property
    def grid(self) -> tuple[int, int]:
        return self.image_height // self.patch_size, self.image_width // self.patch_size

    @property
    def num_patches(self) -> int:
        rows, columns = self.grid
        return rows * columns

    @property
    def sequence_length(self) -> int:
        """Patches plus the class token - what attention is quadratic in."""
        return self.num_patches + 1

    @property
    def patch_dim(self) -> int:
        return self.patch_size * self.patch_size * self.channels


class AttentionShape(NamedTuple):
    """Derived once, so no call site divides model_dim by num_heads again."""

    model_dim: int
    num_heads: int

    @property
    def head_dim(self) -> int:
        return self.model_dim // self.num_heads

    @property
    def scale(self) -> float:
        """1/sqrt(d_k). Omitting it saturates the softmax and stalls training."""
        return 1.0 / math.sqrt(self.head_dim)

    def validate(self) -> None:
        if self.num_heads <= 0:
            raise ShapeMismatch("at least one head is required")
        if self.model_dim % self.num_heads:
            raise ShapeMismatch(
                f"width {self.model_dim} does not divide into {self.num_heads} heads"
            )
        if self.head_dim < 16:
            # Not fatal, but below roughly 32 quality degrades measurably and
            # it is worth refusing to do it silently.
            raise ShapeMismatch(f"head width {self.head_dim} is too narrow to be useful")


def patchify(image: Sequence[Sequence[Sequence[float]]], geometry: PatchGeometry) -> Matrix:
    """Row-major over the grid, which fixes what the position embeddings mean."""
    if len(image) != geometry.image_height or len(image[0]) != geometry.image_width:
        raise ShapeMismatch("image does not match the declared geometry")

    size = geometry.patch_size
    return [
        [
            image[row + dy][column + dx][channel]
            for dy in range(size)
            for dx in range(size)
            for channel in range(geometry.channels)
        ]
        for row in range(0, geometry.image_height, size)
        for column in range(0, geometry.image_width, size)
    ]


def interpolate_positions(
    positions: Matrix,
    source_grid: tuple[int, int],
    target_grid: tuple[int, int],
    has_class_token: bool = True,
) -> Matrix:
    """Bilinearly resample patch position embeddings onto a new grid.

    Provided rather than left to the caller because it is the step everyone
    forgets: change resolution without it and accuracy collapses with nothing
    logged anywhere. The class-token position is carried through untouched,
    since it belongs to no grid cell.
    """
    source_rows, source_columns = source_grid
    target_rows, target_columns = target_grid
    expected = source_rows * source_columns + (1 if has_class_token else 0)
    if len(positions) != expected:
        raise GridMismatch(f"expected {expected} position embeddings, got {len(positions)}")

    if source_grid == target_grid:
        return [row[:] for row in positions]

    prefix = positions[:1] if has_class_token else []
    grid = positions[1:] if has_class_token else positions
    width = len(grid[0])

    resampled: Matrix = []
    for target_row in range(target_rows):
        for target_column in range(target_columns):
            source_y = (target_row + 0.5) * source_rows / target_rows - 0.5
            source_x = (target_column + 0.5) * source_columns / target_columns - 0.5
            y0 = min(max(int(math.floor(source_y)), 0), source_rows - 1)
            x0 = min(max(int(math.floor(source_x)), 0), source_columns - 1)
            y1 = min(y0 + 1, source_rows - 1)
            x1 = min(x0 + 1, source_columns - 1)
            wy, wx = source_y - y0, source_x - x0

            corners = (
                (grid[y0 * source_columns + x0], (1 - wy) * (1 - wx)),
                (grid[y0 * source_columns + x1], (1 - wy) * wx),
                (grid[y1 * source_columns + x0], wy * (1 - wx)),
                (grid[y1 * source_columns + x1], wy * wx),
            )
            resampled.append([
                sum(corner[index] * weight for corner, weight in corners)
                for index in range(width)
            ])

    return prefix + resampled


def linear(vectors: Sequence[Sequence[float]], weight: Matrix, bias: Vector) -> Matrix:
    if len(weight) != len(vectors[0]):
        raise ShapeMismatch(f"weight expects {len(weight)} inputs, got {len(vectors[0])}")
    out_dim = len(weight[0])
    return [
        [
            bias[j] + sum(value * weight[k][j] for k, value in enumerate(vector))
            for j in range(out_dim)
        ]
        for vector in vectors
    ]


def stable_softmax(scores: Sequence[float]) -> Vector:
    """Subtract the maximum first; a large logit overflows exp otherwise."""
    peak = max(scores)
    exponentials = [math.exp(score - peak) for score in scores]
    total = math.fsum(exponentials)
    return [value / total for value in exponentials]


def attention_head(
    queries: Matrix, keys: Matrix, values: Matrix, shape: AttentionShape
) -> Matrix:
    """softmax(Q K^T * scale) V for one head."""
    output: Matrix = []
    for query in queries:
        scores = [
            sum(a * b for a, b in zip(query, key)) * shape.scale for key in keys
        ]
        weights = stable_softmax(scores)
        output.append([
            sum(weight * value[d] for weight, value in zip(weights, values))
            for d in range(shape.head_dim)
        ])
    return output


def multi_head_attention(
    tokens: Matrix, params: dict[str, Matrix | Vector], shape: AttentionShape
) -> Matrix:
    shape.validate()
    queries = linear(tokens, params['wq'], params['bq'])
    keys = linear(tokens, params['wk'], params['bk'])
    values = linear(tokens, params['wv'], params['bv'])

    concatenated = [[0.0] * shape.model_dim for _ in tokens]
    for head in range(shape.num_heads):
        lo, hi = head * shape.head_dim, (head + 1) * shape.head_dim
        head_out = attention_head(
            [row[lo:hi] for row in queries],
            [row[lo:hi] for row in keys],
            [row[lo:hi] for row in values],
            shape,
        )
        for token, mixed in enumerate(head_out):
            concatenated[token][lo:hi] = mixed

    return linear(concatenated, params['wo'], params['bo'])


def layer_norm(vectors: Matrix, gain: Vector, shift: Vector, epsilon: float = 1e-6) -> Matrix:
    output: Matrix = []
    for vector in vectors:
        mean = math.fsum(vector) / len(vector)
        variance = math.fsum((value - mean) ** 2 for value in vector) / len(vector)
        denominator = math.sqrt(variance + epsilon)
        output.append([
            (value - mean) / denominator * gain[i] + shift[i]
            for i, value in enumerate(vector)
        ])
    return output


def gelu(value: float) -> float:
    inner = math.sqrt(2.0 / math.pi) * (value + 0.044715 * value ** 3)
    return 0.5 * value * (1.0 + math.tanh(inner))


def encoder_block(tokens: Matrix, params: dict, shape: AttentionShape) -> Matrix:
    """Pre-norm: normalize before each sublayer, add the residual after.

    Pre-norm is why deep ViTs train at all - it leaves a clean identity path
    from input to output, so gradients reach early blocks without passing
    through every normalization on the way.
    """
    normed = layer_norm(tokens, params['ln1_gain'], params['ln1_shift'])
    attended = multi_head_attention(normed, params, shape)
    tokens = [[a + b for a, b in zip(t, d)] for t, d in zip(tokens, attended)]

    normed = layer_norm(tokens, params['ln2_gain'], params['ln2_shift'])
    hidden = [[gelu(v) for v in row] for row in linear(normed, params['w1'], params['b1'])]
    projected = linear(hidden, params['w2'], params['b2'])
    return [[a + b for a, b in zip(t, d)] for t, d in zip(tokens, projected)]
`,
        rationale:
          'The arithmetic is unchanged; the boundary is what moves. Patch geometry becomes a frozen dataclass that derives grid, token count and patch width instead of leaving them implicit at every call site, and the attention shape derives head width and the scale factor once so no caller divides by head count again — including a refusal to build heads narrower than is useful, which is not fatal but degrades quality and should not happen silently. Position-embedding interpolation is supplied rather than assumed, with its own exception type, because changing resolution without it is the single most common way a deployed ViT loses accuracy with nothing logged anywhere: the correct response is specific, so the error is specific. The softmax subtracts its maximum, which the literal version does not survive on a large logit, and layer normalization accumulates with fsum so a wide feature vector does not drift. Pre-norm ordering is stated in the block rather than left as an implementation detail, since it is the reason depth is trainable at all.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Identical asymptotics; the change is in what fails loudly rather than in speed. Illustrative, not a measured benchmark: comprehensions and fsum cost slightly more than the raw loops and buy numerical stability plus a shape contract that holds.',
      },

      'make-it-fast': {
        code: `"""Batched, fused, and tiled. The N x N attention matrix is never written.

Three changes, in order of how much they matter:

  1. Q, K and V come from ONE projection with 3 * d columns, then a reshape.
     Three separate GEMMs read the same activations three times; one reads
     them once, and the split afterwards is free.
  2. Attention is computed in tiles with an ONLINE softmax. Instead of
     materializing scores and normalizing, each tile updates a running
     maximum and running sum and rescales the accumulator. Memory drops from
     quadratic in sequence length to linear, which is the FlashAttention
     idea - and the win is bandwidth, not arithmetic.
  3. Everything batches. Heads and batch fold into one leading dimension so
     attention is a single batched matmul rather than a loop over heads.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32


def patchify(images: NDArray[np.float32], patch_size: int) -> NDArray[np.float32]:
    """(B, H, W, C) -> (B, N, P*P*C) as a pure reshape and transpose.

    No gather, no copy until the final ascontiguousarray: the patch grid is
    already a strided view of the image, so the whole operation is metadata.
    """
    batch, height, width, channels = images.shape
    if height % patch_size or width % patch_size:
        raise ValueError("image dimensions must divide the patch size")

    rows, columns = height // patch_size, width // patch_size
    blocked = images.reshape(batch, rows, patch_size, columns, patch_size, channels)
    blocked = blocked.transpose(0, 1, 3, 2, 4, 5)
    return np.ascontiguousarray(
        blocked.reshape(batch, rows * columns, patch_size * patch_size * channels)
    )


def fused_qkv(
    tokens: NDArray[np.float32],
    weight: NDArray[np.float32],
    bias: NDArray[np.float32],
    num_heads: int,
) -> tuple[NDArray[np.float32], NDArray[np.float32], NDArray[np.float32]]:
    """One GEMM for all three projections, then a reshape into heads.

    weight is (d, 3 * d). Three separate products would read \`tokens\` three
    times; this reads it once, and the split is a view rather than a copy.
    """
    batch, tokens_per_image, model_dim = tokens.shape
    head_dim = model_dim // num_heads

    projected = tokens.reshape(-1, model_dim) @ weight
    projected += bias
    projected = projected.reshape(batch, tokens_per_image, 3, num_heads, head_dim)
    # (3, B, heads, N, head_dim): heads and batch lead, so the attention
    # below is one batched matmul with no loop over heads.
    projected = projected.transpose(2, 0, 3, 1, 4)
    return projected[0], projected[1], projected[2]


def tiled_attention(
    queries: NDArray[np.float32],
    keys: NDArray[np.float32],
    values: NDArray[np.float32],
    block: int = 128,
) -> NDArray[np.float32]:
    """Online-softmax attention over key tiles. Never materializes (N, N).

    The invariant: after processing tiles up to j, \`accumulator\` holds the
    unnormalized weighted sum of values and (running_max, running_sum) hold
    the softmax statistics for everything seen so far. A new tile with a
    larger maximum rescales the accumulator by exp(old_max - new_max), which
    is exactly the correction that keeps the running sum exact.
    """
    *lead, num_tokens, head_dim = queries.shape
    scale = FLOAT(1.0 / np.sqrt(head_dim))

    accumulator = np.zeros(queries.shape, dtype=FLOAT)
    running_max = np.full((*lead, num_tokens, 1), -np.inf, dtype=FLOAT)
    running_sum = np.zeros((*lead, num_tokens, 1), dtype=FLOAT)

    for start in range(0, num_tokens, block):
        stop = min(start + block, num_tokens)
        # One tile of scores: (..., N, tile). Quadratic in the TILE, not in
        # the sequence, which is the entire point.
        scores = queries @ keys[..., start:stop, :].swapaxes(-1, -2)
        scores *= scale

        tile_max = scores.max(axis=-1, keepdims=True)
        new_max = np.maximum(running_max, tile_max)

        # Rescale what we already have to the new maximum, then add the tile.
        correction = np.exp(running_max - new_max, dtype=FLOAT)
        np.subtract(scores, new_max, out=scores)
        np.exp(scores, out=scores)

        accumulator *= correction
        accumulator += scores @ values[..., start:stop, :]
        running_sum *= correction
        running_sum += scores.sum(axis=-1, keepdims=True)
        running_max = new_max

    return accumulator / running_sum


def multi_head_attention(
    tokens: NDArray[np.float32],
    qkv_weight: NDArray[np.float32],
    qkv_bias: NDArray[np.float32],
    out_weight: NDArray[np.float32],
    out_bias: NDArray[np.float32],
    num_heads: int,
) -> NDArray[np.float32]:
    batch, tokens_per_image, model_dim = tokens.shape
    queries, keys, values = fused_qkv(tokens, qkv_weight, qkv_bias, num_heads)
    mixed = tiled_attention(queries, keys, values)
    # (B, heads, N, hd) -> (B, N, d): one transpose, one reshape, one GEMM.
    mixed = mixed.transpose(0, 2, 1, 3).reshape(batch, tokens_per_image, model_dim)
    return mixed @ out_weight + out_bias


def layer_norm(
    tokens: NDArray[np.float32],
    gain: NDArray[np.float32],
    shift: NDArray[np.float32],
    epsilon: float = 1e-6,
) -> NDArray[np.float32]:
    """Mean and variance over the feature axis, computed in one pass.

    The variance uses the two-pass definition deliberately: the one-pass
    E[x^2] - E[x]^2 form cancels catastrophically in float32 when the mean is
    large relative to the spread, which is exactly the regime residual streams
    drift into deep in a network.
    """
    mean = tokens.mean(axis=-1, keepdims=True, dtype=np.float32)
    centred = tokens - mean
    variance = np.mean(centred * centred, axis=-1, keepdims=True, dtype=np.float32)
    centred /= np.sqrt(variance + epsilon)
    centred *= gain
    centred += shift
    return centred


def gelu_(values: NDArray[np.float32]) -> NDArray[np.float32]:
    """In-place tanh-approximation GELU: the MLP hidden state is 4x the model
    width, so avoiding one temporary there is the largest single saving in
    the block."""
    cubed = values * values * values
    cubed *= FLOAT(0.044715)
    cubed += values
    cubed *= FLOAT(np.sqrt(2.0 / np.pi))
    np.tanh(cubed, out=cubed)
    cubed += 1.0
    values *= cubed
    values *= FLOAT(0.5)
    return values


def encoder_block(
    tokens: NDArray[np.float32],
    params: dict[str, NDArray[np.float32]],
    num_heads: int,
) -> NDArray[np.float32]:
    """Pre-norm block, with both residual adds done in place."""
    normed = layer_norm(tokens, params['ln1_gain'], params['ln1_shift'])
    tokens = tokens + multi_head_attention(
        normed, params['qkv_weight'], params['qkv_bias'],
        params['out_weight'], params['out_bias'], num_heads,
    )

    normed = layer_norm(tokens, params['ln2_gain'], params['ln2_shift'])
    hidden = normed @ params['w1']
    hidden += params['b1']
    gelu_(hidden)
    tokens += hidden @ params['w2']
    tokens += params['b2']
    return tokens
`,
        rationale:
          'The three changes are ordered by how much they matter, and the biggest one is not arithmetic. Fusing Q, K and V into a single projection means the token activations are read once instead of three times, and the split afterwards is a view; at 768 channels that is a real bandwidth saving for no extra FLOPs. Tiled attention with an online softmax is the substantive change: instead of materializing an N-by-N score matrix and normalizing it, each key tile updates a running maximum and running sum and rescales the accumulator by exp of the maximum difference, which keeps the result exact while making memory linear in sequence length rather than quadratic. That is the FlashAttention idea, and the point worth internalizing is that the naive version is slow because it writes and re-reads a large matrix, not because it does more arithmetic — the win is bandwidth. Batch and heads fold into leading dimensions so attention is one batched matmul rather than a loop, patchify becomes a pure reshape-and-transpose over the image’s existing strides, and the GELU runs in place because the MLP hidden state is four times the model width and is the largest temporary in the block. Layer normalization keeps the two-pass variance deliberately, since the one-pass form cancels catastrophically in float32 exactly where deep residual streams live.',
        optimizations: [
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The N-by-N score matrix never exists — tiles are consumed as they are produced — and the GELU, both residual adds and the layer-norm scaling all run in place.',
            tradeoff: 'Attention weights are unavailable after the fact, so the attention maps people expect to visualize require a second, unfused pass; and in-place activations destroy the pre-GELU values a gradient check would need.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Every projection and both attention products are GEMMs over batch and heads folded into leading dimensions, so there is no Python loop over heads or over tokens.',
            tradeoff: 'The head-major transpose before attention is a genuine copy of the whole activation tensor, which on a short sequence can cost more than the loop it replaces.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Images, heads and tokens all become array dimensions, so a whole batch flows through a block with a constant number of interpreter-level operations.',
            tradeoff: 'Peak memory is the batch times sequence times four times the model width for the MLP hidden state alone, which is what sets the maximum batch size long before compute does.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 throughout with an explicit ascontiguousarray after patchify keeps every GEMM on the BLAS fast path instead of silently copying a strided operand.',
            tradeoff: 'float32 accumulation in the online softmax drifts as sequence length grows, and the running-sum rescaling amplifies it — production kernels keep the accumulator in float32 but the statistics in higher precision for exactly this reason.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Attention memory drops from quadratic to linear in sequence length; the projections become four GEMMs per block for the whole batch. Illustrative, not a measured benchmark: past roughly a thousand tokens the tiled version is faster despite doing slightly more arithmetic, because the naive one is bound by writing and re-reading the score matrix.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// One ViT encoder block and the patch embedding, written out literally.
//
//   image -> patches -> linear projection -> + position -> [attn, MLP] xL
//
// Nothing after the first step is vision-specific. The only thing carrying
// two-dimensional structure is the learned position embedding, one vector per
// grid cell; everything else is a plain text transformer.
//
// Vector-of-vector, and the full N x N score matrix is materialized because
// that is what the definition says. It is also the whole memory problem.

#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

// Row-major over the grid, which fixes token order and therefore what the
// position embeddings mean. Change it and they silently become wrong.
Matrix Patchify(const std::vector<Matrix>& image, std::size_t patch_size,
                std::size_t channels) {
  const std::size_t height = image.size();
  const std::size_t width = image[0].size();
  if (height % patch_size != 0 || width % patch_size != 0) {
    throw std::invalid_argument("image dimensions must divide the patch size");
  }

  Matrix patches;
  for (std::size_t row = 0; row < height; row += patch_size) {
    for (std::size_t column = 0; column < width; column += patch_size) {
      Vector flat;
      flat.reserve(patch_size * patch_size * channels);
      for (std::size_t dy = 0; dy < patch_size; ++dy) {
        for (std::size_t dx = 0; dx < patch_size; ++dx) {
          for (std::size_t c = 0; c < channels; ++c) {
            flat.push_back(image[row + dy][column + dx][c]);
          }
        }
      }
      patches.push_back(flat);
    }
  }
  return patches;
}

Matrix Linear(const Matrix& vectors, const Matrix& weight, const Vector& bias) {
  const std::size_t out_dim = weight[0].size();
  Matrix output(vectors.size(), Vector(out_dim, 0.0));
  for (std::size_t i = 0; i < vectors.size(); ++i) {
    for (std::size_t j = 0; j < out_dim; ++j) {
      output[i][j] = bias[j];
    }
    for (std::size_t k = 0; k < vectors[i].size(); ++k) {
      const double value = vectors[i][k];
      for (std::size_t j = 0; j < out_dim; ++j) {
        output[i][j] += value * weight[k][j];
      }
    }
  }
  return output;
}

// Subtract the maximum before exponentiating, or a large logit overflows.
Vector Softmax(const Vector& scores) {
  double peak = scores[0];
  for (std::size_t i = 1; i < scores.size(); ++i) {
    if (scores[i] > peak) {
      peak = scores[i];
    }
  }
  Vector output(scores.size(), 0.0);
  double total = 0.0;
  for (std::size_t i = 0; i < scores.size(); ++i) {
    output[i] = std::exp(scores[i] - peak);
    total += output[i];
  }
  for (std::size_t i = 0; i < output.size(); ++i) {
    output[i] /= total;
  }
  return output;
}

// softmax(Q K^T / sqrt(d)) V for one head.
//
// The scale factor is not cosmetic: without it the dot products grow with
// head width until the softmax is effectively one-hot, the gradient through
// it is zero, and training stalls with no other symptom.
Matrix AttentionHead(const Matrix& queries, const Matrix& keys,
                     const Matrix& values, std::size_t head_dim) {
  const std::size_t tokens = queries.size();
  const double scale = 1.0 / std::sqrt(static_cast<double>(head_dim));

  Matrix output(tokens, Vector(head_dim, 0.0));
  for (std::size_t i = 0; i < tokens; ++i) {
    Vector scores(tokens, 0.0);
    for (std::size_t j = 0; j < tokens; ++j) {
      double dot = 0.0;
      for (std::size_t d = 0; d < head_dim; ++d) {
        dot += queries[i][d] * keys[j][d];
      }
      scores[j] = dot * scale;
    }
    const Vector weights = Softmax(scores);
    for (std::size_t j = 0; j < tokens; ++j) {
      for (std::size_t d = 0; d < head_dim; ++d) {
        output[i][d] += weights[j] * values[j][d];
      }
    }
  }
  return output;
}

Matrix Slice(const Matrix& source, std::size_t lo, std::size_t hi) {
  Matrix output;
  output.reserve(source.size());
  for (std::size_t i = 0; i < source.size(); ++i) {
    output.emplace_back(source[i].begin() + static_cast<long>(lo),
                        source[i].begin() + static_cast<long>(hi));
  }
  return output;
}

struct AttentionParams {
  Matrix wq, wk, wv, wo;
  Vector bq, bk, bv, bo;
};

Matrix MultiHeadAttention(const Matrix& tokens, const AttentionParams& params,
                          std::size_t num_heads) {
  const Matrix queries = Linear(tokens, params.wq, params.bq);
  const Matrix keys = Linear(tokens, params.wk, params.bk);
  const Matrix values = Linear(tokens, params.wv, params.bv);

  const std::size_t model_dim = queries[0].size();
  const std::size_t head_dim = model_dim / num_heads;

  Matrix concatenated(tokens.size(), Vector(model_dim, 0.0));
  for (std::size_t head = 0; head < num_heads; ++head) {
    const std::size_t lo = head * head_dim;
    const std::size_t hi = lo + head_dim;
    const Matrix mixed = AttentionHead(Slice(queries, lo, hi), Slice(keys, lo, hi),
                                       Slice(values, lo, hi), head_dim);
    for (std::size_t token = 0; token < tokens.size(); ++token) {
      for (std::size_t d = 0; d < head_dim; ++d) {
        concatenated[token][lo + d] = mixed[token][d];
      }
    }
  }
  return Linear(concatenated, params.wo, params.bo);
}

Matrix LayerNorm(const Matrix& vectors, const Vector& gain, const Vector& shift,
                 double epsilon = 1e-6) {
  Matrix output(vectors.size(), Vector(vectors[0].size(), 0.0));
  for (std::size_t i = 0; i < vectors.size(); ++i) {
    double mean = 0.0;
    for (std::size_t d = 0; d < vectors[i].size(); ++d) {
      mean += vectors[i][d];
    }
    mean /= static_cast<double>(vectors[i].size());

    double variance = 0.0;
    for (std::size_t d = 0; d < vectors[i].size(); ++d) {
      const double centred = vectors[i][d] - mean;
      variance += centred * centred;
    }
    variance /= static_cast<double>(vectors[i].size());

    const double denominator = std::sqrt(variance + epsilon);
    for (std::size_t d = 0; d < vectors[i].size(); ++d) {
      output[i][d] = (vectors[i][d] - mean) / denominator * gain[d] + shift[d];
    }
  }
  return output;
}

// The tanh approximation, which is what the reference models use.
double Gelu(double value) {
  const double inner =
      std::sqrt(2.0 / M_PI) * (value + 0.044715 * value * value * value);
  return 0.5 * value * (1.0 + std::tanh(inner));
}

struct BlockParams {
  AttentionParams attention;
  Vector ln1_gain, ln1_shift, ln2_gain, ln2_shift;
  Matrix w1, w2;
  Vector b1, b2;
};

// Pre-norm: normalize BEFORE each sublayer and add the residual after.
// Pre-norm rather than post-norm is why deep ViTs train at all - it leaves a
// clean identity path from input to output, so the gradient reaches the early
// blocks without passing through every normalization on the way.
Matrix EncoderBlock(Matrix tokens, const BlockParams& params, std::size_t num_heads) {
  Matrix normed = LayerNorm(tokens, params.ln1_gain, params.ln1_shift);
  const Matrix attended = MultiHeadAttention(normed, params.attention, num_heads);
  for (std::size_t i = 0; i < tokens.size(); ++i) {
    for (std::size_t d = 0; d < tokens[i].size(); ++d) {
      tokens[i][d] += attended[i][d];
    }
  }

  normed = LayerNorm(tokens, params.ln2_gain, params.ln2_shift);
  Matrix hidden = Linear(normed, params.w1, params.b1);
  for (std::size_t i = 0; i < hidden.size(); ++i) {
    for (std::size_t d = 0; d < hidden[i].size(); ++d) {
      hidden[i][d] = Gelu(hidden[i][d]);
    }
  }
  const Matrix projected = Linear(hidden, params.w2, params.b2);
  for (std::size_t i = 0; i < tokens.size(); ++i) {
    for (std::size_t d = 0; d < tokens[i].size(); ++d) {
      tokens[i][d] += projected[i][d];
    }
  }
  return tokens;
}
`,
        profile:
          'O(N^2 * d) for attention and O(N * d^2) for the projections. Illustrative, not a measured benchmark: the N x N score matrix is allocated per head per block, and with vector-of-vector storage every one of those allocations is a separate heap request.',
      },

      'make-it-right': {
        code: `// The same block with flat tensors, spans, and the grid contract enforced.
//
// The arithmetic does not change. What changes is that geometry becomes a
// type that derives its own token count, position-embedding interpolation is
// provided rather than left to the caller, and the three silent failures a
// deployed ViT actually suffers - a mismatched token grid, an indivisible
// head width, a shape mismatch - become exceptions rather than quiet accuracy
// loss.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

namespace vit {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Its own type because the correct response is specific: interpolate, do not
// reinitialize. This is the most common silent ViT failure in production.
class GridMismatch : public std::invalid_argument {
 public:
  explicit GridMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Geometry derives the token count, so no call site recomputes it.
struct PatchGeometry {
  std::size_t image_height{};
  std::size_t image_width{};
  std::size_t patch_size{};
  std::size_t channels{3};

  void Validate() const {
    if (patch_size == 0) {
      throw ShapeMismatch("patch size must be positive");
    }
    if (image_height % patch_size != 0 || image_width % patch_size != 0) {
      throw ShapeMismatch("image dimensions must divide the patch size");
    }
  }

  [[nodiscard]] std::size_t grid_rows() const noexcept { return image_height / patch_size; }
  [[nodiscard]] std::size_t grid_columns() const noexcept { return image_width / patch_size; }
  [[nodiscard]] std::size_t num_patches() const noexcept {
    return grid_rows() * grid_columns();
  }
  // Patches plus the class token: what attention is quadratic in.
  [[nodiscard]] std::size_t sequence_length() const noexcept { return num_patches() + 1; }
  [[nodiscard]] std::size_t patch_dim() const noexcept {
    return patch_size * patch_size * channels;
  }
};

// Derived once so no call site divides model width by head count again.
struct AttentionShape {
  std::size_t model_dim{};
  std::size_t num_heads{};

  void Validate() const {
    if (num_heads == 0) {
      throw ShapeMismatch("at least one head is required");
    }
    if (model_dim % num_heads != 0) {
      throw ShapeMismatch("model width does not divide into the head count");
    }
    if (head_dim() < 16) {
      // Not fatal, but quality degrades measurably below roughly 32 and it
      // should not happen silently.
      throw ShapeMismatch("head width is too narrow to be useful");
    }
  }

  [[nodiscard]] std::size_t head_dim() const noexcept { return model_dim / num_heads; }
  // 1/sqrt(d_k). Omitting it saturates the softmax and stalls training.
  [[nodiscard]] double scale() const noexcept {
    return 1.0 / std::sqrt(static_cast<double>(head_dim()));
  }
};

// Row-major (tokens x width) with an explicit stride, so a token is a
// contiguous span rather than a separate allocation.
class Tensor2 {
 public:
  Tensor2(std::size_t rows, std::size_t columns)
      : rows_(rows), columns_(columns), data_(rows * columns, 0.0) {}

  [[nodiscard]] std::span<double> Row(std::size_t row) {
    return std::span<double>(data_.data() + row * columns_, columns_);
  }
  [[nodiscard]] std::span<const double> Row(std::size_t row) const {
    return std::span<const double>(data_.data() + row * columns_, columns_);
  }
  [[nodiscard]] std::size_t rows() const noexcept { return rows_; }
  [[nodiscard]] std::size_t columns() const noexcept { return columns_; }
  [[nodiscard]] std::span<double> flat() noexcept { return data_; }
  [[nodiscard]] std::span<const double> flat() const noexcept { return data_; }

 private:
  std::size_t rows_;
  std::size_t columns_;
  std::vector<double> data_;  // rule of zero: one owning member, no special members
};

void Patchify(std::span<const double> image, const PatchGeometry& geometry,
              Tensor2& out) {
  geometry.Validate();
  if (image.size() != geometry.image_height * geometry.image_width * geometry.channels) {
    throw ShapeMismatch("image buffer does not match the declared geometry");
  }
  if (out.rows() != geometry.num_patches() || out.columns() != geometry.patch_dim()) {
    throw ShapeMismatch("patch tensor does not match the geometry");
  }

  const std::size_t row_stride = geometry.image_width * geometry.channels;
  std::size_t patch = 0;
  for (std::size_t row = 0; row < geometry.image_height; row += geometry.patch_size) {
    for (std::size_t column = 0; column < geometry.image_width;
         column += geometry.patch_size) {
      std::span<double> target = out.Row(patch++);
      std::size_t offset = 0;
      for (std::size_t dy = 0; dy < geometry.patch_size; ++dy) {
        const double* source = image.data() + (row + dy) * row_stride +
                               column * geometry.channels;
        // One contiguous run per patch row: a copy, not an element loop.
        std::copy(source, source + geometry.patch_size * geometry.channels,
                  target.begin() + static_cast<long>(offset));
        offset += geometry.patch_size * geometry.channels;
      }
    }
  }
}

// Bilinearly resample patch position embeddings onto a new grid.
//
// Provided rather than left to the caller because it is the step everyone
// forgets: change resolution without it and accuracy collapses with nothing
// logged. The class-token position is carried through untouched, since it
// belongs to no grid cell.
Tensor2 InterpolatePositions(const Tensor2& positions, std::size_t source_rows,
                             std::size_t source_columns, std::size_t target_rows,
                             std::size_t target_columns, bool has_class_token = true) {
  const std::size_t expected =
      source_rows * source_columns + (has_class_token ? 1 : 0);
  if (positions.rows() != expected) {
    throw GridMismatch("position embeddings do not match the source grid");
  }

  const std::size_t width = positions.columns();
  const std::size_t prefix = has_class_token ? 1 : 0;
  Tensor2 out(target_rows * target_columns + prefix, width);

  if (has_class_token) {
    std::span<const double> source = positions.Row(0);
    std::copy(source.begin(), source.end(), out.Row(0).begin());
  }

  for (std::size_t ty = 0; ty < target_rows; ++ty) {
    for (std::size_t tx = 0; tx < target_columns; ++tx) {
      const double sy = (static_cast<double>(ty) + 0.5) *
                            static_cast<double>(source_rows) /
                            static_cast<double>(target_rows) - 0.5;
      const double sx = (static_cast<double>(tx) + 0.5) *
                            static_cast<double>(source_columns) /
                            static_cast<double>(target_columns) - 0.5;

      const auto clamp = [](double value, std::size_t limit) {
        const long floored = static_cast<long>(std::floor(value));
        return static_cast<std::size_t>(
            std::clamp<long>(floored, 0, static_cast<long>(limit) - 1));
      };
      const std::size_t y0 = clamp(sy, source_rows);
      const std::size_t x0 = clamp(sx, source_columns);
      const std::size_t y1 = std::min(y0 + 1, source_rows - 1);
      const std::size_t x1 = std::min(x0 + 1, source_columns - 1);
      const double wy = sy - static_cast<double>(y0);
      const double wx = sx - static_cast<double>(x0);

      std::span<double> target = out.Row(prefix + ty * target_columns + tx);
      const std::span<const double> a = positions.Row(prefix + y0 * source_columns + x0);
      const std::span<const double> b = positions.Row(prefix + y0 * source_columns + x1);
      const std::span<const double> c = positions.Row(prefix + y1 * source_columns + x0);
      const std::span<const double> d = positions.Row(prefix + y1 * source_columns + x1);

      for (std::size_t i = 0; i < width; ++i) {
        target[i] = a[i] * (1.0 - wy) * (1.0 - wx) + b[i] * (1.0 - wy) * wx +
                    c[i] * wy * (1.0 - wx) + d[i] * wy * wx;
      }
    }
  }
  return out;
}

void Linear(const Tensor2& input, std::span<const double> weight,
            std::span<const double> bias, Tensor2& out) {
  if (weight.size() != input.columns() * out.columns()) {
    throw ShapeMismatch("weight does not match the input and output widths");
  }
  for (std::size_t i = 0; i < input.rows(); ++i) {
    std::span<double> target = out.Row(i);
    std::copy(bias.begin(), bias.end(), target.begin());
    const std::span<const double> source = input.Row(i);
    for (std::size_t k = 0; k < source.size(); ++k) {
      const double value = source[k];
      const double* row = weight.data() + k * out.columns();
      for (std::size_t j = 0; j < out.columns(); ++j) {
        target[j] += value * row[j];
      }
    }
  }
}

// Subtract the maximum first; a large logit overflows exp otherwise.
void StableSoftmax(std::span<double> scores) {
  const double peak = *std::max_element(scores.begin(), scores.end());
  double total = 0.0;
  for (double& score : scores) {
    score = std::exp(score - peak);
    total += score;
  }
  for (double& score : scores) {
    score /= total;
  }
}

void LayerNorm(const Tensor2& input, std::span<const double> gain,
               std::span<const double> shift, Tensor2& out, double epsilon = 1e-6) {
  for (std::size_t i = 0; i < input.rows(); ++i) {
    const std::span<const double> source = input.Row(i);
    const double mean =
        std::accumulate(source.begin(), source.end(), 0.0) /
        static_cast<double>(source.size());

    // Two-pass variance deliberately: the one-pass E[x^2] - E[x]^2 form
    // cancels catastrophically once the mean is large relative to the spread,
    // which is the regime deep residual streams drift into.
    double variance = 0.0;
    for (const double value : source) {
      const double centred = value - mean;
      variance += centred * centred;
    }
    variance /= static_cast<double>(source.size());

    const double denominator = std::sqrt(variance + epsilon);
    std::span<double> target = out.Row(i);
    for (std::size_t d = 0; d < source.size(); ++d) {
      target[d] = (source[d] - mean) / denominator * gain[d] + shift[d];
    }
  }
}

[[nodiscard]] inline double Gelu(double value) noexcept {
  constexpr double kRootTwoOverPi = 0.7978845608028654;
  const double inner = kRootTwoOverPi * (value + 0.044715 * value * value * value);
  return 0.5 * value * (1.0 + std::tanh(inner));
}

}  // namespace vit
`,
        rationale:
          'The arithmetic is unchanged; what moves is the boundary and the storage. Vector-of-vector becomes a flat row-major tensor with an explicit stride, so a token is a contiguous span handed out without copying and a patch row is a single std::copy rather than an element loop. Geometry becomes a type that derives grid, token count and patch width, and attention shape derives head width and the scale factor once — including a refusal to build heads narrower than is useful, which is not fatal but degrades quality and should not happen silently. Position-embedding interpolation is provided with its own exception type, because changing resolution without it is the most common way a deployed ViT loses accuracy with nothing logged: the correct response is specific, so the error is specific rather than a generic shape complaint. The softmax subtracts its maximum, which the literal version does not survive on a large logit, and layer normalization keeps the two-pass variance on purpose, since the one-pass form cancels catastrophically exactly where deep residual streams live.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'Identical asymptotics with a much better constant: flat storage makes every row access stride-one, and the patch copy becomes a memcpy per patch row. Illustrative, not a measured benchmark — the score matrix is still materialized per head, which is what the next stage removes.',
      },

      'make-it-fast': {
        code: `// Batched, fused, tiled. The N x N score matrix is never written to memory.
//
// Three changes, in order of how much they matter:
//   1. Q, K and V come from ONE GEMM with 3 * d columns. Three separate
//      products read the same activations three times; one reads them once.
//   2. Attention runs in tiles with an ONLINE softmax: each tile updates a
//      running maximum and sum and rescales the accumulator, so memory is
//      linear in sequence length rather than quadratic. This is the
//      FlashAttention idea, and the win is BANDWIDTH, not arithmetic.
//   3. Everything is a BLAS call over flat float buffers, parallel across
//      the batch-and-head axis.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace vit {

// One arena for the whole block. The activations are large and identically
// shaped every call, so allocating once and slicing is the difference between
// a forward pass that touches the allocator and one that does not.
class FastBlock {
 public:
  FastBlock(int tokens, int model_dim, int num_heads, int mlp_ratio = 4)
      : tokens_(tokens),
        model_dim_(model_dim),
        num_heads_(num_heads),
        head_dim_(model_dim / num_heads),
        qkv_(static_cast<std::size_t>(tokens) * 3 * model_dim),
        heads_(static_cast<std::size_t>(tokens) * 3 * model_dim),
        attended_(static_cast<std::size_t>(tokens) * model_dim),
        normed_(static_cast<std::size_t>(tokens) * model_dim),
        hidden_(static_cast<std::size_t>(tokens) * model_dim * mlp_ratio),
        scores_(static_cast<std::size_t>(num_heads) * tokens * kTile),
        running_max_(static_cast<std::size_t>(num_heads) * tokens),
        running_sum_(static_cast<std::size_t>(num_heads) * tokens) {}

  // tokens x model_dim in, tokens x model_dim out. qkv_weight is
  // model_dim x (3 * model_dim): value, key and query side by side.
  void Attention(const float* __restrict input, const float* __restrict qkv_weight,
                 const float* __restrict qkv_bias, const float* __restrict out_weight,
                 const float* __restrict out_bias, float* __restrict out) {
    // One GEMM for all three projections: the input activations are read
    // once rather than three times, for identical arithmetic.
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, tokens_, 3 * model_dim_,
                model_dim_, 1.0F, input, model_dim_, qkv_weight, 3 * model_dim_,
                0.0F, qkv_.data(), 3 * model_dim_);

#pragma omp parallel for collapse(2) schedule(static)
    for (int t = 0; t < tokens_; ++t) {
      for (int j = 0; j < 3 * model_dim_; ++j) {
        qkv_[static_cast<std::size_t>(t) * 3 * model_dim_ + j] += qkv_bias[j];
      }
    }

    ScatterToHeads();

    // One thread per head: heads are independent, each owns its own tile of
    // scratch, and there is no reduction anywhere.
#pragma omp parallel for schedule(static)
    for (int head = 0; head < num_heads_; ++head) {
      TiledAttention(head);
    }

    GatherFromHeads();

    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, tokens_, model_dim_,
                model_dim_, 1.0F, attended_.data(), model_dim_, out_weight,
                model_dim_, 0.0F, out, model_dim_);

#pragma omp parallel for collapse(2) schedule(static)
    for (int t = 0; t < tokens_; ++t) {
      for (int j = 0; j < model_dim_; ++j) {
        out[static_cast<std::size_t>(t) * model_dim_ + j] += out_bias[j];
      }
    }
  }

 private:
  static constexpr int kTile = 128;

  // (tokens, 3, heads, head_dim) -> (3, heads, tokens, head_dim), so each
  // head's Q, K and V are contiguous and every GEMM below sees a dense block.
  void ScatterToHeads() {
#pragma omp parallel for collapse(2) schedule(static)
    for (int which = 0; which < 3; ++which) {
      for (int head = 0; head < num_heads_; ++head) {
        float* __restrict target = HeadBlock(which, head);
        for (int t = 0; t < tokens_; ++t) {
          const float* __restrict source =
              qkv_.data() + (static_cast<std::size_t>(t) * 3 + which) * model_dim_ +
              static_cast<std::size_t>(head) * head_dim_;
          std::copy(source, source + head_dim_,
                    target + static_cast<std::size_t>(t) * head_dim_);
        }
      }
    }
  }

  void GatherFromHeads() {
#pragma omp parallel for collapse(2) schedule(static)
    for (int t = 0; t < tokens_; ++t) {
      for (int head = 0; head < num_heads_; ++head) {
        const float* source =
            HeadBlock(0, head) + static_cast<std::size_t>(t) * head_dim_;
        std::copy(source, source + head_dim_,
                  attended_.data() + static_cast<std::size_t>(t) * model_dim_ +
                      static_cast<std::size_t>(head) * head_dim_);
      }
    }
  }

  [[nodiscard]] float* HeadBlock(int which, int head) noexcept {
    return heads_.data() +
           (static_cast<std::size_t>(which) * num_heads_ + head) * tokens_ * head_dim_;
  }

  // Online-softmax attention over key tiles.
  //
  // Invariant: after tiles up to j, the accumulator holds the UNNORMALIZED
  // weighted sum of values, and (max, sum) hold the softmax statistics for
  // everything seen so far. A tile with a larger maximum rescales the
  // accumulator by exp(old - new), which keeps the running sum exact.
  void TiledAttention(int head) {
    const float scale = 1.0F / std::sqrt(static_cast<float>(head_dim_));
    float* __restrict queries = HeadBlock(0, head);
    const float* __restrict keys = HeadBlock(1, head);
    const float* __restrict values = HeadBlock(2, head);
    float* __restrict scores =
        scores_.data() + static_cast<std::size_t>(head) * tokens_ * kTile;
    float* __restrict running_max =
        running_max_.data() + static_cast<std::size_t>(head) * tokens_;
    float* __restrict running_sum =
        running_sum_.data() + static_cast<std::size_t>(head) * tokens_;

    std::vector<float> accumulator(static_cast<std::size_t>(tokens_) * head_dim_, 0.0F);
    std::fill(running_max, running_max + tokens_, -std::numeric_limits<float>::infinity());
    std::fill(running_sum, running_sum + tokens_, 0.0F);

    for (int start = 0; start < tokens_; start += kTile) {
      const int width = std::min(kTile, tokens_ - start);

      // One tile of scores: (tokens x width). Quadratic in the TILE, not in
      // the sequence, which is the entire point.
      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, tokens_, width, head_dim_,
                  scale, queries, head_dim_, keys + static_cast<std::size_t>(start) * head_dim_,
                  head_dim_, 0.0F, scores, width);

      for (int t = 0; t < tokens_; ++t) {
        float* row = scores + static_cast<std::size_t>(t) * width;
        float tile_max = -std::numeric_limits<float>::infinity();
        for (int j = 0; j < width; ++j) {
          tile_max = std::max(tile_max, row[j]);
        }
        const float new_max = std::max(running_max[t], tile_max);
        const float correction = std::exp(running_max[t] - new_max);

        float tile_sum = 0.0F;
        for (int j = 0; j < width; ++j) {
          row[j] = std::exp(row[j] - new_max);
          tile_sum += row[j];
        }

        // Rescale the existing accumulator, then let the GEMM below add the
        // tile's contribution on top with beta = 1.
        float* acc = accumulator.data() + static_cast<std::size_t>(t) * head_dim_;
        for (int d = 0; d < head_dim_; ++d) {
          acc[d] *= correction;
        }
        running_sum[t] = running_sum[t] * correction + tile_sum;
        running_max[t] = new_max;
      }

      cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasNoTrans, tokens_, head_dim_, width,
                  1.0F, scores, width, values + static_cast<std::size_t>(start) * head_dim_,
                  head_dim_, 1.0F, accumulator.data(), head_dim_);
    }

    for (int t = 0; t < tokens_; ++t) {
      const float inverse = 1.0F / running_sum[t];
      float* acc = accumulator.data() + static_cast<std::size_t>(t) * head_dim_;
      float* target = queries + static_cast<std::size_t>(t) * head_dim_;
      for (int d = 0; d < head_dim_; ++d) {
        target[d] = acc[d] * inverse;
      }
    }
  }

  int tokens_;
  int model_dim_;
  int num_heads_;
  int head_dim_;
  std::vector<float> qkv_;
  std::vector<float> heads_;
  std::vector<float> attended_;
  std::vector<float> normed_;
  std::vector<float> hidden_;
  std::vector<float> scores_;
  std::vector<float> running_max_;
  std::vector<float> running_sum_;
};

}  // namespace vit
`,
        rationale:
          'Three changes, ordered by how much they matter, and the biggest is not arithmetic. Fusing Q, K and V into a single GEMM with three times the output width means the token activations are read once instead of three times for identical FLOPs, which at a width of 768 is a real bandwidth saving. Tiled attention with an online softmax is the substantive change: instead of materializing a tokens-by-tokens score matrix and normalizing it, each key tile updates a running maximum and sum and rescales the accumulator by the exponential of the maximum difference, which keeps the result exact while making scratch memory linear in sequence length rather than quadratic. The accumulation uses BLAS with beta equal to one so the tile contribution is added without a separate pass. The layout is chosen for that: Q, K and V are scattered into head-major blocks so every GEMM sees a dense contiguous operand rather than a strided one, and heads parallelize across threads with no reduction because they are entirely independent. Restrict qualifiers on the row pointers are what let the compiler keep the running statistics in registers across the tile loop.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The fused projection, both attention products and the output projection are all GEMMs, and the accumulation GEMM uses beta equal to one so the tile sum needs no extra pass.',
            tradeoff: 'The head-major scatter is a genuine copy of three times the activation tensor, so on short sequences the layout change can cost more than the dense GEMM recovers.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The tokens-by-tokens score matrix never exists — each tile is consumed as it is produced, and the rescale, exponential and running-sum update happen in one pass over it.',
            tradeoff: 'Attention weights are gone by the time the block returns, so visualizing attention maps needs a second unfused pass — and the tile rescaling makes the intermediate state much harder to inspect when debugging a numerical problem.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Heads are entirely independent and each owns a private slice of the score and statistics scratch, so the head loop parallelizes with no reduction or critical section.',
            tradeoff: 'Parallelism is capped at the head count — typically twelve — so on a machine with more cores than heads the attention stage leaves most of them idle, and nesting parallelism inside BLAS oversubscribes instead.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The per-tile exponential, rescale and reduction loops are contiguous and branch-free, and they only vectorize when the compiler may emit the host machine width.',
            tradeoff: 'The binary stops being portable across machine generations, which in a mixed fleet means either per-target builds or runtime dispatch — and the exponential in particular vectorizes to a different accuracy on different targets.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Attention scratch drops from quadratic to linear in sequence length; the projections become three GEMMs per block. Illustrative, not a measured benchmark: past roughly a thousand tokens the tiled version wins despite slightly more arithmetic, because the naive one is bound by writing and re-reading the score matrix rather than by computing it.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// One ViT encoder block and the patch embedding, written out literally.
//
//   image -> patches -> linear projection -> + position -> [attn, MLP] xL
//
// Nothing after the first step is vision-specific. The only thing carrying
// two-dimensional structure is the learned position embedding, one vector per
// grid cell; everything else is a plain text transformer.
//
// Vec-of-Vec, index loops, panics on bad input, and the full N x N score
// matrix materialized because that is what the definition says. All four are
// replaced later.

/// Row-major over the grid, which fixes token order and therefore what the
/// position embeddings mean. Change it and they silently become wrong.
fn patchify(image: &[Vec<Vec<f64>>], patch_size: usize) -> Vec<Vec<f64>> {
    let height = image.len();
    let width = image[0].len();
    let channels = image[0][0].len();
    assert!(
        height % patch_size == 0 && width % patch_size == 0,
        "image dimensions must divide the patch size"
    );

    let mut patches = Vec::new();
    for row in (0..height).step_by(patch_size) {
        for column in (0..width).step_by(patch_size) {
            let mut flat = Vec::new();
            for dy in 0..patch_size {
                for dx in 0..patch_size {
                    for c in 0..channels {
                        flat.push(image[row + dy][column + dx][c]);
                    }
                }
            }
            patches.push(flat);
        }
    }
    patches
}

fn linear(vectors: &[Vec<f64>], weight: &[Vec<f64>], bias: &[f64]) -> Vec<Vec<f64>> {
    let out_dim = weight[0].len();
    let mut output = vec![vec![0.0_f64; out_dim]; vectors.len()];
    for i in 0..vectors.len() {
        for j in 0..out_dim {
            output[i][j] = bias[j];
        }
        for k in 0..vectors[i].len() {
            let value = vectors[i][k];
            for j in 0..out_dim {
                output[i][j] += value * weight[k][j];
            }
        }
    }
    output
}

/// Subtract the maximum before exponentiating, or a large logit overflows.
fn softmax(scores: &[f64]) -> Vec<f64> {
    let mut peak = scores[0];
    for &score in scores.iter().skip(1) {
        if score > peak {
            peak = score;
        }
    }
    let mut output: Vec<f64> = scores.iter().map(|&s| (s - peak).exp()).collect();
    let total: f64 = output.iter().sum();
    for value in output.iter_mut() {
        *value /= total;
    }
    output
}

/// softmax(Q K^T / sqrt(d)) V for one head.
///
/// The scale factor is not cosmetic: without it the dot products grow with
/// head width until the softmax is effectively one-hot, the gradient through
/// it is zero, and training stalls with no other symptom.
fn attention_head(
    queries: &[Vec<f64>],
    keys: &[Vec<f64>],
    values: &[Vec<f64>],
    head_dim: usize,
) -> Vec<Vec<f64>> {
    let tokens = queries.len();
    let scale = 1.0 / (head_dim as f64).sqrt();
    let mut output = vec![vec![0.0_f64; head_dim]; tokens];

    for i in 0..tokens {
        // The full N-wide score row, materialized per query. Across all
        // queries that is the N x N matrix, and the whole memory problem.
        let mut scores = vec![0.0_f64; tokens];
        for j in 0..tokens {
            let mut dot = 0.0;
            for d in 0..head_dim {
                dot += queries[i][d] * keys[j][d];
            }
            scores[j] = dot * scale;
        }
        let weights = softmax(&scores);
        for j in 0..tokens {
            for d in 0..head_dim {
                output[i][d] += weights[j] * values[j][d];
            }
        }
    }
    output
}

fn slice_columns(source: &[Vec<f64>], lo: usize, hi: usize) -> Vec<Vec<f64>> {
    source.iter().map(|row| row[lo..hi].to_vec()).collect()
}

struct AttentionParams {
    wq: Vec<Vec<f64>>,
    wk: Vec<Vec<f64>>,
    wv: Vec<Vec<f64>>,
    wo: Vec<Vec<f64>>,
    bq: Vec<f64>,
    bk: Vec<f64>,
    bv: Vec<f64>,
    bo: Vec<f64>,
}

fn multi_head_attention(
    tokens: &[Vec<f64>],
    params: &AttentionParams,
    num_heads: usize,
) -> Vec<Vec<f64>> {
    let queries = linear(tokens, &params.wq, &params.bq);
    let keys = linear(tokens, &params.wk, &params.bk);
    let values = linear(tokens, &params.wv, &params.bv);

    let model_dim = queries[0].len();
    let head_dim = model_dim / num_heads;
    let mut concatenated = vec![vec![0.0_f64; model_dim]; tokens.len()];

    for head in 0..num_heads {
        let (lo, hi) = (head * head_dim, (head + 1) * head_dim);
        let mixed = attention_head(
            &slice_columns(&queries, lo, hi),
            &slice_columns(&keys, lo, hi),
            &slice_columns(&values, lo, hi),
            head_dim,
        );
        for token in 0..tokens.len() {
            for d in 0..head_dim {
                concatenated[token][lo + d] = mixed[token][d];
            }
        }
    }

    linear(&concatenated, &params.wo, &params.bo)
}

fn layer_norm(vectors: &[Vec<f64>], gain: &[f64], shift: &[f64]) -> Vec<Vec<f64>> {
    const EPSILON: f64 = 1e-6;
    let mut output = Vec::new();
    for vector in vectors {
        let width = vector.len() as f64;
        let mean: f64 = vector.iter().sum::<f64>() / width;
        let variance: f64 =
            vector.iter().map(|value| (value - mean).powi(2)).sum::<f64>() / width;
        let denominator = (variance + EPSILON).sqrt();
        output.push(
            vector
                .iter()
                .enumerate()
                .map(|(i, value)| (value - mean) / denominator * gain[i] + shift[i])
                .collect(),
        );
    }
    output
}

/// The tanh approximation, which is what the reference models use.
fn gelu(value: f64) -> f64 {
    let inner = (2.0_f64 / std::f64::consts::PI).sqrt()
        * (value + 0.044715 * value * value * value);
    0.5 * value * (1.0 + inner.tanh())
}

struct BlockParams {
    attention: AttentionParams,
    ln1_gain: Vec<f64>,
    ln1_shift: Vec<f64>,
    ln2_gain: Vec<f64>,
    ln2_shift: Vec<f64>,
    w1: Vec<Vec<f64>>,
    b1: Vec<f64>,
    w2: Vec<Vec<f64>>,
    b2: Vec<f64>,
}

/// Pre-norm: normalize BEFORE each sublayer and add the residual after.
///
/// Pre-norm rather than post-norm is why deep ViTs train at all - it leaves a
/// clean identity path from input to output, so the gradient reaches the early
/// blocks without passing through every normalization on the way.
fn encoder_block(
    mut tokens: Vec<Vec<f64>>,
    params: &BlockParams,
    num_heads: usize,
) -> Vec<Vec<f64>> {
    let normed = layer_norm(&tokens, &params.ln1_gain, &params.ln1_shift);
    let attended = multi_head_attention(&normed, &params.attention, num_heads);
    for (token, delta) in tokens.iter_mut().zip(attended.iter()) {
        for (value, &d) in token.iter_mut().zip(delta.iter()) {
            *value += d;
        }
    }

    let normed = layer_norm(&tokens, &params.ln2_gain, &params.ln2_shift);
    let mut hidden = linear(&normed, &params.w1, &params.b1);
    for row in hidden.iter_mut() {
        for value in row.iter_mut() {
            *value = gelu(*value);
        }
    }
    let projected = linear(&hidden, &params.w2, &params.b2);
    for (token, delta) in tokens.iter_mut().zip(projected.iter()) {
        for (value, &d) in token.iter_mut().zip(delta.iter()) {
            *value += d;
        }
    }
    tokens
}
`,
        profile:
          'O(N^2 * d) for attention and O(N * d^2) for the projections. Illustrative, not a measured benchmark: an N-wide score row is allocated per query per head per block, and every Vec-of-Vec access carries a bounds check the compiler cannot hoist.',
      },

      'make-it-right': {
        code: `//! The same block with flat tensors, typed errors and the grid contract held.
//!
//! The arithmetic does not change. Geometry becomes a type that derives its
//! own token count, position-embedding interpolation is provided rather than
//! left to the caller, and the three failures a deployed ViT actually suffers
//! - a mismatched token grid, an indivisible head width, a shape mismatch -
//! become error variants rather than quiet accuracy loss.

use std::fmt;

/// Width of the residual stream. Distinct from HeadDim so they cannot swap.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct ModelDim(pub usize);

/// Number of tokens in the sequence, including the class token.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenCount(pub usize);

/// Patch side length in pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct PatchSize(pub usize);

#[derive(Debug, PartialEq, Eq)]
pub enum VitError {
    /// Image dimensions do not divide the patch size.
    IndivisibleImage { height: usize, width: usize, patch: usize },
    /// Model width does not divide into the requested head count.
    IndivisibleHeads { model_dim: usize, heads: usize },
    /// Head width below the point where quality degrades measurably.
    HeadTooNarrow(usize),
    /// A buffer length does not match the shape it is meant to carry.
    ShapeMismatch { expected: usize, found: usize },
    /// Position embeddings do not match the current token grid.
    ///
    /// Its own variant because the correct response is specific -
    /// interpolate, do not reinitialize - and this is the most common silent
    /// ViT failure in production.
    GridMismatch { expected: usize, found: usize },
}

impl fmt::Display for VitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::IndivisibleImage { height, width, patch } => {
                write!(f, "{height}x{width} does not divide into {patch}-pixel patches")
            }
            Self::IndivisibleHeads { model_dim, heads } => {
                write!(f, "width {model_dim} does not divide into {heads} heads")
            }
            Self::HeadTooNarrow(dim) => {
                write!(f, "head width {dim} is too narrow to be useful")
            }
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::GridMismatch { expected, found } => {
                write!(f, "expected {expected} position embeddings, found {found}; interpolate them")
            }
        }
    }
}

impl std::error::Error for VitError {}

/// Derives grid, token count and patch width, so no call site recomputes them.
#[derive(Debug, Clone, Copy)]
pub struct PatchGeometry {
    pub image_height: usize,
    pub image_width: usize,
    pub patch_size: PatchSize,
    pub channels: usize,
}

impl PatchGeometry {
    pub fn new(
        image_height: usize,
        image_width: usize,
        patch_size: PatchSize,
        channels: usize,
    ) -> Result<Self, VitError> {
        if patch_size.0 == 0
            || image_height % patch_size.0 != 0
            || image_width % patch_size.0 != 0
        {
            return Err(VitError::IndivisibleImage {
                height: image_height,
                width: image_width,
                patch: patch_size.0,
            });
        }
        Ok(Self { image_height, image_width, patch_size, channels })
    }

    pub fn grid(&self) -> (usize, usize) {
        (self.image_height / self.patch_size.0, self.image_width / self.patch_size.0)
    }

    pub fn num_patches(&self) -> usize {
        let (rows, columns) = self.grid();
        rows * columns
    }

    /// Patches plus the class token: what attention is quadratic in.
    pub fn sequence_length(&self) -> TokenCount {
        TokenCount(self.num_patches() + 1)
    }

    pub fn patch_dim(&self) -> usize {
        self.patch_size.0 * self.patch_size.0 * self.channels
    }
}

/// Derived once so no call site divides model width by head count again.
#[derive(Debug, Clone, Copy)]
pub struct AttentionShape {
    pub model_dim: ModelDim,
    pub num_heads: usize,
}

impl AttentionShape {
    pub fn new(model_dim: ModelDim, num_heads: usize) -> Result<Self, VitError> {
        if num_heads == 0 || model_dim.0 % num_heads != 0 {
            return Err(VitError::IndivisibleHeads {
                model_dim: model_dim.0,
                heads: num_heads,
            });
        }
        let shape = Self { model_dim, num_heads };
        if shape.head_dim() < 16 {
            // Not fatal, but quality degrades measurably below roughly 32 and
            // it should not happen silently.
            return Err(VitError::HeadTooNarrow(shape.head_dim()));
        }
        Ok(shape)
    }

    pub fn head_dim(&self) -> usize {
        self.model_dim.0 / self.num_heads
    }

    /// 1/sqrt(d_k). Omitting it saturates the softmax and stalls training.
    pub fn scale(&self) -> f64 {
        1.0 / (self.head_dim() as f64).sqrt()
    }
}

/// Row-major (rows x columns) with an explicit stride, so a token is a
/// contiguous slice rather than a separate allocation.
pub struct Tensor2 {
    data: Vec<f64>,
    rows: usize,
    columns: usize,
}

impl Tensor2 {
    pub fn zeros(rows: usize, columns: usize) -> Self {
        Self { data: vec![0.0; rows * columns], rows, columns }
    }

    pub fn row(&self, row: usize) -> &[f64] {
        &self.data[row * self.columns..(row + 1) * self.columns]
    }

    pub fn row_mut(&mut self, row: usize) -> &mut [f64] {
        &mut self.data[row * self.columns..(row + 1) * self.columns]
    }

    pub fn rows(&self) -> usize {
        self.rows
    }

    pub fn columns(&self) -> usize {
        self.columns
    }
}

/// Bilinearly resample patch position embeddings onto a new grid.
///
/// Provided rather than left to the caller because it is the step everyone
/// forgets: change resolution without it and accuracy collapses with nothing
/// logged. The class-token position is carried through untouched, since it
/// belongs to no grid cell.
pub fn interpolate_positions(
    positions: &Tensor2,
    source: (usize, usize),
    target: (usize, usize),
    has_class_token: bool,
) -> Result<Tensor2, VitError> {
    let (source_rows, source_columns) = source;
    let (target_rows, target_columns) = target;
    let prefix = usize::from(has_class_token);
    let expected = source_rows * source_columns + prefix;
    if positions.rows() != expected {
        return Err(VitError::GridMismatch { expected, found: positions.rows() });
    }

    let width = positions.columns();
    let mut out = Tensor2::zeros(target_rows * target_columns + prefix, width);
    if has_class_token {
        out.row_mut(0).copy_from_slice(positions.row(0));
    }

    for ty in 0..target_rows {
        for tx in 0..target_columns {
            let sy = (ty as f64 + 0.5) * source_rows as f64 / target_rows as f64 - 0.5;
            let sx = (tx as f64 + 0.5) * source_columns as f64 / target_columns as f64 - 0.5;
            let y0 = (sy.floor().max(0.0) as usize).min(source_rows - 1);
            let x0 = (sx.floor().max(0.0) as usize).min(source_columns - 1);
            let y1 = (y0 + 1).min(source_rows - 1);
            let x1 = (x0 + 1).min(source_columns - 1);
            let (wy, wx) = (sy - y0 as f64, sx - x0 as f64);

            let corners = [
                (positions.row(prefix + y0 * source_columns + x0), (1.0 - wy) * (1.0 - wx)),
                (positions.row(prefix + y0 * source_columns + x1), (1.0 - wy) * wx),
                (positions.row(prefix + y1 * source_columns + x0), wy * (1.0 - wx)),
                (positions.row(prefix + y1 * source_columns + x1), wy * wx),
            ];

            let target_row = prefix + ty * target_columns + tx;
            for index in 0..width {
                out.row_mut(target_row)[index] = corners
                    .iter()
                    .map(|(row, weight)| row[index] * weight)
                    .sum();
            }
        }
    }
    Ok(out)
}

/// Subtract the maximum first; a large logit overflows exp otherwise.
pub fn stable_softmax(scores: &mut [f64]) {
    let peak = scores.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    let mut total = 0.0;
    for score in scores.iter_mut() {
        *score = (*score - peak).exp();
        total += *score;
    }
    for score in scores.iter_mut() {
        *score /= total;
    }
}

pub fn layer_norm(input: &Tensor2, gain: &[f64], shift: &[f64], out: &mut Tensor2) {
    const EPSILON: f64 = 1e-6;
    for row in 0..input.rows() {
        let source = input.row(row);
        let width = source.len() as f64;
        let mean = source.iter().sum::<f64>() / width;

        // Two-pass variance deliberately: the one-pass E[x^2] - E[x]^2 form
        // cancels catastrophically once the mean is large relative to the
        // spread, which is the regime deep residual streams drift into.
        let variance = source.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / width;
        let denominator = (variance + EPSILON).sqrt();

        for ((target, &value), (&g, &s)) in out
            .row_mut(row)
            .iter_mut()
            .zip(source)
            .zip(gain.iter().zip(shift))
        {
            *target = (value - mean) / denominator * g + s;
        }
    }
}

pub fn gelu(value: f64) -> f64 {
    const ROOT_TWO_OVER_PI: f64 = 0.797_884_560_802_865_4;
    let inner = ROOT_TWO_OVER_PI * (value + 0.044_715 * value * value * value);
    0.5 * value * (1.0 + inner.tanh())
}
`,
        rationale:
          'The arithmetic is unchanged; the storage and the boundary move. Vec-of-Vec becomes a flat row-major tensor with an explicit stride, so a token is a contiguous slice and the per-row bounds check is paid once rather than per element. Geometry becomes a type that derives grid, token count and patch width instead of leaving them implicit at every call site, and attention shape derives head width and the scale factor once — including a refusal to construct heads narrower than is useful, which is not fatal but degrades quality and should not happen silently. Position-embedding interpolation is supplied with its own error variant, because changing resolution without it is the most common way a deployed ViT loses accuracy with nothing logged: the correct response is specific, so the error carries that specificity in its message. Model width, token count and patch size become newtypes because all three are usize and are genuinely swapped. The softmax subtracts its maximum, which the literal version does not survive, and layer normalization keeps the two-pass variance on purpose.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'Identical asymptotics with a much better constant: flat storage makes every row access stride-one and lets the bounds check hoist out of the inner loop. Illustrative, not a measured benchmark — the score row is still materialized per query, which is what the next stage removes.',
      },

      'make-it-fast': {
        code: `//! Batched, fused, tiled. The N x N score matrix is never written.
//!
//! Three changes, in order of how much they matter:
//!   1. Q, K and V come from ONE matrix product with 3 * d columns. Three
//!      separate products read the same activations three times; one reads
//!      them once, and splitting afterwards is free.
//!   2. Attention runs in tiles with an ONLINE softmax: each tile updates a
//!      running maximum and sum and rescales the accumulator, so memory is
//!      linear in sequence length rather than quadratic. That is the
//!      FlashAttention idea, and the win is BANDWIDTH, not arithmetic.
//!   3. Heads run in parallel over f32 slices, which is the axis with no
//!      shared state at all.

use ndarray::{s, Array2, ArrayView2, Axis};
use rayon::prelude::*;

const TILE: usize = 128;

/// (B, H, W, C) -> (B, N, P*P*C) by reshape and transpose.
///
/// The patch grid is already a strided view of the image, so everything
/// before the final standard layout is metadata rather than data movement.
pub fn patchify(
    images: ArrayView2<'_, f32>,
    height: usize,
    width: usize,
    channels: usize,
    patch: usize,
) -> Array2<f32> {
    assert!(height % patch == 0 && width % patch == 0, "image must divide the patch size");
    let batch = images.shape()[0];
    let rows = height / patch;
    let columns = width / patch;

    images
        .into_shape((batch, rows, patch, columns, patch, channels))
        .expect("image buffer matches the declared geometry")
        .permuted_axes([0, 1, 3, 2, 4, 5])
        .as_standard_layout()
        .into_shape((batch * rows * columns, patch * patch * channels))
        .expect("patch grid reshapes exactly")
        .to_owned()
}

/// One product for all three projections, then a view split into heads.
///
/// \`weight\` is (d, 3 * d). Three separate products would read \`tokens\` three
/// times; this reads it once for identical arithmetic.
pub fn fused_qkv(
    tokens: ArrayView2<'_, f32>,
    weight: ArrayView2<'_, f32>,
    bias: &[f32],
    num_heads: usize,
) -> Array2<f32> {
    let mut projected = tokens.dot(&weight);
    projected
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .for_each(|mut row| {
            for (value, &b) in row.iter_mut().zip(bias) {
                *value += b;
            }
        });
    let _ = num_heads;
    projected
}

/// Online-softmax attention for one head. Never materializes (N, N).
///
/// Invariant: after tiles up to j, \`accumulator\` holds the UNNORMALIZED
/// weighted sum of values and (running_max, running_sum) hold the softmax
/// statistics for everything seen so far. A tile with a larger maximum
/// rescales the accumulator by exp(old - new), which keeps the sum exact.
pub fn tiled_attention_head(
    queries: ArrayView2<'_, f32>,
    keys: ArrayView2<'_, f32>,
    values: ArrayView2<'_, f32>,
) -> Array2<f32> {
    let tokens = queries.shape()[0];
    let head_dim = queries.shape()[1];
    let scale = 1.0f32 / (head_dim as f32).sqrt();

    let mut accumulator = Array2::<f32>::zeros((tokens, head_dim));
    // Capacity known exactly: three scratch vectors, allocated once, reused
    // across every tile of this head.
    let mut running_max = vec![f32::NEG_INFINITY; tokens];
    let mut running_sum = vec![0.0f32; tokens];

    let mut start = 0;
    while start < tokens {
        let stop = (start + TILE).min(tokens);
        // One tile of scores: (tokens x width). Quadratic in the TILE, not
        // in the sequence, which is the entire point.
        let mut scores = queries.dot(&keys.slice(s![start..stop, ..]).t());
        scores *= scale;

        for token in 0..tokens {
            let mut row = scores.row_mut(token);
            let tile_max = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let new_max = running_max[token].max(tile_max);
            let correction = (running_max[token] - new_max).exp();

            let mut tile_sum = 0.0f32;
            for value in row.iter_mut() {
                *value = (*value - new_max).exp();
                tile_sum += *value;
            }

            // Rescale what we already have, then let the product below add
            // this tile's contribution on top.
            for value in accumulator.row_mut(token).iter_mut() {
                *value *= correction;
            }
            running_sum[token] = running_sum[token] * correction + tile_sum;
            running_max[token] = new_max;
        }

        accumulator += &scores.dot(&values.slice(s![start..stop, ..]));
        start = stop;
    }

    for token in 0..tokens {
        let inverse = 1.0 / running_sum[token];
        for value in accumulator.row_mut(token).iter_mut() {
            *value *= inverse;
        }
    }
    accumulator
}

/// Heads are entirely independent, so they are a parallel map with no
/// reduction, no locking and no shared mutable state.
pub fn multi_head_attention(
    projected: &Array2<f32>,
    tokens: usize,
    model_dim: usize,
    num_heads: usize,
    out_weight: ArrayView2<'_, f32>,
    out_bias: &[f32],
) -> Array2<f32> {
    let head_dim = model_dim / num_heads;

    let per_head: Vec<Array2<f32>> = (0..num_heads)
        .into_par_iter()
        .map(|head| {
            let lo = head * head_dim;
            let queries = projected.slice(s![.., lo..lo + head_dim]);
            let keys = projected.slice(s![.., model_dim + lo..model_dim + lo + head_dim]);
            let values =
                projected.slice(s![.., 2 * model_dim + lo..2 * model_dim + lo + head_dim]);
            tiled_attention_head(queries, keys, values)
        })
        .collect();

    let mut concatenated = Array2::<f32>::zeros((tokens, model_dim));
    for (head, mixed) in per_head.iter().enumerate() {
        let lo = head * head_dim;
        concatenated
            .slice_mut(s![.., lo..lo + head_dim])
            .assign(mixed);
    }

    let mut out = concatenated.dot(&out_weight);
    out.axis_iter_mut(Axis(0))
        .into_par_iter()
        .for_each(|mut row| {
            for (value, &b) in row.iter_mut().zip(out_bias) {
                *value += b;
            }
        });
    out
}

/// In-place tanh-approximation GELU.
///
/// The MLP hidden state is four times the model width, so avoiding one
/// temporary there is the largest single memory saving in the block.
#[inline]
pub fn gelu_inplace(values: &mut [f32]) {
    const ROOT_TWO_OVER_PI: f32 = 0.797_884_6;
    for value in values.iter_mut() {
        let cubed = *value * *value * *value;
        let inner = ROOT_TWO_OVER_PI * (*value + 0.044_715 * cubed);
        *value = 0.5 * *value * (1.0 + inner.tanh());
    }
}

/// Layer norm over the feature axis, rows in parallel.
pub fn layer_norm(tokens: &mut Array2<f32>, gain: &[f32], shift: &[f32]) {
    const EPSILON: f32 = 1e-6;
    tokens
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .for_each(|mut row| {
            let width = row.len() as f32;
            let mean = row.iter().sum::<f32>() / width;
            // Two-pass variance: the one-pass form cancels catastrophically
            // in f32 exactly where deep residual streams live.
            let variance =
                row.iter().map(|v| (v - mean) * (v - mean)).sum::<f32>() / width;
            let inverse = 1.0 / (variance + EPSILON).sqrt();
            for ((value, &g), &s) in row.iter_mut().zip(gain).zip(shift) {
                *value = (*value - mean) * inverse * g + s;
            }
        });
}
`,
        rationale:
          'Three changes, ordered by how much they matter, and the biggest is not arithmetic. Fusing Q, K and V into one product means the token activations are read once instead of three times for identical FLOPs, and the split afterwards is a slice rather than a copy. Tiled attention with an online softmax is the substantive change: rather than materializing a tokens-by-tokens score matrix and normalizing it, each key tile updates a running maximum and sum and rescales the accumulator by the exponential of the maximum difference, which keeps the result exact while making scratch memory linear in sequence length. The lesson worth carrying away is that the naive version is slow because it writes and re-reads a large matrix, not because it computes more — the win is bandwidth. Heads become a rayon map because they share nothing at all, the scratch statistics are two vectors sized once per head rather than per tile, and the GELU runs in place because the MLP hidden state is four times the model width and is the largest temporary in the block. Layer normalization keeps the two-pass variance deliberately, since the one-pass form cancels catastrophically in f32 exactly where deep residual streams live.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The fused projection, both per-tile attention products and the output projection are dense products that dispatch straight to sgemm on contiguous f32 operands.',
            tradeoff: 'Binds the build to a system BLAS, and the per-head slices are strided views of the fused projection, so ndarray copies them to a standard layout before each product — real data movement the fusion was meant to save.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Heads are entirely independent, and both the bias adds and layer normalization are row-independent, so each is a parallel map with no reduction or locking.',
            tradeoff: 'Parallelism is capped at the head count — typically twelve — so a machine with more cores than heads leaves most idle during attention, and nesting rayon inside a threaded BLAS oversubscribes badly.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The running maximum and sum are sized once per head and reused across every tile, and the per-head results are collected into a vector of known length.',
            tradeoff: 'The accumulator holds a full tokens-by-head-width array per head simultaneously, so the memory saved by not materializing the score matrix is partly given back by keeping every head’s output alive until the concatenation.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The GELU is a handful of arithmetic operations applied across the largest tensor in the block, so a call boundary per element would dominate the work it does.',
            tradeoff: 'Inlining it into the MLP loop inflates the hot loop body, and on a large enough block that costs more in instruction-cache pressure than the avoided calls recover.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Attention scratch drops from quadratic to linear in sequence length; the projections become three products per block. Illustrative, not a measured benchmark: past roughly a thousand tokens the tiled version wins despite slightly more arithmetic, because the naive one is bound by writing and re-reading the score matrix.',
      },
    },
  },
};
