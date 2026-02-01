---
date: 2026-01-31
topic: Multi-Agent Plugin Architecture
target_audience: DevOps Engineers, Tool Builders, AI Engineers
series: linkedin-7day
day: 5
---

Hello World, this is Day 5 of a 7-day series extracting lessons from building in public demonstrating my "show-not-tell" philosophy. To anyone transitioning from STEM into software: your engineering discipline is an asset, not a hurdle. The frameworks transfer. Build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

I shipped 15 Claude Code plugins coordinating specialized agents with explicit input/output contracts to prevent the hallucination risks that plague monolithic AI assistants.

The problem with single-agent AI tools is scope creep. When one agent handles frontend, backend, API design, QA, and ops simultaneously, it loses track of architectural boundaries. Changes in one module silently break contracts in another. I discovered this while building my portfolio infrastructure where a frontend update to an API response type broke the backend without any validation.

The solution was deterministic orchestration with bounded responsibilities. Each plugin enforces the "One Agent Per File" principle from my CLAUDE.md directives. The git-README plugin demonstrates the pattern: it spawns 4 parallel Explorer agents analyzing project structure, features, setup requirements, and CI/CD pipelines simultaneously. A fifth Coordinator agent synthesizes their findings into a cohesive README. The orchestrator reviews the output and performs smart merge operations.

The specialized agent plugins map to engineering domains: tto-agent-frontend handles React/Next.js, tto-agent-backend owns Python ML models, tto-agent-api enforces API contracts, tto-agent-qa runs test verification, and tto-agent-ops manages GitHub Actions orchestration. Each agent has explicit triggers, a narrow scope defined in markdown, and access only to tools relevant to their domain. The orchestrator coordinates cross-cutting changes while enforcing architectural boundaries.

What surprised me was how this mirrors microservices architecture. Just as we decompose monolithic applications into bounded contexts with clear interfaces, decomposing AI assistance into specialized agents with deterministic coordination eliminates the unpredictability that makes AI tools unreliable for production workflows. The constraint forces clarity [1].

This benefits developers building AI-assisted workflows who need reproducible results. The plugin architecture is open source in my repository. Each agent's scope, tools, and coordination pattern is documented in .claude/agents/ as reusable templates for tool builders working on Claude Code extensions or similar multi-agent systems.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Claude Code Plugin Architecture - https://github.com/thomas-to/thomas-to-bcheme/tree/main/.claude/agents
[2] git-README Multi-Agent Pattern - https://github.com/thomas-to/thomas-to-bcheme/blob/main/plugins/git-README/skills/git-README/SKILL.md

#ArtificialIntelligence #DevOps #BuildInPublic #MLEngineering
