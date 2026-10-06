import { cn } from '@/lib/utils';
import type { StripsFigureSpec } from '@/constants/sweDe';

const CELL_BASE_CLASS = 'rounded border px-2 py-1 text-xs font-medium leading-tight';
const HIGHLIGHTED_CELL_CLASS =
  'bg-blue-100 border-blue-400 text-blue-900 dark:bg-blue-950/70 dark:border-blue-600 dark:text-blue-100';
const DIMMED_CELL_CLASS =
  'bg-zinc-50 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600';

/**
 * Lanes of adjacent cells (bytes on disk, pages in an index) with the cells an
 * operation touches highlighted, so "reads fewer bytes" becomes visible.
 * Highlighting is announced to screen readers, never color alone.
 */
const StripsFigure = ({ legend, lanes }: Pick<StripsFigureSpec, 'legend' | 'lanes'>) => (
  <div className="space-y-5">
    {lanes.map((lane) => (
      <div key={lane.id}>
        <p className="text-micro font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{lane.title}</p>
        {lane.note && <p className="mb-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">{lane.note}</p>}
        <ul className="mt-1 flex flex-wrap gap-1">
          {lane.cells.map((cell) => (
            <li key={cell.id} className={cn(CELL_BASE_CLASS, cell.isHighlighted === true ? HIGHLIGHTED_CELL_CLASS : DIMMED_CELL_CLASS)}>
              {cell.label}
              {cell.isHighlighted === true && <span className="sr-only"> (read)</span>}
            </li>
          ))}
        </ul>
      </div>
    ))}
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      <span aria-hidden="true" className={cn('mr-1.5 inline-block h-2.5 w-2.5 rounded-sm border align-middle', HIGHLIGHTED_CELL_CLASS)} />
      {legend}
    </p>
  </div>
);

export default StripsFigure;
