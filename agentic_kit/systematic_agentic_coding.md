# Systematic Agentic Coding

A first-principles workflow for AI-assisted development using the **Planning → Implementing → Validating** framework.

---

## Table of Contents
1. [Introduction: Claude Code as Industry Standard](#1-introduction-claude-code-as-industry-standard)
2. [PLANNING Phase — Establishing Foundation](#2-planning-phase--establishing-foundation)
3. [IMPLEMENTING Phase — Building Agent Infrastructure](#3-implementing-phase--building-agent-infrastructure)
4. [VALIDATING Phase — Verification Loop](#4-validating-phase--verification-loop)
5. [The Complete Systematic Workflow](#5-the-complete-systematic-workflow)
6. [Quick Reference](#6-quick-reference)
7. [Practical Exercises — Continuing Existing Projects](#7-practical-exercises--continuing-existing-projects)

---

## 1. Introduction: Claude Code as Industry Standard

### Why Claude Code for Agentic Development
Claude Code represents the convergence of LLM capabilities with software engineering workflows. It excels at:
- **Context-aware reasoning**: Understands project structure, dependencies, and patterns
- **Tool orchestration**: Executes file operations, terminal commands, and searches
- **Iterative refinement**: Adapts based on feedback and verification results

### The Markdown-as-Context Paradigm
Markdown files serve as the communication protocol between humans and AI agents:
- **Human-readable**: Engineers can audit and modify guidance directly
- **Version-controlled**: Context evolves with the codebase via Git
- **Composable**: Multiple markdown files combine to form complete context

### Progressive Context Building
Context layers from generic to specific:

```
┌─────────────────────────────────────────┐
│         Task-Specific Context           │  ← Most specific
│    (agents/backend.md for this task)    │
├─────────────────────────────────────────┤
│       Project-Specific Context          │
│           (CLAUDE.md)                   │
├─────────────────────────────────────────┤
│        Generic Best Practices           │  ← Most generic
│      (boilerplate templates)            │
└─────────────────────────────────────────┘
```

---

## 2. PLANNING Phase — Establishing Foundation

The planning phase answers: **What context does the AI need to work effectively?**

### 2.1 `/init` — Generate Project Context

Run `/init` in Claude Code to create the base `CLAUDE.md`:

```bash
# In your project root
claude
> /init
```

**What `/init` produces:**
- Project overview (detected from README, package.json, etc.)
- Tech stack identification
- Common commands (build, test, lint)
- Directory structure summary

**First checkpoint:** Review the generated `CLAUDE.md` for accuracy. Correct any misidentified technologies or commands.

### 2.2 Cross-Reference Generic Best Practices

Maintain a library of boilerplate templates for reusable patterns:

**Boilerplate Categories:**

| Category | Purpose | Example File |
|----------|---------|--------------|
| Development Directives | Immutable rules (no hardcoding, root cause fixes) | `CLAUDE_boilerplate.md` |
| Engineering Standards | Coding principles (SOLID, DRY, guard clauses) | `CLAUDE_boilerplate.md` |
| Agent Templates | Specialized agent structures | `AGENTS_boilerplate.md` |
| Testing Patterns | Verification methods (pyramid, AAA) | `CLAUDE_boilerplate.md` |

**Selective Adoption Process:**
1. Review your project's needs
2. Incorporate relevant sections from boilerplates of best practices and guardrails
3. Customize for project-specific constraints
4. Remove inapplicable guidance

### 2.3 Output: Project-Specific CLAUDE.md

The authoritative context file containing:

```markdown
# CLAUDE.md

## 1. Development Directives (IMMUTABLE)
[Rules that OVERRIDE default behavior]

## 2. Project Overview
[What this project does, who it serves]

## 3. Architecture
[Tech stack, key directories, data flow]

## 4. Commands
[Build, test, deploy commands]

## 5. Boundaries
[What agents should NOT do]

## 6. Agents
[Pointer to agents/ folder for specialized work]
```

---

## 3. IMPLEMENTING Phase — Building Agent Infrastructure

The implementing phase answers: **How do we structure guidance for specialized work?**

### 3.1 Create the `.agents/` Folder Structure

```
project/
├── CLAUDE.md                    # Foundation context (always loaded)
└── .agents/                      # Specialized agent guidance
    ├── _index.md                # Agent registry & routing rules
    ├── backend.md               # Data & logic specialization
    ├── frontend.md              # UI/UX specialization
    ├── api.md                   # Contract & integration specialization
    ├── ai-ml.md                 # LLM/RAG specialization
    └── orchestrator.md          # Review & coordination specialization
```

**Why separate files?**
- **Focused context**: Load only relevant guidance for the task
- **Parallel development**: Different engineers own different agent specs
- **Cleaner diffs**: Changes to frontend guidance don't pollute backend history

### 3.2 Agent Markdown Template

Each `agents/*.md` file follows a consistent structure:

```markdown
# [Agent Name]

> SYSTEM: Adopt this persona. Always adhere to CLAUDE.md directives.

## Focus Area
[Domain-specific responsibilities — what this agent owns]

## Triggers
[Phrases/patterns that indicate this agent should be loaded]
- "work on the API..."
- "update the endpoint..."
- "fix the contract..."

## CLAUDE.md Alignment
[How this agent enforces project directives]
- Directive 1 → How this agent applies it
- Directive 2 → How this agent applies it

## Patterns
[Best practices for this domain]
- DO: [Recommended approach]
- DO: [Another good pattern]

## Anti-Patterns
[What to avoid]
- DON'T: [Bad practice and why]
- DON'T: [Another anti-pattern]

## Boundaries
[What this agent should NOT touch]
- Changes to [X] require [other agent]
- Never modify [Y] without explicit approval

## Sub-Agents (Optional)
[Specialized subdivisions for complex domains]
- `agents/backend-db.md` — Database-specific operations
- `agents/backend-cache.md` — Caching layer operations
```

### 3.3 The `_index.md` Registry

The `agents/_index.md` serves as a routing table:

```markdown
# Agent Registry

## Routing Rules

| Task Type | Primary Agent | Secondary (if needed) |
|-----------|---------------|----------------------|
| Database schema changes | backend.md | api.md |
| React component work | frontend.md | — |
| API endpoint changes | api.md | backend.md |
| LLM prompt engineering | ai-ml.md | — |
| Code review | orchestrator.md | [domain agent] |

## Agent Descriptions

### backend.md
Owns: Data models, business logic, database operations
Boundaries: Does not modify UI components or API contracts

### frontend.md
Owns: React components, styling, client-side state
Boundaries: Does not modify backend logic or database

### api.md
Owns: Route definitions, request/response contracts, middleware
Boundaries: Must coordinate with backend.md for logic changes

### orchestrator.md
Owns: Cross-cutting reviews, integration verification
Boundaries: Does not implement—only reviews and coordinates
```

### 3.4 Referencing Agents from CLAUDE.md

Add an explicit section to `CLAUDE.md`:

```markdown
## Agents

For specialized tasks, load context from `agents/`:

| Domain | Agent File | When to Load |
|--------|------------|--------------|
| Backend | `agents/backend.md` | Data models, business logic, DB |
| Frontend | `agents/frontend.md` | React components, UI, styling |
| API | `agents/api.md` | Endpoints, contracts, middleware |
| AI/ML | `agents/ai-ml.md` | Prompts, RAG, model integration |
| Review | `agents/orchestrator.md` | Code review, coordination |

**Loading pattern:**
1. CLAUDE.md loads automatically (always)
2. Identify task domain from user request
3. Load relevant `agents/*.md` for specialized context
4. Execute with combined context
```

### 3.5 Context Loading in Practice

When starting a task:

```
User: "Add caching to the user lookup function"

Claude Code process:
1. ✓ CLAUDE.md loaded (automatic)
2. Identify domain: Backend (caching, data logic)
3. Load: agents/backend.md
4. Execute with combined context
```

For cross-cutting work:

```
User: "Add a new /users/:id endpoint that returns cached data"

Claude Code process:
1. ✓ CLAUDE.md loaded (automatic)
2. Identify domains: API (new endpoint) + Backend (caching)
3. Load: agents/api.md + agents/backend.md
4. Execute with combined context
```

---

## 4. VALIDATING Phase — Verification Loop

The validating phase answers: **How do we ensure agents followed the rules?**

### 4.1 Pre-Execution Checklist

Before any code changes:

- [ ] CLAUDE.md loaded and understood?
- [ ] Correct agent context loaded for task domain?
- [ ] Immutable directives identified?
- [ ] Boundaries understood (what NOT to touch)?

### 4.2 Post-Execution Verification

After code changes:

- [ ] **Directive compliance**: Does the code follow all immutable directives?
  - No hardcoding?
  - Root cause addressed (not bandaid)?
  - Data integrity maintained?

- [ ] **Boundary respect**: Did changes stay within agent's focus area?
  - Backend agent didn't modify UI?
  - Frontend agent didn't change DB logic?

- [ ] **Pattern adherence**: Were recommended patterns used?
  - Guard clauses for early returns?
  - Descriptive naming?
  - Proper error handling?

- [ ] **Anti-pattern avoidance**: Were anti-patterns avoided?
  - No magic numbers?
  - No deep nesting?
  - No silent failures?

### 4.3 The Orchestrator Review

For significant changes, invoke the orchestrator agent:

```
User: "Review the changes I just made to the user service"

Load: agents/orchestrator.md

Orchestrator checks:
1. Cross-reference changes against CLAUDE.md directives
2. Verify no boundary violations
3. Check integration points with other domains
4. Validate test coverage
```

### 4.4 Feedback Integration

After each development cycle:

1. **Update CLAUDE.md** with new learnings
   - New patterns discovered
   - Boundaries that need clarification
   - Directives that need refinement

2. **Refine agents/*.md** based on edge cases
   - Add new triggers for ambiguous routing
   - Document new anti-patterns encountered
   - Clarify boundaries that caused confusion

3. **Evolve boilerplates** for reuse
   - Promote project-specific patterns to generic templates
   - Share learnings across projects

---

## 5. The Complete Systematic Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PLANNING                                     │
│         "What context does the AI need?"                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   /init  ──►  Cross-reference  ──►  Project CLAUDE.md               │
│              boilerplates                                           │
│                                                                      │
│   Output: CLAUDE.md with directives, architecture, boundaries       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       IMPLEMENTING                                   │
│         "How do we structure specialized guidance?"                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Create agents/  ──►  Write agent  ──►  Link from CLAUDE.md        │
│                        markdowns                                     │
│                                                                      │
│   Output: agents/*.md with focus areas, triggers, boundaries        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        VALIDATING                                    │
│         "How do we ensure agents followed the rules?"               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Pre-checks  ──►  Execute with  ──►  Post-verify  ──►  Iterate     │
│                    context                                          │
│                                                                      │
│   Output: Verified code + updated context files                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Quick Reference

### Context Loading Commands

| Command | Purpose |
|---------|---------|
| "Load CLAUDE.md" | Always first — foundation context |
| "For this backend task, also load `agents/backend.md`" | Add specialized context |
| "Review against directives in CLAUDE.md" | Verification prompt |
| "Check boundaries in `agents/_index.md`" | Routing clarification |

### File Purposes

| File | Purpose | When Updated |
|------|---------|--------------|
| `CLAUDE.md` | Foundation context, directives, architecture | Project setup, major changes |
| `agents/_index.md` | Agent registry, routing rules | New agents, routing confusion |
| `agents/[name].md` | Specialized domain guidance | Domain pattern evolution |
| `*_boilerplate.md` | Reusable templates | Cross-project learnings |

### Verification Checklist (Copy-Paste)

```markdown
## Pre-Execution
- [ ] CLAUDE.md loaded?
- [ ] Correct agent(s) loaded?
- [ ] Directives understood?
- [ ] Boundaries clear?

## Post-Execution
- [ ] No hardcoding?
- [ ] Root cause addressed?
- [ ] Data integrity maintained?
- [ ] Stayed within boundaries?
- [ ] Patterns followed?
- [ ] Tests pass?
```

---

## 7. Practical Exercises — Continuing Existing Projects

This section provides prompt templates for common workflows when building off an established agentic coding setup.

### 7.1 Exercise: Setting Up Ruff for AI Self-Correction

Ruff is a fast Python linter that integrates well with AI-assisted development. This exercise demonstrates the complete workflow.

**Prompt to Use:**

> Using the official Ruff documentation as context, let's set up Ruff for our project optimized for AI self-correction.
>
> Document to read FETCH: (https://docs.astral.sh/ruff/configuration/)
>
> Read and understand the configuration options before continuing. Don't set up anything beyond Ruff. Write a simple Python script in main.py then test our Ruff set up when done.

**Why This Exercise Matters:**
- **Linting as Validation**: Ruff provides instant feedback for the VALIDATING phase
- **AI Self-Correction Loop**: Lint errors become prompts for the AI to fix its own output
- **Zero-Config Start**: Ruff works out of the box, reducing setup friction

**Expected Workflow:**
1. Fetch and read Ruff configuration documentation
2. Create `pyproject.toml` or `ruff.toml` with project-appropriate rules
3. Write `main.py` with intentional style variations
4. Run `ruff check main.py` to verify setup
5. Use `ruff check --fix` for auto-correction demonstration

**Integration with Agentic Workflow:**
- Add Ruff to CLAUDE.md commands section
- Consider a `backend.md` or `python.md` agent that enforces Ruff compliance
- Use Ruff output as feedback in the validation loop

### 7.2 Exercise: Setting Up Pyright for Type Safety

Pyright adds static type checking as a second validation layer.

**Prompt to Use:**

> Using the official Pyright documentation as context, set up Pyright for our project as a second layer of type safety.
>
> Documentation to read: FETCH:(https://github.com/microsoft/pyright/blob/main/docs/configuration.md)
>
> Read and understand the configuration options, especially type checking modes and diagnostic rules.
>
> First, run:
> uv add --dev pyright
>
> Then add the Pyright configuration to pyproject.toml based on the documentation. Use strict mode with all safety checks enabled.
>
> When you have added the rules, run both MyPy and Pyright on main.py to verify both type checkers pass.
>
> main.py is just for testing, so feel free to override anything that's there.
>
> When done, write a short summary comparing what Pyright caught vs MyPy.

**Why This Exercise Matters:**
- **Type Safety**: Catches type errors before runtime
- **IDE Integration**: Pyright powers VS Code's Python language server
- **Complements Ruff**: Ruff handles style, Pyright handles types
- **Comparison Learning**: Understanding differences between MyPy and Pyright

### 7.3 Exercise: Setting Up MyPy for Strict Type Checking

MyPy provides strict type enforcement optimized for AI-assisted development.

**Prompt to Use:**

> Using the official MyPy documentation as context, set up MyPy for our project.
>
> Documentation to read: FETCH: (https://mypy.readthedocs.io/en/stable/config_file.html)
>
> Read and understand the configuration options, especially strict mode settings.
>
> First, run:
> uv add --dev mypy
>
> Then add the MyPy configuration to pyproject.toml based on the documentation, optimized for AI coding.
>
> When you have added the rules, modify main.py to properly test that all of our type checking rules are working as expected.
>
> main.py is just for testing, so feel free to override anything that's there.
>
> When done, write a short summary of what was configured and tested.

**Why This Exercise Matters:**
- **Strict Mode**: Enforces comprehensive type annotations
- **AI Self-Correction**: Type errors provide precise feedback for AI to fix
- **pyproject.toml Integration**: Centralizes all tool configuration

### 7.4 Exercise: Setting Up Pytest with Async Support

Pytest provides the testing foundation for the VALIDATING phase.

**Prompt to Use:**

> Using the official pytest-asyncio documentation as context, set up pytest for our project.
>
> Documentation to read: FETCH:(https://pytest-asyncio.readthedocs.io/)
>
> Read and understand async test setup, fixtures, and event loop configuration.
>
> First, run:
> uv add --dev pytest pytest-cov pytest-asyncio
>
> Then create tests for main.py following best practices from the documentation.
>
> Make sure all tests pass, and that Ruff, MyPy, and Pyright checks all pass as well.
>
> When everything is green, run /commit to commit the changes.
>
> Write a short summary of what was configured and tested.
>
> output:
> Summary: [short descriptive summary]
> Files changed: [bullet list]
> # tests passing: [bullet list]
> exact commit message used:

**Why This Exercise Matters:**
- **Testing Foundation**: Pytest is the standard for Python testing
- **Async Support**: pytest-asyncio enables testing async code
- **Coverage Tracking**: pytest-cov measures test coverage
- **Full Validation Loop**: Combines linting + type checking + testing
- **Commit Integration**: Demonstrates the complete workflow ending with /commit

### 7.5 Exercise: Setting Up Docker with uv

Docker provides containerization for consistent deployment environments.

**Prompt to Use:**

> Using this article as context, set up Docker for our project with uv.
>
> Here is the article to read FETCH:(https://docs.astral.sh/uv/guides/integration/docker/)
>
> Read it and fully understand it before you continue, do any additional research as needed.
>
> Create:
>
> 1. Dockerfile using multi-stage build with official uv images
>    - Use python3.12-bookworm-slim as base
>    - Separate dependency installation layer for caching
>    - Use --no-editable for production builds
>    - Include cache mounts for uv
>
> 2. .dockerignore file to exclude:
>    - Virtual environments (.venv)
>    - Cache directories (.mypy_cache, .ruff_cache, .pytest_cache, .pyright)
>    - Python bytecode (__pycache__, *.pyc)
>    - Git and environment files
>
> 3. docker-compose.yml for local development with:
>    - Volume mounts for the project (excluding .venv)
>    - Port mapping (8123:8123)
>    - Environment variable support
>
> Test the setup:
> - Build the Docker image successfully
> - Verify the image size is reasonable
> - Test running the container
>
> When done, write a short summary of the Docker setup.
>
> output:
> Summary: [short descriptive summary]
> Image details: [size, base image, key optimizations]
> Usage commands: [docker build, docker run, docker compose]

**Why This Exercise Matters:**
- **Reproducible Builds**: Docker ensures consistent environments across machines
- **Multi-Stage Optimization**: Separates build and runtime for smaller images
- **uv Integration**: Uses official uv images for fast dependency installation
- **Cache Efficiency**: Layer caching and cache mounts speed up rebuilds
- **Production Ready**: --no-editable flag creates production-optimized installs

### 7.6 Exercise: Setting Up Pydantic for Data Validation

Pydantic provides runtime data validation with static type checking support—essential for agentic coding workflows.

**Prompt to Use:**

> Using the official Pydantic documentation as context, set up Pydantic for our project.
>
> Documentation to read: FETCH:(https://docs.pydantic.dev/latest/concepts/models/)
>
> Read and understand BaseModel, field validation, and serialization patterns.
>
> First, run:
> uv add pydantic
>
> Then create example models in main.py demonstrating:
> 1. Basic model with type validation
> 2. Field constraints (min/max, regex patterns)
> 3. Nested models
> 4. Custom validators
> 5. JSON serialization/deserialization
>
> Make sure all tests pass, and that Ruff, MyPy, and Pyright checks all pass.
>
> When done, write a summary explaining how Pydantic integrates with the agentic coding ecosystem.
>
> output:
> Summary: [short descriptive summary]
> Models created: [bullet list with purpose of each]
> Agentic integrations: [how Pydantic works with LLMs, agents, and other tools]

**Why This Exercise Matters:**
- **Runtime Validation**: Catches data errors that static type checkers miss
- **LLM Tool Schemas**: Pydantic models define function calling schemas for OpenAI, Anthropic, etc.
- **Structured Outputs**: Forces LLM responses into validated Python objects
- **Agent Frameworks**: LangChain, CrewAI, and other agent frameworks use Pydantic for tool definitions
- **FastAPI Integration**: Pydantic powers request/response validation in FastAPI
- **Settings Management**: pydantic-settings handles environment variables and config files

**Agentic Coding Ecosystem:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     Pydantic in Agentic Coding                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LLM APIs ──► Pydantic Models ──► Validated Tool Calls          │
│     │              │                     │                       │
│     │              ▼                     ▼                       │
│     │      JSON Schema Generation   Type-Safe Execution          │
│     │              │                     │                       │
│     ▼              ▼                     ▼                       │
│  OpenAI/Anthropic  LangChain/CrewAI  Your Agent Code            │
│  function_call     Tool Definitions   Business Logic             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Integrations:**
- **OpenAI**: `function_call` and `tools` use JSON Schema generated from Pydantic
- **Anthropic**: Tool use definitions map directly to Pydantic models
- **LangChain**: `@tool` decorator uses Pydantic for input validation
- **Instructor**: Patches LLM clients to return Pydantic objects directly
- **FastAPI**: Request bodies and responses validated via Pydantic
- **SQLModel**: Combines Pydantic + SQLAlchemy for database models

---

## 8. Distributed Terminal Strategy — Maximizing Parallel Compute

This section describes the recommended terminal setup for maximizing distributed compute across multiple Claude Code instances and git worktrees.

### 8.1 The Multi-Terminal Architecture

Boot up **6 specialized terminals** to parallelize work across different concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TERMINAL DISTRIBUTION STRATEGY                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐                      │
│  │  main1   │  │  main2   │  │ main-to-branch│                      │
│  │ (stable) │  │ (review) │  │   (staging)   │                      │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘                      │
│       │             │                │                               │
│       └─────────────┼────────────────┘                               │
│                     │                                                │
│              Main Branch Worktree                                    │
│                     │                                                │
│       ┌─────────────┼────────────────┐                               │
│       │             │                │                               │
│  ┌────┴─────┐  ┌────┴─────┐  ┌───────┴───────┐                      │
│  │   dev    │  │   uiux   │  │    docker     │                      │
│  │(feature) │  │ (design) │  │(infrastructure)│                     │
│  └──────────┘  └──────────┘  └───────────────┘                      │
│                                                                      │
│           Feature Branch Worktrees (isolated)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Terminal Roles & Responsibilities

| Terminal | Worktree | Primary Role | Claude Agent |
|----------|----------|--------------|--------------|
| **main1** | `main` | Stable reference, quick lookups, documentation | Orchestrator |
| **main2** | `main` | Code review, PR preparation, validation | Orchestrator |
| **main-to-branch** | `main` | Merge coordination, conflict resolution, staging | Orchestrator |
| **dev** | `feature/*` | Active feature development, implementation | Backend/API |
| **uiux** | `feature/*` or `design/*` | UI/UX work, component development, styling | Frontend/UI-UX |
| **docker** | `infra/*` or `main` | Container builds, CI/CD, infrastructure | Docker |

### 8.3 Git Worktree Setup

Git worktrees allow multiple working directories from a single repository, enabling true parallel development:

```bash
# From your main repository directory
# Create worktrees for parallel development

# Feature development worktree
git worktree add ../project-dev feature/current-work

# UI/UX dedicated worktree
git worktree add ../project-uiux feature/ui-updates

# Infrastructure worktree
git worktree add ../project-docker infra/docker-setup

# List all worktrees
git worktree list
```

**Directory Structure After Setup:**
```
parent-directory/
├── project/              # Main worktree (main1, main2, main-to-branch)
├── project-dev/          # Dev worktree (dev terminal)
├── project-uiux/         # UI/UX worktree (uiux terminal)
└── project-docker/       # Infrastructure worktree (docker terminal)
```

### 8.4 Terminal Startup Sequence

**Recommended boot order for maximum efficiency:**

```bash
# 1. MAIN1 - Stable reference (first, for context)
cd ~/project
claude
# Load: CLAUDE.md (automatic)
# Role: Quick lookups, documentation reference

# 2. MAIN2 - Review terminal (parallel with main1)
cd ~/project
claude
# Load: CLAUDE.md + agents/orchestrator.md
# Role: Code review, validation, PR prep

# 3. DEV - Feature development (primary work)
cd ~/project-dev
claude
# Load: CLAUDE.md + agents/backend.md (or relevant agent)
# Role: Active implementation

# 4. UIUX - Design implementation (parallel with dev)
cd ~/project-uiux
claude
# Load: CLAUDE.md + agents/frontend.md + agents/uiux.md
# Role: Component development, styling, accessibility

# 5. DOCKER - Infrastructure (as needed)
cd ~/project-docker
claude
# Load: CLAUDE.md + agents/docker.md
# Role: Container builds, CI/CD configuration

# 6. MAIN-TO-BRANCH - Merge coordination (when integrating)
cd ~/project
claude
# Load: CLAUDE.md + agents/orchestrator.md
# Role: Merge prep, conflict resolution, staging
```

### 8.5 Parallel Workflow Patterns

**Pattern A: Feature + UI Development (Most Common)**
```
dev terminal:     Implements API endpoints and business logic
uiux terminal:    Builds React components consuming the API
main2 terminal:   Reviews both streams, identifies integration issues
```

**Pattern B: Infrastructure + Feature (DevOps Focus)**
```
docker terminal:  Updates Dockerfile, adds new service to compose
dev terminal:     Implements feature requiring new infrastructure
main1 terminal:   Documents changes, updates CLAUDE.md
```

**Pattern C: Review + Hotfix (Emergency Response)**
```
main1 terminal:   Investigates production issue
main2 terminal:   Prepares hotfix PR
main-to-branch:   Coordinates cherry-pick to release branch
```

### 8.6 Communication Between Terminals

Terminals operate independently but share the git repository. Coordinate via:

1. **Git commits**: Small, frequent commits allow other terminals to pull changes
2. **Branch conventions**: Clear naming (`feature/`, `design/`, `infra/`) prevents conflicts
3. **CLAUDE.md updates**: Document decisions that affect other agents
4. **Slack/notes**: For complex coordination, maintain a shared notes file

**Sync Protocol:**
```bash
# In any terminal, before starting work:
git fetch origin
git status

# After completing a logical unit:
git add -p  # Stage intentionally
git commit -m "descriptive message"

# Other terminals can then:
git fetch origin
git merge origin/branch-name  # or rebase
```

### 8.7 Resource Considerations

**Claude API Limits:**
- Each terminal is an independent Claude session
- Monitor token usage across all sessions
- Consider staggering intensive operations

**System Resources:**
- Each worktree consumes disk space (shared .git objects)
- Each Claude instance uses memory
- Recommended: 16GB+ RAM for 4+ parallel sessions

**Cost Optimization:**
- Use `main1` for read-only reference (minimal token usage)
- Batch questions in review terminals
- Close idle terminals to free resources

---

## Summary

The **Planning → Implementing → Validating** framework transforms AI-assisted development from ad-hoc prompting into systematic engineering:

1. **PLANNING**: Build foundation context with `/init` + boilerplates → `CLAUDE.md`
2. **IMPLEMENTING**: Create specialized agents in `agents/` → domain expertise on demand
3. **VALIDATING**: Verify compliance, respect boundaries, iterate → continuous improvement

The markdown-as-context paradigm ensures that both humans and AI agents operate from the same source of truth, version-controlled alongside the code it governs.
