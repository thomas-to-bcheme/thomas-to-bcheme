import type { AiMlModel } from '../../types';

/**
 * Hierarchical (Agglomerative) Clustering — a tree of merges instead of a flat
 * partition, built from nothing but a dissimilarity.
 *
 * Follows spectral clustering in the structure group because it removes a
 * different restriction from k-means: not the blob assumption but the need for
 * a mean. Single, complete and average linkage accept any dissimilarity at all
 * — cosine, Jaccard, a DTW matrix — which is why this entry feeds the
 * similarity-metric map. Ward is the exception and the entry says so wherever
 * the distinction decides whether the result means anything. The code
 * progression is built around the two decisions that determine cost and
 * correctness: how the cluster-to-cluster distance is updated (Lance-Williams,
 * and nearest-neighbour chain to avoid rescanning the matrix), and where Ward
 * is allowed to enter.
 */
export const HIERARCHICAL_CLUSTERING: AiMlModel = {
  slug: 'hierarchical-clustering',
  name: 'Hierarchical (Agglomerative) Clustering',
  aliases: ['Hierarchical Clustering', 'Agglomerative clustering', 'Ward linkage', 'Dendrogram'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'anomaly-detection' because a point that stays a singleton until late in the
  // merge order is a usable outlier score, with the caveats in
  // applications.featured['anomaly-detection'].
  taskTypes: ['clustering', 'anomaly-detection'],
  paradigmNote:
    'The output is a tree, not a partition: every flat clustering from one cluster to n singletons is contained in it, and choosing K becomes a cut made after the fit rather than a parameter fixed before it. That is the difference that matters, and it is also why the method has no objective in the usual sense — it is a deterministic procedure whose result you interrogate.',

  intuition:
    'Start with every point as its own cluster, find the two closest clusters, merge them, and repeat until one cluster remains. The record of those merges — which two joined, and at what distance — is the dendrogram, and cutting it at any height or at any K gives a flat clustering for free. Everything interesting hides in one word, closest: the distance between two clusters is not defined until you choose a linkage. Single linkage uses the nearest pair of points, so clusters join along thin bridges and chain into long streaks. Complete linkage uses the farthest pair, so clusters stay compact. Average linkage splits the difference. Ward merges whichever pair increases the within-cluster sum of squares least, which is k-means’ objective applied greedily, and it is the only one of the four that needs Euclidean geometry. The others need only a dissimilarity — no mean, no coordinates, no metric axioms — so this is the clustering you reach for when your data is word sets compared by Jaccard, embeddings compared by cosine, or time series compared by dynamic time warping.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '(A^{*}, B^{*}) = \\operatorname*{arg\\,min}_{A \\neq B} \\Delta(A, B), \\qquad \\Delta(A, B) = \\operatorname{SSE}(A \\cup B) - \\operatorname{SSE}(A) - \\operatorname{SSE}(B) = \\frac{\\lvert A \\rvert \\, \\lvert B \\rvert}{\\lvert A \\rvert + \\lvert B \\rvert} \\, \\lVert \\boldsymbol{\\mu}_A - \\boldsymbol{\\mu}_B \\rVert_2^2',
      symbols: [
        { symbol: 'A, B', meaning: 'two current clusters; the algorithm considers every pair of them at every step' },
        { symbol: '\\Delta(A, B)', meaning: 'Ward’s merge cost: how much the total within-cluster sum of squares rises if A and B are joined' },
        { symbol: '\\operatorname{SSE}(\\cdot)', meaning: 'sum of squared Euclidean distances from a cluster’s points to its own mean — the same quantity k-means minimizes' },
        { symbol: '\\boldsymbol{\\mu}_A', meaning: 'the cluster mean, which is why Ward exists only in a space where means and squared distances make sense' },
        { symbol: '\\frac{\\lvert A \\rvert \\lvert B \\rvert}{\\lvert A \\rvert + \\lvert B \\rvert}', meaning: 'the size factor that makes merging two large clusters expensive even when their centres are close — it is what pushes Ward toward balanced, compact clusters' },
      ],
    },
    reading:
      'At every step, join the pair of clusters whose union raises the total squared scatter by the least. That is a loss, and for Ward it is exactly k-means’ loss — but it is minimized greedily, one irrevocable merge at a time, rather than globally. A K-cut of the Ward tree is therefore generally not the K-means optimum on the same data; it is a good starting point for k-means rather than a substitute for it. Be honest about the other linkages: single, complete and average have no global objective being minimized. Each is a rule for what cluster-to-cluster distance means, applied greedily. Two narrow exceptions are worth stating. Single linkage cut at K is exactly the maximum-spacing clustering — it is Kruskal’s minimum spanning tree with the K-1 longest edges removed — so there is an optimality statement there. Complete linkage is a greedy heuristic for small cluster diameter with no such guarantee. For average linkage there is no objective at all.',
  },

  optimization: {
    method: 'Greedy bottom-up merging, with cluster-to-cluster distances updated by the Lance-Williams recurrence',
    updateRule: {
      formula:
        'd(k, i \\cup j) = \\alpha_i \\, d(k, i) + \\alpha_j \\, d(k, j) + \\beta \\, d(i, j) + \\gamma \\, \\lvert d(k, i) - d(k, j) \\rvert',
      symbols: [
        { symbol: 'd(k, i \\cup j)', meaning: 'the distance from any other cluster k to the cluster just formed by merging i and j — computed from old distances only, so the original points are never revisited' },
        { symbol: '\\alpha_i, \\alpha_j', meaning: 'weights on the two old distances: one half each for single and complete, size-proportional for average, and (n_i + n_k) over (n_i + n_j + n_k) for Ward' },
        { symbol: '\\beta', meaning: 'weight on the distance between the two merged clusters: zero for single, complete and average, and minus n_k over (n_i + n_j + n_k) for Ward' },
        { symbol: '\\gamma', meaning: 'weight on the absolute difference: minus one half collapses the formula to min (single), plus one half to max (complete), and zero otherwise' },
        { symbol: '\\lvert d(k, i) - d(k, j) \\rvert', meaning: 'the term that lets one formula express both min and max, since min is the average minus half the gap and max is the average plus half the gap' },
      ],
    },
    rationale:
      'The recurrence is the whole reason this is practical. Without it, every merge would recompute cluster-to-cluster distances from the original points, which for Ward means revisiting every pair; with it, each merge is one O(n) row update of the dissimilarity matrix and the data is never touched again. The linkage is nothing more than the choice of coefficients. A second decision decides the running time: the naive loop scans the whole matrix for the closest pair on every merge, which is O(n^3). A heap of nearest neighbours gets O(n^2 log n), and the nearest-neighbour chain algorithm gets O(n^2) outright — follow a chain of nearest neighbours until two clusters point at each other, merge them, and continue. That is only valid for reducible linkages, meaning merging two clusters can never bring the result closer to a third than either parent was. Single, complete, average and Ward are reducible. Centroid and median linkage are not, which is why they can produce inversions — a later merge at a smaller height than an earlier one — and why they should be avoided.',
    hyperparameters: [
      { name: 'linkage', role: 'The definition of distance between clusters, and therefore the geometry of the result. Single chains along thin bridges. Complete and Ward favour compact clusters. Average sits between them. The choice is a statement about what a cluster looks like', typicalRange: 'Ward for Euclidean features; average for a general dissimilarity; single only for deliberately connectivity-driven or outlier-hunting work' },
      { name: 'dissimilarity (metric)', role: 'What “close” means between two points. Euclidean is required by Ward. Cosine suits text and embedding vectors where direction carries meaning and magnitude is noise; Jaccard suits sets and binary indicators, such as shared devices or tokens; correlation distance suits series compared by shape; DTW or edit distance suit sequences and arrive as a precomputed matrix. Swapping the metric changes what the tree represents, not just a number', typicalRange: 'chosen from the data representation, never from the algorithm' },
      { name: 'cut (n_clusters or distance_threshold)', role: 'Where to read the tree. A fixed K gives a flat partition; a height gives a partition whose number of clusters depends on the data, which is usually what you want for deduplication and entity resolution. This is the decision that k-means forces before fitting and this method defers until after' },
      { name: 'connectivity', role: 'An optional sparse graph restricting which pairs may merge — a spatial adjacency, a kNN graph. It injects structure the dissimilarity does not carry, and it lowers cost well below quadratic on sparse graphs', typicalRange: 'kNN graph with 10 to 20 neighbours, or a domain adjacency' },
      { name: 'scaling', role: 'Standardize features before any Euclidean-based linkage, or the largest-variance feature decides the tree' },
    ],
    convergence:
      'There is nothing to converge: the procedure is deterministic, has no initialization and no restarts, and always terminates after exactly n-1 merges, which is a real operational advantage over k-means. Ties in the distance matrix are the one source of arbitrariness, and they make the tree depend on input order. What the method does not guarantee is that the tree is a good description of the data, and its failure modes are specific. Chaining: single linkage merges clusters through a single bridging pair, so a thin trail of points joins two blobs into one. Size bias: complete linkage breaks large clusters apart to keep diameters small, and Ward prefers balanced, spherical clusters. Irrevocability: every merge is final, so an early mistake caused by noise is carried into every level above it. Outlier sensitivity: under Ward an outlier inflates the sum of squares and distorts the partition at levels where it finally joins. And it always returns a tree whatever the data is — uniform noise produces a perfectly well-formed dendrogram. Cophenetic correlation, the correlation between the original dissimilarities and the dendrogram heights at which each pair first joins, is the standard diagnostic for whether the tree distorts the geometry.',
    complexity:
      'Memory is O(n^2) for the dissimilarity matrix, which is the binding constraint: n(n-1)/2 float64 values is roughly 400 MB at 10,000 points and 10 GB at 50,000. Time depends on the algorithm. Naive scan-and-merge is O(n^3). A priority-queue implementation is O(n^2 log n). The nearest-neighbour chain algorithm is O(n^2) for any reducible linkage — single, complete, average, Ward. SLINK computes single linkage in O(n^2) time and O(n) extra memory by building the pointer representation one point at a time, never materializing the matrix, provided distances can be computed on the fly. With a sparse connectivity graph the cost drops well below quadratic. For anything past a few tens of thousands of points the honest answer is a two-stage scheme: reduce with mini-batch k-means, then cluster the centroids hierarchically.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Cluster the series by shape using a distance chosen for that purpose, then use the tree two ways. Cut it to form groups over which one pooled model is fitted, which helps when no single series has enough history. Or use it as the aggregation structure for hierarchical forecasting when no natural hierarchy exists — forecast every node, then reconcile so that forecasts at different levels add up. The distance is the whole design: correlation distance, or Euclidean distance on z-normalized series (the two are equivalent, since squared Euclidean distance between z-normalized series of length T is 2T times one minus the correlation), or dynamic time warping when series are the same shape at different phases.',
        where: [
          'Deriving a data-driven aggregation tree for demand series that have no clean product or region hierarchy, as input to forecast reconciliation',
          'Grouping SKUs, meters or stores by demand profile so one global model is fitted per group',
          'Load-profile segmentation in energy, where the dendrogram lets an analyst pick a coarser or finer segmentation after the fact',
          'Sensor and asset grouping where series are similar in shape but offset in time',
        ],
        why: 'It accepts a dissimilarity you can compute but not average, and that is the common situation with time series: DTW has no mean, so k-means cannot use it, and a DTW distance matrix goes straight into average or complete linkage. The dendrogram also answers the question k-means cannot, which is what granularity the groups should have — you cut once for pooling and again for reconciliation levels, from one fit. The costs bind quickly. DTW is itself quadratic in series length, so an n-by-n DTW matrix is quadratic in both, and DTW is not a metric, which rules out Ward entirely. There is no way to place a new series without redoing the work, so this is an offline step.',
        featurization: [
          'Z-normalize each series before computing correlation or Euclidean distance, or the tree recovers magnitude rather than shape',
          'Use correlation distance or z-normalized Euclidean for Ward; use DTW only with single, complete or average linkage, where a non-metric dissimilarity is legitimate',
          'Constrain DTW with a warping band — it both bounds the cost and stops it matching unrelated shapes',
          'Compute distances on the training window only; a matrix built over the full history leaks future co-movement into the grouping',
        ],
        evaluation:
          'Rolling-origin backtest of the pooled or reconciled forecasts against the ungrouped baseline, reported at every level of the hierarchy. Cophenetic correlation is a diagnostic for whether the tree distorts the distances, not a measure of whether the grouping helps forecasts.',
        pitfalls: [
          'Euclidean distance on unaligned, unnormalized series, where level and phase dominate any difference in shape',
          'Pairing Ward with a DTW matrix, which is not a Euclidean space, so the sum-of-squares criterion has no meaning',
          'Reading the tree’s top split as meaningful when it is only the largest merge height of a tree that always has one',
          'Forgetting that a refit can reshuffle the groups, silently changing which pooled model scores a series',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Build the tree on the data and score each point by how late it stops being isolated: the height at which it first joins a cluster of at least m points. Normal points join dense clusters early; an outlier remains a singleton until the tree is nearly complete. Equivalently, cut at a height and flag singletons and tiny clusters. Under single linkage a point’s first merge height is exactly its nearest-neighbour distance, so the score is a nearest-neighbour outlier score with the dendrogram supplying the context.',
        where: [
          'Retrospective quality control on a bounded batch, such as sample or sensor screening before analysis',
          'Reviewing accounts or entities whose behaviour profile never merges with any established group',
          'Finding stray documents in a corpus clustered by cosine similarity — the ones that attach to nothing until the very top',
          'Anomaly review where an analyst needs to see why a point is isolated, which the tree shows directly',
        ],
        why: 'Its virtue is the dissimilarity: it works for data where no density or mean exists, such as Jaccard over set-valued records or Gower distance over mixed types, and it produces an explanation rather than a bare score. Against that, it is offline, quadratic, and has no way to score a new point without rebuilding. For streaming or large-scale detection an isolation forest or a density model is the right tool; this is a defensible choice for a bounded dataset reviewed once. Be specific about linkage: single linkage isolates outliers cleanly but chains them to clusters through any bridging point, while Ward and complete resist bridging but let an outlier distort the partition when it finally merges.',
        featurization: [
          'Pick the dissimilarity for the data type — cosine for embeddings, Jaccard for sets — since the isolation it finds is isolation in that metric and no other',
          'Standardize numeric features before any Euclidean distance, or one wide feature decides what counts as isolated',
          'Choose the minimum cluster size m from the smallest group you consider a legitimate segment, not from the data',
          'Cluster a confirmed-clean window where one exists, or colluding anomalies form their own tidy cluster',
        ],
        evaluation:
          'Precision@k against confirmed anomalies, and PR-AUC rather than ROC-AUC. Compare against an isolation forest or LOF on the same data — if they agree, the tree’s extra explanation is free; if they disagree, the linkage choice is usually what differs.',
        pitfalls: [
          'A group of anomalies larger than m, which forms its own cluster and is scored as normal — the same masking failure every cluster-based detector has',
          'A single bridging point under single linkage, which attaches an outlier to a dense cluster at a low height and hides it',
          'Comparing merge heights across different linkages or metrics, which are on different scales and mean different things',
          'Treating the merge height as a calibrated probability when it is a distance in an arbitrary metric',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'It is a greedy procedure that produces a tree, not a method for solving a stated optimization problem: there is no feasible set to search, no fitness to rank candidates, and the only objective in the picture, Ward’s sum of squares, is minimized greedily and incidentally rather than offered as a solver for anyone’s problem.',
      },
    },
    breadth: {
      'natural-language': {
        fit: 'viable',
        how: 'Cluster documents, queries or support tickets by cosine distance on TF-IDF or sentence-embedding vectors, and use the dendrogram as a topic hierarchy a person can browse and cut at the granularity they need. The metric matters: cosine ignores vector length, which is document length or embedding norm and carries no topical information. If the vectors are L2-normalized first, squared Euclidean distance equals two times one minus the cosine, so Ward becomes legitimate on them as well.',
        where: [
          'Building a topic taxonomy over support tickets or search queries, where the hierarchy is the deliverable',
          'Near-duplicate document grouping, cut at a distance threshold so the number of groups is whatever the data holds',
          'Exploratory analysis of an embedding space, where the dendrogram shows which topics are siblings',
        ],
        why: 'The number of topics is unknown, a fixed K would be arbitrary, and a browsable hierarchy is exactly the artefact an analyst wants. It scales poorly: a few tens of thousands of documents is the quadratic ceiling, so the practical pattern on a real corpus is two-stage — mini-batch k-means to a few thousand centroids, then hierarchical clustering on those. It is also the wrong choice when topics overlap heavily, because a hard tree cannot express a document that belongs to two branches, and a topic model or soft clustering fits that case better.',
        featurization: [
          'L2-normalize embedding or TF-IDF rows before clustering, which makes cosine and Euclidean agree and permits Ward',
          'Remove boilerplate and near-duplicates first, or the tree’s lowest levels are dominated by templates',
          'Reduce very high-dimensional sparse vectors, or distances concentrate and every merge height looks alike',
        ],
        evaluation:
          'Human review of sampled clusters at the chosen cut, plus downstream task quality such as routing accuracy. Cophenetic correlation shows whether the tree preserves cosine distances; it does not show whether the topics are sensible.',
        pitfalls: [
          'Single linkage chaining unrelated topics together through a generic boilerplate document',
          'Running the full quadratic method on a corpus that needed a first-stage reduction',
          'Choosing the cut height by eye on one sample and not revalidating it when the corpus grows',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Entity resolution and account linking. Represent each account or record as a set of attributes — devices, addresses, phone numbers, name tokens — measure Jaccard distance between sets, and cut the tree at a distance threshold. Accounts that land in the same cluster plausibly belong to one actor. The linkage choice is a modelling decision here, and it is consequential: single linkage is transitive closure over the threshold graph, so any shared attribute links accounts; average or complete linkage requires the group to be mutually similar.',
        where: [
          'Linking duplicate or synthetic identities across applications before underwriting',
          'Grouping accounts that share devices and contact details into candidate fraud rings for investigation',
          'Merging customer records across systems where no reliable key exists',
        ],
        why: 'Jaccard over set-valued attributes has no mean, so k-means is not even defined, and a distance threshold is the natural stopping rule because the number of real-world entities is unknown. The characteristic failure is a shared hub attribute — a public IP address, a common last name — which under single linkage bridges unrelated entities into one enormous cluster. That is why complete or average linkage is usually the better default for linking. The cost is the usual one: the quadratic matrix means blocking, comparing only within candidate buckets, is mandatory beyond modest volumes.',
        featurization: [
          'Remove or down-weight high-frequency attributes such as shared IPs and common names, which carry no identifying information',
          'Block the data on a cheap key before computing pairwise distances, so the quadratic matrix is built per block rather than globally',
          'Use Jaccard or a weighted set similarity for set-valued attributes, never Euclidean distance on a one-hot encoding of them',
        ],
        evaluation:
          'Pairwise precision and recall of linked entities against confirmed matches, reported at several cut heights. Cluster-size distribution at the chosen threshold is a useful sanity check: one giant cluster means chaining.',
        pitfalls: [
          'Single linkage turning one shared hub attribute into a single enormous false cluster',
          'A global distance threshold applied across blocks with very different attribute density',
          'Treating a linked cluster as a confirmed ring when it is a candidate for review',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Dominated by the n-by-n dissimilarity matrix, not the merging. Illustrative arithmetic: a full float64 matrix is about 800 MB at 10,000 points and 20 GB at 50,000, so memory is the ceiling long before time is. With nearest-neighbour chain the merge phase is O(n^2), and building the matrix is O(n^2 d) — or far more for an expensive dissimilarity such as DTW, where computing the matrix, not clustering it, is the real bill.',
    inferenceProfile:
      'There is no inference. The tree describes the points it was built from and has no predict method. Placing a new point means recomputing, assigning it to the nearest cluster by the chosen linkage as an approximation, or — the usual pattern — fitting a classifier or storing centroids on the labels from a cut and serving that instead.',
    retrainingCadence:
      'Batch, offline, and as rarely as the application allows. The procedure is deterministic, so a refit on the same data reproduces the same tree, which is better than k-means; but a refit on changed data can change the tree substantially, especially under single linkage, where one new bridging point can merge two clusters and rewrite everything above them. Anything downstream keyed to a cluster must be remapped after a refit.',
    driftAndMonitoring: [
      'Track cophenetic correlation across refits; a fall means the tree distorts the dissimilarities more than it used to',
      'Watch the sorted top merge heights, since a collapse of the gap between them means the structure being cut no longer exists',
      'Monitor cluster-size distribution at the fixed cut height — one cluster absorbing most points is chaining, and it appears before downstream metrics move',
      'Compare partitions across refits with a set-overlap measure rather than by cluster id, which is arbitrary between runs',
    ],
    productionGotchas: [
      'Ward assumes Euclidean geometry and libraries cannot check it: handed a precomputed matrix of cosine or Jaccard distances, the tree comes back without complaint and the sum-of-squares criterion it claims to minimize does not exist',
      'The merge height has a convention that differs by library: the Lance-Williams recurrence on squared distances maintains twice the SSE increase, and scipy reports its square root, so heights from different tools are not comparable',
      'A tree built on a matrix that no longer fits in memory is not a configuration problem — the O(n^2) matrix is the algorithm, and the fix is a first-stage reduction or a sparse connectivity graph',
      'Chaining produces a dendrogram of depth close to n, and recursive traversal or plotting code that assumes balanced trees hits the recursion limit',
      'There is no predict: teams build a pipeline around the fit and discover afterward that a new record cannot be assigned without redoing the work',
    ],
  },

  assumptions: [
    'A dissimilarity exists that reflects the similarity that matters; it is the model, and no linkage repairs a poor one — for Ward that dissimilarity must be Euclidean',
    'Clusters are nested or at least that a hierarchy is a useful description, which is a weaker assumption than being blobs but not an empty one',
    'The linkage’s notion of cluster shape matches the data: compact for complete and Ward, connected for single, somewhere between for average',
    'The dataset fits an n-by-n matrix, or can be reduced to something that does, which is the binding constraint in practice',
    'Early merges are reliable, because they are irrevocable — noisy or heavily overlapping data violates this and the tree inherits the error at every level above it',
  ],

  pros: [
    {
      point: 'Needs only a dissimilarity, not a mean or coordinates',
      context:
        'Single, complete and average linkage accept cosine, Jaccard, DTW, edit distance, Gower, or any precomputed matrix. That opens problems where centroid methods are not merely worse but undefined, and it is the main reason to choose this over k-means.',
    },
    {
      point: 'The number of clusters is chosen after fitting',
      context:
        'One fit gives every flat clustering from one cluster to n, and the cut can be a K or a height. That removes the guess k-means requires and lets different consumers read the same tree at different granularities.',
    },
    {
      point: 'Deterministic, with no initialization or restarts',
      context:
        'The same dissimilarity matrix always yields the same tree, up to tie-breaking. That makes results reproducible and debuggable in a way a stochastic method is not, and removes a whole class of tuning.',
    },
    {
      point: 'The dendrogram is an explanation, not just a label',
      context:
        'It shows which groups are siblings and how far apart they are, so an analyst can see why two items were grouped. Useful for taxonomies, exploration and review; irrelevant when only a flat label feeds a downstream system.',
    },
  ],

  cons: [
    {
      point: 'Quadratic memory is a hard ceiling',
      context:
        'The n-by-n matrix limits the method to roughly tens of thousands of points, and a more expensive dissimilarity such as DTW lowers that further. This decides most hierarchical-versus-k-means arguments before cluster quality is discussed.',
    },
    {
      point: 'Merges are greedy and irrevocable',
      context:
        'An early mistake caused by noise is carried into every level above it, and nothing in the procedure revisits it. Ward is a greedy approximation to the k-means objective, so a K-cut of the tree is generally worse in SSE than k-means on the same data.',
    },
    {
      point: 'The linkage choice changes the answer fundamentally',
      context:
        'Single chains, complete splits large clusters, Ward prefers balanced spherical ones, and on the same data they can disagree completely. There is no neutral default, so the choice has to be argued from the shape of the clusters expected.',
    },
    {
      point: 'No way to place a new point',
      context:
        'The tree exists only for the points it was fitted on. Teams routinely discover this after building a pipeline around it, and the standard workaround is to train a classifier or store centroids from a cut, which is a different model.',
    },
  ],

  relatedSlugs: [
    'k-means',
    'dbscan',
    'spectral-clustering',
    'affinity-propagation',
    'gaussian-mixture',
    'association-rules',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Agglomerative clustering - merge the closest pair, update, repeat. Transcribed.

Every point starts as its own cluster. Find the two closest clusters, merge
them, work out the distance from the new cluster to every other cluster with
the Lance-Williams formula, and record the merge. After n - 1 merges one
cluster remains, and the list of merges IS the dendrogram.

The algorithm takes a DISSIMILARITY MATRIX, not points. That is the main
advantage over k-means: single, complete and average linkage accept any
dissimilarity - cosine, Jaccard, a DTW matrix - because no cluster mean is ever
formed. Ward is the exception: it needs squared Euclidean distances.
"""

import math


def euclidean_matrix(X, squared):
    """Pairwise Euclidean distances. Ward needs them SQUARED; the rest do not."""
    n = len(X)
    D = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            total = 0.0
            for k in range(len(X[i])):
                difference = X[i][k] - X[j][k]
                total += difference * difference
            D[i][j] = total if squared else math.sqrt(total)
            D[j][i] = D[i][j]

    return D


def lance_williams(linkage, d_ki, d_kj, d_ij, n_i, n_j, n_k):
    """Distance from cluster k to the merge of i and j, from old distances only.

    d(k, i+j) = a_i d(k,i) + a_j d(k,j) + b d(i,j) + g |d(k,i) - d(k,j)|

    One formula, four sets of coefficients. The coefficients ARE the linkage.
    """
    if linkage == "single":      # a = 1/2, b = 0, g = -1/2: this is min
        return 0.5 * d_ki + 0.5 * d_kj - 0.5 * abs(d_ki - d_kj)
    if linkage == "complete":    # g = +1/2: this is max
        return 0.5 * d_ki + 0.5 * d_kj + 0.5 * abs(d_ki - d_kj)
    if linkage == "average":     # size-weighted mean of the two distances
        return (n_i * d_ki + n_j * d_kj) / (n_i + n_j)
    if linkage == "ward":        # valid ONLY on squared Euclidean distances
        total = n_i + n_j + n_k
        return ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / total
    raise ValueError(f"unknown linkage: {linkage}")


def fit(D, linkage="ward"):
    """Returns merges as (left_id, right_id, height, size), in merge order.

    Ids below n are original points; the cluster formed at step s gets id n + s.
    """
    n = len(D)
    D = [list(row) for row in D]       # work on a copy
    size = [1] * n
    label = list(range(n))
    alive = [True] * n
    merges = []

    for step in range(n - 1):
        # ---- find the closest pair of live clusters: the O(n^2) scan ------
        best = None
        for i in range(n):
            if not alive[i]:
                continue
            for j in range(i + 1, n):
                if not alive[j]:
                    continue
                if best is None or D[i][j] < best[0]:
                    best = (D[i][j], i, j)

        height, i, j = best

        # ---- update every other cluster's distance to the merged one -----
        for k in range(n):
            if not alive[k] or k == i or k == j:
                continue
            updated = lance_williams(
                linkage, D[k][i], D[k][j], D[i][j], size[i], size[j], size[k]
            )
            D[k][i] = updated
            D[i][k] = updated

        merges.append((label[i], label[j], height, size[i] + size[j]))
        size[i] += size[j]
        alive[j] = False
        label[i] = n + step

    return merges


def cut(merges, n, n_clusters):
    """Flat labels from the first n - n_clusters merges."""
    members = {point: [point] for point in range(n)}
    for step in range(n - n_clusters):
        left, right, _, _ = merges[step]
        members[n + step] = members.pop(left) + members.pop(right)

    labels = [0] * n
    for cluster, points in enumerate(members.values()):
        for point in points:
            labels[point] = cluster
    return labels`,
        profile: 'O(n^3) time — every one of the n-1 merges rescans an O(n^2) matrix for the minimum — and O(n^2) memory, over lists of lists.',
      },
      'make-it-right': {
        code: `"""Hierarchical clustering - typed, nearest-neighbour chain, Ward kept honest."""

from dataclasses import dataclass
from enum import Enum

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]


class Linkage(str, Enum):
    SINGLE = "single"
    COMPLETE = "complete"
    AVERAGE = "average"
    WARD = "ward"


@dataclass(frozen=True)
class Dendrogram:
    """n - 1 merges as rows of [left_id, right_id, height, size].

    Ids below n_points are original points; id n_points + s is the cluster
    formed at step s. Rows are sorted by height, so a cut at a height is a
    prefix of the merges.
    """

    merges: Matrix
    n_points: int

    def cut_into(self, n_clusters: int) -> Labels:
        if not 1 <= n_clusters <= self.n_points:
            raise ValueError(f"n_clusters must lie in [1, {self.n_points}], got {n_clusters}")
        return self._replay(self.n_points - n_clusters)

    def cut_at(self, height: float) -> Labels:
        if not np.isfinite(height) or height < 0.0:
            raise ValueError(f"height must be finite and non-negative, got {height}")
        steps = int(np.searchsorted(self.merges[:, 2], height, side="right"))
        return self._replay(steps)

    def cophenetic_correlation(self, dissimilarity: Matrix) -> float:
        """Correlation between the original dissimilarities and the heights at
        which each pair first joins - how faithfully the tree keeps the
        geometry. Compare against the SAME dissimilarity the tree was built from."""
        n = self.n_points
        cophenetic = np.zeros((n, n))
        members = {point: np.array([point]) for point in range(n)}

        for step, (left, right, height, _) in enumerate(self.merges):
            first = members.pop(int(left))
            second = members.pop(int(right))
            cophenetic[np.ix_(first, second)] = height
            cophenetic[np.ix_(second, first)] = height
            members[n + step] = np.concatenate((first, second))

        upper = np.triu_indices(n, k=1)
        return float(np.corrcoef(dissimilarity[upper], cophenetic[upper])[0, 1])

    def _replay(self, steps: int) -> Labels:
        parent = np.arange(self.n_points + len(self.merges))
        for step in range(steps):
            parent[int(self.merges[step, 0])] = self.n_points + step
            parent[int(self.merges[step, 1])] = self.n_points + step

        roots = np.empty(self.n_points, dtype=np.int64)
        for point in range(self.n_points):
            node = point
            while parent[node] != node:
                node = parent[node]
            roots[point] = node

        _, labels = np.unique(roots, return_inverse=True)
        return labels.astype(np.int64)


def _lance_williams(
    linkage: Linkage,
    d_ki: Matrix,
    d_kj: Matrix,
    d_ij: float,
    n_i: float,
    n_j: float,
    n_k: Matrix,
) -> Matrix:
    """Vectorized over every other cluster k at once.

    With the coefficients substituted, single and complete collapse to min and
    max, so the absolute-value term never has to be evaluated.
    """
    if linkage is Linkage.SINGLE:
        return np.minimum(d_ki, d_kj)
    if linkage is Linkage.COMPLETE:
        return np.maximum(d_ki, d_kj)
    if linkage is Linkage.AVERAGE:
        return (n_i * d_ki + n_j * d_kj) / (n_i + n_j)
    total = n_i + n_j + n_k
    return ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / total


def _nearest_neighbour_chain(
    D: Matrix, linkage: Linkage
) -> list[tuple[int, int, float]]:
    """O(n^2) agglomeration, valid because every supported linkage is reducible:
    merging two clusters never brings the result closer to a third than either
    parent was, so mutual nearest neighbours can be merged in ANY order and the
    merges sorted by height afterwards."""
    n = D.shape[0]
    D = D.copy()                               # the caller's matrix is not ours to destroy
    np.fill_diagonal(D, np.inf)
    sizes = np.ones(n)
    active = np.ones(n, dtype=bool)
    chain: list[int] = []
    raw: list[tuple[int, int, float]] = []

    while len(raw) < n - 1:
        if not chain:
            chain.append(int(np.flatnonzero(active)[0]))

        while True:
            tail = chain[-1]
            nearest = int(np.argmin(D[tail]))
            if len(chain) > 1:
                previous = chain[-2]
                if D[tail, previous] <= D[tail, nearest]:   # ties go backward: terminates
                    nearest = previous
                if nearest == previous:
                    break
            chain.append(nearest)

        b = chain.pop()
        a = chain.pop()
        height = float(D[a, b])

        others = np.flatnonzero(active)
        others = others[(others != a) & (others != b)]
        updated = _lance_williams(
            linkage, D[others, a], D[others, b], height, sizes[a], sizes[b], sizes[others]
        )
        D[others, a] = updated
        D[a, others] = updated
        D[b, :] = np.inf
        D[:, b] = np.inf

        sizes[a] += sizes[b]
        active[b] = False
        raw.append((a, b, height))

    return raw


def _relabel(raw: list[tuple[int, int, float]], n: int, take_root: bool) -> Matrix:
    """Sort merges by height and rewrite slot indices as dendrogram ids."""
    order = sorted(range(len(raw)), key=lambda step: raw[step][2])    # stable
    parent = list(range(n))
    cluster_id = list(range(n))
    size = [1] * n
    merges = np.empty((n - 1, 4))

    def find(slot: int) -> int:
        while parent[slot] != slot:
            parent[slot] = parent[parent[slot]]
            slot = parent[slot]
        return slot

    for step, index in enumerate(order):
        slot_a, slot_b, height = raw[index]
        root_a, root_b = find(slot_a), find(slot_b)
        left, right = sorted((cluster_id[root_a], cluster_id[root_b]))
        merges[step] = (left, right, np.sqrt(height) if take_root else height,
                        size[root_a] + size[root_b])
        parent[root_b] = root_a
        size[root_a] += size[root_b]
        cluster_id[root_a] = n + step

    return merges


def linkage_from_points(X: Matrix, linkage: Linkage = Linkage.WARD) -> Dendrogram:
    """Euclidean geometry is available, so every linkage is legitimate."""
    if X.ndim != 2 or X.shape[0] < 2:
        raise ValueError(f"X must be 2-D with at least 2 rows, got shape {X.shape}")

    difference = X[:, None, :] - X[None, :, :]
    squared = (difference * difference).sum(axis=2)

    if linkage is Linkage.WARD:
        # Lance-Williams for Ward is exact on SQUARED distances, where it
        # maintains twice the increase in SSE; the root is the usual height.
        raw = _nearest_neighbour_chain(squared, linkage)
        return Dendrogram(_relabel(raw, X.shape[0], take_root=True), X.shape[0])

    raw = _nearest_neighbour_chain(np.sqrt(squared), linkage)
    return Dendrogram(_relabel(raw, X.shape[0], take_root=False), X.shape[0])


def linkage_from_dissimilarity(D: Matrix, linkage: Linkage = Linkage.AVERAGE) -> Dendrogram:
    """Any dissimilarity: cosine, Jaccard, DTW, edit distance. NOT Ward."""
    if linkage is Linkage.WARD:
        raise ValueError(
            "ward minimises a sum of squares around cluster means, which exists "
            "only in Euclidean space; use linkage_from_points, or choose single, "
            "complete or average for a general dissimilarity"
        )
    if D.ndim != 2 or D.shape[0] != D.shape[1] or D.shape[0] < 2:
        raise ValueError(f"D must be square with at least 2 rows, got shape {D.shape}")
    if not np.isfinite(D).all() or (D < 0.0).any():
        raise ValueError("D must be finite and non-negative")
    if not np.allclose(D, D.T):
        raise ValueError("D must be symmetric")

    raw = _nearest_neighbour_chain(D, linkage)
    return Dendrogram(_relabel(raw, D.shape[0], take_root=False), D.shape[0])`,
        rationale:
          'Three changes, and the first is the one that changes the complexity class. The full-matrix scan on every merge, which made the previous stage O(n^3), becomes the nearest-neighbour chain: follow nearest neighbours until two clusters point at each other, merge them, and carry on. That is valid only because single, complete, average and Ward are reducible, so merges can be found out of order and sorted by height afterwards. Second, the Lance-Williams update is vectorized across all other clusters, with single and complete collapsing to min and max. Third, Ward is moved behind an explicit boundary: a precomputed dissimilarity cannot carry Euclidean geometry, so linkage_from_dissimilarity raises on Ward and linkage_from_points computes the squared distances itself. The result is a frozen dataclass that can cut by K or by height and report its own cophenetic correlation.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n^2) time in the chain, but the broadcast difference materializes an (n, n, d) intermediate — which is the memory ceiling, not the arithmetic.',
      },
      'make-it-fast': {
        code: `"""Hierarchical clustering - GEMM distances, in-place nearest-neighbour chain."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]


def pairwise_distances(X: Matrix, squared: bool) -> Matrix:
    """Distances written straight into ONE preallocated n-by-n buffer.

    ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: only the cross term touches both
    operands, and it is a GEMM. The broadcast form it replaces materializes an
    (n, n, d) array - at 10,000 points and 50 features that is 40 GB before the
    algorithm has started.
    """
    design = np.ascontiguousarray(X, dtype=np.float64)
    n = design.shape[0]
    norms = np.einsum("ij,ij->i", design, design)

    D = np.empty((n, n), dtype=np.float64)
    np.dot(design, design.T, out=D)             # GEMM directly into D
    D *= -2.0
    D += norms[:, None]
    D += norms[None, :]
    np.maximum(D, 0.0, out=D)                   # cancellation can go slightly negative
    if not squared:
        np.sqrt(D, out=D)
    np.fill_diagonal(D, np.inf)
    return D


def nearest_neighbour_chain(D: Matrix, linkage: str) -> Matrix:
    """Consumes D in place. Returns raw merges as rows of [slot_a, slot_b, height].

    Retired clusters are marked by +inf rows and columns rather than removed, so
    D never changes shape, the row update runs over the full row with no index
    arrays, and an argmin can never pick a dead cluster.
    """
    n = D.shape[0]
    sizes = np.ones(n)
    active = np.ones(n, dtype=bool)
    scratch = np.empty(n)
    scratch_b = np.empty(n)
    raw = np.empty((n - 1, 3))
    chain = np.empty(n, dtype=np.int64)
    depth = 0
    first_active = 0

    for step in range(n - 1):
        if depth == 0:
            while not active[first_active]:
                first_active += 1
            chain[0] = first_active
            depth = 1

        while True:
            tail = chain[depth - 1]
            nearest = int(D[tail].argmin())
            if depth > 1:
                previous = int(chain[depth - 2])
                if D[tail, previous] <= D[tail, nearest]:
                    nearest = previous
                if nearest == previous:
                    break
            chain[depth] = nearest
            depth += 1

        b = int(chain[depth - 1])
        a = int(chain[depth - 2])
        depth -= 2
        n_a, n_b, d_ab = sizes[a], sizes[b], float(D[a, b])

        row_a, row_b = D[a], D[b]
        if linkage == "single":
            np.minimum(row_a, row_b, out=row_a)
        elif linkage == "complete":
            np.maximum(row_a, row_b, out=row_a)
        elif linkage == "average":
            row_a *= n_a
            np.multiply(row_b, n_b, out=scratch)
            row_a += scratch
            row_a /= n_a + n_b
        else:
            # Ward: ((n_a + n_k) d_ak + (n_b + n_k) d_bk - n_k d_ab) / (n_a + n_b + n_k)
            np.add(sizes, n_a, out=scratch)
            scratch *= row_a
            np.add(sizes, n_b, out=scratch_b)
            scratch_b *= row_b
            scratch += scratch_b
            np.multiply(sizes, d_ab, out=scratch_b)
            scratch -= scratch_b
            np.add(sizes, n_a + n_b, out=scratch_b)
            np.divide(scratch, scratch_b, out=row_a)

        D[:, a] = row_a                          # keep the matrix symmetric
        D[b, :] = np.inf
        D[:, b] = np.inf
        D[a, a] = np.inf

        sizes[a] = n_a + n_b
        active[b] = False
        raw[step] = (a, b, d_ab)

    # Sorting by height and relabelling slots as dendrogram ids is unchanged from
    # the previous stage: O(n log n), nowhere near the hot path.
    return raw`,
        rationale:
          'The previous stage’s broadcast difference materializes an (n, n, d) array, which is the real memory ceiling, so distances become a GEMM written directly into the one n-by-n buffer the algorithm needs anyway. Inside the chain, the Lance-Williams update is performed in place on row views with two preallocated scratch vectors, and retired clusters are marked with infinity instead of being indexed out, which removes the per-merge index arrays and temporaries. The algorithm and its O(n^2) memory are unchanged — this stage buys a constant factor and a smaller peak, not a different complexity class. Past a few tens of thousands of points the right move is not faster dense code but a first-stage reduction or a sparse connectivity graph.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The cross term of every pairwise distance is one GEMM that writes directly into the output, and the row norms are einsum reductions computed once rather than per pair.',
            tradeoff: 'The squared-norm expansion loses precision through cancellation, so two nearly-equidistant pairs can be misranked — which changes the merge order, and under single linkage which edges end up in the spanning tree, not merely a distance value.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The distance matrix, two scratch vectors and the chain are allocated once for the whole fit, and every Lance-Williams update runs in place on a row view instead of allocating temporaries per merge.',
            tradeoff: 'The scratch buffers and the matrix are shared across merges, so the function is not reentrant and it destroys its input; a reordered in-place line corrupts the tree silently rather than failing.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'Single and complete linkage reduce to one np.minimum or np.maximum with an output argument, and Ward’s update is assembled in two scratch buffers rather than five temporaries.',
            tradeoff: 'The Ward expression is far less readable than the formula it implements, and the order of the in-place steps matters — each one overwrites a buffer a later one needs.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n^2 d) distances in BLAS and an O(n^2) in-place chain, with one n-by-n buffer and no (n, n, d) intermediate. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Agglomerative clustering - merge the closest pair, update, repeat. Transcribed.
//
// Takes a DISSIMILARITY MATRIX, not points: single, complete and average linkage
// accept any dissimilarity (cosine, Jaccard, DTW) because no cluster mean is
// ever formed. Ward is the exception - it needs squared Euclidean distances.
#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <vector>

enum class Linkage { kSingle, kComplete, kAverage, kWard };

struct Merge {
  std::size_t left;    // ids below n are points; the cluster formed at step s has id n + s
  std::size_t right;
  double height;
  std::size_t size;
};

std::vector<std::vector<double>> EuclideanMatrix(const std::vector<std::vector<double>>& X,
                                                 bool squared) {
  const std::size_t n = X.size();
  std::vector<std::vector<double>> D(n, std::vector<double>(n, 0.0));

  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = i + 1; j < n; ++j) {
      double total = 0.0;
      for (std::size_t k = 0; k < X[i].size(); ++k) {
        const double difference = X[i][k] - X[j][k];
        total += difference * difference;
      }
      D[i][j] = squared ? total : std::sqrt(total);
      D[j][i] = D[i][j];
    }
  }
  return D;
}

// d(k, i+j) = a_i d(k,i) + a_j d(k,j) + b d(i,j) + g |d(k,i) - d(k,j)|
// One formula, four sets of coefficients. The coefficients ARE the linkage.
double LanceWilliams(Linkage linkage, double d_ki, double d_kj, double d_ij,
                     double n_i, double n_j, double n_k) {
  switch (linkage) {
    case Linkage::kSingle:    // a = 1/2, b = 0, g = -1/2: this is min
      return 0.5 * d_ki + 0.5 * d_kj - 0.5 * std::abs(d_ki - d_kj);
    case Linkage::kComplete:  // g = +1/2: this is max
      return 0.5 * d_ki + 0.5 * d_kj + 0.5 * std::abs(d_ki - d_kj);
    case Linkage::kAverage:   // size-weighted mean of the two distances
      return (n_i * d_ki + n_j * d_kj) / (n_i + n_j);
    case Linkage::kWard: {    // valid ONLY on squared Euclidean distances
      const double total = n_i + n_j + n_k;
      return ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / total;
    }
  }
  throw std::invalid_argument("unknown linkage");
}

std::vector<Merge> Fit(std::vector<std::vector<double>> D, Linkage linkage) {
  const std::size_t n = D.size();
  std::vector<std::size_t> size(n, 1);
  std::vector<std::size_t> label(n);
  for (std::size_t i = 0; i < n; ++i) label[i] = i;
  std::vector<bool> alive(n, true);
  std::vector<Merge> merges;

  for (std::size_t step = 0; step + 1 < n; ++step) {
    // ---- find the closest pair of live clusters: the O(n^2) scan ---------
    bool found = false;
    double best = 0.0;
    std::size_t best_i = 0;
    std::size_t best_j = 0;
    for (std::size_t i = 0; i < n; ++i) {
      if (!alive[i]) continue;
      for (std::size_t j = i + 1; j < n; ++j) {
        if (!alive[j]) continue;
        if (!found || D[i][j] < best) {
          found = true;
          best = D[i][j];
          best_i = i;
          best_j = j;
        }
      }
    }

    // ---- update every other cluster's distance to the merged one ---------
    for (std::size_t k = 0; k < n; ++k) {
      if (!alive[k] || k == best_i || k == best_j) continue;
      const double updated =
          LanceWilliams(linkage, D[k][best_i], D[k][best_j], D[best_i][best_j],
                        static_cast<double>(size[best_i]), static_cast<double>(size[best_j]),
                        static_cast<double>(size[k]));
      D[k][best_i] = updated;
      D[best_i][k] = updated;
    }

    merges.push_back({label[best_i], label[best_j], best, size[best_i] + size[best_j]});
    size[best_i] += size[best_j];
    alive[best_j] = false;
    label[best_i] = n + step;
  }
  return merges;
}`,
        profile: 'O(n^3) time — every merge rescans an O(n^2) matrix for the minimum — and O(n^2) memory, over nested vectors that scatter every row.',
      },
      'make-it-right': {
        code: `// Hierarchical clustering - flat buffer, nearest-neighbour chain, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

enum class Linkage { kSingle, kComplete, kAverage, kWard };

struct Merge {
  std::size_t left;   // ids below n are points; the cluster formed at step s has id n + s
  std::size_t right;
  double height;
  std::size_t size;
};

namespace {

constexpr double kInfinity = std::numeric_limits<double>::infinity();
constexpr std::size_t kUnassigned = std::numeric_limits<std::size_t>::max();

struct RawMerge {
  std::size_t slot_a;
  std::size_t slot_b;
  double height;
};

// Lance-Williams for ONE other cluster k. With the coefficients substituted,
// single and complete collapse to min and max.
double Update(Linkage linkage, double d_ki, double d_kj, double d_ij, double n_i, double n_j,
              double n_k) {
  switch (linkage) {
    case Linkage::kSingle:
      return std::min(d_ki, d_kj);
    case Linkage::kComplete:
      return std::max(d_ki, d_kj);
    case Linkage::kAverage:
      return (n_i * d_ki + n_j * d_kj) / (n_i + n_j);
    case Linkage::kWard:
      return ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / (n_i + n_j + n_k);
  }
  throw std::invalid_argument("unknown linkage");
}

// O(n^2) agglomeration on a flat row-major matrix with +inf on the diagonal.
// Valid because every supported linkage is reducible: merging two clusters
// never brings the result closer to a third than either parent was, so mutual
// nearest neighbours can be merged in ANY order and sorted by height afterward.
std::vector<RawMerge> NearestNeighbourChain(std::vector<double>& d, std::size_t n,
                                            Linkage linkage) {
  std::vector<double> sizes(n, 1.0);
  std::vector<bool> active(n, true);
  std::vector<std::size_t> chain;
  chain.reserve(n);
  std::vector<RawMerge> raw;
  raw.reserve(n - 1);
  std::size_t first_active = 0;

  while (raw.size() + 1 < n) {
    if (chain.empty()) {
      while (!active[first_active]) ++first_active;
      chain.push_back(first_active);
    }

    for (;;) {
      const double* row = d.data() + chain.back() * n;
      std::size_t nearest = static_cast<std::size_t>(std::min_element(row, row + n) - row);
      if (chain.size() > 1) {
        const std::size_t previous = chain[chain.size() - 2];
        if (row[previous] <= row[nearest]) nearest = previous;   // ties go backward: terminates
        if (nearest == previous) break;
      }
      chain.push_back(nearest);
    }

    const std::size_t b = chain.back();
    chain.pop_back();
    const std::size_t a = chain.back();
    chain.pop_back();
    const double height = d[a * n + b];

    for (std::size_t k = 0; k < n; ++k) {
      if (!active[k] || k == a || k == b) continue;
      const double updated =
          Update(linkage, d[k * n + a], d[k * n + b], height, sizes[a], sizes[b], sizes[k]);
      d[k * n + a] = updated;
      d[a * n + k] = updated;
    }
    for (std::size_t k = 0; k < n; ++k) {
      d[b * n + k] = kInfinity;
      d[k * n + b] = kInfinity;
    }

    sizes[a] += sizes[b];
    active[b] = false;
    raw.push_back({a, b, height});
  }
  return raw;
}

// Sort merges by height and rewrite slot indices as dendrogram ids.
std::vector<Merge> Relabel(std::vector<RawMerge> raw, std::size_t n, bool take_root) {
  std::stable_sort(raw.begin(), raw.end(),
                   [](const RawMerge& x, const RawMerge& y) { return x.height < y.height; });

  std::vector<std::size_t> parent(n);
  std::iota(parent.begin(), parent.end(), 0);
  std::vector<std::size_t> cluster_id(parent);
  std::vector<std::size_t> size(n, 1);

  const auto find = [&parent](std::size_t slot) {
    while (parent[slot] != slot) {
      parent[slot] = parent[parent[slot]];
      slot = parent[slot];
    }
    return slot;
  };

  std::vector<Merge> merges;
  merges.reserve(raw.size());
  for (std::size_t step = 0; step < raw.size(); ++step) {
    const std::size_t root_a = find(raw[step].slot_a);
    const std::size_t root_b = find(raw[step].slot_b);
    const std::size_t left = std::min(cluster_id[root_a], cluster_id[root_b]);
    const std::size_t right = std::max(cluster_id[root_a], cluster_id[root_b]);
    merges.push_back({left, right, take_root ? std::sqrt(raw[step].height) : raw[step].height,
                      size[root_a] + size[root_b]});
    parent[root_b] = root_a;
    size[root_a] += size[root_b];
    cluster_id[root_a] = n + step;
  }
  return merges;
}

}  // namespace

class Dendrogram {
 public:
  // x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d). Euclidean
  // geometry is available, so every linkage - Ward included - is legitimate.
  [[nodiscard]] static Dendrogram FromPoints(std::span<const double> x_flat,
                                             std::size_t dimension, Linkage linkage) {
    if (dimension == 0 || x_flat.empty()) throw std::invalid_argument("empty problem");
    if (x_flat.size() % dimension != 0) {
      throw std::invalid_argument("X is not a multiple of the dimension");
    }
    const std::size_t n = x_flat.size() / dimension;
    if (n < 2) throw std::invalid_argument("need at least two points");

    // Ward is exact on SQUARED distances, where the recurrence maintains twice
    // the increase in SSE; every other linkage works on plain distances.
    const bool is_ward = linkage == Linkage::kWard;
    std::vector<double> d(n * n, kInfinity);
    for (std::size_t i = 0; i < n; ++i) {
      const double* a = x_flat.data() + i * dimension;
      for (std::size_t j = 0; j < i; ++j) {
        const double* b = x_flat.data() + j * dimension;
        double total = 0.0;
        for (std::size_t m = 0; m < dimension; ++m) {
          const double difference = a[m] - b[m];
          total += difference * difference;
        }
        d[i * n + j] = is_ward ? total : std::sqrt(total);
        d[j * n + i] = d[i * n + j];
      }
    }
    return Dendrogram(Relabel(NearestNeighbourChain(d, n, linkage), n, is_ward), n);
  }

  // Any dissimilarity: cosine, Jaccard, DTW, edit distance. NOT Ward.
  [[nodiscard]] static Dendrogram FromDissimilarity(std::span<const double> d_flat,
                                                    std::size_t n, Linkage linkage) {
    if (linkage == Linkage::kWard) {
      throw std::invalid_argument(
          "ward minimises a sum of squares around cluster means, which exists only in "
          "Euclidean space; use FromPoints, or choose single, complete or average");
    }
    if (n < 2) throw std::invalid_argument("need at least two points");
    if (d_flat.size() != n * n) throw std::invalid_argument("matrix is not n by n");

    std::vector<double> d(d_flat.begin(), d_flat.end());
    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t j = 0; j < n; ++j) {
        const double value = d[i * n + j];
        if (!std::isfinite(value) || value < 0.0) {
          throw std::invalid_argument("dissimilarity must be finite and non-negative");
        }
        if (value != d[j * n + i]) throw std::invalid_argument("dissimilarity must be symmetric");
      }
      d[i * n + i] = kInfinity;
    }
    return Dendrogram(Relabel(NearestNeighbourChain(d, n, linkage), n, false), n);
  }

  [[nodiscard]] std::span<const Merge> merges() const noexcept { return merges_; }
  [[nodiscard]] std::size_t n_points() const noexcept { return n_points_; }

  [[nodiscard]] std::vector<std::size_t> CutInto(std::size_t n_clusters) const {
    if (n_clusters == 0 || n_clusters > n_points_) {
      throw std::invalid_argument("n_clusters must lie in [1, n]");
    }
    return Replay(n_points_ - n_clusters);
  }

  [[nodiscard]] std::vector<std::size_t> CutAt(double height) const {
    if (!std::isfinite(height) || height < 0.0) {
      throw std::invalid_argument("height must be finite and non-negative");
    }
    const auto stop = std::upper_bound(
        merges_.begin(), merges_.end(), height,
        [](double limit, const Merge& merge) { return limit < merge.height; });
    return Replay(static_cast<std::size_t>(stop - merges_.begin()));
  }

 private:
  Dendrogram(std::vector<Merge> merges, std::size_t n_points)
      : merges_(std::move(merges)), n_points_(n_points) {}

  [[nodiscard]] std::vector<std::size_t> Replay(std::size_t steps) const {
    std::vector<std::size_t> parent(n_points_ + merges_.size());
    std::iota(parent.begin(), parent.end(), 0);
    for (std::size_t step = 0; step < steps; ++step) {
      parent[merges_[step].left] = n_points_ + step;
      parent[merges_[step].right] = n_points_ + step;
    }

    std::vector<std::size_t> compact(parent.size(), kUnassigned);
    std::vector<std::size_t> labels(n_points_);
    std::size_t next_label = 0;
    for (std::size_t point = 0; point < n_points_; ++point) {
      std::size_t node = point;
      while (parent[node] != node) node = parent[node];
      if (compact[node] == kUnassigned) compact[node] = next_label++;
      labels[point] = compact[node];
    }
    return labels;
  }

  std::vector<Merge> merges_;
  std::size_t n_points_;
};`,
        rationale:
          'The nested vectors become one flat row-major buffer, and the O(n^3) rescan of the previous stage becomes the nearest-neighbour chain, which is O(n^2) because every supported linkage is reducible: merges can be found out of order and sorted by height afterward. Ward moves behind the type boundary — the point constructor computes squared Euclidean distances itself, and the dissimilarity constructor throws on Ward with a message naming the reason, because a precomputed matrix cannot carry Euclidean geometry. All validation happens in the factories before the chain allocates anything, and the private constructor means a Dendrogram can only exist in a valid state, so the class needs no destructor or special members.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n^2) time and one dense n-by-n buffer, with the distance build still a scalar triple loop.',
      },
      'make-it-fast': {
        code: `// Hierarchical clustering - Eigen GEMM distances, fused row updates, OpenMP finishing pass.
#include <Eigen/Dense>
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

enum class Linkage { kSingle, kComplete, kAverage, kWard };

struct RawMerge {
  std::size_t slot_a;
  std::size_t slot_b;
  double height;
};

constexpr double kInfinity = std::numeric_limits<double>::infinity();

// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: the only pairwise term is a GEMM.
// Replaces n^2 distance computations, each walking d elements.
RowMajorMatrix PairwiseDistances(const RowMajorMatrix& X, bool squared) {
  const Eigen::VectorXd norms = X.rowwise().squaredNorm();
  RowMajorMatrix D = X * X.transpose();      // one GEMM
  D *= -2.0;
  D.colwise() += norms;
  D.rowwise() += norms.transpose();

  // Rows are independent, so the clamp-and-root pass fans out across cores.
  const Eigen::Index n = D.rows();
#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    if (squared) {
      D.row(i) = D.row(i).cwiseMax(0.0);
    } else {
      D.row(i) = D.row(i).cwiseMax(0.0).cwiseSqrt();
    }
    D(i, i) = kInfinity;
  }
  return D;
}

// Consumes D. Retired clusters are marked by +inf rows and columns instead of
// being removed, so D never changes shape and the row update below runs over the
// whole row with no index arrays.
std::vector<RawMerge> NearestNeighbourChain(RowMajorMatrix& D, Linkage linkage) {
  const Eigen::Index n = D.rows();
  if (n < 2) throw std::invalid_argument("need at least two points");

  Eigen::RowVectorXd sizes = Eigen::RowVectorXd::Ones(n);
  Eigen::VectorXd mirrored(n);
  std::vector<char> active(static_cast<std::size_t>(n), 1);
  std::vector<Eigen::Index> chain;
  chain.reserve(static_cast<std::size_t>(n));
  std::vector<RawMerge> raw;
  raw.reserve(static_cast<std::size_t>(n - 1));
  Eigen::Index first_active = 0;

  while (raw.size() + 1 < static_cast<std::size_t>(n)) {
    if (chain.empty()) {
      while (active[static_cast<std::size_t>(first_active)] == 0) ++first_active;
      chain.push_back(first_active);
    }

    for (;;) {
      const Eigen::Index tail = chain.back();
      Eigen::Index nearest = 0;
      D.row(tail).minCoeff(&nearest);
      if (chain.size() > 1) {
        const Eigen::Index previous = chain[chain.size() - 2];
        if (D(tail, previous) <= D(tail, nearest)) nearest = previous;
        if (nearest == previous) break;
      }
      chain.push_back(nearest);
    }

    const Eigen::Index b = chain.back();
    chain.pop_back();
    const Eigen::Index a = chain.back();
    chain.pop_back();
    const double n_a = sizes[a];
    const double n_b = sizes[b];
    const double d_ab = D(a, b);

    // The Lance-Williams update is ONE expression over the whole row. Eigen
    // evaluates it in a single pass with no intermediate vectors.
    auto row_a = D.row(a);
    const auto row_b = D.row(b);
    switch (linkage) {
      case Linkage::kSingle:
        row_a = row_a.cwiseMin(row_b);
        break;
      case Linkage::kComplete:
        row_a = row_a.cwiseMax(row_b);
        break;
      case Linkage::kAverage:
        row_a = (n_a * row_a + n_b * row_b) / (n_a + n_b);
        break;
      case Linkage::kWard:
        row_a.array() = ((sizes.array() + n_a) * row_a.array() +
                         (sizes.array() + n_b) * row_b.array() - sizes.array() * d_ab) /
                        (sizes.array() + (n_a + n_b));
        break;
    }

    // Copy through a scratch vector: reading row a while writing column a of the
    // same matrix is an aliasing hazard Eigen cannot resolve for you.
    mirrored = row_a.transpose();
    D.col(a) = mirrored;
    D.row(b).setConstant(kInfinity);
    D.col(b).setConstant(kInfinity);
    D(a, a) = kInfinity;

    sizes[a] = n_a + n_b;
    active[static_cast<std::size_t>(b)] = 0;
    raw.push_back({static_cast<std::size_t>(a), static_cast<std::size_t>(b), d_ab});
  }

  // Sorting by height and relabelling slots as dendrogram ids is unchanged from
  // the previous stage: O(n log n), nowhere near the hot path.
  return raw;
}`,
        rationale:
          'The distance build, which was a scalar triple loop, becomes one GEMM through the squared-norm expansion, with a parallel finishing pass because each row clamps and roots independently. Inside the chain, the per-cluster loop and per-element switch of the previous stage are replaced by one Eigen expression per linkage evaluated over the whole row, with retired clusters held at infinity so no index arrays are needed. OpenMP is deliberately not applied to the chain itself: each step is a sequential dependency over one row, and a memory-bound scan of a single row gains nothing from threads. The O(n^2) memory is unchanged — only the constant factor moves.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The pairwise cross term for every point pair is one blocked GEMM, replacing O(n^2 d) hand-written inner loops that each re-read both vectors.',
            tradeoff: 'The squared-norm expansion suffers cancellation, so near-ties can be misranked and the merge order changes with them; and the full n-by-n matrix must be resident, which is the ceiling this method cannot escape.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The Lance-Williams update for every other cluster is a single expression evaluated in one pass over the row, instead of a scalar loop with a switch inside it.',
            tradeoff: 'The Ward line hides five elementwise operations behind one statement, so the cost is invisible where it is paid, and binding an expression to auto rather than assigning it can leave it dangling once its operands change.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each row of the distance matrix is clamped and rooted independently, so the finishing pass partitions across cores with no shared mutable state.',
            tradeoff: 'It speeds up only the O(n^2) setup, not the sequential chain that follows, so end-to-end gains are bounded; and nesting it around a threaded BLAS can oversubscribe the machine.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n^2 d) distances in BLAS and an O(n^2) fused-row chain over one n-by-n buffer. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Agglomerative clustering - merge the closest pair, update, repeat. Transcribed.
//!
//! Takes a DISSIMILARITY MATRIX, not points: single, complete and average
//! linkage accept any dissimilarity (cosine, Jaccard, DTW) because no cluster
//! mean is ever formed. Ward is the exception - it needs squared Euclidean.

#[derive(Clone, Copy)]
pub enum Linkage {
    Single,
    Complete,
    Average,
    Ward,
}

/// Ids below n are points; the cluster formed at step s has id n + s.
pub struct Merge {
    pub left: usize,
    pub right: usize,
    pub height: f64,
    pub size: usize,
}

pub fn euclidean_matrix(x: &[Vec<f64>], squared: bool) -> Vec<Vec<f64>> {
    let n = x.len();
    let mut d = vec![vec![0.0; n]; n];

    for i in 0..n {
        for j in (i + 1)..n {
            let mut total = 0.0;
            for k in 0..x[i].len() {
                let difference = x[i][k] - x[j][k];
                total += difference * difference;
            }
            d[i][j] = if squared { total } else { total.sqrt() };
            d[j][i] = d[i][j];
        }
    }
    d
}

/// d(k, i+j) = a_i d(k,i) + a_j d(k,j) + b d(i,j) + g |d(k,i) - d(k,j)|
/// One formula, four sets of coefficients. The coefficients ARE the linkage.
fn lance_williams(
    linkage: Linkage,
    d_ki: f64,
    d_kj: f64,
    d_ij: f64,
    n_i: f64,
    n_j: f64,
    n_k: f64,
) -> f64 {
    match linkage {
        // a = 1/2, b = 0, g = -1/2: this is min
        Linkage::Single => 0.5 * d_ki + 0.5 * d_kj - 0.5 * (d_ki - d_kj).abs(),
        // g = +1/2: this is max
        Linkage::Complete => 0.5 * d_ki + 0.5 * d_kj + 0.5 * (d_ki - d_kj).abs(),
        // size-weighted mean of the two distances
        Linkage::Average => (n_i * d_ki + n_j * d_kj) / (n_i + n_j),
        // valid ONLY on squared Euclidean distances
        Linkage::Ward => {
            let total = n_i + n_j + n_k;
            ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / total
        }
    }
}

pub fn fit(mut d: Vec<Vec<f64>>, linkage: Linkage) -> Vec<Merge> {
    let n = d.len();
    let mut size = vec![1_usize; n];
    let mut label: Vec<usize> = (0..n).collect();
    let mut alive = vec![true; n];
    let mut merges = Vec::new();

    for step in 0..n.saturating_sub(1) {
        // ---- find the closest pair of live clusters: the O(n^2) scan -------
        let mut best: Option<(f64, usize, usize)> = None;
        for i in 0..n {
            if !alive[i] {
                continue;
            }
            for j in (i + 1)..n {
                if !alive[j] {
                    continue;
                }
                if best.map_or(true, |(height, _, _)| d[i][j] < height) {
                    best = Some((d[i][j], i, j));
                }
            }
        }
        let (height, i, j) = best.expect("at least two live clusters remain");

        // ---- update every other cluster's distance to the merged one -------
        for k in 0..n {
            if !alive[k] || k == i || k == j {
                continue;
            }
            let updated = lance_williams(
                linkage,
                d[k][i],
                d[k][j],
                d[i][j],
                size[i] as f64,
                size[j] as f64,
                size[k] as f64,
            );
            d[k][i] = updated;
            d[i][k] = updated;
        }

        merges.push(Merge { left: label[i], right: label[j], height, size: size[i] + size[j] });
        size[i] += size[j];
        alive[j] = false;
        label[i] = n + step;
    }
    merges
}

/// Flat labels from the first n - n_clusters merges.
pub fn cut(merges: &[Merge], n: usize, n_clusters: usize) -> Vec<usize> {
    let mut members: Vec<Option<Vec<usize>>> = (0..n).map(|point| Some(vec![point])).collect();
    members.resize(n + merges.len(), None);

    for (step, merge) in merges.iter().take(n - n_clusters).enumerate() {
        let mut combined = members[merge.left].take().expect("cluster already merged");
        combined.extend(members[merge.right].take().expect("cluster already merged"));
        members[n + step] = Some(combined);
    }

    let mut labels = vec![0_usize; n];
    for (cluster, points) in members.iter().flatten().enumerate() {
        for &point in points {
            labels[point] = cluster;
        }
    }
    labels
}`,
        profile: 'O(n^3) time — every merge rescans an O(n^2) matrix for the minimum — with every index bounds-checked and rows scattered across the heap.',
      },
      'make-it-right': {
        code: `//! Hierarchical clustering - typed errors, newtypes, nearest-neighbour chain.
#![forbid(unsafe_code)]

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum LinkageError {
    TooFewPoints { n: usize },
    ShapeMismatch { expected: usize, found: usize },
    InvalidEntry { row: usize, col: usize },
    NotSymmetric { row: usize, col: usize },
    WardNeedsPoints,
    Clusters { requested: usize, n: usize },
    Height { value: f64 },
}

impl fmt::Display for LinkageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::TooFewPoints { n } => write!(f, "need at least two points, got {n}"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::InvalidEntry { row, col } => {
                write!(f, "entry ({row}, {col}) is negative or not finite")
            }
            Self::NotSymmetric { row, col } => write!(f, "entry ({row}, {col}) is not symmetric"),
            Self::WardNeedsPoints => write!(
                f,
                "ward minimises a sum of squares around cluster means, which exists only \\
                 in Euclidean space; use from_points, or choose single, complete or average"
            ),
            Self::Clusters { requested, n } => write!(f, "n_clusters={requested} outside [1, {n}]"),
            Self::Height { value } => write!(f, "height {value} is negative or not finite"),
        }
    }
}

impl std::error::Error for LinkageError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Linkage {
    Single,
    Complete,
    Average,
    Ward,
}

/// Cluster count. A newtype because it and every other size are bare usize at
/// each call site, and a transposed pair would compile and silently mis-cut.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NClusters(usize);

impl NClusters {
    pub fn new(value: usize, n: usize) -> Result<Self, LinkageError> {
        if value == 0 || value > n {
            return Err(LinkageError::Clusters { requested: value, n });
        }
        Ok(Self(value))
    }
}

/// A cut height. Units matter: it is in the dissimilarity the tree was built from.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Height(f64);

impl Height {
    pub fn new(value: f64) -> Result<Self, LinkageError> {
        if !value.is_finite() || value < 0.0 {
            return Err(LinkageError::Height { value });
        }
        Ok(Self(value))
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Merge {
    pub left: usize,
    pub right: usize,
    pub height: f64,
    pub size: usize,
}

struct RawMerge {
    slot_a: usize,
    slot_b: usize,
    height: f64,
}

/// Lance-Williams for ONE other cluster k. With the coefficients substituted,
/// single and complete collapse to min and max.
fn update(linkage: Linkage, d_ki: f64, d_kj: f64, d_ij: f64, n_i: f64, n_j: f64, n_k: f64) -> f64 {
    match linkage {
        Linkage::Single => d_ki.min(d_kj),
        Linkage::Complete => d_ki.max(d_kj),
        Linkage::Average => (n_i * d_ki + n_j * d_kj) / (n_i + n_j),
        Linkage::Ward => {
            ((n_i + n_k) * d_ki + (n_j + n_k) * d_kj - n_k * d_ij) / (n_i + n_j + n_k)
        }
    }
}

/// O(n^2) agglomeration on a flat row-major matrix with +inf on the diagonal.
/// Valid because every supported linkage is reducible: merging two clusters
/// never brings the result closer to a third than either parent was, so mutual
/// nearest neighbours can be merged in ANY order and sorted by height afterward.
fn nearest_neighbour_chain(d: &mut [f64], n: usize, linkage: Linkage) -> Vec<RawMerge> {
    let mut sizes = vec![1.0_f64; n];
    let mut active = vec![true; n];
    let mut chain: Vec<usize> = Vec::with_capacity(n);
    let mut raw = Vec::with_capacity(n - 1);
    let mut first_active = 0;

    while raw.len() + 1 < n {
        if chain.is_empty() {
            while !active[first_active] {
                first_active += 1;
            }
            chain.push(first_active);
        }

        loop {
            let tail = *chain.last().expect("chain is non-empty");
            let row = &d[tail * n..(tail + 1) * n];
            let mut nearest = row
                .iter()
                .enumerate()
                .min_by(|x, y| x.1.total_cmp(y.1))
                .map(|(index, _)| index)
                .expect("row is non-empty");
            if chain.len() > 1 {
                let previous = chain[chain.len() - 2];
                if row[previous] <= row[nearest] {
                    nearest = previous;
                }
                if nearest == previous {
                    break;
                }
            }
            chain.push(nearest);
        }

        let b = chain.pop().expect("chain holds a pair");
        let a = chain.pop().expect("chain holds a pair");
        let height = d[a * n + b];

        for k in (0..n).filter(|&k| active[k] && k != a && k != b) {
            let updated = update(linkage, d[k * n + a], d[k * n + b], height, sizes[a], sizes[b], sizes[k]);
            d[k * n + a] = updated;
            d[a * n + k] = updated;
        }
        d[b * n..(b + 1) * n].fill(f64::INFINITY);
        d.iter_mut().skip(b).step_by(n).for_each(|entry| *entry = f64::INFINITY);

        sizes[a] += sizes[b];
        active[b] = false;
        raw.push(RawMerge { slot_a: a, slot_b: b, height });
    }
    raw
}

/// Sort merges by height and rewrite slot indices as dendrogram ids.
fn relabel(mut raw: Vec<RawMerge>, n: usize, take_root: bool) -> Vec<Merge> {
    raw.sort_by(|x, y| x.height.total_cmp(&y.height)); // stable

    fn find(parent: &mut [usize], mut slot: usize) -> usize {
        while parent[slot] != slot {
            parent[slot] = parent[parent[slot]];
            slot = parent[slot];
        }
        slot
    }

    let mut parent: Vec<usize> = (0..n).collect();
    let mut cluster_id: Vec<usize> = (0..n).collect();
    let mut size = vec![1_usize; n];

    raw.iter()
        .enumerate()
        .map(|(step, merge)| {
            let root_a = find(&mut parent, merge.slot_a);
            let root_b = find(&mut parent, merge.slot_b);
            let (left, right) = if cluster_id[root_a] <= cluster_id[root_b] {
                (cluster_id[root_a], cluster_id[root_b])
            } else {
                (cluster_id[root_b], cluster_id[root_a])
            };
            let result = Merge {
                left,
                right,
                height: if take_root { merge.height.sqrt() } else { merge.height },
                size: size[root_a] + size[root_b],
            };
            parent[root_b] = root_a;
            size[root_a] += size[root_b];
            cluster_id[root_a] = n + step;
            result
        })
        .collect()
}

pub struct Dendrogram {
    merges: Vec<Merge>,
    n_points: usize,
}

impl Dendrogram {
    /// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
    /// Euclidean geometry is available, so every linkage - Ward included - is
    /// legitimate.
    pub fn from_points(x_flat: &[f64], dimension: usize, linkage: Linkage) -> Result<Self, LinkageError> {
        if dimension == 0 || x_flat.len() % dimension != 0 {
            return Err(LinkageError::ShapeMismatch {
                expected: (x_flat.len() / dimension.max(1) + 1) * dimension.max(1),
                found: x_flat.len(),
            });
        }
        let n = x_flat.len() / dimension;
        if n < 2 {
            return Err(LinkageError::TooFewPoints { n });
        }

        // Ward is exact on SQUARED distances, where the recurrence maintains
        // twice the increase in SSE; every other linkage uses plain distances.
        let is_ward = linkage == Linkage::Ward;
        let mut d = vec![f64::INFINITY; n * n];
        for (i, a) in x_flat.chunks_exact(dimension).enumerate() {
            for (j, b) in x_flat.chunks_exact(dimension).take(i).enumerate() {
                let total: f64 = a.iter().zip(b).map(|(p, q)| (p - q) * (p - q)).sum();
                let value = if is_ward { total } else { total.sqrt() };
                d[i * n + j] = value;
                d[j * n + i] = value;
            }
        }
        let raw = nearest_neighbour_chain(&mut d, n, linkage);
        Ok(Self { merges: relabel(raw, n, is_ward), n_points: n })
    }

    /// Any dissimilarity: cosine, Jaccard, DTW, edit distance. NOT Ward.
    pub fn from_dissimilarity(d_flat: &[f64], n: usize, linkage: Linkage) -> Result<Self, LinkageError> {
        if linkage == Linkage::Ward {
            return Err(LinkageError::WardNeedsPoints);
        }
        if n < 2 {
            return Err(LinkageError::TooFewPoints { n });
        }
        if d_flat.len() != n * n {
            return Err(LinkageError::ShapeMismatch { expected: n * n, found: d_flat.len() });
        }
        if let Some(index) = d_flat.iter().position(|v| !v.is_finite() || *v < 0.0) {
            return Err(LinkageError::InvalidEntry { row: index / n, col: index % n });
        }
        if let Some(index) = (0..n * n).find(|&index| d_flat[index] != d_flat[(index % n) * n + index / n]) {
            return Err(LinkageError::NotSymmetric { row: index / n, col: index % n });
        }

        let mut d = d_flat.to_vec();
        (0..n).for_each(|i| d[i * n + i] = f64::INFINITY);
        let raw = nearest_neighbour_chain(&mut d, n, linkage);
        Ok(Self { merges: relabel(raw, n, false), n_points: n })
    }

    #[must_use]
    pub fn merges(&self) -> &[Merge] {
        &self.merges
    }

    #[must_use]
    pub fn cut_into(&self, k: NClusters) -> Vec<usize> {
        self.replay(self.n_points - k.0)
    }

    #[must_use]
    pub fn cut_at(&self, height: Height) -> Vec<usize> {
        self.replay(self.merges.partition_point(|merge| merge.height <= height.0))
    }

    fn replay(&self, steps: usize) -> Vec<usize> {
        let mut parent: Vec<usize> = (0..self.n_points + self.merges.len()).collect();
        for (step, merge) in self.merges.iter().take(steps).enumerate() {
            parent[merge.left] = self.n_points + step;
            parent[merge.right] = self.n_points + step;
        }

        let mut compact = vec![usize::MAX; parent.len()];
        let mut next_label = 0;
        (0..self.n_points)
            .map(|point| {
                let mut node = point;
                while parent[node] != node {
                    node = parent[node];
                }
                if compact[node] == usize::MAX {
                    compact[node] = next_label;
                    next_label += 1;
                }
                compact[node]
            })
            .collect()
    }
}`,
        rationale:
          'The nested Vecs become one flat row-major buffer, and the O(n^3) rescan of the previous stage becomes the nearest-neighbour chain, O(n^2) because every supported linkage is reducible: merges can be found out of order and sorted by height afterward. Ward is moved behind the type boundary — from_points computes squared Euclidean distances itself, while from_dissimilarity returns a dedicated error variant for it, because a precomputed matrix cannot carry Euclidean geometry. Validation happens in the constructors, so a Dendrogram can only exist in a valid state, and the cluster count and cut height become newtypes: both are bare numbers at every call site and a transposed pair would compile and silently mis-cut. Index loops over the matrix become iterator chains where the access pattern allows, and the crate forbids unsafe outright.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Forbid unsafe unless a benchmark justifies it',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n^2) time and one dense n-by-n buffer, with the distance build still a scalar loop.',
      },
      'make-it-fast': {
        code: `//! Hierarchical clustering - BLAS distances, contiguous in-place row updates.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Linkage {
    Single,
    Complete,
    Average,
    Ward,
}

pub struct RawMerge {
    pub slot_a: usize,
    pub slot_b: usize,
    pub height: f64,
}

/// ||a - b||^2 = ||a||^2 - 2 a.b + ||b||^2: the only pairwise term is a matrix
/// product, which replaces n^2 distance computations each walking d elements.
#[must_use]
pub fn pairwise_distances(x: ArrayView2<f64>, squared: bool) -> Array2<f64> {
    let norms: Array1<f64> = x.rows().into_iter().map(|row| row.dot(&row)).collect();
    let mut d = x.dot(&x.t());   // GEMM through the BLAS feature

    // Each row is independent, so the finishing pass fans out across cores.
    d.axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(i, mut row)| {
            for (j, value) in row.iter_mut().enumerate() {
                let sq = (norms[i] - 2.0 * *value + norms[j]).max(0.0);
                *value = if squared { sq } else { sq.sqrt() };
            }
            row[i] = f64::INFINITY;
        });
    d
}

/// Consumes d. Retired clusters are marked by +inf rows and columns instead of
/// being removed, so d never changes shape, every row stays a contiguous slice,
/// and an argmin can never pick a dead cluster.
pub fn nearest_neighbour_chain(d: &mut Array2<f64>, linkage: Linkage) -> Vec<RawMerge> {
    let n = d.nrows();
    let mut sizes = vec![1.0_f64; n];
    let mut active = vec![true; n];
    let mut chain: Vec<usize> = Vec::with_capacity(n);
    let mut raw = Vec::with_capacity(n - 1);
    let mut first_active = 0;

    // Scratch rows, allocated once: row b is copied out so row a can be
    // borrowed mutably, and row a is copied out so column a can be written.
    let mut scratch_b = vec![0.0_f64; n];
    let mut scratch_a = vec![0.0_f64; n];

    while raw.len() + 1 < n {
        if chain.is_empty() {
            while !active[first_active] {
                first_active += 1;
            }
            chain.push(first_active);
        }

        loop {
            let tail = *chain.last().expect("chain is non-empty");
            let row = d.row(tail);
            let row = row.as_slice().expect("standard layout");
            let mut nearest = row
                .iter()
                .enumerate()
                .min_by(|x, y| x.1.total_cmp(y.1))
                .map(|(index, _)| index)
                .expect("row is non-empty");
            if chain.len() > 1 {
                let previous = chain[chain.len() - 2];
                if row[previous] <= row[nearest] {
                    nearest = previous;
                }
                if nearest == previous {
                    break;
                }
            }
            chain.push(nearest);
        }

        let b = chain.pop().expect("chain holds a pair");
        let a = chain.pop().expect("chain holds a pair");
        let (n_a, n_b, d_ab) = (sizes[a], sizes[b], d[[a, b]]);

        scratch_b.copy_from_slice(d.row(b).as_slice().expect("standard layout"));
        let row_a = d.row_mut(a).into_slice().expect("standard layout");

        // One pass over two contiguous slices; the compiler vectorizes this.
        match linkage {
            Linkage::Single => row_a.iter_mut().zip(&scratch_b).for_each(|(x, &y)| *x = x.min(y)),
            Linkage::Complete => row_a.iter_mut().zip(&scratch_b).for_each(|(x, &y)| *x = x.max(y)),
            Linkage::Average => row_a
                .iter_mut()
                .zip(&scratch_b)
                .for_each(|(x, &y)| *x = (n_a * *x + n_b * y) / (n_a + n_b)),
            Linkage::Ward => row_a
                .iter_mut()
                .zip(&scratch_b)
                .zip(&sizes)
                .for_each(|((x, &y), &n_k)| {
                    *x = ((n_a + n_k) * *x + (n_b + n_k) * y - n_k * d_ab) / (n_a + n_b + n_k);
                }),
        }

        scratch_a.copy_from_slice(row_a);
        d.column_mut(a)
            .iter_mut()
            .zip(&scratch_a)
            .for_each(|(slot, &value)| *slot = value);
        d.row_mut(b).fill(f64::INFINITY);
        d.column_mut(b).fill(f64::INFINITY);
        d[[a, a]] = f64::INFINITY;

        sizes[a] = n_a + n_b;
        active[b] = false;
        raw.push(RawMerge { slot_a: a, slot_b: b, height: d_ab });
    }

    // Sorting by height and relabelling slots as dendrogram ids is unchanged from
    // the previous stage: O(n log n), nowhere near the hot path.
    raw
}`,
        rationale:
          'The distance build, which was a scalar double loop, becomes a BLAS matrix product through the squared-norm expansion with a rayon finishing pass over rows. Inside the chain the update changes shape: instead of an index-filtered loop with a per-element dispatch, each linkage becomes one pass over two contiguous slices, with row b copied once into a scratch buffer so row a can be borrowed mutably, and retired clusters held at infinity so every row stays a full contiguous slice. Merge and chain storage are sized up front. Rayon is deliberately kept off the chain — each merge is a sequential dependency over one row, and parallelizing a memory-bound O(n) scan only adds overhead. The memory ceiling is unchanged.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The cross term for every pair of points is one matrix product dispatched to a tuned BLAS, replacing an O(n^2 d) hand-written double loop.',
            tradeoff: 'Binds the build to a system BLAS, and the squared-norm expansion loses precision through cancellation, so near-tied pairs can be misranked and the merge order changes with them.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Each distance row is clamped and rooted independently of every other, so the finishing pass partitions across cores with no shared mutable state.',
            tradeoff: 'It accelerates only the O(n^2) setup; the chain that follows is a sequential dependency, so end-to-end gains are bounded, and nesting it around a threaded BLAS can oversubscribe the machine.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Every row of the matrix is a contiguous slice, so both the nearest-neighbour scan and the Lance-Williams update are sequential reads the compiler can vectorize.',
            tradeoff: 'Writing the mirrored column is a strided access over the whole matrix, so the symmetric update always pays for one of its two directions — and it needs a scratch row to avoid borrowing the matrix twice.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The chain and the merge list have known upper bounds of n and n minus one, so neither ever reallocates during the fit.',
            tradeoff: 'The capacity is a promise about the input shape: a caller passing fewer than two points hits the arithmetic at construction, which is why validation belongs at the boundary above this function.',
          },
        ],
        libraryName: 'ndarray (blas feature) + rayon',
        profile: 'O(n^2 d) distances in BLAS and an O(n^2) contiguous-slice chain over one n-by-n buffer. Illustrative, not a measured benchmark.',
      },
    },
  },
};
