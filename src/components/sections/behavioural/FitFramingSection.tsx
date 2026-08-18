import React from 'react';
import { FIT_SIGNAL_GROUPS } from '@/constants/behavioural';

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Two-card layout for FIT_SIGNAL_GROUPS (Role Fit / Company Fit) — same card idiom as
 * StakeholderArchetypeCard, since this is a scannable reference meant to be read in
 * full rather than progressively disclosed.
 */
const FitFramingSection = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {FIT_SIGNAL_GROUPS.map((group) => (
      <div key={group.id} className="card-base p-5 sm:p-6">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">{group.label}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{group.description}</p>
        <span className="text-micro text-zinc-400 block mt-4 mb-2">Signals to check for</span>
        <ul className="space-y-1.5">
          {group.signals.map((signal) => (
            <li key={signal} className={BULLET_CLASS}>
              {signal}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default FitFramingSection;
