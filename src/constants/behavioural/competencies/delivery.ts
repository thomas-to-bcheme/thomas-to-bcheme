import type { CompetencyChapter } from './types';

export const DELIVERY: CompetencyChapter = {
  id: 'delivery',
  chapterNumber: 6,
  title: 'Delivery',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/delivery',
  openingHook:
    'Ideas are cheap and plentiful — this competency exists because turning an idea into working software, on a real deadline, in the presence of everything that goes wrong along the way, is the rarer skill.',
  definition:
    'Consistently shipping working software against real deadlines despite obstacles and shifting requirements — the difference between people who dream up good plans and people who actually ship them.',
  keyDistinction: {
    label: 'Basic Completion vs. Delivery',
    explanation:
      'Finishing assigned work when nothing goes wrong is baseline competence, not Delivery. Delivery is completion despite shifting requirements or unexpected obstacles — it only becomes visible once something threatens the deadline.',
  },
  centralTension:
    'Perfect-but-late is functionally useless; fast-but-broken wastes everyone\'s time cleaning up after it. Good delivery is knowing which shortcuts are safe to take and which quality bars are non-negotiable, and having the judgment to tell the two apart under time pressure.',
  culturalConsiderations:
    'How much stakeholder-facing delivery communication is expected scales with level and org size: an entry-level engineer is rarely expected to manage broad stakeholder relationships around a slipping date, while a senior-or-above engineer is expected to surface delivery risk proactively, not just execute quietly and hope it resolves itself. Startups tend to reward visible urgency; larger orgs tend to reward predictable, well-communicated delivery over heroics.',
  relatedCompetencies: [
    {
      id: 'taking-initiative',
      relationship: 'The unassigned fix that becomes a delivery story is often the same real event, told through a different lens.',
    },
    {
      id: 'problem-solving-and-deep-dive',
      relationship: 'The obstacle you pushed through to deliver on time is frequently the same investigation a Problem Solving story would tell in more diagnostic detail.',
    },
  ],
  questionCategories: [
    {
      id: 'meeting-deadlines-and-constraints',
      label: 'Meeting Deadlines and Constraints',
      exampleQuestion: 'Tell me about delivering something important under a tight deadline or limited resources.',
    },
    {
      id: 'juggling-competing-priorities',
      label: 'Juggling Competing Priorities',
      exampleQuestion: 'How do you handle multiple projects with conflicting deadlines?',
    },
    {
      id: 'pushing-through-obstacles',
      label: 'Pushing Through Obstacles',
      exampleQuestion: 'Describe an unexpected blocker that threatened a deadline and what you did about it.',
    },
    {
      id: 'balancing-speed-vs-quality',
      label: 'Balancing Speed vs. Quality',
      exampleQuestion: 'Tell me about a trade-off you made in order to ship on time.',
    },
    {
      id: 'managing-delivery-expectations',
      label: 'Managing Delivery Expectations',
      exampleQuestion: 'How have you communicated a delivery risk or likely delay to leadership?',
    },
  ],
  sampleQuestions: [
    {
      id: 'scope-creep',
      category: 'Going Out of Scope / Scope Creep',
      prompt: 'Tell me about a project where the scope kept expanding after work had already started. How did you keep it on track?',
      framingNotes:
        'Tests whether you can protect a deadline by making deliberate trade-offs, not whether you absorbed every new request without pushback. The trap is a story where scope simply grew and you worked longer hours to compensate — that is effort, not delivery judgment.',
      hssGuidance: {
        contextHint: 'Name the original scope and deadline concretely before describing what got added on top of it — the contrast is the whole point.',
        headlineHint: 'Your headline should assert the trade-off you decided to make, not just that the project shipped eventually.',
        behavioralCoreMoments: [
          'The specific moment you noticed scope was growing past what the deadline could absorb, and the reasoning behind what you chose to protect versus cut or defer.',
          'How you communicated that trade-off to whoever was adding scope, and whether they agreed with the cut.',
          'What actually shipped on the original date versus what got explicitly deferred, and the confirmed outcome of that call.',
        ],
      },
      levelSignal: {
        senior: 'Recognizes creeping scope on their own project and renegotiates it directly with the requester before it threatens the deadline.',
        staff: 'Recognizes scope creep as a symptom of a missing prioritization process across a program, and establishes a lightweight mechanism the team reuses on future projects.',
      },
    },
    {
      id: 'prioritizing-competing-deadlines',
      category: 'Prioritizing Competing Deadlines',
      prompt: 'Tell me about a time you had two important deadlines competing for the same time, and how you decided what to do first.',
      framingNotes:
        'Tests explicit prioritization judgment — the criteria you used to rank the work — rather than just describing that you worked harder or later to cover both.',
      hssGuidance: {
        contextHint: 'State both competing deadlines and why they genuinely could not both be done in full, in parallel, on time.',
        headlineHint: 'Your headline should assert the criteria you prioritized by (impact, risk, reversibility), not just which one you picked.',
        behavioralCoreMoments: [
          'The reasoning you used to rank the two — impact, blast radius, or who else was blocked by each.',
          'How you communicated the deprioritization to the owner of the deadline you moved, and how they reacted.',
          'The confirmed outcome for both, including any renegotiated timeline for the deprioritized item.',
        ],
      },
      levelSignal: {
        senior: 'Prioritizes between two of their own competing deadlines using clear impact reasoning, and communicates the trade-off proactively.',
        staff: 'Prioritizes across deadlines owned by multiple teams, aligning stakeholders on shared criteria so the trade-off does not need to be re-litigated each time it recurs.',
      },
    },
  ],
  keySignals: [
    'Shipping despite obstacles or changing plans — blockers slow the work down, they do not stop it.',
    'Making smart trade-offs: protecting what is critical, deliberately dropping nice-to-haves.',
    'Maintaining momentum by catching issues early, so stakeholders are never surprised at the deadline.',
  ],
  redFlags: [
    'Blaming others or circumstances for a delivery failure instead of owning what was within your control.',
    'Treating 80-hour weeks as a normal operating mode rather than a rare, explicitly temporary exception.',
    'Only having stories where conditions were smooth — no obstacle, no trade-off, no real test of delivery judgment.',
    'Describing effort and hours spent without confirming what actually shipped or when.',
    'Disguising perfectionism as "high standards" when it was really an inability to ship an acceptable version on time.',
  ],
  reflectionQuestions: [
    'What is a deadline you hit that had a real obstacle in the way, not just a straightforward execution?',
    'When did you have to cut scope or quality somewhere in order to protect a delivery date?',
    'When did you have to tell someone a deadline was at risk before they found out on their own?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A specific, named blocker — not a vague sense that "things got hard."',
      'The pivot or trade-off you made in response to it.',
      'Proactive communication about risk or delay, not a surprise at the deadline.',
      'A measurable result that shipped despite imperfect conditions.',
    ],
    avoidTheseTraps: [
      'Externalizing the failure onto others instead of owning your part of it.',
      'Presenting extreme hours as the default solution rather than the exception.',
      'Choosing only frictionless stories that never actually test delivery judgment.',
      'Talking about effort instead of confirming a real, shipped outcome.',
    ],
  },
};
