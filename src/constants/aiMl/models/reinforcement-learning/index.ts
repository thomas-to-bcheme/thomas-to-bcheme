/**
 * Reinforcement-learning models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { MDP_BELLMAN } from './mdp-bellman';
import { DYNAMIC_PROGRAMMING } from './dynamic-programming';
import { MONTE_CARLO_CONTROL } from './monte-carlo-control';
import { TD_LEARNING } from './td-learning';
import { Q_LEARNING } from './q-learning';

export const REINFORCEMENT_LEARNING_MODELS: AiMlModel[] = [
  MDP_BELLMAN,
  DYNAMIC_PROGRAMMING,
  MONTE_CARLO_CONTROL,
  TD_LEARNING,
  Q_LEARNING,
];
