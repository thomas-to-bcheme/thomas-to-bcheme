'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { buildJobsSearch, type JobsQueryParams } from '@/lib/jobs/queryParams';
import { JOBS_PAGE_SIZE_OPTIONS, type JobsPageSize } from '@/lib/jobs/constants';

interface JobPaginationProps {
  params: JobsQueryParams;
  totalPages: number;
  totalCount: number;
  resultCount: number;
}

/**
 * Prev/Next pagination + results-per-page selector for the Job Board.
 * Client component (converted from a plain <a href> link, per the in-place
 * paging requirement): router.push() runs inside a transition with
 * { scroll: false }, so clicking Prev/Next or changing page size swaps the
 * board's content without resetting scroll position or blanking the page
 * while the next Server Component payload loads — the previous results stay
 * visible (dimmed via isPending) until the new ones arrive.
 *
 * Tradeoff, flagged not hidden: this means Prev/Next now require JS (no
 * <a href> fallback), extending a tradeoff JobFilters already made today for
 * its range/company controls — not a new class of regression. A no-JS
 * visitor still gets the correct current page server-rendered; only
 * *changing* pages needs JS now.
 */
const JobPagination = ({ params, totalPages, totalCount, resultCount }: JobPaginationProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (totalCount === 0) return null;

  const { page, pageSize } = params;
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  // When pageSize is 'all', page/totalPages are always 1 (enforced in
  // src/lib/jobs/queryParams.ts), so effectivePageSize only ever matters for
  // the numeric page sizes it's meant for.
  const effectivePageSize = pageSize === 'all' ? totalCount : pageSize;
  const rangeStart = (page - 1) * effectivePageSize + 1;
  const rangeEnd = rangeStart + resultCount - 1;

  const goTo = (next: { page?: number; pageSize?: JobsPageSize }) => {
    startTransition(() => {
      router.push(
        buildJobsSearch({
          ...params,
          page: next.page ?? params.page,
          pageSize: next.pageSize ?? params.pageSize,
        }),
        { scroll: false }
      );
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-2 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-4">
        <p className="text-sm text-subtle" aria-live="polite">
          Showing {rangeStart}–{rangeEnd} of {totalCount} role{totalCount === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-1.5">
          <label htmlFor="job-page-size" className="text-sm text-subtle whitespace-nowrap">
            Per page
          </label>
          <select
            id="job-page-size"
            className="input-base py-1"
            value={pageSize}
            disabled={isPending}
            onChange={(event) => {
              const rawValue = event.target.value;
              const nextPageSize = rawValue === 'all' ? 'all' : (Number.parseInt(rawValue, 10) as JobsPageSize);
              goTo({ pageSize: nextPageSize, page: 1 });
            }}
          >
            {JOBS_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size === 'all' ? 'All' : size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => goTo({ page: page - 1 })}
          disabled={isFirstPage || isPending}
        >
          Previous
        </Button>

        <span className="text-sm text-subtle whitespace-nowrap">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="secondary"
          onClick={() => goTo({ page: page + 1 })}
          disabled={isLastPage || isPending}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default JobPagination;
