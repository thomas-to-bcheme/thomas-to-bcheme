---
date: 2026-01-29
topic: LinkedIn API Orchestration - Solving the 60-Day Token vs 3-Month Scheduling Conflict
target_audience: DevOps Engineers, AI/ML Engineers, Software Engineers
---

Hello World, I hit a weird roadblock this week while building automated LinkedIn posting for my portfolio.

So here's what happened: I'm building this automation layer so I can queue up posts and let GitHub CRON jobs handle the timing. LinkedIn has this nice feature where you can manually schedule posts up to 3 months out. Perfect, right?

Except when you're doing it through their API, the access tokens expire in 60 days. So any post I schedule for day 61+ fails. Kind of defeats the purpose of automation.

The fix I'm working on: an orchestration layer using GitHub Actions that handles token refreshes and triggers posts on a shorter cycle. Decouples the scheduling from the auth lifecycle.

What stood out though. This pattern is reusable. Anyone building content scheduling tools against OAuth APIs faces the same constraint. So I'm open-sourcing it, along with the Claude Code plugins I use daily.

The next step: video docs walking through setup, how I built these tools, and how to apply the same patterns to your own use cases. The goal is to help people use these agentic tools in their own workflows, not to consume them passively. That's the long-term play here.

At this time, I am actively interviewing for AI/ML Engineering roles. Happy to connect, network, and chat about AI/ML/SW Engineering and Ops!
