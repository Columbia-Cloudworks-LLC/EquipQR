---
name: itil-change-record-planning
description: Mandates an ITIL-style Change Record as the only acceptable planning artifact before code for new features or modifications in EquipQR. Use whenever creating or presenting an implementation plan, entering Plan mode for this repo, scoping a change, or before writing production code for a requested feature—read this skill first and output the Change Record verbatim structure.
---

# ITIL Change Record Planning (EquipQR)

## Mandatory rule

For **this repository only**, before writing or editing implementation code for a **new feature** or **modification**, the agent must produce a plan formatted **exactly** as an **ITIL Change Record** using the section headers below. Treat **Implementation Steps** as the strict execution roadmap.

If the user asks for code without a plan, produce the Change Record first, then implement.

## When to read this skill

Read and follow this skill **every time** you:

- Create or revise an implementation plan for EquipQR
- Switch to or operate in **Plan** mode for a change in this project
- Are about to generate code for a new feature or behavioral change

## Output format (copy this skeleton)

Use these **exact** top-level headers (`##`). Under **Testing Plan**, use the **exact** subheaders (`###`).

```markdown
## Short Description

[Concise summary of the change]

## Business Justification

[Why the change is being made and the value it provides]

## Implementation Steps

1. [Actionable step — clear enough for a junior developer]
2. […]
3. […]

## Testing Plan

### AI Verification

[Quantitative / concrete verification: exact commands, checks, or Cursor-driven steps you will run to validate the change in code (e.g. typecheck, tests, lint, targeted greps, build). List them as numbered steps.]

### User Verification

1. From the **repository root**, run `dev-stop.bat` to tear down the environment (assume dependent services are **not running** or may be in a **bad** state; always start from a clean slate).
2. [Start the app / stack fresh per project docs—name the exact script or command, e.g. dev server start—after the tear-down.]
3. [Ordered manual test steps in the local dev environment]
4. […]

## Risk & Impact Analysis

- **Business disruption**: [what could go wrong for users or operations]
- **Systems / files affected**: [specific areas: routes, DB, RLS, env, etc.]
- **Probability of failure** (during deploy or test): [Low / Medium / High with rationale]
- **Mitigation**: [how risk is reduced or detected early]

## Backout Plan

[Exact steps to return to the previous stable state if the change fails or causes critical errors—e.g. revert commit, restore migration, rollback env flag, restore file from prior revision. Be specific to this change.]

## External Dependencies

[Explicit list: Supabase, Vercel, third-party APIs, webhooks, key material, etc.  
Call out **new** or **altered** API keys, secrets, or **prerequisite** actions in external consoles **before** any code that depends on them.]
```

## Authoring constraints

- **Implementation Steps**: Numbered, ordered, **junior-executable** (clone/checkout assumptions, files to touch, migrations order, feature flags, etc.).
- **User Verification**: Step **1** must **always** be running `dev-stop.bat` from the repo root; then bring services up cleanly; remaining steps are manual acceptance checks in local dev.
- **AI Verification**: No hand-waving—name **what** will be run or inspected and **what passing looks like**.
- **Backout Plan**: Must be **reversible** and **specific** (not “revert if broken” alone).

## Progressive disclosure

For EquipQR-specific runbooks (local stack, env files), follow [toolbelt](../toolbelt/SKILL.md) after the Change Record is written.
