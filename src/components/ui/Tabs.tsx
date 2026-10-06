'use client';

import { useId, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: readonly TabItem[];
  /** Announced by the tablist. */
  label: string;
  /** Renders the panel for the active tab. */
  children: (activeId: string) => React.ReactNode;
  className?: string;
}

/**
 * Generic ARIA tabs with arrow-key roving focus (Left/Right/Home/End).
 * The domain-specific CodeProgressionTabs stays separate: it is coupled to
 * aiMl types, so this is the reusable primitive for everything else.
 */
export default function Tabs({ tabs, label, children, className }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0) return null;

  const select = (id: string) => {
    setActive(id);
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (event.key === 'Home') {
      event.preventDefault();
      select(tabs[0].id);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      select(tabs[tabs.length - 1].id);
      return;
    }
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    select(tabs[(index + offset + tabs.length) % tabs.length].id);
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap items-center gap-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                FOCUS_RING,
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${active}`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="mt-5"
      >
        {children(active)}
      </div>
    </div>
  );
}
