/**
 * systems-design glossary terms.
 *
 * Ledger populated in Phase 1 (slug/term/category/voiceTemplate only).
 * `definition` fields are filled in Phase 2 by an isolated content subagent
 * — see plan §7. Source lineage: scratchpad/glossary-sources/{design,general,
 * frontend,backend,ops}.txt, extracted from:
 *   public/excalidraw/design.excalidraw   @ 04b1d4e649058ecea338cc0d50e91b66adb4fa5d
 *   public/excalidraw/general.excalidraw  @ 7b1fd23ef8e2c0930f6ba8b2e4e69e5b811b5cea
 *   public/excalidraw/frontend.excalidraw @ a68759f3c256871ce4759b76511fe9630231c9ae
 *   public/excalidraw/backend.excalidraw  @ 04b1d4e649058ecea338cc0d50e91b66adb4fa5d
 *   public/excalidraw/ops.excalidraw      @ 04b1d4e649058ecea338cc0d50e91b66adb4fa5d (deployment/IaC slice only)
 *
 * SLI/SLO/SLA/error-budget are deliberately NOT defined here — per plan §1
 * they're defined once under evaluation-observability; reference them via
 * relatedSlugs instead of redefining.
 */

import type { GlossaryTerm } from './types';

export const GLOSSARY_TERMS_SYSTEMS_DESIGN: GlossaryTerm[] = [
  { slug: 'cap-theorem', term: 'CAP Theorem', category: 'systems-design', voiceTemplate: 'constraint', definition: '' },
  { slug: 'circuit-breaker', term: 'Circuit Breaker', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'bulkhead-pattern', term: 'Bulkhead Pattern', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'exponential-backoff', term: 'Exponential Backoff', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'feature-flags', term: 'Feature Flags', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'b-tree-index', term: 'B-Tree Index', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'lsm-tree', term: 'LSM-Tree', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['b-tree-index'] },
  { slug: 'sharding', term: 'Sharding', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'replication', term: 'Replication', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'consistent-hashing', term: 'Consistent Hashing', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['sharding'] },
  { slug: 'acid-properties', term: 'ACID Properties', category: 'systems-design', voiceTemplate: 'constraint', definition: '' },
  { slug: 'base-properties', term: 'BASE Properties', category: 'systems-design', voiceTemplate: 'constraint', definition: '', relatedSlugs: ['acid-properties'] },
  { slug: 'database-normalization', term: 'Database Normalization', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'cqrs', term: 'CQRS', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'event-sourcing', term: 'Event Sourcing', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['cqrs'] },
  { slug: 'saga-pattern', term: 'Saga Pattern', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'microservices', term: 'Microservices', category: 'systems-design', voiceTemplate: 'structure', definition: '', relatedSlugs: ['monolith', 'conways-law'] },
  { slug: 'monolith', term: 'Monolith', category: 'systems-design', voiceTemplate: 'structure', definition: '', relatedSlugs: ['microservices'] },
  { slug: 'bounded-context', term: 'Bounded Context', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'strangler-fig-pattern', term: 'Strangler Fig Pattern', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'sidecar-pattern', term: 'Sidecar Pattern', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'conways-law', term: "Conway's Law", category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'cache-aside', term: 'Cache-Aside', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'rate-limiting', term: 'Rate Limiting', category: 'systems-design', voiceTemplate: 'constraint', definition: '' },
  { slug: 'message-broker', term: 'Message Broker', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'api-versioning', term: 'API Versioning', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'idempotency-key', term: 'Idempotency Key', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'connection-pooling', term: 'Connection Pooling', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'n-plus-one-query', term: 'N+1 Query', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'load-balancing', term: 'Load Balancing', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'blue-green-deployment', term: 'Blue-Green Deployment', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['canary-deployment'] },
  { slug: 'canary-deployment', term: 'Canary Deployment', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['blue-green-deployment'] },
  { slug: 'infrastructure-as-code', term: 'Infrastructure as Code', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'containerization', term: 'Containerization', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'service-mesh', term: 'Service Mesh', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'server-side-rendering', term: 'Server-Side Rendering (SSR)', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'static-site-generation', term: 'Static Site Generation (SSG)', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'client-side-rendering', term: 'Client-Side Rendering (CSR)', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'incremental-static-regeneration', term: 'Incremental Static Regeneration (ISR)', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'core-web-vitals', term: 'Core Web Vitals', category: 'systems-design', voiceTemplate: 'constraint', definition: '' },
  { slug: 'code-splitting', term: 'Code Splitting', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'oauth2-oidc', term: 'OAuth 2.0 / OIDC', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'jwt', term: 'JWT', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'rbac', term: 'Role-Based Access Control (RBAC)', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'tls', term: 'TLS', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'zero-trust-security', term: 'Zero-Trust Security', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'race-condition', term: 'Race Condition', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['mutex'] },
  { slug: 'mutex', term: 'Mutex', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'semaphore', term: 'Semaphore', category: 'systems-design', voiceTemplate: 'mechanism', definition: '', relatedSlugs: ['mutex'] },
  { slug: 'deadlock', term: 'Deadlock', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'event-loop', term: 'Event Loop', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'backpressure', term: 'Backpressure', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'encapsulation', term: 'Encapsulation', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'polymorphism', term: 'Polymorphism', category: 'systems-design', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'inheritance', term: 'Inheritance', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
  { slug: 'abstraction-oop', term: 'Abstraction (OOP)', category: 'systems-design', voiceTemplate: 'structure', definition: '' },
];
