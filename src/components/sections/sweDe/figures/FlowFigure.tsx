import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowFigureSpec, FlowStep } from '@/constants/sweDe';
import { TONE_CLASSES } from './tones';

const STEP_CLASS = 'flex w-full flex-1 flex-col justify-center rounded-lg border px-3 py-2.5 text-center';

/** Points down while the lane is stacked (below `sm:`), right once it's a row. */
const FlowArrow = () => (
  <ArrowRight
    size={18}
    aria-hidden="true"
    className="shrink-0 rotate-90 sm:rotate-0 stroke-[2.5] text-zinc-400 dark:text-zinc-600"
  />
);

const StepBox = ({ step }: { step: FlowStep }) => (
  <div className={cn(STEP_CLASS, TONE_CLASSES[step.tone])}>
    <p className="text-sm font-semibold leading-tight">{step.label}</p>
    {step.detail && <p className="mt-1 text-xs leading-snug opacity-80">{step.detail}</p>}
  </div>
);

/**
 * Lanes of steps joined by arrows, in array order. Layout is derived entirely
 * from the spec, so a new flow is data only. A lane marked unordered drops the arrows. Several lanes read top to bottom
 * as alternatives to compare.
 */
const FlowFigure = ({ lanes }: Pick<FlowFigureSpec, 'lanes'>) => (
  <div className="space-y-5">
    {lanes.map((lane) => (
      <div key={lane.id}>
        <p className="mb-2 text-micro font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{lane.title}</p>
        {lane.isUnordered === true ? (
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {lane.steps.map((step) => (
              <li key={step.id} className="flex flex-1 sm:min-w-[9rem]">
                <StepBox step={step} />
              </li>
            ))}
          </ul>
        ) : (
          <ol className="flex flex-col items-stretch gap-2 sm:flex-row">
            {lane.steps.map((step, position) => (
              <li key={step.id} className="flex flex-1 flex-col items-center gap-2 sm:flex-row">
                <StepBox step={step} />
                {position < lane.steps.length - 1 && <FlowArrow />}
              </li>
            ))}
          </ol>
        )}
      </div>
    ))}
  </div>
);

export default FlowFigure;
