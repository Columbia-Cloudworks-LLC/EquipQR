---
name: issue-clarification
description: Clarifies one open EquipQR GitHub issue before implementation by defining affected users, problem, success criteria, and codebase findings, then rewrites the issue title and body on GitHub. Use when the user asks to clarify, triage, scope, or document an issue, or invokes /issue-clarification. Requires a valid open issue number or URL. Ask product questions via AskQuestion when needed; do not wait for a separate approve step before gh issue edit. Does not implement fixes.
disable-model-invocation: true
---

# Issue Clarification

## Purpose

Turn a raw or ambiguous GitHub issue into a structured, actionable record on the issue itself. This skill is **read-only for product code** — it may only draft and update the issue title and body on GitHub.

Invoking `/issue-clarification` **authorizes** the full clarify → publish loop. Use **`AskQuestion`** for product or scope decisions you cannot infer; do **not** pause for a separate “approve the draft” step before `gh issue edit`. Stop only when the existing-structure gate blocks overwrite, required product answers are still open, or the resolved-state check needs a human close/continue choice.

Hand off to `itil-problem-record` (root-cause depth) or `itil-issue-resolver` (implementation) when the user asks for the next step.

## Hard Gate — Issue Required

The user must provide an existing issue. If the user does not provide a valid issue number for this repository for an **OPEN** issue on GitHub, or a URL to the issue, **hard stop** and inform the user of the requirement. Do not proceed without a documented issue first.

### Resolve and validate the issue

Prefer a connected GitHub integration (MCP or equivalent) when available to fetch issue JSON. Otherwise use the local CLI fallback:

```powershell
.\scripts\itil\Get-ItilIssueContext.ps1 -Issue "<number-or-url>" -Json
```

Or:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

**Stop immediately when:**

- The reference is missing, malformed, or not in this repository.
- `state` is not `OPEN` (closed issues are out of scope unless the user explicitly reopens first).
- The issue cannot be fetched.

Tell the user: *Provide an open GitHub issue number (e.g. `1234`) or issue URL for this repository before clarification can proceed.*

## Existing Structure Gate

Before drafting an overwrite, inspect the issue body for these section headers (markdown `##` or HTML `<summary>` text, ignoring optional `<strong>` wrappers):

- `Original Issue Body`
- `Affected User(s)`
- `Problem Statement`
- `Success Criteria`
- `Documented Findings`

Also treat the legacy misspelling `Success Criterea` as an existing structured header.

**If the issue already has these section headers, stop and ask the user how they wish to proceed:**

1. Clarify the existing issue via a follow-up Q&A session, or
2. Stop without modifying the issue.

Do not overwrite structured issues without explicit user direction.

## Workflow

Copy this checklist and track progress:

```text
Clarification Progress:
- [ ] Issue validated (open, this repo)
- [ ] Existing-structure gate passed
- [ ] Issue and comments reviewed
- [ ] Gated-behavior / storage-policy heuristic evaluated
- [ ] Affected user(s) defined
- [ ] Problem statement written
- [ ] Success criteria written (user perspective; gated matrices mirrored when required)
- [ ] origin/preview explored (integration tip); choice documented
- [ ] Relevant codebase areas documented
- [ ] Gated-policy deliverables complete (if heuristic matched) or N/A
- [ ] Resolved-state check (if applicable)
- [ ] Draft written under artifacts/issue-clarification-drafts/
- [ ] Issue title and body updated on GitHub (no separate draft-approval gate)
```

### 1. Review the issue

Read the full issue: title, body, labels, and comments. Extract reporter intent, environment, reproduction hints, screenshots, and any prior triage.

### 2. Gated-behavior / storage-policy heuristic (mandatory)

After reviewing the issue and comments, run this detection heuristic. Match on any mention or implication of:

consent, cookie, localStorage, sessionStorage, banner, Accept, Reject, preference, feature flag, offline queue, rehydrate, persist, storage policy, throttle, draft backup, cross-tab sync, SameSite, Secure, or any UI/behavior gated behind a user decision or acceptance step.

Also match when the user explicitly says the issue involves any of the above.

**When the heuristic matches, clarification is incomplete** until the gated-policy deliverables in §7 exist. For ordinary bugs or pure UI issues that do not match, omit those extra sections.

### 3. Define affected user(s)

Classify who is impacted. List users **in order of priority** (highest first). Use only the categories that apply; omit irrelevant ones.

**Priority order (highest → lowest):**

1. Potential New Customers
2. Developer
3. EquipQR Org Owners/Admins Only
4. EquipQR Users
5. Quickbooks Users
6. Google Drive Users
7. Unauthenticated Users

State **why** each listed user is affected. Do not guess — infer from issue evidence and codebase; mark uncertainty explicitly.

### 4. Problem statement

Summarize what is wrong today in plain language. Separate observed behavior from assumptions. Note environment, roles, and data preconditions when known.

### 5. Success criteria

State the intended outcome **from the user's perspective** — what they should be able to do or see when the issue is resolved. Use testable, user-visible criteria.

When the gated-behavior heuristic matched, also mirror the critical acceptance rows from the §7 matrices (Definition of Done items), not only first-paint UX.

### 6. Explore `origin/preview` (primary)

Primary exploration target is **`origin/preview`** (integration tip) because this skill runs before implementation. Fetch before searching:

```powershell
git fetch origin preview
```

Explore that tip (`git show`, `git grep`, worktree, or temporary checkout). Prefer not disrupting an unrelated dirty worktree. Use `origin/main` only when comparing production-shipped behavior or running the already-resolved check.

In Documented Findings, explicitly record:

- Exploration base: `origin/preview` @ `<short-sha>`
- Why that tip was used (pre-implementation clarification)

Document:

- Likely routes, components, hooks, or services
- Edge functions, migrations, RLS, or RPC touchpoints
- Existing tests or E2E specs
- Related docs or permissions matrices

Use targeted search and `explore` when the surface is broad. **Do not implement fixes.**

### 7. Gated-policy deliverables (when heuristic matches)

Place full matrices and tables primarily under **Documented Findings**. Mirror critical acceptance rows under **Success Criteria** so they become testable Definition-of-Done items.

| Clarification deliverable | Required content |
| --- | --- |
| State × action matrix | Rows = states (pending / Accept / Reject / legacy-rehydrate / etc.). Columns = read / write / delete / clear / rehydrate. Explicit cell for every storage key or logical group of keys. |
| Lifecycle transitions | Cold load, mid-session Accept, mid-session Reject, tab sync, persist failure, intentional empty prefs, Accept-with-legacy vs Accept-with-no-legacy. What is flushed, preserved, or never written. |
| Key classification table | Necessary vs optional (or finer), with explicit rationale for every ambiguous key (org hints, admin-grant throttles, PM draft backups, session cache fields, etc.). |
| Explicit product/legal decisions | Anything deferred (third-party widgets, hCaptcha, Maps, etc.) must be recorded as a locked decision, not a vague follow-up. |
| Shell / a11y / cross-cutting constraints | z-index vs toasts/modals, landmark element, error toast on persist failure, focus management, etc. |
| Adversarial preflight | Short list of the questions an adversarial reviewer (Qodo or equivalent) will ask next, with answers already written in the findings. |

**Do not guess cells.** Any matrix cell that is an assumption must be marked `(assumption)` and preferably turned into an explicit product question for the user **before** the draft is finalized. Clarification is incomplete while required cells remain unmarked guesses.

### Product questions — use AskQuestion

Whenever clarification needs a product, scope, or UX decision from the user (including gated-policy assumptions and draft open questions):

1. Use Cursor’s **`AskQuestion`** tool with fixed options (single- or multi-select as appropriate).
2. Do **not** dump numbered choice lists in ordinary chat when `AskQuestion` is available.
3. Prefer one focused `AskQuestion` round before finalizing the draft (batch related decisions into that call when possible).
4. If `AskQuestion` is unavailable in the session, ask the same questions briefly in prose and note the fallback.

### 8. Already-resolved check

If investigation suggests the issue is already fixed on production or the integration tip:

1. Consult `origin/main` and PR history when relevant:

   ```powershell
   gh pr list --state merged --search "<issue-number> in:body" --json number,title,mergedAt,url
   gh issue view <number> --json timelineItems
   ```

2. Identify the PR that likely resolved it and cite evidence (merged PR, commit, or code path).
3. **Ask the user:** close the issue, or continue after a clarification follow-up so the agent can understand the current state before proceeding.

**Never auto-close.** Do not close the issue without explicit user approval.

### 9. Draft the clarified issue, then publish

Write the complete proposed **new title** and **full body** to a persistent draft under `artifacts/issue-clarification-drafts/` (create the directory if missing). Do not commit the draft unless the user asks.

**Preferred formats:**

1. **Markdown body file + title sidecar (simplest for `gh`):**
   - `artifacts/issue-clarification-drafts/<number>.md` — **body only** (triage line through Documented Findings), ready for `--body-file`
   - `artifacts/issue-clarification-drafts/<number>.title.txt` — single-line proposed title
2. **JSON:** `artifacts/issue-clarification-drafts/<number>.json` with `{ "title": "...", "body": "..." }` — extract `body` to a UTF-8 temp file before `gh issue edit`

**Title:** Rewrite so it accurately and concisely reflects the clarified problem statement (not the original vague title).

**Body rules (canonical EquipQR format):**

1. Begin with exactly one triage line:

   `**Triage:** Severity: Critical/High/Medium/Low | Area: … | Effort: Low/Medium/High`

2. Then the five `<details>` / `<summary>` sections with these exact summary labels and default states:

| Section | Default state |
| --- | --- |
| Original Issue Body | collapsed (omit `open`) |
| Affected User(s) | expanded (`open`) |
| Problem Statement | expanded (`open`) |
| Success Criteria | expanded (`open`) |
| Documented Findings | expanded (`open`) |

3. Preserve the prior issue body **verbatim** inside Original Issue Body (before any clarification rewrite).

**Body template:**

```html
**Triage:** Severity: <Critical|High|Medium|Low> | Area: <area> | Effort: <Low|Medium|High>

<details>
<summary>Original Issue Body</summary>

<paste the complete previous issue body here, unchanged>

</details>

<details open>
<summary>Affected User(s)</summary>

- **Primary:** …
- **Also affected:** …

</details>

<details open>
<summary>Problem Statement</summary>

…

</details>

<details open>
<summary>Success Criteria</summary>

- …
- …

</details>

<details open>
<summary>Documented Findings</summary>

### Exploration base

- `origin/preview` @ `<short-sha>` — pre-implementation clarification tip

### Relevant areas (origin/preview)

- `path/to/file` — …

### Suggested first steps for follow-up agent

- …

### Resolution status

<not resolved | appears resolved — see PR #…>

<!-- When gated heuristic matched, also include: -->
<!-- ### State × action matrix -->
<!-- ### Lifecycle transitions -->
<!-- ### Key classification -->
<!-- ### Product / legal decisions -->
<!-- ### Shell / a11y constraints -->
<!-- ### Adversarial preflight -->

</details>
```

Write the draft, then **immediately** update GitHub (same turn when possible). After publish, show a summary of the title, triage line, section highlights, link to the issue, and the **full path** to the draft file on disk.

### 10. Apply GitHub update (mandatory end of skill)

Update GitHub as soon as the draft is complete and any required `AskQuestion` decisions are resolved. Do not wait for the user to reply “approve.”

Prefer a connected GitHub integration when available. Fallback (desktop Cursor / PowerShell):

```powershell
$title = (Get-Content -Raw "artifacts/issue-clarification-drafts/<number>.title.txt").Trim()
gh issue edit <number> --title $title --body-file "artifacts/issue-clarification-drafts/<number>.md"
```

If the draft is JSON, extract `body` to a UTF-8 temp file and pass that path to `--body-file` (never inline multiline `--body` on Windows).

Confirm with `gh issue view <number> --web` or re-fetch JSON and verify triage line + all five sections render correctly.

## Guardrails

- **Do NOT implement fixes** — no product code edits, migrations, or PRs from this skill.
- Do not open, merge, or close PRs or issues unless the user explicitly asks after the resolved-state check.
- Do not expose secrets, tokens, or PII in the issue body or draft file.
- Do not guess affected users or matrix cells — mark uncertainty; use `AskQuestion` before finalizing the draft.
- Do not skip `gh issue edit` when clarification is complete — invoking the skill is the authorization to publish.
- Prefer `AGENTS.md` and `.cursor/rules/*.mdc` for stack conventions when interpreting findings.

## Handoff

After a successful GitHub update, tell the user:

- Link to the updated issue.
- Recommended next skill: `itil-problem-record` (deeper diagnosis) or `itil-issue-resolver` (implementation).
- Any remaining blockers or open product decisions that were surfaced (including unresolved `(assumption)` cells the user deferred).
