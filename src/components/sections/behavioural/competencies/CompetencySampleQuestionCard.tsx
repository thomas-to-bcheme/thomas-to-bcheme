import React from 'react';
import { ChevronDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { CompetencySampleQuestion, HssStoryGuidance } from '@/constants/behavioural/competencies/types';
import { CAREER_LEVELS } from '@/constants/behavioural/careerLevels';
import { LEVEL_BADGE_COLORS, LEVEL_BORDER_CLASSES } from '@/lib/careerLevelPresentation';

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
 * context/headline hints and behavioral-core moments, then a full
 * Junior→Principal level-signal ladder styled identically to
 * SeniorVsStaffSection's dimension rows, followed by one worked example.
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
        <span className="text-micro text-zinc-400 mb-1.5 block">Level Signal</span>
        <div className="space-y-2.5">
          {CAREER_LEVELS.map((level) => (
            <div
              key={level.id}
              className={`rounded-lg border-l-2 pl-3 ${LEVEL_BORDER_CLASSES[level.id]}`}
            >
              <Badge color={LEVEL_BADGE_COLORS[level.id]} variant="outline">
                {level.label}
              </Badge>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {question.levelSignal[level.id]}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3">
        <span className="text-micro text-zinc-400 mb-1.5 block">Worked Example</span>
        <Badge color={LEVEL_BADGE_COLORS[question.workedExample.level]} variant="outline">
          {CAREER_LEVELS.find((level) => level.id === question.workedExample.level)?.label ?? question.workedExample.level}
        </Badge>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {question.workedExample.story}
        </p>
      </div>
    </div>
  </details>
);

export default CompetencySampleQuestionCard;
