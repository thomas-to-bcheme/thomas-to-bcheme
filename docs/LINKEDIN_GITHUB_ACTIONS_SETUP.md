# GitHub Actions Setup for LinkedIn Scheduler

## Overview

This guide walks you through setting up the automated LinkedIn posting workflow on GitHub Actions.

---

## Prerequisites

Before GitHub Actions can post:
1. LinkedIn Developer App (created at linkedin.com/developers)
2. OAuth access token + person URN
3. GitHub repository with the workflow file committed

---

## Step 1: Create LinkedIn Developer App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click **Create App**
3. Fill in:
   - App name (e.g., "Portfolio LinkedIn Bot")
   - LinkedIn Page (create one if needed)
   - App logo
4. Note your **Client ID** and **Client Secret**

---

## Step 2: Enable Required Products

In your app's **Products** tab, request:

| Product | Purpose |
|---------|---------|
| **Share on LinkedIn** | Enables `w_member_social` scope (posting) |
| **Sign In with LinkedIn using OpenID Connect** | Enables `openid` scope (get member ID) |

Wait for both to show "Added" status.

---

## Step 3: Configure Redirect URI

In your app's **Auth** tab:
1. Add `http://localhost:3000/callback` under "Authorized redirect URLs"

---

## Step 4: Get OAuth Access Token

### 4a. Generate Authorization URL

Replace `{YOUR_CLIENT_ID}`:

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={YOUR_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=w_member_social%20openid%20profile&state=random123
```

### 4b. Authorize

1. Paste URL in browser
2. Log into LinkedIn
3. Click **Allow**
4. LinkedIn redirects to: `http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=random123`
5. Copy the `code` value (expires in 30 min)

### 4c. Exchange Code for Token

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
  "id_token": "eyJ..."
}
```

Save:
- `access_token` → this is your `LINKEDIN_ACCESS_TOKEN`
- `id_token` → contains your member ID

### 4d. Extract Member URN from id_token

```bash
# Decode the JWT payload (second segment)
echo "{ID_TOKEN}" | cut -d '.' -f 2 | base64 -d
```

Output:
```json
{
  "sub": "GQTPyRfed3"
}
```

**Your URN is:** `urn:li:person:GQTPyRfed3`

---

## Step 5: Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

| Secret Name | Value |
|-------------|-------|
| `LINKEDIN_ACCESS_TOKEN` | The `access_token` from Step 4c (~500 chars) |
| `LINKEDIN_PERSON_URN` | `urn:li:person:{sub}` from Step 4d |

---

## Step 6: Commit the Workflow File

The workflow file is already at `.github/workflows/linkedin-scheduler.yml`.

Push to GitHub:
```bash
git add .github/workflows/linkedin-scheduler.yml
git commit -m "Add LinkedIn scheduler workflow"
git push
```

---

## Step 7: Test with Manual Trigger

### Via GitHub UI:
1. Go to **Actions** tab
2. Select **LinkedIn Post Scheduler**
3. Click **Run workflow**
4. Set `dry_run: true` for testing
5. Click **Run workflow**

### Via CLI:
```bash
# Dry-run test
gh workflow run linkedin-scheduler.yml -f dry_run=true

# Real post
gh workflow run linkedin-scheduler.yml
```

---

## Schedule

The workflow runs automatically every **Tuesday at 8:07 AM PST** (16:07 UTC).

---

## Token Refresh

LinkedIn tokens expire after ~60 days. Set a calendar reminder to:
1. Re-run Steps 4a-4d
2. Update `LINKEDIN_ACCESS_TOKEN` in GitHub Secrets

---

## Verification: Confirm Automatic Runs Will Work

### 1. Verify Actions is Enabled
- Go to your repo on GitHub
- Click **Actions** tab
- If you see "Workflows aren't being run on this repository", click **Enable**
- You should see "LinkedIn Post Scheduler" listed on the left

### 2. Verify Workflow is on Default Branch
- The workflow file must be on `main` branch (or your default branch)
- Scheduled workflows ONLY run from the default branch

### 3. Verify Secrets are Set
- Go to **Settings** → **Secrets and variables** → **Actions**
- Confirm you see:
  - `LINKEDIN_ACCESS_TOKEN` - Updated recently
  - `LINKEDIN_PERSON_URN` - Updated recently

### 4. Test with Manual Dry-Run
```bash
# Via CLI (recommended)
gh workflow run linkedin-scheduler.yml -f dry_run=true

# Check the run status
gh run list --workflow=linkedin-scheduler.yml --limit=1
```

Or via GitHub UI:
1. Go to **Actions** → **LinkedIn Post Scheduler**
2. Click **Run workflow** (dropdown on right)
3. Check `dry_run: true`
4. Click green **Run workflow** button
5. Watch for green checkmark ✓

### 5. Check Logs
After the run:
1. Click on the workflow run
2. Click on the **post-to-linkedin** job
3. Expand each step to see output
4. The **Summary** step shows what happened

### What to Look For
| Status | Meaning |
|--------|---------|
| ✓ Green | Success - workflow ran correctly |
| ✗ Red | Failed - check logs for error |
| ⊘ Skipped | No posts available or condition not met |

### Schedule Confirmation
The cron `'7 16 * * 2'` means:
- Minute: 7
- Hour: 16 (UTC) = 8 AM PST
- Day of week: 2 = Tuesday

**First automatic run**: Next Tuesday at 8:07 AM PST

### GitHub Actions Schedule Note
GitHub may delay scheduled workflows by up to 15-60 minutes during high-traffic times. This is normal.

---

## Files Involved

| File | Purpose |
|------|---------|
| `.github/workflows/linkedin-scheduler.yml` | GitHub Actions workflow |
| `genAI/linkedin-7day/*.md` | 7 rotating posts |
| `genAI/linkedin-7day/.current-index` | Tracks rotation position |

---

## Troubleshooting

### Token Expired
Error: `401 Unauthorized` or `Invalid access token`
- Solution: Re-run Steps 4a-4d to get a fresh token

### Post Not Appearing
- Check dry_run wasn't accidentally set to `true`
- Verify the post content isn't triggering LinkedIn's spam filters
- Check the LinkedIn app still has the required permissions

### Workflow Not Running on Schedule
- Ensure workflow file is on the default branch
- GitHub requires recent repo activity for scheduled workflows
- Manual pushes or any action will "wake up" the scheduler

### Permission Denied on Git Push (Index Update)
- The workflow needs write access to push the `.current-index` file
- Check repository settings: **Settings** → **Actions** → **General** → **Workflow permissions**
- Ensure "Read and write permissions" is selected
