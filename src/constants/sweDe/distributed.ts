/**
 * Distributed-level thinking: partitioning, replication, consensus, delivery
 * semantics, reusable patterns, and why Kubernetes and Airflow became the
 * industry-standard control planes, argued from their algorithms first and
 * their ecosystems second.
 */

import type { FirstPrinciplesTopic } from './types';

export const DISTRIBUTED_TOPICS: FirstPrinciplesTopic[] = [
  {
    id: 'partitioning-replication',
    navLabel: 'Partitioning + replication',
    level: 'distributed',
    title: 'Partitioning and replication',
    summary: 'Partition to scale beyond one machine; replicate to survive one. Each brings its own failure mode.',
    what: 'Spread data and work across machines without losing it or serializing on it.',
    why:
      'One machine caps throughput and storage and is a single point of failure. Partitioning (sharding) splits data by key so work scales out, but a hot key or a bad partition function concentrates load on one node (skew). Replication keeps copies for availability and read scaling, but copies must agree. Single-leader replication is simple but makes the leader a bottleneck. Multi-leader and leaderless replication accept writes anywhere at the cost of conflict resolution.',
    how: [
      'Partition by a high-cardinality key that matches the dominant access pattern: hash partitioning for even spread, range partitioning for ordered scans.',
      'Choose a replication scheme by write locality and conflict tolerance; use quorums (W + R > N) when leaderless.',
      'Treat rebalancing as a design concern — consistent hashing or many fixed partitions per node keeps data movement small when nodes join.',
    ],
    visual: {
      id: 'fig-partitioned-write-path',
      kind: 'flow',
      label:
        'Two lanes. Write path: the key goes to a partition function, which picks a shard; the shard leader accepts the write, replicates it to followers, and acknowledges once the replication policy is satisfied. Partition function choice: hash partitioning spreads keys evenly but loses key order, while range partitioning keeps key order for scans but risks hot ranges.',
      caption: 'The partition function decides which shard owns a key; replication decides how many copies must agree before the write is acknowledged.',
      bookIds: ['designing-data-intensive-applications', 'think-distributed-systems'],
      lanes: [
        {
          id: 'write-path',
          title: 'Write path (single-leader shard)',
          steps: [
            { id: 'key', label: 'Key', detail: 'The record key from the client', tone: 'rose' },
            { id: 'partitioner', label: 'Partition function', detail: 'Maps the key to one shard', tone: 'violet' },
            { id: 'leader', label: 'Shard leader', detail: 'Accepts the write for that shard', tone: 'sky' },
            { id: 'replicate', label: 'Replicate', detail: 'Send the write to the followers', tone: 'amber' },
            { id: 'ack', label: 'Acknowledge', detail: 'Reply once the replication policy is met', tone: 'emerald' },
          ],
        },
        {
          id: 'partition-choice',
          title: 'Choosing the partition function',
          steps: [
            { id: 'access-pattern', label: 'Dominant access pattern', detail: 'Point lookups or ordered scans?', tone: 'rose' },
            { id: 'hash', label: 'Hash', detail: 'Even spread; key order is lost', tone: 'violet' },
            { id: 'range', label: 'Range', detail: 'Ordered scans; hot ranges risk skew', tone: 'sky' },
            { id: 'rebalance', label: 'Rebalance', detail: 'Consistent hashing or many fixed partitions keep data movement small', tone: 'teal' },
          ],
        },
      ],
    },
    sourceBookIds: ['designing-data-intensive-applications', 'think-distributed-systems'],
  },
  {
    id: 'consensus-consistency',
    navLabel: 'Consensus + CAP',
    level: 'distributed',
    title: 'Consensus, CAP, and PACELC',
    summary: 'Agreement needs a majority. Under a partition you trade availability for consistency, and without one, latency for it.',
    what: 'Decide which parts of the system must agree, and what each agreement costs.',
    why:
      'Raft and Paxos let a cluster agree on an ordered log as long as a majority of nodes are up; every committed write waits on a majority round trip. CAP says that during a network partition you must choose between consistency and availability. PACELC adds that even with no partition you trade latency for consistency. Because consensus is expensive, well-designed systems use it only for small, critical state — metadata, leadership, configuration — and keep bulk data on cheaper replication.',
    how: [
      'Put coordination state in a consensus store (etcd, ZooKeeper, or KRaft in Kafka); keep bulk data out of it.',
      'Run clusters of 3 or 5 voters so they tolerate 1 or 2 failures; even counts add cost without adding fault tolerance.',
      'State each data path\'s consistency requirement explicitly (linearizable, read-your-writes, eventual) instead of inheriting a default.',
    ],
    visual: {
      id: 'fig-majority-quorum-and-election',
      kind: 'flow',
      label:
        'Three lanes. Majority write: the leader proposes an entry, replicas acknowledge, and the entry commits once a majority has acknowledged. Leader election: followers time out when the leader fails, a candidate requests votes, a majority of votes elects a new leader. Partition choice: during a network partition, a system either stays consistent by refusing writes on the minority side or stays available by accepting writes that may diverge.',
      caption: 'A majority is the common currency: it commits writes, elects leaders, and decides which side of a partition may keep going.',
      bookIds: ['database-internals', 'designing-data-intensive-applications', 'think-distributed-systems'],
      lanes: [
        {
          id: 'quorum-write',
          title: 'Majority write',
          steps: [
            { id: 'propose', label: 'Leader proposes', detail: 'Append the entry to its log and send it to replicas', tone: 'sky' },
            { id: 'replica-ack', label: 'Replicas acknowledge', detail: 'Each replica persists the entry and replies', tone: 'amber' },
            { id: 'commit', label: 'Commit on majority', detail: 'A majority of acknowledgements makes the entry committed', tone: 'emerald' },
          ],
        },
        {
          id: 'election',
          title: 'Leader election after failure',
          steps: [
            { id: 'timeout', label: 'Election timeout', detail: 'A follower stops hearing from the leader', tone: 'rose' },
            { id: 'candidate', label: 'Candidate requests votes', detail: 'It starts a new term and asks the other nodes', tone: 'violet' },
            { id: 'majority-votes', label: 'Majority votes', detail: 'Each node grants at most one vote per term', tone: 'amber' },
            { id: 'new-leader', label: 'New leader', detail: 'It resumes serving writes', tone: 'emerald' },
          ],
        },
        {
          id: 'partition-choice',
          title: 'Under a network partition (CAP)',
          steps: [
            { id: 'partition', label: 'Partition', detail: 'Nodes cannot reach each other', tone: 'rose' },
            { id: 'choose-consistency', label: 'Consistency', detail: 'The minority side refuses writes, giving up availability', tone: 'sky' },
            { id: 'choose-availability', label: 'Availability', detail: 'Both sides keep accepting writes, giving up consistency', tone: 'yellow' },
          ],
        },
      ],
    },
    sourceBookIds: ['database-internals', 'designing-data-intensive-applications', 'think-distributed-systems'],
  },
  {
    id: 'delivery-semantics',
    navLabel: 'Delivery semantics',
    level: 'distributed',
    title: 'Delivery semantics, idempotency, and event time',
    summary: 'Exactly-once is achieved by making retries harmless. Correct results come from event time, not arrival time.',
    what: 'Produce correct results despite retries, duplicates, and late data.',
    why:
      'Networks cannot distinguish a lost message from a slow one, so senders retry and receivers see duplicates. At-least-once delivery plus idempotent or transactional processing gives "effectively-once" results. Separately, events arrive out of order, so grouping by arrival (processing) time gives wrong answers. Windowing by event time, with watermarks that estimate when a window is complete, gives answers that match reality.',
    how: [
      'Make every write idempotent: deterministic keys, upserts or MERGE, and deduplication on a stable event id.',
      'Use the transactional outbox pattern to publish events atomically with a database write.',
      'Window streaming aggregates by event time with an explicit watermark and an allowed-lateness policy.',
    ],
    visual: {
      id: 'fig-event-time-watermark',
      kind: 'event-time',
      label:
        'Event time against processing time, in minutes. A window covers event times up to minute 10 and the watermark passes it at processing minute 12. Most events arrive a minute or two after they happen and fall inside the window. One event that happened at minute 7 is processed at minute 15, after the watermark, so it is late. Two events that happened after minute 10 belong to a later window.',
      caption: 'Grouping by event time puts each event in the window where it happened; the watermark estimates when that window is complete, and late arrivals need an explicit policy.',
      sourceIds: ['flink-time'],
      bookIds: ['streaming-systems'],
      windowEnd: 10,
      watermarkPassesAt: 12,
      axisMax: 20,
      events: [
        { id: 'e1', eventTime: 3, processingTime: 4 },
        { id: 'e2', eventTime: 5, processingTime: 6 },
        { id: 'e3', eventTime: 8, processingTime: 10 },
        { id: 'e4', eventTime: 9, processingTime: 11 },
        { id: 'late', eventTime: 7, processingTime: 15 },
        { id: 'next-1', eventTime: 13, processingTime: 14 },
        { id: 'next-2', eventTime: 15, processingTime: 17 },
      ],
    },
    sourceBookIds: ['streaming-systems', 'kafka-definitive-guide', 'building-event-driven-microservices', 'building-resilient-distributed-systems'],
  },
  {
    id: 'distributed-patterns',
    navLabel: 'Patterns',
    level: 'distributed',
    title: 'Reusable patterns: containers, events, and resilience',
    summary: 'Named patterns turn failure-handling decisions into building blocks you can reuse and reason about.',
    what: 'Compose services from known-good patterns instead of inventing coordination each time.',
    why:
      'The same problems recur: adding cross-cutting behavior without touching app code, fanning work out and gathering results, electing one worker, keeping services in sync without distributed transactions, and failing gracefully. Named patterns carry tested answers to these, together with their known trade-offs.',
    how: [
      'Use container patterns (sidecar, ambassador, adapter) for cross-cutting concerns such as proxies, log shipping, and metrics adaptation.',
      'Use serving patterns (sharded services, scatter/gather) to scale reads and fan-out queries.',
      'Use event patterns (event sourcing, CQRS, outbox) to keep services consistent through a shared log rather than shared databases.',
      'Use resilience patterns (timeouts, retries with backoff and jitter, circuit breakers, bulkheads) so one failure does not cascade.',
    ],
    visual: {
      id: 'fig-pattern-mechanisms',
      kind: 'flow',
      label:
        'Four lanes, one per pattern. Scatter/gather: a query fans out to shards and the results are merged, so the slowest shard sets the latency. Work queue: producers enqueue work and a scalable worker pool consumes it, with poison messages and redelivery to handle. Leader election: candidates contend for a lease in a consensus store and exactly one becomes the active coordinator. Transactional outbox: the business write and the event are written in one database transaction, then a relay publishes the event to the log and consumers deduplicate.',
      caption: 'Four patterns drawn as their mechanisms; each trade-off lives at one step of its lane.',
      bookIds: ['designing-distributed-systems', 'building-event-driven-microservices'],
      lanes: [
        {
          id: 'scatter-gather',
          title: 'Scatter/gather',
          steps: [
            { id: 'query', label: 'Query', detail: 'Too large for one node', tone: 'rose' },
            { id: 'fan-out', label: 'Fan out to shards', detail: 'Each shard works on its slice', tone: 'sky' },
            { id: 'merge', label: 'Merge results', detail: 'Tail latency is set by the slowest shard', tone: 'amber' },
          ],
        },
        {
          id: 'work-queue',
          title: 'Work queue',
          steps: [
            { id: 'enqueue', label: 'Enqueue work', detail: 'Bursty batch work lands in the queue', tone: 'rose' },
            { id: 'workers', label: 'Worker pool', detail: 'Scales with queue depth', tone: 'sky' },
            { id: 'redelivery', label: 'Redelivery', detail: 'Handle poison messages and retries', tone: 'amber' },
          ],
        },
        {
          id: 'leader-election',
          title: 'Leader election',
          steps: [
            { id: 'contend', label: 'Contend for a lease', detail: 'Candidates write to a consensus store', tone: 'violet' },
            { id: 'active', label: 'One active coordinator', detail: 'Exactly one holder at a time', tone: 'emerald' },
            { id: 'failover', label: 'Failover gap', detail: 'Misused leases risk split-brain', tone: 'rose' },
          ],
        },
        {
          id: 'outbox',
          title: 'Transactional outbox',
          steps: [
            { id: 'txn', label: 'Write row and event', detail: 'Same database transaction', tone: 'sky' },
            { id: 'relay', label: 'Relay to the log', detail: 'Publishes from the outbox table', tone: 'violet' },
            { id: 'dedupe', label: 'Consumers deduplicate', detail: 'Relay lag and repeats are expected', tone: 'amber' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'Distributed patterns and the problem each solves',
      rowHeader: 'Pattern',
      columns: ['Problem', 'Mechanism', 'Trade-off'],
      rows: [
        { id: 'sidecar', label: 'Sidecar', cells: ['Add behavior without changing the app', 'Co-located container sharing network and volumes', 'Extra resource use and a lifecycle to manage per pod'] },
        { id: 'ambassador', label: 'Ambassador', cells: ['Hide remote-service complexity', 'Local proxy handling sharding, retries, and discovery', 'One more hop and one more component'] },
        { id: 'adapter', label: 'Adapter', cells: ['Heterogeneous apps, uniform interface', 'Container translating logs and metrics to a standard', 'Translation can lose fidelity'] },
        { id: 'scatter-gather', label: 'Scatter/gather', cells: ['Query too large for one node', 'Fan out to shards, merge results', 'Tail latency is set by the slowest shard'] },
        { id: 'work-queue', label: 'Work queue', cells: ['Bursty batch work', 'Queue plus a scalable worker pool', 'Must handle poison messages and redelivery'] },
        { id: 'leader-election', label: 'Leader election', cells: ['Exactly one active coordinator', 'Lease in a consensus store', 'Failover gap; split-brain if leases are misused'] },
        { id: 'event-sourcing', label: 'Event sourcing + CQRS', cells: ['Audit trail and multiple read models', 'Append-only events; projections per query need', 'Eventual consistency between write and read sides'] },
        { id: 'outbox', label: 'Transactional outbox', cells: ['Dual write to a database and a broker', 'Write the event to an outbox table in the same transaction; relay it to the log', 'Relay lag; consumers must deduplicate'] },
        { id: 'circuit-breaker', label: 'Circuit breaker + bulkhead', cells: ['Cascading failure', 'Fail fast after repeated errors; isolate resource pools', 'Tuning thresholds; degraded responses'] },
      ],
    },
    sourceBookIds: [
      'designing-distributed-systems',
      'building-event-driven-microservices',
      'release-it',
      'building-resilient-distributed-systems',
      'building-distributed-applications-that-work',
    ],
  },
  {
    id: 'kubernetes',
    navLabel: 'Kubernetes',
    level: 'distributed',
    title: 'Why Kubernetes is the compute standard',
    summary:
      'A consistent store, level-triggered reconciliation loops, and an extensible API turn "run this" into a self-healing control system.',
    what: 'Run heterogeneous workloads (services, batch jobs, Spark executors, Airflow tasks) on shared machines and keep them running.',
    why:
      'Kubernetes is a control system. You declare desired state; it is stored in etcd, which replicates it with Raft. Independent controllers each run a loop: observe actual state, compare it to desired state, act to close the gap. The loops are level-triggered — they react to the current state rather than to individual events — so a missed event or a crashed controller heals on the next pass. The scheduler treats placement as bin-packing, which is NP-hard in general. It solves it greedily: first filter out nodes that cannot fit the pod, then score the rest. The deciding property is extensibility: custom resources and operators let any system (the Spark operator, Strimzi for Kafka, Airflow\'s KubernetesExecutor) plug its domain logic into the same reconciliation model.',
    how: [
      'Express every workload declaratively and let controllers converge it — never script imperative fix-ups.',
      'Set resource requests and limits honestly; the scheduler can only bin-pack what it is told.',
      'Use operators for stateful data systems rather than hand-managed StatefulSets.',
      'Honest caveat: Kubernetes also won on ecosystem — CNCF governance, managed offerings on every cloud, and the tooling built around them. For a single small service, a managed container platform may be the better answer.',
    ],
    visual: {
      id: 'fig-reconcile-and-scheduling',
      kind: 'flow',
      label:
        'Two lanes. Reconcile loop: desired state is stored in the API server, a controller observes actual state, computes the difference, acts to close the gap, and repeats. Scheduling: the scheduler filters out nodes that cannot fit the pod, scores the remaining nodes, and binds the pod to the best one.',
      caption: 'Controllers converge on the current state rather than reacting to events, and the scheduler solves placement greedily with filter then score.',
      bookIds: ['kubernetes-up-and-running', 'kubernetes-patterns'],
      lanes: [
        {
          id: 'reconcile',
          title: 'Level-triggered reconcile loop',
          steps: [
            { id: 'desired', label: 'Desired state', detail: 'Declared and stored in the API server', tone: 'sky' },
            { id: 'observe', label: 'Observe actual state', detail: 'The controller reads what exists now', tone: 'violet' },
            { id: 'diff', label: 'Compute the diff', detail: 'Desired minus actual', tone: 'amber' },
            { id: 'act', label: 'Act', detail: 'Create, update, or delete to close the gap', tone: 'emerald' },
            { id: 'repeat', label: 'Repeat', detail: 'A missed event heals on the next pass', tone: 'zinc' },
          ],
        },
        {
          id: 'scheduling',
          title: 'Scheduling a pod',
          steps: [
            { id: 'filter', label: 'Filter nodes', detail: 'Drop nodes that cannot fit the pod', tone: 'rose' },
            { id: 'score', label: 'Score the rest', detail: 'Rank the feasible nodes', tone: 'amber' },
            { id: 'bind', label: 'Bind', detail: 'Assign the pod to the best node', tone: 'emerald' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'Kubernetes against the alternatives, by scheduling model',
      rowHeader: 'Orchestrator',
      columns: ['Scheduling and state model', 'Strength', 'Why it is not the default'],
      rows: [
        { id: 'kubernetes', label: 'Kubernetes', cells: ['Shared-state, Raft-backed etcd; level-triggered controllers; filter-then-score scheduler', 'Self-healing, extensible API (CRDs and operators), portable across clouds', 'Operational complexity for small deployments'] },
        { id: 'nomad', label: 'HashiCorp Nomad', cells: ['Optimistic shared-state scheduling; Raft servers; bin-packing', 'Simpler single binary; runs non-container workloads', 'Smaller ecosystem; fewer data-platform operators'] },
        { id: 'mesos', label: 'Apache Mesos', cells: ['Two-level scheduling: the master offers resources and frameworks accept them', 'Very large clusters; framework autonomy', 'Frameworks cannot see global state, so placement is harder; largely retired from new deployments'] },
        { id: 'swarm', label: 'Docker Swarm', cells: ['Raft managers; service-level scheduling', 'Easiest to start with', 'Limited extensibility and ecosystem'] },
        { id: 'ecs', label: 'AWS ECS', cells: ['Managed control plane; task placement strategies', 'No control plane to run; deep AWS integration', 'Single-cloud; no CRD/operator model'] },
      ],
    },
    sourceBookIds: ['kubernetes-up-and-running', 'kubernetes-patterns', 'designing-distributed-systems'],
  },
  {
    id: 'airflow',
    navLabel: 'Airflow',
    level: 'distributed',
    title: 'Why Airflow is the workflow standard',
    summary:
      'DAGs as code, scheduled over data intervals, make every run idempotent, retryable, and backfillable.',
    what: 'Run dependent batch steps in the right order, on schedule, and recover from failure without manual repair.',
    why:
      'A pipeline is a directed acyclic graph of tasks; a topological sort gives a valid execution order, and tasks whose dependencies are met can run in parallel. Airflow\'s key idea is to schedule over data intervals: each DAG run owns a time slice (its logical date), and each task processes exactly that slice. A task that overwrites only its own interval is idempotent, which makes retries, reruns, and historical backfills safe. The scheduler is a loop much like a Kubernetes controller — it compares due intervals and task states to what should exist and creates or queues the gap. Executors decouple that decision from where the work runs (Celery workers, or one Kubernetes pod per task).',
    how: [
      'Write tasks as pure functions of their data interval: read the interval\'s input and overwrite the interval\'s output partition.',
      'Keep heavy compute out of the scheduler; Airflow orchestrates Spark, SQL, and Kubernetes jobs rather than doing the work itself.',
      'Use asset- or dataset-aware scheduling (Airflow 2.4+, expanded in Airflow 3) when data arrival, not the clock, should trigger a run.',
      'Honest caveat: Airflow\'s standing is as much ecosystem as algorithm — the earliest mature Python DAG-as-code tool, Apache governance, hundreds of provider integrations, and managed offerings (MWAA, Cloud Composer, Astronomer).',
    ],
    visual: {
      id: 'fig-airflow-architecture-lifecycle',
      kind: 'flow',
      label:
        'Two lanes. Architecture: DAG definitions are read by the scheduler, which creates runs and queues tasks through an executor onto workers, while the scheduler, executor, and workers record state in a metadata database. Task instance lifecycle: a task is scheduled, queued, running, then ends as success, or as failed; a failed task with retries left goes to up for retry and is queued again.',
      caption: 'The scheduler compares due intervals and task states to what should exist, and executors decide where the work runs.',
      sourceIds: ['airflow-dag-runs'],
      bookIds: ['data-pipelines-with-airflow', 'data-pipelines-pocket-reference'],
      lanes: [
        {
          id: 'architecture',
          title: 'Architecture',
          steps: [
            { id: 'dag', label: 'DAG definition', detail: 'Tasks and dependencies, written as code', tone: 'violet' },
            { id: 'scheduler', label: 'Scheduler', detail: 'Creates runs for due data intervals and queues ready tasks', tone: 'sky' },
            { id: 'executor', label: 'Executor', detail: 'Decides where each task runs', tone: 'amber' },
            { id: 'workers', label: 'Workers', detail: 'Celery workers or one Kubernetes pod per task', tone: 'emerald' },
            { id: 'metadata', label: 'Metadata database', detail: 'Holds run and task state for all components', tone: 'zinc' },
          ],
        },
        {
          id: 'task-lifecycle',
          title: 'Task instance lifecycle',
          steps: [
            { id: 'scheduled', label: 'Scheduled', detail: 'Dependencies are met', tone: 'zinc' },
            { id: 'queued', label: 'Queued', detail: 'Handed to the executor', tone: 'amber' },
            { id: 'running', label: 'Running', detail: 'A worker executes the task', tone: 'sky' },
            { id: 'success', label: 'Success', detail: 'Downstream tasks may start', tone: 'emerald' },
            { id: 'failed', label: 'Failed or up for retry', detail: 'Retries left: back to queued; none left: failed', tone: 'rose' },
          ],
        },
      ],
    },
    comparison: {
      caption: 'Airflow against the alternatives, by orchestration model',
      rowHeader: 'Orchestrator',
      columns: ['Core model', 'Strength', 'When to choose it instead'],
      rows: [
        { id: 'airflow', label: 'Apache Airflow', cells: ['Task DAGs scheduled over data intervals; pluggable executors', 'Backfills, retries, a huge provider ecosystem, managed offerings', 'Default for scheduled batch orchestration'] },
        { id: 'cron', label: 'cron', cells: ['Time trigger per command', 'Zero infrastructure', 'Single independent jobs with no dependencies or history'] },
        { id: 'luigi', label: 'Luigi', cells: ['Target-based: a task runs if its output is missing', 'Simple, file-oriented idempotency', 'Small pipelines; it has no built-in scheduler'] },
        { id: 'oozie', label: 'Apache Oozie', cells: ['XML workflows on Hadoop', 'Native Hadoop integration', 'Legacy Hadoop estates only'] },
        { id: 'dagster', label: 'Dagster', cells: ['Software-defined assets: model the data, derive the tasks', 'Lineage, typing, and testing are first class', 'Asset-centric teams that want lineage-driven orchestration'] },
        { id: 'prefect', label: 'Prefect', cells: ['Dynamic Python flows built at runtime', 'Pythonic, dynamic branching, light setup', 'Highly dynamic workflows with no fixed DAG shape'] },
        { id: 'argo', label: 'Argo Workflows', cells: ['Kubernetes CRD; each step is a container', 'Kubernetes-native, language-agnostic, scales with the cluster', 'Kubernetes-first platforms, ML and CI pipelines'] },
        { id: 'temporal', label: 'Temporal', cells: ['Durable execution: workflow code replayed from an event history', 'Long-running, stateful application workflows with exactly-once semantics', 'Business and microservice workflows rather than scheduled data intervals'] },
      ],
    },
    sourceBookIds: ['data-pipelines-with-airflow', 'data-pipelines-pocket-reference', 'fundamentals-of-data-engineering', 'kubernetes-patterns'],
  },
];
