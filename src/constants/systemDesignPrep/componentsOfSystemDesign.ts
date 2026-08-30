// Supporting content for ComponentsOfSystemDesignSection. The 5 full
// decision-cascade cards that used to render here now live inline in "The
// Questions" (under Design and Data) — see RELOCATED_COMPONENT_QUESTIONS
// below for the cross-link index back to them. COMPONENT_FRAMING_TOPICS and
// DESIGN_PRINCIPLES deliberately do NOT re-derive content that already has
// real trade-off depth elsewhere on the page (the scaling-progression
// question, among others) — they frame it in one place and cross-link to
// the existing authoritative source instead, per DATA INTEGRITY.

export interface ComponentCrossLink {
  label: string;
  href: string;
}

// The 5 decision cascades that used to render directly inside this section,
// now living inline in "The Questions" (under Design and Data) — a
// cross-link index back to them for readers landing on this section first.
export const RELOCATED_COMPONENT_QUESTIONS: ComponentCrossLink[] = [
  { label: 'Load balancer vs. API gateway vs. reverse proxy →', href: '#lb-vs-gateway-vs-proxy' },
  { label: 'Storage types →', href: '#storage-types' },
  { label: 'Partitioning vs. sharding →', href: '#partitioning-vs-sharding' },
  { label: 'Networking, DNS & CDN →', href: '#networking-dns-cdn' },
  { label: 'AuthN vs. AuthZ vs. security →', href: '#authn-vs-authz-vs-security' },
];

export interface ComponentFramingTopic {
  id: string;
  label: string;
  summary: string;
  crossLinks: ComponentCrossLink[];
}

// Topics that round out the user-facing "components of system design"
// checklist but already have their trade-off depth built elsewhere.
export const COMPONENT_FRAMING_TOPICS: ComponentFramingTopic[] = [
  {
    id: 'caching',
    label: 'Caching',
    summary:
      'Trading freshness for speed at whichever layer is cheapest to add — L1 in-process, L2 shared (Redis), L3 CDN/edge — with a separate choice for how writes stay in sync.',
    crossLinks: [],
  },
  {
    id: 'replication',
    label: 'Replication',
    summary:
      'Sync vs async copies of data across nodes — the durability/latency trade-off underneath most availability guarantees, and the reason read replicas can lag.',
    crossLinks: [],
  },
  {
    id: 'vertical-vs-horizontal-scaling',
    label: 'Vertical vs. horizontal scaling',
    summary:
      'A bigger machine vs. more machines — a fast, simple lever with a hard ceiling, vs. real horizontal capacity that compounds hard once a budget constraint is real.',
    crossLinks: [{ label: 'Scaling progression →', href: '#scaling-progression' }],
  },
  {
    id: 'api',
    label: 'API',
    summary:
      'REST, GraphQL, or gRPC as the contract between client and service — a protocol choice, distinct from the API-gateway traffic-management decision above.',
    crossLinks: [{ label: 'Real-time vs Batch →', href: '#real-time-vs-batch' }],
  },
];

export interface DesignPrinciple {
  id: string;
  label: string;
  summary: string;
  crossLink?: ComponentCrossLink;
}

// Closing principles — the standard every component choice above should be
// checked against, not a one-time checklist item.
export const DESIGN_PRINCIPLES: DesignPrinciple[] = [
  {
    id: 'keep-it-simple',
    label: 'Keep it simple',
    summary: 'Start with the simplest design that satisfies the requirements, then layer in complexity only when a real constraint forces it.',
    crossLink: { label: 'See High-Level Design →', href: '#high-level-design' },
  },
  {
    id: 'build-for-scale',
    label: "Build for today's scale, with a runway",
    summary: "Design for the load and requirements that actually exist today, simple enough to ship — but keep the next order of magnitude a lever to pull, not a rewrite. Know the runway a given design buys (how much growth it absorbs before a lever stops being enough) before treating the current shape as decided.",
    crossLink: { label: 'See Scaling progression →', href: '#scaling-progression' },
  },
  {
    id: 'design-for-failure',
    label: 'Design for failure',
    summary: 'Assume components will fail — redundancy and graceful degradation, not just a happy path.',
  },
  {
    id: 'automate-observability',
    label: 'Automate with monitoring & observability',
    summary: "What isn't instrumented can't be operated — automation and visibility are the same discipline, not separate concerns.",
  },
  {
    id: 'iterate-and-evolve',
    label: 'Iterate and evolve',
    summary: "Know when the current design has stopped fitting, and evolve it deliberately — architecture is ongoing judgment, not a one-time decision.",
  },
];
