import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoundationsAccordionProps {
  id?: string;
  title: ReactNode;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Closed-by-default <details> card — same idiom as CommunicationScriptsSection
 * — with the one-line summary visible while collapsed, so the deep-reference
 * detail stays out of the way of the page's reading flow.
 */
const FoundationsAccordion = ({ id, title, summary, children, className }: FoundationsAccordionProps) => (
  <details id={id} className={cn('group card-base p-0 overflow-hidden scroll-mt-24', className)}>
    <summary className="flex items-start justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{summary}</span>
      </span>
      <ChevronDown className="mt-0.5 w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</div>
  </details>
);

export default FoundationsAccordion;
