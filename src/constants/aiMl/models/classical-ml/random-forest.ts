import type { AiMlModel } from '../../types';

/**
 * Random Forest — bagging, plus the second decorrelation trick that makes
 * bagging work on trees.
 *
 * Follows decision-tree directly because it is the answer to that entry's
 * defining weakness: a single tree is unstable, and averaging many of them
 * cancels the instability without touching the bias. The variance
 * decomposition in the objective is the whole entry in one line — averaging
 * only helps to the extent the trees are uncorrelated, which is why feature
 * subsampling, not the bootstrap, is the ingredient that matters most.
 */
export const RANDOM_FOREST: AiMlModel = {
  slug: 'random-forest',
  name: 'Random Forest',
  aliases: ['Bagged trees', 'Breiman forest', 'Extra Trees (variant)', 'Causal forest (variant)'],
  category: 'classical-ml',
  group: 'trees-and-ensembles',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['classification', 'regression'],
  paradigmNote:
    'Supervised by construction: every split is chosen to reduce label impurity. The proximity-based outlier measure a forest can produce is a by-product rather than a detector, which is why anomaly detection is left to the isolation forest, where the splitting criterion itself changes.',

  intuition:
    'A single decision tree is accurate on average and wildly unstable — resample the data and you get a different tree. Averaging many trees cancels that instability, but only if the trees actually disagree, and trees grown on bootstrap samples of the same data do not disagree nearly enough: whichever feature is most predictive becomes the root split of almost every one of them. So the forest adds a second source of randomness that is easy to miss and does most of the work: at every split, only a random subset of the features may be considered. That forces trees to use different features, which decorrelates them, which is what makes the averaging pay.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\hat{f}(\\mathbf{x}) = \\frac{1}{B}\\sum_{b=1}^{B} T_b(\\mathbf{x}; \\Theta_b), \\qquad \\operatorname{Var}\\!\\left[\\hat{f}\\right] = \\rho\\sigma^2 + \\frac{1-\\rho}{B}\\sigma^2',
      symbols: [
        { symbol: 'T_b', meaning: 'tree b, grown deep on a bootstrap sample under randomness Theta_b' },
        { symbol: 'B', meaning: 'number of trees; more is never worse, which is why there is nothing to tune here' },
        { symbol: '\\rho', meaning: 'pairwise correlation between tree predictions — the term that does not vanish with B' },
        { symbol: '\\sigma^2', meaning: 'variance of a single tree, which is large by design because the trees are grown unpruned' },
      ],
    },
    reading:
      'Average the predictions of many deep trees. The second expression is the entire argument for the method and worth reading carefully: the variance of the average has two parts, and only the second one shrinks as trees are added. Push B to infinity and you are left with rho times sigma-squared — a floor set by how correlated the trees are with each other. That is why bagging alone underperforms: bootstrap resampling leaves rho high, because every tree still picks the same dominant feature at the root. Restricting the features available at each split is what drives rho down, and it is the reason a random forest beats bagged trees.',
  },

  optimization: {
    method: 'Independent greedy tree growth on bootstrap samples, with a random feature subset considered at each split',
    updateRule: {
      formula:
        'S_b \\sim \\text{Bootstrap}(S), \\qquad m \\subset \\{1, \\dots, d\\} \\text{ with } \\lvert m \\rvert = m_{\\text{try}}, \\qquad \\min_{j \\in m,\\, t} \\frac{n_L}{n}H(S_L) + \\frac{n_R}{n}H(S_R)',
      symbols: [
        { symbol: 'S_b', meaning: 'bootstrap sample — n draws with replacement, so about 37% of rows are left out of each tree' },
        { symbol: 'm', meaning: 'the random feature subset drawn afresh at every node, not once per tree' },
        { symbol: 'm_{\\text{try}}', meaning: 'how many features a split may consider; the main decorrelation dial' },
        { symbol: 'H', meaning: 'the same impurity as a single tree — nothing about the split criterion changes' },
      ],
    },
    rationale:
      'There is no joint optimization at all: each tree is grown independently and greedily, exactly as a single CART would be, and the ensemble is a plain average taken afterwards. That is what makes the method embarrassingly parallel and almost free of interactions between hyperparameters. Two design choices are worth stating because they look like mistakes. The trees are deliberately grown deep and unpruned — high variance is fine, because averaging is what removes it, and pruning would only add bias the ensemble cannot undo. And the feature subset is redrawn at every node rather than once per tree, because drawing it once would simply produce a forest of trees each fitted on a fixed random subspace, which decorrelates far less.',
    hyperparameters: [
      { name: 'n_estimators (B)', role: 'Number of trees. Monotone: more never hurts accuracy, it only costs time and memory, so this is a budget rather than a tuning parameter', typicalRange: '100 to 1000; the curve is flat well before 500 on most problems' },
      { name: 'max_features (m_try)', role: 'Features considered per split, and the parameter that actually matters. Small values decorrelate harder at the cost of individual tree quality', typicalRange: 'sqrt(d) for classification, d/3 for regression, then tuned around that' },
      { name: 'min_samples_leaf', role: 'Leaf-size floor. The main capacity control, since depth is deliberately left unbounded', typicalRange: '1 for classification, 5 for regression' },
      { name: 'bootstrap / max_samples', role: 'Whether to resample and how much. Turning it off gives Extra Trees territory, where randomness comes from split thresholds instead' },
      { name: 'class_weight', role: 'Rescales impurity per class; needed on imbalanced data, since a majority-pure leaf otherwise looks perfect to every tree' },
    ],
    convergence:
      'Nothing iterates toward an optimum, so the only convergence in play is statistical: the ensemble prediction converges as B grows, and adding trees cannot cause overfitting — a fact worth stating because it is genuinely unusual and often disbelieved. What can go wrong is elsewhere. The variance floor is real, so on a problem with one dominant feature the trees stay correlated and the forest barely improves on a single tree. Extremely imbalanced classes produce trees whose every leaf is majority-class, so the vote is unanimous and useless without weighting. And the model inherits every structural limit of its component: axis-aligned splits, and no ability to predict outside the range of the training targets.',
    complexity:
      'Training: O(B · n · d_try · log n), fully parallel across trees with no communication. Memory holds all B trees, which for deep unpruned trees on a large dataset is often larger than the dataset itself — the usual surprise when a forest is deployed. Prediction: O(B · depth), so a 500-tree forest is roughly 500 times the cost of one tree, which is still only a few thousand comparisons and is trivially parallel.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'The same lagged supervised table a single tree would use, with the forest averaging away the instability that makes one tree unreliable on a short series. The out-of-bag estimate is genuinely useful here as a sanity signal, though it must never replace a rolling-origin backtest — bootstrap rows are drawn without regard to time, so OOB error on a time series is optimistic by construction.',
        where: [
          'Many-series forecasting where per-series hand-tuning is impossible and robustness to default hyperparameters matters more than peak accuracy',
          'Demand and load forecasting with numerous correlated calendar, weather, and promotional drivers',
          'A strong tabular baseline that a deep forecaster must beat before its cost is justified',
        ],
        why: 'It is the least fussy strong model available: it needs no scaling, tolerates mixed types and missing values, has essentially one hyperparameter that matters, and rarely embarrasses itself at defaults. For a fleet of thousands of series that combination beats a better-but-fragile model outright. What it does not fix is the ceiling it inherits — a forest of piecewise-constant trees is still piecewise constant, so it cannot extrapolate a trend, and averaging does not change that. Detrend first, or forecast differences.',
        featurization: [
          'Detrend or difference before fitting; averaging trees does nothing about their inability to leave the training target range',
          'Lags, rolling statistics, and calendar features, with no scaling required',
          'Raise max_features above the sqrt default when lag features are highly correlated, or most splits are offered near-duplicates',
          'Add exogenous drivers freely — the forest is unusually tolerant of irrelevant features, which is a real practical advantage here',
        ],
        evaluation:
          'Rolling-origin backtesting scored with MASE against seasonal-naive. Use out-of-bag error only as a fast internal signal while iterating, never as the reported number: bootstrap sampling ignores time and leaks the future into every tree.',
        pitfalls: [
          'Reporting out-of-bag error on a time series, which is optimistic because the resampling has no notion of order',
          'Trend, producing forecasts pinned at the highest leaf mean the forest ever saw',
          'Reading impurity-based importances as driver importance when continuous lags are structurally favoured over categorical flags',
          'Memory: a few hundred deep trees over a long multi-series history is frequently larger than the data it was fitted on',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Every split is chosen to separate labels, so with no labels there is no criterion and with labels it is simply a rare-class classifier; isolating points by random splits is a different algorithm with a different objective, which is what the isolation forest entry covers.',
      },
      optimization: {
        fit: 'not-applicable',
        why: 'Neither the fit nor the output is an optimization problem: the trees are grown by a greedy heuristic and then averaged, and the deliverable is a prediction rather than an allocation under constraints.',
      },
    },
    breadth: {
      'causal-inference': {
        fit: 'adapted',
        how: 'Not the standard forest — a modification of it. A causal forest keeps the ensemble structure but changes what a split optimizes: instead of reducing outcome impurity, splits maximize the heterogeneity of the estimated treatment effect between children, so the partition is built to find where the effect differs rather than where the outcome does. Honest sample splitting on top of that — growing the tree on one half and estimating leaf effects on the other — is what makes the resulting intervals valid.',
        where: [
          'Estimating heterogeneous treatment effects on experimental data, to find which subgroups an intervention actually helps',
          'Uplift modelling for targeted offers, where the deliverable is who to treat rather than who will convert',
          'The nuisance-function estimator inside doubly-robust and orthogonalized estimators',
          'Policy learning, where the estimated effect surface feeds a constrained targeting decision',
        ],
        why: 'A standard random forest is the wrong tool here and the reason is worth being precise about: an accurate predictor of the outcome is not an estimator of the effect, and splitting on outcome impurity systematically finds prognostic variables rather than effect-modifying ones. The causal variant fixes the criterion, and honest splitting fixes the inference. What remains true of both is the ensemble’s virtue — flexible, low-variance estimates without specifying an interaction structure in advance, which is what makes heterogeneity discoverable rather than hypothesized.',
        featurization: [
          'Include the covariates the identification argument requires; adding predictive-but-irrelevant features costs precision on the effect',
          'Never include post-treatment variables, which bias the estimate rather than sharpen it',
          'Use honest sample splitting: grow the partition on one subsample and estimate leaf effects on another, or the intervals are anticonservative',
          'Keep the treatment out of the feature set — it enters the criterion, not the splits',
        ],
        evaluation:
          'Interval coverage under simulation with a known effect, and the Qini or uplift curve on held-out data. Predictive accuracy on the outcome is the wrong metric and will actively mislead — a model that predicts churn perfectly can be useless for choosing whom to save.',
        pitfalls: [
          'Using a plain random forest and reading differences in predictions as effects, which conflates prognosis with response',
          'Skipping honest splitting, which produces intervals with no coverage because the partition was chosen using the same data that estimates it',
          'Interpreting the fitted partition as the true structure of effect heterogeneity when a different sample gives a different partition',
        ],
      },
      'risk-and-fraud': {
        fit: 'viable',
        how: 'A strong default scorer over mixed tabular intake data — categorical merchant and device fields alongside continuous amounts and velocity features — with the out-of-bag estimate giving a free performance read during iteration and permutation importance giving a defensible driver analysis.',
        where: [
          'Fraud and abuse scoring where the feature set is wide, messy, and changes often',
          'Application and claims risk models on mixed-type intake forms',
          'The robust benchmark a boosted model is expected to beat before the extra tuning burden is accepted',
        ],
        why: 'It tolerates the conditions this domain actually has — mixed types, missing values, irrelevant features, no time to tune — and it is hard to break. Against it: gradient boosting generally wins on ranking metrics with tuning, the model is large and opaque compared with the extracted rules a policy team may want, and the impurity importances that get exported as explanations are biased toward high-cardinality identifiers, which is exactly the wrong direction here.',
        featurization: [
          'No scaling required, which removes a whole class of production drift bug',
          'Reduce identifier cardinality, or high-cardinality fields dominate impurity importance without dominating the predictions',
          'Set class weights or balanced subsampling; without them every leaf is majority-legitimate and the vote is unanimous',
          'Use permutation or out-of-bag importance for any exported explanation, never impurity importance',
        ],
        evaluation:
          'PR-AUC and precision at a fixed alert budget on an out-of-time split. Out-of-bag error is fine for iteration and not for reporting, since it says nothing about temporal generalization.',
        pitfalls: [
          'Exporting impurity importances as a driver analysis when they favour continuous and high-cardinality features by construction',
          'Class imbalance producing unanimous majority votes and a probability estimate with no dynamic range',
          'Model size: several hundred deep trees is a large artefact to ship, version, and load at every scoring node',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Linear in tree count and fully parallel, with no communication between trees — the best scaling story of anything in this section. A few hundred trees on a million rows is minutes on a multicore machine, and the fit can be split across machines by simply splitting the tree budget.',
    inferenceProfile:
      'B tree walks, so a few thousand comparisons for a typical forest. Fast in absolute terms and hundreds of times slower than a single tree, which matters at extreme volume. Also parallel across trees, though at that granularity the overhead usually exceeds the work.',
    retrainingCadence:
      'Cheap enough to refit on a schedule. Unlike a single tree, refits are stable in output even though the individual trees differ, which is a genuine operational advantage: the predictions move smoothly and there is no approved structure to re-approve.',
    driftAndMonitoring: [
      'Track out-of-bag error over successive refits as a free internal signal — it needs no holdout and moves before production metrics do',
      'Monitor prediction distribution rather than tree structure; individual trees are not meaningful and comparing them across refits is noise',
      'Watch the share of predictions at the extreme ends of the range, which is where the inability to extrapolate shows up first',
      'Compare permutation importances between refits, since impurity importances are biased and their movement is uninformative',
    ],
    productionGotchas: [
      'Model size is the surprise: hundreds of unpruned trees frequently exceed the size of the training data, and load time at every scoring node is a real cost',
      'Predicted probabilities are vote fractions, not calibrated probabilities — they cluster away from 0 and 1 and need isotonic or Platt calibration before being thresholded on cost',
      'Impurity-based feature importance is biased toward continuous and high-cardinality features and should not be shipped as an explanation',
      'The forest cannot extrapolate: a target beyond the training range is predicted as the nearest leaf means, averaged, silently and for ever',
      'Determinism requires pinning both the tree seeds and the thread count in some implementations, or two runs on the same data differ',
    ],
  },

  assumptions: [
    'Trees can be made to disagree — if one feature dominates every split, correlation stays high and averaging cannot help',
    'The decision boundary is well approximated by an average of axis-aligned partitions; a diagonal boundary is still a staircase, just a smoother one',
    'The target lies within the range seen in training, since every component is piecewise constant',
    'Rows are exchangeable for the purposes of bootstrapping — which time series and clustered data violate, making out-of-bag error optimistic',
  ],

  pros: [
    {
      point: 'Strong accuracy at default settings, with essentially one hyperparameter that matters',
      context:
        'The most reliable "just works" model in this section, which is decisive when there are thousands of models to fit and no time to tune each. Less compelling when a single model justifies careful tuning, where boosting overtakes it.',
    },
    {
      point: 'Adding trees never hurts',
      context:
        'Unusual and genuinely useful: B is a compute budget rather than a bias-variance tradeoff, so there is no overfitting risk to reason about. The trees themselves are still grown deep on purpose, and that is where the capacity control lives.',
    },
    {
      point: 'Out-of-bag error is a free validation estimate',
      context:
        'Roughly 37% of rows are out of each bootstrap, giving an honest holdout without splitting the data — valuable when data is scarce. It is invalid the moment rows are not exchangeable, which makes it wrong for time series.',
    },
    {
      point: 'Embarrassingly parallel, with no preprocessing requirements',
      context:
        'Trees are independent, so training scales across cores and machines with no coordination, and nothing needs scaling or encoding. Removes an entire class of pipeline bug at the cost of a large model artefact.',
    },
  ],

  cons: [
    {
      point: 'Usually beaten by gradient boosting on tabular data',
      context:
        'Bagging attacks variance and boosting attacks bias, and on most tabular problems bias is the binding constraint. The forest keeps the "no tuning, no surprises" territory, which is a real and narrower niche.',
    },
    {
      point: 'The model is large and genuinely opaque',
      context:
        'Hundreds of deep trees is not an explanation, and the interpretability that motivated a single tree is gone entirely. Anything shipped as a reason has to come from permutation importance or a surrogate, both approximations.',
    },
    {
      point: 'Cannot extrapolate, and the boundary is still axis-aligned',
      context:
        'Every structural limitation of a decision tree survives averaging. Disqualifying for trending series and wasteful where one linear term would capture the relationship exactly.',
    },
    {
      point: 'Vote fractions are not probabilities',
      context:
        'They are systematically compressed toward the middle, so a 0.7 is not a 70% chance. Any cost-based threshold or expected-value calculation needs a calibration step that is routinely skipped.',
    },
  ],

  relatedSlugs: ['decision-tree', 'gradient-boosting', 'isolation-forest'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Random forest - bootstrap, random feature subsets, average. Transcribed.

Two sources of randomness, and the second is the one that matters. The
bootstrap gives each tree a different sample; the per-node feature subset
forces trees to use different features, which is what drives the pairwise
correlation down and makes the averaging worth doing.
"""

import random


def gini(labels):
    if not labels:
        return 0.0
    counts = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1
    impurity = 1.0
    for count in counts.values():
        proportion = count / len(labels)
        impurity -= proportion * proportion
    return impurity


def majority(labels):
    counts = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1
    best_label, best_count = None, -1
    for label, count in counts.items():
        if count > best_count:
            best_label, best_count = label, count
    return best_label


def best_split(X, y, feature_subset):
    """Same criterion as CART, restricted to a random subset of features."""
    n = len(X)
    best = (None, None, gini(y))

    for feature in feature_subset:
        values = sorted({X[i][feature] for i in range(n)})
        for position in range(len(values) - 1):
            threshold = (values[position] + values[position + 1]) / 2.0

            left, right = [], []
            for i in range(n):
                if X[i][feature] <= threshold:
                    left.append(y[i])
                else:
                    right.append(y[i])

            if not left or not right:
                continue

            weighted = len(left) / n * gini(left) + len(right) / n * gini(right)
            if weighted < best[2]:
                best = (feature, threshold, weighted)

    return best


def build_tree(X, y, m_try, rng, depth=0, max_depth=20, min_samples_leaf=1):
    if depth >= max_depth or len(set(y)) == 1 or len(y) < 2 * min_samples_leaf:
        return {"leaf": True, "prediction": majority(y)}

    # Redrawn at EVERY node, not once per tree: drawing once would just give a
    # forest of trees each fitted on one fixed random subspace, which
    # decorrelates far less.
    feature_subset = rng.sample(range(len(X[0])), m_try)
    feature, threshold, _ = best_split(X, y, feature_subset)
    if feature is None:
        return {"leaf": True, "prediction": majority(y)}

    left_X, left_y, right_X, right_y = [], [], [], []
    for i in range(len(X)):
        if X[i][feature] <= threshold:
            left_X.append(X[i])
            left_y.append(y[i])
        else:
            right_X.append(X[i])
            right_y.append(y[i])

    return {
        "leaf": False,
        "feature": feature,
        "threshold": threshold,
        "left": build_tree(left_X, left_y, m_try, rng, depth + 1, max_depth, min_samples_leaf),
        "right": build_tree(right_X, right_y, m_try, rng, depth + 1, max_depth, min_samples_leaf),
    }


def fit(X, y, n_trees=100, m_try=None, seed=0):
    n = len(X)
    d = len(X[0])
    m_try = m_try or max(1, int(math_sqrt(d)))
    rng = random.Random(seed)

    forest = []
    out_of_bag = []          # rows NOT drawn for each tree - the free holdout

    for _ in range(n_trees):
        indices = [rng.randrange(n) for _ in range(n)]
        drawn = set(indices)
        # About 37% of rows fall outside any given bootstrap sample.
        out_of_bag.append([i for i in range(n) if i not in drawn])

        sample_X = [X[i] for i in indices]
        sample_y = [y[i] for i in indices]
        forest.append(build_tree(sample_X, sample_y, m_try, rng))

    return forest, out_of_bag


def math_sqrt(value):
    return value ** 0.5


def predict_one(forest, x):
    votes = {}
    for tree in forest:
        node = tree
        while not node["leaf"]:
            node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
        votes[node["prediction"]] = votes.get(node["prediction"], 0) + 1

    best_label, best_count = None, -1
    for label, count in votes.items():
        if count > best_count:
            best_label, best_count = label, count
    return best_label`,
        profile: 'O(B * n^2 * d_try) — every tree repeats the exhaustive split scan, and every recursion copies the rows it partitions.',
      },
      'make-it-right': {
        code: `"""Random forest - typed, index-partitioned, with an out-of-bag estimate."""

from dataclasses import dataclass, field

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Labels = NDArray[np.int64]


@dataclass(frozen=True)
class TreeNode:
    prediction: int
    feature: int = -1
    threshold: float = 0.0
    left: int = -1
    right: int = -1

    @property
    def is_leaf(self) -> bool:
        return self.feature < 0


@dataclass
class Tree:
    """Nodes in one flat list; children are indices, so prediction is a walk."""

    nodes: list[TreeNode] = field(default_factory=list)

    def predict(self, X: Matrix) -> Labels:
        out = np.empty(X.shape[0], dtype=np.int64)
        for row_index, row in enumerate(X):
            cursor = 0
            while not self.nodes[cursor].is_leaf:
                node = self.nodes[cursor]
                cursor = node.left if row[node.feature] <= node.threshold else node.right
            out[row_index] = self.nodes[cursor].prediction
        return out


def _grow(
    X: Matrix,
    y: Labels,
    rows: NDArray,
    tree: Tree,
    n_classes: int,
    m_try: int,
    rng: np.random.Generator,
    depth: int,
    max_depth: int,
    min_samples_leaf: int,
) -> int:
    counts = np.bincount(y[rows], minlength=n_classes)
    index = len(tree.nodes)
    tree.nodes.append(TreeNode(prediction=int(counts.argmax())))

    if depth >= max_depth or counts.max() == rows.size or rows.size < 2 * min_samples_leaf:
        return index

    # Redrawn at every node. Drawing once per tree would give a forest of
    # fixed random subspaces, which decorrelates far less.
    subset = rng.choice(X.shape[1], size=m_try, replace=False)

    best_impurity = 1.0 - float(((counts / rows.size) ** 2).sum())
    best: tuple[int, float] | None = None

    for feature in subset:
        order = rows[np.argsort(X[rows, feature], kind="stable")]
        values = X[order, feature]
        left_counts = np.zeros(n_classes, dtype=np.int64)
        right_counts = counts.copy()

        for position in range(rows.size - 1):
            label = y[order[position]]
            left_counts[label] += 1
            right_counts[label] -= 1

            if values[position] == values[position + 1]:
                continue
            n_left, n_right = position + 1, rows.size - position - 1
            if n_left < min_samples_leaf or n_right < min_samples_leaf:
                continue

            weighted = (
                n_left * (1.0 - ((left_counts / n_left) ** 2).sum())
                + n_right * (1.0 - ((right_counts / n_right) ** 2).sum())
            ) / rows.size

            if weighted < best_impurity:
                best_impurity = weighted
                best = (int(feature), float((values[position] + values[position + 1]) / 2.0))

    if best is None:
        return index

    feature, threshold = best
    mask = X[rows, feature] <= threshold
    left = _grow(X, y, rows[mask], tree, n_classes, m_try, rng, depth + 1, max_depth, min_samples_leaf)
    right = _grow(X, y, rows[~mask], tree, n_classes, m_try, rng, depth + 1, max_depth, min_samples_leaf)

    tree.nodes[index] = TreeNode(
        prediction=tree.nodes[index].prediction,
        feature=feature,
        threshold=threshold,
        left=left,
        right=right,
    )
    return index


@dataclass(frozen=True)
class RandomForest:
    trees: list[Tree]
    n_classes: int
    oob_score: float

    def predict(self, X: Matrix) -> Labels:
        votes = np.zeros((X.shape[0], self.n_classes), dtype=np.int64)
        for tree in self.trees:
            votes[np.arange(X.shape[0]), tree.predict(X)] += 1
        return votes.argmax(axis=1)


def fit(
    X: Matrix,
    y: Labels,
    n_trees: int = 100,
    m_try: int | None = None,
    max_depth: int = 20,
    min_samples_leaf: int = 1,
    seed: int = 0,
) -> RandomForest:
    """Grow a forest. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if n_trees < 1:
        raise ValueError(f"n_trees must be at least 1, got {n_trees}")

    n, d = X.shape
    n_classes = int(y.max()) + 1
    features_per_split = m_try or max(1, int(np.sqrt(d)))
    rng = np.random.default_rng(seed)

    trees: list[Tree] = []
    # Out-of-bag votes: about 37% of rows sit outside each bootstrap sample,
    # which gives an honest holdout estimate without splitting the data.
    oob_votes = np.zeros((n, n_classes), dtype=np.int64)

    for _ in range(n_trees):
        indices = rng.integers(0, n, size=n)
        tree = Tree()
        _grow(X, y, indices, tree, n_classes, features_per_split, rng, 0, max_depth, min_samples_leaf)
        trees.append(tree)

        oob_mask = np.ones(n, dtype=bool)
        oob_mask[indices] = False
        if oob_mask.any():
            oob_votes[np.flatnonzero(oob_mask), tree.predict(X[oob_mask])] += 1

    scored = oob_votes.sum(axis=1) > 0
    oob_score = float((oob_votes[scored].argmax(axis=1) == y[scored]).mean()) if scored.any() else 0.0

    return RandomForest(trees=trees, n_classes=n_classes, oob_score=oob_score)`,
        rationale:
          'Three changes. Rows are partitioned by index arrays rather than by copying the data, so growing B deep trees no longer copies the dataset once per level per tree — the largest hidden cost in the previous stage. Split finding sorts each candidate feature once and sweeps incrementally, replacing the exhaustive rescan. And the out-of-bag estimate becomes a first-class output rather than a list of indices nobody used: the roughly 37% of rows outside each bootstrap are voted on by exactly the trees that never saw them, which is an honest holdout obtained without splitting the data. Nodes move to a flat list with index children, so a tree is one object rather than a graph of dicts.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'No mutable default arguments',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'O(B * n * d_try * log n), with index partitioning and no row copies.',
      },
      'make-it-fast': {
        code: `"""Random forest - shared binned features, flat trees, batched voting."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]

N_BINS = 256


class BinnedForest:
    """The two changes that matter once B is large.

    First: the design matrix is quantized into 256 bins ONCE, before any tree
    exists, and every tree reads the same uint8 matrix. Binning costs one pass
    and is amortized across all B trees, which is where it genuinely pays -
    for a single tree it is close to a wash.

    Second: trees are stored as parallel flat arrays rather than objects, so
    prediction over a batch is an index walk through contiguous int32 arrays
    with no attribute lookup per node.

    Splits are chosen from bin edges rather than every midpoint, so they are
    approximate. That is the standing trade of histogram trees; averaging over
    a forest tends to absorb it, which is why production forests bin.
    """

    def __init__(self, X: Matrix, n_bins: int = N_BINS) -> None:
        design = np.ascontiguousarray(X, dtype=np.float64)
        self._edges = np.stack([
            np.quantile(design[:, feature], np.linspace(0.0, 1.0, n_bins + 1)[1:-1])
            for feature in range(design.shape[1])
        ])
        # Fortran order: split finding walks one feature at a time, so the
        # feature must be the contiguous axis. uint8 is 8x smaller than the
        # float64 it replaces, so far more stays in cache.
        self._binned = np.empty(design.shape, dtype=np.uint8, order="F")
        for feature in range(design.shape[1]):
            self._binned[:, feature] = np.searchsorted(
                self._edges[feature], design[:, feature], side="left"
            )

        # Trees as parallel flat arrays, appended to as the forest grows.
        self._feature: list[NDArray] = []
        self._bin: list[NDArray] = []
        self._left: list[NDArray] = []
        self._right: list[NDArray] = []
        self._value: list[NDArray] = []

    def bin_queries(self, X: Matrix) -> NDArray:
        """Queries must be binned with the SAME edges the forest was fitted on."""
        out = np.empty(X.shape, dtype=np.uint8, order="F")
        for feature in range(X.shape[1]):
            out[:, feature] = np.searchsorted(self._edges[feature], X[:, feature], side="left")
        return out

    def predict(self, X: Matrix, n_classes: int) -> NDArray:
        """Level-synchronous traversal: every row of the batch moves together."""
        binned = self.bin_queries(X)
        n = binned.shape[0]

        votes = np.zeros((n, n_classes), dtype=np.int32)      # allocated once
        cursor = np.empty(n, dtype=np.int32)
        rows = np.arange(n)

        for tree in range(len(self._feature)):
            feature = self._feature[tree]
            split_bin = self._bin[tree]
            left = self._left[tree]
            right = self._right[tree]
            value = self._value[tree]

            cursor.fill(0)
            active = rows

            # One iteration per level, not one per row: all rows still at an
            # internal node advance together, so the interpreter runs O(depth)
            # times instead of O(n * depth).
            while active.size:
                nodes = cursor[active]
                internal = feature[nodes] >= 0
                if not internal.any():
                    break

                moving = active[internal]
                at = cursor[moving]
                goes_left = binned[moving, feature[at]] <= split_bin[at]
                np.copyto(cursor[moving], np.where(goes_left, left[at], right[at]))
                active = moving

            np.add.at(votes, (rows, value[cursor]), 1)

        return votes.argmax(axis=1)`,
        rationale:
          'Two structural changes, both of which only pay because B is large. The design matrix is quantized once into a uint8 matrix that every tree shares — binning costs one pass and is amortized across all B trees, so what is a wash for a single tree is decisive for a forest, and the eightfold size reduction keeps far more of it in cache. Trees are then stored as parallel flat int32 arrays rather than node objects, and prediction becomes level-synchronous: every row still sitting at an internal node advances together, so the interpreter runs once per level rather than once per row per level. The approximation from binning is stated rather than hidden — splits come from bin edges, and averaging over the forest is what absorbs it.',
        optimizations: [
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'One shared Fortran-ordered uint8 matrix serves every tree, so a feature column is contiguous during split finding and eight times more of it is cache-resident than the float64 original.',
            tradeoff: 'Costs a full extra copy of the design at construction, caps the design at 256 bins by dtype, and makes the split approximate — the query path must use the identical edges or every prediction is silently wrong.',
          },
          {
            technique: 'Eliminate Python-level loops over samples',
            why: 'Level-synchronous traversal advances the whole batch one level at a time, so the interpreter cost is O(B * depth) rather than O(B * n * depth).',
            tradeoff: 'Every row pays for the deepest path in the tree rather than its own, so a badly unbalanced tree wastes work on rows that finished early — and the traversal is far less readable than a plain per-row walk.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The vote accumulator and the cursor array are allocated once for the whole batch and reused across all B trees instead of per tree.',
            tradeoff: 'Both are mutable state shared across the tree loop, so the method is not reentrant and two threads scoring through one forest object would corrupt each other.',
          },
        ],
        libraryName: 'NumPy',
        profile: 'O(B * depth) interpreter steps for a whole batch, with binning amortized across all trees. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Random forest - bootstrap, random feature subsets, average. Transcribed.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <map>
#include <memory>
#include <random>
#include <set>
#include <vector>

double Gini(const std::vector<int>& labels) {
  if (labels.empty()) return 0.0;
  std::map<int, int> counts;
  for (const int label : labels) counts[label] += 1;

  double impurity = 1.0;
  for (const auto& [label, count] : counts) {
    const double proportion = static_cast<double>(count) / static_cast<double>(labels.size());
    impurity -= proportion * proportion;
  }
  return impurity;
}

int Majority(const std::vector<int>& labels) {
  std::map<int, int> counts;
  for (const int label : labels) counts[label] += 1;
  int best_label = 0;
  int best_count = -1;
  for (const auto& [label, count] : counts) {
    if (count > best_count) {
      best_label = label;
      best_count = count;
    }
  }
  return best_label;
}

struct Node {
  bool leaf = true;
  int prediction = 0;
  std::size_t feature = 0;
  double threshold = 0.0;
  std::unique_ptr<Node> left;
  std::unique_ptr<Node> right;
};

std::unique_ptr<Node> BuildTree(const std::vector<std::vector<double>>& X,
                                const std::vector<int>& y,
                                std::size_t m_try,
                                std::mt19937& generator,
                                std::size_t depth,
                                std::size_t max_depth) {
  auto node = std::make_unique<Node>();
  node->prediction = Majority(y);

  if (depth >= max_depth || y.size() < 2) return node;

  const std::size_t d = X[0].size();
  // Redrawn at EVERY node. Drawing once per tree would give a forest of
  // fixed random subspaces, which decorrelates far less.
  std::vector<std::size_t> features(d);
  for (std::size_t j = 0; j < d; ++j) features[j] = j;
  std::shuffle(features.begin(), features.end(), generator);
  features.resize(m_try);

  double best_impurity = Gini(y);
  bool found = false;
  std::size_t best_feature = 0;
  double best_threshold = 0.0;

  for (const std::size_t feature : features) {
    std::set<double> distinct;
    for (std::size_t i = 0; i < X.size(); ++i) distinct.insert(X[i][feature]);
    std::vector<double> values(distinct.begin(), distinct.end());

    for (std::size_t position = 0; position + 1 < values.size(); ++position) {
      const double threshold = (values[position] + values[position + 1]) / 2.0;
      std::vector<int> left, right;
      for (std::size_t i = 0; i < X.size(); ++i) {
        if (X[i][feature] <= threshold) {
          left.push_back(y[i]);
        } else {
          right.push_back(y[i]);
        }
      }
      if (left.empty() || right.empty()) continue;

      const double weighted =
          static_cast<double>(left.size()) / static_cast<double>(y.size()) * Gini(left) +
          static_cast<double>(right.size()) / static_cast<double>(y.size()) * Gini(right);
      if (weighted < best_impurity) {
        best_impurity = weighted;
        best_feature = feature;
        best_threshold = threshold;
        found = true;
      }
    }
  }

  if (!found) return node;

  std::vector<std::vector<double>> left_X, right_X;
  std::vector<int> left_y, right_y;
  for (std::size_t i = 0; i < X.size(); ++i) {
    if (X[i][best_feature] <= best_threshold) {
      left_X.push_back(X[i]);
      left_y.push_back(y[i]);
    } else {
      right_X.push_back(X[i]);
      right_y.push_back(y[i]);
    }
  }

  node->leaf = false;
  node->feature = best_feature;
  node->threshold = best_threshold;
  node->left = BuildTree(left_X, left_y, m_try, generator, depth + 1, max_depth);
  node->right = BuildTree(right_X, right_y, m_try, generator, depth + 1, max_depth);
  return node;
}

std::vector<std::unique_ptr<Node>> Fit(const std::vector<std::vector<double>>& X,
                                       const std::vector<int>& y,
                                       std::size_t n_trees,
                                       std::size_t m_try,
                                       unsigned seed) {
  std::mt19937 generator(seed);
  std::uniform_int_distribution<std::size_t> pick(0, X.size() - 1);

  std::vector<std::unique_ptr<Node>> forest;
  for (std::size_t tree = 0; tree < n_trees; ++tree) {
    std::vector<std::vector<double>> sample_X;
    std::vector<int> sample_y;
    // n draws with replacement: about 37% of rows fall outside each sample.
    for (std::size_t i = 0; i < X.size(); ++i) {
      const std::size_t index = pick(generator);
      sample_X.push_back(X[index]);
      sample_y.push_back(y[index]);
    }
    forest.push_back(BuildTree(sample_X, sample_y, m_try, generator, 0, 20));
  }
  return forest;
}`,
        profile: 'O(B * n^2 * d_try), and every tree materializes its own full copy of the bootstrap sample before it starts.',
      },
      'make-it-right': {
        code: `// Random forest - flat arenas, index partitioning, per-tree RNG, RAII.
#include <algorithm>
#include <cstddef>
#include <numeric>
#include <random>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

struct TreeNode {
  int prediction = 0;
  int feature = -1;          // negative marks a leaf
  double threshold = 0.0;
  std::size_t left = 0;
  std::size_t right = 0;

  [[nodiscard]] bool IsLeaf() const noexcept { return feature < 0; }
};

// One tree is a flat arena of nodes; children are indices. Prediction is an
// index walk with no pointer chasing and no per-node allocation.
class Tree {
 public:
  [[nodiscard]] int Predict(std::span<const double> row) const {
    std::size_t cursor = 0;
    while (!nodes_[cursor].IsLeaf()) {
      const TreeNode& node = nodes_[cursor];
      cursor = row[static_cast<std::size_t>(node.feature)] <= node.threshold ? node.left
                                                                             : node.right;
    }
    return nodes_[cursor].prediction;
  }

  std::vector<TreeNode> nodes_;
};

class RandomForest {
 public:
  // x_col is COLUMN-major: feature j occupies x_col[j * n, (j + 1) * n).
  // Split finding sweeps one feature at a time, so features are the
  // contiguous axis.
  RandomForest(std::vector<double> x_col, std::vector<int> y, std::size_t dimension,
               std::size_t n_classes, std::size_t n_trees, std::size_t m_try,
               std::size_t max_depth, unsigned seed)
      : x_(std::move(x_col)),
        y_(std::move(y)),
        dimension_(dimension),
        n_classes_(n_classes),
        m_try_(m_try),
        max_depth_(max_depth) {
    if (dimension_ == 0 || y_.empty()) throw std::invalid_argument("empty problem");
    if (x_.size() != y_.size() * dimension_) {
      throw std::invalid_argument("X and y describe different row counts");
    }
    if (n_trees == 0) throw std::invalid_argument("n_trees must be at least 1");
    if (m_try_ == 0 || m_try_ > dimension_) {
      throw std::invalid_argument("m_try must lie in [1, dimension]");
    }

    trees_.reserve(n_trees);
    std::mt19937 seeder(seed);

    for (std::size_t tree = 0; tree < n_trees; ++tree) {
      // Each tree owns its generator, seeded deterministically. Sharing one
      // generator would make the fit depend on tree ordering, which becomes a
      // reproducibility bug the moment the loop is parallelized.
      std::mt19937 generator(seeder());
      std::uniform_int_distribution<std::size_t> pick(0, y_.size() - 1);

      std::vector<std::size_t> rows(y_.size());
      for (std::size_t i = 0; i < rows.size(); ++i) rows[i] = pick(generator);

      Tree grown;
      Grow(rows, grown, generator, 0);
      trees_.push_back(std::move(grown));
    }
  }

  [[nodiscard]] int Predict(std::span<const double> row) const {
    std::vector<int> votes(n_classes_, 0);
    for (const Tree& tree : trees_) votes[static_cast<std::size_t>(tree.Predict(row))] += 1;
    return static_cast<int>(
        std::distance(votes.begin(), std::max_element(votes.begin(), votes.end())));
  }

  [[nodiscard]] std::size_t TreeCount() const noexcept { return trees_.size(); }

 private:
  [[nodiscard]] double Value(std::size_t row, std::size_t feature) const {
    return x_[feature * y_.size() + row];
  }

  [[nodiscard]] static double Impurity(std::span<const long> counts, std::size_t total) {
    if (total == 0) return 0.0;
    double impurity = 1.0;
    for (const long count : counts) {
      const double proportion = static_cast<double>(count) / static_cast<double>(total);
      impurity -= proportion * proportion;
    }
    return impurity;
  }

  std::size_t Grow(std::vector<std::size_t>& rows, Tree& tree, std::mt19937& generator,
                   std::size_t depth) const {
    std::vector<long> counts(n_classes_, 0);
    for (const std::size_t row : rows) counts[static_cast<std::size_t>(y_[row])] += 1;

    const std::size_t index = tree.nodes_.size();
    tree.nodes_.push_back(TreeNode{
        static_cast<int>(
            std::distance(counts.begin(), std::max_element(counts.begin(), counts.end()))),
        -1, 0.0, 0, 0});

    if (depth >= max_depth_ || rows.size() < 2) return index;

    // Redrawn at every node, not once per tree.
    std::vector<std::size_t> features(dimension_);
    std::iota(features.begin(), features.end(), 0);
    std::shuffle(features.begin(), features.end(), generator);
    features.resize(m_try_);

    double best_impurity = Impurity(counts, rows.size());
    bool found = false;
    std::size_t best_feature = 0;
    double best_threshold = 0.0;

    std::vector<long> left(n_classes_, 0);
    std::vector<long> right(n_classes_, 0);

    for (const std::size_t feature : features) {
      std::sort(rows.begin(), rows.end(), [&](std::size_t a, std::size_t b) {
        return Value(a, feature) < Value(b, feature);
      });

      std::fill(left.begin(), left.end(), 0);
      right = counts;

      for (std::size_t position = 0; position + 1 < rows.size(); ++position) {
        left[static_cast<std::size_t>(y_[rows[position]])] += 1;
        right[static_cast<std::size_t>(y_[rows[position]])] -= 1;

        const double here = Value(rows[position], feature);
        const double next = Value(rows[position + 1], feature);
        if (here == next) continue;

        const std::size_t n_left = position + 1;
        const std::size_t n_right = rows.size() - n_left;
        const double weighted = (static_cast<double>(n_left) * Impurity(left, n_left) +
                                 static_cast<double>(n_right) * Impurity(right, n_right)) /
                                static_cast<double>(rows.size());

        if (weighted < best_impurity) {
          best_impurity = weighted;
          best_feature = feature;
          best_threshold = (here + next) / 2.0;
          found = true;
        }
      }
    }

    if (!found) return index;

    // Partition the index buffer in place; no sample data is copied.
    const auto pivot = std::stable_partition(
        rows.begin(), rows.end(),
        [&](std::size_t row) { return Value(row, best_feature) <= best_threshold; });
    std::vector<std::size_t> left_rows(rows.begin(), pivot);
    std::vector<std::size_t> right_rows(pivot, rows.end());
    if (left_rows.empty() || right_rows.empty()) return index;

    const std::size_t left_index = Grow(left_rows, tree, generator, depth + 1);
    const std::size_t right_index = Grow(right_rows, tree, generator, depth + 1);

    tree.nodes_[index].feature = static_cast<int>(best_feature);
    tree.nodes_[index].threshold = best_threshold;
    tree.nodes_[index].left = left_index;
    tree.nodes_[index].right = right_index;
    return index;
  }

  std::vector<double> x_;    // column-major, owned; shared by every tree
  std::vector<int> y_;
  std::size_t dimension_;
  std::size_t n_classes_;
  std::size_t m_try_;
  std::size_t max_depth_;
  std::vector<Tree> trees_;
};`,
        rationale:
          'The bootstrap stops copying: each tree gets an index buffer of sampled row ids and every tree reads the same shared column-major matrix, so B trees no longer mean B copies of the dataset. Nodes move from a unique_ptr graph to a flat arena of indices, removing an allocation per node and turning prediction into a contiguous index walk. Split finding sorts once per candidate feature and sweeps incrementally rather than rescanning. And each tree owns a deterministically seeded generator rather than sharing one, which is what keeps the fit reproducible once the tree loop is parallelized — a bug that does not exist yet and would be very hard to find later.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(B * n * d_try * log n), one shared design matrix, one arena per tree.',
      },
      'make-it-fast': {
        code: `// Random forest - trees grown in parallel, flat node arrays for prediction.
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <span>
#include <vector>

// Trees are independent, which is the defining property of bagging and the
// reason this is the best-scaling model in the section: no communication, no
// shared mutable state, no synchronization anywhere in the fit.
//
// Prediction uses a struct-of-arrays layout rather than an array of node
// structs, so a traversal touches only the two arrays it needs at each level
// instead of pulling a whole cache line of unused fields.
struct FlatForest {
  std::vector<std::int32_t> feature;     // negative marks a leaf
  std::vector<float> threshold;
  std::vector<std::int32_t> left;
  std::vector<std::int32_t> right;
  std::vector<std::int32_t> value;
  std::vector<std::size_t> tree_offset;  // where each tree's nodes begin
};

template <typename Grower>
FlatForest FitParallel(Grower&& grow_one, std::size_t n_trees, unsigned seed) {
  std::vector<FlatForest> per_tree(n_trees);

  // Each iteration writes only its own slot, so there is nothing to guard.
#pragma omp parallel for schedule(dynamic)
  for (std::size_t tree = 0; tree < n_trees; ++tree) {
    // The seed is derived from the tree index, not drawn from a shared
    // generator: the fit must not depend on the order threads happen to run.
    per_tree[tree] = grow_one(seed + static_cast<unsigned>(tree));
  }

  FlatForest forest;
  for (const FlatForest& one : per_tree) {
    forest.tree_offset.push_back(forest.feature.size());
    const auto base = static_cast<std::int32_t>(forest.feature.size());
    forest.feature.insert(forest.feature.end(), one.feature.begin(), one.feature.end());
    forest.threshold.insert(forest.threshold.end(), one.threshold.begin(), one.threshold.end());
    forest.value.insert(forest.value.end(), one.value.begin(), one.value.end());
    for (const std::int32_t child : one.left) forest.left.push_back(child + base);
    for (const std::int32_t child : one.right) forest.right.push_back(child + base);
  }
  return forest;
}

// Scores a whole batch. Rows are independent, so the outer loop parallelizes;
// the inner loop over trees stays sequential because at that granularity the
// fork-join overhead exceeds the work.
std::vector<int> PredictBatch(const FlatForest& forest, std::span<const float> x_row_major,
                              std::size_t dimension, std::size_t n_classes) {
  const std::size_t n = x_row_major.size() / dimension;
  std::vector<int> out(n);

#pragma omp parallel for schedule(static)
  for (std::size_t i = 0; i < n; ++i) {
    // Row-major here on purpose: prediction walks one ROW across many
    // features, the opposite access pattern from split finding.
    const float* row = x_row_major.data() + i * dimension;
    std::vector<int> votes(n_classes, 0);

    for (const std::size_t offset : forest.tree_offset) {
      auto cursor = static_cast<std::int32_t>(offset);
      while (forest.feature[static_cast<std::size_t>(cursor)] >= 0) {
        const auto node = static_cast<std::size_t>(cursor);
        cursor = row[static_cast<std::size_t>(forest.feature[node])] <= forest.threshold[node]
                     ? forest.left[node]
                     : forest.right[node];
      }
      votes[static_cast<std::size_t>(forest.value[static_cast<std::size_t>(cursor)])] += 1;
    }

    out[i] = static_cast<int>(
        std::distance(votes.begin(), std::max_element(votes.begin(), votes.end())));
  }

  return out;
}`,
        rationale:
          'The fit parallelizes across trees, which is the whole point of bagging: the trees never communicate, so this is a pure fork-join with no shared mutable state and no synchronization. The one subtlety is seeding — each tree derives its seed from its index rather than drawing from a shared generator, or the fitted forest would depend on the order threads happened to run and reproducibility would quietly disappear. Prediction switches to a struct-of-arrays layout and a row-major query matrix, because inference walks one row across many features while split finding walks one feature across many rows, and those are opposite access patterns that deserve opposite layouts.',
        optimizations: [
          {
            technique: 'OpenMP for data-parallel loops',
            why: 'Trees are grown independently and each writes only its own output slot, so the fit scales across cores essentially linearly with no coordination.',
            tradeoff: 'Peak memory is B trees under construction at once rather than one, and a dynamic schedule is needed because tree depths vary — which costs scheduling overhead but avoids one long tree stalling a static partition.',
          },
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'Prediction reads one row across scattered features, so the query matrix is stored row-major even though the training matrix is column-major for split finding.',
            tradeoff: 'Two layouts of the same data means either a transpose at the boundary or two resident copies — an explicit cost accepted because the two phases genuinely want opposite orders.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'The traversal is a tight branchy loop over int32 arrays whose performance depends entirely on the compiler unrolling it and predicting well.',
            tradeoff: '-march=native emits instructions that may not exist on an older machine in the fleet, and aggressive inlining of the traversal can bloat the instruction cache for very deep forests.',
          },
        ],
        libraryName: 'OpenMP',
        profile: 'O(B * n * d_try * log n / cores) to fit, O(B * depth) per query. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Random forest - bootstrap, random feature subsets, average. Transcribed.

use std::collections::{HashMap, HashSet};

fn gini(labels: &[i32]) -> f64 {
    if labels.is_empty() {
        return 0.0;
    }
    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &label in labels {
        *counts.entry(label).or_insert(0) += 1;
    }
    let mut impurity = 1.0;
    for count in counts.values() {
        let proportion = *count as f64 / labels.len() as f64;
        impurity -= proportion * proportion;
    }
    impurity
}

fn majority(labels: &[i32]) -> i32 {
    let mut counts: HashMap<i32, usize> = HashMap::new();
    for &label in labels {
        *counts.entry(label).or_insert(0) += 1;
    }
    counts.into_iter().max_by_key(|&(_, count)| count).map_or(0, |(label, _)| label)
}

pub enum Node {
    Leaf { prediction: i32 },
    Split { feature: usize, threshold: f64, left: Box<Node>, right: Box<Node> },
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
    fn below(&mut self, limit: usize) -> usize {
        (self.next_u64() % limit as u64) as usize
    }
}

fn build_tree(
    x: &[Vec<f64>],
    y: &[i32],
    m_try: usize,
    rng: &mut Lcg,
    depth: usize,
    max_depth: usize,
) -> Node {
    if depth >= max_depth || y.iter().collect::<HashSet<_>>().len() <= 1 {
        return Node::Leaf { prediction: majority(y) };
    }

    // Redrawn at EVERY node. Drawing once per tree would give a forest of
    // fixed random subspaces, which decorrelates far less.
    let d = x[0].len();
    let mut features: Vec<usize> = (0..d).collect();
    for index in (1..d).rev() {
        features.swap(index, rng.below(index + 1));
    }
    features.truncate(m_try);

    let mut best_impurity = gini(y);
    let mut best: Option<(usize, f64)> = None;

    for &feature in &features {
        let mut values: Vec<f64> = x.iter().map(|row| row[feature]).collect();
        values.sort_by(|a, b| a.total_cmp(b));
        values.dedup();

        for position in 0..values.len().saturating_sub(1) {
            let threshold = (values[position] + values[position + 1]) / 2.0;
            let mut left = Vec::new();
            let mut right = Vec::new();
            for i in 0..x.len() {
                if x[i][feature] <= threshold {
                    left.push(y[i]);
                } else {
                    right.push(y[i]);
                }
            }
            if left.is_empty() || right.is_empty() {
                continue;
            }

            let weighted = left.len() as f64 / y.len() as f64 * gini(&left)
                + right.len() as f64 / y.len() as f64 * gini(&right);
            if weighted < best_impurity {
                best_impurity = weighted;
                best = Some((feature, threshold));
            }
        }
    }

    let Some((feature, threshold)) = best else {
        return Node::Leaf { prediction: majority(y) };
    };

    let mut left_x = Vec::new();
    let mut left_y = Vec::new();
    let mut right_x = Vec::new();
    let mut right_y = Vec::new();
    for i in 0..x.len() {
        if x[i][feature] <= threshold {
            left_x.push(x[i].clone());
            left_y.push(y[i]);
        } else {
            right_x.push(x[i].clone());
            right_y.push(y[i]);
        }
    }

    Node::Split {
        feature,
        threshold,
        left: Box::new(build_tree(&left_x, &left_y, m_try, rng, depth + 1, max_depth)),
        right: Box::new(build_tree(&right_x, &right_y, m_try, rng, depth + 1, max_depth)),
    }
}

pub fn fit(x: &[Vec<f64>], y: &[i32], n_trees: usize, m_try: usize, seed: u64) -> Vec<Node> {
    let mut rng = Lcg::new(seed);
    let mut forest = Vec::new();

    for _ in 0..n_trees {
        // n draws with replacement: about 37% of rows fall outside each sample.
        let mut sample_x = Vec::new();
        let mut sample_y = Vec::new();
        for _ in 0..x.len() {
            let index = rng.below(x.len());
            sample_x.push(x[index].clone());
            sample_y.push(y[index]);
        }
        forest.push(build_tree(&sample_x, &sample_y, m_try, &mut rng, 0, 20));
    }

    forest
}`,
        profile: 'O(B * n^2 * d_try), and every tree clones a full copy of its bootstrap sample before any split is considered.',
      },
      'make-it-right': {
        code: `//! Random forest - typed errors, flat arenas, index partitioning, no clones.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum ForestError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
    InvalidMTry { m_try: usize, dimension: usize },
    NoTrees,
}

impl fmt::Display for ForestError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "empty dataset or zero dimension"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
            Self::InvalidMTry { m_try, dimension } => {
                write!(f, "m_try={m_try} outside [1, {dimension}]")
            }
            Self::NoTrees => write!(f, "n_trees must be at least 1"),
        }
    }
}

impl std::error::Error for ForestError {}

/// Features considered per split - the decorrelation dial. A newtype because
/// m_try, n_trees and max_depth are three bare usize in one signature, and
/// transposing any two produces a valid model that is not the requested one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MTry(usize);

impl MTry {
    pub fn new(value: usize, dimension: usize) -> Result<Self, ForestError> {
        if value == 0 || value > dimension {
            return Err(ForestError::InvalidMTry { m_try: value, dimension });
        }
        Ok(Self(value))
    }

    /// The standard default: sqrt(d) for classification.
    #[must_use]
    pub fn sqrt_default(dimension: usize) -> Self {
        Self((dimension as f64).sqrt() as usize).max_one()
    }

    fn max_one(self) -> Self {
        Self(self.0.max(1))
    }
}

#[derive(Debug, Clone, Copy)]
pub enum TreeNode {
    Leaf { prediction: u32 },
    Split { feature: usize, threshold: f64, left: usize, right: usize },
}

/// Nodes in one flat arena; children are indices, so prediction is a walk.
pub struct Tree {
    nodes: Vec<TreeNode>,
}

impl Tree {
    #[must_use]
    pub fn predict(&self, row: &[f64]) -> u32 {
        let mut cursor = 0;
        loop {
            match self.nodes[cursor] {
                TreeNode::Leaf { prediction } => return prediction,
                TreeNode::Split { feature, threshold, left, right } => {
                    cursor = if row[feature] <= threshold { left } else { right };
                }
            }
        }
    }
}

pub struct RandomForest {
    trees: Vec<Tree>,
    n_classes: usize,
    dimension: usize,
    /// Out-of-bag accuracy: roughly 37% of rows sit outside each bootstrap,
    /// giving an honest holdout without splitting the data.
    pub oob_accuracy: f64,
}

impl RandomForest {
    /// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
    pub fn fit(
        x_col: &[f64],
        y: &[u32],
        dimension: usize,
        n_classes: usize,
        n_trees: usize,
        m_try: MTry,
        max_depth: usize,
        seed: u64,
    ) -> Result<Self, ForestError> {
        if dimension == 0 || y.is_empty() {
            return Err(ForestError::Empty);
        }
        if x_col.len() != y.len() * dimension {
            return Err(ForestError::ShapeMismatch {
                expected: y.len() * dimension,
                found: x_col.len(),
            });
        }
        if n_trees == 0 {
            return Err(ForestError::NoTrees);
        }

        let n = y.len();
        let mut trees = Vec::with_capacity(n_trees);
        let mut oob_votes = vec![0_u32; n * n_classes];

        for tree_index in 0..n_trees {
            // Seed derived from the tree index, not drawn from a shared
            // generator: the fit must not depend on evaluation order, which is
            // what keeps it reproducible once this loop is parallelized.
            let mut rng = Lcg::new(seed ^ (tree_index as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));

            let mut rows = Vec::with_capacity(n);
            let mut in_bag = vec![false; n];
            for _ in 0..n {
                let index = rng.below(n);
                in_bag[index] = true;
                rows.push(index);
            }

            let mut builder = Builder {
                x: x_col,
                y,
                n,
                dimension,
                n_classes,
                m_try: m_try.0,
                max_depth,
                nodes: Vec::new(),
            };
            builder.grow(&mut rows, &mut rng, 0);
            let tree = Tree { nodes: builder.nodes };

            for row in 0..n {
                if in_bag[row] {
                    continue;
                }
                let slice = &x_col[..];
                let features: Vec<f64> =
                    (0..dimension).map(|j| slice[j * n + row]).collect();
                oob_votes[row * n_classes + tree.predict(&features) as usize] += 1;
            }

            trees.push(tree);
        }

        let mut scored = 0_usize;
        let mut correct = 0_usize;
        for row in 0..n {
            let votes = &oob_votes[row * n_classes..(row + 1) * n_classes];
            if votes.iter().sum::<u32>() == 0 {
                continue;
            }
            scored += 1;
            let predicted = votes
                .iter()
                .enumerate()
                .max_by_key(|&(_, &count)| count)
                .map_or(0, |(class, _)| class as u32);
            if predicted == y[row] {
                correct += 1;
            }
        }

        Ok(Self {
            trees,
            n_classes,
            dimension,
            oob_accuracy: if scored == 0 { 0.0 } else { correct as f64 / scored as f64 },
        })
    }

    #[must_use]
    pub fn predict(&self, row: &[f64]) -> u32 {
        debug_assert_eq!(row.len(), self.dimension);
        let mut votes = vec![0_u32; self.n_classes];
        for tree in &self.trees {
            votes[tree.predict(row) as usize] += 1;
        }
        votes
            .iter()
            .enumerate()
            .max_by_key(|&(_, &count)| count)
            .map_or(0, |(class, _)| class as u32)
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
    fn below(&mut self, limit: usize) -> usize {
        (self.next_u64() % limit as u64) as usize
    }
}

struct Builder<'a> {
    x: &'a [f64],
    y: &'a [u32],
    n: usize,
    dimension: usize,
    n_classes: usize,
    m_try: usize,
    max_depth: usize,
    nodes: Vec<TreeNode>,
}

impl Builder<'_> {
    #[inline]
    fn value(&self, row: usize, feature: usize) -> f64 {
        self.x[feature * self.n + row]
    }

    fn impurity(counts: &[usize], total: usize) -> f64 {
        if total == 0 {
            return 0.0;
        }
        1.0 - counts
            .iter()
            .map(|&count| {
                let proportion = count as f64 / total as f64;
                proportion * proportion
            })
            .sum::<f64>()
    }

    fn grow(&mut self, rows: &mut [usize], rng: &mut Lcg, depth: usize) -> usize {
        let mut counts = vec![0_usize; self.n_classes];
        for &row in rows.iter() {
            counts[self.y[row] as usize] += 1;
        }
        let prediction = counts
            .iter()
            .enumerate()
            .max_by_key(|&(_, &count)| count)
            .map_or(0, |(class, _)| class as u32);

        let index = self.nodes.len();
        self.nodes.push(TreeNode::Leaf { prediction });

        if depth >= self.max_depth || rows.len() < 2 {
            return index;
        }

        let mut features: Vec<usize> = (0..self.dimension).collect();
        for position in (1..self.dimension).rev() {
            features.swap(position, rng.below(position + 1));
        }
        features.truncate(self.m_try);

        let mut best_impurity = Self::impurity(&counts, rows.len());
        let mut best: Option<(usize, f64)> = None;
        let mut left = vec![0_usize; self.n_classes];
        let mut right = vec![0_usize; self.n_classes];

        for &feature in &features {
            rows.sort_unstable_by(|&a, &b| {
                self.value(a, feature).total_cmp(&self.value(b, feature))
            });
            left.iter_mut().for_each(|slot| *slot = 0);
            right.copy_from_slice(&counts);

            for position in 0..rows.len().saturating_sub(1) {
                let label = self.y[rows[position]] as usize;
                left[label] += 1;
                right[label] -= 1;

                let here = self.value(rows[position], feature);
                let next = self.value(rows[position + 1], feature);
                if here == next {
                    continue;
                }

                let n_left = position + 1;
                let n_right = rows.len() - n_left;
                let weighted = (n_left as f64 * Self::impurity(&left, n_left)
                    + n_right as f64 * Self::impurity(&right, n_right))
                    / rows.len() as f64;

                if weighted < best_impurity {
                    best_impurity = weighted;
                    best = Some((feature, (here + next) / 2.0));
                }
            }
        }

        let Some((feature, threshold)) = best else {
            return index;
        };

        // Partition the index buffer in place; no sample data is copied.
        let mut boundary = 0;
        for position in 0..rows.len() {
            if self.value(rows[position], feature) <= threshold {
                rows.swap(boundary, position);
                boundary += 1;
            }
        }
        if boundary == 0 || boundary == rows.len() {
            return index;
        }

        let (left_rows, right_rows) = rows.split_at_mut(boundary);
        let left_index = self.grow(left_rows, rng, depth + 1);
        let right_index = self.grow(right_rows, rng, depth + 1);

        self.nodes[index] = TreeNode::Split { feature, threshold, left: left_index, right: right_index };
        index
    }
}
`,
        rationale:
          'The bootstrap stops cloning: a tree gets an index buffer of sampled row ids, every tree reads the same shared column-major matrix, and children partition that buffer in place through split_at_mut. Boxed nodes become a flat arena of indices. Errors become a typed Result and m_try gets a validated newtype, since m_try, n_trees and max_depth are three bare usize in one signature and transposing any two yields a valid model that is not the one asked for. The out-of-bag estimate becomes a real output — the rows outside each bootstrap are voted on by exactly the trees that never saw them. And each tree derives its seed from its index rather than sharing a generator, which is what keeps the fit reproducible when this loop is parallelized in the next stage.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(B * n * d_try * log n), one shared design matrix, one arena per tree, no row copies.',
      },
      'make-it-fast': {
        code: `//! Random forest - trees grown in parallel, batch scoring across rows.

use rayon::prelude::*;

#[derive(Debug, Clone, Copy)]
pub enum TreeNode {
    Leaf { prediction: u32 },
    Split { feature: usize, threshold: f64, left: usize, right: usize },
}

pub struct Tree {
    pub nodes: Vec<TreeNode>,
}

impl Tree {
    #[inline]
    #[must_use]
    pub fn predict(&self, row: &[f64]) -> u32 {
        let mut cursor = 0;
        loop {
            match self.nodes[cursor] {
                TreeNode::Leaf { prediction } => return prediction,
                TreeNode::Split { feature, threshold, left, right } => {
                    cursor = if row[feature] <= threshold { left } else { right };
                }
            }
        }
    }
}

pub struct ParallelForest {
    trees: Vec<Tree>,
    n_classes: usize,
    dimension: usize,
}

impl ParallelForest {
    /// Trees are independent, which is the defining property of bagging and
    /// the reason this scales better than anything else in the section: no
    /// communication, no shared mutable state, no synchronization at all.
    ///
    /// The seed is a pure function of the tree index rather than drawn from a
    /// shared generator, so the fitted forest does not depend on the order
    /// rayon happens to schedule the work - reproducibility is preserved.
    #[must_use]
    pub fn fit<F>(grow_one: F, n_trees: usize, n_classes: usize, dimension: usize, seed: u64) -> Self
    where
        F: Fn(u64) -> Tree + Sync + Send,
    {
        let mut trees = Vec::with_capacity(n_trees);
        (0..n_trees)
            .into_par_iter()
            .map(|index| grow_one(seed ^ (index as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15)))
            .collect_into_vec(&mut trees);

        Self { trees, n_classes, dimension }
    }

    /// Scores a whole batch. Rows are independent of each other, so the batch
    /// is a parallel map; the inner loop over trees stays sequential, because
    /// at that granularity fork-join overhead exceeds the traversal itself.
    ///
    /// \`x_row_major\` is row-major on purpose: prediction walks one ROW across
    /// many features, the opposite access pattern from split finding.
    #[must_use]
    pub fn predict_batch(&self, x_row_major: &[f64]) -> Vec<u32> {
        x_row_major
            .par_chunks_exact(self.dimension)
            .map(|row| {
                let mut votes = vec![0_u32; self.n_classes];
                for tree in &self.trees {
                    votes[tree.predict(row) as usize] += 1;
                }
                votes
                    .iter()
                    .enumerate()
                    .max_by_key(|&(_, &count)| count)
                    .map_or(0, |(class, _)| class as u32)
            })
            .collect()
    }

    /// Permutation importance, the honest alternative to impurity importance.
    ///
    /// Shuffle one feature and measure how much accuracy falls. Features are
    /// independent of each other here, so the whole analysis is a parallel map
    /// over features rather than a sequential sweep.
    #[must_use]
    pub fn permutation_importance(
        &self,
        x_row_major: &[f64],
        y: &[u32],
        baseline: f64,
    ) -> Vec<f64> {
        (0..self.dimension)
            .into_par_iter()
            .map(|feature| {
                let mut permuted: Vec<f64> = x_row_major.to_vec();
                let n = y.len();
                for row in 0..n {
                    let partner = (row * 2_654_435_761) % n;
                    permuted.swap(row * self.dimension + feature, partner * self.dimension + feature);
                }
                let predictions = self.predict_batch(&permuted);
                let accuracy = predictions
                    .iter()
                    .zip(y)
                    .filter(|(predicted, actual)| predicted == actual)
                    .count() as f64
                    / n as f64;
                baseline - accuracy
            })
            .collect()
    }
}
`,
        rationale:
          'Both the fit and the scoring become parallel maps, at the granularity where the parallelism actually exists. Trees are grown across cores because they never communicate; a batch is scored across rows because rows are independent; and the inner loop over trees stays sequential, since at that granularity the fork-join overhead exceeds a traversal of a few dozen comparisons. The seed remains a pure function of the tree index, which is what makes a parallel fit reproducible rather than schedule-dependent. Permutation importance is included here rather than earlier because it is only affordable once scoring is parallel — it costs a full rescore per feature, and it is the honest alternative to the biased impurity importances a forest hands out for free.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Trees during fitting, rows during scoring, and features during permutation importance are all independent, so each is a parallel map with no locking and no atomics.',
            tradeoff: 'Peak memory is B trees under construction at once, and permutation importance clones the whole design matrix per feature — parallelism here multiplies memory by core count rather than amortizing it.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The tree vector is sized to the tree count before collect_into_vec fills it, so the largest structure in the model is never grown and copied.',
            tradeoff: 'collect_into_vec ties the code to rayon rather than the standard collect, and the per-row vote vector is still allocated per row — removing that would need a thread-local scratch buffer.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'par_chunks_exact hands each worker one contiguous row, so a traversal reads within a cache line or two rather than striding across a column-major matrix.',
            tradeoff: 'Requires the query matrix in the opposite layout from the training matrix, so either a transpose is paid at the boundary or two copies are kept resident.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(B * n * d_try * log n / cores) to fit, O(B * depth) per row across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
