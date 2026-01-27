# Quick Start Guide

**Time needed:** 2 minutes
**Skill level:** No coding experience required

---

## The Fastest Way to Install

### Step 1: Add the Marketplace

In Claude Code, type:

```shell
/plugin marketplace add thomas-to/thomas-to-bcheme
```

### Step 2: Install Your Plugin

Choose one (or install all three):

```shell
/plugin install git-push@thomas-to-plugins
```

Or:
```shell
/plugin install git-push-agentic@thomas-to-plugins
```

Or:
```shell
/plugin install git-README@thomas-to-plugins
```

### Step 3: Try It

Type the command for your installed plugin:

| Plugin | Command | What It Does |
|--------|---------|--------------|
| git-push | `/git-push` | Interactive save and upload |
| git-push-agentic | `/git-push-agentic` | Automatic save and upload |
| git-README | `/git-README` | Generate documentation |

**Done!** Your plugin is ready to use.

---

## Want More Details?

- **Full native installation walkthrough:** [Claude Code Installation Guide](CLAUDE-CODE-INSTALLATION.md)
- **Alternative methods (manual, curl, git):** [Full Installation Guide](INSTALLATION-GUIDE.md)
- **Problems?** [Troubleshooting](TROUBLESHOOTING.md)

---

<details>
<summary>Alternative: Manual Installation (click to expand)</summary>

If your Claude Code doesn't support the `/plugin` command, you can install manually.

**Time needed:** 5 minutes

### Before You Begin

Make sure you have:
- [ ] Claude Code installed and working
- [ ] A project folder where you want to use these plugins
- [ ] Git installed on your computer

### Step 1: Download the Plugin Files

1. Go to: https://github.com/thomas-to/thomas-to-bcheme
2. Click the green **Code** button
3. Click **Download ZIP**
4. Find the downloaded file (usually in your Downloads folder)
5. Double-click to unzip it
6. Look inside for the `my_marketplace/plugins/` folder

### Step 2: Find Your Project Folder

Your project folder is where your code lives. It might be called something like:
- `my-website`
- `my-app`
- `awesome-project`

**On Mac:** Open Finder and navigate to your project
**On Windows:** Open File Explorer and navigate to your project

### Step 3: Create the Plugin Folder

Inside your project folder, create this folder structure:

```
your-project/
  .claude/
    plugins/
```

**Creating Hidden Folders**

The `.claude` folder starts with a dot, which makes it "hidden" on some computers.

**On Mac:**
1. Open Terminal (find it in Applications > Utilities)
2. Type: `cd ` (with a space after cd)
3. Drag your project folder into Terminal (this fills in the path)
4. Press Enter
5. Type: `mkdir -p .claude/plugins` and press Enter

**On Windows:**
1. Open Command Prompt (search "cmd" in Start menu)
2. Type: `cd ` (with a space after cd)
3. Type or paste your project folder path
4. Press Enter
5. Type: `mkdir .claude\plugins` and press Enter

**Alternative - Using Finder/File Explorer:**
- On Mac: Press `Cmd + Shift + .` in Finder to show hidden files, then create folders normally
- On Windows: Enable "Show hidden files" in View options, then create folders normally

### Step 4: Copy the Plugin

From the downloaded/unzipped files, find:
```
thomas-to-bcheme-main/
  my_marketplace/
    plugins/
      git-push/           <-- Copy this whole folder
```

Copy the `git-push` folder (or whichever plugin you want) into your project's `.claude/plugins/` folder.

Your project should now look like:
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
  (your other project files...)
```

### Step 5: Test It

1. Open Claude Code
2. Navigate to your project folder
3. Type: `/git-push`

**Success!** If Claude starts checking your git status, the plugin is working.

**Not working?** Check the [Troubleshooting Guide](TROUBLESHOOTING.md).

</details>

---

## Next Steps

- **Learn what each plugin does:** [git-push](plugins/git-push.md) | [git-push-agentic](plugins/git-push-agentic.md) | [git-README](plugins/git-README.md)
- **See all installation options:** [Full Installation Guide](INSTALLATION-GUIDE.md)
- **Having issues?** [Troubleshooting](TROUBLESHOOTING.md)
