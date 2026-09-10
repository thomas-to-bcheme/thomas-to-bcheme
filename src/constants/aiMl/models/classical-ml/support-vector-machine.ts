import type { AiMlModel } from '../../types';

/**
 * Support Vector Machine — the margin objective, and the entry where the dual
 * earns its keep.
 *
 * Paired with k-nearest-neighbours in the instance-and-kernel group because the
 * two are the same idea at opposite extremes: both make decisions from stored
 * examples under a similarity function, but kNN keeps every point and SVM keeps
 * only the ones on the boundary. The code progression is deliberately a change
 * of formulation rather than a change of style — primal subgradient descent
 * cannot use a kernel, and moving to the dual is what buys nonlinearity.
 */
export const SUPPORT_VECTOR_MACHINE: AiMlModel = {
  slug: 'support-vector-machine',
  name: 'Support Vector Machine',
  aliases: ['SVM', 'SVC', 'Support Vector Regression', 'SVR', 'One-Class SVM', 'Max-margin classifier'],
  category: 'classical-ml',
  group: 'instance-and-kernel',
  kind: 'model',

  paradigms: ['supervised', 'unsupervised'],
  // 'anomaly-detection' is the unsupervised half: one-class SVM and SVDD fit a
  // boundary around unlabelled normal data — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['classification', 'regression', 'anomaly-detection'],
  paradigmNote:
    'One machinery, three estimands. With labels it is a max-margin classifier; with an epsilon-insensitive tube it is regression (SVR); with no labels at all it is a one-class boundary enclosing the data. The dual QP and the kernel are identical in every case, which is why they belong in one entry.',

  intuition:
    'Of all the hyperplanes that separate two classes, take the one that sits as far as possible from the nearest points on either side. That clearance is the margin, and maximizing it is a bet worth stating plainly: a boundary with room around it is more likely to survive new data than one that squeaks between training points. Two things follow. Only the points on or inside the margin — the support vectors — affect the answer, so most of the training set could be deleted without changing the model. And because the solution depends on the data only through inner products, replacing that inner product with a kernel produces a nonlinear boundary without ever computing the coordinates it lives in.',

  objective: {
    kind: 'margin',
    expression: {
      formula:
        '\\min_{\\mathbf{w}, b, \\xi} \\; \\frac{1}{2}\\lVert \\mathbf{w} \\rVert_2^2 + C \\sum_{i=1}^{n} \\xi_i \\quad \\text{s.t.} \\quad y_i\\left(\\mathbf{w}^{\\top}\\phi(\\mathbf{x}_i) + b\\right) \\geq 1 - \\xi_i, \\;\\; \\xi_i \\geq 0',
      symbols: [
        { symbol: '\\lVert \\mathbf{w} \\rVert_2^2', meaning: 'inverse margin width — minimizing it is literally maximizing the gap' },
        { symbol: '\\xi_i', meaning: 'slack: how far example i intrudes past its margin, zero for a comfortably correct point' },
        { symbol: 'C', meaning: 'the price of a unit of intrusion, and the entire bias-variance dial' },
        { symbol: '\\phi', meaning: 'the feature map, which is never evaluated explicitly — only its inner product is' },
        { symbol: 'y_i', meaning: 'label in {-1, +1}; the margin is defined on signs, so 0/1 labels break the objective silently' },
      ],
    },
    reading:
      'Make the margin as wide as possible, and charge C for every unit by which a point intrudes into it. Large C makes violations expensive, so the boundary contorts to avoid them; small C buys a wider, smoother margin that tolerates mistakes. Written as a loss the constraint becomes a hinge — max(0, 1 - y·f(x)) — and the defining property of that hinge is that a point classified correctly and comfortably contributes exactly zero. That is why the solution is sparse in the training data, and why this is a margin objective rather than a loss on probabilities: it is indifferent to how right it already is.',
  },

  optimization: {
    method: 'Sequential minimal optimization (SMO) on the dual QP; stochastic subgradient descent on the primal for the linear case',
    updateRule: {
      formula:
        '\\max_{\\alpha} \\; \\sum_{i=1}^{n} \\alpha_i - \\frac{1}{2}\\sum_{i=1}^{n}\\sum_{j=1}^{n} \\alpha_i \\alpha_j y_i y_j K(\\mathbf{x}_i, \\mathbf{x}_j) \\quad \\text{s.t.} \\quad 0 \\leq \\alpha_i \\leq C, \\;\\; \\sum_{i=1}^{n} \\alpha_i y_i = 0',
      symbols: [
        { symbol: '\\alpha_i', meaning: 'dual multiplier for example i; non-zero exactly for the support vectors' },
        { symbol: 'K(\\mathbf{x}_i, \\mathbf{x}_j)', meaning: 'the kernel — an inner product in feature space, computed without visiting that space' },
        { symbol: '0 \\leq \\alpha_i \\leq C', meaning: 'box constraint; a multiplier pinned at C marks a margin violator' },
        { symbol: '\\sum_i \\alpha_i y_i = 0', meaning: 'the equality constraint that forces SMO to move multipliers in pairs' },
      ],
    },
    rationale:
      'The primal carries a d-dimensional weight vector and n slacks; the dual carries n multipliers and touches the data only through K(x_i, x_j). That substitution is the kernel trick, and it is the whole reason the dual is what gets solved: in the primal you cannot represent an infinite-dimensional feature map, and in the dual you never need to. SMO then exploits the equality constraint — you cannot move one multiplier without violating it, so the smallest legal working set is two, and a two-variable box-constrained QP has an analytic solution. That is why an SVM solver is a loop over pairs rather than a call to a general-purpose QP library.',
    hyperparameters: [
      { name: 'C', role: 'Cost of a margin violation. Small C underfits toward a wide smooth margin, large C toward memorization', typicalRange: 'log grid from 1e-3 to 1e3, cross-validated jointly with gamma' },
      { name: 'kernel', role: 'The model assumption. Linear for high-dimensional sparse data, RBF as the nonlinear default, polynomial rarely, custom where the domain supplies a similarity' },
      { name: 'gamma (RBF)', role: 'Inverse width of the kernel. Too large and every point becomes its own support vector', typicalRange: 'scale heuristic 1/(d · var(X)) as the centre of a log grid' },
      { name: 'epsilon (SVR only)', role: 'Width of the insensitive tube — errors smaller than epsilon cost nothing, which is what makes SVR sparse' },
      { name: 'nu (one-class)', role: 'Upper bound on the outlier fraction and lower bound on the support-vector fraction — an interpretable dial, unlike C' },
      { name: 'class_weight', role: 'Rescales C per class; the standard handling for imbalance, since the margin itself has no notion of a base rate' },
    ],
    convergence:
      'The dual is a convex QP with a unique optimum, so any correct solver reaches the same answer and there are no seeds or local minima to worry about. The failure modes are about cost and calibration rather than correctness. Cost: training scales roughly between O(n^2) and O(n^3) and the kernel matrix is O(n^2) memory, so an SVM stops being trainable somewhere around 10^5 samples — the single most important practical fact about the model, and the reason it lost the tabular default to gradient boosting. Calibration: the decision function is a signed distance, not a probability, and converting it requires Platt scaling fitted on held-out data. And with an RBF kernel a large gamma memorizes: every point becomes its own support vector, training accuracy hits one, and the model is pure variance.',
    complexity:
      'Training: O(n^2 d) to O(n^3 d) depending on how much of the kernel matrix is cached, with O(n^2) memory for the full Gram. Inference: O(n_sv · d) per query for a kernel SVM, so latency grows with the number of support vectors — and on noisy data that count grows roughly linearly with n, meaning more training data makes the model slower to serve as well as slower to fit. A linear SVM collapses to one dot product, O(d), which is why the linear and kernel variants are operationally different models rather than settings of one.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Support vector regression on a lagged design matrix: the same supervised table any regressor would use, fitted with an epsilon-insensitive tube so residuals smaller than epsilon cost nothing. That tube is the reason to reach for it — it produces a forecaster that ignores small noise entirely and is therefore less prone to chasing it than a squared-error model.',
        where: [
          'Short-horizon nonlinear forecasting on small samples, where a flexible model would overfit and an RBF kernel with a wide margin does not',
          'Financial and energy series in the pre-boosting era, where SVR was the standard nonlinear benchmark and remains a reference point in the literature',
          'Problems with a few thousand observations and a nonlinear driver relationship, which is the regime where the O(n^2) cost is not yet a problem',
        ],
        why: 'The honest framing is historical and still useful: SVR is a genuinely strong small-sample nonlinear forecaster, and it has been largely displaced by gradient boosting on tabular lag features, which trains faster, handles missing values, and does not carry a quadratic memory cost. Reach for it when n is small and the relationship is smooth and nonlinear; do not reach for it on a million rows, because it cannot be fitted there at all.',
        featurization: [
          'Scale features and the target — an RBF kernel is a function of squared distance, so unscaled inputs make gamma meaningless',
          'Lags, rolling statistics and Fourier seasonal terms, exactly as for any supervised forecaster',
          'Difference or detrend first: SVR cannot extrapolate a trend, since its prediction is a bounded combination of kernel evaluations',
          'Choose epsilon relative to the noise scale of the target, not as a fixed default',
        ],
        evaluation:
          'Rolling-origin backtesting with C, gamma and epsilon tuned inside each fold — tuning them once on the full series is a leak, and with three interacting hyperparameters it is a large one. Score MASE against seasonal-naive.',
        pitfalls: [
          'Scaling the target on the full series before splitting, which leaks the future through the scaler',
          'Trend: the model cannot predict outside the range of the training targets, so a trending series produces forecasts that flatten',
          'Tuning C and gamma independently — they interact strongly, and a 1-D sweep on each finds a worse optimum than a coarse 2-D grid',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'One-class SVM turns the margin objective inside out: with no labels, find the smallest region containing most of the data — a hyperplane separating the data from the origin in feature space, or equivalently (SVDD) the smallest enclosing sphere. The parameter nu directly bounds the fraction of training points allowed outside, so the contamination rate is something you set rather than something you discover.',
        where: [
          'Novelty detection where a clean reference period exists and anomalies are unlabelled and rare',
          'Industrial process and equipment monitoring with a well-characterized normal operating envelope',
          'Network intrusion detection against a profile of normal traffic',
          'Screening inputs to a deployed model for being outside its training distribution',
        ],
        why: 'It gives a closed, nonlinear boundary around normal behaviour with a directly interpretable contamination parameter, and the decision is a geometric one rather than a density estimate — which is what makes it work in moderate dimensions where density estimation has already failed. The reasons against it are concrete: it is O(n^2), it is sensitive to gamma in a way that is hard to tune without labels, and on large or heavily contaminated data an isolation forest is both faster and more robust.',
        featurization: [
          'Scale on a confirmed-clean window and persist those statistics — the boundary is defined in scaled space',
          'Reduce dimension before fitting; the enclosing boundary loosens quickly as dimension grows',
          'Set nu from the believed contamination rate rather than tuning it for a target alert volume, which conflates the model with the threshold',
        ],
        evaluation:
          'Precision@k and PR-AUC against confirmed incidents, holding out entire anomaly episodes rather than individual points. Validate gamma by checking the support-vector fraction: a fit where most points are support vectors has wrapped itself around the training data and will flag everything new.',
        pitfalls: [
          'Contaminated training data pulls the boundary outward until it encloses the anomalies',
          'Gamma too large produces a boundary that hugs every training point — perfect on train, useless on anything unseen',
          'Quadratic training cost makes periodic refits on a growing reference window quietly unaffordable',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'The SVM is a constrained convex program studied as one: a quadratic objective under box constraints and one equality constraint. Working through it is where the applied vocabulary of optimization is actually acquired — Lagrangian duality, complementary slackness, KKT conditions as a convergence test rather than a formality, and active-set reasoning, since the support vectors are precisely the active constraints.',
        where: [
          'The canonical worked example of duality in applied machine learning — the primal-to-dual transformation is what makes the kernel possible',
          'Decomposition methods: SMO is an active-set method with a working set of two, chosen because the equality constraint forbids one',
          'KKT violation as a principled stopping rule, in contrast to "the objective stopped moving"',
        ],
        why: 'It is the smallest model in this section where the constraint structure, rather than the objective, determines the algorithm. You cannot pick a working set of one, because the equality constraint couples the multipliers; you can solve two analytically; therefore the solver is a loop over pairs. That chain of reasoning — from constraint geometry to algorithm — is the transferable content, and it is why the classical-ml verdict for this domain names the SVM alongside Lasso.',
        featurization: [
          'Scale features so the box constraints and the kernel width are comparable across dimensions',
          'Use class weights to rescale C per class rather than resampling, which changes the problem rather than the objective',
        ],
        evaluation:
          'Check the KKT conditions at the returned solution: every multiplier at zero should correspond to a point outside the margin, every multiplier at C to a violator, and every interior multiplier to a point exactly on it. That is an exact correctness test, unlike an iteration budget.',
        pitfalls: [
          'Treating a stalled objective as convergence when KKT violations remain on points the working-set heuristic has not revisited',
          'Ignoring the O(n^2) kernel matrix in the problem formulation, so the model is chosen before anyone checks it can be fitted',
          'Reading the dual multipliers as importances — they are constraint activities, not effect sizes',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'Historically: hand-engineered descriptors — SIFT, HOG, bag-of-visual-words — fed to an SVM, which was the state of the art in object recognition until 2012. Currently: a linear SVM as a classification head on frozen features from a pretrained network, which is the standard way to get a strong classifier from a few hundred labelled images.',
        where: [
          'Small-data image classification on top of a frozen pretrained backbone, where fine-tuning would overfit',
          'Pedestrian and object detection with HOG features, still deployed in embedded and low-power settings',
          'Linear probing — the standard diagnostic for how linearly separable a learned representation is',
        ],
        why: 'On raw pixels it is genuinely superseded, and the honest statement is that learned features beat designed ones decisively once data and compute allowed. What survives is the regime where the SVM was always strongest: few labelled examples, high-dimensional inputs, and a fixed representation. A linear SVM on frozen embeddings trains in seconds on a few hundred images and reliably beats a fine-tuned network at that sample size, which is a narrow but real and frequently encountered case.',
        featurization: [
          'L2-normalize descriptors and embeddings before fitting; margin geometry is meaningless across inconsistent vector magnitudes',
          'Prefer a linear kernel on high-dimensional embeddings — RBF adds cost and rarely accuracy once the features are already learned',
          'For classical descriptors, pool to a fixed-length representation before the SVM, which has no notion of spatial structure',
        ],
        evaluation:
          'Per-class accuracy and confusion structure rather than a single top-1 number, since one-vs-rest decomposition hides which pairs are actually confused. For linear probing, report the frozen-feature baseline alongside the fine-tuned result or the number means nothing.',
        pitfalls: [
          'Multiclass by one-vs-rest with uncalibrated decision values, so scores from different binary problems are compared on incomparable scales',
          'Quadratic training cost, which makes even a modest image dataset infeasible without subsampling',
          'Assuming an SVM adds representational power to a backbone; it adds a decision rule, and the features set the ceiling',
        ],
      },
      'natural-language': {
        fit: 'viable',
        how: 'A linear SVM on tf-idf features is the classical strong baseline for text classification: documents are very high-dimensional and very sparse, which is exactly the regime where a max-margin linear boundary generalizes well and a kernel adds nothing. Training on sparse features is cheap enough that the usual scaling objection does not apply.',
        where: [
          'Topic and intent classification with a few thousand labelled documents',
          'Spam, abuse and content-policy classifiers where the deliverable must be inspectable',
          'The baseline any transformer-based classifier is expected to beat before its cost is justified',
        ],
        why: 'With d far larger than n, a max-margin boundary is exactly the right inductive bias: there are many separating hyperplanes and the widest-margin one generalizes best. It is also close to free to train and trivial to serve. What it cannot do is anything requiring word order, negation, or semantics beyond the vocabulary — for which a pretrained language model is the answer, and the honest question is whether the accuracy gain justifies the operational cost on the task at hand.',
        featurization: [
          'tf-idf with sublinear term frequency and L2-normalized rows',
          'Character n-grams for noisy, multilingual or adversarial text where tokenization is unreliable',
          'Keep the sparse representation end to end — densifying a tf-idf matrix is what makes people conclude, wrongly, that SVMs cannot handle text',
        ],
        evaluation:
          'Macro-F1 rather than accuracy when classes are imbalanced, on a temporal split where language drifts. Inspect the top-weighted features per class — with a linear kernel they are directly readable, and this is where label noise and leakage usually surface.',
        pitfalls: [
          'Fitting the vectorizer on the full corpus before splitting, which leaks vocabulary and document frequencies',
          'Reading decision-function values as confidences without Platt scaling',
          'Losing sparsity through a dense transformation, which turns a cheap fit into an infeasible one',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Superlinear in samples and quadratic in memory: the kernel matrix alone is n^2 doubles, which is roughly 80 GB at n = 100,000. This decides whether an SVM is a candidate at all, and it decides it before any accuracy comparison is run. A linear SVM on sparse features escapes this entirely and trains in seconds.',
    inferenceProfile:
      'A linear SVM is one dot product. A kernel SVM evaluates the kernel against every support vector, so latency is proportional to the support-vector count — which is itself proportional to how much the classes overlap. A model that retained 40% of its training set as support vectors is a slow model, and the training log says so before production does.',
    retrainingCadence:
      'Infrequent by necessity rather than preference: a full refit is expensive and there is no incremental update that preserves the exact solution. Where data arrives continuously, the primal form fitted by stochastic subgradient descent is the variant that can keep up, at the cost of the kernel.',
    driftAndMonitoring: [
      'Track the support-vector fraction across refits — a rising fraction means the classes are overlapping more, and it predicts an inference-latency regression before it predicts an accuracy one',
      'Monitor the distribution of decision values near zero; a thickening band at the boundary is drift arriving before any accuracy metric moves',
      'If Platt scaling is deployed, recalibrate it on its own schedule — the sigmoid drifts well before the boundary does',
      'Persist and monitor the feature scaler as a first-class artefact, since the RBF kernel width is defined in scaled units',
    ],
    productionGotchas: [
      'Labels must be -1 and +1; passing 0/1 does not error, it silently optimizes a different objective',
      'Feature scaling is mandatory, and gamma is expressed in squared scaled units — changing the scaler invalidates every tuned gamma',
      'decision_function returns a signed distance, not a probability; anything downstream that thresholds it as a confidence is wrong unless Platt scaling was fitted on held-out data',
      'Multiclass is one-vs-rest or one-vs-one wrapped around binary SVMs, so multiclass "probabilities" are two transformations away from the objective that was actually optimized',
      'The support vectors are literal training rows shipped inside the model, which makes deletion requests and data licensing a model problem, exactly as with kNN',
    ],
  },

  assumptions: [
    'The classes are separable, or nearly so, in the feature space the kernel implies — the kernel choice IS the modelling assumption',
    'Features are scaled comparably, since both the margin and the RBF kernel are defined through distances',
    'A geometric margin is a meaningful notion for the problem; where classes overlap heavily, the boundary is arbitrary and a probabilistic model is the better fit',
    'The two error types are equally costly unless class weights say otherwise — the objective has no notion of a base rate',
    'The sample is small enough that an n-by-n kernel matrix is affordable, which is a constraint on the model, not on the hardware',
  ],

  pros: [
    {
      point: 'Margin maximization generalizes well from small samples',
      context:
        'Decisive when n is small and d is large — text, genomics, embeddings — the regime where a flexible model overfits and this one does not. The advantage fades as n grows, because at that point the data itself controls variance and cheaper models catch up.',
    },
    {
      point: 'The kernel trick buys nonlinearity without an explicit feature map',
      context:
        'You get to work in an effectively infinite-dimensional space at the cost of an n-by-n matrix. An excellent trade while n is small and a disqualifying one when it is not — the same condition, stated twice, governs when this model is appropriate.',
    },
    {
      point: 'The solution is sparse in the training points',
      context:
        'Only support vectors survive into the model, which makes it compact when classes are well separated. On noisy, overlapping data the support-vector count balloons and the sparsity advantage inverts into an inference-cost problem.',
    },
    {
      point: 'Convex objective with a unique optimum',
      context:
        'No seeds, no local minima, reproducible fits across runs and machines — which matters more in audited pipelines than the last point of accuracy, and is the same argument that keeps linear models deployed.',
    },
  ],

  cons: [
    {
      point: 'Does not scale: quadratic memory and superlinear time in the sample count',
      context:
        'A hard ceiling near 10^5 samples that no amount of tuning moves. This is the single fact that decides most SVM-versus-boosting arguments before accuracy is discussed, and it should be checked first.',
    },
    {
      point: 'No native probabilities',
      context:
        'The decision function is a signed distance. Getting calibrated probabilities requires Platt scaling on held-out data — an extra fitting step that is routinely skipped, after which people read distances as confidences and threshold them.',
    },
    {
      point: 'C and gamma interact strongly and must be tuned jointly',
      context:
        'The search is genuinely two-dimensional, and a default RBF fit at C = 1 is usually a poor showing rather than a fair baseline. Comparisons against SVMs are frequently unfair for exactly this reason.',
    },
    {
      point: 'Superseded by gradient boosting on tabular data',
      context:
        'Boosting generally wins on accuracy, training time, missing-value handling, and interpretability of feature importance. The SVM keeps the high-dimensional small-sample regime, and honestly not much outside it.',
    },
  ],

  relatedSlugs: ['k-nearest-neighbours', 'logistic-regression', 'gaussian-process'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Soft-margin SVM by subgradient descent - the primal, transcribed.

Minimize (1/2)||w||^2 + C * sum_i max(0, 1 - y_i (w . x_i + b)).

The hinge is not differentiable at the margin, so this takes a subgradient: a
point inside the margin contributes -C * y_i * x_i, and a point safely outside
contributes nothing at all. That single if-statement is the whole difference
between this and a least-squares fit.
"""


def fit(X, y, C=1.0, lr=0.001, epochs=1_000):
    """y must be in {-1, +1}: the margin is defined on signs, not on 0/1."""
    n = len(X)
    d = len(X[0])
    w = [0.0] * d
    b = 0.0

    for _ in range(epochs):
        grad_w = [0.0] * d
        grad_b = 0.0

        for i in range(n):
            # margin = y_i (w . x_i + b)
            score = b
            for j in range(d):
                score += w[j] * X[i][j]
            margin = y[i] * score

            if margin < 1.0:                       # hinge is active
                for j in range(d):
                    grad_w[j] -= C * y[i] * X[i][j]
                grad_b -= C * y[i]

        # The L2 term contributes w itself; the hinge term was accumulated above.
        for j in range(d):
            w[j] -= lr * (w[j] + grad_w[j])
        b -= lr * grad_b

    return w, b


def decision_function(w, b, x):
    score = b
    for j in range(len(w)):
        score += w[j] * x[j]
    return score`,
        profile: 'O(n*d) per epoch in interpreter loops. Linear only: the primal carries an explicit w, so there is nowhere for a kernel to go.',
      },
      'make-it-right': {
        code: `"""Kernel SVM by sequential minimal optimization - typed, validated, dual."""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Kernel = Callable[[Matrix, Matrix], Matrix]


def linear_kernel() -> Kernel:
    return lambda a, b: a @ b.T


def rbf_kernel(gamma: float) -> Kernel:
    """K(a, b) = exp(-gamma ||a - b||^2), via the squared-norm expansion."""

    def kernel(a: Matrix, b: Matrix) -> Matrix:
        squared = (
            np.einsum("ij,ij->i", a, a)[:, None]
            - 2.0 * (a @ b.T)
            + np.einsum("ij,ij->i", b, b)[None, :]
        )
        # Cancellation in the expansion can produce small negatives; clip before
        # exponentiating rather than letting them become spurious similarities.
        return np.exp(-gamma * np.maximum(squared, 0.0))

    return kernel


@dataclass(frozen=True)
class SvmModel:
    """Only the support vectors survive - every other alpha is exactly zero."""

    support_vectors: Matrix
    dual_coefficients: Vector      # alpha_i * y_i, one per support vector
    intercept: float
    kernel: Kernel

    @property
    def n_support(self) -> int:
        return int(self.support_vectors.shape[0])

    def decision_function(self, X: Matrix) -> Vector:
        """A signed distance to the boundary. NOT a probability."""
        if X.ndim != 2 or X.shape[1] != self.support_vectors.shape[1]:
            raise ValueError(
                f"expected (n, {self.support_vectors.shape[1]}) input, got {X.shape}"
            )
        return self.kernel(X, self.support_vectors) @ self.dual_coefficients + self.intercept

    def predict(self, X: Matrix) -> Vector:
        return np.sign(self.decision_function(X))


def _bounds(y_i: float, y_j: float, a_i: float, a_j: float, C: float) -> tuple[float, float]:
    """The segment alpha_j may move along without breaking sum(alpha y) = 0."""
    if y_i != y_j:
        return max(0.0, a_j - a_i), min(C, C + a_j - a_i)
    return max(0.0, a_i + a_j - C), min(C, a_i + a_j)


def fit(
    X: Matrix,
    y: Vector,
    C: float = 1.0,
    kernel: Kernel | None = None,
    max_passes: int = 10,
    tol: float = 1e-3,
) -> SvmModel:
    """Simplified SMO on the dual. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if not np.isin(y, (-1.0, 1.0)).all():
        raise ValueError("labels must be -1 or +1; 0/1 optimizes a different objective")
    if C <= 0.0:
        raise ValueError(f"C must be positive, got {C}")

    # None rather than a default kernel object: a mutable default would be
    # shared across every call.
    active_kernel = linear_kernel() if kernel is None else kernel

    n = X.shape[0]
    alpha = np.zeros(n, dtype=np.float64)
    intercept = 0.0
    rng = np.random.default_rng(0)
    passes = 0

    while passes < max_passes:
        changed = 0

        for i in range(n):
            # Kernel rows are computed on demand: the full Gram is O(n^2) and
            # is the thing that puts a ceiling on this model.
            row_i = active_kernel(X[i : i + 1], X)[0]
            error_i = float(row_i @ (alpha * y)) + intercept - y[i]

            violates_kkt = (y[i] * error_i < -tol and alpha[i] < C) or (
                y[i] * error_i > tol and alpha[i] > 0.0
            )
            if not violates_kkt:
                continue

            j = int(rng.integers(n - 1))
            j = j + 1 if j >= i else j
            row_j = active_kernel(X[j : j + 1], X)[0]
            error_j = float(row_j @ (alpha * y)) + intercept - y[j]

            old_i, old_j = float(alpha[i]), float(alpha[j])
            low, high = _bounds(float(y[i]), float(y[j]), old_i, old_j, C)
            if high - low < 1e-12:
                continue

            # Second derivative of the objective along the alpha_j direction.
            eta = 2.0 * row_i[j] - row_i[i] - row_j[j]
            if eta >= 0.0:
                continue

            alpha[j] = float(np.clip(old_j - y[j] * (error_i - error_j) / eta, low, high))
            if abs(alpha[j] - old_j) < 1e-5:
                continue
            alpha[i] = old_i + y[i] * y[j] * (old_j - alpha[j])

            # Restore the KKT condition on b using whichever multiplier is
            # unbound, since an unbound point sits exactly on the margin.
            b_i = intercept - error_i - y[i] * (alpha[i] - old_i) * row_i[i] - y[j] * (
                alpha[j] - old_j
            ) * row_i[j]
            b_j = intercept - error_j - y[i] * (alpha[i] - old_i) * row_i[j] - y[j] * (
                alpha[j] - old_j
            ) * row_j[j]
            if 0.0 < alpha[i] < C:
                intercept = float(b_i)
            elif 0.0 < alpha[j] < C:
                intercept = float(b_j)
            else:
                intercept = float((b_i + b_j) / 2.0)

            changed += 1

        passes = passes + 1 if changed == 0 else 0

    support = alpha > 1e-8
    return SvmModel(
        support_vectors=X[support],
        dual_coefficients=alpha[support] * y[support],
        intercept=intercept,
        kernel=active_kernel,
    )`,
        rationale:
          'This is a change of formulation, not of style, and it is the point of the entry: subgradient descent on the primal carries an explicit weight vector, so it can never use a kernel. The dual touches the data only through inner products, which is what makes a nonlinear boundary expressible at all — so the algorithm becomes SMO over pairs of multipliers, paired because the equality constraint forbids moving one alone. Around that, the idiomatic changes: the kernel is an injected callable rather than hard-coded arithmetic, the fitted model is a frozen dataclass retaining only support vectors, labels are validated as ±1 (the failure that otherwise optimizes a different objective in silence), and the KKT test is a guard clause rather than nested conditionals.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'No mutable default arguments',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(n*d) per kernel row, two rows per candidate pair. Memory stays O(n) because the Gram is never materialized.',
      },
      'make-it-fast': {
        code: `"""Kernel SVM - precomputed Gram, maintained error cache, in-place updates."""

from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]
Kernel = Callable[[Matrix, Matrix], Matrix]


def fit_cached(
    X: Matrix,
    y: Vector,
    kernel: Kernel,
    C: float = 1.0,
    max_passes: int = 10,
    tol: float = 1e-3,
) -> tuple[Vector, float]:
    """SMO with the two structural accelerations every real solver uses.

    First, the Gram matrix is computed once as a single kernel call over the
    whole dataset - one GEMM inside the kernel rather than 2n row evaluations
    per pass. The cost is O(n^2) memory, and that is not an implementation
    detail: it is the reason SVMs stop being trainable somewhere near 100k
    samples, and it should be checked before the model is chosen.

    Second, an error cache. E_i depends on every alpha, so recomputing it from
    a Gram row is O(n) per candidate; but a pair update changes exactly two
    alphas, so every cached error can be corrected with one vector expression.
    """
    design = np.ascontiguousarray(X, dtype=np.float64)
    labels = np.ascontiguousarray(y, dtype=np.float64)
    n = design.shape[0]

    gram = np.ascontiguousarray(kernel(design, design), dtype=np.float64)

    alpha = np.zeros(n, dtype=np.float64)                 # allocated once
    errors = -labels.copy()                               # E_i at alpha = 0, b = 0
    scratch = np.empty(n, dtype=np.float64)               # reused per update
    intercept = 0.0
    rng = np.random.default_rng(0)
    passes = 0

    while passes < max_passes:
        changed = 0

        for i in range(n):
            if not (
                (labels[i] * errors[i] < -tol and alpha[i] < C)
                or (labels[i] * errors[i] > tol and alpha[i] > 0.0)
            ):
                continue

            # Second-choice heuristic: the pair with the largest error gap makes
            # the largest step, so the working set is chosen rather than sampled.
            j = int(np.argmax(np.abs(errors - errors[i])))
            if j == i:
                j = int(rng.integers(n - 1))
                j = j + 1 if j >= i else j

            old_i, old_j = float(alpha[i]), float(alpha[j])
            if labels[i] != labels[j]:
                low, high = max(0.0, old_j - old_i), min(C, C + old_j - old_i)
            else:
                low, high = max(0.0, old_i + old_j - C), min(C, old_i + old_j)
            if high - low < 1e-12:
                continue

            eta = 2.0 * gram[i, j] - gram[i, i] - gram[j, j]
            if eta >= 0.0:
                continue

            new_j = min(max(old_j - labels[j] * (errors[i] - errors[j]) / eta, low), high)
            if abs(new_j - old_j) < 1e-5:
                continue
            new_i = old_i + labels[i] * labels[j] * (old_j - new_j)

            delta_i = labels[i] * (new_i - old_i)
            delta_j = labels[j] * (new_j - old_j)

            b_i = intercept - errors[i] - delta_i * gram[i, i] - delta_j * gram[i, j]
            b_j = intercept - errors[j] - delta_i * gram[i, j] - delta_j * gram[j, j]
            if 0.0 < new_i < C:
                new_intercept = float(b_i)
            elif 0.0 < new_j < C:
                new_intercept = float(b_j)
            else:
                new_intercept = float((b_i + b_j) / 2.0)

            # errors += d_i * K[i] + d_j * K[j] + (b_new - b_old), fused into
            # the reusable scratch buffer so no temporary row is materialized.
            np.multiply(gram[i], delta_i, out=scratch)
            scratch += delta_j * gram[j]
            scratch += new_intercept - intercept
            errors += scratch

            alpha[i], alpha[j] = new_i, new_j
            intercept = new_intercept
            changed += 1

        passes = passes + 1 if changed == 0 else 0

    return alpha, intercept`,
        rationale:
          'Two accelerations, both structural. The kernel matrix is evaluated once for the whole dataset instead of two rows per candidate pair, which moves the work into one BLAS-backed call — and buys it with O(n^2) memory, the constraint that defines where this model can be used at all. Then the error cache: E_i depends on every multiplier, so recomputing it per candidate was the dominant cost, but a pair update perturbs exactly two multipliers, so every cached error can be corrected by one fused vector expression. Working-set selection also stops being random and picks the maximum-error-gap partner, which is what turns simplified SMO into something that converges in a sensible number of passes.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The Gram matrix is one kernel call over the full dataset, which for linear and RBF kernels bottoms out in a single GEMM rather than n separate row evaluations per pass.',
            tradeoff: 'O(n^2) memory — roughly 80 GB at n = 100,000 — which is precisely the ceiling that rules SVMs out on large datasets. This optimization buys speed by spending the resource the model is already short of.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Every cached error is corrected by one vector expression after a pair update, replacing an O(n) per-candidate recomputation from a kernel row.',
            tradeoff: 'The cache is incrementally maintained, so floating-point error accumulates over many updates and a long run needs a periodic full refresh — and a stale cache produces a wrong answer rather than a slow one.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The multipliers, error vector and update scratch are allocated once; the error correction writes through the scratch buffer rather than materializing a temporary row per update.',
            tradeoff: 'The in-place chain is order-dependent and the scratch buffer is shared state, so reordering the update lines corrupts the errors silently instead of raising.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n^2 d) once for the Gram, then O(n) per multiplier-pair update. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Soft-margin SVM by subgradient descent - the primal, transcribed.
#include <cstddef>
#include <vector>

// Minimize (1/2)||w||^2 + C * sum_i max(0, 1 - y_i (w . x_i + b)).
// y must be -1 or +1: the margin is defined on signs.
std::vector<double> Fit(const std::vector<std::vector<double>>& X,
                        const std::vector<int>& y,
                        double C,
                        double lr,
                        int epochs,
                        double& bias_out) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> w(d, 0.0);
  double b = 0.0;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    std::vector<double> grad_w(d, 0.0);
    double grad_b = 0.0;

    for (std::size_t i = 0; i < n; ++i) {
      double score = b;
      for (std::size_t j = 0; j < d; ++j) {
        score += w[j] * X[i][j];
      }
      const double margin = static_cast<double>(y[i]) * score;

      if (margin < 1.0) {                       // hinge is active
        for (std::size_t j = 0; j < d; ++j) {
          grad_w[j] -= C * static_cast<double>(y[i]) * X[i][j];
        }
        grad_b -= C * static_cast<double>(y[i]);
      }
    }

    // The L2 term contributes w itself; the hinge term is accumulated above.
    for (std::size_t j = 0; j < d; ++j) {
      w[j] -= lr * (w[j] + grad_w[j]);
    }
    b -= lr * grad_b;
  }

  bias_out = b;
  return w;
}`,
        profile: 'O(n*d) per epoch, one allocation per epoch, and linear only — an explicit w leaves nowhere for a kernel to go.',
      },
      'make-it-right': {
        code: `// Kernel SVM by SMO - RAII, const-correct, kernel injected, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <functional>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// The kernel is the modelling assumption, so it enters as a value.
using Kernel = std::function<double(std::span<const double>, std::span<const double>)>;

[[nodiscard]] inline Kernel LinearKernel() {
  return [](std::span<const double> a, std::span<const double> b) {
    double total = 0.0;
    for (std::size_t j = 0; j < a.size(); ++j) total += a[j] * b[j];
    return total;
  };
}

[[nodiscard]] inline Kernel RbfKernel(double gamma) {
  return [gamma](std::span<const double> a, std::span<const double> b) {
    double squared = 0.0;
    for (std::size_t j = 0; j < a.size(); ++j) {
      const double difference = a[j] - b[j];
      squared += difference * difference;
    }
    return std::exp(-gamma * squared);
  };
}

// Retains only the support vectors; every other multiplier is exactly zero.
class SvmModel {
 public:
  SvmModel(std::vector<double> support_vectors, std::vector<double> dual_coefficients,
           double intercept, Kernel kernel, std::size_t dimension)
      : support_vectors_(std::move(support_vectors)),
        dual_coefficients_(std::move(dual_coefficients)),
        intercept_(intercept),
        kernel_(std::move(kernel)),
        dimension_(dimension) {}

  // A signed distance to the boundary - NOT a probability.
  [[nodiscard]] double DecisionFunction(std::span<const double> x) const {
    if (x.size() != dimension_) {
      throw std::invalid_argument("input width does not match the model");
    }
    double total = intercept_;
    for (std::size_t s = 0; s < dual_coefficients_.size(); ++s) {
      const std::span<const double> support(
          support_vectors_.data() + s * dimension_, dimension_);
      total += dual_coefficients_[s] * kernel_(x, support);
    }
    return total;
  }

  [[nodiscard]] std::size_t NumSupportVectors() const noexcept {
    return dual_coefficients_.size();
  }

 private:
  std::vector<double> support_vectors_;   // row-major, owned
  std::vector<double> dual_coefficients_;
  double intercept_;
  Kernel kernel_;
  std::size_t dimension_;
};

// x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
SvmModel Fit(std::span<const double> x_flat, std::span<const int> y, std::size_t d,
             const Kernel& kernel, double C, int max_passes, double tol) {
  if (d == 0 || y.empty()) throw std::invalid_argument("empty problem");
  if (x_flat.size() != y.size() * d) {
    throw std::invalid_argument("X and y describe different row counts");
  }
  if (C <= 0.0) throw std::invalid_argument("C must be positive");
  for (const int label : y) {
    if (label != 1 && label != -1) {
      throw std::invalid_argument("labels must be -1 or +1");
    }
  }

  const std::size_t n = y.size();
  const auto row = [&](std::size_t index) {
    return std::span<const double>(x_flat.data() + index * d, d);
  };

  std::vector<double> alpha(n, 0.0);
  double intercept = 0.0;
  std::mt19937 generator(0);
  int passes = 0;

  // Error against the current dual solution. Kernel entries are evaluated on
  // demand: caching all n^2 of them is what puts a ceiling on this model.
  const auto error_at = [&](std::size_t index) {
    double total = intercept - static_cast<double>(y[index]);
    for (std::size_t k = 0; k < n; ++k) {
      if (alpha[k] == 0.0) continue;             // only support vectors count
      total += alpha[k] * static_cast<double>(y[k]) * kernel(row(index), row(k));
    }
    return total;
  };

  while (passes < max_passes) {
    int changed = 0;

    for (std::size_t i = 0; i < n; ++i) {
      const double error_i = error_at(i);
      const double y_i = static_cast<double>(y[i]);

      const bool violates_kkt = (y_i * error_i < -tol && alpha[i] < C) ||
                                (y_i * error_i > tol && alpha[i] > 0.0);
      if (!violates_kkt) continue;

      std::uniform_int_distribution<std::size_t> pick(0, n - 2);
      std::size_t j = pick(generator);
      if (j >= i) ++j;

      const double error_j = error_at(j);
      const double y_j = static_cast<double>(y[j]);
      const double old_i = alpha[i];
      const double old_j = alpha[j];

      // The segment alpha_j may move along without breaking sum(alpha y) = 0.
      const double low = (y_i != y_j) ? std::max(0.0, old_j - old_i)
                                      : std::max(0.0, old_i + old_j - C);
      const double high = (y_i != y_j) ? std::min(C, C + old_j - old_i)
                                       : std::min(C, old_i + old_j);
      if (high - low < 1e-12) continue;

      const double k_ii = kernel(row(i), row(i));
      const double k_jj = kernel(row(j), row(j));
      const double k_ij = kernel(row(i), row(j));
      const double eta = 2.0 * k_ij - k_ii - k_jj;
      if (eta >= 0.0) continue;

      const double moved =
          std::clamp(old_j - y_j * (error_i - error_j) / eta, low, high);
      if (std::abs(moved - old_j) < 1e-5) continue;

      alpha[j] = moved;
      alpha[i] = old_i + y_i * y_j * (old_j - moved);

      const double delta_i = y_i * (alpha[i] - old_i);
      const double delta_j = y_j * (alpha[j] - old_j);
      const double b_i = intercept - error_i - delta_i * k_ii - delta_j * k_ij;
      const double b_j = intercept - error_j - delta_i * k_ij - delta_j * k_jj;

      if (alpha[i] > 0.0 && alpha[i] < C) {
        intercept = b_i;
      } else if (alpha[j] > 0.0 && alpha[j] < C) {
        intercept = b_j;
      } else {
        intercept = (b_i + b_j) / 2.0;
      }
      ++changed;
    }

    passes = (changed == 0) ? passes + 1 : 0;
  }

  std::vector<double> support_vectors;
  std::vector<double> dual_coefficients;
  for (std::size_t i = 0; i < n; ++i) {
    if (alpha[i] <= 1e-8) continue;
    support_vectors.insert(support_vectors.end(), row(i).begin(), row(i).end());
    dual_coefficients.push_back(alpha[i] * static_cast<double>(y[i]));
  }

  return SvmModel(std::move(support_vectors), std::move(dual_coefficients), intercept,
                  kernel, d);
}`,
        rationale:
          'The formulation moves from the primal to the dual, which is what makes a kernel expressible at all — with an explicit weight vector there is nowhere for one to go. Structurally: the nested vector becomes one flat row-major buffer viewed through spans, the kernel is injected as a value rather than written into the loop, the label contract is checked before any allocation (passing 0/1 otherwise optimizes a different objective in silence), and the fitted model owns only its support vectors, which is the compact artefact the dual solution actually produces.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d) per kernel evaluation with the Gram never materialized, so memory stays O(n) and time pays for it.',
      },
      'make-it-fast': {
        code: `// Kernel SVM - Eigen Gram computed once, error cache, OpenMP.
#include <Eigen/Dense>
#include <algorithm>
#include <cmath>
#include <stdexcept>

// One kernel matrix for the whole dataset.
//
// The RBF kernel is a function of squared distance, and
//   ||a - b||^2 = ||a||^2 - 2 a . b + ||b||^2
// so the only term involving both operands is a GEMM. This is the fast way to
// build the Gram - and it costs O(n^2) memory, which is exactly the constraint
// that decides whether an SVM is usable on a given dataset.
[[nodiscard]] Eigen::MatrixXd RbfGram(const Eigen::MatrixXd& X, double gamma) {
  const Eigen::VectorXd norms = X.rowwise().squaredNorm();
  Eigen::MatrixXd squared = (-2.0 * (X * X.transpose())).colwise() + norms;
  squared.rowwise() += norms.transpose();
  return (-gamma * squared.cwiseMax(0.0)).array().exp();
}

// SMO with a maintained error cache. Returns the dual multipliers.
Eigen::VectorXd FitCached(const Eigen::MatrixXd& gram,
                          const Eigen::VectorXd& y,
                          double C,
                          int max_passes,
                          double tol,
                          double& intercept_out) {
  if (gram.rows() != gram.cols() || gram.rows() != y.size()) {
    throw std::invalid_argument("gram must be square and match y");
  }

  const Eigen::Index n = y.size();
  Eigen::VectorXd alpha = Eigen::VectorXd::Zero(n);
  Eigen::VectorXd errors = -y;          // E_i at alpha = 0, b = 0
  double intercept = 0.0;
  int passes = 0;

  while (passes < max_passes) {
    int changed = 0;

    for (Eigen::Index i = 0; i < n; ++i) {
      const double margin = y[i] * errors[i];
      if (!((margin < -tol && alpha[i] < C) || (margin > tol && alpha[i] > 0.0))) {
        continue;
      }

      // Largest error gap makes the largest step: choose the partner rather
      // than sampling it. The scan is independent per element.
      Eigen::Index j = i;
      double best_gap = -1.0;
#pragma omp parallel for reduction(max : best_gap) schedule(static)
      for (Eigen::Index candidate = 0; candidate < n; ++candidate) {
        const double gap = std::abs(errors[candidate] - errors[i]);
        if (gap > best_gap) best_gap = gap;
      }
      for (Eigen::Index candidate = 0; candidate < n; ++candidate) {
        if (candidate != i && std::abs(errors[candidate] - errors[i]) == best_gap) {
          j = candidate;
          break;
        }
      }
      if (j == i) continue;

      const double old_i = alpha[i];
      const double old_j = alpha[j];
      const double low = (y[i] != y[j]) ? std::max(0.0, old_j - old_i)
                                        : std::max(0.0, old_i + old_j - C);
      const double high = (y[i] != y[j]) ? std::min(C, C + old_j - old_i)
                                         : std::min(C, old_i + old_j);
      if (high - low < 1e-12) continue;

      const double eta = 2.0 * gram(i, j) - gram(i, i) - gram(j, j);
      if (eta >= 0.0) continue;

      const double moved =
          std::clamp(old_j - y[j] * (errors[i] - errors[j]) / eta, low, high);
      if (std::abs(moved - old_j) < 1e-5) continue;

      alpha[j] = moved;
      alpha[i] = old_i + y[i] * y[j] * (old_j - moved);

      const double delta_i = y[i] * (alpha[i] - old_i);
      const double delta_j = y[j] * (alpha[j] - old_j);
      const double b_i = intercept - errors[i] - delta_i * gram(i, i) - delta_j * gram(i, j);
      const double b_j = intercept - errors[j] - delta_i * gram(i, j) - delta_j * gram(j, j);
      const double next_intercept =
          (alpha[i] > 0.0 && alpha[i] < C)   ? b_i
          : (alpha[j] > 0.0 && alpha[j] < C) ? b_j
                                             : (b_i + b_j) / 2.0;

      // One fused pass over the cache; no intermediate vector is materialized.
      errors += delta_i * gram.col(i) + delta_j * gram.col(j) +
                Eigen::VectorXd::Constant(n, next_intercept - intercept);
      intercept = next_intercept;
      ++changed;
    }

    passes = (changed == 0) ? passes + 1 : 0;
  }

  intercept_out = intercept;
  return alpha;
}`,
        rationale:
          'The on-demand kernel evaluations become one Gram matrix built through the squared-norm expansion, so the dominant cost lands in a single GEMM instead of two O(n·d) row scans per candidate pair — paid for in O(n^2) memory, which is the model’s defining constraint rather than an implementation footnote. The per-candidate error recomputation becomes a maintained cache corrected by one fused Eigen expression per update, and partner selection becomes a parallel maximum-gap scan rather than a random draw, which is what makes the pass count reasonable.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'X * X.transpose() is the only term in the RBF expansion that touches both operands, and Eigen dispatches it to a blocked GEMM instead of n^2 separate distance loops.',
            tradeoff: 'Produces an n-by-n matrix — about 80 GB at n = 100,000 — so this optimization spends exactly the resource that limits the model, and is only correct to apply when n is known to be small.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The error-cache correction is one fused expression over two Gram columns and a constant, evaluated in a single pass with no intermediate vectors allocated per update.',
            tradeoff: 'Verbose compiler diagnostics, and an expression bound to auto rather than assigned can outlive its operands and dangle.',
          },
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'The maximum-error-gap scan over candidates is a pure reduction with no shared mutable state, so it partitions across cores cleanly.',
            tradeoff: 'The scan is memory-bound and short, so on small n the fork-join overhead exceeds the work — and nesting it around an already-threaded BLAS risks oversubscription.',
          },
        ],
        libraryName: 'Eigen + OpenMP',
        profile: 'O(n^2 d) once for the Gram, then O(n) per multiplier-pair update. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Soft-margin SVM by subgradient descent - the primal, transcribed.

/// Minimize (1/2)||w||^2 + C * sum_i max(0, 1 - y_i (w . x_i + b)).
/// y must be -1 or +1: the margin is defined on signs, not on 0/1.
pub fn fit(
    x: &[Vec<f64>],
    y: &[f64],
    c: f64,
    lr: f64,
    epochs: usize,
) -> (Vec<f64>, f64) {
    let n = x.len();
    let d = x[0].len();
    let mut w = vec![0.0; d];
    let mut b = 0.0;

    for _ in 0..epochs {
        let mut grad_w = vec![0.0; d];
        let mut grad_b = 0.0;

        for i in 0..n {
            let mut score = b;
            for j in 0..d {
                score += w[j] * x[i][j];
            }
            let margin = y[i] * score;

            if margin < 1.0 {
                // Hinge is active: subgradient contribution is -C * y_i * x_i.
                for j in 0..d {
                    grad_w[j] -= c * y[i] * x[i][j];
                }
                grad_b -= c * y[i];
            }
        }

        // The L2 term contributes w itself; the hinge term is accumulated above.
        for j in 0..d {
            w[j] -= lr * (w[j] + grad_w[j]);
        }
        b -= lr * grad_b;
    }

    (w, b)
}`,
        profile: 'O(n*d) per epoch, every index bounds-checked, two allocations per epoch, and linear only — an explicit w admits no kernel.',
      },
      'make-it-right': {
        code: `//! Kernel SVM by SMO - a Kernel trait, typed errors, borrowed slices.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Labels,
    Cost { value: f64 },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Labels => write!(f, "labels must be -1.0 or +1.0"),
            Self::Cost { value } => write!(f, "C must be positive and finite, got {value}"),
        }
    }
}

impl std::error::Error for FitError {}

/// The modelling assumption, as a trait. Implementing it is the whole cost of
/// adding a kernel, and the solver below never changes.
pub trait Kernel {
    fn evaluate(&self, a: &[f64], b: &[f64]) -> f64;
}

pub struct Linear;

impl Kernel for Linear {
    #[inline]
    fn evaluate(&self, a: &[f64], b: &[f64]) -> f64 {
        a.iter().zip(b).map(|(x, y)| x * y).sum()
    }
}

/// Inverse kernel width. A newtype because gamma and C are both bare f64 and
/// transposing them at a call site produces a plausible, wrong model.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Gamma(f64);

impl Gamma {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value <= 0.0 {
            return Err(FitError::Cost { value });
        }
        Ok(Self(value))
    }
}

pub struct Rbf(pub Gamma);

impl Kernel for Rbf {
    #[inline]
    fn evaluate(&self, a: &[f64], b: &[f64]) -> f64 {
        let squared: f64 = a
            .iter()
            .zip(b)
            .map(|(x, y)| {
                let difference = x - y;
                difference * difference
            })
            .sum();
        (-self.0 .0 * squared).exp()
    }
}

pub struct SvmFit {
    pub alpha: Vec<f64>,
    pub intercept: f64,
}

impl SvmFit {
    /// Indices with a non-zero multiplier - the support vectors, and the only
    /// rows that need to be retained.
    #[must_use]
    pub fn support(&self) -> Vec<usize> {
        self.alpha
            .iter()
            .enumerate()
            .filter(|(_, &a)| a > 1e-8)
            .map(|(index, _)| index)
            .collect()
    }
}

/// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
pub fn fit<K: Kernel>(
    x_flat: &[f64],
    y: &[f64],
    d: usize,
    kernel: &K,
    c: f64,
    max_passes: usize,
    tol: f64,
) -> Result<SvmFit, FitError> {
    if d == 0 || y.is_empty() {
        return Err(FitError::Empty);
    }
    if x_flat.len() != y.len() * d {
        return Err(FitError::ShapeMismatch {
            expected: y.len() * d,
            found: x_flat.len(),
        });
    }
    if !c.is_finite() || c <= 0.0 {
        return Err(FitError::Cost { value: c });
    }
    if y.iter().any(|label| *label != 1.0 && *label != -1.0) {
        return Err(FitError::Labels);
    }

    let n = y.len();
    let row = |index: usize| &x_flat[index * d..(index + 1) * d];

    let mut alpha = vec![0.0_f64; n];
    let mut intercept = 0.0_f64;
    let mut passes = 0;
    let mut cursor = 0_usize;

    // Kernel entries are evaluated on demand: caching all n^2 is what puts the
    // ceiling on this model, so the memory-light version pays in time instead.
    let error_at = |alpha: &[f64], intercept: f64, index: usize| -> f64 {
        alpha
            .iter()
            .enumerate()
            .filter(|(_, &a)| a != 0.0)
            .map(|(k, &a)| a * y[k] * kernel.evaluate(row(index), row(k)))
            .sum::<f64>()
            + intercept
            - y[index]
    };

    while passes < max_passes {
        let mut changed = 0;

        for i in 0..n {
            let error_i = error_at(&alpha, intercept, i);
            let violates_kkt = (y[i] * error_i < -tol && alpha[i] < c)
                || (y[i] * error_i > tol && alpha[i] > 0.0);
            if !violates_kkt {
                continue;
            }

            // Deterministic partner rotation, so a fit is reproducible.
            cursor = (cursor + 1) % n;
            let j = if cursor == i { (cursor + 1) % n } else { cursor };
            if j == i {
                continue;
            }

            let error_j = error_at(&alpha, intercept, j);
            let (old_i, old_j) = (alpha[i], alpha[j]);

            // The segment alpha_j may move along without breaking sum(alpha y) = 0.
            let (low, high) = if y[i] != y[j] {
                ((old_j - old_i).max(0.0), c.min(c + old_j - old_i))
            } else {
                ((old_i + old_j - c).max(0.0), c.min(old_i + old_j))
            };
            if high - low < 1e-12 {
                continue;
            }

            let k_ii = kernel.evaluate(row(i), row(i));
            let k_jj = kernel.evaluate(row(j), row(j));
            let k_ij = kernel.evaluate(row(i), row(j));
            let eta = 2.0 * k_ij - k_ii - k_jj;
            if eta >= 0.0 {
                continue;
            }

            let moved = (old_j - y[j] * (error_i - error_j) / eta).clamp(low, high);
            if (moved - old_j).abs() < 1e-5 {
                continue;
            }

            alpha[j] = moved;
            alpha[i] = old_i + y[i] * y[j] * (old_j - moved);

            let delta_i = y[i] * (alpha[i] - old_i);
            let delta_j = y[j] * (alpha[j] - old_j);
            let b_i = intercept - error_i - delta_i * k_ii - delta_j * k_ij;
            let b_j = intercept - error_j - delta_i * k_ij - delta_j * k_jj;

            intercept = if alpha[i] > 0.0 && alpha[i] < c {
                b_i
            } else if alpha[j] > 0.0 && alpha[j] < c {
                b_j
            } else {
                (b_i + b_j) / 2.0
            };
            changed += 1;
        }

        passes = if changed == 0 { passes + 1 } else { 0 };
    }

    Ok(SvmFit { alpha, intercept })
}
`,
        rationale:
          'The formulation moves to the dual, which is what admits a kernel at all — and in Rust the kernel becomes a trait with a generic bound rather than a boxed closure, so the calls still inline. Errors become a typed Result covering the contract that otherwise fails silently: labels outside {-1, +1} do not error in any of these implementations, they optimize a different objective. Gamma is a validated newtype because it and C are both bare f64 at the call site. Row access goes through a flat row-major slice, and the error computation becomes an iterator chain that skips zero multipliers rather than an indexed loop over the whole set.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d) per kernel evaluation and O(n) evaluations per candidate, with memory held at O(n) because no Gram exists.',
      },
      'make-it-fast': {
        code: `//! Kernel SVM - Gram built once in parallel, error cache, BLAS-backed.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use rayon::prelude::*;

/// RBF Gram matrix for the whole dataset, built through the squared-norm
/// expansion so the only pairwise term is a matrix product.
///
/// This is the fast way to build it and also the reason SVMs have a size
/// ceiling: the result is n-by-n, roughly 80 GB at n = 100,000. The right time
/// to notice that is while choosing the model, not while fitting it.
#[must_use]
pub fn rbf_gram(x: ArrayView2<f64>, gamma: f64) -> Array2<f64> {
    let norms: Array1<f64> = x.axis_iter(Axis(0)).map(|row| row.dot(&row)).collect();
    let cross = x.dot(&x.t());                     // dispatches to BLAS

    let n = norms.len();
    let mut gram = Array2::<f64>::zeros((n, n));
    gram.axis_iter_mut(Axis(0))
        .into_par_iter()
        .enumerate()
        .for_each(|(i, mut row)| {
            for j in 0..n {
                let squared = (norms[i] - 2.0 * cross[[i, j]] + norms[j]).max(0.0);
                row[j] = (-gamma * squared).exp();
            }
        });
    gram
}

/// SMO with a maintained error cache over a precomputed Gram matrix.
///
/// E_i depends on every multiplier, so recomputing it per candidate was the
/// dominant cost. A pair update perturbs exactly two multipliers, so each
/// cached error is corrected by one pass over two Gram columns.
#[must_use]
pub fn fit_cached(
    gram: ArrayView2<f64>,
    y: &[f64],
    c: f64,
    max_passes: usize,
    tol: f64,
) -> (Vec<f64>, f64) {
    let n = y.len();
    let mut alpha = vec![0.0_f64; n];
    let mut errors: Vec<f64> = y.iter().map(|label| -label).collect();
    let mut intercept = 0.0_f64;
    let mut passes = 0;

    while passes < max_passes {
        let mut changed = 0;

        for i in 0..n {
            let margin = y[i] * errors[i];
            if !((margin < -tol && alpha[i] < c) || (margin > tol && alpha[i] > 0.0)) {
                continue;
            }

            // Largest error gap makes the largest step - a parallel argmax,
            // since every candidate is independent.
            let reference = errors[i];
            let j = errors
                .par_iter()
                .enumerate()
                .filter(|(index, _)| *index != i)
                .max_by(|(_, a), (_, b)| {
                    (*a - reference)
                        .abs()
                        .total_cmp(&(*b - reference).abs())
                })
                .map_or(i, |(index, _)| index);
            if j == i {
                continue;
            }

            let (old_i, old_j) = (alpha[i], alpha[j]);
            let (low, high) = if y[i] != y[j] {
                ((old_j - old_i).max(0.0), c.min(c + old_j - old_i))
            } else {
                ((old_i + old_j - c).max(0.0), c.min(old_i + old_j))
            };
            if high - low < 1e-12 {
                continue;
            }

            let eta = 2.0 * gram[[i, j]] - gram[[i, i]] - gram[[j, j]];
            if eta >= 0.0 {
                continue;
            }

            let moved = (old_j - y[j] * (errors[i] - errors[j]) / eta).clamp(low, high);
            if (moved - old_j).abs() < 1e-5 {
                continue;
            }

            alpha[j] = moved;
            alpha[i] = old_i + y[i] * y[j] * (old_j - moved);

            let delta_i = y[i] * (alpha[i] - old_i);
            let delta_j = y[j] * (alpha[j] - old_j);
            let b_i = intercept - errors[i] - delta_i * gram[[i, i]] - delta_j * gram[[i, j]];
            let b_j = intercept - errors[j] - delta_i * gram[[i, j]] - delta_j * gram[[j, j]];
            let next_intercept = if alpha[i] > 0.0 && alpha[i] < c {
                b_i
            } else if alpha[j] > 0.0 && alpha[j] < c {
                b_j
            } else {
                (b_i + b_j) / 2.0
            };

            let shift = next_intercept - intercept;
            let column_i = gram.column(i);
            let column_j = gram.column(j);
            errors
                .par_iter_mut()
                .enumerate()
                .for_each(|(index, error)| {
                    *error += delta_i * column_i[index] + delta_j * column_j[index] + shift;
                });

            intercept = next_intercept;
            changed += 1;
        }

        passes = if changed == 0 { passes + 1 } else { 0 };
    }

    (alpha, intercept)
}
`,
        rationale:
          'The on-demand kernel evaluations become a Gram matrix built once, with the pairwise term expressed as a matrix product that ndarray hands to BLAS and the exponentiation fanned out across rows with rayon. Cost: O(n^2) memory, which is the model’s defining limit rather than a detail. The per-candidate error recomputation becomes an incrementally maintained cache — a pair update touches two multipliers, so two Gram columns correct the whole vector — and both the partner search and the cache update are parallel maps, because each element is independent of the others.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'x.dot(&x.t()) is the only pairwise term in the RBF expansion and dispatches to a blocked GEMM rather than n^2 hand-written distance loops.',
            tradeoff: 'Binds the build to a system BLAS, and the n-by-n result is precisely the resource the model is short of — this speeds up a computation that should be avoided entirely past roughly 100k samples.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Gram rows, the maximum-gap partner search, and the error-cache correction are all element-independent maps over shared immutable data.',
            tradeoff: 'The cache update is memory-bound and short, so below a few thousand samples the fork-join overhead exceeds the work it distributes.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Multipliers and the error cache are allocated once at their exact final length and updated in place for the whole fit, so no reallocation happens inside the SMO loop.',
            tradeoff: 'Requires n up front, which rules out streaming the design matrix — acceptable here only because an O(n^2) Gram already requires the whole dataset resident.',
          },
        ],
        libraryName: 'ndarray + rayon',
        profile: 'O(n^2 d) once for the Gram across cores, then O(n) per multiplier-pair update. Illustrative, not a measured benchmark.',
      },
    },
  },
};
