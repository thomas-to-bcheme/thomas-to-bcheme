import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/db/jobs';

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

export async function GET() {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };

  try {
    const jobs = await getJobs();
    log('INFO', 'Jobs request served', { ...logCtx, jobCount: jobs.length });

    return NextResponse.json(
      { jobs, correlationId },
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
