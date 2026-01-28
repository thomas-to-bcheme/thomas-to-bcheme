---
name: init
description: Initialize CLAUDE.md with programming-agnostic best practices
tools: Read, Glob, Grep, Write
---

# /init - Initialize Project with Best Practices

## Purpose
Generate a `CLAUDE.md` file that establishes engineering standards and AI-assisted development guidelines for any project, regardless of programming language or domain.

## Workflow Steps

### Step 1: Scan Project Structure

Detect the project's tech stack and structure:

```bash
# Check for config files to identify tech stack
ls -la | grep -E "(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|pom\.xml|build\.gradle|Gemfile|composer\.json|\.csproj)"
```

**Detection targets:**
| File | Indicates |
|------|-----------|
| `package.json` | Node.js/JavaScript/TypeScript |
| `pyproject.toml` / `requirements.txt` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml` / `build.gradle` | Java |
| `Gemfile` | Ruby |
| `composer.json` | PHP |
| `*.csproj` | .NET/C# |

**Also detect:**
- Directory structure (src/, lib/, tests/, etc.)
- Existing README.md for project description
- Build/test/lint commands from config files
- CI/CD configuration (.github/workflows/, .gitlab-ci.yml)

### Step 2: Check for Existing CLAUDE.md

```bash
ls CLAUDE.md 2>/dev/null
```

- If exists: Ask user whether to overwrite, merge, or abort
- If not exists: Proceed with generation

### Step 3: Generate CLAUDE.md Content

Use the following template, filling in detected values where marked `[DETECTED]`:

```markdown
# CLAUDE.md

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
[DETECTED: Extract from README.md or describe based on structure]

## 4. Architecture

### Tech Stack
[DETECTED: List technologies found from config files]

### Key Directories
[DETECTED: Map directory structure]

## 5. Commands

### Operational Standards
- **Idempotency:** Commands must be runnable multiple times without side effects.
- **Parameters:** Prefer named flags (`--input`) over positional args.
- **Exit Codes:** Return `0` for success, non-zero for failure.

### Command List
[DETECTED: Extract from package.json scripts, pyproject.toml, Makefile, etc.]
- **Boot**: `[detected or placeholder]`
- **Test Suite**: `[detected or placeholder]`
- **Linting**: `[detected or placeholder]`

## 6. General Engineering Standards

### 6.1 Global Philosophy
- **KISS (Keep It Simple, Stupid):** Prioritize readability. Complexity is the enemy of reliability.
- **YAGNI (You Aren't Gonna Need It):** Solve the current problem exclusively; do not abstract for hypothetical futures.
- **DRY vs. AHA:** Avoid "Write Everything Twice," but prefer duplication over the wrong abstraction ("Avoid Hasty Abstractions").
- **SOLID:** Enforce Single Responsibility strictly.

### 6.2 Primitive Data Types
- **Strings:** Use interpolation/templates over concatenation. Treat as immutable. Explicitly handle UTF-8.
- **Numbers:** Avoid "Magic Numbers" (use named constants). Use integer/decimal types for currency/precision; avoid floating-point for money.
- **Booleans:** Name variables positively (e.g., `isEnabled` not `isNotDisabled`). Avoid "truthy/falsy" reliance; check explicitly.

### 6.3 Data Structures
- **Collections:** Prefer immutability (return new lists vs. mutate in place). Use vector operations (`map`, `filter`) over manual loops.
- **Maps/Objects:** Enforce consistent key casing. Use safe access methods (return default/null) rather than throwing on missing keys.
- **Depth:** Avoid deep nesting (>3 levels); refactor into models/classes if structure becomes too deep.

### 6.4 Control Flow
- **Guard Clauses:** Use early returns to handle edge cases immediately, flattening the "happy path."
- **Bounded Iteration:** Ensure loops have explicit exit conditions and safeguards (timeouts/max-counts).
- **Descriptive Naming:** Iterator variables must be descriptive (`for user in users`), not generic (`i`, `x`).

### 6.5 Error Handling
- **Fail Fast:** Validate inputs immediately. Crash/return early rather than propagating bad state.
- **Catch Specifics:** Catch specific exceptions (e.g., `FileNotFound`) rather than generic catch-alls.
- **Contextual Logging:** Log the *context* (state/inputs) alongside the error, not just the stack trace.
- **No Silent Failures:** No empty `try/catch` blocks.
- **Resource Cleanup:** Always use `finally` or `using/with` blocks for resource disposal.

## 7. Testing Strategy
- **The Pyramid:**
    1. **Unit:** Many fast, isolated tests (mock external deps).
    2. **Integration:** Moderate number, verifying module interactions.
    3. **E2E:** Few, high-value "happy path" tests.
- **Structure:** Use **Arrange-Act-Assert** pattern for all tests.
- **Data:** Use Factories to generate test data; avoid brittle static fixtures.

## 8. Logging & Observability
- **Structured Logging:** Use JSON/Key-Value pairs (e.g., `level=INFO user_id=123`) for aggregation.
- **Correlation IDs:** Pass unique IDs through the stack to trace requests.
- **Sanitization:** STRICTLY scrub PII and secrets from all logs.
- **Levels:**
    - `INFO`: Lifecycle events.
    - `WARN`: Handled unexpected events.
    - `ERROR`: Actionable failures.
```

### Step 4: Present to User for Review

Display the generated content and ask:

1. "Does the detected tech stack look correct?"
2. "Are there any project-specific boundaries or rules to add?"
3. "Should I adjust any section before saving?"

### Step 5: Write CLAUDE.md

After user confirmation:

```bash
# Write to project root
cat > CLAUDE.md << 'EOF'
[Generated content]
EOF
```

Confirm success:
```
CLAUDE.md created successfully.

Next steps:
1. Review and customize the generated file
2. Consider creating .claude/agents/ for specialized contexts
3. Run /init again anytime to regenerate
```

## Decision Points (Ask User)

| Situation | Question |
|-----------|----------|
| CLAUDE.md exists | "A CLAUDE.md already exists. Overwrite, merge, or abort?" |
| Tech stack unclear | "I detected [X]. Is this correct, or should I adjust?" |
| Missing commands | "I couldn't detect build/test commands. What commands should I document?" |
| Custom rules needed | "Are there project-specific rules or boundaries to add?" |

## Error Handling

- **Not a git repo**: Warn but proceed (CLAUDE.md works without git)
- **No config files found**: Generate minimal template, ask user to fill in details
- **Write permission denied**: Inform user and suggest running with appropriate permissions

## Example Usage

```
User: /init

Claude: Scanning project structure...

Detected:
  - Tech stack: Python 3.11 (pyproject.toml)
  - Package manager: uv
  - Test framework: pytest
  - Linter: ruff

Directory structure:
  - src/ - Source code
  - tests/ - Test suite
  - docs/ - Documentation

Commands found:
  - Test: `pytest`
  - Lint: `ruff check src/`

Generating CLAUDE.md...

[Shows preview of generated content]

Does this look correct? I can adjust any section before saving.

User: Looks good, but add that we use FastAPI

Claude: Updated Project Overview to include FastAPI.

Writing CLAUDE.md...

CLAUDE.md created successfully at project root.
```
