/**
 * The Job Board's URL contract: ?range=recent|older&company=<name>&page=<n>.
 * Parsing and serialization both live here so src/app/jobs/page.tsx (Server
 * Component), src/app/api/jobs/route.ts (public API), JobFilters, and
 * JobPagination all agree on what these params mean instead of each
 * hand-rolling their own — the same "can't independently drift" invariant
 * src/app/jobs/query.tsx already documents for the underlying query.
 */

export type JobsDateRange = 'recent' | 'older';

export interface JobsQueryParams {
  range: JobsDateRange;
  company: string | null;
  page: number;
}

const DEFAULT_RANGE: JobsDateRange = 'recent';
const DEFAULT_PAGE = 1;

function isJobsDateRange(value: string | null): value is JobsDateRange {
  return value === 'recent' || value === 'older';
}

function parsePage(value: string | null): number {
  if (value === null) return DEFAULT_PAGE;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}

function parseCompany(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses the Job Board's URL contract from a URLSearchParams. Guard clauses:
 * anything malformed or unrecognized (bad range value, blank company,
 * non-positive/non-numeric page) falls back to its default rather than
 * throwing — a mistyped query string degrades to the default view, not a 500.
 */
export function parseJobsQueryParams(searchParams: URLSearchParams): JobsQueryParams {
  return {
    range: isJobsDateRange(searchParams.get('range')) ? (searchParams.get('range') as JobsDateRange) : DEFAULT_RANGE,
    company: parseCompany(searchParams.get('company')),
    page: parsePage(searchParams.get('page')),
  };
}

/**
 * Inverse of parseJobsQueryParams: builds a `/jobs` href for a given param
 * set, omitting anything already at its default so the canonical default
 * view stays a bare `/jobs` rather than `/jobs?range=recent&page=1`.
 */
export function buildJobsSearch(params: JobsQueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.range !== DEFAULT_RANGE) searchParams.set('range', params.range);
  if (params.company !== null) searchParams.set('company', params.company);
  if (params.page !== DEFAULT_PAGE) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  return query.length > 0 ? `/jobs?${query}` : '/jobs';
}
