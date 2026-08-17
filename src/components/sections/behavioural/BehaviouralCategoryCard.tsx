import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { BehaviouralQuestionCategory, StarGuidance } from '@/constants/behavioural';

interface BehaviouralCategoryCardProps {
  category: BehaviouralQuestionCategory;
}

interface StarRow {
  marker: string;
  label: string;
  key: keyof StarGuidance;
}

const STAR_ROWS: StarRow[] = [
  { marker: 'S', label: 'Situation', key: 'situation' },
  { marker: 'T', label: 'Task', key: 'task' },
  { marker: 'A', label: 'Action', key: 'action' },
  { marker: 'R', label: 'Result', key: 'result' },
];

/**
 * <details>/<summary> accordion for one behavioural question category —
 * same idiom as FaqAccordionItem. Summary surfaces the category label and a
 * representative example question; the body expands into how-to-approach
 * framing notes plus per-letter STAR guidance specific to this category.
 */
const BehaviouralCategoryCard = ({ category }: BehaviouralCategoryCardProps) => (
  <details className="group card-base p-0 overflow-hidden">
    <summary className="flex items-start justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
          {category.category}
        </span>
        <span className="mt-1 block text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
          &ldquo;{category.prompt}&rdquo;
        </span>
      </div>
      <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {category.framingNotes}
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STAR_ROWS.map((row) => (
          <div
            key={row.key}
            className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"
          >
            <dt className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {row.marker}
              </span>
              <span className="text-micro text-zinc-400">{row.label}</span>
            </dt>
            <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {category.starGuidance[row.key]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </details>
);

export default BehaviouralCategoryCard;
