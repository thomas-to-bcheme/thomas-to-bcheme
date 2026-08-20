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
        junior:
          'Raises a technical concern to a reviewer or more senior teammate instead of silently going along with it, then implements the agreed approach without still quietly resenting the call.',
        mid: "Disagrees with a design choice on their own feature, backs it with a working prototype or a clear trade-off write-up, and defers to the tech lead's final call without re-litigating it later.",
        senior:
          'Resolves a disagreement with a peer or manager on their own team by making a well-reasoned case once, then commits fully once a decision is made.',
        staff:
          "Resolves a standoff between peers at their own level with no shared manager to appeal to, settling it on the technical and business merits alone.",
        seniorStaff:
          'Reconciles opposing technical approaches held by two staff engineers whose teams both have a legitimate claim, and lands a direction the whole product area commits to.',
        principal:
          'Settles a disagreement over an org-wide technical direction with no single authority who can simply rule on it, using a formal review like an ADR to make the trade-offs and the final call explicit.',
      },
      workedExample: {
        level: 'senior',
        story:
          "I disagreed with my tech lead's choice of a write-through cache for a new endpoint and made the case for write-behind instead, backed by data rather than a preference. I ran a two-day load-test spike showing write-through added 40ms to p99 latency under peak traffic, then walked her through the numbers in a fifteen-minute sync and let her make the final call once she'd seen them. She switched the design, and when a later review questioned the caching strategy, I defended it as the right call on the merits, not just as something I'd pushed for.",
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
        junior:
          'Raises a concern to their manager privately rather than staying silent or venting to peers about it, and executes the final decision fully once it is made.',
        mid: "Pushes back on a decision from their manager or tech lead with a specific technical reason, drops it after one round if the reasoning doesn't land, and executes without visible resentment either way.",
        senior: 'Raises a disagreement once, backed by a clear rationale, and commits fully to executing the decision regardless of which way it goes.',
        staff:
          "Has already built enough credibility with leadership that their pushback gets seriously reconsidered rather than read as insubordination, and knows how to earn that credibility deliberately rather than assuming it.",
        seniorStaff:
          'Times a disagreement with a director- or VP-level decision affecting a whole product area to land before it is locked in rather than after, and rallies the other staff engineers behind whichever direction ultimately wins.',
        principal:
          'Challenges a company-wide bet made by the executive team, accepting the risk of being read as difficult rather than rigorous, and stakes their own credibility on being right rather than simply on being heard.',
      },
      workedExample: {
        level: 'staff',
        story:
          "My director wanted to ship a new onboarding flow two weeks ahead of the original plan to hit a quarterly OKR, but I disagreed because we hadn't load-tested the new signup path. I raised it once in our weekly sync with load numbers from a staging run showing the service degrading past 200 concurrent signups, and asked for one more week rather than escalating past her. She held the original date but agreed to ship behind a feature flag we could kill instantly if latency spiked, and when that flag saved us during a traffic spike on launch day, she started asking me directly for input on the next two launches without my having to volunteer it.",
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
        junior:
          'Accepts feedback on a code review or a missed edge case without getting defensive, and visibly applies it on the very next piece of work rather than just saying "noted."',
        mid: 'Owns a bug they shipped that broke a feature for their own team, writes the fix themselves, and flags the root cause in standup instead of waiting for someone else to notice it.',
        senior:
          "Owns a mistake affecting their own team, changes a specific, nameable behavior, and rebuilds trust through consistency over the following months.",
        staff:
          'Owns a mistake with consequences reaching beyond their own team, surfaces it proactively before being asked, and uses the moment to model psychological safety for people watching how they handle it.',
        seniorStaff:
          'Owns a strategic misstep that cost a whole product area real time or money, names the decision-making flaw that caused it rather than just the outcome, and changes how the whole area makes that class of decision going forward.',
        principal:
          'Owns a company-level failure in front of executives or the board, absorbs the reputational cost publicly rather than letting it land on a more junior person who happened to be in the room, and turns the postmortem into a lasting change to how the org operates.',
      },
      workedExample: {
        level: 'mid',
        story:
          "I shipped a migration script with a missing null-check that silently corrupted about 200 user preference records over a weekend before anyone noticed. I flagged it myself in Monday standup before my manager saw the support tickets, walked through exactly which check I'd skipped and why my test coverage hadn't caught it, and had a fix and a backfill script ready within the hour. I also added a dry-run-against-a-snapshot step to our migration checklist, which caught two similar bugs in the following two months before either one shipped.",
      },
    },
    {
      id: 'building-trust-proactively',
      category: 'Building Trust Before You Need It',
      prompt: 'Tell me about how you earned the trust of a new team or a skeptical stakeholder before you needed to draw on that trust.',
      framingNotes:
        'Tests the proactive half of this competency rather than the reactive half — consistent, low-drama reliability sustained over time, not a single dramatic save under pressure.',
      hssGuidance: {
        contextHint: 'Name specifically who was skeptical of you and why — a new team, a stakeholder burned by a past engineer — not just that trust needed building in the abstract.',
        headlineHint: 'Your headline should assert the deliberate thing you did to build trust, not just that trust eventually developed over time.',
        behavioralCoreMoments: [
          'The specific small commitments you made and kept, visibly, before anyone was watching closely.',
          'A moment you chose transparency over looking good, even when it cost you something in the short term.',
          'The evidence that the trust actually paid off later, when you needed it.',
        ],
      },
      levelSignal: {
        junior:
          'Delivers on small commitments consistently — showing up prepared, hitting deadlines on assigned tickets — so a new team stops double-checking their work within the first few weeks.',
        mid: 'Proactively over-communicates status on their own feature to a team still unfamiliar with their work, surfacing risk early rather than waiting to be asked, until check-ins stop being necessary.',
        senior:
          'Builds credibility with a skeptical stakeholder by being the person who tells them uncomfortable truths early, rather than the person who always brings good news.',
        staff:
          "Earns trust across a team they don't manage by making a visible, no-strings-attached investment in their success first — unblocking their work or sharing hard-won context — well before asking anything of them in return.",
        seniorStaff:
          "Builds trust with other staff engineers and directors across a product area through a track record of calling their own initiatives' failures honestly, not just their wins, so their assessments get taken at face value.",
        principal:
          'Earns trust at the executive level by consistently giving an accurate, unvarnished read on technical risk even when a rosier answer would be easier to hear, so their voice carries weight on decisions no one else in the room can independently verify.',
      },
      workedExample: {
        level: 'staff',
        story:
          "When I joined a project alongside a product lead who'd been burned by two previous eng leads missing dates without warning, I started sending her a Friday risk update every week, whether the news was good or bad, before she ever asked for one. Three weeks in, I flagged that a third-party API dependency was going to slip our launch by a week, well before it became a crisis, and gave her the option to communicate it early rather than finding out from a delay notice. By the time we hit a genuinely hard trade-off two months later, she let me make the call on scope myself without escalating it to her VP first.",
      },
    },
  ],
  keySignals: [
    'Constructive conflict resolution — disagreeing on ideas, not people, and fully supporting the final call even when it was not your preference.',
    'Direct, transparent communication, including surfacing bad news early rather than letting it surface on its own.',
    'Reliability and accountability sustained over time, not just in the one moment being asked about.',
    'Surfacing your own contribution to an incident in the postmortem before being asked, in line with blameless-postmortem norms — owning your part of the timeline without turning the review into blame-assignment.',
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
