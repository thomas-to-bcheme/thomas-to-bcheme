/**
 * Combined table-of-contents data for /system-design.
 *
 * Single source of truth for both the desktop sticky sidebar
 * (SystemDesignPrepSidebar) and the mobile "On this page" disclosure
 * (SystemDesignPrepMobileToc) — and for the full list of ids the sidebar's
 * useActiveSection call scopes to. Mirrors changelogToc.ts's pattern.
 */

import { INTERVIEW_FRAMEWORK_STEPS } from './interviewFramework';
import { SYSTEM_DESIGN_CATEGORIES } from './questions';

export interface SystemDesignTocItem {
  id: string;
  label: string;
  href: string;
}

const toItem = (id: string, label: string): SystemDesignTocItem => ({ id, label, href: `#${id}` });

// The framing/intro section, rendered first in main content, followed by
// the Core Characteristics section (Chip Huyen's 4 + CAP's 3 as the
// baseline every question-bank decision below gets checked against).
export const FRAMING_TOC_ITEMS: SystemDesignTocItem[] = [
  toItem('framing-intro', 'Framing'),
  toItem('core-characteristics', 'Core Characteristics'),
];

// One entry per interview-framework step, in order — matches the ids
// FrameworkStepList assigns to each <li> via INTERVIEW_FRAMEWORK_STEPS.
export const FRAMEWORK_TOC_ITEMS: SystemDesignTocItem[] = INTERVIEW_FRAMEWORK_STEPS.map((step) =>
  toItem(step.id, step.label),
);

// One entry per question category — matches the `id` prop of each
// <section> SystemDesignQuestionsSection renders (one per
// SYSTEM_DESIGN_CATEGORIES entry).
export const QUESTIONS_TOC_ITEMS: SystemDesignTocItem[] = SYSTEM_DESIGN_CATEGORIES.map((category) =>
  toItem(category.id, category.label),
);

// The remaining reference sections, in page order.
export const REFERENCE_TOC_ITEMS: SystemDesignTocItem[] = [
  toItem('reference-grid', 'Reference Grid'),
  toItem('components-of-system-design', 'Components'),
  toItem('cross-domain-strategies', 'Cross-Domain Strategies'),
  toItem('scoring-rubric', 'Scoring Rubric'),
  toItem('staff-signals', 'Staff-Level Signals'),
  toItem('communication-scripts', 'Communication Scripts'),
  toItem('development-lifecycles', 'Development Lifecycles'),
  toItem('sources', 'Sources'),
];

// Full, flat TOC — every section anchor on the page, in reading order — the
// exact set SystemDesignPrepSidebar's single useActiveSection call is
// scoped to.
export const SYSTEM_DESIGN_TOC_ITEMS: SystemDesignTocItem[] = [
  ...FRAMING_TOC_ITEMS,
  ...FRAMEWORK_TOC_ITEMS,
  ...QUESTIONS_TOC_ITEMS,
  ...REFERENCE_TOC_ITEMS,
];
