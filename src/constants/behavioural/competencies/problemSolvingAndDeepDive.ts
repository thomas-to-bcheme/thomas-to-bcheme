import type { CompetencyChapter } from './types';

export const PROBLEM_SOLVING_AND_DEEP_DIVE: CompetencyChapter = {
  id: 'problem-solving-and-deep-dive',
  chapterNumber: 7,
  title: 'Problem Solving and Deep Dive',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/problem-solving-and-deep-dive',
  openingHook:
    'A quick fix that makes the symptom disappear feels like problem solving in the moment — this competency is about whether you went far enough to make sure the same problem does not just come back next month.',
  definition:
    'Methodically finding the root cause of a problem rather than stopping at its symptom — digging deep enough that the same class of issue does not keep recurring, in the spirit of Datadog\'s "solve problems once" and Twilio\'s "draw the owl."',
  keyDistinction: {
    label: 'Symptom Fix vs. Root Cause',
    explanation:
      'Making the immediate pain go away — a restart, a rollback, a manual patch — is not the same as understanding why it broke. Problem Solving is specifically the deep dive that closes the gap between "it works now" and "it will not happen again."',
  },
  centralTension:
    'Investigating everything exhaustively risks analysis paralysis on problems that do not warrant it; patching everything quickly risks the same class of failure recurring indefinitely. Good judgment means triaging how deep to investigate based on impact and likelihood of recurrence, and knowing when to bring in help rather than keep digging alone.',
  culturalConsiderations:
    'Teams differ in how much investigation depth they reward: some orgs prize fast mitigation above all and treat a deep root-cause writeup as a follow-up task, while others (especially ones running critical infrastructure) expect the root cause to be found before the incident is considered closed. Calibrate how much investigative depth to describe to what the target team actually values, not to an abstract standard of thoroughness. Some orgs make that bar concrete with SLOs and error budgets: while an incident\'s impact stays within budget, further digging is a choice, but breaching it triggers a mandatory root-cause review — naming that mechanism, if you know your target org uses it, shows you understand why the depth bar moves.',
  namedCompanyValues: [
    { company: 'Datadog', value: 'Solve Problems Once' },
    { company: 'Twilio', value: 'Draw the Owl' },
  ],
  relatedCompetencies: [
    {
      id: 'delivery',
      relationship: 'The obstacle you diagnosed here is often the same blocker a Delivery story would frame around the deadline pressure instead.',
    },
    {
      id: 'taking-initiative',
      relationship: 'Noticing a problem before anyone assigned you to look is Initiative; the methodical dig that follows is this competency.',
    },
  ],
  questionCategories: [
    {
      id: 'investigation-methods',
      label: 'Investigation Methods',
      exampleQuestion: 'Walk me through how you approach debugging when the cause is not obvious.',
    },
    {
      id: 'finding-root-causes',
      label: 'Finding Root Causes',
      exampleQuestion: 'Tell me about a time the real problem turned out to be different from what it first looked like.',
    },
    {
      id: 'testing-and-validating-theories',
      label: 'Testing and Validating Theories',
      exampleQuestion: 'Describe a time your initial theory about the cause was wrong, and how you adjusted.',
    },
    {
      id: 'cross-system-problem-solving',
      label: 'Cross-System Problem Solving',
      exampleQuestion: "Tell me about debugging an issue that crossed team boundaries, where you didn't own every component involved.",
    },
  ],
  sampleQuestions: [
    {
      id: 'hardest-technical-problem',
      category: 'The Hardest Technical Problem You\'ve Solved',
      prompt: 'Tell me about the hardest technical problem you have solved. Walk me through how you investigated it.',
      framingNotes:
        'This same prompt is also commonly asked as the Essential Questions\' "tell me about a challenging project" (Q2) — that version rewards a broad picture of scope, ambiguity, and overall difficulty. This chapter\'s version should instead lean specifically into the diagnostic methodology: how you narrowed from symptom to root cause, what you ruled out and why, and when you decided to ask for help rather than keep digging alone.',
      hssGuidance: {
        contextHint: 'State the symptom exactly as it first presented — the confusing or misleading form the problem initially took, before you knew the real cause.',
        headlineHint: 'Your headline should assert the root cause you eventually found, in contrast with what it looked like at first.',
        behavioralCoreMoments: [
          'The hypotheses you formed and, critically, how you tested and ruled each one out rather than guessing your way through.',
          'The moment the investigation diverged from the obvious suspect toward the actual root cause.',
          'Whether and when you brought in someone else, and what that decision signals about your judgment rather than your limits.',
          'What you built or documented afterward so the same class of problem is easier to catch next time.',
        ],
      },
      levelSignal: {
        junior: 'Debugs a problem inside a single component they own, following a checklist or reproducing the failure under a mentor\'s guidance rather than independently generating hypotheses about the wider system.',
        mid: 'Independently forms and tests hypotheses about a bug scoped to a feature they own end-to-end, ruling out causes systematically without needing someone else to point them at the right subsystem.',
        senior: 'Runs a structured, repeatable investigation on a problem within their own system and lands on the true root cause rather than a symptom-level fix.',
        staff: 'Runs the investigation across a problem that spans systems or teams they do not fully own, and converts the finding into durable shared knowledge — a runbook, a monitor, a documented failure mode — that outlives the individual incident.',
        seniorStaff: 'Recognizes that the same class of root cause has now bitten multiple teams across a product area and drives the fix — a shared diagnostic tool, a standard, a changed default — that closes the gap for everyone, not just the team that hit it first.',
        principal: 'Notices the investigation itself was harder than it needed to be because the org lacks a shared diagnostic practice, and establishes the tooling or discipline that changes how every team in the company investigates hard problems going forward.',
      },
      workedExample: {
        level: 'staff',
        story:
          'I found that a shared library\'s connection-pool default — not any one team\'s code — was causing intermittent latency spikes that three teams had each separately "fixed" with a restart for months. I traced the pattern across teams\' incident logs, confirmed the hypothesis with a load test before touching production, then changed the library\'s default and published a runbook so the fix applied everywhere the library was used, not just my own service. The failure mode has not recurred on any of the three teams since.',
      },
    },
    {
      id: 'cross-system-debugging',
      category: 'Debugging Across Team or System Boundaries',
      prompt: 'Tell me about a bug or outage where the root cause turned out to live in a system or team you did not own.',
      framingNotes:
        'Tests whether you can drive an investigation to conclusion without full context or authority over every component — the trap is a story that stays entirely within your own codebase and never actually tests cross-boundary judgment.',
      hssGuidance: {
        contextHint: 'Make clear, early, which parts of the system were outside your ownership or expertise — that gap is the premise of the story.',
        headlineHint: 'Your headline should assert how you narrowed the problem down to the other team\'s system despite not owning it.',
        behavioralCoreMoments: [
          'How you gathered evidence to rule your own system in or out first, before pulling in the other team.',
          'How you engaged the owning team — what you brought them versus what you asked them to investigate themselves.',
          'The resolution and what changed afterward, for either team, to reduce the odds of recurrence.',
        ],
      },
      levelSignal: {
        junior: 'Notices the symptom sits outside their own component and escalates to a mentor or lead rather than attempting to trace across the boundary themselves.',
        mid: 'Traces the problem to the edge of their own system with a clear, reproducible handoff — logs, a minimal repro, a timeline — even without driving the other team\'s side of the investigation.',
        senior: 'Drives a cross-boundary investigation to a clear conclusion by working effectively with the owning team, without needing authority over their system.',
        staff: 'Recognizes a pattern of recurring cross-boundary failures and pushes for a structural fix — shared tooling, a clearer ownership boundary, or a new escalation path — that prevents the next several incidents of the same shape.',
        seniorStaff: 'Establishes a shared incident-ownership protocol across a product area so cross-boundary investigations no longer stall at the outset on whose problem it actually is.',
        principal: 'Changes how the whole org defines system-ownership boundaries and incident command, so cross-boundary investigations converge faster company-wide rather than depending on which individuals happen to know each other.',
      },
      workedExample: {
        level: 'senior',
        story:
          'Our checkout service started timing out under normal load, and the obvious suspicion was our own connection handling since that\'s where the symptom surfaced. I ruled that out with metrics showing our thread pool was idle, then traced the delay upstream to a shared message queue owned by the platform team, whose consumer lag had spiked after an unrelated deploy. I brought them a reproducible timeline and the queue metrics instead of just an alert, which let them confirm the regression within the hour. We also agreed on a queue-depth alert that pages their team directly next time, instead of surfacing as a mystery timeout on ours.',
      },
    },
  ],
  keySignals: [
    'A methodical, repeatable investigation process — isolate variables, form a hypothesis, test it — rather than trial and error.',
    'Explicitly distinguishing symptom from root cause — the "5 Whys" technique (asking why repeatedly until you hit a systemic cause, not a proximate one) is one concrete way to demonstrate this.',
    'Recognizing when to ask for help versus keep digging solo, treated as a maturity signal rather than a weakness.',
    'Turning the investigation into durable team knowledge — a runbook, a tool, a shared mental model — not just a closed ticket.',
    'For teams running ML systems, applying that same instinct to sort a failure into the right bucket — a data problem, a code bug, or model/data drift — rather than treating "the model is wrong" as one undifferentiated root cause.',
  ],
  redFlags: [
    '"I tried X, then Y, then Z" with no reasoning chain connecting the steps — random troubleshooting rather than investigation.',
    'Stopping at "I restarted it and it worked" with no explanation of why it actually broke.',
    'Deep technical detail with no stated business or user impact.',
    'Investigating indefinitely without ever reaching an actionable conclusion.',
    'Explaining an incident by blaming a person or team ("someone forgot to...") instead of the process or system gap that let it happen — the opposite of the blameless-postmortem framing interviewers expect.',
  ],
  reflectionQuestions: [
    'What bug took you the longest to actually understand, not just to make disappear?',
    'When did your first theory about a problem turn out to be wrong?',
    'What have you investigated that you later turned into a runbook, tool, or shared knowledge for your team?',
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      'A clear investigation methodology, not a lucky guess.',
      'The specific moment symptom and cause diverged.',
      'Judgment about how much investigation was "enough" before shipping a fix.',
      'What you built afterward so others benefit from what you learned.',
    ],
    avoidTheseTraps: [
      'A list of things you tried with no reasoning for why, in order.',
      'Stopping at what fixed it instead of explaining why it broke.',
      'All technical depth, no stated impact.',
      'Endless investigation with no conclusion to point to.',
    ],
  },
};
