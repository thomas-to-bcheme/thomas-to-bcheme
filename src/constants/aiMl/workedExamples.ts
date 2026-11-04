/**
 * Worked examples: ONE business question answered by several problem genres.
 *
 * PROBLEM_GENRES says what regression, classification and clustering are in the
 * abstract. A worked example shows them pulling apart a single real question
 * into sub-questions that each need a different kind of answer. A lens points at
 * its genre by id and at its models by slug, so definitions and model names are
 * never retyped here.
 *
 * Integrity is enforced by checkWorkedExamples() in scripts/verifyAiMl.ts.
 */

import type { ProblemGenreId } from './types';

/** The genres a worked example is allowed to use as a lens. */
export type WorkedLensGenreId = Extract<ProblemGenreId, 'regression' | 'classification' | 'clustering'>;

export interface WorkedLens {
  genreId: WorkedLensGenreId;
  /** The part of the business question this method answers. */
  subQuestion: string;
  /** What the model is shown; whether a label is present is the defining difference. */
  input: string;
  /** What comes back, as a concrete example row. */
  exampleOutput: string;
  /** How you know it is working, in the unit the business cares about. */
  metric: string;
  /** The decision this output feeds. */
  action: string;
  /** Registered model slugs, most sensible starting point first. */
  modelSlugs: string[];
  /** The signal that this is the right lens for a question. */
  reachWhen: string;
  /** How this lens misleads when it is used on the wrong sub-question. */
  caution: string;
}

export interface WorkedPipelineStep {
  genreId: WorkedLensGenreId;
  label: string;
  detail: string;
}

export interface WorkedExample {
  id: string;
  label: string;
  /** The single question the business actually asked. */
  businessQuestion: string;
  /** Why one method cannot answer all of it. */
  whyMoreThanOneMethod: string;
  lenses: WorkedLens[];
  /** How the lens outputs feed each other in production, in order. */
  pipeline: WorkedPipelineStep[];
}

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: 'retail-demand-inventory',
    label: 'Retail demand & inventory',
    businessQuestion: 'How much of each product should each store hold next week?',
    whyMoreThanOneMethod:
      'That one sentence hides three different questions. "How much will sell" wants a number. "Are we about to run out" wants a yes or no that someone can act on. "Which stores and products behave alike" has no right answer to learn from at all, so there is nothing to predict. The type of answer each question needs, a quantity, a label, or a grouping, is what selects the method.',
    lenses: [
      {
        genreId: 'regression',
        subQuestion: 'How many units will sell, and how sure are we?',
        input:
          'Historical sales per store, product and day, plus price, promotion, weekday, holiday and weather. The target (units sold) is known for every past row.',
        exampleOutput:
          'Store 214, product 88123, next week: median 143 units, 90th percentile 187 units.',
        metric:
          'Weighted absolute percentage error for the median; pinball (quantile) loss for the 90th percentile.',
        action:
          'Set the reorder quantity from the median and the safety stock from the gap between the median and the 90th percentile.',
        modelSlugs: ['linear-regression', 'gradient-boosting', 'quantile-regression'],
        reachWhen: 'The decision needs a quantity, and being off by 10 versus 100 units changes the order.',
        caution:
          'A single point forecast hides the spread. Ordering to the average stocks out about half the time, so ask for quantiles, not just a mean.',
      },
      {
        genreId: 'classification',
        subQuestion: 'Will this product stock out in this store next week?',
        input:
          'The same features, plus current stock on hand and supplier lead time. The label (stocked out or not) is known for every past store-week.',
        exampleOutput: 'Store 214, product 88123: 78% chance of a stockout, so flag it.',
        metric:
          'Precision and recall at the chosen threshold, and PR-AUC, because stockouts are rare and accuracy would reward predicting "no" every time.',
        action:
          'Alert the planner and expedite stock when the probability crosses a threshold set by the cost of a missed sale versus the cost of overstock.',
        modelSlugs: ['logistic-regression', 'random-forest', 'gradient-boosting'],
        reachWhen: 'The decision is a yes or no, and the cost of each kind of mistake is different.',
        caution:
          'The label depends on a threshold someone chose. Rare events need class weighting or resampling, and probabilities need calibrating before the cost-based threshold means anything.',
      },
      {
        genreId: 'clustering',
        subQuestion: 'Which stores and products behave alike?',
        input:
          'Each store or product summarised as a demand profile: average level, weekly shape, seasonality, volatility. There is no label to predict.',
        exampleOutput:
          'Store 214 falls in segment 3 ("tourist coastal: summer peaks, weekend-heavy") with 40 other stores.',
        metric:
          'Silhouette score and stability across reruns, then the real test: do the segments suggest different policies?',
        action:
          'Run one stocking policy per segment, and give a brand-new product or store the forecast of its nearest segment until it has its own history.',
        modelSlugs: ['k-means', 'hierarchical-clustering', 'dbscan', 'pca'],
        reachWhen: 'There is no target to learn, and the goal is to discover structure that a person can name and act on.',
        caution:
          'Clusters always come out, whether or not real groups exist. Scale the features, check stability, and keep only segments that change a decision.',
      },
    ],
    pipeline: [
      {
        genreId: 'clustering',
        label: 'Segment',
        detail: 'Group stores and products by demand profile, with no labels.',
      },
      {
        genreId: 'regression',
        label: 'Forecast',
        detail: 'Predict units and quantiles, with the segment as a feature or one model per segment.',
      },
      {
        genreId: 'classification',
        label: 'Alert',
        detail: 'Turn forecast and stock position into a stockout probability, then act on a threshold.',
      },
    ],
  },
];
