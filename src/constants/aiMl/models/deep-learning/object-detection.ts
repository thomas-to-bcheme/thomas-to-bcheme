import type { AiMlModel } from '../../types';

/**
 * Object Detection Heads (IoU & Box Regression) — the entry about the output
 * layer rather than the backbone.
 *
 * Follows cnn in the spatial group because the convolutional prior is assumed
 * here and the interesting content is entirely downstream of it: how a fixed
 * grid of predictions becomes a variable-length set of boxes, why the class
 * imbalance is extreme, and why the post-processing step that resolves
 * duplicates is not part of the model and probably should be.
 */
export const OBJECT_DETECTION: AiMlModel = {
  slug: 'object-detection',
  name: 'Object Detection Heads (IoU & Box Regression)',
  aliases: ['Faster R-CNN', 'YOLO', 'SSD', 'RetinaNet', 'DETR', 'Non-maximum suppression'],
  category: 'deep-learning',
  group: 'spatial',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression'],
  architecture: 'convolutional',
  paradigmNote:
    'Two supervised tasks trained jointly against one backbone: classify what is in a region, and regress where its box actually is. The joint loss is not a convenience — the tasks share features, and separating them costs both.',

  intuition:
    'A classifier answers "what is this image". A detector has to answer "what is here, and where, and how many" — and the last part is the hard one, because a network produces a fixed-size output and an image contains a variable number of objects. Every design resolves this the same way: predict far more boxes than there could be, have almost all of them predict "nothing", and clean up the duplicates afterwards. That structure explains the two facts that dominate the field. The class imbalance is extreme, because background outnumbers objects by orders of magnitude. And the deduplication step — non-maximum suppression — is a hand-written greedy algorithm bolted to the outside of a learned system, which is exactly the kind of seam that later designs try to remove.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\frac{1}{N_{\\text{pos}}}\\sum_{i} \\mathcal{L}_{\\text{cls}}(p_i, p_i^{*}) + \\frac{\\lambda}{N_{\\text{pos}}}\\sum_{i} \\mathbb{1}\\!\\left[p_i^{*} > 0\\right] \\mathcal{L}_{\\text{box}}(t_i, t_i^{*})',
      symbols: [
        { symbol: 'p_i', meaning: 'predicted class distribution for candidate i, including a background class' },
        { symbol: 't_i', meaning: 'predicted box offsets — never absolute coordinates, always a correction to a reference' },
        { symbol: '\\mathbb{1}[p_i^{*} > 0]', meaning: 'the box loss applies only to positives; there is no correct box for background, so regressing one is meaningless' },
        { symbol: 'N_{\\text{pos}}', meaning: 'the count of positive matches, used to normalize — otherwise the loss scales with how many objects happen to be present' },
      ],
    },
    reading:
      'Classify every candidate and, for the ones that matched an object, also correct its box. The indicator is the part worth pausing on: background candidates get no box loss at all, because there is no ground-truth box for them and asking the network to predict one would be asking it to fit noise. The normalization by positive count matters for the same reason it usually does — without it an image with twenty objects produces a twenty-times-larger gradient than one with a single object, and the model quietly learns to care more about crowded scenes.',
  },

  optimization: {
    method: 'Joint SGD on classification and box regression, with an assignment rule matching predictions to ground truth and non-maximum suppression at inference',
    updateRule: {
      formula:
        '\\mathrm{IoU}(A, B) = \\frac{\\lvert A \\cap B \\rvert}{\\lvert A \\cup B \\rvert}, \\qquad \\text{keep } b_i \\text{ iff } \\max_{j \\in \\mathcal{K}} \\mathrm{IoU}(b_i, b_j) < \\tau',
      symbols: [
        { symbol: '\\mathrm{IoU}', meaning: 'intersection over union — the assignment rule during training, the evaluation metric, and the deduplication criterion, all at once' },
        { symbol: '\\mathcal{K}', meaning: 'boxes already kept, in descending score order; greedy suppression walks the list once' },
        { symbol: '\\tau', meaning: 'the suppression threshold, and a genuine accuracy-versus-crowding trade rather than a technicality' },
        { symbol: '\\text{iff}', meaning: 'this is not learned — it is a hand-written greedy rule applied after the network, which is the seam DETR removes' },
      ],
    },
    rationale:
      'Three decisions define a detector, and only one of them is the network. First, assignment: which predictions are responsible for which objects, usually by IoU against a set of anchor boxes, or by a bipartite matching in set-based designs. Get this wrong and the supervision is wrong regardless of the architecture. Second, the imbalance: with tens of thousands of candidates and a handful of objects, an unweighted cross-entropy is dominated by easy background and the model learns to predict nothing — which is what focal loss addresses, by down-weighting examples the model already gets right so the rare hard ones survive into the gradient. Third, deduplication: the network emits many overlapping boxes for one object, and greedy non-maximum suppression removes them at inference. That last step is not differentiable, not learned, and has its own failure mode on crowded scenes, which is precisely why set-prediction designs replace it with a matching that is part of training.',
    hyperparameters: [
      { name: 'IoU assignment thresholds', role: 'What counts as a positive, a negative, or ignored during training. The most consequential setting in a detector and the least discussed', typicalRange: 'positive above 0.5-0.7, negative below 0.3-0.4, ignored in between' },
      { name: 'NMS threshold', role: 'How much overlap is allowed among kept boxes. Lower removes duplicates and also removes genuinely overlapping objects', typicalRange: '0.45-0.6, tuned against the crowding in the target domain' },
      { name: 'anchor design', role: 'Scales and aspect ratios of the reference boxes. Mismatched anchors cap recall before training starts, which no amount of training fixes' },
      { name: 'focal loss gamma', role: 'How hard to down-weight easy examples. The mechanism that makes one-stage detectors trainable against the background imbalance', typicalRange: 'gamma 2.0, alpha 0.25' },
      { name: 'score threshold', role: 'Confidence cut before NMS. A pure precision-recall dial applied at inference, not a model parameter' },
      { name: 'lambda (loss balance)', role: 'Weight on the box term relative to classification. Sensitive to the box parameterization, which is why IoU-based losses are more robust here' },
    ],
    convergence:
      'Training is ordinary SGD and converges unremarkably; the failures are about the surrounding structure. The dominant one is the imbalance: without focal loss or hard-negative mining, a one-stage detector trained with plain cross-entropy collapses to predicting background everywhere, and the loss looks like it is falling the whole time. Anchor mismatch is the quiet one — if no anchor overlaps an object shape by enough to be assigned positive, that object is never a training target and recall for its class is capped before the first epoch. Small objects fail for a related reason: after enough downsampling they occupy less than one feature-map cell, which is what feature pyramids exist to address. And NMS has its own failure independent of the network: two genuinely overlapping objects produce boxes with high mutual IoU, and the greedy rule deletes one of them.',
    complexity:
      'Backbone forward pass dominates training and inference, so the cost profile is a CNN’s. The heads are cheap. NMS is O(k^2) in the boxes surviving the score threshold, per class, which is negligible at typical counts and becomes real on dense scenes with thousands of survivors. Set-based designs trade that for a Hungarian matching during training, O(n^3) in the number of queries, which is affordable because the query count is fixed and small.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The output is a set of spatial regions with class labels, and the architecture’s prior is spatial locality rather than temporal order; there is no future value anywhere in the formulation.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'A detector localizes the classes it was trained on, so a defect it has never seen is simply not detected — the opposite of what an anomaly detector must do, which is flag the unfamiliar.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Two genuine combinatorial problems sit inside a detector, and neither is gradient descent. Assignment is a matching problem: every prediction must be paired with a ground-truth object or with background, and the set-based designs solve it exactly as a bipartite matching with the Hungarian algorithm rather than by a heuristic IoU rule. Deduplication is a greedy set-selection problem — non-maximum suppression is a hand-written approximation to choosing the highest-scoring non-overlapping subset, which is NP-hard in general.',
        where: [
          'Bipartite matching between predictions and ground truth, which is what makes set prediction end-to-end and removes NMS entirely',
          'Non-maximum suppression as a greedy approximation to maximum-weight independent set on the overlap graph',
          'Soft-NMS and clustering variants as alternative heuristics for the same underlying selection problem',
        ],
        why: 'It is a clear case of a learned system with combinatorial problems embedded in it, and of what happens when one of them is left outside the model: NMS is not differentiable, not trained, and has failure modes the network cannot compensate for because it never sees them. Moving the matching inside training — which is the DETR contribution — is a good demonstration that identifying the combinatorial structure and solving it properly can replace a heuristic that everyone had accepted as inherent.',
        featurization: [
          'Define the matching cost to include both classification and localization, or the assignment optimizes one at the expense of the other',
          'Use an IoU-based box loss rather than a coordinate loss, so the training objective and the evaluation metric are the same quantity',
        ],
        evaluation:
          'Compare the greedy suppression against an exact selection on small instances to see what the heuristic costs, and measure recall on crowded scenes specifically — that is where the greedy approximation loses and an aggregate mAP hides it.',
        pitfalls: [
          'Tuning the NMS threshold on non-crowded validation data and deploying into crowds, where the same threshold deletes real objects',
          'Treating assignment as a fixed rule rather than a design choice, when it determines what the network is actually supervised on',
          'Optimizing a coordinate loss while evaluating IoU, so the training objective and the metric disagree about what a good box is',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'primary',
        how: 'A convolutional backbone extracts features, a feature pyramid supplies them at several scales, and heads predict a class distribution and box offsets at every position and anchor. One-stage designs do this directly; two-stage designs first propose regions and then refine them, trading latency for accuracy. Set-based designs replace the anchors and the suppression with a fixed set of learned queries and a matching loss.',
        where: [
          'Autonomous driving and robotics perception, where the deliverable is what is where rather than what is present',
          'Retail and industrial counting and inspection, where the count and the position are the output',
          'Surveillance and safety monitoring, usually feeding a tracker that adds temporal identity',
          'Medical imaging localization, where a bounding region is the clinically useful output',
        ],
        why: 'It is the canonical structured-output vision problem, and everything difficult about it comes from the output being a set of variable size rather than from the recognition. The practical shape of the field follows from that: the accuracy-latency trade between one-stage and two-stage designs, the imbalance that motivated focal loss, and the post-processing seam that motivated set prediction. What a detector does not do is anything about identity over time or about objects it was not trained on — the first is a tracker’s job and the second is a limitation no amount of data removes.',
        featurization: [
          'Multi-scale features are effectively mandatory: after enough downsampling a small object occupies less than one cell and cannot be localized at all',
          'Match anchor scales and aspect ratios to the actual object statistics in the target domain, or recall is capped before training begins',
          'Augment with scale jitter and mosaic-style composition, which is where most of the practical accuracy on small objects comes from',
          'Keep the box parameterization relative and log-scaled for width and height, so the regression targets have comparable magnitude across object sizes',
        ],
        evaluation:
          'mAP averaged over IoU thresholds, reported separately by object scale — an aggregate number hides that small-object performance is usually several times worse. Measure latency at the deployed resolution and batch size, since detectors are almost always latency-constrained in the settings that use them.',
        pitfalls: [
          'NMS deleting one of two genuinely overlapping objects, which is inherent to the greedy rule rather than a tuning failure',
          'Anchor design copied from a public benchmark whose object statistics do not match the deployment domain',
          'Reporting mAP at a single IoU threshold, which rewards loose localization',
          'Class imbalance handled by resampling rather than by loss weighting, which changes the effective data distribution',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Backbone-dominated: GPU-hours to GPU-days depending on resolution and dataset size, with transfer from a pretrained backbone removing most of it. The heads themselves are cheap, and most of the practical training cost is augmentation and input pipeline rather than the model.',
    inferenceProfile:
      'One backbone pass plus cheap heads plus NMS. Real-time is achievable on device for one-stage designs at modest resolution, and latency scales roughly with input area — which makes resolution the primary accuracy-latency dial, more than architecture choice.',
    retrainingCadence:
      'Driven by domain shift rather than volume: new object classes, new camera positions, new lighting. Fine-tuning from the deployed weights is standard and much cheaper than retraining, and the anchor design usually survives a domain change while the score thresholds do not.',
    driftAndMonitoring: [
      'Track the score distribution of detections, which shifts before accuracy does when the input domain moves',
      'Monitor detections per image against the expected range — a sharp change usually means a domain shift rather than a change in the world',
      'Watch the small-object recall specifically, since it degrades first under resolution or camera changes and is invisible in aggregate mAP',
      'Sample and review suppressed boxes periodically, because NMS failures on crowded scenes never appear in any aggregate metric',
    ],
    productionGotchas: [
      'The score threshold and the NMS threshold are inference-time dials, not learned parameters, and they must be re-tuned for each deployment domain — a threshold tuned on a benchmark rarely transfers',
      'Box coordinate conventions differ between formats and libraries — corner versus centre, absolute versus normalized, x-y versus y-x — and a mismatch produces plausible-looking boxes in the wrong places',
      'NMS is per class in most implementations and cross-class in others; the difference is invisible until two classes genuinely overlap',
      'Letterboxing and resizing must be inverted exactly when mapping boxes back to original coordinates, and an off-by-one in that transform is a common silent error',
      'Aggregate mAP hides scale-specific failure, so small-object performance has to be monitored as its own number or its degradation goes unnoticed',
    ],
  },

  assumptions: [
    'Objects are well described by axis-aligned rectangles — false for rotated, articulated, or heavily occluded objects, which is why oriented and segmentation-based variants exist',
    'The anchor set or query count covers the object scales and shapes present, since anything outside it cannot be assigned a positive target',
    'Objects do not overlap so heavily that suppression cannot separate them, which crowded scenes routinely violate',
    'The class set is closed: an object of an unseen class is either missed or misclassified, never flagged as unknown',
    'Training and deployment share a visual domain, since a detector transfers worse across domains than a classifier does',
  ],

  pros: [
    {
      point: 'Produces localization, not just recognition',
      context:
        'What is where, which is the output almost every downstream system actually needs — a tracker, a robot, a counter. A classifier’s answer is not usable for any of them.',
    },
    {
      point: 'One-stage designs run in real time on modest hardware',
      context:
        'Which is what makes on-device and embedded deployment realistic, and why the accuracy-latency curve rather than peak accuracy is the axis the field competes on.',
    },
    {
      point: 'Transfers well from a pretrained backbone',
      context:
        'A few thousand labelled images is often enough to fine-tune a strong detector, because the backbone already knows what edges and textures are. Decisive when labelling is the bottleneck, which for detection it always is — boxes are far more expensive to annotate than labels.',
    },
    {
      point: 'IoU gives one criterion for assignment, training and evaluation',
      context:
        'Unusually coherent: the same quantity supervises, deduplicates and scores. That coherence is why IoU-based losses outperform coordinate losses, and it is worth noticing where it holds.',
    },
  ],

  cons: [
    {
      point: 'Non-maximum suppression is outside the model and cannot be trained',
      context:
        'A greedy hand-written rule whose failure on overlapping objects the network never sees and cannot compensate for. It is the clearest seam in the design, and removing it is the whole motivation for set-based detectors.',
    },
    {
      point: 'Extreme class imbalance is structural',
      context:
        'Background outnumbers objects by orders of magnitude, so a plain cross-entropy collapses to predicting nothing while the loss appears to fall. Focal loss or hard-negative mining is required rather than advisable.',
    },
    {
      point: 'Small objects are substantially harder, and aggregate metrics hide it',
      context:
        'After downsampling they occupy less than a feature cell. Feature pyramids help and do not equalize, and a single mAP number will not show that small-object performance is several times worse.',
    },
    {
      point: 'Box annotation is expensive and the class set is closed',
      context:
        'Labelling boxes costs far more than labelling images, and an object of an unseen class is silently missed rather than flagged. Open-vocabulary detection exists to address the second and does not remove the first.',
    },
  ],

  relatedSlugs: ['cnn', 'transformer', 'kalman-filter'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""IoU, box decoding and greedy NMS - transcribed.

The three pieces that turn a grid of predictions into a set of boxes. IoU is
the assignment rule, the evaluation metric and the deduplication criterion all
at once, which is unusually coherent and worth noticing.
"""


def iou(box_a, box_b):
    """Intersection over union for two boxes in (x1, y1, x2, y2) form."""
    left = max(box_a[0], box_b[0])
    top = max(box_a[1], box_b[1])
    right = min(box_a[2], box_b[2])
    bottom = min(box_a[3], box_b[3])

    # Empty intersection when the boxes do not overlap at all.
    width = max(0.0, right - left)
    height = max(0.0, bottom - top)
    intersection = width * height

    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0.0 else 0.0


def decode(anchor, offsets):
    """Offsets are corrections to an anchor, never absolute coordinates.

    Width and height are predicted in LOG space so that a factor-of-two error
    costs the same whether the object is 20 pixels or 200 - which keeps the
    regression targets comparable across scales.
    """
    anchor_width = anchor[2] - anchor[0]
    anchor_height = anchor[3] - anchor[1]
    anchor_x = anchor[0] + 0.5 * anchor_width
    anchor_y = anchor[1] + 0.5 * anchor_height

    import math

    centre_x = offsets[0] * anchor_width + anchor_x
    centre_y = offsets[1] * anchor_height + anchor_y
    width = math.exp(offsets[2]) * anchor_width
    height = math.exp(offsets[3]) * anchor_height

    return [
        centre_x - 0.5 * width,
        centre_y - 0.5 * height,
        centre_x + 0.5 * width,
        centre_y + 0.5 * height,
    ]


def non_maximum_suppression(boxes, scores, threshold=0.5):
    """Greedy deduplication: keep the best box, delete everything it overlaps.

    This is not learned and not differentiable. It is a hand-written rule
    applied after the network, which is why two genuinely overlapping objects
    lose one of their boxes - a failure the network never sees and cannot
    compensate for.
    """
    order = sorted(range(len(boxes)), key=lambda i: scores[i], reverse=True)
    kept = []

    while order:
        best = order.pop(0)
        kept.append(best)

        survivors = []
        for candidate in order:
            if iou(boxes[best], boxes[candidate]) < threshold:
                survivors.append(candidate)
        order = survivors

    return kept


def assign_targets(anchors, ground_truth, positive=0.5, negative=0.4):
    """Which anchors are responsible for which objects.

    The most consequential setting in a detector and the least discussed: if
    no anchor overlaps an object by enough to be positive, that object is
    never a training target and recall for it is capped before training even
    begins.
    """
    labels = [-1] * len(anchors)      # -1 means ignored
    matched = [None] * len(anchors)

    for a, anchor in enumerate(anchors):
        best_iou = 0.0
        best_object = None
        for g, box in enumerate(ground_truth):
            overlap = iou(anchor, box)
            if overlap > best_iou:
                best_iou = overlap
                best_object = g

        if best_iou >= positive:
            labels[a] = 1
            matched[a] = best_object
        elif best_iou < negative:
            labels[a] = 0

    return labels, matched`,
        profile: 'O(k^2) for suppression and O(anchors * objects) for assignment, in interpreter loops with a fresh survivor list built per iteration.',
      },
      'make-it-right': {
        code: `"""Detection heads - typed boxes, vectorized IoU, class-wise NMS."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class Boxes:
    """Corner format (x1, y1, x2, y2), validated once at construction.

    Coordinate conventions differ between formats and libraries - corner
    versus centre, absolute versus normalized, x-y versus y-x - and a
    mismatch produces plausible-looking boxes in the wrong places with nothing
    raised. Making the convention a type is the cheapest defence available.
    """

    corners: Matrix      # (n, 4)

    def __post_init__(self) -> None:
        if self.corners.ndim != 2 or self.corners.shape[1] != 4:
            raise ValueError(f"expected (n, 4) corners, got {self.corners.shape}")
        if (self.corners[:, 2] < self.corners[:, 0]).any():
            raise ValueError("x2 < x1: boxes are not in corner format, or x-y is transposed")
        if (self.corners[:, 3] < self.corners[:, 1]).any():
            raise ValueError("y2 < y1: boxes are not in corner format, or x-y is transposed")

    @property
    def areas(self) -> Vector:
        widths = self.corners[:, 2] - self.corners[:, 0]
        heights = self.corners[:, 3] - self.corners[:, 1]
        return widths * heights

    def iou_matrix(self, other: "Boxes") -> Matrix:
        """All pairwise IoUs at once, by broadcasting rather than a loop."""
        left = np.maximum(self.corners[:, None, 0], other.corners[None, :, 0])
        top = np.maximum(self.corners[:, None, 1], other.corners[None, :, 1])
        right = np.minimum(self.corners[:, None, 2], other.corners[None, :, 2])
        bottom = np.minimum(self.corners[:, None, 3], other.corners[None, :, 3])

        intersection = np.clip(right - left, 0.0, None) * np.clip(bottom - top, 0.0, None)
        union = self.areas[:, None] + other.areas[None, :] - intersection

        # Degenerate boxes give a zero union; guard rather than divide.
        return np.where(union > 0.0, intersection / np.maximum(union, 1e-12), 0.0)


def decode(anchors: Boxes, offsets: Matrix) -> Boxes:
    """Offsets are corrections to an anchor, never absolute coordinates.

    Width and height are predicted in LOG space so a factor-of-two error costs
    the same at any object size, which keeps regression targets comparable
    across scales. The exponential is clipped because an unbounded offset
    early in training produces an inf and poisons the whole batch.
    """
    widths = anchors.corners[:, 2] - anchors.corners[:, 0]
    heights = anchors.corners[:, 3] - anchors.corners[:, 1]
    centres_x = anchors.corners[:, 0] + 0.5 * widths
    centres_y = anchors.corners[:, 1] + 0.5 * heights

    predicted_x = offsets[:, 0] * widths + centres_x
    predicted_y = offsets[:, 1] * heights + centres_y
    predicted_w = np.exp(np.clip(offsets[:, 2], -4.0, 4.0)) * widths
    predicted_h = np.exp(np.clip(offsets[:, 3], -4.0, 4.0)) * heights

    return Boxes(
        np.stack(
            [
                predicted_x - 0.5 * predicted_w,
                predicted_y - 0.5 * predicted_h,
                predicted_x + 0.5 * predicted_w,
                predicted_y + 0.5 * predicted_h,
            ],
            axis=1,
        )
    )


def non_maximum_suppression(boxes: Boxes, scores: Vector, threshold: float = 0.5) -> NDArray:
    """Greedy deduplication within one class.

    Not learned and not differentiable: a hand-written rule applied after the
    network. Two genuinely overlapping objects lose one of their boxes, and
    the network never sees that failure so it cannot compensate for it.
    """
    if not 0.0 < threshold < 1.0:
        raise ValueError(f"threshold must lie in (0, 1), got {threshold}")

    order = np.argsort(scores)[::-1]
    kept: list[int] = []

    while order.size:
        best = order[0]
        kept.append(int(best))

        if order.size == 1:
            break

        # One vectorized IoU against every remaining candidate, rather than a
        # Python loop rebuilding a survivor list each round.
        overlaps = boxes.iou_matrix(Boxes(boxes.corners[order[1:]]))[best]
        order = order[1:][overlaps < threshold]

    return np.asarray(kept, dtype=np.int64)


def batched_nms(
    boxes: Boxes, scores: Vector, labels: NDArray, threshold: float = 0.5
) -> NDArray:
    """Class-wise suppression, which is what almost every implementation
    means by NMS.

    Cross-class suppression would delete a person standing in front of a car.
    The difference is invisible until two classes genuinely overlap, which is
    exactly when it matters.
    """
    kept: list[NDArray] = []
    for label in np.unique(labels):
        rows = np.flatnonzero(labels == label)
        selected = non_maximum_suppression(Boxes(boxes.corners[rows]), scores[rows], threshold)
        kept.append(rows[selected])

    return np.concatenate(kept) if kept else np.empty(0, dtype=np.int64)`,
        rationale:
          'The box format becomes a validated type rather than a bare array, which is the cheapest available defence against the error that actually happens in detection code: coordinate conventions differ between formats and libraries, and a mismatch produces plausible-looking boxes in the wrong places with nothing raised. Pairwise IoU becomes a broadcast matrix rather than a double loop, and the suppression loop uses it to filter survivors in one vectorized step instead of rebuilding a list. Suppression also becomes explicitly class-wise, since cross-class suppression would delete a person standing in front of a car — a difference invisible until two classes genuinely overlap. The decode clips the exponential, because an unbounded offset early in training produces an inf that poisons the batch.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(k^2) suppression with each round vectorized, and O(anchors * objects) assignment as one broadcast matrix.',
      },
      'make-it-fast': {
        code: `"""Detection post-processing - preallocated, sorted once, area cached."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class DetectionPostProcessor:
    """Suppression over a batch, with the per-round allocations removed.

    The naive loop rebuilds an index array and recomputes areas on every
    iteration. Neither is necessary: the areas are fixed once the boxes exist,
    and survivors can be tracked in a preallocated boolean mask instead of a
    shrinking array.

    Score thresholding first is the change that matters most in practice.
    Suppression is O(k^2) in surviving boxes, so discarding low-confidence
    candidates before it - typically 99% of them - is a far larger saving than
    anything done inside the loop.
    """

    def __init__(self, max_boxes: int) -> None:
        # Buffers sized once for the worst case, reused across every image.
        self._alive = np.empty(max_boxes, dtype=bool)
        self._kept = np.empty(max_boxes, dtype=np.int64)
        self._max_boxes = max_boxes

    def suppress(
        self,
        corners: Matrix,
        scores: Vector,
        score_threshold: float = 0.05,
        iou_threshold: float = 0.5,
    ) -> NDArray:
        # Cheap filter before the quadratic step: this typically removes 99%
        # of candidates and is worth more than any inner-loop optimization.
        surviving = np.flatnonzero(scores > score_threshold)
        if surviving.size == 0:
            return np.empty(0, dtype=np.int64)

        boxes = np.ascontiguousarray(corners[surviving], dtype=np.float64)
        order = surviving[np.argsort(scores[surviving])[::-1]]
        boxes = np.ascontiguousarray(corners[order], dtype=np.float64)

        # Areas computed once for the whole set rather than per comparison.
        widths = boxes[:, 2] - boxes[:, 0]
        heights = boxes[:, 3] - boxes[:, 1]
        areas = widths * heights

        n = order.size
        alive = self._alive[:n]
        alive.fill(True)
        count = 0

        for index in range(n):
            if not alive[index]:
                continue

            self._kept[count] = order[index]
            count += 1

            if index + 1 >= n:
                break

            # One vectorized IoU against every remaining live candidate,
            # written through in place so no per-round temporary is created.
            rest = slice(index + 1, n)
            left = np.maximum(boxes[index, 0], boxes[rest, 0])
            top = np.maximum(boxes[index, 1], boxes[rest, 1])
            right = np.minimum(boxes[index, 2], boxes[rest, 2])
            bottom = np.minimum(boxes[index, 3], boxes[rest, 3])

            overlap = np.clip(right - left, 0.0, None)
            overlap *= np.clip(bottom - top, 0.0, None)

            union = areas[index] + areas[rest] - overlap
            np.divide(overlap, np.maximum(union, 1e-12), out=overlap)

            # Suppression is a mask update, not an array rebuild.
            alive[rest] &= overlap < iou_threshold

        return self._kept[:count].copy()

    def suppress_by_class(
        self,
        corners: Matrix,
        scores: Vector,
        labels: NDArray,
        score_threshold: float = 0.05,
        iou_threshold: float = 0.5,
    ) -> NDArray:
        """Class-wise suppression by coordinate offsetting.

        Rather than looping over classes, shift each class's boxes into a
        disjoint region of the coordinate plane. Boxes of different classes
        then have zero overlap by construction, so ONE suppression pass
        produces the same result as one pass per class.
        """
        if corners.size == 0:
            return np.empty(0, dtype=np.int64)

        span = float(corners.max()) - float(corners.min()) + 1.0
        shifted = corners + (labels.astype(np.float64) * span)[:, None]
        return self.suppress(shifted, scores, score_threshold, iou_threshold)`,
        rationale:
          'The largest saving is not inside the loop: suppression is quadratic in surviving boxes, so applying the score threshold first — which typically discards 99% of candidates — dominates anything done to the inner step. Beyond that, areas are computed once rather than per comparison, survivors are tracked in a preallocated boolean mask rather than by rebuilding an index array each round, and the IoU is written through in place. Class-wise suppression stops being a loop over classes and becomes a coordinate offset that pushes each class into a disjoint region, so one pass produces the same result — the trick every production implementation uses.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The alive mask and the kept-index buffer are sized once for the worst case and reused across images, and the IoU is computed through in-place operations rather than allocating a temporary per round.',
            tradeoff: 'Fixes a maximum box count at construction and makes the object non-reentrant, so two threads post-processing through one instance would corrupt each other.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Each round compares the current best against every remaining candidate in one vectorized pass instead of a Python loop over candidates.',
            tradeoff: 'The outer loop remains sequential and cannot be vectorized — suppression is inherently order-dependent — so this improves the constant, not the O(k^2).',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Boxes are gathered into one contiguous float64 block in score order, so every slice in the loop is a sequential read rather than a strided gather.',
            tradeoff: 'Costs a copy of the surviving boxes up front, which is only worthwhile because the score threshold has already reduced them to a small fraction.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(k^2) in boxes surviving the score threshold, with the threshold doing most of the work. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// IoU, box decoding and greedy NMS - transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

struct Box {
  double x1 = 0.0;
  double y1 = 0.0;
  double x2 = 0.0;
  double y2 = 0.0;
};

// Intersection over union - the assignment rule, the evaluation metric and
// the deduplication criterion, all the same quantity.
double Iou(const Box& a, const Box& b) {
  const double left = std::max(a.x1, b.x1);
  const double top = std::max(a.y1, b.y1);
  const double right = std::min(a.x2, b.x2);
  const double bottom = std::min(a.y2, b.y2);

  // Empty intersection when the boxes do not overlap at all.
  const double width = std::max(0.0, right - left);
  const double height = std::max(0.0, bottom - top);
  const double intersection = width * height;

  const double area_a = std::max(0.0, a.x2 - a.x1) * std::max(0.0, a.y2 - a.y1);
  const double area_b = std::max(0.0, b.x2 - b.x1) * std::max(0.0, b.y2 - b.y1);
  const double denominator = area_a + area_b - intersection;

  return denominator > 0.0 ? intersection / denominator : 0.0;
}

// Offsets are corrections to an anchor, never absolute coordinates.
//
// Width and height are predicted in LOG space so a factor-of-two error costs
// the same whether the object is 20 pixels or 200 - which keeps the
// regression targets comparable across scales.
Box Decode(const Box& anchor, const std::vector<double>& offsets) {
  const double anchor_width = anchor.x2 - anchor.x1;
  const double anchor_height = anchor.y2 - anchor.y1;
  const double anchor_x = anchor.x1 + 0.5 * anchor_width;
  const double anchor_y = anchor.y1 + 0.5 * anchor_height;

  const double centre_x = offsets[0] * anchor_width + anchor_x;
  const double centre_y = offsets[1] * anchor_height + anchor_y;
  const double width = std::exp(offsets[2]) * anchor_width;
  const double height = std::exp(offsets[3]) * anchor_height;

  return Box{centre_x - 0.5 * width, centre_y - 0.5 * height,
             centre_x + 0.5 * width, centre_y + 0.5 * height};
}

// Greedy deduplication: keep the best box, delete everything it overlaps.
//
// Not learned and not differentiable - a hand-written rule applied after the
// network. Two genuinely overlapping objects lose one of their boxes, and the
// network never sees that failure so it cannot compensate for it.
std::vector<std::size_t> NonMaximumSuppression(const std::vector<Box>& boxes,
                                               const std::vector<double>& scores,
                                               double threshold) {
  std::vector<std::size_t> order(boxes.size());
  for (std::size_t i = 0; i < order.size(); ++i) order[i] = i;
  std::sort(order.begin(), order.end(),
            [&](std::size_t a, std::size_t b) { return scores[a] > scores[b]; });

  std::vector<std::size_t> kept;

  while (!order.empty()) {
    const std::size_t best = order.front();
    kept.push_back(best);
    order.erase(order.begin());

    std::vector<std::size_t> survivors;
    for (const std::size_t candidate : order) {
      if (Iou(boxes[best], boxes[candidate]) < threshold) survivors.push_back(candidate);
    }
    order = survivors;
  }

  return kept;
}`,
        profile: 'O(k^2) suppression with a fresh survivor vector allocated per round, plus an erase from the front that shifts the whole array.',
      },
      'make-it-right': {
        code: `// Detection post-processing - validated boxes, cached areas, alive mask.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

// Corner format, validated at construction.
//
// Coordinate conventions differ between formats and libraries - corner versus
// centre, absolute versus normalized, x-y versus y-x - and a mismatch produces
// plausible-looking boxes in the wrong places with nothing raised. Making the
// convention a type is the cheapest defence available.
struct CornerBox {
  double x1;
  double y1;
  double x2;
  double y2;

  CornerBox(double left, double top, double right, double bottom)
      : x1(left), y1(top), x2(right), y2(bottom) {
    if (x2 < x1) throw std::invalid_argument("x2 < x1: not corner format, or x-y transposed");
    if (y2 < y1) throw std::invalid_argument("y2 < y1: not corner format, or x-y transposed");
  }

  [[nodiscard]] double Area() const noexcept { return (x2 - x1) * (y2 - y1); }
};

[[nodiscard]] inline double Iou(const CornerBox& a, double area_a, const CornerBox& b,
                                double area_b) noexcept {
  const double width = std::max(0.0, std::min(a.x2, b.x2) - std::max(a.x1, b.x1));
  const double height = std::max(0.0, std::min(a.y2, b.y2) - std::max(a.y1, b.y1));
  const double intersection = width * height;
  const double denominator = area_a + area_b - intersection;
  return denominator > 0.0 ? intersection / denominator : 0.0;
}

// Greedy suppression within one class.
//
// Class-wise is what almost every implementation means by NMS: cross-class
// suppression would delete a person standing in front of a car, and the
// difference is invisible until two classes genuinely overlap.
class Suppressor {
 public:
  explicit Suppressor(std::size_t max_boxes)
      : alive_(max_boxes, false), order_(max_boxes, 0), kept_(max_boxes, 0) {}

  [[nodiscard]] std::span<const std::size_t> Suppress(std::span<const CornerBox> boxes,
                                                      std::span<const double> scores,
                                                      double iou_threshold,
                                                      double score_threshold) {
    if (boxes.size() != scores.size()) {
      throw std::invalid_argument("boxes and scores describe different counts");
    }
    if (iou_threshold <= 0.0 || iou_threshold >= 1.0) {
      throw std::invalid_argument("iou threshold must lie in (0, 1)");
    }

    // Cheap filter before the quadratic step: this typically removes the
    // overwhelming majority of candidates, and is worth more than anything
    // done inside the loop below.
    std::size_t n = 0;
    for (std::size_t i = 0; i < boxes.size(); ++i) {
      if (scores[i] > score_threshold) order_[n++] = i;
    }
    if (n == 0) return {};

    std::sort(order_.begin(), order_.begin() + static_cast<long>(n),
              [&](std::size_t a, std::size_t b) { return scores[a] > scores[b]; });

    // Areas computed once for the whole set rather than per comparison.
    areas_.assign(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) areas_[i] = boxes[order_[i]].Area();

    std::fill(alive_.begin(), alive_.begin() + static_cast<long>(n), true);
    std::size_t count = 0;

    for (std::size_t i = 0; i < n; ++i) {
      if (!alive_[i]) continue;
      kept_[count++] = order_[i];

      // Suppression is a mask update, not an array rebuild - which removes
      // the per-round allocation and the front-erase from the previous form.
      for (std::size_t j = i + 1; j < n; ++j) {
        if (!alive_[j]) continue;
        if (Iou(boxes[order_[i]], areas_[i], boxes[order_[j]], areas_[j]) >= iou_threshold) {
          alive_[j] = false;
        }
      }
    }

    return {kept_.data(), count};
  }

 private:
  std::vector<char> alive_;         // char rather than bool: vector<bool> is a bitset
  std::vector<std::size_t> order_;
  std::vector<std::size_t> kept_;
  std::vector<double> areas_;
};`,
        rationale:
          'Three changes. The box gains a validated corner-format type, which is the cheapest defence against the error detection code actually makes — conventions differ between libraries and a mismatch yields plausible boxes in the wrong places with nothing raised. Suppression stops rebuilding a survivor vector and erasing from the front, and becomes a mask update over a fixed order, removing an allocation and an O(k) shift per round. And the score threshold moves before the quadratic step, which is the largest saving available: it typically discards the overwhelming majority of candidates before any pairwise comparison happens. Areas are cached once rather than recomputed per comparison, and the mask uses char rather than vector<bool>, which is a bitset and not what is wanted here.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(k^2) in boxes surviving the score threshold, with one allocation per call rather than per round.',
      },
      'make-it-fast': {
        code: `// Detection post-processing - classes suppressed in parallel, SoA layout.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <vector>

// Struct-of-arrays rather than an array of box structs.
//
// The suppression inner loop reads four coordinates and one area per
// candidate, and compares them against a fixed reference. Splitting the
// coordinates apart means each comparison streams four contiguous arrays,
// which the compiler can vectorize - where an array of 4-double structs would
// stride.
struct BoxSoA {
  std::vector<float> x1, y1, x2, y2, area;

  [[nodiscard]] std::size_t size() const noexcept { return x1.size(); }
};

// __restrict tells the compiler the coordinate arrays and the alive mask
// cannot alias, which is what allows the comparison loop to vectorize at all.
void SuppressAgainst(std::size_t best, std::size_t begin, std::size_t end,
                     const float* __restrict x1, const float* __restrict y1,
                     const float* __restrict x2, const float* __restrict y2,
                     const float* __restrict area, std::uint8_t* __restrict alive,
                     float threshold) {
  const float bx1 = x1[best];
  const float by1 = y1[best];
  const float bx2 = x2[best];
  const float by2 = y2[best];
  const float barea = area[best];

  for (std::size_t j = begin; j < end; ++j) {
    const float width = std::max(0.0F, std::min(bx2, x2[j]) - std::max(bx1, x1[j]));
    const float height = std::max(0.0F, std::min(by2, y2[j]) - std::max(by1, y1[j]));
    const float intersection = width * height;
    const float denominator = barea + area[j] - intersection;

    // Branchless: the mask is multiplied rather than conditionally written,
    // so the loop has no data-dependent branch to mispredict.
    const float overlap = denominator > 0.0F ? intersection / denominator : 0.0F;
    alive[j] &= static_cast<std::uint8_t>(overlap < threshold);
  }
}

// Per-class suppression, run across cores.
//
// Classes are independent by construction - class-wise NMS never compares a
// person box against a car box - so this is an embarrassingly parallel loop
// with no shared state and nothing to merge.
std::vector<std::vector<std::size_t>> SuppressByClass(
    const std::vector<BoxSoA>& per_class, const std::vector<std::vector<float>>& scores,
    float threshold) {
  std::vector<std::vector<std::size_t>> kept(per_class.size());

#pragma omp parallel for schedule(dynamic)
  for (std::size_t c = 0; c < per_class.size(); ++c) {
    const BoxSoA& boxes = per_class[c];
    const std::size_t n = boxes.size();

    std::vector<std::size_t> order(n);
    for (std::size_t i = 0; i < n; ++i) order[i] = i;
    std::sort(order.begin(), order.end(),
              [&](std::size_t a, std::size_t b) { return scores[c][a] > scores[c][b]; });

    std::vector<std::uint8_t> alive(n, 1);

    for (std::size_t i = 0; i < n; ++i) {
      if (!alive[order[i]]) continue;
      kept[c].push_back(order[i]);

      SuppressAgainst(order[i], i + 1, n, boxes.x1.data(), boxes.y1.data(), boxes.x2.data(),
                      boxes.y2.data(), boxes.area.data(), alive.data(), threshold);
    }
  }

  return kept;
}`,
        rationale:
          'Suppression is class-wise by construction — a person box is never compared against a car box — so classes are fully independent and the outer loop is embarrassingly parallel with nothing to merge. Within a class the comparison loop becomes the target: the box struct is split into a struct of arrays so each comparison streams four contiguous coordinate arrays rather than striding across an array of structs, the mask update is branchless so there is no data-dependent branch to mispredict, and aliasing hints let the compiler vectorize the whole thing. Coordinates drop to float, which halves the traffic on a loop that is entirely memory-bound.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Class-wise suppression means classes never interact, so each iteration reads its own boxes and writes its own result vector with no synchronization.',
            tradeoff: 'Detection classes are extremely unbalanced — one class often holds most of the boxes — so a dynamic schedule is needed and the speedup is bounded by the largest class rather than the average.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The comparison loop is a straight contiguous pass of min, max, multiply and compare over float arrays, which the compiler vectorizes without intrinsics once the layout and aliasing permit it.',
            tradeoff: 'The branchless mask update computes the IoU for candidates already suppressed, so it does more arithmetic than the branching version — worth it only because the branch was unpredictable.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the alive mask may alias the coordinate arrays and reload after every write, which blocks vectorization entirely.',
            tradeoff: '__restrict is an unchecked promise: overlapping buffers produce silently wrong suppression, which is worse than being slow because the output still looks like a plausible set of boxes.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(k^2) per class across cores, with the inner comparison vectorized. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! IoU, box decoding and greedy NMS - transcribed.

#[derive(Debug, Clone, Copy)]
pub struct Box {
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
}

/// Intersection over union - the assignment rule, the evaluation metric and
/// the deduplication criterion, all the same quantity.
pub fn iou(a: &Box, b: &Box) -> f64 {
    let left = a.x1.max(b.x1);
    let top = a.y1.max(b.y1);
    let right = a.x2.min(b.x2);
    let bottom = a.y2.min(b.y2);

    // Empty intersection when the boxes do not overlap at all.
    let width = (right - left).max(0.0);
    let height = (bottom - top).max(0.0);
    let intersection = width * height;

    let area_a = (a.x2 - a.x1).max(0.0) * (a.y2 - a.y1).max(0.0);
    let area_b = (b.x2 - b.x1).max(0.0) * (b.y2 - b.y1).max(0.0);
    let denominator = area_a + area_b - intersection;

    if denominator > 0.0 { intersection / denominator } else { 0.0 }
}

/// Offsets are corrections to an anchor, never absolute coordinates.
///
/// Width and height are predicted in LOG space so a factor-of-two error costs
/// the same whether the object is 20 pixels or 200 - which keeps the
/// regression targets comparable across scales.
pub fn decode(anchor: &Box, offsets: &[f64; 4]) -> Box {
    let anchor_width = anchor.x2 - anchor.x1;
    let anchor_height = anchor.y2 - anchor.y1;
    let anchor_x = anchor.x1 + 0.5 * anchor_width;
    let anchor_y = anchor.y1 + 0.5 * anchor_height;

    let centre_x = offsets[0] * anchor_width + anchor_x;
    let centre_y = offsets[1] * anchor_height + anchor_y;
    let width = offsets[2].exp() * anchor_width;
    let height = offsets[3].exp() * anchor_height;

    Box {
        x1: centre_x - 0.5 * width,
        y1: centre_y - 0.5 * height,
        x2: centre_x + 0.5 * width,
        y2: centre_y + 0.5 * height,
    }
}

/// Greedy deduplication: keep the best box, delete everything it overlaps.
///
/// Not learned and not differentiable - a hand-written rule applied after the
/// network. Two genuinely overlapping objects lose one of their boxes, and the
/// network never sees that failure so it cannot compensate for it.
pub fn non_maximum_suppression(boxes: &[Box], scores: &[f64], threshold: f64) -> Vec<usize> {
    let mut order: Vec<usize> = (0..boxes.len()).collect();
    order.sort_by(|&a, &b| scores[b].total_cmp(&scores[a]));

    let mut kept = Vec::new();

    while !order.is_empty() {
        let best = order.remove(0);
        kept.push(best);

        let mut survivors = Vec::new();
        for &candidate in &order {
            if iou(&boxes[best], &boxes[candidate]) < threshold {
                survivors.push(candidate);
            }
        }
        order = survivors;
    }

    kept
}`,
        profile: 'O(k^2) suppression with a fresh survivor Vec per round and a remove-from-front that shifts the whole array each time.',
      },
      'make-it-right': {
        code: `//! Detection post-processing - validated boxes, cached areas, alive mask.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum BoxError {
    Transposed { index: usize },
    ShapeMismatch { boxes: usize, scores: usize },
    Threshold { value: f64 },
}

impl fmt::Display for BoxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Transposed { index } => write!(
                f,
                "box {index} has x2 < x1 or y2 < y1: not corner format, or x-y is transposed"
            ),
            Self::ShapeMismatch { boxes, scores } => {
                write!(f, "{boxes} boxes but {scores} scores")
            }
            Self::Threshold { value } => write!(f, "threshold must lie in (0, 1), got {value}"),
        }
    }
}

impl std::error::Error for BoxError {}

/// An IoU threshold. A newtype because the score threshold and the IoU
/// threshold are both bare f64 in every suppression signature and both live
/// in (0, 1) - which is exactly the shape that gets transposed silently.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct IouThreshold(f64);

impl IouThreshold {
    pub fn new(value: f64) -> Result<Self, BoxError> {
        if !value.is_finite() || value <= 0.0 || value >= 1.0 {
            return Err(BoxError::Threshold { value });
        }
        Ok(Self(value))
    }
}

/// Corner format, validated at construction.
///
/// Coordinate conventions differ between formats and libraries - corner versus
/// centre, absolute versus normalized, x-y versus y-x - and a mismatch
/// produces plausible-looking boxes in the wrong places with nothing raised.
/// Making the convention a type is the cheapest defence available.
#[derive(Debug, Clone, Copy)]
pub struct CornerBox {
    pub x1: f64,
    pub y1: f64,
    pub x2: f64,
    pub y2: f64,
}

impl CornerBox {
    pub fn new(x1: f64, y1: f64, x2: f64, y2: f64, index: usize) -> Result<Self, BoxError> {
        if x2 < x1 || y2 < y1 {
            return Err(BoxError::Transposed { index });
        }
        Ok(Self { x1, y1, x2, y2 })
    }

    #[inline]
    #[must_use]
    pub fn area(&self) -> f64 {
        (self.x2 - self.x1) * (self.y2 - self.y1)
    }

    #[inline]
    #[must_use]
    pub fn iou(&self, other: &Self, own_area: f64, other_area: f64) -> f64 {
        let width = (self.x2.min(other.x2) - self.x1.max(other.x1)).max(0.0);
        let height = (self.y2.min(other.y2) - self.y1.max(other.y1)).max(0.0);
        let intersection = width * height;
        let denominator = own_area + other_area - intersection;

        if denominator > 0.0 { intersection / denominator } else { 0.0 }
    }
}

/// Greedy suppression within one class.
///
/// Class-wise is what almost every implementation means by NMS: cross-class
/// suppression would delete a person standing in front of a car, and the
/// difference is invisible until two classes genuinely overlap.
pub fn non_maximum_suppression(
    boxes: &[CornerBox],
    scores: &[f64],
    iou_threshold: IouThreshold,
    score_threshold: f64,
) -> Result<Vec<usize>, BoxError> {
    if boxes.len() != scores.len() {
        return Err(BoxError::ShapeMismatch { boxes: boxes.len(), scores: scores.len() });
    }

    // Cheap filter before the quadratic step: this typically removes the
    // overwhelming majority of candidates, and is worth more than anything
    // done inside the loop below.
    let mut order: Vec<usize> = (0..boxes.len())
        .filter(|&i| scores[i] > score_threshold)
        .collect();
    if order.is_empty() {
        return Ok(Vec::new());
    }
    order.sort_unstable_by(|&a, &b| scores[b].total_cmp(&scores[a]));

    // Areas computed once for the whole set rather than per comparison.
    let areas: Vec<f64> = order.iter().map(|&i| boxes[i].area()).collect();

    // Suppression is a mask update, not an array rebuild - which removes the
    // per-round allocation and the front-removal from the previous form.
    let mut alive = vec![true; order.len()];
    let mut kept = Vec::with_capacity(order.len());

    for i in 0..order.len() {
        if !alive[i] {
            continue;
        }
        kept.push(order[i]);

        for j in (i + 1)..order.len() {
            if !alive[j] {
                continue;
            }
            if boxes[order[i]].iou(&boxes[order[j]], areas[i], areas[j]) >= iou_threshold.0 {
                alive[j] = false;
            }
        }
    }

    Ok(kept)
}
`,
        rationale:
          'The box gains a validated corner-format type and the threshold a newtype — the score threshold and the IoU threshold are both bare f64 in (0, 1) in every suppression signature, which is exactly the shape that gets transposed with no error anywhere. Suppression stops rebuilding a survivor vector and removing from the front, becoming a mask update over a fixed order, which removes an allocation and an O(k) shift per round. The score threshold moves before the quadratic step, which is the largest single saving available. Areas are computed once rather than per comparison.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(k^2) in boxes surviving the score threshold, with one allocation per call rather than per round.',
      },
      'make-it-fast': {
        code: `//! Detection post-processing - classes suppressed in parallel, SoA layout.

use rayon::prelude::*;

/// Struct-of-arrays rather than a slice of box structs.
///
/// The suppression inner loop reads four coordinates and one area per
/// candidate and compares them against a fixed reference. Splitting the
/// coordinates apart means each comparison streams four contiguous slices,
/// which the compiler can vectorize - where a slice of 4-field structs would
/// stride across memory it does not need.
///
/// f32 rather than f64: the loop is entirely memory-bound, and box
/// coordinates in pixel space have nothing like 52 bits of meaningful
/// precision.
pub struct BoxSoA {
    pub x1: Vec<f32>,
    pub y1: Vec<f32>,
    pub x2: Vec<f32>,
    pub y2: Vec<f32>,
    pub area: Vec<f32>,
}

impl BoxSoA {
    #[must_use]
    pub fn len(&self) -> usize {
        self.x1.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.x1.is_empty()
    }

    /// Suppress every live candidate after \`best\` against it.
    ///
    /// Branchless: the mask is multiplied rather than conditionally written,
    /// so the loop carries no data-dependent branch to mispredict - which on
    /// detection output, where suppression decisions are close to random, is
    /// worth more than the arithmetic it wastes.
    #[inline]
    fn suppress_against(&self, best: usize, begin: usize, alive: &mut [bool], threshold: f32) {
        let (bx1, by1, bx2, by2, barea) =
            (self.x1[best], self.y1[best], self.x2[best], self.y2[best], self.area[best]);

        for j in begin..self.len() {
            let width = (self.x2[j].min(bx2) - self.x1[j].max(bx1)).max(0.0);
            let height = (self.y2[j].min(by2) - self.y1[j].max(by1)).max(0.0);
            let intersection = width * height;
            let denominator = barea + self.area[j] - intersection;

            let overlap = if denominator > 0.0 { intersection / denominator } else { 0.0 };
            alive[j] &= overlap < threshold;
        }
    }

    /// Greedy suppression within this class.
    #[must_use]
    pub fn suppress(&self, scores: &[f32], iou_threshold: f32, score_threshold: f32) -> Vec<usize> {
        let mut order: Vec<usize> = (0..self.len())
            .filter(|&i| scores[i] > score_threshold)
            .collect();
        order.sort_unstable_by(|&a, &b| scores[b].total_cmp(&scores[a]));

        let mut alive = vec![true; self.len()];
        let mut kept = Vec::with_capacity(order.len());

        for (position, &index) in order.iter().enumerate() {
            if !alive[index] {
                continue;
            }
            kept.push(index);
            self.suppress_against(index, position + 1, &mut alive, iou_threshold);
        }

        kept
    }
}

/// Per-class suppression across cores.
///
/// Classes are independent by construction - class-wise NMS never compares a
/// person box against a car box - so this is an embarrassingly parallel map
/// with no shared state and nothing to merge.
#[must_use]
pub fn suppress_by_class(
    per_class: &[BoxSoA],
    scores: &[Vec<f32>],
    iou_threshold: f32,
    score_threshold: f32,
) -> Vec<Vec<usize>> {
    per_class
        .par_iter()
        .zip(scores.par_iter())
        .map(|(boxes, class_scores)| boxes.suppress(class_scores, iou_threshold, score_threshold))
        .collect()
}
`,
        rationale:
          'Suppression is class-wise by construction, so classes never interact and the outer loop is a parallel map with nothing to merge. Within a class the box struct is split into a struct of arrays, so each comparison streams four contiguous slices rather than striding across a slice of structs, and the mask update is branchless — on detection output the suppression decision is close to random, so removing the mispredicted branch is worth more than the arithmetic it wastes. Coordinates drop to f32 because the loop is entirely memory-bound and pixel-space boxes have nothing like 52 bits of meaningful precision.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Class-wise suppression means classes are fully independent, so each is a parallel map entry reading its own boxes and producing its own result with no locking.',
            tradeoff: 'Detection classes are extremely unbalanced — one class often holds most of the boxes — so the speedup is bounded by the largest class rather than the average, and small classes finish immediately.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Struct-of-arrays makes each coordinate its own contiguous slice, so the inner comparison streams four sequential reads the prefetcher can follow and the compiler can vectorize.',
            tradeoff: 'Building the SoA requires a transposition from whatever the detector head produced, which is an extra O(k) pass — worthwhile only because the comparison loop is quadratic.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The suppression comparison is the entire inner loop and is called once per kept box; inlining lets the reference coordinates stay in registers across it rather than reloading per call.',
            tradeoff: 'Inlining a loop this size into every call site grows the instruction footprint, and with many classes the code path is entered often enough that instruction-cache pressure becomes measurable.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(k^2) per class across cores, with the inner comparison vectorized. Illustrative, not a measured benchmark.',
      },
    },
  },
};
