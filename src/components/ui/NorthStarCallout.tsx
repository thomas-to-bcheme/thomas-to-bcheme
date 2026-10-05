import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NORTH_STAR } from '@/constants/northStar';
import { FRAMING_DECISION_TREE } from '@/constants/systemDesignPrep/framingDecisionTree';

type NorthStarTone = 'blue' | 'emerald';

const TONE_CLASSES: Record<NorthStarTone, { box: string; label: string; quote: string }> = {
  blue: {
    box: 'border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10',
    label: 'text-blue-700 dark:text-blue-400',
    quote: 'text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  },
  emerald: {
    box: 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10',
    label: 'text-emerald-700 dark:text-emerald-400',
    quote: 'text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
  },
};

interface NorthStarCalloutProps {
  tone?: NorthStarTone;
  label?: string;
}

/**
 * The North Star quote callout. Hook-free, so it renders inside both server
 * and 'use client' sections.
 */
export const NorthStarCallout = ({ tone = 'blue', label = 'North Star' }: NorthStarCalloutProps) => {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className={cn('rounded-xl border p-5 sm:p-6', toneClasses.box)}>
      <span
        className={cn(
          'flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider mb-3',
          toneClasses.label,
        )}
      >
        <Quote size={12} className="stroke-[2.5]" /> {label}
      </span>
      <blockquote
        className={cn('text-sm sm:text-base italic leading-relaxed border-l-2 pl-4', toneClasses.quote)}
      >
        &quot;{NORTH_STAR.quote}&quot;
      </blockquote>
      <p className={cn('text-xs font-semibold mt-3', toneClasses.label)}>— {NORTH_STAR.attribution}</p>
    </div>
  );
};

/** The ordered what → why → how questions that apply the North Star. */
export const NorthStarQuestions = () => (
  <div>
    <h3 className="text-micro font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
      Applying the North Star — three questions, in order
    </h3>
    <ol className="space-y-3">
      {FRAMING_DECISION_TREE.map((decision) => (
        <li key={decision.id} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-400">
            {decision.stepNumber}
          </span>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{decision.question}</p>
            <p>{decision.focus}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              <span className="font-semibold">Unlocks:</span> {decision.unlocks}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </div>
);
