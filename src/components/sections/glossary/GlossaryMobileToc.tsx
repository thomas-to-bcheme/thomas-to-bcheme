import React from 'react';
import { ChevronDown, ListTree } from 'lucide-react';
import { GLOSSARY_TOC_GROUPS, GLOSSARY_AZ_INDEX } from '@/constants/glossaryToc';

const LINK_CLASS =
  'flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Below `lg:`, GlossarySidebar disappears entirely and this native <details>
 * disclosure takes its place — zero JS, same pattern as ChangelogMobileToc.
 * The A-Z jump rail's scroll+focus behavior is handled client-side by
 * GlossaryBrowser reading the hash on mount, so this component itself stays
 * a plain server-rendered disclosure with ordinary anchor links.
 */
const GlossaryMobileToc = () => (
  <details className="group lg:hidden card-base p-0 overflow-hidden mb-10">
    <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
        <ListTree size={15} className="stroke-[2.5]" /> On this page
      </span>
      <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
      {GLOSSARY_TOC_GROUPS.map((group) => (
        <div key={group.track} className="space-y-1">
          <span className="block px-3 text-micro text-zinc-400 mb-1">{group.label}</span>
          {group.items.map((item) => (
            <a key={item.id} href={`#${item.id}`} className={LINK_CLASS}>
              <span>{item.label}</span>
              <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-600">{item.count}</span>
            </a>
          ))}
        </div>
      ))}
      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-1">Jump to letter</span>
        <div className="flex flex-wrap gap-1 px-3">
          {GLOSSARY_AZ_INDEX.map(({ letter, slug }) => (
            <a
              key={letter}
              href={`#${slug}`}
              className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>
      </div>
    </div>
  </details>
);

export default GlossaryMobileToc;
