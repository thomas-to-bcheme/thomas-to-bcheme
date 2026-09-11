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
import { ACTOR_CRITIC } from './actor-critic';
import { PPO_TRPO } from './ppo-trpo';
import { DDPG_TD3 } from './ddpg-td3';
import { SAC } from './sac';
import { MULTI_ARMED_BANDITS } from './multi-armed-bandits';
import { MODEL_BASED_RL } from './model-based-rl';

export const REINFORCEMENT_LEARNING_MODELS: AiMlModel[] = [
  MDP_BELLMAN,
  DYNAMIC_PROGRAMMING,
  MONTE_CARLO_CONTROL,
  TD_LEARNING,
  SARSA,
  Q_LEARNING,
  DQN,
  REINFORCE,
  ACTOR_CRITIC,
  PPO_TRPO,
  DDPG_TD3,
  SAC,
  MULTI_ARMED_BANDITS,
  MODEL_BASED_RL,
];
