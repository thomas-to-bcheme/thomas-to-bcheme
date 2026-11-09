'use client';

import { useState } from 'react';

import Tabs from '@/components/ui/Tabs';
import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';
import { cn } from '@/lib/utils';
import type { Concept, ConceptPartMeta } from '@/constants/implementation/concepts/types';
import CodeBlock from './CodeBlock';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

interface LanguageOption {
  id: string;
  name: string;
}

interface ConceptExplorerProps {
  concepts: Concept[];
  /** Parts in display order; parts with no concepts are skipped. */
  parts: ConceptPartMeta[];
  languages: LanguageOption[];
  /** Announced by the concept list and the language tablist. */
  label: string;
}

/**
 * Click a concept, then compare its implementation across languages.
 *
 * Imports types only from @/constants/implementation/concepts/types, and takes
 * the data as props, so the page that renders it (a server component) decides
 * which concepts ship to the browser.
 */
const ConceptExplorer = ({ concepts, parts, languages, label }: ConceptExplorerProps) => {
  const [activeId, setActiveId] = useState<string>(concepts[0]?.id ?? '');
  const active = concepts.find((concept) => concept.id === activeId) ?? concepts[0];

  if (!active) return null;

  const languageTabs = languages.map((language) => ({ id: language.id, label: language.name }));

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      <nav
        aria-label={`${label} concepts`}
        className="card-base p-3 max-h-72 overflow-y-auto lg:max-h-[75vh] lg:sticky lg:top-32"
      >
        {parts.map((part) => {
          const partConcepts = concepts.filter((concept) => concept.part === part.id);
          if (partConcepts.length === 0) return null;
          return (
            <div key={part.id} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-micro font-bold uppercase tracking-widest text-zinc-400">
                {part.label}
              </p>
              <ul className="space-y-0.5">
                {partConcepts.map((concept) => {
                  const isActive = concept.id === active.id;
                  return (
                    <li key={concept.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(concept.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={cn(
                          'w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors',
                          FOCUS_RING,
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900',
                        )}
                      >
                        {concept.navLabel}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <article aria-live="polite" className="min-w-0">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{active.title}</h3>
        <p className={`mt-2 max-w-3xl ${BODY_TEXT_CLASS}`}>{active.summary}</p>
        {active.complexity && (
          <p className="mt-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Complexity: {active.complexity}
          </p>
        )}

        <Tabs tabs={languageTabs} label={`${active.title} by language`} className="mt-5">
          {(languageId) => {
            const language = languages.find((candidate) => candidate.id === languageId);
            const snippet = active.snippets[languageId as keyof typeof active.snippets];
            if (!language || !snippet) return null;
            return (
              <CodeBlock
                snippet={{
                  language: language.name,
                  caption: snippet.note ?? '',
                  code: snippet.code,
                }}
              />
            );
          }}
        </Tabs>

        <div className="mt-5 card-base p-4 border-l-2 border-l-blue-400 dark:border-l-blue-500">
          <p className="text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1">Takeaway</p>
          <p className={BODY_TEXT_CLASS}>{active.takeaway}</p>
        </div>
      </article>
    </div>
  );
};

export default ConceptExplorer;
