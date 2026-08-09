/**
 * data-science-ml glossary terms.
 *
 * Ledger populated in Phase 1 (slug/term/category/voiceTemplate only).
 * `definition` fields are filled in Phase 2 by an isolated content subagent
 * — see plan §7. Source lineage: scratchpad/glossary-sources/{model,
 * system_design_MLE,dailydoseofds-best-practices}.txt, extracted from:
 *   public/excalidraw/model.excalidraw                     @ c3e1b6491657c3b16b8297b760f1c1200fa532a8
 *   public/excalidraw/system_design_MLE.excalidraw         @ 6541e2c48a864b1fc9fb8a7f12fcfe13976bde5b
 *   public/excalidraw/dailydoseofds-best-practices.excalidraw
 *
 * `encoder` and `decoder` are pre-filled here (not left for Phase 2) — they
 * are the user's own worked example of the target voice for the entire
 * glossary and serve as the canonical anchor every content subagent's
 * 'mechanism' entries should pattern-match against.
 */

import type { GlossaryTerm } from './types';

export const GLOSSARY_TERMS_DATA_SCIENCE_ML: GlossaryTerm[] = [
  {
    slug: 'feature-engineering',
    term: 'Feature Engineering',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Feature engineering is the process of transforming raw data into the inputs a model actually consumes, selecting and constructing variables that expose the signal a model needs rather than leaving it buried in unprocessed fields. Because every added feature increases the surface for leakage, overfitting, and serving latency, it optimizes for quality over quantity — pruning a weak feature is more effective than letting it linger.',
  },
  {
    slug: 'data-leakage',
    term: 'Data Leakage',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Data leakage happens when information that would not be available at prediction time enters the training process, so a model appears to perform well during evaluation without that performance transferring to production. It typically enters through data splits that ignore time or shared entities, or through preprocessing steps like scaling and encoding that get fit on data outside the training fold.',
  },
  {
    slug: 'class-imbalance',
    term: 'Class Imbalance',
    category: 'data-science-ml',
    voiceTemplate: 'constraint',
    definition:
      "Class imbalance is a skew in the distribution of labels within a dataset, where one class vastly outnumbers another, so a model can reach high accuracy by defaulting toward the majority class while providing almost no signal on the minority class that usually matters most. It forces evaluation away from raw accuracy and toward metrics like precision, recall, and F1 that measure performance on each class individually.",
  },
  {
    slug: 'missing-data-mechanisms',
    term: 'Missing Data Mechanisms (MCAR/MAR/MNAR)',
    category: 'data-science-ml',
    voiceTemplate: 'structure',
    definition:
      'Missing data mechanisms describe the relationship between why a value is missing and the rest of the data: MCAR (missing completely at random) means missingness is unrelated to any observed or unobserved variable, MAR (missing at random) means it depends only on variables that are observed, and MNAR (missing not at random) means it depends on the missing value itself. This distinction determines whether a missingness pattern can be safely imputed or whether it introduces a bias that no imputation strategy fully corrects.',
  },
  {
    slug: 'precision-recall-f1',
    term: 'Precision, Recall & F1',
    category: 'data-science-ml',
    voiceTemplate: 'constraint',
    definition:
      "Precision measures how many of a model's positive predictions were actually correct, while recall measures how many of the true positives the model actually found; the two trade off against each other because tightening a decision threshold to raise one typically lowers the other. F1 is the harmonic mean of the two, collapsing that tradeoff into a single bounded score for problem types like imbalanced classification where accuracy alone is misleading.",
  },
  {
    slug: 'roc-auc',
    term: 'ROC / AUC',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "The ROC curve plots a classifier's true positive rate against its false positive rate across every possible decision threshold, tracing how the tradeoff between catching real positives and triggering false alarms shifts as that threshold moves. AUC condenses that curve into a single number — the probability a randomly chosen positive example is ranked above a randomly chosen negative one — giving a threshold-independent measure of separability that complements precision, recall, and F1.",
    relatedSlugs: ['precision-recall-f1'],
  },
  {
    slug: 'model-calibration',
    term: 'Model Calibration',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Model calibration is the process of aligning a model's predicted probabilities with the actual observed frequency of outcomes, so a prediction made with 70% confidence turns out correct roughly 70% of the time rather than being an arbitrary score. It matters specifically when those probabilities, not just the final class label, drive downstream decisions, and is typically checked with a metric like the Brier score.",
  },
  {
    slug: 'bias-variance-tradeoff',
    term: 'Bias-Variance Tradeoff',
    category: 'data-science-ml',
    voiceTemplate: 'constraint',
    definition:
      'The bias-variance tradeoff is the bound on how well a model can simultaneously fit the underlying pattern in data (low bias) and stay stable across different training samples (low variance): reducing one by adding model complexity tends to raise the other. A high-bias model underfits by being too rigid to capture real structure, while a high-variance model overfits by memorizing noise specific to its own training set.',
  },
  {
    slug: 'cross-validation',
    term: 'Cross-Validation',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Cross-validation splits a dataset into multiple folds and repeatedly trains on all but one fold while evaluating on the held-out fold, rotating which fold is held out each round. Averaging performance across folds produces a more reliable estimate of how a model will generalize than a single train/test split, and it exposes how much that performance varies across different subsets of the data.',
  },
  {
    slug: 'regularization',
    term: 'Regularization (L1/L2)',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Regularization adds a penalty term to a model's loss function based on the magnitude of its weights, constraining the model from fitting the training data so closely that it sacrifices generalization. L1 regularization pushes weights toward exactly zero, producing sparse feature selection, while L2 regularization shrinks weights smoothly toward zero without eliminating them outright.",
  },
  {
    slug: 'gradient-descent',
    term: 'Gradient Descent',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Gradient descent is an iterative optimization process that computes the gradient of a loss function with respect to a model's parameters and updates those parameters in the opposite direction of that gradient, shrinking the loss with each step. The size of each step is controlled by the learning rate, and repeating this process across the training data is what lets a model's weights converge toward values that minimize error.",
    relatedSlugs: ['backpropagation'],
  },
  {
    slug: 'backpropagation',
    term: 'Backpropagation',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Backpropagation is the algorithm that computes the gradient that gradient descent needs: it applies the chain rule backward through a neural network's layers, propagating the loss's gradient from the output layer back to every weight in every earlier layer. That per-weight gradient is what tells gradient descent which direction, and by how much, to adjust each parameter to reduce the loss.",
    relatedSlugs: ['gradient-descent'],
  },
  {
    slug: 'overfitting-underfitting',
    term: 'Overfitting vs. Underfitting',
    category: 'data-science-ml',
    voiceTemplate: 'structure',
    definition:
      "Overfitting and underfitting describe the two ends of a model's relationship to its training data: an overfit model has learned the noise and idiosyncrasies of the training set so closely that it fails to generalize to new data, while an underfit model hasn't captured enough of the underlying pattern to perform well on training or new data either. Regularization, added data, or a change in model complexity moves a model along this spectrum toward the point where it captures real signal without memorizing noise.",
    relatedSlugs: ['bias-variance-tradeoff', 'regularization'],
  },
  {
    slug: 'confusion-matrix',
    term: 'Confusion Matrix',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "A confusion matrix is a table that cross-tabulates a classifier's predicted labels against actual labels, breaking every prediction down into true positives, true negatives, false positives, and false negatives. It transforms a single accuracy number into the raw counts that precision, recall, and F1 are calculated from, exposing exactly which kind of error a model is making.",
    relatedSlugs: ['precision-recall-f1'],
  },
  {
    slug: 'ensemble-methods',
    term: 'Ensemble Methods (Bagging/Boosting/Stacking)',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Ensemble methods combine multiple individual models into a single prediction rather than relying on any one model alone, on the premise that aggregating diverse errors reduces overall error. Bagging trains models in parallel on resampled subsets of data and averages their outputs to reduce variance, boosting trains models sequentially so each new model corrects the errors of the ones before it, and stacking trains a separate model to learn how to best combine the outputs of the base models.',
  },
  {
    slug: 'label-smoothing',
    term: 'Label Smoothing',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Label smoothing is a regularization technique that replaces the hard 0/1 targets in a classification dataset with softened values, assigning the correct class a probability slightly less than one and distributing the remainder across the other classes instead of zero. This keeps the model from becoming overconfident in its predictions and from optimizing that overconfidence directly into the training signal.',
  },
  {
    slug: 'feature-discretization',
    term: 'Feature Discretization',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Feature discretization transforms a continuous feature into a set of discrete bins — either equally sized ranges or equal-frequency groups — converting it into a categorical or one-hot representation. This can expose non-linear relationships in the data that a model operating on the raw continuous value would otherwise miss.',
  },
  {
    slug: 'mini-batch-training',
    term: 'Mini-Batch Training',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Mini-batch training computes each gradient descent update from a small, randomly sampled subset of the training data, rather than the full dataset at once or a single example at a time. Shuffling that data before batching matters structurally: if examples of the same class are grouped together, each mini-batch skews toward whatever class it contains, and the model overfits to whichever pattern it encountered early in training.',
    relatedSlugs: ['gradient-descent'],
  },
  {
    slug: 'transformer-architecture',
    term: 'Transformer Architecture',
    category: 'data-science-ml',
    voiceTemplate: 'structure',
    definition:
      'The transformer architecture is an encoder-decoder relationship built entirely on attention rather than recurrence or convolution: the encoder stack transforms an input sequence into contextual representations, and the decoder stack consumes those representations to generate an output sequence, with self-attention layers inside each stack letting every position weigh every other position directly. Positional encoding is added at the input specifically to compensate for the fact that this attention-based structure has no inherent notion of sequence order.',
    relatedSlugs: ['self-attention', 'encoder', 'decoder'],
  },
  {
    slug: 'attention-mechanism',
    term: 'Attention',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Attention is a mechanism that computes a weighted combination of a set of values, where the weights are derived from how relevant each value is to a given query, letting a model focus computation on the parts of its input most relevant to the current step. Those weights are learned rather than fixed, so the model determines dynamically what to attend to instead of relying on a hardcoded window or position.',
  },
  {
    slug: 'self-attention',
    term: 'Self-Attention',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Self-attention is attention applied within a single sequence: each position generates a query, key, and value from the same input, and its output representation becomes a weighted combination of every other position's value, weighted by how well its query matches their keys. This lets a model relate any two positions in a sequence directly, regardless of how far apart they are, without the sequential bottleneck of recurrence.",
    relatedSlugs: ['attention-mechanism'],
  },
  {
    slug: 'encoder',
    term: 'Encoder',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'An encoder is a function that transforms a raw input into a structured internal representation, so that representation — not the original input — becomes what downstream computation operates on.',
    relatedSlugs: ['decoder', 'transformer-architecture'],
  },
  {
    slug: 'decoder',
    term: 'Decoder',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "A decoder is a function that takes an encoder's internal representation as input and transforms it into another representative form, such as a sequence of output tokens.",
    relatedSlugs: ['encoder', 'transformer-architecture'],
  },
  {
    slug: 'tokenization',
    term: 'Tokenization',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Tokenization is the process that converts raw text into a sequence of discrete units, tokens, that a model can map to numerical IDs and operate on, splitting the text into units that range from whole words to subword fragments to individual characters depending on the scheme used. The choice of scheme directly constrains vocabulary size and how the model handles rare or unseen words.',
  },
  {
    slug: 'positional-encoding',
    term: 'Positional Encoding',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      "Positional encoding injects information about a token's position in a sequence into its input representation, typically by adding a vector generated from that position to the token's embedding before it enters the model. This step is necessary because self-attention itself is order-agnostic — without it, a transformer would treat a sequence as an unordered set of tokens.",
  },
  {
    slug: 'multi-head-attention',
    term: 'Multi-Head Attention',
    category: 'data-science-ml',
    voiceTemplate: 'mechanism',
    definition:
      'Multi-head attention runs several self-attention operations in parallel, each with its own learned query, key, and value projections, rather than computing a single attention operation over the full representation. Concatenating and projecting the outputs of these heads lets the model attend to different types of relationships within the same layer, instead of collapsing them into one averaged attention pattern.',
    relatedSlugs: ['self-attention'],
  },
  {
    slug: 'context-window',
    term: 'Context Window',
    category: 'data-science-ml',
    voiceTemplate: 'constraint',
    definition:
      'A context window is the fixed upper bound on how many tokens a model can attend to as input at once, set architecturally by how the model was trained. Content beyond that bound gets truncated or dropped, which for retrieval-augmented and long-document tasks forces an explicit tradeoff between how much context is supplied and how much of it the model can meaningfully use before generation quality degrades.',
  },
];
