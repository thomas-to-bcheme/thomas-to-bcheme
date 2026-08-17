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
        label: 'Requirements engineering',
        summary: 'Functional vs non-functional requirements, scoped and quantified up front.',
        details: [
          'Functional: what the system does — features, user-facing behavior',
          'Non-functional: how well — latency, availability, durability, quantified with real numbers',
        ],
      },
      {
        label: 'SLA / SLO / SLI',
        summary: 'The contract, the internal target, and the measurement that proves it.',
        details: [
          'SLA: the external promise (often with a penalty for breach)',
          'SLO: the internal target, usually stricter than the SLA',
          'SLI: the actual metric measured to know if the SLO is being met',
        ],
      },
      {
        label: 'CAP theorem',
        summary: 'Consistency, Availability, Partition tolerance — pick two during a partition.',
        details: ['See the Data & Consistency question bank for the full PACELC extension.'],
      },
      {
        label: 'Fault-tolerance patterns',
        summary: 'Designing for components failing, not just for the happy path.',
        details: [
          'Redundancy and replication',
          'Graceful degradation — partial functionality over total outage',
          'Circuit breakers and bulkheads to contain failure',
        ],
      },
      {
        label: 'SDLC environments',
        summary: 'The progression a change moves through before reaching production.',
        details: ['Local → dev → staging → production, each with rising fidelity to real traffic'],
      },
      {
        label: 'Architecture evolution',
        summary: 'Monolith → modular monolith → microservices, as a progression, not a fixed choice.',
        details: ['See the Monolith vs Microservices question for the full trade-off.'],
      },
      {
        label: 'Domain-Driven Design (DDD)',
        summary: 'Modeling software around the business domain and its bounded contexts.',
        details: ['Bounded contexts often become the natural seams for a later microservices split.'],
      },
      {
        label: 'CQRS',
        summary: 'Separating the read model from the write model.',
        details: ['Lets reads and writes scale and evolve independently, at the cost of eventual consistency between them.'],
      },
      {
        label: 'Event sourcing',
        summary: 'Storing state as a sequence of events, rather than the current value alone.',
        details: ['Gives a full audit trail and replayability, at the cost of query complexity.'],
      },
      {
        label: 'Saga pattern',
        summary: 'Coordinating a multi-step transaction across services without a single ACID transaction.',
        details: [
          'Choreography: each service reacts to events independently — no central coordinator, but harder to trace',
          'Orchestration: a central coordinator drives the steps — easier to trace, but a new single point of coordination',
        ],
      },
      {
        label: 'BFF / strangler-fig / sidecar',
        summary: 'Structural patterns for evolving architecture safely over time.',
        details: [
          'BFF (Backend-for-Frontend): a tailored API layer per client type',
          'Strangler fig: incrementally replacing a legacy system behind a stable interface',
          'Sidecar: attaching cross-cutting concerns (logging, proxying) alongside a service without modifying it',
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
        label: 'Database taxonomy',
        summary: 'Relational, key-value, document, column-family, search, graph, time-series.',
        details: [
          'Each optimized for a different access pattern — see the DB-selection decision tree question',
        ],
      },
      {
        label: 'Indexing types',
        summary: 'B-tree, hash, and inverted indexes — each suited to a different query shape.',
        details: [
          'B-tree: range queries and sorted access',
          'Hash: exact-match lookups',
          'Inverted: full-text search',
        ],
      },
      {
        label: 'Sharding strategies',
        summary: 'Splitting data across nodes by key range, hash, or a directory lookup.',
        details: [
          'Range-based: simple, but risks hot shards',
          'Hash-based: even distribution, but loses range-query locality',
          'Directory-based: flexible, but adds a lookup hop',
        ],
      },
      {
        label: 'Replication',
        summary: 'Synchronous vs asynchronous copies of data across nodes.',
        details: [
          'Sync: strong consistency, higher write latency',
          'Async: lower latency, replicas can lag (reintroduces the consistency-spectrum trade-off)',
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
        label: 'Feature engineering & feature store',
        summary: 'Computing model inputs once and reusing them consistently across training and serving.',
        details: [
          'Training/serving skew: features computed by separate code paths for offline training and online serving can silently diverge, degrading production accuracy without any error being thrown',
        ],
      },
      {
        label: 'Batch vs. streaming feature computation',
        summary: 'Scheduled, periodic feature computation vs continuous, event-driven computation.',
        details: ['See the Batch vs Streaming question for the full trade-off.'],
      },
      {
        label: 'Online vs. batch prediction',
        summary: 'Real-time inference on demand vs precomputed batch scoring served from a lookup.',
        details: ['See the Online vs Batch Prediction question for the full trade-off.'],
      },
      {
        label: 'Drift & staleness monitoring',
        summary: 'Distinguishing a changed world from a model that just hasn’t caught up to it.',
        details: ['See the Drift vs Staleness question for the full trade-off.'],
      },
      {
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
        label: 'Compute options',
        summary: 'Servers, containers, serverless functions — see the Server vs Serverless question.',
        details: [],
      },
      {
        label: 'Caching layers',
        summary: 'L1 (in-process) → L2 (shared, e.g. Redis) → L3 (CDN/edge).',
        details: ['Each layer trades hit-rate scope for access latency.'],
      },
      {
        label: 'Cache write patterns',
        summary: 'Cache-aside, write-through, write-behind.',
        details: [
          'Cache-aside: app manages the cache explicitly, simplest and most common',
          'Write-through: writes go to cache and store together, always consistent, higher write latency',
          'Write-behind: writes go to cache first and flush to store async, fastest writes, risk of data loss on cache failure',
        ],
      },
      {
        label: 'Message brokers',
        summary: 'Kafka, RabbitMQ, SQS — decoupling producers from consumers.',
        details: [],
      },
      {
        label: 'API patterns',
        summary: 'REST, GraphQL, gRPC — see the Real-time vs Batch question for the full comparison.',
        details: [],
      },
      {
        label: 'Rate limiting',
        summary: 'Token bucket, leaky bucket, fixed/sliding window — protecting a service from overload.',
        details: [],
      },
      {
        label: 'Load balancing',
        summary: 'Round-robin, least-connections, consistent hashing across backend instances.',
        details: [],
      },
    ],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    icon: Monitor,
    entries: [
      {
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
        label: 'CDN / edge',
        summary: 'Serving static and cacheable content from a location close to the user.',
        details: [],
      },
      {
        label: 'Core Web Vitals',
        summary: 'LCP, INP, CLS — the user-perceived performance metrics Google measures.',
        details: [],
      },
      {
        label: 'State-management ladder',
        summary: 'Local component state → context → a dedicated state library, escalating only as needed.',
        details: [],
      },
      {
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
        label: 'Containerization',
        summary: 'Packaging an app with its dependencies for consistent environments.',
        details: [],
      },
      {
        label: 'CI/CD pipeline',
        summary: 'Automated build, test, and deploy stages triggered on every change.',
        details: [],
      },
      {
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
        label: 'Infrastructure as code',
        summary: 'Declaring infrastructure in version-controlled config rather than manual setup.',
        details: [],
      },
      {
        label: 'Observability (RED / USE)',
        summary: 'Two complementary methods for what to monitor.',
        details: [
          'RED (request-scoped): Rate, Errors, Duration',
          'USE (resource-scoped): Utilization, Saturation, Errors',
        ],
      },
      {
        label: 'Disaster-recovery tiers',
        summary: 'Backup/restore → pilot light → warm standby → multi-site active-active, in rising cost and readiness.',
        details: [],
      },
      {
        label: 'AuthN vs AuthZ',
        summary: 'Who you are, vs what you’re allowed to do.',
        details: [
          'RBAC: role-based access control',
          'ABAC: attribute-based access control',
          'ReBAC: relationship-based access control',
        ],
      },
      {
        label: 'Secrets management',
        summary: 'Environment variables and dedicated secret stores — never hardcoded.',
        details: [],
      },
      {
        label: 'Transport encryption',
        summary: 'TLS everywhere data moves between systems.',
        details: [],
      },
      {
        label: 'Input validation',
        summary: 'OWASP Top 10 — the standard reference for common vulnerability classes.',
        details: [],
      },
      {
        label: 'Network security',
        summary: 'VPCs, security groups, firewalls — controlling what can reach what.',
        details: [],
      },
      {
        label: 'Compliance',
        summary: 'GDPR, HIPAA, PCI-DSS, SOC2 — constraints that can shape hosting/data decisions upstream.',
        details: [],
      },
    ],
  },
];
