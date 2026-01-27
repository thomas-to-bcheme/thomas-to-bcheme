# Troubleshooting Guide

Common problems and their solutions.

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
