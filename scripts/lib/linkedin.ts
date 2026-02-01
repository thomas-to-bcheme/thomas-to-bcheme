/**
 * LinkedIn Client Library (Standalone)
 *
 * Consolidated LinkedIn API client, content loader, and error types.
 * This file is self-contained and has no dependencies on src/ directory.
 *
 * Features:
 * - LinkedIn Posts API v2 integration
 * - Markdown file parsing with YAML frontmatter
 * - Error handling with typed error codes
 * - Dry-run mode support
 */
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// ============================================================================
// ERROR TYPES
// ============================================================================

/** Error codes returned by the LinkedIn API */
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

/** Structure of error responses from the LinkedIn API */
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

// ============================================================================
// API CLIENT TYPES
// ============================================================================

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

// ============================================================================
// CONTENT LOADER TYPES
// ============================================================================

export interface LinkedInPostMetadata {
  date: string; // YYYY-MM-DD
  topic: string;
  target_audience: string;
}

export interface LinkedInPostContent {
  metadata: LinkedInPostMetadata;
  content: string;
  filename: string;
}

// ============================================================================
// API CLIENT FUNCTIONS
// ============================================================================

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

// ============================================================================
// CONTENT LOADER FUNCTIONS
// ============================================================================

/**
 * Get the posts directory path from environment or use default
 */
function getPostsDirectory(): string {
  return (
    process.env.LINKEDIN_POSTS_DIR ||
    path.join(process.cwd(), 'genAI', 'linkedin-posts', 'validated')
  );
}

/**
 * Load a single post by filename (without .md extension)
 *
 * Directory structure:
 * - genAI/linkedin-posts/drafts/    - AI-generated posts pending review
 * - genAI/linkedin-posts/validated/ - Human-approved posts ready to publish
 * - genAI/linkedin-posts/posted/    - Archive of published posts
 */
export async function loadPost(
  filename: string
): Promise<LinkedInPostContent | null> {
  const POSTS_DIR = getPostsDirectory();

  // Sanitize filename to prevent path traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(POSTS_DIR, `${sanitizedFilename}.md`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
      metadata: {
        date: data.date || '',
        topic: data.topic || '',
        target_audience: data.target_audience || '',
      },
      content: content.trim(),
      filename: sanitizedFilename,
    };
  } catch {
    return null;
  }
}

/**
 * List all available posts sorted by date (newest first)
 */
export async function listAvailablePosts(): Promise<LinkedInPostContent[]> {
  const POSTS_DIR = getPostsDirectory();

  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    const posts: LinkedInPostContent[] = [];
    for (const file of mdFiles) {
      const post = await loadPost(file.replace('.md', ''));
      if (post) posts.push(post);
    }

    // Sort by date descending (newest first)
    return posts.sort(
      (a, b) =>
        new Date(b.metadata.date).getTime() -
        new Date(a.metadata.date).getTime()
    );
  } catch {
    return [];
  }
}
