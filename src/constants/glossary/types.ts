/**
 * Glossary data model — shared types.
 *
 * See the approved plan at
 * .claude/plans/review-https-modal-com-gpu-glossary-and-parallel-unicorn.md
 * for the full design rationale. Key structural decisions encoded here:
 *
 *  - One category file per GlossaryCategoryId (gpuCuda.ts, systemsDesign.ts,
 *    …) rather than one shared array, so each category can be authored by an
 *    isolated subagent with zero file contention.
 *  - No `order` field on GlossaryCategory — GLOSSARY_CATEGORIES' array
 *    position is canonical, matching the existing TIER_ORDER convention in
 *    src/constants/systemDesign.ts, so display order can't silently drift
 *    from a hand-kept number.
 *  - `voiceTemplate` classifies each term before any definition is written,
 *    so independent content subagents converge on the same sentence shape
 *    for the same kind of term instead of improvising per-term:
 *      - 'mechanism'  — has an input→output transformation (encoder, LoRA,
 *                       cache-aside): "[Term] is to X ... in order to Y."
 *      - 'constraint'  — a measured/agreed bound (SLA, error budget):
 *                       "[Term] is a constraint on X, measured/enforced by Y."
 *      - 'structure'   — an ownership/organizational pattern (data mesh,
 *                       model card): "[Term] is an ownership/responsibility
 *                       arrangement where X."
 */

import type { LucideIcon } from 'lucide-react';

export type GlossaryTrack = 'foundation' | 'ml-lifecycle';

export type GlossaryCategoryId =
  | 'gpu-cuda'
  | 'systems-design'
  | 'data-engineering'
  | 'data-science-ml'
  | 'ai-ml-engineering'
  | 'mlops-infra'
  | 'evaluation-observability';

export type GlossaryVoiceTemplate = 'mechanism' | 'constraint' | 'structure';

export interface GlossaryCategory {
  id: GlossaryCategoryId;
  label: string;
  /** Short eyebrow shown above the label, e.g. "Foundations · Hardware". */
  eyebrow: string;
  /** One-sentence framing rendered as the section's intro line. */
  description: string;
  track: GlossaryTrack;
  icon: LucideIcon;
}

export interface GlossaryTerm {
  /** kebab-case, globally unique — used as the #id anchor and DOM id. */
  slug: string;
  /** Display name, e.g. "Encoder". */
  term: string;
  category: GlossaryCategoryId;
  voiceTemplate: GlossaryVoiceTemplate;
  /** First-principles, example-free definition. Populated in Phase 2. */
  definition: string;
  /** Optional cross-links to other terms' slugs — curated, not auto-detected. */
  relatedSlugs?: string[];
}

/**
 * Editorial floor, not a data-integrity invariant: a category below this is
 * a signal to merge it into a sibling, not proof of corrupt data. Enforced
 * as a warning (not a hard failure) by scripts/verifyGlossary.ts.
 */
export const MIN_TERMS_PER_CATEGORY = 8;
