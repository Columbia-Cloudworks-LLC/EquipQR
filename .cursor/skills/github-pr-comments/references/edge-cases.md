# Edge cases to handle

## Missing line numbers

Some threads may have `line: null` (e.g., file-level comments or diffs without stable line mapping). Display file path and link anyway.

## Outdated threads

Threads where `isOutdated === true` may no longer map cleanly to current code. Treat as "verify relevance" rather than "must fix".

## Multiple comments per thread

A thread can contain several comments. For summaries, it's usually best to show the **latest** comment body, but keep the thread metadata (`path`, `line`, `diffHunk`).

## Renames / deleted files

`path` may reference a file that no longer exists on the current branch. The summary should still include the link to the comment thread.

## Suggestions blocks

Comments can contain "suggestion" code blocks. Preserve the body as-is (don't strip markdown).

## Code scanning alerts (`github-advanced-security`)

Code scanning alerts differ from human/Copilot review comments in important ways:

1. **They don't auto-resolve.** Even after the underlying code is fixed, the alert stays "unresolved" on the PR until GitHub's scanner re-evaluates the new commit. Pushing a new commit triggers re-evaluation.

2. **`IsOutdated === true` usually means already fixed.** When the diff that triggered the alert has been modified in a subsequent commit, GitHub marks the thread as outdated. Read the current code to confirm the fix is present.

3. **Multiple alerts for the same pattern.** A single sanitization function may trigger several alerts (e.g., "Incomplete multi-character sanitization" on different call sites). If the function itself is fixed, all related alerts are addressed -- note this in the summary rather than repeating the same fix.

4. **Don't dismiss manually.** Let the scanner re-evaluate after the fix is pushed. Manual dismissal hides findings from future audits.

5. **Scanner-specific patterns.** Static analyzers check for specific code patterns, not logical correctness. A recursive loop that strips HTML tags may be logically correct but still trigger "Incomplete multi-character sanitization" if the scanner doesn't recognize the loop pattern. In these cases, consider refactoring to a pattern the scanner recognizes (e.g., using a well-known sanitization library), or accept the alert with an explanatory comment in the PR.

## Third-party bot reviews (e.g., `qodo-code-review`)

Bot reviews often include:
- Agent prompts in `<details>` blocks -- these are suggestions for remediation, not requirements
- Priority badges (e.g., "Action required") -- treat as suggestions to evaluate, not mandates
- Multiple issues in a single review -- each issue should be triaged independently

## PowerShell environment

This workspace runs on Windows/PowerShell. When the workflow reaches the commit step:
- **Never use heredoc** (`<<'EOF'`) -- it's bash-only syntax
- Use multiple `-m` flags or a temp file approach (see SKILL.md Step 6)
- Do not use `$(...)` bash-style command substitution
