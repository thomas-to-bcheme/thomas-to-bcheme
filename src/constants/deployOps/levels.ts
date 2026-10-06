/**
 * The two specialization pages beneath the DeployOps overview and the route
 * each owns. Plain data with no registry import, so src/constants/site.ts can
 * derive the DeployOps nav group from it.
 */

import type { LevelId, LevelPageMeta } from './types';

export const DEPLOYOPS_BASE_PATH = '/deployops';

const levelHref = (id: LevelId) => `${DEPLOYOPS_BASE_PATH}/${id}`;

export const DEPLOYOPS_LEVELS: LevelPageMeta[] = [
  {
    id: 'devops',
    href: levelHref('devops'),
    navLabel: 'DevOps',
    eyebrow: 'Specialization 1 · DevOps',
    title: 'Make the code path',
    titleAccent: 'reproducible and reversible',
    lede: 'Traditional software delivery is the foundation everything else stands on. This page takes each stage of the overview lifecycle and asks which technology answers it and why that technology exists: git for nameable history, CI for verification nobody can skip, containers for pinned environments, registries for immutable artifacts, Kubernetes and GitOps for declared state, and observability for questions you did not plan to ask.',
    summary: 'Git, CI, containers, registries, Kubernetes, IaC and GitOps, six release strategies, and observability, each argued from first principles.',
  },
  {
    id: 'ai-llm-mlops',
    href: levelHref('ai-llm-mlops'),
    navLabel: 'AI/LLM/MLOps',
    eyebrow: 'Specialization 2 · AI / LLM / MLOps',
    title: 'Same loop,',
    titleAccent: 'probabilistic parts',
    lede: 'A model changes the lifecycle in five ways: behavior depends on data and weights as well as code, correctness is statistical, failures are silent, cost is per request, and the loop closes through data. This page applies each overview stage to machine learning and LLM systems, builds on the DevOps foundation for the deterministic parts, and says plainly where determinism stops.',
    summary: 'What changes at each lifecycle stage for ML and LLM systems: data and model versioning, training at scale, serving, evals, cost, agents, and where determinism breaks.',
  },
];

/** Takes a raw route segment, so the [level] page can look it up before narrowing. */
export function getLevelById(id: string): LevelPageMeta | null {
  return DEPLOYOPS_LEVELS.find((level) => level.id === id) ?? null;
}
