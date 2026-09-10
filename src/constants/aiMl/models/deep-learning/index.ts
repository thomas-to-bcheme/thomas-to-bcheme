/**
 * Deep-learning models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { PERCEPTRON } from './perceptron';
import { MLP } from './mlp';
import { CNN } from './cnn';
import { OBJECT_DETECTION } from './object-detection';
import { RNN } from './rnn';
import { LSTM } from './lstm';
import { GRU } from './gru';
import { TCN } from './tcn';
import { SEQ2SEQ_ATTENTION } from './seq2seq-attention';
import { GRAPH_NEURAL_NETWORK } from './graph-neural-network';
import { TRANSFORMER } from './transformer';
import { TWO_TOWER_RETRIEVAL } from './two-tower-retrieval';

export const DEEP_LEARNING_MODELS: AiMlModel[] = [
  PERCEPTRON,
  MLP,
  CNN,
  OBJECT_DETECTION,
  RNN,
  LSTM,
  GRU,
  TCN,
  SEQ2SEQ_ATTENTION,
  GRAPH_NEURAL_NETWORK,
  TRANSFORMER,
  TWO_TOWER_RETRIEVAL,
];
