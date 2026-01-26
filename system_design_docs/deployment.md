<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&height=300&color=gradient&text=Thomas%20To&reversal=true&desc=Fullstack%20Software,%20Biomanufacturing,%20Protein%20Design&descAlignY=65&descSize=30&section=footer" width="100%"/>

  <br />

  <a href="https://thomas-to-bcheme-github-io.vercel.app/">
    <img src="https://img.shields.io/badge/Portfolio-Visit%20Live%20Site-2ea44f?style=for-the-badge&logo=vercel&logoColor=white" alt="Portfolio" />
  </a>
  <a href="src/docs/Thomas_To_Resume.pdf?raw=true">
    <img src="https://img.shields.io/badge/Resume-Download%20PDF-0078D4?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="Resume" />
  </a>
  <a href="https://www.linkedin.com/in/thomas-to-ucdavis/">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
</div>

## Deployment Guide

This document describes the deployment architecture for the portfolio project using Vercel and GitHub Actions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Developer ──► GitHub ──► Vercel ──► Production                 │
│     │            │          │            │                       │
│   Push        Webhook    Build       Edge Network               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vercel Configuration

### Auto-Detected Settings
Vercel automatically detects Next.js projects. No custom configuration required:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

### Environment Variables

**Required:**

| Variable | Scope | Description |
|----------|-------|-------------|
| `GOOGLE_API_KEY` | Production, Preview, Development | API key for Gemini chat |

**Configuration Location:** Vercel Dashboard → Project Settings → Environment Variables

---

## Local Development

### Setup
```bash
# Clone repository
git clone https://github.com/thomas-to-bcheme/thomas-to-bcheme.git
cd thomas-to-bcheme

# Install dependencies
npm install

# Create local environment file
echo "GOOGLE_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm start` | Start production server |

---

## CI/CD Pipeline

### Trigger: Git Push
Every push to `main` branch triggers automatic deployment:

```
Push to main
    │
    ▼
GitHub Webhook
    │
    ▼
Vercel Build
    │
    ├── npm install
    ├── npm run build
    └── Deploy to Edge
    │
    ▼
Production Live
```

### Preview Deployments
Every pull request gets a unique preview URL:

- Format: `https://[project]-[hash]-[username].vercel.app`
- Useful for stakeholder review before merging
- Environment variables apply to preview by default

---

## Platform Limits (Hobby Tier)

Reference: See `architecture.md` for detailed KPI analysis.

### Vercel Limits

| Resource | Limit | Strategy |
|----------|-------|----------|
| Deployments | 100/day (rolling 24h) | Max hourly = 24/day |
| Serverless Timeout | 10 seconds | Streaming for long ops |
| Edge Timeout | 30 seconds | Use for API routes |
| Bandwidth | 100 GB/month | Static assets cached |

### Safe Operating Zone

**Recommended:** Hourly deployments (24/day)
- Uses 24% of daily limit
- Leaves 76% buffer for manual commits

**Red Zone:** >15-minute intervals (96/day)
- Risk of hitting hard stop
- Could lock deployments for 24 hours

---

## Deployment Environments

### Production
- **URL:** https://thomas-to-bcheme.vercel.app
- **Branch:** `main`
- **Updates:** Every push to main

### Preview
- **URL:** Auto-generated per PR
- **Branch:** Any non-main branch
- **Updates:** Every push to PR branch

### Development
- **URL:** http://localhost:3000
- **Environment:** `.env.local` (gitignored)

---

## Production Checklist

### Pre-Deploy
- [ ] `npm run build` passes locally
- [ ] `npm run lint` shows no errors
- [ ] TypeScript has no errors (`tsc --noEmit`)
- [ ] Environment variables configured in Vercel
- [ ] No hardcoded API keys or secrets
- [ ] No console errors in browser

### Post-Deploy
- [ ] Production URL loads correctly
- [ ] Chat functionality works
- [ ] No JavaScript errors in console
- [ ] Lighthouse score > 90 (Performance, Accessibility)

---

## GitHub Actions Integration

### The "Vercel-Pinger" Pattern
GitHub Actions bypass Vercel's CRON limitations:

```yaml
# .github/workflows/scheduled-update.yml
name: Scheduled Update
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:      # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ETL
        run: |
          # Data processing scripts
          python scripts/etl.py
      - name: Commit changes
        run: |
          git add data/
          git commit -m "Scheduled data update"
          git push
        # Push triggers Vercel deploy automatically
```

### Benefits
- Unlimited execution time (vs 10s serverless limit)
- Full VM access (Docker, CLI tools)
- No extra cost for public repos

---

## Rollback Strategy

### Via Vercel Dashboard
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Via Git
```bash
# Revert to previous commit
git revert HEAD
git push origin main
# Triggers new deploy with reverted code
```

---

## Monitoring

### Vercel Analytics (Free Tier)
- Page views and visitors
- Web Vitals (LCP, FID, CLS)
- Geographic distribution

### Error Tracking
- Check Vercel Function Logs for API errors
- Browser console for client-side errors

---

## Related Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js configuration |
| `vercel.json` | Vercel-specific config (if needed) |
| `.env.local` | Local environment variables |
| `.claude/agents/frontend.md` | Frontend/Vercel agent guidance |
| `system_design_docs/architecture.md` | Platform KPIs |
