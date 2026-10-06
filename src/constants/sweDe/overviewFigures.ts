/**
 * Figures that belong to the /swe-de overview rather than to one topic: how the
 * four levels build on each other, and who a data engineer works with. Same
 * FigureSpec contract as topic figures, checked by scripts/verifySweDe.ts.
 */

import type { LifecycleTone } from '../systemDesignPrep/foundations/types';
import type { FigureSpec, FlowFigureSpec, FlowStep } from './types';
import { SWE_DE_LEVELS } from './levels';

/** One tone per level, in level order; derived steps fall back to zinc if a level is added without one. */
const LEVEL_TONES: Record<string, LifecycleTone> = {
  hardware: 'emerald',
  application: 'sky',
  distributed: 'violet',
  pipelines: 'amber',
};
const FALLBACK_LEVEL_TONE: LifecycleTone = 'zinc';

const levelSteps: FlowStep[] = SWE_DE_LEVELS.map((level) => ({
  id: level.id,
  label: level.navLabel,
  detail: `${level.title} ${level.titleAccent}`,
  tone: LEVEL_TONES[level.id] ?? FALLBACK_LEVEL_TONE,
}));

/** Steps are derived from SWE_DE_LEVELS, so a new level appears here without editing this file's content. */
export const LEVELS_STACK_FIGURE: FlowFigureSpec = {
  id: 'fig-levels-stack',
  kind: 'flow',
  label:
    'The four levels in the order they build on each other: hardware, application, distributed, pipelines. Each level explains the machinery the next one relies on.',
  caption: 'Each level rests on the one before it. Read the Pipelines level first if an interview is close, then fill in the machinery underneath.',
  lanes: [{ id: 'levels', title: 'Dependency order', steps: levelSteps }],
};

export const ROLE_MAP_FIGURE: FlowFigureSpec = {
  id: 'fig-role-map',
  kind: 'flow',
  label:
    'Three lanes. Data flow: source owners, then the data engineer who ingests, stores, transforms, and serves, then consumers in analytics, machine learning, and reverse ETL. What changes hands: data contract, freshness agreement, dataset documentation, access request. Partner roles: security, governance, architecture, and platform reliability.',
  caption: 'The data engineer sits between producers and consumers and trades written agreements with both, while partner roles own the cross-cutting concerns.',
  bookIds: ['fundamentals-of-data-engineering', 'data-mesh'],
  lanes: [
    {
      id: 'flow',
      title: 'Who data moves between',
      steps: [
        { id: 'sources', label: 'Source owners', detail: 'Application teams, vendors, device fleets', tone: 'rose' },
        { id: 'data-engineer', label: 'Data engineer', detail: 'Ingest, store, transform, serve', tone: 'emerald' },
        { id: 'consumers', label: 'Consumers', detail: 'Analytics, machine learning, reverse ETL', tone: 'amber' },
      ],
    },
    {
      id: 'handoffs',
      title: 'What changes hands',
          isUnordered: true,
      steps: [
        { id: 'contract', label: 'Data contract', detail: 'Producer and engineer agree schema and change notice', tone: 'purple' },
        { id: 'freshness', label: 'Freshness agreement', detail: 'Engineer and consumers agree how stale data may be', tone: 'sky' },
        { id: 'docs', label: 'Dataset documentation', detail: 'Grain, definitions, known limits', tone: 'blue' },
        { id: 'access', label: 'Access request', detail: 'Consumers ask; security approves least privilege', tone: 'orange' },
      ],
    },
    {
      id: 'partners',
      title: 'Partner roles that own cross-cutting concerns',
          isUnordered: true,
      steps: [
        { id: 'security', label: 'Security', detail: 'Classification, access, encryption', tone: 'purple' },
        { id: 'governance', label: 'Governance', detail: 'Ownership, quality bar, lineage', tone: 'blue' },
        { id: 'architecture', label: 'Architecture', detail: 'Reversible decisions, sign-off on one-way doors', tone: 'teal' },
        { id: 'platform', label: 'Platform and reliability', detail: 'Infrastructure, on-call, service levels', tone: 'yellow' },
      ],
    },
  ],
};

export const OVERVIEW_FIGURES: FigureSpec[] = [LEVELS_STACK_FIGURE, ROLE_MAP_FIGURE];
