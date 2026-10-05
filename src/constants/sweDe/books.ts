/**
 * The O'Reilly book registry — the single source for every book cited on the
 * /swe-de pages (and for the Foundations books in
 * src/constants/systemDesignPrep/externalReferences.ts).
 *
 * URLs are never stored: they derive from slug + oreillyId via getOreillyUrl.
 * Every slug/id was matched against O'Reilly's own indexed [Book] page
 * (October 2026). Books not on O'Reilly were replaced by their closest
 * O'Reilly-hosted equivalent:
 *  - Computer Systems: A Programmer's Perspective → Dive Into Systems
 *  - SQL Performance Explained → PostgreSQL Query Optimization
 *  - A Philosophy of Software Design → Fundamentals of Software Engineering
 */

import { OREILLY_LIBRARY_BASE_URL, type BookId, type OreillyBook } from './types';

export const OREILLY_BOOKS: OreillyBook[] = [
  // --- Frame ---
  {
    id: 'fundamentals-of-data-engineering',
    title: 'Fundamentals of Data Engineering',
    year: 2022,
    authors: ['Joe Reis', 'Matt Housley'],
    publisher: "O'Reilly",
    track: 'frame',
    slug: 'fundamentals-of-data',
    oreillyId: '9781098108298',
    isbn13: '9781098108298',
    whyRead:
      'The lifecycle vocabulary (generation → storage → ingestion → transformation → serving, plus the undercurrents) every later book plugs into.',
  },
  {
    id: 'fundamentals-of-software-engineering',
    title: 'Fundamentals of Software Engineering',
    year: 2025,
    authors: ['Nathaniel Schutta', 'Dan Vega'],
    publisher: "O'Reilly",
    track: 'frame',
    slug: 'fundamentals-of-software',
    oreillyId: '9781098143220',
    isbn13: '9781098143220',
    whyRead:
      'The gap between writing code and engineering it — reading existing code, modeling, testing, and a reliable path to production. Stands in for A Philosophy of Software Design, which is not on O\'Reilly.',
  },
  {
    id: 'fundamentals-of-software-architecture',
    title: 'Fundamentals of Software Architecture',
    edition: '2nd ed.',
    year: 2025,
    authors: ['Mark Richards', 'Neal Ford'],
    publisher: "O'Reilly",
    track: 'frame',
    slug: 'fundamentals-of-software',
    oreillyId: '9781098175504',
    isbn13: '9781098175504',
    whyRead:
      'Architecture characteristics and the trade-offs between them — the "why" vocabulary that turns a tool choice into a defensible decision.',
  },

  // --- Hardware ---
  {
    id: 'dive-into-systems',
    title: 'Dive Into Systems',
    year: 2022,
    authors: ['Suzanne J. Matthews', 'Tia Newhall', 'Kevin C. Webb'],
    publisher: 'No Starch Press',
    track: 'hardware',
    slug: 'dive-into-systems',
    oreillyId: '9781098141370',
    isbn13: '9781098141370',
    whyRead:
      'C, assembly, the memory hierarchy, caching, and the OS from the ground up — the O\'Reilly-hosted stand-in for Computer Systems: A Programmer\'s Perspective.',
  },
  {
    id: 'understanding-software-dynamics',
    title: 'Understanding Software Dynamics',
    year: 2021,
    authors: ['Richard L. Sites'],
    publisher: 'Addison-Wesley',
    track: 'hardware',
    slug: 'understanding-software-dynamics',
    oreillyId: '9780137589692',
    isbn13: '9780137589692',
    whyRead:
      'Measuring CPU, memory, disk, and network time at the nanosecond level — how to find out what a slow query is actually waiting on.',
  },
  {
    id: 'systems-performance',
    title: 'Systems Performance',
    edition: '2nd ed.',
    year: 2020,
    authors: ['Brendan Gregg'],
    publisher: 'Addison-Wesley',
    track: 'hardware',
    slug: 'systems-performance-2nd',
    oreillyId: '9780136821694',
    isbn13: '9780136821694',
    whyRead:
      'The USE method and Linux observability tooling — attributing a slow job to CPU, memory, file system, disk, or network instead of guessing.',
  },
  {
    id: 'ai-systems-performance-engineering',
    title: 'AI Systems Performance Engineering',
    year: 2025,
    authors: ['Chris Fregly'],
    publisher: "O'Reilly",
    track: 'hardware',
    slug: 'ai-systems-performance',
    oreillyId: '9798341627772',
    isbn13: '9798341627772',
    whyRead:
      'The GPU side of the same question — what makes a workload accelerator-bound, and why data loading so often starves it.',
  },

  // --- Architecture ---
  {
    id: 'designing-data-intensive-applications',
    title: 'Designing Data-Intensive Applications',
    edition: '2nd ed.',
    year: 2026,
    authors: ['Martin Kleppmann', 'Chris Riccomini'],
    publisher: "O'Reilly",
    track: 'architecture',
    slug: 'designing-data-intensive-applications',
    oreillyId: '9781098119058',
    isbn13: '9781098119058',
    whyRead:
      'The map of the whole field — storage engines, replication, partitioning, transactions, consistency, batch and stream — at the level of first principles rather than products.',
  },
  {
    id: 'database-internals',
    title: 'Database Internals',
    year: 2019,
    authors: ['Alex Petrov'],
    publisher: "O'Reilly",
    track: 'architecture',
    slug: 'database-internals',
    oreillyId: '9781492040330',
    isbn13: '9781492040330',
    whyRead:
      'Part I opens up B-tree pages, LSM compaction, and buffer management; Part II covers failure detection, leader election, and consensus.',
  },
  {
    id: 'data-mesh',
    title: 'Data Mesh',
    year: 2022,
    authors: ['Zhamak Dehghani'],
    publisher: "O'Reilly",
    track: 'architecture',
    slug: 'data-mesh',
    oreillyId: '9781492092384',
    isbn13: '9781492092384',
    whyRead:
      'Domain ownership, data as a product, and federated governance — the organizational answer once one central data team becomes the bottleneck.',
  },
  {
    id: 'data-management-at-scale',
    title: 'Data Management at Scale',
    edition: '2nd ed.',
    year: 2023,
    authors: ['Piethein Strengholt'],
    publisher: "O'Reilly",
    track: 'architecture',
    slug: 'data-management-at',
    oreillyId: '9781098138851',
    isbn13: '9781098138851',
    whyRead:
      'Enterprise data architecture — distribution, integration patterns, metadata, and governance — for when the platform spans many domains.',
  },

  // --- Storage + SQL ---
  {
    id: 'learning-sql',
    title: 'Learning SQL',
    edition: '3rd ed.',
    year: 2020,
    authors: ['Alan Beaulieu'],
    publisher: "O'Reilly",
    track: 'storage-sql',
    slug: 'learning-sql-3rd',
    oreillyId: '9781492057604',
    isbn13: '9781492057604',
    whyRead:
      'The SQL basics: joins, grouping, subqueries, window functions, and transactions, before any optimizer or distributed engine is involved.',
  },
  {
    id: 'postgresql-query-optimization',
    title: 'PostgreSQL Query Optimization',
    year: 2021,
    authors: ['Henrietta Dombrovskaya', 'Boris Novikov', 'Anna Bailliekova'],
    publisher: 'Apress',
    track: 'storage-sql',
    slug: 'postgresql-query-optimization',
    oreillyId: '9781484268858',
    isbn13: '9781484268858',
    whyRead:
      'Reading execution plans, choosing indexes, and steering join algorithms — the O\'Reilly-hosted equivalent of SQL Performance Explained.',
  },
  {
    id: 'high-performance-mysql',
    title: 'High Performance MySQL',
    edition: '4th ed.',
    year: 2021,
    authors: ['Silvia Botros', 'Jeremy Tinley'],
    publisher: "O'Reilly",
    track: 'storage-sql',
    slug: 'high-performance-mysql',
    oreillyId: '9781492080503',
    isbn13: '9781492080503',
    whyRead:
      'InnoDB\'s clustered B+tree, schema and index design, and replication — SQL performance on a real engine in production.',
  },
  {
    id: 'data-warehouse-toolkit',
    title: 'The Data Warehouse Toolkit',
    edition: '3rd ed.',
    year: 2013,
    authors: ['Ralph Kimball', 'Margy Ross'],
    publisher: 'Wiley',
    track: 'storage-sql',
    slug: 'the-data-warehouse',
    oreillyId: '9781118530801',
    isbn13: '9781118530801',
    whyRead:
      'Dimensional modeling — facts, dimensions, grain, slowly changing dimensions — still the schema shape that analytical engines are fastest on.',
  },
  {
    id: 'seven-databases',
    title: 'Seven Databases in Seven Weeks',
    edition: '2nd ed.',
    year: 2018,
    authors: ['Luc Perkins', 'Eric Redmond', 'Jim R. Wilson'],
    publisher: 'Pragmatic Bookshelf',
    track: 'storage-sql',
    slug: 'seven-databases-in',
    oreillyId: '9781680505962',
    isbn13: '9781680505962',
    whyRead:
      'Hands-on contrast across relational, key-value, columnar, document, and graph stores — the storage-model trade-offs felt rather than read.',
  },

  // --- Pipelines ---
  {
    id: 'data-pipelines-pocket-reference',
    title: 'Data Pipelines Pocket Reference',
    year: 2021,
    authors: ['James Densmore'],
    publisher: "O'Reilly",
    track: 'pipelines',
    slug: 'data-pipelines-pocket',
    oreillyId: '9781492087823',
    isbn13: '9781492087823',
    whyRead:
      'ELT vs ETL, ingestion patterns, validation, and orchestration in one short read — the practical baseline for a batch pipeline.',
  },
  {
    id: 'learning-spark',
    title: 'Learning Spark',
    edition: '2nd ed.',
    year: 2020,
    authors: ['Jules S. Damji', 'Brooke Wenig', 'Tathagata Das', 'Denny Lee'],
    publisher: "O'Reilly",
    track: 'pipelines',
    slug: 'learning-spark-2nd',
    oreillyId: '9781492050032',
    isbn13: '9781492050032',
    whyRead:
      'The Spark basics: DataFrames, Spark SQL, Structured Streaming, and Delta Lake on Spark 3.',
  },
  {
    id: 'spark-definitive-guide',
    title: 'Spark: The Definitive Guide',
    year: 2018,
    authors: ['Bill Chambers', 'Matei Zaharia'],
    publisher: "O'Reilly",
    track: 'pipelines',
    slug: 'spark-the-definitive',
    oreillyId: '9781491912201',
    isbn13: '9781491912201',
    whyRead:
      'The full API surface and execution model — jobs, stages, tasks, partitions, and the physical plan. Written for Spark 2.x, so pair it with High Performance Spark for current internals.',
  },
  {
    id: 'high-performance-spark',
    title: 'High Performance Spark',
    edition: '2nd ed.',
    year: 2026,
    authors: ['Holden Karau', 'Adi Polak', 'Rachel Warren'],
    publisher: "O'Reilly",
    track: 'pipelines',
    slug: 'high-performance-spark',
    oreillyId: '9781098145842',
    isbn13: '9781098145842',
    whyRead:
      'Spark 4.x performance: shuffles, skew, join selection, memory management, and when to leave the JVM.',
  },
  {
    id: 'nlp-with-spark-nlp',
    title: 'Natural Language Processing with Spark NLP',
    year: 2020,
    authors: ['Alex Thomas'],
    publisher: "O'Reilly",
    track: 'pipelines',
    slug: 'natural-language-processing',
    oreillyId: '9781492047759',
    isbn13: '9781492047759',
    whyRead:
      'Text processing as a distributed Spark pipeline — where batch data engineering meets ML feature work.',
  },

  // --- Streaming + Events ---
  {
    id: 'streaming-systems',
    title: 'Streaming Systems',
    year: 2018,
    authors: ['Tyler Akidau', 'Slava Chernyak', 'Reuven Lax'],
    publisher: "O'Reilly",
    track: 'streaming',
    slug: 'streaming-systems',
    oreillyId: '9781491983867',
    isbn13: '9781491983867',
    whyRead:
      'Event time vs processing time, windows, watermarks, triggers, and exactly-once. The theory to read before any streaming product.',
  },
  {
    id: 'kafka-definitive-guide',
    title: 'Kafka: The Definitive Guide',
    edition: '2nd ed.',
    year: 2021,
    authors: ['Gwen Shapira', 'Todd Palino', 'Rajini Sivaram', 'Krit Petty'],
    publisher: "O'Reilly",
    track: 'streaming',
    slug: 'kafka-the-definitive',
    oreillyId: '9781492043072',
    isbn13: '9781492043072',
    whyRead:
      'The partitioned, replicated append-only log — producers, consumer groups, ISR replication, and transactional delivery.',
  },
  {
    id: 'building-event-driven-microservices',
    title: 'Building Event-Driven Microservices',
    edition: '2nd ed.',
    year: 2025,
    authors: ['Adam Bellemare'],
    publisher: "O'Reilly",
    track: 'streaming',
    slug: 'building-event-driven-microservices',
    oreillyId: '9798341622180',
    isbn13: '9798341622180',
    whyRead:
      'Event streams as the system of record — event-carried state, the outbox pattern, CQRS, and schema evolution across services.',
  },

  // --- Distributed Systems ---
  {
    id: 'think-distributed-systems',
    title: 'Think Distributed Systems',
    year: 2025,
    authors: ['Dominik Tornow'],
    publisher: 'Manning',
    track: 'distributed',
    slug: 'think-distributed-systems',
    oreillyId: '9781633436176',
    isbn13: '9781633436176',
    whyRead:
      'Mental models first: failure, partial failure, consistency, and coordination before any specific system.',
  },
  {
    id: 'designing-distributed-systems',
    title: 'Designing Distributed Systems',
    edition: '2nd ed.',
    year: 2024,
    authors: ['Brendan Burns'],
    publisher: "O'Reilly",
    track: 'distributed',
    slug: 'designing-distributed-systems',
    oreillyId: '9781098156343',
    isbn13: '9781098156343',
    whyRead:
      'Reusable container patterns — sidecar, ambassador, adapter, sharded and scatter/gather services, work queues, leader election — from Kubernetes\' co-creator.',
  },
  {
    id: 'building-resilient-distributed-systems',
    title: 'Building Resilient Distributed Systems',
    year: 2026,
    authors: ['Sam Newman'],
    publisher: "O'Reilly",
    track: 'distributed',
    slug: 'building-resilient-distributed',
    oreillyId: '9781098163532',
    isbn13: '9781098163532',
    whyRead:
      'Timeouts, retries, idempotency, back-pressure, and degradation — designing for the failures the first two books taught you to expect.',
  },
  {
    id: 'building-distributed-applications-that-work',
    title: 'Building Distributed Applications that Work',
    year: 2026,
    authors: ['Fiodar Sazanavets'],
    publisher: 'Manning',
    track: 'distributed',
    slug: 'building-distributed-applications',
    oreillyId: '9781633435124',
    isbn13: '9781633435124',
    whyRead:
      'The applied capstone: service discovery, configuration, observability, and resilience wired together end to end (with .NET Aspire), turning the patterns into one working system.',
    isListingPending: true,
  },
  {
    id: 'distributed-ai-systems',
    title: 'Distributed AI Systems',
    year: 2026,
    authors: ['Fuheng Wu'],
    publisher: 'Packt',
    track: 'distributed',
    slug: 'distributed-ai-systems',
    oreillyId: '9781807301712',
    isbn13: '9781807301712',
    whyRead:
      'Data, tensor, and pipeline parallelism for training and inference — the distributed patterns above, applied to GPU clusters.',
  },

  // --- Orchestration ---
  {
    id: 'kubernetes-up-and-running',
    title: 'Kubernetes: Up and Running',
    edition: '3rd ed.',
    year: 2022,
    authors: ['Brendan Burns', 'Joe Beda', 'Kelsey Hightower', 'Lachlan Evenson'],
    publisher: "O'Reilly",
    track: 'orchestration',
    slug: 'kubernetes-up-and',
    oreillyId: '9781098110192',
    isbn13: '9781098110192',
    whyRead:
      'Pods, Deployments, Services, and the declarative API — the core objects and the reconciliation model underneath them.',
  },
  {
    id: 'kubernetes-patterns',
    title: 'Kubernetes Patterns',
    edition: '2nd ed.',
    year: 2023,
    authors: ['Bilgin Ibryam', 'Roland Huß'],
    publisher: "O'Reilly",
    track: 'orchestration',
    slug: 'kubernetes-patterns-2nd',
    oreillyId: '9781098131678',
    isbn13: '9781098131678',
    whyRead:
      'Controller, operator, batch job, and stateful-service patterns — how data platforms (Spark, Kafka, Airflow) run on Kubernetes.',
  },
  {
    id: 'data-pipelines-with-airflow',
    title: 'Data Pipelines with Apache Airflow',
    edition: '2nd ed.',
    year: 2026,
    authors: ['Julian de Ruiter', 'Ismael Cabral', 'Kris Geusebroek', 'Daniel van der Ende', 'Bas Harenslak'],
    publisher: 'Manning',
    track: 'orchestration',
    slug: 'data-pipelines-with',
    oreillyId: '9781633436374',
    isbn13: '9781633436374',
    whyRead:
      'DAGs, data intervals, idempotent tasks, backfills, and deployment on Kubernetes, covering Airflow 3.',
  },

  // --- AI-Era Data Engineering ---
  {
    id: 'data-engineering-for-multimodal-ai',
    title: 'Data Engineering for Multimodal AI',
    year: 2026,
    authors: ['Vasundra Srinivasan'],
    publisher: "O'Reilly",
    track: 'ai-era',
    slug: 'data-engineering-for',
    oreillyId: '9781098190774',
    isbn13: '9781098190774',
    whyRead:
      'Pipelines for images, audio, video, and embeddings — where the same lifecycle meets unstructured data and GPU consumers.',
  },
  {
    id: 'redefining-data-engineering-with-ai',
    title: 'Redefining Data Engineering with AI',
    year: null,
    authors: ['Ashok Singamaneni', 'Sarath Chandra Bandaru', 'Phani Vemuri', 'Aditya Chaturvedi'],
    publisher: "O'Reilly",
    track: 'ai-era',
    slug: 'redefining-data-engineering',
    oreillyId: '0642572283919',
    isbn13: null,
    whyRead:
      'Early Release: how LLMs and agents change pipeline authoring, quality checks, and operations — read last, once the fundamentals give you something to judge it against.',
  },

  // --- Software Craft ---
  {
    id: 'pragmatic-programmer',
    title: 'The Pragmatic Programmer',
    edition: '20th anniversary ed.',
    year: 2019,
    authors: ['David Thomas', 'Andrew Hunt'],
    publisher: 'Addison-Wesley',
    track: 'software-craft',
    slug: 'the-pragmatic-programmer',
    oreillyId: '9780135956977',
    isbn13: '9780135956977',
    whyRead:
      'Orthogonality, tracer bullets, and DRY — habits that keep pipeline code changeable.',
  },
  {
    id: 'software-engineering-at-google',
    title: 'Software Engineering at Google',
    year: 2020,
    authors: ['Titus Winters', 'Tom Manshreck', 'Hyrum Wright'],
    publisher: "O'Reilly",
    track: 'software-craft',
    slug: 'software-engineering-at',
    oreillyId: '9781492082781',
    isbn13: '9781492082781',
    whyRead:
      'Programming integrated over time — testing, code review, dependency management, and Hyrum\'s Law at scale.',
  },
  {
    id: 'release-it',
    title: 'Release It!',
    edition: '2nd ed.',
    year: 2018,
    authors: ['Michael T. Nygard'],
    publisher: 'Pragmatic Bookshelf',
    track: 'software-craft',
    slug: 'release-it-2nd',
    oreillyId: '9781680504552',
    isbn13: '9781680504552',
    whyRead:
      'Stability patterns and anti-patterns — circuit breakers, bulkheads, timeouts — learned from production outages.',
  },
  {
    id: 'working-effectively-with-legacy-code',
    title: 'Working Effectively with Legacy Code',
    year: 2004,
    authors: ['Michael Feathers'],
    publisher: 'Pearson',
    track: 'software-craft',
    slug: 'working-effectively-with',
    oreillyId: '0131177052',
    isbn13: '9780131177055',
    whyRead:
      'Seams and characterization tests — how to change a pipeline nobody fully understands without breaking it.',
  },
];

const BOOKS_BY_ID = new Map(OREILLY_BOOKS.map((book) => [book.id, book]));

export function getBookById(id: BookId): OreillyBook | null {
  return BOOKS_BY_ID.get(id) ?? null;
}

/** null when the listing is not yet live on O'Reilly (see isListingPending). */
export function getOreillyUrl(book: OreillyBook): string | null {
  if (book.isListingPending === true) return null;
  return `${OREILLY_LIBRARY_BASE_URL}/${book.slug}/${book.oreillyId}/`;
}

/** Same as getOreillyUrl but by id — for callers outside /swe-de. */
export function getOreillyUrlById(id: BookId): string | null {
  const book = getBookById(id);
  return book === null ? null : getOreillyUrl(book);
}
