import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DE_LIFECYCLE_STAGES,
  DE_UNDERCURRENTS,
  DE_DOWNSTREAM_OUTPUTS,
  type LifecycleTone,
} from '@/constants/systemDesignPrep/foundations';

// Literal class strings per tone (Tailwind can't see interpolated names).
const TONE_CLASSES: Record<LifecycleTone, string> = {
  rose: 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-100',
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100',
  violet: 'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-100',
  sky: 'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-100',
  zinc: 'bg-zinc-100 border-zinc-300 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200',
  amber: 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100',
  purple: 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-100',
  blue: 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-100',
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-950/60 dark:border-yellow-800 dark:text-yellow-100',
  teal: 'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-100',
  pink: 'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-950/60 dark:border-pink-800 dark:text-pink-100',
  orange: 'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-950/60 dark:border-orange-800 dark:text-orange-100',
};

const OUTPUT_TONE: LifecycleTone = 'amber';

const BOX_CLASS =
  'flex items-center justify-center rounded-lg border px-3 py-2.5 text-center text-sm font-semibold leading-tight transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/** Flow arrow — points down while the figure is stacked (below `sm:`), right once it's a row. */
const FlowArrow = () => (
  <ArrowRight
    size={18}
    aria-hidden="true"
    className="mx-auto shrink-0 rotate-90 sm:rotate-0 stroke-[2.5] text-zinc-400 dark:text-zinc-600"
  />
);

export const deStageAnchor = (id: string) => `de-stage-${id}`;
export const deUndercurrentAnchor = (id: string) => `de-undercurrent-${id}`;
export const deOutputAnchor = (id: string) => `de-output-${id}`;

const stagesInLayer = (layer: (typeof DE_LIFECYCLE_STAGES)[number]['layer']) =>
  DE_LIFECYCLE_STAGES.filter((stage) => stage.layer === layer);

/**
 * The data engineering lifecycle figure (Reis & Housley), rebuilt as
 * semantic HTML instead of an embedded image: legible in dark mode, readable
 * by screen readers, and every box links to its explanation below. Layout is
 * derived entirely from each stage's `layer` and the array order in
 * dataEngineeringLifecycle.ts — source → [pipeline row on a foundation
 * layer] → downstream outputs, with the undercurrents underneath.
 */
const DataEngineeringLifecycleDiagram = () => {
  const sourceStages = stagesInLayer('source');
  const pipelineStages = stagesInLayer('pipeline');
  const foundationStages = stagesInLayer('foundation');

  return (
    <figure className="card-base p-4 sm:p-6">
      <p className="mb-4 text-center text-base font-bold text-zinc-900 dark:text-white">Data engineering lifecycle</p>

      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,7rem)_auto_minmax(0,1fr)_auto_minmax(0,8rem)] sm:items-center">
        <div className="flex flex-col gap-2">
          {sourceStages.map((stage) => (
            <a
              key={stage.id}
              href={`#${deStageAnchor(stage.id)}`}
              className={cn(BOX_CLASS, 'min-h-16 border-2', TONE_CLASSES[stage.tone])}
            >
              {stage.label}
            </a>
          ))}
        </div>

        <FlowArrow />

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950 p-2 sm:p-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {pipelineStages.map((stage, index) => (
              <div key={stage.id} className="contents">
                {index > 0 && (
                  <div className="flex items-center justify-center">
                    <FlowArrow />
                  </div>
                )}
                <a
                  href={`#${deStageAnchor(stage.id)}`}
                  className={cn(BOX_CLASS, 'flex-1 min-h-14', TONE_CLASSES[stage.tone])}
                >
                  {stage.label}
                </a>
              </div>
            ))}
          </div>
          {foundationStages.map((stage) => (
            <a
              key={stage.id}
              href={`#${deStageAnchor(stage.id)}`}
              className={cn(BOX_CLASS, 'w-full', TONE_CLASSES[stage.tone])}
            >
              {stage.label}
            </a>
          ))}
        </div>

        <FlowArrow />

        <div className="flex flex-col gap-2">
          {DE_DOWNSTREAM_OUTPUTS.map((output) => (
            <a
              key={output.id}
              href={`#${deOutputAnchor(output.id)}`}
              className={cn(BOX_CLASS, TONE_CLASSES[OUTPUT_TONE])}
            >
              {output.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t-2 border-zinc-800 dark:border-zinc-300 pt-3">
        <p className="mb-3 text-center text-sm font-bold text-zinc-900 dark:text-white">Undercurrents</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {DE_UNDERCURRENTS.map((undercurrent) => (
            <a
              key={undercurrent.id}
              href={`#${deUndercurrentAnchor(undercurrent.id)}`}
              className={cn(BOX_CLASS, 'text-xs', TONE_CLASSES[undercurrent.tone])}
            >
              {undercurrent.label}
            </a>
          ))}
        </div>
      </div>

      <figcaption className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
        Adapted from Reis &amp; Housley, <em>Fundamentals of Data Engineering</em>{' '}
        (O&apos;Reilly, 2022).
        Select any box to jump to its explanation.
      </figcaption>
    </figure>
  );
};

export default DataEngineeringLifecycleDiagram;
