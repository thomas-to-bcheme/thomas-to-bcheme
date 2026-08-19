'use client';

import React from 'react';
import { Compass, Layers, MessagesSquare, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';
import {
  BEHAVIOURAL_TOC_ITEMS,
  FRAMEWORK_TOC_ITEMS,
  COMPETENCIES_TOC_ITEMS,
  DELIVERY_TOC_ITEMS,
  REFERENCE_TOC_ITEMS,
} from '@/constants/behavioural/toc';

const TOC_IDS = BEHAVIOURAL_TOC_ITEMS.map((item) => item.id);

const NAV_LINK_CLASS =
  'block rounded-md px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Sticky desktop sidebar — hidden below `lg:`, where BehaviouralMobileToc
 * takes over instead. One useActiveSection call, scoped to the full flat TOC
 * (8 framework sections + 9 competency chapters + 3 delivery phases + 1
 * reference section), drives which link is highlighted. New independent copy
 * of SystemDesignPrepSidebar's pattern — the codebase's convention is
 * per-page copies here (ChangelogSidebar and SystemDesignPrepSidebar share no
 * code either), not a shared abstraction.
 */
const BehaviouralSidebar = () => {
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
      aria-label="Behavioural interview table of contents"
      className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-6"
    >
      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Compass size={12} className="stroke-[2.5]" /> Framework
        </span>
        {FRAMEWORK_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <Layers size={12} className="stroke-[2.5]" /> Competencies
        </span>
        {COMPETENCIES_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
      </div>

      <div className="space-y-1">
        <span className="flex items-center gap-1.5 px-3 text-micro text-zinc-400 mb-2">
          <MessagesSquare size={12} className="stroke-[2.5]" /> Nailing the Interview
        </span>
        {DELIVERY_TOC_ITEMS.map((item) => renderLink(item.id, item.label))}
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

export default BehaviouralSidebar;
