/**
 * High-Signal Storytelling (HSS) — this page's hero framework for structuring
 * a behavioral answer, and ByteByteGo's own replacement for the default
 * instinct to narrate a project chronologically. The core reframe: an
 * interviewer isn't taking notes on your project, they're taking notes on
 * your thinking — so the story should be built as a pyramid (Headline →
 * Behavioral Core → Base) that matches how those notes actually get taken,
 * rather than as a scene-setting narrative that buries the signal under
 * context. STAR and CARL are demoted to a comparison reference in
 * `starFramework.ts`, rendered by `StarCarlComparisonSection` immediately
 * after `HighSignalStorytellingSection` — the `HSS_VS_STAR_CARL_MAPPING`
 * below is what connects the two files. Paraphrased into this site's own
 * coaching voice from ByteByteGo's "03 — High-Signal Storytelling" chapter —
 * not a transcription of the course text.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

/**
 * The three layers of the HSS pyramid, ordered peak-to-base to match how an
 * interviewer's notepad actually fills up: a one-line summary, a handful of
 * bulleted specifics, then whatever they scribble down while following up.
 * Rendered once, up top, before the page walks through how to build each
 * layer in more depth.
 */
export const HSS_PYRAMID_STEPS: FrameworkStep[] = [
  {
    id: 'hss-headline',
    marker: '1',
    label: 'Headline',
    description:
      'One sentence, written and rehearsed before the interview ever starts. It should be short enough that the interviewer could copy it straight into their notes as-is.',
  },
  {
    id: 'hss-core',
    marker: '2',
    label: 'Behavioral Core',
    description:
      "Roughly two minutes, also fully prepared in advance — the two or three moments that actually carry the story: what you noticed, decided, did, and what came of it.",
  },
  {
    id: 'hss-base',
    marker: '3',
    label: 'Base',
    description:
      "Everything you're ready to say but don't volunteer up front. This layer isn't scripted — it gets built live, one answer at a time, in response to whatever the interviewer asks next.",
  },
];

/**
 * The 3-step build process for the Behavioral Core, rendered via the same
 * <FrameworkStepList /> component immediately after the "Building Your
 * Headline" prose sub-section.
 */
export const BEHAVIORAL_CORE_STEPS: FrameworkStep[] = [
  {
    id: 'core-find-actions',
    marker: '1',
    label: 'Find Your Actions',
    description:
      'Before you shape anything, list out everything you actually did in the situation — unfiltered, in no particular order. You are mining for raw material here, not writing yet.',
  },
  {
    id: 'core-select-key-points',
    marker: '2',
    label: 'Select Key Points',
    description:
      "Rank what you listed by how much it actually moved the outcome, then keep only the top two or three. Fewer than that and you don't have enough evidence of judgment; more than that and each point gets diluted.",
  },
  {
    id: 'core-structure-each',
    marker: '3',
    label: 'Structure Each',
    description:
      'Give each of those two or three moments the same shape: the minimum context needed for it to make sense, your thought process at the time, the specific action you personally took, and the result — with the metric folded in right there rather than saved for a closing line.',
  },
];

/**
 * The six categories interviewers actually pull from once they start
 * following up — nothing here gets said unprompted, it's prepared so it's
 * ready the moment a question opens the door. Rendered as a card grid.
 */
export interface BasePreparationCategory {
  id: string;
  category: string;
  description: string;
}

export const BASE_PREPARATION_CATEGORIES: BasePreparationCategory[] = [
  {
    id: 'technical-details',
    category: 'Technical Details',
    description:
      'Implementation specifics, the alternatives you weighed, and the trade-offs behind your final call. Reveal it a layer at a time and pause after each one — let the interviewer ask for the next layer rather than dumping it all at once.',
  },
  {
    id: 'working-with-others',
    category: 'Working With Others',
    description:
      'How you actually got buy-in, worked through disagreement, or coordinated across a team boundary. This category carries more weight the higher the level — influence without authority is exactly what it demonstrates.',
  },
  {
    id: 'context-and-background',
    category: 'Context and Background',
    description:
      "Why the problem existed in the first place, what had already been tried, and the constraints you were boxed in by. This is most of what STAR's Situation and Task cover — worth having ready, but only worth surfacing if it's asked for.",
  },
  {
    id: 'learning-and-growth',
    category: 'Learning and Growth',
    description:
      "What you'd do differently now, and any pattern you've since learned to recognize. Senior+ interviewers tend to probe for this directly, but it's worth having ready at any level.",
  },
  {
    id: 'failure-and-recovery',
    category: 'Failure and Recovery',
    description:
      "What actually went wrong, how you diagnosed it, and what you changed so it wouldn't happen again. Keep the focus on your own actions and diagnosis, not on assigning blame — that's what makes this category read as resilience.",
  },
  {
    id: 'scale-and-metrics',
    category: 'Scale and Metrics',
    description:
      "Be ready to go deeper than whatever number sits in your headline. A rough, honestly-caveated figure — 'somewhere around a 60% reduction' — holds up better under a follow-up than a suspiciously precise number pulled from memory.",
  },
];

/**
 * Patterns that actively damage a candidacy rather than just weakening a
 * story — worth calling out on their own, separate from the Signal vs. Noise
 * framing, because these are read as character/judgment signals, not just
 * weak storytelling. Context-dependent: a couple of these can read as a
 * strength at one company and a red flag at another, but all seven are worth
 * checking for before you walk into any room.
 */
export const HSS_RED_FLAGS: string[] = [
  'Lying or exaggerating a metric — interviewers check references, and inflated numbers are the single fastest way to lose all credibility at once.',
  'Blaming other people, or externalizing a failure onto circumstances outside your control.',
  'Staying vague about your own contribution — leaning on "we" throughout, or describing yourself as merely "involved in" the outcome.',
  'Showing poor judgment through a shortcut, when you meant to signal initiative.',
  'Dismissing a team process — skipping code review, for instance — as if it were friction rather than a safeguard.',
  'Lacking self-awareness: playing the hero in a story where, on reflection, you were actually in the wrong.',
  "Complaining throughout the story, even when the underlying problem you're describing was genuinely real.",
];

/**
 * The five techniques for narrating a negative experience (a failure, a
 * layoff, a conflict) without it reading as either bitter or evasive.
 */
export interface ProfessionalismTechnique {
  id: string;
  technique: string;
  description: string;
}

export const STAYING_PROFESSIONAL_TECHNIQUES: ProfessionalismTechnique[] = [
  {
    id: 'facts-not-emotions',
    technique: 'Facts, not emotions',
    description: 'Describe what happened and what you did about it — leave out how frustrated, upset, or vindicated it made you feel.',
  },
  {
    id: 'acknowledge-other-side',
    technique: "Acknowledge the other side",
    description: "If someone else's perspective was legitimate, say so directly, even if it wasn't the one you personally landed on.",
  },
  {
    id: 'own-your-control',
    technique: 'Own what was in your control',
    description: "Speak to your own decisions and reactions, not the parts of the situation you had no power over — that's what a follow-up question is actually probing for.",
  },
  {
    id: 'find-actual-learning',
    technique: 'Find the actual learning',
    description: "Land on something you genuinely changed afterward — a real behavioral shift, not a tidy moral tacked on to close the story out.",
  },
  {
    id: 'keep-it-brief',
    technique: 'Keep it brief',
    description: 'Spend most of your airtime on how you responded, not on relitigating the problem — the longer you linger on what went wrong, the more it reads as still unresolved.',
  },
];

/**
 * Short contrast lists for the "Signal vs. Noise" sub-section — what an
 * interviewer would actually write down versus what just fills airtime.
 * Rendered as a two-column list, immediately above the one pre-vetted
 * SourceQuote in this page ("Would an interviewer actually write this in
 * their notes?").
 */
export const SIGNAL_EXAMPLES: string[] = [
  'The specific decision you made, and the reasoning behind it',
  'The moment you noticed something was off, and how you investigated it',
  'The action you personally took, described in your own words',
  'How you brought someone else along, or worked through their pushback',
  'The measurable result, stated right where it happened in the story',
];

export const NOISE_EXAMPLES: string[] = [
  "Company or team backstory from before you were even involved",
  'A roster of who was on the team and what their titles were',
  'A justification for every tool in the stack, whether or not it was asked about',
  'A blow-by-blow account of every meeting along the way',
  'A timeline stretched out with dates that don\'t change what the story means',
];

/**
 * How each HSS layer maps back onto STAR and CARL, plus the two structural
 * flaws in those older frameworks that motivated the switch in the first
 * place — the S+T preamble eating the clock before Action (the actual
 * signal) ever arrives, and CARL's forced "Learning" close manufacturing a
 * generic insight even when a strong result would be the sharper way to end.
 * Rendered as a small comparison list inside StarCarlComparisonSection,
 * directly beneath the STAR_FRAMEWORK and U_SHAPED_NARRATIVE step lists
 * (both still defined in `starFramework.ts` and reused, not redefined, here).
 */
export interface FrameworkComparisonRow {
  id: string;
  starOrCarlElement: string;
  hssEquivalent: string;
}

export const HSS_VS_STAR_CARL_MAPPING: FrameworkComparisonRow[] = [
  {
    id: 'situation-task',
    starOrCarlElement: "STAR's Situation + Task",
    hssEquivalent: 'Shrinks down into the Base — kept ready, but only surfaced if a follow-up actually asks for the backstory.',
  },
  {
    id: 'action',
    starOrCarlElement: "STAR's Action",
    hssEquivalent: 'Expands into the Behavioral Core, with your thought process narrated alongside the action itself, not left implicit.',
  },
  {
    id: 'result',
    starOrCarlElement: "STAR's Result",
    hssEquivalent: "Moves into the Core, folded into the moment it happened — it isn't saved as a closing line at the end.",
  },
  {
    id: 'carl-learning',
    starOrCarlElement: "CARL's Learning",
    hssEquivalent: 'Moves to the Base — ready to deliver if asked, rather than mandatory for every single story regardless of fit.',
  },
  {
    id: 'star-flaw',
    starOrCarlElement: "STAR's known flaw",
    hssEquivalent:
      "Situation and Task eat the clock before Action — the part interviewers actually weight most heavily — ever shows up, and forcing a distinct 'Task' onto a self-initiated or senior-level story often makes it sound artificial.",
  },
  {
    id: 'carl-flaw',
    starOrCarlElement: "CARL's known flaw",
    hssEquivalent:
      "A mandatory Learning ending forces a generic-sounding insight onto every story, even in cases where closing on the metric or result would land as the stronger, more confident ending.",
  },
];
