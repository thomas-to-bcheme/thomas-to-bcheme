---
date: 2026-01-31
topic: Multi-Agent Plugin Architecture
target_audience: DevOps Engineers, Tool Builders, AI Engineers
series: linkedin-7day
day: 5
---

Hello World, this is Day 5 of my 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

I shipped 15 Claude Code plugins with specialized agents to eliminate the hallucination risks that plague monolithic AI assistants.

The problem with single-agent AI tools is scope creep. When one agent handles frontend, backend, API design, QA, and ops simultaneously, it loses track of architectural boundaries. Changes in one module silently break contracts in another. I discovered this while building my portfolio infrastructure where a frontend update to an API response type broke the backend without any validation.

The solution was deterministic orchestration with bounded responsibilities. Each plugin enforces the "One Agent Per File" principle from my CLAUDE.md directives. The git-README plugin demonstrates the pattern: it spawns 4 parallel Explorer agents analyzing project structure, features, setup requirements, and CI/CD pipelines simultaneously. A fifth Coordinator agent synthesizes their findings into a cohesive README. The orchestrator reviews the output and performs smart merge operations [2].

The specialized agent plugins map to engineering domains: tto-agent-frontend handles React/Next.js, tto-agent-backend owns Python ML models, tto-agent-api enforces API contracts, tto-agent-qa runs test verification, and tto-agent-ops manages GitHub Actions orchestration. Each agent has explicit triggers, a narrow scope defined in markdown, and access only to tools relevant to their domain. The orchestrator coordinates cross-cutting changes while enforcing architectural boundaries [3].

What surprised me was how this mirrors microservices architecture. Just as we decompose monolithic applications into bounded contexts with clear interfaces, decomposing AI assistance into specialized agents with deterministic coordination eliminates the unpredictability that makes AI tools unreliable for production workflows. The constraint forces clarity.

This benefits developers building AI-assisted workflows who need reproducible results. The plugin architecture is open source in my repository. Each agent's scope, tools, and coordination pattern is documented as reusable templates for tool builders working on Claude Code extensions or similar multi-agent systems.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design during this transition period.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Portfolio - https://thomas-to-bcheme-github-io.vercel.app/
[2] git-README Multi-Agent Pattern - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/plugins/git-README/skills/git-README/SKILL.md
[3] Claude Code Agent Architecture - https://github.com/thomas-to-bcheme/thomas-to-bcheme/tree/main/.claude/agents

#SoftwareEngineering #BuildInPublic #OpenToWork #TechCareer
