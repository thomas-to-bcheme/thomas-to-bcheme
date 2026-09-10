import type { AiMlModel } from '../../types';

/**
 * Principal Component Analysis — the first entry in the structure group, and
 * the section's reference example of a reconstruction objective.
 *
 * Opens the group because it is the most general unsupervised move available:
 * find the linear subspace that loses the least when everything is projected
 * onto it. The code progression is built around one recurring decision — never
 * form the covariance matrix when you can factorize the data — which is the
 * same conditioning argument the linear-regression and GLM entries make, now
 * with a much larger consequence.
 */
export const PCA: AiMlModel = {
  slug: 'pca',
  name: 'Principal Component Analysis',
  aliases: ['PCA', 'Truncated SVD', 'Karhunen-Loeve transform', 'Latent Semantic Analysis (variant)'],
  category: 'classical-ml',
  group: 'structure',
  kind: 'model',

  paradigms: ['unsupervised'],
  // 'anomaly-detection' because reconstruction error against the fitted
  // subspace is a genuine and widely deployed detector — see
  // applications.featured['anomaly-detection'].
  taskTypes: ['dimensionality-reduction', 'anomaly-detection'],
  paradigmNote:
    'Unsupervised and, unusually for this section, entirely deterministic: given centred data there is one answer up to sign, with no seed, no initialization, and no local optimum. That is what makes it a preprocessing step other models can rely on rather than another model to validate.',

  intuition:
    'Data with many correlated columns does not really occupy all those dimensions — it sits near a lower-dimensional plane inside them. PCA finds that plane: the direction along which the points spread out most, then the direction of most remaining spread perpendicular to it, and so on. Keep the first few and you have a compressed description that loses very little. The catch is in what "loses very little" means, and it is worth being suspicious of: PCA measures loss as squared distance, so it keeps whatever varies most. Variance is not the same as information, and the direction that separates two classes can easily be one of the ones you just discarded.',

  objective: {
    kind: 'reconstruction',
    expression: {
      formula:
        '\\min_{W:\\, W^{\\top}W = I_k} \\; \\lVert X - XWW^{\\top} \\rVert_F^2 \\quad \\Longleftrightarrow \\quad \\max_{W} \\; \\operatorname{tr}\\!\\left(W^{\\top} \\Sigma W\\right)',
      symbols: [
        { symbol: 'W', meaning: 'the d-by-k matrix of component directions, constrained to be orthonormal' },
        { symbol: 'XWW^{\\top}', meaning: 'the data projected onto the subspace and mapped back — the reconstruction' },
        { symbol: '\\lVert \\cdot \\rVert_F^2', meaning: 'squared Frobenius norm: total squared reconstruction error over every entry' },
        { symbol: '\\Sigma', meaning: 'the covariance of the CENTRED data; skipping the centring silently changes the problem' },
      ],
    },
    reading:
      'Find the k-dimensional plane that the data sits closest to, measuring closeness as total squared distance. The second form says the same thing from the other side — minimizing what is lost is identical to maximizing the variance that is kept — and the equivalence is exact, not an approximation. Two consequences follow that are worth holding onto. Squared error means outliers dominate the fit, since a single distant point contributes more than a hundred typical ones. And the orthogonality constraint is an assumption rather than a finding: real latent factors are frequently correlated, and PCA will not return them, it will return an orthogonal rotation of them.',
  },

  optimization: {
    method: 'Closed form via the singular value decomposition of the centred data matrix',
    updateRule: {
      formula:
        'X = U S V^{\\top}, \\qquad W = V_{:,\\,1:k}, \\qquad Z = XW = U_{:,\\,1:k} S_{1:k}',
      symbols: [
        { symbol: 'V', meaning: 'right singular vectors — the component directions, in the original feature space' },
        { symbol: 'S', meaning: 'singular values; their squares over n-1 are the variances explained by each component' },
        { symbol: 'U S', meaning: 'the scores — the data expressed in the new coordinates, obtained without ever forming XW' },
        { symbol: 'k', meaning: 'how many components to keep, which the method itself cannot tell you' },
      ],
    },
    rationale:
      'The problem is a constrained quadratic maximization whose solution is exactly the top eigenvectors of the covariance, so it has a closed form and no iteration. The only real decision is how to compute it, and the answer is the same one the regression entries reach: factorize the data, never the covariance. Forming X-transpose-X and taking its eigendecomposition squares the condition number and throws away roughly half the available precision, which matters here because the components you care about least — the small ones — are precisely where the precision is lost, and those are the ones a reconstruction-error detector depends on. An SVD of the centred matrix gives the identical answer with the conditioning intact. Power iteration remains useful when only the top one or two components are wanted, and randomized methods when d is large.',
    hyperparameters: [
      { name: 'k (n_components)', role: 'How many components to keep. Not learnable — the reconstruction error falls monotonically with k — so it comes from an explained-variance target, a scree plot, or whatever the downstream model needs', typicalRange: 'enough for 90-99% explained variance, or chosen by downstream cross-validation' },
      { name: 'centring', role: 'Mandatory, and part of the model. Skipping it makes the first component point at the mean rather than at the direction of greatest spread' },
      { name: 'scaling', role: 'Standardize when features are in different units, or the component structure is decided by whichever column has the largest numbers. Covariance PCA on raw units versus correlation PCA on standardized ones are different analyses' },
      { name: 'whitening', role: 'Divide scores by their singular values so every component has unit variance. Useful before a distance-based model, and it amplifies the noisiest components, which is exactly the trade' },
      { name: 'solver', role: 'Full SVD, randomized SVD, or power iteration — a cost decision, though randomized methods are approximate on a slowly decaying spectrum' },
    ],
    convergence:
      'Deterministic and exact: there is no iteration, no seed, and no local optimum, which makes it one of the few things here that gives the same answer every time. The instabilities are elsewhere. Signs are arbitrary — a component and its negation are equally valid solutions — so scores flip between library versions and refits unless a convention is pinned, and anything downstream that keyed on the sign breaks silently. Components with near-equal singular values are not individually identified either; their span is stable but the rotation within it is not, so interpreting either one separately is unfounded. And the whole procedure is dominated by outliers, because squared error is: a single extreme point can define the first component on its own.',
    complexity:
      'Full SVD: O(n·d·min(n, d)) time, O(n·d) memory. Covariance eigendecomposition: O(n·d^2 + d^3), cheaper when n is enormous and d is modest, at a real cost in conditioning. Randomized SVD: O(n·d·k) for k components, which is what makes PCA feasible on wide data. Transform: O(d·k) per sample — a single small matrix product, so inference is essentially free.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Not a forecaster — a compression step in front of one. With hundreds or thousands of correlated series, PCA over the cross-section extracts a handful of common factors, and those factors are forecast instead of the individual series, then projected back. That is the dynamic factor model in its simplest form, and it is how forecasting problems with more series than observations are made tractable at all.',
        where: [
          'Yield-curve modelling, where three components — level, slope, curvature — reproduce almost all the movement across every maturity',
          'Many-series demand forecasting, where a few latent factors drive most of the co-movement',
          'Compressing a wide sensor array before a forecaster, so that the model sees ten factors rather than a thousand correlated channels',
          'Denoising: reconstruct from the top components and treat the discarded remainder as noise',
        ],
        why: 'It attacks the specific problem that makes wide forecasting hard — the series are highly correlated, so treating them independently wastes data and treating them jointly is infeasible. Reducing to a few factors first makes both affordable and often more accurate, because the factors are less noisy than any individual series. The limits are structural: PCA is linear and static, so it captures contemporaneous co-movement and nothing about lead-lag relationships, and the components can rotate between refits, which makes a factor a moving target rather than a stable quantity.',
        featurization: [
          'Difference or detrend before the decomposition, or the first component simply captures the shared trend and tells you nothing else',
          'Standardize across series when they differ in scale, or the largest-magnitude series dominates every component',
          'Fit the decomposition on the training window only; refitting it on the full series is a leak that is easy to miss because it feels like preprocessing',
          'Pin the component signs and ordering across refits, or a downstream forecaster sees factors that silently flip',
        ],
        evaluation:
          'Rolling-origin backtesting of the final forecast, not the explained variance of the decomposition. A factorization that explains 95% of variance and does not improve forecast error was a description of the data, not a useful compression.',
        pitfalls: [
          'Fitting the components on the whole series before splitting, which leaks future co-movement into the training window',
          'Assuming components are stable through time when they rotate as the correlation structure shifts',
          'Discarding low-variance components that carried the idiosyncratic movement a particular series actually needed',
        ],
      },
      'anomaly-detection': {
        fit: 'primary',
        how: 'Fit the subspace on normal data and score each new point by how far it falls from it — the squared reconstruction error, known in process control as the squared prediction error or Q statistic. The complementary score is Hotelling’s T-squared, which measures how extreme the point is *within* the subspace. The two answer different questions: T-squared says the point is an unusual amount of normal behaviour, Q says the point is not normal behaviour at all.',
        where: [
          'Multivariate statistical process control in manufacturing and chemical plants, where this pairing has been the standard for decades',
          'Sensor-array monitoring, where a fault breaks the correlation structure between channels before any single channel leaves its range',
          'Network and telemetry monitoring, where the residual after removing the dominant traffic pattern is where the incident shows',
          'Screening inputs to a deployed model for falling off the training manifold',
        ],
        why: 'It detects exactly the anomaly a per-channel threshold cannot: a point that is entirely in range on every individual feature but violates the relationships between them. That is the common shape of a real multivariate fault, and it is why this remains standard in process control. It is also cheap, deterministic, and explainable — the contribution of each feature to the residual points directly at the channel that broke. The limits follow from linearity: if normal behaviour is a curved manifold, a linear subspace fits it badly and the residual is large everywhere, and a kernel or autoencoder version is the honest answer.',
        featurization: [
          'Standardize on a confirmed-clean window and persist those statistics; the subspace is defined in scaled space',
          'Fit on clean data only — squared error means a handful of anomalies in the training set can define a component outright',
          'Keep enough components that the residual is genuinely noise, and few enough that the fault still lands outside the subspace; that balance is the detector',
          'Track both Q and T-squared, since a fault that stays inside the subspace only shows in the second',
        ],
        evaluation:
          'Precision@k against confirmed incidents with control limits set from the residual distribution on a clean period, and PR-AUC rather than ROC-AUC. Check the two statistics separately — a detector where only T-squared ever fires is measuring magnitude, not structure.',
        pitfalls: [
          'Contaminated training data giving an anomaly its own component, after which that anomaly reconstructs perfectly and scores as normal',
          'Choosing k by explained variance rather than by detection performance, which is a different objective and frequently picks a worse k',
          'Non-stationary normal behaviour drifting the subspace until the residual grows everywhere and the detector alarms constantly',
        ],
      },
      optimization: {
        fit: 'adapted',
        how: 'PCA is a constrained optimization problem with a closed-form solution — maximize a quadratic form over the orthonormal matrices — and the fact that the answer is an eigendecomposition is the canonical example of a whole class of problems whose optimum is spectral rather than iterative. In applied pipelines it more often plays the upstream role, reducing a high-dimensional decision space before an optimizer has to search it.',
        where: [
          'The reference example of a trace maximization under an orthogonality constraint, where the optimum is the top eigenvectors',
          'Reducing the dimension of a search space before Bayesian optimization, whose surrogate degrades badly above roughly twenty dimensions',
          'Decorrelating decision variables so that a downstream solver sees a better-conditioned problem',
        ],
        why: 'Worth studying here because it is the clearest case where recognizing the structure of a problem replaces solving it: nobody runs gradient ascent on the Rayleigh quotient, because the constraint set and the objective together hand you the answer. That recognition — this is an eigenproblem, so stop iterating — transfers to spectral clustering, to kernel methods, and to a good deal of numerical linear algebra. As a preprocessing step for search it is genuinely useful and genuinely risky, because a direction discarded for low variance may be the one the objective actually depends on.',
        featurization: [
          'Standardize before decomposing, since the components are otherwise decided by units rather than by structure',
          'Verify that the retained subspace still contains the variation the objective responds to — variance and relevance are different criteria',
        ],
        evaluation:
          'Compare the closed-form solution against an iterative eigensolver on the same matrix; agreement to numerical tolerance is the correctness check. For dimension reduction ahead of a search, evaluate the search outcome, not the explained variance.',
        pitfalls: [
          'Reducing a search space along variance and discarding the direction the objective is most sensitive to',
          'Forming the covariance matrix to get the eigenvectors, which squares the condition number and damages precisely the small components',
          'Interpreting individual components when their singular values are close, where only the span is identified and not the rotation within it',
        ],
      },
    },
    breadth: {
      'computer-vision': {
        fit: 'adapted',
        how: 'Historically, eigenfaces: treat each image as a vector, take the top components of a face dataset, and represent every face by a few dozen coefficients — recognition then becomes nearest neighbour in that space. Currently, the role is smaller and still real: whitening and decorrelating features, compressing learned embeddings before an index, and as the diagnostic that shows how much of a representation’s variance a handful of directions carries.',
        where: [
          'Whitening feature vectors before a distance-based retrieval index, where correlated dimensions distort the metric',
          'Compressing embeddings ahead of an approximate nearest-neighbour index, trading a little recall for a large memory saving',
          'Eigenfaces and related classical pipelines, which remain the standard teaching example even though learned features superseded them',
        ],
        why: 'On raw pixels it is genuinely obsolete, and the reason is instructive rather than merely historical: PCA is linear, so it cannot represent the fact that a shifted image is the same image, and it spends its components on lighting and pose. That failure is exactly the gap the convolutional prior fills. What survives is the operation rather than the model — as a cheap, deterministic decorrelation and compression step on top of learned features, it is still routinely the right tool.',
        featurization: [
          'Centre over the dataset, not per image, or you remove exactly the between-image variation being modelled',
          'L2-normalize embeddings before decomposing when the downstream metric is cosine',
          'Retain enough components that retrieval recall is preserved — measure it rather than choosing by explained variance',
        ],
        evaluation:
          'Downstream recall@k after compression against the uncompressed baseline, plus the memory saved. Explained variance is not the metric that matters here.',
        pitfalls: [
          'Compressing embeddings so far that the index becomes fast and wrong, with the loss invisible in explained variance',
          'Re-fitting the decomposition when the encoder is retrained without re-tuning the downstream thresholds',
          'Treating components of an image dataset as interpretable features when they mostly encode illumination',
        ],
      },
      'natural-language': {
        fit: 'viable',
        how: 'Latent Semantic Analysis: build a term-document matrix, take its truncated SVD, and represent both documents and terms in a few hundred latent dimensions. Words that co-occur end up close together, which is what lets the representation match a query to a document that never used the query’s words. It is done without centring — a sparse term-document matrix cannot be centred without destroying the sparsity — which technically makes it truncated SVD rather than PCA proper.',
        where: [
          'Semantic search and document similarity in classical information retrieval',
          'Topic-adjacent exploration, where components approximate themes without a probabilistic topic model',
          'Dimensionality reduction of tf-idf features before a classifier that cannot handle 50,000 sparse columns',
        ],
        why: 'It is the historical answer to vocabulary mismatch and still a sensible baseline when a corpus is small, labels are absent, and a transformer is not justified. Its ceiling is the bag-of-words representation underneath it: no order, no negation, no polysemy — a single component cannot hold two senses of a word, which is precisely what contextual embeddings solved. Reach for it when the corpus is modest and the deployment must stay simple.',
        featurization: [
          'tf-idf weighting before the decomposition, or common words dominate the leading components',
          'Skip centring and use truncated SVD on the sparse matrix directly; centring densifies it and makes the problem infeasible',
          'A few hundred components is the usual range — far fewer loses distinctions, far more reintroduces the noise that was being removed',
        ],
        evaluation:
          'Retrieval metrics on held-out query-document pairs, or downstream classifier accuracy against the uncompressed sparse baseline. Reconstruction error says nothing about whether the semantics survived.',
        pitfalls: [
          'Densifying the term-document matrix in order to centre it, which turns a tractable problem into an impossible one',
          'Reading components as topics; they are orthogonal directions of variance, and orthogonality is not a property topics have',
          'Refitting the decomposition on a corpus with a changed vocabulary, which reindexes every dimension',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A single factorization — seconds on a million rows and a few hundred columns, and randomized SVD extends that to very wide data by computing only the components asked for. There is nothing to tune and no restarts, so the cost is exactly one pass.',
    inferenceProfile:
      'A centring subtraction and one small matrix product: O(d·k) per sample, microseconds, and the model is a d-by-k matrix plus a mean vector. Small enough to embed anywhere, including inside a database function.',
    retrainingCadence:
      'Periodic, driven by drift in the correlation structure rather than by cost. The important operational fact is that a refit changes the coordinate system: component signs flip, near-degenerate components rotate, and anything downstream trained on the old scores is now reading different axes.',
    driftAndMonitoring: [
      'Track the explained-variance profile across refits — a flattening spectrum means the correlation structure that justified the compression is dissolving',
      'Monitor mean reconstruction error on new data; rising error means the subspace no longer describes the population, and it moves before downstream accuracy does',
      'Watch the angle between old and new component subspaces rather than comparing components one by one, which is meaningless under rotation',
      'Alert on scores far outside the training range, since the projection extrapolates silently and without complaint',
    ],
    productionGotchas: [
      'Component signs are arbitrary and flip between refits and library versions — pin a convention, such as forcing the largest-magnitude loading positive, or downstream features silently invert',
      'The mean vector and the scaler are part of the model; recomputing either at inference changes every score',
      'Never form the covariance matrix to get the components; the squared condition number damages exactly the small components a reconstruction detector depends on',
      'A refit rotates the coordinate system, so a downstream model trained on old scores must be retrained together with the decomposition, not separately',
      'Near-equal singular values mean the individual components are not identified; only the subspace they span is, so interpreting one of them is unfounded',
    ],
  },

  assumptions: [
    'The interesting structure is linear — PCA finds a flat subspace, and a curved manifold is fitted badly no matter how many components are kept',
    'Variance is a reasonable proxy for information, which fails whenever the discriminative direction is a low-variance one',
    'The data is centred, and scaled comparably if the features are in different units',
    'Components are orthogonal, which is a constraint imposed for convenience rather than a property real latent factors have',
    'Outliers are absent or handled, since squared error lets a single extreme point define a component',
  ],

  pros: [
    {
      point: 'Deterministic, closed-form, with no hyperparameter that changes the answer',
      context:
        'Given centred data there is exactly one solution up to sign — no seed, no restarts, no local optimum. That is why it is trusted as a preprocessing step where a stochastic method would need validating in its own right.',
    },
    {
      point: 'Removes correlation and compresses in one operation',
      context:
        'Decisive ahead of distance-based and covariance-based methods, which degrade quickly on correlated high-dimensional input. Worth little when the features were already independent, where it just rotates them.',
    },
    {
      point: 'The reconstruction error is a ready-made anomaly score',
      context:
        'One fitted object serves compression, denoising, and detection, with per-feature residual contributions that point at the responsible channel. This is why it has survived in process control for decades.',
    },
    {
      point: 'Cheap to compute and essentially free to apply',
      context:
        'A matrix product at inference and a small model artefact. Randomized SVD keeps the fit affordable even on very wide data, which is what makes it usable where a nonlinear method would not be.',
    },
  ],

  cons: [
    {
      point: 'Maximizes variance, which is not the same as retaining information',
      context:
        'The direction that separates two classes can be low-variance and discarded, and nothing in the method warns you. This is the failure that matters most in practice, and it is why supervised alternatives exist for supervised problems.',
    },
    {
      point: 'Linear, so a curved manifold is approximated badly',
      context:
        'Data lying on a curve needs far more components than its intrinsic dimension. Kernel PCA, UMAP, and autoencoders exist for exactly this — at the cost of the determinism that makes PCA trustworthy.',
    },
    {
      point: 'Components are rarely interpretable and often not identified',
      context:
        'Each is a dense combination of every original feature, signs are arbitrary, and near-equal singular values leave the rotation undetermined. Component interpretations get published anyway, and most of them are not defensible.',
    },
    {
      point: 'Squared error makes it sensitive to outliers',
      context:
        'One extreme point can determine the first component by itself. A serious problem in anomaly-adjacent work, where the outliers are the subject — robust PCA exists precisely because accepting this is not viable there.',
    },
  ],

  relatedSlugs: ['k-means', 'gaussian-mixture', 'matrix-factorization'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""PCA by power iteration and deflation - the objective, transcribed.

Maximizing tr(W^T Sigma W) subject to orthonormality means taking the top
eigenvectors of the covariance. Power iteration finds the top one by repeated
multiplication; deflation removes it and repeats, which is the definition of
"the next direction of most remaining variance" written as an algorithm.
"""

import math


def centre(X):
    """Centring is part of the model, not preprocessing.

    Without it the first component points at the mean rather than at the
    direction of greatest spread, which is a different problem entirely.
    """
    n = len(X)
    d = len(X[0])
    means = [0.0] * d
    for j in range(d):
        total = 0.0
        for i in range(n):
            total += X[i][j]
        means[j] = total / n

    centred = [[X[i][j] - means[j] for j in range(d)] for i in range(n)]
    return centred, means


def covariance(X):
    """Sigma = X^T X / (n - 1) for centred X."""
    n = len(X)
    d = len(X[0])
    sigma = [[0.0] * d for _ in range(d)]

    for j in range(d):
        for k in range(d):
            total = 0.0
            for i in range(n):
                total += X[i][j] * X[i][k]
            sigma[j][k] = total / (n - 1)
    return sigma


def power_iteration(matrix, iterations=500, tol=1e-10):
    """Top eigenvector: repeated multiplication converges to it.

    Each multiplication scales every eigen-direction by its eigenvalue, so the
    largest one dominates more with every step. The convergence rate is the
    ratio of the top two eigenvalues - close eigenvalues converge slowly, which
    is the same degeneracy that makes those components unidentified.
    """
    d = len(matrix)
    vector = [1.0 / math.sqrt(d)] * d

    for _ in range(iterations):
        product = [0.0] * d
        for j in range(d):
            total = 0.0
            for k in range(d):
                total += matrix[j][k] * vector[k]
            product[j] = total

        norm = math.sqrt(sum(value * value for value in product))
        if norm == 0.0:
            break
        product = [value / norm for value in product]

        shift = sum(abs(product[j] - vector[j]) for j in range(d))
        vector = product
        if shift < tol:
            break

    # Rayleigh quotient gives the eigenvalue for the converged vector.
    eigenvalue = 0.0
    for j in range(d):
        for k in range(d):
            eigenvalue += vector[j] * matrix[j][k] * vector[k]
    return vector, eigenvalue


def fit(X, k):
    centred, means = centre(X)
    sigma = covariance(centred)
    d = len(sigma)

    components = []
    variances = []

    for _ in range(k):
        vector, eigenvalue = power_iteration(sigma)
        components.append(vector)
        variances.append(eigenvalue)

        # Deflation: subtract this component's contribution so the next
        # iteration finds the largest direction of what remains.
        for j in range(d):
            for m in range(d):
                sigma[j][m] -= eigenvalue * vector[j] * vector[m]

    return components, variances, means


def transform(components, means, x):
    """Project one point onto the retained subspace."""
    scores = []
    for component in components:
        total = 0.0
        for j in range(len(x)):
            total += (x[j] - means[j]) * component[j]
        scores.append(total)
    return scores`,
        profile: 'O(n*d^2) to build the covariance plus O(k*d^2) per power iteration, in interpreter loops over lists of lists.',
      },
      'make-it-right': {
        code: `"""PCA by SVD - typed, sign-stabilized, factorizing the data not the covariance."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass(frozen=True)
class PrincipalComponents:
    """A fitted decomposition. The mean is part of the model, not preprocessing."""

    components: Matrix          # (k, d), rows are the directions
    explained_variance: Vector  # (k,)
    mean: Vector                # (d,)

    @property
    def explained_variance_ratio(self) -> Vector:
        return self.explained_variance / self.explained_variance.sum()

    def transform(self, X: Matrix) -> Matrix:
        if X.ndim != 2 or X.shape[1] != self.mean.size:
            raise ValueError(f"expected (n, {self.mean.size}) input, got {X.shape}")
        return (X - self.mean) @ self.components.T

    def inverse_transform(self, Z: Matrix) -> Matrix:
        return Z @ self.components + self.mean

    def reconstruction_error(self, X: Matrix) -> Vector:
        """Squared distance from the subspace - the Q statistic, and the
        anomaly score. Computed as a residual rather than by reconstructing
        and subtracting, which would materialize a second copy of X."""
        residual = (X - self.mean) - self.transform(X) @ self.components
        return np.einsum("ij,ij->i", residual, residual)


def fit(X: Matrix, n_components: int, standardize: bool = False) -> PrincipalComponents:
    """Fit by SVD of the centred data. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if not 1 <= n_components <= min(X.shape):
        raise ValueError(f"n_components must lie in [1, {min(X.shape)}], got {n_components}")

    mean = X.mean(axis=0)
    centred = X - mean

    if standardize:
        scale = centred.std(axis=0)
        scale[scale == 0.0] = 1.0
        centred = centred / scale

    # SVD of the DATA, never an eigendecomposition of X^T X. The two give the
    # same answer in exact arithmetic; forming the covariance squares the
    # condition number and loses roughly half the available precision - and it
    # loses it precisely in the small components, which is where a
    # reconstruction-based detector does its work.
    _, singular_values, right = np.linalg.svd(centred, full_matrices=False)

    components = right[:n_components]
    explained = (singular_values[:n_components] ** 2) / (X.shape[0] - 1)

    # Signs are arbitrary - a component and its negation are equally valid.
    # Pinning a convention here is what stops downstream features silently
    # inverting between refits and library versions.
    for index, component in enumerate(components):
        if component[np.abs(component).argmax()] < 0.0:
            components[index] = -component

    return PrincipalComponents(
        components=components,
        explained_variance=explained,
        mean=mean,
    )`,
        rationale:
          'The algorithm changes for a reason that is stated in the code: power iteration on an explicitly-formed covariance matrix is replaced by an SVD of the centred data. The two agree in exact arithmetic, but building X-transpose-X squares the condition number and destroys roughly half the precision — and it destroys it in the small components, which is exactly where a reconstruction-error detector operates. Deflation disappears with it, since the SVD returns every component at once. The other addition is a sign convention: components are only defined up to sign, and pinning one here is what stops downstream features silently inverting between refits.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*d*min(n,d)) for the full SVD, executed in LAPACK. Exact, and it computes every component whether or not you want them.',
      },
      'make-it-fast': {
        code: `"""PCA by randomized SVD - k components without factorizing the whole matrix."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def randomized_pca(
    X: Matrix,
    n_components: int,
    oversampling: int = 10,
    power_iterations: int = 2,
    seed: int = 0,
) -> tuple[Matrix, Vector, Vector]:
    """Top-k components in O(n*d*k) instead of O(n*d*min(n,d)).

    A full SVD computes every component and then throws most of them away. The
    randomized method instead finds a small orthonormal basis that captures the
    dominant action of the matrix, projects onto it, and factorizes the tiny
    result - so the cost scales with the components actually wanted rather than
    with the smaller matrix dimension.

    It is APPROXIMATE. The approximation is excellent when the spectrum decays
    quickly and poor when it is flat, which is exactly when the trailing
    components are not identified anyway. Power iterations sharpen the decay at
    the cost of one pass over the data each.
    """
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")

    rng = np.random.default_rng(seed)
    n, d = X.shape
    sketch_width = min(n_components + oversampling, d)

    # One contiguous float64 block: every pass below is a GEMM over it, and a
    # non-contiguous or float32 input would force LAPACK to copy on each one.
    design = np.ascontiguousarray(X, dtype=np.float64)
    mean = design.mean(axis=0)
    np.subtract(design, mean, out=design)      # centre in place; no second copy

    # Range finder: Y = X Omega, a random projection whose columns span
    # approximately the same space as the top singular vectors.
    omega = rng.standard_normal((d, sketch_width))
    sketch = design @ omega

    # Power iterations pull the sketch toward the dominant subspace. Each one
    # is two GEMMs, with a re-orthonormalization between them so the small
    # singular directions are not lost to round-off.
    for _ in range(power_iterations):
        sketch, _ = np.linalg.qr(sketch, mode="reduced")
        sketch = design.T @ sketch
        sketch, _ = np.linalg.qr(sketch, mode="reduced")
        sketch = design @ sketch

    basis, _ = np.linalg.qr(sketch, mode="reduced")     # (n, sketch_width)

    # Project into the small basis and factorize there: the SVD is now
    # (sketch_width, d) instead of (n, d), which is the whole saving.
    projected = basis.T @ design
    _, singular_values, right = np.linalg.svd(projected, full_matrices=False)

    components = right[:n_components].copy()
    explained = (singular_values[:n_components] ** 2) / (n - 1)

    for index, component in enumerate(components):
        if component[np.abs(component).argmax()] < 0.0:
            np.negative(component, out=components[index])

    return components, explained, mean`,
        rationale:
          'A full SVD computes every component and discards most of them, which is pure waste when k is small and d is large. The randomized method replaces that with a sketch: project the data through a random matrix to find a small basis that captures its dominant action, then factorize inside that basis, so the expensive decomposition is on a k-by-d matrix rather than an n-by-d one. Everything is expressed as GEMMs over one contiguous block, and the centring is done in place because on wide data a second copy of the design matrix is the binding memory constraint. The approximation is stated where it will be read: it is excellent on a decaying spectrum and poor on a flat one.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The range finder, the power iterations, and the projection are all GEMMs over the full matrix, and the only expensive factorization is on a small projected block.',
            tradeoff: 'The result is approximate — on a slowly decaying spectrum the trailing components are noticeably wrong, and no amount of oversampling fixes a genuinely flat spectrum.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Centring is done in place and the sign flip writes back through the component array, so a wide design matrix is never duplicated at the moment memory is tightest.',
            tradeoff: 'The caller’s array is copied once at entry and then mutated, so the function owns that copy and the operation order can no longer be rearranged safely.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'One C-contiguous float64 block means every GEMM and QR reads it directly rather than through an internal LAPACK copy, which would otherwise be paid on each of several passes.',
            tradeoff: 'Forces a full copy when the caller passes Fortran-ordered or float32 data, doubling peak memory for the duration — significant precisely on the wide matrices this routine exists for.',
          },
        ],
        libraryName: 'NumPy / LAPACK',
        profile: 'O(n*d*k) for k components, versus O(n*d*min(n,d)) for the exact SVD. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// PCA by power iteration and deflation - the objective, transcribed.
#include <cmath>
#include <cstddef>
#include <vector>

// Centring is part of the model. Without it the first component points at the
// mean rather than at the direction of greatest spread.
std::vector<double> Centre(std::vector<std::vector<double>>& X) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<double> means(d, 0.0);

  for (std::size_t j = 0; j < d; ++j) {
    double total = 0.0;
    for (std::size_t i = 0; i < n; ++i) total += X[i][j];
    means[j] = total / static_cast<double>(n);
  }
  for (std::size_t i = 0; i < n; ++i) {
    for (std::size_t j = 0; j < d; ++j) X[i][j] -= means[j];
  }
  return means;
}

// Sigma = X^T X / (n - 1) for centred X.
std::vector<std::vector<double>> Covariance(const std::vector<std::vector<double>>& X) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();
  std::vector<std::vector<double>> sigma(d, std::vector<double>(d, 0.0));

  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t k = 0; k < d; ++k) {
      double total = 0.0;
      for (std::size_t i = 0; i < n; ++i) total += X[i][j] * X[i][k];
      sigma[j][k] = total / static_cast<double>(n - 1);
    }
  }
  return sigma;
}

// Top eigenvector by repeated multiplication: each step scales every
// eigen-direction by its eigenvalue, so the largest dominates more each time.
// The convergence rate is the ratio of the top two eigenvalues, which is why
// near-equal components converge slowly and are also unidentified.
double PowerIteration(const std::vector<std::vector<double>>& matrix,
                      std::vector<double>& vector, int iterations, double tol) {
  const std::size_t d = matrix.size();
  vector.assign(d, 1.0 / std::sqrt(static_cast<double>(d)));

  for (int step = 0; step < iterations; ++step) {
    std::vector<double> product(d, 0.0);
    for (std::size_t j = 0; j < d; ++j) {
      double total = 0.0;
      for (std::size_t k = 0; k < d; ++k) total += matrix[j][k] * vector[k];
      product[j] = total;
    }

    double norm = 0.0;
    for (const double value : product) norm += value * value;
    norm = std::sqrt(norm);
    if (norm == 0.0) break;

    double shift = 0.0;
    for (std::size_t j = 0; j < d; ++j) {
      product[j] /= norm;
      shift += std::abs(product[j] - vector[j]);
    }
    vector = product;
    if (shift < tol) break;
  }

  // Rayleigh quotient gives the eigenvalue for the converged vector.
  double eigenvalue = 0.0;
  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t k = 0; k < d; ++k) eigenvalue += vector[j] * matrix[j][k] * vector[k];
  }
  return eigenvalue;
}

void Fit(std::vector<std::vector<double>> X, std::size_t k,
         std::vector<std::vector<double>>& components,
         std::vector<double>& variances,
         std::vector<double>& means) {
  means = Centre(X);
  auto sigma = Covariance(X);
  const std::size_t d = sigma.size();

  for (std::size_t component = 0; component < k; ++component) {
    std::vector<double> vector;
    const double eigenvalue = PowerIteration(sigma, vector, 500, 1e-10);
    components.push_back(vector);
    variances.push_back(eigenvalue);

    // Deflation: remove this component so the next iteration finds the
    // largest direction of what remains.
    for (std::size_t j = 0; j < d; ++j) {
      for (std::size_t m = 0; m < d; ++m) {
        sigma[j][m] -= eigenvalue * vector[j] * vector[m];
      }
    }
  }
}`,
        profile: 'O(n*d^2) for the covariance plus O(k*d^2) per iteration, over nested vectors that scatter every row across the heap.',
      },
      'make-it-right': {
        code: `// PCA - flat row-major, one-pass covariance, Jacobi eigensolver, RAII.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <numeric>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

// Cyclic Jacobi eigenvalue algorithm for a symmetric matrix.
//
// Preferred to power iteration plus deflation: deflation accumulates the error
// of every component into the ones that follow, so the fifth component is
// noticeably worse than the first. Jacobi returns all of them at once and is
// backward stable, including for the small eigenvalues that a reconstruction
// detector actually depends on.
void JacobiEigen(std::vector<double>& a, std::vector<double>& vectors, std::size_t d,
                 int sweeps = 60, double tol = 1e-12) {
  vectors.assign(d * d, 0.0);
  for (std::size_t j = 0; j < d; ++j) vectors[j * d + j] = 1.0;

  for (int sweep = 0; sweep < sweeps; ++sweep) {
    double off_diagonal = 0.0;
    for (std::size_t p = 0; p < d; ++p) {
      for (std::size_t q = p + 1; q < d; ++q) off_diagonal += a[p * d + q] * a[p * d + q];
    }
    if (std::sqrt(off_diagonal) < tol) return;

    for (std::size_t p = 0; p < d; ++p) {
      for (std::size_t q = p + 1; q < d; ++q) {
        if (std::abs(a[p * d + q]) < tol) continue;

        const double theta = (a[q * d + q] - a[p * d + p]) / (2.0 * a[p * d + q]);
        const double sign = theta >= 0.0 ? 1.0 : -1.0;
        const double t = sign / (std::abs(theta) + std::sqrt(theta * theta + 1.0));
        const double c = 1.0 / std::sqrt(t * t + 1.0);
        const double s = t * c;

        for (std::size_t m = 0; m < d; ++m) {
          const double a_pm = a[p * d + m];
          const double a_qm = a[q * d + m];
          a[p * d + m] = c * a_pm - s * a_qm;
          a[q * d + m] = s * a_pm + c * a_qm;
        }
        for (std::size_t m = 0; m < d; ++m) {
          const double a_mp = a[m * d + p];
          const double a_mq = a[m * d + q];
          a[m * d + p] = c * a_mp - s * a_mq;
          a[m * d + q] = s * a_mp + c * a_mq;

          const double v_mp = vectors[m * d + p];
          const double v_mq = vectors[m * d + q];
          vectors[m * d + p] = c * v_mp - s * v_mq;
          vectors[m * d + q] = s * v_mp + c * v_mq;
        }
      }
    }
  }
}

}  // namespace

class PrincipalComponents {
 public:
  PrincipalComponents(std::vector<double> components, std::vector<double> variances,
                      std::vector<double> mean, std::size_t dimension)
      : components_(std::move(components)),
        variances_(std::move(variances)),
        mean_(std::move(mean)),
        dimension_(dimension) {
    if (dimension_ == 0 || mean_.size() != dimension_) {
      throw std::invalid_argument("mean does not match the dimension");
    }
    if (components_.size() != variances_.size() * dimension_) {
      throw std::invalid_argument("components do not match the component count");
    }
  }

  // Squared distance from the subspace: the Q statistic, and the anomaly score.
  [[nodiscard]] double ReconstructionError(std::span<const double> x) const {
    if (x.size() != dimension_) {
      throw std::invalid_argument("point width does not match the model");
    }

    std::vector<double> centred(dimension_);
    for (std::size_t j = 0; j < dimension_; ++j) centred[j] = x[j] - mean_[j];

    std::vector<double> residual(centred);
    for (std::size_t c = 0; c < variances_.size(); ++c) {
      const double* component = components_.data() + c * dimension_;
      double score = 0.0;
      for (std::size_t j = 0; j < dimension_; ++j) score += centred[j] * component[j];
      for (std::size_t j = 0; j < dimension_; ++j) residual[j] -= score * component[j];
    }

    double total = 0.0;
    for (const double value : residual) total += value * value;
    return total;
  }

 private:
  std::vector<double> components_;   // row-major (k, d), owned
  std::vector<double> variances_;
  std::vector<double> mean_;
  std::size_t dimension_;
};

// x_flat is row-major: point i occupies x_flat[i * d, (i + 1) * d).
PrincipalComponents Fit(std::span<const double> x_flat, std::size_t d, std::size_t k) {
  if (d == 0 || x_flat.empty()) throw std::invalid_argument("empty problem");
  if (x_flat.size() % d != 0) throw std::invalid_argument("X is not a multiple of d");

  const std::size_t n = x_flat.size() / d;
  if (k == 0 || k > d) throw std::invalid_argument("k must lie in [1, d]");
  if (n < 2) throw std::invalid_argument("need at least two points to estimate variance");

  std::vector<double> mean(d, 0.0);
  for (std::size_t i = 0; i < n; ++i) {
    const double* row = x_flat.data() + i * d;
    for (std::size_t j = 0; j < d; ++j) mean[j] += row[j];
  }
  for (double& value : mean) value /= static_cast<double>(n);

  // One pass, lower triangle only, exploiting symmetry: half the arithmetic
  // of the naive double loop and one contiguous walk per row.
  std::vector<double> sigma(d * d, 0.0);
  std::vector<double> centred(d);
  for (std::size_t i = 0; i < n; ++i) {
    const double* row = x_flat.data() + i * d;
    for (std::size_t j = 0; j < d; ++j) centred[j] = row[j] - mean[j];
    for (std::size_t j = 0; j < d; ++j) {
      for (std::size_t m = 0; m <= j; ++m) sigma[j * d + m] += centred[j] * centred[m];
    }
  }
  for (std::size_t j = 0; j < d; ++j) {
    for (std::size_t m = 0; m <= j; ++m) {
      sigma[j * d + m] /= static_cast<double>(n - 1);
      sigma[m * d + j] = sigma[j * d + m];
    }
  }

  std::vector<double> vectors;
  JacobiEigen(sigma, vectors, d);

  std::vector<std::size_t> order(d);
  std::iota(order.begin(), order.end(), 0);
  std::sort(order.begin(), order.end(),
            [&](std::size_t a, std::size_t b) { return sigma[a * d + a] > sigma[b * d + b]; });

  std::vector<double> components(k * d);
  std::vector<double> variances(k);
  for (std::size_t c = 0; c < k; ++c) {
    const std::size_t source = order[c];
    variances[c] = sigma[source * d + source];
    for (std::size_t j = 0; j < d; ++j) components[c * d + j] = vectors[j * d + source];

    // Signs are arbitrary - pin a convention or downstream features invert.
    const auto largest = std::max_element(
        components.begin() + static_cast<long>(c * d),
        components.begin() + static_cast<long>((c + 1) * d),
        [](double a, double b) { return std::abs(a) < std::abs(b); });
    if (*largest < 0.0) {
      for (std::size_t j = 0; j < d; ++j) components[c * d + j] = -components[c * d + j];
    }
  }

  return PrincipalComponents(std::move(components), std::move(variances), std::move(mean), d);
}`,
        rationale:
          'Power iteration with deflation is replaced by a Jacobi eigensolver, which is a genuine accuracy change rather than a stylistic one: deflation folds the error of every extracted component into the ones after it, so the fifth is materially worse than the first — and the small components are exactly what a reconstruction detector reads. Jacobi returns all of them at once and is backward stable. The covariance is accumulated in a single pass over the lower triangle only, halving the arithmetic and making each row a contiguous walk. Nested vectors become flat row-major buffers, inputs are validated before allocation, and the sign convention is pinned so downstream features do not invert between refits.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(n*d^2/2) for the covariance plus O(d^3) for the Jacobi sweeps, over contiguous buffers.',
      },
      'make-it-fast': {
        code: `// PCA - Eigen BDCSVD on the centred data, never on the covariance.
#include <Eigen/Dense>
#include <Eigen/SVD>
#include <stdexcept>

using RowMajorMatrix =
    Eigen::Matrix<double, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

struct Decomposition {
  RowMajorMatrix components;        // (k, d)
  Eigen::VectorXd explained;        // (k,)
  Eigen::RowVectorXd mean;          // (d,)
};

// Factorize the DATA, not the covariance.
//
// Forming X^T X squares the condition number and loses roughly half the
// available precision - and it loses it in the small singular values, which is
// precisely where a reconstruction-based detector operates. The divide-and-
// conquer SVD costs more flops than a covariance eigendecomposition and is the
// right choice every time the trailing components matter.
Decomposition Fit(const RowMajorMatrix& X, Eigen::Index k) {
  if (X.rows() < 2) throw std::invalid_argument("need at least two points");
  if (k < 1 || k > X.cols()) throw std::invalid_argument("k outside [1, d]");

  Decomposition out;
  out.mean = X.colwise().mean();

  // rowwise() - mean is a fused expression: the centred copy is materialized
  // once, directly into the matrix the SVD consumes.
  const RowMajorMatrix centred = X.rowwise() - out.mean;

  Eigen::BDCSVD<RowMajorMatrix> svd(centred, Eigen::ComputeThinV);
  const auto& singular = svd.singularValues();

  out.components = svd.matrixV().leftCols(k).transpose();
  out.explained =
      singular.head(k).array().square() / static_cast<double>(X.rows() - 1);

  // Signs are arbitrary; pin a convention so downstream features are stable.
  for (Eigen::Index c = 0; c < k; ++c) {
    Eigen::Index largest = 0;
    out.components.row(c).cwiseAbs().maxCoeff(&largest);
    if (out.components(c, largest) < 0.0) out.components.row(c) = -out.components.row(c);
  }

  return out;
}

// Squared distance from the subspace for a whole batch - the Q statistic.
//
// Computed as a residual in one fused pass rather than by reconstructing and
// subtracting, which would materialize a second full copy of the batch.
Eigen::VectorXd ReconstructionError(const Decomposition& model, const RowMajorMatrix& X) {
  const RowMajorMatrix centred = X.rowwise() - model.mean;
  const RowMajorMatrix scores = centred * model.components.transpose();
  return (centred - scores * model.components).rowwise().squaredNorm();
}`,
        rationale:
          'The Jacobi eigensolver on an explicitly-formed covariance becomes a divide-and-conquer SVD of the centred data itself. That is the same conditioning argument the entry makes throughout, now backed by a tuned kernel: forming X-transpose-X squares the condition number and damages the small singular values, which are the ones a reconstruction detector reads. The centring, the projection, and the residual are all Eigen expressions that fuse into single passes, so the batch reconstruction error is computed without ever materializing a second copy of the data — which on a wide matrix is the binding memory constraint rather than the arithmetic.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'BDCSVD is a blocked divide-and-conquer factorization dispatched to cache-aware kernels, replacing an O(d^3) Jacobi sweep written as a scalar triple loop.',
            tradeoff: 'Costs more flops than a covariance eigendecomposition and needs the centred matrix fully resident — the price paid deliberately for conditioning that the covariance route destroys.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'The rowwise centring, the projection, and the residual fuse into single passes, so the batch error is computed without a second full copy of the data.',
            tradeoff: 'One line now hides an O(n·d·k) product, so the cost is not visible where it is paid — and an expression bound to auto rather than assigned can dangle once its operands go out of scope.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen leaves vectorization of its kernels to the compiler, so an unoptimized build is no faster than the hand-written Jacobi it replaced.',
            tradeoff: '-march=native emits instructions that may not exist on an older machine in the fleet, converting a performance choice into a portability failure.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*d*min(n,d)) for the SVD, O(n*d*k) for a batch of reconstruction errors. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! PCA by power iteration and deflation - the objective, transcribed.

/// Centring is part of the model. Without it the first component points at
/// the mean rather than at the direction of greatest spread.
fn centre(x: &mut [Vec<f64>]) -> Vec<f64> {
    let n = x.len();
    let d = x[0].len();
    let mut means = vec![0.0; d];

    for j in 0..d {
        let mut total = 0.0;
        for i in 0..n {
            total += x[i][j];
        }
        means[j] = total / n as f64;
    }
    for row in x.iter_mut() {
        for j in 0..d {
            row[j] -= means[j];
        }
    }
    means
}

/// Sigma = X^T X / (n - 1) for centred X.
fn covariance(x: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = x.len();
    let d = x[0].len();
    let mut sigma = vec![vec![0.0; d]; d];

    for j in 0..d {
        for k in 0..d {
            let mut total = 0.0;
            for i in 0..n {
                total += x[i][j] * x[i][k];
            }
            sigma[j][k] = total / (n - 1) as f64;
        }
    }
    sigma
}

/// Top eigenvector by repeated multiplication: each step scales every
/// eigen-direction by its eigenvalue, so the largest dominates more each time.
/// The convergence rate is the ratio of the top two eigenvalues, which is why
/// near-equal components converge slowly and are also unidentified.
fn power_iteration(matrix: &[Vec<f64>], iterations: usize, tol: f64) -> (Vec<f64>, f64) {
    let d = matrix.len();
    let mut vector = vec![1.0 / (d as f64).sqrt(); d];

    for _ in 0..iterations {
        let mut product = vec![0.0; d];
        for j in 0..d {
            let mut total = 0.0;
            for k in 0..d {
                total += matrix[j][k] * vector[k];
            }
            product[j] = total;
        }

        let norm: f64 = product.iter().map(|v| v * v).sum::<f64>().sqrt();
        if norm == 0.0 {
            break;
        }

        let mut shift = 0.0;
        for j in 0..d {
            product[j] /= norm;
            shift += (product[j] - vector[j]).abs();
        }
        vector = product;
        if shift < tol {
            break;
        }
    }

    // Rayleigh quotient gives the eigenvalue for the converged vector.
    let mut eigenvalue = 0.0;
    for j in 0..d {
        for k in 0..d {
            eigenvalue += vector[j] * matrix[j][k] * vector[k];
        }
    }
    (vector, eigenvalue)
}

pub fn fit(mut x: Vec<Vec<f64>>, k: usize) -> (Vec<Vec<f64>>, Vec<f64>, Vec<f64>) {
    let means = centre(&mut x);
    let mut sigma = covariance(&x);
    let d = sigma.len();

    let mut components = Vec::new();
    let mut variances = Vec::new();

    for _ in 0..k {
        let (vector, eigenvalue) = power_iteration(&sigma, 500, 1e-10);

        // Deflation: remove this component so the next iteration finds the
        // largest direction of what remains.
        for j in 0..d {
            for m in 0..d {
                sigma[j][m] -= eigenvalue * vector[j] * vector[m];
            }
        }

        components.push(vector);
        variances.push(eigenvalue);
    }

    (components, variances, means)
}`,
        profile: 'O(n*d^2) for the covariance plus O(k*d^2) per iteration, every index bounds-checked and every row scattered across the heap.',
      },
      'make-it-right': {
        code: `//! PCA - typed errors, flat buffers, Jacobi eigensolver, pinned signs.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum PcaError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Components { k: usize, dimension: usize },
    TooFewPoints,
}

impl fmt::Display for PcaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::Components { k, dimension } => {
                write!(f, "k={k} outside [1, {dimension}]")
            }
            Self::TooFewPoints => write!(f, "need at least two points to estimate variance"),
        }
    }
}

impl std::error::Error for PcaError {}

/// Number of retained components. A newtype because k and the dimension are
/// both bare usize at every call site and swapping them is silent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NComponents(usize);

impl NComponents {
    pub fn new(value: usize, dimension: usize) -> Result<Self, PcaError> {
        if value == 0 || value > dimension {
            return Err(PcaError::Components { k: value, dimension });
        }
        Ok(Self(value))
    }
}

/// Cyclic Jacobi eigenvalue algorithm for a symmetric matrix.
///
/// Preferred to power iteration plus deflation, which folds the error of each
/// extracted component into the ones after it - so the fifth component is
/// noticeably worse than the first, and the small components are exactly what
/// a reconstruction-based detector reads.
fn jacobi_eigen(a: &mut [f64], d: usize, sweeps: usize, tol: f64) -> Vec<f64> {
    let mut vectors = vec![0.0_f64; d * d];
    for j in 0..d {
        vectors[j * d + j] = 1.0;
    }

    for _ in 0..sweeps {
        let off_diagonal: f64 = (0..d)
            .flat_map(|p| ((p + 1)..d).map(move |q| (p, q)))
            .map(|(p, q)| a[p * d + q] * a[p * d + q])
            .sum();
        if off_diagonal.sqrt() < tol {
            break;
        }

        for p in 0..d {
            for q in (p + 1)..d {
                if a[p * d + q].abs() < tol {
                    continue;
                }

                let theta = (a[q * d + q] - a[p * d + p]) / (2.0 * a[p * d + q]);
                let sign = if theta >= 0.0 { 1.0 } else { -1.0 };
                let t = sign / (theta.abs() + (theta * theta + 1.0).sqrt());
                let c = 1.0 / (t * t + 1.0).sqrt();
                let s = t * c;

                for m in 0..d {
                    let a_pm = a[p * d + m];
                    let a_qm = a[q * d + m];
                    a[p * d + m] = c * a_pm - s * a_qm;
                    a[q * d + m] = s * a_pm + c * a_qm;
                }
                for m in 0..d {
                    let a_mp = a[m * d + p];
                    let a_mq = a[m * d + q];
                    a[m * d + p] = c * a_mp - s * a_mq;
                    a[m * d + q] = s * a_mp + c * a_mq;

                    let v_mp = vectors[m * d + p];
                    let v_mq = vectors[m * d + q];
                    vectors[m * d + p] = c * v_mp - s * v_mq;
                    vectors[m * d + q] = s * v_mp + c * v_mq;
                }
            }
        }
    }

    vectors
}

pub struct PrincipalComponents {
    /// Row-major (k, d): component c occupies components[c * d..(c + 1) * d].
    pub components: Vec<f64>,
    pub explained_variance: Vec<f64>,
    pub mean: Vec<f64>,
    dimension: usize,
}

impl PrincipalComponents {
    /// x_flat is row-major: point i occupies x_flat[i * d..(i + 1) * d].
    pub fn fit(x_flat: &[f64], dimension: usize, k: NComponents) -> Result<Self, PcaError> {
        if dimension == 0 || x_flat.is_empty() {
            return Err(PcaError::Empty);
        }
        if x_flat.len() % dimension != 0 {
            return Err(PcaError::ShapeMismatch {
                expected: (x_flat.len() / dimension + 1) * dimension,
                found: x_flat.len(),
            });
        }

        let n = x_flat.len() / dimension;
        if n < 2 {
            return Err(PcaError::TooFewPoints);
        }

        let mut mean = vec![0.0_f64; dimension];
        for point in x_flat.chunks_exact(dimension) {
            for (slot, value) in mean.iter_mut().zip(point) {
                *slot += value;
            }
        }
        for slot in &mut mean {
            *slot /= n as f64;
        }

        // One pass, lower triangle only: symmetry halves the arithmetic and
        // each row is one contiguous walk.
        let mut sigma = vec![0.0_f64; dimension * dimension];
        let mut centred = vec![0.0_f64; dimension];
        for point in x_flat.chunks_exact(dimension) {
            for (slot, (value, m)) in centred.iter_mut().zip(point.iter().zip(&mean)) {
                *slot = value - m;
            }
            for j in 0..dimension {
                for m in 0..=j {
                    sigma[j * dimension + m] += centred[j] * centred[m];
                }
            }
        }
        for j in 0..dimension {
            for m in 0..=j {
                sigma[j * dimension + m] /= (n - 1) as f64;
                sigma[m * dimension + j] = sigma[j * dimension + m];
            }
        }

        let vectors = jacobi_eigen(&mut sigma, dimension, 60, 1e-12);

        let mut order: Vec<usize> = (0..dimension).collect();
        order.sort_unstable_by(|&a, &b| {
            sigma[b * dimension + b].total_cmp(&sigma[a * dimension + a])
        });

        let mut components = Vec::with_capacity(k.0 * dimension);
        let mut explained_variance = Vec::with_capacity(k.0);

        for &source in order.iter().take(k.0) {
            explained_variance.push(sigma[source * dimension + source]);
            let start = components.len();
            components.extend((0..dimension).map(|j| vectors[j * dimension + source]));

            // Signs are arbitrary; pin a convention or downstream inverts.
            let slice = &mut components[start..start + dimension];
            let largest = slice
                .iter()
                .copied()
                .fold(0.0_f64, |acc, v| if v.abs() > acc.abs() { v } else { acc });
            if largest < 0.0 {
                slice.iter_mut().for_each(|value| *value = -*value);
            }
        }

        Ok(Self { components, explained_variance, mean, dimension })
    }

    /// Squared distance from the subspace - the Q statistic, and the score.
    #[must_use]
    pub fn reconstruction_error(&self, x: &[f64]) -> f64 {
        debug_assert_eq!(x.len(), self.dimension);

        let mut residual: Vec<f64> =
            x.iter().zip(&self.mean).map(|(value, m)| value - m).collect();

        for component in self.components.chunks_exact(self.dimension) {
            let score: f64 = residual
                .iter()
                .zip(component)
                .map(|(r, c)| r * c)
                .sum();
            for (r, c) in residual.iter_mut().zip(component) {
                *r -= score * c;
            }
        }

        residual.iter().map(|value| value * value).sum()
    }
}
`,
        rationale:
          'Power iteration with deflation becomes a Jacobi eigensolver, which is an accuracy change rather than a stylistic one: deflation accumulates each component’s error into the ones that follow, and the small components it damages are precisely what a reconstruction detector reads. The covariance is accumulated in one pass over the lower triangle using chunks_exact, so symmetry halves the arithmetic and every row is a contiguous walk with bounds checks elided. Errors become a typed Result, k gets a validated newtype since it and the dimension are both bare usize at every call site, and the sign convention is pinned so downstream features do not invert between refits.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(n*d^2/2) for the covariance plus O(d^3) for the Jacobi sweeps, over flat contiguous buffers.',
      },
      'make-it-fast': {
        code: `//! PCA by randomized SVD - k components without factorizing everything.

use ndarray::{Array1, Array2, ArrayView2, Axis};
use ndarray_linalg::{QR, SVD};
use rayon::prelude::*;

/// Top-k components in O(n*d*k) instead of O(n*d*min(n,d)).
///
/// An exact SVD computes every component and discards most of them. The
/// randomized method finds a small orthonormal basis capturing the matrix's
/// dominant action, projects onto it, and factorizes the tiny result - so cost
/// scales with the components actually wanted.
///
/// It is APPROXIMATE. The approximation is excellent when the spectrum decays
/// quickly and poor when it is flat - which is also when the trailing
/// components are not identified anyway. Power iterations sharpen the decay at
/// one pass over the data each.
#[must_use]
pub fn randomized_pca(
    x: ArrayView2<f64>,
    k: usize,
    oversampling: usize,
    power_iterations: usize,
    seed: u64,
) -> (Array2<f64>, Array1<f64>, Array1<f64>) {
    let n = x.nrows();
    let d = x.ncols();
    let sketch_width = (k + oversampling).min(d);

    // Centring is a per-column reduction over independent rows.
    let mean: Array1<f64> = x.mean_axis(Axis(0)).expect("non-empty");
    let mut centred = x.to_owned();
    centred
        .axis_iter_mut(Axis(0))
        .into_par_iter()
        .for_each(|mut row| row -= &mean);

    // Range finder: a random projection whose columns span approximately the
    // same space as the top singular vectors.
    let mut state = seed | 1;
    let mut omega = Array2::<f64>::zeros((d, sketch_width));
    for value in omega.iter_mut() {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        *value = (state >> 11) as f64 / (1_u64 << 53) as f64 - 0.5;
    }

    let mut sketch = centred.dot(&omega);

    // Each power iteration is two BLAS products with a re-orthonormalization
    // between them, so small singular directions are not lost to round-off.
    for _ in 0..power_iterations {
        let (q, _) = sketch.qr().expect("qr failed");
        sketch = centred.t().dot(&q);
        let (q, _) = sketch.qr().expect("qr failed");
        sketch = centred.dot(&q);
    }

    let (basis, _) = sketch.qr().expect("qr failed");

    // Factorize inside the small basis: the SVD is now (sketch_width, d)
    // rather than (n, d), which is the entire saving.
    let projected = basis.t().dot(&centred);
    let (_, singular, right) = projected.svd(false, true).expect("svd failed");
    let right = right.expect("requested right vectors");

    let mut components = Array2::<f64>::zeros((k, d));
    let mut explained = Array1::<f64>::zeros(k);
    for c in 0..k {
        let mut row = right.row(c).to_owned();

        // Signs are arbitrary; pin a convention so downstream is stable.
        let largest = row
            .iter()
            .copied()
            .fold(0.0_f64, |acc, v| if v.abs() > acc.abs() { v } else { acc });
        if largest < 0.0 {
            row.mapv_inplace(|v| -v);
        }

        components.row_mut(c).assign(&row);
        explained[c] = singular[c] * singular[c] / (n - 1) as f64;
    }

    (components, explained, mean)
}
`,
        rationale:
          'The exact factorization is replaced by a randomized one: sketch the data through a random projection to find a small basis capturing its dominant action, then factorize inside that basis, so the expensive decomposition is on a k-by-d matrix rather than an n-by-d one and the cost scales with the components actually wanted. All the heavy products and the QR steps dispatch to BLAS through ndarray, and the centring — a per-row reduction over independent rows — moves to rayon. The approximation is stated in the doc comment rather than implied: it is excellent on a decaying spectrum and poor on a flat one, which is precisely when the trailing components were never identified anyway.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'The range finder, both power-iteration products, and the final small SVD all dispatch to BLAS and LAPACK instead of hand-written loops.',
            tradeoff: 'Binds the build to a system BLAS/LAPACK, and the centred copy of the design must be fully resident — on the wide matrices this routine exists for, that copy is the binding constraint.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Centring is an independent per-row subtraction, so it partitions across cores with no shared mutable state and no synchronization.',
            tradeoff: 'Only the centring parallelizes here; the factorizations that dominate the cost are left to BLAS, so the speedup from rayon is bounded and can be lost to oversubscription against a threaded BLAS.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The component and variance outputs are sized to k before being filled, so the returned arrays are never grown and copied.',
            tradeoff: 'Requires k up front, which is fine here and rules out the streaming variant where components are added until an explained-variance target is met.',
          },
        ],
        libraryName: 'ndarray + ndarray-linalg + rayon',
        profile: 'O(n*d*k) for k components versus O(n*d*min(n,d)) exact. Illustrative, not a measured benchmark.',
      },
    },
  },
};
