---
date: 2026-01-31
topic: RAG Without Vector DB
target_audience: AI/ML Engineers, Fullstack Developers
series: linkedin-7day
day: 3
---

Hello World, this is Day 3 of my 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

When I architected this chat agent, tutorials demanded Pinecone, vector DBs, and semantic search infrastructure. But Google's Gemini API offers free-tier access for students and learners [1]. The constraint became the design principle: minimize tokens to stay within free allowances while proving the concept scales.

My approach: embed context directly into the system prompt. The `AiSystemInformation.tsx` file contains my resume and project details as a static 15KB string. Every chat request includes this context—no retrieval step, no vector DB, no infrastructure costs [2].

Token optimization was deliberate. I compressed markdown hierarchies, eliminated redundant descriptions, and structured content for efficient LLM parsing. The result: 8K tokens per request that fits comfortably within Gemini's free quota. Students building portfolios can run hundreds of chat interactions monthly at zero cost.

This is a proof of concept that scales. The pattern—static context injection for bounded domains—works identically whether you're on free tier or enterprise. When traffic demands it, the architecture supports chunked retrieval, semantic search, and vector DB integration. But you don't need enterprise infrastructure to learn. Start with free resources, prove the concept, then upscale.

What I found valuable: the bottleneck shifted from infrastructure to prompt engineering. Learning to structure context efficiently transfers directly to production RAG systems. Free-tier constraints taught me token economics that many engineers skip until they hit billing alerts.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Google Gemini Free Tier - https://ai.google.dev/pricing
[2] AiSystemInformation.tsx Source Code - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/src/data/AiSystemInformation.tsx

#SoftwareEngineering #BuildInPublic #OpenToWork #TechCareer
