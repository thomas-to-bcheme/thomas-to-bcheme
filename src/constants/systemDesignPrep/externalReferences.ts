export type ExternalReferenceGroup = 'framework' | 'lifecycles' | 'standards';

export interface ExternalReferenceGroupMeta {
  id: ExternalReferenceGroup;
  label: string;
  description: string;
}

/**
 * Single source of truth for the 3 labeled subgroups ExternalReferencesSection
 * renders under "Sources" — mirrors how sweCompassLifecycle.ts's 6 stages drive
 * SYSTEM_DESIGN_CATEGORIES: add a group here, tag references with its id, and
 * the component picks it up with no other changes.
 */
export const EXTERNAL_REFERENCE_GROUPS: ExternalReferenceGroupMeta[] = [
  {
    id: 'framework',
    label: 'Framework & System Design',
    description:
      "General system-design grounding — where this page's interview framework, question-cascade format, and four-axis philosophy come from.",
  },
  {
    id: 'lifecycles',
    label: 'Development Lifecycles',
    description:
      "Software ships through the Software Development Lifecycle (SDLC) — plan, design, build, test, deploy, maintain. A model is one more component shipping through that same lifecycle, not a parallel track: the Model stage's own build → train → evaluate → optimize loop assumes the Data stage's pipelines already exist and are automated at scale, and the trained model comes back out as one more service the Backend and Frontend stages consume.",
  },
  {
    id: 'standards',
    label: 'Cross-Lifecycle Operating Standards',
    description:
      "Practices that don't care whether what's running is deterministic code or a served model: tests and validation gating what ships, CI/CD moving it into production, and monitoring, drift detection, and on-call watching it once it's there. This is the domain-agnostic layer the Data, Model, and Ops stages all draw on — data engineering, ML engineering, software engineering, and the DevOps/MLOps/LLMOps/Ops umbrella are different domains running the same underlying operating discipline.",
  },
];

export interface ExternalReference {
  id: string;
  group: ExternalReferenceGroup;
  title: string;
  url: string;
  whatItOffers: string;
}

export const EXTERNAL_REFERENCES: ExternalReference[] = [
  // --- Framework & System Design ---
  {
    id: 'bytebytego-framework',
    group: 'framework',
    title: 'ByteByteGo — "A Framework for System Design Interviews"',
    url: 'https://bytebytego.com/courses/system-design-interview/a-framework-for-system-design-interviews',
    whatItOffers:
      'A free 4-step framework (Understand → High-Level Design → Deep Dive → Wrap Up) plus an explicit Dos/Don\'ts checklist — closely mirrors this page\'s own 4-step framework.',
  },
  {
    id: 'hello-interview-delivery-framework',
    group: 'framework',
    title: 'Hello Interview — "Delivery Framework"',
    url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction',
    whatItOffers:
      'A more granular 6-phase breakdown (Requirements → Core Entities → API → [optional Data Flow] → High-Level Design → Deep Dives) and 4 evaluation dimensions (Problem Navigation, Solution Design, Technical Excellence, Communication) — cross-referenced in the scoring rubric above.',
  },
  {
    id: 'system-design-primer',
    group: 'framework',
    title: 'system-design-primer',
    url: 'https://github.com/donnemartin/system-design-primer',
    whatItOffers:
      'A widely-used open-source index of core system-design topics (performance vs scalability, latency vs throughput, CAP theorem, consistency/availability patterns, databases, caching, asynchronism) plus a study guide and worked example questions.',
  },
  {
    id: 'roadmap-system-design',
    group: 'framework',
    title: 'roadmap.sh/system-design',
    url: 'https://roadmap.sh/system-design',
    whatItOffers:
      'A visual roadmap of system-design building blocks (DNS, CDN, load balancers, databases, caching, message queues, monitoring, cloud design patterns) — the reference taxonomy behind this page\'s Hosting & Infrastructure question, which fills a gap this roadmap explicitly leaves to a separate DevOps track.',
  },
  {
    id: 'roadmap-software-architect',
    group: 'framework',
    title: 'roadmap.sh/software-architect',
    url: 'https://roadmap.sh/software-architect',
    whatItOffers:
      'A role-scoped competency map — architecture as ongoing judgment (decision-making under ambiguity, documentation as a continuously-maintained artifact, re-evaluating existing systems, not just greenfield design) rather than a fixed set of interview problems. The framing behind this page\'s intro.',
  },

  // --- Development Lifecycles ---
  {
    id: 'aws-sdlc-overview',
    group: 'lifecycles',
    title: 'AWS — "What is SDLC?"',
    url: 'https://aws.amazon.com/what-is/sdlc/',
    whatItOffers:
      "The canonical 6-phase Software Development Lifecycle (plan → design → build → test → deploy → maintain) — this page's Design → Ops stage ordering is the same shape, read as system-design decisions instead of process steps.",
  },
  {
    id: 'gcp-mlops-lifecycle',
    group: 'lifecycles',
    title: 'Google Cloud — "MLOps: Continuous Delivery and Automation Pipelines in Machine Learning"',
    url: 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning',
    whatItOffers:
      "The ML development lifecycle (data → train → evaluate → deploy) run as one stage nested inside a standard CI/CD pipeline, not a parallel process — the source for treating this page's Model stage as a component of the overall system, one that assumes the Data stage's pipelines already exist.",
  },
  {
    id: 'huyen-designing-ml-systems',
    group: 'lifecycles',
    title: 'Chip Huyen — "Designing Machine Learning Systems" (O\'Reilly, 2022)',
    url: 'https://github.com/chiphuyen/dmls-book',
    whatItOffers:
      'The canonical four system-design characteristics (reliability, scalability, maintainability, adaptability) this site\'s own four-axis philosophy is adapted from — see the System Design Philosophy section of /projects for the resilience-for-scalability swap and why.',
  },

  // --- Cross-Lifecycle Operating Standards ---
  {
    id: 'data-eng-lifecycle-fundamentals',
    group: 'standards',
    title: 'Reis & Housley — "Fundamentals of Data Engineering"',
    url: 'https://www.oreilly.com/library/view/fundamentals-of-data/9781098108298/',
    whatItOffers:
      'Defines the data engineering lifecycle (generation → storage → ingestion → transformation → serving) that the Model stage assumes is already built and automated, plus the cross-cutting "undercurrents" — security, orchestration, DataOps — that make it a domain-agnostic operating discipline rather than a data-specific one.',
  },
  {
    id: 'google-rules-of-ml',
    group: 'standards',
    title: 'Google — "Rules of Machine Learning: Best Practices for ML Engineering"',
    url: 'https://developers.google.com/machine-learning/guides/rules-of-ml',
    whatItOffers:
      '43 battle-tested rules for treating ML like an engineering discipline rather than a research exercise — when to reach for a model at all, and what to instrument and monitor once one is shipped.',
  },
  {
    id: 'google-sre-book',
    group: 'standards',
    title: 'Google — Site Reliability Engineering',
    url: 'https://sre.google/sre-book/table-of-contents/',
    whatItOffers:
      "The source behind this page's Ops-stage framing of production health — golden signals, SLOs and error budgets, and what an on-call runbook actually needs to say — independent of whether what's running is a plain service or a served model.",
  },
  {
    id: 'huyen-llm-production',
    group: 'standards',
    title: 'Chip Huyen — "Building LLM Applications for Production"',
    url: 'https://huyenchip.com/2023/04/11/llm-engineering.html',
    whatItOffers:
      'The LLMOps-specific layer on top of the MLOps references above — where prompt/context engineering, evaluation, and deployment risk diverge once the "model" is a hosted LLM API rather than one trained in-house.',
  },
];
