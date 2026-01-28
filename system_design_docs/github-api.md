# GitHub Actions: CRON, API & Secrets Best Practices

Cross-platform integration patterns for GitHub Actions with Vercel, external APIs, and secure secrets management.

---

## Table of Contents

1. [CRON Schedule Configuration](#1-cron-schedule-configuration)
2. [Secrets Management](#2-secrets-management)
3. [Cross-Platform Integration Patterns](#3-cross-platform-integration-patterns)
4. [API Integration](#4-api-integration)
5. [Idempotency & Error Handling](#5-idempotency--error-handling)
6. [Rate Limits & Quotas](#6-rate-limits--quotas)
7. [Workflow Templates](#7-workflow-templates)

---

## 1. CRON Schedule Configuration

### Syntax

```yaml
on:
  schedule:
    # Format: minute hour day-of-month month day-of-week
    # All times are UTC
    - cron: '0 18 * * 2'  # Tuesday 10:00 AM PST (18:00 UTC)
```

### Field Reference

| Field | Values | Special Characters |
|-------|--------|-------------------|
| Minute | 0-59 | `*` `,` `-` `/` |
| Hour | 0-23 | `*` `,` `-` `/` |
| Day of Month | 1-31 | `*` `,` `-` `/` |
| Month | 1-12 | `*` `,` `-` `/` |
| Day of Week | 0-6 (Sun=0) | `*` `,` `-` `/` |

### Common Patterns

```yaml
# Every 30 minutes
- cron: '*/30 * * * *'

# Daily at midnight UTC
- cron: '0 0 * * *'

# Weekdays at 9 AM UTC
- cron: '0 9 * * 1-5'

# First day of month at noon UTC
- cron: '0 12 1 * *'

# Every Tuesday at 10 AM PST (18:00 UTC)
- cron: '0 18 * * 2'
```

### Best Practices

1. **Always use UTC** — GitHub Actions runs in UTC; convert local times accordingly
2. **Avoid minute 0** — Popular times cause queue delays; use offset (e.g., `7`, `23`)
3. **Include `workflow_dispatch`** — Enables manual testing without waiting for schedule
4. **Add dry-run input** — Test workflows without side effects

```yaml
on:
  schedule:
    - cron: '7 18 * * 2'  # Offset from :00 to avoid congestion
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Run without making changes'
        type: boolean
        default: false
      target:
        description: 'Specific item to process (optional)'
        type: string
        required: false
```

### Timezone Conversion Reference

| Local Time (PST/PDT) | UTC Offset | UTC Time |
|---------------------|------------|----------|
| 6:00 AM PST | -8 hours | 14:00 UTC |
| 9:00 AM PST | -8 hours | 17:00 UTC |
| 10:00 AM PST | -8 hours | 18:00 UTC |
| 12:00 PM PST | -8 hours | 20:00 UTC |
| 6:00 AM PDT | -7 hours | 13:00 UTC |

---

## 2. Secrets Management

### Storage Hierarchy

| Type | Location | Access Syntax | Use Case |
|------|----------|---------------|----------|
| **Secrets** | Settings → Secrets | `${{ secrets.NAME }}` | API keys, tokens, passwords |
| **Variables** | Settings → Variables | `${{ vars.NAME }}` | Non-sensitive config |
| **Environment** | Workflow `env:` block | `${{ env.NAME }}` | Computed values |

### Configuration Locations

**GitHub:** Repository → Settings → Secrets and variables → Actions

**Vercel:** Project → Settings → Environment Variables

**Local:** `.env.local` (gitignored)

### Access Patterns

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      # Secrets (sensitive)
      API_TOKEN: ${{ secrets.API_TOKEN }}

      # Variables (non-sensitive config)
      DEPLOY_ENV: ${{ vars.DEPLOY_ENV }}

      # Computed at runtime
      BUILD_ID: ${{ github.run_id }}

    steps:
      - name: Use secrets in commands
        run: |
          curl -H "Authorization: Bearer $API_TOKEN" \
            https://api.example.com/endpoint
```

### Environment-Scoped Secrets

For staging vs production isolation:

```yaml
jobs:
  deploy-staging:
    environment: staging
    env:
      API_URL: ${{ secrets.STAGING_API_URL }}

  deploy-production:
    environment: production
    needs: deploy-staging
    env:
      API_URL: ${{ secrets.PRODUCTION_API_URL }}
```

### Security Rules

1. **Never echo secrets** — GitHub auto-masks, but defense-in-depth applies
2. **Never hardcode** — Use secrets even for "temporary" values
3. **Rotate before expiration** — Track token lifetimes (e.g., LinkedIn = 60 days)
4. **Minimize scope** — Use repository-level, not organization-level, when possible
5. **Audit access** — Review who has repository admin access periodically

### Multi-Platform Secret Sync

Keep secrets consistent across deployment platforms:

```
┌─────────────────────────────────────────────────────┐
│              Source of Truth                         │
│         (Password Manager / Vault)                   │
└─────────────────┬───────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐
│ GitHub │  │  Vercel  │  │ .env.local│  │  AWS    │
│Secrets │  │   Env    │  │(gitignored)│  │ Secrets │
└────────┘  └──────────┘  └───────────┘  └─────────┘
```

### Token Expiration Tracking

| Service | Token Type | Expiration | Refresh Method |
|---------|-----------|------------|----------------|
| LinkedIn | OAuth Access Token | 60 days | Re-authorize via OAuth flow |
| GitHub | PAT (classic) | Configurable | Regenerate in Settings |
| GitHub | PAT (fine-grained) | Configurable | Regenerate in Settings |
| Vercel | Deploy Token | Never | Revoke and recreate |
| Google Cloud | Service Account | Never | Rotate keys periodically |

---

## 3. Cross-Platform Integration Patterns

### Pattern 1: Git Push Trigger (Vercel-Pinger)

GitHub Actions triggers Vercel deployment via git push:

```
GitHub CRON → Process → Git Commit → Push → Vercel Webhook → Deploy
```

```yaml
- name: Commit and trigger deployment
  run: |
    git config user.name "GitHub Actions"
    git config user.email "actions@github.com"
    git add .
    git commit -m "Automated update: $(date -u +%Y-%m-%d)"
    git push
```

**Use case:** State changes that require deployment (file moves, content updates)

### Pattern 2: Direct API Call

Invoke external APIs directly from workflow:

```yaml
- name: Trigger Vercel deployment
  run: |
    curl -X POST "https://api.vercel.com/v1/integrations/deploy/$DEPLOY_HOOK"
  env:
    DEPLOY_HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}
```

**Use case:** Trigger deployment without code changes

### Pattern 3: Repository Dispatch

Trigger workflows in other repositories:

```yaml
# Sender workflow
- name: Trigger downstream workflow
  run: |
    curl -X POST \
      -H "Authorization: token ${{ secrets.REPO_ACCESS_TOKEN }}" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/repos/owner/other-repo/dispatches \
      -d '{"event_type":"deploy-trigger","client_payload":{"ref":"main"}}'
```

```yaml
# Receiver workflow (in other-repo)
on:
  repository_dispatch:
    types: [deploy-trigger]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Triggered with ref: ${{ github.event.client_payload.ref }}"
```

**Use case:** Cross-repository orchestration, monorepo deployments

### Pattern 4: Webhook Dispatch

Notify external services:

```yaml
- name: Notify Slack
  run: |
    curl -X POST "$SLACK_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d '{"text":"Deployment complete: ${{ github.sha }}"}'
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**Use case:** Notifications to Slack, Discord, custom services

---

## 4. API Integration

### REST API Call Pattern

```yaml
- name: Call external API
  id: api-call
  run: |
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST "$API_ENDPOINT" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"key": "value"}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ge 400 ]; then
      echo "API call failed with status $HTTP_CODE"
      echo "$BODY"
      exit 1
    fi

    echo "response=$BODY" >> $GITHUB_OUTPUT
  env:
    API_ENDPOINT: https://api.example.com/endpoint
    API_TOKEN: ${{ secrets.API_TOKEN }}
```

### GraphQL API Pattern

```yaml
- name: Query GitHub GraphQL API
  run: |
    curl -X POST https://api.github.com/graphql \
      -H "Authorization: bearer ${{ secrets.GITHUB_TOKEN }}" \
      -H "Content-Type: application/json" \
      -d '{
        "query": "query { viewer { login } }"
      }'
```

### Error Response Handling

```yaml
- name: API call with retry
  run: |
    MAX_RETRIES=3
    RETRY_DELAY=5

    for i in $(seq 1 $MAX_RETRIES); do
      HTTP_CODE=$(curl -s -o response.json -w "%{http_code}" \
        -X POST "$API_ENDPOINT" \
        -H "Authorization: Bearer $API_TOKEN")

      if [ "$HTTP_CODE" -eq 200 ]; then
        echo "Success"
        exit 0
      elif [ "$HTTP_CODE" -eq 429 ]; then
        echo "Rate limited, waiting ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
        RETRY_DELAY=$((RETRY_DELAY * 2))
      else
        echo "Failed with status $HTTP_CODE"
        cat response.json
        exit 1
      fi
    done

    echo "Max retries exceeded"
    exit 1
```

---

## 5. Idempotency & Error Handling

### Precondition Checks

```yaml
- name: Check preconditions
  id: check
  run: |
    # Check if work exists
    if [ -z "$(ls validated/*.md 2>/dev/null)" ]; then
      echo "has_work=false" >> $GITHUB_OUTPUT
      echo "No files to process"
      exit 0  # Success—nothing to do is not an error
    fi
    echo "has_work=true" >> $GITHUB_OUTPUT

- name: Process files
  if: steps.check.outputs.has_work == 'true'
  run: |
    # Actual processing logic
```

### Conditional Step Execution

```yaml
- name: Get oldest item
  id: get-item
  run: |
    OLDEST=$(ls -t validated/*.md 2>/dev/null | tail -1)
    if [ -n "$OLDEST" ]; then
      echo "file=$OLDEST" >> $GITHUB_OUTPUT
      echo "has_item=true" >> $GITHUB_OUTPUT
    else
      echo "has_item=false" >> $GITHUB_OUTPUT
    fi

- name: Process item
  if: steps.get-item.outputs.has_item == 'true'
  run: echo "Processing ${{ steps.get-item.outputs.file }}"

- name: Archive item
  if: steps.get-item.outputs.has_item == 'true'
  run: mv "${{ steps.get-item.outputs.file }}" archived/
```

### Dry Run Mode

```yaml
- name: Set execution mode
  run: |
    if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
      echo "DRY_RUN=true" >> $GITHUB_ENV
      echo "Running in dry-run mode"
    else
      echo "DRY_RUN=false" >> $GITHUB_ENV
    fi

- name: Execute action
  run: |
    if [ "$DRY_RUN" = "true" ]; then
      echo "[DRY RUN] Would execute: $COMMAND"
    else
      eval "$COMMAND"
    fi
```

### Cleanup on Failure

```yaml
- name: Process with cleanup
  id: process
  run: |
    # Create temp resources
    mkdir -p temp_work

    # Do work (may fail)
    ./process.sh

- name: Cleanup on failure
  if: failure() && steps.process.outcome == 'failure'
  run: |
    rm -rf temp_work
    echo "Cleaned up temporary resources"
```

---

## 6. Rate Limits & Quotas

### Platform Limits

| Platform | Resource | Limit | Safe Threshold |
|----------|----------|-------|----------------|
| **GitHub Actions** | Minutes (free) | 2,000/month | ~60 min/day |
| **GitHub Actions** | Concurrent jobs | 20 | 10 |
| **GitHub API** | Requests | 5,000/hour | 3,000/hour |
| **Vercel (Hobby)** | Deployments | 100/day | 24/day (hourly) |
| **Vercel (Hobby)** | Serverless execution | 100 GB-hours/month | 70 GB-hours |
| **LinkedIn Share API** | Posts | 150/day | 10/day |

### Rate Limit Headers

Most APIs return rate limit info in headers:

```yaml
- name: Check rate limits
  run: |
    RESPONSE=$(curl -s -I \
      -H "Authorization: Bearer $API_TOKEN" \
      https://api.example.com/endpoint)

    REMAINING=$(echo "$RESPONSE" | grep -i "x-ratelimit-remaining" | awk '{print $2}')
    RESET=$(echo "$RESPONSE" | grep -i "x-ratelimit-reset" | awk '{print $2}')

    echo "Remaining requests: $REMAINING"
    echo "Reset time: $(date -d @$RESET)"

    if [ "$REMAINING" -lt 10 ]; then
      echo "::warning::Rate limit low: $REMAINING requests remaining"
    fi
```

### Backoff Strategy

```yaml
- name: API call with exponential backoff
  run: |
    DELAY=1
    MAX_DELAY=60

    while true; do
      RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT")
      CODE=$(echo "$RESPONSE" | tail -n1)

      if [ "$CODE" -eq 200 ]; then
        break
      elif [ "$CODE" -eq 429 ]; then
        echo "Rate limited. Waiting ${DELAY}s..."
        sleep $DELAY
        DELAY=$((DELAY * 2))
        [ $DELAY -gt $MAX_DELAY ] && DELAY=$MAX_DELAY
      else
        exit 1
      fi
    done
```

---

## 7. Workflow Templates

### Minimal CRON Template

```yaml
name: Scheduled Task

on:
  schedule:
    - cron: '0 18 * * 2'  # Adjust to your schedule
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Dry run mode'
        type: boolean
        default: false

jobs:
  run-task:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run task
        run: echo "Task executed"
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
```

### Full Integration Template

```yaml
name: Cross-Platform Integration

on:
  schedule:
    - cron: '7 18 * * 2'  # Tuesday 10:07 AM PST
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Run without side effects'
        type: boolean
        default: false
      target:
        description: 'Specific target (optional)'
        type: string
        required: false

env:
  API_TOKEN: ${{ secrets.API_TOKEN }}

jobs:
  process:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check preconditions
        id: check
        run: |
          if [ -z "$(ls input/*.md 2>/dev/null)" ]; then
            echo "has_work=false" >> $GITHUB_OUTPUT
            exit 0
          fi
          echo "has_work=true" >> $GITHUB_OUTPUT

      - name: Set execution mode
        if: steps.check.outputs.has_work == 'true'
        run: |
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            echo "DRY_RUN=true" >> $GITHUB_ENV
          else
            echo "DRY_RUN=false" >> $GITHUB_ENV
          fi

      - name: Process items
        if: steps.check.outputs.has_work == 'true'
        run: |
          for file in input/*.md; do
            if [ "$DRY_RUN" = "true" ]; then
              echo "[DRY RUN] Would process: $file"
            else
              ./process.sh "$file"
              mv "$file" processed/
            fi
          done

      - name: Commit changes
        if: steps.check.outputs.has_work == 'true' && env.DRY_RUN != 'true'
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git diff --staged --quiet || git commit -m "Automated processing: $(date -u +%Y-%m-%d)"
          git push

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{"text":"Workflow failed: ${{ github.workflow }} - ${{ github.run_id }}"}'
```

---

## Related Documentation

- [LinkedIn API Integration](./linkedin-api.md) — OAuth setup and Share API usage
- [Deployment Architecture](./deployment.md) — Vercel integration patterns
- [Architecture Overview](../markdown/architecture.md) — System design constraints

---

*Last updated: 2025-01-27*
