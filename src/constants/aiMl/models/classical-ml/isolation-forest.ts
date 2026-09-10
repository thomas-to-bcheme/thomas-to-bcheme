import type { AiMlModel } from '../../types';

/**
 * Isolation Forest — the entry that inverts the usual approach to anomalies.
 *
 * Closes the trees-and-ensembles group as the most specialized rung: it keeps
 * the ensemble-of-random-trees structure and throws away the thing that made a
 * tree a tree — the split criterion. Nothing is fitted to a label, and nothing
 * is fitted to a density either. It is worth reading directly after
 * decision-tree and random-forest, both of which explicitly defer anomaly
 * detection here.
 */
export const ISOLATION_FOREST: AiMlModel = {
  slug: 'isolation-forest',
  name: 'Isolation Forest',
  aliases: ['iForest', 'Isolation-based anomaly detection', 'Extended Isolation Forest (variant)'],
  category: 'classical-ml',
  group: 'trees-and-ensembles',
  kind: 'model',

  paradigms: ['unsupervised'],
  taskTypes: ['anomaly-detection'],
  paradigmNote:
    'Unsupervised in the strong sense: it uses neither labels nor a fitted density. The splits are chosen at random, so the only thing learned is how hard each point is to separate from the rest — which is why it needs no distance metric and no feature scaling.',

  intuition:
    'Every other detector in this section models what normal looks like and flags whatever falls outside. This one models the anomalies directly, from a single observation: anomalies are few and different, so a random split is more likely to separate one from the pack than to separate two ordinary points from each other. Cut the data with random splits until every point is alone, and record how many cuts each one needed. Outliers fall out early, in a handful of cuts; points inside a dense cluster survive many. The depth at which a point becomes alone IS the anomaly score, and no density was ever estimated to get it.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        's(\\mathbf{x}, \\psi) = 2^{-\\frac{\\mathbb{E}[h(\\mathbf{x})]}{c(\\psi)}}, \\qquad c(\\psi) = 2H(\\psi - 1) - \\frac{2(\\psi - 1)}{\\psi}',
      symbols: [
        { symbol: 'h(\\mathbf{x})', meaning: 'path length — the number of splits needed to isolate x in one tree' },
        { symbol: '\\mathbb{E}[h(\\mathbf{x})]', meaning: 'average path length across the forest, which is what the ensemble is for' },
        { symbol: 'c(\\psi)', meaning: 'expected path length in a random binary tree over psi points — the normalizer that makes scores comparable across subsample sizes' },
        { symbol: '\\psi', meaning: 'subsample size per tree, conventionally 256 and deliberately small' },
        { symbol: 's', meaning: 'score in (0, 1): near 1 is an anomaly, near 0.5 is unremarkable, well below 0.5 means the point sits deep inside a cluster' },
      ],
    },
    reading:
      'There is no training objective — nothing here is minimized, and the expression defines a scoring rule rather than something the fit pursues. Read it as a comparison: how deep did this point sit, against how deep a point in a random tree of this size would be expected to sit. Dividing by c(psi) is what makes the number interpretable rather than a raw depth, and it is why scores from forests built on different subsample sizes can be compared at all. The exponential base of two turns the ratio into a bounded score, which is convenience rather than theory.',
  },

  optimization: {
    method: 'None — an ensemble of trees grown by uniformly random splits on small subsamples',
    updateRule: {
      formula:
        'j \\sim \\mathcal{U}\\{1, \\dots, d\\}, \\quad t \\sim \\mathcal{U}\\!\\left(\\min_j, \\max_j\\right), \\qquad h(\\mathbf{x}) = \\text{depth at which } \\mathbf{x} \\text{ becomes alone}',
      symbols: [
        { symbol: 'j', meaning: 'the split feature, drawn uniformly at random — no criterion is evaluated' },
        { symbol: 't', meaning: 'the threshold, drawn uniformly between the min and max of that feature within the node' },
        { symbol: '\\min_j, \\max_j', meaning: 'the range within the current node, not the global range — which is what makes splits adapt to local extent' },
        { symbol: 'h(\\mathbf{x})', meaning: 'the path length, with a correction term added when a node is truncated at the depth limit' },
      ],
    },
    rationale:
      'Nothing is optimized, and that is the design rather than a shortcut. Evaluating a criterion at every split is what makes tree building expensive; drawing the split uniformly makes it O(1), so a tree costs a single pass and the whole forest is linear in the data. Two choices look like limitations and are not. Trees are grown on small subsamples — 256 points is the standard, and using more usually makes the detector worse, because a large subsample lets normal points crowd around anomalies until they no longer isolate early. And trees are truncated at roughly log2(psi) depth, since a point still unresolved by then is already deep inside normal and its exact depth carries no information; the truncation is corrected analytically rather than by growing further.',
    hyperparameters: [
      { name: 'max_samples (psi)', role: 'Subsample size per tree. The counterintuitive one: 256 is the standard default and increasing it typically degrades detection, because swamping and masking both worsen with more points per tree', typicalRange: '256, and rarely worth changing' },
      { name: 'n_estimators', role: 'Number of trees. Averages the path length, so more is monotonically better and only costs time', typicalRange: '100 to 300; the score curve is flat well before 200' },
      { name: 'contamination', role: 'Not a model parameter at all — it converts scores into labels by picking a quantile. Treat it as the alert budget it is', typicalRange: 'set from the operational alert rate, not estimated' },
      { name: 'max_features', role: 'Features considered per tree. Below 1.0 it helps on wide data, where most features are irrelevant to any given anomaly' },
    ],
    convergence:
      'Nothing iterates; the score converges statistically as trees are added, and adding trees cannot make it worse. The failure modes are structural and worth naming precisely. Splits are axis-aligned, so an anomaly that is unusual only in a correlated combination of features — off the diagonal of an elongated cloud, but within range on every axis individually — is invisible, and the extended isolation forest exists to fix exactly this by cutting with random hyperplanes instead. Masking: a tight cluster of anomalies isolates no faster than a cluster of normal points, so a coordinated attack scores as normal. Swamping: normal points sitting near a dense anomaly region get dragged into early isolation and produce false positives. Both are why the subsample is small — fewer points per tree means less crowding, which is the opposite of the usual more-data intuition.',
    complexity:
      'Training: O(t · psi · log psi) — independent of n entirely, because each tree only ever sees psi points. That is the headline property: the fit does not get slower as the dataset grows. Memory is O(t · psi), a few hundred tiny trees, so the model is kilobytes. Scoring: O(t · log psi) per point, a few hundred short tree walks with no arithmetic beyond a comparison, which makes it viable at streaming volumes where a distance- or density-based detector is not.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'It produces an outlier score, never a value for a future period; applying it to a series means finding anomalies within it, which is the anomaly-detection domain rather than this one.',
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Fit an ensemble of random trees on small subsamples of the data and score each point by its average path length, normalized against the expected depth for that subsample size. There is no reference distribution to specify, no metric to choose, and no scaling step — the score comes from how quickly random cuts separate the point from everything else.',
        where: [
          'High-volume fraud and abuse screening, where linear cost and a tiny model matter more than the last point of recall',
          'Infrastructure and application telemetry, scoring metrics that arrive faster than any density model could be refitted',
          'Data-quality screening across wide tables of mixed-scale numeric columns, where scaling every column correctly is not realistic',
          'The first detector to try on a new unlabelled problem, because it needs almost no decisions to be made first',
        ],
        why: 'It is the default for a specific and defensible reason: it is the only detector here whose cost does not grow with the dataset, and it demands almost nothing of the analyst — no metric, no scaling, no distributional assumption, and one hyperparameter that is fine at its default. Where it should not be used is equally clear. It finds global anomalies, so a point that is only unusual relative to its own local cluster is missed, and that is the case Local Outlier Factor exists for. It is blind to correlation, so an anomaly that is off-diagonal but in-range on every axis scores as normal — the extended variant with oblique splits is the honest fix. And a coordinated cluster of anomalies masks itself, which matters in exactly the adversarial settings where detection is most valuable.',
        featurization: [
          'No scaling required, which is a genuine differentiator: the split threshold is drawn within each node’s own range, so features in different units cost nothing',
          'Drop obviously irrelevant columns or lower max_features — random feature choice means every irrelevant column dilutes the signal',
          'Encode categoricals as ordinals only if the ordering is meaningful; a random threshold on an arbitrary integer code splits on nothing',
          'Fit on a confirmed-clean window where one exists, though it is far more tolerant of contamination than a density-based detector',
        ],
        evaluation:
          'Precision@k against confirmed incidents and PR-AUC rather than ROC-AUC, at the class imbalance this domain always has. Hold out whole anomaly episodes rather than points from inside one, or a masked cluster will look like a set of individually detected anomalies. Set the threshold from the score distribution on clean data, and treat contamination as the alert budget it actually is.',
        pitfalls: [
          'Raising max_samples in the belief that more data per tree helps — it usually makes detection worse, which is the least intuitive fact about the method',
          'Correlated anomalies: a point in-range on every axis but far off the joint diagonal scores as perfectly normal under axis-aligned cuts',
          'Local anomalies in a multi-density dataset, where a point sparse relative to its own cluster is dense relative to the whole and is missed',
          'Reading the score as a probability; it is a normalized depth ratio, and the 0.5 midpoint is a convention rather than a decision boundary',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'Nothing is optimized — splits are drawn uniformly at random and no criterion is ever evaluated — and the output is an outlier score rather than a decision under constraints.',
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'A first-line unsupervised screen over transaction, account, or claim features, running ahead of the supervised model so that a cheap linear-cost pass reduces what an expensive one has to see. It also covers the case supervised models structurally cannot: novel fraud patterns that have no labelled examples yet, because labels in this domain arrive weeks late if at all.',
        where: [
          'Real-time transaction screening at volumes where a distance-based detector cannot meet latency',
          'Anti-money-laundering triage over account behaviour, where labels are scarce and delayed',
          'New-account and bot detection, where the attack pattern changes faster than a supervised model can be retrained',
          'Monitoring for population shift in the inputs to a deployed supervised model',
        ],
        why: 'The economics fit the domain exactly: constant-size model, linear scoring, no scaling to maintain, and no labels required — which means it keeps working during the window when a new fraud pattern exists and its labels do not. That window is precisely when a supervised model is blind. Against it, and this matters more here than anywhere else: sophisticated fraud is not a scattered set of odd points but a coordinated cluster, and a cluster masks itself under isolation. Treat it as a screen and a novelty tripwire, never as the fraud model.',
        featurization: [
          'Aggregate to entity-level behavioural features over a window; raw transactions are too heavy-tailed for path length to say much',
          'Include velocity and ratio features, which is where genuinely anomalous behaviour usually shows up as an extreme value',
          'Keep the feature count moderate — random feature selection means each irrelevant column costs signal directly',
          'Refit on a rolling window so the notion of normal tracks the population, which is cheap because the fit does not depend on n',
        ],
        evaluation:
          'Precision at a fixed alert budget on an out-of-time split, and separately the fraction of confirmed fraud it discards — that second number is the only one that matters for a screen. Track it alongside the supervised model to see what each catches that the other does not.',
        pitfalls: [
          'Coordinated fraud rings masking each other, which is the failure mode this domain is most likely to hit',
          'Legitimate high-value outliers — a genuine large transaction is anomalous and not fraud, so the score needs business context before it becomes a decision',
          'Treating the contamination parameter as an estimate of the fraud rate rather than as the alert budget it sets',
        ],
      },
      'control-and-operations': {
        fit: 'viable',
        how: 'Score sensor and equipment telemetry continuously against a forest refitted on a rolling window of recent normal operation. The model is small enough to sit on an edge device or a gateway, and the scoring cost per reading is a few hundred short tree walks.',
        where: [
          'Predictive maintenance screening on vibration, temperature, and current signatures',
          'Process monitoring across many sensors of wildly different scales, where a distance metric would need per-sensor calibration',
          'Edge deployment on constrained hardware, where a kilobyte-scale model and comparison-only scoring are the binding constraints',
        ],
        why: 'Sensors arrive in incompatible units and drift constantly, and this is the detector that does not care — thresholds are drawn within each node’s own range, so no scaling has to be maintained as the units and ranges shift. Combined with a tiny model and a fit that ignores dataset size, it deploys where most detectors cannot. The reservation is the same structural one: equipment faults often appear as an unusual combination of individually normal readings, which is exactly what axis-aligned cuts cannot see, so a correlation-aware detector belongs alongside it.',
        featurization: [
          'Window the signal into statistics — mean, variance, peak, spectral band energy — since a single raw reading rarely isolates',
          'Refit on a rolling recent window so gradual drift becomes the new normal instead of a growing stream of alerts',
          'Keep the feature set tight; on wide sensor arrays lower max_features rather than adding trees',
        ],
        evaluation:
          'Time-to-detection ahead of a confirmed fault, not just whether the fault was flagged eventually, and false alerts per machine per week against what the maintenance team can actually action.',
        pitfalls: [
          'Gradual drift being absorbed by the rolling refit until a genuine slow degradation has become the baseline',
          'Multi-sensor faults that stay in range on each axis and are therefore invisible to axis-aligned splits',
          'Alert volume tuned by the contamination parameter rather than by what an operator can respond to',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'The distinguishing property: cost is independent of dataset size. Each tree sees 256 points regardless of whether the dataset has ten thousand rows or a billion, so a fit is milliseconds and a rolling refit is essentially free. No other detector in this section can say that.',
    inferenceProfile:
      'A few hundred short tree walks per point, comparisons only, no arithmetic and no distance computation. Microseconds, and the model is kilobytes — a few hundred trees over 256 points each — which is what makes edge and streaming deployment realistic.',
    retrainingCadence:
      'As often as you like, and frequently the right answer is continuously on a rolling window. Because the fit ignores dataset size, keeping the notion of normal current costs almost nothing, which inverts the usual constraint where refresh frequency is limited by training cost.',
    driftAndMonitoring: [
      'Track the score distribution rather than the alert count, since the alert count is fixed by the contamination threshold and will therefore look stable while the underlying scores move',
      'Watch the share of points scoring near 0.5, which is where a forest that has lost discriminating power piles up',
      'Compare a rolling-window model against a fixed-baseline model — divergence between them separates genuine drift from a rolling fit absorbing an ongoing problem',
      'Alert on features whose in-node ranges have shifted substantially, because the split thresholds are drawn from those ranges',
    ],
    productionGotchas: [
      'The score is a normalized depth ratio, not a probability; 0.5 is a convention rather than a decision boundary, and any expected-cost calculation on it is unfounded',
      'contamination sets a quantile threshold, so alert volume is fixed by configuration rather than discovered — raising it does not make the model more sensitive, it just alerts more',
      'A rolling refit will quietly absorb a slowly worsening condition into the baseline; keep a fixed-baseline model alongside it if slow degradation matters',
      'Scores are only comparable across models with the same subsample size, since c(psi) is the normalizer — changing max_samples silently rescales every threshold',
      'Determinism requires pinning the seed; with random splits, two fits on identical data give different scores, and a threshold tuned on one does not transfer exactly to the other',
    ],
  },

  assumptions: [
    'Anomalies are few and different — the entire premise, and it fails when anomalies form a substantial or clustered fraction of the data',
    'Anomalies are distinguishable along individual axes, since splits are axis-aligned and cannot see a correlated combination',
    'Anomalies are global rather than local: a point sparse relative to its own cluster but dense relative to the whole is not detected',
    'Numeric features carry the signal; a random threshold on an arbitrary categorical encoding splits on nothing meaningful',
  ],

  pros: [
    {
      point: 'Training cost is independent of dataset size',
      context:
        'Each tree sees a fixed 256-point subsample, so the fit does not slow down as data accumulates. Decisive at streaming and web scale, and irrelevant on a dataset small enough that a Gaussian mixture would fit instantly anyway.',
    },
    {
      point: 'No distance metric, no scaling, no distributional assumption',
      context:
        'Thresholds are drawn within each node’s own range, so mixed units cost nothing and there is no scaler to persist or drift. This is the practical reason it is so often the first thing tried on a new unlabelled problem.',
    },
    {
      point: 'The model is tiny and scoring is comparison-only',
      context:
        'A few hundred trees over 256 points each is kilobytes, and a score is a few hundred short walks with no arithmetic — which is what makes edge and in-database deployment realistic where a density model is not.',
    },
    {
      point: 'Models anomalies directly rather than modelling normality and inverting it',
      context:
        'Nothing has to be assumed about the shape of normal, which is exactly where parametric detectors fail on multi-modal data. The cost is that it only sees the kind of anomaly its premise describes: few, and separable on an axis.',
    },
  ],

  cons: [
    {
      point: 'Blind to anomalies defined by correlation between features',
      context:
        'Axis-aligned cuts cannot isolate a point that is in range on every axis but far off the joint structure — a very common shape for a real anomaly. The extended isolation forest with oblique splits is the fix, and it is not the default anywhere.',
    },
    {
      point: 'Finds global anomalies, not local ones',
      context:
        'In a dataset with clusters of different densities, a point that is sparse relative to its own cluster still isolates slowly relative to the whole. That case is precisely what Local Outlier Factor is for, and the two are complements rather than alternatives.',
    },
    {
      point: 'Clustered anomalies mask each other',
      context:
        'A group of similar anomalies isolates no faster than a group of normal points, so coordinated behaviour scores as normal. Most damaging in adversarial settings — which is where detection matters most.',
    },
    {
      point: 'The score is uncalibrated and the threshold is a configuration choice',
      context:
        'contamination picks a quantile; it is an alert budget, not an estimate of how many anomalies exist. Teams routinely read it as the latter and then conclude the model is over- or under-detecting when they have simply set a dial.',
    },
  ],

  relatedSlugs: ['random-forest', 'decision-tree', 'gaussian-mixture'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Isolation forest - random splits, path lengths, the score. Transcribed.

No criterion is ever evaluated. The split feature and threshold are drawn
uniformly, which is what makes tree construction O(1) per node and the whole
method linear. What is measured is only how deep a point had to go before it
was alone.
"""

import math
import random


def average_path_length(n):
    """c(psi) = 2H(n-1) - 2(n-1)/n, the expected depth in a random binary tree.

    Dividing by this is what makes a raw depth into a comparable score, and
    what lets forests built on different subsample sizes be compared at all.
    """
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    harmonic = math.log(n - 1.0) + 0.5772156649015329   # Euler-Mascheroni
    return 2.0 * harmonic - 2.0 * (n - 1.0) / n


def build_tree(X, rows, depth, max_depth, rng):
    """Split uniformly at random until isolated or the depth limit is hit."""
    if depth >= max_depth or len(rows) <= 1:
        # A node truncated at the limit still holds several points; the
        # analytic correction estimates how much deeper they would have gone.
        return {"leaf": True, "size": len(rows)}

    d = len(X[0])
    feature = rng.randrange(d)

    # Range within THIS node, not the global range - which is what makes the
    # splits adapt to local extent as the tree descends.
    lowest = min(X[i][feature] for i in rows)
    highest = max(X[i][feature] for i in rows)
    if lowest == highest:
        return {"leaf": True, "size": len(rows)}

    threshold = rng.uniform(lowest, highest)

    left = [i for i in rows if X[i][feature] <= threshold]
    right = [i for i in rows if X[i][feature] > threshold]

    return {
        "leaf": False,
        "feature": feature,
        "threshold": threshold,
        "left": build_tree(X, left, depth + 1, max_depth, rng),
        "right": build_tree(X, right, depth + 1, max_depth, rng),
    }


def fit(X, n_trees=100, subsample=256, seed=0):
    """Each tree sees only \`subsample\` points - and more is usually worse."""
    rng = random.Random(seed)
    n = len(X)
    psi = min(subsample, n)
    max_depth = int(math.ceil(math.log2(psi))) if psi > 1 else 1

    forest = []
    for _ in range(n_trees):
        rows = rng.sample(range(n), psi)
        forest.append(build_tree(X, rows, 0, max_depth, rng))
    return forest, psi


def path_length(tree, x, depth=0):
    if tree["leaf"]:
        # Add the expected remaining depth for the points still in this node.
        return depth + average_path_length(tree["size"])

    if x[tree["feature"]] <= tree["threshold"]:
        return path_length(tree["left"], x, depth + 1)
    return path_length(tree["right"], x, depth + 1)


def score(forest, psi, x):
    """s(x, psi) = 2^(-E[h(x)] / c(psi)); near 1 is anomalous."""
    total = 0.0
    for tree in forest:
        total += path_length(tree, x)
    expected = total / len(forest)
    return 2.0 ** (-expected / average_path_length(psi))`,
        profile: 'O(t * psi * log psi) to fit and O(t * log psi) per query, in interpreter loops with a Python list rebuilt at every node.',
      },
      'make-it-right': {
        code: `"""Isolation forest - typed, flat trees, vectorized subsampling."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Vector = NDArray[np.float64]

EULER_MASCHERONI = 0.5772156649015329


def average_path_length(n: NDArray | int) -> NDArray | float:
    """c(psi) = 2H(n-1) - 2(n-1)/n, vectorized over node sizes.

    This is the normalizer that turns a raw depth into a comparable score, and
    also the analytic correction applied at a truncated leaf.
    """
    sizes = np.asarray(n, dtype=np.float64)
    harmonic = np.log(np.maximum(sizes - 1.0, 1e-12)) + EULER_MASCHERONI
    corrected = 2.0 * harmonic - 2.0 * (sizes - 1.0) / np.maximum(sizes, 1.0)
    return np.where(sizes <= 1.0, 0.0, corrected)


@dataclass(frozen=True)
class IsolationTree:
    """Parallel flat arrays rather than nested dicts.

    A tree is at most 2*psi - 1 nodes and psi is 256, so the whole tree fits in
    a few kilobytes of contiguous memory and a traversal never chases a pointer.
    """

    feature: NDArray      # int32; negative marks a leaf
    threshold: Vector
    left: NDArray         # int32
    right: NDArray        # int32
    leaf_size: NDArray    # int32; drives the truncation correction

    def path_length(self, x: Vector) -> float:
        cursor = 0
        depth = 0
        while self.feature[cursor] >= 0:
            cursor = (
                self.left[cursor]
                if x[self.feature[cursor]] <= self.threshold[cursor]
                else self.right[cursor]
            )
            depth += 1
        return depth + float(average_path_length(self.leaf_size[cursor]))


@dataclass(frozen=True)
class IsolationForest:
    trees: list[IsolationTree]
    subsample: int

    def score_samples(self, X: Matrix) -> Vector:
        """Near 1 is anomalous, near 0.5 is unremarkable. NOT a probability."""
        if X.ndim != 2:
            raise ValueError(f"X must be 2-D, got shape {X.shape}")

        expected = np.empty(X.shape[0], dtype=np.float64)
        for index, row in enumerate(X):
            expected[index] = np.mean([tree.path_length(row) for tree in self.trees])
        return 2.0 ** (-expected / float(average_path_length(self.subsample)))


def _grow(X: Matrix, rows: NDArray, max_depth: int, rng: np.random.Generator) -> IsolationTree:
    feature: list[int] = []
    threshold: list[float] = []
    left: list[int] = []
    right: list[int] = []
    leaf_size: list[int] = []

    def build(node_rows: NDArray, depth: int) -> int:
        index = len(feature)
        feature.append(-1)
        threshold.append(0.0)
        left.append(-1)
        right.append(-1)
        leaf_size.append(node_rows.size)

        if depth >= max_depth or node_rows.size <= 1:
            return index

        chosen = int(rng.integers(X.shape[1]))
        column = X[node_rows, chosen]
        lowest, highest = float(column.min()), float(column.max())
        if lowest == highest:
            return index

        # Range within THIS node, so splits adapt to local extent.
        cut = float(rng.uniform(lowest, highest))
        mask = column <= cut

        feature[index] = chosen
        threshold[index] = cut
        leaf_size[index] = 0
        left[index] = build(node_rows[mask], depth + 1)
        right[index] = build(node_rows[~mask], depth + 1)
        return index

    build(rows, 0)

    return IsolationTree(
        feature=np.asarray(feature, dtype=np.int32),
        threshold=np.asarray(threshold, dtype=np.float64),
        left=np.asarray(left, dtype=np.int32),
        right=np.asarray(right, dtype=np.int32),
        leaf_size=np.asarray(leaf_size, dtype=np.int32),
    )


def fit(X: Matrix, n_trees: int = 100, subsample: int = 256, seed: int = 0) -> IsolationForest:
    """Fit a forest. Raises ValueError on malformed input.

    subsample defaults to 256 and raising it usually makes detection WORSE:
    more points per tree lets normal observations crowd around anomalies until
    they no longer isolate early. That is swamping, and it is the single least
    intuitive property of the method.
    """
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if n_trees < 1:
        raise ValueError(f"n_trees must be at least 1, got {n_trees}")
    if subsample < 2:
        raise ValueError(f"subsample must be at least 2, got {subsample}")

    rng = np.random.default_rng(seed)
    psi = min(subsample, X.shape[0])
    max_depth = max(1, int(np.ceil(np.log2(psi))))

    trees = [
        _grow(X, rng.choice(X.shape[0], size=psi, replace=False), max_depth, rng)
        for _ in range(n_trees)
    ]
    return IsolationForest(trees=trees, subsample=psi)`,
        rationale:
          'Trees become parallel flat arrays instead of nested dicts — a tree is at most 2·psi−1 nodes with psi = 256, so the whole structure is a few kilobytes of contiguous memory and a traversal never chases a pointer or performs a dictionary lookup. The path-length normalizer becomes vectorized so it can be applied to whole arrays of leaf sizes rather than one at a time. Around that, the idiomatic changes: frozen dataclasses, validated input, and the subsample contract documented where it will actually be read, since raising max_samples is the most common way this model is made worse by someone trying to improve it.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(t * psi * log psi) to fit, independent of n; O(t * log psi) per query over contiguous arrays.',
      },
      'make-it-fast': {
        code: `"""Isolation forest - one packed forest, level-synchronous batch scoring."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Vector = NDArray[np.float64]

EULER_MASCHERONI = 0.5772156649015329


class PackedIsolationForest:
    """Every tree concatenated into one set of arrays.

    A single tree is tiny, so the cost of scoring is dominated by interpreter
    overhead rather than arithmetic: one Python-level call per tree per point.
    Packing all t trees into one contiguous int32 block and traversing a whole
    batch level by level removes that entirely - the interpreter runs once per
    tree per LEVEL, not once per tree per point.
    """

    def __init__(self, feature: NDArray, threshold: Vector, left: NDArray,
                 right: NDArray, leaf_size: NDArray, roots: NDArray, subsample: int) -> None:
        # One contiguous block per field, single dtype: the traversal gathers
        # from these arrays on every level and they stay cache-resident.
        self._feature = np.ascontiguousarray(feature, dtype=np.int32)
        self._threshold = np.ascontiguousarray(threshold, dtype=np.float64)
        self._left = np.ascontiguousarray(left, dtype=np.int32)
        self._right = np.ascontiguousarray(right, dtype=np.int32)
        self._roots = np.ascontiguousarray(roots, dtype=np.int32)
        self._subsample = subsample

        # Precompute the truncation correction per node, so scoring never
        # evaluates the harmonic expansion.
        sizes = np.asarray(leaf_size, dtype=np.float64)
        harmonic = np.log(np.maximum(sizes - 1.0, 1e-12)) + EULER_MASCHERONI
        self._correction = np.where(
            sizes <= 1.0, 0.0, 2.0 * harmonic - 2.0 * (sizes - 1.0) / np.maximum(sizes, 1.0)
        )
        self._normalizer = float(
            2.0 * (np.log(subsample - 1.0) + EULER_MASCHERONI)
            - 2.0 * (subsample - 1.0) / subsample
        )

    def score_samples(self, X: Matrix) -> Vector:
        design = np.ascontiguousarray(X, dtype=np.float64)
        n = design.shape[0]

        total_depth = np.zeros(n, dtype=np.float64)     # allocated once
        cursor = np.empty(n, dtype=np.int32)
        rows = np.arange(n)

        for root in self._roots:
            cursor.fill(root)
            depth = np.zeros(n, dtype=np.float64)
            active = rows

            # One iteration per LEVEL. Every point still at an internal node
            # advances together; trees are at most log2(256) = 8 deep, so this
            # loop runs eight times for the whole batch instead of n times.
            while active.size:
                at = cursor[active]
                internal = self._feature[at] >= 0
                if not internal.any():
                    break

                moving = active[internal]
                nodes = cursor[moving]
                goes_left = (
                    design[moving, self._feature[nodes]] <= self._threshold[nodes]
                )
                cursor[moving] = np.where(goes_left, self._left[nodes], self._right[nodes])
                depth[moving] += 1.0
                active = moving

            # Truncation correction is a gather from the precomputed table.
            np.add(total_depth, depth + self._correction[cursor], out=total_depth)

        expected = total_depth / self._roots.size
        return 2.0 ** (-expected / self._normalizer)`,
        rationale:
          'A single isolation tree is so small — eight levels over 256 points — that scoring is dominated by interpreter overhead rather than arithmetic: the previous stage paid one Python-level call per tree per point. Packing every tree into one contiguous int32 block and traversing level-synchronously inverts that: all points still at an internal node advance together, so the interpreter runs once per tree per level rather than once per tree per point, which for a 100-tree forest is 800 iterations for an entire batch. The truncation correction moves into a precomputed per-node table, so the harmonic expansion is evaluated once at construction rather than at every leaf arrival.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Level-synchronous traversal advances the whole batch one level at a time, replacing an interpreter call per point per tree with one per level per tree.',
            tradeoff: 'Every point pays for the deepest path in the tree rather than its own, and the traversal is considerably harder to read than a recursive walk — a real maintenance cost for a real speedup.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'All trees are packed into one int32 block per field, so the gathers performed at every level hit a small contiguous region that stays cache-resident across the whole batch.',
            tradeoff: 'Trees can no longer be added or removed individually — the forest must be repacked — and the int32 node indices cap total forest size, which is ample here only because each tree is tiny.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The depth accumulator and the cursor array are allocated once for the batch and reused across all t trees, and the truncation correction is a table lookup rather than a computation.',
            tradeoff: 'Both buffers are mutable state shared across the tree loop, so the method is not reentrant and two threads scoring through one object would corrupt each other.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(t * log psi) interpreter steps for a whole batch. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Isolation forest - random splits, path lengths, the score. Transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <memory>
#include <random>
#include <vector>

constexpr double kEulerMascheroni = 0.5772156649015329;

// c(psi) = 2H(n-1) - 2(n-1)/n: the expected depth in a random binary tree.
// Dividing by this turns a raw depth into a comparable score.
double AveragePathLength(double n) {
  if (n <= 1.0) return 0.0;
  if (n == 2.0) return 1.0;
  const double harmonic = std::log(n - 1.0) + kEulerMascheroni;
  return 2.0 * harmonic - 2.0 * (n - 1.0) / n;
}

struct Node {
  bool leaf = true;
  std::size_t size = 0;
  std::size_t feature = 0;
  double threshold = 0.0;
  std::unique_ptr<Node> left;
  std::unique_ptr<Node> right;
};

std::unique_ptr<Node> BuildTree(const std::vector<std::vector<double>>& X,
                                const std::vector<std::size_t>& rows,
                                std::size_t depth,
                                std::size_t max_depth,
                                std::mt19937& generator) {
  auto node = std::make_unique<Node>();
  node->size = rows.size();

  // A node truncated at the depth limit still holds several points; the
  // analytic correction estimates how much deeper they would have gone.
  if (depth >= max_depth || rows.size() <= 1) return node;

  std::uniform_int_distribution<std::size_t> pick_feature(0, X[0].size() - 1);
  const std::size_t feature = pick_feature(generator);

  // Range within THIS node, not the global range, so splits adapt to extent.
  double lowest = X[rows[0]][feature];
  double highest = lowest;
  for (const std::size_t row : rows) {
    lowest = std::min(lowest, X[row][feature]);
    highest = std::max(highest, X[row][feature]);
  }
  if (lowest == highest) return node;

  std::uniform_real_distribution<double> pick_threshold(lowest, highest);
  const double threshold = pick_threshold(generator);

  std::vector<std::size_t> left, right;
  for (const std::size_t row : rows) {
    if (X[row][feature] <= threshold) {
      left.push_back(row);
    } else {
      right.push_back(row);
    }
  }

  node->leaf = false;
  node->size = 0;
  node->feature = feature;
  node->threshold = threshold;
  node->left = BuildTree(X, left, depth + 1, max_depth, generator);
  node->right = BuildTree(X, right, depth + 1, max_depth, generator);
  return node;
}

double PathLength(const Node* node, const std::vector<double>& x, double depth) {
  if (node->leaf) return depth + AveragePathLength(static_cast<double>(node->size));
  return x[node->feature] <= node->threshold
             ? PathLength(node->left.get(), x, depth + 1.0)
             : PathLength(node->right.get(), x, depth + 1.0);
}

// s(x, psi) = 2^(-E[h(x)] / c(psi)); near 1 is anomalous.
double Score(const std::vector<std::unique_ptr<Node>>& forest,
             std::size_t psi, const std::vector<double>& x) {
  double total = 0.0;
  for (const auto& tree : forest) total += PathLength(tree.get(), x, 0.0);
  const double expected = total / static_cast<double>(forest.size());
  return std::pow(2.0, -expected / AveragePathLength(static_cast<double>(psi)));
}`,
        profile: 'O(t * psi * log psi) to fit, independent of n, but every node allocates and every split rebuilds two index vectors.',
      },
      'make-it-right': {
        code: `// Isolation forest - flat arenas, in-place partitioning, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

constexpr double kEulerMascheroni = 0.5772156649015329;

// c(psi) = 2H(n-1) - 2(n-1)/n. Also the truncation correction at a leaf.
[[nodiscard]] double AveragePathLength(double n) noexcept {
  if (n <= 1.0) return 0.0;
  if (n == 2.0) return 1.0;
  return 2.0 * (std::log(n - 1.0) + kEulerMascheroni) - 2.0 * (n - 1.0) / n;
}

}  // namespace

struct IsolationNode {
  std::int32_t feature = -1;     // negative marks a leaf
  float threshold = 0.0F;
  std::int32_t left = -1;
  std::int32_t right = -1;
  std::int32_t leaf_size = 0;
};

// A tree is at most 2*psi - 1 nodes with psi = 256, so the whole arena is a
// few kilobytes of contiguous memory and a traversal never chases a pointer.
class IsolationForest {
 public:
  // x_row_major: point i occupies x_row_major[i * d, (i + 1) * d). Scoring
  // walks one ROW across features, so rows are the contiguous axis.
  IsolationForest(std::span<const double> x_row_major, std::size_t dimension,
                  std::size_t n_trees, std::size_t subsample, unsigned seed)
      : dimension_(dimension) {
    if (dimension_ == 0 || x_row_major.empty()) {
      throw std::invalid_argument("empty problem");
    }
    if (x_row_major.size() % dimension_ != 0) {
      throw std::invalid_argument("X is not a multiple of the dimension");
    }
    if (n_trees == 0) throw std::invalid_argument("n_trees must be at least 1");
    if (subsample < 2) throw std::invalid_argument("subsample must be at least 2");

    const std::size_t n = x_row_major.size() / dimension_;
    subsample_ = std::min(subsample, n);
    const auto max_depth =
        static_cast<std::size_t>(std::ceil(std::log2(static_cast<double>(subsample_))));

    std::mt19937 seeder(seed);
    std::vector<std::size_t> pool(n);
    std::iota(pool.begin(), pool.end(), 0);

    for (std::size_t tree = 0; tree < n_trees; ++tree) {
      // Each tree owns a deterministically derived generator, so the fit does
      // not depend on evaluation order once this loop is parallelized.
      std::mt19937 generator(seeder());
      std::shuffle(pool.begin(), pool.end(), generator);
      std::vector<std::size_t> rows(pool.begin(), pool.begin() + static_cast<long>(subsample_));

      roots_.push_back(static_cast<std::int32_t>(nodes_.size()));
      Grow(x_row_major, rows, 0, max_depth, generator);
    }
  }

  [[nodiscard]] double Score(std::span<const double> x) const {
    if (x.size() != dimension_) {
      throw std::invalid_argument("point width does not match the forest");
    }

    double total = 0.0;
    for (const std::int32_t root : roots_) {
      auto cursor = root;
      double depth = 0.0;
      while (nodes_[static_cast<std::size_t>(cursor)].feature >= 0) {
        const IsolationNode& node = nodes_[static_cast<std::size_t>(cursor)];
        cursor = x[static_cast<std::size_t>(node.feature)] <= node.threshold ? node.left
                                                                             : node.right;
        depth += 1.0;
      }
      total += depth + AveragePathLength(static_cast<double>(
                           nodes_[static_cast<std::size_t>(cursor)].leaf_size));
    }

    const double expected = total / static_cast<double>(roots_.size());
    return std::pow(2.0, -expected / AveragePathLength(static_cast<double>(subsample_)));
  }

  [[nodiscard]] std::size_t NodeCount() const noexcept { return nodes_.size(); }

 private:
  std::int32_t Grow(std::span<const double> x, std::vector<std::size_t>& rows,
                    std::size_t depth, std::size_t max_depth, std::mt19937& generator) {
    const auto index = static_cast<std::int32_t>(nodes_.size());
    nodes_.push_back(IsolationNode{-1, 0.0F, -1, -1, static_cast<std::int32_t>(rows.size())});

    if (depth >= max_depth || rows.size() <= 1) return index;

    std::uniform_int_distribution<std::size_t> pick(0, dimension_ - 1);
    const std::size_t feature = pick(generator);

    const auto [low, high] = std::minmax_element(
        rows.begin(), rows.end(), [&](std::size_t a, std::size_t b) {
          return x[a * dimension_ + feature] < x[b * dimension_ + feature];
        });
    const double lowest = x[*low * dimension_ + feature];
    const double highest = x[*high * dimension_ + feature];
    if (lowest == highest) return index;

    std::uniform_real_distribution<double> pick_threshold(lowest, highest);
    const double threshold = pick_threshold(generator);

    // Partition the index buffer in place; no rows are copied.
    const auto pivot = std::partition(
        rows.begin(), rows.end(),
        [&](std::size_t row) { return x[row * dimension_ + feature] <= threshold; });

    std::vector<std::size_t> left(rows.begin(), pivot);
    std::vector<std::size_t> right(pivot, rows.end());

    nodes_[static_cast<std::size_t>(index)].feature = static_cast<std::int32_t>(feature);
    nodes_[static_cast<std::size_t>(index)].threshold = static_cast<float>(threshold);
    nodes_[static_cast<std::size_t>(index)].leaf_size = 0;
    const std::int32_t left_index = Grow(x, left, depth + 1, max_depth, generator);
    const std::int32_t right_index = Grow(x, right, depth + 1, max_depth, generator);
    nodes_[static_cast<std::size_t>(index)].left = left_index;
    nodes_[static_cast<std::size_t>(index)].right = right_index;
    return index;
  }

  std::size_t dimension_;
  std::size_t subsample_ = 0;
  std::vector<IsolationNode> nodes_;   // one arena for the WHOLE forest
  std::vector<std::int32_t> roots_;    // where each tree begins
};`,
        rationale:
          'Nodes move from a unique_ptr graph to one flat arena shared by the entire forest, with each tree recorded only by its root index — a hundred trees over 256 points each becomes a single contiguous block a few hundred kilobytes wide, and a traversal never dereferences a pointer. Rows are partitioned in place rather than rebuilt into two vectors per split. The node struct is packed deliberately: int32 indices and a float threshold rather than size_t and double, because the traversal is memory-bound and halving the node size doubles how much of the forest stays in cache. Each tree owns a deterministically derived generator, which keeps the fit reproducible once the loop is parallelized.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(t * psi * log psi) to fit, one arena for the whole forest, O(t * log psi) per query.',
      },
      'make-it-fast': {
        code: `// Isolation forest - trees built in parallel, batch scoring across points.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

// Struct-of-arrays for the packed forest.
//
// The traversal touches exactly two fields per level - feature and threshold -
// then one child array. Splitting the fields apart means a cache line pulled
// during the comparison holds only feature values, not the child indices and
// leaf sizes it does not need yet.
struct PackedForest {
  std::vector<std::int32_t> feature;     // negative marks a leaf
  std::vector<float> threshold;
  std::vector<std::int32_t> left;
  std::vector<std::int32_t> right;
  std::vector<float> correction;         // precomputed c(leaf_size)
  std::vector<std::int32_t> roots;
  float normalizer = 1.0F;               // precomputed c(psi)
};

// Trees are independent and each sees only psi points, so building the forest
// is a pure fork-join with no shared state - and it is fast enough that the
// parallelism usually matters less than the scoring path below.
template <typename Grower>
PackedForest BuildParallel(Grower&& grow_one, std::size_t n_trees, unsigned seed) {
  std::vector<PackedForest> per_tree(n_trees);

#pragma omp parallel for schedule(static)
  for (std::size_t tree = 0; tree < n_trees; ++tree) {
    // Seed derived from the tree index, not drawn from a shared generator:
    // the forest must not depend on the order threads happen to run.
    per_tree[tree] = grow_one(seed + static_cast<unsigned>(tree));
  }

  PackedForest packed;
  for (const PackedForest& one : per_tree) {
    const auto base = static_cast<std::int32_t>(packed.feature.size());
    packed.roots.push_back(base);
    packed.feature.insert(packed.feature.end(), one.feature.begin(), one.feature.end());
    packed.threshold.insert(packed.threshold.end(), one.threshold.begin(), one.threshold.end());
    packed.correction.insert(packed.correction.end(), one.correction.begin(),
                             one.correction.end());
    for (const std::int32_t child : one.left) packed.left.push_back(child + base);
    for (const std::int32_t child : one.right) packed.right.push_back(child + base);
  }
  return packed;
}

// Scores a whole batch. Points are independent, so the outer loop parallelizes.
//
// __restrict tells the compiler the query matrix and the forest arrays cannot
// alias, which lets it keep the accumulator in a register across the tree loop
// instead of reloading after every write.
std::vector<float> ScoreBatch(const PackedForest& forest,
                              const float* __restrict x_row_major,
                              std::size_t n, std::size_t dimension) {
  std::vector<float> scores(n);
  const std::int32_t* __restrict feature = forest.feature.data();
  const float* __restrict threshold = forest.threshold.data();
  const std::int32_t* __restrict left = forest.left.data();
  const std::int32_t* __restrict right = forest.right.data();
  const float* __restrict correction = forest.correction.data();

#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < n; ++i) {
    // Row-major: a point is one contiguous run, and every tree re-reads it.
    const float* __restrict row = x_row_major + i * dimension;
    float total = 0.0F;

    for (const std::int32_t root : forest.roots) {
      std::int32_t cursor = root;
      float depth = 0.0F;
      while (feature[cursor] >= 0) {
        cursor = row[feature[cursor]] <= threshold[cursor] ? left[cursor] : right[cursor];
        depth += 1.0F;
      }
      total += depth + correction[cursor];
    }

    const float expected = total / static_cast<float>(forest.roots.size());
    scores[i] = std::pow(2.0F, -expected / forest.normalizer);
  }

  return scores;
}`,
        rationale:
          'Both phases parallelize where the independence actually is: trees during construction, points during scoring. The bigger change is the layout — the arena of node structs becomes a struct of arrays, because a traversal reads only the feature and threshold at each level, and separating the fields means the cache line fetched during a comparison holds nothing the level does not need. The truncation correction is precomputed per node into a float table, and thresholds and depths drop to float, which halves the traffic on a path that is entirely memory-bound. Aliasing hints let the compiler hold the accumulator in a register across the tree loop.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Trees are independent during construction and points are independent during scoring, so both loops partition across cores with no shared mutable state.',
            tradeoff: 'The fit is already fast because it never sees more than psi points per tree, so the parallel region there often costs more in fork-join overhead than it saves — the scoring loop is where it pays.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Scoring walks one point across many features and re-reads that same point for every tree, so a contiguous row stays in L1 for the whole traversal.',
            tradeoff: 'Building the trees wants a column view for the per-node min/max scan, so either a transpose is paid at the boundary or both layouts are kept resident.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the query row and the forest arrays may overlap and reloads the accumulator after every write in the tree loop.',
            tradeoff: '__restrict is an unchecked promise, so overlapping buffers become silently wrong results — and the traversal is a dependent-load chain that will not vectorize regardless, so the gain is register reuse rather than SIMD.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(t * log psi) per point across cores, over a struct-of-arrays forest. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Isolation forest - random splits, path lengths, the score. Transcribed.

const EULER_MASCHERONI: f64 = 0.577_215_664_901_532_9;

/// c(psi) = 2H(n-1) - 2(n-1)/n: the expected depth in a random binary tree.
/// Dividing by it turns a raw depth into a comparable score.
fn average_path_length(n: f64) -> f64 {
    if n <= 1.0 {
        return 0.0;
    }
    if n == 2.0 {
        return 1.0;
    }
    2.0 * ((n - 1.0).ln() + EULER_MASCHERONI) - 2.0 * (n - 1.0) / n
}

pub enum Node {
    Leaf { size: usize },
    Split { feature: usize, threshold: f64, left: Box<Node>, right: Box<Node> },
}

/// A tiny linear congruential generator, so the sample has no dependencies.
pub struct Lcg(u64);

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.0
    }
    fn below(&mut self, limit: usize) -> usize {
        (self.next_u64() % limit as u64) as usize
    }
    fn uniform(&mut self, low: f64, high: f64) -> f64 {
        low + (self.next_u64() as f64 / u64::MAX as f64) * (high - low)
    }
}

fn build_tree(
    x: &[Vec<f64>],
    rows: &[usize],
    depth: usize,
    max_depth: usize,
    rng: &mut Lcg,
) -> Node {
    // A node truncated at the depth limit still holds several points; the
    // analytic correction estimates how much deeper they would have gone.
    if depth >= max_depth || rows.len() <= 1 {
        return Node::Leaf { size: rows.len() };
    }

    let feature = rng.below(x[0].len());

    // Range within THIS node, not the global range, so splits adapt to extent.
    let mut lowest = x[rows[0]][feature];
    let mut highest = lowest;
    for &row in rows {
        lowest = lowest.min(x[row][feature]);
        highest = highest.max(x[row][feature]);
    }
    if lowest == highest {
        return Node::Leaf { size: rows.len() };
    }

    let threshold = rng.uniform(lowest, highest);

    let left: Vec<usize> = rows.iter().copied().filter(|&r| x[r][feature] <= threshold).collect();
    let right: Vec<usize> = rows.iter().copied().filter(|&r| x[r][feature] > threshold).collect();

    Node::Split {
        feature,
        threshold,
        left: Box::new(build_tree(x, &left, depth + 1, max_depth, rng)),
        right: Box::new(build_tree(x, &right, depth + 1, max_depth, rng)),
    }
}

fn path_length(node: &Node, x: &[f64], depth: f64) -> f64 {
    match node {
        Node::Leaf { size } => depth + average_path_length(*size as f64),
        Node::Split { feature, threshold, left, right } => {
            if x[*feature] <= *threshold {
                path_length(left, x, depth + 1.0)
            } else {
                path_length(right, x, depth + 1.0)
            }
        }
    }
}

/// s(x, psi) = 2^(-E[h(x)] / c(psi)); near 1 is anomalous.
pub fn score(forest: &[Node], psi: usize, x: &[f64]) -> f64 {
    let total: f64 = forest.iter().map(|tree| path_length(tree, x, 0.0)).sum();
    let expected = total / forest.len() as f64;
    2.0_f64.powf(-expected / average_path_length(psi as f64))
}`,
        profile: 'O(t * psi * log psi) to fit, independent of n, but each split allocates two fresh index vectors and every node is boxed.',
      },
      'make-it-right': {
        code: `//! Isolation forest - typed errors, one arena for the forest, in-place splits.

use std::fmt;

const EULER_MASCHERONI: f64 = 0.577_215_664_901_532_9;

#[derive(Debug, PartialEq, Eq)]
pub enum ForestError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Subsample { value: usize },
    NoTrees,
}

impl fmt::Display for ForestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Subsample { value } => {
                write!(f, "subsample must be at least 2, got {value}")
            }
            Self::NoTrees => write!(f, "n_trees must be at least 1"),
        }
    }
}

impl std::error::Error for ForestError {}

/// Subsample size per tree. A newtype because raising it is the single most
/// common way this model is made worse by someone trying to improve it: more
/// points per tree lets normal observations crowd around anomalies until they
/// stop isolating early. 256 is the standard for a reason.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Subsample(usize);

impl Subsample {
    pub fn new(value: usize) -> Result<Self, ForestError> {
        if value < 2 {
            return Err(ForestError::Subsample { value });
        }
        Ok(Self(value))
    }

    #[must_use]
    pub fn standard() -> Self {
        Self(256)
    }
}

/// c(psi) = 2H(n-1) - 2(n-1)/n. Also the truncation correction at a leaf.
#[inline]
#[must_use]
pub fn average_path_length(n: f64) -> f64 {
    if n <= 1.0 {
        return 0.0;
    }
    if n == 2.0 {
        return 1.0;
    }
    2.0 * ((n - 1.0).ln() + EULER_MASCHERONI) - 2.0 * (n - 1.0) / n
}

/// Packed node. i32 indices and an f32 threshold rather than usize and f64:
/// the traversal is memory-bound, so halving the node doubles how much of the
/// forest stays in cache.
#[derive(Debug, Clone, Copy)]
pub struct IsolationNode {
    pub feature: i32,      // negative marks a leaf
    pub threshold: f32,
    pub left: i32,
    pub right: i32,
    pub leaf_size: i32,
}

pub struct IsolationForest {
    nodes: Vec<IsolationNode>,   // ONE arena for the whole forest
    roots: Vec<i32>,
    dimension: usize,
    normalizer: f64,
}

impl IsolationForest {
    /// x_row_major: point i occupies x_row_major[i * d..(i + 1) * d]. Scoring
    /// walks one ROW across features, so rows are the contiguous axis.
    pub fn fit(
        x_row_major: &[f64],
        dimension: usize,
        n_trees: usize,
        subsample: Subsample,
        seed: u64,
    ) -> Result<Self, ForestError> {
        if dimension == 0 || x_row_major.is_empty() {
            return Err(ForestError::Empty);
        }
        if x_row_major.len() % dimension != 0 {
            return Err(ForestError::ShapeMismatch {
                expected: (x_row_major.len() / dimension + 1) * dimension,
                found: x_row_major.len(),
            });
        }
        if n_trees == 0 {
            return Err(ForestError::NoTrees);
        }

        let n = x_row_major.len() / dimension;
        let psi = subsample.0.min(n);
        let max_depth = (psi as f64).log2().ceil().max(1.0) as usize;

        let mut forest = Self {
            nodes: Vec::new(),
            roots: Vec::with_capacity(n_trees),
            dimension,
            normalizer: average_path_length(psi as f64),
        };

        let mut pool: Vec<usize> = (0..n).collect();

        for tree in 0..n_trees {
            // Seed derived from the tree index, not drawn from a shared
            // generator, so the fit stays reproducible when parallelized.
            let mut rng = Lcg::new(seed ^ (tree as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
            for position in (1..n).rev() {
                pool.swap(position, rng.below(position + 1));
            }
            let mut rows: Vec<usize> = pool[..psi].to_vec();

            forest.roots.push(forest.nodes.len() as i32);
            forest.grow(x_row_major, &mut rows, 0, max_depth, &mut rng);
        }

        Ok(forest)
    }

    /// Near 1 is anomalous, near 0.5 unremarkable. NOT a probability.
    #[must_use]
    pub fn score(&self, x: &[f64]) -> f64 {
        debug_assert_eq!(x.len(), self.dimension);

        let total: f64 = self
            .roots
            .iter()
            .map(|&root| {
                let mut cursor = root;
                let mut depth = 0.0;
                while self.nodes[cursor as usize].feature >= 0 {
                    let node = self.nodes[cursor as usize];
                    cursor = if x[node.feature as usize] <= f64::from(node.threshold) {
                        node.left
                    } else {
                        node.right
                    };
                    depth += 1.0;
                }
                depth + average_path_length(f64::from(self.nodes[cursor as usize].leaf_size))
            })
            .sum();

        let expected = total / self.roots.len() as f64;
        2.0_f64.powf(-expected / self.normalizer)
    }

    fn grow(
        &mut self,
        x: &[f64],
        rows: &mut [usize],
        depth: usize,
        max_depth: usize,
        rng: &mut Lcg,
    ) -> i32 {
        let index = self.nodes.len() as i32;
        self.nodes.push(IsolationNode {
            feature: -1,
            threshold: 0.0,
            left: -1,
            right: -1,
            leaf_size: rows.len() as i32,
        });

        if depth >= max_depth || rows.len() <= 1 {
            return index;
        }

        let feature = rng.below(self.dimension);
        let value = |row: usize| x[row * self.dimension + feature];

        let (lowest, highest) = rows.iter().fold((f64::MAX, f64::MIN), |(low, high), &row| {
            let v = value(row);
            (low.min(v), high.max(v))
        });
        if lowest == highest {
            return index;
        }

        let threshold = rng.uniform(lowest, highest);

        // Partition the index buffer in place; no rows are copied.
        let mut boundary = 0;
        for position in 0..rows.len() {
            if value(rows[position]) <= threshold {
                rows.swap(boundary, position);
                boundary += 1;
            }
        }
        if boundary == 0 || boundary == rows.len() {
            return index;
        }

        self.nodes[index as usize].feature = feature as i32;
        self.nodes[index as usize].threshold = threshold as f32;
        self.nodes[index as usize].leaf_size = 0;

        let (left_rows, right_rows) = rows.split_at_mut(boundary);
        let left = self.grow(x, left_rows, depth + 1, max_depth, rng);
        let right = self.grow(x, right_rows, depth + 1, max_depth, rng);

        self.nodes[index as usize].left = left;
        self.nodes[index as usize].right = right;
        index
    }
}

pub struct Lcg(u64);

impl Lcg {
    #[must_use]
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.0
    }
    fn below(&mut self, limit: usize) -> usize {
        (self.next_u64() % limit as u64) as usize
    }
    fn uniform(&mut self, low: f64, high: f64) -> f64 {
        low + (self.next_u64() as f64 / u64::MAX as f64) * (high - low)
    }
}
`,
        rationale:
          'Boxed nodes become one flat arena shared by the entire forest, with each tree recorded only by its root index, and the node is packed deliberately — i32 indices and an f32 threshold rather than usize and f64 — because the traversal is memory-bound and halving the node doubles how much of the forest stays in cache. Rows are partitioned in place through split_at_mut instead of collecting two fresh vectors per split, which was the dominant allocation in the previous stage. Errors become a typed Result, and the subsample gets a validated newtype carrying the warning that matters: raising it is the most common way this model is degraded by someone trying to improve it.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(t * psi * log psi) to fit, one arena for the whole forest, no allocation per split.',
      },
      'make-it-fast': {
        code: `//! Isolation forest - struct-of-arrays traversal, batch scoring across points.

use rayon::prelude::*;

const EULER_MASCHERONI: f64 = 0.577_215_664_901_532_9;

/// Struct-of-arrays rather than an array of node structs.
///
/// The traversal reads exactly two fields per level - feature and threshold -
/// then one child array. Splitting the fields apart means the cache line
/// pulled during a comparison holds only feature values, not the child indices
/// and leaf sizes that level does not need.
pub struct PackedForest {
    feature: Vec<i32>,       // negative marks a leaf
    threshold: Vec<f32>,
    left: Vec<i32>,
    right: Vec<i32>,
    /// c(leaf_size), precomputed so scoring never evaluates the harmonic
    /// expansion - it is a gather from this table instead.
    correction: Vec<f32>,
    roots: Vec<i32>,
    dimension: usize,
    normalizer: f32,
}

impl PackedForest {
    #[must_use]
    pub fn new(
        feature: Vec<i32>,
        threshold: Vec<f32>,
        left: Vec<i32>,
        right: Vec<i32>,
        leaf_size: &[i32],
        roots: Vec<i32>,
        dimension: usize,
        subsample: usize,
    ) -> Self {
        let mut correction = Vec::with_capacity(leaf_size.len());
        correction.extend(leaf_size.iter().map(|&size| {
            let n = f64::from(size);
            let value = if n <= 1.0 {
                0.0
            } else {
                2.0 * ((n - 1.0).ln() + EULER_MASCHERONI) - 2.0 * (n - 1.0) / n
            };
            value as f32
        }));

        let psi = subsample as f64;
        let normalizer =
            (2.0 * ((psi - 1.0).ln() + EULER_MASCHERONI) - 2.0 * (psi - 1.0) / psi) as f32;

        Self { feature, threshold, left, right, correction, roots, dimension, normalizer }
    }

    /// One point, all trees. Marked inline because it is the entire hot path
    /// and the caller is a tight parallel map over rows.
    #[inline]
    fn score_row(&self, row: &[f32]) -> f32 {
        let mut total = 0.0_f32;

        for &root in &self.roots {
            let mut cursor = root as usize;
            let mut depth = 0.0_f32;

            while self.feature[cursor] >= 0 {
                cursor = if row[self.feature[cursor] as usize] <= self.threshold[cursor] {
                    self.left[cursor] as usize
                } else {
                    self.right[cursor] as usize
                };
                depth += 1.0;
            }

            total += depth + self.correction[cursor];
        }

        let expected = total / self.roots.len() as f32;
        2.0_f32.powf(-expected / self.normalizer)
    }

    /// Scores a whole batch. Points are independent of one another, so the
    /// batch is a parallel map; the inner loop over trees stays sequential,
    /// because a tree is eight levels deep and fork-join at that granularity
    /// would cost far more than the traversal itself.
    ///
    /// x_row_major is row-major on purpose: every tree re-reads the same
    /// point, so a contiguous row stays in L1 for the whole traversal.
    #[must_use]
    pub fn score_batch(&self, x_row_major: &[f32]) -> Vec<f32> {
        x_row_major
            .par_chunks_exact(self.dimension)
            .map(|row| self.score_row(row))
            .collect()
    }
}
`,
        rationale:
          'The arena of node structs becomes a struct of arrays, because the traversal reads only the feature and threshold at each level and separating the fields keeps the fetched cache line free of the child indices and leaf sizes that level does not use. The truncation correction moves into a precomputed f32 table, so scoring never evaluates the harmonic expansion. Scoring parallelizes across points, which is where the independence is; the inner loop over trees deliberately stays sequential, since a tree is eight levels deep and fork-join at that granularity would cost more than the work it distributes.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Points are independent and the forest is immutable, so a batch is a parallel map with no locking and no atomics anywhere in the scoring path.',
            tradeoff: 'Only helps in batch — a single latency-sensitive query gets nothing — and the fit itself is already cheap enough that parallelizing it usually costs more than it saves.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'par_chunks_exact hands each worker one contiguous row that every tree then re-reads, so the point stays in L1 for the whole traversal instead of being re-fetched per tree.',
            tradeoff: 'Requires the query matrix in the opposite layout from the per-node min/max scan used during fitting, so either a transpose is paid at the boundary or both layouts stay resident.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'score_row is the entire hot path and is called once per point from a tight parallel map; inlining lets the accumulator and the forest pointers stay in registers across the tree loop.',
            tradeoff: 'Inlining a loop this size into every call site grows the instruction footprint, and the traversal is a dependent-load chain that will not vectorize regardless — the gain is register pressure, not SIMD.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(t * log psi) per point across cores, over a struct-of-arrays forest. Illustrative, not a measured benchmark.',
      },
    },
  },
};
