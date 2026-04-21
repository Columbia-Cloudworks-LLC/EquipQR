---
name: devops-triage-dispatch
description: Read-only DevOps triage-and-dispatch for EquipQR. Use proactively at the start of a session, when the user runs `/devops-triage`, or says "what should I work on next", "triage my repo", "what's broken", or "give me a task". Diagnoses local environment, CI/CD on `preview`, infrastructure drift, draft PRs, bug backlog, and dependency health, then emits a copy-paste execution prompt with model-tier, ITIL-skill, and `docs-researcher` recommendations. After each handoff loops to a Post-Handoff Cycle Choice — accept, skip to the next severity tier, or (only when local CLI tooling drift was found) authorize local-only CLI updates. Read-only by default; the local-CLI-update exception is the ONLY write capability and needs explicit per-session authorization. Never writes to the repo, GitHub, MCP servers, or production. Do NOT spawn `docs-researcher` or any other subagent during reconnaissance — recommend the spawn inside the execution prompt instead.
---

# DevOps Triage Dispatch

## Purpose

A **read-only DevOps triage-and-dispatch workflow** for the EquipQR repository. The skill's sole purpose is to assess the local environment, repository health, and issue backlog to identify the **single highest-priority task**, then hand it off to a separate execution agent via a precise copy-paste prompt.

## When to invoke

- User runs `/devops-triage` (or any close paraphrase)
- User asks "what should I work on next", "triage my repo", "what's broken", "give me a task"
- Start of a fresh work session when no specific task is in flight

## CRITICAL RULES — NON-NEGOTIABLE

1. **READ-ONLY BY DEFAULT.** While running this skill you MUST NOT execute code changes, write files, edit files, run migrations, commit, push, install packages, or alter any environment state during reconnaissance. Reconnaissance commands only. **The single, narrow exception** is the Local CLI Update Mode (Phase 5, option C, Appendix A) — and only after the user has explicitly chosen that option in response to the Post-Handoff Cycle Choice. Even then, only run the documented installer commands for the SPECIFIC tools you flagged in scenario 6b. Never use this exception to touch the repo, `package.json`, `package-lock.json`, secrets, env files, or anything inside the workspace.
2. **NO WRITES TO GITHUB.** No `gh issue create`, no `gh pr create`, no `gh issue comment`, no `gh pr edit`. Use `gh` only for `list`, `view`, `run list`, `run view`. This rule applies even in Local CLI Update Mode.
3. **NO WRITES TO MCP SERVERS.** Do not call any MCP tool that mutates state (no `*-write` servers, no Supabase migrations, no Vercel deploys, no Figma writes). This rule applies even in Local CLI Update Mode.
4. **DISPATCH, DON'T DO.** The default output is a **diagnostic report and an execution prompt** — never the application work itself. Local CLI updates are a workstation-housekeeping exception, not application work.
5. **SINGLE-BRANCH WORKFLOW.** EquipQR uses `preview` as the single working branch. All recommendations target `preview`. Never recommend feature branches unless the existing repo state already has one in flight.
6. **WINDOWS / POWERSHELL.** This workstation runs Windows. Use PowerShell-compatible commands in all reconnaissance, in the execution prompt you generate, and in any Local CLI Update Mode installer command (no `&&`, use `;` or separate lines; no `cat`/`grep`/`sed` — use the Cursor file/search tools or `rg`, `Get-Content`, `Select-String`).
7. **ONE SCENARIO, ONE HANDOFF.** Stop reconnaissance at the first scenario that warrants action. Do not bundle multiple tasks. The execution agent gets exactly one job. After the handoff, proceed to Phase 5 — do NOT immediately run further reconnaissance without the user's choice.
8. **ALWAYS LOOP TO PHASE 5.** Every triage cycle ends at Phase 5 — the Post-Handoff Cycle Choice. Never terminate the session silently after Phase 4. The user must be the one who chooses to end the cycle.
9. **DO NOT SPAWN SUBAGENTS YOURSELF.** Specifically do NOT call `docs-researcher` (or any other subagent) during reconnaissance. Your job is to *recommend* the spawn as a discrete step inside the execution prompt; the future execution agent does the actual call.

# PHASE 1 — RECONNAISSANCE (severity-ordered, stop at first hit)

Run these checks in order. Stop and proceed to Phase 2 the moment one scenario triggers. If a check is inconclusive, log it and continue to the next.

## 1. Bricked Local Workstation (most severe)

Verify core tooling is present and responsive:

```powershell
node --version
npm --version
gh --version
git --version
```

Trigger conditions: any `ENOENT`, "command not found", "is not recognized as the name of a cmdlet", a binary returning a stack trace, or a version far below the repo's documented minimums (check `package.json` `engines` if uncertain). PATH corruption counts.

## 2. CI/CD Rescue on `preview`

```powershell
gh run list --branch preview --limit 5
```

Trigger conditions: the most recent run on `preview` has `conclusion: failure`, `cancelled`, or `timed_out`. If the most recent is `in_progress`, look at the previous completed run — if it failed, this triggers.

If triggered, capture the failing run ID and the failing job name with `gh run view <run-id> --log-failed` (read-only).

## 3. Infrastructure Drift

EquipQR uses Supabase + Vercel. Run dry/preview checks:

```powershell
supabase db diff --schema public 2>&1 | Select-Object -First 80

vercel link --yes 2>&1 | Select-Object -First 10
```

Trigger conditions: `supabase db diff` produces non-empty SQL output (drift between local migrations and remote schema), or Vercel reports a project linkage problem. Do NOT run `supabase db push` or `vercel deploy`.

## 4. Draft PR Resolution

```powershell
gh pr list --draft --state open --json number,title,headRefName,updatedAt,isDraft
```

Trigger conditions: one or more open draft PRs authored by the user, especially those with `updatedAt` older than 3 days OR with failing checks (`gh pr checks <number>`).

## 5. Agentic Bug Triage

```powershell
gh issue list --label bug --label "good first issue" --state open --limit 10 --json number,title,labels,updatedAt
```

If empty, broaden to just `--label bug --state open --limit 10` and look for issues lacking an `in-progress` label.

Trigger conditions: at least one open `bug` issue that is small enough to be a "good first issue" (or has been triaged that way) and is not assigned to anyone.

## 6. Routine Dependency Bump (npm packages AND local CLI tooling)

This scenario covers **two classes** of out-of-date dependencies. Run BOTH sub-checks before deciding the trigger — they often surface together and one execution prompt should bundle the related ones.

### 6a. npm package dependencies

```powershell
npm outdated --json 2>$null
npm audit --json 2>$null
```

### 6b. Global / local CLI tooling

Detect drift in every CLI that EquipQR development relies on. Each check is read-only and degrades gracefully — if a tool isn't installed or the registry call fails, log it and continue. **Never** run `npm install -g`, `gcloud components update`, `winget upgrade`, `scoop update`, or any installer here — that's the execution agent's job.

```powershell
$supaOut = supabase --version 2>&1
$supaCurrent = ($supaOut | Select-String -Pattern '^\d+\.\d+\.\d+').Matches.Value | Select-Object -First 1
$supaLatestNotice = ($supaOut | Select-String -Pattern 'available:\s*v?(\d+\.\d+\.\d+)').Matches.Groups[1].Value
if (-not $supaLatestNotice) {
  $supaLatestNotice = (gh release view --repo supabase/cli --json tagName -q .tagName 2>$null) -replace '^v'
}

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelInstalled) {
  $vercelCurrent = vercel --version 2>$null
  $vercelLatest  = npm view vercel version 2>$null
}

$ghCurrent = (gh --version 2>$null | Select-Object -First 1) -replace 'gh version (\S+).*','$1'
$ghLatest  = (gh release view --repo cli/cli --json tagName -q .tagName 2>$null) -replace '^v'

$nodeCurrent = (node --version 2>$null) -replace '^v'
$nodeEngine  = $null
if (Test-Path package.json) {
  $nodeEngine = (Get-Content package.json -Raw | ConvertFrom-Json).engines.node
}

$npmCurrent = npm --version 2>$null
$npmLatest  = npm view npm version 2>$null

$gcloudUpdates = gcloud components list --filter="state.name:Installed" `
  --format="value(id,current_version_string,latest_version_string)" 2>$null `
  | Where-Object { $_ -match '\S+\s+(\S+)\s+(\S+)' -and $matches[1] -ne $matches[2] }

$gwsCurrent = (gws --version 2>$null | Select-Object -First 1)

$gitCurrent = (git --version 2>$null) -replace 'git version ',''
```

**Optional broad sweep (Windows-native package managers):**

If the user installs tools via `winget` or `scoop`, both expose pure-listing commands that do not modify state:

```powershell
winget upgrade --include-unknown 2>$null   # lists upgrades; does NOT install
scoop status 2>$null                       # lists out-of-date buckets/apps
```

Use these only as a secondary signal — many tools listed there (browsers, system utilities) are out of scope for EquipQR dev work.

### Trigger conditions (any of)

- `npm outdated` reports at least one dependency with a safe `wanted` bump (within the existing semver range) AND `npm audit` shows no NEW critical/high vulnerabilities introduced by the bump.
- `npm audit` shows critical/high CVEs in current dependencies — this **escalates** to Premium model + `auditor` skill, regardless of other findings.
- Any global CLI is more than **one minor version** behind its latest stable release (e.g. Supabase CLI 2.39.2 → 2.90.0). Patch-only drift on a stable tool is informational, not a trigger, unless a CVE is published.
- `gcloud components list` reports any component where `current_version_string` ≠ `latest_version_string`.
- Node.js installed version violates `package.json` `engines.node` — this **escalates** to Premium and is treated as Bricked Workstation (scenario 1) instead.

### What to record in Findings

For each out-of-date item include: tool/package name, **current → latest** versions, source of the "latest" claim (e.g. `npm view`, `gh release view`, CLI's own update notice, `gcloud components list`), and whether a CVE is associated. This becomes the artifact list inside the Execution Prompt so the execution agent doesn't have to re-discover it.

### What NOT to do here

- Do not run `npm install`, `npm update`, `npm audit fix`, `gcloud components update`, `supabase update`, `winget upgrade`, `scoop update`, or any installer.
- Do not modify `package.json`, `package-lock.json`, or any tool's config.
- Do not call any `*-write` MCP server.
- Do not bundle a CLI bump and an npm bump into the same execution prompt unless they share a clear cause (e.g. `supabase-js` + Supabase CLI both bumped). Otherwise pick the most severe and mention the others in Findings as "also observed".

## 7. Clean Bill of Health (default)

If no scenario above triggers, verify:

```powershell
git status --porcelain
git fetch origin preview
git rev-list HEAD..origin/preview --count
npm ci --dry-run 2>&1 | Select-Object -Last 20
```

Trigger conditions: clean tree, `origin/preview` has no commits ahead of local, `npm ci` would succeed. If ANY of these fails, the failure becomes the actionable scenario (e.g., dirty tree → recommend stash + pull; behind origin → recommend `git pull origin preview --ff-only`; broken lockfile → recommend `npm install`).

# PHASE 2 — MODEL SELECTION

Map the identified scenario to a model tier. Be conservative — prefer Auto unless complexity genuinely requires more.

| Tier        | When to choose                                                                                                  | Example scenarios                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Auto**    | Routine, well-isolated, low-blast-radius. Single file or a small handful. No architectural decisions.           | Safe npm patch bumps, typo fixes in draft PRs, `good first issue` bugs, clean-tree pull, lockfile repair, single-component `gcloud components` updates. |
| **Premium** | Multi-file logic changes, system-level reasoning, moderate risk, anything touching auth/RLS/billing/migrations. | CI/CD pipeline rescue, infra drift correction, complex bug triage, bricked local recovery, **global CLI bumps that cross multiple minor versions** (e.g. Supabase CLI 2.39 → 2.90 — likely contains migration-format or auth changes). |
| **MAX**     | Massive log analysis, sprawling refactors, deep multi-file trace correlation, full-repo audits.                 | Whole-repo security audit, cross-cutting refactor spanning dozens of files, deep CI failure trace.         |

# PHASE 3 — ITIL SKILL MAPPING

Recommend exactly **one** ITIL skill (or `None`) that the execution agent should load before starting:

| Scenario                                         | Skill                                          |
| ------------------------------------------------ | ---------------------------------------------- |
| Deep bug triage, CI/CD failure root-cause        | `.cursor/skills/itil-problem-record/SKILL.md`  |
| Infrastructure drift, major dependency upgrades  | `.cursor/skills/itil-change-record/SKILL.md`   |
| Vulnerability patching, compliance / audit sweep | `.cursor/skills/auditor/SKILL.md`              |
| New live-site bug needing reproduction & evidence | `.cursor/skills/itil-incident-record/SKILL.md` |
| Feasibility / scope research on a feature issue  | `.cursor/skills/itil-service-request/SKILL.md` |
| Safe dependency bump, draft PR typo, clean sync  | `None`                                         |

# PHASE 3B — DOCS-RESEARCHER ROUTING

The `docs-researcher` subagent fetches current library/framework/API documentation without polluting the main conversation context. **Do NOT call it yourself** — your job is to decide whether the *execution agent* should call it, and if so, what to ask. This keeps reconnaissance fast while ensuring the execution agent doesn't act on stale knowledge.

## Decision rule

**Recommend `docs-researcher` when ALL three are true:**

1. The task touches a third-party library, framework, CLI, or cloud service (Supabase, Vercel, Next.js, React Query, Tailwind, Postgres extensions, npm packages, GitHub Actions, etc.).
2. The execution would benefit from authoritative current docs — changelog, breaking changes, current API syntax, or CVE advisory details.
3. The blast radius is non-trivial — production code, schema migration, auth/RLS, billing, or anything users see.

**Skip `docs-researcher` when ANY is true:**

- Pure git plumbing (sync, stash, ff-only pull, lockfile repair).
- Typo, comment, or formatting-only change.
- Patch-level bump of a well-known dependency with no functional changes in its changelog.

## Scenario → query mapping

| Scenario                              | Docs-researcher? | Suggested query for the execution agent to ask                                                                            |
| ------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bricked Local Workstation             | Conditional      | Only if the install path is non-obvious. E.g., `"Current install command for <missing-tool> on Windows"`.                 |
| CI/CD Rescue on `preview`             | Yes              | `"<failing tool/lib> error <code or message> — current docs and known causes for v<version>"`.                            |
| Infrastructure Drift (Supabase)       | Yes              | `"Current Supabase <CLI command or RLS pattern> syntax"` or `"Supabase migration breaking changes since v<known-good>"`.  |
| Infrastructure Drift (Vercel)         | Yes              | `"Current Vercel <vercel.json field or runtime option> schema and behavior"`.                                             |
| Draft PR Resolution                   | Conditional      | Only if the PR touches an unfamiliar library or a recently-changed API. Skip for typo / lint fixes.                       |
| Agentic Bug Triage                    | Conditional      | Yes if the bug touches React / Next.js / React Query / Tailwind / Supabase APIs. No for pure app-logic bugs.              |
| Routine npm Dependency Bump           | Yes              | `"<package> changelog and breaking changes from v<old> to v<new>"`.                                                       |
| Global CLI Tooling Bump (Supabase CLI, gh, gcloud, Vercel CLI, Node) | Yes | `"<tool> release notes from v<old> to v<new> — breaking CLI flag changes, removed commands, and required migration steps for an existing project"`. |
| Dependency Bump with CVE              | Yes              | `"<CVE-ID> advisory details, affected versions, and minimum fixed version of <package>"`.                                 |
| Clean Bill of Health (any sub-flavor) | No               | Sync / lockfile work does not need external docs.                                                                         |

## How to phrase the recommendation in the Execution Prompt

When you recommend `docs-researcher`, embed the instruction as a **discrete step** in the Execution Prompt with the exact question pre-written. Example wording:

> Before making any code changes, spawn the `docs-researcher` subagent with this exact prompt: `"Fetch the official changelog for @tanstack/react-query from v5.59.0 to v5.62.0 and summarize any breaking changes, deprecations, or required migration steps."` Wait for the response, then proceed with the bump.

This gives the execution agent a single focused query — not an open invitation to research.

# PHASE 4 — THE HANDOFF PAYLOAD

Output your final answer using **EXACTLY** this markdown structure. No conversational filler, no preamble, no postamble. The user copies the Execution Prompt block verbatim into a fresh execution agent.

### Diagnostic Report

- **Identified Scenario:** [Scenario Name from Phase 1]
- **Target Branch:** `preview`
- **Findings:** [1-2 sentences with concrete artifacts: commit SHAs, run IDs, package names with old → new versions, issue numbers, file paths]

### Execution Configuration

- **Model Recommendation:** [Auto | Premium | MAX]
- **Justification:** [One sentence explaining the model choice]
- **Required ITIL Skill:** [Relative path to `.cursor/skills/.../SKILL.md` or `None`]
- **Docs-Researcher Recommendation:** [`Yes — query: "<exact question>"` | `No — <one-clause reason>`]

### Execution Prompt

```text
[A highly specific, context-rich prompt for the execution agent. It MUST include:
 - The exact scenario name and what to do about it
 - All concrete artifacts you discovered (run IDs, commit SHAs, package names + versions, issue numbers, file paths, error messages)
 - An explicit instruction to work on the `preview` branch
 - An explicit instruction to load the ITIL skill (if any) BEFORE starting
 - When Phase 3B says "Yes": a discrete step instructing the agent to spawn the `docs-researcher` subagent with the EXACT pre-written query, and to wait for the response before making code changes
 - PowerShell-compatible command examples (use `;` not `&&`, use `Get-Content` not `cat`)
 - Required verification steps before commit (lint, typecheck, build, relevant tests)
 - Explicit instruction to commit with a conventional commit message and `git push origin preview`
 - For ITIL skills that require GitHub issue interaction, the issue number to update]
```

# PHASE 5 — POST-HANDOFF CYCLE CHOICE

After Phase 4 prints, you MUST present this exact menu and then wait for the user's reply. Do not start any further reconnaissance, do not run any installer, do not generate another execution prompt until the user picks an option.

```text
### What next?

A. **Accept this handoff.** Copy the Execution Prompt above into a fresh agent and end this triage cycle.
B. **Skip this scenario, continue triage.** I'll mark "<Identified Scenario>" as deferred and re-run Phase 1 starting at the NEXT severity tier (scenario <N+1>) to find the next-highest-priority task.
C. **Update local tooling now.** [Only offered if the handoff was Routine Dependency Bump and scenario 6b found CLI drift.] I'll enter Local CLI Update Mode and apply the documented installer for each out-of-date CLI listed in Findings: <comma-separated tool names>. No repo files, GitHub state, or production resources will be touched.
D. **End the cycle.** Done for now.

Reply with `A`, `B`, `C`, or `D`.
```

Substitute the bracketed placeholders with the actual scenario name and tool list from the just-completed cycle. Omit option `C` entirely when scenario 6b did not trigger — never offer "update local tooling" as a generic option.

Per `AGENTS.md`, prefer the AskQuestion (button) interface over freeform text for any approval. Render the four options as buttons rather than asking the user to reply with a letter.

## Handling each choice

### Choice A — Accept handoff
Acknowledge the choice in one line ("Acknowledged. Hand off to a fresh execution agent.") and stop. Do not echo the prompt again.

### Choice B — Skip and continue
- Add the deferred scenario to a one-line "**Deferred this cycle:** …" note so it isn't re-detected and re-presented immediately.
- Re-enter Phase 1 starting at scenario `N+1` (the severity tier strictly below the one just skipped). Do NOT re-run earlier checks unless the user said `restart`.
- If you exhaust all scenarios without a new trigger, present scenario 7 (Clean Bill of Health) findings and end at Phase 5 again.
- If the user says `restart` instead of just `B`, re-run Phase 1 from scenario 1.

### Choice C — Local CLI Update Mode
Read **Appendix A — Local Tooling Update Procedures** below. Then:

1. For each tool in the Findings tool list (and ONLY those), look up its row in Appendix A.
2. Detect the install method: run the `Get-Command <tool> | Select-Object Source` probe shown in Appendix A. The Source path tells you which installer owns the binary (npm-global / scoop / winget / official installer / gcloud SDK self-update).
3. Print a compact pre-flight plan to the user — tool name, current → target version, detected install method, the EXACT command you will run, and a one-line risk callout. Then run them sequentially.
4. After each tool, re-run the same version-detection snippet from scenario 6b for that tool and print the new value. If the version did not advance, stop and report the failure rather than proceeding to the next tool.
5. When all tools are processed (success or failure), print a final summary table: tool, before, after, status (`updated` / `no-op` / `failed: <reason>`).
6. Loop back to Phase 5 and present the menu again — minus option C, since the drift has been addressed (or attempted). Do NOT auto-continue triage; the user might want to hand off something else next.

**Local CLI Update Mode is the ONLY context where you may execute installer commands.** The moment the user replies `B` or `D` or anything other than `C`, the write capability disappears again.

### Choice D — End cycle
Acknowledge and stop. Do not summarize, do not loop.

# APPENDIX A — LOCAL TOOLING UPDATE PROCEDURES

These are the only installer commands you are authorized to run, and only after the user picks Choice C in Phase 5. Each row tells you (1) how to detect the install method, (2) the safe update command per method, and (3) the post-update verification command.

> **Auto-elevation note.** Some installers (`winget`, `gcloud components`, system-scope `npm install -g`) may require an elevated PowerShell. If a command fails with `Access denied` or `requires administrator`, do NOT silently retry with `Start-Process -Verb RunAs`. Instead, print the exact command and ask the user to run it in an elevated terminal, then mark that tool as `failed: needs-elevation` in the summary.

## A.1 Supabase CLI

**Detect install method:**
```powershell
(Get-Command supabase -ErrorAction SilentlyContinue).Source
```

| If Source contains…                               | Update command                                              |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `\scoop\shims\` or `\scoop\apps\supabase\`        | `scoop update supabase`                                     |
| `\AppData\Roaming\npm\` or `\node_modules\`       | `npm install -g supabase`                                   |
| `\Program Files\Supabase\` or other manual path   | Print the GitHub Releases URL and ask user to install: `https://github.com/supabase/cli/releases/latest`. Mark as `failed: manual-install-required`. |

**Verify:** `supabase --version` — confirm the digits match the latest version reported in 6b.

## A.2 GitHub CLI (`gh`)

**Detect:** `(Get-Command gh).Source`

| Source pattern         | Update command                                         |
| ---------------------- | ------------------------------------------------------ |
| `\Program Files\GitHub CLI\` | `winget upgrade --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements` |
| `\scoop\apps\gh\`      | `scoop update gh`                                      |
| `\AppData\Local\Microsoft\WinGet\` | `winget upgrade --id GitHub.cli --silent` |

**Verify:** `gh --version | Select-Object -First 1`

## A.3 Vercel CLI

Vercel CLI is npm-distributed.

```powershell
npm install -g vercel
```

**Verify:** `vercel --version`. If `vercel` is not on PATH, the project likely uses `npx vercel` — skip the global install and inform the user.

## A.4 Node.js

**Treat with caution.** Node major-version bumps can break the EquipQR project. Before running anything:

1. Re-read `package.json`.`engines.node`. If the latest Node version would violate the engine pin, refuse the update and tell the user to bump `engines.node` first (which is application work and belongs to a normal handoff, not this mode).
2. Detect the install method:

```powershell
(Get-Command node).Source
```

| Source pattern                                   | Update command                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `\nvm4w\nodejs\` or `nvm` on PATH                | `nvm install <target-version>` then `nvm use <target-version>` (ask user to confirm exact version) |
| `\Program Files\nodejs\`                         | Print the official installer URL `https://nodejs.org/en/download/` and mark `failed: manual-install-required`. Do NOT attempt `winget upgrade OpenJS.NodeJS` without user permission — it can break globally-installed packages. |

**Verify:** open a fresh terminal note for the user — the active session may still cache the old `node` until they restart the shell.

## A.5 npm

```powershell
npm install -g npm@latest
```

**Verify:** `npm --version`

## A.6 gcloud SDK & components

The gcloud installer ships its own component manager. **Do NOT** use `winget` for gcloud.

```powershell
gcloud components update --quiet
```

If the SDK was installed by a non-user installer (e.g., admin-installed under `C:\Program Files\Google\Cloud SDK\`), this will fail with a permission error — re-run elevated or mark `failed: needs-elevation`.

**Verify:** `gcloud version --format=json | ConvertFrom-Json | Select-Object -ExpandProperty 'Google Cloud SDK'`

## A.7 git

```powershell
winget upgrade --id Git.Git --silent --accept-source-agreements --accept-package-agreements
```

**Verify:** `git --version`

## A.8 gws

`gws` is distributed out-of-band by Columbia Cloudworks. There is no public registry. If `gws` was flagged in 6b (i.e., the user told you a newer version exists), print the install path the user previously used (typically `C:\WINDOWS\gws.exe`) and ask the user to drop the new binary in place. Mark as `failed: manual-install-required` and continue.

## A.9 Tools NOT in the table

If 6b flagged a tool not listed in A.1–A.8 (rare), do NOT improvise an install command. Print: `"<tool> update procedure is not documented in Appendix A. Skipping. Please update manually and re-run triage."` and mark it `failed: undocumented-procedure`.

# OPERATING NOTES

- **Be honest about ambiguity.** If reconnaissance is inconclusive (e.g., MCP server unavailable, `gh` not authenticated), say so in Findings and downgrade your recommendation rather than fabricating data.
- **Never invent artifacts.** Every commit SHA, run ID, package name, and issue number in your output must come from a real command you ran. If you didn't run the check, omit the artifact.
- **Cap reconnaissance time.** Aim for under 60 seconds of read-only commands. The execution agent does the slow work.
- **One scenario, one prompt.** If you find multiple problems, pick the most severe, mention the others briefly in Findings as "also observed", but generate the prompt for only one.
- **Respect the kill switch.** If the user says "stop", "abort", or "wrong scenario" mid-reconnaissance, immediately halt and ask which scenario they want assessed instead. The kill switch also applies mid-update — `stop` halts Local CLI Update Mode immediately and prints whatever partial-state summary you have.
- **Preserve the cycle.** Phase 5 is mandatory. Even after a Local CLI Update Mode run, you loop back to Phase 5 (minus option C). Only Choice D ends the session.

## Related

- `.cursor/skills/itil-problem-record/SKILL.md` — root-cause investigation for bugs / regressions / CI failures.
- `.cursor/skills/itil-change-record/SKILL.md` — Plan-mode change record for any code change requiring authorization.
- `.cursor/skills/itil-incident-record/SKILL.md` — live-site bug reproduction and evidence capture.
- `.cursor/skills/itil-service-request/SKILL.md` — feasibility / scope research for feature requests.
- `.cursor/skills/auditor/SKILL.md` — vulnerability patching and compliance sweeps.
- `.cursor/skills/preview-branch/SKILL.md` — local clean-sync to `origin/preview` before starting any handoff.
- `.cursor/skills/raise/SKILL.md` — release pre-flight + open `preview → main` PR (only on explicit release language).
- `.cursor/skills/toolbelt/SKILL.md` — canonical reference for MCP servers, CLI tools, and `dev-start.bat` / 1Password gate details.
- `AGENTS.md` — learned user preferences (AskQuestion-button flow, single-branch tempo on `preview`, ITIL flow expectations).
