import React from 'react';
import { ChevronDown, ListTree } from 'lucide-react';
import {
  MENTAL_MODEL_TOC_ITEMS,
  PROJECT_TOC_ITEMS,
  PIPELINE_TOC_ITEM,
  FAQ_TOC_ITEM,
} from '@/constants/changelogToc';

const LINK_CLASS =
  'block rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Below `lg:`, ChangelogSidebar disappears entirely and this native
 * <details> disclosure takes its place — zero JS, same collapsed-by-default
 * pattern already used by the FAQ accordion (FaqAccordionItem).
 */
const ChangelogMobileToc = () => (
  <details className="group lg:hidden card-base p-0 overflow-hidden mb-10">
    <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
        <ListTree size={15} className="stroke-[2.5]" /> On this page
      </span>
      <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-1">Mental Model</span>
        {MENTAL_MODEL_TOC_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={LINK_CLASS}>
            {item.label}
          </a>
        ))}
      </div>
      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-1">Projects</span>
        {PROJECT_TOC_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={LINK_CLASS}>
            {item.label}
          </a>
        ))}
      </div>
      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-1">Pipeline</span>
        <a href={`#${PIPELINE_TOC_ITEM.id}`} className={LINK_CLASS}>
          {PIPELINE_TOC_ITEM.label}
        </a>
      </div>
      <div className="space-y-1">
        <span className="block px-3 text-micro text-zinc-400 mb-1">Reference</span>
        <a href={`#${FAQ_TOC_ITEM.id}`} className={LINK_CLASS}>
          {FAQ_TOC_ITEM.label}
        </a>
      </div>
    </div>
  </details>
);

export default ChangelogMobileToc;
