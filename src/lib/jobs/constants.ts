// Pure constants shared by the Job Board's server-rendered page
// (src/app/jobs/page.tsx), its public API route (src/app/api/jobs/route.ts),
// and the query layer (src/lib/db/jobs.ts). Deliberately has no dependency on
// @neondatabase/serverless or any env var — src/lib/db/jobs.ts throws at
// import time if JOBS_DATABASE_URL is unset, and these values need to be
// importable (e.g. for UI copy) without pulling that in.

/**
 * The "recent" bucket cutoff, in days. Single source of truth for both the
 * SQL cutoff computed by getRecentCutoffDate() and the "Last N days" label in
 * JobFilters — the literal 30 exists nowhere else, so changing the threshold
 * never requires touching more than one line.
 */
export const RECENT_WINDOW_DAYS = 30;

/**
 * Allowed "results per page" choices for the Job Board's page-size selector.
 * 'all' means no LIMIT — every matching role on one page. Single source of
 * truth for both the server-side validation in queryParams.ts (anything not
 * in this list falls back to DEFAULT_JOBS_PAGE_SIZE) and the <select>
 * options rendered in JobFilters/JobPagination, so the UI can never offer a
 * value the server would reject.
 *
 * Grid alignment is NOT this array's concern — BentoGrid (see
 * src/components/layout/BentoGrid.tsx's `fillLastRow` prop) pads any
 * rendered count up to a full row generically, so page size is free to be
 * any value here without producing a ragged last row.
 */
export const JOBS_PAGE_SIZE_OPTIONS = [12, 24, 48, 'all'] as const;
export type JobsPageSize = (typeof JOBS_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_JOBS_PAGE_SIZE: JobsPageSize = 12;

/**
 * Delay after the user stops typing in the Job Board search box before the
 * query re-runs (src/hooks/useDebouncedValue.ts). Single source of truth so
 * the "feels live" tuning only ever needs to change in one place.
 */
export const JOBS_SEARCH_DEBOUNCE_MS = 450;

/**
 * Today minus RECENT_WINDOW_DAYS, as a YYYY-MM-DD date string bound directly
 * as a SQL parameter (never string-interpolated into query text). Computed
 * off UTC, matching the UTC-midnight convention src/components/features/
 * JobCard.tsx already uses when displaying posted_date — using local server
 * time here would drift the recent/older boundary depending on which region
 * the serverless function happens to run in.
 */
export function getRecentCutoffDate(): string {
  const cutoffMs = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return new Date(cutoffMs).toISOString().slice(0, 10);
}
