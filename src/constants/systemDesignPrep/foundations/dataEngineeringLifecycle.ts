import type {
  DataEngineeringOutput,
  DataEngineeringStage,
  DataEngineeringUndercurrent,
} from './types';

// The data engineering lifecycle, after Reis & Housley's "Fundamentals of
// Data Engineering" (O'Reilly, 2022). Single source of truth: the
// Foundations section's rebuilt figure and stage accordions read this
// directly, and developmentLifecycles.ts derives its Data Engineering card
// (stages + undercurrents) from it rather than keeping its own copy.
//
// Stage names, undercurrent names, and chapter numbers come from the book's
// public table of contents; summaries, key questions, and practices are this
// page's own synthesis for interview use, not quotes from the book.

// Book (Part II chapter) order — the diagram derives its left-to-right
// layout from each stage's `layer`, so this order only needs to be the
// reading order of the accordions below the figure.
export const DE_LIFECYCLE_STAGES: DataEngineeringStage[] = [
  {
    id: 'generation',
    label: 'Generation',
    summary: 'Data is produced at the source — application events, third-party APIs, user input.',
    detail:
      'Source systems are usually owned by someone else — an application team, a vendor, a device fleet. The data engineer consumes them, so the first job is understanding their shape and failure modes rather than designing them.',
    keyQuestions: [
      'What kind of source is it — an OLTP database, an event stream, a third-party API, logs, IoT devices?',
      'How fast is data produced, and in what volume?',
      'What is the schema, and how — and how often — does it change?',
      'Who owns the source, and what happens downstream when it breaks or changes without notice?',
    ],
    chapter: 5,
    layer: 'source',
    tone: 'rose',
  },
  {
    id: 'storage',
    label: 'Storage',
    summary: 'Landed somewhere durable and queryable, at whatever tier matches its access pattern.',
    detail:
      'Storage is not a step data passes through once — it sits underneath ingestion, transformation, and serving, which all read from and write to it. That is why the figure draws it as a foundation layer rather than a box in the row.',
    keyQuestions: [
      'What read/write throughput and latency does each consumer need?',
      'Will it scale to the expected volume, and at what cost per GB and per query?',
      'Is the data hot (queried constantly) or cold (kept for compliance or reprocessing)?',
      'Does the storage engine fit how the data will actually be queried — row vs. columnar, object vs. block?',
    ],
    chapter: 6,
    layer: 'foundation',
    tone: 'zinc',
  },
  {
    id: 'ingestion',
    label: 'Ingestion',
    summary: 'Moved from source into the pipeline, in batch or as a stream.',
    detail:
      'Ingestion is where source-system unreliability meets pipeline expectations, so it is often the most fragile stage. The batch-vs-streaming choice is a cost/latency trade-off, not a default.',
    keyQuestions: [
      'Batch or streaming — and does the consumer actually need real-time, or just "fresh enough"?',
      'Push (the source sends) or pull (the pipeline fetches)?',
      'What volume and frequency, and what happens to downstream jobs when a load is late or partial?',
      'How are duplicates, late-arriving records, and schema drift handled?',
    ],
    chapter: 7,
    layer: 'pipeline',
    tone: 'emerald',
  },
  {
    id: 'transformation',
    label: 'Transformation',
    summary: 'Cleaned, joined, and reshaped into the form downstream consumers actually need.',
    detail:
      'Transformation is where raw data picks up business meaning — type casting, cleaning, joins, aggregation, and data modeling. Every transform has a compute cost, so it should be justified by a consumer that needs it.',
    keyQuestions: [
      'What business logic is being applied, and who owns its definition?',
      'Which data model fits the consumers — normalized, dimensional (star schema), wide/denormalized?',
      'Does it run in batch or in-stream, and how is it backfilled when logic changes?',
      'Is the cost of computing it justified by the value downstream?',
    ],
    chapter: 8,
    layer: 'pipeline',
    tone: 'violet',
  },
  {
    id: 'serving',
    label: 'Serving',
    summary: 'Made available to whatever consumes it next — a dashboard, an application, or a model.',
    detail:
      'Serving is where data finally produces value, and where trust is won or lost: a fast dashboard with wrong numbers is worse than no dashboard. The three classic consumers are analytics, machine learning, and reverse ETL.',
    keyQuestions: [
      'Who consumes it, through what interface, and with what freshness/latency expectation?',
      'Do consumers trust it — are definitions consistent and is quality monitored?',
      'Is access controlled to the right granularity for each consumer?',
    ],
    chapter: 9,
    layer: 'pipeline',
    tone: 'sky',
  },
];

// The 6 undercurrents — cross-cutting concerns that apply at every stage
// above rather than being a stage of their own. Figure order (left to right).
export const DE_UNDERCURRENTS: DataEngineeringUndercurrent[] = [
  {
    id: 'security',
    label: 'Security',
    summary: 'Protect data and access at every stage, not as a final gate.',
    keyPractices: [
      'Least privilege for people and service accounts',
      'Encryption in transit and at rest',
      'Security as culture, not just tooling — most breaches are human',
    ],
    tone: 'purple',
  },
  {
    id: 'data-management',
    label: 'Data management',
    summary: 'Make data discoverable, trustworthy, and compliant across its whole life.',
    keyPractices: [
      'Governance, data quality checks, and ownership',
      'Metadata and lineage — where data came from and what touched it',
      'Privacy, retention, and regulatory compliance',
    ],
    tone: 'blue',
  },
  {
    id: 'dataops',
    label: 'DataOps',
    summary: 'Apply DevOps and Agile habits to data: automate, observe, respond.',
    keyPractices: [
      'Automated deployment and testing of pipelines',
      'Monitoring and observability of data health, not just job success',
      'Incident response when bad data ships',
    ],
    tone: 'yellow',
  },
  {
    id: 'data-architecture',
    label: 'Data architecture',
    summary: 'Design the data system to serve business needs, and keep decisions reversible.',
    keyPractices: [
      'Trade cost against flexibility explicitly',
      'Prefer reversible decisions; isolate the irreversible ones',
      'Revisit the architecture as needs change',
    ],
    tone: 'teal',
    relatedSubsectionId: 'foundations-software-architecture',
  },
  {
    id: 'orchestration',
    label: 'Orchestration',
    summary: 'Coordinate jobs as dependency graphs with scheduling, retries, and alerting.',
    keyPractices: [
      'Model pipelines as DAGs of dependent tasks',
      'Retries, timeouts, and backfills as first-class features',
      'Alert on missed SLAs, not only on failures',
    ],
    tone: 'pink',
  },
  {
    id: 'software-engineering',
    label: 'Software engineering',
    summary: 'Treat pipelines as software: versioned, tested, reviewed code.',
    keyPractices: [
      'Pipelines and infrastructure as code',
      'Code quality, testing, and review apply to SQL and DAGs too',
      'Build vs. adopt open-source vs. buy managed, decided deliberately',
    ],
    tone: 'orange',
    relatedSubsectionId: 'foundations-software-engineering',
  },
];

// The 3 downstream consumers of the Serving stage — the book's Chapter 9 is
// titled after exactly these three.
export const DE_DOWNSTREAM_OUTPUTS: DataEngineeringOutput[] = [
  {
    id: 'analytics',
    label: 'Analytics',
    summary: 'Business intelligence, operational dashboards, and analytics embedded in customer-facing products.',
  },
  {
    id: 'machine-learning',
    label: 'Machine learning',
    summary: 'Features and training data for models — the Data stage the ML framework above assumes is already built.',
  },
  {
    id: 'reverse-etl',
    label: 'Reverse ETL',
    summary: 'Processed data pushed back into operational tools (CRM, ad platforms) — closing the loop to source systems.',
  },
];

export const DE_LIFECYCLE_CHAPTER_RANGE = {
  first: Math.min(...DE_LIFECYCLE_STAGES.map((stage) => stage.chapter)),
  last: Math.max(...DE_LIFECYCLE_STAGES.map((stage) => stage.chapter)),
};
