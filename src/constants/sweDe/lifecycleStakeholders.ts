import type { LifecycleStakeholderEntry } from './types';

// Cross-functional map for the data engineering lifecycle (Reis & Housley).
// Labels, summaries, and ordering come from the lifecycle's own constants
// (systemDesignPrep/foundations/dataEngineeringLifecycle.ts) and are looked up
// by id at render time — this file holds only what that one doesn't:
// who to talk to, what to say, and which software engineering principles apply.
//
// `core` = day-to-day SWE/DE work. `partner` = a dedicated role on another
// team that a strong candidate should still be able to talk to.
// Copy is this page's own synthesis for interview use, not quotes from the book.

export const LIFECYCLE_STAKEHOLDERS: LifecycleStakeholderEntry[] = [
  // ── Stages ────────────────────────────────────────────────────────────
  {
    kind: 'stage',
    id: 'generation',
    owner: 'core',
    stakeholders: ['Application and source-system owners', 'Vendors and API providers', 'Device or platform teams'],
    communicate: [
      'Agree on a data contract: schema, semantics, and who is told before it changes',
      'Ask for change notice and a staging source to test against',
      'Report source defects back to the owner instead of patching around them silently',
    ],
    swePrinciples: [
      'Treat the source schema as an API: versioned, backward compatible, deprecated deliberately',
      'Contract tests catch an upstream change before it reaches production',
    ],
  },
  {
    kind: 'stage',
    id: 'storage',
    owner: 'core',
    stakeholders: ['Platform and infrastructure engineers', 'Finance (cost owners)', 'Compliance (retention)'],
    communicate: [
      'State the cost, durability, and latency trade-off of each tier in terms the budget owner can approve',
      'Agree on retention and deletion rules before data lands',
    ],
    swePrinciples: [
      'Infrastructure as code: storage is reviewed, versioned, and reproducible',
      'Prefer reversible choices (open formats, separated storage and compute) over lock-in',
    ],
  },
  {
    kind: 'stage',
    id: 'ingestion',
    owner: 'core',
    stakeholders: ['Source-system owners', 'Platform and SRE', 'Downstream pipeline owners'],
    communicate: [
      'Publish freshness expectations (an SLA or SLO) rather than "real-time"',
      'Say what happens downstream on a late, partial, or duplicated load',
      'Tell consumers about an incident when it starts, not when they notice',
    ],
    swePrinciples: [
      'Idempotent, retry-safe loads: running twice must be the same as running once',
      'Fail fast on bad input and log context, never swallow errors',
    ],
  },
  {
    kind: 'stage',
    id: 'transformation',
    owner: 'core',
    stakeholders: ['Analysts and analytics engineers', 'Business metric owners', 'ML engineers (feature definitions)'],
    communicate: [
      'Get one agreed definition per business metric, and write down who owns it',
      'Announce a logic change and its backfill impact before it ships',
    ],
    swePrinciples: [
      'SQL and DAGs are code: version control, code review, and automated tests',
      'Small, single-purpose models over one large opaque transform (SRP, KISS)',
    ],
  },
  {
    kind: 'stage',
    id: 'serving',
    owner: 'core',
    stakeholders: ['Analysts and BI users', 'ML engineers', 'Operations and RevOps users', 'Product managers'],
    communicate: [
      'Document freshness, grain, and known limitations next to the data',
      'Agree on access: who can see what, at which granularity',
      'Make data quality visible so consumers can trust it or know why not',
    ],
    swePrinciples: [
      'Treat each served dataset as a product with an owner, an interface, and a changelog',
      'Observability on data health, not just on whether the job succeeded',
    ],
  },

  // ── Downstream consumers ──────────────────────────────────────────────
  {
    kind: 'output',
    id: 'analytics',
    owner: 'partner',
    stakeholders: ['BI developers and analysts', 'Executives and business leads', 'Embedded-analytics product teams'],
    communicate: [
      'Translate a metric request into grain, source, and freshness before building',
      'Explain a number discrepancy by lineage, not by guesswork',
    ],
    swePrinciples: [
      'A stable, documented interface (the semantic layer) so dashboards do not break on upstream refactors',
    ],
  },
  {
    kind: 'output',
    id: 'machine-learning',
    owner: 'partner',
    stakeholders: ['ML engineers and data scientists', 'MLOps and platform teams'],
    communicate: [
      'Agree on point-in-time correct training data so features never leak the future',
      'Share how late data and backfills change a feature after a model was trained',
    ],
    swePrinciples: [
      'Reproducibility: the same code and data version must rebuild the same training set',
      'Version datasets and features like artifacts, feeding the ML/MLOps lifecycle',
    ],
  },
  {
    kind: 'output',
    id: 'reverse-etl',
    owner: 'partner',
    stakeholders: ['Sales, marketing, and support operations', 'The owners of the receiving SaaS tool'],
    communicate: [
      'Confirm the target tool tolerates the sync rate, field limits, and overwrites',
      'Name an owner for bad data pushed into an operational system',
    ],
    swePrinciples: [
      'Writes into live systems need idempotency, rate limiting, and a way to roll back',
    ],
  },

  // ── Undercurrents ─────────────────────────────────────────────────────
  {
    kind: 'undercurrent',
    id: 'software-engineering',
    owner: 'core',
    stakeholders: ['Engineering peers and reviewers', 'Tech leads', 'Platform teams'],
    communicate: [
      'Make build vs. adopt vs. buy an explicit, written decision with its trade-offs',
      'Review pipeline code with the same bar as application code',
    ],
    swePrinciples: [
      'KISS, YAGNI, and SOLID apply to pipelines exactly as to services',
      'Tests, CI/CD, and infrastructure as code are the baseline, not extras',
    ],
  },
  {
    kind: 'undercurrent',
    id: 'dataops',
    owner: 'core',
    stakeholders: ['On-call and SRE', 'Data consumers affected by incidents', 'Engineering managers'],
    communicate: [
      'Define who gets paged for bad data, and who tells the consumers',
      'Run blameless post-incident reviews and share the fix',
    ],
    swePrinciples: [
      'Automate deployment and testing of pipelines; observe data health, then respond',
    ],
  },
  {
    kind: 'undercurrent',
    id: 'orchestration',
    owner: 'core',
    stakeholders: ['Pipeline owners across teams', 'Platform and SRE'],
    communicate: [
      'Make cross-team dependencies visible in the DAG, and alert on missed SLAs',
      'Agree on retry, timeout, and backfill policy before an incident',
    ],
    swePrinciples: [
      'Explicit dependencies, idempotent tasks, and backfills as first-class operations',
    ],
  },
  {
    kind: 'undercurrent',
    id: 'security',
    owner: 'partner',
    stakeholders: ['Security engineers', 'Legal and privacy officers', 'Auditors'],
    communicate: [
      'Classify sensitive fields with the security team before they flow downstream',
      'Request least-privilege access with a stated purpose',
    ],
    swePrinciples: [
      'Least privilege, encryption in transit and at rest, and no secrets in code or logs',
    ],
  },
  {
    kind: 'undercurrent',
    id: 'data-management',
    owner: 'partner',
    stakeholders: ['Data governance and stewards', 'Compliance', 'Domain data owners'],
    communicate: [
      'Name an owner and a quality bar for each important dataset',
      'Keep lineage and metadata current so audits and impact analysis are answerable',
    ],
    swePrinciples: [
      'Lineage and metadata are generated by the pipeline, not maintained by hand',
    ],
  },
  {
    kind: 'undercurrent',
    id: 'data-architecture',
    owner: 'partner',
    stakeholders: ['Data and enterprise architects', 'Engineering leadership'],
    communicate: [
      'Bring the decision, the options, and the cost of reversing it, not only a recommendation',
      'Flag which choices are one-way doors and get sign-off there',
    ],
    swePrinciples: [
      'Prefer reversible decisions; isolate the irreversible ones behind an interface',
    ],
  },
];
