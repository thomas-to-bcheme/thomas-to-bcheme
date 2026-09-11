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
import { SARSA } from './sarsa';
import { Q_LEARNING } from './q-learning';
import { DQN } from './dqn';
import { REINFORCE } from './reinforce';

export const REINFORCEMENT_LEARNING_MODELS: AiMlModel[] = [
  MDP_BELLMAN,
  DYNAMIC_PROGRAMMING,
  MONTE_CARLO_CONTROL,
  TD_LEARNING,
  SARSA,
  Q_LEARNING,
  DQN,
  REINFORCE,
];
