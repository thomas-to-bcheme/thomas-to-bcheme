import { getJobs } from '@/lib/db/jobs';
import type { JobListing } from '@/types/jobs';

/**
 * Fetch job postings for the Job Board page. Delegates to getJobs() in
 * src/lib/db/jobs.ts so the page and the public /api/jobs route always
 * read from the same query — avoids the two independently hand-written
 * queries drifting apart, which previously caused this to query a
 * nonexistent table.
 */
export async function getJobListings(): Promise<JobListing[]> {
  return getJobs();
}
