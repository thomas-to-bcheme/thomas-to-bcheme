'use client';

import React from 'react';
import { Layers, Workflow } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { GLOSSARY_TOC_GROUPS, GLOSSARY_TOC_ITEMS, GLOSSARY_AZ_INDEX } from '@/constants/glossaryToc';

const TOC_IDS = GLOSSARY_TOC_ITEMS.map((item) => item.id);

const GROUP_ICONS = { foundation: Workflow, 'ml-lifecycle': Layers } as const;

const NAV_LINK_CLASS =
  'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Sticky desktop sidebar — hidden below `lg:`, where GlossaryMobileToc takes
 * over instead. Mirrors ChangelogSidebar's scroll-spy pattern exactly (one
 * useActiveSection call scoped to the full flat category-id list) so the
 * site doesn't teach two different in-page-nav metaphors. Adds an A-Z jump
 * rail beneath the category groups — "I know the word, find it fast" is the
 * dominant lookup mode at 200 terms, and category browsing alone doesn't
 * serve it.
 */
const GlossarySidebar = () => {
  const activeId = useActiveSection(TOC_IDS);
  const prefersReducedMotion = useReducedMotion();

  const handleLetterClick = (slug: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    scrollToAnchor(slug, { prefersReducedMotion: prefersReducedMotion ?? false });
  };

  return (
    <nav
      aria-label="Glossary table of contents"
      className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-6"
    >
      {GLOSSARY_TOC_GROUPS.map((group) => {
        const Icon = GROUP_ICONS[group.track];
        return (
          <div key={group.track} className="space-y-1">
            <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
              <Icon size={12} className="stroke-[2.5]" /> {group.label}
            </span>
            {group.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    NAV_LINK_CLASS,
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-600">{item.count}</span>
                </a>
              );
            })}
          </div>
        );
      })}

      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-2">Jump to letter</span>
        <div className="flex flex-wrap gap-1 px-3">
          {GLOSSARY_AZ_INDEX.map(({ letter, slug }) => (
            <a
              key={letter}
              href={`#${slug}`}
              onClick={handleLetterClick(slug)}
              className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              {letter}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default GlossarySidebar;
