---
date: 2026-05-19
topic: Developer Workflow Automation
target_audience: Software Engineers, DevTools Builders
---

Hello World! I built a custom Claude Code plugin that eliminated the context-switching overhead of manual git commits, and discovered that automating the ceremony of version control actually improved my commit message quality rather than degrading it.

The problem: during active development sessions, I'd stop every 10-15 minutes to stage files, write a commit message, and push to remote. This interrupted flow state and created two failure modes. Either I'd batch too many unrelated changes into one commit (losing granular history), or I'd write rushed commit messages like "fix stuff" that provided zero context for future me. The cognitive load of maintaining good git hygiene competed with actually solving technical problems.

My solution was git-push-agentic, a custom Claude Code skill that runs in the background during development [1]. It executes three steps autonomously: stages all changes with `git add -A`, analyzes the diff to auto-generate a conventional commit message (verb-first: Add, Update, Fix, Remove, Refactor), then pushes to remote. No user input required. The plugin uses Claude's diff analysis to extract the "what and why" from code changes, often producing better commit messages than I'd write when rushing between tasks. For example, recent commits include "Update typography system to 12px minimum and improve code quality" (13 files, 107 insertions) and "Remove rate limiting and update Gemini model to v3"—both accurately captured the scope and intent of multi-file refactors [2].

What I learned: the key insight is running this during ongoing development rather than as a blocking operation. Git doesn't get overloaded with 50+ file changes at once because I can batch related work into logical commits and trigger the plugin when reaching a natural checkpoint. The automation handles edge cases like no changes to commit, missing remote configuration, and push conflicts (attempts rebase automatically). It co-authors commits with Claude for attribution, which maintains transparency about AI-assisted workflow.

The efficiency gain is measurable: I went from ~12 manual commit cycles per session (each taking 30-60 seconds of context switching) to zero interruptions. That's 6-12 minutes recovered per hour, but the bigger win is unbroken focus. I stay in the problem-solving mindset instead of switching to git ceremony mode. The plugin follows conventional commit format automatically, which integrates cleanly with changelog generators and semantic versioning tools.

At this time, I am actively interviewing for AI/ML Engineering roles as my longitudinal career. I believe the opportunity cost is better spent reinforcing fundamentals of machine learning, deep learning, and system design. If I pass initial screenings, I'm preparing for interviews with takehome assignments, LeetCode-style questions, and system design discussions.

For developers building AI-assisted tools: automation doesn't have to mean "dumber" outputs. When you automate the mechanical parts of a workflow, you can use AI to actually improve the quality of the human-written components (like commit messages) because the model has full context of the diff without the human's time pressure or attention fatigue.

Happy to connect, network, and chat about AI/ML/SW Engineering and/or Ops!

References:
[1] Claude Code Custom Skills - https://docs.anthropic.com/en/docs/build-with-claude/claude-code
[2] Conventional Commits Specification - https://www.conventionalcommits.org/

#SoftwareEngineering #OpenToWork #BuildInPublic #DevTools
