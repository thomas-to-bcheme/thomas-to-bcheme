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
];

export const COMMON_MISTAKES: string[] = [
  'Designing for infinite scale nobody asked for, instead of the scale actually stated in requirements',
  'Chaining more than 2-3 synchronous service calls in a single request path without questioning the latency stack-up',
  'Proposing dual-writes to two data stores without a reconciliation strategy — a classic split-brain risk',
  'Retry logic with no backoff or jitter, which can turn a transient blip into a retry storm that takes the service down',
  'Going silent while thinking for more than a few seconds — narrate, even a half-formed thought, rather than leaving dead air',
  'Treating the first design as final rather than something to iterate on as new information comes in',
];
