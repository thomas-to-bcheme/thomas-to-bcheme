/**
 * data-engineering glossary terms.
 *
 * Ledger populated in Phase 1 (slug/term/category/voiceTemplate only).
 * `definition` fields are filled in Phase 2 by an isolated content subagent
 * — see plan §7. Source lineage: scratchpad/glossary-sources/data.txt,
 * extracted from public/excalidraw/data.excalidraw @ 04b1d4e649058ecea338cc0d50e91b66adb4fa5d.
 */

import type { GlossaryTerm } from './types';

export const GLOSSARY_TERMS_DATA_ENGINEERING: GlossaryTerm[] = [
  { slug: 'etl-vs-elt', term: 'ETL vs. ELT', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'batch-vs-stream-processing', term: 'Batch vs. Stream Processing', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'idempotent-pipeline-design', term: 'Idempotent Pipeline Design', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'delivery-semantics', term: 'Delivery Semantics', category: 'data-engineering', voiceTemplate: 'constraint', definition: '' },
  { slug: 'schema-evolution', term: 'Schema Evolution', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'data-validation-ingestion', term: 'Data Validation at Ingestion', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'dag-orchestration', term: 'DAG Orchestration', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'backfill', term: 'Backfill', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'data-aware-dependency', term: 'Data-Aware Dependency', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'star-schema', term: 'Star Schema', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'slowly-changing-dimension', term: 'Slowly Changing Dimension (SCD)', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'data-partitioning', term: 'Data Partitioning', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'columnar-storage-format', term: 'Columnar Storage Format', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'denormalization', term: 'Denormalization', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'data-lake', term: 'Data Lake', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'data-warehouse', term: 'Data Warehouse', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'data-lakehouse', term: 'Data Lakehouse', category: 'data-engineering', voiceTemplate: 'structure', definition: '', relatedSlugs: ['data-lake', 'data-warehouse'] },
  { slug: 'change-data-capture', term: 'Change Data Capture (CDC)', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'data-lineage', term: 'Data Lineage', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'data-mesh', term: 'Data Mesh', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
  { slug: 'small-files-problem', term: 'Small Files Problem', category: 'data-engineering', voiceTemplate: 'constraint', definition: '' },
  { slug: 'dead-letter-queue', term: 'Dead-Letter Queue', category: 'data-engineering', voiceTemplate: 'mechanism', definition: '' },
  { slug: 'oltp-vs-olap', term: 'OLTP vs. OLAP', category: 'data-engineering', voiceTemplate: 'structure', definition: '' },
];
