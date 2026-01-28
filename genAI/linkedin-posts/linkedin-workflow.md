# LinkedIn Content Workflow

This document describes the end-to-end workflow for generating, validating, and publishing LinkedIn posts.

---

## Workflow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. GENERATE   │ ──► │   2. REVIEW     │ ──► │   3. VALIDATE   │ ──► │   4. PUBLISH    │
│   AI creates    │     │   Human edits   │     │   Move to       │     │   Manual or     │
│   draft post    │     │   and approves  │     │   validated/    │     │   CRON trigger  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
    drafts/               (edit in place)          validated/              posted/
```

---

## Directory Structure

```
genAI/linkedin-posts/
├── linkedin-workflow.md     # This file
├── drafts/                  # AI-generated posts pending review
│   └── YYYY-MM-DD-topic.md
├── validated/               # Human-approved posts ready to publish
│   └── YYYY-MM-DD-topic.md  # (14 posts currently)
└── posted/                  # Archive of published posts
    └── YYYY-MM-DD-topic.md
```

---

## Initial Setup (One-Time)

> **Skip this section** if you've already configured LinkedIn OAuth and GitHub secrets. Jump to [Step 1: Generate Content](#step-1-generate-content-with-claude-code).

### A. Create LinkedIn Developer Application

1. Navigate to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click **Create App**
3. Fill in required fields:
   - **App name**: Your app identifier (e.g., "Portfolio LinkedIn Bot")
   - **LinkedIn Page**: Link to a LinkedIn Page you admin (create one if needed)
   - **App logo**: Upload a square image
4. Click **Create app**
5. Note your credentials from the **Auth** tab:
   - **Client ID**: `xxxxxxxxxx`
   - **Client Secret**: `xxxxxxxxxxxxxxxxx`

### B. Enable Required Products

Navigate to your app's **Products** tab and request these:

| Product | Required Scope | Approval Time |
|---------|----------------|---------------|
| **Share on LinkedIn** | `w_member_social` (posting) | Instant |
| **Sign In with LinkedIn using OpenID Connect** | `openid` (member ID) | Instant |

**Wait for both products to show "Added" status before continuing.**

### C. Configure Redirect URI

In your app's **Auth** tab:

1. Scroll to "Authorized redirect URLs for your app"
2. Add: `http://localhost:3000/callback` (for local testing)
3. Add: `https://yourdomain.com/callback` (for production, if applicable)

> **Note:** The redirect URI must be HTTPS for production. Localhost with HTTP is allowed for development.

### D. Obtain Access Token (OAuth 2.0 Authorization Code Flow)

**Step D.1: Generate Authorization URL**

Construct this URL (replace `{YOUR_CLIENT_ID}`):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={YOUR_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=w_member_social%20openid%20profile&state=random123
```

**Step D.2: Authorize and Get Code**

1. Paste the authorization URL in your browser
2. Log in to LinkedIn (if not already)
3. Click **Allow** to grant permissions
4. LinkedIn redirects to: `http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=random123`
5. Copy the `code` value from the URL

> **Note:** The authorization code expires in 30 minutes and can only be used once.

**Step D.3: Exchange Code for Access Token**

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code={AUTHORIZATION_CODE}" \
  --data-urlencode "client_id={YOUR_CLIENT_ID}" \
  --data-urlencode "client_secret={YOUR_CLIENT_SECRET}" \
  --data-urlencode "redirect_uri=http://localhost:3000/callback"
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

**Save these values:**
- `access_token`: This is your `LINKEDIN_ACCESS_TOKEN` (~500 characters)
- `id_token`: Contains your member ID (JWT, ~1000 characters)

**Step D.4: Extract Member URN from id_token**

The `id_token` is a JWT with three parts separated by `.` (header.payload.signature). Decode the payload:

```bash
# Extract and decode the payload (second segment)
echo "{ID_TOKEN}" | cut -d '.' -f 2 | base64 -d 2>/dev/null
```

**Decoded payload example:**

```json
{
  "sub": "GQTPyRfed3",
  "name": "Your Name",
  "given_name": "Your",
  "family_name": "Name"
}
```

**Your member URN is:** `urn:li:person:{sub}`

Example: If `sub` is `GQTPyRfed3`, then `LINKEDIN_PERSON_URN=urn:li:person:GQTPyRfed3`

> **CRITICAL:** The `sub` value is NOT the numeric ID from your profile URL (e.g., `/in/yourname/123456789/`). It's an alphanumeric identifier from LinkedIn's OpenID Connect. Using the wrong ID causes "author does not match" errors.

### E. GitHub Secrets Configuration

Add these secrets to enable automated posting via GitHub Actions:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

| Secret Name | Value | Example |
|-------------|-------|---------|
| `LINKEDIN_ACCESS_TOKEN` | The `access_token` from OAuth response | `AQXy7D...` (~500 chars) |
| `LINKEDIN_PERSON_URN` | `urn:li:person:{sub}` from decoded id_token | `urn:li:person:GQTPyRfed3` |

**Verify secrets are set** in Settings → Secrets → Actions:

```
LINKEDIN_ACCESS_TOKEN    Updated X minutes ago
LINKEDIN_PERSON_URN      Updated X minutes ago
```

### F. Local Environment Setup

For local development and testing, create `.env.local`:

```bash
# LinkedIn API credentials
LINKEDIN_ACCESS_TOKEN=AQXy7D...your-token-here
LINKEDIN_PERSON_URN=urn:li:person:GQTPyRfed3

# Optional: Enable dry-run mode (no actual posts)
LINKEDIN_DRY_RUN=true
```

### G. Token Expiration & Renewal

LinkedIn access tokens expire after approximately **60 days** (~5,184,000 seconds).

**Set a calendar reminder** to refresh before expiration:
1. Re-run the OAuth flow (Steps D.1-D.4)
2. Update `LINKEDIN_ACCESS_TOKEN` in:
   - GitHub Secrets (for CRON automation)
   - `.env.local` (for local development)

---

## Understanding the File Lifecycle

Posts move through three directories representing their lifecycle stage:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POST LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   Human Review   ┌──────────────┐   Auto/Manual   ┌──────────────┐
│  │   drafts/    │ ────────────────►│  validated/  │ ───────────────►│   posted/    │
│  │              │       (mv)       │              │      (mv)       │              │
│  │ AI-generated │                  │ Human-approved│                 │  Published   │
│  │ pending edit │                  │ ready to post │                 │   archive    │
│  └──────────────┘                  └──────────────┘                 └──────────────┘
│        │                                  │                                │
│        ▼                                  ▼                                ▼
│   Created by:                        Moved by:                        Moved by:
│   - Claude Code                      - You (manual mv)                - GitHub Actions (auto)
│   - LinkedIn agent                                                    - You (manual mv)
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Purposes

| Directory | Purpose | Who Moves Files Here | When |
|-----------|---------|----------------------|------|
| `drafts/` | AI-generated posts awaiting human review | Claude Code / You | After generation |
| `validated/` | Approved posts queued for publishing | You | After review & edits |
| `posted/` | Archive of published posts | GitHub Actions / You | After successful publish |

### How CRON Automation Works

When the GitHub CRON runs (Tuesdays at 10 AM PST / 18:00 UTC):

1. **Checkout** repository
2. **Find oldest file** in `validated/` (sorted by filename date)
3. **POST** to `/api/linkedin/post` with filename
4. **On success:** Move `validated/{file}.md` → `posted/{file}.md`
5. **Git commit & push** (auto-archive)

**Key Behavior:**
- Only ONE post per CRON run (oldest first by filename date)
- Failed posts stay in `validated/` for retry next week
- Dry-run mode skips the actual post AND the file move

---

## Step 1: Generate Content with Claude Code

This project includes a pre-configured LinkedIn agent optimized for generating posts. Choose the method that fits your workflow.

### Option A: Using the LinkedIn Agent (Recommended)

The LinkedIn agent at `.claude/agents/linkedin.md` enforces all formatting rules automatically:

```bash
# Generate a post about a specific topic
claude "Using the linkedin agent, generate a post about Constraint-Driven Architecture"

# With target audience specified
claude "Using the linkedin agent, generate a post about GitHub as Data Warehouse for Data Engineers"
```

**What the agent handles automatically:**
- "Hello World," hook format with 150-char executive summary
- Job search statement included
- "Happy to connect..." CTA
- Exactly 4 hashtags (1 high-reach, 2 targeted, 1 niche)
- 1,000-1,300 character optimal length
- Reference citations with [1], [2] format
- Text-only, no emojis

### Option B: Interactive Session

Start Claude Code and work iteratively:

```bash
# Open Claude Code
claude

# Then provide the topic
> Using the linkedin agent, generate a post about [TOPIC]. Target audience: [AUDIENCE].

# Review the output, then ask Claude to save it
> Save this post to genAI/linkedin-posts/drafts/2026-01-27-topic-name.md
```

### Option C: One-Line with Manual Prompt

If you prefer more control over the prompt:

```bash
claude "Generate a LinkedIn post about [TOPIC] following the template in genAI/linkedin-posts/linkedin-workflow.md. Target audience: [AUDIENCE]. Save to genAI/linkedin-posts/drafts/YYYY-MM-DD-kebab-case-topic.md"
```

### Topic Ideas from Portfolio

| Topic | Target Audience | Key Points |
|-------|-----------------|------------|
| Constraint-Driven Architecture | CTOs, Engineering Managers | Zero-cost stack, Vercel limits as design constraints |
| GitHub as Data Warehouse | Data Engineers, DevOps | Monorepo, Actions-based ETL, 3-tier environments |
| RAG Without Vector DB | AI/ML Engineers | In-context retrieval, cost optimization |
| Multi-Agent Systems | DevOps, Tool Builders | Claude Code plugins, parallel agents |
| React 19 + Next.js 16 | Frontend Engineers | Modern fullstack patterns |
| Biochem to Cloud | Career Transitioners | Engineering mindset transfer |

### Post Generation Checklist

After Claude generates the post, verify:

1. Output includes YAML frontmatter (`date`, `topic`, `target_audience`)
2. Hook starts with "Hello World,"
3. Contains job search statement
4. Ends with connection CTA
5. Has exactly 4 hashtags

### Saving the Draft

If Claude didn't save automatically, save the output:

```bash
# Filename format: YYYY-MM-DD-kebab-case-topic.md
# Example: 2026-01-27-constraint-driven-architecture.md

# Ask Claude to save it
claude "Save the LinkedIn post to genAI/linkedin-posts/drafts/2026-01-27-your-topic.md"
```

---

## Step 2: Review & Edit Drafts

### Review Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Read Draft    │ ──► │   Edit/Refine   │ ──► │   Validate      │
│   in drafts/    │     │   (iterate)     │     │   (checklist)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Step 2.1: Review the Draft

```bash
# View the draft
cat genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md

# Or open in your editor
code genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md
```

### Step 2.2: Edit with Claude Code (Optional)

Ask Claude to refine specific aspects:

```bash
# Improve the hook
claude "Review the hook in genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md and suggest a more compelling 150-character opening"

# Shorten to optimal length
claude "The post at genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md is too long. Reduce it to 1,200 characters while keeping the key points."

# Verify references have working URLs
claude "Check that the references in genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md have working URLs"
```

### Step 2.3: Validation Commands

| Check | Command | Expected |
|-------|---------|----------|
| Frontmatter valid | `head -5 genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md` | Has date, topic, target_audience |
| Character count | `sed '1,/^---$/d' genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md \| sed '/^---$/,$d' \| wc -c` | 1,000-1,300 (optimal) or <3,000 |
| Hashtag count | `grep -c '^#' genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md` | Exactly 4 |

### Step 2.4: Validation Checklist

Before moving to `validated/`, verify:

- [ ] **Frontmatter complete**: date, topic, target_audience
- [ ] **Hook quality**: First 150 chars compelling (appears before "See more")
- [ ] **Character count**: 1,000-1,300 optimal, max 3,000
- [ ] **Structure**: Problem → Solution → Community Impact flow
- [ ] **Job search mention**: Includes "actively interviewing for AI/ML Engineering roles"
- [ ] **CTA present**: Ends with "Happy to connect, network, and chat..."
- [ ] **References**: 1-2 valid URLs with [1], [2] format
- [ ] **Hashtags**: Exactly 4 (1 high-reach, 2 targeted, 1 niche)
- [ ] **No emojis**: Text-only content
- [ ] **Spelling/grammar**: Proofread for errors

---

## Step 3: Validate (Move to Production)

Once reviewed and approved:

```bash
# Move from drafts to validated
mv genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md genAI/linkedin-posts/validated/

# Commit the change
git add genAI/linkedin-posts/
git commit -m "Add validated LinkedIn post: [Topic]"
git push
```

---

## Step 4: Publish

### Option A: Manual Posting (CLI - No Server Required)

The LinkedIn CLI allows posting directly without starting the development server:

```bash
# List available validated posts
npm run linkedin list

# Post specific file (dry-run first to verify)
npm run linkedin post -- --file YYYY-MM-DD-topic --dry-run

# Post for real
npm run linkedin post -- --file YYYY-MM-DD-topic --visibility PUBLIC

# Post with CONNECTIONS visibility (limited audience for testing)
npm run linkedin post -- --file YYYY-MM-DD-topic --visibility CONNECTIONS

# Post custom content directly
npm run linkedin post -- --content "Your LinkedIn post text here" --dry-run
```

**CLI Options:**
| Flag | Description |
|------|-------------|
| `--file, -f` | Post filename (without .md extension) |
| `--content, -c` | Custom content to post directly |
| `--dry-run, -n` | Simulate without posting |
| `--visibility, -v` | PUBLIC or CONNECTIONS (default: PUBLIC) |
| `--json, -j` | Output as JSON (useful for scripts) |

### Option B: Automated Posting (GitHub CRON)

See [GitHub CRON Setup](#github-cron-job-setup) below.

### Post-Publish: Archive

After successful posting:

```bash
# Move to posted archive
mv genAI/linkedin-posts/validated/YYYY-MM-DD-topic.md genAI/linkedin-posts/posted/

# Commit
git add genAI/linkedin-posts/
git commit -m "Archive posted LinkedIn content: [Topic]"
git push
```

---

## GitHub CRON Job Setup

### Schedule

Posts are published automatically every **Tuesday at 10:07 AM PST** (18:07 UTC).

### Workflow File

The workflow at `.github/workflows/linkedin-scheduler.yml` uses the CLI directly (no server required):

```yaml
name: LinkedIn Post Scheduler

on:
  schedule:
    # Every Tuesday at 10:07 AM PST (18:07 UTC) - offset to avoid queue congestion
    - cron: '7 18 * * 2'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (no actual posting)'
        required: false
        default: 'false'
        type: boolean
      filename:
        description: 'Specific post filename (optional, without .md)'
        required: false
        type: string

env:
  LINKEDIN_ACCESS_TOKEN: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}
  LINKEDIN_PERSON_URN: ${{ secrets.LINKEDIN_PERSON_URN }}

jobs:
  post-to-linkedin:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Get oldest validated post
        id: get-post
        run: |
          OLDEST_POST=$(ls -1 genAI/linkedin-posts/validated/*.md 2>/dev/null | sort | head -1 | xargs -r basename | sed 's/.md$//')
          if [ -z "$OLDEST_POST" ]; then
            echo "No validated posts available"
            echo "has_post=false" >> $GITHUB_OUTPUT
          else
            echo "Found post: $OLDEST_POST"
            echo "filename=$OLDEST_POST" >> $GITHUB_OUTPUT
            echo "has_post=true" >> $GITHUB_OUTPUT
          fi

      - name: Post to LinkedIn
        if: steps.get-post.outputs.has_post == 'true'
        id: post
        env:
          POST_FILENAME: ${{ github.event.inputs.filename || steps.get-post.outputs.filename }}
          LINKEDIN_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
        run: |
          DRY_RUN_FLAG=""
          if [ "$LINKEDIN_DRY_RUN" = "true" ]; then
            DRY_RUN_FLAG="--dry-run"
          fi

          npm run linkedin -- post --file "$POST_FILENAME" --visibility PUBLIC --json $DRY_RUN_FLAG > result.json
          cat result.json

          if grep -q '"success":true' result.json; then
            echo "success=true" >> $GITHUB_OUTPUT
          else
            echo "success=false" >> $GITHUB_OUTPUT
            exit 1
          fi

      - name: Archive posted content
        if: steps.get-post.outputs.has_post == 'true' && steps.post.outputs.success == 'true' && github.event.inputs.dry_run != true
        env:
          POST_FILENAME: ${{ github.event.inputs.filename || steps.get-post.outputs.filename }}
        run: |
          mkdir -p genAI/linkedin-posts/posted
          mv "genAI/linkedin-posts/validated/${POST_FILENAME}.md" genAI/linkedin-posts/posted/

          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add genAI/linkedin-posts/
          git diff --staged --quiet || git commit -m "Archive posted LinkedIn content: ${POST_FILENAME}"
          git push
```

**Key improvements over server-based approach:**
- No build step required (~30-60s faster)
- No server startup/shutdown overhead
- Simpler error handling
- Direct CLI execution

### Required Secrets

Add these secrets in GitHub: **Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth access token (expires ~60 days) |
| `LINKEDIN_PERSON_URN` | `urn:li:person:{sub}` from id_token |

### Manual Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab in GitHub
2. Select **LinkedIn Post Scheduler**
3. Click **Run workflow**
4. Optionally set:
   - `dry_run: true` - Test without posting
   - `filename: specific-post-name` - Post a specific file

---

## Dry-Run Testing

### Local Dry-Run (CLI)

Use the `--dry-run` flag to test without posting:

```bash
# Dry-run a specific post
npm run linkedin post -- --file YYYY-MM-DD-topic --dry-run

# Dry-run with JSON output
npm run linkedin post -- --file YYYY-MM-DD-topic --dry-run --json
```

**Response example:**

```json
{
  "success": true,
  "postId": "dry-run-1706806440000",
  "dryRun": true,
  "metadata": {
    "filename": "YYYY-MM-DD-topic",
    "topic": "Topic Name",
    "characterCount": 1234,
    "visibility": "PUBLIC"
  }
}
```

**Alternative:** Set environment variable in `.env.local`:

```bash
LINKEDIN_DRY_RUN=true
```

### GitHub Actions Dry-Run

Trigger workflow with `dry_run: true` input:

```bash
gh workflow run linkedin-scheduler.yml -f dry_run=true
```

---

## Token Refresh Reminder

LinkedIn access tokens expire after ~60 days. Set a calendar reminder to refresh before expiration.

**Refresh Steps:**

1. Visit authorization URL (see `system_design_docs/linkedin-api.md`)
2. Exchange code for new token
3. Update `LINKEDIN_ACCESS_TOKEN` in:
   - `.env.local` (local)
   - GitHub Secrets (production)
   - Vercel Dashboard (if deployed)

---

## Troubleshooting

### No posts available

```
No validated posts available
```

**Solution:** Add posts to `genAI/linkedin-posts/validated/`

### Token expired

```
{"error":{"code":"LINKEDIN_AUTH_EXPIRED"}}
```

**Solution:** Refresh OAuth token (see Token Refresh section)

### Rate limit exceeded

```
{"error":{"code":"LINKEDIN_QUOTA_EXCEEDED"}}
```

**Solution:** LinkedIn allows 150 posts/day. Wait until UTC midnight reset.

---

## Related Documentation

| Document | Purpose | When to Reference |
|----------|---------|-------------------|
| [LinkedIn API Documentation](../system_design_docs/linkedin-api.md) | Detailed API specs, error codes, rate limits | Troubleshooting API errors |
| [LinkedIn Agent](../.claude/agents/linkedin.md) | Claude Code agent for post generation | Customizing generation prompts |
| [GitHub Workflow](../.github/workflows/linkedin-scheduler.yml) | CRON automation code | Debugging scheduled posts |

---

## Quick Reference Commands

### Generate a Post

```bash
claude "Using the linkedin agent, generate a post about [TOPIC]"
```

### Check Character Count

```bash
sed '1,/^---$/d' genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md | sed '/^---$/,$d' | wc -c
```

### Validate & Promote to Queue

```bash
mv genAI/linkedin-posts/drafts/YYYY-MM-DD-topic.md genAI/linkedin-posts/validated/
git add genAI/linkedin-posts/ && git commit -m "Validate: topic-name" && git push
```

### List Available Posts (CLI)

```bash
npm run linkedin list
npm run linkedin list -- --json
```

### Manual Post (CLI - No Server Required)

```bash
# Dry-run first
npm run linkedin post -- --file YYYY-MM-DD-topic --dry-run

# Post for real
npm run linkedin post -- --file YYYY-MM-DD-topic --visibility PUBLIC

# Post custom content
npm run linkedin post -- --content "Your text here" --dry-run
```

### Trigger GitHub Workflow Manually

```bash
gh workflow run linkedin-scheduler.yml
```

### Dry-Run Test (GitHub Actions)

```bash
gh workflow run linkedin-scheduler.yml -f dry_run=true
```
