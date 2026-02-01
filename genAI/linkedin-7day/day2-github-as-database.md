---
date: 2026-01-31
topic: GitHub as Data Warehouse
target_audience: Data Engineers, DevOps Engineers
series: linkedin-7day
day: 2
---

Hello World, this is Day 2 of a 7-day series on building in public. To anyone transitioning into software: build something that proves it. https://thomas-to-bcheme-github-io.vercel.app/

When building my portfolio infrastructure, I needed version control, audit trails, immutable history, and environment promotion. I discovered these are the exact properties enterprises pay thousands monthly for in dedicated data warehouses like Snowflake or BigQuery. GitHub provided all of them for free.

The pattern maps directly to pharmaceutical GMP validation protocols I used in biotech. Sandbox branch equals development environment where raw ETL transformations happen. Quality branch acts as the staging layer with validation checks. Production branch holds approved, immutable records. Every data transformation is a commit with full rollback capability. GitHub Actions orchestrate the ETL pipeline on 30-minute CRON intervals, processing job description datasets and preparing them for ML model training.

This architecture benefits other developers who need data infrastructure without cloud costs. The repository becomes a queryable data warehouse where branches are environments, commits are batch records, and pull requests enforce data quality gates. For new graduates building portfolios, this pattern demonstrates understanding of enterprise data architecture using tools they already know.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design. If I pass initial screening, preparing for interviews and next steps which may include takehome assignments, leetcode/hackerrank style questions, and system design.

The architecture documentation lives in system_design_docs/database.md [1]. The LinkedIn automation workflow using this pattern runs daily at 8:05 AM PST via GitHub Actions CRON [2]. See my portfolio demonstrating this approach [3].

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Database Architecture - https://github.com/thomas-to/thomas-to-bcheme/blob/main/system_design_docs/database.md
[2] LinkedIn Scheduler Workflow - https://github.com/thomas-to/thomas-to-bcheme/blob/main/.github/workflows/linkedin-scheduler.yml
[3] Portfolio - https://thomas-to-bcheme-github-io.vercel.app/

#SoftwareEngineering #BuildInPublic #OpenToWork #TechCareer
