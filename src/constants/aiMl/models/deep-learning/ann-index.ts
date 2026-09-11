import type { AiMlModel } from '../../types';

/**
 * ANN index — the entry that is honestly a data structure.
 *
 * Every embedding model in this reference produces vectors nobody can use
 * until something can search them, and that something is not a model. It is
 * included as a `technique` because the retrieval half of every RAG,
 * recommendation and semantic-search system lives here, and because it is
 * the clearest case in the whole reference of an explicit accuracy-for-speed
 * trade that is chosen rather than discovered.
 */
export const ANN_INDEX: AiMlModel = {
  slug: 'ann-index',
  name: 'ANN Index & Vector Search (HNSW, IVF-PQ)',
  aliases: ['HNSW', 'IVF-PQ', 'Approximate nearest neighbour', 'Vector index', 'Vector database'],
  category: 'deep-learning',
  group: 'retrieval',
  kind: 'technique',

  paradigms: ['unsupervised'],
  taskTypes: ['ranking', 'clustering', 'anomaly-detection'],
  architecture: 'feedforward',
  paradigmNote:
    'A technique and a data structure rather than a model: nothing is trained by gradient descent, and the only fitting involved is the k-means clustering and quantizer codebooks that IVF-PQ builds over the vectors it is given. It is classified feedforward only because the schema requires an architecture for this category; the honest answer is that it has none, which is itself the point of including it.',

  intuition:
    'Once a model has turned a million documents into a million vectors, answering a query means finding the nearest few — and comparing against all million is too slow. So give up exactness: build a structure that looks at a few thousand candidates instead of a million and usually finds the same answer. The word "usually" is the entire subject. An ANN index does not fail by being slow, it fails by silently returning the second-best neighbour, and how often it does so is a dial you set rather than a property you measure once.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\max_{\\mathcal{I}} \\ \\mathrm{Recall@}k = \\frac{1}{|Q|}\\sum_{q \\in Q} \\frac{|\\mathcal{I}(q) \\cap \\mathcal{N}_k(q)|}{k} \\quad \\text{s.t.} \\quad \\mathbb{E}[t(q)] \\le \\tau, \\ \\ \\mathrm{mem}(\\mathcal{I}) \\le M',
      symbols: [
        { symbol: '\\mathcal{N}_k(q)', meaning: 'the true k nearest neighbours under brute force — the ground truth the index is approximating' },
        { symbol: '\\mathcal{I}(q)', meaning: 'what the index actually returns; recall is the overlap between the two' },
        { symbol: '\\tau', meaning: 'the latency budget, which is a hard constraint set by the product rather than by the algorithm' },
        { symbol: 'M', meaning: 'the memory budget — usually the binding constraint at scale, and what forces quantization' },
        { symbol: 'Q', meaning: 'a query workload representative of production; recall measured on the wrong workload is meaningless' },
      ],
    },
    reading:
      'This is a constrained optimization rather than a loss being minimized by gradient descent, and writing it that way makes the trade explicit: maximize recall subject to latency and memory. Every knob in every index moves along that frontier and nothing escapes it. Two consequences follow. Recall is measured against brute force, so you need the exact answer on a sample to know how well the approximation is doing — and teams routinely skip that, which means they have no idea what their retrieval is actually returning. And because the constraint is on expected latency, the tail is not controlled at all: an index tuned to a mean of five milliseconds can have a ninety-ninth percentile many times that.',
  },

  optimization: {
    method: 'Graph traversal with a bounded candidate frontier (HNSW), or coarse clustering plus compressed residuals (IVF-PQ)',
    updateRule: {
      formula:
        '\\text{HNSW: } |C| = \\mathrm{efSearch}, \\quad O(\\log N)\\ \\text{hops} \\qquad \\text{IVF-PQ: } d(q,x) \\approx \\sum_{m=1}^{M} \\lVert q_m - c_{m,k_m(x)}\\rVert^2',
      symbols: [
        { symbol: '\\mathrm{efSearch}', meaning: 'the candidate frontier size — the single dial trading recall against latency at query time' },
        { symbol: 'M', meaning: 'subquantizer count in PQ: the vector is split into M pieces, each coded to one byte' },
        { symbol: 'c_{m,k}', meaning: 'the k-th centroid of the m-th subspace codebook, fitted by k-means over the training vectors' },
        { symbol: 'k_m(x)', meaning: 'which centroid vector x uses in subspace m — one byte, which is the entire compression' },
        { symbol: 'n_{\\mathrm{probe}}', meaning: 'how many coarse clusters IVF actually visits; its equivalent of efSearch' },
      ],
    },
    rationale:
      'Two families with genuinely different trade profiles, and choosing between them is the decision that matters. HNSW builds a multi-layer proximity graph where upper layers are sparse long-range links and lower ones are dense local links, so a search descends from a coarse hop to a fine walk — greedy traversal with a bounded frontier, giving logarithmic hops and excellent recall, at the cost of holding full vectors plus graph edges in memory. That memory cost is the whole story: it is usually several times the raw vectors, which at a billion vectors is decisive. IVF-PQ attacks memory instead. Coarse k-means partitions the space so a query probes only a few cells, and product quantization splits each vector into subvectors coded to one byte each, compressing a 768-dimensional float vector into perhaps 96 bytes — a 32-fold reduction. Distances are then computed against codebook entries via a precomputed lookup table, so the arithmetic is table lookups rather than floating-point. The price is that the distances are approximate twice over, from the partitioning and from the compression, and recall falls accordingly.',
    hyperparameters: [
      { name: 'M (HNSW degree)', role: 'Edges per node per layer. Drives both memory and recall; the main build-time quality lever', typicalRange: '16 to 64' },
      { name: 'efConstruction', role: 'Frontier size during build. Higher gives a better graph and a slower, one-off build', typicalRange: '100 to 500' },
      { name: 'efSearch', role: 'Frontier size at query time — the dial you actually turn in production, adjustable without a rebuild', typicalRange: '50 to 500' },
      { name: 'nlist (IVF)', role: 'Number of coarse clusters; roughly the square root of the collection size is the usual starting point', typicalRange: '4 * sqrt(N) to 16 * sqrt(N)' },
      { name: 'nprobe', role: 'Clusters visited per query. IVF’s recall-latency dial, also adjustable at query time', typicalRange: '8 to 128' },
      { name: 'PQ subquantizers', role: 'Bytes per compressed vector. Must divide the dimension; sets the compression ratio directly', typicalRange: '8 to 96' },
      { name: 'rerank depth', role: 'How many approximate candidates to rescore with exact distances — cheap, and recovers most of the lost recall', typicalRange: '2x to 10x k' },
    ],
    convergence:
      'Nothing converges, because nothing is trained — which is precisely why the failure modes are unlike the rest of this reference. There is no loss curve and no validation metric that moves; an index either returns good neighbours or quietly does not, and the only way to know is to compare against brute force on a sample. Three characteristic failures. Recall degrades as the collection grows, because parameters tuned at a million vectors are wrong at a hundred million and nothing reports the drift. Deletions in a graph index leave tombstones that fragment connectivity, so a long-lived index with heavy churn slowly loses recall until it is rebuilt. And distribution shift in the embeddings — a new model version, or a new content domain — invalidates IVF centroids and PQ codebooks that were fitted to the old distribution, which shows up as a recall drop with no other symptom anywhere in the system.',
    complexity:
      'HNSW search is O(log N) hops with efSearch distance computations per hop, and memory is the full vectors plus roughly M edges per node — typically several times the raw vector size. IVF-PQ search is O(nprobe · N/nlist) table lookups, with memory of one byte per subquantizer per vector plus the codebooks. Build is the expensive half for both: HNSW is O(N log N) distance computations and is genuinely slow at scale.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'It retrieves neighbours in a vector space and has no notion of time, horizon or extrapolation. Nearest-neighbour forecasting exists as a method, but the model there is the k-nearest-neighbours entry and the index would merely be an implementation detail inside it — the index itself forecasts nothing.',
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Distance to the k-th nearest neighbour is a classical anomaly score, and an index makes it affordable on a collection where brute force would not be. Embed everything, index the normal population, and score each new point by how far it sits from its neighbours in that index.',
        where: [
          'Near-duplicate and novelty detection over large document or image collections',
          'Embedding-space outlier detection where the collection is too large for exact k-NN',
          'Fraud-ring detection on entity embeddings, where isolation in the embedding space is the signal',
          'Content moderation, where distance from known-good clusters is the first-pass filter',
        ],
        why: 'It makes a method that was always sound but computationally infeasible practical at scale — distance-based outlier detection over a hundred million vectors is simply not available without an index. The catch is specific and important: an anomaly is by definition far from everything, which is exactly the regime where approximate search is least reliable, because the graph traversal or cluster probe is guided by proximity that the anomalous point does not have. So the index under-performs precisely on the points that matter, and recall measured on typical queries badly overstates recall on anomalous ones. Measure it separately on known outliers, or the detector is weaker than the benchmark suggests.',
        featurization: [
          'Normalize vectors if using cosine distance, since most indexes assume inner product on unit vectors and silently misrank otherwise',
          'Measure recall specifically on known anomalous queries, not just on typical ones — the two differ substantially and only one matters here',
          'Raise efSearch or nprobe for scoring rather than for ordinary retrieval; the extra latency is affordable in a batch detector',
          'Build the index from a verified-normal population, since an index containing anomalies gives them neighbours and hides them',
        ],
        evaluation:
          'Precision and recall at a fixed alert budget, and separately the index recall measured on anomalous queries against brute force — that second number is the one that reveals whether the approximation is costing you detections, and it is almost never reported.',
        pitfalls: [
          'Approximate search failing hardest on exactly the isolated points the detector is looking for',
          'An index built on data containing anomalies, which gives them neighbours and suppresses their scores',
          'Embedding drift invalidating the index without any error surfacing',
          'Quoting recall from typical queries and assuming it holds for outliers, which it does not',
        ],
      },
      optimization: {
        fit: 'primary',
        how: 'This entry is an optimization problem wearing a retrieval hat, and it is the cleanest example in the reference of a deliberately chosen accuracy-for-resources trade. Maximize recall subject to latency and memory; every parameter moves along that frontier and none escapes it. The two families are different attacks on the same problem — HNSW spends memory to buy recall, IVF-PQ spends recall to buy memory — and the structures themselves are worth studying independently: a navigable small-world graph is a probabilistic skip list generalized to metric space, and product quantization is vector quantization applied to subspaces so that codebook size stays manageable.',
        where: [
          'The recall-latency-memory frontier as an explicit constrained optimization, with efSearch and nprobe as the runtime dials',
          'Navigable small-world graphs as metric-space skip lists — logarithmic search from a layered structure',
          'Product quantization as subspace vector quantization, avoiding the exponential codebook a joint quantizer would need',
          'Two-stage retrieve-then-rerank, the standard pattern for trading a cheap approximate pass against an expensive exact one',
        ],
        why: 'Worth studying because the trade is explicit and tunable at runtime rather than baked in at training — you can move along the frontier per query if you want, which almost nothing else in this reference allows. The retrieve-then-rerank pattern generalizes far beyond vector search: use a cheap approximate method to shortlist and an expensive exact one to order, and you recover most of the lost quality for a fraction of the cost. Product quantization is also a genuinely elegant piece of engineering — splitting into subspaces is what keeps the codebook from being exponentially large, and the precomputed distance table turns floating-point arithmetic into table lookups.',
        featurization: [
          'Always measure recall against brute force on a sample; without that number the whole frontier is invisible and you are tuning blind',
          'Rerank the top candidates with exact distances — it is cheap and recovers most of the recall that quantization costs',
          'Tune on a query workload that matches production, since recall on random queries differs substantially from recall on real ones',
          'Track the latency tail rather than the mean; the constraint is expressed as an expectation and the tail is not controlled by it',
        ],
        evaluation:
          'Plot recall against latency across the parameter sweep and pick a point on the curve deliberately rather than accepting a default. Report the ninety-ninth percentile alongside the mean, and re-measure both after any collection growth, since a point chosen at one scale is not the same point at ten times the size.',
        pitfalls: [
          'Never measuring recall at all, which is the most common failure and leaves the system silently degraded',
          'Tuning on random queries rather than production ones, which measures the wrong distribution',
          'Optimizing the mean latency while the tail is what users actually experience',
          'Assuming parameters transfer across collection sizes, which they do not',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'The retrieval half of every two-tower system. The item tower embeds the catalogue once into an index; at request time the user tower produces one query vector and the index returns a few hundred candidates, which a heavier cross-feature ranker then orders. Without the index the two-tower architecture has no reason to exist, because scoring the whole catalogue per request is exactly what it was designed to avoid.',
        where: [
          'Candidate generation in large-scale recommenders, where the catalogue is millions of items and the budget is milliseconds',
          'Related-item and similar-content retrieval directly from embedding proximity',
          'Semantic and hybrid search, combining vector recall with lexical matching',
          'Retrieval-augmented generation, where the index is the retrieval step and its recall caps the whole system',
        ],
        why: 'It is what makes embedding-based retrieval viable at all: a two-tower model exists precisely so that item vectors can be precomputed and searched, and the index is the half that delivers on that promise. The honest framing is that it is infrastructure rather than intelligence — it optimizes geometric proximity and nothing about relevance, so the ranker downstream does the actual relevance work, and a beautiful index over mediocre embeddings retrieves mediocre things quickly. Its recall is also a hard ceiling on everything downstream: a candidate the index misses cannot be ranked, and in RAG that shows up as an answer the model could not have given.',
        featurization: [
          'Normalize vectors and match the index metric to the one the embedding model was trained with — a mismatch silently misranks everything',
          'Filter before searching where possible; post-filtering a fixed-size result set can return almost nothing after a selective filter',
          'Rebuild or retrain quantizers whenever the embedding model changes, since codebooks are fitted to the old distribution',
          'Size the candidate set from measured ranker headroom rather than by convention, since recall at that depth is what caps the system',
        ],
        evaluation:
          'Recall at the candidate depth against brute force, and separately the end-to-end metric with and without the index — the gap between exact and approximate retrieval is the cost of the approximation, and it is the number that justifies the parameter choice. Measure latency at the ninety-ninth percentile, which is what determines whether the request budget holds.',
        pitfalls: [
          'A metric mismatch between the embedding model and the index, which misranks everything with no error',
          'Post-filtering a fixed result set, which after a selective filter can return far fewer items than requested or none',
          'Stale codebooks after an embedding model upgrade, which degrades recall with nothing logged',
          'Treating index recall as a solved problem rather than as the ceiling on every downstream metric',
        ],
      },
      'natural-language': {
        fit: 'primary',
        how: 'The retrieval in retrieval-augmented generation. Documents are chunked, embedded and indexed; a query is embedded and the index returns the chunks that condition the generation. Everything the model says about your data flows through this step, which makes index recall a correctness property of the whole system rather than a performance detail.',
        where: [
          'RAG over document collections, where retrieval quality bounds answer quality absolutely',
          'Semantic search and question answering over enterprise corpora',
          'Deduplication and clustering of large text collections',
          'Long-term memory for conversational agents, retrieved by embedding similarity',
        ],
        why: 'It is load-bearing in a way that is easy to under-appreciate: in RAG, a chunk the index fails to retrieve is a fact the model cannot use, and the failure looks like the model not knowing rather than like a retrieval bug. That misattribution is the single most common diagnostic error in RAG systems. Hybrid retrieval — combining vector search with lexical matching — consistently outperforms either alone, because embeddings are weak exactly where exact terms matter, such as identifiers, part numbers and names. The other honest limit is that chunking decisions matter more than index parameters in most deployments, and no amount of tuning compensates for chunks that split a fact across a boundary.',
        featurization: [
          'Chunk with overlap and at a size matched to the embedding model’s context, since a fact split across a boundary is unretrievable at any recall',
          'Combine vector and lexical retrieval, because embeddings underperform badly on exact identifiers and rare terms',
          'Store metadata alongside vectors and filter before search rather than after',
          'Re-embed and rebuild whenever the embedding model changes; vectors from two model versions are not comparable at all',
        ],
        evaluation:
          'Retrieval recall on a labelled query set against brute force, then end-to-end answer quality — measuring only the second makes retrieval failures look like generation failures, which is how RAG systems get debugged in the wrong place for weeks.',
        pitfalls: [
          'Attributing a retrieval miss to the generator, which is the most common and most expensive misdiagnosis in RAG',
          'Chunk boundaries splitting facts, which no index parameter can recover',
          'Vector-only retrieval failing on identifiers and rare terms where lexical matching would have succeeded',
          'Mixing vectors from two embedding model versions in one index, which is silently meaningless',
        ],
      },
      'computer-vision': {
        fit: 'viable',
        how: 'Visual search over image embeddings: index the collection once, embed a query image, retrieve the nearest. The same structure and the same trades, with the difference that image collections tend to be larger and the vectors wider, so the memory constraint binds earlier and quantization is usually mandatory rather than optional.',
        where: [
          'Reverse image search and visual product discovery over large catalogues',
          'Near-duplicate detection and copyright matching',
          'Face and person re-identification against a gallery',
          'Retrieval-augmented vision, conditioning a model on similar retrieved examples',
        ],
        why: 'The scale is what makes it interesting here: billion-image collections with wide embeddings are exactly where IVF-PQ earns its place, because holding full vectors is simply not affordable and a 32-fold compression turns an impossible deployment into a routine one. The caveats are the general ones plus a sharper version of the metric problem — vision embeddings vary widely in whether they are trained for cosine or Euclidean geometry, and a mismatch is both easy to introduce and invisible once introduced.',
        featurization: [
          'Quantize aggressively at billion scale; full vectors are usually not affordable and PQ is the reason the deployment exists',
          'Rerank the top candidates with exact distances, which recovers most of the recall quantization costs',
          'Match the metric to how the vision encoder was trained, since the two conventions are both common and the mismatch is silent',
          'Keep a brute-force sample for continuous recall measurement, since nothing else will tell you the index has drifted',
        ],
        evaluation:
          'Recall at k against brute force on a held-out sample, plus task metrics for the downstream application. Memory per vector is a first-class number here rather than an implementation detail, because it determines whether the deployment is possible at all.',
        pitfalls: [
          'A metric mismatch with the vision encoder, which misranks silently',
          'Over-aggressive quantization collapsing fine-grained distinctions that the task depends on',
          'Skipping reranking and paying the full quantization recall cost for no reason',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'No training in the gradient sense. Building is the cost: HNSW is O(N log N) distance computations and genuinely slow — hours for a hundred million vectors — while IVF-PQ needs a k-means pass and codebook fitting over a sample, which is faster but must be redone whenever the embedding distribution shifts.',
    inferenceProfile:
      'Single-digit milliseconds per query for a well-tuned index at millions of vectors, and adjustable at runtime through efSearch or nprobe without rebuilding. Memory is the harder constraint: HNSW typically holds several times the raw vector size, while IVF-PQ can hold a thirty-second of it, and that difference decides which is deployable at scale.',
    retrainingCadence:
      'Rebuilds are driven by two independent things: collection churn, since deletions fragment graph connectivity, and embedding model changes, which invalidate every vector and every codebook at once. The second is a full re-embed and rebuild, not an update.',
    driftAndMonitoring: [
      'Measure recall against brute force on a sampled query set continuously — it is the only signal that the index is degrading, and nothing else will surface it',
      'Track the latency tail rather than the mean, since the constraint is an expectation and the tail is what users experience',
      'Monitor the deleted-vector fraction on graph indexes; tombstones fragment connectivity and recall falls slowly as they accumulate',
      'Alert on embedding-distribution shift against the distribution the codebooks were fitted to, which is what invalidates IVF-PQ silently',
    ],
    productionGotchas: [
      'The distance metric is a contract between the embedding model and the index. A cosine model on a Euclidean index misranks everything and raises no error anywhere',
      'Filtered search is the hardest thing these structures do. Post-filtering a fixed-size result set can return almost nothing after a selective filter, and pre-filtering usually needs index support rather than a wrapper',
      'Deletions are not really deletions. Most graph indexes tombstone, so recall degrades with churn until a rebuild happens',
      'An embedding model upgrade invalidates the entire index, including codebooks. Mixing vectors from two model versions is silently meaningless rather than merely inaccurate',
      'Parameters tuned at one collection size do not transfer to ten times the size, and nothing reports that they have stopped being right',
      'Build memory is often several times steady-state memory, which turns a rebuild into a capacity problem rather than a background job',
    ],
  },

  assumptions: [
    'The embedding space is meaningful, so geometric proximity corresponds to whatever relevance means here — the index optimizes proximity and nothing else',
    'The distance metric matches the one the embedding model was trained under',
    'Approximate answers are acceptable, and the recall level has been chosen deliberately rather than inherited from a default',
    'The vector distribution is stable enough that fitted centroids and codebooks remain valid between rebuilds',
    'Queries at serving time resemble the workload the parameters were tuned on',
  ],

  pros: [
    {
      point: 'Turns an impossible search into a millisecond one',
      context:
        'Sub-linear retrieval over hundreds of millions of vectors is what makes every embedding model in this reference usable in production. Without it, two-tower retrieval and RAG have no deployment story at all.',
    },
    {
      point: 'The accuracy-speed trade is explicit and adjustable at runtime',
      context:
        'efSearch and nprobe move along the recall-latency frontier per query without a rebuild, which almost nothing else here allows. You can spend more compute on a query you care about.',
    },
    {
      point: 'Quantization makes billion-scale affordable',
      context:
        'Product quantization compresses a 768-dimensional float vector into about 96 bytes, which is the difference between a possible and an impossible deployment. It is the reason billion-vector collections are routine rather than exotic.',
    },
    {
      point: 'Nothing is trained, so nothing overfits',
      context:
        'No labels, no training run, no generalization gap. The index is deterministic given the vectors and its parameters, which makes it far easier to reason about than the models feeding it.',
    },
  ],

  cons: [
    {
      point: 'Fails silently by construction',
      context:
        'A degraded index returns plausible but wrong neighbours with no error anywhere. The only defence is continuous recall measurement against brute force, which teams routinely skip and therefore never know what their retrieval is doing.',
    },
    {
      point: 'Filtered search is genuinely hard',
      context:
        'Post-filtering a fixed result set can return almost nothing after a selective filter, and pre-filtering needs real index support. This surprises people more than any other property of vector search.',
    },
    {
      point: 'Tightly coupled to the embedding model',
      context:
        'A model upgrade invalidates every vector and every codebook simultaneously — a full re-embed and rebuild, not an incremental update. That coupling makes model iteration substantially more expensive than it looks.',
    },
    {
      point: 'Memory is usually the binding constraint',
      context:
        'HNSW holds several times the raw vector size, which at a billion vectors decides the architecture for you. Choosing IVF-PQ instead is choosing to pay in recall, and that choice should be made explicitly.',
    },
    {
      point: 'It optimizes proximity, not relevance',
      context:
        'A perfect index over mediocre embeddings retrieves mediocre things very quickly. It is infrastructure, and mistaking a retrieval quality problem for an index tuning problem wastes a great deal of time.',
    },
  ],

  relatedSlugs: ['two-tower-retrieval', 'k-nearest-neighbours', 'k-means', 'contrastive-embeddings', 'node2vec'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A navigable small-world graph and product quantization, written out.

Two structures, two attacks on the same constrained problem:

    maximize recall   subject to   latency <= tau   and   memory <= M

HNSW spends MEMORY to buy recall: a layered proximity graph, searched greedily
with a bounded frontier. IVF-PQ spends RECALL to buy memory: coarse clusters
so a query visits few cells, plus per-subspace quantization so a 768-float
vector becomes ~96 bytes.

Brute force is here too, because it is the ground truth every recall number
is measured against - and a system that never measures it has no idea what
its retrieval is returning.

Plain loops, no libraries.
"""

import math
import random

SEED = 3


def squared_distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b))


def brute_force(vectors, query, k):
    """The exact answer. Not a fallback - the GROUND TRUTH.

    Every recall figure quoted about an index is measured against this on a
    sample. Without it the accuracy-speed frontier is invisible and you are
    tuning blind.
    """
    scored = [(squared_distance(vector, query), index) for index, vector in enumerate(vectors)]
    scored.sort()
    return [index for _, index in scored[:k]]


def recall_at_k(approximate, exact):
    """The overlap between what the index returned and the truth."""
    return len(set(approximate) & set(exact)) / len(exact)


# --------------------------------------------------------------------------
# HNSW: a proximity graph searched greedily with a bounded frontier
# --------------------------------------------------------------------------

def assign_layer(rng, level_multiplier):
    """Geometric layer assignment.

    Exactly the skip-list trick, lifted into metric space: most nodes live
    only at the bottom, a few reach higher, and the sparse upper layers give
    the long-range hops that make the search logarithmic.
    """
    return int(-math.log(max(rng.random(), 1e-12)) * level_multiplier)


def search_layer(vectors, graph, query, entry_points, ef, layer):
    """Greedy best-first search with a frontier of at most \`ef\`.

    ef is THE dial. It bounds how many candidates are ever examined, which
    bounds latency - and bounds recall at the same time, in the same motion.
    Nothing about this structure lets you have both.
    """
    visited = set(entry_points)
    candidates = [(squared_distance(vectors[p], query), p) for p in entry_points]
    candidates.sort()
    best = list(candidates)

    while candidates:
        distance, current = candidates.pop(0)
        if best and distance > best[-1][0] and len(best) >= ef:
            break  # nothing closer can be reached from here

        for neighbour in graph[layer].get(current, []):
            if neighbour in visited:
                continue
            visited.add(neighbour)
            neighbour_distance = squared_distance(vectors[neighbour], query)
            if len(best) < ef or neighbour_distance < best[-1][0]:
                candidates.append((neighbour_distance, neighbour))
                candidates.sort()
                best.append((neighbour_distance, neighbour))
                best.sort()
                if len(best) > ef:
                    best.pop()

    return best


def build_hnsw(vectors, max_degree=16, ef_construction=100, level_multiplier=1.0):
    """Insert one at a time, descending from the top layer each time."""
    rng = random.Random(SEED)
    graph = {}
    entry_point = None
    top_layer = 0

    for index, vector in enumerate(vectors):
        layer = assign_layer(rng, level_multiplier)
        for level in range(layer + 1):
            graph.setdefault(level, {}).setdefault(index, [])

        if entry_point is None:
            entry_point, top_layer = index, layer
            continue

        current = [entry_point]
        # Coarse descent through the sparse upper layers, then a careful
        # search at each layer the new node will live on.
        for level in range(top_layer, layer, -1):
            current = [search_layer(vectors, graph, vector, current, 1, level)[0][1]]

        for level in range(min(layer, top_layer), -1, -1):
            found = search_layer(vectors, graph, vector, current, ef_construction, level)
            current = [node for _, node in found]
            for _, neighbour in found[:max_degree]:
                graph[level][index].append(neighbour)
                graph[level][neighbour].append(index)
                # Degree pruning: an unbounded degree destroys both the
                # memory budget and the search, so links are capped.
                if len(graph[level][neighbour]) > max_degree:
                    graph[level][neighbour] = sorted(
                        graph[level][neighbour],
                        key=lambda n: squared_distance(vectors[n], vectors[neighbour]),
                    )[:max_degree]

        if layer > top_layer:
            entry_point, top_layer = index, layer

    return graph, entry_point, top_layer


def search_hnsw(vectors, graph, entry_point, top_layer, query, k, ef_search):
    """Descend coarsely, then search the bottom layer with the real frontier."""
    current = [entry_point]
    for level in range(top_layer, 0, -1):
        current = [search_layer(vectors, graph, query, current, 1, level)[0][1]]

    found = search_layer(vectors, graph, query, current, ef_search, 0)
    return [index for _, index in found[:k]]


# --------------------------------------------------------------------------
# IVF-PQ: coarse clusters plus per-subspace quantization
# --------------------------------------------------------------------------

def kmeans(vectors, num_clusters, iterations=10):
    """Lloyd's algorithm. Used twice: for coarse cells and for codebooks."""
    rng = random.Random(SEED)
    centroids = [list(vectors[rng.randrange(len(vectors))]) for _ in range(num_clusters)]

    for _ in range(iterations):
        assignments = [
            min(range(num_clusters), key=lambda c: squared_distance(vector, centroids[c]))
            for vector in vectors
        ]
        for cluster in range(num_clusters):
            members = [vectors[i] for i, a in enumerate(assignments) if a == cluster]
            if not members:
                continue
            centroids[cluster] = [
                sum(member[d] for member in members) / len(members)
                for d in range(len(members[0]))
            ]

    return centroids


def train_pq(vectors, num_subquantizers, codebook_size=256):
    """Split the vector into M pieces and quantize each SEPARATELY.

    The split is the whole trick. A joint quantizer covering the full space
    would need an exponentially large codebook; M independent codebooks of
    256 entries each represent 256^M distinct vectors using M bytes.
    """
    dimension = len(vectors[0])
    if dimension % num_subquantizers != 0:
        raise ValueError("subquantizer count must divide the dimension")
    subspace_width = dimension // num_subquantizers

    codebooks = []
    for m in range(num_subquantizers):
        lo, hi = m * subspace_width, (m + 1) * subspace_width
        codebooks.append(kmeans([vector[lo:hi] for vector in vectors], codebook_size))
    return codebooks


def encode_pq(vector, codebooks):
    """One byte per subspace. A 768-float vector becomes len(codebooks) bytes."""
    subspace_width = len(vector) // len(codebooks)
    codes = []
    for m, codebook in enumerate(codebooks):
        piece = vector[m * subspace_width:(m + 1) * subspace_width]
        codes.append(min(range(len(codebook)), key=lambda c: squared_distance(piece, codebook[c])))
    return codes


def pq_distance_table(query, codebooks):
    """Precompute query-to-centroid distances ONCE per query.

    After this, scoring a compressed vector is M table lookups and M adds -
    no floating-point distance computation at all. That substitution is what
    makes IVF-PQ fast as well as small.
    """
    subspace_width = len(query) // len(codebooks)
    return [
        [squared_distance(query[m * subspace_width:(m + 1) * subspace_width], centroid)
         for centroid in codebook]
        for m, codebook in enumerate(codebooks)
    ]


def search_ivfpq(query, coarse_centroids, inverted_lists, codes, codebooks, k, nprobe):
    """Probe the nearest nprobe cells, score their members by table lookup."""
    cell_order = sorted(
        range(len(coarse_centroids)),
        key=lambda c: squared_distance(query, coarse_centroids[c]),
    )

    table = pq_distance_table(query, codebooks)
    scored = []
    for cell in cell_order[:nprobe]:
        for index in inverted_lists[cell]:
            # M lookups and M adds. No distance is ever computed here.
            approximate = sum(table[m][code] for m, code in enumerate(codes[index]))
            scored.append((approximate, index))

    scored.sort()
    return [index for _, index in scored[:k]]


def rerank(vectors, query, candidates, k):
    """Rescore approximate candidates with EXACT distances.

    Cheap - it touches only the shortlist - and it recovers most of the
    recall that quantization costs. The standard retrieve-then-rerank
    pattern, and skipping it pays the full approximation penalty for nothing.
    """
    scored = [(squared_distance(vectors[index], query), index) for index in candidates]
    scored.sort()
    return [index for _, index in scored[:k]]
`,
        profile:
          'Brute force is O(N * d) per query; HNSW is O(log N) hops times efSearch distance computations; IVF-PQ is O(nprobe * N/nlist) table lookups. Illustrative, not a measured benchmark: the sort-on-every-insertion in the frontier here makes the literal HNSW search quadratic in efSearch, which a heap fixes in the next stage.',
      },

      'make-it-right': {
        code: `"""The same structures, with the frontier as a heap and the metric as a type.

Three things change. The candidate frontier becomes a pair of heaps rather
than a repeatedly sorted list, which is what makes the bounded-frontier
search actually bounded in cost. The distance metric becomes an explicit
contract, because a cosine embedding model against a Euclidean index
misranks everything and raises no error anywhere. And recall measurement
becomes part of the API rather than something a caller is trusted to
remember, since an index that is never measured has no known quality at all.
"""

from __future__ import annotations

import heapq
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import NamedTuple, Sequence


class Metric(Enum):
    """The contract between the embedding model and the index.

    A model trained for cosine similarity searched under Euclidean distance
    misranks everything, silently and completely. Making this explicit is the
    single highest-value piece of typing in the whole structure.
    """

    EUCLIDEAN = 'l2'
    INNER_PRODUCT = 'ip'
    COSINE = 'cosine'


class MetricMismatch(ValueError):
    """Raised when vectors do not satisfy the chosen metric's assumptions."""


class ShapeMismatch(ValueError):
    """Raised on a dimension violation instead of comparing garbage."""


class UnmeasuredIndex(RuntimeError):
    """Raised when an index is queried before its recall has been measured.

    Deliberately strict. An ANN index fails by returning plausible wrong
    answers, so an unmeasured one has unknown quality - and 'unknown quality'
    is the normal state of vector search in production.
    """


@dataclass(frozen=True)
class IndexConfig:
    """Frozen so the metric cannot change under a built index."""

    dimension: int
    metric: Metric = Metric.COSINE
    max_degree: int = 16
    ef_construction: int = 100
    level_multiplier: float = 1.0

    def __post_init__(self) -> None:
        if self.dimension < 1:
            raise ShapeMismatch('dimension must be positive')
        if self.max_degree < 2:
            raise ShapeMismatch('a degree below 2 cannot form a navigable graph')

    def estimated_bytes_per_vector(self) -> int:
        """Memory is usually the binding constraint, so make it visible.

        Full float32 vectors plus roughly max_degree 32-bit edges per node,
        doubled because links are bidirectional. This number is what decides
        whether a graph index is deployable at all at a given scale.
        """
        return 4 * self.dimension + 2 * 4 * self.max_degree


class Neighbour(NamedTuple):
    """Distance first, so heap ordering is the natural one."""

    distance: float
    index: int


def normalize(vector: Sequence[float]) -> list[float]:
    norm = math.sqrt(math.fsum(value * value for value in vector))
    if norm == 0.0:
        raise MetricMismatch('a zero vector has no direction; cosine is undefined')
    return [value / norm for value in vector]


def distance(a: Sequence[float], b: Sequence[float], metric: Metric) -> float:
    """Lower is nearer, for every metric — so one comparison works throughout.

    Inner product is negated for exactly that reason: mixing a
    higher-is-better metric into a lower-is-better search is a classic and
    completely silent ranking inversion.
    """
    if metric is Metric.EUCLIDEAN:
        return math.fsum((x - y) ** 2 for x, y in zip(a, b))
    dot = math.fsum(x * y for x, y in zip(a, b))
    return -dot


class Frontier:
    """The bounded candidate set, as two heaps.

    A min-heap of candidates still to expand and a max-heap of the best found
    so far, capped at ef. The literal version re-sorted a list on every
    insertion, which made a bounded frontier quadratic in its own bound; this
    makes each insertion logarithmic, which is what 'bounded' should mean.
    """

    __slots__ = ('_ef', '_candidates', '_best')

    def __init__(self, ef: int) -> None:
        if ef < 1:
            raise ShapeMismatch('the frontier must admit at least one candidate')
        self._ef = ef
        self._candidates: list[Neighbour] = []
        self._best: list[tuple[float, int]] = []  # negated distance, for a max-heap

    def push(self, neighbour: Neighbour) -> None:
        heapq.heappush(self._candidates, neighbour)
        heapq.heappush(self._best, (-neighbour.distance, neighbour.index))
        if len(self._best) > self._ef:
            heapq.heappop(self._best)

    def pop_nearest(self) -> Neighbour | None:
        return heapq.heappop(self._candidates) if self._candidates else None

    @property
    def worst_kept(self) -> float:
        return -self._best[0][0] if self._best else math.inf

    @property
    def full(self) -> bool:
        return len(self._best) >= self._ef

    def results(self) -> list[Neighbour]:
        return sorted(Neighbour(-d, i) for d, i in self._best)


@dataclass
class RecallReport:
    """What the index actually returns, measured against brute force.

    A dataclass rather than a float because the tail matters: mean recall
    hides that a subset of queries is served badly, and in retrieval that
    subset is often the interesting one.
    """

    mean_recall: float
    worst_recall: float
    queries_measured: int
    ef_search: int

    def acceptable(self, floor: float) -> bool:
        return self.mean_recall >= floor


class HnswIndex:
    """A layered proximity graph with an explicit metric and measured recall."""

    def __init__(self, config: IndexConfig) -> None:
        self._config = config
        self._vectors: list[list[float]] = []
        self._graph: dict[int, dict[int, list[int]]] = {}
        self._entry_point: int | None = None
        self._top_layer = 0
        self._recall: RecallReport | None = None

    def add(self, vector: Sequence[float], layer: int) -> int:
        """Layer is supplied rather than drawn, so builds are reproducible."""
        if len(vector) != self._config.dimension:
            raise ShapeMismatch(
                f'expected {self._config.dimension} dimensions, got {len(vector)}'
            )
        stored = (
            normalize(vector)
            if self._config.metric is Metric.COSINE
            else list(vector)
        )

        index = len(self._vectors)
        self._vectors.append(stored)
        for level in range(layer + 1):
            self._graph.setdefault(level, {})[index] = []

        if self._entry_point is None:
            self._entry_point, self._top_layer = index, layer
            return index

        self._link(index, stored, layer)
        if layer > self._top_layer:
            self._entry_point, self._top_layer = index, layer
        # Any structural change invalidates the measured recall.
        self._recall = None
        return index

    def _link(self, index: int, vector: Sequence[float], layer: int) -> None:
        entry = self._entry_point
        assert entry is not None

        current = [entry]
        for level in range(self._top_layer, layer, -1):
            current = [n.index for n in self._search_layer(vector, current, 1, level)]

        for level in range(min(layer, self._top_layer), -1, -1):
            found = self._search_layer(vector, current, self._config.ef_construction, level)
            current = [n.index for n in found]
            for neighbour in found[:self._config.max_degree]:
                self._graph[level][index].append(neighbour.index)
                self._graph[level][neighbour.index].append(index)
                self._prune(neighbour.index, level)

    def _prune(self, node: int, level: int) -> None:
        """Cap the degree. Unbounded degree destroys the memory budget AND
        the search, because a hub node makes every traversal expensive."""
        links = self._graph[level][node]
        if len(links) <= self._config.max_degree:
            return
        anchor = self._vectors[node]
        links.sort(key=lambda n: distance(self._vectors[n], anchor, self._config.metric))
        self._graph[level][node] = links[:self._config.max_degree]

    def _search_layer(
        self, query: Sequence[float], entry_points: Sequence[int], ef: int, level: int
    ) -> list[Neighbour]:
        frontier = Frontier(ef)
        visited = set(entry_points)
        for point in entry_points:
            frontier.push(Neighbour(distance(self._vectors[point], query, self._config.metric), point))

        while True:
            current = frontier.pop_nearest()
            if current is None:
                break
            # Guard clause: once the nearest unexpanded candidate is further
            # than the worst kept result, nothing better is reachable.
            if frontier.full and current.distance > frontier.worst_kept:
                break

            for neighbour in self._graph[level].get(current.index, ()):
                if neighbour in visited:
                    continue
                visited.add(neighbour)
                frontier.push(
                    Neighbour(
                        distance(self._vectors[neighbour], query, self._config.metric),
                        neighbour,
                    )
                )

        return frontier.results()

    def search(self, query: Sequence[float], k: int, ef_search: int) -> list[int]:
        if self._recall is None:
            raise UnmeasuredIndex(
                'call measure_recall before querying; an unmeasured index has '
                'unknown quality and fails by returning plausible wrong answers'
            )
        return self._raw_search(query, k, ef_search)

    def _raw_search(self, query: Sequence[float], k: int, ef_search: int) -> list[int]:
        if self._entry_point is None:
            return []
        prepared = (
            normalize(query) if self._config.metric is Metric.COSINE else list(query)
        )

        current = [self._entry_point]
        for level in range(self._top_layer, 0, -1):
            current = [n.index for n in self._search_layer(prepared, current, 1, level)]
        return [n.index for n in self._search_layer(prepared, current, ef_search, 0)[:k]]

    def brute_force(self, query: Sequence[float], k: int) -> list[int]:
        """The ground truth. Not a fallback — what recall is measured against."""
        prepared = (
            normalize(query) if self._config.metric is Metric.COSINE else list(query)
        )
        scored = [
            Neighbour(distance(vector, prepared, self._config.metric), index)
            for index, vector in enumerate(self._vectors)
        ]
        # nsmallest, not a sort: k is tiny relative to the collection.
        return [n.index for n in heapq.nsmallest(k, scored)]

    def measure_recall(
        self, queries: Sequence[Sequence[float]], k: int, ef_search: int
    ) -> RecallReport:
        """Mandatory before querying, and worth re-running as the index grows.

        Parameters tuned at a million vectors are wrong at a hundred million,
        and nothing else in the system will report that they have drifted.
        """
        if not queries:
            raise ShapeMismatch('recall cannot be measured with no queries')

        recalls: list[float] = []
        for query in queries:
            exact = set(self.brute_force(query, k))
            approximate = set(self._raw_search(query, k, ef_search))
            recalls.append(len(exact & approximate) / k)

        self._recall = RecallReport(
            mean_recall=math.fsum(recalls) / len(recalls),
            worst_recall=min(recalls),
            queries_measured=len(recalls),
            ef_search=ef_search,
        )
        return self._recall
`,
        rationale:
          'Three changes. The candidate frontier becomes a pair of heaps instead of a repeatedly sorted list — the literal version re-sorted on every insertion, which made a bounded frontier quadratic in its own bound, so "bounded" meant nothing operationally. The metric becomes an explicit enum, because a model trained for cosine similarity searched under Euclidean distance misranks everything with no error anywhere, and that is the highest-value piece of typing in the whole structure; inner product is negated so that lower is nearer under every metric, since mixing a higher-is-better metric into a lower-is-better search is a classic silent ranking inversion. The third is that recall measurement becomes part of the API rather than a caller’s good intention: querying an unmeasured index raises, which is deliberately strict because an ANN index fails by returning plausible wrong answers and unknown quality is the normal state of vector search in production. Alongside those, the recall report keeps the worst case as well as the mean, memory per vector is exposed as a method since it is usually the binding constraint, the layer is passed in rather than drawn so builds are reproducible, and any structural change invalidates the measurement.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'The frontier drops from O(ef^2) per layer search to O(ef log ef), and brute force uses a bounded heap rather than a full sort. Illustrative, not a measured benchmark: the heap change is what makes a large efSearch usable, which is exactly the regime where recall is worth buying.',
      },

      'make-it-fast': {
        code: `"""Batched queries and table-lookup scoring. The distance loop disappears.

The structural observation: a distance computation is a dot product, and a
batch of queries against a batch of candidates is a MATRIX PRODUCT. So the
inner loop that dominates every ANN structure becomes BLAS - and separately,
product quantization removes the floating-point distance entirely by
precomputing a lookup table per query.

Three changes:
  1. Brute force becomes one GEMM. It is the ground truth every recall number
     is measured against, so making it fast is what makes measurement
     affordable enough to actually do.
  2. PQ scoring becomes a table gather and a sum along the subquantizer axis:
     no distance arithmetic at all, just M lookups per candidate.
  3. Codes are stored subquantizer-major, so scanning one subquantizer across
     every candidate is a contiguous read - which is what the gather needs.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32
CODE = np.uint8


def brute_force_batch(
    vectors: NDArray[np.float32],
    queries: NDArray[np.float32],
    k: int,
) -> NDArray[np.int32]:
    """Exact k-NN for a batch of queries, as one matrix product.

    ||q - x||^2 = ||q||^2 - 2 q.x + ||x||^2, and only the middle term depends
    on both - so the whole distance matrix is one GEMM plus two broadcasts.
    The query norm is constant per row and cannot change the ranking, so it
    is dropped entirely.
    """
    vector_norms = np.einsum('ij,ij->i', vectors, vectors, optimize=True)
    cross = queries @ vectors.T
    cross *= -2.0
    cross += vector_norms  # broadcasts over the query axis

    # argpartition, not argsort: k is tiny relative to N, so a selection is
    # O(N) where ordering the rest is O(N log N) of discarded work.
    candidates = np.argpartition(cross, k, axis=1)[:, :k]
    ordered = np.take_along_axis(cross, candidates, axis=1).argsort(axis=1)
    return np.take_along_axis(candidates, ordered, axis=1).astype(np.int32)


class ProductQuantizer:
    """Per-subspace quantization with table-lookup scoring.

    The split is the whole trick: a joint quantizer over the full space would
    need an exponentially large codebook, while M independent codebooks of
    256 entries represent 256^M distinct vectors in M bytes.
    """

    def __init__(self, dimension: int, num_subquantizers: int, codebook_size: int = 256) -> None:
        if dimension % num_subquantizers:
            raise ValueError('subquantizer count must divide the dimension')
        if codebook_size > 256:
            raise ValueError('a codebook above 256 entries no longer fits in a byte')

        self._m = num_subquantizers
        self._width = dimension // num_subquantizers
        # (M, codebook_size, subspace_width), contiguous so the per-subspace
        # distance computation below is a dense product.
        self._codebooks = np.zeros((num_subquantizers, codebook_size, self._width), dtype=FLOAT)

    @property
    def bytes_per_vector(self) -> int:
        """The number that decides whether the deployment is possible.

        768 float32 dimensions is 3072 bytes; 96 subquantizers is 96. That
        32-fold reduction is the entire reason IVF-PQ exists.
        """
        return self._m

    def encode(self, vectors: NDArray[np.float32]) -> NDArray[np.uint8]:
        """(n, d) -> (M, n) uint8 codes.

        SUBQUANTIZER-MAJOR on purpose: scoring scans one subquantizer across
        every candidate, and that is a contiguous read only in this layout.
        The natural (n, M) layout makes the hot loop strided.
        """
        reshaped = vectors.reshape(len(vectors), self._m, self._width)
        codes = np.empty((self._m, len(vectors)), dtype=CODE)

        for m in range(self._m):
            # One GEMM per subspace against its codebook, same expansion as
            # brute force: the centroid norm plus the cross term.
            centroids = self._codebooks[m]
            cross = reshaped[:, m, :] @ centroids.T
            cross *= -2.0
            cross += np.einsum('ij,ij->i', centroids, centroids, optimize=True)
            codes[m] = cross.argmin(axis=1).astype(CODE)

        return codes

    def distance_table(self, query: NDArray[np.float32]) -> NDArray[np.float32]:
        """(M, codebook_size) of query-to-centroid distances, once per query.

        After this, scoring a compressed vector is M lookups and M adds — no
        floating-point distance computation at all. That substitution is what
        makes IVF-PQ fast as well as small.
        """
        pieces = query.reshape(self._m, 1, self._width)
        difference = self._codebooks - pieces
        return np.einsum('mkd,mkd->mk', difference, difference, optimize=True)

    def score(
        self, table: NDArray[np.float32], codes: NDArray[np.uint8]
    ) -> NDArray[np.float32]:
        """codes is (M, n). Returns (n,) approximate distances.

        A fancy-index gather along the subquantizer axis followed by a sum:
        the whole scoring pass is one gather and one reduction, with no
        arithmetic on the vectors themselves anywhere.
        """
        rows = np.arange(self._m)[:, None]
        return table[rows, codes].sum(axis=0, dtype=FLOAT)


class IvfPqIndex:
    """Coarse cells plus compressed residuals."""

    def __init__(self, centroids: NDArray[np.float32], quantizer: ProductQuantizer) -> None:
        self._centroids = np.ascontiguousarray(centroids, dtype=FLOAT)
        self._quantizer = quantizer
        self._lists: list[NDArray[np.int32]] = []
        self._codes: list[NDArray[np.uint8]] = []

    def search(
        self,
        query: NDArray[np.float32],
        k: int,
        nprobe: int,
        rerank_depth: int = 0,
        vectors: NDArray[np.float32] | None = None,
    ) -> NDArray[np.int32]:
        """Probe nprobe cells, score by table lookup, optionally rerank."""
        cell_distances = self._centroids @ query
        cell_distances *= -2.0
        cell_distances += np.einsum('ij,ij->i', self._centroids, self._centroids, optimize=True)
        cells = np.argpartition(cell_distances, nprobe)[:nprobe]

        table = self._quantizer.distance_table(query)
        # One scoring pass per probed cell, each a gather over a contiguous
        # block of subquantizer-major codes.
        scores: list[NDArray[np.float32]] = []
        ids: list[NDArray[np.int32]] = []
        for cell in cells:
            scores.append(self._quantizer.score(table, self._codes[cell]))
            ids.append(self._lists[cell])

        all_scores = np.concatenate(scores)
        all_ids = np.concatenate(ids)

        depth = max(k, rerank_depth)
        if depth >= len(all_scores):
            shortlist = all_ids
        else:
            shortlist = all_ids[np.argpartition(all_scores, depth)[:depth]]

        if rerank_depth and vectors is not None:
            # Rescore the shortlist with EXACT distances. Cheap, since it
            # touches only the shortlist, and it recovers most of the recall
            # that quantization costs.
            exact = vectors[shortlist] - query
            exact = np.einsum('ij,ij->i', exact, exact, optimize=True)
            return shortlist[np.argsort(exact)[:k]].astype(np.int32)

        return shortlist[:k].astype(np.int32)


def recall_at_k(
    approximate: NDArray[np.int32], exact: NDArray[np.int32]
) -> tuple[float, float]:
    """Mean AND worst recall over a batch of queries.

    The worst case matters: mean recall hides that a subset of queries is
    served badly, and in retrieval that subset is frequently the interesting
    one. Returning only the mean is how a degraded index passes review.
    """
    k = exact.shape[1]
    # Broadcast comparison rather than a Python set per row: (n, k, k) of
    # matches, reduced along both candidate axes in one pass.
    matches = (approximate[:, :, None] == exact[:, None, :]).any(axis=2).sum(axis=1)
    per_query = matches / k
    return float(per_query.mean()), float(per_query.min())
`,
        rationale:
          'The structural observation is that a distance computation is a dot product, so a batch of queries against a collection is a matrix product — and the expansion of squared Euclidean distance means only the cross term depends on both operands, with the query norm constant per row and therefore droppable since it cannot change a ranking. That turns brute force into one GEMM, which matters more than it first appears: brute force is the ground truth every recall number is measured against, so making it cheap is what makes measurement affordable enough that teams actually do it. Product quantization then removes floating-point distance entirely: one table per query, after which scoring a compressed vector is a gather and a sum along the subquantizer axis. The codes are stored subquantizer-major rather than vector-major precisely because scoring scans one subquantizer across every candidate, which is contiguous only in that layout. Selections use argpartition rather than argsort throughout, since k is tiny relative to the collection and ordering the rest is discarded work, and recall returns the worst case alongside the mean because a mean hides the subset of queries being served badly.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Exact distances for a whole query batch become one GEMM via the norm expansion, and the per-subspace encoding is one GEMM per subquantizer against its codebook.',
            tradeoff: 'The distance matrix is queries times collection size in float32, so a large batch against a large collection cannot be materialized at all and has to be chunked — which is exactly the case where you most wanted the batch.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Subquantizer-major uint8 codes make the scoring gather a contiguous read per subquantizer, and float32 codebooks keep the encoding products on the BLAS fast path.',
            tradeoff: 'Subquantizer-major is the wrong layout for adding or removing a single vector, since one vector’s code is strided across M arrays — so inserts become substantially more expensive than queries.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The norm expansion scales and adds in place over the cross-product matrix, and the squared norms are contracted with einsum rather than squaring into a temporary and summing it.',
            tradeoff: 'The cross-product buffer is destroyed as it becomes the distance matrix, so nothing can inspect the raw similarities afterwards — which is what you want when debugging a metric mismatch.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Queries, candidates and subquantizers all become array axes, so measuring recall over a thousand queries costs a constant number of interpreter operations rather than a thousand searches.',
            tradeoff: 'Batching only helps offline evaluation and bulk encoding; production serves one query at a time, so the batched path and the served path diverge and the measured latency is not the served latency.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Brute force becomes one GEMM per batch instead of N * d scalar operations per query; PQ scoring becomes M lookups per candidate with no distance arithmetic. Illustrative, not a measured benchmark: a fast brute force is what makes continuous recall measurement affordable, which is the practice that separates a tuned index from an unmeasured one.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A navigable small-world graph and product quantization, written out.
//
// Two structures, two attacks on the same constrained problem:
//
//   maximize recall   subject to   latency <= tau   and   memory <= M
//
// HNSW spends MEMORY to buy recall: a layered proximity graph searched
// greedily with a bounded frontier. IVF-PQ spends RECALL to buy memory:
// coarse clusters so a query visits few cells, plus per-subspace
// quantization so a 768-float vector becomes about 96 bytes.
//
// Brute force is here too, because it is the ground truth every recall
// number is measured against - and a system that never measures it has no
// idea what its retrieval is returning.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <map>
#include <random>
#include <set>
#include <stdexcept>
#include <vector>

using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;

double SquaredDistance(const Vector& a, const Vector& b) {
  double total = 0.0;
  for (std::size_t i = 0; i < a.size(); ++i) {
    const double difference = a[i] - b[i];
    total += difference * difference;
  }
  return total;
}

// The exact answer. Not a fallback - the GROUND TRUTH.
//
// Every recall figure quoted about an index is measured against this on a
// sample. Without it the accuracy-speed frontier is invisible and you are
// tuning blind.
std::vector<int> BruteForce(const Matrix& vectors, const Vector& query, std::size_t k) {
  std::vector<std::pair<double, int>> scored;
  scored.reserve(vectors.size());
  for (std::size_t i = 0; i < vectors.size(); ++i) {
    scored.emplace_back(SquaredDistance(vectors[i], query), static_cast<int>(i));
  }
  std::sort(scored.begin(), scored.end());

  std::vector<int> result;
  for (std::size_t i = 0; i < std::min(k, scored.size()); ++i) {
    result.push_back(scored[i].second);
  }
  return result;
}

double RecallAtK(const std::vector<int>& approximate, const std::vector<int>& exact) {
  std::set<int> truth(exact.begin(), exact.end());
  std::size_t hits = 0;
  for (std::size_t i = 0; i < approximate.size(); ++i) {
    if (truth.count(approximate[i]) > 0) {
      ++hits;
    }
  }
  return static_cast<double>(hits) / static_cast<double>(exact.size());
}

// --------------------------------------------------------------------------
// HNSW: a proximity graph searched greedily with a bounded frontier
// --------------------------------------------------------------------------

// Geometric layer assignment.
//
// Exactly the skip-list trick lifted into metric space: most nodes live only
// at the bottom, a few reach higher, and the sparse upper layers give the
// long-range hops that make the search logarithmic.
int AssignLayer(std::mt19937& rng, double level_multiplier) {
  std::uniform_real_distribution<double> uniform(1e-12, 1.0);
  return static_cast<int>(-std::log(uniform(rng)) * level_multiplier);
}

using Graph = std::map<int, std::map<int, std::vector<int>>>;

// Greedy best-first search with a frontier of at most \`ef\`.
//
// ef is THE dial. It bounds how many candidates are ever examined, which
// bounds latency - and bounds recall at the same time, in the same motion.
// Nothing about this structure lets you have both.
std::vector<std::pair<double, int>> SearchLayer(const Matrix& vectors, Graph& graph,
                                                const Vector& query,
                                                const std::vector<int>& entry_points,
                                                std::size_t ef, int layer) {
  std::set<int> visited(entry_points.begin(), entry_points.end());
  std::vector<std::pair<double, int>> candidates;
  for (std::size_t i = 0; i < entry_points.size(); ++i) {
    candidates.emplace_back(SquaredDistance(vectors[entry_points[i]], query),
                            entry_points[i]);
  }
  std::sort(candidates.begin(), candidates.end());
  std::vector<std::pair<double, int>> best = candidates;

  while (!candidates.empty()) {
    const std::pair<double, int> current = candidates.front();
    candidates.erase(candidates.begin());
    if (!best.empty() && current.first > best.back().first && best.size() >= ef) {
      break;  // nothing closer is reachable from here
    }

    for (std::size_t i = 0; i < graph[layer][current.second].size(); ++i) {
      const int neighbour = graph[layer][current.second][i];
      if (visited.count(neighbour) > 0) {
        continue;
      }
      visited.insert(neighbour);
      const double distance = SquaredDistance(vectors[neighbour], query);
      if (best.size() < ef || distance < best.back().first) {
        candidates.emplace_back(distance, neighbour);
        std::sort(candidates.begin(), candidates.end());
        best.emplace_back(distance, neighbour);
        std::sort(best.begin(), best.end());
        if (best.size() > ef) {
          best.pop_back();
        }
      }
    }
  }
  return best;
}

// --------------------------------------------------------------------------
// IVF-PQ: coarse clusters plus per-subspace quantization
// --------------------------------------------------------------------------

// Lloyd's algorithm. Used twice: for coarse cells and for codebooks.
Matrix KMeans(const Matrix& vectors, std::size_t num_clusters, std::size_t iterations,
              std::mt19937& rng) {
  std::uniform_int_distribution<std::size_t> pick(0, vectors.size() - 1);
  Matrix centroids;
  for (std::size_t c = 0; c < num_clusters; ++c) {
    centroids.push_back(vectors[pick(rng)]);
  }

  for (std::size_t iteration = 0; iteration < iterations; ++iteration) {
    std::vector<std::size_t> assignments(vectors.size(), 0);
    for (std::size_t i = 0; i < vectors.size(); ++i) {
      double best = SquaredDistance(vectors[i], centroids[0]);
      for (std::size_t c = 1; c < num_clusters; ++c) {
        const double candidate = SquaredDistance(vectors[i], centroids[c]);
        if (candidate < best) {
          best = candidate;
          assignments[i] = c;
        }
      }
    }

    for (std::size_t c = 0; c < num_clusters; ++c) {
      Vector sum(vectors[0].size(), 0.0);
      std::size_t count = 0;
      for (std::size_t i = 0; i < vectors.size(); ++i) {
        if (assignments[i] != c) {
          continue;
        }
        for (std::size_t d = 0; d < sum.size(); ++d) {
          sum[d] += vectors[i][d];
        }
        ++count;
      }
      if (count == 0) {
        continue;
      }
      for (std::size_t d = 0; d < sum.size(); ++d) {
        centroids[c][d] = sum[d] / static_cast<double>(count);
      }
    }
  }
  return centroids;
}

// Split the vector into M pieces and quantize each SEPARATELY.
//
// The split is the whole trick. A joint quantizer covering the full space
// would need an exponentially large codebook; M independent codebooks of 256
// entries each represent 256^M distinct vectors using M bytes.
std::vector<Matrix> TrainPq(const Matrix& vectors, std::size_t num_subquantizers,
                            std::size_t codebook_size, std::mt19937& rng) {
  const std::size_t dimension = vectors[0].size();
  if (dimension % num_subquantizers != 0) {
    throw std::invalid_argument("subquantizer count must divide the dimension");
  }
  const std::size_t width = dimension / num_subquantizers;

  std::vector<Matrix> codebooks;
  for (std::size_t m = 0; m < num_subquantizers; ++m) {
    Matrix pieces;
    pieces.reserve(vectors.size());
    for (std::size_t i = 0; i < vectors.size(); ++i) {
      pieces.emplace_back(vectors[i].begin() + static_cast<long>(m * width),
                          vectors[i].begin() + static_cast<long>((m + 1) * width));
    }
    codebooks.push_back(KMeans(pieces, codebook_size, 10, rng));
  }
  return codebooks;
}

// Precompute query-to-centroid distances ONCE per query.
//
// After this, scoring a compressed vector is M table lookups and M adds - no
// floating-point distance computation at all. That substitution is what
// makes IVF-PQ fast as well as small.
Matrix PqDistanceTable(const Vector& query, const std::vector<Matrix>& codebooks) {
  const std::size_t width = query.size() / codebooks.size();
  Matrix table;
  for (std::size_t m = 0; m < codebooks.size(); ++m) {
    const Vector piece(query.begin() + static_cast<long>(m * width),
                       query.begin() + static_cast<long>((m + 1) * width));
    Vector row;
    row.reserve(codebooks[m].size());
    for (std::size_t c = 0; c < codebooks[m].size(); ++c) {
      row.push_back(SquaredDistance(piece, codebooks[m][c]));
    }
    table.push_back(row);
  }
  return table;
}

// Rescore approximate candidates with EXACT distances.
//
// Cheap - it touches only the shortlist - and it recovers most of the recall
// that quantization costs. The standard retrieve-then-rerank pattern, and
// skipping it pays the full approximation penalty for nothing.
std::vector<int> Rerank(const Matrix& vectors, const Vector& query,
                        const std::vector<int>& candidates, std::size_t k) {
  std::vector<std::pair<double, int>> scored;
  scored.reserve(candidates.size());
  for (std::size_t i = 0; i < candidates.size(); ++i) {
    scored.emplace_back(SquaredDistance(vectors[candidates[i]], query), candidates[i]);
  }
  std::sort(scored.begin(), scored.end());

  std::vector<int> result;
  for (std::size_t i = 0; i < std::min(k, scored.size()); ++i) {
    result.push_back(scored[i].second);
  }
  return result;
}
`,
        profile:
          'Brute force is O(N * d) per query; HNSW is O(log N) hops times efSearch distance computations; IVF-PQ is O(nprobe * N/nlist) table lookups. Illustrative, not a measured benchmark: re-sorting the frontier on every insertion makes this HNSW search quadratic in efSearch, and erasing from the front of a vector is linear — both of which the next stage removes.',
      },

      'make-it-right': {
        code: `// The same structures, with the frontier as heaps and the metric as a type.
//
// Three things change. The candidate frontier becomes a pair of priority
// queues rather than repeatedly sorted vectors, which is what makes a
// bounded frontier actually bounded in cost. The distance metric becomes an
// explicit contract, because a cosine embedding model against a Euclidean
// index misranks everything and raises no error anywhere. And recall
// measurement becomes part of the type rather than a caller's good
// intention, since an index that is never measured has no known quality.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <queue>
#include <span>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <vector>

namespace ann {

class ShapeMismatch : public std::invalid_argument {
 public:
  explicit ShapeMismatch(const std::string& what) : std::invalid_argument(what) {}
};

class MetricMismatch : public std::invalid_argument {
 public:
  explicit MetricMismatch(const std::string& what) : std::invalid_argument(what) {}
};

// Deliberately strict. An ANN index fails by returning plausible wrong
// answers, so an unmeasured one has unknown quality - and 'unknown quality'
// is the normal state of vector search in production.
class UnmeasuredIndex : public std::logic_error {
 public:
  explicit UnmeasuredIndex(const std::string& what) : std::logic_error(what) {}
};

// The contract between the embedding model and the index.
//
// A model trained for cosine similarity searched under Euclidean distance
// misranks everything, silently and completely. Making this explicit is the
// highest-value piece of typing in the whole structure.
enum class Metric { kEuclidean, kInnerProduct, kCosine };

struct IndexConfig {
  std::size_t dimension{};
  Metric metric{Metric::kCosine};
  std::size_t max_degree{16};
  std::size_t ef_construction{100};
  double level_multiplier{1.0};

  void Validate() const {
    if (dimension == 0) {
      throw ShapeMismatch("dimension must be positive");
    }
    if (max_degree < 2) {
      throw ShapeMismatch("a degree below 2 cannot form a navigable graph");
    }
  }

  // Memory is usually the binding constraint, so make it visible.
  //
  // Full float vectors plus roughly max_degree 32-bit edges per node,
  // doubled because links are bidirectional. This number decides whether a
  // graph index is deployable at all at a given scale.
  [[nodiscard]] std::size_t EstimatedBytesPerVector() const noexcept {
    return 4 * dimension + 2 * 4 * max_degree;
  }
};

struct Neighbour {
  double distance{};
  int index{};

  // Distance first, so the natural ordering is the one the heaps want.
  friend bool operator<(const Neighbour& a, const Neighbour& b) noexcept {
    return a.distance < b.distance;
  }
  friend bool operator>(const Neighbour& a, const Neighbour& b) noexcept {
    return a.distance > b.distance;
  }
};

// Lower is nearer under EVERY metric, so one comparison works throughout.
//
// Inner product is negated for exactly that reason: mixing a
// higher-is-better metric into a lower-is-better search is a classic and
// completely silent ranking inversion.
[[nodiscard]] inline double Distance(std::span<const float> a, std::span<const float> b,
                                     Metric metric) noexcept {
  double total = 0.0;
  if (metric == Metric::kEuclidean) {
    for (std::size_t i = 0; i < a.size(); ++i) {
      const double difference = static_cast<double>(a[i]) - static_cast<double>(b[i]);
      total += difference * difference;
    }
    return total;
  }
  for (std::size_t i = 0; i < a.size(); ++i) {
    total += static_cast<double>(a[i]) * static_cast<double>(b[i]);
  }
  return -total;
}

// The bounded candidate set, as two heaps.
//
// A min-heap of candidates still to expand and a max-heap of the best found
// so far, capped at ef. The literal version re-sorted a vector on every
// insertion, which made a bounded frontier quadratic in its own bound; this
// makes each insertion logarithmic, which is what 'bounded' should mean.
class Frontier {
 public:
  explicit Frontier(std::size_t ef) : ef_(ef) {
    if (ef == 0) {
      throw ShapeMismatch("the frontier must admit at least one candidate");
    }
  }

  void Push(const Neighbour& neighbour) {
    candidates_.push(neighbour);
    best_.push(neighbour);
    if (best_.size() > ef_) {
      best_.pop();
    }
  }

  [[nodiscard]] bool Empty() const noexcept { return candidates_.empty(); }

  Neighbour PopNearest() {
    const Neighbour nearest = candidates_.top();
    candidates_.pop();
    return nearest;
  }

  [[nodiscard]] double WorstKept() const noexcept {
    return best_.empty() ? std::numeric_limits<double>::infinity() : best_.top().distance;
  }

  [[nodiscard]] bool Full() const noexcept { return best_.size() >= ef_; }

  [[nodiscard]] std::vector<Neighbour> Results() {
    std::vector<Neighbour> results;
    results.reserve(best_.size());
    while (!best_.empty()) {
      results.push_back(best_.top());
      best_.pop();
    }
    std::reverse(results.begin(), results.end());
    return results;
  }

 private:
  std::size_t ef_;
  std::priority_queue<Neighbour, std::vector<Neighbour>, std::greater<>> candidates_;
  std::priority_queue<Neighbour, std::vector<Neighbour>, std::less<>> best_;
};

// What the index actually returns, measured against brute force.
//
// A struct rather than a double because the tail matters: mean recall hides
// that a subset of queries is served badly, and in retrieval that subset is
// often the interesting one.
struct RecallReport {
  double mean_recall{};
  double worst_recall{};
  std::size_t queries_measured{};
  std::size_t ef_search{};

  [[nodiscard]] bool Acceptable(double floor) const noexcept {
    return mean_recall >= floor;
  }
};

// Flat vector storage with an explicit stride, so a vector is a contiguous
// span and the distance loop is a linear walk rather than a pointer chase.
class HnswIndex {
 public:
  explicit HnswIndex(IndexConfig config) : config_(config) { config_.Validate(); }

  // Layer is supplied rather than drawn, so builds are reproducible.
  int Add(std::span<const float> vector, int layer) {
    if (vector.size() != config_.dimension) {
      throw ShapeMismatch("vector width does not match the index dimension");
    }

    const int index = static_cast<int>(count_);
    data_.insert(data_.end(), vector.begin(), vector.end());
    if (config_.metric == Metric::kCosine) {
      NormalizeLast();
    }
    ++count_;

    graph_.resize(std::max<std::size_t>(graph_.size(),
                                        static_cast<std::size_t>(layer) + 1));
    for (int level = 0; level <= layer; ++level) {
      graph_[static_cast<std::size_t>(level)].resize(count_);
    }

    // Any structural change invalidates the measured recall.
    measured_ = false;
    return index;
  }

  [[nodiscard]] std::span<const float> At(int index) const {
    return std::span<const float>(data_.data() + static_cast<std::size_t>(index) * config_.dimension,
                                  config_.dimension);
  }

  [[nodiscard]] std::vector<Neighbour> SearchLayer(std::span<const float> query,
                                                   std::span<const int> entry_points,
                                                   std::size_t ef, int level) const {
    Frontier frontier(ef);
    std::unordered_set<int> visited(entry_points.begin(), entry_points.end());
    for (const int point : entry_points) {
      frontier.Push({Distance(At(point), query, config_.metric), point});
    }

    while (!frontier.Empty()) {
      const Neighbour current = frontier.PopNearest();
      // Guard clause: once the nearest unexpanded candidate is further than
      // the worst kept result, nothing better is reachable.
      if (frontier.Full() && current.distance > frontier.WorstKept()) {
        break;
      }

      for (const int neighbour : graph_[static_cast<std::size_t>(level)]
                                       [static_cast<std::size_t>(current.index)]) {
        if (!visited.insert(neighbour).second) {
          continue;
        }
        frontier.Push({Distance(At(neighbour), query, config_.metric), neighbour});
      }
    }
    return frontier.Results();
  }

  // The ground truth. Not a fallback — what recall is measured against.
  [[nodiscard]] std::vector<int> BruteForce(std::span<const float> query,
                                            std::size_t k) const {
    std::vector<Neighbour> scored;
    scored.reserve(count_);
    for (std::size_t i = 0; i < count_; ++i) {
      scored.push_back({Distance(At(static_cast<int>(i)), query, config_.metric),
                        static_cast<int>(i)});
    }
    // partial_sort, not a full sort: k is tiny relative to the collection.
    const std::size_t take = std::min(k, scored.size());
    std::partial_sort(scored.begin(), scored.begin() + static_cast<long>(take),
                      scored.end());

    std::vector<int> result;
    result.reserve(take);
    for (std::size_t i = 0; i < take; ++i) {
      result.push_back(scored[i].index);
    }
    return result;
  }

  void RequireMeasured() const {
    if (!measured_) {
      throw UnmeasuredIndex(
          "measure recall before querying; an unmeasured index has unknown quality "
          "and fails by returning plausible wrong answers");
    }
  }

  void MarkMeasured(const RecallReport& report) {
    recall_ = report;
    measured_ = true;
  }

  [[nodiscard]] const IndexConfig& config() const noexcept { return config_; }

 private:
  void NormalizeLast() {
    float* last = data_.data() + data_.size() - config_.dimension;
    double norm = 0.0;
    for (std::size_t i = 0; i < config_.dimension; ++i) {
      norm += static_cast<double>(last[i]) * static_cast<double>(last[i]);
    }
    if (norm == 0.0) {
      throw MetricMismatch("a zero vector has no direction; cosine is undefined");
    }
    const float inverse = static_cast<float>(1.0 / std::sqrt(norm));
    for (std::size_t i = 0; i < config_.dimension; ++i) {
      last[i] *= inverse;
    }
  }

  IndexConfig config_;
  std::vector<float> data_;  // count * dimension, row-major
  std::vector<std::vector<std::vector<int>>> graph_;
  std::size_t count_{0};
  RecallReport recall_{};
  bool measured_{false};
};

// Mean AND worst recall. The worst case matters: a mean hides that a subset
// of queries is served badly, and returning only the mean is how a degraded
// index passes review.
[[nodiscard]] inline RecallReport MeasureRecall(
    const std::vector<std::vector<int>>& approximate,
    const std::vector<std::vector<int>>& exact, std::size_t ef_search) {
  if (approximate.empty()) {
    throw ShapeMismatch("recall cannot be measured with no queries");
  }

  double total = 0.0;
  double worst = 1.0;
  for (std::size_t q = 0; q < approximate.size(); ++q) {
    std::unordered_set<int> truth(exact[q].begin(), exact[q].end());
    std::size_t hits = 0;
    for (const int candidate : approximate[q]) {
      hits += truth.count(candidate);
    }
    const double recall = static_cast<double>(hits) / static_cast<double>(exact[q].size());
    total += recall;
    worst = std::min(worst, recall);
  }

  return RecallReport{total / static_cast<double>(approximate.size()), worst,
                      approximate.size(), ef_search};
}

}  // namespace ann
`,
        rationale:
          'Three changes. The candidate frontier becomes a pair of priority queues rather than repeatedly sorted vectors — the literal version re-sorted on every insertion and erased from the front of a vector, which made a bounded frontier quadratic in its own bound, so "bounded" meant nothing operationally. The metric becomes an explicit enum, because a model trained for cosine similarity searched under Euclidean distance misranks everything with no error anywhere, and inner product is negated so lower is nearer under every metric, since mixing a higher-is-better metric into a lower-is-better search is a classic silent ranking inversion. The third is that measurement becomes part of the type: querying an unmeasured index throws, which is deliberately strict because an ANN index fails by returning plausible wrong answers and unknown quality is the normal state of vector search in production. Alongside those, vector storage flattens to one contiguous buffer so a vector is a span and the distance loop is a linear walk, brute force uses partial_sort since k is tiny relative to the collection, memory per vector is exposed as a method because it is usually the binding constraint, and any structural change invalidates the measurement.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'The frontier drops from O(ef^2) per layer search to O(ef log ef), and brute force from O(N log N) to O(N + k log k). Illustrative, not a measured benchmark: the heap change is what makes a large efSearch usable, which is exactly the regime where recall is worth buying.',
      },

      'make-it-fast': {
        code: `// Batched distances and table-lookup scoring. The distance loop disappears.
//
// The structural observation: a distance computation is a dot product, and a
// batch of queries against a batch of candidates is a MATRIX PRODUCT. So the
// inner loop that dominates every ANN structure becomes BLAS - and
// separately, product quantization removes the floating-point distance
// entirely by precomputing a lookup table per query.
//
// Three changes:
//   1. Brute force becomes one GEMM. It is the ground truth every recall
//      number is measured against, so making it fast is what makes
//      measurement affordable enough to actually do.
//   2. PQ scoring becomes a gather and a sum over the subquantizer axis: M
//      lookups per candidate and no distance arithmetic at all.
//   3. Codes are stored SUBQUANTIZER-MAJOR, so scanning one subquantizer
//      across every candidate is a contiguous read - which is what the
//      gather needs to vectorize.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <span>
#include <vector>

#include <cblas.h>
#include <omp.h>

namespace ann {

// Exact k-NN for a batch of queries, as one matrix product.
//
// ||q - x||^2 = ||q||^2 - 2 q.x + ||x||^2, and only the middle term depends
// on both - so the whole distance matrix is one GEMM plus a broadcast. The
// query norm is constant per row and cannot change the ranking, so it is
// dropped entirely rather than computed and added.
class BatchedBruteForce {
 public:
  BatchedBruteForce(int max_queries, int count, int dimension)
      : count_(count), dimension_(dimension),
        scores_(static_cast<std::size_t>(max_queries) * count),
        vector_norms_(static_cast<std::size_t>(count)) {}

  void Prepare(const float* __restrict vectors) {
    // Norms computed once for the whole collection, not per query.
#pragma omp parallel for schedule(static)
    for (int i = 0; i < count_; ++i) {
      const float* row = vectors + static_cast<std::size_t>(i) * dimension_;
      float total = 0.0F;
      for (int d = 0; d < dimension_; ++d) {
        total += row[d] * row[d];
      }
      vector_norms_[static_cast<std::size_t>(i)] = total;
    }
  }

  void Search(const float* __restrict vectors, const float* __restrict queries,
              int num_queries, int k, int* __restrict out) {
    cblas_sgemm(CblasRowMajor, CblasNoTrans, CblasTrans, num_queries, count_,
                dimension_, -2.0F, queries, dimension_, vectors, dimension_, 0.0F,
                scores_.data(), count_);

#pragma omp parallel for schedule(static)
    for (int q = 0; q < num_queries; ++q) {
      float* row = scores_.data() + static_cast<std::size_t>(q) * count_;
      for (int i = 0; i < count_; ++i) {
        row[i] += vector_norms_[static_cast<std::size_t>(i)];
      }

      // nth_element then a partial sort of the prefix: a selection is O(N)
      // where ordering the whole row is O(N log N) of discarded work.
      std::vector<int> order(static_cast<std::size_t>(count_));
      std::iota(order.begin(), order.end(), 0);
      std::nth_element(order.begin(), order.begin() + k, order.end(),
                       [row](int a, int b) { return row[a] < row[b]; });
      std::sort(order.begin(), order.begin() + k,
                [row](int a, int b) { return row[a] < row[b]; });
      std::copy(order.begin(), order.begin() + k,
                out + static_cast<std::size_t>(q) * k);
    }
  }

 private:
  int count_;
  int dimension_;
  std::vector<float> scores_;
  std::vector<float> vector_norms_;
};

// Per-subspace quantization with table-lookup scoring.
//
// The split is the whole trick: a joint quantizer over the full space would
// need an exponentially large codebook, while M independent codebooks of 256
// entries represent 256^M distinct vectors in M bytes.
class ProductQuantizer {
 public:
  ProductQuantizer(int dimension, int num_subquantizers, int codebook_size = 256)
      : m_(num_subquantizers), width_(dimension / num_subquantizers),
        codebook_size_(codebook_size),
        codebooks_(static_cast<std::size_t>(num_subquantizers) * codebook_size *
                   (dimension / num_subquantizers)),
        table_(static_cast<std::size_t>(num_subquantizers) * codebook_size) {}

  // The number that decides whether the deployment is possible at all.
  //
  // 768 float32 dimensions is 3072 bytes; 96 subquantizers is 96. That
  // 32-fold reduction is the entire reason IVF-PQ exists.
  [[nodiscard]] int BytesPerVector() const noexcept { return m_; }

  // Precompute query-to-centroid distances ONCE per query.
  //
  // After this, scoring a compressed vector is M lookups and M adds - no
  // floating-point distance computation at all.
  void BuildTable(const float* __restrict query) {
#pragma omp parallel for schedule(static)
    for (int m = 0; m < m_; ++m) {
      const float* piece = query + static_cast<std::size_t>(m) * width_;
      const float* codebook =
          codebooks_.data() + static_cast<std::size_t>(m) * codebook_size_ * width_;
      float* row = table_.data() + static_cast<std::size_t>(m) * codebook_size_;

      for (int c = 0; c < codebook_size_; ++c) {
        const float* centroid = codebook + static_cast<std::size_t>(c) * width_;
        float total = 0.0F;
        // Contiguous, restrict-qualified, known trip count: the vectorizer
        // needs nothing more than this.
        for (int d = 0; d < width_; ++d) {
          const float difference = piece[d] - centroid[d];
          total += difference * difference;
        }
        row[c] = total;
      }
    }
  }

  // codes is SUBQUANTIZER-MAJOR: (M x n), so scanning subquantizer m across
  // every candidate is a contiguous byte read. The natural (n x M) layout
  // makes this hot loop strided and defeats the vectorizer entirely.
  void Score(const uint8_t* __restrict codes, int n, float* __restrict out) const {
    std::fill(out, out + n, 0.0F);

    for (int m = 0; m < m_; ++m) {
      const uint8_t* row = codes + static_cast<std::size_t>(m) * n;
      const float* table = table_.data() + static_cast<std::size_t>(m) * codebook_size_;
      // A gather, accumulated across subquantizers. No arithmetic on the
      // vectors themselves happens anywhere in this loop.
      for (int i = 0; i < n; ++i) {
        out[i] += table[row[i]];
      }
    }
  }

 private:
  int m_;
  int width_;
  int codebook_size_;
  std::vector<float> codebooks_;
  std::vector<float> table_;
};

// Rescore an approximate shortlist with EXACT distances.
//
// Cheap, since it touches only the shortlist, and it recovers most of the
// recall that quantization costs. Skipping it pays the full approximation
// penalty for no reason.
inline void Rerank(const float* __restrict vectors, const float* __restrict query,
                   std::span<const int> shortlist, int dimension, int k,
                   int* __restrict out) {
  std::vector<std::pair<float, int>> scored(shortlist.size());

#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < shortlist.size(); ++i) {
    const float* candidate =
        vectors + static_cast<std::size_t>(shortlist[i]) * dimension;
    float total = 0.0F;
    for (int d = 0; d < dimension; ++d) {
      const float difference = query[d] - candidate[d];
      total += difference * difference;
    }
    scored[i] = {total, shortlist[i]};
  }

  const std::size_t take = std::min<std::size_t>(static_cast<std::size_t>(k), scored.size());
  std::partial_sort(scored.begin(), scored.begin() + static_cast<long>(take), scored.end());
  for (std::size_t i = 0; i < take; ++i) {
    out[i] = scored[i].second;
  }
}

}  // namespace ann
`,
        rationale:
          'The structural observation is that a distance computation is a dot product, so a batch of queries against a collection is a matrix product — and the expansion of squared Euclidean distance means only the cross term depends on both operands, with the query norm constant per row and therefore droppable since it cannot change a ranking. Folding the minus two into the GEMM’s alpha means the scaling costs nothing extra. That turns brute force into one GEMM, which matters more than it appears: brute force is the ground truth every recall number is measured against, so making it cheap is what makes measurement affordable enough that teams actually do it. Product quantization then removes floating-point distance entirely — one table per query, after which scoring is a gather and an accumulation across subquantizers. The codes are stored subquantizer-major rather than vector-major precisely because scoring scans one subquantizer across every candidate, which is a contiguous byte read only in that layout; the natural layout makes the hot loop strided and defeats the vectorizer. Selections use nth_element and partial_sort throughout, since k is tiny relative to the collection.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Exact distances for a whole query batch become one GEMM via the norm expansion, with the minus-two factor folded into alpha so the scaling is free.',
            tradeoff: 'The score matrix is queries times collection size in float32, so a large batch against a large collection cannot be materialized and must be chunked — which is exactly the case where the batch was most wanted.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Subquantizer-major codes make the scoring gather a contiguous byte read per subquantizer, and the collection norms are precomputed once rather than per query.',
            tradeoff: 'Subquantizer-major is the wrong layout for inserting or deleting a single vector, since one vector’s code is strided across M arrays — so mutation becomes substantially more expensive than query.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Queries, subquantizer tables and rerank candidates are all independent with no shared writes, so each parallelizes with no reduction or critical section.',
            tradeoff: 'The per-query selection allocates an index vector inside the parallel region, so on a small k the allocation dominates the selection it enables — and nesting this around a threaded BLAS oversubscribes the machine.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The per-subspace distance loop and the rerank distance loop are contiguous, restrict-qualified and of known trip count, which is everything the vectorizer needs.',
            tradeoff: 'The scoring gather is an indexed read the compiler cannot vectorize without gather instructions, so that loop stays scalar however the rest is compiled — and it is the hot one.',
          },
        ],
        libraryName: 'OpenBLAS + OpenMP',
        profile:
          'Brute force becomes one GEMM per batch instead of N * d scalar operations per query; PQ scoring becomes M byte lookups per candidate with no distance arithmetic. Illustrative, not a measured benchmark: a fast brute force is what makes continuous recall measurement affordable, which is the practice separating a tuned index from an unmeasured one.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// A navigable small-world graph and product quantization, written out.
//
// Two structures, two attacks on the same constrained problem:
//
//   maximize recall   subject to   latency <= tau   and   memory <= M
//
// HNSW spends MEMORY to buy recall: a layered proximity graph searched
// greedily with a bounded frontier. IVF-PQ spends RECALL to buy memory:
// coarse clusters so a query visits few cells, plus per-subspace
// quantization so a 768-float vector becomes about 96 bytes.
//
// Brute force is here too, because it is the ground truth every recall
// number is measured against - and a system that never measures it has no
// idea what its retrieval is returning.

use std::collections::{BTreeMap, BTreeSet};

/// A deliberately small generator, so the layer-assignment story stays visible.
struct Lcg {
    state: u64,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }

    fn uniform(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 11) as f64) / ((1u64 << 53) as f64)
    }
}

fn squared_distance(a: &[f64], b: &[f64]) -> f64 {
    let mut total = 0.0;
    for i in 0..a.len() {
        let difference = a[i] - b[i];
        total += difference * difference;
    }
    total
}

/// The exact answer. Not a fallback - the GROUND TRUTH.
///
/// Every recall figure quoted about an index is measured against this on a
/// sample. Without it the accuracy-speed frontier is invisible and you are
/// tuning blind.
fn brute_force(vectors: &[Vec<f64>], query: &[f64], k: usize) -> Vec<usize> {
    let mut scored: Vec<(f64, usize)> = vectors
        .iter()
        .enumerate()
        .map(|(index, vector)| (squared_distance(vector, query), index))
        .collect();
    scored.sort_by(|a, b| a.0.total_cmp(&b.0));
    scored.into_iter().take(k).map(|(_, index)| index).collect()
}

fn recall_at_k(approximate: &[usize], exact: &[usize]) -> f64 {
    let truth: BTreeSet<usize> = exact.iter().copied().collect();
    let hits = approximate.iter().filter(|i| truth.contains(i)).count();
    hits as f64 / exact.len() as f64
}

// --------------------------------------------------------------------------
// HNSW: a proximity graph searched greedily with a bounded frontier
// --------------------------------------------------------------------------

/// Geometric layer assignment.
///
/// Exactly the skip-list trick lifted into metric space: most nodes live only
/// at the bottom, a few reach higher, and the sparse upper layers give the
/// long-range hops that make the search logarithmic.
fn assign_layer(rng: &mut Lcg, level_multiplier: f64) -> usize {
    (-rng.uniform().max(1e-12).ln() * level_multiplier) as usize
}

type Graph = BTreeMap<usize, BTreeMap<usize, Vec<usize>>>;

/// Greedy best-first search with a frontier of at most \`ef\`.
///
/// ef is THE dial. It bounds how many candidates are ever examined, which
/// bounds latency - and bounds recall at the same time, in the same motion.
/// Nothing about this structure lets you have both.
fn search_layer(
    vectors: &[Vec<f64>],
    graph: &Graph,
    query: &[f64],
    entry_points: &[usize],
    ef: usize,
    layer: usize,
) -> Vec<(f64, usize)> {
    let mut visited: BTreeSet<usize> = entry_points.iter().copied().collect();
    let mut candidates: Vec<(f64, usize)> = entry_points
        .iter()
        .map(|&point| (squared_distance(&vectors[point], query), point))
        .collect();
    candidates.sort_by(|a, b| a.0.total_cmp(&b.0));
    let mut best = candidates.clone();

    while !candidates.is_empty() {
        let current = candidates.remove(0);
        if !best.is_empty() && current.0 > best[best.len() - 1].0 && best.len() >= ef {
            break; // nothing closer is reachable from here
        }

        let empty = Vec::new();
        let neighbours = graph
            .get(&layer)
            .and_then(|level| level.get(&current.1))
            .unwrap_or(&empty);

        for &neighbour in neighbours {
            if visited.contains(&neighbour) {
                continue;
            }
            visited.insert(neighbour);
            let distance = squared_distance(&vectors[neighbour], query);
            if best.len() < ef || distance < best[best.len() - 1].0 {
                candidates.push((distance, neighbour));
                candidates.sort_by(|a, b| a.0.total_cmp(&b.0));
                best.push((distance, neighbour));
                best.sort_by(|a, b| a.0.total_cmp(&b.0));
                if best.len() > ef {
                    best.pop();
                }
            }
        }
    }
    best
}

// --------------------------------------------------------------------------
// IVF-PQ: coarse clusters plus per-subspace quantization
// --------------------------------------------------------------------------

/// Lloyd's algorithm. Used twice: for coarse cells and for codebooks.
fn kmeans(vectors: &[Vec<f64>], num_clusters: usize, iterations: usize, rng: &mut Lcg) -> Vec<Vec<f64>> {
    let mut centroids: Vec<Vec<f64>> = (0..num_clusters)
        .map(|_| vectors[(rng.uniform() * vectors.len() as f64) as usize % vectors.len()].clone())
        .collect();

    for _ in 0..iterations {
        let assignments: Vec<usize> = vectors
            .iter()
            .map(|vector| {
                let mut best = 0;
                let mut best_distance = squared_distance(vector, &centroids[0]);
                for c in 1..num_clusters {
                    let candidate = squared_distance(vector, &centroids[c]);
                    if candidate < best_distance {
                        best_distance = candidate;
                        best = c;
                    }
                }
                best
            })
            .collect();

        for c in 0..num_clusters {
            let members: Vec<&Vec<f64>> = vectors
                .iter()
                .zip(&assignments)
                .filter(|(_, &a)| a == c)
                .map(|(vector, _)| vector)
                .collect();
            if members.is_empty() {
                continue;
            }
            for d in 0..centroids[c].len() {
                centroids[c][d] =
                    members.iter().map(|member| member[d]).sum::<f64>() / members.len() as f64;
            }
        }
    }
    centroids
}

/// Split the vector into M pieces and quantize each SEPARATELY.
///
/// The split is the whole trick. A joint quantizer covering the full space
/// would need an exponentially large codebook; M independent codebooks of 256
/// entries each represent 256^M distinct vectors using M bytes.
fn train_pq(
    vectors: &[Vec<f64>],
    num_subquantizers: usize,
    codebook_size: usize,
    rng: &mut Lcg,
) -> Vec<Vec<Vec<f64>>> {
    let dimension = vectors[0].len();
    assert!(
        dimension % num_subquantizers == 0,
        "subquantizer count must divide the dimension"
    );
    let width = dimension / num_subquantizers;

    (0..num_subquantizers)
        .map(|m| {
            let pieces: Vec<Vec<f64>> = vectors
                .iter()
                .map(|vector| vector[m * width..(m + 1) * width].to_vec())
                .collect();
            kmeans(&pieces, codebook_size, 10, rng)
        })
        .collect()
}

/// Precompute query-to-centroid distances ONCE per query.
///
/// After this, scoring a compressed vector is M table lookups and M adds - no
/// floating-point distance computation at all. That substitution is what
/// makes IVF-PQ fast as well as small.
fn pq_distance_table(query: &[f64], codebooks: &[Vec<Vec<f64>>]) -> Vec<Vec<f64>> {
    let width = query.len() / codebooks.len();
    codebooks
        .iter()
        .enumerate()
        .map(|(m, codebook)| {
            let piece = &query[m * width..(m + 1) * width];
            codebook
                .iter()
                .map(|centroid| squared_distance(piece, centroid))
                .collect()
        })
        .collect()
}

/// Rescore approximate candidates with EXACT distances.
///
/// Cheap - it touches only the shortlist - and it recovers most of the recall
/// that quantization costs. The standard retrieve-then-rerank pattern, and
/// skipping it pays the full approximation penalty for nothing.
fn rerank(vectors: &[Vec<f64>], query: &[f64], candidates: &[usize], k: usize) -> Vec<usize> {
    let mut scored: Vec<(f64, usize)> = candidates
        .iter()
        .map(|&index| (squared_distance(&vectors[index], query), index))
        .collect();
    scored.sort_by(|a, b| a.0.total_cmp(&b.0));
    scored.into_iter().take(k).map(|(_, index)| index).collect()
}
`,
        profile:
          'Brute force is O(N * d) per query; HNSW is O(log N) hops times efSearch distance computations; IVF-PQ is O(nprobe * N/nlist) table lookups. Illustrative, not a measured benchmark: re-sorting the frontier on every insertion makes this HNSW search quadratic in efSearch, and removing from the front of a Vec is linear — both of which the next stage removes.',
      },

      'make-it-right': {
        code: `//! The same structures, with the frontier as heaps and the metric as a type.
//!
//! Three things change. The candidate frontier becomes a pair of binary heaps
//! rather than repeatedly sorted Vecs, which is what makes a bounded frontier
//! actually bounded in cost. The distance metric becomes an explicit
//! contract, because a cosine embedding model against a Euclidean index
//! misranks everything and raises no error anywhere. And recall measurement
//! becomes part of the type rather than a caller's good intention, since an
//! index that is never measured has no known quality at all.

use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashSet};
use std::fmt;

/// Number of vectors in the collection.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct VectorCount(pub usize);

/// Width of a vector.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Dimension(pub usize);

/// Candidate frontier size — the dial trading recall against latency.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct EfSearch(pub usize);

/// The contract between the embedding model and the index.
///
/// A model trained for cosine similarity searched under Euclidean distance
/// misranks everything, silently and completely. Making this explicit is the
/// highest-value piece of typing in the whole structure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Metric {
    Euclidean,
    InnerProduct,
    Cosine,
}

#[derive(Debug, PartialEq)]
pub enum IndexError {
    /// A zero vector, which has no direction and cannot be cosine-normalized.
    ZeroVector,
    /// A vector whose width does not match the index.
    ShapeMismatch { expected: usize, found: usize },
    /// A frontier that admits no candidates.
    EmptyFrontier,
    /// The index was queried before its recall was measured.
    ///
    /// Deliberately strict. An ANN index fails by returning plausible wrong
    /// answers, so an unmeasured one has unknown quality - and 'unknown
    /// quality' is the normal state of vector search in production.
    Unmeasured,
    /// A degree too small to form a navigable graph.
    DegreeTooSmall(usize),
}

impl fmt::Display for IndexError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ZeroVector => write!(f, "a zero vector has no direction; cosine is undefined"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} dimensions, found {found}")
            }
            Self::EmptyFrontier => write!(f, "the frontier must admit at least one candidate"),
            Self::Unmeasured => write!(
                f,
                "measure recall before querying; an unmeasured index has unknown \
                 quality and fails by returning plausible wrong answers"
            ),
            Self::DegreeTooSmall(degree) => {
                write!(f, "degree {degree} cannot form a navigable graph")
            }
        }
    }
}

impl std::error::Error for IndexError {}

/// Distance first, so the derived ordering is the one the heaps want.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Neighbour {
    pub distance: f64,
    pub index: usize,
}

impl Eq for Neighbour {}

impl Ord for Neighbour {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // total_cmp rather than partial_cmp().unwrap(): a NaN distance from a
        // degenerate vector would otherwise panic deep inside the heap.
        self.distance.total_cmp(&other.distance)
    }
}

impl PartialOrd for Neighbour {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Debug, Clone, Copy)]
pub struct IndexConfig {
    pub dimension: Dimension,
    pub metric: Metric,
    pub max_degree: usize,
    pub ef_construction: usize,
}

impl IndexConfig {
    pub fn validate(&self) -> Result<(), IndexError> {
        if self.max_degree < 2 {
            return Err(IndexError::DegreeTooSmall(self.max_degree));
        }
        Ok(())
    }

    /// Memory is usually the binding constraint, so make it visible.
    ///
    /// Full f32 vectors plus roughly max_degree 32-bit edges per node,
    /// doubled because links are bidirectional. This number decides whether
    /// a graph index is deployable at all at a given scale.
    pub fn estimated_bytes_per_vector(&self) -> usize {
        4 * self.dimension.0 + 2 * 4 * self.max_degree
    }
}

/// Lower is nearer under EVERY metric, so one comparison works throughout.
///
/// Inner product is negated for exactly that reason: mixing a
/// higher-is-better metric into a lower-is-better search is a classic and
/// completely silent ranking inversion.
pub fn distance(a: &[f32], b: &[f32], metric: Metric) -> f64 {
    match metric {
        Metric::Euclidean => a
            .iter()
            .zip(b)
            .map(|(x, y)| {
                let difference = f64::from(*x) - f64::from(*y);
                difference * difference
            })
            .sum(),
        _ => -a
            .iter()
            .zip(b)
            .map(|(x, y)| f64::from(*x) * f64::from(*y))
            .sum::<f64>(),
    }
}

/// The bounded candidate set, as two heaps.
///
/// A min-heap of candidates still to expand and a max-heap of the best found
/// so far, capped at ef. The literal version re-sorted a Vec on every
/// insertion and removed from its front, which made a bounded frontier
/// quadratic in its own bound; this makes each insertion logarithmic, which
/// is what 'bounded' should mean.
pub struct Frontier {
    ef: usize,
    candidates: BinaryHeap<Reverse<Neighbour>>,
    best: BinaryHeap<Neighbour>,
}

impl Frontier {
    pub fn new(ef: EfSearch) -> Result<Self, IndexError> {
        if ef.0 == 0 {
            return Err(IndexError::EmptyFrontier);
        }
        Ok(Self {
            ef: ef.0,
            candidates: BinaryHeap::with_capacity(ef.0 * 2),
            best: BinaryHeap::with_capacity(ef.0 + 1),
        })
    }

    pub fn push(&mut self, neighbour: Neighbour) {
        self.candidates.push(Reverse(neighbour));
        self.best.push(neighbour);
        if self.best.len() > self.ef {
            self.best.pop();
        }
    }

    pub fn pop_nearest(&mut self) -> Option<Neighbour> {
        self.candidates.pop().map(|Reverse(neighbour)| neighbour)
    }

    pub fn worst_kept(&self) -> f64 {
        self.best.peek().map_or(f64::INFINITY, |n| n.distance)
    }

    pub fn full(&self) -> bool {
        self.best.len() >= self.ef
    }

    pub fn into_results(self) -> Vec<Neighbour> {
        let mut results = self.best.into_sorted_vec();
        results.truncate(self.ef);
        results
    }
}

/// What the index actually returns, measured against brute force.
///
/// A struct rather than an f64 because the tail matters: mean recall hides
/// that a subset of queries is served badly, and in retrieval that subset is
/// often the interesting one.
#[derive(Debug, Clone, Copy)]
pub struct RecallReport {
    pub mean_recall: f64,
    pub worst_recall: f64,
    pub queries_measured: usize,
    pub ef_search: EfSearch,
}

impl RecallReport {
    pub fn acceptable(&self, floor: f64) -> bool {
        self.mean_recall >= floor
    }
}

/// Flat vector storage with an explicit stride, so a vector is a contiguous
/// slice and the distance loop is a linear walk rather than a pointer chase.
pub struct HnswIndex {
    config: IndexConfig,
    data: Vec<f32>,
    graph: Vec<Vec<Vec<u32>>>,
    count: usize,
    recall: Option<RecallReport>,
}

impl HnswIndex {
    pub fn new(config: IndexConfig) -> Result<Self, IndexError> {
        config.validate()?;
        Ok(Self { config, data: Vec::new(), graph: Vec::new(), count: 0, recall: None })
    }

    pub fn vector(&self, index: usize) -> &[f32] {
        let width = self.config.dimension.0;
        &self.data[index * width..(index + 1) * width]
    }

    /// Layer is supplied rather than drawn, so builds are reproducible.
    pub fn add(&mut self, vector: &[f32], layer: usize) -> Result<usize, IndexError> {
        if vector.len() != self.config.dimension.0 {
            return Err(IndexError::ShapeMismatch {
                expected: self.config.dimension.0,
                found: vector.len(),
            });
        }

        let index = self.count;
        self.data.extend_from_slice(vector);
        if self.config.metric == Metric::Cosine {
            self.normalize_last()?;
        }
        self.count += 1;

        if self.graph.len() <= layer {
            self.graph.resize(layer + 1, Vec::new());
        }
        for level in 0..=layer {
            self.graph[level].resize(self.count, Vec::new());
        }

        // Any structural change invalidates the measured recall.
        self.recall = None;
        Ok(index)
    }

    fn normalize_last(&mut self) -> Result<(), IndexError> {
        let width = self.config.dimension.0;
        let start = self.data.len() - width;
        let norm: f64 = self.data[start..].iter().map(|v| f64::from(*v) * f64::from(*v)).sum();
        if norm == 0.0 {
            return Err(IndexError::ZeroVector);
        }
        let inverse = (1.0 / norm.sqrt()) as f32;
        for value in self.data[start..].iter_mut() {
            *value *= inverse;
        }
        Ok(())
    }

    pub fn search_layer(
        &self,
        query: &[f32],
        entry_points: &[usize],
        ef: EfSearch,
        level: usize,
    ) -> Result<Vec<Neighbour>, IndexError> {
        let mut frontier = Frontier::new(ef)?;
        let mut visited: HashSet<usize> = entry_points.iter().copied().collect();
        for &point in entry_points {
            frontier.push(Neighbour {
                distance: distance(self.vector(point), query, self.config.metric),
                index: point,
            });
        }

        while let Some(current) = frontier.pop_nearest() {
            // Guard clause: once the nearest unexpanded candidate is further
            // than the worst kept result, nothing better is reachable.
            if frontier.full() && current.distance > frontier.worst_kept() {
                break;
            }

            for &neighbour in &self.graph[level][current.index] {
                let neighbour = neighbour as usize;
                if !visited.insert(neighbour) {
                    continue;
                }
                frontier.push(Neighbour {
                    distance: distance(self.vector(neighbour), query, self.config.metric),
                    index: neighbour,
                });
            }
        }
        Ok(frontier.into_results())
    }

    /// The ground truth. Not a fallback — what recall is measured against.
    pub fn brute_force(&self, query: &[f32], k: usize) -> Vec<usize> {
        let mut scored: Vec<Neighbour> = (0..self.count)
            .map(|index| Neighbour {
                distance: distance(self.vector(index), query, self.config.metric),
                index,
            })
            .collect();

        // select_nth_unstable then sort the prefix: a selection is O(N) where
        // ordering the whole collection is O(N log N) of discarded work.
        let take = k.min(scored.len());
        if take < scored.len() {
            scored.select_nth_unstable(take);
        }
        scored[..take].sort_unstable();
        scored[..take].iter().map(|n| n.index).collect()
    }

    pub fn require_measured(&self) -> Result<RecallReport, IndexError> {
        self.recall.ok_or(IndexError::Unmeasured)
    }

    pub fn mark_measured(&mut self, report: RecallReport) {
        self.recall = Some(report);
    }
}

/// Mean AND worst recall. The worst case matters: a mean hides that a subset
/// of queries is served badly, and returning only the mean is how a degraded
/// index passes review.
pub fn measure_recall(
    approximate: &[Vec<usize>],
    exact: &[Vec<usize>],
    ef_search: EfSearch,
) -> RecallReport {
    let mut total = 0.0;
    let mut worst = 1.0f64;

    for (found, truth) in approximate.iter().zip(exact) {
        let truth_set: HashSet<usize> = truth.iter().copied().collect();
        let hits = found.iter().filter(|i| truth_set.contains(i)).count();
        let recall = hits as f64 / truth.len() as f64;
        total += recall;
        worst = worst.min(recall);
    }

    RecallReport {
        mean_recall: total / approximate.len() as f64,
        worst_recall: worst,
        queries_measured: approximate.len(),
        ef_search,
    }
}
`,
        rationale:
          'Three changes. The candidate frontier becomes a pair of binary heaps rather than repeatedly sorted Vecs — the literal version re-sorted on every insertion and removed from the front of a Vec, which made a bounded frontier quadratic in its own bound, so "bounded" meant nothing operationally. The metric becomes an explicit enum, because a model trained for cosine similarity searched under Euclidean distance misranks everything with no error anywhere, and inner product is negated so lower is nearer under every metric; Neighbour orders by total_cmp rather than an unwrapped partial comparison, since a NaN distance from a degenerate vector would otherwise panic deep inside the heap. The third is that measurement becomes part of the type: querying requires a recall report and returns an error without one, which is deliberately strict because an ANN index fails by returning plausible wrong answers and unknown quality is the normal state of vector search in production. Alongside those, vector storage flattens so a vector is a contiguous slice, brute force uses select_nth_unstable since k is tiny, memory per vector is exposed because it is usually the binding constraint, and any structural change invalidates the measurement.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'The frontier drops from O(ef^2) per layer search to O(ef log ef), and brute force from O(N log N) to O(N + k log k). Illustrative, not a measured benchmark: the heap change is what makes a large efSearch usable, which is exactly the regime where recall is worth buying.',
      },

      'make-it-fast': {
        code: `//! Batched distances and table-lookup scoring. The distance loop disappears.
//!
//! The structural observation: a distance computation is a dot product, and a
//! batch of queries against a batch of candidates is a MATRIX PRODUCT. So the
//! inner loop that dominates every ANN structure becomes BLAS - and
//! separately, product quantization removes the floating-point distance
//! entirely by precomputing a lookup table per query.
//!
//! Three changes:
//!   1. Brute force becomes one matrix product. It is the ground truth every
//!      recall number is measured against, so making it fast is what makes
//!      measurement affordable enough to actually do.
//!   2. PQ scoring becomes a gather and a sum over the subquantizer axis: M
//!      lookups per candidate and no distance arithmetic at all.
//!   3. Codes are stored SUBQUANTIZER-MAJOR, so scanning one subquantizer
//!      across every candidate is a contiguous byte read.

use ndarray::{Array1, Array2, ArrayView1, ArrayView2, Axis};
use rayon::prelude::*;

/// Exact k-NN for a batch of queries, as one matrix product.
///
/// ||q - x||^2 = ||q||^2 - 2 q.x + ||x||^2, and only the middle term depends
/// on both - so the whole distance matrix is one product plus a broadcast.
/// The query norm is constant per row and cannot change the ranking, so it is
/// dropped entirely rather than computed and added.
pub struct BatchedBruteForce {
    /// Norms computed once for the collection, not per query.
    vector_norms: Array1<f32>,
}

impl BatchedBruteForce {
    pub fn new(vectors: ArrayView2<'_, f32>) -> Self {
        let vector_norms = vectors
            .axis_iter(Axis(0))
            .into_par_iter()
            .map(|row| row.iter().map(|v| v * v).sum::<f32>())
            .collect::<Vec<f32>>()
            .into();
        Self { vector_norms }
    }

    pub fn search(
        &self,
        vectors: ArrayView2<'_, f32>,
        queries: ArrayView2<'_, f32>,
        k: usize,
    ) -> Vec<Vec<u32>> {
        let mut scores = queries.dot(&vectors.t());
        scores *= -2.0;
        scores += &self.vector_norms;

        scores
            .axis_iter(Axis(0))
            .into_par_iter()
            .map(|row| {
                // Capacity known exactly: one allocation per query for the
                // index permutation, and none inside the selection.
                let mut order: Vec<u32> = (0..row.len() as u32).collect();
                let take = k.min(order.len());
                if take < order.len() {
                    // select_nth_unstable, not a sort: a selection is O(N)
                    // where ordering the rest is discarded work.
                    order.select_nth_unstable_by(take, |&a, &b| {
                        row[a as usize].total_cmp(&row[b as usize])
                    });
                }
                order.truncate(take);
                order.sort_unstable_by(|&a, &b| {
                    row[a as usize].total_cmp(&row[b as usize])
                });
                order
            })
            .collect()
    }
}

/// Per-subspace quantization with table-lookup scoring.
///
/// The split is the whole trick: a joint quantizer over the full space would
/// need an exponentially large codebook, while M independent codebooks of 256
/// entries represent 256^M distinct vectors in M bytes.
pub struct ProductQuantizer {
    m: usize,
    width: usize,
    codebook_size: usize,
    /// (M * codebook_size, width), contiguous so each subspace distance is a
    /// dense product rather than a strided gather.
    codebooks: Array2<f32>,
}

impl ProductQuantizer {
    pub fn new(dimension: usize, m: usize, codebook_size: usize) -> Self {
        assert!(dimension % m == 0, "subquantizer count must divide the dimension");
        assert!(codebook_size <= 256, "a codebook above 256 entries no longer fits in a byte");
        Self {
            m,
            width: dimension / m,
            codebook_size,
            codebooks: Array2::zeros((m * codebook_size, dimension / m)),
        }
    }

    /// The number that decides whether the deployment is possible at all.
    ///
    /// 768 f32 dimensions is 3072 bytes; 96 subquantizers is 96. That 32-fold
    /// reduction is the entire reason IVF-PQ exists.
    pub fn bytes_per_vector(&self) -> usize {
        self.m
    }

    /// Precompute query-to-centroid distances ONCE per query.
    ///
    /// After this, scoring a compressed vector is M lookups and M adds - no
    /// floating-point distance computation at all.
    pub fn build_table(&self, query: ArrayView1<'_, f32>) -> Vec<f32> {
        // Capacity known exactly, filled by a parallel extend: one allocation
        // for the whole table.
        (0..self.m)
            .into_par_iter()
            .flat_map_iter(|m| {
                let piece = query.slice(ndarray::s![m * self.width..(m + 1) * self.width]);
                (0..self.codebook_size).map(move |c| {
                    let centroid = self.codebooks.row(m * self.codebook_size + c);
                    // Zipped contiguous slices: no per-element bounds check
                    // survives into the generated code.
                    piece
                        .iter()
                        .zip(centroid.iter())
                        .map(|(q, v)| (q - v) * (q - v))
                        .sum::<f32>()
                })
            })
            .collect()
    }

    /// \`codes\` is SUBQUANTIZER-MAJOR: (M x n), so scanning subquantizer m
    /// across every candidate is a contiguous byte read. The natural (n x M)
    /// layout makes this hot loop strided and defeats the vectorizer.
    pub fn score(&self, table: &[f32], codes: &[u8], n: usize, out: &mut [f32]) {
        out.fill(0.0);

        for m in 0..self.m {
            let row = &codes[m * n..(m + 1) * n];
            let slab = &table[m * self.codebook_size..(m + 1) * self.codebook_size];
            // A gather, accumulated across subquantizers. No arithmetic on
            // the vectors themselves happens anywhere in this loop.
            for (accumulator, &code) in out.iter_mut().zip(row) {
                *accumulator += slab[code as usize];
            }
        }
    }
}

/// Rescore an approximate shortlist with EXACT distances.
///
/// Cheap, since it touches only the shortlist, and it recovers most of the
/// recall that quantization costs. Skipping it pays the full approximation
/// penalty for no reason.
pub fn rerank(
    vectors: ArrayView2<'_, f32>,
    query: ArrayView1<'_, f32>,
    shortlist: &[u32],
    k: usize,
) -> Vec<u32> {
    let mut scored: Vec<(f32, u32)> = shortlist
        .par_iter()
        .map(|&index| {
            let candidate = vectors.row(index as usize);
            let distance = query
                .iter()
                .zip(candidate.iter())
                .map(|(q, v)| (q - v) * (q - v))
                .sum::<f32>();
            (distance, index)
        })
        .collect();

    let take = k.min(scored.len());
    if take < scored.len() {
        scored.select_nth_unstable_by(take, |a, b| a.0.total_cmp(&b.0));
    }
    scored.truncate(take);
    scored.sort_unstable_by(|a, b| a.0.total_cmp(&b.0));
    scored.into_iter().map(|(_, index)| index).collect()
}
`,
        rationale:
          'The structural observation is that a distance computation is a dot product, so a batch of queries against a collection is a matrix product — and the expansion of squared Euclidean distance means only the cross term depends on both operands, with the query norm constant per row and therefore droppable since it cannot change a ranking. That turns brute force into one product, which matters more than it appears: brute force is the ground truth every recall number is measured against, so making it cheap is what makes measurement affordable enough that teams actually do it. Product quantization then removes floating-point distance entirely — one table per query, after which scoring is a gather and an accumulation across subquantizers. The codes are stored subquantizer-major rather than vector-major precisely because scoring scans one subquantizer across every candidate, which is a contiguous byte read only in that layout. Every selection uses select_nth_unstable rather than a sort, since k is tiny relative to the collection, and every comparison uses total_cmp so a NaN from a degenerate vector cannot panic inside a sort.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Exact distances for a whole query batch become one sgemm via the norm expansion, and the collection norms are computed once rather than per query.',
            tradeoff: 'Binds the build to a system BLAS, and the score matrix is queries times collection size in f32 — a large batch against a large collection cannot be materialized and must be chunked, which is exactly the case where the batch was most wanted.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Queries, subquantizer tables and rerank candidates are all independent with no shared writes, so each becomes a parallel iterator with no reduction.',
            tradeoff: 'The scoring gather is deliberately left serial because it accumulates into one output buffer across subquantizers; parallelizing it would need per-thread partials and a reduction that costs more than the gather.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Subquantizer-major codes make the scoring gather a contiguous byte read per subquantizer, and the codebooks are one standard-layout array so each subspace distance is a dense walk.',
            tradeoff: 'Subquantizer-major is the wrong layout for inserting or deleting a single vector, since one vector’s code is strided across M slices — so mutation becomes substantially more expensive than query.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The per-query index permutation, the distance table and the rerank scores all have exactly known lengths, so none of them reallocates while being filled.',
            tradeoff: 'The index permutation is allocated per query inside the parallel map, so on a very large collection with a small k that allocation is a meaningful share of the per-query cost.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile:
          'Brute force becomes one matrix product per batch instead of N * d scalar operations per query; PQ scoring becomes M byte lookups per candidate with no distance arithmetic. Illustrative, not a measured benchmark: a fast brute force is what makes continuous recall measurement affordable, which is the practice separating a tuned index from an unmeasured one.',
      },
    },
  },
};
