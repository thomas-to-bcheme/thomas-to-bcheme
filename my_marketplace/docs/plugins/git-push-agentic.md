# git-push-agentic Plugin Guide

**Command:** `/git-push-agentic`

**What it does:** Automatically saves and uploads all your changes without asking questions.

> **Installation:** See [Claude Code Installation Guide](../CLAUDE-CODE-INSTALLATION.md) for the quickest setup method.

---

## When to Use This Plugin

Use `/git-push-agentic` when you want to:
- Quickly save your work
- Let Claude decide the commit message
- Skip the review process
- Get changes pushed fast

---

## How It Works

When you type `/git-push-agentic`, Claude automatically:

1. **Checks repository state** - Verifies you're in a git repo
2. **Stages everything** - All modified and new files (`git add -A`)
3. **Analyzes your changes** - Reads through what you changed
4. **Writes a commit message** - Based on what it sees
5. **Pushes to remote** - Uploads immediately
6. **Confirms success** - Reports the pushed commit

**No questions asked.** Fast and efficient.

---

## Example Session

```
You: /git-push-agentic

Claude:
Checking repository... Branch: main (tracking origin/main)
Staging changes... 3 files modified, 1 file added
Analyzing diff...
Generating commit message...

Commit: "Add user authentication with JWT tokens"

Pushing to origin/main...

Success! Pushed commit abc1234 to origin/main
```

Total time: A few seconds.

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

Avoid `/git-push-agentic` when:

| Situation | Why | Use Instead |
|-----------|-----|-------------|
| Sensitive files present | May commit secrets | `/git-push` to review |
| Need specific message format | Team conventions | `/git-push` for manual message |
| Want to review changes | Quality control | `/git-push` for review step |
| Partial commit needed | Only some files | `/git-push` to select files |

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

## Comparison with git-push

| Feature | git-push-agentic | git-push |
|---------|------------------|----------|
| Speed | Fast (automatic) | Slower (interactive) |
| Control | Hands-off | Full control |
| File selection | All files | You choose |
| Commit message | Auto-generated | You write it |
| Review step | None | Yes |

**Quick rule:**
- Trust Claude? Use `/git-push-agentic`
- Want control? Use `/git-push`

---

## What Is "Co-Authored-By"?

Your commits will include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

This indicates Claude helped create the commit. It's standard practice for AI-assisted development.

---

## Related Plugins

- **[git-push](git-push.md)** - Interactive version with more control
- **[git-README](git-README.md)** - Generate project documentation
