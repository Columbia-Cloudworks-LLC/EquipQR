---
name: common-gavel
description: Use when auditing a repository or scoped directory for dead code, abandoned work, stale TODOs, unused imports, or documentation drift that may require confirmation before cleanup and refinement.
---

# Common Gavel

## Symbolism

The common gavel and chisel strike away superfluities and leave the stone fit for the builder's use.

## Purpose

Run an idempotent tech-debt purge and logic-refinement pass on a scoped codebase.

This skill finds likely superfluities, confirms ambiguous intent with the user, removes only what is justified, updates or prunes stale docs, and then immediately polishes the surviving code in touched files without waiting for a second request.

## Invocation

- `/common-gavel`
- `/common-gavel <optional-scope-path>`

If no scope is supplied, use the repository root.

## Operating Rules

1. Always keep the developer in the loop for ambiguous intent.
2. Never delete or prune code based on guesswork.
3. Always verify markdown documentation freshness on every run.
4. Prefer evidence from references, usage, tests, and current architecture patterns.
5. After confirmed deletions or doc pruning, immediately refactor the touched files for clarity, type safety, and reduced duplication.
6. If no actionable issues are confirmed, output exactly `The stone is square.`

## Workflow

Copy this checklist and track it while running:

```markdown
Common Gavel Progress
- [ ] 1) Confirm scope and constraints
- [ ] 2) Scan for superfluities and drift
- [ ] 3) Build evidence for each finding
- [ ] 4) Interview user on ambiguous intent
- [ ] 5) Strike confirmed dead code and stale docs
- [ ] 6) Chisel touched files automatically
- [ ] 7) Validate references, docs, and diagnostics
```

### 1) Confirm scope and constraints

Capture:

- target scope path(s)
- no-go areas (generated/vendor/migrations if requested)
- risk tolerance (safe refactor only vs broader cleanup)

### 2) Scan for superfluities and drift

Identify and group findings by type:

- **Abandoned logic**: likely dead code, unreachable branches, orphan modules, placeholder stubs.
- **Superfluous implementation**: unused imports, abandoned variables, commented-out code, stale flags.
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

### 5) The Strike

Delete or prune only confirmed dead code, stale docs, and confirmed superfluities. Keep the scope narrow and preserve unrelated behavior.

### 6) The Chisel (Automatic)

Immediately after the strike, refine the remaining code in every touched file:

- tighten types and null handling
- simplify control flow and complex boolean logic
- remove duplication exposed by deletions
- improve naming, extraction, and local structure
- leave the file cleaner than it was found

### 7) Validate references, docs, and diagnostics

After editing, verify that imports, references, and nearby docs still align. Run focused diagnostics or tests when relevant to the touched scope.

## Output Contract

Use this shape in responses:

1. **Findings** (grouped by type, with confidence)
2. **Questions** (only ambiguous or high-impact items)
3. **Strike Plan** or **Execution Summary**
4. **Chisel Summary** (what was refined after cleanup)
5. **Docs Verification Result** (explicit pass/fail with evidence)
6. **Next Step** (what you need from the user, or execution start)

## Blueprint Format

When producing the strike plan before execution, use a markdown table:

| Target | Issue | Action | Why | Checklist |
|---|---|---|---|---|
| `path/or/symbol` | concise problem statement | Delete / Refactor / Update Doc / Keep | intent + risk rationale | `- [ ] step 1`<br>`- [ ] step 2` |

Then provide:

- `Immediate` (safe, high-confidence changes)
- `Needs Decision` (blocked by policy/product intent)
- `Deferred` (lower-priority debt)

## Idempotent completion condition

If there are no confirmed actionable recommendations and docs are aligned, output exactly:

`The stone is square.`

If recommendations require user intent before action, state that no further safe recommendations can be made until answers are provided.

## Guardrails

- Do not use this skill to perform arbitrary simplification.
- Do not rewrite architecture without explicit approval.
- Do not claim dead code unless evidence supports it.
- Do not skip documentation verification.
- Do not skip the automatic chisel pass after confirmed cleanup.
- Prefer "no recommendation" over weak recommendation.
