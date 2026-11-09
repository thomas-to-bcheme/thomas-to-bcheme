import type { ModuleContent } from '../types';

/**
 * Prose and the ADR template for Module 7. The decision table and the ecosystem
 * matrix render from ADR_CHOICES and LANGUAGE_ECOSYSTEMS, not from this file.
 */
export const ARCHITECTURE_CONTENT: ModuleContent = {
  sections: [
    {
      id: 'adr',
      navLabel: 'ADR framework',
      title: 'Recording a language decision',
      body: [
        'An Architecture Decision Record (ADR) is a short document that captures one decision, the options considered, and the consequences, so a later team can see why the system looks as it does. Weigh each candidate language against the workload: latency target, throughput, memory-safety requirements, team skills, hiring, and library support.',
      ],
      snippets: [
        {
          language: 'Markdown',
          caption: 'An ADR template.',
          code: `# ADR-NNN: <decision title>

Status: proposed | accepted | superseded by ADR-NNN
Date: YYYY-MM-DD

## Context
The workload, constraints, and forces (latency, scale, safety, team).

## Options considered
1. <Language/stack A> - strengths, costs
2. <Language/stack B> - strengths, costs

## Decision
We will use <option> because <reason tied to a constraint>.

## Consequences
Positive, negative, and what we will revisit (and the trigger for revisiting).`,
        },
      ],
    },
    {
      id: 'choices',
      navLabel: 'Which language',
      title: 'Matching workloads to languages',
      body: [
        'The table below maps four common workloads to the languages that usually fit, with the reasoning and the condition under which to look elsewhere.',
      ],
    },
    {
      id: 'ecosystem',
      navLabel: 'Ecosystem matrix',
      title: 'Ecosystem reference matrix',
      body: [
        'For each language: where its authoritative documentation lives, the standard-library APIs to learn first, and the production libraries an architect is likely to meet. Treat the library lists as a map of the ecosystem, and check current versions and maintenance status before adopting any of them.',
      ],
    },
  ],
  checkpoint: [
    'Choose a language from the workload’s constraints (latency, scale, safety, team), not from preference, and record the choice in an ADR.',
    'Spark and SQL for data volume, Go and Kotlin for resilient services, Rust and C++ for latency and safety-critical kernels, Python and TypeScript for orchestration and interfaces.',
    'A mixed stack is normal: put each language where its strengths dominate, and make the boundaries (FFI or network) explicit.',
  ],
};
