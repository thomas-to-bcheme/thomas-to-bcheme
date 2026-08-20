import type { CompetencyChapter } from './types';

export const DEVELOPING_OTHERS: CompetencyChapter = {
  id: 'developing-others',
  chapterNumber: 12,
  title: 'Developing Others',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/developing-others',
  openingHook:
    'The easiest way to help a struggling teammate is to just fix it yourself — this competency exists because that instinct, followed every time, produces a team that never gets any more capable than you are.',
  definition:
    "Building another person's lasting, independent capability — not solving their problem for them. Google puts it plainly: senior engineers \"teach through code review, they don't just approve it.\"",
  keyDistinction: {
    label: 'Developing Others vs. Helping',
    explanation:
      "Helping resolves the immediate problem in front of someone. Developing others builds the capability so the next similar problem doesn't need you at all. A story where you fixed something for a struggling teammate, however generously, is helping — the developing-others version is the one where you stepped back on purpose so they could build the skill themselves.",
  },
  centralTension:
    'Pure efficiency says just answer the question yourself and keep the team moving under deadline pressure. Pure teaching says always build the skill, even when it is slower right now. Good development is matching your approach to how much time is actually available and to how the specific person learns — not defaulting to one mode regardless of context.',
  culturalConsiderations:
    "Companies expect this mainly from senior-and-above candidates — a junior or mid-level engineer can still show an informal version (helping a peer debug, pairing with someone newer), but it becomes a hard requirement once you're being evaluated for staff or principal, where your leverage runs almost entirely through other people's growth rather than your own output. Remote and distributed teams also change the mechanics: without hallway pairing, deliberate written guidance and recorded walkthroughs carry more of the teaching load than they would colocated.",
  relatedCompetencies: [
    {
      id: 'earning-trust-and-conflict',
      relationship: "Trust is the prerequisite for coachability — someone has to trust your intent before they'll accept feedback or direction from you at all.",
    },
    {
      id: 'learning-and-growth',
      relationship: 'Learning builds your own capability; developing others is the separate, outward-facing skill of transferring that capability to someone else.',
    },
    {
      id: 'innovation',
      relationship: 'Innovation creates a new tool or approach; developing others is what makes that new approach stick because other people can actually use it without you.',
    },
  ],
  questionCategories: [
    {
      id: 'supporting-underperformers',
      label: 'Supporting Underperformers',
      exampleQuestion: 'Tell me about helping a struggling team member improve.',
    },
    {
      id: 'helping-people-grow',
      label: 'Helping People Grow',
      exampleQuestion: 'Describe helping someone build a specific technical skill or advance their career.',
    },
    {
      id: 'giving-helpful-feedback',
      label: 'Giving Helpful Feedback',
      exampleQuestion: 'Tell me about a coaching relationship where your feedback actually changed behavior.',
    },
    {
      id: 'cross-functional-development',
      label: 'Cross-Functional Development',
      exampleQuestion: 'Describe helping a non-engineer build technical understanding relevant to their role.',
    },
    {
      id: 'remote-distributed-development',
      label: 'Remote and Distributed Development',
      exampleQuestion: 'How have you developed someone you rarely see in person?',
    },
    {
      id: 'building-stronger-teams',
      label: 'Building Stronger Teams',
      exampleQuestion: 'Describe raising the technical bar across your whole team.',
    },
    {
      id: 'when-it-goes-wrong',
      label: 'When It Goes Wrong',
      exampleQuestion: "Tell me about a time developing someone didn't go as planned, and how you adapted.",
    },
  ],
  sampleQuestions: [
    {
      id: 'mentoring-juniors',
      category: 'Mentoring Junior Engineers',
      prompt: 'Tell me about a time you helped a junior engineer grow. What did you do, and what was the impact?',
      framingNotes:
        'Tests whether you build lasting independent capability or just make yourself useful in the moment — the trap is a story about tasks you did for the mentee, retold as if stepping in was the teaching.',
      hssGuidance: {
        contextHint:
          "Name the specific skill or confidence gap concretely — 'wasn't yet ready for X' — not a vague sense that they needed general help.",
        headlineHint: 'Your headline should assert the capability you set out to build in them, not just that you were supportive.',
        behavioralCoreMoments: [
          "How you deliberately matched your teaching method to where they actually were — pairing, calibrated code review, a stretch assignment — and adjusted when your first approach didn't land.",
          "The specific moment you stepped back on purpose so they'd solve the next version of the problem themselves.",
          'Evidence of independent growth after your involvement decreased — the real signal it was development, not just help.',
        ],
      },
      levelSignal: {
        junior:
          'Helps a peer debug or walks a newer teammate through a piece of code they own, informally and without any mentoring title or relationship behind it.',
        mid: "Takes on an informal mentoring role for one junior teammate inside their own feature area, explaining the reasoning behind a design decision rather than just handing over the fix.",
        senior: 'Invests deliberately in one or two engineers, calibrating in code review and handing over stretch work, then confirms the skill actually transferred by stepping back.',
        staff: 'Builds a mentoring approach that scales past a single relationship, delegating well-understood parts of the work to develop others while personally retaining the highest-risk, least-understood parts.',
        seniorStaff:
          'Shapes how mentoring works across a whole product area, getting other seniors and staff engineers to adopt a consistent calibration approach rather than mentoring individuals directly.',
        principal:
          'Sets the org-level expectation for how junior engineers get grown at all, embedding it into leveling criteria or onboarding structure that outlives any single mentoring relationship.',
      },
      workedExample: {
        level: 'senior',
        story:
          "I turned a junior engineer's dependency on me for code review into independent judgment by narrating my own reasoning instead of leaving 'fix this' comments. For six weeks I paired with them on every PR, explaining the trade-off behind each suggestion rather than dictating the fix, then handed them a stretch ticket outside their comfort zone and stayed hands-off unless asked. They shipped it with two clarifying questions instead of the dozen they'd have needed a quarter earlier, and their review turnaround on other people's PRs got fast enough that I stopped being their team's bottleneck.",
      },
    },
    {
      id: 'mentoring-people-you-dont-manage',
      category: "Developing People You Don't Manage",
      prompt:
        'Tell me about a time you helped someone grow who you had no formal authority over — a peer, someone on another team, or someone more senior than you in title.',
      framingNotes:
        "Tests influence-based development specifically — the trap is a story that's actually about a direct report, or advice given once that was never asked for and changed nothing.",
      hssGuidance: {
        contextHint:
          'Establish plainly that you had no formal authority over this person, and, ideally, that you asked before offering anything rather than volunteering unsolicited advice.',
        headlineHint: 'Your headline should assert what you earned the credibility to teach, and how.',
        behavioralCoreMoments: [
          'How you became useful to them on a real problem before you tried to teach anything — credibility earned, not assumed.',
          'How you translated what you knew into terms that mattered to their role, rather than the terms that were easiest for you to explain.',
          'Evidence the relationship became mutual rather than one-directional, and that the capability stuck after you stopped being involved.',
        ],
      },
      levelSignal: {
        junior:
          'Helps a peer on their own team debug a specific problem when asked, building goodwill through being useful rather than attempting to teach anything unsolicited.',
        mid: 'Offers input to a peer on an adjacent workstream when asked, sharing what worked on their own feature without assuming the peer wants a mentor.',
        senior: 'Builds credibility with one peer or adjacent-team engineer through real help first, then influences their approach on a specific problem without any reporting relationship.',
        staff:
          'Develops people across several teams they have no authority over at all, relying entirely on earned credibility and reusable resources rather than 1:1 time, since staff-level impact runs mostly through people outside their own reporting line.',
        seniorStaff:
          'Shapes how several staff engineers across a product area approach a recurring class of problem, mostly through written guidance and design reviews rather than any single relationship.',
        principal:
          "Shifts how engineers across the org think about a whole practice area, mostly through frameworks or writing that reaches people they'll never work with directly, rather than through any individual relationship at all.",
      },
      workedExample: {
        level: 'staff',
        story:
          "I earned enough credibility across three teams with no reporting relationship to any of them that they started defaulting to my judgment on caching strategy without me pushing it. I picked up an unowned bug on another team's service purely to be useful, then wrote up the root cause and a reusable caching pattern rather than just fixing it and moving on, and shared it in a design review instead of a DM. Two of the three teams adopted the pattern directly, and one of their engineers now teaches it to new hires without me in the room.",
      },
    },
  ],
  keySignals: [
    'Breaking a skill into learnable steps matched to where the person actually is, not a generic curriculum.',
    'Noticing who needs help before they ask for it.',
    'Genuinely adapting your method per person rather than running one style on everyone.',
    'The end state is independence — they can solve the next similar problem without you.',
    "When developing someone you don't manage: asking permission before offering unsolicited advice, since unearned advice usually gets a nod and no behavior change.",
    'Being useful on a real problem first, before trying to teach — credibility has to be earned, not assumed.',
    "Translating for the audience — a PM needs 'two weeks to fix, and it gets slower as usage grows,' not a lecture on the underlying mechanism.",
    'Framing it as mutual, exploratory learning rather than one-way teaching, especially with peers or people senior to you.',
    'Scaling through reusable resources — docs, recordings, guides — that reach further than any amount of 1:1 time.',
  ],
  redFlags: [
    'Giving answers instead of building skill — this creates dependency, not capability.',
    "Teaching a skill disconnected from what the person's real work actually needs.",
    'Running training with no confirmation that capability actually grew afterward.',
    'Taking credit for growth that would have happened naturally anyway.',
    "Hitting a 'Resistance Wall' and pushing harder instead of recognizing trust hasn't been earned yet — the fix is rebuilding it through low-stakes helpfulness, not repeating yourself louder.",
    "Falling into a 'Dependency Trap' where the same person keeps returning with the same question — the fix is shifting from answers to frameworks, asking 'what's your hypothesis?' instead of supplying one.",
    "An 'Over-Investment Spiral' — sinking disproportionate time into one person at the expense of everyone else on the team.",
    "A 'Style Mismatch' — continuing to use your own default teaching method after it's clearly not landing, instead of asking how the person actually learns or handing off to someone else.",
  ],
  reflectionQuestions: [
    'Who have you helped move from struggling to independent, and how do you know the independence part actually happened?',
    'When did you deliberately step back from a problem so someone else could solve the next one themselves?',
    'Who have you developed with no formal authority over them at all — a peer, someone on another team, someone more senior?',
    'When did your usual way of teaching someone not land, and what did you do differently once you noticed?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'Someone moving visibly from struggling to independent, not just from struggling to helped.',
      'Evidence you adapted your method to the individual rather than running one style on everyone.',
      'A visible progression over time, not a single instance of help.',
      'Ideally, a reusable resource or system you built so the impact scaled past a single 1:1 relationship.',
    ],
    avoidTheseTraps: [
      'Describing tasks you did for the person instead of skill you built in them.',
      "Vague claims of being 'supportive' with no specific capability named.",
      'No evidence the person could handle the next similar problem without you.',
      'Taking credit for growth that would have happened without your involvement.',
    ],
  },
};
