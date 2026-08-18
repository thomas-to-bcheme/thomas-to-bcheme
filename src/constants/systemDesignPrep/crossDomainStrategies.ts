import {
  Ruler,
  Database,
  Layers,
  Server,
  Monitor,
  Rocket,
  Shield,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import type { SweCompassLifecycleStage } from './sweCompassLifecycle';

// The Reference Grid (referenceGrid.ts) is a vocabulary index — one column
// per SWE Compass stage, six total, security folded into Ops by design. This
// file is the comparison that grid deliberately doesn't attempt: how the
// same non-functional lever plays out differently depending on which layer
// is actually solving it. Security gets its own explicit domain ONLY here —
// by user decision, the Reference Grid itself stays exactly 6 columns.
export type StrategyDomain = SweCompassLifecycleStage | 'security';

export interface StrategyDomainMeta {
  id: StrategyDomain;
  label: string;
  icon: LucideIcon;
}

// Same 6 icons as referenceGrid.ts's REFERENCE_GRID_COLUMNS, in the same
// order, for visual continuity — plus Shield as the 7th, comparison-only
// domain.
export const STRATEGY_DOMAINS: StrategyDomainMeta[] = [
  { id: 'design', label: 'Design', icon: Ruler },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'model', label: 'Model', icon: Layers },
  { id: 'backend', label: 'Backend', icon: Server },
  { id: 'frontend', label: 'Frontend', icon: Monitor },
  { id: 'ops', label: 'Ops', icon: Rocket },
  { id: 'security', label: 'Security', icon: Shield },
];

export interface StrategyDomainTreatment {
  domain: StrategyDomain;
  /** 1-2 sentences: how this lever is actually pulled in this domain. */
  approach: string;
  /** Cross-links to the real decision-cascade or Reference Grid entry that
   *  already has this trade-off's full depth, per DATA INTEGRITY — this
   *  section frames the comparison, it doesn't re-derive what's elsewhere. */
  crossLink?: { label: string; href: string };
}

export interface StrategyLever {
  id: string;
  label: string;
  icon: LucideIcon;
  summary: string;
  /** One entry per STRATEGY_DOMAINS id, same order. */
  treatments: StrategyDomainTreatment[];
}

export const STRATEGY_LEVERS: StrategyLever[] = [
  {
    id: 'lever-scaling',
    label: 'Scaling',
    icon: TrendingUp,
    summary:
      'The same growth curve, but the lever that actually helps depends entirely on which layer is under load.',
    treatments: [
      {
        domain: 'design',
        approach:
          "Name the next order of magnitude a decision has to survive before committing to it, and know the cheapest lever available before reaching for the expensive one.",
        crossLink: { label: 'Scaling progression →', href: '#scaling-progression' },
      },
      {
        domain: 'data',
        approach:
          'Reads scale out through replicas and caching; writes only scale out through sharding — a different bottleneck needs a different lever.',
        crossLink: { label: 'Scaling progression →', href: '#scaling-progression' },
      },
      {
        domain: 'model',
        approach:
          "Batch precompute absorbs predictable load cheaply; online inference has to autoscale against traffic it can't precompute for.",
        crossLink: { label: 'Online vs. batch prediction →', href: '#inference-online-vs-batch' },
      },
      {
        domain: 'backend',
        approach:
          'Stateless services scale horizontally behind a load balancer for free; stateful ones need sticky routing or shared state first.',
        crossLink: { label: 'Load balancing →', href: '#load-balancing' },
      },
      {
        domain: 'frontend',
        approach:
          "A CDN absorbs read traffic before it ever reaches the backend — the cheapest scaling lever in the whole system, paid for once at the edge.",
        crossLink: { label: 'CDN / edge →', href: '#cdn-edge' },
      },
      {
        domain: 'ops',
        approach:
          "Infrastructure as code turns 'add capacity' into a config change instead of a manual provisioning project.",
        crossLink: { label: 'Infrastructure as code →', href: '#infrastructure-as-code' },
      },
      {
        domain: 'security',
        approach:
          'Rate limiting has to scale with legitimate traffic too, or the defense against abuse becomes the new bottleneck.',
        crossLink: { label: 'Rate limiting →', href: '#rate-limiting' },
      },
    ],
  },
  {
    id: 'lever-consistency-freshness',
    label: 'Consistency & Freshness',
    icon: RefreshCw,
    summary:
      'How stale an answer is acceptable, and who decides — the CAP trade-off shows up differently at every layer.',
    treatments: [
      {
        domain: 'design',
        approach:
          'CAP theorem bounds how fresh a read can be during a partition; PACELC extends the same trade-off to the normal, healthy case too.',
        crossLink: { label: 'CAP theorem →', href: '#cap-theorem' },
      },
      {
        domain: 'data',
        approach:
          'Synchronous replication keeps every read fresh at the cost of write latency; asynchronous replication writes faster but lets replicas lag.',
        crossLink: { label: 'Replication →', href: '#replication' },
      },
      {
        domain: 'model',
        approach:
          "Drift and staleness monitoring is this question's model-specific form: has the world changed, or has the model just not caught up to it yet.",
        crossLink: { label: 'Drift & staleness monitoring →', href: '#drift-staleness-monitoring' },
      },
      {
        domain: 'backend',
        approach:
          'Cache-aside, write-through, or write-behind each answer "how fast does a write become visible" differently.',
        crossLink: { label: 'Cache write patterns →', href: '#cache-write-patterns' },
      },
      {
        domain: 'frontend',
        approach:
          'SSR is always fresh at higher serve cost; SSG is cheapest to serve but stalest — ISR sits deliberately in between.',
        crossLink: { label: 'Rendering strategies →', href: '#rendering-strategies' },
      },
      {
        domain: 'ops',
        approach: "An SLO turns 'fresh enough' from a feeling into a number everyone can be held to.",
        crossLink: { label: 'SLA / SLO / SLI →', href: '#sla-slo-sli' },
      },
      {
        domain: 'security',
        approach:
          'A revoked token or permission that takes minutes to propagate is a consistency problem with a security consequence, not just a UX one.',
        crossLink: { label: 'AuthN vs AuthZ vs Security →', href: '#authn-vs-authz-vs-security' },
      },
    ],
  },
  {
    id: 'lever-failure-handling',
    label: 'Failure Handling',
    icon: AlertTriangle,
    summary:
      "Assuming a component will fail, not just planning for the happy path — the specific failure mode changes by layer.",
    treatments: [
      {
        domain: 'design',
        approach:
          'Redundancy, graceful degradation, and circuit breakers are the standard every component below gets checked against.',
        crossLink: { label: 'Fault-tolerance patterns →', href: '#fault-tolerance-patterns' },
      },
      {
        domain: 'data',
        approach:
          'A failed primary needs a replica ready to promote — the failover plan is part of the design, not an incident-time improvisation.',
        crossLink: { label: 'Replication →', href: '#replication' },
      },
      {
        domain: 'model',
        approach:
          "A failed inference call should degrade to a cached last-known-good prediction, not a 500 — the deployment risk ladder exists to catch a bad model before it's the only path left.",
        crossLink: { label: 'ML deployment risk ladder →', href: '#model-deployment-risk-ladder' },
      },
      {
        domain: 'backend',
        approach:
          'Retries with backoff, bulkheads, and dead-letter queues contain a failure instead of letting it cascade through every dependent service.',
        crossLink: { label: 'Message brokers →', href: '#message-brokers' },
      },
      {
        domain: 'frontend',
        approach: "A stale cached response or a skeleton state beats a blank screen — degrade the experience, don't remove it.",
        crossLink: { label: 'Rendering strategies →', href: '#rendering-strategies' },
      },
      {
        domain: 'ops',
        approach:
          'Disaster-recovery tiers price out exactly how much readiness a given failure mode is worth paying for, from backup/restore up to active-active.',
        crossLink: { label: 'Disaster-recovery tiers →', href: '#disaster-recovery-tiers' },
      },
      {
        domain: 'security',
        approach:
          'Fail-closed vs. fail-open is itself a design decision — an auth check that fails open under load is a breach waiting for the next outage.',
        crossLink: { label: 'AuthN vs AuthZ vs Security →', href: '#authn-vs-authz-vs-security' },
      },
    ],
  },
  {
    id: 'lever-cost-control',
    label: 'Cost Control',
    icon: DollarSign,
    summary: 'Every layer has its own cheapest way to spend, and its own way to quietly overspend.',
    treatments: [
      {
        domain: 'design',
        approach: 'A hard budget constraint is a design axis on its own, not an afterthought applied once the architecture is already picked.',
        crossLink: { label: 'System design philosophy (Projects) →', href: '/projects#system-design-philosophy' },
      },
      {
        domain: 'data',
        approach: 'Storage tiering keeps spend proportional to how often data is actually accessed, instead of paying hot-tier prices for cold data.',
        crossLink: { label: 'Database taxonomy →', href: '#database-taxonomy' },
      },
      {
        domain: 'model',
        approach:
          "Batch inference is usually far cheaper than an always-on serving endpoint — pay for compute when there's a prediction to make, not around the clock.",
        crossLink: { label: 'Online vs. batch prediction →', href: '#inference-online-vs-batch' },
      },
      {
        domain: 'backend',
        approach: "Serverless/pay-per-use bills for actual usage; a reserved always-on instance bills for capacity whether it's used or not.",
        crossLink: { label: 'Compute options →', href: '#compute-options' },
      },
      {
        domain: 'frontend',
        approach: 'Static generation shifts compute cost to build time, once, instead of paying to render the same page on every request.',
        crossLink: { label: 'Rendering strategies →', href: '#rendering-strategies' },
      },
      {
        domain: 'ops',
        approach: 'Right-sized autoscaling floors and ceilings are the difference between paying for real load and paying for idle headroom.',
        crossLink: { label: 'Infrastructure as code →', href: '#infrastructure-as-code' },
      },
      {
        domain: 'security',
        approach: 'Compliance tooling — scanning, audits, certifications — is a real, recurring line item to budget for, not a one-time checkbox.',
        crossLink: { label: 'Compliance →', href: '#compliance' },
      },
    ],
  },
  {
    id: 'lever-observability',
    label: 'Observability',
    icon: Activity,
    summary:
      "What isn't instrumented can't be operated — the signal that matters just looks different depending on what's being watched.",
    treatments: [
      {
        domain: 'design',
        approach: 'Observability belongs in the design itself, not bolted on after an incident makes the gap obvious.',
        crossLink: { label: 'Observability (RED / USE) →', href: '#observability-red-use' },
      },
      {
        domain: 'data',
        approach: "Pipeline lineage and freshness metrics are what make 'is this data still good' answerable instead of assumed.",
        crossLink: { label: 'Replication →', href: '#replication' },
      },
      {
        domain: 'model',
        approach:
          'Prediction-quality dashboards and drift alarms are the model-specific signal — uptime alone says nothing about whether the answers are still right.',
        crossLink: { label: 'Drift & staleness monitoring →', href: '#drift-staleness-monitoring' },
      },
      {
        domain: 'backend',
        approach: 'RED — rate, errors, duration — is the request-scoped view of whether a service is healthy.',
        crossLink: { label: 'Observability (RED / USE) →', href: '#observability-red-use' },
      },
      {
        domain: 'frontend',
        approach: 'Core Web Vitals are the user-facing half of observability — the signal a backend dashboard alone will never show.',
        crossLink: { label: 'Core Web Vitals →', href: '#core-web-vitals' },
      },
      {
        domain: 'ops',
        approach: 'USE — utilization, saturation, errors — is the resource-scoped complement to RED, and where capacity problems show up first.',
        crossLink: { label: 'Observability (RED / USE) →', href: '#observability-red-use' },
      },
      {
        domain: 'security',
        approach: "Audit logging and anomaly detection are observability applied to 'who did what' — the same discipline, a different question.",
        crossLink: { label: 'Secrets management →', href: '#secrets-management' },
      },
    ],
  },
];
