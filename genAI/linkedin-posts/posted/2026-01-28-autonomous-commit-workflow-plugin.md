---
date: 2026-01-28
topic: Autonomous Commit Workflow Plugin for Claude Code
target_audience: Developer Productivity Engineers, AI Tool Builders, Open Source Contributors
---

Hello World, I discovered that separating commit logic from push logic in git workflows reduces cognitive load and creates safer autonomous operations [1].

What started as a code review led me to an insight: developers need different automation levels for different contexts. Sometimes you want full automation (commit + push), other times a checkpoint without remote sync, and sometimes manual review before pushing.

I published a Claude Code marketplace plugin called `/git-commit` that handles autonomous local commits without touching your remote [1]. When you type `/git-commit`, Claude analyzes staged changes, generates a meaningful commit message (verb-first, under 72 chars), and creates the commit locally. Changes stay local until you explicitly push.

This is part of a plugin ecosystem: `/git-commit` for local-only saves, `/git-push` for interactive workflows with review, and `/git-push-agentic` for full automation. Each serves a distinct use case. The separation of concerns makes behavior predictable and lets developers choose the right tool for their context.

What I found interesting was how much clearer the code became when I removed push logic entirely. The plugin went from handling edge cases (remote conflicts, branch tracking, force push) to focusing on local state management. This constraint improved commit message generation because Claude can focus on analyzing the diff without worrying about remote sync.

At this time, I am actively interviewing for AI/ML Engineering roles. The opportunity cost is better spent reinforcing ML fundamentals (DSA, regression vs classification, deep learning architecture) during this transition. If I pass screenings, I'll prepare for take-home assignments, leetcode, and system design.

This plugin is open source in my Claude Code marketplace repository [1]. I'm hoping this helps developers building agentic tools who need reference implementations for git automation.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Claude Code /git-commit Plugin - https://github.com/thomasrrgsd/thomas-to-bcheme/blob/main/my_marketplace/plugins/git-commit/skills/git-commit/SKILL.md

#SoftwareEngineering #OpenToWork #BuildInPublic #DeveloperProductivity
