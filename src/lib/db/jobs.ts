import { neon } from '@neondatabase/serverless';
import { JobPostingSchema, type JobPosting } from '@/types/jobs';

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
 */
export async function getJobs(): Promise<JobPosting[]> {
  // Table lives in the "PORTFOLIO" schema, not the default `public` schema —
  // quoting is required to preserve the case, since unquoted identifiers are
  // lowercased by Postgres and won't resolve to this schema.
  const rows = await sql`
    SELECT
      id,
      title,
      company,
      location,
      remote,
      url,
      salary_min AS "salaryMin",
      salary_max AS "salaryMax",
      salary_currency AS "salaryCurrency",
      skills,
      date_posted AS "datePosted"
    FROM "PORTFOLIO".jobs
    ORDER BY date_posted DESC
  `;

  return rows.map((row) => JobPostingSchema.parse(row));
}
