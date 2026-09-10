/**
 * AI/ML model registry — aggregator and safe lookups.
 *
 * Deliberately has no module-scope integrity assertion or throw. Two reasons:
 * a throw here would ship into any client bundle that ever imported this
 * module, and the gate has to be able to PASS while categories are still
 * deliberately empty during the content phases. Integrity lives in
 * scripts/verifyAiMl.ts instead. Lookups stay null-returning, matching the
 * §7.3 "safe access" convention and src/constants/glossary/index.ts.
 *
 * BUNDLE SAFETY: no 'use client' file may import this module or anything under
 * ./models. The registry will hold ~520 code strings once content lands, and a
 * single client import would drag all of them into the browser bundle. Client
 * components import ./types (which carries the display-order constants for
 * exactly this reason) and receive model data as props. Enforced by a grep in
 * scripts/verifyAiMl.ts.
 */

import type {
  AiMlCategory,
  AiMlCategoryId,
  AiMlModel,
  AiMlModelGroup,
  AppliedDomain,
  AppliedDomainId,
  FeaturedDomainId,
} from './types';
import { DOMAIN_FIT_ORDER } from './types';
import { AI_ML_CATEGORIES } from './categories';
import { APPLIED_DOMAINS } from './appliedDomains';
import { CLASSICAL_ML_MODELS } from './models/classical-ml';
import { DEEP_LEARNING_MODELS } from './models/deep-learning';
import { GENERATIVE_AI_MODELS } from './models/generative-ai';
import { REINFORCEMENT_LEARNING_MODELS } from './models/reinforcement-learning';

export * from './types';
export { AI_ML_CATEGORIES } from './categories';
export { APPLIED_DOMAINS } from './appliedDomains';
export { LANGUAGE_STANDARDS, type LanguageStandard } from './languageStandards';
export { DECISION_TREE, type DecisionTreeNode, type DecisionTarget, type DecisionTargetKind } from './decisionTree';

/** Canonical order: categories general -> niche, models general -> niche within. */
export const AI_ML_MODELS: AiMlModel[] = [
  ...CLASSICAL_ML_MODELS,
  ...DEEP_LEARNING_MODELS,
  ...GENERATIVE_AI_MODELS,
  ...REINFORCEMENT_LEARNING_MODELS,
];

const MODELS_BY_SLUG = new Map(AI_ML_MODELS.map((model) => [model.slug, model]));

export function getModelBySlug(slug: string): AiMlModel | null {
  return MODELS_BY_SLUG.get(slug) ?? null;
}

export function getCategoryById(id: string): AiMlCategory | null {
  return AI_ML_CATEGORIES.find((category) => category.id === id) ?? null;
}

/** Preserves registry order, which is already general -> niche. */
export function getModelsByCategory(id: AiMlCategoryId): AiMlModel[] {
  return AI_ML_MODELS.filter((model) => model.category === id);
}

export function getGroup(categoryId: AiMlCategoryId, groupId: string): AiMlModelGroup | null {
  return getCategoryById(categoryId)?.groups.find((group) => group.id === groupId) ?? null;
}

export function getModelsByGroup(categoryId: AiMlCategoryId, groupId: string): AiMlModel[] {
  return getModelsByCategory(categoryId).filter((model) => model.group === groupId);
}

export function getDomainById(id: string): AppliedDomain | null {
  return APPLIED_DOMAINS.find((domain) => domain.id === id) ?? null;
}

export const FEATURED_DOMAINS: AppliedDomain[] = APPLIED_DOMAINS.filter((d) => d.featured);
export const BREADTH_DOMAINS: AppliedDomain[] = APPLIED_DOMAINS.filter((d) => !d.featured);

function isFeatured(id: AppliedDomainId): id is FeaturedDomainId {
  return (
    id === 'time-series-forecasting' ||
    id === 'anomaly-detection' ||
    id === 'optimization'
  );
}

/** The `fit` a model claims for a domain, or null when it makes no claim. */
export function getModelDomainFit(model: AiMlModel, domain: AppliedDomainId) {
  if (isFeatured(domain)) return model.applications.featured[domain];
  return model.applications.breadth[domain] ?? null;
}

/**
 * A pure projection over the registry — the cross-cut view the /ai-ml/applied
 * pages render. Ranked primary -> viable -> adapted, ties broken by registry
 * order so the result is deterministic between server render and any re-sort.
 */
export function getModelsByDomain(domain: AppliedDomainId): AiMlModel[] {
  return AI_ML_MODELS.filter((model) => {
    const profile = getModelDomainFit(model, domain);
    return profile !== null && profile.fit !== 'not-applicable';
  }).sort((a, b) => {
    const fitA = getModelDomainFit(a, domain);
    const fitB = getModelDomainFit(b, domain);
    const rankA = fitA ? DOMAIN_FIT_ORDER[fitA.fit] : DOMAIN_FIT_ORDER['not-applicable'];
    const rankB = fitB ? DOMAIN_FIT_ORDER[fitB.fit] : DOMAIN_FIT_ORDER['not-applicable'];
    return rankA - rankB;
  });
}
