'use client';

import React from 'react';
import { ChevronRight, ChevronDown, Scale } from 'lucide-react';
import {
  TIER_ORDER,
  type SystemDesign,
  type SystemTier,
  type DiagramNode,
  type DesignConsideration,
} from '@/constants/systemDesign';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Tier display config — color/label metadata kept out of render logic
// (mirrors COLUMN_CONFIG in KanbanBoard.tsx). Dark mode via `dark:` variants
// only, since the app uses @media (prefers-color-scheme).
// ---------------------------------------------------------------------------
const TIER_CONFIG: Record<SystemTier, { label: string; dot: string; iconBox: string }> = {
  client: {
    label: 'Client',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
    iconBox: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
  },
  frontend: {
    label: 'Frontend',
    dot: 'bg-blue-500 dark:bg-blue-400',
    iconBox: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  backend: {
    label: 'Backend',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    iconBox: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  },
  model: {
    label: 'Model',
    dot: 'bg-purple-500 dark:bg-purple-400',
    iconBox: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  data: {
    label: 'Data',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    iconBox: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
};

// Generic label → accent rule for the "Design considerations" cards, so the
// renderer stays project-agnostic (no per-entry color hardcoding).
const considerationAccent = (label: string): string => {
  const normalized = label.trim().toLowerCase();
  if (normalized.startsWith('why')) return 'text-emerald-600 dark:text-emerald-400';
  if (normalized.startsWith('trade')) return 'text-amber-600 dark:text-amber-400';
  return 'text-blue-600 dark:text-blue-400';
};

// ---------------------------------------------------------------------------
// NodeCard — a single architecture node within a tier
// ---------------------------------------------------------------------------
const NodeCard = ({ node }: { node: DiagramNode }) => {
  const { iconBox } = TIER_CONFIG[node.tier];
  const Icon = node.icon;
  return (
    <div className="card-base p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className={cn('icon-container shrink-0', iconBox)}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
            {node.label}
          </p>
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5 break-words">
            {node.tech}
          </p>
        </div>
      </div>
      {node.note && (
        <p className="text-xs text-subtle leading-relaxed">{node.note}</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TierConnector — decorative arrow between tiers (down on mobile, right on desktop)
// ---------------------------------------------------------------------------
const TierConnector = () => (
  <div className="flex items-center justify-center py-1 lg:py-0 lg:px-1 shrink-0" aria-hidden="true">
    <ChevronDown size={18} className="lg:hidden text-zinc-300 dark:text-zinc-600" />
    <ChevronRight size={18} className="hidden lg:block text-zinc-300 dark:text-zinc-600" />
  </div>
);

// ---------------------------------------------------------------------------
// SystemDesignDiagram — renders one SystemDesign self-contained
// ---------------------------------------------------------------------------
const SystemDesignDiagram = ({ design }: { design: SystemDesign }) => {
  // Group nodes by tier in canonical order; render only tiers that are present
  // (no fixed five-slot assumption).
  const tiers = TIER_ORDER.map((tier) => ({
    tier,
    config: TIER_CONFIG[tier],
    nodes: design.nodes.filter((node) => node.tier === tier),
  })).filter((group) => group.nodes.length > 0);

  return (
    <div className="flex flex-col">
      {/* Title + summary (self-contained so the diagram is reusable) */}
      <div className="mb-6 max-w-3xl">
        <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          {design.title}
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {design.summary}
        </p>
      </div>

      {/* Tiered architecture flow */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-2">
        {tiers.map((group, index) => (
          <React.Fragment key={group.tier}>
            <div
              role="group"
              aria-label={`${group.config.label} tier`}
              className="flex-1 min-w-0 flex flex-col"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', group.config.dot)}
                  aria-hidden="true"
                />
                <span className="text-micro text-zinc-400">{group.config.label}</span>
              </div>
              <div className="flex-1 space-y-2">
                {group.nodes.map((node) => (
                  <NodeCard key={`${node.tier}-${node.label}`} node={node} />
                ))}
              </div>
            </div>
            {index < tiers.length - 1 && <TierConnector />}
          </React.Fragment>
        ))}
      </div>

      {/* Design considerations */}
      <div className="mt-10 border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <span className="text-micro text-zinc-400 flex items-center gap-1.5 mb-3">
          <Scale size={12} aria-hidden="true" /> Design considerations
        </span>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {design.considerations.map((consideration: DesignConsideration) => (
            <div key={consideration.label} className="card-base p-4">
              <dt className={cn('text-micro mb-1', considerationAccent(consideration.label))}>
                {consideration.label}
              </dt>
              <dd className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {consideration.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default SystemDesignDiagram;
