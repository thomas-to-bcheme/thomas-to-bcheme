# Output Styles

This directory contains output format templates for Claude Code responses.

## Purpose

Output styles define how Claude Code formats its responses for specific use cases. They can control:
- Response structure (headers, sections)
- Formatting (markdown, code blocks)
- Verbosity level
- Inclusion of specific elements (examples, references)

## File Format

Create `.md` files with YAML frontmatter:

```yaml
---
name: concise
description: Brief, focused responses without verbose explanations
---

When responding, follow these guidelines:

1. Keep responses under 200 words
2. Use bullet points for lists
3. Skip pleasantries and get to the point
4. Include only essential code, not explanations
```

## Example Styles

### `detailed.md`
For comprehensive explanations with examples, trade-offs, and references.

### `code-only.md`
Outputs only code with minimal prose. Useful for rapid iteration.

### `review.md`
Structured format for code reviews with severity levels and line references.

## Usage

Reference an output style in your prompt:
```
Using the "concise" output style, explain how to...
```

Or configure as a default in `settings.json`:
```json
{
  "outputStyle": "concise"
}
```
