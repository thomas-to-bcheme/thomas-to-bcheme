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
import { RIDGE_LASSO } from './ridge-lasso';
import { LOGISTIC_REGRESSION } from './logistic-regression';
import { GENERALIZED_LINEAR_MODELS } from './generalized-linear-models';
import { K_NEAREST_NEIGHBOURS } from './k-nearest-neighbours';
import { SUPPORT_VECTOR_MACHINE } from './support-vector-machine';
import { NAIVE_BAYES } from './naive-bayes';
import { GAUSSIAN_MIXTURE } from './gaussian-mixture';
import { GAUSSIAN_PROCESS } from './gaussian-process';
import { DECISION_TREE } from './decision-tree';
import { RANDOM_FOREST } from './random-forest';
import { ISOLATION_FOREST } from './isolation-forest';
import { PCA } from './pca';
import { K_MEANS } from './k-means';
import { GRADIENT_BOOSTING } from './gradient-boosting';
import { PROPENSITY_IPTW } from './propensity-iptw';
import { META_LEARNERS } from './meta-learners';
import { DOUBLE_MACHINE_LEARNING } from './double-machine-learning';

export const CLASSICAL_ML_MODELS: AiMlModel[] = [
  LINEAR_REGRESSION,
  RIDGE_LASSO,
  LOGISTIC_REGRESSION,
  GENERALIZED_LINEAR_MODELS,
  K_NEAREST_NEIGHBOURS,
  SUPPORT_VECTOR_MACHINE,
  NAIVE_BAYES,
  GAUSSIAN_MIXTURE,
  GAUSSIAN_PROCESS,
  DECISION_TREE,
  RANDOM_FOREST,
  GRADIENT_BOOSTING,
  ISOLATION_FOREST,
  PCA,
  K_MEANS,
  PROPENSITY_IPTW, 
  META_LEARNERS,
  DOUBLE_MACHINE_LEARNING,
];
