import { Ruler, Database, Layers, Server, Rocket, Monitor, type LucideIcon } from 'lucide-react';

// De-duplicated/synthesized from the source Excalidraw boards (design.excalidraw,
// system_design_MLE.excalidraw), which repeat this content across multiple
// frames — this is a clean, non-redundant pass, not a verbatim transcription.
//
// Six columns matching the SWE Compass's end-to-end axis exactly: design,
// data, model, backend, frontend, ops (deployment + security folded into ops).
export type { SweCompassLifecycleStage as ReferenceGridColumnId } from './sweCompassLifecycle';
import type { SweCompassLifecycleStage } from './sweCompassLifecycle';

export interface ReferenceGridEntry {
  /** Kebab-case, unique across the whole page (not just this file) — rendered
   *  as the entry's scroll-anchor id, so it must not collide with any
   *  question-bank id, framework-step id, or other section id on the page. */
  id: string;
  label: string;
  summary: string;
  details: string[];
}

export interface ReferenceGridColumn {
  id: SweCompassLifecycleStage;
  label: string;
  icon: LucideIcon;
  entries: ReferenceGridEntry[];
}

export const REFERENCE_GRID_COLUMNS: ReferenceGridColumn[] = [
  {
    id: 'design',
    label: 'Design',
    icon: Ruler,
    entries: [
      {
        id: 'requirements-engineering',
        label: 'Requirements engineering',
        summary: 'Functional vs non-functional requirements, scoped and quantified up front.',
        details: [
          'Functional: what the system does — features, user-facing behavior',
          'Non-functional: how well — latency, availability, durability, quantified with real numbers',
        ],
      },
      {
        id: 'sla-slo-sli',
        label: 'SLA / SLO / SLI',
        summary: 'The contract, the internal target, and the measurement that proves it — this is how you evaluate whether a system is actually meeting its goals.',
        details: [
          'SLA: the external promise (often with a penalty for breach)',
          'SLO: the internal target, usually stricter than the SLA',
          'SLI: the actual metric measured to know if the SLO is being met — e.g. p99 request latency, error rate, throughput, uptime',
          "Business-facing evaluation criteria (conversion rate, revenue per request, task-completion rate) are the same idea one level up: they're KPIs the system's SLIs are ultimately in service of, even though they're not usually expressed in this same SLA/SLO/SLI vocabulary",
          'Uptime %: Uptime / (Uptime + Downtime) × 100 — the number an SLA\'s "99.9%" is actually measuring',
          "MTBF (Mean Time Between Failures) and MTTR (Mean Time To Recovery): how often something breaks vs. how fast it's fixed — a system can hit the same uptime target either way, so they're worth tracking as separate SLIs, not collapsed into one blended availability number",
          'Latency SLIs are usually reported as p50/p95/p99 together, not a single average — the tail (p99) is often the story the median hides; round out the panel with cache hit ratio and DB connection count as the other metrics worth watching alongside error rate and uptime %',
        ],
      },
      {
        id: 'cap-theorem',
        label: 'CAP theorem',
        summary: 'Consistency, Availability, Partition tolerance — pick two during a partition.',
        details: [
          'See the Data & Consistency question bank for the full PACELC extension.',
          "The theorem this bounds: replication (how copies stay in sync), sharding (which node owns which data), and partitioning (how a schema or dataset is split) in the Data column all inherit this trade-off — they don't escape it, they each just make it at a different layer.",
          'Real-world classification: Google Spanner and HBase choose CP; Cassandra and DynamoDB choose AP; a single-region RDBMS is CA by default (no partition risk to begin with, since there is only one node).',
        ],
      },
      {
        id: 'fault-tolerance-patterns',
        label: 'Fault-tolerance patterns',
        summary: 'Designing for components failing, not just for the happy path.',
        details: [
          'Redundancy and replication',
          'Graceful degradation — partial functionality over total outage',
          'Circuit breakers and bulkheads to contain failure',
          'Common tooling: Resilience4j or Hystrix implement circuit breakers, retries, and bulkheads as a library instead of hand-rolling them',
        ],
      },
      {
        id: 'single-point-of-failure',
        label: 'Single point of failure (SPOF)',
        summary:
          'Any component whose failure alone can take the whole system down — the anti-pattern the redundancy, circuit-breaker, and bulkhead patterns above exist to eliminate.',
        details: [
          "Always design for high availability: no single server, database, or network link the system can't survive losing",
          'Interview tell: naming SPOFs explicitly, not just "add redundancy," signals you\'re reasoning about failure modes concretely',
        ],
      },
      {
        id: 'timeouts',
        label: 'Timeouts',
        summary: 'Bounding how long a caller waits on a slow dependency before giving up, instead of blocking forever.',
        details: [
          "Without a timeout, one slow downstream service can exhaust a caller's threads or connections and cascade the failure upstream",
          'Pairs with retries and circuit breakers: a timeout ends the wait, a retry decides what to do next, a circuit breaker stops trying once failures are frequent enough',
        ],
      },
      {
        id: 'retry-backoff-jitter',
        label: 'Retry, backoff & jitter',
        summary:
          'Retrying a failed request safely — with exponential backoff and randomized jitter, and only when the operation is idempotent.',
        details: [
          "Exponential backoff: each retry waits longer than the last, so a struggling service isn't hit harder by a burst of retries",
          'Jitter: randomizing that wait prevents every failed client from retrying in lockstep and re-causing the overload (the "thundering herd" problem)',
          'Retrying a non-idempotent operation without care risks applying it twice — see Idempotency in the Backend column',
        ],
      },
      {
        id: 'hld-vs-lld',
        label: 'HLD vs. LLD',
        summary:
          'High-Level Design (components, data flow, APIs at the system scale) vs. Low-Level Design (class structure, object interactions within one component).',
        details: [
          "Most \"system design\" interviews are HLD-scoped; LLD-scoped interviews (class diagrams, design patterns like Strategy/Factory/Observer) are a distinct interview format some companies run separately",
          "This page's 4-step framework is HLD-scoped throughout",
        ],
      },
      {
        id: 'mvc-three-tier-architecture',
        label: 'MVC / three-tier architecture',
        summary: 'The layering model most systems start from, before any monolith-vs-microservices question even applies.',
        details: [
          'Three-tier: presentation (client) → application (business logic) → data (storage), physically or logically separated',
          'MVC: Model / View / Controller — the same separation-of-concerns idea, applied within the application tier',
          'The starting point the Architecture evolution entry above picks up from',
          'Related: layered architecture generalizes this to N horizontal layers instead of exactly three; hexagonal (ports-and-adapters) inverts the dependency so business logic depends on nothing outside it, with adapters plugged in at the edges — both are the same separation-of-concerns instinct, one more layer of abstraction up',
        ],
      },
      {
        id: 'sdlc-environments',
        label: 'SDLC environments',
        summary: 'The progression a change moves through before reaching production.',
        details: ['Local → dev → staging → production, each with rising fidelity to real traffic'],
      },
      {
        id: 'architecture-evolution',
        label: 'Architecture evolution',
        summary: 'Monolith → modular monolith → microservices, as a progression, not a fixed choice.',
        details: ['See the Monolith vs Microservices question for the full trade-off.'],
      },
      {
        id: 'domain-driven-design',
        label: 'Domain-Driven Design (DDD)',
        summary: 'Modeling software around the business domain and its bounded contexts.',
        details: ['Bounded contexts often become the natural seams for a later microservices split.'],
      },
      {
        id: 'cqrs',
        label: 'CQRS',
        summary: 'Separating the read model from the write model.',
        details: ['Lets reads and writes scale and evolve independently, at the cost of eventual consistency between them.'],
      },
      {
        id: 'event-sourcing',
        label: 'Event sourcing',
        summary: 'Storing state as a sequence of events, rather than the current value alone.',
        details: ['Gives a full audit trail and replayability, at the cost of query complexity.'],
      },
      {
        id: 'saga-pattern',
        label: 'Saga pattern',
        summary: 'Coordinating a multi-step transaction across services without a single ACID transaction.',
        details: [
          'Choreography: each service reacts to events independently — no central coordinator, but harder to trace',
          'Orchestration: a central coordinator drives the steps — easier to trace, but a new single point of coordination',
        ],
      },
      {
        id: 'event-driven-architecture',
        label: 'Event-driven architecture',
        summary: 'Services communicate by emitting and reacting to events, rather than calling each other directly.',
        details: [
          "The architectural style the Big Data section's message queues (in the Data column) are the mechanism for — a producer publishes an event and moves on, with zero awareness of who (if anyone) reacts to it",
          'Trades the simplicity of a direct call for looser coupling and independent scaling of producers and consumers — the same trade-off the Saga pattern (choreography) and Event sourcing entries above make in their own specific contexts',
        ],
      },
      {
        id: 'service-mesh',
        label: 'Service mesh',
        summary: 'A dedicated infrastructure layer for service-to-service traffic — mTLS, retries, load balancing, routing, telemetry — implemented via a sidecar proxy deployed alongside every service instance.',
        details: [
          'Applies the Sidecar pattern below at fleet scale: instead of one sidecar solving one cross-cutting concern for one service, every service gets one, and they collectively form the mesh',
          'Moves retry/timeout/mTLS/observability logic out of application code entirely — a genuine win at real microservices scale, but a new operational layer to run and understand, not worth it below that scale',
        ],
      },
      {
        id: 'bff-strangler-fig-sidecar',
        label: 'BFF / strangler-fig / sidecar',
        summary: 'Structural patterns for evolving architecture safely over time.',
        details: [
          'BFF (Backend-for-Frontend): a tailored API layer per client type',
          'Strangler fig: incrementally replacing a legacy system behind a stable interface',
          'Sidecar: attaching cross-cutting concerns (logging, proxying) alongside a service without modifying it — see Service mesh above for this pattern applied across an entire fleet',
        ],
      },
      {
        id: 'capacity-planning-numbers',
        label: 'Numbers to know',
        summary:
          'The latency ladder for back-of-envelope estimates: memory access ~100ns, SSD random read ~100–150μs, same-datacenter round trip ~0.5ms, cross-continent round trip ~150ms.',
        details: [
          'Use these to sanity-check whether a design choice is even physically plausible before optimizing it — no amount of clever code makes a cross-continent round trip cheaper than a same-datacenter one.',
          'Distilled from the standard "numbers every engineer should know" reference used across system-design interview prep.',
        ],
      },
      {
        id: 'memory-hierarchy',
        label: 'Memory hierarchy',
        summary: 'Register → L1/L2/L3 cache → RAM → SSD/disk → network — each level trading capacity for speed, by orders of magnitude at every step.',
        details: [
          "The hierarchy itself, not just the latency figures: the numbers in \"Numbers to know\" above are what this hierarchy's steps cost, this entry is why the steps exist at all — faster memory is exponentially more expensive per byte, so every level is a deliberate capacity/speed trade",
          'This is why access pattern matters as much as raw compute: data laid out for sequential/cache-friendly access can be an order of magnitude faster than the same data accessed randomly, with zero change to the algorithm — see the Memory/data-movement-bound workload option in Hardware reality & capacity planning',
        ],
      },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    entries: [
      {
        id: 'database-taxonomy',
        label: 'Database taxonomy',
        summary: 'Relational, key-value, document, column-family, search, graph, time-series.',
        details: [
          'Each optimized for a different access pattern — see the DB-selection decision tree question',
          'AWS equivalents: RDS/Aurora (relational) · DynamoDB (key-value) · DocumentDB (document) · Neptune (graph) · Redshift (OLAP/warehouse)',
          'NewSQL (CockroachDB, Google Spanner, TiDB) is a third SQL category alongside traditional RDBMS — relational schema and ACID transactions, but built to scale horizontally the way NoSQL does, instead of the classic scale-up-only RDBMS story',
        ],
      },
      {
        id: 'indexing-types',
        label: 'Indexing types',
        summary: 'B-tree, hash, and inverted indexes — each suited to a different query shape.',
        details: [
          'B-tree: range queries and sorted access',
          'Hash: exact-match lookups',
          'Inverted: full-text search',
        ],
      },
      {
        id: 'sharding-strategies',
        label: 'Sharding strategies',
        summary: 'Splitting data across nodes by key range, hash, or a directory lookup.',
        details: [
          'See the Partitioning vs Sharding question for the full range/hash/directory trade-off.',
          'Which shard owns a given key is a routing decision — what guarantee a read/write to it gets is the CAP theorem question in the Design column.',
          "Geo-based sharding is a fourth option alongside range/hash/directory: data is split by region so it sits physically close to the users reading/writing it — lower latency and easier data-residency compliance, at the cost of uneven shard sizes when usage isn't evenly distributed geographically",
        ],
      },
      {
        id: 'replication',
        label: 'Replication',
        summary: 'Synchronous vs asynchronous copies of data across nodes.',
        details: [
          'Sync: strong consistency, higher write latency',
          'Async: lower latency, replicas can lag (reintroduces the consistency-spectrum trade-off)',
          'This is CAP theorem in the Design column applied concretely: sync replication is the CP choice, async is the AP choice',
          'Topology is a separate axis from sync/async: master-slave (primary-replica) routes every write through one primary; master-master (multi-primary) accepts writes on multiple nodes and has to reconcile conflicts between them',
        ],
      },
      {
        id: 'leader-election',
        label: 'Leader election',
        summary: "How a distributed system picks a single coordinating node — the mechanism leader-follower replication assumes already happened.",
        details: [
          'Common approaches: ZooKeeper (ephemeral sequential nodes), Raft consensus, Paxos, the Bully algorithm',
          'Also used outside replication: distributed locks, singleton scheduled jobs, coordinating which node owns a partition',
          'Quorum (R/W): requires a minimum number of nodes to agree on a read or write (e.g. W + R > N) before it counts as successful — how a system stays correct without every node participating in every operation',
          "Gossip protocol: nodes periodically exchange state with a few random peers instead of broadcasting to everyone — how membership and failure info (e.g. Cassandra's ring state) propagates without a central coordinator",
        ],
      },
      {
        id: 'normalization-forms',
        label: 'Normalization forms',
        summary: '1NF → 2NF → 3NF → BCNF, each removing a stricter class of redundancy — see the Normalization question for the full trade-off.',
        details: [
          '1NF: atomic values, no repeating groups',
          '2NF: + no partial dependency on a composite key',
          '3NF: + no transitive dependency between non-key columns',
          'BCNF: + every determinant is a candidate key',
        ],
      },
      {
        id: 'vector-databases',
        label: 'Vector databases',
        summary: 'Storing embeddings and retrieving by similarity — cosine similarity is the common metric — rather than by exact match.',
        details: [
          'The retrieval half of RAG and semantic search: embed content once, then find the nearest neighbors to a query embedding instead of matching keywords',
          'AWS: OpenSearch Service (vector engine), Amazon Kendra; also Pinecone, Weaviate, Milvus, or pgvector on top of Postgres',
        ],
      },
    ],
  },
  {
    id: 'model',
    label: 'Model',
    icon: Layers,
    entries: [
      {
        id: 'feature-engineering-feature-store',
        label: 'Feature engineering & feature store',
        summary: 'Computing model inputs once and reusing them consistently across training and serving.',
        details: [
          'Training/serving skew: features computed by separate code paths for offline training and online serving can silently diverge, degrading production accuracy without any error being thrown',
          'Feature crosses (combining two or more features) capture interaction signal a single feature alone underspecifies',
          'AWS: SageMaker Feature Store',
        ],
      },
      {
        id: 'batch-vs-streaming-feature-computation',
        label: 'Batch vs. streaming feature computation',
        summary: 'Scheduled, periodic feature computation vs continuous, event-driven computation.',
        details: ['See the Batch vs Streaming question for the full trade-off.'],
      },
      {
        id: 'inference-online-vs-batch',
        label: 'Online vs. batch prediction',
        summary: 'Real-time inference on demand vs precomputed batch scoring served from a lookup.',
        details: ['See the Online vs Batch Prediction question for the full trade-off.'],
      },
      {
        id: 'drift-staleness-monitoring',
        label: 'Drift & staleness monitoring',
        summary: 'Distinguishing a changed world from a model that just hasn’t caught up to it.',
        details: ['See the Drift vs Staleness question for the full trade-off.'],
      },
      {
        id: 'model-deployment-risk-ladder',
        label: 'ML deployment risk ladder',
        summary: 'Shadow → canary → A/B test, rising confidence before full rollout.',
        details: [
          'The model-specific analog of the Ops column’s blue-green/canary/rolling/feature-flag deployment strategies — see the ML Deployment Risk Ladder question.',
        ],
      },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    icon: Server,
    entries: [
      {
        id: 'compute-options',
        label: 'Compute options',
        summary: 'Servers, containers, serverless functions — see the Server vs Serverless question.',
        details: ['AWS: EC2 (server) · ECS/EKS (containers) · Lambda (serverless)'],
      },
      {
        id: 'elasticity',
        label: 'Elasticity',
        summary:
          'Scaling capacity up and back down automatically as demand changes — distinct from horizontal scaling, which just means "add more machines."',
        details: [
          "Horizontal scaling describes the mechanism; elasticity describes doing it automatically, in both directions, without a human in the loop",
          "The property that turns \"pay for peak capacity all the time\" into \"pay for what you're using\" — see the Cost Control lever in Cross-Domain Strategies",
        ],
      },
      {
        id: 'caching-layers',
        label: 'Caching layers',
        summary: 'L1 (in-process) → L2 (shared, e.g. Redis) → L3 (CDN/edge).',
        details: ['Each layer trades hit-rate scope for access latency.'],
      },
      {
        id: 'cache-write-patterns',
        label: 'Cache write patterns',
        summary: 'Cache-aside, write-through, write-behind, write-around.',
        details: [
          'Cache-aside: app manages the cache explicitly, simplest and most common',
          'Write-through: writes go to cache and store together, always consistent, higher write latency',
          'Write-behind: writes go to cache first and flush to store async, fastest writes, risk of data loss on cache failure',
          'Write-around: writes go directly to the backing store, bypassing the cache — avoids polluting the cache with data that may never be re-read, at the cost of a guaranteed miss on the first read after a write',
          "Read-through: the cache itself loads on a miss instead of the app doing it — same effect as cache-aside from the caller's perspective, but the load logic lives in the cache layer",
          'Refresh-ahead: the cache proactively re-fetches a hot key before it expires, trading extra background reads for avoiding a cold-cache latency spike right after expiry',
        ],
      },
      {
        id: 'message-brokers',
        label: 'Message brokers',
        summary: 'Kafka, RabbitMQ, SQS — decoupling producers from consumers.',
        details: [
          'See the Message queue delivery model question (push vs. pull) and Message queue topology question (point-to-point vs. pub/sub) in the Data section for the full trade-offs.',
        ],
      },
      {
        id: 'rest-api-fundamentals',
        label: 'REST API fundamentals',
        summary: 'The concrete mechanics behind the "REST" line in API patterns below — the 6 constraints, the verbs, and the wire-level conventions.',
        details: [
          'The 6 REST constraints: client-server, stateless, cacheable, uniform interface, layered system, code-on-demand (optional, rarely used) — a REST API is more or less RESTful by how many of these it actually satisfies, not all-or-nothing',
          'HTTP methods: GET (safe, idempotent), PUT (idempotent, replaces a resource), DELETE (idempotent), PATCH (not idempotent by default, partial update), POST (not idempotent, creates/triggers) — safe means no server-side side effects, idempotent means repeating it leaves the same end state',
          'Status codes: 2xx success (200 OK, 201 Created, 204 No Content), 3xx redirect, 4xx client error (400 bad request, 401 unauthenticated, 403 unauthorized, 404 not found, 429 too many requests), 5xx server error',
          "URL conventions: plural nouns for collections (/users not /user), hierarchical nesting for relationships (/users/{id}/orders), verbs kept out of the path entirely, filter/sort/pagination pushed into query params (?status=active&sort=-created_at&page=2) rather than new endpoints",
        ],
      },
      {
        id: 'fan-out',
        label: 'Fan-out (push vs. pull)',
        summary: 'How one write — a new post, an event — reaches many readers: computed eagerly at write time, or looked up lazily at read time.',
        details: [
          "Fan-out-on-write (push): precompute each follower's feed when the post is made — fast reads, expensive for accounts with huge follower counts",
          'Fan-out-on-read (pull): assemble the feed at read time by querying who the user follows — cheap writes, slower reads',
          'Most large-scale feed systems (Twitter, Instagram) hybridize: push for typical users, pull for celebrity accounts',
        ],
      },
      {
        id: 'dead-letter-queue',
        label: 'Dead letter queue (DLQ)',
        summary: 'A holding queue for messages that failed processing after retries were exhausted, instead of being dropped or retried forever.',
        details: [
          'Keeps one poison message from blocking the whole queue, while still preserving it for inspection or replay',
          'Pairs with the Retry, backoff & jitter pattern in the Design column — the DLQ is where a message goes once its retry budget runs out',
        ],
      },
      {
        id: 'delivery-semantics',
        label: 'Delivery semantics',
        summary: 'What a message broker guarantees about how many times a message is delivered.',
        details: [
          'At-most-once: never redelivered, but can be silently lost',
          'At-least-once: guaranteed delivered, but consumers must handle duplicates — this is where idempotency matters',
          'Exactly-once: the strongest and most expensive guarantee, usually approximated by combining at-least-once delivery with idempotent consumers rather than true exactly-once transport',
        ],
      },
      {
        id: 'api-patterns',
        label: 'API patterns',
        summary: 'HTTP is the transport nearly everything below runs on — REST, GraphQL, gRPC, WebSockets, SSE, and long polling are different contracts built on top of it, each answering a different "how does data actually move" question.',
        details: [
          'REST: resource-oriented, cacheable, the default unless something rules it out',
          'GraphQL: client specifies exactly the fields it needs in one request, avoiding over/under-fetching at the cost of server-side query complexity',
          'gRPC: binary Protocol Buffers over HTTP/2, built for low-latency service-to-service calls, not browser-native',
          'WebSockets / SSE / Long polling: see the Real-time vs Batch question for the full real-time-delivery comparison',
          'Webhooks: the server calls the client back later, out of band — the inverse direction from every option above, used when the client can\'t stay connected waiting for a result; see the Sync vs Async question',
        ],
      },
      {
        id: 'middleware',
        label: 'Middleware',
        summary: 'Composable request/response pipeline interceptors — auth, logging, rate limiting, CORS — that run in-process around a handler.',
        details: [
          "Distinct from an API gateway: middleware runs inside the application's own request pipeline, the gateway sits in front of it as separate infrastructure — the same cross-cutting concerns (auth, rate limiting) can live at either layer, or both",
          'Order matters: middleware runs as a chain, and where a concern sits in that chain (e.g. auth before logging vs. after) changes what each later step can assume',
        ],
      },
      {
        id: 'idempotency',
        label: 'Idempotency',
        summary: "An operation that produces the same result no matter how many times it's safely retried.",
        details: [
          'What makes retries safe in the first place — a client that times out and retries a non-idempotent request (e.g. "charge $50") risks double-charging',
          'Common mechanism: an idempotency key the client generates once per logical operation, which the server checks before re-processing',
        ],
      },
      {
        id: 'rate-limiting',
        label: 'Rate limiting',
        summary: 'Token bucket, leaky bucket, fixed/sliding window — protecting a service from overload.',
        details: [],
      },
      {
        id: 'load-balancing',
        label: 'Load balancing',
        summary: 'Round-robin, least-connections, consistent hashing across backend instances.',
        details: [
          'See the Load Balancer vs API Gateway vs Reverse Proxy question for how this compares to its neighbors.',
          'IP hash: routes by a hash of the client IP, keeping a given client on the same backend without needing sticky-session state',
          'Weighted round robin: round robin, but a heavier-capacity instance gets a proportionally larger share of requests',
          'Least response time: routes to whichever backend is fastest right now, combining connection count with observed latency',
          'Random: picks a backend uniformly at random — cheap to compute, converges to an even split at high volume, weaker guarantees at low volume',
          "LBs commonly terminate SSL/TLS at the edge too, so backend instances handle plaintext traffic and don't each need their own certificate",
        ],
      },
      {
        id: 'health-checks',
        label: 'Health checks',
        summary: 'A load balancer (or orchestrator) periodically probing each backend instance and pulling unhealthy ones out of rotation.',
        details: [
          "What makes load balancing actually fault-tolerant, not just traffic-splitting — without health checks, a load balancer keeps routing to a dead instance",
          'The same mechanism backs container-orchestrator restarts and readiness/liveness probes',
        ],
      },
      {
        id: 'concurrency-vs-parallelism',
        label: 'Concurrency vs. parallelism',
        summary: 'Handling many things at once by interleaving them (concurrency) vs. actually executing many things at the same instant (parallelism).',
        details: [
          'Concurrency: one worker switches between tasks — the right model for I/O-bound work (waiting on network or disk)',
          'Parallelism: multiple workers execute simultaneously — the right model for CPU-bound work (heavy computation)',
          'A single-core system can be concurrent without being parallel; parallelism requires multiple cores or machines',
        ],
      },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: Monitor,
    entries: [
      {
        id: 'rendering-strategies',
        label: 'Rendering strategies',
        summary: 'SSR, SSG, ISR, CSR — each trading freshness for build/serve cost.',
        details: [
          'SSR: rendered per-request, always fresh, higher server cost',
          'SSG: rendered at build time, fastest to serve, staler content',
          'ISR: SSG with periodic background regeneration',
          'CSR: rendered in the browser, best for highly interactive apps',
        ],
      },
      {
        id: 'cdn-edge',
        label: 'CDN / edge',
        summary: 'Serving static and cacheable content from a location close to the user.',
        details: [
          'See the Networking, DNS & CDN question for cache-invalidation and static/dynamic-split trade-offs.',
          'AWS: CloudFront (CDN) · Route 53 (DNS)',
          'Other vendors: Google Cloud CDN, Azure CDN, Fastly, Akamai, Cloudflare — same edge-cache model, different points of presence and pricing',
          "Core benefit is three-fold: lower latency (served from a nearby edge, not the origin), higher availability (the edge absorbs traffic spikes instead of the origin taking the full hit), and reduced origin bandwidth cost",
        ],
      },
      {
        id: 'core-web-vitals',
        label: 'Core Web Vitals',
        summary: 'LCP, INP, CLS — the user-perceived performance metrics Google measures.',
        details: [],
      },
      {
        id: 'state-management-ladder',
        label: 'State-management ladder',
        summary: 'Local component state → context → a dedicated state library, escalating only as needed.',
        details: [],
      },
      {
        id: 'testing-pyramid',
        label: 'Testing pyramid',
        summary: 'Many unit tests, fewer integration tests, few E2E tests.',
        details: [],
      },
    ],
  },
  {
    id: 'ops',
    label: 'Ops',
    icon: Rocket,
    entries: [
      {
        id: 'containerization',
        label: 'Containerization',
        summary: 'Packaging an app with its dependencies for consistent environments.',
        details: [],
      },
      {
        id: 'ci-cd-pipeline',
        label: 'CI/CD pipeline',
        summary: 'Automated build, test, and deploy stages triggered on every change.',
        details: [],
      },
      {
        id: 'deployment-strategies',
        label: 'Deployment strategies',
        summary: 'Blue-green, canary, rolling, feature flags — see the ML Deployment Risk Ladder question for the model-specific analog.',
        details: [
          'Blue-green: two full environments, instant cutover and rollback',
          'Canary: gradual traffic shift to the new version',
          'Rolling: instance-by-instance replacement, no full duplicate environment needed',
          'Feature flags: decouple deploy from release entirely',
        ],
      },
      {
        id: 'infrastructure-as-code',
        label: 'Infrastructure as code',
        summary: 'Declaring infrastructure in version-controlled config rather than manual setup.',
        details: [],
      },
      {
        id: 'observability-red-use',
        label: 'Observability (RED / USE)',
        summary: 'Three complementary pillars: metrics tell you something is wrong, logs and traces tell you what.',
        details: [
          'RED (request-scoped metrics): Rate, Errors, Duration',
          'USE (resource-scoped metrics): Utilization, Saturation, Errors',
          "Logs: the diagnostic detail an aggregated metric can't carry — what actually happened on one specific failed request, with full context, not just that the error count went up",
          "Traces: a single request's path across every service it touched, with per-hop timing — the pillar that answers \"which of these five services is actually where my latency is coming from\"",
          'Common tooling: Prometheus + Grafana for metrics collection and dashboards, Datadog or CloudWatch as managed alternatives',
        ],
      },
      {
        id: 'logging',
        label: 'Logging',
        summary: 'Structured, centralized logs — the raw detail behind the "Logs" pillar in Observability (RED/USE) above, elaborated on its own terms.',
        details: [
          "Structured over free-text: JSON logs with consistent fields (timestamp, service, level, request/correlation id) are queryable and aggregable — a printf string isn't",
          'Consistent log levels: DEBUG/INFO/WARN/ERROR, applied the same way across services so a WARN in one service signals the same urgency as a WARN in another',
          "Correlation/request IDs: one ID generated at the edge and threaded through every downstream call, so a single request's full path across services can be reconstructed from logs alone",
          "Centralized pipeline: app → collector (Fluentd, Filebeat) → storage/search (the ELK stack's Elasticsearch, or Grafana Loki) → dashboard (Kibana or Grafana) — shipping logs off-instance means they survive the instance dying, and become searchable across the whole fleet at once",
        ],
      },
      {
        id: 'disaster-recovery-tiers',
        label: 'Disaster-recovery tiers',
        summary: 'Backup/restore → pilot light → warm standby → multi-site active-active, in rising cost and readiness.',
        details: [],
      },
      {
        id: 'authn-vs-authz',
        label: 'AuthN vs AuthZ',
        summary: 'Authentication (who you are) vs authorization (what you’re allowed to do).',
        details: [
          'RBAC: role-based access control',
          'ABAC: attribute-based access control',
          'ReBAC: relationship-based access control',
          'See the Authentication vs Authorization vs Security question for the full comparison, including where security-as-a-whole fits.',
        ],
      },
      {
        id: 'secrets-management',
        label: 'Secrets management',
        summary: 'Environment variables and dedicated secret stores — never hardcoded.',
        details: ['AWS: Secrets Manager, KMS'],
      },
      {
        id: 'transport-encryption',
        label: 'Transport encryption',
        summary: 'TLS everywhere data moves between systems.',
        details: [],
      },
      {
        id: 'input-validation',
        label: 'Input validation',
        summary: 'OWASP Top 10 — the standard reference for common vulnerability classes.',
        details: [
          'Security goal is the CIA triad: Confidentiality (only authorized parties can read data), Integrity (data isn\'t tampered with, in transit or at rest), Availability (the system stays usable under load or attack) — everything below is in service of one of these three',
          "Concrete threat catalog: XSS (untrusted input rendered as executable script), CSRF (a forged request riding an authenticated session), SQL/NoSQL injection (untrusted input reaching a query unescaped), IDOR / broken access control (an authenticated user reaching another user's resource by guessing an ID), DoS/DDoS (overwhelming the system with volume rather than exploiting a flaw)",
        ],
      },
      {
        id: 'network-security',
        label: 'Network security',
        summary: 'VPCs, security groups, firewalls — controlling what can reach what.',
        details: [],
      },
      {
        id: 'compliance',
        label: 'Compliance',
        summary: 'GDPR, HIPAA, PCI-DSS, SOC2 — constraints that can shape hosting/data decisions upstream.',
        details: [],
      },
    ],
  },
];
