---
name: preview-branch
description: Sync the main worktree at C:\Users\viral\EquipQR cleanly to the latest origin/preview so the user can immediately run dev-start.bat from the repo root. Auto-handles documented safe cleanups (CRLF drift in supabase/functions, dirty-tree stash, worktree conflict on preview). Local-only — never pushes, never opens PRs, never starts the dev server. Use when the user runs /preview-branch or asks to "go back to preview", "reset to preview", "sync preview", "start fresh on preview", or "preview pull".
---

# /preview-branch

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Purpose

Get the **main worktree** at `C:\Users\viral\EquipQR` cleanly on the latest `origin/preview` so the user can immediately run `.\dev-start.bat` from the repo root and see live changes from there. Auto-handle the documented safe cleanups (CRLF phantom drift, dirty-tree stash with recovery hint, worktree conflict on `preview`) so the user never has to hunt for the right folder or wrestle git state by hand.

This skill is **local-only**. It does not push, open PRs, sync any branch other than `preview`, or start the dev server.

## When to invoke

- User runs `/preview-branch`
- User says "go back to preview", "reset to preview", "sync preview", "start fresh on preview", "preview pull", "I want to start dev fresh"

If the user wants to open a PR or release, do NOT use this skill — see `.cursor/rules/branching.mdc` and `.cursor/skills/raise/SKILL.md` instead.

## Operating rules

1. **PowerShell only.** No bash heredoc, no `&&`, no `$(...)` substitution. Use `;` and explicit assignment. See `.cursor/rules/git-powershell.mdc`.
2. **Run from the main worktree** at `C:\Users\viral\EquipQR`. Refuse and report if invoked from any linked worktree under `~/.cursor/worktrees/EquipQR/`.
3. **Never start the dev server.** End the skill by telling the user to run `.\dev-start.bat` themselves — it gates on interactive 1Password unlock that the agent cannot provide.
4. **Never touch `main`** and never touch worktrees on branches other than `preview`.
5. **AskQuestion (button) flow** for any approval — see learned preference in `AGENTS.md`. Never accept freeform "yes" / "ok" / "do it".
6. **Surface every command and its outcome** — no silent operations.
7. **Stop on any unexpected divergence** (non-fast-forward pull, worktree-remove failure, branch mismatch). Report state + recovery options. Do not auto-resolve.

## Workflow

Copy this checklist and track it while running:

```
Preview Sync Progress
- [ ] 1) Verify running in main worktree
- [ ] 2) Auto-discard safe CRLF drift in supabase/functions/
- [ ] 3) Stash any remaining uncommitted changes
- [ ] 4) Resolve worktree conflict on preview if any
- [ ] 5) Switch to preview and fast-forward pull
- [ ] 6) Verify clean state on preview
- [ ] 7) Report and hand off for dev-start.bat
```

### 1) Verify running in main worktree

`git worktree list --porcelain` always lists the main worktree first. Compare it to the current top-level:

```powershell
$top = (git rev-parse --show-toplevel).Trim()
$wtList = git worktree list --porcelain
$mainRoot = $null
foreach ($line in $wtList) {
  if ($line -match '^worktree (.+)$') { $mainRoot = $Matches[1]; break }
}
$topNorm = [System.IO.Path]::GetFullPath($top).TrimEnd('\').ToLowerInvariant()
$mainNorm = [System.IO.Path]::GetFullPath($mainRoot).TrimEnd('\').ToLowerInvariant()
if ($topNorm -ne $mainNorm) {
  Write-Host "ABORT: /preview-branch must run in the main worktree at $mainRoot, not the linked worktree at $top"
}
```

If the abort fires, stop. Tell the user the exact command to recover:

```
cd C:\Users\viral\EquipQR
# then re-run /preview-branch
```

Do not attempt to switch the agent root automatically.

### 2) Auto-discard safe CRLF drift in supabase/functions/

The Windows build pipeline silently re-saves `supabase/functions/*.ts` with LF endings even though the repo is CRLF. The drift is byte-identical and **documented as always-safe to discard** in `AGENTS.md`. Do this BEFORE the dirty-tree check so it doesn't get mixed into the stash.

```powershell
$fnDiff = git diff --name-only -- supabase/functions/
$fnRealDiff = git diff --ignore-cr-at-eol --name-only -- supabase/functions/
if ($fnDiff -and -not $fnRealDiff) {
  Write-Host "Auto-discarding documented CRLF phantom drift in supabase/functions/ ($($fnDiff.Count) files)"
  git checkout -- supabase/functions/
} elseif ($fnDiff -and $fnRealDiff) {
  Write-Host "WARNING: supabase/functions/ has REAL changes (not just CRLF). Falling through to stash in step 3."
}
```

### 3) Stash any remaining uncommitted changes

```powershell
$status = git status --porcelain
$stashLabel = $null
if ($status) {
  $currentBranch = (git branch --show-current).Trim()
  $ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mmZ")
  $stashLabel = "preview-branch auto-stash from $currentBranch at $ts"
  git stash push --include-untracked -m $stashLabel
  Write-Host "Stashed dirty tree as: $stashLabel"
}
```

Capture `$stashLabel` (and the resulting `stash@{0}` ref) — you must report both in step 7 so the user can `git stash pop` it back.

### 4) Resolve worktree conflict on `preview`

`git switch preview` fails if `preview` is already checked out in another worktree. Detect with the porcelain format:

```powershell
$wtList = git worktree list --porcelain
$currentWt = $null
$conflictingWorktree = $null
foreach ($line in $wtList) {
  if ($line -match '^worktree (.+)$') { $currentWt = $Matches[1] }
  elseif ($line -match '^branch refs/heads/preview$') {
    $cwNorm = [System.IO.Path]::GetFullPath($currentWt).TrimEnd('\').ToLowerInvariant()
    if ($cwNorm -ne $topNorm) { $conflictingWorktree = $currentWt; break }
  }
}
```

If `$conflictingWorktree` is set, **stop and ask the user via AskQuestion** (button flow per `AGENTS.md`):

- **Prompt**: "The `preview` branch is currently checked out in another worktree at `<path>`. Git won't allow two checkouts of the same branch. How do you want to proceed?"
- **Option (recommended)**: "Prune the worktree at `<path>` (`git worktree remove <path>`). Worktrees on `preview` are unusual — typically orphaned/abandoned cursor work."
- **Option**: "Abort — I'll investigate manually."

If user picks prune:

```powershell
git worktree remove "$conflictingWorktree"
```

If `git worktree remove` fails with "Permission denied" or "process cannot access the file" (per the worktree gotchas in `.cursor/rules/git-powershell.mdc`), STOP and tell the user to kill any process holding handles inside that worktree (Node, vitest watcher, esbuild, a Cursor/VS Code window pointed at the worktree) and re-run. Do NOT add `--force`.

### 5) Switch to preview and fast-forward pull

```powershell
git fetch origin preview
git show-ref --verify --quiet refs/heads/preview
$hasLocalPreview = ($LASTEXITCODE -eq 0)
if ($hasLocalPreview) {
  git switch preview
} else {
  git switch -c preview --track origin/preview
}
git pull --ff-only origin preview
```

**If `git pull --ff-only` fails**, local `preview` has diverged from `origin/preview`. STOP and report. Do not auto-resolve. Present the recovery options to the user (do not execute without explicit approval):

- `git reset --hard origin/preview` — destroys any local-only commits on `preview`. Per `AGENTS.md`, this is the documented post-release reset pattern and is usually safe for a solo dev, but the user must confirm there are no local commits worth keeping.
- Investigate the divergence first with `git log preview..origin/preview` and `git log origin/preview..preview`.

### 6) Verify clean state on preview

```powershell
$finalBranch = (git branch --show-current).Trim()
$finalStatus = git status --porcelain
$finalCommit = (git log -1 --oneline).Trim()
```

Both must be true:

- `$finalBranch -eq 'preview'`
- `-not $finalStatus` (or only the documented CRLF drift, which would mean step 2 didn't catch it — re-run step 2 and re-verify)

If either fails, surface the exact mismatch and stop. Do not declare success.

### 7) Report and hand off

Output, in this exact format:

```
preview-branch sync complete

Repo root:        C:\Users\viral\EquipQR
Branch:           preview
Latest commit:    <oneline>
Stash created:    <label> (recover with: git stash pop stash@{0})
                   — or "none" if the tree was already clean
Worktrees pruned: <path or "none">

Next step (run yourself, agent cannot unlock 1Password):
  .\dev-start.bat          # standard start
  .\dev-start.bat -Force   # force restart if a stack is partially up
```

**Stop here.** Do not auto-run `dev-start.bat`. Do not propose follow-up work. The user drives what happens next.

## Output contract

1. Per-step command + outcome (no silent operations).
2. Final report block in the exact format above.
3. If any abort fired anywhere in the workflow: a single clear `ABORT: <reason>` line plus the exact recovery command(s) the user should run, then stop.
4. Stash recovery hint if a stash was created — include the `stash@{0}` ref AND the human-readable label.

## Guardrails

- Do NOT push to any branch.
- Do NOT fetch, merge, or touch any branch other than `preview` (and the user's current branch only via stash).
- Do NOT auto-prune worktrees — always AskQuestion first.
- Do NOT modify or even fetch `main`.
- Do NOT auto-resolve a non-fast-forward `git pull` — stop, report, present options.
- Do NOT start the dev server — `dev-start.bat` is the user's responsibility (1Password gate).
- Do NOT operate from a linked worktree — abort with the main-root path and the `cd` recovery command.
- Do NOT use bash syntax in PowerShell (`&&`, heredoc, `$()`, Unix file utilities). See `.cursor/rules/git-powershell.mdc`.
- Do NOT add `--force` to `git worktree remove` — failures mean a process is holding file handles and the user must clear it first.

## Related

- `.cursor/rules/branching.mdc` (alwaysApply) — base-branch policy: feature branches off `preview`, PRs target `preview` by default.
- `.cursor/rules/git-powershell.mdc` (alwaysApply) — PowerShell + worktree command rules and gotchas.
- `~/.cursor/skills-cursor/babysit/SKILL.md` — keep an open PR merge-ready (use AFTER opening a PR to `preview`; note Qodo can take ~10 min to post review comments, so keep babysitting until both CI is green AND no new Qodo comments arrive).
- `.cursor/skills/raise/SKILL.md` — pre-flight + open PR `preview → main` for releases (only on explicit release language).
- `.cursor/skills/toolbelt/SKILL.md` — `dev-start.bat` / 1Password gate details.
