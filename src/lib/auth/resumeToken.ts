import { createHmac, timingSafeEqual } from 'node:crypto';

// 24h comfortably outlives a single browsing session (or someone reopening a
// saved resume link later the same day) while still bounding how long a
// leaked/shared URL stays valid. src/app/jobs/page.tsx renders fully
// dynamically per request now — there's no fixed page-refresh window this
// TTL needs to outlive; it's sized for the token's own lifecycle only.
const RESUME_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Fail-fast: validate required environment variables at module load
// (same convention as JOBS_DATABASE_URL in src/lib/db/jobs.ts)
const envSecret = process.env.JOBS_RESUME_SECRET;
if (!envSecret) {
  throw new Error(
    '[FATAL] JOBS_RESUME_SECRET environment variable is not set. ' +
    'Add a random secret (e.g. `openssl rand -hex 32`) to your .env.local file.'
  );
}
const JOBS_RESUME_SECRET: string = envSecret;

function sign(jobId: string, expires: number): string {
  return createHmac('sha256', JOBS_RESUME_SECRET)
    .update(`${jobId}:${expires}`)
    .digest('hex');
}

/**
 * Build a signed, time-limited download URL for a job's resume.
 *
 * The secret itself never leaves the server — only a derived HMAC signature
 * does, scoped to this exact jobId and expiry. Embedding the raw shared
 * secret in a rendered page's HTML would let anyone view-source it and reuse
 * it for any job, which defeats the point of gating resumes that contain PII.
 */
export function createResumeDownloadUrl(jobId: string): string {
  const expires = Date.now() + RESUME_TOKEN_TTL_MS;
  const signature = sign(jobId, expires);
  const params = new URLSearchParams({ jobId, expires: String(expires), signature });
  return `/api/jobs/resume?${params.toString()}`;
}

/**
 * Verify a (jobId, expires, signature) triple from an incoming request.
 * Tampering with jobId or expires invalidates the signature, since both are
 * signed over — not just checked separately.
 */
export function verifyResumeToken(jobId: string, expires: number, signature: string): boolean {
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  const expected = Buffer.from(sign(jobId, expires), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}
