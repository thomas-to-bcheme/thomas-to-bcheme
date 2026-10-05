/**
 * Similarity and distance metrics, ordered by the vectorization ladder: from
 * metrics that need no coordinate system at all (sets, sequences) to metrics
 * that need an estimated covariance (Mahalanobis).
 *
 * Every metric is argued from its mathematics, not its popularity: which
 * invariances it has, what geometry it assumes, and what breaks when that
 * assumption does not hold. scripts/verifyAiMl.ts checks that the KaTeX renders,
 * that every related slug resolves, and that the explorer's arithmetic
 * (src/lib/similarity.ts) agrees with known values.
 */

import type { SimilarityMetric } from './types';

export const SIMILARITY_METRICS: SimilarityMetric[] = [
  {
    id: 'jaccard',
    label: 'Jaccard',
    kind: 'similarity',
    representation: 'set',
    view: 'set',
    coordinateSystem:
      'None. The two objects are sets, and the only question is how much of their combined membership they share.',
    expression: {
      formula: 'J(A,B) = \\frac{|A \\cap B|}{|A \\cup B|}',
      symbols: [
        { symbol: 'A, B', meaning: 'the two sets (tags, tokens, purchased items, shingles)' },
        { symbol: '|A \\cap B|', meaning: 'items in both' },
        { symbol: '|A \\cup B|', meaning: 'items in either' },
      ],
    },
    properties: {
      isTrueMetric: false,
      isBounded: true,
      isScaleInvariant: true,
      isTranslationInvariant: false,
      complexity: 'O(|A| + |B|) with hashing; MinHash estimates it in O(k) per pair.',
    },
    foundation:
      'Set algebra, not geometry. Because the union is the denominator, items that only one set has count against the score, so a small set inside a big one scores low. 1 − J is a true metric (the Jaccard distance), and the probability that two random hash permutations pick the same minimum element equals J. That fact is what makes MinHash and locality-sensitive hashing possible at web scale.',
    whenToUse:
      'Binary presence/absence data where absence is not evidence: tags, basket contents, near-duplicate documents (as shingle sets), and the support side of association rules.',
    whyNotAlternatives:
      'Cosine on the same binary vectors divides by √(|A||B|) instead of the union, so it forgives a size mismatch that Jaccard penalises. Hamming or Euclidean on binary vectors count shared absences as agreement, which in a sparse catalogue of a million items means every pair looks almost identical.',
    failureMode:
      'It throws away counts and weights: a customer who bought 40 of an item and one who bought 1 look the same. Use weighted Jaccard or TF-IDF cosine when frequency matters.',
    relatedSlugs: ['association-rules', 'content-based-filtering', 'k-nearest-neighbours', 'hierarchical-clustering'],
  },
  {
    id: 'edit-distance',
    label: 'Edit distance',
    kind: 'distance',
    representation: 'sequence',
    view: 'sequence',
    coordinateSystem:
      'None. Strings are compared by the cheapest sequence of insertions, deletions and substitutions that turns one into the other.',
    expression: {
      formula:
        'D_{i,j} = \\min\\begin{cases} D_{i-1,j} + 1 \\\\ D_{i,j-1} + 1 \\\\ D_{i-1,j-1} + [s_i \\neq t_j] \\end{cases}',
      symbols: [
        { symbol: 'D_{i,j}', meaning: 'edit distance between the first i characters of s and the first j of t' },
        { symbol: '[s_i \\neq t_j]', meaning: '1 if the characters differ (a substitution), 0 if they match' },
      ],
    },
    properties: {
      isTrueMetric: true,
      isBounded: false,
      isScaleInvariant: false,
      isTranslationInvariant: false,
      complexity: 'O(|s| · |t|) time; O(min(|s|, |t|)) memory if only the distance is needed.',
    },
    foundation:
      'Dynamic programming: the optimal alignment of two prefixes extends an optimal alignment of shorter prefixes (optimal substructure), so the whole cost table fills in one pass and the answer is the shortest path through it. It is a true metric because edits are reversible and chain together, which gives the triangle inequality.',
    whenToUse:
      'Typos and fuzzy matching, entity resolution on names and addresses, spell-check candidates, DNA and protein alignment (with weighted costs), and string-similarity checks in NLP evaluation.',
    whyNotAlternatives:
      'Jaccard on character sets ignores order ("listen" and "silent" score 1.0). Euclidean distance on one-hot positions breaks after a single insertion, because every later character shifts. Edit distance is the only option here that allows for shifting.',
    failureMode:
      'Quadratic cost per pair rules out all-pairs comparison over millions of strings, so block candidates first with n-grams or MinHash. It is also purely surface-level: "car" and "automobile" are far apart. When meaning matters, compare embeddings with cosine.',
    relatedSlugs: ['k-nearest-neighbours', 'hierarchical-clustering', 'dynamic-programming'],
  },
  {
    id: 'euclidean',
    label: 'Euclidean (L2)',
    kind: 'distance',
    representation: 'coordinates',
    view: 'vector-plane',
    coordinateSystem:
      'Cartesian ℝⁿ with orthogonal, equally-scaled axes. The unit ball is a circle (a sphere in higher dimensions).',
    expression: {
      formula: 'd_2(\\mathbf{a},\\mathbf{b}) = \\lVert \\mathbf{a}-\\mathbf{b} \\rVert_2 = \\sqrt{\\textstyle\\sum_i (a_i - b_i)^2}',
      symbols: [
        { symbol: '\\mathbf{a}, \\mathbf{b}', meaning: 'feature vectors' },
        { symbol: '\\lVert \\cdot \\rVert_2', meaning: 'the L2 norm (Pythagoras in n dimensions)' },
      ],
    },
    properties: {
      isTrueMetric: true,
      isBounded: false,
      isScaleInvariant: false,
      isTranslationInvariant: true,
      complexity: 'O(n) per pair.',
    },
    foundation:
      'The norm induced by the inner product, ‖x‖² = x·x, so it is rotation-invariant and differentiable everywhere except at zero. Squared Euclidean is the loss that least squares, k-means and Gaussian likelihoods minimise. The mean is the point that minimises total squared Euclidean distance, which is why k-means updates its centroids with averages.',
    whenToUse:
      'Dense, continuous, comparably-scaled features where absolute position matters: sensor readings, standardised tabular features, low-dimensional embeddings, and k-means, k-NN and RBF kernels.',
    whyNotAlternatives:
      'Manhattan is more robust when individual coordinates have outliers. Cosine is the right choice when magnitude is noise (document length). Mahalanobis is needed when features are correlated, because Euclidean double-counts correlated axes.',
    failureMode:
      'Scale-sensitive: a feature in dollars swamps one in percent unless you standardise. In high dimensions, distances concentrate (the nearest and farthest neighbour become almost equally far), so nearest-neighbour ranking loses contrast.',
    relatedSlugs: ['k-means', 'k-nearest-neighbours', 'linear-regression', 'hierarchical-clustering', 'dbscan', 'pca'],
  },
  {
    id: 'manhattan',
    label: 'Manhattan (L1)',
    kind: 'distance',
    representation: 'coordinates',
    view: 'vector-plane',
    coordinateSystem:
      'Cartesian ℝⁿ, but movement is restricted to the axes, like a taxi on a city grid. The unit ball is a diamond.',
    expression: {
      formula: 'd_1(\\mathbf{a},\\mathbf{b}) = \\lVert \\mathbf{a}-\\mathbf{b} \\rVert_1 = \\textstyle\\sum_i |a_i - b_i|',
      symbols: [{ symbol: '\\lVert \\cdot \\rVert_1', meaning: 'the L1 norm: sum of absolute coordinate differences' }],
    },
    properties: {
      isTrueMetric: true,
      isBounded: false,
      isScaleInvariant: false,
      isTranslationInvariant: true,
      complexity: 'O(n) per pair.',
    },
    foundation:
      'The L1 norm grows linearly, not quadratically, so one large deviation cannot dominate the sum. The point that minimises total L1 distance is the median, not the mean. That is the same fact that makes L1 regression (and quantile regression at τ = 0.5) robust to outliers, and the diamond-shaped ball, whose corners lie on the axes, is why the lasso produces exact zeros.',
    whenToUse:
      'Features on a grid or in independent units (counts, rank positions), data with heavy-tailed noise, and fairly high-dimensional data where L2 contrast fades. It is also the right choice when the business cost of an error is linear in its size.',
    whyNotAlternatives:
      'Euclidean squares deviations, so a single corrupted coordinate dominates. Chebyshev looks only at the worst coordinate and discards the rest.',
    failureMode:
      'Not rotation-invariant: rotate the feature axes and the distances change. It is also non-differentiable at zero, which needs subgradient or LP methods when used as a loss.',
    relatedSlugs: ['quantile-regression', 'ridge-lasso', 'k-nearest-neighbours', 'linear-programming'],
  },
  {
    id: 'chebyshev',
    label: 'Chebyshev (L∞)',
    kind: 'distance',
    representation: 'coordinates',
    view: 'vector-plane',
    coordinateSystem:
      'Cartesian ℝⁿ where only the largest single-axis gap counts, like a king moving on a chessboard. The unit ball is a square.',
    expression: {
      formula: 'd_\\infty(\\mathbf{a},\\mathbf{b}) = \\max_i |a_i - b_i| = \\lim_{p\\to\\infty} \\lVert \\mathbf{a}-\\mathbf{b} \\rVert_p',
      symbols: [{ symbol: '\\lVert \\cdot \\rVert_p', meaning: 'the Minkowski Lp norm; L1, L2 and L∞ are p = 1, 2, ∞' }],
    },
    properties: {
      isTrueMetric: true,
      isBounded: false,
      isScaleInvariant: false,
      isTranslationInvariant: true,
      complexity: 'O(n) per pair.',
    },
    foundation:
      'The limit of the Minkowski family as p → ∞: raising every deviation to a large power lets the largest one overwhelm the rest. It is the dual of L1, and minimising it is a minimax (worst-case) objective, which can be written as a linear program.',
    whenToUse:
      'Tolerance checks where every coordinate must be within bounds (manufacturing spec, adversarial L∞ perturbation budgets, warehouse crane moves where axes move simultaneously).',
    whyNotAlternatives:
      'L1 and L2 let many small deviations add up. When the requirement is that no single coordinate may be off by more than ε, only L∞ encodes it.',
    failureMode:
      'It ignores every coordinate except the worst one, so two vectors that differ slightly everywhere and two that differ on one axis can tie.',
    relatedSlugs: ['linear-programming', 'k-nearest-neighbours'],
  },
  {
    id: 'dot-product',
    label: 'Dot product',
    kind: 'similarity',
    representation: 'coordinates',
    view: 'vector-plane',
    coordinateSystem:
      'ℝⁿ with an inner product: the score is the length of one vector’s projection onto the other, times that other vector’s length.',
    expression: {
      formula: '\\mathbf{a}\\cdot\\mathbf{b} = \\textstyle\\sum_i a_i b_i = \\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert\\cos\\theta',
      symbols: [
        { symbol: '\\theta', meaning: 'the angle between the vectors' },
        { symbol: '\\lVert\\mathbf{a}\\rVert', meaning: 'magnitude, which the dot product keeps and cosine discards' },
      ],
    },
    properties: {
      isTrueMetric: false,
      isBounded: false,
      isScaleInvariant: false,
      isTranslationInvariant: false,
      complexity: 'O(n) per pair, and one matrix multiply for all pairs, which is what GPUs and ANN indexes are built for.',
    },
    foundation:
      'Linear algebra’s basic operation: a matrix multiply is a grid of dot products, attention is softmax over dot products, and matrix factorisation predicts a rating as the dot product of a user factor and an item factor. Because it keeps magnitude, a vector’s length can encode popularity or confidence on top of its direction.',
    whenToUse:
      'Learned embeddings trained with a dot-product objective (two-tower retrieval, matrix factorisation, attention), maximum-inner-product search, and any case where a longer vector should mean "more relevant overall".',
    whyNotAlternatives:
      'Cosine removes magnitude, which hurts when the model learned to put popularity there. Euclidean distance can rank differently from the dot product unless every vector has the same norm.',
    failureMode:
      'Unbounded and not a metric: long vectors (popular items, frequent words) win every query regardless of angle, a "hubness" problem. Normalise if magnitude was not trained to mean something.',
    relatedSlugs: ['two-tower-retrieval', 'matrix-factorization', 'ann-index', 'transformer', 'word2vec'],
  },
  {
    id: 'cosine',
    label: 'Cosine',
    kind: 'similarity',
    representation: 'direction',
    view: 'vector-plane',
    coordinateSystem:
      'Every vector is projected onto the unit sphere, so only its direction is compared. The level sets are rays from the origin, not circles around a point.',
    expression: {
      formula: '\\cos\\theta = \\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\lVert\\mathbf{a}\\rVert_2\\,\\lVert\\mathbf{b}\\rVert_2}',
      symbols: [
        { symbol: '\\theta', meaning: 'angle between a and b' },
        { symbol: '\\cos\\theta \\in [-1, 1]', meaning: '1 = same direction, 0 = orthogonal, −1 = opposite' },
      ],
    },
    properties: {
      isTrueMetric: false,
      isBounded: true,
      isScaleInvariant: true,
      isTranslationInvariant: false,
      complexity: 'O(n) per pair. Pre-normalise once and it becomes a plain dot product.',
    },
    foundation:
      'The law of cosines rearranged: dividing the dot product by both norms leaves only the angle. On unit vectors, ‖a − b‖² = 2 − 2 cos θ, so cosine and Euclidean distance give the same nearest-neighbour ranking once vectors are L2-normalised. That is why vector databases can use either.',
    whenToUse:
      'Text (TF-IDF, embeddings), where document length should not matter; sentence and image embeddings trained with a cosine or contrastive loss; and any high-dimensional sparse data where direction carries the meaning.',
    whyNotAlternatives:
      'Euclidean on raw TF-IDF says a long document is far from a short one on the same topic. The dot product rewards length. Jaccard ignores term weights.',
    failureMode:
      'Undefined for a zero vector, and blind to magnitude even when magnitude matters (a 5-star and a 1-star rater with proportional ratings look identical). It is also not translation-invariant: shift every vector and the angles change. Pearson fixes exactly that.',
    relatedSlugs: ['content-based-filtering', 'word2vec', 'contrastive-embeddings', 'two-tower-retrieval', 'ann-index', 'k-nearest-neighbours'],
  },
  {
    id: 'pearson',
    label: 'Pearson correlation',
    kind: 'similarity',
    representation: 'centred',
    view: 'ratings',
    coordinateSystem:
      'Each vector is first shifted to have zero mean, then compared by angle. Only the pattern of ups and downs is compared; the overall level drops out.',
    expression: {
      formula:
        'r = \\frac{\\sum_i (a_i-\\bar a)(b_i-\\bar b)}{\\sqrt{\\sum_i (a_i-\\bar a)^2}\\,\\sqrt{\\sum_i (b_i-\\bar b)^2}} = \\cos\\angle(\\mathbf{a}-\\bar a\\mathbf{1},\\ \\mathbf{b}-\\bar b\\mathbf{1})',
      symbols: [
        { symbol: '\\bar a, \\bar b', meaning: 'the mean of each vector' },
        { symbol: '\\mathbf{1}', meaning: 'the all-ones vector; subtracting ā·1 removes the offset' },
      ],
    },
    properties: {
      isTrueMetric: false,
      isBounded: true,
      isScaleInvariant: true,
      isTranslationInvariant: true,
      complexity: 'O(n) per pair.',
    },
    foundation:
      'Cosine similarity after mean-centring: projecting out the all-ones direction removes each vector’s offset, so the measure is invariant to both scale and shift. Statistically, it is the covariance normalised by both standard deviations, and r² is the fraction of variance a linear fit of one on the other explains.',
    whenToUse:
      'User-based collaborative filtering where raters use the scale differently (a harsh rater’s 3 is a generous rater’s 5), comparing time series by shape, and feature-to-feature redundancy checks.',
    whyNotAlternatives:
      'Cosine on raw ratings is fooled by offsets, because all-positive rating vectors already point roughly the same way. Euclidean penalises a harsh and a generous rater who agree on the ranking.',
    failureMode:
      'It only captures linear association: a perfect U-shaped relationship can give r ≈ 0. It is undefined for constant vectors, unstable on the few co-rated items typical of sparse rating matrices, and in 2 dimensions it can only be ±1.',
    relatedSlugs: ['matrix-factorization', 'k-nearest-neighbours', 'hierarchical-clustering', 'linear-regression'],
  },
  {
    id: 'mahalanobis',
    label: 'Mahalanobis',
    kind: 'distance',
    representation: 'whitened',
    view: 'vector-plane',
    coordinateSystem:
      'Coordinates rotated onto the covariance’s eigenvectors and rescaled by each eigenvalue (whitening). The unit ball is the data’s own covariance ellipse.',
    expression: {
      formula:
        'd_M(\\mathbf{a},\\mathbf{b}) = \\sqrt{(\\mathbf{a}-\\mathbf{b})^\\top \\Sigma^{-1} (\\mathbf{a}-\\mathbf{b})} = \\lVert \\Sigma^{-1/2}(\\mathbf{a}-\\mathbf{b}) \\rVert_2',
      symbols: [
        { symbol: '\\Sigma', meaning: 'the covariance matrix of the data' },
        { symbol: '\\Sigma^{-1/2}', meaning: 'the whitening transform that makes the covariance the identity' },
      ],
    },
    properties: {
      isTrueMetric: true,
      isBounded: false,
      isScaleInvariant: true,
      isTranslationInvariant: true,
      complexity: 'O(n³) once to invert Σ, then O(n²) per pair (O(n) after whitening the data once).',
    },
    foundation:
      'Euclidean distance after a linear change of basis. Σ⁻¹ divides out each direction’s variance, so a step along a high-variance, correlated direction counts for less than the same step across it. It is the exponent of the multivariate Gaussian density, so it measures how many standard deviations apart two points are. With Σ = I it reduces exactly to Euclidean.',
    whenToUse:
      'Correlated continuous features (height and weight, sensor channels), multivariate outlier detection, Gaussian mixture responsibilities, and classification with a shared class covariance (LDA).',
    whyNotAlternatives:
      'Euclidean double-counts correlated features and is fooled by unequal variances. Standardising each feature fixes the variances but not the correlations; only full whitening fixes both.',
    failureMode:
      'Needs a reliable covariance estimate: with few samples or many features Σ is singular or noisy, and its inverse amplifies the noise. Shrink the estimate (Ledoit-Wolf) or reduce dimensions first. Outliers also distort Σ itself, so use a robust estimator (MCD) when hunting for outliers.',
    relatedSlugs: ['gaussian-mixture', 'k-nearest-neighbours', 'pca', 'kalman-filter', 'isolation-forest'],
  },
];
