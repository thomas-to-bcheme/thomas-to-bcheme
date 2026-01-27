/**
 * LinkedIn Content List API
 *
 * GET /api/linkedin/content
 * Lists available pre-written LinkedIn posts from genAI/linkedin-posts/
 */
import { listAvailablePosts } from '@/lib/linkedin/content-loader';

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
    service: 'linkedin-content',
    message,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET() {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };

  try {
    const posts = await listAvailablePosts();

    log('INFO', 'Listed available LinkedIn posts', {
      ...logCtx,
      count: posts.length,
    });

    return new Response(
      JSON.stringify({
        posts: posts.map((p) => ({
          filename: p.filename,
          date: p.metadata.date,
          topic: p.metadata.topic,
          target_audience: p.metadata.target_audience,
          contentPreview:
            p.content.length > 200
              ? p.content.substring(0, 200) + '...'
              : p.content,
          characterCount: p.content.length,
        })),
        count: posts.length,
        correlationId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', 'Failed to list posts', { ...logCtx, error: errorMessage });

    return new Response(
      JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list posts' },
        correlationId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
