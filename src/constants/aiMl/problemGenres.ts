/**
 * The problem landscape: the eight genres of problem that data science is
 * usually asked to solve, each with the model families that solve it.
 *
 * Array order is the clockwise order around the map's hub, starting top-left.
 * Each leaf points at a registered model by slug. Its label must be that model's
 * name or one of its aliases, and its examples must be aliases, so the map
 * can never invent a model the registry does not describe. The same family can
 * appear under several genres (an SVM regresses and classifies), which is the
 * point: genre is a property of the problem, not of the algorithm.
 *
 * Integrity is enforced by checkProblemGenres() in scripts/verifyAiMl.ts.
 */

import type { ProblemGenre } from './types';

export const PROBLEM_GENRES: ProblemGenre[] = [
  {
    id: 'regression',
    label: 'Regression',
    question: 'How much? Predict a continuous number from features.',
    output: 'A real-valued estimate, ideally with an interval around it.',
    typicalObjective: 'Squared error (the conditional mean), absolute error (the median), or pinball loss (any quantile).',
    anchor: { kind: 'task-type', id: 'regression' },
    leaves: [
      { slug: 'linear-regression', label: 'OLS' },
      { slug: 'ridge-lasso', label: 'Lasso' },
      { slug: 'support-vector-machine', label: 'SVM' },
      { slug: 'decision-tree', label: 'Decision Tree' },
      { slug: 'random-forest', label: 'Random Forest' },
      { slug: 'mlp', label: 'Neural Networks' },
      { slug: 'gradient-boosting', label: 'GBM' },
      { slug: 'generalized-linear-models', label: 'GLM' },
      { slug: 'k-nearest-neighbours', label: 'k-Nearest Neighbours' },
      { slug: 'stepwise-regression', label: 'Stepwise Regression' },
      { slug: 'quantile-regression', label: 'Quantile Regression' },
    ],
    metricIds: ['euclidean', 'manhattan', 'mahalanobis'],
    metricRationale:
      'The loss is the metric. Squared Euclidean error targets the mean and is what least squares and neural regressors minimise; Manhattan (L1) error targets the median and is robust to outliers; Mahalanobis comes in when residuals are correlated across outputs.',
  },
  {
    id: 'classification',
    label: 'Classification',
    question: 'Which one? Assign an input to one of a fixed set of labels.',
    output: 'A label, or better, a calibrated probability per label.',
    typicalObjective: 'Cross-entropy (log loss), hinge loss for max-margin models, or Gini/entropy impurity for trees.',
    anchor: { kind: 'task-type', id: 'classification' },
    leaves: [
      { slug: 'logistic-regression', label: 'Logistic Regression' },
      { slug: 'naive-bayes', label: 'Naive Bayes', examples: ['Multiclass Naive Bayes'] },
      { slug: 'support-vector-machine', label: 'SVM' },
      { slug: 'decision-tree', label: 'Decision Tree' },
      { slug: 'random-forest', label: 'Random Forest' },
      { slug: 'mlp', label: 'Neural Networks' },
      { slug: 'gradient-boosting', label: 'GBM' },
      { slug: 'k-nearest-neighbours', label: 'k-Nearest Neighbours' },
    ],
    metricIds: ['euclidean', 'manhattan', 'cosine', 'mahalanobis'],
    metricRationale:
      'Only instance-based and kernel classifiers compare points directly: k-NN votes among the closest neighbours (Euclidean on scaled tabular data, cosine on text), and an RBF-kernel SVM is a function of Euclidean distance. LDA is nearest-centroid in Mahalanobis distance. Trees and logistic regression need no metric, which is part of why they handle mixed-scale features so easily.',
  },
  {
    id: 'optimization',
    label: 'Optimization',
    question: 'What should we do? Choose the best decision under constraints.',
    output: 'A decision (an allocation, a schedule, a price, an arm to pull) rather than a prediction.',
    typicalObjective: 'A cost or reward to minimise or maximise, subject to feasibility constraints; often fed by a forecast.',
    anchor: { kind: 'domain', id: 'optimization' },
    leaves: [
      { slug: 'genetic-algorithm', label: 'Genetic algorithm', examples: ['Stochastic search'] },
      { slug: 'linear-programming', label: 'Linear programming', examples: ['Integer programming'] },
      { slug: 'multi-armed-bandits', label: 'Multi-Armed Bandits' },
    ],
    metricIds: ['manhattan', 'chebyshev', 'euclidean'],
    metricRationale:
      'Norms appear as objectives and constraints: an L1 or L∞ objective stays a linear program (absolute values and maxima linearise), a Euclidean objective makes it a quadratic program, and the choice decides whether you minimise total, worst-case, or squared deviation.',
  },
  {
    id: 'nlp-llm',
    label: 'NLP / LLM',
    question: 'What does this text mean, and what comes next?',
    output: 'Tokens, labels on text, embeddings, or generated text.',
    typicalObjective: 'Next-token or masked-token cross-entropy, with contrastive losses for embeddings.',
    anchor: { kind: 'domain', id: 'natural-language' },
    leaves: [
      { slug: 'rnn', label: 'RNN' },
      { slug: 'lstm', label: 'LSTM' },
      { slug: 'masked-lm', label: 'BERT' },
      { slug: 'decoder-only-lm', label: 'GPT', examples: ['Llama', 'LaMDA', 'StableLM'] },
      { slug: 'word2vec', label: 'Word2Vec' },
    ],
    metricIds: ['cosine', 'dot-product', 'edit-distance', 'jaccard'],
    metricRationale:
      'Embeddings are compared by direction, because vector length tracks word frequency rather than meaning, so cosine is the default. Attention and retrieval score with the dot product. Surface-level matching (typos, near-duplicate detection) uses edit distance and Jaccard over shingles.',
  },
  {
    id: 'forecasting',
    label: 'Forecasting',
    question: 'What happens next? Predict future values of an ordered series.',
    output: 'Point forecasts per horizon, ideally with quantiles or a full predictive distribution.',
    typicalObjective: 'Squared or absolute error per horizon, pinball loss for quantiles, or negative log-likelihood.',
    anchor: { kind: 'domain', id: 'time-series-forecasting' },
    leaves: [
      { slug: 'arima', label: 'ARIMA', examples: ['SARIMA', 'SARIMAX'] },
      { slug: 'exponential-smoothing', label: 'Exponential Smoothing' },
      { slug: 'deepar', label: 'DeepAR' },
      { slug: 'kalman-filter', label: 'BayesDLM' },
      { slug: 'n-beats', label: 'N-BEATS' },
    ],
    metricIds: ['euclidean', 'manhattan', 'pearson'],
    metricRationale:
      'Accuracy is scored with L2 (RMSE) or L1 (MAE/MASE), and the choice is a decision about whether large misses should cost quadratically. Pearson correlation compares series by shape regardless of level, which is how similar series are grouped before forecasting them together.',
  },
  {
    id: 'recommender-system',
    label: 'Recommender System',
    question: 'What will this user want? Rank items for a person or context.',
    output: 'A ranked list of items, usually the top-k from a very large catalogue.',
    typicalObjective: 'Rating reconstruction error, or a ranking/contrastive loss over positive and sampled negative items.',
    anchor: { kind: 'domain', id: 'recommendation-ranking' },
    leaves: [
      { slug: 'matrix-factorization', label: 'Collaborative filtering', examples: ['ALS'] },
      { slug: 'content-based-filtering', label: 'Content filtering' },
      { slug: 'association-rules', label: 'Association Rule' },
      { slug: 'rnn', label: 'RNN' },
      { slug: 'two-tower-retrieval', label: 'Two-Tower Model' },
    ],
    metricIds: ['cosine', 'pearson', 'jaccard', 'dot-product'],
    metricRationale:
      'This genre exercises the most metrics, because the choice of metric is the model. Item-item collaborative filtering compares rating vectors with cosine or, to cancel each rater’s offset, Pearson. Baskets and tags are sets, so Jaccard. Learned embeddings score with the dot product, because the factorisation was trained on one.',
  },
  {
    id: 'computer-vision',
    label: 'Computer Vision',
    question: 'What is in this image, and where?',
    output: 'A label per image, boxes per object, a mask per pixel, or a generated image.',
    typicalObjective: 'Cross-entropy for labels, IoU-based and regression losses for boxes, Dice for masks, adversarial or denoising losses for generation.',
    anchor: { kind: 'domain', id: 'computer-vision' },
    leaves: [
      { slug: 'cnn', label: 'CNN', examples: ['AlexNet', 'VGG'] },
      { slug: 'object-detection', label: 'YOLO', examples: ['Fast R-CNN'] },
      { slug: 'gan', label: 'GAN' },
      { slug: 'u-net', label: 'U-Net' },
      { slug: 'resnet', label: 'ResNet' },
    ],
    metricIds: ['euclidean', 'cosine', 'jaccard'],
    metricRationale:
      'Raw pixel distance is nearly useless (a one-pixel shift moves every coordinate), so images are first embedded by a network and compared with cosine or Euclidean in that space. Jaccard reappears as Intersection-over-Union, the overlap measure for boxes and segmentation masks.',
  },
  {
    id: 'clustering',
    label: 'Clustering',
    question: 'What groups exist? Find structure with no labels at all.',
    output: 'A group assignment per point (hard or soft), sometimes a hierarchy, sometimes a "noise" label.',
    typicalObjective: 'Within-cluster squared distance (k-means), likelihood (GMM), density-connectivity (DBSCAN), or a graph cut (spectral).',
    anchor: { kind: 'task-type', id: 'clustering' },
    leaves: [
      { slug: 'k-means', label: 'K-Means' },
      { slug: 'hierarchical-clustering', label: 'Hierarchical Clustering' },
      { slug: 'dbscan', label: 'DBSCAN' },
      { slug: 'gaussian-mixture', label: 'GMM' },
      { slug: 'affinity-propagation', label: 'Affinity Propagation' },
      { slug: 'spectral-clustering', label: 'Spectral Clustering' },
    ],
    metricIds: ['euclidean', 'mahalanobis', 'cosine', 'jaccard'],
    metricRationale:
      'With no labels, the metric is the only definition of "similar", so choosing it is the modelling decision. K-means is tied to squared Euclidean (the mean is its minimiser). GMMs generalise that to per-cluster Mahalanobis. Hierarchical clustering and DBSCAN accept any metric, including cosine for text and Jaccard for sets.',
  },
];
