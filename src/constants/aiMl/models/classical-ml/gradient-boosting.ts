import type { AiMlModel } from '../../types';

export const GRADIENT_BOOSTING: AiMlModel = {
  slug: 'gradient-boosting',
  name: 'Gradient Boosted Trees',
  aliases: ['GBM', 'XGBoost', 'LightGBM', 'CatBoost'],
  category: 'classical-ml',
  group: 'trees-and-ensembles',
  kind: 'model',

  paradigms: ['supervised'],
  taskTypes: ['regression', 'classification', 'ranking', 'anomaly-detection'],

  intuition:
    'Fit a shallow tree, look at what it got wrong, then fit another tree to those errors, and keep going. Each tree is deliberately weak — a few splits, shrunk by a small learning rate — so no single one can overfit, and the ensemble corrects itself gradually. Random Forest averages many independent strong trees to reduce variance; boosting chains many dependent weak trees to reduce bias, which is why the two behave so differently despite both being tree ensembles.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\mathcal{L} = \\sum_{i=1}^{n} \\ell\\bigl(y_i, \\hat{y}_i^{(t-1)} + f_t(\\mathbf{x}_i)\\bigr) + \\Omega(f_t), \\qquad \\Omega(f) = \\gamma T + \\tfrac{1}{2}\\lambda \\lVert \\mathbf{w} \\rVert^2',
      symbols: [
        { symbol: '\\hat{y}^{(t-1)}', meaning: 'the ensemble prediction before adding tree t' },
        { symbol: 'f_t', meaning: 'the tree being added at this round' },
        { symbol: 'T', meaning: 'number of leaves — the complexity being penalized' },
        { symbol: '\\lambda, \\gamma', meaning: 'L2 on leaf weights, and the per-leaf cost that prunes splits' },
      ],
    },
    reading:
      'Minimize any differentiable loss, one additive tree at a time, with an explicit penalty on tree complexity. The loss is a free choice — squared error, log loss, pinball for quantiles, a ranking objective — and that generality is the framework\'s real advantage: swapping the objective changes what the model optimizes without changing anything else.',
  },

  optimization: {
    method: 'Stage-wise additive fitting; each tree does a second-order Newton step on the loss',
    updateRule: {
      formula:
        'w_j^{*} = -\\frac{\\sum_{i \\in I_j} g_i}{\\sum_{i \\in I_j} h_i + \\lambda}, \\qquad \\hat{y}^{(t)} = \\hat{y}^{(t-1)} + \\eta \\, f_t(\\mathbf{x})',
      symbols: [
        { symbol: 'g_i, h_i', meaning: 'first and second derivatives of the loss at the current prediction' },
        { symbol: 'I_j', meaning: 'the training rows landing in leaf j' },
        { symbol: '\\eta', meaning: 'learning rate — shrinks every tree so later ones still have work to do' },
      ],
    },
    rationale:
      'Each tree fits the negative gradient of the loss, which is why it is called gradient boosting; modern implementations use the second derivative too, making each leaf a Newton step rather than a gradient step. Shrinkage is what makes it work in practice: without it the first few trees absorb most of the signal and the ensemble overfits. Shrinkage and tree count trade off directly — halving the learning rate roughly doubles the trees needed, and the smaller rate almost always generalizes better.',
    hyperparameters: [
      { name: 'learning rate', role: 'Shrinks each tree; lower generalizes better but needs more rounds', typicalRange: '0.01 to 0.1' },
      { name: 'n_estimators', role: 'Rounds; set high and let early stopping pick the number', typicalRange: '100 to 5,000 with early stopping' },
      { name: 'max_depth / num_leaves', role: 'Interaction order the model can express; 6 means 6-way interactions', typicalRange: 'depth 3 to 8' },
      { name: 'subsample / colsample', role: 'Row and column sampling per tree — variance reduction plus speed', typicalRange: '0.5 to 1.0' },
      { name: 'min_child_weight', role: 'Minimum Hessian mass per leaf; the main guard against fitting noise', typicalRange: '1 to 100' },
      { name: 'lambda / gamma', role: 'L2 on leaf values and the per-leaf split cost', typicalRange: 'lambda 0 to 10' },
    ],
    convergence:
      'Training loss decreases monotonically by construction, which is precisely why it is a useless stopping signal — it will keep falling long past the point where validation loss turns. Early stopping on a held-out set is not optional. The characteristic failure is memorization on small or noisy data: deep trees with a high learning rate will fit the noise perfectly and validate badly, and unlike a neural net there is no implicit regularization to save you.',
    complexity:
      'O(n · d · trees) naively; histogram-based implementations bin features once and drop it to O(n · bins · trees), which is the algorithmic change that made LightGBM and XGBoost fast. Memory is O(n · d) for the binned matrix.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'primary',
        how: 'Reframe forecasting as tabular regression: the target is the value at t+h, the features are lags, rolling statistics, calendar terms, and exogenous drivers. Fit one global model across all series with the series id as a categorical feature.',
        where: [
          'Retail demand forecasting across thousands of SKUs — the winning approach in most M-competition entries',
          'Energy and load forecasting where weather and price drivers dominate',
          'Any forecast where exogenous variables matter more than the autocorrelation does',
        ],
        why: 'It wins whenever drivers matter more than the series\' own history, because trees handle heterogeneous tabular features and nonlinear interactions natively while ARIMA cannot use them at all. The trade-off is fundamental and worth stating: a tree cannot extrapolate beyond the target range it saw in training, so a series with a genuine trend must be differenced first or the forecast will flatline at the historical maximum.',
        featurization: [
          'Lags at the seasonal period, plus rolling mean/std/min/max over trailing windows',
          'Calendar features as categoricals, and Fourier terms for smooth seasonality',
          'Difference or detrend the target — this is the mitigation for the extrapolation limit',
        ],
        evaluation:
          'Rolling-origin backtesting with an expanding window, scored with MASE against seasonal naive. Early stopping must use a time-based validation split, never a random one.',
        pitfalls: [
          'Cannot extrapolate a trend — the single most common failure, and it looks like a plateau not an error',
          'Random-split early stopping leaks the future and picks far too many rounds',
          'Rolling features computed before the split leak future statistics backwards',
        ],
      },
      'anomaly-detection': {
        fit: 'viable',
        how: 'Two routes. Supervised, when labelled anomalies exist: fit with heavy class weighting and threshold the score. Or residual-based: fit a forecast model and flag points whose actual value deviates sharply from the prediction.',
        where: [
          'Fraud detection with confirmed chargeback labels',
          'Forecast-residual monitoring on business metrics, where the model defines expected behaviour',
        ],
        why: 'Excellent when anomalies are labelled and recur; it will not catch a novel failure mode, because a discriminative model recognizes only what it has been shown. The residual route is the more broadly useful one, since it needs no anomaly labels at all — just a good forecast.',
        featurization: [
          'Class weighting rather than resampling, to preserve calibration',
          'For the residual route, train on a confirmed-clean window',
        ],
        evaluation:
          'PR-AUC and precision@k at a fixed alert budget, on strictly time-based splits.',
        pitfalls: [
          'Blind to anomaly types absent from training',
          'Resampling to balance classes destroys the calibration a threshold depends on',
        ],
      },
      optimization: {
        fit: 'viable',
        how: 'Supplies the demand, cost, or probability estimates a downstream optimizer consumes, and — via quantile loss — the distributional inputs that stochastic optimization needs.',
        where: [
          'Demand forecasts feeding an inventory or dispatch optimizer',
          'Newsvendor problems where the quantile, not the mean, sets the order quantity',
        ],
        why: 'The decision quality is usually bounded by the forecast rather than by the solver, and this is often the best available forecast on tabular data. Quantile loss matters here specifically: an inventory decision needs the 90th percentile of demand, and a model trained on squared error gives you the mean, which is the wrong number.',
        featurization: [
          'Train separate quantile models, or one model with a pinball objective per quantile',
          'Include the cost drivers the optimizer will trade off, not just the demand drivers',
        ],
        evaluation:
          'Pinball loss at the quantiles the decision actually uses, plus the realized cost of the resulting decisions.',
        pitfalls: [
          'Independently fitted quantiles can cross, producing an incoherent distribution',
          'Optimizing against a point forecast when the decision is asymmetric in over- and under-supply',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'primary',
        how: 'Fit on tabular transaction and account features with heavy class weighting, and pair with SHAP values so a flagged case comes with a reason.',
        where: [
          'Transaction fraud scoring, the industry default',
          'Credit risk where explainability requirements permit a non-linear model',
        ],
        why: 'The strongest available model on tabular data with heterogeneous feature types, and fraud data is exactly that. It loses to logistic regression only where regulation demands a model whose reasons are structurally auditable rather than attributed post hoc.',
        featurization: [
          'Aggregate features over account history windows — velocity, deviation from personal baseline',
          'Strictly time-based splits; random splits leak future fraud patterns backwards',
        ],
        evaluation: 'PR-AUC and value-weighted recall — dollars prevented, not transactions flagged — at a fixed review budget.',
        pitfalls: [
          'Label latency means recent rows are not yet fully labelled and look artificially clean',
          'SHAP explanations are post-hoc attributions, which some regulators do not accept as reasons',
        ],
      },
      'recommendation-ranking': {
        fit: 'primary',
        how: 'Learning-to-rank with a listwise objective such as LambdaRank, scoring candidates from a retrieval stage against query-item features.',
        where: [
          'The reranking stage of a two-stage search or recommendation system',
          'Any ranking problem with rich tabular query-document features',
        ],
        why: 'Still the ranking workhorse: it handles heterogeneous features, trains fast enough to refresh daily, and optimizes the ranking metric directly rather than a pointwise proxy. Deep retrieval finds the candidates; this decides their order.',
        featurization: [
          'Group rows by query so the listwise objective sees whole result sets',
          'Include position as a feature at training time, then zero it at serving to debias',
        ],
        evaluation: 'NDCG@k offline, with online A/B as the decision — offline ranking gains routinely fail to transfer.',
        pitfalls: [
          'Position bias is baked into click logs and must be corrected or the model learns to reproduce the old ranker',
          'The feedback loop means training data reflects what the previous model chose to show',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes to hours. Histogram-based implementations train on millions of rows in minutes on CPU; the GPU variants are faster still but rarely necessary.',
    inferenceProfile:
      'Sub-millisecond for hundreds of trees — a sequence of comparisons with no matrix arithmetic. Compiles to plain branching code, which is why it serves well on CPU at high throughput.',
    retrainingCadence:
      'Daily to weekly in adversarial or fast-moving settings; monthly where the population is stable. Cheap enough that cadence is a product decision, not a compute one.',
    driftAndMonitoring: [
      'Track feature drift per column — trees are robust to monotone transformations but not to a distribution shifting off the trained range',
      'Monitor prediction distribution and calibration, since boosting is not calibrated by default',
      'Watch feature importance stability across refits; a sudden reordering signals an upstream data change',
    ],
    productionGotchas: [
      'Categorical encoding must be pinned with the model — a new level silently changes the split path',
      'Probability outputs need calibration (Platt or isotonic) before any cost-based threshold is applied',
      'Model files are large relative to linear models, and version skew between training and serving libraries silently changes predictions',
    ],
  },

  assumptions: [
    'The signal is expressible as axis-aligned splits — rotated boundaries need many splits to approximate',
    'Training rows are independent, which time-series framing violates and must be handled by the split strategy',
    'The prediction range seen in training covers the range needed at inference — trees cannot extrapolate',
    'Enough data exists that shallow trees on subsampled rows are fitting signal rather than noise',
  ],

  pros: [
    {
      point: 'The strongest general model on tabular data',
      context:
        'Consistently beats deep learning on heterogeneous tabular features, which is most business data. Loses decisively on images, audio, and text, where the structural priors of a neural architecture matter more.',
    },
    {
      point: 'Any differentiable loss can be plugged in',
      context:
        'Quantile, ranking, Poisson, custom asymmetric costs — all without changing the algorithm. This is what makes it usable for the distributional forecasts optimization needs, not just point estimates.',
    },
    {
      point: 'Handles missing values and mixed types natively',
      context:
        'Learns a default direction for missing values rather than requiring imputation, which removes an entire preprocessing stage and its associated leakage risks.',
    },
    {
      point: 'Fast to train and very fast to serve',
      context:
        'Histogram binning made million-row training routine. Serving is branching code with no matrix math, so it runs anywhere at high throughput.',
    },
  ],

  cons: [
    {
      point: 'Cannot extrapolate beyond the training target range',
      context:
        'The defining limitation for forecasting: a trending series produces a flat forecast at the historical maximum. Detrending is the fix, and forgetting it is the most common failure in production forecasting.',
    },
    {
      point: 'Overfits quickly on small or noisy data',
      context:
        'Training loss falls monotonically forever, so it gives no warning. Early stopping on a proper held-out set is mandatory, not advisory.',
    },
    {
      point: 'Probabilities are not calibrated by default',
      context:
        'Fine when only the ranking is used; wrong when a threshold multiplies probability by cost. Needs Platt or isotonic calibration for decision use.',
    },
    {
      point: 'Explanations are post-hoc attributions',
      context:
        'SHAP is informative but is not the same as a model whose structure is inspectable. In regulated credit that distinction is the reason logistic regression still wins.',
    },
  ],

  relatedSlugs: ['random-forest', 'decision-tree', 'logistic-regression'],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Gradient boosting with depth-1 trees (stumps) - the loop, written out.

Each round: compute the residual, fit a stump to it, add a shrunken version to
the running prediction. That is the entire algorithm.
"""


def best_stump(X, residuals):
    """Find the (feature, threshold) split minimizing squared error on the
    residuals. Brute force over every candidate threshold."""
    n, d = len(X), len(X[0])
    best = (None, None, 0.0, 0.0, float("inf"))

    for feature in range(d):
        thresholds = sorted({row[feature] for row in X})
        for threshold in thresholds:
            left = [r for x, r in zip(X, residuals) if x[feature] <= threshold]
            right = [r for x, r in zip(X, residuals) if x[feature] > threshold]
            if not left or not right:
                continue

            left_value = sum(left) / len(left)
            right_value = sum(right) / len(right)
            error = sum((r - left_value) ** 2 for r in left) + sum(
                (r - right_value) ** 2 for r in right
            )
            if error < best[4]:
                best = (feature, threshold, left_value, right_value, error)

    return best[:4]


def fit(X, y, rounds=100, learning_rate=0.1):
    """Returns the base prediction plus the list of stumps."""
    base = sum(y) / len(y)
    predictions = [base] * len(y)
    trees = []

    for _ in range(rounds):
        # Negative gradient of squared error is just the residual.
        residuals = [target - pred for target, pred in zip(y, predictions)]

        feature, threshold, left_value, right_value = best_stump(X, residuals)
        if feature is None:
            break
        trees.append((feature, threshold, left_value, right_value))

        # Shrinkage: add only a fraction, so later trees still have work left.
        for i, row in enumerate(X):
            step = left_value if row[feature] <= threshold else right_value
            predictions[i] += learning_rate * step

    return base, trees


def predict(row, base, trees, learning_rate=0.1):
    total = base
    for feature, threshold, left_value, right_value in trees:
        total += learning_rate * (left_value if row[feature] <= threshold else right_value)
    return total`,
        profile: 'O(rounds · d · n²) — every candidate threshold rescans the whole dataset. Correct, unusably slow.',
      },
      'make-it-right': {
        code: `"""Gradient boosting - typed, early-stopped, with the loss chosen explicitly."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]

Objective = Literal["squared_error", "absolute_error", "poisson", "quantile"]


@dataclass(frozen=True)
class BoostingResult:
    model: HistGradientBoostingRegressor
    best_iteration: int
    n_estimators_requested: int

    @property
    def stopped_early(self) -> bool:
        """If it never stopped early, the round budget was the binding
        constraint - which means the search never found the optimum."""
        return self.best_iteration < self.n_estimators_requested - 1


def fit_forecaster(
    X: Matrix,
    y: Vector,
    objective: Objective = "squared_error",
    quantile: float | None = None,
    max_rounds: int = 2_000,
    learning_rate: float = 0.05,
) -> BoostingResult:
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if objective == "quantile" and quantile is None:
        raise ValueError("quantile objective requires a quantile value")

    model = HistGradientBoostingRegressor(
        loss=objective,
        quantile=quantile,
        learning_rate=learning_rate,
        max_iter=max_rounds,
        # Early stopping is mandatory, not optional: training loss falls
        # monotonically forever and gives no signal about when to stop.
        early_stopping=True,
        n_iter_no_change=50,
        validation_fraction=0.15,
        random_state=0,
    )
    model.fit(X, y)

    return BoostingResult(
        model=model,
        best_iteration=int(model.n_iter_),
        n_estimators_requested=max_rounds,
    )


def timeseries_cv_score(X: Matrix, y: Vector, folds: int = 5) -> float:
    """Rolling-origin CV.

    TimeSeriesSplit, never KFold: a random split trains on the future and
    validates on the past, which inflates the score and picks far too many
    boosting rounds.
    """
    splitter = TimeSeriesSplit(n_splits=folds)
    errors = []

    for train_idx, test_idx in splitter.split(X):
        result = fit_forecaster(X[train_idx], y[train_idx])
        predictions = result.model.predict(X[test_idx])
        errors.append(float(np.mean(np.abs(predictions - y[test_idx]))))

    return float(np.mean(errors))`,
        rationale:
          'The hand-rolled loop is replaced by a histogram implementation, and the two things that decide whether boosting works in practice become explicit: early stopping is switched on with a patience window, and validation uses TimeSeriesSplit rather than KFold — a random split trains on the future and picks far too many rounds. The objective is a typed parameter so quantile forecasting is a first-class option.',
        conventions: [
          'Explicit type hints on every public signature',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'scikit-learn',
        profile: 'O(n · bins · trees) after one binning pass, with early stopping cutting the round count.',
      },
      'make-it-fast': {
        code: `"""Gradient boosting - pre-binned features, native categoricals, one Dataset reuse."""

import lightgbm as lgb
import numpy as np
from numpy.typing import NDArray

Vector = NDArray[np.float64]
Matrix = NDArray[np.float64]


def build_dataset(
    X: Matrix, y: Vector, categorical_indices: list[int] | None = None
) -> lgb.Dataset:
    """Bin once, reuse everywhere.

    Binning is the expensive preprocessing step, and a Dataset built once can
    back every model in a hyperparameter sweep. Rebuilding it per trial - the
    default when passing raw arrays - repeats that cost on every fit.
    """
    return lgb.Dataset(
        np.ascontiguousarray(X, dtype=np.float32),   # float32 halves the bin scan traffic
        label=y,
        categorical_feature=categorical_indices or [],
        free_raw_data=True,   # drop the raw copy once binned
    )


def fit_quantiles(
    train: lgb.Dataset,
    valid: lgb.Dataset,
    quantiles: tuple[float, ...] = (0.1, 0.5, 0.9),
    rounds: int = 5_000,
) -> dict[float, lgb.Booster]:
    """One model per quantile, all sharing the same binned Dataset.

    A decision that is asymmetric in over- and under-supply needs the
    distribution, not the mean - and the binning work is done once for all
    three fits rather than three times.
    """
    boosters: dict[float, lgb.Booster] = {}

    for q in quantiles:
        boosters[q] = lgb.train(
            {
                "objective": "quantile",
                "alpha": q,
                "learning_rate": 0.03,
                "num_leaves": 63,
                "feature_fraction": 0.8,
                "bagging_fraction": 0.8,
                "bagging_freq": 1,
                "max_bin": 255,      # fits a bin index in one byte
                "verbosity": -1,
                "num_threads": 0,    # all cores
            },
            train,
            num_boost_round=rounds,
            valid_sets=[valid],
            callbacks=[lgb.early_stopping(100, verbose=False)],
        )

    return boosters


def predict_intervals(
    boosters: dict[float, lgb.Booster], X: Matrix
) -> dict[float, Vector]:
    """Score every quantile in one pass over the feature matrix, then enforce
    monotonicity - independently fitted quantiles can cross, which produces an
    incoherent distribution a downstream optimizer will happily exploit."""
    X = np.ascontiguousarray(X, dtype=np.float32)
    raw = {q: booster.predict(X, num_iteration=booster.best_iteration)
           for q, booster in boosters.items()}

    ordered = sorted(raw)
    stacked = np.vstack([raw[q] for q in ordered])
    np.maximum.accumulate(stacked, axis=0, out=stacked)   # in-place isotonic fix

    return {q: stacked[i] for i, q in enumerate(ordered)}`,
        rationale:
          'The binning pass moves out of the fit and into a Dataset built once and shared across every quantile model, which is the dominant preprocessing cost. Features are cast to float32 to halve bin-scan traffic, and the quantile predictions get an in-place monotonic fix — independently fitted quantiles can cross, and a downstream optimizer will exploit that incoherence.',
        optimizations: [
          {
            technique: 'Batch work to amortize interpreter overhead',
            why: 'One binned Dataset backs every quantile fit and every sweep trial, so the binning pass happens once instead of per model.',
            tradeoff: 'The shared Dataset pins its binning parameters, so a trial that wants a different max_bin cannot reuse it and must rebuild.',
          },
          {
            technique: 'Ensure contiguous memory layout and a single dtype',
            why: 'float32 contiguous input halves the memory traffic of the histogram scan, which is the inner loop of the whole algorithm.',
            tradeoff: 'float32 loses precision on features with a wide dynamic range, and binning already discretizes — so the loss is usually invisible, but not always.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'np.maximum.accumulate with out= enforces quantile monotonicity without allocating a second stacked array.',
            tradeoff: 'Mutating the stacked predictions in place means the raw per-quantile outputs are no longer recoverable for diagnosis.',
          },
        ],
        libraryName: 'LightGBM',
        profile: 'O(n · bins · trees) with binning amortized across models. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Gradient boosting with stumps - the loop, written out.
#include <cstddef>
#include <limits>
#include <set>
#include <vector>

struct Stump {
  std::size_t feature;
  double threshold;
  double left_value;
  double right_value;
};

// Brute force over every candidate threshold, rescanning the data each time.
Stump BestStump(const std::vector<std::vector<double>>& X,
                const std::vector<double>& residuals) {
  Stump best{0, 0.0, 0.0, 0.0};
  double best_error = std::numeric_limits<double>::infinity();
  const std::size_t d = X[0].size();

  for (std::size_t feature = 0; feature < d; ++feature) {
    std::set<double> candidates;
    for (const auto& row : X) candidates.insert(row[feature]);

    for (const double threshold : candidates) {
      double left_sum = 0.0, right_sum = 0.0;
      std::size_t left_n = 0, right_n = 0;

      for (std::size_t i = 0; i < X.size(); ++i) {
        if (X[i][feature] <= threshold) {
          left_sum += residuals[i];
          ++left_n;
        } else {
          right_sum += residuals[i];
          ++right_n;
        }
      }
      if (left_n == 0 || right_n == 0) continue;

      const double left_value = left_sum / static_cast<double>(left_n);
      const double right_value = right_sum / static_cast<double>(right_n);

      double error = 0.0;
      for (std::size_t i = 0; i < X.size(); ++i) {
        const double fitted = X[i][feature] <= threshold ? left_value : right_value;
        const double diff = residuals[i] - fitted;
        error += diff * diff;
      }

      if (error < best_error) {
        best_error = error;
        best = Stump{feature, threshold, left_value, right_value};
      }
    }
  }
  return best;
}

std::vector<Stump> Fit(const std::vector<std::vector<double>>& X,
                       const std::vector<double>& y,
                       int rounds, double learning_rate) {
  std::vector<double> predictions(y.size(), 0.0);
  std::vector<Stump> trees;

  for (int round = 0; round < rounds; ++round) {
    // Negative gradient of squared error is just the residual.
    std::vector<double> residuals(y.size());
    for (std::size_t i = 0; i < y.size(); ++i) residuals[i] = y[i] - predictions[i];

    const Stump stump = BestStump(X, residuals);
    trees.push_back(stump);

    // Shrinkage: add a fraction, so later trees still have work to do.
    for (std::size_t i = 0; i < X.size(); ++i) {
      const double step =
          X[i][stump.feature] <= stump.threshold ? stump.left_value : stump.right_value;
      predictions[i] += learning_rate * step;
    }
  }
  return trees;
}`,
        profile: 'O(rounds · d · n²) — every threshold rescans the dataset twice. Correct and unusable.',
      },
      'make-it-right': {
        code: `// Gradient boosting - pre-sorted features, prefix sums, one pass per split.
#include <algorithm>
#include <cstddef>
#include <limits>
#include <numeric>
#include <span>
#include <stdexcept>
#include <vector>

struct Stump {
  std::size_t feature;
  double threshold;
  double left_value;
  double right_value;
};

class StumpFinder {
 public:
  // Feature orderings are computed ONCE at construction. The naive version
  // re-derives the candidate set and rescans for every threshold, which is
  // where its quadratic cost comes from.
  StumpFinder(std::span<const double> x_flat, std::size_t n, std::size_t d)
      : x_flat_(x_flat), n_(n), d_(d), order_(d * n) {
    if (n_ == 0 || d_ == 0) throw std::invalid_argument("empty problem");
    if (x_flat_.size() != n_ * d_) {
      throw std::invalid_argument("flat matrix does not match n x d");
    }

    for (std::size_t f = 0; f < d_; ++f) {
      const auto begin = order_.begin() + static_cast<std::ptrdiff_t>(f * n_);
      std::iota(begin, begin + static_cast<std::ptrdiff_t>(n_), std::size_t{0});
      std::sort(begin, begin + static_cast<std::ptrdiff_t>(n_),
                [&](std::size_t a, std::size_t b) {
                  return x_flat_[a * d_ + f] < x_flat_[b * d_ + f];
                });
    }
  }

  [[nodiscard]] Stump Find(std::span<const double> residuals) const {
    const double total = std::accumulate(residuals.begin(), residuals.end(), 0.0);

    Stump best{0, 0.0, 0.0, 0.0};
    double best_gain = -std::numeric_limits<double>::infinity();

    for (std::size_t f = 0; f < d_; ++f) {
      const std::size_t* order = order_.data() + f * n_;

      // Sweep the sorted order accumulating a prefix sum. Each split point is
      // then O(1) instead of O(n), which is the whole optimization.
      double left_sum = 0.0;
      for (std::size_t k = 0; k + 1 < n_; ++k) {
        left_sum += residuals[order[k]];
        const double left_n = static_cast<double>(k + 1);
        const double right_n = static_cast<double>(n_ - k - 1);

        const double a = x_flat_[order[k] * d_ + f];
        const double b = x_flat_[order[k + 1] * d_ + f];
        if (a == b) continue;   // cannot split between equal values

        // Variance reduction, algebraically equivalent to the SSE the naive
        // version computes by rescanning.
        const double right_sum = total - left_sum;
        const double gain = left_sum * left_sum / left_n + right_sum * right_sum / right_n;

        if (gain > best_gain) {
          best_gain = gain;
          best = Stump{f, (a + b) / 2.0, left_sum / left_n, right_sum / right_n};
        }
      }
    }
    return best;
  }

 private:
  std::span<const double> x_flat_;
  std::size_t n_;
  std::size_t d_;
  std::vector<std::size_t> order_;   // d x n, sorted row indices per feature
};`,
        rationale:
          'The quadratic split search becomes linear per feature. Feature orderings are sorted once at construction rather than re-derived every round, and a prefix sweep over the sorted order makes each candidate split O(1) — replacing the rescan that dominated the naive version. The gain is expressed as variance reduction, which is algebraically the same objective without recomputing squared error.',
        conventions: [
          'const-correctness on parameters and members',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'O(d · n log n) once, then O(d · n) per boosting round.',
      },
      'make-it-fast': {
        code: `// Gradient boosting - histogram binning, byte-wide bins, parallel feature scan.
#include <algorithm>
#include <cstdint>
#include <cstddef>
#include <limits>
#include <span>
#include <vector>

// Binning is the algorithmic change that made modern GBMs fast: quantize each
// feature into at most 256 buckets ONCE, then every split search scans a
// 256-entry histogram instead of n sorted values.
class BinnedMatrix {
 public:
  BinnedMatrix(std::span<const double> x_flat, std::size_t n, std::size_t d,
               std::uint16_t max_bins = 256)
      : n_(n), d_(d), max_bins_(max_bins), bins_(n * d) {
    thresholds_.resize(d);

    for (std::size_t f = 0; f < d; ++f) {
      std::vector<double> column(n);
      for (std::size_t i = 0; i < n; ++i) column[i] = x_flat[i * d + f];
      std::sort(column.begin(), column.end());

      // Equal-frequency bin edges.
      auto& edges = thresholds_[f];
      edges.reserve(max_bins);
      for (std::uint16_t b = 1; b < max_bins; ++b) {
        edges.push_back(column[b * n / max_bins]);
      }

      for (std::size_t i = 0; i < n; ++i) {
        const double v = x_flat[i * d + f];
        const auto it = std::upper_bound(edges.begin(), edges.end(), v);
        // One byte per cell: the binned matrix is 8x smaller than the doubles
        // it replaces, so it stays resident in cache during the scan.
        bins_[i * d + f] =
            static_cast<std::uint8_t>(std::distance(edges.begin(), it));
      }
    }
  }

  // Gradient/Hessian histogram for one feature. This is the inner loop of the
  // entire algorithm - one sequential pass, no sorting, no comparisons.
  void BuildHistogram(std::size_t feature, std::span<const double> grad,
                      std::span<const double> hess,
                      std::span<double> grad_hist,
                      std::span<double> hess_hist) const {
    std::fill(grad_hist.begin(), grad_hist.end(), 0.0);
    std::fill(hess_hist.begin(), hess_hist.end(), 0.0);

    for (std::size_t i = 0; i < n_; ++i) {
      const std::uint8_t bin = bins_[i * d_ + feature];
      grad_hist[bin] += grad[i];
      hess_hist[bin] += hess[i];
    }
  }

  // Best split from a histogram: one sweep over at most 256 buckets, using
  // the exact XGBoost gain formula.
  [[nodiscard]] static double BestGain(std::span<const double> grad_hist,
                                       std::span<const double> hess_hist,
                                       double lambda, std::size_t* best_bin) {
    double total_g = 0.0, total_h = 0.0;
    for (std::size_t b = 0; b < grad_hist.size(); ++b) {
      total_g += grad_hist[b];
      total_h += hess_hist[b];
    }

    double left_g = 0.0, left_h = 0.0, best = -std::numeric_limits<double>::infinity();
    for (std::size_t b = 0; b + 1 < grad_hist.size(); ++b) {
      left_g += grad_hist[b];
      left_h += hess_hist[b];
      const double right_g = total_g - left_g;
      const double right_h = total_h - left_h;

      const double gain = left_g * left_g / (left_h + lambda) +
                          right_g * right_g / (right_h + lambda) -
                          total_g * total_g / (total_h + lambda);
      if (gain > best) {
        best = gain;
        *best_bin = b;
      }
    }
    return best;
  }

  [[nodiscard]] std::size_t feature_count() const noexcept { return d_; }

 private:
  std::size_t n_;
  std::size_t d_;
  std::uint16_t max_bins_;
  std::vector<std::uint8_t> bins_;                  // n x d, one byte per cell
  std::vector<std::vector<double>> thresholds_;
};`,
        rationale:
          'Sorted-order scanning is replaced by histogram binning — quantize each feature into 256 buckets once, then every split search sweeps a 256-entry histogram instead of n sorted values. Bins are stored one byte per cell, making the matrix eight times smaller than the doubles it replaces so it stays resident in cache during the scan that dominates the algorithm.',
        optimizations: [
          {
            technique: 'Row-major, cache-friendly memory layout',
            why: 'One byte per bin makes the feature matrix 8x smaller than double storage, so the histogram scan streams from cache rather than main memory — this is where the speedup actually comes from.',
            tradeoff: '256 bins quantize the feature, so a split threshold can only fall on a bin edge; on features with a few highly informative exact values this loses a little accuracy.',
          },
          {
            technique: 'Loop fusion to eliminate intermediate buffers',
            why: 'Gradient and Hessian histograms are accumulated in one pass over the rows rather than two separate traversals.',
            tradeoff: 'Two output spans must be kept in lockstep by the caller, which a single struct-of-histograms would make impossible to get wrong.',
          },
          {
            technique: 'Rely on compiler autovectorization before hand-written SIMD',
            why: 'The histogram accumulation and the gain sweep are simple sequential loops the compiler vectorizes on its own; hand-written intrinsics here would add complexity for little gain.',
            tradeoff: 'The scattered histogram writes are gather/scatter-bound, so autovectorization helps the gain sweep far more than the accumulation.',
          },
        ],
        profile: 'O(n · d) per round for histograms, O(d · bins) for split search. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Gradient boosting with stumps - the loop, written out.

#[derive(Debug, Clone, Copy)]
pub struct Stump {
    pub feature: usize,
    pub threshold: f64,
    pub left_value: f64,
    pub right_value: f64,
}

/// Brute force over every candidate threshold, rescanning the data each time.
fn best_stump(x: &[Vec<f64>], residuals: &[f64]) -> Stump {
    let d = x[0].len();
    let mut best = Stump { feature: 0, threshold: 0.0, left_value: 0.0, right_value: 0.0 };
    let mut best_error = f64::INFINITY;

    for feature in 0..d {
        let mut candidates: Vec<f64> = x.iter().map(|row| row[feature]).collect();
        candidates.sort_by(f64::total_cmp);
        candidates.dedup();

        for &threshold in &candidates {
            let (mut left_sum, mut right_sum) = (0.0, 0.0);
            let (mut left_n, mut right_n) = (0usize, 0usize);

            for i in 0..x.len() {
                if x[i][feature] <= threshold {
                    left_sum += residuals[i];
                    left_n += 1;
                } else {
                    right_sum += residuals[i];
                    right_n += 1;
                }
            }
            if left_n == 0 || right_n == 0 {
                continue;
            }

            let left_value = left_sum / left_n as f64;
            let right_value = right_sum / right_n as f64;

            let mut error = 0.0;
            for i in 0..x.len() {
                let fitted = if x[i][feature] <= threshold { left_value } else { right_value };
                error += (residuals[i] - fitted).powi(2);
            }

            if error < best_error {
                best_error = error;
                best = Stump { feature, threshold, left_value, right_value };
            }
        }
    }
    best
}

pub fn fit(x: &[Vec<f64>], y: &[f64], rounds: usize, learning_rate: f64) -> Vec<Stump> {
    let mut predictions = vec![0.0; y.len()];
    let mut trees = Vec::new();

    for _ in 0..rounds {
        // Negative gradient of squared error is just the residual.
        let residuals: Vec<f64> =
            y.iter().zip(&predictions).map(|(t, p)| t - p).collect();

        let stump = best_stump(x, &residuals);
        trees.push(stump);

        // Shrinkage: add a fraction so later trees still have work to do.
        for (i, row) in x.iter().enumerate() {
            let step = if row[stump.feature] <= stump.threshold {
                stump.left_value
            } else {
                stump.right_value
            };
            predictions[i] += learning_rate * step;
        }
    }
    trees
}`,
        profile: 'O(rounds · d · n²) — every threshold rescans twice. Correct and unusable.',
      },
      'make-it-right': {
        code: `//! Gradient boosting - pre-sorted orderings, prefix sweep, typed errors.

use std::fmt;

#[derive(Debug, PartialEq, Eq)]
pub enum BoostError {
    Empty,
    ShapeMismatch { expected: usize, found: usize },
}

impl fmt::Display for BoostError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot fit on an empty dataset"),
            Self::ShapeMismatch { expected, found } => {
                write!(f, "expected {expected} values, found {found}")
            }
        }
    }
}

impl std::error::Error for BoostError {}

#[derive(Debug, Clone, Copy)]
pub struct Stump {
    pub feature: usize,
    pub threshold: f64,
    pub left_value: f64,
    pub right_value: f64,
}

pub struct StumpFinder<'a> {
    x: &'a [f64],
    n: usize,
    d: usize,
    /// d x n sorted row indices, computed ONCE. The naive version re-derives
    /// the candidate set every round, which is where its cost lives.
    order: Vec<usize>,
}

impl<'a> StumpFinder<'a> {
    pub fn new(x: &'a [f64], n: usize, d: usize) -> Result<Self, BoostError> {
        if n == 0 || d == 0 {
            return Err(BoostError::Empty);
        }
        if x.len() != n * d {
            return Err(BoostError::ShapeMismatch { expected: n * d, found: x.len() });
        }

        let mut order = vec![0usize; n * d];
        for f in 0..d {
            let slice = &mut order[f * n..(f + 1) * n];
            for (k, slot) in slice.iter_mut().enumerate() {
                *slot = k;
            }
            slice.sort_unstable_by(|&a, &b| x[a * d + f].total_cmp(&x[b * d + f]));
        }

        Ok(Self { x, n, d, order })
    }

    pub fn find(&self, residuals: &[f64]) -> Stump {
        let total: f64 = residuals.iter().sum();
        let mut best = Stump { feature: 0, threshold: 0.0, left_value: 0.0, right_value: 0.0 };
        let mut best_gain = f64::NEG_INFINITY;

        for f in 0..self.d {
            let order = &self.order[f * self.n..(f + 1) * self.n];

            // Prefix sweep: each split point is O(1) rather than O(n), which
            // is the whole optimization over the naive rescan.
            let mut left_sum = 0.0;
            for k in 0..self.n - 1 {
                left_sum += residuals[order[k]];
                let left_n = (k + 1) as f64;
                let right_n = (self.n - k - 1) as f64;

                let a = self.x[order[k] * self.d + f];
                let b = self.x[order[k + 1] * self.d + f];
                if a == b {
                    continue;   // cannot split between equal values
                }

                // Variance reduction - algebraically the same objective as the
                // SSE the naive version recomputes by rescanning.
                let right_sum = total - left_sum;
                let gain = left_sum * left_sum / left_n + right_sum * right_sum / right_n;

                if gain > best_gain {
                    best_gain = gain;
                    best = Stump {
                        feature: f,
                        threshold: (a + b) / 2.0,
                        left_value: left_sum / left_n,
                        right_value: right_sum / right_n,
                    };
                }
            }
        }
        best
    }
}`,
        rationale:
          'The quadratic split search becomes linear per feature: orderings are sorted once at construction instead of re-derived every round, and a prefix sweep makes each candidate split O(1) rather than a full rescan. The design matrix is borrowed flat rather than cloned, and construction failures are a typed Result.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'O(d · n log n) once, then O(d · n) per round.',
      },
      'make-it-fast': {
        code: `//! Gradient boosting - byte-wide bins, parallel per-feature histograms.

use rayon::prelude::*;

/// Histogram binning: quantize each feature into at most 256 buckets ONCE,
/// then every split search scans a 256-entry histogram instead of n sorted
/// values. One byte per cell keeps the matrix resident in cache.
pub struct BinnedMatrix {
    n: usize,
    d: usize,
    bins: Vec<u8>,
    max_bins: usize,
}

#[derive(Debug, Clone, Copy)]
pub struct SplitCandidate {
    pub feature: usize,
    pub bin: usize,
    pub gain: f64,
}

impl BinnedMatrix {
    /// Gradient/Hessian histograms for one feature - one sequential pass, no
    /// sorting and no comparisons. This is the inner loop of the algorithm.
    fn histogram(&self, feature: usize, grad: &[f64], hess: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let mut g_hist = vec![0.0_f64; self.max_bins];
        let mut h_hist = vec![0.0_f64; self.max_bins];

        for i in 0..self.n {
            let bin = self.bins[i * self.d + feature] as usize;
            g_hist[bin] += grad[i];
            h_hist[bin] += hess[i];
        }
        (g_hist, h_hist)
    }

    /// Best split across all features, one feature per worker.
    ///
    /// Features are mutually independent, which makes this the natural
    /// parallel axis - and unlike parallelizing over rows, it needs no
    /// reduction because each worker produces one candidate.
    pub fn best_split(&self, grad: &[f64], hess: &[f64], lambda: f64) -> Option<SplitCandidate> {
        (0..self.d)
            .into_par_iter()
            .map(|feature| {
                let (g_hist, h_hist) = self.histogram(feature, grad, hess);

                let total_g: f64 = g_hist.iter().sum();
                let total_h: f64 = h_hist.iter().sum();
                let parent = total_g * total_g / (total_h + lambda);

                let (mut left_g, mut left_h) = (0.0, 0.0);
                let mut best = SplitCandidate { feature, bin: 0, gain: f64::NEG_INFINITY };

                for bin in 0..self.max_bins - 1 {
                    left_g += g_hist[bin];
                    left_h += h_hist[bin];
                    let right_g = total_g - left_g;
                    let right_h = total_h - left_h;

                    // The exact XGBoost gain formula.
                    let gain = left_g * left_g / (left_h + lambda)
                        + right_g * right_g / (right_h + lambda)
                        - parent;

                    if gain > best.gain {
                        best = SplitCandidate { feature, bin, gain };
                    }
                }
                best
            })
            .reduce_with(|a, b| if a.gain >= b.gain { a } else { b })
    }
}`,
        rationale:
          'Sorted-order scanning becomes histogram binning with one byte per cell, so the feature matrix is eight times smaller and stays in cache during the scan that dominates training. Features are independent, which makes them the natural parallel axis — and unlike parallelizing over rows it needs no reduction, since each worker returns exactly one candidate split.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Split search across features is independent per feature, and each worker returns a single candidate — so reduce_with picks the best with no shared accumulator and no synchronization.',
            tradeoff: 'Each worker allocates its own pair of histograms per feature; a thread-local reusable arena would avoid that but complicates the ownership considerably.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'One byte per bin makes the matrix 8x smaller than f64 storage, so the histogram pass streams from cache instead of main memory.',
            tradeoff: '256 bins quantize the feature, so split thresholds can only land on bin edges — a small accuracy cost on features with a few highly informative exact values.',
          },
          {
            technique: 'Iterator chains for bounds-check elision',
            why: 'The gain sweep iterates over fixed-size histograms whose length the compiler knows, dropping bounds checks from the inner loop.',
            tradeoff: 'The histogram accumulation still indexes by a runtime bin value, so those scattered writes keep their bounds checks regardless.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n · d) per round for histograms, split search across cores. Illustrative, not a measured benchmark.',
      },
    },
  },
};
