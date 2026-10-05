import type { AiMlModel } from '../../types';

/**
 * Content-Based Filtering — recommendation by what an item IS, not by who else
 * touched it.
 *
 * This is the canonical place in the section to argue the similarity-metric
 * choice, because here the metric is visible in a way it is not elsewhere: the
 * item representation (TF-IDF weights, a binary tag set, a dense embedding)
 * decides which similarity is correct, and swapping the metric without swapping
 * the representation is the commonest way to ship a recommender that quietly
 * ranks by document length or by catalogue popularity. The code progression
 * follows the same thread: item vectors are normalised ONCE, offline, so that
 * online scoring is a single sparse dot product and the cosine denominators
 * never appear on the hot path.
 */
export const CONTENT_BASED_FILTERING: AiMlModel = {
  slug: 'content-based-filtering',
  name: 'Content-Based Filtering',
  aliases: ['Content filtering', 'Content-based recommendation', 'Rocchio'],
  category: 'classical-ml',
  group: 'instance-and-kernel',
  kind: 'model',

  paradigms: ['supervised', 'unsupervised'],
  taskTypes: ['ranking', 'classification'],
  paradigmNote:
    'Two halves with different supervision. Building the item vectors (TF-IDF, tag one-hot) uses no labels at all; building the user profile uses the user’s own feedback as the label. It is also a one-class-versus-rest classifier in disguise — the profile is a linear scorer for "will this user like it" — which is why classification is listed beside ranking, although the output that matters is always an ordered list.',

  intuition:
    'Describe every item as a vector of its own properties — the words in an article, the tags on a film, an embedding of a product photo — then describe a user as the average of the items they liked. To recommend, find the unseen items whose vector points the same way as the user’s. Nothing here looks at what other people did, which is its defining strength (a brand-new item can be recommended the moment it is described) and its defining weakness (it can only ever recommend more of what the user already showed they like). The method is a chain of three representation decisions — how items become vectors, how likes become a profile, how similarity becomes a score — and the third is where most implementations are quietly wrong. Cosine is right for TF-IDF because it divides out document length; Jaccard is right for binary tag sets because it penalises size imbalance; a raw dot product is right only when vector magnitude is meant to carry popularity or confidence. Choosing among them is a claim about the data, not a tuning knob.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathbf{u}^{\\star} = \\operatorname*{arg\\,min}_{\\mathbf{u}} \\sum_{i \\in L} w_i \\, \\lVert \\mathbf{u} - \\mathbf{x}_i \\rVert_2^2 = \\frac{\\sum_{i \\in L} w_i \\, \\mathbf{x}_i}{\\sum_{i \\in L} w_i}',
      symbols: [
        { symbol: '\\mathbf{u}', meaning: 'the user profile, a point in the same space as the item vectors' },
        { symbol: 'L', meaning: 'the set of items the user liked, or engaged with positively' },
        { symbol: '\\mathbf{x}_i', meaning: 'the content vector of item i — TF-IDF weights, a one-hot tag vector, or an embedding' },
        { symbol: 'w_i', meaning: 'the weight of that signal: a mean-centred rating, an implicit-feedback strength, or an exponential time decay' },
      ],
    },
    reading:
      'Choosing the profile is a least-squares problem with a closed-form answer: the point that minimizes the weighted squared distance to everything the user liked is the weighted mean of those items — the centroid, which is exactly what Rocchio’s relevance-feedback update computes. This is the one place the model is "trained", and it is trained per user, in one pass, with no iteration. The ranking step then scores unseen items by cosine similarity to that centroid, and the two pieces are consistent for a reason worth knowing: for unit-length vectors, squared Euclidean distance equals two minus two times the cosine, so minimizing squared distance to the liked items and maximizing total cosine to them select the same profile direction. If the profile weights are instead learned — a logistic or pairwise ranking loss over liked and not-liked items — the model becomes a linear classifier over content features, and the centroid is only the initialisation.',
  },

  optimization: {
    method: 'Closed-form centroid (Rocchio) per user, then a similarity-ranked scan — no iterative fit',
    updateRule: {
      formula:
        '\\mathbf{u} = \\alpha \\, \\mathbf{u}_0 + \\beta \\, \\frac{1}{|L|} \\sum_{i \\in L} \\mathbf{x}_i - \\gamma \\, \\frac{1}{|D|} \\sum_{i \\in D} \\mathbf{x}_i, \\qquad s(\\mathbf{u}, j) = \\frac{\\mathbf{u}^{\\top} \\mathbf{x}_j}{\\lVert \\mathbf{u} \\rVert \\, \\lVert \\mathbf{x}_j \\rVert}, \\qquad \\lVert \\mathbf{a} - \\mathbf{b} \\rVert_2^2 = 2 - 2\\cos(\\mathbf{a}, \\mathbf{b}) \\text{ for unit } \\mathbf{a}, \\mathbf{b}',
      symbols: [
        { symbol: '\\mathbf{u}_0', meaning: 'the previous profile or the initial query; alpha controls how much of it survives an update' },
        { symbol: '\\alpha, \\beta, \\gamma', meaning: 'Rocchio weights on the old profile, the liked centroid, and the disliked centroid; classic IR defaults are around 1, 0.75, and 0.15' },
        { symbol: 'D', meaning: 'the items the user explicitly rejected; the negative term pushes the profile away from them' },
        { symbol: 's(\\mathbf{u}, j)', meaning: 'the relevance score of candidate item j — cosine similarity between profile and item' },
        { symbol: '\\cos(\\mathbf{a}, \\mathbf{b})', meaning: 'the identity that makes cosine and Euclidean rank-equivalent once both vectors are L2-normalised' },
      ],
    },
    rationale:
      'There is nothing to iterate, so the engineering questions are all about the similarity function, and it is the part of this entry worth reading slowly. Cosine on TF-IDF: the dot product divided by both norms removes vector length, so a 5,000-word article does not outrank a 300-word one merely for containing more terms. A raw dot product on the same vectors ranks by document length; Euclidean distance on them ranks short documents as near everything and long documents as far from everything, neither of which has anything to do with topic. Jaccard on binary tag sets: intersection over union, which penalises size imbalance — a film with 40 tags overlapping 4 of a user’s 5 tags scores low, as it should, whereas a plain overlap count (the dot product on binary vectors) would crown the most heavily tagged item for every user. Cosine on binary vectors sits between the two, dividing by the geometric mean of the set sizes rather than the union. Dot product, deliberately: when embeddings are trained so that norm encodes popularity or confidence — as in two-tower retrieval — the magnitude is signal, and normalising it away throws it out; the price is that popular items dominate unless that is the intent. The identity ‖a−b‖² = 2 − 2cos(a,b) holds for unit vectors, so once items and profile are L2-normalised, cosine, inner product, and Euclidean distance all produce the same ranking and the choice collapses to which one your index supports. Everything else — Rocchio weights, time decay, MMR re-ranking — tunes the profile, while the metric decides what "alike" means.',
    hyperparameters: [
      { name: 'item representation', role: 'The real model. TF-IDF for text, multi-hot for tags and categories, a pretrained embedding for images, audio, or short text; and the similarity must match it' },
      { name: 'similarity function', role: 'Cosine for TF-IDF and dense embeddings, Jaccard for binary sets, dot product only when magnitude is intentional signal. Swapping it without changing the representation changes what is recommended' },
      { name: 'Rocchio weights (alpha, beta, gamma)', role: 'How much the previous profile, the liked centroid, and the disliked centroid contribute. A large gamma reacts fast to a rejection and risks over-correcting on a single dislike', typicalRange: 'alpha 1, beta 0.75, gamma 0.15 as the classical IR starting point' },
      { name: 'feedback weighting', role: 'Mean-centre ratings so that a below-average rating becomes a negative weight, or use implicit-feedback strengths. Unweighted means treat a skim and a binge identically' },
      { name: 'time-decay half-life', role: 'Recency weighting on liked items so the profile tracks drifting taste rather than the whole history equally', typicalRange: '30 to 180 days, domain-dependent' },
      { name: 'TF-IDF variant', role: 'Sublinear tf (1 + log count), smoothed idf, and stop-word handling. Smoothing stops a rare term from getting an unbounded weight on one document' },
      { name: 'diversity re-rank (MMR lambda)', role: 'Trades relevance against redundancy among the returned items; the direct countermeasure to over-specialisation', typicalRange: '0.5 to 0.9' },
    ],
    convergence:
      'No iteration, so no convergence — the centroid is exact and the score is a deterministic scan. What replaces a convergence guarantee is a list of structural failure modes, which are the actual content. Over-specialisation: the objective rewards similarity to what the user already liked and nothing rewards novelty, so recommendations contract into a filter bubble and the profile becomes a self-confirming loop. The single-centroid problem: a user who likes both jazz and cooking gets a profile midway between the two, which resembles neither; the fix is several centroids per user or a max over liked items, at which point this is k-nearest neighbours again. Feature ceiling: it can recommend only along properties it can see, so quality is bounded by how well the item vectors capture what makes a user like something — taste in prose style, say, or in "vibe", is not in a bag of words. And the cold-start asymmetry is real but one-sided: a new item is recommendable immediately, while a new user with no history has no profile and no recommendations.',
    complexity:
      'Item vectors: O(nnz) to build TF-IDF over the catalogue, once. Profile: O(nnz of the liked items) per user. Scoring the full catalogue: one sparse matrix-vector product, O(nnz of the catalogue); for large catalogues use an approximate inner-product index so scoring is sublinear. Memory: the sparse item matrix plus one dense or sparse profile per user. For text, vocabulary size drives dimension — often 10^5 to 10^6 — which is why sparse storage is not optional.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'It ranks a catalogue of items against a profile; it predicts nothing about future values of a series and has no notion of temporal dynamics. Time appears only as a decay weight on past feedback, which is recency weighting rather than forecasting.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Low maximum similarity to a user’s history or to a reference set can be read as a novelty signal, but that is nearest-neighbour novelty detection under another name, and k-nearest neighbours covers it properly. The model’s own purpose, ordering items by relevance, is not an outlier decision, so no honest fit is claimed here.',
      },
      optimization: {
        fit: 'not-applicable',
        why: 'The centroid is a closed-form least-squares answer and the ranking is a sort; there is no constrained decision problem, no search over a feasible set, and nothing to optimize beyond scoring. A diversity-aware re-rank (MMR) is a greedy selection heuristic layered on top, not a use of the model as an optimizer.',
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Each item is described by its own content — text, tags, metadata, or an embedding — and each user by the weighted mean of the items they engaged with. Candidates are scored by similarity to the profile, filtered for already-seen items, and the top k are returned. Used alone it is a complete recommender; used as one retrieval source it supplies exactly the items a collaborative model cannot, namely ones nobody has interacted with yet.',
        where: [
          'News and article feeds, where an item is stale before enough interactions accumulate to learn it collaboratively',
          'Job, real-estate, and marketplace listings, where each listing is new, short-lived, and richly described',
          'Cold-start items in a hybrid system — a content score takes over until interaction data exists, then hands over to the collaborative signal',
          'Related-item shelves ("more like this"), which need no user profile at all — the item vector is the query',
        ],
        why: 'It is the right first model when items are new faster than interactions arrive, when metadata is rich, and when an explanation is required — "because it shares these properties with what you liked" is the model’s real mechanism. It is the wrong sole model when taste is not captured by content features, when interaction data is plentiful (collaborative methods then find structure no feature set encodes), or when serendipity matters, because the objective rewards similarity to the known and nothing rewards the surprising. In practice it is a candidate generator and a cold-start fallback inside a hybrid, not the whole system.',
        featurization: [
          'Cosine similarity on TF-IDF for text: length normalisation keeps long descriptions from dominating, which a raw dot product or Euclidean distance would not',
          'Jaccard on binary tag or category sets: intersection over union penalises size imbalance, so a heavily tagged item is not preferred for overlapping a few tags',
          'Dot product only for embeddings trained so norm means popularity or confidence; otherwise L2-normalise so dot product, cosine, and Euclidean give the same ranking',
          'Weight liked items by mean-centred rating or implicit strength, with exponential time decay, and subtract a down-weighted centroid of rejected items',
          'Several profile centroids per user (clustered likes) for users with distinct interests, rather than one blurred average',
        ],
        evaluation:
          'Recall@k and NDCG@k on a temporal split with the profile built only from interactions before the cut. Report intra-list diversity, catalogue coverage, and novelty beside accuracy, since a content model can post excellent recall by recommending near-duplicates of what the user already has. Cold-item recall is the number that justifies the model: score it separately on items with zero interactions.',
        pitfalls: [
          'Filter bubble: recommending only near-neighbours of past likes, with no exploration, shrinks the user’s exposure over time and starves the feedback that would correct the profile',
          'Metric-representation mismatch — Euclidean distance on raw TF-IDF, or a dot product on unnormalised vectors — silently ranks by document length',
          'A single blended centroid for a multi-interest user, which ranks items resembling none of their interests highest',
          'Recommending items the user already has: seen items are always the most similar to the profile and must be masked explicitly',
          'Refitting TF-IDF as the catalogue grows, which changes every stored vector; the idf statistics are part of the model and need versioning',
        ],
      },
      'natural-language': {
        fit: 'viable',
        how: 'Documents become TF-IDF or sentence-embedding vectors; a query, a reading history, or a set of relevant documents becomes a profile; ranking is cosine similarity. This is the original home of the method: Rocchio’s 1971 relevance-feedback update for the SMART retrieval system moves a query vector toward documents a searcher marked relevant and away from those marked irrelevant.',
        where: [
          'Related-article and "more like this" retrieval over documents and knowledge bases',
          'Relevance feedback in search: refining a query from a few judged results',
          'Near-duplicate and plagiarism screening by thresholding cosine similarity between document vectors',
          'Matching résumés to job descriptions, or support tickets to knowledge-base articles, as a transparent baseline before a learned ranker',
        ],
        why: 'For short-horizon, keyword-anchored matching it is hard to beat for cost and transparency: no training, deterministic, inspectable term by term. It loses wherever meaning differs from vocabulary — synonyms, paraphrase, and negation are invisible to a bag of words, which is what dense embeddings (a word2vec-style model, or a modern sentence encoder) repair at the cost of interpretability. The usual upgrade is not to abandon the method but to swap the item representation and keep the profile-and-cosine machinery unchanged.',
        featurization: [
          'Lowercase, strip stop words, and apply sublinear tf with a smoothed idf; consider bigrams for phrases like "machine learning"',
          'L2-normalise every document vector so cosine and inner-product search are identical and length drops out',
          'Where vocabulary mismatch dominates, replace TF-IDF with a dense embedding and keep cosine as the similarity',
        ],
        evaluation:
          'Mean average precision and NDCG against human relevance judgements, plus a vocabulary-mismatch slice (queries whose relevant documents share few terms with them) to expose where bag-of-words fails.',
        pitfalls: [
          'Vocabulary mismatch: a relevant document using different words scores near zero, with no warning',
          'Idf computed on a corpus unlike the serving corpus, which mis-weights domain terms',
          'Stop-word and stemming choices baked into the index; changing them later invalidates every stored vector',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Effectively nothing: TF-IDF statistics are one pass over the catalogue, and a profile is a weighted sum computed per user on demand or on each feedback event. An embedding-based variant pays for the encoder once, offline. There is no training run to schedule.',
    inferenceProfile:
      'One sparse matrix-vector product per user, or an approximate inner-product search over L2-normalised item vectors, which is why item vectors are normalised at index time so that online scoring needs no norm computation. Latency scales with catalogue nonzeros for an exact scan and is sublinear with an ANN index. Per-user profiles are small enough to cache and update incrementally on each interaction.',
    retrainingCadence:
      'Item vectors are recomputed when new items arrive, which is incremental for TF-IDF only if the idf statistics are frozen between periodic full rebuilds. Profiles update on every feedback event. If the representation changes (a new embedding model, a new vocabulary), every stored item vector and every profile must be invalidated and rebuilt together, because mixing vector spaces gives meaningless similarities.',
    driftAndMonitoring: [
      'Track intra-list diversity and catalogue coverage over time — a falling trend is the filter bubble forming, visible long before engagement metrics move',
      'Monitor the share of recommendations drawn from the user’s own history neighbourhood against explore slots',
      'Watch the idf and vocabulary statistics as versioned artefacts; a vocabulary shift silently re-scales every similarity',
      'Compare cold-item click-through to warm-item click-through to confirm the content signal is earning its place beside a collaborative model',
      'Alert on profiles whose norm collapses toward zero, which means feedback weights cancelled out and the user has effectively no profile',
    ],
    productionGotchas: [
      'Mask already-seen and already-purchased items before ranking; they are the highest-scoring candidates and the least useful',
      'A new user has no profile at all — decide the fallback (popularity, onboarding picks) explicitly instead of returning an empty or random list',
      'Normalise item vectors at index time and persist the idf table with them; recomputing either at query time is the commonest latency bug',
      'Do not mix similarity functions between indexing and serving — an index built for inner product on normalised vectors queried with raw Euclidean distance returns a different ordering',
      'Explanations are cheap and tempting: the top contributing terms to the dot product are the real reason, so surface those instead of a post-hoc story',
    ],
  },

  assumptions: [
    'A user’s future preferences resemble the properties of items they liked before — the smoothness assumption, and the one that produces filter bubbles when it holds too strongly',
    'Item content features capture what drives preference; taste not expressed in the features is invisible to the model',
    'The chosen similarity matches the representation: cosine for TF-IDF and embeddings, Jaccard for sets, dot product only if magnitude is meaningful',
    'A single profile vector adequately summarises the user, which fails for people with several unrelated interests',
    'Past feedback is a fair proxy for current taste, so stale interactions need decay rather than equal weight',
  ],

  pros: [
    {
      point: 'New items are recommendable the instant they are described',
      context:
        'Decisive for news, listings, and any catalogue that turns over faster than interactions accumulate; collaborative filtering cannot score an item nobody has touched. Worth little where the catalogue is stable and interaction data is plentiful, where a collaborative signal is strictly richer.',
    },
    {
      point: 'No dependence on other users',
      context:
        'It works for a single user in isolation, resists popularity bias and shilling attacks, and needs no cross-user data, which is a privacy advantage. The cost is that it cannot learn from the crowd, so it never discovers that fans of A also like B when A and B share no features.',
    },
    {
      point: 'Transparent and explainable by construction',
      context:
        'The score decomposes into per-term or per-tag contributions, so "recommended because it shares these properties with items you liked" is the actual mechanism. Valuable in regulated or review-heavy settings; less so where the features themselves are an opaque embedding.',
    },
    {
      point: 'Closed-form, cheap, and incrementally updatable',
      context:
        'A profile is a weighted mean that updates in one vector operation per feedback event, so there is nothing to retrain or schedule. It is the right baseline to beat before introducing a learned ranker, and often the baseline that survives.',
    },
  ],

  cons: [
    {
      point: 'Over-specialisation and the filter bubble',
      context:
        'The objective rewards similarity to past likes and nothing rewards novelty, so recommendations narrow over time and the feedback needed to correct the profile dries up. Mitigated by MMR diversity re-ranking and explicit exploration slots, never by tuning the similarity.',
    },
    {
      point: 'Bounded by the quality of the item features',
      context:
        'It can only recommend along dimensions it can see. If preference depends on style, quality, or social signals absent from the content, accuracy plateaus no matter how the profile is weighted, and a collaborative model will beat it once interaction data exists.',
    },
    {
      point: 'New users have no profile',
      context:
        'The cold-start advantage is one-sided: a new item is fine, a new user is not. A hybrid with an onboarding step or a popularity fallback is required, so the model cannot be the whole system for acquisition-heavy products.',
    },
    {
      point: 'A single centroid blurs multi-interest users',
      context:
        'Averaging likes from unrelated interests produces a profile resembling neither. The fix — several centroids, or scoring against each liked item and taking the max — moves the model toward k-nearest neighbours and costs more per query.',
    },
  ],

  relatedSlugs: [
    'k-nearest-neighbours',
    'matrix-factorization',
    'two-tower-retrieval',
    'word2vec',
    'ann-index',
    'association-rules',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Content-based filtering - the item vectors, the profile, and the score, transcribed.

There is no fit step in the neural sense. Item vectors are TF-IDF weights, the
user profile is the weighted mean of the liked items (the centroid), and the
score is the cosine between the profile and every unseen item.
"""

import math


def tokenize(text):
    return text.lower().split()


def tfidf_vectors(documents):
    """One dict per document mapping term -> (1 + log tf) * idf."""
    n_docs = len(documents)
    token_lists = [tokenize(document) for document in documents]

    document_frequency = {}
    for tokens in token_lists:
        for term in set(tokens):
            document_frequency[term] = document_frequency.get(term, 0) + 1

    vectors = []
    for tokens in token_lists:
        counts = {}
        for term in tokens:
            counts[term] = counts.get(term, 0) + 1

        vector = {}
        for term, count in counts.items():
            idf = math.log((1 + n_docs) / (1 + document_frequency[term])) + 1.0
            vector[term] = (1.0 + math.log(count)) * idf
        vectors.append(vector)
    return vectors


def build_profile(vectors, liked_items, weights):
    """Weighted mean of the liked item vectors - the closed-form minimizer."""
    profile = {}
    total_weight = 0.0
    for position in range(len(liked_items)):
        weight = weights[position]
        total_weight += weight
        for term, value in vectors[liked_items[position]].items():
            profile[term] = profile.get(term, 0.0) + weight * value

    if total_weight == 0.0:
        raise ValueError("liked items carry no weight")
    for term in profile:
        profile[term] = profile[term] / total_weight
    return profile


def norm(vector):
    total = 0.0
    for value in vector.values():
        total += value * value
    return math.sqrt(total)


def cosine(profile, item):
    dot = 0.0
    for term, value in item.items():
        if term in profile:
            dot += profile[term] * value

    denominator = norm(profile) * norm(item)
    if denominator == 0.0:
        return 0.0
    return dot / denominator


def recommend(vectors, liked_items, weights, k=5):
    profile = build_profile(vectors, liked_items, weights)

    scored = []
    for item in range(len(vectors)):
        if item in liked_items:
            continue
        scored.append((cosine(profile, vectors[item]), item))

    # Full sort of every candidate to keep k of them - correct, and wasteful.
    scored.sort(reverse=True)
    return scored[:k]`,
        profile:
          'O(nnz) to vectorize, then per user: O(nnz of liked items) for the profile plus O(nnz of the catalogue) to score, with both norms recomputed for every pair, in interpreter loops.',
      },
      'make-it-right': {
        code: `"""Content-based filtering - typed, validated, sparse, rows normalised once."""

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy import sparse


class ColdStartError(ValueError):
    """Raised when a user has no usable feedback, so no profile exists."""


@dataclass(frozen=True)
class ItemIndex:
    """The catalogue as a sparse matrix whose rows are unit vectors.

    Rows are L2-normalised once, here, because cosine similarity is then a
    plain dot product - length drops out of the ranking and the per-item
    denominator never has to be recomputed at query time.
    """

    matrix: sparse.csr_matrix      # (n_items, n_terms), rows have norm 1
    item_ids: tuple[str, ...]


def build_index(counts: sparse.csr_matrix, item_ids: Sequence[str]) -> ItemIndex:
    """TF-IDF with sublinear tf and smoothed idf, then L2 row normalisation."""
    n_items, n_terms = counts.shape
    if n_items != len(item_ids):
        raise ValueError(f"{n_items} rows but {len(item_ids)} item ids")
    if n_items == 0:
        raise ValueError("the catalogue is empty")

    counts = counts.tocsr().astype(np.float64)
    counts.sum_duplicates()

    document_frequency = np.bincount(counts.indices, minlength=n_terms)
    idf = np.log((1.0 + n_items) / (1.0 + document_frequency)) + 1.0

    counts.data = 1.0 + np.log(counts.data)               # sublinear tf
    weighted = sparse.csr_matrix(counts @ sparse.diags(idf))

    norms = np.sqrt(np.asarray(weighted.multiply(weighted).sum(axis=1)).ravel())
    norms[norms == 0.0] = 1.0                              # empty documents stay zero
    normalised = sparse.csr_matrix(sparse.diags(1.0 / norms) @ weighted)
    return ItemIndex(matrix=normalised, item_ids=tuple(item_ids))


def build_profile(
    index: ItemIndex,
    liked_rows: NDArray[np.int64],
    ratings: NDArray[np.float64],
    neutral_rating: float,
) -> NDArray[np.float64]:
    """Mean-centred weighted centroid, returned as a unit vector.

    A rating below neutral_rating gets a negative weight, so a dislike pushes
    the profile away from an item instead of being ignored (Rocchio's gamma).
    """
    if liked_rows.size == 0:
        raise ColdStartError("no interactions to build a profile from")
    if liked_rows.shape != ratings.shape:
        raise ValueError("liked_rows and ratings must align")

    weights = ratings - neutral_rating
    profile = np.asarray(index.matrix[liked_rows].T @ weights).ravel()

    length = np.linalg.norm(profile)
    if length == 0.0:
        raise ColdStartError("feedback weights cancel out; profile has no direction")
    return profile / length


def recommend(
    index: ItemIndex,
    profile: NDArray[np.float64],
    seen_rows: NDArray[np.int64],
    k: int,
) -> list[tuple[str, float]]:
    """Top-k unseen items by cosine, which is a dot product on unit rows."""
    n_items = index.matrix.shape[0]
    if not 1 <= k <= n_items:
        raise ValueError(f"k must lie in [1, {n_items}], got {k}")

    scores = index.matrix @ profile                       # one sparse mat-vec
    scores[seen_rows] = -np.inf                           # never re-recommend

    # argpartition is O(n) selection; only the k survivors are then ordered.
    top = np.argpartition(scores, n_items - k)[n_items - k:]
    top = top[np.argsort(scores[top])[::-1]]
    return [(index.item_ids[row], float(scores[row])) for row in top]`,
        rationale:
          'Three changes beyond moving to sparse arrays. Item vectors are L2-normalised once, at index time, so cosine collapses to a dot product and the per-pair norm computation the previous stage repeated for every item disappears. The full sort becomes argpartition — selecting k of n is a linear-time problem and ordering all of them was the algorithmic mistake. And the profile now takes mean-centred ratings, so a below-neutral rating is a negative weight and a dislike repels instead of being silently dropped. Structurally, the cold-start case is a typed exception rather than a division by zero, the seen-item mask is explicit, and malformed shapes fail at the boundary.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy / SciPy sparse',
        profile:
          'O(nnz) one-time indexing; per user O(nnz of liked rows) for the profile, O(nnz of catalogue) for one sparse mat-vec, and O(n) selection instead of O(n log n) sorting.',
      },
      'make-it-fast': {
        code: `"""Content-based filtering - batched users, one sparse product, float32."""

import numpy as np
from numpy.typing import NDArray
from scipy import sparse


class BatchRecommender:
    """Scores a block of users against the catalogue with sparse products.

    Items are unit rows (cosine == dot product). User profiles do not need
    normalising either: dividing a user's scores by a constant leaves their
    ranking untouched, so that norm is never computed on the hot path.
    """

    def __init__(self, unit_items: sparse.csr_matrix, k: int = 10) -> None:
        if not 1 <= k <= unit_items.shape[0]:
            raise ValueError(f"k must lie in [1, {unit_items.shape[0]}], got {k}")
        # One dtype, contiguous CSR: scipy hands the buffers to BLAS-style kernels
        # without an internal conversion, and float32 halves memory traffic.
        self._items = unit_items.astype(np.float32).tocsr()
        self._items_t = self._items.T.tocsr()          # (n_terms, n_items), built once
        self._k = k

    def recommend(
        self,
        feedback: sparse.csr_matrix,     # (n_users, n_items) mean-centred weights
        chunk: int = 2048,
    ) -> NDArray[np.int64]:
        """Top-k item rows for every user, best first."""
        n_users = feedback.shape[0]
        n_items = self._items.shape[0]
        k = self._k

        out = np.empty((n_users, k), dtype=np.int64)          # allocated once

        # Chunking bounds the dense score block at (chunk, n_items) rather than
        # (n_users, n_items), which is what makes a million-user batch possible.
        for start in range(0, n_users, chunk):
            stop = min(start + chunk, n_users)
            weights = feedback[start:stop]

            # Profiles for the whole block in one sparse-sparse product, then
            # scores in a second: (chunk, items) @ (items, terms) @ (terms, items).
            profiles = weights @ self._items
            scores = (profiles @ self._items_t).toarray()

            # Mask seen items in place using the feedback sparsity pattern.
            rows, columns = weights.nonzero()
            scores[rows, columns] = -np.inf

            partitioned = np.argpartition(scores, n_items - k, axis=1)[:, n_items - k:]
            chosen = np.take_along_axis(scores, partitioned, axis=1)
            order = np.argsort(-chosen, axis=1)               # sorts k, not n
            out[start:stop] = np.take_along_axis(partitioned, order, axis=1)

        return out`,
        rationale:
          'The loop over users becomes two sparse products per chunk: weights times the item matrix yields every profile in the block at once, and profiles times the transposed item matrix yields every score. That replaces one Python-level mat-vec per user with a handful of calls per few thousand users, and the transpose is built once rather than per query. Two changes remove arithmetic rather than reorganise it: the user-profile norm is dropped entirely, because dividing a row of scores by a positive constant cannot change its ranking, and everything is float32 on contiguous CSR buffers. Chunking bounds the dense score block so peak memory is independent of the number of users. The honest caveat is that this is still an exact scan of the catalogue per user; past a few million items the answer is an approximate inner-product index, which is why the item rows were normalised in the first place.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Profiles for a whole chunk of users come from one sparse product and their scores from a second, instead of a mat-vec and a norm per user.',
            tradeoff: 'The score block is dense (chunk by n_items), so a sparse-friendly formulation temporarily becomes memory-hungry and the chunk size has to be chosen against catalogue size.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The result array is allocated once for all users, and seen-item masking writes negative infinity directly into the score block instead of building a masked copy.',
            tradeoff: 'In-place masking destroys the true scores of seen items, so any caller wanting an explanation or a debug score for them must recompute it.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'Float32 CSR with a prebuilt transposed copy halves memory traffic and avoids dtype conversions inside the product.',
            tradeoff: 'Float32 accumulates rounding error across long sparse dot products, and ties near the top-k boundary can be broken differently from the float64 version; the transposed copy doubles item-matrix memory.',
          },
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'Chunking over users turns thousands of Python-level calls into a few BLAS-style calls and bounds peak memory independently of batch size.',
            tradeoff: 'Chunk size is a tuning parameter with no universal default — too small and dispatch dominates, too large and the score block spills out of cache.',
          },
        ],
        libraryName: 'SciPy sparse / NumPy',
        profile:
          'O(nnz of the catalogue) per user in sparse kernels, plus O(n) selection per user, with memory bounded by the chunk. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Content-based filtering - TF-IDF, centroid profile, cosine. Dense, literal.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <utility>
#include <vector>

// documents[d] is a list of term ids in [0, vocab_size).
std::vector<std::vector<double>> TfIdf(
    const std::vector<std::vector<int>>& documents, int vocab_size) {
  const double n_docs = static_cast<double>(documents.size());

  std::vector<int> document_frequency(vocab_size, 0);
  for (std::size_t d = 0; d < documents.size(); ++d) {
    std::vector<bool> seen(vocab_size, false);
    for (std::size_t t = 0; t < documents[d].size(); ++t) {
      const int term = documents[d][t];
      if (!seen[term]) {
        seen[term] = true;
        document_frequency[term] += 1;
      }
    }
  }

  std::vector<std::vector<double>> vectors;
  for (std::size_t d = 0; d < documents.size(); ++d) {
    std::vector<double> counts(vocab_size, 0.0);
    for (std::size_t t = 0; t < documents[d].size(); ++t) {
      counts[documents[d][t]] += 1.0;
    }
    std::vector<double> vector(vocab_size, 0.0);
    for (int term = 0; term < vocab_size; ++term) {
      if (counts[term] > 0.0) {
        const double idf =
            std::log((1.0 + n_docs) / (1.0 + document_frequency[term])) + 1.0;
        vector[term] = (1.0 + std::log(counts[term])) * idf;
      }
    }
    vectors.push_back(vector);
  }
  return vectors;
}

// The weighted mean of the liked item vectors - the closed-form minimizer.
std::vector<double> BuildProfile(const std::vector<std::vector<double>>& vectors,
                                 const std::vector<int>& liked,
                                 const std::vector<double>& weights) {
  std::vector<double> profile(vectors[0].size(), 0.0);
  double total_weight = 0.0;
  for (std::size_t n = 0; n < liked.size(); ++n) {
    total_weight += weights[n];
    for (std::size_t term = 0; term < profile.size(); ++term) {
      profile[term] += weights[n] * vectors[liked[n]][term];
    }
  }
  for (std::size_t term = 0; term < profile.size(); ++term) {
    profile[term] /= total_weight;
  }
  return profile;
}

double Cosine(const std::vector<double>& a, const std::vector<double>& b) {
  double dot = 0.0;
  double norm_a = 0.0;
  double norm_b = 0.0;
  for (std::size_t term = 0; term < a.size(); ++term) {
    dot += a[term] * b[term];
    norm_a += a[term] * a[term];
    norm_b += b[term] * b[term];
  }
  if (norm_a == 0.0 || norm_b == 0.0) return 0.0;
  return dot / (std::sqrt(norm_a) * std::sqrt(norm_b));
}

std::vector<std::pair<double, int>> Recommend(
    const std::vector<std::vector<double>>& vectors,
    const std::vector<int>& liked, const std::vector<double>& weights,
    std::size_t k) {
  const std::vector<double> profile = BuildProfile(vectors, liked, weights);

  std::vector<std::pair<double, int>> scored;
  for (std::size_t item = 0; item < vectors.size(); ++item) {
    bool already_liked = false;
    for (std::size_t n = 0; n < liked.size(); ++n) {
      if (liked[n] == static_cast<int>(item)) already_liked = true;
    }
    if (already_liked) continue;
    scored.emplace_back(Cosine(profile, vectors[item]), static_cast<int>(item));
  }

  // Sorting every candidate to keep k of them.
  std::sort(scored.begin(), scored.end(),
            [](const auto& a, const auto& b) { return a.first > b.first; });
  if (scored.size() > k) scored.resize(k);
  return scored;
}`,
        profile:
          'O(items * vocab) memory and time per user: dense vectors over the whole vocabulary, both norms recomputed per pair, an O(n log n) sort, and a linear scan to test whether an item was already liked.',
      },
      'make-it-right': {
        code: `// Content-based filtering - CSR storage, unit rows, fails fast, partial sort.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// Compressed sparse rows: item i owns entries [offsets[i], offsets[i + 1]).
class ItemIndex {
 public:
  ItemIndex(std::vector<std::size_t> offsets, std::vector<int> columns,
            std::vector<double> values, int n_terms)
      : offsets_(std::move(offsets)),
        columns_(std::move(columns)),
        values_(std::move(values)),
        n_terms_(n_terms) {
    if (offsets_.size() < 2 || n_terms_ <= 0) {
      throw std::invalid_argument("empty catalogue");
    }
    if (columns_.size() != values_.size() || offsets_.back() != values_.size()) {
      throw std::invalid_argument("CSR arrays disagree about nonzero count");
    }
    NormaliseRows();
  }

  [[nodiscard]] std::size_t ItemCount() const { return offsets_.size() - 1; }

  // profile = sum_i weight_i * x_i, scattered into a dense buffer.
  [[nodiscard]] std::vector<double> BuildProfile(
      std::span<const int> liked, std::span<const double> weights) const {
    if (liked.empty() || liked.size() != weights.size()) {
      throw std::invalid_argument("liked items and weights must align and be non-empty");
    }
    std::vector<double> profile(static_cast<std::size_t>(n_terms_), 0.0);
    for (std::size_t n = 0; n < liked.size(); ++n) {
      const auto item = static_cast<std::size_t>(liked[n]);
      if (item >= ItemCount()) throw std::out_of_range("liked item outside the catalogue");
      for (std::size_t e = offsets_[item]; e < offsets_[item + 1]; ++e) {
        profile[static_cast<std::size_t>(columns_[e])] += weights[n] * values_[e];
      }
    }
    return profile;
  }

  // Items are unit rows, so cosine is the dot product; the profile norm is a
  // per-user constant that cannot change the ranking and is never computed.
  [[nodiscard]] std::vector<std::pair<double, int>> Recommend(
      std::span<const double> profile, std::span<const int> seen,
      std::size_t k) const {
    if (profile.size() != static_cast<std::size_t>(n_terms_)) {
      throw std::invalid_argument("profile width does not match the index");
    }
    if (k == 0 || k > ItemCount()) throw std::invalid_argument("k outside the catalogue");

    std::vector<bool> is_seen(ItemCount(), false);
    for (const int item : seen) is_seen[static_cast<std::size_t>(item)] = true;

    std::vector<std::pair<double, int>> scored;
    scored.reserve(ItemCount());
    for (std::size_t item = 0; item < ItemCount(); ++item) {
      if (is_seen[item]) continue;
      double dot = 0.0;
      for (std::size_t e = offsets_[item]; e < offsets_[item + 1]; ++e) {
        dot += profile[static_cast<std::size_t>(columns_[e])] * values_[e];
      }
      scored.emplace_back(dot, static_cast<int>(item));
    }

    const std::size_t keep = std::min(k, scored.size());
    // partial_sort orders only the k survivors; the rest are never ranked.
    std::partial_sort(scored.begin(), scored.begin() + static_cast<long>(keep),
                      scored.end(), [](const auto& a, const auto& b) {
                        return a.first > b.first;
                      });
    scored.resize(keep);
    return scored;
  }

 private:
  void NormaliseRows() {
    for (std::size_t item = 0; item + 1 < offsets_.size(); ++item) {
      double squared = 0.0;
      for (std::size_t e = offsets_[item]; e < offsets_[item + 1]; ++e) {
        squared += values_[e] * values_[e];
      }
      if (squared == 0.0) continue;   // an empty item stays the zero vector
      const double inverse = 1.0 / std::sqrt(squared);
      for (std::size_t e = offsets_[item]; e < offsets_[item + 1]; ++e) {
        values_[e] *= inverse;
      }
    }
  }

  std::vector<std::size_t> offsets_;
  std::vector<int> columns_;
  std::vector<double> values_;
  int n_terms_;
};`,
        rationale:
          'The dense vocabulary-wide vectors become compressed sparse rows, which turns O(items by vocabulary) work into O(nonzeros) — the difference between feasible and not once the vocabulary reaches 10^5 terms. Rows are normalised once in the constructor, so scoring is a gather-and-multiply with no per-pair norm and the profile norm is dropped altogether. The already-liked scan becomes a boolean mask, the full sort becomes partial_sort over only the k survivors, and validation moves to the boundary: an index that exists is one whose CSR invariants hold, and a malformed profile fails before any scoring starts.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Fail fast on invalid input before any allocation',
        ],
        profile:
          'O(nnz) per full-catalogue scan, O(n log k) selection via partial_sort, contiguous CSR buffers, no per-pair norm.',
      },
      'make-it-fast': {
        code: `// Content-based filtering - Eigen sparse mat-vec per user, OpenMP across users.
#include <Eigen/Dense>
#include <Eigen/Sparse>
#include <algorithm>
#include <cstddef>
#include <limits>
#include <numeric>
#include <stdexcept>
#include <utility>
#include <vector>

// Row-major CSR: an item is one contiguous run of (column, value) pairs, which is
// exactly what the sparse mat-vec streams through.
using SparseRowMatrix = Eigen::SparseMatrix<float, Eigen::RowMajor>;

class BatchRecommender {
 public:
  explicit BatchRecommender(SparseRowMatrix unit_items)
      : items_(std::move(unit_items)) {
    if (items_.rows() == 0) throw std::invalid_argument("empty catalogue");
    items_.makeCompressed();
  }

  // feedback is (n_users, n_items), holding mean-centred weights. Cosine is a dot
  // product on unit rows and the user-profile norm cannot change a ranking, so a
  // user costs one scatter, one sparse mat-vec, and one selection.
  [[nodiscard]] std::vector<std::vector<int>> Recommend(
      const SparseRowMatrix& feedback, int k) const {
    if (feedback.cols() != items_.rows()) {
      throw std::invalid_argument("feedback width does not match the catalogue");
    }
    const int n_users = static_cast<int>(feedback.rows());
    std::vector<std::vector<int>> result(static_cast<std::size_t>(n_users));

#pragma omp parallel
    {
      // Per-thread scratch, allocated once per thread rather than once per user.
      Eigen::VectorXf profile(items_.cols());
      Eigen::VectorXf scores(items_.rows());
      std::vector<int> order(static_cast<std::size_t>(items_.rows()));

#pragma omp for schedule(dynamic, 64)
      for (int user = 0; user < n_users; ++user) {
        profile.setZero();
        for (SparseRowMatrix::InnerIterator liked(feedback, user); liked; ++liked) {
          for (SparseRowMatrix::InnerIterator term(items_, liked.col()); term; ++term) {
            profile[term.col()] += liked.value() * term.value();
          }
        }

        scores.noalias() = items_ * profile;          // no temporary for the product
        for (SparseRowMatrix::InnerIterator seen(feedback, user); seen; ++seen) {
          scores[seen.col()] = -std::numeric_limits<float>::infinity();
        }

        std::iota(order.begin(), order.end(), 0);
        std::nth_element(order.begin(), order.begin() + k, order.end(),
                         [&scores](int a, int b) { return scores[a] > scores[b]; });
        std::sort(order.begin(), order.begin() + k,
                  [&scores](int a, int b) { return scores[a] > scores[b]; });

        result[static_cast<std::size_t>(user)].assign(order.begin(), order.begin() + k);
      }
    }
    return result;
  }

 private:
  SparseRowMatrix items_;
};
// Build with: g++ -O3 -march=native -fopenmp`,
        rationale:
          'The per-item scoring loop becomes one Eigen sparse mat-vec per user, written with noalias so the product lands directly in the preallocated score vector with no temporary. The profile is a scatter over only the nonzeros of the liked items, scratch buffers are allocated once per thread rather than once per user, and the loop over users is the parallel dimension because users are independent while a single user’s scan is memory-bound. Selection stays nth_element then a sort of k. As in the other stages, no norm is computed on the hot path. What has not changed is the asymptotics: every user still scans the whole catalogue, and no amount of vectorization makes that sublinear — that needs an approximate inner-product index.',
        optimizations: [
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'scores.noalias() = items * profile evaluates the sparse product straight into the preallocated vector instead of building an intermediate and copying it.',
            tradeoff: 'noalias is a promise the compiler cannot check; if the destination aliases an operand the result is silently wrong rather than an error.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Users are independent and each thread owns its profile, score, and order buffers, so the loop scales across cores with no synchronisation.',
            tradeoff: 'Per-thread dense buffers cost threads times (n_terms + 2 * n_items) of memory, and a sparse mat-vec is memory-bound, so extra cores stop helping once bandwidth saturates.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A CSR row-major item matrix streams each item row contiguously during the mat-vec, so reads follow what the prefetcher expects.',
            tradeoff: 'Row-major sparse is the wrong layout for the column-oriented access that updating a profile by term would want, and keeping both layouts means two copies of the catalogue.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Lets the compiler vectorize the gather-multiply-accumulate inner loop for the host CPU.',
            tradeoff: 'A -march=native binary can crash with an illegal-instruction fault on a different CPU, so it must be built on the deployment hardware or targeted explicitly.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile:
          'O(nnz of the catalogue) per user in a sparse mat-vec, O(n) selection, parallel across users. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Content-based filtering - TF-IDF, centroid profile, cosine. Dense, literal.

use std::collections::HashSet;

/// documents[d] is a list of term ids in [0, vocab_size).
pub fn tfidf(documents: &[Vec<usize>], vocab_size: usize) -> Vec<Vec<f64>> {
    let n_docs = documents.len() as f64;

    let mut document_frequency = vec![0usize; vocab_size];
    for d in 0..documents.len() {
        let mut seen: HashSet<usize> = HashSet::new();
        for t in 0..documents[d].len() {
            if seen.insert(documents[d][t]) {
                document_frequency[documents[d][t]] += 1;
            }
        }
    }

    let mut vectors = Vec::new();
    for d in 0..documents.len() {
        let mut counts = vec![0.0f64; vocab_size];
        for t in 0..documents[d].len() {
            counts[documents[d][t]] += 1.0;
        }
        let mut vector = vec![0.0f64; vocab_size];
        for term in 0..vocab_size {
            if counts[term] > 0.0 {
                let idf = ((1.0 + n_docs) / (1.0 + document_frequency[term] as f64)).ln() + 1.0;
                vector[term] = (1.0 + counts[term].ln()) * idf;
            }
        }
        vectors.push(vector);
    }
    vectors
}

/// The weighted mean of the liked item vectors - the closed-form minimizer.
pub fn build_profile(vectors: &[Vec<f64>], liked: &[usize], weights: &[f64]) -> Vec<f64> {
    let mut profile = vec![0.0f64; vectors[0].len()];
    let mut total_weight = 0.0;
    for n in 0..liked.len() {
        total_weight += weights[n];
        for term in 0..profile.len() {
            profile[term] += weights[n] * vectors[liked[n]][term];
        }
    }
    for term in 0..profile.len() {
        profile[term] /= total_weight;
    }
    profile
}

pub fn cosine(a: &[f64], b: &[f64]) -> f64 {
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for term in 0..a.len() {
        dot += a[term] * b[term];
        norm_a += a[term] * a[term];
        norm_b += b[term] * b[term];
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}

pub fn recommend(
    vectors: &[Vec<f64>],
    liked: &[usize],
    weights: &[f64],
    k: usize,
) -> Vec<(f64, usize)> {
    let profile = build_profile(vectors, liked, weights);

    let mut scored: Vec<(f64, usize)> = Vec::new();
    for item in 0..vectors.len() {
        if liked.contains(&item) {
            continue;
        }
        scored.push((cosine(&profile, &vectors[item]), item));
    }

    // Sorting every candidate to keep k; f64 has no total order, so unwrap.
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
    scored.truncate(k);
    scored
}`,
        profile:
          'O(items * vocab) time and memory per user in dense vectors, both norms recomputed per pair, an O(n log n) sort, every index bounds-checked, and an O(liked) scan per item.',
      },
      'make-it-right': {
        code: `//! Content-based filtering - typed errors, CSR storage, unit rows, borrowed slices.

use std::fmt;

/// A row index into the catalogue. A newtype so an item id cannot be confused
/// with a term id or a user id, all of which are plain integers elsewhere.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ItemId(pub usize);

#[derive(Debug, PartialEq)]
pub enum RecommendError {
    EmptyCatalogue,
    InconsistentCsr { offsets_end: usize, nonzeros: usize },
    UnknownItem { item: usize, catalogue: usize },
    ColdStart,
    InvalidK { k: usize, available: usize },
}

impl fmt::Display for RecommendError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyCatalogue => write!(f, "the catalogue is empty"),
            Self::InconsistentCsr { offsets_end, nonzeros } => {
                write!(f, "offsets end at {offsets_end} but there are {nonzeros} nonzeros")
            }
            Self::UnknownItem { item, catalogue } => {
                write!(f, "item {item} is outside a catalogue of {catalogue}")
            }
            Self::ColdStart => write!(f, "no usable feedback, so no profile exists"),
            Self::InvalidK { k, available } => write!(f, "k={k} exceeds the {available} candidates"),
        }
    }
}

impl std::error::Error for RecommendError {}

pub struct ItemIndex {
    offsets: Vec<usize>,    // item i owns offsets[i]..offsets[i + 1]
    columns: Vec<u32>,
    values: Vec<f64>,       // rows L2-normalised once, in new()
    n_terms: usize,
}

impl ItemIndex {
    /// Validates the CSR contract once, here, so every later call can assume it.
    pub fn new(
        offsets: Vec<usize>,
        columns: Vec<u32>,
        mut values: Vec<f64>,
        n_terms: usize,
    ) -> Result<Self, RecommendError> {
        if offsets.len() < 2 {
            return Err(RecommendError::EmptyCatalogue);
        }
        let end = offsets[offsets.len() - 1];
        if columns.len() != values.len() || end != values.len() {
            return Err(RecommendError::InconsistentCsr { offsets_end: end, nonzeros: values.len() });
        }

        // Cosine is a dot product on unit rows, so normalise now and never again.
        for window in offsets.windows(2) {
            let row = &mut values[window[0]..window[1]];
            let length = row.iter().map(|v| v * v).sum::<f64>().sqrt();
            if length > 0.0 {
                row.iter_mut().for_each(|v| *v /= length);
            }
        }
        Ok(Self { offsets, columns, values, n_terms })
    }

    pub fn item_count(&self) -> usize {
        self.offsets.len() - 1
    }

    fn row(&self, item: usize) -> (&[u32], &[f64]) {
        let range = self.offsets[item]..self.offsets[item + 1];
        (&self.columns[range.clone()], &self.values[range])
    }

    /// Weighted centroid of the liked items, scattered into a dense profile.
    pub fn build_profile(&self, feedback: &[(ItemId, f64)]) -> Result<Vec<f64>, RecommendError> {
        if feedback.is_empty() {
            return Err(RecommendError::ColdStart);
        }
        let mut profile = vec![0.0; self.n_terms];
        for &(ItemId(item), weight) in feedback {
            if item >= self.item_count() {
                return Err(RecommendError::UnknownItem { item, catalogue: self.item_count() });
            }
            let (columns, values) = self.row(item);
            for (&column, &value) in columns.iter().zip(values) {
                profile[column as usize] += weight * value;
            }
        }
        Ok(profile)
    }

    /// Top-k unseen items by dot product, which equals cosine on unit rows.
    pub fn recommend(
        &self,
        profile: &[f64],
        seen: &[ItemId],
        k: usize,
    ) -> Result<Vec<(ItemId, f64)>, RecommendError> {
        let mut scored: Vec<(ItemId, f64)> = (0..self.item_count())
            .filter(|item| !seen.contains(&ItemId(*item)))
            .map(|item| {
                let (columns, values) = self.row(item);
                let dot: f64 = columns
                    .iter()
                    .zip(values)
                    .map(|(&column, &value)| profile[column as usize] * value)
                    .sum();
                (ItemId(item), dot)
            })
            .collect();

        if k == 0 || k > scored.len() {
            return Err(RecommendError::InvalidK { k, available: scored.len() });
        }
        scored.sort_by(|a, b| b.1.total_cmp(&a.1));
        scored.truncate(k);
        Ok(scored)
    }
}
`,
        rationale:
          'The dense vocabulary-wide vectors become compressed sparse rows, so work scales with nonzeros rather than with items times vocabulary, and rows are normalised once in the constructor — after that cosine is a dot product and no norm is computed per pair. Errors become a typed Result, including an explicit ColdStart case instead of a division by zero, and the CSR contract is validated at the constructor boundary. ItemId is a newtype so an item row cannot be confused with a term column, both of which were plain usize before. The failing partial_cmp-and-unwrap is replaced by total_cmp, and the manual index loops become iterator chains that zip a row’s columns with its values.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile:
          'O(nnz) per full-catalogue scan, O(n log n) sort of the candidates, contiguous CSR rows, no per-pair norm. The O(seen) contains check remains.',
      },
      'make-it-fast': {
        code: `//! Content-based filtering - rayon over users, per-thread scratch, linear selection.

use rayon::prelude::*;

/// Unit-row CSR in f32. Cosine is a dot product, and the profile norm is a
/// per-user constant that cannot change a ranking, so neither is ever divided out.
pub struct FastIndex {
    offsets: Vec<usize>,
    columns: Vec<u32>,
    values: Vec<f32>,
    n_terms: usize,
}

impl FastIndex {
    #[inline]
    fn row(&self, item: usize) -> (&[u32], &[f32]) {
        let range = self.offsets[item]..self.offsets[item + 1];
        (&self.columns[range.clone()], &self.values[range])
    }

    /// One user. profile is per-thread scratch and is left all-zero on return, so
    /// the next user on this thread pays nothing to clear it.
    fn recommend_one(
        &self,
        profile: &mut [f32],
        liked: &[(u32, f32)],       // (item, weight), sorted by item
        k: usize,
    ) -> Vec<u32> {
        for &(item, weight) in liked {
            let (columns, values) = self.row(item as usize);
            for (&column, &value) in columns.iter().zip(values) {
                profile[column as usize] += weight * value;
            }
        }

        let item_count = self.offsets.len() - 1;
        let mut scored: Vec<(f32, u32)> = Vec::with_capacity(item_count);
        for item in 0..item_count {
            if liked.binary_search_by_key(&(item as u32), |&(id, _)| id).is_ok() {
                continue;
            }
            let (columns, values) = self.row(item);
            let dot: f32 = columns
                .iter()
                .zip(values)
                .map(|(&column, &value)| profile[column as usize] * value)
                .sum();
            scored.push((dot, item as u32));
        }

        // Undo only the entries this user touched: O(touched), not O(n_terms).
        for &(item, _) in liked {
            let (columns, _) = self.row(item as usize);
            for &column in columns {
                profile[column as usize] = 0.0;
            }
        }

        let keep = k.min(scored.len());
        if keep == 0 {
            return Vec::new();
        }
        scored.select_nth_unstable_by(keep - 1, |a, b| b.0.total_cmp(&a.0));
        scored.truncate(keep);
        scored.sort_unstable_by(|a, b| b.0.total_cmp(&a.0));
        scored.into_iter().map(|(_, item)| item).collect()
    }

    /// A batch of users is a parallel map; map_init gives each worker thread one
    /// zeroed profile buffer for its whole share of the batch.
    #[must_use]
    pub fn recommend_batch(&self, users: &[Vec<(u32, f32)>], k: usize) -> Vec<Vec<u32>> {
        users
            .par_iter()
            .map_init(
                || vec![0.0f32; self.n_terms],
                |profile, liked| self.recommend_one(profile, liked, k),
            )
            .collect()
    }
}
`,
        rationale:
          'Three changes, each replacing a structure rather than tuning one. The batch of users becomes a rayon parallel map, which is where the independence is, with map_init giving each worker thread one reusable profile buffer instead of allocating and zeroing n_terms floats per user. The buffer is cleaned by undoing only the entries the user touched, so resetting costs O(touched) rather than O(vocabulary). And selection moves from a full sort to select_nth_unstable_by, a linear-time partition that never orders the discarded items, followed by a sort of only k. Items and weights drop to f32 on contiguous slices, and the profile norm is never computed because it cannot change a ranking. The asymptotics per user are unchanged: it is still an exact scan, and a catalogue past a few million items needs an approximate inner-product index.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Users share the immutable index and write only to their own result and their own thread-local buffer, so a batch splits across cores without any locking.',
            tradeoff: 'Parallelism helps only in batch; a single latency-sensitive request gets nothing, and each worker holds an n_terms buffer, so memory grows with the thread count.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The score buffer is sized to the catalogue before the scan, so filling it never triggers a grow-and-copy.',
            tradeoff: 'Allocates O(n) per user to enable linear-time selection; a bounded heap would use O(k) and is better when the catalogue is huge and k is tiny.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Each item row is a pair of contiguous slices, so the gather-multiply loop reads columns and values sequentially and zips them without bounds checks on the row itself.',
            tradeoff: 'The type system carries no shape information, so a column index outside n_terms is a panic or a silent misread depending on build settings rather than a compile error.',
          },
          {
            technique: '#[inline] on small hot functions',
            why: 'The row accessor is called once per item per user; inlining lets the compiler keep the offsets lookup in registers across the scan.',
            tradeoff: 'Inlining enlarges the caller and can crowd the instruction cache; it is a guess until a profiler says the call overhead is real.',
          },
        ],
        libraryName: 'rayon',
        profile:
          'O(nnz of the catalogue) per user, O(n) selection, parallel across a batch, O(touched) buffer reset. Illustrative, not a measured benchmark.',
      },
    },
  },
};
