---
date: 2026-01-31
topic: LinkedIn Automation Pipeline
target_audience: Developer Advocates, Content Creators, Marketing Engineers
series: linkedin-7day
day: 6
---

Hello World, this is Day 6 of my 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

 I cut my LinkedIn publishing workflow from 90 seconds to 30 seconds by treating content automation as a human-in-the-loop pipeline, not a black box.

Most content automation fails because it optimizes for speed over quality. I discovered the sweet spot is automating the scheduling overhead while preserving human validation. My LinkedIn pipeline uses a 3-stage directory structure that mirrors deployment environments: drafts/ for AI-generated content, validated/ for human-approved posts, and posted/ for the archive.

The architecture is deceptively simple. A GitHub Action checks the validated/ folder for the oldest file (FIFO queue), posts it via LinkedIn API, then moves it to posted/. The CLI is zero-server—no Lambda, no containers, just a Python script that runs in GitHub Actions. By eliminating unnecessary abstraction layers, I reduced the runtime from 90 seconds to 30 seconds. That's a 67% improvement just from removing overhead.

What surprised me was how dry-run mode became the killer feature. Running with --dry-run skips both the API call AND the file move, letting me test the entire pipeline safely. This gave me confidence to automate without fear of accidentally posting drafts or losing content. The human validation step isn't a bottleneck—it's a quality gate that ensures every post meets the 1000-1300 character sweet spot and includes proper references.

For developer advocates managing content calendars, this pattern works because it respects the creative process. AI generates the first draft. Humans refine the message. CRON handles the tedious scheduling. No one has to remember to post at optimal engagement times.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing machine learning fundamentals during this transition period while continuing to build in public.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] LinkedIn CLI Implementation - https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/genAI/linkedin-posts/linkedin-workflow.md
[2] GitHub Actions CRON Scheduler - https://github.com/thomas-to-bcheme/thomas-to-bcheme.github.io/blob/main/.github/workflows/linkedin-scheduler.yml

#SoftwareEngineering #BuildInPublic #OpenToWork #TechCareer
