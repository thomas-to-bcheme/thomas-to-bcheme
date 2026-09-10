import Link from 'next/link';

import { AI_ML_CATEGORIES } from '@/constants/aiMl/categories';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

/**
 * The four categories side by side, by their `premise`.
 *
 * This is the first-principles answer to "why classical ML vs deep learning vs
 * generative vs RL", stated once on the hub rather than re-argued on every
 * model page. Each premise names the assumption the category buys you and what
 * that assumption costs — which is the only framing under which the question
 * has an answer rather than a fashion.
 */
const CategoryComparison = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {AI_ML_CATEGORIES.map((category, index) => {
      const Icon = category.icon;
      return (
        <Link
          key={category.id}
          href={`/ai-ml/${category.id}`}
          className={`card-base p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon size={16} className="text-blue-600 dark:text-blue-400 stroke-[2.5]" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{category.label}</h3>
            <span className="text-micro text-zinc-400 ml-auto">
              {index === 0 ? 'Most general' : index === AI_ML_CATEGORIES.length - 1 ? 'Most specialized' : `Rung ${index + 1}`}
            </span>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {category.premise}
          </p>

          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            {category.groups.length} groups, general to niche
          </p>
        </Link>
      );
    })}
  </div>
);

export default CategoryComparison;
