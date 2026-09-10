/**
 * The canonical AI/ML model worklist.
 *
 * This file exists so that "what is left to author" is derivable from the
 * REPOSITORY rather than from a human reading prose in the plan. The plan
 * describes intent; this is the machine-readable ledger, and it is what makes
 * the content build resumable across sessions that share no context.
 *
 * scripts/auditAiMl.ts diffs this against the registry and emits the next
 * unauthored entry, so a cold session can pick up exactly where the last one
 * stopped without being told.
 *
 * ORDER IS THE WORK ORDER. Entries are listed general -> niche within each
 * group, matching the canonical ordering in categories.ts, so authoring
 * top-to-bottom means a category fills in a pedagogically sensible sequence.
 *
 * Adding an entry here declares intent to author it; the verifier's ledger
 * check will then hold the content phase to this list.
 */

import type { AiMlCategoryId } from './types';

export interface BacklogEntry {
  slug: string;
  name: string;
  category: AiMlCategoryId;
  /** Must match a group id in that category's `groups` array. */
  group: string;
}

export const AI_ML_BACKLOG: BacklogEntry[] = [
  // ---------------------------------------------------------------- Classical ML
  { slug: 'linear-regression', name: 'Linear Regression', category: 'classical-ml', group: 'linear-models' },
  { slug: 'ridge-lasso', name: 'Ridge, Lasso & Elastic Net', category: 'classical-ml', group: 'linear-models' },
  { slug: 'logistic-regression', name: 'Logistic Regression', category: 'classical-ml', group: 'linear-models' },
  { slug: 'generalized-linear-models', name: 'Generalized Linear Models', category: 'classical-ml', group: 'linear-models' },

  { slug: 'k-nearest-neighbours', name: 'k-Nearest Neighbours', category: 'classical-ml', group: 'instance-and-kernel' },
  { slug: 'support-vector-machine', name: 'Support Vector Machine', category: 'classical-ml', group: 'instance-and-kernel' },

  { slug: 'naive-bayes', name: 'Naive Bayes', category: 'classical-ml', group: 'probabilistic' },
  { slug: 'gaussian-mixture', name: 'Gaussian Mixture Models (EM)', category: 'classical-ml', group: 'probabilistic' },
  { slug: 'gaussian-process', name: 'Gaussian Process Regression', category: 'classical-ml', group: 'probabilistic' },

  { slug: 'decision-tree', name: 'Decision Tree (CART)', category: 'classical-ml', group: 'trees-and-ensembles' },
  { slug: 'random-forest', name: 'Random Forest', category: 'classical-ml', group: 'trees-and-ensembles' },
  { slug: 'gradient-boosting', name: 'Gradient Boosted Trees', category: 'classical-ml', group: 'trees-and-ensembles' },
  { slug: 'isolation-forest', name: 'Isolation Forest', category: 'classical-ml', group: 'trees-and-ensembles' },

  { slug: 'pca', name: 'Principal Component Analysis', category: 'classical-ml', group: 'structure' },
  { slug: 'k-means', name: 'k-Means Clustering', category: 'classical-ml', group: 'structure' },
  { slug: 'spectral-clustering', name: 'Spectral Clustering', category: 'classical-ml', group: 'structure' },
  { slug: 'matrix-factorization', name: 'Matrix Factorization', category: 'classical-ml', group: 'structure' },

  { slug: 'arima', name: 'ARIMA / SARIMAX', category: 'classical-ml', group: 'classical-time-series' },
  { slug: 'exponential-smoothing', name: 'Exponential Smoothing (Holt-Winters)', category: 'classical-ml', group: 'classical-time-series' },
  { slug: 'kalman-filter', name: 'Kalman Filter & State-Space Models', category: 'classical-ml', group: 'classical-time-series' },

  { slug: 'propensity-iptw', name: 'Propensity Scores & IPTW', category: 'classical-ml', group: 'causal-estimation' },
  { slug: 'meta-learners', name: 'S / T / X Meta-Learners', category: 'classical-ml', group: 'causal-estimation' },
  { slug: 'double-machine-learning', name: 'Double Machine Learning', category: 'classical-ml', group: 'causal-estimation' },
  { slug: 'instrumental-variables', name: 'Instrumental Variables & Difference-in-Differences', category: 'classical-ml', group: 'causal-estimation' },

  // --------------------------------------------------------------- Deep Learning
  { slug: 'perceptron', name: 'Perceptron', category: 'deep-learning', group: 'foundations' },
  { slug: 'mlp', name: 'Multilayer Perceptron', category: 'deep-learning', group: 'foundations' },

  { slug: 'cnn', name: 'Convolutional Neural Network', category: 'deep-learning', group: 'spatial' },
  { slug: 'object-detection', name: 'Object Detection Heads (IoU & Box Regression)', category: 'deep-learning', group: 'spatial' },

  { slug: 'rnn', name: 'Recurrent Neural Network', category: 'deep-learning', group: 'sequence' },
  { slug: 'lstm', name: 'Long Short-Term Memory', category: 'deep-learning', group: 'sequence' },
  { slug: 'gru', name: 'Gated Recurrent Unit', category: 'deep-learning', group: 'sequence' },
  { slug: 'tcn', name: 'Temporal Convolutional Network', category: 'deep-learning', group: 'sequence' },
  { slug: 'seq2seq-attention', name: 'Seq2Seq with Attention', category: 'deep-learning', group: 'sequence' },
  { slug: 'ctc', name: 'Connectionist Temporal Classification', category: 'deep-learning', group: 'sequence' },

  { slug: 'graph-neural-network', name: 'Graph Neural Network', category: 'deep-learning', group: 'graph' },
  { slug: 'spatio-temporal-gnn', name: 'Spatio-Temporal Graph Network', category: 'deep-learning', group: 'graph' },
  { slug: 'node2vec', name: 'DeepWalk & Node2Vec', category: 'deep-learning', group: 'graph' },

  { slug: 'transformer', name: 'Transformer', category: 'deep-learning', group: 'attention' },
  { slug: 'vision-transformer', name: 'Vision Transformer', category: 'deep-learning', group: 'attention' },
  { slug: 'temporal-fusion-transformer', name: 'Temporal Fusion Transformer', category: 'deep-learning', group: 'attention' },

  { slug: 'n-beats', name: 'N-BEATS / N-HiTS', category: 'deep-learning', group: 'forecasting-native' },
  { slug: 'deepar', name: 'DeepAR', category: 'deep-learning', group: 'forecasting-native' },

  { slug: 'autoencoder', name: 'Autoencoder', category: 'deep-learning', group: 'representation' },

  { slug: 'two-tower-retrieval', name: 'Two-Tower Retrieval', category: 'deep-learning', group: 'retrieval' },
  { slug: 'ann-index', name: 'ANN Index & Vector Search (HNSW, IVF-PQ)', category: 'deep-learning', group: 'retrieval' },

  { slug: 'neural-ode', name: 'Neural ODE', category: 'deep-learning', group: 'scientific' },
  { slug: 'pinn', name: 'Physics-Informed Neural Network', category: 'deep-learning', group: 'scientific' },

  // --------------------------------------------------------------- Generative AI
  { slug: 'vae', name: 'Variational Autoencoder', category: 'generative-ai', group: 'latent-variable' },
  { slug: 'normalizing-flows', name: 'Normalizing Flows', category: 'generative-ai', group: 'latent-variable' },

  { slug: 'gan', name: 'Generative Adversarial Network', category: 'generative-ai', group: 'adversarial' },
  { slug: 'wgan-conditional-gan', name: 'WGAN-GP & Conditional GAN', category: 'generative-ai', group: 'adversarial' },

  { slug: 'ddpm', name: 'Denoising Diffusion (DDPM)', category: 'generative-ai', group: 'diffusion' },
  { slug: 'score-based-flow-matching', name: 'Score-Based Models & Flow Matching', category: 'generative-ai', group: 'diffusion' },
  { slug: 'time-series-diffusion', name: 'Time-Series Diffusion & Foundation Models', category: 'generative-ai', group: 'diffusion' },

  { slug: 'decoder-only-lm', name: 'Decoder-Only Language Model', category: 'generative-ai', group: 'autoregressive' },
  { slug: 'masked-lm', name: 'Masked Language Model', category: 'generative-ai', group: 'autoregressive' },
  { slug: 'mixture-of-experts', name: 'Mixture of Experts', category: 'generative-ai', group: 'autoregressive' },

  { slug: 'contrastive-embeddings', name: 'Contrastive Embeddings (InfoNCE, CLIP)', category: 'generative-ai', group: 'representation-retrieval' },
  { slug: 'rag', name: 'Retrieval-Augmented Generation', category: 'generative-ai', group: 'representation-retrieval' },

  { slug: 'lora-peft', name: 'LoRA & Parameter-Efficient Fine-Tuning', category: 'generative-ai', group: 'adaptation-alignment' },
  { slug: 'rlhf-dpo', name: 'RLHF & Direct Preference Optimization', category: 'generative-ai', group: 'adaptation-alignment' },

  // ------------------------------------------------------- Reinforcement Learning
  { slug: 'mdp-bellman', name: 'MDPs & the Bellman Equations', category: 'reinforcement-learning', group: 'foundations' },
  { slug: 'dynamic-programming', name: 'Dynamic Programming (Value & Policy Iteration)', category: 'reinforcement-learning', group: 'foundations' },
  { slug: 'monte-carlo-control', name: 'Monte Carlo Control', category: 'reinforcement-learning', group: 'foundations' },
  { slug: 'td-learning', name: 'Temporal-Difference Learning: TD(0) & TD(lambda)', category: 'reinforcement-learning', group: 'foundations' },

  { slug: 'sarsa', name: 'SARSA', category: 'reinforcement-learning', group: 'value-based' },
  { slug: 'q-learning', name: 'Q-Learning', category: 'reinforcement-learning', group: 'value-based' },
  { slug: 'dqn', name: 'Deep Q-Network (DQN)', category: 'reinforcement-learning', group: 'value-based' },

  { slug: 'reinforce', name: 'REINFORCE', category: 'reinforcement-learning', group: 'policy-gradient' },
  { slug: 'actor-critic', name: 'Actor-Critic (A2C)', category: 'reinforcement-learning', group: 'policy-gradient' },
  { slug: 'ppo-trpo', name: 'TRPO & PPO', category: 'reinforcement-learning', group: 'policy-gradient' },

  { slug: 'ddpg-td3', name: 'DDPG & TD3', category: 'reinforcement-learning', group: 'continuous-control' },
  { slug: 'sac', name: 'Soft Actor-Critic', category: 'reinforcement-learning', group: 'continuous-control' },

  { slug: 'multi-armed-bandits', name: 'Multi-Armed Bandits (UCB, Thompson)', category: 'reinforcement-learning', group: 'online-decision' },
  { slug: 'model-based-rl', name: 'Model-Based RL & MPC', category: 'reinforcement-learning', group: 'online-decision' },
  { slug: 'imitation-learning', name: 'Imitation Learning (Behavioral Cloning, DAgger)', category: 'reinforcement-learning', group: 'online-decision' },
];
