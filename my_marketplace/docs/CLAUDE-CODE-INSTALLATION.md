# Installing Plugins with Claude Code

**Time needed:** 2-3 minutes
**Skill level:** No coding experience required

---

## What You'll Learn

This guide shows you how to install plugins using Claude Code's built-in plugin system. This is the easiest and recommended method.

---

## Before You Begin

**Requirements:**
- Claude Code installed and running (version 1.0.33 or later)
- A project folder open in Claude Code
- Git installed (only needed for git-push plugins)

**Check your Claude Code version:**
```shell
claude --version
```

If you need to update, see [Claude Code Setup](https://docs.anthropic.com/en/docs/claude-code).

---

## Understanding the Plugin System

Claude Code has a built-in marketplace system. Here's how it works:

1. **Marketplaces** are collections of plugins (like an app store)
2. **Plugins** are individual tools you can install
3. You first add a marketplace, then install plugins from it

Think of it like:
- Marketplace = App Store
- Plugin = Individual App

---

## Step 1: Add the Marketplace

In Claude Code, type this command:

```shell
/plugin marketplace add thomas-to/thomas-to-bcheme
```

**What this does:**
- Registers this plugin collection with your Claude Code
- Downloads the plugin catalog
- Makes all plugins available for installation

**Expected output:**
```
Marketplace "thomas-to-plugins" added successfully.
```

---

## Step 2: Choose Your Plugin

| Plugin | Best For | What It Does |
|--------|----------|--------------|
| **git-push** | Users who want control | Guides you through each git step |
| **git-push-agentic** | Quick saves | Claude handles everything automatically |
| **git-README** | Documentation | Generates or updates your README.md |

**Recommendation for beginners:** Start with `git-push` - it explains each step as you go.

---

## Step 3: Install a Plugin

Type the install command for your chosen plugin:

```shell
/plugin install git-push@thomas-to-plugins
```

Or install a different one:
```shell
/plugin install git-push-agentic@thomas-to-plugins
```
```shell
/plugin install git-README@thomas-to-plugins
```

---

## Step 4: Choose Installation Scope

Claude Code will ask where to install the plugin:

| Scope | What It Means | Best For |
|-------|---------------|----------|
| **User** | Available in all your projects | Personal tools you use everywhere |
| **Project** | Shared with your team | Team-wide plugins (saved in `.claude/settings.json`) |
| **Local** | Just for you, just this project | Testing or personal preference |

**Recommendation:** Choose **User** for personal use, **Project** for team projects.

---

## Step 5: Verify Installation

Type `/plugin` to open the plugin manager:

1. Press **Tab** to navigate to the **Installed** tab
2. You should see your installed plugin listed
3. The status should show as active

---

## Step 6: Use Your Plugin

Now you can use your plugin. Type the command:

```shell
/git-push
```

Or for other plugins:
```shell
/git-push-agentic
```
```shell
/git-README
```

---

## Installing All Plugins at Once

Want all three plugins? Run these commands in sequence:

```shell
/plugin marketplace add thomas-to/thomas-to-bcheme
/plugin install git-push@thomas-to-plugins
/plugin install git-push-agentic@thomas-to-plugins
/plugin install git-README@thomas-to-plugins
```

---

## Using the Interactive UI

Instead of typing commands, you can use Claude Code's visual interface:

1. Type `/plugin` (with no arguments)
2. A tabbed interface appears with four tabs:
   - **Discover**: Browse available plugins
   - **Installed**: Manage your installed plugins
   - **Marketplaces**: Manage connected marketplaces
   - **Errors**: View any issues
3. Navigate with **Tab** / **Shift+Tab**
4. Use arrow keys to select items
5. Press **Enter** to install or manage

---

## Updating Plugins

To get the latest version of your plugins:

1. Open `/plugin`
2. Go to **Installed** tab
3. Select the plugin
4. Choose **Update** if available

Or enable auto-updates:
1. Open `/plugin`
2. Go to **Marketplaces** tab
3. Select the marketplace
4. Enable **Auto-update**

---

## Uninstalling Plugins

To remove a plugin:

```shell
/plugin uninstall git-push@thomas-to-plugins
```

Or use the interactive UI:
1. Open `/plugin`
2. Go to **Installed** tab
3. Select the plugin
4. Choose **Uninstall**

---

## Removing the Marketplace

If you no longer want access to this plugin collection:

```shell
/plugin marketplace remove thomas-to-plugins
```

**Note:** This will also uninstall any plugins you installed from this marketplace.

---

## Troubleshooting

### "Unknown command: /plugin"

**Cause:** Your Claude Code version is too old.

**Solution:**
1. Check version: `claude --version`
2. Update Claude Code if below version 1.0.33

### "Marketplace not found"

**Cause:** The repository URL might be incorrect.

**Solution:** Use the exact URL:
```shell
/plugin marketplace add thomas-to/thomas-to-bcheme
```

### "Plugin not found"

**Cause:** The marketplace hasn't been added yet.

**Solution:** First add the marketplace, then install the plugin:
```shell
/plugin marketplace add thomas-to/thomas-to-bcheme
/plugin install git-push@thomas-to-plugins
```

### Plugin installed but command doesn't work

**Cause:** Plugin may need Claude Code to restart.

**Solution:**
1. Close Claude Code
2. Reopen Claude Code
3. Try the command again

For more issues, see the [Full Troubleshooting Guide](TROUBLESHOOTING.md).

---

## Comparison with Other Methods

| Method | Commands Needed | Updates | Best For |
|--------|-----------------|---------|----------|
| **Native (this guide)** | 2 | Automatic | Everyone (recommended) |
| Manual curl | 1 (long command) | Re-run command | Environments without plugin support |
| Download & Copy | None (GUI) | Re-download | Offline installation |
| Git Submodule | 3-4 | `git submodule update` | Developers tracking versions |

---

## Next Steps

- **Learn what each plugin does:** [git-push](plugins/git-push.md) | [git-push-agentic](plugins/git-push-agentic.md) | [git-README](plugins/git-README.md)
- **Having problems?** [Full Troubleshooting Guide](TROUBLESHOOTING.md)
- **Prefer manual installation?** [Alternative Methods](INSTALLATION-GUIDE.md)
