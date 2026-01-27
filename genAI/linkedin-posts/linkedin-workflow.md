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

## Step 1: Generate Content

### Prompt Template for Claude/AI

Use this prompt to generate a new LinkedIn post:

```
Generate a LinkedIn post about [TOPIC] for my portfolio.

Requirements:
- Target audience: [AUDIENCE - e.g., "CTOs, Engineering Managers"]
- Hook: Start with "Hello World," followed by a 150-character summary
- Structure: Problem → Solution → Community Impact (3 paragraphs)
- Include: "At this time, I am actively interviewing for AI/ML Engineering roles"
- End with: "Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!"
- References: Include 1-2 citations with numbered brackets [1], [2]
- Hashtags: Exactly 4 hashtags (1 high-reach like #MachineLearning, 2 targeted, 1 niche)
- Length: 1,000-1,300 characters (optimal for engagement), max 3,000
- Format: Text-only, no emojis

Output as markdown with YAML frontmatter:
---
date: YYYY-MM-DD
topic: [Topic Title]
target_audience: [Audience]
---

[Post content here]
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

### Generate Command

```bash
# Using Claude Code
claude "Generate a LinkedIn post about [TOPIC] following the template in genAI/linkedin-posts/linkedin-workflow.md"

# Save output to drafts/
# Filename: YYYY-MM-DD-kebab-case-topic.md
```

---

## Step 2: Review & Edit

### Validation Checklist

Before moving to `validated/`, verify:

- [ ] **Frontmatter complete**: date, topic, target_audience
- [ ] **Hook quality**: First 150 chars compelling (appears before "See more")
- [ ] **Character count**: 1,000-1,300 optimal (check with `wc -c`)
- [ ] **Structure**: Problem → Solution → Impact flow
- [ ] **Job search mention**: Includes active interviewing statement
- [ ] **CTA present**: Ends with connection invitation
- [ ] **References**: 1-2 valid URLs with [1], [2] format
- [ ] **Hashtags**: Exactly 4, properly formatted
- [ ] **No emojis**: Text-only content
- [ ] **Spelling/grammar**: Proofread for errors

### Character Count Command

```bash
# Check character count (excluding frontmatter)
sed '1,/^---$/d' drafts/YYYY-MM-DD-topic.md | sed '/^---$/,$d' | wc -c
```

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

### Option A: Manual Posting

```bash
# Start dev server
npm run dev

# List available validated posts
curl http://localhost:3000/api/linkedin/content

# Post specific file
curl -X POST http://localhost:3000/api/linkedin/post \
  -H 'Content-Type: application/json' \
  -d '{"source":"file","filename":"YYYY-MM-DD-topic","visibility":"PUBLIC"}'

# Post with CONNECTIONS visibility (limited audience for testing)
curl -X POST http://localhost:3000/api/linkedin/post \
  -H 'Content-Type: application/json' \
  -d '{"source":"file","filename":"YYYY-MM-DD-topic","visibility":"CONNECTIONS"}'
```

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

Posts are published automatically every **Tuesday at 10:00 AM PST** (18:00 UTC).

### Workflow File

Create `.github/workflows/linkedin-scheduler.yml`:

```yaml
name: LinkedIn Post Scheduler

on:
  schedule:
    # Every Tuesday at 10:00 AM PST (18:00 UTC)
    - cron: '0 18 * * 2'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run (no actual posting)'
        required: false
        default: 'false'
        type: boolean
      filename:
        description: 'Specific post filename (optional)'
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

      - name: Build application
        run: npm run build

      - name: Start server
        run: |
          npm start &
          sleep 10  # Wait for server to start

      - name: Get oldest validated post
        id: get-post
        run: |
          # Get the oldest post by date (first to be published)
          OLDEST_POST=$(ls -1 genAI/linkedin-posts/validated/*.md 2>/dev/null | head -1 | xargs basename | sed 's/.md$//')
          if [ -z "$OLDEST_POST" ]; then
            echo "No validated posts available"
            echo "has_post=false" >> $GITHUB_OUTPUT
          else
            echo "filename=$OLDEST_POST" >> $GITHUB_OUTPUT
            echo "has_post=true" >> $GITHUB_OUTPUT
          fi

      - name: Post to LinkedIn
        if: steps.get-post.outputs.has_post == 'true'
        env:
          DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          POST_FILENAME: ${{ github.event.inputs.filename || steps.get-post.outputs.filename }}
          LINKEDIN_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
        run: |
          RESPONSE=$(curl -s -X POST http://localhost:3000/api/linkedin/post \
            -H 'Content-Type: application/json' \
            -d "{\"source\":\"file\",\"filename\":\"$POST_FILENAME\",\"visibility\":\"PUBLIC\"}")

          echo "Response: $RESPONSE"

          # Check if successful
          SUCCESS=$(echo $RESPONSE | grep -o '"success":true')
          if [ -z "$SUCCESS" ]; then
            echo "Failed to post to LinkedIn"
            exit 1
          fi

          echo "Successfully posted: $POST_FILENAME"

      - name: Archive posted content
        if: steps.get-post.outputs.has_post == 'true' && github.event.inputs.dry_run != 'true'
        env:
          POST_FILENAME: ${{ github.event.inputs.filename || steps.get-post.outputs.filename }}
        run: |
          mkdir -p genAI/linkedin-posts/posted
          mv "genAI/linkedin-posts/validated/${POST_FILENAME}.md" genAI/linkedin-posts/posted/

          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add genAI/linkedin-posts/
          git commit -m "Archive posted LinkedIn content: ${POST_FILENAME}"
          git push
```

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

### Local Dry-Run

Set environment variable:

```bash
# In .env.local
LINKEDIN_DRY_RUN=true
```

Response includes the full payload without posting:

```json
{
  "success": true,
  "postId": "dry-run-1706806440000",
  "dryRun": true,
  "payload": {
    "author": "urn:li:person:...",
    "lifecycleState": "PUBLISHED",
    "specificContent": {...}
  }
}
```

### GitHub Actions Dry-Run

Trigger workflow with `dry_run: true` input.

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

- [LinkedIn API Documentation](../system_design_docs/linkedin-api.md)
- [OAuth Setup Walkthrough](../system_design_docs/linkedin-api.md#oauth-20-setup-walkthrough)
- [Content Guidelines](../system_design_docs/linkedin-api.md#content-guidelines)
