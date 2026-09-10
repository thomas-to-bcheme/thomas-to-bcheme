import type { AiMlModel } from '../../types';

/**
 * k-Nearest Neighbours — the first entry in the instance-and-kernel group, and
 * the one that drops the linear form entirely.
 *
 * Worth authoring immediately after the linear models because it is their exact
 * opposite on every axis that matters: no parameters, no training, no
 * assumption about functional form — and in exchange, the entire cost moves to
 * inference and the entire training set becomes the artefact you have to ship.
 * The code progression is about the two decisions that actually govern kNN
 * performance: how distances are computed, and how the top k is selected
 * without sorting everything.
 */
export const K_NEAREST_NEIGHBOURS: AiMlModel = {
  slug: 'k-nearest-neighbours',
  name: 'k-Nearest Neighbours',
  aliases: ['kNN', 'Instance-based learning', 'Lazy learning', 'Memory-based reasoning'],
  category: 'classical-ml',
  group: 'instance-and-kernel',
  kind: 'model',

  paradigms: ['supervised', 'unsupervised'],
  // 'anomaly-detection' and 'density-estimation' are the unsupervised half:
  // kNN-distance outlier scoring and the k/(n*V_k) density estimator use no
  // labels at all — see applications.featured['anomaly-detection'].
  taskTypes: ['classification', 'regression', 'anomaly-detection', 'density-estimation'],
  paradigmNote:
    'Two genuinely different uses share one mechanism. With labels it is a supervised classifier or regressor; without them, the distance to the k-th neighbour is a density estimate and therefore an outlier score. The neighbour search is identical in both cases, which is why one entry covers both.',

  intuition:
    'Do not build a model of the world. Keep every example you have seen, and when a new point arrives, find the handful that look most like it and copy their answer — a majority vote for a class, an average for a number. Everything hard about the method is hidden in "look most like it": the distance function is the model, and choosing it badly is a modelling error that no amount of tuning k will repair. The trade is stark and worth stating up front: training costs nothing, and inference costs everything.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\hat{y}(\\mathbf{x}) = \\operatorname*{arg\\,min}_{c} \\sum_{i \\in N_k(\\mathbf{x})} w_i \\, L(c, y_i), \\qquad w_i = \\frac{1}{d(\\mathbf{x}, \\mathbf{x}_i) + \\epsilon}',
      symbols: [
        { symbol: 'N_k(\\mathbf{x})', meaning: 'the indices of the k training points closest to x under the chosen metric' },
        { symbol: 'L(c, y_i)', meaning: 'the loss for answering c when the truth is y_i — squared error for regression, 0-1 for classification' },
        { symbol: 'w_i', meaning: 'optional distance weight; uniform weights give the plain vote or mean' },
        { symbol: '\\epsilon', meaning: 'a small constant so a query landing exactly on a training point does not divide by zero' },
      ],
    },
    reading:
      'There is no objective minimized at training time — this is the one model in the category that fits nothing. What the formula states is the prediction rule: over the k nearest points, return the answer with the lowest weighted loss. Substituting squared error makes the minimizer the weighted mean, and substituting 0-1 loss makes it the weighted majority vote, which is why the same algorithm serves regression and classification without modification. It is local empirical risk minimization over a neighbourhood, computed fresh for every query.',
  },

  optimization: {
    method: 'None — the model is the training set. The engineering problem is the neighbour search, not a fit',
    updateRule: {
      formula:
        'N_k(\\mathbf{x}) = \\operatorname*{arg\\,min}_{S \\subseteq \\mathcal{D},\\ |S| = k} \\sum_{i \\in S} d_M(\\mathbf{x}, \\mathbf{x}_i), \\qquad d_M(\\mathbf{x}, \\mathbf{x}_i) = \\sqrt{(\\mathbf{x} - \\mathbf{x}_i)^{\\top} M (\\mathbf{x} - \\mathbf{x}_i)}',
      symbols: [
        { symbol: 'S', meaning: 'a candidate set of k training indices; the rule picks the set with the smallest total distance' },
        { symbol: 'd_M', meaning: 'Mahalanobis-form distance; M = I is Euclidean, M diagonal is per-feature scaling, general M is a learned metric' },
        { symbol: 'M', meaning: 'the matrix that encodes what "similar" means — the closest thing kNN has to a parameter vector' },
        { symbol: '\\mathcal{D}', meaning: 'the stored training set, which is the model in its entirety' },
      ],
    },
    rationale:
      'There is nothing to minimize by gradient or by factorization, so the usual optimization vocabulary does not apply — which is exactly why kNN is worth studying next to a linear model. What replaces it is a set of decisions with real consequences: the metric M (a diagonal M is what feature scaling secretly is, and a learned M is metric learning), the value of k, and the data structure used to find neighbours. A KD-tree gives O(log n) queries in low dimensions and collapses to a full scan somewhere around twenty features; a ball tree tolerates general metrics; above that, exact search stops being the goal and an approximate index is the honest answer.',
    hyperparameters: [
      { name: 'k', role: 'The bias-variance dial. k = 1 has zero training error and enormous variance; large k smooths toward the global majority', typicalRange: '3 to 25, cross-validated; odd values for binary classification to avoid ties' },
      { name: 'distance metric', role: 'The actual model. Euclidean for continuous scaled features, cosine for embeddings and text, Hamming or Gower for mixed and categorical data' },
      { name: 'weighting', role: 'Uniform or inverse-distance. Distance weighting lets a larger k stay locally sensitive, which is usually preferable to a small k' },
      { name: 'feature scaling', role: 'Not optional. An unscaled feature dominates the distance in proportion to its units, so the metric silently encodes your choice of measurement' },
      { name: 'index structure', role: 'Brute force, KD-tree, ball tree, or an approximate index — a latency decision, and above roughly twenty dimensions the only one that matters' },
    ],
    convergence:
      'No iteration and therefore no convergence, but a real asymptotic guarantee: as n grows with k/n approaching zero, the kNN error rate approaches the Bayes error, and the 1-NN error is bounded by twice it. That guarantee is asymptotic in a way that matters, because the rate depends exponentially on dimension. The characteristic failure mode has a name — the curse of dimensionality — and a precise statement: as dimension grows, the ratio between the nearest and farthest distances in a sample converges to one, so every point becomes equally near and "nearest neighbour" stops carrying information. It does not announce itself; accuracy simply decays toward the base rate while the code keeps working perfectly.',
    complexity:
      'Training: O(1), or O(n log n) to build a tree index. Query, brute force: O(nd) time and O(nd) memory resident for the whole training set. KD-tree query: O(log n) in low dimensions, degrading to O(n) as dimension rises. Approximate indexes trade a recall guarantee for sublinear query time, which is the trade production systems almost always take.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Analog forecasting: embed the series into vectors of the last m observations, find the historical windows most similar to the current one, and forecast by averaging what happened next after each of them. The metric runs over the delay embedding rather than over raw features, so the model asks "when has the recent past looked like this before?" and answers with the empirical continuation.',
        where: [
          'Nonlinear and chaotic series where a global functional form fits badly but local structure repeats — hydrology, some load and flow series',
          'Motif-based short-horizon forecasting on high-frequency data with strong repeating patterns',
          'A non-parametric sanity baseline against a fitted model: if analog forecasting is competitive, the dynamics are more repetitive than the fitted model assumes',
        ],
        why: 'It makes no assumption about the functional form of the dynamics, which is a genuine advantage where the series is nonlinear and the sample is long enough for the past to contain relevant analogues. It fails exactly where those conditions fail: a short history has no analogues, and a trending series has none either, because every recent window is in a region the past never visited. Extrapolation is impossible by construction — the forecast is always a weighted average of things that already happened.',
        featurization: [
          'Delay embedding: stack the last m lags into the query vector, with m chosen from the autocorrelation structure',
          'Detrend and deseasonalize first, so similarity is judged on shape rather than on level',
          'Scale the embedding dimensions, since distance across lags is otherwise dominated by the highest-variance ones',
          'Restrict the candidate pool to matching seasonal phase where the seasonality is strong',
        ],
        evaluation:
          'Rolling-origin backtesting with an expanding candidate pool, scored with MASE against seasonal-naive. Report how many analogues were actually within a meaningful distance — a forecast built from k distant neighbours is an average of unrelated windows dressed up as a prediction.',
        pitfalls: [
          'Allowing the neighbour search to see windows from after the forecast origin, which is a leak that looks like skill',
          'Trend: the current window sits outside the range the past covered, so the nearest analogues are all systematically lower or higher',
          'Reporting a forecast without reporting neighbour distance, so a no-analogue situation is indistinguishable from a confident one',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'The distance to the k-th nearest neighbour is itself the anomaly score: a point in a dense region has close neighbours, a point in empty space does not. Local Outlier Factor refines this by comparing a point’s local density to the density of its own neighbours, which is what lets it flag a point that is sparse relative to its cluster even though a global distance threshold would call it normal.',
        where: [
          'Fraud and intrusion detection where anomalies are defined by dissimilarity to any known-normal pattern',
          'Manufacturing and process monitoring with clusters of distinct normal operating regimes',
          'Data-quality screening, where the anomalies of interest are records unlike any other record',
          'Novelty detection in embedding space — flagging inputs far from the training distribution of a deployed model',
        ],
        why: 'It is the honest default when normal behaviour is multi-modal and you cannot write down its shape. A parametric detector must assume a form for normality; this one only assumes that normal points have neighbours, which is a far weaker commitment. The reasons not to use it are equally concrete: the score costs a full neighbour search per point, and in high dimensions the distances it depends on stop separating, which is the same curse that ends its use as a classifier.',
        featurization: [
          'Scale on a confirmed-clean window and persist those statistics; the metric is the detector',
          'Reduce dimension first — PCA or a learned embedding — since distance-based scoring degrades well before the dimension count looks alarming',
          'Choose k above the size of the smallest legitimate cluster, or a small genuine mode gets scored as a set of outliers',
        ],
        evaluation:
          'Precision@k against confirmed incidents with the threshold taken from score quantiles on clean data, plus PR-AUC rather than ROC-AUC given the class imbalance. Hold out whole anomaly episodes, never individual points from inside one, or neighbouring points from the same episode make each other look normal.',
        pitfalls: [
          'A cluster of anomalies masks itself: with more than k of them together, they are each other’s neighbours and none scores as isolated',
          'Contaminated reference data quietly redefines normal to include the thing being hunted',
          'Query cost grows with the reference set, so the detector gets slower exactly as it accumulates the history that makes it good',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'There is no objective to optimize and no decision to produce under constraints — the method deliberately fits nothing, and its only search problem, finding the k nearest points, is an indexing question rather than a decision one.',
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Item-item collaborative filtering is kNN with the interaction matrix as the feature space and cosine similarity as the metric: to recommend for a user, take the items they engaged with, retrieve each item’s nearest neighbours, and rank by aggregated similarity. User-user filtering is the same computation transposed.',
        where: [
          'Item-item collaborative filtering, still a production default for "customers who bought this also bought"',
          'Candidate generation ahead of a learned ranker, where recall matters far more than the ordering',
          'Cold-start-by-content: nearest neighbours in a content-embedding space for items with no interaction history',
        ],
        why: 'Item-item neighbourhoods are stable, cheap to precompute, and give an explanation for free — "because you watched X" is the model’s actual mechanism rather than a post-hoc story. It stops being enough when interactions are sparse and the signal has to be shared across items, which is what matrix factorization and two-tower models exist to do; but as a candidate generator underneath them it remains hard to beat.',
        featurization: [
          'Cosine or adjusted-cosine similarity rather than Euclidean, since interaction vectors differ in magnitude by popularity',
          'Down-weight popular items, which are otherwise close to everything and dominate every neighbourhood',
          'Precompute and truncate the item-item neighbour lists offline; only the top few dozen per item are ever read',
        ],
        evaluation:
          'Recall@k and coverage on a temporal split, never a random one. Measure catalogue coverage explicitly: a neighbourhood model that scores well by recommending the same head items to everyone is a popularity baseline in disguise.',
        pitfalls: [
          'Popularity bias compounding into a feedback loop — recommended items gain interactions and become closer neighbours to everything',
          'Cold items have no interaction vector and therefore no neighbours, so the content fallback is not optional',
          'Neighbour lists computed once and never refreshed, which silently freezes the catalogue as it was months ago',
        ],
      },
      'computer-vision': {
        fit: 'adapted',
        how: 'Not on pixels — on embeddings. A pretrained network maps images to vectors in which semantic similarity is approximately distance, and kNN over those vectors gives retrieval, verification, and few-shot classification without training a classifier at all. Face verification in its deployed form is a nearest-neighbour decision on a learned embedding.',
        where: [
          'Reverse image search and visual similarity retrieval',
          'Face and object verification against an enrolled gallery, where classes appear and disappear constantly',
          'Few-shot classification from a handful of labelled examples per class',
          'Near-duplicate detection and content moderation against a known-bad reference set',
        ],
        why: 'It is the right structure whenever the set of classes is open or changes constantly: adding a new identity means inserting one vector, not retraining a head. Its quality is entirely inherited from the embedding — kNN adds no representational power at all, which is precisely why it works so well on top of a good encoder and so badly on raw pixels, where Euclidean distance measures brightness rather than content.',
        featurization: [
          'L2-normalize embeddings so cosine and Euclidean distance become equivalent and thresholds transfer',
          'Use the encoder’s own training metric; a model trained with a cosine margin should not be queried with unnormalized Euclidean distance',
          'Move to an approximate index past a few hundred thousand vectors, where exact search stops meeting latency',
        ],
        evaluation:
          'Recall@k and mean average precision for retrieval; for verification, the ROC over distance thresholds, with the operating point chosen from the cost of a false accept relative to a false reject.',
        pitfalls: [
          'A distance threshold tuned on one embedding version silently invalidated when the encoder is retrained',
          'Gallery drift — enrolled vectors captured under conditions that no longer resemble query conditions',
          'Treating the top-1 neighbour as a decision without a distance floor, so an out-of-gallery query always matches somebody',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Zero, and that is not a figure of speech — storing the data is the whole of training. Building a tree or approximate index is the only cost, and it is an indexing cost rather than a fitting one.',
    inferenceProfile:
      'The expensive half. A brute-force query is O(nd) and grows with every example ever collected, so latency degrades as the dataset improves. Approximate indexes restore sublinear query time at the cost of a recall guarantee, and that trade — not the model — is where the engineering work goes.',
    retrainingCadence:
      'There is nothing to retrain; new data is simply inserted. That is a genuine operational advantage, and it hides a genuine operational risk: nobody schedules a review of a model that never retrains, so drift in the metric or in feature scaling goes unnoticed for a long time.',
    driftAndMonitoring: [
      'Track the distance distribution of queries to their neighbours — rising distances mean queries are landing in regions the reference set does not cover, which is the early warning that nothing else gives you',
      'Monitor reference-set size against p99 latency, since the two move together by construction',
      'Watch the feature scaling statistics as a first-class artefact; a scaler change silently rewrites the metric and therefore the model',
      'For approximate indexes, sample exact recall on a schedule — index quality degrades with insertions and nothing surfaces it otherwise',
    ],
    productionGotchas: [
      'The training data IS the model and must ship with it, which makes deletion requests, licensing, and access control model problems rather than data problems',
      'That memorization is literal: neighbours can be inspected and inverted, so a kNN over personal records leaks those records to anyone who can query it enough times',
      'Feature scaling must be persisted exactly; refitting a scaler changes what "near" means and every prediction with it',
      'Class imbalance skews the vote — with a 95/5 split, most neighbourhoods are majority-class regardless of the query, so either weight the vote or rebalance the reference set',
      'A new categorical level has no sensible distance to anything, so the encoding decides the answer; leaving it to a default one-hot puts every unseen level equidistant from everything',
    ],
  },

  assumptions: [
    'Similar inputs have similar outputs — the smoothness assumption, and the only one the method actually makes about the world',
    'The distance metric reflects the similarity that matters for the task, which is a modelling claim and not a technical detail',
    'Features are scaled comparably, since distance is measured in feature units',
    'The intrinsic dimension is low enough that distances still discriminate, whatever the nominal feature count says',
    'The training set covers the region queries arrive in; there is no extrapolation mechanism whatsoever',
  ],

  pros: [
    {
      point: 'No training, and new data is incorporated by insertion',
      context:
        'Decisive where the label set is open or changes constantly — face galleries, product catalogues, evolving fraud patterns — because adding a class costs one write. Worth nothing where the data is static and inference latency is the binding constraint.',
    },
    {
      point: 'Makes no assumption about the shape of the decision boundary',
      context:
        'It will fit an arbitrarily complicated boundary given enough data, which is exactly what a linear model cannot do. The cost is that "enough data" grows exponentially with dimension, so the flexibility is real in low dimensions and illusory in high ones.',
    },
    {
      point: 'Predictions come with their own explanation',
      context:
        'The neighbours ARE the justification, which is uniquely defensible in review settings — a reviewer can look at the five cases the answer came from. Most interpretability methods approximate the model; here the explanation is the mechanism.',
    },
    {
      point: 'One mechanism serves classification, regression, density estimation, and outlier scoring',
      context:
        'The same neighbour search answers all four, which makes it an efficient thing to build infrastructure around. Less compelling if only one of the four is ever needed, where a purpose-built model will beat it.',
    },
  ],

  cons: [
    {
      point: 'The curse of dimensionality destroys it, quietly',
      context:
        'Above roughly twenty informative dimensions, nearest and farthest distances converge and the neighbourhood stops being informative. Nothing errors — accuracy just decays toward the base rate, which makes this the most under-diagnosed failure in the method.',
    },
    {
      point: 'Inference cost scales with the size of the training set',
      context:
        'Backwards from every other model here: it gets slower as it gets better. Past a few hundred thousand references this forces an approximate index, and with it an accuracy budget that has to be monitored.',
    },
    {
      point: 'The whole training set must be stored and shipped',
      context:
        'A memory and a governance problem at once. Under a deletion regime the model itself contains the personal data, so "delete the record" means editing the model, which no other entry in this section requires.',
    },
    {
      point: 'Highly sensitive to scaling, irrelevant features, and class imbalance',
      context:
        'An irrelevant feature adds noise to every distance and cannot be down-weighted the way a linear model would zero its coefficient. In practice this means feature selection is a prerequisite here, not an improvement.',
    },
  ],

  relatedSlugs: ['support-vector-machine', 'k-means', 'ann-index'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""k-NN classification and regression - the prediction rule, transcribed.

There is no fit step: predict() does all the work, every time. The loop below
is the definition of N_k(x) - measure the distance to every stored point, keep
the k smallest, then reduce their labels under the loss.
"""

import math


def euclidean(a, b):
    total = 0.0
    for j in range(len(a)):
        difference = a[j] - b[j]
        total += difference * difference
    return math.sqrt(total)


def k_nearest(X_train, query, k):
    """Indices of the k closest training points, nearest first."""
    distances = []
    for i in range(len(X_train)):
        distances.append((euclidean(X_train[i], query), i))

    # Full sort of all n distances to keep k of them - correct, and wasteful.
    distances.sort()
    return [index for _, index in distances[:k]]


def predict_label(X_train, y_train, query, k=5):
    """0-1 loss: the minimizer over the neighbourhood is the majority vote."""
    votes = {}
    for index in k_nearest(X_train, query, k):
        label = y_train[index]
        votes[label] = votes.get(label, 0) + 1

    best_label = None
    best_count = -1
    for label, count in votes.items():
        if count > best_count:
            best_label = label
            best_count = count
    return best_label


def predict_value(X_train, y_train, query, k=5):
    """Squared loss: the minimizer over the neighbourhood is the mean."""
    neighbours = k_nearest(X_train, query, k)
    total = 0.0
    for index in neighbours:
        total += y_train[index]
    return total / len(neighbours)`,
        profile: 'O(n*d) distances plus an O(n log n) sort per query, in interpreter loops. The sort is the obvious cost and not the largest one.',
      },
      'make-it-right': {
        code: `"""k-NN - typed, validated, vectorized distances, partial selection."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

Weighting = Literal["uniform", "distance"]


@dataclass(frozen=True)
class NeighbourIndex:
    """The 'fitted' model: the reference set, plus the metric it is read under.

    Scaling lives here rather than in the caller's pipeline because it is part
    of the metric, and the metric is the model.
    """

    points: Matrix
    labels: NDArray
    centre: Vector
    scale: Vector
    k: int
    weighting: Weighting = "uniform"

    def _neighbours(self, queries: Matrix) -> tuple[NDArray, Matrix]:
        scaled = (queries - self.centre) / self.scale
        # (q, n) matrix of squared distances - the sqrt is monotone, so it is
        # never taken for ranking, only where a weight needs the true distance.
        squared = ((scaled[:, None, :] - self.points[None, :, :]) ** 2).sum(axis=2)
        # argpartition is O(n) selection, not O(n log n) sorting.
        selected = np.argpartition(squared, self.k - 1, axis=1)[:, : self.k]
        chosen = np.take_along_axis(squared, selected, axis=1)
        return selected, chosen

    def predict_label(self, queries: Matrix) -> NDArray:
        if queries.ndim != 2 or queries.shape[1] != self.points.shape[1]:
            raise ValueError(
                f"expected (q, {self.points.shape[1]}) queries, got {queries.shape}"
            )

        selected, squared = self._neighbours(queries)
        weights = self._weights(squared)

        classes = np.unique(self.labels)
        scores = np.empty((queries.shape[0], classes.size), dtype=np.float64)
        for position, label in enumerate(classes):
            scores[:, position] = (weights * (self.labels[selected] == label)).sum(axis=1)
        return classes[scores.argmax(axis=1)]

    def predict_value(self, queries: Matrix) -> Vector:
        selected, squared = self._neighbours(queries)
        weights = self._weights(squared)
        return (weights * self.labels[selected]).sum(axis=1) / weights.sum(axis=1)

    def _weights(self, squared: Matrix) -> Matrix:
        if self.weighting == "uniform":
            return np.ones_like(squared)
        # Guard the exact-match case explicitly rather than relying on inf.
        return 1.0 / (np.sqrt(squared) + 1e-12)


def build(
    X: Matrix,
    y: NDArray,
    k: int = 5,
    weighting: Weighting = "uniform",
) -> NeighbourIndex:
    """Store the reference set. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if not 1 <= k <= X.shape[0]:
        raise ValueError(f"k must lie in [1, {X.shape[0]}], got {k}")

    centre = X.mean(axis=0)
    scale = X.std(axis=0)
    scale[scale == 0.0] = 1.0

    return NeighbourIndex(
        points=(X - centre) / scale,
        labels=y,
        centre=centre,
        scale=scale,
        k=k,
        weighting=weighting,
    )`,
        rationale:
          'Two changes that matter more than the vectorization. The full sort becomes argpartition — selecting the k smallest is an O(n) problem and sorting all n to answer it was the algorithmic mistake in the previous stage. And the square root disappears from ranking entirely, because it is monotone: comparing squared distances gives the same ordering for a fraction of the cost. Structurally, scaling moves inside the index where it belongs (it is part of the metric, not preprocessing), queries are answered in batches rather than one at a time, and malformed input fails at the boundary instead of deep inside a loop.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(q*n*d) distances plus O(q*n) selection, executed in NumPy rather than the interpreter.',
      },
      'make-it-fast': {
        code: `"""k-NN - squared-norm expansion, one GEMM, chunked over queries."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class BlockedNeighbours:
    """Exact k-NN, with the distance matrix computed as a matrix product.

    ||q - x||^2 = ||q||^2 - 2 q . x + ||x||^2

    The cross term is the only part that depends on both operands, and it is a
    single GEMM. The two squared-norm terms are precomputed once per side, so
    the per-query cost collapses onto BLAS instead of onto a broadcast
    subtraction that materializes a (q, n, d) intermediate.
    """

    def __init__(self, points: Matrix, labels: NDArray, k: int = 5) -> None:
        if not 1 <= k <= points.shape[0]:
            raise ValueError(f"k must lie in [1, {points.shape[0]}], got {k}")
        # One contiguous float64 block: BLAS reads it without an internal copy.
        self._points = np.ascontiguousarray(points, dtype=np.float64)
        self._labels = labels
        self._k = k
        self._point_norms = np.einsum("ij,ij->i", self._points, self._points)

    def query(self, queries: Matrix, chunk: int = 4096) -> tuple[NDArray, Matrix]:
        """Returns (neighbour indices, squared distances) for every query."""
        queries = np.ascontiguousarray(queries, dtype=np.float64)
        n_queries = queries.shape[0]

        indices = np.empty((n_queries, self._k), dtype=np.int64)     # allocated once
        distances = np.empty((n_queries, self._k), dtype=np.float64)

        # Chunking bounds peak memory at (chunk, n) rather than (q, n), which is
        # what makes a million-query batch possible at all.
        for start in range(0, n_queries, chunk):
            stop = min(start + chunk, n_queries)
            block = queries[start:stop]

            squared = self._points @ block.T                  # the GEMM
            squared *= -2.0                                   # in place
            squared += self._point_norms[:, None]
            # ||q||^2 is constant within a column and does not affect ranking,
            # so it is added only because callers read the distances back.
            squared += np.einsum("ij,ij->i", block, block)[None, :]

            selected = np.argpartition(squared, self._k - 1, axis=0)[: self._k]
            chosen = np.take_along_axis(squared, selected, axis=0)

            order = np.argsort(chosen, axis=0)                # k log k, not n log n
            indices[start:stop] = np.take_along_axis(selected, order, axis=0).T
            distances[start:stop] = np.take_along_axis(chosen, order, axis=0).T

        return indices, distances

    def predict_value(self, queries: Matrix) -> Vector:
        indices, _ = self.query(queries)
        return self._labels[indices].mean(axis=1)`,
        rationale:
          'The distance computation stops being a broadcast subtraction and becomes a matrix product, by expanding the square: the only term involving both operands is the inner product, which is a GEMM, and the two norm terms are precomputed once per side. That removes the (q, n, d) intermediate the previous stage materialized, which was the real memory ceiling rather than the arithmetic. Queries are then processed in chunks so peak memory is bounded independently of batch size. The remaining honesty caveat is that this makes exact brute force fast without making it sublinear — past a few hundred thousand references the answer is an approximate index, not a better GEMM.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The cross term becomes one GEMM, and the squared norms are einsum reductions computed once per side rather than per pair.',
            tradeoff: 'The expansion is less numerically stable than a direct subtraction — cancellation between large squared norms can produce small negative distances that must be clipped before any sqrt.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Index and distance outputs are allocated once for the whole batch, and the distance block is built with in-place multiply and add rather than three temporaries per chunk.',
            tradeoff: 'The in-place chain is order-dependent and no longer reads as the formula it implements, so a reordered line changes the result silently instead of failing.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Chunking over queries turns per-query Python dispatch into one BLAS call per few thousand queries, and bounds peak memory at (chunk, n) instead of (q, n).',
            tradeoff: 'Chunk size is a tuning parameter with no good default — too small and dispatch dominates, too large and the distance block no longer fits in cache.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(q*n*d) in BLAS plus O(q*n) selection, memory bounded by the chunk. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// k-NN classification - the prediction rule, transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <map>
#include <utility>
#include <vector>

double Euclidean(const std::vector<double>& a, const std::vector<double>& b) {
  double total = 0.0;
  for (std::size_t j = 0; j < a.size(); ++j) {
    const double difference = a[j] - b[j];
    total += difference * difference;
  }
  return std::sqrt(total);
}

// Indices of the k nearest training points, nearest first.
std::vector<std::size_t> KNearest(const std::vector<std::vector<double>>& X,
                                  const std::vector<double>& query,
                                  std::size_t k) {
  std::vector<std::pair<double, std::size_t>> distances;
  for (std::size_t i = 0; i < X.size(); ++i) {
    distances.emplace_back(Euclidean(X[i], query), i);
  }

  // Sorting all n to keep k of them - correct, and the wrong algorithm.
  std::sort(distances.begin(), distances.end());

  std::vector<std::size_t> neighbours;
  for (std::size_t rank = 0; rank < k && rank < distances.size(); ++rank) {
    neighbours.push_back(distances[rank].second);
  }
  return neighbours;
}

int PredictLabel(const std::vector<std::vector<double>>& X,
                 const std::vector<int>& y,
                 const std::vector<double>& query,
                 std::size_t k) {
  std::map<int, int> votes;
  for (const std::size_t index : KNearest(X, query, k)) {
    votes[y[index]] += 1;
  }

  int best_label = 0;
  int best_count = -1;
  for (const auto& [label, count] : votes) {
    if (count > best_count) {
      best_label = label;
      best_count = count;
    }
  }
  return best_label;
}`,
        profile: 'O(n*d) distances plus an O(n log n) sort per query, over a nested vector that scatters every reference point across the heap.',
      },
      'make-it-right': {
        code: `// k-NN - flat row-major storage, RAII, partial selection, fails fast.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <unordered_map>
#include <utility>
#include <vector>

class NeighbourIndex {
 public:
  // points is row-major and flat: point i occupies points[i * d, (i + 1) * d).
  NeighbourIndex(std::vector<double> points, std::vector<int> labels,
                 std::size_t dimension)
      : points_(std::move(points)),
        labels_(std::move(labels)),
        dimension_(dimension) {
    if (dimension_ == 0 || labels_.empty()) {
      throw std::invalid_argument("empty reference set");
    }
    if (points_.size() != labels_.size() * dimension_) {
      throw std::invalid_argument("points and labels describe different counts");
    }
    scratch_.resize(labels_.size());
  }

  // Squared distance: the sqrt is monotone and never needed for ranking.
  [[nodiscard]] double SquaredDistance(std::size_t index,
                                       std::span<const double> query) const {
    const double* point = points_.data() + index * dimension_;
    double total = 0.0;
    for (std::size_t j = 0; j < dimension_; ++j) {
      const double difference = point[j] - query[j];
      total += difference * difference;
    }
    return total;
  }

  [[nodiscard]] int PredictLabel(std::span<const double> query,
                                 std::size_t k) const {
    if (query.size() != dimension_) {
      throw std::invalid_argument("query width does not match the index");
    }
    if (k == 0 || k > labels_.size()) {
      throw std::invalid_argument("k outside the reference set");
    }

    for (std::size_t i = 0; i < labels_.size(); ++i) {
      scratch_[i] = {SquaredDistance(i, query), i};
    }

    // nth_element partitions in O(n); std::sort would pay O(n log n) to order
    // points that are never looked at.
    std::nth_element(scratch_.begin(), scratch_.begin() + static_cast<long>(k),
                     scratch_.end());

    std::unordered_map<int, int> votes;
    for (std::size_t rank = 0; rank < k; ++rank) {
      votes[labels_[scratch_[rank].second]] += 1;
    }

    return std::max_element(votes.begin(), votes.end(),
                            [](const auto& a, const auto& b) {
                              return a.second < b.second;
                            })
        ->first;
  }

 private:
  std::vector<double> points_;                 // owned; rule of zero elsewhere
  std::vector<int> labels_;
  std::size_t dimension_;
  mutable std::vector<std::pair<double, std::size_t>> scratch_;
};`,
        rationale:
          'The nested vector becomes one flat row-major buffer, which is the layout the query loop actually wants — a reference point is contiguous, so the distance accumulation is a straight walk the prefetcher can follow. The full sort becomes nth_element: selecting the k smallest is a linear-time partition, and ordering the other n - k points was work whose result was discarded. The square root leaves the distance function entirely, since ranking is unaffected by a monotone transform. Ownership and validation move into the constructor, so an index that exists is an index whose invariants hold.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d) distances plus O(n) selection per query, one reusable scratch buffer, contiguous access throughout.',
      },
      'make-it-fast': {
        code: `// k-NN - Eigen GEMM over query blocks, OpenMP across queries.
#include <Eigen/Dense>
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <stdexcept>
#include <vector>

// Row-major everywhere: a point is one contiguous run, which is what both the
// GEMM and the per-query selection want.
using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

class BlockedNeighbours {
 public:
  explicit BlockedNeighbours(RowMajorMatrix points)
      : points_(std::move(points)),
        point_norms_(points_.rowwise().squaredNorm()) {
    if (points_.rows() == 0) throw std::invalid_argument("empty reference set");
  }

  // ||q - x||^2 = ||x||^2 - 2 x . q + ||q||^2
  //
  // Only the cross term depends on both sides, and it is one GEMM over the
  // whole query block. The norms are precomputed once per side; the ||q||^2
  // term is constant down a column and is omitted because it cannot change the
  // ranking within a query.
  [[nodiscard]] std::vector<std::vector<int>> Query(const RowMajorMatrix& queries,
                                                    int k) const {
    if (queries.cols() != points_.cols()) {
      throw std::invalid_argument("query width does not match the index");
    }

    const Eigen::Index n_queries = queries.rows();
    std::vector<std::vector<int>> result(static_cast<std::size_t>(n_queries));

    RowMajorMatrix cross = points_ * queries.transpose();   // (n, q), one GEMM

#pragma omp parallel for schedule(static)
    for (Eigen::Index q = 0; q < n_queries; ++q) {
      // Column q holds every distance for this query; rank it independently.
      Eigen::VectorXd scores = point_norms_ - 2.0 * cross.col(q);

      std::vector<int> order(static_cast<std::size_t>(scores.size()));
      std::iota(order.begin(), order.end(), 0);
      std::nth_element(order.begin(), order.begin() + k, order.end(),
                       [&scores](int a, int b) { return scores[a] < scores[b]; });
      order.resize(static_cast<std::size_t>(k));
      std::sort(order.begin(), order.end(),
                [&scores](int a, int b) { return scores[a] < scores[b]; });

      result[static_cast<std::size_t>(q)] = std::move(order);
    }

    return result;
  }

 private:
  RowMajorMatrix points_;
  Eigen::VectorXd point_norms_;
};`,
        rationale:
          'The per-query distance loop becomes one matrix product for the entire query block, by expanding the squared norm so the only term involving both operands is an inner product. Selection then stays per-query but runs on an already-computed column, and because each query is independent the selection loop parallelizes across cores with no shared state. What has NOT changed is the asymptotics: this is still an exact linear scan per query, and no amount of BLAS makes it sublinear — that requires an index and an accepted recall loss.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The cross term for every (point, query) pair is a single GEMM that Eigen dispatches to a blocked kernel, replacing n*q separate dot products each of which re-reads the query.',
            tradeoff: 'Materializes an (n, q) distance block, so peak memory grows with the query batch — the caller must chunk, and nothing in the signature says so.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each query selects from its own column of the block with no shared mutable state, so the selection phase scales across cores essentially linearly.',
            tradeoff: 'The GEMM is already multithreaded internally, so nesting OpenMP around a threaded BLAS can oversubscribe cores and lose to the sequential version unless thread counts are set deliberately.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A reference point is one contiguous run, so both the GEMM panels and the norm precomputation read sequentially instead of striding across the matrix.',
            tradeoff: 'Row-major is the wrong choice if the same data also feeds a column-wise algorithm; keeping both layouts means keeping two copies.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n*q*d) in BLAS plus O(n) selection per query across cores. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! k-NN classification - the prediction rule, transcribed.

use std::collections::HashMap;

fn euclidean(a: &[f64], b: &[f64]) -> f64 {
    let mut total = 0.0;
    for j in 0..a.len() {
        let difference = a[j] - b[j];
        total += difference * difference;
    }
    total.sqrt()
}

/// Indices of the k nearest training points, nearest first.
pub fn k_nearest(x: &[Vec<f64>], query: &[f64], k: usize) -> Vec<usize> {
    let mut distances: Vec<(f64, usize)> = Vec::new();
    for i in 0..x.len() {
        distances.push((euclidean(&x[i], query), i));
    }

    // Sorting all n to keep k of them, and f64 has no total order so the
    // comparator has to be spelled out.
    distances.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

    let mut neighbours = Vec::new();
    for rank in 0..k.min(distances.len()) {
        neighbours.push(distances[rank].1);
    }
    neighbours
}

pub fn predict_label(x: &[Vec<f64>], y: &[i32], query: &[f64], k: usize) -> i32 {
    let mut votes: HashMap<i32, i32> = HashMap::new();
    for index in k_nearest(x, query, k) {
        *votes.entry(y[index]).or_insert(0) += 1;
    }

    let mut best_label = 0;
    let mut best_count = -1;
    for (label, count) in votes {
        if count > best_count {
            best_label = label;
            best_count = count;
        }
    }
    best_label
}`,
        profile: 'O(n*d) distances plus an O(n log n) sort per query, every index bounds-checked, rows scattered across the heap.',
      },
      'make-it-right': {
        code: `//! k-NN - typed errors, a bounded heap, borrowed slices.

use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap};
use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum QueryError {
    EmptyReferenceSet,
    ShapeMismatch { expected: usize, found: usize },
    InvalidK { k: usize, available: usize },
}

impl fmt::Display for QueryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyReferenceSet => write!(f, "reference set is empty"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} features, found {found}")
            }
            Self::InvalidK { k, available } => {
                write!(f, "k={k} exceeds the {available} available points")
            }
        }
    }
}

impl std::error::Error for QueryError {}

/// f64 is only PartialOrd, so a heap of distances needs an explicit total
/// order. Wrapping it is safer than sprinkling unwrap() over partial_cmp.
#[derive(Debug, Clone, Copy, PartialEq)]
struct Candidate {
    squared_distance: f64,
    index: usize,
}

impl Eq for Candidate {}

impl Ord for Candidate {
    fn cmp(&self, other: &Self) -> Ordering {
        // NaN sorts last rather than panicking; a NaN feature is a data bug,
        // and it should surface as a bad neighbour, not a crash mid-query.
        self.squared_distance
            .partial_cmp(&other.squared_distance)
            .unwrap_or(Ordering::Greater)
    }
}

impl PartialOrd for Candidate {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct NeighbourIndex {
    points: Vec<f64>,     // row-major: point i is points[i * d..(i + 1) * d]
    labels: Vec<i32>,
    dimension: usize,
}

impl NeighbourIndex {
    /// Validates the shape contract once, here, so every later query can
    /// assume it holds.
    pub fn new(points: Vec<f64>, labels: Vec<i32>, dimension: usize) -> Result<Self, QueryError> {
        if labels.is_empty() || dimension == 0 {
            return Err(QueryError::EmptyReferenceSet);
        }
        if points.len() != labels.len() * dimension {
            return Err(QueryError::ShapeMismatch {
                expected: labels.len() * dimension,
                found: points.len(),
            });
        }
        Ok(Self { points, labels, dimension })
    }

    /// Squared distance - the sqrt is monotone and irrelevant to ranking.
    #[inline]
    fn squared_distance(point: &[f64], query: &[f64]) -> f64 {
        point
            .iter()
            .zip(query)
            .map(|(p, q)| {
                let difference = p - q;
                difference * difference
            })
            .sum()
    }

    pub fn k_nearest(&self, query: &[f64], k: usize) -> Result<Vec<usize>, QueryError> {
        if query.len() != self.dimension {
            return Err(QueryError::ShapeMismatch {
                expected: self.dimension,
                found: query.len(),
            });
        }
        if k == 0 || k > self.labels.len() {
            return Err(QueryError::InvalidK { k, available: self.labels.len() });
        }

        // A bounded max-heap of size k: push, and evict the worst once full.
        // O(n log k) with O(k) memory, rather than O(n log n) with O(n).
        let mut heap: BinaryHeap<Candidate> = BinaryHeap::with_capacity(k + 1);

        for (index, point) in self.points.chunks_exact(self.dimension).enumerate() {
            let candidate = Candidate {
                squared_distance: Self::squared_distance(point, query),
                index,
            };
            if heap.len() < k {
                heap.push(candidate);
            } else if let Some(worst) = heap.peek() {
                if candidate < *worst {
                    heap.pop();
                    heap.push(candidate);
                }
            }
        }

        let mut neighbours = heap.into_sorted_vec();
        Ok(neighbours.drain(..).map(|c| c.index).collect())
    }

    pub fn predict_label(&self, query: &[f64], k: usize) -> Result<i32, QueryError> {
        let mut votes: HashMap<i32, usize> = HashMap::new();
        for index in self.k_nearest(query, k)? {
            *votes.entry(self.labels[index]).or_default() += 1;
        }
        Ok(votes
            .into_iter()
            .max_by_key(|&(_, count)| count)
            .map(|(label, _)| label)
            .unwrap_or_default())
    }
}
`,
        rationale:
          'The full sort becomes a bounded max-heap of size k, which turns an O(n log n) sort with O(n) scratch into an O(n log k) scan with O(k) — the right algorithm for "keep the smallest k of a stream". Getting there in Rust requires confronting something the other languages let you ignore: f64 is only PartialOrd, so the previous stage papered over it with unwrap() on partial_cmp, which panics on a NaN feature. The Candidate newtype gives distances an explicit total order with a documented NaN policy. Errors become a typed Result, the shape contract is validated once in the constructor, and the flat row-major buffer is walked with chunks_exact so bounds checks fall out of the inner loop.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d) distances plus O(n log k) selection per query, O(k) scratch, bounds checks elided in the inner loop.',
      },
      'make-it-fast': {
        code: `//! k-NN - precomputed norms, linear-time selection, rayon over queries.

use rayon::prelude::*;

/// Exact k-NN over a row-major reference set.
///
/// Two changes carry the speed. The squared norm of every reference point is
/// precomputed once, so a distance costs one dot product instead of a
/// subtract-square-accumulate over d elements. And selection uses
/// select_nth_unstable_by, which partitions in O(n) rather than maintaining a
/// heap in O(n log k).
pub struct FlatIndex {
    points: Vec<f64>,       // row-major: point i is points[i * d..(i + 1) * d]
    norms: Vec<f64>,
    dimension: usize,
}

impl FlatIndex {
    #[must_use]
    pub fn new(points: Vec<f64>, dimension: usize) -> Self {
        let norms: Vec<f64> = points
            .chunks_exact(dimension)
            .map(|point| point.iter().map(|v| v * v).sum())
            .collect();
        Self { points, norms, dimension }
    }

    /// ||q - x||^2 = ||x||^2 - 2 x . q + ||q||^2; the last term is constant
    /// within a query and is dropped, since it cannot change the ranking.
    #[inline]
    fn score(&self, index: usize, query: &[f64]) -> f64 {
        let point = &self.points[index * self.dimension..(index + 1) * self.dimension];
        let cross: f64 = point.iter().zip(query).map(|(p, q)| p * q).sum();
        self.norms[index] - 2.0 * cross
    }

    /// One query. Returns the k nearest indices, nearest first.
    #[must_use]
    pub fn k_nearest(&self, query: &[f64], k: usize) -> Vec<usize> {
        let count = self.norms.len();
        let mut scored: Vec<(f64, usize)> = Vec::with_capacity(count);
        scored.extend((0..count).map(|index| (self.score(index, query), index)));

        // Linear-time partition: everything below position k is smaller than
        // everything above it, and the rest is never ordered at all.
        let split = k.min(count);
        scored.select_nth_unstable_by(split - 1, |a, b| a.0.total_cmp(&b.0));
        scored.truncate(split);
        scored.sort_unstable_by(|a, b| a.0.total_cmp(&b.0));

        scored.into_iter().map(|(_, index)| index).collect()
    }

    /// A batch of queries. Each is independent, so the batch is a parallel map.
    #[must_use]
    pub fn k_nearest_batch(&self, queries: &[f64], k: usize) -> Vec<Vec<usize>> {
        queries
            .par_chunks_exact(self.dimension)
            .map(|query| self.k_nearest(query, k))
            .collect()
    }
}
`,
        rationale:
          'Three changes, each replacing a structure rather than tuning one. Reference norms are precomputed, so a distance becomes a single dot product — the same squared-norm expansion the other two languages use, without needing a matrix library to express it. Selection moves from a bounded heap to select_nth_unstable_by, an O(n) partition that never orders the points it discards. And the batch entry point is a rayon parallel map over queries, which is where the parallelism genuinely is: queries are independent, while a single query is a memory-bound scan that does not benefit from splitting. total_cmp replaces the earlier NaN-policy wrapper, giving f64 a real total order with no allocation.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Queries share the immutable index and touch nothing else, so a batch partitions across cores with no synchronization at all.',
            tradeoff: 'Only helps in batch: a single latency-sensitive query gets nothing, and work-stealing overhead makes small batches slower than the sequential path.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-major storage walked with chunks_exact makes each reference point one contiguous run, so the dot product is a sequential read the prefetcher can follow.',
            tradeoff: 'The caller must flatten and keep the dimension in sync by hand; the type system carries no shape information, so a wrong dimension is a silent misread rather than a compile error.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The score buffer is allocated at its exact final length before the scan, so filling it never triggers a grow-and-copy of n elements.',
            tradeoff: 'Allocates O(n) per query, which is the cost of linear-time selection — the heap version used O(k) and is the better choice when n is huge and k is tiny.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*d) per query spread across a batch, plus O(n) selection. Illustrative, not a measured benchmark.',
      },
    },
  },
};
