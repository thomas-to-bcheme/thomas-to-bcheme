---
date: 2026-01-31
topic: Constraint-Driven Architecture
target_audience: CTOs, Engineering Managers, Startup Founders
series: linkedin-7day
day: 1
---

Hello World, this is Day 1 of a 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

I built production AI infrastructure for $0/month by treating Vercel's 100 deploys/24h limit as an architectural constraint rather than a problem to solve.

Most engineers see platform limits as friction. I discovered they're actually forcing functions for elegant design. When I started building my full-stack AI portfolio, the first thing I did was calculate my deployment budget: Vercel Hobby tier caps at 100 deploys per day. GitHub CRON actions for my data pipeline would consume 24 of those if I ran them hourly. That left 76 deploys—a **76% safety margin**.

Instead of upgrading to a paid tier, I designed backward from the constraint. I implemented a "Vercel-Pinger" pattern where GitHub Actions trigger deployments via webhook every 30 minutes. The data flows through a 3-tier warehouse architecture (Sandbox → Quality → Production) that runs entirely on GitHub branches. No databases. No cloud storage bills. Just git as the single source of truth.

What surprised me was how this constraint improved the architecture. Rate limits forced me to batch operations efficiently. Deploy caps made me think harder about idempotency. The zero-dollar requirement eliminated complexity—every service had to justify its existence.

The stack:
• GitHub for orchestration and storage
• Vercel for frontend deployment
• Hugging Face for ML model hosting

All free tiers. The constraint wasn't the limitation—it was the design spec [1].

Have you designed systems backward from constraints? I'd love to hear your approach.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

Tomorrow: How GitHub became my data warehouse.

References:
[1] Portfolio & Architecture

#SystemDesign #BuildInPublic #OpenToWork #ZeroCostArchitecture
