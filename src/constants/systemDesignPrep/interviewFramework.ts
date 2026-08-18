import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

// 4-step interview framework, ByteByteGo-inspired, enriched with a few
// Hello Interview-style specifics (see externalReferences.ts for both
// sources) — the tool reached for during steps 2 and 3 is the question
// bank in SystemDesignQuestionsSection.
export const INTERVIEW_FRAMEWORK_STEPS: FrameworkStep[] = [
  {
    id: 'requirements-scope',
    marker: '1',
    label: 'Requirements & Scope',
    durationLabel: '~5 min',
    description:
      'Understand the problem before proposing anything. Separate functional requirements (what the system does) from non-functional ones (how well it does it).',
    detail: [
      'Establish non-functional characteristics before functional ones — reliability, scalability, maintainability, adaptability, and the CAP trade-off (see Core Characteristics) shape every choice that follows, including what "done" even means here',
      'Back-of-envelope the scale and performance targets early: expected QPS, data volume/growth, read:write ratio, and p99 latency — real numbers, not adjectives, decided before the first component gets drawn',
      'Quantify non-functional requirements — "<500ms p99 latency" not "low latency", "99.9% availability" not "highly available"',
      'Briefly name 2-3 core entities (the nouns the system revolves around) before moving to design',
      'Confirm scope out loud — what is explicitly out of scope for this session matters as much as what is in scope',
    ],
  },
  {
    id: 'high-level-design',
    marker: '2',
    label: 'High-Level Design',
    durationLabel: 'Remaining time, split evenly with Deep Dive',
    description:
      'Sketch the major components and how data flows between them, at a level an interviewer can follow on a whiteboard.',
    detail: [
      'Start with the simplest design that satisfies the requirements, then layer in complexity',
      'Name each component’s responsibility in one sentence before drawing the next one',
      'For at least one real fork (e.g. SQL vs NoSQL, monolith vs microservices), sketch 2 viable options out loud and name the trade-off that picked one — see the "Mentioning a trade-off" script',
      'This is where the question bank below gets used — real-time vs batch, sync vs async, SQL vs NoSQL, each as they come up naturally',
      'Check in with the interviewer before going deep on any one part — confirm the shape is right first',
    ],
  },
  {
    id: 'deep-dive',
    marker: '3',
    label: 'Deep Dive',
    durationLabel: 'Remaining time, split evenly with High-Level Design',
    description:
      'Pick the 1-2 components that matter most (either because the interviewer steers there, or because that’s where the interesting trade-offs live) and go deep.',
    detail: [
      'This is where the implementation-notes ("Go deeper") layer of each question below gets used',
      'Same discipline applies here: at least 2 options before committing, even for a single deep-dive component under time pressure',
      'Proactively surface a bottleneck before being asked — see the Staff Signals section',
      'Quantify: back-of-envelope numbers (requests/sec, storage growth) turn hand-waving into a real argument',
    ],
  },
  {
    id: 'wrap-up',
    marker: '4',
    label: 'Wrap Up',
    durationLabel: '~5 min',
    description:
      'Summarize the design, name its known weaknesses, and show awareness that the design continues evolving after the interview ends.',
    detail: [
      'Restate the design in 2-3 sentences — shows you can hold the whole system in your head',
      'Name what you’d do with more time, rather than presenting the design as finished',
      'The interview isn’t over after the initial design — expect follow-up "what if" questions and treat them as more of the same process',
    ],
  },
];

export const INTERVIEW_DOS: string[] = [
  'Ask clarifying questions before proposing a solution — ambiguity is the point of the exercise, not an obstacle to rush past',
  'Think out loud — narrate the trade-off you’re weighing, not just the conclusion',
  'Propose multiple approaches when a real fork exists, then explain why you picked one',
  'Identify the critical components first, before filling in every peripheral detail',
  'Quantify wherever possible — a number beats an adjective',
];

export const INTERVIEW_DONTS: string[] = [
  "Don't jump straight to a solution before requirements are understood",
  "Don't front-load excessive detail on a component before confirming the interviewer wants to go there",
  "Don't think silently — a long pause with no narration reads as stuck, even when you're not",
  "Don't assume the interview ends after the initial design — expect and welcome follow-up questions",
  "Don't present one option as the only option when real alternatives exist",
];
