import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export type StakeholderArchetypeId =
  | 'engineer-peer'
  | 'product-manager'
  | 'executive'
  | 'cross-functional-partner';

export interface StakeholderArchetype {
  id: StakeholderArchetypeId;
  archetype: string;
  whatTheyCareAbout: string[];
  howToAdaptCommunication: string;
  questionsToAsk: string[];
}

export const STAKEHOLDER_ARCHETYPES: StakeholderArchetype[] = [
  {
    id: 'engineer-peer',
    archetype: 'Engineer Peer',
    whatTheyCareAbout: [
      'Implementation correctness — does the approach actually work, not just does it sound right',
      'Edge cases and failure modes: what breaks it, and what happens when it does',
      'Technical trade-offs — why this approach over the two or three obvious alternatives',
      'Whether the explanation would survive them reading the actual code',
    ],
    howToAdaptCommunication:
      'Lead with the mechanism, not the motivation — skip the "why this matters" framing they already assume and go straight to how it works. Use precise, specific vocabulary (the actual data structure, the actual failure mode) instead of an approximation, and be ready to go one level deeper the moment they ask "what about X" — hand-waving past an edge case reads as not having thought it through, not as keeping things simple.',
    questionsToAsk: [
      'Do they already know the system, or do they need the same grounding I do before the details land?',
      'Are they asking to evaluate the approach, or to reuse a piece of it themselves?',
      'What edge case would they reach for first if they were building this?',
      'Is there a simpler mental model I can lead with before the full mechanism, or would that read as condescending here?',
    ],
  },
  {
    id: 'product-manager',
    archetype: 'Product Manager',
    whatTheyCareAbout: [
      'User impact — what changes for the person using the product, not the internals',
      'Timeline: when does this ship, and does it move or hold the current roadmap date',
      'Scope — what is and isn’t included, and what got cut to hit the date',
      'Risk to the plan they’ve already committed to stakeholders above them',
    ],
    howToAdaptCommunication:
      'Frame everything in terms of the roadmap: state the user-facing outcome first, then the timeline impact, and only bring in technical detail if it changes one of those two things. A technical constraint is worth mentioning to a PM only when it changes scope or date — otherwise it’s noise that buries the answer they actually need. Give a real date or a real range, not "soon," and flag risk to the plan as soon as it’s known rather than after it’s already slipped.',
    questionsToAsk: [
      'What decision are they trying to make with this information — ship, cut scope, or reset expectations upward?',
      'Is there a date already committed externally that this answer needs to protect or has already put at risk?',
      'Do they need the full trade-off space, or just the recommendation and the headline risk?',
      'Which stakeholder are they going to relay this to next, and what will that person actually ask?',
    ],
  },
  {
    id: 'executive',
    archetype: 'Executive',
    whatTheyCareAbout: [
      'Risk — what could go wrong, how likely, and what the blast radius is',
      'Cost — dollars, headcount, or time, in terms they can weigh against other bets',
      'Strategic alignment — does this move a metric or objective they’re accountable for',
      'A clear recommendation, not an open question they have to resolve themselves',
    ],
    howToAdaptCommunication:
      'Headline first: the conclusion and the recommendation in the first sentence, with supporting detail available on demand but never leading. Cut jargon entirely — translate every technical term into its business consequence ("the database can’t handle the load" becomes "checkout fails during a traffic spike, which is when it matters most"). Keep it to what a five-minute conversation can cover, and be explicit about the ask: a decision, a budget, or just awareness.',
    questionsToAsk: [
      'What decision are they trying to make with this information, and do they need it today or can it wait for the next review?',
      'What’s the one number or outcome that would change their answer if it moved?',
      'Am I bringing them a decision to make, or a status update they don’t need to act on?',
      'What’s the honest worst case, stated in cost or risk terms they already track?',
    ],
  },
  {
    id: 'cross-functional-partner',
    archetype: 'Cross-Functional Partner (Design, Data, Legal)',
    whatTheyCareAbout: [
      'How a decision affects their own domain’s constraints, not the engineering rationale behind it',
      'Whether their existing work (a design spec, a data contract, a compliance requirement) still holds after this change',
      'Their own vocabulary and mental model, not the underlying technical implementation',
      'Being looped in before a decision ships, not informed after it already has',
    ],
    howToAdaptCommunication:
      'Translate the technical constraint into their domain’s terms before explaining it at all — a caching layer becomes "the data they see may be up to five minutes stale," a schema change becomes "this field’s format is changing, here’s what your export needs to expect." Anchor the conversation in what changes for their deliverable, not in how the system got there, and confirm explicitly whether the change requires them to do anything on their side.',
    questionsToAsk: [
      'What decision are they trying to make with this information, specifically within their own domain?',
      'What’s the equivalent concept in their vocabulary for the technical constraint I’m about to describe?',
      'Does this change require action on their part, or is it purely informational?',
      'What would they need to know to explain this change to someone on their own team?',
    ],
  },
];

export const CONVERSATION_NAVIGATION_FRAMEWORK: FrameworkStep[] = [
  {
    id: 'identify',
    marker: '1',
    label: 'Identify',
    description:
      'Before saying anything technical, place who’s actually in the room — their role, their stake in the outcome, and how much context they’re likely to already have.',
    detail: [
      'Job title or team is a starting signal, not a guarantee of depth',
      'Assume less shared context in a mixed audience, not more',
    ],
  },
  {
    id: 'ask',
    marker: '2',
    label: 'Ask',
    description:
      'Ask one calibrating question before assuming a level of depth or a shared vocabulary — it costs one sentence and prevents either over-explaining or losing the room.',
    detail: [
      '"How familiar are you with X?" beats guessing and being wrong in either direction',
      'A calibrating question signals respect for their time, not uncertainty',
    ],
  },
  {
    id: 'listen',
    marker: '3',
    label: 'Listen',
    description:
      'Read the response for the actual concern behind it, not just the literal question asked — the real question is often one layer beneath the words.',
    detail: [
      '"Will this scale?" from an executive is usually "is this a safe bet," not a request for throughput numbers',
      'Follow-up questions reveal where their real uncertainty is',
    ],
  },
  {
    id: 'adapt',
    marker: '4',
    label: 'Adapt',
    description:
      'Adjust depth, vocabulary, and framing in real time based on what step 3 surfaced, rather than delivering a fixed explanation regardless of who’s asking.',
    detail: [
      'Swap jargon for its plain-language consequence, or vice versa, mid-conversation',
      'Reorder the explanation — headline-first for risk-driven audiences, chronological for lay ones',
    ],
  },
  {
    id: 'confirm',
    marker: '5',
    label: 'Confirm',
    description:
      'Check that the explanation actually landed before moving on — a nod isn’t confirmation, a specific follow-up question or a correct restatement is.',
    detail: [
      'Ask them to state back the decision or the takeaway, not just "does that make sense?"',
      'A confirmation gap here is cheaper to close now than after a decision gets made on a misunderstanding',
    ],
  },
];
