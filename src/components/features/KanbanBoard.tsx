'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Layers,
  TrendingUp,
  Sliders,
  Github,
  Clock,
  Wrench,
  PackageCheck,
  NotebookPen,
  Network,
  ArrowRight,
} from 'lucide-react';
import { KANBAN_ITEMS, type KanbanItem, type KanbanStatus } from '@/constants/kanban';
import { SYSTEM_DESIGN_BY_ID } from '@/constants/systemDesign';

// ---------------------------------------------------------------------------
// Column display config — status metadata kept out of component logic
// ---------------------------------------------------------------------------
const COLUMN_CONFIG: Record<
  KanbanStatus,
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
    headerClass: string;
    borderClass: string;
  }
> = {
  'in-queue': {
    label: 'In Queue',
    icon: Clock,
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
    headerClass: 'text-zinc-500 dark:text-zinc-400',
    borderClass: 'border-zinc-200 dark:border-zinc-800',
  },
  'in-development': {
    label: 'In Development',
    icon: Wrench,
    // Raw values — not 'tag-blue', which includes rounded-md conflicting with rounded-full on the badge span
    badgeClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800',
    headerClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-900',
  },
  completed: {
    label: 'Completed',
    icon: PackageCheck,
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800',
    headerClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-900',
  },
};

// ---------------------------------------------------------------------------
// KanbanCard — renders a single item card
// ---------------------------------------------------------------------------
const KanbanCard = ({ item }: { item: KanbanItem }) => (
  <div className="flex flex-col h-full space-y-4">
    {/* Header */}
    <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
      <h5 className="text-base font-bold text-zinc-900 dark:text-white mb-1 leading-tight">
        {item.title}
      </h5>
      <p className="text-xs font-mono text-blue-600 dark:text-blue-400">{item.role}</p>
    </div>

    {/* Problem / Solution */}
    <div className="space-y-3 flex-1">
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

    {/* GitHub link — only for completed items */}
    {item.githubUrl && (
      <div className="pt-2">
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
      </div>
    )}

    {/* Internal study-plan link — same-tab client navigation */}
    {item.studyPlanUrl && (
      <div className="pt-2">
        <Link
          href={item.studyPlanUrl}
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <NotebookPen size={13} />
          Open study plan
          <ArrowRight
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    )}

    {/* System-design deep link — only when a matching diagram exists (no dead links).
        Scrolls to the inline system-design carousel on the homepage. */}
    {SYSTEM_DESIGN_BY_ID[item.id] && (
      <div className="pt-2">
        <Link
          href="/#system-design"
          className="group inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     focus-visible:ring-offset-white dark:focus-visible:ring-offset-black rounded-sm"
        >
          <Network size={13} />
          View system design
          <ArrowRight
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// KanbanColumn — owns its Embla carousel instance (one hook per column)
// Bug Fix #1: extracted as subcomponent — hooks never called inside a loop
// ---------------------------------------------------------------------------
const KanbanColumn = ({ status, items }: { status: KanbanStatus; items: KanbanItem[] }) => {
  const config = COLUMN_CONFIG[status];
  const StatusIcon = config.icon;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });

  // Bug Fix #2: canNavigate is reactive — set after Embla initializes via useEffect
  const [canNavigate, setCanNavigate] = useState(false);
  // Bug Fix #6: disabled states for arrow buttons
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // Bug Fix #2: set canNavigate after Embla has initialized and counted snaps
    setCanNavigate(emblaApi.scrollSnapList().length > 1);
    emblaApi.on('select', onSelect);
    onSelect(); // initialize button states
    // Bug Fix #3: cleanup listener to prevent memory leak on unmount
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Bug Fix #4: empty column guard — no carousel crash on 0 items
  if (items.length === 0) {
    return (
      <div
        className={`rounded-xl border ${config.borderClass} bg-white dark:bg-zinc-900/50 p-5 min-h-[200px] flex flex-col`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className={`text-micro font-bold flex items-center gap-1.5 ${config.headerClass}`}>
            <StatusIcon size={12} />
            {config.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${config.badgeClass}`}>0</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-micro text-zinc-400">No items yet</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${config.borderClass} bg-white dark:bg-zinc-900/50 p-5 flex flex-col`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <span className={`text-micro font-bold flex items-center gap-1.5 ${config.headerClass}`}>
          <StatusIcon size={12} />
          {config.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${config.badgeClass}`}>
          {items.length}
        </span>
      </div>

      {/* Embla Viewport */}
      <div ref={emblaRef} className="overflow-hidden flex-1">
        <div className="flex h-full">
          {items.map((item) => (
            // flex-[0_0_100%] makes each slide take full column width
            <div key={item.id} className="flex-[0_0_100%] min-w-0">
              <KanbanCard item={item} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation — Bug Fix #2: only rendered when canNavigate is true */}
      {canNavigate && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="Previous project"
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to item ${i + 1}`}
                className={`rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  i === selectedIndex
                    ? 'w-4 h-1.5 bg-blue-600 dark:bg-blue-400'
                    : 'w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label="Next project"
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// KanbanBoard — renders 3 columns; no hooks at this level
// ---------------------------------------------------------------------------
const COLUMN_ORDER: KanbanStatus[] = ['in-queue', 'in-development', 'completed'];

const KanbanBoard: React.FC = () => (
  <div>
    {/* Section Header */}
    <div className="mb-6">
      <span className="text-micro text-zinc-400 block mb-2">Project Pipeline</span>
      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
        Open Source &amp; Content Roadmap
      </h3>
    </div>

    {/* 3-Column Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      {COLUMN_ORDER.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          items={KANBAN_ITEMS.filter((item) => item.status === status).sort(
            (a, b) => a.priority - b.priority,
          )}
        />
      ))}
    </div>
  </div>
);

export default KanbanBoard;
