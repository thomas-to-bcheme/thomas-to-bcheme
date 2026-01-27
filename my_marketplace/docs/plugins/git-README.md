# git-README Plugin Guide

**What it does:** Analyzes your project and creates (or updates) a professional README.md file.

---

## When to Use This Plugin

Use `/git-README` when you:
- Start a new project and need documentation
- Have an outdated README that needs refreshing
- Want professional documentation without writing it yourself
- Need to document a project you inherited

---

## How It Works

When you type `/git-README`, Claude launches a team of 5 AI agents:

### Phase 1: Read Existing README
If you already have a README, Claude reads it first to understand what to preserve.

### Phase 2-4: Parallel Analysis (4 agents work simultaneously)

| Agent | Analyzes | Looks For |
|-------|----------|-----------|
| **Structure** | Project layout | Folders, entry points, tech stack, config files |
| **Features** | Functionality | Components, APIs, user features, integrations |
| **Setup** | Installation | Dependencies, env vars, build commands, prerequisites |
| **Testing** | Quality | Test frameworks, CI/CD, code quality, coverage |

### Phase 5: Review Coordinator (1 agent)
- Synthesizes all findings
- Compares with existing README
- Identifies gaps and outdated info
- Creates the final draft

### Phase 6: Smart Merge
Claude intelligently combines new content with your existing README.

---

## Example Session

```
You: /git-README

Claude:
Phase 1: Reading existing README... Found (234 lines)

Phase 2: Launching parallel analyzers...
  Agent 1 (Structure): Analyzing project layout...
  Agent 2 (Features): Identifying capabilities...
  Agent 3 (Setup): Finding installation requirements...
  Agent 4 (Testing): Checking test coverage...

Phase 3: Collecting results... All 4 agents complete

Phase 4: Launching Review Coordinator...

Phase 5: Reviewing draft against existing content...

Phase 6: Applying smart merge...

Phase 7: Complete!

README.md Update Summary:

PRESERVED (your custom content):
  - Acknowledgments section
  - Sponsor badges and links
  - Custom logo

ADDED (new sections):
  - Tech Stack table
  - Environment Variables reference
  - Project Structure tree

UPDATED (refreshed info):
  - Installation commands (npm -> pnpm)
  - Node.js version (18 -> 20)
  - API endpoint documentation
```

---

## What Gets Generated

Your README will include these sections (in order):

| Section | Description |
|---------|-------------|
| **Title & Description** | Project name with a brief tagline |
| **Badges** | Build status, version, license indicators |
| **Features** | Bulleted list of capabilities |
| **Tech Stack** | Table of technologies used |
| **Prerequisites** | Required software and versions |
| **Installation** | Step-by-step setup instructions |
| **Usage** | How to run and use the project |
| **Project Structure** | Folder tree with descriptions |
| **Configuration** | Environment variables and settings |
| **Testing** | How to run tests |
| **Contributing** | Guidelines for contributors |
| **License** | License information |

---

## Smart Merge: What Gets Preserved

If you have an existing README, Claude will **NOT overwrite**:

- Custom sections you've written
- External links and references
- Acknowledgments or sponsor information
- Your personal branding or logos
- Badges you've configured
- Screenshots or images

Claude **WILL update**:

- Version numbers (if they've changed)
- Commands (if package manager changed)
- Technical details (if code structure changed)
- Missing standard sections

---

## Tips for Best Results

**Before running:**

1. **Have a package.json** (or equivalent)
   - Claude reads this for dependencies and scripts

2. **Use an .env.example file**
   - Claude will document your environment variables

3. **Have test files**
   - Claude will include testing instructions

4. **Clean up obvious issues first**
   - Remove any sensitive data from code
   - Delete unused files

**After running:**

1. Review the generated README
2. Add any project-specific details Claude missed
3. Update screenshots if mentioned but not present
4. Commit the changes with `/git-push`

---

## Customizing the Output

If you want Claude to focus on specific areas or skip certain sections, tell it before running:

```
"Generate a README but skip the Contributing section -
this is a personal project"

/git-README
```

Or:

```
"Generate a README with extra focus on the API documentation"

/git-README
```

---

## Related Plugins

- **[git-push](git-push.md)** - Save your changes after updating README
- **[git-push-agentic](git-push-agentic.md)** - Quick push of the updated README
