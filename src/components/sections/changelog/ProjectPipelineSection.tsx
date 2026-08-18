'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Layers,
  TrendingUp,
  Sliders,
  Github,
  Clock,
  Wrench,
  PackageCheck,
  NotebookPen,
  ArrowRight,
} from 'lucide-react';
import { KANBAN_ITEMS, type KanbanItem, type KanbanStatus } from '@/constants/kanban';
import { SYSTEM_DESIGN_BY_ID } from '@/constants/systemDesign';
import SystemDesignDiagram from '@/components/features/SystemDesignDiagram';

// ---------------------------------------------------------------------------
// Status display config — moved from the former homepage KanbanBoard
// (COLUMN_CONFIG) unchanged, since status is real roadmap signal (In Queue /
// In Development / Completed), not decoration.
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  KanbanStatus,
  { label: string; icon: React.ElementType; badgeClass: string; headerClass: string }
> = {
  'in-queue': {
    label: 'In Queue',
    icon: Clock,
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
    headerClass: 'text-zinc-500 dark:text-zinc-400',
  },
  'in-development': {
    label: 'In Development',
    icon: Wrench,
    badgeClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800',
    headerClass: 'text-blue-600 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    icon: PackageCheck,
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800',
    headerClass: 'text-emerald-600 dark:text-emerald-400',
  },
};

const STATUS_ORDER: KanbanStatus[] = ['in-queue', 'in-development', 'completed'];

// ---------------------------------------------------------------------------
// PipelineEntry — one card's problem/solution/impact writeup, paired with its
// own tier-by-tier architecture breakdown directly below it (previously split
// across two separate homepage sections — a Kanban card here, its diagram in
// a carousel elsewhere — now both live on the same anchored block).
// ---------------------------------------------------------------------------
const PipelineEntry = ({ item }: { item: KanbanItem }) => {
  const design = SYSTEM_DESIGN_BY_ID[item.id];

  return (
    <div id={item.id} className="scroll-mt-24 card-base p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 leading-tight">
          {item.title}
        </h3>
        <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{item.role}</p>
      </div>

      {/* Problem / Solution */}
      <div className="space-y-3">
        <div>
          <span className="text-micro text-zinc-400 block mb-1">The Problem</span>
          <p className="text-sm text-subtle leading-relaxed">{item.problem}</p>
        </div>
        <div>
          <span className="text-micro text-zinc-400 block mb-1">The Solution</span>
          <p className="text-sm text-subtle leading-relaxed">{item.solution}</p>
        </div>
      </div>

      {/* Parameters — conditional, only rendered when present */}
      {Array.isArray(item.parameters) && item.parameters.length > 0 && (
        <div>
          <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
            <Sliders size={12} /> Parameters
          </span>
          <div className="flex flex-wrap gap-1.5">
            {item.parameters.map((param) => (
              <span key={param} className="tag-blue" title={param}>
                {param}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Stack */}
      <div>
        <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
          <Layers size={12} /> Architecture Stack
        </span>
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-blue">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Impact / KPIs */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-2">
          <TrendingUp size={12} /> Impact Outcomes
        </span>
        <ul className="space-y-1.5">
          {item.kpis.map((kpi) => (
            <li
              key={kpi}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5"
            >
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <span>{kpi}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* GitHub link — only for completed items with a public repo */}
      {item.githubUrl && (
        <a
          href={item.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <Github size={13} />
          View on GitHub
        </a>
      )}

      {/* Internal study-plan link */}
      {item.studyPlanUrl && (
        <Link
          href={item.studyPlanUrl}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <NotebookPen size={13} />
          Open study plan
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Tier-by-tier architecture — inline now that it shares a page with its card */}
      {design && (
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <SystemDesignDiagram design={design} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ProjectPipelineSection — grouped by status, sorted by priority within each
// group, exactly mirroring the former homepage KanbanBoard's filter/sort.
// ---------------------------------------------------------------------------
const ProjectPipelineSection = () => (
  <section id="project-pipeline" className="scroll-mt-24">
    <div className="mb-6">
      <span className="text-micro text-zinc-400 block mb-2">Project Pipeline</span>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Open Source &amp; Content Roadmap
      </h2>
    </div>

    <div className="space-y-12">
      {STATUS_ORDER.map((status) => {
        const items = KANBAN_ITEMS.filter((item) => item.status === status).sort(
          (a, b) => a.priority - b.priority,
        );
        if (items.length === 0) return null;

        const config = STATUS_CONFIG[status];
        const StatusIcon = config.icon;

        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-micro font-bold flex items-center gap-1.5 ${config.headerClass}`}>
                <StatusIcon size={12} />
                {config.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${config.badgeClass}`}>
                {items.length}
              </span>
            </div>
            <div className="space-y-6">
              {items.map((item) => (
                <PipelineEntry key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

export default ProjectPipelineSection;
