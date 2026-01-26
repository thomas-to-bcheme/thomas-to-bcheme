# Claude Code Plugin Marketplace

Distributable Claude Code plugins hosted in this repository.

## Available Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [git-push](./plugins/git-push/) | 1.0.0 | Smart git push workflow - checks status, stages/commits if needed, then pushes |

---

## Installation

### Method 1: Git Submodule (Recommended)

```bash
# Navigate to your project root
cd your-project

# Add as submodule
git submodule add https://github.com/thomas-to/thomas-to-bcheme.git .claude/vendor/thomas-to

# Symlink the plugin you want
ln -s ../vendor/thomas-to/.claude-plugin/plugins/git-push .claude/plugins/git-push
```

**Update submodules:**
```bash
git submodule update --remote --merge
```

### Method 2: Direct Download (curl)

```bash
# Create plugin directory
mkdir -p .claude/plugins/git-push

# Download plugin files
curl -sL https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/.claude-plugin/plugins/git-push/plugin.json \
  -o .claude/plugins/git-push/plugin.json

curl -sL https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/.claude-plugin/plugins/git-push/SKILL.md \
  -o .claude/plugins/git-push/SKILL.md
```

### Method 3: Manual Copy

1. Clone this repository
2. Copy `.claude-plugin/plugins/git-push/` to your project's `.claude/plugins/`

---

## Usage

Once installed, invoke in Claude Code:

```
/git-push
```

The plugin handles:
1. Checking git status and branch tracking
2. Staging uncommitted changes (with approval)
3. Creating commits with Co-Authored-By footer
4. Pushing to remote

---

## Plugin Structure

```
.claude-plugin/
  README.md                    # This file
  plugins/
    git-push/
      plugin.json              # Plugin manifest
      SKILL.md                 # Skill workflow definition
```

### plugin.json Schema

```json
{
  "$schema": "https://claude.ai/code/plugin.schema.json",
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": "Author Name",
  "commands": [
    {
      "name": "command-name",
      "description": "Command description",
      "skillFile": "SKILL.md"
    }
  ],
  "permissions": {
    "allow": ["Bash(git *)"]
  }
}
```

---

## Contributing

1. Fork this repository
2. Create plugin in `.claude-plugin/plugins/your-plugin/`
3. Add `plugin.json` and `SKILL.md`
4. Update this README's "Available Plugins" table
5. Submit a pull request

---

## License

MIT License
