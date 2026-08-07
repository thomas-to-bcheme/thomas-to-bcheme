import Button from '@/components/ui/Button';
import { buildJobsSearch, type JobsQueryParams } from '@/lib/jobs/queryParams';
import { JOBS_PAGE_SIZE } from '@/lib/jobs/constants';

interface JobPaginationProps {
  params: JobsQueryParams;
  totalPages: number;
  totalCount: number;
  resultCount: number;
}

/**
 * Prev/Next pagination for the Job Board. Deliberately NOT a client
 * component — Prev/Next render as plain <a href> links via buildJobsSearch(),
 * so paging works without JS and a page link is shareable. Disabled
 * boundaries (page 1 / last page) render as a plain disabled Button with no
 * href, since Button (src/components/ui/Button.tsx) doesn't support a
 * disabled anchor state.
 */
const JobPagination = ({ params, totalPages, totalCount, resultCount }: JobPaginationProps) => {
  if (totalCount === 0) return null;

  const { page } = params;
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;
  const rangeStart = (page - 1) * JOBS_PAGE_SIZE + 1;
  const rangeEnd = rangeStart + resultCount - 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-2 border-t border-zinc-200 dark:border-zinc-800">
      <p className="text-sm text-subtle">
        Showing {rangeStart}–{rangeEnd} of {totalCount} role{totalCount === 1 ? '' : 's'}
      </p>

      <div className="flex items-center gap-3">
        {isFirstPage ? (
          <Button variant="secondary" disabled>
            Previous
          </Button>
        ) : (
          <Button variant="secondary" href={buildJobsSearch({ ...params, page: page - 1 })}>
            Previous
          </Button>
        )}

        <span className="text-sm text-subtle whitespace-nowrap">
          Page {page} of {totalPages}
        </span>

        {isLastPage ? (
          <Button variant="secondary" disabled>
            Next
          </Button>
        ) : (
          <Button variant="secondary" href={buildJobsSearch({ ...params, page: page + 1 })}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default JobPagination;
