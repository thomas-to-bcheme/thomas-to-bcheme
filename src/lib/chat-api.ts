/**
 * Chat API Client
 *
 * Handles HTTP communication with /api/chat, including:
 * - HTTP status checking before streaming
 * - Error response parsing
 * - User-friendly error message mapping
 */

import {
  ApiErrorCode,
  ApiErrorResponse,
  ChatError,
  ERROR_MESSAGES,
} from '@/types/api-errors';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

/** Result of sendChatMessage - either success with response body or failure with error */
export type ChatApiResult =
  | { success: true; response: Response }
  | { success: false; error: ChatError };

/**
 * Send a chat message to the API
 *
 * Performs fetch with proper HTTP status checking before returning the response.
 * On non-2xx status, parses the JSON error response.
 */
export async function sendChatMessage(
  messages: Message[]
): Promise<ChatApiResult> {
  let response: Response;

  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (fetchError) {
    // Network failure (offline, DNS, CORS, etc.)
    return {
      success: false,
      error: {
        type: 'network',
        message:
          fetchError instanceof Error
            ? fetchError.message
            : 'Network request failed',
      },
    };
  }

  // Check HTTP status before attempting to stream
  if (!response.ok) {
    const error = await parseApiError(response);
    return { success: false, error };
  }

  // Check for response body (required for streaming)
  if (!response.body) {
    return {
      success: false,
      error: { type: 'stream', message: 'No response body received' },
    };
  }

  return { success: true, response };
}

/**
 * Parse an error response from the API
 *
 * Extracts the structured error from JSON response and Retry-After header.
 */
async function parseApiError(response: Response): Promise<ChatError> {
  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

  try {
    const json = (await response.json()) as ApiErrorResponse;
    return {
      type: 'api',
      response: json,
      status: response.status,
      retryAfter,
    };
  } catch {
    // Fallback if response isn't valid JSON
    return {
      type: 'api',
      response: {
        error: { code: 'INTERNAL_ERROR', message: 'Unknown error' },
        correlationId: 'unknown',
      },
      status: response.status,
      retryAfter,
    };
  }
}

/**
 * Get a user-friendly error message for a ChatError
 */
export function getErrorMessage(error: ChatError): string {
  switch (error.type) {
    case 'api': {
      const code = error.response.error.code as ApiErrorCode;
      return ERROR_MESSAGES[code] || error.response.error.message;
    }
    case 'network':
      return 'Could not connect to the server. Please check your connection and try again.';
    case 'stream':
      return 'The response was interrupted. Please try again.';
  }
}

/**
 * Check if an error is retryable
 *
 * Rate limit errors should show a countdown, not an immediate retry button.
 * Network and stream errors are immediately retryable.
 */
export function isRetryableError(error: ChatError): boolean {
  if (error.type === 'network' || error.type === 'stream') {
    return true;
  }
  // API errors: all except rate limit errors are immediately retryable
  const code = error.response.error.code;
  return code !== 'RATE_LIMIT_EXCEEDED' && code !== 'GOOGLE_QUOTA_EXCEEDED';
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: ChatError): boolean {
  if (error.type !== 'api') return false;
  const code = error.response.error.code;
  return code === 'RATE_LIMIT_EXCEEDED' || code === 'GOOGLE_QUOTA_EXCEEDED';
}
