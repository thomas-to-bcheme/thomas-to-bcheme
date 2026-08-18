import type { SystemDesignQuestion } from './types';

export const DATA_QUESTIONS: SystemDesignQuestion[] = [
  {
    id: 'consistency-spectrum',
    category: 'data',
    axes: ['abstraction'],
    question: 'How stale can a read be, and does it matter whose read it is?',
    clarifyingSubQuestions: [
      'Does the reader need to see their own writes immediately, even if other users’ writes lag (read-your-writes)?',
      'Does the ordering of causally related events need to be preserved for correctness (causal consistency), or is any eventual order fine?',
      'Is this a single-writer/single-reader path, or many concurrent writers where conflicts are actually possible?',
    ],
    approachOptions: [
      {
        label: 'Eventual consistency',
        whenToUse:
          'Analytics counters, follower counts, cache-backed reads — anywhere a few seconds of staleness is invisible to the user.',
        tradeoffs: 'Cheapest and most available option, but offers no ordering or freshness guarantee at all.',
      },
      {
        label: 'Monotonic reads',
        whenToUse: 'A user paging through results — guarantees they never see an older value after a newer one.',
        tradeoffs: 'Needs session/sticky routing to the same replica or a version token passed between requests.',
      },
      {
        label: 'Read-your-writes',
        whenToUse: 'A user edits their profile and immediately reloads the page — they must see their own edit.',
        tradeoffs: 'Typically requires routing that user’s reads to the primary (or a replica confirmed caught-up) right after a write.',
      },
      {
        label: 'Causal consistency',
        whenToUse: 'A comment reply must never render before the comment it replies to.',
        tradeoffs: 'Requires tracking causal metadata (vector clocks or similar) — more bookkeeping than read-your-writes.',
      },
      {
        label: 'Strong / linearizable consistency',
        whenToUse: 'Bank balance checks, distributed locks, leader election — anywhere every reader must agree on the single latest value.',
        tradeoffs: 'Highest coordination cost and latency of the spectrum; usually means routing everything through a single source of truth.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Picking a point on the spectrum, not just the two extremes',
        dependsOn:
          'Most production systems mix levels per data type — strong consistency for the payment record, eventual for the "likes" counter next to it. Naming which parts of the system sit where is more convincing than picking one setting for everything.',
      },
    ],
    ripplesInto: ['cap-vs-pacelc', 'db-selection'],
    sourceNote: 'board',
  },
  {
    id: 'sql-vs-nosql',
    category: 'data',
    axes: ['end-to-end'],
    question:
      'Is this structured, relational data that needs transactional guarantees, or flexible-schema data that prioritizes availability and scale?',
    clarifyingSubQuestions: [
      'Does the data have well-defined relationships (foreign keys, joins) that the application relies on?',
      'Do multi-row/multi-table operations need to succeed or fail atomically (ACID transactions)?',
      'Is the schema expected to change frequently, or per-record, in ways a rigid relational schema would fight against?',
    ],
    approachOptions: [
      {
        label: 'SQL / relational (ACID)',
        whenToUse:
          'Orders, payments, anything with real relationships and a need for multi-table transactions to stay atomic.',
        tradeoffs: 'Strong guarantees and mature tooling, but schema changes are heavier and horizontal write-scaling is harder.',
      },
      {
        label: 'NoSQL / BASE (Basically Available, Soft state, Eventually consistent)',
        whenToUse:
          'High-volume, loosely-structured, or rapidly-evolving data — session state, event logs, product catalogs with variable attributes.',
        tradeoffs: 'Scales out easily and schema is flexible, but you give up cross-record transactional guarantees by default.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This is not strictly binary in practice',
        dependsOn:
          'Modern relational databases (Postgres with JSONB, for example) borrow NoSQL-style flexibility, and many NoSQL stores now offer limited transactions — the underlying question (do I need cross-record atomicity and joins?) matters more than the SQL/NoSQL label itself.',
      },
    ],
    ripplesInto: ['db-selection', 'oltp-vs-olap'],
    sourceNote: 'board',
  },
  {
    id: 'db-selection',
    category: 'data',
    axes: ['end-to-end'],
    question:
      'Walking the decision tree: what’s the access pattern, the write:read ratio, the consistency requirement, and the scale target?',
    clarifyingSubQuestions: [
      'Access pattern first — is this key-value lookups, full-text search, graph traversal, or time-ordered writes?',
      'What’s the write:read ratio — write-heavy (event ingestion) or read-heavy (product pages)?',
      'What consistency level does this data actually need (see the consistency-spectrum question above)?',
      'Are there data-residency or compliance constraints (GDPR, HIPAA, SOC2) that limit which regions/vendors are even eligible?',
    ],
    approachOptions: [
      {
        label: 'Relational (Postgres/MySQL)',
        whenToUse: 'Structured data with relationships and transactional needs — the default unless something rules it out.',
        tradeoffs: 'Vertical scaling is the easy path; horizontal write-scaling needs sharding, which adds real complexity.',
      },
      {
        label: 'Key-value (Redis, DynamoDB)',
        whenToUse: 'Simple lookups by a known key at very high throughput — sessions, caches, feature flags.',
        tradeoffs: 'Extremely fast and simple, but no relational queries or joins.',
      },
      {
        label: 'Document (MongoDB)',
        whenToUse: 'Semi-structured, nested data that maps naturally to JSON and doesn’t need complex joins.',
        tradeoffs: 'Flexible schema speeds up iteration, but data duplication across documents can make updates harder to keep consistent.',
      },
      {
        label: 'Column-family (Cassandra, Bigtable)',
        whenToUse: 'Massive write throughput with known query patterns, e.g. time-series ingestion at scale.',
        tradeoffs: 'Excellent write scalability, but query flexibility is limited to patterns designed for upfront.',
      },
      {
        label: 'Search index (Elasticsearch)',
        whenToUse: 'Full-text search, fuzzy matching, faceted filtering.',
        tradeoffs: 'Best-in-class search UX, but it’s an eventually-consistent secondary index — not a system of record.',
      },
      {
        label: 'Graph (Neo4j)',
        whenToUse: 'Deeply relational, traversal-heavy queries — social graphs, recommendation paths.',
        tradeoffs: 'Graph traversals that would be expensive multi-join SQL queries become cheap, but it’s a less common tool with a smaller hiring pool.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Compliance/data-residency as an early filter, not an afterthought',
        dependsOn:
          'If GDPR/HIPAA/SOC2 apply, they can rule out entire hosting regions or vendors before performance characteristics even enter the conversation — worth asking about explicitly in the requirements step, not discovering during the deep dive.',
      },
      {
        consideration: 'The tree is sequential, not a single lookup table',
        dependsOn:
          'Access pattern narrows the field first; write:read ratio and consistency needs then pick among the remaining candidates — jumping straight to "which database" without walking the earlier steps is the most common shortcut that gets called out in interviews.',
      },
    ],
    ripplesInto: ['sql-vs-nosql', 'cap-vs-pacelc', 'scaling-progression'],
    sourceNote: 'board',
  },
  {
    id: 'structured-vs-unstructured',
    category: 'data',
    axes: ['end-to-end'],
    question:
      'Does this data have a fixed, known schema, or is it fundamentally unstructured?',
    clarifyingSubQuestions: [
      'Can every field be named and typed ahead of time, or does the shape vary record-to-record?',
      'Is this text/binary content meant to be indexed and searched, or stored and retrieved as a blob?',
      'Will downstream consumers need to query on internal fields, or only fetch the whole object?',
    ],
    approachOptions: [
      {
        label: 'Structured — relational or strongly-typed document store',
        whenToUse: 'Rows/columns or JSON with a stable, known shape — user records, orders, config.',
        tradeoffs: 'Enables indexing, joins, and validation at write time, at the cost of schema rigidity.',
      },
      {
        label: 'Unstructured — object storage / data lake',
        whenToUse: 'Logs, images, video, free-text documents — content without a fixed schema.',
        tradeoffs: 'Cheap, infinitely flexible storage, but querying internal structure requires a separate indexing/processing layer on top.',
      },
      {
        label: 'Semi-structured — search index or wide-column store',
        whenToUse: 'Text or logs that still need to be queried/filtered, not just archived.',
        tradeoffs: 'Bridges the gap, but is a secondary/derived store, not typically the system of record.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This is a genuinely separate axis from SQL vs. NoSQL',
        dependsOn:
          'A NoSQL document store can still hold fully structured data (a known JSON shape); the real question here is whether the schema is knowable at all, not which query language sits on top of it.',
      },
    ],
    ripplesInto: ['oltp-vs-olap', 'db-selection'],
    sourceNote: 'synthesized',
  },
  {
    id: 'oltp-vs-olap',
    category: 'data',
    axes: ['end-to-end'],
    question:
      'Is this system serving live transactional reads/writes for a product, or aggregating historical data for reporting and analytics?',
    clarifyingSubQuestions: [
      'Are queries mostly single-row lookups/updates (transactional), or large scans/aggregations across many rows (analytical)?',
      'Does this need to be up-to-the-second, or is nightly/hourly freshness acceptable?',
      'Are the read and write workloads from the same system contending for the same resources today, and is that contention actually a problem?',
    ],
    approachOptions: [
      {
        label: 'OLTP — row-oriented transactional database',
        whenToUse: 'The live product path: checkout, profile updates, inventory decrements.',
        tradeoffs: 'Optimized for fast single-row reads/writes, but large aggregate queries across millions of rows are slow and can degrade the transactional workload.',
      },
      {
        label: 'OLAP — column-oriented warehouse',
        whenToUse: 'Dashboards, BI reporting, large historical aggregations.',
        tradeoffs: 'Excellent at scanning/aggregating huge datasets, but not designed for high-frequency single-row transactional writes.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'The usual fix is separation, not a single database doing both',
        dependsOn:
          'The standard pattern is OLTP as the system of record with a periodic ETL/CDC pipeline feeding an OLAP warehouse — this keeps analytical query load from ever touching the live transactional path.',
      },
    ],
    ripplesInto: ['sql-vs-nosql', 'batch-vs-streaming', 'lake-vs-warehouse-vs-mesh'],
    sourceNote: 'synthesized',
  },
  {
    id: 'scaling-progression',
    category: 'data',
    axes: ['time'],
    question: "What's the next cheapest lever before reaching for the expensive one?",
    clarifyingSubQuestions: [
      'Have the cheap, low-risk levers (indexing, query optimization) actually been exhausted, or is this jumping straight to sharding?',
      'Is the bottleneck reads, writes, or both — different levers help different sides.',
      'What would it cost (in engineering time and operational complexity) to reach for the next lever, versus the traffic growth it buys?',
    ],
    approachOptions: [
      {
        label: 'Index optimization',
        whenToUse: 'First lever, almost always — a missing or wrong index is the most common source of slow queries.',
        tradeoffs: 'Cheap and reversible, but only fixes query-shape problems, not raw volume.',
      },
      {
        label: 'Query optimization',
        whenToUse: 'After indexing — rewriting N+1 queries, reducing over-fetching.',
        tradeoffs: 'Still cheap, still reversible, still limited to inefficiency rather than true capacity limits.',
      },
      {
        label: 'Connection pooling',
        whenToUse: 'When connection overhead itself is the bottleneck under concurrent load.',
        tradeoffs: 'Low effort, meaningful win under high concurrency, doesn’t help raw data volume.',
      },
      {
        label: 'Caching',
        whenToUse: 'Read-heavy workloads with repeated queries for the same data.',
        tradeoffs: 'Big win for read latency and DB load, but introduces cache-invalidation complexity.',
      },
      {
        label: 'Read replicas',
        whenToUse: 'Read traffic outgrowing a single primary’s capacity.',
        tradeoffs: 'Scales reads horizontally, but replicas lag behind the primary — reintroduces the consistency-spectrum question.',
      },
      {
        label: 'Vertical scaling',
        whenToUse: 'A quick, temporary lever to buy time before a structural fix.',
        tradeoffs: 'Fast and simple, but has a hard ceiling and doesn’t address the underlying access pattern.',
      },
      {
        label: 'Sharding',
        whenToUse: 'Write volume has outgrown what a single primary can handle, after the cheaper levers are exhausted.',
        tradeoffs: 'Real horizontal write scaling, at the cost of cross-shard queries and transactions becoming much harder.',
      },
      {
        label: 'DB type change',
        whenToUse: 'The access pattern has fundamentally outgrown the current database category, not just its current scale.',
        tradeoffs: 'The most expensive lever — a migration — but sometimes the honest answer once every cheaper lever is spent.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Naming this ladder explicitly is itself a signal',
        dependsOn:
          'Jumping straight to "we’d shard the database" without naming the cheaper steps first reads as reaching for a big-sounding answer rather than reasoning from first principles — walking the ladder out loud is the stronger move.',
      },
    ],
    ripplesInto: ['db-selection', 'monolith-vs-microservices'],
    sourceNote: 'board',
  },
  {
    id: 'cache-eviction-policies',
    category: 'data',
    axes: ['abstraction', 'time'],
    question: 'When the cache is full and a new entry needs to be inserted, which existing entry gets evicted?',
    clarifyingSubQuestions: [
      'Is access to cached entries roughly uniform, or is it skewed/long-tail with a small hot set?',
      'Does recency (accessed most recently) or frequency (accessed most often) better predict what gets accessed next?',
      'Does eviction need to be cheap — O(1) — to keep up at high throughput, or is there headroom for a heavier bookkeeping structure?',
    ],
    approachOptions: [
      {
        label: 'FIFO',
        whenToUse: 'The simplest possible policy — a plain queue, evicting the oldest entry regardless of how hot it is.',
        tradeoffs: 'Trivial to implement, but ignores access pattern entirely — a frequently-hit entry gets evicted just as readily as a cold one.',
      },
      {
        label: 'LRU (Least Recently Used)',
        whenToUse: 'The default in practice — O(1) eviction via a hash map plus a doubly-linked list.',
        tradeoffs: 'Cheap and usually a good approximation of "hot," but a burst of one-off scans can evict an otherwise-hot working set — cache pollution.',
      },
      {
        label: 'LFU (Least Frequently Used)',
        whenToUse: 'Skewed/long-tail access patterns where LRU\'s cache pollution problem is a real, recurring issue.',
        tradeoffs: 'Resists that pollution problem by tracking access frequency, but needs a decay strategy — otherwise a once-popular-now-cold key pins itself in the cache forever.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'Eviction policy and cache write pattern are orthogonal choices',
        dependsOn:
          'Which entry gets evicted (FIFO/LRU/LFU) is independent from how writes propagate to the cache (cache-aside/write-through/write-behind/write-around — see the Reference Grid\'s Cache write patterns entry). Most real caches, Redis or a CDN edge node, let you pick one from each axis independently.',
      },
    ],
    ripplesInto: ['consistent-hashing-routing'],
    sourceNote: 'synthesized',
  },
  {
    id: 'consistent-hashing-routing',
    category: 'data',
    axes: ['abstraction', 'end-to-end'],
    question:
      'When traffic or data needs to be assigned to one of many nodes — and nodes are added or removed over time — how do you avoid remapping almost everything on every change?',
    clarifyingSubQuestions: [
      'Is the node set stable, or elastic — nodes routinely added/removed for scaling or failure recovery?',
      'Does a rebalance need to move the minimum possible amount of data/traffic, or is a full remap acceptable?',
      'Is node capacity uniform across the fleet, or are some nodes meaningfully bigger/smaller than others?',
    ],
    approachOptions: [
      {
        label: 'Naive modulo hashing',
        whenToUse: 'A fixed, never-changing node count — the trivial case.',
        tradeoffs: '`hash(key) % N` is trivial to implement, but changing N — adding or removing even one node — remaps nearly every key.',
      },
      {
        label: 'Consistent hashing (hash ring)',
        whenToUse: 'Node counts that change over time and where minimizing remap churn on each change actually matters.',
        tradeoffs:
          'Nodes and keys both map onto a ring; adding or removing one node only remaps the keys between it and its ring neighbor — roughly 1/N of all keys, not nearly all of them.',
      },
      {
        label: 'Consistent hashing + virtual nodes',
        whenToUse: 'The same elastic-node-set problem, but with uneven physical node capacity.',
        tradeoffs:
          'Each physical node gets many points on the ring, smoothing load distribution when capacity is uneven and reducing the odds of one node inheriting a disproportionate share on rebalance.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'The same mechanism solves two different-looking problems',
        dependsOn:
          'CDN edge-node request routing (maximizing cache-hit locality as edge nodes are added/removed) and cache/database shard ownership (minimizing data movement on scale-in/out) are the same "assign X to one of many nodes cheaply, with minimal churn on change" problem, solved twice.',
      },
      {
        consideration: 'This composes with — doesn\'t replace — the CAP/PACELC trade-off',
        dependsOn:
          'Consistent hashing decides where a key lives (see the CAP vs PACELC question for what consistency guarantee reads/writes to it get) — it answers routing, not consistency.',
      },
    ],
    ripplesInto: ['cap-vs-pacelc', 'partitioning-vs-sharding', 'networking-dns-cdn', 'cache-eviction-policies'],
    sourceNote: 'synthesized',
  },
  {
    id: 'lake-vs-warehouse-vs-mesh',
    category: 'data',
    axes: ['end-to-end', 'abstraction'],
    question:
      'Once data lands somewhere durable, what architecture organizes it for consumption — and is the constraint technical or organizational?',
    clarifyingSubQuestions: [
      'Is the data\'s schema known upfront, or does it need to be discovered/imposed later, at read time?',
      'Is the actual bottleneck query performance and governance (technical), or which team owns and can change the data (organizational)?',
      'Is the source data static/reference — a one-time load — or an unbounded, continuously-arriving stream?',
    ],
    approachOptions: [
      {
        label: 'Data lake',
        whenToUse: 'Raw or unstructured data landing cheaply via object storage, with schema imposed later at read time.',
        tradeoffs: 'Cheap and flexible, schema-on-read — but ungoverned, it degrades into a "data swamp" nobody trusts.',
      },
      {
        label: 'Data warehouse',
        whenToUse: 'Fast, structured BI/analytics queries against a fixed, enforced schema — schema-on-write.',
        tradeoffs: 'Fast, well-governed structured queries, but every new source needs upfront modeling before it\'s usable.',
      },
      {
        label: 'Data lakehouse / Delta Lake',
        whenToUse: 'Wanting warehouse-style guarantees without the separate lake-to-warehouse ETL hop.',
        tradeoffs:
          'Adds warehouse-style ACID transactions and schema enforcement directly on top of lake object storage, collapsing that ETL hop — but the tooling is younger and still maturing.',
      },
      {
        label: 'Data mesh',
        whenToUse: 'The bottleneck is organizational, not technical — a single central team owning one warehouse is the actual constraint.',
        tradeoffs:
          'Domain teams own and publish their own data as products instead of a central team owning one warehouse — but this only works with real platform/tooling investment behind it, or it just relabels the same bottleneck under a new name.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This layers on top of, not replaces, the row/column and schema-timing questions',
        dependsOn:
          'This question sits above `oltp-vs-olap` (row vs. column storage engine choice) and `structured-vs-unstructured` (whether the schema is knowable at write time) — it\'s about the organizing architecture around wherever that data already lives. See the Glossary\'s Data Warehouse, Data Lake, Data Lakehouse, and Data Mesh definitions (`src/constants/glossary/dataEngineering.ts`) for the first-principles terminology this question builds on.',
      },
      {
        consideration: 'Static/reference data vs. dynamic/streaming data changes the scope of the decision',
        dependsOn:
          'A one-time load is a one-time architectural decision; continuously-arriving data needs a real ongoing ingestion pipeline with schema-evolution and backfill handling — see the `mapreduce-vs-stream-processing` question for that fork.',
      },
    ],
    ripplesInto: ['oltp-vs-olap', 'structured-vs-unstructured', 'mapreduce-vs-stream-processing'],
    sourceNote: 'synthesized',
  },
  {
    id: 'mapreduce-vs-stream-processing',
    category: 'data',
    axes: ['end-to-end'],
    question:
      'Is this a general-purpose big-data processing pattern — batch jobs across a cluster, or a continuous stream pipeline — independent of whether the output feeds a dashboard, a warehouse, or an ML feature store?',
    clarifyingSubQuestions: [
      'How fresh does the output need to be — minutes/hours-old is fine, or does it need to be near-real-time?',
      'Does the computation need the full dataset at once, or can it process one event at a time as it arrives?',
      'Can the team absorb the operational complexity of a stream processor — state management, exactly-once semantics, backpressure?',
    ],
    approachOptions: [
      {
        label: 'MapReduce-style batch (Hadoop/Spark)',
        whenToUse: 'Mature, well-understood tooling and a simple map -> shuffle -> reduce mental model.',
        tradeoffs:
          'Output freshness is bounded by the run schedule, and a full-dataset job pays a roughly fixed cost every run — even for a small incremental delta.',
      },
      {
        label: 'Stream processing (Kafka Streams, Flink)',
        whenToUse: 'Near-real-time output is a real requirement, not a nice-to-have.',
        tradeoffs: 'Real operational complexity: state management, exactly-once semantics, backpressure, handling out-of-order events.',
      },
      {
        label: 'Micro-batch (Spark Structured Streaming)',
        whenToUse: 'Wanting most of streaming\'s simplicity of reasoning without committing to a full stream processor.',
        tradeoffs: 'Splits the difference, but is still fundamentally bounded by its micro-batch interval.',
      },
    ],
    implementationNotes: [
      {
        consideration: 'This is the general pattern; ML feature computation is one specific instance of it',
        dependsOn:
          'MapReduce popularized the "split a big job across a cluster of commodity machines" pattern that both traditional OLAP-warehouse ETL jobs and ML feature-computation pipelines are built on — the existing `batch-vs-streaming` question (ML-feature-computation-scoped) is the ML-specific instance of this same general fork, not a separate concept.',
      },
    ],
    ripplesInto: ['oltp-vs-olap', 'batch-vs-streaming', 'lake-vs-warehouse-vs-mesh'],
    sourceNote: 'synthesized',
  },
];
