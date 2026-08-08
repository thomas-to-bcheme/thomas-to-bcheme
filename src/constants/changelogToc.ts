/**
 * Combined table-of-contents data for /changelog.
 *
 * Single source of truth for both the desktop sticky sidebar
 * (ChangelogSidebar) and the mobile "On this page" disclosure
 * (ChangelogMobileToc) — and for the full list of ids ChangelogSidebar's
 * useActiveSection call scopes to. Keeping this list in one place means the
 * two nav surfaces and the scrollspy can never drift out of sync.
 */

import { CHANGELOG_PROJECTS } from '@/constants/changelog';

export interface ChangelogTocItem {
  id: string;
  label: string;
}

// The 5 essay section ids, in reading order — must match the `id` props
// rendered by ChangelogHeaderEssay.
export const MENTAL_MODEL_TOC_ITEMS: ChangelogTocItem[] = [
  { id: 'mission', label: 'Mission & $0 cost' },
  { id: 'funnel', label: 'The funnel & stakeholders' },
  { id: 'swe-compass', label: 'The SWE Compass' },
  { id: 'agent-definition', label: 'What "agent" means' },
  { id: 'system-design-philosophy', label: 'System design philosophy' },
];

// One entry per CHANGELOG_PROJECTS item, in the same order, so the sidebar's
// "Projects" group never has to be hand-kept in sync with the data.
export const PROJECT_TOC_ITEMS: ChangelogTocItem[] = CHANGELOG_PROJECTS.map((project) => ({
  id: project.id,
  label: project.name,
}));

export const FAQ_TOC_ITEM: ChangelogTocItem = { id: 'faq', label: 'FAQ' };

// Full, flat TOC — 5 essay sections + 4 project ids + faq — the exact set
// ChangelogSidebar's single useActiveSection call is scoped to.
export const CHANGELOG_TOC_ITEMS: ChangelogTocItem[] = [
  ...MENTAL_MODEL_TOC_ITEMS,
  ...PROJECT_TOC_ITEMS,
  FAQ_TOC_ITEM,
];
