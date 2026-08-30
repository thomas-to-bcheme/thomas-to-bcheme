'use client';

import React from 'react';
import { Compass, ListChecks, Brain, Sparkles, MessagesSquare, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';
import {
  SYSTEM_DESIGN_TOC_ITEMS,
  FRAMING_TOC_ITEMS,
  FRAMEWORK_TOC_ITEMS,
  ML_FRAMEWORK_TOC_ITEMS,
  GENAI_FRAMEWORK_TOC_ITEMS,
  QUESTIONS_TOC_ITEMS,
  REFERENCE_TOC_ITEMS,
} from '@/constants/systemDesignPrep/toc';

const TOC_IDS = SYSTEM_DESIGN_TOC_ITEMS.map((item) => item.id);

const NAV_LINK_CLASS =
  'block rounded-md px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Sticky desktop sidebar — hidden below `lg:`, where
 * SystemDesignPrepMobileToc takes over instead. One useActiveSection call,
 * scoped to the full flat TOC (4-item framing group, incl. communication
 * scripts, + 4 framework steps + 6 ML framework steps + 5 GenAI framework
 * steps + 6 question categories + 7 reference sections), drives which link
 * is highlighted. Follows ChangelogSidebar's exact interaction pattern.
 */
const SystemDesignPrepSidebar = () => {
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
      aria-label="System design table of contents"
      className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-6"
    >
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Compass size={12} className="stroke-[2.5]" /> Framing
        </span>
        {FRAMING_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <ListChecks size={12} className="stroke-[2.5]" /> Framework
        </span>
        {FRAMEWORK_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Brain size={12} className="stroke-[2.5]" /> ML Framework
        </span>
        {ML_FRAMEWORK_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Sparkles size={12} className="stroke-[2.5]" /> GenAI Framework
        </span>
        {GENAI_FRAMEWORK_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <MessagesSquare size={12} className="stroke-[2.5]" /> The Questions
        </span>
        {QUESTIONS_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <BookOpen size={12} className="stroke-[2.5]" /> Reference
        </span>
        {REFERENCE_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>
    </nav>
  );
};

export default SystemDesignPrepSidebar;
