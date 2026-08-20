import type { CompetencyChapter } from './types';

export const LEARNING_AND_GROWTH: CompetencyChapter = {
  id: 'learning-and-growth',
  chapterNumber: 9,
  title: 'Learning and Growth',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/learning-and-growth',
  openingHook:
    'Everyone can point to something they learned last year — the harder question is what they can now do that they could not do before, because that gap is the whole competency.',
  definition:
    'Learning is building a new skill or piece of knowledge. Growth is what happens when you actually put that knowledge to use — shipping, fixing, or building something you genuinely could not have before. Learning expands what one person knows; growth is what turns that into something the person and their team can actually accomplish.',
  keyDistinction: {
    label: 'Conceptual Models vs. Tool Syntax',
    explanation:
      'A conceptual model — for example, the general mental model behind debugging: set a breakpoint, inspect state, step through execution — transfers across specific languages, tools, and jobs. Memorized syntax for one particular tool does not survive that tool being replaced. The compounding asset worth building is the transferable model, not the tool-specific trivia layered on top of it.',
  },
  centralTension:
    'The useful shelf life of any specific skill keeps shrinking, so the real meta-skill is judgment about where to go deep versus where to stay broad. Too narrow a focus and you lose versatility as the landscape shifts under you; too broad and you never build the real expertise that makes you valuable on anything specific. The judgment call is prioritizing depth where it creates lasting value, not just wherever happens to be interesting this month.',
  culturalConsiderations:
    'At a fast-moving startup, learning mostly happens live, on the job, under deadline pressure, with no formal ramp-up period or training budget to lean on. At a large or process-heavy company, structured learning paths and mentorship programs exist, but the bar shifts to showing self-directed learning that happens outside those official channels, not just completing them. In research-oriented organizations, sustained depth in a narrow area is rewarded over broad familiarity; in generalist, agency, or early-stage environments, the reverse is usually true, and breadth is the more valuable trait.',
  relatedCompetencies: [
    {
      id: 'innovation',
      relationship:
        'A conceptual model built while learning often becomes the seed of an Innovation story later, once you apply it somewhere nobody had tried it before.',
    },
    {
      id: 'developing-others',
      relationship:
        'Learning builds your own capability; Developing Others is the mirror skill of deliberately transferring that capability outward to someone else.',
    },
  ],
  questionCategories: [
    {
      id: 'learning-that-didnt-go-as-planned',
      label: "Learning That Didn't Go as Planned",
      exampleQuestion: 'Tell me about a time you underestimated how long it would take to learn something you needed.',
    },
    {
      id: 'learning-new-tech-under-pressure',
      label: 'Learning New Technology Under Pressure',
      exampleQuestion: "How did you get up to speed on an unfamiliar tool your team hadn't used before?",
    },
    {
      id: 'recognizing-knowledge-gaps',
      label: 'Recognizing Knowledge Gaps',
      exampleQuestion: 'Tell me about identifying a gap in your own understanding and addressing it.',
    },
    {
      id: 'teaching-knowledge-sharing',
      label: 'Teaching and Knowledge-Sharing',
      exampleQuestion: 'Describe creating a learning resource or teaching a concept to someone else.',
    },
    {
      id: 'learning-from-setbacks',
      label: 'Learning From Setbacks',
      exampleQuestion: 'Describe a time your initial understanding of a problem turned out to be wrong.',
    },
    {
      id: 'continuous-improvement',
      label: 'Continuous Improvement',
      exampleQuestion: 'How do you keep your skills current?',
    },
  ],
  sampleQuestions: [
    {
      id: 'ramping-up-under-pressure',
      category: 'Learning New Technology Under Pressure',
      prompt: "Tell me about a time you had to get up to speed on an unfamiliar technology your team hadn't used before, under a real time constraint.",
      framingNotes:
        'Tests learning velocity — choosing the minimum viable knowledge needed to start contributing safely, rather than exhaustive mastery before touching the problem.',
      hssGuidance: {
        contextHint: 'Name the specific gap between what you knew and what the task required, and the deadline pressure you were under.',
        headlineHint: 'Your headline should assert what you decided was the minimum you needed to know before starting, and why.',
        behavioralCoreMoments: [
          'How you scoped what to learn first versus what to defer until it actually mattered.',
          'A moment you learned by building or testing something small, not just by reading documentation.',
          'What you actually shipped despite incomplete mastery of the technology, and how you closed remaining gaps afterward.',
        ],
      },
      levelSignal: {
        junior:
          'Learns just enough of an unfamiliar tool to complete their own assigned task, leaning on documentation and a reviewer to catch what they missed rather than filling every gap solo.',
        mid: 'Ramps up on an unfamiliar technology independently to ship their own feature, without a mentor walking them through each step, and closes remaining gaps as real problems surface.',
        senior:
          'Gets a feature to a working state on an unfamiliar stack by learning just enough to be productive quickly, then filling in gaps as real problems surface.',
        staff:
          'Builds a transferable mental model of the new technology fast enough to also unblock teammates ramping up alongside them, not just themselves.',
        seniorStaff:
          'Ramps up fast enough to set the adoption pattern and guardrails other teams use when picking up the same unfamiliar technology, rather than leaving each team to rediscover the same pitfalls.',
        principal:
          'Ramps up on an emerging technology fast enough to make the org-level call on whether to adopt it at all, and the evaluation framework built along the way becomes how the org vets new technology going forward.',
      },
      workedExample: {
        level: 'staff',
        story:
          "When our team inherited a Kafka-based pipeline two weeks before a deadline, I got it into a working state by learning just enough to ship safely, then turned that mental model into a runbook so three teammates ramping alongside me didn't each have to relearn it from scratch. I skipped the official certification path and instead traced one message end-to-end through the actual codebase, then paired with a teammate to test failure modes before writing anything down. We shipped the migration on schedule, and the runbook became the team's reference every time someone new touched the pipeline afterward.",
      },
    },
    {
      id: 'teaching-a-concept-to-others',
      category: 'Teaching and Knowledge-Sharing',
      prompt: 'Describe a time you built a learning resource or taught a technical concept to someone else on your team.',
      framingNotes:
        'Tests whether learning stayed solo or actually got transferred outward — a reasonable proxy for whether you understood the concept well enough to explain it simply.',
      hssGuidance: {
        contextHint: 'Name who needed the knowledge and why it mattered that they get it from you specifically, rather than from documentation alone.',
        headlineHint: 'Your headline should assert what you built or taught, not just that you "helped someone understand something."',
        behavioralCoreMoments: [
          'How you translated a technical concept for the specific audience you were teaching.',
          'Whether the teaching stayed a one-off conversation or became a reusable resource others could return to.',
          "Evidence the other person's capability actually changed afterward, not just that the conversation happened.",
        ],
      },
      levelSignal: {
        junior:
          'Teaches a peer by walking them through what they just learned in a single conversation, focused on unblocking that one person on the task in front of them.',
        mid: "Writes up what they learned — a short doc, a code comment, a quick demo — so a teammate working on the same feature doesn't have to rediscover it independently.",
        senior: 'Teaches a concept effectively enough that one teammate can independently apply it without further help.',
        staff:
          'Builds a resource — a document, a workshop, a shared framework — that scales the teaching past any single one-on-one conversation.',
        seniorStaff:
          'Builds teaching that spreads a shared mental model across a whole product area, so multiple teams reason about the concept the same way instead of each developing their own incompatible version.',
        principal:
          'Creates a teaching artifact or framework that becomes how the org onboards engineers to the concept going forward, outliving any single team, workshop, or the person who originally wrote it.',
      },
      workedExample: {
        level: 'mid',
        story:
          "After spending a week untangling how our feature-flag rollout logic actually worked, I wrote it up as a short doc with a diagram instead of just explaining it once to the teammate who'd asked, since I owned that part of the codebase myself. I mapped the three states a flag could be in and the real decision path between them, then walked that teammate through it directly so they could apply it to their own change without me. They shipped their change without pinging me again, and two other engineers found the doc on their own before it went stale.",
      },
    },
  ],
  keySignals: [
    'Building conceptual models that transfer across tools and jobs, not just facts memorized for one context.',
    'Learning velocity — choosing the minimum viable knowledge needed to start contributing, rather than trying to learn everything first.',
    'Strategic learning choices tied to real, near-term impact rather than pure curiosity.',
    'Learning through practice — building something concrete to test and cement understanding.',
  ],
  redFlags: [
    'Describing courses or reading with no applied outcome afterward — collecting information rather than building real capability.',
    'Only learning when forced to by circumstance, never anticipating a gap ahead of time.',
    'Learning entirely solo with no knowledge transfer to anyone else, quietly creating a silo.',
    'Random, unstrategic skill collection with no throughline connecting it to actual impact.',
  ],
  reflectionQuestions: [
    "What's something you learned recently specifically because a real problem required it, not just because it seemed interesting?",
    'What have you taught someone else that they can now do entirely without you?',
    'When did your initial understanding of a problem turn out to be wrong, and what changed once you corrected it?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A learning goal connected to a real team or organizational need.',
      'Persistence past the initial period of confusion, not just the moment things clicked.',
      'Evidence you shared what you learned with someone else.',
      'Something concrete you actually built or shipped using the new knowledge.',
    ],
    avoidTheseTraps: [
      'Treating a course or certification as the whole story with no applied outcome afterward.',
      'Only learning reactively, when forced to by a deadline or a failure.',
      'Keeping the knowledge siloed instead of transferring it to teammates.',
      'Collecting unrelated skills with no throughline tied to real impact.',
    ],
  },
};
