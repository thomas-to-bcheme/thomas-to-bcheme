/**
 * Glossary category definitions.
 *
 * Array position is canonical display/diagram order — two tracks, in the
 * same real dependency order the site's changelog already uses for its "SWE
 * Compass" mental model: Foundations (hardware + software substrate that
 * everything else runs on, independent of each other) then the ML Lifecycle
 * (data → model → ops → evaluation feedback loop, built on Foundations).
 * See plan §1/§4 — GlossaryStackDiagram renders this order + each
 * category's live term count directly, so it can't drift from this file.
 */

import type { LucideIcon } from 'lucide-react';
import { Cpu, Network, Database, BrainCircuit, Sparkles, Workflow, HeartPulse } from 'lucide-react';
import type { GlossaryCategory } from './types';

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  {
    id: 'gpu-cuda',
    label: 'GPU & CUDA Compute',
    eyebrow: 'Foundations · Hardware',
    description:
      'The physical silicon and execution model everything above it eventually compiles down to or runs on top of.',
    track: 'foundation',
    icon: Cpu as LucideIcon,
  },
  {
    id: 'systems-design',
    label: 'Software Engineering & System Design',
    eyebrow: 'Foundations · Software',
    description:
      'The distributed-systems substrate — databases, caching, APIs, deployment, security — that data and model work is built on top of.',
    track: 'foundation',
    icon: Network as LucideIcon,
  },
  {
    id: 'data-engineering',
    label: 'Data Engineering',
    eyebrow: 'ML Lifecycle · Data',
    description: 'The pipelines that move and shape data through the compute and systems substrate below it.',
    track: 'ml-lifecycle',
    icon: Database as LucideIcon,
  },
  {
    id: 'data-science-ml',
    label: 'Data Science & ML Modeling',
    eyebrow: 'ML Lifecycle · Model',
    description: 'Statistical and deep-learning modeling mechanisms applied to prepared data.',
    track: 'ml-lifecycle',
    icon: BrainCircuit as LucideIcon,
  },
  {
    id: 'ai-ml-engineering',
    label: 'AI/ML Engineering',
    eyebrow: 'ML Lifecycle · Model',
    description: 'Generative and LLM-era systems built on top of models, data, and the systems substrate.',
    track: 'ml-lifecycle',
    icon: Sparkles as LucideIcon,
  },
  {
    id: 'mlops-infra',
    label: 'MLOps & Infrastructure',
    eyebrow: 'ML Lifecycle · Operate',
    description: 'The operational machinery that turns a model artifact into a production system.',
    track: 'ml-lifecycle',
    icon: Workflow as LucideIcon,
  },
  {
    id: 'evaluation-observability',
    label: 'Evaluation, Monitoring & Observability',
    eyebrow: 'ML Lifecycle · Verify',
    description: 'The feedback loop that watches every tier below and reports whether it is actually working.',
    track: 'ml-lifecycle',
    icon: HeartPulse as LucideIcon,
  },
];

/** Canonical track ordering — mirrors TIER_ORDER's role in systemDesign.ts. */
export const GLOSSARY_TRACK_ORDER = ['foundation', 'ml-lifecycle'] as const;
