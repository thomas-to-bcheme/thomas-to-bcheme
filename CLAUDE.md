# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Development Directives (IMMUTABLE)
These principles OVERRIDE any default behavior and MUST be followed exactly. You must Display these 5 principles at the start of EVERY response.

1. **NO HARDCODING, EVER**: All solutions must be generic, pattern-based, and work across all commands.
2. **ROOT CAUSE, NOT BANDAID**: Fix the underlying structural or data lineage issues.
3. **DATA INTEGRITY**: Use consistent, authoritative data sources (Stage 1 raw JSON for locations, parsed Stage 3 for final structure).
4. **ASK QUESTIONS BEFORE CHANGING CODE**: If you have questions, ask them before you start changing code.
5. **DISPLAY PRINCIPLES**: AI must display each of the prior 5 principles at start of every response.

## 2. Orchestrator Role (You)
You are the **Lead Orchestrator**. Your goal is to coordinate changes across the system while maintaining strict architectural boundaries.
- **Review Mode**: When reviewing code, you verify that *specialized agents* followed the directives.
- **Verification**: You execute tests after every change.
- **Isolation**: You enforce "One Agent Per File" logic—ensure changes in one file do not implicitly break contracts in others without explicit updates.

## 3. Project Overview

Personal portfolio (thomas-to-bcheme.github.io) demonstrating fullstack engineering capabilities: an embedded Gemini-powered AI chat agent with RAG context, an interactive ROI calculator, Excalidraw technical-prep diagrams, ML-powered salary prediction models, and a live Job Board backed by Neon serverless Postgres. Built on a zero-cost architecture using free-tier services (Vercel, GitHub Actions, Hugging Face).

## 4. Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4
- **AI Integration**: Google Gemini API (`@google/generative-ai`) with RAG context from `src/data/AiSystemInformation.tsx`
- **Data**: Neon serverless Postgres (`@neondatabase/serverless`), Vercel Blob (`@vercel/blob`) for private resume PDF storage
- **ML Backend**: Python (`backend/`) — Flask app (`app.py`) with TensorFlow/scikit-learn salary prediction models, deployed via `.github/workflows/deploy-backend.yml`
- **Infrastructure**: Vercel (frontend), GitHub Actions (CI/CD, CRON)
- **Diagramming**: Excalidraw (`@excalidraw/excalidraw`) embedded for technical-prep and system-design boards

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/chat/route.ts` - Gemini API streaming chat endpoint
- `src/app/jobs/` - Job Board pages (Neon-backed, signed-HMAC-gated resume downloads)
- `src/components/` - React components (HeroSection, AiGenerator, ProjectDeepDive, etc.)
- `src/data/AiSystemInformation.tsx` - RAG context/system prompt for the AI agent
- `src/docs/Thomas_To_Resume.md` - Résumé source of truth, read via `fs` for RAG chat context
- `src/lib/fractionalIndex.ts` - Excalidraw fractional-indexing validation utility
- `backend/` - Python ML models (Random Forest + TensorFlow for salary prediction)
- `public/excalidraw/` - Excalidraw board JSON (technical_prep, system_design_MLE, transformer-llm)
- `.github/workflows/` - CI/CD and backend deploy automation

### Excalidraw Agentic Writes
When appending or creating elements in `public/excalidraw/*.excalidraw` programmatically, **omit the `index` field entirely**. Excalidraw assigns valid fractional-indexing keys on first render via `syncInvalidIndices`. Hand-rolled index schemes (e.g. `b0`, `b6`, `a10`) violate the fractional-indexing library's structural rules and cause a crash on load. Validation utility: `src/lib/fractionalIndex.ts`.

### Design Constraints
- Zero-cost architecture using free-tier services
- Vercel limit: 100 deploys/24h (safe max: hourly = 24/day)
- GitHub Actions handle scheduled tasks since Vercel Hobby limits CRON to daily
- **Dev server vs. build**: never run `next build` or `rm -rf .next` while `next dev` is running — it corrupts the Turbopack cache

## 5. Commands

### Operational Standards
- **Idempotency:** Commands must be runnable multiple times without side effects.
- **Parameters:** Prefer named flags (`--input`) over positional args.
- **Exit Codes:** Return `0` for success, non-zero for failure.

### Command List
- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Start (prod)**: `npm run start`
- **Lint**: `npm run lint` — **currently broken** (Next 16 dropped `next lint`; eslint 10 crashes `eslint-plugin-react`). Verify correctness with `npx tsc --noEmit` and `npm run build` instead.
- **Postinstall**: copies Excalidraw fonts into `public/excalidraw/`

## 6. Path Aliases
TypeScript path alias `@/*` maps to `./src/*`

## 7. General Engineering Standards

### 7.1 Global Philosophy
- **KISS (Keep It Simple, Stupid):** Prioritize readability. Complexity is the enemy of reliability.
- **YAGNI (You Aren't Gonna Need It):** Solve the current problem exclusively; do not abstract for hypothetical futures.
- **DRY vs. AHA:** Avoid "Write Everything Twice," but prefer duplication over the wrong abstraction ("Avoid Hasty Abstractions").
- **SOLID:** Enforce Single Responsibility strictly.

### 7.2 Primitive Data Types
- **Strings:** Use interpolation/templates over concatenation. Treat as immutable. Explicitly handle UTF-8.
- **Numbers:** Avoid "Magic Numbers" (use named constants). Use integer/decimal types for currency/precision; avoid floating-point for money.
- **Booleans:** Name variables positively (e.g., `isEnabled` not `isNotDisabled`). Avoid "truthy/falsy" reliance; check explicitly.

### 7.3 Data Structures
- **Collections:** Prefer immutability (return new lists vs. mutate in place). Use vector operations (`map`, `filter`) over manual loops.
- **Maps/Objects:** Enforce consistent key casing. Use safe access methods (return default/null) rather than throwing on missing keys.
- **Depth:** Avoid deep nesting (>3 levels); refactor into models/classes if structure becomes too deep.

### 7.4 Control Flow
- **Guard Clauses:** Use early returns to handle edge cases immediately, flattening the "happy path."
- **Bounded Iteration:** Ensure loops have explicit exit conditions and safeguards (timeouts/max-counts).
- **Descriptive Naming:** Iterator variables must be descriptive (`for user in users`), not generic (`i`, `x`).

### 7.5 Error Handling
- **Fail Fast:** Validate inputs immediately. Crash/return early rather than propagating bad state.
- **Catch Specifics:** Catch specific exceptions (e.g., `FileNotFound`) rather than generic catch-alls.
- **Contextual Logging:** Log the *context* (state/inputs) alongside the error, not just the stack trace.
- **No Silent Failures:** No empty `try/catch` blocks.
- **Resource Cleanup:** Always use `finally` or `using/with` blocks for resource disposal.

## 8. Testing Strategy
- **The Pyramid:**
    1. **Unit:** Many fast, isolated tests (mock external deps).
    2. **Integration:** Moderate number, verifying module interactions.
    3. **E2E:** Few, high-value "happy path" tests.
- **Structure:** Use **Arrange-Act-Assert** pattern for all tests.
- **Data:** Use Factories to generate test data; avoid brittle static fixtures.

## 9. Logging & Observability
- **Structured Logging:** Use JSON/Key-Value pairs (e.g., `level=INFO user_id=123`) for aggregation.
- **Correlation IDs:** Pass unique IDs through the stack to trace requests.
- **Sanitization:** STRICTLY scrub PII and secrets from all logs.
- **Levels:**
    - `INFO`: Lifecycle events.
    - `WARN`: Handled unexpected events.
    - `ERROR`: Actionable failures.
