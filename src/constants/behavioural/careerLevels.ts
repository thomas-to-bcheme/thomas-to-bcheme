/**
 * The Junior→Principal career ladder, the Four Dimensions rubric (Scope,
 * Contribution, Impact, Difficulty — ByteByteGo's "What Companies Are Looking
 * For"), the Senior→Staff operating shift, and the pitfalls/self-check/
 * self-assessment guidance that sit on top of all of it. Moved and extended
 * from the old flat `constants/behavioural.ts`; `LevelSignal` now lives here
 * (rather than beside the old STAR-specific `StarGuidance`) since it's reused
 * by every competency chapter's `CompetencySampleQuestion` regardless of
 * which storytelling framework wraps it.
 */

/**
 * The full career ladder the general framework section walks through —
 * ordered Junior → Principal. Array order (not object key order) drives
 * render order everywhere this is consumed.
 */
export type CareerLevelId = 'junior' | 'mid' | 'senior' | 'staff' | 'seniorStaff' | 'principal';

/**
 * Level-by-level framing for a single category — one sentence per rung of
 * the full Junior→Principal ladder, used by every competency chapter's
 * sample-question cards so each question's level signal matches the same
 * ladder shape as `LEVEL_DIMENSIONS` rather than a narrower senior/staff slice.
 */
export type LevelSignal = Record<CareerLevelId, string>;

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
 * before the per-competency sample-question cards apply a senior/staff slice
 * of it. Synthesized from Hello Interview's Signal Areas (scope, ownership,
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
        'The hardest part of the story is reconciling competing trade-offs held by multiple teams at once — the difficulty is organizational as much as it is technical, like reconciling conflicting SLOs or error budgets that two different teams each own.',
      seniorStaff:
        'The hardest part was choosing between multiple defensible strategic directions for a whole division, each with real champions and real costs, with no clean answer.',
      principal:
        'The hardest part was a trade-off with no local optimum — any choice meaningfully disadvantages some part of the org, and the job is choosing well anyway and owning that call, the kind of decision that gets settled through a formal RFC or ADR-style review rather than a hallway conversation.',
    },
  },
];

export interface OperatingShiftRow {
  id: string;
  dimension: string;
  senior: string;
  staff: string;
}

/**
 * A second lens alongside LEVEL_DIMENSIONS, scoped deliberately to Senior→Staff only
 * (mirroring the source's own two-column framing rather than stretching it across the
 * full Junior→Principal ladder). Rendered inside SeniorVsStaffSection, reusing the same
 * blue/purple bordered-box idiom every competency's sample-question card also uses for
 * its Senior vs. Staff comparison.
 */
export const SENIOR_TO_STAFF_SHIFT: OperatingShiftRow[] = [
  {
    id: 'time-horizon',
    dimension: 'Time Horizon',
    senior: 'Plans and delivers against roughly a 12-month horizon, and resists trading long-term cost for a short-term win.',
    staff: "Holds a multi-year view and checks that today's architecture decisions still make sense against where the business is headed, not just where it is now.",
  },
  {
    id: 'autonomy-output',
    dimension: 'Autonomy & Output',
    senior: 'Manages their own scope tightly — adding rigor where it earns its cost, not complexity for its own sake.',
    staff: 'Creates capacity by growing other engineers into the scope they used to hold personally, rather than personally absorbing more work.',
  },
  {
    id: 'conflict-resolution-shift',
    dimension: 'Conflict Resolution',
    senior: "Disagrees, makes the case once, and commits fully once a call is made — even when it doesn't go their way.",
    staff: "Resolves standoffs between peers at their own level where there's no shared manager to appeal to, and the disagreement has to be settled on the merits.",
  },
  {
    id: 'managerial-support',
    dimension: 'Managerial Support',
    senior: 'Uses data to show where their capacity is maxed out and asks explicitly for help prioritizing.',
    staff: "Needs a manager positioned to advocate for cross-team scope on their behalf — the role doesn't function well under a manager who can't see past one team.",
  },
];

/**
 * Merges Hello Interview's "We Disease" / concrete-over-vague coaching with
 * ByteByteGo's story red-flag checklist and the "Common Mismatches" list from
 * ByteByteGo's "What Companies Are Looking For" chapter — the failure modes
 * that undercut a level signal regardless of which competency the story
 * belongs to. The last two entries were appended specifically to cover
 * Ch.02's explicit junior-for-senior / mid-for-staff level-target mismatch
 * and its "all impact, no difficulty" pattern — the rest of the chapter's
 * "Common Mismatches" list (overstated scope, unclear "we" contribution,
 * difficulty with no stated payoff) already had equivalents below.
 */
export const LEVEL_PITFALLS: string[] = [
  'Narrating what "we" did throughout the story without ever stating what you personally did — if an interviewer can\'t isolate your contribution, they can\'t credit it.',
  "Telling a story that's really about completing an assigned task well, when the question was asked to find leadership, ownership, or judgment.",
  'Describing impact in vague terms ("things got better," "the team was more efficient") instead of a number, a before/after, or a concrete signal that confirms it actually worked.',
  'Spending most of the story on how hard the work was without ever landing on what it produced — difficulty without payoff reads as a struggle, not a win.',
  "Describing a scope or role bigger than the one you'd actually defend under a specific follow-up question — overstated scope collapses the moment it's tested.",
  'Presenting a neutral menu of options you considered instead of the decision you actually made and defended — indecision reads as diplomacy but scores as a missing signal.',
  'Playing the "local hero" — repeatedly saving a project by working nights and weekends — which signals you\'re a bottleneck at senior+ levels, not that you scale; the mature move is growing someone else into that scope.',
  'Building something technically impressive that doesn\'t map to a real organizational pain point — impact is judged against business need, not against how hard the work was.',
  "Telling a junior-shaped story (individual task completion, no influence or teaching mentioned) for a senior role, or a mid-shaped story (single-team ownership) for a staff role — the story itself might be true and well told, it's just calibrated below the level being interviewed for.",
  'Straightforward work dressed up as senior-level problem-solving — real impact with no real difficulty behind it reads as luck or as inflating an easy win, not as judgment under a hard constraint.',
];

/**
 * An affirmative self-check, distinct from LEVEL_PITFALLS (what to avoid) — the
 * questions to ask of a story before you tell it. Rendered as a callout in
 * SeniorVsStaffSection, alongside "Common pitfalls at any level".
 */
export const LEVEL_SELF_CHECK_QUESTIONS: string[] = [
  'Does my target team or company actually have enough organizational need to justify this level — or am I hoping the title outruns the scope?',
  'Can I point to impact that specifically would not have happened with an average engineer in the seat — not just impact that happened while I was in it?',
  'Is my story honestly U-shaped — a real constraint or setback, not a straight line to a clean win?',
  'Am I describing this in terms of business value and team outcomes, or did I just translate my code into slightly plainer words?',
  "Do I proactively take a problem off my manager's or leadership's desk before being asked — or do I wait to be assigned?",
];

export interface SelfAssessmentFix {
  dimensionId: string; // matches a LEVEL_DIMENSIONS id (scope | contribution | impact | difficulty)
  ifWeak: string;
}

export interface SelfAssessmentGuidance {
  process: string[];
  fixesByDimension: SelfAssessmentFix[];
}

/**
 * ByteByteGo's "Reading and Calibrating Your Own Level" section, condensed:
 * score your prepared stories against the Four Dimensions and your target
 * level, then fix whichever dimension is weakest rather than discarding the
 * story outright. Rendered as a self-assessment callout inside
 * SeniorVsStaffSection, after the dimension grid it references.
 */
export const SELF_ASSESSMENT_GUIDANCE: SelfAssessmentGuidance = {
  process: [
    'Score each of your prepared stories against the four dimensions above and the level you\'re actually targeting.',
    'If most of your stories cluster below your target level: look for stronger examples, better articulate the scope or impact of what you already have, or reconsider whether the level you\'re targeting is the right one to interview for right now.',
    'Aim for 2–3 stories that land solidly at your target level, not a whole bank of them — mixed levels across your story bank are normal, but don\'t lead with your weakest ones.',
  ],
  fixesByDimension: [
    { dimensionId: 'scope', ifWeak: 'Look for a moment where more than one person or team was genuinely affected by what you did, even if it was a smaller initiative overall.' },
    { dimensionId: 'contribution', ifWeak: 'Isolate exactly what you specifically decided or did, separate from what "the team" did — this is often a framing fix, not a new-story problem.' },
    { dimensionId: 'impact', ifWeak: 'Find a quantified outcome — a number, a before/after, or a concrete signal — even an honest approximation beats a vague "it went well."' },
    { dimensionId: 'difficulty', ifWeak: 'Find the real constraint or trade-off you were actually navigating — the difficulty was probably there; it just didn\'t make it into how you\'ve been telling the story.' },
  ],
};
