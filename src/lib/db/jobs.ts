import { neon } from '@neondatabase/serverless';
import { JobListingSchema, type JobListing } from '@/types/jobs';
import { getRecentCutoffDate } from '@/lib/jobs/constants';
import type { JobsQueryParams } from '@/lib/jobs/queryParams';

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

export interface JobsPageResult {
  jobs: JobListing[];
  /** The page that was requested — NOT clamped to totalPages. See getFilteredJobs(). */
  page: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Escapes SQL LIKE/ILIKE metacharacters (%, _) in user-typed search text so a
 * literal search like "50%" or "role_a" matches those literal characters
 * instead of acting as a wildcard/single-char-match. Backslash is escaped
 * first — otherwise the backslashes this function inserts for % and _ would
 * themselves get double-escaped by a later pass.
 */
function escapeLikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Fetch one filtered, paginated page of job postings from the shared Neon
 * database, plus enough metadata (totalPages/totalCount) for the caller to
 * render pagination controls or decide the requested page was out of range.
 *
 * Single authoritative query shape against "PORTFOLIO".roles (job_id, title,
 * url, company, posted_date, resume_pdf_path). src/app/jobs/query.tsx and
 * src/app/api/jobs/route.ts both delegate to this function so the page and
 * the public API route never drift into hand-writing their own copies again.
 *
 * The count and the page of rows are submitted together via sql.transaction()
 * — one HTTP round trip to Neon, and both queries read the same consistent
 * snapshot (avoids a row inserted/deleted between two sequential awaits
 * desyncing count from rows). The date-range WHERE clause is written as two
 * full literal query variants (recent / older) rather than composed
 * fragments: @neondatabase/serverless's tagged-template driver only exposes
 * sql`...`, sql.query(), sql.unsafe(), and sql.transaction() — no
 * postgres.js-style nested-fragment composition — so a conditional WHERE
 * can't be built by interpolating one sql template into another. The search
 * predicate is AND-combined into the same two branches rather than adding a
 * third axis of variants, following the existing `(${x}::text IS NULL OR
 * ...)` idiom already used for company.
 *
 * NULL posted_date rows are excluded from 'recent' (can't confirm recency)
 * and included in 'older' (posted_date < cutoff OR posted_date IS NULL) —
 * matching the "Posting date unavailable" fallback already in JobCard.tsx
 * rather than silently dropping those rows from every view.
 *
 * Page clamping is intentionally NOT done here: this function always honors
 * the requested page verbatim (an out-of-range page legitimately returns
 * zero rows plus an accurate totalCount/totalPages). src/app/jobs/page.tsx
 * redirects to the real last page when it's out of range; the public API
 * route just returns the honest empty result — see both files for why they
 * differ.
 *
 * pageSize === 'all' means no LIMIT: limitValue is passed through as NULL,
 * which Postgres treats identically to LIMIT ALL (no limit) — not a
 * hardcoded large row cap, so "All" genuinely can never silently truncate
 * data regardless of how large the table grows.
 */
export async function getFilteredJobs(params: JobsQueryParams): Promise<JobsPageResult> {
  const cutoff = getRecentCutoffDate();
  const limitValue = params.pageSize === 'all' ? null : params.pageSize;
  const offset = params.pageSize === 'all' ? 0 : (params.page - 1) * params.pageSize;
  const searchPattern = params.search ? `%${escapeLikePattern(params.search)}%` : null;

  const countQuery = params.range === 'recent'
    ? sql`
        SELECT COUNT(*)::int AS count
        FROM "PORTFOLIO".roles
        WHERE posted_date >= ${cutoff}::date
          AND (${params.company}::text IS NULL OR company = ${params.company})
          AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR company ILIKE ${searchPattern})
      `
    : sql`
        SELECT COUNT(*)::int AS count
        FROM "PORTFOLIO".roles
        WHERE (posted_date < ${cutoff}::date OR posted_date IS NULL)
          AND (${params.company}::text IS NULL OR company = ${params.company})
          AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR company ILIKE ${searchPattern})
      `;

  const selectQuery = params.range === 'recent'
    ? sql`
        SELECT
          job_id,
          title,
          url,
          company,
          posted_date::text AS "postedDate",
          resume_pdf_path AS "resumePdfPath"
        FROM "PORTFOLIO".roles
        WHERE posted_date >= ${cutoff}::date
          AND (${params.company}::text IS NULL OR company = ${params.company})
          AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR company ILIKE ${searchPattern})
        ORDER BY posted_date DESC NULLS LAST
        LIMIT ${limitValue}
        OFFSET ${offset}
      `
    : sql`
        SELECT
          job_id,
          title,
          url,
          company,
          posted_date::text AS "postedDate",
          resume_pdf_path AS "resumePdfPath"
        FROM "PORTFOLIO".roles
        WHERE (posted_date < ${cutoff}::date OR posted_date IS NULL)
          AND (${params.company}::text IS NULL OR company = ${params.company})
          AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR company ILIKE ${searchPattern})
        ORDER BY posted_date DESC NULLS LAST
        LIMIT ${limitValue}
        OFFSET ${offset}
      `;

  const [countRows, jobRows] = await sql.transaction([countQuery, selectQuery]);

  const totalCount = (countRows[0]?.count as number | undefined) ?? 0;
  const totalPages = params.pageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(totalCount / params.pageSize));

  const jobs = jobRows.map((row) =>
    JobListingSchema.parse({
      id: row.job_id,
      title: row.title,
      url: row.url,
      company: row.company ?? null,
      postedDate: row.postedDate ?? null,
      resumePdfPath: row.resumePdfPath ?? null,
    })
  );

  return { jobs, page: params.page, totalPages, totalCount };
}

/**
 * Distinct company names across ALL postings, regardless of the current date
 * range — deliberately unfiltered by 'recent'/'older' so switching the range
 * tab never invisibly invalidates (or silently clears) a selected company.
 * Used to populate the company <select> in JobFilters.
 */
export async function getJobCompanies(): Promise<string[]> {
  const rows = await sql`
    SELECT DISTINCT company
    FROM "PORTFOLIO".roles
    WHERE company IS NOT NULL
    ORDER BY company
  `;

  return rows.map((row) => row.company as string);
}

export interface PipelineCompanyStats {
  company: string;
  total: number;
  synced: number;
}

export interface PipelineStats {
  totalRoles: number;
  syncedRoles: number;
  byCompany: PipelineCompanyStats[];
}

/**
 * Aggregate counts for the apply-to-jobs pipeline's current sync state —
 * total rows, rows with a résumé attached, broken down per company. Powers
 * the chat agent's live KPI paragraph (see formatLivePipelineKpi in
 * src/data/AiSystemInformation.ts) instead of a hand-copied, point-in-time
 * snapshot.
 *
 * A single GROUP BY query, not sql.transaction() like getFilteredJobs:
 * that function needs a count query and a rows query with two *different*
 * WHERE shapes to agree on one snapshot. Here every number already comes
 * out of this one query's rows — totalRoles/syncedRoles are summed in JS
 * from the same per-company grouping rather than paying for a second round
 * trip that could only return a subset of what this query already has.
 *
 * Deliberately unvalidated by JobListingSchema (that schema models the
 * public JobListing shape returned to the UI, not an aggregate count) —
 * matches the lighter getJobCompanies()/getJobResumePath() precedent.
 */
export async function getPipelineStats(): Promise<PipelineStats> {
  const rows = await sql`
    SELECT
      company,
      COUNT(*)::int AS total,
      COUNT(resume_pdf_path)::int AS synced
    FROM "PORTFOLIO".roles
    WHERE company IS NOT NULL
    GROUP BY company
    ORDER BY company
  `;

  const byCompany: PipelineCompanyStats[] = rows.map((row) => ({
    company: row.company as string,
    total: row.total as number,
    synced: row.synced as number,
  }));

  const totalRoles = byCompany.reduce((sum, c) => sum + c.total, 0);
  const syncedRoles = byCompany.reduce((sum, c) => sum + c.synced, 0);

  return { totalRoles, syncedRoles, byCompany };
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
