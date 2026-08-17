export interface RubricDimension {
  id: string;
  label: string;
  levels: { score: 1 | 3 | 5; description: string }[];
  tip: string;
}

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  {
    id: 'communication',
    label: 'Communication',
    levels: [
      { score: 1, description: 'Silent or hard to follow — the interviewer can’t tell what you’re thinking.' },
      { score: 3, description: 'Explains decisions when asked, but doesn’t volunteer the reasoning first.' },
      { score: 5, description: 'Narrates trade-offs proactively, without being prompted.' },
    ],
    tip: 'Say the trade-off out loud before the interviewer asks "why" — silence reads as uncertainty even when you\'re not.',
  },
  {
    id: 'breadth',
    label: 'Breadth',
    levels: [
      { score: 1, description: 'Fixates on one component while the rest of the system goes unaddressed.' },
      { score: 3, description: 'Covers the expected major components at a reasonable level.' },
      { score: 5, description: 'Proactively surfaces components the interviewer didn’t hint at.' },
    ],
    tip: 'Sketch the whole system at a high level before diving deep anywhere — breadth first, depth second.',
  },
  {
    id: 'depth',
    label: 'Depth',
    levels: [
      { score: 1, description: 'Names components at a surface level only — no detail behind the label.' },
      { score: 3, description: 'Can go one level deeper when asked to.' },
      { score: 5, description: 'Anticipates the deep-dive and pre-empts it before being asked.' },
    ],
    tip: 'For the 1-2 components you expect the interviewer to probe, rehearse the next level down before the interview.',
  },
  {
    id: 'trade-off-articulation',
    label: 'Trade-off Articulation',
    levels: [
      { score: 1, description: 'Presents one option as the only option.' },
      { score: 3, description: 'Names alternatives when asked.' },
      { score: 5, description: 'Proactively names 2-3 alternatives with a reasoned pick.' },
    ],
    tip: 'Use the phrasing "I\'m choosing X over Y because..." even when nobody asked — it signals you know the alternatives exist.',
  },
  {
    id: 'proactive-problem-identification',
    label: 'Proactive Problem Identification',
    levels: [
      { score: 1, description: 'Needs the interviewer to point out every bottleneck.' },
      { score: 3, description: 'Catches bottlenecks once the interviewer flags them.' },
      { score: 5, description: 'Identifies bottlenecks before being asked.' },
    ],
    tip: 'After sketching a component, ask yourself out loud "what breaks this at 10x traffic?" before moving on.',
  },
];

export const STAFF_LEVEL_DIFFERENTIATORS: string[] = [
  'A passing answer covers the expected components; a staff-level answer covers them and names which ones matter most, and why',
  'A passing answer explains a trade-off when asked; a staff-level answer volunteers 2-3 alternatives and defends the pick unprompted',
  'A passing answer treats the design as finished at the end; a staff-level answer names what it would revisit with more time or more information',
  'A passing answer reasons about the happy path; a staff-level answer reasons about failure modes and operational concerns from the start',
  'A passing answer picks a reasonable database; a staff-level answer states the specific, measurable threshold that would change the pick',
];

export const HELLO_INTERVIEW_CROSS_REFERENCE: { dimension: string; note: string }[] = [
  {
    dimension: 'Problem Navigation',
    note: 'Maps closest to Breadth and Proactive Problem Identification above — can you scope and steer the conversation, not just answer questions.',
  },
  {
    dimension: 'Solution Design',
    note: 'Maps closest to Depth and Trade-off Articulation — the substance of the architecture itself, not just how it’s presented.',
  },
  {
    dimension: 'Technical Excellence',
    note: 'Cuts across Depth and Trade-off Articulation — the correctness and sophistication of the specific technical choices made.',
  },
  {
    dimension: 'Communication and Collaboration',
    note: 'Maps directly to Communication above — narrating reasoning and treating the interviewer as a collaborator, not an examiner.',
  },
];
