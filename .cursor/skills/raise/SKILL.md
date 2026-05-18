---
name: raise
description: Run pull request pre-flight checks and prepare a release PR from the current branch to main. Use when the user asks to raise a branch, run CI/CD gates, audit release readiness, or generate a PR description and open-PR commands.
---

# Raise to the Sublime Degree

## Cursor workflow commit policy

If a workflow reaches an authorized commit step, include unrelated incremental Cursor workflow updates when they are limited to agent operating guidance or tooling configuration: `AGENTS.md`, `.cursor/skills/`, `.cursor/rules/`, `.cursor/hooks/`, Cursor MCP/template configuration, subagent guidance, or similar workflow files. Do not treat those edits as scope drift just because they were produced irregularly while another task was running. Still inspect the diff for secrets, destructive rewrites, broad unrelated content, or behavior changes outside Cursor workflow. This policy does not allow read-only skills to edit, commit, or push on their own.

## Symbolism

Raise the candidate on the Five Points of Fellowship with the Lion's Paw so the work can stand without "the flesh sloughing from the bone."

## Purpose

Perform a strict pre-flight before creating a pull request from the current branch to `main`.

This skill blocks promotion when CI/CD or release-readiness checks fail, and only proceeds to PR generation when all five audit points pass.
When blocked or ambiguous, the agent must switch to Plan Mode and collaborate on a remediation plan instead of silently halting or guessing.

## Invocation

- `/raise`
- `/raise <optional-base-branch>`
- `/raise --audit-only`

If no base branch is supplied, use `main`.

## Operating Rules

1. Treat CI/CD checks as hard gates. Do not proceed to PR generation on failures.
2. Run checks from repository root with the same package manager/scripts used by the repo.
3. Separate verified evidence from assumptions; include command outcomes.
4. Do not auto-edit release artifacts unless the user asks for fixes.
5. Keep pre-flight scope focused on the branch diff targeting the base branch.
6. If any gate fails or audit is ambiguous, switch to Plan Mode and output a remediation plan.
7. If clarification is needed from the developer, ask explicit questions in chat (use Cursor question flow) before making assumptions.
8. If raise is allowed and invocation is not `--audit-only`, execute push + PR creation without asking for extra confirmation.
9. For any PR targeting `main`, write the change summary as public-facing release copy: name user-visible features and behavior changes specifically, but avoid exposing implementation details, branch mechanics, internal file paths, database objects, vendor tooling, or agent workflow minutiae in the summary. Keep operational details in later checklist sections.
10. During release raise, identify GitHub issues whose requested work is implemented by the branch and tag them `status: implemented` so the maintainer can close them after production promotion. Do not close issues from this skill.

## Workflow

Copy this checklist and track it while running:

```markdown
Raise Progress
- [ ] 1) Confirm branch, base branch, and diff scope
- [ ] 2) The Lion's Paw: run full CI/CD local gates
- [ ] 3) Five Points of Fellowship audit
- [ ] 4) Identify implemented issue closeout candidates
- [ ] 5) Decide raise/no-raise
- [ ] 6) Generate PR title, body, and open-PR commands
```

### 1) Confirm branch, base branch, and diff scope

Capture:

- current branch name
- target base branch (default `main`)
- `git diff <base>...HEAD` scope for docs/version/readme checks

### 2) The Lion's Paw (The Grip): CI/CD hard gate

Run the full local verification sequence used by this repository:

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

If the repository defines an equivalent single pipeline command (for example `npm run ci`), prefer that command plus any missing checks above.

If any command fails:

- mark status as `raise blocked`
- request a switch to Plan Mode
- list failing command(s), first actionable fix hints, and a proposed remediation sequence
- ask focused clarification questions in chat if any remediation decision depends on developer intent

### 3) The Five Points of Fellowship (The Audit)

Audit each point against the branch diff and repository sources of truth.

1. **CHANGELOG point**: confirm `CHANGELOG.md` is updated for the release scope/version.
2. **Version point**: confirm `package.json` and `package-lock.json` version is correct for the release intent.
3. **README point**: confirm `README.md` still matches behavior/setup introduced by this branch.
4. **Rough edges point**: check for unresolved rough edges in PR scope (dead/stale code, TODO/FIXME/HACK markers, naming/control-flow polish opportunities, stale docs). Apply `common-gavel` and the `master-mason` chisel lens as the rubric; do not mutate code unless requested.
5. **Trestle point**: confirm branch changes align with `PROJECT_ROADMAP.md` and active design intent (trestle-board alignment).
6. **Migration-promote point**: run `git diff origin/main...HEAD -- supabase/migrations/`. If any migration files are present in the diff, collect them and mark this point `pass` only when the PR body includes an explicit manual post-promote checklist (Supabase MCP `apply_migration`, production project `ymxkzronkhwxzcdcbnwq`) listing each migration file and a one-line description from the SQL header when available. This point is informational and does not block `/raise`, but the checklist is mandatory whenever migrations are in scope.

Mark each point as:

- `pass`
- `fail`
- `needs-user-decision`

If any point is `fail` or `needs-user-decision`, do not raise.
If any point is `fail` or `needs-user-decision`, request a switch to Plan Mode and present a remediation plan with explicit questions for required decisions.

### 4) Implemented issue closeout candidates

Before the raise decision, scan for open GitHub issues that appear implemented by the branch. This is release housekeeping, not a code gate.

Discovery sources:

- Issue references in `CHANGELOG.md`, `PROJECT_ROADMAP.md`, commit messages, branch name, and prior PR bodies/comments in the branch history.
- Explicit close keywords or references in commits and docs: `Fixes #<n>`, `Closes #<n>`, `Resolves #<n>`, `Relates to #<n>`, `follow-up to #<n>`, `epic #<n>`.
- Open issues whose titles or acceptance criteria match user-visible release notes produced for the PR body.

Use `gh issue view <number> --json number,title,state,labels,url,body,comments` for every candidate. Include only issues that are still open and are not labeled `meta: perpetual`, `status: blocked-customer`, `duplicate`, `invalid`, or `wontfix`.

For each candidate, classify:

- `implemented`: branch evidence satisfies the issue's requested outcome or acceptance criteria.
- `partial`: branch evidence addresses part of the issue but meaningful work remains.
- `not-implemented`: reference is incidental, superseded, or only related context.
- `needs-user-decision`: evidence is ambiguous, acceptance criteria are unclear, or closing the issue would depend on product judgment.

Tagging rules:

1. Use the label `status: implemented`.
2. If the label does not exist, create it once with:
   - name: `status: implemented`
   - color: `0E8A16`
   - description: `Implemented and ready for maintainer closure after release verification.`
3. Apply `status: implemented` only to candidates classified `implemented`.
4. Do not apply the label to `partial`, `not-implemented`, `needs-user-decision`, epic/container issues, or issues already closed.
5. Do not close issues from `/raise`. Tag only; the maintainer closes after confirming production promotion.
6. If GitHub mutation fails, keep the raise decision allowed when all release gates pass, but list the failed label operation in the output and PR internal notes.

When applying the label, also post a short issue comment:

```markdown
Implemented in the release branch prepared by <PR URL or branch name>. Tagged `status: implemented` for maintainer closeout after production promotion.
```

During `--audit-only`, do not mutate GitHub; output the exact label and comment commands that would run. During standard `/raise`, apply labels and comments after `gh pr create` returns a PR URL so the issue comment can link to the release PR. Do not post comments for non-implemented candidates.

Add an `Implemented Issue Closeout` section to the PR body:

```markdown
## Implemented Issue Closeout
- Tagged `status: implemented`: #123, #456
- Not tagged: #789 partial; #790 needs user decision
```

Use `None identified` when no implemented issue candidates are found.

### 5) Decide raise/no-raise

- **Raise allowed**: Lion's Paw passes and all Five Points pass.
- **Raise blocked**: any CI failure, audit failure, or unresolved decision.

### 6) The Raising: PR preparation and execution

When raise is allowed, produce:

1. Proposed PR title.
1. PR body in this format:

```markdown
## Summary
- Public-facing release note about a user-visible feature or improvement.
- Public-facing release note about a changed workflow or customer benefit.
- Public-facing release note about another customer-visible fix, feature, or polish item.

## Internal Release Notes
- Optional: internal-only repo, workflow, agent, or release-process updates that should not appear in the public-facing summary.

## Five Points of Fellowship
- CHANGELOG: pass
- Version: pass
- README: pass
- Rough edges: pass
- Trestle alignment: pass

## Production Migration Promote Checklist
- None (no `supabase/migrations/*` files changed in this branch)
  <!-- OR, when migrations are present:
  - After this PR merges to main, manually apply to production via Supabase MCP `apply_migration` (project `ymxkzronkhwxzcdcbnwq`):
    - `YYYYMMDDHHMMSS_name.sql` — one-line purpose
    - `YYYYMMDDHHMMSS_name.sql` — one-line purpose
  -->

## Implemented Issue Closeout
- None identified
  <!-- OR:
  - Tagged `status: implemented`: #123, #456
  - Not tagged: #789 partial; #790 needs user decision
  -->

## Test Plan
- [x] npm run lint
- [x] npx tsc --noEmit
- [x] npm test
- [x] npm run build
```

1. Commands to publish and open PR to `main`:

```powershell
git push -u origin HEAD
gh pr create --base main --head <current-branch> --title "<pr-title>" --body "<pr-body>"
```

For long PR bodies in PowerShell, prefer writing to a temporary file and pass `--body-file`.

If invocation is not `--audit-only`, execute these commands after a successful raise decision:

- `git push -u origin HEAD`
- `gh pr create --base <base-branch> --head <current-branch> --title "<pr-title>" --body-file "<temp-file>"`
- create `status: implemented` if missing, apply it to implemented issue candidates, and post the closeout comment with the PR URL

Return the PR URL in output.

## Output Contract

1. **Gate Results** (each CI command with pass/fail)
2. **Five Points Audit Table** (point, status, evidence)
3. **Implemented Issue Closeout** (candidate issue, classification, tag/comment action, evidence)
4. **Raise Decision** (`allowed` or `blocked`)
5. **If blocked:** remediation checklist
6. **If allowed + --audit-only:** PR title, PR body draft, push/open commands, and any issue label/comment commands that would be run
7. **If allowed + standard `/raise`:** PR title, PR body, executed push/open commands, issue tag/comment results, and PR URL

## Guardrails

- Do not claim pass/fail without command or diff evidence.
- Do not skip `lint` or TypeScript checks.
- Do not skip Plan Mode when blocked; request it explicitly.
- Do not proceed past ambiguity without asking the developer direct clarification questions in chat.
- Do open the PR automatically for standard `/raise` once all gates pass (unless `--audit-only` was used).
- Do not fabricate changelog/version rationale.
- Do not treat roadmap speculation as trestle alignment evidence.
- Do not omit the production migration promote checklist when `supabase/migrations/*` files are in scope.
- Do not close GitHub issues from this skill; only apply `status: implemented` and comment when the branch evidence clearly satisfies the issue.
- Do not tag perpetual, blocked-customer, duplicate, invalid, wontfix, closed, partial, ambiguous, or epic/container issues as implemented.
