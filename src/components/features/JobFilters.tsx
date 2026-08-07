'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { buildJobsSearch, type JobsQueryParams, type JobsDateRange } from '@/lib/jobs/queryParams';
import { RECENT_WINDOW_DAYS } from '@/lib/jobs/constants';
import { cn } from '@/lib/utils';

interface JobFiltersProps {
  params: JobsQueryParams;
  companyOptions: string[];
}

const RANGE_OPTIONS: { value: JobsDateRange; label: string }[] = [
  { value: 'recent', label: `Last ${RECENT_WINDOW_DAYS} days` },
  { value: 'older', label: 'Older' },
];

/**
 * Segmented date-range toggle + company filter for the Job Board. Reads its
 * current state entirely from props (range/company already resolved
 * server-side by src/app/jobs/page.tsx) rather than useSearchParams(), so it
 * needs no Suspense boundary. Both controls navigate via router.push(),
 * which re-renders the Server Component page and re-queries Neon with the
 * new filters — any change here resets `page` to 1, since a different
 * range/company invalidates whatever "page 2" meant under the old filter.
 */
const JobFilters = ({ params, companyOptions }: JobFiltersProps) => {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const navigate = (next: { range?: JobsDateRange; company?: string | null }) => {
    router.push(
      buildJobsSearch({
        range: next.range ?? params.range,
        company: next.company !== undefined ? next.company : params.company,
        page: 1,
      })
    );
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 mb-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-micro text-zinc-400">Posted</span>
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {RANGE_OPTIONS.map((option) => {
            const isActive = params.range === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => navigate({ range: option.value })}
                aria-pressed={isActive}
                className={cn(
                  'relative px-4 py-1.5 text-sm font-semibold rounded-md transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
                  isActive
                    ? 'text-white dark:text-black'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="job-range-indicator"
                    className="absolute inset-0 bg-zinc-900 dark:bg-white rounded-md"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-56">
        <label htmlFor="job-company-filter" className="text-micro text-zinc-400">
          Company
        </label>
        <select
          id="job-company-filter"
          className="input-base"
          value={params.company ?? ''}
          onChange={(event) => navigate({ company: event.target.value === '' ? null : event.target.value })}
        >
          <option value="">All companies</option>
          {companyOptions.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default JobFilters;
