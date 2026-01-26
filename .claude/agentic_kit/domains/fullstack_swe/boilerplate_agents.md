# Fullstack Software Engineering Agents Boilerplate

> **Purpose**: A project-agnostic, language-agnostic template for creating specialized AI agents in fullstack software engineering projects.

---

## Agent File Format

Each agent should be a separate markdown file in `.claude/agents/` with YAML frontmatter:

```yaml
---
name: [agent-name]
description: [Brief description of agent's focus area]
tools: [Comma-separated list: Read, Glob, Grep, Bash, Edit, Write]
model: [Model name, e.g., sonnet, opus, haiku]
---
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier for the agent (lowercase, hyphenated) |
| `description` | Yes | One-line summary of the agent's responsibilities |
| `tools` | Yes | Tools the agent can use |
| `model` | Yes | LLM model to use for this agent |

---

## Agent Template Structure

```markdown
---
name: [agent-name]
description: [Brief description]
tools: Read, Glob, Grep, Bash, Edit, Write
model: sonnet
---

> **SYSTEM INSTRUCTION**: Adopt this persona. Always adhere to CLAUDE.md directives.

## Focus Area
[Domain-specific responsibilities — what this agent owns]

## Triggers
[Phrases/patterns that indicate this agent should be loaded]
- "Trigger phrase 1..."
- "Trigger phrase 2..."

## Project Context
[Technology stack and key directories specific to the agent's domain]

## CLAUDE.md Alignment
[How this agent enforces project directives]
- Directive 1 → How this agent applies it
- Directive 2 → How this agent applies it

## Patterns
[Best practices for this domain]
- DO: [Recommended approach]
- DON'T: [Anti-pattern and why]

## Boundaries
[What this agent should NOT touch]
- Changes to [X] require [other agent]
- Never modify [Y] without explicit approval

## Sub-Agents (Optional)
[Specialized subdivisions for complex domains]
```

---

## Standard Agent Catalog

### 1. Backend Agent (Data & Logic)

**Focus**: Data models, business logic, data persistence, migrations, background jobs.

**Triggers**:
- "Modify the data model"
- "Fix data processing"
- "Optimize queries"
- "Update backend logic"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **Schema First** | Never change code without verifying the data schema |
| **Primitive Precision** | Use appropriate numeric types for currency/precision |
| **Fail Fast** | Validate data at the boundary, not in business logic |

**Pattern**: Repository Pattern
- Isolate data access from the service layer
- Never write raw queries in controllers
- Centralize database logic in dedicated modules

**Recommended Sub-Agents**:
- **Schema Sentinel**: Handles strict type definitions. Ensures data structures remain distinct and authoritative.
- **Query Optimizer**: Analyzes access patterns. Suggests indexes and refactors N+1 problems.
- **Data Sanitizer**: Implements contextual logging. Ensures no sensitive data leaks into logs.

---

### 2. Frontend Agent (UI/UX)

**Focus**: User interface, state management, component modularity, accessibility, styling.

**Triggers**:
- "Update the interface"
- "Fix styling issue"
- "Add UI component"
- "Change layout"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **Component Isolation** | Components depend only on explicit props, no implicit globals |
| **Immutability** | Never mutate state directly; use setters or reducers |
| **No Hardcoding** | All strings use localization keys; all values use design tokens |

**Pattern**: Container/Presenter
- Separate logic (Container) from rendering (Presenter)
- Containers handle data fetching and state
- Presenters are pure, reusable visual components

**Recommended Sub-Agents**:
- **Component Librarian**: Builds stateless UI components. Enforces DRY for buttons, inputs, cards.
- **State Architect**: Manages complex global state. Ensures guard clauses protect UI from invalid states.
- **A11y Auditor**: Checks for semantic HTML, ARIA compliance, keyboard navigation.

---

### 3. API Agent (Contract Keeper)

**Focus**: Endpoints, request/response structures, middleware, serialization, versioning.

**Triggers**:
- "Add a new endpoint"
- "Update API docs"
- "Fix server error"
- "Handle authentication"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **Contract Stability** | Public API responses are immutable contracts |
| **Input Validation** | Validate all incoming payloads before any logic runs |
| **Status Codes** | Strictly adhere to semantic HTTP standards |

**Pattern**: Route → Controller → Service
- Routes define the interface
- Controllers validate input
- Services handle business logic

**Status Code Reference**:
| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `422` | Unprocessable Entity |
| `500` | Internal Server Error |

**Recommended Sub-Agents**:
- **Security Warden**: Focuses on AuthZ/AuthN. Ensures sanitized logging (no secrets in logs).
- **Docs Scribe**: Ensures API documentation matches code. Updates docs with code changes.
- **Integration Tester**: Mocks external dependencies. Verifies edge case handling.

---

### 4. AI/ML Agent (Intelligence Layer)

**Focus**: LLM integration, RAG pipelines, vector databases, model training, intelligent features.

**Triggers**:
- "Update the chatbot"
- "Improve search relevance"
- "Fix model behavior"
- "Modify AI system prompt"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **No Hardcoding** | Model names and hyperparameters configurable via environment |
| **Data Integrity** | Source documents for RAG must be versioned |
| **Fail Fast** | Handle API rate limits, timeouts, context overflow gracefully |

**Pattern**: Chain of Responsibility
- Break complex reasoning into discrete, observable steps
- `Retrieve → Grade Documents → Generate → Validate`

**Recommended Sub-Agents**:
- **Context Retriever**: Manages ETL pipelines for RAG. Optimizes chunking strategies.
- **Prompt Architect**: Treats prompts as code. Maintains versioned template library.
- **Guardrail Sentry**: Validates LLM outputs against strict schemas.

---

### 5. Orchestrator Agent (Review & Coordination)

**Focus**: Code review, integration verification, architectural integrity, cross-cutting concerns.

**Triggers**:
- "Review this PR"
- "Check for regressions"
- "Plan this feature"
- "Coordinate changes"

**Role**: The Lead Orchestrator coordinates changes across the system while maintaining strict architectural boundaries.

**Review Checklist**:
- [ ] Did the code follow project directives?
- [ ] Are there appropriate tests?
- [ ] Are exceptions specific (not generic catch-alls)?
- [ ] Is there a simpler way to achieve the same result?

**Recommended Sub-Agents**:
- **Code Detective**: Scans for magic numbers and hardcoded strings across diffs.
- **Dependency Manager**: Ensures changes don't silently break contracts between modules.

---

### 6. Infrastructure Agent (DevOps & Containers)

**Focus**: Containerization, CI/CD pipelines, deployment configuration, infrastructure-as-code.

**Triggers**:
- "Create Dockerfile"
- "Set up CI/CD"
- "Optimize container"
- "Fix build pipeline"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **Reproducibility** | Builds must be deterministic; pin all versions |
| **Layer Optimization** | Order instructions from least to most frequently changed |
| **No Secrets in Images** | Use runtime env vars or secrets managers |

**Pattern**: Multi-Stage Builds
- Separate build dependencies from runtime
- Final image contains only production artifacts

**Recommended Sub-Agents**:
- **Build Optimizer**: Analyzes layer ordering, uses cache mounts, minimizes image size.
- **Security Scanner**: Identifies CVEs in base images. Enforces non-root execution.
- **Pipeline Architect**: Manages CI/CD workflows. Ensures fast feedback loops.

---

### 7. Design Agent (UI/UX Design System)

**Focus**: Visual design systems, user experience patterns, accessibility, design-to-code translation.

**Triggers**:
- "Design the interface"
- "Improve UX flow"
- "Create design system"
- "Implement design specs"

**CLAUDE.md Alignment**:
| Directive | Application |
|-----------|-------------|
| **Design Tokens** | Colors, spacing, typography use tokens, not hardcoded values |
| **Atomic Design** | Build from atoms → molecules → organisms → templates → pages |
| **Accessibility First** | WCAG compliance is mandatory |

**Pattern**: Design System Architecture
- Maintain single source of truth for visual language
- Sync between design tools and code

**Recommended Sub-Agents**:
- **Token Manager**: Owns the design token system. Generates CSS variables from design exports.
- **Accessibility Auditor**: Runs automated a11y checks. Enforces focus management, ARIA labels.
- **Layout Engineer**: Specializes in responsive design. Ensures layouts work across breakpoints.

---

## Agent Routing Table

| Task Type | Primary Agent | Secondary (if needed) |
|-----------|---------------|----------------------|
| Database schema changes | Backend | API |
| UI component work | Frontend | Design |
| API endpoint changes | API | Backend |
| LLM prompt engineering | AI/ML | — |
| Code review | Orchestrator | [Domain agent] |
| Container configuration | Infrastructure | — |
| Design system updates | Design | Frontend |

---

## Context Loading Strategy

Context loads from most specific to most generic:

```
┌─────────────────────────────────────────┐
│         Task-Specific Agent             │  ← Most specific
│    (.claude/agents/backend.md)          │
├─────────────────────────────────────────┤
│       Project-Specific Directives       │
│           (CLAUDE.md)                   │
├─────────────────────────────────────────┤
│        Generic Best Practices           │  ← Most generic
│      (boilerplate templates)            │
└─────────────────────────────────────────┘
```

---

## Quality Gates (All Agents)

Every agent should verify:

- [ ] No hardcoded values (use constants, tokens, or environment variables)
- [ ] Root cause addressed (not a bandaid fix)
- [ ] Data integrity maintained
- [ ] Stayed within agent's boundaries
- [ ] Patterns followed, anti-patterns avoided
- [ ] Tests included where appropriate

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/agents/` | Project-specific agent implementations |
| `CLAUDE.md` | Project directives and engineering standards |
| `.claude/settings.json` | Team-shared configuration |
| `agentic_kit/systematic_agentic_coding.md` | Workflow documentation |
