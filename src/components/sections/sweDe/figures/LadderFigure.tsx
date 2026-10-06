import { cn } from '@/lib/utils';
import type { LadderFigureSpec } from '@/constants/sweDe';
import { TONE_CLASSES } from './tones';

/** Shortest bar, as a share of the track, so the smallest rung stays visible. */
const MIN_BAR_PERCENT = 6;
const MAX_BAR_PERCENT = 100;

const barPercent = (log10Value: number, minLog: number, maxLog: number): number => {
  if (maxLog === minLog) return MAX_BAR_PERCENT;
  const fraction = (log10Value - minLog) / (maxLog - minLog);
  return MIN_BAR_PERCENT + fraction * (MAX_BAR_PERCENT - MIN_BAR_PERCENT);
};

/**
 * Tiers with a log-scaled bar each, so values that differ by orders of
 * magnitude (cache vs disk vs network) read at a glance. The value label
 * carries the real number; the bar only conveys relative size.
 */
const LadderFigure = ({ axisLabel, rungs }: Pick<LadderFigureSpec, 'axisLabel' | 'rungs'>) => {
  const logValues = rungs.map((rung) => rung.log10Value);
  const minLog = Math.min(...logValues);
  const maxLog = Math.max(...logValues);

  return (
    <div>
      <p className="mb-3 text-micro font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{axisLabel}</p>
      <ol className="space-y-2">
        {rungs.map((rung) => (
          <li key={rung.id} className="grid gap-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{rung.label}</p>
              <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{rung.detail}</p>
            </div>
            <div className="flex items-center gap-2" aria-hidden="true">
              <div
                className={cn('h-5 rounded border', TONE_CLASSES[rung.tone])}
                style={{ width: `${barPercent(rung.log10Value, minLog, maxLog)}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 sm:col-start-2 sm:-mt-1">{rung.valueLabel}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default LadderFigure;
