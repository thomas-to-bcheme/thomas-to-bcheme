'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { buildJobsSearch, type JobsQueryParams, type JobsDateRange, type JobsFitSort } from '@/lib/jobs/queryParams';
import { RECENT_WINDOW_DAYS, JOBS_SEARCH_DEBOUNCE_MS, type JobsPageSize } from '@/lib/jobs/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';

interface JobFiltersProps {
  params: JobsQueryParams;
  companyOptions: string[];
}

const RANGE_OPTIONS: { value: JobsDateRange; label: string }[] = [
  { value: 'recent', label: `Last ${RECENT_WINDOW_DAYS} days` },
  { value: 'older', label: 'Older' },
];

// Secondary sort by the pipeline's fit_score (see JobsFitSort's doc comment)
// — deliberately just these three states, not a general sort-by-column
// control (no alphabetical/numerical sort by other fields is offered).
const FIT_SORT_OPTIONS: { value: JobsFitSort; label: string }[] = [
  { value: null, label: 'Date' },
  { value: 'best', label: 'Most relevant' },
  { value: 'worst', label: 'Least relevant' },
];

/**
 * Segmented date-range toggle + relevance-sort toggle + company filter +
 * search box + page-size selector for the Job Board. Reads its current state
 * entirely from props
 * (already resolved server-side by src/app/jobs/page.tsx) rather than
 * useSearchParams(), so it needs no Suspense boundary. Every control
 * navigates via router.push() inside a transition, which re-renders the
 * Server Component page and re-queries Neon with the new filters — any
 * change here resets `page` to 1, since a different range/company/search
 * invalidates whatever "page 2" meant under the old filters. `{ scroll:
 * false }` keeps the visitor's scroll position in place instead of jumping
 * to the top on every filter change.
 */
const JobFilters = ({ params, companyOptions }: JobFiltersProps) => {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const navigate = (next: {
    range?: JobsDateRange;
    company?: string | null;
    search?: string | null;
    pageSize?: JobsPageSize;
    fitSort?: JobsFitSort;
  }) => {
    startTransition(() => {
      router.push(
        buildJobsSearch({
          range: next.range ?? params.range,
          company: next.company !== undefined ? next.company : params.company,
          search: next.search !== undefined ? next.search : params.search,
          pageSize: next.pageSize ?? params.pageSize,
          fitSort: next.fitSort !== undefined ? next.fitSort : params.fitSort,
          page: 1,
        }),
        { scroll: false }
      );
    });
  };

  // Local input state so typing feels instant; the debounced echo below is
  // what actually triggers navigation, ~JOBS_SEARCH_DEBOUNCE_MS after typing
  // pauses.
  const [searchInput, setSearchInput] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, JOBS_SEARCH_DEBOUNCE_MS);
  // Tracks what THIS component last pushed to the router, so an external URL
  // change (Clear filters link, browser back/forward) can be told apart from
  // "our own debounced push just landed" — that distinction is what prevents
  // the two effects below from ping-ponging each other.
  const lastSyncedSearchRef = useRef(params.search);

  // External change → sync the input.
  useEffect(() => {
    if (params.search === lastSyncedSearchRef.current) return;
    lastSyncedSearchRef.current = params.search;
    setSearchInput(params.search ?? '');
  }, [params.search]);

  // Debounce settled → navigate, but only if it actually differs from what's
  // already live in the URL (guards both the initial mount and the round
  // trip back from our own navigate() call).
  useEffect(() => {
    const normalized = debouncedSearch.trim() || null;
    if (normalized === params.search) return;
    lastSyncedSearchRef.current = normalized;
    navigate({ search: normalized });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6 mb-6">
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
                disabled={isPending}
                aria-pressed={isActive}
                className={cn(
                  'relative px-4 py-1.5 text-sm font-semibold rounded-md transition-colors disabled:cursor-wait',
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

      <div className="flex flex-col gap-1.5">
        <span className="text-micro text-zinc-400">Relevance</span>
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {FIT_SORT_OPTIONS.map((option) => {
            const isActive = params.fitSort === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => navigate({ fitSort: option.value })}
                disabled={isPending}
                aria-pressed={isActive}
                className={cn(
                  'relative px-4 py-1.5 text-sm font-semibold rounded-md transition-colors disabled:cursor-wait',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black',
                  isActive
                    ? 'text-white dark:text-black'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="job-fitsort-indicator"
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
          disabled={isPending}
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

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <label htmlFor="job-search" className="text-micro text-zinc-400">
          Search
        </label>
        <input
          id="job-search"
          type="search"
          className="input-base appearance-none"
          placeholder="Search title or company…"
          value={searchInput}
          // Deliberately never disabled while isPending — disabling mid-
          // debounce would block further typing, defeating the point.
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
    </div>
  );
};

export default JobFilters;
