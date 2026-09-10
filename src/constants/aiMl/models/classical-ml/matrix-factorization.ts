import type { AiMlModel } from '../../types';

/**
 * Matrix Factorization — the most specialized rung in the structure group, and
 * the one that only looks at the entries it was given.
 *
 * Closes the group because it is PCA's assumption removed: PCA factorizes a
 * complete matrix, this factorizes one that is 99% missing and treats the
 * missingness as the whole problem rather than an obstacle. Calling it "SVD"
 * is the field's most persistent misnomer, and the distinction is exactly what
 * this entry is about.
 */
export const MATRIX_FACTORIZATION: AiMlModel = {
  slug: 'matrix-factorization',
  name: 'Matrix Factorization',
  aliases: ['MF', 'Latent factor model', 'ALS', 'FunkSVD', 'Collaborative filtering'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised', 'self-supervised'],
  taskTypes: ['ranking', 'regression', 'dimensionality-reduction'],
  paradigmNote:
    'The classification is genuinely contested. There is no external label, which makes it unsupervised in the conventional taxonomy; but the observed entries act as targets for the unobserved ones, which is self-supervision in structure if not in name. Both are listed because the argument for each is real, and reading it as self-supervised is what makes the evaluation protocol obvious: hold out observed entries and predict them.',

  intuition:
    'A ratings matrix has millions of rows and columns and almost nothing in it — most users have touched almost nothing. The bet is that behaviour is driven by a small number of underlying factors, so the matrix is approximately low rank: describe each user by a short vector of tastes, each item by a short vector of attributes, and predict an interaction as the dot product between them. Nothing says what the factors mean, and they are not interpretable; what matters is that fitting them on the entries you observed lets you fill in the ones you did not. The crucial detail is that the sum runs only over observed entries — treating the blanks as zeros would be a completely different and much worse model.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\min_{P, Q} \\sum_{(u,i) \\in \\mathcal{O}} \\left( r_{ui} - \\mu - b_u - b_i - \\mathbf{p}_u^{\\top}\\mathbf{q}_i \\right)^2 + \\lambda\\left( \\lVert \\mathbf{p}_u \\rVert^2 + \\lVert \\mathbf{q}_i \\rVert^2 \\right)',
      symbols: [
        { symbol: '\\mathcal{O}', meaning: 'the set of OBSERVED entries — the sum runs over these only, which is the difference between this and an SVD' },
        { symbol: '\\mathbf{p}_u, \\mathbf{q}_i', meaning: 'latent factor vectors for user u and item i, typically 10 to 200 dimensions' },
        { symbol: '\\mu, b_u, b_i', meaning: 'global mean and per-user, per-item biases — these explain more of the variance than the factors do' },
        { symbol: '\\lambda', meaning: 'regularization, and not optional: a user with three ratings can otherwise fit them exactly' },
      ],
    },
    reading:
      'Explain each observed interaction as a baseline plus an interaction between what the user likes and what the item is, and keep the factor vectors small. Two things deserve emphasis. The restriction to observed entries is the entire modelling decision: an SVD would require the missing values to be filled in, and filling them with zeros asserts that unrated means disliked, which is false. And the bias terms are not a technicality — a generous user rating a popular film is largely explained before any factor is consulted, and models that skip biases spend their factor capacity relearning them.',
  },

  optimization: {
    method: 'Alternating least squares, or stochastic gradient descent over observed entries',
    updateRule: {
      formula:
        '\\mathbf{p}_u \\leftarrow \\left( Q_u^{\\top} Q_u + \\lambda I \\right)^{-1} Q_u^{\\top} \\mathbf{r}_u, \\qquad \\mathbf{q}_i \\leftarrow \\left( P_i^{\\top} P_i + \\lambda I \\right)^{-1} P_i^{\\top} \\mathbf{r}_i',
      symbols: [
        { symbol: 'Q_u', meaning: 'the factor vectors of the items user u actually rated, stacked — only those rows participate' },
        { symbol: '\\lambda I', meaning: 'ridge term added to the diagonal, which is also what keeps the tiny k-by-k system invertible for a user with few ratings' },
        { symbol: '\\leftarrow', meaning: 'alternating: solve every user with items fixed, then every item with users fixed, and repeat' },
        { symbol: '\\mathbf{r}_u', meaning: 'the observed ratings of user u, with the biases already subtracted' },
      ],
    },
    rationale:
      'The objective is bilinear: not convex in P and Q jointly, but exactly a ridge regression in either one with the other held fixed. So alternating minimization applies, and each half-step has a closed form — a k-by-k solve per user, then per item — with k typically under two hundred, which makes those solves trivially cheap. This is the same alternating-minimization structure as k-means and EM, and it inherits the same property: monotone descent, no guarantee of a global optimum, results that depend on initialization. The reason to prefer ALS over SGD is parallelism, and it is decisive: within a half-step every user is independent of every other, so the work distributes across cores or machines with no coordination. SGD converges in fewer passes on a single machine and does not partition that way.',
    hyperparameters: [
      { name: 'k (rank)', role: 'Number of latent factors, and the capacity dial. Diminishing returns arrive quickly and overfitting arrives with them', typicalRange: '10 to 200; the Netflix-era consensus was that gains flatten well before 200' },
      { name: 'lambda', role: 'Regularization. Not optional — a user with three observed entries will otherwise reproduce them exactly and generalize to nothing', typicalRange: '0.01 to 1.0, cross-validated; often scaled by the number of ratings per user' },
      { name: 'iterations', role: 'ALS sweeps. Convergence is fast, usually 10 to 20, because each half-step is an exact solve rather than a gradient step' },
      { name: 'alpha (implicit feedback)', role: 'Confidence scaling on observed interactions when there are no explicit ratings. Turns a click into a weighted positive rather than a rating' },
      { name: 'biases', role: 'Whether to fit per-user and per-item offsets. Almost always yes; they explain more variance than the factors and cost k=0 parameters each' },
    ],
    convergence:
      'ALS descends monotonically and converges quickly — ten to twenty sweeps is typical, because each half-step solves its subproblem exactly rather than stepping toward it. What it converges to depends on the initialization, since the joint objective is non-convex. The failure modes are about data rather than optimization. Cold start is structural: a user or item with no observed entries has no equation to solve and no factor vector, and no amount of training fixes it — content features or a popularity fallback are the only answers. Popularity bias is self-reinforcing: popular items appear in more equations, get better-estimated factors, get recommended more, and accumulate more interactions. And the factors are not identified — any invertible transformation of P with its inverse applied to Q gives the same predictions — so interpreting individual factors is unfounded no matter how suggestive they look.',
    complexity:
      'ALS: O(|O|·k^2 + (m + n)·k^3) per sweep, where |O| is the number of observed entries — linear in the data and cubic only in the small rank. For implicit feedback the naive form is O(m·n·k^2) because every unobserved pair is a weak negative, and the Gramian trick reduces it back to O(|O|·k^2 + (m + n)·k^3), which is what makes implicit ALS feasible at all. Memory is O((m + n)·k) for the factors, which is small — a million users at k=64 is a few hundred megabytes. Inference is a single dot product, or a nearest-neighbour search over item factors when the task is top-N retrieval.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Matrix completion over a series-by-time matrix. With many related series observed irregularly — sensors dropping out, stores reporting late — the matrix of series against periods is low rank because the series share drivers, and factorizing it fills the gaps. Temporal regularized variants add a penalty tying adjacent time factors together, which is what turns completion into something that can extrapolate one step rather than only interpolate.',
        where: [
          'Imputing missing observations across a panel of related series before a forecaster consumes them',
          'Traffic and sensor networks with systematic dropout, where the spatial correlation is exactly the low-rank structure',
          'Extracting shared latent factors from a wide panel, as a variant of the factor-model approach PCA takes',
        ],
        why: 'It handles the situation PCA cannot: a panel with holes in it. PCA needs a complete matrix, and imputing before decomposing biases the result toward whatever was imputed; this fits only what was observed. The limitation is that plain matrix factorization has no notion of time — the columns could be shuffled and the fit would be identical — so it interpolates well and extrapolates not at all unless a temporal regularizer is added, at which point it is a different and more complex model.',
        featurization: [
          'Centre by series and by period before factorizing, so the biases carry the level and the factors carry the structure',
          'Add a temporal smoothness penalty on the time factors if forecasting rather than imputing is the goal',
          'Hold out observed entries at random for validation, and separately hold out a time block, since the two measure different things',
          'Keep the rank low — a wide panel with few observations per series overfits quickly',
        ],
        evaluation:
          'For imputation, error on held-out observed entries. For forecasting, a rolling-origin backtest of whatever consumes the completed matrix. Reconstruction error on the training entries says nothing about either.',
        pitfalls: [
          'Column order is irrelevant to the model, so nothing stops it from "predicting" a period using information from later ones unless the split is temporal',
          'Series with almost no observations get factors driven entirely by the regularizer, which is a shrunk guess rather than a prediction',
          'Treating an imputed matrix as observed data downstream, so the uncertainty of the completion disappears from every subsequent estimate',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'The model reconstructs the entries it was fitted on and has no notion of normality for a whole observation; a large residual on a single cell usually means that user or item had too few observations, not that anything anomalous occurred.',
      },
      optimization: {
        fit: 'adapted',
        how: 'The objective is bilinear — non-convex jointly, exactly a ridge regression in each factor alone — which makes it the cleanest example of why alternating minimization is reached for. Each half-step has a closed form, so there is no step size and no line search, and the descent is monotone by construction. It is the same pattern as EM and as k-means, with the advantage that here the subproblem is a textbook regularized least squares rather than something bespoke.',
        where: [
          'The reference example of a bilinear objective and why alternating least squares beats gradient descent on it',
          'Low-rank matrix completion as a relaxation of a rank-constrained problem, which is where nuclear-norm methods come from',
          'Recommendation as a constrained allocation problem, where the predicted preference surface feeds a slate or budget optimizer',
        ],
        why: 'The interesting content is the contrast with gradient descent, and it comes out in favour of exploiting structure: because each subproblem is solved exactly rather than stepped toward, ALS converges in tens of sweeps where SGD needs many passes, and it parallelizes because the subproblems within a half-step are independent. The counterweight is the honest one — monotone descent on a non-convex surface says nothing about the global optimum, and different initializations reach genuinely different factorizations with similar loss.',
        featurization: [
          'Add lambda to the diagonal of every small solve; it is simultaneously the regularizer and what keeps a sparse user’s system invertible',
          'Scale the regularizer by the number of observations per user or item, so a user with three ratings is shrunk harder than one with three hundred',
        ],
        evaluation:
          'Verify the loss decreases monotonically across sweeps — an increase is a bug, almost always a bias term updated inconsistently between the two half-steps. Compare across random initializations to see how non-convex the surface is on this data.',
        pitfalls: [
          'Reading monotone descent as convergence to the global optimum',
          'Inverting the k-by-k matrix explicitly instead of solving with a Cholesky factorization, which is both slower and worse conditioned',
          'Regularizing biases at the same strength as factors, which shrinks the baseline the model most depends on',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'The canonical application and the one it was developed for. Factorize the user-item interaction matrix into latent factors, then score a candidate by the dot product of the two vectors plus the biases. For top-N recommendation the item factors form a vector index and retrieval becomes an approximate nearest-neighbour search over them, which is what makes serving a catalogue of millions tractable.',
        where: [
          'The core of collaborative filtering systems since the Netflix Prize, and still a production baseline',
          'Implicit-feedback recommendation from clicks, plays, and purchases, using the confidence-weighted variant',
          'Candidate generation ahead of a learned ranker, where item factors are indexed and queried by user vector',
          'Learning item embeddings for downstream use, where the factorization is a means to the vectors rather than to the predictions',
        ],
        why: 'It captures the fact that similar users like similar things without anyone specifying what similar means, and it does so from the interaction matrix alone. Two properties keep it deployed: the model is small — factors, not data — and scoring is a dot product, so it fits inside a request path where a neighbourhood method would not. Its structural limits are equally clear and are what two-tower models exist to fix: no way to use content or context, and nothing to say about a user or item with no history.',
        featurization: [
          'Always fit biases; user generosity and item popularity explain more than the factors do and cost two parameters each',
          'For implicit feedback use confidence weighting rather than treating unobserved as negative — a click is evidence of interest, and a non-click is mostly evidence of not having looked',
          'Scale the regularizer by observation count per user and item, so sparse rows are shrunk harder',
          'Plan the cold-start fallback explicitly: a content model or popularity, because the factorization simply has no vector to offer',
        ],
        evaluation:
          'Recall@k and NDCG on a temporal split, not RMSE. The Netflix Prize optimized RMSE and the field has since largely concluded that was the wrong target — a model can improve rating prediction and rank worse. Measure catalogue coverage alongside, or a popularity baseline in disguise will score well.',
        pitfalls: [
          'Optimizing rating prediction when the product is a ranked list, which are different objectives that disagree',
          'Popularity bias compounding through the feedback loop, so recommendations narrow over time without any metric moving',
          'Random rather than temporal splits, which let the model see a user’s future interactions and inflate every offline number',
          'Cold start treated as an edge case when it is most of the catalogue on any real platform',
        ],
      },
      'natural-language': {
        fit: 'adapted',
        how: 'Word embeddings are matrix factorization, whether or not they are presented that way. Build a word-context co-occurrence matrix, reweight it — pointwise mutual information is the usual choice — and factorize it, and the resulting word vectors carry the same distributional semantics that a neural embedding model learns. Skip-gram with negative sampling was shown to be implicitly factorizing a shifted PMI matrix, which makes the connection exact rather than analogical.',
        where: [
          'Explicit count-based embeddings, of which GloVe is a weighted least-squares factorization of log co-occurrence counts',
          'Topic-adjacent decomposition of term-document matrices, where non-negative variants give parts-based components',
          'Small-corpus embedding where a neural model has too little data to train and a factorization does not',
        ],
        why: 'It is worth knowing because it demystifies the neural version: the semantics come from the co-occurrence statistics and the low-rank assumption, not from the network. On a small corpus the explicit factorization is often the better engineering choice, since it is deterministic, has no training loop, and needs no hyperparameter search. What it cannot do is context — one vector per word type, so every sense of a polysemous word is averaged into a single point, which is exactly the limitation contextual embeddings removed.',
        featurization: [
          'Reweight raw counts with PMI or a log transform before factorizing; raw co-occurrence counts are dominated by frequent words',
          'Apply a context window and subsample frequent tokens, which is what the neural variants do implicitly',
          'Truncate rare words rather than factorizing a matrix mostly composed of noise rows',
        ],
        evaluation:
          'Downstream task performance, or word similarity and analogy benchmarks with the caveat that those correlate loosely with real use. Reconstruction error of the co-occurrence matrix is not the objective anyone cares about.',
        pitfalls: [
          'Factorizing raw counts, where frequency swamps every semantic signal',
          'One vector per word type, so polysemy is silently averaged away',
          'Treating dimensions as interpretable when the factorization is identified only up to an invertible transformation',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Linear in the number of observed entries and cubic only in the small rank, which makes it one of the better-scaling models here. ALS parallelizes within each half-step with no coordination, so a billion interactions is a cluster job rather than an impossible one.',
    inferenceProfile:
      'A dot product per candidate — microseconds — and for top-N the item factors go into a vector index so retrieval is an approximate nearest-neighbour query rather than a scan. The model is factors only, so a million users at rank 64 is a few hundred megabytes and the item side is far smaller.',
    retrainingCadence:
      'Typically nightly or weekly in batch. The awkward part is between refits: a new user accumulates interactions the model cannot use, so production systems usually fold new users in by a cheap approximate solve against fixed item factors rather than waiting for the next full fit.',
    driftAndMonitoring: [
      'Track catalogue coverage of the recommendations, since popularity bias narrows the served set gradually and no accuracy metric registers it',
      'Monitor the share of requests falling back to the cold-start path — a rise means the refit cadence is no longer keeping up with catalogue turnover',
      'Watch the distribution of factor norms; a user or item whose norm is dominated by the regularizer has effectively no personalization',
      'Compare held-out ranking metrics on a temporal split at each refit, never a random one, which flatters every model here',
    ],
    productionGotchas: [
      'Factors are identified only up to an invertible transformation, so they are not comparable between refits and nothing downstream may cache or interpret an individual dimension',
      'Cold start is structural rather than an edge case: a new user or item has no vector at all, and the fallback path is part of the system design, not an afterthought',
      'Treating unobserved entries as zero rather than as unknown is the most common and most damaging implementation error, and it produces a model that trains fine and recommends badly',
      'Item factors and the serving index must be rebuilt together; a refreshed factorization against a stale index scores users against vectors that no longer exist',
      'Biases must be applied consistently at scoring time — omitting them shifts every prediction by the global mean and quietly inverts the ranking near the top',
    ],
  },

  assumptions: [
    'The interaction matrix is approximately low rank — a small number of latent factors explains most behaviour, which is the entire premise',
    'Entries are missing in a way the model can ignore, which is false in detail: users choose what to rate, so missingness is informative and the standard formulation assumes it away',
    'Observed interactions reflect preference, which explicit ratings support and implicit signals such as clicks support much more weakly',
    'Users and items have enough observations for their factors to be estimated; below a handful the regularizer is doing the predicting',
    'Preferences are static over the training window, since the model has no notion of time unless one is added',
  ],

  pros: [
    {
      point: 'Learns latent structure from interactions alone, with no feature engineering',
      context:
        'Discovers that two items are similar without anyone describing either of them, which is what made collaborative filtering work at all. Worth nothing when there is no interaction history, which is exactly the cold-start case.',
    },
    {
      point: 'The model is small and scoring is a dot product',
      context:
        'Factors rather than data, so serving a catalogue of millions is a vector index and a dot product. This cost profile is why it survived long after more accurate models existed.',
    },
    {
      point: 'ALS parallelizes with no coordination',
      context:
        'Within a half-step every user is independent, so training distributes across cores or machines cleanly. SGD converges in fewer passes on one machine and does not partition this way — the choice between them is about deployment, not accuracy.',
    },
    {
      point: 'Fits only the observed entries',
      context:
        'The distinction from an SVD, and the reason it works on a 99% empty matrix. Imputing the blanks first — which a plain SVD requires — biases the whole decomposition toward whatever was imputed.',
    },
  ],

  cons: [
    {
      point: 'Cold start is structural and unfixable within the model',
      context:
        'No history means no vector, and no amount of data about other users helps. Every production system needs a separate content or popularity path, which is a design constraint rather than a tuning issue.',
    },
    {
      point: 'Cannot use content, context, or side information',
      context:
        'The matrix is all it sees, so time of day, device, item text and user demographics are unavailable. This is precisely the gap two-tower and feature-based models fill, at the cost of a much larger model.',
    },
    {
      point: 'Factors are not interpretable and not identified',
      context:
        'Any invertible transformation of one side with its inverse on the other gives identical predictions, so a factor has no meaning independent of its partner. Interpretations of individual dimensions get published anyway and are not defensible.',
    },
    {
      point: 'Popularity bias compounds through the feedback loop',
      context:
        'Popular items appear in more equations, get better factors, get recommended more, and gather more interactions. Nothing in the objective resists this, and offline metrics computed on logged data will not reveal it.',
    },
  ],

  relatedSlugs: ['pca', 'k-means', 'two-tower-retrieval'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Matrix factorization by SGD - the objective, transcribed.

For every OBSERVED entry, compute the error, then nudge both factor vectors
and both biases along their gradients. The loop runs over observations, not
over the matrix - a blank is never visited, which is the entire difference
between this and an SVD.
"""

import random


def fit(observations, n_users, n_items, k=10, lr=0.01, reg=0.05, epochs=20, seed=0):
    """observations is a list of (user, item, rating) triples."""
    rng = random.Random(seed)

    # Small random init: zeros would make every gradient zero, since the
    # gradient with respect to p_u is proportional to q_i and vice versa.
    P = [[rng.gauss(0.0, 0.1) for _ in range(k)] for _ in range(n_users)]
    Q = [[rng.gauss(0.0, 0.1) for _ in range(k)] for _ in range(n_items)]
    user_bias = [0.0] * n_users
    item_bias = [0.0] * n_items

    mu = sum(rating for _, _, rating in observations) / len(observations)

    for _ in range(epochs):
        rng.shuffle(observations)

        for user, item, rating in observations:
            # prediction = mu + b_u + b_i + p_u . q_i
            dot = 0.0
            for f in range(k):
                dot += P[user][f] * Q[item][f]
            prediction = mu + user_bias[user] + item_bias[item] + dot
            error = rating - prediction

            # Biases first: they explain more of the variance than the
            # factors do, and they are two parameters rather than k.
            user_bias[user] += lr * (error - reg * user_bias[user])
            item_bias[item] += lr * (error - reg * item_bias[item])

            # Both factor vectors move together, each toward the other
            # scaled by the error - which is why they must be updated from
            # saved copies rather than in sequence.
            for f in range(k):
                p_uf = P[user][f]
                q_if = Q[item][f]
                P[user][f] += lr * (error * q_if - reg * p_uf)
                Q[item][f] += lr * (error * p_uf - reg * q_if)

    return P, Q, user_bias, item_bias, mu


def predict(P, Q, user_bias, item_bias, mu, user, item):
    dot = 0.0
    for f in range(len(P[user])):
        dot += P[user][f] * Q[item][f]
    return mu + user_bias[user] + item_bias[item] + dot`,
        profile: 'O(|O| * k) per epoch in interpreter loops, and inherently sequential — two observations sharing a user or item race on the same vector.',
      },
      'make-it-right': {
        code: `"""Matrix factorization by ALS - typed, CSR-indexed, closed-form half-steps."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class SparseMatrix:
    """CSR: for row r, the entries live at indices[indptr[r]:indptr[r + 1]].

    Both orientations are needed - one half-step iterates users, the other
    iterates items - so the transpose is built once rather than searched for
    repeatedly.
    """

    indptr: NDArray
    indices: NDArray
    values: Vector
    shape: tuple[int, int]

    def row(self, index: int) -> tuple[NDArray, Vector]:
        start, stop = self.indptr[index], self.indptr[index + 1]
        return self.indices[start:stop], self.values[start:stop]


@dataclass(frozen=True)
class FactorModel:
    user_factors: Matrix     # (m, k)
    item_factors: Matrix     # (n, k)
    user_bias: Vector
    item_bias: Vector
    global_mean: float

    def predict(self, user: int, item: int) -> float:
        return float(
            self.global_mean
            + self.user_bias[user]
            + self.item_bias[item]
            + self.user_factors[user] @ self.item_factors[item]
        )

    def top_n(self, user: int, n: int) -> NDArray:
        """Scores every item for one user - one matvec, not a loop."""
        scores = self.item_factors @ self.user_factors[user] + self.item_bias
        return np.argpartition(scores, -n)[-n:]


def _solve_side(
    matrix: SparseMatrix,
    fixed: Matrix,
    bias_self: Vector,
    bias_other: Vector,
    global_mean: float,
    regularization: float,
) -> Matrix:
    """One ALS half-step: solve every row independently.

    Each row is a ridge regression of its observed residuals on the fixed
    side's factor vectors - a k-by-k system, so the solve is trivial. The
    rows are independent of one another, which is the property that makes ALS
    parallelizable and SGD not.
    """
    rows, k = matrix.shape[0], fixed.shape[1]
    updated = np.zeros((rows, k), dtype=np.float64)
    identity = np.eye(k)

    for row in range(rows):
        columns, values = matrix.row(row)
        if columns.size == 0:
            continue                    # cold start: no equation to solve

        partner = fixed[columns]                        # (nnz, k)
        residual = values - global_mean - bias_self[row] - bias_other[columns]

        # lambda scaled by observation count: a row with three entries should
        # be shrunk harder than one with three hundred.
        gram = partner.T @ partner + regularization * columns.size * identity
        updated[row] = np.linalg.solve(gram, partner.T @ residual)

    return updated


def fit(
    matrix: SparseMatrix,
    transposed: SparseMatrix,
    k: int = 32,
    regularization: float = 0.05,
    iterations: int = 15,
    seed: int = 0,
) -> FactorModel:
    """Fit by ALS. Raises ValueError on malformed input."""
    if matrix.shape[::-1] != transposed.shape:
        raise ValueError(f"transpose shape {transposed.shape} does not match {matrix.shape}")
    if k < 1:
        raise ValueError(f"k must be at least 1, got {k}")
    if regularization <= 0.0:
        raise ValueError("regularization must be positive; without it sparse rows overfit exactly")

    m, n = matrix.shape
    rng = np.random.default_rng(seed)
    global_mean = float(matrix.values.mean())

    user_factors = rng.normal(0.0, 0.1, size=(m, k))
    item_factors = rng.normal(0.0, 0.1, size=(n, k))
    user_bias = np.zeros(m, dtype=np.float64)
    item_bias = np.zeros(n, dtype=np.float64)

    for _ in range(iterations):
        # Biases first, and closed form: the optimal offset for a row is the
        # mean of its residuals, shrunk by the regularizer.
        for user in range(m):
            columns, values = matrix.row(user)
            if columns.size == 0:
                continue
            residual = values - global_mean - item_bias[columns] - (
                user_factors[user] @ item_factors[columns].T
            )
            user_bias[user] = residual.sum() / (regularization + columns.size)

        for item in range(n):
            rows, values = transposed.row(item)
            if rows.size == 0:
                continue
            residual = values - global_mean - user_bias[rows] - (
                item_factors[item] @ user_factors[rows].T
            )
            item_bias[item] = residual.sum() / (regularization + rows.size)

        user_factors = _solve_side(
            matrix, item_factors, user_bias, item_bias, global_mean, regularization
        )
        item_factors = _solve_side(
            transposed, user_factors, item_bias, user_bias, global_mean, regularization
        )

    return FactorModel(
        user_factors=user_factors,
        item_factors=item_factors,
        user_bias=user_bias,
        item_bias=item_bias,
        global_mean=global_mean,
    )`,
        rationale:
          'The optimizer changes from SGD to alternating least squares, which is a change of kind rather than of style. The objective is a ridge regression in either factor with the other fixed, so each half-step has a closed form — a k-by-k solve per row — and converges in tens of sweeps rather than many noisy passes. It also makes every row independent within a half-step, which is the property the next stage exploits and which SGD structurally lacks. Around that: CSR indexing in both orientations so neither half-step searches for its entries, biases fitted in closed form rather than by gradient, regularization scaled by observation count so sparse rows shrink harder, and the cold-start case handled as a branch rather than as a division by zero.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(|O| * k^2 + (m + n) * k^3) per sweep, with the per-row solves still driven from a Python loop.',
      },
      'make-it-fast': {
        code: `"""Implicit-feedback ALS - the Gramian trick, Cholesky solves, preallocated."""

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import cho_factor, cho_solve

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def solve_side_implicit(
    indptr: NDArray,
    indices: NDArray,
    values: Vector,
    fixed: Matrix,
    regularization: float,
    alpha: float,
) -> Matrix:
    """One implicit-feedback ALS half-step.

    Implicit feedback has no negatives: every unobserved pair is a weak
    negative with confidence 1, and every observed one a strong positive with
    confidence 1 + alpha*r. Written naively that means each row's system sums
    over ALL n items - O(m * n * k^2), which is impossible at catalogue scale.

    The Gramian trick: split the confidence into a baseline of 1 everywhere
    plus a correction on the observed entries only. The baseline part is
    Y^T Y, which is the SAME k-by-k matrix for every row and is computed ONCE
    per half-step. Only the correction depends on the row, and it touches
    just that row's observed entries. Cost drops to O(|O| * k^2 + m * k^3).
    """
    rows = indptr.size - 1
    k = fixed.shape[1]

    # Computed once, reused by every row: this single line is the whole trick.
    gramian = fixed.T @ fixed + regularization * np.eye(k)

    updated = np.empty((rows, k), dtype=np.float64)     # allocated once
    accumulator = np.empty((k, k), dtype=np.float64)    # reused per row
    target = np.empty(k, dtype=np.float64)

    for row in range(rows):
        start, stop = indptr[row], indptr[row + 1]
        if start == stop:
            updated[row] = 0.0                          # cold start
            continue

        columns = indices[start:stop]
        confidence = alpha * values[start:stop]         # the correction, c - 1
        partner = fixed[columns]                        # (nnz, k)

        # accumulator = Y^T Y + Y_o^T diag(c - 1) Y_o + lambda I
        np.copyto(accumulator, gramian)
        accumulator += (partner * confidence[:, None]).T @ partner

        # Target is (c - 1 + 1) on observed entries and 0 elsewhere, so the
        # right-hand side touches only the observed rows.
        np.matmul(partner.T, confidence + 1.0, out=target)

        # Cholesky, not an explicit inverse: the system is symmetric positive
        # definite by construction, and inverting it would be both slower and
        # worse conditioned for a row with few observations.
        updated[row] = cho_solve(cho_factor(accumulator, lower=True), target)

    return updated


def fit_implicit(
    indptr: NDArray,
    indices: NDArray,
    values: Vector,
    t_indptr: NDArray,
    t_indices: NDArray,
    t_values: Vector,
    n_users: int,
    n_items: int,
    k: int = 64,
    regularization: float = 0.01,
    alpha: float = 40.0,
    iterations: int = 15,
    seed: int = 0,
) -> tuple[Matrix, Matrix]:
    rng = np.random.default_rng(seed)
    # C-contiguous float64: every half-step forms Y^T Y over these, and a
    # non-contiguous or float32 array would force a copy on each one.
    user_factors = np.ascontiguousarray(rng.normal(0.0, 0.01, size=(n_users, k)))
    item_factors = np.ascontiguousarray(rng.normal(0.0, 0.01, size=(n_items, k)))

    for _ in range(iterations):
        user_factors = solve_side_implicit(
            indptr, indices, values, item_factors, regularization, alpha
        )
        item_factors = solve_side_implicit(
            t_indptr, t_indices, t_values, user_factors, regularization, alpha
        )

    return user_factors, item_factors`,
        rationale:
          'The model changes to implicit feedback, which is what most real systems actually have, and that change introduces a cost problem the trick then solves. With no negatives, every unobserved pair is a weak negative, so each row’s normal equations naively sum over the entire catalogue — O(m·n·k²), which is impossible at scale. Splitting the confidence into a baseline of one everywhere plus a correction on observed entries only makes the baseline term the same k-by-k Gramian for every row: computed once per half-step, reused by all of them, with only the correction depending on the row. That single line takes the cost back to linear in the observed entries. The solves become Cholesky rather than explicit inverses, and the per-row buffers are allocated once.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The shared Gramian is one GEMM per half-step rather than a per-row sum over the catalogue, and each row’s correction is a small weighted product over its observed entries only.',
            tradeoff: 'The identity depends on the confidence baseline being exactly uniform; any per-pair weighting scheme that breaks that assumption invalidates the shared term and returns the cost to O(m·n·k^2).',
          },
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'The k-by-k system is symmetric positive definite by construction, so a Cholesky factorization solves it at half the cost of general elimination and far better conditioned than forming an inverse.',
            tradeoff: 'Cholesky fails outright if the accumulated matrix loses positive definiteness through round-off on a row with very few observations, so the regularizer is load-bearing rather than merely helpful.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The output factors, the per-row accumulator and the right-hand side are allocated once and rewritten per row, rather than allocating three arrays per row across millions of rows.',
            tradeoff: 'The buffers are shared mutable state, so the function is not reentrant and the row loop cannot be parallelized as written without giving each worker its own copies.',
          },
        ],
        libraryName: 'NumPy + SciPy',
        profile: 'O(|O| * k^2 + (m + n) * k^3) per sweep, versus O(m * n * k^2) naively. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Matrix factorization by SGD - the objective, transcribed.
#include <algorithm>
#include <cstddef>
#include <random>
#include <vector>

struct Observation {
  std::size_t user;
  std::size_t item;
  double rating;
};

// For every OBSERVED entry, compute the error and nudge both factor vectors
// and both biases. The loop runs over observations, never over the matrix -
// a blank is never visited, which is the whole difference from an SVD.
void Fit(std::vector<Observation> observations, std::size_t n_users, std::size_t n_items,
         std::size_t k, double lr, double reg, int epochs, unsigned seed,
         std::vector<std::vector<double>>& P, std::vector<std::vector<double>>& Q,
         std::vector<double>& user_bias, std::vector<double>& item_bias, double& mu) {
  std::mt19937 generator(seed);
  std::normal_distribution<double> init(0.0, 0.1);

  // Small random init: zeros would make every gradient zero, since the
  // gradient with respect to p_u is proportional to q_i and vice versa.
  P.assign(n_users, std::vector<double>(k, 0.0));
  Q.assign(n_items, std::vector<double>(k, 0.0));
  for (auto& row : P) for (double& value : row) value = init(generator);
  for (auto& row : Q) for (double& value : row) value = init(generator);

  user_bias.assign(n_users, 0.0);
  item_bias.assign(n_items, 0.0);

  double total = 0.0;
  for (const Observation& observation : observations) total += observation.rating;
  mu = total / static_cast<double>(observations.size());

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::shuffle(observations.begin(), observations.end(), generator);

    for (const Observation& observation : observations) {
      double dot = 0.0;
      for (std::size_t f = 0; f < k; ++f) {
        dot += P[observation.user][f] * Q[observation.item][f];
      }
      const double prediction =
          mu + user_bias[observation.user] + item_bias[observation.item] + dot;
      const double error = observation.rating - prediction;

      // Biases first: they explain more of the variance than the factors do,
      // and cost two parameters rather than k.
      user_bias[observation.user] += lr * (error - reg * user_bias[observation.user]);
      item_bias[observation.item] += lr * (error - reg * item_bias[observation.item]);

      // Both vectors move together, each toward the other scaled by the
      // error - so both must be read before either is written.
      for (std::size_t f = 0; f < k; ++f) {
        const double p_uf = P[observation.user][f];
        const double q_if = Q[observation.item][f];
        P[observation.user][f] += lr * (error * q_if - reg * p_uf);
        Q[observation.item][f] += lr * (error * p_uf - reg * q_if);
      }
    }
  }
}`,
        profile: 'O(|O| * k) per epoch, inherently sequential — two observations sharing a user or item write the same vector.',
      },
      'make-it-right': {
        code: `// Matrix factorization by ALS - CSR, flat factors, Cholesky, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// CSR: for row r, entries live at indices[indptr[r], indptr[r + 1]).
// Both orientations are needed - one half-step walks users, the other walks
// items - so the transpose is built once rather than searched for repeatedly.
struct CsrMatrix {
  std::vector<std::size_t> indptr;
  std::vector<std::size_t> indices;
  std::vector<double> values;
  std::size_t rows = 0;
  std::size_t cols = 0;

  [[nodiscard]] std::pair<std::span<const std::size_t>, std::span<const double>> Row(
      std::size_t index) const {
    const std::size_t start = indptr[index];
    const std::size_t count = indptr[index + 1] - start;
    return {std::span<const std::size_t>(indices.data() + start, count),
            std::span<const double>(values.data() + start, count)};
  }
};

namespace {

// Cholesky solve of a symmetric positive-definite k-by-k system, in place.
// The ALS normal equations are SPD by construction with a positive
// regularizer, so paying for general elimination with pivoting buys nothing.
void SolveSpd(std::vector<double>& a, std::vector<double>& b, std::size_t k) {
  for (std::size_t j = 0; j < k; ++j) {
    double diagonal = a[j * k + j];
    for (std::size_t m = 0; m < j; ++m) diagonal -= a[j * k + m] * a[j * k + m];
    if (diagonal <= 0.0) throw std::runtime_error("normal equations lost positive definiteness");
    a[j * k + j] = std::sqrt(diagonal);

    for (std::size_t i = j + 1; i < k; ++i) {
      double value = a[i * k + j];
      for (std::size_t m = 0; m < j; ++m) value -= a[i * k + m] * a[j * k + m];
      a[i * k + j] = value / a[j * k + j];
    }
  }

  for (std::size_t i = 0; i < k; ++i) {
    for (std::size_t m = 0; m < i; ++m) b[i] -= a[i * k + m] * b[m];
    b[i] /= a[i * k + i];
  }
  for (std::size_t step = 0; step < k; ++step) {
    const std::size_t i = k - 1 - step;
    for (std::size_t m = i + 1; m < k; ++m) b[i] -= a[m * k + i] * b[m];
    b[i] /= a[i * k + i];
  }
}

}  // namespace

class FactorModel {
 public:
  FactorModel(std::size_t n_users, std::size_t n_items, std::size_t k)
      : k_(k),
        user_factors_(n_users * k, 0.0),
        item_factors_(n_items * k, 0.0),
        user_bias_(n_users, 0.0),
        item_bias_(n_items, 0.0) {
    if (k_ == 0) throw std::invalid_argument("k must be at least 1");
  }

  [[nodiscard]] double Predict(std::size_t user, std::size_t item) const {
    const double* p = user_factors_.data() + user * k_;
    const double* q = item_factors_.data() + item * k_;
    double dot = 0.0;
    for (std::size_t f = 0; f < k_; ++f) dot += p[f] * q[f];
    return global_mean_ + user_bias_[user] + item_bias_[item] + dot;
  }

  void Fit(const CsrMatrix& by_user, const CsrMatrix& by_item, double regularization,
           int iterations, unsigned seed) {
    if (by_user.rows != user_bias_.size() || by_item.rows != item_bias_.size()) {
      throw std::invalid_argument("matrix shapes do not match the model");
    }
    if (regularization <= 0.0) {
      throw std::invalid_argument("regularization must be positive; sparse rows overfit without it");
    }

    std::mt19937 generator(seed);
    std::normal_distribution<double> init(0.0, 0.1);
    for (double& value : user_factors_) value = init(generator);
    for (double& value : item_factors_) value = init(generator);

    global_mean_ = std::accumulate(by_user.values.begin(), by_user.values.end(), 0.0) /
                   static_cast<double>(by_user.values.size());

    for (int iteration = 0; iteration < iterations; ++iteration) {
      SolveSide(by_user, item_factors_, user_bias_, item_bias_, regularization, user_factors_);
      SolveSide(by_item, user_factors_, item_bias_, user_bias_, regularization, item_factors_);
    }
  }

 private:
  // One ALS half-step. Every row is a ridge regression of its observed
  // residuals on the fixed side's vectors - a k-by-k system. Rows are
  // independent of one another, which is what makes ALS parallelizable and
  // SGD not.
  void SolveSide(const CsrMatrix& matrix, const std::vector<double>& fixed,
                 std::vector<double>& bias_self, const std::vector<double>& bias_other,
                 double regularization, std::vector<double>& target) const {
    std::vector<double> gram(k_ * k_);
    std::vector<double> rhs(k_);

    for (std::size_t row = 0; row < matrix.rows; ++row) {
      const auto [columns, values] = matrix.Row(row);
      if (columns.empty()) continue;                 // cold start: no equation

      // Bias in closed form: the optimal offset is the mean of the residuals,
      // shrunk by the regularizer.
      double bias_total = 0.0;
      for (std::size_t e = 0; e < columns.size(); ++e) {
        const double* partner = fixed.data() + columns[e] * k_;
        const double* self = target.data() + row * k_;
        double dot = 0.0;
        for (std::size_t f = 0; f < k_; ++f) dot += self[f] * partner[f];
        bias_total += values[e] - global_mean_ - bias_other[columns[e]] - dot;
      }
      bias_self[row] = bias_total / (regularization + static_cast<double>(columns.size()));

      std::fill(gram.begin(), gram.end(), 0.0);
      std::fill(rhs.begin(), rhs.end(), 0.0);

      for (std::size_t e = 0; e < columns.size(); ++e) {
        const double* partner = fixed.data() + columns[e] * k_;
        const double residual =
            values[e] - global_mean_ - bias_self[row] - bias_other[columns[e]];
        for (std::size_t f = 0; f < k_; ++f) {
          rhs[f] += partner[f] * residual;
          for (std::size_t g = 0; g <= f; ++g) gram[f * k_ + g] += partner[f] * partner[g];
        }
      }

      // Lambda scaled by observation count: a row with three entries is
      // shrunk harder than one with three hundred. It is also what keeps this
      // tiny system invertible.
      const double scaled = regularization * static_cast<double>(columns.size());
      for (std::size_t f = 0; f < k_; ++f) {
        gram[f * k_ + f] += scaled;
        for (std::size_t g = 0; g < f; ++g) gram[g * k_ + f] = gram[f * k_ + g];
      }

      SolveSpd(gram, rhs, k_);
      std::copy(rhs.begin(), rhs.end(), target.begin() + static_cast<long>(row * k_));
    }
  }

  std::size_t k_;
  std::vector<double> user_factors_;   // row-major (m, k), owned
  std::vector<double> item_factors_;   // row-major (n, k), owned
  std::vector<double> user_bias_;
  std::vector<double> item_bias_;
  double global_mean_ = 0.0;
};`,
        rationale:
          'The optimizer changes from SGD to alternating least squares — a change of kind, not of style. Each half-step is a ridge regression per row with a closed-form solution, so convergence takes tens of sweeps rather than many noisy passes, and every row within a half-step becomes independent, which is the property the next stage parallelizes and which SGD structurally lacks. Storage moves to CSR in both orientations and to flat row-major factor buffers, so neither half-step searches for its entries and every inner walk is contiguous. The k-by-k system is solved by Cholesky over the lower triangle only, since the ALS normal equations are symmetric positive definite by construction.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(|O| * k^2 + (m + n) * k^3) per sweep, with contiguous factor access and one scratch system reused across rows.',
      },
      'make-it-fast': {
        code: `// Matrix factorization - ALS half-steps parallelized across rows.
#include <Eigen/Cholesky>
#include <Eigen/Dense>
#include <cstddef>
#include <stdexcept>
#include <vector>

using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// One implicit-feedback ALS half-step.
//
// Implicit feedback has no negatives: every unobserved pair is a weak negative
// with confidence 1, every observed one a strong positive with confidence
// 1 + alpha*r. Written naively each row's system sums over the whole catalogue
// - O(m * n * k^2), impossible at scale.
//
// The Gramian trick: split confidence into a baseline of 1 everywhere plus a
// correction on the observed entries. The baseline term is Y^T Y, the SAME
// k-by-k matrix for every row, computed ONCE per half-step. Only the
// correction is row-specific. Cost returns to O(|O| * k^2 + m * k^3).
RowMajorMatrix SolveSideImplicit(const std::vector<std::size_t>& indptr,
                                 const std::vector<std::size_t>& indices,
                                 const std::vector<double>& values,
                                 const RowMajorMatrix& fixed,
                                 double regularization, double alpha) {
  const auto rows = static_cast<Eigen::Index>(indptr.size() - 1);
  const Eigen::Index k = fixed.cols();

  // Computed once, reused by every row: this is the whole trick.
  const Eigen::MatrixXd gramian =
      fixed.transpose() * fixed + regularization * Eigen::MatrixXd::Identity(k, k);

  RowMajorMatrix updated(rows, k);

  // Rows are independent within a half-step - the defining property of ALS,
  // and exactly what SGD cannot offer, since two observations sharing a user
  // would race on the same vector.
#pragma omp parallel for schedule(dynamic)
  for (Eigen::Index row = 0; row < rows; ++row) {
    const std::size_t start = indptr[static_cast<std::size_t>(row)];
    const std::size_t stop = indptr[static_cast<std::size_t>(row) + 1];
    if (start == stop) {
      updated.row(row).setZero();                 // cold start
      continue;
    }

    const auto count = static_cast<Eigen::Index>(stop - start);
    RowMajorMatrix partner(count, k);
    Eigen::VectorXd confidence(count);
    for (Eigen::Index e = 0; e < count; ++e) {
      partner.row(e) = fixed.row(static_cast<Eigen::Index>(indices[start + static_cast<std::size_t>(e)]));
      confidence[e] = alpha * values[start + static_cast<std::size_t>(e)];
    }

    // accumulator = Y^T Y + Y_o^T diag(c - 1) Y_o + lambda I, fused so the
    // weighted product is evaluated in one pass with no temporary.
    Eigen::MatrixXd accumulator = gramian;
    accumulator.noalias() += partner.transpose() * confidence.asDiagonal() * partner;

    const Eigen::VectorXd target =
        partner.transpose() * (confidence.array() + 1.0).matrix();

    // LLT, not an explicit inverse: the system is SPD by construction, and
    // inverting it would be slower and worse conditioned on a sparse row.
    const Eigen::LLT<Eigen::MatrixXd> llt(accumulator);
    if (llt.info() != Eigen::Success) {
      throw std::runtime_error("normal equations lost positive definiteness");
    }
    updated.row(row) = llt.solve(target).transpose();
  }

  return updated;
}`,
        rationale:
          'Two things change together. The model moves to implicit feedback — what most real systems actually have — which introduces the cost problem the Gramian trick then removes: with every unobserved pair acting as a weak negative, the naive normal equations sum over the whole catalogue per row, and factoring out the uniform baseline makes that term one shared k-by-k matrix computed once per half-step. Then the row loop parallelizes, which is the payoff for having chosen ALS at all: rows are independent within a half-step, so this is a pure fork-join, where SGD would have two observations sharing a user racing on the same vector.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Within an ALS half-step every row solves its own independent system and writes only its own output row, so the loop partitions across cores with no synchronization at all.',
            tradeoff: 'Each thread allocates its own partner block and k-by-k accumulator, so memory scales with core count — and a dynamic schedule is needed because row lengths vary enormously in a real interaction matrix.',
          },
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'The shared Gramian is one large GEMM per half-step, and each row’s Cholesky and weighted product go to blocked kernels rather than hand-written triple loops.',
            tradeoff: 'The per-row systems are k-by-k with k under 200, which is below the size where a blocked kernel beats a simple loop — the dispatch overhead is paid on every row and only the shared Gramian clearly wins.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The weighted product is one fused expression with noalias(), so the diagonal scaling and the accumulation evaluate in a single pass with no intermediate matrix per row.',
            tradeoff: 'noalias() is an unchecked assertion — if the destination ever aliased an operand the result is silently wrong, which is a worse failure than being slow.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(|O| * k^2 + m * k^3) per half-step across cores, versus O(m * n * k^2) naively. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Matrix factorization by SGD - the objective, transcribed.

pub struct Observation {
    pub user: usize,
    pub item: usize,
    pub rating: f64,
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
    fn small(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64 * 0.2 - 0.1
    }
    fn below(&mut self, limit: usize) -> usize {
        (self.next_u64() % limit as u64) as usize
    }
}

/// For every OBSERVED entry, compute the error and nudge both factor vectors
/// and both biases. The loop runs over observations, never over the matrix -
/// a blank is never visited, which is the whole difference from an SVD.
pub fn fit(
    observations: &mut [Observation],
    n_users: usize,
    n_items: usize,
    k: usize,
    lr: f64,
    reg: f64,
    epochs: usize,
    seed: u64,
) -> (Vec<Vec<f64>>, Vec<Vec<f64>>, Vec<f64>, Vec<f64>, f64) {
    let mut rng = Lcg::new(seed);

    // Small random init: zeros would make every gradient zero, since the
    // gradient with respect to p_u is proportional to q_i and vice versa.
    let mut p: Vec<Vec<f64>> = (0..n_users)
        .map(|_| (0..k).map(|_| rng.small()).collect())
        .collect();
    let mut q: Vec<Vec<f64>> = (0..n_items)
        .map(|_| (0..k).map(|_| rng.small()).collect())
        .collect();
    let mut user_bias = vec![0.0; n_users];
    let mut item_bias = vec![0.0; n_items];

    let mu = observations.iter().map(|o| o.rating).sum::<f64>() / observations.len() as f64;

    for _ in 0..epochs {
        for index in (1..observations.len()).rev() {
            observations.swap(index, rng.below(index + 1));
        }

        for observation in observations.iter() {
            let mut dot = 0.0;
            for f in 0..k {
                dot += p[observation.user][f] * q[observation.item][f];
            }
            let prediction = mu + user_bias[observation.user] + item_bias[observation.item] + dot;
            let error = observation.rating - prediction;

            // Biases first: they explain more of the variance than the
            // factors do, and cost two parameters rather than k.
            user_bias[observation.user] += lr * (error - reg * user_bias[observation.user]);
            item_bias[observation.item] += lr * (error - reg * item_bias[observation.item]);

            // Both vectors move together, each toward the other scaled by the
            // error - so both must be read before either is written.
            for f in 0..k {
                let p_uf = p[observation.user][f];
                let q_if = q[observation.item][f];
                p[observation.user][f] += lr * (error * q_if - reg * p_uf);
                q[observation.item][f] += lr * (error * p_uf - reg * q_if);
            }
        }
    }

    (p, q, user_bias, item_bias, mu)
}`,
        profile: 'O(|O| * k) per epoch, every index bounds-checked, and inherently sequential — two observations sharing a user write the same vector.',
      },
      'make-it-right': {
        code: `//! Matrix factorization by ALS - typed errors, CSR, Cholesky, flat factors.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Rank { value: usize },
    Regularization { value: f64 },
    NotPositiveDefinite { row: usize },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "no observed entries"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Rank { value } => write!(f, "rank must be at least 1, got {value}"),
            Self::Regularization { value } => write!(
                f,
                "regularization must be positive, got {value}; sparse rows overfit exactly without it"
            ),
            Self::NotPositiveDefinite { row } => {
                write!(f, "normal equations for row {row} lost positive definiteness")
            }
        }
    }
}

impl std::error::Error for FitError {}

/// Latent rank. A newtype because rank, iteration count and the two dimension
/// counts are all bare usize at every call site.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rank(usize);

impl Rank {
    pub fn new(value: usize) -> Result<Self, FitError> {
        if value == 0 {
            return Err(FitError::Rank { value });
        }
        Ok(Self(value))
    }
}

/// Regularization strength. A newtype because zero is not merely a poor value:
/// a user with three observed entries will reproduce them exactly and
/// generalize to nothing.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Regularization(f64);

impl Regularization {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(FitError::Regularization { value });
        }
        Ok(Self(value))
    }
}

/// CSR: for row r, entries live at indices[indptr[r]..indptr[r + 1]].
/// Both orientations are needed - one half-step walks users, the other items.
pub struct Csr {
    pub indptr: Vec<usize>,
    pub indices: Vec<usize>,
    pub values: Vec<f64>,
    pub rows: usize,
}

impl Csr {
    #[inline]
    fn row(&self, index: usize) -> (&[usize], &[f64]) {
        let start = self.indptr[index];
        let stop = self.indptr[index + 1];
        (&self.indices[start..stop], &self.values[start..stop])
    }
}

/// Cholesky solve of the SPD k-by-k system, in place. The ALS normal
/// equations are positive definite by construction with a positive
/// regularizer, so general elimination with pivoting buys nothing.
fn solve_spd(a: &mut [f64], b: &mut [f64], k: usize, row: usize) -> Result<(), FitError> {
    for j in 0..k {
        let mut diagonal = a[j * k + j];
        for m in 0..j {
            diagonal -= a[j * k + m] * a[j * k + m];
        }
        if diagonal <= 0.0 {
            return Err(FitError::NotPositiveDefinite { row });
        }
        a[j * k + j] = diagonal.sqrt();

        for i in (j + 1)..k {
            let mut value = a[i * k + j];
            for m in 0..j {
                value -= a[i * k + m] * a[j * k + m];
            }
            a[i * k + j] = value / a[j * k + j];
        }
    }

    for i in 0..k {
        let mut value = b[i];
        for m in 0..i {
            value -= a[i * k + m] * b[m];
        }
        b[i] = value / a[i * k + i];
    }
    for step in 0..k {
        let i = k - 1 - step;
        let mut value = b[i];
        for m in (i + 1)..k {
            value -= a[m * k + i] * b[m];
        }
        b[i] = value / a[i * k + i];
    }
    Ok(())
}

pub struct FactorModel {
    pub user_factors: Vec<f64>,     // row-major (m, k)
    pub item_factors: Vec<f64>,     // row-major (n, k)
    pub user_bias: Vec<f64>,
    pub item_bias: Vec<f64>,
    pub global_mean: f64,
    k: usize,
}

impl FactorModel {
    #[must_use]
    pub fn predict(&self, user: usize, item: usize) -> f64 {
        let p = &self.user_factors[user * self.k..(user + 1) * self.k];
        let q = &self.item_factors[item * self.k..(item + 1) * self.k];
        self.global_mean
            + self.user_bias[user]
            + self.item_bias[item]
            + p.iter().zip(q).map(|(a, b)| a * b).sum::<f64>()
    }

    pub fn fit(
        by_user: &Csr,
        by_item: &Csr,
        rank: Rank,
        regularization: Regularization,
        iterations: usize,
        seed: u64,
    ) -> Result<Self, FitError> {
        if by_user.values.is_empty() {
            return Err(FitError::Empty);
        }
        if by_user.values.len() != by_item.values.len() {
            return Err(FitError::ShapeMismatch {
                expected: by_user.values.len(),
                found: by_item.values.len(),
            });
        }

        let k = rank.0;
        let mut rng = Lcg::new(seed);
        let mut model = Self {
            user_factors: (0..by_user.rows * k).map(|_| rng.small()).collect(),
            item_factors: (0..by_item.rows * k).map(|_| rng.small()).collect(),
            user_bias: vec![0.0; by_user.rows],
            item_bias: vec![0.0; by_item.rows],
            global_mean: by_user.values.iter().sum::<f64>() / by_user.values.len() as f64,
            k,
        };

        for _ in 0..iterations {
            let items = model.item_factors.clone();
            let item_bias = model.item_bias.clone();
            model.solve_side(by_user, &items, &item_bias, regularization.0, true)?;

            let users = model.user_factors.clone();
            let user_bias = model.user_bias.clone();
            model.solve_side(by_item, &users, &user_bias, regularization.0, false)?;
        }

        Ok(model)
    }

    /// One ALS half-step. Every row is a ridge regression of its observed
    /// residuals on the fixed side's vectors - a k-by-k system. Rows are
    /// independent of one another, which is what makes ALS parallelizable and
    /// SGD not.
    fn solve_side(
        &mut self,
        matrix: &Csr,
        fixed: &[f64],
        bias_other: &[f64],
        regularization: f64,
        is_user_side: bool,
    ) -> Result<(), FitError> {
        let k = self.k;
        let mut gram = vec![0.0_f64; k * k];
        let mut rhs = vec![0.0_f64; k];

        for row in 0..matrix.rows {
            let (columns, values) = matrix.row(row);
            if columns.is_empty() {
                continue;                       // cold start: no equation
            }

            let self_factors = if is_user_side { &self.user_factors } else { &self.item_factors };
            let current = &self_factors[row * k..(row + 1) * k];

            // Bias in closed form: the optimal offset is the mean of the
            // residuals, shrunk by the regularizer.
            let bias_total: f64 = columns
                .iter()
                .zip(values)
                .map(|(&column, &value)| {
                    let partner = &fixed[column * k..(column + 1) * k];
                    let dot: f64 = current.iter().zip(partner).map(|(a, b)| a * b).sum();
                    value - self.global_mean - bias_other[column] - dot
                })
                .sum();
            let bias = bias_total / (regularization + columns.len() as f64);

            if is_user_side {
                self.user_bias[row] = bias;
            } else {
                self.item_bias[row] = bias;
            }

            gram.fill(0.0);
            rhs.fill(0.0);

            for (&column, &value) in columns.iter().zip(values) {
                let partner = &fixed[column * k..(column + 1) * k];
                let residual = value - self.global_mean - bias - bias_other[column];
                for f in 0..k {
                    rhs[f] += partner[f] * residual;
                    for g in 0..=f {
                        gram[f * k + g] += partner[f] * partner[g];
                    }
                }
            }

            // Lambda scaled by observation count: a row with three entries is
            // shrunk harder than one with three hundred, and this is also
            // what keeps the tiny system invertible.
            let scaled = regularization * columns.len() as f64;
            for f in 0..k {
                gram[f * k + f] += scaled;
                for g in 0..f {
                    gram[g * k + f] = gram[f * k + g];
                }
            }

            solve_spd(&mut gram, &mut rhs, k, row)?;

            let target = if is_user_side {
                &mut self.user_factors
            } else {
                &mut self.item_factors
            };
            target[row * k..(row + 1) * k].copy_from_slice(&rhs);
        }

        Ok(())
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
    fn small(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64 * 0.2 - 0.1
    }
}
`,
        rationale:
          'SGD becomes alternating least squares, which is a change of kind: each half-step has a closed-form solution per row, so convergence takes tens of sweeps rather than many noisy passes, and every row within a half-step becomes independent — the property the next stage parallelizes and which SGD structurally cannot offer. Storage moves to CSR in both orientations and flat row-major factor buffers walked as slices, so neither half-step searches for its entries. Errors become a typed Result including the lost-positive-definiteness case, and rank and regularization get validated newtypes because a zero regularizer is not a poor setting but a model that reproduces sparse rows exactly.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(|O| * k^2 + (m + n) * k^3) per sweep, contiguous factor access, one scratch system reused across rows.',
      },
      'make-it-fast': {
        code: `//! Matrix factorization - ALS half-steps as a parallel map over rows.

use rayon::prelude::*;

/// One implicit-feedback ALS half-step.
///
/// Implicit feedback has no negatives: every unobserved pair is a weak
/// negative with confidence 1, each observed one a strong positive with
/// confidence 1 + alpha*r. Written naively, each row's system sums over the
/// entire catalogue - O(m * n * k^2), impossible at scale.
///
/// The Gramian trick: split confidence into a baseline of 1 everywhere plus a
/// correction on the observed entries. The baseline term is Y^T Y, the SAME
/// k-by-k matrix for every row, computed ONCE per half-step. Only the
/// correction is row-specific, and it touches just that row's entries. Cost
/// returns to O(|O| * k^2 + m * k^3).
#[must_use]
pub fn solve_side_implicit(
    indptr: &[usize],
    indices: &[usize],
    values: &[f64],
    fixed: &[f64],
    k: usize,
    regularization: f64,
    alpha: f64,
) -> Vec<f64> {
    let rows = indptr.len() - 1;

    // Computed once, reused by every row: this is the whole trick. The sum is
    // over independent rows of the fixed side, so it is a parallel reduction.
    let gramian: Vec<f64> = fixed
        .par_chunks_exact(k)
        .fold(
            || vec![0.0_f64; k * k],
            |mut acc, vector| {
                for f in 0..k {
                    for g in 0..=f {
                        acc[f * k + g] += vector[f] * vector[g];
                    }
                }
                acc
            },
        )
        .reduce(
            || vec![0.0_f64; k * k],
            |mut a, b| {
                for (slot, value) in a.iter_mut().zip(b) {
                    *slot += value;
                }
                a
            },
        );

    // Rows are independent within a half-step - the defining property of ALS,
    // and exactly what SGD cannot offer, since two observations sharing a
    // user would race on the same vector.
    (0..rows)
        .into_par_iter()
        .flat_map_iter(|row| {
            let start = indptr[row];
            let stop = indptr[row + 1];

            let mut gram = Vec::with_capacity(k * k);
            gram.extend_from_slice(&gramian);
            let mut rhs = vec![0.0_f64; k];

            for entry in start..stop {
                let partner = &fixed[indices[entry] * k..(indices[entry] + 1) * k];
                let confidence = alpha * values[entry];

                for f in 0..k {
                    rhs[f] += partner[f] * (confidence + 1.0);
                    for g in 0..=f {
                        gram[f * k + g] += confidence * partner[f] * partner[g];
                    }
                }
            }

            for f in 0..k {
                gram[f * k + f] += regularization;
                for g in 0..f {
                    gram[g * k + f] = gram[f * k + g];
                }
            }

            if start == stop {
                return vec![0.0_f64; k].into_iter();   // cold start
            }

            solve_spd_in_place(&mut gram, &mut rhs, k);
            rhs.into_iter()
        })
        .collect()
}

/// Cholesky solve of the SPD k-by-k system, in place.
#[inline]
fn solve_spd_in_place(a: &mut [f64], b: &mut [f64], k: usize) {
    for j in 0..k {
        let mut diagonal = a[j * k + j];
        for m in 0..j {
            diagonal -= a[j * k + m] * a[j * k + m];
        }
        a[j * k + j] = diagonal.max(1e-12).sqrt();

        for i in (j + 1)..k {
            let mut value = a[i * k + j];
            for m in 0..j {
                value -= a[i * k + m] * a[j * k + m];
            }
            a[i * k + j] = value / a[j * k + j];
        }
    }

    for i in 0..k {
        let mut value = b[i];
        for m in 0..i {
            value -= a[i * k + m] * b[m];
        }
        b[i] = value / a[i * k + i];
    }
    for step in 0..k {
        let i = k - 1 - step;
        let mut value = b[i];
        for m in (i + 1)..k {
            value -= a[m * k + i] * b[m];
        }
        b[i] = value / a[i * k + i];
    }
}
`,
        rationale:
          'Two changes that depend on each other. The model moves to implicit feedback — what most real systems have — which introduces a cost problem the Gramian trick removes: with every unobserved pair acting as a weak negative, the naive per-row system sums over the whole catalogue, and factoring out the uniform baseline turns that into one shared k-by-k matrix built once per half-step. Building that shared matrix is itself an associative sum over rows, so it is a fold-then-reduce. Then the row loop becomes a parallel map, which is the payoff for having chosen ALS: rows are independent within a half-step, where SGD would have two observations sharing a user racing on one vector.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Rows within an ALS half-step are fully independent, and the shared Gramian is an associative sum over rows — so both the setup and the solve phase are parallel with no locking and no atomics.',
            tradeoff: 'Each worker holds its own k-by-k accumulator during the fold, so memory scales with core count times k squared; and rows vary enormously in length, so a naive partition leaves some workers idle.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each row’s working system is allocated at exactly k-by-k before being filled from the shared Gramian, so no reallocation happens inside the per-row solve.',
            tradeoff: 'Still one allocation per row rather than a reused buffer; eliminating that entirely would need a thread-local arena, which is a good deal more machinery for a k-by-k block.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Factor vectors are taken as contiguous slices of a flat row-major buffer, so both the Gramian accumulation and the per-row product are sequential reads the prefetcher can follow.',
            tradeoff: 'The caller must maintain the flat layout and the rank in sync by hand, and gathering the partner rows for a sparse row is still a scattered read into that buffer.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(|O| * k^2 + m * k^3) per half-step across cores, versus O(m * n * k^2) naively. Illustrative, not a measured benchmark.',
      },
    },
  },
};
