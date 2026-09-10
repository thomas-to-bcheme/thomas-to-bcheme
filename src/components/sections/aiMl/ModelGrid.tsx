import Link from 'next/link';

import ClassificationBadges from '@/components/ui/ClassificationBadges';
import type { AiMlModel, AppliedDomainId } from '@/constants/aiMl/types';
import { DOMAIN_FIT_LABELS } from '@/constants/aiMl/types';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

interface ModelGridProps {
  models: AiMlModel[];
  /** When set, each card shows that domain's fit instead of the task badges. */
  domainContext?: { id: AppliedDomainId; fitOf: (model: AiMlModel) => string | null };
  /** Shown when there are no models yet. */
  emptyMessage?: string;
}

/**
 * Responsive card grid over a slice of the registry.
 *
 * Shared by the category pages, the hub, and the nine domain pages. The empty
 * state is deliberate rather than defensive: three of four categories are
 * genuinely empty until their content phase, and an honest in-progress note is
 * better than either a crash or a blank region.
 */
const ModelGrid = ({ models, domainContext, emptyMessage }: ModelGridProps) => {
  if (models.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage ?? 'Models for this section are still being written.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => {
        const fit = domainContext?.fitOf(model) ?? null;
        return (
          <Link
            key={model.slug}
            href={`/ai-ml/${model.category}/${model.slug}`}
            className={`card-base p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{model.name}</h3>
              {fit && (
                <span className="tag-emerald shrink-0">
                  {DOMAIN_FIT_LABELS[fit as keyof typeof DOMAIN_FIT_LABELS] ?? fit}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
              {model.intuition}
            </p>

            <div className="mt-3">
              <ClassificationBadges
                paradigms={model.paradigms}
                taskTypes={model.taskTypes}
                architecture={model.architecture}
                compact
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ModelGrid;
