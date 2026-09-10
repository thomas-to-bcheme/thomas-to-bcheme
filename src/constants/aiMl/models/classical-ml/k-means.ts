import type { AiMlModel } from '../../types';

/**
 * k-Means Clustering — the hard-assignment special case of a Gaussian mixture,
 * and the most-used unsupervised algorithm there is.
 *
 * Sits after PCA in the structure group because it answers the other
 * unsupervised question: PCA describes the data with fewer axes, this describes
 * it with fewer points. The code progression is built around the two decisions
 * that separate a usable implementation from a toy — how the centroids are
 * initialized, and how the n-by-k distance matrix is computed without
 * materializing it.
 */
export const K_MEANS: AiMlModel = {
  slug: 'k-means',
  name: 'k-Means Clustering',
  aliases: ['Lloyd’s algorithm', 'k-means++', 'Vector quantization', 'Mini-batch k-means'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'anomaly-detection' because distance to the assigned centroid is a genuine
  // and widely used outlier score, with the caveats in
  // applications.featured['anomaly-detection'].
  taskTypes: ['clustering', 'anomaly-detection'],
  paradigmNote:
    'Exactly a Gaussian mixture with two restrictions imposed: assignments are hard rather than fractional, and every component is forced to be spherical with equal variance. Reading it that way explains every one of its failure modes in advance, and is why the two entries belong next to each other.',

  intuition:
    'Summarize the data with k representative points. Start with k guesses, assign every observation to its nearest guess, then move each guess to the centre of what it just captured, and repeat until nothing moves. The objective it descends is the total squared distance from points to their own centre, and the two steps alternate between the two things that objective depends on — which assignment, and which centres. What makes it so widely used is that both steps are trivial and it converges quickly. What makes it so widely misused is that it always returns exactly k clusters, whether or not the data has any.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J = \\sum_{k=1}^{K} \\sum_{i \\in C_k} \\lVert \\mathbf{x}_i - \\boldsymbol{\\mu}_k \\rVert_2^2',
      symbols: [
        { symbol: 'C_k', meaning: 'the set of points assigned to cluster k — a hard partition, with no point split between clusters' },
        { symbol: '\\boldsymbol{\\mu}_k', meaning: 'the centroid: the mean of the points assigned to k, which is what squared error makes optimal' },
        { symbol: 'K', meaning: 'the number of clusters, which the objective cannot choose — J falls monotonically as K rises' },
        { symbol: '\\lVert \\cdot \\rVert_2^2', meaning: 'squared Euclidean distance, and therefore an assumption of spherical, comparably-sized clusters' },
      ],
    },
    reading:
      'Add up how far every point is from the centre of its own cluster, squared, and make that total as small as possible. Two consequences hide in the notation. Squared Euclidean distance is what makes the mean the right centre — under any other distance the optimal representative is not a mean — so the algorithm and the metric are not separable choices. And J decreases monotonically as K grows, reaching zero when every point is its own cluster, which means the objective offers no opinion whatsoever on how many clusters there are. Every method for picking K is external to the model.',
  },

  optimization: {
    method: 'Lloyd’s algorithm — alternating minimization, with k-means++ seeding',
    updateRule: {
      formula:
        'C_k \\leftarrow \\left\\{ i : k = \\operatorname*{arg\\,min}_{l} \\lVert \\mathbf{x}_i - \\boldsymbol{\\mu}_l \\rVert_2^2 \\right\\}, \\qquad \\boldsymbol{\\mu}_k \\leftarrow \\frac{1}{\\lvert C_k \\rvert} \\sum_{i \\in C_k} \\mathbf{x}_i',
      symbols: [
        { symbol: '\\leftarrow', meaning: 'the two alternating steps: fix the centres and reassign, then fix the assignment and recentre' },
        { symbol: '\\operatorname*{arg\\,min}_l', meaning: 'nearest-centroid assignment — the step that costs O(n·K·d) and dominates the runtime' },
        { symbol: '\\lvert C_k \\rvert', meaning: 'cluster size; an empty cluster makes this zero, which every implementation must handle explicitly' },
        { symbol: '\\frac{1}{\\lvert C_k \\rvert}\\sum', meaning: 'the mean, which minimizes squared distance exactly — this is why the metric and the update are locked together' },
      ],
    },
    rationale:
      'Minimizing J over both the assignment and the centres jointly is NP-hard, so Lloyd’s algorithm minimizes over one while holding the other fixed and alternates. Each step is exactly optimal for its own subproblem, so J cannot increase and the algorithm terminates in finitely many steps — there are only finitely many partitions, and none is visited twice. That is a convergence guarantee about the algorithm, not about the answer: the fixed point it reaches depends entirely on where it started. This is the same alternating-minimization pattern as EM in a Gaussian mixture, with hard assignments in place of responsibilities, and it inherits the same non-convexity. The one intervention that reliably matters is initialization: k-means++ seeds centres far apart with probability proportional to squared distance, and it turns a method that regularly converges somewhere embarrassing into one that usually does not.',
    hyperparameters: [
      { name: 'K', role: 'The number of clusters, and the only decision that really matters. Not learnable from J, so it comes from the elbow, silhouette, gap statistic, or the application', typicalRange: 'chosen externally; every internal criterion is a heuristic and they routinely disagree' },
      { name: 'init', role: 'k-means++ or random. This is the difference between a reliable method and a lottery, and there is no reason to use random', typicalRange: 'k-means++, always' },
      { name: 'n_init', role: 'Restarts, keeping the run with the lowest J. Still worth several even with k-means++, since the surface is non-convex', typicalRange: '10 with random init, 1 to 3 with k-means++' },
      { name: 'max_iter / tol', role: 'Stop on iteration count or on centroid movement. Rarely binding — convergence is usually tens of iterations', typicalRange: '300 iterations, tol 1e-4 on centroid shift' },
      { name: 'algorithm', role: 'Lloyd, Elkan (triangle-inequality bounds that skip distance computations), or mini-batch. A cost decision; mini-batch trades a slightly worse optimum for a large speedup' },
    ],
    convergence:
      'Guaranteed to terminate at a local optimum in finitely many iterations, and that guarantee is weaker than it sounds — different seeds give materially different partitions, which is why restarts are part of the method. Three failure modes deserve names. Empty clusters: a centroid can capture nothing, its update divides by zero, and the implementation must reseed it, usually to the point furthest from any centre. Shape mismatch: squared Euclidean distance assumes spherical, comparably-sized clusters, so an elongated cluster gets split down the middle and a small cluster next to a large one gets absorbed. And the quietest one — the algorithm always returns K clusters, so it will happily partition uniform noise and report a tidy result, which no internal metric will flag as meaningless.',
    complexity:
      'O(n·K·d) per iteration, dominated entirely by the assignment step, times typically tens of iterations. k-means++ seeding costs an extra O(n·K·d) up front and is worth it. Memory is O(n·d + K·d), with no n-by-n or n-by-K matrix needed if the assignment is computed in chunks. Mini-batch reduces the per-iteration cost to O(b·K·d) for batch size b, which is what makes it viable on data that does not fit in memory.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Cluster series by shape rather than forecasting with it. Normalize each series, cluster the resulting curves, and either fit one model per cluster — pooling data across similar series — or use the cluster label as a feature. On thousands of sparse series this is often what makes modelling possible at all, since no individual series has enough history.',
        where: [
          'Grouping SKUs or meters by demand profile so that a model can be fitted per group rather than per series',
          'Load-profile segmentation in energy, where customer classes are discovered rather than assumed',
          'Clustering learned or engineered series embeddings, where the features already encode shape',
        ],
        why: 'It is the cheapest way to exploit the fact that many series behave alike, and pooling across a cluster is frequently worth more than a better model on each series alone. The caveat is specific and important: Euclidean distance on raw series compares values timestep by timestep, so two identical shapes offset by one period look completely different. Dynamic time warping fixes that and is not compatible with a mean, which is why DTW clustering needs a different centroid definition entirely — it is a different algorithm, not a distance swap.',
        featurization: [
          'Z-normalize each series before clustering, or the clusters simply recover magnitude rather than shape',
          'Cluster on engineered features or a learned embedding rather than raw points when series differ in length or phase',
          'Fit the clustering on the training window only; refitting it across the full history leaks future shape into the labels',
          'Pin the cluster ordering after fitting — label switching makes a cluster id meaningless across refits',
        ],
        evaluation:
          'Rolling-origin backtest of the pooled forecasts, not a clustering metric. A partition that improves silhouette and does not improve forecast error has described the data rather than helped it.',
        pitfalls: [
          'Euclidean distance on unaligned series, where a one-period phase shift dominates any difference in shape',
          'Clusters that reorder between refits, silently changing which pooled model a series is scored by',
          'Choosing K by an internal criterion when the downstream forecast error is the criterion that matters',
        ],
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Cluster the normal data and score each new point by its distance to the nearest centroid. Points far from every centre are candidates. A second, sharper signal is cluster size — a tiny cluster is often a group of anomalies that found each other rather than a genuine mode.',
        where: [
          'Fast novelty screening at volumes where a density model would be too slow to refit',
          'Network intrusion baselines built on clustered normal traffic profiles',
          'A coarse first pass ahead of a more expensive detector, discarding the obviously typical',
        ],
        why: 'It is the crude version of what a Gaussian mixture does properly, and its virtue is entirely operational: assignment is a single nearest-centroid lookup, the model is K points, and both fit and score are far cheaper than a density model. Its weakness follows directly from the spherical equal-variance assumption — the score is a raw distance, so the same distance means something different next to a tight cluster than next to a diffuse one, and there is no per-cluster scale to correct with. When calibration matters, the mixture is the right model; when throughput matters, this is defensible.',
        featurization: [
          'Standardize before clustering, since the distance is Euclidean and unscaled features dominate it',
          'Fit on a confirmed-clean window, or anomalies form their own cluster and become perfectly normal',
          'Normalize the distance by each cluster’s own spread before thresholding, which recovers part of what the spherical assumption discards',
          'Reduce dimension first, since Euclidean distance degrades well before the feature count looks alarming',
        ],
        evaluation:
          'Precision@k against confirmed incidents with thresholds set per cluster rather than globally, and PR-AUC rather than ROC-AUC. Compare against a mixture on the same data — if the mixture is much better, the spherical assumption is the thing costing you.',
        pitfalls: [
          'A global distance threshold across clusters of different spread, which over-alarms on the tight ones and under-alarms on the diffuse ones',
          'Anomalies forming their own cluster during fitting and being scored as central members of it',
          'Contamination pulling a centroid toward the anomalies, which moves normal points away from their own centre',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The objective is NP-hard to minimize jointly, and Lloyd’s algorithm is the textbook alternating-minimization heuristic for it: optimize the assignment with the centres fixed, then the centres with the assignment fixed, and repeat. That is the same structure as EM, as coordinate descent in the Lasso, and as block-coordinate methods generally — this is the smallest example where the pattern is fully visible in a dozen lines.',
        where: [
          'The canonical worked example of alternating minimization and why monotone descent does not imply a global optimum',
          'Vector quantization for compression, where the objective genuinely is the deliverable rather than a proxy',
          'Facility-location and warehouse-siting problems, whose continuous relaxation is exactly this objective',
        ],
        why: 'It is worth studying here because the gap between the problem and the algorithm is unusually explicit: the objective is NP-hard, the algorithm is a heuristic with a termination guarantee and no approximation guarantee, and k-means++ closes part of that gap with an actual bound — expected cost within O(log K) of optimal, purely from how the seeds are drawn. That is a rare, concrete demonstration that initialization can carry a theoretical guarantee rather than being folklore.',
        featurization: [
          'Standardize so that the squared-distance objective weights every dimension comparably',
          'Where the application is genuinely facility location, encode real costs rather than assuming Euclidean distance is the objective',
        ],
        evaluation:
          'Compare the final inertia across many restarts — the spread between the best and worst run is a direct measurement of how non-convex the surface is on this data, and it is more informative than any single run’s value.',
        pitfalls: [
          'Reading monotone descent as convergence to the optimum, when the guarantee is only that it stops',
          'Comparing inertia across different K, which always favours larger K and says nothing',
          'Using random initialization and attributing the resulting variance to the data rather than to the seeding',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'Vector quantization. Colour quantization treats each pixel as a point in colour space and replaces it with its nearest of K centroids, which is image compression by clustering. Bag-of-visual-words does the same to local descriptors: cluster them to build a visual vocabulary, then represent an image by the histogram of which words it contains.',
        where: [
          'Palette reduction and image compression, where the centroids are literally the palette',
          'Bag-of-visual-words pipelines, the standard image representation before learned features',
          'Superpixel segmentation, where a spatially-constrained variant groups adjacent similar pixels',
          'Building a codebook for a downstream retrieval index',
        ],
        why: 'It works here because the problem genuinely is quantization — find K representatives that reconstruct the data well — which is exactly the objective rather than a proxy for it. Colour space is also low-dimensional and roughly isotropic, so the spherical assumption is nearly true. For recognition it has been superseded: a visual vocabulary discards spatial arrangement entirely, which is precisely the information a convolution keeps.',
        featurization: [
          'Work in a perceptually uniform colour space, or Euclidean distance does not correspond to visible difference',
          'Subsample pixels for fitting; a full-resolution image has far more points than the centroids need',
          'For visual words, L2-normalize descriptors first so the vocabulary is not dominated by high-contrast patches',
        ],
        evaluation:
          'Reconstruction error or a perceptual metric for quantization; downstream classification or retrieval accuracy for a vocabulary. Cluster quality metrics are not the deliverable in either case.',
        pitfalls: [
          'Clustering in RGB and being surprised that the palette looks wrong, since RGB distance is not perceptual distance',
          'Vocabulary size chosen by a clustering criterion rather than by downstream accuracy',
          'Refitting the codebook without retraining what consumes it, which reindexes every visual word',
        ],
      },
      'recommendation-ranking': {
        fit: 'viable',
        how: 'Two roles. Segmenting users or items by behaviour, so that a cold-start user can be served their segment’s popular items rather than a global default. And quantizing an embedding space to build the coarse index that approximate nearest-neighbour search uses — an inverted file index is literally k-means over the vectors, with the search restricted to the nearest few cells.',
        where: [
          'User and item segmentation for cold start and for coarse targeting',
          'The coarse quantizer inside an IVF vector index, which is where most large-scale retrieval systems use it',
          'Reducing a catalogue to representative items for exploration or merchandising',
        ],
        why: 'As an index quantizer it is genuinely the standard, because the job is exactly vector quantization and the cost profile fits — fit once offline, then assignment is a single nearest-centroid lookup at query time. As a segmentation tool it is a reasonable coarse instrument and a poor personalization model: a hard assignment to one of twenty segments discards nearly everything a matrix factorization or two-tower model would use.',
        featurization: [
          'L2-normalize embeddings before clustering when the retrieval metric is cosine, so the quantizer and the search agree',
          'Down-weight popularity before behavioural segmentation, or the clusters recover activity level rather than taste',
          'Choose the cell count from the index recall-latency curve, not from a clustering criterion',
        ],
        evaluation:
          'For an index, recall@k against exact search at a fixed latency budget — that curve is the only thing that matters. For segmentation, downstream engagement lift against a global-popularity baseline.',
        pitfalls: [
          'Unbalanced cells in an IVF index, where one enormous cell destroys the latency guarantee the index exists to provide',
          'Treating segment membership as a personalization signal when it is a twenty-way bucket',
          'Refitting the quantizer without rebuilding the index, so cell assignments no longer match the stored lists',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'O(n·K·d) per iteration over tens of iterations, so seconds to minutes on millions of points — and mini-batch removes even that constraint by working on samples. Restarts multiply it directly, which is the main reason a k-means fit is ever slow.',
    inferenceProfile:
      'Assignment is a nearest-centroid lookup: K distance computations, microseconds, with a model of just K·d floats. That combination is why it is the quantizer of choice inside systems that must decide something per request.',
    retrainingCadence:
      'Cheap enough to refit often, and the reason not to is stability rather than cost. Every refit produces a different labelling of the same structure, so anything keyed to a cluster id must be remapped or re-approved, and downstream indexes built on the old centroids have to be rebuilt with them.',
    driftAndMonitoring: [
      'Track inertia per cluster over time — a cluster whose average distance is growing is losing coherence, and it moves before any downstream metric does',
      'Watch cluster sizes; a cluster collapsing toward empty or absorbing everything is a structural change worth investigating rather than absorbing',
      'Monitor the share of points far from every centroid, which is the population arriving that the current partition does not describe',
      'Compare centroid positions across refits after matching them up, since raw cluster indices are not comparable',
    ],
    productionGotchas: [
      'Cluster ids are arbitrary and change on every refit — anything downstream must key on a canonicalized ordering or on the centroid itself, never on the raw index',
      'The scaler is part of the model: refitting it separately changes every distance and therefore every assignment',
      'Empty clusters must be handled explicitly, or the centroid update divides by zero and the fit produces NaN centres that silently swallow every point',
      'Determinism requires pinning the seed, since both k-means++ and random init are stochastic and two runs give different partitions',
      'A new point far from every centroid is still assigned to the nearest one with no indication that it does not belong — the distance must be checked separately if that matters',
    ],
  },

  assumptions: [
    'Clusters are roughly spherical and comparable in size, which is what squared Euclidean distance encodes — elongated or unequal clusters are split and merged incorrectly',
    'Euclidean distance is meaningful for the features, so they must be scaled comparably and not too high-dimensional',
    'The number of clusters is known or can be chosen externally, since the objective always prefers more',
    'Clusters actually exist — the algorithm returns K partitions of uniform noise just as confidently as of genuinely clustered data',
    'The mean is a sensible representative, which fails when outliers are present and is what k-medoids exists to fix',
  ],

  pros: [
    {
      point: 'Fast, simple, and scales to very large datasets',
      context:
        'Linear per iteration in every dimension of the problem, with a mini-batch variant for data that does not fit in memory. This is the reason it is the default clustering algorithm despite every limitation below.',
    },
    {
      point: 'The model is K points, and assignment is one lookup',
      context:
        'Decisive when clustering has to happen inside a request path or an index — an IVF vector index is built on exactly this property. Irrelevant when the clustering is an offline analysis.',
    },
    {
      point: 'Guaranteed to terminate, with a monotone objective',
      context:
        'Convergence is finite and checkable, and the inertia gives a directly comparable quality number across restarts. The guarantee is about stopping, not about the answer, which is the part most often overstated.',
    },
    {
      point: 'k-means++ gives initialization a real guarantee',
      context:
        'An expected cost within a logarithmic factor of optimal, purely from how the seeds are drawn — a rare case where a practical heuristic carries an actual bound. It does not remove the need for restarts.',
    },
  ],

  cons: [
    {
      point: 'It always returns K clusters, whether or not any exist',
      context:
        'The most under-acknowledged failure here: run it on uniform noise and it produces a clean, plausible partition that no internal metric flags. Any clustering result needs a separate argument that structure was there to find.',
    },
    {
      point: 'Assumes spherical, equally-sized clusters',
      context:
        'An elongated cluster is split down the middle and a small cluster beside a large one is absorbed. This is precisely the restriction a Gaussian mixture lifts, which is why the two entries belong side by side.',
    },
    {
      point: 'K must be chosen, and the objective cannot help',
      context:
        'Inertia falls monotonically with K, so every selection method — elbow, silhouette, gap — is external and they routinely disagree. On real data the honest answer is often that no K is clearly right.',
    },
    {
      point: 'Sensitive to scaling, outliers, and initialization',
      context:
        'A single extreme point drags a centroid, an unscaled feature decides the partition, and a bad seed reaches a different local optimum. All three are manageable and all three are routinely unmanaged.',
    },
  ],

  relatedSlugs: ['gaussian-mixture', 'pca', 'spectral-clustering'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""k-means by Lloyd's algorithm - the two steps, transcribed.

Assign every point to its nearest centroid, then move every centroid to the
mean of what it captured. Each step is exactly optimal for its own subproblem
with the other held fixed, which is why the objective can only fall.
"""

import random


def squared_distance(a, b):
    total = 0.0
    for j in range(len(a)):
        difference = a[j] - b[j]
        total += difference * difference
    return total


def fit(X, k, iterations=300, tol=1e-4, seed=0):
    n = len(X)
    d = len(X[0])
    rng = random.Random(seed)

    # Random initialization: this is the version k-means++ replaces, and the
    # difference between them is the single largest practical improvement
    # available to this algorithm.
    centroids = [list(X[i]) for i in rng.sample(range(n), k)]
    assignment = [0] * n

    for _ in range(iterations):
        # ---- assignment step: argmin over centroids ----------------------
        for i in range(n):
            best_cluster = 0
            best_distance = squared_distance(X[i], centroids[0])
            for cluster in range(1, k):
                distance = squared_distance(X[i], centroids[cluster])
                if distance < best_distance:
                    best_cluster = cluster
                    best_distance = distance
            assignment[i] = best_cluster

        # ---- update step: centroid becomes the mean of its members -------
        totals = [[0.0] * d for _ in range(k)]
        counts = [0] * k
        for i in range(n):
            cluster = assignment[i]
            counts[cluster] += 1
            for j in range(d):
                totals[cluster][j] += X[i][j]

        shift = 0.0
        for cluster in range(k):
            if counts[cluster] == 0:
                # An empty cluster divides by zero. Reseeding to a random
                # point is the crude fix; reseeding to the point furthest
                # from any centroid is the better one.
                centroids[cluster] = list(X[rng.randrange(n)])
                continue

            for j in range(d):
                updated = totals[cluster][j] / counts[cluster]
                shift += abs(updated - centroids[cluster][j])
                centroids[cluster][j] = updated

        if shift < tol:
            break

    return centroids, assignment


def inertia(X, centroids, assignment):
    """J = sum over points of the squared distance to their own centroid."""
    total = 0.0
    for i in range(len(X)):
        total += squared_distance(X[i], centroids[assignment[i]])
    return total`,
        profile: 'O(n*k*d) per iteration in interpreter loops, with random initialization that regularly converges somewhere poor.',
      },
      'make-it-right': {
        code: `"""k-means - typed, k-means++ seeded, vectorized assignment."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]


@dataclass(frozen=True)
class KMeansModel:
    """A fitted model: K centroids, and the inertia that produced them."""

    centroids: Matrix       # (K, d)
    inertia: float
    n_iter: int
    converged: bool

    def predict(self, X: Matrix) -> Labels:
        if X.ndim != 2 or X.shape[1] != self.centroids.shape[1]:
            raise ValueError(
                f"expected (n, {self.centroids.shape[1]}) input, got {X.shape}"
            )
        return _assign(X, self.centroids)[0]

    def distance_to_centroid(self, X: Matrix) -> Vector:
        """The anomaly score. Raw distance, so it is NOT comparable across
        clusters of different spread - normalize per cluster before
        thresholding, which is what the spherical assumption costs you."""
        return np.sqrt(_assign(X, self.centroids)[1])


def _assign(X: Matrix, centroids: Matrix) -> tuple[Labels, Vector]:
    """Nearest centroid and its squared distance, for every point at once."""
    squared = ((X[:, None, :] - centroids[None, :, :]) ** 2).sum(axis=2)
    labels = squared.argmin(axis=1)
    return labels, squared[np.arange(X.shape[0]), labels]


def _kmeans_plus_plus(X: Matrix, k: int, rng: np.random.Generator) -> Matrix:
    """Seed centroids far apart, with probability proportional to D^2.

    This is the single most consequential change available to k-means: random
    seeding regularly lands in a poor local optimum, while this carries an
    actual guarantee - expected cost within O(log k) of optimal, purely from
    how the seeds are drawn.
    """
    centroids = np.empty((k, X.shape[1]), dtype=np.float64)
    centroids[0] = X[rng.integers(X.shape[0])]

    closest = ((X - centroids[0]) ** 2).sum(axis=1)
    for index in range(1, k):
        total = closest.sum()
        if total <= 0.0:                       # every point already a centroid
            centroids[index] = X[rng.integers(X.shape[0])]
            continue
        chosen = int(rng.choice(X.shape[0], p=closest / total))
        centroids[index] = X[chosen]
        # Keep only the distance to the NEAREST centroid so far.
        np.minimum(closest, ((X - centroids[index]) ** 2).sum(axis=1), out=closest)

    return centroids


def fit(
    X: Matrix,
    n_clusters: int,
    max_iter: int = 300,
    tol: float = 1e-4,
    n_init: int = 3,
    seed: int = 0,
) -> KMeansModel:
    """Fit by Lloyd's algorithm. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not 1 <= n_clusters <= X.shape[0]:
        raise ValueError(f"n_clusters must lie in [1, {X.shape[0]}], got {n_clusters}")
    if n_init < 1:
        raise ValueError(f"n_init must be at least 1, got {n_init}")

    rng = np.random.default_rng(seed)
    best: KMeansModel | None = None

    # The surface is non-convex, so restarts are part of the method rather
    # than a precaution. The spread across runs measures how non-convex it is.
    for _ in range(n_init):
        centroids = _kmeans_plus_plus(X, n_clusters, rng)
        converged = False
        iteration = 0

        for iteration in range(1, max_iter + 1):
            labels, _ = _assign(X, centroids)

            updated = np.zeros_like(centroids)
            counts = np.bincount(labels, minlength=n_clusters)
            np.add.at(updated, labels, X)

            empty = counts == 0
            if empty.any():
                # Reseed an empty cluster to the point furthest from any
                # centroid, which is where a cluster is most likely missing.
                _, distances = _assign(X, centroids)
                furthest = np.argsort(distances)[-int(empty.sum()):]
                updated[empty] = X[furthest]
                counts[empty] = 1

            updated /= counts[:, None]
            shift = float(np.abs(updated - centroids).max())
            centroids = updated

            if shift < tol:
                converged = True
                break

        labels, distances = _assign(X, centroids)
        candidate = KMeansModel(
            centroids=centroids,
            inertia=float(distances.sum()),
            n_iter=iteration,
            converged=converged,
        )
        if best is None or candidate.inertia < best.inertia:
            best = candidate

    assert best is not None
    return best`,
        rationale:
          'The change that matters most is not the vectorization: it is k-means++ seeding. Random initialization regularly converges to a poor local optimum, and seeding proportional to squared distance carries an actual guarantee — expected cost within a logarithmic factor of optimal — which turns a lottery into a reliable method. Restarts become explicit for the same reason. On top of that, the assignment step becomes a single broadcast reduction, empty clusters are reseeded to the furthest point rather than to a random one, and the fitted model is a frozen dataclass that reports its own inertia and whether it actually converged.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*k*d) per iteration, but the broadcast materializes an (n, k, d) intermediate — which is the memory ceiling, not the arithmetic.',
      },
      'make-it-fast': {
        code: `"""k-means - squared-norm expansion, chunked assignment, in-place updates."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]


class ChunkedKMeans:
    """Assignment as a matrix product, over bounded chunks.

    The broadcast form of the assignment step materializes an (n, k, d)
    intermediate, which at a million points and a hundred clusters in fifty
    dimensions is 40 GB. Expanding the square removes it entirely:

        ||x - c||^2 = ||x||^2 - 2 x . c + ||c||^2

    Only the cross term touches both operands, and it is a GEMM. The ||x||^2
    term is constant within a row and does not affect the argmin, so it is
    never computed at all.
    """

    def __init__(self, n_clusters: int, chunk: int = 8192) -> None:
        if n_clusters < 1:
            raise ValueError(f"n_clusters must be at least 1, got {n_clusters}")
        self._k = n_clusters
        self._chunk = chunk

    def fit(self, X: Matrix, max_iter: int = 300, tol: float = 1e-4, seed: int = 0) -> Matrix:
        design = np.ascontiguousarray(X, dtype=np.float64)
        n, d = design.shape
        rng = np.random.default_rng(seed)

        centroids = np.ascontiguousarray(
            design[rng.choice(n, size=self._k, replace=False)], dtype=np.float64
        )

        # Sufficient statistics, allocated once and reused every iteration.
        totals = np.empty((self._k, d), dtype=np.float64)
        counts = np.empty(self._k, dtype=np.int64)
        labels = np.empty(n, dtype=np.int64)

        for _ in range(max_iter):
            centroid_norms = np.einsum("ij,ij->i", centroids, centroids)
            totals.fill(0.0)
            counts.fill(0)

            # Chunking bounds the (chunk, k) score block rather than (n, k),
            # which is what makes a large n possible in one pass.
            for start in range(0, n, self._chunk):
                stop = min(start + self._chunk, n)
                block = design[start:stop]

                scores = block @ centroids.T          # the GEMM
                scores *= -2.0                        # in place
                scores += centroid_norms              # ||x||^2 omitted: constant per row
                block_labels = scores.argmin(axis=1)
                labels[start:stop] = block_labels

                # Accumulate sufficient statistics per chunk; the full
                # assignment matrix is never held.
                np.add.at(totals, block_labels, block)
                counts += np.bincount(block_labels, minlength=self._k)

            empty = counts == 0
            if empty.any():
                totals[empty] = design[rng.choice(n, size=int(empty.sum()))]
                counts[empty] = 1

            updated = totals / counts[:, None]
            shift = float(np.abs(updated - centroids).max())
            np.copyto(centroids, updated)

            if shift < tol:
                break

        return centroids

    def predict(self, X: Matrix, centroids: Matrix) -> Labels:
        centroid_norms = np.einsum("ij,ij->i", centroids, centroids)
        out = np.empty(X.shape[0], dtype=np.int64)

        for start in range(0, X.shape[0], self._chunk):
            stop = min(start + self._chunk, X.shape[0])
            scores = X[start:stop] @ centroids.T
            scores *= -2.0
            scores += centroid_norms
            out[start:stop] = scores.argmin(axis=1)

        return out`,
        rationale:
          'The broadcast assignment materializes an (n, k, d) intermediate, which at a million points and a hundred clusters is tens of gigabytes — the memory, not the arithmetic, is what breaks. Expanding the squared distance removes it: only the cross term touches both operands, so the assignment becomes a GEMM, and the per-point norm is constant within a row and is never computed because it cannot change the argmin. Chunking bounds the remaining score block, and the M-step is rewritten as sufficient statistics accumulated across chunks, so the full assignment never exists at once.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The cross term becomes one GEMM per chunk and the centroid norms an einsum reduction computed once per iteration rather than per point.',
            tradeoff: 'The expansion is less numerically stable than a direct subtraction — cancellation between large norms can misrank two nearly-equidistant centroids, which matters when clusters overlap.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Chunking bounds the score block at (chunk, k) instead of (n, k), so the fit runs on datasets far larger than that matrix while still entering BLAS only once per chunk.',
            tradeoff: 'The M-step must be restated as accumulated sufficient statistics, which is less obvious than a single grouped mean, and the chunk size is a tuning parameter with no good default.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Totals, counts and labels are allocated once for the whole fit, and the score block is built with in-place multiply and add rather than three temporaries per chunk.',
            tradeoff: 'The in-place chain is order-dependent and the buffers are shared across iterations, so the object is not reentrant and a reordered line corrupts the assignment silently.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n*k*d) per iteration in BLAS, memory bounded by the chunk rather than by n. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// k-means by Lloyd's algorithm - the two steps, transcribed.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

double SquaredDistance(const std::vector<double>& a, const std::vector<double>& b) {
  double total = 0.0;
  for (std::size_t j = 0; j < a.size(); ++j) {
    const double difference = a[j] - b[j];
    total += difference * difference;
  }
  return total;
}

void Fit(const std::vector<std::vector<double>>& X, std::size_t k, int iterations,
         double tol, unsigned seed,
         std::vector<std::vector<double>>& centroids,
         std::vector<std::size_t>& assignment) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::mt19937 generator(seed);
  std::uniform_int_distribution<std::size_t> pick(0, n - 1);

  // Random initialization: the version k-means++ replaces, and the difference
  // between them is the largest practical improvement available here.
  centroids.clear();
  for (std::size_t cluster = 0; cluster < k; ++cluster) {
    centroids.push_back(X[pick(generator)]);
  }
  assignment.assign(n, 0);

  for (int iteration = 0; iteration < iterations; ++iteration) {
    // ---- assignment step -------------------------------------------------
    for (std::size_t i = 0; i < n; ++i) {
      std::size_t best_cluster = 0;
      double best_distance = SquaredDistance(X[i], centroids[0]);
      for (std::size_t cluster = 1; cluster < k; ++cluster) {
        const double distance = SquaredDistance(X[i], centroids[cluster]);
        if (distance < best_distance) {
          best_cluster = cluster;
          best_distance = distance;
        }
      }
      assignment[i] = best_cluster;
    }

    // ---- update step -----------------------------------------------------
    std::vector<std::vector<double>> totals(k, std::vector<double>(d, 0.0));
    std::vector<std::size_t> counts(k, 0);
    for (std::size_t i = 0; i < n; ++i) {
      const std::size_t cluster = assignment[i];
      counts[cluster] += 1;
      for (std::size_t j = 0; j < d; ++j) totals[cluster][j] += X[i][j];
    }

    double shift = 0.0;
    for (std::size_t cluster = 0; cluster < k; ++cluster) {
      if (counts[cluster] == 0) {
        // An empty cluster divides by zero; reseeding is mandatory.
        centroids[cluster] = X[pick(generator)];
        continue;
      }
      for (std::size_t j = 0; j < d; ++j) {
        const double updated = totals[cluster][j] / static_cast<double>(counts[cluster]);
        shift += std::abs(updated - centroids[cluster][j]);
        centroids[cluster][j] = updated;
      }
    }

    if (shift < tol) break;
  }
}`,
        profile: 'O(n*k*d) per iteration over nested vectors that scatter every row, with random initialization and a fresh totals allocation each pass.',
      },
      'make-it-right': {
        code: `// k-means - flat row-major, k-means++ seeding, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

class KMeans {
 public:
  // x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
  // Both the assignment and the centroid update walk one POINT at a time, so
  // points are the contiguous axis.
  KMeans(std::span<const double> x_flat, std::size_t dimension, std::size_t k,
         int max_iter, double tol, unsigned seed)
      : dimension_(dimension), k_(k) {
    if (dimension_ == 0 || x_flat.empty()) throw std::invalid_argument("empty problem");
    if (x_flat.size() % dimension_ != 0) {
      throw std::invalid_argument("X is not a multiple of the dimension");
    }

    const std::size_t n = x_flat.size() / dimension_;
    if (k_ == 0 || k_ > n) throw std::invalid_argument("k must lie in [1, n]");

    std::mt19937 generator(seed);
    centroids_ = SeedPlusPlus(x_flat, n, generator);

    std::vector<double> totals(k_ * dimension_);
    std::vector<std::size_t> counts(k_);
    assignment_.assign(n, 0);

    for (int iteration = 0; iteration < max_iter; ++iteration) {
      std::fill(totals.begin(), totals.end(), 0.0);
      std::fill(counts.begin(), counts.end(), 0);

      for (std::size_t i = 0; i < n; ++i) {
        const double* point = x_flat.data() + i * dimension_;
        const std::size_t cluster = Nearest(point).first;
        assignment_[i] = cluster;
        counts[cluster] += 1;

        double* target = totals.data() + cluster * dimension_;
        for (std::size_t j = 0; j < dimension_; ++j) target[j] += point[j];
      }

      double shift = 0.0;
      for (std::size_t cluster = 0; cluster < k_; ++cluster) {
        if (counts[cluster] == 0) {
          // Reseed to the point furthest from any centroid, which is where a
          // cluster is most likely to be missing - not to a random point.
          const std::size_t furthest = FurthestPoint(x_flat, n);
          std::copy_n(x_flat.data() + furthest * dimension_, dimension_,
                      centroids_.data() + cluster * dimension_);
          continue;
        }

        double* centroid = centroids_.data() + cluster * dimension_;
        const double* total = totals.data() + cluster * dimension_;
        for (std::size_t j = 0; j < dimension_; ++j) {
          const double updated = total[j] / static_cast<double>(counts[cluster]);
          shift = std::max(shift, std::abs(updated - centroid[j]));
          centroid[j] = updated;
        }
      }

      if (shift < tol) break;
    }
  }

  [[nodiscard]] std::size_t Predict(std::span<const double> point) const {
    if (point.size() != dimension_) {
      throw std::invalid_argument("point width does not match the model");
    }
    return Nearest(point.data()).first;
  }

  [[nodiscard]] std::span<const double> centroids() const noexcept { return centroids_; }

 private:
  [[nodiscard]] std::pair<std::size_t, double> Nearest(const double* point) const {
    std::size_t best_cluster = 0;
    double best_distance = std::numeric_limits<double>::infinity();

    for (std::size_t cluster = 0; cluster < k_; ++cluster) {
      const double* centroid = centroids_.data() + cluster * dimension_;
      double total = 0.0;
      for (std::size_t j = 0; j < dimension_; ++j) {
        const double difference = point[j] - centroid[j];
        total += difference * difference;
      }
      if (total < best_distance) {
        best_distance = total;
        best_cluster = cluster;
      }
    }
    return {best_cluster, best_distance};
  }

  [[nodiscard]] std::size_t FurthestPoint(std::span<const double> x, std::size_t n) const {
    std::size_t furthest = 0;
    double worst = -1.0;
    for (std::size_t i = 0; i < n; ++i) {
      const double distance = Nearest(x.data() + i * dimension_).second;
      if (distance > worst) {
        worst = distance;
        furthest = i;
      }
    }
    return furthest;
  }

  // k-means++ seeding: choose each new centre with probability proportional
  // to its squared distance from the nearest existing one. This carries an
  // actual guarantee - expected cost within O(log k) of optimal - and it is
  // the single largest improvement available to this algorithm.
  [[nodiscard]] std::vector<double> SeedPlusPlus(std::span<const double> x, std::size_t n,
                                                 std::mt19937& generator) {
    std::vector<double> seeds(k_ * dimension_);
    std::uniform_int_distribution<std::size_t> pick(0, n - 1);
    std::copy_n(x.data() + pick(generator) * dimension_, dimension_, seeds.data());

    std::vector<double> closest(n, std::numeric_limits<double>::infinity());
    centroids_ = seeds;

    for (std::size_t cluster = 1; cluster < k_; ++cluster) {
      const double* previous = seeds.data() + (cluster - 1) * dimension_;
      double total = 0.0;

      for (std::size_t i = 0; i < n; ++i) {
        const double* point = x.data() + i * dimension_;
        double distance = 0.0;
        for (std::size_t j = 0; j < dimension_; ++j) {
          const double difference = point[j] - previous[j];
          distance += difference * difference;
        }
        closest[i] = std::min(closest[i], distance);   // nearest so far
        total += closest[i];
      }

      std::uniform_real_distribution<double> draw(0.0, total);
      double target = draw(generator);
      std::size_t chosen = n - 1;
      for (std::size_t i = 0; i < n; ++i) {
        target -= closest[i];
        if (target <= 0.0) {
          chosen = i;
          break;
        }
      }
      std::copy_n(x.data() + chosen * dimension_, dimension_,
                  seeds.data() + cluster * dimension_);
    }

    return seeds;
  }

  std::size_t dimension_;
  std::size_t k_;
  std::vector<double> centroids_;      // row-major (k, d), owned
  std::vector<std::size_t> assignment_;
};`,
        rationale:
          'The largest change is k-means++ seeding, which replaces a lottery with a method carrying an actual guarantee, and empty clusters are reseeded to the furthest point rather than to a random one — where a cluster is most likely missing. The nested vectors become one flat row-major buffer, so both the assignment and the accumulation walk contiguous memory, and the totals and counts are hoisted out of the iteration loop, removing an O(k·d) allocation per pass. Assignment and accumulation are fused into a single pass over the data rather than two, halving the traffic over the largest array in the problem.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*k*d) per iteration in one fused pass, with constant allocation across the whole fit.',
      },
      'make-it-fast': {
        code: `// k-means - Eigen GEMM assignment, OpenMP over points, per-thread totals.
#include <Eigen/Dense>
#include <limits>
#include <stdexcept>
#include <vector>

using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// One Lloyd iteration. Returns the maximum centroid shift.
//
// The assignment step is the entire runtime, and written as a loop it is
// n * k * d scalar operations. Expanding the squared distance turns it into a
// matrix product:
//
//   ||x - c||^2 = ||x||^2 - 2 x . c + ||c||^2
//
// Only the cross term touches both operands. ||x||^2 is constant within a row
// and cannot change the argmin, so it is never computed at all.
double LloydStep(const RowMajorMatrix& X, RowMajorMatrix& centroids,
                 std::vector<int>& labels) {
  const Eigen::Index n = X.rows();
  const Eigen::Index d = X.cols();
  const Eigen::Index k = centroids.rows();

  const Eigen::VectorXd centroid_norms = centroids.rowwise().squaredNorm();
  const RowMajorMatrix cross = X * centroids.transpose();     // one GEMM

  // Per-thread accumulators, merged once at the end: the alternative is an
  // atomic add per point per dimension, which would serialize the whole step.
  const int threads = omp_get_max_threads();
  std::vector<RowMajorMatrix> local_totals(threads, RowMajorMatrix::Zero(k, d));
  std::vector<std::vector<long>> local_counts(threads, std::vector<long>(k, 0));

#pragma omp parallel
  {
    const int thread = omp_get_thread_num();

#pragma omp for schedule(static)
    for (Eigen::Index i = 0; i < n; ++i) {
      // Row i of the score block; the argmin is over k values.
      Eigen::Index best = 0;
      double best_score = std::numeric_limits<double>::infinity();
      for (Eigen::Index c = 0; c < k; ++c) {
        const double score = centroid_norms[c] - 2.0 * cross(i, c);
        if (score < best_score) {
          best_score = score;
          best = c;
        }
      }

      labels[static_cast<std::size_t>(i)] = static_cast<int>(best);
      local_totals[thread].row(best) += X.row(i);
      local_counts[thread][static_cast<std::size_t>(best)] += 1;
    }
  }

  RowMajorMatrix totals = RowMajorMatrix::Zero(k, d);
  std::vector<long> counts(static_cast<std::size_t>(k), 0);
  for (int thread = 0; thread < threads; ++thread) {
    totals += local_totals[thread];
    for (Eigen::Index c = 0; c < k; ++c) {
      counts[static_cast<std::size_t>(c)] += local_counts[thread][static_cast<std::size_t>(c)];
    }
  }

  double shift = 0.0;
  for (Eigen::Index c = 0; c < k; ++c) {
    const long count = counts[static_cast<std::size_t>(c)];
    if (count == 0) continue;                    // caller reseeds empty clusters
    const Eigen::RowVectorXd updated = totals.row(c) / static_cast<double>(count);
    shift = std::max(shift, (updated - centroids.row(c)).cwiseAbs().maxCoeff());
    centroids.row(c) = updated;
  }

  return shift;
}`,
        rationale:
          'The assignment step is the entire runtime, and expanding the squared distance turns it from n·k·d scalar operations into a single GEMM plus a k-wide argmin per point — with the per-point norm omitted because it is constant within a row and cannot change which centroid wins. The accumulation then parallelizes across points, but with per-thread totals merged once at the end rather than atomic updates: an atomic add per point per dimension would serialize exactly the step being parallelized, which is the mistake this structure exists to avoid.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The cross term for every point-centroid pair is one GEMM dispatched to a blocked kernel, replacing n·k separate dot products each of which re-reads the centroid.',
            tradeoff: 'Materializes an (n, k) score block, so peak memory grows with both the dataset and the cluster count — the caller must chunk, and nothing in the signature says so.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Points are independent during assignment, and per-thread accumulators mean the reduction happens once at the end rather than as an atomic add per point per dimension.',
            tradeoff: 'Each thread holds a full k-by-d totals matrix, so memory scales with core count — and nesting this around an already-threaded BLAS can oversubscribe the machine unless thread counts are set deliberately.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The per-point argmin over k scores and the row accumulation are simple contiguous loops the compiler vectorizes without help, which is the right first move before reaching for intrinsics.',
            tradeoff: 'The argmin carries a data-dependent branch, so vectorization is partial at best — measuring before assuming it helped is the whole point of preferring this to hand-written SIMD.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n*k*d) per iteration in BLAS with the reduction across cores. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! k-means by Lloyd's algorithm - the two steps, transcribed.

fn squared_distance(a: &[f64], b: &[f64]) -> f64 {
    let mut total = 0.0;
    for j in 0..a.len() {
        let difference = a[j] - b[j];
        total += difference * difference;
    }
    total
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
}

pub fn fit(
    x: &[Vec<f64>],
    k: usize,
    iterations: usize,
    tol: f64,
    seed: u64,
) -> (Vec<Vec<f64>>, Vec<usize>) {
    let n = x.len();
    let d = x[0].len();
    let mut rng = Lcg::new(seed);

    // Random initialization: the version k-means++ replaces, and the
    // difference between them is the largest improvement available here.
    let mut centroids: Vec<Vec<f64>> = (0..k).map(|_| x[rng.below(n)].clone()).collect();
    let mut assignment = vec![0_usize; n];

    for _ in 0..iterations {
        // ---- assignment step ---------------------------------------------
        for i in 0..n {
            let mut best_cluster = 0;
            let mut best_distance = squared_distance(&x[i], &centroids[0]);
            for cluster in 1..k {
                let distance = squared_distance(&x[i], &centroids[cluster]);
                if distance < best_distance {
                    best_cluster = cluster;
                    best_distance = distance;
                }
            }
            assignment[i] = best_cluster;
        }

        // ---- update step -------------------------------------------------
        let mut totals = vec![vec![0.0; d]; k];
        let mut counts = vec![0_usize; k];
        for i in 0..n {
            let cluster = assignment[i];
            counts[cluster] += 1;
            for j in 0..d {
                totals[cluster][j] += x[i][j];
            }
        }

        let mut shift = 0.0;
        for cluster in 0..k {
            if counts[cluster] == 0 {
                // An empty cluster divides by zero; reseeding is mandatory.
                centroids[cluster] = x[rng.below(n)].clone();
                continue;
            }
            for j in 0..d {
                let updated = totals[cluster][j] / counts[cluster] as f64;
                shift += (updated - centroids[cluster][j]).abs();
                centroids[cluster][j] = updated;
            }
        }

        if shift < tol {
            break;
        }
    }

    (centroids, assignment)
}`,
        profile: 'O(n*k*d) per iteration with every index bounds-checked, rows scattered across the heap, and a fresh totals allocation each pass.',
      },
      'make-it-right': {
        code: `//! k-means - typed errors, k-means++ seeding, flat buffers, fused pass.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum KMeansError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Clusters { k: usize, n: usize },
}

impl fmt::Display for KMeansError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Clusters { k, n } => write!(f, "k={k} outside [1, {n}]"),
        }
    }
}

impl std::error::Error for KMeansError {}

/// Cluster count. A newtype because k, max_iter and the dimension are all bare
/// usize at every call site and transposing any two is silent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NClusters(usize);

impl NClusters {
    pub fn new(value: usize, n: usize) -> Result<Self, KMeansError> {
        if value == 0 || value > n {
            return Err(KMeansError::Clusters { k: value, n });
        }
        Ok(Self(value))
    }
}

pub struct KMeansModel {
    /// Row-major (k, d): centroid c occupies centroids[c * d..(c + 1) * d].
    pub centroids: Vec<f64>,
    pub inertia: f64,
    pub iterations: usize,
    pub converged: bool,
    dimension: usize,
    k: usize,
}

impl KMeansModel {
    /// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
    pub fn fit(
        x_flat: &[f64],
        dimension: usize,
        k: NClusters,
        max_iter: usize,
        tol: f64,
        seed: u64,
    ) -> Result<Self, KMeansError> {
        if dimension == 0 || x_flat.is_empty() {
            return Err(KMeansError::Empty);
        }
        if x_flat.len() % dimension != 0 {
            return Err(KMeansError::ShapeMismatch {
                expected: (x_flat.len() / dimension + 1) * dimension,
                found: x_flat.len(),
            });
        }

        let n = x_flat.len() / dimension;
        let mut rng = Lcg::new(seed);
        let mut centroids = Self::seed_plus_plus(x_flat, n, dimension, k.0, &mut rng);

        // Hoisted out of the iteration loop.
        let mut totals = vec![0.0_f64; k.0 * dimension];
        let mut counts = vec![0_usize; k.0];
        let mut converged = false;
        let mut iterations = 0;

        for iteration in 1..=max_iter {
            iterations = iteration;
            totals.fill(0.0);
            counts.fill(0);

            // Assignment and accumulation fused into ONE pass over the data,
            // rather than assigning everything and then re-reading it.
            for point in x_flat.chunks_exact(dimension) {
                let (cluster, _) = Self::nearest(&centroids, dimension, k.0, point);
                counts[cluster] += 1;
                let target = &mut totals[cluster * dimension..(cluster + 1) * dimension];
                for (slot, value) in target.iter_mut().zip(point) {
                    *slot += value;
                }
            }

            let mut shift = 0.0_f64;
            for cluster in 0..k.0 {
                if counts[cluster] == 0 {
                    // Reseed to the furthest point, where a cluster is most
                    // likely missing - not to a random one.
                    let furthest = Self::furthest_point(x_flat, &centroids, dimension, k.0);
                    let source = &x_flat[furthest * dimension..(furthest + 1) * dimension];
                    centroids[cluster * dimension..(cluster + 1) * dimension]
                        .copy_from_slice(source);
                    continue;
                }

                let count = counts[cluster] as f64;
                let target = &mut centroids[cluster * dimension..(cluster + 1) * dimension];
                let total = &totals[cluster * dimension..(cluster + 1) * dimension];
                for (slot, sum) in target.iter_mut().zip(total) {
                    let updated = sum / count;
                    shift = shift.max((updated - *slot).abs());
                    *slot = updated;
                }
            }

            if shift < tol {
                converged = true;
                break;
            }
        }

        let inertia = x_flat
            .chunks_exact(dimension)
            .map(|point| Self::nearest(&centroids, dimension, k.0, point).1)
            .sum();

        Ok(Self { centroids, inertia, iterations, converged, dimension, k: k.0 })
    }

    #[must_use]
    pub fn predict(&self, point: &[f64]) -> usize {
        debug_assert_eq!(point.len(), self.dimension);
        Self::nearest(&self.centroids, self.dimension, self.k, point).0
    }

    #[inline]
    fn nearest(centroids: &[f64], dimension: usize, k: usize, point: &[f64]) -> (usize, f64) {
        centroids
            .chunks_exact(dimension)
            .take(k)
            .map(|centroid| {
                centroid
                    .iter()
                    .zip(point)
                    .map(|(c, p)| {
                        let difference = c - p;
                        difference * difference
                    })
                    .sum::<f64>()
            })
            .enumerate()
            .min_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or((0, 0.0), |(cluster, distance)| (cluster, distance))
    }

    fn furthest_point(x: &[f64], centroids: &[f64], dimension: usize, k: usize) -> usize {
        x.chunks_exact(dimension)
            .map(|point| Self::nearest(centroids, dimension, k, point).1)
            .enumerate()
            .max_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or(0, |(index, _)| index)
    }

    /// k-means++ seeding: each new centre is drawn with probability
    /// proportional to its squared distance from the nearest existing one.
    /// This carries a real guarantee - expected cost within O(log k) of
    /// optimal - and is the single largest improvement available to k-means.
    fn seed_plus_plus(
        x: &[f64],
        n: usize,
        dimension: usize,
        k: usize,
        rng: &mut Lcg,
    ) -> Vec<f64> {
        let mut centroids = Vec::with_capacity(k * dimension);
        let first = rng.below(n);
        centroids.extend_from_slice(&x[first * dimension..(first + 1) * dimension]);

        let mut closest = vec![f64::INFINITY; n];

        for cluster in 1..k {
            let previous =
                &centroids[(cluster - 1) * dimension..cluster * dimension];
            let mut total = 0.0;

            for (index, point) in x.chunks_exact(dimension).enumerate() {
                let distance: f64 = point
                    .iter()
                    .zip(previous)
                    .map(|(p, c)| {
                        let difference = p - c;
                        difference * difference
                    })
                    .sum();
                closest[index] = closest[index].min(distance);   // nearest so far
                total += closest[index];
            }

            let mut target = (rng.next_u64() as f64 / u64::MAX as f64) * total;
            let mut chosen = n - 1;
            for (index, &distance) in closest.iter().enumerate() {
                target -= distance;
                if target <= 0.0 {
                    chosen = index;
                    break;
                }
            }
            centroids.extend_from_slice(&x[chosen * dimension..(chosen + 1) * dimension]);
        }

        centroids
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
}
`,
        rationale:
          'k-means++ seeding replaces random initialization, which is the single largest improvement available to this algorithm and the difference between a reliable method and a lottery. Empty clusters reseed to the furthest point rather than a random one. Structurally: nested Vecs become one flat row-major buffer walked with chunks_exact so bounds checks leave the inner loops, the totals and counts are hoisted out of the iteration loop, and assignment and accumulation fuse into a single pass over the data rather than assigning everything and then re-reading it. Errors become a typed Result, and k gets a validated newtype since it sits beside two other bare usize arguments.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*k*d) per iteration in one fused pass, constant allocation across the fit, bounds checks elided.',
      },
      'make-it-fast': {
        code: `//! k-means - parallel assignment with per-thread sufficient statistics.

use rayon::prelude::*;

/// Per-thread accumulator for one Lloyd iteration.
///
/// The assignment step is a sum over independent points, which makes it a
/// fold-then-reduce: each worker keeps a private (k, d) totals buffer and the
/// buffers merge by addition at the end. The alternative - an atomic add per
/// point per dimension - would serialize exactly the step being parallelized.
#[derive(Clone)]
struct Sufficient {
    totals: Vec<f64>,
    counts: Vec<usize>,
    inertia: f64,
}

impl Sufficient {
    fn zeros(k: usize, dimension: usize) -> Self {
        Self {
            totals: vec![0.0; k * dimension],
            counts: vec![0; k],
            inertia: 0.0,
        }
    }

    fn merge(mut self, other: Self) -> Self {
        for (a, b) in self.totals.iter_mut().zip(other.totals) {
            *a += b;
        }
        for (a, b) in self.counts.iter_mut().zip(other.counts) {
            *a += b;
        }
        self.inertia += other.inertia;
        self
    }
}

/// One Lloyd iteration over a row-major design matrix. Returns the maximum
/// centroid shift and the inertia at the start of the step.
///
/// \`centroid_norms\` is precomputed once per iteration by the caller, so the
/// per-point distance becomes ||c||^2 - 2 x.c: the ||x||^2 term is constant
/// within a point and cannot change the argmin, so it is never computed.
pub fn lloyd_step(
    x_row_major: &[f64],
    centroids: &mut [f64],
    centroid_norms: &[f64],
    dimension: usize,
    k: usize,
) -> (f64, f64) {
    let stats = x_row_major
        .par_chunks_exact(dimension)
        .fold(
            || Sufficient::zeros(k, dimension),
            |mut acc, point| {
                let mut best = 0_usize;
                let mut best_score = f64::INFINITY;

                for (cluster, centroid) in centroids.chunks_exact(dimension).enumerate() {
                    let cross: f64 =
                        point.iter().zip(centroid).map(|(p, c)| p * c).sum();
                    let score = centroid_norms[cluster] - 2.0 * cross;
                    if score < best_score {
                        best_score = score;
                        best = cluster;
                    }
                }

                acc.counts[best] += 1;
                acc.inertia += best_score;
                let target = &mut acc.totals[best * dimension..(best + 1) * dimension];
                for (slot, value) in target.iter_mut().zip(point) {
                    *slot += value;
                }
                acc
            },
        )
        .reduce(|| Sufficient::zeros(k, dimension), Sufficient::merge);

    let mut shift = 0.0_f64;
    for cluster in 0..k {
        if stats.counts[cluster] == 0 {
            continue;                       // caller reseeds empty clusters
        }
        let count = stats.counts[cluster] as f64;
        let target = &mut centroids[cluster * dimension..(cluster + 1) * dimension];
        let total = &stats.totals[cluster * dimension..(cluster + 1) * dimension];
        for (slot, sum) in target.iter_mut().zip(total) {
            let updated = sum / count;
            shift = shift.max((updated - *slot).abs());
            *slot = updated;
        }
    }

    (shift, stats.inertia)
}

/// Assign a batch of points. Points are independent, so this is a pure map.
#[must_use]
pub fn predict_batch(
    x_row_major: &[f64],
    centroids: &[f64],
    centroid_norms: &[f64],
    dimension: usize,
) -> Vec<usize> {
    x_row_major
        .par_chunks_exact(dimension)
        .map(|point| {
            centroids
                .chunks_exact(dimension)
                .enumerate()
                .map(|(cluster, centroid)| {
                    let cross: f64 = point.iter().zip(centroid).map(|(p, c)| p * c).sum();
                    (cluster, centroid_norms[cluster] - 2.0 * cross)
                })
                .min_by(|(_, a), (_, b)| a.total_cmp(b))
                .map_or(0, |(cluster, _)| cluster)
        })
        .collect()
}
`,
        rationale:
          'The assignment step is a sum over independent points, which is exactly the shape rayon’s fold-then-reduce wants: each worker keeps private totals and counts over its own chunk and they merge by addition once, with no locking and no atomics in the hot loop. An atomic add per point per dimension — the obvious alternative — would serialize the very step being parallelized. The distance also drops its per-point norm term, since it is constant within a point and cannot change the argmin, so the inner loop is one dot product against each centroid rather than a full subtract-square-accumulate.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Assignment and accumulation form an associative sum over points, so fold-then-reduce gives each worker a private accumulator and merges once — no locking, no atomics, and it scales with cores.',
            tradeoff: 'Each worker holds a full k-by-d totals buffer, so memory grows with core count times cluster count; with thousands of clusters that becomes the binding constraint rather than the arithmetic.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'par_chunks_exact hands each worker a contiguous point and the centroids are walked as contiguous slices, so both sides of every dot product are sequential reads.',
            tradeoff: 'The caller must flatten the design and keep the dimension in sync by hand — the type system carries no shape information, so a wrong dimension is a silent misread rather than a compile error.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The per-centroid dot product is the innermost operation and is called n·k times per iteration; inlining lets the accumulator stay in a register across the loop.',
            tradeoff: 'Inlining into every call site grows the instruction footprint, and with a large k the argmin loop is memory-bound on the centroid array anyway, so the gain is bounded.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*k*d / cores) per iteration, memory scaling with core count times k. Illustrative, not a measured benchmark.',
      },
    },
  },
};
