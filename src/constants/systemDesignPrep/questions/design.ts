import type { SystemDesignQuestion } from './types';

export const DESIGN_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'cap-vs-pacelc',
    category: 'design',
    question:
      'When the network partitions, what breaks — availability or consistency? And even when it doesn’t, what do you trade for lower latency?',
    clarifyingSubQuestions: [
      'If a partition happens, can this system reject writes/reads (favoring consistency) or must it keep serving (favoring availability)?',
      'Absent a partition, is there still a latency-vs-consistency trade being made on every request (PACELC’s "else" clause)?',
      'Is a partition actually likely for this deployment topology, or is this a single-region system where the P in CAP rarely fires in practice?',
    ],
    approachOptions: [
      {
        label: 'CP (consistency over availability)',
        whenToUse:
          'Financial ledgers, inventory counts, anything where serving stale or conflicting data is worse than an error page.',
        tradeoffs:
          'Nodes on the minority side of a partition refuse requests until they can confirm they have the latest state — real, user-visible downtime during a partition.',
      },
      {
        label: 'AP (availability over consistency)',
        whenToUse:
          'Social feeds, shopping carts, presence indicators — anywhere a slightly stale read is acceptable and staying up matters more.',
        tradeoffs:
          'Every node keeps serving during a partition, but different nodes can disagree until they reconcile — requires a conflict-resolution strategy (last-write-wins, CRDTs, application-level merge).',
      },
      {
        label: 'PACELC’s "else": latency vs consistency with no partition at all',
        whenToUse:
          'Any system, at all times — this is the trade you’re making on the happy path, not just during failures.',
        tradeoffs:
          'Synchronous replication for strong consistency adds round-trip latency to every write; async replication is fast but leaves a window where a reader can see stale data.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'CAP is a partition-time statement, not a permanent system label',
        dependsOn:
          'A system can be CP during a partition and still make a separate latency/consistency trade the rest of the time — PACELC exists precisely because CAP alone underspecifies steady-state behavior.',
      },
    ],
    ripplesInto: ['consistency-spectrum', 'db-selection', 'partitioning-vs-sharding'],
    sourceNote: 'board',
  },
  {
    id: 'monolith-vs-microservices',
    category: 'design',
    question: 'Should this ship as one deployable unit, or as independently-deployable services?',
    clarifyingSubQuestions: [
      'How many teams need to own and deploy different parts of this system independently?',
      'Do different parts of the system have wildly different scaling profiles that a single deployable can’t serve efficiently?',
      'Is the domain boundary between components actually well understood yet, or still in flux?',
    ],
    approachOptions: [
      {
        label: 'Monolith',
        whenToUse: 'Early-stage products, small teams, or domains still being discovered — one deployable, one datastore, simplest operational surface.',
        tradeoffs: 'Fast to build and reason about, but scaling and deploying one piece means scaling/deploying the whole thing.',
      },
      {
        label: 'Modular monolith',
        whenToUse: 'Team wants clear internal domain boundaries (for a future split) without paying distributed-systems tax today.',
        tradeoffs: 'Keeps deployment simple while enforcing module boundaries in code — the natural middle ground, and often underrated.',
      },
      {
        label: 'Microservices',
        whenToUse: 'Multiple teams need independent deploy cadences, or components have genuinely different scaling/reliability needs.',
        tradeoffs: 'Independent scaling and deployment, at the cost of network calls between services, distributed debugging, and real operational overhead.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Splitting too early is a common staff-level anti-pattern',
        dependsOn:
          'Domain boundaries are usually clearer after a system has been in production for a while — premature microservices split along guessed boundaries that get expensive to redraw later.',
      },
    ],
    ripplesInto: ['stateless-vs-stateful', 'scaling-progression'],
    sourceNote: 'board',
  },
  {
    id: 'build-vs-buy-decision',
    category: 'design',
    question:
      'Should this capability be built in-house, or adopted as an existing managed service, SaaS, or open-source library?',
    clarifyingSubQuestions: [
      'Is this capability actually the thing that differentiates the product, or is it commodity infrastructure every product needs?',
      'Do mature, well-supported solutions already exist for this problem, or would adopting one mean bending the product around a poor fit?',
      'What does the recurring cost (dollars, vendor risk, integration surface) of buying compare to the ongoing engineering cost of owning it forever?',
    ],
    approachOptions: [
      {
        label: 'Buy / adopt an existing solution',
        whenToUse:
          'The capability is not a differentiator for this product and mature solutions already exist — auth, payments, rate limiting.',
        tradeoffs:
          'Fast to ship and offloads ongoing maintenance to the vendor, but adds recurring cost and real vendor lock-in.',
      },
      {
        label: 'Build in-house',
        whenToUse:
          'The capability IS the differentiator, or a hard constraint (e.g. a $0 budget) rules out every paid option.',
        tradeoffs:
          'Full control and no recurring cost, but the team owns every bug, edge case, and security patch for as long as the system lives.',
      },
      {
        label: 'Hybrid — thin wrapper around an open-source or managed core',
        whenToUse:
          'The common middle case: most of the problem is commodity, but a specific piece needs product-specific behavior.',
        tradeoffs:
          'Balances speed and control, but needs an explicit customization boundary decided up front, or the "thin" wrapper quietly grows into a second implementation.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This mirrors a staff-level signal already tracked elsewhere on this page',
        dependsOn:
          'The difference is deciding it here, for a specific system, not just recognizing it as a competency — see the "Shows build-vs-buy judgment" staff signal for the general pattern this question turns into a concrete decision cascade.',
      },
      {
        consideration: 'How replaceable is this component later, if the buy decision turns out wrong?',
        dependsOn:
          'A buy decision behind a clean internal interface can be swapped for a build later at moderate cost; a buy decision woven directly through the codebase turns "wrong vendor" into a much larger rewrite than the original decision implied.',
      },
    ],
    ripplesInto: [],
    sourceNote: 'synthesized',
  },
  {
    id: 'hardware-reality-and-capacity-planning',
    category: 'design',
    question:
      'Before any code is written, does the underlying hardware and network reality change the shape of this design?',
    clarifyingSubQuestions: [
      'Is this workload dominated by CPU cycles, by moving data through memory, by network round trips, or by disk I/O — and does that change which component of the design needs to scale first?',
      'Is that even knowable at design time, or does it only become clear once real traffic hits a running system and can be profiled?',
      'If it’s not knowable yet, is the design at least built so a wrong initial guess (e.g. provisioning for compute when the real bottleneck is network) is cheap to correct later?',
    ],
    approachOptions: [
      {
        label: 'Compute-bound workloads',
        whenToUse:
          'Heavy computation on data already in memory — encoding, dense ML inference, cryptographic hashing.',
        tradeoffs:
          'More/faster cores and parallelization help directly, but Amdahl’s law caps the return on parallelizing a workload that has any sequential portion at all.',
      },
      {
        label: 'Memory/data-movement-bound workloads',
        whenToUse:
          'The working set doesn’t fit in fast memory — large joins, wide scans, anything that spends more time shuffling data than computing on it.',
        tradeoffs:
          'Better caching, columnar formats, and reducing data movement help; throwing more CPU cores at it does nothing if the cores are idle waiting on memory bandwidth.',
      },
      {
        label: 'Network-bound workloads',
        whenToUse:
          'Latency dominated by round trips between services or regions, not by local computation — chatty microservices, cross-region calls.',
        tradeoffs:
          'Batching requests and colocating services that talk to each other constantly cuts round trips; adding raw compute to either side does nothing about the wire time in between.',
      },
      {
        label: 'Disk/storage I/O-bound workloads',
        whenToUse:
          'Random reads/writes against a dataset too large for memory — large transactional databases, log-heavy systems.',
        tradeoffs:
          'Faster storage (SSD/NVMe) and higher IOPS provisioning help directly; more CPU or RAM elsewhere in the system won’t move data off disk any faster.',
      },
    ],
    implementationNotes: [
      {
        consideration:
          'This is the same axis the Ops-stage "compute vs memory bound" question asks, applied earlier',
        dependsOn:
          'That question diagnoses a bottleneck in a system that already exists and is running, using real profiling data. This one estimates the same thing before anything is built, when the only tools are back-of-envelope math and known-workload intuition — see the compute-vs-memory-bound question for the profiling-time version of the same question.',
      },
      {
        consideration: 'Back-of-envelope estimates need real reference numbers, not guesses',
        dependsOn:
          'See the "Numbers to know" entry in the Design column of the Reference Grid for the concrete memory/disk/network latency figures this kind of estimate has to be grounded in.',
      },
    ],
    ripplesInto: ['compute-vs-memory-bound', 'scaling-progression'],
    sourceNote: 'synthesized',
  },
  {
    id: 'security-by-design',
    category: 'design',
    question:
      'Once identity and access boundaries are decided, how does that decision propagate through the system — because enforcement varies by layer, and retrofitting it later is expensive.',
    clarifyingSubQuestions: [
      'Does access control need to be decided once, at a single gateway-level check, or enforced independently at every layer it touches — DB row-level security, server-side session/JWT validation, API-gateway authorization?',
      'When one internal service calls another on behalf of a user, does the downstream service re-validate that user’s access, or does it implicitly trust whatever the upstream service already checked?',
      'If the answer to enforcement-per-layer changes later, how much of the system has to be touched to change it?',
    ],
    approachOptions: [
      {
        label: 'Enforce once, at the edge (API gateway / BFF)',
        whenToUse:
          'Simple systems with a small number of trusted internal services and a single, well-defined entry point.',
        tradeoffs:
          'Simplest to build and reason about, but every downstream service implicitly trusts the edge — a single compromised or misconfigured edge check is a total bypass for everything behind it.',
      },
      {
        label: 'Enforce at every layer independently (defense in depth)',
        whenToUse:
          'Systems handling sensitive data, or with enough internal services that any one of them being wrong is a real risk.',
        tradeoffs:
          'DB row-level security, service-level checks, and gateway-level checks all agreeing is much harder to bypass with a single mistake, but real duplication of authorization logic across layers, with a real risk the layers drift out of agreement over time.',
      },
      {
        label: 'Enforce at the service boundary that owns the data',
        whenToUse:
          'Domain-driven systems where each service already owns a clear slice of data and wants to be the sole authority over who can touch it.',
        tradeoffs:
          'Each service trusts only identity (who the caller is) from upstream, not authorization (what they’re allowed to do) — keeps authorization logic colocated with the data it protects, but means every service has to implement its own access checks rather than relying on a shared layer.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This is a design-phase decision, not a hardening pass done later',
        dependsOn:
          'Retrofitting security boundaries into an architecture that was built without them is a much larger rewrite than deciding upfront which layer is the source of truth for authorization — the earlier this is decided, the cheaper every later layer is to build correctly against it.',
      },
    ],
    ripplesInto: ['authn-vs-authz-vs-security'],
    sourceNote: 'synthesized',
  },
  {
    id: 'lb-vs-gateway-vs-proxy',
    category: 'design',
    question: 'Where does traffic get distributed, translated, or intercepted before it reaches a backend instance?',
    subsectionLabel: 'Components of System Design',
    subsectionDescription:
      "The concrete building blocks a request passes through and gets checked against before any application code runs — where traffic enters and gets routed, how it finds the system at all, and who's allowed to be making it — worked as full trade-off comparisons rather than named in passing.",
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
    id: 'networking-dns-cdn',
    category: 'design',
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
