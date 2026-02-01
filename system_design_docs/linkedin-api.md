# LinkedIn Share API Documentation

This document describes the LinkedIn Share API integration for programmatic posting to LinkedIn.

---

## Overview

The LinkedIn Share API enables publishing content to LinkedIn programmatically via REST endpoints. This implementation provides:

- **Content Management**: Pre-written posts stored as markdown files with YAML frontmatter
- **Manual Posting**: CLI/API trigger for publishing content
- **Dry-Run Mode**: Test integration without posting to LinkedIn

### Architecture

```
┌─────────────────────────────────┐
│ GitHub Actions CRON / Manual    │
└────────────┬────────────────────┘
             │ npm run linkedin post
             ▼
┌────────────────────────────────────┐
│ linkedin-cli.ts                    │
│ • Argument parsing                 │
│ • Dry-run mode                     │
│ • JSON/text output                 │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ content-loader.ts                  │
│ • Load markdown files              │
│ • Parse YAML frontmatter           │
│ • Configurable directory via env   │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ client.ts                          │
│ • Build LinkedIn payload           │
│ • POST to LinkedIn API             │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ LinkedIn UGC Posts API             │
│ api.linkedin.com/v2/ugcPosts       │
└────────────────────────────────────┘
```

---

## Prerequisites

### 1. Create LinkedIn Developer App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click **Create App**
3. Fill in required fields:
   - App name
   - LinkedIn Page (create one if needed)
   - App logo
4. Note your **Client ID** and **Client Secret**

### 2. Enable Required Products

In your app's **Products** tab, request access to:

| Product | Purpose |
|---------|---------|
| **Share on LinkedIn** | Required for `w_member_social` scope (posting) |
| **Sign In with LinkedIn using OpenID Connect** | Required for `openid` scope (getting member ID) |

### 3. Configure Redirect URI

In your app's **Auth** tab:

1. Add your redirect URI under "Authorized redirect URLs for your app"
2. Must be an absolute HTTPS URL (e.g., `https://example.com/callback`)
3. This URL receives the authorization code after user approval

---

## OAuth 2.0 Setup Walkthrough

LinkedIn uses OAuth 2.0 Authorization Code Flow. Follow these steps to obtain an access token.

> **Reference:** [Microsoft Learn - Authorization Code Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)

### Step 1: Request Authorization Code

Direct the user to LinkedIn's authorization endpoint:

```
GET https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id={LINKEDIN_CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=w_member_social%20openid%20profile
  &state={RANDOM_STRING}
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `response_type` | Must be `code` |
| `client_id` | Your app's Client ID |
| `redirect_uri` | URL-encoded redirect URI (must match app config) |
| `scope` | Space-delimited scopes: `w_member_social openid profile` |
| `state` | Random string for CSRF protection |

**Required Scopes:**

| Scope | Purpose |
|-------|---------|
| `w_member_social` | Post content to LinkedIn |
| `openid` | Access `/v2/userinfo` to get member ID |
| `profile` | Access basic profile information |

### Step 2: Handle Redirect

After user approves, LinkedIn redirects to your URI with:

```
{REDIRECT_URI}?code={AUTHORIZATION_CODE}&state={STATE}
```

**Important:**
- Validate `state` matches your original request (CSRF protection)
- Authorization code expires in **30 minutes**
- Code is single-use

### Step 3: Exchange Code for Access Token

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code={AUTHORIZATION_CODE}" \
  --data-urlencode "client_id={LINKEDIN_CLIENT_ID}" \
  --data-urlencode "client_secret={LINKEDIN_CLIENT_SECRET}" \
  --data-urlencode "redirect_uri={REDIRECT_URI}"
```

**Response:**

```json
{
  "access_token": "AQX...",
  "expires_in": 5183999,
  "scope": "openid,profile,w_member_social",
  "token_type": "Bearer",
  "id_token": "eyJ..."
}
```

| Field | Description |
|-------|-------------|
| `access_token` | Bearer token for API calls (~500 chars) |
| `expires_in` | Token lifetime in seconds (~60 days) |
| `id_token` | JWT containing member ID in `sub` claim |

### Step 4: Extract Member ID from id_token

The `id_token` is a JWT. Decode the payload (middle section) to get your member ID:

```bash
# Decode JWT payload (base64)
echo "{ID_TOKEN_PAYLOAD}" | base64 -d
```

**Decoded payload:**

```json
{
  "sub": "GQTPyRfed3",
  "name": "Your Name",
  "given_name": "Your",
  "family_name": "Name"
}
```

**Your member URN is:** `urn:li:person:{sub}` (e.g., `urn:li:person:GQTPyRfed3`)

> **Important:** The `sub` claim is NOT the numeric ID from your profile URL. It's a unique identifier assigned by LinkedIn's OpenID Connect.

### Step 5: Token Refresh

Access tokens expire after ~60 days. To refresh:

1. Direct user to authorization URL again (Step 1)
2. If user is still logged into LinkedIn and token hasn't expired, they're automatically redirected with a new code
3. Exchange new code for new token (Step 3)

---

## Environment Variables

Set these in `.env.local` (local) or Vercel Dashboard (production):

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKEDIN_CLIENT_ID` | For refresh | OAuth app Client ID |
| `LINKEDIN_CLIENT_SECRET` | For refresh | OAuth app Client Secret |
| `LINKEDIN_ACCESS_TOKEN` | Yes | Bearer token from OAuth flow |
| `LINKEDIN_PERSON_URN` | Yes | `urn:li:person:{sub}` from id_token |
| `LINKEDIN_DRY_RUN` | No | Set `true` to skip actual posting |

**Format Validation:**
- `LINKEDIN_PERSON_URN` must start with `urn:li:person:` or `urn:li:member:`
- App fails fast at startup if required variables are missing

---

## CLI Commands

The LinkedIn CLI (`scripts/linkedin-cli.ts`) provides standalone posting without requiring a development server.

### List Available Posts

```bash
npm run linkedin list

# JSON output
npm run linkedin list -- --json
```

**Output:**

```
Available LinkedIn Posts (14 total)
───────────────────────────────────

1. 2026-02-17-constraint-driven-architecture
   Topic: Constraint-Driven Architecture
   Audience: CTOs, Engineering Managers
   Characters: 1,911
```

### Post from File

```bash
# Dry-run (test without posting)
npm run linkedin post -- --file 2026-02-17-constraint-driven-architecture --dry-run

# Publish for real
npm run linkedin post -- --file 2026-02-17-constraint-driven-architecture --visibility PUBLIC
```

### Post Custom Content

```bash
npm run linkedin post -- --content "Your post text here" --visibility PUBLIC
```

### CLI Options

| Flag | Short | Description |
|------|-------|-------------|
| `--file` | `-f` | Post filename (without .md) |
| `--content` | `-c` | Custom content text |
| `--dry-run` | `-n` | Test without posting |
| `--visibility` | `-v` | PUBLIC or CONNECTIONS (default: PUBLIC) |
| `--json` | `-j` | Output as JSON |

### JSON Output

```bash
npm run linkedin post -- --file 2026-02-17-constraint-driven-architecture --json
```

```json
{
  "success": true,
  "postId": "urn:li:share:7421988546875592705",
  "dryRun": false,
  "metadata": {
    "filename": "2026-02-17-constraint-driven-architecture",
    "topic": "Constraint-Driven Architecture",
    "characterCount": 1911,
    "visibility": "PUBLIC"
  }
}
```

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | User error (invalid args, file not found) |
| 2 | API error (auth, rate limit, service error) |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_POSTS_DIR` | Override posts directory (default: `genAI/linkedin-posts/validated`) |
| `LINKEDIN_DRY_RUN` | Set to `true` for dry-run mode |

---

## Content Management

### File Location

Pre-written posts are stored in: `genAI/linkedin-posts/`

### File Format

**Filename pattern:** `YYYY-MM-DD-kebab-case-title.md`

**Structure:**

```markdown
---
date: 2026-02-17
topic: Constraint-Driven Architecture
target_audience: CTOs, Engineering Managers
---

Hello World, I built a production AI portfolio on free-tier services...

#MachineLearning #OpenToWork #SystemDesign #BuildInPublic
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | YYYY-MM-DD | Post date |
| `topic` | string | Post topic/category |
| `target_audience` | string | Intended audience |

### Content Guidelines

- **Hook**: Start with "Hello World," + 150-char summary (appears before "See more")
- **Body**: Problem → Solution → Community Impact
- **Length**: 1,000-1,300 characters optimal; 3,000 max
- **Hashtags**: Exactly 4 (1 high-reach, 2 targeted, 1 niche)
- **Format**: Text-only preferred; no emojis

---

## GitHub Actions Integration

The LinkedIn scheduler runs via GitHub Actions CRON (Tuesdays at 10:07 AM PST).

### Workflow Location

`.github/workflows/linkedin-scheduler.yml`

### Manual Trigger

```bash
# Trigger workflow
gh workflow run linkedin-scheduler.yml

# Dry-run test
gh workflow run linkedin-scheduler.yml -f dry_run=true

# Specific post
gh workflow run linkedin-scheduler.yml -f filename=2026-02-17-constraint-driven-architecture
```

### 7-Day Rotation

Posts in `genAI/linkedin-7day/` are rotated weekly:
- Index tracked in `.current-index` file
- Cycles back to first post after last
- Posts remain in directory (no archival)

### Dry-Run Mode

Set `LINKEDIN_DRY_RUN=true` in `.env.local` for local testing:

```bash
LINKEDIN_DRY_RUN=true npm run linkedin post -- --file test-post
```

Or use the `--dry-run` flag:

```bash
npm run linkedin post -- --file test-post --dry-run
```

---

## Troubleshooting

### "author does not match urn:li:company|urn:li:member"

**Cause:** Using wrong URN format.

**Solution:** The `LINKEDIN_PERSON_URN` must use the `sub` claim from the `id_token`, NOT the numeric ID from your profile URL.

### "ACCESS_DENIED: Field Value validation failed"

**Cause:** Member ID doesn't match the authenticated user.

**Solution:** Re-authorize with `openid` scope and extract the correct `sub` from the `id_token`.

### "Not enough permissions to access: userinfo"

**Cause:** Missing `openid` scope or "Sign In with LinkedIn" product not enabled.

**Solution:**
1. Enable "Sign In with LinkedIn using OpenID Connect" in Developer Portal
2. Re-authorize with `openid profile` scopes

### Token Expired

**Cause:** Access token expires after ~60 days.

**Solution:** Re-run the OAuth flow:
1. Visit authorization URL
2. Exchange new code for new token
3. Update `LINKEDIN_ACCESS_TOKEN` in environment

---

## Rate Limits

| Limit Type | Threshold |
|-----------|-----------|
| Member Daily Limit | 150 posts/day (UTC reset) |
| Application Daily Limit | 100,000 posts/day |

---

## Security Notes

- Access token stored server-side only (never exposed to client)
- Tokens not logged (only correlation IDs and metadata)
- Path traversal prevented via `path.basename()` sanitization
- All inputs validated with Zod schemas

---

## Related Files

| File | Purpose |
|------|---------|
| `scripts/linkedin-cli.ts` | Standalone CLI for posting |
| `src/lib/linkedin/client.ts` | LinkedIn API client |
| `src/lib/linkedin/content-loader.ts` | Markdown parser (configurable directory) |
| `src/types/linkedin-errors.ts` | Error definitions |
| `genAI/linkedin-posts/validated/*.md` | Validated posts (one-time queue) |
| `genAI/linkedin-7day/*.md` | Rotating posts (weekly cycle) |
| `.github/workflows/linkedin-scheduler.yml` | GitHub Actions CRON workflow |

---

## References

- [LinkedIn Authorization Code Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Share on LinkedIn API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
