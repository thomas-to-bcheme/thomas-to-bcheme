/**
 * The reading path: data engineering end to end first, then software
 * engineering as the base for designing and scaling data-intensive
 * applications, ordered hardware → code → orchestration. Every book id
 * resolves against OREILLY_BOOKS (checked by scripts/verifySweDe.ts).
 */

import type { BookId, PathAssessmentItem, ReadingStage } from './types';

/** The commonly-shared starting path being assessed. */
export const ORIGINAL_STARTING_PATH: string[] = [
  'Fundamentals of Data Engineering',
  'Designing Data-Intensive Applications',
  'Learning Spark',
  'The Data Warehouse Toolkit',
  'Kafka: The Definitive Guide',
];

/** Five books that replace the original starting path. */
export const START_HERE_PATH: BookId[] = [
  'fundamentals-of-data-engineering',
  'designing-data-intensive-applications',
  'database-internals',
  'learning-sql',
  'learning-spark',
];

export const PATH_ASSESSMENT: PathAssessmentItem[] = [
  {
    id: 'lifecycle-first',
    verdict: 'keeps',
    title: 'Starting from the lifecycle is right',
    detail:
      'Fundamentals of Data Engineering first means every tool that follows has a place to sit: you know which stage Spark, Kafka, or a warehouse serves before learning its API.',
    bookIds: ['fundamentals-of-data-engineering'],
  },
  {
    id: 'ddia-second',
    verdict: 'keeps',
    title: 'DDIA early is right, but use the 2nd edition',
    detail:
      'Kleppmann is still the best map of the field. The 2nd edition (2026, with Chris Riccomini) updates it for cloud-native storage and streaming.',
    bookIds: ['designing-data-intensive-applications'],
  },
  {
    id: 'no-hardware',
    verdict: 'gap',
    title: 'No hardware or OS layer',
    detail:
      'Without the memory hierarchy you cannot explain why data engineering runs on CPUs rather than GPUs, why columnar formats win, or what a slow job is actually waiting on. The path begins at the API, above the layer that sets its costs.',
    bookIds: ['dive-into-systems', 'understanding-software-dynamics', 'systems-performance'],
  },
  {
    id: 'no-storage-engines',
    verdict: 'gap',
    title: 'No storage-engine internals',
    detail:
      'DDIA introduces B-trees and LSM-trees as concepts. Database Internals shows the page layouts, compaction, and concurrency control that decide a system\'s read and write costs.',
    bookIds: ['database-internals'],
  },
  {
    id: 'spark-before-sql',
    verdict: 'gap',
    title: 'Spark comes before SQL',
    detail:
      'Spark SQL is a relational optimizer. Without SQL, query plans, and join algorithms first, Spark\'s physical plan reads as noise. The basics-to-performance order is SQL, then Spark.',
    bookIds: ['learning-sql', 'postgresql-query-optimization'],
  },
  {
    id: 'kafka-before-streaming-theory',
    verdict: 'gap',
    title: 'Kafka comes before streaming theory',
    detail:
      'A broker is a log, not a stream processor. Event time, watermarks, and exactly-once semantics (Streaming Systems) are what make Kafka designs correct, so they come first.',
    bookIds: ['streaming-systems'],
  },
  {
    id: 'no-distributed-or-orchestration',
    verdict: 'gap',
    title: 'No distributed-systems theory or orchestration',
    detail:
      'Nothing covers consensus, partial failure, or resilience patterns, and nothing covers the two industry-standard control planes, Kubernetes for compute and Airflow for workflows.',
    bookIds: [
      'think-distributed-systems',
      'designing-distributed-systems',
      'kubernetes-up-and-running',
      'data-pipelines-with-airflow',
    ],
  },
];

export const READING_STAGES: ReadingStage[] = [
  {
    id: 'frame',
    stepNumber: 0,
    label: 'Frame the field',
    kind: 'frame',
    bookIds: ['fundamentals-of-data-engineering', 'fundamentals-of-software-architecture'],
    outcome: 'What the lifecycle is, and which architecture characteristics trade against each other.',
  },
  {
    id: 'hardware',
    stepNumber: 1,
    label: 'Hardware and the OS',
    kind: 'hardware',
    bookIds: ['dive-into-systems', 'understanding-software-dynamics', 'systems-performance'],
    outcome:
      'The memory hierarchy, why data engineering is bound by memory and I/O rather than arithmetic, and how to profile a slow job.',
  },
  {
    id: 'storage-engines',
    stepNumber: 2,
    label: 'Storage engines',
    kind: 'application',
    bookIds: ['designing-data-intensive-applications', 'database-internals'],
    outcome: 'B-tree vs LSM-tree, and the read, write, and space amplification each one trades.',
  },
  {
    id: 'sql',
    stepNumber: 3,
    label: 'SQL, basics to high performance',
    kind: 'application',
    bookIds: [
      'learning-sql',
      'postgresql-query-optimization',
      'high-performance-mysql',
      'data-warehouse-toolkit',
    ],
    outcome: 'Execution plans, index choice, join algorithms, and dimensional modeling.',
  },
  {
    id: 'batch-compute',
    stepNumber: 4,
    label: 'Spark, basics to high performance',
    kind: 'application',
    bookIds: ['learning-spark', 'spark-definitive-guide', 'high-performance-spark'],
    outcome: 'Shuffles, join strategy selection, adaptive query execution, and Tungsten.',
  },
  {
    id: 'streams-events',
    stepNumber: 5,
    label: 'Streams and events',
    kind: 'distributed',
    bookIds: ['streaming-systems', 'kafka-definitive-guide', 'building-event-driven-microservices'],
    outcome: 'Event time, effectively-once delivery, event sourcing, and the outbox pattern.',
  },
  {
    id: 'distributed',
    stepNumber: 6,
    label: 'Distributed systems',
    kind: 'distributed',
    bookIds: [
      'think-distributed-systems',
      'designing-distributed-systems',
      'building-resilient-distributed-systems',
      'building-distributed-applications-that-work',
    ],
    outcome: 'Consensus, partial failure, resilience patterns, and how they compose into one working application.',
  },
  {
    id: 'orchestration',
    stepNumber: 7,
    label: 'Orchestration',
    kind: 'distributed',
    bookIds: ['kubernetes-up-and-running', 'kubernetes-patterns', 'data-pipelines-with-airflow'],
    outcome: 'Reconciliation loops, scheduling, and DAG-based workflow orchestration.',
  },
  {
    id: 'platform',
    stepNumber: 8,
    label: 'Platform at scale',
    kind: 'platform',
    bookIds: ['data-pipelines-pocket-reference', 'seven-databases', 'data-mesh', 'data-management-at-scale'],
    outcome: 'Choosing a platform shape — store per access pattern, and ownership per domain.',
  },
  {
    id: 'ai-era',
    stepNumber: 9,
    label: 'AI-era extensions',
    kind: 'platform',
    bookIds: [
      'data-engineering-for-multimodal-ai',
      'nlp-with-spark-nlp',
      'distributed-ai-systems',
      'ai-systems-performance-engineering',
      'redefining-data-engineering-with-ai',
    ],
    outcome: 'Where workloads flip from CPU-bound to GPU-bound, and what data engineering must feed them.',
  },
  {
    id: 'software-craft',
    stepNumber: 10,
    label: 'Software engineering base (read in parallel)',
    kind: 'craft',
    bookIds: [
      'fundamentals-of-software-engineering',
      'pragmatic-programmer',
      'software-engineering-at-google',
      'release-it',
      'working-effectively-with-legacy-code',
    ],
    outcome: 'Shipping, testing, and keeping production systems alive as they grow and age.',
  },
];
