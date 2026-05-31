---
name: itil-incident-record
description: Lightweight bug intake for EquipQR. Use when the user reports a bug, asks to reproduce a symptom, or wants an incident documented. Captures one symptom, gathers only the evidence needed, and hands off to implementation or deeper triage without requiring the old multi-stage ITIL ceremony.
---

# ITIL Incident Intake

## Purpose

Turn one bug report or observed symptom into a clear, actionable incident summary. This skill is intentionally lightweight: it does not require the old Incident -> Problem -> Change Record chain, a project-board pass, or mandatory external telemetry sweeps.

## Operating Rules

1. Handle exactly one symptom per invocation.
2. Prefer the smallest evidence set that proves the current state.
3. Use subagents for discovery when they save context:
   - `explore` for broad codebase discovery.
   - `docs-researcher` for current vendor or API docs.
   - `ci-investigator` only when the symptom is a failing PR check.
4. Use available MCPs opportunistically, not by checklist. For production evidence, prefer the MCPs currently enabled in the workspace, such as Supabase, Vercel, Datadog, Grafana, and GitHub CLI.
5. Do not modify product code from this skill. If the user authorizes a fix, hand off to `itil-issue-resolver`.

## Workflow

### 1. Confirm The Target

Proceed only when there is a specific issue, URL, page, user action, or error message. If the report is vague or bundles multiple symptoms, ask for one target symptom.

If a GitHub issue is named, read it with:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

### 2. Gather Evidence

Choose the evidence path that matches the symptom:

- UI behavior: use the browser MCP when available, capture one screenshot or snapshot of the failing state, and record console/network failures if relevant.
- Data/auth/API behavior: inspect the relevant Supabase/Vercel logs or code paths.
- Build/CI behavior: inspect the failing check and recent commits.
- Code-only regression: use `rg`, `Glob`, `ReadFile`, or the `explore` subagent to locate the affected code.

Do not block on a telemetry system that is not enabled or relevant.

### 3. Write The Incident Summary

Use this compact format in chat or as a GitHub issue comment:

```markdown
## Incident Summary

- **Issue:** #<number> - <title> (or "Ad-hoc report")
- **Symptom:** <one sentence>
- **Environment:** <production | preview | local | CI | unknown>
- **Reproduction status:** <reproduced | not reproduced | partially reproduced | evidence-only>
- **Evidence:** <screenshots, logs, console/network lines, failing command, or code references>
- **Likely affected surface:** <route, component, service, table, function, workflow>
- **Severity:** <P1 | P2 | P3> - <short rationale>
- **Next step:** <implement with `itil-issue-resolver` | return to reporter | deeper investigation needed>
```

### 4. Handoff

- If the issue is clear and fixable, recommend `itil-issue-resolver`.
- If the issue lacks reproduction detail, ask the reporter for the missing page, action, account/role, timestamp, browser, and expected result.
- If evidence shows the bug is already fixed, summarize the fix commit/version if known and ask before closing the issue.

## Guardrails

- Do not fabricate screenshots, logs, or reproduction results.
- Do not paste secrets, tokens, JWTs, auth headers, or PII into chat or GitHub.
- Do not require a Change Record unless the user explicitly asks for one.
- Do not create new labels, project items, or tracking issues unless the user asks.
