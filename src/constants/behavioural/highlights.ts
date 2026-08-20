import type { LucideIcon } from 'lucide-react';
import { Compass, Network, Eye, ArrowRightLeft } from 'lucide-react';

/**
 * The four highest-signal, most-repeated takeaways across the ByteByteGo
 * course — surfaced as an executive-summary/TL;DR at the top of the page for
 * readers who want the main point without reading the full notes below.
 *
 * Every `quote` here is verbatim, verified directly against the live
 * ByteByteGo chapter pages (not reconstructed from this repo's own paraphrased
 * study notes) — Introduction and What Companies Are Looking For are publicly
 * readable; High-Signal Storytelling and Developing Others required an
 * authenticated fetch. `sourceId` resolves against `SOURCES` in
 * `src/constants/behavioural/sources.ts`, the page's single authoritative list
 * of chapter URLs, so the href isn't duplicated here as its own literal.
 */
export interface Highlight {
  id: string;
  icon: LucideIcon;
  label: string;
  quote: string;
  attribution: string;
  sourceId: string;
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
    id: 'how-you-work',
    icon: Eye,
    label: "What Interviewers Are Actually Watching",
    quote: 'Interviewers are carefully evaluating how you work, how you make decisions, and whether you can actually deliver results.',
    attribution: 'ByteByteGo — Introduction',
    sourceId: 'ch-intro',
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
];
