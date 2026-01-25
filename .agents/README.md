# .agents/README.md

This directory contains specialized agent personas for Claude Code. Each agent is tailored to this project's architecture and adheres to the 5 Development Directives from `CLAUDE.md`.

## Usage

Reference an agent file when working on tasks in that domain. The agent will adopt the persona and follow domain-specific patterns.

## Available Agents

| Agent | File | Focus |
|-------|------|-------|
| Backend | `backend.md` | Data, ML models, Python backend |
| Frontend | `frontend.md` | React, Next.js, UI/UX |
| API | `api.md` | Endpoints, contracts, Gemini integration |
| AI/ML | `ai-ml.md` | LLM, RAG, model training |
| Orchestrator | `orchestrator.md` | Code review, integration |

## Development Directives (from CLAUDE.md)

All agents must follow these immutable principles:

1. **NO HARDCODING, EVER**
2. **ROOT CAUSE, NOT BANDAID**
3. **DATA INTEGRITY**
4. **ASK QUESTIONS BEFORE CHANGING CODE**
5. **DISPLAY PRINCIPLES**

## Project Architecture

```
thomas-to-bcheme/
├── src/
│   ├── app/           # Next.js pages & API routes
│   ├── components/    # React components
│   └── data/          # AI system context
├── backend/           # Python ML models
├── markdown/          # Documentation
└── .agents/           # Agent personas (this directory)
```
