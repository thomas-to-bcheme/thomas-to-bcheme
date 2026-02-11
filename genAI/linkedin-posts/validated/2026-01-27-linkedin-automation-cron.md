---
date: 2026-01-27
topic: LinkedIn Automation with AI-Powered Content Generation and GitHub Actions CRON
target_audience: Engineering Managers, CTOs, DevOps Engineers, Developer Advocates
---

this is an agentic test

Hello World! I built an end-to-end LinkedIn automation pipeline that uses Claude Code agents to generate post drafts, then publishes them via GitHub Actions CRON every Tuesday at 10:07 AM PST.

The problem I was solving: maintaining consistent technical content sharing while actively interviewing. Manual posting meant batch-writing posts and forgetting to publish them, or skipping weeks when interview prep consumed my focus. I needed automation that respected human-in-the-loop. AI generates drafts, humans validate quality, automation handles scheduling.

My solution is a multi-stage content lifecycle with three directories: drafts/ (AI-generated), validated/ (human-approved), and posted/ (auto-archived). I created a standalone CLI tool that posts directly to LinkedIn's UGC API without server startup overhead [1]. The CLI handles structured logging, dry-run simulation, OAuth token management, and FIFO queue processing. GitHub Actions runs weekly, fetches the oldest post from validated/ by filename date, POSTs via CLI, then git-commits the file move to posted/.

What surprised me was choosing zero-server architecture over Next.js API routes. The CLI approach executes npx tsx directly, cutting GitHub Actions runtime from ~90s to ~30s by eliminating HTTP server layer. Exit codes (0 for success, 1 for user errors, 2 for API errors) integrate cleanly with conditional workflow steps.

One design decision I'm happy with: dry-run mode skips both the LinkedIn API call AND the file move. I can test the entire pipeline without polluting my feed or losing queue state.

At this time, I am actively interviewing for Founding Engineer and Ai/ML Engineer roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] LinkedIn Share API v2 Documentation - https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
