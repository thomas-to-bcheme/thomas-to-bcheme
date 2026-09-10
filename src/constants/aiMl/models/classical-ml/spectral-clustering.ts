import type { AiMlModel } from '../../types';

/**
 * Spectral Clustering — clustering by graph partition rather than by distance
 * to a centre.
 *
 * Follows k-means in the structure group because it removes that entry's
 * binding assumption: clusters no longer have to be blobs. The price is stated
 * throughout — an n-by-n affinity matrix and an eigendecomposition — and the
 * code progression is built around the decision that actually determines
 * whether it works, which is how the affinity graph is built rather than how
 * the eigenvectors are computed.
 */
export const SPECTRAL_CLUSTERING: AiMlModel = {
  slug: 'spectral-clustering',
  name: 'Spectral Clustering',
  aliases: ['Normalized cuts', 'Shi-Malik', 'Ng-Jordan-Weiss', 'Laplacian eigenmaps (embedding)'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'dimensionality-reduction' because the eigenvector embedding is itself the
  // deliverable in Laplacian eigenmaps — the k-means at the end is optional.
  taskTypes: ['clustering', 'dimensionality-reduction'],
  paradigmNote:
    'Two things share one computation. Stop after the eigenvectors and you have a nonlinear embedding — Laplacian eigenmaps — that preserves local neighbourhood structure. Run k-means on the rows of that embedding and you have a clustering. The hard part is the same in both cases and happens before either.',

  intuition:
    'Stop thinking about distance to a centre and start thinking about connectivity. Build a graph where nearby points are joined, then look for a way to cut it into pieces that severs as few connections as possible. Two crescents that interlock have no separating hyperplane and no useful centroids, but they are two obviously distinct connected regions, and cutting the graph finds them. The trick that makes this computable is that the best cut, once relaxed from a hard yes-or-no assignment to a continuous one, is given by the smallest eigenvectors of the graph Laplacian — so a combinatorial problem becomes a linear-algebra one. Those eigenvectors are new coordinates in which the crescents have become blobs, and then k-means finishes the job.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{A_1, \\dots, A_K} \\sum_{k=1}^{K} \\frac{\\operatorname{cut}(A_k, \\overline{A_k})}{\\operatorname{vol}(A_k)} \\qquad \\text{relaxed to} \\qquad \\min_{H^{\\top}DH = I} \\operatorname{tr}\\!\\left(H^{\\top} L H\\right)',
      symbols: [
        { symbol: '\\operatorname{cut}(A_k, \\overline{A_k})', meaning: 'total weight of the edges severed by separating cluster k from everything else' },
        { symbol: '\\operatorname{vol}(A_k)', meaning: 'total degree inside cluster k — the balance term, without which the optimum is to cut off a single point' },
        { symbol: 'L', meaning: 'the graph Laplacian D - W, whose quadratic form measures exactly how much a labelling disagrees across edges' },
        { symbol: 'H', meaning: 'the relaxed cluster indicator: continuous values instead of a hard assignment, which is what makes the problem solvable' },
      ],
    },
    reading:
      'Cut the graph into K pieces so that few connections are severed, and normalize by each piece’s size so the answer is not simply to snip off one isolated vertex. That combinatorial problem is NP-hard. The second form is the relaxation actually solved: drop the requirement that H be a hard assignment, keep only the orthogonality constraint, and the optimum becomes the bottom eigenvectors of the Laplacian. The relaxation is where the honesty is owed — there is no approximation guarantee tying the relaxed solution back to the true minimum cut, and the k-means run afterwards is a heuristic on top of a heuristic. It works remarkably well and it is not solving the stated objective.',
  },

  optimization: {
    method: 'Eigendecomposition of the graph Laplacian, followed by k-means in the embedded space',
    updateRule: {
      formula:
        'L_{\\text{sym}} = I - D^{-1/2} W D^{-1/2}, \\qquad U = [\\mathbf{u}_1, \\dots, \\mathbf{u}_K], \\qquad \\text{then k-means on the rows of } U',
      symbols: [
        { symbol: 'W', meaning: 'the affinity matrix — the actual model, and the thing that decides whether any of this works' },
        { symbol: 'D', meaning: 'diagonal degree matrix; the normalization is what stops high-degree vertices dominating the embedding' },
        { symbol: '\\mathbf{u}_k', meaning: 'the k-th smallest eigenvector of the Laplacian — a coordinate in the new space' },
        { symbol: 'U', meaning: 'the n-by-K embedding; its rows are the points, re-expressed so that connected regions become compact' },
      ],
    },
    rationale:
      'There is no iteration over the objective at all: the relaxation turns the partition problem into an eigenproblem, and the eigenproblem has a closed-form answer. Recognizing that is the transferable idea — the same move appears in PCA, in kernel methods, and throughout numerical linear algebra. Three implementation decisions carry real consequences. The Laplacian normalization matters: the random-walk and symmetric forms behave far better than the unnormalized one when degrees vary, which on any realistic graph they do. Only the bottom K eigenvectors are needed, so a Lanczos method is the right tool rather than a full decomposition. And the embedding rows should be normalized to unit length before k-means, which is the step that turns elongated eigenvector geometry into the spherical shape k-means requires.',
    hyperparameters: [
      { name: 'affinity construction', role: 'The model. A k-nearest-neighbour graph, a full RBF kernel, or a domain-supplied similarity — this choice matters far more than anything else here', typicalRange: 'kNN graph with 10 to 20 neighbours, symmetrized' },
      { name: 'sigma (RBF bandwidth)', role: 'How quickly affinity decays with distance. No good default exists: too small disconnects the graph, too large connects everything and the structure vanishes', typicalRange: 'median pairwise distance, or local scaling per point' },
      { name: 'K', role: 'Number of clusters. The eigengap heuristic — look for a jump in the sorted eigenvalues — is the one genuinely principled selection rule in this section, and it is often ambiguous in practice' },
      { name: 'Laplacian type', role: 'Unnormalized, symmetric, or random-walk. The normalized forms are almost always the right choice when vertex degrees vary' },
      { name: 'row normalization', role: 'Scale each embedding row to unit length before k-means. Small step, large effect on whether the final clustering is sensible' },
    ],
    convergence:
      'The eigendecomposition is exact and deterministic; the k-means afterwards is not, so the method inherits that entry’s dependence on initialization and restarts. The characteristic failures are all about the graph. If sigma is too small the graph fragments into many components, every component contributes a near-zero eigenvalue, and the bottom eigenvectors describe connectivity rather than structure — the clustering then simply recovers the fragments. If sigma is too large everything connects to everything, the eigengap closes, and the embedding is noise. A single bridging point between two genuine clusters can merge them entirely, because connectivity is transitive in a way distance is not. And the relaxation itself carries no bound: nothing guarantees the eigenvector solution is close to the true minimum cut, which is why this is judged empirically rather than argued from theory.',
    complexity:
      'Affinity construction: O(n^2·d) for a dense graph, or O(n·log n·d) with an approximate neighbour index. Memory O(n^2) dense, or O(n·k) for a kNN graph — which is the difference between a few thousand points and a few hundred thousand. Eigendecomposition: O(n^3) dense, reduced to roughly O(n·k·K) per Lanczos iteration on a sparse graph. That n-squared to n-cubed profile is the ceiling, and Nyström or landmark approximations are what any large-scale spectral method is actually doing.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Group series before modelling them, using a similarity graph rather than Euclidean distance. That distinction is the whole reason to prefer this over k-means here: the affinity can be built from correlation, from dynamic time warping, or from any domain similarity, none of which admits a mean and therefore none of which k-means can use.',
        where: [
          'Grouping many series by a correlation or DTW-based affinity, so that one model can be pooled across each group',
          'Regime discovery over a similarity graph of windowed segments, where regimes are not separable by distance to a centre',
          'Sensor or asset grouping where a domain-specific similarity exists and a metric does not',
        ],
        why: 'It is the option that accepts a similarity you can compute but not average, which is the common situation with time series — DTW alignment being the standard example. It also finds groups that are not blobs, and series clusters frequently are not. The costs are the usual ones and they bind quickly: an n-by-n affinity over tens of thousands of series is not affordable, and there is no way to assign a new series without recomputing the embedding, so this is an offline analysis rather than a component of a serving path.',
        featurization: [
          'Z-normalize each series before computing affinity, or the graph recovers magnitude rather than shape',
          'Build a k-nearest-neighbour graph rather than a full affinity matrix; it is both cheaper and usually better, since distant pairs contribute noise',
          'Fit on the training window only — an affinity computed over the full history leaks future co-movement into the grouping',
          'Check for disconnected components before clustering; they will otherwise consume the bottom eigenvectors and the clustering will simply recover them',
        ],
        evaluation:
          'Rolling-origin backtest of the pooled forecasts, not a clustering score. Inspect the eigenvalue spectrum as a diagnostic: no clear gap means the data does not support the number of groups being requested.',
        pitfalls: [
          'A bandwidth that fragments the graph, after which the bottom eigenvectors describe connected components rather than structure',
          'No out-of-sample assignment — a new series cannot be placed without redoing the whole computation',
          'Quadratic memory reached quietly as the series count grows between refits',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The method partitions a graph into K pieces and produces no notion of outlyingness: a genuinely isolated point simply becomes its own component or its own cluster, which is a partition result rather than a score.',
      },
      optimization: {
        fit: 'adapted',
        how: 'This is the reference example of spectral relaxation. The normalized-cut objective is NP-hard over hard assignments; dropping the integrality constraint and keeping only orthogonality turns it into a trace minimization whose optimum is the bottom eigenvectors. The whole method is that one move, and the same move recurs in graph partitioning, in max-cut relaxations, and in embedding problems generally.',
        where: [
          'The canonical demonstration that relaxing a combinatorial constraint can turn an NP-hard problem into an eigenproblem',
          'Graph partitioning for parallel workload distribution and circuit layout, where balanced cuts are the actual deliverable',
          'Load balancing and mesh decomposition, which are literally the normalized-cut problem under a different name',
        ],
        why: 'Worth studying because the gap between the relaxation and the original problem is unusually visible and unusually honest: there is no approximation guarantee, the rounding step back to a hard assignment is a heuristic, and the method is still excellent in practice. That combination — a principled relaxation, an unprincipled rounding, and strong empirical results — is the shape of a great many applied optimization methods, and this is the clearest place to see it.',
        featurization: [
          'Encode the real cost structure in the edge weights; the objective optimizes the graph you supply, not the problem you meant',
          'Balance constraints belong in the normalization — cut alone will happily isolate a single vertex',
        ],
        evaluation:
          'For a partitioning problem, evaluate the actual cut and the balance achieved against a combinatorial baseline such as METIS. The relaxed objective value is not comparable to the combinatorial one and should not be reported as if it were.',
        pitfalls: [
          'Reporting the relaxed objective as though it bounded the true optimum, which it does not',
          'Ignoring the rounding step, where a substantial part of the quality is won or lost',
          'Applying the dense formulation at a scale where only a sparse or approximate method is viable',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'Normalized cuts for image segmentation: treat pixels as vertices, weight edges by a combination of colour similarity and spatial proximity, and cut the resulting graph. This is the formulation that made spectral methods well known in vision, and it segments regions that no thresholding or centroid method separates.',
        where: [
          'Classical image and video segmentation, where region boundaries follow connectivity rather than colour alone',
          'Superpixel and region-merging pipelines that feed a downstream recognizer',
          'Motion segmentation, where trajectories are grouped by an affinity that is not a metric',
        ],
        why: 'The affinity formulation lets colour similarity and spatial adjacency be combined into one weight, which is exactly what image segmentation needs and what a distance in pixel space cannot express. Its limits are computational and were decisive: a modest image has hundreds of thousands of pixels, and an n-by-n affinity over those is impossible without approximation. Learned segmentation superseded it for recognition, and the graph formulation survives inside superpixel and region-merging steps.',
        featurization: [
          'Combine colour distance and spatial distance into one affinity with separate bandwidths, since they are in different units',
          'Restrict edges to a spatial neighbourhood — a fully connected pixel graph is both intractable and worse, as distant pixels contribute noise',
          'Work on superpixels rather than raw pixels to reduce n by two orders of magnitude before the eigendecomposition',
        ],
        evaluation:
          'Boundary precision-recall or region-covering measures against annotated segmentations, not the value of the cut objective.',
        pitfalls: [
          'Quadratic memory on raw pixels, which is why superpixels are effectively mandatory',
          'A spatial bandwidth that merges across a genuine boundary because a few bridging pixels connect the regions',
          'Choosing the number of segments by the eigengap when natural images rarely produce a clean one',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Community detection on a transaction or entity graph. Vertices are accounts, devices, or merchants; edges are shared attributes or transfers; and a tightly-connected community that is weakly connected to everything else is the structural signature of a fraud ring or a layering pattern.',
        where: [
          'Fraud-ring and mule-network detection, where the signal is connectivity rather than any individual account’s behaviour',
          'Anti-money-laundering layering detection across transfer graphs',
          'Collusion detection in marketplaces and ad networks, where colluding parties transact mostly with each other',
        ],
        why: 'It sees exactly what a per-entity model cannot: coordinated behaviour that looks unremarkable account by account and obvious as a group. That is the failure mode named under the isolation forest, where a cluster of anomalies masks itself, and the graph view is the complement to it. Against it: the affinity graph must be built from real relational data, the computation is offline and quadratic, and communities are found whether or not any are fraudulent — the method proposes structure, and the investigation supplies the meaning.',
        featurization: [
          'Weight edges by relationship strength — shared device, shared beneficiary, transfer volume — rather than treating all links as equal',
          'Prune hub vertices such as large exchanges before partitioning, or every community connects through them and the graph will not separate',
          'Work on a sparse relational graph, never a dense affinity over engineered features, which is both slower and less meaningful here',
        ],
        evaluation:
          'Precision of investigated communities against confirmed cases, and the size distribution of what is returned — a partition producing two enormous communities has told you nothing actionable.',
        pitfalls: [
          'Hub vertices bridging every community into one, which is the most common way this fails on real financial graphs',
          'Treating every detected community as suspicious when most are legitimate structure',
          'Scale: real transaction graphs need sparse or streaming community methods rather than a dense spectral decomposition',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Dominated by two quadratic-or-worse steps: building the affinity and decomposing the Laplacian. A few thousand points is comfortable, tens of thousands needs a sparse graph and a Lanczos solver, and beyond that the honest answer is Nyström or a landmark approximation rather than the exact method.',
    inferenceProfile:
      'There is no inference. The embedding is defined only for the points it was fitted on, so a new point cannot be assigned without recomputing — which is the property that keeps this an offline analysis. Out-of-sample extension exists (the Nyström formula) and is an approximation, not a lookup.',
    retrainingCadence:
      'Batch, offline, and periodic. Because there is no incremental update and no cheap assignment, the practical pattern is to run it as an analysis, extract stable labels or centroids, and serve something else — often a k-means or a classifier fitted on the resulting labels.',
    driftAndMonitoring: [
      'Track the eigengap across refits; a gap that closes means the structure being clustered no longer exists in the data',
      'Watch the number of near-zero eigenvalues, which counts connected components — a rise means the bandwidth has become too small for the current data',
      'Monitor the degree distribution of the affinity graph, since a shift there changes the normalization and therefore the embedding',
      'Compare partitions across refits with a set-overlap measure rather than by cluster id, which is meaningless between runs',
    ],
    productionGotchas: [
      'No out-of-sample assignment: a new point cannot be clustered without redoing the affinity and the decomposition, which surprises teams who expected a predict method',
      'The bandwidth is the model, and there is no default that works across datasets — it must be re-selected whenever the feature scale changes',
      'Disconnected components produce trivial eigenvectors that consume the bottom of the spectrum, so the clustering silently recovers connectivity instead of structure',
      'Quadratic memory is reached without warning as the dataset grows between runs; the affinity matrix, not the algorithm, is what fails',
      'The final k-means is stochastic, so the same eigenvectors give different labels on different runs unless the seed is pinned',
    ],
  },

  assumptions: [
    'Clusters are connected regions in the affinity graph — which is a much weaker assumption than being blobs, and is why the method exists',
    'The affinity function reflects the similarity that matters; it is the model, and a poor affinity cannot be repaired downstream',
    'The graph is connected, or nearly so — disconnected components take over the bottom of the spectrum',
    'The number of clusters is known or visible as an eigengap, which on real data is frequently ambiguous',
    'The dataset is small enough for an n-by-n affinity and its decomposition, which is the binding constraint in practice',
  ],

  pros: [
    {
      point: 'Finds clusters that are not convex blobs',
      context:
        'Interlocking crescents, rings, and elongated manifolds are separated cleanly, which is precisely what k-means and Gaussian mixtures cannot do. This is the entire reason to accept the cost.',
    },
    {
      point: 'Needs only a similarity, not a metric or a mean',
      context:
        'Any affinity works — DTW, graph distance, a domain kernel — including ones with no meaningful average. That opens problems where centroid-based methods are not merely worse but undefined.',
    },
    {
      point: 'The eigenvalue spectrum is a genuine diagnostic',
      context:
        'The eigengap is the closest thing to a principled way to choose the number of clusters anywhere in this section. It is often ambiguous on real data, and it is still more than k-means offers.',
    },
    {
      point: 'The embedding is useful on its own',
      context:
        'Stopping before k-means gives a nonlinear embedding that preserves local structure and feeds any downstream model. One computation, two deliverables.',
    },
  ],

  cons: [
    {
      point: 'Quadratic memory and cubic decomposition',
      context:
        'A hard ceiling in the low tens of thousands of points without approximation. This decides most spectral-versus-k-means arguments before cluster quality is discussed.',
    },
    {
      point: 'No way to assign a new point',
      context:
        'The embedding exists only for the fitted points. Teams routinely discover this after building a pipeline around it, and the Nyström extension is an approximation rather than the missing method.',
    },
    {
      point: 'Results hinge on a bandwidth with no good default',
      context:
        'Too small fragments the graph, too large erases the structure, and the usable range can be narrow. More sensitive to this one number than k-means is to anything, which is an uncomfortable trade for the extra flexibility.',
    },
    {
      point: 'The relaxation carries no guarantee',
      context:
        'Nothing bounds the eigenvector solution against the true minimum cut, and the rounding to hard labels is a separate heuristic. It works well empirically, and any claim stronger than that is unsupported.',
    },
  ],

  relatedSlugs: ['k-means', 'pca', 'gaussian-mixture'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Spectral clustering - affinity, Laplacian, eigenvectors. Transcribed.

Build the graph, form the Laplacian, take its smallest eigenvectors, and run
k-means on the rows. The smallest eigenvectors are found here by power
iteration on a SHIFTED matrix - power iteration converges to the largest
eigenvector, so subtracting L from a multiple of the identity flips the
spectrum and turns the smallest into the largest.
"""

import math
import random


def rbf_affinity(X, sigma):
    """W_ij = exp(-||x_i - x_j||^2 / (2 sigma^2)), with no self-loops.

    Sigma is the model. Too small and the graph fragments into isolated
    points; too large and everything connects to everything and the structure
    disappears. There is no default that works across datasets.
    """
    n = len(X)
    W = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            squared = 0.0
            for k in range(len(X[i])):
                difference = X[i][k] - X[j][k]
                squared += difference * difference
            weight = math.exp(-squared / (2.0 * sigma * sigma))
            W[i][j] = weight
            W[j][i] = weight

    return W


def normalized_laplacian(W):
    """L_sym = I - D^(-1/2) W D^(-1/2).

    The normalization is what stops a high-degree vertex dominating the
    embedding purely because it has many neighbours.
    """
    n = len(W)
    degree = [sum(row) for row in W]
    inverse_root = [0.0 if d == 0.0 else 1.0 / math.sqrt(d) for d in degree]

    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            L[i][j] = (1.0 if i == j else 0.0) - inverse_root[i] * W[i][j] * inverse_root[j]
    return L


def power_iteration(matrix, iterations=1000, tol=1e-10):
    """Largest eigenvector of a symmetric matrix, by repeated multiplication."""
    n = len(matrix)
    vector = [1.0 / math.sqrt(n)] * n

    for _ in range(iterations):
        product = [0.0] * n
        for i in range(n):
            total = 0.0
            for j in range(n):
                total += matrix[i][j] * vector[j]
            product[i] = total

        norm = math.sqrt(sum(value * value for value in product))
        if norm == 0.0:
            break
        product = [value / norm for value in product]

        shift = sum(abs(product[i] - vector[i]) for i in range(n))
        vector = product
        if shift < tol:
            break

    eigenvalue = 0.0
    for i in range(n):
        for j in range(n):
            eigenvalue += vector[i] * matrix[i][j] * vector[j]
    return vector, eigenvalue


def bottom_eigenvectors(L, k):
    """The k SMALLEST eigenvectors of L, via the shifted matrix 2I - L.

    Power iteration finds the largest; L_sym has eigenvalues in [0, 2], so
    subtracting it from 2I reverses the order without changing the vectors.
    """
    n = len(L)
    shifted = [[(2.0 if i == j else 0.0) - L[i][j] for j in range(n)] for i in range(n)]

    vectors = []
    for _ in range(k):
        vector, eigenvalue = power_iteration(shifted)
        vectors.append(vector)
        # Deflate so the next iteration finds the next one.
        for i in range(n):
            for j in range(n):
                shifted[i][j] -= eigenvalue * vector[i] * vector[j]

    return vectors


def fit(X, k, sigma=1.0, seed=0):
    W = rbf_affinity(X, sigma)
    L = normalized_laplacian(W)
    vectors = bottom_eigenvectors(L, k)

    # Rows of the embedding, normalized to unit length. Small step, large
    # effect: it is what turns elongated eigenvector geometry into the
    # spherical shape k-means requires.
    n = len(X)
    embedding = []
    for i in range(n):
        row = [vectors[c][i] for c in range(k)]
        norm = math.sqrt(sum(value * value for value in row))
        embedding.append([value / norm for value in row] if norm > 0 else row)

    return simple_kmeans(embedding, k, seed)


def simple_kmeans(points, k, seed):
    rng = random.Random(seed)
    centroids = [list(points[i]) for i in rng.sample(range(len(points)), k)]
    assignment = [0] * len(points)

    for _ in range(100):
        for i, point in enumerate(points):
            best, best_distance = 0, None
            for c, centroid in enumerate(centroids):
                distance = sum((point[j] - centroid[j]) ** 2 for j in range(len(point)))
                if best_distance is None or distance < best_distance:
                    best, best_distance = c, distance
            assignment[i] = best

        for c in range(k):
            members = [points[i] for i in range(len(points)) if assignment[i] == c]
            if members:
                centroids[c] = [sum(m[j] for m in members) / len(members)
                                for j in range(len(members[0]))]

    return assignment`,
        profile: 'O(n^2 d) for the affinity and O(k n^2) per power iteration, over dense lists of lists — the n-by-n matrix is the ceiling.',
      },
      'make-it-right': {
        code: `"""Spectral clustering - typed, kNN affinity, symmetric Laplacian, eigh."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]

Affinity = Literal["knn", "rbf"]


@dataclass(frozen=True)
class SpectralEmbedding:
    """The embedding and the spectrum that produced it.

    The eigenvalues are kept because they are the diagnostic: a clear gap
    after position K supports K clusters, and no gap means the data does not
    support the number being requested.
    """

    embedding: Matrix        # (n, K), rows normalized to unit length
    eigenvalues: Vector      # (K,)

    @property
    def eigengap(self) -> Vector:
        """Successive differences. The largest is the suggested K."""
        return np.diff(self.eigenvalues)


def _knn_affinity(X: Matrix, n_neighbors: int, sigma: float | None) -> Matrix:
    """Symmetric k-nearest-neighbour graph with RBF weights.

    Preferred to a fully-connected affinity for two reasons, not one: it is
    far cheaper, and it is usually BETTER, because distant pairs contribute
    weight that is noise rather than structure.
    """
    squared = (
        np.einsum("ij,ij->i", X, X)[:, None]
        - 2.0 * (X @ X.T)
        + np.einsum("ij,ij->i", X, X)[None, :]
    )
    np.maximum(squared, 0.0, out=squared)   # cancellation guard
    np.fill_diagonal(squared, np.inf)       # no self-loops

    # Median heuristic: a defensible default where none really exists.
    scale = sigma if sigma is not None else float(np.sqrt(np.median(squared[np.isfinite(squared)])))

    neighbors = np.argpartition(squared, n_neighbors, axis=1)[:, :n_neighbors]
    affinity = np.zeros_like(squared)
    rows = np.repeat(np.arange(X.shape[0]), n_neighbors)
    affinity[rows, neighbors.ravel()] = np.exp(
        -squared[rows, neighbors.ravel()] / (2.0 * scale * scale)
    )

    # Symmetrize: i being a neighbour of j does not make j a neighbour of i.
    return np.maximum(affinity, affinity.T)


def fit_embedding(
    X: Matrix,
    n_clusters: int,
    n_neighbors: int = 10,
    sigma: float | None = None,
) -> SpectralEmbedding:
    """Build the graph and embed. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not 1 <= n_clusters <= X.shape[0]:
        raise ValueError(f"n_clusters must lie in [1, {X.shape[0]}]")
    if not 1 <= n_neighbors < X.shape[0]:
        raise ValueError(f"n_neighbors must lie in [1, {X.shape[0] - 1}]")

    affinity = _knn_affinity(X, n_neighbors, sigma)
    degree = affinity.sum(axis=1)

    if (degree == 0.0).any():
        raise ValueError(
            "affinity graph has isolated vertices - sigma is too small, or "
            "n_neighbors too low for this data"
        )

    inverse_root = 1.0 / np.sqrt(degree)
    laplacian = np.eye(X.shape[0]) - inverse_root[:, None] * affinity * inverse_root[None, :]

    # eigh, not eig: the Laplacian is symmetric, and the symmetric solver is
    # both faster and guaranteed to return real, ordered eigenvalues.
    eigenvalues, eigenvectors = np.linalg.eigh(laplacian)

    embedding = eigenvectors[:, :n_clusters]
    norms = np.linalg.norm(embedding, axis=1, keepdims=True)
    norms[norms == 0.0] = 1.0

    return SpectralEmbedding(
        embedding=embedding / norms,
        eigenvalues=eigenvalues[:n_clusters],
    )


def fit(X: Matrix, n_clusters: int, n_neighbors: int = 10, seed: int = 0) -> Labels:
    """Embed, then cluster the rows. The k-means is stochastic; pin the seed."""
    from sklearn.cluster import KMeans   # the last step is ordinary k-means

    result = fit_embedding(X, n_clusters, n_neighbors)
    return KMeans(n_clusters=n_clusters, n_init=10, random_state=seed).fit_predict(
        result.embedding
    )`,
        rationale:
          'The affinity changes from a fully-connected RBF to a symmetrized k-nearest-neighbour graph, which is not only cheaper but usually better — distant pairs contribute weight that is noise rather than structure, and a dense affinity lets that noise into the spectrum. Power iteration with deflation is replaced by a symmetric eigensolver, which returns every eigenvector at once without accumulating each one’s error into the next. The eigenvalues become part of the returned object because they are the only principled diagnostic available here, and the isolated-vertex case — which the previous stage would have divided straight through — becomes an explicit error naming its actual cause.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy + scikit-learn',
        profile: 'O(n^2 d) for the affinity and O(n^3) for the dense eigendecomposition — still quadratic in memory.',
      },
      'make-it-fast': {
        code: `"""Spectral clustering - sparse kNN graph, Lanczos for the bottom K only."""

import numpy as np
from numpy.typing import NDArray
from scipy import sparse
from scipy.sparse.linalg import eigsh

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def sparse_knn_affinity(
    X: Matrix, n_neighbors: int, chunk: int = 2048
) -> sparse.csr_matrix:
    """Build the graph without ever materializing an n-by-n matrix.

    The dense formulation needs O(n^2) memory, which is the real ceiling on
    spectral clustering - not the eigendecomposition. Computing distances in
    chunks and keeping only the k nearest per row bounds memory at O(n * k),
    which moves the practical limit up by two orders of magnitude.
    """
    design = np.ascontiguousarray(X, dtype=np.float64)
    n = design.shape[0]
    norms = np.einsum("ij,ij->i", design, design)

    indptr = np.arange(0, (n + 1) * n_neighbors, n_neighbors)   # allocated once
    indices = np.empty(n * n_neighbors, dtype=np.int32)
    values = np.empty(n * n_neighbors, dtype=np.float64)
    collected = []

    for start in range(0, n, chunk):
        stop = min(start + chunk, n)
        block = design[start:stop]

        # ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: one GEMM, built in place so
        # the (chunk, n) block is the only intermediate that ever exists.
        squared = block @ design.T
        squared *= -2.0
        squared += norms[None, :]
        squared += np.einsum("ij,ij->i", block, block)[:, None]
        np.maximum(squared, 0.0, out=squared)
        squared[np.arange(stop - start), np.arange(start, stop)] = np.inf

        nearest = np.argpartition(squared, n_neighbors, axis=1)[:, :n_neighbors]
        block_rows = np.arange(stop - start)[:, None]
        collected.append(squared[block_rows, nearest])
        indices[start * n_neighbors : stop * n_neighbors] = nearest.ravel()

    distances = np.concatenate(collected, axis=0)
    scale = float(np.sqrt(np.median(distances)))
    np.exp(-distances.ravel() / (2.0 * scale * scale), out=values)

    graph = sparse.csr_matrix((values, indices, indptr), shape=(n, n))
    return graph.maximum(graph.T)          # symmetrize


def fit_embedding(X: Matrix, n_clusters: int, n_neighbors: int = 10) -> tuple[Matrix, Vector]:
    """Bottom K eigenvectors by shift-invert Lanczos.

    A dense eigensolver computes all n eigenvectors and discards all but K.
    Lanczos computes only what is asked for, and shift-invert around zero is
    what makes it converge to the SMALLEST eigenvalues rather than the largest
    - which is the standard trap, since the bottom of the spectrum is exactly
    where Lanczos is slowest without it.
    """
    affinity = sparse_knn_affinity(X, n_neighbors)
    degree = np.asarray(affinity.sum(axis=1)).ravel()
    if (degree == 0.0).any():
        raise ValueError("affinity graph has isolated vertices; increase n_neighbors")

    inverse_root = sparse.diags(1.0 / np.sqrt(degree))
    # Fused: D^-1/2 W D^-1/2 is built by two sparse products, and the identity
    # is subtracted by negating in place rather than forming a dense I.
    normalized = inverse_root @ affinity @ inverse_root
    laplacian = sparse.identity(X.shape[0], format="csr") - normalized

    eigenvalues, eigenvectors = eigsh(
        laplacian, k=n_clusters, sigma=0.0, which="LM"
    )

    norms = np.linalg.norm(eigenvectors, axis=1, keepdims=True)
    norms[norms == 0.0] = 1.0
    return eigenvectors / norms, eigenvalues`,
        rationale:
          'Two ceilings are removed, and they are different ceilings. The affinity is built in chunks and stored sparsely, so memory is O(n·k) rather than O(n²) — that is the constraint that actually stops spectral clustering, not the eigendecomposition. Then the dense symmetric solver is replaced by shift-invert Lanczos, which computes only the K eigenvectors wanted instead of all n; the shift-invert is the part that is easy to get wrong, because plain Lanczos converges fastest at the large end of the spectrum and this method needs the small end. The Laplacian itself is assembled through fused sparse products so no dense intermediate appears anywhere.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Chunked distances come from one GEMM via the squared-norm expansion, and the norms are einsum reductions computed once per side rather than per pair.',
            tradeoff: 'The expansion is less numerically stable than direct subtraction, so cancellation can misrank two nearly-equidistant neighbours — which changes the graph and therefore the clustering, not just a distance value.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The normalized Laplacian is assembled by two sparse diagonal products with the identity subtracted directly, so no dense n-by-n matrix exists at any point in the pipeline.',
            tradeoff: 'The sparse expression is far less legible than the dense formula it implements, and a sparse-times-dense slip anywhere in the chain silently reintroduces the O(n^2) allocation this exists to avoid.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Distances are computed a chunk of rows at a time, so the peak intermediate is (chunk, n) rather than (n, n) and BLAS is entered once per chunk instead of per row.',
            tradeoff: 'The chunk size is an untuned parameter, and the two-pass structure — collect distances, then compute the median bandwidth — means the data is traversed twice rather than once.',
          },
        ],
        libraryName: 'NumPy + SciPy sparse',
        profile: 'O(n^2 d) distances in BLAS with O(n*k) memory, plus Lanczos for K eigenvectors. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Spectral clustering - affinity, Laplacian, eigenvectors. Transcribed.
#include <cmath>
#include <cstddef>
#include <vector>

// W_ij = exp(-||x_i - x_j||^2 / (2 sigma^2)), no self-loops.
//
// Sigma is the model. Too small and the graph fragments; too large and
// everything connects and the structure disappears. No default works.
std::vector<std::vector<double>> RbfAffinity(const std::vector<std::vector<double>>& X,
                                             double sigma) {
  const std::size_t n = X.size();
  std::vector<std::vector<double>> W(n, std::vector<double>(n, 0.0));

  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = i + 1; j < n; ++j) {
      double squared = 0.0;
      for (std::size_t k = 0; k < X[i].size(); ++k) {
        const double difference = X[i][k] - X[j][k];
        squared += difference * difference;
      }
      const double weight = std::exp(-squared / (2.0 * sigma * sigma));
      W[i][j] = weight;
      W[j][i] = weight;
    }
  }
  return W;
}

// L_sym = I - D^(-1/2) W D^(-1/2). The normalization stops a high-degree
// vertex dominating the embedding purely by having many neighbours.
std::vector<std::vector<double>> NormalizedLaplacian(
    const std::vector<std::vector<double>>& W) {
  const std::size_t n = W.size();
  std::vector<double> inverse_root(n, 0.0);

  for (std::size_t i = 0; i < n; ++i) {
    double degree = 0.0;
    for (const double weight : W[i]) degree += weight;
    inverse_root[i] = degree == 0.0 ? 0.0 : 1.0 / std::sqrt(degree);
  }

  std::vector<std::vector<double>> L(n, std::vector<double>(n, 0.0));
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < n; ++j) {
      L[i][j] = (i == j ? 1.0 : 0.0) - inverse_root[i] * W[i][j] * inverse_root[j];
    }
  }
  return L;
}

// Largest eigenvector of a symmetric matrix, by repeated multiplication.
double PowerIteration(const std::vector<std::vector<double>>& matrix,
                      std::vector<double>& vector, int iterations, double tol) {
  const std::size_t n = matrix.size();
  vector.assign(n, 1.0 / std::sqrt(static_cast<double>(n)));

  for (int step = 0; step < iterations; ++step) {
    std::vector<double> product(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) {
      double total = 0.0;
      for (std::size_t j = 0; j < n; ++j) total += matrix[i][j] * vector[j];
      product[i] = total;
    }

    double norm = 0.0;
    for (const double value : product) norm += value * value;
    norm = std::sqrt(norm);
    if (norm == 0.0) break;

    double shift = 0.0;
    for (std::size_t i = 0; i < n; ++i) {
      product[i] /= norm;
      shift += std::abs(product[i] - vector[i]);
    }
    vector = product;
    if (shift < tol) break;
  }

  double eigenvalue = 0.0;
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < n; ++j) eigenvalue += vector[i] * matrix[i][j] * vector[j];
  }
  return eigenvalue;
}

// The k SMALLEST eigenvectors of L, via the shifted matrix 2I - L.
// Power iteration finds the largest; L_sym has eigenvalues in [0, 2], so the
// shift reverses the order without changing the vectors.
std::vector<std::vector<double>> BottomEigenvectors(
    const std::vector<std::vector<double>>& L, std::size_t k) {
  const std::size_t n = L.size();
  std::vector<std::vector<double>> shifted(n, std::vector<double>(n, 0.0));
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < n; ++j) shifted[i][j] = (i == j ? 2.0 : 0.0) - L[i][j];
  }

  std::vector<std::vector<double>> vectors;
  for (std::size_t component = 0; component < k; ++component) {
    std::vector<double> vector;
    const double eigenvalue = PowerIteration(shifted, vector, 1000, 1e-10);
    vectors.push_back(vector);

    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t j = 0; j < n; ++j) shifted[i][j] -= eigenvalue * vector[i] * vector[j];
    }
  }
  return vectors;
}`,
        profile: 'O(n^2 d) for the affinity plus O(k n^2) per power iteration, over nested vectors — three separate dense n-by-n matrices resident at once.',
      },
      'make-it-right': {
        code: `// Spectral clustering - flat buffers, kNN graph, Jacobi, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

// Cyclic Jacobi for a symmetric matrix. Returns all eigenpairs at once, which
// is the point: power iteration plus deflation folds each component's error
// into the ones after it, and here the components of interest are at the
// BOTTOM of the spectrum, where that accumulated error lands.
void JacobiEigen(std::vector<double>& a, std::vector<double>& vectors, std::size_t n,
                 int sweeps = 60, double tol = 1e-12) {
  vectors.assign(n * n, 0.0);
  for (std::size_t i = 0; i < n; ++i) vectors[i * n + i] = 1.0;

  for (int sweep = 0; sweep < sweeps; ++sweep) {
    double off = 0.0;
    for (std::size_t p = 0; p < n; ++p) {
      for (std::size_t q = p + 1; q < n; ++q) off += a[p * n + q] * a[p * n + q];
    }
    if (std::sqrt(off) < tol) return;

    for (std::size_t p = 0; p < n; ++p) {
      for (std::size_t q = p + 1; q < n; ++q) {
        if (std::abs(a[p * n + q]) < tol) continue;

        const double theta = (a[q * n + q] - a[p * n + p]) / (2.0 * a[p * n + q]);
        const double sign = theta >= 0.0 ? 1.0 : -1.0;
        const double t = sign / (std::abs(theta) + std::sqrt(theta * theta + 1.0));
        const double c = 1.0 / std::sqrt(t * t + 1.0);
        const double s = t * c;

        for (std::size_t m = 0; m < n; ++m) {
          const double a_pm = a[p * n + m];
          const double a_qm = a[q * n + m];
          a[p * n + m] = c * a_pm - s * a_qm;
          a[q * n + m] = s * a_pm + c * a_qm;
        }
        for (std::size_t m = 0; m < n; ++m) {
          const double a_mp = a[m * n + p];
          const double a_mq = a[m * n + q];
          a[m * n + p] = c * a_mp - s * a_mq;
          a[m * n + q] = s * a_mp + c * a_mq;

          const double v_mp = vectors[m * n + p];
          const double v_mq = vectors[m * n + q];
          vectors[m * n + p] = c * v_mp - s * v_mq;
          vectors[m * n + q] = s * v_mp + c * v_mq;
        }
      }
    }
  }
}

}  // namespace

class SpectralEmbedding {
 public:
  // x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
  SpectralEmbedding(std::span<const double> x_flat, std::size_t dimension,
                    std::size_t k, std::size_t n_neighbors)
      : k_(k) {
    if (dimension == 0 || x_flat.empty()) throw std::invalid_argument("empty problem");
    if (x_flat.size() % dimension != 0) {
      throw std::invalid_argument("X is not a multiple of the dimension");
    }

    const std::size_t n = x_flat.size() / dimension;
    if (k_ == 0 || k_ > n) throw std::invalid_argument("k must lie in [1, n]");
    if (n_neighbors == 0 || n_neighbors >= n) {
      throw std::invalid_argument("n_neighbors must lie in [1, n - 1]");
    }

    // Squared distances, lower triangle only - symmetry halves the work.
    std::vector<double> squared(n * n, 0.0);
    for (std::size_t i = 0; i < n; ++i) {
      const double* a = x_flat.data() + i * dimension;
      for (std::size_t j = 0; j < i; ++j) {
        const double* b = x_flat.data() + j * dimension;
        double total = 0.0;
        for (std::size_t m = 0; m < dimension; ++m) {
          const double difference = a[m] - b[m];
          total += difference * difference;
        }
        squared[i * n + j] = total;
        squared[j * n + i] = total;
      }
    }

    // Median heuristic for the bandwidth: a defensible default where none
    // really exists, and far better than a fixed constant.
    std::vector<double> finite;
    finite.reserve(n * (n - 1) / 2);
    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t j = 0; j < i; ++j) finite.push_back(squared[i * n + j]);
    }
    std::nth_element(finite.begin(), finite.begin() + static_cast<long>(finite.size() / 2),
                     finite.end());
    const double sigma = std::sqrt(finite[finite.size() / 2]);

    // kNN graph, not a full affinity: cheaper AND usually better, since
    // distant pairs contribute weight that is noise rather than structure.
    std::vector<double> affinity(n * n, 0.0);
    std::vector<std::size_t> order(n);
    for (std::size_t i = 0; i < n; ++i) {
      std::iota(order.begin(), order.end(), 0);
      order.erase(order.begin() + static_cast<long>(i));
      std::nth_element(order.begin(), order.begin() + static_cast<long>(n_neighbors),
                       order.end(), [&](std::size_t a, std::size_t b) {
                         return squared[i * n + a] < squared[i * n + b];
                       });
      for (std::size_t m = 0; m < n_neighbors; ++m) {
        const std::size_t j = order[m];
        const double weight = std::exp(-squared[i * n + j] / (2.0 * sigma * sigma));
        // Symmetrize by max: i being a neighbour of j does not make j one of i.
        affinity[i * n + j] = std::max(affinity[i * n + j], weight);
        affinity[j * n + i] = affinity[i * n + j];
      }
      order.resize(n);
    }

    std::vector<double> inverse_root(n, 0.0);
    for (std::size_t i = 0; i < n; ++i) {
      double degree = 0.0;
      for (std::size_t j = 0; j < n; ++j) degree += affinity[i * n + j];
      if (degree == 0.0) {
        throw std::runtime_error(
            "affinity graph has an isolated vertex - n_neighbors is too low for this data");
      }
      inverse_root[i] = 1.0 / std::sqrt(degree);
    }

    // Build the Laplacian in place over the affinity buffer: one dense n-by-n
    // matrix rather than three.
    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t j = 0; j < n; ++j) {
        affinity[i * n + j] =
            (i == j ? 1.0 : 0.0) - inverse_root[i] * affinity[i * n + j] * inverse_root[j];
      }
    }

    std::vector<double> vectors;
    JacobiEigen(affinity, vectors, n);

    std::vector<std::size_t> ranked(n);
    std::iota(ranked.begin(), ranked.end(), 0);
    std::sort(ranked.begin(), ranked.end(), [&](std::size_t a, std::size_t b) {
      return affinity[a * n + a] < affinity[b * n + b];   // SMALLEST first
    });

    embedding_.assign(n * k_, 0.0);
    eigenvalues_.assign(k_, 0.0);
    for (std::size_t c = 0; c < k_; ++c) {
      eigenvalues_[c] = affinity[ranked[c] * n + ranked[c]];
      for (std::size_t i = 0; i < n; ++i) embedding_[i * k_ + c] = vectors[i * n + ranked[c]];
    }

    // Row-normalize: small step, large effect on whether the final k-means
    // sees the spherical geometry it requires.
    for (std::size_t i = 0; i < n; ++i) {
      double norm = 0.0;
      for (std::size_t c = 0; c < k_; ++c) norm += embedding_[i * k_ + c] * embedding_[i * k_ + c];
      norm = std::sqrt(norm);
      if (norm == 0.0) continue;
      for (std::size_t c = 0; c < k_; ++c) embedding_[i * k_ + c] /= norm;
    }
  }

  [[nodiscard]] std::span<const double> embedding() const noexcept { return embedding_; }
  [[nodiscard]] std::span<const double> eigenvalues() const noexcept { return eigenvalues_; }

 private:
  std::size_t k_;
  std::vector<double> embedding_;    // row-major (n, k), owned
  std::vector<double> eigenvalues_;
};`,
        rationale:
          'Three changes. The affinity becomes a symmetrized k-nearest-neighbour graph rather than a full RBF, which is cheaper and usually better because distant pairs contribute noise to the spectrum. Power iteration with deflation becomes a Jacobi eigensolver, which matters more here than in PCA: deflation accumulates each component’s error into the ones after it, and the components of interest are at the bottom of the spectrum where that error lands. And the whole pipeline runs over flat buffers with the Laplacian built in place over the affinity, so one dense n-by-n matrix is resident rather than three — which on the largest array in the method is the difference between fitting and not.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n^2 d) for distances plus O(n^3) for the Jacobi sweeps, with one dense n-by-n buffer instead of three.',
      },
      'make-it-fast': {
        code: `// Spectral clustering - Eigen for distances and the eigensolver, OpenMP.
#include <Eigen/Dense>
#include <Eigen/Eigenvalues>
#include <algorithm>
#include <numeric>
#include <stdexcept>
#include <vector>

using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: the only pairwise term is a GEMM.
//
// This is the same expansion used everywhere in this section, and here it
// replaces the single most expensive loop in the method - n^2 distance
// computations each walking d elements.
RowMajorMatrix SquaredDistances(const RowMajorMatrix& X) {
  const Eigen::VectorXd norms = X.rowwise().squaredNorm();
  RowMajorMatrix squared = (-2.0 * (X * X.transpose())).colwise() + norms;
  squared.rowwise() += norms.transpose();
  return squared.cwiseMax(0.0);          // cancellation guard
}

// Builds the normalized Laplacian from a kNN graph and returns its bottom
// K eigenvectors, row-normalized.
RowMajorMatrix FitEmbedding(const RowMajorMatrix& X, int k, int n_neighbors) {
  const Eigen::Index n = X.rows();
  if (k < 1 || k > n) throw std::invalid_argument("k outside [1, n]");
  if (n_neighbors < 1 || n_neighbors >= n) {
    throw std::invalid_argument("n_neighbors outside [1, n - 1]");
  }

  RowMajorMatrix squared = SquaredDistances(X);
  squared.diagonal().setConstant(std::numeric_limits<double>::infinity());

  // Bandwidth from the median distance. Selecting per row is independent
  // work, so the neighbour scan below parallelizes cleanly.
  std::vector<double> flat;
  flat.reserve(static_cast<std::size_t>(n * n_neighbors));

  RowMajorMatrix affinity = RowMajorMatrix::Zero(n, n);
  std::vector<std::vector<Eigen::Index>> neighbours(static_cast<std::size_t>(n));

#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    std::vector<Eigen::Index> order(static_cast<std::size_t>(n));
    std::iota(order.begin(), order.end(), 0);
    std::nth_element(order.begin(), order.begin() + n_neighbors, order.end(),
                     [&](Eigen::Index a, Eigen::Index b) {
                       return squared(i, a) < squared(i, b);
                     });
    order.resize(static_cast<std::size_t>(n_neighbors));
    neighbours[static_cast<std::size_t>(i)] = std::move(order);
  }

  for (Eigen::Index i = 0; i < n; ++i) {
    for (const Eigen::Index j : neighbours[static_cast<std::size_t>(i)]) {
      flat.push_back(squared(i, j));
    }
  }
  std::nth_element(flat.begin(), flat.begin() + static_cast<long>(flat.size() / 2), flat.end());
  const double sigma = std::sqrt(flat[flat.size() / 2]);

  for (Eigen::Index i = 0; i < n; ++i) {
    for (const Eigen::Index j : neighbours[static_cast<std::size_t>(i)]) {
      const double weight = std::exp(-squared(i, j) / (2.0 * sigma * sigma));
      affinity(i, j) = std::max(affinity(i, j), weight);
      affinity(j, i) = affinity(i, j);            // symmetrize
    }
  }

  const Eigen::VectorXd degree = affinity.rowwise().sum();
  if ((degree.array() == 0.0).any()) {
    throw std::runtime_error("affinity graph has an isolated vertex");
  }
  const Eigen::VectorXd inverse_root = degree.array().rsqrt();

  // Fused: the normalized Laplacian is one expression, and the diagonal
  // scaling never materializes a diagonal matrix.
  const RowMajorMatrix laplacian =
      RowMajorMatrix::Identity(n, n) -
      inverse_root.asDiagonal() * affinity * inverse_root.asDiagonal();

  // SelfAdjointEigenSolver, not the general one: the Laplacian is symmetric,
  // and the symmetric solver is both faster and returns sorted real values.
  Eigen::SelfAdjointEigenSolver<RowMajorMatrix> solver(laplacian);
  if (solver.info() != Eigen::Success) throw std::runtime_error("eigensolver failed");

  RowMajorMatrix embedding = solver.eigenvectors().leftCols(k);   // ascending
  for (Eigen::Index i = 0; i < n; ++i) {
    const double norm = embedding.row(i).norm();
    if (norm > 0.0) embedding.row(i) /= norm;
  }
  return embedding;
}`,
        rationale:
          'The n-squared distance loop — the single most expensive step — becomes one GEMM through the squared-norm expansion, and the per-row neighbour selection parallelizes across cores because each row is independent. The hand-written Jacobi sweeps become Eigen’s symmetric eigensolver, which is the same algorithm executed against blocked kernels and which returns eigenvalues already sorted ascending, exactly the order this method needs. The normalized Laplacian is a single fused expression, so the diagonal scaling never materializes a diagonal matrix.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The pairwise distance term and the symmetric eigendecomposition both dispatch to blocked kernels, replacing an O(n^2 d) triple loop and O(n^3) hand-written sweeps.',
            tradeoff: 'Requires the dense n-by-n distance and Laplacian matrices resident at once — which is the ceiling on this method, and the reason a sparse formulation beats this one past a few tens of thousands of points.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each row selects its own k nearest neighbours from its own row of the distance matrix, so the selection phase partitions across cores with no shared mutable state.',
            tradeoff: 'Each thread allocates its own index buffer of length n, so memory scales with core count — and nesting this around a threaded BLAS can oversubscribe the machine.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The normalized Laplacian is one fused expression, so the two diagonal scalings and the subtraction evaluate in a single pass with no intermediate matrices.',
            tradeoff: 'One line hides two O(n^2) products, so the cost is invisible where it is paid, and an expression bound to auto rather than assigned can dangle after its operands go out of scope.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n^2 d) distances in BLAS plus O(n^3) symmetric eigendecomposition. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Spectral clustering - affinity, Laplacian, eigenvectors. Transcribed.

/// W_ij = exp(-||x_i - x_j||^2 / (2 sigma^2)), no self-loops.
///
/// Sigma is the model. Too small and the graph fragments into isolated
/// points; too large and everything connects and the structure disappears.
fn rbf_affinity(x: &[Vec<f64>], sigma: f64) -> Vec<Vec<f64>> {
    let n = x.len();
    let mut w = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in (i + 1)..n {
            let mut squared = 0.0;
            for k in 0..x[i].len() {
                let difference = x[i][k] - x[j][k];
                squared += difference * difference;
            }
            let weight = (-squared / (2.0 * sigma * sigma)).exp();
            w[i][j] = weight;
            w[j][i] = weight;
        }
    }
    w
}

/// L_sym = I - D^(-1/2) W D^(-1/2). The normalization stops a high-degree
/// vertex dominating the embedding purely by having many neighbours.
fn normalized_laplacian(w: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = w.len();
    let inverse_root: Vec<f64> = w
        .iter()
        .map(|row| {
            let degree: f64 = row.iter().sum();
            if degree == 0.0 { 0.0 } else { 1.0 / degree.sqrt() }
        })
        .collect();

    let mut l = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..n {
            let identity = if i == j { 1.0 } else { 0.0 };
            l[i][j] = identity - inverse_root[i] * w[i][j] * inverse_root[j];
        }
    }
    l
}

/// Largest eigenvector of a symmetric matrix, by repeated multiplication.
fn power_iteration(matrix: &[Vec<f64>], iterations: usize, tol: f64) -> (Vec<f64>, f64) {
    let n = matrix.len();
    let mut vector = vec![1.0 / (n as f64).sqrt(); n];

    for _ in 0..iterations {
        let mut product = vec![0.0; n];
        for i in 0..n {
            let mut total = 0.0;
            for j in 0..n {
                total += matrix[i][j] * vector[j];
            }
            product[i] = total;
        }

        let norm: f64 = product.iter().map(|v| v * v).sum::<f64>().sqrt();
        if norm == 0.0 {
            break;
        }

        let mut shift = 0.0;
        for i in 0..n {
            product[i] /= norm;
            shift += (product[i] - vector[i]).abs();
        }
        vector = product;
        if shift < tol {
            break;
        }
    }

    let mut eigenvalue = 0.0;
    for i in 0..n {
        for j in 0..n {
            eigenvalue += vector[i] * matrix[i][j] * vector[j];
        }
    }
    (vector, eigenvalue)
}

/// The k SMALLEST eigenvectors of L, via the shifted matrix 2I - L.
/// Power iteration finds the largest; L_sym has eigenvalues in [0, 2], so
/// the shift reverses the order without changing the vectors.
pub fn bottom_eigenvectors(l: &[Vec<f64>], k: usize) -> Vec<Vec<f64>> {
    let n = l.len();
    let mut shifted: Vec<Vec<f64>> = (0..n)
        .map(|i| (0..n).map(|j| if i == j { 2.0 } else { 0.0 } - l[i][j]).collect())
        .collect();

    let mut vectors = Vec::new();
    for _ in 0..k {
        let (vector, eigenvalue) = power_iteration(&shifted, 1000, 1e-10);
        for i in 0..n {
            for j in 0..n {
                shifted[i][j] -= eigenvalue * vector[i] * vector[j];
            }
        }
        vectors.push(vector);
    }
    vectors
}

pub fn fit(x: &[Vec<f64>], k: usize, sigma: f64) -> Vec<Vec<f64>> {
    let w = rbf_affinity(x, sigma);
    let l = normalized_laplacian(&w);
    let vectors = bottom_eigenvectors(&l, k);

    // Row-normalize the embedding: small step, large effect on whether the
    // final k-means sees the spherical geometry it requires.
    (0..x.len())
        .map(|i| {
            let row: Vec<f64> = (0..k).map(|c| vectors[c][i]).collect();
            let norm: f64 = row.iter().map(|v| v * v).sum::<f64>().sqrt();
            if norm > 0.0 { row.iter().map(|v| v / norm).collect() } else { row }
        })
        .collect()
}`,
        profile: 'O(n^2 d) for the affinity plus O(k n^2) per power iteration, with three dense nested-Vec matrices resident and every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Spectral clustering - typed errors, kNN graph, Jacobi, flat buffers.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum SpectralError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Clusters { k: usize, n: usize },
    Neighbors { requested: usize, available: usize },
    IsolatedVertex { index: usize },
}

impl fmt::Display for SpectralError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Clusters { k, n } => write!(f, "k={k} outside [1, {n}]"),
            Self::Neighbors { requested, available } => {
                write!(f, "n_neighbors={requested} outside [1, {available}]")
            }
            Self::IsolatedVertex { index } => write!(
                f,
                "vertex {index} has no neighbours - n_neighbors is too low for this data"
            ),
        }
    }
}

impl std::error::Error for SpectralError {}

/// Neighbourhood size for the affinity graph. A newtype because it and k are
/// both bare usize at every call site, and the graph is the model — getting
/// this wrong is not a tuning miss, it is a different model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NNeighbors(usize);

impl NNeighbors {
    pub fn new(value: usize, n: usize) -> Result<Self, SpectralError> {
        if value == 0 || value >= n {
            return Err(SpectralError::Neighbors { requested: value, available: n - 1 });
        }
        Ok(Self(value))
    }
}

/// Cyclic Jacobi for a symmetric matrix. Returns all eigenpairs at once:
/// power iteration plus deflation folds each component's error into the ones
/// after it, and here the components of interest are at the BOTTOM of the
/// spectrum, which is exactly where that accumulated error lands.
fn jacobi_eigen(a: &mut [f64], n: usize, sweeps: usize, tol: f64) -> Vec<f64> {
    let mut vectors = vec![0.0_f64; n * n];
    for i in 0..n {
        vectors[i * n + i] = 1.0;
    }

    for _ in 0..sweeps {
        let off: f64 = (0..n)
            .flat_map(|p| ((p + 1)..n).map(move |q| (p, q)))
            .map(|(p, q)| a[p * n + q] * a[p * n + q])
            .sum();
        if off.sqrt() < tol {
            break;
        }

        for p in 0..n {
            for q in (p + 1)..n {
                if a[p * n + q].abs() < tol {
                    continue;
                }

                let theta = (a[q * n + q] - a[p * n + p]) / (2.0 * a[p * n + q]);
                let sign = if theta >= 0.0 { 1.0 } else { -1.0 };
                let t = sign / (theta.abs() + (theta * theta + 1.0).sqrt());
                let c = 1.0 / (t * t + 1.0).sqrt();
                let s = t * c;

                for m in 0..n {
                    let a_pm = a[p * n + m];
                    let a_qm = a[q * n + m];
                    a[p * n + m] = c * a_pm - s * a_qm;
                    a[q * n + m] = s * a_pm + c * a_qm;
                }
                for m in 0..n {
                    let a_mp = a[m * n + p];
                    let a_mq = a[m * n + q];
                    a[m * n + p] = c * a_mp - s * a_mq;
                    a[m * n + q] = s * a_mp + c * a_mq;

                    let v_mp = vectors[m * n + p];
                    let v_mq = vectors[m * n + q];
                    vectors[m * n + p] = c * v_mp - s * v_mq;
                    vectors[m * n + q] = s * v_mp + c * v_mq;
                }
            }
        }
    }

    vectors
}

pub struct SpectralEmbedding {
    /// Row-major (n, k), rows normalized to unit length.
    pub embedding: Vec<f64>,
    /// The bottom K eigenvalues - the eigengap between them is the one
    /// principled way to choose K available anywhere in this section.
    pub eigenvalues: Vec<f64>,
    pub k: usize,
}

impl SpectralEmbedding {
    /// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
    pub fn fit(
        x_flat: &[f64],
        dimension: usize,
        k: usize,
        n_neighbors: NNeighbors,
    ) -> Result<Self, SpectralError> {
        if dimension == 0 || x_flat.is_empty() {
            return Err(SpectralError::Empty);
        }
        if x_flat.len() % dimension != 0 {
            return Err(SpectralError::ShapeMismatch {
                expected: (x_flat.len() / dimension + 1) * dimension,
                found: x_flat.len(),
            });
        }

        let n = x_flat.len() / dimension;
        if k == 0 || k > n {
            return Err(SpectralError::Clusters { k, n });
        }

        // Squared distances, lower triangle only: symmetry halves the work.
        let mut squared = vec![0.0_f64; n * n];
        for (i, a) in x_flat.chunks_exact(dimension).enumerate() {
            for (j, b) in x_flat.chunks_exact(dimension).take(i).enumerate() {
                let total: f64 = a
                    .iter()
                    .zip(b)
                    .map(|(p, q)| {
                        let difference = p - q;
                        difference * difference
                    })
                    .sum();
                squared[i * n + j] = total;
                squared[j * n + i] = total;
            }
        }

        // Median heuristic for the bandwidth - a defensible default where
        // none really exists, and far better than a fixed constant.
        let mut finite: Vec<f64> = (0..n)
            .flat_map(|i| (0..i).map(move |j| (i, j)))
            .map(|(i, j)| squared[i * n + j])
            .collect();
        let middle = finite.len() / 2;
        finite.select_nth_unstable_by(middle, |a, b| a.total_cmp(b));
        let sigma = finite[middle].sqrt();

        // kNN graph, not a full affinity: cheaper AND usually better, since
        // distant pairs contribute weight that is noise rather than structure.
        let mut affinity = vec![0.0_f64; n * n];
        let mut order: Vec<usize> = Vec::with_capacity(n);
        for i in 0..n {
            order.clear();
            order.extend((0..n).filter(|&j| j != i));
            order.select_nth_unstable_by(n_neighbors.0, |&a, &b| {
                squared[i * n + a].total_cmp(&squared[i * n + b])
            });

            for &j in order.iter().take(n_neighbors.0) {
                let weight = (-squared[i * n + j] / (2.0 * sigma * sigma)).exp();
                // Symmetrize by max: i neighbouring j does not make j
                // neighbour i.
                let current = affinity[i * n + j].max(weight);
                affinity[i * n + j] = current;
                affinity[j * n + i] = current;
            }
        }

        let mut inverse_root = vec![0.0_f64; n];
        for i in 0..n {
            let degree: f64 = affinity[i * n..(i + 1) * n].iter().sum();
            if degree == 0.0 {
                return Err(SpectralError::IsolatedVertex { index: i });
            }
            inverse_root[i] = 1.0 / degree.sqrt();
        }

        // Build the Laplacian in place over the affinity buffer: one dense
        // n-by-n matrix resident rather than three.
        for i in 0..n {
            for j in 0..n {
                let identity = if i == j { 1.0 } else { 0.0 };
                affinity[i * n + j] =
                    identity - inverse_root[i] * affinity[i * n + j] * inverse_root[j];
            }
        }

        let vectors = jacobi_eigen(&mut affinity, n, 60, 1e-12);

        let mut ranked: Vec<usize> = (0..n).collect();
        ranked.sort_unstable_by(|&a, &b| {
            affinity[a * n + a].total_cmp(&affinity[b * n + b])   // SMALLEST first
        });

        let mut embedding = vec![0.0_f64; n * k];
        let mut eigenvalues = Vec::with_capacity(k);
        for (c, &source) in ranked.iter().take(k).enumerate() {
            eigenvalues.push(affinity[source * n + source]);
            for i in 0..n {
                embedding[i * k + c] = vectors[i * n + source];
            }
        }

        // Row-normalize: small step, large effect on whether the final
        // k-means sees the spherical geometry it requires.
        for row in embedding.chunks_exact_mut(k) {
            let norm: f64 = row.iter().map(|v| v * v).sum::<f64>().sqrt();
            if norm > 0.0 {
                row.iter_mut().for_each(|value| *value /= norm);
            }
        }

        Ok(Self { embedding, eigenvalues, k })
    }
}
`,
        rationale:
          'The affinity becomes a symmetrized k-nearest-neighbour graph rather than a full RBF — cheaper, and usually better, because distant pairs contribute noise to the spectrum. Power iteration with deflation becomes a Jacobi eigensolver, which matters especially here: deflation accumulates error into later components, and the components this method needs are at the bottom of the spectrum where that error concentrates. The nested Vecs become flat row-major buffers with the Laplacian built in place over the affinity, so one dense matrix is resident rather than three. Errors become a typed Result, including the isolated-vertex case the previous stage divided straight through, and the neighbourhood size gets a newtype because the graph is the model.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n^2 d) for distances plus O(n^3) for the Jacobi sweeps, with one dense n-by-n buffer instead of three.',
      },
      'make-it-fast': {
        code: `//! Spectral clustering - BLAS distances, parallel neighbour selection.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use ndarray_linalg::Eigh;
use ndarray_linalg::UPLO;
use rayon::prelude::*;

/// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: the only pairwise term is a
/// matrix product, which replaces the single most expensive loop in the
/// method - n^2 distance computations each walking d elements.
#[must_use]
pub fn squared_distances(x: ArrayView2<f64>) -> Array2<f64> {
    let norms: Array1<f64> = x.axis_iter(Axis(0)).map(|row| row.dot(&row)).collect();
    let cross = x.dot(&x.t());

    let n = norms.len();
    let mut squared = Array2::<f64>::zeros((n, n));
    squared
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(i, mut row)| {
            for j in 0..n {
                row[j] = (norms[i] - 2.0 * cross[[i, j]] + norms[j]).max(0.0);
            }
        });
    squared
}

/// Bottom K eigenvectors of the normalized Laplacian of a kNN graph,
/// row-normalized.
///
/// The dense eigensolver here computes all n eigenvectors and keeps K. That
/// is the honest limit of a dense formulation: past a few tens of thousands
/// of points the answer is a sparse graph and a Lanczos solver, not a faster
/// dense decomposition.
#[must_use]
pub fn fit_embedding(x: ArrayView2<f64>, k: usize, n_neighbors: usize) -> Array2<f64> {
    let n = x.nrows();
    let squared = squared_distances(x);

    // Each row selects its own neighbours from its own row of the distance
    // matrix - independent work, so the scan fans out across cores.
    let neighbours: Vec<Vec<usize>> = (0..n)
        .into_par_iter()
        .map(|i| {
            let mut order: Vec<usize> = (0..n).filter(|&j| j != i).collect();
            order.select_nth_unstable_by(n_neighbors, |&a, &b| {
                squared[[i, a]].total_cmp(&squared[[i, b]])
            });
            order.truncate(n_neighbors);
            order
        })
        .collect();

    let mut flat: Vec<f64> = Vec::with_capacity(n * n_neighbors);
    for (i, row) in neighbours.iter().enumerate() {
        flat.extend(row.iter().map(|&j| squared[[i, j]]));
    }
    let middle = flat.len() / 2;
    flat.select_nth_unstable_by(middle, |a, b| a.total_cmp(b));
    let sigma = flat[middle].sqrt();

    let mut affinity = Array2::<f64>::zeros((n, n));
    for (i, row) in neighbours.iter().enumerate() {
        for &j in row {
            let weight = (-squared[[i, j]] / (2.0 * sigma * sigma)).exp();
            let current = affinity[[i, j]].max(weight);
            affinity[[i, j]] = current;
            affinity[[j, i]] = current;          // symmetrize
        }
    }

    let degree: Array1<f64> = affinity.sum_axis(Axis(1));
    let inverse_root: Array1<f64> = degree.mapv(|value| 1.0 / value.sqrt());

    let mut laplacian = Array2::<f64>::zeros((n, n));
    laplacian
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(i, mut row)| {
            for j in 0..n {
                let identity = if i == j { 1.0 } else { 0.0 };
                row[j] = identity - inverse_root[i] * affinity[[i, j]] * inverse_root[j];
            }
        });

    // eigh, not the general solver: the Laplacian is symmetric, so this is
    // both faster and guaranteed to return sorted real eigenvalues.
    let (_, vectors) = laplacian.eigh(UPLO::Lower).expect("eigh failed");

    let mut embedding = vectors.slice(ndarray::s![.., ..k]).to_owned();
    embedding
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .for_each(|mut row| {
            let norm = row.dot(&row).sqrt();
            if norm > 0.0 {
                row /= norm;
            }
        });

    embedding
}
`,
        rationale:
          'The n-squared distance loop becomes a BLAS matrix product through the squared-norm expansion, and every genuinely independent phase — the distance fill, the per-row neighbour selection, the Laplacian assembly, the row normalization — moves to rayon. The hand-written Jacobi sweeps become a LAPACK symmetric eigendecomposition, which also returns eigenvalues already sorted ascending, exactly the order this method needs. The doc comment states what has not changed: a dense solver still computes all n eigenvectors to keep K, and past a few tens of thousands of points the answer is a sparse graph with Lanczos rather than a faster dense decomposition.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The pairwise cross-product term and the symmetric eigendecomposition both dispatch to BLAS and LAPACK instead of hand-written O(n^2 d) and O(n^3) loops.',
            tradeoff: 'Binds the build to a system BLAS/LAPACK, and needs the dense n-by-n distance, affinity and Laplacian matrices resident — which is the ceiling this formulation cannot escape.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'The distance fill, neighbour selection, Laplacian assembly and row normalization are all independent per row, so each partitions across cores with no shared mutable state.',
            tradeoff: 'The eigendecomposition that dominates the cost is left to LAPACK, so the achievable speedup from rayon is bounded — and nesting it around a threaded LAPACK risks oversubscription.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Row-wise parallel iteration hands each worker a contiguous row of a row-major array, so every pass is a sequential read the prefetcher can follow.',
            tradeoff: 'Column-wise operations on the same matrices are then strided, and the affinity is accessed by both rows and columns during symmetrization — one of the two directions is always paying for it.',
          },
        ],
        libraryName: 'ndarray + ndarray-linalg + rayon',
        profile: 'O(n^2 d) distances in BLAS plus O(n^3) symmetric eigendecomposition across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
