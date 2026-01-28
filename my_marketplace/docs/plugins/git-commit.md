# git-commit Plugin Guide

**Command:** `/git-commit`

**What it does:** Automatically stages all changes and creates a commit with an AI-generated message (does not push).

> **Installation:** See [Claude Code Installation Guide](../CLAUDE-CODE-INSTALLATION.md) for the quickest setup method.

---

## When to Use This Plugin

Use `/git-commit` when you want to:
- Save your work locally without pushing
- Let Claude decide the commit message
- Create a checkpoint before further changes
- Commit quickly without manual staging

---

## How It Works

When you type `/git-commit`, Claude automatically:

1. **Checks repository state** - Verifies you're in a git repo
2. **Stages everything** - All modified and new files (`git add -A`)
3. **Analyzes your changes** - Reads through what you changed
4. **Writes a commit message** - Based on what it sees
5. **Creates the commit** - Saves locally (no push)
6. **Confirms success** - Reports the commit SHA

**No push.** Your changes stay local until you're ready to share them.

---

## Example Session

```
You: /git-commit

Claude:
Checking repository... Branch: main (tracking origin/main)
Staging changes... 3 files modified, 1 file added
Analyzing diff...
Generating commit message...

Committed: "Add user authentication with JWT tokens"

Local commit abc1234 created on branch main
Ready to push when you are (use /git-push or /git-push-agentic)
```

---

## How Claude Writes Commit Messages

Claude analyzes your code changes and creates descriptive messages like:

- "Add user authentication with JWT tokens"
- "Fix null pointer exception in payment processing"
- "Update dependencies to latest versions"
- "Refactor database queries for performance"
- "Remove deprecated API endpoints"

**Message format:**
- Starts with a verb (Add, Fix, Update, Remove, Refactor)
- Describes what changed
- Under 72 characters
- Focuses on the "what" and "why"

---

## When NOT to Use This Plugin

Avoid `/git-commit` when:

| Situation | Why | Use Instead |
|-----------|-----|-------------|
| Sensitive files present | May commit secrets | Manual `git add` to select files |
| Need specific message format | Team conventions | Manual commit with your message |
| Partial commit needed | Only some files | Manual `git add` to select files |
| Want to push immediately | Need remote sync | `/git-push-agentic` |

---

## Safety Considerations

**This plugin stages EVERYTHING.** Before running, make sure:

- Your `.gitignore` file is properly configured
- No `.env` files with secrets are untracked
- No large files you don't want in git
- No node_modules or build artifacts

**Check your .gitignore includes:**
```
.env
.env.local
node_modules/
dist/
build/
*.log
```

---

## Comparison with Other Git Plugins

| Feature | /git-commit | /git-push | /git-push-agentic |
|---------|---------|-----------|-------------------|
| Stages files | Auto (all) | You choose | Auto (all) |
| Commit message | Auto-generated | You write | Auto-generated |
| Pushes to remote | No | Yes | Yes |
| Review step | None | Yes | None |
| Best for | Quick local saves | Full control | Quick remote sync |

---

## What Is "Co-Authored-By"?

Your commits will include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

This indicates Claude helped create the commit. It's standard practice for AI-assisted development.

---

## Related Plugins

- **[git-push](git-push.md)** - Interactive push with review step
- **[git-push-agentic](git-push-agentic.md)** - Auto-commit AND push in one command
- **[git-README](git-README.md)** - Generate project documentation
