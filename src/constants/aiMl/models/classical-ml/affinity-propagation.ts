import type { AiMlModel } from '../../types';

/**
 * Affinity Propagation — clustering by message passing over a similarity
 * matrix, where the clusters are led by actual data points.
 *
 * Follows spectral clustering in the structure group because it removes a
 * different binding assumption. Spectral gave up the blob; this gives up the
 * centroid, and with it the requirement that the data be vectors at all: the
 * only input is s(i, k), and s(i, k) may be non-metric and asymmetric. The
 * entry is therefore built around the three decisions that determine whether
 * it works — which similarity, what preference, and how much damping — rather
 * than around the message formulas, which are short.
 */
export const AFFINITY_PROPAGATION: AiMlModel = {
  slug: 'affinity-propagation',
  name: 'Affinity Propagation',
  aliases: ['Affinity Propagation', 'Exemplar-based clustering', 'Frey-Dueck'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  taskTypes: ['clustering'],
  paradigmNote:
    'Unsupervised in the plain sense: no labels anywhere. The nearest thing to a supervision hook is the preference, which can be set per point — raising it for points known to make good representatives is a way of injecting prior knowledge without ever providing a label.',

  intuition:
    'Imagine every data point is a voter and every data point is also a candidate. Each voter tells each candidate how much it would like that candidate to represent it, measured against its best alternative — that is the responsibility. Each candidate answers with how available it is, which depends on how much support it is already collecting from everyone else — that is the availability. The two messages are passed back and forth until the votes settle, and the points that end up voting for themselves are the exemplars. Nobody told the algorithm how many clusters to find; that falls out of how reluctant each point is to stand as a candidate, a number called the preference. The leaders are real data points, not averages, which means the only thing the method ever needs is a table of how similar each pair is — and that table can come from edit distance, from correlation, from anything that can be computed between two items.',

  objective: {
    kind: 'fixed-point',
    expression: {
      formula:
        '\\max_{\\mathbf{c} \\in \\{1,\\dots,n\\}^{n}} \\; \\sum_{i=1}^{n} s\\!\\left(i, c_i\\right) \\;-\\; \\sum_{k=1}^{n} \\delta_k(\\mathbf{c}), \\qquad \\delta_k(\\mathbf{c}) = \\begin{cases} \\infty & \\text{if } c_k \\neq k \\text{ but } c_i = k \\text{ for some } i \\\\ 0 & \\text{otherwise} \\end{cases}',
      symbols: [
        { symbol: 'c_i', meaning: 'the exemplar that point i is assigned to; c_i = i means i is itself an exemplar' },
        { symbol: 's(i, c_i)', meaning: 'how well the chosen exemplar serves point i — a similarity, so larger is better' },
        { symbol: 's(k, k)', meaning: 'the preference: what an exemplar “scores” for itself, which makes it the price of opening a cluster and the only control over how many appear' },
        { symbol: '\\delta_k(\\mathbf{c})', meaning: 'the exemplar-consistency penalty: infinite if anyone chooses k while k does not choose itself, so a point cannot be followed unless it leads' },
      ],
    },
    reading:
      'Choose an exemplar for every point so that the total similarity between points and their exemplars is as large as possible, with one hard rule: a point may only be chosen as an exemplar if it chooses itself. Because each exemplar scores its own preference, every extra cluster costs something, and that cost is what stops the answer being “everyone is their own exemplar”. That is the target, and it is a combinatorial problem of the facility-location family, NP-hard in general. The method does not descend it. It is derived by writing the problem as a factor graph and running max-sum belief propagation, and what it actually computes is a fixed point of the two message updates, from which the exemplars are read off. That is why this entry says fixed-point rather than loss: nothing monotone is being minimized — net similarity can go down between iterations — and the algorithm’s output is whatever the messages settle to. Where the messages do settle, the result is empirically near-optimal; the general theory of max-product on loopy graphs gives optimality only over a restricted neighbourhood of assignments, which is weaker than any approximation ratio, so no guarantee against the true optimum is available or should be claimed.',
  },

  optimization: {
    method: 'Max-sum message passing on the exemplar factor graph, with damped fixed-point iteration',
    updateRule: {
      formula:
        '\\begin{aligned} r(i,k) &\\leftarrow s(i,k) - \\max_{k^{\\prime} \\neq k}\\left\\{ a(i,k^{\\prime}) + s(i,k^{\\prime}) \\right\\} \\\\ a(i,k) &\\leftarrow \\min\\left\\{0,\\; r(k,k) + \\sum_{i^{\\prime} \\notin \\{i,k\\}} \\max\\{0, r(i^{\\prime},k)\\}\\right\\} \\quad (i \\neq k) \\\\ a(k,k) &\\leftarrow \\sum_{i^{\\prime} \\neq k} \\max\\{0, r(i^{\\prime},k)\\} \\\\ m &\\leftarrow \\lambda\\, m_{\\text{old}} + (1-\\lambda)\\, m_{\\text{new}}, \\qquad c_i = \\arg\\max_{k}\\left[ a(i,k) + r(i,k) \\right] \\end{aligned}',
      symbols: [
        { symbol: 'r(i,k)', meaning: 'responsibility sent from i to k: how strongly i wants k as its exemplar, relative to the best rival i has' },
        { symbol: 'a(i,k)', meaning: 'availability sent from k to i: how appropriate it would be for i to choose k, given the support k already has' },
        { symbol: 'r(k,k)', meaning: 'self-responsibility: evidence that k should be an exemplar at all, seeded by the preference s(k,k)' },
        { symbol: '\\lambda', meaning: 'damping factor in [0.5, 1): the fraction of the old message kept, applied to both r and a — the thing that stops the iteration oscillating' },
        { symbol: 'c_i', meaning: 'the decoded assignment; k is an exemplar when a(k,k) + r(k,k) is positive' },
      ],
    },
    rationale:
      'Written as belief propagation, the clustering problem becomes two local rules, which is why the method exists. The responsibility rule is a competition: i compares k against its best rival, so a point is drawn toward the candidate that most clearly beats the alternatives. The availability rule is accumulation of evidence: k becomes more available to i the more positive responsibility other points direct at it, capped at zero from above so that support is only ever withdrawn, never invented. The three things that carry real consequences are not in the formulas. The cost is quadratic per iteration only because of an implementation trick — keep the largest and second-largest value in each row, and the max over rivals is a lookup, whereas transcribing the formula costs O(n) per entry and O(n³) per sweep. Damping is not optional polish: undamped max-sum on this graph oscillates on many real inputs, and the symptom looks like a data problem rather than a numerical one. And exact ties between similarities leave the messages with no way to break symmetry, so a tiny relative jitter is added — the reference implementations all do this, and it is a correctness measure rather than a tweak.',
    hyperparameters: [
      { name: 'similarity function s(i, k)', role: 'The model. Default is negative squared Euclidean distance, which turns the objective into a facility-location version of squared error. Any similarity is allowed — negative edit distance for sequences, cosine for documents, Pearson correlation for series, even an asymmetric directed cost — because nothing requires a metric, a mean, or symmetry. The sign matters: passing a distance where a similarity is expected selects the most outlying points as exemplars', typicalRange: 'any real-valued table; larger means more alike, and the scale sets the scale of the preference' },
      { name: 'preference s(k, k)', role: 'The price of an exemplar, and the only control over how many clusters emerge. A higher value yields more clusters, a lower one fewer. It lives in the units of the similarity, so changing the similarity changes what every value means, and it may be a vector, giving individual points a head start', typicalRange: 'median of the similarities for a moderate count, minimum for few clusters; scan on a log-like scale' },
      { name: 'damping λ', role: 'How much of the previous message survives each update. Too low and the messages oscillate without converging; too high and convergence is slow but steady', typicalRange: '0.5 default, commonly raised to 0.7 to 0.95 when oscillation appears' },
      { name: 'max iterations', role: 'The hard budget. Reaching it means the messages did not settle, which is a result to act on rather than to accept', typicalRange: '200 to 1000' },
      { name: 'convergence window', role: 'Stop when the set of exemplars has not changed for this many consecutive iterations. The message values keep drifting long after the decision is stable, so the decision is what is monitored', typicalRange: '15 to 50 iterations' },
    ],
    convergence:
      'There is no convergence guarantee. Max-sum belief propagation on a graph with loops can oscillate indefinitely, and it does so on real data; damping suppresses it and is the first remedy, with a higher λ the second, and a few percent of jitter in the similarities the third. There is also no monotone quantity to watch, because the objective is not what is being descended — the reliable signal is the exemplar set stabilizing. The characteristic failures are all visible once you know to look. Exemplars that flip between iterations mean the damping is too low. A result with one giant cluster or with nearly every point an exemplar means the preference is on the wrong side of the similarity scale. No exemplars at all means the preference is so low that no point believes in itself. And a similarity matrix with a sign error returns confident, tidy, entirely wrong exemplars. At a fixed point the answer is typically very good, and it should still be judged against a baseline such as k-medoids rather than trusted to be optimal.',
    complexity:
      'Per iteration: O(n²) time with the top-two trick, O(n³) if the max over rivals is transcribed literally. Memory: three n-by-n matrices — similarity, responsibility, availability — plus temporaries, which is the real ceiling: roughly ten thousand points on a workstation, with the matrices a gigabyte or so each in double precision. Iterations to converge are typically in the hundreds. On a sparse similarity — each point connected only to its nearest neighbours, every absent entry treated as minus infinity — both time and memory drop to O(edges) per iteration, which is how the method is pushed well past that ceiling, at the cost of whatever the neighbour pruning discards.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Cluster many series by how they move, and pick a real series from each group as its representative. Build the similarity as the correlation between series after differencing and z-normalizing, or as negative dynamic-time-warping distance; neither admits a mean, which is the reason this suits series better than k-means. The exemplar is an actual series, so it can be plotted, inspected, forecast directly, or used as the anchor for a pooled model across its group. An asymmetric variant is possible: let s(i, k) be the best lagged correlation of i with k leading it, so the table itself says which series are leaders and which are followers.',
        where: [
          'Grouping thousands of related series — store-by-product demand, per-asset metrics — so one model is fitted per group instead of one per series',
          'Picking representative series for a dashboard or a review, where an average curve would be misleading and a real one is not',
          'Lead-lag structure over sensors or markets using an asymmetric lagged-correlation similarity',
        ],
        why: 'It accepts exactly the kind of similarity series produce — correlation or time-warped distance, with no meaningful average — and it returns real series as cluster centres, which makes the output explainable. It also lets a new series be assigned cheaply: take the exemplar it is most similar to, with no refit. The costs bind quickly: an n-by-n correlation table over tens of thousands of series is not affordable, results shift when the series set changes because the exemplar set can change, and the number of groups is controlled by a preference that must be tuned on a scale defined by the correlations rather than by a count anyone chose.',
        featurization: [
          'Difference or detrend before computing correlation: two independently trending series correlate strongly for no reason, and the clusters recover trend rather than behaviour',
          'Z-normalize each series, or the similarity measures level and scale and the clusters group by magnitude',
          'Set the preference from the correlation table (its median, or a quantile) rather than from a number carried over from another dataset',
          'Compute the similarity on the training window only, or the grouping leaks future co-movement into the forecast',
        ],
        evaluation:
          'Rolling-origin backtest of the forecasts made with the clustering in place — pooled-per-group versus per-series — not any clustering score. Check that the number of groups is stable across refits and that exemplar identities do not churn.',
        pitfalls: [
          'Spurious correlation between trending series, which makes the table describe shared trend rather than shared dynamics',
          'A preference that over-fragments, leaving most groups with one or two series and nothing to pool',
          'Exemplar churn across refits, which breaks any downstream pipeline keyed on the exemplar’s identity',
          'Quadratic memory reached silently as the series count grows between refits',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The method has no notion of outlyingness, and its own mechanism works against it: a point dissimilar to everything has no better option than to vote for itself, so an outlier typically becomes a singleton exemplar — a tidy cluster that hides it — whenever its similarities fall below the preference. The only score available is similarity to the assigned exemplar, which is the generic distance-to-centre recipe any clustering offers and not something this method contributes. Use an isolation forest, a nearest-neighbour score, or DBSCAN’s noise label instead.',
      },
      optimization: {
        fit: 'adapted',
        how: 'The stated objective is the uncapacitated facility-location problem in disguise: choose which points to open as facilities (exemplars), assign every point to one open facility, maximize total similarity — equivalently minimize total assignment cost — where the preference is the cost of opening a facility. Set s(i, k) to the negative cost of serving i from k, s(k, k) to the negative opening cost, and the number of facilities is chosen by the economics rather than fixed in advance. Asymmetric costs are natural here, since the cost of serving i from k need not equal the reverse. The algorithm is then a heuristic for that combinatorial problem, with the structure of its output — real points as centres — matching the structure of the decision.',
        where: [
          'Depot, warehouse or hub placement from a table of travel costs, which is asymmetric when routes are one-way or congested',
          'Choosing a representative subset — prototypes for a labelling budget, or a reduced set of scenarios in stochastic planning — where the selected items must be real members of the set',
          'Exemplar and prototype selection for summarization and for seeding other methods with real starting points',
        ],
        why: 'Compared with k-medoids it needs no number of facilities in advance and does not depend on a random start; compared with an exact solver it scales more gracefully on a similarity table that is already given. Against it, and decisively when the instance is small enough: facility location has exact mixed-integer formulations and LP-rounding algorithms with approximation guarantees, and this method has neither a bound nor a way to add real constraints such as capacities. If a solver can handle the instance, use the solver; this earns its place when the cost table is large, soft, and the answer need only be good.',
        featurization: [
          'Encode costs as negative similarities in consistent units, and set the preference to the real opening cost in those same units — they are the same quantity',
          'Encode infeasible assignments as minus infinity entries, which both forbids them and, on a sparse table, saves the memory',
          'Capacities and per-site limits cannot be written into the similarity; check them afterwards and treat a violation as a reason to switch method',
        ],
        evaluation:
          'Total cost of the returned solution against a solver or an LP-relaxation lower bound where the instance allows it, and against k-medoids and a greedy baseline where it does not. Report the gap, not just the cost.',
        pitfalls: [
          'A preference in the wrong units, which silently misprices the number of facilities by an order of magnitude',
          'Assuming the answer is optimal because it converged; a fixed point is not a certificate',
          'Treating unmodelled constraints as someone else’s problem, then discovering the returned sites cannot be built',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'viable',
        how: 'Cluster documents, sentences or short texts using cosine similarity over tf-idf vectors or sentence embeddings, and report each cluster by its exemplar — which is a real piece of text, not a centroid vector that must be decoded back into words. Used on sentences from a document, the exemplars are an extractive summary.',
        where: [
          'Extractive summarization of a document or a thread, taking exemplar sentences as the summary',
          'Grouping support tickets or news items, labelling each group with its most representative real item',
          'Near-duplicate collapse in a text corpus, where the cluster’s exemplar stands in for the group',
        ],
        why: 'Cosine is the right similarity because it compares direction and ignores length, so a short and a long document on one topic are close; swap in Euclidean distance over raw counts and clusters form by document length instead of topic. Exemplars that are readable text are the practical advantage over k-means, whose centroid is a vector no one can read. The costs are the usual quadratic ones, and a specific trap: embedding similarities tend to occupy a narrow band near the top of the scale, so the preference has little room and a small change swings the cluster count.',
        featurization: [
          'L2-normalize the vectors so a dot product is the cosine, and compute the full similarity in one matrix product',
          'Remove boilerplate and duplicates first, or the exemplars are the boilerplate',
          'Inspect the distribution of similarities before choosing the preference; a narrow band calls for a quantile, not a fixed value',
        ],
        evaluation:
          'Human review of the exemplars against their clusters, and for summarization a content-overlap measure against reference summaries. Cluster purity is meaningless without labels.',
        pitfalls: [
          'A narrow similarity band, which makes the cluster count hypersensitive to the preference',
          'Quadratic memory on a large corpus; use a nearest-neighbour sparse similarity or sample first',
          'Treating the exemplar as the whole story of its cluster when the cluster is broad',
        ],
      },
      'computer-vision': {
        fit: 'viable',
        how: 'Represent each image or frame by an embedding, compute similarity as cosine or negative squared Euclidean distance between embeddings, and let the exemplars be real images. The method was originally demonstrated on faces and on gene-expression data for exactly this reason: a cluster centre that is itself an image can be shown to a person.',
        where: [
          'Keyframe selection from video, where the chosen frames must be actual frames',
          'Choosing a representative subset of an image collection for labelling or for a gallery cover',
          'Grouping detected faces or objects and showing one real example per group',
        ],
        why: 'The exemplar is a real image, which makes the output reviewable by a person in a way an averaged embedding is not. The similarity should come from a learned embedding rather than raw pixels, where squared Euclidean distance mostly measures lighting and position. As elsewhere, the method is quadratic, so it suits a collection of thousands of items rather than millions, and the cost of choosing the preference badly is a gallery with either one picture or every picture.',
        featurization: [
          'Use a learned embedding, not pixels, so the similarity reflects content',
          'Normalize embeddings if using cosine, and keep the same normalization when assigning new images to the existing exemplars',
          'Deduplicate near-identical frames first, since adjacent video frames dominate the similarity table',
        ],
        evaluation:
          'Coverage of the collection by the chosen exemplars — the mean similarity between each item and its exemplar — and human review of whether the exemplars are visually distinct from one another.',
        pitfalls: [
          'Adjacent frames being near-identical, so the exemplars cluster in time rather than in content',
          'Pixel-space similarity, which clusters by brightness',
          'A preference chosen once and reused after the embedding model changes',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Dominated by memory: three n-by-n matrices resident at once, at roughly a gigabyte each in double precision at ten thousand points, and a few hundred iterations each costing O(n²). Float32 halves the footprint at a precision cost, and a sparse nearest-neighbour similarity removes the quadratic entirely for large inputs. Computing the similarity table itself is O(n²·d) for vectors and can exceed the message passing in cost when the similarity is something expensive such as time-warped distance.',
    inferenceProfile:
      'Cheap and genuinely usable, which is a real contrast with spectral clustering: a new point is assigned to the exemplar it is most similar to, an O(exemplars) lookup with no refit. It is a nearest-exemplar rule, not a rerun of the algorithm — the new point cannot change which points are exemplars — so the assignment rule and the fitted clustering agree on the training data and can differ slightly beyond it.',
    retrainingCadence:
      'Batch and periodic, and triggered by drift rather than the calendar: serve nearest-exemplar assignment in between, and refit when the average similarity to the assigned exemplar falls or the count of poorly-covered points rises. A refit can change the exemplar set, so keep cluster identity keyed to something stable rather than to the exemplar’s index.',
    driftAndMonitoring: [
      'Track the mean similarity between each point and its exemplar — the coverage — and the share of points below a floor; falling coverage means the exemplars no longer represent the data',
      'Track the number of exemplars across refits; a jump means the preference has drifted relative to the similarity scale',
      'Track iterations to convergence and whether the run converged at all; a rising count is early warning of oscillation',
      'Compare exemplar sets across refits by overlap, and map clusters between runs by exemplar identity or membership overlap, never by cluster index',
    ],
    productionGotchas: [
      'Non-convergence can return nothing or a partial result without raising: always check the convergence flag and the exemplar count before using the labels',
      'The preference is in the units of the similarity, so changing the similarity function, the embedding model, or the normalization silently changes what the same preference means',
      'A distance passed where a similarity is expected selects the most outlying points as exemplars, and the output looks perfectly plausible',
      'Quadratic memory is hit without warning as the dataset grows between runs; the matrices, not the algorithm, are what fail',
      'The exemplar set can change when a few points are added, so any pipeline keyed on an exemplar’s identity breaks at refit',
    ],
  },

  assumptions: [
    'A pairwise similarity exists and is meaningful for the data; it need not be a metric, symmetric, or computed from vectors, but it is the whole model and a poor one cannot be repaired downstream',
    'Each cluster has a point that represents it well — an exemplar that is an actual member, which fails for ring-shaped or elongated clusters where no single member is central',
    'A single preference (or a sensible per-point vector of them) suits the whole dataset, so clusters of very different size and density are not all expressible at once',
    'The data is small enough for an n-by-n table, or a sparse neighbour similarity is a faithful substitute for the dense one',
    'The message passing converges under the chosen damping; this is an assumption about the data and the settings, not a property of the algorithm',
  ],

  pros: [
    {
      point: 'Needs only a similarity table, not coordinates, a metric, or symmetry',
      context:
        'Sequences under edit distance, documents under cosine, series under correlation, directed costs that are not equal both ways: all are valid input. That opens problems where k-means is undefined because there is no mean, and where spectral clustering would need a symmetric affinity.',
    },
    {
      point: 'The number of clusters is not an input',
      context:
        'The preference sets the price of a cluster and the count follows. It is a trade rather than an escape — the preference still has to be chosen — but it is chosen on the similarity scale, can be derived from the data, and can differ per point, which a fixed k cannot express.',
    },
    {
      point: 'Cluster centres are real, inspectable data points',
      context:
        'The exemplar of a group of documents is a document, of a group of series is a series, of a group of customers is a customer. That makes the result reviewable by someone who cannot read a centroid vector, and it is the property that makes the method usable for summarization and representative selection.',
    },
    {
      point: 'No dependence on initialization',
      context:
        'Every point starts as an equal candidate, so there is no random start and no restarts to run. The same input and settings give the same answer, which is a concrete operational advantage over k-means.',
    },
    {
      point: 'New points can be assigned without a refit',
      context:
        'A new point goes to the exemplar it is most similar to. It is an approximation to rerunning the algorithm, but it exists, which spectral clustering does not offer.',
    },
  ],

  cons: [
    {
      point: 'Quadratic memory and quadratic time per iteration',
      context:
        'Three dense n-by-n matrices cap the method near ten thousand points. A sparse neighbour similarity pushes it further, and costs whatever the pruning discards. This decides most affinity-propagation-versus-k-means arguments before cluster quality is discussed.',
    },
    {
      point: 'It can oscillate and has no convergence guarantee',
      context:
        'Damping and iteration limits turn this into a tuning problem, and the failure is easy to misread as bad data. A result produced after hitting the iteration cap is not a result.',
    },
    {
      point: 'The preference is a hidden k with a worse unit',
      context:
        'It controls the cluster count, but on the scale of the similarity and non-linearly, so reaching a target of ten clusters means scanning. A single value also cannot serve clusters of very different density, which is a real limit on realistic data.',
    },
    {
      point: 'Exemplars exclude elongated or ring-shaped clusters',
      context:
        'Each cluster is represented by one member and each point joins the exemplar it is most similar to, so the clusters are compact around a leader. Chains and manifolds are cut into pieces — spectral clustering and DBSCAN are what to reach for there.',
    },
    {
      point: 'No optimality guarantee for a problem that has exact solvers',
      context:
        'The underlying objective is facility location, where exact and provably approximate methods exist. On small and medium instances a solver beats this on both quality and certainty, and the method should be judged against one.',
    },
  ],

  relatedSlugs: ['k-means', 'spectral-clustering', 'hierarchical-clustering', 'dbscan', 'k-nearest-neighbours'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Affinity propagation - the message updates, transcribed literally.

S[i][k] says how well point k would serve as the exemplar for point i. The
diagonal S[k][k] is the PREFERENCE: k's own prior suitability to be an
exemplar, and the only thing that decides how many clusters emerge.

Two messages travel between every ordered pair of points:
  R[i][k]  responsibility, i -> k : how much i wants k as its exemplar,
           measured against the best alternative i has.
  A[i][k]  availability,   k -> i : how appropriate it would be for i to
           pick k, given how much support k has from everyone else.

Taken literally, the max over rivals makes each responsibility O(n) and a
whole sweep O(n^3). That is the price of reading the formula line by line.
"""

import random

NOISE_SCALE = 1e-12   # relative jitter that breaks exact ties between similarities


def affinity_propagation(S, damping=0.5, max_iterations=500, stable_for=15, seed=0):
    n = len(S)
    rng = random.Random(seed)

    # Exact ties leave the messages no way to break symmetry; a tiny relative
    # jitter is enough, and does not change which exemplars win.
    noisy = [
        [S[i][k] + NOISE_SCALE * (abs(S[i][k]) + 1.0) * rng.random() for k in range(n)]
        for i in range(n)
    ]

    R = [[0.0] * n for _ in range(n)]
    A = [[0.0] * n for _ in range(n)]

    previous = None
    unchanged = 0

    for iteration in range(max_iterations):
        # r(i,k) <- s(i,k) - max over k' != k of [ a(i,k') + s(i,k') ]
        for i in range(n):
            for k in range(n):
                best_rival = float("-inf")
                for rival in range(n):
                    if rival != k:
                        best_rival = max(best_rival, A[i][rival] + noisy[i][rival])
                fresh = noisy[i][k] - best_rival
                R[i][k] = damping * R[i][k] + (1.0 - damping) * fresh

        # a(i,k) <- min(0, r(k,k) + sum over i' not in {i,k} of max(0, r(i',k)))
        # a(k,k) <- sum over i' != k of max(0, r(i',k))
        for i in range(n):
            for k in range(n):
                if i == k:
                    fresh = sum(max(0.0, R[other][k]) for other in range(n) if other != k)
                else:
                    support = R[k][k] + sum(
                        max(0.0, R[other][k])
                        for other in range(n)
                        if other != i and other != k
                    )
                    fresh = min(0.0, support)
                A[i][k] = damping * A[i][k] + (1.0 - damping) * fresh

        # k is an exemplar when a(k,k) + r(k,k) is positive. The decision, not
        # the message values, is what is watched for convergence.
        exemplars = tuple(k for k in range(n) if A[k][k] + R[k][k] > 0.0)
        unchanged = unchanged + 1 if exemplars == previous else 0
        previous = exemplars
        if unchanged >= stable_for and exemplars:
            break

    if not previous:
        raise ValueError("no exemplars emerged: preference too low, or no convergence")

    labels = []
    for i in range(n):
        if i in previous:
            labels.append(i)
        else:
            labels.append(max(previous, key=lambda k: S[i][k]))
    return labels, list(previous)


def net_similarity(S, labels):
    """The objective: sum of s(i, c_i). Each exemplar's own diagonal entry is
    its preference, so every extra cluster pays its price here."""
    return sum(S[i][labels[i]] for i in range(len(S)))`,
        profile: 'O(n^3) time per iteration from the literal max over rivals and the nested availability sums, over three lists of lists.',
      },
      'make-it-right': {
        code: `"""Affinity propagation - typed, vectorized, validated, and loud on failure."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Indices = NDArray[np.int64]

NOISE_SCALE = 1e-12
MIN_DAMPING = 0.5


class NotConvergedError(RuntimeError):
    """The exemplar set never settled within the iteration budget."""


@dataclass(frozen=True)
class Clustering:
    exemplars: Indices        # which points were chosen to lead
    labels: Indices           # (n,) the exemplar each point follows
    n_iter: int
    net_similarity: float     # the objective, preferences included


def negative_squared_euclidean(X: Matrix) -> Matrix:
    """The default similarity for vectors. For anything else, build the table
    yourself - nothing below assumes a metric, or even symmetry.

    The scale of this table is the scale of the preference: change one and the
    other's values mean something different.
    """
    squared_norms = np.einsum("ij,ij->i", X, X)
    distances = squared_norms[:, None] - 2.0 * (X @ X.T) + squared_norms[None, :]
    return -np.maximum(distances, 0.0)    # cancellation guard


def _responsibilities(S: Matrix, A: Matrix) -> Matrix:
    """r(i,k) = s(i,k) - best rival, where the rival is the row's largest
    a+s - or its SECOND largest when k itself is the largest.

    Keeping the top two per row turns the O(n) max over rivals into a lookup,
    which is the whole difference between O(n^2) and O(n^3) per sweep.
    """
    rows = np.arange(S.shape[0])
    scores = A + S
    best = scores.argmax(axis=1)
    best_value = scores[rows, best]
    scores[rows, best] = -np.inf
    second_value = scores.max(axis=1)

    fresh = S - best_value[:, None]
    fresh[rows, best] = S[rows, best] - second_value
    return fresh


def _availabilities(R: Matrix) -> Matrix:
    """a(i,k) = min(0, r(k,k) + sum of positive r(i',k) over i' not in {i,k})."""
    positive = np.maximum(R, 0.0)
    np.fill_diagonal(positive, np.diag(R))      # self-responsibility is not clipped
    column = positive.sum(axis=0)

    fresh = np.minimum(0.0, column[None, :] - positive)
    np.fill_diagonal(fresh, column - np.diag(R))   # a(k,k) = sum of the positives
    return fresh


def fit(
    similarity: Matrix,
    preference: float | None = None,
    damping: float = 0.7,
    max_iter: int = 500,
    stable_for: int = 15,
    seed: int = 0,
) -> Clustering:
    """Cluster from a similarity table. Raises ValueError on a malformed
    table and NotConvergedError when the exemplars never settle."""
    if similarity.ndim != 2 or similarity.shape[0] != similarity.shape[1]:
        raise ValueError(f"similarity must be square, got shape {similarity.shape}")
    if np.isnan(similarity).any():
        raise ValueError("similarity contains NaN; use -inf to forbid a pairing")
    if not MIN_DAMPING <= damping < 1.0:
        raise ValueError(f"damping must lie in [{MIN_DAMPING}, 1), got {damping}")

    n = similarity.shape[0]
    S = similarity.astype(np.float64, copy=True)    # never mutate the caller's table
    if preference is None:
        preference = float(np.median(S[~np.eye(n, dtype=bool)])) if n > 1 else 0.0
    np.fill_diagonal(S, preference)

    rng = np.random.default_rng(seed)
    jittered = S + NOISE_SCALE * (np.abs(S) + 1.0) * rng.random(S.shape)

    R = np.zeros_like(S)
    A = np.zeros_like(S)
    previous: NDArray[np.bool_] | None = None
    unchanged = 0

    for iteration in range(1, max_iter + 1):
        R = damping * R + (1.0 - damping) * _responsibilities(jittered, A)
        A = damping * A + (1.0 - damping) * _availabilities(R)

        is_exemplar = (np.diag(A) + np.diag(R)) > 0.0
        same = previous is not None and np.array_equal(is_exemplar, previous)
        unchanged = unchanged + 1 if same else 0
        previous = is_exemplar
        if unchanged >= stable_for and is_exemplar.any():
            break
    else:
        raise NotConvergedError(
            f"no stable exemplar set after {max_iter} iterations - "
            "raise damping, or check the preference against the similarity scale"
        )

    exemplars = np.flatnonzero(is_exemplar)
    labels = exemplars[np.argmax(S[:, exemplars], axis=1)]
    labels[exemplars] = exemplars                   # an exemplar leads itself

    net = float(S[np.arange(n), labels].sum())
    return Clustering(exemplars=exemplars, labels=labels, n_iter=iteration, net_similarity=net)`,
        rationale:
          'The O(n³) transcription becomes O(n²) per sweep: the max over rivals is replaced by the largest and second-largest value of each row, and the availability sums by one column reduction with the diagonal handled as the special case it is. The loops over points disappear into array operations. The parts that were comments become code: the similarity is validated and never mutated, damping is checked against its legal range, the preference defaults to the median of the off-diagonal similarities, and — the important change — non-convergence now raises a named exception instead of returning whatever the last iteration produced, because a result at the iteration cap is not a result. Convergence watches the exemplar set rather than the message values, the quantity that actually matters. The result is a frozen dataclass carrying the net similarity, so the objective is reported rather than implied.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n^2) time per iteration and about six n-by-n float64 temporaries live per sweep, which is what limits it before the algorithm does.',
      },
      'make-it-fast': {
        code: `"""Affinity propagation - in-place sweeps over preallocated float32 buffers."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float32]

NOISE_SCALE = 1e-5     # float32 has ~1e-7 resolution; jitter below that vanishes


def fit_fast(
    similarity: Matrix,
    preference: float,
    damping: float = 0.7,
    max_iter: int = 500,
    stable_for: int = 15,
    seed: int = 0,
) -> tuple[NDArray[np.int64], NDArray[np.int64], int]:
    """Returns (exemplars, labels, iterations). One contiguous float32 dtype
    throughout, and every sweep writes into buffers allocated exactly once."""
    S = np.array(similarity, dtype=np.float32, order="C", copy=True)
    n = S.shape[0]
    np.fill_diagonal(S, preference)

    R = np.zeros_like(S)
    A = np.zeros_like(S)
    scratch = np.empty_like(S)                 # the only other n-by-n buffer
    column = np.empty(n, dtype=np.float32)
    rows = np.arange(n)

    # Strided VIEWS of the diagonals - reading them allocates nothing.
    s_diag = S.reshape(-1)[:: n + 1]
    r_diag = R.reshape(-1)[:: n + 1]
    a_diag = A.reshape(-1)[:: n + 1]

    rng = np.random.default_rng(seed)
    rng.random(size=S.shape, dtype=np.float32, out=scratch)
    scratch *= NOISE_SCALE
    scratch *= np.abs(S) + 1.0                 # relative jitter, applied once
    S += scratch

    keep, take = np.float32(damping), np.float32(1.0 - damping)
    previous = np.zeros(n, dtype=bool)
    unchanged = 0

    for iteration in range(1, max_iter + 1):
        # --- responsibilities: one buffer holds A + S, then the new R ---
        np.add(A, S, out=scratch)
        best = scratch.argmax(axis=1)
        best_value = scratch[rows, best]
        scratch[rows, best] = -np.inf
        second_value = scratch.max(axis=1)

        np.subtract(S, best_value[:, None], out=scratch)
        scratch[rows, best] = S[rows, best] - second_value
        R *= keep
        scratch *= take
        R += scratch

        # --- availabilities: the clipped copy of R becomes the new A ---
        np.maximum(R, 0.0, out=scratch)
        scratch.reshape(-1)[:: n + 1] = r_diag          # diagonal is not clipped
        scratch.sum(axis=0, out=column)
        np.subtract(column, scratch, out=scratch)
        np.minimum(scratch, 0.0, out=scratch)
        scratch.reshape(-1)[:: n + 1] = column - r_diag
        A *= keep
        scratch *= take
        A += scratch

        is_exemplar = (a_diag + r_diag) > 0.0
        unchanged = unchanged + 1 if np.array_equal(is_exemplar, previous) else 0
        np.copyto(previous, is_exemplar)
        if unchanged >= stable_for and is_exemplar.any():
            break
    else:
        raise RuntimeError(f"no stable exemplar set after {max_iter} iterations")

    exemplars = np.flatnonzero(is_exemplar)
    labels = exemplars[np.argmax(S[:, exemplars], axis=1)]
    labels[exemplars] = exemplars
    return exemplars, labels, iteration`,
        rationale:
          'The right-stage version allocates a handful of fresh n-by-n arrays every sweep; at the sizes where this method is used, that allocation and the memory traffic behind it are the cost. Here everything is one contiguous float32 dtype — halving memory and bandwidth — and each sweep writes into three buffers allocated once: R, A, and a single scratch array that holds A + S, then the new responsibilities, then the clipped responsibilities, then the new availabilities, in turn. The row maximum and runner-up come from that one buffer instead of building a masked copy, the damping update is expressed as in-place scalings, and the diagonals are strided views rather than copies. What did not change is the algorithm and its ceiling: it is still three dense matrices, and past a few tens of thousands of points the answer is a sparse neighbour graph, not a tighter loop.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'R, A and one scratch matrix are allocated once and every sweep writes into them through out= arguments, so no n-by-n array is created inside the loop.',
            tradeoff: 'The single scratch buffer is reused for four different meanings in one sweep, so reordering any two lines silently reads stale data — correctness now lives in line order rather than in variable names.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Everything is C-contiguous float32, which halves the memory and the bandwidth against float64, and makes the strided diagonal views and the row reductions single sequential passes.',
            tradeoff: 'Column sums over up to n terms in float32 lose precision at large n, and the tie-breaking jitter must be scaled to float32 resolution or it disappears — which brings back the oscillation it exists to prevent.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The row maximum, its runner-up and the damped update all come out of the one A + S buffer, instead of a masked copy, a subtracted copy and a damped copy being built separately.',
            tradeoff: 'The fused sequence no longer reads like the two update formulas, which makes it hard to check against the derivation and hard to modify — and it has no sparse path, so the O(n^2) memory ceiling stays.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(n^2) time per iteration with four n-by-n float32 buffers resident in total and zero per-iteration allocation. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Affinity propagation - the message updates, transcribed literally.
//
// S[i][k] says how well k would serve as the exemplar for i. The diagonal
// S[k][k] is the PREFERENCE - the only thing that decides how many clusters
// emerge. R[i][k] (responsibility, i -> k) and A[i][k] (availability, k -> i)
// are the two messages. Read literally, the max over rivals makes each
// responsibility O(n) and a whole sweep O(n^3).
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <random>
#include <stdexcept>
#include <vector>

using Matrix = std::vector<std::vector<double>>;

constexpr double kNoiseScale = 1e-12;  // relative jitter that breaks exact ties

struct Clustering {
  std::vector<std::size_t> exemplars;
  std::vector<std::size_t> labels;  // labels[i] is the exemplar i follows
};

Clustering AffinityPropagation(const Matrix& S, double damping, int max_iterations,
                               int stable_for, unsigned seed) {
  const std::size_t n = S.size();
  std::mt19937 rng(seed);
  std::uniform_real_distribution<double> unit(0.0, 1.0);

  // Exact ties leave the messages no way to break symmetry.
  Matrix noisy = S;
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t k = 0; k < n; ++k) {
      noisy[i][k] += kNoiseScale * (std::abs(S[i][k]) + 1.0) * unit(rng);
    }
  }

  Matrix R(n, std::vector<double>(n, 0.0));
  Matrix A(n, std::vector<double>(n, 0.0));

  std::vector<std::size_t> previous;
  int unchanged = 0;

  for (int iteration = 0; iteration < max_iterations; ++iteration) {
    // r(i,k) <- s(i,k) - max over k' != k of [ a(i,k') + s(i,k') ]
    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t k = 0; k < n; ++k) {
        double best_rival = -std::numeric_limits<double>::infinity();
        for (std::size_t rival = 0; rival < n; ++rival) {
          if (rival != k) best_rival = std::max(best_rival, A[i][rival] + noisy[i][rival]);
        }
        const double fresh = noisy[i][k] - best_rival;
        R[i][k] = damping * R[i][k] + (1.0 - damping) * fresh;
      }
    }

    // a(i,k) <- min(0, r(k,k) + sum over i' not in {i,k} of max(0, r(i',k)))
    // a(k,k) <- sum over i' != k of max(0, r(i',k))
    for (std::size_t i = 0; i < n; ++i) {
      for (std::size_t k = 0; k < n; ++k) {
        double fresh = 0.0;
        if (i == k) {
          for (std::size_t other = 0; other < n; ++other) {
            if (other != k) fresh += std::max(0.0, R[other][k]);
          }
        } else {
          double support = R[k][k];
          for (std::size_t other = 0; other < n; ++other) {
            if (other != i && other != k) support += std::max(0.0, R[other][k]);
          }
          fresh = std::min(0.0, support);
        }
        A[i][k] = damping * A[i][k] + (1.0 - damping) * fresh;
      }
    }

    // k is an exemplar when a(k,k) + r(k,k) is positive. The decision, not
    // the message values, is what is watched for convergence.
    std::vector<std::size_t> exemplars;
    for (std::size_t k = 0; k < n; ++k) {
      if (A[k][k] + R[k][k] > 0.0) exemplars.push_back(k);
    }
    unchanged = (exemplars == previous) ? unchanged + 1 : 0;
    previous = exemplars;
    if (unchanged >= stable_for && !previous.empty()) break;
  }

  if (previous.empty()) {
    throw std::runtime_error("no exemplars emerged: preference too low, or no convergence");
  }

  std::vector<bool> is_exemplar(n, false);
  for (const std::size_t k : previous) is_exemplar[k] = true;

  std::vector<std::size_t> labels(n, 0);
  for (std::size_t i = 0; i < n; ++i) {
    if (is_exemplar[i]) {
      labels[i] = i;
      continue;
    }
    std::size_t best = previous.front();
    for (const std::size_t k : previous) {
      if (S[i][k] > S[i][best]) best = k;
    }
    labels[i] = best;
  }
  return {previous, labels};
}

// The objective: sum of s(i, c_i). Each exemplar's own diagonal entry is its
// preference, so every extra cluster pays its price here.
double NetSimilarity(const Matrix& S, const std::vector<std::size_t>& labels) {
  double total = 0.0;
  for (std::size_t i = 0; i < labels.size(); ++i) total += S[i][labels[i]];
  return total;
}`,
        profile: 'O(n^3) time per iteration from the literal max over rivals and the nested availability sums, over four nested-vector matrices.',
      },
      'make-it-right': {
        code: `// Affinity propagation - flat buffers, O(n^2) sweeps, validated, fails loudly.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <random>
#include <span>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

class NotConverged : public std::runtime_error {
 public:
  explicit NotConverged(int iterations)
      : std::runtime_error("no stable exemplar set after " + std::to_string(iterations) +
                           " iterations - raise damping, or check the preference scale") {}
};

struct Options {
  double damping = 0.7;
  int max_iterations = 500;
  int stable_for = 15;
  unsigned seed = 0;
};

struct Clustering {
  std::vector<std::size_t> exemplars;
  std::vector<std::size_t> labels;
  int iterations = 0;
  double net_similarity = 0.0;  // the objective, preferences included
};

class AffinityPropagation {
 public:
  // similarity is row-major (n, n). Validated before anything is allocated,
  // which is why construction goes through a factory rather than a constructor.
  static AffinityPropagation Create(std::span<const double> similarity, std::size_t n,
                                    double preference, const Options& options) {
    if (n == 0 || similarity.size() != n * n) {
      throw std::invalid_argument("similarity must be a non-empty n-by-n table");
    }
    if (options.damping < 0.5 || options.damping >= 1.0) {
      throw std::invalid_argument("damping must lie in [0.5, 1)");
    }
    if (std::any_of(similarity.begin(), similarity.end(),
                    [](double value) { return std::isnan(value); })) {
      throw std::invalid_argument("similarity contains NaN; use -inf to forbid a pairing");
    }
    return AffinityPropagation(similarity, n, preference, options);
  }

  [[nodiscard]] Clustering Fit() {
    std::vector<bool> previous(n_, false);
    int unchanged = 0;
    int iteration = 0;

    for (; iteration < options_.max_iterations; ++iteration) {
      UpdateResponsibilities();
      UpdateAvailabilities();

      std::vector<bool> current(n_, false);
      bool any = false;
      for (std::size_t k = 0; k < n_; ++k) {
        current[k] = a_[k * n_ + k] + r_[k * n_ + k] > 0.0;
        any = any || current[k];
      }
      unchanged = (current == previous) ? unchanged + 1 : 0;
      previous = std::move(current);
      if (unchanged >= options_.stable_for && any) break;
    }
    if (iteration == options_.max_iterations) throw NotConverged(options_.max_iterations);

    Clustering result;
    result.iterations = iteration + 1;
    for (std::size_t k = 0; k < n_; ++k) {
      if (previous[k]) result.exemplars.push_back(k);
    }

    result.labels.resize(n_);
    for (std::size_t i = 0; i < n_; ++i) {
      std::size_t best = result.exemplars.front();
      for (const std::size_t k : result.exemplars) {
        if (s_[i * n_ + k] > s_[i * n_ + best]) best = k;
      }
      result.labels[i] = previous[i] ? i : best;     // an exemplar leads itself
      result.net_similarity += s_[i * n_ + result.labels[i]];
    }
    return result;
  }

 private:
  AffinityPropagation(std::span<const double> similarity, std::size_t n, double preference,
                      const Options& options)
      : n_(n),
        options_(options),
        s_(similarity.begin(), similarity.end()),
        r_(n * n, 0.0),
        a_(n * n, 0.0) {
    for (std::size_t k = 0; k < n_; ++k) s_[k * n_ + k] = preference;

    // Relative jitter breaks exact ties. It is applied to the stored table, so
    // the reported net similarity is off by about 1e-12 relative - negligible.
    std::mt19937 rng(options.seed);
    std::uniform_real_distribution<double> unit(0.0, 1.0);
    for (double& value : s_) value += kNoiseScale * (std::abs(value) + 1.0) * unit(rng);
  }

  // r(i,k) = s(i,k) - best rival, where the rival is the row's largest a+s, or
  // its SECOND largest when k is the largest. Two scans per row, not n.
  void UpdateResponsibilities() {
    const double keep = options_.damping;
    const double take = 1.0 - keep;
    for (std::size_t i = 0; i < n_; ++i) {
      const std::span<const double> s_row(s_.data() + i * n_, n_);
      const std::span<const double> a_row(a_.data() + i * n_, n_);
      const std::span<double> r_row(r_.data() + i * n_, n_);

      double first = -std::numeric_limits<double>::infinity();
      double second = first;
      std::size_t first_index = 0;
      for (std::size_t k = 0; k < n_; ++k) {
        const double score = a_row[k] + s_row[k];
        if (score > first) {
          second = first;
          first = score;
          first_index = k;
        } else if (score > second) {
          second = score;
        }
      }
      for (std::size_t k = 0; k < n_; ++k) {
        const double rival = (k == first_index) ? second : first;
        r_row[k] = keep * r_row[k] + take * (s_row[k] - rival);
      }
    }
  }

  void UpdateAvailabilities() {
    const double keep = options_.damping;
    const double take = 1.0 - keep;

    std::vector<double> column(n_, 0.0);
    for (std::size_t i = 0; i < n_; ++i) {
      for (std::size_t k = 0; k < n_; ++k) column[k] += std::max(0.0, r_[i * n_ + k]);
    }
    // Self-responsibility enters unclipped.
    for (std::size_t k = 0; k < n_; ++k) {
      column[k] += r_[k * n_ + k] - std::max(0.0, r_[k * n_ + k]);
    }

    for (std::size_t i = 0; i < n_; ++i) {
      for (std::size_t k = 0; k < n_; ++k) {
        const double r_ik = r_[i * n_ + k];
        const double fresh =
            (i == k) ? column[k] - r_ik : std::min(0.0, column[k] - std::max(0.0, r_ik));
        a_[i * n_ + k] = keep * a_[i * n_ + k] + take * fresh;
      }
    }
  }

  static constexpr double kNoiseScale = 1e-12;

  std::size_t n_;
  Options options_;
  std::vector<double> s_;  // owned, row-major, preference on the diagonal
  std::vector<double> r_;
  std::vector<double> a_;
};`,
        rationale:
          'The O(n³) sweep becomes O(n²): the max over rivals is replaced by the largest and second-largest value of each row, found in one scan, and the availability sums by a single column accumulation with the unclipped diagonal handled separately. The nested vectors become flat row-major buffers owned by one class, accessed through std::span rows. Validation moves in front of construction through a factory, so a malformed table or an illegal damping fails before any n-squared allocation is made. Non-convergence throws a named exception instead of returning the last iteration’s output, and the result reports the net similarity so the objective is stated rather than implied. The class generates no special members of its own and owns nothing but standard containers.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n^2) time per iteration with three flat n-by-n buffers and one column vector, instead of four nested ones.',
      },
      'make-it-fast': {
        code: `// Affinity propagation - Eigen row-major float arrays, OpenMP across rows.
//
// S is expected already prepared: the preference on its diagonal and a tiny
// relative jitter applied (see the previous stage).
#include <Eigen/Dense>

#include <algorithm>
#include <cstddef>
#include <limits>
#include <stdexcept>
#include <vector>

using ArrayRM = Eigen::Array<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;
using RowArray = Eigen::Array<float, 1, Eigen::Dynamic>;

struct Clustering {
  std::vector<Eigen::Index> exemplars;
  std::vector<Eigen::Index> labels;
  int iterations = 0;
};

namespace {

constexpr float kNegInf = -std::numeric_limits<float>::infinity();

// One damped sweep of both messages, in place.
void Sweep(const ArrayRM& S, ArrayRM& R, ArrayRM& A, RowArray& column, float damping) {
  const Eigen::Index n = S.rows();
  const float keep = damping;
  const float take = 1.0f - damping;

  // Rows are independent: each finds its own best and second-best rival.
#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    float first = kNegInf;
    float second = kNegInf;
    Eigen::Index first_index = 0;
    for (Eigen::Index k = 0; k < n; ++k) {
      const float score = A(i, k) + S(i, k);
      if (score > first) {
        second = first;
        first = score;
        first_index = k;
      } else if (score > second) {
        second = score;
      }
    }

    const float old_winner = R(i, first_index);
    // One fused expression: no (S - first) temporary, no separate damping pass.
    R.row(i) = keep * R.row(i) + take * (S.row(i) - first);
    R(i, first_index) = keep * old_winner + take * (S(i, first_index) - second);
  }

  // Column sums of the clipped responsibilities, as a thread-private reduction.
  column.setZero();
  float* total = column.data();
#pragma omp parallel for reduction(+ : total[:n])
  for (Eigen::Index i = 0; i < n; ++i) {
    const float* row = R.data() + i * n;  // contiguous: the layout is row-major
    for (Eigen::Index k = 0; k < n; ++k) total[k] += std::max(0.0f, row[k]);
  }
  for (Eigen::Index k = 0; k < n; ++k) column(k) += R(k, k) - std::max(0.0f, R(k, k));

#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    const float old_diagonal = A(i, i);
    A.row(i) = keep * A.row(i) + take * (column - R.row(i).max(0.0f)).min(0.0f);
    A(i, i) = keep * old_diagonal + take * (column(i) - R(i, i));  // a(k,k): no clip at 0
  }
}

}  // namespace

Clustering AffinityPropagationFast(const ArrayRM& S, float damping, int max_iterations,
                                   int stable_for) {
  const Eigen::Index n = S.rows();
  if (n == 0 || S.cols() != n) throw std::invalid_argument("S must be square and non-empty");

  ArrayRM R = ArrayRM::Zero(n, n);
  ArrayRM A = ArrayRM::Zero(n, n);
  RowArray column = RowArray::Zero(n);

  std::vector<char> previous(static_cast<std::size_t>(n), 0);
  std::vector<char> current(static_cast<std::size_t>(n), 0);
  int unchanged = 0;
  int iteration = 0;

  for (; iteration < max_iterations; ++iteration) {
    Sweep(S, R, A, column, damping);

    bool any = false;
    for (Eigen::Index k = 0; k < n; ++k) {
      current[static_cast<std::size_t>(k)] = (A(k, k) + R(k, k)) > 0.0f;
      any = any || current[static_cast<std::size_t>(k)] != 0;
    }
    unchanged = (current == previous) ? unchanged + 1 : 0;
    previous = current;
    if (unchanged >= stable_for && any) break;
  }
  if (iteration == max_iterations) throw std::runtime_error("no stable exemplar set");

  Clustering result;
  result.iterations = iteration + 1;
  for (Eigen::Index k = 0; k < n; ++k) {
    if (previous[static_cast<std::size_t>(k)] != 0) result.exemplars.push_back(k);
  }

  result.labels.resize(static_cast<std::size_t>(n));
#pragma omp parallel for schedule(static)
  for (Eigen::Index i = 0; i < n; ++i) {
    Eigen::Index best = result.exemplars.front();
    for (const Eigen::Index k : result.exemplars) {
      if (S(i, k) > S(i, best)) best = k;
    }
    result.labels[static_cast<std::size_t>(i)] =
        previous[static_cast<std::size_t>(i)] != 0 ? i : best;
  }
  return result;
}`,
        rationale:
          'The two message updates are the entire cost, so they are rewritten as row-parallel sweeps over single-precision Eigen arrays. Each row of responsibilities depends only on its own row of A and S, so the rows go to different threads with no shared mutable state, and the damped update of a whole row is one fused Eigen expression instead of a temporary for S minus the maximum and another for the damping. The column sums that availability needs are the one cross-row dependency; they become a thread-private OpenMP reduction over contiguous rows, and the availability update is again one fused row expression. The diagonals — where responsibility is not clipped and availability is a plain sum — are patched explicitly, which is where this version is easiest to get wrong. The ceiling is unchanged: four dense float matrices.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Every row of the responsibility and availability updates is independent, and the column sums are a reduction with thread-private accumulators, so all three phases of a sweep partition cleanly across cores.',
            tradeoff: 'The column reduction gives every thread its own n-length accumulator, so memory grows with core count, and the algorithm is memory-bandwidth bound — past a few cores the extra threads mostly wait on the same bus.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The damped update of a row, R.row(i) = keep * R.row(i) + take * (S.row(i) - first), evaluates in a single pass, as does the clipped-and-damped availability row, with no intermediate arrays.',
            tradeoff: 'The fused expressions hide how many passes over the data they make, and the diagonal entries they get wrong must be patched by hand afterwards, so a mistake in the patch silently corrupts the exemplar decision.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'The matrices are row-major, so the dominant access — each thread scanning its own row for the best and second-best rival — is sequential, and the column accumulation reads each row contiguously too.',
            tradeoff: 'The availability update is naturally column-oriented, so the layout trades one direction for the other; it is paid for by the accumulate-by-rows reduction, which needs the extra per-thread accumulator.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n^2) time per iteration in single precision across cores with three n-by-n float arrays. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Affinity propagation - the message updates, transcribed literally.
//!
//! s[i][k] says how well k would serve as the exemplar for i. The diagonal
//! s[k][k] is the PREFERENCE, the only thing that decides how many clusters
//! emerge. r (responsibility, i -> k) and a (availability, k -> i) are the two
//! messages. Read literally, the max over rivals makes each responsibility
//! O(n) and a whole sweep O(n^3).

const NOISE_SCALE: f64 = 1e-12; // relative jitter that breaks exact ties

/// A minimal xorshift, so the from-scratch stage needs no crate.
struct XorShift(u64);

impl XorShift {
    fn next_unit(&mut self) -> f64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
}

/// Returns (labels, exemplars), or None when no exemplar emerged.
pub fn affinity_propagation(
    s: &[Vec<f64>],
    damping: f64,
    max_iterations: usize,
    stable_for: usize,
    seed: u64,
) -> Option<(Vec<usize>, Vec<usize>)> {
    let n = s.len();
    let mut rng = XorShift(seed | 1);

    // Exact ties leave the messages no way to break symmetry.
    let mut noisy = s.to_vec();
    for i in 0..n {
        for k in 0..n {
            noisy[i][k] += NOISE_SCALE * (s[i][k].abs() + 1.0) * rng.next_unit();
        }
    }

    let mut r = vec![vec![0.0; n]; n];
    let mut a = vec![vec![0.0; n]; n];

    let mut previous: Vec<usize> = Vec::new();
    let mut unchanged = 0;

    for _ in 0..max_iterations {
        // r(i,k) <- s(i,k) - max over k' != k of [ a(i,k') + s(i,k') ]
        for i in 0..n {
            for k in 0..n {
                let mut best_rival = f64::NEG_INFINITY;
                for rival in 0..n {
                    if rival != k {
                        best_rival = best_rival.max(a[i][rival] + noisy[i][rival]);
                    }
                }
                let fresh = noisy[i][k] - best_rival;
                r[i][k] = damping * r[i][k] + (1.0 - damping) * fresh;
            }
        }

        // a(i,k) <- min(0, r(k,k) + sum over i' not in {i,k} of max(0, r(i',k)))
        // a(k,k) <- sum over i' != k of max(0, r(i',k))
        for i in 0..n {
            for k in 0..n {
                let fresh = if i == k {
                    let mut total = 0.0;
                    for other in 0..n {
                        if other != k {
                            total += r[other][k].max(0.0);
                        }
                    }
                    total
                } else {
                    let mut support = r[k][k];
                    for other in 0..n {
                        if other != i && other != k {
                            support += r[other][k].max(0.0);
                        }
                    }
                    support.min(0.0)
                };
                a[i][k] = damping * a[i][k] + (1.0 - damping) * fresh;
            }
        }

        // k is an exemplar when a(k,k) + r(k,k) is positive. The decision,
        // not the message values, is what is watched for convergence.
        let mut exemplars = Vec::new();
        for k in 0..n {
            if a[k][k] + r[k][k] > 0.0 {
                exemplars.push(k);
            }
        }
        unchanged = if exemplars == previous { unchanged + 1 } else { 0 };
        previous = exemplars;
        if unchanged >= stable_for && !previous.is_empty() {
            break;
        }
    }

    if previous.is_empty() {
        return None;
    }

    let mut labels = vec![0; n];
    for i in 0..n {
        labels[i] = if previous.contains(&i) {
            i
        } else {
            let mut best = previous[0];
            for &k in &previous {
                if s[i][k] > s[i][best] {
                    best = k;
                }
            }
            best
        };
    }
    Some((labels, previous))
}

/// The objective: sum of s(i, c_i). Each exemplar's own diagonal entry is its
/// preference, so every extra cluster pays its price here.
pub fn net_similarity(s: &[Vec<f64>], labels: &[usize]) -> f64 {
    let mut total = 0.0;
    for i in 0..labels.len() {
        total += s[i][labels[i]];
    }
    total
}`,
        profile: 'O(n^3) time per iteration from the literal max over rivals and the nested availability sums, over nested Vecs with every index bounds-checked.',
      },
      'make-it-right': {
        code: `//! Affinity propagation - validated newtypes, typed errors, O(n^2) sweeps.

use std::fmt;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

const NOISE_SCALE: f64 = 1e-12;
const MIN_DAMPING: f64 = 0.5;

#[derive(Debug, PartialEq)]
pub enum ApError {
    Empty,
    NotSquare { len: usize },
    NotANumber { index: usize },
    Damping(f64),
    NotConverged { iterations: usize },
}

impl fmt::Display for ApError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "similarity table is empty"),
            Self::NotSquare { len } => write!(f, "{len} values do not form a square table"),
            Self::NotANumber { index } => {
                write!(f, "NaN at flat index {index}; use -inf to forbid a pairing")
            }
            Self::Damping(value) => write!(f, "damping {value} outside [{MIN_DAMPING}, 1)"),
            Self::NotConverged { iterations } => write!(
                f,
                "no stable exemplar set after {iterations} iterations - raise damping, \\
                 or check the preference against the similarity scale"
            ),
        }
    }
}

impl std::error::Error for ApError {}

/// Fraction of the old message kept. A newtype because it sits next to other
/// bare f64s, and a value outside [0.5, 1) is not a tuning miss but a failure.
#[derive(Debug, Clone, Copy)]
pub struct Damping(f64);

impl Damping {
    pub fn new(value: f64) -> Result<Self, ApError> {
        if (MIN_DAMPING..1.0).contains(&value) {
            Ok(Self(value))
        } else {
            Err(ApError::Damping(value))
        }
    }
}

/// Row-major n-by-n similarity with the preference on the diagonal.
pub struct Similarity {
    n: usize,
    values: Vec<f64>,
}

impl Similarity {
    /// Validates at the boundary and copies once; the caller's data is never
    /// mutated. With no preference given, the median off-diagonal value is used.
    pub fn new(values: &[f64], preference: Option<f64>) -> Result<Self, ApError> {
        if values.is_empty() {
            return Err(ApError::Empty);
        }
        let n = (values.len() as f64).sqrt().round() as usize;
        if n * n != values.len() {
            return Err(ApError::NotSquare { len: values.len() });
        }
        if let Some(index) = values.iter().position(|value| value.is_nan()) {
            return Err(ApError::NotANumber { index });
        }

        let mut owned = values.to_vec();
        let preference = preference.unwrap_or_else(|| median_off_diagonal(&owned, n));
        owned.iter_mut().step_by(n + 1).for_each(|diagonal| *diagonal = preference);
        Ok(Self { n, values: owned })
    }
}

fn median_off_diagonal(values: &[f64], n: usize) -> f64 {
    let mut off: Vec<f64> = values
        .iter()
        .enumerate()
        .filter(|(index, _)| index / n != index % n)
        .map(|(_, &value)| value)
        .collect();
    if off.is_empty() {
        return 0.0;
    }
    let middle = off.len() / 2;
    off.select_nth_unstable_by(middle, |a, b| a.total_cmp(b));
    off[middle]
}

pub struct Clustering {
    pub exemplars: Vec<usize>,
    pub labels: Vec<usize>,
    pub iterations: usize,
    pub net_similarity: f64,
}

/// Largest and second-largest of a row, with the position of the largest.
/// Keeping both turns the max over rivals into a lookup: O(n) per row, not O(n^2).
fn top_two(scores: impl Iterator<Item = f64>) -> (usize, f64, f64) {
    scores.enumerate().fold(
        (0, f64::NEG_INFINITY, f64::NEG_INFINITY),
        |(index, first, second), (position, score)| {
            if score > first {
                (position, score, first)
            } else if score > second {
                (index, first, score)
            } else {
                (index, first, second)
            }
        },
    )
}

fn update_responsibilities(s: &[f64], a: &[f64], r: &mut [f64], n: usize, keep: f64) {
    for ((s_row, a_row), r_row) in s
        .chunks_exact(n)
        .zip(a.chunks_exact(n))
        .zip(r.chunks_exact_mut(n))
    {
        let (best, first, second) = top_two(s_row.iter().zip(a_row).map(|(s, a)| s + a));
        for (k, (r_ik, &s_ik)) in r_row.iter_mut().zip(s_row).enumerate() {
            let rival = if k == best { second } else { first };
            *r_ik = keep * *r_ik + (1.0 - keep) * (s_ik - rival);
        }
    }
}

fn update_availabilities(r: &[f64], a: &mut [f64], n: usize, keep: f64) {
    let mut column = vec![0.0; n];
    for r_row in r.chunks_exact(n) {
        for (total, &r_ik) in column.iter_mut().zip(r_row) {
            *total += r_ik.max(0.0);
        }
    }
    // Self-responsibility enters unclipped.
    for (k, total) in column.iter_mut().enumerate() {
        let diagonal = r[k * n + k];
        *total += diagonal - diagonal.max(0.0);
    }

    for (i, (a_row, r_row)) in a.chunks_exact_mut(n).zip(r.chunks_exact(n)).enumerate() {
        for (k, (a_ik, &r_ik)) in a_row.iter_mut().zip(r_row).enumerate() {
            let fresh = if i == k {
                column[k] - r_ik
            } else {
                (column[k] - r_ik.max(0.0)).min(0.0)
            };
            *a_ik = keep * *a_ik + (1.0 - keep) * fresh;
        }
    }
}

pub fn fit(
    similarity: &Similarity,
    damping: Damping,
    max_iterations: usize,
    stable_for: usize,
    seed: u64,
) -> Result<Clustering, ApError> {
    let n = similarity.n;
    let keep = damping.0;

    let mut rng = StdRng::seed_from_u64(seed);
    let jittered: Vec<f64> = similarity
        .values
        .iter()
        .map(|&value| value + NOISE_SCALE * (value.abs() + 1.0) * rng.gen::<f64>())
        .collect();

    let mut r = vec![0.0; n * n];
    let mut a = vec![0.0; n * n];
    let mut previous: Vec<bool> = vec![false; n];
    let mut unchanged = 0;

    for iteration in 1..=max_iterations {
        update_responsibilities(&jittered, &a, &mut r, n, keep);
        update_availabilities(&r, &mut a, n, keep);

        let current: Vec<bool> = (0..n).map(|k| a[k * n + k] + r[k * n + k] > 0.0).collect();
        unchanged = if current == previous { unchanged + 1 } else { 0 };
        previous = current;

        if unchanged >= stable_for && previous.iter().any(|&flag| flag) {
            let exemplars: Vec<usize> = previous
                .iter()
                .enumerate()
                .filter_map(|(k, &flag)| flag.then_some(k))
                .collect();
            let labels: Vec<usize> = (0..n)
                .map(|i| {
                    if previous[i] {
                        i
                    } else {
                        let row = &similarity.values[i * n..(i + 1) * n];
                        *exemplars
                            .iter()
                            .max_by(|&&x, &&y| row[x].total_cmp(&row[y]))
                            .expect("exemplars is non-empty")
                    }
                })
                .collect();
            let net_similarity = labels
                .iter()
                .enumerate()
                .map(|(i, &label)| similarity.values[i * n + label])
                .sum();
            return Ok(Clustering { exemplars, labels, iterations: iteration, net_similarity });
        }
    }
    Err(ApError::NotConverged { iterations: max_iterations })
}`,
        rationale:
          'The O(n³) sweep becomes O(n²): a single fold keeps each row’s largest and second-largest score, so the max over rivals is a lookup, and the availability sums become one column accumulation with the unclipped diagonal handled separately. The nested Vecs become flat row-major buffers walked with chunks_exact, so the index arithmetic and the bounds checks mostly disappear into iterator chains. Validation moves to the constructor boundary — a Similarity cannot exist unless it is square and free of NaN, and a Damping cannot exist outside [0.5, 1) — so the algorithm itself never checks. The None that signalled failure becomes a typed Result, and non-convergence is a named error rather than the last iteration’s output.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n^2) time per iteration over flat buffers, with a fresh n-length column vector per sweep as the only allocation.',
      },
      'make-it-fast': {
        code: `//! Affinity propagation - rayon across rows, one allocation set, f32.

use rayon::prelude::*;

/// Rows folded per rayon task when accumulating column sums. Large enough to
/// amortize the per-task accumulator, small enough to balance across cores.
const BLOCK_ROWS: usize = 64;

/// Largest, its position, and second largest of (a + s) over one row.
#[inline]
fn top_two(s_row: &[f32], a_row: &[f32]) -> (usize, f32, f32) {
    let mut first = f32::NEG_INFINITY;
    let mut second = f32::NEG_INFINITY;
    let mut index = 0;
    for (position, (&s, &a)) in s_row.iter().zip(a_row).enumerate() {
        let score = s + a;
        if score > first {
            second = first;
            first = score;
            index = position;
        } else if score > second {
            second = score;
        }
    }
    (index, first, second)
}

/// One damped sweep of both messages, in place over caller-owned buffers.
/// s, r and a are row-major n-by-n; column is an n-length scratch row.
pub fn sweep(s: &[f32], r: &mut [f32], a: &mut [f32], column: &mut [f32], n: usize, keep: f32) {
    let take = 1.0 - keep;

    // Each row depends only on its own row of s and a: embarrassingly parallel.
    r.par_chunks_exact_mut(n)
        .zip(s.par_chunks_exact(n))
        .zip(a.par_chunks_exact(n))
        .for_each(|((r_row, s_row), a_row)| {
            let (best, first, second) = top_two(s_row, a_row);
            for (k, (r_ik, &s_ik)) in r_row.iter_mut().zip(s_row).enumerate() {
                let rival = if k == best { second } else { first };
                *r_ik = keep * *r_ik + take * (s_ik - rival);
            }
        });

    // Column sums of the clipped responsibilities: per-block partial sums,
    // then one reduction, so no thread ever writes to a shared accumulator.
    let totals = r
        .par_chunks(n * BLOCK_ROWS)
        .map(|block| {
            let mut partial = vec![0.0_f32; n];
            for r_row in block.chunks_exact(n) {
                for (total, &r_ik) in partial.iter_mut().zip(r_row) {
                    *total += r_ik.max(0.0);
                }
            }
            partial
        })
        .reduce(
            || vec![0.0_f32; n],
            |mut left, right| {
                left.iter_mut().zip(&right).for_each(|(l, r)| *l += r);
                left
            },
        );
    for (k, (total, slot)) in totals.iter().zip(column.iter_mut()).enumerate() {
        let diagonal = r[k * n + k];
        *slot = total + diagonal - diagonal.max(0.0); // self-responsibility: unclipped
    }

    let column = &*column;
    a.par_chunks_exact_mut(n)
        .zip(r.par_chunks_exact(n))
        .enumerate()
        .for_each(|(i, (a_row, r_row))| {
            for (k, (a_ik, &r_ik)) in a_row.iter_mut().zip(r_row).enumerate() {
                let fresh = if i == k {
                    column[k] - r_ik
                } else {
                    (column[k] - r_ik.max(0.0)).min(0.0)
                };
                *a_ik = keep * *a_ik + take * fresh;
            }
        });
}

/// Runs sweeps until the exemplar set is stable. The buffers are allocated
/// once, up front, and every sweep reuses them.
pub fn fit(s: &[f32], n: usize, damping: f32, max_iterations: usize, stable_for: usize) -> Option<Vec<usize>> {
    let mut r = vec![0.0_f32; n * n];
    let mut a = vec![0.0_f32; n * n];
    let mut column = vec![0.0_f32; n];
    let mut previous = vec![false; n];
    let mut unchanged = 0;

    for _ in 0..max_iterations {
        sweep(s, &mut r, &mut a, &mut column, n, damping);

        let current: Vec<bool> = (0..n).map(|k| a[k * n + k] + r[k * n + k] > 0.0).collect();
        unchanged = if current == previous { unchanged + 1 } else { 0 };
        previous = current;

        if unchanged >= stable_for && previous.iter().any(|&flag| flag) {
            return Some(
                previous
                    .iter()
                    .enumerate()
                    .filter_map(|(k, &flag)| flag.then_some(k))
                    .collect(),
            );
        }
    }
    None
}`,
        rationale:
          'The sweep is rewritten so each of its three phases fans out across cores, over contiguous slices rather than nested Vecs. The responsibility update is independent per row, so rows go to rayon workers directly. The column sums that availability needs are the one cross-row dependency, and they are computed as per-block partial sums followed by a single reduction — no worker writes to shared state. The availability update is then independent per row again. The buffers are allocated once in fit and handed to every sweep, the per-row top-two scan is a small inlined function the compiler can keep in registers, and everything is single precision. The ceiling has not moved: three dense matrices, and the transposed access pattern of the column phase is still the awkward part.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'The responsibility and availability updates are independent per row, and the column sums are a map-reduce over row blocks, so each phase partitions across cores with no shared mutable state.',
            tradeoff: 'The reduction allocates one n-length partial vector per block, so memory grows with the number of tasks, and the algorithm is memory-bandwidth bound — adding threads past that point buys little.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Everything is a flat row-major slice walked with chunks_exact, so each worker streams its own row sequentially and the column accumulation reads each row in order rather than striding down a column.',
            tradeoff: 'The availability phase is column-oriented in the math and row-oriented in the code, so it must be reorganized into the block-and-reduce form, which is harder to read and harder to modify than the transposed loop it replaces.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'top_two runs once per row per sweep and is small, so inlining it into the parallel closure lets the compiler keep the running maximum and runner-up in registers instead of returning through a call.',
            tradeoff: 'It is a hint, not a guarantee, and the benefit is within noise unless profiled; it also grows the closure, which can push the hot loop out of the instruction cache for large bodies.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n^2) time per iteration in single precision across cores, with three n-by-n f32 buffers allocated once. Illustrative, not a measured benchmark.',
      },
    },
  },
};
