import type { AiMlModel } from '../../types';

/**
 * U-Net — the convolutional network that predicts a label for every pixel.
 *
 * Included because it is the canonical dense-prediction architecture and the
 * place where two ideas meet that the rest of the section treats separately:
 * the skip connection (here concatenated, where ResNet adds) and a set-overlap
 * similarity (Dice / Jaccard) used as the training objective rather than only
 * as an evaluation metric. It is also the denoiser backbone inside DDPM.
 */
export const U_NET: AiMlModel = {
  slug: 'u-net',
  name: 'U-Net',
  aliases: ['U-Net', 'Encoder-decoder segmentation', 'Semantic segmentation network'],
  category: 'deep-learning',
  group: 'spatial',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'generation', 'anomaly-detection'],
  architecture: 'convolutional',
  paradigmNote:
    'Supervised with dense labels: every pixel carries its own target, so one image yields hundreds of thousands of supervised terms. "Classification" here means per-pixel classification. "Generation" applies only when the U-Net is used as the denoiser inside a diffusion model, where the network itself is not generative and the sampling loop around it is.',

  intuition:
    'Downsampling is how a network learns WHAT is in an image, and it is exactly what destroys WHERE it is. A U-Net refuses to choose. A contracting path (convolution, then downsample, repeated) trades resolution for context until the bottleneck sees the whole scene. An expanding path (upsample, then convolution) climbs back to input resolution. And at every scale the encoder feature map is CONCATENATED onto the decoder feature map, handing the decoder the fine spatial detail the pooling threw away, so it only has to decide what each pixel is rather than reconstruct where the boundary was. The output is a class distribution at every pixel, which is why it is called dense prediction. Concatenation is the point: ResNet adds its skip, which forces the two sources to share channels and be summed blindly, whereas a U-Net stacks them and lets the next convolution learn how much of each to trust.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = -\\frac{1}{N}\\sum_{p=1}^{N}\\sum_{c=1}^{C} y_{p,c}\\log\\hat{y}_{p,c} \\;+\\; \\lambda\\Bigl(1 - \\frac{1}{C}\\sum_{c=1}^{C} D_c\\Bigr), \\qquad D_c = \\frac{2\\sum_{p}\\hat{y}_{p,c}\\,y_{p,c} + \\varepsilon}{\\sum_{p}\\hat{y}_{p,c} + \\sum_{p} y_{p,c} + \\varepsilon}, \\qquad \\mathrm{IoU}_c = \\frac{D_c}{2 - D_c}',
      symbols: [
        { symbol: 'p', meaning: 'a pixel (or voxel) index; N is the number of pixels in the batch' },
        { symbol: 'y_{p,c},\\ \\hat{y}_{p,c}', meaning: 'ground-truth one-hot label and predicted softmax probability of class c at pixel p' },
        { symbol: 'D_c', meaning: 'soft Dice coefficient for class c: twice the overlap, divided by the total mass of prediction and truth' },
        { symbol: '\\lambda', meaning: 'weight on the Dice term relative to cross-entropy; 1 is the common starting point' },
        { symbol: '\\varepsilon', meaning: 'smoothing constant so a class absent from both prediction and truth scores 1 instead of 0/0' },
        { symbol: '\\mathrm{IoU}_c', meaning: 'Intersection-over-Union (Jaccard) for class c, recoverable from Dice as D/(2 - D); the evaluation metric' },
      ],
    },
    reading:
      'Two terms, and the second exists because the first is blind to the thing that matters. Pixel-wise cross-entropy averages over every pixel, so on a scan where a tumour is 2% of the image the average is governed by the 98% background. Predicting "background everywhere" scores 98% pixel accuracy, a cross-entropy near 0.1 nats, and a Dice and IoU of exactly zero. The Dice term fixes that by being a SET-OVERLAP similarity: treat the predicted mask A and the true mask B as sets of pixels and measure 2|A∩B| / (|A|+|B|). It is normalised by the size of the foreground, so a small lesion carries the same weight as a large one and the all-background solution is no longer a plateau. Dice is the same family as Jaccard (IoU = |A∩B| / |A∪B|), related exactly by J = D / (2 − D); they rank a single prediction identically and differ only in how they weight errors and aggregate across images. On the soft probabilities used in training, the intersection becomes a sum of products, which is a relaxation rather than the real set quantity. For binary masks Dice also equals 2⟨a,b⟩ / (‖a‖² + ‖b‖²), which is bounded above by cosine similarity, so it is stricter than cosine about size mismatch. Swap it for plain pixel accuracy or mean squared error and the model collapses to background; swap it for IoU as an evaluation metric and nothing changes in the ranking, only in the numbers. Cross-entropy stays in the mix because Dice gives noisy gradients early in training, when predictions are near uniform, while cross-entropy supplies a smooth per-pixel signal.',
  },

  optimization: {
    method: 'Backpropagation with SGD-momentum or AdamW on the combined cross-entropy and Dice loss, with heavy elastic-deformation augmentation',
    updateRule: {
      formula:
        'v_{t+1} = \\mu\\,v_t - \\eta\\,\\nabla_\\theta \\mathcal{L}(\\theta_t), \\quad \\theta_{t+1} = \\theta_t + v_{t+1}, \\qquad \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{e}_\\ell} = \\underbrace{\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{e}_\\ell}\\bigg|_{\\text{skip}}}_{\\text{direct from decoder}} + \\underbrace{\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{e}_\\ell}\\bigg|_{\\text{down}}}_{\\text{through the bottleneck}}',
      symbols: [
        { symbol: 'v,\\ \\mu', meaning: 'momentum buffer and its decay; the original U-Net used a high momentum of 0.99 with very small batches' },
        { symbol: '\\eta', meaning: 'learning rate' },
        { symbol: '\\mathbf{e}_\\ell', meaning: 'the encoder feature map at level \\ell, which feeds two consumers: the next downsampling step and the concatenation into the decoder' },
        { symbol: '|_{\\text{skip}},\\ |_{\\text{down}}', meaning: 'the two gradient routes into the same encoder activation; the skip route is short, so early layers get a strong direct signal' },
      ],
    },
    rationale:
      'The optimizer is ordinary; what is distinctive is the gradient topology. Every encoder activation has two consumers, so its gradient is the sum of a short route (straight from the decoder level at the same scale) and a long route (down through the bottleneck and back up). That short route is why a U-Net trains stably without residual blocks and why early layers learn fast: they are one concatenation away from the loss. Momentum SGD with a small batch was the original recipe because a single large tile already fills memory; modern practice is AdamW or SGD with a polynomial learning-rate decay. Augmentation is not polish here, it is the method: the original paper trained on about thirty annotated images by applying random elastic deformations, which teach the network the shape variation of soft tissue, so the data-efficiency claim rests on the augmentation as much as on the architecture. The loss also carries a design choice: Dice is computed over the batch (pooled) rather than per image, because a per-image Dice on an image with no foreground is 0/0 and its gradient is unbounded as the foreground mass goes to zero. Differentiating Dice gives ∂D/∂ŷᵢ = 2yᵢ/S − 2I/S² with S the total mass, which makes the instability visible: it scales like 1/S.',
    hyperparameters: [
      { name: 'depth (number of downsamplings)', role: 'Sets the receptive field at the bottleneck and the divisibility the input size must satisfy (2 to the depth)', typicalRange: '3 to 5' },
      { name: 'base width', role: 'Channels at full resolution; doubles at each downsampling, so it sets parameter count and memory', typicalRange: '16 to 64' },
      { name: 'Dice weight λ', role: 'Balances overlap against per-pixel cross-entropy', typicalRange: '0.5 to 1.0 (often equal weights)' },
      { name: 'normalisation layer', role: 'BatchNorm is fine at batch 8 or more; at batch 1 to 2 (common for 3-D volumes) use GroupNorm or InstanceNorm', typicalRange: 'BatchNorm, GroupNorm(8-32 groups), InstanceNorm' },
      { name: 'patch / tile size and overlap', role: 'Training crop and inference window; bounds memory and the context available at a tile edge', typicalRange: '256x256 to 512x512 in 2-D, 128^3 in 3-D' },
      { name: 'augmentation', role: 'Elastic deformation, flips, rotations, intensity and contrast jitter; the main defence against overfitting a small labelled set', typicalRange: 'elastic, flip, rotate, intensity' },
      { name: 'learning rate + schedule', role: 'Polynomial or cosine decay', typicalRange: '1e-3 AdamW, 1e-2 SGD-momentum' },
    ],
    convergence:
      'Non-convex but reliably trainable. The characteristic failure is the trivial plateau: with severe class imbalance and cross-entropy alone, the network settles into predicting background everywhere, which is a real local minimum rather than a bug, and adding a Dice term (or class weights, or foreground-biased crop sampling) is what escapes it. The second failure is Dice instability on tiny or empty targets, where the gradient scales like the reciprocal of the foreground mass and a few pixels can swing a step. The third is overfitting a small labelled set, which augmentation and a pretrained encoder address and a bigger decoder does not. A subtler one is label noise at the boundary: annotators disagree by a pixel or two along an edge, so Dice has a ceiling well below 1 on thin structures, and chasing it overfits the annotator.',
    complexity:
      'O(H · W · C0² · k²) per level, and, perhaps surprisingly, roughly equal at every level: resolution falls by 4x while channels double, so the squared channel count grows by 4x and the two cancel. Total compute is therefore about depth times the full-resolution cost. Memory is the binding constraint: the encoder activations must be held until the decoder consumes them through the skip, and the full-resolution levels dominate, which is why tile size, not parameter count, is what exhausts the GPU. The original 64-to-1024 channel network is on the order of 30 million parameters.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Only for gridded spatio-temporal fields, never for a scalar series. Stack the last several frames (radar reflectivity, for example) as input channels, and train the U-Net to emit the next frame or a few future frames as output channels. Time is flattened into the channel axis, so the network has no recurrence and no notion of the order of its inputs beyond what the channel position encodes.',
        where: [
          'Radar-based precipitation nowcasting, where U-Net-style networks predict the next hour of rainfall maps',
          'Sea-ice, cloud and other satellite-derived field forecasting on regular grids',
        ],
        why: 'It is adapted rather than viable because the problem is reshaped to fit the tool. The strengths carry over: the spatial prior suits fields where weather moves and deforms locally, and the multi-scale structure captures both small cells and large fronts. The limits are just as real. A U-Net sees a fixed window of frames, so it cannot extrapolate beyond what that window encodes, it has no mechanism for chaotic growth of uncertainty, and trained with a pixel-wise loss it predicts the conditional mean, which blurs: a sharp but misplaced storm is penalised more than a smooth smear, so forecasts get smoother with lead time. For a univariate or low-dimensional series, an N-BEATS, TCN or gradient-boosted model is simply the right tool and this is the wrong one.',
        featurization: [
          'Stack past frames along the channel axis in strict time order and keep the stacking order identical at train and serve time',
          'Normalise the physical field per variable (rain rate is heavy-tailed; log or Box-Cox transform it before scaling)',
          'Crop or tile large domains with enough overlap that the receptive field at a tile edge is not starved of context',
        ],
        evaluation:
          'Rolling-origin evaluation by event date, never random frame splits (adjacent frames are nearly identical, so random splits leak). Score with a threshold-based skill measure such as critical success index at several rain-rate thresholds and a fractions skill score that tolerates small displacement, plus a persistence baseline (the last frame, advected) that the model must beat at every lead time.',
        pitfalls: [
          'Random frame-level splits leak near-duplicate neighbouring frames and produce spectacular, meaningless validation scores',
          'A pixel-wise loss yields blurry means at long lead times, which looks like skill under MSE and is useless for locating a storm',
          'Reaching for it on a one-dimensional series, where it adds an image architecture with no spatial structure to exploit',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Two routes with very different failure modes. The robust one is supervised: train the U-Net on pixel-level defect masks so its output IS an anomaly map, thresholded and cleaned into connected components. The tempting one is reconstruction: train on normal images only and read the pixel-wise residual as the anomaly map. A plain U-Net is a bad choice for the second route, because its skip connections let the decoder copy the input straight through and reconstruct defects perfectly, so the residual is near zero exactly where it should be large. The usable variants cut or constrain the skips, or train against SYNTHETIC defects pasted into normal images so the network is supervised on what an anomaly looks like without needing real ones.',
        where: [
          'Surface-defect segmentation on manufactured parts, with pixel masks marking scratches and dents',
          'Lesion and tumour segmentation in medical imaging, where the "anomaly" is the target class',
          'Satellite and aerial change or damage maps against a known baseline',
        ],
        why: 'The decisive advantage is localisation: the output is a mask, so a reviewer sees WHERE the defect is, and the multi-scale structure catches both a hairline crack and a broad stain. That is more useful than the single image-level score most detectors emit. The cost is that the supervised route needs pixel-level annotation, which is expensive and subjective at the edges, and the unsupervised route needs the skip-connection workaround above. If you only need "is this part defective", a classifier or an autoencoder score is cheaper; reach for a U-Net when the location or extent drives the downstream decision.',
        featurization: [
          'For the reconstruction route, remove or heavily dropout the highest-resolution skips, or train a denoising variant, so the bottleneck cannot be bypassed',
          'Synthesise training anomalies by pasting textured patches onto normal images and use the paste mask as the target',
          'Oversample crops that contain defect pixels; a uniformly sampled crop is almost always empty',
        ],
        evaluation:
          'Pixel-level AUROC is inflated by the sea of true negatives, so prefer per-region overlap (PRO / AUPRO) or Dice at a threshold chosen on a clean validation split, plus image-level detection recall at a fixed false-alarm rate. Slice by defect type and size, since a small scratch and a large stain are different problems.',
        pitfalls: [
          'A plain U-Net autoencoder reconstructs the defect through its skip connections and detects nothing',
          'Thresholding a residual map with a global constant, which breaks the moment lighting or texture shifts',
          'Pixel accuracy or pixel AUROC reported alone, both of which are dominated by the defect-free background',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'A U-Net is a perception component: it maps pixels to a per-pixel reading and has no decision variable, constraint or feasible region. It often sits upstream of an optimizer (a segmented field boundary feeding a path planner, a tumour mask feeding a radiotherapy dose plan), but the network itself optimizes nothing about the world, only its own weights.',
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'Semantic segmentation as the core use: feed an image, receive an H-by-W-by-C probability map, take the argmax. Instance segmentation needs an extra step (connected components, a watershed on a boundary class, or an instance head such as Mask R-CNN), because a per-pixel class cannot by itself separate two touching objects of the same class. The U-Net body also serves as the denoiser inside diffusion models: it receives the noisy image and a timestep embedding (injected into the residual blocks as a scale and shift) and returns a same-shaped noise estimate, an ideal fit because the output must be the same shape as the input at the same resolution. Attention blocks at the low-resolution levels and cross-attention for text conditioning are added there, and large-scale diffusion work is increasingly moving to transformer backbones.',
        where: [
          'Medical image segmentation (organs, tumours, vessels in CT and MRI), where a self-configuring U-Net remains the strong default baseline',
          'Cell and nucleus segmentation in microscopy, the original application',
          'Satellite and aerial imagery: building footprints, roads, flood extent, crop fields',
          'The denoising backbone of diffusion image generators, conditioned on timestep and text',
        ],
        why: 'It wins when labelled data is scarce and the output must be pixel-accurate. The skip connections make boundaries sharp without a large decoder, the translation-equivariant convolutions mean a feature learned in one place applies everywhere, and the whole thing is trainable on tens to hundreds of images because augmentation does the heavy lifting. It is the wrong choice when objects (not pixels) are the unit, in which case a detector is cheaper, and when the scene needs global reasoning across the entire image, where a transformer-based segmenter overtakes it given enough data. Self-configuring variants have repeatedly matched or beaten bespoke architectures on medical benchmarks, which is a reminder that preprocessing and training recipe matter more than the diagram.',
        featurization: [
          'Resample to a consistent pixel or voxel spacing and normalise intensity per image (CT in Hounsfield units, MRI per scan), because spacing and contrast are not comparable across scanners',
          'Pad the input to a multiple of 2 to the depth, then crop the prediction back, rather than cropping the input',
          'Sample training crops with a bias toward the foreground class so a rare structure appears in most batches',
          'Combine cross-entropy with Dice, and report both Dice and IoU per class rather than the average over classes',
        ],
        evaluation:
          'Per-class Dice and IoU on a held-out set split by PATIENT or scene, never by slice or tile (neighbouring slices are near duplicates). Add a boundary-sensitive measure such as Hausdorff distance, since Dice barely moves when a thin spur is missed. Report mean over images and the worst-decile images, because the mean hides the failure that matters.',
        pitfalls: [
          'Splitting by slice instead of by patient, which leaks anatomy between train and test and inflates Dice',
          'Pixel accuracy as the headline number on an imbalanced mask, which rewards predicting nothing',
          'Odd input sizes with floor-division pooling, which silently misalign the upsampled map against its skip',
          'Tile seams at inference when windows are stitched without overlap and blending',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Hours on a single GPU for a 2-D biomedical dataset of hundreds of images; days for large 3-D volumes. Memory rather than compute is the limit, so patch size, not model size, sets the budget. Pretrained encoders cut the time and the data needed substantially.',
    inferenceProfile:
      'Tens of milliseconds per 512x512 tile on GPU, seconds per large 3-D volume with overlapping sliding windows. Full-resolution activations and the held skip tensors dominate memory, so inference is windowed with overlap and Gaussian blending rather than run on the whole image.',
    retrainingCadence:
      'Whenever the acquisition changes: a new scanner, staining protocol, camera or sensor is a larger trigger than elapsed time. Re-evaluate on a freshly annotated sample from each new site before trusting a model that was validated elsewhere.',
    driftAndMonitoring: [
      'Track the predicted foreground fraction and the distribution of connected-component sizes; a shift is the cheapest early signal that the input distribution moved',
      'Monitor per-site and per-scanner Dice on a small recurring annotated audit set, since aggregate Dice hides a single failing source',
      'Watch the mean per-pixel entropy of the output, which rises on out-of-distribution inputs before accuracy visibly drops',
    ],
    productionGotchas: [
      'Resample to the training voxel or pixel spacing before inference; a model trained at one resolution silently degrades at another',
      'Window with overlap and blend with a Gaussian weight, otherwise predictions at tile edges (where context is missing) show as visible seams',
      'Input height and width must be a multiple of 2 to the depth, or padding and cropping must be handled explicitly, otherwise concatenation fails or misaligns by a pixel',
      'BatchNorm at a batch of 1 to 2 gives unstable statistics; use GroupNorm or InstanceNorm, and keep the model in eval mode when serving',
      'Dice on an image with an empty ground-truth mask is undefined; decide the convention (1 if the prediction is also empty) before comparing numbers across teams',
    ],
  },

  assumptions: [
    'Neighbouring pixels are related and a feature worth detecting in one place is worth detecting everywhere (translation equivariance)',
    'The target is a dense map aligned with the input grid, with labels at the same resolution',
    'Fine spatial detail from early layers is useful to the output, so passing it across the bottleneck helps rather than leaks',
    'Labels are consistent enough that the boundary the annotator drew is a stable target; boundary noise caps achievable Dice',
    'Deployment images come from the same acquisition pipeline, spacing and contrast as training images',
  ],

  pros: [
    {
      point: 'Pixel-accurate boundaries from very little labelled data',
      context:
        'Concatenated skips return the spatial detail that downsampling discarded, and augmentation (elastic deformation above all) stretches a few dozen annotated images a long way. Decisive in biomedical settings where annotation is expensive; matters less once data is abundant.',
    },
    {
      point: 'One architecture serves segmentation, restoration and denoising',
      context:
        'Anywhere the output has the same shape as the input and needs both global context and local detail, the same encoder-decoder with skips fits, from medical masks to the denoiser in a diffusion model. The caveat is that very large diffusion systems are moving to transformer backbones.',
    },
    {
      point: 'Trains stably without residual blocks',
      context:
        'Each encoder activation has a short gradient route through its skip, so early layers are one concatenation from the loss. Depth is rarely the problem; data and class imbalance are.',
    },
    {
      point: 'Overlap losses make severe class imbalance tractable',
      context:
        'A Dice term normalises by foreground size, so a 2% lesion matters as much as a large organ and the all-background solution stops being a plateau. It needs cross-entropy alongside it for early-training stability.',
    },
    {
      point: 'Fully convolutional, so it accepts any input size that is a valid multiple',
      context:
        'There is no fixed dense layer, so the same weights run on tiles of different size. This is what makes overlapping sliding-window inference over arbitrarily large images possible.',
    },
  ],

  cons: [
    {
      point: 'Memory-hungry because encoder activations must be held for the skips',
      context:
        'Full-resolution feature maps from every level are alive until the decoder consumes them, and 3-D variants multiply this by the depth axis. Tile size, not parameter count, limits the GPU; gradient checkpointing trades compute for memory when it bites.',
    },
    {
      point: 'Dice loss is unstable on tiny or empty targets',
      context:
        'Its gradient scales like the reciprocal of the foreground mass, so a handful of pixels can swing a step and an empty mask gives 0/0. Smoothing, batch-level pooling and cross-entropy mitigate it; they do not remove it.',
    },
    {
      point: 'Fixed local receptive field with no global reasoning',
      context:
        'Context grows only through downsampling depth. Tasks needing long-range agreement across the whole image (consistent labelling of a large structure from distant cues) favour attention-based segmenters once data supports them.',
    },
    {
      point: 'A plain U-Net is a poor reconstruction-based anomaly detector',
      context:
        'The skips let the decoder copy the input, so defects are reconstructed along with everything else and the residual map is blank. Useful anomaly detection needs supervised masks, synthetic defects or constrained skips.',
    },
    {
      point: 'Per-pixel classes cannot separate touching instances',
      context:
        'Two adjacent objects of one class merge into a single blob. Instance separation needs a boundary class and a watershed, a weighted border loss, or a detection-based head.',
    },
  ],

  relatedSlugs: ['cnn', 'resnet', 'ddpm', 'autoencoder', 'object-detection'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A one-level U-Net forward pass and the Dice score - the structure, written out.

Feature maps are lists of channels, and a channel is a 2-D list [h][w]. Nothing
is vectorized, so every function maps onto one box of the encoder / decoder /
skip diagram. Concatenation across channels is literally list concatenation.
"""

import math


def conv3x3_same(maps, kernels, bias):
    """kernels[out][in] is a 3x3 grid; zero padding keeps height and width."""
    h, w = len(maps[0]), len(maps[0][0])
    output = []

    for out_ch in range(len(kernels)):
        channel = [[bias[out_ch]] * w for _ in range(h)]
        for in_ch in range(len(maps)):
            kernel = kernels[out_ch][in_ch]
            for y in range(h):
                for x in range(w):
                    for u in range(3):
                        for v in range(3):
                            yy, xx = y + u - 1, x + v - 1
                            if 0 <= yy < h and 0 <= xx < w:   # zero padding
                                channel[y][x] += maps[in_ch][yy][xx] * kernel[u][v]
        output.append(channel)

    return output


def relu(maps):
    return [[[max(0.0, v) for v in row] for row in channel] for channel in maps]


def max_pool2(maps):
    """Contracting path: halve resolution, keep the strongest response."""
    h, w = len(maps[0]), len(maps[0][0])
    return [
        [
            [
                max(channel[2 * i + u][2 * j + v] for u in range(2) for v in range(2))
                for j in range(w // 2)
            ]
            for i in range(h // 2)
        ]
        for channel in maps
    ]


def up_conv2x2(maps, kernels, bias):
    """Expanding path: transposed conv, stride 2. Each input pixel paints a 2x2 block."""
    h, w = len(maps[0]), len(maps[0][0])
    output = [[[bias[o]] * (2 * w) for _ in range(2 * h)] for o in range(len(kernels))]

    for out_ch in range(len(kernels)):
        for in_ch in range(len(maps)):
            for y in range(h):
                for x in range(w):
                    for u in range(2):
                        for v in range(2):
                            output[out_ch][2 * y + u][2 * x + v] += (
                                maps[in_ch][y][x] * kernels[out_ch][in_ch][u][v]
                            )
    return output


def concat(skip_maps, decoder_maps):
    """The U-Net skip: stack channels. ResNet would ADD them element-wise instead."""
    return skip_maps + decoder_maps


def conv1x1(maps, weights, bias):
    h, w = len(maps[0]), len(maps[0][0])
    return [
        [[bias[o] + sum(weights[o][c] * maps[c][y][x] for c in range(len(maps))) for x in range(w)] for y in range(h)]
        for o in range(len(weights))
    ]


def softmax_per_pixel(logits):
    h, w = len(logits[0]), len(logits[0][0])
    probs = [[[0.0] * w for _ in range(h)] for _ in logits]
    for y in range(h):
        for x in range(w):
            peak = max(channel[y][x] for channel in logits)
            exps = [math.exp(channel[y][x] - peak) for channel in logits]
            total = sum(exps)
            for c, value in enumerate(exps):
                probs[c][y][x] = value / total
    return probs


def unet_forward(image, params):
    """encoder -> downsample -> bottleneck -> upsample -> CONCAT skip -> decoder -> head."""
    enc = relu(conv3x3_same(image, *params["enc"]))     # full resolution
    down = max_pool2(enc)                                # context up, detail lost
    mid = relu(conv3x3_same(down, *params["mid"]))
    up = up_conv2x2(mid, *params["up"])                  # back to full resolution, but blurry
    merged = concat(enc, up)                             # the skip returns the lost detail
    dec = relu(conv3x3_same(merged, *params["dec"]))
    return softmax_per_pixel(conv1x1(dec, *params["head"]))


def cross_entropy(probs, labels):
    """Mean over every pixel of -log p(true class)."""
    h, w = len(labels), len(labels[0])
    total = 0.0
    for y in range(h):
        for x in range(w):
            total -= math.log(max(probs[labels[y][x]][y][x], 1e-12))
    return total / (h * w)


def dice_set(predicted, truth):
    """2|A n B| / (|A| + |B|), with masks as sets of (row, col) pixels."""
    if not predicted and not truth:
        return 1.0                          # both empty: a perfect match by convention
    return 2 * len(predicted & truth) / (len(predicted) + len(truth))


def jaccard_set(predicted, truth):
    """|A n B| / |A u B| - the IoU used as the evaluation metric."""
    union = predicted | truth
    return len(predicted & truth) / len(union) if union else 1.0


def soft_dice_loss(probs, labels, eps=1e-6):
    """1 - mean over classes of 2*sum(p*y) / (sum(p) + sum(y)), on soft probabilities."""
    h, w = len(labels), len(labels[0])
    scores = []
    for c in range(len(probs)):
        intersection = prob_sum = truth_sum = 0.0
        for y in range(h):
            for x in range(w):
                is_class = 1.0 if labels[y][x] == c else 0.0
                intersection += probs[c][y][x] * is_class
                prob_sum += probs[c][y][x]
                truth_sum += is_class
        scores.append((2 * intersection + eps) / (prob_sum + truth_sum + eps))
    return 1.0 - sum(scores) / len(scores)


def imbalance_demo():
    """A 2%-foreground mask: predicting nothing scores 98% accuracy and 0 overlap."""
    truth = {(r, c) for r in range(10) for c in range(20)}     # 200 of 10,000 pixels
    predicted = set()                                          # "background everywhere"
    accuracy = 1 - len(predicted ^ truth) / 10_000
    return accuracy, dice_set(predicted, truth), jaccard_set(predicted, truth)`,
        profile: 'O(H·W·C_in·C_out·k²) per conv in pure Python, thousands of times slower than a real implementation; one level only, to keep the skip visible.',
      },
      'make-it-right': {
        code: `"""U-Net - typed modules, concat skips with explicit shape contracts, Dice + CE."""

from dataclasses import dataclass

import torch
import torch.nn.functional as F
from torch import Tensor, nn


@dataclass(frozen=True)
class UNetConfig:
    in_channels: int = 1
    num_classes: int = 2
    base_width: int = 32
    depth: int = 4

    @property
    def size_multiple(self) -> int:
        """Each downsampling halves H and W, so inputs must be a multiple of 2**depth."""
        return 2**self.depth


class DoubleConv(nn.Module):
    """(Conv3x3 -> BatchNorm -> ReLU) twice. Bias is off: BatchNorm re-centres anyway."""

    def __init__(self, in_ch: int, out_ch: int) -> None:
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: Tensor) -> Tensor:
        return self.block(x)


class Down(nn.Module):
    def __init__(self, in_ch: int, out_ch: int) -> None:
        super().__init__()
        self.pool = nn.MaxPool2d(2)
        self.conv = DoubleConv(in_ch, out_ch)

    def forward(self, x: Tensor) -> Tensor:
        return self.conv(self.pool(x))


class Up(nn.Module):
    """Upsample, CONCATENATE the encoder skip, then convolve.

    The concat is why the decoder conv takes (in_ch // 2) + skip_ch channels:
    the two sources are stacked and the conv learns how to weigh them. A
    ResNet-style add would need equal channel counts and mix them blindly.
    """

    def __init__(self, in_ch: int, skip_ch: int, out_ch: int) -> None:
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, in_ch // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_ch // 2 + skip_ch, out_ch)

    def forward(self, x: Tensor, skip: Tensor) -> Tensor:
        x = self.up(x)
        if x.shape[-2:] != skip.shape[-2:]:
            raise ValueError(
                f"skip {tuple(skip.shape[-2:])} and upsampled {tuple(x.shape[-2:])} "
                "feature maps disagree; pad the input to a multiple of 2**depth"
            )
        return self.conv(torch.cat([skip, x], dim=1))


class UNet(nn.Module):
    def __init__(self, config: UNetConfig) -> None:
        super().__init__()
        if config.depth < 1:
            raise ValueError(f"depth must be >= 1, got {config.depth}")
        if config.base_width < 1:
            raise ValueError(f"base_width must be >= 1, got {config.base_width}")

        self.config = config
        widths = [config.base_width * 2**level for level in range(config.depth + 1)]

        self.stem = DoubleConv(config.in_channels, widths[0])
        self.downs = nn.ModuleList(
            Down(widths[level], widths[level + 1]) for level in range(config.depth)
        )
        self.ups = nn.ModuleList(
            Up(widths[level + 1], widths[level], widths[level])
            for level in reversed(range(config.depth))
        )
        self.head = nn.Conv2d(widths[0], config.num_classes, kernel_size=1)

    def forward(self, x: Tensor) -> Tensor:
        if x.dim() != 4:
            raise ValueError(f"expected (batch, channels, height, width), got {tuple(x.shape)}")

        multiple = self.config.size_multiple
        height, width = x.shape[-2:]
        if height % multiple or width % multiple:
            raise ValueError(
                f"height and width must be multiples of {multiple}, got {height}x{width}; "
                "use pad_to_multiple() and crop the output"
            )

        skips: list[Tensor] = []
        x = self.stem(x)
        for down in self.downs:
            skips.append(x)       # held until the matching decoder level needs it
            x = down(x)
        for up in self.ups:
            x = up(x, skips.pop())
        return self.head(x)       # logits: (batch, num_classes, H, W)


def pad_to_multiple(x: Tensor, multiple: int) -> tuple[Tensor, tuple[int, int]]:
    """Reflect-pad bottom/right so H and W divide evenly; return the padding to undo it.

    Padding then cropping the OUTPUT is preferred to cropping the input, which
    would throw away real pixels at the border.
    """
    height, width = x.shape[-2:]
    pad_h = (-height) % multiple
    pad_w = (-width) % multiple
    if pad_h >= height or pad_w >= width:
        raise ValueError("input is too small to reflect-pad; use mode='constant' instead")
    return F.pad(x, (0, pad_w, 0, pad_h), mode="reflect"), (pad_h, pad_w)


def crop_padding(x: Tensor, padding: tuple[int, int]) -> Tensor:
    pad_h, pad_w = padding
    return x[..., : x.shape[-2] - pad_h, : x.shape[-1] - pad_w]


class DiceCrossEntropy(nn.Module):
    """Cross-entropy + soft Dice. CE is smooth early; Dice fixes class imbalance."""

    def __init__(self, dice_weight: float = 1.0, eps: float = 1e-6) -> None:
        super().__init__()
        if dice_weight < 0.0:
            raise ValueError(f"dice_weight must be >= 0, got {dice_weight}")
        self.dice_weight = dice_weight
        self.eps = eps

    def forward(self, logits: Tensor, target: Tensor) -> Tensor:
        """logits (N, C, H, W); target (N, H, W) of integer class ids."""
        if target.dim() != 3:
            raise ValueError(f"target must be (N, H, W), got {tuple(target.shape)}")

        cross_entropy = F.cross_entropy(logits, target)

        probs = logits.float().softmax(dim=1)
        one_hot = F.one_hot(target, logits.shape[1]).permute(0, 3, 1, 2).to(probs.dtype)

        # Pooled over batch AND space, per class. Per-image Dice is 0/0 on an
        # image with no foreground and its gradient blows up as mass -> 0.
        dims = (0, 2, 3)
        intersection = (probs * one_hot).sum(dims)
        cardinality = probs.sum(dims) + one_hot.sum(dims)
        dice = (2.0 * intersection + self.eps) / (cardinality + self.eps)

        return cross_entropy + self.dice_weight * (1.0 - dice.mean())


@dataclass(frozen=True)
class SegmentationScores:
    dice: float
    iou: float


@torch.no_grad()
def class_scores(pred: Tensor, target: Tensor, class_id: int) -> SegmentationScores | None:
    """Hard-mask Dice and IoU for one class; None when the class is absent from both."""
    predicted = pred == class_id
    truth = target == class_id
    intersection = int((predicted & truth).sum())
    total = int(predicted.sum()) + int(truth.sum())
    if total == 0:
        return None     # undefined, not perfect: skip rather than inflate the mean
    union = total - intersection
    return SegmentationScores(dice=2 * intersection / total, iou=intersection / union)`,
        rationale:
          'The loops become framework modules, and the skip becomes an explicit shape contract. The Up block asserts that the upsampled map and the encoder skip agree spatially, and the model refuses inputs that are not a multiple of 2 to the depth, with pad_to_multiple and crop_padding handling the odd-size case by padding the input and cropping the output rather than discarding border pixels. The loss is built from the same two terms as the objective, but with the details that matter: softmax in float32, Dice pooled over the batch so an empty-foreground image cannot produce 0/0, and an epsilon so absent classes score 1. Scoring skips classes absent from both prediction and truth rather than counting them as perfect, which would inflate the mean.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'PyTorch',
        profile: 'O(H·W·C0²·k²) per level, roughly equal across levels, on fused cuDNN kernels; skip tensors held until the decoder.',
      },
      'make-it-fast': {
        code: `"""U-Net - channels-last + bf16 + compile for training; batched, blended tiling for inference."""

import torch
from torch import Tensor, nn


def prepare_for_training(model: nn.Module, device: str) -> nn.Module:
    """channels_last layout and torch.compile.

    Tensor cores want NHWC; PyTorch defaults to NCHW, so cuDNN inserts a
    transpose around every convolution. Converting once removes it everywhere.
    """
    model = model.to(device, memory_format=torch.channels_last)
    return torch.compile(model)   # fuses BatchNorm + ReLU into the surrounding kernels


def train_step(model: nn.Module, optimizer, loss_fn, images: Tensor, masks: Tensor, device: str) -> float:
    images = images.to(device, non_blocking=True, memory_format=torch.channels_last)
    masks = masks.to(device, non_blocking=True)

    optimizer.zero_grad(set_to_none=True)
    with torch.autocast(device_type=device, dtype=torch.bfloat16):
        logits = model(images)
    # Dice sums many small probabilities: do that reduction in float32.
    loss = loss_fn(logits.float(), masks)

    loss.backward()
    optimizer.step()
    return float(loss.item())


def gaussian_window(tile: int, device: str, sigma_scale: float = 0.125) -> Tensor:
    """Weight tile centres more than edges, where the receptive field lacks context."""
    coords = torch.arange(tile, dtype=torch.float32, device=device) - (tile - 1) / 2
    profile = torch.exp(-(coords**2) / (2 * (tile * sigma_scale) ** 2))
    window = profile[:, None] * profile[None, :]
    return window / window.max()


def tile_origins(length: int, tile: int, stride: int) -> list[int]:
    """Window starts that cover the axis, with a final tile flush against the edge."""
    if length < tile:
        raise ValueError(f"image side {length} is smaller than the tile {tile}; pad first")
    last = length - tile
    origins = list(range(0, last + 1, stride))
    if origins[-1] != last:
        origins.append(last)
    return origins


@torch.no_grad()
def sliding_window_predict(
    model: nn.Module,
    image: Tensor,           # (C, H, W), already padded to be at least tile x tile
    num_classes: int,
    tile: int = 256,
    overlap: float = 0.5,
    batch_size: int = 8,
) -> Tensor:
    model.eval()
    device = image.device.type
    _, height, width = image.shape
    stride = max(1, int(tile * (1.0 - overlap)))
    window = gaussian_window(tile, device)

    # Pre-allocated accumulators; every tile is added in place, no per-tile result list.
    prob_sum = torch.zeros(num_classes, height, width, device=image.device)
    weight_sum = torch.zeros(1, height, width, device=image.device)

    origins = [
        (top, left)
        for top in tile_origins(height, tile, stride)
        for left in tile_origins(width, tile, stride)
    ]

    for start in range(0, len(origins), batch_size):
        batch_origins = origins[start : start + batch_size]
        # One forward over a stack of tiles instead of one call per tile.
        batch = torch.stack(
            [image[:, top : top + tile, left : left + tile] for top, left in batch_origins]
        ).contiguous(memory_format=torch.channels_last)

        with torch.autocast(device_type=device, dtype=torch.bfloat16):
            logits = model(batch)
        probs = logits.float().softmax(dim=1)

        for index, (top, left) in enumerate(batch_origins):
            prob_sum[:, top : top + tile, left : left + tile].add_(probs[index] * window)
            weight_sum[:, top : top + tile, left : left + tile].add_(window)

    return prob_sum / weight_sum`,
        rationale:
          'Three kinds of change, all about the hardware rather than the model. For training, tensors move to channels-last, the model is compiled so BatchNorm and ReLU fuse into neighbouring kernels, and the forward pass runs in bfloat16 while the Dice reductions are cast back to float32. For inference, the dominant cost is that a full image does not fit, so it is cut into overlapping tiles that are run as a stacked batch (one forward call for many tiles) and blended with a Gaussian window into pre-allocated accumulators updated in place, which removes the visible seams that unblended tiling leaves at tile edges.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'channels_last is the layout tensor cores actually want, and a single bfloat16 compute dtype halves activation memory, which for a U-Net is the binding constraint because the skip tensors must be held.',
            tradeoff: 'bfloat16 has about three significant digits, so reductions like Dice sums are cast to float32 by hand, and any custom op assuming NCHW silently transposes back and can make the model slower.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'torch.compile folds the BatchNorm and ReLU that follow each convolution into fewer kernels, so those elementwise passes stop reading and writing the whole activation tensor.',
            tradeoff: 'Compilation takes seconds to minutes and recompiles for every new input shape, so tiles must be a fixed size; the torch.cat for the skip still materializes the concatenated tensor.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Running stacked tiles through one forward call amortizes kernel-launch and Python overhead and keeps the GPU saturated, where a call per tile leaves it idle between small launches.',
            tradeoff: 'Peak memory scales with the batch because every tile holds its own skip tensors, so the batch size is capped by memory and a too-large value fails with out-of-memory rather than running slower.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The probability and weight accumulators are allocated once and updated with add_, so there is no list of per-tile results to hold and then stitch together.',
            tradeoff: 'The accumulators are full-image float32 (classes x H x W), which is large for a big 3-D volume, and in-place updates are only legal under no_grad, so this path cannot be reused for training.',
          },
        ],
        libraryName: 'PyTorch (AMP, compile)',
        profile: 'Roughly 1.5-2x faster steps from layout, precision and fusion; tiling converts an out-of-memory failure into a bounded-memory run. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// One-level U-Net forward pieces and the Dice score - written out.
// Feature maps are channel lists; a channel is a 2-D grid [h][w].
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <set>
#include <utility>
#include <vector>

using Map = std::vector<std::vector<double>>;      // one channel [h][w]
using Volume = std::vector<Map>;                   // [channels]
using Kernels = std::vector<std::vector<Map>>;     // [out][in][kh][kw]
using Pixel = std::pair<int, int>;

// Zero-padded 3x3 convolution: height and width are preserved.
Volume Conv3x3Same(const Volume& in, const Kernels& kernels, const std::vector<double>& bias) {
  const int h = static_cast<int>(in[0].size());
  const int w = static_cast<int>(in[0][0].size());
  Volume out(kernels.size(), Map(h, std::vector<double>(w, 0.0)));

  for (std::size_t oc = 0; oc < kernels.size(); ++oc) {
    for (int y = 0; y < h; ++y) {
      for (int x = 0; x < w; ++x) {
        double total = bias[oc];
        for (std::size_t ic = 0; ic < in.size(); ++ic) {
          for (int u = 0; u < 3; ++u) {
            for (int v = 0; v < 3; ++v) {
              const int yy = y + u - 1;
              const int xx = x + v - 1;
              if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;   // zero padding
              total += in[ic][yy][xx] * kernels[oc][ic][u][v];
            }
          }
        }
        out[oc][y][x] = total;
      }
    }
  }
  return out;
}

void Relu(Volume& maps) {
  for (Map& channel : maps)
    for (std::vector<double>& row : channel)
      for (double& value : row) value = std::max(0.0, value);
}

// Contracting path: halve the resolution, keep the strongest response.
Volume MaxPool2(const Volume& in) {
  Volume out;
  for (const Map& channel : in) {
    Map pooled(channel.size() / 2, std::vector<double>(channel[0].size() / 2, 0.0));
    for (std::size_t i = 0; i < pooled.size(); ++i) {
      for (std::size_t j = 0; j < pooled[0].size(); ++j) {
        double best = channel[2 * i][2 * j];
        for (std::size_t u = 0; u < 2; ++u)
          for (std::size_t v = 0; v < 2; ++v) best = std::max(best, channel[2 * i + u][2 * j + v]);
        pooled[i][j] = best;
      }
    }
    out.push_back(pooled);
  }
  return out;
}

// Expanding path: transposed conv, stride 2. Each input pixel paints a 2x2 block.
Volume UpConv2x2(const Volume& in, const Kernels& kernels, const std::vector<double>& bias) {
  const std::size_t h = in[0].size();
  const std::size_t w = in[0][0].size();
  Volume out(kernels.size(), Map(2 * h, std::vector<double>(2 * w, 0.0)));

  for (std::size_t oc = 0; oc < kernels.size(); ++oc) {
    for (std::size_t y = 0; y < 2 * h; ++y)
      for (std::size_t x = 0; x < 2 * w; ++x) out[oc][y][x] = bias[oc];
    for (std::size_t ic = 0; ic < in.size(); ++ic)
      for (std::size_t y = 0; y < h; ++y)
        for (std::size_t x = 0; x < w; ++x)
          for (std::size_t u = 0; u < 2; ++u)
            for (std::size_t v = 0; v < 2; ++v)
              out[oc][2 * y + u][2 * x + v] += in[ic][y][x] * kernels[oc][ic][u][v];
  }
  return out;
}

// The U-Net skip: stack channels. ResNet would ADD the two maps element-wise.
Volume Concat(const Volume& skip, const Volume& decoder) {
  Volume merged = skip;                                    // encoder channels first
  merged.insert(merged.end(), decoder.begin(), decoder.end());
  return merged;
}

struct Layer {
  Kernels kernels;
  std::vector<double> bias;
};

struct Params {
  Layer enc, mid, up, dec;
};

// encoder -> downsample -> bottleneck -> upsample -> CONCAT skip -> decoder.
// A 1x1 head and a per-pixel softmax follow, as in the Python version.
Volume UNetFeatures(const Volume& image, const Params& p) {
  Volume enc = Conv3x3Same(image, p.enc.kernels, p.enc.bias);
  Relu(enc);                                               // full resolution
  Volume mid = Conv3x3Same(MaxPool2(enc), p.mid.kernels, p.mid.bias);
  Relu(mid);                                               // context up, detail lost
  Volume up = UpConv2x2(mid, p.up.kernels, p.up.bias);     // full resolution, but blurry
  Volume dec = Conv3x3Same(Concat(enc, up), p.dec.kernels, p.dec.bias);
  Relu(dec);                                               // skip returned the lost detail
  return dec;
}

// Dice = 2|A n B| / (|A| + |B|) on masks stored as sets of pixels.
double DiceSet(const std::set<Pixel>& predicted, const std::set<Pixel>& truth) {
  if (predicted.empty() && truth.empty()) return 1.0;      // both empty: perfect by convention
  std::vector<Pixel> overlap;
  std::set_intersection(predicted.begin(), predicted.end(), truth.begin(), truth.end(),
                        std::back_inserter(overlap));
  return 2.0 * static_cast<double>(overlap.size()) /
         static_cast<double>(predicted.size() + truth.size());
}

// Jaccard / IoU = |A n B| / |A u B|, which equals D / (2 - D).
double JaccardSet(const std::set<Pixel>& predicted, const std::set<Pixel>& truth) {
  std::vector<Pixel> overlap, merged;
  std::set_intersection(predicted.begin(), predicted.end(), truth.begin(), truth.end(),
                        std::back_inserter(overlap));
  std::set_union(predicted.begin(), predicted.end(), truth.begin(), truth.end(),
                 std::back_inserter(merged));
  return merged.empty() ? 1.0 : static_cast<double>(overlap.size()) / merged.size();
}`,
        profile: 'O(H·W·C_in·C_out·k²) per conv. Nested vectors scatter rows across the heap, so every window misses cache.',
      },
      'make-it-right': {
        code: `// U-Net building blocks - flat CHW tensor, validated skip concatenation, soft Dice.
#include <algorithm>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <string>
#include <vector>

// One flat CHW buffer plus its shape. Rule of zero: the vector owns the
// memory, so no destructor, copy or move operations are written by hand.
class Tensor {
 public:
  Tensor(std::size_t channels, std::size_t height, std::size_t width)
      : channels_(NonZero(channels)),
        height_(NonZero(height)),
        width_(NonZero(width)),
        data_(channels_ * height_ * width_, 0.0f) {}   // checked BEFORE allocating

  [[nodiscard]] std::size_t channels() const noexcept { return channels_; }
  [[nodiscard]] std::size_t height() const noexcept { return height_; }
  [[nodiscard]] std::size_t width() const noexcept { return width_; }

  [[nodiscard]] std::span<const float> Data() const noexcept { return data_; }
  [[nodiscard]] std::span<float> MutableData() noexcept { return data_; }

  [[nodiscard]] std::span<const float> Plane(std::size_t c) const {
    return Data().subspan(c * height_ * width_, height_ * width_);
  }
  [[nodiscard]] std::span<float> MutablePlane(std::size_t c) {
    return MutableData().subspan(c * height_ * width_, height_ * width_);
  }

 private:
  static std::size_t NonZero(std::size_t value) {
    if (value == 0) throw std::invalid_argument("tensor dimensions must be non-zero");
    return value;
  }

  std::size_t channels_, height_, width_;
  std::vector<float> data_;
};

// Inputs must divide by 2^depth or the upsampled map will not match its skip.
void RequireDivisible(std::size_t height, std::size_t width, unsigned depth) {
  const std::size_t multiple = std::size_t{1} << depth;
  if (height % multiple != 0 || width % multiple != 0) {
    throw std::invalid_argument("height and width must be multiples of " +
                                std::to_string(multiple) + "; pad the input first");
  }
}

// In CHW layout, concatenating along channels is appending two buffers.
[[nodiscard]] Tensor ConcatChannels(const Tensor& first, const Tensor& second) {
  if (first.height() != second.height() || first.width() != second.width()) {
    throw std::invalid_argument("cannot concatenate maps with different spatial size");
  }
  Tensor merged(first.channels() + second.channels(), first.height(), first.width());
  std::span<float> dst = merged.MutableData();
  std::copy(first.Data().begin(), first.Data().end(), dst.begin());
  std::copy(second.Data().begin(), second.Data().end(),
            dst.begin() + static_cast<std::ptrdiff_t>(first.Data().size()));
  return merged;
}

[[nodiscard]] Tensor CenterCrop(const Tensor& source, std::size_t height, std::size_t width) {
  if (height > source.height() || width > source.width()) {
    throw std::invalid_argument("crop is larger than the source");
  }
  const std::size_t top = (source.height() - height) / 2;
  const std::size_t left = (source.width() - width) / 2;

  Tensor cropped(source.channels(), height, width);
  for (std::size_t c = 0; c < source.channels(); ++c) {
    std::span<float> out = cropped.MutablePlane(c);
    for (std::size_t y = 0; y < height; ++y) {
      std::span<const float> row =
          source.Plane(c).subspan((top + y) * source.width() + left, width);
      std::copy(row.begin(), row.end(), out.begin() + static_cast<std::ptrdiff_t>(y * width));
    }
  }
  return cropped;
}

// The original paper used unpadded convolutions, so the encoder map is larger
// than the decoder map and must be cropped to fit. An odd difference would need
// an asymmetric crop that shifts the alignment by half a pixel, so it is refused.
[[nodiscard]] Tensor MergeSkip(const Tensor& skip, const Tensor& decoder) {
  if (skip.height() < decoder.height() || skip.width() < decoder.width()) {
    throw std::invalid_argument("skip is smaller than the decoder map");
  }
  if ((skip.height() - decoder.height()) % 2 != 0 || (skip.width() - decoder.width()) % 2 != 0) {
    throw std::invalid_argument("skip/decoder size difference is odd; crop would misalign");
  }
  return ConcatChannels(CenterCrop(skip, decoder.height(), decoder.width()), decoder);
}

// Soft Dice on probabilities. Accumulate in double: sums of many small floats lose bits.
[[nodiscard]] double SoftDice(std::span<const float> probs, std::span<const float> target,
                              double eps = 1e-6) {
  if (probs.size() != target.size()) {
    throw std::invalid_argument("prediction and target must have the same size");
  }
  double intersection = 0.0, prob_mass = 0.0, target_mass = 0.0;
  for (std::size_t i = 0; i < probs.size(); ++i) {
    intersection += static_cast<double>(probs[i]) * target[i];
    prob_mass += probs[i];
    target_mass += target[i];
  }
  return (2.0 * intersection + eps) / (prob_mass + target_mass + eps);
}`,
        rationale:
          'The nested vectors become one flat CHW buffer behind a Tensor type whose dimensions are validated before any allocation. That layout makes the U-Net skip nearly free to express: concatenating along channels is appending two contiguous buffers. The shape contract the skip depends on is made explicit: divisibility is checked up front, and MergeSkip crops an encoder map to a smaller decoder map (the original unpadded-convolution case) but refuses an odd size difference rather than silently misaligning by half a pixel. The Dice is accumulated in double over non-owning spans, with an epsilon so an empty class does not divide by zero.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(C·H·W) per concat or crop, contiguous access, one allocation per output tensor.',
      },
      'make-it-fast': {
        code: `// U-Net decoder conv - virtual concat, OpenMP over output channels, fused Dice sums.
// Build: g++ -O3 -march=native -fopenmp
#include <algorithm>
#include <cstddef>

// Accumulate a 3x3 same-padded convolution of ONE source plane into out.
// Valid index ranges are clamped per kernel offset, so the inner loop is a
// contiguous multiply-add over two row slices with no bounds branch inside.
static inline void AccumulateConv3x3(const float* __restrict src, const float* __restrict kernel,
                                     float* __restrict out, int h, int w) {
  for (int u = 0; u < 3; ++u) {
    const int dy = u - 1;
    const int y_begin = std::max(0, -dy);
    const int y_end = std::min(h, h - dy);
    for (int v = 0; v < 3; ++v) {
      const int dx = v - 1;
      const int x_begin = std::max(0, -dx);
      const int x_end = std::min(w, w - dx);
      const float weight = kernel[u * 3 + v];
      for (int y = y_begin; y < y_end; ++y) {
        const float* __restrict in_row = src + static_cast<std::size_t>(y + dy) * w;
        float* __restrict out_row = out + static_cast<std::size_t>(y) * w;
        for (int x = x_begin; x < x_end; ++x) out_row[x] += weight * in_row[x + dx];
      }
    }
  }
}

// conv([skip ; up]) = conv_skip(skip) + conv_up(up) by linearity, so the
// concatenated tensor never has to exist. The decoder reads the encoder skip
// and the upsampled map in place, each against its slice of the weights.
//   weights: [out_ch][skip_ch + up_ch][3][3], skip channels first (as in the concat)
void ConvVirtualConcat3x3(const float* skip, int skip_ch, const float* up, int up_ch,
                          const float* weights, const float* bias, float* out, int out_ch, int h,
                          int w) {
  const std::size_t plane = static_cast<std::size_t>(h) * w;
  const int in_ch = skip_ch + up_ch;

#pragma omp parallel for schedule(static)
  for (int oc = 0; oc < out_ch; ++oc) {                    // output channels are independent
    float* out_plane = out + static_cast<std::size_t>(oc) * plane;
    std::fill_n(out_plane, plane, bias[oc]);
    const float* oc_weights = weights + static_cast<std::size_t>(oc) * in_ch * 9;

    for (int ic = 0; ic < skip_ch; ++ic)
      AccumulateConv3x3(skip + ic * plane, oc_weights + ic * 9, out_plane, h, w);
    for (int ic = 0; ic < up_ch; ++ic)
      AccumulateConv3x3(up + ic * plane, oc_weights + (skip_ch + ic) * 9, out_plane, h, w);
  }
}

struct DiceSums {
  double intersection, prediction, target;
};

// All three Dice sums in ONE pass over the two arrays: two reads per element
// instead of six, which matters because this loop is memory-bound.
DiceSums FusedDiceSums(const float* __restrict probs, const float* __restrict target,
                       std::size_t count) {
  double intersection = 0.0, prediction = 0.0, truth = 0.0;
  for (std::size_t i = 0; i < count; ++i) {
    intersection += static_cast<double>(probs[i]) * target[i];
    prediction += probs[i];
    truth += target[i];
  }
  return {intersection, prediction, truth};
}`,
        rationale:
          'The U-Net-specific change is the virtual concat: because convolution is linear, a convolution over the concatenated channels equals the sum of a convolution over the skip and one over the upsampled map, so the concatenated tensor is never materialized and the decoder reads both sources in place. Everything else is about letting the compiler do its job: padding is handled by clamping the loop ranges per kernel offset so the inner loop is a branch-free contiguous multiply-add over restrict-qualified rows, output channels are distributed across threads, and the three Dice sums are fused into a single pass.',
        optimizations: [
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'The virtual concat skips building the stacked skip-plus-decoder tensor altogether (a full read and write of both maps per level), and the Dice sums share one traversal instead of three.',
            tradeoff: 'The weight tensor must be addressed as two slices and the kernel gets more intricate, and many small per-source accumulations can be slower than one large GEMM once a tuned BLAS is available.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Output channels never read each other, so the outer loop splits across threads with no shared writes and no reduction.',
            tradeoff: 'Each thread streams the same input planes, so on a memory-bound layer the speedup flattens after a few cores; the Dice loop is deliberately left serial because it is memory-bound and threading it would not help.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: '__restrict promises the output row does not alias the input row, which lets the compiler vectorize the multiply-add without emitting runtime overlap checks.',
            tradeoff: 'It is a promise, not a check: if the caller ever passes overlapping buffers (an in-place convolution, say) the result is undefined behavior that no sanitizer is guaranteed to catch.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'CHW planes with row-contiguous inner loops mean the multiply-add walks two sequential slices, which the hardware prefetches and vectorizes.',
            tradeoff: 'CHW favours this scalar-per-position loop; a channels-last (NHWC) layout, which tensor cores and SIMD over channels prefer, would need the loops restructured.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'Skips one full concatenated-tensor write and read per decoder level; near-linear scaling over output channels until memory-bound. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! One-level U-Net forward pieces and the Dice score - written out.
//! Feature maps are channel lists; a channel is a 2-D grid [h][w].

use std::collections::HashSet;

type Map = Vec<Vec<f64>>;                    // one channel [h][w]
type Volume = Vec<Map>;                      // [channels]
type Kernels = Vec<Vec<Vec<Vec<f64>>>>;      // [out][in][kh][kw]

pub struct Layer {
    pub kernels: Kernels,
    pub bias: Vec<f64>,
}

pub struct Params {
    pub enc: Layer,
    pub mid: Layer,
    pub up: Layer,
    pub dec: Layer,
}

/// Zero-padded 3x3 convolution: height and width are preserved.
pub fn conv3x3_same(input: &Volume, kernels: &Kernels, bias: &[f64]) -> Volume {
    let h = input[0].len();
    let w = input[0][0].len();
    let mut output = vec![vec![vec![0.0; w]; h]; kernels.len()];

    for oc in 0..kernels.len() {
        for y in 0..h {
            for x in 0..w {
                let mut total = bias[oc];
                for ic in 0..input.len() {
                    for u in 0..3 {
                        for v in 0..3 {
                            let yy = y as isize + u as isize - 1;
                            let xx = x as isize + v as isize - 1;
                            if yy < 0 || yy >= h as isize || xx < 0 || xx >= w as isize {
                                continue; // zero padding
                            }
                            total += input[ic][yy as usize][xx as usize] * kernels[oc][ic][u][v];
                        }
                    }
                }
                output[oc][y][x] = total;
            }
        }
    }
    output
}

pub fn relu(maps: &mut Volume) {
    for channel in maps.iter_mut() {
        for row in channel.iter_mut() {
            for value in row.iter_mut() {
                *value = value.max(0.0);
            }
        }
    }
}

/// Contracting path: halve the resolution, keep the strongest response.
pub fn max_pool2(input: &Volume) -> Volume {
    let mut output = Vec::new();
    for channel in input {
        let (h, w) = (channel.len() / 2, channel[0].len() / 2);
        let mut pooled = vec![vec![0.0; w]; h];
        for i in 0..h {
            for j in 0..w {
                let mut best = f64::NEG_INFINITY;
                for u in 0..2 {
                    for v in 0..2 {
                        best = best.max(channel[2 * i + u][2 * j + v]);
                    }
                }
                pooled[i][j] = best;
            }
        }
        output.push(pooled);
    }
    output
}

/// Expanding path: transposed conv, stride 2. Each input pixel paints a 2x2 block.
pub fn up_conv2x2(input: &Volume, kernels: &Kernels, bias: &[f64]) -> Volume {
    let h = input[0].len();
    let w = input[0][0].len();
    let mut output = vec![vec![vec![0.0; 2 * w]; 2 * h]; kernels.len()];

    for oc in 0..kernels.len() {
        for y in 0..2 * h {
            for x in 0..2 * w {
                output[oc][y][x] = bias[oc];
            }
        }
        for ic in 0..input.len() {
            for y in 0..h {
                for x in 0..w {
                    for u in 0..2 {
                        for v in 0..2 {
                            output[oc][2 * y + u][2 * x + v] += input[ic][y][x] * kernels[oc][ic][u][v];
                        }
                    }
                }
            }
        }
    }
    output
}

/// The U-Net skip: stack channels. ResNet would ADD the two maps element-wise.
pub fn concat(skip: &Volume, decoder: &Volume) -> Volume {
    let mut merged = skip.clone(); // encoder channels first
    merged.extend(decoder.iter().cloned());
    merged
}

/// encoder -> downsample -> bottleneck -> upsample -> CONCAT skip -> decoder.
pub fn unet_features(image: &Volume, p: &Params) -> Volume {
    let mut enc = conv3x3_same(image, &p.enc.kernels, &p.enc.bias);
    relu(&mut enc); // full resolution
    let mut mid = conv3x3_same(&max_pool2(&enc), &p.mid.kernels, &p.mid.bias);
    relu(&mut mid); // context up, detail lost
    let up = up_conv2x2(&mid, &p.up.kernels, &p.up.bias); // full resolution, but blurry
    let mut dec = conv3x3_same(&concat(&enc, &up), &p.dec.kernels, &p.dec.bias);
    relu(&mut dec); // the skip returned the lost detail
    dec
}

/// Dice = 2|A n B| / (|A| + |B|) on masks stored as sets of pixels.
pub fn dice_set(predicted: &HashSet<(usize, usize)>, truth: &HashSet<(usize, usize)>) -> f64 {
    if predicted.is_empty() && truth.is_empty() {
        return 1.0; // both empty: perfect by convention
    }
    let overlap = predicted.intersection(truth).count();
    2.0 * overlap as f64 / (predicted.len() + truth.len()) as f64
}

/// Jaccard / IoU = |A n B| / |A u B|, which equals D / (2 - D).
pub fn jaccard_set(predicted: &HashSet<(usize, usize)>, truth: &HashSet<(usize, usize)>) -> f64 {
    let union = predicted.union(truth).count();
    if union == 0 {
        return 1.0;
    }
    predicted.intersection(truth).count() as f64 / union as f64
}`,
        profile: 'O(H·W·C_in·C_out·k²) per conv. Vec<Vec<f64>> scatters rows and every index is bounds-checked; the skip clones whole maps.',
      },
      'make-it-right': {
        code: `//! U-Net building blocks - typed errors, validated skip concatenation, soft Dice.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum UNetError {
    ZeroDimension,
    DataLength { expected: usize, found: usize },
    SpatialMismatch { first: (usize, usize), second: (usize, usize) },
    SkipSmallerThanDecoder { skip: (usize, usize), decoder: (usize, usize) },
    OddCropDifference { skip: usize, decoder: usize },
    NotDivisible { size: usize, multiple: usize },
    LengthMismatch { left: usize, right: usize },
}

impl fmt::Display for UNetError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroDimension => write!(f, "tensor dimensions must be non-zero"),
            Self::DataLength { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::SpatialMismatch { first, second } => {
                write!(f, "spatial size {first:?} does not match {second:?}")
            }
            Self::SkipSmallerThanDecoder { skip, decoder } => {
                write!(f, "skip {skip:?} is smaller than decoder {decoder:?}")
            }
            Self::OddCropDifference { skip, decoder } => {
                write!(f, "size difference {skip} - {decoder} is odd; a centred crop would misalign")
            }
            Self::NotDivisible { size, multiple } => {
                write!(f, "size {size} is not a multiple of {multiple}; pad the input first")
            }
            Self::LengthMismatch { left, right } => {
                write!(f, "length {left} does not match {right}")
            }
        }
    }
}

impl std::error::Error for UNetError {}

/// Number of downsamplings. A newtype so it cannot be confused with a size.
#[derive(Clone, Copy, Debug)]
pub struct Depth(pub u32);

impl Depth {
    /// Inputs must be a multiple of 2^depth for the upsampled map to match its skip.
    #[must_use]
    pub fn size_multiple(self) -> usize {
        1usize << self.0
    }
}

pub fn require_divisible(height: usize, width: usize, depth: Depth) -> Result<(), UNetError> {
    let multiple = depth.size_multiple();
    for size in [height, width] {
        if size % multiple != 0 {
            return Err(UNetError::NotDivisible { size, multiple });
        }
    }
    Ok(())
}

/// One flat CHW buffer plus its shape, validated once at construction.
pub struct Tensor {
    channels: usize,
    height: usize,
    width: usize,
    data: Vec<f32>,
}

impl Tensor {
    pub fn from_vec(
        channels: usize,
        height: usize,
        width: usize,
        data: Vec<f32>,
    ) -> Result<Self, UNetError> {
        if channels == 0 || height == 0 || width == 0 {
            return Err(UNetError::ZeroDimension);
        }
        let expected = channels * height * width;
        if data.len() != expected {
            return Err(UNetError::DataLength { expected, found: data.len() });
        }
        Ok(Self { channels, height, width, data })
    }

    #[must_use]
    pub fn data(&self) -> &[f32] {
        &self.data
    }

    #[must_use]
    pub fn spatial(&self) -> (usize, usize) {
        (self.height, self.width)
    }

    #[must_use]
    pub fn plane(&self, channel: usize) -> &[f32] {
        let size = self.height * self.width;
        &self.data[channel * size..(channel + 1) * size]
    }
}

/// In CHW layout, concatenating along channels is appending two buffers.
pub fn concat_channels(first: &Tensor, second: &Tensor) -> Result<Tensor, UNetError> {
    if first.spatial() != second.spatial() {
        return Err(UNetError::SpatialMismatch { first: first.spatial(), second: second.spatial() });
    }
    let data = [first.data(), second.data()].concat();
    Tensor::from_vec(first.channels + second.channels, first.height, first.width, data)
}

pub fn center_crop(source: &Tensor, height: usize, width: usize) -> Result<Tensor, UNetError> {
    if height > source.height || width > source.width {
        return Err(UNetError::SkipSmallerThanDecoder {
            skip: source.spatial(),
            decoder: (height, width),
        });
    }
    let top = (source.height - height) / 2;
    let left = (source.width - width) / 2;

    let mut data = Vec::with_capacity(source.channels * height * width);
    for channel in 0..source.channels {
        let plane = source.plane(channel);
        for y in top..top + height {
            data.extend_from_slice(&plane[y * source.width + left..y * source.width + left + width]);
        }
    }
    Tensor::from_vec(source.channels, height, width, data)
}

/// Crop the (larger) encoder skip to the decoder map, then concatenate.
/// An odd size difference would need an asymmetric crop and shift alignment by
/// half a pixel, so it is rejected rather than rounded.
pub fn merge_skip(skip: &Tensor, decoder: &Tensor) -> Result<Tensor, UNetError> {
    let (skip_h, skip_w) = skip.spatial();
    let (dec_h, dec_w) = decoder.spatial();
    if skip_h < dec_h || skip_w < dec_w {
        return Err(UNetError::SkipSmallerThanDecoder { skip: skip.spatial(), decoder: decoder.spatial() });
    }
    for (skip_size, decoder_size) in [(skip_h, dec_h), (skip_w, dec_w)] {
        if (skip_size - decoder_size) % 2 != 0 {
            return Err(UNetError::OddCropDifference { skip: skip_size, decoder: decoder_size });
        }
    }
    concat_channels(&center_crop(skip, dec_h, dec_w)?, decoder)
}

/// Soft Dice on probabilities, accumulated in f64.
pub fn soft_dice(probs: &[f32], target: &[f32], eps: f64) -> Result<f64, UNetError> {
    if probs.len() != target.len() {
        return Err(UNetError::LengthMismatch { left: probs.len(), right: target.len() });
    }
    let (intersection, prob_mass, target_mass) = probs.iter().zip(target).fold(
        (0.0_f64, 0.0_f64, 0.0_f64),
        |(inter, p_sum, t_sum), (&p, &t)| {
            (inter + f64::from(p) * f64::from(t), p_sum + f64::from(p), t_sum + f64::from(t))
        },
    );
    Ok((2.0 * intersection + eps) / (prob_mass + target_mass + eps))
}`,
        rationale:
          'The nested Vecs become a flat CHW tensor whose shape is validated at the constructor, so an invalid tensor cannot exist. The failures the skip connection can hit become a typed error enum (spatial mismatch, a skip smaller than the decoder, an odd crop difference, a non-divisible input) returned as a Result instead of a panic or a silently misaligned map. Depth is a newtype so it cannot be mixed up with a pixel count, concatenation is a single exact-size append of two borrowed slices, and the Dice is an iterator fold over zipped slices accumulated in f64.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(C·H·W) per concat or crop, contiguous access, one exact-size allocation per output tensor.',
      },
      'make-it-fast': {
        code: `//! U-Net decoder conv - virtual concat, rayon over output channels, fused Dice sums.

use rayon::prelude::*;

/// Accumulate a 3x3 same-padded convolution of ONE source plane into \`out\`.
///
/// Valid ranges are computed per kernel offset, so the inner loop is a zip of
/// two contiguous row slices: no bounds check, no padding branch, and a shape
/// the compiler vectorizes.
#[inline]
fn accumulate_conv3x3(src: &[f32], kernel: &[f32], out: &mut [f32], height: usize, width: usize) {
    for u in 0..3 {
        let y_begin = usize::from(u == 0);
        let y_end = height - usize::from(u == 2);
        for v in 0..3 {
            let x_begin = usize::from(v == 0);
            let x_end = width - usize::from(v == 2);
            let weight = kernel[u * 3 + v];

            for y in y_begin..y_end {
                let src_y = y + u - 1;
                let in_row = &src[src_y * width + x_begin + v - 1..src_y * width + x_end + v - 1];
                let out_row = &mut out[y * width + x_begin..y * width + x_end];
                for (o, &i) in out_row.iter_mut().zip(in_row) {
                    *o += weight * i;
                }
            }
        }
    }
}

/// conv([skip ; up]) = conv_skip(skip) + conv_up(up), by linearity, so the
/// concatenated tensor never has to exist.
///
/// weights: [out_ch][skip_ch + up_ch][3][3], skip channels first. Output
/// channels are independent, so each rayon worker owns exactly one plane.
pub fn conv_virtual_concat(
    skip: &[f32],
    skip_ch: usize,
    up: &[f32],
    up_ch: usize,
    weights: &[f32],
    bias: &[f32],
    height: usize,
    width: usize,
) -> Vec<f32> {
    let plane = height * width;
    let in_ch = skip_ch + up_ch;
    let out_ch = bias.len();
    let mut output = vec![0.0_f32; out_ch * plane];

    output
        .par_chunks_exact_mut(plane)
        .enumerate()
        .for_each(|(oc, out_plane)| {
            out_plane.fill(bias[oc]);
            let oc_weights = &weights[oc * in_ch * 9..(oc + 1) * in_ch * 9];

            for ic in 0..skip_ch {
                let src = &skip[ic * plane..(ic + 1) * plane];
                accumulate_conv3x3(src, &oc_weights[ic * 9..ic * 9 + 9], out_plane, height, width);
            }
            for ic in 0..up_ch {
                let src = &up[ic * plane..(ic + 1) * plane];
                let k = (skip_ch + ic) * 9;
                accumulate_conv3x3(src, &oc_weights[k..k + 9], out_plane, height, width);
            }
        });

    output
}

/// All three Dice sums in ONE pass over the two slices.
#[must_use]
pub fn fused_dice_sums(probs: &[f32], target: &[f32]) -> (f64, f64, f64) {
    probs.iter().zip(target).fold((0.0, 0.0, 0.0), |(inter, p_sum, t_sum), (&p, &t)| {
        (inter + f64::from(p) * f64::from(t), p_sum + f64::from(p), t_sum + f64::from(t))
    })
}`,
        rationale:
          'The U-Net-specific change is the virtual concat: convolution is linear, so a convolution over concatenated channels is the sum of one over the skip and one over the upsampled map, and the stacked tensor is never allocated. The rest is about giving the optimizer a shape it can use. Padding is resolved by computing valid index ranges per kernel offset, which turns the inner loop into a zip of two contiguous row slices that skips bounds checks and vectorizes. Output channels run in parallel under rayon, one plane per worker, and the Dice sums fuse into a single traversal.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each output plane depends on no other output plane, so par_chunks_exact_mut gives every worker an exclusive slice: no locks, no atomics, no reduction.',
            tradeoff: 'Every worker streams the same skip and upsampled inputs, so on a memory-bound layer scaling flattens at a few cores; with few output channels or small images the thread dispatch costs more than it saves.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Both sources are read in place as row slices of the existing buffers, which is what lets the virtual concat skip allocating and copying the stacked tensor.',
            tradeoff: 'The weight layout is coupled to the concat order (skip channels first), so reordering the channels anywhere else silently pairs weights with the wrong inputs.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'Zipping an output row slice with an input row slice proves equal length to the compiler, so the inner multiply-add has no per-element bounds check and vectorizes.',
            tradeoff: 'The slice bounds are still checked once per row, and the index arithmetic that picks the ranges is easy to get off by one at the image border, which is why it deserves a test against the naive version.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'accumulate_conv3x3 is called once per input channel per output channel, so inlining it lets the compiler hoist the range computation and specialize the constant 3x3 loop bounds.',
            tradeoff: 'It is invoked from two call sites, so inlining duplicates the body and grows code size; the benefit is real only where the loop bodies are small enough to stay in the instruction cache.',
          },
        ],
        libraryName: 'rayon',
        profile: 'Skips one full concatenated-tensor write and read per decoder level; scales over output channels until memory-bound. Illustrative, not a measured benchmark.',
      },
    },
  },
};
