import Link from 'next/link';

import MathBlock from '@/components/ui/MathBlock';
import { getDomainById } from '@/constants/aiMl';
import {
  OPERATIONAL_GOALS,
  OPERATIONAL_GOAL_INTRO,
} from '@/constants/aiMl/operationalGoals';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

const CELL = 'align-top p-4 border-t border-zinc-100 dark:border-zinc-900';
const HEADER_CELL =
  'text-left p-4 text-micro text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * The operational-goal taxonomy: goals -> applied topics -> implementation.
 *
 * A real <table> rather than a card grid, because the value here is the
 * column-wise comparison — reading down "Implementation Mapping" across all
 * eight goals is the point, and cards destroy that. It scrolls inside its own
 * overflow-x-auto container so the page body never scrolls horizontally, and
 * carries a min-width so the columns stay legible rather than collapsing to
 * one word per line.
 *
 * relatedDomainIds link each row into the applied-domain pages, so this reads
 * as the top of the site's own hierarchy rather than as a standalone chart.
 */
const OperationalGoalTaxonomy = () => (
  <div>
    <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {OPERATIONAL_GOAL_INTRO}
    </p>

    <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[64rem] border-collapse text-left">
        <caption className="sr-only">
          Complete taxonomy overview by operational goal
        </caption>
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className={`${HEADER_CELL} w-[16%]`}>
              Operational goal
            </th>
            <th scope="col" className={`${HEADER_CELL} w-[20%]`}>
              Applied topics
            </th>
            <th scope="col" className={`${HEADER_CELL} w-[34%]`}>
              Functional rationale
            </th>
            <th scope="col" className={`${HEADER_CELL} w-[30%]`}>
              Implementation mapping
            </th>
          </tr>
        </thead>

        <tbody>
          {OPERATIONAL_GOALS.map((goal) => (
            <tr key={goal.id} id={goal.id} className="scroll-mt-24">
              <th scope="row" className={`${CELL} font-bold text-sm text-zinc-900 dark:text-white`}>
                {goal.label}

                {goal.relatedDomainIds.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {goal.relatedDomainIds.map((domainId) => {
                      const domain = getDomainById(domainId);
                      if (!domain) return null;
                      return (
                        <Link
                          key={domainId}
                          href={`/ai-ml/applied/${domain.id}`}
                          className={`tag-blue font-normal hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors ${FOCUS_RING}`}
                        >
                          {domain.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </th>

              <td className={CELL}>
                <ul className="space-y-1.5">
                  {goal.appliedTopics.map((topic) => (
                    <li key={topic} className={LIST_ITEM_CLASS}>
                      {topic}
                    </li>
                  ))}
                </ul>
              </td>

              <td className={CELL}>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {goal.rationaleLead}:{' '}
                  </span>
                  {goal.rationale}
                </p>
                {goal.rationaleMath && (
                  <MathBlock math={goal.rationaleMath} className="mt-2" />
                )}
              </td>

              <td className={CELL}>
                <div className="flex flex-wrap gap-1.5">
                  {goal.implementation.map((tool) => (
                    <span key={tool} className="tag-blue font-normal">
                      {tool}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500 lg:hidden">
      Scroll the table horizontally to see all four columns.
    </p>
  </div>
);

export default OperationalGoalTaxonomy;
