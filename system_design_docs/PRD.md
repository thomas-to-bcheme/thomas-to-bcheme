# PRD: Marketplace Plugins for Specialized Agents

## 1. Executive Summary

Convert the 9 specialized agents in `.claude/agents/` into modular marketplace plugins following the `tto-agent-swe` template. This enables:
- Independent versioning and distribution
- Reusability across projects
- Clear tool permission boundaries (principle of least privilege)
- Standardized skill invocation via the `Skill` tool

## 2. Current State

### Existing Agents (`.claude/agents/`)

| Agent | Description | Tools |
|-------|-------------|-------|
| `orchestrator` | Lead orchestrator for code review, integration verification, architectural integrity | Read, Glob, Grep, Bash, Edit, Write |
| `frontend` | Frontend specialist for React/Next.js, Tailwind CSS, Vercel deployment | Read, Glob, Grep, Bash, Edit, Write |
| `backend` | Backend specialist for database schema, business logic, data lineage, ML integration | Read, Glob, Grep, Bash, Edit, Write |
| `api` | API specialist for REST endpoints, request/response structures, middleware | Read, Glob, Grep, Bash, Edit, Write |
| `ai-ml` | AI/ML specialist for LLM integration, RAG pipelines, vector DBs, ML training | Read, Glob, Grep, Bash, Edit, Write |
| `qa` | QA specialist for test strategy, automation, regression testing, quality gates | Read, Glob, Grep, Bash, Edit, Write |
| `uiux` | UI/UX design specialist for design systems, visual design, accessibility | Read, Glob, Grep, Bash, Edit, Write |
| `ops` | Infrastructure/DevOps specialist for CI/CD, deployment, containers, IaC | Read, Glob, Grep, Bash, Edit, Write |
| `linkedin` | LinkedIn post generator for technical project updates | Read, Glob, Grep, WebFetch, WebSearch, Write |

### Target Plugin Structure (from `tto-agent-swe`)

```
plugins/
└── {plugin-name}/
    ├── .claude-plugin/
    │   └── plugin.json          # Plugin metadata
    └── skills/
        └── {plugin-name}/
            └── SKILL.md         # Skill definition with YAML frontmatter
```

## 3. Requirements

### 3.1 Functional Requirements

**FR-1**: Each agent MUST be converted to a standalone marketplace plugin.

**FR-2**: Plugin `plugin.json` MUST follow this schema:
```json
{
  "name": "{agent-name}",
  "description": "{agent description}",
  "version": "1.0.0",
  "author": {
    "name": "Thomas To",
    "email": "thomas.to.bcheme@gmail.com"
  },
  "homepage": "https://github.com/thomas-to-bcheme/thomas-to-bcheme",
  "repository": "https://github.com/thomas-to-bcheme/thomas-to-bcheme",
  "license": "MIT",
  "keywords": ["{domain-specific}", "{keywords}"]
}
```

**FR-3**: Plugin `SKILL.md` MUST include:
- YAML frontmatter with `name`, `description`, `tools`
- Complete workflow documentation from the original agent
- All sub-agents, triggers, patterns, and checklists preserved

**FR-4**: Tool declarations MUST follow principle of least privilege:
- Read-only agents: `Read, Glob, Grep`
- Write-capable agents: Add `Edit, Write`
- Execution-capable agents: Add `Bash`
- Web-capable agents: Add `WebFetch, WebSearch`

### 3.2 Non-Functional Requirements

**NFR-1**: Plugin names MUST use kebab-case matching agent names.

**NFR-2**: Keywords MUST be domain-specific and searchable.

**NFR-3**: All plugins MUST reference the 5 Development Directives from CLAUDE.md.

## 4. Plugin Specifications

### 4.1 orchestrator

**Plugin Name**: `orchestrator`
**Keywords**: `code-review`, `integration`, `architecture`, `verification`, `coordination`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Review checklist (Definition of Done)
- Directive compliance verification
- Testing pyramid enforcement
- Sub-agents: Code Detective, Dependency Manager

---

### 4.2 frontend

**Plugin Name**: `frontend`
**Keywords**: `react`, `nextjs`, `tailwind`, `vercel`, `typescript`, `components`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Next.js App Router best practices
- Server vs Client component guidance
- Vercel deployment guidelines
- Performance optimization patterns
- TypeScript patterns and Tailwind v4 reference
- Sub-agents: Component Librarian, State Architect, A11y Auditor, Performance Auditor

---

### 4.3 backend

**Plugin Name**: `backend`
**Keywords**: `database`, `schema`, `python`, `ml`, `data-lineage`, `business-logic`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Schema-first development
- Stage 1 (Raw) vs Stage 3 (Parsed) data separation
- Repository pattern
- Sub-agents: Schema Sentinel, Query Optimizer, Data Sanitizer

---

### 4.4 api

**Plugin Name**: `api`
**Keywords**: `rest`, `endpoints`, `middleware`, `validation`, `http`, `serialization`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Contract stability (API versioning)
- Input validation with Zod/TypeScript
- HTTP status code standards
- Route -> Controller -> Service pattern
- Sub-agents: Security Warden, Docs Scribe, Integration Tester

---

### 4.5 ai-ml

**Plugin Name**: `ai-ml`
**Keywords**: `llm`, `rag`, `vector-db`, `ml-training`, `gemini`, `tensorflow`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- LLM integration patterns
- RAG pipeline management
- ML model training workflows
- Chain of Responsibility pattern
- Sub-agents: Context Retriever, Prompt Architect, Guardrail Sentry

---

### 4.6 qa

**Plugin Name**: `qa`
**Keywords**: `testing`, `automation`, `regression`, `coverage`, `quality-gates`, `tdd`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Test pyramid enforcement
- Arrange-Act-Assert pattern
- Data factories (no static fixtures)
- Given-When-Then BDD structure
- Sub-agents: Test Strategist, Regression Guardian, Performance Analyst, Bug Triager

---

### 4.7 uiux

**Plugin Name**: `uiux`
**Keywords**: `design-system`, `accessibility`, `wcag`, `design-tokens`, `atomic-design`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Design tokens (no hardcoding)
- Atomic design pattern
- WCAG 2.1 AA compliance
- Container/Presenter pattern
- Sub-agents: Token Manager, Accessibility Auditor, Layout Engineer, Motion Designer

---

### 4.8 ops

**Plugin Name**: `ops`
**Keywords**: `cicd`, `deployment`, `docker`, `github-actions`, `infrastructure`, `devops`
**Tools**: `Read, Glob, Grep, Bash, Edit, Write`

Key Features:
- Reproducible builds (pinned versions)
- Secrets management
- Idempotent commands
- Multi-stage Docker builds
- Sub-agents: Pipeline Architect, Build Optimizer, Security Scanner, Environment Manager

---

### 4.9 linkedin

**Plugin Name**: `linkedin`
**Keywords**: `content`, `social-media`, `technical-writing`, `job-search`, `networking`
**Tools**: `Read, Glob, Grep, WebFetch, WebSearch, Write`

Key Features:
- LinkedIn algorithm optimization (2026)
- Hook + Moving Forward + Community Impact + CTA structure
- Formatting rules (no emojis, line breaks, character limits)
- Reference citation format
- Output to `genAI/linkedin-posts/drafts/`

## 5. Implementation Steps

### Phase 1: Create Plugin Directory Structure

For each agent, create:
```bash
mkdir -p plugins/{agent-name}/.claude-plugin
mkdir -p plugins/{agent-name}/skills/{agent-name}
```

### Phase 2: Generate plugin.json Files

Create `plugins/{agent-name}/.claude-plugin/plugin.json` with:
- Name matching agent
- Description from agent frontmatter
- Standard author/homepage/repository/license
- Domain-specific keywords

### Phase 3: Convert Agent to SKILL.md

Transform `.claude/agents/{agent}.md` to `plugins/{agent-name}/skills/{agent-name}/SKILL.md`:
1. Preserve YAML frontmatter (`name`, `description`, `tools`)
2. Remove `model` field (not applicable to plugins)
3. Keep all content (triggers, patterns, sub-agents, checklists)

### Phase 4: Verify Plugin Loading

Test each plugin by invoking via the `Skill` tool:
```
/orchestrator
/frontend
/backend
/api
/ai-ml
/qa
/uiux
/ops
/linkedin
```

## 6. File Manifest

| Source | Destination |
|--------|-------------|
| `.claude/agents/orchestrator.md` | `plugins/orchestrator/skills/orchestrator/SKILL.md` |
| `.claude/agents/frontend.md` | `plugins/frontend/skills/frontend/SKILL.md` |
| `.claude/agents/backend.md` | `plugins/backend/skills/backend/SKILL.md` |
| `.claude/agents/api.md` | `plugins/api/skills/api/SKILL.md` |
| `.claude/agents/ai-ml.md` | `plugins/ai-ml/skills/ai-ml/SKILL.md` |
| `.claude/agents/qa.md` | `plugins/qa/skills/qa/SKILL.md` |
| `.claude/agents/uiux.md` | `plugins/uiux/skills/uiux/SKILL.md` |
| `.claude/agents/ops.md` | `plugins/ops/skills/ops/SKILL.md` |
| `.claude/agents/linkedin.md` | `plugins/linkedin/skills/linkedin/SKILL.md` |

## 7. Verification

- [ ] All 9 plugins created with correct directory structure
- [ ] All `plugin.json` files valid JSON with required fields
- [ ] All `SKILL.md` files have valid YAML frontmatter
- [ ] Tool declarations follow least privilege principle
- [ ] All content from original agents preserved
- [ ] Plugins invocable via `Skill` tool
- [ ] No hardcoded values (Directive #1)
