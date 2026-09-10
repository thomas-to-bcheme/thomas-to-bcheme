import type { AiMlModel } from '../../types';

/**
 * Naive Bayes — the first generative model in the section, and the one whose
 * central assumption is known to be false.
 *
 * Opens the probabilistic group because it is the smallest complete example of
 * the group's premise: model the distribution the data came from, then invert
 * it with Bayes' rule. It is also the cleanest illustration of a distinction
 * worth internalizing early — a model can rank correctly while its
 * probabilities are worthless, because argmax survives errors that calibration
 * does not.
 */
export const NAIVE_BAYES: AiMlModel = {
  slug: 'naive-bayes',
  name: 'Naive Bayes',
  aliases: ['Multinomial NB', 'Bernoulli NB', 'Gaussian NB', 'Idiot Bayes'],
  category: 'classical-ml',
  group: 'probabilistic',
  kind: 'model',

  paradigms: ['supervised'],
  // 'density-estimation' because the model fits p(x | c) explicitly — it is
  // generative, not discriminative — and 'anomaly-detection' follows from
  // scoring that density; see applications.featured['anomaly-detection'].
  taskTypes: ['classification', 'density-estimation', 'anomaly-detection'],
  paradigmNote:
    'Generative rather than discriminative: it models p(x, y) and derives p(y | x), where logistic regression models p(y | x) directly. That difference is why it can be trained in one counting pass, and why it needs far less data to become useful — and also why its probability estimates are unusable.',

  intuition:
    'Use Bayes’ rule to turn "how likely is this evidence under each class" into "how likely is each class given this evidence" — then make one deliberately false assumption to render it computable: pretend every feature is independent of every other, given the class. Modelling the true joint distribution of a thousand features is hopeless; modelling a thousand one-dimensional distributions is arithmetic. The assumption is wrong on essentially every real dataset, and the classifier works anyway, because picking the largest score does not require the scores to be correct — only correctly ordered.',

  objective: {
    kind: 'likelihood',
    expression: {
      formula:
        '\\hat{c}(\\mathbf{x}) = \\operatorname*{arg\\,max}_{c} \\; \\log P(c) + \\sum_{j=1}^{d} \\log P(x_j \\mid c)',
      symbols: [
        { symbol: 'P(c)', meaning: 'class prior — how common the class is before any evidence is seen' },
        { symbol: 'P(x_j \\mid c)', meaning: 'class-conditional likelihood of one feature, estimated independently of all others' },
        { symbol: '\\sum_j', meaning: 'the naive assumption itself: a sum of logs is a product of probabilities, which is only valid under independence' },
        { symbol: '\\log', meaning: 'not cosmetic — a product of thousands of probabilities underflows float64, and the log form is what makes the model implementable' },
      ],
    },
    reading:
      'Start from how common each class is, then add up the evidence each feature contributes for it, and pick the winner. The sum is where the naivety lives: adding log-likelihoods asserts that the features carry independent evidence, so two perfectly correlated features count twice. In text that is obviously false — "New" and "York" are not independent — and the consequence is precise. The ranking usually survives, because the double-counting tends to push every class in the same direction; the probabilities do not, because the accumulated overcounting saturates the winner at essentially 1.0.',
  },

  optimization: {
    method: 'Closed-form maximum likelihood — counting, in a single pass over the data',
    updateRule: {
      formula:
        '\\hat{P}(x_j = v \\mid c) = \\frac{N_{jvc} + \\alpha}{N_c + \\alpha \\lvert V_j \\rvert}, \\qquad \\hat{P}(c) = \\frac{N_c}{n}',
      symbols: [
        { symbol: 'N_{jvc}', meaning: 'how often feature j took value v among class-c examples' },
        { symbol: 'N_c', meaning: 'the count (or total token mass) of class c' },
        { symbol: '\\alpha', meaning: 'smoothing pseudo-count; alpha = 1 is Laplace, and alpha = 0 breaks on any unseen value' },
        { symbol: '\\lvert V_j \\rvert', meaning: 'number of values feature j can take — the denominator correction that keeps the smoothed estimates a distribution' },
      ],
    },
    rationale:
      'There is no iterative optimization at all: under the independence assumption the likelihood factorizes completely, so the maximum-likelihood estimate for each parameter is a ratio of counts and can be written down directly. That is the entire fit. The only real decision is the smoothing constant, and it is not optional — with alpha = 0, a single feature value never seen with a given class assigns that class probability zero, and one zero annihilates the whole product no matter how much evidence the other thousand features supplied. Smoothing exists to stop one unseen word from vetoing every other word in the document.',
    hyperparameters: [
      { name: 'alpha (smoothing)', role: 'Pseudo-count added to every cell. The only tuned parameter, and it must be non-zero', typicalRange: '0.01 to 1.0; smaller for large vocabularies, cross-validated' },
      { name: 'variant', role: 'Multinomial for counts, Bernoulli for presence/absence, Gaussian for continuous features, Complement for imbalanced text — a choice about the feature distribution, not a tunable' },
      { name: 'fit_prior', role: 'Whether to learn class priors from the data or assume them uniform; uniform is often better when the training class balance is an artefact of collection' },
      { name: 'binarization threshold', role: 'Bernoulli NB only — the cutoff that turns counts into presence, which matters more than it looks on short documents' },
    ],
    convergence:
      'Nothing iterates, so nothing converges or fails to. The failure modes are about what the estimates mean rather than whether they are found. The first is calibration: multiplying correlated evidence as if it were independent drives the posterior to 0 or 1 almost regardless of the input, so the reported confidence is not a probability and must never be thresholded as one. The second is correlated redundancy: duplicating a feature doubles its influence, which means feature selection is a genuine accuracy intervention here rather than an efficiency one. The third is numerical and is the reason for the log form — a product of ten thousand probabilities underflows to exactly zero in double precision, and every class then ties at zero.',
    complexity:
      'Training: O(n·d) time in a single streaming pass, O(C·V) memory for the count table where C is the class count and V the vocabulary. Prediction: O(C·d) per example, or O(C·nnz) on sparse features, which for text means only the words actually present are ever touched. It is the cheapest model in this section by a wide margin, and the only one that trains without holding the dataset in memory.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'The model has no representation of order, lag, or a continuous horizon: applying it requires discretizing the target into classes and treating each observation as exchangeable, which discards exactly the temporal dependence that made it a forecasting problem.',
      },
      'anomaly-detection': {
        fit: 'adapted',
        how: 'Because the model is generative, it gives you p(x) directly — fit it on normal data and score new points by their joint log-likelihood, flagging the improbable ones. On categorical or count data this is genuinely convenient, since the per-feature log-probabilities also decompose the score: the alert can name which feature made the point unusual, without a separate attribution method.',
        where: [
          'Log and audit-event screening, where records are categorical and a rare combination of common values is the signal',
          'Intrusion-detection baselines profiling normal command, port, or protocol usage',
          'Data-quality screening on high-cardinality categorical records before they enter a warehouse',
        ],
        why: 'It is fast, streaming, and self-explaining, which makes it a reasonable first detector on categorical data where distance-based methods have no natural metric. But the independence assumption bites much harder here than in classification: the score is an actual density estimate rather than a ranking, and a density built by multiplying correlated marginals is badly wrong in a way that argmax was shielding you from. Use it when the alternative is no detector; do not use it when the anomalies are defined by an unusual *combination* of individually ordinary values, which is precisely what independence cannot represent.',
        featurization: [
          'Fit on a confirmed-clean window; a contaminated fit raises the likelihood of the thing being hunted',
          'Smoothing is doing double duty here — it sets the floor on how improbable an unseen value can look, and therefore the maximum score any single feature can contribute',
          'Cap or bin high-cardinality features, or every rare-but-legitimate value scores as an anomaly',
        ],
        evaluation:
          'Precision@k against confirmed incidents with the threshold read from score quantiles on clean data. Check the per-feature contribution distribution too: if one feature dominates every alert, the detector has become a univariate rule with extra steps.',
        pitfalls: [
          'Reading the joint likelihood as a probability — it is not calibrated, and its scale shifts with the number of features present',
          'Documents or records of varying length producing systematically different scores, since more features means more log terms; normalize by length',
          'Correlated features multiplying their own rarity, so a single unusual entity spread across three columns scores as three independent surprises',
        ],
      },
      optimization: {
        fit: 'not-applicable',
        why: 'Nothing is optimized — the parameters are closed-form count ratios — and the output is a class label rather than an allocation under constraints, so there is neither a solver to study nor a decision to feed.',
      },
    },
    breadth: {
      'natural-language': {
        fit: 'primary',
        how: 'The canonical application, and the one the multinomial variant was designed for: represent a document as its token counts, estimate each word’s probability under each class by counting, and classify by the summed log-likelihood. Sparsity makes it exceptionally cheap — only the words actually present contribute, so a 50,000-word vocabulary costs nothing on a 200-word document.',
        where: [
          'Spam filtering, historically the deployment that made the method famous and still a live baseline',
          'Topic and intent classification when labelled data is scarce, where it beats discriminative models at small n',
          'Language identification and other high-class-count problems where per-class training cost matters',
          'The baseline any text classifier must beat before its cost can be justified',
        ],
        why: 'Text has exactly the structure that makes the method work despite its assumption: very high dimension, very sparse, and enough weakly-informative features that double-counting some correlations rarely flips the argmax. It also learns from very few examples, because estimating d univariate distributions needs far less data than estimating a joint one — which is a real asymptotic result, not a heuristic: the generative model reaches its (higher) error floor much faster than logistic regression reaches its lower one. It stops being the right choice as soon as data is plentiful, or when word order and negation carry the signal, which a bag of independent tokens cannot represent at all.',
        featurization: [
          'Multinomial on raw counts or tf-idf; Bernoulli on presence for very short texts where repetition carries no extra information',
          'Complement Naive Bayes when classes are imbalanced — it estimates each class against the complement and corrects the systematic bias toward frequent classes',
          'Keep the matrix sparse end to end; densifying a document-term matrix is what makes people conclude the method is slow',
          'Bigrams reintroduce a little of the order the independence assumption destroys, at a large cost in vocabulary size',
        ],
        evaluation:
          'Macro-F1 on a temporal split, since vocabulary drifts. Report accuracy against a majority-class baseline, and never report the predicted probabilities as confidence — inspect the top log-probability ratios per class instead, which are directly readable and where label leakage usually surfaces.',
        pitfalls: [
          'Fitting the vectorizer before splitting, leaking vocabulary and document frequencies',
          'Thresholding the posterior for a precision target: it sits at 0.9999 for almost everything, so the threshold has no usable dynamic range',
          'Very long documents dominating the count table for their class unless lengths are normalized',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'A first-pass triage model over categorical and count features — merchant category, device, channel, hour bucket — scoring transactions or claims in a single cheap pass so that an expensive model or a human reviewer only sees the survivors.',
        where: [
          'High-volume transaction pre-screening where per-item latency budget is measured in microseconds',
          'Claims and application triage on mostly categorical intake forms',
          'A fast interpretable baseline used to sanity-check a boosted model’s lift',
        ],
        why: 'It is essentially free to train and retrain, updates incrementally as counts arrive, and every score decomposes into per-feature contributions a reviewer can read. Those are real operational advantages in a domain where models are audited. What it cannot do is exactly what fraud detection usually requires — model interactions, since a transaction is suspicious because of a *combination* of ordinary attributes, and independence is the assumption that makes combinations invisible. It is a screen, not the model.',
        featurization: [
          'Bin continuous amounts into ordinal buckets rather than assuming a Gaussian, which transaction values never are',
          'Reduce cardinality of merchant and device identifiers, or every rare identifier becomes its own signal',
          'Handle class imbalance through the prior explicitly rather than resampling, since the prior is an estimated parameter here',
        ],
        evaluation:
          'PR-AUC and precision at a fixed alert budget rather than accuracy, on an out-of-time split. Compare against the interaction-aware model it is screening for, and measure what fraction of true positives it discards — that is the only number that matters for a screen.',
        pitfalls: [
          'Treating the posterior as a fraud probability in a risk-weighted decision; it is not calibrated and never will be',
          'Correlated identifiers (device, IP, and geography usually move together) triple-counting the same evidence',
          'Concept drift in the count tables going unnoticed because the model never fails loudly, it just gets gradually less discriminating',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A single pass of counting — trivially parallel by shard, and the counts merge by addition. Millions of documents on one core in seconds, and there is no need to hold the corpus in memory.',
    inferenceProfile:
      'A sparse dot product per class: microseconds, and small enough to run inside a database query or on an edge device. The model is a count table, so its size is set by vocabulary times class count, not by dataset size.',
    retrainingCadence:
      'Effectively continuous. Because the parameters are counts, new data can be folded in incrementally without a refit, which makes it one of the few models here that genuinely supports online updating with no approximation.',
    driftAndMonitoring: [
      'Track the fraction of unseen feature values per batch — a rising out-of-vocabulary rate is the earliest signal that the count table has gone stale',
      'Monitor the distribution of the score margin between the top two classes, not the posterior, which is pinned near 1 and carries no information',
      'Watch class priors against the observed label distribution; a shifted base rate degrades this model faster than a discriminative one because the prior enters the score directly',
      'Alert on documents or records whose length is far outside the training range, since the number of summed log terms scales with it',
    ],
    productionGotchas: [
      'Never expose the posterior as a confidence — it saturates at 0 or 1, and every downstream threshold built on it will behave as a coin flip near the boundary',
      'Smoothing must be applied at scoring time as well as training time, or an unseen value takes log(0) and produces negative infinity',
      'The vocabulary is part of the model; regenerating it separately at inference silently reindexes every probability',
      'Counts must be stored at sufficient precision, or a long-running incremental update loses small increments to floating-point absorption — integer counters, not float accumulators',
      'A class with no training examples has an undefined prior; the fallback must be explicit rather than an implicit division by zero',
    ],
  },

  assumptions: [
    'Features are conditionally independent given the class — known to be false on essentially all real data, and the model is used anyway because argmax tolerates the error that calibration does not',
    'The chosen variant matches the feature distribution: multinomial for counts, Bernoulli for presence, Gaussian for continuous features that are actually roughly Gaussian',
    'Every feature value that will be seen at inference is either present in training or covered by smoothing',
    'The training class balance reflects the deployment base rate, since the prior enters the score directly and unmodified',
  ],

  pros: [
    {
      point: 'Trains in one counting pass with no iteration, no tuning, and no solver',
      context:
        'It is the fastest reasonable baseline that exists, which makes it the right first thing to run on a new text problem. That advantage is worth nothing on a problem where a fit takes minutes anyway.',
    },
    {
      point: 'Works well with very little labelled data',
      context:
        'Estimating d univariate distributions needs far less data than estimating a joint one, so it converges to its error floor much faster than a discriminative model converges to its lower one. The crossover is real: below a few hundred examples per class it frequently wins outright, and above a few thousand it usually loses.',
    },
    {
      point: 'Naturally incremental and shardable',
      context:
        'Parameters are counts, so shards merge by addition and new data updates the model exactly rather than approximately. Genuinely rare — most models here require a full refit — and decisive for streaming pipelines.',
    },
    {
      point: 'Every prediction decomposes into per-feature contributions',
      context:
        'The score is a sum of log terms, so the explanation is the arithmetic rather than a post-hoc approximation of it. Valuable in review settings; irrelevant when only the label is consumed.',
    },
  ],

  cons: [
    {
      point: 'The probability estimates are unusable',
      context:
        'Correlated evidence multiplied as if independent saturates the posterior at 0 or 1. This is the single most common misuse of the model: anything that thresholds the probability, ranks by it across classes, or feeds it into an expected-cost calculation is wrong.',
    },
    {
      point: 'Cannot represent feature interactions at all',
      context:
        'The failure is structural, not a matter of capacity: independence is the modelling assumption. Where the signal IS the combination — most fraud, most reasoning-adjacent text tasks — no amount of data fixes it.',
    },
    {
      point: 'Correlated and duplicated features are counted multiple times',
      context:
        'Makes feature selection an accuracy intervention rather than an efficiency one, which is the opposite of most models here. Three near-identical columns silently triple that evidence’s weight.',
    },
    {
      point: 'Usually beaten once data is plentiful',
      context:
        'Logistic regression on the same features has a lower error floor and reaches it given enough examples. Naive Bayes keeps the small-data and streaming regimes, and honestly not much beyond them.',
    },
  ],

  relatedSlugs: ['logistic-regression', 'gaussian-mixture', 'decision-tree'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Multinomial Naive Bayes - counting, then Bayes' rule, transcribed.

Training is the two count tables in the update rule above: how much total token
mass each class holds, and how often each token appears within it. Prediction
adds one log term per token, which is the naive assumption made literal.
"""

import math


def fit(documents, labels, vocabulary_size, alpha=1.0):
    """documents[i] is a list of token ids; labels[i] is a class id."""
    classes = sorted(set(labels))
    class_counts = {c: 0 for c in classes}
    token_totals = {c: 0 for c in classes}
    token_counts = {c: [0] * vocabulary_size for c in classes}

    for i in range(len(documents)):
        label = labels[i]
        class_counts[label] += 1
        for token in documents[i]:
            token_counts[label][token] += 1
            token_totals[label] += 1

    n = len(documents)
    log_prior = {}
    log_likelihood = {}

    for c in classes:
        log_prior[c] = math.log(class_counts[c] / n)

        # Smoothing is not optional: with alpha = 0 an unseen token gives
        # log(0), and one -inf term annihilates every other token's evidence.
        denominator = token_totals[c] + alpha * vocabulary_size
        row = [0.0] * vocabulary_size
        for token in range(vocabulary_size):
            row[token] = math.log((token_counts[c][token] + alpha) / denominator)
        log_likelihood[c] = row

    return log_prior, log_likelihood


def predict(log_prior, log_likelihood, document):
    """argmax_c  log P(c) + sum_j log P(token_j | c)"""
    best_class = None
    best_score = None

    for c in log_prior:
        # Everything is in log space because a product of thousands of
        # probabilities underflows float64 to exactly zero.
        score = log_prior[c]
        for token in document:
            score += log_likelihood[c][token]

        if best_score is None or score > best_score:
            best_class = c
            best_score = score

    return best_class`,
        profile: 'O(n * tokens) to fit and O(C * tokens) to score, in interpreter loops over dict-of-list count tables.',
      },
      'make-it-right': {
        code: `"""Multinomial Naive Bayes - typed, validated, sparse-aware."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class MultinomialNB:
    """A fitted model: one log-probability row per class, plus the log priors.

    Everything is stored in log space. Converting back is never necessary and
    is actively harmful - the exponentiated posterior saturates at 0 or 1 and
    should not be exposed as a confidence.
    """

    classes: NDArray
    log_prior: Vector           # (C,)
    log_likelihood: Matrix      # (C, V)
    alpha: float

    def joint_log_likelihood(self, X: Matrix) -> Matrix:
        """(n, C) matrix of scores. The whole prediction rule, as one product."""
        if X.ndim != 2 or X.shape[1] != self.log_likelihood.shape[1]:
            raise ValueError(
                f"expected (n, {self.log_likelihood.shape[1]}) counts, got {X.shape}"
            )
        return X @ self.log_likelihood.T + self.log_prior

    def predict(self, X: Matrix) -> NDArray:
        return self.classes[self.joint_log_likelihood(X).argmax(axis=1)]

    def log_proba(self, X: Matrix) -> Matrix:
        """Normalized log posteriors. Correctly computed, and still not calibrated."""
        joint = self.joint_log_likelihood(X)
        # log-sum-exp with the max factored out; the naive version overflows.
        shift = joint.max(axis=1, keepdims=True)
        return joint - (shift + np.log(np.exp(joint - shift).sum(axis=1, keepdims=True)))


def fit(X: Matrix, y: NDArray, alpha: float = 1.0) -> MultinomialNB:
    """Fit by counting. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if alpha <= 0.0:
        raise ValueError(f"alpha must be positive; alpha=0 makes unseen tokens fatal")
    if (X < 0).any():
        raise ValueError("multinomial NB expects non-negative counts")

    classes, encoded = np.unique(y, return_inverse=True)
    n_classes = classes.size
    vocabulary = X.shape[1]

    # One-hot the labels and the entire count table is a single matrix product:
    # indicator.T @ X sums each class's rows in one pass.
    indicator = np.zeros((X.shape[0], n_classes), dtype=np.float64)
    indicator[np.arange(X.shape[0]), encoded] = 1.0

    token_counts = indicator.T @ X                     # (C, V)
    class_counts = indicator.sum(axis=0)               # (C,)

    smoothed = token_counts + alpha
    log_likelihood = np.log(smoothed) - np.log(smoothed.sum(axis=1, keepdims=True))
    log_prior = np.log(class_counts) - np.log(class_counts.sum())

    return MultinomialNB(
        classes=classes,
        log_prior=log_prior,
        log_likelihood=log_likelihood,
        alpha=alpha,
    )`,
        rationale:
          'The dict-of-lists count table becomes two arrays, and the per-document accumulation loop becomes a single matrix product against a one-hot label indicator — the counting step is a GEMM, which is not an optimization so much as the honest way to write a sum over groups. Scoring becomes one product too, since the sum of per-token log-probabilities is exactly a dot product with the count vector. Around that, the idiomatic changes: a frozen dataclass instead of a pair of dicts, validated input including the alpha > 0 contract whose violation produces negative infinities much later, and a log-sum-exp normalization that does not overflow the way a direct exp would.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*V) to fit and O(n*C*V) to score as dense products — correct, and wasteful on text, where X is 99.9% zeros.',
      },
      'make-it-fast': {
        code: `"""Multinomial Naive Bayes - sparse counts, one SpMM, batched scoring."""

import numpy as np
from numpy.typing import NDArray
from scipy import sparse

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class SparseMultinomialNB:
    """The same model, taking sparsity seriously.

    On text, X is a document-term matrix that is over 99% zeros. The dense
    formulation touches every vocabulary entry for every document; the sparse
    one touches only the tokens actually present, which is the difference
    between O(n * V) and O(nnz). Nothing about the model changes - only which
    zeros are visited.
    """

    def __init__(self, alpha: float = 1.0) -> None:
        if alpha <= 0.0:
            raise ValueError("alpha must be positive")
        self._alpha = alpha
        self._classes: NDArray | None = None
        self._log_prior: Vector | None = None
        self._log_likelihood: Matrix | None = None

    def fit(self, X: sparse.csr_matrix, y: NDArray) -> "SparseMultinomialNB":
        if X.shape[0] != y.shape[0]:
            raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")

        classes, encoded = np.unique(y, return_inverse=True)
        n, vocabulary = X.shape

        # The one-hot indicator is itself sparse, so the count table is one
        # sparse-times-sparse product rather than a dense C x n intermediate.
        indicator = sparse.csr_matrix(
            (np.ones(n), (encoded, np.arange(n))), shape=(classes.size, n)
        )
        token_counts = np.asarray((indicator @ X).todense(), dtype=np.float64)

        smoothed = token_counts + self._alpha
        # In place: the (C, V) table is the largest array in the model, and on
        # a large vocabulary each temporary copy is real memory pressure.
        np.log(smoothed, out=smoothed)
        totals = np.log(np.exp(smoothed).sum(axis=1, keepdims=True))
        smoothed -= totals

        class_counts = np.bincount(encoded, minlength=classes.size).astype(np.float64)

        self._classes = classes
        self._log_prior = np.log(class_counts) - np.log(n)
        # C-contiguous so the SpMM below reads each class row sequentially.
        self._log_likelihood = np.ascontiguousarray(smoothed)
        return self

    def predict(self, X: sparse.csr_matrix, batch: int = 8192) -> NDArray:
        if self._log_likelihood is None or self._classes is None:
            raise RuntimeError("predict called before fit")

        out = np.empty(X.shape[0], dtype=self._classes.dtype)   # allocated once

        # Batching bounds the (batch, C) score block and keeps the class table
        # resident in cache across many documents.
        for start in range(0, X.shape[0], batch):
            stop = min(start + batch, X.shape[0])
            joint = X[start:stop] @ self._log_likelihood.T      # SpMM
            joint += self._log_prior
            out[start:stop] = self._classes[joint.argmax(axis=1)]

        return out`,
        rationale:
          'The arithmetic is unchanged; what changes is which entries are visited. A document-term matrix is over 99% zeros, and the dense formulation spends nearly all of its work multiplying them — so both the count table and the scoring product move to sparse operations that touch only present tokens. The count table also stops materializing a dense one-hot indicator, which on a large corpus was the single biggest allocation in the fit. Scoring is batched so the class log-probability table stays cache-resident across many documents, and the log-probability normalization runs in place because on a 500,000-word vocabulary each temporary copy of that table is real memory.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Both counting and scoring are matrix products — the sparse ones dispatch to a sparse kernel that iterates nonzeros directly rather than scanning the vocabulary.',
            tradeoff: 'Sparse kernels are memory-bound and irregular, so on genuinely dense features they are slower than the dense GEMM they replaced; this is the right choice for text and the wrong one for a dense tabular matrix.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The prediction output is allocated once for the whole corpus, and the log-probability table is normalized in place instead of through three full-size temporaries.',
            tradeoff: 'The in-place normalization destroys the intermediate counts, so anything that wanted to inspect raw counts afterwards has to keep its own copy — and the operation order can no longer be rearranged safely.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'The class log-probability table is stored C-contiguous in float64 so the sparse product reads each class row sequentially instead of striding.',
            tradeoff: 'Forces a copy when the table was produced in another layout, and float64 doubles the resident size of a table that on a large vocabulary is already the dominant memory cost.',
          },
        ],
        libraryName: 'NumPy + SciPy sparse',
        profile: 'O(nnz) to fit and O(nnz * C) to score, touching only present tokens. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Multinomial Naive Bayes - counting, then Bayes' rule, transcribed.
#include <cmath>
#include <cstddef>
#include <map>
#include <vector>

struct NaiveBayes {
  std::map<int, double> log_prior;
  std::map<int, std::vector<double>> log_likelihood;
};

NaiveBayes Fit(const std::vector<std::vector<int>>& documents,
               const std::vector<int>& labels,
               std::size_t vocabulary_size,
               double alpha) {
  std::map<int, int> class_counts;
  std::map<int, long> token_totals;
  std::map<int, std::vector<long>> token_counts;

  for (std::size_t i = 0; i < documents.size(); ++i) {
    const int label = labels[i];
    if (token_counts.find(label) == token_counts.end()) {
      token_counts[label] = std::vector<long>(vocabulary_size, 0);
    }
    class_counts[label] += 1;
    for (const int token : documents[i]) {
      token_counts[label][static_cast<std::size_t>(token)] += 1;
      token_totals[label] += 1;
    }
  }

  NaiveBayes model;
  const double n = static_cast<double>(documents.size());

  for (const auto& [label, count] : class_counts) {
    model.log_prior[label] = std::log(static_cast<double>(count) / n);

    // Smoothing: with alpha = 0 an unseen token contributes log(0), and one
    // -inf annihilates every other token's evidence for that class.
    const double denominator =
        static_cast<double>(token_totals[label]) +
        alpha * static_cast<double>(vocabulary_size);

    std::vector<double> row(vocabulary_size, 0.0);
    for (std::size_t token = 0; token < vocabulary_size; ++token) {
      row[token] = std::log(
          (static_cast<double>(token_counts[label][token]) + alpha) / denominator);
    }
    model.log_likelihood[label] = row;
  }

  return model;
}

int Predict(const NaiveBayes& model, const std::vector<int>& document) {
  int best_label = 0;
  double best_score = 0.0;
  bool seen = false;

  for (const auto& [label, prior] : model.log_prior) {
    // Log space: a product of thousands of probabilities underflows to zero.
    double score = prior;
    for (const int token : document) {
      score += model.log_likelihood.at(label)[static_cast<std::size_t>(token)];
    }

    if (!seen || score > best_score) {
      best_label = label;
      best_score = score;
      seen = true;
    }
  }

  return best_label;
}`,
        profile: 'O(n * tokens) to fit, O(C * tokens) to score, through a map-of-vectors whose every class lookup is a tree walk.',
      },
      'make-it-right': {
        code: `// Multinomial Naive Bayes - flat tables, RAII, const-correct, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

class MultinomialNaiveBayes {
 public:
  // Class ids are assumed dense in [0, class_count): the caller encodes them,
  // which removes a map lookup from the innermost loop.
  MultinomialNaiveBayes(std::vector<double> log_likelihood,
                        std::vector<double> log_prior,
                        std::size_t vocabulary_size)
      : log_likelihood_(std::move(log_likelihood)),
        log_prior_(std::move(log_prior)),
        vocabulary_size_(vocabulary_size) {
    if (vocabulary_size_ == 0 || log_prior_.empty()) {
      throw std::invalid_argument("empty model");
    }
    if (log_likelihood_.size() != log_prior_.size() * vocabulary_size_) {
      throw std::invalid_argument("log-likelihood table does not match the model shape");
    }
  }

  // Row-major table: P(token | class) lives at log_likelihood_[c * V + token],
  // so scoring one class is a contiguous gather over the document's tokens.
  [[nodiscard]] int Predict(std::span<const int> document) const {
    int best_label = 0;
    double best_score = -std::numeric_limits<double>::infinity();

    for (std::size_t c = 0; c < log_prior_.size(); ++c) {
      const double* row = log_likelihood_.data() + c * vocabulary_size_;
      double score = log_prior_[c];

      for (const int token : document) {
        const auto index = static_cast<std::size_t>(token);
        if (index >= vocabulary_size_) {
          throw std::out_of_range("token id outside the fitted vocabulary");
        }
        score += row[index];
      }

      if (score > best_score) {
        best_score = score;
        best_label = static_cast<int>(c);
      }
    }

    return best_label;
  }

  [[nodiscard]] std::size_t ClassCount() const noexcept { return log_prior_.size(); }

 private:
  std::vector<double> log_likelihood_;   // owned; rule of zero handles the rest
  std::vector<double> log_prior_;
  std::size_t vocabulary_size_;
};

MultinomialNaiveBayes Fit(const std::vector<std::vector<int>>& documents,
                          std::span<const int> labels,
                          std::size_t vocabulary_size,
                          std::size_t class_count,
                          double alpha) {
  if (documents.size() != labels.size()) {
    throw std::invalid_argument("documents and labels describe different counts");
  }
  if (alpha <= 0.0) {
    throw std::invalid_argument("alpha must be positive; alpha=0 makes unseen tokens fatal");
  }
  if (vocabulary_size == 0 || class_count == 0) {
    throw std::invalid_argument("empty vocabulary or class set");
  }

  std::vector<long> token_counts(class_count * vocabulary_size, 0);
  std::vector<long> token_totals(class_count, 0);
  std::vector<long> class_counts(class_count, 0);

  for (std::size_t i = 0; i < documents.size(); ++i) {
    const auto c = static_cast<std::size_t>(labels[i]);
    if (c >= class_count) throw std::out_of_range("label outside the class range");

    class_counts[c] += 1;
    long* row = token_counts.data() + c * vocabulary_size;
    for (const int token : documents[i]) {
      row[static_cast<std::size_t>(token)] += 1;
      token_totals[c] += 1;
    }
  }

  std::vector<double> log_likelihood(class_count * vocabulary_size);
  std::vector<double> log_prior(class_count);
  const double n = static_cast<double>(documents.size());

  for (std::size_t c = 0; c < class_count; ++c) {
    log_prior[c] = std::log(static_cast<double>(class_counts[c]) / n);

    const double denominator = static_cast<double>(token_totals[c]) +
                               alpha * static_cast<double>(vocabulary_size);
    const long* counts = token_counts.data() + c * vocabulary_size;
    double* target = log_likelihood.data() + c * vocabulary_size;

    for (std::size_t token = 0; token < vocabulary_size; ++token) {
      target[token] = std::log((static_cast<double>(counts[token]) + alpha) / denominator);
    }
  }

  return MultinomialNaiveBayes(std::move(log_likelihood), std::move(log_prior),
                               vocabulary_size);
}`,
        rationale:
          'The map-of-vectors becomes one flat row-major table indexed arithmetically, which removes a red-black tree walk from the innermost scoring loop and makes each class row contiguous. Counts are accumulated as integers rather than doubles, which matters for a long incremental run where small float increments are absorbed and silently lost. Validation moves to the boundary: the alpha > 0 contract, the label range, and the token range are all checked where they can still be reported, rather than surfacing much later as a negative infinity or an out-of-bounds read.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n * tokens) to fit and O(C * tokens) to score, over one contiguous table with no per-class indirection.',
      },
      'make-it-fast': {
        code: `// Multinomial Naive Bayes - Eigen scoring, OpenMP over documents.
#include <Eigen/Dense>
#include <cstddef>
#include <stdexcept>
#include <vector>

// Row-major: a class row and a document row are each one contiguous run, which
// is what both the GEMM and the per-document argmax want.
using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

class BatchNaiveBayes {
 public:
  BatchNaiveBayes(RowMajorMatrix log_likelihood, Eigen::VectorXd log_prior)
      : log_likelihood_(std::move(log_likelihood)), log_prior_(std::move(log_prior)) {
    if (log_likelihood_.rows() != log_prior_.size()) {
      throw std::invalid_argument("table and prior describe different class counts");
    }
  }

  // Scores an entire batch of count vectors at once.
  //
  //   joint = X * L^T + prior
  //
  // The sum of per-token log-probabilities IS a dot product with the count
  // vector, so the whole prediction rule for a corpus is one GEMM. On dense
  // count features this is the fastest formulation available; on a genuinely
  // sparse document-term matrix it is the wrong one, because it multiplies
  // every vocabulary entry that the document does not contain.
  [[nodiscard]] std::vector<int> Predict(const RowMajorMatrix& X) const {
    if (X.cols() != log_likelihood_.cols()) {
      throw std::invalid_argument("count width does not match the vocabulary");
    }

    RowMajorMatrix joint = X * log_likelihood_.transpose();
    joint.rowwise() += log_prior_.transpose();

    std::vector<int> labels(static_cast<std::size_t>(joint.rows()));

#pragma omp parallel for schedule(static)
    for (Eigen::Index i = 0; i < joint.rows(); ++i) {
      Eigen::Index best = 0;
      joint.row(i).maxCoeff(&best);
      labels[static_cast<std::size_t>(i)] = static_cast<int>(best);
    }

    return labels;
  }

 private:
  RowMajorMatrix log_likelihood_;   // (C, V)
  Eigen::VectorXd log_prior_;       // (C,)
};`,
        rationale:
          'Scoring stops being a loop per document and becomes one matrix product for the whole batch, which is legitimate because the sum of per-token log-probabilities is literally a dot product with the count vector — the same identity the Python stage uses. The per-document argmax stays a loop, but it is a loop over independent rows, so it parallelizes with no shared state. The honest caveat is stated in the code: this formulation is optimal for dense count features and pessimal for sparse text, where it multiplies the 99% of the vocabulary each document does not contain.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'X * L^T is one GEMM over the whole batch, replacing n * C separate gather-and-sum loops with a blocked kernel that keeps the class table in cache.',
            tradeoff: 'Materializes an (n, C) score block and multiplies every zero in X — on a sparse document-term matrix that is nearly all of the work, so the dense form loses badly to a sparse kernel.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Class rows and document rows are each contiguous, so the GEMM panels and the row-wise argmax both read sequentially rather than striding across the matrix.',
            tradeoff: 'Wrong layout if the same table also feeds a column-wise operation, and Eigen defaults to column-major, so the choice must be carried explicitly through every type that touches it.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Each document’s argmax reads only its own row of the score block, so the reduction phase partitions cleanly across cores.',
            tradeoff: 'The argmax is memory-bound and cheap relative to the GEMM, so the parallel region often contributes little — and nesting it around an already-threaded BLAS risks oversubscribing the machine.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n * C * V) in BLAS for dense counts. Illustrative, not a measured benchmark, and the wrong shape for sparse text.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Multinomial Naive Bayes - counting, then Bayes' rule, transcribed.

use std::collections::HashMap;

pub struct NaiveBayes {
    pub log_prior: HashMap<i32, f64>,
    pub log_likelihood: HashMap<i32, Vec<f64>>,
}

pub fn fit(
    documents: &[Vec<usize>],
    labels: &[i32],
    vocabulary_size: usize,
    alpha: f64,
) -> NaiveBayes {
    let mut class_counts: HashMap<i32, usize> = HashMap::new();
    let mut token_totals: HashMap<i32, usize> = HashMap::new();
    let mut token_counts: HashMap<i32, Vec<usize>> = HashMap::new();

    for i in 0..documents.len() {
        let label = labels[i];
        token_counts
            .entry(label)
            .or_insert_with(|| vec![0; vocabulary_size]);
        *class_counts.entry(label).or_insert(0) += 1;

        for &token in &documents[i] {
            token_counts.get_mut(&label).unwrap()[token] += 1;
            *token_totals.entry(label).or_insert(0) += 1;
        }
    }

    let n = documents.len() as f64;
    let mut log_prior = HashMap::new();
    let mut log_likelihood = HashMap::new();

    for (&label, &count) in &class_counts {
        log_prior.insert(label, (count as f64 / n).ln());

        // Smoothing: alpha = 0 gives an unseen token log(0), and one -inf
        // annihilates every other token's evidence for that class.
        let denominator = token_totals[&label] as f64 + alpha * vocabulary_size as f64;
        let counts = &token_counts[&label];

        let mut row = vec![0.0; vocabulary_size];
        for token in 0..vocabulary_size {
            row[token] = ((counts[token] as f64 + alpha) / denominator).ln();
        }
        log_likelihood.insert(label, row);
    }

    NaiveBayes { log_prior, log_likelihood }
}

pub fn predict(model: &NaiveBayes, document: &[usize]) -> i32 {
    let mut best_label = 0;
    let mut best_score = f64::NEG_INFINITY;

    for (&label, &prior) in &model.log_prior {
        // Log space: a product of thousands of probabilities underflows.
        let mut score = prior;
        for &token in document {
            score += model.log_likelihood[&label][token];
        }

        if score > best_score {
            best_label = label;
            best_score = score;
        }
    }

    best_label
}`,
        profile: 'O(n * tokens) to fit and O(C * tokens) to score, with a hash lookup and a bounds check on every token.',
      },
      'make-it-right': {
        code: `//! Multinomial Naive Bayes - typed errors, flat tables, borrowed slices.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Smoothing { value: f64 },
    OutOfRange { value: usize, limit: usize },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty corpus, vocabulary, or class set"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} labels, found {found}")
            }
            Self::Smoothing { value } => write!(
                f,
                "alpha must be positive, got {value}; alpha=0 makes an unseen token fatal"
            ),
            Self::OutOfRange { value, limit } => {
                write!(f, "id {value} outside the range 0..{limit}")
            }
        }
    }
}

impl std::error::Error for FitError {}

/// Smoothing pseudo-count. A newtype because alpha is a bare f64 that is
/// silently catastrophic at zero rather than merely wrong.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Alpha(f64);

impl Alpha {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(FitError::Smoothing { value });
        }
        Ok(Self(value))
    }
}

pub struct MultinomialNaiveBayes {
    /// Row-major (C, V): P(token | class) at log_likelihood[c * vocab + token].
    log_likelihood: Vec<f64>,
    log_prior: Vec<f64>,
    vocabulary_size: usize,
}

impl MultinomialNaiveBayes {
    /// Class ids are dense in 0..class_count, which keeps a hash lookup out of
    /// the innermost loop.
    pub fn fit(
        documents: &[Vec<usize>],
        labels: &[usize],
        vocabulary_size: usize,
        class_count: usize,
        alpha: Alpha,
    ) -> Result<Self, FitError> {
        if documents.is_empty() || vocabulary_size == 0 || class_count == 0 {
            return Err(FitError::Empty);
        }
        if documents.len() != labels.len() {
            return Err(FitError::ShapeMismatch {
                expected: documents.len(),
                found: labels.len(),
            });
        }

        let mut token_counts = vec![0_u64; class_count * vocabulary_size];
        let mut token_totals = vec![0_u64; class_count];
        let mut class_counts = vec![0_u64; class_count];

        for (document, &label) in documents.iter().zip(labels) {
            if label >= class_count {
                return Err(FitError::OutOfRange { value: label, limit: class_count });
            }
            class_counts[label] += 1;

            let row = &mut token_counts[label * vocabulary_size..(label + 1) * vocabulary_size];
            for &token in document {
                let slot = row
                    .get_mut(token)
                    .ok_or(FitError::OutOfRange { value: token, limit: vocabulary_size })?;
                *slot += 1;
                token_totals[label] += 1;
            }
        }

        let n = documents.len() as f64;
        let mut log_likelihood = vec![0.0_f64; class_count * vocabulary_size];
        let mut log_prior = vec![0.0_f64; class_count];

        for class in 0..class_count {
            log_prior[class] = (class_counts[class] as f64 / n).ln();

            let denominator =
                token_totals[class] as f64 + alpha.0 * vocabulary_size as f64;
            let counts = &token_counts[class * vocabulary_size..(class + 1) * vocabulary_size];
            let target =
                &mut log_likelihood[class * vocabulary_size..(class + 1) * vocabulary_size];

            for (slot, &count) in target.iter_mut().zip(counts) {
                *slot = ((count as f64 + alpha.0) / denominator).ln();
            }
        }

        Ok(Self { log_likelihood, log_prior, vocabulary_size })
    }

    /// argmax_c  log P(c) + sum_j log P(token_j | c)
    #[must_use]
    pub fn predict(&self, document: &[usize]) -> usize {
        self.log_prior
            .iter()
            .enumerate()
            .map(|(class, &prior)| {
                let row = &self.log_likelihood
                    [class * self.vocabulary_size..(class + 1) * self.vocabulary_size];
                let score = prior
                    + document
                        .iter()
                        .filter_map(|&token| row.get(token))
                        .sum::<f64>();
                (class, score)
            })
            .max_by(|(_, a), (_, b)| a.total_cmp(b))
            .map_or(0, |(class, _)| class)
    }
}
`,
        rationale:
          'The HashMap tables become one flat row-major buffer indexed arithmetically, which removes a hash lookup from the innermost token loop and makes each class row a contiguous slice. Counts accumulate as u64 rather than f64, so a long run cannot lose small increments to floating-point absorption. Errors become a typed Result covering the contracts that otherwise fail late — an out-of-range token id, a label outside the class set, and alpha, which gets a validated newtype because zero is not merely a bad value but a silently catastrophic one. The scoring loop becomes an iterator chain with total_cmp, which gives f64 a real total order without the unwrap() on partial_cmp that panics on a NaN.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n * tokens) to fit and O(C * tokens) to score, one allocation per table, no hashing in the hot loop.',
      },
      'make-it-fast': {
        code: `//! Multinomial Naive Bayes - parallel counting with per-thread tables.

use rayon::prelude::*;

pub struct FlatNaiveBayes {
    log_likelihood: Vec<f64>,     // row-major (C, V)
    log_prior: Vec<f64>,
    vocabulary_size: usize,
}

impl FlatNaiveBayes {
    /// Counting is a sum over documents, which makes it a textbook
    /// fold-then-reduce: each worker accumulates a private (C, V) table over
    /// its own chunk, and the tables are summed once at the end. No shared
    /// mutable state, so no locking and no atomics in the hot loop.
    ///
    /// The table is C * V u64s, so this trades memory for contention - with a
    /// 500k vocabulary and 20 classes that is 80 MB per worker, which is the
    /// point at which sharding by document range stops being the right answer.
    #[must_use]
    pub fn fit(
        documents: &[Vec<usize>],
        labels: &[usize],
        vocabulary_size: usize,
        class_count: usize,
        alpha: f64,
    ) -> Self {
        let table_size = class_count * vocabulary_size;

        let (token_counts, class_counts) = documents
            .par_iter()
            .zip(labels.par_iter())
            .fold(
                || (vec![0_u64; table_size], vec![0_u64; class_count]),
                |(mut counts, mut classes), (document, &label)| {
                    classes[label] += 1;
                    let row = &mut counts[label * vocabulary_size..(label + 1) * vocabulary_size];
                    for &token in document {
                        row[token] += 1;
                    }
                    (counts, classes)
                },
            )
            .reduce(
                || (vec![0_u64; table_size], vec![0_u64; class_count]),
                |(mut a_counts, mut a_classes), (b_counts, b_classes)| {
                    for (a, b) in a_counts.iter_mut().zip(b_counts) {
                        *a += b;
                    }
                    for (a, b) in a_classes.iter_mut().zip(b_classes) {
                        *a += b;
                    }
                    (a_counts, a_classes)
                },
            );

        let n = documents.len() as f64;
        let mut log_likelihood = Vec::with_capacity(table_size);
        let mut log_prior = Vec::with_capacity(class_count);

        for class in 0..class_count {
            let total: u64 = token_counts
                [class * vocabulary_size..(class + 1) * vocabulary_size]
                .iter()
                .sum();
            let denominator = total as f64 + alpha * vocabulary_size as f64;

            log_prior.push((class_counts[class] as f64 / n).ln());
            log_likelihood.extend(
                token_counts[class * vocabulary_size..(class + 1) * vocabulary_size]
                    .iter()
                    .map(|&count| ((count as f64 + alpha) / denominator).ln()),
            );
        }

        Self { log_likelihood, log_prior, vocabulary_size }
    }

    /// A batch of documents. Each is scored independently of the others.
    #[must_use]
    pub fn predict_batch(&self, documents: &[Vec<usize>]) -> Vec<usize> {
        documents
            .par_iter()
            .map(|document| {
                self.log_prior
                    .iter()
                    .enumerate()
                    .map(|(class, &prior)| {
                        let row = &self.log_likelihood[class * self.vocabulary_size
                            ..(class + 1) * self.vocabulary_size];
                        let score: f64 =
                            prior + document.iter().filter_map(|&t| row.get(t)).sum::<f64>();
                        (class, score)
                    })
                    .max_by(|(_, a), (_, b)| a.total_cmp(b))
                    .map_or(0, |(class, _)| class)
            })
            .collect()
    }
}
`,
        rationale:
          'Counting is a sum over documents and therefore associative, which is exactly the shape rayon’s fold-then-reduce wants: each worker accumulates a private count table over its own chunk and the tables merge by addition at the end, with no shared mutable state and no synchronization in the inner loop. Scoring parallelizes trivially because documents are independent. The structure is deliberately allocation-light — one table per worker for its whole chunk rather than per document — and the honest cost is stated in the doc comment: a private C-by-V table per worker is real memory, and past a large vocabulary that, not contention, becomes the binding constraint.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Counting is an associative sum over documents, so fold-then-reduce gives each worker a private accumulator and merges once — no locks and no atomics anywhere in the hot loop.',
            tradeoff: 'Each worker holds a full C-by-V table, so memory scales with core count; on a large vocabulary that becomes the limit, and a shared atomic table or a sharded-by-token scheme would be the next step.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'The row-major table lets a class row be taken as one mutable slice, so the per-token increments walk memory sequentially instead of striding across classes.',
            tradeoff: 'The class-major layout is wrong for anything that iterates a single token across all classes, which is what a per-token pruning or feature-selection pass would want.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The log-probability table is built at its exact final length by extending class-by-class, so the largest array in the model is never grown and copied.',
            tradeoff: 'Requires the class and vocabulary counts up front, which rules out discovering the vocabulary during the same pass that counts it.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n * tokens / cores) to fit, plus one O(C * V) merge per worker. Illustrative, not a measured benchmark.',
      },
    },
  },
};
