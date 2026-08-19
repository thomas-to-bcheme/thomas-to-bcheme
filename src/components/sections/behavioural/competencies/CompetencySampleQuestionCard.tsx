import React from 'react';
import { ChevronDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { CompetencySampleQuestion, HssStoryGuidance } from '@/constants/behavioural/competencies/types';

interface CompetencySampleQuestionCardProps {
  question: CompetencySampleQuestion;
}

interface HssRow {
  label: string;
  key: keyof HssStoryGuidance;
}

const HSS_ROWS: HssRow[] = [
  { label: 'Context', key: 'contextHint' },
  { label: 'Headline', key: 'headlineHint' },
];

/**
 * <details>/<summary> accordion for one competency sample question — same
 * idiom as BehaviouralCategoryCard, swapped from STAR guidance to HSS
 * (High-Signal Storytelling) guidance. Summary surfaces the question's
 * category and prompt; the body expands into framing notes plus
 * context/headline hints and behavioral-core moments, then a senior/staff
 * level-signal contrast identical in styling to BehaviouralCategoryCard's.
 */
const CompetencySampleQuestionCard = ({ question }: CompetencySampleQuestionCardProps) => (
  <details className="group card-base p-0 overflow-hidden">
    <summary className="flex items-start justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
          {question.category}
        </span>
        <span className="mt-1 block text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
          &ldquo;{question.prompt}&rdquo;
        </span>
      </div>
      <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {question.framingNotes}
      </p>
      <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 space-y-3">
        {HSS_ROWS.map((row) => (
          <div key={row.key}>
            <span className="text-micro text-zinc-400 mb-1 block">{row.label}</span>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {question.hssGuidance[row.key]}
            </p>
          </div>
        ))}
        <div>
          <span className="text-micro text-zinc-400 mb-1.5 block">Behavioral Core</span>
          <ul className="space-y-1.5">
            {question.hssGuidance.behavioralCoreMoments.map((moment) => (
              <li
                key={moment}
                className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700"
              >
                {moment}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <span className="text-micro text-zinc-400 mb-1.5 block">Senior vs. Staff</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-blue-400 dark:border-l-blue-500 p-3">
            <Badge color="blue" variant="outline">
              Senior
            </Badge>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {question.levelSignal.senior}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-purple-400 dark:border-l-purple-500 p-3">
            <Badge color="purple" variant="outline">
              Staff
            </Badge>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {question.levelSignal.staff}
            </p>
          </div>
        </div>
      </div>
    </div>
  </details>
);

export default CompetencySampleQuestionCard;
