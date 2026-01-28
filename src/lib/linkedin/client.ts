/**
 * LinkedIn API Client
 *
 * Handles HTTP communication with LinkedIn's Posts API v2
 * Uses w_member_social scope for posting
 * Supports DRY_RUN mode for testing without posting
 */
import { LinkedInErrorCode } from '@/types/linkedin-errors';

export type LinkedInVisibility = 'PUBLIC' | 'CONNECTIONS';

export interface LinkedInPostPayload {
  author: string;
  commentary: string;
  visibility: LinkedInVisibility;
  distribution: {
    feedDistribution: 'MAIN_FEED';
    targetEntities: never[];
    thirdPartyDistributionChannels: never[];
  };
  lifecycleState: 'PUBLISHED';
  isReshareDisabledByAuthor: boolean;
}

export type LinkedInPostResult =
  | { success: true; postId: string; dryRun: boolean }
  | {
      success: false;
      errorCode: LinkedInErrorCode;
      message: string;
      rawError?: unknown;
    };

/**
 * Build the LinkedIn Posts API payload
 */
export function buildPostPayload(
  content: string,
  visibility: LinkedInVisibility,
  personUrn: string
): LinkedInPostPayload {
  return {
    author: personUrn,
    commentary: content,
    visibility: visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}

/**
 * Publish content to LinkedIn
 *
 * When DRY_RUN is true, returns success without making the API call
 */
export async function publishToLinkedIn(
  content: string,
  visibility: LinkedInVisibility,
  accessToken: string,
  personUrn: string,
  dryRun: boolean = false
): Promise<LinkedInPostResult> {
  const payload = buildPostPayload(content, visibility, personUrn);

  // DRY_RUN mode: skip actual API call
  if (dryRun) {
    return {
      success: true,
      postId: `dry-run-${Date.now()}`,
      dryRun: true,
    };
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const postId = response.headers.get('X-RestLi-Id') || 'unknown';
      return { success: true, postId, dryRun: false };
    }

    return mapLinkedInError(response);
  } catch (error) {
    return {
      success: false,
      errorCode: 'LINKEDIN_SERVICE_ERROR',
      message: 'Network error connecting to LinkedIn',
      rawError: error instanceof Error ? error.message : error,
    };
  }
}

/**
 * Map HTTP response to LinkedInPostResult error
 */
async function mapLinkedInError(
  response: Response
): Promise<LinkedInPostResult> {
  let rawError: unknown;
  try {
    rawError = await response.json();
    // Log raw error for debugging
    console.error('LinkedIn API raw error:', JSON.stringify(rawError, null, 2));
  } catch {
    rawError = { status: response.status, statusText: response.statusText };
  }

  switch (response.status) {
    case 401:
      return {
        success: false,
        errorCode: 'LINKEDIN_AUTH_EXPIRED',
        message: 'Access token expired or invalid',
        rawError,
      };
    case 429:
      return {
        success: false,
        errorCode: 'LINKEDIN_QUOTA_EXCEEDED',
        message: 'Rate limit exceeded',
        rawError,
      };
    case 422:
      return {
        success: false,
        errorCode: 'LINKEDIN_CONTENT_REJECTED',
        message: 'Content rejected by LinkedIn',
        rawError,
      };
    case 502:
    case 503:
      return {
        success: false,
        errorCode: 'LINKEDIN_SERVICE_ERROR',
        message: 'LinkedIn API unavailable',
        rawError,
      };
    default:
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        rawError,
      };
  }
}
