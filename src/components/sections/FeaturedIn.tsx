import React from 'react';
import { Newspaper, ArrowRight } from 'lucide-react';

import { PRESS_FEATURES } from '@/data/credentials';

// Shared focus-visible ring, matching the convention used on nav links in page.tsx.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

/**
 * "As Featured In" — verifiable press mentions rendered as self-contained
 * callout cards. Each card carries the publication, headline, and pull-quote so a
 * single mention reads as a deliberate feature (not a sparse lone chip), and the
 * responsive grid tiles cleanly as more mentions are added.
 */
const FeaturedIn: React.FC = () => {
  if (PRESS_FEATURES.length === 0) return null;

  return (
    <section aria-label="Press feature" className="mb-8">
      <span className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-3 block">
        As Featured In
      </span>

      <div className="grid gap-4 sm:grid-cols-2">
        {PRESS_FEATURES.map((feature) => (
          <a
            key={feature.id}
            href={feature.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group card-base p-5 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${FOCUS_RING}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <Newspaper size={15} className="text-blue-500 shrink-0" />
                {feature.publication}
              </span>
              {feature.date && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{feature.date}</span>
              )}
            </div>

            <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug">
              {feature.headline}
            </p>

            {feature.quote && (
              <p className="text-xs italic text-zinc-500 dark:text-zinc-400 leading-relaxed border-l-2 border-blue-200 dark:border-blue-900/50 pl-3">
                &ldquo;{feature.quote}&rdquo;
              </p>
            )}

            <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              Read in full
              <ArrowRight size={13} className="opacity-75 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default FeaturedIn;
