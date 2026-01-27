/**
 * LinkedIn API Error Types
 *
 * Defines error types and user-friendly messages for the LinkedIn API.
 * Follows the pattern from api-errors.ts.
 */

/** Error codes returned by the LinkedIn API routes */
export type LinkedInErrorCode =
  | 'LINKEDIN_AUTH_EXPIRED'
  | 'LINKEDIN_QUOTA_EXCEEDED'
  | 'LINKEDIN_INVALID_URN'
  | 'LINKEDIN_CONTENT_REJECTED'
  | 'LINKEDIN_SERVICE_ERROR'
  | 'POST_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INTERNAL_ERROR';

/** Structure of error responses from the LinkedIn API routes */
export interface LinkedInApiErrorResponse {
  error: {
    code: LinkedInErrorCode;
    message: string;
    details?: unknown;
  };
  correlationId: string;
}

/** User-friendly messages for each error code */
export const LINKEDIN_ERROR_MESSAGES: Record<LinkedInErrorCode, string> = {
  LINKEDIN_AUTH_EXPIRED:
    'LinkedIn access token has expired. Please refresh your credentials.',
  LINKEDIN_QUOTA_EXCEEDED:
    'Daily posting limit reached. LinkedIn allows 150 posts per day.',
  LINKEDIN_INVALID_URN: 'Invalid LinkedIn person URN format.',
  LINKEDIN_CONTENT_REJECTED:
    'Content was rejected by LinkedIn. Check for policy violations.',
  LINKEDIN_SERVICE_ERROR: 'LinkedIn API is temporarily unavailable.',
  POST_NOT_FOUND: 'The requested post file was not found.',
  VALIDATION_ERROR: 'Invalid request payload.',
  INVALID_JSON: 'Request body must be valid JSON.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

/** HTTP status codes for each error type */
export const LINKEDIN_ERROR_STATUS: Record<LinkedInErrorCode, number> = {
  LINKEDIN_AUTH_EXPIRED: 401,
  LINKEDIN_QUOTA_EXCEEDED: 429,
  LINKEDIN_INVALID_URN: 400,
  LINKEDIN_CONTENT_REJECTED: 422,
  LINKEDIN_SERVICE_ERROR: 502,
  POST_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INVALID_JSON: 400,
  INTERNAL_ERROR: 500,
};
