/**
 * Reinforcement-learning models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { MDP_BELLMAN } from './mdp-bellman';
import { DYNAMIC_PROGRAMMING } from './dynamic-programming';
import { Q_LEARNING } from './q-learning';

export const REINFORCEMENT_LEARNING_MODELS: AiMlModel[] = [
  MDP_BELLMAN,
  DYNAMIC_PROGRAMMING,
  Q_LEARNING,
];
