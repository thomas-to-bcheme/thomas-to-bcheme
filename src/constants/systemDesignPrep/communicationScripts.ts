export type CommunicationScriptId =
  | 'opening'
  | 'proposing-component'
  | 'articulating-bottleneck'
  | 'trade-off-mention'
  | 'why-not-x'
  | 'wrap-up';

export interface CommunicationScript {
  id: CommunicationScriptId;
  label: string;
  whenToUse: string;
  template: string;
}

export const COMMUNICATION_SCRIPTS: CommunicationScript[] = [
  {
    id: 'opening',
    label: 'Opening',
    whenToUse: 'Right after requirements gathering, before touching the whiteboard — restate the problem and your plan.',
    template:
      'So to make sure I have this right: we\'re building [system], and the core requirements are [1-2 functional requirements] with [non-functional requirement, quantified]. I\'d like to start by sketching the high-level components, then go deep on [the part most likely to matter]. Does that match what you\'re looking for?',
  },
  {
    id: 'proposing-component',
    label: 'Proposing a component',
    whenToUse: 'When introducing a new piece of the architecture for the first time.',
    template:
      'I\'m going to add a [component] here, whose job is to [one-sentence responsibility]. It sits between [upstream component] and [downstream component], and the reason I\'m introducing it now rather than later is [reason].',
  },
  {
    id: 'articulating-bottleneck',
    label: 'Articulating a bottleneck',
    whenToUse: 'When you spot a scaling or performance concern, especially before the interviewer flags it.',
    template:
      'One thing I want to flag before moving on: [component] is going to become a bottleneck once [condition, ideally quantified] — I\'d address that by [lever from the scaling-progression ladder], but I want to note it now rather than come back to it later.',
  },
  {
    id: 'trade-off-mention',
    label: 'Mentioning a trade-off',
    whenToUse: 'Any time you pick one approach over a real alternative — say this even if not asked.',
    template:
      'I\'m choosing [option X] over [option Y] here. The trade-off is that [X] gives us [benefit], at the cost of [downside] — given [requirement/constraint], that downside is acceptable.',
  },
  {
    id: 'why-not-x',
    label: '"Why not X?"',
    whenToUse: 'Answering a direct challenge on an alternative you didn\'t pick — confidently, not defensively.',
    template:
      'Good question — [X] was a real option. I didn\'t go with it because [specific reason tied to a requirement], but if [condition changed], I\'d reconsider it. It\'s not that [X] is wrong, it\'s that it optimizes for something we don\'t need as much here.',
  },
  {
    id: 'wrap-up',
    label: 'Wrap-up',
    whenToUse: 'In the last few minutes — summarize the design and show it isn\'t presented as finished.',
    template:
      'To summarize: we designed [system] with [2-3 core components] handling [core flow], using [key decision] to satisfy [requirement]. If I had more time, I\'d want to go deeper on [known gap] and pressure-test [assumption] — those are the parts I\'m least certain about right now.',
  },
];
