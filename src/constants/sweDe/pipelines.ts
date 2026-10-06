/**
 * Pipeline-level thinking: the design decisions a data engineer makes between
 * a source and a consumer — where to transform, when to run, how to retry
 * safely, how to model, store, capture, test, and ship. Each topic argues one
 * decision from first principles and draws the mechanism.
 *
 * Content is this page's own synthesis for interview use, grounded in the
 * cited books; worked examples are generic (orders, clickstreams), not any
 * particular system.
 */

import type { FirstPrinciplesTopic } from './types';

export const PIPELINES_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'etl-vs-elt',
    navLabel: 'ETL vs ELT',
    level: 'pipelines',
    title: 'ETL vs ELT: decide where transformation runs',
    summary:
      'ETL transforms before loading; ELT loads raw data first and transforms inside the destination. The choice follows where compute is cheap and what history you must keep.',
    what: 'Place transformation before or after the load by asking where compute is cheapest and whether raw history must survive.',
    why:
      'ETL came from an era when warehouse storage and compute were bought together and were expensive, so you transformed outside and loaded only curated rows. Cloud warehouses and lakehouses separate cheap, durable storage from elastic compute, so landing raw data first is inexpensive, keeps the original for audit and replay, and lets you rebuild every derived table when business logic changes. ELT pays for that flexibility in two places: raw (possibly sensitive) data now sits in the destination, so access control and masking move later in the flow, and transformation compute is billed where the data lives. ETL still wins when data must be filtered, masked, or reduced before it may legally or economically land.',
    how: [
      'Default to ELT when storage is cheap and the destination scales compute elastically: land raw, then transform with versioned SQL.',
      'Choose ETL (or an in-flight transform) when data must be minimized, masked, or validated before it is allowed to land.',
      'Keep the raw layer immutable. A logic change then becomes a re-run over retained data instead of a re-extraction from a source that may have changed.',
    ],
    visual: {
      id: 'fig-etl-vs-elt',
      kind: 'flow',
      label:
        'Two lanes compared. ETL: extract, transform in an external engine, load curated tables. ELT: extract, load raw data, transform inside the warehouse, serve.',
      caption: 'The same four verbs in a different order. The order decides where compute is paid for and whether raw data is kept.',
      bookIds: ['data-pipelines-pocket-reference', 'fundamentals-of-data-engineering'],
      lanes: [
        {
          id: 'etl',
          title: 'ETL — transform before load',
          steps: [
            { id: 'extract', label: 'Extract', detail: 'Read from the source', tone: 'rose' },
            { id: 'transform', label: 'Transform', detail: 'Clean and reshape in an external engine', tone: 'violet' },
            { id: 'load', label: 'Load curated', detail: 'Only the finished tables arrive', tone: 'sky' },
          ],
        },
        {
          id: 'elt',
          title: 'ELT — load first, transform in place',
          steps: [
            { id: 'extract', label: 'Extract', detail: 'Read from the source', tone: 'rose' },
            { id: 'load-raw', label: 'Load raw', detail: 'Immutable copy kept for replay', tone: 'zinc' },
            { id: 'transform', label: 'Transform', detail: 'SQL runs where the data lives', tone: 'violet' },
            { id: 'serve', label: 'Serve', detail: 'Curated tables for consumers', tone: 'sky' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'ETL and ELT compared',
      rowHeader: 'Question',
      columns: ['ETL', 'ELT'],
      rows: [
        { id: 'where', label: 'Where transformation runs', cells: ['External engine before the destination', 'Inside the warehouse or lakehouse'] },
        { id: 'raw-history', label: 'Raw history', cells: ['Often discarded after the transform', 'Kept as an immutable raw layer'] },
        { id: 'logic-change', label: 'When logic changes', cells: ['Re-extract from the source, if it still has the data', 'Re-run SQL over retained raw data'] },
        { id: 'governance', label: 'Governance exposure', cells: ['Sensitive fields can be dropped before landing', 'Raw sensitive data lands, so masking and access control move later'] },
        { id: 'fits', label: 'Fits when', cells: ['Data must be reduced or masked before landing', 'Storage is cheap and compute is elastic'] },
      ],
    },
    sourceBookIds: ['data-pipelines-pocket-reference', 'fundamentals-of-data-engineering', 'data-warehouse-toolkit'],
  },
  {
    id: 'batch-vs-streaming',
    navLabel: 'Batch vs streaming',
    level: 'pipelines',
    title: 'Batch vs streaming: buy latency only when a decision needs it',
    summary:
      'Streaming lowers latency and raises complexity and cost. Most "real-time" requirements turn out to mean "fresh enough for the decision".',
    what: 'Pick batch, micro-batch, or streaming from how quickly a consumer must act, not from what sounds modern.',
    why:
      'Batch processes a bounded, complete slice of data, so it is simple to reason about, easy to re-run, and cheap because compute can be released between runs. Streaming processes unbounded data continuously, which forces the engine to handle out-of-order events (event time differs from processing time), keep state across events, checkpoint it for recovery, and run always-on. Each step toward lower latency buys freshness with operational complexity and continuous cost. The right latency is set by when a consumer must act: a nightly finance report gains nothing from sub-second data, while fraud screening does. Lambda architectures run a batch and a streaming path side by side and pay for two code bases; Kappa architectures replay a durable log through one streaming path.',
    how: [
      'Ask the consumer what decision the data drives and how stale it can be, then pick the slowest option that satisfies it.',
      'Start with batch or micro-batch; move to streaming only where the freshness requirement is real and the team can operate state and checkpoints.',
      'If you stream, design for late and out-of-order events up front: use event time, a watermark policy, and an idempotent sink.',
    ],
    visual: {
      id: 'fig-batch-vs-streaming',
      kind: 'flow',
      label:
        'Three lanes compared. Batch accumulates a bounded window, runs a job, and publishes a complete result. Micro-batch does the same on short windows. Streaming updates state per event and emits continuously.',
      caption: 'Processing models ordered by latency. Each step to the right trades simplicity and cost for freshness.',
      bookIds: ['streaming-systems', 'designing-data-intensive-applications', 'kafka-definitive-guide'],
      sourceIds: ['flink-time'],
      lanes: [
        {
          id: 'batch',
          title: 'Batch — minutes to hours',
          steps: [
            { id: 'accumulate', label: 'Accumulate', detail: 'Collect a bounded window of data', tone: 'zinc' },
            { id: 'run', label: 'Run job', detail: 'Process the whole window at once', tone: 'violet' },
            { id: 'publish', label: 'Publish', detail: 'A complete, re-runnable result', tone: 'sky' },
          ],
        },
        {
          id: 'micro-batch',
          title: 'Micro-batch — seconds to minutes',
          steps: [
            { id: 'accumulate', label: 'Short window', detail: 'Collect a few seconds of events', tone: 'zinc' },
            { id: 'run', label: 'Run small job', detail: 'Same engine, tiny batches', tone: 'violet' },
            { id: 'publish', label: 'Append result', detail: 'Frequent incremental output', tone: 'sky' },
          ],
        },
        {
          id: 'streaming',
          title: 'Streaming — milliseconds to seconds',
          steps: [
            { id: 'event', label: 'Event arrives', detail: 'Possibly late or out of order', tone: 'rose' },
            { id: 'state', label: 'Update state', detail: 'Windows keyed by event time; checkpointed', tone: 'violet' },
            { id: 'emit', label: 'Emit continuously', detail: 'Watermark decides when a window closes', tone: 'sky' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'Batch, micro-batch, and streaming compared',
      rowHeader: 'Dimension',
      columns: ['Batch', 'Micro-batch', 'Streaming'],
      rows: [
        { id: 'latency', label: 'Typical latency', cells: ['Minutes to hours', 'Seconds to minutes', 'Milliseconds to seconds'] },
        { id: 'completeness', label: 'Completeness', cells: ['Whole window, easy to verify', 'Small windows, late data needs a policy', 'Always partial until a watermark closes the window'] },
        { id: 'complexity', label: 'Operational complexity', cells: ['Low: stateless between runs', 'Medium: scheduler plus state across batches', 'High: state, checkpoints, ordering, backpressure'] },
        { id: 'cost-shape', label: 'Cost shape', cells: ['Compute released between runs', 'Frequent short runs', 'Compute always on'] },
        { id: 'rerun', label: 'Re-run after a bug', cells: ['Re-run the window', 'Re-run affected batches', 'Replay the log from an offset'] },
      ],
    },
    sourceBookIds: ['streaming-systems', 'designing-data-intensive-applications', 'kafka-definitive-guide', 'fundamentals-of-data-engineering'],
  },
  {
    id: 'idempotent-loads',
    navLabel: 'Idempotent loads',
    level: 'pipelines',
    title: 'Idempotent loads: running twice must equal running once',
    summary:
      'Retries are inevitable, so a load must leave the same final state however many times it runs.',
    what: 'Design every write so a retry or backfill cannot create duplicates or double counts.',
    why:
      'Pipelines fail midway and orchestrators retry them, so each task effectively runs at least once. A write that appends is not safe under that: a retry inserts the same rows again. A function is idempotent when applying it twice gives the same result as applying it once, so the write must depend only on the input window, never on how many attempts happened. That needs two things: a deterministic input (a logical date or data interval, not "now"), and a write that replaces or merges by key instead of appending blindly. Overwriting a partition atomically, deleting and inserting a slice inside one transaction, and merging on a stable key all qualify.',
    how: [
      'Parameterize each run by the data interval it owns, so a retry reads exactly the same input.',
      'Write by replacing the interval (partition overwrite or delete-then-insert in one transaction) or by upserting on a stable business key.',
      'Test it: run the same interval twice in staging and assert the row counts and checksums are identical.',
    ],
    visual: {
      id: 'fig-idempotent-loads',
      kind: 'flow',
      label:
        'Three write strategies run twice on the same three input rows. Append ends with six rows. Delete the partition then insert ends with three rows. Merge on the key ends with three rows.',
      caption: 'The same retry under three write strategies. Only the last two are safe to re-run.',
      bookIds: ['data-pipelines-with-airflow', 'data-pipelines-pocket-reference', 'designing-data-intensive-applications'],
      lanes: [
        {
          id: 'append',
          title: 'Append — not idempotent',
          steps: [
            { id: 'run-1', label: 'Run 1', detail: 'Insert 3 rows → table has 3', tone: 'zinc' },
            { id: 'retry', label: 'Retry', detail: 'Insert the same 3 rows again', tone: 'amber' },
            { id: 'result', label: '6 rows', detail: 'Duplicates; counts are wrong', tone: 'rose' },
          ],
        },
        {
          id: 'replace',
          title: 'Delete the partition, then insert — idempotent',
          steps: [
            { id: 'run-1', label: 'Run 1', detail: 'Delete slice, insert 3 → 3 rows', tone: 'zinc' },
            { id: 'retry', label: 'Retry', detail: 'Delete slice, insert same 3', tone: 'amber' },
            { id: 'result', label: '3 rows', detail: 'Same final state', tone: 'emerald' },
          ],
        },
        {
          id: 'merge',
          title: 'Merge on a stable key — idempotent',
          steps: [
            { id: 'run-1', label: 'Run 1', detail: 'Match on key: insert 3 → 3 rows', tone: 'zinc' },
            { id: 'retry', label: 'Retry', detail: 'Keys match: update in place', tone: 'amber' },
            { id: 'result', label: '3 rows', detail: 'Same final state', tone: 'emerald' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'Write strategies and what they need to be safe to re-run',
      rowHeader: 'Strategy',
      columns: ['Run twice yields', 'Needs', 'Watch out for'],
      rows: [
        { id: 'append', label: 'Blind append', cells: ['Duplicate rows', 'Nothing, which is the problem', 'Silent double counting after any retry'] },
        { id: 'partition-overwrite', label: 'Overwrite the partition', cells: ['Same rows', 'Data partitioned by the run interval; atomic replace', 'Late data landing in an old partition needs a re-run of that interval'] },
        { id: 'delete-insert', label: 'Delete then insert, one transaction', cells: ['Same rows', 'A key that identifies the slice (batch id or interval)', 'Both statements must commit together'] },
        { id: 'merge', label: 'Merge or upsert on a key', cells: ['Same rows', 'A stable, unique business or event key', 'Choosing a key that is not truly unique silently drops rows'] },
      ],
    },
    sourceBookIds: ['data-pipelines-with-airflow', 'data-pipelines-pocket-reference', 'designing-data-intensive-applications', 'kafka-definitive-guide'],
  },
  {
    id: 'orchestration-dags',
    navLabel: 'Orchestration and DAGs',
    level: 'pipelines',
    title: 'Orchestration: pipelines are graphs with retries and intervals',
    summary:
      'An orchestrator tracks task state per data interval, runs tasks in dependency order, retries transient failures, and re-runs history on demand.',
    what: 'Model each pipeline as a directed acyclic graph and make every task safe to retry and backfill.',
    why:
      'Tasks depend on each other, so the work forms a graph, and the graph must be acyclic or no valid run order exists; a topological sort of a DAG always gives one. The orchestrator records state for each (task, data interval) pair rather than for "the pipeline", which is what makes selective re-runs and backfills possible: ask for the missing intervals and it runs only those. Failures split into transient (a timeout, a throttled API) and permanent (a bug, bad data). Retries with exponential backoff absorb the first kind, and they are only safe when tasks are idempotent. Downstream tasks of a permanent failure are skipped and an alert fires, ideally on a missed freshness deadline, not just on the failure.',
    how: [
      'Express dependencies explicitly in the graph; do not rely on "this usually finishes before that starts".',
      'Make every task idempotent and parameterized by its data interval, then configure retries with backoff and a timeout.',
      'Alert on missed deadlines (a freshness SLA), and backfill by interval range instead of re-running everything.',
    ],
    visual: {
      id: 'fig-orchestration-dags',
      kind: 'flow',
      label:
        'Three lanes. Normal run: extract, validate, transform, publish in dependency order. Failure path: a task fails, retries with backoff, exhausts retries, downstream tasks are skipped and an alert fires. Backfill: missing daily intervals are run one by one.',
      caption: 'A run is a walk over the graph for one data interval. Retries and backfills reuse the same tasks.',
      bookIds: ['data-pipelines-with-airflow', 'fundamentals-of-data-engineering'],
      sourceIds: ['airflow-dag-runs'],
      lanes: [
        {
          id: 'run',
          title: 'Normal run for one interval',
          steps: [
            { id: 'extract', label: 'Extract', detail: 'Reads interval [start, end)', tone: 'rose' },
            { id: 'validate', label: 'Validate', detail: 'Schema and row-count checks', tone: 'amber' },
            { id: 'transform', label: 'Transform', detail: 'Runs after validate succeeds', tone: 'violet' },
            { id: 'publish', label: 'Publish', detail: 'Atomic swap into the serving table', tone: 'sky' },
          ],
        },
        {
          id: 'failure',
          title: 'Failure path',
          steps: [
            { id: 'fail', label: 'Task fails', detail: 'Timeout or throttled source', tone: 'rose' },
            { id: 'retry', label: 'Retry with backoff', detail: 'Wait longer each attempt; safe if idempotent', tone: 'amber' },
            { id: 'exhausted', label: 'Retries exhausted', detail: 'Downstream tasks are skipped', tone: 'zinc' },
            { id: 'alert', label: 'Alert', detail: 'Page on the missed freshness deadline', tone: 'orange' },
          ],
        },
        {
          id: 'backfill',
          title: 'Backfill',
          steps: [
            { id: 'find-gap', label: 'Find missing intervals', detail: 'State is stored per interval', tone: 'zinc' },
            { id: 'run-each', label: 'Run each interval', detail: 'Same tasks, different parameters', tone: 'violet' },
            { id: 'verify', label: 'Verify', detail: 'Counts match; re-running changes nothing', tone: 'emerald' },
          ],
        },
      ],
    },
    sourceBookIds: ['data-pipelines-with-airflow', 'fundamentals-of-data-engineering', 'data-pipelines-pocket-reference'],
  },
  {
    id: 'data-modeling',
    navLabel: 'Data modeling',
    level: 'pipelines',
    title: 'Data modeling: declare the grain, then everything follows',
    summary:
      'Dimensional modeling picks a business process and a grain, then splits data into additive facts and descriptive dimensions that preserve history.',
    what: 'Model analytical data around a declared grain so measures aggregate correctly and history is kept.',
    why:
      'Analysts ask the same questions repeatedly (totals by customer, product, and month), and the cheapest way to answer them is to store measurements once at a fixed grain, such as one row per order line, and describe them through small dimension tables. The grain is the contract: every fact row means the same thing, so sums and counts are valid. A star schema accepts some redundancy in dimensions to avoid deep join chains, and columnar engines scan the narrow fact table fast. Dimension attributes change over time, so a type 2 slowly changing dimension closes the old row and inserts a new one with validity dates and a surrogate key, letting old facts keep joining to the attributes true at the time. Wide denormalized tables trade flexibility for simplicity, and Data Vault trades query simplicity for auditability and parallel loading.',
    how: [
      'Follow the four decisions in order: pick the business process, declare the grain, choose the dimensions, then identify the facts.',
      'Use surrogate keys for dimensions and keep natural keys as attributes, so history rows can coexist.',
      'Use type 2 for attributes whose history matters to reporting; overwrite (type 1) only when history has no analytical value.',
    ],
    visual: {
      id: 'fig-data-modeling',
      kind: 'flow',
      label:
        'Two lanes. Dimensional design in four steps: pick the business process, declare the grain, choose the dimensions, identify the facts. Type 2 slowly changing dimension: an attribute changes, the old row is closed, a new row is inserted, facts join by surrogate key.',
      caption: 'Design order for a star schema, and the row mechanics that preserve dimension history.',
      bookIds: ['data-warehouse-toolkit', 'fundamentals-of-data-engineering'],
      sourceIds: ['kimball-dimensional-modeling'],
      lanes: [
        {
          id: 'design',
          title: 'Dimensional design, in order',
          steps: [
            { id: 'process', label: 'Business process', detail: 'For example, order fulfillment', tone: 'rose' },
            { id: 'grain', label: 'Declare the grain', detail: 'One row per order line', tone: 'amber' },
            { id: 'dimensions', label: 'Dimensions', detail: 'Customer, product, date: who, what, when', tone: 'teal' },
            { id: 'facts', label: 'Facts', detail: 'Additive measures: quantity, amount', tone: 'sky' },
          ],
        },
        {
          id: 'scd2',
          title: 'Type 2 slowly changing dimension',
          steps: [
            { id: 'change', label: 'Attribute changes', detail: 'Customer moves to a new region', tone: 'rose' },
            { id: 'close', label: 'Close the old row', detail: 'Set valid_to; mark not current', tone: 'zinc' },
            { id: 'insert', label: 'Insert a new row', detail: 'New surrogate key, valid_from, current', tone: 'emerald' },
            { id: 'join', label: 'Facts join by surrogate key', detail: 'Old facts keep the old attributes', tone: 'sky' },
          ],
        },
      ],
    },
    sourceBookIds: ['data-warehouse-toolkit', 'fundamentals-of-data-engineering', 'learning-sql'],
  },
  {
    id: 'warehouse-lakehouse',
    navLabel: 'Warehouse to lakehouse',
    level: 'pipelines',
    title: 'Warehouse, lake, lakehouse: add atomic commits to cheap files',
    summary:
      'Object storage is cheap and durable but cannot update many files atomically. A table format adds a metadata layer that can.',
    what: 'Understand what a lakehouse adds to a data lake, and how layered (medallion) tables use it.',
    why:
      'A warehouse couples storage and compute and enforces a schema on write, which gives reliability and speed at a higher price. A data lake stores open files in object storage cheaply with schema on read, but object stores update one object at a time, so a job that writes many files can fail halfway and expose partial data. A lakehouse keeps the open files and adds a table format: a transaction log or manifest tree that lists which data files make up each version of the table. A commit writes new data files first, then atomically publishes one metadata entry that points at them; readers resolve a snapshot, so they see the old version or the new one and never a mixture. The same metadata enables time travel, schema evolution, and merge operations. The costs are small files that must be compacted and a catalog that must be kept consistent. Layering tables as raw (bronze), cleaned (silver), and business-ready (gold) is a common convention for where quality gates sit.',
    how: [
      'Land raw data unchanged in a first layer, apply cleaning and conformance in a second, and publish business-level aggregates in a third; put quality checks at each boundary.',
      'Compact small files on a schedule and expire old snapshots, or read cost and latency degrade.',
      'Choose a table format for its engine support and catalog story, since commit semantics are similar across the major formats.',
    ],
    visual: {
      id: 'fig-warehouse-lakehouse',
      kind: 'flow',
      label:
        'Three lanes. Evolution: warehouse, data lake, lakehouse. Layers: raw, cleaned, business-ready. Atomic commit: write data files, then publish one metadata entry, so readers see a consistent snapshot.',
      caption: 'Each generation fixes the previous one. The commit protocol is what makes files behave like a table.',
      bookIds: ['fundamentals-of-data-engineering', 'learning-spark', 'data-management-at-scale'],
      sourceIds: ['iceberg-table-spec', 'delta-transaction-log'],
      lanes: [
        {
          id: 'evolution',
          title: 'How the architecture evolved',
          steps: [
            { id: 'warehouse', label: 'Warehouse', detail: 'Coupled storage and compute; schema on write', tone: 'blue' },
            { id: 'lake', label: 'Data lake', detail: 'Cheap open files; schema on read; no atomic commits', tone: 'amber' },
            { id: 'lakehouse', label: 'Lakehouse', detail: 'Open files plus a transaction log', tone: 'emerald' },
          ],
        },
        {
          id: 'layers',
          title: 'Layered tables (medallion convention)',
          steps: [
            { id: 'raw', label: 'Raw (bronze)', detail: 'As received; immutable', tone: 'orange' },
            { id: 'cleaned', label: 'Cleaned (silver)', detail: 'Deduplicated, typed, conformed', tone: 'zinc' },
            { id: 'business', label: 'Business (gold)', detail: 'Aggregates and models for consumers', tone: 'yellow' },
          ],
        },
        {
          id: 'commit',
          title: 'Atomic commit on object storage',
          steps: [
            { id: 'write-files', label: 'Write data files', detail: 'Invisible until referenced', tone: 'zinc' },
            { id: 'publish', label: 'Publish metadata entry', detail: 'One atomic pointer swap', tone: 'violet' },
            { id: 'snapshot', label: 'Readers pin a snapshot', detail: 'Old or new version, never a mix', tone: 'sky' },
          ],
        },
      ],
    },
    sourceBookIds: ['fundamentals-of-data-engineering', 'learning-spark', 'data-management-at-scale', 'data-warehouse-toolkit'],
  },
  {
    id: 'change-data-capture',
    navLabel: 'Change data capture',
    level: 'pipelines',
    title: 'Change data capture: read the database log, not the tables',
    summary:
      'A database already records every committed change in an ordered log. CDC reads that log instead of polling tables or writing to two places.',
    what: 'Replicate changes from an operational database by consuming its transaction log.',
    why:
      'Polling a table with an updated-at column misses deletes and any intermediate updates between polls, and it loads the source with repeated queries. Writing to the database and to a message bus from application code (a dual write) can leave them inconsistent when one write fails. The database log is the authoritative, ordered record of committed changes, kept for crash recovery and replication, so a connector that reads it sees every insert, update, and delete in commit order without querying the tables. Changes are published per key in order, deletes travel as tombstones, and the consumer applies them as upserts and deletes. Delivery is at least once, so sinks must be idempotent. To bootstrap, take a consistent snapshot, record the log position, then tail the log from that position so nothing is missed or applied twice.',
    how: [
      'Prefer log-based CDC over timestamp polling when you need deletes, every change, or low load on the source.',
      'Bootstrap with a snapshot at a recorded log position, then stream from exactly that position.',
      'Where the application must publish events itself, write the event to an outbox table in the same transaction as the business row, and relay it from there instead of dual writing.',
    ],
    visual: {
      id: 'fig-change-data-capture',
      kind: 'flow',
      label:
        'Three lanes. Log-based CDC: a write commits, the change is recorded in the database log, a connector reads the log, ordered change events are published per key, and the sink applies upserts and deletes. Bootstrap: snapshot at a recorded position then tail the log from it. Outbox: business row and outbox row commit together and a relay publishes the outbox.',
      caption: 'The log is the single ordered source of change; the outbox pattern gives applications the same guarantee.',
      bookIds: ['designing-data-intensive-applications', 'building-event-driven-microservices', 'kafka-definitive-guide'],
      sourceIds: ['debezium-docs'],
      lanes: [
        {
          id: 'log-based',
          title: 'Log-based CDC',
          steps: [
            { id: 'commit', label: 'Write commits', detail: 'Insert, update, or delete', tone: 'rose' },
            { id: 'log', label: 'Recorded in the log', detail: 'Write-ahead or binary log, in commit order', tone: 'zinc' },
            { id: 'connector', label: 'Connector reads the log', detail: 'No queries against the tables', tone: 'violet' },
            { id: 'events', label: 'Change events per key', detail: 'Ordered; deletes as tombstones', tone: 'sky' },
            { id: 'sink', label: 'Sink applies', detail: 'Idempotent upserts and deletes', tone: 'emerald' },
          ],
        },
        {
          id: 'bootstrap',
          title: 'Bootstrap without gaps or overlap',
          steps: [
            { id: 'position', label: 'Record log position', detail: 'Mark where the snapshot starts', tone: 'zinc' },
            { id: 'snapshot', label: 'Consistent snapshot', detail: 'Copy existing rows', tone: 'amber' },
            { id: 'tail', label: 'Tail the log', detail: 'Resume from the recorded position', tone: 'sky' },
          ],
        },
        {
          id: 'outbox',
          title: 'Outbox pattern (application-published events)',
          steps: [
            { id: 'one-transaction', label: 'One transaction', detail: 'Business row and outbox row commit together', tone: 'rose' },
            { id: 'relay', label: 'Relay reads outbox', detail: 'Often via CDC on the outbox table', tone: 'violet' },
            { id: 'publish', label: 'Publish event', detail: 'No dual write to keep consistent', tone: 'sky' },
          ],
        },
      ],
    },
    sourceBookIds: ['designing-data-intensive-applications', 'building-event-driven-microservices', 'kafka-definitive-guide'],
  },
  {
    id: 'data-quality-contracts',
    navLabel: 'Quality and contracts',
    level: 'pipelines',
    title: 'Data quality and contracts: check at the boundary, quarantine the rest',
    summary:
      'Bad data costs more the further it travels. Contracts state expectations between producer and consumer; checks enforce them where someone can fix the cause.',
    what: 'Move quality checks to the boundaries between teams and stages, and agree expectations in a contract.',
    why:
      'A wrong value caught at ingestion costs one conversation with its producer; the same value caught in a dashboard costs a retraction and lost trust. Checks therefore belong at each boundary: when data enters, after each transformation, and before it is served. A data contract makes the expectation explicit and owned: the schema, the meaning of fields, freshness and volume targets, and who to contact when it changes. Schema changes are the commonest break. Adding an optional field is usually safe for existing consumers, while removing or renaming a field, or changing a type, breaks them, so such changes need versioning and notice. When only some rows are bad, validate and quarantine them in a dead-letter table instead of failing the entire load, and alert on the quarantine rate. Common dimensions to monitor are freshness, volume, schema, value distribution, and lineage.',
    how: [
      'Write the contract with the producer: schema, field meaning, freshness, volume range, owner, and the change process.',
      'Validate at ingestion (schema, types, nulls), test after each transform (uniqueness, referential integrity, accepted values), and monitor freshness after publish.',
      'Quarantine failing rows with the reason attached, alert on the rate, and fix the cause upstream.',
    ],
    visual: {
      id: 'fig-data-quality-contracts',
      kind: 'flow',
      label:
        'Two lanes. Happy path: contract at the source, ingestion validation, transformation tests, publish with a freshness monitor. Failure path: failing rows go to a quarantine table, an alert fires, and the producer is notified.',
      caption: 'Checks sit at every boundary. Failures are isolated and routed to an owner instead of blocking everything.',
      bookIds: ['data-management-at-scale', 'data-mesh', 'fundamentals-of-data-engineering'],
      sourceIds: ['open-data-contract-standard', 'confluent-schema-evolution', 'openlineage-docs'],
      lanes: [
        {
          id: 'happy',
          title: 'Checks along the happy path',
          steps: [
            { id: 'contract', label: 'Contract', detail: 'Schema, meaning, freshness, owner', tone: 'purple' },
            { id: 'ingest-check', label: 'Ingestion checks', detail: 'Schema, types, nulls', tone: 'amber' },
            { id: 'transform-tests', label: 'Transformation tests', detail: 'Unique, referential, accepted values', tone: 'violet' },
            { id: 'publish', label: 'Publish and monitor', detail: 'Freshness and volume watched', tone: 'sky' },
          ],
        },
        {
          id: 'failure',
          title: 'When rows fail',
          steps: [
            { id: 'quarantine', label: 'Quarantine rows', detail: 'Dead-letter table with the reason', tone: 'orange' },
            { id: 'alert', label: 'Alert on the rate', detail: 'A spike means a source changed', tone: 'rose' },
            { id: 'notify', label: 'Notify the owner', detail: 'Fix upstream, then replay', tone: 'emerald' },
          ],
        },
      ],
    },
    sourceBookIds: ['data-management-at-scale', 'data-mesh', 'fundamentals-of-data-engineering', 'building-event-driven-microservices'],
  },
  {
    id: 'pipeline-testing',
    navLabel: 'Pipeline testing',
    level: 'pipelines',
    title: 'Testing pipelines: test the code on fixtures and the data in place',
    summary:
      'Code tests prove the logic is right; data tests detect when the input changed. A pipeline needs both, plus a re-run test for idempotency.',
    what: 'Layer unit, data, and contract tests, and promote changes through staging with a data diff.',
    why:
      'A pipeline can fail because the code is wrong or because the data is different from what the code assumed, and only separate kinds of test catch each. Unit tests run transformation logic on small hand-built fixtures, fast and without infrastructure, so they belong in every commit. Data tests assert properties of real output, such as uniqueness, non-null keys, accepted ranges, and row counts against expectations, so they detect drift the fixtures never saw. Contract tests check that the output schema still satisfies its consumers. A staging run on production-shaped data, with a diff against current production output, shows the effect of a change before it ships. Because retries and backfills are routine, a re-run test (run one interval twice and compare) checks idempotency directly.',
    how: [
      'Keep transformations as small, pure functions or single-purpose SQL models so they can be tested on fixtures.',
      'Run unit and contract tests in CI on every change, and data tests on every run in production.',
      'Before promoting, run in staging and diff the output against production; add a run-twice test for every load.',
    ],
    visual: {
      id: 'fig-pipeline-testing',
      kind: 'flow',
      label:
        'Two lanes. Test layers from fastest to slowest: unit tests on fixtures, data tests on real output, contract tests against consumers, end-to-end staging run. Change flow: pull request, CI tests, deploy to staging, data diff against production, promote.',
      caption: 'Fast, cheap tests run on every change; slower, data-dependent tests run where the data lives.',
      bookIds: ['software-engineering-at-google', 'data-pipelines-with-airflow', 'fundamentals-of-data-engineering'],
      lanes: [
        {
          id: 'layers',
          title: 'Test layers, fast to slow',
          steps: [
            { id: 'unit', label: 'Unit tests', detail: 'Pure logic on small fixtures', tone: 'emerald' },
            { id: 'data', label: 'Data tests', detail: 'Unique, not null, ranges, counts on real output', tone: 'amber' },
            { id: 'contract', label: 'Contract tests', detail: 'Output schema still fits consumers', tone: 'purple' },
            { id: 'end-to-end', label: 'Staging run', detail: 'Production-shaped data, full path', tone: 'sky' },
          ],
        },
        {
          id: 'change',
          title: 'Promoting a change',
          steps: [
            { id: 'pr', label: 'Pull request', detail: 'Review the code and the SQL', tone: 'zinc' },
            { id: 'ci', label: 'CI tests', detail: 'Unit and contract tests pass', tone: 'emerald' },
            { id: 'diff', label: 'Staging data diff', detail: 'Compare output with production', tone: 'amber' },
            { id: 'promote', label: 'Promote', detail: 'Deploy, then watch the data tests', tone: 'sky' },
          ],
        },
      ],
    },
    sourceBookIds: ['software-engineering-at-google', 'data-pipelines-with-airflow', 'fundamentals-of-data-engineering', 'pragmatic-programmer'],
  },
  {
    id: 'sql-patterns-interview',
    navLabel: 'SQL patterns',
    level: 'pipelines',
    title: 'SQL patterns: number the rows, then group by something derived',
    summary:
      'Window functions compute a value per row over a partition without collapsing rows. Most interview SQL reduces to a handful of window patterns.',
    what: 'Recognize the four window patterns behind most data engineering SQL problems: dedup, running totals, islands, and sessions.',
    why:
      'GROUP BY collapses rows into one per group, which loses the row-level detail many problems need. A window function evaluates over a set of related rows (a partition, ordered within it) and returns a value for each input row, so you can rank, accumulate, and compare to neighbors in a single pass. Engines implement this by sorting or partitioning the data by the partition keys, so a supporting index or pre-sorted layout makes it cheaper. Many hard-looking problems are the same few moves: number rows to keep the latest per key, accumulate with a frame, subtract a row number from a sequence so that consecutive runs share a constant value, or flag gaps and take a cumulative sum to label sessions. Fluency comes from recognizing which move a problem needs, then checking the edge cases: ties, nulls, and the window frame.',
    how: [
      'Latest row per key: ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC), then keep rows numbered 1. Add a tiebreaker column so the result is deterministic.',
      'Running totals and moving averages: an aggregate OVER an ordered partition with an explicit frame (ROWS BETWEEN … AND CURRENT ROW).',
      'Consecutive runs and sessions: the difference between a value and ROW_NUMBER() is constant within a run; LAG() plus a gap flag plus a cumulative SUM() labels sessions. Read the query plan to confirm sorts are not repeated.',
    ],
    visual: {
      id: 'fig-sql-patterns',
      kind: 'flow',
      label:
        'Four lanes, one per pattern. Latest row per key: partition and order, number rows, keep row one. Running total: order within a partition, aggregate over a frame. Consecutive runs: number rows, subtract from the value, group by the result. Sessions: compare to the previous row, flag a gap, cumulative sum labels the session.',
      caption: 'Each pattern is a short pipeline of window steps. Name the pattern first, then write the SQL.',
      bookIds: ['learning-sql', 'postgresql-query-optimization'],
      lanes: [
        {
          id: 'dedup',
          title: 'Latest row per key',
          steps: [
            { id: 'partition', label: 'PARTITION BY key', detail: 'ORDER BY updated_at DESC', tone: 'zinc' },
            { id: 'number', label: 'ROW_NUMBER()', detail: 'Add a tiebreaker column', tone: 'violet' },
            { id: 'keep', label: 'Keep row 1', detail: 'Filter in an outer query', tone: 'emerald' },
          ],
        },
        {
          id: 'running',
          title: 'Running total',
          steps: [
            { id: 'order', label: 'Order in partition', detail: 'For example by date within account', tone: 'zinc' },
            { id: 'frame', label: 'Frame', detail: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', tone: 'amber' },
            { id: 'aggregate', label: 'SUM() OVER', detail: 'One value per input row', tone: 'sky' },
          ],
        },
        {
          id: 'islands',
          title: 'Consecutive runs (gaps and islands)',
          steps: [
            { id: 'number', label: 'ROW_NUMBER()', detail: 'Over the ordered values', tone: 'violet' },
            { id: 'subtract', label: 'Value minus row number', detail: 'Constant within a run', tone: 'amber' },
            { id: 'group', label: 'GROUP BY the difference', detail: 'MIN and MAX give each run', tone: 'emerald' },
          ],
        },
        {
          id: 'sessions',
          title: 'Sessionization',
          steps: [
            { id: 'lag', label: 'LAG(timestamp)', detail: 'Previous event per user', tone: 'violet' },
            { id: 'flag', label: 'Flag a gap', detail: 'For example more than 30 minutes', tone: 'amber' },
            { id: 'label', label: 'Cumulative SUM(flag)', detail: 'The running count is the session id', tone: 'emerald' },
          ],
        },
      ],
    },
    sourceBookIds: ['learning-sql', 'postgresql-query-optimization', 'high-performance-mysql'],
  },
  {
    id: 'partitioning-cost',
    navLabel: 'Partitioning and cost',
    level: 'pipelines',
    title: 'Partitioning and cost: you pay for bytes read and moved',
    summary:
      'In scan-priced and cluster-priced engines, cost tracks bytes scanned and shuffled. Layout decides how many.',
    what: 'Lay out data so common queries touch few bytes, and treat cost as a design input.',
    why:
      'Analytical engines are billed, directly or through cluster time, for the data they read and move. Partitioning splits a table by a commonly filtered, low-cardinality column such as date, so the engine reads partition metadata, discards partitions the predicate rules out, and never opens those files. Columnar formats let it read only the referenced columns, and sorting or clustering within files lets zone maps skip more. A wide join or aggregation instead redistributes rows across the network by key (a shuffle), and a hot key (skew) overloads one worker. The layout has costs too: too many tiny partitions create small files and metadata overhead that slow every query. Cost therefore belongs in design reviews: estimate bytes per query and per pipeline run, tag spend to owners, and track unit cost against the value delivered.',
    how: [
      'Partition by the column most queries filter on and that yields partitions of meaningful size; cluster or sort by the next most common filter.',
      'Select only needed columns, filter early, and check the plan for the share of partitions and bytes scanned.',
      'Watch for skew and small files; compact files, salt hot keys, and track cost per query and per pipeline run with owners attached.',
    ],
    visual: {
      id: 'fig-partitioning-cost',
      kind: 'flow',
      label:
        'Three lanes. With pruning: the engine reads partition metadata, discards partitions the filter excludes, reads only needed columns of the rest, and scans few bytes. Without pruning: the filter cannot use the layout, every file is read, and many bytes are scanned. Shuffle: a wide join redistributes rows by key across the network and a hot key overloads one worker.',
      caption: 'Layout decides bytes, and bytes decide cost. Prune first, shuffle as little as possible.',
      bookIds: ['designing-data-intensive-applications', 'high-performance-spark', 'spark-definitive-guide'],
      sourceIds: ['finops-framework'],
      lanes: [
        {
          id: 'pruned',
          title: 'Layout matches the filter',
          steps: [
            { id: 'metadata', label: 'Read partition metadata', detail: 'WHERE event_date = one day', tone: 'zinc' },
            { id: 'prune', label: 'Prune partitions', detail: '1 of 365 survives', tone: 'emerald' },
            { id: 'columns', label: 'Read needed columns', detail: 'Columnar files skip the rest', tone: 'sky' },
            { id: 'cheap', label: 'Few bytes scanned', detail: 'Low cost, low latency', tone: 'emerald' },
          ],
        },
        {
          id: 'unpruned',
          title: 'Filter does not match the layout',
          steps: [
            { id: 'no-prune', label: 'No pruning possible', detail: 'Filter is on a non-partition column', tone: 'amber' },
            { id: 'all-files', label: 'Open every file', detail: 'All partitions read', tone: 'orange' },
            { id: 'expensive', label: 'Many bytes scanned', detail: 'High cost, high latency', tone: 'rose' },
          ],
        },
        {
          id: 'shuffle',
          title: 'Shuffle and skew',
          steps: [
            { id: 'wide', label: 'Wide join or group', detail: 'Rows must meet by key', tone: 'violet' },
            { id: 'redistribute', label: 'Redistribute over network', detail: 'Bytes moved cost time and money', tone: 'amber' },
            { id: 'skew', label: 'Hot key overloads a worker', detail: 'Salt the key or broadcast the small side', tone: 'rose' },
          ],
        },
      ],
    },
    sourceBookIds: ['designing-data-intensive-applications', 'high-performance-spark', 'spark-definitive-guide', 'fundamentals-of-data-engineering'],
  },
  {
    id: 'cloud-data-landscape',
    navLabel: 'Cloud data landscape',
    level: 'pipelines',
    title: 'The cloud data landscape: reason by category, then map the names',
    summary:
      'Every cloud sells the same handful of categories under different names. Map each service to the lifecycle stage it serves and the trade-off it makes.',
    what: 'Place any managed data service on the lifecycle by the job it does, then compare on a few decision axes.',
    why:
      'Vendors rename the same building blocks, so memorizing product names ages badly while the categories stay stable. Each lifecycle stage has a typical category: operational databases and SaaS APIs generate data, message buses and managed connectors ingest it, object storage and warehouses or lakehouse tables store it, SQL and distributed compute engines transform it, and BI tools, online stores, and reverse-ETL tools serve it. Identity and key management, catalogs, orchestration, and monitoring cut across all of them as the undercurrents. Comparing services then needs only a few axes: managed versus self-operated, whether storage and compute scale separately, the pricing unit (per byte scanned, per cluster hour, or per credit), egress charges for moving data out, and how open the storage format is, which sets how hard it is to leave.',
    how: [
      'For any unfamiliar service, ask which lifecycle stage it serves and which category it belongs to before reading the feature list.',
      'Compare candidates on the five axes: operations burden, storage-compute separation, pricing unit, egress cost, and format openness.',
      'Prefer open storage formats and portable interfaces where switching cost matters, and note where egress charges make moving data expensive.',
    ],
    visual: {
      id: 'fig-cloud-data-landscape',
      kind: 'flow',
      label:
        'Two lanes. Lifecycle stages with their typical service categories: generation, ingestion, storage, transformation, serving. Undercurrents that span all stages: identity and keys, catalog and lineage, orchestration, monitoring and cost.',
      caption: 'Categories are stable across vendors. Names change; the job each category does does not.',
      bookIds: ['fundamentals-of-data-engineering', 'data-management-at-scale'],
      lanes: [
        {
          id: 'stages',
          title: 'Lifecycle stage → typical service category',
          steps: [
            { id: 'generation', label: 'Generation', detail: 'Operational databases, SaaS APIs, event producers', tone: 'rose' },
            { id: 'ingestion', label: 'Ingestion', detail: 'Message bus, managed connectors, CDC', tone: 'emerald' },
            { id: 'storage', label: 'Storage', detail: 'Object storage, warehouse, lakehouse tables', tone: 'zinc' },
            { id: 'transformation', label: 'Transformation', detail: 'SQL engines, distributed compute', tone: 'violet' },
            { id: 'serving', label: 'Serving', detail: 'BI, online stores, reverse ETL', tone: 'sky' },
          ],
        },
        {
          id: 'undercurrents',
          title: 'Spanning every stage',
          steps: [
            { id: 'identity', label: 'Identity and keys', detail: 'Roles, least privilege, encryption keys', tone: 'purple' },
            { id: 'catalog', label: 'Catalog and lineage', detail: 'Discoverability and impact analysis', tone: 'blue' },
            { id: 'orchestration', label: 'Orchestration', detail: 'Schedules, dependencies, retries', tone: 'pink' },
            { id: 'monitoring', label: 'Monitoring and cost', detail: 'Freshness, failures, spend by owner', tone: 'yellow' },
          ],
        },
      ],
    },
    sourceBookIds: ['fundamentals-of-data-engineering', 'data-management-at-scale', 'seven-databases'],
  },
  {
    id: 'pipeline-cicd-iac',
    navLabel: 'CI/CD and IaC for data',
    level: 'pipelines',
    title: 'CI/CD and infrastructure as code for data pipelines',
    summary:
      'Treat pipeline code and the infrastructure under it as versioned, reviewed, and promoted artifacts, with a data diff before production.',
    what: 'Ship pipeline changes and infrastructure changes the way you ship application code, adding checks that only data work needs.',
    why:
      'Pipelines are software with a data side effect, so the discipline that makes application delivery safe applies: every change is in version control, reviewed, tested automatically, and promoted through environments by an automated process rather than by hand. Data adds one wrinkle: a deploy can be correct code and still change results, so promotion compares the new output with production on the same inputs (a data diff) and deploys must be backfill-safe, meaning a new version can re-process history without corrupting it. Infrastructure as code applies the same idea to storage, compute, permissions, and schedules: you declare the desired state in files, a plan step shows the difference from the current state, a reviewer approves it, and an apply step converges the real world to the declaration. Drift detection catches manual changes that bypass the process.',
    how: [
      'Put pipeline code, SQL, and infrastructure definitions in version control; require review and passing CI before merge.',
      'Promote through environments automatically; compare staging output with production on identical input before the final promotion.',
      'Review the infrastructure plan, not just the code, and run drift detection so out-of-band edits are found and reverted.',
    ],
    visual: {
      id: 'fig-pipeline-cicd-iac',
      kind: 'flow',
      label:
        'Two lanes. Code path: commit, CI checks, deploy to staging, data diff against production, approve, promote. Infrastructure as code: declare desired state, plan the difference, review, apply, record state and detect drift.',
      caption: 'Both paths end in a reviewed, automated change. The data diff is the step application delivery does not have.',
      bookIds: ['software-engineering-at-google', 'release-it', 'fundamentals-of-data-engineering'],
      sourceIds: ['terraform-intro', 'dora-research'],
      lanes: [
        {
          id: 'code',
          title: 'Code path',
          steps: [
            { id: 'commit', label: 'Commit', detail: 'Code and SQL in version control', tone: 'zinc' },
            { id: 'ci', label: 'CI checks', detail: 'Lint, unit, and contract tests', tone: 'emerald' },
            { id: 'staging', label: 'Deploy to staging', detail: 'Run on production-shaped data', tone: 'violet' },
            { id: 'diff', label: 'Data diff', detail: 'New output versus production', tone: 'amber' },
            { id: 'promote', label: 'Promote', detail: 'Backfill-safe release', tone: 'sky' },
          ],
        },
        {
          id: 'iac',
          title: 'Infrastructure as code',
          steps: [
            { id: 'declare', label: 'Declare desired state', detail: 'Storage, compute, permissions, schedules', tone: 'zinc' },
            { id: 'plan', label: 'Plan', detail: 'Show the diff from current state', tone: 'amber' },
            { id: 'review', label: 'Review', detail: 'A person approves the plan', tone: 'purple' },
            { id: 'apply', label: 'Apply', detail: 'Converge the real world to the code', tone: 'emerald' },
            { id: 'drift', label: 'Detect drift', detail: 'Find manual edits that bypass review', tone: 'orange' },
          ],
        },
      ],
    },
    sourceBookIds: ['software-engineering-at-google', 'release-it', 'fundamentals-of-data-engineering', 'data-pipelines-with-airflow'],
  },
  {
    id: 'de-interview-expectations',
    navLabel: 'Interview expectations',
    level: 'pipelines',
    title: 'What a data engineering interview tests, and how to structure answers',
    summary:
      'Loops typically probe SQL, coding, modeling, pipeline design, and cross-functional judgment. A repeatable structure turns design questions into trade-off discussions.',
    what: 'Answer design questions by moving from requirements to the lifecycle, trade-offs, failure modes, and operations.',
    why:
      'Interviewers are sampling for the same thing the job needs: reasoning from vague requirements to a design whose trade-offs you can defend and whose failures you have anticipated. Loops commonly combine a SQL screen, a coding exercise, a modeling or schema question, a pipeline design discussion, and a conversation about working with stakeholders. Design questions are open-ended on purpose, so structure carries the answer: clarify volume, velocity, freshness, and consumers; map the problem onto the lifecycle stages; choose a technology and state the trade-off at each; then walk through what fails and how you recover (retries, idempotency, backfill, quality checks); finish with cost and operations. Expectations scale with level: implementing well-specified work reliably, then owning a design with its trade-offs and failure modes, then setting contracts and platform direction across teams.',
    how: [
      'Open every design question by confirming requirements: data volume, arrival pattern, freshness target, consumers, and constraints.',
      'Walk the lifecycle left to right, naming the decision and the alternative you rejected at each stage, then cover the undercurrents that apply (security, quality, orchestration).',
      'Close with failure modes and recovery, cost, and monitoring, and explain how you would communicate changes to each stakeholder group.',
    ],
    visual: {
      id: 'fig-de-interview-expectations',
      kind: 'flow',
      label:
        'Two lanes. A repeatable design-answer structure: clarify requirements, map to the lifecycle, choose and justify per stage, cover failure modes, cover cost and operations. Typical loop areas: SQL, coding, data modeling, pipeline design, cross-functional communication.',
      caption: 'Structure is the part of the answer you control. Practice it until the order is automatic.',
      bookIds: ['fundamentals-of-data-engineering', 'designing-data-intensive-applications'],
      lanes: [
        {
          id: 'answer',
          title: 'Structure of a design answer',
          steps: [
            { id: 'clarify', label: 'Clarify', detail: 'Volume, velocity, freshness, consumers', tone: 'rose' },
            { id: 'map', label: 'Map to the lifecycle', detail: 'Generation through serving', tone: 'emerald' },
            { id: 'choose', label: 'Choose and justify', detail: 'State the trade-off at each stage', tone: 'violet' },
            { id: 'failure', label: 'Failure modes', detail: 'Retries, idempotency, backfill, quality', tone: 'amber' },
            { id: 'operate', label: 'Cost and operations', detail: 'Monitoring, SLAs, spend', tone: 'sky' },
          ],
        },
        {
          id: 'loop',
          title: 'Typical loop areas',
          steps: [
            { id: 'sql', label: 'SQL', detail: 'Window functions, joins, tuning', tone: 'blue' },
            { id: 'coding', label: 'Coding', detail: 'Data structures and transforms', tone: 'zinc' },
            { id: 'modeling', label: 'Data modeling', detail: 'Grain, facts, dimensions, history', tone: 'teal' },
            { id: 'design', label: 'Pipeline design', detail: 'The structure above', tone: 'violet' },
            { id: 'communication', label: 'Cross-functional', detail: 'Contracts, incidents, stakeholders', tone: 'pink' },
          ],
        },
      ],
    },
    sourceBookIds: ['fundamentals-of-data-engineering', 'designing-data-intensive-applications', 'data-warehouse-toolkit'],
  },
];
