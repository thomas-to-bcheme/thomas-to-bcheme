import type { AiMlModel } from '../../types';

/**
 * Residual Network — the entry that explains why depth became trainable, and
 * the reference point for "the penultimate-layer embedding is the image
 * representation".
 *
 * Two ideas live here and they should be kept apart. The residual connection is
 * an optimization trick that carried over to every deep architecture since,
 * transformers included. The pooled penultimate-layer feature is a
 * representation, and how you compare two of them (cosine on L2-normalised
 * vectors) is a separate decision from how the network was trained.
 */
export const RESNET: AiMlModel = {
  slug: 'resnet',
  name: 'Residual Network (ResNet)',
  aliases: ['ResNet', 'ResNet-50', 'Residual connections', 'Skip connections'],
  category: 'deep-learning',
  group: 'spatial',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'anomaly-detection'],
  architecture: 'convolutional',
  paradigmNote:
    'Trained supervised on ImageNet-style labels. The same backbone is also the standard encoder for self-supervised pretraining (SimCLR, MoCo) and for contrastive image-text models, but that is a different training objective applied to this architecture rather than something ResNet itself does.',

  intuition:
    'Instead of asking a stack of layers to learn the mapping H(x) directly, ask it to learn only the correction F(x) = H(x) - x and add the input back: y = F(x) + x. If the best thing a block can do is nothing, it only has to push its weights toward zero, which is easy; a plain stack has to learn the identity map through several nonlinear layers, which turns out to be hard. That is the whole idea, and its consequence was surprising: before it, making a network deeper made it train worse, not just generalise worse. After it, hundreds of layers train with ordinary SGD, and the shortcut became the default way to wire any deep network.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathbf{y} = \\mathcal{F}(\\mathbf{x};\\,\\{\\mathbf{W}_i\\}) + \\mathbf{x}, \\qquad J(\\theta) = -\\frac{1}{n}\\sum_{i=1}^{n}\\log p_\\theta(y_i \\mid \\mathbf{x}_i) + \\frac{\\lambda}{2}\\lVert\\theta\\rVert_2^2',
      symbols: [
        { symbol: '\\mathcal{F}', meaning: 'the residual branch: two 3x3 convolutions (basic block) or a 1x1-3x3-1x1 stack (bottleneck), each followed by batch normalization' },
        { symbol: '\\mathbf{x}', meaning: 'the block input, carried unchanged along the shortcut. When shapes differ a 1x1 projection replaces it' },
        { symbol: '\\mathbf{y}', meaning: 'the block output. A ReLU follows the addition in the original design, and precedes the convolutions in pre-activation ResNet' },
        { symbol: 'p_\\theta(y \\mid \\mathbf{x})', meaning: 'softmax over classes, computed from the globally average-pooled final feature map' },
        { symbol: '\\lambda', meaning: 'weight decay, written as an L2 penalty. Modern recipes exclude BatchNorm parameters and biases from it' },
      ],
    },
    reading:
      'The loss is ordinary cross-entropy and says nothing about the architecture. What is distinctive is the first term: the block is parameterised so that its default behaviour is to pass the input through, and learning is the departure from that default. Two consequences follow. A deeper network contains every shallower one as a special case (set the extra residual branches to zero), so adding depth cannot make the best achievable training error worse. And the parameter-free shortcut costs no FLOPs worth counting, which is why the idea was adopted so quickly: it is nearly free.',
  },

  optimization: {
    method: 'SGD with momentum, weight decay, a warmup-then-decay learning-rate schedule, He initialisation and zero-initialised last BatchNorm gamma per block',
    updateRule: {
      formula:
        '\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}_L}\\prod_{k=l}^{L-1}\\left(\\mathbf{I} + \\frac{\\partial \\mathcal{F}_k}{\\partial \\mathbf{x}_k}\\right), \\qquad \\mathbf{v} \\leftarrow \\mu\\mathbf{v} + \\nabla_\\theta J, \\quad \\theta \\leftarrow \\theta - \\eta_t\\mathbf{v}',
      symbols: [
        { symbol: '\\mathbf{I}', meaning: 'the identity from the shortcut. Expanding the product leaves one term, the identity path, with no multiplicative factor at all, so the loss signal always reaches every earlier block' },
        { symbol: '\\partial \\mathcal{F}_k / \\partial \\mathbf{x}_k', meaning: 'the Jacobian of one residual branch. In a plain network this alone would be the factor, and a long product of such factors is what shrinks or explodes' },
        { symbol: '\\mu', meaning: 'momentum coefficient, 0.9 in the original recipe' },
        { symbol: '\\eta_t', meaning: 'learning rate at step t: linear warmup at large batch, then step or cosine decay' },
        { symbol: '\\mathbf{v}', meaning: 'the momentum buffer, accumulating the gradient (weight decay is folded into the gradient in the SGD form)' },
      ],
    },
    rationale:
      'Plain SGD with momentum is the original and still a strong choice for convolutional classifiers, because batch normalization already makes the loss surface well-conditioned and the generalisation of SGD on this architecture family is hard to beat with adaptive methods. The gradient identity is the heart of it. In a plain network the gradient at layer l is a product of L - l Jacobians, so it shrinks or grows geometrically with depth. In a residual network each factor is I + dF/dx, and the product expands into a sum over paths, one of which is the pure identity. That path guarantees the loss signal reaches the early layers without being multiplied by anything. It does not guarantee the other paths behave: if the branches are large the signal can grow with depth, which is why the initialisation details matter. He initialisation (variance 2 / fan) keeps ReLU activations at a stable scale. Zeroing the last BatchNorm gamma in each block makes every block exactly the identity at step zero, so the network starts as a shallow one and grows effective depth as training proceeds. This is the single cheapest improvement to large-batch training stability.',
    hyperparameters: [
      { name: 'depth and block type', role: 'Basic blocks for 18/34 layers, bottleneck blocks for 50 and above. Depth beyond roughly 100 gives sharply diminishing returns; width and resolution usually pay better', typicalRange: '18, 34, 50, 101, 152 layers' },
      { name: 'base learning rate and batch size', role: 'The linear scaling rule: learning rate grows in proportion to batch size, with warmup to survive the first epochs at the larger rate', typicalRange: '0.1 at batch 256, scaled linearly' },
      { name: 'learning-rate schedule', role: 'Step decay by 10x at fixed epochs in the original; cosine decay in modern recipes. The final low-rate phase is where most of the accuracy is gained', typicalRange: 'cosine over 90 to 600 epochs' },
      { name: 'weight decay', role: 'The main explicit regulariser. Applied to convolution and linear weights, usually not to BatchNorm gamma/beta or biases', typicalRange: '1e-4 to 5e-5' },
      { name: 'zero-init residual gamma', role: 'Starts every block as the identity. Off, large-batch training is noticeably less stable; on, it is nearly free', typicalRange: 'on (gamma = 0 for the last BN of each block)' },
      { name: 'stochastic depth / label smoothing / mixup', role: 'The modern recipe components. Together they account for a large part of the gap between the 2015 numbers and current ResNet-50 accuracy', typicalRange: 'depth drop 0.0 to 0.2, smoothing 0.1' },
    ],
    convergence:
      'Non-convex but reliably trainable, which is the point of the architecture. The degradation problem it addressed is worth stating precisely, because it is usually described wrongly: a 56-layer plain network had higher TRAINING error than a 20-layer one on the same data. That rules out overfitting. It is an optimization failure, since the deeper network could in principle copy the shallower one and set the remaining layers to identity, and SGD could not find that solution. The original paper also noted that batch-normalized plain networks had healthy gradient norms, so this is not simply the classical vanishing-gradient story. The better reading is conditioning: parameterising the block as a perturbation of the identity gives the optimizer a far friendlier landscape, and later work visualising the loss surface found residual networks markedly smoother. The characteristic failures now are different. Small-batch training breaks BatchNorm because the statistics get noisy. Large-batch training without warmup diverges. And shortcut learning on a spurious correlate looks exactly like success until deployment.',
    complexity:
      'ResNet-50 has about 25.6M parameters and about 4.1 GMACs per 224x224 forward pass; the backward pass costs roughly twice that. The bottleneck is the reason: at 256 channels a basic block (two 3x3 convolutions) holds about 1.18M weights while a 1x1-3x3-1x1 bottleneck holds about 70k, a roughly 17-fold saving that is what lets depth reach 50 and beyond at affordable cost. Memory is dominated by stored activations for the backward pass, not weights.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'The 2-D ImageNet ResNet is not a forecaster, and presenting it as one would be dishonest. What carries over is the residual block. A temporal convolutional network is a stack of residual blocks whose convolutions are 1-D, causal and dilated; WaveNet uses gated residual and skip connections the same way; N-BEATS stacks MLP blocks that each subtract their own reconstruction (backcast) from the input and pass the remainder on, which is residual learning applied to the signal itself.',
        where: [
          'Multivariate sensor and telemetry forecasting with a TCN-style residual dilated stack',
          'High-rate signals such as audio, where a WaveNet-style residual stack models the waveform',
          'Univariate benchmark forecasting with N-BEATS-style doubly-residual stacks',
        ],
        why: 'The residual connection is what makes a 10 to 20 layer dilated stack trainable at all, and a dilated stack is how a convolution covers a long history cheaply. The honest limits are structural. The receptive field is fixed by the architecture, so a dependency longer than the dilation schedule covers is invisible. The output is a point forecast unless a probabilistic head is added. And on ordinary business series with calendar structure, gradient-boosted trees on lag features or a seasonal-naive baseline frequently match or beat it. Reach for it when the series is high-rate and multivariate, not by default.',
        featurization: [
          'Causal padding is mandatory: symmetric padding leaks the future into the present and produces spectacular, false validation scores',
          'Choose the dilation schedule so the receptive field covers at least one full seasonal cycle',
          'Scale each series before windowing so one high-volume channel does not dominate',
          'Keep the residual branch narrow enough that the shortcut, not the branch, carries the signal at initialisation',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal naive, reported per horizon. Verify the receptive field actually spans the dependency you believe matters, rather than assuming it from the layer count.',
        pitfalls: [
          'Non-causal padding silently leaks future values',
          'A receptive field shorter than the seasonal period makes the model structurally blind to seasonality',
          'Comparing against no simple baseline; the residual stack must beat seasonal naive and a boosted-tree model to justify its cost',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Use a pretrained ResNet as a frozen feature extractor and do the detection in feature space, the PatchCore recipe. Take mid-level feature maps (layer2 and layer3 of a wide ResNet-50), average each position with its local neighbourhood, and store the patch features of confirmed-normal images in a memory bank, subsampled with a coverage-preserving coreset. At test time the anomaly score of a patch is its distance to the nearest stored normal patch, and the image score is the maximum over patches. No defect labels are needed.',
        where: [
          'Manufacturing surface-defect and assembly inspection, where defects are rare and heterogeneous',
          'Medical screening against a normal-population baseline',
          'Wafer and PCB inspection, where the anomaly is small and local',
        ],
        why: 'The hard part of visual anomaly detection is a good representation, and an ImageNet-pretrained ResNet supplies one without a single defect label. It is applied here as a distance in feature space, not as a classifier. The distance matters. PatchCore uses Euclidean distance between patch features, which is reasonable when patches come from one fixed network and one scale. Swap in a global-average-pooled image embedding with cosine instead and the detector goes blind to small defects, because averaging over the whole map dilutes a local anomaly into the mean. The layer matters equally: the final stage is too specialised to ImageNet classes and too spatially coarse (7x7 at 224 pixels), while the earliest stage is too generic.',
        featurization: [
          'Take intermediate-stage features, not the classifier features, so texture detail survives',
          'Build the memory bank from confirmed-normal images only, then subsample it or lookup cost grows without bound',
          'Aggregate each patch with its neighbours before scoring so a defect straddling a boundary is not halved',
          'Score by the maximum over patches rather than the mean, because a defect is local and the mean averages it away',
        ],
        evaluation:
          'Image-level and pixel-level AUROC reported separately, since a detector can flag the right image for the wrong region. Threshold from a quantile of normal-image scores on a clean holdout, then slice by product variant and lighting. Compare against a trivial intensity-deviation baseline on the same data.',
        pitfalls: [
          'A memory bank that quietly contains defective images teaches the detector that defects are normal',
          'Objects that appear at varying pose or position inflate normal-patch distances and need alignment or a pose-robust score',
          'The backbone is blind to anything ImageNet training made it invariant to, such as small colour shifts',
          'A camera or lighting change moves the whole feature distribution and invalidates the threshold overnight',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'A ResNet is a perception component: it maps pixels to a semantic reading and has no notion of a decision variable, a constraint or a feasible region. It can sit upstream of an optimizer, for example a defect classifier feeding a routing decision, but the network optimizes nothing about the world, only its own weights. The residual connection is an optimization aid for training the network, which is a different matter from solving an optimization problem with it.',
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'A pretrained backbone with a task head. Replace the final linear layer for classification; feed the stage outputs into a feature pyramid for detection and instance segmentation; use the stages as the encoder of a segmentation decoder; or drop the head entirely and use the pooled penultimate-layer vector as an image embedding for retrieval and transfer.',
        where: [
          'Image classification and, as the default backbone, detection and segmentation (Faster R-CNN, RetinaNet, Mask R-CNN encoders)',
          'Transfer learning to small labelled datasets by fine-tuning or by training a linear probe on frozen features',
          'Image retrieval and deduplication from the pooled embedding',
          'Encoder for self-supervised pretraining and for contrastive image-text models',
        ],
        why: 'It is the default baseline because it is simple, well understood, and trains reliably on modest hardware. The similarity decision is the part worth getting right. The pooled penultimate-layer vector is the standard image representation: compare two images by cosine similarity on L2-normalised embeddings, not Euclidean distance on pixels. A one-pixel shift of a textured image changes every pixel coordinate, so pixel distance can rank a shifted copy as farther away than an unrelated blank image. The embedding is built from translation-equivariant convolutions followed by global pooling, so the same shift barely moves it. Normalising first matters because ReLU features are non-negative and their length tracks activation energy, such as contrast and object size, which is not semantics. After L2 normalisation, cosine and Euclidean rank identically, and the dot product is the cosine. Vision Transformers overtake it at very large data scale, and modern ConvNeXt-style recipes close most of the remaining gap, but at ordinary dataset sizes a well-trained ResNet is hard to beat for the effort.',
        featurization: [
          'Normalize with the pretrained backbone\'s own mean and standard deviation, not your dataset\'s',
          'Keep resize interpolation and crop policy identical between training and serving',
          'L2-normalise embeddings before indexing, and centre them on the corpus mean if raw cosine scores are all uniformly high',
          'Train at a lower resolution than you test at: object apparent size differs between random-crop training and centre-crop testing, and a modestly higher test resolution recovers the difference',
        ],
        evaluation:
          'Top-1 and top-5 for classification, mAP for detection, mean IoU for segmentation, recall@k for retrieval on a held-out query and gallery split. Always slice by capture condition and subgroup; aggregate accuracy hides the failure that matters.',
        pitfalls: [
          'Shortcut learning on a background, watermark or scanner artifact that will not exist in deployment',
          'Leaving BatchNorm in training mode at inference, which makes outputs batch-dependent',
          'Treating classifier-trained embeddings as a metric space: they are shaped for linear separability, so fine-grained retrieval needs metric-learning or self-supervised fine-tuning',
          'Small translations still flip predictions, because strided layers alias; the model is equivariant in theory and only approximately in practice',
        ],
      },
      'recommendation-ranking': {
        fit: 'adapted',
        how: 'Use the pooled, L2-normalised ResNet embedding of an item image as a content feature: either index it directly for visual similar-item lookup with an approximate nearest-neighbour search on inner product, or feed it as the image side of a two-tower retrieval model alongside interaction-derived features.',
        where: [
          'Visual search and shop-similar widgets in product catalogues',
          'Cold-start items that have an image but no interaction history',
        ],
        why: 'Image embeddings solve the cold-start problem for visual catalogues, because a new item is placed by what it looks like rather than by who has clicked it. The limitation is that visual similarity is not purchase affinity: two visually near-identical items can serve different buyers, and two dissimilar ones can be co-purchased constantly. Treat it as one feature in a ranker, not as the ranker. Cosine on normalised vectors is the right comparison; unnormalised Euclidean ranks by feature magnitude and surfaces high-contrast images regardless of content.',
        featurization: [
          'Embed once offline and store normalised vectors; recompute only when the backbone changes',
          'Deduplicate near-identical listings before they crowd the top-k',
          'Combine with interaction-derived signals instead of ranking on visual similarity alone',
        ],
        evaluation:
          'Offline recall@k against logged co-engagement, then an online A/B on click-through and conversion, sliced by new versus established items.',
        pitfalls: [
          'Changing the backbone silently invalidates the whole index; version the embedding model with the vectors',
          'Product photos with inconsistent backgrounds cluster by photography style rather than by product',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'ResNet-50 on ImageNet for 90 epochs takes roughly a day on one 8-GPU node with the classic recipe, and about an hour across a few hundred GPUs at batch sizes in the thousands with warmup and the linear scaling rule. Illustrative, not a benchmark. Fine-tuning a pretrained backbone is minutes to hours, which is why almost nobody trains from scratch.',
    inferenceProfile:
      'About 4.1 GMACs per 224x224 image: milliseconds on a GPU, tens to a couple of hundred milliseconds on a CPU depending on core count. BatchNorm folds into the preceding convolution at inference, and int8 quantization is a well-trodden path with broad hardware support, which is a large part of why the architecture is still deployed.',
    retrainingCadence:
      'Quarterly, or whenever the capture pipeline changes. A new camera, lens or lighting rig is a stronger trigger than elapsed time. Any change to the backbone also forces a full re-embedding of every stored vector.',
    driftAndMonitoring: [
      'Monitor the input distribution: camera, lighting and compression changes are the usual cause of silent degradation',
      'Track the distribution of embedding norms and nearest-neighbour similarity to the corpus; a shift precedes a measurable accuracy drop',
      'Track per-slice accuracy, since aggregate metrics hide subgroup failures completely',
    ],
    productionGotchas: [
      'Preprocessing (resize interpolation, crop, mean and standard deviation) must be versioned with the model; a change silently degrades accuracy',
      'BatchNorm behaves differently in train and eval mode, and leaving a served model in train mode corrupts every prediction',
      'Vector indexes must be invalidated and rebuilt when the embedding model changes; mixing embeddings from two backbones gives meaningless similarities',
      'Embeddings must be L2-normalised consistently at index time and query time, or inner-product search ranks by length',
    ],
  },

  assumptions: [
    'The input has a spatial grid structure where nearby pixels are related and a feature worth detecting is worth detecting anywhere (translation equivariance)',
    'Enough labelled data exists, or a pretrained backbone in a compatible domain does',
    'Batches are large enough, and drawn similarly enough to deployment inputs, that BatchNorm statistics are meaningful',
    'The identity is a good default for each block: the useful transformation at each layer is a modest correction rather than a wholesale rewrite',
    'Deployment inputs come from the same capture pipeline as training inputs',
  ],

  pros: [
    {
      point: 'Makes depth trainable with plain SGD',
      context:
        'The identity shortcut removes the degradation problem, so networks of 50 to over 1000 layers optimize. The benefit is largest between about 20 and 150 layers; beyond that, width and resolution usually buy more accuracy per unit of compute.',
    },
    {
      point: 'The shortcut is nearly free',
      context:
        'An identity addition adds no parameters and negligible FLOPs, which is why the idea spread to almost every deep architecture. Projection shortcuts, used only where shapes change, add a small amount.',
    },
    {
      point: 'A strong, well-understood default backbone',
      context:
        'Reliable to train, widely pretrained, supported by every deployment toolchain, and the encoder inside most detection and segmentation systems. Its failure modes are documented, which matters more than a point of benchmark accuracy.',
    },
    {
      point: 'The pooled embedding is the standard image representation',
      context:
        'It transfers well to retrieval, deduplication and anomaly detection without labels from the target domain. Strongest when compared by cosine on normalised vectors and weakest when used raw for fine-grained discrimination it was never trained for.',
    },
  ],

  cons: [
    {
      point: 'Depends on BatchNorm',
      context:
        'Small batches give noisy statistics, and a train/eval mismatch or domain shift in those statistics degrades accuracy. Group or layer normalization fix the first problem at some cost in accuracy; fine-tuning with frozen BN statistics is the usual workaround.',
    },
    {
      point: 'Only approximately shift-invariant',
      context:
        'Strided convolutions and pooling alias, so a one- or two-pixel translation can change a prediction. Anti-aliased downsampling (blur-pool) helps, and augmentation compensates, but the invariance the architecture is credited with is partial.',
    },
    {
      point: 'Classifier embeddings are not a calibrated metric space',
      context:
        'Cross-entropy shapes features for linear separability by class, not for nearest-neighbour geometry. Retrieval at fine granularity needs metric-learning or self-supervised fine-tuning on top; the raw embedding is a strong starting point, not an endpoint.',
    },
    {
      point: 'Superseded at the largest scales and in the newest recipes',
      context:
        'Vision Transformers and modernised ConvNets overtake it when data and compute are abundant. The gap is smaller than the original numbers suggest, since a modern training recipe lifts ResNet-50 several points without touching the architecture.',
    },
  ],

  relatedSlugs: ['cnn', 'vision-transformer', 'u-net', 'mlp', 'object-detection', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A residual block, forward pass only: y = relu(F(x) + x), written out.

Tensors are nested lists indexed [channel][row][col]. The convolution is the
literal sum from the CNN entry with a channel loop added and zero padding, so
the output keeps the input's spatial size. That matters: the shortcut can only
be added to F(x) if the two have exactly the same shape.
"""

import math


def conv3x3(x, weights):
    """x[c_in][h][w], weights[c_out][c_in][3][3]. Stride 1, zero padding 1."""
    c_in, h, w = len(x), len(x[0]), len(x[0][0])
    c_out = len(weights)
    out = [[[0.0] * w for _ in range(h)] for _ in range(c_out)]

    for oc in range(c_out):
        for i in range(h):
            for j in range(w):
                total = 0.0
                for ic in range(c_in):
                    for u in range(3):
                        for v in range(3):
                            row, col = i + u - 1, j + v - 1
                            if 0 <= row < h and 0 <= col < w:
                                total += x[ic][row][col] * weights[oc][ic][u][v]
                out[oc][i][j] = total
    return out


def conv1x1(x, weights):
    """The projection shortcut. weights[c_out][c_in]; mixes channels only."""
    c_in, h, w = len(x), len(x[0]), len(x[0][0])
    c_out = len(weights)
    return [
        [[sum(weights[oc][ic] * x[ic][i][j] for ic in range(c_in)) for j in range(w)]
         for i in range(h)]
        for oc in range(c_out)
    ]


def relu(x):
    return [[[max(0.0, value) for value in row] for row in plane] for plane in x]


def add(a, b):
    return [
        [[a[c][i][j] + b[c][i][j] for j in range(len(a[0][0]))] for i in range(len(a[0]))]
        for c in range(len(a))
    ]


def residual_block(x, w1, w2, w_projection=None):
    """y = relu(F(x) + shortcut(x)), with F = conv -> relu -> conv.

    The shortcut is x itself, unless the channel count changes, in which case a
    1x1 convolution projects x to the new shape so the addition is defined.
    """
    f = conv3x3(relu(conv3x3(x, w1)), w2)
    shortcut = x if w_projection is None else conv1x1(x, w_projection)
    return relu(add(f, shortcut))


def chain_gradient(weight, depth, is_residual):
    """d(output)/d(input) through a chain of scalar layers.

    A plain layer is y = weight * x, with derivative weight. A residual layer is
    y = weight * x + x, with derivative 1 + weight. The chain rule multiplies
    one factor per layer, so a small weight shrinks the plain product toward
    zero while the residual product has the identity term in every factor.
    """
    product = 1.0
    for _ in range(depth):
        product *= (1.0 + weight) if is_residual else weight
    return product


def global_average_pool(x):
    """Collapse each channel's map to its mean: the penultimate-layer embedding."""
    return [sum(sum(row) for row in plane) / (len(plane) * len(plane[0])) for plane in x]


def cosine(a, b):
    """Compare two embeddings by direction, ignoring their length."""
    dot = sum(p * q for p, q in zip(a, b))
    norm_a = math.sqrt(sum(p * p for p in a))
    norm_b = math.sqrt(sum(q * q for q in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)`,
        profile: 'O(C_out·C_in·H·W·k²) per convolution in pure Python, thousands of times slower than a real implementation.',
      },
      'make-it-right': {
        code: `"""ResNet - basic and bottleneck blocks, projection shortcuts, and the
initialisation details that make deep stacks train."""

from dataclasses import dataclass

import torch
import torch.nn.functional as F
from torch import Tensor, nn

BASIC_EXPANSION = 1
BOTTLENECK_EXPANSION = 4
STAGE_STRIDES_AFTER_FIRST = 2


@dataclass(frozen=True)
class ResNetConfig:
    block: str = "bottleneck"            # "basic" (18/34) or "bottleneck" (50+)
    layers: tuple[int, ...] = (3, 4, 6, 3)   # ResNet-50
    num_classes: int = 1000
    in_channels: int = 3
    base_width: int = 64
    zero_init_residual: bool = True

    def __post_init__(self) -> None:
        if self.block not in ("basic", "bottleneck"):
            raise ValueError(f"block must be 'basic' or 'bottleneck', got {self.block!r}")
        if not self.layers or any(count < 1 for count in self.layers):
            raise ValueError(f"every stage needs at least one block, got {self.layers}")


def _conv_bn(in_ch: int, out_ch: int, kernel: int, stride: int = 1) -> list[nn.Module]:
    """Conv -> BN with no conv bias: BN re-centres, so a bias would be wasted."""
    return [
        nn.Conv2d(in_ch, out_ch, kernel, stride=stride, padding=kernel // 2, bias=False),
        nn.BatchNorm2d(out_ch),
    ]


def _shortcut(in_ch: int, out_ch: int, stride: int) -> nn.Module:
    """Identity when shapes match; a 1x1 projection when channels or stride change."""
    if stride == 1 and in_ch == out_ch:
        return nn.Identity()
    return nn.Sequential(*_conv_bn(in_ch, out_ch, kernel=1, stride=stride))


class ResidualBlock(nn.Module):
    """y = relu(F(x) + shortcut(x)). The body F always ends in a BatchNorm."""

    def __init__(self, body: nn.Sequential, shortcut: nn.Module) -> None:
        super().__init__()
        self.body = body
        self.shortcut = shortcut
        self.act = nn.ReLU(inplace=True)

    @property
    def last_bn(self) -> nn.BatchNorm2d:
        last = self.body[-1]
        if not isinstance(last, nn.BatchNorm2d):
            raise TypeError("a residual body must end in BatchNorm2d")
        return last

    def forward(self, x: Tensor) -> Tensor:
        return self.act(self.body(x) + self.shortcut(x))


def basic_block(in_ch: int, width: int, stride: int) -> tuple[ResidualBlock, int]:
    """Two 3x3 convolutions. Used by ResNet-18 and ResNet-34."""
    out_ch = width * BASIC_EXPANSION
    body = nn.Sequential(
        *_conv_bn(in_ch, width, 3, stride), nn.ReLU(inplace=True), *_conv_bn(width, out_ch, 3)
    )
    return ResidualBlock(body, _shortcut(in_ch, out_ch, stride)), out_ch


def bottleneck_block(in_ch: int, width: int, stride: int) -> tuple[ResidualBlock, int]:
    """1x1 reduce -> 3x3 -> 1x1 expand. The 3x3 runs on few channels, which is
    where the roughly 17-fold parameter saving over a basic block comes from.
    Stride sits on the 3x3 (the v1.5 convention), not the first 1x1."""
    out_ch = width * BOTTLENECK_EXPANSION
    body = nn.Sequential(
        *_conv_bn(in_ch, width, 1),
        nn.ReLU(inplace=True),
        *_conv_bn(width, width, 3, stride),
        nn.ReLU(inplace=True),
        *_conv_bn(width, out_ch, 1),
    )
    return ResidualBlock(body, _shortcut(in_ch, out_ch, stride)), out_ch


class ResNet(nn.Module):
    def __init__(self, config: ResNetConfig) -> None:
        super().__init__()
        make_block = basic_block if config.block == "basic" else bottleneck_block

        self.stem = nn.Sequential(
            *_conv_bn(config.in_channels, config.base_width, 7, stride=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1),
        )

        stages: list[nn.Module] = []
        in_ch = config.base_width
        for stage_index, block_count in enumerate(config.layers):
            width = config.base_width * 2**stage_index
            first_stride = 1 if stage_index == 0 else STAGE_STRIDES_AFTER_FIRST
            blocks: list[nn.Module] = []
            for block_index in range(block_count):
                block, in_ch = make_block(in_ch, width, first_stride if block_index == 0 else 1)
                blocks.append(block)
            stages.append(nn.Sequential(*blocks))
        self.stages = nn.Sequential(*stages)

        # Adaptive pooling makes the head independent of input resolution.
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Linear(in_ch, config.num_classes)
        self._initialise(config.zero_init_residual)

    def _initialise(self, zero_init_residual: bool) -> None:
        for module in self.modules():
            if isinstance(module, nn.Conv2d):
                # He initialisation: variance 2 / fan keeps ReLU activations at a
                # stable scale from layer to layer.
                nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(module, nn.BatchNorm2d):
                nn.init.ones_(module.weight)
                nn.init.zeros_(module.bias)
        if zero_init_residual:
            # Every block starts as exactly the identity, so the network begins
            # shallow and effective depth grows as the branches learn.
            for module in self.modules():
                if isinstance(module, ResidualBlock):
                    nn.init.zeros_(module.last_bn.weight)

    def features(self, x: Tensor) -> Tensor:
        """The penultimate-layer embedding: global-average-pooled final stage."""
        if x.dim() != 4:
            raise ValueError(f"expected (batch, channels, height, width), got {tuple(x.shape)}")
        return self.pool(self.stages(self.stem(x))).flatten(1)

    def forward(self, x: Tensor) -> Tensor:
        return self.head(self.features(x))


@torch.no_grad()
def embed(model: ResNet, images: Tensor) -> Tensor:
    """L2-normalised embeddings, so a dot product between two rows is their cosine.

    eval() is not cosmetic: it switches BatchNorm to its running statistics.
    Embeddings from a model left in train mode depend on the batch they were
    computed in, which makes a vector index quietly inconsistent.
    """
    model.eval()
    return F.normalize(model.features(images), dim=1)`,
        rationale:
          'The nested loops become composable modules. A residual block is one class parameterised by its body and its shortcut, with basic and bottleneck bodies as factories. The shortcut is explicit: identity when shapes match, a 1x1 convolution plus BatchNorm when channels or stride change. Three details that decide whether deep networks train are now handled in code rather than left implicit: He initialisation, zeroing the last BatchNorm gamma of every block so each starts as the identity, and eval mode enforced on the embedding path.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'About 25.6M parameters and 4.1 GMACs per 224x224 image for the default configuration, on fused cuDNN kernels.',
      },
      'make-it-fast': {
        code: `"""ResNet - channels-last, bf16, folded BatchNorm, compiled epilogues, batched retrieval."""

import torch
from torch import Tensor, nn


def fuse_conv_bn(conv: nn.Conv2d, bn: nn.BatchNorm2d) -> nn.Conv2d:
    """Fold an eval-mode BatchNorm into the convolution before it.

    BN at inference is a fixed per-channel affine map, so it merges into the
    weights: W' = W * gamma / sqrt(var + eps), b' = beta - mean * gamma / sqrt(var + eps).
    Numerically the same, one fewer layer and one fewer pass over the activations.
    """
    scale = bn.weight / torch.sqrt(bn.running_var + bn.eps)
    fused = nn.Conv2d(
        conv.in_channels, conv.out_channels, conv.kernel_size,
        stride=conv.stride, padding=conv.padding, bias=True,
    ).to(conv.weight.device)
    with torch.no_grad():
        fused.weight.copy_(conv.weight * scale.reshape(-1, 1, 1, 1))
        fused.bias.copy_(bn.bias - bn.running_mean * scale)
    return fused


def fuse_sequential(sequence: nn.Sequential) -> nn.Sequential:
    """Replace every Conv2d -> BatchNorm2d pair with one conv and an Identity."""
    layers = list(sequence.children())
    fused: list[nn.Module] = []
    index = 0
    while index < len(layers):
        has_partner = index + 1 < len(layers)
        if has_partner and isinstance(layers[index], nn.Conv2d) and isinstance(
            layers[index + 1], nn.BatchNorm2d
        ):
            fused.append(fuse_conv_bn(layers[index], layers[index + 1]))
            index += 2
        else:
            fused.append(layers[index])
            index += 1
    return nn.Sequential(*fused)


@torch.no_grad()
def prepare_for_inference(model: nn.Module, device: str) -> nn.Module:
    """Eval mode, folded BN in the stem, bodies and projection shortcuts, channels-last."""
    model = model.eval().to(device)
    model.stem = fuse_sequential(model.stem)
    # Collect first: mutating modules while iterating modules() is undefined.
    blocks = [module for module in model.modules() if hasattr(module, "body")]
    for block in blocks:
        block.body = fuse_sequential(block.body)
        if isinstance(block.shortcut, nn.Sequential):
            block.shortcut = fuse_sequential(block.shortcut)

    # Tensor cores want NHWC. Converting the weights once removes the
    # NCHW->NHWC transpose cuDNN would otherwise insert before each convolution.
    model = model.to(memory_format=torch.channels_last)
    # The compiler fuses the residual add and ReLU into the conv epilogue, so
    # the pre-activation sum is never written to memory.
    return torch.compile(model)


def train_step(model: nn.Module, optimizer, images: Tensor, labels: Tensor, device: str) -> float:
    """One step in bf16 autocast. bf16 keeps fp32's exponent range, so unlike
    fp16 it needs no loss scaling."""
    images = images.to(device, non_blocking=True, memory_format=torch.channels_last)
    labels = labels.to(device, non_blocking=True)

    optimizer.zero_grad(set_to_none=True)
    with torch.autocast(device_type=device, dtype=torch.bfloat16):
        loss = nn.functional.cross_entropy(model(images), labels)
    loss.backward()
    optimizer.step()
    return float(loss.detach())


@torch.inference_mode()
def build_index(model: nn.Module, loader, device: str) -> Tensor:
    """Embed a whole corpus in large batches: one L2-normalised matrix, kept in float32."""
    chunks = []
    for images in loader:
        images = images.to(device, non_blocking=True, memory_format=torch.channels_last)
        with torch.autocast(device_type=device, dtype=torch.bfloat16):
            features = model.features(images)
        # Normalise in float32: bf16 has an 8-bit mantissa, so near-duplicates
        # would tie and the ranking among them would be arbitrary.
        chunks.append(nn.functional.normalize(features.float(), dim=1))
    return torch.cat(chunks)


@torch.inference_mode()
def top_k(index: Tensor, queries: Tensor, k: int) -> tuple[Tensor, Tensor]:
    """Cosine nearest neighbours as one matrix product.

    Both sides are unit length, so queries @ index.T IS the cosine matrix: a
    single GEMM replaces a Python loop over query/item pairs.
    """
    scores = queries @ index.T
    return scores.topk(min(k, index.shape[0]), dim=1)`,
        rationale:
          'Five changes, all about hardware and none about the network. BatchNorm is folded into the preceding convolution everywhere it appears, including the projection shortcuts, which deletes a layer and a full activation pass per convolution. Weights and activations move to channels-last and compute runs in bf16 autocast. torch.compile fuses the residual add and ReLU into the convolution epilogue, which matters here because the shortcut addition is memory-bound. Embedding runs in large batches under inference mode. And retrieval collapses from a pairwise loop to one matrix product, valid only because the embeddings were L2-normalised so that the dot product is the cosine.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'channels_last is the layout tensor cores want, and a single bf16 compute dtype avoids per-layer casts. Together they remove the transposes and conversions that dominate small convolutions.',
            tradeoff: 'bf16 has roughly three significant decimal digits, so near-duplicate similarity scores tie; the index and similarity matmul stay in float32. Any custom op that assumes NCHW silently transposes back and can make the model slower.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Folding BatchNorm into the convolution removes a layer and a full read and write of the activations; compiling fuses the residual addition and ReLU into the convolution epilogue so the sum is never stored.',
            tradeoff: 'Folding is valid only in eval mode with frozen statistics, and a folded model cannot be fine-tuned with BatchNorm behaviour intact. torch.compile adds warm-up latency and recompiles on new input shapes.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Embedding the corpus in large batches under inference mode keeps the GPU busy and avoids per-image Python overhead and autograd bookkeeping.',
            tradeoff: 'Large batches raise peak memory, and a final short batch changes the compiled shape. Latency-sensitive single-image serving does not benefit.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'On unit-length embeddings the cosine matrix is queries @ index.T, one GEMM that replaces a loop over every query and item pair.',
            tradeoff: 'The score matrix is queries by items in size, so a large corpus needs chunking or an approximate index. The shortcut is also only valid if both sides were normalised identically.',
          },
        ],
        libraryName: 'PyTorch (compile, AMP)',
        profile: 'Roughly 2 to 3x inference throughput from folding, channels-last and bf16 on tensor-core hardware; retrieval a single GEMM. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A residual block, forward pass only: y = relu(F(x) + x), written out.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <optional>
#include <vector>

using Plane = std::vector<std::vector<double>>;   // [row][col]
using Volume = std::vector<Plane>;                // [channel][row][col]
using Kernels = std::vector<Volume>;              // [c_out][c_in][u][v]

// weights[oc][ic] is a 3x3 plane. Stride 1, zero padding 1, so the output keeps
// the input's spatial size - the shortcut can only be added if shapes match.
Volume Conv3x3(const Volume& x, const Kernels& weights) {
  const std::size_t c_in = x.size();
  const std::size_t h = x[0].size();
  const std::size_t w = x[0][0].size();
  const std::size_t c_out = weights.size();
  Volume out(c_out, Plane(h, std::vector<double>(w, 0.0)));

  for (std::size_t oc = 0; oc < c_out; ++oc) {
    for (std::size_t i = 0; i < h; ++i) {
      for (std::size_t j = 0; j < w; ++j) {
        double total = 0.0;
        for (std::size_t ic = 0; ic < c_in; ++ic) {
          for (std::size_t u = 0; u < 3; ++u) {
            for (std::size_t v = 0; v < 3; ++v) {
              // Shift by -1 for the padding; skip taps that fall off the image.
              const long row = static_cast<long>(i + u) - 1;
              const long col = static_cast<long>(j + v) - 1;
              if (row >= 0 && row < static_cast<long>(h) && col >= 0 &&
                  col < static_cast<long>(w)) {
                total += x[ic][row][col] * weights[oc][ic][u][v];
              }
            }
          }
        }
        out[oc][i][j] = total;
      }
    }
  }
  return out;
}

// The projection shortcut: weights[oc][ic][0][0], mixing channels only.
Volume Conv1x1(const Volume& x, const Kernels& weights) {
  const std::size_t h = x[0].size();
  const std::size_t w = x[0][0].size();
  Volume out(weights.size(), Plane(h, std::vector<double>(w, 0.0)));
  for (std::size_t oc = 0; oc < weights.size(); ++oc) {
    for (std::size_t i = 0; i < h; ++i) {
      for (std::size_t j = 0; j < w; ++j) {
        for (std::size_t ic = 0; ic < x.size(); ++ic) {
          out[oc][i][j] += weights[oc][ic][0][0] * x[ic][i][j];
        }
      }
    }
  }
  return out;
}

Volume Relu(Volume x) {
  for (auto& plane : x) {
    for (auto& row : plane) {
      for (double& value : row) value = std::max(0.0, value);
    }
  }
  return x;
}

Volume Add(Volume a, const Volume& b) {
  for (std::size_t c = 0; c < a.size(); ++c) {
    for (std::size_t i = 0; i < a[c].size(); ++i) {
      for (std::size_t j = 0; j < a[c][i].size(); ++j) a[c][i][j] += b[c][i][j];
    }
  }
  return a;
}

// y = relu(F(x) + shortcut(x)), with F = conv -> relu -> conv. The shortcut is x
// itself unless the channel count changes, in which case a 1x1 projects it.
Volume ResidualBlock(const Volume& x, const Kernels& w1, const Kernels& w2,
                     const std::optional<Kernels>& projection) {
  const Volume f = Conv3x3(Relu(Conv3x3(x, w1)), w2);
  const Volume shortcut = projection ? Conv1x1(x, *projection) : x;
  return Relu(Add(f, shortcut));
}

// d(output)/d(input) through a chain of scalar layers. Plain: factor = weight.
// Residual: factor = 1 + weight. A small weight drives the plain product to
// zero, while the residual product keeps the identity term in every factor.
double ChainGradient(double weight, int depth, bool is_residual) {
  double product = 1.0;
  for (int layer = 0; layer < depth; ++layer) {
    product *= is_residual ? (1.0 + weight) : weight;
  }
  return product;
}

// The penultimate-layer embedding: the mean of each channel's map.
std::vector<double> GlobalAveragePool(const Volume& x) {
  std::vector<double> pooled;
  for (const Plane& plane : x) {
    double total = 0.0;
    for (const auto& row : plane) {
      for (double value : row) total += value;
    }
    pooled.push_back(total / static_cast<double>(plane.size() * plane[0].size()));
  }
  return pooled;
}

// Compare embeddings by direction, ignoring their length.
double Cosine(const std::vector<double>& a, const std::vector<double>& b) {
  double dot = 0.0, norm_a = 0.0, norm_b = 0.0;
  for (std::size_t k = 0; k < a.size(); ++k) {
    dot += a[k] * b[k];
    norm_a += a[k] * a[k];
    norm_b += b[k] * b[k];
  }
  if (norm_a == 0.0 || norm_b == 0.0) return 0.0;
  return dot / (std::sqrt(norm_a) * std::sqrt(norm_b));
}`,
        profile: 'O(C_out·C_in·H·W·k²). Triple-nested vectors scatter every row across the heap, so the window misses cache on each step.',
      },
      'make-it-right': {
        code: `// Residual block - flat CHW tensor, validated shapes, optional projection.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <optional>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// One flat buffer plus its shape. Nested vectors scatter rows across the heap,
// which is the wrong layout for a sliding window.
class Tensor {
 public:
  Tensor(std::size_t channels, std::size_t height, std::size_t width)
      : channels_(channels), height_(height), width_(width),
        data_(CheckedSize(channels, height, width), 0.0f) {}

  [[nodiscard]] float& At(std::size_t c, std::size_t y, std::size_t x) noexcept {
    return data_[(c * height_ + y) * width_ + x];
  }
  [[nodiscard]] float At(std::size_t c, std::size_t y, std::size_t x) const noexcept {
    return data_[(c * height_ + y) * width_ + x];
  }

  [[nodiscard]] std::size_t channels() const noexcept { return channels_; }
  [[nodiscard]] std::size_t height() const noexcept { return height_; }
  [[nodiscard]] std::size_t width() const noexcept { return width_; }
  [[nodiscard]] std::span<const float> data() const noexcept { return data_; }

  // The residual addition. Shapes must match exactly; a silent broadcast here
  // would hide the very bug projection shortcuts exist to prevent.
  void AddInPlace(const Tensor& other) {
    if (channels_ != other.channels_ || height_ != other.height_ || width_ != other.width_) {
      throw std::invalid_argument("residual addition needs identical shapes");
    }
    for (std::size_t k = 0; k < data_.size(); ++k) data_[k] += other.data_[k];
  }

  void ReluInPlace() noexcept {
    for (float& value : data_) value = std::max(0.0f, value);
  }

 private:
  static std::size_t CheckedSize(std::size_t c, std::size_t h, std::size_t w) {
    if (c == 0 || h == 0 || w == 0) {
      throw std::invalid_argument("tensor dimensions must be non-zero");
    }
    return c * h * w;
  }

  std::size_t channels_, height_, width_;
  std::vector<float> data_;   // owned; rule of zero covers the special members
};

// Same-padding, stride-1 convolution. BatchNorm is not modelled: at inference
// it folds into these weights and bias (see the optimized version).
class Conv2d {
 public:
  Conv2d(std::size_t in_channels, std::size_t out_channels, std::size_t kernel_size,
         std::vector<float> weights, std::vector<float> bias)
      : in_(in_channels), out_(out_channels), k_(kernel_size),
        weights_(std::move(weights)), bias_(std::move(bias)) {
    if (kernel_size % 2 == 0) {
      throw std::invalid_argument("same padding needs an odd kernel size");
    }
    if (weights_.size() != out_ * in_ * k_ * k_) {
      throw std::invalid_argument("weight buffer does not match [out][in][k][k]");
    }
    if (bias_.size() != out_) {
      throw std::invalid_argument("bias must have one entry per output channel");
    }
  }

  [[nodiscard]] std::size_t in_channels() const noexcept { return in_; }
  [[nodiscard]] std::size_t out_channels() const noexcept { return out_; }

  [[nodiscard]] Tensor Forward(const Tensor& input) const {
    if (input.channels() != in_) {
      throw std::invalid_argument("input channel count does not match the layer");
    }
    const long pad = static_cast<long>(k_ / 2);
    const long h = static_cast<long>(input.height());
    const long w = static_cast<long>(input.width());
    Tensor output(out_, input.height(), input.width());

    for (std::size_t oc = 0; oc < out_; ++oc) {
      for (long y = 0; y < h; ++y) {
        for (long x = 0; x < w; ++x) {
          float acc = bias_[oc];
          for (std::size_t ic = 0; ic < in_; ++ic) {
            const float* kernel = weights_.data() + (oc * in_ + ic) * k_ * k_;
            for (long u = 0; u < static_cast<long>(k_); ++u) {
              const long row = y + u - pad;
              if (row < 0 || row >= h) continue;
              for (long v = 0; v < static_cast<long>(k_); ++v) {
                const long col = x + v - pad;
                if (col < 0 || col >= w) continue;
                acc += input.At(ic, row, col) * kernel[u * k_ + v];
              }
            }
          }
          output.At(oc, y, x) = acc;
        }
      }
    }
    return output;
  }

 private:
  std::size_t in_, out_, k_;
  std::vector<float> weights_;
  std::vector<float> bias_;
};

// y = relu(F(x) + shortcut(x)). Wiring is validated once, at construction.
class ResidualBlock {
 public:
  ResidualBlock(Conv2d conv1, Conv2d conv2, std::optional<Conv2d> projection)
      : conv1_(std::move(conv1)), conv2_(std::move(conv2)), projection_(std::move(projection)) {
    if (conv1_.out_channels() != conv2_.in_channels()) {
      throw std::invalid_argument("conv1 output channels must feed conv2");
    }
    const std::size_t shortcut_channels =
        projection_ ? projection_->out_channels() : conv1_.in_channels();
    if (shortcut_channels != conv2_.out_channels()) {
      throw std::invalid_argument(
          "shortcut channels must equal the residual branch output; add a projection");
    }
  }

  [[nodiscard]] Tensor Forward(const Tensor& x) const {
    Tensor hidden = conv1_.Forward(x);
    hidden.ReluInPlace();
    Tensor out = conv2_.Forward(hidden);
    if (projection_) {
      out.AddInPlace(projection_->Forward(x));
    } else {
      out.AddInPlace(x);
    }
    out.ReluInPlace();
    return out;
  }

 private:
  Conv2d conv1_;
  Conv2d conv2_;
  std::optional<Conv2d> projection_;
};

// The penultimate-layer embedding, then its direction only.
[[nodiscard]] std::vector<float> L2NormalisedEmbedding(const Tensor& features) {
  std::vector<float> pooled(features.channels(), 0.0f);
  const float count = static_cast<float>(features.height() * features.width());
  for (std::size_t c = 0; c < features.channels(); ++c) {
    for (std::size_t y = 0; y < features.height(); ++y) {
      for (std::size_t x = 0; x < features.width(); ++x) pooled[c] += features.At(c, y, x);
    }
    pooled[c] /= count;
  }
  float norm = 0.0f;
  for (float value : pooled) norm += value * value;
  norm = std::sqrt(norm);
  if (norm == 0.0f) throw std::domain_error("cannot normalise a zero embedding");
  for (float& value : pooled) value /= norm;
  return pooled;
}

// On unit vectors the dot product IS the cosine similarity.
[[nodiscard]] float CosineOfUnitVectors(std::span<const float> a, std::span<const float> b) {
  if (a.size() != b.size()) throw std::invalid_argument("embedding sizes differ");
  float dot = 0.0f;
  for (std::size_t k = 0; k < a.size(); ++k) dot += a[k] * b[k];
  return dot;
}`,
        rationale:
          'The nested vectors become one flat CHW buffer behind a Tensor type, and the wiring errors that plague residual code are made impossible to miss. Shape validation happens at construction before any allocation. The residual addition refuses mismatched shapes instead of broadcasting, and ResidualBlock checks at construction that the shortcut and the branch agree on channels, throwing and asking for a projection if they do not. The projection is std::optional rather than a null pointer, so absence is part of the type. The embedding is L2-normalised once so that a dot product is thereafter a cosine.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(C_out·C_in·H·W·k²), contiguous access, one allocation per output tensor. The branch temporaries are the cost of clarity.',
      },
      'make-it-fast': {
        code: `// Residual conv - BatchNorm folded, bias + skip + ReLU fused into one pass.
//
// Build: g++ -std=c++20 -O3 -march=native -fopenmp
#include <algorithm>
#include <cmath>
#include <cstddef>

// At inference BatchNorm is a fixed per-channel affine map, so it is absorbed
// into the convolution algebraically:
//   w'[oc] = w[oc] * gamma / sqrt(var + eps)
//   b'[oc] = beta - mean * gamma / sqrt(var + eps)
// Numerically identical, and one full pass over the activations disappears.
void FoldBatchNorm(float* weights, float* bias, const float* gamma, const float* beta,
                   const float* mean, const float* var, float eps,
                   std::size_t out_channels, std::size_t weights_per_channel) {
  for (std::size_t oc = 0; oc < out_channels; ++oc) {
    const float scale = gamma[oc] / std::sqrt(var[oc] + eps);
    float* channel_weights = weights + oc * weights_per_channel;
    for (std::size_t k = 0; k < weights_per_channel; ++k) channel_weights[k] *= scale;
    bias[oc] = beta[oc] - mean[oc] * scale;
  }
}

// out += weight * in, shifted by (u - 1, v - 1), zero padded. Both rows are
// contiguous, so with __restrict the compiler can prove no aliasing and emit
// vector loads without a hand-written intrinsic.
static inline void AccumulateShifted(float* __restrict out_plane,
                                     const float* __restrict in_plane, float weight,
                                     std::size_t h, std::size_t w, std::size_t u,
                                     std::size_t v) {
  const std::size_t x_begin = (v == 0) ? 1 : 0;       // col = x - 1 must be >= 0
  const std::size_t x_end = (v == 2) ? w - 1 : w;     // col = x + 1 must be < w
  for (std::size_t y = 0; y < h; ++y) {
    if (y + u < 1 || y + u - 1 >= h) continue;        // source row off the image
    const float* __restrict src = in_plane + (y + u - 1) * w + (x_begin + v - 1);
    float* __restrict dst = out_plane + y * w + x_begin;
    for (std::size_t x = 0; x < x_end - x_begin; ++x) dst[x] += weight * src[x];
  }
}

// 3x3 same-padding convolution with a fused epilogue: bias, optional residual
// skip, ReLU. The pre-activation sum is never written back to memory as its
// own tensor, and the skip is read exactly once, as it is consumed.
// Layout is row-major [channel][row][col]; skip may be null.
void ConvBnAddRelu(const float* __restrict input, const float* __restrict weights,
                   const float* __restrict bias, const float* __restrict skip,
                   float* __restrict output, std::size_t c_in, std::size_t c_out,
                   std::size_t h, std::size_t w) {
  const std::size_t plane = h * w;

  // Output channels are independent: each thread owns whole output planes, so
  // there is no reduction and no shared writes.
  #pragma omp parallel for schedule(static)
  for (std::size_t oc = 0; oc < c_out; ++oc) {
    float* __restrict out_plane = output + oc * plane;
    std::fill(out_plane, out_plane + plane, bias[oc]);

    for (std::size_t ic = 0; ic < c_in; ++ic) {
      const float* in_plane = input + ic * plane;
      const float* kernel = weights + (oc * c_in + ic) * 9;
      for (std::size_t u = 0; u < 3; ++u) {
        for (std::size_t v = 0; v < 3; ++v) {
          AccumulateShifted(out_plane, in_plane, kernel[u * 3 + v], h, w, u, v);
        }
      }
    }

    // Fused epilogue: one traversal does the residual add and the ReLU.
    if (skip != nullptr) {
      const float* skip_plane = skip + oc * plane;
      for (std::size_t k = 0; k < plane; ++k) {
        out_plane[k] = std::max(0.0f, out_plane[k] + skip_plane[k]);
      }
    } else {
      for (std::size_t k = 0; k < plane; ++k) out_plane[k] = std::max(0.0f, out_plane[k]);
    }
  }
}`,
        rationale:
          'A different transformation from the CNN entry on purpose: this is a direct convolution, not im2col, because the interesting cost in a residual block is the memory traffic around the convolution rather than the arithmetic inside it. BatchNorm is folded into the weights, so it vanishes. The bias, the shortcut addition and the ReLU are fused into one epilogue over each output plane instead of three separate tensors. The inner loop is a contiguous scaled add on two non-aliasing rows, which vectorizes without intrinsics, and OpenMP splits the work over output channels.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Bias, residual addition and ReLU share one traversal of the output plane, and BatchNorm is folded away entirely, so the activations make one trip through memory instead of four.',
            tradeoff: 'The fused routine is specific to the conv-add-relu pattern and loses the modularity of separate layers. Folding is valid only with frozen eval-mode statistics.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: '__restrict promises the output row, the input row and the skip never overlap, so the compiler can vectorize the shifted accumulate without runtime overlap checks.',
            tradeoff: 'It is a promise, not a check. Calling this in place, with output aliasing input or skip, is undefined behaviour and gives wrong answers rather than an error.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Output channels are independent, so each thread owns whole planes with no reduction and no synchronization.',
            tradeoff: 'Every thread streams the full input volume, so at high core counts the loop becomes memory-bandwidth bound. With few output channels there is too little parallelism to use the cores.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Lets the compiler target the host vector width for the contiguous inner loop.',
            tradeoff: 'The binary may not run on an older CPU than the build machine, so portable distribution needs per-ISA builds or runtime dispatch.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'One pass over each output plane, no BatchNorm layer, no separate add or ReLU tensor. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A residual block, forward pass only: y = relu(F(x) + x), written out.

type Plane = Vec<Vec<f64>>;     // [row][col]
type Volume = Vec<Plane>;       // [channel][row][col]
type Kernels = Vec<Volume>;     // [c_out][c_in][u][v]

/// weights[oc][ic] is a 3x3 plane. Stride 1, zero padding 1, so the output
/// keeps the input's spatial size - the shortcut needs exactly that shape.
pub fn conv3x3(x: &Volume, weights: &Kernels) -> Volume {
    let c_in = x.len();
    let h = x[0].len();
    let w = x[0][0].len();
    let c_out = weights.len();
    let mut out = vec![vec![vec![0.0; w]; h]; c_out];

    for oc in 0..c_out {
        for i in 0..h {
            for j in 0..w {
                let mut total = 0.0;
                for ic in 0..c_in {
                    for u in 0..3 {
                        for v in 0..3 {
                            // Shift by -1 for the padding; skip taps off the image.
                            let row = i as isize + u as isize - 1;
                            let col = j as isize + v as isize - 1;
                            if row >= 0 && row < h as isize && col >= 0 && col < w as isize {
                                total += x[ic][row as usize][col as usize] * weights[oc][ic][u][v];
                            }
                        }
                    }
                }
                out[oc][i][j] = total;
            }
        }
    }
    out
}

/// The projection shortcut: weights[oc][ic][0][0], mixing channels only.
pub fn conv1x1(x: &Volume, weights: &Kernels) -> Volume {
    let h = x[0].len();
    let w = x[0][0].len();
    let mut out = vec![vec![vec![0.0; w]; h]; weights.len()];
    for oc in 0..weights.len() {
        for i in 0..h {
            for j in 0..w {
                for ic in 0..x.len() {
                    out[oc][i][j] += weights[oc][ic][0][0] * x[ic][i][j];
                }
            }
        }
    }
    out
}

pub fn relu(mut x: Volume) -> Volume {
    for plane in x.iter_mut() {
        for row in plane.iter_mut() {
            for value in row.iter_mut() {
                *value = value.max(0.0);
            }
        }
    }
    x
}

pub fn add(mut a: Volume, b: &Volume) -> Volume {
    for c in 0..a.len() {
        for i in 0..a[c].len() {
            for j in 0..a[c][i].len() {
                a[c][i][j] += b[c][i][j];
            }
        }
    }
    a
}

/// y = relu(F(x) + shortcut(x)), with F = conv -> relu -> conv. The shortcut is
/// x itself unless the channel count changes, in which case a 1x1 projects it.
pub fn residual_block(x: &Volume, w1: &Kernels, w2: &Kernels, projection: Option<&Kernels>) -> Volume {
    let f = conv3x3(&relu(conv3x3(x, w1)), w2);
    let shortcut = match projection {
        Some(weights) => conv1x1(x, weights),
        None => x.clone(),
    };
    relu(add(f, &shortcut))
}

/// d(output)/d(input) through a chain of scalar layers. Plain: factor = weight.
/// Residual: factor = 1 + weight. A small weight drives the plain product to
/// zero, while the residual product keeps the identity term in every factor.
pub fn chain_gradient(weight: f64, depth: usize, is_residual: bool) -> f64 {
    let mut product = 1.0;
    for _ in 0..depth {
        product *= if is_residual { 1.0 + weight } else { weight };
    }
    product
}

/// The penultimate-layer embedding: the mean of each channel's map.
pub fn global_average_pool(x: &Volume) -> Vec<f64> {
    let mut pooled = Vec::new();
    for plane in x {
        let mut total = 0.0;
        for row in plane {
            for value in row {
                total += value;
            }
        }
        pooled.push(total / (plane.len() * plane[0].len()) as f64);
    }
    pooled
}

/// Compare embeddings by direction, ignoring their length.
pub fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for k in 0..a.len() {
        dot += a[k] * b[k];
        norm_a += a[k] * a[k];
        norm_b += b[k] * b[k];
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}`,
        profile: 'O(C_out·C_in·H·W·k²). Vec<Vec<Vec<f64>>> scatters rows and every index is bounds-checked.',
      },
      'make-it-right': {
        code: `//! Residual block - flat CHW tensor, newtyped channels, typed errors.

use std::fmt;

/// A channel count, distinct from a height or a width so the two cannot be
/// swapped at a call site.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Channels(pub usize);

#[derive(Debug, PartialEq, Eq)]
pub enum ResNetError {
    ZeroDimension,
    EvenKernel(usize),
    WeightLength { expected: usize, found: usize },
    ChannelMismatch { expected: Channels, found: Channels },
    ShapeMismatch { left: (usize, usize, usize), right: (usize, usize, usize) },
}

impl fmt::Display for ResNetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroDimension => write!(f, "tensor dimensions must be non-zero"),
            Self::EvenKernel(k) => write!(f, "same padding needs an odd kernel, got {k}"),
            Self::WeightLength { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::ChannelMismatch { expected, found } => {
                write!(f, "expected {} channels, found {}", expected.0, found.0)
            }
            Self::ShapeMismatch { left, right } => {
                write!(f, "residual addition needs equal shapes, got {left:?} and {right:?}")
            }
        }
    }
}

impl std::error::Error for ResNetError {}

/// One flat CHW buffer plus its shape.
#[derive(Debug)]
pub struct Tensor {
    channels: usize,
    height: usize,
    width: usize,
    data: Vec<f32>,
}

impl Tensor {
    pub fn zeros(channels: usize, height: usize, width: usize) -> Result<Self, ResNetError> {
        if channels == 0 || height == 0 || width == 0 {
            return Err(ResNetError::ZeroDimension);
        }
        Ok(Self { channels, height, width, data: vec![0.0; channels * height * width] })
    }

    #[must_use]
    pub fn shape(&self) -> (usize, usize, usize) {
        (self.channels, self.height, self.width)
    }

    #[inline]
    #[must_use]
    pub fn at(&self, c: usize, y: usize, x: usize) -> f32 {
        self.data[(c * self.height + y) * self.width + x]
    }

    #[inline]
    pub fn set(&mut self, c: usize, y: usize, x: usize, value: f32) {
        let index = (c * self.height + y) * self.width + x;
        self.data[index] = value;
    }

    /// The residual addition. Shapes must match exactly; no silent broadcast.
    pub fn add_in_place(&mut self, other: &Tensor) -> Result<(), ResNetError> {
        if self.shape() != other.shape() {
            return Err(ResNetError::ShapeMismatch { left: self.shape(), right: other.shape() });
        }
        self.data.iter_mut().zip(&other.data).for_each(|(a, &b)| *a += b);
        Ok(())
    }

    pub fn relu_in_place(&mut self) {
        self.data.iter_mut().for_each(|value| *value = value.max(0.0));
    }
}

/// Same-padding, stride-1 convolution. BatchNorm is not modelled: at inference
/// it folds into these weights and bias.
pub struct Conv2d {
    in_channels: Channels,
    out_channels: Channels,
    k: usize,
    /// [out][in][k][k], flattened.
    weights: Vec<f32>,
    bias: Vec<f32>,
}

impl Conv2d {
    pub fn new(
        in_channels: Channels,
        out_channels: Channels,
        k: usize,
        weights: Vec<f32>,
        bias: Vec<f32>,
    ) -> Result<Self, ResNetError> {
        if k % 2 == 0 {
            return Err(ResNetError::EvenKernel(k));
        }
        let expected = out_channels.0 * in_channels.0 * k * k;
        if weights.len() != expected {
            return Err(ResNetError::WeightLength { expected, found: weights.len() });
        }
        if bias.len() != out_channels.0 {
            return Err(ResNetError::WeightLength { expected: out_channels.0, found: bias.len() });
        }
        Ok(Self { in_channels, out_channels, k, weights, bias })
    }

    pub fn forward(&self, input: &Tensor) -> Result<Tensor, ResNetError> {
        let (channels, height, width) = input.shape();
        if Channels(channels) != self.in_channels {
            return Err(ResNetError::ChannelMismatch {
                expected: self.in_channels,
                found: Channels(channels),
            });
        }
        let pad = (self.k / 2) as isize;
        let mut output = Tensor::zeros(self.out_channels.0, height, width)?;

        for oc in 0..self.out_channels.0 {
            for y in 0..height {
                for x in 0..width {
                    let mut acc = self.bias[oc];
                    for ic in 0..channels {
                        let base = (oc * channels + ic) * self.k * self.k;
                        let kernel = &self.weights[base..base + self.k * self.k];
                        for u in 0..self.k {
                            let row = y as isize + u as isize - pad;
                            if row < 0 || row >= height as isize {
                                continue;
                            }
                            for (v, &weight) in kernel[u * self.k..(u + 1) * self.k].iter().enumerate() {
                                let col = x as isize + v as isize - pad;
                                if col >= 0 && col < width as isize {
                                    acc += input.at(ic, row as usize, col as usize) * weight;
                                }
                            }
                        }
                    }
                    output.set(oc, y, x, acc);
                }
            }
        }
        Ok(output)
    }
}

/// y = relu(F(x) + shortcut(x)). Wiring is validated once, at construction.
pub struct ResidualBlock {
    conv1: Conv2d,
    conv2: Conv2d,
    projection: Option<Conv2d>,
}

impl ResidualBlock {
    pub fn new(conv1: Conv2d, conv2: Conv2d, projection: Option<Conv2d>) -> Result<Self, ResNetError> {
        if conv1.out_channels != conv2.in_channels {
            return Err(ResNetError::ChannelMismatch {
                expected: conv2.in_channels,
                found: conv1.out_channels,
            });
        }
        let shortcut_channels = projection.as_ref().map_or(conv1.in_channels, |p| p.out_channels);
        if shortcut_channels != conv2.out_channels {
            return Err(ResNetError::ChannelMismatch {
                expected: conv2.out_channels,
                found: shortcut_channels,
            });
        }
        Ok(Self { conv1, conv2, projection })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor, ResNetError> {
        let mut hidden = self.conv1.forward(x)?;
        hidden.relu_in_place();
        let mut out = self.conv2.forward(&hidden)?;

        // Borrow the input as the shortcut; only a projection allocates.
        let projected;
        let shortcut: &Tensor = match &self.projection {
            Some(projection) => {
                projected = projection.forward(x)?;
                &projected
            }
            None => x,
        };
        out.add_in_place(shortcut)?;
        out.relu_in_place();
        Ok(out)
    }
}`,
        rationale:
          'The nested Vecs become one flat CHW buffer behind a Tensor type, and the failure cases become a typed Result instead of a panic or a silent wrong answer. Channel counts get a newtype so they cannot be confused with spatial sizes. ResidualBlock::new validates the wiring once, and returns a ChannelMismatch if the shortcut and the branch disagree rather than letting the addition fail at runtime. The forward pass borrows the input as the shortcut, so only a projection allocates; the clone the literal version needed is gone.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(C_out·C_in·H·W·k²), contiguous access, one allocation per convolution output; the shortcut is borrowed when it is the identity.',
      },
      'make-it-fast': {
        code: `//! Residual conv - BatchNorm folded, bias + skip + ReLU fused, parallel over channels.

use rayon::prelude::*;

/// Fold an eval-mode BatchNorm into the convolution before it:
///   w'[oc] = w[oc] * gamma / sqrt(var + eps)
///   b'[oc] = beta - mean * gamma / sqrt(var + eps)
/// Identical numerically, and a full pass over the activations disappears.
pub fn fold_batch_norm(
    weights: &mut [f32],
    bias: &mut [f32],
    gamma: &[f32],
    beta: &[f32],
    mean: &[f32],
    var: &[f32],
    eps: f32,
) {
    let per_channel = weights.len() / bias.len();
    for (oc, channel) in weights.chunks_exact_mut(per_channel).enumerate() {
        let scale = gamma[oc] / (var[oc] + eps).sqrt();
        channel.iter_mut().for_each(|weight| *weight *= scale);
        bias[oc] = beta[oc] - mean[oc] * scale;
    }
}

/// out += weight * in, shifted by (u - 1, v - 1) with zero padding. Rows are
/// contiguous slices zipped together, so there is no per-element bounds check
/// and the loop vectorizes.
#[inline]
fn accumulate_shifted(
    out_plane: &mut [f32],
    in_plane: &[f32],
    weight: f32,
    (height, width): (usize, usize),
    (u, v): (usize, usize),
) {
    let x_begin = usize::from(v == 0); // col = x - 1 must be >= 0
    let x_end = if v == 2 { width - 1 } else { width }; // col = x + 1 must be < width
    for (y, out_row) in out_plane.chunks_exact_mut(width).enumerate() {
        let Some(src_y) = (y + u).checked_sub(1).filter(|&row| row < height) else {
            continue; // source row is off the image
        };
        let src = &in_plane[src_y * width + x_begin + v - 1..src_y * width + x_end + v - 1];
        out_row[x_begin..x_end].iter_mut().zip(src).for_each(|(o, &i)| *o += weight * i);
    }
}

/// The fused epilogue: residual add and ReLU in a single traversal.
#[inline]
fn epilogue(out_plane: &mut [f32], skip: Option<&[f32]>) {
    match skip {
        Some(skip_plane) => out_plane
            .iter_mut()
            .zip(skip_plane)
            .for_each(|(o, &s)| *o = (*o + s).max(0.0)),
        None => out_plane.iter_mut().for_each(|o| *o = o.max(0.0)),
    }
}

/// 3x3 same-padding convolution with bias, optional skip and ReLU fused.
/// Layout is row-major [channel][row][col]; the skip, when given, has the
/// output's shape. Needs height >= 2 and width >= 2.
#[must_use]
pub fn conv_bn_add_relu(
    input: &[f32],
    weights: &[f32],
    bias: &[f32],
    skip: Option<&[f32]>,
    (c_in, c_out, height, width): (usize, usize, usize, usize),
) -> Vec<f32> {
    let plane = height * width;
    let mut output = vec![0.0_f32; c_out * plane];

    // Output channels are independent: each worker owns whole output planes, so
    // there is no reduction and no shared mutable state.
    output.par_chunks_exact_mut(plane).enumerate().for_each(|(oc, out_plane)| {
        out_plane.fill(bias[oc]);
        for ic in 0..c_in {
            let in_plane = &input[ic * plane..(ic + 1) * plane];
            let kernel = &weights[(oc * c_in + ic) * 9..(oc * c_in + ic + 1) * 9];
            for u in 0..3 {
                for v in 0..3 {
                    accumulate_shifted(out_plane, in_plane, kernel[u * 3 + v], (height, width), (u, v));
                }
            }
        }
        epilogue(out_plane, skip.map(|s| &s[oc * plane..(oc + 1) * plane]));
    });

    output
}`,
        rationale:
          'The structural wrappers are dropped for flat slices, and the work changes shape. BatchNorm is folded into the weights so it no longer exists at inference. The convolution is written as shifted contiguous accumulates over zipped row slices, which removes bounds checks and vectorizes. Bias, residual addition and ReLU are fused into one epilogue pass over each output plane instead of three separate tensors. Output channels are independent, so rayon assigns each worker whole planes with no reduction.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each output channel is computed independently, so par_chunks_exact_mut hands every worker an exclusive output plane: no locks, no reduction.',
            tradeoff: 'Every worker streams the whole input volume, so at high core counts memory bandwidth, not compute, is the limit. A layer with few output channels exposes too little parallelism.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Working on flat row-major slices keeps each inner loop a contiguous scaled add that the compiler vectorizes; the skip is also a slice read once as it is consumed.',
            tradeoff: 'The caller owns layout and shape: a wrong channel or stride is no longer a type error, only a wrong answer or a slice panic.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Zipping the output row with the source row proves equal length to the compiler, so the per-element bounds check in the hot loop is removed.',
            tradeoff: 'The border arithmetic (x_begin, x_end) is easy to get wrong and is now correctness-critical; the shifted-slice form is harder to read than the loops it replaced.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'accumulate_shifted and epilogue sit in the innermost path, and inlining lets the compiler fuse them into the surrounding loops.',
            tradeoff: 'Inlining grows code size and can hurt instruction-cache behaviour; the hint is only a request, and release-mode inlining usually decides well without it.',
          },
        ],
        libraryName: 'rayon',
        profile: 'One pass per output plane across cores, no BatchNorm layer, no separate add or ReLU tensor. Illustrative, not a measured benchmark.',
      },
    },
  },
};
