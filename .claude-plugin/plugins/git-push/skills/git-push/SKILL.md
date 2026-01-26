# /git-push - Smart Git Push Workflow

## Purpose
Execute an intelligent git push workflow that checks repository status and handles staging/committing as needed before pushing.

## Workflow Steps

### Step 1: Check Current Status
```bash
git status
git branch -vv
```
- Identify current branch and its tracking remote
- Check for uncommitted changes (staged and unstaged)
- Check for untracked files

### Step 2: Handle Uncommitted Changes (if any)

#### If there are unstaged changes:
1. Show the diff: `git diff`
2. Ask user which files to stage (or all)
3. Stage selected files: `git add <files>` or `git add -A`

#### If there are staged changes:
1. Show staged diff: `git diff --staged`
2. Ask user for commit message
3. Create commit with Co-Authored-By footer:
```bash
git commit -m "$(cat <<'EOF'
<user's commit message>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 3: Check Remote Status
```bash
git log @{u}..HEAD --oneline
```
- Show commits that will be pushed
- If no upstream, suggest setting one: `git push -u origin <branch>`

### Step 4: Push to Remote
```bash
git push
```
- If push fails due to diverged branches, inform user and suggest options:
  - `git pull --rebase` then push
  - `git push --force-with-lease` (with user confirmation)

### Step 5: Verify Success
```bash
git status
git log -1 --oneline
```
- Confirm push succeeded
- Show the latest commit on remote

## Decision Points (Ask User)

1. **Unstaged files exist**: "Which files should I stage? (all / specific files / none)"
2. **Staged changes exist**: "What commit message should I use?"
3. **No upstream branch**: "Should I set upstream with `git push -u origin <branch>`?"
4. **Push rejected**: "Remote has changes. Pull and rebase, or force push with lease?"

## Error Handling

- If not in a git repository: Inform user and exit
- If no remote configured: Suggest adding one
- If authentication fails: Suggest checking credentials/SSH keys
- If protected branch: Warn user about branch protection rules

## Example Usage

```
User: /git-push
Assistant:
1. Checking git status...
   - Branch: feature/new-thing (tracking origin/feature/new-thing)
   - 2 modified files, 1 untracked file

2. Would you like me to stage these changes?
   [Shows file list and diff summary]

3. [After staging] Please provide a commit message.

4. Pushing to origin/feature/new-thing...
   - 1 commit pushed successfully
   - Latest: abc1234 "Add new feature"
```
