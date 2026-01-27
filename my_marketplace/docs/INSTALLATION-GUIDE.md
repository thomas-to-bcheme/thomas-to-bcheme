# Full Installation Guide

Choose your installation method based on your comfort level.

| Skill Level | Recommended Method | Time |
|-------------|-------------------|------|
| Beginner | [Download and Copy](#method-1-download-and-copy-beginner-friendly) | 10 min |
| Intermediate | [Terminal Commands](#method-2-terminal-commands-intermediate) | 5 min |
| Developer | [Git Submodule](#method-3-git-submodule-developer) | 3 min |

---

## Method 1: Download and Copy (Beginner-Friendly)

**Best for:** People who prefer clicking over typing commands
**Updates:** Manual (re-download when updates are available)

### 1.1 Download the Repository

1. Visit https://github.com/thomas-to/thomas-to-bcheme
2. Click the green **Code** button
3. Select **Download ZIP**
4. Unzip the downloaded file

### 1.2 Locate the Plugin Files

After downloading, find this folder:
```
thomas-to-bcheme-main/
  my_marketplace/
    plugins/
      git-push/          <-- Copy any of these
      git-push-agentic/
      git-README/
```

### 1.3 Create the Destination Folder

In YOUR project folder, create:
```
your-project/
  .claude/
    plugins/
```

**Mac Users:**
1. Open Finder
2. Press `Cmd + Shift + .` to show hidden files
3. Right-click > New Folder > name it `.claude`
4. Inside `.claude`, create a folder named `plugins`

**Windows Users:**
1. Open File Explorer in your project folder
2. Click in the address bar, type `.claude`, press Enter
3. Inside `.claude`, create a folder named `plugins`

### 1.4 Copy the Plugin

Drag the plugin folder(s) you want from the downloaded files into your `.claude/plugins/` folder.

**Final structure:**
```
your-project/
  .claude/
    plugins/
      git-push/
        .claude-plugin/
          plugin.json
        skills/
          git-push/
            SKILL.md
```

---

## Method 2: Terminal Commands (Intermediate)

**Best for:** Users comfortable with basic terminal/command line
**Updates:** Re-run the commands to update

### Install All Plugins at Once

Open terminal, navigate to your project, and run:

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

### Install Individual Plugins

**git-push only:**
```bash
PLUGIN="git-push" && \
mkdir -p ".claude/plugins/${PLUGIN}/.claude-plugin" ".claude/plugins/${PLUGIN}/skills/${PLUGIN}" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/.claude-plugin/plugin.json" \
  -o ".claude/plugins/${PLUGIN}/.claude-plugin/plugin.json" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" \
  -o ".claude/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" && \
echo "${PLUGIN} installed!"
```

**git-push-agentic only:**
```bash
PLUGIN="git-push-agentic" && \
mkdir -p ".claude/plugins/${PLUGIN}/.claude-plugin" ".claude/plugins/${PLUGIN}/skills/${PLUGIN}" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/.claude-plugin/plugin.json" \
  -o ".claude/plugins/${PLUGIN}/.claude-plugin/plugin.json" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" \
  -o ".claude/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" && \
echo "${PLUGIN} installed!"
```

**git-README only:**
```bash
PLUGIN="git-README" && \
mkdir -p ".claude/plugins/${PLUGIN}/.claude-plugin" ".claude/plugins/${PLUGIN}/skills/${PLUGIN}" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/.claude-plugin/plugin.json" \
  -o ".claude/plugins/${PLUGIN}/.claude-plugin/plugin.json" && \
curl -sL "https://raw.githubusercontent.com/thomas-to/thomas-to-bcheme/main/my_marketplace/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" \
  -o ".claude/plugins/${PLUGIN}/skills/${PLUGIN}/SKILL.md" && \
echo "${PLUGIN} installed!"
```

### Verify Installation

```bash
ls -la .claude/plugins/
```

---

## Method 3: Git Submodule (Developer)

**Best for:** Developers who want version control and automatic updates
**Updates:** Automatic with `git submodule update`

### Why Use This Method?
- Keeps plugins synced with the source repository
- Easy updates with one command
- Clean git history for your project
- Track exact plugin versions

### Initial Setup

```bash
# Navigate to your project
cd your-project

# Add the marketplace as a submodule
git submodule add https://github.com/thomas-to/thomas-to-bcheme.git .claude/vendor/thomas-to

# Create symlinks to the plugins you want
ln -s ../vendor/thomas-to/my_marketplace/plugins/git-push .claude/plugins/git-push
ln -s ../vendor/thomas-to/my_marketplace/plugins/git-push-agentic .claude/plugins/git-push-agentic
ln -s ../vendor/thomas-to/my_marketplace/plugins/git-README .claude/plugins/git-README

# Commit the submodule
git add .gitmodules .claude/
git commit -m "Add Claude Code plugins from thomas-to marketplace"
```

### Updating Plugins

When new plugin versions are released:
```bash
git submodule update --remote --merge
git add .claude/vendor/thomas-to
git commit -m "Update Claude Code plugins"
```

### Cloning a Project with Submodules

If you clone a project that uses this method:
```bash
# Clone with submodules included
git clone --recurse-submodules your-repo-url

# Or if already cloned without submodules:
git submodule init
git submodule update
```

---

## Verifying Installation

After any installation method:

1. Open Claude Code in your project
2. Type one of these commands:
   - `/git-push`
   - `/git-push-agentic`
   - `/git-README`
3. Claude should respond with the appropriate workflow

**If you see "Unknown command":** Check the [Troubleshooting Guide](TROUBLESHOOTING.md).

---

## Uninstalling

To remove a plugin, simply delete its folder:

```bash
rm -rf .claude/plugins/git-push
```

For submodule installations:
```bash
# Remove symlink
rm .claude/plugins/git-push

# If removing all plugins, also remove the submodule:
git submodule deinit .claude/vendor/thomas-to
git rm .claude/vendor/thomas-to
rm -rf .git/modules/.claude/vendor/thomas-to
```
