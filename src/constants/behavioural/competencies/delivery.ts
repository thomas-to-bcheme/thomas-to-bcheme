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
        junior: 'Flags to their lead when new requests get added on top of an assigned task, rather than silently absorbing the extra work into their own estimate.',
        mid: "Owns the scope of their own feature end-to-end and renegotiates newly added requests directly with whoever is asking, without needing a lead to step in.",
        senior: 'Recognizes creeping scope on their own project and renegotiates it directly with the requester before it threatens the deadline.',
        staff: 'Recognizes scope creep as a symptom of a missing prioritization process across a program, and establishes a lightweight mechanism the team reuses on future projects.',
        seniorStaff: 'Recognizes scope creep as a recurring failure mode across a whole product area and puts a scoping or intake discipline in place that multiple staff engineers and their teams adopt.',
        principal: 'Establishes an org-wide scoping or change-control norm for how new requests get weighed against a committed deadline, one other divisions adopt as their default rather than a one-off fix for a single program.',
      },
      workedExample: {
        level: 'senior',
        story:
          "I kept our onboarding launch on schedule by renegotiating which of five new integration requests actually needed to ship on day one, instead of absorbing all of them into the same deadline. When the integration count grew from three to eight two weeks before launch, I ranked each addition against what the public launch date actually required, then took that ranking to the requester and got sign-off to defer the two lowest-risk integrations by two weeks. We hit the original launch date with everything that mattered, and the deferred two shipped cleanly two weeks later with no incident.",
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
        junior: 'Flags to their lead when two assigned tasks have competing deadlines, rather than silently trying to do both in parallel and risking both slipping.',
        mid: "Independently prioritizes between two competing deadlines within their own feature's scope, ranking by impact, without waiting for a lead to make the call.",
        senior: 'Prioritizes between two of their own competing deadlines using clear impact reasoning, and communicates the trade-off proactively.',
        staff: 'Prioritizes across deadlines owned by multiple teams, aligning stakeholders on shared criteria so the trade-off does not need to be re-litigated each time it recurs.',
        seniorStaff: "Establishes the prioritization framework a whole product area's teams use to rank competing deadlines against each other, so staff engineers across multiple teams apply the same criteria instead of renegotiating it from scratch each time.",
        principal: 'Sets an org-wide standard for how competing deadlines get triaged against business priority, one multiple divisions adopt as their default rather than resolving each conflict ad hoc at the top.',
      },
      workedExample: {
        level: 'staff',
        story:
          "I was staffed on two independent efforts — a payments migration due in three weeks and a compliance fix due in two — and neither team lead knew the other deadline existed until I flagged it. I ranked the two by blast radius: the compliance fix blocked a hard regulatory deadline, while the payments migration had two weeks of buffer built into its target date. I proposed leading the compliance fix myself for two weeks and handing the payments migration's implementation to a teammate I paired in on the codebase for a single afternoon. The compliance fix shipped on the regulatory deadline, and the payments migration landed four days after its original date with no missed downstream commitments.",
      },
    },
    {
      id: 'managing-delivery-expectations-upward',
      category: 'Managing Delivery Expectations',
      prompt: 'Tell me about a time you had to communicate a delivery risk or likely delay to leadership or stakeholders.',
      framingNotes:
        'Tests whether you surface risk proactively, with enough lead time for a decision to still be made, rather than whether you delivered bad news gracefully after the deadline was already unrecoverable.',
      hssGuidance: {
        contextHint: 'State how far out from the deadline you were when you first recognized delivery was genuinely at risk — the lead time you gave is the whole point.',
        headlineHint: 'Your headline should assert the risk you surfaced and the option or recommendation you brought with it, not just that you told someone about a delay.',
        behavioralCoreMoments: [
          'The specific signal that told you the deadline was genuinely at risk, not just tight.',
          'How you framed the risk to leadership — with options or a recommendation, not just a warning.',
          'What leadership decided, and the confirmed outcome versus the original date.',
        ],
      },
      levelSignal: {
        junior: "Tells their lead as soon as they suspect their piece of a deadline is slipping, rather than waiting until the day it's due to say something.",
        mid: "Proactively tells their own feature's stakeholders about a likely delay as soon as they see it coming, along with the cause, without waiting to be asked for a status update.",
        senior: 'Surfaces a delivery risk to leadership early enough that a decision can still be made, and brings a recommendation or options rather than just a warning.',
        staff: "Surfaces a delivery risk that spans multiple teams to leadership, first aligning the affected team leads on one shared framing so leadership isn't hearing conflicting versions of the same risk.",
        seniorStaff: 'Manages delivery-risk communication for a whole product area\'s roadmap, setting the norm for how far in advance leadership across the division expects to hear about a likely slip.',
        principal: 'Establishes how the org communicates delivery risk to executive leadership in the first place, changing an expectation multiple divisions now operate under rather than just handling one escalation well.',
      },
      workedExample: {
        level: 'senior',
        story:
          "Six weeks into a twelve-week migration, I extrapolated our first three sprints' actual velocity and saw we were tracking to land three weeks late. I brought that projection to my director along with two options — cut the migration's least-used legacy format from scope, or push the date by three weeks — six weeks before the original deadline, instead of waiting to see if we'd somehow catch up. Leadership chose to cut scope, and the migration shipped on the original date, with the deferred format following four weeks later as a separate, lower-priority release.",
      },
    },
  ],
  keySignals: [
    'Shipping despite obstacles or changing plans — blockers slow the work down, they do not stop it.',
    'Making smart trade-offs: protecting what is critical, deliberately dropping nice-to-haves.',
    'Maintaining momentum by catching issues early, so stakeholders are never surprised at the deadline.',
    'Citing delivery health in concrete terms — a before/after in deployment frequency, lead time for changes, change failure rate, or mean time to recovery (the DORA metrics) — instead of a vague sense that shipping felt smoother.',
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
