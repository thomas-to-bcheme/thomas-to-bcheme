# Claude Code Plugin Marketplace

Distributable Claude Code plugins hosted in this repository.

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [git-push](./plugins/git-push/) | 1.0.0 | Interactive git push with manual commit messages - prompts for staging and commit message before pushing |
| [git-push-agentic](./plugins/git-push-agentic/) | 1.0.0 | Autonomous git workflow - Claude handles add, commit message generation, and push automatically |
| [git-README](./plugins/git-README/) | 1.0.0 | 5-agent README generator with smart merge - 4 parallel analyzers + review coordinator |

---

## Installation

Replace `<PLUGIN_NAME>` with the plugin you want to install (e.g., `git-push` or `git-push-agentic`).

### Method 1: Git Submodule (Recommended)

```bash
# Navigate to your project root
cd your-project

# Add as submodule
git submodule add https://github.com/thomas-to/thomas-to-bcheme.git .claude/vendor/thomas-to

# Symlink the plugin you want
ln -s ../vendor/thomas-to/.claude-plugin/plugins/<PLUGIN_NAME> .claude/plugins/<PLUGIN_NAME>
```

**Update submodules:**
```bash
git submodule update --remote --merge
```

### Method 2: Direct Download (curl)

```bash
# Set the plugin name
PLUGIN_NAME="git-push"  # or "git-push-agentic" or "git-README"

# Create plugin directories
mkdir -p .claude/plugins/${PLUGIN_NAME}/.claude-plugin
mkdir -p .claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}

# Download plugin manifest
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/.claude-plugin/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json" \
  -o ".claude/plugins/${PLUGIN_NAME}/.claude-plugin/plugin.json"

# Download skill definition
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/.claude-plugin/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md" \
  -o ".claude/plugins/${PLUGIN_NAME}/skills/${PLUGIN_NAME}/SKILL.md"
```

### Method 3: Manual Copy

1. Clone this repository
2. Copy `.claude-plugin/plugins/<PLUGIN_NAME>/` to your project's `.claude/plugins/`

---

## Usage

Once installed, invoke plugins in Claude Code:

### git-push (Interactive)
```
/git-push
```
Prompts you for:
1. Reviewing git status and staged changes
2. Approving files to stage
3. **Entering your own commit message**
4. Pushing to remote

### git-push-agentic (Autonomous)
```
/git-push-agentic
```
Claude automatically:
1. Stages all changes (`git add .`)
2. **Generates commit message** by analyzing the diff
3. Commits and pushes to remote

### git-README (Documentation Generator)
```
/git-README
```
Claude launches 5 subagents:
1. **4 Parallel Analyzers**: Project structure, features, setup, testing/CI
2. **1 Review Coordinator**: Synthesizes findings into README draft
3. **Smart Merge**: Preserves custom content while updating standard sections

The git-push plugins add a `Co-Authored-By: Claude` footer to commits.

---

## Plugin Structure

```
.claude-plugin/
  marketplace.json               # Plugin registry manifest
  README.md                      # This file
  plugins/
    git-push/
      .claude-plugin/
        plugin.json              # Plugin manifest
      skills/
        git-push/
          SKILL.md               # Skill workflow definition
    git-push-agentic/
      .claude-plugin/
        plugin.json              # Plugin manifest
      skills/
        git-push-agentic/
          SKILL.md               # Skill workflow definition
    git-README/
      .claude-plugin/
        plugin.json              # Plugin manifest
      skills/
        git-README/
          SKILL.md               # 5-agent workflow definition
```

### marketplace.json Schema

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Owner Name"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-name",
      "description": "What this plugin does",
      "version": "1.0.0",
      "author": { "name": "Author Name" },
      "license": "MIT",
      "keywords": ["keyword1", "keyword2"],
      "category": "category-name"
    }
  ]
}
```

### plugin.json Schema

```json
{
  "name": "plugin-name",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  }
}
```

**Note:** Only include `name`, `description`, `version`, and `author` (as object). Do NOT include `$schema`, `commands`, or `permissions` - these are not valid fields. Skills are auto-discovered from `skills/*/SKILL.md` files.

---

## Contributing

1. Fork this repository
2. Create plugin directory: `.claude-plugin/plugins/your-plugin/`
3. Add `.claude-plugin/plugin.json` manifest
4. Add `skills/your-command/SKILL.md` skill definition
5. Register plugin in `marketplace.json`
6. Update this README's "Available Plugins" table
7. Submit a pull request

---

## License

MIT License
