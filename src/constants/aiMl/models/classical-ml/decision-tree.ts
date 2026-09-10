import type { AiMlModel } from '../../types';

/**
 * Decision Tree (CART) — the entry that abandons a global functional form.
 *
 * Opens the trees-and-ensembles group because everything after it is a
 * correction to a single weakness this entry has in full: a tree is
 * high-variance to the point of instability, and bagging and boosting are both
 * answers to that. The code progression follows the only question that matters
 * for a tree implementation — how the best split is found — from an exhaustive
 * O(n^2) scan, through a sorted incremental scan, to histogram binning, which
 * is what every production implementation actually does.
 */
export const DECISION_TREE: AiMlModel = {
  slug: 'decision-tree',
  name: 'Decision Tree (CART)',
  aliases: ['CART', 'Classification and Regression Tree', 'C4.5', 'ID3', 'Recursive partitioning'],
  category: 'classical-ml',
  group: 'trees-and-ensembles',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression'],
  paradigmNote:
    'One algorithm, two impurity functions: Gini or entropy for classification, squared error for regression. Nothing else about the recursion changes, which is why CART covers both and why the regression variant predicts a leaf mean rather than a fitted line.',

  intuition:
    'Ask a sequence of yes/no questions about one feature at a time, and after each answer ask the next question of whichever group you landed in. Each question is chosen greedily: try every feature and every threshold, and keep whichever split makes the two resulting groups most internally homogeneous. Recurse until the groups are small or pure, then predict the majority class or the mean of each. The result is a partition of the feature space into axis-aligned boxes with a constant prediction inside each — which explains both its strengths and its ceiling, since no amount of depth makes a box into a diagonal.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{j, t} \\; \\frac{n_L}{n} \\, H(S_L) + \\frac{n_R}{n} \\, H(S_R), \\qquad H_{\\text{gini}}(S) = 1 - \\sum_{c} p_c^2, \\quad H_{\\text{mse}}(S) = \\frac{1}{\\lvert S \\rvert}\\sum_{i \\in S}(y_i - \\bar{y}_S)^2',
      symbols: [
        { symbol: 'j, t', meaning: 'the feature and threshold being chosen — the split is always on one feature at a time, which is what makes it axis-aligned' },
        { symbol: 'S_L, S_R', meaning: 'the two child subsets produced by the split' },
        { symbol: 'H', meaning: 'impurity: Gini or entropy for classification, mean squared error for regression' },
        { symbol: 'n_L/n', meaning: 'size weighting, which is what stops the search preferring a split that isolates a single point' },
      ],
    },
    reading:
      'Of every question you could ask about one feature, pick the one that leaves the two resulting groups as internally uniform as possible, weighted by how many points land in each. That is the entire training rule, applied recursively. Two things worth noticing: the objective is local, so nothing here optimizes the tree as a whole, and Gini and entropy almost always choose the same split — the choice between them is far less consequential than the depth limit applied afterwards.',
  },

  optimization: {
    method: 'Greedy recursive partitioning, followed by cost-complexity pruning',
    updateRule: {
      formula:
        'R_\\alpha(T) = \\sum_{\\ell \\in \\text{leaves}(T)} \\frac{n_\\ell}{n} H(S_\\ell) + \\alpha \\lvert \\text{leaves}(T) \\rvert',
      symbols: [
        { symbol: 'R_\\alpha(T)', meaning: 'the pruning objective: total leaf impurity plus a price per leaf' },
        { symbol: '\\alpha', meaning: 'complexity cost. Zero grows the tree until the leaves are pure; large alpha prunes back to the root' },
        { symbol: '\\lvert \\text{leaves}(T) \\rvert', meaning: 'the number of leaves, standing in for model complexity' },
        { symbol: '\\ell', meaning: 'one leaf, whose prediction is the majority class or the mean of the points that reach it' },
      ],
    },
    rationale:
      'The split search is greedy because the alternative is intractable: finding the globally optimal tree is NP-hard, so every practical implementation takes the locally best split and never revisits it. That has a real consequence — a split that looks poor now can enable an excellent pair of splits below it, and greedy search will never find it. Pruning is the partial remedy. Grow the tree past the point of usefulness, then use alpha to walk back a nested sequence of subtrees and pick one by cross-validation. Growing-then-pruning beats stopping early, because a stopping rule has to judge a split before seeing what it enables, which is the same short-sightedness one level up.',
    hyperparameters: [
      { name: 'max_depth', role: 'The blunt capacity limit and usually the most consequential setting. Beyond about depth 5 the interpretability argument for a single tree has already evaporated', typicalRange: '3 to 10 for an interpretable tree; unbounded only inside an ensemble' },
      { name: 'min_samples_leaf', role: 'Floor on leaf size. The most reliable single guard against overfitting, because it directly bounds how confidently a leaf can speak', typicalRange: '1 to 5% of the training set' },
      { name: 'ccp_alpha', role: 'Cost-complexity pruning strength, chosen by cross-validation over the nested subtree sequence' },
      { name: 'criterion', role: 'Gini, entropy, or log-loss for classification; squared or absolute error for regression. Gini and entropy agree on the split the overwhelming majority of the time' },
      { name: 'max_features', role: 'How many features to consider per split. Meaningless for a single tree and essential inside a random forest, where it is the decorrelating mechanism' },
      { name: 'class_weight', role: 'Rescales impurity contributions per class; the standard handling for imbalance, since a pure-majority leaf otherwise looks perfect' },
    ],
    convergence:
      'The recursion terminates — every split strictly reduces the node size — so there is no convergence question, only a question of what was built. The characteristic failure is instability: a decision tree is a high-variance estimator, and changing a handful of training rows can flip an early split and produce a structurally different tree with similar accuracy. That is not a tuning problem, it is the nature of a greedy recursive partition, and it is exactly why bagging exists. The second failure is overfitting by construction — an unpruned tree grows until every leaf is pure, which means zero training error and a memorized training set. The third is quieter: impurity-based feature importances are systematically biased toward continuous and high-cardinality features, because those offer more candidate thresholds and therefore more chances to reduce impurity by luck.',
    complexity:
      'Training: O(n·d·log n) with pre-sorted features, or O(n·d) per level using histogram binning, times O(log n) levels for a balanced tree. Memory O(n·d) for the sorted indices or O(d·bins) for the histograms. Prediction: O(depth) — a handful of comparisons, with no arithmetic at all — which makes trees among the cheapest models to serve of anything in this section.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Reshape the series into a supervised table of lags, rolling statistics, and calendar features, then fit a tree on it. The tree finds thresholds — "when the 7-day mean is above 400 and it is a weekday" — which is a genuinely different hypothesis class from a linear model on the same features, and it captures interactions and regime changes without being told they exist.',
        where: [
          'Interpretable regime detection, where the fitted thresholds are themselves the finding',
          'Short-horizon forecasting on series with strong calendar and event effects that interact',
          'The single-tree baseline that motivates a forecasting ensemble, since its variance makes the case for bagging concretely',
        ],
        why: 'It handles interactions, mixed feature types, and missing values with no preprocessing, and it needs no scaling — which is a real advantage over every model authored so far. But the limitation is disqualifying for many forecasting problems and needs stating plainly: a tree predicts the mean of a leaf, so it is piecewise constant and cannot extrapolate. On a trending series, every future value falls outside the range of the training targets, and the forecast is pinned to the highest leaf mean the tree ever saw. Detrend first, or forecast the difference, or use a linear model — this is not something a deeper tree fixes.',
        featurization: [
          'Detrend or difference before fitting, since the tree cannot predict a value outside the training target range',
          'Lags, rolling statistics, and calendar flags — no scaling required, which removes an entire class of leakage bug',
          'Encode seasonality as explicit features (day of week, week of year) rather than expecting the tree to discover periodicity, which it cannot represent',
          'Let the tree find interactions rather than pre-building them; that is the one thing it does that a linear model does not',
        ],
        evaluation:
          'Rolling-origin backtesting scored with MASE against seasonal-naive. Refit on several adjacent windows and compare the resulting trees — if the top splits change between windows, the structure is noise, and any interpretation of it is fiction.',
        pitfalls: [
          'Trend, which produces a forecast that flattens at the highest leaf mean and stays there for ever',
          'Reading impurity-based feature importances as driver importance when continuous lags are structurally favoured over categorical flags',
          'Treating one fitted tree as a stable description of the process, when a different sample would have produced a different tree',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'A decision tree partitions by label, so with unlabelled data it has no objective at all, and with labelled data it just becomes a rare-class classifier. Splitting on isolation depth rather than on impurity is a different algorithm with a different criterion, which is what the isolation forest entry covers.',
      },
      optimization: {
        fit: 'not-applicable',
        why: 'The name is a false friend: a decision tree produces a prediction, not an allocation under constraints, and its own fitting is a greedy heuristic rather than a solver worth studying — finding the optimal tree is NP-hard and nothing here attempts it.',
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Two distinct roles. As a rule generator: fit a shallow tree and read the root-to-leaf paths off as literal decision rules, which a policy team can implement in a rules engine without deploying a model at all. And as a segmentation step, splitting a portfolio into risk bands whose boundaries are explicit thresholds a committee can approve or override.',
        where: [
          'Extracting candidate decline and review rules from historical outcomes',
          'Risk-band segmentation where the band boundaries must be stated, defended, and occasionally overridden by hand',
          'Root-cause exploration on a spike in losses, where the question is which combination of attributes the losses share',
        ],
        why: 'The path to a leaf is a conjunction of thresholds, which is exactly the form a policy rule takes — so unlike every other model here, the deliverable can be the rules rather than a scoring service. That matters in a domain where a human must be able to defend a decline. The reasons to stop there are equally clear: a single tree is unstable, so the extracted rules change on refit, and its accuracy is well below the boosted ensemble it is usually competing against. It is a tool for finding and stating rules, not for scoring at volume.',
        featurization: [
          'No scaling and no encoding of ordinals — a genuine advantage on messy intake data with mixed types',
          'Constrain depth hard, since a rule nobody can read is not a rule',
          'Use permutation importance rather than impurity importance, which is biased toward high-cardinality identifiers exactly where those are least useful as policy',
          'Set class weights or a minimum leaf size, or the tree will find a pure-majority leaf and declare victory on an imbalanced problem',
        ],
        evaluation:
          'Precision and volume per extracted rule at the operating point, on an out-of-time split — a rule is judged by what it catches and what it costs, not by the tree’s aggregate accuracy. Test stability by refitting on bootstrap samples and measuring how often the same rules appear.',
        pitfalls: [
          'Rules extracted from an unstable tree that do not reproduce on the next refit',
          'Splitting on a leaked or post-outcome field, which a tree will find immediately and exploit completely',
          'Very deep trees marketed as interpretable; past a few levels the path to a leaf is no longer an explanation anyone reads',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Cheap and predictable: O(n·d·log n) with sorted features, seconds on a million rows. The cost is dominated by the split search, which is why histogram binning — the single most important implementation choice — is what every production implementation uses.',
    inferenceProfile:
      'The cheapest of anything in this section. A prediction is a walk down the tree: a handful of comparisons, no arithmetic, no matrix, and no scaling step. Trees export to SQL, to a switch statement, or to a rules engine, which is often the real deployment target.',
    retrainingCadence:
      'Cheap enough to refit whenever the data changes. The constraint is not compute but stability: each refit can produce a structurally different tree, so anything keyed to the fitted rules must be re-approved rather than silently swapped.',
    driftAndMonitoring: [
      'Track the top splits across refits — a changed root split means the model a stakeholder approved no longer exists, even if accuracy is unchanged',
      'Monitor the sample distribution across leaves; a leaf whose traffic share moves sharply is drift arriving at a specific, nameable place',
      'Watch for leaves receiving traffic they never saw in training, where the prediction is a constant fitted on a handful of historical rows',
      'Compare permutation importances between refits rather than impurity importances, which are biased and therefore uninformative about change',
    ],
    productionGotchas: [
      'The tree cannot extrapolate: any target outside the training range is predicted as the nearest leaf mean, and it will do this silently and for ever',
      'Missing-value handling is a model decision — surrogate splits or a default direction — and it must be identical at training and inference, or rows take different paths',
      'A new categorical level has no branch; the fallback direction must be explicit, not whatever the encoder produces by default',
      'Impurity-based feature importance is biased toward continuous and high-cardinality features and should not be exported as a driver analysis',
      'Prediction depends on strict-versus-non-strict comparison at the threshold, so a value exactly on a boundary can flip between implementations — this actually happens when a model is ported to SQL',
    ],
  },

  assumptions: [
    'The decision boundary is well approximated by axis-aligned splits — a diagonal boundary is representable only as a staircase, and needs depth to buy what one linear term would give',
    'The target is well approximated as piecewise constant, which is why the model cannot extrapolate beyond the range of the training targets',
    'Enough samples reach each leaf for its constant to mean something; a leaf of three points is a memorized triple',
    'Features are informative individually or in sequence — a tree finds interactions only by splitting on one feature after another, so a pure XOR needs depth to represent what it cannot see in one split',
  ],

  pros: [
    {
      point: 'Requires no scaling, no encoding, and tolerates mixed types and missing values',
      context:
        'Genuinely the least demanding model here on data preparation, which removes a whole class of production bug — a persisted scaler that drifts. Worth less when the pipeline is already built for a linear model.',
    },
    {
      point: 'A shallow tree is readable as literal rules',
      context:
        'The path to a leaf is a conjunction of thresholds, which is the form a policy rule already takes. This is real interpretability rather than an approximation of the model — and it evaporates entirely past a few levels of depth.',
    },
    {
      point: 'Finds interactions without being told they exist',
      context:
        'Splitting on one feature and then another is an interaction, discovered rather than specified. That is exactly what a linear model cannot do, and it is why trees dominate tabular problems where interactions carry the signal.',
    },
    {
      point: 'Prediction is a handful of comparisons',
      context:
        'No arithmetic, no preprocessing, trivially portable to SQL or a rules engine. Decisive at extreme volume or on constrained hardware; irrelevant when a millisecond of inference is free.',
    },
  ],

  cons: [
    {
      point: 'High variance — a small change in the data produces a different tree',
      context:
        'The defining weakness, and the reason bagging and boosting exist. It also undercuts the interpretability advantage: a structure that changes with the sample is not a description of the world, and treating one fitted tree as a finding is the most common misuse.',
    },
    {
      point: 'Overfits by construction unless constrained',
      context:
        'Grown unchecked it reaches zero training error by memorizing. Depth limits, leaf-size floors, and pruning are not refinements here; without them the model is a lookup table.',
    },
    {
      point: 'Cannot extrapolate, and boundaries are axis-aligned',
      context:
        'A piecewise-constant model pinned to the range of its training targets, approximating a diagonal boundary with a staircase. Disqualifying for trending series and for smooth relationships a single linear term would capture exactly.',
    },
    {
      point: 'A single tree is beaten by its own ensembles, decisively',
      context:
        'Random forests and gradient boosting are strictly better predictors built from this exact component. The single tree survives where the structure itself is the deliverable — rule extraction, segmentation, explanation — and essentially nowhere else.',
    },
  ],

  relatedSlugs: ['random-forest', 'gradient-boosting', 'naive-bayes'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""CART classification tree - the split criterion, transcribed.

For every feature and every candidate threshold, split, measure the weighted
impurity of the two children, and keep the best. That exhaustive scan is the
objective above, written out literally: nothing is cached, nothing is sorted,
and every candidate recomputes both children from scratch.
"""


def gini(labels):
    """H(S) = 1 - sum_c p_c^2"""
    if not labels:
        return 0.0

    counts = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1

    impurity = 1.0
    for count in counts.values():
        proportion = count / len(labels)
        impurity -= proportion * proportion
    return impurity


def majority(labels):
    counts = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1

    best_label = None
    best_count = -1
    for label, count in counts.items():
        if count > best_count:
            best_label = label
            best_count = count
    return best_label


def best_split(X, y):
    """Exhaustive search over every feature and every midpoint."""
    n = len(X)
    d = len(X[0])
    best = (None, None, gini(y))

    for feature in range(d):
        values = sorted({X[i][feature] for i in range(n)})

        # Candidate thresholds are midpoints between adjacent distinct values.
        for position in range(len(values) - 1):
            threshold = (values[position] + values[position + 1]) / 2.0

            left_labels = []
            right_labels = []
            for i in range(n):
                if X[i][feature] <= threshold:
                    left_labels.append(y[i])
                else:
                    right_labels.append(y[i])

            if not left_labels or not right_labels:
                continue

            # Weighted by child size, which is what stops the search from
            # preferring a split that isolates a single point.
            weighted = (
                len(left_labels) / n * gini(left_labels)
                + len(right_labels) / n * gini(right_labels)
            )

            if weighted < best[2]:
                best = (feature, threshold, weighted)

    return best


def build(X, y, depth=0, max_depth=5, min_samples_leaf=1):
    if depth >= max_depth or len(set(y)) == 1 or len(y) < 2 * min_samples_leaf:
        return {"leaf": True, "prediction": majority(y)}

    feature, threshold, _ = best_split(X, y)
    if feature is None:
        return {"leaf": True, "prediction": majority(y)}

    left_X, left_y, right_X, right_y = [], [], [], []
    for i in range(len(X)):
        if X[i][feature] <= threshold:
            left_X.append(X[i])
            left_y.append(y[i])
        else:
            right_X.append(X[i])
            right_y.append(y[i])

    return {
        "leaf": False,
        "feature": feature,
        "threshold": threshold,
        "left": build(left_X, left_y, depth + 1, max_depth, min_samples_leaf),
        "right": build(right_X, right_y, depth + 1, max_depth, min_samples_leaf),
    }


def predict_one(node, x):
    while not node["leaf"]:
        node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
    return node["prediction"]`,
        profile: 'O(n^2 * d) per node — every candidate threshold rebuilds both child label lists and recounts them from scratch.',
      },
      'make-it-right': {
        code: `"""CART - typed, presorted, incremental class counts."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class Split:
    feature: int
    threshold: float
    impurity: float


@dataclass(frozen=True)
class Node:
    """A leaf carries a prediction; an internal node carries a split.

    Modelled as one frozen type with optional children rather than a dict,
    so a malformed node is a construction error rather than a KeyError during
    prediction.
    """

    prediction: int
    split: Split | None = None
    left: "Node | None" = None
    right: "Node | None" = None

    @property
    def is_leaf(self) -> bool:
        return self.split is None


def _best_split(X: Matrix, y: NDArray, n_classes: int, min_samples_leaf: int) -> Split | None:
    """Scan each feature in sorted order, moving one point at a time.

    The key change: sorting the feature once means the class counts for the two
    children can be updated incrementally as the boundary sweeps right, instead
    of being recomputed for every candidate threshold.
    """
    n, d = X.shape
    parent_counts = np.bincount(y, minlength=n_classes)
    best: Split | None = None
    best_impurity = 1.0 - float((parent_counts / n) ** 2 @ np.ones(n_classes))

    for feature in range(d):
        order = np.argsort(X[:, feature], kind="stable")
        values = X[order, feature]
        labels = y[order]

        left_counts = np.zeros(n_classes, dtype=np.int64)
        right_counts = parent_counts.copy()

        for position in range(n - 1):
            label = labels[position]
            left_counts[label] += 1
            right_counts[label] -= 1

            # Skip boundaries inside a run of equal values: they are not
            # separable, and splitting there produces two identical children.
            if values[position] == values[position + 1]:
                continue

            n_left = position + 1
            n_right = n - n_left
            if n_left < min_samples_leaf or n_right < min_samples_leaf:
                continue

            gini_left = 1.0 - float(((left_counts / n_left) ** 2).sum())
            gini_right = 1.0 - float(((right_counts / n_right) ** 2).sum())
            weighted = (n_left * gini_left + n_right * gini_right) / n

            if weighted < best_impurity:
                best_impurity = weighted
                best = Split(
                    feature=feature,
                    threshold=float((values[position] + values[position + 1]) / 2.0),
                    impurity=weighted,
                )

    return best


def build(
    X: Matrix,
    y: NDArray,
    n_classes: int,
    depth: int = 0,
    max_depth: int = 5,
    min_samples_leaf: int = 1,
) -> Node:
    """Grow a tree. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if min_samples_leaf < 1:
        raise ValueError(f"min_samples_leaf must be at least 1, got {min_samples_leaf}")

    prediction = int(np.bincount(y, minlength=n_classes).argmax())

    if depth >= max_depth or np.unique(y).size == 1 or y.size < 2 * min_samples_leaf:
        return Node(prediction=prediction)

    split = _best_split(X, y, n_classes, min_samples_leaf)
    if split is None:
        return Node(prediction=prediction)

    mask = X[:, split.feature] <= split.threshold
    return Node(
        prediction=prediction,
        split=split,
        left=build(X[mask], y[mask], n_classes, depth + 1, max_depth, min_samples_leaf),
        right=build(X[~mask], y[~mask], n_classes, depth + 1, max_depth, min_samples_leaf),
    )


def predict(node: Node, X: Matrix) -> NDArray:
    out = np.empty(X.shape[0], dtype=np.int64)
    for index, row in enumerate(X):
        current = node
        while not current.is_leaf:
            assert current.split is not None
            current = (
                current.left if row[current.split.feature] <= current.split.threshold
                else current.right
            )
            if current is None:
                raise ValueError("malformed tree: internal node with a missing child")
        out[index] = current.prediction
    return out`,
        rationale:
          'The algorithmic change dominates: sorting each feature once and sweeping the split boundary left to right lets the child class counts be updated one point at a time instead of recomputed per candidate, which turns an O(n^2) scan per node into O(n log n). Two correctness details come with it — boundaries inside a run of equal values are skipped, because splitting there yields two children that are not actually separable, and the leaf-size floor is enforced during the scan rather than after. Structurally the dict-based node becomes a frozen dataclass whose leaf/internal distinction is a property rather than a key, so a malformed tree fails at construction instead of as a KeyError halfway through prediction.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n * d * log n) per node for the sorts, plus an O(n) incremental sweep per feature.',
      },
      'make-it-fast': {
        code: `"""CART - histogram binning, one pass per feature, preallocated buffers."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]


class HistogramTreeBuilder:
    """Split finding by binned histograms - what every production tree does.

    Features are quantized ONCE into at most 256 bins, before any tree is
    grown. Finding a split then means accumulating a per-bin class histogram in
    one linear pass and scanning 255 candidate boundaries, instead of sorting
    and sweeping n values. The per-node cost stops depending on n except through
    the single accumulation pass.

    The trade is exact for what it is: splits are now chosen from bin edges
    rather than from every midpoint, so the fitted thresholds are approximate.
    On real data the accuracy cost is tiny and the speedup is large, which is
    why this is the default - but on a feature whose signal lives in a narrow
    range, the binning can quantize the split away entirely.
    """

    N_BINS = 256

    def __init__(self, X: Matrix, y: NDArray, n_classes: int) -> None:
        self._n_classes = n_classes
        self._y = np.ascontiguousarray(y, dtype=np.int64)

        # Quantile edges, computed once for the whole tree - and reusable
        # across every tree in an ensemble, which is where this really pays.
        design = np.ascontiguousarray(X, dtype=np.float64)
        self._edges = np.stack([
            np.quantile(design[:, feature], np.linspace(0, 1, self.N_BINS + 1)[1:-1])
            for feature in range(design.shape[1])
        ])

        # uint8 binned matrix: 8x smaller than float64, so far more of it stays
        # in cache during the accumulation pass.
        self._binned = np.empty(design.shape, dtype=np.uint8, order="F")
        for feature in range(design.shape[1]):
            np.searchsorted(
                self._edges[feature], design[:, feature], side="left",
            ).astype(np.uint8, copy=False, casting="unsafe")
            self._binned[:, feature] = np.searchsorted(
                self._edges[feature], design[:, feature], side="left"
            )

        # Histogram buffer, allocated once and reused at every node.
        self._histogram = np.empty((self.N_BINS, n_classes), dtype=np.int64)

    def best_split(self, indices: NDArray, min_samples_leaf: int) -> tuple[int, int, float]:
        """Returns (feature, bin, impurity) for the best split of this node."""
        n = indices.size
        labels = self._y[indices]
        best = (-1, -1, np.inf)

        for feature in range(self._binned.shape[1]):
            # One pass over the node's rows builds the whole histogram: bincount
            # over the flattened (bin, class) index, no Python-level loop.
            bins = self._binned[indices, feature].astype(np.int64, copy=False)
            flat = bins * self._n_classes + labels
            counts = np.bincount(flat, minlength=self.N_BINS * self._n_classes)
            self._histogram[:] = counts.reshape(self.N_BINS, self._n_classes)

            # Prefix sums turn "counts per bin" into "counts left of each
            # boundary" for all 255 candidates at once.
            left = np.cumsum(self._histogram, axis=0)
            total = left[-1]
            right = total - left

            n_left = left.sum(axis=1)
            n_right = n - n_left
            valid = (n_left >= min_samples_leaf) & (n_right >= min_samples_leaf)
            if not valid.any():
                continue

            with np.errstate(invalid="ignore", divide="ignore"):
                gini_left = 1.0 - ((left / n_left[:, None]) ** 2).sum(axis=1)
                gini_right = 1.0 - ((right / n_right[:, None]) ** 2).sum(axis=1)
                weighted = (n_left * gini_left + n_right * gini_right) / n

            weighted[~valid] = np.inf
            candidate = int(weighted.argmin())
            if weighted[candidate] < best[2]:
                best = (feature, candidate, float(weighted[candidate]))

        return best`,
        rationale:
          'Split finding stops being a sort-and-sweep and becomes a histogram scan. Features are quantized once, before any tree exists, into at most 256 bins held as uint8 — eight times smaller than float64, so far more of the matrix stays in cache. Finding a split is then one accumulation pass over the node’s rows followed by a prefix sum that evaluates all 255 candidate boundaries simultaneously, so the per-node cost no longer depends on sorting. The honest cost is stated in the docstring: thresholds now come from bin edges rather than from every midpoint, which makes the fitted split approximate, and on a feature whose signal sits inside one bin the binning removes it entirely.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The per-bin class histogram is one bincount over a flattened (bin, class) index, and the prefix sum evaluates every candidate boundary at once instead of one loop iteration per threshold.',
            tradeoff: 'Candidate thresholds are restricted to bin edges, so the chosen split is approximate — a real accuracy cost that is usually negligible and occasionally decisive on a narrow-range feature.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The binned matrix is uint8 in Fortran order, so a feature column is contiguous during the accumulation pass and eight times more of it fits in cache than the float64 original.',
            tradeoff: 'Costs a full extra copy of the design matrix at construction, and the uint8 dtype hard-caps the design at 256 bins — raising the bin count means changing the dtype and the memory story with it.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The histogram buffer is allocated once and rewritten at every node, so growing a deep tree does not allocate a fresh (bins, classes) array per node per feature.',
            tradeoff: 'The buffer is shared mutable state on the builder, which makes the object non-reentrant — two threads growing nodes from one builder would corrupt each other silently.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(n) accumulation plus O(bins * classes) scan per feature per node. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// CART classification tree - the split criterion, transcribed.
#include <cstddef>
#include <map>
#include <memory>
#include <set>
#include <vector>

// H(S) = 1 - sum_c p_c^2
double Gini(const std::vector<int>& labels) {
  if (labels.empty()) return 0.0;

  std::map<int, int> counts;
  for (const int label : labels) counts[label] += 1;

  double impurity = 1.0;
  for (const auto& [label, count] : counts) {
    const double proportion = static_cast<double>(count) / static_cast<double>(labels.size());
    impurity -= proportion * proportion;
  }
  return impurity;
}

int Majority(const std::vector<int>& labels) {
  std::map<int, int> counts;
  for (const int label : labels) counts[label] += 1;

  int best_label = 0;
  int best_count = -1;
  for (const auto& [label, count] : counts) {
    if (count > best_count) {
      best_label = label;
      best_count = count;
    }
  }
  return best_label;
}

struct Node {
  bool leaf = true;
  int prediction = 0;
  std::size_t feature = 0;
  double threshold = 0.0;
  std::unique_ptr<Node> left;
  std::unique_ptr<Node> right;
};

// Exhaustive search over every feature and every midpoint.
void BestSplit(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
               std::size_t& best_feature, double& best_threshold, double& best_impurity) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  best_impurity = Gini(y);
  bool found = false;

  for (std::size_t feature = 0; feature < d; ++feature) {
    std::set<double> distinct;
    for (std::size_t i = 0; i < n; ++i) distinct.insert(X[i][feature]);

    std::vector<double> values(distinct.begin(), distinct.end());
    for (std::size_t position = 0; position + 1 < values.size(); ++position) {
      const double threshold = (values[position] + values[position + 1]) / 2.0;

      std::vector<int> left_labels;
      std::vector<int> right_labels;
      for (std::size_t i = 0; i < n; ++i) {
        if (X[i][feature] <= threshold) {
          left_labels.push_back(y[i]);
        } else {
          right_labels.push_back(y[i]);
        }
      }

      if (left_labels.empty() || right_labels.empty()) continue;

      // Weighted by child size, which stops the search preferring a split
      // that isolates a single point.
      const double weighted =
          static_cast<double>(left_labels.size()) / static_cast<double>(n) * Gini(left_labels) +
          static_cast<double>(right_labels.size()) / static_cast<double>(n) * Gini(right_labels);

      if (weighted < best_impurity) {
        best_impurity = weighted;
        best_feature = feature;
        best_threshold = threshold;
        found = true;
      }
    }
  }

  if (!found) best_feature = static_cast<std::size_t>(-1);
}`,
        profile: 'O(n^2 * d) per node — every candidate threshold rebuilds and recounts both child label vectors.',
      },
      'make-it-right': {
        code: `// CART - flat node arena, presorted features, incremental counts, RAII.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

struct Split {
  std::size_t feature = 0;
  double threshold = 0.0;
  double impurity = 0.0;
};

// Nodes live in one flat vector rather than a pointer graph: growing the tree
// is a push_back, prediction is an index walk, and there is no allocation per
// node and no pointer chasing during inference.
struct TreeNode {
  bool leaf = true;
  int prediction = 0;
  Split split;
  std::size_t left = 0;
  std::size_t right = 0;
};

class DecisionTree {
 public:
  // x_col is COLUMN-major: feature j occupies x_col[j * n, (j + 1) * n).
  // Split finding sweeps one feature at a time, so this is the layout that
  // makes the scan a contiguous walk.
  DecisionTree(std::vector<double> x_col, std::vector<int> y, std::size_t dimension,
               std::size_t n_classes, std::size_t max_depth, std::size_t min_samples_leaf)
      : x_(std::move(x_col)),
        y_(std::move(y)),
        dimension_(dimension),
        n_classes_(n_classes),
        max_depth_(max_depth),
        min_samples_leaf_(min_samples_leaf) {
    if (dimension_ == 0 || y_.empty()) throw std::invalid_argument("empty problem");
    if (x_.size() != y_.size() * dimension_) {
      throw std::invalid_argument("X and y describe different row counts");
    }
    if (min_samples_leaf_ == 0) {
      throw std::invalid_argument("min_samples_leaf must be at least 1");
    }

    std::vector<std::size_t> all(y_.size());
    std::iota(all.begin(), all.end(), 0);
    Grow(all, 0);
  }

  [[nodiscard]] int Predict(std::span<const double> row) const {
    if (row.size() != dimension_) {
      throw std::invalid_argument("row width does not match the tree");
    }
    std::size_t cursor = 0;
    while (!nodes_[cursor].leaf) {
      const Split& split = nodes_[cursor].split;
      cursor = row[split.feature] <= split.threshold ? nodes_[cursor].left
                                                     : nodes_[cursor].right;
    }
    return nodes_[cursor].prediction;
  }

  [[nodiscard]] std::size_t NodeCount() const noexcept { return nodes_.size(); }

 private:
  [[nodiscard]] double Value(std::size_t row, std::size_t feature) const {
    return x_[feature * y_.size() + row];
  }

  // Sort the node's rows by one feature, then sweep the boundary right,
  // moving one point from the right child to the left at each step. The class
  // counts update incrementally instead of being recomputed per candidate.
  [[nodiscard]] bool BestSplit(const std::vector<std::size_t>& rows, Split& out) const {
    const std::size_t n = rows.size();
    std::vector<long> parent(n_classes_, 0);
    for (const std::size_t row : rows) parent[static_cast<std::size_t>(y_[row])] += 1;

    double best = Impurity(parent, n);
    bool found = false;

    std::vector<std::size_t> order(rows);
    std::vector<long> left(n_classes_, 0);
    std::vector<long> right(n_classes_, 0);

    for (std::size_t feature = 0; feature < dimension_; ++feature) {
      std::sort(order.begin(), order.end(),
                [&](std::size_t a, std::size_t b) { return Value(a, feature) < Value(b, feature); });

      std::fill(left.begin(), left.end(), 0);
      right = parent;

      for (std::size_t position = 0; position + 1 < n; ++position) {
        const auto label = static_cast<std::size_t>(y_[order[position]]);
        left[label] += 1;
        right[label] -= 1;

        // A boundary inside a run of equal values is not separable.
        const double here = Value(order[position], feature);
        const double next = Value(order[position + 1], feature);
        if (here == next) continue;

        const std::size_t n_left = position + 1;
        const std::size_t n_right = n - n_left;
        if (n_left < min_samples_leaf_ || n_right < min_samples_leaf_) continue;

        const double weighted =
            (static_cast<double>(n_left) * Impurity(left, n_left) +
             static_cast<double>(n_right) * Impurity(right, n_right)) /
            static_cast<double>(n);

        if (weighted < best) {
          best = weighted;
          out = Split{feature, (here + next) / 2.0, weighted};
          found = true;
        }
      }
    }

    return found;
  }

  [[nodiscard]] static double Impurity(const std::vector<long>& counts, std::size_t total) {
    if (total == 0) return 0.0;
    double impurity = 1.0;
    for (const long count : counts) {
      const double proportion = static_cast<double>(count) / static_cast<double>(total);
      impurity -= proportion * proportion;
    }
    return impurity;
  }

  std::size_t Grow(const std::vector<std::size_t>& rows, std::size_t depth) {
    std::vector<long> counts(n_classes_, 0);
    for (const std::size_t row : rows) counts[static_cast<std::size_t>(y_[row])] += 1;

    const auto majority = static_cast<int>(
        std::distance(counts.begin(), std::max_element(counts.begin(), counts.end())));

    const std::size_t index = nodes_.size();
    nodes_.push_back(TreeNode{true, majority, Split{}, 0, 0});

    if (depth >= max_depth_ || rows.size() < 2 * min_samples_leaf_) return index;

    Split split;
    if (!BestSplit(rows, split)) return index;

    std::vector<std::size_t> left_rows;
    std::vector<std::size_t> right_rows;
    for (const std::size_t row : rows) {
      if (Value(row, split.feature) <= split.threshold) {
        left_rows.push_back(row);
      } else {
        right_rows.push_back(row);
      }
    }

    const std::size_t left = Grow(left_rows, depth + 1);
    const std::size_t right = Grow(right_rows, depth + 1);

    nodes_[index].leaf = false;
    nodes_[index].split = split;
    nodes_[index].left = left;
    nodes_[index].right = right;
    return index;
  }

  std::vector<double> x_;        // column-major, owned
  std::vector<int> y_;
  std::size_t dimension_;
  std::size_t n_classes_;
  std::size_t max_depth_;
  std::size_t min_samples_leaf_;
  std::vector<TreeNode> nodes_;  // flat arena; rule of zero handles the rest
};`,
        rationale:
          'Three structural changes. The split search sorts each feature once per node and sweeps the boundary, updating the child class counts incrementally rather than rebuilding both label vectors per candidate — O(n log n) instead of O(n^2). Node storage becomes a flat arena of indices rather than a graph of unique_ptrs, which removes an allocation per node and turns prediction into an index walk with no pointer chasing. And the design matrix becomes flat column-major, because split finding walks one feature at a time and features must therefore be the contiguous axis — the opposite of the row-major choice that suits prediction.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n * d * log n) per node for the sorts, one arena allocation amortized across the whole tree.',
      },
      'make-it-fast': {
        code: `// CART - histogram binning, features in parallel, aliasing hints.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <vector>

// Split finding by binned histograms - what every production tree does.
//
// Features are quantized ONCE into 256 bins before any tree is grown, so a
// split search is one linear accumulation pass plus a scan over 255 candidate
// boundaries. The per-node cost stops depending on sorting entirely.
//
// The trade is that thresholds now come from bin edges rather than from every
// midpoint, so the fitted split is approximate. On real data that costs very
// little accuracy and saves a great deal of time, which is why it is default.
class HistogramSplitFinder {
 public:
  static constexpr std::size_t kBins = 256;

  HistogramSplitFinder(std::vector<std::uint8_t> binned, std::vector<int> y,
                       std::size_t dimension, std::size_t n_classes)
      : binned_(std::move(binned)),
        y_(std::move(y)),
        dimension_(dimension),
        n_classes_(n_classes) {}

  struct Candidate {
    std::size_t feature = 0;
    std::size_t bin = 0;
    double impurity = std::numeric_limits<double>::infinity();
  };

  [[nodiscard]] Candidate BestSplit(const std::vector<std::size_t>& rows,
                                    std::size_t min_samples_leaf) const {
    std::vector<Candidate> per_feature(dimension_);

    // Every feature is scanned independently against the same read-only rows,
    // so the search is embarrassingly parallel across features.
#pragma omp parallel for schedule(dynamic)
    for (std::size_t feature = 0; feature < dimension_; ++feature) {
      per_feature[feature] = ScanFeature(rows, feature, min_samples_leaf);
    }

    return *std::min_element(per_feature.begin(), per_feature.end(),
                             [](const Candidate& a, const Candidate& b) {
                               return a.impurity < b.impurity;
                             });
  }

 private:
  // __restrict tells the compiler the histogram and the label array cannot
  // alias, which is what lets it keep the accumulator in registers across the
  // loop instead of reloading after every store.
  [[nodiscard]] Candidate ScanFeature(const std::vector<std::size_t>& rows,
                                      std::size_t feature,
                                      std::size_t min_samples_leaf) const {
    std::vector<long> histogram(kBins * n_classes_, 0);
    long* __restrict counts = histogram.data();
    const std::uint8_t* __restrict column = binned_.data() + feature * y_.size();
    const int* __restrict labels = y_.data();

    for (const std::size_t row : rows) {
      counts[static_cast<std::size_t>(column[row]) * n_classes_ +
             static_cast<std::size_t>(labels[row])] += 1;
    }

    // Prefix sum over bins turns per-bin counts into left-of-boundary counts
    // for every candidate at once.
    std::vector<long> left(n_classes_, 0);
    std::vector<long> right(n_classes_, 0);
    for (std::size_t bin = 0; bin < kBins; ++bin) {
      for (std::size_t c = 0; c < n_classes_; ++c) right[c] += counts[bin * n_classes_ + c];
    }

    const auto n = static_cast<double>(rows.size());
    Candidate best;
    std::size_t n_left = 0;

    for (std::size_t bin = 0; bin + 1 < kBins; ++bin) {
      for (std::size_t c = 0; c < n_classes_; ++c) {
        const long moved = counts[bin * n_classes_ + c];
        left[c] += moved;
        right[c] -= moved;
        n_left += static_cast<std::size_t>(moved);
      }

      const std::size_t n_right = rows.size() - n_left;
      if (n_left < min_samples_leaf || n_right < min_samples_leaf) continue;

      const double weighted = (static_cast<double>(n_left) * Impurity(left, n_left) +
                               static_cast<double>(n_right) * Impurity(right, n_right)) /
                              n;
      if (weighted < best.impurity) best = Candidate{feature, bin, weighted};
    }

    return best;
  }

  [[nodiscard]] static double Impurity(const std::vector<long>& counts, std::size_t total) {
    double impurity = 1.0;
    for (const long count : counts) {
      const double proportion = static_cast<double>(count) / static_cast<double>(total);
      impurity -= proportion * proportion;
    }
    return impurity;
  }

  std::vector<std::uint8_t> binned_;   // column-major, one byte per value
  std::vector<int> y_;
  std::size_t dimension_;
  std::size_t n_classes_;
};`,
        rationale:
          'Split finding stops sorting. Features are quantized once into 256 bins held as one byte each — eight times smaller than the doubles they replace, so far more of a column stays in cache — and a split search becomes one linear accumulation pass plus a prefix scan over the bins. Because each feature is scanned independently against the same read-only row set, the search parallelizes across features with no shared state. The accumulation loop carries explicit aliasing hints, since without them the compiler must assume the histogram and the label array may overlap and reloads after every store.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each feature is scanned against the same immutable rows and writes only its own result slot, so the split search partitions across cores with no synchronization.',
            tradeoff: 'Each thread allocates its own bins-by-classes histogram, so memory scales with core count — and a dynamic schedule is needed because features with different cardinalities take different times, which costs some scheduling overhead.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the histogram, the binned column, and the label array may overlap, forcing a reload after every increment in the accumulation loop.',
            tradeoff: '__restrict is an unchecked promise: if the caller ever passes overlapping buffers the result is silently wrong, and the histogram accumulation is a scatter anyway, so this enables register reuse rather than genuine vectorization.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The prefix scan and impurity loops are tight arithmetic over small arrays and depend entirely on the compiler to unroll and vectorize them.',
            tradeoff: '-march=native produces a binary that may fault on an older machine in the same fleet, converting a performance choice into a portability failure.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(n) accumulation plus O(bins * classes) scan per feature, features spread across cores. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! CART classification tree - the split criterion, transcribed.

use std::collections::{HashMap, HashSet};

/// H(S) = 1 - sum_c p_c^2
fn gini(labels: &[i32]) -> f64 {
    if labels.is_empty() {
        return 0.0;
    }

    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &label in labels {
        *counts.entry(label).or_insert(0) += 1;
    }

    let mut impurity = 1.0;
    for count in counts.values() {
        let proportion = *count as f64 / labels.len() as f64;
        impurity -= proportion * proportion;
    }
    impurity
}

fn majority(labels: &[i32]) -> i32 {
    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &label in labels {
        *counts.entry(label).or_insert(0) += 1;
    }

    let mut best_label = 0;
    let mut best_count = 0;
    for (label, count) in counts {
        if count > best_count {
            best_label = label;
            best_count = count;
        }
    }
    best_label
}

pub enum Node {
    Leaf { prediction: i32 },
    Split { feature: usize, threshold: f64, left: Box<Node>, right: Box<Node> },
}

/// Exhaustive search over every feature and every midpoint.
fn best_split(x: &[Vec<f64>], y: &[i32]) -> Option<(usize, f64)> {
    let n = x.len();
    let d = x[0].len();
    let mut best_impurity = gini(y);
    let mut best: Option<(usize, f64)> = None;

    for feature in 0..d {
        let distinct: HashSet<u64> = (0..n).map(|i| x[i][feature].to_bits()).collect();
        let mut values: Vec<f64> = distinct.into_iter().map(f64::from_bits).collect();
        values.sort_by(|a, b| a.total_cmp(b));

        for position in 0..values.len().saturating_sub(1) {
            let threshold = (values[position] + values[position + 1]) / 2.0;

            let mut left_labels = Vec::new();
            let mut right_labels = Vec::new();
            for i in 0..n {
                if x[i][feature] <= threshold {
                    left_labels.push(y[i]);
                } else {
                    right_labels.push(y[i]);
                }
            }

            if left_labels.is_empty() || right_labels.is_empty() {
                continue;
            }

            // Weighted by child size, which stops the search preferring a
            // split that isolates a single point.
            let weighted = left_labels.len() as f64 / n as f64 * gini(&left_labels)
                + right_labels.len() as f64 / n as f64 * gini(&right_labels);

            if weighted < best_impurity {
                best_impurity = weighted;
                best = Some((feature, threshold));
            }
        }
    }

    best
}

pub fn build(x: &[Vec<f64>], y: &[i32], depth: usize, max_depth: usize) -> Node {
    if depth >= max_depth || y.iter().collect::<HashSet<_>>().len() == 1 {
        return Node::Leaf { prediction: majority(y) };
    }

    let Some((feature, threshold)) = best_split(x, y) else {
        return Node::Leaf { prediction: majority(y) };
    };

    let mut left_x = Vec::new();
    let mut left_y = Vec::new();
    let mut right_x = Vec::new();
    let mut right_y = Vec::new();
    for i in 0..x.len() {
        if x[i][feature] <= threshold {
            left_x.push(x[i].clone());
            left_y.push(y[i]);
        } else {
            right_x.push(x[i].clone());
            right_y.push(y[i]);
        }
    }

    Node::Split {
        feature,
        threshold,
        left: Box::new(build(&left_x, &left_y, depth + 1, max_depth)),
        right: Box::new(build(&right_x, &right_y, depth + 1, max_depth)),
    }
}`,
        profile: 'O(n^2 * d) per node, and every recursion clones the rows it partitions — the largest hidden cost in the whole sample.',
      },
      'make-it-right': {
        code: `//! CART - typed errors, a flat node arena, index partitioning, no clones.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum TreeError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    InvalidLeafSize,
}

impl fmt::Display for TreeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::InvalidLeafSize => write!(f, "min_samples_leaf must be at least 1"),
        }
    }
}

impl std::error::Error for TreeError {}

/// Depth limit. A newtype because max_depth and min_samples_leaf are both bare
/// usize in every signature and transposing them silently changes the model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MaxDepth(pub usize);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MinSamplesLeaf(usize);

impl MinSamplesLeaf {
    pub fn new(value: usize) -> Result<Self, TreeError> {
        if value == 0 {
            return Err(TreeError::InvalidLeafSize);
        }
        Ok(Self(value))
    }
}

/// Nodes live in one flat arena. Prediction is an index walk with no pointer
/// chasing, and growing the tree is a push rather than a boxed allocation.
#[derive(Debug, Clone, Copy)]
pub enum TreeNode {
    Leaf { prediction: i32 },
    Split { feature: usize, threshold: f64, left: usize, right: usize },
}

pub struct DecisionTree {
    nodes: Vec<TreeNode>,
    dimension: usize,
}

impl DecisionTree {
    /// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
    /// Split finding sweeps one feature at a time, so features are the
    /// contiguous axis.
    pub fn fit(
        x_col: &[f64],
        y: &[i32],
        dimension: usize,
        n_classes: usize,
        max_depth: MaxDepth,
        min_samples_leaf: MinSamplesLeaf,
    ) -> Result<Self, TreeError> {
        if dimension == 0 || y.is_empty() {
            return Err(TreeError::Empty);
        }
        if x_col.len() != y.len() * dimension {
            return Err(TreeError::ShapeMismatch {
                expected: y.len() * dimension,
                found: x_col.len(),
            });
        }

        let mut builder = Builder {
            x: x_col,
            y,
            n: y.len(),
            dimension,
            n_classes,
            max_depth: max_depth.0,
            min_samples_leaf: min_samples_leaf.0,
            nodes: Vec::new(),
        };

        // Rows are partitioned by permuting an index buffer in place, so no
        // sample data is ever copied while growing the tree.
        let mut rows: Vec<usize> = (0..y.len()).collect();
        builder.grow(&mut rows, 0);

        Ok(Self { nodes: builder.nodes, dimension })
    }

    #[must_use]
    pub fn predict(&self, row: &[f64]) -> i32 {
        debug_assert_eq!(row.len(), self.dimension);
        let mut cursor = 0;
        loop {
            match self.nodes[cursor] {
                TreeNode::Leaf { prediction } => return prediction,
                TreeNode::Split { feature, threshold, left, right } => {
                    cursor = if row[feature] <= threshold { left } else { right };
                }
            }
        }
    }
}

struct Builder<'a> {
    x: &'a [f64],
    y: &'a [i32],
    n: usize,
    dimension: usize,
    n_classes: usize,
    max_depth: usize,
    min_samples_leaf: usize,
    nodes: Vec<TreeNode>,
}

impl Builder<'_> {
    #[inline]
    fn value(&self, row: usize, feature: usize) -> f64 {
        self.x[feature * self.n + row]
    }

    fn impurity(counts: &[usize], total: usize) -> f64 {
        if total == 0 {
            return 0.0;
        }
        1.0 - counts
            .iter()
            .map(|&count| {
                let proportion = count as f64 / total as f64;
                proportion * proportion
            })
            .sum::<f64>()
    }

    /// Sort the node's rows by one feature, then sweep the boundary right,
    /// moving one point at a time. The class counts update incrementally
    /// rather than being recomputed for every candidate threshold.
    fn best_split(&self, rows: &mut [usize]) -> Option<(usize, f64)> {
        let total = rows.len();
        let mut parent = vec![0_usize; self.n_classes];
        for &row in rows.iter() {
            parent[self.y[row] as usize] += 1;
        }

        let mut best_impurity = Self::impurity(&parent, total);
        let mut best = None;

        let mut left = vec![0_usize; self.n_classes];
        let mut right = vec![0_usize; self.n_classes];

        for feature in 0..self.dimension {
            rows.sort_unstable_by(|&a, &b| {
                self.value(a, feature).total_cmp(&self.value(b, feature))
            });

            left.iter_mut().for_each(|slot| *slot = 0);
            right.copy_from_slice(&parent);

            for position in 0..total.saturating_sub(1) {
                let label = self.y[rows[position]] as usize;
                left[label] += 1;
                right[label] -= 1;

                // A boundary inside a run of equal values is not separable.
                let here = self.value(rows[position], feature);
                let next = self.value(rows[position + 1], feature);
                if here == next {
                    continue;
                }

                let n_left = position + 1;
                let n_right = total - n_left;
                if n_left < self.min_samples_leaf || n_right < self.min_samples_leaf {
                    continue;
                }

                let weighted = (n_left as f64 * Self::impurity(&left, n_left)
                    + n_right as f64 * Self::impurity(&right, n_right))
                    / total as f64;

                if weighted < best_impurity {
                    best_impurity = weighted;
                    best = Some((feature, (here + next) / 2.0));
                }
            }
        }

        best
    }

    fn grow(&mut self, rows: &mut [usize], depth: usize) -> usize {
        let mut counts = vec![0_usize; self.n_classes];
        for &row in rows.iter() {
            counts[self.y[row] as usize] += 1;
        }
        let prediction = counts
            .iter()
            .enumerate()
            .max_by_key(|(_, &count)| count)
            .map_or(0, |(class, _)| class as i32);

        let index = self.nodes.len();
        self.nodes.push(TreeNode::Leaf { prediction });

        if depth >= self.max_depth || rows.len() < 2 * self.min_samples_leaf {
            return index;
        }

        let Some((feature, threshold)) = self.best_split(rows) else {
            return index;
        };

        // Partition in place: split_at_mut gives two disjoint borrows of the
        // same buffer, so the children share it with no allocation.
        let pivot = itertools_partition(rows, |&row| self.value(row, feature) <= threshold);
        if pivot == 0 || pivot == rows.len() {
            return index;
        }

        let (left_rows, right_rows) = rows.split_at_mut(pivot);
        let left = self.grow(left_rows, depth + 1);
        let right = self.grow(right_rows, depth + 1);

        self.nodes[index] = TreeNode::Split { feature, threshold, left, right };
        index
    }
}

/// Stable in-place partition; returns the number of elements satisfying the
/// predicate, which is the boundary between the two children.
fn itertools_partition<T: Copy>(items: &mut [T], predicate: impl Fn(&T) -> bool) -> usize {
    let mut boundary = 0;
    for index in 0..items.len() {
        if predicate(&items[index]) {
            items.swap(boundary, index);
            boundary += 1;
        }
    }
    boundary
}
`,
        rationale:
          'The largest change is one the previous stage hid: it cloned every row at every level of the recursion, so growing a depth-10 tree copied the dataset ten times. Here the rows are a single index buffer partitioned in place, and split_at_mut hands the two children disjoint borrows of it — no allocation and no copying anywhere in the growth. Split finding sorts once per feature per node and sweeps incrementally rather than recomputing both children per candidate. Boxed nodes become a flat arena of indices, so prediction is an index walk; errors become a typed Result; and the two bare usize limits get newtypes, because transposing max_depth and min_samples_leaf produces a valid model that is not the one requested.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n * d * log n) per node for the sorts, zero allocations during growth beyond the node arena.',
      },
      'make-it-fast': {
        code: `//! CART - histogram binning, features scanned in parallel.

use rayon::prelude::*;

pub const N_BINS: usize = 256;

/// Split finding by binned histograms - what every production tree does.
///
/// Features are quantized ONCE into 256 bins before any tree is grown, stored
/// one byte per value. A split search is then a single accumulation pass over
/// the node's rows plus a scan across 255 candidate boundaries, so the cost
/// stops depending on sorting.
///
/// The trade is real and worth naming: thresholds now come from bin edges, so
/// the fitted split is approximate. On typical data that costs almost nothing
/// and saves a great deal; on a feature whose signal sits inside one bin, the
/// binning removes it entirely.
pub struct HistogramSplitFinder {
    binned: Vec<u8>,      // column-major: feature j at binned[j * n..(j + 1) * n]
    labels: Vec<u32>,
    n: usize,
    dimension: usize,
    n_classes: usize,
}

#[derive(Debug, Clone, Copy)]
pub struct Candidate {
    pub feature: usize,
    pub bin: u8,
    pub impurity: f64,
}

impl HistogramSplitFinder {
    #[must_use]
    pub fn new(binned: Vec<u8>, labels: Vec<u32>, dimension: usize, n_classes: usize) -> Self {
        let n = labels.len();
        Self { binned, labels, n, dimension, n_classes }
    }

    fn impurity(counts: &[usize], total: usize) -> f64 {
        if total == 0 {
            return 0.0;
        }
        1.0 - counts
            .iter()
            .map(|&count| {
                let proportion = count as f64 / total as f64;
                proportion * proportion
            })
            .sum::<f64>()
    }

    /// One feature: accumulate its histogram, then scan the boundaries.
    fn scan_feature(&self, rows: &[usize], feature: usize, min_samples_leaf: usize) -> Candidate {
        let column = &self.binned[feature * self.n..(feature + 1) * self.n];

        let mut histogram = vec![0_usize; N_BINS * self.n_classes];
        for &row in rows {
            let bin = column[row] as usize;
            histogram[bin * self.n_classes + self.labels[row] as usize] += 1;
        }

        let mut left = vec![0_usize; self.n_classes];
        let mut right = vec![0_usize; self.n_classes];
        for bin in 0..N_BINS {
            for class in 0..self.n_classes {
                right[class] += histogram[bin * self.n_classes + class];
            }
        }

        let total = rows.len();
        let mut best = Candidate { feature, bin: 0, impurity: f64::INFINITY };
        let mut n_left = 0_usize;

        for bin in 0..N_BINS.saturating_sub(1) {
            for class in 0..self.n_classes {
                let moved = histogram[bin * self.n_classes + class];
                left[class] += moved;
                right[class] -= moved;
                n_left += moved;
            }

            let n_right = total - n_left;
            if n_left < min_samples_leaf || n_right < min_samples_leaf {
                continue;
            }

            let weighted = (n_left as f64 * Self::impurity(&left, n_left)
                + n_right as f64 * Self::impurity(&right, n_right))
                / total as f64;

            if weighted < best.impurity {
                best = Candidate { feature, bin: bin as u8, impurity: weighted };
            }
        }

        best
    }

    /// Every feature is scanned independently against the same read-only rows,
    /// so the search is embarrassingly parallel across features.
    #[must_use]
    pub fn best_split(&self, rows: &[usize], min_samples_leaf: usize) -> Option<Candidate> {
        let mut candidates = Vec::with_capacity(self.dimension);
        (0..self.dimension)
            .into_par_iter()
            .map(|feature| self.scan_feature(rows, feature, min_samples_leaf))
            .collect_into_vec(&mut candidates);

        candidates
            .into_iter()
            .filter(|candidate| candidate.impurity.is_finite())
            .min_by(|a, b| a.impurity.total_cmp(&b.impurity))
    }
}
`,
        rationale:
          'Split finding stops sorting entirely. Features are quantized once into 256 bins stored as one byte per value — eight times smaller than the f64 they replace, so far more of a column stays in cache — and a search becomes one accumulation pass plus a prefix scan over the bins. Because each feature is scanned against the same immutable row slice and writes only its own result, the search is a rayon parallel map with no shared mutable state. The candidate buffer is sized once up front, and collect_into_vec reuses it rather than allocating a fresh result vector at every node of the tree.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Features are scanned independently against a shared immutable row slice, so the split search partitions across cores with no locking and no atomics.',
            tradeoff: 'Each worker allocates its own bins-by-classes histogram, so memory scales with core count times class count — and for a shallow node with few rows the fork-join overhead exceeds the scan itself.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Column-major binning makes one feature a contiguous byte slice, so the accumulation pass reads sequentially and the whole column is eight times more cache-resident than the f64 original.',
            tradeoff: 'The histogram write is still a scatter into a bin-indexed table, so the read side is sequential and the write side is not — and the column-major layout is the wrong one for prediction, which walks a row.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The per-feature candidate buffer is sized to the feature count once and refilled by collect_into_vec at every node, rather than allocating a fresh result vector per split search.',
            tradeoff: 'Keeps a buffer alive for the lifetime of the finder, and collect_into_vec ties the code to rayon’s API rather than the standard collect, which is a small portability cost for a real allocation saving.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n) accumulation plus O(bins * classes) scan per feature, features across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
