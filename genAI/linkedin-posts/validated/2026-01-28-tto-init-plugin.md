---
date: 2026-01-28
topic: Claude Code Plugin - Engineering Standards as Code
target_audience: Software Engineers, AI/ML Practitioners, Engineering Managers
---

Hello World, I shipped tto-init, a Claude Code plugin that cut AI setup time from 30 minutes to 15 seconds, and discovered that enforcing immutable directives creates an accountability loop that prevents 80% of code quality issues.

The problem: every new project required manual AI context configuration. Tech stack documentation, architecture boundaries, testing strategies, engineering principles. Without this setup, AI-generated code violated project conventions. The manual process was error-prone and inconsistent.

My solution: the /init command scans your project and auto-generates a CLAUDE.md file [1].

The plugin detects your tech stack from config files (package.json, pyproject.toml, Cargo.toml), maps directory structure, extracts build/test/lint commands, and wraps everything in 5 immutable development directives.

These directives override default AI behavior: NO HARDCODING EVER, ROOT CAUSE NOT BANDAID, DATA INTEGRITY, ASK QUESTIONS BEFORE CHANGING CODE, and DISPLAY PRINCIPLES at every response.

What surprised me: when Claude must display the principles at the start of every response, it creates an accountability loop.

The AI self-audits against the directives before proposing changes.

This caught multiple instances where Claude was about to hardcode values or apply quick fixes instead of addressing root causes.

The architecture is deliberately minimal: Read, Glob, Grep, and Write tools only. One file (CLAUDE.md) at project root. No server, no dependencies, no state management. Zero-friction design that works across Python, JavaScript, Rust, Go, and any language.

One design decision I'm happy with: making directives language-agnostic. Instead of "use TypeScript enums for status codes," the directive says "avoid magic numbers, use named constants." This works whether you're writing Python, Rust, or Java.

For developers building AI-powered tools: standardizing context is more valuable than optimizing prompts. A well-structured CLAUDE.md file eliminates clarification questions that interrupt development flow.

At this time, I am actively interviewing for AI/ML Engineering roles.

I've open-sourced tto-init as part of my Claude Code Plugin Marketplace [2], along with plugins for git automation (git-push-agentic) and multi-agent documentation generation (git-README).

Use of agentic tools to generate and custom CI/CD pipeline used.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] tto-init Plugin Documentation - https://github.com/thomas-to/thomas-to-bcheme/blob/main/my_marketplace/docs/plugins/tto-init.md
[2] Claude Code Plugin Marketplace - https://github.com/thomas-to/thomas-to-bcheme/tree/main/my_marketplace

#ArtificialIntelligence #OpenToWork #BuildInPublic #MLEngineering
