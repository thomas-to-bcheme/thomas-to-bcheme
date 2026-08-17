'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';

export interface PageSectionNavItem {
  id: string;
  label: string;
}

interface PageSectionNavProps {
  items: PageSectionNavItem[];
}

/**
 * Lightweight sticky "jump to" pill row for single-scroll dedicated pages
 * (Behavioural, Effective Communication, Practical Technical) — a cheaper
 * alternative to a full sidebar+ToC (that heavier treatment is reserved for
 * System Design, whose content volume actually needs it). Reuses the
 * existing `useActiveSection` hook unchanged.
 */
const PageSectionNav = ({ items }: PageSectionNavProps) => {
  const sectionIds = items.map((item) => item.id);
  const activeId = useActiveSection(sectionIds);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-16 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-8 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto"
    >
      <ul className="flex items-center gap-2 whitespace-nowrap">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                activeId === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default PageSectionNav;
