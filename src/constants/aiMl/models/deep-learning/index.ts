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
import { CTC } from './ctc';
import { GRAPH_NEURAL_NETWORK } from './graph-neural-network';
import { SPATIO_TEMPORAL_GNN } from './spatio-temporal-gnn';
import { NODE2VEC } from './node2vec';
import { TRANSFORMER } from './transformer';
import { VISION_TRANSFORMER } from './vision-transformer';
import { TEMPORAL_FUSION_TRANSFORMER } from './temporal-fusion-transformer';
import { N_BEATS } from './n-beats';
import { DEEPAR } from './deepar';
import { AUTOENCODER } from './autoencoder';
import { ANN_INDEX } from './ann-index';
import { NEURAL_ODE } from './neural-ode';
import { PINN } from './pinn';
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
  CTC,
  GRAPH_NEURAL_NETWORK,
  SPATIO_TEMPORAL_GNN,
  NODE2VEC,
  TRANSFORMER,
  VISION_TRANSFORMER,
  TEMPORAL_FUSION_TRANSFORMER,
  N_BEATS,
  DEEPAR,
  AUTOENCODER,
  ANN_INDEX,
  NEURAL_ODE,
  PINN,
  TWO_TOWER_RETRIEVAL,
];
