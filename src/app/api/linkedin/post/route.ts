/**
 * LinkedIn Post API
 *
 * POST /api/linkedin/post
 * Publishes content to LinkedIn via UGC Posts API
 *
 * Following patterns from: src/app/api/chat/route.ts
 * - Fail-fast env var validation
 * - Zod request validation
 * - Structured logging with correlation IDs
 */
import { z } from 'zod';
import {
  publishToLinkedIn,
  buildPostPayload,
  type LinkedInVisibility,
} from '@/lib/linkedin/client';
import { loadPost } from '@/lib/linkedin/content-loader';
import { LINKEDIN_ERROR_STATUS } from '@/types/linkedin-errors';

// =============================================================================
// CONFIGURATION & VALIDATION (Fail-fast pattern)
// =============================================================================

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;
const LINKEDIN_DRY_RUN = process.env.LINKEDIN_DRY_RUN === 'true';

if (!LINKEDIN_ACCESS_TOKEN) {
  throw new Error(
    '[FATAL] LINKEDIN_ACCESS_TOKEN environment variable is not set. ' +
      'Please add it to your .env.local file.'
  );
}

if (!LINKEDIN_PERSON_URN) {
  throw new Error(
    '[FATAL] LINKEDIN_PERSON_URN environment variable is not set. ' +
      'Please add it to your .env.local file.'
  );
}

if (!LINKEDIN_PERSON_URN.startsWith('urn:li:person:') && !LINKEDIN_PERSON_URN.startsWith('urn:li:member:')) {
  throw new Error(
    '[FATAL] LINKEDIN_PERSON_URN must be in format: urn:li:person:<id> or urn:li:member:<id>'
  );
}

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const FileSourceSchema = z.object({
  source: z.literal('file'),
  filename: z.string().min(1),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
});

const CustomSourceSchema = z.object({
  source: z.literal('custom'),
  content: z.string().min(1).max(3000),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
});

const PostRequestSchema = z.discriminatedUnion('source', [
  FileSourceSchema,
  CustomSourceSchema,
]);

// =============================================================================
// LOGGING
// =============================================================================

interface LogContext {
  correlationId: string;
  [key: string]: unknown;
}

function log(
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  context: LogContext
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'linkedin-post',
    message,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string,
  details?: unknown
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
      correlationId,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };

  try {
    // 1. Parse and validate request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      log('WARN', 'Invalid JSON in request body', logCtx);
      return createErrorResponse(
        400,
        'INVALID_JSON',
        'Request body must be valid JSON',
        correlationId
      );
    }

    const validation = PostRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      log('WARN', 'Request validation failed', { ...logCtx, errors });
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        errors,
        correlationId
      );
    }

    const request = validation.data;
    log('INFO', 'LinkedIn post request received', {
      ...logCtx,
      source: request.source,
      dryRun: LINKEDIN_DRY_RUN,
    });

    // 2. Resolve content
    let content: string;
    let metadata: Record<string, string> = {};

    if (request.source === 'file') {
      const post = await loadPost(request.filename);
      if (!post) {
        log('WARN', 'Post file not found', {
          ...logCtx,
          filename: request.filename,
        });
        return createErrorResponse(
          404,
          'POST_NOT_FOUND',
          `File not found: ${request.filename}`,
          correlationId
        );
      }
      content = post.content;
      metadata = {
        topic: post.metadata.topic,
        date: post.metadata.date,
        filename: post.filename,
      };
    } else {
      content = request.content;
    }

    // 3. Build payload for logging (without sensitive data)
    const payload = buildPostPayload(
      content,
      request.visibility as LinkedInVisibility,
      LINKEDIN_PERSON_URN
    );

    log('INFO', 'LinkedIn payload prepared', {
      ...logCtx,
      contentLength: content.length,
      visibility: request.visibility,
      ...metadata,
    });

    // 4. Publish to LinkedIn (or dry run)
    const result = await publishToLinkedIn(
      content,
      request.visibility as LinkedInVisibility,
      LINKEDIN_ACCESS_TOKEN,
      LINKEDIN_PERSON_URN,
      LINKEDIN_DRY_RUN
    );

    if (!result.success) {
      log('ERROR', 'LinkedIn API error', {
        ...logCtx,
        errorCode: result.errorCode,
        rawError: result.rawError,
      });

      return createErrorResponse(
        LINKEDIN_ERROR_STATUS[result.errorCode] || 500,
        result.errorCode,
        result.message,
        correlationId,
        result.rawError
      );
    }

    // 5. Success response
    log('INFO', 'LinkedIn post published successfully', {
      ...logCtx,
      postId: result.postId,
      dryRun: result.dryRun,
      ...metadata,
    });

    return new Response(
      JSON.stringify({
        success: true,
        postId: result.postId,
        dryRun: result.dryRun,
        correlationId,
        metadata,
        payload: LINKEDIN_DRY_RUN ? payload : undefined, // Only include payload in dry run
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Unhandled API error', { ...logCtx, error: errorMessage });
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      correlationId
    );
  }
}
