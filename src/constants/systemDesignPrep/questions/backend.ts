import type { SystemDesignQuestion } from './types';

export const BACKEND_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'real-time-vs-batch',
    category: 'backend',
    question:
      'Does the consumer need this the instant it changes, or is periodic/on-demand delivery acceptable?',
    clarifyingSubQuestions: [
      "What's the acceptable staleness window — seconds, minutes, hours?",
      'Is the consumer push-capable (can hold a connection open) or pull-only?',
      'Is this client-facing (browser/mobile) or internal service-to-service?',
      "What's the fan-out — one consumer, thousands, millions?",
    ],
    approachOptions: [
      {
        label: 'WebSockets',
        whenToUse:
          'Client-facing, real-time, bidirectional — chat, collaborative editing, anything needing client→server AND server→client.',
        tradeoffs:
          'Stateful connection; needs a pub/sub backplane (Redis, NATS) to broadcast across horizontally-scaled server nodes.',
      },
      {
        label: 'Server-Sent Events (SSE)',
        whenToUse: 'Client-facing, real-time, server→client only — live feeds, notifications, progress updates.',
        tradeoffs:
          'Simpler than WebSockets, HTTP-native, auto-reconnect built in — but one-directional only.',
      },
      {
        label: 'Long polling',
        whenToUse:
          'Real-time delivery under compatibility constraints — legacy clients or restrictive networks/firewalls that block persistent connections.',
        tradeoffs: 'Highest latency and server overhead of the three, but the most broadly compatible.',
      },
      {
        label: 'REST or GraphQL',
        whenToUse:
          'Batch-acceptable, client-facing — standard CRUD/resource access where staleness of seconds-to-minutes is fine.',
        tradeoffs:
          'REST is simple and cacheable; GraphQL avoids over/under-fetching at the cost of query complexity.',
      },
      {
        label: 'gRPC over REST',
        whenToUse:
          'Internal, performance-sensitive service-to-service calls where latency and strongly-typed contracts matter.',
        tradeoffs:
          "HTTP/2 multiplexing and binary protobuf payloads beat REST/JSON on latency and payload size, but it's not browser-native and needs a gateway/BFF translation layer for client-facing use.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'Language/runtime choice for gRPC services',
        dependsOn:
          "gRPC's codegen and tooling story favors statically-typed languages — Go and Java are common defaults in the ecosystem. Python and TypeScript work fine too but often carry more runtime/tooling overhead for high-throughput internal services. This is highly context-dependent: a team's existing language stack, hiring pool, and existing service-mesh tooling usually outweigh the theoretical 'best' choice — reasonable engineers differ here.",
      },
      {
        consideration: 'Scaling WebSockets horizontally',
        dependsOn:
          'A single app server can hold a bounded number of open connections; scaling past one node needs a pub/sub backplane (Redis Pub/Sub, NATS) so a message published on one node reaches a client connected to another.',
      },
    ],
    ripplesInto: ['hosting-model', 'server-vs-serverless'],
    sourceNote: 'synthesized',
  },
  {
    id: 'sync-vs-async',
    category: 'backend',
    question:
      'Does the caller block waiting for a response, or fire a request and move on?',
    clarifyingSubQuestions: [
      'Does the caller need the result to proceed immediately, or can it continue and be notified later (callback, webhook, polling)?',
      'Is the downstream operation fast and reliable, or slow/unreliable enough that blocking would tie up caller resources?',
      'Does this operation need to be retried or queued if the downstream is temporarily unavailable?',
    ],
    approachOptions: [
      {
        label: 'Synchronous (request/response)',
        whenToUse: 'The caller genuinely needs the result before it can proceed — reading a user profile before rendering a page.',
        tradeoffs: 'Simple to reason about, but the caller is blocked (and its resources tied up) for the full duration of the downstream call.',
      },
      {
        label: 'Async via queue/message broker',
        whenToUse: 'Fire-and-continue work — sending an email, processing an uploaded video, updating a search index.',
        tradeoffs: 'Decouples caller from callee and smooths traffic spikes, but adds eventual-consistency and requires the caller to handle "not done yet" states.',
      },
      {
        label: 'Async via callback/webhook',
        whenToUse: 'Long-running third-party operations (payment processing, batch jobs) where polling would be wasteful.',
        tradeoffs: "Efficient — no polling — but requires the caller to expose a reachable endpoint and handle the callback arriving out of order or more than once.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'Async doesn’t remove the need for a response — it changes its shape',
        dependsOn:
          'Even fire-and-forget work usually needs some way for the caller to check status later (a job ID, a webhook, a polling endpoint) — "async" is not the same as "the caller never finds out."',
      },
    ],
    ripplesInto: ['real-time-vs-batch'],
    sourceNote: 'board',
  },
  {
    id: 'server-vs-serverless',
    category: 'backend',
    question: 'Should this run on a long-lived server process, or as short-lived, event-triggered functions?',
    clarifyingSubQuestions: [
      'Is there state that needs to persist between requests in-memory (favors server)?',
      "Is load spiky/unpredictable (favors serverless's pay-per-invocation)?",
      'Does the workload need to hold a long-lived connection (WebSockets, streaming) — most FaaS platforms cap execution time and don’t suit this well.',
    ],
    approachOptions: [
      {
        label: 'Traditional server',
        whenToUse: 'Steady load, long-lived connections, in-memory caching between requests.',
        tradeoffs: 'You manage scaling, and idle capacity costs money even at zero traffic.',
      },
      {
        label: 'Serverless / FaaS',
        whenToUse: 'Spiky/unpredictable load, event-driven workloads, wanting zero idle cost.',
        tradeoffs: 'Cold starts, execution time limits, no in-memory state between invocations.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Vendor-specific limits',
        dependsOn:
          'Execution time caps and cold-start behavior vary significantly by provider (AWS Lambda vs. Vercel Functions vs. Cloudflare Workers) — the specific limits are a real implementation constraint but shouldn’t drive the initial server-vs-serverless call, which should be made on workload shape first.',
      },
    ],
    ripplesInto: ['real-time-vs-batch', 'hosting-model'],
    sourceNote: 'synthesized',
  },
  {
    id: 'stateless-vs-stateful',
    category: 'backend',
    question:
      'Can any instance handle any request, or does a request need to land on the instance holding its state?',
    clarifyingSubQuestions: [
      'Is per-request state (session data, in-memory cache, an open connection) held on the instance itself, or externalized to a shared store?',
      'If an instance dies mid-request, is that state recoverable elsewhere, or is it lost?',
      'Does the load balancer need sticky sessions, or can it route purely round-robin?',
    ],
    approachOptions: [
      {
        label: 'Stateless',
        whenToUse: 'Any request can be served by any instance because all needed state lives externally (DB, cache, token).',
        tradeoffs: 'Trivially horizontally scalable and resilient to instance failure, but every piece of state needs an external home, which can add latency.',
      },
      {
        label: 'Stateful',
        whenToUse: 'In-memory game state, WebSocket connections, or anything where re-fetching state on every request would be too slow.',
        tradeoffs: 'Faster access to local state, but requires sticky routing and losing an instance means losing (or needing to recover) its state.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Externalizing state is the usual path from stateful to stateless',
        dependsOn:
          'Moving session data into Redis, or connection state into a shared pub/sub layer, is the typical refactor that unlocks stateless horizontal scaling — worth naming explicitly rather than treating statelessness as a starting assumption.',
      },
    ],
    ripplesInto: ['monolith-vs-microservices', 'scaling-progression'],
    sourceNote: 'board',
  },
  {
    id: 'latency-vs-throughput',
    category: 'backend',
    question: 'Are you optimizing for how fast one request completes, or how many requests complete per unit time?',
    clarifyingSubQuestions: [
      'Does the user directly experience per-request latency (interactive UI), or only aggregate system throughput (batch pipeline)?',
      'Is there room to batch requests together to improve throughput, and can the use case tolerate the added per-request latency that batching introduces?',
      'What’s the actual SLA — a p99 latency target, or a requests-per-second target?',
    ],
    approachOptions: [
      {
        label: 'Optimize for latency',
        whenToUse: 'Interactive, user-facing requests — search-as-you-type, page loads, anything with a human waiting.',
        tradeoffs: 'Fast individual responses, often at the cost of lower overall throughput (less batching, less resource sharing).',
      },
      {
        label: 'Optimize for throughput',
        whenToUse: 'Batch processing, bulk ingestion, background jobs — nobody is watching a single request complete.',
        tradeoffs: 'Batching and queuing maximize total work done per second, but individual items wait longer before being processed.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'These genuinely trade against each other, not just conceptually',
        dependsOn:
          'Batching requests together (e.g. for a GPU inference call) raises throughput but adds queueing delay to each individual request — the right batch size is a direct latency/throughput dial, not a free win.',
      },
    ],
    ripplesInto: ['compute-vs-memory-bound', 'online-vs-batch-prediction'],
    sourceNote: 'synthesized',
  },
  {
    id: 'live-compute-vs-precompute',
    category: 'backend',
    question:
      'Should this result be computed live, in the request path, or precomputed ahead of time and served from a cached or materialized store?',
    clarifyingSubQuestions: [
      'Is the input space bounded and enumerable, or effectively unbounded/highly dynamic?',
      'Does the computation depend on context that only exists at request time, or can it be fully determined ahead of the request?',
      'If precomputed, how would staleness actually be detected and invalidated — is there a real trigger, or just a timer?',
    ],
    approachOptions: [
      {
        label: 'Live / on-demand computation',
        whenToUse:
          'An unbounded or highly dynamic input space, or a result that depends on request-time context that can’t be known in advance.',
        tradeoffs: 'Always fresh, but every request pays the full compute and latency cost.',
      },
      {
        label: 'Precomputed / materialized',
        whenToUse:
          'A bounded, enumerable input space, or an expensive computation worth amortizing — nightly aggregates, denormalized read models.',
        tradeoffs: 'Near-instant reads, but staleness is bounded by the last precompute run.',
      },
      {
        label: 'Hybrid: compute-then-cache',
        whenToUse:
          'A large but skewed/long-tail input space, where a small hot set dominates traffic.',
        tradeoffs:
          'Captures most of the benefit of both, but needs a real invalidation strategy or it silently serves stale results forever.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This is easy to confuse with three neighboring questions — worth disambiguating explicitly',
        dependsOn:
          'sync-vs-async is about whether the CALLER waits for the response; real-time-vs-batch and batch-vs-streaming are about the DELIVERY CADENCE of an already-produced result; this question is about WHEN the underlying computation itself happens relative to the request. And unlike online-vs-batch-prediction (the ML-specific inference-serving-cadence question), this is the generalized version that applies to any expensive computation, not just model inference.',
      },
    ],
    ripplesInto: ['online-vs-batch-prediction', 'sync-vs-async', 'real-time-vs-batch'],
    sourceNote: 'synthesized',
  },
  {
    id: 'rate-limiting-strategy',
    category: 'backend',
    question: 'How do you protect a service from being overwhelmed by one client or a traffic spike?',
    clarifyingSubQuestions: [
      'Is the limit enforced per-client, or as one global ceiling across every caller?',
      'Does legitimate traffic genuinely need short bursts above the sustained rate, or is a strictly even rate acceptable?',
      "What identifies \"a client\" — IP address, authenticated user ID, or API key — and how reliable is that identifier (NAT/proxies flatten many real users behind one IP)?",
      'When the limit is exceeded, does the caller get rejected outright (429 + Retry-After), or throttled/queued and served late?',
      'Is this enforced by a single node, or does it need to hold consistent state across a horizontally-scaled fleet?',
    ],
    approachOptions: [
      {
        label: 'Token bucket',
        whenToUse:
          'Need to allow short bursts up to a cap while still enforcing a steady average rate — the default choice for most public APIs (variants of this back AWS and Stripe rate limits).',
        tradeoffs:
          'Cheap to check (compare token count, decrement), naturally burst-tolerant — but tuning bucket size and refill rate to match real traffic shape takes iteration, not a formula.',
      },
      {
        label: 'Leaky bucket',
        whenToUse:
          'Need to smooth bursty input into a strictly constant output rate — protecting a fixed-capacity downstream (a worker pool, a legacy system) that can\'t absorb any burst at all.',
        tradeoffs:
          'Guarantees a constant outflow regardless of how input arrives, but excess requests queue or drop rather than passing through — under sustained overload the queue itself becomes a memory/latency liability.',
      },
      {
        label: 'Fixed window counter',
        whenToUse:
          'Simplicity matters more than precision — a quick global cap like "1000 requests per minute" behind a single counter.',
        tradeoffs:
          'Trivial to implement (an atomic INCR + TTL in Redis), but allows up to ~2x the stated limit right at the window boundary — a burst at 11:59:59 and another at 12:00:00 both pass unpenalized.',
      },
      {
        label: 'Sliding window counter',
        whenToUse:
          'Need the fixed window\'s simplicity without its boundary-burst flaw — most production rate limiters (Cloudflare, common API-gateway defaults) land here as the practical middle ground.',
        tradeoffs:
          "Weights the previous window's count by how much of it still overlaps the current window, which closes the boundary gap at a fraction of the memory cost of a true sliding log (which stores every request timestamp for exact precision) — an approximation that's accurate enough for almost every real use case, not an exact count.",
      },
    ],
    implementationNotes: [
      {
        consideration: 'Where enforcement lives changes what it actually protects',
        dependsOn:
          "Edge/CDN (Cloudflare, AWS WAF) stops abusive traffic before it costs you any compute at all — the cheapest place to block a true volumetric spike. API gateway (Kong, Envoy, NGINX) is the more common day-to-day layer, enforcing per-client/per-key policy in one place for every downstream service. Application-layer limiting sees the most business context (e.g. a single expensive endpoint deserves a tighter cap than the rest of the API), but by then the request has already paid for a network hop and a process to reject it.",
      },
      {
        consideration: "A single node can count in memory; more than one node can't",
        dependsOn:
          "Once traffic is spread across multiple app instances, an in-process counter only sees its own slice of requests — a client can blow past the intended limit just by landing on enough different nodes. Distributed rate limiting needs shared state (Redis INCR/EXPIRE, or a Lua script for atomicity) so every node is checking and incrementing the same counter, not five separate ones.",
      },
    ],
    ripplesInto: ['lb-vs-gateway-vs-proxy', 'security-by-design'],
    sourceNote: 'synthesized',
  },
  {
    id: 'api-versioning',
    category: 'backend',
    question: "How do you evolve an API's contract without breaking the clients that are already depending on the old one?",
    clarifyingSubQuestions: [
      'How many external consumers depend on backward compatibility, and do you control their release cadence or not?',
      'Is this a public API with unknown, uncoordinated consumers, or an internal API where a synchronized rollout is possible?',
      'Is the change additive (a new optional field) or breaking (a renamed/removed field, changed semantics) — only breaking changes actually require a new version.',
      "What's the deprecation window — how long does the old version stay live after the new one ships, and how is that communicated to consumers?",
      'Does a client need to discover which versions exist and pick one, or is a single implicit default acceptable?',
    ],
    approachOptions: [
      {
        label: 'URI versioning (`/v1/users`)',
        whenToUse:
          'Public APIs and anything where discoverability and cacheability matter most — the version is visible in every log line, browser address bar, and CDN cache key.',
        tradeoffs:
          'Simplest to implement, test, and cache (each version is a genuinely distinct URL) — but it puts an implementation detail in the resource path, so "the same resource" now has multiple canonical URLs.',
      },
      {
        label: 'Header versioning (`Accept: application/vnd.app.v1+json`)',
        whenToUse:
          'APIs that want the URL to stay a pure resource identifier and treat the version as metadata about the representation, not the resource\'s identity — common in stricter REST implementations.',
        tradeoffs:
          'Keeps URLs clean and semantically correct, but is harder to test from a browser, less discoverable to a new consumer skimming the docs, and CDNs need explicit config to vary the cache by header instead of defaulting to URL.',
      },
      {
        label: 'Query-parameter versioning (`/users?version=1`)',
        whenToUse:
          "A middle ground — version stays visible and easy to test in a browser like URI versioning, without minting a whole new path segment or route table per version.",
        tradeoffs:
          'Easy to default (omit the param) and easy to test, but query params conventionally mean filtering/sorting, not identity — mixing the two is a recurring source of confusion, and caching by query string is less consistently supported than caching by path.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Only breaking changes need a new version at all',
        dependsOn:
          'Adding an optional field or a new endpoint is backward-compatible and needs no version bump — versioning exists to protect consumers from changes they cannot safely ignore (removed/renamed fields, changed status codes, changed semantics). Treating every change as version-worthy fragments the API and multiplies the surface area you have to keep supporting.',
      },
      {
        consideration: 'A version shipped without a deprecation policy is a version that never gets retired',
        dependsOn:
          "Shipping v2 without a committed sunset date for v1 means both have to be maintained indefinitely — the real ongoing cost isn't which versioning scheme you picked, it's the support burden of every version you've ever shipped and never turned off.",
      },
    ],
    ripplesInto: ['lb-vs-gateway-vs-proxy', 'monolith-vs-microservices'],
    sourceNote: 'synthesized',
  },
];
