/**
 * Generative AI models, in canonical general -> niche order.
 *
 * Explicit imports, never a directory scan: a glob would defeat both
 * generateStaticParams' static analysis and Turbopack's tree-shaking.
 */

import type { AiMlModel } from '../../types';
import { VAE } from './vae';

export const GENERATIVE_AI_MODELS: AiMlModel[] = [VAE];
