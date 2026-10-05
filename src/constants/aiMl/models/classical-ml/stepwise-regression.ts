import type { AiMlModel } from '../../types';

/**
 * Stepwise Regression — greedy feature selection wrapped around a linear model.
 *
 * Authored as a technique, not a model: it contributes no new hypothesis class.
 * The fitted object is still OLS (or a GLM); what stepwise adds is a search
 * procedure over which columns that fit may use. The entry is deliberately blunt
 * about the method, because it is the most widely taught and most widely
 * misused feature selector, and the honest account of it is mostly a list of
 * what its output cannot be trusted to say.
 *
 * The code progression is built around the cost of the search, not the cost of
 * a single fit: the naive version refits one model per candidate per step, and
 * the optimized version replaces those refits with incremental orthogonalization
 * so that scoring every candidate is one matrix product.
 */
export const STEPWISE_REGRESSION: AiMlModel = {
  slug: 'stepwise-regression',
  name: 'Stepwise Regression',
  aliases: ['Stepwise Regression', 'Forward selection', 'Backward elimination'],
  category: 'classical-ml',
  group: 'linear-models',
  kind: 'technique',

  paradigms: ['supervised'],
  // Both, because the search wraps whatever likelihood the base model has:
  // Gaussian for OLS, Bernoulli for logistic regression. 'anomaly-detection' is
  // absent on purpose — see applications.featured['anomaly-detection'].
  taskTypes: ['regression', 'classification'],
  paradigmNote:
    'A technique wrapped around a model rather than a model of its own: the learner underneath is OLS or a GLM, and stepwise only decides which columns it may use. It inherits the response type from that learner, which is why both regression and classification apply.',

  intuition:
    'You have p candidate features and want a short list. Trying every subset means 2^p fits, so stepwise walks instead: start with nothing, add whichever single feature improves an information criterion the most, repeat until no addition helps. Backward elimination runs the same walk in reverse from the full model, and the bidirectional version lets a feature re-enter or leave at every step. Each step costs a handful of refits, which is why it dominated statistics software for decades. The catch is what the procedure hides: the data chose the model, and then the same data are used to report on it. The p-values, confidence intervals and R-squared printed for the final model are computed as though the features had been specified in advance, so they are optimistically wrong, and nothing in the output says so.',

  objective: {
    kind: 'loss',
    expression: {
      formula:
        '\\begin{aligned} \\text{IC}(S) &= -2 \\ln \\hat{L}(S) + c \\, \\lvert S \\rvert \\\\ &= n \\ln \\frac{\\text{RSS}(S)}{n} + c \\, \\lvert S \\rvert + \\text{const} \\qquad (\\text{Gaussian errors}) \\\\ S^{\\star} &= \\arg\\min_{S \\subseteq \\{1, \\dots, p\\}} \\text{IC}(S), \\qquad c = 2 \\;(\\text{AIC}) \\;\\text{ or }\\; c = \\ln n \\;(\\text{BIC}) \\end{aligned}',
      symbols: [
        { symbol: 'S', meaning: 'the subset of candidate features the model is allowed to use' },
        { symbol: '\\hat{L}(S)', meaning: 'maximized likelihood of the base model (OLS, logistic, Poisson) restricted to the features in S' },
        { symbol: 'c', meaning: 'price charged per parameter: 2 for AIC, ln n for BIC. This is the only knob that separates a permissive search from a strict one' },
        { symbol: '\\text{RSS}(S)', meaning: 'residual sum of squares of the least-squares fit on S; under Gaussian errors the log-likelihood reduces to a function of it' },
        { symbol: 'n, p', meaning: 'number of observations and number of candidate features' },
      ],
    },
    reading:
      'A fit term plus a fee per feature, minimized over every possible subset. AIC charges 2 per parameter and approximates out-of-sample predictive loss; BIC charges ln n, which is harsher once n exceeds about eight and is consistent at recovering the true subset if one exists in the pool. Written this way the problem is best-subset selection, an L0 penalty: it counts features and does not care how large their coefficients are. Stepwise does not solve that problem. It solves a much smaller one — at each step, compare only the p neighbouring subsets one feature away — and reports the result as though it had solved the whole thing.',
  },

  optimization: {
    method:
      'Greedy discrete search over the subset lattice: add (forward) or drop (backward) the single feature that most reduces the criterion, and stop at the first step that cannot improve it',
    updateRule: {
      formula:
        '\\begin{aligned} j^{\\star} &= \\arg\\min_{j \\notin S_t} \\text{IC}(S_t \\cup \\{j\\}), \\qquad \\Delta_j = n \\ln \\frac{\\text{RSS}(S_t \\cup \\{j\\})}{\\text{RSS}(S_t)} + c \\\\ S_{t+1} &= \\begin{cases} S_t \\cup \\{j^{\\star}\\} & \\text{if } \\Delta_{j^{\\star}} < 0 \\\\ S_t \\text{ (stop)} & \\text{otherwise} \\end{cases} \\end{aligned}',
      symbols: [
        { symbol: 'S_t', meaning: 'the current subset after t steps; empty for forward selection, full for backward elimination' },
        { symbol: 'j^{\\star}', meaning: 'the candidate whose addition lowers the criterion the most' },
        { symbol: '\\Delta_j', meaning: 'change in the criterion from adding feature j: the log-ratio of residual error, plus the fee c for one more parameter' },
        { symbol: 'S_t \\setminus \\{j\\}', meaning: 'the mirror move for backward elimination: drop the feature whose removal raises the criterion least, and stop when every drop hurts' },
      ],
    },
    rationale:
      'Exact best-subset selection is combinatorial: there are 2^p subsets, and the underlying sparse-approximation problem is NP-hard in general. Branch-and-bound over the lattice (the leaps-and-bounds family) stays practical to a few dozen features, and modern mixed-integer solvers push exact search further, into the hundreds of features under favourable conditions. Stepwise gives up exactness for a cost of roughly p^2 / 2 fits and takes the greedy path through the lattice. The lasso takes a different exit from the same wall: it relaxes the L0 count into an L1 sum, which makes the problem convex and the answer unique, at the price of shrinking the coefficients it keeps. The add step is also a similarity search in disguise. Adding the feature that most reduces RSS is the same as picking the candidate with the largest partial correlation with the current residual — the cosine between the residual and that candidate after it has been orthogonalized against the features already in the model. That is why correlation between candidates, not their marginal importance, drives who gets in, and why the optimized implementation below can score every candidate in one matrix product. Swap this similarity for the raw correlation with the response and the method silently selects redundant features, because it stops seeing what the model already explains.',
    hyperparameters: [
      { name: 'criterion (c)', role: 'The per-feature price. AIC is permissive and targets prediction; BIC is stricter and targets recovering the true subset; AICc corrects AIC when n is small relative to the model size', typicalRange: 'AIC c = 2; BIC c = ln n; AICc when n / k < 40' },
      { name: 'direction', role: 'Forward starts empty and needs only n > 1 observations; backward starts full and needs n > p; both allows features to re-enter or leave. The three can end at different models on the same data', typicalRange: 'forward, backward, or both' },
      { name: 'p-enter / p-remove', role: 'The older significance-test variant of the same search: add when the partial F-test p-value is below p-enter, drop when it is above p-remove. Keeping p-remove above p-enter prevents a feature cycling in and out', typicalRange: 'commonly 0.05 to 0.15; p-remove >= p-enter' },
      { name: 'max terms', role: 'A hard cap on subset size, which bounds the cost and the damage when the pool is large relative to n', typicalRange: 'well under n / 10' },
      { name: 'forced terms and hierarchy', role: 'Features that are always kept (the treatment indicator, a known driver) and a rule that an interaction may not enter before its main effects' },
    ],
    convergence:
      'Termination is guaranteed: each accepted move strictly lowers a criterion over a finite lattice, so the walk cannot cycle and stops within p steps (2p with bidirectional moves). Optimality is not guaranteed, and the failure modes are structural. The search is path-dependent, so forward and backward selection routinely disagree on the same data. Forward selection misses suppressor variables — a feature that is useless alone and valuable alongside another — because it never gets the chance to be added jointly. Among correlated candidates the winner is arbitrary and flips under a bootstrap resample, so the selected set is unstable even when its predictions are not. And the selected model carries a winner’s curse: coefficients are biased away from zero, standard errors are too small, R-squared is inflated, and the F and t p-values are far too optimistic because they ignore that the model was selected from 2^p possibilities. Almost none of that is a convergence problem. It is the cost of using one sample for selection and for estimation.',
    complexity:
      'A full forward path evaluates about p + (p - 1) + ... = O(p^2) candidate models, each refit costing O(n k^2 + k^3) with normal equations on k selected terms, so O(p^2 n k^2) naively. Incremental orthogonalization scores all remaining candidates in O(n p k) per step. Best subset is 2^p fits. The lasso path costs about one OLS fit with warm starts, which is why it replaced stepwise as the default.',
  },

  applications: {
    featured: {
      'time-series-forecasting': {
        fit: 'adapted',
        how: 'Stepwise selects regressors and lags inside a regression with ARMA errors (ARIMAX): the candidate pool holds lags of the target, lags of exogenous drivers, calendar dummies and Fourier terms, and the search picks a subset by AICc. The same idea appears in automatic ARIMA order search, which walks the neighbours of the current (p, d, q) order by criterion rather than fitting the whole grid — arguably the one place greedy selection is the unexamined industry default.',
        where: [
          'Automatic ARIMA order selection across thousands of series, where a stepwise neighbourhood search keeps the cost per series low',
          'Demand forecasting with exogenous drivers (price, promotion, weather), choosing which drivers and which of their lags enter',
          'Macroeconomic nowcasting from a modest panel of indicators, historically',
          'A first-pass lag screen on a new series before a more careful model is built',
        ],
        why: 'Likelihood-based criteria respect the time-series structure in a way a naive shuffled hold-out does not, and the search is cheap enough to run per series. It stops being defensible as the lag pool grows: with dozens of correlated lags the greedy search picks spurious ones and the choice is unstable between refits, and a penalized method or a model with the dynamics built in does the job better. Criterion values are also only comparable across models fitted to the same effective observations and the same order of differencing, so letting the search change either quietly breaks the comparison.',
        featurization: [
          'Fix the differencing order before the search; AIC values from models with different differencing are not comparable',
          'Build every candidate lag over the same observation window so the sample is identical across models',
          'Fourier terms rather than one dummy per period, so the seasonal structure costs a few candidates instead of dozens',
          'Standardize exogenous drivers and keep a forced-in baseline (the intercept, the AR term that the domain demands)',
        ],
        evaluation:
          'Rolling-origin cross-validation with the selection step repeated inside every fold, scored by MASE against seasonal-naive. Selecting once on the full series and then cross-validating the survivor leaks the future into the choice of features and overstates accuracy. Check support stability across folds: a subset that changes between origins is selecting noise.',
        pitfalls: [
          'Selecting features on the whole series and then evaluating on a hold-out carved from it, which is the standard leak here',
          'Letting the search change differencing or the sample window, so criterion values are no longer comparable',
          'Reading the selected lags as the causal lag structure; they are the subset that minimized a criterion under correlation',
          'Trusting the final model’s reported standard errors for the exogenous coefficients, which ignore the selection step',
        ],
      },
      'anomaly-detection': {
        fit: 'not-applicable',
        why: 'Stepwise chooses predictors for a labelled target and defines no notion of normal behaviour or anomaly score; a residual-based detector built on its output also inherits selection-shrunk residuals on the training window, so penalized regression or a density model is the right starting point instead.',
      },
      optimization: {
        fit: 'adapted',
        how: 'Stepwise is a greedy hill-climb over the Boolean lattice of feature subsets, which makes it the smallest textbook instance of discrete local search rather than a tool for optimization problems. The objective is the information criterion above; the neighbourhood is "one feature added or dropped"; the stopping rule is the first local minimum. What it teaches transfers to wrapper-style feature selection around any model, and to the general question of when a greedy walk over a combinatorial space is good enough.',
        where: [
          'Wrapper feature selection around a non-linear model, using the same add-or-drop neighbourhood with cross-validated error as the score',
          'Sensor or measurement-subset selection when each feature has an acquisition cost and the budget is a hard constraint',
          'Seeding an exact solver: a stepwise solution is a cheap, feasible incumbent for a branch-and-bound or mixed-integer best-subset search',
        ],
        why: 'It is a legitimate local search with no optimality guarantee, and the honest comparison is against its alternatives: exact best-subset for small p, the lasso for a convex relaxation, and a genetic algorithm or simulated annealing when the subset score is expensive and non-smooth. When the criterion is cheap and p is small, it is a good enough incumbent. When features interact so that a pair is valuable only together, a one-move neighbourhood cannot see it and the greedy walk stalls at a poor local minimum.',
        featurization: [
          'Encode a subset as a bit vector, so the add and drop moves are bit flips and the lattice is explicit',
          'Attach per-feature costs and fold them into the price c when features differ in acquisition cost',
          'Cache the Gram matrix or orthogonal basis so each neighbour is scored without a refit',
        ],
        evaluation:
          'Compare the subset against an exact best-subset or mixed-integer solution on a small instance, and report the criterion gap. Restart from several random starting subsets and check whether they converge to the same set; if they do not, the landscape is rugged and a single greedy run is not reporting the optimum.',
        pitfalls: [
          'Treating the first local minimum as the best subset',
          'A one-move neighbourhood that cannot find pairs of features valuable only together',
          'Optimizing a noisy criterion on a small sample, so the walk follows noise and the winner does not reproduce',
        ],
      },
    },
    breadth: {
      'risk-and-fraud': {
        fit: 'viable',
        how: 'Stepwise logistic regression is the historical default in credit scorecard development: a pool of binned or weight-of-evidence encoded variables goes in, and the search returns a short list a model risk reviewer can inspect. The same likelihood-based search applies, with the Bernoulli log-likelihood in place of the Gaussian one.',
        where: [
          'Legacy credit scorecards and probability-of-default models built in standard statistical packages',
          'Application scoring where the regulator expects a small, justifiable variable list',
          'Quick variable screening before a more careful penalized or boosted model is fit',
        ],
        why: 'It produces the short, reviewable variable list that governance demands, and it is deeply embedded in existing tooling and documentation. The defensible modern practice is to use it for screening, then refit the chosen subset on held-out data and report intervals from that refit, or to replace it with an L1-penalized logistic regression, which delivers the same short list with a stable, reproducible path.',
        featurization: [
          'Weight-of-evidence or monotone binned encodings so every kept coefficient has a sign a reviewer can sanity-check',
          'Group the dummy columns of one categorical so the search keeps or drops the variable as a unit',
          'Fix the candidate pool before looking at the outcome',
        ],
        evaluation:
          'Out-of-time validation: select on an earlier window and report AUC, KS and calibration on a later one. A random hold-out hides the temporal gap that dominates deployment error in this domain, and the selected subset is the first thing that fails to carry across it.',
        pitfalls: [
          'Reporting the selected model’s p-values and intervals as if the variables had been chosen in advance',
          'Selecting and validating on the same sample, which makes the scorecard look better than it is',
          'A subset that churns between quarterly refits, forcing a model-risk re-review every time',
        ],
      },
      'causal-inference': {
        fit: 'adapted',
        how: 'Used to choose which covariates to adjust for, stepwise is a recognised error: selecting confounders by their association with the outcome alone discards variables that matter mainly through treatment assignment, and the treatment effect is then estimated from a model chosen to fit the outcome. It is acceptable only in guarded forms — the treatment is forced in, covariates are selected against both the outcome and the treatment, and the effect is estimated on a sample not used for selection.',
        where: [
          'Propensity-score model specification in observational studies, with the treatment forced into the outcome model',
          'Selecting among pre-specified candidate adjustment sets, reported with sensitivity analysis',
        ],
        why: 'The honest framing is that stepwise answers a prediction question and causal inference asks an identification one. Post-double-selection or an orthogonalized (double machine learning) estimator is the right tool, because it keeps selection error away from the effect estimate; stepwise is acceptable only as one component inside that structure.',
        featurization: [
          'Force the treatment indicator into every candidate model so it is never subject to selection',
          'Take the union of covariates selected in the treatment equation and the outcome equation',
          'Specify the candidate pool and any hierarchy from subject-matter knowledge before looking at the data',
        ],
        evaluation:
          'Coverage of the effect interval under simulation with a known effect, not predictive fit. Use sample splitting — select on one half, estimate on the other — to see how much of the reported precision came from the selection step.',
        pitfalls: [
          'Reporting the treatment effect and its interval from the post-selection model as though selection had not happened',
          'Dropping a confounder that is weakly related to the outcome but strongly related to treatment',
          'Letting the search remove the treatment variable itself',
        ],
      },
    },
  },

  deployment: {
    trainingCost:
      'Minutes at most. The search is O(p^2) cheap fits, and a single-core fit over a few hundred candidates on tens of thousands of rows is seconds with an orthogonalized implementation. That cheapness is exactly what tempts people to stack interaction terms into the candidate pool until the multiple-testing damage swamps the method.',
    inferenceProfile:
      'A dot product over the selected features only, which is its real operational virtue: the selected subset is often a small fraction of the candidates, so serving needs only those feature fetches and the audit trail is a short list.',
    retrainingCadence:
      'Whenever the data distribution shifts, but with a discipline most teams skip: rerunning the search each time produces a possibly different feature set, which breaks downstream consumers and any review that keyed on it. Freeze the selected subset between scheduled refits, and rerun selection on a calendar rather than automatically.',
    driftAndMonitoring: [
      'Track the selected subset across refits; churn in the support is the earliest warning that the selection is chasing noise rather than signal',
      'Bootstrap the whole selection procedure periodically and report each feature’s inclusion frequency, so a feature that is in 40% of resamples is not presented as a stable finding',
      'Compare out-of-sample error against the in-sample error the search optimized; a widening gap means the selection is overfitting',
      'Monitor the distribution of every selected feature, since a drifting feature can be the one the search happened to favour',
    ],
    productionGotchas: [
      'Selection must happen inside every cross-validation fold; selecting once and cross-validating the survivor gives performance estimates that are systematically too good',
      'The final model’s printed standard errors, confidence intervals and R-squared are invalid because they ignore the selection step; never ship them as uncertainty estimates',
      'Persist the selected subset and the encoding of every feature as part of the model artefact; a refit that reselects silently changes the model signature',
      'Candidate pools that grow over time make the multiple-testing problem grow with them, so the same procedure becomes steadily less trustworthy without any change in the code',
    ],
  },

  assumptions: [
    'Everything the base model assumes still holds: a linear signal, independent errors, and homoscedastic Gaussian noise for OLS inference',
    'The candidate pool was fixed before the outcome was inspected, and a sparse subset of it is adequate; if the true signal is dense, any short list is wrong',
    'n is comfortably larger than the number of selected terms, and well above the pool size for backward elimination to be defined at all',
    'The criterion matches the goal: AIC for prediction, BIC for recovering a true subset; neither is a licence to read the result as an effect estimate',
    'Selection and estimation use separate data if the output is to be used for inference, or the output is treated as descriptive only',
  ],

  pros: [
    {
      point: 'Cheap, deterministic and available everywhere',
      context:
        'O(p^2) cheap fits and one-line implementations in every statistics package. That makes it the right choice for a quick screen on a small number of features. It is no argument for trusting the result, since the lasso path costs about the same and is more stable.',
    },
    {
      point: 'Produces a short list a human can read and a reviewer can approve',
      context:
        'In regulated or low-data settings where the deliverable is a defensible variable list, that is a real requirement. The condition is that the list is validated on data the search did not see; the list alone is a hypothesis, not a finding.',
    },
    {
      point: 'A serviceable baseline for any selection method to beat',
      context:
        'It is the reference every sparse method is measured against. If a lasso or a gradient-boosted model cannot clearly beat stepwise on out-of-time data, the extra machinery is not paying for itself, and a team that never ran the baseline cannot know.',
    },
    {
      point: 'With a small pool and strong signal, it often finds the same subset an exhaustive search would',
      context:
        'When p is below about 20, the signal is strong and the features are close to orthogonal, the greedy path and the global optimum usually coincide, so the pathologies below are mild. Exhaustive search is then affordable anyway, so the cheapness buys little.',
    },
  ],

  cons: [
    {
      point: 'Post-selection inference is invalid',
      context:
        'The reported p-values, confidence intervals and R-squared treat the model as pre-specified, but it was chosen from 2^p candidates using the same data. Intervals have well below nominal coverage and p-values are far too small. This is fatal wherever the coefficient or its uncertainty is the deliverable; the correct repair is sample splitting or selective-inference methods, not a different print statement.',
    },
    {
      point: 'The selected set is unstable under resampling',
      context:
        'Among correlated features the winner is close to arbitrary, so a bootstrap of the same data produces different models and different coefficients. Predictions often stay put, which hides the problem; the interpretation does not. Anyone reading the list as "the important variables" is reading noise.',
    },
    {
      point: 'Coefficients are biased away from zero and the fit is optimistic',
      context:
        'Features are admitted because they looked strong in this sample, so their estimated effects are inflated (the winner’s curse) and the in-sample R-squared overstates future accuracy. It is the opposite bias to the lasso, which shrinks, and arguably the more dangerous one because it flatters the result.',
    },
    {
      point: 'Greedy search misses interactions between features and is path-dependent',
      context:
        'Forward selection never adds a suppressor that only helps alongside another feature; backward elimination can find it but needs n > p; and the two end at different models on the same data. If the signal is carried by combinations of features, stepwise fails in a way no choice of criterion repairs.',
    },
    {
      point: 'Multiple testing is hidden inside the procedure',
      context:
        'Every step compares dozens of candidates and the best is kept, which is a repeated test with no correction. With 100 pure-noise candidates the search will still return a model with several apparently significant terms. The larger the pool, the worse it gets, and the procedure does not warn you.',
    },
  ],

  relatedSlugs: [
    'linear-regression',
    'ridge-lasso',
    'generalized-linear-models',
    'quantile-regression',
    'random-forest',
    'genetic-algorithm',
  ],

  implementations: {
    python: {
      'make-it-work': {
        code: `"""Forward stepwise selection by AIC - the objective, transcribed.

Each step refits one least-squares model per remaining candidate and keeps the
feature whose addition lowers AIC the most. Features and target are assumed
centred, which is the same as including an intercept in every model: the
intercept and the noise variance add the same constant to every candidate's
AIC, so they drop out of the comparison.
"""

import math

SINGULAR_TOLERANCE = 1e-12


def solve(matrix, rhs):
    """Gaussian elimination with partial pivoting. None if singular."""
    size = len(rhs)
    a = [row[:] for row in matrix]
    b = rhs[:]
    for col in range(size):
        pivot = col
        for row in range(col + 1, size):
            if abs(a[row][col]) > abs(a[pivot][col]):
                pivot = row
        if abs(a[pivot][col]) < SINGULAR_TOLERANCE:
            return None
        a[col], a[pivot] = a[pivot], a[col]
        b[col], b[pivot] = b[pivot], b[col]
        for row in range(col + 1, size):
            factor = a[row][col] / a[col][col]
            for inner in range(col, size):
                a[row][inner] -= factor * a[col][inner]
            b[row] -= factor * b[col]

    solution = [0.0] * size
    for row in range(size - 1, -1, -1):
        total = b[row]
        for col in range(row + 1, size):
            total -= a[row][col] * solution[col]
        solution[row] = total / a[row][row]
    return solution


def aic(n, rss, k):
    # AIC = n ln(RSS / n) + 2k for Gaussian errors, up to a constant.
    return n * math.log(max(rss, 1e-300) / n) + 2.0 * k


def rss_of(X, y, subset):
    """Residual sum of squares of the least-squares fit on the given columns."""
    n = len(y)
    k = len(subset)
    if k == 0:
        return sum(value * value for value in y)

    # Normal equations (X_S^T X_S) beta = X_S^T y, built entry by entry.
    gram = [[0.0] * k for _ in range(k)]
    rhs = [0.0] * k
    for a in range(k):
        for b in range(k):
            total = 0.0
            for i in range(n):
                total += X[i][subset[a]] * X[i][subset[b]]
            gram[a][b] = total
        total = 0.0
        for i in range(n):
            total += X[i][subset[a]] * y[i]
        rhs[a] = total

    beta = solve(gram, rhs)
    if beta is None:
        return math.inf            # collinear with the current model: never chosen

    rss = 0.0
    for i in range(n):
        prediction = 0.0
        for a in range(k):
            prediction += X[i][subset[a]] * beta[a]
        rss += (y[i] - prediction) ** 2
    return rss


def forward_stepwise(X, y):
    n = len(y)
    p = len(X[0])
    selected = []
    best_aic = aic(n, rss_of(X, y, selected), 0)

    for _ in range(p):                       # at most p additions
        best_feature = None
        best_candidate = best_aic
        for j in range(p):
            if j in selected:
                continue
            trial = selected + [j]
            score = aic(n, rss_of(X, y, trial), len(trial))
            if score < best_candidate:
                best_candidate = score
                best_feature = j

        if best_feature is None:             # no addition lowers AIC: stop
            break
        selected.append(best_feature)
        best_aic = best_candidate

    return selected`,
        profile: 'O(p^2 * (n*k^2 + k^3)) — one complete refit per candidate per step, with the normal equations rebuilt from the raw data every time.',
      },
      'make-it-right': {
        code: `"""Stepwise selection by AIC or BIC - typed, validated, direction-aware."""

from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Vector = NDArray[np.float64]
Direction = Literal["forward", "backward", "both"]
Criterion = Literal["aic", "bic"]

MIN_RSS = float(np.finfo(np.float64).tiny)


@dataclass(frozen=True)
class Step:
    """One accepted move on the path, kept so the search can be audited."""

    action: Literal["add", "drop"]
    feature: int
    criterion: float


@dataclass(frozen=True)
class StepwiseResult:
    selected: tuple[int, ...]
    criterion: float
    path: tuple[Step, ...]


def _criterion_value(X: Matrix, y: Vector, subset: list[int], penalty: float) -> float:
    n = y.size
    if subset:
        design = X[:, subset]
        coefficients, *_ = np.linalg.lstsq(design, y, rcond=None)
        residual = y - design @ coefficients
    else:
        residual = y
    rss = max(float(residual @ residual), MIN_RSS)
    return n * float(np.log(rss / n)) + penalty * len(subset)


def stepwise(
    X: Matrix,
    y: Vector,
    direction: Direction = "both",
    criterion: Criterion = "aic",
    max_steps: int | None = None,
) -> StepwiseResult:
    """Greedy subset search. Raises ValueError on malformed input."""
    if X.ndim != 2:
        raise ValueError(f"X must be 2-D, got shape {X.shape}")
    if X.shape[0] != y.shape[0]:
        raise ValueError(f"X has {X.shape[0]} rows but y has {y.shape[0]}")
    if criterion not in ("aic", "bic"):
        raise ValueError(f"criterion must be 'aic' or 'bic', got {criterion!r}")

    n, p = X.shape
    if direction == "backward" and n <= p:
        raise ValueError(f"backward elimination needs n > p, got n={n}, p={p}")

    penalty = 2.0 if criterion == "aic" else float(np.log(n))

    # Centring stands in for an intercept that is always in the model.
    design = X - X.mean(axis=0)
    target = y - y.mean()

    selected: list[int] = list(range(p)) if direction == "backward" else []
    current = _criterion_value(design, target, selected, penalty)
    path: list[Step] = []

    # Bounded loop: each accepted move strictly lowers the criterion, so the
    # walk cannot cycle, but the explicit cap makes termination checkable.
    for _ in range(max_steps if max_steps is not None else 2 * p):
        moves: list[tuple[str, int, float]] = []
        if direction in ("forward", "both"):
            for feature in range(p):
                if feature in selected:
                    continue
                trial = sorted([*selected, feature])
                moves.append(("add", feature, _criterion_value(design, target, trial, penalty)))
        if direction in ("backward", "both"):
            for feature in selected:
                trial = [kept for kept in selected if kept != feature]
                moves.append(("drop", feature, _criterion_value(design, target, trial, penalty)))

        if not moves:
            break
        action, feature, score = min(moves, key=lambda move: move[2])
        if score >= current:
            break

        selected = sorted([*selected, feature]) if action == "add" else [
            kept for kept in selected if kept != feature
        ]
        path.append(Step(action=action, feature=feature, criterion=score))  # type: ignore[arg-type]
        current = score

    return StepwiseResult(selected=tuple(selected), criterion=current, path=tuple(path))`,
        rationale:
          'The hand-built normal equations and Gaussian elimination are replaced by a library least-squares solve, which also removes the silent failure on collinear candidates. The structural changes matter more than the numerical one. The search becomes direction-aware (forward, backward, or both) and is parameterized by a named criterion rather than a hard-coded 2k. Every accepted move is recorded as a typed Step, so the path is auditable rather than discarded, and the result is an immutable dataclass instead of a bare list. Input is validated before any work, including the n > p requirement that backward elimination silently breaks without.',
        conventions: [
          'Explicit type hints on every public signature',
          'No mutable default arguments',
          'Dataclasses or NamedTuples over ad-hoc dicts',
          'Raise specific exceptions, never bare except',
          'Guard clauses over nested conditionals',
        ],
        libraryName: 'NumPy',
        profile: 'Same O(p^2) refit count as the first stage, but each refit is a LAPACK least-squares call instead of interpreted loops. The algorithm itself has not changed.',
      },
      'make-it-fast': {
        code: `"""Forward selection by incremental orthogonalization - one GEMM per step."""

import numpy as np
from numpy.typing import NDArray

Matrix = NDArray[np.float64]
Vector = NDArray[np.float64]

COLLINEARITY_TOLERANCE = 1e-10
MIN_RSS = float(np.finfo(np.float64).tiny)


def forward_select(
    X: Matrix,
    y: Vector,
    penalty: float = 2.0,
    max_terms: int | None = None,
) -> list[int]:
    """Forward selection without a single refit.

    Each step keeps an orthonormal basis Q of the features chosen so far.
    Residualizing every candidate against Q turns "how much would RSS fall if I
    added column j" into a closed form: (q_j . r)^2, where q_j is that candidate
    after orthogonalization and r is the current residual. All p candidates are
    scored together, so the p refits per step become two matrix products.
    """
    if X.ndim != 2 or X.shape[0] != y.shape[0]:
        raise ValueError(f"shape mismatch: X={X.shape}, y={y.shape}")

    n, p = X.shape
    limit = min(p, n - 2) if max_terms is None else min(max_terms, p, n - 2)
    if limit <= 0:
        return []

    design = np.ascontiguousarray(X, dtype=np.float64)
    design = design - design.mean(axis=0)          # intercept via centring
    residual = np.ascontiguousarray(y, dtype=np.float64) - y.mean()
    column_energy = np.einsum("ij,ij->j", design, design)

    basis = np.empty((n, limit), dtype=np.float64)  # allocated once, filled per step
    available = np.ones(p, dtype=bool)
    selected: list[int] = []
    rss = max(float(residual @ residual), MIN_RSS)

    for step in range(limit):
        q = basis[:, :step]
        # Residualize every candidate against the current basis: two GEMMs.
        projected = design - q @ (q.T @ design)
        energy = np.einsum("ij,ij->j", projected, projected)
        usable = available & (energy > COLLINEARITY_TOLERANCE * column_energy)

        # The residual is already orthogonal to q, so projected.T @ residual
        # equals design.T @ residual and the extra product is skipped.
        covariance = design.T @ residual
        gain = np.full(p, -np.inf)
        gain[usable] = covariance[usable] ** 2 / energy[usable]

        best = int(np.argmax(gain))
        if not usable[best]:
            break

        new_rss = max(rss - gain[best], MIN_RSS)
        if n * np.log(new_rss / rss) + penalty >= 0.0:    # delta-AIC: no longer pays
            break

        direction = projected[:, best] / np.sqrt(energy[best])
        basis[:, step] = direction
        residual -= direction * (direction @ residual)    # in place
        rss = new_rss
        available[best] = False
        selected.append(best)

    return selected`,
        rationale:
          'The change is algorithmic first and numerical second. The earlier stages refit a model for every candidate at every step; here an orthonormal basis of the chosen features is maintained, every candidate is residualized against it in one pair of matrix products, and the RSS reduction for adding column j is read off as (q_j . r)^2 / ||q_j||^2. Selecting a feature costs one Gram-Schmidt update instead of a refit, and no normal equations are ever formed, which is also the numerically safer route because the condition number is not squared. The trade is that the code now supports forward selection only: backward elimination needs the full-model factorization and a downdate, which is a different implementation.',
        optimizations: [
          {
            technique: 'Vectorize to NumPy/BLAS (@, np.dot, einsum)',
            why: 'Residualizing all p candidates against the basis is q @ (q.T @ design), two GEMMs, and the squared norms come from one einsum. The p separate refits per step collapse into a few BLAS calls.',
            tradeoff: 'Allocates an n x p temporary every step. For very wide pools it dominates memory, and it can be worse than a loop when only a small subset of candidates is still eligible.',
          },
          {
            technique: 'Replace a closed-form solve with a numerically stabler factorization',
            why: 'The normal-equations solve squares the condition number of the design. Orthogonalizing against an explicit basis never forms X^T X, so near-collinear candidates degrade gracefully instead of corrupting the solve.',
            tradeoff: 'Classical Gram-Schmidt loses orthogonality as the basis grows with correlated columns. A stricter implementation re-orthogonalizes or uses Householder QR, at roughly twice the cost per step.',
          },
          {
            technique: 'Pre-allocate output arrays and use in-place operations',
            why: 'The basis is allocated once at its final size and filled a column per step, and the residual is updated in place, so the loop never grows or copies the accumulated results.',
            tradeoff: 'The cap on the number of terms must be known up front, and an in-place residual update means an earlier state cannot be recovered without keeping a copy.',
          },
        ],
        libraryName: 'NumPy / BLAS',
        profile: 'O(n*p*k) per step, O(n*p*k^2) in total for k selected terms, against O(p*n*k^2) per step for the refitting stages. Illustrative, not a measured benchmark.',
      },
    },

    cpp: {
      'make-it-work': {
        code: `// Forward stepwise selection by AIC - the objective, transcribed.
// X and y are assumed centred, which is the same as an intercept in every model.
#include <cmath>
#include <cstddef>
#include <limits>
#include <utility>
#include <vector>

const double kSingularTolerance = 1e-12;

// Gaussian elimination with partial pivoting. Returns false if singular.
bool Solve(std::vector<std::vector<double>> a, std::vector<double> b,
           std::vector<double>& solution) {
  const std::size_t size = b.size();
  for (std::size_t col = 0; col < size; ++col) {
    std::size_t pivot = col;
    for (std::size_t row = col + 1; row < size; ++row) {
      if (std::fabs(a[row][col]) > std::fabs(a[pivot][col])) pivot = row;
    }
    if (std::fabs(a[pivot][col]) < kSingularTolerance) return false;
    std::swap(a[col], a[pivot]);
    std::swap(b[col], b[pivot]);
    for (std::size_t row = col + 1; row < size; ++row) {
      const double factor = a[row][col] / a[col][col];
      for (std::size_t inner = col; inner < size; ++inner) {
        a[row][inner] -= factor * a[col][inner];
      }
      b[row] -= factor * b[col];
    }
  }

  solution.assign(size, 0.0);
  for (std::size_t row = size; row-- > 0;) {
    double total = b[row];
    for (std::size_t col = row + 1; col < size; ++col) {
      total -= a[row][col] * solution[col];
    }
    solution[row] = total / a[row][row];
  }
  return true;
}

// AIC = n ln(RSS / n) + 2k for Gaussian errors, up to a constant.
double Aic(std::size_t n, double rss, std::size_t k) {
  const double floor = 1e-300;
  return static_cast<double>(n) * std::log(std::fmax(rss, floor) / static_cast<double>(n)) +
         2.0 * static_cast<double>(k);
}

double RssOf(const std::vector<std::vector<double>>& X, const std::vector<double>& y,
             const std::vector<std::size_t>& subset) {
  const std::size_t n = y.size();
  const std::size_t k = subset.size();
  if (k == 0) {
    double total = 0.0;
    for (std::size_t i = 0; i < n; ++i) total += y[i] * y[i];
    return total;
  }

  // Normal equations (X_S^T X_S) beta = X_S^T y, built entry by entry.
  std::vector<std::vector<double>> gram(k, std::vector<double>(k, 0.0));
  std::vector<double> rhs(k, 0.0);
  for (std::size_t a = 0; a < k; ++a) {
    for (std::size_t b = 0; b < k; ++b) {
      for (std::size_t i = 0; i < n; ++i) gram[a][b] += X[i][subset[a]] * X[i][subset[b]];
    }
    for (std::size_t i = 0; i < n; ++i) rhs[a] += X[i][subset[a]] * y[i];
  }

  std::vector<double> beta;
  if (!Solve(gram, rhs, beta)) return std::numeric_limits<double>::infinity();

  double rss = 0.0;
  for (std::size_t i = 0; i < n; ++i) {
    double prediction = 0.0;
    for (std::size_t a = 0; a < k; ++a) prediction += X[i][subset[a]] * beta[a];
    rss += (y[i] - prediction) * (y[i] - prediction);
  }
  return rss;
}

std::vector<std::size_t> ForwardStepwise(const std::vector<std::vector<double>>& X,
                                         const std::vector<double>& y) {
  const std::size_t n = y.size();
  const std::size_t p = X[0].size();
  std::vector<std::size_t> selected;
  double best_aic = Aic(n, RssOf(X, y, selected), 0);

  for (std::size_t step = 0; step < p; ++step) {   // at most p additions
    bool found = false;
    std::size_t best_feature = 0;
    double best_candidate = best_aic;

    for (std::size_t j = 0; j < p; ++j) {
      bool already_in = false;
      for (std::size_t kept : selected) {
        if (kept == j) already_in = true;
      }
      if (already_in) continue;

      std::vector<std::size_t> trial = selected;
      trial.push_back(j);
      const double score = Aic(n, RssOf(X, y, trial), trial.size());
      if (score < best_candidate) {
        best_candidate = score;
        best_feature = j;
        found = true;
      }
    }

    if (!found) break;                 // no addition lowers AIC: stop
    selected.push_back(best_feature);
    best_aic = best_candidate;
  }
  return selected;
}`,
        profile: 'O(p^2 * (n*k^2 + k^3)) — a full refit per candidate per step over vector<vector<double>>, whose rows are scattered across the heap.',
      },
      'make-it-right': {
        code: `// Forward selection by AIC or BIC - RAII, const-correct, Cholesky-based refits.
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <optional>
#include <span>
#include <stdexcept>
#include <utility>
#include <vector>

namespace {

constexpr double kSingularTolerance = 1e-12;
constexpr double kMinRss = 1e-300;

[[nodiscard]] double Dot(std::span<const double> a, std::span<const double> b) noexcept {
  double total = 0.0;
  for (std::size_t i = 0; i < a.size(); ++i) total += a[i] * b[i];
  return total;
}

// RSS of the least-squares fit on a subset of centred columns, or nullopt if
// the subset is collinear. With G = L L^T, RSS = y^T y - ||L^-1 X^T y||^2, so a
// Cholesky factor and one forward substitution replace a full solve.
[[nodiscard]] std::optional<double> Rss(std::span<const double> x_col,
                                        std::span<const double> y,
                                        const std::vector<std::size_t>& subset) {
  const std::size_t n = y.size();
  const std::size_t k = subset.size();
  const double yy = Dot(y, y);
  if (k == 0) return yy;

  const auto column = [&](std::size_t j) { return x_col.subspan(j * n, n); };

  std::vector<double> lower(k * k, 0.0);
  std::vector<double> rhs(k, 0.0);
  for (std::size_t row = 0; row < k; ++row) {
    rhs[row] = Dot(column(subset[row]), y);
    for (std::size_t col = 0; col <= row; ++col) {
      double entry = Dot(column(subset[row]), column(subset[col]));
      for (std::size_t m = 0; m < col; ++m) entry -= lower[row * k + m] * lower[col * k + m];
      if (row == col) {
        if (entry <= kSingularTolerance) return std::nullopt;
        lower[row * k + row] = std::sqrt(entry);
      } else {
        lower[row * k + col] = entry / lower[col * k + col];
      }
    }
  }

  double projected = 0.0;                   // ||L^-1 X^T y||^2 by forward substitution
  std::vector<double> z(k, 0.0);
  for (std::size_t row = 0; row < k; ++row) {
    double value = rhs[row];
    for (std::size_t m = 0; m < row; ++m) value -= lower[row * k + m] * z[m];
    z[row] = value / lower[row * k + row];
    projected += z[row] * z[row];
  }
  return std::max(yy - projected, 0.0);
}

[[nodiscard]] double Criterion(std::size_t n, double rss, std::size_t k, double penalty) noexcept {
  const double count = static_cast<double>(n);
  return count * std::log(std::max(rss, kMinRss) / count) + penalty * static_cast<double>(k);
}

}  // namespace

class SelectionResult {
 public:
  SelectionResult(std::vector<std::size_t> selected, double criterion)
      : selected_(std::move(selected)), criterion_(criterion) {}

  [[nodiscard]] std::span<const std::size_t> selected() const noexcept { return selected_; }
  [[nodiscard]] double criterion() const noexcept { return criterion_; }

 private:
  std::vector<std::size_t> selected_;   // owned; rule of zero handles the rest
  double criterion_;
};

// x_col is COLUMN-major and flat: feature j occupies x_col[j * n, (j + 1) * n).
// Columns and y must already be centred; the intercept is not solved for.
// penalty is 2 for AIC, or ln(n) for BIC.
SelectionResult ForwardSelect(std::span<const double> x_col,
                              std::span<const double> y,
                              double penalty) {
  if (y.empty()) throw std::invalid_argument("empty problem");
  if (x_col.size() % y.size() != 0) {
    throw std::invalid_argument("X and y describe different row counts");
  }
  if (penalty < 0.0) throw std::invalid_argument("penalty must be non-negative");

  const std::size_t n = y.size();
  const std::size_t d = x_col.size() / n;

  std::vector<std::size_t> selected;
  selected.reserve(d);
  double current = Criterion(n, *Rss(x_col, y, selected), 0, penalty);

  for (std::size_t step = 0; step < d; ++step) {
    std::optional<std::pair<std::size_t, double>> best;
    std::vector<std::size_t> trial = selected;
    trial.push_back(0);                    // slot overwritten for each candidate

    for (std::size_t j = 0; j < d; ++j) {
      if (std::find(selected.begin(), selected.end(), j) != selected.end()) continue;
      trial.back() = j;
      const std::optional<double> rss = Rss(x_col, y, trial);
      if (!rss.has_value()) continue;      // collinear with the current model
      const double score = Criterion(n, *rss, trial.size(), penalty);
      if (!best.has_value() || score < best->second) best = {j, score};
    }

    if (!best.has_value() || best->second >= current) break;
    selected.push_back(best->first);
    current = best->second;
  }

  return SelectionResult(std::move(selected), current);
}`,
        rationale:
          'The nested vectors become one flat column-major buffer viewed through std::span, because the search reads whole columns and a column must be contiguous. Solving the normal equations with Gaussian elimination and then walking the data again to compute residuals is replaced by a Cholesky factor of the Gram matrix: RSS follows from one forward substitution, so no prediction pass is needed and no beta is ever formed. Singular subsets become a std::optional rather than an infinity sentinel. The selection returns an owning class instead of a bare vector, inputs are validated before any allocation, and the penalty is a parameter rather than a hard-coded 2, so BIC is the same code.',
        conventions: [
          'RAII for every owned resource',
          'const-correctness on parameters and members',
          'No raw new/delete; std::vector and smart pointers instead',
          'std::span for non-owning views',
          'Rule of zero — let the compiler generate special members',
          'Fail fast on invalid input before any allocation',
        ],
        profile: 'Still one refit per candidate per step, O(p^2 * (n*k^2 + k^3)), but each refit is one Gram build and a Cholesky factor over contiguous columns.',
      },
      'make-it-fast': {
        code: `// Forward selection by incremental orthogonalization - Eigen, one GEMM per step.
#include <Eigen/Dense>
#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>
#include <vector>

namespace {
constexpr double kCollinearityTolerance = 1e-10;
constexpr double kMinRss = 1e-300;
}  // namespace

// Returns the selected column indices in the order they entered.
//
// A maintained orthonormal basis Q of the chosen features means the RSS drop
// from adding column j is (q_j . r)^2, with q_j that column after it has been
// orthogonalized against Q. Every candidate is scored in two matrix products,
// so p refits per step become one pass over the data.
std::vector<Eigen::Index> ForwardSelect(const Eigen::MatrixXd& X_in,
                                        const Eigen::VectorXd& y_in,
                                        double penalty,
                                        Eigen::Index max_terms) {
  if (X_in.rows() != y_in.size()) {
    throw std::invalid_argument("X and y describe different row counts");
  }

  const Eigen::Index n = X_in.rows();
  const Eigen::Index p = X_in.cols();
  const Eigen::Index limit = std::min({p, n - 2, max_terms});
  if (limit <= 0) return {};

  const Eigen::MatrixXd X = X_in.rowwise() - X_in.colwise().mean();   // intercept via centring
  const Eigen::VectorXd column_energy = X.colwise().squaredNorm();
  Eigen::VectorXd residual = y_in.array() - y_in.mean();
  double rss = std::max(residual.squaredNorm(), kMinRss);

  Eigen::MatrixXd basis(n, limit);                 // allocated once, filled per step
  std::vector<bool> taken(static_cast<std::size_t>(p), false);
  std::vector<Eigen::Index> selected;
  selected.reserve(static_cast<std::size_t>(limit));

  for (Eigen::Index step = 0; step < limit; ++step) {
    const auto q = basis.leftCols(step);
    // Residualize every candidate against the basis in one fused expression.
    const Eigen::MatrixXd projected = X - q * (q.transpose() * X);
    const Eigen::VectorXd energy = projected.colwise().squaredNorm();

    // The residual is already orthogonal to q, so projected^T r == X^T r.
    const Eigen::VectorXd covariance = X.transpose() * residual;

    Eigen::Index best = -1;
    double best_gain = 0.0;
    for (Eigen::Index j = 0; j < p; ++j) {
      if (taken[static_cast<std::size_t>(j)]) continue;
      if (energy[j] <= kCollinearityTolerance * column_energy[j]) continue;
      const double gain = covariance[j] * covariance[j] / energy[j];
      if (gain > best_gain) {
        best_gain = gain;
        best = j;
      }
    }
    if (best < 0) break;

    const double new_rss = std::max(rss - best_gain, kMinRss);
    if (static_cast<double>(n) * std::log(new_rss / rss) + penalty >= 0.0) break;

    basis.col(step) = projected.col(best) / std::sqrt(energy[best]);
    residual -= basis.col(step) * basis.col(step).dot(residual);
    rss = new_rss;
    taken[static_cast<std::size_t>(best)] = true;
    selected.push_back(best);
  }

  return selected;
}`,
        rationale:
          'The refit-per-candidate loop is replaced by incremental orthogonalization: an orthonormal basis of the chosen features is kept as a preallocated Eigen matrix, every remaining column is residualized against it in one expression, and the RSS reduction is read off as covariance squared over residual energy. The Gram matrix is never formed, which sidesteps the squared condition number of the normal equations. Compared with the previous stage the search touches the data O(1) times per step rather than O(p). The cost is scope: this version is forward-only, because backward elimination needs a downdate of a full-model factorization.',
        optimizations: [
          {
            technique: 'Delegate the inner kernel to a tuned BLAS',
            why: 'q.transpose() * X and q * (...) are the two GEMMs that dominate each step. Eigen dispatches them to blocked, cache-aware kernels, which is the one place in this algorithm a tuned kernel decisively beats a hand-written loop.',
            tradeoff: 'The cost is O(n*p*k) per step regardless of how few candidates are still eligible. When the pool is small or the model stops after a few terms, the overhead of the dense products is wasted.',
          },
          {
            technique: 'Eigen expression templates to avoid temporaries',
            why: 'X - q * (q.transpose() * X) evaluates as a single fused expression, so the subtraction does not materialize an extra n x p matrix, and leftCols returns a view of the basis rather than a copy.',
            tradeoff: 'Expression templates produce dense compiler errors, and an expression captured by auto can hold references to temporaries that no longer exist. The projected matrix here is evaluated eagerly for exactly that reason.',
          },
          {
            technique: 'Compile with -O3 -march=native',
            why: 'Eigen leaves vectorization of its kernels to the compiler, and the squared-norm and dot reductions are where that matters most. Without optimization flags the code is slower than the plain loops.',
            tradeoff: '-march=native produces a binary that may fault on an older CPU elsewhere in the fleet.',
          },
        ],
        libraryName: 'Eigen',
        profile: 'O(n*p*k) per step, O(n*p*k^2) in total for k selected terms, against O(p*n*k^2) per step for refitting. Illustrative, not a measured benchmark.',
      },
    },

    rust: {
      'make-it-work': {
        code: `//! Forward stepwise selection by AIC - the objective, transcribed.
//!
//! X and y are assumed centred, which is the same as an intercept in every
//! model: the intercept and the noise variance add the same constant to every
//! candidate's AIC, so they drop out of the comparison.

const SINGULAR_TOLERANCE: f64 = 1e-12;

/// Gaussian elimination with partial pivoting. None if the matrix is singular.
fn solve(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Option<Vec<f64>> {
    let size = b.len();
    for col in 0..size {
        let mut pivot = col;
        for row in (col + 1)..size {
            if a[row][col].abs() > a[pivot][col].abs() {
                pivot = row;
            }
        }
        if a[pivot][col].abs() < SINGULAR_TOLERANCE {
            return None;
        }
        a.swap(col, pivot);
        b.swap(col, pivot);
        for row in (col + 1)..size {
            let factor = a[row][col] / a[col][col];
            for inner in col..size {
                a[row][inner] -= factor * a[col][inner];
            }
            b[row] -= factor * b[col];
        }
    }

    let mut solution = vec![0.0; size];
    for row in (0..size).rev() {
        let mut total = b[row];
        for col in (row + 1)..size {
            total -= a[row][col] * solution[col];
        }
        solution[row] = total / a[row][row];
    }
    Some(solution)
}

/// AIC = n ln(RSS / n) + 2k for Gaussian errors, up to a constant.
fn aic(n: usize, rss: f64, k: usize) -> f64 {
    n as f64 * (rss.max(1e-300) / n as f64).ln() + 2.0 * k as f64
}

fn rss_of(x: &[Vec<f64>], y: &[f64], subset: &[usize]) -> f64 {
    let n = y.len();
    let k = subset.len();
    if k == 0 {
        let mut total = 0.0;
        for i in 0..n {
            total += y[i] * y[i];
        }
        return total;
    }

    // Normal equations (X_S^T X_S) beta = X_S^T y, built entry by entry.
    let mut gram = vec![vec![0.0; k]; k];
    let mut rhs = vec![0.0; k];
    for a in 0..k {
        for b in 0..k {
            for i in 0..n {
                gram[a][b] += x[i][subset[a]] * x[i][subset[b]];
            }
        }
        for i in 0..n {
            rhs[a] += x[i][subset[a]] * y[i];
        }
    }

    let beta = match solve(gram, rhs) {
        Some(beta) => beta,
        None => return f64::INFINITY, // collinear with the current model
    };

    let mut rss = 0.0;
    for i in 0..n {
        let mut prediction = 0.0;
        for a in 0..k {
            prediction += x[i][subset[a]] * beta[a];
        }
        rss += (y[i] - prediction) * (y[i] - prediction);
    }
    rss
}

pub fn forward_stepwise(x: &[Vec<f64>], y: &[f64]) -> Vec<usize> {
    let n = y.len();
    let p = x[0].len();
    let mut selected: Vec<usize> = Vec::new();
    let mut best_aic = aic(n, rss_of(x, y, &selected), 0);

    for _ in 0..p {
        // at most p additions
        let mut best_feature = None;
        let mut best_candidate = best_aic;

        for j in 0..p {
            if selected.contains(&j) {
                continue;
            }
            let mut trial = selected.clone();
            trial.push(j);
            let score = aic(n, rss_of(x, y, &trial), trial.len());
            if score < best_candidate {
                best_candidate = score;
                best_feature = Some(j);
            }
        }

        match best_feature {
            Some(j) => {
                selected.push(j);
                best_aic = best_candidate;
            }
            None => break, // no addition lowers AIC: stop
        }
    }
    selected
}`,
        profile: 'O(p^2 * (n*k^2 + k^3)) — a full refit per candidate per step, with every index bounds-checked and Vec<Vec<f64>> scattering rows across the heap.',
      },
      'make-it-right': {
        code: `//! Forward selection by AIC or BIC - typed errors, newtypes, borrowed slices.

use std::fmt;

const SINGULAR_TOLERANCE: f64 = 1e-12;
const MIN_RSS: f64 = 1e-300;

#[derive(Debug, PartialEq)]
pub enum FitError {
    Empty,
    ShapeMismatch { values: usize, rows: usize },
    Penalty { value: f64 },
}

impl fmt::Display for FitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Empty => write!(f, "cannot select features from an empty dataset"),
            Self::ShapeMismatch { values, rows } => {
                write!(f, "{values} values do not divide into columns of {rows} rows")
            }
            Self::Penalty { value } => {
                write!(f, "penalty must be finite and non-negative, got {value}")
            }
        }
    }
}

impl std::error::Error for FitError {}

/// Price per parameter. A newtype so that a penalty is never confused with any
/// other f64 at a call site: AIC and BIC differ only in this number, and
/// swapping it for a regularization strength is a silent, plausible-looking bug.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Penalty(f64);

impl Penalty {
    pub fn new(value: f64) -> Result<Self, FitError> {
        if !value.is_finite() || value < 0.0 {
            return Err(FitError::Penalty { value });
        }
        Ok(Self(value))
    }

    pub fn aic() -> Self {
        Self(2.0)
    }

    pub fn bic(n: usize) -> Result<Self, FitError> {
        if n == 0 {
            return Err(FitError::Empty);
        }
        Self::new((n as f64).ln())
    }
}

#[derive(Debug, Clone)]
pub struct SelectionResult {
    selected: Vec<usize>,
    criterion: f64,
}

impl SelectionResult {
    #[must_use]
    pub fn selected(&self) -> &[usize] {
        &self.selected
    }

    #[must_use]
    pub fn criterion(&self) -> f64 {
        self.criterion
    }
}

fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(left, right)| left * right).sum()
}

/// RSS of the least-squares fit on a subset of centred columns, or None if the
/// subset is collinear. With G = L L^T, RSS = y^T y - ||L^-1 X^T y||^2, so a
/// Cholesky factor and one forward substitution replace a full solve.
fn residual_sum_of_squares(x_col: &[f64], y: &[f64], subset: &[usize]) -> Option<f64> {
    let n = y.len();
    let k = subset.len();
    let yy = dot(y, y);
    if k == 0 {
        return Some(yy);
    }

    let column = |j: usize| &x_col[j * n..(j + 1) * n];
    let rhs: Vec<f64> = subset.iter().map(|&j| dot(column(j), y)).collect();

    // Cholesky is index-based by nature: entry (row, col) reads earlier rows.
    let mut lower = vec![0.0_f64; k * k];
    for row in 0..k {
        for col in 0..=row {
            let overlap: f64 = (0..col).map(|m| lower[row * k + m] * lower[col * k + m]).sum();
            let entry = dot(column(subset[row]), column(subset[col])) - overlap;
            if row == col {
                if entry <= SINGULAR_TOLERANCE {
                    return None;
                }
                lower[row * k + row] = entry.sqrt();
            } else {
                lower[row * k + col] = entry / lower[col * k + col];
            }
        }
    }

    let mut z = vec![0.0_f64; k];
    for row in 0..k {
        let carried: f64 = (0..row).map(|m| lower[row * k + m] * z[m]).sum();
        z[row] = (rhs[row] - carried) / lower[row * k + row];
    }
    Some((yy - z.iter().map(|value| value * value).sum::<f64>()).max(0.0))
}

fn criterion(n: usize, rss: f64, k: usize, penalty: Penalty) -> f64 {
    n as f64 * (rss.max(MIN_RSS) / n as f64).ln() + penalty.0 * k as f64
}

/// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
/// Columns and y must already be centred; the intercept is not solved for.
pub fn forward_select(
    x_col: &[f64],
    y: &[f64],
    penalty: Penalty,
) -> Result<SelectionResult, FitError> {
    if y.is_empty() {
        return Err(FitError::Empty);
    }
    if x_col.len() % y.len() != 0 {
        return Err(FitError::ShapeMismatch {
            values: x_col.len(),
            rows: y.len(),
        });
    }

    let n = y.len();
    let d = x_col.len() / n;
    let mut selected: Vec<usize> = Vec::with_capacity(d);
    let mut current = criterion(n, dot(y, y), 0, penalty);
    let mut trial: Vec<usize> = Vec::with_capacity(d);

    for _ in 0..d {
        let mut best: Option<(usize, f64)> = None;

        for candidate in (0..d).filter(|j| !selected.contains(j)) {
            trial.clear();
            trial.extend_from_slice(&selected);
            trial.push(candidate);

            let Some(rss) = residual_sum_of_squares(x_col, y, &trial) else {
                continue; // collinear with the current model
            };
            let score = criterion(n, rss, trial.len(), penalty);
            if best.map_or(true, |(_, best_score)| score < best_score) {
                best = Some((candidate, score));
            }
        }

        match best {
            Some((candidate, score)) if score < current => {
                selected.push(candidate);
                current = score;
            }
            _ => break,
        }
    }

    Ok(SelectionResult { selected, criterion: current })
}`,
        rationale:
          'Errors become a typed Result, and the per-parameter price becomes a Penalty newtype validated at construction, so AIC and BIC are one code path and a bare f64 can never be transposed with another tuning knob. The nested Vec becomes a flat column-major buffer addressed through borrowed slices. As in the C++ stage, normal-equations elimination is replaced by a Cholesky factor of the Gram matrix with one forward substitution, because RSS needs only the squared norm of that solution. Singular subsets are an Option instead of an infinity sentinel, and a reusable trial buffer replaces the per-candidate clone.',
        conventions: [
          'Result<T, E> over panics for recoverable errors',
          'Iterator chains over manual index loops',
          'Borrow rather than clone; take &[T] not Vec<T>',
          'Newtypes for units and dimensions',
          'Validate inputs at the constructor boundary',
        ],
        profile: 'Same O(p^2) refit count as the first stage, but each refit runs over contiguous slices with no per-candidate allocation. The algorithm is unchanged.',
      },
      'make-it-fast': {
        code: `//! Forward selection by incremental orthogonalization - parallel candidate scoring.

use rayon::prelude::*;

const COLLINEARITY_TOLERANCE: f64 = 1e-10;
const MIN_RSS: f64 = 1e-300;

#[inline]
fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(left, right)| left * right).sum()
}

/// Writes column minus its projection onto the orthonormal basis into out.
/// Modified Gram-Schmidt: each basis vector is removed in turn from the
/// already-reduced vector, which holds orthogonality better than classical.
fn orthogonalise(column: &[f64], basis: &[f64], n: usize, out: &mut [f64]) {
    out.copy_from_slice(column);
    for q in basis.chunks_exact(n) {
        let coefficient = dot(q, out);
        for (value, direction) in out.iter_mut().zip(q) {
            *value -= coefficient * direction;
        }
    }
}

/// x_col is COLUMN-major: feature j occupies x_col[j * n..(j + 1) * n].
/// Returns the selected columns in the order they entered.
///
/// The RSS drop from adding column j is (q_j . r)^2 / ||q_j||^2, where q_j is
/// the column orthogonalized against the chosen basis and r the residual. Each
/// candidate is independent, so scoring fans out across cores; the selection
/// step that follows is sequential because every step depends on the last.
pub fn forward_select(
    x_col: &[f64],
    y: &[f64],
    penalty: f64,
    max_terms: usize,
) -> Vec<usize> {
    let n = y.len();
    if n < 3 || x_col.len() % n != 0 {
        return Vec::new();
    }
    let d = x_col.len() / n;
    let limit = max_terms.min(d).min(n - 2);

    // Centre once (the intercept), so every later pass reads contiguous slices.
    let mut centred = x_col.to_vec();
    for column in centred.chunks_exact_mut(n) {
        let mean = column.iter().sum::<f64>() / n as f64;
        column.iter_mut().for_each(|value| *value -= mean);
    }
    let y_mean = y.iter().sum::<f64>() / n as f64;
    let mut residual: Vec<f64> = y.iter().map(|value| value - y_mean).collect();

    let energy_of: Vec<f64> = centred.par_chunks_exact(n).map(|column| dot(column, column)).collect();

    // Capacity for every basis vector up front: the buffer never reallocates.
    let mut basis: Vec<f64> = Vec::with_capacity(n * limit);
    let mut selected: Vec<usize> = Vec::with_capacity(limit);
    let mut rss = dot(&residual, &residual).max(MIN_RSS);

    for _ in 0..limit {
        // Score every remaining candidate in parallel. map_init gives each
        // worker one scratch buffer instead of an allocation per candidate.
        let best = centred
            .par_chunks_exact(n)
            .enumerate()
            .filter(|(j, _)| !selected.contains(j))
            .map_init(
                || vec![0.0_f64; n],
                |scratch, (j, column)| {
                    orthogonalise(column, &basis, n, scratch);
                    let energy = dot(scratch, scratch);
                    if energy <= COLLINEARITY_TOLERANCE * energy_of[j] {
                        return (j, 0.0);
                    }
                    let covariance = dot(column, &residual);
                    (j, covariance * covariance / energy)
                },
            )
            .reduce(
                || (usize::MAX, 0.0),
                |left, right| {
                    // Ties go to the lower index so the result is deterministic.
                    if right.1 > left.1 || (right.1 == left.1 && right.0 < left.0) {
                        right
                    } else {
                        left
                    }
                },
            );

        let (feature, gain) = best;
        if feature == usize::MAX || gain <= 0.0 {
            break;
        }
        let new_rss = (rss - gain).max(MIN_RSS);
        if n as f64 * (new_rss / rss).ln() + penalty >= 0.0 {
            break;
        }

        // Extend the basis with the winning column, orthonormalized.
        let mut direction = vec![0.0_f64; n];
        orthogonalise(&centred[feature * n..(feature + 1) * n], &basis, n, &mut direction);
        let norm = dot(&direction, &direction).sqrt();
        direction.iter_mut().for_each(|value| *value /= norm);

        let along = dot(&direction, &residual);
        for (value, component) in residual.iter_mut().zip(&direction) {
            *value -= along * component;
        }

        basis.extend_from_slice(&direction);
        selected.push(feature);
        rss = new_rss;
    }

    selected
}`,
        rationale:
          'The refit per candidate is replaced by incremental orthogonalization: an orthonormal basis of the chosen features is kept in one flat buffer, each candidate is reduced against it, and its RSS gain is a closed form in the reduced column and the current residual. Because candidates are independent, scoring runs under rayon, and map_init hands each worker a single scratch buffer so the parallel loop allocates nothing per candidate. The outer loop stays sequential on purpose: step t+1 needs the basis from step t, so the parallelism sits inside the step rather than across steps. The scope narrows to forward selection, since backward elimination needs a downdated factorization.',
        optimizations: [
          {
            technique: 'rayon for data parallelism',
            why: 'Each candidate is reduced against the basis and scored independently, with no shared mutable state, so par_chunks_exact distributes the p candidates across cores and a plain reduce picks the winner.',
            tradeoff: 'Work-stealing overhead outweighs the gain when p is small or the basis is short, and the tie-break in the reduce is required to keep results deterministic across thread counts.',
          },
          {
            technique: 'Operate on slices to keep data contiguous',
            why: 'Column-major storage makes every candidate and every basis vector a contiguous slice, so the orthogonalization and the dot products are sequential walks the prefetcher can follow and the compiler can vectorize.',
            tradeoff: 'The caller must supply column-major data, so row-major input needs a transpose copy first, and nothing in the signature enforces that shape contract.',
          },
          {
            technique: 'Vec::with_capacity to avoid reallocation',
            why: 'The basis is created with room for every vector it can ever hold, so appending a direction per step never triggers a grow-and-copy of the accumulated basis.',
            tradeoff: 'Reserves n * limit floats up front even when the search stops after two terms, which matters when n is large.',
          },
        ],
        libraryName: 'rayon',
        profile: 'O(n*p*k) per step across cores, O(n*p*k^2) total for k selected terms, against O(p*n*k^2) per step for refitting. Illustrative, not a measured benchmark.',
      },
    },
  },
};
