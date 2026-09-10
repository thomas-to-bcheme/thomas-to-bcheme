import Link from 'next/link';

import Badge from '@/components/ui/Badge';
import { AI_ML_CATEGORIES } from '@/constants/aiMl/categories';
import { getModelBySlug } from '@/constants/aiMl';
import {
  CATEGORY_VERDICT_LABELS,
  type AppliedDomain,
  type CategoryVerdict,
} from '@/constants/aiMl/types';

type BadgeColor = 'green' | 'blue' | 'amber' | 'zinc';

const VERDICT_COLORS: Record<CategoryVerdict, BadgeColor> = {
  default: 'green',
  strong: 'blue',
  situational: 'amber',
  rarely: 'zinc',
};

interface CategoryFitMatrixProps {
  domain: AppliedDomain;
}

/**
 * The four-way "which category, and why" verdict for one applied domain.
 *
 * The same component on all nine domain pages, so the comparison is rendered
 * identically everywhere and cannot drift between them. Every category gets a
 * cell — including the ones rated `rarely` — because an argued "no" is more
 * useful than an omission, and omission is what lets a reader assume the
 * question was never considered.
 */
const CategoryFitMatrix = ({ domain }: CategoryFitMatrixProps) => (
  <div className="grid gap-4 md:grid-cols-2">
    {AI_ML_CATEGORIES.map((category) => {
      const fit = domain.categoryFit[category.id];
      const Icon = category.icon;

      return (
        <div key={category.id} className="card-base p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Icon size={16} className="text-zinc-400 stroke-[2.5]" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{category.label}</h3>
            <Badge color={VERDICT_COLORS[fit.verdict]} variant="outline">
              {CATEGORY_VERDICT_LABELS[fit.verdict]}
            </Badge>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{fit.why}</p>

          {fit.representativeSlugs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fit.representativeSlugs.map((slug) => {
                const model = getModelBySlug(slug);
                // Unresolved slugs are expected while content is still landing;
                // verifyAiMl WARNs on them structurally and fails once the
                // category is marked complete.
                if (!model) {
                  return (
                    <span
                      key={slug}
                      className="px-2 py-1 rounded text-xs font-medium text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-300 dark:border-zinc-700"
                    >
                      {slug}
                    </span>
                  );
                }
                return (
                  <Link
                    key={slug}
                    href={`/ai-ml/${model.category}/${model.slug}`}
                    className="tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {model.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default CategoryFitMatrix;
