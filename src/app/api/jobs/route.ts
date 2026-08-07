import { NextResponse, type NextRequest } from 'next/server';
import { getFilteredJobs } from '@/lib/db/jobs';
import { parseJobsQueryParams } from '@/lib/jobs/queryParams';

// =============================================================================
// LOGGING & ERROR HANDLING
// (same structured-logging / correlation-ID convention as src/app/api/chat/route.ts)
// =============================================================================

interface LogContext {
  correlationId: string;
  [key: string]: unknown;
}

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string
): NextResponse {
  return NextResponse.json(
    { error: { code, message }, correlationId },
    { status, headers: { 'X-Correlation-ID': correlationId } }
  );
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

// Accepts the same ?range=recent|older&company=<name>&page=<n> contract as
// src/app/jobs/page.tsx (both parsed via parseJobsQueryParams, so they can't
// drift apart). Unlike the page, this route does NOT redirect on an
// out-of-range page — a GET redirect isn't meaningful to a JSON caller — it
// returns the true (possibly empty) jobs array alongside accurate
// page/totalPages/totalCount so a caller can see plainly it asked for a page
// past the end.
export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };
  const params = parseJobsQueryParams(request.nextUrl.searchParams);

  try {
    const result = await getFilteredJobs(params);
    log('INFO', 'Jobs request served', {
      ...logCtx,
      jobCount: result.jobs.length,
      range: params.range,
      company: params.company,
      // Search text is free-form user input (unlike company, which is
      // constrained to values drawn from the DB's own dropdown) — log
      // presence/length only, never the raw string, per CLAUDE.md's
      // "STRICTLY scrub PII and secrets from all logs" standard.
      hasSearch: params.search !== null,
      searchLength: params.search?.length ?? 0,
      pageSize: params.pageSize,
      page: result.page,
      totalPages: result.totalPages,
    });

    return NextResponse.json(
      {
        jobs: result.jobs,
        page: result.page,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        correlationId,
      },
      { headers: { 'X-Correlation-ID': correlationId } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Failed to fetch jobs from database', { ...logCtx, error: errorMessage });

    return createErrorResponse(
      502,
      'DATABASE_ERROR',
      'Unable to load job postings right now. Please try again shortly.',
      correlationId
    );
  }
}
