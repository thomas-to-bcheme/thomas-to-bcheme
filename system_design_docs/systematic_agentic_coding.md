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
2. Pull relevant sections from boilerplates
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

### 3.1 Create the `agents/` Folder Structure

```
project/
├── CLAUDE.md                    # Foundation context (always loaded)
└── agents/                      # Specialized agent guidance
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

## Summary

The **Planning → Implementing → Validating** framework transforms AI-assisted development from ad-hoc prompting into systematic engineering:

1. **PLANNING**: Build foundation context with `/init` + boilerplates → `CLAUDE.md`
2. **IMPLEMENTING**: Create specialized agents in `agents/` → domain expertise on demand
3. **VALIDATING**: Verify compliance, respect boundaries, iterate → continuous improvement

The markdown-as-context paradigm ensures that both humans and AI agents operate from the same source of truth, version-controlled alongside the code it governs.
