import type { AiMlModel } from '../../types';

/**
 * Perceptron — the first learning algorithm, and the one whose failure created
 * the field's first winter.
 *
 * Opens the deep-learning category because everything after it is a response
 * to a limitation this entry has in full: a single layer computes a linear
 * boundary and therefore cannot represent XOR. Minsky and Papert's proof of
 * that is why the multilayer perceptron exists, which makes this the honest
 * starting point rather than a historical courtesy.
 */
export const PERCEPTRON: AiMlModel = {
  slug: 'perceptron',
  name: 'Perceptron',
  aliases: ['Rosenblatt perceptron', 'Averaged perceptron', 'Structured perceptron', 'Mistake-driven learning'],
  category: 'deep-learning',
  group: 'foundations',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification'],
  architecture: 'perceptron',
  paradigmNote:
    'Online supervised learning in its original form: one example at a time, an update only when the prediction is wrong, and no memory of anything else. That mistake-driven structure is what gives it a convergence bound, and it is also why it never converges at all when the data is not separable.',

  intuition:
    'Guess a linear boundary. Take one example; if you got it right, change nothing. If you got it wrong, push the boundary toward the answer by adding that example to the weight vector. Repeat. That is the whole algorithm, and it has a remarkable property: if a boundary that separates the classes exists, this finds one in a bounded number of mistakes, and the bound depends only on how wide the gap is — not on how many examples there are or how many features. It also has a remarkable failure: if no such boundary exists, it never stops, and it never tells you why.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\mathbf{w}) = \\sum_{i \\in \\mathcal{M}} -y_i\\left(\\mathbf{w}^{\\top}\\mathbf{x}_i + b\\right), \\qquad \\mathcal{M} = \\left\\{ i : y_i\\left(\\mathbf{w}^{\\top}\\mathbf{x}_i + b\\right) \\leq 0 \\right\\}',
      symbols: [
        { symbol: '\\mathcal{M}', meaning: 'the currently misclassified examples — the only ones that contribute anything at all' },
        { symbol: 'y_i', meaning: 'label in {-1, +1}; the sign convention is what makes the product above a correctness indicator' },
        { symbol: '\\mathbf{w}^{\\top}\\mathbf{x}_i + b', meaning: 'the signed distance to the boundary, up to scale — the raw score, and not a probability' },
        { symbol: '-y_i(\\cdot)', meaning: 'positive exactly when the example is wrong, and proportional to how badly' },
      ],
    },
    reading:
      'Add up how wrong you are, counting only the examples you got wrong. A correctly classified point contributes exactly zero no matter how comfortably it is classified, which distinguishes this from the hinge loss the SVM uses — the hinge charges for being correct but close, and this does not. That difference is the whole gap between the two: any separating hyperplane drives this objective to zero, so the perceptron stops at whichever one it happens to reach, and which one that is depends on the order the data arrived in.',
  },

  optimization: {
    method: 'Online mistake-driven updates — stochastic gradient descent on the perceptron criterion, one example at a time',
    updateRule: {
      formula:
        '\\mathbf{w} \\leftarrow \\mathbf{w} + \\eta\\, y_i \\mathbf{x}_i \\quad \\text{if } y_i\\left(\\mathbf{w}^{\\top}\\mathbf{x}_i + b\\right) \\leq 0, \\qquad \\#\\text{mistakes} \\leq \\left(\\frac{R}{\\gamma}\\right)^{2}',
      symbols: [
        { symbol: '\\eta', meaning: 'learning rate, which for the classical perceptron only rescales the weights and does not change which boundary is found' },
        { symbol: 'R', meaning: 'radius of the data — the largest example norm' },
        { symbol: '\\gamma', meaning: 'the margin: how much room the best separating hyperplane has. The bound is entirely about geometry' },
        { symbol: '\\#\\text{mistakes}', meaning: 'total updates ever made, independent of the number of examples and of the dimension' },
      ],
    },
    rationale:
      'The update is stochastic gradient descent on the criterion above, and the gradient of a misclassified term is exactly minus y times x — so the algorithm predates SGD by decades and is a special case of it. What makes it worth studying is the convergence theorem: on separable data the number of mistakes is bounded by the squared ratio of the data radius to the margin, with no dependence on the sample size or the dimension at all. That is a genuinely strong statement, and the appearance of the margin in it is the seed of everything the SVM later does — if the mistake bound improves with margin, maximizing the margin is worth doing on purpose. The classical algorithm does not; it stops at whatever separator it finds first.',
    hyperparameters: [
      { name: 'learning rate', role: 'For the classical perceptron it only rescales the weights and does not change the decision boundary, which is unusual and worth knowing', typicalRange: '1.0; there is genuinely nothing to tune here' },
      { name: 'epochs', role: 'Passes over the data. On separable data it terminates on its own; on non-separable data this is the only thing that stops it', typicalRange: '5 to 50, with averaging' },
      { name: 'averaging', role: 'Return the average of all intermediate weight vectors rather than the last. Almost free, and it turns an unstable estimator into a reliable one' },
      { name: 'shuffling', role: 'Order matters, because the algorithm is order-dependent by construction. Reshuffling each epoch is standard' },
      { name: 'margin threshold', role: 'Update when the margin is below a positive threshold rather than below zero, which is the step from the perceptron toward the SVM' },
    ],
    convergence:
      'On linearly separable data it converges in finitely many mistakes and the bound is tight. On non-separable data — which is nearly all real data — it never converges: the weight vector cycles indefinitely, and there is no signal in the algorithm that anything is wrong. That is the defining failure, and the usual mitigation is a fixed epoch budget plus averaging. Two further properties are worth stating. The solution is order-dependent: shuffle the data and you get a different boundary, because any separator satisfies the objective equally. And the final weight vector is the one produced by the last update, which may have come from a single outlier — averaging over the whole run fixes this at almost no cost, which is why the averaged perceptron rather than the plain one is what anybody actually uses.',
    complexity:
      'O(nnz) per example, where nnz is the number of non-zero features — the algorithm only touches features that are present, which is why it stayed competitive on sparse high-dimensional text long after better models existed. Memory is O(d) for the weights and O(1) beyond that, with no need to store the data at all. Training is a single pass per epoch and is inherently sequential, since each update depends on the boundary the previous updates produced.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'not-applicable',
        why: 'It is a binary classifier with no representation of order or of a continuous target; applying it means discarding the temporal structure and predicting a label, at which point the forecasting problem is gone.',
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'A supervised classifier needing labelled examples of both classes, with no notion of density or outlyingness — an anomaly it has never seen is simply an input on one side of the boundary.',
      },
      optimization: {
        fit: 'adapted',
        how: 'The convergence theorem is the reason this entry earns a place under optimization: it is the first and simplest proof that an online, mistake-driven procedure terminates, and the bound is purely geometric — the squared ratio of data radius to margin, with no dependence on sample size or dimension. Reading that proof is how the connection between margin and generalization first becomes visible.',
        where: [
          'The reference example of an online learning algorithm with a mistake bound, which is a different guarantee from a convergence rate',
          'The origin of stochastic gradient descent, decades before it was called that',
          'The bound that motivates margin maximization, and therefore the SVM — if mistakes fall with margin, widening it deliberately is the obvious next move',
        ],
        why: 'It is worth studying because the guarantee has an unusual shape: not "the objective decreases at this rate" but "you will be wrong at most this many times, ever", which is the natural statement for a streaming setting and generalizes into the regret bounds of modern online learning. The counterweight is equally instructive — the guarantee holds only under separability, and outside it the algorithm has no behaviour to speak of. A theorem with a precondition that real data almost never satisfies is a useful thing to have met early.',
        featurization: [
          'Scale features so the data radius R is not dominated by one column, since the mistake bound is expressed in terms of it',
          'Add the bias as a constant feature rather than tracking it separately, which keeps the geometry of the bound intact',
        ],
        evaluation:
          'Count mistakes rather than measuring final accuracy: the mistake curve against the theoretical bound is the diagnostic, and a run whose mistakes never stop accumulating is telling you the data is not separable.',
        pitfalls: [
          'Applying the bound to non-separable data, where it says nothing at all',
          'Reading the learning rate as a tuning parameter when for the classical algorithm it only rescales the weights',
          'Treating a mistake bound as a generalization bound; they are different statements about different things',
        ],
      },
    },
    breadth: {
      'natural-language': {
        fit: 'adapted',
        how: 'The averaged and structured perceptron were the standard trainers for part-of-speech tagging, chunking and dependency parsing before neural methods. The structured variant generalizes the update from a single label to a whole output structure: decode the best sequence or tree under the current weights, and if it differs from the gold structure, add the gold features and subtract the predicted ones. The update is a difference of feature vectors and nothing else — no probabilities, no partition function.',
        where: [
          'Part-of-speech tagging and chunking with the averaged perceptron, the standard approach through the 2000s',
          'Transition-based dependency parsing, where the perceptron trains the action classifier',
          'Any structured prediction task where a decoder exists but a normalized probability is unaffordable',
          'Online learning over very high-dimensional sparse features, where only present features are ever touched',
        ],
        why: 'Text is the case that suits it: enormously high-dimensional, extremely sparse, and often close enough to separable that the algorithm behaves. The structured version’s real advantage is that it needs only a decoder and never a partition function, which is what made it trainable on problems where a conditional random field was not. It is superseded now — neural taggers and parsers are better, and the features here are hand-designed — but the training rule survives in structured settings where normalization is intractable.',
        featurization: [
          'Sparse indicator features, with only the present ones touched per update — this is where the O(nnz) cost profile pays',
          'Use the averaged perceptron rather than the plain one; the accuracy gap on tagging tasks is large and the cost is close to zero',
          'Feature hashing when the vocabulary is unbounded, which keeps the weight vector fixed-size on a stream',
        ],
        evaluation:
          'Token accuracy or labelled attachment score on a held-out split, and the mistake rate per epoch as the training diagnostic — a rate that plateaus above zero says the data is not separable under these features, which is information about the features rather than the trainer.',
        pitfalls: [
          'Skipping averaging, which leaves the model at whatever the final update produced — frequently a single odd sentence',
          'Assuming the structured update needs a probability; it needs a decoder, and conflating the two leads to an unnecessary and expensive model',
          'Ordering effects when sentences are not shuffled, since the algorithm is order-dependent by construction',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A pass over the data per epoch, touching only non-zero features, with no matrix operations at all. The cheapest trainable model in this section by a wide margin, and it needs no data resident — examples can stream past once and be discarded.',
    inferenceProfile:
      'A sparse dot product and a sign: nanoseconds, with a model that is one weight per feature. Small enough to embed anywhere, and updateable in place while serving, which is a property almost nothing else here has.',
    retrainingCadence:
      'Genuinely continuous. The update rule is defined on one example, so a deployed perceptron can learn from each new labelled instance as it arrives with no refit — the original motivation for the algorithm and still its clearest advantage.',
    driftAndMonitoring: [
      'Track the mistake rate per epoch or per window; a rate that stops falling means the data is not separable under the current features',
      'Watch the weight norm, which grows without bound on non-separable data and is the visible signature of the cycling failure',
      'Compare the averaged weights against the current ones — a large divergence means recent updates are unrepresentative',
      'Monitor the fraction of predictions near zero score, since the perceptron gives no confidence and that band is where it is guessing',
    ],
    productionGotchas: [
      'Labels must be -1 and +1, not 0 and 1; passing 0/1 does not error and silently optimizes something else',
      'The output is a sign, not a probability, and the raw score has no calibrated meaning — anything thresholding it as confidence is unfounded',
      'Use the averaged weights in production and the running weights for training; deploying the final weight vector means deploying whatever the last update did',
      'On non-separable data the weight norm grows every epoch, so a fixed epoch budget is a required stopping rule rather than a convenience',
      'Feature indices are part of the model: regenerating the vocabulary separately reindexes every weight',
    ],
  },

  assumptions: [
    'The classes are linearly separable in the given feature space — the convergence guarantee holds only here, and real data almost never satisfies it',
    'Features are scaled comparably, since the mistake bound is expressed through the data radius',
    'Labels are ±1, which the sign-based update requires',
    'Any separating hyperplane is acceptable, because the objective cannot distinguish between them — if the widest one is wanted, this is the wrong algorithm',
  ],

  pros: [
    {
      point: 'A mistake bound that depends only on geometry',
      context:
        'At most the squared ratio of data radius to margin, independent of sample size and dimension. A genuinely strong guarantee, and the appearance of the margin in it is the observation the SVM is built on.',
    },
    {
      point: 'Truly online: O(1) memory beyond the weights, and no stored data',
      context:
        'Learns from one example and discards it, which makes it deployable on an unbounded stream and updateable while serving. Almost nothing else in this section can be updated in place.',
    },
    {
      point: 'Touches only non-zero features',
      context:
        'O(nnz) per example rather than O(d) is why it stayed competitive on sparse high-dimensional text long after better models existed. Irrelevant on dense features, where it has no advantage at all.',
    },
    {
      point: 'Averaging turns it from unstable into reliable at almost no cost',
      context:
        'The averaged perceptron closes most of the accuracy gap to far more expensive methods on structured tasks. A rare case where a one-line change is most of the value.',
    },
  ],

  cons: [
    {
      point: 'Never converges on non-separable data, and does not say so',
      context:
        'The weight vector cycles indefinitely with no signal that anything is wrong. Since nearly all real data is non-separable, the guarantee that motivates the algorithm rarely applies to it.',
    },
    {
      point: 'Cannot represent XOR, or anything not linearly separable',
      context:
        'The limitation Minsky and Papert proved, and the reason the field stalled and then built multilayer networks. It is the whole motivation for the next entry rather than a footnote to this one.',
    },
    {
      point: 'No probabilities and no margin',
      context:
        'The output is a sign, and any separating boundary satisfies the objective, so which one you get depends on data order. Logistic regression gives probabilities and the SVM gives the widest margin — this gives neither.',
    },
    {
      point: 'Order-dependent and unstable',
      context:
        'Shuffle the data and get a different model. Averaging mitigates it substantially and does not remove it, and reproducibility requires pinning the shuffle.',
    },
  ],

  relatedSlugs: ['mlp', 'logistic-regression', 'support-vector-machine'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""The perceptron - mistake-driven updates, transcribed.

If the prediction is right, change nothing. If it is wrong, push the boundary
toward the answer by adding the example to the weights. That is the whole
algorithm, and it is also stochastic gradient descent on the criterion above -
decades before it was called that.
"""


def predict(weights, bias, x):
    """Sign of the score. NOT a probability - the magnitude means nothing."""
    score = bias
    for j in range(len(x)):
        score += weights[j] * x[j]
    return 1 if score > 0 else -1


def fit(X, y, learning_rate=1.0, epochs=20):
    """y must be in {-1, +1}: the update is built on the sign convention."""
    d = len(X[0])
    weights = [0.0] * d
    bias = 0.0

    for epoch in range(epochs):
        mistakes = 0

        for i in range(len(X)):
            # margin = y_i (w . x_i + b); at most zero means misclassified
            score = bias
            for j in range(d):
                score += weights[j] * X[i][j]
            margin = y[i] * score

            if margin <= 0.0:
                mistakes += 1
                for j in range(d):
                    weights[j] += learning_rate * y[i] * X[i][j]
                bias += learning_rate * y[i]

        # On separable data the mistakes stop and the algorithm terminates.
        # On non-separable data they never do - the weight vector cycles
        # forever, and nothing here reports that. The epoch budget is the
        # only thing that stops it.
        if mistakes == 0:
            return weights, bias, epoch + 1

    return weights, bias, epochs


def mistake_bound(X, margin):
    """(R / gamma)^2 - the theoretical bound, purely geometric.

    R is the largest example norm and gamma the margin of the best separating
    hyperplane. Note what is absent: the number of examples, and the number of
    features. Neither appears.
    """
    radius = 0.0
    for row in X:
        norm = sum(value * value for value in row) ** 0.5
        radius = max(radius, norm)
    return (radius / margin) ** 2`,
        profile: 'O(n*d) per epoch in interpreter loops, touching every feature of every example whether or not it is non-zero.',
      },
      'make-it-right': {
        code: `"""Averaged perceptron - typed, sparse, with the lazy averaging trick."""

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]


@dataclass
class AveragedPerceptron:
    """Returns the AVERAGE of every intermediate weight vector, not the last.

    The plain perceptron ends wherever its final update left it, which may
    have come from a single odd example. Averaging over the whole run closes
    most of the accuracy gap to far more expensive methods, and the naive
    implementation costs O(d) per example. The trick below makes it O(nnz)
    per MISTAKE instead, which is what makes averaging free enough to be the
    default rather than an option.
    """

    n_features: int
    weights: Vector = field(init=False)
    _totals: Vector = field(init=False)      # accumulated weights * time
    _stamps: NDArray = field(init=False)     # when each weight last changed
    _step: int = field(default=0, init=False)

    def __post_init__(self) -> None:
        if self.n_features < 1:
            raise ValueError(f"n_features must be at least 1, got {self.n_features}")
        self.weights = np.zeros(self.n_features, dtype=np.float64)
        self._totals = np.zeros(self.n_features, dtype=np.float64)
        self._stamps = np.zeros(self.n_features, dtype=np.int64)

    def score(self, indices: NDArray, values: Vector) -> float:
        """Sparse dot product: only present features are touched at all."""
        return float(self.weights[indices] @ values)

    def update(self, indices: NDArray, values: Vector, label: int) -> None:
        """One mistake-driven update, with averaging maintained lazily.

        Instead of adding the whole weight vector to a running total on every
        example, each coordinate carries the timestep it last changed. When it
        changes again, the intervening span is settled in one multiply - so
        the accumulated total stays exact while only touched coordinates are
        ever visited.
        """
        self._step += 1

        span = self._step - self._stamps[indices]
        self._totals[indices] += span * self.weights[indices]
        self._stamps[indices] = self._step

        self.weights[indices] += label * values

    def averaged(self) -> Vector:
        """Settle every coordinate to the current step, then average."""
        span = self._step - self._stamps
        return (self._totals + span * self.weights) / max(self._step, 1)


def fit(
    rows: list[tuple[NDArray, Vector]],
    labels: NDArray,
    n_features: int,
    epochs: int = 10,
    seed: int = 0,
) -> tuple[Vector, list[int]]:
    """Train on sparse rows. Raises ValueError on malformed input."""
    if len(rows) != labels.size:
        raise ValueError(f"{len(rows)} rows but {labels.size} labels")
    if not np.isin(labels, (-1, 1)).all():
        raise ValueError("labels must be -1 or +1; 0/1 silently optimizes something else")

    model = AveragedPerceptron(n_features=n_features)
    rng = np.random.default_rng(seed)
    order = np.arange(len(rows))
    history: list[int] = []

    for _ in range(epochs):
        # Order matters: the algorithm is order-dependent by construction, so
        # reshuffling each epoch is part of the method rather than hygiene.
        rng.shuffle(order)
        mistakes = 0

        for index in order:
            indices, values = rows[index]
            if labels[index] * model.score(indices, values) <= 0.0:
                model.update(indices, values, int(labels[index]))
                mistakes += 1

        history.append(mistakes)
        # A mistake count that stops falling means the data is not separable
        # under these features - which is information about the features.
        if mistakes == 0:
            break

    return model.averaged(), history`,
        rationale:
          'Two changes carry the value, and neither is about NumPy. Averaging replaces the final weight vector, which is the one-line change that turns an unstable estimator into a reliable one — the plain perceptron ends wherever its last update left it, frequently a single odd example. Implementing it naively costs O(d) per example, so the lazy trick keeps a per-coordinate timestamp and settles the intervening span only when a coordinate is touched, making averaging O(nnz) per mistake and therefore free enough to be the default. The representation also becomes sparse, so only present features are ever visited — which is the cost profile that kept this algorithm competitive on text.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(nnz) per example and O(nnz) per mistake for averaging, rather than O(d) for both.',
      },
      'make-it-fast': {
        code: `"""Perceptron - one contiguous CSR block, in-place scatter updates."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]


class CsrPerceptron:
    """Sparse rows in one flat block, not a list of arrays.

    The previous stage held each row as its own pair of arrays, which means a
    pointer chase and a bounds check per example. A CSR layout puts every
    index and value in one contiguous buffer, so a row is a slice and the
    whole dataset streams through cache in order.

    The algorithm itself stays sequential - each update depends on the
    boundary the previous updates produced, and no rewrite changes that. What
    is available is making every individual update as cheap as possible.
    """

    def __init__(self, n_features: int) -> None:
        # A single dtype throughout: float64 weights, int32 indices. Mixed
        # dtypes force a conversion on every gather.
        self._weights = np.zeros(n_features, dtype=np.float64)
        self._totals = np.zeros(n_features, dtype=np.float64)
        self._stamps = np.zeros(n_features, dtype=np.int64)
        self._step = 0
        # Scratch reused by every update rather than allocated per row.
        self._scratch = np.empty(n_features, dtype=np.float64)

    def fit(
        self,
        indptr: NDArray,
        indices: NDArray,
        values: Vector,
        labels: NDArray,
        epochs: int = 10,
        seed: int = 0,
    ) -> Vector:
        rng = np.random.default_rng(seed)
        order = np.arange(indptr.size - 1)

        for _ in range(epochs):
            rng.shuffle(order)
            mistakes = 0

            for row in order:
                start, stop = indptr[row], indptr[row + 1]
                cols = indices[start:stop]
                vals = values[start:stop]

                # Gather-and-dot over present features only. For a row with
                # 30 non-zeros out of a million features, this is 30 loads.
                if labels[row] * (self._weights[cols] @ vals) > 0.0:
                    continue

                self._step += 1
                mistakes += 1

                # Lazy averaging: settle only the coordinates being touched.
                span = self._step - self._stamps[cols]
                # In place, through a view rather than a temporary: at high
                # update rates these allocations dominate the arithmetic.
                np.multiply(span, self._weights[cols], out=self._scratch[: cols.size])
                np.add.at(self._totals, cols, self._scratch[: cols.size])
                self._stamps[cols] = self._step

                np.add.at(self._weights, cols, labels[row] * vals)

            if mistakes == 0:
                break

        span = self._step - self._stamps
        return (self._totals + span * self._weights) / max(self._step, 1)`,
        rationale:
          'The algorithm is irreducibly sequential — each update depends on the boundary the previous ones produced — so there is no parallelism to find, and the honest optimization is making each individual update as cheap as possible. Sparse rows move from a list of separate arrays into one contiguous CSR block, so a row is a slice rather than a pointer chase and the dataset streams through cache in order. The averaging scratch is allocated once and written through in place, because at high update rates the per-update temporaries dominate the actual arithmetic. Index and weight dtypes are pinned so no gather pays a conversion.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'One CSR block with int32 indices and float64 values means a row is a contiguous slice and every gather reads without a dtype conversion.',
            tradeoff: 'The matrix must be built up front in CSR form, which rules out the genuinely streaming use the perceptron is otherwise ideal for — an unbounded stream cannot be pre-assembled.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The averaging scratch is allocated once at full width and sliced per update, so a run with millions of updates allocates once rather than per update.',
            tradeoff: 'The scratch is shared mutable state, so the object is not reentrant, and slicing it to the row width relies on rows never exceeding the feature count — true here and unchecked.',
          },
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'The score is a gathered dot product over present features only, which for a 30-non-zero row in a million-feature space is 30 loads rather than a million.',
            tradeoff: 'A gather-and-dot is memory-bound and irregular, so it gets none of the throughput a dense BLAS call would — the win is asymptotic, from touching less, not from faster arithmetic.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(nnz) per example with one contiguous pass over the dataset per epoch. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// The perceptron - mistake-driven updates, transcribed.
#include <cstddef>
#include <vector>

// Sign of the score. NOT a probability - the magnitude means nothing.
int Predict(const std::vector<double>& weights, double bias,
            const std::vector<double>& x) {
  double score = bias;
  for (std::size_t j = 0; j < x.size(); ++j) score += weights[j] * x[j];
  return score > 0.0 ? 1 : -1;
}

// y must be in {-1, +1}: the update is built on the sign convention.
int Fit(const std::vector<std::vector<double>>& X, const std::vector<int>& y,
        double learning_rate, int epochs, std::vector<double>& weights, double& bias) {
  const std::size_t d = X[0].size();
  weights.assign(d, 0.0);
  bias = 0.0;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    int mistakes = 0;

    for (std::size_t i = 0; i < X.size(); ++i) {
      // margin = y_i (w . x_i + b); at most zero means misclassified
      double score = bias;
      for (std::size_t j = 0; j < d; ++j) score += weights[j] * X[i][j];
      const double margin = static_cast<double>(y[i]) * score;

      if (margin <= 0.0) {
        ++mistakes;
        for (std::size_t j = 0; j < d; ++j) {
          weights[j] += learning_rate * static_cast<double>(y[i]) * X[i][j];
        }
        bias += learning_rate * static_cast<double>(y[i]);
      }
    }

    // On separable data the mistakes stop and the algorithm terminates. On
    // non-separable data they never do - the weight vector cycles forever,
    // and nothing here reports it. The epoch budget is the only stopping rule.
    if (mistakes == 0) return epoch + 1;
  }

  return epochs;
}`,
        profile: 'O(n*d) per epoch, touching every feature of every example whether or not it is non-zero, over a nested vector that scatters rows.',
      },
      'make-it-right': {
        code: `// Averaged perceptron - CSR rows, lazy averaging, RAII, fails fast.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// CSR: row r occupies indices[indptr[r], indptr[r+1]) and the matching values.
struct SparseRows {
  std::vector<std::size_t> indptr;
  std::vector<std::int32_t> indices;
  std::vector<double> values;

  [[nodiscard]] std::size_t Rows() const noexcept { return indptr.size() - 1; }

  [[nodiscard]] std::pair<std::span<const std::int32_t>, std::span<const double>> Row(
      std::size_t index) const {
    const std::size_t start = indptr[index];
    const std::size_t count = indptr[index + 1] - start;
    return {std::span<const std::int32_t>(indices.data() + start, count),
            std::span<const double>(values.data() + start, count)};
  }
};

// Returns the AVERAGE of every intermediate weight vector, not the last.
//
// The plain perceptron ends wherever its final update left it, which may have
// come from a single odd example. Averaging closes most of the accuracy gap to
// far more expensive methods, and the naive implementation costs O(d) per
// example. The timestamp trick below makes it O(nnz) per MISTAKE instead,
// which is what makes averaging cheap enough to be the default.
class AveragedPerceptron {
 public:
  explicit AveragedPerceptron(std::size_t n_features)
      : weights_(n_features, 0.0), totals_(n_features, 0.0), stamps_(n_features, 0) {
    if (n_features == 0) throw std::invalid_argument("n_features must be at least 1");
  }

  // Sparse dot product: only present features are touched at all.
  [[nodiscard]] double Score(std::span<const std::int32_t> indices,
                             std::span<const double> values) const {
    double total = 0.0;
    for (std::size_t e = 0; e < indices.size(); ++e) {
      total += weights_[static_cast<std::size_t>(indices[e])] * values[e];
    }
    return total;
  }

  void Update(std::span<const std::int32_t> indices, std::span<const double> values,
              int label) {
    ++step_;

    for (std::size_t e = 0; e < indices.size(); ++e) {
      const auto j = static_cast<std::size_t>(indices[e]);
      // Settle the span since this coordinate last changed, in one multiply.
      totals_[j] += static_cast<double>(step_ - stamps_[j]) * weights_[j];
      stamps_[j] = step_;
      weights_[j] += static_cast<double>(label) * values[e];
    }
  }

  [[nodiscard]] std::vector<double> Averaged() const {
    std::vector<double> out(weights_.size(), 0.0);
    for (std::size_t j = 0; j < weights_.size(); ++j) {
      out[j] = (totals_[j] + static_cast<double>(step_ - stamps_[j]) * weights_[j]) /
               static_cast<double>(step_ > 0 ? step_ : 1);
    }
    return out;
  }

 private:
  std::vector<double> weights_;
  std::vector<double> totals_;      // accumulated weights * time
  std::vector<std::int64_t> stamps_;  // when each coordinate last changed
  std::int64_t step_ = 0;
};

std::vector<double> Fit(const SparseRows& rows, std::span<const int> labels,
                        std::size_t n_features, int epochs, unsigned seed) {
  if (labels.size() != rows.Rows()) {
    throw std::invalid_argument("rows and labels describe different counts");
  }
  for (const int label : labels) {
    if (label != 1 && label != -1) {
      throw std::invalid_argument("labels must be -1 or +1; 0/1 optimizes something else");
    }
  }

  AveragedPerceptron model(n_features);
  std::vector<std::size_t> order(rows.Rows());
  std::iota(order.begin(), order.end(), 0);
  std::mt19937 generator(seed);

  for (int epoch = 0; epoch < epochs; ++epoch) {
    // Order matters: the algorithm is order-dependent by construction, so
    // reshuffling each epoch is part of the method rather than hygiene.
    std::shuffle(order.begin(), order.end(), generator);
    int mistakes = 0;

    for (const std::size_t row : order) {
      const auto [indices, values] = rows.Row(row);
      if (static_cast<double>(labels[row]) * model.Score(indices, values) > 0.0) continue;

      model.Update(indices, values, labels[row]);
      ++mistakes;
    }

    // A mistake count that stops falling means the data is not separable
    // under these features - information about the features, not the trainer.
    if (mistakes == 0) break;
  }

  return model.Averaged();
}`,
        rationale:
          'Averaging replaces the final weight vector, which is the change that turns an unstable estimator into a reliable one — and the timestamp trick keeps it affordable, settling each coordinate’s intervening span only when that coordinate is touched, so averaging costs O(nnz) per mistake rather than O(d) per example. Storage moves to CSR so only present features are ever visited, which is the cost profile that kept this algorithm competitive on sparse text. Labels are validated as ±1 before any work, since 0/1 does not error anywhere and silently optimizes a different objective.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(nnz) per example and O(nnz) per mistake for averaging, over one contiguous CSR block.',
      },
      'make-it-fast': {
        code: `// Perceptron - iterative parameter mixing across shards.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

// A single perceptron run is irreducibly sequential: each update depends on
// the boundary the previous updates produced, and no rewrite changes that.
//
// What IS parallel is a published training strategy rather than an
// implementation trick. Iterative parameter mixing shards the data, trains an
// independent perceptron on each shard, averages the resulting weight vectors,
// and repeats from the averaged start. It is not equivalent to sequential
// training - it is a different algorithm with its own convergence argument -
// and it is what makes the perceptron trainable on data that does not fit on
// one machine.
struct Shard {
  std::span<const std::size_t> indptr;
  std::span<const std::int32_t> indices;
  std::span<const double> values;
  std::span<const int> labels;
};

// __restrict tells the compiler the weights and the sparse arrays cannot
// alias, which lets it keep the running score in a register across the gather
// loop rather than reloading after every write elsewhere.
double ScoreRow(const double* __restrict weights, const std::int32_t* __restrict indices,
                const double* __restrict values, std::size_t count) {
  double total = 0.0;
  for (std::size_t e = 0; e < count; ++e) {
    total += weights[static_cast<std::size_t>(indices[e])] * values[e];
  }
  return total;
}

// One shard, one epoch, starting from the mixed weights.
std::vector<double> TrainShard(const Shard& shard, const std::vector<double>& start,
                               int epochs) {
  std::vector<double> weights = start;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    for (std::size_t row = 0; row + 1 < shard.indptr.size(); ++row) {
      const std::size_t begin = shard.indptr[row];
      const std::size_t count = shard.indptr[row + 1] - begin;

      const double score = ScoreRow(weights.data(), shard.indices.data() + begin,
                                    shard.values.data() + begin, count);
      if (static_cast<double>(shard.labels[row]) * score > 0.0) continue;

      for (std::size_t e = 0; e < count; ++e) {
        weights[static_cast<std::size_t>(shard.indices[begin + e])] +=
            static_cast<double>(shard.labels[row]) * shard.values[begin + e];
      }
    }
  }

  return weights;
}

std::vector<double> FitMixed(const std::vector<Shard>& shards, std::size_t n_features,
                             int rounds, int epochs_per_round) {
  std::vector<double> mixed(n_features, 0.0);
  std::vector<std::vector<double>> per_shard(shards.size());

  for (int round = 0; round < rounds; ++round) {
    // Shards are independent within a round: each reads the same starting
    // weights and writes only its own result slot.
#pragma omp parallel for schedule(static)
    for (std::size_t s = 0; s < shards.size(); ++s) {
      per_shard[s] = TrainShard(shards[s], mixed, epochs_per_round);
    }

    // Mix: the plain average of the shard weight vectors.
    std::fill(mixed.begin(), mixed.end(), 0.0);
    for (const std::vector<double>& weights : per_shard) {
      for (std::size_t j = 0; j < n_features; ++j) mixed[j] += weights[j];
    }
    const double scale = 1.0 / static_cast<double>(shards.size());
    for (double& value : mixed) value *= scale;
  }

  return mixed;
}`,
        rationale:
          'A single perceptron run cannot be parallelized — each update depends on the boundary the previous ones produced — so the speedup comes from a different training strategy rather than a faster implementation of the same one. Iterative parameter mixing shards the data, trains an independent perceptron per shard, averages the weight vectors, and repeats from the averaged start. That is honestly a different algorithm with its own convergence argument, not an equivalent rewrite, and stating it that way matters: it is what makes the perceptron trainable on data that does not fit on one machine, and it does not reproduce the sequential result.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Within a mixing round each shard reads the same starting weights and writes only its own output slot, so the round is a fork-join with no synchronization.',
            tradeoff: 'This changes the algorithm rather than speeding one up: the mixed result is not what sequential training would produce, and more shards means more averaging and slower convergence per round.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'CSR keeps each row’s indices and values adjacent, so a shard streams through its slice of one contiguous block in order.',
            tradeoff: 'The weight gather is still a random scatter into a large array, which is the actual bottleneck — contiguity helps the row side only, and a high-dimensional weight vector will miss cache regardless.',
          },
          {
            technique: 'Restrict/aliasing hints so the compiler can vectorize',
            why: 'Without them the compiler must assume the weight array may alias the index and value arrays and reload the accumulator after every iteration of the gather loop.',
            tradeoff: '__restrict is an unchecked promise, and a gather cannot vectorize regardless of aliasing — the gain is keeping the accumulator in a register, not SIMD.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(nnz / shards) per round, with rounds needed rising as shards do. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! The perceptron - mistake-driven updates, transcribed.

/// Sign of the score. NOT a probability - the magnitude means nothing.
pub fn predict(weights: &[f64], bias: f64, x: &[f64]) -> i32 {
    let mut score = bias;
    for j in 0..x.len() {
        score += weights[j] * x[j];
    }
    if score > 0.0 { 1 } else { -1 }
}

/// y must be in {-1, +1}: the update is built on the sign convention.
pub fn fit(
    x: &[Vec<f64>],
    y: &[i32],
    learning_rate: f64,
    epochs: usize,
) -> (Vec<f64>, f64, usize) {
    let d = x[0].len();
    let mut weights = vec![0.0; d];
    let mut bias = 0.0;

    for epoch in 0..epochs {
        let mut mistakes = 0;

        for i in 0..x.len() {
            // margin = y_i (w . x_i + b); at most zero means misclassified
            let mut score = bias;
            for j in 0..d {
                score += weights[j] * x[i][j];
            }
            let margin = y[i] as f64 * score;

            if margin <= 0.0 {
                mistakes += 1;
                for j in 0..d {
                    weights[j] += learning_rate * y[i] as f64 * x[i][j];
                }
                bias += learning_rate * y[i] as f64;
            }
        }

        // On separable data the mistakes stop and the algorithm terminates.
        // On non-separable data they never do - the weight vector cycles
        // forever, and nothing here reports it. The epoch budget is the only
        // stopping rule.
        if mistakes == 0 {
            return (weights, bias, epoch + 1);
        }
    }

    (weights, bias, epochs)
}

/// (R / gamma)^2 - the theoretical bound, purely geometric.
///
/// R is the largest example norm and gamma the margin of the best separating
/// hyperplane. Note what is absent: the number of examples, and the number of
/// features. Neither appears.
pub fn mistake_bound(x: &[Vec<f64>], margin: f64) -> f64 {
    let radius = x
        .iter()
        .map(|row| row.iter().map(|v| v * v).sum::<f64>().sqrt())
        .fold(0.0_f64, f64::max);
    (radius / margin).powi(2)
}`,
        profile: 'O(n*d) per epoch with every index bounds-checked, touching every feature whether or not it is non-zero.',
      },
      'make-it-right': {
        code: `//! Averaged perceptron - typed errors, CSR rows, lazy averaging.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum PerceptronError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    Labels { index: usize },
    FeatureOutOfRange { index: usize, limit: usize },
}

impl fmt::Display for PerceptronError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero features"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} labels, found {found}")
            }
            Self::Labels { index } => write!(
                f,
                "label at {index} is not -1 or +1; 0/1 silently optimizes something else"
            ),
            Self::FeatureOutOfRange { index, limit } => {
                write!(f, "feature index {index} outside 0..{limit}")
            }
        }
    }
}

impl std::error::Error for PerceptronError {}

/// A class label. A newtype because the sign convention is load-bearing:
/// 0/1 labels do not error anywhere and produce a model that trains happily
/// and classifies wrongly.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Sign(i8);

impl Sign {
    pub fn new(value: i32, index: usize) -> Result<Self, PerceptronError> {
        match value {
            1 => Ok(Self(1)),
            -1 => Ok(Self(-1)),
            _ => Err(PerceptronError::Labels { index }),
        }
    }

    #[must_use]
    pub fn as_f64(self) -> f64 {
        f64::from(self.0)
    }
}

/// CSR: row r occupies indices[indptr[r]..indptr[r + 1]] and the matching
/// values. Only present features are ever touched.
pub struct SparseRows {
    pub indptr: Vec<usize>,
    pub indices: Vec<u32>,
    pub values: Vec<f64>,
}

impl SparseRows {
    #[must_use]
    pub fn rows(&self) -> usize {
        self.indptr.len() - 1
    }

    #[inline]
    fn row(&self, index: usize) -> (&[u32], &[f64]) {
        let start = self.indptr[index];
        let stop = self.indptr[index + 1];
        (&self.indices[start..stop], &self.values[start..stop])
    }
}

/// Returns the AVERAGE of every intermediate weight vector, not the last.
///
/// The plain perceptron ends wherever its final update left it, which may have
/// come from a single odd example. Averaging closes most of the accuracy gap
/// to far more expensive methods, and the naive implementation costs O(d) per
/// example. The timestamp trick makes it O(nnz) per MISTAKE instead, which is
/// what makes averaging cheap enough to be the default rather than an option.
pub struct AveragedPerceptron {
    weights: Vec<f64>,
    totals: Vec<f64>,   // accumulated weights * time
    stamps: Vec<u64>,   // when each coordinate last changed
    step: u64,
}

impl AveragedPerceptron {
    pub fn new(n_features: usize) -> Result<Self, PerceptronError> {
        if n_features == 0 {
            return Err(PerceptronError::Empty);
        }
        Ok(Self {
            weights: vec![0.0; n_features],
            totals: vec![0.0; n_features],
            stamps: vec![0; n_features],
            step: 0,
        })
    }

    /// Sparse dot product: only present features are touched at all.
    #[inline]
    #[must_use]
    pub fn score(&self, indices: &[u32], values: &[f64]) -> f64 {
        indices
            .iter()
            .zip(values)
            .map(|(&j, value)| self.weights[j as usize] * value)
            .sum()
    }

    fn update(&mut self, indices: &[u32], values: &[f64], label: Sign) {
        self.step += 1;

        for (&j, value) in indices.iter().zip(values) {
            let slot = j as usize;
            // Settle the span since this coordinate last changed, in one
            // multiply, rather than touching every coordinate every example.
            self.totals[slot] += (self.step - self.stamps[slot]) as f64 * self.weights[slot];
            self.stamps[slot] = self.step;
            self.weights[slot] += label.as_f64() * value;
        }
    }

    #[must_use]
    pub fn averaged(&self) -> Vec<f64> {
        let divisor = self.step.max(1) as f64;
        self.weights
            .iter()
            .zip(&self.totals)
            .zip(&self.stamps)
            .map(|((weight, total), stamp)| {
                (total + (self.step - stamp) as f64 * weight) / divisor
            })
            .collect()
    }
}

pub fn fit(
    rows: &SparseRows,
    labels: &[i32],
    n_features: usize,
    epochs: usize,
    seed: u64,
) -> Result<(Vec<f64>, Vec<usize>), PerceptronError> {
    if labels.len() != rows.rows() {
        return Err(PerceptronError::ShapeMismatch {
            expected: rows.rows(),
            found: labels.len(),
        });
    }
    if let Some(&index) = rows.indices.iter().find(|&&j| j as usize >= n_features) {
        return Err(PerceptronError::FeatureOutOfRange {
            index: index as usize,
            limit: n_features,
        });
    }

    let signs: Vec<Sign> = labels
        .iter()
        .enumerate()
        .map(|(index, &value)| Sign::new(value, index))
        .collect::<Result<_, _>>()?;

    let mut model = AveragedPerceptron::new(n_features)?;
    let mut order: Vec<usize> = (0..rows.rows()).collect();
    let mut state = seed | 1;
    let mut history = Vec::with_capacity(epochs);

    for _ in 0..epochs {
        // Order matters: the algorithm is order-dependent by construction, so
        // reshuffling each epoch is part of the method rather than hygiene.
        for position in (1..order.len()).rev() {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1);
            order.swap(position, (state >> 33) as usize % (position + 1));
        }

        let mut mistakes = 0;
        for &row in &order {
            let (indices, values) = rows.row(row);
            if signs[row].as_f64() * model.score(indices, values) > 0.0 {
                continue;
            }
            model.update(indices, values, signs[row]);
            mistakes += 1;
        }

        history.push(mistakes);
        // A mistake count that stops falling means the data is not separable
        // under these features - information about the features, not the
        // trainer.
        if mistakes == 0 {
            break;
        }
    }

    Ok((model.averaged(), history))
}
`,
        rationale:
          'Averaging replaces the final weight vector — the change that turns an unstable estimator into a reliable one — and the timestamp trick keeps it affordable at O(nnz) per mistake rather than O(d) per example. Storage becomes CSR so only present features are visited. Errors become a typed Result covering the out-of-range feature index the previous stage would have indexed straight past, and the label gets a newtype, because the ±1 convention is load-bearing: 0/1 labels do not error anywhere and produce a model that trains happily and classifies wrongly.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(nnz) per example and O(nnz) per mistake for averaging, over one contiguous CSR block.',
      },
      'make-it-fast': {
        code: `//! Perceptron - iterative parameter mixing across shards.

use rayon::prelude::*;

/// A single perceptron run is irreducibly sequential: each update depends on
/// the boundary the previous updates produced, and no rewrite changes that.
///
/// What IS parallel is a published training STRATEGY rather than an
/// implementation trick. Iterative parameter mixing shards the data, trains an
/// independent perceptron on each shard, averages the resulting weight
/// vectors, and repeats from the averaged start.
///
/// It is not equivalent to sequential training - it is a different algorithm
/// with its own convergence argument - and saying so matters, because it is
/// what makes the perceptron trainable on data that does not fit on one
/// machine, and it does not reproduce the sequential result.
pub struct Shard<'a> {
    pub indptr: &'a [usize],
    pub indices: &'a [u32],
    pub values: &'a [f64],
    pub labels: &'a [f64],
}

impl Shard<'_> {
    #[inline]
    fn row(&self, index: usize) -> (&[u32], &[f64]) {
        let start = self.indptr[index];
        let stop = self.indptr[index + 1];
        (&self.indices[start..stop], &self.values[start..stop])
    }

    /// One shard, several epochs, starting from the mixed weights.
    fn train(&self, start: &[f64], epochs: usize) -> Vec<f64> {
        let mut weights = Vec::with_capacity(start.len());
        weights.extend_from_slice(start);

        for _ in 0..epochs {
            for row in 0..(self.indptr.len() - 1) {
                let (indices, values) = self.row(row);

                let score: f64 = indices
                    .iter()
                    .zip(values)
                    .map(|(&j, value)| weights[j as usize] * value)
                    .sum();

                if self.labels[row] * score > 0.0 {
                    continue;
                }

                for (&j, value) in indices.iter().zip(values) {
                    weights[j as usize] += self.labels[row] * value;
                }
            }
        }

        weights
    }
}

/// Shards are independent within a round: each reads the same starting weights
/// and produces its own result, which is a pure parallel map.
#[must_use]
pub fn fit_mixed(
    shards: &[Shard<'_>],
    n_features: usize,
    rounds: usize,
    epochs_per_round: usize,
) -> Vec<f64> {
    let mut mixed = vec![0.0_f64; n_features];

    for _ in 0..rounds {
        let per_shard: Vec<Vec<f64>> = shards
            .par_iter()
            .map(|shard| shard.train(&mixed, epochs_per_round))
            .collect();

        // Mix: the plain average of the shard weight vectors. This is the
        // step that makes the result different from sequential training.
        mixed.iter_mut().for_each(|value| *value = 0.0);
        for weights in &per_shard {
            for (slot, value) in mixed.iter_mut().zip(weights) {
                *slot += value;
            }
        }
        let scale = 1.0 / shards.len() as f64;
        mixed.iter_mut().for_each(|value| *value *= scale);
    }

    mixed
}
`,
        rationale:
          'A single perceptron run cannot be parallelized, because each update depends on the boundary the previous ones produced — so the speedup comes from a different training strategy rather than a faster implementation of the same one. Iterative parameter mixing shards the data, trains an independent perceptron per shard, averages the weight vectors, and repeats from the averaged start. That is a different algorithm with its own convergence argument rather than an equivalent rewrite, and the doc comment says so: it is what makes the perceptron trainable on data that does not fit on one machine, and it does not reproduce the sequential result.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Within a mixing round each shard reads the same immutable starting weights and produces its own vector, so the round is a parallel map with no locking.',
            tradeoff: 'This changes the algorithm rather than accelerating one — the mixed result differs from sequential training, and more shards means more averaging and more rounds to converge.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'CSR keeps a row’s indices and values adjacent, so each shard streams its slice of one contiguous block in order rather than chasing per-row allocations.',
            tradeoff: 'The weight update is still a scatter into a large array, which is the real bottleneck — contiguity helps the row side only, and a high-dimensional weight vector misses cache regardless.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'Each shard clones the starting weights into a buffer sized exactly once, so the per-round copy is never grown.',
            tradeoff: 'One full weight-vector copy per shard per round is inherent to the strategy — with a million-feature model and many shards, that copy is a real memory cost the sequential version does not pay.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(nnz / shards) per round, with rounds rising as shards do. Illustrative, not a measured benchmark.',
      },
    },
  },
};
