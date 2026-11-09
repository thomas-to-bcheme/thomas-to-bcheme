/**
 * Module 7 reference matrix: official documentation, standard-library APIs, and
 * production ecosystem libraries for each of the nine languages.
 *
 * Documentation links point at each language's canonical, vendor- or
 * standards-body-hosted documentation only. Library names are listed without
 * links; look each up from the language's own package index.
 */

import type { AdrChoice, LanguageEcosystem } from './types';

export const LANGUAGE_ECOSYSTEMS: LanguageEcosystem[] = [
  {
    languageId: 'sql',
    nativeDocs: [
      { label: 'PostgreSQL documentation', href: 'https://www.postgresql.org/docs/current/' },
      { label: 'ISO/IEC 9075 (SQL:2016)', href: 'https://www.iso.org/standard/63555.html' },
    ],
    standardApi: [
      'Window functions: ROW_NUMBER(), RANK(), LEAD(), LAG()',
      'Aggregates: SUM(), AVG(), JSONB_AGG()',
      'Common Table Expressions (WITH)',
      'PL/pgSQL procedural extension',
    ],
    libraryGroups: [
      { role: 'Drivers & ORMs', libraries: ['SQLAlchemy', 'Prisma', 'SQLx', 'pg-promise', 'jOOQ'] },
      { role: 'Migration tools', libraries: ['Flyway', 'Liquibase', 'Alembic'] },
    ],
    architectNote:
      'The query planner owns execution, so correctness and indexing decisions matter more than raw language speed. Reach for it when data is relational and consistency is non-negotiable.',
  },
  {
    languageId: 'python',
    nativeDocs: [
      { label: 'Python documentation', href: 'https://docs.python.org/3/' },
      { label: 'PEP index', href: 'https://peps.python.org/' },
    ],
    standardApi: [
      'Built-in types: list, dict, set',
      'itertools, functools, collections',
      'asyncio',
      'multiprocessing',
    ],
    libraryGroups: [
      { role: 'Web / API', libraries: ['FastAPI', 'Starlette', 'Pydantic', 'Django'] },
      { role: 'Data & compute', libraries: ['Polars', 'NumPy', 'Pandas', 'PyTorch', 'Scikit-Learn'] },
      { role: 'Interoperability', libraries: ['PyO3 / Maturin (Rust FFI)'] },
    ],
    architectNote:
      'Fast to write, slow per instruction, and the GIL limits CPU-bound threads. Use it as the orchestration layer and push hot loops into native libraries.',
  },
  {
    languageId: 'typescript',
    nativeDocs: [
      { label: 'TypeScript Handbook', href: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
      { label: 'ECMAScript specification (TC39)', href: 'https://tc39.es/ecma262/' },
    ],
    standardApi: [
      'Utility types: Partial, Record, Omit, Pick',
      'Promise APIs',
      'Type narrowing (control-flow analysis)',
    ],
    libraryGroups: [
      {
        role: 'Runtime & frameworks',
        libraries: ['Node.js modules (node:fs, node:crypto)', 'React', 'Next.js', 'Express', 'NestJS'],
      },
      { role: 'Tooling & validation', libraries: ['Vite', 'SWC', 'Zod', 'tRPC'] },
    ],
    architectNote:
      'Types vanish at runtime, so validate data at every trust boundary. The single language across browser and server makes it the natural choice for interfaces.',
  },
  {
    languageId: 'spark',
    nativeDocs: [{ label: 'Apache Spark documentation', href: 'https://spark.apache.org/docs/latest/' }],
    standardApi: [
      'DataFrame API',
      'Spark SQL',
      'Structured Streaming',
      'RDD transformations and actions: map, filter, reduceByKey',
    ],
    libraryGroups: [
      {
        role: 'Connectors & table formats',
        libraries: ['Delta Lake', 'Apache Iceberg', 'Hadoop Common', 'Spark-Kafka connector'],
      },
    ],
    architectNote:
      'Pays a fixed cluster and shuffle cost to scale out. Choose it when data no longer fits one machine, not before.',
  },
  {
    languageId: 'rust',
    nativeDocs: [
      { label: 'The Rust Book', href: 'https://doc.rust-lang.org/book/' },
      { label: 'Rust Reference', href: 'https://doc.rust-lang.org/reference/' },
      { label: 'Standard library', href: 'https://doc.rust-lang.org/std/' },
      { label: 'The Rustonomicon (unsafe Rust)', href: 'https://doc.rust-lang.org/nomicon/' },
    ],
    standardApi: [
      'std::vec::Vec, std::collections::HashMap',
      'std::sync (Arc, Mutex, mpsc)',
      'Option and Result',
      'Traits: Send, Sync, Future, Iterator',
    ],
    libraryGroups: [
      { role: 'Async & networking', libraries: ['Tokio', 'Axum', 'Tonic (gRPC)', 'Reqwest'] },
      { role: 'Data & systems', libraries: ['Serde', 'Polars (Rust)', 'Rayon', 'PyO3'] },
    ],
    architectNote:
      'The borrow checker moves memory and data-race bugs to compile time, with no GC pauses. The cost is a steeper learning curve and slower iteration.',
  },
  {
    languageId: 'cpp',
    nativeDocs: [
      { label: 'cppreference', href: 'https://en.cppreference.com/' },
      { label: 'ISO C++ standard', href: 'https://isocpp.org/std/the-standard' },
    ],
    standardApi: [
      'STL containers: std::vector, std::unordered_map',
      '<algorithm>',
      '<memory> smart pointers',
      '<coroutine> and <ranges> (C++20)',
    ],
    libraryGroups: [
      { role: 'Concurrency & networking', libraries: ['Boost', 'Asio'] },
      { role: 'Utilities & math', libraries: ['fmt', 'Eigen'] },
      { role: 'Testing', libraries: ['GoogleTest'] },
    ],
    architectNote:
      'Maximum control over layout and latency, with memory safety left to the programmer. Keep it for kernels and existing codebases where that control pays for itself.',
  },
  {
    languageId: 'go',
    nativeDocs: [
      { label: 'Standard library (pkg.go.dev)', href: 'https://pkg.go.dev/std' },
      { label: 'Go language specification', href: 'https://go.dev/ref/spec' },
    ],
    standardApi: [
      'net/http',
      'sync: Mutex, WaitGroup',
      'context',
      'encoding/json',
      'database/sql',
      'Channels and goroutines',
    ],
    libraryGroups: [
      { role: 'Web / routing', libraries: ['Gin', 'Fiber', 'Chi'] },
      { role: 'Database / ORM', libraries: ['GORM', 'sqlx', 'pgx'] },
    ],
    architectNote:
      'A small language, a capable standard library, and cheap goroutines make resilient network services easy to run and to staff.',
  },
  {
    languageId: 'swift',
    nativeDocs: [
      { label: 'Swift documentation', href: 'https://www.swift.org/documentation/' },
      { label: 'Swift Evolution proposals', href: 'https://github.com/swiftlang/swift-evolution' },
    ],
    standardApi: [
      'Array, Dictionary, Set',
      'Codable',
      'Swift Concurrency: async/await, actors, tasks',
    ],
    libraryGroups: [
      { role: 'Ecosystem', libraries: ['Vapor', 'Combine', 'SwiftUI', 'SwiftNIO'] },
    ],
    architectNote:
      'First choice on Apple platforms, where ARC and value types fit the runtime. Server-side use is viable but the ecosystem is smaller.',
  },
  {
    languageId: 'kotlin',
    nativeDocs: [
      { label: 'Kotlin documentation', href: 'https://kotlinlang.org/docs/home.html' },
      { label: 'Kotlin standard library API', href: 'https://kotlinlang.org/api/core/kotlin-stdlib/' },
    ],
    standardApi: [
      'Collections: List, Map',
      'kotlinx.coroutines: Dispatchers, suspend, Flow',
      'Scope functions: let, apply, run',
    ],
    libraryGroups: [
      { role: 'Backend & web', libraries: ['Ktor', 'Spring Boot (Kotlin extensions)', 'Exposed (SQL)'] },
    ],
    architectNote:
      'Gives the JVM ecosystem and tooling with null safety and structured concurrency. A strong fit for services in organisations that already run the JVM.',
  },
];

export const ADR_CHOICES: AdrChoice[] = [
  {
    id: 'petabyte-pipelines',
    question: 'Petabyte-scale data pipelines',
    languageIds: ['spark', 'sql'],
    reach: 'Spark for distributed transforms, SQL for the warehouse layer.',
    because: 'Both let an optimizer plan the work, and Spark spreads it across a cluster.',
    avoidWhen: 'The data fits on one machine; a single-node engine avoids shuffle and cluster cost.',
  },
  {
    id: 'api-gateways',
    question: 'Resilient API gateways and services',
    languageIds: ['go', 'kotlin'],
    reach: 'Go for lean network services, Kotlin where the JVM ecosystem is already in place.',
    because: 'Cheap concurrency (goroutines, coroutines) and mature HTTP tooling.',
    avoidWhen: 'A hard latency ceiling rules out GC pauses.',
  },
  {
    id: 'low-latency-kernels',
    question: 'Low-latency compute kernels and safety-critical backends',
    languageIds: ['rust', 'cpp'],
    reach: 'Rust for new code; C++ where a large codebase or toolchain demands it.',
    because: 'No GC, predictable layout, and control of allocation. Rust adds compile-time memory safety.',
    avoidWhen: 'Iteration speed matters more than the last order of magnitude of performance.',
  },
  {
    id: 'orchestration-ui',
    question: 'Rapid orchestration and user interfaces',
    languageIds: ['python', 'typescript'],
    reach: 'Python for glue, data, and ML; TypeScript for browser and Node.js interfaces.',
    because: 'Fastest path from idea to working system, with the largest library ecosystems.',
    avoidWhen: 'The hot path is CPU-bound; delegate it to a native core.',
  },
];
