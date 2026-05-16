---
name: itil-change-record
description: Mandates an ITIL-style Change Record as the only acceptable planning artifact before code in EquipQR. Requires Agent-mode pre-plan triage (GitHub issue + local codebase review), then explicit Plan mode for authoring the Change Record, written so the cheapest capable model can implement it. The Change Record is the user's "authorization to build" — the agent posts it on the linked GitHub issue BEFORE "build it", waits for explicit approval, then implements. Issue-tied work always uses a feature branch off origin/preview, push, and a PR into preview (including main worktree; no direct-push-to-preview shortcut for issue-tied flows under this skill). Implementation Steps end with a mandatory follow-up on the issue including commit SHA(s), PR link into preview, and closure tied to merge into preview, plus a three-URL completion gate (Change Record comment, PR, follow-up comment). Ideally seeded by itil-problem-record or itil-service-request; ad-hoc supported. Includes External Setup Procedures with vendor click paths and "could not confirm" callouts. Use for implementation plans, "draft the change record", "plan this", "scope this", or after Problem/Service Request when ready to authorize the fix.
---

# ITIL Change Record (EquipQR)

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| Incident Record | Output of [`itil-incident-record`](../itil-incident-record/SKILL.md) — production-verified reproduction with screenshot evidence + cross-system logs, posted on a GitHub issue |
| Problem Record | Output of [`itil-problem-record`](../itil-problem-record/SKILL.md) — root cause + reproduction posted on the issue |
| Change Record | The output of **this** skill — implementation plan drafted in Plan mode (after pre-plan triage) awaiting user approval |
| Change Implementation | What runs after the user approves the Change Record ("clicks build") |

This skill governs **pre-plan triage**, **Change Record authoring** (planning only, in Plan mode after triage), and **post-approval execution**. It does **not** authorize product code or repo mutations until the user explicitly approves the Change Record. The user is the change authority — implementation begins only after that approval.

## Pre-Plan Triage (required before drafting)

Complete this block **before** writing any Change Record body, `CreatePlan` payload, or GitHub Change Record comment. Triage is **read-only** with respect to product code: inspect issues, comments, and the codebase; do **not** implement fixes or refactors during triage.

**Mode gate**

- If you are in **Agent mode** when starting this skill: perform triage in Agent mode, then call `SwitchMode` to **Plan mode** before drafting the Change Record.
- If you are already in **Plan mode** when starting this skill: **switch to Agent mode** to complete triage, then call `SwitchMode` back to **Plan mode** before drafting the Change Record. (Plan mode alone is not sufficient if triage has not run.)

**GitHub triage (issue-tied work)**

- Read the linked issue: title, body, labels, assignees, and top-level discussion.
- **Preferred prefetch:** summarize issue metadata plus upstream artifact hints (`hasServiceRequestComment`, etc.) via:
  ```powershell
  .\scripts\itil\Get-ItilIssueContext.ps1 -Issue <number> -Json
  ```
  Fallback: `gh issue view <number> --json number,title,body,labels,state,assignees,comments,url`
- Locate upstream artifacts on the same thread (Problem Record, Service Request, Incident Record) and note constraints or open questions.
- Skim unresolved review threads or blockers that affect scope.

**Local codebase triage**

- Identify likely files, symbols, routes, tables/RLS, edge functions, or tests impacted by the request.
- Note dependencies, risks, and any ambiguities the Change Record must resolve with explicit steps.

**Triage output**

- Produce a short **triage summary** (in chat) that lists: issue scope, key code paths touched, open risks, and the branch name from **Branch & Commit Plan** — this summary feeds **Implementation Steps** and **Risk & Impact Analysis**.

Do not proceed to **Mandatory rules** Change Record drafting until triage is complete and you are in Plan mode.

## Mandatory rules

For **this repository only**:

1. **Pre-Plan Triage then Plan mode for authoring.** Complete **Pre-Plan Triage** above. After triage, you **must** be in Plan mode before drafting the Change Record markdown. Use `SwitchMode` as needed so the sequence is always: triage (Agent mode) → Plan mode → author Change Record → post to issue → `CreatePlan` → await approval.
2. **Exact structure.** Use the section headers below verbatim. Treat **Implementation Steps** as the strict execution roadmap — what gets implemented after approval.
3. **No product code during Change Record drafting.** Do not modify, create, or delete product files while drafting the Change Record. Plan mode enforces this for authoring; do not work around it. (Read-only triage reads and `gh` documentation comments are allowed as defined elsewhere in this skill.)
4. **Wait for approval.** After the Change Record is presented, **stop** and wait for the user to authorize the build (typical signals: "approved", "go", "proceed", "lgtm", "build it", or the user clicking the build/exit-plan-mode action).
5. **Post the Change Record as a comment on the linked GitHub issue BEFORE the user clicks "build it" — not after.** While in Plan mode, after authoring the Change Record body but BEFORE calling `CreatePlan`, post the Change Record as a comment on the GitHub issue tied to this change (the same issue referenced in **Short Description**). The change authority — the user — should see the Change Record on the issue thread alongside the upstream Service Request / Problem Record, because that is where ITIL audit review actually happens. Skip ONLY when the change is genuinely ad-hoc with no GitHub issue (per the **Inputs** section). The `gh issue comment` call is permitted in Plan mode as part of plan presentation (the Plan-mode prohibition on non-readonly tools is about codebase / config mutations, not the act of documenting the proposed plan on a GitHub issue thread). Capture the emitted comment URL and reference it in your chat message when presenting the plan, so the user can click through to the audit-trail copy. **Preferred Windows helper:** run `.\scripts\itil\Publish-ItilArtifact.ps1 -Issue <number> -ArtifactType ChangeRecord -BodyFile <temp-body.md> -Json` — the JSON envelope includes `commentUrl`. Fall back to `gh issue comment` if helper scripts are unavailable or error for reasons unrelated to the artifact. When revising metadata/body mid-flight, **prefer:** `.\scripts\itil\Update-ItilChangeRecordComment.ps1` (`-CommentUrl` or `-CommentId`, `-BodyFile <temp-complete.md>`); fallback: `gh api --method PATCH /repos/{owner}/{repo}/issues/comments/{id}`. Never post fragmented "revised" comments that abandon the authoritative thread.
6. **Implementation Steps MUST end with a final step that opens a PR into `preview` and posts a follow-up on the linked GitHub issue (issue-tied work).** After `git push` on the feature branch, **always** open a PR into `preview` with `gh pr create --base preview --head <branch>` for issue-tied Change Records governed by this skill — **including** when working in the main worktree at `C:\Users\viral\EquipQR`. Do **not** satisfy issue-tied execution by direct `git push origin preview` under this skill; the audit path is branch → push → PR → merge into `preview`. The follow-up comment MUST include: commit SHA(s); a **mandatory** markdown link to that PR; explicit wording that the issue is **fixed only once the PR merges into `preview`** (if not yet merged, state pending merge); link back to the Change Record comment URL from Mandatory rule 5; AI Verification outcomes; deviations or `None.`. Skip the PR and this follow-up ONLY when the Change Record is ad-hoc with no GitHub issue (use **Branch & Commit Plan** for ad-hoc integration).
7. **Plan for cheap implementation.** Write every Change Record so `Composer 2 (fast)` or Cursor Auto can execute it without architectural inference: name exact files, symbols, props, query keys, commands, fixtures, expected states, and stop conditions. If the plan cannot be made that explicit because the scope is too broad, split it into smaller Change Records until each slice is independently verifiable by a cheap model. Premium/MAX recommendations are allowed only when the remaining slice is indivisible for correctness or safety; document that reason in **Recommended Execution Model → Constraints surfaced**.
8. **Workflow completion gate (issue-tied).** Do not treat the workflow as complete until **all** of the following are captured and logged in chat: (a) Change Record GitHub comment URL, (b) PR URL into `preview`, (c) implementation follow-up GitHub comment URL. For ad-hoc work with no issue, (a) is skipped; still capture PR URL when a PR is opened.

If the user asks for code without a plan, complete **Pre-Plan Triage**, switch to Plan mode, produce the Change Record first, post it to the issue per Rule 5, then implement after approval.

## Inputs

The Change Record may be seeded by any of:

- **A Problem Record** (preferred for bugs): the output of `itil-problem-record`, posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements fix for Problem Record on #<issue>`) and reuse its **Root Cause** and **Recommended Resolution Direction** to drive **Implementation Steps**.
- **A Service Request** (preferred for features / enhancements / vendor integrations): the output of [`itil-service-request`](../itil-service-request/SKILL.md), posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements Service Request on #<issue>`) and reuse its **Scope**, **External Dependencies**, **Potential Costs**, and **Vendor-side Setup Procedures** to drive **Implementation Steps**, **External Dependencies**, **Risk & Impact Analysis**, and **External Setup Procedures**. The Service Request's Vendor-side Setup Procedures are the *research artifact*; the Change Record's **External Setup Procedures** is the *execution artifact* — the agent must re-validate the Service Request's steps against live vendor docs at Change Record drafting time (vendor UIs change), then embed the up-to-date version (with any clarifications, deltas, or newly-discovered "could not confirm" gaps) directly in the Change Record so the implementer does not have to cross-reference two documents during execution.
- **An ad-hoc request**: a feature or modification with no GitHub Incident. In this case, fill **Business Justification** carefully — there is no Problem Record or Service Request to lean on. Note in **Short Description** that there is no associated issue.

If a GitHub issue is referenced but **no** prior ITIL artifact exists yet, **STOP** and recommend the appropriate upstream skill: `itil-problem-record` for bugs / regressions / defects, `itil-service-request` for features / enhancements / vendor-cost asks. Do not skip the upstream step.

## When to read this skill

Read and follow this skill **every time** you:

- Are asked to create or revise an implementation plan for EquipQR.
- Begin this skill from **Agent** or **Plan** mode (triage first, then Plan-mode authoring per **Pre-Plan Triage** and **Mandatory rules**).
- Are switched to (or switch into) **Plan** mode for a change in this project.
- Are about to generate code for a new feature or behavioral change.
- Receive a "draft the change record", "plan this", or "scope this" request.
- Are following on from a posted Problem Record (`itil-problem-record`) where the user is ready to authorize the fix.

## Output format (copy this skeleton)

Use these **exact** top-level headers (`##`). Under **Testing Plan**, use the **exact** subheaders (`###`).

```markdown
## Short Description

[Concise summary of the change. If seeded by a Problem Record, include: "Implements fix for Problem Record on #<issue>." If ad-hoc, state: "Ad-hoc change — no associated GitHub issue."]

## Business Justification

[Why the change is being made and the value it provides. If seeded by a Problem Record, summarize the Scope of Impact in one or two sentences.]

## Implementation Steps

1. **(When tied to a GitHub issue — mandatory first execution step after approval)** Sync the issue branch from `origin/preview` before any product code edits: `git fetch origin preview`. Use the branch name from **Branch & Commit Plan**. If the branch does **not** exist locally: `git switch -c <branch> origin/preview` (branch off `origin/preview` per [branching rule](../../rules/branching.mdc)). If the branch **already** exists locally: `git switch <branch>`, then `git rebase origin/preview` (prefer rebase; if merge-from-preview is required by policy or conflict complexity, document that in the implementation follow-up). Resolve all conflicts; do not continue with product work until `git status` is clean on the synced branch. If ad-hoc with no issue, apply the same fetch/sync pattern to the branch named in **Branch & Commit Plan**.
2. [First product step — name files, functions, conditions, props, tables, policies]
3. […]
4. […]
N. **(Mandatory final step when this Change Record is tied to a GitHub issue)** After `git push` succeeds on the feature branch, **open a pull request into `preview`** with `gh pr create --base preview --head <branch> --title "<conventional-commit title>"` (use `--body-file` for multi-line PR bodies on PowerShell). **Issue-tied Change Records under this skill always require a PR** — including on the main worktree at `C:\Users\viral\EquipQR`; do **not** integrate via `git push origin preview`. PR body MUST link the issue (e.g. `Fixes #<number>` / `Resolves #<number>` / `Relates to #<number>` per repo convention). Capture the PR URL. Then post a follow-up comment on the linked issue (same `#<number>` as **Short Description**) using `gh issue comment <number> --repo <owner>/<repo> --body-file <temp-file>`. The follow-up body MUST contain: (a) one-line status like `Implemented in commit <sha-short> on branch <branch-name>`, (b) `Change Record: <change-record-comment-url>` (Mandatory rule 5), (c) **mandatory** `PR: [<title>](<pr-url>)` into `preview`, (d) explicit line that the issue is **fixed only when that PR merges into `preview`** (if not merged, append pending merge), (e) fenced list of AI Verification commands with pass/fail, (f) `**Deviations:**` bullets or `None.`. **Completion gate:** Log in chat all three URLs — Change Record comment, PR to `preview`, implementation follow-up comment. Skip this final step ONLY for ad-hoc Change Records with no GitHub issue.

## Testing Plan

### AI Verification

[Quantitative / concrete verification: exact commands, checks, or Cursor-driven steps to validate the change in code. Numbered steps. Examples: `npm run typecheck`, `npm run lint`, `npm run test -- <pattern>`, `npm run build`, targeted greps, Supabase migration lints. State what passing looks like.]

### User Verification

1. From the **repository root**, run `dev-stop.bat` to tear down the environment (assume dependent services are **not running** or may be in a **bad** state; always start from a clean slate).
2. [Start the app / stack fresh per project docs — name the exact script or command, e.g. dev server start — after the tear-down.]
3. [Ordered manual test steps in the local dev environment]
4. […]

## Risk & Impact Analysis

- **Business disruption**: [what could go wrong for users or operations]
- **Systems / files affected**: [specific areas: routes, DB, RLS, env, edge functions, etc.]
- **Probability of failure** (during deploy or test): [Low / Medium / High with rationale]
- **Mitigation**: [how risk is reduced or detected early]

## Backout Plan

[Exact steps to return to the previous stable state if the change fails or causes critical errors — e.g. revert commit, restore migration, rollback env flag, restore file from prior revision. Be specific to this change.]

## External Dependencies

[Explicit list: Supabase, Vercel, third-party APIs, webhooks, key material, etc.  
Call out **new** or **altered** API keys, secrets, or **prerequisite** actions in external consoles **before** any code that depends on them. If none, write "None.". When this Change Record requires any vendor-dashboard action, also fill out **External Setup Procedures** below — that is where the click-by-click steps live; this section is the *what*, the next section is the *how*.]

## External Setup Procedures

[Mandatory whenever the Change Record requires any 3rd-party dashboard action — provisioning a credential, upgrading a plan, opting into a paid feature, installing a marketplace plugin, configuring a webhook/SSO/SCIM destination, rotating a credential per vendor procedure, or anything else that requires the implementer to leave the IDE and click through a vendor portal. Skip this section ENTIRELY only when the change is fully implementable inside the EquipQR codebase with zero vendor-side dashboard interaction.

If a Service Request seeded this Change Record, this section is the **execution artifact** that re-validates and embeds the Service Request's **Vendor-side Setup Procedures**. Re-pull every vendor doc at Change Record drafting time (vendor UIs change between Service Request and Change Record); update any step that drifted; add new "could not confirm" callouts if a previously-documented path 404s or is now plan-locked; and embed the up-to-date version directly here so the implementer does not need to cross-reference two documents.

For each in-scope vendor-side action, populate one labeled subsection (A, B, C, …). Each subsection MUST start with a status line:

- **"Confirmed exists."** — followed by the source URL (vendor docs / pricing page / marketplace listing) and the date pulled.
- **"Confirmed exists in the EquipQR setup but currently <state>."** — when the feature is part of the EquipQR architecture today but in a non-default state (disabled, partially configured, etc.).
- **"Could not confirm — feature may not exist in the form the Change Record assumes."** — when vendor docs do not document the feature, or the documented path is plan-locked / region-locked / paywalled. **Tell the implementer explicitly that they may need to hunt for it, contact vendor support, or that the feature might not actually exist as described.** When this status appears, the Change Record's **Implementation Steps** must include an explicit "verify Section <X> succeeded before proceeding to Step <N>" gate.

Each subsection MUST include: click-by-click numbered steps using real UI labels, direct deep-link URLs whenever the vendor publishes them, vendor-specific gotchas (One-Time Read modes, required org-policy exemptions, platform-specific limitations, plan-tier gates), the post-setup verification step, and — for any action that costs money — a cross-link back to **Risk & Impact Analysis** so the financial impact is visible alongside the work.

End with a final subsection "X. Vendor-side actions that this Change Record does NOT trigger" (renumber the letter as needed) listing each commonly-imagined "I need to set up Y" action that is NOT required because the EquipQR vault / production project / vendor resource already exists. Use ❌ + one-line rationale per non-action.]

### A. <Action name — e.g. "Mint or rotate `<credential>`" or "Upgrade <vendor> to <plan>" or "Install <plugin>">

**<Status line — e.g. "Confirmed exists."> Source: <URL> (pulled <YYYY-MM-DD>).**

1. <Step 1 — real UI label, deep link if available>
2. <Step 2 — call out gotchas inline as sub-bullets when relevant>
3. <…>

[Verification step + cross-link to Risk & Impact Analysis if there is a cost or compliance implication.]

### B. <Next action…>

[…]

### X. Vendor-side actions that this Change Record does NOT trigger

[Rename the letter to match the actual count. Mandatory whenever pre-existing vendor resources might be misread as needing re-creation.]

- ❌ <Non-action> (<one-line rationale>)
- ❌ […]

## Branch & Commit Plan

- **Branch:** `<type>/issue-<number>-<kebab-slug>` (off `origin/preview`) — or `<type>/<kebab-slug>` if ad-hoc with no issue.
- **Commits:** Conventional Commits. If tied to an issue, commit body or PR body MUST reference the issue (e.g. `Resolves #<number>`) so merge into `preview` can close it when appropriate.
- **PR (issue-tied):** **Always** open a PR into `preview` after push with `gh pr create --base preview --head <branch>` — including from the main worktree at `C:\Users\viral\EquipQR`. Do **not** use the direct-push-to-`preview` shortcut for issue-tied work under this skill; repo-wide fast paths in [branching rule](../../rules/branching.mdc) rule 8 do not override this skill's audit requirement.
- **PR (ad-hoc):** Open a PR into `preview` when integrating via a feature branch; otherwise follow explicit user direction.
- **Issue fixed:** Only after the change is **integrated into `preview`** — PR merged into `preview` — not merely when commits exist on a feature branch or a push completes to that branch.

## Recommended Execution Model

[Embed verbatim the standardized **Recommended Execution Model** block produced by the [model-recommender](../model-recommender/SKILL.md) skill. Load `model-recommender` while drafting this Change Record, pass the work shape (file count, schema/RLS impact, capability requirements, context size from Implementation Steps), and explicitly state whether the plan has been split small enough for Composer 2 / Cursor Auto. Paste the resulting block here without paraphrasing. The block tells the implementer which specific model and Cursor tier to execute the Implementation Steps with. If `model-recommender` says the scope should be split, split this Change Record before presenting it. If it surfaces a constraint (deprecated model, training-policy concern, preview-tier flag, or indivisible reason for Premium/MAX), lead this section with a `> ⚠ Note:` callout above the embedded block — do not silently embed flagged recommendations.]

## Authorization

Status: **Awaiting user approval to build.**

This Change Record has already been posted as a comment on the linked GitHub issue (per Mandatory rule 5) — see the URL in the chat message above for the audit-trail copy. Review on the issue thread or in this Cursor plan panel; either is authoritative.

Reply "approved" / "go" / "build it" (or click the build action) to begin execution. The final Implementation Step will post a follow-up on the same issue with commit SHA, **mandatory** PR link into `preview`, and closure tied to **merge into `preview`**, closing the audit loop.
```

## Authoring constraints

- **Implementation Steps**: Numbered, ordered, **cheap-model executable** (clone/checkout assumptions, files to touch, symbols to edit, migrations order, props, query keys, fixture names, expected UI states, stop conditions, etc.). No "update the logic" — name the function, the condition, the table. Do not assume the implementer will infer architecture from vague prose. When **External Setup Procedures** has subsections, cross-reference them by letter (e.g. "Complete **Section A** before this step") so the implementer knows when to leave the IDE and when to come back.
- **User Verification**: Step **1** must **always** be running `dev-stop.bat` from the repo root; then bring services up cleanly; remaining steps are manual acceptance checks in local dev.
- **AI Verification**: No hand-waving — name **what** will be run or inspected and **what passing looks like**.
- **Backout Plan**: Must be **reversible** and **specific** (not "revert if broken" alone). For any vendor-side action listed in **External Setup Procedures**, the Backout Plan must include the corresponding rollback step (delete the new credential, downgrade the plan, uninstall the plugin, revoke the token, etc.) — vendor changes are not auto-reverted by `git revert`.
- **Branch & Commit Plan**: Must respect the [branching rule](../../rules/branching.mdc) — branch off `origin/preview`. For **issue-tied** Change Records under this skill, **always** integrate via a PR into `preview` (Mandatory rule 6); never target `main` unless the user said "hotfix".
- **Recommended Execution Model**: Mandatory. Load the [model-recommender](../model-recommender/SKILL.md) skill while drafting the Change Record (Plan mode allows reading `model-recommender` and the underlying report at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` — both are read-only operations). Pass the work shape inferred from **Implementation Steps**, **Risk & Impact Analysis**, and **External Dependencies** (file count, schema/RLS impact, capability requirements, context size), plus whether the plan is explicit enough for Composer 2 / Cursor Auto. Embed the resulting standardized block verbatim under **Recommended Execution Model** — no paraphrasing, no field deletions. If the recommendation would be Premium/MAX only because the plan is broad, split the Change Record further before presenting it. When the recommendation has a non-empty **Constraints surfaced** field (deprecated model, training-policy concern, preview-tier flag, or indivisible reason for Premium/MAX), lead the section with a `> ⚠ Note:` callout above the embedded block so the change authority cannot miss the flag. The recommendation guides the implementer's model selection during Post-approval execution.
- **External Setup Procedures**: Mandatory whenever the change requires any 3rd-party dashboard action. Each subsection must lead with a status line ("Confirmed exists." / "Confirmed exists in the EquipQR setup but currently <state>." / "Could not confirm — feature may not exist in the form the Change Record assumes."), include the live source URL + date pulled, use real UI labels in numbered steps, surface vendor-specific gotchas inline, end with a verification step, and cross-link cost-implication subsections back to **Risk & Impact Analysis**. When seeded by a Service Request, re-validate every Vendor-side Setup Procedure step against live vendor docs at Change Record drafting time and embed the up-to-date version directly here. Never rely on the implementer to cross-reference the Service Request comment during execution. Always include a final "actions this Change Record does NOT trigger" subsection when pre-existing vendor resources might be misread as needing re-creation.
- **GitHub-issue posting format (the Change Record comment, posted in Plan mode per Mandatory rule 5)**: The comment body is the verbatim Change Record markdown — same structure, same section headers, no rewrite. Lead with a `# Change Record — Issue #<number>` H1 + a one-line metadata block (`**Status:** Awaiting approval as of <YYYY-MM-DD> · **Drafted by:** @<github-handle> · **Authorizer:** the issue assignee or repo owner`) so a reader scanning the issue's comment timeline can immediately distinguish the Change Record from the upstream Service Request / Problem Record. When the user approves and execution begins, edit the comment in place — **`.\scripts\itil\Update-ItilChangeRecordComment.ps1` is strongly preferred**, but `gh api --method PATCH` remains the escape hatch—to flip metadata to `**Status:** Approved <YYYY-MM-DD HH:MM UTC> · **Authorized by:** @<github-handle> · **Implementation:** in progress`. When revising body mid-flight, PATCH the existing comment URL again rather than spawning net-new timelines.
- **Implementation follow-up comment format (the post-`git push` / post-PR-open comment, per Mandatory rule 6 and Implementation Steps final step)**: A SEPARATE comment from the Change Record comment, much shorter. Lead with `### Implemented — Issue #<number>` H3 + a one-line summary (`Implemented in commit [\`<sha-short>\`](<commit-url>) on branch \`<branch-name>\`. Change Record: <change-record-comment-url>.`). **Issue-tied:** add **mandatory** `PR: [<title>](<pr-url>)` into `preview` and `**Issue status:** Fixed when this PR merges into \`preview\`.` (if not yet merged, append ` — pending merge.`). **Ad-hoc:** include PR link when a PR was opened. Follow with: (a) a fenced bash block listing each AI Verification command and its pass/fail outcome, (b) any plan deviations as a `**Deviations:**` bullet list with one-line rationale per item (write `None.` if the plan executed exactly as authorized). Optional final line: `**Backout:** see Change Record → Backout Plan` if the change is non-trivial enough that the implementer wants to highlight rollback availability. Always post this as a NEW comment, never edit the Change Record comment to merge it in — separating "what was authorized" from "what shipped" is the entire point of the loop.

## Plan-mode posting (what happens BEFORE "build it")

While in Plan mode, after authoring the Change Record body but BEFORE calling `CreatePlan`, post the Change Record as a comment on the linked GitHub issue (per Mandatory rule 5). Skip ONLY when the change is genuinely ad-hoc with no GitHub issue. Posting procedure on PowerShell:

1. Write the Change Record markdown body to a UTF-8 temp file (prefer `tmp\` under the repo root or `$env:TEMP\`) — do NOT use `--body "..."` with multi-line content on PowerShell because `${{`, heredocs, or odd escapes explode (see `AGENTS.md`).
2. **Preferred:** validate headers + emit JSON with `commentUrl`:
   ```powershell
   .\scripts\itil\Publish-ItilArtifact.ps1 `
     -Issue <number> `
     -ArtifactType ChangeRecord `
     -BodyFile <temp-file.md> `
     -Json
   ```
3. **Fallback:** `gh issue comment <number> --repo <owner>/<repo> --body-file <temp-file>`.
4. Capture the emitted comment URL and **log it in your chat introduction** so the reviewer can pivot between GitHub and Cursor plan UI.
5. Delete the markdown temp file (`Remove-Item`) once URLs are logged.
6. Call `CreatePlan` with the same Change Record markdown so Cursor surfaces the approve/build affordance.
7. Wait for the user to authorize build ("approved", "go", etc.).

If revisions land before approval, PATCH the authoritative comment (**preferred:** `.\scripts\itil\Update-ItilChangeRecordComment.ps1` with `-CommentUrl`/`-CommentId`; **fallback:** `gh api repos/<owner>/<repo>/issues/comments/<id> --method PATCH --input <json-file>` housing `{"body": "...full refreshed markdown..."}`), rewrite the markdown temp artifact, replay the PATCH helper, refresh `CreatePlan`, and never orphan a second "revised" comment.

## Post-approval execution (what happens AFTER "build it")

Once the user authorizes the Change Record:

1. Switch from Plan mode to Agent mode (or accept the user's exit-plan-mode action).
2. **Edit the Change Record comment in place to flip the metadata block** (`**Status:** Approved …`). **Preferred:** regenerate the full `# Change Record` markdown + metadata into a UTF-8 temp file, then invoke `.\scripts\itil\Update-ItilChangeRecordComment.ps1 -CommentUrl <captured-change-record-url> -BodyFile <temp-body.md>` (or `-CommentId` if you persisted the REST id earlier). **Fallback:** `gh api repos/<owner>/<repo>/issues/comments/<comment-id> --method PATCH --input <json-file>` wrapping the rebuilt body in `{"body":...}`. Preserve the verbatim Change Record content except for deliberate metadata deltas.
3. **For each subsection in External Setup Procedures (in alphabetical order, A → B → C → …), execute the vendor-side steps BEFORE the corresponding code Implementation Step that depends on the result.** If a subsection's status line was "Could not confirm — feature may not exist in the form the Change Record assumes.", **STOP** at that point and ask the user how to proceed (skip the dependent code work, revise the plan, contact vendor support, etc.) instead of guessing. Vendor-side actions cannot be unit-tested away later — they must succeed before code is written against them.
4. Execute **Implementation Steps** in order, exactly as written, **except** defer the **last** step (mandatory GitHub follow-up per Mandatory rule 6) until after steps 8–9 below complete — that comment must publish only once `git push` and preview PR publication succeed on issue-tied flows. Prefer `.\scripts\itil\Start-ItilIssueBranch.ps1` for the scripted `git fetch` / `switch` / `rebase` dance described in Implementation Step **1**. If a revision invalidates execution, PATCH the authoritative Change Record comment again using `.\scripts\itil\Update-ItilChangeRecordComment.ps1` (fallback `gh api`) instead of spawning new comments.
5. Run every command in **AI Verification**. Fix in-scope failures and re-run; revert and re-plan if a fix expands scope.
6. Follow the **Branch & Commit Plan**. Stage only files implied by **Implementation Steps** — never `git add .`.
7. Commit with Conventional Commits referencing the issue (`Resolves #<number>`) when applicable. Push the feature branch (`git push -u origin <branch>` on first push).
8. **Open a PR into `preview` (issue-tied — mandatory):**
   ```powershell
   .\scripts\itil\New-ItilPreviewPr.ps1 `
     -Issue <number> `
     -Branch <branch-from-plan> `
     -Title "<conventional-commit title>" `
     -BodyFile <pr-body.md> `
     -Json
   ```
   The JSON payload echoes `prUrl`. **Fallback:** `gh pr create --base preview --head <branch> --title "<title>" --body-file <pr-body.md>`. Capture the PR URL manually if you fallback. Still **never** push issue-tied work straight to `preview` to dodge review.
9. **Execute the mandatory final Implementation Step (per Mandatory rule 6)** using **`.\scripts\itil\Publish-ItilImplementationFollowup.ps1`** so everything after AI Verification collapses into one JSON payload:
   ```powershell
   .\scripts\itil\Publish-ItilImplementationFollowup.ps1 `
     -Issue <number> `
     -ChangeRecordUrl <Mandatory-rule-5-comment-url> `
     -PrUrl <preview-pr-url> `
     [-PrTitle "<explicit PR title>"] `
     -VerificationFile .\tmp\itil-ai-verify.json `
     [-DeviationsFile .\tmp\itil-deviations.md] `
     -Json
   ```

   Omit `-PrTitle` when happy for `gh pr view` to infer the GitHub summary from `-PrUrl`.
   `VerificationFile` can be plaintext lines or JSON such as `[{ "command": "npm run lint", "pass": true }, { "command": "npm run type-check", "pass": false }]`. **Dry-run first** (`-DryRun -Json`) if you want a comment preview without mutation. **Fallback:** replicate the older manual recipe (`git rev-parse HEAD`, handcrafted markdown, `gh issue comment`). Log `followupUrl`, then satisfy Mandatory rule 8 URL triplet in chat — skipping this terminates the audit trail.

## Progressive disclosure

- Windows/GitHub bookkeeping scripts live alongside the repo helpers in [`scripts/itil/`](../../scripts/itil/) (`Get-ItilIssueContext.ps1`, `Publish-ItilArtifact.ps1`, `Update-ItilChangeRecordComment.ps1`, `Start-ItilIssueBranch.ps1`, `New-ItilPreviewPr.ps1`, `Publish-ItilImplementationFollowup.ps1`). Prefer them for condensed JSON summaries; revert to handcrafted `git`/`gh` only when a helper genuinely cannot run (missing checkout, flaky auth, etc.).
- For the prior ITIL step on bug / regression issues (reproducing and documenting the underlying problem), follow [itil-problem-record](../itil-problem-record/SKILL.md). The Problem Record is most rigorous when it builds on a prior [itil-incident-record](../itil-incident-record/SKILL.md) (production-verified reproduction + cross-system evidence on the GitHub issue).
- For the prior ITIL step on feature / enhancement / vendor-cost issues (feasibility, dollar-cost, and market-viability evaluation), follow [itil-service-request](../itil-service-request/SKILL.md).
- For the **Recommended Execution Model** section's specific model + Cursor tier choice, follow [model-recommender](../model-recommender/SKILL.md). It reads the EquipQR model research at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` and emits the standardized block this Change Record embeds verbatim.
- For EquipQR-specific runbooks (local stack, env files, MCP integrations), follow [toolbelt](../toolbelt/SKILL.md).
- For PR readiness after the branch is pushed and the PR is opened into `preview`, follow [raise](../raise/SKILL.md).
