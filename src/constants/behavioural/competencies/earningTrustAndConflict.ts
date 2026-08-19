import type { CompetencyChapter } from './types';

export const EARNING_TRUST_AND_CONFLICT: CompetencyChapter = {
  id: 'earning-trust-and-conflict',
  chapterNumber: 8,
  title: 'Earning Trust and Dealing with Conflict',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/earning-trust-and-dealing-with-conflict',
  openingHook:
    'Trust is the thing you build slowly, in the background, across every interaction nobody is scoring — and conflict is the moment that balance either gets spent wisely or gets wiped out in five minutes.',
  definition:
    'Two related but distinct skills bundled into one competency: trust-building is proactive — delivering on commitments, being honest even when it costs you, and staying consistent over time — while conflict management is reactive, the ability to work through a real disagreement well once it happens.',
  keyDistinction: {
    label: 'Proactive Trust vs. Reactive Conflict',
    explanation:
      'Trust-building happens continuously, before any disagreement exists, through reliability and transparency. Conflict management only gets tested in a single high-stakes moment. A story can show one without the other — someone can be a scrupulously reliable teammate who has still never navigated a real disagreement, or someone can resolve conflicts skillfully while being inconsistent day to day.',
  },
  centralTension:
    'Being honest and direct enough to say the hard thing, while staying diplomatic enough that saying it does not damage the relationship. A second layer of the same tension: knowing when to stand firm — usually on a core value or a real risk — versus when to flex on an implementation detail that was never worth the fight. Unbending on everything stifles collaboration; flexing on everything erodes your own credibility.',
  culturalConsiderations:
    'At a startup or high-growth company, direct and fast disagreement is often the expected norm — hesitating to voice a concern can itself read as a weak signal. At a large, process-heavy or traditional enterprise, the same directness may need to be routed through the right forum or the right person first, or it reads as going around the chain rather than raising a concern. In a remote-first or cross-cultural team, written disagreement loses tone quickly, and what counts as "direct" varies by cultural communication norm — someone raised in a high-context communication culture may read blunt disagreement as disrespect, while someone from a low-context culture may read hedged disagreement as evasiveness. The skill is the same everywhere; only the packaging changes.',
  namedCompanyValues: [{ company: 'Amazon', value: 'Earn Trust' }],
  relatedCompetencies: [
    {
      id: 'developing-others',
      relationship:
        "Trust is the prerequisite for coachability — someone won't accept difficult feedback from you, or take a risk on your advice, until they trust you enough to be vulnerable in front of you.",
    },
    {
      id: 'strategic-leadership-and-thinking-big',
      relationship:
        "Building consensus across stakeholders you don't control leans directly on trust you've already earned with them — without it, the same pitch reads as a mandate instead of a proposal.",
    },
  ],
  questionCategories: [
    {
      id: 'working-through-disagreements',
      label: 'Working Through Disagreements',
      exampleQuestion: 'Tell me about disagreeing with a teammate or manager on a technical approach.',
    },
    {
      id: 'building-rebuilding-trust',
      label: 'Building or Rebuilding Trust',
      exampleQuestion: 'Describe a time you had to rebuild trust after letting your team down.',
    },
    {
      id: 'managing-complex-relationships',
      label: 'Managing Complex Relationships',
      exampleQuestion: 'Tell me about your most difficult stakeholder relationship.',
    },
    {
      id: 'high-pressure-situations',
      label: 'High-Pressure Situations',
      exampleQuestion: 'Describe delivering bad news, or handling blame during a production incident.',
    },
    {
      id: 'learning-from-feedback',
      label: 'Learning From Feedback',
      exampleQuestion: "What's the hardest feedback you've received, and what did you change because of it?",
    },
  ],
  sampleQuestions: [
    {
      id: 'conflict-resolution',
      category: 'Conflict Resolution',
      prompt: 'Tell me about a time you disagreed with a peer or your manager on a technical approach. How did you handle it?',
      framingNotes:
        "Tests whether you disagree on ideas rather than people, and whether you can fully support the final call even when it wasn't your preference — not whether you won the argument.",
      hssGuidance: {
        contextHint: 'Name the specific point of disagreement and who held the opposing view, without editorializing about who was right yet.',
        headlineHint:
          'Your headline should assert what you did to work through the disagreement constructively, not just that a disagreement happened.',
        behavioralCoreMoments: [
          'How you made your case with evidence rather than escalating emotionally or personalizing the disagreement.',
          'The moment you decided to keep pushing, compromise, or concede, and why.',
          'How fully you supported the final decision afterward, including if it went the other way.',
        ],
      },
      levelSignal: {
        senior:
          'Resolves a disagreement with a peer or manager on their own team by making a well-reasoned case once, then commits fully once a decision is made.',
        staff:
          "Resolves a standoff between peers at their own level with no shared manager to appeal to, settling it on the technical and business merits alone.",
      },
    },
    {
      id: 'disagreeing-with-leadership',
      category: 'Disagreeing With a Decision From Leadership',
      prompt: 'Tell me about a time you disagreed with a decision made by someone with authority over you. How did you handle it?',
      framingNotes:
        'Tests the same underlying skill as peer conflict resolution, but under a real power imbalance — pushing back on someone who could simply overrule you, without damaging the relationship or your own credibility in the process.',
      hssGuidance: {
        contextHint: 'Establish the power gap explicitly early on — this is not a peer disagreement, and that difference is the point of the question.',
        headlineHint: 'Your headline should assert the stance you took and why you believed it was worth the risk of pushing back.',
        behavioralCoreMoments: [
          'How you built the case with evidence and data rather than appealing to seniority or personal preference.',
          'The moment leadership either changed course or held firm, and how you responded either way.',
          'How you executed afterward, including how visibly you supported the decision if it went against your recommendation.',
        ],
      },
      levelSignal: {
        senior: 'Raises a disagreement once, backed by a clear rationale, and commits fully to executing the decision regardless of which way it goes.',
        staff:
          "Has already built enough credibility with leadership that their pushback gets seriously reconsidered rather than read as insubordination, and knows how to earn that credibility deliberately rather than assuming it.",
      },
    },
    {
      id: 'owning-failure',
      category: 'Owning a Failure or Hard Feedback',
      prompt: 'Tell me about a time you let your team down, or received hard feedback that was difficult to hear. What did you do afterward?',
      framingNotes:
        'Tests accountability and self-reflection rather than deflection — the trap is explaining the surrounding circumstances instead of naming what you specifically did wrong and what changed because of it.',
      hssGuidance: {
        contextHint: 'Name specifically what went wrong or what the feedback was, and whose trust in you was affected.',
        headlineHint: 'Your headline should assert what you personally owned, not what happened to you.',
        behavioralCoreMoments: [
          'The moment you accepted the feedback or failure without deflecting it onto circumstances or other people.',
          'A concrete change in behavior or process you made immediately afterward.',
          'Evidence that trust was measurably rebuilt over time, not just that the immediate awkwardness passed.',
        ],
      },
      levelSignal: {
        senior:
          "Owns a mistake affecting their own team, changes a specific, nameable behavior, and rebuilds trust through consistency over the following months.",
        staff:
          'Owns a mistake with consequences reaching beyond their own team, surfaces it proactively before being asked, and uses the moment to model psychological safety for people watching how they handle it.',
      },
    },
  ],
  keySignals: [
    'Constructive conflict resolution — disagreeing on ideas, not people, and fully supporting the final call even when it was not your preference.',
    'Direct, transparent communication, including surfacing bad news early rather than letting it surface on its own.',
    'Reliability and accountability sustained over time, not just in the one moment being asked about.',
    'Bridging genuinely different perspectives instead of just picking a side.',
    'Creating psychological safety for others to disagree with you.',
  ],
  redFlags: [
    'Claiming you have "never had a significant disagreement" — reads as low self-awareness, not diplomacy.',
    'Winning the argument but damaging the relationship in the process.',
    'Blaming the other person with zero self-reflection on your own part.',
    'Being endlessly accommodating — no real boundaries is not the same thing as being trustworthy.',
    'A vague "we worked it out" outcome with no specifics on what actually changed.',
  ],
  reflectionQuestions: [
    'What is a disagreement you handled recently where you can point to exactly what you did to keep it constructive?',
    'When has someone had to rebuild your trust, or you theirs — what specifically rebuilt it?',
    'What is the hardest piece of feedback you have received, and what changed afterward because of it?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A real disagreement worked through constructively, not avoided or steamrolled.',
      'A mistake owned outright, not deflected onto circumstances or other people.',
      'A specific moment you chose to stand firm versus a moment you chose to compromise.',
      'A relationship that measurably improved afterward, not just returned to neutral.',
    ],
    avoidTheseTraps: [
      'Insisting you have never had a real disagreement worth describing.',
      'Winning the argument at the cost of the relationship.',
      'Explaining a failure primarily in terms of what other people or circumstances did.',
      'Leaving the outcome vague instead of naming what specifically changed.',
    ],
  },
};
