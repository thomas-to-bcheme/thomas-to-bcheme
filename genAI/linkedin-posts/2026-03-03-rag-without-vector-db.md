---
date: 2026-03-03
topic: AI Agent with GitHub MCP
target_audience: AI/ML Engineers
---

Hello World, I built an AI Agent for my portfolio and am now exploring GitHub MCP to replace embedded RAG with contemporary context retrieval methods.

My portfolio includes a conversational AI agent powered by Google Gemini. The current implementation uses a "file-as-context" pattern where a TypeScript file gets injected directly into prompts. While this eliminated vector database complexity, it requires manual updates and doesn't scale as the monorepo grows.

I'm researching GitHub MCP (Model Context Protocol) [1] to provide dynamic, real-time context from my open-source monorepo. Instead of static embedded files, the agent would query repository contents, commit history, and documentation on demand. This shifts from "pre-loaded context" to "on-demand retrieval" - a more flexible pattern for evolving codebases.

The monorepo serves as both a portfolio and a platform for building tools over time. As I develop new features, the AI agent gains automatic context without manual RAG updates. For developers maintaining open-source projects, MCP offers a standardized way to give AI assistants contextual awareness of your codebase [2].

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design during this transition period.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Model Context Protocol - https://modelcontextprotocol.io/
[2] GitHub MCP Server - https://github.com/modelcontextprotocol/servers

#ArtificialIntelligence #OpenToWork #MLOps #BuildInPublic
