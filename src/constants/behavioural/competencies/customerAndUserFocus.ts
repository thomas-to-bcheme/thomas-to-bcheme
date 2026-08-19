import type { CompetencyChapter } from './types';

export const CUSTOMER_AND_USER_FOCUS: CompetencyChapter = {
  id: 'customer-and-user-focus',
  chapterNumber: 10,
  title: 'Customer and User Focus',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/customer-and-user-focus',
  openingHook:
    'A ticket tells you what someone asked for; this competency tests whether you can also figure out what they actually need, and whether those two things are even the same.',
  definition:
    "Turning the underlying need behind a request into the right technical solution, rather than simply implementing what was literally asked for — the instinct behind Amazon's Customer Obsession, starting from the customer and working backwards to the solution.",
  keyDistinction: {
    label: 'Literal Request vs. Underlying Need',
    explanation:
      "A user asking for a specific feature is usually describing the workaround they've improvised around a deeper problem, not the actual fix. Someone requesting a way to pull data out of a system, for instance, often really wants to analyze that data, not to own a file — and a straightforward export button may satisfy the literal ask while leaving the real need unaddressed.",
  },
  centralTension:
    "Users describe symptoms and current pain, rarely the real underlying need directly. Implementing every literal request produces a cluttered system full of one-off workarounds; ignoring user input entirely produces a technically clean product nobody actually wants. The skill sitting between those two failure modes is investigating the 'why' behind each ask before deciding what to build.",
  culturalConsiderations:
    "Engineers who never speak with an external customer still practice this competency directly — for infrastructure, platform, or internal-tooling roles, your 'customer' is simply the next team consuming your output, and their friction is exactly as valid a signal as an external user's complaint. At a consumer product company, this competency is tested through direct end-user research and usage data. At an infrastructure or platform team, it shows up as tracing how an API or tooling decision ripples into other teams' daily work. At an enterprise or B2B company, the person using the software and the person who requested the feature are often different people with different needs entirely, and untangling that gap is itself part of the skill being assessed.",
  namedCompanyValues: [{ company: 'Amazon', value: 'Customer Obsession' }],
  relatedCompetencies: [
    {
      id: 'problem-solving-and-deep-dive',
      relationship:
        'Investigating the real need behind a literal request is the same root-cause instinct Problem Solving applies to a technical symptom, just aimed at a person instead of a system.',
    },
    {
      id: 'strategic-leadership-and-thinking-big',
      relationship:
        'Prioritizing between conflicting user segments is a smaller-scope version of the same trade-off judgment Strategic Leadership requires across whole teams.',
    },
  ],
  questionCategories: [
    {
      id: 'understanding-user-needs',
      label: 'Understanding User Needs',
      exampleQuestion: 'Tell me about validating what users actually needed versus what they asked for.',
    },
    {
      id: 'balancing-technical-and-user-needs',
      label: 'Balancing Technical and User Needs',
      exampleQuestion: 'Describe a technical trade-off you made specifically to serve users better.',
    },
    {
      id: 'measuring-user-success',
      label: 'Measuring User Success',
      exampleQuestion: 'How did you verify that a feature you built actually helped users?',
    },
    {
      id: 'advocating-for-users',
      label: 'Advocating for Users',
      exampleQuestion: 'Tell me about pushing back on a technical approach because of its impact on users.',
    },
  ],
  sampleQuestions: [
    {
      id: 'validating-the-real-need',
      category: 'Understanding User Needs',
      prompt: 'Tell me about a time you investigated what a user actually needed instead of building exactly what they asked for.',
      framingNotes:
        'Tests whether you probe past a literal request to the underlying goal, rather than treating the request as a spec to be implemented at face value.',
      hssGuidance: {
        contextHint: 'Name the literal request exactly as it first came in, before you investigated any further.',
        headlineHint: 'Your headline should assert what you discovered the real underlying need was, and how that changed what you built.',
        behavioralCoreMoments: [
          'How you investigated — conversation, usage data, direct observation — rather than assuming you already knew.',
          'The specific moment the real need diverged from the literal ask.',
          'What you built instead, and evidence it served the underlying need better than the original request would have.',
        ],
      },
      levelSignal: {
        senior: 'Uncovers the real need behind one team or user segment\'s request and builds the right solution instead of the literal one.',
        staff:
          'Notices the same underlying need surfacing as different literal requests across multiple teams, and builds one solution that serves all of them instead of a one-off fix for each.',
      },
    },
    {
      id: 'advocating-for-users-at-a-cost',
      category: 'Advocating for Users',
      prompt: 'Tell me about a time you pushed back on a technical approach or business decision because of its impact on users, even though raising it cost you something.',
      framingNotes:
        'Tests willingness to spend real capital — time, a deadline, standing with a stakeholder — in defense of the user, not just noticing a user problem in passing.',
      hssGuidance: {
        contextHint: 'Name what pushing back actually cost you — schedule time, a disagreement with a stakeholder, extra rework.',
        headlineHint: 'Your headline should assert the stance you took and the specific user impact it was protecting.',
        behavioralCoreMoments: [
          'The evidence you brought to make the user impact concrete rather than a hunch or a personal preference.',
          'How you made the case to people who did not initially share your priority.',
          'The outcome for users, and whether it held up once the decision was tested in practice.',
        ],
      },
      levelSignal: {
        senior: "Pushes back on a decision affecting their own feature's users, backed by concrete evidence, even when it costs schedule time.",
        staff:
          'Pushes back on a decision affecting users across multiple teams\' surfaces, and earns buy-in from stakeholders who do not report to them.',
      },
    },
  ],
  keySignals: [
    'Probing past the literal request to the real underlying goal before deciding what to build.',
    'Understanding downstream user impact even when removed from end users, including the internal-customer case.',
    'Measuring actual user outcomes, not just system or technical metrics.',
    'Deliberately prioritizing between conflicting user segments and being able to explain the trade-off.',
  ],
  redFlags: [
    'Implementing requests exactly as specified with zero investigation into why they were asked for — acting as an order-taker rather than a problem-solver.',
    'Treating user research as a one-time kickoff step instead of an ongoing input to decisions.',
    'Optimizing a technical or system metric with no stated benefit to an actual user.',
    'Applying one uniform solution across user segments that genuinely need different things.',
  ],
  reflectionQuestions: [
    'When did you build something different from what was literally requested because you understood the real need better?',
    'Who is the "customer" of your work, even if you never speak with them directly?',
    'When did you measure whether a feature actually helped users, rather than just confirming it shipped?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'Direct user research or observation, not assumption.',
      'A clear line from the discovered user need to the technical decision you made.',
      'A moment you advocated for users at some real cost to yourself or your team.',
      'A measured user outcome, not just a shipped feature.',
    ],
    avoidTheseTraps: [
      'Implementing a request with no investigation into the underlying why.',
      'Treating user research as a one-time exercise rather than an ongoing practice.',
      'Optimizing technical metrics detached from any real user benefit.',
      'Applying the same fix to segments that genuinely need different things.',
    ],
  },
};
