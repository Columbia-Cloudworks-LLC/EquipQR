---
name: itil-change-record
description: Mandates an ITIL-style Change Record as the only acceptable planning artifact before code in EquipQR, produced exclusively in Plan mode. The Change Record is the user's "authorization to build" — the agent generates it, posts it as a comment on the linked GitHub issue (BEFORE the user clicks "build it" so the change authority reviews it on the audit-trail thread, not just in Cursor's plan panel), waits for explicit approval, and only then begins implementation. Implementation Steps always include a mandatory final step that posts a follow-up comment on the same issue with the commit SHA(s) after `git push`, closing the audit loop. Ideally seeded by a prior itil-problem-record or itil-service-request, but may be invoked standalone for ad-hoc features. Includes External Setup Procedures — researched click-by-click steps for every vendor dashboard action the change requires, with "could not confirm" callouts when a feature can't be verified live. Use whenever creating or presenting an implementation plan, when the user says "draft the change record", "plan this", "scope this", or after a Problem Record or Service Request has been posted and the user is ready to authorize the fix.
---

# ITIL Change Record (EquipQR)

## How this fits the ITIL flow

This repository treats ITIL roles as follows:

| ITIL artifact | EquipQR equivalent |
|---|---|
| Incident Record | Output of [`itil-incident-record`](../itil-incident-record/SKILL.md) — production-verified reproduction with screenshot evidence + cross-system logs, posted on a GitHub issue |
| Problem Record | Output of [`itil-problem-record`](../itil-problem-record/SKILL.md) — root cause + reproduction posted on the issue |
| Change Record | The output of **this** skill — implementation plan in Plan mode awaiting user approval |
| Change Implementation | What runs after the user approves the Change Record ("clicks build") |

This skill produces the **Change Record only**. It does **not** modify code. The user is the change authority — implementation begins only after explicit approval.

## Mandatory rules

For **this repository only**:

1. **Plan mode is required.** If the agent is not already in Plan mode when this skill is read, the agent must call `SwitchMode` to switch to Plan mode before drafting the Change Record. The Change Record is a planning artifact and must not be authored from Agent mode.
2. **Exact structure.** Use the section headers below verbatim. Treat **Implementation Steps** as the strict execution roadmap — what gets implemented after approval.
3. **No code.** Do not modify, create, or delete files while drafting the Change Record. Plan mode enforces this; do not work around it.
4. **Wait for approval.** After the Change Record is presented, **stop** and wait for the user to authorize the build (typical signals: "approved", "go", "proceed", "lgtm", "build it", or the user clicking the build/exit-plan-mode action).
5. **Post the Change Record as a comment on the linked GitHub issue BEFORE the user clicks "build it" — not after.** While in Plan mode, after authoring the Change Record body but BEFORE calling `CreatePlan`, post the Change Record as a comment on the GitHub issue tied to this change (the same issue referenced in **Short Description**). The change authority — the user — should see the Change Record on the issue thread alongside the upstream Service Request / Problem Record, because that is where ITIL audit review actually happens. Skip ONLY when the change is genuinely ad-hoc with no GitHub issue (per the **Inputs** section). The `gh issue comment` call is permitted in Plan mode as part of plan presentation (the Plan-mode prohibition on non-readonly tools is about codebase / config mutations, not the act of documenting the proposed plan on a GitHub issue thread). Capture the comment URL `gh` returns and reference it in your chat message when presenting the plan, so the user can click through to the audit-trail copy. If the user revises the Change Record before approving (or mid-execution), edit the comment in place via `gh api --method PATCH /repos/{owner}/{repo}/issues/comments/{id}` — do not post follow-up "revised" comments that fragment the trail.
6. **Implementation Steps MUST end with a final step that posts a follow-up comment on the linked GitHub issue with the commit SHA(s) after `git push`.** This closes the audit loop: the issue's comment timeline reads upstream Service Request / Problem Record → Change Record → "Implemented in commit `<sha>`" follow-up. The follow-up comment template is in **Output format → Implementation Steps** below. The follow-up MUST link back to the original Change Record comment URL (captured per Rule 5) so a reader can pivot from "what shipped" to "what was authorized" in one click. Skip ONLY when the change is ad-hoc with no GitHub issue.

If the user asks for code without a plan, switch to Plan mode, produce the Change Record first, post it to the issue per Rule 5, then implement after approval.

## Inputs

The Change Record may be seeded by any of:

- **A Problem Record** (preferred for bugs): the output of `itil-problem-record`, posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements fix for Problem Record on #<issue>`) and reuse its **Root Cause** and **Recommended Resolution Direction** to drive **Implementation Steps**.
- **A Service Request** (preferred for features / enhancements / vendor integrations): the output of [`itil-service-request`](../itil-service-request/SKILL.md), posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements Service Request on #<issue>`) and reuse its **Scope**, **External Dependencies**, **Potential Costs**, and **Vendor-side Setup Procedures** to drive **Implementation Steps**, **External Dependencies**, **Risk & Impact Analysis**, and **External Setup Procedures**. The Service Request's Vendor-side Setup Procedures are the *research artifact*; the Change Record's **External Setup Procedures** is the *execution artifact* — the agent must re-validate the Service Request's steps against live vendor docs at Change Record drafting time (vendor UIs change), then embed the up-to-date version (with any clarifications, deltas, or newly-discovered "could not confirm" gaps) directly in the Change Record so the implementer does not have to cross-reference two documents during execution.
- **An ad-hoc request**: a feature or modification with no GitHub Incident. In this case, fill **Business Justification** carefully — there is no Problem Record or Service Request to lean on. Note in **Short Description** that there is no associated issue.

If a GitHub issue is referenced but **no** prior ITIL artifact exists yet, **STOP** and recommend the appropriate upstream skill: `itil-problem-record` for bugs / regressions / defects, `itil-service-request` for features / enhancements / vendor-cost asks. Do not skip the upstream step.

## When to read this skill

Read and follow this skill **every time** you:

- Are asked to create or revise an implementation plan for EquipQR.
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

1. [Actionable step — clear enough for a junior developer; name files, functions, conditions, props, tables, policies]
2. […]
3. […]
N. **(Mandatory final step, when this Change Record is tied to a GitHub issue)** After `git push` succeeds, post a follow-up comment on the linked issue (the same `#<number>` referenced in **Short Description**) using `gh issue comment <number> --repo <owner>/<repo> --body-file <temp-file>`. The follow-up body MUST contain: (a) a one-line status summary like `Implemented in commit <sha-short> on branch <branch-name>`, (b) a markdown link back to the Change Record comment URL captured at plan-presentation time per Mandatory rule 5 (e.g. `Change Record: <url>`), (c) one line per AI Verification command that ran with its pass/fail outcome, (d) any deviations from the original plan (steps that proved wrong mid-flight and were amended) with a one-line rationale per deviation. Skip this final step ONLY when the Change Record is ad-hoc with no GitHub issue.

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
- **Commits:** Conventional Commits. If tied to an issue, body includes `Resolves #<number>`.
- **PR target:** `preview` (per [branching rule](../../rules/branching.mdc)).

## Recommended Execution Model

[Embed verbatim the standardized **Recommended Execution Model** block produced by the [model-recommender](../model-recommender/SKILL.md) skill. Load `model-recommender` while drafting this Change Record, pass the work shape (file count, schema/RLS impact, capability requirements, context size from Implementation Steps), and paste the resulting block here without paraphrasing. The block tells the implementer which specific model and Cursor tier to execute the Implementation Steps with. If `model-recommender` surfaces a constraint (deprecated model, training-policy concern, preview-tier flag), lead this section with a `> ⚠ Note:` callout above the embedded block — do not silently embed flagged recommendations.]

## Authorization

Status: **Awaiting user approval to build.**

This Change Record has already been posted as a comment on the linked GitHub issue (per Mandatory rule 5) — see the URL in the chat message above for the audit-trail copy. Review on the issue thread or in this Cursor plan panel; either is authoritative.

Reply "approved" / "go" / "build it" (or click the build action) to begin execution. The final Implementation Step will post a follow-up comment on the same issue with the commit SHA after `git push`, closing the audit loop.
```

## Authoring constraints

- **Implementation Steps**: Numbered, ordered, **junior-executable** (clone/checkout assumptions, files to touch, migrations order, feature flags, etc.). No "update the logic" — name the function, the condition, the table. When **External Setup Procedures** has subsections, cross-reference them by letter (e.g. "Complete **Section A** before this step") so the implementer knows when to leave the IDE and when to come back.
- **User Verification**: Step **1** must **always** be running `dev-stop.bat` from the repo root; then bring services up cleanly; remaining steps are manual acceptance checks in local dev.
- **AI Verification**: No hand-waving — name **what** will be run or inspected and **what passing looks like**.
- **Backout Plan**: Must be **reversible** and **specific** (not "revert if broken" alone). For any vendor-side action listed in **External Setup Procedures**, the Backout Plan must include the corresponding rollback step (delete the new credential, downgrade the plan, uninstall the plugin, revoke the token, etc.) — vendor changes are not auto-reverted by `git revert`.
- **Branch & Commit Plan**: Must respect the [branching rule](../../rules/branching.mdc) — branch off `preview`, PR into `preview`, never `main` unless the user said "hotfix".
- **Recommended Execution Model**: Mandatory. Load the [model-recommender](../model-recommender/SKILL.md) skill while drafting the Change Record (Plan mode allows reading `model-recommender` and the underlying report at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` — both are read-only operations). Pass the work shape inferred from **Implementation Steps**, **Risk & Impact Analysis**, and **External Dependencies** (file count, schema/RLS impact, capability requirements, context size). Embed the resulting standardized block verbatim under **Recommended Execution Model** — no paraphrasing, no field deletions. When the recommendation has a non-empty **Constraints surfaced** field (deprecated model, training-policy concern, preview-tier flag), lead the section with a `> ⚠ Note:` callout above the embedded block so the change authority cannot miss the flag. The recommendation guides the implementer's model selection during Post-approval execution.
- **External Setup Procedures**: Mandatory whenever the change requires any 3rd-party dashboard action. Each subsection must lead with a status line ("Confirmed exists." / "Confirmed exists in the EquipQR setup but currently <state>." / "Could not confirm — feature may not exist in the form the Change Record assumes."), include the live source URL + date pulled, use real UI labels in numbered steps, surface vendor-specific gotchas inline, end with a verification step, and cross-link cost-implication subsections back to **Risk & Impact Analysis**. When seeded by a Service Request, re-validate every Vendor-side Setup Procedure step against live vendor docs at Change Record drafting time and embed the up-to-date version directly here. Never rely on the implementer to cross-reference the Service Request comment during execution. Always include a final "actions this Change Record does NOT trigger" subsection when pre-existing vendor resources might be misread as needing re-creation.
- **GitHub-issue posting format (the Change Record comment, posted in Plan mode per Mandatory rule 5)**: The comment body is the verbatim Change Record markdown — same structure, same section headers, no rewrite. Lead with a `# Change Record — Issue #<number>` H1 + a one-line metadata block (`**Status:** Awaiting approval as of <YYYY-MM-DD> · **Drafted by:** @<github-handle> · **Authorizer:** the issue assignee or repo owner`) so a reader scanning the issue's comment timeline can immediately distinguish the Change Record from the upstream Service Request / Problem Record. When the user approves and execution begins, edit the comment in place via `gh api --method PATCH` to flip the metadata block to `**Status:** Approved <YYYY-MM-DD HH:MM UTC> · **Authorized by:** @<github-handle> · **Implementation:** in progress`. When revising the Change Record body mid-flight, edit the same comment in place again — do not post a series of "revised" comments that fragment the audit trail.
- **Implementation follow-up comment format (the post-`git push` comment, per Mandatory rule 6 and Implementation Steps final step)**: A SEPARATE comment from the Change Record comment, much shorter. Lead with `### Implemented — Issue #<number>` H3 + a one-line summary (`Implemented in commit [\`<sha-short>\`](<commit-url>) on branch \`<branch-name>\`. Change Record: <change-record-comment-url>.`). Follow with: (a) a fenced bash block listing each AI Verification command and its pass/fail outcome, (b) any plan deviations as a `**Deviations:**` bullet list with one-line rationale per item (write `None.` if the plan executed exactly as authorized). Optional final line: `**Backout:** see Change Record → Backout Plan` if the change is non-trivial enough that the implementer wants to highlight rollback availability. Always post this as a NEW comment, never edit the Change Record comment to merge it in — separating "what was authorized" from "what shipped" is the entire point of the loop.

## Plan-mode posting (what happens BEFORE "build it")

While in Plan mode, after authoring the Change Record body but BEFORE calling `CreatePlan`, post the Change Record as a comment on the linked GitHub issue (per Mandatory rule 5). Skip ONLY when the change is genuinely ad-hoc with no GitHub issue. Posting procedure on PowerShell:

1. Write the Change Record markdown body to a temp file (e.g. under `tmp\` or `$env:TEMP\`) — do NOT use `--body "..."` with multi-line content on PowerShell, the parser breaks on `${{`, on heredocs, and on most multi-line escapes (per `AGENTS.md` PowerShell conventions).
2. Run `gh issue comment <number> --repo <owner>/<repo> --body-file <temp-file>`.
3. Capture the comment URL the command emits. **Log the URL in your chat message that introduces the plan**, so the user has a clickable link to the audit-trail copy and can review on GitHub or in the Cursor plan panel — either is authoritative.
4. Delete the temp file with `Remove-Item`.
5. Call `CreatePlan` with the same Change Record body so the in-Cursor plan UI surfaces the build action.
6. Wait for the user to click "build it" / reply "approved" / etc.

If the user revises the Change Record before approving, edit the same comment in place via `gh api --method PATCH "repos/<owner>/<repo>/issues/comments/<id>" --input <temp-file-with-{body:...}-json>`, then call `CreatePlan` again with the revised body to refresh the plan UI. Never post a follow-up "revised" comment that fragments the audit trail.

## Post-approval execution (what happens AFTER "build it")

Once the user authorizes the Change Record:

1. Switch from Plan mode to Agent mode (or accept the user's exit-plan-mode action).
2. **Edit the Change Record comment in place to flip the metadata block** from `**Status:** Awaiting approval as of <date>` to `**Status:** Approved <YYYY-MM-DD HH:MM UTC> · **Authorized by:** @<github-handle> · **Implementation:** in progress`. Use `gh api --method PATCH "repos/<owner>/<repo>/issues/comments/<id>" --input <temp-file-with-{body:...}-json>`. This is a single-line edit to the metadata header; the body remains the verbatim Change Record.
3. **For each subsection in External Setup Procedures (in alphabetical order, A → B → C → …), execute the vendor-side steps BEFORE the corresponding code Implementation Step that depends on the result.** If a subsection's status line was "Could not confirm — feature may not exist in the form the Change Record assumes.", **STOP** at that point and ask the user how to proceed (skip the dependent code work, revise the plan, contact vendor support, etc.) instead of guessing. Vendor-side actions cannot be unit-tested away later — they must succeed before code is written against them.
4. Execute **Implementation Steps** in order, exactly as written. No scope creep, no opportunistic refactors. If a step proves wrong mid-flight, **STOP**, report it, amend the Change Record (and edit the GitHub comment in place per the Plan-mode revise rule above), then continue.
5. Run every command in **AI Verification**. Fix in-scope failures and re-run; revert and re-plan if a fix expands scope.
6. Follow the **Branch & Commit Plan**. Stage only files implied by **Implementation Steps** — never `git add .`.
7. Commit with Conventional Commits referencing the issue (`Resolves #<number>`) when applicable. Push the branch. Open the PR (`--base preview`) only if the user asks.
8. **Execute the mandatory final Implementation Step (per Mandatory rule 6)**: post a follow-up comment on the linked issue using the format defined in **Authoring constraints → Implementation follow-up comment format**. Capture the commit SHA from `git rev-parse HEAD` (or from `git log -1 --format=%H`), the short SHA from `git rev-parse --short HEAD`, the branch name, the AI Verification outcomes from your earlier execution, and any deviations from the original plan. Write the body to a temp file, post via `gh issue comment <number> --repo <owner>/<repo> --body-file <temp-file>`, capture the comment URL, log it in chat, and delete the temp file. **This step is mandatory whenever the Change Record is tied to a GitHub issue and is the final action of the entire flow** — without it, the audit loop is open.

## Progressive disclosure

- For the prior ITIL step on bug / regression issues (reproducing and documenting the underlying problem), follow [itil-problem-record](../itil-problem-record/SKILL.md). The Problem Record is most rigorous when it builds on a prior [itil-incident-record](../itil-incident-record/SKILL.md) (production-verified reproduction + cross-system evidence on the GitHub issue).
- For the prior ITIL step on feature / enhancement / vendor-cost issues (feasibility, dollar-cost, and market-viability evaluation), follow [itil-service-request](../itil-service-request/SKILL.md).
- For the **Recommended Execution Model** section's specific model + Cursor tier choice, follow [model-recommender](../model-recommender/SKILL.md). It reads the EquipQR model research at `docs/ops/ci-cd-workshop/AI Model Comparison Report  28 Models Across 6 Families (April 2026).md` and emits the standardized block this Change Record embeds verbatim.
- For EquipQR-specific runbooks (local stack, env files, MCP integrations), follow [toolbelt](../toolbelt/SKILL.md).
- For PR readiness once the branch is pushed, follow [raise](../raise/SKILL.md).
