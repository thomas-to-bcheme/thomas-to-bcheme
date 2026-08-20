import type { LucideIcon } from 'lucide-react';
import { Compass, Network, ArrowRightLeft, ShieldCheck, Milestone, HelpCircle } from 'lucide-react';

/**
 * The highest-signal, most-repeated takeaways across the ByteByteGo course —
 * surfaced as an executive-summary/TL;DR at the top of the page for readers
 * who want the main point without reading the full notes below. Curated
 * specifically for domain-agnostic (data/software/ML-engineering-neutral)
 * senior-or-staff-and-above behavioral signals, not general interview-process
 * framing — every entry below is itself a signal of high-scope, high-impact
 * work, not commentary about how stories get evaluated.
 *
 * Every `quote` that carries a `sourceId` is verbatim, verified directly
 * against the live ByteByteGo chapter pages (not reconstructed from this
 * repo's own paraphrased study notes) — Introduction and What Companies Are
 * Looking For are publicly readable; High-Signal Storytelling and Developing
 * Others required an authenticated fetch. `sourceId` resolves against
 * `SOURCES` in `src/constants/behavioural/sources.ts`, the page's single
 * authoritative list of chapter URLs, so the href isn't duplicated here as
 * its own literal.
 *
 * Three entries are the exception and deliberately omit `sourceId`, attributed
 * directly to the author instead — each synthesizes a theme that recurs
 * across this guide rather than quoting one ByteByteGo chapter verbatim:
 * - `accountability-without-deflection` — this page's own synthesis of a
 *   theme recurring across the HSS hero framework and three separate Part-II
 *   competency chapters.
 * - `sequencing-change` — sourced from this repo's own `openingHook` for the
 *   Strategic Leadership and Thinking Big chapter
 *   (`competencies/strategicLeadershipAndThinkingBig.ts`), documented in
 *   `competencies/types.ts` as "original phrasing," not a book excerpt.
 * - `counterfactual-test` — sourced from this repo's own
 *   `LEVEL_SELF_CHECK_QUESTIONS` in `careerLevels.ts`, whose header comment
 *   describes the file as "paraphrased, not quoted" from Hello Interview and
 *   ByteByteGo.
 */
export interface Highlight {
  id: string;
  icon: LucideIcon;
  label: string;
  quote: string;
  attribution: string;
  /** Omit for an original-voice entry with no single ByteByteGo chapter to cite. */
  sourceId?: string;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
}

export const HIGHLIGHTS: Highlight[] = [
  {
    id: 'ambiguity',
    icon: Compass,
    label: 'Handling Ambiguity',
    quote: 'If the role requires working with ambiguous requirements, do your stories show comfort with uncertainty?',
    attribution: 'ByteByteGo — What Companies Are Looking For',
    sourceId: 'ch-02-what-companies',
    color: 'blue',
  },
  {
    id: 'influence-without-authority',
    icon: Network,
    label: 'Influence Without Authority',
    quote: 'Staff and principal roles require the ability to influence without authority across organizational boundaries.',
    attribution: 'ByteByteGo — High-Signal Storytelling',
    sourceId: 'ch-03-hss',
    color: 'purple',
  },
  {
    id: 'sequencing-change',
    icon: Milestone,
    label: 'The Sequencing Skill',
    quote:
      "This is the competency that decides most senior-to-staff-and-beyond promotion cases, and the hardest part it tests isn't the size of your vision — it's whether you know which team to win over first.",
    attribution: '— Thomas To',
    color: 'emerald',
  },
  {
    id: 'business-translation',
    icon: ArrowRightLeft,
    label: 'Translating Technical Into Business Terms',
    quote:
      "The PM needed to hear 'The system gets slower as users add more items, and we need two weeks to fix it,' not 'Here’s how cache eviction and index selectivity interact with our query planner.'",
    attribution: 'ByteByteGo — Developing Others',
    sourceId: 'ch-12-developing-others',
    color: 'amber',
  },
  {
    id: 'counterfactual-test',
    icon: HelpCircle,
    label: 'The Counterfactual Test',
    quote:
      'Can I point to impact that specifically would not have happened with an average engineer in the seat — not just impact that happened while I was in it?',
    attribution: '— Thomas To',
    color: 'purple',
  },
  {
    id: 'accountability-without-deflection',
    icon: ShieldCheck,
    label: 'Accountability Without Deflection',
    quote:
      "The strongest accountability stories own the failure outright; the weakest ones explain it away as the process, the circumstances, or someone else’s fault.",
    attribution: '— Thomas To',
    color: 'emerald',
  },
];
