/**
 * Combined table-of-contents data for /behavioural.
 *
 * Single source of truth for both the desktop sticky sidebar
 * (BehaviouralSidebar) and the mobile "On this page" disclosure
 * (BehaviouralMobileToc) — and for the full list of ids the sidebar's
 * useActiveSection call scopes to. Mirrors systemDesignPrep/toc.ts's pattern.
 */

import { COMPETENCY_CHAPTERS } from './competencies';

export interface BehaviouralTocItem {
  id: string;
  label: string;
  href: string;
}

const toItem = (id: string, label: string): BehaviouralTocItem => ({ id, label, href: `#${id}` });

// Part I — the framework: fit/level framing, the career ladder, company
// research, and the page's hero storytelling framework (High-Signal
// Storytelling) plus the 6 essential questions asked in nearly every
// interview.
export const FRAMEWORK_TOC_ITEMS: BehaviouralTocItem[] = [
  toItem('intro', 'Introduction'),
  toItem('roadmap', 'The Roadmap'),
  toItem('fit-vs-level', 'Fit vs. Level'),
  toItem('common-mis-fits', 'Common Mis-Fits'),
  toItem('senior-vs-staff', 'Career Ladder'),
  toItem('company-research', 'Company Research'),
  toItem('high-signal-storytelling', 'High-Signal Storytelling'),
  toItem('essential-questions', 'Essential Questions'),
];

// Part II — one entry per competency chapter, in ByteByteGo's own Ch.05–13
// order — derived from COMPETENCY_CHAPTERS rather than hardcoded, so adding
// a chapter there automatically shows up here too.
export const COMPETENCIES_TOC_ITEMS: BehaviouralTocItem[] = COMPETENCY_CHAPTERS.map((chapter) =>
  toItem(chapter.id, chapter.title),
);

// Part III — Ch.14, Nailing the Interview, split into its own Before/During/After.
export const DELIVERY_TOC_ITEMS: BehaviouralTocItem[] = [
  toItem('nailing-before', 'Before the Interview'),
  toItem('nailing-during', 'During the Interview'),
  toItem('nailing-after', 'After the Interview'),
];

// Reference.
export const REFERENCE_TOC_ITEMS: BehaviouralTocItem[] = [toItem('sources', 'Sources')];

// Full, flat TOC — every section anchor on the page, in reading order — the
// exact set BehaviouralSidebar's single useActiveSection call is scoped to.
export const BEHAVIOURAL_TOC_ITEMS: BehaviouralTocItem[] = [
  ...FRAMEWORK_TOC_ITEMS,
  ...COMPETENCIES_TOC_ITEMS,
  ...DELIVERY_TOC_ITEMS,
  ...REFERENCE_TOC_ITEMS,
];
