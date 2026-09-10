import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { getModelBySlug, getModelsByCategory } from '@/constants/aiMl';
import type { AiMlModel } from '@/constants/aiMl/types';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

/**
 * Related-model chips plus previous/next within the category.
 *
 * Category order is already general -> niche, so prev/next walks that
 * progression rather than being alphabetical — moving "next" means moving one
 * rung more specialized.
 */
const ModelSiblingNav = ({ model }: { model: AiMlModel }) => {
  const siblings = getModelsByCategory(model.category);
  const index = siblings.findIndex((sibling) => sibling.slug === model.slug);
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const related = model.relatedSlugs
    .map((slug) => ({ slug, model: getModelBySlug(slug) }))
    .filter((entry) => entry.model !== null);

  return (
    <div className="mt-4 space-y-6">
      {model.relatedSlugs.length > 0 && (
        <div>
          <span className="text-micro text-zinc-400 block mb-2">Related models</span>
          <div className="flex flex-wrap gap-1.5">
            {model.relatedSlugs.map((slug) => {
              const target = related.find((entry) => entry.slug === slug)?.model;
              if (!target) {
                return (
                  <span
                    key={slug}
                    className="px-2 py-1 rounded text-xs font-medium text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-300 dark:border-zinc-700"
                  >
                    {slug} — coming soon
                  </span>
                );
              }
              return (
                <Link
                  key={slug}
                  href={`/ai-ml/${target.category}/${target.slug}`}
                  className={`tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ${FOCUS_RING}`}
                >
                  {target.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(previous || next) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
          {previous ? (
            <Link
              href={`/ai-ml/${previous.category}/${previous.slug}`}
              className={`inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${FOCUS_RING}`}
            >
              <ArrowLeft size={14} /> {previous.name}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/ai-ml/${next.category}/${next.slug}`}
              className={`inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-sm ${FOCUS_RING}`}
            >
              {next.name} <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSiblingNav;
