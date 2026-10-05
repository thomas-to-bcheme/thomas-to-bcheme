import type { AiMlModel } from '../../types';

/**
 * DBSCAN — density-based clustering: a cluster is whatever a dense
 * neighbourhood can reach, and everything it cannot reach is noise.
 *
 * Sits beside k-means in the structure group because it answers the same
 * question with the opposite assumption. k-means imposes K convex Voronoi cells
 * and always returns them; DBSCAN imposes a density threshold and lets the
 * number, the shape and the existence of clusters fall out of the data.
 *
 * The entry is honest about the one thing that makes it unlike its neighbours:
 * there is no loss. DBSCAN is a definition (a closure under density-reachability)
 * plus an algorithm that computes it, so the objective is stated as a fixed
 * point rather than dressed up as a quantity being minimized. The code
 * progression is built around the two facts that matter in practice: the
 * ε-neighbourhood is defined by the metric, and the work is n region queries,
 * so the cost of the whole algorithm is the cost of the spatial index.
 */
export const DBSCAN: AiMlModel = {
  slug: 'dbscan',
  name: 'DBSCAN',
  aliases: ['DBSCAN', 'HDBSCAN', 'Density-based clustering', 'OPTICS'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'anomaly-detection' because the noise label is the algorithm's native
  // outlier output, with the caveats in applications.featured['anomaly-detection'].
  taskTypes: ['clustering', 'anomaly-detection'],
  paradigmNote:
    'Unsupervised clustering whose by-product is an outlier detector: the points that belong to no dense region are labelled noise rather than forced into the nearest cluster. That is the property that makes it a density method rather than a partitioning one, and it is why it is the first thing to reach for when the question is "what is unusual here" as much as "what groups exist".',

  intuition:
    'Stand on any point and count how many others are within a fixed radius ε. If at least minPts are (the point itself included), you are standing somewhere dense, and the point is a core point. Two core points within ε of each other are in the same cluster, and so is anything that chains through a sequence of such steps — the cluster is the crowd you can walk across without ever crossing a gap wider than ε in a crowded place. Points within ε of a core point but not dense themselves are border points: they join the cluster, but you cannot walk onward through them. Everything left over is noise. Nothing in this asks for the number of clusters, and nothing assumes a shape — a ring, a crescent and a blob are all just connected regions of density — which is exactly where k-means, with its convex Voronoi cells, fails. What it asks for instead is a single, global notion of "close", which is the whole difficulty: ε is a distance, so it is only as meaningful as the metric that measures it, and one ε cannot describe two clusters of different density.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        '\\mathcal{N}_\\varepsilon(p) = \\{\\, q : d(p,q) \\le \\varepsilon \\,\\}, \\qquad \\mathcal{K} = \\{\\, p : \\lvert \\mathcal{N}_\\varepsilon(p) \\rvert \\ge m \\,\\}, \\qquad S_{t+1} = S_t \\cup \\bigcup_{p \\in S_t \\cap \\mathcal{K}} \\mathcal{N}_\\varepsilon(p), \\qquad \\mathcal{C}(p_0) = \\bigcup_{t \\ge 0} S_t \\quad (S_0 = \\{p_0\\},\\; p_0 \\in \\mathcal{K})',
      symbols: [
        { symbol: 'd(p,q)', meaning: 'the distance between two points — the single place where the data representation enters, and the choice that decides the shape of the neighbourhood (Euclidean ball, Manhattan diamond, cosine cone, great-circle cap)' },
        { symbol: '\\varepsilon', meaning: 'the neighbourhood radius, in the units of d — a distance, not a count, so it is only meaningful relative to the metric and the feature scaling' },
        { symbol: '\\mathcal{N}_\\varepsilon(p)', meaning: 'the ε-neighbourhood of p: every point within ε of it, p itself included' },
        { symbol: 'm', meaning: 'minPts, the density threshold: how many points must fall inside the ε-ball for its centre to count as dense' },
        { symbol: '\\mathcal{K}', meaning: 'the set of core points — the dense ones. Core points and noise are determined entirely by (ε, m); only border points are left to ordering' },
        { symbol: 'S_t', meaning: 'the set reached after t expansion steps from a seed core point p₀; it only ever grows, so the sequence converges' },
        { symbol: '\\mathcal{C}(p_0)', meaning: 'the cluster containing p₀: the smallest set that is closed under "add the whole neighbourhood of every core point already in it". Noise is every point in no such set' },
      ],
    },
    reading:
      'There is no loss here, and pretending otherwise would be the wrong reading. DBSCAN does not minimize anything: no two parameter settings can be compared by a number that goes down, which is why ε and minPts cannot be tuned by the usual train-and-validate loop. What it defines is a closure. Start from one core point, repeatedly add the entire ε-neighbourhood of every core point you hold, and stop when nothing new is added. That stopping point is a fixed point of the expansion operator — apply it once more and the set does not change — and because the operator only grows sets, the smallest such fixed point containing the seed is well defined and reached in finitely many steps. That is why the objective is stated as a fixed-point condition rather than as a loss, in the same family as the Bellman equation for Q-learning: the answer is whatever the operator leaves unchanged. Equivalently, the clusters are the connected components of the graph whose vertices are the core points and whose edges join two cores within ε of each other. Border points attach to a component through one core neighbour without extending it, and noise is whatever no component reaches. The consequence worth stating plainly is that correctness is about the definition, not about optimality: there is no sense in which one valid clustering is better than another, only whether (ε, m) described the density you meant.',
  },

  optimization: {
    method: 'Breadth-first closure of density-reachability, with a region query per point',
    updateRule: {
      formula:
        '\\operatorname{label}(q) \\leftarrow c \\;\\; \\forall\\, q \\in \\mathcal{N}_\\varepsilon(p), \\qquad \\mathcal{Q} \\leftarrow \\mathcal{Q} \\cup \\{\\, q \\in \\mathcal{N}_\\varepsilon(p) : q \\text{ unvisited} \\,\\} \\quad \\text{only if } p \\in \\mathcal{K}',
      symbols: [
        { symbol: '\\leftarrow', meaning: 'assignment, applied as the queue is drained: pop a point, claim its neighbourhood for the current cluster, and enqueue the new ones' },
        { symbol: 'c', meaning: 'the id of the cluster currently being grown; it increments each time a fresh, unvisited core point seeds a new one' },
        { symbol: '\\mathcal{Q}', meaning: 'the frontier queue. The "only if p is core" condition is what stops expansion at a border point: it is labelled but never queried onward' },
        { symbol: '\\mathcal{N}_\\varepsilon(p)', meaning: 'the region query — a range search under the chosen metric, and the operation the whole runtime is made of' },
        { symbol: '\\text{unvisited}', meaning: 'each point is expanded at most once, which is what bounds the algorithm at n region queries rather than at the (much larger) number of edges in the neighbourhood graph' },
      ],
    },
    rationale:
      'The closure is computed the obvious way: pick an unvisited point, query its ε-neighbourhood, and if it is dense start a cluster and grow it breadth-first, querying each newly reached point exactly once. Because every point is expanded at most once the algorithm performs at most n region queries, so its cost is entirely the cost of the range search — which is why the choice of spatial index, not any property of the clustering, decides whether it is fast. The same structure shows what is deterministic and what is not. Core points and noise are fixed by (ε, m) regardless of visiting order, because the closure is order-independent; only border points can differ, since a border point lying within ε of cores from two different clusters is claimed by whichever expansion reaches it first. That is a known, minor non-determinism, and a consequence of the definition rather than a bug. The other consequence is that the whole procedure is equivalent to connected components over the core points, which is why it parallelizes: the region queries are independent, and the merge is a union-find. There is no gradient, no learning rate and no iteration to convergence — which is also why there is nothing to warm-start and no incremental fit in the standard implementations.',
    hyperparameters: [
      { name: 'eps (ε)', role: 'The neighbourhood radius, and the parameter that matters. Too small and everything is noise; too large and distinct clusters merge into one. Choose it from the k-distance plot: sort every point’s distance to its k-th nearest neighbour (k = minPts) and take the knee, the point where distances jump from "inside a cluster" to "isolated". It is a distance, so it is invalid if the features are unscaled or the metric is wrong', typicalRange: 'read off the k-distance knee; never a default. Rescaling features changes it, so fix the scaler first' },
      { name: 'minPts (min_samples)', role: 'The density threshold. Larger values demand denser cores, absorb noise, and suppress the thin-bridge chaining that merges clusters; smaller values find small clusters and are noisier. Mind the convention: in scikit-learn it counts the point itself, and in some papers it does not', typicalRange: 'at least d + 1; 2·d is the common rule of thumb for d features, and 4 to 10 for low-dimensional spatial data. Raise it for noisy data' },
      { name: 'metric', role: 'The distance d, which defines the shape of the ε-ball. Euclidean by default; Manhattan gives a diamond and is more tolerant of one wildly different coordinate; cosine gives a cone and compares direction only; haversine gives a great-circle cap for latitude and longitude; precomputed accepts any distance matrix, such as dynamic time warping, Jaccard or edit distance', typicalRange: 'chosen from the data representation — see the similarity notes in the applications below. Changing it invalidates ε' },
      { name: 'algorithm / leaf_size', role: 'The spatial index behind the region query: kd-tree, ball-tree, or brute force. A cost decision, not a modelling one — except that tree indexes lose their advantage past roughly 10 to 20 dimensions and above all for non-Euclidean or non-vector metrics', typicalRange: 'kd-tree or ball-tree in low dimension; brute force or approximate neighbours in high dimension' },
      { name: 'min_cluster_size (HDBSCAN)', role: 'HDBSCAN drops ε entirely and keeps one intuitive parameter: the smallest group worth calling a cluster. It replaces the single global ε with a hierarchy over all ε values and selects the most stable clusters from it, which is what handles clusters of different density', typicalRange: 'a domain decision — the smallest group you would act on' },
    ],
    convergence:
      'Terminates after at most n region queries, deterministically for core points and noise and with a small ordering dependence for border points. There is no local optimum because there is no objective: the output is the unique closure, not the best of several. The failure modes are failures of the parameters and the metric, not of convergence, and three deserve names. One global ε: if clusters differ in density, no single ε is right — a value that separates the dense ones fragments the sparse one into noise, and a value that keeps the sparse one whole merges the dense ones. This is the problem HDBSCAN and OPTICS exist to solve. Chaining: a thin line of points bridging two clusters, each within ε of the next, connects them into one — the same single-linkage effect hierarchical clustering has, and raising minPts is the direct defence, since a bridge of border-dense points stops being core. And the curse of dimensionality, below. DBSCAN cannot fail to stop; it can only answer a question you did not mean to ask.',
    complexity:
      'n region queries, so O(n · q) where q is the cost of one range search. With a kd-tree or ball-tree in low dimension q is O(log n) plus the neighbourhood size, giving O(n log n) overall. The worst case is O(n²): with brute force, with a dimension high enough that the tree prunes nothing, or with an ε so large that every neighbourhood contains a constant fraction of the data — the work is bounded below by the total size of all neighbourhoods, which an index cannot reduce. Memory is O(n) with an index, but implementations that precompute and store every neighbourhood use O(n · average neighbourhood size), which is the quiet cause of out-of-memory failures on dense data; a precomputed distance matrix, needed for non-vector metrics such as dynamic time warping, is O(n²) outright.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'It does not forecast, and the honest use is upstream of the forecaster. Cluster the series by shape, then pool: fit one model per cluster, or use the cluster as a feature, and route every noise series to its own model or a robust fallback, since those are exactly the ones that resemble nothing else. What makes DBSCAN better than k-means for this job is a single fact: it only needs pairwise distances, never a mean. Dynamic time warping, which handles phase shifts and local stretching, has no meaningful centroid and so cannot drive k-means, but it feeds DBSCAN directly as a precomputed distance matrix.',
        where: [
          'Grouping SKUs or stores by demand profile so a pooled model is fitted per group, with irregular products flagged as noise instead of dragging a group’s model',
          'Smart-meter and energy-load segmentation by daily-profile shape, where the noise points are atypical households that need their own treatment',
          'Clustering sensors or machines by their operating-signal embeddings before fitting per-cluster baselines for forecasting or monitoring',
        ],
        why: 'The noise label is the useful part here. A partitioning method must assign every series to some group and then fits a pooled model that the odd series contaminate; DBSCAN lets the series that do not resemble anything opt out. The costs are specific. The distance matrix is O(n²) in the number of series and each DTW entry is itself quadratic in series length, so it does not scale past a few thousand series without an approximate lower-bound or a learned embedding. A single ε assumes one similarity scale across the whole catalogue, which is rarely true when fast and slow movers coexist. And it has no predict method, so a new series is placed by nearest-core assignment, which is a rule you must build. Where those bite, cluster learned embeddings with k-means or HDBSCAN instead.',
        featurization: [
          'Z-normalize each series so the distance compares shape, otherwise the clusters recover magnitude and ε means nothing across scales',
          'Compute DTW (or a shape-based distance) with a Sakoe-Chiba band, and feed the matrix as metric="precomputed"; an unbanded DTW is both slow and prone to pathological alignments',
          'Pick ε from the k-distance curve of that same matrix, and re-check it whenever the series length or normalization changes',
          'Fit the clustering on the training window only — clustering over the full history leaks future shape into the pooled-model assignment',
        ],
        evaluation:
          'Rolling-origin backtest of the pooled forecasts against per-series and global-model baselines, not a clustering metric. A clustering that scores well on silhouette and does not lower forecast error described the data without helping it, and the noise series should be scored separately so that their (usually worse) error is visible rather than averaged away.',
        pitfalls: [
          'Euclidean distance on unaligned series, where a one-period phase shift looks like a large difference — the reason a warping distance is needed here at all',
          'An O(n²) DTW matrix on tens of thousands of series, which fails on memory long before time',
          'A large noise share, which means ε was set for the dense minority and most of the catalogue got no pooled model',
          'Cluster ids that change between refits, silently changing which pooled model a series is scored by',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'The output of the algorithm is the detector. Run it on the feature representation of normal-plus-unknown data, and the points labelled noise (-1) are the ones with no dense neighbourhood — the outliers — while the clusters describe what normal looks like, with no assumption about how many normal modes there are or what shape they take. Two readings are available and both are useful: the noise points are the point anomalies, and a cluster that is unusually tight, small and appearing suddenly is often a coordinated group of anomalies that found each other.',
        where: [
          'Spatial and sensor outlier screening, such as GPS fixes or readings that belong to no dwell or operating cluster',
          'Transaction and event screening in a space of amount, time, location and device features, where the benign flows form dense modes and unusual ones are isolated',
          'Network-traffic baselining, where normal flows cluster by feature profile and scans or exfiltration fall outside every dense region',
          'Manufacturing and inspection data, separating spatially clustered defects (a process problem) from isolated random ones',
        ],
        why: 'Noise is a first-class output rather than an afterthought, which is the structural advantage over k-means (it assigns every point to a cluster and then needs a distance threshold bolted on) and over a Gaussian mixture (it needs a density model with a chosen number of components). The method makes no assumption about how many normal modes there are or what shape they have, and it needs no labelled anomalies. Its limits are as important. The output is binary: there is no score, so ranking alerts needs a second step — LOF, HDBSCAN’s GLOSH outlier scores, or simply the k-distance — and a hard noise threshold is brittle. One global ε again: a normal point in a sparse but legitimate region is flagged, and a tight anomaly cluster is called normal. And it fails in high dimension, where distances concentrate and every point looks equally isolated; there, an isolation forest, which uses no distances at all, is the better detector. Metric choice is part of the model: Euclidean on standardized features, cosine for embeddings, haversine for coordinates, and a wrong choice silently re-draws what counts as an outlier.',
        featurization: [
          'Standardize numeric features so that ε means the same thing on every axis, and make the scaler part of the model artefact',
          'Reduce dimension first (PCA or a learned embedding), since a single ε is meaningless in dozens of raw dimensions',
          'Choose the metric from the representation: Euclidean for standardized coordinates, cosine for embeddings (L2-normalize and use Euclidean), haversine for latitude and longitude in radians, a precomputed matrix for sets or sequences',
          'Set minPts from how large a group of events you are willing to call normal, then read ε from the k-distance plot for that k',
          'Clean the fit window, or a dense cluster of contamination is learned as a normal mode',
        ],
        evaluation:
          'Precision@k and PR-AUC against confirmed incidents, never accuracy, with the noise points ranked by a continuous score (k-distance, LOF or GLOSH) so that a threshold can be chosen. Report the noise rate alongside precision: an alert rate you cannot staff is a failure regardless of how many true anomalies it contains. Compare against an isolation forest on the same features — if it wins clearly, the dimension or the varying density is the thing costing you.',
        pitfalls: [
          'Treating the noise label as a calibrated anomaly score, when it is a yes/no verdict at one (ε, minPts)',
          'A coordinated, dense group of anomalies forming its own cluster and being reported as perfectly normal',
          'One global ε over regions of different density, flagging every point of a sparse-but-legitimate segment',
          'Unscaled or high-dimensional features, where the k-distance plot has no knee and every point looks equally isolated',
          'No predict method: scoring a new event requires a deliberate nearest-core rule, and doing it differently in training and serving shifts the verdicts',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'DBSCAN solves no optimization problem: its output is a closure under a density-reachability operator, not the minimizer of an objective, so it is not a solver for routing, scheduling or allocation. The only optimization attached to it is tuning ε and minPts, which is external to the algorithm — done by reading a k-distance plot or by an application-level metric — and there is nothing to optimize inside it.',
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Two readings of one output. The noise points are the isolated, unlike-anyone events worth a look, and the clusters are where the structure is: a dense cluster of accounts that share a device fingerprint, an address pattern and a creation-time burst is a fraud ring, which is a cluster in a feature space where the analyst has chosen what "close" means. The signal is often the cluster, not the noise.',
        where: [
          'Account-farm and bot-ring discovery, clustering accounts by device, network and behavioural features',
          'Transaction clustering to find unusually tight groups of near-identical payments, as in card testing',
          'Reducing a review queue by labelling the dense, well-understood bulk and surfacing the leftover for investigation',
        ],
        why: 'Fraud is adversarial and clustered by construction — attackers reuse infrastructure — so a method that finds arbitrary-shaped dense groups without a preset count is a natural fit, and the noise output gives a second, independent signal. It is an exploratory and triage tool rather than a decision engine: it has no labels and no calibrated score, so it complements a supervised model rather than replacing it. Metric choice does the real work, since similarity here is mixed — Jaccard on sets of shared identifiers, cosine on behaviour embeddings, Euclidean on standardized numeric features — and a precomputed combination is common.',
        featurization: [
          'Build the representation from the investigator’s notion of "the same actor": shared devices, IPs, addresses and timing, encoded so that distance reflects that notion',
          'Use Jaccard distance on sets of shared identifiers and cosine on embeddings, via a precomputed matrix or L2-normalized vectors',
          'Down-weight ubiquitous identifiers such as a shared corporate NAT address, or the cluster is the whole company',
          'Fix minPts at the smallest group you would investigate, and read ε from the k-distance plot at that k',
        ],
        evaluation:
          'Precision of the surfaced clusters and noise points against confirmed investigations, and the investigator hours per confirmed finding, rather than any internal clustering metric. Hold out a recent time slice to confirm the clusters are not simply last week’s known cases.',
        pitfalls: [
          'A shared infrastructure identifier merging unrelated accounts into one enormous cluster through a chaining effect',
          'Treating cluster membership as evidence of fraud, when it is only evidence of similarity',
          'A fixed ε drifting out of validity as the population or the feature scaling changes',
        ],
      },
      'control-and-operations': {
        fit: 'viable',
        how: 'Geographic, trajectory and spatial-sensor clustering, which is where DBSCAN is most at home. Latitude-longitude fixes are clustered under the haversine distance, so ε is a real-world distance on the sphere; a stay-point detector clusters the fixes of a trajectory to find where it dwelt; and a robot perception stack clusters a LiDAR point cloud, after ground removal, into obstacle candidates under Euclidean distance. Spatio-temporal variants use two radii, one in space and one in time.',
        where: [
          'Stay-point and place detection from GPS trajectories, and hotspot discovery for pickups, incidents or demand',
          'Obstacle segmentation in LiDAR point clouds, where each dense cluster is a candidate object',
          'Vessel, vehicle and aircraft position data, clustering stops and anchorages and flagging off-pattern movements as noise',
          'Spatial siting and service-area analysis, where the real shape of a hotspot is not a circle',
        ],
        why: 'This is the problem the algorithm was designed for: spatial data of low dimension, a physically meaningful ε (metres or kilometres), no known count of clusters, arbitrary shapes — a road, a coastline, a crescent-shaped crowd — and noise that is real (a stray fix, a one-off) rather than a modelling nuisance. The metric is not a detail: Euclidean distance on raw latitude and longitude is wrong, because a degree of longitude shrinks with latitude, so the data must be projected or the haversine metric used. The trade-offs are the usual ones. A single ε assumes uniform density, so a city centre and its suburbs need either different ε or HDBSCAN, and a ball-tree is the index that supports haversine.',
        featurization: [
          'Use the haversine metric on latitude and longitude in radians, or project to a local planar coordinate system and use Euclidean — never Euclidean on raw degrees',
          'Convert ε from a physical distance to radians (divide kilometres by the Earth radius) when using haversine, and keep the unit in the parameter name',
          'For trajectories, thin the fixes by time or distance first, so a slow-moving point does not look dense simply because it was sampled often',
          'For spatio-temporal clustering, use two radii, one for space and one for time, rather than mixing units in a single distance',
          'For point clouds, remove ground points first and consider a voxel-grid downsample, since the cost is the number of region queries',
        ],
        evaluation:
          'Task-level: place-detection precision and recall against labelled visits, obstacle recall at a fixed false-positive rate for perception, and the downstream decision the cluster feeds. Check stability under a small perturbation of ε, since a hotspot that vanishes when ε moves by ten percent is an artefact.',
        pitfalls: [
          'Euclidean distance on latitude and longitude in degrees, which distorts every neighbourhood away from the equator',
          'Forgetting that haversine takes radians, and that its ε is an angle on the unit sphere rather than a distance',
          'A fixed ε across a dense city centre and sparse outskirts, which fragments the outskirts into noise',
          'Sampling-rate artefacts in trajectories, where the number of fixes rather than the time spent produces the density',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'n range queries, so O(n log n) with a spatial index in low dimension and O(n²) in the worst case; on 2-D spatial data, millions of points cluster in seconds to minutes. The index build is O(n log n) and is a one-off. With a precomputed distance matrix the cost and the memory are both O(n²), which is the practical ceiling for DTW or edit-distance clustering at a few tens of thousands of items.',
    inferenceProfile:
      'There is no predict method in the standard implementation, because the model is the data. A new point is placed by a nearest-core rule: find the closest core point, and if it is within ε adopt that core’s cluster, otherwise label the point noise. That is one nearest-neighbour query against the stored core points, so the artefact to ship is the core points themselves plus ε, the metric and the scaler — which can be large — and an approximate index when it is. Note that this rule is a deliberate, separate piece of code, and it must match the training-time definition exactly or the labels disagree.',
    retrainingCadence:
      'Batch refit; there is no incremental update in the standard implementation, and the refit is cheap enough that it is the reason not to bother with incremental variants. The reason to refit rarely is stability rather than cost: cluster ids are arbitrary and change on every run, and a drift in the data moves ε, so anything keyed to a cluster id must be remapped or re-approved. Re-derive ε from the k-distance plot on each refit instead of carrying a stale value forward.',
    driftAndMonitoring: [
      'Track the noise rate over time — a rising rate is either a real wave of anomalies or an ε that no longer matches the density, and the k-distance plot distinguishes them',
      'Watch the number and size distribution of clusters; one cluster swallowing the rest points at chaining or a drifted ε, and a collapse into noise points at the opposite',
      'Re-plot the k-distance curve on recent data and compare the knee to the deployed ε — a moved knee is drift measured directly',
      'Monitor the share of new points that fall within ε of a core point at serving time, which is the coverage of the current model',
    ],
    productionGotchas: [
      'The noise label is -1 and is easily consumed as a valid cluster id by downstream code that indexes with it',
      'The meaning of min_samples differs between implementations — whether the point itself counts — and a port between libraries silently changes which points are core',
      'The scaler is part of the model: ε is a distance in scaled units, so refitting the scaler changes every neighbourhood without any code change',
      'Haversine requires radians and returns angles on the unit sphere, so an ε in kilometres must be divided by the Earth radius or every point is noise',
      'Dense data with a large ε makes implementations that store every neighbourhood run out of memory long before they run out of time',
      'Duplicate points inflate neighbourhood counts, so a heavily repeated record can make a point core on its own; collapse duplicates with sample weights',
      'Border points can differ between runs and between implementations; compare core points and noise, not raw labels',
    ],
  },

  assumptions: [
    'A single density threshold describes every cluster, so all clusters are of roughly comparable density — the assumption HDBSCAN relaxes and the one most often violated in real data',
    'The distance is meaningful and the features are on comparable scales; ε is only as good as d, and an unscaled feature quietly decides every neighbourhood',
    'The dimension is low enough for distance to discriminate. In high dimension distances concentrate — the ratio between the nearest and farthest neighbour tends to 1 — so ε either captures nothing or everything and the single-radius idea stops working',
    'Clusters are separated by regions of lower density, rather than by overlapping or touching densities; thin bridges of points chain clusters together',
    'Noise is meaningful: points outside every dense region are genuinely unlike the rest, not just under-sampled areas of a legitimate sparse mode',
  ],

  pros: [
    {
      point: 'No number of clusters to choose, and arbitrary cluster shapes',
      context:
        'A ring, a crescent and a blob are all connected regions of density, so the method finds them where k-means, with its convex Voronoi cells, splits them down the middle. The saving is real but it is exchanged, not removed: the two parameters ε and minPts replace K, and they are harder to guess.',
    },
    {
      point: 'Noise is a first-class output',
      context:
        'Outliers are labelled instead of being forced into the nearest cluster, which is both a better clustering (they do not drag a centroid) and a ready-made anomaly detector. It is the right property when the data contain genuine strays and the wrong one when every point must be assigned, in which case the noise needs a second step.',
    },
    {
      point: 'Works with any distance, including non-vector ones',
      context:
        'It needs only pairwise distances, never a mean, so it runs on a precomputed matrix of dynamic-time-warping, Jaccard or edit distances where k-means has no centroid to compute. The price is O(n²) memory in exactly those cases.',
    },
    {
      point: 'Deterministic for core points and noise, and robust to outliers',
      context:
        'There is no initialization and no local optimum to restart from; the same data and parameters give the same dense structure. Only border points depend on ordering, which seldom matters.',
    },
    {
      point: 'Fast in low dimension',
      context:
        'O(n log n) with a kd-tree or ball-tree, which makes it the standard tool for geographic and spatial data of two or three dimensions. The advantage disappears with dimension, where the index stops pruning.',
    },
  ],

  cons: [
    {
      point: 'One global ε cannot describe clusters of different density',
      context:
        'A radius that separates the dense clusters fragments the sparse one into noise, and one that keeps the sparse one whole merges the dense ones. This is the characteristic failure on real data, and the reason HDBSCAN and OPTICS exist; if densities clearly differ, start there.',
    },
    {
      point: 'Fails in high dimension',
      context:
        'Distances concentrate as the dimension grows, so the contrast between near and far collapses and no ε separates dense from sparse. Reduce dimension first or use a method that does not rely on distance; this is the main place an isolation forest beats it as a detector.',
    },
    {
      point: 'Sensitive to ε and the metric, with no loss to tune against',
      context:
        'There is no objective to minimize, so ε and minPts cannot be validated the way a supervised model’s parameters are. The k-distance plot gives a defensible ε, but it is a heuristic with a judgement call at the knee, and a rescaling or a metric change invalidates it.',
    },
    {
      point: 'No predict method, and no native anomaly score',
      context:
        'The model is the data: new points need a hand-built nearest-core rule, and the noise label is binary. Both are addressable (nearest-core assignment, LOF or GLOSH) and both are routinely forgotten until deployment.',
    },
    {
      point: 'Chaining through thin bridges',
      context:
        'A sparse line of points connecting two clusters merges them, just as in single-linkage hierarchical clustering. Raising minPts is the defence, at the cost of discarding genuinely small clusters as noise.',
    },
  ],

  relatedSlugs: [
    'k-means',
    'hierarchical-clustering',
    'spectral-clustering',
    'isolation-forest',
    'gaussian-mixture',
    'affinity-propagation',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DBSCAN - the definition, transcribed.

A point is CORE if at least min_pts points (itself included) lie within eps of
it. A cluster is grown from a core point by repeatedly claiming the whole
eps-neighbourhood of every core point it reaches. A point that is within eps of
a core point but is not core itself is a BORDER point: it joins the cluster
but the growth does not continue through it. Everything unreached is NOISE.

The only place the data representation enters is distance(): change it and the
shape of the neighbourhood changes with it.
"""

from collections import deque

NOISE = -1
UNVISITED = -2


def distance(a, b):
    """Euclidean distance. This is the choice that makes the eps-ball round."""
    total = 0.0
    for j in range(len(a)):
        difference = a[j] - b[j]
        total += difference * difference
    return total ** 0.5


def region_query(X, i, eps):
    """Every index within eps of point i, point i itself included."""
    neighbours = []
    for j in range(len(X)):
        if distance(X[i], X[j]) <= eps:
            neighbours.append(j)
    return neighbours


def fit(X, eps, min_pts):
    n = len(X)
    labels = [UNVISITED] * n
    cluster = 0

    for seed in range(n):
        if labels[seed] != UNVISITED:
            continue

        neighbours = region_query(X, seed, eps)
        if len(neighbours) < min_pts:
            # Not dense. Tentatively noise - a later cluster may still
            # claim it as a border point.
            labels[seed] = NOISE
            continue

        # seed is a core point: start a cluster and grow it.
        labels[seed] = cluster
        queue = deque(neighbours)

        while queue:
            candidate = queue.popleft()

            if labels[candidate] == NOISE:
                # Was written off as noise but sits within eps of a core
                # point: it is a border point. Label it, do not expand it.
                labels[candidate] = cluster
                continue
            if labels[candidate] != UNVISITED:
                continue

            labels[candidate] = cluster
            reachable = region_query(X, candidate, eps)
            if len(reachable) >= min_pts:
                # candidate is core too, so its neighbourhood is reachable.
                queue.extend(reachable)

        cluster += 1

    return labels


def k_distances(X, k):
    """Sorted distance from every point to its k-th nearest neighbour.

    Plot this and read eps off the knee: distances inside a cluster are small
    and flat, and the curve jumps where points become isolated.
    """
    result = []
    for i in range(len(X)):
        distances = sorted(distance(X[i], X[j]) for j in range(len(X)))
        result.append(distances[min(k, len(distances) - 1)])
    return sorted(result)`,
        profile: 'O(n^2) distance evaluations in interpreter loops: every region query scans all n points.',
      },
      'make-it-right': {
        code: `"""DBSCAN - typed, validated, tree-backed region queries, a real predict()."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from scipy.spatial import cKDTree

Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]

NOISE = -1
UNVISITED = -2

Metric = Literal["euclidean", "manhattan", "chebyshev", "cosine"]

# Minkowski p for each metric the kd-tree can serve directly. The metric is not
# a detail: it decides the SHAPE of the eps-ball - a sphere, a diamond, a cube.
_MINKOWSKI_P: dict[str, float] = {
    "euclidean": 2.0,
    "manhattan": 1.0,
    "chebyshev": float("inf"),
    "cosine": 2.0,
}


def _normalise(X: Matrix, metric: Metric) -> Matrix:
    """Cosine distance compares direction only, so project onto the unit sphere.

    On unit vectors ||a - b||^2 = 2 (1 - cos(a, b)), so a cosine radius is just
    a Euclidean radius and the same tree serves it.
    """
    if metric != "cosine":
        return X
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    if np.any(norms == 0.0):
        raise ValueError("cosine distance is undefined for zero vectors")
    return X / norms


def _radius(eps: float, metric: Metric) -> float:
    return float(np.sqrt(2.0 * eps)) if metric == "cosine" else eps


@dataclass(frozen=True)
class DbscanModel:
    """A fitted model. The 'model' is the data: core points, eps, the metric."""

    labels: Labels
    core_indices: NDArray[np.int64]
    n_clusters: int
    eps: float
    metric: Metric
    _core_points: Matrix = field(repr=False, compare=False)
    _core_tree: cKDTree | None = field(repr=False, compare=False)

    def predict(self, X: Matrix) -> Labels:
        """Nearest-core rule: adopt the cluster of the closest core point if it
        is within eps, otherwise NOISE. sklearn has no such method, and a port
        that implements it differently in serving shifts every verdict."""
        if X.ndim != 2 or X.shape[1] != self._core_points.shape[1]:
            raise ValueError(
                f"expected (n, {self._core_points.shape[1]}) input, got {X.shape}"
            )
        out = np.full(X.shape[0], NOISE, dtype=np.int64)
        if self._core_tree is None:
            return out

        points = _normalise(X, self.metric)
        distance, nearest = self._core_tree.query(
            points,
            k=1,
            p=_MINKOWSKI_P[self.metric],
            distance_upper_bound=_radius(self.eps, self.metric),
        )
        reachable = np.isfinite(distance)
        out[reachable] = self.labels[self.core_indices[nearest[reachable]]]
        return out


def fit(
    X: Matrix,
    eps: float,
    min_samples: int,
    metric: Metric = "euclidean",
) -> DbscanModel:
    """Cluster X. min_samples counts the point itself, as scikit-learn does.

    Raises ValueError on malformed input.
    """
    if X.ndim != 2 or X.shape[0] == 0:
        raise ValueError(f"X must be a non-empty 2-D array, got shape {X.shape}")
    if not np.isfinite(X).all():
        raise ValueError("X contains NaN or infinity")
    if eps <= 0.0:
        raise ValueError(f"eps must be positive, got {eps}")
    if min_samples < 1:
        raise ValueError(f"min_samples must be at least 1, got {min_samples}")
    if metric not in _MINKOWSKI_P:
        raise ValueError(f"metric must be one of {sorted(_MINKOWSKI_P)}, got {metric}")

    points = _normalise(X, metric)
    radius = _radius(eps, metric)
    p = _MINKOWSKI_P[metric]
    tree = cKDTree(points)
    n = points.shape[0]

    labels = np.full(n, UNVISITED, dtype=np.int64)
    is_core = np.zeros(n, dtype=bool)
    frontier: deque[int] = deque()
    cluster = 0

    for seed in range(n):
        if labels[seed] != UNVISITED:
            continue

        neighbours = tree.query_ball_point(points[seed], r=radius, p=p)
        if len(neighbours) < min_samples:
            labels[seed] = NOISE
            continue

        is_core[seed] = True
        labels[seed] = cluster
        frontier.clear()
        frontier.extend(neighbours)

        while frontier:
            candidate = frontier.popleft()
            if labels[candidate] == NOISE:
                labels[candidate] = cluster          # border: label, never expand
                continue
            if labels[candidate] != UNVISITED:
                continue

            labels[candidate] = cluster
            reachable = tree.query_ball_point(points[candidate], r=radius, p=p)
            if len(reachable) >= min_samples:
                is_core[candidate] = True
                frontier.extend(reachable)

        cluster += 1

    core_indices = np.flatnonzero(is_core).astype(np.int64)
    core_points = points[core_indices]
    return DbscanModel(
        labels=labels,
        core_indices=core_indices,
        n_clusters=cluster,
        eps=eps,
        metric=metric,
        _core_points=core_points,
        _core_tree=cKDTree(core_points) if core_indices.size else None,
    )`,
        rationale:
          'The brute-force region query becomes a kd-tree range search, which is the change that moves the cost from O(n^2) to roughly O(n log n) in low dimension — the algorithm is n region queries, so the index is the algorithm. The metric is now an explicit, validated choice rather than a hard-wired Euclidean: Manhattan and Chebyshev are the same tree with a different Minkowski p (a diamond and a cube instead of a sphere), and cosine is handled by projecting onto the unit sphere, where a cosine radius becomes a Euclidean one. The fitted result is a frozen dataclass that keeps the core points, because a DBSCAN model is its data, and it gains the predict() the standard implementation lacks — a nearest-core rule with a hard radius — so that serving and training use one definition. Inputs are validated up front, with the min_samples convention (self-inclusive) stated.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy / SciPy',
        profile: 'O(n log n) region queries in low dimension, but still one Python call per point; degrades toward O(n^2) as dimension grows and the tree stops pruning.',
      },
      'make-it-fast': {
        code: `"""DBSCAN as connected components - batched queries, no Python loop over points.

DBSCAN clusters are the connected components of the graph whose vertices are
the core points and whose edges join two cores within eps. That restatement
removes the queue-and-expand loop entirely: count neighbours in one batched
call, find the cores, build the core-core edge list, and hand it to a sparse
connected-components routine. Border points then attach to their nearest core.
"""

import numpy as np
from numpy.typing import NDArray
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]

NOISE = -1


def k_distance_curve(X: Matrix, k: int, p: float = 2.0) -> NDArray[np.float64]:
    """Sorted k-th neighbour distance for every point, in one batched query."""
    design = np.ascontiguousarray(X, dtype=np.float64)
    distances, _ = cKDTree(design).query(design, k=k, p=p, workers=-1)
    return np.sort(distances[:, -1])


def dbscan(X: Matrix, eps: float, min_samples: int, p: float = 2.0) -> Labels:
    points = np.ascontiguousarray(X, dtype=np.float64)
    n = points.shape[0]

    # 1. Every neighbourhood SIZE at once. return_length avoids materializing
    #    n Python lists of indices, which is where the time and memory went.
    tree = cKDTree(points)
    counts = tree.query_ball_point(
        points, r=eps, p=p, return_length=True, workers=-1
    )
    is_core = counts >= min_samples

    labels = np.full(n, NOISE, dtype=np.int64)
    core_index = np.flatnonzero(is_core)
    if core_index.size == 0:
        return labels

    # 2. Core-core edges, then connected components over the core graph.
    core_points = points[core_index]
    core_tree = cKDTree(core_points)
    pairs = core_tree.query_pairs(r=eps, p=p, output_type="ndarray")

    m = core_index.size
    graph = coo_matrix(
        (np.ones(len(pairs), dtype=np.int8), (pairs[:, 0], pairs[:, 1])),
        shape=(m, m),
    ).tocsr()
    _, core_labels = connected_components(graph, directed=False)
    labels[core_index] = core_labels

    # 3. Border points: nearest core within eps, else stay noise. One batched
    #    nearest-neighbour query, with the radius as a hard upper bound.
    border = np.flatnonzero(~is_core)
    if border.size:
        distance, nearest = core_tree.query(
            points[border], k=1, p=p, distance_upper_bound=eps, workers=-1
        )
        reachable = np.isfinite(distance)
        labels[border[reachable]] = core_labels[nearest[reachable]]

    return labels`,
        rationale:
          'The per-point queue-and-expand loop is gone. DBSCAN is the connected components of the core graph, so the algorithm becomes four array operations: one batched call that returns every neighbourhood size (with return_length, so no list of indices is ever built), a boolean mask for the cores, one query_pairs for the core-core edges, and a sparse connected-components pass that replaces the breadth-first growth. Border points are attached by a single batched nearest-core query with the radius as a hard bound. A side effect is that border assignment becomes deterministic (nearest core) instead of depending on visiting order. Every step runs in compiled code across worker threads.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The seed loop and the frontier queue become a batched neighbour count, a sparse connected-components call and a batched nearest-core query — three compiled passes instead of one interpreter iteration and one tree call per point.',
            tradeoff: 'The edge list is materialized: its size is the number of core-core pairs, which in a dense region approaches the square of that region’s point count, so a large eps on dense data can exhaust memory where the queue version only ever held one frontier.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'query_ball_point with return_length and workers=-1 sizes every neighbourhood in one call across all cores, and the k-distance curve is one batched k-nearest-neighbour query rather than n sorted full scans.',
            tradeoff: 'Counting neighbourhoods and then collecting edges queries the tree twice; the single-pass loop would query once. The extra pass is paid for by being parallel and vectorized, and it is a loss on small inputs where overhead dominates.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The points are forced to one contiguous float64 buffer before the tree is built, so the tree and every query read memory sequentially and never copy or convert per call.',
            tradeoff: 'It copies the input when it arrives in another layout or dtype, doubling peak memory for the largest array in the problem; float32 would halve it and cost precision near the eps boundary.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The label array is allocated once and filled by two masked assignments — cores, then reachable borders — with noise as the default, so no per-cluster list is ever built or concatenated.',
            tradeoff: 'Masked fancy-index assignment still allocates temporary index arrays on the right-hand side, so it is cheaper than a loop but not allocation-free.',
          },
        ],
        libraryName: 'NumPy / SciPy',
        profile: 'O(n log n) tree queries run across all cores plus a linear-time connected-components pass; memory O(n + core-core edges). Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DBSCAN - the definition, transcribed.
//
// CORE: at least min_pts points (itself included) within eps. A cluster is
// grown from a core point by claiming the whole eps-neighbourhood of every
// core point it reaches. BORDER: within eps of a core but not core itself - it
// joins the cluster and the growth stops there. Everything else is NOISE.
#include <cmath>
#include <cstddef>
#include <queue>
#include <vector>

constexpr int kNoise = -1;
constexpr int kUnvisited = -2;

// Euclidean distance: the choice that makes the eps-ball round.
double Distance(const std::vector<double>& a, const std::vector<double>& b) {
  double total = 0.0;
  for (std::size_t j = 0; j < a.size(); ++j) {
    const double difference = a[j] - b[j];
    total += difference * difference;
  }
  return std::sqrt(total);
}

std::vector<std::size_t> RegionQuery(const std::vector<std::vector<double>>& X,
                                     std::size_t i, double eps) {
  std::vector<std::size_t> neighbours;
  for (std::size_t j = 0; j < X.size(); ++j) {
    if (Distance(X[i], X[j]) <= eps) neighbours.push_back(j);
  }
  return neighbours;
}

std::vector<int> Fit(const std::vector<std::vector<double>>& X, double eps,
                     std::size_t min_pts) {
  const std::size_t n = X.size();
  std::vector<int> labels(n, kUnvisited);
  int cluster = 0;

  for (std::size_t seed = 0; seed < n; ++seed) {
    if (labels[seed] != kUnvisited) continue;

    const std::vector<std::size_t> neighbours = RegionQuery(X, seed, eps);
    if (neighbours.size() < min_pts) {
      // Not dense: tentatively noise. A later cluster may claim it as border.
      labels[seed] = kNoise;
      continue;
    }

    labels[seed] = cluster;
    std::queue<std::size_t> frontier;
    for (const std::size_t neighbour : neighbours) frontier.push(neighbour);

    while (!frontier.empty()) {
      const std::size_t candidate = frontier.front();
      frontier.pop();

      if (labels[candidate] == kNoise) {
        labels[candidate] = cluster;     // border: label it, do not expand it
        continue;
      }
      if (labels[candidate] != kUnvisited) continue;

      labels[candidate] = cluster;
      const std::vector<std::size_t> reachable = RegionQuery(X, candidate, eps);
      if (reachable.size() >= min_pts) {
        // candidate is core too, so its whole neighbourhood is reachable.
        for (const std::size_t next : reachable) frontier.push(next);
      }
    }
    ++cluster;
  }
  return labels;
}`,
        profile: 'O(n^2) distance evaluations over nested vectors; every region query scans all n rows and allocates a fresh neighbour list.',
      },
      'make-it-right': {
        code: `// DBSCAN - flat row-major storage, validated up front, owning RAII model.
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

class Dbscan {
 public:
  static constexpr int kNoise = -1;

  // Validates BEFORE any allocation, then constructs. min_pts counts the point
  // itself, matching scikit-learn; a library that does not count it changes
  // which points are core.
  static Dbscan Fit(std::span<const double> x_flat, std::size_t dimension,
                    double eps, std::size_t min_pts) {
    if (dimension == 0 || x_flat.empty()) throw std::invalid_argument("empty problem");
    if (x_flat.size() % dimension != 0) {
      throw std::invalid_argument("X is not a multiple of the dimension");
    }
    if (!(eps > 0.0) || !std::isfinite(eps)) throw std::invalid_argument("eps must be positive");
    if (min_pts == 0) throw std::invalid_argument("min_pts must be at least 1");
    return Dbscan(x_flat, dimension, eps, min_pts);
  }

  [[nodiscard]] std::span<const int> labels() const noexcept { return labels_; }
  [[nodiscard]] int cluster_count() const noexcept { return cluster_count_; }

  // Nearest-core rule. The model IS the data, so there is no separate predict;
  // this must match the training definition or serving disagrees with fitting.
  [[nodiscard]] int Predict(std::span<const double> point) const {
    if (point.size() != dimension_) throw std::invalid_argument("point width mismatch");

    int best_label = kNoise;
    double best = eps_squared_;
    for (std::size_t i = 0; i < is_core_.size(); ++i) {
      if (is_core_[i] == 0) continue;
      const double d2 = SquaredDistance(point.data(), Row(i));
      if (d2 <= best) {
        best = d2;
        best_label = labels_[i];
      }
    }
    return best_label;
  }

 private:
  static constexpr int kUnvisited = -2;

  Dbscan(std::span<const double> x_flat, std::size_t dimension, double eps,
         std::size_t min_pts)
      : x_(x_flat.begin(), x_flat.end()),
        dimension_(dimension),
        eps_squared_(eps * eps),   // compare squared distances: no sqrt per pair
        min_pts_(min_pts),
        labels_(x_flat.size() / dimension, kUnvisited),
        is_core_(x_flat.size() / dimension, 0) {
    Run();
  }

  [[nodiscard]] const double* Row(std::size_t i) const noexcept {
    return x_.data() + i * dimension_;
  }

  [[nodiscard]] double SquaredDistance(const double* a, const double* b) const noexcept {
    double total = 0.0;
    for (std::size_t j = 0; j < dimension_; ++j) {
      const double difference = a[j] - b[j];
      total += difference * difference;
    }
    return total;
  }

  // Fills a caller-owned buffer, so a region query allocates nothing after the
  // first few calls.
  void RegionQuery(std::size_t i, std::vector<std::size_t>& out) const {
    out.clear();
    const double* centre = Row(i);
    const std::size_t n = labels_.size();
    for (std::size_t j = 0; j < n; ++j) {
      if (SquaredDistance(centre, Row(j)) <= eps_squared_) out.push_back(j);
    }
  }

  void Run() {
    const std::size_t n = labels_.size();
    std::vector<std::size_t> neighbours;
    std::vector<std::size_t> reachable;
    std::vector<std::size_t> frontier;   // used as a stack: order only affects borders

    for (std::size_t seed = 0; seed < n; ++seed) {
      if (labels_[seed] != kUnvisited) continue;

      RegionQuery(seed, neighbours);
      if (neighbours.size() < min_pts_) {
        labels_[seed] = kNoise;
        continue;
      }

      is_core_[seed] = 1;
      labels_[seed] = cluster_count_;
      frontier.assign(neighbours.begin(), neighbours.end());

      while (!frontier.empty()) {
        const std::size_t candidate = frontier.back();
        frontier.pop_back();

        if (labels_[candidate] == kNoise) {
          labels_[candidate] = cluster_count_;    // border: label, never expand
          continue;
        }
        if (labels_[candidate] != kUnvisited) continue;

        labels_[candidate] = cluster_count_;
        RegionQuery(candidate, reachable);
        if (reachable.size() >= min_pts_) {
          is_core_[candidate] = 1;
          frontier.insert(frontier.end(), reachable.begin(), reachable.end());
        }
      }
      ++cluster_count_;
    }
  }

  std::vector<double> x_;               // owned row-major copy: the model is its data
  std::size_t dimension_;
  double eps_squared_;
  std::size_t min_pts_;
  std::vector<int> labels_;
  std::vector<unsigned char> is_core_;  // not vector<bool>: addressable, no proxy
  int cluster_count_ = 0;
};`,
        rationale:
          'The nested vectors become one flat row-major buffer, owned by the object, so a distance walks contiguous memory and the model keeps the data that nearest-core prediction needs. Distances are compared squared against eps squared, which removes a sqrt from every pair — it is the innermost operation, executed n^2 times. The region query writes into a reused buffer rather than returning a fresh vector each call, and the queue becomes a vector used as a stack, since only border assignment depends on visiting order. Construction is a validated factory that rejects bad input before any allocation, the core flags are retained, and a Predict applies the nearest-core rule so that serving shares one definition with training. The scan is still brute force; the index is the next stage.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n^2) squared-distance evaluations over contiguous rows, with no sqrt and no per-query allocation.',
      },
      'make-it-fast': {
        code: `// DBSCAN, 2-D - uniform grid index, OpenMP neighbour counting, union-find.
//
// A grid with cell size eps means every neighbour of a point lies in its own
// cell or one of the 8 adjacent ones, so a region query touches 9 cells instead
// of n points. Clusters are connected components of the core graph, which makes
// the merge a union-find over core-core edges rather than a sequential queue.
// Build with: -O3 -march=native -fopenmp
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <numeric>
#include <omp.h>
#include <span>
#include <stdexcept>
#include <unordered_map>
#include <utility>
#include <vector>

namespace dbscan2d {

constexpr int kNoise = -1;

struct CellRange {
  std::uint32_t begin;
  std::uint32_t end;
};

// Points are SORTED by grid cell, so each cell is one contiguous run of the
// coordinate array and scanning a cell is a sequential read.
class GridIndex {
 public:
  GridIndex(std::span<const double> xy, double cell) : inv_cell_(1.0 / cell) {
    const std::size_t n = xy.size() / 2;
    std::vector<std::int64_t> keys(n);
    for (std::size_t i = 0; i < n; ++i) keys[i] = KeyOf(xy[2 * i], xy[2 * i + 1]);

    order_.resize(n);
    std::iota(order_.begin(), order_.end(), 0u);
    std::sort(order_.begin(), order_.end(),
              [&keys](std::uint32_t a, std::uint32_t b) { return keys[a] < keys[b]; });

    sorted_.resize(2 * n);
    for (std::size_t s = 0; s < n; ++s) {
      sorted_[2 * s] = xy[2 * order_[s]];
      sorted_[2 * s + 1] = xy[2 * order_[s] + 1];
    }

    cells_.reserve(n);
    std::size_t run_start = 0;
    for (std::size_t s = 1; s <= n; ++s) {
      if (s == n || keys[order_[s]] != keys[order_[run_start]]) {
        cells_[keys[order_[run_start]]] = {static_cast<std::uint32_t>(run_start),
                                           static_cast<std::uint32_t>(s)};
        run_start = s;
      }
    }
  }

  [[nodiscard]] std::size_t size() const noexcept { return order_.size(); }
  [[nodiscard]] std::uint32_t Original(std::size_t s) const noexcept { return order_[s]; }

  // Calls visit(t, squared_distance) for every point within eps of sorted point s.
  template <typename Visit>
  void ForEachNeighbour(std::size_t s, double eps_squared, Visit&& visit) const {
    const double x = sorted_[2 * s];
    const double y = sorted_[2 * s + 1];
    const auto cx = static_cast<std::int64_t>(std::floor(x * inv_cell_));
    const auto cy = static_cast<std::int64_t>(std::floor(y * inv_cell_));

    for (std::int64_t dx = -1; dx <= 1; ++dx) {
      for (std::int64_t dy = -1; dy <= 1; ++dy) {
        const auto found = cells_.find(Pack(cx + dx, cy + dy));
        if (found == cells_.end()) continue;
        for (std::uint32_t t = found->second.begin; t < found->second.end; ++t) {
          const double ddx = sorted_[2 * t] - x;
          const double ddy = sorted_[2 * t + 1] - y;
          const double d2 = ddx * ddx + ddy * ddy;
          if (d2 <= eps_squared) visit(t, d2);
        }
      }
    }
  }

 private:
  static std::int64_t Pack(std::int64_t cx, std::int64_t cy) {
    return (cx << 32) ^ (cy & 0xFFFFFFFFLL);
  }
  [[nodiscard]] std::int64_t KeyOf(double x, double y) const {
    return Pack(static_cast<std::int64_t>(std::floor(x * inv_cell_)),
                static_cast<std::int64_t>(std::floor(y * inv_cell_)));
  }

  double inv_cell_;
  std::vector<std::uint32_t> order_;                     // sorted position -> original index
  std::vector<double> sorted_;                           // row-major (n, 2), in cell order
  std::unordered_map<std::int64_t, CellRange> cells_;
};

class DisjointSet {
 public:
  explicit DisjointSet(std::size_t n) : parent_(n) {
    std::iota(parent_.begin(), parent_.end(), 0u);
  }
  std::uint32_t Find(std::uint32_t x) {
    while (parent_[x] != x) {
      parent_[x] = parent_[parent_[x]];   // path halving
      x = parent_[x];
    }
    return x;
  }
  void Union(std::uint32_t a, std::uint32_t b) {
    const std::uint32_t root_a = Find(a);
    const std::uint32_t root_b = Find(b);
    if (root_a != root_b) parent_[std::max(root_a, root_b)] = std::min(root_a, root_b);
  }

 private:
  std::vector<std::uint32_t> parent_;
};

// xy is row-major (n, 2). Returns one label per original point, -1 for noise.
inline std::vector<int> Fit(std::span<const double> xy, double eps, std::size_t min_pts) {
  if (xy.empty() || xy.size() % 2 != 0) throw std::invalid_argument("xy must be (n, 2)");
  if (!(eps > 0.0) || min_pts == 0) throw std::invalid_argument("bad eps or min_pts");

  const std::size_t n = xy.size() / 2;
  const double eps_squared = eps * eps;
  const GridIndex grid(xy, eps);

  // Pass 1: which points are core. Independent per point, so a plain
  // parallel-for; each iteration writes only its own byte.
  std::vector<std::uint8_t> is_core(n, 0);
#pragma omp parallel for schedule(dynamic, 1024)
  for (std::size_t s = 0; s < n; ++s) {
    std::size_t count = 0;
    grid.ForEachNeighbour(s, eps_squared, [&count](std::uint32_t, double) { ++count; });
    is_core[s] = count >= min_pts ? 1 : 0;
  }

  // Pass 2: core-core edges into per-thread buffers - no shared writes.
  using Edge = std::pair<std::uint32_t, std::uint32_t>;
  std::vector<std::vector<Edge>> edges_by_thread(omp_get_max_threads());
#pragma omp parallel
  {
    std::vector<Edge>& local = edges_by_thread[omp_get_thread_num()];
#pragma omp for schedule(dynamic, 1024)
    for (std::size_t s = 0; s < n; ++s) {
      if (is_core[s] == 0) continue;
      grid.ForEachNeighbour(s, eps_squared, [&](std::uint32_t t, double) {
        if (t > s && is_core[t] != 0) local.emplace_back(static_cast<std::uint32_t>(s), t);
      });
    }
  }

  // Merge: connected components of the core graph. Cheap next to the queries.
  DisjointSet sets(n);
  for (const std::vector<Edge>& local : edges_by_thread) {
    for (const Edge& edge : local) sets.Union(edge.first, edge.second);
  }

  std::vector<int> sorted_label(n, kNoise);
  std::vector<int> label_of_root(n, kNoise);
  int next_label = 0;
  for (std::size_t s = 0; s < n; ++s) {
    if (is_core[s] == 0) continue;
    const std::uint32_t root = sets.Find(static_cast<std::uint32_t>(s));
    if (label_of_root[root] == kNoise) label_of_root[root] = next_label++;
    sorted_label[s] = label_of_root[root];
  }

  // Pass 3: each border point takes its nearest core's label. Reads only core
  // labels (finished above) and writes only its own slot.
#pragma omp parallel for schedule(dynamic, 1024)
  for (std::size_t s = 0; s < n; ++s) {
    if (is_core[s] != 0) continue;
    double best = eps_squared + 1.0;
    int label = kNoise;
    grid.ForEachNeighbour(s, eps_squared, [&](std::uint32_t t, double d2) {
      if (is_core[t] != 0 && d2 < best) {
        best = d2;
        label = sorted_label[t];
      }
    });
    sorted_label[s] = label;
  }

  std::vector<int> labels(n, kNoise);
  for (std::size_t s = 0; s < n; ++s) labels[grid.Original(s)] = sorted_label[s];
  return labels;
}

}  // namespace dbscan2d`,
        rationale:
          'Two structural changes, both consequences of what DBSCAN is. First, the region query stops scanning n points: a uniform grid with cell size eps guarantees every neighbour is in the point’s own cell or one of eight adjacent ones, and the points are physically sorted by cell so each cell is a contiguous run. Second, clusters are the connected components of the core graph, so the sequential queue disappears: neighbour counting and edge collection are independent per point and run under OpenMP, with per-thread edge buffers and no shared writes, and a union-find merges them once. Border points take their nearest core in a final parallel pass, which makes them deterministic. The sample is deliberately 2-D, which is the geographic and trajectory case; the grid needs 3^d cells per query, so higher dimension wants a kd-tree instead.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Points are sorted into grid-cell order and stored as one contiguous (n, 2) array, so each cell a query visits is a sequential run of memory instead of scattered rows reached through an index.',
            tradeoff: 'The sort costs O(n log n) up front and every result must be mapped back through the permutation, so the speedup is paid for in a one-off setup and an extra indirection on output.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Neighbour counting, edge collection and border assignment are each independent per point; per-thread edge buffers mean the parallel region contains no locks or atomics, and only the cheap union-find merge is sequential.',
            tradeoff: 'Dynamic scheduling is needed because dense cells make some points far costlier than others, and in a dense region the number of core-core edges per thread can grow with the square of the cell population, so memory rises with density.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The inner distance loop is short and branch-light, and the compiler vectorizes the subtract-multiply-accumulate and inlines the templated visitor into it.',
            tradeoff: 'A -march=native binary uses instructions specific to the build machine and can crash with an illegal-instruction fault when deployed to an older CPU, so it is a poor default for anything shipped to heterogeneous hosts.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'Roughly O(n) grid queries for bounded density, parallel across cores, plus a near-linear union-find merge; degrades to O(n^2) when eps is large enough that every cell holds a constant fraction of the data. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! DBSCAN - the definition, transcribed.
//!
//! CORE: at least min_pts points (itself included) within eps. A cluster is
//! grown from a core point by claiming the eps-neighbourhood of every core
//! point it reaches. BORDER: within eps of a core but not core itself - it
//! joins the cluster, and the growth stops there. Everything else is NOISE.

use std::collections::VecDeque;

const NOISE: i64 = -1;
const UNVISITED: i64 = -2;

/// Euclidean distance: the choice that makes the eps-ball round.
fn distance(a: &[f64], b: &[f64]) -> f64 {
    let mut total = 0.0;
    for j in 0..a.len() {
        let difference = a[j] - b[j];
        total += difference * difference;
    }
    total.sqrt()
}

fn region_query(x: &[Vec<f64>], i: usize, eps: f64) -> Vec<usize> {
    let mut neighbours = Vec::new();
    for j in 0..x.len() {
        if distance(&x[i], &x[j]) <= eps {
            neighbours.push(j);
        }
    }
    neighbours
}

pub fn fit(x: &[Vec<f64>], eps: f64, min_pts: usize) -> Vec<i64> {
    let n = x.len();
    let mut labels = vec![UNVISITED; n];
    let mut cluster: i64 = 0;

    for seed in 0..n {
        if labels[seed] != UNVISITED {
            continue;
        }

        let neighbours = region_query(x, seed, eps);
        if neighbours.len() < min_pts {
            // Not dense: tentatively noise. A later cluster may claim it as border.
            labels[seed] = NOISE;
            continue;
        }

        labels[seed] = cluster;
        let mut frontier: VecDeque<usize> = VecDeque::new();
        for neighbour in neighbours {
            frontier.push_back(neighbour);
        }

        while let Some(candidate) = frontier.pop_front() {
            if labels[candidate] == NOISE {
                labels[candidate] = cluster; // border: label it, do not expand it
                continue;
            }
            if labels[candidate] != UNVISITED {
                continue;
            }

            labels[candidate] = cluster;
            let reachable = region_query(x, candidate, eps);
            if reachable.len() >= min_pts {
                // candidate is core too, so its whole neighbourhood is reachable.
                for next in reachable {
                    frontier.push_back(next);
                }
            }
        }
        cluster += 1;
    }

    labels
}`,
        profile: 'O(n^2) distance evaluations; every index is bounds-checked, rows are scattered across the heap, and each region query allocates a new Vec.',
      },
      'make-it-right': {
        code: `//! DBSCAN - typed errors, validated newtypes, a flat buffer, iterator chains.

use std::collections::VecDeque;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum DbscanError {
    Empty,
    ShapeMismatch { len: usize, dimension: usize },
    NonFinite,
    InvalidEps(f64),
    InvalidMinPts,
}

impl fmt::Display for DbscanError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { len, dimension } => {
                write!(f, "{len} values is not a multiple of dimension {dimension}")
            }
            Self::NonFinite => write!(f, "input contains NaN or infinity"),
            Self::InvalidEps(eps) => write!(f, "eps must be positive and finite, got {eps}"),
            Self::InvalidMinPts => write!(f, "min_pts must be at least 1"),
        }
    }
}

impl std::error::Error for DbscanError {}

/// Neighbourhood radius. A newtype because eps, min_pts and the dimension are
/// all bare numbers at every call site, and an eps in kilometres passed where
/// radians were meant is a silent error rather than a compile error.
#[derive(Debug, Clone, Copy)]
pub struct Eps(f64);

impl Eps {
    pub fn new(value: f64) -> Result<Self, DbscanError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(DbscanError::InvalidEps(value));
        }
        Ok(Self(value))
    }
}

/// Density threshold. Counts the point itself, as scikit-learn does.
#[derive(Debug, Clone, Copy)]
pub struct MinPts(usize);

impl MinPts {
    pub fn new(value: usize) -> Result<Self, DbscanError> {
        if value == 0 {
            return Err(DbscanError::InvalidMinPts);
        }
        Ok(Self(value))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Label {
    Noise,
    Cluster(usize),
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Slot {
    Unvisited,
    Noise,
    Cluster(usize),
}

fn squared_distance(a: &[f64], b: &[f64]) -> f64 {
    a.iter()
        .zip(b)
        .map(|(p, q)| {
            let difference = p - q;
            difference * difference
        })
        .sum()
}

/// Fills a caller-owned buffer, so a region query allocates nothing after the
/// first few calls. Compares squared distances: no sqrt per pair.
fn region_query(
    x_flat: &[f64],
    dimension: usize,
    eps_squared: f64,
    index: usize,
    out: &mut Vec<usize>,
) {
    out.clear();
    let centre = &x_flat[index * dimension..(index + 1) * dimension];
    out.extend(
        x_flat
            .chunks_exact(dimension)
            .enumerate()
            .filter(|(_, point)| squared_distance(centre, point) <= eps_squared)
            .map(|(candidate, _)| candidate),
    );
}

/// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
pub fn fit(
    x_flat: &[f64],
    dimension: usize,
    eps: Eps,
    min_pts: MinPts,
) -> Result<Vec<Label>, DbscanError> {
    if dimension == 0 || x_flat.is_empty() {
        return Err(DbscanError::Empty);
    }
    if x_flat.len() % dimension != 0 {
        return Err(DbscanError::ShapeMismatch { len: x_flat.len(), dimension });
    }
    if x_flat.iter().any(|value| !value.is_finite()) {
        return Err(DbscanError::NonFinite);
    }

    let n = x_flat.len() / dimension;
    let eps_squared = eps.0 * eps.0;
    let mut slots = vec![Slot::Unvisited; n];
    let mut neighbours: Vec<usize> = Vec::new();
    let mut reachable: Vec<usize> = Vec::new();
    let mut frontier: VecDeque<usize> = VecDeque::new();
    let mut cluster = 0_usize;

    for seed in 0..n {
        if slots[seed] != Slot::Unvisited {
            continue;
        }

        region_query(x_flat, dimension, eps_squared, seed, &mut neighbours);
        if neighbours.len() < min_pts.0 {
            slots[seed] = Slot::Noise;
            continue;
        }

        slots[seed] = Slot::Cluster(cluster);
        frontier.clear();
        frontier.extend(neighbours.iter().copied());

        while let Some(candidate) = frontier.pop_front() {
            match slots[candidate] {
                Slot::Noise => {
                    slots[candidate] = Slot::Cluster(cluster); // border: never expand
                    continue;
                }
                Slot::Cluster(_) => continue,
                Slot::Unvisited => {}
            }

            slots[candidate] = Slot::Cluster(cluster);
            region_query(x_flat, dimension, eps_squared, candidate, &mut reachable);
            if reachable.len() >= min_pts.0 {
                frontier.extend(reachable.iter().copied());
            }
        }
        cluster += 1;
    }

    Ok(slots
        .into_iter()
        .map(|slot| match slot {
            Slot::Cluster(id) => Label::Cluster(id),
            Slot::Noise | Slot::Unvisited => Label::Noise,
        })
        .collect())
}`,
        rationale:
          'Structure and safety, not yet the index. The nested Vecs become one flat row-major buffer walked with chunks_exact, so a distance reads contiguous memory and bounds checks leave the inner loop. Distances are compared squared against eps squared, removing a sqrt from every pair. The region query fills a caller-owned buffer instead of allocating a Vec per call. Labels become an enum with a private Slot state, so noise, unvisited and a cluster id are distinct values rather than magic negative integers that downstream code can mistake for an index. Errors are a typed Result instead of panics, and eps and min_pts are validated newtypes, since they sit beside a bare dimension and transposing them is otherwise silent.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n^2) squared-distance evaluations over contiguous rows, with bounds checks elided and no per-query allocation.',
      },
      'make-it-fast': {
        code: `//! DBSCAN - sort-and-sweep index, rayon neighbour counting, union-find.
//!
//! Clusters are the connected components of the core graph, so the sequential
//! queue disappears: neighbour counts and core-core edges are computed in
//! parallel, and a union-find merges them once.

use rayon::prelude::*;

const NOISE: i64 = -1;

/// Points sorted along their first coordinate. A region query binary-searches
/// the window [x - eps, x + eps] on that axis and filters only those candidates
/// by full distance, instead of scanning all n points.
struct SweepIndex {
    order: Vec<usize>, // sorted position -> original index
    points: Vec<f64>,  // row-major, permuted into sweep order
    axis: Vec<f64>,    // first coordinate of each sorted point
    dimension: usize,
}

impl SweepIndex {
    fn new(x_flat: &[f64], dimension: usize) -> Self {
        let n = x_flat.len() / dimension;
        let mut order: Vec<usize> = (0..n).collect();
        order.sort_unstable_by(|&a, &b| {
            x_flat[a * dimension].total_cmp(&x_flat[b * dimension])
        });

        let mut points = Vec::with_capacity(x_flat.len());
        for &original in &order {
            points.extend_from_slice(&x_flat[original * dimension..(original + 1) * dimension]);
        }
        let axis: Vec<f64> = points.chunks_exact(dimension).map(|row| row[0]).collect();

        Self { order, points, axis, dimension }
    }

    fn len(&self) -> usize {
        self.order.len()
    }

    fn row(&self, s: usize) -> &[f64] {
        &self.points[s * self.dimension..(s + 1) * self.dimension]
    }

    fn squared(&self, a: usize, b: usize) -> f64 {
        self.row(a)
            .iter()
            .zip(self.row(b))
            .map(|(p, q)| (p - q) * (p - q))
            .sum()
    }

    fn neighbours(&self, s: usize, eps: f64, eps_squared: f64) -> impl Iterator<Item = usize> + '_ {
        let x = self.axis[s];
        let lo = self.axis.partition_point(|&value| value < x - eps);
        let hi = self.axis.partition_point(|&value| value <= x + eps);
        (lo..hi).filter(move |&t| self.squared(s, t) <= eps_squared)
    }
}

struct DisjointSet {
    parent: Vec<usize>,
}

impl DisjointSet {
    fn new(n: usize) -> Self {
        Self { parent: (0..n).collect() }
    }

    fn find(&mut self, mut x: usize) -> usize {
        while self.parent[x] != x {
            self.parent[x] = self.parent[self.parent[x]]; // path halving
            x = self.parent[x];
        }
        x
    }

    fn union(&mut self, a: usize, b: usize) {
        let (root_a, root_b) = (self.find(a), self.find(b));
        if root_a != root_b {
            self.parent[root_a.max(root_b)] = root_a.min(root_b);
        }
    }
}

/// x_flat is row-major. Returns one label per original point, -1 for noise.
pub fn fit_parallel(x_flat: &[f64], dimension: usize, eps: f64, min_pts: usize) -> Vec<i64> {
    debug_assert!(dimension > 0 && x_flat.len() % dimension == 0);

    let index = SweepIndex::new(x_flat, dimension);
    let n = index.len();
    let eps_squared = eps * eps;
    let index = &index;

    // Pass 1: which points are core. Independent per point.
    let is_core: Vec<bool> = (0..n)
        .into_par_iter()
        .map(|s| index.neighbours(s, eps, eps_squared).count() >= min_pts)
        .collect();
    let is_core = &is_core[..];

    // Pass 2: core-core edges, each pair once (t > s), gathered across threads.
    let edges: Vec<(usize, usize)> = (0..n)
        .into_par_iter()
        .filter(|&s| is_core[s])
        .flat_map_iter(|s| {
            index
                .neighbours(s, eps, eps_squared)
                .filter(move |&t| t > s && is_core[t])
                .map(move |t| (s, t))
        })
        .collect();

    // Merge: connected components of the core graph.
    let mut sets = DisjointSet::new(n);
    for &(a, b) in &edges {
        sets.union(a, b);
    }

    let mut sorted_label = vec![NOISE; n];
    let mut label_of_root = vec![NOISE; n];
    let mut next_label: i64 = 0;
    for s in (0..n).filter(|&s| is_core[s]) {
        let root = sets.find(s);
        if label_of_root[root] == NOISE {
            label_of_root[root] = next_label;
            next_label += 1;
        }
        sorted_label[s] = label_of_root[root];
    }

    // Pass 3: each border point takes its nearest core's label, in parallel.
    let core_label = &sorted_label[..];
    let border_label: Vec<(usize, i64)> = (0..n)
        .into_par_iter()
        .filter(|&s| !is_core[s])
        .filter_map(|s| {
            index
                .neighbours(s, eps, eps_squared)
                .filter(|&t| is_core[t])
                .min_by(|&a, &b| index.squared(s, a).total_cmp(&index.squared(s, b)))
                .map(|nearest| (s, core_label[nearest]))
        })
        .collect();
    for (s, label) in border_label {
        sorted_label[s] = label;
    }

    let mut labels = vec![NOISE; n];
    for (s, &original) in index.order.iter().enumerate() {
        labels[original] = sorted_label[s];
    }
    labels
}`,
        rationale:
          'The brute-force scan is replaced by a sort-and-sweep index: points are sorted along their first coordinate, and a region query binary-searches the window of width 2·eps on that axis and filters only those candidates by full distance. The sequential frontier queue is replaced by the connected-components view of DBSCAN: core flags and core-core edges are produced by rayon in parallel — each point’s query is independent — and a single union-find merges the edges, with border points attached to their nearest core in a final parallel pass. Both the sorted points and the output are plain contiguous buffers, with capacities known up front.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Every point’s neighbour count, core-core edges and border lookup are independent of every other point’s, so each pass is a parallel map or flat_map over indices and the only sequential work is the union-find merge.',
            tradeoff: 'The merge and the edge list are sequential and materialized: with a large eps on dense data the edge Vec grows with the square of a dense region’s population, so memory and the single-threaded merge become the bottleneck, not the queries.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The permuted point buffer has a known final size, so it is allocated once at exactly that capacity instead of growing by doubling through a million extend calls.',
            tradeoff: 'It saves reallocation only where the final size is known in advance, which is true for the point buffer and false for the edge list, which has to grow.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Points are stored row-major in sweep order and rows are read as plain slices, so each candidate in the sweep window is a sequential read and the filter walks memory in the order it was sorted.',
            tradeoff: 'The sweep index prunes along one axis only, so it is effective only when that coordinate separates the data well; with a poorly discriminating first axis or in higher dimension the window holds nearly everything and it degrades toward the quadratic scan. A kd-tree is the general fix.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n log n) sort plus O(window size) per query across all cores and a near-linear union-find merge; degrades toward O(n^2) when the sweep window is wide. Illustrative, not a measured benchmark.',
      },
    },
  },
};
