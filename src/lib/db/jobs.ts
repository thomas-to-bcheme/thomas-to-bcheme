import { neon } from '@neondatabase/serverless';
import { JobListingSchema, type JobListing } from '@/types/jobs';

// Fail-fast: validate required environment variables at module load
// (same convention as GOOGLE_API_KEY in src/app/api/chat/route.ts)
const JOBS_DATABASE_URL = process.env.JOBS_DATABASE_URL;
if (!JOBS_DATABASE_URL) {
  throw new Error(
    '[FATAL] JOBS_DATABASE_URL environment variable is not set. ' +
    'Add the read-only Neon connection string to your .env.local file.'
  );
}

// Exported for reuse by other read-only queries against this same database
// (e.g. src/app/jobs/query.tsx) so the connection is only ever derived once.
export const sql = neon(JOBS_DATABASE_URL);

/**
 * Fetch all job postings from the shared Neon database.
 *
 * Single authoritative query against "PORTFOLIO".roles (job_id, title, url,
 * posted_date, resume_pdf_path). src/app/jobs/query.tsx delegates to this
 * function so the page and the public /api/jobs route never drift into
 * hand-writing their own copies of this query again.
 */
export async function getJobs(): Promise<JobListing[]> {
  // Table lives in the "PORTFOLIO" schema, not the default `public` schema —
  // quoting is required to preserve the case, since unquoted identifiers are
  // lowercased by Postgres and won't resolve to this schema.
  //
  // posted_date is DATE (confirmed live via information_schema.columns) —
  // sorting the native column is already true chronological order, and
  // NULLS LAST keeps rows with an unset date at the bottom (DESC's default
  // is NULLS FIRST). It's cast to ::text in the SELECT because JobListing's
  // wire/display type is string (see src/types/jobs.ts and the ISO 8601
  // YYYY-MM-DD formatting in JobCard.tsx) — casting in SQL yields that
  // canonical form directly, instead of depending on how the driver decodes
  // a `date` value into a JS type.
  const rows = await sql`
    SELECT
      job_id,
      title,
      url,
      posted_date::text AS "postedDate",
      resume_pdf_path AS "resumePdfPath"
    FROM "PORTFOLIO".roles
    ORDER BY posted_date DESC NULLS LAST
  `;

  return rows.map((row) =>
    JobListingSchema.parse({
      id: row.job_id,
      title: row.title,
      url: row.url,
      postedDate: row.postedDate ?? null,
      resumePdfPath: row.resumePdfPath ?? null,
    })
  );
}

/**
 * Look up the Blob pathname for a single job's attached resume, by job_id.
 * Used by src/app/api/jobs/resume/route.ts to resolve a download without
 * fetching (and re-validating) every row in the table for one lookup.
 */
export async function getJobResumePath(jobId: string): Promise<string | null> {
  const rows = await sql`
    SELECT resume_pdf_path AS "resumePdfPath"
    FROM "PORTFOLIO".roles
    WHERE job_id = ${jobId}
  `;

  return rows[0]?.resumePdfPath ?? null;
}
