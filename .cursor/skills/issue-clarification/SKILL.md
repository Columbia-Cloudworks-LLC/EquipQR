---
name: issue-clarification
description: Clarifies one open EquipQR GitHub issue before implementation by defining affected users, problem, success criteria, and codebase findings, then rewrites the issue body and title. Use when the user asks to clarify, triage, scope, or document an issue, or invokes /issue-clarification. Requires a valid open issue number or URL. Does not implement fixes.
disable-model-invocation: true
---

# Issue Clarification

## Purpose

Turn a raw or ambiguous GitHub issue into a structured, actionable record on the issue itself. This skill is **read-only for product code** — it updates the issue title and body only.

Hand off to `itil-problem-record` (root-cause depth) or `itil-issue-resolver` (implementation) only after the user authorizes the next step.

## Hard Gate — Issue Required

The user must provide an existing issue. If the user does not provide a valid issue number for this repository for an **OPEN** issue on GitHub, or a URL to the issue, **hard stop** and inform the user of the requirement. Do not proceed without a documented issue first.

### Resolve and validate the issue

```powershell
.\scripts\itil\Get-ItilIssueContext.ps1 -Issue "<number-or-url>" -Json
```

Or directly:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

**Stop immediately when:**

- The reference is missing, malformed, or not in this repository.
- `state` is not `OPEN` (closed issues are out of scope unless the user explicitly reopens first).
- The issue cannot be fetched (`gh issue view` fails).

Tell the user: *Provide an open GitHub issue number (e.g. `1234`) or issue URL for this repository before clarification can proceed.*

## Existing Structure Gate

Before editing, inspect the issue body for these section headers (markdown `##` or HTML `<summary>`):

- `Original Issue Body`
- `Affected User(s)`
- `Problem Statement`
- `Success Criterea`
- `Documented Findings`

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
- [ ] Affected user(s) defined
- [ ] Problem statement written
- [ ] Success criteria written (user perspective)
- [ ] origin/preview synced locally (integration tip)
- [ ] Relevant codebase areas documented
- [ ] Resolved-state check (if applicable)
- [ ] Issue body and title updated on GitHub
```

### 1. Review the issue

Read the full issue: title, body, labels, and comments. Extract reporter intent, environment, reproduction hints, screenshots, and any prior triage.

### 2. Define affected user(s)

Classify who is impacted. List users **in order of priority** (highest first). Use only the categories that apply; omit irrelevant ones.

**Priority order (highest → lowest):**

1. Potential New Customers
2. Developer
3. EquipQR Org Owners/Admins Only
4. EquipQR Users
5. Quickbooks Users
6. Google Drive Users
7. Unauthenticated Users

State **why** each listed user is affected.

### 3. Problem statement

Summarize what is wrong today in plain language. Separate observed behavior from assumptions. Note environment, roles, and data preconditions when known.

### 4. Intended outcome (success criteria)

State the intended outcome **from the user's perspective** — what they should be able to do or see when the issue is resolved. Use testable, user-visible criteria.

### 5. Sync `preview` and explore the codebase

Align the local tree with `origin/preview` (integration tip-of-tree) before code exploration. Use `origin/main` only when comparing production-shipped behavior.

```powershell
git fetch origin preview
git switch preview
git merge origin/preview
```

Review the **`origin/preview`** branch (current integration tip after sync) to locate potentially relevant files and areas the follow-up agent should explore first. Document:

- Likely routes, components, hooks, or services
- Edge functions, migrations, RLS, or RPC touchpoints
- Existing tests or E2E specs
- Related docs or permissions matrices

Use targeted search and `explore` when the surface is broad. **Do not implement fixes.**

### 6. Already-resolved check

If investigation suggests the issue is already fixed on `main`:

1. Search PR history linked to the issue or affected areas:

   ```powershell
   gh pr list --state merged --search "<issue-number> in:body" --json number,title,mergedAt,url
   gh issue view <number> --json timelineItems
   ```

2. Identify the PR that likely resolved it and cite evidence (merged PR, commit, or code path).
3. **Ask the user:** close the issue, or continue after a clarification follow-up session so the agent can understand the current state before proceeding.

Do not close the issue without explicit user approval.

### 7. Update the GitHub issue

Write the entire issue in **GitHub-supported HTML/Markdown** with expandable headers as follows:

| Section | Default state |
| --- | --- |
| Original Issue Body | collapsed |
| Affected User(s) | expanded |
| Problem Statement | expanded |
| Success Criterea | expanded |
| Documented Findings | expanded |

Use `<details>` / `<summary>` for expand/collapse. Collapsed sections omit `open`; expanded sections include `open`.

**Body template** — preserve the prior body verbatim inside *Original Issue Body*:

```html
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
<summary>Success Criterea</summary>

- …
- …

</details>

<details open>
<summary>Documented Findings</summary>

### Relevant areas (origin/preview)

- `path/to/file` — …

### Suggested first steps for follow-up agent

- …

### Resolution status

<not resolved | appears resolved — see PR #…>

</details>
```

**Title:** Update so it accurately and concisely reflects the current problem statement (not the original vague title).

**Apply updates** (use a UTF-8 body file on Windows per `git-powershell.mdc`):

```powershell
@"
<full new body>
"@ | Set-Content -Path "$env:TEMP\issue-<number>-body.md" -Encoding utf8

gh issue edit <number> --title "<new title>" --body-file "$env:TEMP\issue-<number>-body.md"
```

Confirm with:

```powershell
gh issue view <number> --web
```

Or re-fetch JSON and verify all five sections render correctly.

## Guardrails

- **Do NOT implement fixes** — no product code edits, migrations, or PRs from this skill.
- Do not open, merge, or close PRs unless the user explicitly asks after the resolved-state check.
- Do not expose secrets, tokens, or PII in the issue body.
- Do not guess affected users — infer from issue evidence and codebase; mark uncertainty explicitly.
- Prefer `AGENTS.md` and `.cursor/rules/*.mdc` for stack conventions when interpreting findings.

## Handoff

After the issue is updated, tell the user:

- Link to the updated issue.
- Recommended next skill: `itil-problem-record` (deeper diagnosis) or `itil-issue-resolver` (implementation) once scope is approved.
- Any blockers (closed issue, already structured body, appears already fixed).
