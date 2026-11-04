import type { ListeningSkill, PlaybookFramework } from './types';

/**
 * The four conversation moves the topic cards draw their questions from.
 * Reflective and active listening confirm you understood; probing and deeper
 * questions are what you ask once you did.
 */
export const LISTENING_SKILLS: ListeningSkill[] = [
  {
    kind: 'reflective',
    label: 'Reflective listening',
    definition:
      'Say back the meaning, and the feeling or stakes behind it, in your own words, then let the speaker correct you.',
    useWhen: 'A stakeholder states a solution or a frustration and you are not yet sure what they actually need.',
    examplePhrases: [
      'So what I am hearing is that the real risk is the board seeing a number we cannot explain. Is that right?',
      'It sounds like the deadline matters less than not being surprised. Did I get that right?',
    ],
    pitfall: 'Parroting their words back verbatim, which shows you heard the sentence but not the point.',
  },
  {
    kind: 'active',
    label: 'Active listening',
    definition:
      'Show you are following: paraphrase, summarize across several points, and ask a clarifying question before you propose anything.',
    useWhen: 'A conversation has covered several points and you need agreement on what was decided before leaving the room.',
    examplePhrases: [
      'Let me summarize the three constraints I have: budget is fixed, the date is not, and compliance signs off first. What did I miss?',
      'When you say "fast," do you mean freshness of the data or time to first result?',
    ],
    pitfall: 'Waiting for your turn to talk, which turns a summary into a rebuttal.',
  },
  {
    kind: 'probing',
    label: 'Probing questions',
    definition:
      'Narrow in on specifics: who, what, when, how much, how often. They turn a vague claim into something you can measure or schedule.',
    useWhen: 'An answer is real but imprecise, and you need a number, an owner, or a date to act on it.',
    examplePhrases: [
      'Which report, for whom, and how often is it used today?',
      'What does "too slow" mean in minutes, and what does it cost when it happens?',
    ],
    pitfall: 'Stopping at the first specific answer. Facts tell you the what; they rarely explain why it matters.',
  },
  {
    kind: 'deeper',
    label: 'Deeper questions',
    definition:
      'Widen out to assumptions, motivation, and consequences: what must be true, what happens if nothing changes, who else is affected.',
    useWhen: 'The stated request may be a symptom, or the decision is expensive or hard to reverse.',
    examplePhrases: [
      'What would have to be true for this to be the right investment this quarter?',
      'What happens if we do nothing, and who feels it first?',
    ],
    pitfall: 'Asking them before you have the facts, which reads as stalling instead of strategy.',
  },
];

/**
 * Templates from the "From Doer to Strategic Leader" playbook. The playbook
 * states its frameworks come from summaries of Josh Brindley's executive
 * communication videos, and that the source videos were not independently
 * checked, so treat them as working templates, not validated research.
 */
export const PLAYBOOK_FRAMEWORKS: PlaybookFramework[] = [
  {
    id: 'systems-thinking',
    name: 'Systems thinking in four questions',
    template:
      '1) What outcome does this serve, and for whom? 2) What does it connect to upstream and downstream: teams, processes, risks? 3) Should I do this, delegate it, or build a system so it never needs doing again? 4) What decision does someone need to make, and what do I recommend?',
    useWhen: 'Before starting any piece of work.',
  },
  {
    id: 'meal-not-ingredients',
    name: 'Report the meal, not the ingredients',
    template:
      'Lead with the value the work created (revenue, efficiency, risk reduced, customer outcome), not the list of tasks completed.',
    useWhen: 'Status updates and any summary for a leader.',
  },
  {
    id: 'three-os',
    name: 'The Three O\'s opener',
    template: 'We can [Outcome], supporting [Objective], by removing [Obstacle].',
    useWhen: 'The first five seconds of a pitch or proposal.',
  },
  {
    id: 'context-outcome-avoid',
    name: 'Context, Outcome, Avoid',
    template: 'Context: [situation]. Outcome: [what changed]. Avoid: [cost or risk prevented].',
    useWhen: 'Reporting finished work so the prevented cost is visible.',
  },
  {
    id: 'escalation',
    name: 'Escalation with options',
    template: 'Here is the issue, two options with trade-offs, and my recommendation. I need [decision] by [date].',
    useWhen: 'Any time you would otherwise bring a problem with no answer attached.',
  },
  {
    id: 'insight',
    name: 'Turn data into insight',
    template: 'This means [meaning]. It matters because [reason]. I recommend [next step].',
    useWhen: 'Presenting an analysis to a decision-maker.',
  },
  {
    id: 'benefit-without-objection',
    name: 'Benefit without objection',
    template: 'This delivers [benefit] without creating [problem], by [mechanism].',
    useWhen: 'Pairing every benefit with the objection it avoids, especially for risk-averse listeners.',
  },
  {
    id: 'owned-close',
    name: 'Owned next step',
    template: 'To confirm: we agreed [decision]. I will [action] by [date] and report [metric].',
    useWhen: 'Closing any meeting, instead of asking "any questions?"',
  },
];

export const AUDIENCE_ADAPTATION_NOTE =
  'The playbook sorts executives into four framing styles (Red: speed and results; Green: stability and risk; Blue: logic and proof; Yellow: options and people impact). It is the playbook\'s own shorthand, not validated research, so treat your read of a person as a hypothesis. Adapt delivery, never the truth, and do not let a label replace listening.';
