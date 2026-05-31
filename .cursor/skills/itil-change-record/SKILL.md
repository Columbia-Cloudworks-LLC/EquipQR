---
name: itil-change-record
description: Simple implementation planning workflow for EquipQR. Use when the user asks for a plan, change record, implementation outline, or approval-ready scope before code. Produces a concise executable plan and then hands execution to itil-issue-resolver after approval.
---

# ITIL Change Plan

## Purpose

Create a practical implementation plan, not a ceremony-heavy audit packet. Use this when the change is large enough that the agent should pause and state the intended files, risks, verification, and rollout path before editing.

Small, obvious issue fixes can skip this skill and go straight to `itil-issue-resolver` when the user has authorized implementation.

## Inputs

Accept any of:

- A GitHub issue or PR reference.
- A Problem Summary from `itil-problem-record`.
- A Service Summary from `itil-service-request`.
- A direct user request for a plan.

If important facts are missing, gather them before writing the plan. Use `explore` for broad codebase discovery and `docs-researcher` for vendor/API documentation.

## Workflow

### 1. Triage

Read the issue or request and identify:

- Desired outcome and acceptance criteria.
- Files, symbols, tables, routes, edge functions, or workflows likely to change.
- Permission, RLS, multi-tenant, privacy, or vendor risks.
- Tests and manual checks that should prove success.
- Whether external setup is required before code.

### 2. Write The Plan

Use this compact format:

```markdown
## Change Plan

- **Request:** #<number> - <title> (or ad-hoc)
- **Goal:** <one paragraph>
- **Approach:** <short implementation strategy>
- **Files/surfaces:** <specific paths, symbols, routes, tables, functions>
- **Implementation steps:**
  1. <concrete step>
  2. <concrete step>
  3. <concrete step>
- **External setup:** <steps, owner, verification, or "None">
- **Verification:** <exact commands and manual checks>
- **Risks/backout:** <main risks and revert/backout path>
- **Branch/PR path:** <direct preview push when allowed by workflow rules, or branch -> PR into preview for issue-tied/formal work>
- **Stop conditions:** <what should make the implementer pause>
```

### 3. Keep It Executable

Plans should be cheap-model executable by default:

- Name exact files and symbols.
- Name query keys, props, routes, tables, policies, env vars, or tests when known.
- Avoid vague steps like "wire this up" or "fix logic".
- Split the plan if it requires unrelated changes.

### 4. Handoff

After the user approves, execute with `itil-issue-resolver` for issue-tied work or normal Agent-mode implementation for small ad-hoc work.

## Guardrails

- Do not require Plan mode, `CreatePlan`, GitHub comments, or model recommendations.
- Do not post to GitHub unless the user asks or the active workflow requires an audit comment.
- Do not force a PR when the repo's current branching rule allows direct push, except when the user explicitly wants the formal issue workflow.
- Keep vendor setup explicit when required; do not hide it inside prose.
- Never include secrets or token values.
