/**
 * The thinking levels (hardware → application → distributed → pipelines) and the
 * /swe-de route each one owns. Plain data with no registry import, so
 * src/constants/site.ts can derive the SWE/DE nav group from it.
 */

import type { LevelPageMeta, ThinkingLevel } from './types';

export const SWE_DE_BASE_PATH = '/swe-de';

const levelHref = (id: ThinkingLevel) => `${SWE_DE_BASE_PATH}/${id}`;

export const SWE_DE_LEVELS: LevelPageMeta[] = [
  {
    id: 'hardware',
    href: levelHref('hardware'),
    navLabel: 'Hardware',
    eyebrow: 'Level 1 · Hardware',
    title: 'Start from the silicon,',
    titleAccent: 'not the framework',
    lede: 'Every data-engineering cost traces back to how a CPU moves bytes. This level explains why data engineering is a CPU- and memory-bound discipline rather than a GPU, TPU, or NPU one, why the memory hierarchy decides which algorithms win, and how columnar layout and runtime choice follow from it.',
    summary: 'Why data engineering is CPU- and memory-bound, the memory hierarchy, columnar and vectorized execution, and language runtime costs.',
  },
  {
    id: 'application',
    href: levelHref('application'),
    navLabel: 'Application',
    eyebrow: 'Level 2 · Application',
    title: 'Every engine picks a corner',
    titleAccent: 'of the same triangle',
    lede: 'SQL engines and Spark run the same small set of mechanisms: a storage engine that trades read, write, and space costs, index lookups that trade random for sequential I/O, and join algorithms that trade memory for passes over the data. This level argues each one from first principles, then maps it to SQL and Spark, from basics to high performance.',
    summary: 'The RUM conjecture, B-tree vs LSM-tree and other storage engines, index lookups, join algorithms, and Spark execution.',
  },
  {
    id: 'distributed',
    href: levelHref('distributed'),
    navLabel: 'Distributed',
    eyebrow: 'Level 3 · Distributed',
    title: 'From one machine',
    titleAccent: 'to a control plane',
    lede: 'Distribution buys scale and survival, and pays for them in partial failure and coordination. This level covers partitioning, replication, consensus, delivery semantics, and reusable patterns, then argues from their algorithms why Kubernetes and Airflow became the standard control planes for compute and workflows.',
    summary: 'Partitioning, replication, consensus, delivery semantics, distributed patterns, and why Kubernetes and Airflow are the standards.',
  },
  {
    id: 'pipelines',
    href: levelHref('pipelines'),
    navLabel: 'Pipelines',
    eyebrow: 'Level 4 · Pipelines',
    title: 'Design the pipeline',
    titleAccent: 'from source to consumer',
    lede: 'The first three levels explain the machinery. This level applies it to the decisions a data engineer actually makes: where to transform, when to run, how to retry safely, how to model, store, capture, test, and ship. Each topic argues one decision from first principles and draws the mechanism, then ends with how an interviewer is likely to probe it.',
    summary: 'ETL vs ELT, batch vs streaming, idempotent loads, orchestration, modeling, lakehouse tables, CDC, quality, testing, SQL patterns, cost, and interview structure.',
  },
];

/** Takes a raw route segment, so the [level] page can look it up before narrowing. */
export function getLevelById(id: string): LevelPageMeta | null {
  return SWE_DE_LEVELS.find((level) => level.id === id) ?? null;
}
