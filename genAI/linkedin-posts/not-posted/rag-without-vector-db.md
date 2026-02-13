---
date: 2026-01-31
topic: RAG Without Vector DB
target_audience: AI/ML Engineers, Fullstack Developers
---

Hello World, every tutorial insisted I needed Pinecone and vector databases to build a chat agent. I shipped mine with zero infrastructure costs instead.

When I architected my portfolio chat agent, the standard approach demanded vector DBs and semantic search infrastructure. Google's Gemini API offers free-tier access for students and learners [1]. The constraint became the design principle: minimize tokens to stay within free allowances while proving the concept scales.

My approach: embed context directly into the system prompt. The AiSystemInformation.tsx file contains my resume and project details as a static 15KB string. Every chat request includes this context. No retrieval step, no vector DB, no infrastructure costs [2].

Token optimization was deliberate. I compressed markdown hierarchies, eliminated redundant descriptions, and structured content for efficient LLM parsing. The result: 8K tokens per request, which fits comfortably within Gemini's free quota. Students building portfolios run hundreds of chat interactions monthly at zero cost.

This is a proof of concept to demonstrate scalability. The pattern, static context injection for bounded domains, works identically whether you're on free tier or enterprise. When traffic demands it, the architecture supports chunked retrieval, semantic search, and vector DB integration. You don't need enterprise infrastructure to learn. Start with free resources, prove the concept, then upscale.

What I found valuable: the bottleneck shifted from infrastructure to prompt engineering. Learning to structure context efficiently transfers directly to production RAG systems. Free-tier constraints taught me token economics before hitting billing alerts.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Google Gemini Free Tier - https://aistudio.google.com/
[2] AiSystemInformation.tsx Source Code - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/src/data/AiSystemInformation.tsx
