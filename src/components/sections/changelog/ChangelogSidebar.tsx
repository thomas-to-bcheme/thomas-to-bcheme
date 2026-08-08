'use client';

import React from 'react';
import { Compass, Layers, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';
import {
  CHANGELOG_TOC_ITEMS,
  MENTAL_MODEL_TOC_ITEMS,
  PROJECT_TOC_ITEMS,
  FAQ_TOC_ITEM,
} from '@/constants/changelogToc';

const TOC_IDS = CHANGELOG_TOC_ITEMS.map((item) => item.id);

const NAV_LINK_CLASS =
  'block rounded-md px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Sticky desktop sidebar — hidden below `lg:`, where ChangelogMobileToc takes
 * over instead. One useActiveSection call, scoped to the full flat TOC (6
 * essay sections + 4 project ids + faq), drives which link is highlighted.
 */
const ChangelogSidebar = () => {
  const activeId = useActiveSection(TOC_IDS);

  const renderLink = (id: string, label: string) => {
    const isActive = activeId === id;
    return (
      <a
        key={id}
        href={`#${id}`}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          NAV_LINK_CLASS,
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900',
        )}
      >
        {label}
      </a>
    );
  };

  return (
    <nav
      aria-label="Changelog table of contents"
      className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-6"
    >
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Compass size={12} className="stroke-[2.5]" /> Mental Model
        </span>
        {MENTAL_MODEL_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Layers size={12} className="stroke-[2.5]" /> Projects
        </span>
        {PROJECT_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <HelpCircle size={12} className="stroke-[2.5]" /> Reference
        </span>
        {renderLink(FAQ_TOC_ITEM.id, FAQ_TOC_ITEM.label)}
      </div>
    </nav>
  );
};

export default ChangelogSidebar;
