---
date: 2027-01-26
topic: Automated Content Pipelines with AI-Assisted Review
target_audience: Developer Advocates, Content Creators, Marketing Engineers
---

Hello World, I automated my LinkedIn posting workflow with a three-stage pipeline where AI generates drafts and humans validate quality before publishing.

Most content automation fails because it optimizes for speed over quality. The sweet spot is automating the scheduling overhead while preserving human validation. My LinkedIn pipeline uses a 3-stage directory structure: drafts/ for AI-generated content, validated/ for human-approved posts, and posted/ for the archive. Each stage represents a deployment environment where content progresses through quality gates.

The AI-assisted review works like this. Claude Code agents generate posts following strict formatting rules from a markdown spec. The agent enforces character limits, citation formats, banned word lists, and structural requirements defined in the linkedin.md agent specification [1]. When a draft moves to validated/, a human reviews it for tone, accuracy, and community fit. A GitHub Action checks the validated/ folder for the oldest file using FIFO queue logic, posts it via LinkedIn API, then moves it to posted/. The entire pipeline runs in GitHub Actions with zero servers. No Lambda, no containers.

What surprised me was how dry-run mode became essential for confidence. Running with a flag skips both the API call and the file move, letting me test the pipeline safely. This gave me confidence to automate without fear of accidentally posting drafts or losing content. The human validation step ensures every post meets the 1000-1300 character sweet spot for LinkedIn's algorithm.

For developer advocates managing content calendars, this pattern respects the creative process. AI generates the first draft. Humans refine the message. CRON handles tedious scheduling. No one has to remember to post at optimal engagement times. The workflow is open source for anyone building content pipelines with AI review stages [2].

Content automation with AI review is still new territory for me. If you have built content generation or review workflows with AI, I would be glad to compare pipeline architectures. Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] LinkedIn Agent Specification - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/.claude/agents/linkedin.md
[2] LinkedIn CLI Implementation - https://github.com/thomas-to-bcheme/thomas-to-bcheme/blob/main/backend/linkedin_cli.py
