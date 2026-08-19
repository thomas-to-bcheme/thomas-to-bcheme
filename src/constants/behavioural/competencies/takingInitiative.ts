import type { CompetencyChapter } from './types';

export const TAKING_INITIATIVE: CompetencyChapter = {
  id: 'taking-initiative',
  chapterNumber: 5,
  title: 'Taking Initiative',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/taking-initiative',
  openingHook:
    'Every engineer inherits a backlog of things nobody assigned but everybody would benefit from — the question this competency actually tests is whether you notice them and choose to act.',
  definition:
    "Spotting a problem, inefficiency, or opportunity nobody assigned you, and choosing to act on it — the behavior behind Amazon's Bias for Action, Netflix's Freedom and Responsibility, and Stripe's emphasis on urgency.",
  keyDistinction: {
    label: 'Initiative vs. Ownership',
    explanation:
      'Ownership is doing your assigned scope well. Initiative is choosing to fix something outside that scope. You can be a flawless performer on your own tasks and never once demonstrate initiative.',
  },
  centralTension:
    'Knowing when to just act versus when to check first — total autonomy risks chaos, needing permission for everything guarantees stagnation. Good initiative is judgment about which problems you can solve independently while still respecting what others already own.',
  culturalConsiderations:
    'At a startup, initiative is close to the default expectation — the org depends on people picking up unowned work constantly. At a large, process-heavy company, the same unrequested action can read as overstepping unless you loop in the right owner first; the skill is the same, but who you check with before acting changes. The same tension shows up in whether to mention working nights or weekends to fix something: there is no universally right answer, only whether that detail matches the work style the target company actually rewards.',
  namedCompanyValues: [
    { company: 'Amazon', value: 'Bias for Action' },
    { company: 'Netflix', value: 'Freedom and Responsibility' },
  ],
  relatedCompetencies: [
    {
      id: 'delivery',
      relationship: 'Initiative that gets followed through often becomes a Delivery story once obstacles show up.',
    },
    {
      id: 'problem-solving-and-deep-dive',
      relationship:
        'Spotting the problem is Initiative; methodically diagnosing it is Problem Solving — the same real moment can support either story.',
    },
  ],
  questionCategories: [
    {
      id: 'going-above-and-beyond',
      label: 'Going Above and Beyond',
      exampleQuestion: 'Describe something significant you did that was not part of your assigned work.',
    },
    {
      id: 'spotting-problems-early',
      label: 'Spotting Problems Early',
      exampleQuestion: 'Tell me about catching an issue before anyone else noticed it.',
    },
    {
      id: 'making-things-better',
      label: 'Making Things Better',
      exampleQuestion: 'Describe improving something that was already working adequately.',
    },
    {
      id: 'acting-independently',
      label: 'Acting Independently',
      exampleQuestion: 'Tell me about a decision you made on your own and looped your manager in afterward.',
    },
    {
      id: 'taking-smart-risks',
      label: 'Taking Smart Risks',
      exampleQuestion: 'Describe a calculated risk on unassigned work, including one that did not pan out.',
    },
  ],
  sampleQuestions: [
    {
      id: 'taking-initiative',
      category: 'Taking Initiative Beyond Your Role',
      prompt:
        'Tell me about a time you identified a problem or opportunity nobody had asked you to address, and took it on anyway.',
      framingNotes:
        'Tests ownership of the unowned — noticing and acting before being told, not executing assigned work well. The trap is describing a task that was actually assigned, dressed up as initiative.',
      hssGuidance: {
        contextHint:
          "Establish, briefly, that this had no owner and was not on anyone's roadmap — that absence of ownership is the whole premise.",
        headlineHint: 'Your headline should assert what you noticed and chose to do about it — not just what eventually shipped.',
        behavioralCoreMoments: [
          'The moment you noticed the gap and the reasoning for why it was worth acting on despite not being asked.',
          'How you scoped the work small enough to not derail your actual assignments, and when you looped others in.',
          'Whether it got adopted or institutionalized beyond your own use of it — that is the signal it was a real gap.',
        ],
      },
      levelSignal: {
        senior: "Notices and fixes a gap affecting their own team's day-to-day effectiveness, on their own initiative, without being asked.",
        staff:
          'Notices a gap affecting multiple teams that nobody owns because it falls between team boundaries, and builds something durable enough that other teams adopt it as shared infrastructure or practice.',
      },
    },
    {
      id: 'navigating-ambiguity',
      category: 'Navigating Ambiguity Without Guidance',
      prompt: 'Tell me about a time you were given a task or problem with little direction. How did you proceed?',
      framingNotes: 'Tests tolerance for uncertainty and bias toward action, not whether you eventually got clear instructions.',
      hssGuidance: {
        contextHint: 'Name the specific kind of ambiguity — unclear goal, unclear owner, unclear constraints.',
        headlineHint: 'Your headline should assert what you decided the goal should be, before anyone told you.',
        behavioralCoreMoments: [
          'The concrete steps you took to reduce uncertainty — a small experiment, a prototype, a stakeholder conversation.',
          'Whether your interpretation of the ambiguous ask turned out right, and how fast you corrected if not.',
        ],
      },
      levelSignal: {
        senior: 'Defines the goal and success criteria for their own unclear task, then delivers against the bar they set.',
        staff:
          "Defines the goal for a problem where the right approach isn't obvious to anyone yet, producing enough structure that other teams can align around it.",
      },
    },
  ],
  keySignals: [
    'The explicit moment of choosing to act — not stumbling into extra work.',
    'Acting while communicating — not asking permission at every step, but not going dark either.',
    'Spotting patterns others miss.',
    'Following through to measured impact, not just raising the flag.',
  ],
  redFlags: [
    'Confusing hard work on assigned tasks with initiative.',
    "Acting without asking why the work wasn't already assigned.",
    'Playing lone hero instead of getting buy-in.',
    'Being vague about the value actually created.',
  ],
  reflectionQuestions: [
    'What have you fixed recently that nobody put on your plate?',
    'When did you notice a pattern before anyone flagged it as a problem?',
    'What have you improved that was already technically "working fine"?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A deliberate choice-point, not stumbling into extra work.',
      'Judgment about acting alone vs. involving others.',
      'A measurable outcome.',
      'Your authentic work style — this signals fit as much as skill.',
    ],
    avoidTheseTraps: [
      'Dressing up assigned work as unassigned initiative.',
      'Acting without understanding why the gap existed.',
      'Going lone-wolf instead of bringing others along.',
      'A vague "it helped" instead of a real measured result.',
    ],
  },
};
