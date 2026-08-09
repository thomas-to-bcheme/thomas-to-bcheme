import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Compass,
  Handshake,
  Languages,
  Presentation,
  Puzzle,
  Scale,
  Target,
  Users,
} from 'lucide-react';
import SectionHeading from '@/components/sections/changelog/SectionHeading';

interface ExecutiveSummaryItem {
  icon: LucideIcon;
  label: string;
  blurb: string;
  anchorId: string;
  anchorLabel: string;
  wide?: boolean;
}

const EXECUTIVE_SUMMARY_ITEMS: ExecutiveSummaryItem[] = [
  {
    icon: Target,
    label: 'Employment is the business problem',
    blurb:
      'This portfolio architects a $0-cost platform against one business problem: employment — built end-to-end, hardware through distributed systems, entirely inside free-tier limits.',
    anchorId: 'mission',
    anchorLabel: 'Mission & $0 cost',
  },
  {
    icon: Users,
    label: 'One funnel, two channels, three stakeholders',
    blurb:
      'Outbound is résumé-first; inbound is LinkedIn-first. Both land here, and the site is tailored to how recruiters, hiring managers, and the technical team each actually screen.',
    anchorId: 'funnel',
    anchorLabel: 'The funnel & stakeholders',
  },
  {
    icon: Handshake,
    label: 'Bypass the take-home, talk live instead',
    blurb:
      'The goal is synchronous, peer-to-peer signal over asynchronous prescreens — assessing collegiality and communication horizontally and vertically. Interviewing is a two-way evaluation, not a one-way test.',
    anchorId: 'funnel',
    anchorLabel: 'The funnel & stakeholders',
  },
  {
    icon: Compass,
    label: 'Six mental models, not fixed rules',
    blurb:
      'The SWE Compass, the agent definition, system-design philosophy, business-driven development, unintended consequences, and effective communication are first-principles lessons from years across domains — tools for scoping ambiguous problems, not dogma.',
    anchorId: 'swe-compass',
    anchorLabel: 'The SWE Compass',
  },
  {
    icon: Scale,
    label: 'Business-driven, not academic',
    blurb:
      "Every decision traces back to revenue, risk, time, or process — not novelty or the wrong KPI. A system that scales to 1M users is pointless if the grassroots users aren't there yet.",
    anchorId: 'system-design-philosophy',
    anchorLabel: 'System design philosophy',
  },
  {
    icon: Languages,
    label: 'No design choice is neutral',
    blurb:
      "Choosing a translation's target dialect or launch market isn't a neutral engineering call — a Kyoto-vs-Tokyo default or a Brazil-only Portuguese launch carries bias, geopolitical, and PR weight no system diagram captures.",
    anchorId: 'unintended-consequences',
    anchorLabel: 'Unintended consequences',
  },
  {
    icon: Presentation,
    label: 'Not just what you say — how you say it',
    blurb:
      "Chronological for a lay audience, reverse-chronological — demo first — for a technical one, and shared experience to build real rapport. All three calibrated to who's actually in the room.",
    anchorId: 'effective-communication',
    anchorLabel: 'Effective communication',
  },
  {
    icon: Puzzle,
    label: "There's too much to know",
    blurb:
      "There's too much to know to memorize. The six models above only work combined, live, and applied to whatever problem is actually in front of you.",
    anchorId: 'mental-models-synthesis',
    anchorLabel: 'How it all combines',
    wide: true,
  },
];

/**
 * Compact "at a glance" grid at the very top of /changelog — 8 scannable
 * takeaway cards distilling the essay below plus the platform's underlying
 * business framing, each deep-linking into ChangelogHeaderEssay's anchors.
 * The closing card (wide) is the essay's synthesis, not one of the six
 * mental models itself. The full essay stays intact below for readers who
 * want depth.
 */
const ExecutiveSummary = () => (
  <section id="executive-summary" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="At a Glance" title="Executive summary" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {EXECUTIVE_SUMMARY_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-2.5 ${
              item.wide ? 'sm:col-span-2' : ''
            }`}
          >
            <div className="icon-container-blue w-fit">
              <Icon size={16} />
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-white leading-snug">
              {item.label}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {item.blurb}
            </p>
            <a
              href={`#${item.anchorId}`}
              className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm w-fit"
            >
              Jump to {item.anchorLabel}
              <ArrowRight size={13} />
            </a>
          </div>
        );
      })}
    </div>
  </section>
);

export default ExecutiveSummary;
