---
date: 2026-02-17
topic: Constraint-Driven Architecture
target_audience: CTOs, Engineering Managers
---

Hello World, I built a production AI portfolio on free-tier services by treating deployment limits as design constraints, not blockers.

Vercel Hobby tier allows 100 deploys per 24 hours. I calculated that hourly GitHub CRON jobs consume exactly 24 deploys daily, leaving a 76% safety margin for manual deployments and emergency rollbacks. This mathematical rigor transformed an arbitrary platform limit into an architectural forcing function.

To bypass Vercel's daily CRON restriction, I architected a "Vercel-Pinger" pattern where GitHub Actions trigger deploys every 30 minutes via webhook, simulating continuous deployment without violating rate limits. The 3-tier data warehouse (Sandbox → Quality → Production) runs entirely on GitHub branches with Actions-based ETL, eliminating database hosting costs.

The result is a zero-dollar production stack: GitHub for version-controlled data warehousing, Vercel for edge deployment, and Hugging Face for ML model hosting. Total monthly cost remains $0 while supporting real-time AI chat, salary prediction models, and automated content generation.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing machine learning fundamentals during this transition period and have paused development on this project.

This pattern helps other developers validate MVPs without infrastructure debt. By documenting constraint-driven architecture publicly, teams can replicate this approach for early-stage products where capital efficiency determines runway.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Vercel Deployment Limits - https://vercel.com/docs/limits
[2] GitHub Actions ETL Patterns - https://towardsdatascience.com/etl-github-actions-cron-383f618704b6/

#MachineLearning #OpenToWork #SystemDesign #BuildInPublic
