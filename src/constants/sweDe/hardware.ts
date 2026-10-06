/**
 * Hardware-level thinking: why data engineering is a CPU- and memory-side
 * discipline, and how layout and runtime choices follow from that.
 * Latency figures are orders of magnitude, not benchmarks.
 */

import type { FirstPrinciplesTopic } from './types';

export const HARDWARE_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'cpu-vs-accelerators',
    navLabel: 'CPU vs GPU/TPU/NPU',
    level: 'hardware',
    title: 'Why data engineering runs on CPUs, not GPUs, TPUs, or NPUs',
    summary:
      'Data engineering does little arithmetic per byte and branches constantly; accelerators win only on dense, regular math.',
    what:
      'Choose the processor that matches the shape of the work: parsing, decompressing, hashing, filtering, sorting, and joining records — much of it on variable-length strings.',
    why:
      'The roofline model bounds attainable throughput at min(peak compute, memory bandwidth × arithmetic intensity). A filter or hash join performs well under one operation per byte moved, so it hits the bandwidth roof long before the compute roof — extra FLOPs are idle silicon. Data work is also branchy (null checks, predicates, schema variants) and pointer-chasing (hash tables, B-tree pages), which suits a CPU\'s branch predictor, out-of-order execution, and deep caches. A GPU runs 32-thread warps in lockstep, so divergent branches serialize and scattered loads defeat memory coalescing. TPUs are systolic arrays built for matrix multiplication, and NPUs run low-precision inference at low power. Neither has a useful mapping for a string join.',
    how: [
      'Default to CPU clusters for ingestion, transformation, and serving; scale out on cores, memory bandwidth, and I/O, not FLOPs.',
      'Remember the transfer tax: data that starts on disk or object storage must cross PCIe (tens of GB/s) before GPU memory\'s TB/s bandwidth helps, which erases the gain for single-pass scans.',
      'The honest counterexample: GPU SQL engines (e.g. RAPIDS for Spark) win on wide scans, large hash joins, and sorts when data stays resident in GPU memory across many operators. Measure before assuming either way.',
      'Training and inference flip the answer — matrix multiplication is high-intensity and regular, so it belongs on GPUs/TPUs (or NPUs at the edge). The data engineer\'s job there is to keep the accelerator fed.',
    ],
    comparison: {
      caption: 'Processor execution models against data-engineering work',
      rowHeader: 'Processor',
      columns: ['Execution model', 'Built for', 'Fit for data engineering'],
      rows: [
        {
          id: 'cpu',
          label: 'CPU',
          cells: [
            'Few powerful cores; branch prediction, out-of-order execution, large caches, SIMD lanes (AVX2/AVX-512/NEON)',
            'Irregular, branchy, latency-sensitive work',
            'Default. Parsing, hashing, joins, sorts, compression, and string work all match its strengths.',
          ],
        },
        {
          id: 'gpu',
          label: 'GPU',
          cells: [
            'Thousands of simple cores in lockstep warps (SIMT); very high memory bandwidth; host data over PCIe',
            'Dense, regular, data-parallel math',
            'Situational. Wins for resident data and wide scans/joins; loses to transfer cost and branch divergence otherwise.',
          ],
        },
        {
          id: 'tpu',
          label: 'TPU',
          cells: [
            'Systolic matrix-multiply units; bfloat16; compiled via XLA',
            'Large-batch training and inference of tensor programs',
            'Not applicable to relational work; a consumer of the data pipeline, not a runner of it.',
          ],
        },
        {
          id: 'npu',
          label: 'NPU',
          cells: [
            'Fixed-function low-precision (int8/fp16) tensor units, power-efficient',
            'On-device inference',
            'Not applicable; relevant only as an edge deployment target for models the pipeline trains.',
          ],
        },
      ],
    },
    visual: {
      id: 'fig-cpu-vs-accelerators',
      kind: 'roofline',
      label:
        'A roofline chart with arithmetic intensity (operations per byte moved) on a log x-axis and attainable performance on a log y-axis. Performance rises along a sloped memory-bandwidth line until it meets a flat compute peak at about 10 operations per byte. Scan and filter, hash join probe, and hash aggregation sit at well under one operation per byte, far left of that point and bound by memory bandwidth. Dense matrix multiplication sits at about 100 operations per byte, on the flat compute roof. The numbers are illustrative.',
      caption:
        'Illustrative numbers, not a benchmark: low-intensity data operations are limited by memory bandwidth, while dense matrix multiplication reaches the compute peak.',
      bookIds: ['dive-into-systems', 'ai-systems-performance-engineering'],
      peakComputeLabel: 'Peak compute (illustrative: 1,000 GFLOP/s)',
      bandwidthLabel: 'Memory bandwidth (illustrative: 100 GB/s)',
      peakGflops: 1000,
      bandwidthGBs: 100,
      points: [
        { id: 'scan-filter', label: 'Scan / filter', intensity: 0.2 },
        { id: 'hash-join-probe', label: 'Hash join probe', intensity: 0.3 },
        { id: 'hash-aggregation', label: 'Hash aggregation', intensity: 0.5 },
        { id: 'dense-matmul', label: 'Dense matrix multiply', intensity: 100 },
      ],
    },
    sourceBookIds: ['dive-into-systems', 'ai-systems-performance-engineering', 'high-performance-spark'],
  },
  {
    id: 'memory-hierarchy',
    navLabel: 'Memory hierarchy',
    level: 'hardware',
    title: 'The memory hierarchy sets the cost of every access',
    summary:
      'Each step away from the core costs roughly an order of magnitude; sequential access hides it, random access pays it.',
    what: 'Predict where a job spends its time before optimizing it.',
    why:
      'A CPU fetches memory in 64-byte cache lines and prefetches when it can predict the next address. Sequential scans therefore run near bandwidth, while random access (hash probes, index lookups, pointer chasing) pays full latency per access. The same holds one level down: disks and object stores reward large sequential reads and punish small random ones.',
    how: [
      'Prefer layouts and algorithms that turn random access into sequential access: sorted runs, columnar files, batched lookups.',
      'Size hash tables and broadcast sides to fit in cache or memory; spilling to disk moves the cost three orders of magnitude.',
      'Attribute time before tuning: the USE method (utilization, saturation, errors) per resource tells you whether a job is CPU-, memory-, disk-, or network-bound.',
    ],
    comparison: {
      caption: 'Approximate access latency by level (orders of magnitude)',
      rowHeader: 'Level',
      columns: ['Typical latency', 'Relative to L1', 'What lives there in a data job'],
      rows: [
        { id: 'l1', label: 'L1 cache', cells: ['~1 ns', '1×', 'The current vector of column values'] },
        { id: 'l2-l3', label: 'L2 / L3 cache', cells: ['~4–40 ns', '~10×', 'Hot hash-table buckets, dictionary pages'] },
        { id: 'dram', label: 'DRAM', cells: ['~100 ns', '~100×', 'Hash tables, sort buffers, cached partitions'] },
        { id: 'nvme', label: 'NVMe SSD (random read)', cells: ['~10–100 µs', '~10,000×+', 'Spilled shuffle data, local index pages'] },
        { id: 'network', label: 'Same-datacenter round trip', cells: ['~0.5 ms', '~500,000×', 'Shuffle fetches, remote reads'] },
        { id: 'object-store', label: 'Object storage request', cells: ['~10–100 ms', '~10,000,000×+', 'Parquet files on S3/GCS/ADLS'] },
      ],
    },
    visual: {
      id: 'fig-memory-hierarchy',
      kind: 'ladder',
      label:
        'Six memory and storage tiers on a log scale of access latency, matching the table above. L1 cache is about 1 ns, L2 and L3 cache about 4 to 40 ns, DRAM about 100 ns, NVMe SSD random read about 10 to 100 microseconds, a same-datacenter round trip about 0.5 ms, and an object storage request about 10 to 100 ms. Each step away from the core costs roughly an order of magnitude or more.',
      caption: 'Access latency by tier on a log scale; bar length shows relative size, the label gives the approximate value.',
      bookIds: ['dive-into-systems', 'understanding-software-dynamics', 'systems-performance'],
      axisLabel: 'Access latency (log scale, orders of magnitude)',
      rungs: [
        { id: 'l1', label: 'L1 cache', detail: 'Per-core, smallest and fastest', log10Value: 0, valueLabel: '~1 ns', tone: 'emerald' },
        { id: 'l2-l3', label: 'L2 / L3 cache', detail: 'Larger, partly shared between cores', log10Value: 1, valueLabel: '~4–40 ns', tone: 'teal' },
        { id: 'dram', label: 'DRAM', detail: 'Main memory', log10Value: 2, valueLabel: '~100 ns', tone: 'sky' },
        { id: 'nvme', label: 'NVMe SSD (random read)', detail: 'Local flash storage', log10Value: 4.5, valueLabel: '~10–100 µs', tone: 'amber' },
        { id: 'network', label: 'Same-datacenter round trip', detail: 'One network hop and back', log10Value: 5.7, valueLabel: '~0.5 ms', tone: 'orange' },
        { id: 'object-store', label: 'Object storage request', detail: 'Remote request over HTTP', log10Value: 7.5, valueLabel: '~10–100 ms', tone: 'rose' },
      ],
    },
    sourceBookIds: ['dive-into-systems', 'understanding-software-dynamics', 'systems-performance'],
  },
  {
    id: 'columnar-vectorized',
    navLabel: 'Columnar + vectorized',
    level: 'hardware',
    title: 'Columnar layout and vectorized execution',
    summary: 'Store and process data by column so analytical scans read less and use every SIMD lane.',
    what: 'Pick an on-disk and in-memory layout that matches the access pattern.',
    why:
      'Analytical queries touch a few columns across many rows. A row layout drags every column through the memory hierarchy; a columnar layout reads only what the query needs, stores similar values together so they compress well (dictionary, run-length, delta), and hands the CPU tight arrays it can process with SIMD instructions — one instruction over many values instead of one per value.',
    how: [
      'Analytics: columnar files (Parquet, ORC) on disk and Apache Arrow in memory, with per-chunk min/max statistics so engines can skip data.',
      'Transactions: row stores, because a point write or a full-record read touches one row in one place.',
      'Vectorized engines (DuckDB, Photon, Velox, DataFusion) process batches of a column per operator call, cutting interpretation overhead and enabling SIMD.',
    ],
    comparison: {
      caption: 'Row vs columnar layout',
      rowHeader: 'Layout',
      columns: ['Fast at', 'Slow at', 'Typical systems'],
      rows: [
        {
          id: 'row',
          label: 'Row-oriented',
          cells: ['Point reads/writes of whole records (OLTP)', 'Scanning a few columns across many rows', 'PostgreSQL, MySQL/InnoDB'],
        },
        {
          id: 'columnar',
          label: 'Columnar',
          cells: ['Scans, aggregates, compression, SIMD (OLAP)', 'Single-row updates and inserts', 'Parquet, ORC, BigQuery, Snowflake, ClickHouse'],
        },
      ],
    },
    visual: {
      id: 'fig-columnar-vectorized',
      kind: 'strips',
      label:
        'The same table of three columns (id, region, amount) and four rows, laid out as a sequence of 12 cells in two ways. Row-wise storage places the three cells of row 1, then row 2, and so on, so the four amount cells are scattered among eight other cells. Column-wise storage places all four id cells, then all four region cells, then all four amount cells, so a query that sums only amount reads one contiguous group of four cells.',
      caption: 'Summing one column reads 4 of 12 cells in either layout, but only the columnar layout stores them together, so only those cells have to be fetched.',
      bookIds: ['designing-data-intensive-applications', 'high-performance-spark'],
      legend: 'Highlighted cells are read by a query that sums the amount column',
      lanes: [
        {
          id: 'row-wise',
          title: 'Row-wise layout',
          note: 'Each row is stored together, so the wanted cells are interleaved with cells the query does not need and whole records are pulled through memory.',
          cells: [
            { id: 'row-r1-id', label: 'r1 · id' },
            { id: 'row-r1-region', label: 'r1 · region' },
            { id: 'row-r1-amount', label: 'r1 · amount', isHighlighted: true },
            { id: 'row-r2-id', label: 'r2 · id' },
            { id: 'row-r2-region', label: 'r2 · region' },
            { id: 'row-r2-amount', label: 'r2 · amount', isHighlighted: true },
            { id: 'row-r3-id', label: 'r3 · id' },
            { id: 'row-r3-region', label: 'r3 · region' },
            { id: 'row-r3-amount', label: 'r3 · amount', isHighlighted: true },
            { id: 'row-r4-id', label: 'r4 · id' },
            { id: 'row-r4-region', label: 'r4 · region' },
            { id: 'row-r4-amount', label: 'r4 · amount', isHighlighted: true },
          ],
        },
        {
          id: 'column-wise',
          title: 'Column-wise layout',
          note: 'Each column is stored together, so the wanted cells form one contiguous run that can be read sequentially and processed in batches.',
          cells: [
            { id: 'col-id-r1', label: 'id · r1' },
            { id: 'col-id-r2', label: 'id · r2' },
            { id: 'col-id-r3', label: 'id · r3' },
            { id: 'col-id-r4', label: 'id · r4' },
            { id: 'col-region-r1', label: 'region · r1' },
            { id: 'col-region-r2', label: 'region · r2' },
            { id: 'col-region-r3', label: 'region · r3' },
            { id: 'col-region-r4', label: 'region · r4' },
            { id: 'col-amount-r1', label: 'amount · r1', isHighlighted: true },
            { id: 'col-amount-r2', label: 'amount · r2', isHighlighted: true },
            { id: 'col-amount-r3', label: 'amount · r3', isHighlighted: true },
            { id: 'col-amount-r4', label: 'amount · r4', isHighlighted: true },
          ],
        },
      ],
    },
    sourceBookIds: ['designing-data-intensive-applications', 'high-performance-spark'],
  },
  {
    id: 'language-runtime',
    navLabel: 'Language runtime',
    level: 'hardware',
    title: 'Language and runtime choice',
    summary:
      'The language decides how many layers sit between your logic and the hardware — interpretation, boxing, garbage collection, serialization.',
    what: 'Know where time goes between your code and the CPU.',
    why:
      'Each runtime layer costs per-record work: interpreters dispatch per operation, boxed objects scatter data across the heap, garbage collectors pause and pollute caches, and crossing a language boundary means serializing every row. Engines get fast by moving the hot loop out of the general-purpose runtime — generated code, off-heap columnar memory, or native code.',
    how: [
      'In Spark, prefer built-in DataFrame/SQL functions over UDFs; they stay inside Tungsten\'s off-heap binary format and whole-stage code generation.',
      'When Python logic is unavoidable, use Arrow-backed vectorized (pandas) UDFs, which move batches instead of pickling row by row.',
      'Reach for native engines (Photon, DataFusion, Polars, DuckDB) when the JVM\'s garbage collection and object overhead dominate a profile.',
    ],
    comparison: {
      caption: 'Where time goes by runtime',
      rowHeader: 'Runtime',
      columns: ['Per-record overhead', 'Lever', 'Trade-off'],
      rows: [
        {
          id: 'python-row-udf',
          label: 'Python row UDF in Spark',
          cells: ['Serialize to a Python worker per row, interpret, serialize back', 'Arrow vectorized UDFs, or rewrite in built-ins', 'Built-ins are less flexible than arbitrary Python'],
        },
        {
          id: 'jvm-objects',
          label: 'JVM objects (RDDs)',
          cells: ['Boxing, pointer-heavy heap, GC pauses', 'DataFrames with Tungsten off-heap memory', 'Lose compile-time types of the RDD API'],
        },
        {
          id: 'tungsten-codegen',
          label: 'Spark SQL + whole-stage codegen',
          cells: ['Low; operators fused into one generated loop', 'Keep plans codegen-eligible', 'Still JVM: GC and JIT warm-up remain'],
        },
        {
          id: 'native-vectorized',
          label: 'Native vectorized (C++/Rust)',
          cells: ['Lowest; SIMD over columnar batches, no GC', 'Photon, Velox, DataFusion, Polars', 'Ecosystem and portability of UDFs'],
        },
      ],
    },
    visual: {
      id: 'fig-language-runtime',
      kind: 'flow',
      label:
        'Four lanes, one per runtime in the table, showing the execution path of a record. Python row UDF: serialize the row, interpret it in a Python worker, serialize the result back. JVM objects: allocate a boxed object on the heap, follow pointers, and pay for garbage collection. Spark SQL with whole-stage code generation: operators fused into one generated loop over off-heap binary rows. Native vectorized: SIMD operators over columnar batches with no garbage collector.',
      caption: 'Each lane removes a layer between the logic and the CPU: fewer conversions, fewer pointers, then batches instead of single records.',
      bookIds: ['high-performance-spark', 'learning-spark', 'understanding-software-dynamics'],
      lanes: [
        {
          id: 'python-row-udf',
          title: 'Python row UDF in Spark',
          steps: [
            { id: 'serialize-out', label: 'Serialize row', detail: 'JVM row to Python worker', tone: 'rose' },
            { id: 'interpret', label: 'Interpret', detail: 'Python runs the function per row', tone: 'amber' },
            { id: 'serialize-back', label: 'Serialize result', detail: 'Python back to the JVM', tone: 'rose' },
          ],
        },
        {
          id: 'jvm-objects',
          title: 'JVM objects (RDDs)',
          steps: [
            { id: 'box', label: 'Allocate objects', detail: 'Boxed values on the heap', tone: 'amber' },
            { id: 'chase', label: 'Follow pointers', detail: 'Scattered memory, poor locality', tone: 'orange' },
            { id: 'gc', label: 'Garbage collect', detail: 'Pauses and cache pollution', tone: 'rose' },
          ],
        },
        {
          id: 'tungsten-codegen',
          title: 'Spark SQL + whole-stage codegen',
          steps: [
            { id: 'binary-rows', label: 'Off-heap binary rows', detail: 'Compact, no per-value objects', tone: 'sky' },
            { id: 'fused-loop', label: 'Fused generated loop', detail: 'Operators compiled into one loop', tone: 'violet' },
          ],
        },
        {
          id: 'native-vectorized',
          title: 'Native vectorized (C++/Rust)',
          steps: [
            { id: 'columnar-batch', label: 'Columnar batch', detail: 'Contiguous arrays of one column', tone: 'sky' },
            { id: 'simd', label: 'SIMD operators', detail: 'One instruction over many values', tone: 'emerald' },
          ],
        },
      ],
    },
    sourceBookIds: ['high-performance-spark', 'learning-spark', 'understanding-software-dynamics'],
  },
];
