/**
 * Classical ML models, in canonical general -> niche order.
 *
 * Order follows the category's `groups` array in categories.ts: linear models
 * first (the most general supervised form), causal estimation last (the most
 * specialized — same regression machinery, but the estimand changes from a
 * prediction to an effect).
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 *
 * This barrel is the ONLY contended file in the category — content authors own
 * one model file each and never touch this one.
 */

import type { AiMlModel } from '../../types';
import { LINEAR_REGRESSION } from './linear-regression';
import { LOGISTIC_REGRESSION } from './logistic-regression';
import { GRADIENT_BOOSTING } from './gradient-boosting';
import { PROPENSITY_IPTW } from './propensity-iptw';
import { META_LEARNERS } from './meta-learners';
import { DOUBLE_MACHINE_LEARNING } from './double-machine-learning';

export const CLASSICAL_ML_MODELS: AiMlModel[] = [
  LINEAR_REGRESSION,
  LOGISTIC_REGRESSION,
  GRADIENT_BOOSTING,
  PROPENSITY_IPTW, 
  META_LEARNERS,
  DOUBLE_MACHINE_LEARNING,
];
