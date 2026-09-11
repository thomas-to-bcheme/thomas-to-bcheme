import type { AiMlModel } from '../../types';

/**
 * DeepWalk & node2vec — word2vec applied to graphs.
 *
 * The entry that makes the "sample a corpus, then run skip-gram" trick
 * explicit: a random walk turns a graph into sentences, after which an
 * entirely off-the-shelf language-model objective produces node embeddings.
 */
export const NODE2VEC: AiMlModel = {
  slug: 'node2vec',
  name: 'DeepWalk & Node2Vec',
  aliases: ['DeepWalk', 'node2vec', 'Random-walk embeddings', 'Skip-gram on graphs', 'Shallow graph embedding'],
  category: 'deep-learning',
  group: 'graph',
  kind: 'model',

  paradigms: ['self-supervised'],
  taskTypes: ['dimensionality-reduction', 'ranking', 'clustering', 'anomaly-detection'],
  architecture: 'feedforward',
  paradigmNote:
    'Self-supervised because the labels are manufactured from the graph itself — a node and one of its walk neighbours is a positive pair, a random node is a negative. Architecturally it is a single embedding lookup table trained by logistic regression, which makes "deep" a generous description; it is included here because it is the baseline every graph neural network is measured against and frequently fails to beat.',

  intuition:
    'Word2vec learned that a word is defined by the words it appears near. A graph has no sentences, so make some: start at a node and take a random walk, and treat the sequence of nodes you visit as a sentence. Then run skip-gram on that corpus unchanged. Nodes that keep showing up in each other’s walks get similar vectors, and because a walk can be biased to either circle a neighbourhood or head away from it, the same machinery produces either community structure or structural role depending on two knobs.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\mathcal{L} = -\\sum_{(u,v) \\in \\mathcal{D}} \\left[ \\log \\sigma\\bigl(\\mathbf{z}_u^\\top \\mathbf{c}_v\\bigr) + \\sum_{j=1}^{m} \\mathbb{E}_{w \\sim P_n} \\log \\sigma\\bigl(-\\mathbf{z}_u^\\top \\mathbf{c}_{w}\\bigr) \\right]',
      symbols: [
        { symbol: '\\mathcal{D}', meaning: 'the sampled corpus: every (centre, context) pair inside a window along every walk' },
        { symbol: '\\mathbf{z}_u', meaning: 'the embedding of node u as a centre — the vector you actually keep' },
        { symbol: '\\mathbf{c}_v', meaning: 'the separate context embedding of v; two tables, and discarding the wrong one is a common error' },
        { symbol: 'm', meaning: 'negative samples per positive pair; the estimator that makes the softmax tractable' },
        { symbol: 'P_n', meaning: 'the noise distribution, degree raised to the 3/4 power — a tuned constant, not a principled one' },
      ],
    },
    reading:
      'Read it as binary logistic regression on pairs: pull a node and its observed walk neighbour together, push it away from m random nodes. The framing as a likelihood is the honest one — this is a tractable surrogate for maximizing the probability of a node’s graph neighbourhood under a softmax over all nodes, which nobody computes because the normalizer is a sum over every node in the graph. Negative sampling replaces that normalizer with a handful of draws, which changes the objective rather than approximating it: the optimum of this loss is not the optimum of the softmax it stands in for, and the three-quarters power on the noise distribution is an empirical correction nobody has derived from first principles.',
  },

  optimization: {
    method: 'Asynchronous SGD over sampled walk pairs, with negative sampling and alias tables for O(1) draws',
    updateRule: {
      formula:
        '\\mathbf{z}_u \\leftarrow \\mathbf{z}_u - \\eta \\bigl(\\sigma(\\mathbf{z}_u^\\top \\mathbf{c}_v) - y\\bigr)\\mathbf{c}_v, \\qquad \\pi_{x \\to y} \\propto \\begin{cases} 1/p & d_{tx}=0 \\\\ 1 & d_{tx}=1 \\\\ 1/q & d_{tx}=2 \\end{cases}',
      symbols: [
        { symbol: 'y', meaning: '1 for an observed pair, 0 for a negative sample — the gradient is a single scalar times a vector' },
        { symbol: 'p', meaning: 'return parameter: large p discourages walking back where you came from' },
        { symbol: 'q', meaning: 'in-out parameter: q below 1 pushes the walk outward (structural roles), above 1 keeps it local (communities)' },
        { symbol: 'd_{tx}', meaning: 'shortest-path distance from the previous node t to the candidate x — 0, 1 or 2, which is why the bias is second-order' },
        { symbol: '\\eta', meaning: 'learning rate, linearly decayed; there is no convergence criterion beyond exhausting the corpus' },
      ],
    },
    rationale:
      'Three independent tricks stacked, and each is worth separating. The walk bias is second-order: the transition probability depends on where the walk came from, not just where it is, which is what lets two scalars interpolate between breadth-first and depth-first exploration. Negative sampling removes a softmax over every node, turning each update into a rank-one operation on a handful of rows. Alias tables make both the negative draw and the biased transition O(1) after an O(n) build, which matters because sampling dominates the runtime — this is a sampling problem wearing a learning problem’s clothes. Updates are applied asynchronously without locks: the races corrupt individual updates and are ignored, because the embedding table is enormous relative to the number of threads and the collision rate is negligible.',
    hyperparameters: [
      { name: 'p (return)', role: 'Discourages immediate backtracking; interacts with q and is rarely worth tuning alone', typicalRange: '0.25 to 4' },
      { name: 'q (in-out)', role: 'The one knob that changes what the embedding means — below 1 for structural roles, above 1 for communities', typicalRange: '0.25 to 4' },
      { name: 'walk length', role: 'How far a single sentence reaches; long walks blur community boundaries', typicalRange: '40 to 100' },
      { name: 'walks per node', role: 'Corpus size, and therefore how well low-degree nodes are represented', typicalRange: '10 to 20' },
      { name: 'window size', role: 'Context width within a walk; the effective neighbourhood the embedding encodes', typicalRange: '5 to 10' },
      { name: 'dimensions', role: 'Embedding width. Gains flatten hard past 128 on most graphs', typicalRange: '64 to 256' },
      { name: 'negative samples', role: 'Negatives per positive; more sharpens the embedding and costs linearly', typicalRange: '5 to 20' },
    ],
    convergence:
      'No convergence criterion at all — training stops when the sampled corpus is exhausted, and "more epochs" means "sample more walks". The loss is not comparable across runs because the corpus differs, so it is useless as a stopping signal and the only honest check is downstream task performance. Two characteristic failures. Low-degree nodes are under-sampled and end up with vectors that barely moved from their random initialization, which is invisible in an aggregate metric and obvious if you plot embedding norm against degree. And the whole method is transductive: there is no function from a node to its embedding, only a lookup table, so a node added after training has no vector and cannot be given one without retraining. That second property is the reason graph neural networks exist.',
    complexity:
      'O(r · n · l) sampling for r walks of length l from each of n nodes, then O(|D| · m · d) for training. Sampling frequently dominates. Memory is O(n · d) for two embedding tables, which is the binding constraint on a large graph — a hundred million nodes at 128 dimensions is over a hundred gigabytes in two tables.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'It embeds a static graph with no notion of time; nodes have positions, not trajectories, and there is no mechanism to produce a value at a future instant. Where a graph and a series genuinely coexist the right entry is a spatio-temporal graph network, which keeps the graph and adds the time axis.',
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Embed the graph, then run an ordinary detector in the embedding space — distance to the k nearest neighbours, or density relative to the local community. A node whose connectivity pattern is unlike anything else in the graph lands in a sparse region of the embedding, which is exactly the signal for a fraud ring member or a bot account whose individual features look entirely normal.',
        where: [
          'Fraud and money-laundering detection on transaction graphs, where the anomaly is the connectivity pattern rather than any single transaction',
          'Bot and sockpuppet detection in social graphs, where accounts coordinate and therefore embed unusually close together',
          'Insider-threat detection on access graphs, where the signal is an access pattern inconsistent with a role',
          'Supply-chain and ownership-graph screening for shell-company structures that are structurally distinctive',
        ],
        why: 'It works because the embedding turns a structural question into a geometric one, and every off-the-shelf outlier detector then applies. That is a genuine and widely deployed pattern, and on a fraud graph it catches rings that per-account features cannot. But it is adapted rather than native, and the caveats are serious: the embedding is unsupervised and optimizes nothing about anomalies, so it can compress away exactly the structure you needed; adversaries in fraud settings actively shape their connectivity, and a transductive embedding cannot score a newly created account at all. On tabular data with no graph, an isolation forest is both better and a thousand times cheaper.',
        featurization: [
          'Normalize embeddings before any distance-based scoring, or the score is dominated by degree through the embedding norm',
          'Set q above 1 so walks stay local — community structure is what a fraud ring violates, and outward walks blur it',
          'Compare a node against its own community rather than against the global distribution, since normal varies enormously by region of the graph',
          'Keep node attributes alongside the embedding rather than relying on structure alone; the combination substantially outperforms either',
        ],
        evaluation:
          'Precision at k on confirmed cases, since labels are scarce and recall is unmeasurable. Always compare against a degree-and-triangle-count baseline: simple structural statistics beat embeddings on a surprising fraction of fraud graphs, and skipping that comparison is how embedding pipelines get deployed without justification.',
        pitfalls: [
          'The embedding norm tracking degree, so the outlier score ranks by popularity rather than by strangeness',
          'A transductive model unable to score new accounts, which in fraud is precisely the population of interest',
          'Retraining shifting the whole embedding space, so thresholds calibrated on the old space are meaningless on the new one',
          'Coordinated fraud embedding tightly together and therefore reading as a dense, normal community rather than as an anomaly',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'The interesting content is almost entirely sampling. The walk is a Markov chain deliberately designed so that two scalars interpolate its stationary exploration between breadth-first and depth-first, which is a search-strategy design problem rather than a learning one. The alias method turns sampling from an arbitrary discrete distribution into two array lookups after an O(n) build, which is the trick that makes biased walks affordable at all. Negative sampling replaces an intractable normalizer with a Monte Carlo draw, changing the objective in exchange for tractability.',
        where: [
          'The alias method as the canonical O(1) discrete sampler, worth knowing well beyond this application',
          'Second-order random walks as tunable graph search, with p and q interpolating between BFS and DFS exploration',
          'Negative sampling as a deliberate objective substitution rather than an approximation, with the noise distribution as a free parameter',
          'Lock-free asynchronous SGD, where the race conditions are known, accepted and quantitatively negligible',
        ],
        why: 'Worth studying as the clearest example in this reference of a method whose cost is sampling rather than arithmetic — profile it and the gradient updates are not the bottleneck, the draws are. The alias method generalizes everywhere discrete sampling appears, and the lock-free SGD is an honest case of a correctness compromise made deliberately with an argument, rather than by accident. What it is not is an optimizer: there is no objective being solved to optimality, no convergence criterion, and the loss value is not even comparable between runs.',
        featurization: [
          'Build alias tables per edge for the second-order walk, and accept the O(|E| · average degree) memory that costs — it is the dominant footprint on a dense graph',
          'Precompute the noise distribution once with degree raised to the 3/4 power; recomputing per draw destroys the whole advantage',
          'Generate walks in parallel and shuffle before training, or the SGD sees the graph in a strongly correlated order',
          'Sub-sample very high-degree nodes as word2vec sub-samples frequent words, or hubs dominate every window',
        ],
        evaluation:
          'Profile sampling against gradient time before optimizing anything — the intuition that the arithmetic dominates is wrong here and sends people to optimize the wrong loop. Verify the alias table against a rejection sampler on a small graph; a wrong alias table produces a valid-looking but differently distributed walk, which is undetectable downstream.',
        pitfalls: [
          'Second-order alias tables exhausting memory on a dense graph, where storing per-edge distributions is quadratic in degree',
          'Optimizing the gradient loop while sampling is the actual bottleneck',
          'Treating the loss as a convergence signal when it is not comparable across runs because the corpus is resampled',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Build a graph whose edges are interactions — users to items, or items co-occurring in a session — and embed the nodes. Similarity in the embedding space is then a candidate generator: nearest neighbours of an item are related items, and nearest neighbours of a user’s recent items are recommendations. This is how large-scale item-to-item recommendation was actually built before two-tower models, and the graph formulation handles the long tail better than matrix factorization does.',
        where: [
          'Item-to-item related-item recommendation on session co-occurrence graphs, deployed at scale in e-commerce',
          'Candidate generation feeding a heavier ranking model, where recall at a few hundred is the only thing that matters',
          'Cold-ish item handling, where an item with few interactions still borrows structure from the graph region it sits in',
          'Social and content graphs where the edge is a follow or a share rather than a purchase',
        ],
        why: 'The graph formulation captures transitive structure that matrix factorization misses: two items never co-purchased but both co-purchased with the same third item end up close, which is exactly the long-tail case where factorization has no signal. It is also cheap, shallow and trains on commodity hardware, which is why it remains a strong baseline. Against it: it is transductive, so a genuinely new item has no embedding and needs a separate cold-start path; it uses no node features at all, so a rich item catalogue is thrown away; and it optimizes graph proximity rather than any business objective, which means a heavier ranker downstream is doing the actual relevance work.',
        featurization: [
          'Weight edges by interaction strength and use weighted walks, or a single accidental co-occurrence counts as much as a thousand',
          'Sub-sample hub items aggressively — a bestseller appears in every window and dominates the corpus otherwise',
          'Set q above 1 to keep walks within a product category, unless cross-category discovery is an explicit goal',
          'Build the graph from sessions rather than from lifetime co-purchase, so the embedding reflects intent rather than catalogue structure',
        ],
        evaluation:
          'Recall at k of the held-out next interaction, split strictly by time, with a popularity-only baseline reported alongside — popularity is startlingly hard to beat on recall and an embedding that fails to is not worth deploying. Then measure the downstream ranker with and without these candidates, since candidate generation is only ever an input.',
        pitfalls: [
          'Popularity bias, where high-degree items dominate every neighbourhood and the recommendations collapse to bestsellers',
          'Random train/test splits leaking future interactions and producing an unreproducible offline win',
          'No path for genuinely new items, which is a permanent structural gap rather than a tuning problem',
          'Re-embedding shifting the whole space, so any cached neighbour list must be rebuilt wholesale',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Embed the entity graph — accounts, devices, payment instruments, addresses — and feed the embeddings as features into a supervised risk model alongside the usual tabular signals. The embedding contributes what tabular features cannot express: that this account sits in a region of the graph densely connected to previously confirmed fraud.',
        where: [
          'Payment and account-takeover risk scoring, with graph embeddings as features in a gradient-boosted model',
          'Collusion and ring detection in marketplaces and insurance claims',
          'Identity resolution, where embedding proximity suggests two accounts are the same actor',
        ],
        why: 'The gain is real and specific: connectivity to known-bad is a strong signal that no per-account feature carries, and adding embeddings to an existing boosted model is usually a straightforward improvement. The honest framing is that it is a feature source rather than a model — the supervised model does the deciding. The transductive limitation bites hardest here, because a new account is exactly what needs scoring, so most production systems maintain a separate feature path for unseen nodes and accept that the graph signal is unavailable for the first hours of an account’s life.',
        featurization: [
          'Pair the embedding with explicit distance-to-known-fraud features, which are more interpretable and often stronger',
          'Rebuild the graph on a rolling window so stale relationships expire rather than accumulating forever',
          'Keep the embedding version pinned to the risk-model version; a re-embedded space silently invalidates every learned split',
          'Handle new nodes explicitly with an attribute-only fallback rather than a zero vector, which reads as a real location in the space',
        ],
        evaluation:
          'Precision and recall against confirmed fraud at a fixed review budget, measured as a lift over the model without embedding features. Backtest strictly by time — a graph built with hindsight knows which accounts turned out to be connected and produces an offline win that does not survive deployment.',
        pitfalls: [
          'Leakage from building the graph over the full period including the label window, which is the single most common error here',
          'Adversarial adaptation, since fraudsters can restructure connectivity far faster than the embedding is retrained',
          'A zero vector for unseen nodes being interpreted by the downstream model as a specific and meaningful position',
        ],
      },
      'natural-language': {
        fit: 'adapted',
        how: 'The relationship runs backwards: this method is word2vec, applied to a corpus manufactured from a graph. Used in language work on knowledge graphs and entity graphs — embedding entities by their relational structure rather than by their textual context.',
        where: [
          'Knowledge-graph entity embeddings for linking and disambiguation',
          'Taxonomy and ontology embedding, where the hierarchy is the only available signal',
          'Document graphs built from citation or hyperlink structure rather than from text',
        ],
        why: 'Worth knowing chiefly for the lineage: understanding that DeepWalk is skip-gram with a sampled corpus explains every design choice in it, including the ones that look arbitrary. As a practical choice for language work it has been superseded almost everywhere by contextual encoders, which use the text rather than only the structure, and the sensible modern use is combining a structural embedding with a text one rather than choosing between them.',
        featurization: [
          'Treat relation types as distinct edge types or use a relation-aware method; a plain walk discards which relation it traversed',
          'Combine with a text embedding rather than substituting for one — the two carry genuinely different information',
          'Handle the extreme degree skew of a knowledge graph by sub-sampling hubs, or a handful of entities dominate every walk',
        ],
        evaluation:
          'Link prediction and entity classification on held-out edges, with a text-embedding baseline reported alongside. The comparison is the point: if structure alone does not add to text, the pipeline is not worth maintaining.',
        pitfalls: [
          'Discarding relation types, which collapses semantically distinct edges into one undifferentiated adjacency',
          'Extreme degree skew leaving most entities barely trained while hubs are over-represented',
          'Comparing against no text baseline and therefore never establishing that structure contributed anything',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to hours on CPU for graphs up to tens of millions of nodes — genuinely cheap, and one of the strongest arguments for it. Sampling dominates rather than arithmetic, so it scales with cores rather than with an accelerator, and a GPU buys almost nothing.',
    inferenceProfile:
      'There is no inference. The output is a lookup table, so serving is a key-value read, and downstream use is an approximate nearest-neighbour query over the vectors — which is where the real serving cost lives, not in this model.',
    retrainingCadence:
      'Weekly to monthly, driven entirely by how fast new nodes appear. A graph gaining nodes continuously needs retraining continuously, which is the practical expression of the transductive limitation.',
    driftAndMonitoring: [
      'Track the fraction of queried nodes with no embedding; it measures exactly how badly the transductive assumption is being violated in production',
      'Plot embedding norm against node degree — a strong relationship means the space is encoding popularity rather than structure',
      'Monitor neighbour-list churn between retrains; a wholesale reshuffle means downstream thresholds are stale',
      'Watch the low-degree tail separately, since those embeddings barely move from initialization and the aggregate metric hides it',
    ],
    productionGotchas: [
      'Embedding spaces are not comparable between runs — the model is rotation-invariant and a retrain produces an entirely different basis, so every cached neighbour list and every calibrated threshold must be rebuilt together',
      'There are two embedding tables and the centre table is the one to keep; exporting the context table produces vectors that work just well enough to hide the mistake',
      'A new node has no vector. Serving a zero vector is worse than serving nothing, because downstream models read it as a specific position rather than as missing',
      'Alias tables for second-order walks are memory-quadratic in degree and are the usual cause of an out-of-memory failure on a dense graph',
      'Walk generation must be seeded and the seed recorded, or a retrain is not reproducible even with identical data',
    ],
  },

  assumptions: [
    'Graph proximity implies similarity in whatever downstream sense matters — the load-bearing assumption, and false wherever an edge means opposition rather than affinity',
    'The node set is fixed at training time; the model is transductive and has no function from node to embedding',
    'The graph is connected enough that walks mix, since a disconnected component is embedded in its own arbitrary and incomparable region',
    'Node attributes are either absent or irrelevant, because the method cannot use them at all',
    'A single vector per node suffices, so a node with several distinct roles is averaged into one compromise position',
  ],

  pros: [
    {
      point: 'Trivially cheap for what it delivers',
      context:
        'CPU-only, minutes on a large graph, no accelerator required. The reason it is still the first thing to try and still the baseline every graph neural network is measured against — and frequently the reason the fancier model is not worth its operational cost.',
    },
    {
      point: 'Needs nothing but the edge list',
      context:
        'No labels, no node features, no schema. Decisive when all you have is connectivity, which is common in fraud and interaction graphs; wasteful when you have a rich attribute table the method cannot touch.',
    },
    {
      point: 'Two knobs switch what the embedding means',
      context:
        'q below one gives structural roles, above one gives communities, from identical code. Genuinely useful and unusually interpretable as hyperparameters go — most graph models offer no comparable control.',
    },
    {
      point: 'Captures transitive structure that factorization misses',
      context:
        'Two items never co-observed but both linked to a common third end up close. Exactly the long-tail case where matrix factorization has no signal at all, and where most of the practical recommendation gain comes from.',
    },
  ],

  cons: [
    {
      point: 'Transductive — no embedding for an unseen node',
      context:
        'The decisive limitation and the direct reason graph neural networks exist. Fatal in fraud and cold-start recommendation where new nodes are the population of interest; irrelevant on a fixed graph.',
    },
    {
      point: 'Ignores node features entirely',
      context:
        'A rich item catalogue or account profile contributes nothing. Where attributes carry real signal, a graph neural network that consumes both wins clearly and this method cannot be patched to close the gap.',
    },
    {
      point: 'Embedding spaces are incomparable between runs',
      context:
        'Rotation invariance means a retrain produces a different basis, so every cached neighbour list and calibrated threshold must be rebuilt in lockstep. A genuine and frequently underestimated operational burden.',
    },
    {
      point: 'Popularity leaks into the geometry',
      context:
        'High-degree nodes get larger norms and dominate neighbourhoods, so similarity search returns bestsellers. Fixable by normalizing and sub-sampling, but it is the default behaviour and it has to be noticed first.',
    },
    {
      point: 'No convergence criterion and no comparable loss',
      context:
        'Training ends when the corpus is exhausted, and the loss cannot be compared across runs because the corpus is resampled. Every decision has to be made on a downstream metric, which makes tuning slow and expensive.',
    },
  ],

  relatedSlugs: ['graph-neural-network', 'matrix-factorization', 'two-tower-retrieval', 'pca', 'ann-index'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""DeepWalk / node2vec, transcribed the way the papers read.

Three stages, and keeping them separate is the whole point:

  1. bias the transition probabilities with p and q  (second order: the
     probability depends on where the walk CAME FROM, not just where it is)
  2. sample walks, which are the "sentences"
  3. run skip-gram with negative sampling on those sentences, unchanged

Linear-scan sampling and per-pair Python updates. Both are replaced later -
and note now that this profiles as a SAMPLING problem, not an arithmetic one.
"""

import math
import random

SEED = 1234


def biased_transition(graph, previous, current, return_p, inout_q):
    """Unnormalized node2vec weights over the neighbours of \`current\`.

    d(previous, candidate) is 0, 1 or 2 and nothing else, because a candidate
    is a neighbour of current and current is a neighbour of previous:

      d = 0  the candidate IS previous    -> weight 1/p  (backtracking)
      d = 1  the candidate neighbours it  -> weight 1     (staying local)
      d = 2  neither                      -> weight 1/q  (heading outward)
    """
    previous_neighbours = set(graph[previous]) if previous is not None else set()
    weights = []
    for candidate in graph[current]:
        if previous is None:
            weights.append(1.0)
        elif candidate == previous:
            weights.append(1.0 / return_p)
        elif candidate in previous_neighbours:
            weights.append(1.0)
        else:
            weights.append(1.0 / inout_q)
    return weights


def sample_index(weights, rng):
    """Draw from an unnormalized discrete distribution by linear scan.

    O(degree) per step. On a graph with a few hub nodes this single function
    is most of the runtime, which is the observation the fast stage acts on.
    """
    total = sum(weights)
    if total <= 0.0:
        return None
    threshold = rng.random() * total
    cumulative = 0.0
    for index, weight in enumerate(weights):
        cumulative += weight
        if cumulative >= threshold:
            return index
    return len(weights) - 1


def generate_walk(graph, start, length, return_p, inout_q, rng):
    """One second-order random walk. The sentence the skip-gram will read."""
    walk = [start]
    while len(walk) < length:
        current = walk[-1]
        if not graph[current]:
            break
        previous = walk[-2] if len(walk) >= 2 else None
        weights = biased_transition(graph, previous, current, return_p, inout_q)
        choice = sample_index(weights, rng)
        if choice is None:
            break
        walk.append(graph[current][choice])
    return walk


def build_noise_distribution(graph):
    """Degree to the 3/4 power. An empirical constant from word2vec, not a
    derived one - it damps hub nodes without removing them."""
    return [len(neighbours) ** 0.75 for neighbours in graph]


def sigmoid(value):
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def train(graph, dimensions, walk_length, walks_per_node, window, negatives,
          return_p, inout_q, learning_rate, epochs):
    """Skip-gram with negative sampling over sampled walks."""
    rng = random.Random(SEED)
    num_nodes = len(graph)

    # TWO tables. \`centre\` is the one you keep; exporting \`context\` instead
    # produces vectors that work just well enough to hide the mistake.
    centre = [
        [(rng.random() - 0.5) / dimensions for _ in range(dimensions)]
        for _ in range(num_nodes)
    ]
    context = [[0.0] * dimensions for _ in range(num_nodes)]

    noise = build_noise_distribution(graph)

    for epoch in range(epochs):
        # The learning rate decays linearly and there is no other stopping
        # rule: training ends when the corpus is exhausted.
        rate = learning_rate * (1.0 - epoch / epochs)

        order = list(range(num_nodes))
        rng.shuffle(order)

        for _ in range(walks_per_node):
            for start in order:
                walk = generate_walk(graph, start, walk_length, return_p, inout_q, rng)

                for position, target in enumerate(walk):
                    low = max(0, position - window)
                    high = min(len(walk), position + window + 1)
                    for neighbour_position in range(low, high):
                        if neighbour_position == position:
                            continue
                        observed = walk[neighbour_position]

                        # One positive pair plus m negatives. Every update is
                        # a rank-one operation on two rows.
                        samples = [(observed, 1.0)]
                        for _ in range(negatives):
                            drawn = sample_index(noise, rng)
                            samples.append((drawn, 0.0))

                        gradient = [0.0] * dimensions
                        for node, label in samples:
                            score = sum(
                                centre[target][d] * context[node][d]
                                for d in range(dimensions)
                            )
                            error = (sigmoid(score) - label) * rate
                            for d in range(dimensions):
                                gradient[d] += error * context[node][d]
                                context[node][d] -= error * centre[target][d]
                        for d in range(dimensions):
                            centre[target][d] -= gradient[d]

    return centre


def cosine_neighbours(embeddings, query, top_k):
    """What the embedding is actually for: nearest neighbours in the space."""
    def norm(vector):
        return math.sqrt(sum(value * value for value in vector)) or 1.0

    query_vector = embeddings[query]
    query_norm = norm(query_vector)
    scored = []
    for node, vector in enumerate(embeddings):
        if node == query:
            continue
        dot = sum(a * b for a, b in zip(query_vector, vector))
        scored.append((dot / (query_norm * norm(vector)), node))
    scored.sort(reverse=True)
    return [node for _, node in scored[:top_k]]
`,
        profile:
          'O(r * n * l * degree) for sampling and O(|D| * m * d) for training, where the first term usually wins. Illustrative, not a measured benchmark: the linear-scan draw makes every walk step cost the degree of the current node, so a graph with a few million-degree hubs spends nearly all its time in sample_index.',
      },

      'make-it-right': {
        code: `"""The same method, with alias tables, typed boundaries, and one table kept.

What changes: sampling becomes O(1) via the alias method, the walk bias is
precomputed per (previous, current) edge rather than rebuilt on every step,
and the two embedding tables are returned in a structure that names which one
is which - because exporting the context table is a real and silent mistake.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import NamedTuple, Sequence

Graph = Sequence[Sequence[int]]


class DisconnectedGraph(ValueError):
    """Raised when the graph cannot support walks at all."""


class InvalidWalkParameters(ValueError):
    """Raised on p or q outside the positive reals, which is meaningless."""


class AliasTable:
    """O(1) draws from a fixed discrete distribution after an O(n) build.

    The construction pairs each over-full bucket with an under-full one until
    every bucket holds exactly 1/n of the mass, split between one or two
    outcomes. A draw is then: pick a bucket, flip a biased coin. Two array
    lookups, no scan, no matter how skewed the distribution.
    """

    __slots__ = ('_probability', '_alias')

    def __init__(self, weights: Sequence[float]) -> None:
        if not weights:
            raise InvalidWalkParameters('an alias table needs at least one outcome')
        total = math.fsum(weights)
        if total <= 0.0:
            raise InvalidWalkParameters('alias weights must sum to something positive')

        size = len(weights)
        scaled = [weight * size / total for weight in weights]
        self._probability = [0.0] * size
        self._alias = [0] * size

        small = [i for i, value in enumerate(scaled) if value < 1.0]
        large = [i for i, value in enumerate(scaled) if value >= 1.0]

        while small and large:
            lesser = small.pop()
            greater = large.pop()
            self._probability[lesser] = scaled[lesser]
            self._alias[lesser] = greater
            scaled[greater] -= 1.0 - scaled[lesser]
            if scaled[greater] < 1.0:
                small.append(greater)
            else:
                large.append(greater)

        # Whatever is left is exactly 1.0 up to floating-point drift.
        for remaining in small + large:
            self._probability[remaining] = 1.0

    def draw(self, rng: random.Random) -> int:
        bucket = rng.randrange(len(self._probability))
        if rng.random() < self._probability[bucket]:
            return bucket
        return self._alias[bucket]


@dataclass(frozen=True)
class WalkConfig:
    """Frozen so a sampler's behaviour cannot change after construction."""

    walk_length: int
    walks_per_node: int
    return_p: float
    inout_q: float

    def __post_init__(self) -> None:
        # Guard clauses in the config, so every downstream method can assume
        # the parameters are sane rather than re-checking them.
        if self.return_p <= 0.0 or self.inout_q <= 0.0:
            raise InvalidWalkParameters('p and q must be strictly positive')
        if self.walk_length < 2:
            raise InvalidWalkParameters('a walk shorter than two nodes has no pairs')
        if self.walks_per_node < 1:
            raise InvalidWalkParameters('at least one walk per node is required')


class Embeddings(NamedTuple):
    """Both tables, named. \`centre\` is the one to export."""

    centre: list[list[float]]
    context: list[list[float]]


class Node2VecSampler:
    """Precomputes every alias table the walk will need.

    Memory is the cost: a second-order walk needs one table per DIRECTED
    EDGE, so the footprint is the sum of neighbour degrees over edges - which
    is quadratic in degree and the usual cause of an out-of-memory failure on
    a dense graph. That trade is the reason first-order DeepWalk still exists.
    """

    def __init__(self, graph: Graph, config: WalkConfig) -> None:
        if not graph:
            raise DisconnectedGraph('an empty graph admits no walks')
        if all(not neighbours for neighbours in graph):
            raise DisconnectedGraph('every node is isolated; no walk can move')

        self._graph = graph
        self._config = config
        self._first_order = [
            AliasTable([1.0] * len(neighbours)) if neighbours else None
            for neighbours in graph
        ]
        self._second_order: dict[tuple[int, int], AliasTable] = {}
        self._build_second_order()

    def _build_second_order(self) -> None:
        for previous, neighbours in enumerate(self._graph):
            previous_set = frozenset(neighbours)
            for current in neighbours:
                candidates = self._graph[current]
                if not candidates:
                    continue
                self._second_order[(previous, current)] = AliasTable(
                    [self._weight(previous, previous_set, candidate) for candidate in candidates]
                )

    def _weight(self, previous: int, previous_set: frozenset[int], candidate: int) -> float:
        """d(previous, candidate) is 0, 1 or 2 and nothing else."""
        if candidate == previous:
            return 1.0 / self._config.return_p
        if candidate in previous_set:
            return 1.0
        return 1.0 / self._config.inout_q

    def walk(self, start: int, rng: random.Random) -> list[int]:
        """One second-order walk, every step an O(1) alias draw."""
        first = self._first_order[start]
        if first is None:
            return [start]

        walk = [start, self._graph[start][first.draw(rng)]]
        while len(walk) < self._config.walk_length:
            previous, current = walk[-2], walk[-1]
            table = self._second_order.get((previous, current))
            if table is None:
                break
            walk.append(self._graph[current][table.draw(rng)])
        return walk


def sigmoid(value: float) -> float:
    """Branch on sign so exp never overflows on a large negative score."""
    if value >= 0.0:
        return 1.0 / (1.0 + math.exp(-value))
    positive = math.exp(value)
    return positive / (1.0 + positive)


def train(
    graph: Graph,
    sampler: Node2VecSampler,
    config: WalkConfig,
    dimensions: int = 128,
    window: int = 5,
    negatives: int = 5,
    learning_rate: float = 0.025,
    epochs: int = 5,
    seed: int = 1234,
) -> Embeddings:
    """Skip-gram with negative sampling. Seeded, because a walk-based method
    is otherwise not reproducible even on identical data."""
    if dimensions < 1:
        raise InvalidWalkParameters('dimensions must be positive')

    rng = random.Random(seed)
    num_nodes = len(graph)

    centre = [
        [(rng.random() - 0.5) / dimensions for _ in range(dimensions)]
        for _ in range(num_nodes)
    ]
    context = [[0.0] * dimensions for _ in range(num_nodes)]

    # Degree to the 3/4 power, built once. Recomputing it per draw would
    # discard the entire benefit of the alias table.
    noise = AliasTable([max(len(neighbours), 1) ** 0.75 for neighbours in graph])

    for epoch in range(epochs):
        rate = learning_rate * max(1.0 - epoch / epochs, 1e-4)
        order = list(range(num_nodes))
        rng.shuffle(order)

        for _ in range(config.walks_per_node):
            for start in order:
                walk = sampler.walk(start, rng)
                _train_on_walk(walk, centre, context, noise, rng,
                               window, negatives, dimensions, rate)

    return Embeddings(centre=centre, context=context)


def _train_on_walk(
    walk: Sequence[int],
    centre: list[list[float]],
    context: list[list[float]],
    noise: AliasTable,
    rng: random.Random,
    window: int,
    negatives: int,
    dimensions: int,
    rate: float,
) -> None:
    """One walk's worth of updates. Extracted so the epoch loop stays flat."""
    for position, target in enumerate(walk):
        low = max(0, position - window)
        high = min(len(walk), position + window + 1)
        target_vector = centre[target]

        for neighbour_position in range(low, high):
            if neighbour_position == position:
                continue

            gradient = [0.0] * dimensions
            samples = [(walk[neighbour_position], 1.0)]
            samples.extend((noise.draw(rng), 0.0) for _ in range(negatives))

            for node, label in samples:
                context_vector = context[node]
                score = sum(a * b for a, b in zip(target_vector, context_vector))
                error = (sigmoid(score) - label) * rate
                for d in range(dimensions):
                    gradient[d] += error * context_vector[d]
                    context_vector[d] -= error * target_vector[d]

            for d in range(dimensions):
                target_vector[d] -= gradient[d]
`,
        rationale:
          'Sampling was the bottleneck, so sampling is what changes: the alias method replaces an O(degree) linear scan with two array lookups after an O(degree) build, and the second-order bias is precomputed once per directed edge instead of being rebuilt on every walk step. That trade is stated explicitly in the sampler docstring rather than hidden, because the memory cost is quadratic in degree and is the usual reason a node2vec job dies on a dense graph — a reader needs to know that before choosing it over first-order DeepWalk. The two embedding tables come back in a NamedTuple that names which is which, since exporting the context table produces vectors that work just well enough to conceal the error. Parameter validation moves into a frozen config so every method downstream can assume p, q and the walk length are sane, the seed becomes an explicit argument because a walk-based method is otherwise irreproducible on identical data, and the sigmoid branches on sign so a large negative score cannot overflow.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
          'No mutable default arguments',
        ],
        profile:
          'Sampling drops from O(degree) to O(1) per step, at a one-time O(sum of neighbour degrees) build and the matching memory. Illustrative, not a measured benchmark: on a hub-heavy graph this is the difference between sampling dominating the runtime and the gradient updates dominating it.',
      },

      'make-it-fast': {
        code: `"""Walks and updates in bulk. The alias draw vectorizes; the SGD batches.

Three changes:

  1. Alias sampling becomes array arithmetic. A draw is a uniform bucket
     index and a uniform coin, so N draws are two random arrays and one
     np.where - the whole walk frontier advances in a single step.
  2. Walks advance a FRONTIER rather than one node at a time: all N walks
     take their step t together, so the Python loop is over walk length
     (tens) rather than over walks (millions).
  3. Skip-gram updates batch. A block of pairs becomes two gathers, one
     row-wise dot, and a scatter-add - and the scatter must accumulate,
     because a hub node appears many times in one batch.
"""

from __future__ import annotations

import numpy as np
from numpy.typing import NDArray

FLOAT = np.float32
INDEX = np.int32


class VectorizedAlias:
    """Alias tables for every row of a ragged distribution, in flat arrays.

    Ragged rows are stored contiguously with an offset array - the same CSR
    idea as a sparse matrix - so a draw for any row is pure index arithmetic
    and no Python-level dispatch is needed to find the right table.
    """

    def __init__(self, offsets: NDArray[np.int32], weights: NDArray[np.float32]) -> None:
        self._offsets = offsets
        self._probability = np.empty_like(weights)
        self._alias = np.zeros(weights.shape, dtype=INDEX)

        for row in range(len(offsets) - 1):
            begin, end = int(offsets[row]), int(offsets[row + 1])
            if end <= begin:
                continue
            self._build_row(weights[begin:end], begin, end)

    def _build_row(self, weights: NDArray[np.float32], begin: int, end: int) -> None:
        size = end - begin
        scaled = weights * (size / weights.sum())
        probability = self._probability[begin:end]
        alias = self._alias[begin:end]

        small = [i for i in range(size) if scaled[i] < 1.0]
        large = [i for i in range(size) if scaled[i] >= 1.0]
        while small and large:
            lesser, greater = small.pop(), large.pop()
            probability[lesser] = scaled[lesser]
            alias[lesser] = greater
            scaled[greater] -= 1.0 - scaled[lesser]
            (small if scaled[greater] < 1.0 else large).append(greater)
        for remaining in small + large:
            probability[remaining] = 1.0

    def draw(self, rows: NDArray[np.int32], rng: np.random.Generator) -> NDArray[np.int32]:
        """One draw per entry of \`rows\`, all at once.

        A draw is: uniform bucket, uniform coin, take the bucket or its alias.
        Both are array operations, so there is no per-draw Python work.
        """
        begin = self._offsets[rows]
        sizes = self._offsets[rows + 1] - begin
        bucket = (rng.random(len(rows)) * sizes).astype(INDEX)
        flat = begin + bucket
        coin = rng.random(len(rows), dtype=FLOAT)
        # np.where, not a branch: taking the alias is a select over the whole
        # batch rather than a decision made one draw at a time.
        return np.where(coin < self._probability[flat], bucket, self._alias[flat]).astype(INDEX)


def generate_walks(
    indptr: NDArray[np.int32],
    indices: NDArray[np.int32],
    alias: VectorizedAlias,
    starts: NDArray[np.int32],
    length: int,
    rng: np.random.Generator,
) -> NDArray[np.int32]:
    """Advance every walk's frontier together. Returns (num_walks, length).

    The Python loop is over \`length\` - tens of iterations - rather than over
    the millions of walks, which is the whole structural change.
    """
    num_walks = len(starts)
    walks = np.empty((num_walks, length), dtype=INDEX)
    walks[:, 0] = starts
    frontier = starts

    for step in range(1, length):
        # One batched alias draw for every walk, then one gather to turn the
        # local neighbour offset into a global node id.
        local = alias.draw(frontier, rng)
        frontier = indices[indptr[frontier] + local]
        walks[:, step] = frontier

    return walks


def build_pairs(walks: NDArray[np.int32], window: int) -> tuple[NDArray[np.int32], NDArray[np.int32]]:
    """Every (centre, context) pair inside the window, as two flat arrays.

    Built by shifting the walk matrix rather than by iterating positions: an
    offset of k pairs column j with column j + k for every walk at once.
    """
    centres: list[NDArray[np.int32]] = []
    contexts: list[NDArray[np.int32]] = []
    length = walks.shape[1]

    for offset in range(1, window + 1):
        if offset >= length:
            break
        left, right = walks[:, :-offset], walks[:, offset:]
        centres.append(left.ravel())
        contexts.append(right.ravel())
        centres.append(right.ravel())
        contexts.append(left.ravel())

    return np.concatenate(centres), np.concatenate(contexts)


def train_batch(
    centre: NDArray[np.float32],
    context: NDArray[np.float32],
    centre_ids: NDArray[np.int32],
    context_ids: NDArray[np.int32],
    noise_table: NDArray[np.int32],
    negatives: int,
    rate: float,
    rng: np.random.Generator,
) -> None:
    """One batched SGNS step, updating both tables in place.

    Positives and negatives are concatenated into one block so the whole step
    is a single gather, a single row-wise dot, and a single scatter-add.
    """
    batch = len(centre_ids)
    drawn = noise_table[rng.integers(0, len(noise_table), size=batch * negatives)]

    rows = np.repeat(centre_ids, negatives + 1)
    columns = np.empty(batch * (negatives + 1), dtype=INDEX)
    columns[0::negatives + 1] = context_ids
    mask = np.ones(len(columns), dtype=bool)
    mask[0::negatives + 1] = False
    columns[mask] = drawn

    labels = np.zeros(len(columns), dtype=FLOAT)
    labels[0::negatives + 1] = 1.0

    # Two gathers, then one row-wise dot: einsum over matching rows avoids
    # materializing the full outer product a plain matmul would build.
    target = centre[rows]
    paired = context[columns]
    scores = np.einsum('ij,ij->i', target, paired)

    # Stable logistic in place; the gradient is (sigmoid(score) - label).
    np.negative(scores, out=scores)
    np.exp(scores, out=scores)
    scores += 1.0
    np.reciprocal(scores, out=scores)
    scores -= labels
    scores *= rate

    # Scatter-add, never a plain assignment: a hub node appears many times in
    # one batch and its updates must accumulate rather than overwrite.
    np.add.at(centre, rows, -scores[:, None] * paired)
    np.add.at(context, columns, -scores[:, None] * target)


def build_noise_table(degrees: NDArray[np.int32], resolution: int = 10_000_000) -> NDArray[np.int32]:
    """Degree^0.75 flattened into a uniform lookup table.

    Pre-expanding the distribution into a table makes a negative draw one
    uniform integer and one gather, with no per-draw search at all.
    """
    weights = np.maximum(degrees, 1).astype(np.float64) ** 0.75
    cumulative = np.cumsum(weights / weights.sum())
    positions = np.linspace(0.0, 1.0, resolution, endpoint=False)
    return np.searchsorted(cumulative, positions).astype(INDEX)
`,
        rationale:
          'The change follows the profile rather than the intuition: sampling dominates, so sampling is what gets vectorized. An alias draw decomposes into a uniform bucket index and a uniform coin, both of which are array operations, so N draws become two random arrays and one select — and the ragged per-node tables are stored CSR-style in flat arrays so finding the right table is index arithmetic rather than a Python dispatch. Walks then advance as a frontier: every walk takes step t together, which turns the outer Python loop from millions of walks into tens of steps. Pair construction shifts the walk matrix instead of iterating positions, since an offset of k pairs column j with column j plus k for every walk simultaneously. The SGD batches: positives and negatives are concatenated into one block, the scoring is an einsum over matching rows rather than a matmul that would materialize the full outer product, and the writes are scatter-adds because a hub node appears many times in a single batch and its updates must accumulate. The noise distribution is pre-expanded into a uniform lookup table, so a negative draw is one integer and one gather.',
        optimizations: [
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'The walk frontier, the pair construction and the SGNS step all become whole-array operations, leaving Python loops only over walk length and epochs.',
            tradeoff: 'All walks must be held simultaneously to advance them together, so peak memory is the number of walks times the walk length in int32 — on a large graph that is the largest allocation in the pipeline and forces chunking.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One batched step covers thousands of pairs and their negatives, so the per-pair interpreter cost that dominated the scalar version disappears entirely.',
            tradeoff: 'Batching changes the algorithm: the scalar version sees each update applied before the next is computed, while a batch computes every gradient against the same stale weights — larger batches degrade convergence per pair and need a compensating learning-rate change.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The walk matrix, the column array and the logistic transform are all written into pre-sized buffers, so the inner sequence of exp, add, reciprocal allocates nothing.',
            tradeoff: 'The score buffer is destroyed by the in-place logistic, so nothing downstream can inspect the raw scores — which is exactly what you want when diagnosing a collapsed embedding.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'int32 ids and float32 embeddings halve the bandwidth of the gathers, which are the memory-bound part of the step, and the CSR-style flat alias arrays keep the draws contiguous.',
            tradeoff: 'int32 caps the graph at roughly two billion nodes, and float32 accumulation across many small updates to the same hub row drifts measurably — visible as hub embeddings that are noisier than their sample count suggests.',
          },
        ],
        libraryName: 'NumPy',
        profile:
          'Walk generation becomes O(length) array steps instead of O(walks * length) interpreter steps; the SGD becomes one gather-dot-scatter per batch. Illustrative, not a measured benchmark: the remaining hot spot is np.add.at, which is unbuffered and slower than the arithmetic it follows — the reason production implementations use a lock-free compiled inner loop rather than array code.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// DeepWalk / node2vec, transcribed from the papers.
//
// Three stages, kept deliberately separate:
//   1. bias the transitions with p and q (second order: the probability
//      depends on where the walk CAME FROM, not just where it is)
//   2. sample walks - these are the "sentences"
//   3. run skip-gram with negative sampling on them, unchanged
//
// Linear-scan sampling and one update per pair. Both are replaced later, and
// note now that this profiles as a SAMPLING problem, not an arithmetic one.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

using Graph = std::vector<std::vector<int>>;

// Unnormalized node2vec weights over the neighbours of \`current\`.
// d(previous, candidate) is 0, 1 or 2 and nothing else, because a candidate
// neighbours current and current neighbours previous:
//   d = 0  candidate IS previous       -> 1/p  (backtracking)
//   d = 1  candidate neighbours it     -> 1     (staying local)
//   d = 2  neither                     -> 1/q  (heading outward)
std::vector<double> BiasedTransition(const Graph& graph, int previous, int current,
                                     double return_p, double inout_q) {
  std::vector<double> weights;
  weights.reserve(graph[current].size());

  for (std::size_t i = 0; i < graph[current].size(); ++i) {
    const int candidate = graph[current][i];
    if (previous < 0) {
      weights.push_back(1.0);
      continue;
    }
    if (candidate == previous) {
      weights.push_back(1.0 / return_p);
      continue;
    }
    // Linear search for adjacency. O(degree) inside an O(degree) loop, which
    // is quadratic per step and the first thing the next stage removes.
    bool adjacent = false;
    for (std::size_t j = 0; j < graph[previous].size(); ++j) {
      if (graph[previous][j] == candidate) {
        adjacent = true;
        break;
      }
    }
    weights.push_back(adjacent ? 1.0 : 1.0 / inout_q);
  }
  return weights;
}

// Draw from an unnormalized discrete distribution by linear scan. O(n) per
// draw; on a graph with hub nodes this single function is most of the runtime.
int SampleIndex(const std::vector<double>& weights, std::mt19937& rng) {
  double total = 0.0;
  for (std::size_t i = 0; i < weights.size(); ++i) {
    total += weights[i];
  }
  if (total <= 0.0) {
    return -1;
  }
  std::uniform_real_distribution<double> uniform(0.0, total);
  const double threshold = uniform(rng);
  double cumulative = 0.0;
  for (std::size_t i = 0; i < weights.size(); ++i) {
    cumulative += weights[i];
    if (cumulative >= threshold) {
      return static_cast<int>(i);
    }
  }
  return static_cast<int>(weights.size()) - 1;
}

std::vector<int> GenerateWalk(const Graph& graph, int start, std::size_t length,
                              double return_p, double inout_q, std::mt19937& rng) {
  std::vector<int> walk;
  walk.push_back(start);
  while (walk.size() < length) {
    const int current = walk.back();
    if (graph[current].empty()) {
      break;
    }
    const int previous = walk.size() >= 2 ? walk[walk.size() - 2] : -1;
    const std::vector<double> weights =
        BiasedTransition(graph, previous, current, return_p, inout_q);
    const int choice = SampleIndex(weights, rng);
    if (choice < 0) {
      break;
    }
    walk.push_back(graph[current][static_cast<std::size_t>(choice)]);
  }
  return walk;
}

inline double Sigmoid(double value) {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

struct Embeddings {
  std::vector<std::vector<double>> centre;   // the table you keep
  std::vector<std::vector<double>> context;  // the one people export by mistake
};

Embeddings Train(const Graph& graph, std::size_t dimensions, std::size_t walk_length,
                 std::size_t walks_per_node, std::size_t window, std::size_t negatives,
                 double return_p, double inout_q, double learning_rate,
                 std::size_t epochs, unsigned seed) {
  std::mt19937 rng(seed);
  const std::size_t nodes = graph.size();

  Embeddings tables;
  std::uniform_real_distribution<double> init(-0.5, 0.5);
  tables.centre.assign(nodes, std::vector<double>(dimensions, 0.0));
  tables.context.assign(nodes, std::vector<double>(dimensions, 0.0));
  for (std::size_t n = 0; n < nodes; ++n) {
    for (std::size_t d = 0; d < dimensions; ++d) {
      tables.centre[n][d] = init(rng) / static_cast<double>(dimensions);
    }
  }

  // Degree to the 3/4 power. An empirical constant from word2vec, not a
  // derived one: it damps hub nodes without removing them.
  std::vector<double> noise(nodes, 0.0);
  for (std::size_t n = 0; n < nodes; ++n) {
    noise[n] = std::pow(std::max<std::size_t>(graph[n].size(), 1), 0.75);
  }

  std::vector<int> order(nodes);
  for (std::size_t n = 0; n < nodes; ++n) {
    order[n] = static_cast<int>(n);
  }

  for (std::size_t epoch = 0; epoch < epochs; ++epoch) {
    // Linear decay, and no other stopping rule: training ends when the
    // sampled corpus is exhausted.
    const double rate = learning_rate *
                        (1.0 - static_cast<double>(epoch) / static_cast<double>(epochs));
    std::shuffle(order.begin(), order.end(), rng);

    for (std::size_t repeat = 0; repeat < walks_per_node; ++repeat) {
      for (std::size_t o = 0; o < nodes; ++o) {
        const std::vector<int> walk =
            GenerateWalk(graph, order[o], walk_length, return_p, inout_q, rng);

        for (std::size_t position = 0; position < walk.size(); ++position) {
          const std::size_t low = position > window ? position - window : 0;
          const std::size_t high = std::min(walk.size(), position + window + 1);

          for (std::size_t other = low; other < high; ++other) {
            if (other == position) {
              continue;
            }
            std::vector<double> gradient(dimensions, 0.0);

            // One positive plus m negatives. Every update is a rank-one
            // operation on exactly two rows.
            for (std::size_t sample = 0; sample <= negatives; ++sample) {
              int node = 0;
              double label = 0.0;
              if (sample == 0) {
                node = walk[other];
                label = 1.0;
              } else {
                node = SampleIndex(noise, rng);
              }

              double score = 0.0;
              for (std::size_t d = 0; d < dimensions; ++d) {
                score += tables.centre[walk[position]][d] * tables.context[node][d];
              }
              const double error = (Sigmoid(score) - label) * rate;
              for (std::size_t d = 0; d < dimensions; ++d) {
                gradient[d] += error * tables.context[node][d];
                tables.context[node][d] -= error * tables.centre[walk[position]][d];
              }
            }

            for (std::size_t d = 0; d < dimensions; ++d) {
              tables.centre[walk[position]][d] -= gradient[d];
            }
          }
        }
      }
    }
  }

  return tables;
}
`,
        profile:
          'O(r * n * l * degree^2) for sampling, because the adjacency test is itself a linear search, plus O(|D| * m * d) for training. Illustrative, not a measured benchmark: the quadratic-in-degree walk step means a single million-degree hub can dominate an entire epoch.',
      },

      'make-it-right': {
        code: `// The same method with alias tables, CSR storage and validated parameters.
//
// The changes are all about the sampler. Alias tables make a draw two array
// lookups instead of a scan; the adjacency test becomes a sorted binary
// search instead of a linear one; and the graph becomes CSR so neighbour
// lists are contiguous rather than a vector of vectors.

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace node2vec {

class InvalidParameters : public std::invalid_argument {
 public:
  explicit InvalidParameters(const std::string& what)
      : std::invalid_argument(what) {}
};

// O(1) draws from a fixed discrete distribution after an O(n) build.
//
// Construction pairs each over-full bucket with an under-full one until every
// bucket holds exactly 1/n of the mass, split between at most two outcomes.
// A draw is then a uniform bucket and a biased coin: two lookups, no scan,
// however skewed the distribution.
class AliasTable {
 public:
  explicit AliasTable(std::span<const double> weights) {
    if (weights.empty()) {
      throw InvalidParameters("an alias table needs at least one outcome");
    }
    double total = 0.0;
    for (const double weight : weights) {
      if (weight < 0.0) {
        throw InvalidParameters("alias weights cannot be negative");
      }
      total += weight;
    }
    if (total <= 0.0) {
      throw InvalidParameters("alias weights must sum to something positive");
    }

    const std::size_t size = weights.size();
    probability_.resize(size);
    alias_.assign(size, 0);

    std::vector<double> scaled(size);
    std::vector<std::size_t> small;
    std::vector<std::size_t> large;
    small.reserve(size);
    large.reserve(size);

    for (std::size_t i = 0; i < size; ++i) {
      scaled[i] = weights[i] * static_cast<double>(size) / total;
      (scaled[i] < 1.0 ? small : large).push_back(i);
    }

    while (!small.empty() && !large.empty()) {
      const std::size_t lesser = small.back();
      small.pop_back();
      const std::size_t greater = large.back();
      large.pop_back();

      probability_[lesser] = scaled[lesser];
      alias_[lesser] = static_cast<int>(greater);
      scaled[greater] -= 1.0 - scaled[lesser];
      (scaled[greater] < 1.0 ? small : large).push_back(greater);
    }
    // Whatever remains is exactly one, up to floating-point drift.
    for (const std::size_t remaining : small) probability_[remaining] = 1.0;
    for (const std::size_t remaining : large) probability_[remaining] = 1.0;
  }

  [[nodiscard]] int Draw(std::mt19937& rng) const {
    std::uniform_int_distribution<std::size_t> bucket_of(0, probability_.size() - 1);
    std::uniform_real_distribution<double> coin(0.0, 1.0);
    const std::size_t bucket = bucket_of(rng);
    return coin(rng) < probability_[bucket] ? static_cast<int>(bucket) : alias_[bucket];
  }

  [[nodiscard]] std::size_t size() const noexcept { return probability_.size(); }

 private:
  std::vector<double> probability_;
  std::vector<int> alias_;
};

// Compressed sparse row graph with sorted neighbour lists, so the adjacency
// test the walk bias needs is a binary search rather than a linear scan.
class CsrGraph {
 public:
  CsrGraph(std::span<const int> sources, std::span<const int> targets,
           std::size_t num_nodes)
      : num_nodes_(num_nodes) {
    if (num_nodes == 0) {
      throw InvalidParameters("a graph needs at least one node");
    }
    if (sources.size() != targets.size()) {
      throw InvalidParameters("edge arrays have mismatched lengths");
    }

    std::vector<std::vector<int>> by_row(num_nodes);
    for (std::size_t e = 0; e < sources.size(); ++e) {
      if (sources[e] < 0 || static_cast<std::size_t>(sources[e]) >= num_nodes ||
          targets[e] < 0 || static_cast<std::size_t>(targets[e]) >= num_nodes) {
        throw InvalidParameters("an edge endpoint is outside the node range");
      }
      by_row[static_cast<std::size_t>(sources[e])].push_back(targets[e]);
    }

    indptr_.reserve(num_nodes + 1);
    indptr_.push_back(0);
    for (auto& row : by_row) {
      std::sort(row.begin(), row.end());
      row.erase(std::unique(row.begin(), row.end()), row.end());
      indices_.insert(indices_.end(), row.begin(), row.end());
      indptr_.push_back(indices_.size());
    }
  }

  [[nodiscard]] std::span<const int> Neighbours(int node) const {
    const std::size_t begin = indptr_[static_cast<std::size_t>(node)];
    const std::size_t end = indptr_[static_cast<std::size_t>(node) + 1];
    return std::span<const int>(indices_.data() + begin, end - begin);
  }

  // Sorted, so O(log degree) instead of O(degree).
  [[nodiscard]] bool Adjacent(int node, int candidate) const {
    const std::span<const int> row = Neighbours(node);
    return std::binary_search(row.begin(), row.end(), candidate);
  }

  [[nodiscard]] std::size_t num_nodes() const noexcept { return num_nodes_; }

 private:
  std::size_t num_nodes_;
  std::vector<std::size_t> indptr_;
  std::vector<int> indices_;
};

// Walk parameters, validated once so no method downstream re-checks them.
struct WalkConfig {
  std::size_t walk_length{80};
  std::size_t walks_per_node{10};
  double return_p{1.0};
  double inout_q{1.0};

  void Validate() const {
    if (return_p <= 0.0 || inout_q <= 0.0) {
      throw InvalidParameters("p and q must be strictly positive");
    }
    if (walk_length < 2) {
      throw InvalidParameters("a walk shorter than two nodes has no pairs");
    }
  }
};

// Precomputes one alias table per DIRECTED EDGE.
//
// The memory cost is the honest trade and belongs in the open: a second-order
// walk needs a distribution per (previous, current) pair, so the footprint is
// the sum of neighbour degrees over edges - quadratic in degree, and the
// usual reason a node2vec job dies on a dense graph. First-order DeepWalk
// exists precisely to avoid this.
class Sampler {
 public:
  Sampler(CsrGraph graph, WalkConfig config)
      : graph_(std::move(graph)), config_(config) {
    config_.Validate();

    for (std::size_t previous = 0; previous < graph_.num_nodes(); ++previous) {
      for (const int current : graph_.Neighbours(static_cast<int>(previous))) {
        const std::span<const int> candidates = graph_.Neighbours(current);
        if (candidates.empty()) {
          continue;
        }
        std::vector<double> weights;
        weights.reserve(candidates.size());
        for (const int candidate : candidates) {
          weights.push_back(Weight(static_cast<int>(previous), candidate));
        }
        keys_.emplace_back(static_cast<int>(previous), current);
        tables_.emplace_back(std::span<const double>(weights));
      }
    }
  }

  [[nodiscard]] std::vector<int> Walk(int start, std::mt19937& rng) const {
    std::vector<int> walk;
    walk.reserve(config_.walk_length);
    walk.push_back(start);

    const std::span<const int> first = graph_.Neighbours(start);
    if (first.empty()) {
      return walk;
    }
    std::uniform_int_distribution<std::size_t> uniform(0, first.size() - 1);
    walk.push_back(first[uniform(rng)]);

    while (walk.size() < config_.walk_length) {
      const auto found = Find(walk[walk.size() - 2], walk.back());
      if (found == tables_.size()) {
        break;
      }
      const std::span<const int> candidates = graph_.Neighbours(walk.back());
      walk.push_back(candidates[static_cast<std::size_t>(tables_[found].Draw(rng))]);
    }
    return walk;
  }

 private:
  [[nodiscard]] double Weight(int previous, int candidate) const {
    // d(previous, candidate) is 0, 1 or 2 and nothing else.
    if (candidate == previous) {
      return 1.0 / config_.return_p;
    }
    if (graph_.Adjacent(previous, candidate)) {
      return 1.0;
    }
    return 1.0 / config_.inout_q;
  }

  [[nodiscard]] std::size_t Find(int previous, int current) const {
    const auto position = std::lower_bound(
        keys_.begin(), keys_.end(), std::pair<int, int>(previous, current));
    if (position == keys_.end() || *position != std::pair<int, int>(previous, current)) {
      return tables_.size();
    }
    return static_cast<std::size_t>(position - keys_.begin());
  }

  CsrGraph graph_;
  WalkConfig config_;
  std::vector<std::pair<int, int>> keys_;
  std::vector<AliasTable> tables_;
};

// Both tables, named. \`centre\` is the one to export; shipping \`context\`
// produces vectors that work just well enough to hide the mistake.
struct Embeddings {
  std::vector<double> centre;   // nodes * dimensions, row-major
  std::vector<double> context;
  std::size_t dimensions{};

  [[nodiscard]] std::span<double> CentreRow(int node) {
    return std::span<double>(centre.data() + static_cast<std::size_t>(node) * dimensions,
                             dimensions);
  }
};

// Branch on sign so exp cannot overflow on a large negative score.
[[nodiscard]] inline double Sigmoid(double value) noexcept {
  if (value >= 0.0) {
    return 1.0 / (1.0 + std::exp(-value));
  }
  const double positive = std::exp(value);
  return positive / (1.0 + positive);
}

// One pair's update: a rank-one operation on two rows, and the only place the
// embeddings are written.
inline void UpdatePair(std::span<double> centre_row, std::span<double> context_row,
                       std::span<double> gradient, double label, double rate) {
  double score = 0.0;
  for (std::size_t d = 0; d < centre_row.size(); ++d) {
    score += centre_row[d] * context_row[d];
  }
  const double error = (Sigmoid(score) - label) * rate;
  for (std::size_t d = 0; d < centre_row.size(); ++d) {
    gradient[d] += error * context_row[d];
    context_row[d] -= error * centre_row[d];
  }
}

}  // namespace node2vec
`,
        rationale:
          'Every change targets the sampler, because that is where the time went. Alias tables replace an O(degree) linear scan with a uniform bucket and a biased coin — two lookups regardless of how skewed the distribution is — and the adjacency test the walk bias depends on becomes a binary search over sorted CSR neighbour lists rather than the linear scan that made the literal version quadratic in degree per step. The graph itself becomes compressed sparse row, so a neighbour list is a contiguous span handed out without copying. The memory cost of second-order tables is stated in the open on the sampler, because it is quadratic in degree and is the usual reason such a job dies on a dense graph — that is information a reader needs before choosing this over first-order DeepWalk, not a footnote. Parameters validate once in the config so nothing downstream re-checks them, the two embedding tables are named rather than positional since exporting the wrong one is silent, and the sigmoid branches on sign so a large negative score cannot overflow.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'The walk step drops from O(degree^2) to O(log degree) plus O(1), at a one-time build cost and its matching memory. Illustrative, not a measured benchmark: this is the difference between sampling dominating the runtime and the gradient updates dominating it.',
      },

      'make-it-fast': {
        code: `// Parallel walks and lock-free SGD.
//
// Two observations drive this. First, walks are entirely independent, so walk
// generation is embarrassingly parallel with a per-thread generator. Second,
// the embedding update is a rank-one write to two rows out of millions, so
// the probability that two threads touch the same row simultaneously is
// negligible - which means the updates can race and nobody locks. That is a
// deliberate correctness compromise with a quantitative argument behind it,
// and it is what makes word2vec-family training scale at all.
//
// Build: g++ -O3 -march=native -fopenmp -Wall -Wextra -Wpedantic

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <random>
#include <span>
#include <vector>

#include <omp.h>

namespace node2vec {

// Flat CSR with 32-bit indices: the index arrays are streamed on every walk
// step, so halving their width measurably cuts the bandwidth they consume.
struct GraphView {
  const int32_t* __restrict indptr;
  const int32_t* __restrict indices;
  int32_t num_nodes;
};

// Alias tables for every node, stored contiguously with a CSR-style offset
// array so locating a node's table is index arithmetic, not a pointer chase.
struct AliasView {
  const int32_t* __restrict offsets;
  const float* __restrict probability;
  const int32_t* __restrict alias;
};

// xoshiro-style generator: a handful of bit operations per draw against
// mt19937's large state and much heavier step. At one generator per thread
// the state stays resident in L1 and never shares a cache line.
class FastRng {
 public:
  explicit FastRng(uint64_t seed) noexcept : state_(seed | 1ULL) {}

  [[gnu::always_inline]] uint64_t Next() noexcept {
    state_ ^= state_ << 13;
    state_ ^= state_ >> 7;
    state_ ^= state_ << 17;
    return state_;
  }

  [[gnu::always_inline]] float Uniform() noexcept {
    return static_cast<float>(Next() >> 40) * (1.0F / 16777216.0F);
  }

  // Multiply-shift instead of a modulo: the division is the expensive part
  // of a bounded draw and this removes it at the cost of a tiny bias.
  [[gnu::always_inline]] uint32_t Bounded(uint32_t bound) noexcept {
    return static_cast<uint32_t>((Next() >> 32) * bound >> 32);
  }

 private:
  uint64_t state_;
};

// Walks for a whole block of starts, one thread per chunk. Writes into a
// pre-allocated (num_starts * length) buffer so nothing allocates per walk.
inline void GenerateWalks(const GraphView& graph, const AliasView& alias,
                          std::span<const int32_t> starts, int length,
                          uint64_t seed, std::span<int32_t> out) {
#pragma omp parallel
  {
    // One generator per thread, seeded from the thread id: no sharing, no
    // synchronization, and reproducible for a fixed thread count.
    FastRng rng(seed + static_cast<uint64_t>(omp_get_thread_num()) * 0x9E3779B97F4A7C15ULL);

#pragma omp for schedule(static)
    for (std::size_t w = 0; w < starts.size(); ++w) {
      int32_t* walk = out.data() + static_cast<std::size_t>(w) * length;
      int32_t current = starts[w];
      walk[0] = current;

      for (int step = 1; step < length; ++step) {
        const int32_t begin = graph.indptr[current];
        const int32_t degree = graph.indptr[current + 1] - begin;
        if (degree == 0) {
          // Pad with the last node rather than branching downstream: the
          // pair builder skips self-pairs anyway.
          walk[step] = current;
          continue;
        }
        const int32_t table = alias.offsets[current];
        const uint32_t bucket = rng.Bounded(static_cast<uint32_t>(degree));
        const int32_t local = rng.Uniform() < alias.probability[table + bucket]
                                  ? static_cast<int32_t>(bucket)
                                  : alias.alias[table + bucket];
        current = graph.indices[begin + local];
        walk[step] = current;
      }
    }
  }
}

// Lock-free SGNS. Threads share both embedding tables and write without
// synchronization: the tables are millions of rows, a thread touches two per
// update, so collisions are rare and their effect is one lost update out of
// billions. Measured against the cost of locking, this is the right trade -
// but it is a trade, and it means training is not bit-reproducible.
class LockFreeTrainer {
 public:
  LockFreeTrainer(std::size_t nodes, std::size_t dimensions,
                  std::span<const int32_t> noise_table)
      : dimensions_(dimensions),
        noise_(noise_table),
        // Row-major and contiguous: a row is one cache-line-aligned run, so
        // the rank-one update is a single sequential read-modify-write.
        centre_(nodes * dimensions, 0.0F),
        context_(nodes * dimensions, 0.0F) {}

  void TrainWalks(std::span<const int32_t> walks, int length, int window,
                  int negatives, float rate, uint64_t seed) {
    const std::size_t num_walks = walks.size() / static_cast<std::size_t>(length);

#pragma omp parallel
    {
      FastRng rng(seed + static_cast<uint64_t>(omp_get_thread_num()) * 0x2545F4914F6CDD1DULL);
      // Per-thread gradient scratch: the one buffer that must NOT be shared,
      // because it accumulates across a pair's negatives.
      std::vector<float> gradient(dimensions_, 0.0F);

#pragma omp for schedule(dynamic, 64)
      for (std::size_t w = 0; w < num_walks; ++w) {
        const int32_t* walk = walks.data() + w * static_cast<std::size_t>(length);
        for (int position = 0; position < length; ++position) {
          const int low = std::max(0, position - window);
          const int high = std::min(length, position + window + 1);
          for (int other = low; other < high; ++other) {
            if (other == position || walk[other] == walk[position]) {
              continue;
            }
            UpdatePair(walk[position], walk[other], negatives, rate, rng, gradient);
          }
        }
      }
    }
  }

  [[nodiscard]] std::span<const float> centre() const noexcept { return centre_; }

 private:
  void UpdatePair(int32_t target, int32_t observed, int negatives, float rate,
                  FastRng& rng, std::vector<float>& gradient) {
    std::fill(gradient.begin(), gradient.end(), 0.0F);
    float* __restrict centre_row = centre_.data() + static_cast<std::size_t>(target) * dimensions_;

    for (int sample = 0; sample <= negatives; ++sample) {
      const int32_t node =
          sample == 0 ? observed : noise_[rng.Bounded(static_cast<uint32_t>(noise_.size()))];
      const float label = sample == 0 ? 1.0F : 0.0F;
      float* __restrict context_row =
          context_.data() + static_cast<std::size_t>(node) * dimensions_;

      // Both loops are contiguous, restrict-qualified and of known trip
      // count, which is everything the autovectorizer needs.
      float score = 0.0F;
      for (std::size_t d = 0; d < dimensions_; ++d) {
        score += centre_row[d] * context_row[d];
      }
      const float error = (1.0F / (1.0F + std::exp(-score)) - label) * rate;
      for (std::size_t d = 0; d < dimensions_; ++d) {
        gradient[d] += error * context_row[d];
        context_row[d] -= error * centre_row[d];
      }
    }

    for (std::size_t d = 0; d < dimensions_; ++d) {
      centre_row[d] -= gradient[d];
    }
  }

  std::size_t dimensions_;
  std::span<const int32_t> noise_;
  std::vector<float> centre_;
  std::vector<float> context_;
};

// Degree^0.75 pre-expanded into a uniform lookup table, so a negative draw is
// one bounded integer and one load with no search at all.
inline std::vector<int32_t> BuildNoiseTable(std::span<const int32_t> degrees,
                                            std::size_t resolution = 10'000'000) {
  std::vector<double> cumulative(degrees.size());
  double total = 0.0;
  for (std::size_t n = 0; n < degrees.size(); ++n) {
    total += std::pow(static_cast<double>(std::max(degrees[n], 1)), 0.75);
    cumulative[n] = total;
  }

  std::vector<int32_t> table(resolution);
  std::size_t node = 0;
  for (std::size_t i = 0; i < resolution; ++i) {
    const double position = static_cast<double>(i) / static_cast<double>(resolution) * total;
    while (node + 1 < degrees.size() && cumulative[node] < position) {
      ++node;
    }
    table[i] = static_cast<int32_t>(node);
  }
  return table;
}

}  // namespace node2vec
`,
        rationale:
          'Two structural changes, both following from the profile. Walk generation parallelizes cleanly with one generator per thread, and the generator itself is replaced: mt19937 has a large state and an expensive step, while a three-shift xorshift is a handful of bit operations whose state stays in L1 and never shares a cache line. Bounded draws use a multiply-shift rather than a modulo, since the division dominates a bounded draw. The training loop then does something genuinely unusual: threads share both embedding tables and write without any synchronization. That is sound because a table has millions of rows and a thread touches two per update, so collisions cost one lost update out of billions — but it is a deliberate correctness compromise, it means training is not bit-reproducible, and the per-pair gradient scratch is the one buffer that must stay thread-private because it accumulates across a pair’s negatives. Both embedding tables become flat float32 row-major arrays so a row is one sequential run and the rank-one update is a contiguous read-modify-write the compiler vectorizes on its own.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Walks are fully independent, and the SGD is parallelized by accepting benign races on the shared tables rather than by partitioning them, so neither loop needs a reduction or a critical section.',
            tradeoff: 'The lock-free updates mean results are not bit-reproducible and depend on thread count and scheduling, so a regression in embedding quality cannot be bisected against a known-good run.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Flat float32 tables make each embedding row a single sequential run, so the dot product and the two rank-one updates each touch one contiguous line sequence.',
            tradeoff: 'Rows of adjacent nodes share cache lines when dimensions are small, so two threads updating neighbouring node ids cause false sharing — invisible at 128 dimensions and measurable at 16.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The dot product and both update loops are contiguous, restrict-qualified and of known trip count, which is all the vectorizer needs — hand-written intrinsics here would add nothing but a portability problem.',
            tradeoff: 'It depends on the trip count being visible, so a runtime-variable dimension defeats it silently and the loop drops to scalar with no diagnostic anywhere.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the centre and context rows may overlap and reloads both on every iteration of the update.',
            tradeoff: 'Restrict is an unchecked promise, and here it is genuinely violated when a self-pair slips through — target equal to observed makes the two rows the same buffer, which is why that case is filtered before the update rather than handled inside it.',
          },
        ],
        libraryName: 'OpenMP',
        profile:
          'Walk generation scales nearly linearly in cores; the SGD scales until false sharing or memory bandwidth binds. Illustrative, not a measured benchmark: with sampling reduced to a few bit operations the profile finally shifts to the gradient updates, which is where the arithmetic was assumed to be all along.',
      },
    },

    rust: {
      'make-it-work': {
        code: `// DeepWalk / node2vec, transcribed from the papers.
//
// Three stages, kept deliberately separate:
//   1. bias the transitions with p and q (second order: the probability
//      depends on where the walk CAME FROM, not just where it is)
//   2. sample walks - these are the "sentences"
//   3. run skip-gram with negative sampling on them, unchanged
//
// Linear-scan sampling, index loops, and a linear adjacency test. All three
// are replaced later. Note now that this profiles as a SAMPLING problem.

/// A deliberately tiny linear congruential generator, so the sampling story
/// stays visible instead of hiding behind a crate.
struct Lcg {
    state: u64,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }

    fn next_f64(&mut self) -> f64 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 11) as f64) / ((1u64 << 53) as f64)
    }
}

/// Unnormalized node2vec weights over the neighbours of \`current\`.
///
/// d(previous, candidate) is 0, 1 or 2 and nothing else, because a candidate
/// neighbours current and current neighbours previous:
///   d = 0  candidate IS previous    -> 1/p  (backtracking)
///   d = 1  candidate neighbours it  -> 1     (staying local)
///   d = 2  neither                  -> 1/q  (heading outward)
fn biased_transition(
    graph: &[Vec<usize>],
    previous: Option<usize>,
    current: usize,
    return_p: f64,
    inout_q: f64,
) -> Vec<f64> {
    let mut weights = Vec::new();
    for &candidate in &graph[current] {
        match previous {
            None => weights.push(1.0),
            Some(prev) if candidate == prev => weights.push(1.0 / return_p),
            Some(prev) => {
                // Linear search for adjacency, inside a loop over neighbours:
                // quadratic in degree per walk step, and the first thing the
                // next stage removes.
                let mut adjacent = false;
                for &other in &graph[prev] {
                    if other == candidate {
                        adjacent = true;
                        break;
                    }
                }
                weights.push(if adjacent { 1.0 } else { 1.0 / inout_q });
            }
        }
    }
    weights
}

/// Draw from an unnormalized discrete distribution by linear scan. O(n) per
/// draw; with hub nodes present this single function is most of the runtime.
fn sample_index(weights: &[f64], rng: &mut Lcg) -> Option<usize> {
    let total: f64 = weights.iter().sum();
    if total <= 0.0 {
        return None;
    }
    let threshold = rng.next_f64() * total;
    let mut cumulative = 0.0;
    for (index, &weight) in weights.iter().enumerate() {
        cumulative += weight;
        if cumulative >= threshold {
            return Some(index);
        }
    }
    Some(weights.len() - 1)
}

fn generate_walk(
    graph: &[Vec<usize>],
    start: usize,
    length: usize,
    return_p: f64,
    inout_q: f64,
    rng: &mut Lcg,
) -> Vec<usize> {
    let mut walk = vec![start];
    while walk.len() < length {
        let current = walk[walk.len() - 1];
        if graph[current].is_empty() {
            break;
        }
        let previous = if walk.len() >= 2 {
            Some(walk[walk.len() - 2])
        } else {
            None
        };
        let weights = biased_transition(graph, previous, current, return_p, inout_q);
        match sample_index(&weights, rng) {
            Some(choice) => walk.push(graph[current][choice]),
            None => break,
        }
    }
    walk
}

fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// Both tables. \`centre\` is the one to keep; exporting \`context\` instead
/// produces vectors that work just well enough to hide the mistake.
struct Embeddings {
    centre: Vec<Vec<f64>>,
    context: Vec<Vec<f64>>,
}

fn train(
    graph: &[Vec<usize>],
    dimensions: usize,
    walk_length: usize,
    walks_per_node: usize,
    window: usize,
    negatives: usize,
    return_p: f64,
    inout_q: f64,
    learning_rate: f64,
    epochs: usize,
    seed: u64,
) -> Embeddings {
    let mut rng = Lcg::new(seed);
    let nodes = graph.len();

    let mut centre = vec![vec![0.0_f64; dimensions]; nodes];
    for row in centre.iter_mut() {
        for value in row.iter_mut() {
            *value = (rng.next_f64() - 0.5) / dimensions as f64;
        }
    }
    let mut context = vec![vec![0.0_f64; dimensions]; nodes];

    // Degree to the 3/4 power: an empirical constant from word2vec, not a
    // derived one. It damps hub nodes without removing them.
    let noise: Vec<f64> = graph
        .iter()
        .map(|neighbours| (neighbours.len().max(1) as f64).powf(0.75))
        .collect();

    for epoch in 0..epochs {
        // Linear decay, and no other stopping rule: training ends when the
        // sampled corpus is exhausted.
        let rate = learning_rate * (1.0 - epoch as f64 / epochs as f64);

        for _ in 0..walks_per_node {
            for start in 0..nodes {
                let walk = generate_walk(graph, start, walk_length, return_p, inout_q, &mut rng);

                for position in 0..walk.len() {
                    let low = position.saturating_sub(window);
                    let high = (position + window + 1).min(walk.len());

                    for other in low..high {
                        if other == position {
                            continue;
                        }
                        let target = walk[position];
                        let mut gradient = vec![0.0_f64; dimensions];

                        // One positive plus m negatives. Every update is a
                        // rank-one operation on exactly two rows.
                        for sample in 0..=negatives {
                            let (node, label) = if sample == 0 {
                                (walk[other], 1.0)
                            } else {
                                (sample_index(&noise, &mut rng).unwrap_or(0), 0.0)
                            };

                            let mut score = 0.0;
                            for d in 0..dimensions {
                                score += centre[target][d] * context[node][d];
                            }
                            let error = (sigmoid(score) - label) * rate;
                            for d in 0..dimensions {
                                gradient[d] += error * context[node][d];
                                context[node][d] -= error * centre[target][d];
                            }
                        }

                        for d in 0..dimensions {
                            centre[target][d] -= gradient[d];
                        }
                    }
                }
            }
        }
    }

    Embeddings { centre, context }
}
`,
        profile:
          'O(r * n * l * degree^2) for sampling, since the adjacency test is itself a linear scan, plus O(|D| * m * d) for training. Illustrative, not a measured benchmark: the quadratic-in-degree walk step means one million-degree hub can dominate an entire epoch.',
      },

      'make-it-right': {
        code: `//! The same method with alias tables, CSR storage and typed errors.
//!
//! Every change targets the sampler, because that is where the time went.
//! Alias tables make a draw two lookups rather than a scan, the adjacency
//! test becomes a binary search over sorted CSR rows, and every way the
//! configuration can be wrong becomes a variant a caller can match on.

use std::fmt;

/// Embedding width. Distinct from NodeCount so the two cannot swap.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Dimensions(pub usize);

/// Number of nodes in the graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct NodeCount(pub usize);

/// Length of a single walk, in nodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct WalkLength(pub usize);

#[derive(Debug, PartialEq)]
pub enum SamplerError {
    /// p or q outside the positive reals, which makes the bias meaningless.
    NonPositiveBias { return_p: f64, inout_q: f64 },
    /// A walk shorter than two nodes produces no (centre, context) pairs.
    WalkTooShort(usize),
    /// An edge endpoint lies outside the declared node range.
    EdgeOutOfRange { node: usize, nodes: usize },
    /// Every node is isolated, so no walk can move at all.
    DegenerateGraph,
    /// Alias weights that do not sum to anything positive.
    EmptyDistribution,
}

impl fmt::Display for SamplerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NonPositiveBias { return_p, inout_q } => {
                write!(f, "p={return_p} and q={inout_q} must both be positive")
            }
            Self::WalkTooShort(length) => {
                write!(f, "a walk of {length} nodes yields no training pairs")
            }
            Self::EdgeOutOfRange { node, nodes } => {
                write!(f, "edge endpoint {node} outside a {nodes}-node graph")
            }
            Self::DegenerateGraph => write!(f, "every node is isolated"),
            Self::EmptyDistribution => write!(f, "alias weights sum to zero"),
        }
    }
}

impl std::error::Error for SamplerError {}

/// O(1) draws from a fixed discrete distribution after an O(n) build.
///
/// Construction pairs each over-full bucket with an under-full one until
/// every bucket holds exactly 1/n of the mass, split between at most two
/// outcomes. A draw is then a uniform bucket and a biased coin: two lookups,
/// no scan, however skewed the distribution is.
pub struct AliasTable {
    probability: Vec<f64>,
    alias: Vec<u32>,
}

impl AliasTable {
    pub fn new(weights: &[f64]) -> Result<Self, SamplerError> {
        let total: f64 = weights.iter().sum();
        if weights.is_empty() || total <= 0.0 {
            return Err(SamplerError::EmptyDistribution);
        }

        let size = weights.len();
        let mut scaled: Vec<f64> = weights
            .iter()
            .map(|weight| weight * size as f64 / total)
            .collect();
        let mut probability = vec![0.0; size];
        let mut alias = vec![0u32; size];

        let (mut small, mut large): (Vec<usize>, Vec<usize>) =
            (0..size).partition(|&i| scaled[i] < 1.0);

        while let (Some(lesser), Some(greater)) = (small.pop(), large.pop()) {
            probability[lesser] = scaled[lesser];
            alias[lesser] = greater as u32;
            scaled[greater] -= 1.0 - scaled[lesser];
            if scaled[greater] < 1.0 {
                small.push(greater);
            } else {
                large.push(greater);
            }
        }
        // Whatever remains is exactly one, up to floating-point drift.
        for remaining in small.into_iter().chain(large) {
            probability[remaining] = 1.0;
        }

        Ok(Self { probability, alias })
    }

    pub fn draw(&self, bucket_uniform: f64, coin: f64) -> usize {
        let bucket = ((bucket_uniform * self.probability.len() as f64) as usize)
            .min(self.probability.len() - 1);
        if coin < self.probability[bucket] {
            bucket
        } else {
            self.alias[bucket] as usize
        }
    }
}

/// CSR graph with sorted, deduplicated neighbour lists, so the adjacency test
/// the walk bias needs is a binary search rather than a linear scan.
pub struct CsrGraph {
    indptr: Vec<u32>,
    indices: Vec<u32>,
    nodes: NodeCount,
}

impl CsrGraph {
    /// Validation at the boundary: a graph that exists is one whose
    /// invariants hold, so the sampler never re-checks them.
    pub fn from_edges(edges: &[(usize, usize)], nodes: NodeCount) -> Result<Self, SamplerError> {
        let mut by_row: Vec<Vec<u32>> = vec![Vec::new(); nodes.0];
        for &(source, target) in edges {
            if source >= nodes.0 {
                return Err(SamplerError::EdgeOutOfRange { node: source, nodes: nodes.0 });
            }
            if target >= nodes.0 {
                return Err(SamplerError::EdgeOutOfRange { node: target, nodes: nodes.0 });
            }
            by_row[source].push(target as u32);
        }

        if by_row.iter().all(Vec::is_empty) {
            return Err(SamplerError::DegenerateGraph);
        }

        let mut indptr = Vec::with_capacity(nodes.0 + 1);
        let mut indices = Vec::with_capacity(edges.len());
        indptr.push(0);
        for row in by_row.iter_mut() {
            row.sort_unstable();
            row.dedup();
            indices.extend_from_slice(row);
            indptr.push(indices.len() as u32);
        }

        Ok(Self { indptr, indices, nodes })
    }

    pub fn neighbours(&self, node: usize) -> &[u32] {
        let begin = self.indptr[node] as usize;
        let end = self.indptr[node + 1] as usize;
        &self.indices[begin..end]
    }

    /// Sorted rows, so O(log degree) rather than O(degree).
    pub fn adjacent(&self, node: usize, candidate: u32) -> bool {
        self.neighbours(node).binary_search(&candidate).is_ok()
    }

    pub fn nodes(&self) -> NodeCount {
        self.nodes
    }
}

/// Walk parameters, validated once at construction.
#[derive(Debug, Clone, Copy)]
pub struct WalkConfig {
    pub length: WalkLength,
    pub walks_per_node: usize,
    pub return_p: f64,
    pub inout_q: f64,
}

impl WalkConfig {
    pub fn validate(&self) -> Result<(), SamplerError> {
        if self.return_p <= 0.0 || self.inout_q <= 0.0 {
            return Err(SamplerError::NonPositiveBias {
                return_p: self.return_p,
                inout_q: self.inout_q,
            });
        }
        if self.length.0 < 2 {
            return Err(SamplerError::WalkTooShort(self.length.0));
        }
        Ok(())
    }
}

/// Precomputes one alias table per DIRECTED EDGE.
///
/// The memory cost is the honest trade and belongs in the open: a
/// second-order walk needs a distribution per (previous, current) pair, so
/// the footprint is the sum of neighbour degrees over edges - quadratic in
/// degree, and the usual reason such a job dies on a dense graph. First-order
/// DeepWalk exists precisely to avoid this.
pub struct Sampler {
    graph: CsrGraph,
    config: WalkConfig,
    keys: Vec<(u32, u32)>,
    tables: Vec<AliasTable>,
}

impl Sampler {
    pub fn new(graph: CsrGraph, config: WalkConfig) -> Result<Self, SamplerError> {
        config.validate()?;

        let mut keys = Vec::new();
        let mut tables = Vec::new();

        for previous in 0..graph.nodes().0 {
            for &current in graph.neighbours(previous) {
                let candidates = graph.neighbours(current as usize);
                if candidates.is_empty() {
                    continue;
                }
                let weights: Vec<f64> = candidates
                    .iter()
                    .map(|&candidate| {
                        // d(previous, candidate) is 0, 1 or 2, nothing else.
                        if candidate as usize == previous {
                            1.0 / config.return_p
                        } else if graph.adjacent(previous, candidate) {
                            1.0
                        } else {
                            1.0 / config.inout_q
                        }
                    })
                    .collect();
                keys.push((previous as u32, current));
                tables.push(AliasTable::new(&weights)?);
            }
        }

        Ok(Self { graph, config, keys, tables })
    }

    /// One second-order walk, every step an O(1) alias draw.
    pub fn walk(&self, start: usize, draws: &mut impl FnMut() -> f64) -> Vec<u32> {
        let mut walk = Vec::with_capacity(self.config.length.0);
        walk.push(start as u32);

        let first = self.graph.neighbours(start);
        if first.is_empty() {
            return walk;
        }
        let pick = ((draws() * first.len() as f64) as usize).min(first.len() - 1);
        walk.push(first[pick]);

        while walk.len() < self.config.length.0 {
            let previous = walk[walk.len() - 2];
            let current = walk[walk.len() - 1];
            let Ok(slot) = self.keys.binary_search(&(previous, current)) else {
                break;
            };
            let candidates = self.graph.neighbours(current as usize);
            let local = self.tables[slot].draw(draws(), draws());
            walk.push(candidates[local]);
        }
        walk
    }
}

/// Both tables, named. \`centre\` is the one to export.
pub struct Embeddings {
    pub centre: Vec<f64>,
    pub context: Vec<f64>,
    pub dimensions: Dimensions,
}

impl Embeddings {
    /// Disjoint mutable rows from the two tables. The borrow checker demands
    /// this be explicit, which is a feature: it is exactly the aliasing
    /// question the C and Rust fast stages have to answer with a filter.
    pub fn rows_mut(&mut self, centre_id: usize, context_id: usize) -> (&mut [f64], &mut [f64]) {
        let width = self.dimensions.0;
        let centre = &mut self.centre[centre_id * width..(centre_id + 1) * width];
        let context = &mut self.context[context_id * width..(context_id + 1) * width];
        (centre, context)
    }
}

/// Branch on sign so exp cannot overflow on a large negative score.
fn sigmoid(value: f64) -> f64 {
    if value >= 0.0 {
        1.0 / (1.0 + (-value).exp())
    } else {
        let positive = value.exp();
        positive / (1.0 + positive)
    }
}

/// One pair's update: a rank-one operation on two rows, and the only place
/// the embeddings are written.
pub fn update_pair(
    centre_row: &mut [f64],
    context_row: &mut [f64],
    gradient: &mut [f64],
    label: f64,
    rate: f64,
) {
    let score: f64 = centre_row
        .iter()
        .zip(context_row.iter())
        .map(|(a, b)| a * b)
        .sum();
    let error = (sigmoid(score) - label) * rate;

    for ((accumulator, centre), context) in gradient
        .iter_mut()
        .zip(centre_row.iter())
        .zip(context_row.iter_mut())
    {
        *accumulator += error * *context;
        *context -= error * *centre;
    }
}
`,
        rationale:
          'Every change targets the sampler, because that is where the time went. Alias tables replace an O(degree) linear scan with a uniform bucket and a biased coin, and the adjacency test the walk bias depends on becomes a binary search over sorted, deduplicated CSR rows rather than the linear scan that made the literal version quadratic in degree per step. The five ways this configuration can be wrong — a non-positive bias, a walk too short to yield pairs, an out-of-range edge, a fully isolated graph, an empty distribution — each become an error variant a caller can match on rather than a panic in the middle of a training run. Walk length, node count and embedding width become newtypes because all three are usize and are genuinely swapped. The alias draw takes its uniforms as arguments rather than owning a generator, which is what lets the fast stage substitute a per-thread one without touching this code. And rows_mut makes the disjointness of the two embedding rows explicit, which is the same aliasing question the optimized C and Rust stages have to answer with a self-pair filter — here the borrow checker asks it up front.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'The walk step drops from O(degree^2) to O(log degree) plus O(1), at a one-time build and its matching memory. Illustrative, not a measured benchmark: this is the difference between sampling dominating the runtime and the gradient updates dominating it.',
      },

      'make-it-fast': {
        code: `//! Parallel walks and lock-free SGD.
//!
//! Two observations drive this. Walks are entirely independent, so generation
//! is a rayon map with a per-thread generator. And the embedding update is a
//! rank-one write to two rows out of millions, so the chance two threads
//! touch the same row at once is negligible - which means the updates can
//! race and nobody locks. That is a deliberate correctness compromise with a
//! quantitative argument behind it, and it is what makes word2vec-family
//! training scale. In Rust it also requires saying so out loud, because the
//! borrow checker will not let it happen by accident.

use rayon::prelude::*;
use std::cell::UnsafeCell;

/// Flat CSR with 32-bit indices: the index arrays are streamed on every walk
/// step, so halving their width measurably cuts the bandwidth they cost.
pub struct GraphView<'a> {
    pub indptr: &'a [u32],
    pub indices: &'a [u32],
}

/// Alias tables for every node, stored contiguously with a CSR-style offset
/// array so locating a node's table is index arithmetic, not a pointer chase.
pub struct AliasView<'a> {
    pub offsets: &'a [u32],
    pub probability: &'a [f32],
    pub alias: &'a [u32],
}

/// Three-shift xorshift: a handful of bit operations per draw against a
/// Mersenne twister's large state and much heavier step. One per thread, so
/// the state stays in L1 and never shares a cache line.
pub struct FastRng {
    state: u64,
}

impl FastRng {
    #[inline]
    pub fn new(seed: u64) -> Self {
        Self { state: seed | 1 }
    }

    #[inline]
    fn next_u64(&mut self) -> u64 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 7;
        self.state ^= self.state << 17;
        self.state
    }

    #[inline]
    pub fn uniform(&mut self) -> f32 {
        (self.next_u64() >> 40) as f32 * (1.0 / 16_777_216.0)
    }

    /// Multiply-shift rather than a modulo: the division is the expensive
    /// part of a bounded draw, and this removes it for a negligible bias.
    #[inline]
    pub fn bounded(&mut self, bound: u32) -> u32 {
        (((self.next_u64() >> 32) as u64 * u64::from(bound)) >> 32) as u32
    }
}

/// Walks for a whole block of starts, in parallel, into a pre-sized buffer.
pub fn generate_walks(
    graph: &GraphView<'_>,
    alias: &AliasView<'_>,
    starts: &[u32],
    length: usize,
    seed: u64,
) -> Vec<u32> {
    // Capacity known exactly: one allocation for every walk in the block.
    let mut walks = vec![0u32; starts.len() * length];

    walks
        .par_chunks_mut(length)
        .zip(starts.par_iter())
        .enumerate()
        .for_each(|(index, (walk, &start))| {
            // Seeded from the walk index rather than the thread id, so the
            // result is reproducible regardless of how rayon schedules it.
            let mut rng = FastRng::new(seed ^ (index as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
            let mut current = start;
            walk[0] = current;

            for step in 1..length {
                let begin = graph.indptr[current as usize] as usize;
                let degree = graph.indptr[current as usize + 1] as usize - begin;
                if degree == 0 {
                    walk[step] = current;
                    continue;
                }
                let table = alias.offsets[current as usize] as usize;
                let bucket = rng.bounded(degree as u32) as usize;
                let local = if rng.uniform() < alias.probability[table + bucket] {
                    bucket
                } else {
                    alias.alias[table + bucket] as usize
                };
                current = graph.indices[begin + local];
                walk[step] = current;
            }
        });

    walks
}

/// Shared embedding tables written without synchronization.
///
/// SAFETY CONTRACT, stated because Rust makes you state it: threads write
/// overlapping rows with no locking and no atomics. This is unsound as a
/// general pattern and sound only under the specific argument that the tables
/// are millions of rows, each update touches two, and a lost update costs one
/// gradient out of billions. Concretely it means the result is not
/// bit-reproducible and torn f32 writes are possible. The alternative -
/// per-row locks or atomics - costs more than the races do, which is a claim
/// a benchmark has to back, not a preference.
struct SharedTables {
    centre: UnsafeCell<Vec<f32>>,
    context: UnsafeCell<Vec<f32>>,
    dimensions: usize,
}

unsafe impl Sync for SharedTables {}

impl SharedTables {
    fn new(nodes: usize, dimensions: usize) -> Self {
        Self {
            centre: UnsafeCell::new(vec![0.0; nodes * dimensions]),
            context: UnsafeCell::new(vec![0.0; nodes * dimensions]),
            dimensions,
        }
    }

    /// # Safety
    /// The caller accepts benign races on overlapping rows, per the contract
    /// on the type. Never call this with centre_id such that the two slices
    /// alias - a self-pair makes them the same memory, and the update is then
    /// genuinely wrong rather than merely racy.
    #[inline]
    unsafe fn rows(&self, centre_id: u32, context_id: u32) -> (&mut [f32], &mut [f32]) {
        let width = self.dimensions;
        let centre = &mut (*self.centre.get())
            [centre_id as usize * width..(centre_id as usize + 1) * width];
        let context = &mut (*self.context.get())
            [context_id as usize * width..(context_id as usize + 1) * width];
        (centre, context)
    }
}

/// Lock-free SGNS over a block of walks.
pub fn train_walks(
    walks: &[u32],
    length: usize,
    window: usize,
    negatives: usize,
    noise_table: &[u32],
    dimensions: usize,
    nodes: usize,
    rate: f32,
    seed: u64,
) -> Vec<f32> {
    let tables = SharedTables::new(nodes, dimensions);

    walks
        .par_chunks(length)
        .enumerate()
        .for_each(|(index, walk)| {
            let mut rng = FastRng::new(seed ^ (index as u64).wrapping_mul(0x2545_F491_4F6C_DD1D));
            // Per-walk gradient scratch: the one buffer that must NOT be
            // shared, because it accumulates across a pair's negatives.
            let mut gradient = vec![0.0f32; dimensions];

            for position in 0..walk.len() {
                let low = position.saturating_sub(window);
                let high = (position + window + 1).min(walk.len());

                for other in low..high {
                    // Self-pairs are filtered here rather than handled
                    // inside: they would make the two row slices alias, which
                    // is the one case the unsafe contract above excludes.
                    if other == position || walk[other] == walk[position] {
                        continue;
                    }
                    gradient.fill(0.0);

                    for sample in 0..=negatives {
                        let (node, label) = if sample == 0 {
                            (walk[other], 1.0f32)
                        } else {
                            (noise_table[rng.bounded(noise_table.len() as u32) as usize], 0.0)
                        };
                        if node == walk[position] {
                            continue;
                        }

                        // SAFETY: node != walk[position] is checked above, so
                        // the two slices are disjoint; races are accepted.
                        let (centre_row, context_row) =
                            unsafe { tables.rows(walk[position], node) };

                        // Zipped contiguous slices: no bounds check survives,
                        // and the loop is the shape LLVM vectorizes.
                        let score: f32 = centre_row
                            .iter()
                            .zip(context_row.iter())
                            .map(|(a, b)| a * b)
                            .sum();
                        let error = (1.0 / (1.0 + (-score).exp()) - label) * rate;

                        for ((accumulator, centre), context) in gradient
                            .iter_mut()
                            .zip(centre_row.iter())
                            .zip(context_row.iter_mut())
                        {
                            *accumulator += error * *context;
                            *context -= error * *centre;
                        }
                    }

                    // SAFETY: same contract; only the centre row is touched.
                    let (centre_row, _) = unsafe { tables.rows(walk[position], walk[position]) };
                    for (value, &delta) in centre_row.iter_mut().zip(gradient.iter()) {
                        *value -= delta;
                    }
                }
            }
        });

    tables.centre.into_inner()
}

/// Degree^0.75 pre-expanded into a uniform lookup table, so a negative draw
/// is one bounded integer and one load with no search at all.
pub fn build_noise_table(degrees: &[u32], resolution: usize) -> Vec<u32> {
    let weights: Vec<f64> = degrees
        .iter()
        .map(|&degree| f64::from(degree.max(1)).powf(0.75))
        .collect();
    let total: f64 = weights.iter().sum();

    let mut table = Vec::with_capacity(resolution);
    let mut cumulative = 0.0;
    let mut node = 0usize;
    for slot in 0..resolution {
        let position = slot as f64 / resolution as f64 * total;
        while node + 1 < weights.len() && cumulative + weights[node] < position {
            cumulative += weights[node];
            node += 1;
        }
        table.push(node as u32);
    }
    table
}
`,
        rationale:
          'Two structural changes, both following from the profile rather than from intuition. Walk generation becomes a rayon map over pre-sized chunks with one generator per walk — seeded from the walk index rather than the thread id, so the output is reproducible however rayon schedules it — and the generator itself drops to a three-shift xorshift with a multiply-shift bounded draw, because the modulo division dominated the old one. The training loop then does what the C version does, but Rust forces the compromise into the open: the shared tables are wrapped in an UnsafeCell with an explicit safety contract saying that threads race on overlapping rows, that this is sound only under the specific argument that a lost update costs one gradient out of billions, and that the consequence is loss of bit-reproducibility. The self-pair filter is load-bearing rather than cosmetic — it is the one case where the two row slices would genuinely alias, which is unsound rather than merely racy — and that is why it appears twice. The per-pair gradient scratch stays thread-local because it accumulates across negatives.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Walks are fully independent, and the SGD is parallelized by accepting benign races on the shared tables rather than by partitioning them, so neither pass needs a reduction or a lock.',
            tradeoff: 'The lock-free updates cost bit-reproducibility and make the result depend on scheduling, so an embedding-quality regression cannot be bisected against a known-good run — and the pattern requires unsafe, which means the soundness argument must be maintained by hand.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The walk buffer, the noise table and the gradient scratch all have exactly known lengths, so each is one allocation and the parallel walk pass writes into disjoint chunks of it.',
            tradeoff: 'The whole walk block is materialized before training starts, so peak memory is walks times length in u32 — the largest allocation in the pipeline, and what forces chunking on a large graph.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The dot product and both update loops become zips over contiguous row slices, so the per-element bounds checks the indexed version pays disappear entirely.',
            tradeoff: 'The triple-nested zip in the update reads considerably worse than three indexed loops, and it obscures that the gradient, centre and context rows must all be the same width — a mismatch silently truncates to the shortest instead of failing.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The generator methods are a few bit operations each and are called several times per walk step, so a call boundary there would cost more than the work.',
            tradeoff: 'Inlining a generator into every call site inflates code size in the hot loop, and on a large enough loop body that can cost more in instruction-cache pressure than the avoided calls save.',
          },
        ],
        libraryName: 'rayon',
        profile:
          'Walk generation scales nearly linearly in cores; the SGD scales until false sharing or memory bandwidth binds. Illustrative, not a measured benchmark: with sampling reduced to a few bit operations the profile finally shifts to the gradient updates, which is where the arithmetic was assumed to be all along.',
      },
    },
  },
};
