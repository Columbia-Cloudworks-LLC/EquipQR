---
name: common-gavel
description: Audits a codebase for incomplete, abandoned, or superfluous implementation and documentation drift, then runs an intent-confirmation interview and produces a structured cleanup plan with actionable checklist items. Use when the user asks for tech-debt review, architecture/design cleanup, stale docs detection, abandoned code audit, or invokes /common-gavel.
---

# Common Gavel

## Purpose

Run an idempotent, developer-in-the-loop refinement pass on a scoped codebase.

This skill does **not** reduce scope arbitrarily and does **not** make destructive decisions without user confirmation. It identifies likely superfluities (abandoned, incomplete, inconsistent, stale) and turns them into a validated execution plan.

## Invocation

- `/common-gavel`
- `/common-gavel <optional-scope-path>`

If no scope is supplied, use the repository root.

## Operating Rules

1. Always keep the developer in the loop for ambiguous intent.
2. Never delete/refactor code based on guesswork.
3. Always verify documentation freshness on every run.
4. Prefer evidence from references, usage, tests, and current architecture patterns.
5. If no actionable findings exist, explicitly say so.

## Workflow

Copy this checklist and track it while running:

```markdown
Common Gavel Progress
- [ ] 1) Confirm scope and constraints
- [ ] 2) Scan for superfluities and drift
- [ ] 3) Build evidence for each finding
- [ ] 4) Interview user on ambiguous intent
- [ ] 5) Produce structured action blueprint
- [ ] 6) Validate doc coverage and report result
```

### 1) Confirm scope and constraints

Capture:

- target scope path(s)
- no-go areas (generated/vendor/migrations if requested)
- risk tolerance (safe refactor only vs broader cleanup)

### 2) Scan for superfluities and drift

Identify and group findings by type:

- **Abandoned logic**: likely dead code, unreachable branches, orphan modules, placeholder stubs.
- **Incomplete work**: TODO/FIXME/HACK/XXX, temporary guards, unfinished fallbacks.
- **Architectural drift**: local patterns that conflict with established project conventions.
- **Documentation drift**: docs that do not match current behavior, APIs, env vars, scripts, or workflows.
- **Config/dependency drift**: deps, scripts, or examples that appear stale or unused.

### 3) Build evidence for each finding

For each candidate finding, gather:

- file path(s) and symbol(s)
- why it appears problematic
- confidence level: `high`, `medium`, `low`
- what could break if changed
- whether intent is ambiguous

Do not present speculative claims as facts.

### 4) Interview user on ambiguous intent

Before proposing deletion or behavior-changing refactor, ask targeted questions:

- "Is `<module/symbol>` intentionally staged for future use?"
- "Should source of truth be `<doc>` or `<implementation>`?"
- "Is this divergence a temporary exception or debt to remove now?"

If multiple questions exist, batch them with concise multiple-choice options where possible.

### 5) Produce structured action blueprint

After user answers, output a markdown table:

| Target | Issue | Action | Why | Checklist |
|---|---|---|---|---|
| `path/or/symbol` | concise problem statement | Delete / Refactor / Update Doc / Keep | intent + risk rationale | `- [ ] step 1`<br>`- [ ] step 2` |

Then provide:

- `Immediate` (safe, high-confidence changes)
- `Needs Decision` (blocked by policy/product intent)
- `Deferred` (lower-priority debt)

### 6) Validate documentation coverage every run

Always perform a full docs verification pass in the chosen scope:

- markdown docs (`**/*.md`)
- API usage docs and examples
- setup/runbooks and env docs (`.env.example`, config references)
- inline docs/JSDoc for changed or flagged modules

Report one of:

- `Docs verified: no drift found`
- `Docs drift detected` with concrete mismatches and required updates

## Idempotent completion condition

If there are no confirmed actionable recommendations and docs are aligned, output exactly:

`The stone is square. No superfluities detected.`

If recommendations require user intent before action, state that no further safe recommendations can be made until answers are provided.

## Output contract

Use this shape in responses:

1. **Findings** (grouped by type, with confidence)
2. **Questions** (only ambiguous/high-impact items)
3. **Blueprint** (structured table + checklists)
4. **Docs Verification Result** (explicit pass/fail with evidence)
5. **Next Step** (what you need from the user, or execution start)

## Guardrails

- Do not use this skill to perform arbitrary simplification.
- Do not rewrite architecture without explicit approval.
- Do not claim dead code unless evidence supports it.
- Do not skip documentation verification.
- Prefer "no recommendation" over weak recommendation.
