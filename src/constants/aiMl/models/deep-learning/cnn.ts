import type { AiMlModel } from '../../types';

export const CNN: AiMlModel = {
  slug: 'cnn',
  name: 'Convolutional Neural Network',
  aliases: ['CNN', 'ConvNet'],
  category: 'deep-learning',
  group: 'spatial',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression', 'sequence-modeling', 'anomaly-detection'],
  architecture: 'convolutional',

  intuition:
    'Slide a small learned filter across the input and record how strongly it responds at each position. Two assumptions are baked into that operation and they are the whole reason it works: nearby inputs are related (locality), and a feature worth detecting in one place is worth detecting everywhere (translation equivariance, via weight sharing). Stack these layers and the receptive field widens, so early layers see edges and later ones see objects.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '(\\mathbf{x} * \\mathbf{w})_{ij} = \\sum_{u}\\sum_{v} \\mathbf{x}_{i+u,\\, j+v}\\,\\mathbf{w}_{u,v}, \\qquad J(\\theta) = \\frac{1}{n}\\sum_{i=1}^{n} \\ell\\bigl(f_\\theta(\\mathbf{x}_i), y_i\\bigr)',
      symbols: [
        { symbol: '\\mathbf{w}', meaning: 'the kernel — a small weight patch shared across every position' },
        { symbol: 'u, v', meaning: 'offsets within the kernel window' },
        { symbol: '\\ell', meaning: 'the task loss — cross-entropy for classification, IoU-based for detection' },
        { symbol: 'f_\\theta', meaning: 'the stacked convolution/nonlinearity/pooling composition' },
      ],
    },
    reading:
      'The loss is ordinary — cross-entropy or squared error, nothing architecture-specific. What is specific is the parameterization: the same kernel weights are reused at every spatial position, so a layer has O(k²·C) parameters rather than O(H·W·C) as a dense layer would. That reduction is why a CNN needs orders of magnitude less data than an unconstrained network to reach the same accuracy on images.',
  },

  optimization: {
    method: 'Backpropagation with SGD-momentum or AdamW, plus batch normalization and augmentation',
    updateRule: {
      formula:
        '\\frac{\\partial J}{\\partial \\mathbf{w}_{u,v}} = \\sum_{i}\\sum_{j} \\frac{\\partial J}{\\partial (\\mathbf{x} * \\mathbf{w})_{ij}} \\cdot \\mathbf{x}_{i+u,\\, j+v}',
      symbols: [
        { symbol: '\\sum_i \\sum_j', meaning: 'the gradient for one kernel weight sums over EVERY position it was applied at' },
        { symbol: '\\mathbf{w}_{u,v}', meaning: 'a single shared kernel weight' },
      ],
    },
    rationale:
      'Weight sharing shows up in the backward pass as a sum: because one kernel weight touched every spatial position, its gradient accumulates contributions from all of them. That makes gradients for convolutional layers unusually well-conditioned — they are averages over many positions — which is part of why CNNs train stably at depths that would break a dense network. Batch normalization does the rest, by keeping activation statistics stable so the effective learning rate does not drift layer to layer. Augmentation is not optional polish here: flips, crops and colour jitter are how the translation prior gets extended to scale and rotation, which convolution does not give you for free.',
    hyperparameters: [
      { name: 'kernel size', role: 'Receptive field per layer; 3x3 stacked is near-universally preferred to one large kernel', typicalRange: '3x3, occasionally 7x7 at the stem' },
      { name: 'stride / pooling', role: 'How fast spatial resolution is traded for channel depth', typicalRange: 'stride 1-2, 2x2 pooling' },
      { name: 'channel width', role: 'Feature capacity per layer; typically doubles as resolution halves', typicalRange: '32 to 512' },
      { name: 'learning rate + schedule', role: 'Cosine or step decay; warmup matters at large batch', typicalRange: '1e-3 AdamW, 1e-1 SGD-momentum' },
      { name: 'augmentation strength', role: 'The main regularizer, and the way non-translation invariances are taught', typicalRange: 'flip, crop, colour jitter, mixup' },
    ],
    convergence:
      'Non-convex, and reliably trainable — residual connections and normalization made depth a non-issue. The characteristic failures are about data rather than optimization. Overfitting on small datasets is the common one, and the fix is almost always transfer from a pretrained backbone rather than a bigger model. The subtler failure is shortcut learning: the network latches onto a spurious correlate — a watermark, a background texture, a hospital scanner artifact — that separates the classes perfectly in training and does not exist in deployment. Aggregate accuracy hides it completely, which is why slice metrics are mandatory rather than advisable.',
    complexity:
      'O(H · W · C_in · C_out · k²) per convolutional layer, forward and backward. Memory is dominated by stored activations, not weights, which is why batch size is usually what exhausts the GPU first.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'Apply 1-D convolutions along the time axis with causal padding, so no filter can see past the prediction point. Dilate the kernels across layers and the receptive field grows exponentially with depth, which is how a small stack covers a long history.',
        where: [
          'Multivariate sensor forecasting where cross-channel patterns matter',
          'High-frequency series where an RNN\'s sequential recurrence is too slow to train',
        ],
        why: 'The genuine advantage over recurrence is parallelism: every timestep is computed simultaneously rather than one after another, so training is dramatically faster on long series. The genuine limitation is that the receptive field is fixed by architecture — a dependency longer than the dilated stack covers is simply invisible, whereas an LSTM at least has a chance of carrying it.',
        featurization: [
          'Causal padding is mandatory — symmetric padding leaks the future into the present',
          'Scale per series before windowing so one high-volume channel does not dominate',
          'Choose dilation rates so the receptive field covers at least one full seasonal cycle',
        ],
        evaluation:
          'Rolling-origin backtesting scored with MASE against seasonal naive. Verify the receptive field actually spans the dependency you believe matters.',
        pitfalls: [
          'Non-causal padding silently leaks future values and produces spectacular validation scores',
          'A receptive field shorter than the seasonal period makes the model structurally blind to seasonality',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Two routes. Convolutional autoencoders reconstruct normal inputs and flag high reconstruction error. Or a supervised detector, when defect labels exist, with heavy class weighting.',
        where: [
          'Manufacturing surface-defect detection on production lines',
          'Medical imaging screening against a healthy-population baseline',
          '1-D convolutional detectors over sensor windows in predictive maintenance',
        ],
        why: 'The convolutional prior is what makes this work on spatial data: a defect is a local pattern that can appear anywhere, which is exactly the structure weight sharing encodes. The catch is the same as every reconstruction-based detector — a sufficiently expressive network learns to reconstruct defects too, so the bottleneck has to be constrained deliberately.',
        featurization: [
          'Train exclusively on confirmed-normal images, or the model learns the defect as normal',
          'Constrain the bottleneck — capacity IS the detector in the autoencoder route',
          'Score on patch-level error rather than whole-image, so a small defect is not averaged away',
        ],
        evaluation:
          'Precision@k against confirmed defects, with the threshold from reconstruction-error quantiles on a clean holdout. Slice by product variant and lighting condition.',
        pitfalls: [
          'Too much capacity reconstructs defects perfectly and the detector goes blind',
          'Camera or lighting changes shift the input distribution and invalidate the threshold overnight',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'A CNN is a perception component: it maps a signal to a semantic reading and has no notion of a decision variable, a constraint, or a feasible region. It regularly sits upstream of an optimizer — a defect classifier feeding a routing decision — but the convolution itself optimizes nothing about the world, only its own parameters.',
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'A pretrained backbone plus a task head: a linear layer for classification, an FPN plus bounding-box regression for detection, a decoder for segmentation. Fine-tune the whole stack or freeze the backbone depending on how much labelled data exists.',
        where: [
          'Image classification and quality inspection',
          'Object detection with IoU-based box regression',
          'Semantic and instance segmentation',
        ],
        why: 'The convolutional prior matches image structure exactly, which is why CNNs need far less data than an unconstrained network for the same accuracy. Vision Transformers overtake them at very large scale — where enough data exists to learn the spatial prior rather than assume it — but at ordinary dataset sizes the built-in prior still wins, and transfer from a pretrained backbone usually removes the data problem entirely.',
        featurization: [
          'Normalize with the pretrained backbone\'s own statistics, not your dataset\'s',
          'Augmentation supplies the invariances convolution does not give free — scale, rotation, colour',
          'Keep preprocessing versioned with the model; a resize-interpolation change silently degrades accuracy',
        ],
        evaluation:
          'Top-k for classification, mAP for detection, IoU for segmentation — always sliced by lighting, pose, and demographic. Aggregate accuracy reliably hides the failure that matters.',
        pitfalls: [
          'Shortcut learning on a spurious correlate that will not exist in deployment',
          'Train/serve preprocessing mismatch, which is the most common silent accuracy loss in production vision',
        ],
      },
      'natural-language': {
        fit: 'adapted',
        how: '1-D convolutions over token embeddings act as learned n-gram detectors, with max-pooling selecting the strongest activation regardless of position.',
        where: [
          'Sentence classification where local phrase patterns carry the signal',
          'Latency-constrained text classification where a transformer is too slow',
        ],
        why: 'Fast and surprisingly competitive on short-text classification, because sentiment and intent often hinge on local phrases a filter can catch. Superseded for anything needing long-range dependency or pretraining transfer, which is most modern NLP.',
        featurization: [
          'Multiple kernel widths in parallel to capture different n-gram lengths',
          'Max-over-time pooling so position does not matter for the classification decision',
        ],
        evaluation: 'Macro-F1 against a fine-tuned encoder baseline, so the accuracy-for-latency trade is explicit.',
        pitfalls: [
          'A fixed receptive field cannot capture long-range agreement or discourse structure',
          'No pretraining transfer means it needs far more labelled data than a fine-tuned encoder',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours to days on GPU from scratch; minutes to hours fine-tuning a pretrained backbone — which is why almost nobody trains from scratch any more.',
    inferenceProfile:
      'Milliseconds on GPU, tens of milliseconds on CPU. Quantization to int8 and distillation bring modern architectures within edge-device budgets.',
    retrainingCadence:
      'Quarterly, or whenever the capture pipeline changes. A new camera model or lighting rig is a bigger trigger than elapsed time.',
    driftAndMonitoring: [
      'Monitor input distribution — camera, lighting and lens changes are the usual cause of silent degradation',
      'Track per-slice accuracy, since aggregate metrics hide subgroup failures completely',
      'Watch prediction-confidence distribution; a shift often precedes a measurable accuracy drop',
    ],
    productionGotchas: [
      'Preprocessing must be versioned with the model — resize interpolation and normalization constants change predictions',
      'Training-time augmentation must be off at inference, and forgetting this is a classic silent bug',
      'Batch-norm layers behave differently in train and eval mode; leaving the model in train mode corrupts inference',
    ],
  },

  assumptions: [
    'The input has a spatial or temporal grid structure where nearby elements are related',
    'A feature worth detecting is worth detecting anywhere in the input — translation equivariance holds',
    'Enough labelled data exists, or a pretrained backbone in a compatible domain does',
    'Deployment inputs come from the same capture pipeline as training inputs',
  ],

  pros: [
    {
      point: 'The structural prior makes it dramatically data-efficient for grid data',
      context:
        'Weight sharing gives orders of magnitude fewer parameters than a dense layer for the same receptive field. Decisive at ordinary dataset sizes; the advantage narrows once data is abundant enough for a transformer to learn the prior instead.',
    },
    {
      point: 'Transfer learning from pretrained backbones is extremely effective',
      context:
        'Usually removes the data problem entirely — a few thousand labelled images on a frozen backbone often beats a from-scratch model on a hundred thousand.',
    },
    {
      point: 'Fully parallel across spatial positions',
      context:
        'Unlike recurrence, every position computes simultaneously. This is what makes 1-D CNNs an attractive alternative to LSTMs on long sequences.',
    },
    {
      point: 'Mature deployment path to edge hardware',
      context:
        'Quantization, pruning and distillation are well-trodden for convolutions specifically, with hardware acceleration widely available.',
    },
  ],

  cons: [
    {
      point: 'Fixed receptive field bounds what it can see',
      context:
        'A dependency longer than the stack covers is structurally invisible. On images this rarely bites; on long sequences it is the reason to prefer attention.',
    },
    {
      point: 'Only translation equivariance comes free',
      context:
        'Rotation, scale and viewpoint invariance must be taught through augmentation. A model that never saw rotated examples will fail on them, confidently.',
    },
    {
      point: 'Prone to shortcut learning',
      context:
        'Latches onto spurious correlates — watermarks, backgrounds, scanner artifacts — that separate classes in training and vanish in deployment. Aggregate accuracy will not reveal it.',
    },
    {
      point: 'Effectively opaque',
      context:
        'Saliency maps are suggestive rather than explanatory. Disqualifying wherever a decision must come with a defensible reason.',
    },
  ],

  relatedSlugs: ['lstm', 'autoencoder'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""2-D convolution and a forward pass - the operation, written out.

Four nested loops: output position (i, j), then kernel offset (u, v). This is
literally the sum in the equation above.
"""


def conv2d(image, kernel, stride=1):
    """Single-channel valid convolution. image[h][w], kernel[kh][kw]."""
    h, w = len(image), len(image[0])
    kh, kw = len(kernel), len(kernel[0])
    out_h = (h - kh) // stride + 1
    out_w = (w - kw) // stride + 1

    output = [[0.0] * out_w for _ in range(out_h)]

    for i in range(out_h):
        for j in range(out_w):
            total = 0.0
            # The SAME kernel weights are used at every (i, j) - that reuse is
            # weight sharing, and it is the entire point of the architecture.
            for u in range(kh):
                for v in range(kw):
                    total += image[i * stride + u][j * stride + v] * kernel[u][v]
            output[i][j] = total

    return output


def relu(feature_map):
    return [[max(0.0, v) for v in row] for row in feature_map]


def max_pool(feature_map, size=2):
    """Downsample by taking the strongest activation in each window."""
    h, w = len(feature_map), len(feature_map[0])
    out = [[0.0] * (w // size) for _ in range(h // size)]

    for i in range(h // size):
        for j in range(w // size):
            window = [
                feature_map[i * size + u][j * size + v]
                for u in range(size)
                for v in range(size)
            ]
            out[i][j] = max(window)

    return out


def forward(image, kernels):
    """Conv -> ReLU -> pool, once per kernel. Receptive field widens with depth."""
    return [max_pool(relu(conv2d(image, k))) for k in kernels]`,
        profile: 'O(H·W·k²) per kernel in pure Python — thousands of times slower than a real implementation.',
      },
      'make-it-right': {
        code: `"""CNN - typed, validated, with the train/eval distinction made explicit."""

from dataclasses import dataclass

import torch
from torch import Tensor, nn


@dataclass(frozen=True)
class CnnConfig:
    in_channels: int = 3
    num_classes: int = 10
    base_width: int = 32
    depth: int = 3
    dropout: float = 0.1


class ConvBlock(nn.Module):
    """Conv -> BatchNorm -> ReLU, the standard unit.

    Bias is disabled on the convolution because BatchNorm immediately
    re-centres the activations - the bias term would be learned and then
    subtracted away, wasting parameters and slightly hurting conditioning.
    """

    def __init__(self, in_ch: int, out_ch: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: Tensor) -> Tensor:
        return self.block(x)


class SimpleCnn(nn.Module):
    def __init__(self, config: CnnConfig) -> None:
        super().__init__()
        if config.depth < 1:
            raise ValueError(f"depth must be >= 1, got {config.depth}")
        if not 0.0 <= config.dropout < 1.0:
            raise ValueError(f"dropout must be in [0, 1), got {config.dropout}")

        layers: list[nn.Module] = []
        in_ch = config.in_channels
        width = config.base_width

        for _ in range(config.depth):
            layers.append(ConvBlock(in_ch, width))
            layers.append(nn.MaxPool2d(2))
            in_ch = width
            width *= 2      # channels double as resolution halves

        self.features = nn.Sequential(*layers)
        # Adaptive pooling makes the head independent of input resolution -
        # a fixed Linear would break the moment the image size changed.
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.head = nn.Sequential(
            nn.Dropout(config.dropout),
            nn.Linear(in_ch, config.num_classes),
        )

    def forward(self, x: Tensor) -> Tensor:
        if x.dim() != 4:
            raise ValueError(f"expected (batch, channels, height, width), got {tuple(x.shape)}")
        features = self.pool(self.features(x)).flatten(1)
        return self.head(features)


@torch.no_grad()
def evaluate(model: nn.Module, loader, device: str) -> float:
    """Accuracy on a loader.

    model.eval() is not cosmetic: it switches BatchNorm from batch statistics
    to running averages and disables Dropout. Evaluating in train mode gives
    wrong and batch-size-dependent results.
    """
    model.eval()
    correct = total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        predictions = model(images).argmax(dim=1)
        correct += int((predictions == labels).sum())
        total += labels.numel()

    return correct / max(total, 1)`,
        rationale:
          'The hand-rolled loops become framework modules with fused conv/norm/activation blocks. Three things that silently break CNNs in production are handled explicitly: bias is disabled where BatchNorm follows, adaptive pooling makes the head resolution-independent, and eval mode is enforced in the evaluation path — leaving BatchNorm in train mode produces batch-size-dependent results that look almost right.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'O(H·W·C_in·C_out·k²) per layer, on fused cuDNN kernels.',
      },
      'make-it-fast': {
        code: `"""CNN - channels-last, mixed precision, fused conv-bn for inference."""

import torch
from torch import Tensor, nn


def prepare_for_training(model: nn.Module, device: str) -> nn.Module:
    """channels_last + bfloat16 autocast.

    Tensor cores want NHWC. PyTorch defaults to NCHW, so cuDNN inserts a
    transpose before every convolution; converting once up front removes that
    transpose from every layer of every step.
    """
    model = model.to(device, memory_format=torch.channels_last)
    return model


def train_epoch(model: nn.Module, optimizer, loader, device: str) -> float:
    model.train()
    scaler = torch.amp.GradScaler(device)
    total_loss = 0.0

    for images, labels in loader:
        # non_blocking with pinned memory overlaps the host-to-device copy
        # with compute, so the GPU is not idling between batches.
        images = images.to(device, non_blocking=True, memory_format=torch.channels_last)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        with torch.autocast(device_type=device, dtype=torch.bfloat16):
            loss = nn.functional.cross_entropy(model(images), labels)

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        total_loss += float(loss.item())

    return total_loss / max(len(loader), 1)


@torch.no_grad()
def fuse_conv_bn(conv: nn.Conv2d, bn: nn.BatchNorm2d) -> nn.Conv2d:
    """Fold BatchNorm into the preceding convolution for inference.

    At eval time BN is a fixed affine transform, so it can be folded into the
    conv weights algebraically:
        W' = W * gamma / sqrt(var + eps)
        b' = (b - mean) * gamma / sqrt(var + eps) + beta
    The result is numerically identical and removes an entire layer - both its
    kernel launch and its full pass over the activations - from every forward.
    """
    fused = nn.Conv2d(
        conv.in_channels, conv.out_channels, conv.kernel_size,
        conv.stride, conv.padding, bias=True,
    )

    scale = bn.weight / torch.sqrt(bn.running_var + bn.eps)
    fused.weight.copy_(conv.weight * scale.reshape(-1, 1, 1, 1))

    conv_bias = conv.bias if conv.bias is not None else torch.zeros(conv.out_channels)
    fused.bias.copy_((conv_bias - bn.running_mean) * scale + bn.bias)

    return fused`,
        rationale:
          'Three changes, all about hardware rather than the model. Tensors move to channels-last so cuDNN stops inserting a transpose before every convolution. Training runs under bfloat16 autocast with non-blocking pinned transfers so the GPU is not waiting on the host. And for inference, BatchNorm is algebraically folded into the preceding convolution — numerically identical, but it deletes an entire layer and its full pass over the activations from every forward.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'channels_last is the layout tensor cores actually want; without it cuDNN transposes NCHW to NHWC before every single convolution.',
            tradeoff: 'Any custom op in the model that assumes NCHW will silently transpose back, which can make the model slower rather than faster.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Folding BatchNorm into the convolution removes a whole layer\'s kernel launch and its full read/write of the activation tensor from every inference pass.',
            tradeoff: 'Only valid in eval mode with frozen statistics — fusing a model that will be fine-tuned further destroys the BatchNorm parameters.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'non_blocking transfers from pinned memory overlap the host-to-device copy with compute, so the input pipeline stops being the bottleneck.',
            tradeoff: 'Requires pinned host memory, which is a limited resource and can starve the rest of the system if over-allocated.',
          },
        ],
        libraryName: 'PyTorch (AMP)',
        profile: 'Roughly 2x step-time reduction; one fewer layer at inference. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// 2-D convolution - the operation, written out.
#include <algorithm>
#include <cstddef>
#include <vector>

// Single-channel valid convolution. image[h][w], kernel[kh][kw].
std::vector<std::vector<double>> Conv2d(
    const std::vector<std::vector<double>>& image,
    const std::vector<std::vector<double>>& kernel,
    std::size_t stride) {
  const std::size_t h = image.size();
  const std::size_t w = image[0].size();
  const std::size_t kh = kernel.size();
  const std::size_t kw = kernel[0].size();

  const std::size_t out_h = (h - kh) / stride + 1;
  const std::size_t out_w = (w - kw) / stride + 1;
  std::vector<std::vector<double>> output(out_h, std::vector<double>(out_w, 0.0));

  for (std::size_t i = 0; i < out_h; ++i) {
    for (std::size_t j = 0; j < out_w; ++j) {
      double total = 0.0;
      // The SAME kernel weights at every (i, j) - weight sharing, which is
      // the entire architectural idea.
      for (std::size_t u = 0; u < kh; ++u) {
        for (std::size_t v = 0; v < kw; ++v) {
          total += image[i * stride + u][j * stride + v] * kernel[u][v];
        }
      }
      output[i][j] = total;
    }
  }

  return output;
}

std::vector<std::vector<double>> MaxPool(
    const std::vector<std::vector<double>>& feature_map, std::size_t size) {
  const std::size_t out_h = feature_map.size() / size;
  const std::size_t out_w = feature_map[0].size() / size;
  std::vector<std::vector<double>> out(out_h, std::vector<double>(out_w, 0.0));

  for (std::size_t i = 0; i < out_h; ++i) {
    for (std::size_t j = 0; j < out_w; ++j) {
      double best = feature_map[i * size][j * size];
      for (std::size_t u = 0; u < size; ++u) {
        for (std::size_t v = 0; v < size; ++v) {
          best = std::max(best, feature_map[i * size + u][j * size + v]);
        }
      }
      out[i][j] = best;
    }
  }

  return out;
}`,
        profile: 'O(H·W·k²). Nested vectors scatter every row, so the kernel window misses cache on each step.',
      },
      'make-it-right': {
        code: `// Convolution - flat NCHW tensor, validated shapes, multi-channel.
#include <algorithm>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <vector>

// A tensor is one flat buffer plus its shape. Nested vectors scatter rows
// across the heap, which is exactly the wrong layout for a sliding window.
class Tensor {
 public:
  Tensor(std::size_t channels, std::size_t height, std::size_t width)
      : channels_(channels), height_(height), width_(width),
        data_(channels * height * width, 0.0f) {
    if (channels == 0 || height == 0 || width == 0) {
      throw std::invalid_argument("tensor dimensions must be non-zero");
    }
  }

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

 private:
  std::size_t channels_, height_, width_;
  std::vector<float> data_;   // owned; rule of zero handles the rest
};

class Conv2dLayer {
 public:
  // Weights are [out_ch][in_ch][kh][kw], flattened.
  Conv2dLayer(std::size_t in_channels, std::size_t out_channels, std::size_t kernel_size,
              std::vector<float> weights, std::vector<float> bias)
      : in_channels_(in_channels), out_channels_(out_channels), k_(kernel_size),
        weights_(std::move(weights)), bias_(std::move(bias)) {
    const std::size_t expected = out_channels * in_channels * kernel_size * kernel_size;
    if (weights_.size() != expected) {
      throw std::invalid_argument("weight buffer does not match [out][in][k][k]");
    }
    if (bias_.size() != out_channels) {
      throw std::invalid_argument("bias must have one entry per output channel");
    }
  }

  [[nodiscard]] Tensor Forward(const Tensor& input) const {
    if (input.channels() != in_channels_) {
      throw std::invalid_argument("input channel count does not match the layer");
    }

    const std::size_t out_h = input.height() - k_ + 1;
    const std::size_t out_w = input.width() - k_ + 1;
    Tensor output(out_channels_, out_h, out_w);

    for (std::size_t oc = 0; oc < out_channels_; ++oc) {
      for (std::size_t y = 0; y < out_h; ++y) {
        for (std::size_t x = 0; x < out_w; ++x) {
          float acc = bias_[oc];
          for (std::size_t ic = 0; ic < in_channels_; ++ic) {
            const float* kernel = weights_.data() + ((oc * in_channels_ + ic) * k_ * k_);
            for (std::size_t u = 0; u < k_; ++u) {
              for (std::size_t v = 0; v < k_; ++v) {
                acc += input.At(ic, y + u, x + v) * kernel[u * k_ + v];
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
  std::size_t in_channels_, out_channels_, k_;
  std::vector<float> weights_;
  std::vector<float> bias_;
};`,
        rationale:
          'The nested vectors become one flat NCHW buffer behind a Tensor type, which matters more here than almost anywhere else — a sliding window over heap-scattered rows misses cache on every step. Multi-channel support and shape validation are handled once at construction, and float32 replaces double since convolution is memory-bound and the extra precision buys nothing.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(C_out·C_in·H·W·k²), contiguous access, one allocation per output tensor.',
      },
      'make-it-fast': {
        code: `// Convolution - im2col + GEMM, the transformation that made CNNs practical.
#include <Eigen/Dense>
#include <cstddef>
#include <vector>

// The direct nested-loop convolution is memory-bound: it re-reads overlapping
// input patches and has no reuse the hardware can exploit. im2col unrolls each
// receptive field into a COLUMN, turning the whole convolution into one matrix
// multiply - which hands the work to a tuned BLAS kernel that is compute-bound
// and blocked for cache. This is how essentially every CNN framework does it.
Eigen::MatrixXf Im2Col(const float* input, std::size_t channels, std::size_t height,
                       std::size_t width, std::size_t k) {
  const std::size_t out_h = height - k + 1;
  const std::size_t out_w = width - k + 1;

  // [C*k*k rows] x [out_h*out_w columns]: one column per output position.
  Eigen::MatrixXf columns(channels * k * k, out_h * out_w);

  for (std::size_t c = 0; c < channels; ++c) {
    for (std::size_t u = 0; u < k; ++u) {
      for (std::size_t v = 0; v < k; ++v) {
        const std::size_t row = (c * k + u) * k + v;
        for (std::size_t y = 0; y < out_h; ++y) {
          for (std::size_t x = 0; x < out_w; ++x) {
            columns(static_cast<Eigen::Index>(row),
                    static_cast<Eigen::Index>(y * out_w + x)) =
                input[(c * height + y + u) * width + x + v];
          }
        }
      }
    }
  }

  return columns;
}

// Convolution as a single GEMM.
//   weights: [out_channels] x [C*k*k]
//   columns: [C*k*k] x [out_h*out_w]
//   result:  [out_channels] x [out_h*out_w]
Eigen::MatrixXf ConvolveGemm(const Eigen::MatrixXf& weights,
                             const Eigen::MatrixXf& columns,
                             const Eigen::VectorXf& bias) {
  // One matrix product plus a broadcast bias add, fused into one traversal.
  return (weights * columns).colwise() + bias;
}

// Fold BatchNorm into the convolution weights for inference. At eval time BN
// is a fixed affine map, so it can be absorbed algebraically - numerically
// identical, and it removes a full pass over the activations per layer.
void FuseBatchNorm(Eigen::MatrixXf& weights, Eigen::VectorXf& bias,
                   const Eigen::VectorXf& gamma, const Eigen::VectorXf& beta,
                   const Eigen::VectorXf& mean, const Eigen::VectorXf& variance,
                   float eps) {
  const Eigen::VectorXf scale = gamma.array() / (variance.array() + eps).sqrt();
  weights = weights.array().colwise() * scale.array();
  bias = (bias - mean).array() * scale.array() + beta.array();
}`,
        rationale:
          'The direct nested-loop convolution is replaced by im2col plus GEMM — unroll each receptive field into a column and the whole operation becomes one matrix multiply. That is the transformation that made CNNs practical: it converts a memory-bound loop with no exploitable reuse into a compute-bound blocked kernel. BatchNorm folding removes another full activation pass at inference.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'im2col reshapes convolution into GEMM, which dispatches to a blocked, cache-aware, multithreaded kernel — the single largest speedup available for convolution.',
            tradeoff: 'The column matrix duplicates every overlapping input patch, so memory grows by roughly k² — a real cost that is why cuDNN also ships direct and Winograd algorithms for cases where it does not pay.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The GEMM and the broadcast bias add compose into one traversal rather than materializing an intermediate result matrix.',
            tradeoff: 'Storing that expression in auto rather than a MatrixXf yields a dangling reference once the operands go out of scope.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Folding BatchNorm into the weights removes an entire layer\'s read and write of the activation tensor from every inference pass.',
            tradeoff: 'Valid only with frozen eval-mode statistics; fusing a model destined for further fine-tuning destroys its BatchNorm parameters.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'One GEMM per layer, k²-fold memory overhead for the column matrix. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! 2-D convolution - the operation, written out.

/// Single-channel valid convolution. image[h][w], kernel[kh][kw].
pub fn conv2d(image: &[Vec<f64>], kernel: &[Vec<f64>], stride: usize) -> Vec<Vec<f64>> {
    let h = image.len();
    let w = image[0].len();
    let kh = kernel.len();
    let kw = kernel[0].len();

    let out_h = (h - kh) / stride + 1;
    let out_w = (w - kw) / stride + 1;
    let mut output = vec![vec![0.0; out_w]; out_h];

    for i in 0..out_h {
        for j in 0..out_w {
            let mut total = 0.0;
            // The SAME kernel weights at every (i, j) - weight sharing, which
            // is the whole architectural idea.
            for u in 0..kh {
                for v in 0..kw {
                    total += image[i * stride + u][j * stride + v] * kernel[u][v];
                }
            }
            output[i][j] = total;
        }
    }

    output
}

pub fn relu(feature_map: &mut [Vec<f64>]) {
    for row in feature_map.iter_mut() {
        for value in row.iter_mut() {
            *value = value.max(0.0);
        }
    }
}

/// Downsample by taking the strongest activation in each window.
pub fn max_pool(feature_map: &[Vec<f64>], size: usize) -> Vec<Vec<f64>> {
    let out_h = feature_map.len() / size;
    let out_w = feature_map[0].len() / size;
    let mut out = vec![vec![0.0; out_w]; out_h];

    for i in 0..out_h {
        for j in 0..out_w {
            let mut best = f64::NEG_INFINITY;
            for u in 0..size {
                for v in 0..size {
                    best = best.max(feature_map[i * size + u][j * size + v]);
                }
            }
            out[i][j] = best;
        }
    }

    out
}`,
        profile: 'O(H·W·k²). Vec<Vec<f64>> scatters rows, so the sliding window misses cache; every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Convolution - flat NCHW tensor, typed errors, multi-channel.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum ConvError {
    ZeroDimension,
    WeightShape { expected: usize, found: usize },
    ChannelMismatch { expected: usize, found: usize },
    KernelLargerThanInput,
}

impl fmt::Display for ConvError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroDimension => write!(f, "tensor dimensions must be non-zero"),
            Self::WeightShape { expected, found } => {
                write!(f, "expected {expected} weights, found {found}")
            }
            Self::ChannelMismatch { expected, found } => {
                write!(f, "expected {expected} input channels, found {found}")
            }
            Self::KernelLargerThanInput => write!(f, "kernel is larger than the input"),
        }
    }
}

impl std::error::Error for ConvError {}

/// One flat NCHW buffer plus its shape. Nested Vecs scatter rows across the
/// heap, which is the worst possible layout for a sliding window.
pub struct Tensor {
    channels: usize,
    height: usize,
    width: usize,
    data: Vec<f32>,
}

impl Tensor {
    pub fn zeros(channels: usize, height: usize, width: usize) -> Result<Self, ConvError> {
        if channels == 0 || height == 0 || width == 0 {
            return Err(ConvError::ZeroDimension);
        }
        Ok(Self { channels, height, width, data: vec![0.0; channels * height * width] })
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

    #[must_use]
    pub fn shape(&self) -> (usize, usize, usize) {
        (self.channels, self.height, self.width)
    }
}

pub struct Conv2dLayer {
    in_channels: usize,
    out_channels: usize,
    k: usize,
    /// [out_ch][in_ch][k][k], flattened.
    weights: Vec<f32>,
    bias: Vec<f32>,
}

impl Conv2dLayer {
    pub fn new(
        in_channels: usize,
        out_channels: usize,
        k: usize,
        weights: Vec<f32>,
        bias: Vec<f32>,
    ) -> Result<Self, ConvError> {
        let expected = out_channels * in_channels * k * k;
        if weights.len() != expected {
            return Err(ConvError::WeightShape { expected, found: weights.len() });
        }
        if bias.len() != out_channels {
            return Err(ConvError::WeightShape { expected: out_channels, found: bias.len() });
        }
        Ok(Self { in_channels, out_channels, k, weights, bias })
    }

    pub fn forward(&self, input: &Tensor) -> Result<Tensor, ConvError> {
        let (channels, height, width) = input.shape();
        if channels != self.in_channels {
            return Err(ConvError::ChannelMismatch { expected: self.in_channels, found: channels });
        }
        if height < self.k || width < self.k {
            return Err(ConvError::KernelLargerThanInput);
        }

        let out_h = height - self.k + 1;
        let out_w = width - self.k + 1;
        let mut output = Tensor::zeros(self.out_channels, out_h, out_w)?;

        for oc in 0..self.out_channels {
            for y in 0..out_h {
                for x in 0..out_w {
                    let mut acc = self.bias[oc];
                    for ic in 0..self.in_channels {
                        let base = ((oc * self.in_channels + ic) * self.k) * self.k;
                        let kernel = &self.weights[base..base + self.k * self.k];
                        for u in 0..self.k {
                            for (v, &w) in kernel[u * self.k..(u + 1) * self.k].iter().enumerate() {
                                acc += input.at(ic, y + u, x + v) * w;
                            }
                        }
                    }
                    output.set(oc, y, x, acc);
                }
            }
        }

        Ok(output)
    }
}`,
        rationale:
          'The nested Vecs become one flat NCHW buffer behind a Tensor type — the layout matters more for convolution than almost anywhere else, since a sliding window over heap-scattered rows misses cache on every step. Shape failures become a typed Result validated at construction, and f32 replaces f64 because convolution is memory-bound and the precision buys nothing.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(C_out·C_in·H·W·k²), contiguous access, one allocation for the output.',
      },
      'make-it-fast': {
        code: `//! Convolution - im2col + parallel GEMM over output channels.

use rayon::prelude::*;

/// Unroll each receptive field into a column, turning convolution into a
/// matrix multiply.
///
/// The direct loop is memory-bound: it re-reads overlapping patches with no
/// reuse the hardware can exploit. im2col trades k²-fold memory for a dense
/// GEMM that is compute-bound and cache-blocked - the transformation that made
/// CNNs practical, and what essentially every framework does internally.
#[must_use]
pub fn im2col(input: &[f32], channels: usize, height: usize, width: usize, k: usize) -> Vec<f32> {
    let out_h = height - k + 1;
    let out_w = width - k + 1;
    let rows = channels * k * k;
    let cols = out_h * out_w;

    // Exact capacity up front - this buffer is large and reallocating it
    // mid-fill would copy megabytes.
    let mut columns = vec![0.0_f32; rows * cols];

    for c in 0..channels {
        for u in 0..k {
            for v in 0..k {
                let row = (c * k + u) * k + v;
                for y in 0..out_h {
                    let src = (c * height + y + u) * width + v;
                    let dst = row * cols + y * out_w;
                    // Row-at-a-time copy: source and destination are both
                    // contiguous runs, so this is a memcpy-shaped loop the
                    // compiler vectorizes.
                    columns[dst..dst + out_w]
                        .copy_from_slice(&input[src..src + out_w]);
                }
            }
        }
    }

    columns
}

/// GEMM: weights [out_ch x rows] times columns [rows x cols].
///
/// Output channels are independent, which makes them the natural parallel
/// axis - each worker owns one output row and there is no reduction at all.
pub fn conv_gemm(
    weights: &[f32],
    columns: &[f32],
    bias: &[f32],
    out_channels: usize,
    rows: usize,
    cols: usize,
) -> Vec<f32> {
    let mut output = vec![0.0_f32; out_channels * cols];

    output
        .par_chunks_exact_mut(cols)
        .enumerate()
        .for_each(|(oc, out_row)| {
            let weight_row = &weights[oc * rows..(oc + 1) * rows];
            out_row.fill(bias[oc]);

            // Accumulate one rank-1 update at a time. Iterating k in the outer
            // loop keeps the inner loop a contiguous scaled add over both
            // slices, which vectorizes cleanly.
            for (r, &w) in weight_row.iter().enumerate() {
                if w == 0.0 {
                    continue;
                }
                let col_row = &columns[r * cols..(r + 1) * cols];
                for (o, &c) in out_row.iter_mut().zip(col_row) {
                    *o += w * c;
                }
            }
        });

    output
}`,
        rationale:
          'The direct nested-loop convolution becomes im2col plus GEMM, trading k²-fold memory for a dense matrix multiply that the hardware can actually exploit. The im2col fill copies row-at-a-time between contiguous runs so it vectorizes, and the GEMM parallelizes over output channels — the natural axis, since each worker owns one output row and no reduction is needed.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Output channels are fully independent, so each worker owns one output row exclusively — no shared state, no reduction, no synchronization.',
            tradeoff: 'Every worker streams the entire column matrix, so at high core counts memory bandwidth becomes the limit rather than compute.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The rank-1 accumulation loop walks two contiguous slices, which the compiler vectorizes; a strided access pattern would not.',
            tradeoff: 'Requires the k²-fold column expansion first, which is real memory and real copy time before any arithmetic happens.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The column buffer is large and sized exactly up front; growing it mid-fill would copy megabytes repeatedly.',
            tradeoff: 'Peak memory spikes to the full expanded size even for a layer that could have streamed patch by patch.',
          },
        ],
        libraryName: 'rayon',
        profile: 'One GEMM per layer across cores, k²-fold column memory. Illustrative, not a measured benchmark.',
      },
    },
  },
};
