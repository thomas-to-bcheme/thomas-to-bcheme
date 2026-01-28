# tto-agent-swe Plugin Guide

**Command:** `/tto-agent-swe`

**What it does:** Intelligent router and coordinator for software engineering tasks. Analyzes your request and routes it to the appropriate specialized agent(s) from the project's agent ecosystem.

> **Installation:** See [Claude Code Installation Guide](../CLAUDE-CODE-INSTALLATION.md)

---

## When to Use This Plugin

Use `/tto-agent-swe` when you:
- Have a general software engineering task and are unsure which agent to use
- Need to coordinate work across multiple domains (frontend + backend, etc.)
- Want intelligent task routing based on the project's agent patterns
- Need the agent ecosystem to work together on a complex feature

---

## How It Works

1. **Displays Development Directives** - Shows the 5 immutable principles from CLAUDE.md
2. **Analyzes your request** to determine:
   - Task type (feature, bug fix, refactoring, etc.)
   - Domains involved (frontend, backend, API, QA, etc.)
   - Complexity (single-agent vs. multi-agent)
3. **Routes to the appropriate agent(s)**:
   - Single-domain tasks → Direct delegation
   - Multi-domain tasks → Parallel coordination
4. **Coordinates handoffs** when tasks span multiple agents
5. **Verifies quality gates** before completion

---

## Available Agents

| Agent | Focus Area | Example Triggers |
|-------|------------|------------------|
| frontend | React, Next.js, UI, Tailwind | "Fix CSS", "Add component", "Update layout" |
| backend | Python, ML, Data models | "Update backend", "Fix data processing" |
| api | REST endpoints, Auth, Middleware | "Add endpoint", "Fix 500 error" |
| ai-ml | LLM integration, RAG, Gemini | "Update chatbot", "Modify AI prompt" |
| qa | Testing, Coverage, Quality | "Write tests", "Check coverage" |
| ops | CI/CD, Deployment, GitHub Actions | "Set up CI/CD", "Fix pipeline" |
| uiux | Design system, Accessibility | "Improve UX", "Design interface" |
| orchestrator | Code review, Architecture | "Review PR", "Plan feature" |

---

## Routing Table

| Task Type | Primary Agent | Secondary |
|-----------|---------------|-----------|
| Database schema | backend | api |
| UI components | frontend | uiux |
| API endpoints | api | backend |
| LLM prompts | ai-ml | — |
| Code review | orchestrator | domain agent |
| Deployment | ops | — |
| Design system | uiux | frontend |
| Testing | qa | domain agent |

---

## Example Sessions

### Simple Task (Single Agent)

```
User: /tto-agent-swe Fix the hover animation on the dashboard cards

Claude:
- Displays 5 Development Directives
- Task Type: Bug Fix
- Domain: Frontend
- Routes to: frontend.md
- Applies CSS fix using Tailwind patterns
- Verifies quality gates
```

### Complex Task (Multi-Agent)

```
User: /tto-agent-swe Add a new salary prediction endpoint that the frontend can call

Claude:
- Displays 5 Development Directives
- Task Type: Feature Implementation
- Domains: Backend + API + Frontend
- Coordinates:
  1. backend.md → Verify ML model integration
  2. api.md → Create endpoint with validation
  3. frontend.md → Add fetch call to dashboard
  4. qa.md → Add integration tests
```

---

## Quality Gates

Before completion, the meta-agent verifies:
- No hardcoded values
- Root cause addressed (not bandaid)
- Data integrity maintained
- Stayed within agent boundaries
- Patterns followed
- Tests included where appropriate

---

## Related Plugins

- **[git-push](git-push.md)** - Commit and push changes
- **[git-README](git-README.md)** - Generate documentation
- **[tto-init](tto-init.md)** - Initialize project standards
