---
name: implementation-plan
description: Generate a structured implementation plan for a feature
user-invocable: true
argument-hint: "[feature description]"
---

Based on the provided feature description, create a comprehensive implementation plan in a file called `coding-prompt.md`. This prompt will be sent to the coding agent to reliably build the entire feature end-to-end including tests.

## Output File Format

### Feature Description
Describe the feature and the problem it's solving.

### User Story
As a [type of user], I want [an action] so that [a benefit].

### Solution Approach
State the solution and why this approach was selected over alternatives.

### Required Reading
List of relevant files from the codebase the agent MUST read to understand existing patterns:
- `[file path]` - [why this file is relevant]

### Research References
List of relevant researched URLs:
- [Documentation Link](https://example.com/doc)
  - [Relevant anchor/section]
  - [Short summary of what's useful]

### Implementation Plan

**Foundational work needed:**
- [Item 1]
- [Item 2]

**Core implementation needed:**
- [Item 1]
- [Item 2]

**Integration work needed:**
- [Item 1]
- [Item 2]

### Step-by-Step Task List

For tool implementations:
1. Define Pydantic schemas in `schemas.py`
2. Implement tool with structured logging and type hints
3. Register tool with agent framework
4. Create unit tests in `tests/tools/<name>/test_<module>.py`
5. Add integration test in `tests/integration/` if needed

### Testing Strategy

See `CLAUDE.md` for complete testing requirements.

**Unit Tests:**
- [Test case 1]
- [Test case 2]

**Integration Tests:**
- [Test case 1]
- [Test case 2]

**End-to-End Tests:**
- [Test case 1]
- [Test case 2]

### Edge Cases
- [Edge case 1]
- [Edge case 2]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

### Validation Commands
List commands to validate with 100% confidence the feature is implemented correctly with zero regressions:
```bash
# Linting
npm run lint

# Type checking
tsc --noEmit

# Unit tests
npm test

# E2E validation
curl -X POST http://localhost:3000/api/endpoint
```

---

## Output Summary

When complete, provide:
- List of work done in concise bullets
- Link to the created `coding-prompt.md` file
