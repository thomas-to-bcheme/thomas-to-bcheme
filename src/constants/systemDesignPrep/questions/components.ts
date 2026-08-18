import type { SystemDesignQuestion } from './types';

// The 5 genuinely multi-way "components of system design" decisions that
// don't already exist elsewhere on the page as a full decision cascade —
// rendered directly by ComponentsOfSystemDesignSection, NOT spread into
// SYSTEM_DESIGN_QUESTIONS (that would double-render them inside the
// category-filtered question bank in SystemDesignQuestionsSection). Each
// `category` value is only used for TypeScript validity here — these
// entries are never iterated by category. Synthesized from the ByteByteGo
// "HLD Roadmap 2026" mind map and roadmap.sh/system-design (see
// externalReferences.ts) rather than transcribed from the site's original
// Excalidraw boards, hence `sourceNote: 'synthesized'` throughout.
export const COMPONENTS_OF_SYSTEM_DESIGN_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'lb-vs-gateway-vs-proxy',
    category: 'backend',
    axes: ['end-to-end'],
    question: 'Where does traffic get distributed, translated, or intercepted before it reaches a backend instance?',
    clarifyingSubQuestions: [
      'Is the goal purely spreading load across identical instances, or also routing/composing across different services?',
      'Does this need to enforce cross-cutting concerns (auth, rate limiting, request transformation) in one place?',
      'Is this internal, service-to-service traffic, or the public-facing edge of the system?',
      'Does routing need application-layer awareness (HTTP headers/paths), or is transport-layer distribution enough?',
    ],
    approachOptions: [
      {
        label: 'Load balancer (L4/L7)',
        whenToUse:
          'Distributing requests across many identical instances of the same service — the default first line of defense against any single instance being overwhelmed.',
        tradeoffs:
          'Simple and fast, especially at L4, but has no concept of "service A vs service B" — it balances, it doesn\'t route by business logic.',
      },
      {
        label: 'API gateway',
        whenToUse:
          'A single entry point in front of many downstream services — centralizing auth, rate limiting, request/response transformation, and path-based routing.',
        tradeoffs:
          'Powerful and centralizes cross-cutting concerns, but adds a network hop and becomes a shared dependency that must itself be scaled and kept highly available.',
      },
      {
        label: 'Reverse proxy',
        whenToUse:
          'A general-purpose intermediary in front of one or more servers — TLS termination, response caching, compression, and hiding backend topology from the outside.',
        tradeoffs:
          "Flexible and often free (nginx, Envoy), but on its own doesn't understand business-level routing the way a purpose-built gateway does.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'These three overlap heavily in practice',
        dependsOn:
          "A single nginx or Envoy instance can act as reverse proxy, load balancer, and (with enough config) a crude API gateway — the distinction that matters in an interview is intent and where cross-cutting logic lives, not which specific product you'd buy. Managed API gateways (Kong, AWS API Gateway) exist because centralizing that logic by hand gets unwieldy at scale.",
      },
    ],
    ripplesInto: ['hosting-model', 'networking-dns-cdn'],
    sourceNote: 'synthesized',
  },
  {
    id: 'storage-types',
    category: 'data',
    axes: ['abstraction'],
    question: "What's the underlying storage medium for this data, independent of what database sits on top of it?",
    clarifyingSubQuestions: [
      'Is this large, mostly-immutable content (media, backups, logs), or small records needing low-latency random access?',
      'Does more than one instance need concurrent access to the same files, or is it exclusive to one attached instance?',
      "How often does the content change after it's first written?",
    ],
    approachOptions: [
      {
        label: 'Object storage (S3-style)',
        whenToUse:
          'Large, infrequently-modified blobs — images, video, backups, data-lake files — accessed by key, not by path.',
        tradeoffs:
          'Durable and effectively infinitely scalable at low cost, but no partial-file edits and higher per-request latency than block storage.',
      },
      {
        label: 'Block storage (EBS-style)',
        whenToUse: 'Low-latency, random-access disk for a database or any workload needing filesystem semantics on one instance.',
        tradeoffs: 'Fast, but tied to a single attached instance at a time — not natively shareable across a fleet.',
      },
      {
        label: 'File storage (EFS/NFS-style)',
        whenToUse: 'A shared, POSIX-compliant filesystem multiple instances need to read/write concurrently.',
        tradeoffs:
          'Simplifies sharing, but adds network-filesystem latency and its own scaling ceiling compared to block storage.',
      },
    ],
    implementationNotes: [
      {
        consideration: "This is a different axis than the Reference Grid's \"Database taxonomy\"",
        dependsOn:
          "Database taxonomy is about data model — relational vs NoSQL, and so on. Storage type is about the medium underneath any of those — a relational database still needs to sit on block storage, and its backups still need to land somewhere object storage makes sense.",
      },
    ],
    ripplesInto: ['db-selection', 'oltp-vs-olap'],
    sourceNote: 'synthesized',
  },
  {
    id: 'partitioning-vs-sharding',
    category: 'data',
    axes: ['time', 'abstraction'],
    question: 'Is this a general split of data or load across a boundary, or specifically a distributed-database sharding strategy?',
    clarifyingSubQuestions: [
      'Is the split by responsibility/domain (functional), by column (vertical), or by row across identical nodes (horizontal)?',
      "Has this outgrown a single database instance, or is it still one database being reorganized internally?",
      "What's the shard/partition key, and does it risk creating a hot spot?",
    ],
    approachOptions: [
      {
        label: 'Functional / vertical partitioning',
        whenToUse:
          'Splitting by responsibility — a users table on one database, orders on another — usually the first, cheapest lever before any horizontal split.',
        tradeoffs:
          "Simple and requires no new distributed-systems infrastructure, but has a hard ceiling: it doesn't help once one functional area itself outgrows a single node.",
      },
      {
        label: 'Horizontal sharding (range/hash/directory)',
        whenToUse:
          'One functional area\'s write volume has outgrown a single primary — the next lever once vertical partitioning is exhausted.',
        tradeoffs:
          "Real horizontal write scaling, at the cost of cross-shard queries and transactions becoming much harder — see the Reference Grid's Sharding strategies entry for the range vs hash vs directory trade-off.",
      },
      {
        label: 'Directory-based partitioning',
        whenToUse:
          "Shard assignment needs to change without re-hashing everything — a lookup service maps keys to shards instead of a fixed formula.",
        tradeoffs:
          'Most flexible for rebalancing, but the lookup service itself becomes a new dependency and potential bottleneck.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Partitioning is the general concept; sharding is one specific case of it',
        dependsOn:
          "Every sharding strategy is a horizontal partitioning strategy, but not every partitioning strategy is sharding — vertical/functional partitioning splits a schema or a system, not necessarily across a fleet of identical database nodes. Naming which one you mean avoids a common interview ambiguity.",
      },
    ],
    ripplesInto: ['scaling-progression', 'db-selection'],
    sourceNote: 'synthesized',
  },
  {
    id: 'networking-dns-cdn',
    category: 'backend',
    axes: ['end-to-end'],
    question: 'Before a request reaches any application code, how does it find the system and get served as cheaply as possible?',
    clarifyingSubQuestions: [
      'Is the content static/cacheable, or does it require a live backend response?',
      'Does the system span multiple regions, and does traffic need to be routed to the nearest or healthiest one?',
      "What's the acceptable failover time if a region goes down?",
    ],
    approachOptions: [
      {
        label: 'DNS resolution',
        whenToUse:
          'Every request starts here — domain-to-IP resolution, and (with geo/latency-based routing or Anycast) the layer where traffic gets steered to the nearest or healthiest region before a single packet reaches your infrastructure.',
        tradeoffs:
          "TTL caching makes DNS-level failover slow to propagate — minutes, not seconds — so it's a coarse, not real-time, lever.",
      },
      {
        label: 'CDN / edge caching',
        whenToUse:
          "Static or cacheable content served from a location physically close to the user — the single biggest latency win for content that doesn't change per-request.",
        tradeoffs:
          "Excellent for cache hit rates, but cache invalidation and the static/dynamic content split need a real strategy or stale content ships silently — see the Reference Grid's CDN / edge entry.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'TCP vs UDP is a real fork, not just vocabulary to name-drop',
        dependsOn:
          "TCP guarantees ordered, reliable delivery via handshake, acknowledgment, retransmission, and congestion control — but that reliability costs a connection setup and head-of-line blocking when a single packet is lost. UDP sends packets with no delivery or ordering guarantee at all, trading reliability for lower latency and zero handshake overhead. The fork that actually matters is whether the application can tolerate loss and reordering (DNS queries themselves, video/audio streaming, real-time gaming, where a late packet is worse than a dropped one) or genuinely can't (a file transfer, almost every typical API call). Worth naming if it comes up: HTTP/3 builds its own reliability semantics on top of UDP via QUIC, specifically to avoid paying for all of TCP's guarantees when only some are needed.",
      },
      {
        consideration: "DNS resolution is a caching chain, not a single lookup — and it's why failover is minutes, not seconds",
        dependsOn:
          "A lookup walks browser/OS cache → recursive resolver (the ISP's, or a public one like 8.8.8.8) → root server → TLD server → authoritative server for the domain, and each layer caches the result according to the record's TTL. A long TTL means fast repeat lookups and fewer round trips, but slow failover if the underlying IP needs to change; a short TTL trades the reverse. That's the direct mechanism behind this entry's own claim above that DNS-level failover is minutes, not seconds — it's a consequence of TTL caching at every layer of the chain, not an arbitrary limitation of DNS as a protocol.",
      },
    ],
    ripplesInto: ['hosting-model', 'lb-vs-gateway-vs-proxy', 'consistent-hashing-routing'],
    sourceNote: 'synthesized',
  },
  {
    id: 'authn-vs-authz-vs-security',
    category: 'design',
    axes: ['end-to-end', 'abstraction'],
    question: 'Who is making this request, what are they allowed to do, and how is the whole surface actually protected?',
    clarifyingSubQuestions: [
      'Is identity established once (session) or on every request (stateless token)?',
      'Do permissions depend on role, on specific attributes, or on a relationship to the resource?',
      'Where does encryption need to apply — in transit only, at rest only, or both?',
    ],
    approachOptions: [
      {
        label: 'Authentication (AuthN)',
        whenToUse:
          'Establishing identity — session cookies for traditional web apps, JWTs for stateless/distributed APIs, OAuth for delegated third-party access.',
        tradeoffs:
          "JWTs scale statelessly across instances but can't be revoked before expiry without an extra deny-list; sessions are trivially revocable but need shared or sticky state.",
      },
      {
        label: 'Authorization (AuthZ)',
        whenToUse: 'Once identity is established, deciding what that identity is actually allowed to do.',
        tradeoffs:
          "RBAC/ABAC/ReBAC trade simplicity for flexibility in different ways — see the Reference Grid's AuthN vs AuthZ entry for the full comparison.",
      },
      {
        label: 'Security as the umbrella',
        whenToUse:
          "The practices that protect the whole surface regardless of who's asking — TLS in transit, encryption at rest, input validation against the OWASP Top 10.",
        tradeoffs:
          "None of these are optional trade-offs so much as a floor — see the Reference Grid's Transport encryption, Network security, and Input validation entries.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'AuthN and AuthZ are sequential, not interchangeable',
        dependsOn:
          "Authorization always assumes authentication already happened — a system can't decide what you're allowed to do until it knows who you are. Conflating the two in an interview answer is a common signal of not having the distinction crisp.",
      },
    ],
    ripplesInto: ['hosting-model', 'security-by-design'],
    sourceNote: 'synthesized',
  },
];
