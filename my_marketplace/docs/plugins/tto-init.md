# tto-init Plugin Guide

**Command:** `/init`

**What it does:** Generates an initial `CLAUDE.md` file with programming-agnostic and engineering-agnostic best practices for any project.

> **Installation:** See [Claude Code Installation Guide](../CLAUDE-CODE-INSTALLATION.md) for the quickest setup method.

---

## When to Use This Plugin

Use `/init` when you want to:
- Set up Claude Code for a new project
- Add AI-assisted development to an existing codebase
- Establish consistent engineering standards across your team
- Create a foundation for specialized agent contexts

---

## How It Works

When you type `/init`, Claude will:

1. **Scan your project**
   - Detects tech stack from config files (package.json, pyproject.toml, etc.)
   - Identifies directory structure and key folders
   - Finds existing README, documentation, and build scripts

2. **Generate base CLAUDE.md**
   - Creates project-specific overview
   - Documents detected commands (build, test, lint)
   - Maps architecture and key directories

3. **Apply best practices**
   - Adds immutable development directives
   - Includes programming-agnostic engineering standards
   - Sets up orchestrator role and boundaries

4. **User review checkpoint**
   - Presents generated content for verification
   - Allows corrections before finalizing
   - Confirms accuracy of detected technologies

---

## What Gets Generated

The `/init` command produces a `CLAUDE.md` with these sections:

### 1. Development Directives (Immutable)

Five principles that override default AI behavior:

| # | Directive | Purpose |
|---|-----------|---------|
| 1 | **NO HARDCODING, EVER** | Solutions must be generic and pattern-based |
| 2 | **ROOT CAUSE, NOT BANDAID** | Fix underlying issues, not symptoms |
| 3 | **DATA INTEGRITY** | Use consistent, authoritative data sources |
| 4 | **ASK QUESTIONS BEFORE CHANGING CODE** | Clarify before implementing |
| 5 | **DISPLAY PRINCIPLES** | AI shows directives at start of every response |

### 2. Orchestrator Role

Establishes Claude as the Lead Orchestrator:
- **Review Mode**: Verifies specialized agents follow directives
- **Verification**: Executes tests after every change
- **Isolation**: Enforces "One Agent Per File" logic

### 3. General Engineering Standards

**Global Philosophy:**
- **KISS**: Prioritize readability over cleverness
- **YAGNI**: Solve current problems, not hypothetical futures
- **DRY vs. AHA**: Prefer duplication over wrong abstractions
- **SOLID**: Enforce Single Responsibility strictly

**Primitive Data Types:**
- Strings: Use interpolation, treat as immutable, handle UTF-8
- Numbers: No magic numbers, use named constants
- Booleans: Positive naming (`isEnabled` not `isNotDisabled`)

**Data Structures:**
- Collections: Prefer immutability, use vector operations
- Maps/Objects: Consistent key casing, safe access methods
- Depth: Avoid >3 levels of nesting

**Control Flow:**
- Guard clauses for early returns
- Bounded iteration with explicit exit conditions
- Descriptive iterator naming (`for user in users`)

**Error Handling:**
- Fail fast: Validate inputs immediately
- Catch specific exceptions, not generic catch-alls
- Contextual logging with state/inputs
- No silent failures (empty try/catch)
- Resource cleanup with finally/using/with

### 4. Operational Commands

Template for project-specific commands:
```markdown
- **Boot**: `[e.g., docker-compose up]`
- **Test Suite**: `[e.g., pytest]`
- **Linting**: `[e.g., ruff check]`
```

### 5. Testing Strategy

The Testing Pyramid:
1. **Unit**: Many fast, isolated tests (mock external deps)
2. **Integration**: Moderate number, verifying module interactions
3. **E2E**: Few, high-value "happy path" tests

Structure: **Arrange-Act-Assert** pattern for all tests

### 6. Logging & Observability

- **Structured Logging**: JSON/Key-Value pairs for aggregation
- **Correlation IDs**: Trace requests through the stack
- **Sanitization**: Scrub PII and secrets from all logs
- **Levels**: INFO (lifecycle), WARN (handled issues), ERROR (actionable failures)

---

## Example Session

```
You: /init

Claude: Scanning project structure...

Detected:
  - Tech stack: Python 3.11, FastAPI, PostgreSQL
  - Package manager: uv (pyproject.toml found)
  - Test framework: pytest
  - Linter: ruff

Generating CLAUDE.md...

## Preview:

# CLAUDE.md

## 1. Development Directives (IMMUTABLE)
[5 principles listed...]

## 2. Orchestrator Role
[Role definition...]

## 3. Project Overview
This is a FastAPI backend service with PostgreSQL database...

## 4. Architecture
- src/api/ - FastAPI route handlers
- src/models/ - SQLAlchemy models
- src/services/ - Business logic
- tests/ - pytest test suite

## 5. Commands
- Boot: `docker-compose up -d`
- Test: `pytest`
- Lint: `ruff check src/`

---

Does this look correct? I can adjust any section before saving.

You: The database is actually SQLite for development

Claude: Updated. Writing CLAUDE.md...

CLAUDE.md created successfully.

Next steps:
1. Review and customize the generated file
2. Consider creating .claude/agents/ for specialized contexts
3. Run /init again anytime to regenerate
```

---

## Best Practices Applied

These standards are **programming-agnostic** and **engineering-agnostic**:

| Category | Applies To | Key Principle |
|----------|------------|---------------|
| Global Philosophy | All languages | Simplicity over cleverness |
| Data Types | All primitives | Immutability, explicit handling |
| Data Structures | All collections | Prefer functional operations |
| Control Flow | All logic | Guard clauses, bounded loops |
| Error Handling | All systems | Fail fast, catch specific |
| Testing | All projects | Pyramid structure, AAA pattern |
| Logging | All deployments | Structured, sanitized, correlated |

---

## Post-Init Next Steps

After running `/init`:

1. **Review CLAUDE.md**
   - Verify detected technologies are correct
   - Add project-specific boundaries
   - Customize commands for your workflow

2. **Create specialized agents** (optional)
   ```
   .claude/
   └── agents/
       ├── backend.md    # Data & logic specialization
       ├── frontend.md   # UI/UX specialization
       ├── api.md        # Contract & integration
       └── orchestrator.md # Review & coordination
   ```

3. **Establish validation loop**
   - Pre-execution: Verify context loaded
   - Post-execution: Check directive compliance
   - Iterate: Update CLAUDE.md with learnings

---

## Progressive Context Model

`/init` creates the foundation layer of a three-tier context system:

```
┌─────────────────────────────────────────┐
│         Task-Specific Context           │  ← Most specific
│    (.claude/agents/backend.md)          │
├─────────────────────────────────────────┤
│       Project-Specific Context          │  ← /init creates this
│           (CLAUDE.md)                   │
├─────────────────────────────────────────┤
│        Generic Best Practices           │  ← Embedded in template
│      (boilerplate standards)            │
└─────────────────────────────────────────┘
```

---

## Related Plugins

- **[tto-agents-swe](tto-agents-swe.md)** - Software engineering agent templates
- **[tto-agents-data-analyst](tto-agents-data-analyst.md)** - Data analysis agent templates
- **[tto-agents-protein-design](tto-agents-protein-design.md)** - Protein design agent templates
- **[git-push](git-push.md)** - Interactive git commit and push
- **[git-push-agentic](git-push-agentic.md)** - Autonomous git workflow
- **[git-README](git-README.md)** - Generate project documentation
