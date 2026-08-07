/**
 * The Job Board's URL contract: ?range=recent|older&company=<name>&q=<text>&pageSize=<n|all>&page=<n>.
 * Parsing and serialization both live here so src/app/jobs/page.tsx (Server
 * Component), src/app/api/jobs/route.ts (public API), JobFilters, and
 * JobPagination all agree on what these params mean instead of each
 * hand-rolling their own — the same "can't independently drift" invariant
 * src/app/jobs/query.tsx already documents for the underlying query.
 */

import { JOBS_PAGE_SIZE_OPTIONS, DEFAULT_JOBS_PAGE_SIZE, type JobsPageSize } from '@/lib/jobs/constants';

export type JobsDateRange = 'recent' | 'older';

export interface JobsQueryParams {
  range: JobsDateRange;
  company: string | null;
  /** Free-text search over title/company. Trimmed, null when empty. */
  search: string | null;
  pageSize: JobsPageSize;
  page: number;
}

const DEFAULT_RANGE: JobsDateRange = 'recent';
const DEFAULT_PAGE = 1;
/** Defensive cap on search input length — a search box, not a text field. */
const MAX_SEARCH_LENGTH = 100;

function isJobsDateRange(value: string | null): value is JobsDateRange {
  return value === 'recent' || value === 'older';
}

/**
 * Page is only meaningful when pageSize limits the result set. When pageSize
 * is 'all', every matching role renders on the one page that exists, so page
 * always collapses to 1 here — the single shared contract layer — rather
 * than every caller (page.tsx, route.ts, JobPagination) having to special-case
 * "except when showing all" independently.
 */
function parsePage(value: string | null, pageSize: JobsPageSize): number {
  if (pageSize === 'all') return DEFAULT_PAGE;
  if (value === null) return DEFAULT_PAGE;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
}

function parseCompany(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSearch(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim().slice(0, MAX_SEARCH_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

function parsePageSize(value: string | null): JobsPageSize {
  if (value === null) return DEFAULT_JOBS_PAGE_SIZE;
  if (value === 'all') return 'all';
  const parsed = Number.parseInt(value, 10);
  const isAllowed = (JOBS_PAGE_SIZE_OPTIONS as readonly (number | 'all')[]).includes(parsed);
  return isAllowed ? (parsed as JobsPageSize) : DEFAULT_JOBS_PAGE_SIZE;
}

/**
 * Parses the Job Board's URL contract from a URLSearchParams. Guard clauses:
 * anything malformed or unrecognized (bad range value, blank company,
 * non-positive/non-numeric page, out-of-allow-list pageSize) falls back to
 * its default rather than throwing — a mistyped query string degrades to the
 * default view, not a 500.
 */
export function parseJobsQueryParams(searchParams: URLSearchParams): JobsQueryParams {
  const pageSize = parsePageSize(searchParams.get('pageSize'));
  return {
    range: isJobsDateRange(searchParams.get('range')) ? (searchParams.get('range') as JobsDateRange) : DEFAULT_RANGE,
    company: parseCompany(searchParams.get('company')),
    search: parseSearch(searchParams.get('q')),
    pageSize,
    page: parsePage(searchParams.get('page'), pageSize),
  };
}

/**
 * Inverse of parseJobsQueryParams: builds a `/jobs` href for a given param
 * set, omitting anything already at its default so the canonical default
 * view stays a bare `/jobs` rather than `/jobs?range=recent&page=1`. `page`
 * is omitted entirely when pageSize is 'all', since it's meaningless there.
 */
export function buildJobsSearch(params: JobsQueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.range !== DEFAULT_RANGE) searchParams.set('range', params.range);
  if (params.company !== null) searchParams.set('company', params.company);
  if (params.search !== null) searchParams.set('q', params.search);
  if (params.pageSize !== DEFAULT_JOBS_PAGE_SIZE) searchParams.set('pageSize', String(params.pageSize));
  if (params.pageSize !== 'all' && params.page !== DEFAULT_PAGE) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  return query.length > 0 ? `/jobs?${query}` : '/jobs';
}
