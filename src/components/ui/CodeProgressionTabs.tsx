'use client';

import { useRef, useState } from 'react';

import Badge from '@/components/ui/Badge';
import CodeBlock from '@/components/ui/CodeBlock';
import { cn } from '@/lib/utils';
import {
  AI_ML_LANGUAGES,
  AI_ML_STAGES,
  type CodeLanguageId,
  type ModelImplementations,
} from '@/constants/aiMl/types';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface CodeProgressionTabsProps {
  implementations: ModelImplementations;
  /** Announced by the tablist, e.g. the model name. */
  label: string;
}

/**
 * Language tabs, with all three progression stages stacked inside each panel.
 *
 * Deliberately NOT a second row of tabs for the stages: the whole point is
 * reading intuitive -> idiomatic -> optimized in sequence, and hiding two thirds
 * of that behind tabs would defeat it. This is LanguageProgressionTrack's layout
 * generalized to three languages and richer per-stage metadata.
 *
 * Imports @/constants/aiMl/types ONLY. Importing the registry barrel from a
 * client component would pull every model's code strings into the browser
 * bundle — which is why the display-order constants live in types.ts.
 */
export default function CodeProgressionTabs({
  implementations,
  label,
}: CodeProgressionTabsProps) {
  const [active, setActive] = useState<CodeLanguageId>(AI_ML_LANGUAGES[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow-key roving focus, per the ARIA tabs pattern.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();

    const index = AI_ML_LANGUAGES.findIndex((language) => language.id === active);
    const next = AI_ML_LANGUAGES[(index + offset + AI_ML_LANGUAGES.length) % AI_ML_LANGUAGES.length];
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const stages = implementations[active];

  return (
    <div className="card-base p-4 sm:p-5">
      <div
        role="tablist"
        aria-label={`${label} implementations`}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap items-center gap-2"
      >
        {AI_ML_LANGUAGES.map((language) => {
          const isActive = language.id === active;
          return (
            <button
              key={language.id}
              ref={(node) => {
                tabRefs.current[language.id] = node;
              }}
              type="button"
              role="tab"
              id={`code-tab-${language.id}`}
              aria-selected={isActive}
              aria-controls={`code-panel-${language.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(language.id)}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                FOCUS_RING,
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              {language.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`code-panel-${active}`}
        aria-labelledby={`code-tab-${active}`}
        className="mt-5 space-y-8"
      >
        {AI_ML_STAGES.map((stage, index) => {
          const sample = stages[stage.id];
          return (
            <div key={stage.id}>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge color="blue" variant="outline">
                  {`${index + 1}. ${stage.label}`}
                </Badge>
                {sample.libraryName && (
                  <Badge color="zinc" variant="outline">
                    {sample.libraryName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2">{stage.blurb}</p>

              <CodeBlock code={sample.code} />

              {sample.rationale && (
                <p className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    What changed:{' '}
                  </span>
                  {sample.rationale}
                </p>
              )}

              {sample.conventions && sample.conventions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {sample.conventions.map((convention) => (
                    <span key={convention} className="tag-blue">
                      {convention}
                    </span>
                  ))}
                </div>
              )}

              {sample.optimizations && sample.optimizations.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                  {sample.optimizations.map((optimization) => (
                    <li
                      key={optimization.technique}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {optimization.technique}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {optimization.why}
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                        <span className="font-semibold">Trade-off: </span>
                        {optimization.tradeoff}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {sample.profile && (
                <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {sample.profile}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
