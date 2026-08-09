/**
 * Combined table-of-contents data for /glossary.
 *
 * Single source of truth for the desktop sticky sidebar (GlossarySidebar),
 * the mobile "On this page" disclosure (GlossaryMobileToc), the A-Z jump
 * rail, and the ids GlossarySidebar's useActiveSection call scopes to —
 * mirrors src/constants/changelogToc.ts's pattern exactly so the nav
 * surfaces can never drift out of sync with the underlying glossary data.
 */

import { GLOSSARY_CATEGORIES, GLOSSARY_TRACK_ORDER, getTermsByCategory, type GlossaryTrack } from '@/constants/glossary';

export interface GlossaryAzEntry {
  letter: string;
  /** The alphabetically-first term across ALL categories starting with this
   * letter — terms live in per-category sections, not one flat A-Z list, so
   * a letter jump lands on a representative term rather than a section. */
  slug: string;
}

export interface GlossaryTocItem {
  id: string;
  label: string;
  count: number;
}

export interface GlossaryTocGroup {
  track: GlossaryTrack;
  label: string;
  items: GlossaryTocItem[];
}

const TRACK_LABELS: Record<GlossaryTrack, string> = {
  foundation: 'Foundations',
  'ml-lifecycle': 'ML Lifecycle',
};

// One group per track, in GLOSSARY_TRACK_ORDER, each holding the categories
// that belong to it in GLOSSARY_CATEGORIES' own order — so the sidebar's
// grouping never has to be hand-kept in sync with the data.
export const GLOSSARY_TOC_GROUPS: GlossaryTocGroup[] = GLOSSARY_TRACK_ORDER.map((track) => ({
  track,
  label: TRACK_LABELS[track],
  items: GLOSSARY_CATEGORIES.filter((category) => category.track === track).map((category) => ({
    id: category.id,
    label: category.label,
    count: getTermsByCategory(category.id).length,
  })),
}));

// Flat list of category ids, in canonical order — the exact set
// GlossarySidebar's single useActiveSection call is scoped to.
export const GLOSSARY_TOC_ITEMS: GlossaryTocItem[] = GLOSSARY_TOC_GROUPS.flatMap((group) => group.items);

// One entry per first letter actually present across every term, each
// pointing at the alphabetically-first term (globally, across categories)
// starting with that letter — drives the A-Z jump rail. Computed, not
// hand-authored, so it can't list a letter with zero terms, point at a
// stale slug, or omit a letter that exists.
const ALL_TERMS_ALPHABETICAL = GLOSSARY_CATEGORIES.flatMap((category) => getTermsByCategory(category.id)).sort((a, b) =>
  a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })
);

export const GLOSSARY_AZ_INDEX: GlossaryAzEntry[] = Array.from(
  ALL_TERMS_ALPHABETICAL.reduce((byLetter, term) => {
    const letter = term.term.charAt(0).toUpperCase();
    if (!byLetter.has(letter)) byLetter.set(letter, term.slug);
    return byLetter;
  }, new Map<string, string>())
)
  .map(([letter, slug]) => ({ letter, slug }))
  .sort((a, b) => a.letter.localeCompare(b.letter, 'en', { sensitivity: 'base' }));
