/**
 * Behavioural interview reference data.
 *
 * Two datasets power the /behavioural page:
 *  - STAR_FRAMEWORK: the generic 4-step Situation/Task/Action/Result method,
 *    rendered once via the shared <FrameworkStepList /> component.
 *  - BEHAVIOURAL_QUESTION_CATEGORIES: recurring behavioural-question
 *    archetypes, each with framing notes (how to approach the category
 *    *before* reaching for STAR) and STAR-specific guidance for that
 *    archetype, rendered as accordion cards.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export const STAR_FRAMEWORK: FrameworkStep[] = [
  {
    id: 'star-situation',
    marker: 'S',
    label: 'Situation',
    description:
      'Set the scene in a few sentences — the context, team, and constraints the interviewer needs before your actions make sense. Keep it tight; this is scaffolding, not the story.',
    detail: [
      'What was the context, team, and timeframe?',
      'Who else was involved, and what was their stake in the outcome?',
      'What constraint or pressure made this situation worth telling?',
    ],
  },
  {
    id: 'star-task',
    marker: 'T',
    label: 'Task',
    description:
      'Name the specific responsibility or goal that was yours — not the team’s, not the company’s. This is where you clarify what "done" would have looked like.',
    detail: [
      'What was explicitly your responsibility versus the team’s?',
      'What was the goal, deadline, or definition of success?',
      'What made this task non-trivial — why couldn’t you just wing it?',
    ],
  },
  {
    id: 'star-action',
    marker: 'A',
    label: 'Action',
    description:
      'Walk through the specific, deliberate steps you took. This is the part interviewers weight most heavily, since it reveals judgment, not just outcome.',
    detail: [
      'What did you personally do, step by step, in first person?',
      'What alternatives did you consider and reject, and why?',
      'How did you bring others along or handle pushback along the way?',
    ],
  },
  {
    id: 'star-result',
    marker: 'R',
    label: 'Result',
    description:
      'Close with the measurable outcome and, ideally, what changed in how you work afterward. A result without a lesson reads as luck, not skill.',
    detail: [
      'What was the quantifiable or observable outcome?',
      'How did you know it worked — what signal confirmed it?',
      'What would you do differently, or what did this permanently change?',
    ],
  },
];

export interface StarGuidance {
  situation: string;
  task: string;
  action: string;
  result: string;
}

/**
 * Senior vs. staff framing for a single category — used by the per-category
 * cards below, which intentionally stay a two-point contrast (senior vs.
 * staff) rather than the full ladder, to keep each card scannable.
 */
export interface LevelSignal {
  senior: string;
  staff: string;
}

/**
 * The full career ladder the general framework section walks through —
 * ordered Junior → Principal. Array order (not object key order) drives
 * render order everywhere this is consumed.
 */
export type CareerLevelId = 'junior' | 'mid' | 'senior' | 'staff' | 'seniorStaff' | 'principal';

export interface CareerLevelMeta {
  id: CareerLevelId;
  label: string;
  summary: string;
}

export const CAREER_LEVELS: CareerLevelMeta[] = [
  {
    id: 'junior',
    label: 'Junior',
    summary: '0–2 years — executes well-defined tasks with close guidance and review.',
  },
  {
    id: 'mid',
    label: 'Mid-Level',
    summary: 'Owns a feature end-to-end within a defined scope, with minimal day-to-day guidance.',
  },
  {
    id: 'senior',
    label: 'Senior',
    summary: 'Leads efforts spanning a full team and is starting to shape how a neighboring team works.',
  },
  {
    id: 'staff',
    label: 'Staff',
    summary: 'Sets technical direction across multiple teams and is the default person consulted on cross-team trade-offs.',
  },
  {
    id: 'seniorStaff',
    label: 'Senior Staff',
    summary: 'Shapes technical strategy for a whole product area — other staff engineers look to them for direction.',
  },
  {
    id: 'principal',
    label: 'Principal',
    summary: 'Sets technical direction at the organization level — decisions here reshape how large parts of the company build.',
  },
];

export interface LevelDimension {
  id: string;
  dimension: string;
  byLevel: Record<CareerLevelId, string>;
}

/**
 * The general level-signaling lens, rendered once by SeniorVsStaffSection
 * before the per-category cards apply a senior/staff slice of it 6 more
 * times. Synthesized from Hello Interview's Signal Areas (scope, ownership,
 * ambiguity) and ByteByteGo's Scope/Contribution/Impact/Difficulty rubric —
 * paraphrased, not quoted, into this site's own coaching voice, and
 * extrapolated across the full Junior→Principal ladder rather than just
 * the senior/staff/principal band those sources cover directly.
 */
export const LEVEL_DIMENSIONS: LevelDimension[] = [
  {
    id: 'scope',
    dimension: 'Scope — who else was affected',
    byLevel: {
      junior:
        'Your work affects a task or component you own; teammates review it, but its blast radius stays inside your own piece of the codebase.',
      mid: 'Your work affects a feature or workstream inside your team — others depend on what you build, but the team owns the surrounding context for you.',
      senior:
        "The story's effect stops mostly at your own team, though you're starting to shape how at least one neighboring team operates too.",
      staff:
        "The story's effect reaches two or more teams — the decision or initiative you drove changed how multiple teams work, not just your own.",
      seniorStaff:
        "The story's effect reaches a whole product area or division — multiple staff engineers and their teams are now operating inside a direction you set.",
      principal:
        "The story's effect reaches across the org — it changed an assumption, platform, or practice that many divisions build on, not just one.",
    },
  },
  {
    id: 'contribution',
    dimension: 'Contribution — what you actually did',
    byLevel: {
      junior:
        'You implemented a well-specified piece of a larger design, asking clarifying questions when the spec was incomplete.',
      mid: 'You owned the design and delivery of a feature yourself, making the day-to-day calls without needing sign-off on every step.',
      senior:
        'You led work that required coordinating other people, and kept it moving even while the requirements were still being worked out.',
      staff:
        "You led work that crossed team boundaries and set the technical direction yourself, in a situation where the right approach wasn't obvious to anyone at the outset — including you.",
      seniorStaff:
        "You set the technical strategy other staff engineers execute against, and you're the one who decides which of several plausible directions the division actually takes.",
      principal:
        "You created a capability, standard, or platform that didn't exist before, and that other teams now build on as a foundation rather than a task the org happened to check off.",
    },
  },
  {
    id: 'impact',
    dimension: 'Impact — what changed because of it',
    byLevel: {
      junior:
        'Your change shipped correctly and did what the ticket asked — the win is that it worked, on time, without breaking anything else.',
      mid: "Your feature changed a team-level metric or workflow that your own team would recognize as a real improvement.",
      senior:
        'The result you point to extends past a pure engineering metric into a product or team outcome someone outside engineering would recognize as real progress.',
      staff:
        'The result you point to is tied to a business metric — revenue, time-to-market, retention — that would matter to someone well outside your own team.',
      seniorStaff:
        'The result reshaped how a whole division measures success — the metric itself, or the strategy behind it, changed because of what you did.',
      principal:
        "The result is something the company points to when explaining its strategy externally — it changed what's possible at a scale beyond any one division.",
    },
  },
  {
    id: 'difficulty',
    dimension: 'Difficulty — what made it hard',
    byLevel: {
      junior:
        'The hardest part was learning the codebase and conventions well enough to implement the spec correctly.',
      mid: 'The hardest part was a design decision scoped entirely to your own feature, with a fairly clear — if not trivial — right answer once you dug in.',
      senior: "The hardest part of the story is an architectural trade-off scoped to your own team's system.",
      staff:
        'The hardest part of the story is reconciling competing trade-offs held by multiple teams at once — the difficulty is organizational as much as it is technical.',
      seniorStaff:
        'The hardest part was choosing between multiple defensible strategic directions for a whole division, each with real champions and real costs, with no clean answer.',
      principal:
        'The hardest part was a trade-off with no local optimum — any choice meaningfully disadvantages some part of the org, and the job is choosing well anyway and owning that call.',
    },
  },
];

/**
 * Merges Hello Interview's "We Disease" / concrete-over-vague coaching with
 * ByteByteGo's story red-flag checklist — the failure modes that undercut a
 * level signal regardless of which archetype the story belongs to.
 */
export const LEVEL_PITFALLS: string[] = [
  'Narrating what "we" did throughout the story without ever stating what you personally did — if an interviewer can\'t isolate your contribution, they can\'t credit it.',
  "Telling a story that's really about completing an assigned task well, when the question was asked to find leadership, ownership, or judgment.",
  'Describing impact in vague terms ("things got better," "the team was more efficient") instead of a number, a before/after, or a concrete signal that confirms it actually worked.',
  'Spending most of the story on how hard the work was without ever landing on what it produced — difficulty without payoff reads as a struggle, not a win.',
  "Describing a scope or role bigger than the one you'd actually defend under a specific follow-up question — overstated scope collapses the moment it's tested.",
  'Presenting a neutral menu of options you considered instead of the decision you actually made and defended — indecision reads as diplomacy but scores as a missing signal.',
];

/**
 * To add another category: append its id to this union, then append a
 * matching entry — including a levelSignal — to
 * BEHAVIOURAL_QUESTION_CATEGORIES below. To add another framework dimension
 * or pitfall, append to LEVEL_DIMENSIONS / LEVEL_PITFALLS. No other file
 * needs to change — BehaviouralCategoryCard and the page render generically
 * off these arrays, and PageSectionNav items are keyed by id in page.tsx.
 */
export type BehaviouralCategoryId =
  | 'resistance-to-change'
  | 'scope-creep'
  | 'conflict-resolution'
  | 'navigating-ambiguity'
  | 'mentoring-juniors'
  | 'leadership-style'
  | 'owning-failure'
  | 'hardest-technical-problem'
  | 'taking-initiative'
  | 'disagreeing-with-leadership'
  | 'prioritizing-competing-deadlines';

export interface BehaviouralQuestionCategory {
  id: BehaviouralCategoryId;
  category: string;
  prompt: string;
  framingNotes: string;
  starGuidance: StarGuidance;
  levelSignal: LevelSignal;
}

export const BEHAVIOURAL_QUESTION_CATEGORIES: BehaviouralQuestionCategory[] = [
  {
    id: 'resistance-to-change',
    category: 'Addressing "We’ve Always Done It This Way"',
    prompt:
      'Tell me about a time you proposed a change to how something had always been done, and faced resistance.',
    framingNotes:
      'Interviewers use this to test whether you can drive change without steamrolling people. The trap is framing the story as "I was right, they were slow" — that reads as arrogance, not leadership. What they’re actually listening for: did you diagnose why the resistance existed (fear of losing ownership, a past failed attempt, a genuine unstated risk) before pushing, and did you bring skeptics along rather than simply overriding them.',
    starGuidance: {
      situation:
        'Anchor the resistance in something concrete — a legacy process, a specific team, a specific decision-maker who owned the old way — not a vague "the team resisted change."',
      task: 'Be explicit about whether you had authority to make the change or had to earn buy-in — this distinguishes a leadership story from an authority story.',
      action:
        'Detail how you addressed the reason for resistance specifically (data, a pilot, a low-risk trial) rather than just repeating your proposal louder.',
      result:
        'Quantify the outcome, and note whether the resistant party became a convert — an interviewer listens for whether you changed a mind or just won a vote.',
    },
    levelSignal: {
      senior:
        'Convinces their own team — and maybe one team next door — to adopt the change, winning over the specific holdouts with a low-risk pilot or data rather than a mandate.',
      staff:
        'Notices the resistance is really evidence of a pattern affecting several teams at once, and re-scopes the change into something that lands across all of them without needing each team won over individually.',
    },
  },
  {
    id: 'scope-creep',
    category: 'Going Out of Scope / Scope Creep',
    prompt:
      'Describe a project where the scope expanded significantly beyond what was originally planned. How did you handle it?',
    framingNotes:
      'This probes two very different skills depending on which side of scope creep you tell: did you push back on scope creep to protect a deadline, or did you recognize that expanding scope was the right call and renegotiate the plan? Pick the version that’s true and be explicit about which one it is — interviewers penalize stories that can’t say whether scope grew for a good reason or a bad one.',
    starGuidance: {
      situation:
        'State the original scope and deadline precisely, so the expansion has a baseline to be measured against.',
      task: 'Clarify your role in scope ownership — were you the one who had to say no, or the one absorbing a stakeholder’s new ask?',
      action:
        'Show the tradeoff conversation you had — what you cut, deferred, or renegotiated, and with whom — rather than just absorbing the extra work silently.',
      result:
        'Report what actually shipped, on what timeline, and whether the relationship with the requesting stakeholder stayed intact — silent overtime is not a good outcome even if the deadline was hit.',
    },
    levelSignal: {
      senior:
        "Protects their own team's delivery commitment — deciding what to cut, defer, or push back on so the original deadline stays credible.",
      staff:
        'Recognizes when the expanded scope reflects a genuinely better understanding of the problem, and renegotiates the plan across every team whose roadmap the expansion now touches — not just their own.',
    },
  },
  {
    id: 'conflict-resolution',
    category: 'Conflict Resolution',
    prompt: 'Tell me about a time you disagreed with a coworker or manager. How did you handle it?',
    framingNotes:
      'The single biggest failure mode here is a one-sided story where the other person is simply "wrong" and you were "right." Interviewers listen for whether you can accurately represent the other side’s position — that’s the real signal of maturity, not who ultimately won the disagreement.',
    starGuidance: {
      situation:
        'Describe the disagreement in terms both sides would recognize as fair — avoid caricaturing the other person’s position.',
      task: 'Separate any disagreement over the what from any disagreement over the how — this shows you can decompose conflict rather than treat it as monolithic.',
      action:
        'Emphasize how you tried to understand their reasoning before advocating for yours (questions asked, data sought), and how you escalated or resolved it if you couldn’t agree.',
      result:
        'Note the resolution and, critically, the state of the working relationship afterward — a resolved decision with a damaged relationship is a partial win at best.',
    },
    levelSignal: {
      senior:
        'Resolves a disagreement with a peer or manager over an approach within their own team, by representing both sides fairly and driving it to a clear decision.',
      staff:
        "Resolves a disagreement about the direction of two teams — not a naming choice in a code review, but a real architectural fork — where a shared decision is the only thing that unblocks a launch both teams depend on.",
    },
  },
  {
    id: 'navigating-ambiguity',
    category: 'Navigating Ambiguity Without Guidance',
    prompt: 'Tell me about a time you were given a task or problem with little direction. How did you proceed?',
    framingNotes:
      'This tests tolerance for uncertainty and bias toward action — not whether you eventually got clear instructions. The failure mode is a story that’s secretly about someone else clarifying the ambiguity for you. The interviewer wants to see how you structured an unstructured problem before anyone told you what "right" looked like.',
    starGuidance: {
      situation:
        'Establish exactly what was missing — an unclear goal, unclear owner, or unclear constraints. Ambiguity is not one thing, and naming the specific kind shows self-awareness.',
      task: 'Frame the task as one you partly had to define yourself — what did you decide the goal should be, and how did you validate that guess?',
      action:
        'Show the concrete steps you took to reduce uncertainty (small experiments, talking to stakeholders, a working prototype) before committing to a full solution.',
      result:
        'Report the outcome and whether your interpretation of the ambiguous ask turned out to be right — and if not, how quickly you corrected course.',
    },
    levelSignal: {
      senior:
        'Defines the goal and success criteria for their own unclear task, then delivers against the bar they set for themselves.',
      staff:
        "Defines the goal for a problem where the right approach isn't obvious to anyone yet, and produces enough structure — a plan, a prototype, a first framework — that other teams can align around it instead of guessing independently.",
    },
  },
  {
    id: 'mentoring-juniors',
    category: 'Mentoring Junior Engineers',
    prompt: 'Tell me about a time you helped a junior engineer grow. What did you do, and what was the impact?',
    framingNotes:
      'Weak answers describe tasks the mentor did for the mentee. Strong answers describe a deliberate teaching strategy — the mentor stepping back so the mentee could build the skill themselves. Interviewers listen for whether you can identify what specifically was missing in the mentee’s skill set, not just that you were "helpful."',
    starGuidance: {
      situation:
        'Identify the specific skill or confidence gap the junior engineer had — vague, and it reads as a story about being nice rather than about developing someone.',
      task: 'State what you set out to build in them (a specific capability, not just "help them succeed") and over what time horizon.',
      action:
        'Describe your teaching method concretely — pairing, code-review calibration, deliberately assigning stretch work — and how you adjusted when your first approach didn’t land.',
      result:
        'Point to evidence of independent growth after your involvement decreased — that’s the real signal of mentorship versus doing the work alongside them indefinitely.',
    },
    levelSignal: {
      senior:
        'Invests deliberately in one or two engineers — assigning stretch work, calibrating in code review, and stepping back once the skill has visibly transferred.',
      staff:
        'Builds a mentoring approach that scales past a single relationship, handing the well-understood parts of the work to others to develop them while personally keeping ownership of the highest-risk, least-understood parts.',
    },
  },
  {
    id: 'leadership-style',
    category: 'Leadership Style',
    prompt: 'How would you describe your leadership style, or tell me about a time you led without formal authority.',
    framingNotes:
      'This is often asked of ICs specifically to see if they can lead through influence. A generic answer ("I lead by example") is forgettable. The interviewer wants a philosophy that’s falsifiable — one that implies what you wouldn’t do — backed by a concrete instance where that philosophy was tested.',
    starGuidance: {
      situation:
        'Pick a moment where leadership was actually required — a decision needed to be made and no one had unilateral authority to make it.',
      task: 'Be explicit that you had no formal authority in this situation — that’s the entire point of the story, so don’t let it be implied.',
      action:
        'Show the specific influence tactics you used (building consensus, demonstrating with a prototype, borrowing authority from data) rather than an appeal to seniority.',
      result:
        'Tie the outcome back to your stated leadership philosophy — the result should be evidence for the philosophy, not just a good outcome.',
    },
    levelSignal: {
      senior:
        'Leads through influence on a specific decision inside their own team, stating a clear position rather than a neutral menu of options.',
      staff:
        "Leads through influence with teams that don't report to them at all, setting a technical direction other teams choose to follow because the reasoning holds up, not because of their title.",
    },
  },
  {
    id: 'owning-failure',
    category: 'Owning a Failure or Hard Feedback',
    prompt: 'Tell me about a time you failed, or a piece of feedback that was hard to hear. What did you do afterward?',
    framingNotes:
      'Interviewers ask this specifically to test whether you take ownership when things go wrong, not just when they go right. The trap is picking a fake failure that\'s really a humble-brag ("I worked too hard"), or narrating the mistake and the eventual good outcome while skipping the actual behavior change in between. What they\'re listening for: did you name the real failure plainly, take responsibility without deflecting, and make a concrete, verifiable change afterward — not just feel bad about it.',
    starGuidance: {
      situation:
        'Name the failure or the feedback plainly and specifically — vague ("things didn’t go well") reads as evasive, and a trivial pick ("I missed a comma") reads as dodging the question.',
      task: 'Be clear about what you were responsible for when it went wrong — this is the one STAR story where owning the task fully, including the part where you got it wrong, is the point.',
      action:
        'Describe the specific behavior change you made afterward, not just the apology or the acknowledgment — a concrete new habit, check, or process is what separates ownership from contrition.',
      result:
        'Show evidence the change actually stuck — a later situation where you did it differently, or feedback confirming the pattern didn’t repeat.',
    },
    levelSignal: {
      senior:
        "Owns a mistake that affected their own team's delivery, or feedback about their own individual execution, and changes a personal habit or process as a result.",
      staff:
        "Owns a mistake or feedback that reflects a gap in judgment at a cross-team or strategic level, and changes something structural — a review process, a decision framework — so the same class of mistake doesn't recur for others either.",
    },
  },
  {
    id: 'hardest-technical-problem',
    category: 'The Hardest Technical Problem You’ve Solved',
    prompt: "Tell me about the most challenging technical problem you've faced — what made it hard, and how did you solve it?",
    framingNotes:
      "This tests technical judgment under real difficulty, not just that you eventually found a fix. The trap is narrating only the solution — interviewers are listening for the diagnostic process itself: what you ruled out, why the obvious first guess was wrong, and how you actually isolated the cause. A version of this question sometimes shows up as \"tell me about something innovative you built\" — same underlying story, just framed around novelty of the approach instead of difficulty of the diagnosis.",
    starGuidance: {
      situation:
        "Establish what made this hard specifically — an ambiguous symptom, a system you didn't own, conflicting signals — not just \"it was a hard bug.\"",
      task: "State what \"solved\" needed to mean — a permanent fix, a mitigation under time pressure, or a root-cause explanation — since the bar for done differs across those.",
      action:
        'Walk through your actual diagnostic process — what you ruled out and why, not just the theory that turned out to be right. This is where technical judgment is actually visible.',
      result:
        "Report the fix and its durability — whether it recurred, and if you introduced anything (a test, a monitor, a doc) to make sure it wouldn't.",
    },
    levelSignal: {
      senior:
        "Diagnoses and fixes a hard problem scoped to a system their own team owns, using rigor an interviewer can follow step by step.",
      staff:
        'Diagnoses a problem whose root cause spans systems owned by different teams, and the fix changes a shared assumption or interface — not just one service.',
    },
  },
  {
    id: 'taking-initiative',
    category: 'Taking Initiative Beyond Your Role',
    prompt: 'Tell me about a time you identified a problem or opportunity nobody had asked you to address, and took it on anyway.',
    framingNotes:
      "This tests ownership — whether you notice unowned problems and act before being told to, as opposed to executing assigned work well. The trap is describing a task that was actually assigned, dressed up as initiative. The strongest version of this story often starts with something nobody else had considered part of anyone's job yet.",
    starGuidance: {
      situation:
        "Establish clearly that this problem had no owner and wasn't on anyone's roadmap — that absence of ownership is the whole premise of the story.",
      task: 'State why you decided it was worth acting on despite not being asked — what made it worth the risk of doing unrequested work.',
      action:
        "Show how you scoped the work to a size you could deliver without derailing your actual assignments, and how you brought others along once it needed more than just you.",
      result:
        "Report the outcome and whether the initiative got adopted or institutionalized beyond your own use of it — that's the signal it was a real gap, not a pet project.",
    },
    levelSignal: {
      senior:
        "Notices and fixes a gap affecting their own team's day-to-day effectiveness, on their own initiative, without being asked.",
      staff:
        'Notices a gap affecting multiple teams that nobody owns because it falls between team boundaries, and builds something durable enough that other teams adopt it as shared infrastructure or practice.',
    },
  },
  {
    id: 'disagreeing-with-leadership',
    category: 'Disagreeing With a Decision From Leadership',
    prompt: 'Tell me about a time you disagreed with a decision made by your manager or leadership. How did you handle it?',
    framingNotes:
      "This is a distinct question from peer conflict — the power dynamic is the point. Interviewers are testing whether you can push back on someone with authority over you without either capitulating silently or refusing to accept the final call. The trap is a story that's really about going around your manager, or one where you never actually accepted the decision once it was made.",
    starGuidance: {
      situation:
        "State the decision and your manager's or leadership's stated reasoning — not just that you disagreed, but with what and why they thought otherwise.",
      task: 'Be clear about what was actually at stake in raising the disagreement — your credibility, the project\'s direction, or a risk you thought was being underweighted.',
      action:
        'Show how you made the case — data, a prototype, a direct conversation — through the appropriate channel, rather than escalating past them or complaining to peers.',
      result:
        "Report what actually happened — whether they changed course, and equally importantly, how you executed once the final call was made, especially if it didn't go your way.",
    },
    levelSignal: {
      senior:
        "Pushes back on a decision affecting their own team's work, makes the case once clearly, and executes fully once the manager decides — even if the decision didn't go their way.",
      staff:
        "Pushes back on a decision with multi-team or strategic consequences, and is trusted enough by leadership that their dissent gets factored into the final call even when they don't ultimately prevail.",
    },
  },
  {
    id: 'prioritizing-competing-deadlines',
    category: 'Prioritizing Competing Deadlines',
    prompt: 'Tell me about a time you had multiple competing priorities or deadlines at once. How did you decide what to do first?',
    framingNotes:
      'This tests judgment under real constraint, not time-management tricks. The trap is "I just worked longer hours" — that\'s an answer about effort, not prioritization. Interviewers are listening for the actual criteria you used to rank competing asks, and whether you communicated the tradeoff to the people affected rather than silently absorbing it.',
    starGuidance: {
      situation:
        'Name the specific competing asks and who each one was for — vague "I had a lot on my plate" hides the actual tradeoff you had to make.',
      task: "State what you were accountable for on each one, so it's clear there wasn't an obviously-correct answer available.",
      action:
        'Show the actual criteria you used to rank them (impact, risk, reversibility, who was blocked) and how you communicated the resulting tradeoff to each stakeholder rather than letting them find out later.',
      result:
        "Report what shipped, what slipped, and whether the deprioritized stakeholder's relationship with you survived the tradeoff intact.",
    },
    levelSignal: {
      senior:
        "Ranks competing asks within their own team's workload using clear criteria, and proactively tells each stakeholder where they land.",
      staff:
        'Ranks competing asks that span multiple teams\' roadmaps, and the criteria they use becomes the de facto tradeoff framework other teams adopt for similar decisions.',
    },
  },
];
