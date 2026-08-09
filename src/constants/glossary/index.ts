/**
 * Glossary data — aggregator and safe lookups.
 *
 * Concatenates all seven category files into one flat GLOSSARY_TERMS array.
 * Deliberately has no module-scope integrity assertion or throw — see plan
 * §8: that check lives in scripts/verifyGlossary.ts instead, because this
 * module is imported by a 'use client' component (GlossaryBrowser) and a
 * throw here would ship into the browser bundle and re-fire on every
 * hydration. Lookups stay safe/null-returning here, matching the repo's
 * existing §7.3 "safe access" convention.
 */

import type { GlossaryCategory, GlossaryCategoryId, GlossaryTerm } from './types';
import { GLOSSARY_CATEGORIES } from './categories';
import { GLOSSARY_TERMS_GPU_CUDA } from './gpuCuda';
import { GLOSSARY_TERMS_SYSTEMS_DESIGN } from './systemsDesign';
import { GLOSSARY_TERMS_DATA_ENGINEERING } from './dataEngineering';
import { GLOSSARY_TERMS_DATA_SCIENCE_ML } from './dataScienceMl';
import { GLOSSARY_TERMS_AI_ML_ENGINEERING } from './aiMlEngineering';
import { GLOSSARY_TERMS_MLOPS_INFRA } from './mlopsInfra';
import { GLOSSARY_TERMS_EVALUATION_OBSERVABILITY } from './evaluationObservability';

export type { GlossaryCategory, GlossaryCategoryId, GlossaryTerm, GlossaryTrack, GlossaryVoiceTemplate } from './types';
export { MIN_TERMS_PER_CATEGORY } from './types';
export { GLOSSARY_CATEGORIES, GLOSSARY_TRACK_ORDER } from './categories';

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  ...GLOSSARY_TERMS_GPU_CUDA,
  ...GLOSSARY_TERMS_SYSTEMS_DESIGN,
  ...GLOSSARY_TERMS_DATA_ENGINEERING,
  ...GLOSSARY_TERMS_DATA_SCIENCE_ML,
  ...GLOSSARY_TERMS_AI_ML_ENGINEERING,
  ...GLOSSARY_TERMS_MLOPS_INFRA,
  ...GLOSSARY_TERMS_EVALUATION_OBSERVABILITY,
];

/** Terms in a category, alphabetized with a fixed locale so server-render
 * and client-side re-sort can never diverge and cause a hydration mismatch. */
export function getTermsByCategory(categoryId: GlossaryCategoryId): GlossaryTerm[] {
  return GLOSSARY_TERMS.filter((t) => t.category === categoryId).sort((a, b) =>
    a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
  );
}

export function getTermBySlug(slug: string): GlossaryTerm | null {
  return GLOSSARY_TERMS.find((t) => t.slug === slug) ?? null;
}

export function getCategoryById(id: GlossaryCategoryId): GlossaryCategory | null {
  return GLOSSARY_CATEGORIES.find((c) => c.id === id) ?? null;
}
