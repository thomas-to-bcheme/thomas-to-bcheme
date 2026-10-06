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
    visual: {
      id: 'fig-rum-conjecture',
      kind: 'triangle',
      label:
        'A triangle whose corners are cheap reads, cheap updates, and cheap memory or space; a corner means low overhead on that axis. A B+tree sits nearest cheap reads. An LSM-tree sits nearest cheap updates. A log-structured hash index sits between cheap reads and cheap updates, away from cheap memory because every key lives in RAM. A columnar store with zone maps sits nearest cheap space, with cheap scans and costly single-row updates.',
      caption:
        'Marker positions are qualitative, drawn from the amplification column of the storage-engine table, not measured. Moving toward one corner moves away from the others.',
      bookIds: ['database-internals', 'designing-data-intensive-applications'],
      corners: [
        { id: 'read', label: 'Read overhead', detail: 'Corner = cheap reads: few I/Os per lookup or scan' },
        { id: 'update', label: 'Update overhead', detail: 'Corner = cheap writes: little extra data written per logical write' },
        { id: 'memory', label: 'Memory overhead', detail: 'Corner = cheap space: few extra bytes stored per live byte, including indexes' },
      ],
      markers: [
        { id: 'b-tree', label: 'B+tree', weights: [0.55, 0.15, 0.3] },
        { id: 'lsm-tree', label: 'LSM-tree', weights: [0.2, 0.6, 0.2] },
        { id: 'hash-index', label: 'Log-structured hash index', weights: [0.45, 0.45, 0.1] },
        { id: 'columnar-zone-maps', label: 'Columnar + zone maps', weights: [0.3, 0.05, 0.65] },
      ],
    },
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
    visual: {
      id: 'fig-storage-engines',
      kind: 'flow',
      label:
        'Three lanes compared. B+tree write: find the leaf page, log to the write-ahead log, modify the page in place, split the page if it is full. LSM-tree write: append to the write-ahead log, insert into the in-memory memtable, flush it as an immutable sorted SSTable, merge SSTables in background compaction. LSM-tree read: check the memtable, then SSTables newest-first, skipping most with bloom filters and fence pointers.',
      caption: 'The B+tree pays at write time to keep data organized for reads; the LSM-tree defers that work to flush and compaction.',
      bookIds: ['database-internals', 'designing-data-intensive-applications'],
      lanes: [
        {
          id: 'b-tree-write',
          title: 'B+tree write path — update in place',
          steps: [
            { id: 'find-leaf', label: 'Find leaf page', detail: 'Descend about log_fanout(N) pages', tone: 'sky' },
            { id: 'wal', label: 'Log to WAL', detail: 'Record the change for crash recovery', tone: 'zinc' },
            { id: 'modify', label: 'Modify page in place', detail: 'Rewrite the whole fixed-size page', tone: 'violet' },
            { id: 'split', label: 'Split if full', detail: 'Random inserts split pages, leaving some half full', tone: 'rose' },
          ],
        },
        {
          id: 'lsm-write',
          title: 'LSM-tree write path — append and compact',
          steps: [
            { id: 'wal', label: 'Append to WAL', detail: 'Sequential log for crash recovery', tone: 'zinc' },
            { id: 'memtable', label: 'Insert into memtable', detail: 'Sorted in-memory buffer', tone: 'sky' },
            { id: 'flush', label: 'Flush SSTable', detail: 'Immutable sorted file, written sequentially', tone: 'violet' },
            { id: 'compact', label: 'Compact in background', detail: 'Merge SSTables; reclaim space, spend I/O later', tone: 'amber' },
          ],
        },
        {
          id: 'lsm-read',
          title: 'LSM-tree read path — skip what you can',
          steps: [
            { id: 'memtable', label: 'Check memtable', detail: 'Newest data first', tone: 'sky' },
            { id: 'bloom', label: 'Bloom filter', detail: 'Skip SSTables that cannot hold the key', tone: 'zinc' },
            { id: 'fence', label: 'Fence pointers', detail: 'Jump to the one block that may hold it', tone: 'violet' },
            { id: 'levels', label: 'Read newest-first', detail: 'May still touch several levels', tone: 'rose' },
          ],
        },
      ],
    },
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
    visual: {
      id: 'fig-index-lookups',
      kind: 'strips',
      label:
        'Three strips of the same 12 table pages. A full scan reads all 12 pages sequentially. A selective index seek reads about 3 pages: a few index pages plus one table page, as random reads. A low-selectivity index lookup touches many table pages at random, so it can cost more than the scan.',
      caption: 'Page counts are illustrative. A seek wins when it skips most pages; as selectivity drops, random reads add up and the sequential scan wins.',
      bookIds: ['postgresql-query-optimization', 'high-performance-mysql'],
      legend: 'Highlighted cells are pages read to answer the query.',
      lanes: [
        {
          id: 'full-scan',
          title: 'Full scan',
          note: 'Every page, sequential I/O',
          cells: Array.from({ length: 12 }, (_, pageIndex) => ({
            id: `scan-page-${pageIndex + 1}`,
            label: `P${pageIndex + 1}`,
            isHighlighted: true,
          })),
        },
        {
          id: 'selective-seek',
          title: 'Index seek, selective predicate',
          note: 'Root, leaf, then one table page: random reads, far fewer pages',
          cells: [
            { id: 'seek-root', label: 'Root', isHighlighted: true },
            { id: 'seek-leaf', label: 'Leaf', isHighlighted: true },
            { id: 'seek-p1', label: 'P1' },
            { id: 'seek-p2', label: 'P2' },
            { id: 'seek-p3', label: 'P3' },
            { id: 'seek-p4', label: 'P4' },
            { id: 'seek-p5', label: 'P5', isHighlighted: true },
            { id: 'seek-p6', label: 'P6' },
            { id: 'seek-p7', label: 'P7' },
            { id: 'seek-p8', label: 'P8' },
            { id: 'seek-p9', label: 'P9' },
            { id: 'seek-p10', label: 'P10' },
            { id: 'seek-p11', label: 'P11' },
            { id: 'seek-p12', label: 'P12' },
          ],
        },
        {
          id: 'unselective-seek',
          title: 'Index seek, low selectivity',
          note: 'Matching rows spread over most pages: many random reads, scan wins',
          cells: [
            { id: 'wide-root', label: 'Root', isHighlighted: true },
            { id: 'wide-leaf', label: 'Leaf', isHighlighted: true },
            { id: 'wide-p1', label: 'P1', isHighlighted: true },
            { id: 'wide-p2', label: 'P2', isHighlighted: true },
            { id: 'wide-p3', label: 'P3' },
            { id: 'wide-p4', label: 'P4', isHighlighted: true },
            { id: 'wide-p5', label: 'P5', isHighlighted: true },
            { id: 'wide-p6', label: 'P6', isHighlighted: true },
            { id: 'wide-p7', label: 'P7' },
            { id: 'wide-p8', label: 'P8', isHighlighted: true },
            { id: 'wide-p9', label: 'P9', isHighlighted: true },
            { id: 'wide-p10', label: 'P10', isHighlighted: true },
            { id: 'wide-p11', label: 'P11' },
            { id: 'wide-p12', label: 'P12', isHighlighted: true },
          ],
        },
      ],
    },
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
    visual: {
      id: 'fig-join-algorithms',
      kind: 'flow',
      label:
        'Six lanes compared. Nested loop without an index: for each outer row, scan the inner side. Nested loop with an index: for each outer row, seek the inner index. Hash join: build a hash table on the smaller side, then probe it with the larger side; spills if the build side exceeds memory. Sort-merge join: sort both sides on the key, then merge in one linear pass; low memory via external sort. Broadcast join: copy the small side to every node and join locally with no shuffle. Shuffle join: repartition both sides by key across the network, then join each partition locally.',
      caption: 'Joins trade memory against passes over the data: hash needs memory, sort-merge pays for a sort, and distribution adds broadcast or shuffle.',
      bookIds: ['postgresql-query-optimization', 'spark-definitive-guide', 'high-performance-spark'],
      lanes: [
        {
          id: 'nested-loop-scan',
          title: 'Nested loop, no index — outer rows × inner scan',
          steps: [
            { id: 'outer', label: 'Take outer row', detail: 'Ideally a tiny side', tone: 'sky' },
            { id: 'inner-scan', label: 'Scan inner side', detail: 'Full pass per outer row', tone: 'rose' },
            { id: 'emit', label: 'Emit matches', detail: 'Low memory, quadratic work', tone: 'zinc' },
          ],
        },
        {
          id: 'nested-loop-index',
          title: 'Nested loop, indexed inner — outer rows × seek',
          steps: [
            { id: 'outer', label: 'Take outer row', detail: 'Small outer side', tone: 'sky' },
            { id: 'inner-seek', label: 'Seek inner index', detail: 'One lookup per outer row', tone: 'violet' },
            { id: 'emit', label: 'Emit matches', detail: 'Low memory', tone: 'zinc' },
          ],
        },
        {
          id: 'hash',
          title: 'Hash join — build, then probe',
          steps: [
            { id: 'build', label: 'Build hash table', detail: 'On the smaller side; must fit in memory or spill', tone: 'amber' },
            { id: 'probe', label: 'Probe', detail: 'Stream the larger side past the table', tone: 'violet' },
            { id: 'emit', label: 'Emit matches', detail: 'Linear: build + probe', tone: 'zinc' },
          ],
        },
        {
          id: 'sort-merge',
          title: 'Sort-merge join — sort both, merge once',
          steps: [
            { id: 'sort-left', label: 'Sort side A', detail: 'External sort if too big for memory', tone: 'amber' },
            { id: 'sort-right', label: 'Sort side B', detail: 'Skipped if already sorted on the key', tone: 'amber' },
            { id: 'merge', label: 'Merge', detail: 'One linear pass over both', tone: 'violet' },
          ],
        },
        {
          id: 'broadcast',
          title: 'Distributed: broadcast — copy the small side',
          steps: [
            { id: 'copy', label: 'Broadcast small side', detail: 'Copy to every node', tone: 'sky' },
            { id: 'local', label: 'Join locally', detail: 'Large side stays in place, no shuffle', tone: 'violet' },
          ],
        },
        {
          id: 'shuffle',
          title: 'Distributed: shuffle — meet by key',
          steps: [
            { id: 'repartition', label: 'Repartition both sides', detail: 'Hash by join key over the network', tone: 'rose' },
            { id: 'local', label: 'Join each partition', detail: 'Sort-merge by default for large-large', tone: 'violet' },
          ],
        },
      ],
    },
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
    visual: {
      id: 'fig-spark-execution',
      kind: 'flow',
      label:
        'Two lanes. Planning: the driver builds a logical plan, the Catalyst optimizer rewrites it with predicate pushdown and column pruning, and a physical plan picks join strategies. Execution: the job splits into stages at shuffle boundaries, each stage runs one task per partition on executors, and adaptive query execution can re-plan between stages from real shuffle sizes.',
      caption: 'Elapsed time is usually set by bytes read, bytes shuffled, and the slowest task, so tuning targets those rather than CPU inside a task.',
      bookIds: ['learning-spark', 'spark-definitive-guide', 'high-performance-spark'],
      lanes: [
        {
          id: 'planning',
          title: 'Planning — on the driver',
          steps: [
            { id: 'logical', label: 'Logical plan', detail: 'What to compute, built from the query', tone: 'sky' },
            { id: 'optimize', label: 'Optimize', detail: 'Push down predicates, prune columns', tone: 'violet' },
            { id: 'physical', label: 'Physical plan', detail: 'Pick join strategies; compile stages to code', tone: 'amber' },
          ],
        },
        {
          id: 'execution',
          title: 'Execution — on the cluster',
          steps: [
            { id: 'stages', label: 'Split into stages', detail: 'A new stage at every shuffle boundary', tone: 'rose' },
            { id: 'tasks', label: 'One task per partition', detail: 'Run on executors; the slowest task sets stage time', tone: 'violet' },
            { id: 'aqe', label: 'Adaptive re-plan', detail: 'AQE uses real shuffle sizes: broadcast, coalesce, split skew', tone: 'teal' },
          ],
        },
      ],
    },
    sourceBookIds: ['learning-spark', 'spark-definitive-guide', 'high-performance-spark'],
  },
];
