import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AXIS_COLOR_CLASSES, type SweCompassAxis } from '@/components/features/SweCompassDiagram';
import { RIPPLE_LOOKUP_QUESTIONS } from '@/constants/systemDesignPrep/questions';
import type { SystemDesignQuestion } from '@/constants/systemDesignPrep/questions/types';

interface SystemDesignQuestionCardProps {
  question: SystemDesignQuestion;
}

const AXIS_LABELS: Record<SweCompassAxis, string> = {
  'end-to-end': 'End-to-end',
  abstraction: 'Abstraction',
  time: 'Time',
};

const SUB_QUESTION_CLASS =
  'text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

/**
 * The per-question decision cascade card — question + clarifying
 * sub-questions always visible, axis chips (reusing SweCompassDiagram's own
 * AXIS_COLOR_CLASSES, not a reinvented color scheme), approach options as a
 * compact bordered list, implementation notes behind a "Go deeper"
 * disclosure (FaqAccordionItem's <details> idiom), and ripplesInto resolved
 * against RIPPLE_LOOKUP_QUESTIONS (the full question bank plus the
 * Components of System Design cards) and rendered as anchor-link chips.
 */
const SystemDesignQuestionCard = ({ question }: SystemDesignQuestionCardProps) => {
  const rippleTargets = question.ripplesInto
    .map((id) => RIPPLE_LOOKUP_QUESTIONS.find((candidate) => candidate.id === id))
    .filter((target): target is SystemDesignQuestion => Boolean(target));

  return (
    <article id={question.id} className="card-base p-5 scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {question.axes.map((axis) => (
          <span key={axis} className={cn('text-micro', AXIS_COLOR_CLASSES[axis])}>
            {AXIS_LABELS[axis]}
          </span>
        ))}
      </div>

      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
          {question.question}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {question.clarifyingSubQuestions.map((subQuestion) => (
            <li key={subQuestion} className={SUB_QUESTION_CLASS}>
              {subQuestion}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        {question.approachOptions.map((option) => (
          <div
            key={option.label}
            className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{option.label}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">When to use:</span>{' '}
              {option.whenToUse}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Trade-offs:</span>{' '}
              {option.tradeoffs}
            </p>
          </div>
        ))}
      </div>

      {question.implementationNotes.length > 0 && (
        <details className="group rounded-lg border border-zinc-100 dark:border-zinc-800 overflow-hidden">
          <summary className="flex items-center justify-between gap-4 px-3 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Go deeper
            <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-3 pb-3 space-y-3">
            {question.implementationNotes.map((note) => (
              <div key={note.consideration}>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {note.consideration}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
                  {note.dependsOn}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {rippleTargets.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {rippleTargets.map((target) => (
            <a
              key={target.id}
              href={`#${target.id}`}
              title={target.question}
              className="tag-blue max-w-full truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              Also affects: {target.question} →
            </a>
          ))}
        </div>
      )}
    </article>
  );
};

export default SystemDesignQuestionCard;
