/**
 * Application-level thinking: storage engines, index lookups, and join
 * algorithms — the mechanics underneath every SQL engine and Spark plan.
 */

import type { FirstPrinciplesTopic } from './types';

export const APPLICATION_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'rum-conjecture',
    navLabel: 'RUM conjecture',
    level: 'application',
    title: 'The RUM conjecture: read, update, memory — pick two',
    summary:
      'No access method minimizes read, write, and space overhead at once; every storage engine is a chosen point on that triangle.',
    what: 'Pick a storage engine by the workload\'s read/write mix, not by the product\'s popularity.',
    why:
      'Making reads cheap means maintaining structure at write time (sorted pages, indexes), which costs writes. Making writes cheap means deferring that structure (append now, organize later), which costs reads or space until compaction catches up. Making space cheap means giving up redundant structures that speed up one or the other. The RUM conjecture (Athanassoulis et al., 2016) names that triangle; storage engine families are its corners.',
    how: [
      'Measure the workload first: write rate, read pattern (point vs range vs full scan), and how much data is hot.',
      'Express engine costs as amplification: read amplification (I/Os per logical read), write amplification (bytes written per logical byte), space amplification (bytes stored per live byte).',
      'Choose the engine whose cheap corner matches the dominant operation, then tune the knobs that move along the triangle (fill factor, compaction strategy, bloom filter size).',
    ],
    sourceBookIds: ['database-internals', 'designing-data-intensive-applications'],
  },
  {
    id: 'storage-engines',
    navLabel: 'Storage engines',
    level: 'application',
    title: 'Storage engines: B-tree vs LSM-tree, and the rest',
    summary:
      'B-trees update in place and favor reads; LSM-trees append and compact and favor writes. Other engines fill specific corners.',
    what: 'Know how each engine family turns a logical read or write into physical I/O.',
    why:
      'A B+tree keeps keys sorted in fixed-size pages (often 4–16 KB) with a high fan-out, so a lookup touches about log_fanout(N) pages — three or four for billions of rows — and range scans walk linked leaves. The cost is on writes: each update rewrites a whole page in place (plus a write-ahead-log record), and random inserts split pages. An LSM-tree buffers writes in a sorted in-memory memtable (backed by a WAL), flushes it as an immutable sorted SSTable, and merges SSTables in the background. Writes become sequential and cheap; reads may check several levels, so engines add bloom filters and fence pointers to skip most of them, and compaction spends I/O later to reclaim space.',
    how: [
      'Read-heavy OLTP with range queries and strict latency: a B+tree engine (PostgreSQL, InnoDB).',
      'Write-heavy ingestion, time series, or key-value at scale: an LSM engine (RocksDB, Cassandra, ScyllaDB), with compaction chosen per workload — leveled for read-heavy, size-tiered for write-heavy.',
      'Analytics: columnar files with zone maps — a different corner entirely, optimized for scans rather than lookups.',
    ],
    comparison: {
      caption: 'Storage engine families and their trade-offs',
      rowHeader: 'Engine',
      columns: ['Write path', 'Read path', 'Amplification profile', 'Choose when', 'Examples'],
      rows: [
        {
          id: 'b-tree',
          label: 'B+tree',
          cells: [
            'Find leaf page, modify in place, log to WAL; page splits on growth',
            'O(log N) page reads; efficient range scans across linked leaves',
            'Low read amp; higher write amp (whole-page writes); some space lost to partially full pages',
            'Read-heavy, point and range queries, transactional updates',
            'PostgreSQL, MySQL InnoDB, SQLite',
          ],
        },
        {
          id: 'lsm-tree',
          label: 'LSM-tree',
          cells: [
            'Append to WAL and memtable; flush sorted SSTables; compact in background',
            'Check memtable then levels newest-first; bloom filters skip most SSTables',
            'Low write amp at ingest but compaction rewrites data; higher read and space amp until compaction',
            'Write-heavy ingestion, time series, large key-value stores',
            'RocksDB, LevelDB, Cassandra, ScyllaDB, HBase',
          ],
        },
        {
          id: 'hash-index',
          label: 'Log-structured hash index',
          cells: [
            'Append to log; update in-memory hash map of key → offset',
            'One hash lookup plus one seek',
            'Minimal read and write amp; all keys must fit in memory; no range queries',
            'High-rate point lookups on a bounded key set',
            'Bitcask (Riak)',
          ],
        },
        {
          id: 'columnar-zone-maps',
          label: 'Columnar + zone maps',
          cells: [
            'Batch-written immutable files or row groups; updates via rewrite or delete files',
            'Scan only needed columns; skip chunks whose min/max excludes the predicate',
            'Excellent compression; very high cost per single-row update',
            'Analytical scans and aggregates',
            'Parquet, ORC, Delta Lake, Iceberg, ClickHouse',
          ],
        },
        {
          id: 'inverted-index',
          label: 'Inverted index',
          cells: [
            'Tokenize and append to posting lists in immutable segments; merge segments',
            'Look up term → posting list; intersect lists',
            'Large index relative to data; fast term and full-text lookups',
            'Search, log exploration, full-text filtering',
            'Lucene, Elasticsearch, OpenSearch',
          ],
        },
        {
          id: 'b-epsilon-tree',
          label: 'Bε-tree',
          cells: [
            'Buffer writes in internal nodes; flush down in batches',
            'Near B-tree point reads; must check buffers on the path',
            'Write cost between B-tree and LSM; read cost close to B-tree',
            'Mixed workloads that need both cheap writes and fast reads',
            'TokuDB / PerconaFT, BetrFS',
          ],
        },
        {
          id: 'skip-list',
          label: 'Skip list (in-memory)',
          cells: [
            'Probabilistic multi-level linked list; lock-free inserts possible',
            'Expected O(log N) search and ordered iteration',
            'Pointer-heavy, so cache-unfriendly; memory only',
            'Sorted in-memory buffers',
            'LSM memtables (RocksDB, LevelDB), Redis sorted sets',
          ],
        },
      ],
    },
    sourceBookIds: ['database-internals', 'designing-data-intensive-applications', 'seven-databases'],
  },
  {
    id: 'index-lookups',
    navLabel: 'Index lookups',
    level: 'application',
    title: 'Index lookups: seek vs scan',
    summary:
      'An index helps only when it avoids enough I/O to beat a sequential scan; selectivity decides.',
    what: 'Make the optimizer\'s access-path choice predictable.',
    why:
      'An index seek is a handful of random page reads per matching row; a full scan is sequential I/O over every page. Random reads cost far more per byte than sequential ones, so past a selectivity threshold (often a few percent of rows) a scan wins. Clustered indexes store rows in key order so range reads stay sequential; secondary indexes add a lookup back to the row unless they cover every column the query needs.',
    how: [
      'Read the plan (EXPLAIN ANALYZE) before adding an index; confirm estimated vs actual row counts, since bad statistics cause most bad plans.',
      'Order composite index columns by equality predicates first, then range predicates; add included columns to make hot queries covering.',
      'In InnoDB the primary key is the clustered index, so a random UUID primary key scatters inserts across pages; prefer monotonic keys.',
    ],
    comparison: {
      caption: 'Index types and what a lookup costs',
      rowHeader: 'Index',
      columns: ['Structure', 'Lookup cost', 'Use when'],
      rows: [
        { id: 'clustered', label: 'Clustered (primary)', cells: ['Rows stored in key order inside the B+tree leaves', 'One traversal; ranges read sequentially', 'Primary access path, range queries on the key'] },
        { id: 'secondary', label: 'Secondary', cells: ['Separate B+tree of key → row pointer or primary key', 'Traversal plus one lookup per matching row', 'Selective predicates on non-key columns'] },
        { id: 'covering', label: 'Covering', cells: ['Secondary index that includes every column the query reads', 'Traversal only; no row lookup (index-only scan)', 'Hot, read-heavy queries with a known column set'] },
        { id: 'full-scan', label: 'No index (full scan)', cells: ['Read every page sequentially', 'Linear in table size but sequential', 'Low-selectivity predicates, small tables, analytics'] },
      ],
    },
    sourceBookIds: ['learning-sql', 'postgresql-query-optimization', 'high-performance-mysql'],
  },
  {
    id: 'join-algorithms',
    navLabel: 'Join algorithms',
    level: 'application',
    title: 'Join algorithms, from one node to a cluster',
    summary:
      'Nested-loop, hash, and sort-merge joins trade memory for I/O; Spark adds broadcast vs shuffle on top of the same three.',
    what: 'Predict which join an engine will pick, and why it might pick wrong.',
    why:
      'A nested-loop join is cheap when the outer side is small and the inner side has an index. A hash join builds a hash table on the smaller side and streams the larger one past it — linear time, but the build side must fit in memory or it spills. A sort-merge join sorts both sides on the key and merges them — it costs a sort but needs little memory and handles any size. Distribution adds one more choice: either copy the small side to every node (broadcast), or repartition both sides by key so matching rows meet (shuffle). The shuffle is a full network exchange and is usually the most expensive step in a Spark job.',
    how: [
      'Keep statistics fresh so the optimizer knows which side is small.',
      'In Spark, small dimension tables should be broadcast (spark.sql.autoBroadcastJoinThreshold or a broadcast hint); large-to-large joins fall back to shuffle sort-merge.',
      'Turn on adaptive query execution (AQE, the default since Spark 3.2). It re-plans at runtime from real shuffle sizes: it switches to broadcast, coalesces small partitions, and splits skewed ones.',
    ],
    comparison: {
      caption: 'Join algorithms and their distributed forms',
      rowHeader: 'Join',
      columns: ['Cost shape', 'Memory need', 'Best when', 'Spark form'],
      rows: [
        { id: 'nested-loop', label: 'Nested loop', cells: ['Outer rows × inner lookup', 'Low', 'Tiny outer side with an indexed inner side', 'Broadcast nested loop (non-equi joins)'] },
        { id: 'hash', label: 'Hash join', cells: ['Linear: build + probe', 'Build side in memory', 'One side fits in memory', 'Broadcast hash join; shuffle hash join'] },
        { id: 'sort-merge', label: 'Sort-merge join', cells: ['Sort both sides, then linear merge', 'Low (external sort)', 'Both sides large, or already sorted', 'Shuffle sort-merge join (default for large-large)'] },
      ],
    },
    sourceBookIds: ['postgresql-query-optimization', 'spark-definitive-guide', 'high-performance-spark'],
  },
  {
    id: 'spark-execution',
    navLabel: 'Spark execution',
    level: 'application',
    title: 'Spark execution: the same principles, distributed',
    summary:
      'Spark SQL is a relational optimizer over partitions; most tuning means reading less data and shuffling less of it.',
    what: 'Turn a slow Spark job into a plan you can explain stage by stage.',
    why:
      'Catalyst rewrites a logical plan (pushing predicates down, pruning columns), picks a physical plan (join strategies), and Tungsten compiles stages into generated code over off-heap binary rows. A job splits into stages at every shuffle boundary, and each stage runs one task per partition. Elapsed time is therefore usually set by bytes read, bytes shuffled, and the slowest (most skewed) task — not by CPU work inside a task.',
    how: [
      'Read less: partition and cluster data on common filter columns so partition pruning and predicate pushdown skip files and row groups.',
      'Shuffle less: broadcast small sides, aggregate before joining, and avoid wide transformations you do not need.',
      'Fix skew: AQE skew-join splitting, or salting hot keys by hand; check the stage\'s task-time distribution in the Spark UI.',
      'Right-size partitions (roughly 100–200 MB each) so tasks neither spill nor drown the scheduler in overhead.',
    ],
    sourceBookIds: ['learning-spark', 'spark-definitive-guide', 'high-performance-spark'],
  },
];
