import { sql } from '@/lib/db/jobs';
import { JobListingSchema, type JobListing } from '@/types/jobs';

/**
 * Fetch job postings for the Job Board page via the read-only Neon role,
 * projected down to only the fields the page renders (title, description,
 * posted date). Selects the full row so the query stays valid regardless of
 * which other columns the table happens to have.
 */
export async function getJobListings(): Promise<JobListing[]> {
  const rows = await sql`
    SELECT * FROM "PORTFOLIO".jobs
    ORDER BY posted_date DESC
  `;

  return rows.map((row) =>
    JobListingSchema.parse({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      postedDate: row.posted_date ?? null,
    })
  );
}
