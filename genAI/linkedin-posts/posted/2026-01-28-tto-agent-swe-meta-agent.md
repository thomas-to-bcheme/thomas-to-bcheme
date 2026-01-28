---
date: 2026-01-28
topic: tto-agent-swe Marketplace Plugin - Open Source Meta-Agent for Multi-Agent Coordination
target_audience: AI/ML Engineers, Software Engineers, Agentic System Developers
---

Hello World, I built an open-source meta-agent that solves the coordination problem when working with multiple specialized AI agents across software domains [1].

Building agentic systems with specialized agents for frontend, backend, API, QA, and ops created a new problem.

Developers had to manually decide which agent to invoke, coordinate handoffs across domains, and ensure consistent protocols when tasks spanned multiple areas.

I discovered this firsthand building my fullstack portfolio with 8 specialized agents and 17 sub-agents.

The solution: tto-agent-swe, a marketplace plugin that provides an intelligent routing table mapping task types to specialized agents, a formal handoff protocol for cross-agent work, and quality gates verification before completion [1].

The routing pattern is completely reusable for any multi-agent system.

After using my /tto-init to generate an initial CLAUDE.md from /init with best practices included, use /tto-agent-swe with best practices to create .claude/agents to your specific ecosystem, and implement the handoff protocol.

This eliminates the cognitive overhead of agent selection and prevents scope creep when tasks cross domain boundaries.

The plugin coordinates parallel work across domains, like adding an API endpoint the frontend can call, by delegating to backend, api, frontend, and qa agents in sequence with explicit handoff contracts.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career.

I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design during this transition period.

If I pass initial screening, I am preparing for interviews and next steps which may include takehome assignments, leetcode style questions, and system design.

The plugin is available at my_marketplace/plugins/tto-agent-swe in my GitHub repo [2].

I am planning to provide ongoing support for the open-source community and developers building agentic workflows who can benefit from this coordination pattern.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Anthropic Claude Code Documentation - https://docs.anthropic.com/en/docs/build-with-claude/claude-code
[2] GitHub Repository - https://github.com/thomas-to/thomas-to-bcheme

#ArtificialIntelligence #OpenToWork #BuildInPublic #MLEngineering
