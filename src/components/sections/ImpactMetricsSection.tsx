import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, ShieldCheck, Gauge, BadgeCheck, Clock, Users } from 'lucide-react';

import { IMPACT_METRICS } from '@/data/credentials';
import type { ImpactMetricIconName } from '@/types/credentials';

/** Resolves an ImpactMetric's icon key to a lucide component — keeps src/data/credentials.ts icon-free. */
const ICON_MAP: Record<ImpactMetricIconName, LucideIcon> = {
  TrendingDown,
  ShieldCheck,
  Gauge,
  BadgeCheck,
  Clock,
  Users,
};

/**
 * "Impact, by the numbers" — a quantified-results stat grid pulled straight
 * from the resume's Professional Experience bullets, placed right after
 * AboutMeSection's Professional Summary / Leadership & Recognition cards.
 * Header markup mirrors BeyondTheTerminal's hand-rolled eyebrow + h2 +
 * description (the homepage's own convention for a full section header,
 * rather than the shared SectionHeading used on /behavioural and /projects).
 */
const ImpactMetricsSection: React.FC = () => {
  return (
    <section>
      <div className="mb-6 max-w-2xl">
        <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
          Track Record
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Impact, by the numbers.
        </h2>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Six figures pulled straight from seven years of shipping — cost avoided, hours reclaimed,
          and systems trusted enough to adopt.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {IMPACT_METRICS.map((metric) => {
          const Icon = ICON_MAP[metric.iconName];
          return (
            <div
              key={metric.id}
              className="card-base p-5 flex flex-col h-full gap-1 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <Icon size={18} className="text-blue-500 mb-1" aria-hidden="true" />
              <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white leading-none">
                {metric.value}
              </span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{metric.label}</p>
              <span className="mt-auto pt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {metric.context}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ImpactMetricsSection;
