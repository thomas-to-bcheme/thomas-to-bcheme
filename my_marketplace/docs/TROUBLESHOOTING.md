# Troubleshooting Guide

Common problems and their solutions.

---

## Native Plugin System Issues

If you're using Claude Code's `/plugin` commands, check these first.

### /plugin Command Not Recognized

**Symptom:** Typing `/plugin` shows "unknown command" or doesn't work.

**Cause:** Claude Code version is too old.

**Solution:**
1. Check your version: `claude --version`
2. Update Claude Code if below version 1.0.33
   - **Homebrew:** `brew upgrade claude-code`
   - **npm:** `npm update -g @anthropic-ai/claude-code`
3. Restart Claude Code after updating

---

### Marketplace Not Found

**Symptom:** Error when running `/plugin marketplace add thomas-to/thomas-to-bcheme`

**Possible causes:**

1. **Typo in repository name**
   - Use exact spelling: `thomas-to/thomas-to-bcheme`

2. **Network connectivity**
   - Check internet connection
   - Verify GitHub is accessible: `curl -I https://github.com`

3. **Repository access**
   - The repository must be public
   - Try opening https://github.com/thomas-to/thomas-to-bcheme in a browser

---

### Plugin Install Fails

**Symptom:** `/plugin install git-push@thomas-to-plugins` shows an error.

**Possible causes:**

1. **Marketplace not added yet**
   - First run: `/plugin marketplace add thomas-to/thomas-to-bcheme`
   - Then try install again

2. **Wrong marketplace name**
   - The marketplace name is `thomas-to-plugins` (not the repo name)
   - Full format: `plugin-name@marketplace-name`

3. **Plugin name typo**
   - Available plugins: `git-push`, `git-push-agentic`, `git-README`
   - Names are case-sensitive

---

### Plugin Installed But Command Not Working

**Symptom:** Plugin shows in "Installed" tab but `/git-push` doesn't work.

**Solutions:**

1. **Restart Claude Code**
   - Close and reopen Claude Code
   - Try the command again

2. **Check the Errors tab**
   - Run `/plugin` and go to the **Errors** tab
   - Look for any loading errors

3. **Clear plugin cache**
   ```bash
   rm -rf ~/.claude/plugins/cache
   ```
   Then restart Claude Code and reinstall the plugin

4. **Verify scope**
   - Open `/plugin` → **Installed** tab
   - Check the plugin is installed for the correct scope

---

### Interactive UI Not Appearing

**Symptom:** Typing `/plugin` doesn't open the visual interface.

**Solutions:**

1. **Terminal compatibility**
   - Some terminals may not support the TUI
   - Try using a different terminal app

2. **Use direct commands instead**
   - `/plugin install plugin-name@marketplace-name`
   - `/plugin uninstall plugin-name@marketplace-name`
   - `/plugin marketplace list`

---

### Cannot Remove Marketplace

**Symptom:** Error when running `/plugin marketplace remove thomas-to-plugins`

**Solution:**
1. First uninstall all plugins from that marketplace
2. Then remove the marketplace

---

## Manual Installation Issues

If you're using manual file copying or curl commands, check these.

---

## Command Not Recognized

**Symptom:** You type `/git-push` but Claude says it doesn't recognize the command.

### Check 1: Verify folder structure

Your files must be in the exact right place:
```
your-project/
  .claude/
    plugins/
      git-push/                     <-- Folder name must match exactly
        .claude-plugin/             <-- Note the dot at the start
          plugin.json               <-- This file must exist
        skills/
          git-push/                 <-- Same name as the plugin
            SKILL.md                <-- Must be SKILL.md (all caps)
```

**Common mistakes:**
- Missing the dot in `.claude-plugin/`
- Wrong capitalization (`skill.md` instead of `SKILL.md`)
- Extra nested folders
- Plugin folder in wrong location

### Check 2: Confirm you're in the right directory

Claude Code must be opened in the folder containing `.claude/plugins/`.

**How to check:**
1. In Claude Code, run: `pwd` (shows current directory)
2. Then run: `ls -la .claude/plugins/`
3. You should see your plugin folders listed

### Check 3: Restart Claude Code

Sometimes Claude Code needs a restart to detect new plugins.

### Check 4: Re-download the plugin

Files might be corrupted. Delete the plugin folder and reinstall.

---

## Hidden Folders Not Visible

**Symptom:** You can't see or create the `.claude` folder.

### Mac Solution

1. Open Finder
2. Press `Cmd + Shift + .` (that's Command, Shift, and period)
3. Hidden files now appear (they look slightly faded)
4. Press the same keys again to hide them

### Windows Solution

1. Open File Explorer
2. Click the **View** tab at the top
3. Check the box for **Hidden items**
4. You can now see folders starting with `.`

---

## Permission Denied

**Symptom:** Error message about permissions when creating folders or files.

### Mac Solution

Open Terminal and run:
```bash
chmod -R u+w .claude/
```

If that doesn't work:
```bash
sudo chmod -R u+w .claude/
```
(Enter your computer password when prompted)

### Windows Solution

1. Right-click the `.claude` folder
2. Click **Properties**
3. Go to the **Security** tab
4. Click **Edit**
5. Select your username
6. Check **Full Control** under Allow
7. Click **OK** twice

---

## Git Commands Fail Inside Plugin

**Symptom:** The plugin runs but git operations fail.

### Cause 1: Not a git repository

Your project folder needs to be a git repository.

**Solution:**
```bash
cd your-project
git init
```

### Cause 2: No remote repository configured

The push plugins need somewhere to push to.

**Solution:**
```bash
git remote add origin https://github.com/your-username/your-repo.git
```

### Cause 3: Git not installed

**Check:**
```bash
git --version
```

**Solution:** Install git from https://git-scm.com/

### Cause 4: Not logged into GitHub

**Solution:**
```bash
gh auth login
```
Or configure git credentials manually.

---

## Symlinks Not Working (Windows)

**Symptom:** Using the submodule method, but symlinks don't work.

**Cause:** Windows requires special permissions for symlinks.

### Solution 1: Run as Administrator

Open Command Prompt as Administrator, then create symlinks.

### Solution 2: Enable Developer Mode

1. Open Settings > Update & Security > For developers
2. Enable **Developer Mode**
3. Symlinks should now work

### Solution 3: Copy instead of symlink

Instead of symlinks, copy the folders:
```cmd
xcopy /E /I .claude\vendor\thomas-to\my_marketplace\plugins\git-push .claude\plugins\git-push
```

---

## Plugin Works But Commits Have Issues

### Problem: Commit message has weird characters

**Cause:** Old version of git

**Solution:** Update git to version 2.30 or later
```bash
git --version  # Check current version
```
Download latest from https://git-scm.com/

### Problem: Co-Authored-By line not showing

This is normal if you're using an older Git client to view commits. The line is there in the commit message.

---

## curl Command Fails

**Symptom:** Error when running the curl installation commands.

### Check 1: curl is installed

```bash
curl --version
```

If not installed:
- **Mac:** curl comes pre-installed
- **Windows:** Install from https://curl.se/windows/ or use Git Bash

### Check 2: Internet connection

Try:
```bash
curl -I https://github.com
```

### Check 3: URL is correct

Make sure you're using the exact commands from the installation guide - a single typo will cause failure.

---

## Plugin Files Look Empty or Wrong

**Symptom:** Downloaded files exist but contain HTML or error messages.

**Cause:** GitHub returned an error page instead of the raw file.

**Solution:**
1. Delete the plugin folder
2. Make sure you're using URLs starting with `raw.githubusercontent.com`
3. Re-run the curl commands

---

## Still Having Problems?

### Diagnostic checklist

1. **Verify plugin.json exists and is valid JSON:**
   ```bash
   cat .claude/plugins/git-push/.claude-plugin/plugin.json
   ```
   Should show JSON starting with `{`

2. **Verify SKILL.md exists:**
   ```bash
   cat .claude/plugins/git-push/skills/git-push/SKILL.md
   ```
   Should show markdown content

3. **Check for typos** - folder names are case-sensitive on Mac/Linux

4. **Try a fresh install:**
   ```bash
   rm -rf .claude/plugins/git-push
   # Then reinstall using the installation guide
   ```

### Getting help

If none of these solutions work:
1. Open an issue at https://github.com/thomas-to/thomas-to-bcheme/issues
2. Include:
   - Your operating system
   - Output of `ls -laR .claude/plugins/`
   - The exact error message you're seeing
