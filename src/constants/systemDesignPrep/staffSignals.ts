export interface StaffSignal {
  id: string;
  signalNumber: number;
  label: string;
  example: string;
  takeaway: string;
}

export const STAFF_SIGNALS: StaffSignal[] = [
  {
    id: 'quantifies-cost',
    signalNumber: 1,
    label: 'Quantifies cost explicitly',
    example:
      '"Adding a read replica costs us roughly $X/month at this instance size and buys us maybe 2x read capacity — versus caching, which is closer to $Y and could buy us 5-10x for our read pattern."',
    takeaway: 'A real number beats "it\'ll cost more" every time — it shows the trade-off was actually thought through, not gestured at.',
  },
  {
    id: 'conways-law-awareness',
    signalNumber: 2,
    label: 'Shows awareness of Conway’s Law',
    example:
      '"If we split this into services owned by separate teams, the service boundaries need to roughly match team boundaries, or we’ll end up with constant cross-team coordination overhead on every change."',
    takeaway: 'Org structure shapes system structure whether you plan for it or not — naming that trade-off explicitly is a senior-level instinct.',
  },
  {
    id: 'designs-in-operations',
    signalNumber: 3,
    label: 'Designs operational concerns in, unprompted',
    example:
      '"I’d want alerting on p99 latency and error rate for this service, with an on-call runbook for the most likely failure mode — the queue backing up."',
    takeaway: 'A system that works in the design but has no monitoring/alerting story isn’t actually production-ready — say so before being asked.',
  },
  {
    id: 'raises-security-unprompted',
    signalNumber: 4,
    label: 'Raises security considerations without being asked',
    example:
      '"This endpoint takes user-supplied input that gets stored and later rendered elsewhere — I’d want to validate/sanitize it here to avoid injection."',
    takeaway: 'Security-as-an-afterthought is a common junior-level gap — naming it proactively, even briefly, signals the opposite.',
  },
  {
    id: 'phased-rollout',
    signalNumber: 5,
    label: 'Proposes a phased rollout, not a big-bang rewrite',
    example:
      '"Rather than migrating everything at once, I’d strangler-fig this — route new traffic to the new system while the old one keeps serving existing traffic, then migrate incrementally."',
    takeaway: 'Big-bang migrations are high-risk and hard to roll back — a phased plan shows real production experience.',
  },
  {
    id: 'data-driven-thresholds',
    signalNumber: 6,
    label: 'Uses data-driven thresholds, not vague "at scale" language',
    example:
      '"I wouldn’t shard until we’re consistently seeing write throughput above roughly X per second on the primary — before that, read replicas and caching should cover it."',
    takeaway: '"At scale" is a placeholder, not an argument — naming the actual threshold is what makes the trade-off falsifiable.',
  },
  {
    id: 'failure-modes-first',
    signalNumber: 7,
    label: 'Reasons about failure modes first',
    example: '"Before I go further — what happens when this service is unreachable? Does the caller retry, queue, or fail the whole request?"',
    takeaway: 'Designing the failure path before the happy path catches structural gaps the happy path alone would hide.',
  },
  {
    id: 'build-vs-buy',
    signalNumber: 8,
    label: 'Shows build-vs-buy judgment',
    example:
      '"For rate limiting I’d reach for an existing managed solution rather than building a custom token-bucket implementation — this isn’t a differentiating problem for us to own."',
    takeaway: 'Knowing when NOT to build something custom is as much a signal of judgment as knowing how to build it.',
  },
  {
    id: 'narrates-tradeoffs-not-just-labels',
    signalNumber: 9,
    label: 'Narrates the trade-off, not just the label',
    example:
      '"I\'d make the like-count eventually consistent — a few seconds of staleness is invisible to a user scrolling a feed. I\'d make the opposite call for an account balance, though: staleness there isn\'t cosmetic, it\'s a correctness bug someone notices immediately."',
    takeaway:
      'Naming the trade-off and explaining why it fits THIS specific case is what separates real judgment from reciting "eventual consistency" as a keyword.',
  },
];

export const COMMON_MISTAKES: string[] = [
  'Designing for infinite scale nobody asked for, instead of the scale actually stated in requirements',
  'Chaining more than 2-3 synchronous service calls in a single request path without questioning the latency stack-up',
  'Proposing dual-writes to two data stores without a reconciliation strategy — a classic split-brain risk',
  'Retry logic with no backoff or jitter, which can turn a transient blip into a retry storm that takes the service down',
  'Going silent while thinking for more than a few seconds — narrate, even a half-formed thought, rather than leaving dead air',
  'Treating the first design as final rather than something to iterate on as new information comes in',
];

export interface LevelArchitectureDimension {
  id: string;
  dimension: string;
  senior: string;
  staff: string;
}

/**
 * Senior vs. Staff+, sliced specifically to architecture/technical judgment
 * in a system-design interview — deliberately distinct from
 * `SENIOR_TO_STAFF_SHIFT` in src/constants/behavioural.ts, which covers the
 * interpersonal/storytelling side of that same rung (time horizon,
 * autonomy, conflict, managerial support) on the /behavioural page. Rendered
 * by StaffSignalsSection, reusing that file's blue/purple bordered-box idiom.
 */
export const LEVEL_ARCHITECTURE_DIMENSIONS: LevelArchitectureDimension[] = [
  {
    id: 'scope-of-impact',
    dimension: 'Scope of Impact',
    senior:
      'Implements the right components to fix a specific, stated scaling failure inside their own service or application.',
    staff:
      "Standardizes architecture across a domain — the choices they make align technical direction with business strategy at the org level, not just one service's.",
  },
  {
    id: 'system-architecture',
    dimension: 'System Architecture',
    senior: 'Picks a proven architecture for the stated requirements and can defend every piece of it under questioning.',
    staff:
      "Names the next order of magnitude the current shape won't survive, and sequences the migration proactively — rather than over-designing for scale nobody has asked for yet.",
  },
  {
    id: 'data-state-management',
    dimension: 'Data & State Management',
    senior: "Picks the right database and consistency model for their own service's data.",
    staff:
      'Reasons about which service is the system of record and how state propagates to consumers — a synchronous call, an event, or CDC — and what staleness each consumer can actually tolerate.',
  },
  {
    id: 'api-decoupling',
    dimension: 'API & Decoupling',
    senior: 'Builds a robust REST or GraphQL endpoint, and reaches for a message queue where async makes sense.',
    staff:
      "Defines org-wide communication standards and drives decoupling specifically to prevent cascading failures across services, not just within one.",
  },
  {
    id: 'ambiguity-autonomy',
    dimension: 'Ambiguity & Autonomy',
    senior: 'Takes defined functional requirements and clarifies the non-functional constraints before building.',
    staff: 'Proactively identifies a future bottleneck and drives the architectural shift before growth forces it.',
  },
];

/**
 * Self-check questions scoped to system-design/architecture judgment,
 * mirroring the voice of LEVEL_SELF_CHECK_QUESTIONS in
 * src/constants/behavioural.ts (same "before you commit to an answer"
 * framing) but applied to a design, not a story. Rendered by
 * StaffSignalsSection alongside COMMON_MISTAKES.
 */
export const PROMOTION_ALIGNMENT_CHECKLIST: string[] = [
  'Did I explicitly clarify non-functional requirements — latency, throughput, consistency — before jumping to implementation?',
  "Can I articulate how this system survives failure, not just its happy path — redundancy, fault tolerance, and decoupling?",
  'Did I justify the data-layer choice against actual read/write access patterns, rather than defaulting to whatever I know best?',
  'Did I explain the caching or consistency trade-off in terms of what the business could actually tolerate, not just "eventual vs. strong"?',
  'Did I factor CDN, DNS, and real network latency into how I reasoned about global scale?',
  'When I pick an architecture, do I state the scale at which it stops working — not just that it works today?',
];
