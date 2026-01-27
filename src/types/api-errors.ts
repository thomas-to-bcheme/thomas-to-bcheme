/**
 * API Error Types
 *
 * Defines error types and user-friendly messages for the chat API.
 * These types align with the error codes returned by /api/chat/route.ts.
 */

/** Error codes returned by the chat API */
export type ApiErrorCode =
  | 'GOOGLE_QUOTA_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INTERNAL_ERROR';

/** Structure of error responses from the chat API */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
  correlationId: string;
}

/** User-friendly messages for each error code */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  GOOGLE_QUOTA_EXCEEDED:
    'The AI service is temporarily at capacity. Please wait a moment.',
  VALIDATION_ERROR:
    'There was an issue with your message. Please try rephrasing.',
  INVALID_JSON: 'There was a technical error. Please try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
};

/** Discriminated union for chat errors */
export type ChatError =
  | { type: 'api'; response: ApiErrorResponse; status: number; retryAfter?: number }
  | { type: 'network'; message: string }
  | { type: 'stream'; message: string };
