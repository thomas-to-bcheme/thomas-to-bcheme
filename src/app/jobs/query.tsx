import { getFilteredJobs, type JobsPageResult } from '@/lib/db/jobs';
import type { JobsQueryParams } from '@/lib/jobs/queryParams';

/**
 * Fetch one filtered, paginated page of job postings for the Job Board page.
 * Delegates to getFilteredJobs() in src/lib/db/jobs.ts so the page and the
 * public /api/jobs route always read from the same query — avoids the two
 * independently hand-written queries drifting apart, which previously
 * caused this to query a nonexistent table.
 */
export async function getJobListings(params: JobsQueryParams): Promise<JobsPageResult> {
  return getFilteredJobs(params);
}
