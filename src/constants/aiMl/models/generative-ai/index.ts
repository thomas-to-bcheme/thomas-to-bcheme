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

export const GENERATIVE_AI_MODELS: AiMlModel[] = [
  VAE,
  NORMALIZING_FLOWS,
  GAN,
  WGAN_CONDITIONAL_GAN,
  DDPM,
];
