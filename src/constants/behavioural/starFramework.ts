/**
 * STAR and the U-shaped narrative arc — moved unchanged from the old flat
 * `constants/behavioural.ts`. No longer the page's hero framework: High-Signal
 * Storytelling (see `hss.ts`) leads instead, per ByteByteGo's own critique that
 * STAR's Situation+Task preamble eats the clock before the actual signal (the
 * Action) shows up. STAR is retained here purely as a comparison reference,
 * rendered inside HighSignalStorytellingSection's "How HSS Relates to STAR and
 * CARL" sub-section via StarCarlComparisonSection, reusing the same generic
 * <FrameworkStepList /> component.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export const STAR_FRAMEWORK: FrameworkStep[] = [
  {
    id: 'star-situation',
    marker: 'S',
    label: 'Situation',
    description:
      'Set the scene in a few sentences — the context, team, and constraints the interviewer needs before your actions make sense. Keep it tight; this is scaffolding, not the story.',
    detail: [
      'What was the context, team, and timeframe?',
      'Who else was involved, and what was their stake in the outcome?',
      'What constraint or pressure made this situation worth telling?',
    ],
  },
  {
    id: 'star-task',
    marker: 'T',
    label: 'Task',
    description:
      'Name the specific responsibility or goal that was yours — not the team’s, not the company’s. This is where you clarify what "done" would have looked like.',
    detail: [
      'What was explicitly your responsibility versus the team’s?',
      'What was the goal, deadline, or definition of success?',
      'What made this task non-trivial — why couldn’t you just wing it?',
    ],
  },
  {
    id: 'star-action',
    marker: 'A',
    label: 'Action',
    description:
      'Walk through the specific, deliberate steps you took. This is the part interviewers weight most heavily, since it reveals judgment, not just outcome.',
    detail: [
      'What did you personally do, step by step, in first person?',
      'What alternatives did you consider and reject, and why?',
      'How did you bring others along or handle pushback along the way?',
    ],
  },
  {
    id: 'star-result',
    marker: 'R',
    label: 'Result',
    description:
      'Close with the measurable outcome and, ideally, what changed in how you work afterward. A result without a lesson reads as luck, not skill.',
    detail: [
      'What was the quantifiable or observable outcome?',
      'How did you know it worked — what signal confirmed it?',
      'What would you do differently, or what did this permanently change?',
    ],
  },
];

/**
 * A delivery *arc*, distinct from STAR's content structure — STAR says what to include,
 * this says how to shape it in the telling. Reused generically via the same
 * <FrameworkStepList> component as STAR_FRAMEWORK, rendered directly beneath it.
 */
export const U_SHAPED_NARRATIVE: FrameworkStep[] = [
  {
    id: 'u-anchor',
    marker: '1',
    label: 'Anchor',
    description:
      "Open at the responsibility level you're interviewing for — not below it, not oversold above it — so the interviewer knows what altitude to listen at.",
  },
  {
    id: 'u-dip',
    marker: '2',
    label: 'Dip',
    description:
      'Go into the real constraint, conflict, or setback honestly — this is the bottom of the U, and skipping it is what makes a story sound too easy to be senior.',
  },
  {
    id: 'u-rise',
    marker: '3',
    label: 'Rise',
    description:
      "Close on an outcome that's net positive but not artificially clean — an imperfect result you owned reads as more senior than a flawless one that got lucky.",
  },
];
