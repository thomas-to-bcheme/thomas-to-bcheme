# .agents/PRD.md

> Product Requirements Document for Claude Code Agent System

## 1. Overview

### 1.1 Purpose
Define specialized agent personas for Claude Code to maintain consistent behavior, architectural boundaries, and code quality across the thomas-to-bcheme portfolio project.

### 1.2 Scope
- Frontend development (Next.js 16, React 19, TypeScript 5, Tailwind CSS v4)
- Backend ML pipelines (Python, TensorFlow, scikit-learn)
- API integration (Google Gemini, AWS SDK)
- Code review and orchestration

## 2. Agent Architecture

### 2.1 Directory Structure
```
.agents/
├── PRD.md              # This document
├── README.md           # Quick reference
├── backend.md          # Data & ML agent
├── frontend.md         # UI/UX agent
├── api.md              # Contract keeper agent
├── ai-ml.md            # LLM/RAG agent
├── orchestrator.md     # Review agent
├── reference/          # Supporting documentation
└── commands/           # Executable command definitions
```

### 2.2 Agent Hierarchy
```
┌─────────────────────────────────────┐
│         Orchestrator Agent          │
│    (Code Review & Integration)      │
└─────────────────┬───────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌─────────┐
│Frontend│  │   API    │  │ Backend │
│ Agent  │  │  Agent   │  │  Agent  │
└────────┘  └──────────┘  └─────────┘
                │
                ▼
          ┌──────────┐
          │  AI/ML   │
          │  Agent   │
          └──────────┘
```

## 3. Core Requirements

### 3.1 Development Directives (IMMUTABLE)
All agents MUST adhere to these principles from CLAUDE.md:

| # | Directive | Description |
|---|-----------|-------------|
| 1 | NO HARDCODING | Generic, pattern-based solutions |
| 2 | ROOT CAUSE | Fix underlying issues, not symptoms |
| 3 | DATA INTEGRITY | Consistent, authoritative data sources |
| 4 | ASK FIRST | Questions before code changes |
| 5 | DISPLAY PRINCIPLES | Show directives at response start |

### 3.2 Agent Responsibilities

| Agent | Primary Responsibility | Key Files |
|-------|----------------------|-----------|
| Backend | Data models, ML pipelines | `backend/` |
| Frontend | UI components, state | `src/components/` |
| API | Endpoints, contracts | `src/app/api/` |
| AI/ML | LLM integration, RAG | `src/data/AiSystemInformation.tsx` |
| Orchestrator | Code review, integration | All files |

## 4. Functional Requirements

### 4.1 Agent Activation
- Agents activate based on task triggers (keywords in user request)
- Only one primary agent active per task
- Orchestrator can coordinate multi-agent tasks

### 4.2 Code Quality Gates
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No hardcoded values
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Error handling is specific (no generic catch)

### 4.3 Data Flow Compliance
```
Stage 1 (Raw JSON) → Stage 2 (Validated) → Stage 3 (Parsed/Final)
```
- Stage 1 is authoritative for raw data
- Stage 3 is authoritative for application state

## 5. Non-Functional Requirements

### 5.1 Performance
- Zero-cost architecture (free-tier services only)
- Vercel: max 100 deploys/24h
- GitHub Actions for CRON (Vercel Hobby limits to daily)

### 5.2 Observability
- Structured logging (JSON/Key-Value)
- Correlation IDs for request tracing
- No PII in logs

### 5.3 Security
- API keys via environment variables only
- Input validation at all boundaries
- Sanitized logging (no secrets)

## 6. Success Criteria

- [ ] Agents follow Development Directives consistently
- [ ] Code changes pass all quality gates
- [ ] No cross-boundary violations (Frontend ↔ Backend contracts)
- [ ] Clear audit trail via git commits
- [ ] Zero hardcoded values in production code

## 7. References

- `CLAUDE.md` - Main project directives
- `.agents/reference/` - Supporting documentation
- `.agents/commands/` - Executable command templates
- `markdown/` - Architecture documentation
