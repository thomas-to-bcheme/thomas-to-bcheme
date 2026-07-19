import { type NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getJobResumePath } from '@/lib/db/jobs';
import { verifyResumeToken } from '@/lib/auth/resumeToken';

// =============================================================================
// LOGGING & ERROR HANDLING
// (same structured-logging / correlation-ID convention as src/app/api/jobs/route.ts)
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

export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };

  const jobId = request.nextUrl.searchParams.get('jobId');
  const expiresParam = request.nextUrl.searchParams.get('expires');
  const signature = request.nextUrl.searchParams.get('signature');

  if (!jobId || !expiresParam || !signature) {
    return createErrorResponse(
      400,
      'MISSING_PARAMS',
      'jobId, expires, and signature query params are required',
      correlationId
    );
  }

  if (!verifyResumeToken(jobId, Number(expiresParam), signature)) {
    log('WARN', 'Rejected resume download: invalid or expired token', { ...logCtx, jobId });
    return createErrorResponse(401, 'UNAUTHORIZED', 'Invalid or expired download link', correlationId);
  }

  let resumePdfPath: string | null;
  try {
    resumePdfPath = await getJobResumePath(jobId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Failed to look up resume path in database', { ...logCtx, jobId, error: errorMessage });
    return createErrorResponse(502, 'DATABASE_ERROR', 'Unable to load resume right now', correlationId);
  }

  if (!resumePdfPath) {
    return createErrorResponse(404, 'NOT_FOUND', 'No resume on file for this job', correlationId);
  }

  try {
    const result = await get(resumePdfPath, { access: 'private' });

    if (result?.statusCode !== 200) {
      log('WARN', 'Resume path in database has no matching Blob', { ...logCtx, jobId, resumePdfPath });
      return createErrorResponse(404, 'NOT_FOUND', 'Resume file not found in storage', correlationId);
    }

    log('INFO', 'Resume download served', { ...logCtx, jobId });

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resume-${encodeURIComponent(jobId)}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
        // Resumes carry PII (name/phone/email) — no-store rather than the
        // no-cache Vercel's private-storage docs suggest for private blobs
        // generally, so nothing lands on disk.
        'Cache-Control': 'private, no-store',
        'X-Correlation-ID': correlationId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Failed to fetch resume from Blob storage', { ...logCtx, jobId, error: errorMessage });
    return createErrorResponse(502, 'BLOB_ERROR', 'Unable to load resume right now', correlationId);
  }
}
