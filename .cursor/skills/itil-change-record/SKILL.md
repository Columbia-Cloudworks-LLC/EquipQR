---
name: itil-change-record
description: Simple implementation planning workflow for EquipQR. Use when the user asks for a plan, change record, implementation outline, or approval-ready scope before code. Produces a Composer 2.5 executable plan with XML boundaries, checkbox tracking, authorized commands, test-first verification, summary checkpoints, and stop conditions, then hands execution to itil-issue-resolver after approval.
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

Write the plan as a deterministic `plan.md`-style markdown document that follows `.cursor/rules/composer-plan-format.mdc`. The plan is optimized for Composer 2.5 execution and must use semantic XML-style boundary tags. Do not use triple backticks anywhere in the generated plan; boundary tags and markdown headers must start at column 0, and any nested examples, schemas, SQL, JSON, or commands must be free text indented with exactly four leading spaces. Reserve angle brackets for real section boundary tags; use {{placeholder text}} for generic fill-in values.

Use this compact shape and fill every placeholder with concrete repo details:

# Change Plan: {{request_title}}

<context-anchor>
Request: #{{number}} - {{request_title}} (or ad-hoc)
Goal: {{one paragraph}}
Stack: React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + TanStack Query + Vitest + React Testing Library on Windows PowerShell.
Required reading before edits: AGENTS.md, relevant .cursor/rules/*.mdc, relevant .cursor/skills/**/SKILL.md, and {{task-specific files}}.
Composer target: Composer 2.5 should be able to execute this without inferring missing files, commands, tests, or stop conditions.
Formatting rule: boundary tags and headers at column 0; nested snippets/examples at exactly four leading spaces; no triple backticks anywhere in this plan; use {{placeholder text}} for generic fill-in values.

External setup: {{steps, owner, credential/resource names, verification, or "None"}}
Branch/PR path: {{branch from origin/preview; push work branch after local verify; PR into preview per branching.mdc and pr-merge-ready-workflow.mdc; promote preview → main separately via /release}}
</context-anchor>

<execution-steps>
## Phase 1: Discovery
- [ ] Read {{exact files, symbols, routes, tables, policies, or functions}}.
- [ ] Confirm {{acceptance criteria and constraints}}.
- [ ] Append a short Phase 1 summary under <summary-checkpoints>.

## Phase 2: Test First
- [ ] Add or update {{test file}} to prove {{expected behavior}}.
- [ ] Run {{exact focused test command}} and confirm it fails for the expected reason before implementation.
- [ ] Append a short Phase 2 summary under <summary-checkpoints>.

## Phase 3: Implementation
- [ ] Edit {{file}} at {{symbol}} to {{specific change}}.
- [ ] Update related {{types, hooks, services, UI copy, RLS, migrations, fixtures, or docs}}.
- [ ] Append a short Phase 3 summary under <summary-checkpoints>.

## Phase 4: Verification
- [ ] Rerun {{exact focused test command}} and confirm it passes.
- [ ] Run {{exact lint/type/build/manual verification commands}}.
- [ ] Append a final verification summary under <summary-checkpoints>.

## Phase 5: Audit / Handoff
- [ ] Check `git status --short` and confirm only intended files changed.
- [ ] Follow the branch/PR path documented in <context-anchor>.
</execution-steps>

<authorized-commands>
- {{exact PowerShell-compatible command}}
- {{exact PowerShell-compatible command}}
</authorized-commands>

<verification-plan>
- [ ] Expected failing test before implementation: {{command and failure signal}}.
- [ ] Expected passing checks after implementation: {{commands and pass conditions}}.
- [ ] Manual checks: {{routes, browser steps, screenshots, or "None"}}.
</verification-plan>

<summary-checkpoints>
The execution agent must physically edit this plan file, mark each completed task with `- [x]`, and append summaries here at the end of each major phase.
</summary-checkpoints>

<stop-conditions>
- Stop if a needed command is not listed in <authorized-commands>.
- Stop if requirements, reviewer intent, external setup, or acceptance criteria are ambiguous.
- Stop if unrelated dirty product files would need to be touched.
- Stop if verification fails for reasons outside the planned change.
- Risks/backout: {{main risks and revert/backout path}}
</stop-conditions>

### 3. Keep It Executable

Plans should be Composer 2.5 executable by default:

- Name exact files and symbols.
- Name query keys, props, routes, tables, policies, env vars, or tests when known.
- List exact PowerShell-compatible terminal commands in `<authorized-commands>`; do not ask the execution agent to invent commands.
- Include test-first work for behavior changes: write/update the focused test, run it to the expected failure, then implement.
- Use only atomic markdown checkboxes and require the execution agent to update them in the plan file as work progresses.
- Include summary checkpoints after each major phase so the plan becomes the execution memory.
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
