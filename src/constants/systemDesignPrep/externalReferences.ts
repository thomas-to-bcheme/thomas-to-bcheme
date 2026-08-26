export type ExternalReferenceGroup = 'framework' | 'lifecycles' | 'standards' | 'videos' | 'social' | 'ml-system-design';

export interface ExternalReferenceGroupMeta {
  id: ExternalReferenceGroup;
  label: string;
  description: string;
}

/**
 * Single source of truth for the 6 labeled subgroups ExternalReferencesSection
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
  {
    id: 'videos',
    label: 'Video Walkthroughs',
    description:
      "Narrated, watchable alternatives to the written references above — full courses, rapid concept explainers, and a multi-part playlist covering the same system-design fundamentals from a different angle.",
  },
  {
    id: 'social',
    label: 'Social Media Roundups',
    description:
      "Carousel-post checklists from System Design content creators on Instagram — useful for a fast topic scan or an interview-trap call-out, though the full notes behind several of these are only handed out by commenting or DMing the poster directly rather than posted publicly.",
  },
  {
    id: 'ml-system-design',
    label: 'ML System Design',
    description:
      "Where the ML-Specific Framework section above and its offline/online-metrics and normalization additions come from — the extra layer of decisions a model in production adds on top of the general framework, plus two real production case studies to ground it.",
  },
];

export type ExternalReferenceMedium = 'video' | 'social';

export interface ExternalReference {
  id: string;
  group: ExternalReferenceGroup;
  title: string;
  url: string;
  whatItOffers: string;
  /** Optional — selects a source-specific icon in ExternalReferencesSection. Omit for the default written-source icon. */
  medium?: ExternalReferenceMedium;
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
      'A visual roadmap of system-design building blocks (DNS, CDN, load balancers, databases, caching, message queues, monitoring, cloud design patterns) — the reference taxonomy behind this page\'s Hosting & Infrastructure question and the Components of System Design section\'s networking, storage, load-balancer-vs-gateway-vs-proxy, and security cards, filling a gap this roadmap explicitly leaves to a separate DevOps track.',
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
  {
    id: 'devops-lifecycle-overview',
    group: 'lifecycles',
    title: 'Atlassian — "What is DevOps?"',
    url: 'https://www.atlassian.com/devops',
    whatItOffers:
      'The standard 8-stage DevOps "infinite loop" (plan → code → build → test → release → deploy → operate → monitor) — the fourth named lifecycle in this page\'s Development Lifecycles section, alongside SDLC, Data Engineering, and MLOps.',
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

  // --- Video Walkthroughs ---
  {
    id: 'hayk-simonyan-design-systems-course',
    group: 'videos',
    medium: 'video',
    title: 'Hayk Simonyan — "Design Systems Like a Senior Engineer (Full Course)"',
    url: 'https://www.youtube.com/watch?v=vOn6wUcOXzI',
    whatItOffers:
      "A full-length course walking through system-design fundamentals end-to-end — a slower, narrated first pass before drilling into this page's own four-step interview framework and question bank.",
  },
  {
    id: 'neetcode-20-concepts',
    group: 'videos',
    medium: 'video',
    title: 'NeetCode — "20 System Design Concepts Explained in 10 Minutes"',
    url: 'https://www.youtube.com/watch?v=i53Gi_K3o7I',
    whatItOffers:
      'A rapid-fire glossary of 20 core terms (load balancing, caching, sharding, CAP theorem, and more) — a fast way to sanity-check the same vocabulary covered in the Reference grid above.',
  },
  {
    id: 'kodekloud-beginners-2026',
    group: 'videos',
    medium: 'video',
    title: 'KodeKloud — "System Design for Beginners (2026)"',
    url: 'https://www.youtube.com/watch?v=SE2KF-vxvS0',
    whatItOffers:
      "An up-to-date beginner-oriented primer on system-design thinking — a good entry point before working through this page's Core Characteristics and Interview Framework sections.",
  },
  {
    id: 'caleb-curry-system-design-playlist',
    group: 'videos',
    medium: 'video',
    title: 'Caleb Curry — "System Design" (playlist)',
    url: 'https://www.youtube.com/playlist?list=PL_c9BZzLwBRLSs6x50D5WIH76VCUxJs9E',
    whatItOffers:
      'A multi-video playlist working through system-design topics individually — useful for going deep on one concept (caching, databases, etc.) instead of a single long-form course.',
  },
  {
    id: 'hayk-simonyan-apis-databases-infra',
    group: 'videos',
    medium: 'video',
    title:
      'Hayk Simonyan — "System Design Explained: APIs, Databases, Caching, CDNs, Load Balancing & Production Infra"',
    url: 'https://www.youtube.com/watch?v=adOkTjIIDnk',
    whatItOffers:
      'A component-by-component walkthrough of the same building blocks covered in the Components of System Design section — APIs, databases, caching, CDNs, load balancing, and production infrastructure.',
  },
  {
    id: 'caleb-curry-essential-concepts',
    group: 'videos',
    medium: 'video',
    title: 'Caleb Curry — "Essential System Design Concepts You Should Know"',
    url: 'https://www.youtube.com/watch?v=uxskKNcsFLU',
    whatItOffers:
      'A tutorial-style tour of the concepts most system-design interviews probe first — a supporting companion to the beginner-oriented videos above.',
  },

  // --- Social Media Roundups ---
  {
    id: 'java-interview-prep-complete-guide',
    group: 'social',
    medium: 'social',
    title: '@java_interview_prep — "System Design – Complete Interview Guide"',
    url: 'https://www.instagram.com/p/DcGPOkqjVE5/',
    whatItOffers:
      'A 9-topic carousel outline (requirements, scalability, load balancing/caching, SQL vs NoSQL, sync vs async, reliability, common interview traps) plus a stated approach — Requirements → Scale → High-Level Design → Data → Communication → Scalability → Reliability → Security → Observability → Trade-offs — that lines up closely with this page\'s own framework.',
  },
  {
    id: 'darpan-decoded-series',
    group: 'social',
    medium: 'social',
    title: '@darpan.decoded — System Design carousel series',
    url: 'https://www.instagram.com/p/DcYi7g3Eiqd/',
    whatItOffers:
      'Part of an ongoing System Design carousel series; the full notes PDF is distributed by commenting on the post rather than posted publicly.',
  },
  {
    id: 'mastercode-sagar-handwritten-notes',
    group: 'social',
    medium: 'social',
    title: '@mastercode.sagar — "System Design & Architecture Handwritten Notes"',
    url: 'https://www.instagram.com/p/DcTYBzrk8x2/',
    whatItOffers:
      'A topic checklist (HLD/LLD, client-server architecture, scalability, caching, APIs, microservices, distributed systems) aimed at placement prep; the handwritten notes themselves are sent out by commenting "SYSTEM."',
  },
  {
    id: 'mastercode-sagar-handwriting-notes-2',
    group: 'social',
    medium: 'social',
    title: '@mastercode.sagar — "System Design Handwriting Notes"',
    url: 'https://www.instagram.com/p/Dbk4mOukzIU/',
    whatItOffers:
      'A second handwritten-notes carousel from the same account — image-only, no caption text describing scope.',
  },
  {
    id: 'code2careerai-roadmap',
    group: 'social',
    medium: 'social',
    title: '@code2careerai — System Design roadmap graphic',
    url: 'https://www.instagram.com/p/DbxYIstMOZY/',
    whatItOffers:
      'A single roadmap graphic positioned as an at-a-glance study path — the value is in the image itself, not the caption.',
  },
  {
    id: 'pradeep-kumar-iiitd-docs',
    group: 'social',
    medium: 'social',
    title: '@pradeep_kumar_iiitd — System Design doc',
    url: 'https://www.instagram.com/p/DbzX6n3iSHx/',
    whatItOffers: "A shared System Design document image — no caption describing scope, content is in the post's image.",
  },
  {
    id: 'pradeep-kumar-iiitd-questions',
    group: 'social',
    medium: 'social',
    title: '@pradeep_kumar_iiitd — "System Design Important Questions"',
    url: 'https://www.instagram.com/p/DcEYCBWCese/',
    whatItOffers: 'A curated interview-question list from the same account, image-only.',
  },
  {
    id: 'codedsoul-05-qa',
    group: 'social',
    medium: 'social',
    title: '@codedsoul_05 — "System Design Interview Questions & Answers"',
    url: 'https://www.instagram.com/p/DcGv3phDbMX/',
    whatItOffers:
      'Caption names 15 interview topics (scalability, caching, sharding, CAP theorem, Kafka, CDN, microservices, fault tolerance, and more); the actual Q&A pairs are distributed by commenting on the post rather than shown inline.',
  },

  // --- ML System Design ---
  {
    id: 'tds-ml-system-design-framework',
    group: 'ml-system-design',
    title: 'Towards Data Science — "How to Answer Any Machine Learning System Design Interview Question"',
    url: 'https://towardsdatascience.com/how-to-answer-any-machine-learning-system-design-interview-question-a98656bb7ff0',
    whatItOffers:
      'A 9-part evaluation framework (business problem → success metrics → problem formulation → architecture → feature engineering → data quality/bias → baseline modeling → training pipeline → evaluation) that calibrates expectations by seniority — the closest external match to this page\'s own ML-Specific Framework section.',
  },
  {
    id: 'cracking-ml-interview-github',
    group: 'ml-system-design',
    title: 'CrackingMachineLearningInterview (GitHub)',
    url: 'https://github.com/shafaypro/CrackingMachineLearningInterview',
    whatItOffers:
      'A broad topic index spanning classic ML, deep learning, MLOps, data engineering, and cloud ML platforms, with a dedicated system-design track covering RAG pipelines, agent architectures, and batch-vs-real-time systems.',
  },
  {
    id: 'techcrunch-quora-ranking-2011',
    group: 'ml-system-design',
    title: 'TechCrunch — "Quora Reveals The Secret Sauce Behind Its Content Ranking Algorithm"',
    url: 'https://techcrunch.com/2011/02/05/quora-ranking/',
    whatItOffers:
      "Quora's original (2011, pre-ML) answer-ranking system — votes weighted by the voter's own reputation, with spam/collusion filtering. Worth reading alongside the Uber Michelangelo case study below as the \"before\" to a modern ML-ranked feed.",
  },
  {
    id: 'uber-michelangelo',
    group: 'ml-system-design',
    title: 'Uber Engineering — "Meet Michelangelo: Uber\'s Machine Learning Platform"',
    url: 'https://www.uber.com/blog/michelangelo-machine-learning-platform/',
    whatItOffers:
      "Uber's own account of its internal ML platform — a 6-stage architecture (data management → training → evaluation → deployment → prediction serving → monitoring) built on a shared feature store, cited directly in this page's ML-Specific Framework's High-Level Architecture step.",
  },
];
