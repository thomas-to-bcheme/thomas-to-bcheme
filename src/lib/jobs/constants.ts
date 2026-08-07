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
 * Roles per page. 12 divides evenly across every BentoGrid breakpoint
 * (grid-cols-1 / md:grid-cols-2 / lg:grid-cols-4 — see
 * src/components/layout/BentoGrid.tsx), so a page never ends on a partial,
 * ragged row.
 */
export const JOBS_PAGE_SIZE = 12;

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
