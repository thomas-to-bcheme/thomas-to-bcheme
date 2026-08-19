import type { CompetencyChapter } from './types';

export const STRATEGIC_LEADERSHIP_AND_THINKING_BIG: CompetencyChapter = {
  id: 'strategic-leadership-and-thinking-big',
  chapterNumber: 13,
  title: 'Strategic Leadership and Thinking Big',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/strategic-leadership-and-thinking-big',
  openingHook:
    "This is the competency that decides most senior-to-staff-and-beyond promotion cases, and the hardest part it tests isn't the size of your vision — it's whether you know which team to win over first.",
  definition:
    'Two distinct, complementary skills: strategic leadership is seeing how problems that look separate across different teams actually connect to one shared root cause, and getting people to act on it together; thinking big is the ambition of what you propose in response — a rebuild instead of a patch, a new capability instead of an optimization. Thinking big without strategic leadership produces ideas that never ship; strategic leadership without thinking big produces well-executed work that never moves the needle. The competency requires both at once.',
  keyDistinction: {
    label: 'Strategic Leadership vs. Thinking Big',
    explanation:
      'Strategic leadership is the seeing-and-aligning skill — spotting the shared root cause and getting multiple teams to act on it together. Thinking big is the ambition skill — proposing a rebuild rather than a patch. A story can have one without the other: a well-run, purely local improvement has thinking-big without the cross-team leadership; a grand company-wide proposal that never got adopted has thinking-big without the strategic leadership needed to land it.',
  },
  centralTension:
    'Announcing a sweeping, company-wide vision all at once invites reflexive resistance and usually stalls before it starts. Staying purely incremental never produces change at the scale thinking big actually requires. The resolution is sequencing: win over the one team hurting enough to try something new, make their success visible, and use that proof to pull in the next team — a chain of proof points, not a single announcement.',
  culturalConsiderations:
    "Amazon names this directly as a leadership principle — Think Big. Google doesn't name it as a formal value, but treats it as the deciding factor in staff-and-above promotion committees; the skill is identical, it's just packaged as a leveling bar instead of a stated value. Either way, the sequencing this competency requires — winning one team before the next — matters more in large, multi-team orgs where you have no positional authority over most of the people whose buy-in you need; in a small org, the same change might only need one conversation.",
  namedCompanyValues: [{ company: 'Amazon', value: 'Think Big' }],
  relatedCompetencies: [
    {
      id: 'innovation',
      relationship: 'Thinking big is the same ambition-to-invent-something-new instinct as Innovation, applied at a cross-team or org scale instead of a single problem.',
    },
    {
      id: 'taking-initiative',
      relationship: 'Spotting a cross-team problem nobody owns is Initiative at a bigger scope — the difference is whether you fix it alone or align multiple teams to fix it together.',
    },
  ],
  questionCategories: [
    {
      id: 'seeing-the-big-picture',
      label: 'Seeing the Big Picture',
      exampleQuestion: 'Tell me about spotting a pattern across teams that pointed to a bigger opportunity.',
    },
    {
      id: 'leading-change',
      label: 'Leading Change',
      exampleQuestion: "Describe aligning multiple teams around a new technical direction you didn't have authority to mandate.",
    },
    {
      id: 'creating-broad-impact',
      label: 'Creating Broad Impact',
      exampleQuestion: 'Tell me about a decision of yours that had organization-wide effects.',
    },
    {
      id: 'making-strategic-trade-offs',
      label: 'Making Strategic Trade-Offs',
      exampleQuestion: 'Describe choosing between two valuable initiatives when you could only pursue one.',
    },
  ],
  sampleQuestions: [
    {
      id: 'resistance-to-change',
      category: "Addressing \"We've Always Done It This Way\"",
      prompt: 'Tell me about a time you proposed a change to how something had always been done, and faced resistance.',
      framingNotes:
        "In this competency's lens, tests whether the resistance you faced was actually evidence of a cross-team pattern, and whether you sequenced adoption deliberately rather than trying to win everyone over in one move — a purely single-team version of this story belongs to a different competency.",
      hssGuidance: {
        contextHint:
          "Establish that the 'old way' wasn't just one team's habit — name the shared root cause behind why multiple teams, or one influential team, were stuck on it.",
        headlineHint: 'Your headline should assert the sequencing choice you made — which team you won over first and why — not just that change eventually happened.',
        behavioralCoreMoments: [
          'How you diagnosed the resistance as a symptom of something structural (a missing process, a shared unstated risk) rather than personal reluctance to change.',
          'The specific first team or proof point you chose to win over, and why that one would make the next team easier to convince.',
          'How the visible success with that first group pulled in whoever came next, and what ripple effects you anticipated before acting.',
        ],
      },
      levelSignal: {
        senior: 'Wins over their own team and one adjacent team using a low-risk pilot or data, converting specific holdouts rather than issuing a mandate.',
        staff:
          'Recognizes the resistance as one symptom of a pattern spanning several teams, and re-sequences the change into a chain of proof points that lands across all of them without needing each team persuaded individually from scratch.',
      },
    },
    {
      id: 'leadership-style',
      category: 'Leadership Style',
      prompt: 'How would you describe your leadership style, or tell me about a time you led without formal authority.',
      framingNotes:
        "In this competency's lens, tests whether your influence produced genuine cross-team alignment around a shared direction, not just a well-argued opinion that won one debate — the trap is a philosophy that sounds good but was never tested against a real multi-team standoff.",
      hssGuidance: {
        contextHint: "Pick a moment where more than one team's direction was genuinely at stake, and where you held no authority over at least one of them.",
        headlineHint: 'Your headline should assert the direction you got multiple teams to align around, and what made them choose to follow it.',
        behavioralCoreMoments: [
          "How you traced the disagreement or divergence back to a shared root cause the involved teams hadn't connected themselves.",
          'The specific influence tactic you used to build genuine buy-in — a working prototype, hard data, a low-risk pilot — rather than leaning on title or persistence.',
          'The systems-level ripple effects you anticipated before committing, and evidence the alignment actually held after you stopped pushing for it.',
        ],
      },
      levelSignal: {
        senior: 'Leads through influence on a specific decision inside their own team plus one neighboring team, stating a clear position instead of a neutral menu of options.',
        staff:
          "Leads through influence across teams that don't report to them at all, aligning them around a direction they choose to follow because the reasoning and the sequencing hold up — not because of positional authority.",
      },
    },
  ],
  keySignals: [
    'Spotting a cross-team problem nobody owns because it lives in the gaps between groups, and tracing it to a shared root cause.',
    'Building a vision concrete enough that other people can actually work toward it, not just agree with it in a meeting.',
    'Sequencing changes deliberately for adoption — who goes first, what proof point unlocks the next team — instead of just announcing them.',
    'Systems thinking: anticipating second- and third-order ripple effects before acting, not discovering them afterward.',
  ],
  redFlags: [
    "Dressing up a team-local improvement as 'strategic' — if it stayed entirely inside your team's boundary, this isn't the right competency for it.",
    "A vision that was proposed but never actually implemented — a proposal by itself isn't leadership.",
    "Driving change through positional authority rather than genuine buy-in from people who didn't have to follow you.",
    'An explanation so complex or jargon-heavy it obscures the strategy instead of clarifying it.',
    "Slapping the word 'strategic' onto ordinary tactical work to make it sound bigger than it was.",
  ],
  reflectionQuestions: [
    'What problem have you noticed that no single team owned, because it lived in the gap between two or more of them?',
    'When did you have to decide which team to bring on board first, knowing the rest of the change depended on that choice landing?',
    'What change did you lead where you had no authority to mandate it, and had to earn buy-in from people who did not report to you?',
    "What ripple effect did you anticipate before acting, that would have caused real damage if you'd missed it?",
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A clear before/after vision and a stated reason it mattered beyond your own team.',
      "Evidence of building consensus across stakeholders you didn't control.",
      'A deliberate sequencing choice — which team or proof point came first, and why.',
      'Systems-level, ripple-effect thinking applied before acting, not discovered afterward.',
      'Hard evidence the change actually stuck, not just that you proposed it.',
    ],
    avoidTheseTraps: [
      "Calling a purely team-local win 'strategic' because it sounds more senior.",
      'Describing a vision that was never actually implemented.',
      'Leaning on title or authority instead of earning genuine buy-in.',
      'Explaining the strategy in terms so dense the actual idea gets lost.',
    ],
  },
};
