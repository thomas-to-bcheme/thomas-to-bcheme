# git-push Plugin Guide

**What it does:** Helps you save and upload your code changes step by step, with full control over the process.

---

## When to Use This Plugin

Use `/git-push` when you want to:
- Review your changes before saving them
- Write your own commit message
- Choose which files to include
- Have control over what gets uploaded

---

## How It Works

When you type `/git-push`, Claude will:

1. **Check your changes**
   - Shows which files have been modified
   - Shows which files are new (untracked)
   - Shows the current branch

2. **Ask what to save**
   - You decide which files to include
   - Options: all files, specific files, or none

3. **Show you the changes**
   - Displays what changed in each file
   - You can review before committing

4. **Ask for a commit message**
   - You write a short description of your changes
   - Example: "Add login button to homepage"

5. **Upload to GitHub**
   - Pushes your changes to the remote repository
   - Sets up tracking branch if needed
   - Confirms when complete

---

## Example Session

```
You: /git-push

Claude: Checking git status...

Current branch: main (tracking origin/main)

Modified files:
  - src/App.js
  - src/styles.css

New files:
  - src/components/Button.js

Would you like me to stage these changes?
Options: all / specific files / none

You: all

Claude: All files staged. Here's what changed:

src/App.js: Added import for Button component
src/styles.css: Added button hover styles
src/components/Button.js: New file (45 lines)

Please provide a commit message:

You: Add new Button component with hover styles

Claude: Creating commit...

Commit created: "Add new Button component with hover styles"

Pushing to origin/main...

Success! Your changes have been pushed.
Latest commit: abc1234 Add new Button component with hover styles
```

---

## Decision Points

During the process, Claude may ask you:

| Question | When It Appears |
|----------|----------------|
| Which files to stage? | When you have uncommitted changes |
| Commit message? | Before creating the commit |
| Set upstream branch? | When pushing a new branch for the first time |
| Force push? | When remote has changes you don't have locally |

---

## Tips for Good Commit Messages

- **Start with a verb:** Add, Fix, Update, Remove, Refactor
- **Be specific:** "Fix login button on mobile" not "Fix bug"
- **Keep it short:** Under 72 characters ideally
- **Focus on why, not how:** The code shows how; the message explains why

**Good examples:**
- "Add user authentication with JWT tokens"
- "Fix null pointer exception in payment flow"
- "Update dependencies to patch security vulnerability"
- "Remove deprecated API endpoint"

---

## What Is "Co-Authored-By"?

Your commits will include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

This indicates Claude helped create the commit. It's a standard practice when AI assists with code and gives proper attribution.

---

## Comparison with git-push-agentic

| Feature | git-push | git-push-agentic |
|---------|----------|------------------|
| Review changes first | Yes | No |
| Write your own message | Yes | No (auto-generated) |
| Choose which files | Yes | No (all files) |
| Speed | Slower (interactive) | Faster (automatic) |
| Control | Full control | Hands-off |

**Use git-push when:** You want to review and control the process
**Use git-push-agentic when:** You trust Claude to handle everything

---

## Related Plugins

- **[git-push-agentic](git-push-agentic.md)** - Automatic commit and push
- **[git-README](git-README.md)** - Generate project documentation
