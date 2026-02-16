# EquipQR review-comment resolution playbook

## What "resolved" means

- The code change is implemented and aligns with the relevant `.cursor/rules/*`.
- You've verified locally with the appropriate checks (typecheck/lint/tests as applicable).
- The PR has an updated summary comment explaining what was done.

## Where to look for standards

- `.cursor/rules/coding-standards.mdc`
- `.cursor/rules/design-system.mdc`
- `.cursor/rules/accessibility.mdc`
- `.cursor/rules/performance.mdc`
- `.cursor/rules/supabase-migrations.mdc` (if SQL migrations touched)
- `.cursor/rules/git-powershell.mdc` (for commit syntax)

## Prioritization (suggested)

- **HIGH**: security issues, data correctness, broken UX, type errors
- **MEDIUM**: performance, maintainability, correctness in edge cases
- **LOW**: naming, formatting, minor refactors, documentation

## Handling by comment source

### Human reviewers
- Address all unresolved + current comments
- Engage with the reviewer's intent, not just the literal suggestion
- If you disagree, note it in the PR comment summary with rationale

### Copilot / AI reviewers (`copilot-pull-request-reviewer`)
- Treat as high-quality suggestions -- they often catch real bugs
- `suggestion` blocks can be applied directly if appropriate
- Verify the suggestion doesn't break existing behavior before applying

### Code scanning alerts (`github-advanced-security`)
- These are static analysis findings, not review opinions
- **Outdated + unresolved:** Almost always means the code was already fixed in a later commit. Verify by reading the current file, then note as "verified already addressed" in the PR summary.
- **Current + unresolved:** The code still matches a vulnerable pattern. Fix the code to satisfy the scanner.
- **Do not dismiss manually** -- let the scanner re-run after pushing fixes.
- **Multiple alerts, one root cause:** If several alerts point to the same function (e.g., `sanitizeForMarkdown`), fixing the function resolves all of them. Note this in the summary.

### Third-party bots (`qodo-code-review`, etc.)
- Triage independently -- not all "Action required" badges are actually required
- Agent prompts in `<details>` blocks are remediation suggestions, not mandates
- Evaluate the actual code impact before acting

## Verification checklist

After applying fixes:

1. `npm run type-check` -- must pass with 0 errors
2. `npm run lint` -- must pass with 0 new errors (pre-existing warnings in unrelated files are acceptable)
3. If edge functions were modified: consider testing with a curl command against local Supabase
4. If migrations were modified: verify with `supabase db reset` or `supabase migration list`
