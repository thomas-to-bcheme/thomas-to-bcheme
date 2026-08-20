import type { LucideIcon } from 'lucide-react';
import { ListChecks, Sprout, Network, Milestone, Microscope, TrendingUp, Lightbulb, Target } from 'lucide-react';

/**
 * The direct-quote evidence behind `SeniorVsStaffSection`'s career ladder —
 * not another paraphrase of it. `SeniorVsStaffSection`/`careerLevels.ts`
 * already cover the Junior→Principal ladder and (per its own doc comment)
 * already paraphrase all six of ByteByteGo's "Common Mismatches," so this
 * file deliberately doesn't re-tread that ground. What it adds instead: what
 * the source material says, competency by competency and in its own words,
 * about what actually turns technical competence into being a high-impact
 * asset rather than just a competent contributor — spanning six different
 * ByteByteGo chapters, not just the two the lead quote names outright.
 *
 * Every quote is verbatim, fetched directly from the live chapter pages this
 * session (WebFetch where public, the claude-in-chrome browser tool against
 * the user's already-authorized session where gated) — none reconstructed
 * from this repo's own paraphrased study notes, and none duplicate a quote
 * already used in `highlights.ts`.
 */
export interface HighImpactSignal {
  id: string;
  icon: LucideIcon;
  label: string;
  quote: string;
  attribution: string;
  sourceId: string;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  /** Marks the thesis quote for full-width treatment — same idiom as ExecutiveSummary.tsx on /projects. */
  wide?: boolean;
}

export const HIGH_IMPACT_SIGNALS: HighImpactSignal[] = [
  {
    id: 'lead-must-show',
    icon: ListChecks,
    label: 'The Explicit Rule',
    quote:
      'Senior level and beyond (7-10 competencies): Must show Strategic Leadership and Developing Others to demonstrate organizational impact. Add Innovation to show you can drive technical direction.',
    attribution: 'ByteByteGo — The Behavioral Interview Roadmap',
    sourceId: 'ch-01-roadmap',
    color: 'blue',
    wide: true,
  },
  {
    id: 'developing-others-required',
    icon: Sprout,
    label: 'Impact Multiplies Through People',
    quote:
      'This competency is also especially important for promotion to staff and principal levels, where your impact increasingly comes via scaling through others rather than just your individual contribution.',
    attribution: 'ByteByteGo — Developing Others',
    sourceId: 'ch-12-developing-others',
    color: 'blue',
  },
  {
    id: 'developing-others-influence',
    icon: Network,
    label: 'Influence Without Authority',
    quote:
      'Growing others without authority becomes increasingly important at senior levels, where you are expected to help others through influence rather than control.',
    attribution: 'ByteByteGo — Developing Others',
    sourceId: 'ch-12-developing-others',
    color: 'purple',
  },
  {
    id: 'strategic-leadership-bar',
    icon: Milestone,
    label: 'Impact Multiplies Through People',
    quote:
      "Google's promotion criteria at staff level and above expect candidates to show they've driven technical direction that shaped work well beyond their own teams.",
    attribution: 'ByteByteGo — Strategic Leadership and Thinking Big',
    sourceId: 'ch-13-strategic-leadership',
    color: 'blue',
  },
  {
    id: 'strategic-leadership-influence',
    icon: Network,
    label: 'Influence Without Authority',
    quote: 'Have you built consensus for changes that have affected multiple groups? That shows leadership without authority.',
    attribution: 'ByteByteGo — Strategic Leadership and Thinking Big',
    sourceId: 'ch-13-strategic-leadership',
    color: 'purple',
  },
  {
    id: 'problem-solving-value',
    icon: Microscope,
    label: 'Depth Compounds Into Value',
    quote: 'The deeper you investigate, the better you get at preventing future problems and the more valuable you become over time.',
    attribution: 'ByteByteGo — Problem Solving and Deep Dive',
    sourceId: 'ch-07-problem-solving',
    color: 'emerald',
  },
  {
    id: 'learning-growth-value',
    icon: TrendingUp,
    label: 'Depth Compounds Into Value',
    quote: 'Learning expands what you know. Growth expands what you and your organization can accomplish.',
    attribution: 'ByteByteGo — Learning and Growth',
    sourceId: 'ch-09-learning-growth',
    color: 'emerald',
  },
  {
    id: 'innovation-value',
    icon: Lightbulb,
    label: 'Value Only Counts If Others Benefit',
    quote:
      'These companies understand that inventing new solutions and simplifying problems generates more long-term value than just applying and improving existing approaches.',
    attribution: 'ByteByteGo — Innovation',
    sourceId: 'ch-11-innovation',
    color: 'amber',
  },
  {
    id: 'customer-focus-value',
    icon: Target,
    label: 'Value Only Counts If Others Benefit',
    quote: 'These companies recognize that technical skills create lasting value only when they solve real problems for their customers.',
    attribution: 'ByteByteGo — Customer and User Focus',
    sourceId: 'ch-10-customer-focus',
    color: 'amber',
  },
];
