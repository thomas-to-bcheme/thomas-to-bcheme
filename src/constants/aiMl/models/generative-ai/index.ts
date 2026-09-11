/**
 * Generative AI models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { VAE } from './vae';
import { NORMALIZING_FLOWS } from './normalizing-flows';
import { GAN } from './gan';
import { WGAN_CONDITIONAL_GAN } from './wgan-conditional-gan';
import { DDPM } from './ddpm';
import { SCORE_BASED_FLOW_MATCHING } from './score-based-flow-matching';
import { TIME_SERIES_DIFFUSION } from './time-series-diffusion';
import { DECODER_ONLY_LM } from './decoder-only-lm';
import { MASKED_LM } from './masked-lm';
import { MIXTURE_OF_EXPERTS } from './mixture-of-experts';
import { CONTRASTIVE_EMBEDDINGS } from './contrastive-embeddings';
import { RAG } from './rag';

export const GENERATIVE_AI_MODELS: AiMlModel[] = [
  VAE,
  NORMALIZING_FLOWS,
  GAN,
  WGAN_CONDITIONAL_GAN,
  DDPM,
  SCORE_BASED_FLOW_MATCHING,
  TIME_SERIES_DIFFUSION,
  DECODER_ONLY_LM,
  MASKED_LM,
  MIXTURE_OF_EXPERTS,
  CONTRASTIVE_EMBEDDINGS,
  RAG,
];
