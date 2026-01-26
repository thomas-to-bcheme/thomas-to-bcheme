# Rules

This directory contains modular project instructions that extend `CLAUDE.md`.

## Purpose

Rules provide focused, single-concern instructions that can be:
- Enabled/disabled per session
- Shared across projects
- Version-controlled independently of main documentation

## File Format

Create `.md` files with YAML frontmatter:

```yaml
---
name: no-console-logs
description: Prevent console.log statements in production code
scope: typescript
---

When writing or reviewing TypeScript/JavaScript code:

1. Never add `console.log` statements to production code
2. Use the project's logging utility instead: `import { logger } from '@/lib/logger'`
3. If debugging is needed, use `logger.debug()` which is stripped in production builds
4. Exception: Test files may use console for debugging during development
```

## Example Rules

### `security-first.md`
Enforces security best practices: input validation, output encoding, etc.

### `accessibility.md`
Ensures WCAG 2.1 AA compliance in all UI components.

### `api-versioning.md`
Rules for backward-compatible API changes.

### `commit-conventions.md`
Enforces conventional commit message format.

## Rule Categories

Organize rules by category using prefixes:
- `security-*.md` - Security-related rules
- `style-*.md` - Code style and formatting
- `test-*.md` - Testing requirements
- `doc-*.md` - Documentation standards

## Usage

Reference rules in your prompt:
```
Apply the "security-first" and "accessibility" rules when implementing this feature.
```

Rules can also be auto-applied based on file patterns in `settings.json`:
```json
{
  "rules": {
    "src/components/**/*.tsx": ["accessibility", "no-console-logs"]
  }
}
```
