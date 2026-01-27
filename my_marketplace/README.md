# Claude Code Plugin Marketplace

**Make your Claude Code smarter with simple git workflows.**

## What Are These Plugins?

Plugins add new commands to Claude Code. Instead of typing complex git commands, you just type `/git-push` and Claude handles the rest.

| Plugin | What It Does | Best For |
|--------|-------------|----------|
| **[git-push](./plugins/git-push/)** | Guides you through saving and uploading code | Users who want control over their commits |
| **[git-push-agentic](./plugins/git-push-agentic/)** | Claude does everything automatically | Quick saves when you trust Claude |
| **[git-README](./plugins/git-README/)** | Creates or updates your README.md | Projects that need documentation |

---

## Get Started

**New to this?** Start with our [Quick Start Guide](docs/QUICK-START.md) (5 minutes, no coding required)

**Want all options?** See the [Full Installation Guide](docs/INSTALLATION-GUIDE.md)

**Having problems?** Check [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## Quick Install (One Command)

Already comfortable with terminal? Run this in your project folder:

```bash
mkdir -p .claude/plugins && \
for plugin in git-push git-push-agentic git-README; do \
  mkdir -p ".claude/plugins/${plugin}/.claude-plugin" \
  ".claude/plugins/${plugin}/skills/${plugin}" && \
  curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${plugin}/.claude-plugin/plugin.json" \
    -o ".claude/plugins/${plugin}/.claude-plugin/plugin.json" && \
  curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${plugin}/skills/${plugin}/SKILL.md" \
    -o ".claude/plugins/${plugin}/skills/${plugin}/SKILL.md"; \
done && echo "All plugins installed!"
```

---

## Using the Plugins

Once installed, open Claude Code in your project and type:

| Command | What Happens |
|---------|--------------|
| `/git-push` | Claude walks you through each step of saving your work |
| `/git-push-agentic` | Claude automatically saves and uploads your changes |
| `/git-README` | Claude analyzes your project and writes documentation |

**Learn more:** [git-push guide](docs/plugins/git-push.md) | [git-push-agentic guide](docs/plugins/git-push-agentic.md) | [git-README guide](docs/plugins/git-README.md)

---

## Requirements

- Claude Code installed on your computer
- A project folder with git initialized
- Git installed ([download here](https://git-scm.com/))

---

## For Developers

### Plugin Structure

```
my_marketplace/
  plugins/
    git-push/
      .claude-plugin/
        plugin.json           # Plugin metadata
      skills/
        git-push/
          SKILL.md            # Skill workflow
```

### Contributing

1. Create plugin directory: `plugins/your-plugin/`
2. Add `.claude-plugin/plugin.json` manifest
3. Add `skills/your-command/SKILL.md` skill definition
4. Register in `marketplace.json`
5. Submit a pull request

### Schema Reference

See [marketplace.json](./.claude-plugin/marketplace.json) for the registry format and any plugin's `plugin.json` for the manifest format.

---

## License

MIT License - Free to use and share
