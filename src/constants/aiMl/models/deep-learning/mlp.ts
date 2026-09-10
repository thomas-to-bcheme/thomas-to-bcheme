import type { AiMlModel } from '../../types';

/**
 * Multilayer Perceptron — the substrate every other architecture is a
 * constraint on.
 *
 * Follows perceptron as the direct answer to its limitation: stack layers with
 * a nonlinearity between them and the XOR problem disappears. It is the most
 * general neural form there is — no structural prior at all, every input
 * connected to every unit — and everything later in this category is this with
 * an assumption added, which is why the entries that follow are usually more
 * accurate on their own domain and this one is more accurate on none.
 */
export const MLP: AiMlModel = {
  slug: 'mlp',
  name: 'Multilayer Perceptron',
  aliases: ['MLP', 'Feedforward network', 'Fully-connected network', 'Dense network', 'Backpropagation'],
  category: 'deep-learning',
  group: 'foundations',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression'],
  architecture: 'feedforward',
  paradigmNote:
    'Supervised here, though the same architecture appears throughout the category under other paradigms — as the encoder in a self-supervised objective, as the policy network in reinforcement learning, as the expert inside a mixture. What is fixed is the computation, not the way it is trained.',

  intuition:
    'A single linear layer can only draw a straight boundary. Put two of them back to back with a nonlinearity in between and the first layer can bend the space before the second one cuts it — which is enough to separate things no straight line could. Stack more and each layer works on features the previous one built rather than on the raw input. Training runs the network forward to see how wrong it is, then walks the error backwards through the layers, and at each step the chain rule says how much each weight contributed. Backpropagation is exactly that: the chain rule, with the shared intermediate results computed once instead of once per weight.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        'J(\\theta) = \\frac{1}{n}\\sum_{i=1}^{n} \\mathcal{L}\\left(f_\\theta(\\mathbf{x}_i), y_i\\right) + \\lambda \\lVert \\theta \\rVert_2^2, \\qquad f_\\theta(\\mathbf{x}) = W_L\\,\\sigma\\!\\left(\\cdots \\sigma(W_1\\mathbf{x} + \\mathbf{b}_1)\\cdots\\right) + \\mathbf{b}_L',
      symbols: [
        { symbol: '\\sigma', meaning: 'the nonlinearity — remove it and the whole stack collapses to a single linear layer, which is the entire reason it is there' },
        { symbol: 'W_l, \\mathbf{b}_l', meaning: 'weights and bias of layer l; every input connects to every unit, which is what "no structural prior" means' },
        { symbol: '\\mathcal{L}', meaning: 'cross-entropy for classification, squared error for regression — the architecture does not change with it' },
        { symbol: '\\lambda \\lVert \\theta \\rVert_2^2', meaning: 'weight decay; one of several regularizers, and the least effective of them on its own' },
      ],
    },
    reading:
      'Average the loss over the data and add a price on weight size. The composition beneath it is where the content is: alternating linear maps and elementwise nonlinearities, and the nonlinearity is load-bearing in a way that is easy to miss — without it, a product of matrices is a matrix, and a hundred layers compute exactly what one does. The objective is non-convex, so there is no unique solution and no guarantee of finding the best one. That sounds worse than it is: in high dimensions almost all critical points turn out to be saddles rather than poor local minima, which is a large part of why training deep networks works at all.',
  },

  optimization: {
    method: 'Mini-batch stochastic gradient descent with backpropagation; Adam or SGD with momentum in practice',
    updateRule: {
      formula:
        '\\delta^{(L)} = \\nabla_{\\mathbf{a}}\\mathcal{L} \\odot \\sigma^{\\prime}\\!\\left(\\mathbf{z}^{(L)}\\right), \\quad \\delta^{(l)} = \\left(W_{l+1}^{\\top}\\delta^{(l+1)}\\right) \\odot \\sigma^{\\prime}\\!\\left(\\mathbf{z}^{(l)}\\right), \\quad \\nabla_{W_l}\\mathcal{L} = \\delta^{(l)}\\mathbf{a}^{(l-1)\\top}',
      symbols: [
        { symbol: '\\delta^{(l)}', meaning: 'the error signal at layer l — how much the loss changes with that layer’s pre-activation' },
        { symbol: 'W_{l+1}^{\\top}\\delta^{(l+1)}', meaning: 'the error propagated backwards through the next layer’s weights; this is the whole of backpropagation' },
        { symbol: '\\odot', meaning: 'elementwise product with the activation derivative — the gate that stops the signal where the unit was saturated' },
        { symbol: '\\mathbf{a}^{(l-1)}', meaning: 'the activation coming in, saved during the forward pass because the backward pass needs it' },
      ],
    },
    rationale:
      'Backpropagation is the chain rule with the shared intermediate results computed once instead of once per parameter, which is what makes gradients affordable — reverse-mode automatic differentiation costs roughly one forward pass regardless of how many parameters there are. The forward activations must be kept for the backward pass, and that memory, not the arithmetic, is what usually limits batch size. Three choices matter more than the optimizer. The activation function: ReLU replaced sigmoid because a saturated sigmoid has a near-zero derivative and the delta above is multiplied by it at every layer, so the signal vanishes with depth. Initialization: scaling the initial weights by fan-in — Xavier or He — is what keeps activations from exploding or collapsing through the stack, and getting it wrong makes a deep network untrainable rather than merely slow. And normalization between layers, which flattens the loss surface enough that a larger learning rate becomes usable.',
    hyperparameters: [
      { name: 'depth and width', role: 'The capacity dial. Depth is exponentially more parameter-efficient than width for some functions, and also harder to optimize', typicalRange: '2 to 5 hidden layers for tabular data; wider tends to be safer than deeper here' },
      { name: 'learning rate', role: 'The single most consequential setting. Too large diverges, too small never arrives, and the usable range spans orders of magnitude', typicalRange: '1e-4 to 1e-2 with Adam, higher with SGD plus momentum and a schedule' },
      { name: 'batch size', role: 'Gradient noise versus throughput. Small batches regularize and large ones use hardware better, and the interaction with the learning rate is strong', typicalRange: '32 to 1024; scale the learning rate with it' },
      { name: 'activation', role: 'ReLU by default, with GELU or SiLU in transformers. The choice is about gradient flow rather than expressiveness' },
      { name: 'initialization', role: 'He for ReLU, Xavier for tanh. Not a refinement — the wrong scale makes a deep network untrainable from the first step' },
      { name: 'regularization', role: 'Weight decay, dropout, early stopping. Early stopping is usually the most effective and the least discussed' },
    ],
    convergence:
      'Non-convex, so nothing is guaranteed, and in practice it usually works — the reason being that in high dimensions the critical points a gradient method encounters are overwhelmingly saddles rather than bad minima, and stochastic gradients escape saddles readily. The named failure modes are about gradient flow rather than optimality. Vanishing gradients: with a saturating activation the delta is multiplied by a small derivative at every layer, so deep stacks receive nothing at the front — the problem ReLU and residual connections exist to solve. Exploding gradients: the same product in the other direction, addressed by clipping. Dead ReLUs: a unit pushed permanently negative has zero gradient for ever and never recovers. And a learning rate slightly too high produces a loss that decreases and then diverges, often after appearing to train fine for a while.',
    complexity:
      'Forward: O(batch · sum of layer products), which is a sequence of matrix multiplications and is what GPUs exist for. Backward: roughly twice the forward cost. Memory: O(batch · sum of layer widths) for the stored activations, and that is what caps batch size rather than parameter count. Inference is one forward pass and a small fraction of training cost per example, which is why a model expensive to train can be cheap to serve.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'viable',
        how: 'The same lagged supervised table any regressor would use, fed to a dense network. It learns interactions between lags and drivers without being told they exist, and a single network can be trained across many series at once — a global model — which is how the recent forecasting competitions were won, though usually by architectures with more structure than this one.',
        where: [
          'Global models trained across thousands of series, where cross-series learning is worth more than per-series tailoring',
          'Multi-horizon forecasting with a vector output, producing all horizons in one pass rather than recursing',
          'The neural baseline that shows whether the extra structure of a recurrent or attention model is earning anything',
          'Problems with many exogenous drivers whose interactions matter',
        ],
        why: 'Its advantages here are cross-series learning and interaction discovery, both real. Its disadvantage is the one that defines the whole entry: no structural prior, so nothing about it knows that inputs are ordered in time. Lag features supply that ordering by hand, and an architecture that encodes it — a convolution, a recurrence, attention — gets the same information for far fewer parameters. On a single ordinary series with a few hundred observations this loses to exponential smoothing outright, and the honest reason is sample size rather than architecture.',
        featurization: [
          'Scale inputs and targets: unlike a tree, a dense network is entirely sensitive to feature scale and will not train well without it',
          'Detrend or difference, since the network extrapolates a fitted shape rather than a trend and does so unpredictably',
          'Encode calendar structure explicitly — cyclical sine and cosine features rather than raw indices, which the network would otherwise have to learn from scratch',
          'Train across series with a series embedding, which is what makes the global approach outperform per-series fits',
        ],
        evaluation:
          'Rolling-origin backtesting with MASE against seasonal-naive, and against exponential smoothing specifically — the neural model must beat the simple one to justify its cost, and on many business series it does not.',
        pitfalls: [
          'Shuffled validation splits, which leak the future and make every number meaningless',
          'Scaling statistics computed on the full series before splitting — the most common leak in neural forecasting',
          'Extrapolation: the network has no notion of trend and its behaviour outside the training range is arbitrary rather than merely wrong',
          'Comparing against a weak baseline, which is how most neural forecasting results are made to look good',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'A supervised dense network needs labelled examples of both classes and has no notion of density or reconstruction; using one for anomaly detection means either ordinary rare-class classification or the autoencoder, which is a different architecture with a different objective.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Two roles, neither of them as a solver. As a differentiable surrogate: when the true objective is expensive to evaluate — a simulation, a physical experiment — fit a network to the evaluations you have and optimize the network instead, using its gradients directly. And as a learned heuristic: train a network to propose good starting points or branching decisions for a classical solver, which keeps the solver’s guarantees while shortening its search.',
        where: [
          'Surrogate modelling for expensive simulations, where gradients through the surrogate replace derivative-free search',
          'Learned heuristics inside branch-and-bound and routing solvers, where the network proposes and the solver verifies',
          'Differentiable relaxations of discrete decisions, which make an end-to-end gradient possible where the true problem has none',
          'Amortized optimization: train once to map a problem instance directly to a solution, trading exactness for microsecond inference',
        ],
        why: 'A network can approximate an objective that has no closed form and supply gradients for it, which is genuinely useful when evaluation is the bottleneck. What it fundamentally cannot do is guarantee constraint satisfaction — there is no mechanism in a dense network that enforces a hard constraint, and a proposed solution can be infeasible with no indication. That is why in any setting where feasibility is non-negotiable it belongs inside the loop, proposing and being checked, rather than replacing the solver. When the objective is cheap to evaluate, this apparatus buys nothing over direct search.',
        featurization: [
          'Scale decision variables to a common range, since the network is sensitive to input scale in a way a solver is not',
          'Encode constraints as inputs or penalties, and verify feasibility outside the network — a penalty discourages violation and does not prevent it',
          'Train on the distribution of instances actually encountered; a surrogate is only valid where it was fitted, and optimizers seek out exactly the regions where it is extrapolating',
        ],
        evaluation:
          'Evaluate the decision against a classical solver on the same instances — objective value achieved and feasibility rate, not surrogate accuracy. A surrogate with low error that leads the optimizer into an infeasible region has failed at the only thing that mattered.',
        pitfalls: [
          'The optimizer exploiting the surrogate where it is wrong, which is not an edge case but the expected behaviour of an optimizer',
          'Treating penalty terms as constraints, so a returned solution is infeasible and nothing says so',
          'Extrapolation outside the training distribution, where a dense network’s output is arbitrary rather than approximately right',
        ],
      },
    },
    breadth: {
      'recommendation-ranking': {
        fit: 'primary',
        how: 'The dense stack that sits on top of learned embeddings. Categorical identifiers — user, item, context — become embedding vectors, those are concatenated with dense features, and an MLP maps the result to a score. That is the shape of essentially every deep recommender: the embeddings carry the identities and the dense layers learn the interactions between them.',
        where: [
          'The scoring tower of a two-stage recommender, where a ranker refines candidates from a cheaper retrieval step',
          'Click-through and conversion prediction, where feature interactions carry most of the signal',
          'Deep learning recommendation models, where the MLP is the interaction layer over embedded features',
          'Multi-task heads that predict several objectives — click, purchase, dwell — from a shared representation',
        ],
        why: 'It is the natural fit because the problem is genuinely about interactions between heterogeneous features, and that is exactly what a dense stack does without being told which interactions to look for. Embeddings also solve the cold-ish-start problem matrix factorization cannot: a new item with content features gets a representation immediately. The costs are the usual ones and they bite here — inference latency inside a request budget, embedding tables that dominate model size, and popularity bias amplified through the training data, which no architecture fixes.',
        featurization: [
          'Embed high-cardinality identifiers rather than one-hot encoding them, which is the difference between a tractable model and an impossible one',
          'Hash rare identifiers into shared buckets so the embedding table stays bounded as the catalogue grows',
          'Normalize dense features; embeddings and raw counts on the same input layer train badly together',
          'Include explicit crossed features where a specific interaction is known to matter, rather than relying on the network to find it',
        ],
        evaluation:
          'AUC or log-loss for the prediction and NDCG or recall@k for the ranking, on a temporal split. Watch catalogue coverage alongside — a model that improves engagement by narrowing what it shows is not the improvement it appears to be.',
        pitfalls: [
          'Random rather than temporal splits, which leak future interactions and inflate every offline number',
          'Embedding tables dominating model size, so serving cost is a memory problem rather than a compute one',
          'Feedback loops: training on logged data teaches the model what the previous model showed, and offline metrics cannot detect it',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'As the nuisance-function estimator inside a doubly-robust or orthogonalized design. Double machine learning needs a model of the outcome given covariates and a model of the treatment given covariates; both are pure prediction problems where flexibility helps, and a dense network is a reasonable choice when the covariates are high-dimensional or unstructured — text, images, long behavioural histories.',
        where: [
          'Nuisance-function estimation inside double machine learning, where flexibility is wanted and the identification comes from elsewhere',
          'Representation learning over unstructured confounders that a linear adjustment cannot use at all',
          'Heterogeneous treatment-effect networks with a shared trunk and separate outcome heads',
        ],
        why: 'It earns a place only inside a design that keeps it away from the estimand. Flexibility is genuinely useful for the nuisance functions — a better model of the outcome given covariates removes more confounding — but the identification argument comes from the design, and the network only estimates a component of it. Used directly to predict outcomes and differencing the predictions is the error the causal ML literature exists to correct: an accurate predictor of the outcome is not an estimator of the effect, and a flexible one is frequently worse because it absorbs the treatment variation the estimate depends on.',
        featurization: [
          'Cross-fitting is mandatory: fit the nuisance functions on one fold and evaluate on another, or the estimate inherits the network’s overfitting as bias',
          'Never regularize or shrink the treatment coefficient itself; the penalty that helps prediction destroys the estimand',
          'Exclude post-treatment variables, which bias the estimate no matter how much they improve the fit',
        ],
        evaluation:
          'Interval coverage under simulation with a known effect, not predictive accuracy. The nuisance models are judged by whether the resulting effect estimate has coverage, and a network that predicts the outcome better while degrading coverage has made things worse.',
        pitfalls: [
          'Skipping cross-fitting, which is the single most common way a flexible nuisance model corrupts the estimate',
          'Reading differences in predicted outcomes as treatment effects, which conflates prognosis with response',
          'Using a network where a linear model suffices, adding variance to the effect estimate for no gain in identification',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'A sequence of matrix multiplications per batch, which is what GPUs are built for — minutes to hours depending on scale. The memory ceiling is the stored forward activations rather than the parameters, and that is what caps batch size in practice.',
    inferenceProfile:
      'One forward pass: a few matrix-vector products, sub-millisecond on CPU for a modest network and batchable to far better throughput on a GPU. Model size is the parameter count, which for a dense network with embedding tables is dominated by the tables rather than the layers.',
    retrainingCadence:
      'Periodic and full — there is no exact incremental update, though warm-starting from the previous weights is standard and cuts training time substantially. In recommendation the cadence is usually daily, driven by catalogue and behaviour drift rather than by compute.',
    driftAndMonitoring: [
      'Track the input feature distributions, since a dense network extrapolates arbitrarily and a shifted input produces a confident, meaningless output',
      'Monitor prediction distribution rather than accuracy alone, because a drifting output distribution moves before labels arrive to reveal it',
      'Watch calibration explicitly: a network’s confidence and its accuracy diverge as it drifts, and modern networks are systematically overconfident to begin with',
      'For embedding models, track the share of requests hitting unseen or hashed-bucket identifiers, which is where the representation is weakest',
    ],
    productionGotchas: [
      'Scaling statistics are part of the model and must be persisted; recomputing them at inference silently changes every prediction',
      'Training and inference must use the same behaviour for dropout and normalization layers — leaving a model in training mode is a classic and completely silent bug',
      'Softmax outputs are not calibrated probabilities: modern networks are systematically overconfident, and anything thresholding them on cost needs temperature scaling fitted on held-out data',
      'Non-determinism from GPU reductions and data ordering means two runs on the same data differ; reproducibility requires pinning seeds and, on some hardware, deterministic kernels',
      'The network extrapolates without complaint outside the training range, producing confident output where it has no information — input range checks are a deployment requirement rather than a nicety',
    ],
  },

  assumptions: [
    'The mapping from inputs to targets is a continuous function that a composition of linear maps and nonlinearities can approximate — which the universal approximation theorem guarantees, while saying nothing about how wide, how learnable, or how well it generalizes',
    'Enough data to fit a model with no structural prior; the flexibility that makes it general is what makes it data-hungry',
    'Inputs are scaled comparably, since the network is entirely sensitive to feature scale',
    'Training and deployment inputs come from the same distribution — outside it the output is arbitrary rather than approximately right',
    'Examples are independent and identically distributed, which shuffled mini-batches assume and time series violate',
  ],

  pros: [
    {
      point: 'Universal approximation: no functional form has to be specified',
      context:
        'Given enough width it can represent any continuous function on a compact set. The theorem is often over-read — it says nothing about how many units, whether gradient descent finds them, or whether the result generalizes — but the flexibility is real and is why this is the default when the structure is unknown.',
    },
    {
      point: 'Learns feature interactions without being told which',
      context:
        'The reason it works on heterogeneous tabular inputs and is the interaction layer in every deep recommender. Worth much less when the interactions are few and known, where writing them into a linear model is cheaper and more interpretable.',
    },
    {
      point: 'Composes with everything else in the category',
      context:
        'It is the head on a CNN, the feedforward block in a transformer, the policy network in RL. Learning it once pays off across every later entry, which is why it sits in foundations.',
    },
    {
      point: 'Gradients cost about one forward pass regardless of parameter count',
      context:
        'Reverse-mode differentiation is what makes training a billion parameters feasible at all. The cost is memory for the stored activations, which is a real and often binding constraint.',
    },
  ],

  cons: [
    {
      point: 'No structural prior, so it needs far more data than a model that has one',
      context:
        'A CNN gets translation invariance for free; this has to learn it from examples. That is the whole trade of the category — every later architecture is this with an assumption added, and the assumption is what buys the sample efficiency.',
    },
    {
      point: 'Loses to gradient boosting on tabular data',
      context:
        'Repeatedly and by a clear margin on typical business datasets, which is now a well-replicated result rather than folklore. Reaching for a network on a tabular problem should require an argument, not a default.',
    },
    {
      point: 'Non-convex, stochastic, and hard to reproduce exactly',
      context:
        'Different seeds give different models; GPU reductions are non-deterministic; the learning rate spans orders of magnitude. Manageable, and a real cost in audited settings where a linear model’s exact reproducibility is worth more than accuracy.',
    },
    {
      point: 'Confidently wrong outside the training distribution',
      context:
        'It extrapolates arbitrarily and reports high confidence while doing so. Combined with systematic overconfidence even in-distribution, this makes calibration and input-range checking deployment requirements rather than refinements.',
    },
  ],

  relatedSlugs: ['perceptron', 'cnn', 'transformer'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""A two-layer network - forward and backward, transcribed.

Backpropagation is the chain rule with the shared intermediates computed once
instead of once per weight. Every loop below is one factor of that chain,
written out so the dependency is visible.
"""

import math
import random


def sigmoid(z):
    return 1.0 / (1.0 + math.exp(-z)) if z >= 0 else math.exp(z) / (1.0 + math.exp(z))


def fit(X, y, hidden, lr=0.1, epochs=1000, seed=0):
    """One hidden layer, sigmoid activation, squared error."""
    rng = random.Random(seed)
    n = len(X)
    d = len(X[0])

    # Small random init, NOT zeros: with identical weights every hidden unit
    # computes the same thing and receives the same gradient forever, so the
    # layer never differentiates. Symmetry breaking is why this is random.
    W1 = [[rng.gauss(0.0, 0.1) for _ in range(hidden)] for _ in range(d)]
    b1 = [0.0] * hidden
    W2 = [rng.gauss(0.0, 0.1) for _ in range(hidden)]
    b2 = 0.0

    for _ in range(epochs):
        for i in range(n):
            # ---- forward ----------------------------------------------
            z1 = [0.0] * hidden
            a1 = [0.0] * hidden
            for h in range(hidden):
                total = b1[h]
                for j in range(d):
                    total += X[i][j] * W1[j][h]
                z1[h] = total
                a1[h] = sigmoid(total)

            z2 = b2
            for h in range(hidden):
                z2 += a1[h] * W2[h]
            prediction = z2

            # ---- backward ---------------------------------------------
            # delta at the output: dL/dz2 for squared error is 2 * error.
            delta2 = 2.0 * (prediction - y[i])

            # delta at the hidden layer: propagate through W2, then multiply
            # by the activation derivative. That elementwise product is the
            # gate - a saturated unit has derivative near zero and passes
            # nothing back, which is the vanishing-gradient problem in
            # miniature.
            delta1 = [0.0] * hidden
            for h in range(hidden):
                delta1[h] = delta2 * W2[h] * a1[h] * (1.0 - a1[h])

            # ---- update ------------------------------------------------
            for h in range(hidden):
                W2[h] -= lr * delta2 * a1[h]
            b2 -= lr * delta2

            for j in range(d):
                for h in range(hidden):
                    W1[j][h] -= lr * delta1[h] * X[i][j]
            for h in range(hidden):
                b1[h] -= lr * delta1[h]

    return W1, b1, W2, b2


def predict(W1, b1, W2, b2, x):
    hidden = len(b1)
    total = b2
    for h in range(hidden):
        z = b1[h]
        for j in range(len(x)):
            z += x[j] * W1[j][h]
        total += sigmoid(z) * W2[h]
    return total`,
        profile: 'O(n * d * hidden) per epoch in interpreter loops, one example at a time, with sigmoid activations that saturate and stall the gradient.',
      },
      'make-it-right': {
        code: `"""An MLP - typed layers, He init, ReLU, fused softmax cross-entropy."""

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


@dataclass
class DenseLayer:
    """One affine map plus a nonlinearity, with its own backward pass."""

    weights: Matrix
    bias: Vector
    _inputs: Matrix | None = field(default=None, init=False, repr=False)
    _pre_activation: Matrix | None = field(default=None, init=False, repr=False)

    @classmethod
    def he_initialized(cls, fan_in: int, fan_out: int, rng: np.random.Generator) -> "DenseLayer":
        """Scale by sqrt(2 / fan_in) - He initialization for ReLU.

        Not a refinement. With the wrong scale the activation variance grows
        or shrinks by a constant factor at every layer, so a deep stack either
        saturates or collapses to zero before the first gradient arrives.
        Getting this wrong makes a network untrainable rather than slow.
        """
        scale = np.sqrt(2.0 / fan_in)
        return cls(
            weights=rng.normal(0.0, scale, size=(fan_in, fan_out)),
            bias=np.zeros(fan_out, dtype=np.float64),
        )

    def forward(self, inputs: Matrix) -> Matrix:
        if inputs.ndim != 2 or inputs.shape[1] != self.weights.shape[0]:
            raise ValueError(
                f"expected (batch, {self.weights.shape[0]}) input, got {inputs.shape}"
            )
        # Saved for the backward pass: the gradient of the weights needs the
        # incoming activation, and this is what makes activation memory - not
        # parameter count - the thing that caps batch size.
        self._inputs = inputs
        self._pre_activation = inputs @ self.weights + self.bias
        return np.maximum(self._pre_activation, 0.0)      # ReLU

    def backward(self, upstream: Matrix, learning_rate: float) -> Matrix:
        if self._inputs is None or self._pre_activation is None:
            raise RuntimeError("backward called before forward")

        # The ReLU derivative is a gate: pass the signal where the unit was
        # active, block it where it was not. Unlike sigmoid it does not shrink
        # the signal, which is why deep stacks became trainable.
        delta = upstream * (self._pre_activation > 0.0)

        grad_weights = self._inputs.T @ delta
        grad_bias = delta.sum(axis=0)
        downstream = delta @ self.weights.T

        self.weights -= learning_rate * grad_weights
        self.bias -= learning_rate * grad_bias
        return downstream


def softmax_cross_entropy(logits: Matrix, labels: NDArray) -> tuple[float, Matrix]:
    """Loss and its gradient, computed together and stably.

    Two things matter here. The max is subtracted before exponentiating,
    because exp of a large logit overflows and the naive version silently
    produces NaN. And the gradient of the fused pair is simply
    (softmax - one_hot) - the Jacobian of the softmax and the derivative of
    the log cancel exactly, so computing them separately does more work and
    is less stable.
    """
    shifted = logits - logits.max(axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    partition = exponentials.sum(axis=1, keepdims=True)

    log_probabilities = shifted - np.log(partition)
    rows = np.arange(labels.size)
    loss = float(-log_probabilities[rows, labels].mean())

    gradient = exponentials / partition
    gradient[rows, labels] -= 1.0
    return loss, gradient / labels.size


def fit(
    X: Matrix,
    y: NDArray,
    hidden_sizes: list[int],
    n_classes: int,
    learning_rate: float = 0.01,
    epochs: int = 50,
    batch_size: int = 64,
    seed: int = 0,
) -> list[DenseLayer]:
    """Train by mini-batch SGD. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.size:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.size}")
    if batch_size < 1:
        raise ValueError(f"batch_size must be at least 1, got {batch_size}")

    rng = np.random.default_rng(seed)
    sizes = [X.shape[1], *hidden_sizes, n_classes]
    layers = [
        DenseLayer.he_initialized(sizes[i], sizes[i + 1], rng)
        for i in range(len(sizes) - 1)
    ]

    for _ in range(epochs):
        order = rng.permutation(X.shape[0])

        for start in range(0, X.shape[0], batch_size):
            batch = order[start : start + batch_size]
            activations = X[batch]

            for layer in layers:
                activations = layer.forward(activations)

            _, gradient = softmax_cross_entropy(activations, y[batch])

            for layer in reversed(layers):
                gradient = layer.backward(gradient, learning_rate)

    return layers`,
        rationale:
          'Three changes, and only one is about vectorization. The activation moves from sigmoid to ReLU, which is what made deep stacks trainable: a saturated sigmoid has a near-zero derivative and the backward signal is multiplied by it at every layer, so it vanishes with depth. Initialization becomes He scaling by fan-in, which is not a refinement — with the wrong scale the activation variance compounds by a constant factor per layer and a deep network is untrainable from the first step. And softmax and cross-entropy are fused, because their derivatives cancel exactly to (softmax − one-hot), which is both less work and numerically stable where computing them separately overflows.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(batch * sum of layer products) per step, executed as BLAS matrix products rather than interpreter loops.',
      },
      'make-it-fast': {
        code: `"""An MLP - preallocated activations, in-place ReLU, Adam in place."""

import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


class FusedMlp:
    """Every buffer allocated once for the whole run.

    Training allocates the same shapes thousands of times: activations,
    gradients, and one moment estimate per parameter. At a fixed batch size
    every one of those shapes is known up front, so they are allocated once
    and rewritten - which removes the allocator from the inner loop entirely
    and keeps the working set resident.

    Activation memory, not parameter count, is what caps batch size in a real
    network. Preallocating makes that ceiling explicit rather than discovering
    it as an out-of-memory error mid-epoch.
    """

    def __init__(self, sizes: list[int], batch_size: int, seed: int = 0) -> None:
        rng = np.random.default_rng(seed)
        self._sizes = sizes
        self._batch = batch_size

        # C-contiguous float32: half the memory traffic of float64, and every
        # GEMM reads the arrays directly rather than through a copy. Training
        # is memory-bound far more often than precision-bound.
        self._weights = [
            np.ascontiguousarray(
                rng.normal(0.0, np.sqrt(2.0 / sizes[i]), size=(sizes[i], sizes[i + 1])),
                dtype=np.float32,
            )
            for i in range(len(sizes) - 1)
        ]
        self._biases = [np.zeros(sizes[i + 1], dtype=np.float32) for i in range(len(sizes) - 1)]

        # Adam moments, allocated once alongside the parameters.
        self._m = [np.zeros_like(w) for w in self._weights]
        self._v = [np.zeros_like(w) for w in self._weights]
        self._step = 0

        # Forward activations and backward deltas, one buffer per layer.
        self._activations = [
            np.empty((batch_size, size), dtype=np.float32) for size in sizes
        ]
        self._deltas = [
            np.empty((batch_size, size), dtype=np.float32) for size in sizes[1:]
        ]

    def forward(self, batch: Matrix) -> Matrix:
        np.copyto(self._activations[0], batch)

        for index, (weights, bias) in enumerate(zip(self._weights, self._biases)):
            # matmul straight into the preallocated buffer - no temporary per
            # layer per step, which across an epoch is thousands of arrays.
            np.matmul(self._activations[index], weights, out=self._activations[index + 1])
            self._activations[index + 1] += bias

            if index < len(self._weights) - 1:
                # ReLU in place: the output buffer IS the input buffer.
                np.maximum(self._activations[index + 1], 0.0, out=self._activations[index + 1])

        return self._activations[-1]

    def backward(self, gradient: Matrix, learning_rate: float,
                 beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8) -> None:
        self._step += 1
        np.copyto(self._deltas[-1], gradient)

        for index in reversed(range(len(self._weights))):
            delta = self._deltas[index]

            if index < len(self._weights) - 1:
                # ReLU gate applied in place against the saved pre-activation.
                np.multiply(delta, self._activations[index + 1] > 0.0, out=delta)

            grad_weights = self._activations[index].T @ delta
            grad_bias = delta.sum(axis=0)

            if index > 0:
                np.matmul(delta, self._weights[index].T, out=self._deltas[index - 1])

            # Adam, entirely in place: three full-size temporaries per
            # parameter tensor per step would otherwise be allocated, and with
            # a large model that is the dominant allocation in training.
            m, v = self._m[index], self._v[index]
            m *= beta1
            m += (1.0 - beta1) * grad_weights
            v *= beta2
            v += (1.0 - beta2) * (grad_weights * grad_weights)

            bias1 = 1.0 - beta1**self._step
            bias2 = 1.0 - beta2**self._step
            self._weights[index] -= learning_rate * (m / bias1) / (np.sqrt(v / bias2) + eps)
            self._biases[index] -= learning_rate * grad_bias`,
        rationale:
          'Training allocates the same shapes thousands of times — activations, deltas, and three temporaries per parameter tensor per Adam step — and at a fixed batch size every shape is known up front. Allocating them once and writing through them removes the allocator from the inner loop entirely and keeps the working set resident, which matters because training is memory-bound far more often than it is arithmetic-bound. The ReLU and the Adam update both run in place for the same reason. Precision drops to float32, which halves the memory traffic on every one of those buffers, and the arrays are pinned C-contiguous so each GEMM reads them without an internal copy.',
        optimizations: [
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'Activation, delta and Adam-moment buffers are allocated once for the whole run and rewritten each step, rather than allocating several full-size arrays per layer per step.',
            tradeoff: 'Fixes the batch size at construction — a final partial batch needs separate handling — and the buffers are shared mutable state, so the object cannot be used from two threads or reentered.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'C-contiguous float32 halves the traffic on every buffer and lets each GEMM read the arrays directly instead of through an internal conversion or copy.',
            tradeoff: 'float32 accumulates rounding error over long training runs, and some losses genuinely need float64 accumulation — the usual answer is mixed precision, which is more machinery than this shows.',
          },
          {
            technique: 'Fuse adjacent operations so intermediates are never materialized',
            why: 'The ReLU writes into its own input buffer and the Adam update composes in place, so neither the activation nor the three moment intermediates ever exist as separate arrays.',
            tradeoff: 'The in-place chain is order-dependent and destroys the pre-activation the backward pass needs unless the gate is applied against the right buffer — a reordering here is a silent wrong gradient rather than an error.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(batch * sum of layer products) per step with one round of allocation for the whole run. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// A two-layer network - forward and backward, transcribed.
#include <cmath>
#include <cstddef>
#include <random>
#include <vector>

double Sigmoid(double z) {
  return z >= 0.0 ? 1.0 / (1.0 + std::exp(-z)) : std::exp(z) / (1.0 + std::exp(z));
}

// Backpropagation is the chain rule with the shared intermediates computed
// once instead of once per weight. Every loop below is one factor of it.
void Fit(const std::vector<std::vector<double>>& X, const std::vector<double>& y,
         std::size_t hidden, double lr, int epochs, unsigned seed,
         std::vector<std::vector<double>>& W1, std::vector<double>& b1,
         std::vector<double>& W2, double& b2) {
  const std::size_t n = X.size();
  const std::size_t d = X[0].size();

  std::mt19937 generator(seed);
  std::normal_distribution<double> init(0.0, 0.1);

  // Small random init, NOT zeros: with identical weights every hidden unit
  // computes the same thing and receives the same gradient for ever, so the
  // layer never differentiates. Symmetry breaking is why this is random.
  W1.assign(d, std::vector<double>(hidden, 0.0));
  for (auto& row : W1) for (double& value : row) value = init(generator);
  b1.assign(hidden, 0.0);
  W2.assign(hidden, 0.0);
  for (double& value : W2) value = init(generator);
  b2 = 0.0;

  for (int epoch = 0; epoch < epochs; ++epoch) {
    for (std::size_t i = 0; i < n; ++i) {
      // ---- forward -------------------------------------------------------
      std::vector<double> a1(hidden, 0.0);
      for (std::size_t h = 0; h < hidden; ++h) {
        double total = b1[h];
        for (std::size_t j = 0; j < d; ++j) total += X[i][j] * W1[j][h];
        a1[h] = Sigmoid(total);
      }

      double prediction = b2;
      for (std::size_t h = 0; h < hidden; ++h) prediction += a1[h] * W2[h];

      // ---- backward ------------------------------------------------------
      // delta at the output: dL/dz for squared error is 2 * error.
      const double delta2 = 2.0 * (prediction - y[i]);

      // delta at the hidden layer: propagate through W2, then multiply by the
      // activation derivative. That elementwise product is the gate - a
      // saturated unit has derivative near zero and passes nothing back,
      // which is the vanishing-gradient problem in miniature.
      std::vector<double> delta1(hidden, 0.0);
      for (std::size_t h = 0; h < hidden; ++h) {
        delta1[h] = delta2 * W2[h] * a1[h] * (1.0 - a1[h]);
      }

      // ---- update --------------------------------------------------------
      for (std::size_t h = 0; h < hidden; ++h) W2[h] -= lr * delta2 * a1[h];
      b2 -= lr * delta2;

      for (std::size_t j = 0; j < d; ++j) {
        for (std::size_t h = 0; h < hidden; ++h) {
          W1[j][h] -= lr * delta1[h] * X[i][j];
        }
      }
      for (std::size_t h = 0; h < hidden; ++h) b1[h] -= lr * delta1[h];
    }
  }
}`,
        profile: 'O(n * d * hidden) per epoch, one example at a time, with a fresh activation vector allocated per example and sigmoids that saturate.',
      },
      'make-it-right': {
        code: `// An MLP - flat row-major layers, He init, ReLU, RAII, fails fast.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

// One affine map plus a nonlinearity. Weights are flat row-major (in, out) so
// the forward product walks contiguous memory and the layer is one allocation.
class DenseLayer {
 public:
  DenseLayer(std::size_t fan_in, std::size_t fan_out, std::mt19937& generator)
      : fan_in_(fan_in), fan_out_(fan_out), weights_(fan_in * fan_out), bias_(fan_out, 0.0) {
    if (fan_in_ == 0 || fan_out_ == 0) throw std::invalid_argument("layer has zero width");

    // He initialization: scale by sqrt(2 / fan_in).
    //
    // Not a refinement. With the wrong scale the activation variance grows or
    // shrinks by a constant factor at every layer, so a deep stack either
    // saturates or collapses to zero before the first gradient arrives -
    // untrainable rather than slow.
    std::normal_distribution<double> init(0.0, std::sqrt(2.0 / static_cast<double>(fan_in_)));
    for (double& value : weights_) value = init(generator);
  }

  // Writes into caller-owned buffers so the layer allocates nothing per step.
  void Forward(std::span<const double> inputs, std::size_t batch,
               std::span<double> pre_activation, std::span<double> outputs) {
    if (inputs.size() != batch * fan_in_) {
      throw std::invalid_argument("input width does not match the layer");
    }

    for (std::size_t b = 0; b < batch; ++b) {
      const double* row = inputs.data() + b * fan_in_;
      double* out = pre_activation.data() + b * fan_out_;

      for (std::size_t o = 0; o < fan_out_; ++o) out[o] = bias_[o];
      for (std::size_t i = 0; i < fan_in_; ++i) {
        const double value = row[i];
        const double* weights = weights_.data() + i * fan_out_;
        for (std::size_t o = 0; o < fan_out_; ++o) out[o] += value * weights[o];
      }

      // ReLU: pass the signal where the unit is active, block it where it is
      // not. Unlike sigmoid it does not SHRINK the signal, which is why deep
      // stacks became trainable at all.
      for (std::size_t o = 0; o < fan_out_; ++o) {
        outputs[b * fan_out_ + o] = std::max(out[o], 0.0);
      }
    }
  }

  void Backward(std::span<const double> inputs, std::span<const double> pre_activation,
                std::span<double> upstream, std::size_t batch, double learning_rate,
                std::span<double> downstream) {
    // The ReLU derivative is a gate applied to the incoming delta.
    for (std::size_t index = 0; index < batch * fan_out_; ++index) {
      if (pre_activation[index] <= 0.0) upstream[index] = 0.0;
    }

    std::fill(downstream.begin(), downstream.end(), 0.0);

    for (std::size_t b = 0; b < batch; ++b) {
      const double* row = inputs.data() + b * fan_in_;
      const double* delta = upstream.data() + b * fan_out_;
      double* back = downstream.data() + b * fan_in_;

      for (std::size_t i = 0; i < fan_in_; ++i) {
        double* weights = weights_.data() + i * fan_out_;
        double accumulated = 0.0;
        for (std::size_t o = 0; o < fan_out_; ++o) {
          accumulated += weights[o] * delta[o];
          weights[o] -= learning_rate * row[i] * delta[o];
        }
        back[i] = accumulated;
      }
    }

    for (std::size_t b = 0; b < batch; ++b) {
      for (std::size_t o = 0; o < fan_out_; ++o) {
        bias_[o] -= learning_rate * upstream[b * fan_out_ + o];
      }
    }
  }

  [[nodiscard]] std::size_t fan_in() const noexcept { return fan_in_; }
  [[nodiscard]] std::size_t fan_out() const noexcept { return fan_out_; }

 private:
  std::size_t fan_in_;
  std::size_t fan_out_;
  std::vector<double> weights_;   // row-major (in, out), owned
  std::vector<double> bias_;
};

// Loss and gradient together, computed stably.
//
// The max is subtracted before exponentiating, because exp of a large logit
// overflows and the naive version silently produces NaN. And the gradient of
// the fused pair is simply (softmax - one_hot): the softmax Jacobian and the
// log derivative cancel exactly, so computing them separately is both more
// work and less stable.
double SoftmaxCrossEntropy(std::span<const double> logits, std::span<const int> labels,
                           std::size_t batch, std::size_t classes,
                           std::span<double> gradient) {
  double loss = 0.0;

  for (std::size_t b = 0; b < batch; ++b) {
    const double* row = logits.data() + b * classes;
    double largest = row[0];
    for (std::size_t c = 1; c < classes; ++c) largest = std::max(largest, row[c]);

    double partition = 0.0;
    for (std::size_t c = 0; c < classes; ++c) partition += std::exp(row[c] - largest);

    const auto label = static_cast<std::size_t>(labels[b]);
    loss -= (row[label] - largest) - std::log(partition);

    for (std::size_t c = 0; c < classes; ++c) {
      gradient[b * classes + c] = std::exp(row[c] - largest) / partition;
    }
    gradient[b * classes + label] -= 1.0;
  }

  const double scale = 1.0 / static_cast<double>(batch);
  for (double& value : gradient) value *= scale;
  return loss * scale;
}`,
        rationale:
          'Three changes, and the vectorization is the least of them. The activation moves from sigmoid to ReLU, which is what made deep stacks trainable: a saturated sigmoid has a near-zero derivative and the backward signal is multiplied by it at every layer. Initialization becomes He scaling by fan-in — with the wrong scale the activation variance compounds per layer and a deep network is untrainable from the first step rather than merely slow. Softmax and cross-entropy are fused, since their derivatives cancel to (softmax − one-hot) and the naive separate version overflows on a large logit. Structurally, weights become one flat row-major buffer per layer and every intermediate is caller-owned, so a layer allocates nothing per step.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(batch * fan_in * fan_out) per layer per step, contiguous throughout, with no per-step allocation.',
      },
      'make-it-fast': {
        code: `// An MLP - Eigen GEMM per layer, batch as the parallel axis.
#include <Eigen/Dense>
#include <stdexcept>
#include <vector>

// Row-major: a batch element is one contiguous run, which is what the GEMM
// panels and the row-wise softmax both want.
using RowMajorMatrix =
    Eigen::Matrix<float, Eigen::Dynamic, Eigen::Dynamic, Eigen::RowMajor>;

// float rather than double throughout: training is memory-bound far more
// often than precision-bound, and halving the traffic on the activation
// buffers - which are the largest arrays in a network - is worth more than
// the extra mantissa bits.
struct Layer {
  RowMajorMatrix weights;    // (fan_in, fan_out)
  Eigen::RowVectorXf bias;

  // Preallocated at construction and rewritten every step. Activation memory,
  // not parameter count, is what caps batch size in a real network - so
  // making that ceiling explicit here is a feature.
  RowMajorMatrix pre_activation;
  RowMajorMatrix output;
  RowMajorMatrix delta;
};

class FusedMlp {
 public:
  FusedMlp(const std::vector<int>& sizes, int batch) : batch_(batch) {
    if (sizes.size() < 2) throw std::invalid_argument("need at least an input and an output layer");

    for (std::size_t i = 0; i + 1 < sizes.size(); ++i) {
      Layer layer;
      const float scale = std::sqrt(2.0F / static_cast<float>(sizes[i]));
      layer.weights = RowMajorMatrix::Random(sizes[i], sizes[i + 1]) * scale;
      layer.bias = Eigen::RowVectorXf::Zero(sizes[i + 1]);
      layer.pre_activation = RowMajorMatrix::Zero(batch, sizes[i + 1]);
      layer.output = RowMajorMatrix::Zero(batch, sizes[i + 1]);
      layer.delta = RowMajorMatrix::Zero(batch, sizes[i + 1]);
      layers_.push_back(std::move(layer));
    }
  }

  const RowMajorMatrix& Forward(const RowMajorMatrix& batch) {
    const RowMajorMatrix* input = &batch;

    for (std::size_t index = 0; index < layers_.size(); ++index) {
      Layer& layer = layers_[index];

      // One GEMM per layer, written straight into the preallocated buffer.
      // noalias() skips the temporary Eigen would otherwise create because it
      // cannot prove the destination does not appear on the right.
      layer.pre_activation.noalias() = (*input) * layer.weights;
      layer.pre_activation.rowwise() += layer.bias;

      if (index + 1 < layers_.size()) {
        // ReLU as a fused array expression - no intermediate materialized.
        layer.output = layer.pre_activation.cwiseMax(0.0F);
        input = &layer.output;
      } else {
        input = &layer.pre_activation;      // logits, no activation
      }
    }

    return *input;
  }

  void Backward(const RowMajorMatrix& batch, const RowMajorMatrix& gradient, float lr) {
    layers_.back().delta = gradient;

    for (int index = static_cast<int>(layers_.size()) - 1; index >= 0; --index) {
      Layer& layer = layers_[static_cast<std::size_t>(index)];

      if (index + 1 < static_cast<int>(layers_.size())) {
        // ReLU gate, fused against the saved pre-activation.
        layer.delta.array() *= (layer.pre_activation.array() > 0.0F).cast<float>();
      }

      const RowMajorMatrix& input =
          index == 0 ? batch : layers_[static_cast<std::size_t>(index - 1)].output;

      if (index > 0) {
        layers_[static_cast<std::size_t>(index - 1)].delta.noalias() =
            layer.delta * layer.weights.transpose();
      }

      // Both gradients are GEMMs; the weight update is fused into the
      // assignment so no gradient matrix is ever materialized.
      layer.weights.noalias() -= lr * (input.transpose() * layer.delta);
      layer.bias -= lr * layer.delta.colwise().sum();
    }
  }

 private:
  int batch_;
  std::vector<Layer> layers_;
};`,
        rationale:
          'Each layer becomes a single GEMM in both directions, written straight into buffers allocated once at construction — which makes the activation-memory ceiling explicit rather than something discovered as an out-of-memory error mid-epoch, since that memory and not the parameter count is what caps batch size. Precision drops to float, because training is memory-bound far more often than precision-bound and the activation buffers are the largest arrays present. The ReLU, its gate, and the weight update are all fused expressions, so no gradient or activation intermediate is ever materialized.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'Every forward product, backward propagation and weight gradient is a GEMM dispatched to a blocked kernel — the entire arithmetic of the network, and what makes a wide layer efficient at all.',
            tradeoff: 'The advantage only appears above a size threshold; for a narrow layer the dispatch overhead exceeds the work, which is why small networks are often faster with hand-written loops.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'noalias() writes each product directly into its destination, and the ReLU, its gate and the weight update are fused array expressions rather than allocated intermediates.',
            tradeoff: 'noalias() is an unchecked assertion — the backward pass genuinely does have aliasing hazards between deltas, and getting one wrong is a silently incorrect gradient rather than a crash.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'A batch element is one contiguous run, which suits both the GEMM panels and the row-wise softmax and bias broadcast.',
            tradeoff: 'Eigen defaults to column-major, so the layout must be carried explicitly through every type — and a single mixed-layout product silently costs a transpose in the hottest loop in the model.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(batch * fan_in * fan_out) per layer per step in BLAS, with no allocation after construction. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! A two-layer network - forward and backward, transcribed.

fn sigmoid(z: f64) -> f64 {
    if z >= 0.0 {
        1.0 / (1.0 + (-z).exp())
    } else {
        z.exp() / (1.0 + z.exp())
    }
}

/// A tiny linear congruential generator, so the sample has no dependencies.
pub struct Lcg(u64);

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Self(seed.wrapping_mul(6364136223846793005).wrapping_add(1))
    }
    fn small(&mut self) -> f64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (self.0 >> 11) as f64 / (1_u64 << 53) as f64 * 0.2 - 0.1
    }
}

/// Backpropagation is the chain rule with the shared intermediates computed
/// once instead of once per weight. Every loop below is one factor of it.
pub fn fit(
    x: &[Vec<f64>],
    y: &[f64],
    hidden: usize,
    lr: f64,
    epochs: usize,
    seed: u64,
) -> (Vec<Vec<f64>>, Vec<f64>, Vec<f64>, f64) {
    let n = x.len();
    let d = x[0].len();
    let mut rng = Lcg::new(seed);

    // Small random init, NOT zeros: with identical weights every hidden unit
    // computes the same thing and receives the same gradient for ever, so the
    // layer never differentiates. Symmetry breaking is why this is random.
    let mut w1: Vec<Vec<f64>> = (0..d)
        .map(|_| (0..hidden).map(|_| rng.small()).collect())
        .collect();
    let mut b1 = vec![0.0; hidden];
    let mut w2: Vec<f64> = (0..hidden).map(|_| rng.small()).collect();
    let mut b2 = 0.0;

    for _ in 0..epochs {
        for i in 0..n {
            // ---- forward ---------------------------------------------
            let mut a1 = vec![0.0; hidden];
            for h in 0..hidden {
                let mut total = b1[h];
                for j in 0..d {
                    total += x[i][j] * w1[j][h];
                }
                a1[h] = sigmoid(total);
            }

            let mut prediction = b2;
            for h in 0..hidden {
                prediction += a1[h] * w2[h];
            }

            // ---- backward --------------------------------------------
            // delta at the output: dL/dz for squared error is 2 * error.
            let delta2 = 2.0 * (prediction - y[i]);

            // delta at the hidden layer: propagate through w2, then multiply
            // by the activation derivative. That elementwise product is the
            // gate - a saturated unit has derivative near zero and passes
            // nothing back, which is the vanishing-gradient problem in
            // miniature.
            let delta1: Vec<f64> = (0..hidden)
                .map(|h| delta2 * w2[h] * a1[h] * (1.0 - a1[h]))
                .collect();

            // ---- update -----------------------------------------------
            for h in 0..hidden {
                w2[h] -= lr * delta2 * a1[h];
            }
            b2 -= lr * delta2;

            for j in 0..d {
                for h in 0..hidden {
                    w1[j][h] -= lr * delta1[h] * x[i][j];
                }
            }
            for h in 0..hidden {
                b1[h] -= lr * delta1[h];
            }
        }
    }

    (w1, b1, w2, b2)
}`,
        profile: 'O(n * d * hidden) per epoch, one example at a time, with a fresh activation Vec per example and sigmoids that saturate.',
      },
      'make-it-right': {
        code: `//! An MLP - typed errors, He init, ReLU, fused softmax cross-entropy.

use std::fmt;

#[derive(Debug, PartialEq)]
pub enum NetworkError {
    EmptyLayer { index: usize },
    ShapeMismatch { expected: usize, found: usize },
    BatchSize { value: usize },
    LabelOutOfRange { label: usize, classes: usize },
}

impl fmt::Display for NetworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyLayer { index } => write!(f, "layer {index} has zero width"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::BatchSize { value } => write!(f, "batch size must be at least 1, got {value}"),
            Self::LabelOutOfRange { label, classes } => {
                write!(f, "label {label} outside 0..{classes}")
            }
        }
    }
}

impl std::error::Error for NetworkError {}

/// Learning rate. A newtype because it and the regularization strength are
/// both bare f64 in every training signature, and the learning rate is the
/// single most consequential setting in the model - a transposition is not a
/// small error.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LearningRate(f64);

impl LearningRate {
    pub fn new(value: f64) -> Option<Self> {
        (value.is_finite() && value > 0.0).then_some(Self(value))
    }
}

/// One affine map plus a nonlinearity. Weights are flat row-major (in, out)
/// so the forward product walks contiguous memory.
pub struct DenseLayer {
    weights: Vec<f64>,
    bias: Vec<f64>,
    fan_in: usize,
    fan_out: usize,
}

impl DenseLayer {
    /// He initialization: scale by sqrt(2 / fan_in).
    ///
    /// Not a refinement. With the wrong scale the activation variance grows
    /// or shrinks by a constant factor at every layer, so a deep stack either
    /// saturates or collapses to zero before the first gradient arrives -
    /// untrainable rather than slow.
    pub fn he_initialized(
        fan_in: usize,
        fan_out: usize,
        index: usize,
        rng: &mut Lcg,
    ) -> Result<Self, NetworkError> {
        if fan_in == 0 || fan_out == 0 {
            return Err(NetworkError::EmptyLayer { index });
        }

        let scale = (2.0 / fan_in as f64).sqrt();
        let mut weights = Vec::with_capacity(fan_in * fan_out);
        weights.extend((0..fan_in * fan_out).map(|_| rng.normal() * scale));

        Ok(Self { weights, bias: vec![0.0; fan_out], fan_in, fan_out })
    }

    /// Writes into caller-owned buffers so the layer allocates nothing.
    pub fn forward(
        &self,
        inputs: &[f64],
        batch: usize,
        pre_activation: &mut [f64],
        outputs: &mut [f64],
    ) -> Result<(), NetworkError> {
        if inputs.len() != batch * self.fan_in {
            return Err(NetworkError::ShapeMismatch {
                expected: batch * self.fan_in,
                found: inputs.len(),
            });
        }

        for b in 0..batch {
            let row = &inputs[b * self.fan_in..(b + 1) * self.fan_in];
            let out = &mut pre_activation[b * self.fan_out..(b + 1) * self.fan_out];
            out.copy_from_slice(&self.bias);

            for (i, &value) in row.iter().enumerate() {
                let weights = &self.weights[i * self.fan_out..(i + 1) * self.fan_out];
                for (slot, weight) in out.iter_mut().zip(weights) {
                    *slot += value * weight;
                }
            }

            // ReLU: pass the signal where the unit is active, block it where
            // it is not. Unlike sigmoid it does not SHRINK the signal, which
            // is why deep stacks became trainable at all.
            let activated = &mut outputs[b * self.fan_out..(b + 1) * self.fan_out];
            for (slot, &value) in activated.iter_mut().zip(out.iter()) {
                *slot = value.max(0.0);
            }
        }

        Ok(())
    }
}

/// Loss and gradient together, computed stably.
///
/// The max is subtracted before exponentiating, because exp of a large logit
/// overflows and the naive version silently yields NaN. And the gradient of
/// the fused pair is simply (softmax - one_hot): the softmax Jacobian and the
/// log derivative cancel exactly, so computing them separately is both more
/// work and less stable.
pub fn softmax_cross_entropy(
    logits: &[f64],
    labels: &[usize],
    classes: usize,
    gradient: &mut [f64],
) -> Result<f64, NetworkError> {
    let batch = labels.len();
    if logits.len() != batch * classes {
        return Err(NetworkError::ShapeMismatch { expected: batch * classes, found: logits.len() });
    }

    let mut loss = 0.0;

    for (b, &label) in labels.iter().enumerate() {
        if label >= classes {
            return Err(NetworkError::LabelOutOfRange { label, classes });
        }

        let row = &logits[b * classes..(b + 1) * classes];
        let largest = row.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        let partition: f64 = row.iter().map(|value| (value - largest).exp()).sum();

        loss -= (row[label] - largest) - partition.ln();

        let out = &mut gradient[b * classes..(b + 1) * classes];
        for (slot, &value) in out.iter_mut().zip(row) {
            *slot = (value - largest).exp() / partition;
        }
        out[label] -= 1.0;
    }

    let scale = 1.0 / batch as f64;
    gradient.iter_mut().for_each(|value| *value *= scale);
    Ok(loss * scale)
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
    /// Box-Muller, so the initialization is genuinely Gaussian rather than
    /// uniform - the He scaling is derived for a Gaussian.
    fn normal(&mut self) -> f64 {
        let u1 = ((self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64).max(1e-12);
        let u2 = (self.next_u64() >> 11) as f64 / (1_u64 << 53) as f64;
        (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }
}
`,
        rationale:
          'The activation moves from sigmoid to ReLU, which is what made deep stacks trainable: a saturated sigmoid has a near-zero derivative and the backward signal is multiplied by it at every layer. Initialization becomes He scaling by fan-in and, correspondingly, genuinely Gaussian — the scaling is derived for a Gaussian and applying it to uniform noise silently changes the variance. Softmax and cross-entropy are fused because their derivatives cancel to (softmax − one-hot), which is both cheaper and stable where the separate version overflows. Structurally, weights become one flat row-major buffer walked as slices, all intermediates are caller-owned, errors become a typed Result, and the learning rate gets a newtype because it is the single most consequential number in the model.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(batch * fan_in * fan_out) per layer per step, contiguous throughout, with no per-step allocation.',
      },
      'make-it-fast': {
        code: `//! An MLP - BLAS-backed layers, batch split across cores.

use ndarray::{Array1, Array2, ArrayView2, Axis, Zip};
use ndarray_linalg::Norm;
use rayon::prelude::*;

/// f32 rather than f64: training is memory-bound far more often than
/// precision-bound, and the activation buffers are the largest arrays in a
/// network - halving their traffic is worth more than the extra mantissa.
pub struct Layer {
    pub weights: Array2<f32>,      // (fan_in, fan_out)
    pub bias: Array1<f32>,
    /// Preallocated at construction and rewritten each step. Activation
    /// memory, not parameter count, is what caps batch size in a real
    /// network - so making that ceiling explicit is a feature.
    pub pre_activation: Array2<f32>,
    pub output: Array2<f32>,
    pub delta: Array2<f32>,
}

impl Layer {
    #[must_use]
    pub fn new(fan_in: usize, fan_out: usize, batch: usize, scale: f32) -> Self {
        Self {
            weights: Array2::from_shape_fn((fan_in, fan_out), |(i, j)| {
                // Deterministic pseudo-random init, seeded by position.
                let mixed = ((i * 73_856_093) ^ (j * 19_349_663)) as u64;
                ((mixed >> 11) as f32 / (1_u64 << 21) as f32 - 0.5) * scale
            }),
            bias: Array1::zeros(fan_out),
            pre_activation: Array2::zeros((batch, fan_out)),
            output: Array2::zeros((batch, fan_out)),
            delta: Array2::zeros((batch, fan_out)),
        }
    }

    /// One GEMM plus a bias broadcast plus a fused ReLU.
    pub fn forward(&mut self, inputs: ArrayView2<f32>, is_last: bool) {
        // dot dispatches to BLAS - the entire arithmetic of the layer.
        self.pre_activation = inputs.dot(&self.weights);
        self.pre_activation += &self.bias;

        if is_last {
            return;      // logits, no activation
        }

        // Zip fuses the ReLU into one pass with no intermediate array.
        Zip::from(&mut self.output)
            .and(&self.pre_activation)
            .for_each(|out, &value| *out = value.max(0.0));
    }
}

/// Softmax cross-entropy over a batch, rows computed in parallel.
///
/// Rows are independent, so the loss and its gradient are a parallel map. The
/// max is subtracted before exponentiating - exp of a large logit overflows
/// and the naive version silently yields NaN - and the fused gradient is
/// simply (softmax - one_hot), since the softmax Jacobian and the log
/// derivative cancel exactly.
#[must_use]
pub fn softmax_cross_entropy(
    logits: &Array2<f32>,
    labels: &[usize],
    gradient: &mut Array2<f32>,
) -> f32 {
    let batch = labels.len();

    let losses: Vec<f32> = Zip::from(logits.axis_iter(Axis(0)))
        .and(gradient.axis_iter_mut(Axis(0)))
        .into_par_iter()
        .enumerate()
        .map(|(b, (row, mut out))| {
            let largest = row.iter().copied().fold(f32::NEG_INFINITY, f32::max);
            let partition: f32 = row.iter().map(|value| (value - largest).exp()).sum();

            Zip::from(&mut out)
                .and(&row)
                .for_each(|slot, &value| *slot = (value - largest).exp() / partition);
            out[labels[b]] -= 1.0;

            -((row[labels[b]] - largest) - partition.ln())
        })
        .collect();

    let scale = 1.0 / batch as f32;
    gradient.map_inplace(|value| *value *= scale);
    losses.iter().sum::<f32>() * scale
}

/// Gradient-norm clipping, computed across every parameter tensor.
///
/// The exploding-gradient failure is a product of per-layer factors, so it
/// must be measured over the WHOLE model rather than per tensor - clipping
/// each layer separately changes the gradient direction, which clipping the
/// global norm does not.
pub fn clip_global_norm(gradients: &mut [Array2<f32>], max_norm: f32) {
    let total: f32 = gradients
        .par_iter()
        .map(|g| {
            let norm = g.norm_l2();
            norm * norm
        })
        .sum::<f32>()
        .sqrt();

    if total > max_norm {
        let scale = max_norm / total;
        gradients
            .par_iter_mut()
            .for_each(|g| g.map_inplace(|value| *value *= scale));
    }
}
`,
        rationale:
          'Each layer becomes a BLAS-backed matrix product with preallocated buffers rewritten every step, which makes the activation-memory ceiling explicit rather than something discovered as an allocation failure mid-epoch. Precision drops to f32 because training is memory-bound far more often than precision-bound and the activation buffers are the largest arrays present. The batch is the parallel axis for the loss, since rows are independent. Gradient clipping is included here rather than earlier because it must be computed over the whole model — the exploding-gradient failure is a product of per-layer factors, and clipping tensors separately changes the gradient direction while clipping the global norm does not.',
        optimizations: [
          {
            technique: 'ndarray with the BLAS feature enabled',
            why: 'Every forward product and backward propagation is a GEMM dispatched to BLAS rather than a hand-written triple loop — the entire arithmetic of the network.',
            tradeoff: 'Binds the build to a system BLAS, and the advantage only appears above a size threshold; for narrow layers the dispatch overhead exceeds the work.',
          },
          {
            technique: 'rayon for data parallelism',
            why: 'Batch rows are independent during the loss and gradient computation, and parameter tensors are independent during norm clipping, so both are parallel maps.',
            tradeoff: 'The layer GEMMs are already threaded inside BLAS, so nesting rayon around them risks oversubscription — the parallel sections here are deliberately the ones BLAS does not cover.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The per-row loss vector is collected into a buffer sized to the batch, so the parallel map never grows its output during the reduction.',
            tradeoff: 'Materializes a per-row loss vector purely to sum it, where a parallel reduction would avoid the allocation entirely — kept because the per-row values are useful for diagnostics.',
          },
        ],
        libraryName: 'ndarray + ndarray-linalg + rayon',
        profile: 'O(batch * fan_in * fan_out) per layer per step in BLAS. Illustrative, not a measured benchmark.',
      },
    },
  },
};
