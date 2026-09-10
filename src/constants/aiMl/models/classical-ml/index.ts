/**
 * Classical ML models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 *
 * This barrel is the ONLY contended file in the category — content authors own
 * one model file each and never touch this one.
 */

import type { AiMlModel } from '../../types';
import { LINEAR_REGRESSION } from './linear-regression';

export const CLASSICAL_ML_MODELS: AiMlModel[] = [LINEAR_REGRESSION];
