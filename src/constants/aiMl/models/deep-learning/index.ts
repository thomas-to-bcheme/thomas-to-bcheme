/**
 * Deep-learning models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { CNN } from './cnn';
import { LSTM } from './lstm';
import { GRAPH_NEURAL_NETWORK } from './graph-neural-network';
import { TRANSFORMER } from './transformer';
import { TWO_TOWER_RETRIEVAL } from './two-tower-retrieval';

export const DEEP_LEARNING_MODELS: AiMlModel[] = [CNN, LSTM, GRAPH_NEURAL_NETWORK, TRANSFORMER, TWO_TOWER_RETRIEVAL];
