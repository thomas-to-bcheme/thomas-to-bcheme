import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export type StakeholderArchetypeId =
  | 'engineer-peer'
  | 'product-manager'
  | 'executive'
  | 'cross-functional-partner'
  | 'manager';

export interface StakeholderArchetype {
  id: StakeholderArchetypeId;
  archetype: string;
  whatTheyCareAbout: string[];
  howToReadTheirDepth: string;
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
    howToReadTheirDepth:
      'Their depth is almost always narrow but real — deep on the one system they own, thin coverage on everything adjacent to it — so don’t mistake confidence in the room for range; it’s proof of that one system, not the whole domain. Detect the boundary fast with a single concrete probe early on — "what happens when the write fails halfway through" — and read the answer, not the tone: specific and unhesitating means you’ve found the edge of their depth and can match it right there, while a hedge or a slide into generalities means you’ve already crossed it, and the move is to hold at the higher level you started from, not drop down to meet them. Either way the calibration rule is the same — pitch at the depth they’ve just shown, or one notch above it, never below, since underexplaining a specialist reads as condescension while overexplaining only costs you a sentence.',
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
    howToReadTheirDepth:
      'Their depth is broad and shallow by default — a dozen workstreams instead of one deep system — but confirm it fast by clocking their first follow-up question: a scope-and-impact question like "what does this mean for the launch" or "does this move the date" is the signature of breadth, while a specific-system question like "is that migration synchronous or does it queue" only comes from someone who’s actually gone deep on this one piece. Calibrate to whichever you hear, or one notch above it — never below — pitching a broad PM slightly technical and a deep one with the added precision their question implied, because undershooting reads as condescension and burns credibility faster than a term they’ll just ask you to define.',
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
    howToReadTheirDepth:
      'Their depth runs broad and shallow by design, not by limitation — they’ve traded fluency in any one system for coverage across a dozen bets like yours, so a sharp-sounding question doesn’t mean they can follow you three layers down. Test it in real time: toss back one clarifying question and listen for whether the answer comes in mechanism ("it’s the connection pool, not the query") or in outcome ("just tell me if it’s fixed before the demo") — mechanism marks a pocket of genuine depth worth engaging on its own terms, outcome confirms the default abstraction layer. Either way, calibrate to what you just heard or one notch above it, never below: overshoot slightly and they’ll simply ask you to back up, but undershoot and you’ve told them, without meaning to, that you didn’t think they could keep up.',
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
    howToReadTheirDepth:
      'Their depth runs sideways, not shallow — narrow and deep inside their own domain’s vocabulary, thin to nonexistent in yours, so don’t mistake fluency in one for fluency in the other. Test it fast: drop a term from your own domain into the first exchange (a caching TTL, a p99 latency figure) and watch what comes back — a follow-up phrased in their vocabulary means they’re tracking you at depth, a request to "say that a different way" means you’ve already overshot. Read their title as a starting guess, not a verdict, and default to explaining one notch above the depth you’ve just observed rather than below it — a slightly-too-technical explanation costs you one clarifying question, a condescending one costs you their confidence in the whole conversation.',
    howToAdaptCommunication:
      'Translate the technical constraint into their domain’s terms before explaining it at all — a caching layer becomes "the data they see may be up to five minutes stale," a schema change becomes "this field’s format is changing, here’s what your export needs to expect." Anchor the conversation in what changes for their deliverable, not in how the system got there, and confirm explicitly whether the change requires them to do anything on their side.',
    questionsToAsk: [
      'What decision are they trying to make with this information, specifically within their own domain?',
      'What’s the equivalent concept in their vocabulary for the technical constraint I’m about to describe?',
      'Does this change require action on their part, or is it purely informational?',
      'What would they need to know to explain this change to someone on their own team?',
    ],
  },
  {
    id: 'manager',
    archetype: 'Manager (Direct Report Relationship)',
    whatTheyCareAbout: [
      'Your promotion case — the packet they have to write and defend on your behalf, built from evidence you hand them, not evidence they have to go dig up themselves',
      'Early warning — a capacity or risk problem surfaced while there’s still time to act on it, not a status update after it’s already cost you the deadline',
      'A framed problem, not a raw complaint — something arriving with a proposed trade-off attached, not something they now have to diagnose and solve alone',
      'Being told explicitly what counts as evidence — they can’t always place a given piece of your work into the promotion narrative unless you say where it fits and why',
    ],
    howToReadTheirDepth:
      'Their depth on your actual technical work decays faster than either of you expects, even if they were hands-on with the codebase a year or two ago — they’re tracking breadth across everyone who reports to them now, not staying current on the internals of what you shipped last sprint. Test it by dropping one specific detail into an update (a table name, a library, a metric that moved) and watching whether they ask a follow-up that shows they placed it, or nod and move straight to the outcome — the former means the old depth is still live and you can build on it, the latter means you’re now the only source of truth on that system and need to explain from the ground up. Calibrate to whichever you just measured, one notch higher if you’re unsure, never lower: treating them as more current than they are leaves gaps in the case they eventually have to make about your work when you’re not in the room to fill them in.',
    howToAdaptCommunication:
      'Raise capacity and risk problems early, and in a form they can act on rather than one they have to decode: state the fact, the consequence, and a proposed trade explicitly ("I’m at capacity and the migration will slip unless we cut the reporting task or bring in help") instead of venting about the workload and leaving them to invent the fix — the same information lands as noise when it’s a complaint and as a decision when it’s a proposal. Never assume they’ll independently recognize a piece of work as promotion-relevant just because you know it is; say so directly ("this is the kind of cross-team ownership that belongs in the next packet"), because they’re the one who has to reconstruct and defend that narrative to a committee later, often months after the work is finished and the details have faded for both of you.',
    questionsToAsk: [
      'Have I told them about this risk while there’s still time to change the outcome, or only after it was too late to act on?',
      'Have I said out loud that this piece of work belongs in my promotion case, or am I assuming they’ll remember it unprompted?',
      'Am I bringing them a problem with a proposed trade-off attached, or just a complaint they now have to solve on their own?',
      'If they had to explain this project to someone above them tomorrow, do they actually have what they need from me to do it well?',
    ],
  },
];

export type StoryStructureId = 'chronological' | 'reverse-chronological';

export interface StoryStructureApproach {
  id: StoryStructureId;
  name: string;
  storyBeats: string[];
  bestFor: string;
}

export const STORY_STRUCTURE_APPROACHES: StoryStructureApproach[] = [
  {
    id: 'chronological',
    name: 'Chronological (Top-Down)',
    storyBeats: [
      'Background — the context and constraints in place before the work started',
      'Scope of the problem — how big it was and what made it worth solving',
      'How it was resolved — the approach taken, kept at a high, design-level abstraction rather than implementation detail',
      'Impact, result, and lessons learned',
    ],
    bestFor:
      'An audience that needs shared context before it can evaluate the outcome — someone unfamiliar with the system, or a mixed audience where jumping straight to impact would strand half the room.',
  },
  {
    id: 'reverse-chronological',
    name: 'Reverse-Chronological (Bottom-Up)',
    storyBeats: [
      'Impact, result, and lessons learned — a completed outcome with real proof behind it, not a still-in-progress status update',
      'How it was resolved — the approach taken, at the same design-level abstraction as the impact statement',
      'Scope of the problem — filled in once the headline has already landed',
      'Background — the originating context, offered only if the audience needs it to follow along',
    ],
    bestFor:
      'An audience assessing competence quickly and that already has enough shared context to skip the wind-up — an interview panel, or an executive who wants the headline before the history that produced it.',
  },
];

export interface HybridNarrativeGuidance {
  label: string;
  summary: string;
  body: string[];
}

export const HYBRID_NARRATIVE_GUIDANCE: HybridNarrativeGuidance = {
  label: 'What Actually Works in Practice',
  summary:
    'Reverse-chronological is the right instinct — lead with completed proof, not a slow build-up — but mechanically reversing the chronological list, walking backward through the same abstraction the whole way, is too convenient a shape. It reads as rehearsed, and an audience that assesses competence for a living tends to notice the seam.',
  body: [
    'What tends to work better: open with the headline in one or two sentences — the problem it solved and the outcome, stated as a claim rather than built up to, closer to fifteen seconds than a minute. Then skip the abstract middle layer entirely and go straight into the real implementation depth of the work — the actual mechanism, the actual trade-off, the actual cross-team dependency or disagreement with a peer that had to get resolved — not a sanitized summary of it.',
    'The difference isn’t the order, it’s the altitude. Pure reverse-chronological retelling tends to stay at the same high level the whole way through, just walked backward. Diving into real depth, and continuously reconnecting each detail back to the headline already stated, is what separates a story that reads as lived experience from one that reads as a rehearsed answer — and it’s that same depth (cross-team dependencies, real trade-offs, real conflict resolved with senior peers) that actually signals seniority, not just claiming to have been critical to the project.',
    'Calibrate the jargon the same way the rest of this page argues for — plain enough that a non-technical listener could still follow the shape of the situation and the result, saving the deepest technical vocabulary for when a coding or system-design round actually asks for it. And the same instinct from the conversation framework above still applies here: read what’s actually being asked before deciding how deep to go — a follow-up question is usually pointing at the layer someone wants more of, not a request to start over.',
  ],
};

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
