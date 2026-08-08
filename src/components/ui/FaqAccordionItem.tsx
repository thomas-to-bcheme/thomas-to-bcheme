import React from 'react';
import { ChevronDown, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

interface FaqAccordionItemProps {
  question: string;
  answer: string;
  isPlaceholder?: boolean;
}

/**
 * Shared <details>/<summary> Q/A block — the FAQ primitive for both the
 * general FAQ (FaqSection) and the 4 per-project FAQ lists (ProjectFaqList).
 *
 * isPlaceholder styling must be visually unmistakable from a real answer in
 * both themes: dashed border, muted/italic question text, and a small
 * "Placeholder — add your answer." badge. These are scaffolded interview-FAQ
 * slots, not real content — never mistake one for the other.
 */
const FaqAccordionItem = ({ question, answer, isPlaceholder = false }: FaqAccordionItemProps) => (
  <details
    className={cn(
      'group card-base p-0 overflow-hidden',
      isPlaceholder && 'border-dashed border-zinc-300 dark:border-zinc-700',
    )}
  >
    <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span
        className={cn(
          'text-sm font-semibold',
          isPlaceholder
            ? 'italic text-zinc-500 dark:text-zinc-500'
            : 'text-zinc-900 dark:text-white',
        )}
      >
        {question}
      </span>
      <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-3">
      {isPlaceholder && (
        <Badge color="zinc" variant="outline" icon={PenLine}>
          Placeholder — add your answer.
        </Badge>
      )}
      <p
        className={cn(
          'text-sm leading-relaxed',
          isPlaceholder
            ? 'italic text-zinc-500 dark:text-zinc-500'
            : 'text-zinc-600 dark:text-zinc-400',
        )}
      >
        {answer}
      </p>
    </div>
  </details>
);

export default FaqAccordionItem;
