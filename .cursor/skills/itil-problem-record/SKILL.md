---
name: itil-problem-record
description: Lightweight root-cause triage for one EquipQR bug issue. Use when the user asks to investigate, diagnose, reproduce, or explain a bug before implementation. Produces a concise problem summary and recommended fix direction, then hands off to itil-issue-resolver when the user authorizes implementation.
---

# ITIL Problem Triage

## Purpose

Find the root cause or current best explanation for one bug, without forcing the old multi-artifact workflow. This skill is read-only unless the user explicitly asks for issue comments or labels.

## Inputs

Accept exactly one of:

- A GitHub issue number or URL.
- A single pasted bug report with enough detail to identify the affected surface.
- A current failing CI check or local error tied to one behavior.

If the target is unclear or includes multiple bugs, ask the user to choose one.

## Workflow

### 1. Read The Report

For GitHub issues:

```powershell
gh issue view <number> --json number,title,body,labels,state,comments,url
```

Extract:

- Observed behavior.
- Expected behavior.
- Environment.
- Reproduction steps, if present.
- Any screenshots, logs, stack traces, or affected records.

### 2. Discover The Affected Surface

Use direct repo tools for narrow searches. Use the `explore` subagent when the affected surface is broad or unfamiliar.

Ask `explore` to return:

- Likely files and symbols.
- Relevant tests.
- Data, RLS, auth, or integration touchpoints.
- Recent nearby changes if relevant.
- Open risks or missing context.

### 3. Establish Ground Truth

Use the cheapest reliable verification path:

- For code/test failures: reproduce with the targeted command.
- For UI bugs: use the browser MCP when the local or target environment is available.
- For data/auth issues: inspect Supabase-facing code, migrations, RLS, and relevant logs if enabled.
- For production-only issues: query only the relevant enabled observability source.

If the local stack is down, do not turn the environment problem into product speculation. Report the blocker and the exact probe that failed.

### 4. Produce The Problem Summary

Use this compact format:

```markdown
## Problem Summary

- **Issue:** #<number> - <title>
- **Reproduction status:** <reproduced | not reproduced | evidence-only | blocked>
- **Root cause:** <one paragraph, or "not confirmed">
- **Affected surface:** <files, symbols, routes, tables, functions>
- **Evidence:** <commands, screenshots, logs, code references>
- **Impact:** <users, roles, workflows, severity>
- **Recommended fix direction:** <2-4 sentences, not a full implementation plan>
- **Suggested verification:** <targeted commands or manual checks>
- **Next step:** <implement with `itil-issue-resolver` | ask reporter for detail | close as already fixed>
```

### 5. Handoff

- If the fix is clear and the user authorizes work, use `itil-issue-resolver`.
- If the bug appears already fixed, cite the evidence and ask before closing.
- If the issue needs vendor/API documentation before fixing, call `docs-researcher` for that narrow question.

## Guardrails

- Do not modify product code from this skill.
- Do not require a Change Record unless the user explicitly asks for a formal plan.
- Do not require a perfectly clean local stack for code-only diagnosis, but be honest when runtime verification is blocked.
- Do not estimate engineering hours or promise release timing.
- Never expose secrets, tokens, auth headers, or PII.
