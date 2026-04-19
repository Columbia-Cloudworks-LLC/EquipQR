---
name: itil-change-record
description: Mandates an ITIL-style Change Record as the only acceptable planning artifact before code in EquipQR, produced exclusively in Plan mode. The Change Record is the user's "authorization to build" — the agent generates it, presents it, and waits for explicit approval before any implementation. Ideally seeded by a prior itil-problem-record (the GitHub-issue Problem Record), but may be invoked standalone for ad-hoc features or modifications. Use whenever creating or presenting an implementation plan, when the user says "draft the change record", "plan this", "scope this", or after a Problem Record has been posted and the user is ready to authorize the fix — read this skill first and output the Change Record verbatim structure.
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

If the user asks for code without a plan, switch to Plan mode, produce the Change Record first, then implement after approval.

## Inputs

The Change Record may be seeded by any of:

- **A Problem Record** (preferred for bugs): the output of `itil-problem-record`, posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements fix for Problem Record on #<issue>`) and reuse its **Root Cause** and **Recommended Resolution Direction** to drive **Implementation Steps**.
- **A Service Request** (preferred for features / enhancements / vendor integrations): the output of [`itil-service-request`](../itil-service-request/SKILL.md), posted on the relevant GitHub issue. Reference it in the **Short Description** (`Implements Service Request on #<issue>`) and reuse its **Scope**, **External Dependencies**, and **Potential Costs** to drive **Implementation Steps**, **External Dependencies**, and **Risk & Impact Analysis**.
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
Call out **new** or **altered** API keys, secrets, or **prerequisite** actions in external consoles **before** any code that depends on them. If none, write "None.".]

## Branch & Commit Plan

- **Branch:** `<type>/issue-<number>-<kebab-slug>` (off `origin/preview`) — or `<type>/<kebab-slug>` if ad-hoc with no issue.
- **Commits:** Conventional Commits. If tied to an issue, body includes `Resolves #<number>`.
- **PR target:** `preview` (per [branching rule](../../rules/branching.mdc)).

## Authorization

Status: **Awaiting user approval to build.**

Reply "approved" / "go" / "build it" (or click the build action) to begin Phase 3 (execution).
```

## Authoring constraints

- **Implementation Steps**: Numbered, ordered, **junior-executable** (clone/checkout assumptions, files to touch, migrations order, feature flags, etc.). No "update the logic" — name the function, the condition, the table.
- **User Verification**: Step **1** must **always** be running `dev-stop.bat` from the repo root; then bring services up cleanly; remaining steps are manual acceptance checks in local dev.
- **AI Verification**: No hand-waving — name **what** will be run or inspected and **what passing looks like**.
- **Backout Plan**: Must be **reversible** and **specific** (not "revert if broken" alone).
- **Branch & Commit Plan**: Must respect the [branching rule](../../rules/branching.mdc) — branch off `preview`, PR into `preview`, never `main` unless the user said "hotfix".

## Post-approval execution (what happens after "build it")

Once the user authorizes the Change Record:

1. Switch from Plan mode to Agent mode (or accept the user's exit-plan-mode action).
2. Execute **Implementation Steps** in order, exactly as written. No scope creep, no opportunistic refactors. If a step proves wrong mid-flight, **STOP**, report it, and amend the Change Record before continuing.
3. Run every command in **AI Verification**. Fix in-scope failures and re-run; revert and re-plan if a fix expands scope.
4. Follow the **Branch & Commit Plan**. Stage only files implied by **Implementation Steps** — never `git add .`.
5. Commit with Conventional Commits referencing the issue (`Resolves #<number>`) when applicable. Push the branch. Open the PR (`--base preview`) only if the user asks.

## Progressive disclosure

- For the prior ITIL step on bug / regression issues (reproducing and documenting the underlying problem), follow [itil-problem-record](../itil-problem-record/SKILL.md). The Problem Record is most rigorous when it builds on a prior [itil-incident-record](../itil-incident-record/SKILL.md) (production-verified reproduction + cross-system evidence on the GitHub issue).
- For the prior ITIL step on feature / enhancement / vendor-cost issues (feasibility, dollar-cost, and market-viability evaluation), follow [itil-service-request](../itil-service-request/SKILL.md).
- For EquipQR-specific runbooks (local stack, env files, MCP integrations), follow [toolbelt](../toolbelt/SKILL.md).
- For PR readiness once the branch is pushed, follow [raise](../raise/SKILL.md).
